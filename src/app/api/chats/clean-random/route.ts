import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getZenAI } from '@/ais/zen/ZenAI';

export async function POST() {
  try {
    // Find all random chats that haven't been compacted+cleaned yet
    const randomChats = await db.chat.findMany({
      where: {
        isRandom: true,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (randomChats.length === 0) {
      return NextResponse.json({
        compactedCount: 0,
        deletedCount: 0,
        entries: [],
        message: 'No random chats to clean',
      });
    }

    const ai = getZenAI();
    const results: Array<{
      chatId: string;
      memoryEntryId?: string;
      title: string;
    }> = [];
    let skippedCount = 0;

    for (const chat of randomChats) {
      // Skip empty chats — nothing to compact
      if (chat.messages.length === 0) {
        skippedCount++;
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
            projectId: chat.projectId ?? null,
            title: result.title,
            summary: result.summary,
            facts: result.facts,
            preferences: result.preferences,
            sourceChatIds: JSON.stringify(result.sourceChatIds),
          },
        });

        results.push({
          chatId: chat.id,
          memoryEntryId: memoryEntry.id,
          title: result.title,
        });
      } catch (error) {
        console.error(
          `[/api/chats/clean-random] Error compacting chat ${chat.id}:`,
          error
        );
        // Still mark it for deletion — no point keeping a chat that failed to compact
        results.push({
          chatId: chat.id,
          title: '(compaction failed)',
        });
      }
    }

    // Delete all random chats (both compacted and empty ones)
    const deleteResult = await db.chat.deleteMany({
      where: {
        isRandom: true,
      },
    });

    return NextResponse.json({
      compactedCount: results.filter((r) => r.memoryEntryId).length,
      skippedCount,
      deletedCount: deleteResult.count,
      entries: results,
      message:
        results.length > 0
          ? `Compacted ${results.filter((r) => r.memoryEntryId).length} chats into memory, deleted ${deleteResult.count} random chats`
          : 'No random chats with messages to compact',
    });
  } catch (error) {
    console.error('[/api/chats/clean-random] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
