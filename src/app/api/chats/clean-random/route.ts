import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getZenAI } from '@/ais/zen/ZenAI';

export async function POST() {
  try {
    // Find all random chats with their messages
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
        entry: null,
        message: 'No random chats to clean',
      });
    }

    // Separate populated chats from empty ones
    const populatedChats = randomChats.filter((c) => c.messages.length > 0);
    const emptyChats = randomChats.filter((c) => c.messages.length === 0);

    let memoryEntryId: string | null = null;
    let compactedTitle = '';

    if (populatedChats.length > 0) {
      // Collect ALL messages from ALL populated random chats into one batch
      const allMessages = populatedChats.flatMap((chat) =>
        chat.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          createdAt: m.createdAt,
        }))
      );

      const ai = getZenAI();

      try {
        // Compact ALL messages together into ONE aggregate summary
        const result = await ai.compactMemory({ chatMessages: allMessages });

        // Collect all source chat IDs
        const allSourceChatIds = populatedChats.map((c) => c.id);
        const allMessageIds = allMessages.map((m) => m.id);

        // Normalize fields for Prisma (facts is already string from compactMemory normalization)
        const entry = await db.memoryEntry.create({
          data: {
            projectId: null, // global — not scoped to a project
            title: result.title,
            summary: result.summary,
            facts: result.facts || '',
            preferences: result.preferences ?? null,
            sourceChatIds: JSON.stringify(allSourceChatIds),
          },
        });

        memoryEntryId = entry.id;
        compactedTitle = result.title;
      } catch (error) {
        console.error(
          '[/api/chats/clean-random] Error compacting random chats:',
          error
        );
        // Proceed with deletion even if compaction fails
      }
    }

    // Delete ALL random chats
    const deleteResult = await db.chat.deleteMany({
      where: {
        isRandom: true,
      },
    });

    return NextResponse.json({
      compactedCount: memoryEntryId ? populatedChats.length : 0,
      populatedChatsCount: populatedChats.length,
      emptyChatsCount: emptyChats.length,
      deletedCount: deleteResult.count,
      entry: memoryEntryId
        ? {
            id: memoryEntryId,
            title: compactedTitle,
            sourceChatCount: populatedChats.length,
          }
        : null,
      message:
        populatedChats.length > 0 && memoryEntryId
          ? `Compressed ${populatedChats.length} random chats into 1 memory entry ("${compactedTitle}") and deleted ${deleteResult.count} chats`
          : memoryEntryId === null && populatedChats.length > 0
            ? `Compaction failed, but ${deleteResult.count} chats were still deleted`
            : `Deleted ${deleteResult.count} empty random chats`,
    });
  } catch (error) {
    console.error('[/api/chats/clean-random] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
