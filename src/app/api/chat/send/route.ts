import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getZenAI } from '@/ais/zen/ZenAI';
import { getClientForModel } from '@/ais/getProviderClient';
import { AIProviderError } from '@/ais/AIProviderError';
import { buildMemoryContext } from '@/lib/memory/memory.service';

const SendMessageSchema = z.object({
  chatId: z.string().optional(),
  projectId: z.string().optional(),
  message: z.string().min(1).max(10000),
  modelId: z.string().optional(),
  useAiBrain: z.boolean().optional().default(false),
  useRandomChats: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = SendMessageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const {
      chatId: existingChatId,
      projectId,
      message,
      modelId,
      useAiBrain,
      useRandomChats,
    } = parsed.data;

    const ai = getZenAI();

    // ── Resolve chat ──────────────────────────────────────────
    let chat;
    if (existingChatId) {
      chat = await db.chat.findUnique({
        where: { id: existingChatId },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });

      if (!chat) {
        return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
      }

      if (modelId) {
        await db.chat.update({
          where: { id: chat.id },
          data: { selectedModelId: modelId },
        });
        chat.selectedModelId = modelId;
      }
    } else {
      const isRandom = !projectId;
      const title = message.slice(0, 50) + (message.length > 50 ? '...' : '');

      chat = await db.chat.create({
        data: {
          title,
          projectId: projectId ?? null,
          isRandom,
          useAiBrain,
          useRandomChats,
          selectedModelId: modelId ?? 'big-pickle',
        },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
    }

    // ── Save user message ─────────────────────────────────────
    await db.message.create({
      data: {
        chatId: chat.id,
        role: 'user',
        content: message,
      },
    });

    // ── Get all messages for AI context ──────────────────────
    const allMessages = await db.message.findMany({
      where: { chatId: chat.id },
      orderBy: { createdAt: 'asc' },
    });

    // ── Build brain memory context (project-scoped) ───────────
    let brainContext = '';
    if (useAiBrain) {
      const memoryWhere = chat.projectId
        ? { projectId: chat.projectId }
        : {};
      const memories = await db.memoryEntry.findMany({
        where: memoryWhere,
        orderBy: { updatedAt: 'desc' },
        take: 10,
      });
      if (memories.length > 0) {
        const formatted = memories.map((m) => {
          const facts = parseFactsForPrompt(m.facts);
          return `[Project memory — "${m.title}"]\nSummary: ${m.summary}${facts ? '\n' + facts : ''}`;
        });
        brainContext = `\n\nProject memories:\n${formatted.join('\n\n')}`;
      }
    }

    // ── Build random chat context (active chats + compacted) ──
    let randomContext = '';
    let memoryStats = {
      activeRandomChatsFound: 0,
      activeRandomMessagesFound: 0,
      compactedMemoryEntriesFound: 0,
      totalItemsInjected: 0,
    };

    if (useRandomChats) {
      const result = await buildMemoryContext({
        userMessage: message,
        currentChatId: chat.id,
        includeRandomChats: true,
      });
      memoryStats = result.stats;
      randomContext = result.contextBlock;
    }

    // ── Combine all context ──────────────────────────────────
    const fullContext = brainContext + randomContext;

    // ── Build AI messages ─────────────────────────────────────
    const aiMessages = allMessages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));

    // ── Determine model ───────────────────────────────────────
    const activeModelId = modelId || chat.selectedModelId || 'big-pickle';

    // ── Debug log ─────────────────────────────────────────────
    if (process.env.NODE_ENV === 'development') {
      console.log('[chat/send] Memory context:', {
        chatId: chat.id,
        projectId: chat.projectId,
        useAiBrain,
        useRandomChats,
        activeRandomChatsFound: memoryStats.activeRandomChatsFound,
        activeRandomMessagesFound: memoryStats.activeRandomMessagesFound,
        compactedMemoryEntriesFound: memoryStats.compactedMemoryEntriesFound,
        brainMemoriesFound: brainContext ? brainContext.split('\n\n').filter(l => l.startsWith('[Project memory')).length : 0,
        contextInjected: fullContext.length > 0,
        contextLength: fullContext.length,
      });
    }

    // ── Call AI ──────────────────────────────────────────────
    let aiResponse;
    try {
      const { client } = await getClientForModel(activeModelId);
      aiResponse = await client.sendMessage({
        messages: aiMessages,
        useAiBrain: useAiBrain || useRandomChats, // activate memory handling in client
        brainMemories: fullContext ? [fullContext] : [], // pass combined context
      }, activeModelId);
    } catch (error) {
      await db.message.create({
        data: {
          chatId: chat.id,
          role: 'assistant',
          content:
            error instanceof AIProviderError
              ? `AI Provider Error: ${error.message}`
              : 'An unexpected error occurred',
        },
      });

      if (error instanceof AIProviderError) {
        return NextResponse.json(
          {
            error: error.message,
            code: error.code,
            isRetryable: error.isRetryable,
          },
          { status: 502 }
        );
      }
      return NextResponse.json({ error: 'AI request failed' }, { status: 502 });
    }

    // ── Save assistant response ──────────────────────────────
    await db.message.create({
      data: {
        chatId: chat.id,
        role: 'assistant',
        content: aiResponse.content,
      },
    });

    // ── Auto-save brain memory for project chats ─────────────
    if (chat.projectId) {
      const title =
        message.length > 80 ? message.slice(0, 77) + '...' : message;
      const summary =
        aiResponse.content.length > 300
          ? aiResponse.content.slice(0, 297) + '...'
          : aiResponse.content;
      await db.memoryEntry
        .create({
          data: {
            projectId: chat.projectId,
            title,
            summary,
            facts: message,
            preferences: null,
            sourceChatIds: JSON.stringify([chat.id]),
          },
        })
        .catch((err) => {
          console.error('[/api/chat/send] Failed to save brain memory:', err);
        });
    }

    // ── Return full chat ─────────────────────────────────────
    const fullChat = await db.chat.findUnique({
      where: { id: chat.id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return NextResponse.json(fullChat);
  } catch (error) {
    console.error('[/api/chat/send] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** Parse facts string for readable display in AI context */
function parseFactsForPrompt(facts: string | null | undefined): string {
  if (!facts) return '';
  try {
    const parsed = JSON.parse(facts);
    if (Array.isArray(parsed)) {
      return parsed.filter(Boolean).map((f) => `- ${f}`).join('\n');
    }
  } catch {
    // Not JSON — use as-is
  }
  return facts;
}
