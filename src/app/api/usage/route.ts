import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // Aggregate usage per model
    const perModel = await db.message.groupBy({
      by: ['modelUsed'],
      where: {
        modelUsed: { not: null },
        role: 'assistant',
      },
      _sum: {
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          totalTokens: 'desc',
        },
      },
      take: limit,
    });

    // Calculate total across all models
    const totals = perModel.reduce(
      (acc, m) => ({
        promptTokens: acc.promptTokens + (m._sum.promptTokens ?? 0),
        completionTokens: acc.completionTokens + (m._sum.completionTokens ?? 0),
        totalTokens: acc.totalTokens + (m._sum.totalTokens ?? 0),
        totalMessages: acc.totalMessages + m._count.id,
      }),
      { promptTokens: 0, completionTokens: 0, totalTokens: 0, totalMessages: 0 }
    );

    // Enrich with pricing from AiModel and calculate cost
    const modelIds = perModel.map((m) => m.modelUsed).filter(Boolean) as string[];
    const priceMap = new Map<string, { inputPrice: number | null; outputPrice: number | null; name: string }>();

    if (modelIds.length > 0) {
      const models = await db.aiModel.findMany({
        where: { modelId: { in: modelIds } },
        select: { modelId: true, name: true, inputPrice: true, outputPrice: true },
      });
      for (const m of models) {
        priceMap.set(m.modelId, { inputPrice: m.inputPrice, outputPrice: m.outputPrice, name: m.name });
      }
    }

    const enriched = perModel.map((m) => {
      const pricing = priceMap.get(m.modelUsed!) ?? { inputPrice: null, outputPrice: null, name: m.modelUsed! };
      const promptTokens = m._sum.promptTokens ?? 0;
      const completionTokens = m._sum.completionTokens ?? 0;
      const totalTokens = m._sum.totalTokens ?? 0;

      // inputPrice/outputPrice are $ per 1M tokens
      let cost = 0;
      if (pricing.inputPrice != null) {
        cost += (promptTokens / 1_000_000) * pricing.inputPrice;
      }
      if (pricing.outputPrice != null) {
        cost += (completionTokens / 1_000_000) * pricing.outputPrice;
      }

      const pct = totals.totalTokens > 0 ? (totalTokens / totals.totalTokens) * 100 : 0;

      return {
        modelId: m.modelUsed!,
        name: pricing.name,
        promptTokens,
        completionTokens,
        totalTokens,
        messageCount: m._count.id,
        cost: Math.round(cost * 1_000_000) / 1_000_000, // round to microdollar precision
        percentage: Math.round(pct * 10) / 10,
        inputPrice: pricing.inputPrice,
        outputPrice: pricing.outputPrice,
      };
    });

    return new Response(
      JSON.stringify({
        perModel: enriched,
        totals: {
          ...totals,
          totalCost: enriched.reduce((s, m) => s + m.cost, 0),
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[chat/usage] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch usage stats' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
