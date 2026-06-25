import type { StreamEvent } from '@/ais/AIResponse';

/**
 * Consume an SSE ReadableStream and yield parsed StreamEvent objects.
 * Handles `data: {...}\n\n` format and `data: [DONE]\n\n` terminator.
 * Supports both web ReadableStream and node-fetch style bodies.
 */
export async function* parseSSEStream(
  body: ReadableStream<Uint8Array> | null
): AsyncGenerator<StreamEvent> {
  if (!body) throw new Error('No response body');

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE messages (terminated by \n\n)
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || ''; // keep incomplete chunk

      for (const part of parts) {
        for (const line of part.split('\n')) {
          if (line.startsWith('data: ')) {
            const payload = line.slice(6).trim();
            if (payload === '[DONE]') return;
            if (!payload) continue;

            try {
              const event = JSON.parse(payload) as StreamEvent;
              yield event;
            } catch {
              // Skip unparsable data lines
              console.warn('[SSE] Failed to parse:', payload);
            }
          }
        }
      }
    }

    // Flush remaining buffer
    if (buffer.trim()) {
      for (const line of buffer.split('\n')) {
        if (line.startsWith('data: ')) {
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') return;
          if (!payload) continue;
          try {
            yield JSON.parse(payload) as StreamEvent;
          } catch { /* skip */ }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
