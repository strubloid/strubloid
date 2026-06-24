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
      chat/send/route.ts              — Main chat endpoint (send message + brain)
      chats/[id]/route.ts             — Chat CRUD
      chats/clean-random/route.ts     — Clean all random chats → one memory entry
      memory/route.ts                  — Memory CRUD (GET/POST)
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

The **Brain** feature lets the app remember information across chats in the same project. The **Randoms** feature lets the app remember information from random chats (both active and compacted).

### How It Works

1. **Auto-save**: Every exchange (user message + AI response) in any **project chat** is automatically saved as a `MemoryEntry`. This happens for ALL project chats regardless of the brain toggle state — so data is always available even if brain was turned on later.

2. **Brain toggle (`useAiBrain`)**: Controls whether project-scoped memory entries are **retrieved** and injected into the AI's system prompt. When brain is ON, the server queries the 10 most recent `MemoryEntry` records for the current project and prepends them as context the AI can reference.

3. **Randoms toggle (`useRandomChats`)**: Controls whether **global random memory** is injected into the AI's context. When Randoms is ON, the server searches BOTH:
   - **Active random chats** — Chat records with `isRandom=true`, excluding the current chat
   - **Compacted random memory** — MemoryEntry records with `projectId=null` (created by clean-random)

   Both sources are merged, deduplicated, and injected as context.

4. **Project scoping**: Each `MemoryEntry` stores the `projectId` so memories are isolated per project. Random memory has `projectId: null` (global).

### Toggle Combinations

| Brain | Randoms | What gets injected |
|-------|---------|-------------------|
| OFF   | OFF     | None (default) |
| ON    | OFF     | Project brain memories only |
| OFF   | ON      | Active random chats + compacted random memory |
| ON    | ON      | Project brain memories + active random chats + compacted random memory |

### Memory Flow

```
User message with Randoms=ON
  → memory service searches active random chats
  → memory service searches compacted MemoryEntry (projectId=null)
  → results are merged into a formatted context block
  → context block is injected into system prompt
  → model is instructed to use the memory in its response
  → AI answers with memory-aware content
```

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

### MemoryEntry Project Scoping

| `projectId` | Source | Used By |
|-------------|--------|---------|
| `<projectId>` | Auto-save from project chat exchanges | Brain toggle |
| `null` | Clean random chats compaction | Randoms toggle |

### Key Code Locations

| Concern | File |
|---------|------|
| Auto-save + brain query | `src/app/api/chat/send/route.ts` |
| Random chat summary injection | `src/app/api/chat/send/route.ts` (line 97) |
| Memory API | `src/app/api/memory/route.ts` |
| Compaction API | `src/app/api/memory/compact/route.ts` |
| Clean random chats API | `src/app/api/chats/clean-random/route.ts` |
| Compaction script | `scripts/compact-memory.ts` |
| Memory service (retrieval + prompt building) | `src/lib/memory/memory.service.ts` |
| Memory parsers (JSON field helpers) | `src/lib/memory/memory.parsers.ts` |
| Brain + Randoms toggle UI | `src/components/ChatComposer.tsx` |
| Brain memory injection | `src/ais/zen/ZenAIClient.ts` (line 76) |
| Provider dispatch | `src/ais/getProviderClient.ts` |
| Schema | `prisma/schema.prisma` |

## Clean Random Chats — Memory Aggregation

The **Clean Random Chats** feature in Settings / Chat lets you compress ALL random chats into a single aggregate memory entry, then deletes them.

### How It Works

1. `POST /api/chats/clean-random` fetches ALL random chats with their messages
2. **All messages from all populated random chats** are sent together to `ZenAI.compactMemory()` as one batch
3. The AI creates ONE aggregate summary capturing the most important elements across all conversations
4. A single `MemoryEntry` with `projectId: null` (global) is saved to the DB
5. All random chats (including empty ones) are deleted

### Why Single Entry?

Instead of one memory per chat, the aggregate entry captures cross-cutting patterns, repeated questions, and key discoveries across ALL random conversations. This makes the compressed knowledge more useful when queried later.

### Manual & Auto Cleaning

- **Manual**: "Clean Now" button in Settings / Chat section triggers it immediately
- **Auto**: Configurable toggle (`random_chat_auto_clean_enabled`) + periodicity in days (`random_chat_clean_period_days`), stored in `Config` table

## Random Chats Summary Toggle — `useRandomChats`

Alongside the **Brain** toggle (`🧠`), the ChatComposer now has a **Randoms** toggle (`📋`) that controls whether compressed random chat summaries are injected as AI context.

### Toggle States

| Brain | Randoms | Effect |
|-------|---------|--------|
| OFF   | OFF     | No memory injection (default) |
| ON    | OFF     | Injects project-scoped brain memories only |
| OFF   | ON      | Injects global random chat summaries only |
| ON    | ON      | Injects both sources combined |

### How It Works

- `useRandomChats` is stored per-chat in the `Chat` model (Prisma field)
- When ON, `POST /api/chat/send` queries `MemoryEntry` entries with `projectId: null` (global — from clean random chats), ordered by `updatedAt DESC`, limit 10
- Summaries are prefixed with `[Random Chat Summary]` in the AI context
- Both `brainMemories` and `randomChatSummaries` are combined into a single `contextMemories` array passed to the AI client

### MemoryEntry Project Scoping

| `projectId` | Source | Used By |
|-------------|--------|---------|
| `<projectId>` | Auto-save from project chat exchanges | Brain toggle |
| `null` | Clean random chats compaction | Randoms toggle |

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
- **Randoms toggle not returning data**: Check if any random chats have been cleaned via Settings. The Randoms toggle queries global memory entries (`projectId: null`), which are only created by the clean-random endpoint.
- **Empty memory responses**: The memory query takes 10 most recent entries filtered by projectId (brain) or null (randoms). If memories exist but aren't being returned, check the filter value.
- **Raw JSON responses**: If the AI provider returns unparseable responses, the client falls back to `JSON.stringify(data)`. Check server logs for warnings from `callOpenAIEndpoint`.

## Migration Notes

- The `projectId` field was added to `MemoryEntry` in migration `20260623140000_add_project_id_to_memory_entry`
- Before this migration, memories were stored without project scoping (all global)
- Auto-save was originally gated by `useAiBrain`; changed to always save for project chats
