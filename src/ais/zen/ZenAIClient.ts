import { AIResponse, SendMessageInput, StreamEvent } from '@/ais/AIResponse';
import { AIProviderError } from '@/ais/AIProviderError';
import { db } from '@/lib/db';
import type { ZenConfig } from './ZenConfig';

const TIMEOUT_MS = parseInt(process.env.ZEN_TIMEOUT_MS || '60000', 10);

/** Idle timeout between stream chunks (ms) — user-configurable via env. */
const STREAM_IDLE_TIMEOUT_MS = parseInt(process.env.ZEN_STREAM_IDLE_TIMEOUT_MS || '15000', 10);

/** Minimal model shape used internally. */
interface StreamModel {
  modelId: string;
  name: string;
  endpoint: string;
  provider: string;
}

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
    modelId?: string,
    /** Pre-resolved model row — skips a DB lookup when provided. */
    resolvedModel?: StreamModel
  ): Promise<AIResponse> {
    if (this.isDevMode) {
      return this.getDevModeResponse(options.messages);
    }

    const config = this.config!;

    const apiMessages = options.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const activeModelId = modelId || this.modelId;

    const model = resolvedModel ?? await this.resolveModel(activeModelId);

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
        return this.callOpenAIEndpoint(config, model, apiMessages, systemPrompt);
      }
    }
  }

  /**
   * Stream an AI response via SSE (OpenAI-compatible providers only).
   * Yields StreamEvent objects as chunks arrive.
   *
   * For non-OpenAI providers (Anthropic, Google), this falls back to
   * sendMessage and yields a single done event.
   */
  async *streamMessage(
    options: SendMessageInput,
    modelId?: string,
    /** Pre-resolved model row — optional, skips a DB lookup. */
    resolvedModel?: StreamModel,
    /** External abort signal (e.g. from client disconnect). */
    externalSignal?: AbortSignal
  ): AsyncGenerator<StreamEvent> {
    if (this.isDevMode) {
      yield {
        type: 'done',
        full: this.getDevModeResponse(options.messages).content,
        model: this.modelId,
      };
      return;
    }

    const config = this.config!;
    const apiMessages = options.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    const activeModelId = modelId || this.modelId;
    const model = resolvedModel ?? await this.resolveModel(activeModelId);

    let systemPrompt = `You are ${model.name}, an AI assistant created by OpenCode. When asked who you are or what model you are, identify yourself as ${model.name}.`;

    if (options.useAiBrain && options.brainMemories?.length) {
      systemPrompt += `\n\nYou have access to saved memories from past conversations.\n\nRelevant saved memory:\n${options.brainMemories.join('\n---\n')}\n\nIMPORTANT: Use the memory above when answering the user. If the user asks about data they shared, saved, or discussed before, answer from this memory. Do NOT say you have no access to previous conversations — the memory was provided to you. Only say you have no information if the memory section above is empty.`;
    }

    // For non-OpenAI providers, fall back to non-streaming
    if (model.provider !== 'openai') {
      const result = await this.sendMessage(options, activeModelId, model);
      yield { type: 'done', full: result.content, model: result.model, usage: result.usage };
      return;
    }

    // ── Streaming for OpenAI-compatible providers ──────────
    const body: Record<string, unknown> = {
      model: model.modelId,
      messages: systemPrompt
        ? [{ role: 'system', content: systemPrompt }, ...apiMessages]
        : apiMessages,
      stream: true,
    };

    const controller = new AbortController();

    // If external signal is provided, bridge it to our controller
    if (externalSignal) {
      externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    const totalTimeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    // Hoist idle-tracker vars so catch/finally can see them
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    let idleFired = false;

    try {
      const response = await fetch(
        `${config.apiBaseUrl}${model.endpoint}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw AIProviderError.httpError(response.status, text);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';
      let finalUsage: { promptTokens: number; completionTokens: number; totalTokens: number } | undefined;

      function resetIdleTimer() {
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
          idleFired = true;
          controller.abort();
        }, STREAM_IDLE_TIMEOUT_MS);
      }

      resetIdleTimer();

      while (true) {
        const { value, done: readerDone } = await reader.read();
        if (readerDone) break;
        if (idleFired) {
          yield { type: 'error', error: `Provider idle timeout after ${STREAM_IDLE_TIMEOUT_MS}ms — no chunks received.` };
          return;
        }

        resetIdleTimer();

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE frames: "data: ...\n\n"
        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? '';

        for (const frame of frames) {
          const trimmed = frame.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (!trimmed.startsWith('data:')) continue;

          const jsonStr = trimmed.slice(5).trim();
          if (!jsonStr) continue;

          try {
            const parsed = JSON.parse(jsonStr);
            const delta =
              parsed.choices?.[0]?.delta?.content ??
              parsed.choices?.[0]?.text ??
              '';

            if (delta) {
              fullContent += delta;
              yield { type: 'delta', delta };
            }

            // If finish_reason is present, this is the last chunk
            if (parsed.choices?.[0]?.finish_reason) {
              if (parsed.usage) {
                finalUsage = {
                  promptTokens: parsed.usage.prompt_tokens ?? parsed.usage.input_tokens ?? 0,
                  completionTokens: parsed.usage.completion_tokens ?? parsed.usage.output_tokens ?? 0,
                  totalTokens: parsed.usage.total_tokens ?? 0,
                };
              }
              break;
            }
          } catch {
            // Skip unparseable frames
          }
        }
      }

      yield {
        type: 'done',
        full: fullContent,
        model: model.modelId,
        usage: finalUsage,
      };
    } catch (error) {
      if ((error as Error).name === 'AbortError' && idleFired) {
        yield { type: 'error', error: `Provider idle timeout after ${STREAM_IDLE_TIMEOUT_MS}ms.` };
      } else if (error instanceof AIProviderError) {
        yield { type: 'error', error: error.message };
      } else {
        yield { type: 'error', error: (error as Error).message || 'Stream error' };
      }
    } finally {
      clearTimeout(totalTimeout);
      if (idleTimer) clearTimeout(idleTimer);
    }
  }

  /** Resolve model from DB or fallback. */
  private async resolveModel(modelId: string): Promise<StreamModel> {
    let model = await db.aiModel.findUnique({
      where: { modelId },
    });

    if (!model) {
      return {
        modelId,
        name: modelId,
        endpoint: '/v1/chat/completions',
        provider: 'openai',
      };
    }

    return {
      modelId: model.modelId,
      name: model.name,
      endpoint: model.endpoint,
      provider: model.provider,
    };
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
            'Authorization': `Bearer ${config.apiKey}`,
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
        content = data.choices[0].text;
      } else if (typeof data === 'string') {
        content = data;
      } else if (data.content?.[0]?.text) {
        content = data.content[0].text;
      } else if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        content = data.candidates[0].content.parts[0].text;
      }

      if (!content) {
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
            'Authorization': `Bearer ${config.apiKey}`,
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
      content: `[DEV MODE] Zen AI is in development mode because no API key is configured.\n\nGo to **Settings → AI Provider** to add your OpenCode Zen API key.\n\n(Configured at settings page, stored in database)`,
      model: this.modelId,
    };
  }
}
