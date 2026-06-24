# Strubloid — Layout Redesign Plan

> **Goal**: Make Strubloid visually attractive, responsive across all devices, and maintainable
> **Method**: Identify every surface, enumerate improvements, propose SCSS architecture
> **Target**: Redesign existing components without breaking functionality

---

## 1. Current State Assessment

### 1.1 Architecture Snapshot

| Concern | Current Implementation | Problem |
|---------|----------------------|---------|
| Styling | 100% Tailwind inline classes + globals.css | Component styles mixed with globals, no modularity |
| Layout wrapper | Every page repeats `<div className="flex h-screen"><Sidebar/><main>...</main></div>` | 7x duplication across pages |
| Sidebar | 500-line monolithic component, fixed 280px | No separation of concerns, no breakpoints besides 768px |
| globals.css | 357 lines: global resets + component-specific styles (`.message-user`, `.sidebar`, `.chat-item`, `.project-item`, `.btn-primary`, `.toggle-switch`, `.loading-dots`, `.star-btn`) | Every component's CSS lives in global scope → bleed risk, hard to maintain |
| Mobile | Sidebar slides off-screen via translateX, hamburger + overlay at 768px breakpoint | Single breakpoint, no tablet adaptation, content doesn't reflow |
| Messages | `.message-assistant { width: 70vw }` — hardcoded vw | Breaks on narrow screens, no max/min bounds |
| Colors | Mix of Tailwind `ink` palette + CSS custom properties (--color-accent, --color-bg, etc.) | Dual definition → contradictions, two places to update |
| Font | Tailwind sans stack (system-ui chain) | No personality, same as every other app |

### 1.2 Pages & Their Layout

| Page | File | Layout Pattern | Status |
|------|------|---------------|--------|
| Home | `src/app/page.tsx` | Immediate redirect to /chat | — |
| Chat (new) | `src/app/chat/page.tsx` | Sidebar + main: header + MessageList + ChatComposer | ✅ |
| Chat (by id) | `src/app/chat/[chatId]/page.tsx` | Same + editable title + message delete/refresh | ✅ |
| Projects | `src/app/projects/page.tsx` | Sidebar + main: create form + accordion cards | ✅ |
| Project detail | `src/app/projects/[projectId]/page.tsx` | Sidebar + main: project detail + chats list | ✅ |
| Starred | `src/app/projects/starred/page.tsx` | Sidebar + main: grid of cards | ✅ |
| Settings | `src/app/settings/page.tsx` | Sidebar + main: tabs (Chat/Zen/NVIDIA) | ✅ |

### 1.3 What globals.css Holds That Belongs in Components

| Class / Block | Current Location | Should Move To |
|---------------|-----------------|----------------|
| `.message-user` | globals.css | MessageList.module.scss |
| `.message-assistant` | globals.css | MessageList.module.scss |
| `.sidebar` | globals.css | Sidebar.module.scss |
| `.chat-item` | globals.css | Sidebar.module.scss |
| `.project-item` | globals.css | Sidebar.module.scss + ProjectCard.module.scss |
| `.project-item-container` | globals.css | Sidebar.module.scss |
| `.project-card` | globals.css | ProjectCard.module.scss |
| `.btn-primary` | globals.css | Shared _buttons.scss partial |
| `.btn-secondary` | globals.css | Shared _buttons.scss partial |
| `.toggle-switch` | globals.css | ChatComposer.module.scss or _toggles.scss |
| `.star-btn` | globals.css | ProjectCard.module.scss |
| `.section-header` | globals.css | Shared _typography.scss partial |
| `.loading-dots` | globals.css | MessageList.module.scss |
| `.cursor-blink` | globals.css | MessageList.module.scss |
| `.glow`, `.glow-text` | globals.css | _effects.scss partial |
| `.glow-pulse`, `.pixel-float` | globals.css | _animations.scss partial |
| `.dev-mode-banner` | globals.css | ChatComposer.module.scss |
| `.composer textarea` | globals.css | ChatComposer.module.scss |
| `.error-message` | globals.css | ErrorBanner.module.scss |
| `.text-config` | globals.css | MessageList.module.scss |
| Matrix/keyframe animations | globals.css | _animations.scss partial |

---

## 2. SCSS Architecture Proposal

### 2.1 File Structure

