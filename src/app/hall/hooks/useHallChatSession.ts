'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Message } from '@/components/MessageList';
import { parseSSEStream } from '@/lib/sse-parser';

type Chat = {
  id: string;
  title: string;
  projectId: string | null;
  useAiBrain: boolean;
  useRandomChats: boolean;
  brainProjectId: string | null;
  isRandom: boolean;
  selectedModelId: string | null;
  messages: Message[];
};

type AiStatus = {
  isUsingDevMode: boolean;
};

type UseHallChatSessionOptions = {
  chatId: string;
  onChatUpdated?: (chat: Chat) => void;
};

export function useHallChatSession({ chatId, onChatUpdated }: UseHallChatSessionOptions) {
  const [chat, setChat] = useState<Chat | null>(null);
  const [useAiBrain, setUseAiBrain] = useState(false);
  const [useRandomChats, setUseRandomChats] = useState(false);
  const [brainProjectId, setBrainProjectId] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelIdState] = useState('big-pickle');
  const [devMode, setDevMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const onChatUpdatedRef = useRef(onChatUpdated);

  useEffect(() => {
    onChatUpdatedRef.current = onChatUpdated;
  }, [onChatUpdated]);

  const loadChat = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/chats/${chatId}`);
      if (!res.ok) throw new Error(res.status === 404 ? 'Chat not found' : 'Failed to load chat');

      const data: Chat = await res.json();
      setChat(data);
      setUseAiBrain(data.useAiBrain ?? false);
      setUseRandomChats(data.useRandomChats ?? false);
      setBrainProjectId(data.brainProjectId ?? null);
      setSelectedModelIdState(data.selectedModelId || 'big-pickle');
      onChatUpdatedRef.current?.(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load chat';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [chatId]);

  useEffect(() => {
    let cancelled = false;

    async function checkAiStatus() {
      try {
        const res = await fetch('/api/ai/status');
        const status: AiStatus = await res.json();
        if (!cancelled) setDevMode(status.isUsingDevMode ?? false);
      } catch {
        // Non-blocking: the chat still works without the dev-mode banner.
      }
    }

    checkAiStatus();
    void Promise.resolve().then(() => loadChat());

    return () => {
      cancelled = true;
    };
  }, [loadChat]);

  const userMessages = useMemo(
    () => chat?.messages?.filter((message) => message.role === 'user').map((message) => message.content) ?? [],
    [chat?.messages]
  );

  const patchChat = useCallback(
    async (body: Record<string, unknown>) => {
      if (!chat) return;

      const res = await fetch(`/api/chats/${chat.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) throw new Error('Failed to update chat');
      const updatedChat: Chat = await res.json();
      setChat(updatedChat);
      onChatUpdatedRef.current?.(updatedChat);
      window.dispatchEvent(new CustomEvent('sidebar-refresh'));
      window.dispatchEvent(new CustomEvent('hallway-refresh'));
    },
    [chat]
  );

  const setSelectedModelId = useCallback(
    async (modelId: string) => {
      console.log('[DEBUG setSelectedModelId] called with:', modelId, 'current chat?.id:', chat?.id);
      setSelectedModelIdState(modelId);
      if (!chat) {
        console.log('[DEBUG setSelectedModelId] NO chat, skipping patchChat');
        return;
      }
      try {
        await patchChat({ selectedModelId: modelId });
        console.log('[DEBUG setSelectedModelId] patchChat succeeded');
      } catch (e) {
        console.error('[DEBUG setSelectedModelId] patchChat failed:', e);
      }
    },
    [patchChat, chat]
  );

  const toggleBrain = useCallback(async () => {
    const next = !useAiBrain;
    setUseAiBrain(next);
    try {
      await patchChat({ useAiBrain: next });
    } catch {
      // Keep this non-fatal, matching the normal chat page behavior.
    }
  }, [patchChat, useAiBrain]);

  const toggleRandomChats = useCallback(async () => {
    const next = !useRandomChats;
    setUseRandomChats(next);
    try {
      await patchChat({ useRandomChats: next });
    } catch {
      // Keep this non-fatal, matching the normal chat page behavior.
    }
  }, [patchChat, useRandomChats]);

  const assignProject = useCallback(
    async (projectId: string) => {
      await patchChat({ projectId });
    },
    [patchChat]
  );

  const renameChat = useCallback(
    async (title: string) => {
      const trimmed = title.trim();
      if (!trimmed) return;
      await patchChat({ title: trimmed });
    },
    [patchChat]
  );

  const deleteChat = useCallback(async () => {
    if (!chat) return;

    const res = await fetch(`/api/chats/${chat.id}`, {
      method: 'DELETE'
    });

    if (!res.ok) throw new Error('Failed to delete chat');
    window.dispatchEvent(new CustomEvent('hallway-refresh'));
    window.dispatchEvent(new CustomEvent('sidebar-refresh'));
  }, [chat]);

  const sendMessage = useCallback(
    async (message: string, modelId?: string) => {
      if (!chat || isSending) return;

      setError(null);
      setIsSending(true);
      window.dispatchEvent(new CustomEvent('sidebar-refresh'));

      const tempUserId = `temp-user-${Date.now()}`;
      const tempLoadingId = `temp-loading-${Date.now()}`;
      const now = new Date().toISOString();

      setStreamingMessageId(tempLoadingId);
      setChat((prev) =>
        prev
          ? {
              ...prev,
              messages: [
                ...prev.messages,
                { id: tempUserId, role: 'user', content: message, createdAt: now },
                { id: tempLoadingId, role: 'assistant', content: '...', createdAt: now }
              ]
            }
          : prev
      );

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
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to send message');
        }

        let fullContent = '';
        let done = false;

        for await (const event of parseSSEStream(res.body)) {
          if (event.type === 'delta') {
            fullContent += event.delta ?? '';
            setChat((prev) =>
              prev
                ? {
                    ...prev,
                    messages: prev.messages.map((item) =>
                      item.id === tempLoadingId ? { ...item, content: fullContent } : item
                    )
                  }
                : prev
            );
          } else if (event.type === 'done') {
            fullContent = event.full ?? fullContent;
            done = true;

            const chatRes = await fetch(`/api/chats/${chat.id}`);
            if (chatRes.ok) {
              const updatedChat: Chat = await chatRes.json();
              setChat(updatedChat);
              onChatUpdatedRef.current?.(updatedChat);
            }

            window.dispatchEvent(new CustomEvent('sidebar-refresh'));
            window.dispatchEvent(new CustomEvent('hallway-refresh'));
          } else if (event.type === 'error') {
            throw new Error(event.error || 'Stream error');
          }
        }

        if (!done) throw new Error('Stream ended without completion');
      } catch (err) {
        setChat((prev) =>
          prev ? { ...prev, messages: prev.messages.filter((item) => item.id !== tempLoadingId) } : prev
        );
        const messageText = err instanceof Error ? err.message : 'Failed to send message';
        setError(messageText);
        throw err;
      } finally {
        setIsSending(false);
        setStreamingMessageId(null);
      }
    },
    [brainProjectId, chat, isSending, selectedModelId, useAiBrain, useRandomChats]
  );

  return {
    chat,
    devMode,
    error,
    isLoading,
    isSending,
    selectedModelId,
    setSelectedModelId,
    streamingMessageId,
    useAiBrain,
    useRandomChats,
    userMessages,
    assignProject,
    reload: loadChat,
    renameChat,
    deleteChat,
    sendMessage,
    setError,
    toggleBrain,
    toggleRandomChats
  };
}
