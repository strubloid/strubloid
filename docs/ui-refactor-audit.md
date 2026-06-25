# UI Refactor Audit — Strubloid

> Audit of current Strubloid UI problems, ranked risks, and migration plan.
> Source plan: `.hermes/plans/layut-optimization.md`

---

## Current UI Problems

| # | Problem | Severity |
|---|---------|----------|
| 1 | Sidebar is a 514-line monolithic component | High |
| 2 | Settings page is 734 lines, no panel grouping | High |
| 3 | No consistent card component — manual borders/padding everywhere | High |
| 4 | Mixed CSS variable + inline Tailwind approaches | Medium |
| 5 | `$color-text-dim` not exposed as full token family (`mapped`/`muted`/`subtle`) | Medium |
| 6 | No Container Query usage (all responsive via breakpoint utilities) | Medium |
| 7 | No form field component — raw `<input>` with manual styling | Medium |
| 8 | Empty states are inline JSX, no reusable `EmptyState` | Medium |
| 9 | Inconsistent section heading pattern (`.section-header` SCSS + inline Tailwind classes) | Low–Med |
| 10 | Color variables in SCSS partially missing from CSS vars | Low |
| 11 | No visible badge/pill component for status labels | Low |
| 12 | No skeleton variants for card/list-item | Low |
| 13 | SCSS modules import variables paths differently | Low |
| 14 | Chat bubble styling hardcoded in `globals.scss` (not via tokens) | Low |

## Current UX Problems

| # | Problem | Impact |
|---|---------|--------|
| 1 | Settings is overwhelming as single column | User friction |
| 2 | Empty states lack clear next action in places | Discovery |
| 3 | Inconsistent destructive-action confirmation styles | Safety |
| 4 | Project create form is inline (intrusive) | Layout shift |
| 5 | No server-side search in sidebar (client filter only after fetch) | Scale |
| 6 | No keyboard shortcut docs | Power user bug |
| 7 | Mobile sidebar has no swipe gesture | Mobile UX gap |
| 8 | No undo for destructive actions | Data loss risk |

## Inconsistencies

### Spacing
- Section gaps: `mb-4`, `mb-6`, `mb-8` randomly applied.
- No token-driven spacing scale used across components.

### Color
- `$color-danger/warning/info/purple/orange` defined in SCSS but **not** in CSS vars.
- Hardcoded `red-500/10`, `red-900/30`, `bg-blue-600`, `text-green-400` etc. inline.

### Typography
- Heading sizes: `$font-size-2xl` SCSS only, no CSS var.
- Body: `text-sm`, `text-xs` mixed, no token.

## Pages Ranked by Priority

| Priority | Page | Bento Grid? |
|----------|------|-------------|
| 1 | `/projects` | ✅ Yes |
| 2 | `/projects/[projectId]` | Limited (metric card) |
| 3 | `/settings` | ❌ (grouped panels) |
| 4 | `/chat/*` | ❌ (linear) |
| 5 | `/projects/starred` | ❌ (simple list) |

## Risk Areas

| Area | Risk | Mitigation |
|------|------|------------|
| Chat composer (disabled/loading) | Critical path | CSS-only tweaks |
| Sidebar data + events (complex state) | Complex | Split sub-components, keep data hooks |
| Settings (model enable/disable persists) | Many handlers | Surface wrappers only, no handler changes |
| ConfirmDialog (used by chat + sidebar delete) | Used widely | Same API, refined style only |
| AI stream rendering | Core | Don't touch |

## Components to Refactor

| Component | Change |
|-----------|--------|
| `LayoutShell` | Refined responsive breakpoints + transitions |
| `Sidebar` (+ split sub-components) | Split: `SidebarSearch`, `SidebarChatList`, `SidebarProjectList`, `SidebarFooter` |
| `ProjectCard` | Use `BentoCard` primitive |
| `LoadingSkeleton` | Extend with more variants |
| `MessageList` | Better empty state |
| `ConfirmDialog` | Use `Surface`, refined button styling |
| `HeaderBar` | Use `Button`/`Badge` primitives |
| `ChatComposer` | Refine spacing tokens |

## Components to Become Reusable

- `BentoGrid`, `BentoCard` (6 variants), `Surface`/`Panel`, `Button` (5 variants), `FormField`/`Input`, `EmptyState`, `Skeleton` (variants), `Badge`/`Pill`

## Migration Plan (9 steps, each independently buildable + rollbackable)

```
Step 1: Design tokens — variables.scss + globals.scss
Step 2: Build primitives (Surface, Button, Input, FormField, EmptyState, Skeleton, Badge)
Step 3: Build BentoGrid + BentoCard
Step 4: Refactor Settings (add Surface panels)
Step 5: Refactor Projects page (apply BentoGrid)
Step 6: Refactor Project Detail (improve hierarchy)
Step 7: Refactor Sidebar (split sub-components)
Step 8: General polish (transitions, focus, empty states, hover)
Step 9: Lint/typecheck/build/test verification
```

Full plan, files-to-touch, success criteria: `.hermes/plans/layut-optimization.md`.
