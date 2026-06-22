'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
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

export default function ChatByIdPage() {
  const params = useParams();
  const chatId = params.chatId as string;

  const [chat, setChat] = useState<Chat | null>(null);
  const [useAiBrain, setUseAiBrain] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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
    if (chat) {
      try {
        await fetch(`/api/chats/${chat.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ useAiBrain: enabled }),
        });
      } catch {
        // Non-critical
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

  if (notFound) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center flex-col gap-4">
          <div className="text-6xl font-bold text-[--color-text-dim]">404</div>
          <div className="text-[--color-text-dim]">Chat not found</div>
          <a href="/chat" className="btn-primary px-4 py-2 rounded-lg">
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
        <main className="flex-1 flex items-center justify-center">
          <div className="text-[--color-text-dim]">Chat not available</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar />

      <main className="flex-1 flex flex-col bg-[--color-bg]">
        <header className="border-b border-[--color-border] px-4 py-3">
          <div>
            <h1 className="font-semibold">{chat.title}</h1>
            <p className="text-xs text-[--color-text-dim]">
              {chat.isRandom ? 'Random Chat' : 'Project Chat'}
            </p>
          </div>
        </header>

        <MessageList messages={chat.messages} devMode={devMode} />

        <ErrorBanner
          error={error}
          onRetry={() => setError(null)}
        />

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
