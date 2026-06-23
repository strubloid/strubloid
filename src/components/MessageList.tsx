'use client';

import { useEffect, useRef } from 'react';

export interface Message {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

interface MessageListProps {
  messages: Message[];
  devMode?: boolean;
}

export function MessageList({ messages, devMode = false }: MessageListProps) {
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

        return (
          <div key={message.id} className={`text-config flex justify-start`}>
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
                {message.content === '...' && isAssistant ? (
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

              {/* Timestamp */}
              <div className="mt-2 text-xs text-[--color-text-dim]">
                {new Date(message.createdAt).toLocaleTimeString()}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