```
src/
  styles/
    _variables.scss          # Colors, spacing, typography, breakpoints, z-index
    _mixins.scss             # Reusable patterns: flex-center, truncate, glass-effect, etc.
    _animations.scss         # @keyframes: matrix-rain, glow-pulse, loading-dot, cursor-blink, pixel-float
    _effects.scss            # Utility classes: .glow, .glow-text, .glass, .noise-bg
    _typography.scss         # Headings, section-header, chat-item text styles
    _buttons.scss            # .btn-primary, .btn-secondary, .btn-icon, .btn-danger
    _toggles.scss            # Toggle switch + variants
    _scrollbar.scss          # Scrollbar customizations
    _sidebar-layout.scss     # Sidebar structural layout (widths, collapse states, breakpoints)
    globals.scss             # @use all partials, @tailwind directives, reset, body/html
  components/
    Sidebar/
      Sidebar.tsx
      Sidebar.module.scss    # sidebar, .chat-item, .project-item, .nav-section, .footer
      SidebarHeader.tsx      # Extracted: New Chat button + logo
      SidebarFooter.tsx      # Extracted: Settings link + user info
      ChatList.tsx           # Extracted: random chats section
      ProjectList.tsx        # Extracted: project accordion section
    ChatComposer/
      ChatComposer.tsx
      ChatComposer.module.scss  # composer, textarea, toggles row, send button, dev banner
      ModelSelector.tsx         # Extracted model picker dropdown
      ToggleControls.tsx        # Extracted brain/randoms toggles
    MessageList/
      MessageList.tsx
      MessageList.module.scss   # .message-user, .message-assistant, .loading-dots, .actions
      MessageBubble.tsx         # Extracted single message renderer
    ProjectCard/
      ProjectCard.tsx
      ProjectCard.module.scss   # .project-card, .star-btn, hover effects
    ErrorBanner/
      ErrorBanner.tsx
      ErrorBanner.module.scss   # .error-message
    ConfirmDialog/
      ConfirmDialog.tsx
      ConfirmDialog.module.scss  # dialog, overlay, actions
    LayoutShell/
      LayoutShell.tsx            # Replaces manual Sidebar+main in every page
      LayoutShell.module.scss    # .layout-shell, grid areas
      HeaderBar.tsx              # Top bar: logo + nav + model + user menu
      HeaderBar.module.scss
    EmptyState/
      EmptyState.tsx             # Reusable empty state component
      EmptyState.module.scss
```

### 2.2 Variables Design (`_variables.scss`)

```scss
// === COLORS ===
// One source of truth — drives both CSS custom properties and Tailwind classes
$color-bg:            #0a0a0f;
$color-bg-secondary:  #12121a;
$color-bg-tertiary:   #1a1a24;
$color-border:        #2a2a3a;
$color-text:          #e0e0e0;
$color-text-dim:      #888888;
$color-accent:        #9ad933;
$color-accent-dim:    rgba(154, 217, 51, 0.15);
$color-neon:          #5cf2c2;
$color-danger:        #ef4444;
$color-warning:       #f59e0b;
$color-info:          #3b82f6;
$color-purple:        #a855f7;

// === TYPOGRAPHY ===
$font-sans:  'Inter', 'Inter Display', system-ui, -apple-system, sans-serif;
$font-mono:  'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
$font-size-xs:   0.75rem;
$font-size-sm:   0.875rem;
$font-size-base: 1rem;
$font-size-lg:   1.125rem;
$font-size-xl:   1.25rem;
$font-size-2xl:  1.5rem;

// === SIDEBAR ===
$sidebar-width-full:   280px;
$sidebar-width-icons:  64px;   // compact/icon-only mode
$sidebar-width-hidden: 0px;

// === BREAKPOINTS (mobile-first) ===
$bp-sm:  640px;
$bp-md:  768px;
$bp-lg:  1024px;
$bp-xl:  1280px;

// === LAYOUT ===
$header-height:    56px;
$composer-min-h:   60px;
$content-max-w:    48rem;    // ~768px for readable text width
$bubble-max-w:     42rem;

// === Z-INDEX ===
$z-sidebar:       40;
$z-overlay:       45;
$z-header:        30;
$z-dialog:        50;
$z-composer:      20;
```

### 2.3 Mixins (`_mixins.scss`)

```scss
@use 'variables' as *;

@mixin flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

@mixin truncate($max-width: 100%) {
  max-width: $max-width;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@mixin glass-effect {
  background: rgba($color-bg-secondary, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

@mixin message-bubble($variant: 'user') {
  max-width: $bubble-max-w;
  border-radius: 12px;
  padding: 12px 16px;
  @if $variant == 'user' {
    background: linear-gradient(135deg, #1a2a1a 0%, #0f1a0f 100%);
    border: 1px solid rgba($color-accent, 0.3);
  } @else {
    background: linear-gradient(135deg, #1a1a2a 0%, #0f0f1a 100%);
    border: 1px solid rgba(100, 100, 200, 0.2);
  }
}

@mixin respond-above($bp) {
  @if $bp == 'sm' { @media (min-width: $bp-sm) { @content; } }
  @if $bp == 'md' { @media (min-width: $bp-md) { @content; } }
  @if $bp == 'lg' { @media (min-width: $bp-lg) { @content; } }
  @if $bp == 'xl' { @media (min-width: $bp-xl) { @content; } }
}

@mixin respond-below($bp) {
  @if $bp == 'sm' { @media (max-width: ($bp-sm - 1px)) { @content; } }
  @if $bp == 'md' { @media (max-width: ($bp-md - 1px)) { @content; } }
  @if $bp == 'lg' { @media (max-width: ($bp-lg - 1px)) { @content; } }
}
```

### 2.4 Tailwind ↔ SCSS Integration Strategy

**Approach**: Tailwind for layout primitives (flex, grid, padding, margin, gap) and SCSS modules for component-specific styling that benefits from nesting, modifiers, and theming.

