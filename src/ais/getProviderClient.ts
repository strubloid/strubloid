// Provider dispatcher — routes AI requests to the correct config
// based on the model's source provider (Zen, NVIDIA, etc.).

import { db } from '@/lib/db';
import { ZenAIClient } from '@/ais/zen/ZenAIClient';
import { loadZenConfig } from '@/ais/zen/ZenConfig';
import { loadNvidiaConfig } from '@/ais/nvidia/NvidiaConfig';
import { loadGoOCConfig } from '@/ais/go-oc/GoOCConfig';
import { cachedConfig } from '@/lib/configCache';

/** Minimal model shape needed for dispatching. */
export interface ModelInfo {
  modelSource: string;
  endpoint: string;
  modelId: string;
  name: string;
  provider: string;
  isEnabled: boolean;
  isFree: boolean;
  inputPrice: number | null;
  outputPrice: number | null;
}

/**
 * Creates a ZenAIClient configured for the appropriate provider
 * based on the given model's `modelSource` field.
 */
export async function getClientForModel(
  modelId: string
): Promise<{ client: ZenAIClient; model: ModelInfo | null }> {
  // Look up the model to determine its source provider
  let model = await db.aiModel.findUnique({
    where: { modelId },
  });

  // If not found, default to Zen for backward compatibility
  if (!model) {
    const config = await cachedConfig('zen_config', loadZenConfig);
    return {
      client: new ZenAIClient(config),
      model: { modelSource: 'zen', endpoint: '/v1/chat/completions', modelId, name: modelId, provider: 'openai', isEnabled: true, isFree: false, inputPrice: null, outputPrice: null },
    };
  }

  const source = model.modelSource;

  if (source === 'nvidia') {
    const config = await cachedConfig('nvidia_config', loadNvidiaConfig);
    return { client: new ZenAIClient(config), model };
  }

  if (source === 'go-oc') {
    const config = await cachedConfig('go_oc_config', loadGoOCConfig);
    return { client: new ZenAIClient(config), model };
  }

  // Default: Zen
  const config = await cachedConfig('zen_config', loadZenConfig);
  return { client: new ZenAIClient(config), model };
}
