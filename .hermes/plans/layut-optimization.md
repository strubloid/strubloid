# Layout Optimization — 2026 UI Modernization Plan

> **Start date**: 2026-06-25  
> **Status**: Active implementation.  
> **Goal**: Transform Strubloid into a 2026 "Cognitive Workbench" — not a generic chat clone. The app should feel like a memory-aware command cockpit for projects, random thought capture, model routing, and cross-chat brain context. Use bento grids only where they reveal product structure; preserve chat flow and business logic.

---

## Product Direction Addendum — Cognitive Workbench

This project should not become a pretty wrapper around a normal chat textbox. The differentiator is memory-aware work: project chats, random capture, brain memory, random-chat compaction, and multi-provider model routing. The UI should make those invisible systems visible enough that the user feels they are operating a personal AI workspace, not scrolling through commodity chats.

### Inspiration synthesis

- **Linear**: dark-native precision, low-noise surfaces, semi-transparent borders, compact dashboard hierarchy.
- **OpenCode**: terminal/agent clarity, monospace technical labels, no decorative bloat.
- **Claude**: human warmth, helpful empty states, less sterile AI-product copy.
- **2026 bento guides**: size communicates importance, not visual randomness. Use bento for project/workspace overviews only.

### Strubloid-native design language

Name: **Cognitive Workbench**

- Main surface: obsidian command deck.
- Projects: memory containers, not folders.
- Random chat: capture stream / inbox.
- Brain: contextual recall engine.
- Settings: systems console for providers, model routing, and random memory hygiene.
- Bento: workspace telemetry + action cards, not decorative tiles.

### Implementation stance

- Do not rewrite chat flow. Chat remains linear and calm.
- Innovate around project navigation, memory visibility, settings clarity, and empty states.
- Keep all API calls, handlers, routes, Prisma models, and SSE streaming intact.
- Add a safe CSS layer on top of the current SCSS/Tailwind setup rather than replacing every token in one risky change.

### Course correction after first implementation review

The first execution still felt too close to the old app because it mostly changed page surfaces. The stronger direction is interaction-level innovation:

- **Global Command Deck**: `Cmd/Ctrl+K` command surface for creating random captures, jumping into project brains, and opening model/memory systems. This brings the app closer to Raycast/Linear/OpenCode workflows instead of normal web navigation.
- **Composer Intent Dock**: the chat input now starts from explicit modes — Study, Debug, Build, Compare, Remember — so Strubloid changes how the user begins an AI session, not just how cards look.
- **Research applied structurally**: command-first navigation, tech-spec controls, purposeful micro-interactions, performance-first CSS, and human-memory product language.
- **Bento is demoted**: bento remains useful for project telemetry, but it is not the main innovation. The main innovation is operating memory/model/project context faster.
- **Paintbrush Orbit Rail**: the sidebar should not read as a normal rectangular list. It becomes a left-side D-shaped rail with rounded context chips and wheel-scroll orbit strips for Random Chats and Projects.
- **Centered Global Search**: search moves out of the sidebar into the top center and feeds the Command Deck, returning commands, project brains, chats, and message matches.

---

## Phase 1 — Study & Extracted Design Principles

### 1A. Bento Grid Rules (from saasframe.io guide)

**Definition**: A bento grid is a modular layout with strict compartmentalization, size-based visual hierarchy, and uniform spacing. Not a glorified card grid.

**When to use bento grids**:
- **Feature showcases**: 5–10 distinct items, each in its own contained space. Perfect for projects overview, dashboard widgets.
- **Dashboard overviews**: Multiple data types (charts, metrics, lists) side-by-side without visual chaos.
- **Landing/hero sections**: Multiple value propositions at once.
- **Portfolio/case studies**: Flexible containers for different media types.

**When NOT to use bento grids**:
- Simple lists or tables where scanning rows is faster.
- Pages with one primary action or a single content stream (e.g., chat message list).
- Settings/config pages where grouped panels are clearer.
- Detail pages where sequential reading is expected.
- Forms (bento forces unnatural field layouts).

**Size = visual hierarchy** (from eye-tracking data):
- 1×1 box: supporting features, secondary actions (100px base).
- 2×1 box: mid-tier features with horizontal emphasis (216px × 100px).
- 2×2 box: hero feature, primary value proposition (216px × 216px).
- 3×2 box: detailed feature demonstrations (332px × 216px).
- Users fixate **2.6× longer** on larger grid items, regardless of position.

**Base unit system**:
- Choose one base unit (e.g., 8px or 12px).
- Everything is multiples of that unit: card sizes, gutters, padding, border-radius.
- This creates rhythm and intentionality.

**Gutter consistency**:
- Desktop: 16–24px
- Tablet: 12–16px
- Mobile: 12px
- Gutters must be **identical** throughout the grid.

