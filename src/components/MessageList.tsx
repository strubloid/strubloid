'use client';

import { useEffect, useRef } from 'react';
import { ThinkingIndicator } from './ThinkingIndicator';

export interface Message {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

interface MessageListProps {
  messages: Message[];
  devMode?: boolean;
  onDelete?: (messageId: string) => void;
  onRefresh?: (messageId: string) => void;
  /** ID of the message currently being streamed (shows thinking indicator). */
  streamingMessageId?: string | null;
  /** Current thinking phase for the streaming message. */
  thinkingPhase?: string | null;
}

export function MessageList({
  messages,
  devMode = false,
  onDelete,
  onRefresh,
  streamingMessageId,
  thinkingPhase,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        {/* Matrix-style empty state */}
        <div className="relative mb-8">
          <div className="flex gap-1 opacity-20">
            {['{', '}', '<', '>', '/', '*', '0', '1'].map((char, i) => (
              <span
                key={i}
                className="glow-pulse font-mono text-2xl text-[--color-accent]"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                {char}
              </span>
            ))}
          </div>
          <div className="glow-text mt-4 text-4xl text-[--color-accent]">Ready to Chat</div>
        </div>

        {devMode && (
          <div className="dev-mode-banner max-w-md rounded-lg px-4 py-2 text-sm">
            <p className="mb-1 font-semibold">DEV MODE ACTIVE</p>
            <p>Configure your Zen AI API key in Settings to enable real AI responses.</p>
          </div>
        )}

        <p className="mt-4 max-w-sm text-sm text-[--color-text-dim]">
          Send a message below to start a conversation. Your chats will be saved automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 overflow-y-auto p-4">
      {messages.map((message) => {
        const isUser = message.role === 'user';
        const isAssistant = message.role === 'assistant';
        const isStreaming = message.id === streamingMessageId;

        return (
          <div key={message.id} className={`group text-config flex justify-start`}>
            <div
              className={`max-w-[80%] rounded-lg p-4 ${
                isUser
                  ? 'message-user'
                  : isAssistant
                    ? 'message-assistant'
                    : 'bg-[--color-bg-tertiary]'
              }`}
            >
              {/* Role indicator */}
              <div className="mb-1 flex items-center gap-2 text-xs text-[--color-text-dim]">
                {isUser && (
                  <>
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                    You
                  </>
                )}
                {isAssistant && (
                  <>
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                    Assistant
                  </>
                )}
                {message.role === 'system' && 'System'}
              </div>

              {/* Message content */}
              <div className="whitespace-pre-wrap break-words">
                {isAssistant && isStreaming && thinkingPhase ? (
                  <ThinkingIndicator phase={thinkingPhase} />
                ) : message.content === '...' && isAssistant ? (
                  <span className="loading-dots">
                    <span />
                    <span />
                    <span />
                  </span>
                ) : (
                  message.content.split('\n').map((line, i, arr) => (
                    <span key={i}>
                      {line}
                      {i < arr.length - 1 && <br />}
                    </span>
                  ))
                )}
              </div>

              {/* Timestamp + Actions */}
              {!isStreaming && (
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-xs text-[--color-text-dim]">
                    {new Date(message.createdAt).toLocaleTimeString()}
                  </span>

                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {isAssistant && onRefresh && (
                      <button
                        onClick={() => onRefresh(message.id)}
                        className="rounded p-1 text-[--color-text-dim] transition-colors hover:bg-[--color-bg-tertiary] hover:text-blue-400"
                        title="Regenerate response"
                        aria-label="Regenerate"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(message.id)}
                        className="rounded p-1 text-[--color-text-dim] transition-colors hover:bg-[--color-bg-tertiary] hover:text-red-400"
                        title="Delete message"
                        aria-label="Delete"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
