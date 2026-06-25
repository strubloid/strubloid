'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MessageList, Message } from '@/components/MessageList';
import { ChatComposer } from '@/components/ChatComposer';
import { ChatHeaderBar } from '@/components/ChatHeaderBar';
import { ErrorBanner } from '@/components/ErrorBanner';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ChatSkeleton } from '@/components/LoadingSkeleton';
import { parseSSEStream } from '@/lib/sse-parser';

interface Chat {
  id: string;
  title: string;
  useAiBrain: boolean;
  useRandomChats: boolean;
  isRandom: boolean;
  selectedModelId: string | null;
  messages: Message[];
}

interface AiStatus {
  isUsingDevMode: boolean;
}

export default function ChatPage() {
  const router = useRouter();
  const [chat, setChat] = useState<Chat | null>(null);
  const [useAiBrain, setUseAiBrain] = useState(false);
  const [useRandomChats, setUseRandomChats] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState('big-pickle');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAiStatus();
    loadOrCreateChat();
  }, []);

  async function checkAiStatus() {
    try {
      const res = await fetch('/api/ai/status');
      const status: AiStatus = await res.json();
      setDevMode(status.isUsingDevMode ?? false);
    } catch {
      // AI status check failed, continue without dev mode indicator
    }
  }

  async function loadOrCreateChat() {
    try {
      // Try to load the most recent random chat
      const res = await fetch('/api/chats?isRandom=true&limit=1');
      const data = await res.json();

      if (data.chats && data.chats.length > 0) {
        // Load the full chat
        const chatRes = await fetch(`/api/chats/${data.chats[0].id}`);
        const chatData = await chatRes.json();
        setChat(chatData);
        setUseAiBrain(chatData.useAiBrain ?? false);
        setUseRandomChats(chatData.useRandomChats ?? false);
        setSelectedModelId(chatData.selectedModelId || 'big-pickle');
      } else {
        // Create a new chat
        const createRes = await fetch('/api/chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'New Chat', isRandom: true }),
        });
        const newChat = await createRes.json();
        setChat(newChat);
      }
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

    const tempUserId = `temp-user-${Date.now()}`;
    const tempLoadingId = `temp-loading-${Date.now()}`;
    const now = new Date().toISOString();

    setChat({
      ...chat,
      messages: [
        ...chat.messages,
        { id: tempUserId, role: 'user', content: message, createdAt: now },
        { id: tempLoadingId, role: 'assistant', content: '...', createdAt: now },
      ],
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
          modelId: modelId || selectedModelId,
        }),
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
                    m.id === tempLoadingId
                      ? { ...m, content: fullContent }
                      : m
                  ),
                }
              : prev
          );
        } else if (event.type === 'done') {
          fullContent = event.full ?? fullContent;
          done = true;
          // Reload full chat from API to get persisted state
          const chatRes = await fetch(`/api/chats/${chat.id}`);
          if (chatRes.ok) {
            const updatedChat = await chatRes.json();
            setChat(updatedChat);
          }
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

  async function handleToggleBrain(enabled: boolean) {
    setUseAiBrain(enabled);

    if (chat) {
      try {
        await fetch(`/api/chats/${chat.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ useAiBrain: enabled }),
        });
      } catch {
        // Non-critical, ignore
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
          body: JSON.stringify({ useRandomChats: enabled }),
        });
      } catch {
        // Non-critical, ignore
      }
    }
  }

  async function handleDeleteChat() {
    if (!chat) return;
    try {
      const res = await fetch(`/api/chats/${chat.id}`, {
        method: 'DELETE',
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

  const userMessages = chat?.messages
    ?.filter((m) => m.role === 'user')
    .map((m) => m.content) ?? [];

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
        body: JSON.stringify({ title: trimmed }),
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

  if (isLoading) {
    return (
      <main className="flex flex-1 bg-[var(--color-bg)]">
        <ChatSkeleton />
      </main>
    );
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col bg-[var(--color-bg)]">
      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <ChatHeaderBar
          title={chat?.title ?? 'Random Chat'}
          isEditing={isEditingTitle}
          editedTitle={editedTitle}
          onEditedTitleChange={setEditedTitle}
          titleError={titleError}
          onStartEdit={startEditingTitle}
          onSave={saveTitle}
          onCancelEdit={cancelEditingTitle}
          onDelete={() => setShowDeleteConfirm(true)}
          isRandom={chat?.isRandom ?? false}
          scrollContainerRef={scrollRef}
        />

        <MessageList messages={chat?.messages ?? []} devMode={devMode} />
      </div>

      <ErrorBanner
        error={error}
        onRetry={() => {
          setError(null);
        }}
      />

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
      />

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Chat"
        message={`Are you sure you want to delete "${chat?.title ?? 'this chat'}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDeleteChat}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </main>
  );
}