**Responsive adaptation**:
- Desktop: 3–4 columns
- Tablet: 2 columns
- Mobile: 1 column
- Featured cards span 2 columns on desktop, full width on mobile.
- No card should become awkward or unreadable on mobile.

**Avoid "random card grid"**:
- Each card must have a clear purpose.
- Limit card size variants (3–4 max).
- Keep gutters identical.
- Use consistent padding within cards.

### 1B. Modern CSS Layout Rules (from the practical guide + 2026 techniques)

**Macro layout → CSS Grid**:
- Use `grid-template-columns: repeat(auto-fit, minmax(...))` for responsive grids.
- Define grid at page/section level, not component level.

**Local alignment → Flexbox**:
- Internal card content alignment.
- Button groups, tag lists, header items.

**Responsive typography → `clamp()`**:
- `font-size: clamp(1rem, 2.5vw, 1.5rem)` for fluid type.
- `padding: clamp(12px, 2vw, 24px)` for fluid spacing.

**Container queries** (`@container`):
- Use for components that need to respond to their own container size, not the viewport.
- Good for bento cards that might appear in different grid positions.

**Avoid**:
- Fixed pixel-heavy layouts (use `min()`, `max()`, `clamp()`).
- Layout JavaScript when CSS can solve it.
- Magic numbers.
- Absolute positioning except for decorative layers.

**Semantic structure**:
- Prefer BEM-like or utility-first class names.
- Keep CSS specificity low.
- Use CSS custom properties for theme values.

### 1C. 2026 Visual Direction (from divi-pixel.com + philipvandusen.com)

**Dominant trends for 2026**:

| Trend | Takeaway for this project |
|-------|--------------------------|
| **Bento/card-based composition** | Use intentionally on dashboard and projects page. Not everywhere. |
| **Fluid responsive layouts** | `clamp()`, container queries, auto-fit grids from the start. |
| **Advanced dark mode / dynamic theming** | Already dark-mode. Refine surfaces with "Obsidian" premium feel. |
| **Performance-first design** | CSS over JS, minimal dependencies, lazy visuals, no heavy animation libs. |
| **Smarter micro-interactions** | Card hover lift, skeleton loading, smooth theme changes, form feedback. |
| **Bold typography + variable fonts** | Strong headings (`font-size: clamp(...)`), readable body, variable font support. |
| **Glass/translucent layers** (Glass Block) | Use sparingly — header bar, overlay backgrounds. Not everywhere. |
| **Tech Spec precision** | For settings, dashboard metrics, system pages — wide tracking, strict grids, sharp accents, grayscale+accent palette. |
| **Affinity / human warmth** | For empty states, onboarding, helper text — friendly, rhythmic, soft. Not cold. |
| **Acid Fade** | Only as small accent gradients (e.g., active state glow, brand highlight). Not full-page. |
| **Purposeful 3D/parallax/motion** | Only where it helps usability. No decorative-only animation. |

### 1D. Anti-Patterns to Avoid

- ❌ Bento grids everywhere (overuse)
- ❌ Too many gradients (visual noise)
- ❌ Too many glass effects (reduces readability)
- ❌ Heavy animations that hurt performance
- ❌ Low contrast text (WCAG AA minimum)
- ❌ Tiny unreadable cards
- ❌ Cards with no hierarchy (all same size)
- ❌ Layouts that look modern but reduce usability
- ❌ Decorative effects that hide actual product value
- ❌ AI-looking sterile gradients everywhere

---

## Phase 2 — Audit: Current UI Problems

### 2A. Current UI Problems

| Problem | Location | Severity |
|---------|----------|----------|
| Hardcoded color values mixed with CSS variables | Many `bg-[var(--color-bg)]` + SCSS `$color-bg` usage | Medium |
| No consistent card component — manual border/radius/padding everywhere | Projects, Settings, Detail pages | High |
| Sidebar is 514-line monolithic component | `Sidebar.tsx` | High |
| No BentoGrid primitive — would have to build per-page | Nowhere exists | Medium |
| Empty states are inline JSX, not reusable | Projects, Chat detail, Sidebar | Medium |
| Loading skeletons exist but are basic | `LoadingSkeleton.tsx` | Low |
| No design token SCSS file is imported by modules — modules import variables separately | Multiple `@use '../../styles/variables'` | Low-Medium |
| Settings page is very long (734 lines) with no panel grouping | `settings/page.tsx` | High |
| Chat composer styles in Module SCSS, not in design system | `ChatComposer.module.scss` | Low |
| No visible form field component — raw `<input>` with manual styling | Every form | Medium |
| `.btn-primary` in SCSS but page code also uses `btn-primary` Tailwind-like class | Mixed approaches | Low |
| No Container Query usage — all responsive via Tailwind breakpoints | Everywhere | Low-Medium |
| Typography uses SCSS variables but also inline Tailwind classes | Mixed | Low |
| ErrorBanner exists but no consistent form validation pattern | Scattered | Medium |

