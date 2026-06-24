'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { MessageList, Message } from '@/components/MessageList';
import { ChatComposer } from '@/components/ChatComposer';
import { ErrorBanner } from '@/components/ErrorBanner';
import { ConfirmDialog } from '@/components/ConfirmDialog';

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
          useRandomChats,
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

  async function handleToggleBrain(enabled: boolean) {
    setUseAiBrain(enabled);

    // Persist to chat if we have one
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
      // Navigate away to fresh random chat
      router.push('/chat');
    } catch (err) {
      setError('Failed to delete chat');
      console.error(err);
    } finally {
      setShowDeleteConfirm(false);
    }
  }

  // Extract user messages for keyboard history recall
  const userMessages = chat?.messages
    ?.filter((m) => m.role === 'user')
    .map((m) => m.content) ?? [];

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-[--color-text-dim]">Loading...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar />

      <main className="flex-1 flex flex-col bg-[--color-bg]">
        {/* Header */}
        <header className="border-b border-[--color-border] px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-semibold">
              {chat?.title ?? 'Random Chat'}
            </h1>
            <p className="text-xs text-[--color-text-dim]">
              {chat?.isRandom ? 'Random Chat' : 'Project Chat'}
            </p>
          </div>

          {/* Delete chat button */}
          {chat && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 rounded-lg hover:bg-red-500/10 text-[--color-text-dim] hover:text-red-400 transition-colors"
              title="Delete chat"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </header>

        {/* Messages */}
        <MessageList messages={chat?.messages ?? []} devMode={devMode} />

        {/* Error */}
        <ErrorBanner
          error={error}
          onRetry={() => {
            setError(null);
          }}
        />

        {/* Composer */}
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
      </main>

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
    </div>
  );
}
