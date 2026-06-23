// Zen AI config — reads from the Config table in the database.
// Falls back to environment variables for development convenience.

import { db } from '@/lib/db';

export interface ZenConfig {
  apiKey: string;
  apiBaseUrl: string;
  defaultModel: string;
}

const DEFAULT_BASE_URL = 'https://opencode.ai/zen';
const DEFAULT_MODEL = 'big-pickle';

export async function loadZenConfig(): Promise<ZenConfig | null> {
  try {
    const rows = await db.config.findMany({
      where: { key: { in: ['zen_api_key', 'zen_api_base_url', 'zen_default_model'] } },
    });

    const configMap = new Map<string, string>(rows.map((r) => [r.key, r.value]));

    const apiKey =
      configMap.get('zen_api_key') ||
      process.env.ZEN_API_KEY ||
      process.env.BIGPICKLE_API_KEY ||
      '';

    if (!apiKey) return null;

    const apiBaseUrl: string = configMap.get('zen_api_base_url') || DEFAULT_BASE_URL;
    const defaultModel: string = configMap.get('zen_default_model') || DEFAULT_MODEL;

    return {
      apiKey,
      apiBaseUrl,
      defaultModel,
    };
  } catch {
    // DB not available (e.g. during build/SSR) — fallback to env
    const apiKey =
      process.env.ZEN_API_KEY || process.env.BIGPICKLE_API_KEY || '';
    if (!apiKey) return null;
    return {
      apiKey,
      apiBaseUrl: DEFAULT_BASE_URL,
      defaultModel: DEFAULT_MODEL,
    };
  }
}