```scss
// Example: Sidebar.module.scss
@use '../../styles/variables' as *;
@use '../../styles/mixins' as *;

.sidebar {
  width: $sidebar-width-full;
  height: 100vh;
  background: $color-bg-secondary;
  border-right: 1px solid $color-border;
  overflow-y: auto;
  position: sticky;
  top: 0;
  flex-shrink: 0;
  transition: width 0.3s ease, transform 0.3s ease;
  z-index: $z-sidebar;

  // Compact mode — triggered when chat is scrolled or toggled
  &.compact {
    width: $sidebar-width-icons;

    .nav-label,
    .chat-title,
    .project-name,
    .section-header-text { display: none; }

    .new-chat-btn {
      width: 40px;
      padding: 8px;
      border-radius: 50%;
      span { display: none; }
    }
  }

  // Mobile overlay
  @include respond-below('md') {
    position: fixed;
    transform: translateX(-100%);
    &.open {
      transform: translateX(0);
    }
  }

  // Tablet: slightly narrower
  @include respond-below('lg') {
    width: 240px;
  }
}
```

---

## 3. Layout & Component Redesign (Page by Page)

### 3.1 Layout Shell — New Shared Wrapper

**What**: A `LayoutShell` component that replaces the manual `<Sidebar /> + <main>` duplication across all 7 pages.

**Current problem**: Every page file independently fetches, imports, and renders `<Sidebar />` with the same `flex h-screen` wrapper. Changing sidebar behavior requires touching 7 files.

**Proposed design**:

```
┌────────────────────────────────────────────┐
│         HeaderBar (56px)                    │
│  [☰] [Strubloid ▲]       [🧠] [⚙️] [👤]  │
├──────────┬─────────────────────────────────┤
│ Sidebar  │  Main Content Area               │
│ (compact │  (flex-1, overflow-y-auto)        │
│  or full)│                                   │
│          │  ┌───────────────────────────┐   │
│  chats   │  │  Chat / Project /         │   │
│  ─────── │  │  Settings page content    │   │
│  proj 1  │  │                           │   │
│  proj 2  │  │                           │   │
│  proj 3  │  │                           │   │
│          │  └───────────────────────────┘   │
│          │                                   │
├──────────┴─────────────────────────────────┤
│         (Composer pinned at bottom)         │
└────────────────────────────────────────────┘
```

**State machine for sidebar**:
- `'full'` — 280px, labels visible (≥1024px default)
- `'icons'` — 64px, only icons (768–1024px default, or toggled via button)
- `'hidden'` — 0px, off-screen (<768px default, or toggled via keyboard shortcut)

**User preference**: Save sidebar mode to localStorage or Config table per-user.

**Implementation approach**:

```tsx
// LayoutShell.tsx
'use client';
import { useState, createContext, useContext } from 'react';
import { Sidebar } from '@/components/Sidebar/Sidebar';
import { HeaderBar } from '@/components/LayoutShell/HeaderBar';

type SidebarMode = 'full' | 'icons' | 'hidden';
const SidebarContext = createContext<{
  mode: SidebarMode;
  toggle: () => void;
  setMode: (m: SidebarMode) => void;
}>({ mode: 'full', toggle: () => {}, setMode: () => {} });

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>('full');

  return (
    <SidebarContext.Provider value={{ mode: sidebarMode, toggle: () => setSidebarMode(m => m === 'full' ? 'icons' : 'full'), setMode: setSidebarMode }}>
      <div className="layout-shell">
        <HeaderBar />
        <div className="layout-body">
          <Sidebar mode={sidebarMode} />
          <main className="main-area">{children}</main>
        </div>
      </div>
    </SidebarContext.Provider>
  );
}

export function useSidebar() { return useContext(SidebarContext); }
```

**CSS for LayoutShell.module.scss**:

```scss
.layout-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: $color-bg;
}

.layout-body {
  display: flex;
  flex: 1;
  min-height: 0;  // flex child shrink fix
}

.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;      // prevent flex overflow
  overflow: hidden;  // children control their own scroll
}
```

### 3.2 Root Layout (`src/app/layout.tsx`)

**Current**: Bare `<html>` + `<body>` with inline Tailwind classes.

**Proposed**:

```tsx
import './globals.css';  // or globals.scss
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body>
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
```

This means every page **stops** rendering `<Sidebar />`. They just render their main content, and `LayoutShell` wraps it.

**Pages to modify** (all drop `<Sidebar />` import and `flex h-screen` wrapper):
- `src/app/chat/page.tsx`
- `src/app/chat/[chatId]/page.tsx`
- `src/app/projects/page.tsx`
- `src/app/projects/[projectId]/page.tsx`
- `src/app/projects/starred/page.tsx`
- `src/app/settings/page.tsx`

### 3.3 HeaderBar — New Component

**Current**: The `Strubloid` logo lives inside the sidebar, and chat pages have a thin `<header>` with title + delete button. There's no unified top bar.

**Proposed design**:

```
┌───────────────────────────────────────────────┐
│ [☰]  Strubloid  │  [Model: big-pickle ▼]    │
│                  │  [🧠 ON] [📋 ON]  [⚙️]   │
└───────────────────────────────────────────────┘
```