### 2B. Current UX Problems

| Problem | Impact | Location |
|---------|--------|----------|
| Empty states lack clear next action in some places | User may not know what to do | Project detail (no chats), Chat page |
| No loading states for some async operations | Flickering content | Chat loading, project loading |
| Sidebar search only filters client-side after loading | No server-side search | Sidebar |
| Delete actions have inconsistent confirmation patterns | Safety inconsistency | Chat detail (ConfirmDialog) vs Sidebar (inline confirm) |
| No keyboard shortcuts documented | Power user friction | Everywhere |
| Form submission feedback varies (toast vs inline msg) | Inconsistent | Settings page |
| No visible pagination for large chat/project lists | Performance risk | Sidebar, Projects |
| No undo for destructive actions | Data loss risk | Chat delete |
| Mobile sidebar is overlay but no swipe gesture | Mobile UX gap | LayoutShell |
| **Chat page — no bento grid needed** (it's a chat UX) | Correct decision | Chat pages |

### 2C. Inconsistent Spacing/Color/Typography

**Spacing**:
- Global padding: `p-8` on page containers (32px), but `p-4` on Sidebar items, `px-3 py-2` on buttons
- Card padding: manual `p-4` everywhere but no token
- Section spacing: `mb-6`, `mb-8`, `mb-4` used inconsistently
- **No spacing scale used across components**

**Color**:
- `$color-accent: #9ad933` in SCSS vs `var(--color-accent)` in JSX — same value, two systems
- Some places use `text-[var(--color-text-dim)]`, others `text-gray-400` or `opacity-50`
- `$color-danger`, `$color-warning`, `$color-info`, `$color-purple`, `$color-orange` defined in SCSS variables but NOT exposed as CSS variables

**Typography**:
- Heading sizes: `text-2xl font-bold` (page titles), `text-lg font-semibold` (section titles)
- Body: `text-sm`, `text-xs` mixed depending on context
- No consistent `--font-size-*` CSS variables — only SCSS `$font-size-*`
- Section headers use `.section-header` class in SCSS but also inline classes

### 2D. Components That Need Refactoring

| Component | Refactor | Priority |
|-----------|----------|----------|
| `LayoutShell.tsx` + `.module.scss` | Refine responsive breakpoints, add proper sidebar transitions | Medium |
| `Sidebar.tsx` | Split into smaller sub-components (SidebarSearch, SidebarChatList, SidebarProjectList) | High |
| `ChatComposer.tsx` | Extract model selector, brain/random toggles into reusable sub-components | Medium |
| `ProjectCard.tsx` | Use BentoCard primitive or Surface component | Medium |
| `LoadingSkeleton.tsx` | Add more skeleton variants (card, list-item, table-row) | Low |
| `MessageList.tsx` | Improve empty state, add loading variant | Low |
| `ConfirmDialog.tsx` | Use Surface component | Low |
| `ErrorBanner.tsx` (if it exists as separate import) | Ensure it uses design tokens | Low |

### 2E. Components That Should Become Reusable Primitives

| Primitive | Used By | Notes |
|-----------|---------|-------|
| `BentoGrid` | Projects page, Dashboard | CSS Grid-based, responsive columns |
| `BentoCard` | Projects, Settings sections | Variants: default, featured, compact, metric, action |
| `Surface` / `Panel` | Settings, Detail pages | Card-like container, consistent padding/border/radius |
| `Button` | Everywhere | Replace `.btn-primary` + inline `<button>` with component |
| `Input` / `FormField` | Settings, Projects create form | Consistent height, label, error state |
| `EmptyState` | Projects, Chat, Sidebar | Icon + title + description + action |
| `Skeleton` | Loading everywhere | Extend with more variants |
| `Badge` / `Pill` | Model status, provider tags | Reusable tag/pill component |
| `Toggle` / `Switch` | Brain/Random toggles | Already exists as `.toggle-switch` class, make component |

### 2F. Pages Ranked by Priority

| Priority | Page | Why | Bento Grid? |
|----------|------|-----|-------------|
| 1 | `/projects` | Main organizational hub, multiple distinct sections | ✅ Yes (3-4 cards: stats, starred, recent, all projects) |
| 2 | `/projects/[projectId]` | Needs better hierarchy for chats + actions | ✅ Maybe (header + stats bar + chat list in bento) |
| 3 | `/settings` | Very long single column — needs panel grouping | ❌ No (use Surface/Panel grouping) |
| 4 | `/chat/[chatId]` | Already a chat UX — keep focused | ❌ No (chat is linear) |
| 5 | `/chat` | Random chat creation — simple, keep focused | ❌ No |
| 6 | `/projects/starred` | Simple list — already fine | ❌ No |
| 7 | `/` | Redirects to `/chat` | N/A |

### 2G. Risk Areas Where Functionality Could Break

| Risk Area | Reason | Mitigation |
|-----------|--------|------------|
| Chat composer (disabled/loading states) | Critical path for main app | Touch CSS only, don't refactor logic |
| Sidebar (data loading, navigation) | Complex state mgmt + event-based refresh | Refactor presentation only, keep data hooks |
| Settings (model enable/disable + persist) | Many API calls, form values, callbacks | Add Panel wrapper only, don't touch handlers |
| Project create form | Inline in projects page | Extract form but keep same API calls |
| ConfirmDialog | Used by chat delete + sidebar delete | Keep same API, improve styling only |
| AI stream rendering | Critical UX for chat | Don't touch |
| SSE parser + message state | Core data flow | Don't touch |

### 2H. Migration Plan (Small Safe Steps)

```
Step 1:   Create design tokens (CSS variables + SCSS shared variables)
Step 2:   Build reusable primitives (Surface, Button, Input, EmptyState, Skeleton)
Step 3:   Build BentoGrid + BentoCard components
Step 4:   Refactor Settings page (add Panel groups, use Surface)
Step 5:   Refactor Projects page (apply BentoGrid)
Step 6:   Refactor Project Detail page (improve hierarchy, add BentoCard)
Step 7:   Refactor Sidebar (split into sub-components)
Step 8:   General polish (transitions, focus states, empty states)
Step 9:   Build & test verification
```

Each step is independently testable. Any step can be rolled back without affecting other steps.

---

## Phase 3 — Design System Token Design

### 3A. Color Token Architecture

```scss
// === LIGHT/DARK THEME VARIABLES ===
// Current app is dark-only. Design for dark-first with future light mode.
// Expose ALL color values as CSS custom properties.

:root {
  // Backgrounds
  --color-bg: #0a0a0f;
  --color-bg-secondary: #12121a;
  --color-bg-tertiary: #1a1a24;
  --color-bg-elevated: #1e1e2a;       // NEW: elevated surfaces

  // Surfaces (for cards, panels, dialogs)
  --color-surface: #12121a;
  --color-surface-elevated: #1a1a24;
  --color-surface-hover: #1e1e2a;     // NEW

  // Text
  --color-text: #e0e0e0;
  --color-text-muted: #888888;        // was --color-text-dim
  --color-text-subtle: #666666;       // NEW: lowest emphasis
  --color-text-inverse: #0a0a0f;      // for accent-on-dark-bg scenarios

  // Borders
  --color-border: #2a2a3a;
  --color-border-light: #33334a;      // NEW: subtle borders
  --color-border-hover: #44445a;      // NEW

  // Accents (semantic)
  --color-accent: #9ad933;
  --color-accent-hover: #a8e63d;      // NEW
  --color-accent-dim: rgba(154, 217, 51, 0.15);
  --color-neon: #5cf2c2;

  // Semantic colors
  --color-danger: #ef4444;
  --color-danger-dim: rgba(239, 68, 68, 0.15);
  --color-warning: #f59e0b;
  --color-warning-dim: rgba(245, 158, 11, 0.15);
  --color-info: #3b82f6;
  --color-info-dim: rgba(59, 130, 246, 0.15);
  --color-success: #22c55e;
  --color-success-dim: rgba(34, 197, 94, 0.15);
  --color-purple: #a855f7;
  --color-purple-dim: rgba(168, 85, 247, 0.15);
  --color-orange: #f97316;
  --color-orange-dim: rgba(249, 115, 22, 0.15);
}
```

### 3B. Radius Tokens

```scss
--radius-none: 0;
--radius-sm: 4px;
--radius-md: 6px;       // current default
--radius-lg: 8px;       // cards, buttons
--radius-xl: 12px;      // modals, main cards
--radius-full: 9999px;  // pills, badges
```

### 3C. Shadow Tokens

```scss
--shadow-none: 0 0 transparent;
--shadow-soft: 0 1px 3px rgba(0, 0, 0, 0.3);
--shadow-card: 0 2px 8px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2);
--shadow-elevated: 0 4px 16px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3);
--shadow-dialog: 0 8px 32px rgba(0, 0, 0, 0.5);
```

### 3D. Typography Scale

```scss
--font-sans: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;

--text-xs: clamp(0.75rem, 1.5vw, 0.8125rem);
--text-sm: clamp(0.8125rem, 1.8vw, 0.875rem);
--text-base: clamp(0.9375rem, 2vw, 1rem);
--text-lg: clamp(1.0625rem, 2.5vw, 1.125rem);
--text-xl: clamp(1.125rem, 3vw, 1.25rem);
--text-2xl: clamp(1.25rem, 4vw, 1.5rem);
--text-3xl: clamp(1.5rem, 5vw, 1.875rem);
--text-4xl: clamp(1.875rem, 6vw, 2.25rem);

--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;

--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.625;
```

### 3E. Spacing Scale

```scss
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;

// Specific semantic tokens
--space-card-padding: var(--space-4);
--space-section-gap: var(--space-8);
--space-element-gap: var(--space-3);
--space-grid-gap: var(--space-4);
--space-grid-gap-sm: var(--space-3);
```

### 3F. Z-Index Scale

```scss
--z-base: 1;
--z-dropdown: 10;
--z-sticky: 20;
--z-composer: 30;
--z-header: 40;
--z-sidebar: 50;
--z-overlay: 60;
--z-dialog: 70;
--z-toast: 80;
--z-tooltip: 90;
```

### 3G. Motion Tokens

```scss
--duration-instant: 0ms;
--duration-fast: 100ms;
--duration-normal: 200ms;
--duration-slow: 300ms;

--ease-linear: linear;
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
```

### 3H. SCSS ↔ CSS Variable Sync

```scss
// _variables.scss — keep SCSS variables but make them reference CSS vars
// This way SCSS modules and modern CSS both use the same values.

// Example approach:
$color-bg: var(--color-bg);
$color-text: var(--color-text);
// etc.

// But Sass cannot dynamically resolve CSS variables in some contexts (e.g., color.scale).
// Solution: keep both — SCSS variables for internal use (color.scale, rgba calculations)
// and CSS custom properties for runtime theming. Document the duplication.
```

---

## Phase 4 — Reusable UI Primitives (Component Architecture)

### 4A. AppShell (already exists as LayoutShell)

**Changes**:
- Refine responsive breakpoints to use CSS variables.
- Add proper transition for sidebar mode changes.
- Ensure mobile overlay uses backdrop-filter consistently.
- No logic changes.

### 4B. BentoGrid Component

```tsx
// Props:
// - columns: { default: 3, tablet: 2, mobile: 1 } | number
// - gap: CSS var token (default: --space-grid-gap)
// - children: BentoCard[]
// - as: 'div' | 'section' (default: div)

// CSS:
.bento-grid {
  display: grid;
  grid-template-columns: repeat(var(--bento-columns, 3), 1fr);
  gap: var(--space-grid-gap);

  @container (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @container (max-width: 480px) {
    grid-template-columns: 1fr;
  }
}
```

### 4C. BentoCard Component

```tsx
// Variants:
// - 'default' — standard card
// - 'featured' — spans 2 columns on desktop, higher elevation
// - 'compact' — smaller padding, minimal content
// - 'metric' — big number + label
// - 'action' — primary CTA, prominent styling
// - 'media' — image/visual dominant

// Props:
// - variant: BentoCardVariant
// - span: { desktop?: number, tablet?: number } (default: 1)
// - title?: string
// - description?: string
// - icon?: ReactNode
// - visual?: ReactNode (for media variant)
// - actions?: ReactNode (bottom action buttons)
// - className?: string
// - onClick?: () => void
// - href?: string
// - as?: 'div' | 'article' | 'button' | 'a'

// CSS approach:
.bento-card {
  padding: var(--space-card-padding, 16px);
  border-radius: var(--radius-lg);
  background: var(--color-surface-elevated);
  border: 1px solid var(--color-border);
  transition: all var(--duration-fast) var(--ease-out);

  &:hover {
    border-color: var(--color-border-hover);
    box-shadow: var(--shadow-card);
    transform: translateY(-1px);
  }

  &.variant-featured {
    grid-column: span 2;
    background: var(--color-surface-hover);
    box-shadow: var(--shadow-elevated);
  }

  &.variant-compact {
    padding: var(--space-3);
  }

  &.variant-metric {
    text-align: center;
    .metric-value {
      font-size: var(--text-3xl);
      font-weight: var(--font-weight-bold);
    }
  }
}
```

### 4D. Surface / Panel Component

```tsx
// Generic card-like container for non-bento use (Settings, Detail pages)
// Props:
// - variant: 'default' | 'elevated' | 'inset'
// - padding?: boolean (default: true)
// - className?: string
```

### 4E. Button System

```tsx
// Variants:
// - primary (accent bg, dark text)
// - secondary (transparent, border)
// - ghost (no border, no bg until hover)
// - danger (red tint)
// - icon (square, icon only)

// Sizes:
// - sm, md (default), lg

// Props:
// - variant, size, loading, disabled, icon, children, onClick, type, href, className
// - If `href` provided, renders as `<a>` with same styling
```

### 4F. Input / FormField

```tsx
// FormField wraps label + input + error + help text
// Input handles styling, focus ring, disabled state
// Textarea variant

// Props:
// - label, name, error, helpText, required, disabled, placeholder
// - All standard input props passed through
```

### 4G. EmptyState Component

```tsx
// Props:
// - icon?: ReactNode (default: contextual emoji)
// - title: string
// - description?: string
// - action?: { label: string, onClick: () => void }
// - variant?: 'default' | 'compact'

// Friendly, warm design. No dead screens.
// "Affinity" style — human warmth, not sterile.
```

### 4H. Skeleton Component

```tsx
// Variants:
// - text (single line)
// - card (rectangle with rounded corners)
// - avatar (circle)
// - custom (via className)

// Props:
// - variant, width?, height?, count?
```

### 4I. Badge / Pill Component

```tsx
// Props:
// - variant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
// - size: 'sm' | 'md'
// - children, className

// For: model status, provider tags, free/paid labels, chat counts.
```

---

## Phase 5 — Page Refactor Priority

### 5A. Projects Page (`/projects`) — HIGHEST PRIORITY

**Current**:
- Single-column list with accordion expand.
- Manual border/radius/padding on project items.
- Show/hide create form inline.
- Basic empty state.

**Target**:
- Use BentoGrid with 3 columns on desktop, 2 on tablet, 1 on mobile.
- Featured card: stats/progress overview (or "Create Project" CTA if no projects).
- Secondary cards: Starred projects, Recent activity, All projects (as a compact list card).
- Keep create form as a modal or slide-in panel (not inline).
- Use BentoCard variants for each section.
- Use EmptyState when no projects exist.
- Existing accordion expand behavior preserved (click project → expand + show chats).

**Bento grid layout (desktop)**:
```
┌─────────────────┐ ┌──────────────┐ ┌──────────────┐
│     Featured    │ │   Starred    │ │   Activity   │
│   "3 Projects"  │ │  (project    │ │  (recent     │
│   "12 chats"    │ │   badges)    │ │   activity)  │
│   + New Project │ │              │ │              │
└─────────────────┘ └──────────────┘ └──────────────┘
┌─────────────────────────────────────────────────────┐
│                  All Projects                       │
│  (scrollable list — or compact cards)               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ Project1 │ │ Project2 │ │ Project3 │            │
│  └──────────┘ └──────────┘ └──────────┘            │
└─────────────────────────────────────────────────────┘
```

### 5B. Project Detail (`/projects/[projectId]`) — MEDIUM

**Current**:
- Header with color dot + name + star + back button.
- Full-width "New Chat" button.
- Flat list of chat items.

**Target**:
- Improved header section with project stats in a compact bento/metric card.
- Chat list as a scrollable list with better spacing and hover effects.
- Use Surface for the chat list container.
- Sticky "New Chat" button only when scrolled (or always visible).

### 5C. Settings (`/settings`) — MEDIUM

**Current**:
- Single long column, 734 lines.
- Provider tabs (Chat / Zen / NVIDIA) inline.
- Key fields, model lists, clean-random section all stacked.
- Model sections can collapse but still visually crowded.

**Target**:
- Group into Surface/Panel sections with clear headings.
- Tab container uses proper pill-tab design.
- Model list section is scrollable within its panel.
- Clean-random chat settings in its own panel.
- Maintain all existing API calls and handlers — presentation layer only.

### 5D. Chat Pages (`/chat`, `/chat/[chatId]`) — LOW

**Current**:
- Clean chat UX with streaming.
- Header bar, message list, composer, toggles.
- Already focused and functional.

**Target**:
- Refine spacing and typography tokens.
- Improve bubble styling with design tokens.
- Better empty state for new chats.
- Keep the existing layout — no bento grid, no card grid.

### 5E. Sidebar — MEDIUM

**Current**:
- 514-line monolithic component.
- Three modes: full, icons, hidden.
- Search + random chats + projects + starred + settings link.
- Full CRUD for chats and projects.

**Target**:
- Split into sub-components: `SidebarSearch`, `SidebarChatList`, `SidebarProjectList`, `SidebarFooter`.
- Keep same data loading, event listeners, state management.
- Improve visual hierarchy with design tokens.
- Improve mobile overlay transitions.
- No functional changes.

---

## Phase 6 — CSS Implementation Rules

### 6A. CSS Grid for Page Structure

```css
.page-layout {
  display: grid;
  grid-template-columns: var(--sidebar-width) 1fr;
  grid-template-rows: var(--header-height) 1fr;
  grid-template-areas:
    "header header"
    "sidebar main";
  height: 100vh;
}

/* On tablet */
@media (max-width: 1024px) {
  .page-layout {
    grid-template-columns: var(--sidebar-width-icons) 1fr;
  }
}

/* On mobile — sidebar becomes overlay */
@media (max-width: 768px) {
  .page-layout {
    grid-template-columns: 1fr;
  }
}
```

### 6B. Flexbox for Internal Alignment

```css
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.action-row {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}
```

### 6C. Clamp for Fluid Typography & Spacing

```css
:root {
  --text-fluid-sm: clamp(0.75rem, 1.5vw, 0.875rem);
  --text-fluid-base: clamp(0.875rem, 2vw, 1rem);
  --text-fluid-lg: clamp(1rem, 2.5vw, 1.25rem);
  --text-fluid-xl: clamp(1.25rem, 3vw, 1.5rem);
  --text-fluid-2xl: clamp(1.5rem, 4vw, 2rem);

  --space-fluid-sm: clamp(8px, 1.5vw, 12px);
  --space-fluid-md: clamp(12px, 2vw, 16px);
  --space-fluid-lg: clamp(16px, 3vw, 24px);
  --space-fluid-xl: clamp(24px, 4vw, 32px);
}
```

### 6D. Container Queries

```css
/* For bento cards that need to respond to their container */
.bento-card {
  container-type: inline-size;
}

@container (max-width: 300px) {
  .bento-card .card-content {
    flex-direction: column;
  }
  .bento-card.variant-metric .metric-value {
    font-size: var(--text-xl);
  }
}
```

### 6E. No Magic Numbers

```css
/* ❌ Bad */
padding: 18px; /* Why 18? */
margin-top: -3px; /* Why -3? */
width: 47%; /* Why 47%? */

/* ✅ Good */
padding: var(--space-4); /* 4 × 4px base = 16px */
margin-top: calc(-1 * var(--space-1));
width: calc((100% - var(--space-grid-gap)) / 2);
```

---

## Phase 7 — Visual Style Direction

### 7A. Overall Design Language

- **Clean SaaS/product interface** — functional, not decorative.
- **Slight premium feel** — elevated surfaces, soft shadows, refined borders.
- **Controlled bento grid** — used only where it adds value (Projects page).
- **Strong headings** — `font-weight: 700`, fluid sizing, clear hierarchy.
- **Soft depth** — card shadows, subtle hover lifts, border glow on interaction.
- **Dark mode refined** — "Obsidian" premium dark surfaces (`#0a0a0f` → `#1a1a24` gradient).
- **Human warmth** — friendly empty states, clear helper text, minimal noise.
- **No AI-looking gradients** — no neon-overload, no chaotic color shifts.

### 7B. "Tech Spec" for Dashboard/System Pages

- Wide letter tracking for labels.
- Strict alignment (grid).
- Monospace for data values.
- Accent color only for highlights.
- Grayscale + one accent for clarity.
- **Where**: Settings page, project stats, model selection.

### 7C. "Affinity" for Empty States and Helper Text

- Friendly, rhythmic typography.
- Soft rounded elements.
- Warm, approachable tone in copy.
- **Where**: Empty states, onboarding, error messages.

### 7D. "Glass Block" for Background Layers

- Translucent surfaces with `backdrop-filter: blur(12px)`.
- **Where**: Header bar background, overlay backgrounds, dialog backdrop.
- Not on cards or content areas (reduces readability).

### 7E. "Acid Fade" as Small Accent

- Subtle gradient for active state glow or brand highlight.
- Tiny dose — e.g., loading indicator, active tab underline.
- **Not** full-page gradients or card backgrounds.

---

## Phase 8 — Motion & Interaction Guidelines

### 8A. Micro-interactions

| Element | Interaction | Duration | Easing |
|---------|-----------|----------|--------|
| Button | bg color + slight scale on hover/active | 150ms | ease-out |
| Card | translateY(-1px) + shadow lift on hover | 200ms | ease-out |
| Sidebar | slide open/close | 300ms | cubic-bezier(0.4, 0, 0.2, 1) |
| Toggle switch | knob slide + bg color | 200ms | ease-out |
| Dialog | fade-in + scale-in | 200ms | ease-out |
| Skeleton | shimmer animation | 1.5s | linear |
| Form field | border color change on focus | 150ms | ease-out |
| Theme change | bg/text color transition | 300ms | ease-in-out |

### 8B. Reduced Motion

Always respect `prefers-reduced-motion: reduce`:
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```
(Already in `_mixins.scss` — ensure it's applied everywhere.)

### 8C. Animation Rules

- Keep animations under 200ms for common interactions.
- Do not animate large layout changes unnecessarily.
- No heavy animation libraries (no framer-motion, no GSAP).
- CSS-only animations preferred.
- No parallax or 3D transforms unless there is a clear UX need (none identified yet).

---

## Phase 9 — Accessibility & Performance

### 9A. Accessibility Checklist

- [ ] Color contrast >= 4.5:1 for normal text, >= 3:1 for large text (WCAG AA).
- [ ] All interactive elements keyboard-navigable.
- [ ] Visible focus ring on all interactive elements (use `focus-visible`).
- [ ] `<button>` for actions, `<a>` for navigation.
- [ ] Form inputs have associated `<label>` elements.
- [ ] Cards with `onClick` have `role="button"` + `tabIndex={0}` + `onKeyDown`.
- [ ] Images have `alt` text when meaningful, `alt=""` when decorative.
- [ ] Loading skeletons don't cause layout shift (fixed dimensions).
- [ ] Semantic HTML (`<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`).
- [ ] ARIA labels on icon-only buttons.

### 9B. Performance Checklist

- [ ] CSS effects over JS effects for animations.
- [ ] No unnecessary dependencies.
- [ ] Lazy-load heavy assets if any.
- [ ] Bundle size impact of new components minimal (no external animation libs).
- [ ] No excessive DOM nesting.
- [ ] Container queries instead of JS resize observers.

---

## Phase 10 — Deliverables

### Files to Create/Modify (in order)

| File | Action | Step |
|------|--------|------|
| `.hermes/plans/layut-optimization.md` | Create | This file |
| `docs/ui-modernization-study-2026.md` | Create | Phase 1 extract |
| `docs/ui-refactor-audit.md` | Create | Phase 2 extract |
| `src/styles/_variables.scss` | Refactor: add CSS variables, new tokens | Step 1 |
| `src/app/globals.scss` | Refactor: add CSS variables to :root, expand tokens | Step 1 |
| `src/components/ui/BentoGrid.tsx` | Create | Step 3 |
| `src/components/ui/BentoCard.tsx` | Create | Step 3 |
| `src/components/ui/Surface.tsx` | Create | Step 2 |
| `src/components/ui/Button.tsx` | Create | Step 2 |
| `src/components/ui/Input.tsx` | Create | Step 2 |
| `src/components/ui/FormField.tsx` | Create | Step 2 |
| `src/components/ui/EmptyState.tsx` | Create | Step 2 |
| `src/components/ui/Skeleton.tsx` | Refactor: extend LoadingSkeleton | Step 2 |
| `src/components/ui/Badge.tsx` | Create | Step 2 |
| `src/components/ui/index.ts` | Create: barrel exports | Step 2 |
| `src/app/settings/page.tsx` | Refactor: add Surface panels | Step 4 |
| `src/app/projects/page.tsx` | Refactor: apply BentoGrid | Step 5 |
| `src/app/projects/[projectId]/page.tsx` | Refactor: improve hierarchy | Step 6 |
| `src/components/Sidebar.tsx` | Refactor: split into sub-components | Step 7 |
| `src/components/SidebarSearch.tsx` | Create | Step 7 |
| `src/components/SidebarChatList.tsx` | Create | Step 7 |
| `src/components/SidebarProjectList.tsx` | Create | Step 7 |
| `src/components/SidebarFooter.tsx` | Create | Step 7 |
| `docs/ui-refactor-final-report.md` | Create | Final |

### Pages NOT to Refactor

| Page | Reason |
|------|--------|
| `/` | Redirect only, no UI |
| `/chat` | Simple page, minimal UI |
| `/chat/[chatId]` | Chat UX should stay focused on conversation, not decorative layout |
| `/projects/starred` | Simple filtered list, already works |

### Success Criteria Summary

- ✅ App builds and runs without errors.
- ✅ No broken routes, data flow, forms, API calls, or business logic.
- ✅ UI feels clearly more modern.
- ✅ Main pages (Projects, Settings, Project Detail) have stronger visual hierarchy.
- ✅ Layout is responsive on mobile/tablet/desktop.
- ✅ Design tokens are centralized in CSS variables + SCSS.
- ✅ Components are more reusable (BentoGrid, BentoCard, Surface, Button, Input, EmptyState).
- ✅ Bento grids are used intentionally — Projects page only.
- ✅ CSS is cleaner and less duplicated.
- ✅ Accessibility is improved or at least not degraded.
- ✅ Performance is not worsened by decorative effects.
- ✅ `prefers-reduced-motion` is respected.

---

## Validation Commands

After each step, run:

```bash
# Lint
npm run lint

# TypeCheck
npm run typecheck

# Build
npm run build

# Test
npm run test
```

Before starting any coding: verify `npm install` is up to date and the app can start in dev mode (`npm run dev`).

---

## Notes & Assumptions

1. **Dark-only**: The app is currently dark-only (`<html lang="en" className="dark">`). We design for dark-first. A future light mode would add a `[data-theme="light"]` selector to the same CSS variables.
2. **No framework theme library**: We use CSS variables + SCSS. No CSS-in-JS, no Tailwind theme plugin changes needed.
3. **Tailwind 4**: The project uses `@tailwindcss/postcss` with Tailwind 4 and a `tailwind.config.js` for backward compatibility. We keep Tailwind for utility classes but add our own design token layer.
4. **Container queries**: `@container` is supported in all modern browsers (Chrome 105+, Firefox 110+, Safari 16+). The project targets modern browsers (Next.js 16), so this is safe.
5. **No framer-motion**: The user preference is to avoid heavy animation libraries. We use CSS transitions and animations only.
6. **Existing business logic is sacred**: We touch presentation layer only. State management, API calls, data fetching, routing, and database logic remain untouched.
