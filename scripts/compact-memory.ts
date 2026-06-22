/**
 * Memory Compaction Script
 *
 * Compacts random chats older than 30 days into memory entries.
 * These compacted entries can then be used as "AI Brain" context
 * for future conversations.
 *
 * Usage: npm run memory:compact
 */

import { PrismaClient } from '@prisma/client';
import { getBigPickleAI } from '../src/ais/big-pickle/BigPickleAI';

const db = new PrismaClient();

async function compactMemory() {
  const windowDays = Number(process.env.COMPACTION_WINDOW_DAYS ?? '30');
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - windowDays);

  console.log(
    `[memory:compact] Finding random chats older than ${windowDays} days (before ${cutoffDate.toISOString()})`
  );
  console.log(`[memory:compact] Window: ${windowDays} days`);

  try {
    // Find chats that are:
    // 1. Random chats (not attached to a project)
    // 2. Not yet compacted
    // 3. Older than the compaction window
    const chatsToCompact = await db.chat.findMany({
      where: {
        isRandom: true,
        compactedAt: null,
        createdAt: {
          lt: cutoffDate
        }
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (chatsToCompact.length === 0) {
      console.log('[memory:compact] No chats found to compact');
      return;
    }

    console.log(`[memory:compact] Found ${chatsToCompact.length} chats to compact`);

    const ai = getBigPickleAI();
    const results = [];

    for (const chat of chatsToCompact) {
      try {
        console.log(
          `[memory:compact] Processing chat ${chat.id} (${chat.messages?.length} messages)`
        );

        if (chat.messages.length === 0) {
          console.log(`[memory:compact] Chat ${chat.id} has no messages, skipping`);
          await db.chat.update({
            where: { id: chat.id },
            data: { compactedAt: new Date() }
          });
          continue;
        }

        const chatMessages = chat.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          createdAt: m.createdAt
        }));

        const result = await ai.compactMemory({ chatMessages });

        // Save the memory entry
        const memoryEntry = await db.memoryEntry.create({
          data: {
            title: result.title,
            summary: result.summary,
            facts: result.facts,
            preferences: result.preferences,
            sourceChatIds: JSON.stringify(result.sourceChatIds)
          }
        });

        // Mark the chat as compacted
        await db.chat.update({
          where: { id: chat.id },
          data: { compactedAt: new Date() }
        });

        results.push({
          chatId: chat.id,
          memoryEntryId: memoryEntry.id,
          title: result.title
        });

        console.log(
          `[memory:compact] Compacted chat ${chat.id} -> memory ${memoryEntry.id}: "${result.title}"`
        );
      } catch (error) {
        console.error(`[memory:compact] Error compacting chat ${chat.id}:`, error);
        // Continue with other chats
      }
    }

    console.log(`[memory:compact] Done. Compacted ${results.length} chats successfully`);
    console.log('[memory:compact] Summary:');
    for (const r of results) {
      console.log(`  - Chat ${r.chatId} -> Memory "${r.title}"`);
    }
  } catch (error) {
    console.error('[memory:compact] Fatal error:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

compactMemory().catch(console.error);
