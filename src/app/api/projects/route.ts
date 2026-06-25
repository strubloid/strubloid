import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  localPath: z.string().optional(),
  skills: z.string().optional(),
  aiPatterns: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateProjectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { name, description, color } = parsed.data;

    const project = await db.project.create({
      data: {
        name,
        description,
        color,
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('[/api/projects] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const starred = searchParams.get('starred');
    const limit = Math.min(Number(searchParams.get('limit') ?? '50'), 100);

    const where: Record<string, unknown> = {};
    if (starred === 'true') where.isStarred = true;

    const projects = await db.project.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: {
        _count: {
          select: { chats: true },
        },
        chats: {
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
      },
    });

    return NextResponse.json({
      projects: projects.map((p) => ({
        ...p,
        chatCount: p._count.chats,
        lastChat: p.chats[0] ?? null,
      })),
    });
  } catch (error) {
    console.error('[/api/projects] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
