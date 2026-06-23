import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getZenAI } from '@/ais/zen/ZenAI';
import { getClientForModel } from '@/ais/getProviderClient';
import { AIProviderError } from '@/ais/AIProviderError';

const SendMessageSchema = z.object({
  chatId: z.string().optional(),
  projectId: z.string().optional(),
  message: z.string().min(1).max(10000),
  modelId: z.string().optional(),
  useAiBrain: z.boolean().optional().default(false),
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

    const { chatId: existingChatId, projectId, message, modelId, useAiBrain } = parsed.data;

    const ai = getZenAI();

    // Get or create chat
    let chat;
    if (existingChatId) {
      chat = await db.chat.findUnique({
        where: { id: existingChatId },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });

      if (!chat) {
        return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
      }

      // Update selected model if provided
      if (modelId) {
        await db.chat.update({
          where: { id: chat.id },
          data: { selectedModelId: modelId },
        });
        chat.selectedModelId = modelId;
      }
    } else {
      // Create new chat
      const isRandom = !projectId;
      const title = message.slice(0, 50) + (message.length > 50 ? '...' : '');

      chat = await db.chat.create({
        data: {
          title,
          projectId: projectId ?? null,
          isRandom,
          useAiBrain,
          selectedModelId: modelId ?? 'big-pickle',
        },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
    }

    // Add user message
    await db.message.create({
      data: {
        chatId: chat.id,
        role: 'user',
        content: message,
      },
    });

    // Get all messages for AI context
    const allMessages = await db.message.findMany({
      where: { chatId: chat.id },
      orderBy: { createdAt: 'asc' },
    });

    // Get brain memories if enabled
    let brainMemories: string[] = [];
    if (useAiBrain) {
      const memories = await db.memoryEntry.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 10,
      });
      brainMemories = memories.map((m) => `${m.title}: ${m.summary} ${m.facts}`);
    }

    // Build AI messages
    const aiMessages = allMessages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));

    // Determine model to use
    const activeModelId = modelId || chat.selectedModelId || 'big-pickle';

    // Call AI
    let aiResponse;
    try {
      // Send with model selection — use provider dispatcher
      const { client } = await getClientForModel(activeModelId);
      aiResponse = await client.sendMessage({
        messages: aiMessages,
        useAiBrain,
        brainMemories,
      }, activeModelId);
    } catch (error) {
      // Save failed message with error marker
      await db.message.create({
        data: {
          chatId: chat.id,
          role: 'assistant',
          content: error instanceof AIProviderError
            ? `AI Provider Error: ${error.message}`
            : 'An unexpected error occurred',
        },
      });

      if (error instanceof AIProviderError) {
        return NextResponse.json(
          { error: error.message, code: error.code, isRetryable: error.isRetryable },
          { status: 502 }
        );
      }
      return NextResponse.json({ error: 'AI request failed' }, { status: 502 });
    }

    // Save assistant response
    await db.message.create({
      data: {
        chatId: chat.id,
        role: 'assistant',
        content: aiResponse.content,
      },
    });

    // Auto-save brain memory from this exchange when brain is on
    if (useAiBrain) {
      const title = message.length > 80 ? message.slice(0, 77) + '...' : message;
      const summary = aiResponse.content.length > 300
        ? aiResponse.content.slice(0, 297) + '...'
        : aiResponse.content;
      await db.memoryEntry.create({
        data: {
          title,
          summary,
          facts: message,
          preferences: null,
          sourceChatIds: JSON.stringify([chat.id]),
        },
      }).catch((err) => {
        console.error('[/api/chat/send] Failed to save brain memory:', err);
      });
    }

    // Return full chat object (same shape as GET /api/chats/[id])
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
