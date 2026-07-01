'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface HackerChatInputProps {
  disabled?: boolean;
  isSending?: boolean;
  onSend: (message: string) => Promise<void>;
}

export function HackerChatInput({ disabled = false, isSending = false, onSend }: HackerChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const send = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || disabled || isSending) return;

    setInput('');
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

  return (
    <div className="hacker-chat-input-bar">
      <textarea
        ref={textareaRef}
        className="hacker-chat-input"
        value={input}
        onChange={(event) => setInput(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            send();
          }
        }}
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
