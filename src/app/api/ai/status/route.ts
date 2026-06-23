import { NextResponse } from 'next/server';
import { getZenAI } from '@/ais/zen/ZenAI';

export async function GET() {
  try {
    const ai = getZenAI();
    const status = await ai.getStatus();
    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get AI status', code: 'AI_STATUS_ERROR' },
      { status: 500 }
    );
  }
}
