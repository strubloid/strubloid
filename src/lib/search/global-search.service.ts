import type { PrismaClient } from '@prisma/client';
import { normalizeSearchText } from './search-normalize';
import type { GlobalSearchResponse, GlobalSearchResult } from './search.types';

type SearchChat = {
  id: string;
  title: string;
  updatedAt: Date;
  isRandom: boolean;
  projectId: string | null;
  href: string;
  score: number;
  snippet?: string;
};

function scoreMatch(query: string, title: string, content = '', base = 0): number {
  const normalizedTitle = normalizeSearchText(title);
  const normalizedContent = normalizeSearchText(content);

  if (normalizedTitle === query) return base + 100;
  if (normalizedTitle.startsWith(query)) return base + 70;
  if (normalizedTitle.includes(query)) return base + 50;
  if (normalizedContent.includes(query)) return base + 30;
  return 0;
}

function includesQuery(query: string, ...values: Array<string | null | undefined>): boolean {
  return values.some((value) => normalizeSearchText(value ?? '').includes(query));
}

function buildSnippet(raw: string | null | undefined, query: string, fallback: string): string {
  const value = raw?.trim() || fallback;
  const normalizedValue = normalizeSearchText(value);
  const index = normalizedValue.indexOf(query);

  if (index < 0) return value.length > 180 ? `${value.slice(0, 177)}...` : value;

  const start = Math.max(0, index - 60);
  const end = Math.min(value.length, index + query.length + 90);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < value.length ? '...' : '';
  return `${prefix}${value.slice(start, end)}${suffix}`;
}

function sortAndLimit<T extends { score: number }>(items: T[], limit: number): T[] {
  return items.sort((a, b) => b.score - a.score).slice(0, limit);
}

