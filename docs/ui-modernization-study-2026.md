# UI Modernization Study — 2026 Reference Extraction

> Practical rules extracted from 4 reference materials for the Strubloid UI refactor.
> Source: `.hermes/plans/layut-optimization.md`

---

## 1. Bento Grid Rules

### What makes a grid "bento"
1. **Strict compartmentalization** — every item lives in its own box. Cognitive chunking.
2. **Size = visual hierarchy** — MOST important content gets LARGEST box. Eye tracking: users fixate **2.6× longer** on larger items regardless of position.
3. **Uniform spacing** — identical gutters everywhere.

### Size tiers
| Box | Use |
|-----|-----|
| 1×1 | Supporting features, secondary actions |
| 2×1 | Mid-tier, horizontal emphasis |
| 2×2 | Hero feature, primary value |
| 3×2 | Detailed demos |

### Standard gutters
- Desktop: 16–24px
- Tablet: 12–16px
- Mobile: 12px

### Base unit system
Pick one base unit (8px or 12px). Everything else = multiples of base unit. Card sizes, gutters, padding, radius — all aligned.

### When to USE bento
- Feature showcases (5–10 distinct items)
- Dashboard overviews (mix of charts/lists/metrics)
- Landing/hero with multiple value props
- Portfolio pages

### When NOT to use bento
- Simple lists / tables
- Pages with single primary action
- Settings / config pages (use grouped panels)
- Forms (bento creates awkward field layouts)
- Chat message streams (linear reading)
- Sequential detail pages

### Anti-pattern: "random card grid"
Avoid: arbitrary card sizes, mismatched gutters, no clear hierarchy, decorative-only bento.

---

## 2. Modern CSS Layout Rules

- **CSS Grid → page/section structure** (macro layout)
- **Flexbox → internal alignment** (local alignment inside cards/components)
- **`clamp()` → responsive type & spacing** (no JS, no breakpoints)
- **Container queries → components that respond to their own size** (`container-type: inline-size`)
- Avoid fixed pixel-heavy layouts — use `min()`, `max()`, `clamp()`
- Avoid layout JS when CSS can solve it
- Semantic HTML + maintainable class names over utility-only soup
- No magic numbers — prefer tokens (`var(--space-*)` etc.)

---

## 3. 2026 Visual Direction

| Trend | Where it applies in this app |
|-------|------------------------------|
| Bento/card composition | **Projects page only** (controlled, intentional) |
| Fluid responsive layouts | Whole app — `clamp()`, auto-fit grids from the start |
| Advanced dark mode | Already dark; refine "Obsidian" premium surfaces |
| Performance-first design | CSS-only effects, no animation libs |
| Smarter micro-interactions | Buttons, cards, toggles, skeletons, theme changes |
| Bold typography + variable fonts | Strong headings, fluid sizing |
| Glass Block (translucent layers) | Header bar background only — not on content |
| Tech Spec precision | Settings, project stats, model selection — wide tracking, mono, accent-only highlights |
| Affinity / human warmth | Empty states, helper text, friendly copy |
| Acid Fade (small accent gradients) | Loading shimmer, active-tab underline, brand highlight only |
| 3D / parallax / motion | NEVER for decoration — only usefulness |

---

## 4. Anti-Patterns

- ❌ Bento grids everywhere
- ❌ Too many gradients
- ❌ Too many glass effects (kills readability)
- ❌ Heavy animations hurting performance
- ❌ Low contrast text (WCAG AA)
- ❌ Tiny unreadable cards
- ❌ Cards with zero hierarchy (all same size)
- ❌ Layouts that look modern but reduce usability
- ❌ Decorative effects hiding the actual product value
- ❌ AI-looking sterile gradients everywhere

---

## 5. Design Decisions for Strubloid

1. **Dark-only, dark-first** — no light theme yet, but token system is theme-ready.
2. **CSS variables over SCSS variables for runtime theming** — SCSS kept for tooling (color scaling) but values mirror CSS vars.
3. **Bento limited to Projects page** — only place with multiple distinct sections that benefit from size-based hierarchy.
4. **Refuse all heavy animation libs** — CSS only, respect `prefers-reduced-motion`.
5. **Business logic untouched** — presentation layer only.

Full audit + plan: `.hermes/plans/layut-optimization.md`.
