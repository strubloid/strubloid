'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MessageList, Message } from '@/components/MessageList';
import { ChatComposer } from '@/components/ChatComposer';
import { ChatHeaderBar } from '@/components/ChatHeaderBar';
import { ErrorBanner } from '@/components/ErrorBanner';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ChatSkeleton } from '@/components/LoadingSkeleton';
import { BrainPanel } from '@/components/BrainPanel';
import { parseSSEStream } from '@/lib/sse-parser';

interface Chat {
  id: string;
  title: string;
  projectId: string | null;
  useAiBrain: boolean;
  useRandomChats: boolean;
  brainProjectId: string | null;
  isRandom: boolean;
  selectedModelId: string | null;
  messages: Message[];
}

interface AiStatus {
  isUsingDevMode: boolean;
}

export default function ChatByIdPage() {
  const params = useParams();
  const router = useRouter();
  const chatId = params.chatId as string;

  const [chat, setChat] = useState<Chat | null>(null);
  const [useAiBrain, setUseAiBrain] = useState(false);
  const [useRandomChats, setUseRandomChats] = useState(false);
  const [brainProjectId, setBrainProjectId] = useState<string | null>(null);
  const [devMode, setDevMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState('big-pickle');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAiStatus();
    loadChat();
  }, [chatId]);

  async function checkAiStatus() {
    try {
      const res = await fetch('/api/ai/status');
      const status: AiStatus = await res.json();
      setDevMode(status.isUsingDevMode ?? false);
    } catch {
      // Ignore
    }
  }

  async function loadChat() {
    try {
      const res = await fetch(`/api/chats/${chatId}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) throw new Error('Failed to load chat');

      const data = await res.json();
      setChat(data);
      setUseAiBrain(data.useAiBrain ?? false);
      setUseRandomChats(data.useRandomChats ?? false);
      setBrainProjectId(data.brainProjectId ?? null);
      setSelectedModelId(data.selectedModelId || 'big-pickle');
    } catch (err) {
      setError('Failed to load chat');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSend(message: string, modelId?: string) {
    if (!chat) return;
    setError(null);

    // Show the chat in sidebar immediately (the chat already exists in DB)
    window.dispatchEvent(new CustomEvent('sidebar-refresh'));

    const tempUserId = `temp-user-${Date.now()}`;
    const tempLoadingId = `temp-loading-${Date.now()}`;
    const now = new Date().toISOString();

    setChat({
      ...chat,
      messages: [
        ...chat.messages,
        { id: tempUserId, role: 'user', content: message, createdAt: now },
        { id: tempLoadingId, role: 'assistant', content: '...', createdAt: now }
      ]
    });

    try {
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: chat.id,
          message,
          useAiBrain,
          useRandomChats,
          brainProjectId,
          modelId: modelId || selectedModelId
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send message');
      }

      // Parse SSE stream, stream tokens into the UI
      let fullContent = '';
      let done = false;

      for await (const event of parseSSEStream(res.body)) {
        if (event.type === 'delta') {
          fullContent += event.delta ?? '';
          // Update loading placeholder with streaming text in real time
          setChat((prev) =>
            prev
              ? {
                  ...prev,
                  messages: prev.messages.map((m) =>
                    m.id === tempLoadingId ? { ...m, content: fullContent } : m
                  )
                }
              : prev
          );
        } else if (event.type === 'done') {
          fullContent = event.full ?? fullContent;
          done = true;
          // Reload full chat from API to get persisted state (assistantMsg, title, etc.)
          const chatRes = await fetch(`/api/chats/${chat.id}`);
          if (chatRes.ok) {
            const updatedChat = await chatRes.json();
            setChat(updatedChat);
          }
          // Update sidebar now that the chat has an auto-generated title
          window.dispatchEvent(new CustomEvent('sidebar-refresh'));
        } else if (event.type === 'error') {
          throw new Error(event.error || 'Stream error');
        }
      }

      if (!done) {
        throw new Error('Stream ended without completion');
      }
    } catch (err) {
      setChat((prev) =>
        prev ? { ...prev, messages: prev.messages.filter((m) => m.id !== tempLoadingId) } : prev
      );
      const errMsg = err instanceof Error ? err.message : 'Failed to send message';
      setError(errMsg);
      throw err;
    }
  }

  async function handleDeleteMessage(messageId: string) {
    if (!chat) return;
    setError(null);

    if (messageId.startsWith('temp-')) {
      setChat((prev) =>
        prev ? { ...prev, messages: prev.messages.filter((m) => m.id !== messageId) } : prev
      );
      return;
    }

    try {
      const res = await fetch(`/api/messages/${messageId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete message');
      setChat((prev) =>
        prev ? { ...prev, messages: prev.messages.filter((m) => m.id !== messageId) } : prev
      );
    } catch (err) {
      console.error(err);
      setError('Failed to delete message');
    }
  }

  async function handleRefreshMessage(messageId: string) {
    if (!chat) return;
    setError(null);

    const msgIndex = chat.messages.findIndex((m) => m.id === messageId);
    if (msgIndex < 1) return;
    const prevMsg = chat.messages[msgIndex - 1];
    if (prevMsg.role !== 'user') return;

    try {
      await handleSend(prevMsg.content);
    } catch {
      // Error is already set by handleSend via setError
    }
  }

  async function handleToggleBrain(enabled: boolean) {
    setUseAiBrain(enabled);
    if (chat) {
      try {
        await fetch(`/api/chats/${chat.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ useAiBrain: enabled })
        });
      } catch {
        // Non-critical
      }
    }
  }

  async function handleToggleRandomChats(enabled: boolean) {
    setUseRandomChats(enabled);
    if (chat) {
      try {
        await fetch(`/api/chats/${chat.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ useRandomChats: enabled })
        });
      } catch {
        // Non-critical
      }
    }
  }

  async function handleBrainProjectSelect(projectId: string | null) {
    setBrainProjectId(projectId);
    if (chat) {
      try {
        await fetch(`/api/chats/${chat.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ brainProjectId: projectId })
        });
      } catch {
        // Non-critical
      }
    }
  }

  async function handleAssignProject(projectId: string) {
    if (!chat) return;

    const res = await fetch(`/api/chats/${chat.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId })
    });

    if (!res.ok) throw new Error('Failed to add chat to project');

    const updatedChat = await res.json();
    setChat(updatedChat);
    window.dispatchEvent(new CustomEvent('sidebar-refresh'));
  }

  async function handleDeleteChat() {
    if (!chat) return;
    try {
      const res = await fetch(`/api/chats/${chat.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete chat');
      router.push('/chat');
      window.dispatchEvent(new CustomEvent('sidebar-refresh'));
    } catch (err) {
      setError('Failed to delete chat');
      console.error(err);
    } finally {
      setShowDeleteConfirm(false);
    }
  }

  function startEditingTitle() {
    if (!chat) return;
    setEditedTitle(chat.title);
    setTitleError(null);
    setIsEditingTitle(true);
  }

  function cancelEditingTitle() {
    setIsEditingTitle(false);
    setEditedTitle('');
    setTitleError(null);
  }

  async function saveTitle() {
    if (!chat) return;
    const trimmed = editedTitle.trim();
    if (trimmed.length === 0) {
      setTitleError('Title cannot be empty');
      return;
    }
    if (trimmed.length > 200) {
      setTitleError('Title is too long (200 max)');
      return;
    }
    if (trimmed === chat.title) {
      cancelEditingTitle();
      return;
    }

    setTitleError(null);
    try {
      const res = await fetch(`/api/chats/${chat.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update title');
      }
      const data = await res.json();
      setChat(data);
      cancelEditingTitle();
      window.dispatchEvent(new CustomEvent('sidebar-refresh'));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update title';
      setTitleError(message);
    }
  }

  const userMessages = chat?.messages?.filter((m) => m.role === 'user').map((m) => m.content) ?? [];

  if (isLoading) {
    return (
      <main className="flex flex-1 bg-[var(--color-bg)]">
        <ChatSkeleton />
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-[var(--color-bg)]">
        <div className="text-6xl font-bold text-[var(--color-text-dim)]">404</div>
        <div className="text-[var(--color-text-dim)]">Chat not found</div>
        <a href="/chat" className="btn-primary rounded-lg px-4 py-2">
          Go to Random Chat
        </a>
      </main>
    );
  }

  if (!chat) {
    return (
      <main className="flex flex-1 items-center justify-center bg-[var(--color-bg)]">
        <div className="text-[var(--color-text-dim)]">Chat not available</div>
      </main>
    );
  }

  return (
    <div className="rounded-left-side flex min-h-0 flex-1 rounded-tr-[50%] rounded-br-[50%]">
      <main className="flex min-h-0 flex-1 flex-col bg-[var(--color-bg)]">
        <div ref={scrollRef} className="mb-2 flex min-h-0 flex-1 flex-col overflow-y-auto">
          <ChatHeaderBar
            title={chat.title}
            isEditing={isEditingTitle}
            editedTitle={editedTitle}
            onEditedTitleChange={setEditedTitle}
            titleError={titleError}
            onStartEdit={startEditingTitle}
            onSave={saveTitle}
            onCancelEdit={cancelEditingTitle}
            onDelete={() => setShowDeleteConfirm(true)}
            isRandom={chat.isRandom}
            scrollContainerRef={scrollRef}
          />

          <MessageList
            messages={chat.messages}
            devMode={devMode}
            onDelete={handleDeleteMessage}
            onRefresh={handleRefreshMessage}
          />
        </div>

        <ErrorBanner error={error} onRetry={() => setError(null)} />

        <ChatComposer
          onSend={handleSend}
          useAiBrain={useAiBrain}
          onToggleBrain={() => handleToggleBrain(!useAiBrain)}
          useRandomChats={useRandomChats}
          onToggleRandomChats={() => handleToggleRandomChats(!useRandomChats)}
          devMode={devMode}
          selectedModelId={selectedModelId}
          onModelChange={setSelectedModelId}
          previousMessages={userMessages}
          chatId={chat.id}
          isRandomChat={chat.isRandom}
          onAssignProject={handleAssignProject}
        />
      </main>

      {useAiBrain && chat && !chat.projectId && (
        <BrainPanel brainProjectId={brainProjectId} onSelectProject={handleBrainProjectSelect} />
      )}

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Chat"
        message={`Are you sure you want to delete "${chat.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDeleteChat}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
