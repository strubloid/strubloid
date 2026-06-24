'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface AiModel {
  modelId: string;
  name: string;
  isFree: boolean;
}

interface ChatComposerProps {
  onSend: (message: string, modelId?: string) => Promise<void>;
  disabled?: boolean;
  useAiBrain: boolean;
  onToggleBrain: () => void;
  useRandomChats: boolean;
  onToggleRandomChats: () => void;
  devMode: boolean;
  selectedModelId?: string;
  onModelChange?: (modelId: string) => void;
  previousMessages?: string[];
}

export function ChatComposer({
  onSend,
  disabled = false,
  useAiBrain,
  onToggleBrain,
  useRandomChats,
  onToggleRandomChats,
  devMode,
  selectedModelId,
  onModelChange,
  previousMessages = []
}: ChatComposerProps) {
  const [input, setInput] = useState('');
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [requestCount, setRequestCount] = useState(0);
  const [models, setModels] = useState<AiModel[]>([]);
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load available models
  useEffect(() => {
    fetch('/api/ai/models')
      .then((r) => r.json())
      .then((data) => {
        if (data.models) setModels(data.models);
      })
      .catch(() => {});
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || disabled || isSending) return;

    setInput('');
    setHistoryIndex(-1);
    setRequestCount((c) => c + 1);
    setIsSending(true);

    try {
      await onSend(trimmed, selectedModelId);
    } catch {
      // Error handled by parent
    } finally {
      setIsSending(false);
    }

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [input, disabled, isSending, onSend, selectedModelId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
        return;
      }

      // ArrowUp: recall previous messages (works when input empty or already in history)
      if (e.key === 'ArrowUp' && previousMessages.length > 0) {
        if (input === '' && historyIndex === -1) {
          // First press: recall the last message
          e.preventDefault();
          const lastIdx = previousMessages.length - 1;
          setInput(previousMessages[lastIdx]);
          setHistoryIndex(lastIdx);
          return;
        }
        if (historyIndex > 0) {
          // Already in history: go to previous (older) message
          e.preventDefault();
          const prevIdx = historyIndex - 1;
          setInput(previousMessages[prevIdx]);
          setHistoryIndex(prevIdx);
          return;
        }
        return;
      }

      // ArrowDown: go forward in history
      if (e.key === 'ArrowDown' && historyIndex >= 0) {
        e.preventDefault();
        if (historyIndex < previousMessages.length - 1) {
          const nextIdx = historyIndex + 1;
          setInput(previousMessages[nextIdx]);
          setHistoryIndex(nextIdx);
        } else {
          setInput('');
          setHistoryIndex(-1);
        }
        return;
      }
    },
    [handleSend, input, previousMessages, historyIndex]
  );

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  return (
    <div className="border-t border-[--color-border] bg-[--color-bg-secondary] p-4">
      <div className="mx-auto flex flex-col gap-2">
        {/* Model selector + brain toggle row */}
        <div className="flex items-center gap-2">
          {/* Model selector */}
          <select
            value={selectedModelId || ''}
            onChange={(e) => onModelChange?.(e.target.value)}
            className="rounded border border-[--color-border] bg-[--color-bg] px-2 py-1 text-xs outline-none"
            title="Select AI model"
          >
            {models.length === 0 && <option value="">Loading models...</option>}
            {models.map((model) => (
              <option key={model.modelId} value={model.modelId}>
                {model.name} {model.isFree ? '(Free)' : ''}
              </option>
            ))}
          </select>

          {/* Brain toggle */}
          <button
            onClick={() => onToggleBrain()}
            title={useAiBrain ? 'AI Brain is active' : 'Enable AI Brain'}
            className={`rounded border px-2 py-1 text-xs transition-colors ${
              useAiBrain
                ? 'border-purple-600/50 bg-purple-900/30 text-purple-300'
                : 'border-[--color-border] text-[--color-text-dim] hover:text-white'
            }`}
          >
            🧠 {useAiBrain ? 'Brain ON' : 'Brain'}
          </button>

          {useAiBrain && !useRandomChats && (
            <span className="text-xs text-purple-400">remembers project chat history</span>
          )}

          {/* Random Chats toggle */}
          <button
            onClick={() => onToggleRandomChats()}
            title={useRandomChats ? 'Random Chat summaries active' : 'Include random chat summaries'}
            className={`rounded border px-2 py-1 text-xs transition-colors ${
              useRandomChats
                ? 'border-orange-600/50 bg-orange-900/30 text-orange-300'
                : 'border-[--color-border] text-[--color-text-dim] hover:text-white'
            }`}
          >
            📋 {useRandomChats ? 'Randoms ON' : 'Randoms'}
          </button>

          {useRandomChats && !useAiBrain && (
            <span className="text-xs text-orange-400">includes compressed random chat knowledge</span>
          )}
          {useAiBrain && useRandomChats && (
            <span className="text-xs text-purple-400">brain + random chat summaries active</span>
          )}

          <span className="ml-auto text-xs text-[--color-text-dim]">Sent: {requestCount}</span>
        </div>

        {/* Dev mode banner */}
        {devMode && (
          <div className="rounded border border-yellow-700/50 bg-yellow-900/20 px-3 py-1.5 text-xs text-yellow-200">
            DEV MODE: AI responses are simulated.
            <br />
            Go to Settings to configure your Zen AI API key.
          </div>
        )}

        {/* Input area */}
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
            rows={1}
            disabled={disabled || isSending}
            className="max-h-32 min-h-[2.5rem] flex-1 resize-none rounded-lg border border-[--color-border] bg-[--color-bg] px-3 py-2 text-sm outline-none transition-colors focus:border-blue-500 disabled:opacity-50"
          />

          <button
            onClick={handleSend}
            disabled={disabled || isSending || !input.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
            title="Send message (Enter)"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-5 w-5"
            >
              <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