export async function searchGlobal(db: PrismaClient, rawQuery: string, limit: number): Promise<GlobalSearchResponse> {
  const query = normalizeSearchText(rawQuery);

  if (!query) {
    return { results: [], projects: [], chats: [], memories: [], models: [] };
  }

  const [projectCandidates, chatCandidates, messageCandidates, memoryCandidates, modelCandidates] =
    await Promise.all([
      db.project.findMany({
        orderBy: [{ isStarred: 'desc' }, { updatedAt: 'desc' }],
        include: { _count: { select: { chats: true } } },
      }),
      db.chat.findMany({
        orderBy: { updatedAt: 'desc' },
        include: { project: { select: { name: true } } },
      }),
      db.message.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          chat: {
            select: {
              id: true,
              title: true,
              isRandom: true,
              projectId: true,
              project: { select: { name: true } },
            },
          },
        },
      }),
      db.memoryEntry.findMany({
        orderBy: { updatedAt: 'desc' },
      }),
      db.aiModel.findMany({
        orderBy: [{ isEnabled: 'desc' }, { name: 'asc' }],
      }),
    ]);

  const projects = sortAndLimit(
    projectCandidates
      .filter((project) => includesQuery(query, project.name, project.description))
      .map((project) => ({
        id: project.id,
        name: project.name,
        description: project.description,
        color: project.color,
        isStarred: project.isStarred,
        chatCount: project._count.chats,
        href: `/projects/${project.id}`,
        score:
          scoreMatch(query, project.name, project.description ?? '', 10) + (project.isStarred ? 10 : 0),
      })),
    limit,
  );

  const chatMatches: SearchChat[] = chatCandidates
    .filter((chat) => includesQuery(query, chat.title, chat.project?.name))
    .map((chat) => ({
      id: chat.id,
      title: chat.title,
      updatedAt: chat.updatedAt,
      isRandom: chat.isRandom,
      projectId: chat.projectId,
      href: `/chat/${chat.id}`,
      score: scoreMatch(query, chat.title, chat.project?.name ?? '', 8),
    }));

  const messageMatches = messageCandidates
    .filter((message) => includesQuery(query, message.content, message.chat.title, message.chat.project?.name))
    .map((message) => ({
      id: message.id,
      chatId: message.chatId,
      title: message.chat.title,
      role: message.role,
      isRandom: message.chat.isRandom,
      projectId: message.chat.projectId,
      href: `/chat/${message.chatId}`,
      snippet: buildSnippet(message.content, query, message.content),
      score: scoreMatch(query, message.chat.title, message.content, 6),
    }));

  const chatMap = new Map<string, SearchChat>();
  for (const chat of chatMatches) chatMap.set(chat.id, chat);
  for (const message of messageMatches) {
    const existing = chatMap.get(message.chatId);
    if (!existing || message.score > existing.score) {
      chatMap.set(message.chatId, {
        id: message.chatId,
        title: message.title,
        updatedAt: new Date(0),
        isRandom: message.isRandom,
        projectId: message.projectId,
        href: message.href,
        snippet: message.snippet,
        score: message.score,
      });
    }
  }
  const chats = sortAndLimit(Array.from(chatMap.values()), limit);

  const memories = sortAndLimit(
    memoryCandidates
      .filter((memory) => includesQuery(query, memory.title, memory.summary, memory.facts, memory.preferences))
      .map((memory) => ({
        id: memory.id,
        title: memory.title,
        projectId: memory.projectId,
        href: memory.projectId ? `/projects/${memory.projectId}` : '/settings',
        snippet: buildSnippet(
          [memory.summary, memory.facts, memory.preferences].filter(Boolean).join(' '),
          query,
          memory.summary,
        ),
        score: scoreMatch(query, memory.title, `${memory.summary} ${memory.facts} ${memory.preferences ?? ''}`, 4),
      })),
    limit,
  );

  const models = sortAndLimit(
    modelCandidates
      .filter((model) =>
        includesQuery(
          query,
          model.modelId,
          model.name,
          model.provider,
          model.modelSource,
          model.description,
        ),
      )
      .map((model) => ({
        id: String(model.id),
        modelId: model.modelId,
        name: model.name,
        provider: model.provider,
        modelSource: model.modelSource,
        href: '/settings',
        score: scoreMatch(query, model.name, `${model.modelId} ${model.provider} ${model.modelSource} ${model.description ?? ''}`, 2),
      })),
    limit,
  );

  const results: GlobalSearchResult[] = sortAndLimit(
    [
      ...projects.map((project) => ({
        id: project.id,
        type: 'project' as const,
        title: project.name,
        subtitle: `${project.chatCount} chat${project.chatCount === 1 ? '' : 's'}${project.isStarred ? ' · starred' : ''}`,
        snippet: project.description ?? 'Project name matched',
        href: project.href,
        score: project.score,
        metadata: { color: project.color, isStarred: project.isStarred },
      })),
      ...chats.map((chat) => ({
        id: chat.id,
        type: 'chat' as const,
        title: chat.title,
        subtitle: chat.isRandom ? 'Random chat' : 'Project chat',
        snippet: chat.snippet ?? 'Chat title matched',
        href: chat.href,
        score: chat.score,
        metadata: { projectId: chat.projectId, isRandom: chat.isRandom },
      })),
      ...messageMatches.map((message) => ({
        id: message.id,
        type: 'message' as const,
        title: message.title,
        subtitle: `${message.role} message`,
        snippet: message.snippet,
        href: message.href,
        score: message.score,
        metadata: { chatId: message.chatId, projectId: message.projectId, isRandom: message.isRandom },
      })),
      ...memories.map((memory) => ({
        id: memory.id,
        type: 'memory' as const,
        title: memory.title,
        subtitle: memory.projectId ? 'Project brain memory' : 'Compacted random memory',
        snippet: memory.snippet,
        href: memory.href,
        score: memory.score,
        metadata: { projectId: memory.projectId },
      })),
      ...models.map((model) => ({
        id: model.id,
        type: 'model' as const,
        title: model.name,
        subtitle: `${model.modelSource} · ${model.provider}`,
        snippet: model.modelId,
        href: model.href,
        score: model.score,
        metadata: { modelId: model.modelId, modelSource: model.modelSource },
      })),
    ],
    limit * 3,
  );

  return { results, projects, chats, memories, models };
}
