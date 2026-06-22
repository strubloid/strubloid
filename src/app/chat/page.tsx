'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { MessageList, Message } from '@/components/MessageList';
import { ChatComposer } from '@/components/ChatComposer';
import { ErrorBanner } from '@/components/ErrorBanner';

interface Chat {
  id: string;
  title: string;
  useAiBrain: boolean;
  isRandom: boolean;
  messages: Message[];
}

interface AiStatus {
  isUsingDevMode: boolean;
}

export default function ChatPage() {
  const [chat, setChat] = useState<Chat | null>(null);
  const [useAiBrain, setUseAiBrain] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  async function handleSend(message: string) {
    if (!chat) return;

    setError(null);

    try {
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: chat.id,
          message,
          useAiBrain,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send message');
      }

      const data = await res.json();
      setChat(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send message';
      setError(message);
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
          onToggleBrain={handleToggleBrain}
          devMode={devMode}
        />
      </main>
    </div>
  );
}
