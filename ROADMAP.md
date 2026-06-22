# Strubloid Roadmap

## Phase 1 — Core Chat (Current) ✅

- [x] AI provider integration (BigPickle / OpenCode Zen)
- [x] Random chats with SQLite persistence
- [x] Project chats with colour labels and starring
- [x] Chat composer with Enter-to-send, auto-resize textarea
- [x] AI Brain toggle for memory-injected conversations
- [x] Delete chat with confirmation dialog
- [x] ArrowUp / ArrowDown message history recall
- [x] Memory compaction API + script
- [x] Artifact scanner for code quality
- [x] Settings page with AI status

## Phase 2 — Streaming, Memory, UX

- [ ] **Streaming responses** — SSE token-by-token output instead of waiting for full response
- [ ] **Memory browser** — View / edit / delete AI Brain memory entries from the Settings page
- [ ] **Message editing** — Edit sent messages and re-send
- [ ] **Regenerate** — Re-roll the last AI response
- [ ] **Markdown rendering** — Render code blocks, tables, and lists in messages
- [ ] **Auto-scroll lock** — Stop scrolling up when reading previous output while a new response streams in

## Phase 3 — Multi-Provider & Voice

- [ ] **Provider switcher** — Swap between OpenCode Zen, OpenAI, Anthropic, or local models
- [ ] **Per-chat model override** — Choose a different model for a specific conversation
- [ ] **System prompt editor** — Custom per-chat system instructions
- [ ] **Voice input** — Speech-to-text via browser microphone API
- [ ] **Text-to-speech playback** — Read AI responses aloud (Edge TTS)

## Phase 4 — Polish & Production

- [ ] **E2E tests** — Playwright test suite covering happy paths
- [ ] **Component tests** — ChatComposer, MessageList, Sidebar, ConfirmDialog
- [ ] **Keyboard shortcuts** — `Ctrl+N` new chat, `Ctrl+Shift+,` settings, `/` search
- [ ] **Search & filter** — Find chats by title, full-text message search
- [ ] **Export / import** — Download chat history as JSON or Markdown
- [ ] **Dark/light theme toggle** — Respect system preference with manual override
- [ ] **PWA support** — Installable as a standalone app with offline shell
- [ ] **Postgres support** — Switch from SQLite to Postgres via Prisma provider change
- [ ] **Docker** — docker-compose.yml for one-command deployment
