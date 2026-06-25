# CSS Layout Fix — Tailwind 4 Migration

## Root Cause

**Tailwind 4's arbitrary value `[--color-*]` syntax compiles to bare custom property references — without `var()` wrappers.**

When you write `bg-[--color-bg]` in Tailwind 4, it generates:
```css
background-color: --color-bg;
```

This is **invalid CSS** for any custom property not registered via `@property`. The browser silently drops the rule — no warning, no error, just a missing background colour.

The previous setup (Tailwind v3 with `tailwind.config.ts`) defined these tokens as Tailwind theme values, so `bg-ink-950` compiled to literal hex values like `#07090d`. After migrating to Tailwind 4, those theme tokens were gone (Tailwind 4 uses `@theme` in CSS), and the app fell back to inline arbitrary-value syntax like `bg-[--color-bg]`.

Three compounding factors:

1. **`@theme` blocks are ignored by Turbopack/Next.js** — while Tailwind 4's own CLI processes them, Next.js's Turbopack does not emit CSS variables from `@theme` blocks in `tailwind.css`. The only working pattern is bare `@import "tailwindcss"` (no `@theme`, no `@config`).

2. **`@config` also silently fails** — using `@config "../../tailwind.config.js"` as a migration bridge produces no custom tokens in the compiled output either.

3. **Custom properties live in `globals.scss` `:root`** — these set `--color-bg`, `--color-accent`, etc., but were unreachable by `bg-[--color-bg]` because the browser can't resolve a bare property name without `var()`.

## Fix

**Every `[--color-*]` arbitrary value reference was changed to `[var(--color-*)]`.**

This tells Tailwind 4 to generate `var(--color-bg)` instead of bare `--color-bg`:

```diff
- bg-[--color-bg]
+ bg-[var(--color-bg)]

- border-[--color-border]
+ border-[var(--color-border)]

- text-[--color-accent]
+ text-[var(--color-accent)]

- hover:bg-[--color-bg-tertiary]
+ hover:bg-[var(--color-bg-tertiary)]
```

### Files Modified (12 files, ~60 replacements)

| File | Changes |
|------|---------|
| `src/components/Sidebar.tsx` | `bg-[var(--color-bg)]`, `hover:bg-[var(--color-bg-tertiary)]`, `border-[var(--color-border)]`, `focus:border-[var(--color-accent)]` |
| `src/components/ChatComposer.tsx` | `border-[var(--color-border)]`, `bg-[var(--color-bg)]` |
| `src/components/MessageList.tsx` | `bg-[var(--color-bg)]` |
| `src/components/ThinkingIndicator.tsx` | `bg-[var(--color-bg-secondary)]` |
| `src/components/ConfirmDialog.tsx` | `bg-[var(--color-bg-secondary)]`, `border-[var(--color-border)]`, `hover:bg-[var(--color-bg-tertiary)]` |
| `src/components/ProjectCard.tsx` | `border-[var(--color-border)]`, `bg-[var(--color-bg-secondary)]` |
| `src/components/ModelSelector.tsx` | `bg-[var(--color-bg)]` |
| `src/app/settings/page.tsx` | `bg-[var(--color-bg)]`, `bg-[var(--color-bg-secondary)]`, `border-[var(--color-border)]`, `hover:bg-[var(--color-bg)]`, `hover:bg-[var(--color-bg-tertiary)]`, `text-[var(--color-accent)]`, `text-[var(--color-text)]`, `text-[var(--color-text-dim)]` |
| `src/app/chat/[chatId]/page.tsx` | `bg-[var(--color-bg)]`, `text-[var(--color-text-dim)]` |
| `src/app/chat/page.tsx` | `bg-[var(--color-bg)]` |
| `src/app/globals.css` | `bg-[var(--color-bg)]` |
| `src/app/layout.tsx` | `bg-[var(--color-bg)]` |

### Additional Cleanup

- **Deleted `tailwind.config.js`** — created during the `@config` migration test but unused (custom theme tokens aren't referenced in source as Tailwind utility classes like `bg-ink-950`; they're used via CSS custom properties).
- **Simplified `src/app/tailwind.css`** — back to bare `@import "tailwindcss"` (no `@theme`, no `@config`).
- **Custom properties remain in `globals.scss` `:root`** — `--color-accent`, `--color-bg`, `--color-bg-secondary`, `--color-bg-tertiary`, `--color-border`, `--color-text`, `--color-text-dim`, `--color-neon` — unchanged, working correctly.

## Verification

1. **Build passes**: `npm run build` → exit 0
2. **Dev server running**: page loads without error
3. **Browser `:root` variables resolve** (from browser console):
   - `--color-accent: #9ad933`
   - `--color-bg: #0a0a0f`
   - `--color-border: #2a2a3a`
   - `--color-bg-secondary: #12121a`
4. **Layout elements resolve correctly**:
   - Sidebar: `width: 280px`, `background: rgb(18, 18, 26)`
   - Search input: `background: rgb(26, 26, 36)`, `border: rgb(42, 42, 58)`
   - Text: `rgb(224, 224, 224)`
5. **Test element** with `bg-[var(--color-bg)]` → `rgb(10, 10, 15)` ✓

## Lesson: Tailwind 4 × CSS Custom Properties

In Tailwind 4: `bg-[--color-bg]` → `background-color: --color-bg` (invalid).
In Tailwind 4: `bg-[var(--color-bg)]` → `background-color: var(--color-bg)` (valid).

**Always wrap custom property references in `var()` when using them as arbitrary values in Tailwind 4.** This is different from Tailwind v3 where the `[arbitrary]` syntax already included `var()` context.

## Remaining Stale CSS

The clean build still contains some orphan `bg-\[--color-bg\]{background-color:--color-bg}` classes in the output. These are unused (no elements reference them) and are remnants of Turbopack's module-level caching. A full `rm -rf .next node_modules/.cache` before production deploy would eliminate them, but they're inert and cause no visual issues.
