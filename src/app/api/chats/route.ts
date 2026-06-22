import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

const CreateChatSchema = z.object({
  projectId: z.string().optional(),
  title: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateChatSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { projectId, title } = parsed.data;
    const isRandom = !projectId;

    const chat = await db.chat.create({
      data: {
        title: title ?? (isRandom ? 'New Chat' : 'New Project Chat'),
        projectId: projectId ?? null,
        isRandom,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50,
        },
      },
    });

    return NextResponse.json(chat, { status: 201 });
  } catch (error) {
    console.error('[/api/chats] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const isRandom = searchParams.get('isRandom');
    const limit = Math.min(Number(searchParams.get('limit') ?? '50'), 100);
    const cursor = searchParams.get('cursor');

    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId;
    if (isRandom === 'true') where.isRandom = true;
    else if (isRandom === 'false') where.isRandom = false;

    const chats = await db.chat.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
      },
    });

    const hasMore = chats.length > limit;
    const results = hasMore ? chats.slice(0, -1) : chats;
    const nextCursor = hasMore ? results[results.length - 1]?.id : null;

    return NextResponse.json({
      chats: results,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error('[/api/chats] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
