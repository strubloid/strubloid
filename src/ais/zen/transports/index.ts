/**
 * Transport registry — maps provider names to transport modules.
 */

import * as openaiTransport from './openai';
import * as anthropicTransport from './anthropic';
import * as googleTransport from './google';

import type { TransportConfig } from './openai';

export type { TransportConfig } from './openai';
export type { TransportModel } from './openai';

/** Shape returned by a non-streaming complete call. */
export interface TransportResult {
  content: string; model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/** Stream event from an OpenAI-compatible streaming call. */
export type StreamEvent =
  | { type: 'delta'; delta: string }
  | { type: 'done'; full: string; model: string }
  | { type: 'error'; error: string };

/** Create a complete function for the given provider. */
export function getTransport(
  provider: string
): (
  config: TransportConfig,
  model: { modelId: string; endpoint: string },
  messages: { role: string; content: string }[],
  systemPrompt: string,
  options?: { signal?: AbortSignal; timeoutMs?: number }
) => Promise<TransportResult> {
  switch (provider) {
    case 'anthropic':
      return anthropicTransport.complete;
    case 'google':
      return googleTransport.complete;
    default:
      return openaiTransport.complete;
  }
}

/** Stream SSE chunks for OpenAI-compatible providers. */
export async function* streamOpenAI(
  config: TransportConfig,
  model: { modelId: string; endpoint: string },
  messages: { role: string; content: string }[],
  systemPrompt: string,
  options?: { signal?: AbortSignal; timeoutMs?: number; idleTimeoutMs?: number }
): AsyncGenerator<StreamEvent> {
  const timeoutMs = options?.timeoutMs ?? 60_000;
  const idleTimeoutMs = options?.idleTimeoutMs ?? 15_000;

  const body: Record<string, unknown> = {
    model: model.modelId,
    messages: systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : messages,
    stream: true,
  };

  const controller = new AbortController();
  const totalTimeout = setTimeout(() => controller.abort(), timeoutMs);
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  let idleFired = false;

  if (options?.signal) {
    options.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    const response = await fetch(
      config.apiBaseUrl + model.endpoint,
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
      yield { type: 'error', error: `HTTP ${response.status}: ${text}` };
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      yield { type: 'error', error: 'Response body is not readable' };
      return;
    }

    let fullContent = '';

    const decoder = new TextDecoder();
    let buffer = '';

    function resetIdleTimer() {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        idleFired = true;
        controller.abort();
      }, idleTimeoutMs);
    }

    resetIdleTimer();

    while (true) {
      const { value, done: readerDone } = await reader.read();
      if (readerDone) break;
      if (idleFired) {
        yield { type: 'error', error: `Provider idle timeout after ${idleTimeoutMs}ms — no chunks received.` };
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

          if (parsed.choices?.[0]?.finish_reason) {
            break;
          }
        } catch {
          // Skip unparseable frames
        }
      }
    }

    yield { type: 'done', full: fullContent, model: model.modelId };
  } catch (error) {
    if ((error as Error).name === 'AbortError' && idleFired) {
      yield { type: 'error', error: `Provider idle timeout after ${idleTimeoutMs}ms — no chunks received.` };
    } else {
      yield { type: 'error', error: (error as Error).message || 'Stream error' };
    }
  } finally {
    clearTimeout(totalTimeout);
    if (idleTimer) clearTimeout(idleTimer);
  }
}
