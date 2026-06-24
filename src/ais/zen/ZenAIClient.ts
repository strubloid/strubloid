import { AIResponse, SendMessageInput } from '@/ais/AIResponse';
import { AIProviderError } from '@/ais/AIProviderError';
import type { ZenConfig } from './ZenConfig';

const TIMEOUT_MS = parseInt(process.env.ZEN_TIMEOUT_MS || '60000', 10);

export class ZenAIClient {
  private config: ZenConfig | null;

  constructor(config: ZenConfig | null) {
    this.config = config;
  }

  get isConfigured(): boolean {
    return this.config !== null && this.config.apiKey.length > 0;
  }

  get isDevMode(): boolean {
    return !this.isConfigured;
  }

  get apiUrl(): string | null {
    return this.config?.apiBaseUrl ?? null;
  }

  get modelId(): string {
    return this.config?.defaultModel ?? 'big-pickle';
  }

  async sendMessage(
    options: SendMessageInput,
    modelId?: string
  ): Promise<AIResponse> {
    if (this.isDevMode) {
      return this.getDevModeResponse(options.messages);
    }

    const config = this.config!;

    // Build request
    const apiMessages = options.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Determine which model and endpoint to use
    const activeModelId = modelId || this.modelId;
    const { db } = await import('@/lib/db');

    let model = await db.aiModel.findUnique({
      where: { modelId: activeModelId },
    });

    // Fallback if model not found in DB
    if (!model) {
      model = {
        id: 0,
        modelId: activeModelId,
        name: activeModelId,
        endpoint: '/v1/chat/completions',
        provider: 'openai',
        modelSource: 'zen',
        description: null,
        isEnabled: true,
        isFree: false,
        inputPrice: null,
        outputPrice: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    // Build system prompt with model identity
    let systemPrompt = `You are ${model.name}, an AI assistant created by OpenCode. When asked who you are or what model you are, identify yourself as ${model.name}.`;

    if (options.useAiBrain && options.brainMemories?.length) {
      systemPrompt += `\n\nYou have access to saved memories from past conversations.\n\nRelevant saved memory:\n${options.brainMemories.join('\n---\n')}\n\nIMPORTANT: Use the memory above when answering the user. If the user asks about data they shared, saved, or discussed before, answer from this memory. Do NOT say you have no access to previous conversations — the memory was provided to you. Only say you have no information if the memory section above is empty.`;
    }

    switch (model.provider) {
      case 'anthropic': {
        return this.callAnthropicEndpoint(config, model, apiMessages, systemPrompt);
      }
      case 'google': {
        return this.callGoogleEndpoint(config, model, apiMessages, systemPrompt);
      }
      default: {
        // OpenAI-compatible (chat/completions) — default
        return this.callOpenAIEndpoint(config, model, apiMessages, systemPrompt);
      }
    }
  }

  private async callOpenAIEndpoint(
    config: ZenConfig,
    model: { modelId: string; endpoint: string },
    messages: { role: string; content: string }[],
    systemPrompt: string
  ): Promise<AIResponse> {
    const body: Record<string, unknown> = {
      model: model.modelId,
      messages: systemPrompt
        ? [{ role: 'system', content: systemPrompt }, ...messages]
        : messages,
      stream: false,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(
        `${config.apiBaseUrl}${model.endpoint}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw AIProviderError.httpError(response.status, text);
      }

      const data = await response.json();

      let content = '';
      let modelName = model.modelId;

      // Try standard OpenAI-format: data.choices[0].message.content
      const rawContent = data.choices?.[0]?.message?.content;
      if (rawContent !== undefined && rawContent !== null && rawContent !== '') {
        content = rawContent;
        modelName = data.model || model.modelId;
      } else if (data.choices?.[0]?.text) {
        // Completion endpoint (non-chat)
        content = data.choices[0].text;
      } else if (typeof data === 'string') {
        content = data;
      } else if (data.content?.[0]?.text) {
        // Google-style response
        content = data.content[0].text;
      } else if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        // Gemini-style (full)
        content = data.candidates[0].content.parts[0].text;
      }

      if (!content) {
        // Log a warning and fall back — the response format may have changed
        console.warn(
          '[/ai/zen] callOpenAIEndpoint: could not extract content from response,',
          'model=%s status=200 keys=%s',
          model.modelId,
          Object.keys(data).join(',')
        );
        content = JSON.stringify(data);
      }

      return {
        content,
        model: modelName,
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens ?? data.usage.input_tokens ?? 0,
              completionTokens: data.usage.completion_tokens ?? data.usage.output_tokens ?? 0,
              totalTokens: data.usage.total_tokens ?? 0,
            }
          : undefined,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private async callAnthropicEndpoint(
    config: ZenConfig,
    model: { modelId: string; endpoint: string },
    messages: { role: string; content: string }[],
    systemPrompt: string
  ): Promise<AIResponse> {
    const body: Record<string, unknown> = {
      model: model.modelId,
      messages,
      max_tokens: 4096,
    };

    if (systemPrompt) {
      body.system = systemPrompt;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(
        `${config.apiBaseUrl}${model.endpoint}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': config.apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw AIProviderError.httpError(response.status, text);
      }

      const data = await response.json();

      return {
        content: data.content?.[0]?.text ?? JSON.stringify(data),
        model: data.model ?? model.modelId,
        usage: data.usage
          ? {
              promptTokens: data.usage.input_tokens ?? 0,
              completionTokens: data.usage.output_tokens ?? 0,
              totalTokens: (data.usage.input_tokens ?? 0) + (data.usage.output_tokens ?? 0),
            }
          : undefined,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private async callGoogleEndpoint(
    config: ZenConfig,
    model: { modelId: string; endpoint: string },
    messages: { role: string; content: string }[],
    systemPrompt: string
  ): Promise<AIResponse> {
    const contents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : m.role,
      parts: [{ text: m.content }],
    }));

    const body: Record<string, unknown> = {
      contents,
      generationConfig: { maxOutputTokens: 4096 },
    };

    if (systemPrompt) {
      body.systemInstruction = { parts: [{ text: systemPrompt }] };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(
        `${config.apiBaseUrl}${model.endpoint}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw AIProviderError.httpError(response.status, text);
      }

      const data = await response.json();

      return {
        content:
          data.candidates?.[0]?.content?.parts?.[0]?.text ?? JSON.stringify(data),
        model: model.modelId,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private getDevModeResponse(
    _messages: { role: string; content: string }[]
  ): AIResponse {
    return {
      content: `[DEV MODE] Zen AI is in development mode because no API key is configured.

Go to **Settings → AI Provider** to add your OpenCode Zen API key.

(Configured at settings page, stored in database)`,
      model: this.modelId,
    };
  }
}
