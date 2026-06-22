// Configuration for the BigPickle AI provider.
// Values are read from environment variables and validated at construction.

export interface BigPickleConfig {
  apiUrl: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
}

function stripQuotes(value: string): string {
  return value.replace(/^["']|["']$/g, '');
}

export function buildBigPickleConfig(): BigPickleConfig | null {
  const rawUrl = process.env.BIGPICKLE_API_URL?.trim();
  if (!rawUrl) return null;

  const apiUrl = stripQuotes(rawUrl).replace(/\/+$/, ''); // strip trailing slash
  const rawKey = process.env.BIGPICKLE_API_KEY?.trim() ?? '';
  const apiKey = stripQuotes(rawKey);
  const model = stripQuotes(process.env.BIGPICKLE_MODEL?.trim() ?? 'big-pickle');
  const timeoutMs = Number(process.env.BIGPICKLE_TIMEOUT_MS ?? '30000');

  return { apiUrl, apiKey, model, timeoutMs };
}

export function isBigPickleConfigured(): boolean {
  const rawUrl = process.env.BIGPICKLE_API_URL?.trim();
  return Boolean(rawUrl && stripQuotes(rawUrl));
}
