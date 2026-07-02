// OpenCode Go config — reads from the Config table in the database.
// Falls back to environment variables for development convenience.

import { db } from '@/lib/db';

export interface GoOCConfig {
  apiKey: string;
  apiBaseUrl: string;
  defaultModel: string;
}

const DEFAULT_BASE_URL = 'https://opencode.ai/zen/go';
const DEFAULT_MODEL   = 'opencode-go/minimax-m3';

export async function loadGoOCConfig(): Promise<GoOCConfig | null> {
  const configKey  = 'go_oc_api_key';
  const baseUrlKey = 'go_oc_api_base_url';
  const modelKey   = 'go_oc_default_model';

  try {
    const rows = await db.config.findMany({
      where: { key: { in: [configKey, baseUrlKey, modelKey] } },
    });
    const configMap = new Map(rows.map(r => [r.key, r.value]));

    const apiKey = configMap.get(configKey) || process.env.GO_OC_API_KEY || '';
    if (!apiKey) return null;

    return {
      apiKey,
      apiBaseUrl:  configMap.get(baseUrlKey) || DEFAULT_BASE_URL,
      defaultModel: configMap.get(modelKey)  || DEFAULT_MODEL,
    };
  } catch {
    const apiKey = process.env.GO_OC_API_KEY || '';
    if (!apiKey) return null;
    return { apiKey, apiBaseUrl: DEFAULT_BASE_URL, defaultModel: DEFAULT_MODEL };
  }
}
