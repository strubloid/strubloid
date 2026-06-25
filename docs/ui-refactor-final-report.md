# UI Refactor Final Report — Cognitive Workbench v2

## What changed differently after review

The first pass was too close to the old UI because it mostly improved surfaces: bento cards, panels, spacing, and copy. This second pass changes the product interaction model.

Strubloid now moves toward a **Cognitive Workbench** experience:

- global command operation instead of page hunting,
- intent-first prompting instead of a blank textbox,
- projects as memory containers,
- settings as model/memory systems,
- random chat as fast capture.

## New product-level interactions

### Paintbrush / Orbit Rail sidebar

Files:

- `src/components/Sidebar.tsx`
- `src/styles/_sidebar-layout.scss`

Behavior:

- Sidebar now reads as a rounded left-side **D-shaped rail** instead of a rectangular column.
- Random chats, projects, and starred projects render as horizontal orbit strips.
- Mouse wheel over each strip spins through hidden contexts horizontally.
- The sidebar search box was removed from the rail to keep the side navigation focused and sculptural.

Why it matters:

This directly follows the user suggestion: the sidebar behaves more like a creative paintbrush/context wheel than a normal list. It makes navigation feel spatial and more original.

### Centered global search

Files:

- `src/components/LayoutShell/HeaderBar.tsx`
- `src/components/LayoutShell/HeaderBar.module.scss`
- `src/components/CommandDeck.tsx`

Behavior:

- Search moved to the top center.
- Submitting search opens Command Deck with the query prefilled.
- Global results now include:
  - commands,
  - project brains,
  - chat/message matches from `/api/search`.

Why it matters:

Search is no longer local sidebar filtering. It becomes a global operating layer for the whole app.

### Global Command Deck

Files:

- `src/components/CommandDeck.tsx`
- `src/components/CommandDeck.module.scss`
- wired through `src/components/LayoutShell/LayoutShell.tsx`
- opened from `src/components/LayoutShell/HeaderBar.tsx`

Behavior:

- Header now has a visible `Command K` trigger.
- `Cmd/Ctrl+K` opens the deck globally.
- Deck supports:
  - creating a new random capture,
  - opening project brain registry,
  - opening systems console,
  - jumping to project brains,
  - searching commands/projects.

Why it matters:

This is a real workflow change inspired by Raycast/Linear/OpenCode-style command interfaces. It makes Strubloid feel more like an AI operating layer than a normal website with a sidebar.

### Composer Intent Dock

Files:

- `src/components/ChatComposer.tsx`
- `src/components/ChatComposer.module.scss`

Behavior:

The composer now includes explicit intent chips:

- Study
- Debug
- Build
- Compare
- Remember

Clicking a chip inserts a structured prompt starter and focuses the textarea.

Why it matters:

This changes how the user starts a ChatGPT-like session. Instead of a generic blank box, the UI nudges the conversation into useful work modes. This better applies the research around smarter micro-interactions, human-centered helper design, and product-specific differentiation.

## Existing redesign retained

### `/projects`

Converted into a workspace cockpit:

- workspace telemetry,
- starred brains,
- recent activity,
- project brain registry,
- inline expand/collapse preserved.

### `/projects/[projectId]`

Converted into a project command surface:

- memory container status,
- latest signal,
- guidance,
- thread registry.

### `/settings`

Polished into a systems console:

- command-like header,
- clearer model-routing language,
- improved panel styling.

## 2026 design principles actually applied

- **Command-first UI**: global operating layer, not just navigation links.
- **Intent-first AI UX**: prompts begin from user goals/modes.
- **Tech-spec precision**: mono labels, command keys, status metrics.
- **Purposeful bento**: only for telemetry and project summaries.
- **Performance-first design**: CSS modules, no animation libraries, no new dependencies.
- **Smarter micro-interactions**: chips insert prompt scaffolds, command deck opens globally, hover/focus states are meaningful.
- **Human warmth**: explanatory memory/workbench copy, not sterile AI-product filler.

## What was intentionally not changed

- Chat streaming logic.
- SSE parser.
- API route behavior.
- Provider/model saving logic.
- Message delete/regenerate behavior.
- Sidebar data model.
- Business logic for Brain/Randoms toggles.

## Infrastructure/test fix

Added missing migration for an already-existing Prisma schema field:

- `prisma/migrations/20260625170000_add_brain_project_id_to_chat/migration.sql`

Also updated `tests/unit/cleanRandomChats.test.ts` cleanup to avoid noisy caught Prisma delete errors.

## Verification

```bash
npm run typecheck
# PASS

npm run build
# PASS — Next.js build compiled successfully, 19 routes generated

npm run test
# PASS — 7 files, 71 tests
```

Browser verification:

- `/chat` renders.
- Intent Dock is visible.
- Study chip inserts prompt text and enables send.
- Command Deck opens from the header button.
- Command Deck renders commands and project brains.
- Browser console: 0 messages, 0 JS errors.

## Known limitations / next best innovation step

The next real differentiator should be a **Context Inspector Rail** for chat:

- show which memories will be used before sending,
- preview active project/random context,
- explain model routing and cost/free status,
- let the user switch Brain/Randoms/model from one cockpit panel.

That would make Brain less invisible and would further move Strubloid away from a normal ChatGPT clone.
