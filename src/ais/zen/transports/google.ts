/**
 * Google AI transport — calls Google / Gemini-compatible endpoints.
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

  // Map generic roles to Gemini parts
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : m.role,
    parts: [{ text: m.content }],
  }));

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      maxOutputTokens: 4096,
    },
  };

  if (systemPrompt) {
    body.systemInstruction = {
      parts: [{ text: systemPrompt }],
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  if (options?.signal) {
    options.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    const response = await fetch(
      config.apiBaseUrl + model.endpoint + '?key=' + config.apiKey,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      content: data.candidates?.[0]?.content?.parts?.[0]?.text ?? JSON.stringify(data),
      model: data.modelVersion ?? model.modelId,
      usage: data.usageMetadata
        ? {
            promptTokens: data.usageMetadata.promptTokenCount ?? 0,
            completionTokens: data.usageMetadata.candidatesTokenCount ?? 0,
            totalTokens: data.usageMetadata.totalTokenCount ?? 0,
          }
        : undefined,
    };
  } finally {
    clearTimeout(timeout);
  }
}
