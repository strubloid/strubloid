import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const CreateMemorySchema = z.object({
  title: z.string().min(1).max(200),
  summary: z.string().min(1).max(2000),
  facts: z.string().max(5000).optional().default(''),
  preferences: z.string().nullable().optional(),
  sourceChatIds: z.array(z.string()).optional().default([]),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit') ?? '50'), 100);
    const cursor = searchParams.get('cursor');

    const memories = await db.memoryEntry.findMany({
      orderBy: { updatedAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = memories.length > limit;
    const results = hasMore ? memories.slice(0, -1) : memories;
    const nextCursor = hasMore ? results[results.length - 1]?.id : null;

    return NextResponse.json({
      memories: results,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error('[/api/memory] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateMemorySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { title, summary, facts, preferences, sourceChatIds } = parsed.data;

    const memory = await db.memoryEntry.create({
      data: {
        title,
        summary,
        facts: facts || '',
        preferences: preferences ?? null,
        sourceChatIds: JSON.stringify(sourceChatIds),
      },
    });

    return NextResponse.json(memory, { status: 201 });
  } catch (error) {
    console.error('[/api/memory] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
