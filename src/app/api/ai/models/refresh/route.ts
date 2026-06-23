import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ============================================================
// Classification helpers
// ============================================================

/** Classify a Zen (OpenCode) model as free or paid based on naming convention. */
function isZenModelFree(modelId: string): boolean {
  if (modelId === 'big-pickle') return true;
  if (modelId.endsWith('-free')) return true;
  return false;
}

/** Classify an NVIDIA model as free or paid based on naming convention.
 *  NVIDIA NIM free models are typically small/community models (1-8B params). */
function isNvidiaModelFree(modelId: string): boolean {
  // Pattern 1: explicit integer or decimal size — -8b-, /8b, -6.7b-, -2b, etc.
  if (/[-/][1-8](\.[0-9]+)?b/i.test(modelId)) return true;
  // Pattern 2: minimax naming where mN or mN.N means N billion params
  // e.g. minimax-m3 (3B), minimax-m2.7 (2.7B) — never has 'b' suffix
  if (/[-/]m[1-8](\.[0-9]+)?$/i.test(modelId)) return true;
  return false;
}

/** Generate a human-readable model name from a model ID. */
function makeModelName(modelId: string): string {
  const segments = modelId.split(/[/-]/);
  return segments
    .map((seg, i) => {
      // Preserve well-known casing
      const lower = seg.toLowerCase();
      if (['gpt', 'phi', 'gemma', 'llama', 'qwq', 'mimo', 'nemotron', 'qwen', 'glm', 'kimi', 'grok', 'claude', 'gemini', 'mistral', 'dracarys', 'yi', 'fuyu', 'phi-4', 'phi-3'].includes(lower)) {
        // Capitalize first letter
        return seg.charAt(0).toUpperCase() + seg.slice(1);
      }
      if (i === 0) return seg.charAt(0).toUpperCase() + seg.slice(1);
      return seg;
    })
    .join(' ')
    .replace(/\b(\d+)b\b/gi, '$1B')
    .replace(/\bv(\d+)\b/gi, 'V$1');
}

// ============================================================
// Provider-specific fetchers
// ============================================================

interface RawModel {
  id: string;
  owned_by?: string;
}

async function fetchZenModels(): Promise<{ models: RawModel[]; source: string }> {
  const { loadZenConfig } = await import('@/ais/zen/ZenConfig');
  const config = await loadZenConfig();
  if (!config?.apiKey) {
    throw new Error('Zen API key is not configured');
  }

  const baseUrl = config.apiBaseUrl || 'https://opencode.ai/zen';
  const res = await fetch(`${baseUrl}/v1/models`, {
    headers: { Authorization: `Bearer ${config.apiKey}` },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`Zen API returned ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return { models: data.data || [], source: 'zen' };
}

async function fetchNvidiaModels(): Promise<{ models: RawModel[]; source: string }> {
  const { loadNvidiaConfig } = await import('@/ais/nvidia/NvidiaConfig');
  const config = await loadNvidiaConfig();
  if (!config?.apiKey) {
    throw new Error('NVIDIA API key is not configured');
  }

  const baseUrl = config.apiBaseUrl || 'https://integrate.api.nvidia.com';
  const res = await fetch(`${baseUrl}/v1/models`, {
    headers: { Authorization: `Bearer ${config.apiKey}` },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`NVIDIA API returned ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return { models: data.data || [], source: 'nvidia' };
}

// ============================================================
// Upsert logic
// ============================================================

interface RefreshResult {
  added: number;
  updated: number;
  skipped: number;
  total: number;
}

async function upsertModels(
  apiModels: RawModel[],
  source: string,
): Promise<RefreshResult> {
  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const apiModel of apiModels) {
    const modelId = apiModel.id;

    // Determine free/paid
    const isFree = source === 'zen'
      ? isZenModelFree(modelId)
      : isNvidiaModelFree(modelId);

    // Generate a readable name (better than raw modelId in the dropdown)
    const name = makeModelName(modelId);

    // Check if model already exists
    const existing = await db.aiModel.findUnique({ where: { modelId } });

    if (existing) {
      // Always re-classify on refresh — the API is the source of truth
      // for what's free vs paid. isEnabled and pricing are preserved.
      const updates: Record<string, unknown> = {
        name,
        isFree,
        modelSource: source,
      };
      if (apiModel.owned_by && !existing.description) {
        updates.description = `Model by ${apiModel.owned_by}`;
      }
      if (existing.name !== name || existing.isFree !== isFree || existing.modelSource !== source) {
        await db.aiModel.update({ where: { modelId }, data: updates });
        updated++;
      } else {
        skipped++;
      }
    } else {
      // New model — insert with auto-classification
      await db.aiModel.create({
        data: {
          modelId,
          name,
          modelSource: source,
          provider: 'openai',
          endpoint: '/v1/chat/completions',
          isFree,
          isEnabled: true,
          description: apiModel.owned_by ? `Model by ${apiModel.owned_by}` : null,
        },
      });
      added++;
    }
  }

  return { added, updated, skipped, total: apiModels.length };
}

// ============================================================
// Route handler
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider'); // 'zen' | 'nvidia' | null (all)
    const providersToRefresh: string[] = provider ? [provider] : ['zen', 'nvidia'];

    const results: Record<string, RefreshResult> = {};
    const errors: Record<string, string> = {};

    for (const p of providersToRefresh) {
      try {
        let fetched: { models: RawModel[]; source: string };

        if (p === 'zen') {
          fetched = await fetchZenModels();
        } else if (p === 'nvidia') {
          fetched = await fetchNvidiaModels();
        } else {
          continue;
        }

        const upserted = await upsertModels(fetched.models, fetched.source);
        results[p] = upserted;

        // Post-classify: fix isFree for ALL models of this source using
        // naming conventions, including models that exist in the DB but
        // were NOT returned by the API (e.g. removed/renamed by provider).
        // Using raw SQL to avoid any ORM update-batching issue.
        let fixed = 0;
        if (p === 'zen') {
          fixed = await db.$executeRawUnsafe(
            `UPDATE AiModel SET isFree = CASE
              WHEN modelId = 'big-pickle' THEN 1
              WHEN modelId LIKE '%-free' THEN 1
              ELSE 0
            END
            WHERE modelSource = ? AND isFree <> CASE
              WHEN modelId = 'big-pickle' THEN 1
              WHEN modelId LIKE '%-free' THEN 1
              ELSE 0
            END`,
            fetched.source,
          );
        } else if (p === 'nvidia') {
          // NVIDIA free: models with 1-8B params (single-digit size before 'b')
          fixed = await db.$executeRawUnsafe(
            `UPDATE AiModel SET isFree = CASE
              WHEN modelId GLOB '*[-/][1-8]b[-/]*' OR modelId GLOB '*[-/][1-8]b' THEN 1
              ELSE 0
            END
            WHERE modelSource = ? AND isFree <> CASE
              WHEN modelId GLOB '*[-/][1-8]b[-/]*' OR modelId GLOB '*[-/][1-8]b' THEN 1
              ELSE 0
            END`,
            fetched.source,
          );
        }
        results[p].updated += fixed;
      } catch (err) {
        errors[p] = err instanceof Error ? err.message : 'Unknown error';
      }
    }

    // Return the full updated model list
    const allModels = await db.aiModel.findMany({
      orderBy: [{ modelSource: 'asc' }, { isFree: 'desc' }, { name: 'asc' }],
    });

    return NextResponse.json({
      models: allModels,
      results,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to refresh models',
        code: 'REFRESH_ERROR',
      },
      { status: 500 },
    );
  }
}
