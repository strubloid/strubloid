# Strubloid — Layout Redesign Plan

> **Goal**: Make Strubloid visually attractive, responsive across all devices, and maintainable
> **Method**: Identify every surface, enumerate improvements, propose SCSS architecture
> **Target**: Redesign existing components without breaking functionality

---

## 1. Current State Assessment

### 1.1 Architecture Snapshot

| Concern        | Current Implementation                                                                                                                                                            | Problem                                                                    |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Styling        | 100% Tailwind inline classes + globals.css                                                                                                                                        | Component styles mixed with globals, no modularity                         |
| Layout wrapper | Every page repeats `<div className="flex h-screen"><Sidebar/><main>...</main></div>`                                                                                              | 7x duplication across pages                                                |
| Sidebar        | 500-line monolithic component, fixed 280px                                                                                                                                        | No separation of concerns, no breakpoints besides 768px                    |
| globals.css    | 357 lines: global resets + component-specific styles (`.message-user`, `.sidebar`, `.chat-item`, `.project-item`, `.btn-primary`, `.toggle-switch`, `.loading-dots`, `.star-btn`) | Every component's CSS lives in global scope → bleed risk, hard to maintain |
| Mobile         | Sidebar slides off-screen via translateX, hamburger + overlay at 768px breakpoint                                                                                                 | Single breakpoint, no tablet adaptation, content doesn't reflow            |
| Messages       | `.message-assistant { width: 70vw }` — hardcoded vw                                                                                                                               | Breaks on narrow screens, no max/min bounds                                |
| Colors         | Mix of Tailwind `ink` palette + CSS custom properties (--color-accent, --color-bg, etc.)                                                                                          | Dual definition → contradictions, two places to update                     |
| Font           | Tailwind sans stack (system-ui chain)                                                                                                                                             | No personality, same as every other app                                    |

### 1.2 Pages & Their Layout

| Page           | File                                    | Layout Pattern                                      | Status |
| -------------- | --------------------------------------- | --------------------------------------------------- | ------ |
| Home           | `src/app/page.tsx`                      | Immediate redirect to /chat                         | —      |
| Chat (new)     | `src/app/chat/page.tsx`                 | Sidebar + main: header + MessageList + ChatComposer | ✅     |
| Chat (by id)   | `src/app/chat/[chatId]/page.tsx`        | Same + editable title + message delete/refresh      | ✅     |
| Projects       | `src/app/projects/page.tsx`             | Sidebar + main: create form + accordion cards       | ✅     |
| Project detail | `src/app/projects/[projectId]/page.tsx` | Sidebar + main: project detail + chats list         | ✅     |
| Starred        | `src/app/projects/starred/page.tsx`     | Sidebar + main: grid of cards                       | ✅     |
| Settings       | `src/app/settings/page.tsx`             | Sidebar + main: tabs (Chat/Zen/NVIDIA)              | ✅     |

### 1.3 What globals.css Holds That Belongs in Components

| Class / Block                 | Current Location | Should Move To                                |
| ----------------------------- | ---------------- | --------------------------------------------- |
| `.message-user`               | globals.css      | MessageList.module.scss                       |
| `.message-assistant`          | globals.css      | MessageList.module.scss                       |
| `.sidebar`                    | globals.css      | Sidebar.module.scss                           |
| `.chat-item`                  | globals.css      | Sidebar.module.scss                           |
| `.project-item`               | globals.css      | Sidebar.module.scss + ProjectCard.module.scss |
| `.project-item-container`     | globals.css      | Sidebar.module.scss                           |
| `.project-card`               | globals.css      | ProjectCard.module.scss                       |
| `.btn-primary`                | globals.css      | Shared \_buttons.scss partial                 |
| `.btn-secondary`              | globals.css      | Shared \_buttons.scss partial                 |
| `.toggle-switch`              | globals.css      | ChatComposer.module.scss or \_toggles.scss    |
| `.star-btn`                   | globals.css      | ProjectCard.module.scss                       |
| `.section-header`             | globals.css      | Shared \_typography.scss partial              |
| `.loading-dots`               | globals.css      | MessageList.module.scss                       |
| `.cursor-blink`               | globals.css      | MessageList.module.scss                       |
| `.glow`, `.glow-text`         | globals.css      | \_effects.scss partial                        |
| `.glow-pulse`, `.pixel-float` | globals.css      | \_animations.scss partial                     |
| `.dev-mode-banner`            | globals.css      | ChatComposer.module.scss                      |
| `.composer textarea`          | globals.css      | ChatComposer.module.scss                      |
| `.error-message`              | globals.css      | ErrorBanner.module.scss                       |
| `.text-config`                | globals.css      | MessageList.module.scss                       |
| Matrix/keyframe animations    | globals.css      | \_animations.scss partial                     |

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
$color-bg: #0a0a0f;
$color-bg-secondary: #12121a;
$color-bg-tertiary: #1a1a24;
$color-border: #2a2a3a;
$color-text: #e0e0e0;
$color-text-dim: #888888;
$color-accent: #9ad933;
$color-accent-dim: rgba(154, 217, 51, 0.15);
$color-neon: #5cf2c2;
$color-danger: #ef4444;
$color-warning: #f59e0b;
$color-info: #3b82f6;
$color-purple: #a855f7;

