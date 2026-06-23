/**
 * Tests for POST /api/chats/clean-random
 *
 * Verifies that:
 * - Random chats with messages get compacted into memory entries
 * - Empty random chats are skipped
 * - All random chats are deleted after compaction
 * - The response has correct counts
 * - Project chats are NOT affected
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { db } from '@/lib/db';

// Mock the AI to avoid real API calls during tests
vi.mock('@/ais/zen/ZenAI', () => {
  const mockCompactMemory = vi.fn().mockImplementation(
    async ({ chatMessages }: { chatMessages: { id: string; role: string; content: string }[] }) => {
      const fullText = chatMessages.map((m) => `${m.role}: ${m.content}`).join('\n');
      return {
        title: fullText.length > 80 ? fullText.slice(0, 77) + '...' : fullText,
        summary: `Summary of ${chatMessages.length} messages`,
        facts: fullText,
        preferences: null,
        sourceChatIds: chatMessages.map((m) => m.id),
        compactedCount: 1,
      };
    },
  );

  return {
    getZenAI: () => ({
      compactMemory: mockCompactMemory,
      refresh: vi.fn(),
      getProviderName: () => 'Zen AI',
      getStatus: vi.fn(),
    }),
  };
});

// Need to import after mocking — dynamic import inside tests
async function runCleanRandom() {
  const { POST } = await import('@/app/api/chats/clean-random/route');
  return POST();
}

describe('POST /api/chats/clean-random', () => {
  // Track created records for cleanup
  const createdChatIds: string[] = [];
  const createdMemoryIds: string[] = [];

  beforeAll(async () => {
    // Ensure we start clean for this test
    await db.message.deleteMany({ where: { chat: { isRandom: true } } });
    await db.chat.deleteMany({ where: { isRandom: true } });
    await db.memoryEntry.deleteMany({ where: { projectId: 'test-clean-random' } });

    // Create a project chat (should NOT be affected)
    const project = await db.project.create({
      data: {
        id: 'test-clean-project',
        name: 'Clean Test Project',
      },
    });

    const projectChat = await db.chat.create({
      data: {
        id: 'test-project-chat',
        title: 'Project Chat',
        projectId: project.id,
        isRandom: false,
      },
    });
    createdChatIds.push(projectChat.id);

    await db.message.create({
      data: {
        chatId: projectChat.id,
        role: 'user',
        content: 'This is a project chat message',
      },
    });
    await db.message.create({
      data: {
        chatId: projectChat.id,
        role: 'assistant',
        content: 'This is a response in a project chat',
      },
    });

    // Create random chats (should be cleaned)
    const randomChat1 = await db.chat.create({
      data: {
        id: 'test-random-chat-1',
        title: 'Random Chat 1',
        isRandom: true,
      },
    });
    createdChatIds.push(randomChat1.id);

    await db.message.create({
      data: {
        chatId: randomChat1.id,
        role: 'user',
        content: 'What is the capital of France?',
      },
    });
    await db.message.create({
      data: {
        chatId: randomChat1.id,
        role: 'assistant',
        content: 'The capital of France is Paris.',
      },
    });

    const randomChat2 = await db.chat.create({
      data: {
        id: 'test-random-chat-2',
        title: 'Random Chat 2',
        isRandom: true,
      },
    });
    createdChatIds.push(randomChat2.id);

    await db.message.create({
      data: {
        chatId: randomChat2.id,
        role: 'user',
        content: 'Tell me about JavaScript closures',
      },
    });
    await db.message.create({
      data: {
        chatId: randomChat2.id,
        role: 'assistant',
        content: 'A closure is a function that retains access to its parent scope.',
      },
    });

    // Create an empty random chat (should be skipped)
    const emptyRandomChat = await db.chat.create({
      data: {
        id: 'test-random-chat-empty',
        title: 'Empty Random Chat',
        isRandom: true,
      },
    });
    createdChatIds.push(emptyRandomChat.id);
  });

  afterAll(async () => {
    // Clean up test data
    await db.message.deleteMany({
      where: { chatId: { in: createdChatIds } },
    });
    await db.chat.deleteMany({
      where: { id: { in: createdChatIds } },
    });
    await db.memoryEntry.deleteMany({
      where: { id: { in: createdMemoryIds } },
    });
    // Delete memory entries created by compaction (they reference orig chat ids)
    const memories = await db.memoryEntry.findMany({
      where: {
        sourceChatIds: {
          contains: 'test-random-chat',
        },
      },
    });
    for (const m of memories) {
      await db.memoryEntry.delete({ where: { id: m.id } });
      createdMemoryIds.push(m.id);
    }
    await db.project.delete({ where: { id: 'test-clean-project' } }).catch(() => {});
  });

  it('compacts random chats into memory and deletes them', async () => {
    // Verify setup: 3 random chats + 1 project chat
    const beforeChats = await db.chat.findMany({
      where: { isRandom: true },
    });
    expect(beforeChats.length).toBe(3);

    // Run the clean
    const response = await runCleanRandom();
    const data = await response.json();

    // Assert response structure
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('compactedCount');
    expect(data).toHaveProperty('deletedCount');
    expect(data).toHaveProperty('entries');
    expect(data).toHaveProperty('message');

    // 2 random chats had messages -> compacted
    expect(data.compactedCount).toBe(2);
    // 1 random chat was empty -> skipped
    expect(data.skippedCount).toBe(1);
    // All 3 random chats deleted
    expect(data.deletedCount).toBe(3);

    // Verify entries have proper structure
    expect(data.entries.length).toBe(2);
    for (const entry of data.entries) {
      expect(entry).toHaveProperty('chatId');
      expect(entry).toHaveProperty('memoryEntryId');
      expect(entry).toHaveProperty('title');
      createdMemoryIds.push(entry.memoryEntryId);
    }

    // Verify: no random chats remain
    const afterChats = await db.chat.findMany({
      where: { isRandom: true },
    });
    expect(afterChats.length).toBe(0);

    // Verify: project chat still exists
    const projectChat = await db.chat.findUnique({
      where: { id: 'test-project-chat' },
    });
    expect(projectChat).not.toBeNull();
  });

  it('returns empty result when no random chats exist', async () => {
    // Should already be 0 random chats from previous test
    const response = await runCleanRandom();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.compactedCount).toBe(0);
    expect(data.deletedCount).toBe(0);
    expect(data.message).toBe('No random chats to clean');
  });

  it('allows sequential clean calls', async () => {
    // Create one more random chat
    const chat = await db.chat.create({
      data: {
        id: 'test-sequential-chat',
        title: 'Sequential Chat',
        isRandom: true,
      },
    });
    await db.message.create({
      data: {
        chatId: chat.id,
        role: 'user',
        content: 'Define recursion',
      },
    });
    await db.message.create({
      data: {
        chatId: chat.id,
        role: 'assistant',
        content: 'Recursion is when a function calls itself.',
      },
    });

    const response = await runCleanRandom();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.compactedCount).toBe(1);
    expect(data.deletedCount).toBe(1);

    if (data.entries[0]?.memoryEntryId) {
      createdMemoryIds.push(data.entries[0].memoryEntryId);
    }

    // Clean up created chat
    await db.message.deleteMany({ where: { chatId: chat.id } });
    await db.chat.delete({ where: { id: chat.id } }).catch(() => {});
  });
});
