// Provider dispatcher — routes AI requests to the correct config
// based on the model's source provider (Zen, NVIDIA, etc.).

import { db } from '@/lib/db';
import { ZenAIClient } from '@/ais/zen/ZenAIClient';

/** Minimal model shape needed for dispatching. */
interface ModelInfo {
  modelSource: string;
  endpoint: string;
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
    const { loadZenConfig } = await import('@/ais/zen/ZenConfig');
    const config = await loadZenConfig();
    return {
      client: new ZenAIClient(config),
      model: { modelSource: 'zen', endpoint: '/v1/chat/completions' },
    };
  }

  const source = model.modelSource;

  if (source === 'nvidia') {
    const { loadNvidiaConfig } = await import('@/ais/nvidia/NvidiaConfig');
    const config = await loadNvidiaConfig();
    return { client: new ZenAIClient(config), model };
  }

  // Default: Zen
  const { loadZenConfig } = await import('@/ais/zen/ZenConfig');
  const config = await loadZenConfig();
  return { client: new ZenAIClient(config), model };
}
