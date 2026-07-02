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
  onDelete?: (chatId: string) => void;
  onChatTitleChange?: (chatId: string, title: string) => void;
};

export function HackerChatPanel({
  chatId,
  title,
  accentColor = '#9ad933',
  projectName,
  onClose,
  onDelete,
  onChatTitleChange
}: HackerChatPanelProps) {
  const {
    chat,
    devMode,
    error,
    isLoading,
    isSending,
    renameChat,
    deleteChat,
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
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState(displayTitle);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Reload models when a provider refresh completes in Settings
  // (same cache-invalidation pattern as ChatComposer).
  useEffect(() => {
    function onModelsRefreshed() {
      try { sessionStorage.removeItem('strubloid_models'); } catch { /* ignore */ }
      setModelsLoaded(false);
      setModels([]);
      void loadModels();
    }
    window.addEventListener('models-refreshed', onModelsRefreshed);
    return () => window.removeEventListener('models-refreshed', onModelsRefreshed);
  }, [loadModels]);

  useEffect(() => {
    if (models.length === 0) return;
    if (!selectedModelId || !models.some((model) => model.modelId === selectedModelId)) {
      setSelectedModelId(models[0].modelId);
    }
  }, [models, selectedModelId, setSelectedModelId]);

  useEffect(() => {
    if (!isRenaming) void Promise.resolve().then(() => setDraftTitle(displayTitle));
  }, [displayTitle, isRenaming]);

  const submitRename = useCallback(async () => {
    const trimmed = draftTitle.trim();
    if (!trimmed || trimmed === displayTitle) {
      setDraftTitle(displayTitle);
      setIsRenaming(false);
      return;
    }

    await renameChat(trimmed);
    onChatTitleChange?.(chatId, trimmed);
    setIsRenaming(false);
  }, [chatId, displayTitle, draftTitle, onChatTitleChange, renameChat]);

  const handleDeleteClick = useCallback(() => {
    setIsRenaming(false);
    setShowDeleteConfirm(true);
  }, []);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    setIsDeleting(true);
    void Promise.resolve()
      .then(async () => {
        await deleteChat();
        onDelete?.(chatId);
        onClose();
      })
      .catch(() => {
        setIsDeleting(false);
        setShowDeleteConfirm(false);
      });
  }, [chatId, deleteChat, onClose, onDelete]);

  const selectedModelLabel =
    models.find((model) => model.modelId === selectedModelId)?.name ?? 'model route';

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
          {isRenaming ? (
            <input
              className="hacker-chat-title-input"
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              onBlur={() => void submitRename()}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void submitRename();
                if (event.key === 'Escape') {
                  setDraftTitle(displayTitle);
                  setIsRenaming(false);
                }
              }}
              autoFocus
              aria-label="Rename chat"
            />
          ) : (
            <h2 onDoubleClick={() => setIsRenaming(true)} title="Double-click to rename chat">
              {displayTitle}
            </h2>
          )}
          <span className="hacker-chat-context">{contextLabel}</span>
        </div>
        <div className="hacker-chat-header-actions">
          <button
            type="button"
            className="hacker-chat-delete"
            onClick={handleDeleteClick}
            disabled={isDeleting}
            title="Delete chat"
            aria-label="Delete chat"
          >
            {isDeleting ? '…' : '🗑'}
          </button>
          <button
            type="button"
            className="hacker-chat-close"
            onClick={onClose}
            aria-label="Close chat panel"
          >
            ×
          </button>
        </div>
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
        <span className="hacker-chat-toolbar-status">{selectedModelLabel}</span>

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
      </div>

      {isLoading ? (
        <div className="hacker-chat-state">Loading chat stream…</div>
      ) : error ? (
        <div className="hacker-chat-state hacker-chat-state--error">{error}</div>
      ) : (
        <HackerChatMessages
          messages={messages}
          devMode={devMode}
          streamingMessageId={streamingMessageId}
        />
      )}

      <HackerChatInput
        disabled={isLoading || Boolean(error)}
        isSending={isSending}
        onSend={(message) => sendMessage(message, selectedModelId)}
      />

      {showDeleteConfirm && (
        <motion.div
          className="hacker-chat-confirm-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.div
            className="hacker-chat-confirm-dialog"
            style={{ '--chat-accent': accentColor } as CSSProperties}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 220, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            <p>Delete this chat? This cannot be undone.</p>
            <div className="hacker-chat-confirm-dialog__actions">
              <button type="button" onClick={handleCancelDelete} disabled={isDeleting}>
                Cancel
              </button>
              <button
                type="button"
                className="hacker-chat-confirm-dialog__delete"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.section>
  );
}
