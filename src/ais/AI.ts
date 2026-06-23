import { SendMessageInput, AIResponse, MemoryCompactionResult } from './AIResponse';

// Abstract interface that all AI providers must implement.
// New providers can be added by implementing this interface without touching
// any chat flow or UI code.

export interface AI {
  sendMessage(input: SendMessageInput): Promise<AIResponse>;
  compactMemory(input: CompactMemoryInput): Promise<MemoryCompactionResult>;
  getProviderName(): string;
  getStatus(): AIStatus | Promise<AIStatus>;
}

export interface CompactMemoryInput {
  chatMessages: { id: string; role: string; content: string; createdAt: Date }[];
}

export interface AIStatus {
  providerName: string;
  isConfigured: boolean;
  isUsingDevMode: boolean;
  apiUrl: string | null;
}