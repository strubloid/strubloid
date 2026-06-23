import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const message = await db.message.findUnique({ where: { id } });
    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    await db.message.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[/api/messages/[id]] DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
