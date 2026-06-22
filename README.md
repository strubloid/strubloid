# Strubloid

An AI-powered chat application built with Next.js 14, Prisma + SQLite, and
OpenCode Zen AI.

## Quick Start

```bash
# Install dependencies
npm install

# Generate Prisma client & push schema
npm run prisma:generate && npm run prisma:push

# Start dev server
npm run dev
```

Open **http://localhost:3000/chat** in your browser.

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

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server on port 3000 |
| `npm run build` | Production build |
| `npm run test` | Run unit tests (Vitest) |
| `npm run lint` | ESLint check |
| `npm run typecheck` | TypeScript check |
| `npm run scan:artifacts` | Scan for incomplete / placeholder code |
| `npm run memory:compact` | Compact old chats into AI Brain memories |
| `npm run test:all` | lint + typecheck + test + scan:artifacts |

## Features

- **Random Chats** — Start a new ad-hoc conversation from the sidebar
- **Project Chats** — Organise conversations into projects with colour labels
- **AI Brain** — Toggle memory injection for context-aware responses
- **Delete Chats** — Remove chats with a confirmation dialog
- **Keyboard History** — ArrowUp / ArrowDown to recall previously sent messages
- **Memory Compaction** — Old chats are automatically condensed into "AI Brain"
  memory entries, which can fuel future conversations
- **Starred Projects** — Pin important projects for quick access

## Tech Stack

- **Framework** — Next.js 14 (App Router)
- **Database** — SQLite via Prisma ORM
- **Styling** — Tailwind CSS
- **Tests** — Vitest (unit), Playwright (E2E, planned)
- **AI** — OpenCode Zen (OpenAI-compatible `/chat/completions` API)
