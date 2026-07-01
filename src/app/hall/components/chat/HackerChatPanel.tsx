'use client';

import { CSSProperties, useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useHallChatSession } from '../../hooks/useHallChatSession';
import { HackerChatInput } from './HackerChatInput';
import { HackerChatMessages } from './HackerChatMessages';

type AiModel = {
  modelId: string;
  name: string;
  isFree: boolean;
};

type HackerChatPanelProps = {
  chatId: string;
  title: string;
  accentColor?: string;
  projectName?: string;
  onClose: () => void;
  onChatTitleChange?: (chatId: string, title: string) => void;
};

export function HackerChatPanel({
  chatId,
  title,
  accentColor = '#9ad933',
  projectName,
  onClose,
  onChatTitleChange
}: HackerChatPanelProps) {
  const {
    chat,
    devMode,
    error,
    isLoading,
    isSending,
    selectedModelId,
    sendMessage,
    setSelectedModelId,
    streamingMessageId,
    toggleBrain,
    toggleRandomChats,
    useAiBrain,
    useRandomChats
  } = useHallChatSession({
    chatId,
    onChatUpdated: (updatedChat) => onChatTitleChange?.(updatedChat.id, updatedChat.title)
  });

  const displayTitle = chat?.title || title || 'New Chat';
  const messages = chat?.messages ?? [];
  const contextLabel = projectName ? `project link · ${projectName}` : 'random access memory';

  const [models, setModels] = useState<AiModel[]>([]);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  const loadModels = useCallback(async () => {
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
      } catch {
        // Fall through to live fetch.
      }
    }

    try {
      const res = await fetch('/api/ai/models');
      const data = await res.json();
      if (Array.isArray(data.models)) {
        setModels(data.models);
        setModelsLoaded(true);
        sessionStorage.setItem('strubloid_models', JSON.stringify(data.models));
      }
    } catch {
      // Model selector can stay empty; send still uses the chat/default model.
    }
  }, [modelsLoaded]);

  useEffect(() => {
    void Promise.resolve().then(() => loadModels());
  }, [loadModels]);

  useEffect(() => {
    if (models.length === 0) return;
    if (!selectedModelId || !models.some((model) => model.modelId === selectedModelId)) {
      setSelectedModelId(models[0].modelId);
    }
  }, [models, selectedModelId, setSelectedModelId]);

  const selectedModelLabel = models.find((model) => model.modelId === selectedModelId)?.name ?? 'model route';

  return (
    <motion.section
      className="hacker-chat-panel"
      initial={{ opacity: 0, y: 26, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 18, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 150, damping: 22 }}
      aria-label={`${displayTitle} inline hacker chat`}
      style={{ '--chat-accent': accentColor } as CSSProperties}
    >
      <header className="hacker-chat-header">
        <div className="hacker-chat-title-block">
          <span className="corridor-kicker">live tunnel chat</span>
          <h2>{displayTitle}</h2>
          <span className="hacker-chat-context">{contextLabel}</span>
        </div>
        <button type="button" className="hacker-chat-close" onClick={onClose} aria-label="Close chat panel">
          ×
        </button>
      </header>

      <div className="hacker-chat-toolbar" aria-label="Chat controls">
        <select
          value={selectedModelId || ''}
          onChange={(event) => setSelectedModelId(event.target.value)}
          onFocus={loadModels}
          className="hacker-chat-model-select"
          title="Select AI model"
          disabled={isLoading || isSending}
        >
          {models.length === 0 && <option value="">Loading models...</option>}
          {models.map((model) => (
            <option key={model.modelId} value={model.modelId}>
              {model.name} {model.isFree ? '(Free)' : ''}
            </option>
          ))}
        </select>

        <button
          type="button"
          className={`hacker-chat-toggle ${useAiBrain ? 'hacker-chat-toggle--brain-active' : ''}`}
          onClick={toggleBrain}
          disabled={isLoading || isSending}
          title={useAiBrain ? 'AI Brain is active' : 'Enable AI Brain'}
        >
          🧠 {useAiBrain ? 'Brain ON' : 'Brain'}
        </button>

        <button
          type="button"
          className={`hacker-chat-toggle ${useRandomChats ? 'hacker-chat-toggle--random-active' : ''}`}
          onClick={toggleRandomChats}
          disabled={isLoading || isSending}
          title={useRandomChats ? 'Random Chat summaries active' : 'Include random chat summaries'}
        >
          📋 {useRandomChats ? 'Randoms ON' : 'Randoms'}
        </button>

        <span className="hacker-chat-toolbar-status">{selectedModelLabel}</span>
      </div>

      {isLoading ? (
        <div className="hacker-chat-state">Loading chat stream…</div>
      ) : error ? (
        <div className="hacker-chat-state hacker-chat-state--error">{error}</div>
      ) : (
        <HackerChatMessages messages={messages} devMode={devMode} streamingMessageId={streamingMessageId} />
      )}

      <HackerChatInput
        disabled={isLoading || Boolean(error)}
        isSending={isSending}
        onSend={(message) => sendMessage(message, selectedModelId)}
      />
    </motion.section>
  );
}
