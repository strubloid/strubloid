'use client';

import { useState, useRef, useEffect } from 'react';

interface ChatComposerProps {
  onSend: (message: string) => Promise<void>;
  disabled?: boolean;
  useAiBrain: boolean;
  onToggleBrain: (enabled: boolean) => void;
  devMode?: boolean;
}

export function ChatComposer({
  onSend,
  disabled = false,
  useAiBrain,
  onToggleBrain,
  devMode = false,
}: ChatComposerProps) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [message]);

  async function handleSend() {
    if (!message.trim() || isSending || disabled) return;

    const messageToSend = message.trim();
    setMessage('');
    setIsSending(true);

    try {
      await onSend(messageToSend);
    } catch (error) {
      console.error('ChatComposer: Send failed', error);
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const canSend = message.trim().length > 0 && !isSending && !disabled;

  return (
    <div className="border-t border-[--color-border] bg-[--color-bg-secondary] p-4">
      {/* Dev mode warning */}
      {devMode && (
        <div className="dev-mode-banner text-xs px-3 py-2 rounded-t-lg -mt-4 mb-4 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          DEV MODE: AI responses are simulated. Configure BIGPICKLE_API_URL for real responses.
        </div>
      )}

      <div className="flex gap-3">
        {/* AI Brain Toggle */}
        <div className="flex flex-col items-center justify-center">
          <button
            onClick={() => onToggleBrain(!useAiBrain)}
            className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-[--color-bg-tertiary] transition-colors"
            title={useAiBrain ? 'Disable AI Brain' : 'Enable AI Brain'}
            disabled={disabled}
          >
            <svg
              className={`w-5 h-5 ${useAiBrain ? 'text-[--color-accent]' : 'text-[--color-text-dim]'}`}
              fill={useAiBrain ? 'currentColor' : 'none'}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span className="text-[10px] text-[--color-text-dim]">Brain</span>
          </button>
        </div>

        {/* Message input */}
        <div className="flex-1 composer">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
            className="w-full bg-[--color-bg-tertiary] border border-[--color-border] rounded-lg px-4 py-3 text-[--color-text] placeholder-[--color-text-dim] focus:border-[--color-accent] outline-none"
            rows={1}
            disabled={disabled || isSending}
          />
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          className="btn-primary px-4 py-2 rounded-lg flex items-center justify-center self-end"
          aria-label="Send message"
        >
          {isSending ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </div>

      {/* AI Brain status indicator */}
      {useAiBrain && (
        <div className="mt-2 text-xs text-[--color-accent] flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          AI Brain is active — relevant memories will be included
        </div>
      )}
    </div>
  );
}
