import { NextResponse } from 'next/server';
import { getBigPickleAI } from '@/ais/big-pickle/BigPickleAI';

export async function GET() {
  try {
    const ai = getBigPickleAI();
    const status = ai.getStatus();
    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get AI status', code: 'AI_STATUS_ERROR' },
      { status: 500 }
    );
  }
}
