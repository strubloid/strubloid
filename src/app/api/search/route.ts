import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    const limit = Math.min(Number(searchParams.get('limit') ?? '20'), 50);

    if (!q || q.trim().length === 0) {
      return NextResponse.json({ chats: [], projects: [] });
    }

    const query = q.trim();

    // Search random chats: title match OR message content match
    const chatsByTitle = await db.chat.findMany({
      where: {
        isRandom: true,
        title: { contains: query },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });

    const chatsByContent = await db.chat.findMany({
      where: {
        isRandom: true,
        messages: {
          some: {
            content: { contains: query },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });

    // Merge and deduplicate chats
    const chatMap = new Map<string, typeof chatsByTitle[0]>();
    for (const chat of [...chatsByTitle, ...chatsByContent]) {
      if (!chatMap.has(chat.id)) {
        chatMap.set(chat.id, chat);
      }
    }

    // Search projects: name match OR any of their chats' messages contain the query
    const projectsByName = await db.project.findMany({
      where: {
        name: { contains: query },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: {
        _count: { select: { chats: true } },
        chats: {
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
      },
    });

    const projectsByChatContent = await db.project.findMany({
      where: {
        chats: {
          some: {
            messages: {
              some: {
                content: { contains: query },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: {
        _count: { select: { chats: true } },
        chats: {
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
      },
    });

    // Merge and deduplicate projects
    const projectMap = new Map<string, (typeof projectsByName)[0]>();
    for (const project of [...projectsByName, ...projectsByChatContent]) {
      if (!projectMap.has(project.id)) {
        projectMap.set(project.id, project);
      }
    }

    // Also search project chat titles where the project name doesn't match
    // but the chat title does (for expanded project context)
    const chatsByProjectMatch = await db.chat.findMany({
      where: {
        projectId: { not: null },
        title: { contains: query },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });

    // For project chat title matches, also include their projects
    if (chatsByProjectMatch.length > 0) {
      const projectIds = [...new Set(chatsByProjectMatch.map((c) => c.projectId).filter(Boolean))];
      const projectsFromChats = await db.project.findMany({
        where: { id: { in: projectIds as string[] } },
        include: {
          _count: { select: { chats: true } },
          chats: {
            orderBy: { updatedAt: 'desc' },
            take: 1,
          },
        },
      });
      for (const project of projectsFromChats) {
        if (!projectMap.has(project.id)) {
          projectMap.set(project.id, project);
        }
      }
    }

    return NextResponse.json({
      chats: Array.from(chatMap.values()),
      projects: Array.from(projectMap.values()).map((p) => ({
        ...p,
        chatCount: p._count.chats,
        lastChat: p.chats[0] ?? null,
      })),
    });
  } catch (error) {
    console.error('[/api/search] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