**Features**:
- Left: sidebar toggle (`☰` hamburger / `✕` close) + app logo with glow accent
- Center-right: active model selector (if chat page), brain/random status indicators
- Right: Settings gear, user avatar/initials dropdown
- Fixed top, height 56px, glass-effect background (blur + semi-transparent)
- On mobile: model selector + toggles move into a collapsible "toolbar drawer" below the header
- `position: sticky; top: 0; z-index: 30;` — always visible, content scrolls beneath

**Responsive behavior**:
- ≥1024px: Full header with all controls
- 768–1024px: Compact header, model selector hidden behind "..." menu
- <768px: Minimal header (logo + hamburger + settings gear only), toggles accessible via a bottom sheet or expanded toolbar

**Impact**: The current `<header>` inside `chat/page.tsx` and `chat/[chatId]/page.tsx` lines 204–225/312–401 can be simplified to just the editable title area, since model/delete move to HeaderBar.

### 3.4 Sidebar — Modular Redesign

**Current**: 500 lines, one file, JSX + inline Tailwind. No subcomponents.

**Proposed decomposition**:

```
Sidebar/
  Sidebar.tsx           — Container: orchestrates sections, manages accordion state
  SidebarHeader.tsx      — Logo (mobile scenario), New Chat button (adapts to mode)
  ChatList.tsx           — "Random Chats" section with delete-on-hover
  ProjectList.tsx        — "Projects" section with accordion, star indicator, inline chat count
  SidebarFooter.tsx      — Settings link, user info
  Sidebar.module.scss    — All sidebar styling
```

**Creative sidebar behaviors**:

1. **Auto-compact on chat scroll**: When the user scrolls down in a chat conversation, the sidebar could auto-collapse to icons-only mode to give more horizontal space to the conversation. This is inspired by how some IDEs collapse the file tree when editing. Use an IntersectionObserver or scroll position from the MessageList.

2. **Hover-expand**: In icons mode, hovering the sidebar for >300ms temporarily expands it to full width. Removing the hover collapses it back after a 500ms delay (prevents flicker when crossing to a menu item).

3. **Project-colored left border**: Each project in the sidebar gets a 3px left border in its project color (instead of just the small dot). The active project has an animated glow along that border — builds on the existing `.project-item.active` animation.

4. **Chat drag-reorder**: Let users drag chats between "Random Chats" and Projects, or reorder them within sections. (Phase 2 feature, but design should leave room.)

5. **Search/filter bar**: A small search input at the top of the sidebar (below the New Chat button) that filters both chat titles and project names as you type. Collapses into a search icon in icons mode.

**Sidebar.module.scss structure**:

```scss
@use '../../styles/variables' as *;
@use '../../styles/mixins' as *;

.sidebar {
  // Dimensions and transitions
  width: $sidebar-width-full;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;  // clips content during transition

  display: flex;
  flex-direction: column;
  height: 100vh;
  background: $color-bg-secondary;
  border-right: 1px solid $color-border;
  flex-shrink: 0;
  z-index: $z-sidebar;

  // Modes
  &.mode-full { width: $sidebar-width-full; }
  &.mode-icons { width: $sidebar-width-icons; }
  &.mode-hidden { width: 0; border: none; }

  // Hover-expand from icons mode
  &.mode-icons:hover {
    width: $sidebar-width-full;
    position: absolute;  // overlay on content
    box-shadow: 4px 0 24px rgba(0,0,0,0.4);
  }
}

// Animations for items
.section {
  margin-bottom: 24px;
  opacity: 0;
  animation: section-fade-in 0.3s ease forwards;

  @for $i from 1 through 10 {
    &:nth-child(#{$i}) { animation-delay: #{$i * 0.05}s; }
  }
}

@keyframes section-fade-in {
  from { opacity: 0; transform: translateX(-8px); }
  to { opacity: 1; transform: translateX(0); }
}

.chat-item {
  @include truncate;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: $font-size-sm;
  color: $color-accent;
  transition: background 0.1s;

  &:hover { background: $color-bg-tertiary; }
  &.active {
    background: $color-accent-dim;
    color: $color-accent;
  }
}
```

### 3.5 Chat Page — Full Reimagining

#### 3.5.1 Message Layout

**Current**:
- Messages are full-width flex containers with `max-w-[80%]` bubbles
- User messages aligned left (no alignment distinction)
- `.message-assistant` has `width: 70vw` which is problematic

**Proposed**:
- **User messages**: Right-aligned (as in ChatGPT, WhatsApp, iMessage)
- **AI messages**: Left-aligned with avatar icon
- **Max width**: Both capped at 42rem (`$bubble-max-w`) for readability
- **Streaming effect**: Animated typing cursor during generation (already partially done with `loading-dots`)
- **Code blocks**: Syntax-highlighted with copy button
- **Message actions**: Copy, Edit, Regenerate, Delete — appear on hover (current implementation is good, but needs visual refinement)

**Alignment implementation**:

```scss
.message-row {
  display: flex;
  width: 100%;
  margin-bottom: 16px;

  &.user {
    justify-content: flex-end;

    .bubble {
      @include message-bubble('user');
      border-bottom-right-radius: 4px;  // speech bubble tail effect
    }
  }

  &.assistant {
    justify-content: flex-start;

    .bubble {
      @include message-bubble('assistant');
      border-bottom-left-radius: 4px;
    }
  }
}
```

