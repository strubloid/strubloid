'use client';

import { useEffect, useRef } from 'react';
import { ThinkingIndicator } from './ThinkingIndicator';
import styles from './MessageList.module.scss';

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
  streamingMessageId?: string | null;
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
      <div className={styles.empty}>
        <div className={styles.emptyGlow}>
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
          <div className={styles.emptyTitle}>Ready to Chat</div>
        </div>

        {devMode && (
          <div className={styles.devBanner}>
            <strong>DEV MODE ACTIVE</strong>
            <p>Configure your AI API key in Settings to enable real AI responses.</p>
          </div>
        )}

        <p className={styles.emptySubtitle}>
          Send a message below to start a conversation. Your chats will be saved automatically.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {messages.map((message) => {
        const isUser = message.role === 'user';
        const isAssistant = message.role === 'assistant';
        const isStreaming = message.id === streamingMessageId;

        return (
          <div
            key={message.id}
            className={`${styles.row} ${isUser ? styles.user : styles.assistant}`}
          >
            <div
              className={`${styles.bubble} ${isUser ? styles.user : isAssistant ? styles.assistant : ''}`}
            >
              {/* Role indicator */}
              <div className={styles.roleBadge}>
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
              <div className={styles.content}>
                {isAssistant && isStreaming && thinkingPhase ? (
                  <ThinkingIndicator phase={thinkingPhase} />
                ) : message.content === '...' && isAssistant ? (
                  <span className={styles.loadingDots}>
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
                <div className={styles.meta}>
                  <span className={styles.time}>
                    {new Date(message.createdAt).toLocaleTimeString()}
                  </span>

                  <div className={styles.actions}>
                    {isAssistant && onRefresh && (
                      <button
                        onClick={() => onRefresh(message.id)}
                        className={`${styles.actionBtn} ${styles.refresh}`}
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
                        className={`${styles.actionBtn} ${styles.delete}`}
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
