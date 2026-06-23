import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getZenAI } from '@/ais/zen/ZenAI';
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
      // Send with model selection
      const config = await import('@/ais/zen/ZenConfig').then(m => m.loadZenConfig());
      const client = new (await import('@/ais/zen/ZenAIClient')).ZenAIClient(config);
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

    // Reload messages
    const messages = await db.message.findMany({
      where: { chatId: chat.id },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      response: aiResponse,
      chatId: chat.id,
      messages,
      model: aiResponse.model,
    });
  } catch (error) {
    console.error('[/api/chat/send] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
