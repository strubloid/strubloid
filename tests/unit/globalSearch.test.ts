import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@/lib/db';
import { searchGlobal } from '@/lib/search/global-search.service';
import { normalizeSearchText } from '@/lib/search/search-normalize';

describe('global search', () => {
  const projectId = 'test-search-fatima-project';
  const randomChatId = 'test-search-fatima-random-chat';
  const projectChatId = 'test-search-fatima-project-chat';
  const memoryId = 'test-search-fatima-memory';

  beforeAll(async () => {
    await db.aiModel.upsert({
      where: { modelId: 'big-pickle' },
      update: {},
      create: { modelId: 'big-pickle', name: 'Big Pickle', provider: 'openai', modelSource: 'zen' },
    });

    await db.message.deleteMany({ where: { chatId: { in: [randomChatId, projectChatId] } } });
    await db.chat.deleteMany({ where: { id: { in: [randomChatId, projectChatId] } } });
    await db.memoryEntry.deleteMany({ where: { id: memoryId } });
    await db.project.deleteMany({ where: { id: projectId } });

    await db.project.create({
      data: {
        id: projectId,
        name: 'Fátima research project',
        description: 'A project description for accent-insensitive search',
        isStarred: true,
      },
    });

    await db.chat.create({
      data: { id: randomChatId, title: 'Random Fátima note', isRandom: true },
    });
    await db.message.create({
      data: { chatId: randomChatId, role: 'user', content: 'fátima likes green' },
    });

    await db.chat.create({
      data: { id: projectChatId, title: 'Project planning chat', projectId, isRandom: false },
    });
    await db.message.create({
      data: { chatId: projectChatId, role: 'assistant', content: 'fatima is part of this project memory' },
    });

    await db.memoryEntry.create({
      data: {
        id: memoryId,
        projectId: null,
        title: 'Compacted random memory',
        summary: 'Fátima was mentioned in a compacted random chat',
        facts: 'Saved fact: fatima likes green',
        sourceChatIds: JSON.stringify([randomChatId]),
      },
    });
  });

  afterAll(async () => {
    await db.message.deleteMany({ where: { chatId: { in: [randomChatId, projectChatId] } } });
    await db.chat.deleteMany({ where: { id: { in: [randomChatId, projectChatId] } } });
    await db.memoryEntry.deleteMany({ where: { id: memoryId } });
    await db.project.deleteMany({ where: { id: projectId } });
  });

  it('normalizes accents, case, and surrounding whitespace', () => {
    expect(normalizeSearchText('Fátima')).toBe('fatima');
    expect(normalizeSearchText('FATIMA')).toBe('fatima');
    expect(normalizeSearchText('  João  ')).toBe('joao');
  });

  it.each(['fátima', 'fatima', 'FATIMA', 'fati'])('returns projects, chats, messages, and memories for %s', async (query) => {
    const result = await searchGlobal(db, query, 20);
    const byType = new Set(result.results.map((item) => item.type));

    expect(byType.has('project')).toBe(true);
    expect(byType.has('chat')).toBe(true);
    expect(byType.has('message')).toBe(true);
    expect(byType.has('memory')).toBe(true);
    expect(result.projects.some((project) => project.id === projectId)).toBe(true);
    expect(result.chats.some((chat) => chat.id === randomChatId || chat.id === projectChatId)).toBe(true);
    expect(result.memories.some((memory) => memory.id === memoryId)).toBe(true);
  });

  it('finds message content without requiring a title match', async () => {
    const result = await searchGlobal(db, 'green', 20);

    expect(result.results.some((item) => item.type === 'message' && item.href === `/chat/${randomChatId}`)).toBe(true);
    expect(result.results.some((item) => item.type === 'memory' && item.id === memoryId)).toBe(true);
  });

  it('finds compacted memory content', async () => {
    const result = await searchGlobal(db, 'compacted', 20);

    expect(result.results.some((item) => item.type === 'memory' && item.id === memoryId)).toBe(true);
  });
});