#### 3.5.2 Chat Composer

**Current**: A compact bar at the bottom with model selector dropdown, brain toggle, random toggle, textarea, and send button. All in one row.

**Proposed redesign**:

```
┌────────────────────────────────────────────────┐
│ [🧠 ON] [📋 ON]  [big-pickle  ▼]   [🔗] [+] │  ← Toolbar (collapsible)
│ ┌──────────────────────────────────────┐ [▶] │  ← Textarea + send
│ │ Type a message... (Enter to send)    │     │
│ └──────────────────────────────────────┘     │
└────────────────────────────────────────────────┘
```

**Changes**:
1. **Toolbar separates from input**: The model selector and toggles move to a collapsible toolbar row above the textarea. This gives the textarea more horizontal space.
2. **Toolbar collapses on mobile**: On <640px, the toolbar row is hidden by default; a `+` button on the left expands it.
3. **Textarea design**: Slightly rounded, inner glow on focus, attach button (for future file upload), character count.
4. **Send button**: Pill-shaped, uses accent color, disabled state fades.
5. **Sticky footer**: The composer is `position: sticky; bottom: 0;` with a subtle top shadow so it floats above the message list.

**Mobile-first composer**:

```scss
.composer {
  position: sticky;
  bottom: 0;
  background: $color-bg-secondary;
  border-top: 1px solid $color-border;
  padding: 12px 16px;
  @include glass-effect;

  .toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;

    @include respond-below('sm') {
      display: none;
      &.expanded { display: flex; flex-wrap: wrap; }
    }
  }

  .input-row {
    display: flex;
    gap: 8px;
    align-items: flex-end;
  }

  textarea {
    flex: 1;
    background: $color-bg;
    border: 1px solid $color-border;
    border-radius: 12px;
    padding: 10px 14px;
    font-size: $font-size-sm;
    color: $color-text;
    resize: none;
    min-height: 44px;
    max-height: 200px;
    outline: none;
    transition: border-color 0.15s;

    &:focus {
      border-color: $color-accent;
      box-shadow: 0 0 0 3px rgba($color-accent, 0.15);
    }
  }

  .send-btn {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: $color-accent;
    color: #000;
    @include flex-center;
    transition: all 0.15s;
    flex-shrink: 0;

    &:hover:not(:disabled) {
      transform: scale(1.05);
      box-shadow: 0 0 16px rgba($color-accent, 0.4);
    }
    &:disabled { opacity: 0.4; cursor: not-allowed; }
  }
}
```

#### 3.5.3 Message Empty State

**Current**: A matrix-style empty state with floating characters and "Ready to Chat" text.

**Proposed**: Keep the personality (code characters, terminal aesthetic) but make it more polished:
- Animated terminal window UI with a blinking cursor
- A rotating set of suggested prompts the user can click to start conversations
- The matrix characters become a subtle background animation layer
- "Ready to Chat" in a bold terminal-inspired display font with glow

### 3.6 Projects Page

**Current**: Accordion list where clicking a project card expands it below to show chats. Chat list is plain links with delete-on-hover.

**Proposed**:

