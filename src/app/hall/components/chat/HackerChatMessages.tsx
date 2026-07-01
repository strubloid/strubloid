'use client';

import { Message, MessageList } from '@/components/MessageList';

interface HackerChatMessagesProps {
  messages: Message[];
  devMode: boolean;
  streamingMessageId?: string | null;
}

export function HackerChatMessages({ messages, devMode, streamingMessageId }: HackerChatMessagesProps) {
  return (
    <div className="hacker-chat-messages">
      <MessageList messages={messages} devMode={devMode} streamingMessageId={streamingMessageId} />
    </div>
  );
}
