'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './ChatComposer.module.scss';

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
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function loadModels() {
    if (modelsLoaded) return;
    const cached = sessionStorage.getItem('strubloid_models');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setModels(parsed);
          setModelsLoaded(true);
          return;
        }
      } catch { /* fall through */ }
    }
    fetch('/api/ai/models')
      .then((r) => r.json())
      .then((data) => {
        if (data.models) {
          setModels(data.models);
          setModelsLoaded(true);
          sessionStorage.setItem('strubloid_models', JSON.stringify(data.models));
        }
      })
      .catch(() => {});
  }

  // Eagerly load models on mount — don't wait for user to focus the select
  useEffect(() => {
    loadModels();
  }, []);

  // Auto-select first model when loaded and current selection doesn't match
  useEffect(() => {
    if (models.length === 0) return;
    if (!selectedModelId || !models.some((m) => m.modelId === selectedModelId)) {
      onModelChange?.(models[0].modelId);
    }
  }, [models, selectedModelId]);

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

      // ArrowUp: recall previous messages
      if (e.key === 'ArrowUp' && previousMessages.length > 0) {
        if (input === '' && historyIndex === -1) {
          e.preventDefault();
          const lastIdx = previousMessages.length - 1;
          setInput(previousMessages[lastIdx]);
          setHistoryIndex(lastIdx);
          return;
        }
        if (historyIndex > 0) {
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
    <div className={styles.wrapper}>
      <div className={styles.inner}>
        {/* Toolbar row */}
        <div className={styles.toolbar}>
          {/* Model selector */}
          <select
            value={selectedModelId || ''}
            onChange={(e) => onModelChange?.(e.target.value)}
            onFocus={loadModels}
            className={styles.modelSelect}
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
            onClick={onToggleBrain}
            title={useAiBrain ? 'AI Brain is active' : 'Enable AI Brain'}
            className={`${styles.toggleBtn} ${useAiBrain ? styles.brainActive : ''}`}
          >
            🧠 {useAiBrain ? 'Brain ON' : 'Brain'}
          </button>

          {useAiBrain && !useRandomChats && (
            <span className={styles.toggleHint}>remembers project chat history</span>
          )}

          {/* Random Chats toggle */}
          <button
            onClick={onToggleRandomChats}
            title={useRandomChats ? 'Random Chat summaries active' : 'Include random chat summaries'}
            className={`${styles.toggleBtn} ${useRandomChats ? styles.randomActive : ''}`}
          >
            📋 {useRandomChats ? 'Randoms ON' : 'Randoms'}
          </button>

          {useRandomChats && !useAiBrain && (
            <span className={styles.toggleHint}>includes compressed random chat knowledge</span>
          )}
          {useAiBrain && useRandomChats && (
            <span className={styles.toggleHint}>brain + random chat summaries active</span>
          )}

          <span className={styles.requestCount}>Sent: {requestCount}</span>
        </div>

        {/* Dev mode banner */}
        {devMode && (
          <div className={styles.devBanner}>
            DEV MODE: AI responses are simulated. Go to Settings to configure your AI API key.
          </div>
        )}

        {/* Input row */}
        <div className={styles.inputRow}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
            rows={1}
            disabled={disabled || isSending}
            className={styles.textarea}
          />

          <button
            onClick={handleSend}
            disabled={disabled || isSending || !input.trim()}
            className={styles.sendBtn}
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
