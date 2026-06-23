import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const models = await db.aiModel.findMany({
      where: { isEnabled: true },
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
