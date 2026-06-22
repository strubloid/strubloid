import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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
