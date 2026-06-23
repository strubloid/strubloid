import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all') === 'true';

    const models = await db.aiModel.findMany({
      where: all ? undefined : { isEnabled: true },
      orderBy: [{ isFree: 'desc' }, { name: 'asc' }],
    });
    return NextResponse.json({ models });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load models', code: 'MODELS_LOAD_ERROR' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { updates } = body as { updates: { id: number; isEnabled: boolean }[] };

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: expected updates array', code: 'INVALID_REQUEST' },
        { status: 400 }
      );
    }

    for (const { id, isEnabled } of updates) {
      await db.aiModel.update({
        where: { id },
        data: { isEnabled },
      });
    }

    const models = await db.aiModel.findMany({
      orderBy: [{ isFree: 'desc' }, { name: 'asc' }],
    });

    return NextResponse.json({ models, updated: updates.length });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update models', code: 'MODELS_UPDATE_ERROR' },
      { status: 500 }
    );
  }
}
