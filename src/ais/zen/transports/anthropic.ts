/**
 * Anthropic transport — calls Anthropic-compatible endpoints.
 */

import { AIResponse } from '@/ais/AIResponse';
import { AIProviderError } from '@/ais/AIProviderError';

export interface TransportConfig {
  apiKey: string;
  apiBaseUrl: string;
}

export interface TransportModel {
  modelId: string;
  endpoint: string;
}

export async function complete(
  config: TransportConfig,
  model: TransportModel,
  messages: { role: string; content: string }[],
  systemPrompt: string,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<AIResponse> {
  const timeoutMs = options?.timeoutMs ?? 60_000;
  const body: Record<string, unknown> = {
    model: model.modelId,
    messages,
    max_tokens: 4096,
  };

  if (systemPrompt) {
    body.system = systemPrompt;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  if (options?.signal) {
    options.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

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
