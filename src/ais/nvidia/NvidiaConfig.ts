// NVIDIA NIM config — reads from the Config table in the database.
// Falls back to environment variables for development convenience.

import { db } from '@/lib/db';

/** Shape shared by all provider configs (Zen, NVIDIA, etc.) */
export interface ProviderConfig {
  apiKey: string;
  apiBaseUrl: string;
  defaultModel: string;
}

const DEFAULT_BASE_URL = 'https://integrate.api.nvidia.com/v1';
const DEFAULT_MODEL = 'meta/llama-3.3-70b-instruct';

export async function loadNvidiaConfig(): Promise<ProviderConfig | null> {
  try {
    const rows = await db.config.findMany({
      where: { key: { in: ['nvidia_api_key', 'nvidia_api_base_url', 'nvidia_default_model'] } },
    });

    const configMap = new Map<string, string>(rows.map((r) => [r.key, r.value]));

    const apiKey =
      configMap.get('nvidia_api_key') ||
      process.env.NVIDIA_API_KEY ||
      '';

    if (!apiKey) return null;

    const apiBaseUrl: string = configMap.get('nvidia_api_base_url') || DEFAULT_BASE_URL;
    const defaultModel: string = configMap.get('nvidia_default_model') || DEFAULT_MODEL;

    return {
      apiKey,
      apiBaseUrl,
      defaultModel,
    };
  } catch {
    // DB not available (e.g. during build/SSR) — fallback to env
    const apiKey = process.env.NVIDIA_API_KEY || '';
    if (!apiKey) return null;
    return {
      apiKey,
      apiBaseUrl: DEFAULT_BASE_URL,
      defaultModel: DEFAULT_MODEL,
    };
  }
}
