// Configuration for the BigPickle AI provider.
// Values are read from environment variables and validated at construction.

export interface BigPickleConfig {
  apiUrl: string;
  apiKey: string;
  timeoutMs: number;
}

export function buildBigPickleConfig(): BigPickleConfig | null {
  const apiUrl = process.env.BIGPICKLE_API_URL?.trim();
  if (!apiUrl) return null;

  const timeoutMs = Number(process.env.BIGPICKLE_TIMEOUT_MS ?? '30000');
  const apiKey = process.env.BIGPICKLE_API_KEY?.trim() ?? '';

  return { apiUrl, apiKey, timeoutMs };
}

export function isBigPickleConfigured(): boolean {
  return Boolean(process.env.BIGPICKLE_API_URL?.trim());
}