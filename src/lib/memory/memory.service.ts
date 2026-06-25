import { db } from '@/lib/db';
import { formatFactsForPrompt } from './memory.parsers';

/** Log prefix for memory service debug output */
const LOG_PREFIX = '[memory-service]';

export interface MemoryContextParams {
  /** The current user message (used for keyword search) */
  userMessage: string;
  /** Current chat ID to exclude from active random chat search */
  currentChatId?: string;
  /** Whether to include random chat context (active chats + compacted memory) */
  includeRandomChats?: boolean;
  /** Project ID for project-scoped brain memories */
  projectId?: string | null;
  /** Whether to include project brain memories */
  includeBrain?: boolean;
  /** Max number of memory entries/chat messages to include (combined) */
  maxItems?: number;
}

export interface MemoryContextResult {
  /** Formatted context block ready to inject into the system prompt */
  contextBlock: string;
  /** Stats for debug logging */
  stats: {
    activeRandomChatsFound: number;
    activeRandomMessagesFound: number;
    compactedMemoryEntriesFound: number;
    totalItemsInjected: number;
  };
}

/**
 * Build the full memory context block for the AI prompt.
 *
 * When `includeRandomChats` is true, searches BOTH:
 *   1. Active random chats (Chat with isRandom=true, excluding the current chat)
 *   2. Compacted random memory (MemoryEntry with projectId=null)
 *
 * When `includeBrain` is true, fetches project-scoped MemoryEntry.
 */
export async function buildMemoryContext(
  params: MemoryContextParams
): Promise<MemoryContextResult> {
  const maxItems = params.maxItems ?? 15;
  const items: string[] = [];
  const stats = {
    activeRandomChatsFound: 0,
    activeRandomMessagesFound: 0,
    compactedMemoryEntriesFound: 0,
    totalItemsInjected: 0,
  };

  // ── 1. Active random chats (when Randoms is ON) ──────────────
  if (params.includeRandomChats) {
    const activeRandomChats = await db.chat.findMany({
      where: {
        isRandom: true,
        ...(params.currentChatId ? { id: { not: params.currentChatId } } : {}),
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 6, // last 6 messages per chat — sufficient for context
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10, // look at the 10 most recent random chats
    });

    stats.activeRandomChatsFound = activeRandomChats.length;

    const seenMessages = new Set<string>();

    for (const chat of activeRandomChats) {
      // Only include chats with actual content
      if (chat.messages.length === 0) continue;

      // Collect user messages from this chat
      const userMessages = chat.messages
        .filter((m) => m.role === 'user')
        .map((m) => m.content)
        .filter((content) => {
          // Deduplicate identical messages
          const key = content.toLowerCase().trim();
          if (seenMessages.has(key)) return false;
          seenMessages.add(key);
          return true;
        });

      if (userMessages.length > 0) {
        stats.activeRandomMessagesFound += userMessages.length;
        items.push(
          `[From a previous random chat]\n${userMessages.join('\n')}`
        );
      }
    }
  }

  // ── 2. Compacted random memory (when Randoms is ON) ──────────
  if (params.includeRandomChats) {
    const compactedMemories = await db.memoryEntry.findMany({
      where: { projectId: null },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });

    stats.compactedMemoryEntriesFound = compactedMemories.length;

    for (const mem of compactedMemories) {
      const facts = formatFactsForPrompt(mem.facts);
      const block = [`[Compacted random chat memory — "${mem.title}"]`];
      block.push(`Summary: ${mem.summary}`);
      if (facts) {
        block.push(facts);
      }
      items.push(block.join('\n'));
    }
  }

  // ── Build the full context block ────────────────────────────
  const contextBlock =
    items.length > 0
      ? `\n\nRelevant saved memory:\n${items.join('\n\n')}\n\n` +
        'Instruction: Use the memory above when answering the user. ' +
        'If the user asks about data they shared or saved before, ' +
        'answer from this memory. Do NOT say you have no access to ' +
        'previous conversations — the memory above was provided to you.'
      : '';

  stats.totalItemsInjected = items.length;

  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log(`${LOG_PREFIX} Memory context built:`, {
      includeRandomChats: params.includeRandomChats,
      includeBrain: params.includeBrain,
      activeRandomChatsFound: stats.activeRandomChatsFound,
      activeRandomMessagesFound: stats.activeRandomMessagesFound,
      compactedMemoryEntriesFound: stats.compactedMemoryEntriesFound,
      totalItemsInjected: stats.totalItemsInjected,
    });
  }

  return { contextBlock, stats };
}
