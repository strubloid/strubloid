import { AI, AIStatus, CompactMemoryInput } from '../AI';
import { AIResponse, MemoryCompactionResult, SendMessageInput } from '../AIResponse';
import { AIMessage } from '../AIMessage';
import { BigPickleClient } from './BigPickleClient';

export class BigPickleAI implements AI {
  private readonly client: BigPickleClient;

  constructor() {
    this.client = new BigPickleClient();
  }

  async sendMessage(input: SendMessageInput): Promise<AIResponse> {
    const result = await this.client.sendMessage(input.messages, {
      useAiBrain: input.useAiBrain,
      brainMemories: input.brainMemories,
    });

    return {
      content: result.content,
      model: result.model,
      usage: result.usage,
    };
  }

  async compactMemory(input: CompactMemoryInput): Promise<MemoryCompactionResult> {
    const result = await this.client.compactMemory(input.chatMessages);

    return {
      title: result.title,
      summary: result.summary,
      facts: result.facts,
      preferences: result.preferences,
      sourceChatIds: input.chatMessages.map((m) => m.id),
      compactedCount: input.chatMessages.length,
    };
  }

  getProviderName(): string {
    return 'BigPickle';
  }

  getStatus(): AIStatus {
    return this.client.getStatus();
  }
}

// Singleton instance for the application
let aiInstance: BigPickleAI | null = null;

export function getBigPickleAI(): BigPickleAI {
  if (!aiInstance) {
    aiInstance = new BigPickleAI();
  }
  return aiInstance;
}
