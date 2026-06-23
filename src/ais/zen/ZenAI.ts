import { AI, AIStatus, CompactMemoryInput } from '@/ais/AI';
import { AIResponse, SendMessageInput, MemoryCompactionResult } from '@/ais/AIResponse';
import { ZenAIClient } from './ZenAIClient';
import { loadZenConfig } from './ZenConfig';

export class ZenAI implements AI {
  private client: ZenAIClient;

  constructor(client?: ZenAIClient) {
    this.client = client ?? new ZenAIClient(null);
  }

  getName(): string {
    return 'Zen AI';
  }

  async refresh(): Promise<void> {
    const config = await loadZenConfig();
    this.client = new ZenAIClient(config);
  }

  async sendMessage(input: SendMessageInput): Promise<AIResponse> {
    await this.refresh();
    return this.client.sendMessage(input);
  }

  async compactMemory(input: CompactMemoryInput): Promise<MemoryCompactionResult> {
    await this.refresh();
    const messages = input.chatMessages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));

    const response = await this.client.sendMessage({
      messages: [
        {
          role: 'system',
          content: `You are a memory compaction AI. Given a chat transcript, produce a compact JSON summary with these fields:
- title: short title for this memory
- summary: 2-3 sentence summary of the conversation
- facts: bullet-point list of facts learned
- preferences: user preferences or null if none

Respond with ONLY valid JSON, no markdown formatting.`,
        },
        ...messages,
      ],
    });

    try {
      const parsed = JSON.parse(response.content);
      return {
        title: parsed.title || 'Memory',
        summary: parsed.summary || response.content.slice(0, 200),
        facts: parsed.facts || '',
        preferences: parsed.preferences || null,
        sourceChatIds: input.chatMessages.map((m) => m.id),
        compactedCount: 1,
      };
    } catch {
      return {
        title: 'Memory',
        summary: response.content.slice(0, 200),
        facts: response.content,
        preferences: null,
        sourceChatIds: input.chatMessages.map((m) => m.id),
        compactedCount: 1,
      };
    }
  }

  getProviderName(): string {
    return 'Zen AI';
  }

  async getStatus(): Promise<AIStatus> {
    // Always reload from DB so status reflects current config (the singleton's
    // client can otherwise stay in dev mode even after the key is saved).
    const config = await loadZenConfig();
    const configured = config !== null && config.apiKey.length > 0;
    return {
      providerName: 'Zen AI',
      isConfigured: configured,
      isUsingDevMode: !configured,
      apiUrl: config?.apiBaseUrl ?? null,
    };
  }

  getClient(): ZenAIClient {
    return this.client;
  }
}

// Singleton
let instance: ZenAI | null = null;

export function getZenAI(): ZenAI {
  if (!instance) {
    instance = new ZenAI();
  }
  return instance;
}
