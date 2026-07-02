'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface HackerChatInputProps {
  disabled?: boolean;
  isSending?: boolean;
  previousMessages?: string[];
  onSend: (message: string) => Promise<void>;
}

export function HackerChatInput({
  disabled = false,
  isSending = false,
  previousMessages = [],
  onSend
}: HackerChatInputProps) {
  const [input, setInput] = useState('');
  const [historyIndex, setHistoryIndex] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset history index when input changes (user typed new content)
  useEffect(() => {
    setHistoryIndex(-1);
  }, [input]);

  const send = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || disabled || isSending) return;

    setInput('');
    setHistoryIndex(-1);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      await onSend(trimmed);
    } catch {
      setInput(trimmed);
    }
  }, [disabled, input, isSending, onSend]);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
  }, [input]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send();
        return;
      }

      if (previousMessages.length === 0) return;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const nextIdx = Math.min(historyIndex + 1, previousMessages.length - 1);
        setHistoryIndex(nextIdx);
        setInput(previousMessages[previousMessages.length - 1 - nextIdx]);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIdx = Math.max(historyIndex - 1, -1);
        setHistoryIndex(nextIdx);
        setInput(nextIdx === -1 ? '' : previousMessages[previousMessages.length - 1 - nextIdx]);
      }
    },
    [historyIndex, previousMessages, send]
  );

  return (
    <div className="hacker-chat-input-bar">
      <textarea
        ref={textareaRef}
        className="hacker-chat-input"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
        placeholder="Transmit message…"
        disabled={disabled || isSending}
      />
      <button
        type="button"
        className="hacker-chat-send-button"
        onClick={send}
        disabled={disabled || isSending || !input.trim()}
      >
        {isSending ? '…' : 'Send'}
      </button>
    </div>
  );
}
