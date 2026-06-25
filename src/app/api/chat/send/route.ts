import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getClientForModel } from '@/ais/getProviderClient';
import { AIProviderError } from '@/ais/AIProviderError';
import { buildMemoryContext } from '@/lib/memory/memory.service';
import { formatFactsForPrompt } from '@/lib/memory/memory.parsers';
import type { StreamEvent } from '@/ais/AIResponse';

const SendMessageSchema = z.object({
  chatId: z.string().optional(),
  projectId: z.string().optional(),
  message: z.string().min(1).max(10000),
  modelId: z.string().optional(),
  useAiBrain: z.boolean().optional().default(false),
  useRandomChats: z.boolean().optional().default(false),
  brainProjectId: z.string().nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = SendMessageSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid request', details: parsed.error.issues }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const {
      chatId: existingChatId,
      projectId,
      message,
      modelId,
      useAiBrain,
      useRandomChats,
      brainProjectId,
    } = parsed.data;

    // ── Resolve chat (single read, no re-reads later) ─────────
    let chat;
    if (existingChatId) {
      chat = await db.chat.findUnique({
        where: { id: existingChatId },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });

      if (!chat) {
        return new Response(
          JSON.stringify({ error: 'Chat not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
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
      const words = message.split(/\s+/).filter(Boolean);
      const title = words.length > 6
        ? words.slice(0, 6).join(' ') + '...'
        : message;

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
    const userMsg = await db.message.create({
      data: {
        chatId: chat.id,
        role: 'user',
        content: message,
      },
    });

    // ── Build in-memory messages — NO re-read ────────────────
    const allMessages = [...chat.messages, userMsg];

    // ── Build contexts in parallel (Phase 3.5) ────────────────
    const [brainContext, randomResult] = await Promise.all([
      useAiBrain ? buildBrainContext(brainProjectId ?? chat.projectId) : Promise.resolve(''),
      useRandomChats
        ? buildMemoryContext({
            userMessage: message,
            currentChatId: chat.id,
            includeRandomChats: true,
          })
        : Promise.resolve({ contextBlock: '', stats: { activeRandomChatsFound: 0, activeRandomMessagesFound: 0, compactedMemoryEntriesFound: 0, totalItemsInjected: 0 } }),
    ]);

    const fullContext = brainContext + randomResult.contextBlock;
    const memoryStats = randomResult.stats;

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
        brainMemoriesFound: brainContext ? brainContext.split('\n\n').filter((l: string) => l.startsWith('[Project memory')).length : 0,
        contextInjected: fullContext.length > 0,
        contextLength: fullContext.length,
      });
    }

    // ── Get client + model (single lookup, cached config) ────
    let clientModel;
    try {
      clientModel = await getClientForModel(activeModelId);
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Failed to initialize AI client' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { client, model: modelInfo } = clientModel;

    // ── Setup abort bridging ─────────────────────────────────
    const providerAbortController = new AbortController();
    const onAbort = () => providerAbortController.abort();
    request.signal.addEventListener('abort', onAbort, { once: true });

    // ── Create SSE stream ─────────────────────────────────────
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const write = (event: StreamEvent) => {
          if (!request.signal.aborted) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          }
        };

        try {
          // ── Phase: warming up / context built ──────────────
          write({ type: 'phase', phase: 'context-building' });
          write({ type: 'phase', phase: 'model-selected', modelName: modelInfo?.name ?? activeModelId });
          write({ type: 'phase', phase: 'token-start' });

          // ── Stream from provider ───────────────────────────
          let fullContent = '';
          let usedModel = activeModelId;

          try {
            const gen = client.streamMessage(
              {
                messages: aiMessages,
                useAiBrain: useAiBrain || useRandomChats,
                brainMemories: fullContext ? [fullContext] : [],
              },
              activeModelId,
              modelInfo
                ? {
                    modelId: modelInfo.modelId,
                    name: modelInfo.name,
                    endpoint: modelInfo.endpoint,
                    provider: modelInfo.provider,
                  }
                : undefined,
              providerAbortController.signal
            );

            for await (const event of gen) {
              if (event.type === 'delta') {
                fullContent += event.delta ?? '';
                write(event);
              } else if (event.type === 'error') {
                write(event);
                // Save partial content as error message
                await db.message.create({
                  data: {
                    chatId: chat.id,
                    role: 'assistant',
                    content: event.error || 'An error occurred during generation',
                  },
                });
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                controller.close();
                return;
              } else if (event.type === 'done') {
                fullContent = event.full ?? fullContent;
                usedModel = event.model ?? usedModel;
                write(event);
              }
            }
          } catch (streamError) {
            // Stream itself threw — persist error message
            const errMsg = streamError instanceof AIProviderError
              ? streamError.message
              : 'An unexpected error occurred during streaming';
            await db.message.create({
              data: {
                chatId: chat.id,
                role: 'assistant',
                content: errMsg,
              },
            });
            write({ type: 'error', error: errMsg });
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
            return;
          }

          // ── Persist assistant response (post-stream) ──────
          let assistantMsg;
          try {
            assistantMsg = await db.message.create({
              data: {
                chatId: chat.id,
                role: 'assistant',
                content: fullContent,
              },
            });
          } catch (persistError) {
            console.error('[chat/send] Failed to persist assistant message:', persistError);
            write({ type: 'error', error: 'Failed to save response' });
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
            return;
          }

          // ── Fire-and-forget: auto-save brain memory ───────
          const memProjectId = chat.projectId || brainProjectId;
          if (memProjectId && fullContent) {
            const memTitle = message.length > 80 ? message.slice(0, 77) + '...' : message;
            const memSummary = fullContent.length > 300 ? fullContent.slice(0, 297) + '...' : fullContent;
            db.memoryEntry
              .create({
                data: {
                  projectId: memProjectId,
                  title: memTitle,
                  summary: memSummary,
                  facts: message,
                  preferences: null,
                  sourceChatIds: JSON.stringify([chat.id]),
                },
              })
              .catch((err: Error) => {
                console.error('[chat/send] Failed to save brain memory:', err);
              });
          }

          // ── Send final done with assistantId ──────────────
          write({
            type: 'done',
            full: fullContent,
            model: usedModel,
            assistantId: assistantMsg.id,
          });
        } catch (err) {
          // Unhandled error in stream setup
          if (!request.signal.aborted) {
            write({ type: 'error', error: 'Internal server error' });
          }
        } finally {
          if (!request.signal.aborted) {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          }
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      },
    });
  } catch (error) {
    console.error('[chat/send] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// ── Helpers ─────────────────────────────────────────────────

/**
 * Build brain memory context block for project-scoped memories.
 * Extracted into a standalone function so it can be parallelized.
 */
async function buildBrainContext(projectId: string | null): Promise<string> {
  if (!projectId) return '';
  const memories = await db.memoryEntry.findMany({
    where: { projectId },
    orderBy: { updatedAt: 'desc' },
    take: 10,
  });
  if (memories.length === 0) return '';

  const formatted = memories.map((m) => {
    const facts = formatFactsForPrompt(m.facts);
    return `[Project memory — "${m.title}"]\nSummary: ${m.summary}${facts ? '\n' + facts : ''}`;
  });
  return `\n\nProject memories:\n${formatted.join('\n\n')}`;
}
