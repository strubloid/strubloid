# Strubloid - Phase 1 Implementation Plan

## Status: IN PROGRESS

## What's Done ✅
- [x] AI interface definitions (AI.ts, AIResponse.ts, AIMessage.ts, AIProviderError.ts)
- [x] BigPickleConfig.ts
- [x] Prisma schema with SQLite
- [x] Package.json with all scripts
- [x] Config files (tailwind, eslint, prettier, vitest, playwright, tsconfig)
- [x] .env.example

## What's Missing ❌

### P0 - Core AI Provider
- [ ] BigPickleClient.ts - HTTP client with error handling
- [ ] BigPickleAI.ts - Main provider implementing AI interface

### P1 - App Router Pages
- [ ] `src/app/globals.css`
- [ ] `src/app/layout.tsx`
- [ ] `src/app/page.tsx` (redirects to /chat)
- [ ] `src/app/chat/page.tsx` (random chat area)
- [ ] `src/app/chat/[chatId]/page.tsx` (saved chat)
- [ ] `src/app/projects/page.tsx` (project list)
- [ ] `src/app/projects/[projectId]/page.tsx` (project chat)
- [ ] `src/app/projects/starred/page.tsx` (starred projects)
- [ ] `src/app/settings/page.tsx` (AI status/settings)

### P2 - API Routes
- [ ] `POST /api/chat/send`
- [ ] `POST /api/chats`
- [ ] `GET /api/chats`
- [ ] `GET /api/chats/[id]`
- [ ] `POST /api/projects`
- [ ] `GET /api/projects`
- [ ] `PATCH /api/projects/[id]/star`
- [ ] `GET /api/memory`
- [ ] `POST /api/memory/compact`
- [ ] `GET /api/ai/status`

### P3 - UI Components
- [ ] Sidebar with project list, starred section
- [ ] ChatComposer (message input)
- [ ] MessageList (chat history display)
- [ ] ProjectCard
- [ ] UseAiBrainToggle
- [ ] ErrorBanner

### P4 - Scripts
- [ ] scripts/compact-memory.ts
- [ ] scripts/scan-artifacts.ts

### P5 - Tests
- [ ] BigPickleAI provider tests
- [ ] Memory compaction tests
- [ ] Zod validation tests
- [ ] Component tests (ChatComposer, UseAiBrainToggle, etc.)
- [ ] E2E tests with Playwright

### P6 - Documentation
- [ ] README.md (complete setup instructions)
- [ ] ROADMAP.md (Phases 2-4)

## Implementation Order
1. BigPickleClient + BigPickleAI (core dependency)
2. API routes (needed by UI)
3. UI pages + components
4. Scripts
5. Tests
6. README + ROADMAP