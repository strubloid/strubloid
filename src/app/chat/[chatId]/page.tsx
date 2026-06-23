'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { MessageList, Message } from '@/components/MessageList';
import { ChatComposer } from '@/components/ChatComposer';
import { ErrorBanner } from '@/components/ErrorBanner';
import { ConfirmDialog } from '@/components/ConfirmDialog';

interface Chat {
  id: string;
  title: string;
  useAiBrain: boolean;
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
  const [devMode, setDevMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState('big-pickle');

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

    // Optimistic UI: show user message + loading dots immediately
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
          modelId: modelId || selectedModelId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send message');
      }

      const data = await res.json();
      setChat(data);
    } catch (err) {
      // Remove loading dots, keep user message so it doesn't flicker
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

    // Temp IDs are client-generated optimistically — no API call needed
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
        prev
          ? { ...prev, messages: prev.messages.filter((m) => m.id !== messageId) }
          : prev
      );
    } catch (err) {
      console.error(err);
      setError('Failed to delete message');
    }
  }

  async function handleRefreshMessage(messageId: string) {
    if (!chat) return;
    setError(null);

    // Find the user message that preceded this assistant message
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

  async function handleDeleteChat() {
    if (!chat) return;
    try {
      const res = await fetch(`/api/chats/${chat.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete chat');
      router.push('/chat');
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
        body: JSON.stringify({ title: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update title');
      }
      const data = await res.json();
      setChat(data);
      cancelEditingTitle();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update title';
      setTitleError(message);
    }
  }

  // Extract user messages for keyboard history recall
  const userMessages = chat?.messages?.filter((m) => m.role === 'user').map((m) => m.content) ?? [];

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex flex-1 items-center justify-center">
          <div className="text-[--color-text-dim]">Loading...</div>
        </main>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex flex-1 flex-col items-center justify-center gap-4">
          <div className="text-6xl font-bold text-[--color-text-dim]">404</div>
          <div className="text-[--color-text-dim]">Chat not found</div>
          <a href="/chat" className="btn-primary rounded-lg px-4 py-2">
            Go to Random Chat
          </a>
        </main>
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex flex-1 items-center justify-center">
          <div className="text-[--color-text-dim]">Chat not available</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar />

      <main className="flex flex-1 flex-col bg-[--color-bg]">
        <header className="flex items-center justify-between border-b border-[--color-border] px-4 py-3">
          <div className="min-w-0 flex-1 pr-4">
            {isEditingTitle ? (
              <div className="flex flex-col gap-1">
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => {
                    setEditedTitle(e.target.value);
                    if (titleError) setTitleError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      saveTitle();
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      cancelEditingTitle();
                    }
                  }}
                  onBlur={() => {
                    if (editedTitle.trim() && editedTitle.trim() !== chat.title) {
                      saveTitle();
                    } else {
                      cancelEditingTitle();
                    }
                  }}
                  autoFocus
                  maxLength={200}
                  className="w-full rounded border border-blue-500 bg-[--color-bg] px-2 py-1 font-semibold outline-none"
                  aria-label="Edit chat title"
                />
                {titleError && (
                  <p className="text-xs text-red-400" role="alert">
                    {titleError}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1
                  className="cursor-text truncate rounded px-1 font-semibold transition-colors hover:bg-[--color-bg-tertiary]"
                  title={chat.title}
                  onDoubleClick={startEditingTitle}
                >
                  {chat.title}
                </h1>
                <button
                  onClick={startEditingTitle}
                  className="rounded p-1 text-[--color-text-dim] transition-colors hover:bg-[--color-bg-tertiary] hover:text-[--color-text]"
                  title="Rename chat"
                  aria-label="Rename chat"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.232 5.232l3.536 3.536M9 13l6-6 3 3-6 6H9v-3zM4 20h4l10-10-4-4L4 16v4z"
                    />
                  </svg>
                </button>
              </div>
            )}
            <p className="text-xs text-[--color-text-dim]">
              {chat.isRandom ? 'Random Chat' : 'Project Chat'}
            </p>
          </div>

          {/* Delete chat button */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="rounded-lg p-2 text-[--color-text-dim] transition-colors hover:bg-red-500/10 hover:text-red-400"
            title="Delete chat"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </header>

        <MessageList
          messages={chat.messages}
          devMode={devMode}
          onDelete={handleDeleteMessage}
          onRefresh={handleRefreshMessage}
        />

        <ErrorBanner error={error} onRetry={() => setError(null)} />

        <ChatComposer
          onSend={handleSend}
          useAiBrain={useAiBrain}
          onToggleBrain={() => handleToggleBrain(!useAiBrain)}
          devMode={devMode}
          selectedModelId={selectedModelId}
          onModelChange={setSelectedModelId}
          previousMessages={userMessages}
        />
      </main>

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