// === TYPOGRAPHY ===
$font-sans:
  'Inter',
  'Inter Display',
  system-ui,
  -apple-system,
  sans-serif;
$font-mono: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
$font-size-xs: 0.75rem;
$font-size-sm: 0.875rem;
$font-size-base: 1rem;
$font-size-lg: 1.125rem;
$font-size-xl: 1.25rem;
$font-size-2xl: 1.5rem;

// === SIDEBAR ===
$sidebar-width-full: 280px;
$sidebar-width-icons: 64px; // compact/icon-only mode
$sidebar-width-hidden: 0px;

// === BREAKPOINTS (mobile-first) ===
$bp-sm: 640px;
$bp-md: 768px;
$bp-lg: 1024px;
$bp-xl: 1280px;

// === LAYOUT ===
$header-height: 56px;
$composer-min-h: 60px;
$content-max-w: 48rem; // ~768px for readable text width
$bubble-max-w: 42rem;

// === Z-INDEX ===
$z-sidebar: 40;
$z-overlay: 45;
$z-header: 30;
$z-dialog: 50;
$z-composer: 20;
```

---

## 3. Layout & Component Redesign (Page by Page)

### 3.1 Layout Shell — New Shared Wrapper

**What**: A `LayoutShell` component that replaces manual page-level Sidebar/main duplication.

**State machine for sidebar**:

- `'full'` — 280px, labels visible
- `'icons'` — 64px, only icons
- `'hidden'` — 0px/off-screen on mobile

**Important current correction**: after the portal/corridor experience was introduced, the shared shell must not reserve a normal sidebar column over the hallway. The sidebar can exist, but it must float as an overlay.

### 3.2 HeaderBar — New Component

HeaderBar remains the persistent app chrome at the top. It should stay visible above the corridor interior, with a translucent hacker/glass treatment. It should not own the corridor background and should not force opaque blocks into the main visual plane.

### 3.3 Sidebar — Modular Redesign

Creative sidebar behaviors remain valid, but the post-portal corridor mode changes the implementation:

1. **Floating overlay rail**: The sidebar must be a D-shaped floating rail on the left, not a flex column that pushes the main area.
2. **Hover-expand**: In icon mode, hover may reveal labels/drawer content over the corridor.
3. **No opaque strip**: The rail background is translucent glass so the corridor image remains visible around it.
4. **Mobile overlay**: Mobile keeps explicit slide-over behavior, not hover behavior.

---

## 4. Spatial Corridor Wall UI — Current Target Direction

### 4.1 Visual target from latest reference images

The desired post-portal scene is no longer a normal app shell with a black sidebar beside a background. It should look like the user is physically standing inside `public/images/portal/corridor-hall.png` and the application UI is mounted into the corridor walls.

The first two screenshots show the current problem:

- the top bar works, but the left sidebar still occupies a normal layout column;
- that sidebar column has its own black background, which covers the corridor image at the top, bottom, and left edge;
- because the sidebar participates in flex layout, it pushes/claims horizontal space instead of floating over the corridor;
- the wall displays are too flat/rectangular and do not convincingly match the perspective angle of the generated hallway asset.

The third reference image is the target direction:

- the corridor background remains visible across the whole app area;
- side navigation/content appears as dark glass/monitor surfaces attached to the left and right corridor walls;
- Random Chats live on the left wall; Project Chats live on the right wall;
- the side panels sit at the same visual angle as the corridor walls, with perspective compression toward the vanishing point;
- the panels are readable but still feel embedded in architecture, not like floating website cards;
- any collapsed app/sidebar controls should float like a D-shaped brain/orbit rail, overlaying the scene without moving the hallway content.

### 4.2 Non-negotiable layout rules

1. **The corridor image owns the full content plane.**
   - `corridor-hall.png` must be visible from edge to edge behind the UI.
   - Do not place opaque layout columns beside it.
   - Do not set the main content background to a solid app black after portal entry.

2. **Sidebar must be overlay/floating, not layout-pushing.**
   - On desktop/tablet, `.sidebar` should be `position: absolute` or `fixed` inside the layout body.
   - It must not consume flex width.
   - `.main-area` must stay full width underneath.
   - Icon mode should be a small D-shaped rail pinned to the left viewport edge.
   - Full/hover/open states should expand over the scene without pushing content to the right.

3. **Floating sidebar rail style.**
   - Shape: D-shaped capsule, `border-radius: 0 32px 32px 0` or similar.
   - Position: vertically centered in the post-header body, not full-height black strip.
   - Background: translucent green/black glass (`rgba(4, 14, 7, .42-.68)`) with backdrop blur, not opaque black.
   - Width: about `58px` collapsed. Full mode about `260px`, but still overlay.
   - It should reveal/expand on hover or explicit toggle without affecting the hallway.

4. **Wall panels must follow the corridor background angles.**
   - Use the center vanishing point of the image as the guide.
   - Left wall monitor: anchored left, clipped as a trapezoid, outer edge larger, inner edge receding toward center.
   - Right wall monitor: mirrored trapezoid.
   - Desktop target: wall monitor x-position roughly `left: 7vw` and `right: 7vw`, width around `24-28vw`, height `68-76vh`.
   - Use CSS `clip-path` plus subtle `rotateY()` only when it improves the match. Avoid rotations so strong that text becomes unreadable.
   - Mobile/tiny phones must reduce 3D rotation drastically and prioritize readable text.

5. **Panels should be wall-mounted screens, not flat cards.**
   - Keep headers like `Random Chats` / `Project Chats` as small terminal labels.
   - Use list rows inside the wall screens, with icon dots and compact metadata.
   - Avoid giant empty black rectangles. Use subtle transparent grid, inner glow, and low-opacity background so the corridor still reads through.
   - Preserve contrast enough for readability.

6. **Do not duplicate navigation responsibilities.**
   - The floating sidebar remains the compact global app rail (new chat, random, projects, settings).
   - The corridor wall displays are the immersive content navigation (random chats and project/project chats).
   - The two should visually agree, but the sidebar should not become a normal opaque sidebar again.

### 4.3 Implementation recipe

#### LayoutShell

- Update `src/components/LayoutShell/LayoutShell.module.scss`:
  - `.layout-shell[data-portal-interior]` should use transparent/near-transparent background so the hallway can own the scene.
  - `.layout-body` remains `position: relative; overflow: hidden`.
  - `.main-area` should be absolute/full-size when inside portal interior:
    ```scss
    [data-portal-interior] .main-area {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      background: transparent;
    }
    ```
  - The sidebar should sit above with z-index, but not reserve width.

#### Sidebar

- Update `src/styles/_sidebar-layout.scss`:
  - Base `.sidebar` on desktop/tablet should be overlay:
    ```scss
    .sidebar {
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      flex-shrink: 0;
    }
    ```
  - `.mode-icons` should be the default floating D rail:
    ```scss
    width: 58px;
    height: min(700px, 74vh);
    border-radius: 0 32px 32px 0;
    background: rgba(4, 14, 7, 0.55);
    backdrop-filter: blur(18px);
    ```
  - `.mode-full` remains overlay, not flex-pushing. It can be `width: min(280px, 82vw)` and `height: min(760px, 82vh)`.
  - Add hover preview on devices with hover:
    ```scss
    @media (hover: hover) and (min-width: 768px) {
      .sidebar.mode-icons:hover {
        width: 260px;
      }
      .sidebar.mode-icons:hover .sidebar-label,
      .sidebar.mode-icons:hover .chat-title,
      .sidebar.mode-icons:hover .project-name {
        display: block;
      }
    }
    ```
  - Keep mobile as explicit slide-over overlay; mobile should not use hover expansion.

#### Hallway wall displays — continuous corridor movement

- Do **not** implement the hallway as depth pages, pagination, tab switching, carousel steps, or fixed left/right panels with swapped content.
- The hallway is a fixed 100vh viewport. Mouse wheel must not scroll the document. Wheel input updates a continuous `targetTravel` value. An animation loop lerps `currentTravel` toward it:
  ```ts
  targetTravel += event.deltaY * 1.2;
  targetTravel = clamp(targetTravel, 0, maxTravel);
  currentTravel += (targetTravel - currentTravel) * 0.08;
  ```
- The 3D structure should be:

  ```scss
  .corridor-scene {
    perspective: 1200px;
    overflow: hidden;
  }

  .corridor-world {
    transform-style: preserve-3d;
    transform: translateZ(var(--travel));
  }
  ```

- Replace two huge panels with many repeated cards positioned along Z:
  ```ts
  left card 0: z = 0;
  left card 1: z = -600;
  left card 2: z = -1200;
  left card 3: z = -1800;
  ```
- Left wall cards are Random Access Memory / Random Chats. Right wall cards are Project Index / Project Chats.
- Cards physically move through space as the world translates. They should come from the far center, grow as they approach, pass beside the viewer, and disappear behind the camera.
- Wall cards must be heavily angled into the corridor walls, not front-facing dashboards:

  ```scss
  .left-wall-card {
    position: absolute;
    left: 8vw;
    transform: translate3d(0, 0, var(--z)) rotateY(68deg);
  }

  .right-wall-card {
    position: absolute;
    right: 8vw;
    transform: translate3d(0, 0, var(--z)) rotateY(-68deg);
  }
  ```

- Between cards, render repeated corridor sections along Z. Each section should include left/right vertical ribs, ceiling rib, floor rib, green edge glow, and circuit/grid linework. The background image is not enough; CSS/HTML geometry must create depth.
- Add depth layers on top of `corridor-hall.png`: moving floor grid, moving ceiling lines, side rails, particles at multiple speeds, fog at the vanishing point.
- Calculate card depth from `localZ = card.z + currentTravel`:
  - near cards: opacity `1`, blur `0`, scale `1`, stronger glow;
  - far cards: opacity `0.15–0.35`, blur `2–4px`, scale about `0.75`;
  - behind-camera cards: opacity `0`, `pointer-events: none`.
- Automatically highlight the nearest card by smallest distance from camera, not by page index.
- The nearest card must also be mirrored into a readable center inspector/preview so the user can actually read the content without fighting the wall angle. Clicking this inspector opens the full focus panel.
- Wall-card hit testing must be forgiving. Do not make only tiny, deeply angled text areas clickable. Visible/near cards and the center inspector should both be actionable.
- Right-wall project cards and project-chat cards must carry the project color as a visual grouping marker. Use a right-edge color strip/dot/glow sourced from `project.color`, so chats from different projects are distinguishable while moving through the corridor.
- The center portal stays visually embedded at the far vanishing point. It should not read as a normal centered UI element.

Previous wall-display sizing notes are secondary and only apply if they do not conflict with the continuous Z-world model:

- Increase `corridor-bg` visibility now that it is the actual generated image.
- Position wall cards/screens to match the generated corridor image:
  ```scss
  .corridor-wall--left {
    left: 6vw;
    width: 28vw;
  }
  .corridor-wall--right {
    right: 6vw;
    width: 28vw;
  }
  ```
- Use clip paths to create a mounted trapezoid screen:
  ```scss
  .corridor-wall--left {
    clip-path: polygon(0 3%, 100% 13%, 100% 87%, 0 97%);
  }
  .corridor-wall--right {
    clip-path: polygon(0 13%, 100% 3%, 100% 97%, 0 87%);
  }
  ```
- The screen fill should be translucent enough to avoid killing the background:
  ```scss
  background: rgba(0, 8, 3, 0.72);
  backdrop-filter: blur(2px);
  ```
- Keep row text readable: titles 11-13px desktop, 13-14px mobile.
- On mobile: widen panels and reduce rotation; readability beats perspective.

### 4.4 Verification checklist

After changes, verify in browser:

- At 1440x900 and 1920x960: corridor background visible behind the entire main app area.
- Sidebar rail floats over the left edge and no longer pushes the hallway content.
- Hovering/opening the sidebar overlays on top of the hallway, with no horizontal content shift.
- The wall displays visually align with the corridor walls and no longer look like unrelated flat web panels.
- The left wall shows Random Chats; the right wall shows Projects/Project Chats.
- Wheel navigation still changes depth.
- Clicking a wall row still opens the focus panel and camera tilt.
- Browser console has no visible errors/404s.
- `npm run typecheck`, `npm run build`, and relevant tests pass.

---

## 5. Success Criteria

Before/after comparison checklist:

- [ ] LayoutShell renders the hallway as the full content plane after portal entry
- [ ] Sidebar cycles through `full` / `icons` / `hidden` modes with smooth transitions
- [ ] Sidebar is floating overlay and never pushes the hallway content
- [ ] HeaderBar shows on every page with context-aware controls
- [ ] Corridor wall screens align with `corridor-hall.png`
- [ ] Corridor wall text remains readable on desktop, tablet, and mobile
- [ ] Chat page works comfortably on 320px, 768px, 1024px, 1440px widths
- [ ] No overflow or cutoff issues at any width
- [ ] `npm run build` passes with no errors
- [ ] `npm run lint` passes with no errors where the project lint tool is available
- [ ] All existing functionality works (send, receive, brain toggle, project management, settings)
- [ ] `prefers-reduced-motion` disables all animations when set
- [ ] All empty states have call-to-action buttons
- [ ] Sidebar search filters both chats and projects

---

_Last updated: June 2026_
_This document is a living plan — update as priorities shift._
