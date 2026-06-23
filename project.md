# Strubloid — Project Guide

An AI-powered chat application built with Next.js 14, Prisma + SQLite, and multi-provider AI support (OpenCode Zen + NVIDIA NIM). Features project-organized conversations, per-chat model selection, and an AI Brain cross-chat memory system.

---

## Quick Start

```bash
# Install dependencies
npm install

# Generate Prisma client & push schema
npm run prisma:generate && npm run prisma:push

# Start dev server
npm run dev
```

Open [http://localhost:3000/chat](http://localhost:3000/chat) in your browser.

---

## Configuration

Copy `.env.example` to `.env` and fill in:

| Variable | Purpose | Example |
|----------|---------|--------|
| `DATABASE_URL` | SQLite database path | `file:./dev.db` |
| `BIGPICKLE_API_URL` | OpenCode Zen endpoint | `https://opencode.ai/zen/v1` |
| `BIGPICKLE_API_KEY` | API key (from [OpenCode Zen](https://opencode.ai/zen)) | `sk-...` |
| `BIGPICKLE_MODEL` | Model name ([see docs](https://opencode.ai/docs/zen)) | `big-pickle` |
| `COMPACTION_WINDOW_DAYS` | Chat age (days) before memory compaction | `30` |

Restart the dev server after changing `.env`.

Most settings (API keys, default model, provider selection) can also be configured from the **Settings** page inside the app and are stored in the database — no `.env` restart needed for runtime config.

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server on port 3000 |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run test` | Run unit tests (Vitest) |
| `npm run test:watch` | Watch mode for tests |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run test:all` | lint + typecheck + test + scan:artifacts |
| `npm run lint` | ESLint check |
| `npm run typecheck` | TypeScript check |
| `npm run prisma:generate` | Regenerate Prisma client |
| `npm run prisma:push` | Push schema to DB |
| `npm run prisma:migrate` | Create a new migration |
| `npm run scan:artifacts` | Scan for incomplete / placeholder code |
| `npm run memory:compact` | Compact old chats into AI Brain memories |

---

## Features

### Chat

- **Random Chats** — Start an ad-hoc conversation from the sidebar. No project, no fuss.
- **Project Chats** — Organise conversations into projects with colour labels. Projects appear in the sidebar with an animated glow border when active.
- **Keyboard History** — `ArrowUp` / `ArrowDown` in the composer to recall previously sent messages. No more typing the same thing twice.
- **Message Actions** — Hover any message to reveal **delete** (trash icon) and **regenerate** (refresh icon, assistant messages only) buttons. Delete removes the message from the database. Regenerate re-sends the preceding user prompt — handy when the AI hallucinates a raw JSON response instead of actual text.
- **Per-Chat Model Selection** — Pick which AI model handles a specific conversation via the composer footer dropdown. Overrides the global default.

### AI Brain — Cross-Chat Memory

The **Brain** feature lets the app remember information across chats within the same project.

**How it works:**

1. **Auto-save**: Every exchange (user message + AI response) in project chats is automatically saved as a `MemoryEntry`. This happens regardless of the brain toggle — so data is always available even if brain was turned on later.
2. **Brain toggle (`useAiBrain`)**: Controls whether memory entries are **retrieved** and injected into the AI's system prompt. When brain is ON, the server queries the 10 most recent `MemoryEntry` records for the current project and prepends them as context.
3. **Project scoping**: Memories are isolated per project. When brain is ON in a project chat, only memories from that same project are retrieved. Random chats get global memories.

**Memory Compaction**: Chats older than 30 days are automatically condensed into memory entries via `npm run memory:compact` (or the `POST /api/memory/compact` endpoint). The AI itself summarizes the conversation into a structured memory entry.

### Multi-Provider AI

The app supports multiple AI providers via a dispatch system:

| Source | Config | Endpoint Type |
|--------|--------|---------------|
| **Zen** (OpenCode) | DB-stored API key + base URL | OpenAI-compatible `/v1/chat/completions` |
| **NVIDIA NIM** | DB-stored API key + base URL | OpenAI-compatible `/v1/chat/completions` |

Models are stored in the `AiModel` table with a `modelSource` field (`'zen'` | `'nvidia'`). The provider dispatcher (`getProviderClient.ts`) looks up the model by ID, checks its source, and routes to the appropriate client configuration.

**Refreshing models**: `POST /api/ai/models/refresh?provider=zen|nvidia` fetches live models from the provider's `/v1/models` endpoint, upserts them into `AiModel`, and classifies free vs paid models based on naming conventions. Accessible via the "Refresh Models" button in Settings.

### Projects

- Create projects with custom names, descriptions, and color labels.
- **Starred Projects** — Pin important projects for quick access at the top of the sidebar.
- Sidebar accordion: click a project name to navigate; click the chevron to toggle its inline chat list. Auto-expands when viewing a chat from that project.

### Settings Page

Tabbed settings interface:

| Tab | Content |
|-----|---------|
| **Zen** | API key, API base URL, default model, refresh models |
| **NVIDIA** | API key, API base URL, default model, refresh models |
| **Brain** | View and manage AI Brain memory entries |

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| **Framework** | Next.js 14 (App Router) |
| **Database** | SQLite via Prisma ORM |
| **Styling** | Tailwind CSS |
| **AI Providers** | OpenCode Zen + NVIDIA NIM |
| **Tests** | Vitest (unit/component) + Playwright (E2E) |
| **Validation** | Zod |
| **Language** | TypeScript 5.6 |

---

## Project Structure

```
src/
  app/
    api/
      chat/send/route.ts            — Main chat endpoint (send + brain)
      chats/route.ts                — Chat CRUD (list, create)
      chats/[id]/route.ts           — Chat get, update, delete
      messages/[id]/route.ts        — Message delete
      memory/route.ts               — Memory CRUD
      memory/compact/route.ts       — Memory compaction
      ai/
        status/route.ts             — AI provider status
        models/route.ts             — List available models
        models/refresh/route.ts     — Refresh models from provider
        config/route.ts             — Config CRUD
        nvidia-models/route.ts      — NVIDIA model list
      projects/route.ts             — Project CRUD
      projects/[id]/route.ts        — Project get/update/delete
      projects/[id]/star/route.ts   — Toggle project star
    chat/[chatId]/page.tsx          — Chat UI page
    chat/page.tsx                   — New random chat page
    projects/                       — Project management pages
    projects/starred/               — Starred projects view
    settings/                       — Settings (providers, models, brain)
  ais/
    AI.ts                           — AI interface
    AIResponse.ts                   — Response type definitions
    AIProviderError.ts              — Error mapping
    getProviderClient.ts            — Routes requests to Zen/NVIDIA client
    zen/
      ZenAI.ts                      — Zen AI wrapper
      ZenAIClient.ts                — OpenAI-compatible + Anthropic + Google client
      ZenConfig.ts                  — Config loader
    nvidia/
      NvidiaConfig.ts               — NVIDIA config loader
    big-pickle/                     — Legacy BigPickle client (deprecated)
  components/
    ChatComposer.tsx                — Message input + brain toggle
    ConfirmDialog.tsx               — Reusable confirmation modal
    ErrorBanner.tsx                 — Dismissible error display
    MessageList.tsx                 — Chat history with action buttons
    Sidebar.tsx                     — Navigation sidebar
    ChatList.tsx                    — Inline chat list per project
    ProjectCard.tsx                 — Project display card
 scripts/
    compact-memory.ts               — CLI memory compaction
    scan-artifacts.ts               — Incomplete code scanner
 prisma/
    schema.prisma                   — Database schema
```

---

## Architecture

### Data Flow — Sending a Message

```
User types message → ChatComposer → Page state (optimistic UI with loading dots)
                                    → POST /api/chat/send
                                      → Save user message to DB
                                      → Get message history
                                      → If brain ON: query MemoryEntry
                                      → Resolve model via getProviderClient()
                                      → Call AI provider
                                      → Save assistant response to DB
                                      → If project chat: auto-save Brain memory
                                      → Return full chat with messages
                                    → Update page state
```

### Provider Dispatch

```
getClientForModel(modelId)
  → Look up AiModel by modelId in DB
  → If modelSource === 'nvidia' → load NvidiaConfig
  → Otherwise → load ZenConfig
  → Return ZenAIClient(config)
```

The `ZenAIClient` handles three provider formats internally:
- **OpenAI-compatible** (default) — `/v1/chat/completions` with `Authorization: Bearer`
- **Anthropic** — Messages API with `x-api-key`
- **Google** — `generateContent` endpoint

### AI Brain — Memory Flow

```
POST /api/chat/send (project chat)
  → After successful AI response
  → Save MemoryEntry (title=user msg, summary=AI response, facts=user msg)
  → projectId is set for project-chat scoping

GET /api/memory
  → GET /api/memory (returns all entries)
  → POST /api/memory/compact (triggers compaction)

Compaction (npm run memory:compact)
  → Find chats > 30 days old without compaction
  → For each: build transcript, call AI to summarize
  → Create MemoryEntry, mark chat as compacted
```

---

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/chat/send` | Send a message (creates chat if new) |
| `GET` | `/api/chats` | List all chats |
| `POST` | `/api/chats` | Create a new chat |
| `GET` | `/api/chats/[id]` | Get chat with messages |
| `PATCH` | `/api/chats/[id]` | Update chat (title, brain toggle) |
| `DELETE` | `/api/chats/[id]` | Delete chat |
| `DELETE` | `/api/messages/[id]` | Delete a single message |
| `GET` | `/api/memory` | List memory entries |
| `POST` | `/api/memory` | Create memory entry |
| `POST` | `/api/memory/compact` | Run memory compaction |
| `GET` | `/api/ai/status` | AI provider status |
| `GET` | `/api/ai/models` | List available AI models |
| `POST` | `/api/ai/models/refresh` | Refresh models from provider |
| `GET` | `/api/ai/config` | Get config key-value pairs |
| `GET` | `/api/projects` | List projects |
| `POST` | `/api/projects` | Create project |
| `GET` | `/api/projects/[id]` | Get project details |
| `PATCH` | `/api/projects/[id]` | Update project |
| `DELETE` | `/api/projects/[id]` | Delete project |
| `POST` | `/api/projects/[id]/star` | Toggle project star |

---

## Testing

Tests are structured to **break when the system breaks** — real DB integration over mocks.

```bash
npm run test          # Vitest unit + component tests
npm run test:e2e      # Playwright E2E tests
npm run test:all      # Full suite: lint + typecheck + test + scan
```

### Test Categories

| Suite | Count | Scope |
|-------|-------|-------|
| Unit | 14 | BigPickle client + config + AI + errors + schemas |
| Component | 28 | ChatComposer, ConfirmDialog, ErrorBanner |
| E2E | 12 | Chat flow, project CRUD (Playwright, requires dev server) |

### Writing Tests

- New features should include tests that exercise the actual DB layer.
- API route tests prefer `fetch` against the running app.
- Component tests use `@testing-library/react` with `jsdom`.

---

## Known Pitfalls

- **Brain not returning data**: Check that the chat has `useAiBrain=true` AND belongs to a project. Memories are only saved for project chats. The brain toggle controls retrieval, not saving.
- **Empty memory responses**: The memory query takes 10 most recent entries filtered by projectId. If memories exist but aren't being returned, verify the `projectId` matches.
- **Raw JSON responses**: Some AI providers return `content: ""` with reasoning in a separate field. If you see a full API response dumped as the message content, this is the bug — the content extraction doesn't handle empty-string `content` fields properly (fixed in `ZenAIClient.callOpenAIEndpoint`).
- **API key stripping**: The config loader strips surrounding quotes from `.env` values. If your key has unexpected characters, check the raw `.env` value first.

---

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for planned features: streaming responses, message editing, markdown rendering, voice input/output, multi-provider switching, PWA, Docker, and more.

---

## License

Private project — use at your own inspiration.