1. **Bento-grid visual**: Projects display as a responsive grid of cards with visual variety:
   - Each card has a gradient header in the project's color
   - Chat count badge
   - Shows last active chat title and date
   - Star indicator
   - Click → navigate to project detail (don't expand inline — matching the existing detail page)

2. **Inline expansion alternative**: Keep the accordion but make it visually richer:
   - Card flips/expands smoothly with a CSS animation
   - Expanded area shows chats in a cleaner list with timestamps
   - "Create chat" button at the bottom of expanded area

3. **Quick-create**: Floating "+" button on the projects page to create a chat in the most recent project without navigating away.

4. **Filter bar**: A small row of filter chips below the page title: "All", "Starred", "Recent" — clicking filters the grid.

### 3.7 Project Detail Page

**Current**: Shows project name with color dot, chat count, star button, list of chats as bordered cards.

**Proposed**:
- Same layout structure but with a richer header:
  - Gradient banner area using the project's color at low opacity
  - Project name in large display text
  - Stats row: chat count, last activity, memory count
- Chats displayed in a table-like list with more info (last message preview, date, model used)
- A "Quick Chat" button that opens a chat composer inline on this page (not a navigation)
- Brain memory entries for this project listed at the bottom with an option to view/manage them

### 3.8 Settings Page

**Current**: Tab-based layout with large form sections. Functional but visually dense.

**Proposed**:
- Group settings into card sections with left-aligned icons
- The tab bar at the top gets a subtle redesign (underline-style active state instead of filled button)
- Model list sections get a "group toggle" with a visual indicator of how many are selected
- Clean Random Chats section gets a progress bar during cleaning
- Better visual feedback for saved states (green checkmark that fades)

### 3.9 Responsive Breakpoint Strategy

| Breakpoint | Sidebar | Header | Composer | Layout |
|-----------|---------|--------|----------|--------|
| <640px (mobile) | `hidden` (hamburger opens as overlay) | Minimal: logo + hamburger + settings | Toolbar collapsed, expandable via "+" | Single column |
| 640–1024px (tablet) | `icons` (64px) — hover expands | Compact: model selector hidden behind menu | Toolbar visible | Message area fills remaining space |
| 1024–1280px (desktop) | `full` (280px) | Full controls | Full composer | Sidebar + content, 2-column |
| >1280px (wide) | `full` (280px) | Full controls + optional "spacious" mode | Full composer | Content max-width 48rem centered |

**Implementation**: Use CSS `@container` queries (container queries) for sidebar-aware content sizing, not just viewport breakpoints. The message area should know how much space is left after the sidebar, not guess based on screen width.

---

## 4. Visual & UX Enhancement Ideas

### 4.1 Color & Theme Improvements

**Current**: Dark theme only, one accent green (`#9ad933`).

**Proposed**:

1. **Color-coded project identity**: When viewing a chat that belongs to a project, the header bar subtlety shifts to incorporate that project's color (e.g., a thin bottom border in the project color, or the header accent changes). This gives each project a visual territory.

2. **Per-provider model color**: Zen models show a green accent, NVIDIA models show a teal/emerald accent, making it visually obvious which provider is active.

3. **Message streaming glow**: While the AI is generating, the active message bubble has a soft animated glow in the accent color, pulsing gently.

4. **Theme system**: Add a light/dark toggle (many users work during the day). The color variables make this trivial — just swap `$color-bg` from `#0a0a0f` to `#f8f9fa` etc.

### 4.2 Micro-interactions & Animations

| Element | Animation | Priority |
|---------|-----------|----------|
| Sidebar mode switch | Width transition, items fade in/out | High |
| New chat appears | Slide in from top + fade | Medium |
| Message send | User bubble slides up from composer position | High |
| AI response starts | Dots appear with bounce animation (exists) | Already done |
| AI response completes | Subtle "pop" scale effect on the bubble | Medium |
| Delete message | Shrink + fade out, adjacent messages close gap | Low |
| Project accordion | Smooth max-height expand/collapse | High |
| Star toggle | Gentle star-shaped burst animation | Low |
| View transition | Next.js App Router already handles; add a page-level fade | Medium |
| Loading skeleton | Pulsing rectangular shapes matching content layout | High |
| Hover card lift | Projects card lifts 2px with shadow increase on hover | Medium |

### 4.3 Typography

**Current**: system-ui font stack. No personality.

**Proposed**:
- **Headings**: Use `Inter` or `Inter Display` for a more refined sans-serif
- **Code**: Use `JetBrains Mono` for code blocks and monospace elements
- **Body**: `Inter` at 15px (slightly larger than default 16px for better readability)
- **Logo**: Use a distinct typeface or the existing glow effect more prominently

### 4.4 Empty States & Onboarding

Every empty state should be a call to action, not a dead end:

| Location | Current | Proposed |
|----------|---------|----------|
| No chats | "No chats yet" dim text | Terminal-themed prompt: "Start a conversation →" with clickable suggestion chips |
| No projects | "No projects yet" + create button | Animated illustration of folders being created |
| Settings, no models | "No models in this category" | Link to "Refresh Models" button |
| Starred page, empty | "No starred projects" | "Browse projects and star them" link back to /projects |

### 4.5 Keyboard Navigation & Shortcuts

Add an overlay that shows on `Cmd+/` or `Ctrl+/`:

```
⌘K   Search chats & projects
⌘N   New chat (random)
⌘⇧N  New project
⌘B   Toggle sidebar mode
⌘,   Settings
⌘⌫   Delete current chat
↑↓   Recall message history (already done)
```

---

## 5. Migration Plan — Phased Execution

### Phase 1: Foundation (SCSS + Layout Shell)

**Effort**: ~4–6 hours

1. Install `sass` package (`npm install sass`)
2. Create `src/styles/` with all partials (`_variables.scss`, `_mixins.scss`, `_animations.scss`, `_effects.scss`, `_typography.scss`, `_buttons.scss`, `_toggles.scss`, `_scrollbar.scss`, `_sidebar-layout.scss`)
3. Rename `globals.css` → `globals.scss`, refactor: keep only reset + `@use` imports + `@tailwind` directives, move component-classes to their SCSS module files
4. Create `LayoutShell/` component and `LayoutShell.module.scss`
5. Update `layout.tsx` to use `LayoutShell`
6. Strip `<Sidebar />` + `flex h-screen` wrapper from all 6 page files
7. Test every page renders correctly

### Phase 2: Sidebar Modularization

**Effort**: ~3–4 hours

1. Split `Sidebar.tsx` into subcomponents
2. Implement mode state machine (`full` / `icons` / `hidden`) with transition animations
3. Add hover-expand behavior for icons mode
4. Create `Sidebar.module.scss` with all extracted styles
5. Add keyboard shortcut for sidebar toggle (`Cmd+B`)
6. Add search/filter input for projects and chats

### Phase 3: HeaderBar

**Effort**: ~2–3 hours

1. Create `HeaderBar.tsx` and `HeaderBar.module.scss`
2. Move "Strubloid" branding from sidebar to header
3. Move model selector and brain toggles from ChatComposer to header (they become header controls)
4. Simplify `chat/page.tsx` and `chat/[chatId]/page.tsx` headers to only editable title
5. Responsive: toolbar drawer on mobile

### Phase 4: Message List & Composer Refinement

**Effort**: ~3–4 hours

1. Move user messages to right alignment, AI to left alignment
2. Create `MessageBubble.tsx` + `MessageBubble.module.scss`
3. Refactor composer: toolbar row + textarea row
4. Replace fixed `70vw` with `max-width: $bubble-max-w`
5. Add message stream glow animation
6. Add code block syntax highlighting + copy button

### Phase 5: Visual Polish

**Effort**: ~2–3 hours

1. Add micro-interactions (send animation, sidebar transition easing, project card hover)
2. Implement loading skeletons for chat list, message list, project list
3. Refine empty states across all pages
4. Add theme variables for future light mode
5. Container-query-aware message list
6. Test all breakpoints (320px mobile → 1920px wide)

### Phase 6: Settings & Projects Polish

**Effort**: ~2 hours

1. Redesign settings sections with icons
2. Add progress indicator for clean-random-chats operation
3. Project cards: gradient header, last-activity display
4. Filter chips for projects page

---

## 6. Potential Pitfalls & Guardrails

| Pitfall | Mitigation |
|---------|-----------|
| Sidebar mode change breaks layout references | All page content should be width-agnostic; use CSS `flex: 1; min-width: 0` on main area |
| SCSS migration breaks existing builds | Keep both `globals.css` and `globals.scss` during transition; run `npm run build` after each phase |
| User messages alignment change confuses users | Maintain role indicators (You / Assistant labels) even after alignment change |
| Animations cause motion sickness | Use `prefers-reduced-motion` media query to disable animations |
| Sidebar collapse on scroll feels jarring | Use a threshold (scrolled >200px) + debounce; don't collapse on every pixel scroll |
| Container queries not supported | Fall back to viewport-based breakpoints; container query is a progressive enhancement |
| Header grows too tall on mobile | Collapse toolbar into hamburger menu; header max-height 56px |
| Moving model selector breaks existing flow | The model selector stays accessible; just moves from bottom-left to top-center — same functionality, better discoverability |

---

## 7. Key CSS Variables Migration Table

| Current CSS Var | New SCSS Var | Used In |
|----------------|-------------|---------|
| `--color-accent` | `$color-accent: #9ad933` | All components |
| `--color-accent-dim` | `$color-accent-dim` | Sidebar active items |
| `--color-bg` | `$color-bg: #0a0a0f` | Body, main area |
| `--color-bg-secondary` | `$color-bg-secondary: #12121a` | Sidebar, sections |
| `--color-bg-tertiary` | `$color-bg-tertiary: #1a1a24` | Inputs, hover states |
| `--color-border` | `$color-border: #2a2a3a` | All borders |
| `--color-text` | `$color-text: #e0e0e0` | Body text |
| `--color-text-dim` | `$color-text-dim: #888` | Secondary text |

**Migration strategy**: Keep CSS custom properties in globals.scss for backward compatibility, define SCSS variables for new components, gradually migrate old references.

---

## 8. File-by-File Action List

### Create (new files)

| File | Purpose |
|------|---------|
| `src/styles/_variables.scss` | Design tokens |
| `src/styles/_mixins.scss` | Reusable patterns |
| `src/styles/_animations.scss` | All @keyframes |
| `src/styles/_effects.scss` | Glow, glass, noise utilities |
| `src/styles/_typography.scss` | Heading and text patterns |
| `src/styles/_buttons.scss` | Button variants |
| `src/styles/_toggles.scss` | Toggle switch |
| `src/styles/_scrollbar.scss` | Custom scrollbars |
| `src/styles/globals.scss` | New global entry point |
| `src/components/LayoutShell/LayoutShell.tsx` | Shared layout wrapper |
| `src/components/LayoutShell/LayoutShell.module.scss` | Layout shell styles |
| `src/components/LayoutShell/HeaderBar.tsx` | Top app bar |
| `src/components/LayoutShell/HeaderBar.module.scss` | Header bar styles |
| `src/components/Sidebar/SidebarHeader.tsx` | Logo + new chat button |
| `src/components/Sidebar/SidebarFooter.tsx` | Settings link |
| `src/components/Sidebar/ChatList.tsx` | Random chats section |
| `src/components/Sidebar/ProjectList.tsx` | Project accordion |
| `src/components/Sidebar/Sidebar.module.scss` | All sidebar styles |
| `src/components/MessageList/MessageBubble.tsx` | Single message renderer |
| `src/components/MessageList/MessageList.module.scss` | Message list styles |
| `src/components/ChatComposer/ChatComposer.module.scss` | Composer styles |
| `src/components/ChatComposer/ModelSelector.tsx` | Extracted model picker |
| `src/components/ChatComposer/ToggleControls.tsx` | Extracted brain/randoms |
| `src/components/EmptyState/EmptyState.tsx` | Reusable empty state |
| `src/components/EmptyState/EmptyState.module.scss` | Empty state styles |
| `src/components/ProjectCard/ProjectCard.module.scss` | Card styles |
| `src/components/ErrorBanner/ErrorBanner.module.scss` | Error banner styles |
| `src/components/ConfirmDialog/ConfirmDialog.module.scss` | Dialog styles |

### Modify (existing files)

| File | Change |
|------|--------|
| `package.json` | Add `sass` dependency |
| `next.config.mjs` | No changes needed (Next.js handles .scss natively once `sass` is installed) |
| `src/app/layout.tsx` | Import font, wrap children in `<LayoutShell>`, remove manual flex/h-screen |
| `src/app/globals.css` | Rename to `.scss`, strip component classes, keep reset + @tailwind |
| `src/app/chat/page.tsx` | Remove `<Sidebar />` + `flex h-screen`, keep main content |
| `src/app/chat/[chatId]/page.tsx` | Same + simplify header |
| `src/app/projects/page.tsx` | Remove `<Sidebar />` + wrapper |
| `src/app/projects/[projectId]/page.tsx` | Same |
| `src/app/projects/starred/page.tsx` | Same |
| `src/app/settings/page.tsx` | Same |
| `src/components/Sidebar.tsx` | Refactor into subcomponents under Sidebar/ |
| `src/components/ChatComposer.tsx` | Extract ModelSelector + ToggleControls, restructure layout |
| `src/components/MessageList.tsx` | Add alignment logic, extract MessageBubble |
| `src/components/ProjectCard.tsx` | Add gradient header, richer hover |
| `src/components/ErrorBanner.tsx` | Add dismiss animation |
| `src/components/ConfirmDialog.tsx` | Add scale-in animation |

### Delete (after migration)

| File | Reason |
|------|--------|
| `src/app/globals.css` | Superseded by `globals.scss` |
| `src/components/Sidebar.tsx` | Replaced by Sidebar/ directory |
| (Old component styles extracted from globals.css) | Already moved to SCSS modules |

---

## 9. ChatGPT Analysis — What Works & What We Can Beat

| ChatGPT Feature | Current Strubloid Equivalent | Verdict | Our Improvement |
|----------------|------------------------------|---------|-----------------|
| Clean left sidebar with hover-context | Sidebar at 280px with labels | Similar, less polished | Add icons-mode, search, drag-reorder |
| Top bar with model switcher | Model selector in composer bar | Hidden in bottom bar | Move to HeaderBar for visibility |
| "New Chat" prominent button | "New Chat" in sidebar | ✅ Good | Keep, make responsive to sidebar mode |
| Message alignment (user right, AI left) | Both left-aligned | Needs improvement | Right-align user, left-align AI |
| Responsive sidebar collapse | Slides off-screen at 768px | Works but abrupt | 3-mode system with smooth transitions |
| Streaming text effect | Loading dots only | Basic | Add per-character fade-in during stream |
| Code block formatting | Plain text | Missing | Add syntax highlighting + copy |
| Conversation search | Not available | Missing | Add sidebar search/filter |
| Theme customization (light/dark) | Dark only | Missing | Add theme variable infrastructure |
| Keyboard shortcuts palette | Not available | Missing | Add Cmd+/ shortcut overlay |
| Multi-modal input (file upload, image) | Text only | Missing | Leave room in composer for future attach button |
| Profile/settings in header | Settings in sidebar footer | Less discoverable | Move settings to HeaderBar |
| Bento-grid for content cards | Plain list-based cards | Needs visual lift | Add gradient headers, icons, richer hover |
| Smooth page transitions | Next.js built-in | Basic | Add page-level fade transitions |
| Glass-effect UI elements | None | Missing | Add backdrop-blur to header/composer |
| Message actions (copy, edit, share) | Delete + Regenerate | Partial | Add copy button, edit-in-place |
| Markdown rendering | Plain text | Missing (future scope) | Plan md rendering for code blocks |

**Where we can genuinely beat ChatGPT**:
1. **Project-organized knowledge** — ChatGPT has no project concept. Our project + brain memory system is unique.
2. **Multi-provider model switching** — ChatGPT is locked to OpenAI. We switch between Zen and NVIDIA seamlessly, with visual provider indicators.
3. **Brain memory** — Cross-chat memory is a ChatGPT Pro feature (or non-existent). We have it for free.
4. **Hacker/terminal aesthetic** — ChatGPT is polished corporate. Our dark theme with glowing accents, matrix animations, and terminal cursor has personality.
5. **Random chat compaction** — ChatGPT conversation history is never summarized. Our compaction into memory entries is a power feature.

---

## 10. Success Criteria

Before/after comparison checklist:

- [ ] All 7 pages render correctly without `flex h-screen` duplication
- [ ] Sidebar cycles through `full` / `icons` / `hidden` modes with smooth transitions
- [ ] HeaderBar shows on every page with context-aware controls
- [ ] User messages are right-aligned, AI messages left-aligned
- [ ] `.message-assistant` no longer uses `70vw`
- [ ] globals.css no longer contains component-specific classes
- [ ] Chat page works comfortably on 320px, 768px, 1024px, 1440px widths
- [ ] No overflow or cutoff issues at any width
- [ ] `npm run build` passes with no errors
- [ ] `npm run lint` passes with no errors
- [ ] All existing functionality works (send, receive, brain toggle, project management, settings)
- [ ] `prefers-reduced-motion` disables all animations when set
- [ ] All empty states have call-to-action buttons
- [ ] Sidebar search filters both chats and projects

---

*Last updated: June 2026*
*This document is a living plan — update as priorities shift.*
