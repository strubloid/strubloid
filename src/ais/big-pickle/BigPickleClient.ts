import { AIMessage } from '../AIMessage';
import { AIProviderError } from '../AIProviderError';
import { BigPickleConfig, buildBigPickleConfig } from './BigPickleConfig';

export interface SendMessageOptions {
  useAiBrain?: boolean;
  brainMemories?: string[];
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

    const { apiUrl, apiKey, model, timeoutMs } = this.config;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const body = this.buildChatBody(messages, model, options);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetch(`${apiUrl}/chat/completions`, {
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
      return this.parseChatResponse(data);
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

    const { apiUrl, apiKey, model, timeoutMs } = this.config;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const formattedMessages: AIMessage[] = chatMessages.map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      }));

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      // Route compaction through chat completions with a structured prompt
      const body = {
        model,
        messages: [
          {
            role: 'system',
            content: `You are a memory compaction assistant. Your task is to analyze the following conversation and extract:
1. title: A short descriptive title for this memory (max 80 chars)
2. summary: A 2-3 sentence summary of the key points discussed
3. facts: Bullet points of concrete facts extracted from the conversation
4. preferences: Any user preferences or settings mentioned (or null if none)

Respond ONLY with a valid JSON object containing "title", "summary", "facts", and "preferences" (preferences can be null) fields. Do not include any other text.`,
          },
          ...formattedMessages,
          {
            role: 'user',
            content: 'Please compact the above conversation into a memory entry as instructed.',
          },
        ],
        max_tokens: 2000,
      } as Record<string, unknown>;

      const response = await fetch(`${apiUrl}/chat/completions`, {
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
      return this.parseCompactResponse(data);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof AIProviderError) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        throw AIProviderError.timeout();
      }
      throw AIProviderError.providerUnavailable(error);
    }
  }

  private buildChatBody(messages: AIMessage[], model: string, options: SendMessageOptions): Record<string, unknown> {
    const apiMessages: AIMessage[] = [];

    // Add system prompt with brain memories if enabled
    if (options.useAiBrain && options.brainMemories && options.brainMemories.length > 0) {
      apiMessages.push({
        role: 'system',
        content: `You have access to the following memories from past conversations:\n${options.brainMemories.map((m, i) => `[Memory ${i + 1}]: ${m}`).join('\n')}`,
      });
    }

    // Add conversation messages
    apiMessages.push(...messages);

    return {
      model,
      messages: apiMessages,
    };
  }

  private parseChatResponse(data: unknown): { content: string; model: string; usage?: { promptTokens: number; completionTokens: number; totalTokens: number } } {
    if (!data || typeof data !== 'object') {
      throw AIProviderError.invalidResponse('Response is not an object');
    }

    const d = data as Record<string, unknown>;
    const choices = d.choices;

    if (!Array.isArray(choices) || choices.length === 0) {
      throw AIProviderError.invalidResponse('Response missing choices array');
    }

    const firstChoice = choices[0] as Record<string, unknown> | undefined;
    const message = firstChoice?.message as Record<string, unknown> | undefined;

    if (!message || typeof message.content !== 'string') {
      throw AIProviderError.invalidResponse('Response missing message content in choices[0]');
    }

    return {
      content: message.content,
      model: typeof d.model === 'string' ? d.model : 'unknown',
      usage: d.usage && typeof d.usage === 'object'
        ? {
            promptTokens: Number((d.usage as Record<string, unknown>).prompt_tokens ?? (d.usage as Record<string, unknown>).promptTokens) || 0,
            completionTokens: Number((d.usage as Record<string, unknown>).completion_tokens ?? (d.usage as Record<string, unknown>).completionTokens) || 0,
            totalTokens: Number((d.usage as Record<string, unknown>).total_tokens ?? (d.usage as Record<string, unknown>).totalTokens) || 0,
          }
        : undefined,
    };
  }

  private parseCompactResponse(data: unknown): { title: string; summary: string; facts: string; preferences: string | null } {
    if (!data || typeof data !== 'object') {
      throw AIProviderError.invalidResponse('Response is not an object');
    }

    const d = data as Record<string, unknown>;
    const choices = d.choices;

    if (!Array.isArray(choices) || choices.length === 0) {
      throw AIProviderError.invalidResponse('Response missing choices array');
    }

    const firstChoice = choices[0] as Record<string, unknown> | undefined;
    const message = firstChoice?.message as Record<string, unknown> | undefined;

    if (!message || typeof message.content !== 'string') {
      throw AIProviderError.invalidResponse('Response missing message content in choices[0]');
    }

    // Try to parse the JSON response
    try {
      const parsed = JSON.parse(message.content);
      return {
        title: typeof parsed.title === 'string' ? parsed.title : 'Untitled Memory',
        summary: typeof parsed.summary === 'string' ? parsed.summary : '',
        facts: typeof parsed.facts === 'string' ? parsed.facts : '',
        preferences: typeof parsed.preferences === 'string' ? parsed.preferences : null,
      };
    } catch {
      // If JSON parsing fails, treat the raw content as a summary
      return {
        title: 'Memory Compaction',
        summary: message.content.slice(0, 500),
        facts: '',
        preferences: null,
      };
    }
  }

  private getDevModeResponse(
    _messages: AIMessage[],
    _options: SendMessageOptions = {}
  ): { content: string; model: string; usage?: { promptTokens: number; completionTokens: number; totalTokens: number } } {
    const lastMessage = _messages[_messages.length - 1];
    const userContent = lastMessage?.content ?? '';

    const content = `[DEV MODE] This is a simulated response because BIGPICKLE_API_URL is not configured.\n\nYou said: "${userContent.slice(0, 100)}${userContent.length > 100 ? '...' : ''}"\n\nTo enable real AI responses:\n1. Copy .env.example to .env\n2. Set BIGPICKLE_API_URL to your BigPickle endpoint\n3. Optionally set BIGPICKLE_API_KEY\n4. Set BIGPICKLE_MODEL to your preferred model\n5. Restart the dev server`;

    return {
      content,
      model: 'dev-mode',
      usage: {
        promptTokens: 10,
        completionTokens: Math.ceil(content.length / 4),
        totalTokens: 10 + Math.ceil(content.length / 4),
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
