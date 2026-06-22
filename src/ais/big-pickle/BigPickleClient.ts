import { AIMessage } from '../AIMessage';
import { AIProviderError } from '../AIProviderError';
import { BigPickleConfig, buildBigPickleConfig } from './BigPickleConfig';

export interface SendMessageOptions {
  useAiBrain?: boolean;
  brainMemories?: string[];
}

interface BigPickleMessage {
  role: string;
  content: string;
}

export class BigPickleClient {
  private readonly config: BigPickleConfig | null;
  private readonly isConfigured: boolean;
  private readonly isDevMode: boolean;

  constructor() {
    this.config = buildBigPickleConfig();
    this.isConfigured = this.config !== null && Boolean(this.config.apiUrl);
    this.isDevMode = !this.isConfigured;
  }

  getStatus() {
    return {
      providerName: 'BigPickle',
      isConfigured: this.isConfigured,
      isUsingDevMode: this.isDevMode,
      apiUrl: this.config?.apiUrl ?? null,
    };
  }

  async sendMessage(
    messages: AIMessage[],
    options: SendMessageOptions = {}
  ): Promise<{ content: string; model: string; usage?: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
    if (this.isDevMode) {
      return this.getDevModeResponse(messages, options);
    }

    if (!this.config) {
      throw AIProviderError.missingConfig('BIGPICKLE_API_URL');
    }

    const { apiUrl, apiKey, timeoutMs } = this.config;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const body = this.buildRequestBody(messages, options);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetch(`${apiUrl}/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw AIProviderError.httpError(response.status);
      }

      const data = await response.json();
      return this.parseResponse(data);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof AIProviderError) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        throw AIProviderError.timeout();
      }
      throw AIProviderError.providerUnavailable(error);
    }
  }

  async compactMemory(
    chatMessages: { id: string; role: string; content: string; createdAt: Date }[]
  ): Promise<{ title: string; summary: string; facts: string; preferences: string | null }> {
    if (this.isDevMode) {
      return this.getDevModeMemoryCompaction(chatMessages);
    }

    if (!this.config) {
      throw AIProviderError.missingConfig('BIGPICKLE_API_URL');
    }

    const { apiUrl, apiKey, timeoutMs } = this.config;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const formattedMessages = chatMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetch(`${apiUrl}/compact`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ messages: formattedMessages }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw AIProviderError.httpError(response.status);
      }

      const data = await response.json();
      return {
        title: data.title ?? 'Untitled Memory',
        summary: data.summary ?? '',
        facts: data.facts ?? '',
        preferences: data.preferences ?? null,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof AIProviderError) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        throw AIProviderError.timeout();
      }
      throw AIProviderError.providerUnavailable(error);
    }
  }

  private buildRequestBody(messages: AIMessage[], options: SendMessageOptions): Record<string, unknown> {
    const body: Record<string, unknown> = { messages };

    if (options.useAiBrain && options.brainMemories && options.brainMemories.length > 0) {
      body.system = `You have access to the following memories from past conversations:\n${options.brainMemories.map((m, i) => `[Memory ${i + 1}]: ${m}`).join('\n')}`;
    }

    return body;
  }

  private parseResponse(data: unknown): { content: string; model: string; usage?: { promptTokens: number; completionTokens: number; totalTokens: number } } {
    if (!data || typeof data !== 'object') {
      throw AIProviderError.invalidResponse('Response is not an object');
    }

    const d = data as Record<string, unknown>;

    if (typeof d.content !== 'string') {
      throw AIProviderError.invalidResponse('Response missing content string');
    }

    return {
      content: d.content,
      model: typeof d.model === 'string' ? d.model : 'unknown',
      usage: d.usage && typeof d.usage === 'object'
        ? {
            promptTokens: Number((d.usage as Record<string, unknown>).promptTokens) || 0,
            completionTokens: Number((d.usage as Record<string, unknown>).completionTokens) || 0,
            totalTokens: Number((d.usage as Record<string, unknown>).totalTokens) || 0,
          }
        : undefined,
    };
  }

  private getDevModeResponse(
    messages: AIMessage[],
    _options: SendMessageOptions = {}
  ): { content: string; model: string; usage?: { promptTokens: number; completionTokens: number; totalTokens: number } } {
    const lastMessage = messages[messages.length - 1];
    const userContent = lastMessage?.content ?? '';

    const response = `[DEV MODE] This is a simulated response because BIGPICKLE_API_URL is not configured.\n\nYou said: "${userContent.slice(0, 100)}${userContent.length > 100 ? '...' : ''}"\n\nTo enable real AI responses:\n1. Copy .env.example to .env\n2. Set BIGPICKLE_API_URL to your BigPickle endpoint\n3. Optionally set BIGPICKLE_API_KEY\n4. Restart the dev server`;

    return {
      content: response,
      model: 'dev-mode',
      usage: {
        promptTokens: 10,
        completionTokens: response.length / 4,
        totalTokens: 10 + response.length / 4,
      },
    };
  }

  private getDevModeMemoryCompaction(
    _chatMessages: { id: string; role: string; content: string; createdAt: Date }[]
  ): { title: string; summary: string; facts: string; preferences: string | null } {
    return {
      title: '[DEV MODE] Memory Compaction Sample',
      summary: 'This is a simulated memory compaction result because BIGPICKLE_API_URL is not configured.',
      facts: 'No actual facts were extracted because the AI provider is not configured.',
      preferences: null,
    };
  }
}
