import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { searchGlobal } from '@/lib/search/global-search.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    const limit = Math.min(Number(searchParams.get('limit') ?? '20'), 50);

    if (!q || q.trim().length === 0) {
      return NextResponse.json({ results: [], chats: [], projects: [], memories: [], models: [] });
    }

    const payload = await searchGlobal(db, q, limit);
    return NextResponse.json(payload);
  } catch (error) {
    console.error('[/api/search] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
