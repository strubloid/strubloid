/**
 * OpenAI-compatible transport (covers Zen + NVIDIA + any OpenAI-shaped provider).
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
    messages: systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : messages,
    stream: false,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  // If an external signal is provided, forward its abort to our controller
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
          'Authorization': 'Bearer ' + config.apiKey,
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
      console.warn(
        '[/ai/zen/openai] could not extract content from response,',
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
