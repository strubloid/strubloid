import { AIMessage } from './AIMessage';

// Full response from an AI provider after sendMessage.

export interface AIResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// Result of a memory compaction operation triggered by the AI provider.

export interface MemoryCompactionResult {
  title: string;
  summary: string;
  facts: string;
  preferences: string | null;
  sourceChatIds: string[];
  compactedCount: number;
}

// Input for sending a message to the AI.

export interface SendMessageInput {
  messages: AIMessage[];
  useAiBrain?: boolean;
  brainMemories?: string[];
}