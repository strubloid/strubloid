# Strubloid — Project Guide for AI Agents

## Overview

Strubloid is a Next.js 14 chat application with multi-provider AI support (Zen + NVIDIA). It features project-organized chats, per-chat AI model selection, and an AI Brain system for cross-chat memory.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: SQLite via Prisma ORM
- **AI Providers**: Zen (OpenCode) + NVIDIA NIM — dispatched by `modelSource` field on `AiModel`
- **Styling**: Tailwind CSS

## Project Structure

```
src/
  app/
    api/
      chat/send/route.ts        — Main chat endpoint (send message + brain)
      chats/[id]/route.ts       — Chat CRUD
      memory/route.ts            — Memory CRUD (GET/POST)
      memory/compact/route.ts    — Background compaction (30+ day old chats)
    chat/[chatId]/page.tsx       — Chat UI page
    chat/page.tsx                — New chat page
    projects/                    — Project management pages
    settings/                    — Settings (providers, models, brain toggle)
  ais/
    AIResponse.ts                — Response type definitions
    getProviderClient.ts         — Routes requests to Zen/NVIDIA client
    zen/ZenAIClient.ts           — OpenAI-compatible + Anthropic + Google client
    zen/ZenAI.ts                 — Zen AI wrapper with compaction
    big-pickle/                  — Legacy BigPickle client (deprecated)
    nvidia/                      — NVIDIA NIM config
  components/
    ChatComposer.tsx             — Message input + brain toggle
```

## AI Brain — Cross-Chat Memory System

The **Brain** feature lets the app remember information across chats in the same project.

### How It Works

1. **Auto-save**: Every exchange (user message + AI response) in any **project chat** is automatically saved as a `MemoryEntry`. This happens for ALL project chats regardless of the brain toggle state — so data is always available even if brain was turned on later.

2. **Brain toggle (`useAiBrain`)**: Controls whether memory entries are **retrieved** and injected into the AI's system prompt. When brain is ON, the server queries the 10 most recent `MemoryEntry` records for the current project and prepends them as context the AI can reference.

3. **Project scoping**: Each `MemoryEntry` stores the `projectId` so memories are isolated per project. When brain is ON in a project chat, only memories from that same project are retrieved. Random chats (no project) get global memories.

### MemoryEntry Schema

```prisma
model MemoryEntry {
  id            String   @id @default(cuid())
  projectId     String?  // project for scoped retrieval
  title         String   // user message (truncated to 80 chars)
  summary       String   // AI response (truncated to 300 chars)
  facts         String   // user message (full)
  preferences   String?
  sourceChatIds String   // JSON array of originating chat IDs
  createdAt     DateTime
  updatedAt     DateTime
}
```

### Flow

1. User sends message in a project chat → `POST /api/chat/send`
2. Route auto-saves a memory entry with the exchange (if `chat.projectId` is set)
3. If `useAiBrain=true`, route queries `MemoryEntry` filtered by `projectId`, ordered by `updatedAt DESC`, limit 10
4. Memories are injected into system prompt: `"You have access to memories from past conversations..."`
5. AI responds with memory context available

### Compaction

Random chats older than 30 days are compacted into memory entries via:
- `POST /api/memory/compact` — API endpoint
- `npm run memory:compact` — CLI script (`scripts/compact-memory.ts`)

Compaction uses the AI itself to summarize the conversation into a structured memory entry (title, summary, facts, preferences).

### Key Code Locations

| Concern | File |
|---------|------|
| Auto-save + brain query | `src/app/api/chat/send/route.ts` |
| Memory API | `src/app/api/memory/route.ts` |
| Compaction API | `src/app/api/memory/compact/route.ts` |
| Compaction script | `scripts/compact-memory.ts` |
| Brain toggle UI | `src/components/ChatComposer.tsx` |
| Brain memory injection | `src/ais/zen/ZenAIClient.ts` (line 76) |
| Provider dispatch | `src/ais/getProviderClient.ts` |
| Schema | `prisma/schema.prisma` |

## AI Provider Architecture

- **Model dispatch**: `getClientForModel(modelId)` in `src/ais/getProviderClient.ts`
  - Looks up model by `modelId` in `AiModel` table
  - Routes based on `modelSource`: `'zen'` → Zen config, `'nvidia'` → Nvidia config
  - Returns a `ZenAIClient` instance configured for the appropriate endpoint
- **Model refresh**: `POST /api/ai/models/refresh?provider=zen|nvidia` — fetches live models from provider API

## Testing

- Tests must break when the system breaks (real DB integration preferred)
- Test files: `tests/unit/`, `tests/component/`
- Key tests: `BigPickleClient.test.ts`, `BigPickleAI.test.ts`, `apiSchemas.test.ts`
- Schema tests validate input parsing for chat/memory routes

## Common Pitfalls

- **Brain not returning data**: Check if the chat has `useAiBrain=true` AND belongs to a project. Memories are only saved for project chats. The brain toggle controls retrieval, not saving.
- **Empty memory responses**: The memory query takes 10 most recent entries filtered by projectId. If memories exist but aren't being returned, check the projectId match.
- **Raw JSON responses**: If the AI provider returns unparseable responses, the client falls back to `JSON.stringify(data)`. Check server logs for warnings from `callOpenAIEndpoint`.

## Migration Notes

- The `projectId` field was added to `MemoryEntry` in migration `20260623140000_add_project_id_to_memory_entry`
- Before this migration, memories were stored without project scoping (all global)
- Auto-save was originally gated by `useAiBrain`; changed to always save for project chats
