import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getBigPickleAI } from '@/ais/big-pickle/BigPickleAI';

export async function POST() {
  try {
    const windowDays = Number(process.env.COMPACTION_WINDOW_DAYS ?? '30');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - windowDays);

    // Find random chats older than window that haven't been compacted
    const chatsToCompact = await db.chat.findMany({
      where: {
        isRandom: true,
        compactedAt: null,
        createdAt: {
          lt: cutoffDate,
        },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    const ai = getBigPickleAI();
    const results = [];

    for (const chat of chatsToCompact) {
      if (chat.messages.length === 0) {
        await db.chat.update({
          where: { id: chat.id },
          data: { compactedAt: new Date() },
        });
        continue;
      }

      const chatMessages = chat.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      }));

      try {
        const result = await ai.compactMemory({ chatMessages });

        const memoryEntry = await db.memoryEntry.create({
          data: {
            title: result.title,
            summary: result.summary,
            facts: result.facts,
            preferences: result.preferences,
            sourceChatIds: JSON.stringify(result.sourceChatIds),
          },
        });

        await db.chat.update({
          where: { id: chat.id },
          data: { compactedAt: new Date() },
        });

        results.push({
          chatId: chat.id,
          memoryEntryId: memoryEntry.id,
          title: result.title,
        });
      } catch (error) {
        console.error(`[/api/memory/compact] Error compacting chat ${chat.id}:`, error);
        // Continue with other chats
      }
    }

    return NextResponse.json({
      compactedCount: results.length,
      entries: results,
    });
  } catch (error) {
    console.error('[/api/memory/compact] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
