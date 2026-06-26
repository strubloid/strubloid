# Plan: Strubloid Portal — The Immersive AI Space (2026)

> **Author:** AI-assisted study & plan
> **Date:** 2026-06-26
> **Goal:** Replace the 2D website with an immersive portal experience. The user doesn't "open pages" — they enter a digital space. Starting from a glowing circle on an empty canvas, scrolling through the portal into a spatial hallway where conversations live on physical walls.

---

## Table of Contents

1. [The Vision](#1-the-vision)
2. [Core Concept & User Journey](#2-core-concept--user-journey)
3. [Techniques to Study](#3-techniques-to-study)
4. [Architecture — The Hybrid Approach](#4-architecture)
5. [Visual Style System](#5-visual-style-system)
6. [Phase 0: Foundation & Dependencies](#6-phase-0-foundation--dependencies)
7. [Phase 1: Landing Page — The Portal Entrance](#7-phase-1-landing-page--the-portal-entrance)
8. [Phase 2: Fast Authentication — Portal Recognises You](#8-phase-2-fast-authentication)
9. [Phase 3: Scroll-to-Enter — The Transition](#9-phase-3-scroll-to-enter)
10. [Phase 4: Interior Hallway — The Spatial UI](#10-phase-4-interior-hallway)
11. [Phase 5: Left Wall — Random Chats](#11-phase-5-left-wall--random-chats)
12. [Phase 6: Right Wall — Projects](#12-phase-6-right-wall--projects)
13. [Phase 7: Navigation — Entering a Space](#13-phase-7-navigation)
14. [Phase 8: Mobile — Touch-Immersive](#14-phase-8-mobile)
15. [Phase 9: Polish, Accessibility, Performance](#15-phase-9-polish)
16. [Implementation Order](#16-implementation-order)
17. [Component Manifest](#17-component-manifest)
18. [Appendix: Reference Projects & Techniques](#18-appendix)

---

## 1. The Vision

### What we are building

Not a website. Not a dashboard. A **digital space you enter**.

The interface should feel like:

- Apple Vision Pro transitions meet science fiction
- A museum hallway with exhibits on the walls
- Portal entering another dimension
- Minimalist hacker aesthetic — clean, not dark
- Everything is discovered by moving forward

The user should feel **wonder, curiosity, flow, exploration, focus, calmness, immersion** — not the cognitive load of a traditional chat app.

### Design principles

| Principle | Meaning |
|-----------|---------|
| **Enter, don't load** | No page transitions. Every state change is a camera movement through space |
| **Physical navigation** | Walls, depth, distance, perspective. The interface is architecture |
| **Progressive discovery** | Start minimal (just a portal). Everything else is found by moving deeper |
| **Emotional contrast** | Random Chats feel quick/casual/ephemeral. Projects feel professional/persistent/powerful |
| **Glass + Light** | Clean white/glass environment with neon green accents. Not dark. Not Matrix. Apple Store meets Cyberpunk |
| **Zero instant appearance** | Every element fades, slides, scales, rotates. Nothing pops into existence |
| **Scroll = movement** | Scrolling moves the camera through space. It never feels like scrolling a webpage |

### What the user sees (the journey)

```
1. LANDING          →  2. AUTH              →  3. SCROLL-TO-ENTER    →  4. INTERIOR
                                                                            
  .  .  .              .  .  .                 PORTAL GROWS           HALLWAY
  . (○) .              . (○) .                 Camera moves toward    Left wall = Random Chats
  .  .  .              WHO ARE YOU             Passes through         Right wall = Projects
  STRUBLOID            [____]                  DIMENSIONAL SHIFT      Center = Current focus
  (empty calm)         (integrated input)      (cinematic)            (you travel deeper)
```

---

## 2. Core Concept & User Journey

### 2.1 Landing Page — The Portal

The landing page is **almost empty**. Center of screen:

- A large glowing circular portal (pure CSS + SVG, no Three.js)
- Strubloid logo inside the portal
- Soft animated rings pulsing
- Very subtle floating particles (CSS-only)
- Minimal ambient movement (slow rotation, breathing glow)

Bottom center: "STRUBLOID" in clean typography

That's it. Nothing else competing for attention. The user immediately understands: "This is the entrance."

### 2.2 Fast Authentication

The first interaction is identifying yourself. No login page. No large form.

The portal asks: **"Who are you?"**

- Text appears centered below the portal
- A clean, minimal input blends into the design (like the portal is receiving you)
- Or: "Continue as [previous user]" button if returning
- Instant access on submit — no loading screen

**It should feel like the portal recognises you, not like a website login.**

### 2.3 Scroll to Enter

After authentication, scroll (or swipe on mobile) triggers the transition:

1. As scroll increases, the **portal grows** larger
2. The background begins to shift — subtle parallax layers appear
3. Perspective changes — the portal seems to be getting closer
4. Objects slowly fade in at the periphery (hints of the interior)
5. Camera moves forward toward the portal
6. The portal fills the screen
7. **Camera passes through** — a brief light/dimensional shift effect

This transition must be **memorable and cinematic**. The user should feel they physically crossed into another space.

### 2.4 Interior Hallway

Once through the portal, the user stands in a **spatial hallway**:

- A long corridor viewed in perspective
- **Left wall**: Random Chats — floating panels, conversation previews, recent activity, memory cards
- **Right wall**: Projects — project cards, pinned items, health, progress, tasks
- **Center**: The destination — current chat, project workspace, or selected item
- **Floor**: Subtle reflection/grid providing spatial reference

The user is in the middle. Walls recede into the distance. Scrolling makes the user move forward — walls slide past naturally.

### 2.5 Emotional Architecture

The space communicates through visual language, not labels:

**Left Wall (Random Chats)**
- Cards are smaller, more dynamic
- Floating, ephemeral feeling
- Background is slightly more transparent/glass-like
- Motion is quicker, lighter

**Right Wall (Projects)**
- Cards are larger, more substantial
- Structured, grounded feeling
- Background is more solid
- Motion is slower, more deliberate
- The wall feels "deeper" — projects have weight

**Center**
- Always the current focus
- Everything leads toward it
- The vanishing point of the perspective

---

## 3. Techniques to Study

Before writing code, the following techniques need to be studied and understood. Each is critical to the immersive effect.

### 3.1 CSS 3D Perspective & Transform Chains

The hallway is built with `perspective` + `transform-style: preserve-3d`.

**What to study:**
- `perspective` vs `perspective()` transform — the difference between setting it on a container vs applying it as a transform
- `perspective-origin` — where the vanishing point sits (shift it for camera movement illusion)
- `transform-style: preserve-3d` — child elements inherit 3D space
- Nested perspectives — the hallway container has one perspective, individual wall objects have their own for card spacing
- `translateZ()` for depth layering — objects at different Z depths appear at different sizes/distance

**Key demo to build first:**
```css
.hallway {
  perspective: 1200px;
  perspective-origin: center 40%;
  transform-style: preserve-3d;
}

.wall-left {
  transform: rotateY(30deg) translateZ(-200px);
}

.wall-right {
  transform: rotateY(-30deg) translateZ(-200px);
}

.center-content {
  transform: translateZ(0);
}

/* Cards recede into distance */
.card {
  transform: translateZ(calc(var(--card-index) * -10px));
  opacity: calc(1 - var(--card-index) * 0.05);
}
```

### 3.2 Framer Motion Scroll-Driven Animation

The scroll-to-enter and hallway-movement effects depend on Framer Motion's scroll utilities.

**What to study:**
- `useScroll()` — track scroll progress (Y for enter, X for hallway horizontal?)
- `useTransform()` — map scroll progress to specific values (portal scale, camera Z, wall angle)
- `useSpring()` — add velocity/spring physics to scroll-driven values for buttery feel
- `useVelocity()` — detect how fast user is scrolling to adjust animation speed
- `motion.div` with `style` transforms that change based on scroll

**Critical pattern:**
```tsx
const { scrollYProgress } = useScroll()
const portalScale = useTransform(scrollYProgress, [0, 0.5], [1, 80])
const cameraZ = useTransform(scrollYProgress, [0, 0.5], [0, -500])
const hallwayOpacity = useTransform(scrollYProgress, [0.3, 0.6], [0, 1])

// Spring physics smoothed
const smoothScale = useSpring(portalScale, { stiffness: 100, damping: 30 })
const smoothZ = useSpring(cameraZ, { stiffness: 100, damping: 30 })
```

### 3.3 The "Pass Through Portal" Illusion

This is the most technically challenging effect. The user scrolls, the portal grows to fill the screen, then they're "inside."

**Approach to study (CSS-only ideal, Framer Motion fallback):**

1. **Portal container** has `clip-path: circle()` that grows from `(50%, 50%, 0%)` to `(50%, 50%, 100%)`
2. The **interior scene** is rendered inside the clip-path, masked until the circle is large enough
3. At the moment the circle covers the full viewport, the clip-path is removed and the interior becomes the full view
4. A brief **flash/light bloom** at the transition moment covers the seam

Alternative approach (more reliable):
- The landing page and interior are two separate divs
- Scroll progress 0–0.5 = portal grows, camera approaches
- At scroll progress ~0.5, opacity crossfade happens rapidly (50ms)
- The interior scene fades in while the portal scene fades out
- Camera Z continues its motion so the illusion of "passing through" is maintained

**The "dimensional shift" effect:**
- Brief CSS filter `brightness(3)` or `hue-rotate(90deg)` at the transition point
- ~100ms flash creates the illusion of crossing a boundary
- `backdrop-filter: blur(20px)` on a transition overlay

### 3.4 Camera Motion Physics

The camera should never teleport. All movement must be interpolated.

**Study:**
- Framer Motion's `useSpring` for natural deceleration
- CSS `transition` with custom cubic-bezier for CSS-only transforms
- `scroll-snap-type: y mandatory` + `scroll-snap-align` for snappy hallway section navigation
- Match the scroll velocity to camera velocity — scroll fast = move fast through hallway

### 3.5 CSS-Only Particles

For the landing page floating particles, avoid Three.js. Use CSS-generated particles:

```css
/* Pseudo-element particles */
.particle-field {
  position: relative;
  overflow: hidden;
}

.particle-field::before,
.particle-field::after {
  content: '';
  position: absolute;
  width: 2px;
  height: 2px;
  background: rgba(0, 255, 65, 0.3);
  border-radius: 50%;
  animation: float 20s infinite;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0); opacity: 0; }
  10% { opacity: 0.6; }
  90% { opacity: 0.6; }
  50% { transform: translate(100px, -200px); }
}
```

For more particles, use a single `<canvas>` element with 50–100 particles (not Three.js). Canvas 2D for particles is trivial and fast.

### 3.6 Glassmorphism + White Aesthetic

The new visual direction is white/glass with green accents.

**CSS patterns to master:**
```css
.glass-card {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
}

/* Green accent glow */
.green-glow {
  box-shadow: 0 0 30px rgba(0, 255, 65, 0.15),
              0 0 60px rgba(0, 255, 65, 0.05);
}

/* Soft ambient light effect */
.ambient-light {
  background: radial-gradient(
    ellipse at 50% 0%,
    rgba(154, 217, 51, 0.06) 0%,
    transparent 60%
  );
}
```

### 3.7 Scroll-Driven Hallway Movement

The hallway should feel like moving through architecture, not scrolling a page.

**Technique:**
- Use `useTransform(scrollYProgress, [0, 1], [0, -hallwayLength])` on the Y axis of the hallway container
- As scroll goes from 0 to 1, the hallway container translates upward by the length of the hallway content
- Walls on left/right are `position: fixed` with their own scroll-based transforms for the parallax
- Cards on walls appear at different Z depths and scroll speeds based on their Z position

**Hallway layout CSS:**
```css
.hallway-scroll-container {
  height: 300vh; /* Taller than viewport to allow scrolling */
  position: relative;
}

.hallway-perspective {
  position: fixed;
  inset: 0;
  perspective: 1200px;
  transform-style: preserve-3d;
}

/* Center: the destination */
.center-content {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%) translateZ(0);
}

/* Left wall - rotates and recedes */
.wall-left {
  position: fixed;
  left: 5%;
  top: 10%;
  width: 35%;
  height: 80%;
  transform: rotateY(25deg) translateZ(-100px);
  transform-style: preserve-3d;
}

/* Right wall */
.wall-right {
  position: fixed;
  right: 5%;
  top: 10%;
  width: 35%;
  height: 80%;
  transform: rotateY(-25deg) translateZ(-100px);
  transform-style: preserve-3d;
}
```

### 3.8 Portal Ring Pulse Animation

The glowing portal on the landing page is pure CSS/SVG:

```tsx
// Pulsing ring with SVG
<motion.svg viewBox="0 0 200 200" className="portal-ring">
  <motion.circle
    cx="100" cy="100" r="40"
    fill="none"
    stroke="rgba(0, 255, 65, 0.3)"
    strokeWidth="1"
    animate={{
      r: [40, 50, 40],
      opacity: [0.3, 0.6, 0.3],
    }}
    transition={{
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  />
  <motion.circle
    cx="100" cy="100" r="60"
    fill="none"
    stroke="rgba(0, 255, 65, 0.1)"
    strokeWidth="0.5"
    animate={{
      r: [60, 70, 60],
      opacity: [0.1, 0.3, 0.1],
    }}
    transition={{
      duration: 5,
      repeat: Infinity,
      ease: "easeInOut",
      delay: 0.5,
    }}
  />
</motion.svg>
```

### 3.9 Wall Content as Physical Cards

Cards on walls shouldn't look like web components — they should look like physical objects mounted on a surface.

```css
.wall-card {
  /* Shadow that creates physical depth */
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.04),
    0 8px 16px rgba(0, 0, 0, 0.06),
    0 16px 32px rgba(0, 0, 0, 0.04);

  /* Glass surface */
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);

  /* Hover: card lifts slightly */
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.wall-card:hover {
  transform: translateZ(5px) scale(1.02);
}
```

### 3.10 Scroll Velocity Detection

To make scrolling feel like moving through space, detect velocity:

```tsx
const [velocity, setVelocity] = useState(0)
const lastY = useRef(0)
const lastTime = useRef(0)

useEffect(() => {
  const handleScroll = () => {
    const now = performance.now()
    const deltaY = window.scrollY - lastY.current
    const deltaT = now - lastTime.current
    if (deltaT > 0) {
      const v = Math.abs(deltaY / deltaT) * 16 // normalized to ~60fps
      setVelocity(Math.min(v, 20))
    }
    lastY.current = window.scrollY
    lastTime.current = now
  }
  window.addEventListener('scroll', handleScroll, { passive: true })
  return () => window.removeEventListener('scroll', handleScroll)
}, [])
```

This velocity value drives:
- Animation speed of wall card entrance
- Background parallax speed
- Particle movement speed
- Framer Motion spring stiffness/damping

---

## 4. Architecture

### 4.1 Technology Choices

| Concern | Choice | Why |
|---------|--------|-----|
| Framework | Next.js 14 (App Router) | Already using it |
| 3D Environment | **Avoid Three.js unless essential** | CSS transforms + Framer Motion achieve 95% of effects |
| Portal animation | Framer Motion (`useScroll`, `useTransform`, `useSpring`) | Scroll-driven animation is their core competency |
| Hallway perspective | CSS `perspective` + `transform-style: preserve-3d` | Zero JS overhead, hardware accelerated |
| Card physics | CSS `transition` with custom cubic-bezier | GPU composited, no JS during animation |
| Particles | Canvas 2D (single `<canvas>` element) | Minimal overhead, easy to control |
| Portal glow | SVG + CSS | Resolution independent, animatable |
| Glass effect | CSS `backdrop-filter: blur()` | Native, fast, elegant |
| State | Zustand | Already in project, lightweight |
| Landing page | Static Next.js page | Fastest possible load, no JS needed for initial render |
| SSR | Dynamic import for canvas | Only if we introduce canvas; otherwise fully SSR-able |

### 4.2 When to Use Three.js (Rarely)

Three.js/WebGL is **only** justified for:
- The "pass-through-portal" dimensional shift effect (if CSS can't achieve it convincingly)
- The interior hallway ambient particles/green fog (if Canvas 2D looks cheap)
- A future memory visualization mode

**Default assumption:** Do it in CSS first. Add Three.js only if the effect demonstrably fails without it.

### 4.3 Layout Architecture

```
<html>
  <body>
    <AppShell>

      {/* SCROLL CONTAINER — the driver of everything */}
      <div className="scroll-container">         ← height: 100vh for landing, 300vh for interior

        {/* === LANDING (Phase 1-2) === */}
        <LandingPage>                              ← position: fixed, full viewport
          <PortalGlow />                           ← SVG + CSS
          <ParticlesCanvas />                      ← Canvas 2D
          <AuthOverlay />                          ← Framer Motion
          <Branding />                             ← "STRUBLOID"
        </LandingPage>

        {/* === TRANSITION OVERLAY (Phase 3) === */}
        <TransitionOverlay />                       ← clip-path growth + flash

        {/* === INTERIOR (Phase 4+) === */}
        <Hallway>                                  ← perspective: 1200px, preserve-3d
          <WallLeft>                               ← rotateY(25deg)
            <RandomChatCard />                     ← glass cards, repeat
          </WallLeft>
          <WallRight>                              ← rotateY(-25deg)
            <ProjectCard />
          </WallRight>
          <CenterFocus>                            ← translateZ(0)
            <CurrentChat />
            <CurrentProject />
          </CenterFocus>
        </Hallway>

      </div>
    </AppShell>
  </body>
</html>
```

### 4.4 State Architecture (Zustand)

```typescript
interface PortalState {
  // Phase tracking
  phase: 'landing' | 'auth' | 'transition' | 'interior'

  // Scroll-driven values
  scrollProgress: number       // 0 → 1 across entire experience
  portalScale: number          // derived: 1 → 80
  cameraDepth: number          // derived: 0 → -500 (how far into portal)

  // Interior
  hallwayPosition: number      // how far down the hallway (0 → hallwayLength)
  activeWall: 'left' | 'right' | 'center' | null
  activeChatId: string | null
  activeProjectId: string | null

  // Auth
  username: string | null
  isReturningUser: boolean

  // Actions
  setPhase: (p: PortalState['phase']) => void
  setScrollProgress: (p: number) => void
  setActiveWall: (w: PortalState['activeWall']) => void
  setUsername: (u: string) => void
}
```

---

## 5. Visual Style System

### Palette (Reference Image Analysis)

Image 2 (the target reference, 1900×951px) defines:
- **Background**: Subtle gradient from `#e8e8ed` (top) → `#f5f5f7` (bottom). The top ~30% is slightly darker (RGB ~219) creating depth, the bottom ~70% is near-white (RGB ~241).
- **Dark elements** (~5% of frame): UI text, subtle dividers, card shadows. Very restrained.
- **Mid-gray elements** (~2.5%): Glass borders, muted labels.
- **Accent**: Neon green (`#00ff41`) used sparingly — only for portal glow, interactive hints, and active states.
- 88%+ of the frame is white space / light gray. No large color blocks.
- **Material feel**: Apple-like "white glass" — translucent cards, frosted blur, thin borders.
- **Shadow language**: Ultra-soft (`0 1px 3px rgba(0,0,0,0.04), 0 4px 8px rgba(0,0,0,0.02)`). Almost imperceptible — just enough to separate layers.
- **Typography**: Ultra-light weight (250/300), wide letter-spacing (0.2em+), small caps for branding. Labels are muted (`#8e8e93` / `#aeaeb2`).

### Critical Implementation Detail: Standalone Fullscreen (with React Portal)

The portal MUST render as a **standalone fullscreen layer**, bypassing LayoutShell's stacking context entirely. This is NOT achievable with z-index alone when the portal is inside `<main>`.

**The stacking trap**: The LayoutShell has `position: relative` on its inner wrappers, and `<main>` has `position: relative; z-index: 0`. Even though the portal uses `position: fixed; z-index: 999999`, it's trapped inside `<main>`'s stacking context. The sidebar (sibling of `<main>` at `.layout-body` level) stacks above `<main>` in the parent stacking context, making the sidebar visible through the portal.

**The fix — `createPortal` to `document.body`**:
- `page.tsx` uses `createPortal` to render the portal overlay directly as a child of `document.body`, the last child, with `z-index: 999999`.
- This places the portal in the ROOT stacking context, above every child of `<body>`, including the LayoutShell.
- Verified: `document.elementFromPoint(5, 5)` returns the portal, not the sidebar.

Key requirements:

1. **`createPortal( <PortalOverlay />, document.body )`** — renders portal as direct child of `<body>`, bypassing LayoutShell's stacking constraints.
2. **`position: fixed; inset: 0; z-index: 999999`** — covers the full viewport.
3. **Override document backgrounds** — the `<html>` and `<body>` default to dark (`#0a0a0f`). The portal must force them to `#f5f5f7` via JS `useEffect` to prevent dark bleed at edges and during JS load.
4. **Remove `dark` class** from `<html>` while portal is active — Tailwind dark mode would otherwise cascade into portal child elements.
5. **LayoutShell children remain in DOM** — sidebar/header stay behind the portal. The portal's opaque background + z-index coverage makes them invisible.
6. **`body.style.overflow = 'hidden'`** — prevents body scroll while portal is active, forcing all scroll behavior to the portal's internal 500vh scroll track.
7. **Cleanup on unmount** — restore backgrounds, `dark` class, and `overflow` when leaving the portal (route change).

### 5.1 Color Palette

```css
:root {
  /* Environment */
  --env-bg: #f5f5f7;                    /* Light cool white — the "room" background */
  --env-wall: #e8e8ed;                  /* Slightly darker for walls */
  --env-floor: #f0f0f5;                /* Floor color */

  /* Glass */
  --glass-bg: rgba(255, 255, 255, 0.08);
  --glass-border: rgba(255, 255, 255, 0.12);
  --glass-hover: rgba(255, 255, 255, 0.15);

  /* Green Accent */
  --accent-green: #00ff41;             /* Primary glow */
  --accent-green-soft: #9ad933;        /* Secondary */
  --accent-green-glass: rgba(0, 255, 65, 0.08);

  /* Text */
  --text-primary: #1a1a2e;             /* Dark for contrast against light bg */
  --text-secondary: #6b7280;
  --text-on-glass: rgba(255, 255, 255, 0.9);

  /* Shadows */
  --shadow-card: 0 2px 4px rgba(0,0,0,0.04), 0 8px 16px rgba(0,0,0,0.06);
  --shadow-glow: 0 0 30px rgba(0,255,65,0.15), 0 0 60px rgba(0,255,65,0.05);

  /* Dimensions */
  --hallway-perspective: 1200px;
  --wall-angle: 28deg;
  --wall-distance: -150px;
  --card-gap: 20px;
}
```

### 5.2 Typography

- Primary: **Inter** (already in project)
- Display/Monospace for code elements: **JetBrains Mono** or **SF Mono**
- Portal text: clean, thin weight, wide letter-spacing

### 5.3 Spatial Constants

| Element | Value | Notes |
|---------|-------|-------|
| Hallway perspective | 1200px | Gives slight but not exaggerated depth |
| Wall angle | 28deg | Matches current plan for consistency |
| Wall Z offset | -150px | Walls sit behind center |
| Card spacing | 20px | Vertical gap between wall-mounted cards |
| Center Z | 0px | The vanishing point |
| Camera default Z | 0px | At center, looking forward |
| Camera chat Z | -200px | When entering a chat (closer) |
| Camera project Z | -300px | Closer for projects (more immersive) |

---

## 6. Phase 0: Foundation & Dependencies

### Step 0.1 — Install Framer Motion

```bash
npm install framer-motion
```

Already installed? Verify with `npm ls framer-motion`. If not present, install.

Framer Motion is the **core animation engine** — scroll-driven animations, spring physics, layout animations, AnimatePresence for portal transitions.

### Step 0.2 — Create Portal Store

`src/stores/portal.store.ts`

Zustand store with all portal state (phase tracking, scroll progress, active wall, auth state).

### Step 0.3 — Create Utility Hooks

- `src/hooks/usePortalScroll.ts` — Scroll progress tracking from 0→1 (landing) then hallway progress
- `src/hooks/useScrollVelocity.ts` — Velocity detection for animation speed modulation
- `src/hooks/usePortalAuth.ts` — Auth state, portal recognition, "continue as" detection
- `src/hooks/useHallwayNavigation.ts` — Switch between left wall, right wall, center

### Step 0.4 — Global CSS Variables

Add the color palette and spatial constants to `globals.scss` or a new `_portal-variables.scss`.

### Step 0.5 — Install @next/font for JetBrains Mono (optional)

```bash
npm install @next/font
```

Or use the built-in `next/font` to load JetBrains Mono for code accents.

---

## 7. Phase 1: Landing Page — The Portal Entrance

### 7.1 Layout

The landing page is a **completely empty page** with only:
- Centered portal glow (SVG + CSS)
- Subtle particles (Canvas 2D or CSS pseudo-elements)
- "STRUBLOID" text centered below

**No navigation. No sidebar. No chat UI. Nothing.**

### 7.2 Portal Glow Component

`src/components/portal/PortalGlow.tsx`

- SVG circle with animated rings
- CSS `filter: blur()` + `drop-shadow()` for the glow
- Framer Motion animation for pulsing rings
- Green accent glow with soft falloff

The portal should look like you could **walk into it**. It should feel three-dimensional — achieved through layered SVG rings with different opacities and animation speeds.

### 7.3 Particle Field

`src/components/portal/Particles.tsx`

- Canvas 2D with 50–100 small dots
- Slow floating upward/drifting motion
- Very subtle — opacity 0.1–0.3
- Green-tinted
- No Three.js

### 7.4 Portal Container & SCSS Architecture

`src/components/portal/PortalContainer.tsx` — combines PortalGlow + Particles + AuthOverlay in a positioned layout. All `position: fixed` over the full viewport.

**SCSS files** that support the portal landing:

| File | Purpose |
|------|---------|
| `_portal-variables.scss` | All CSS custom properties — colors, glass params, shadows |
| `_landing.scss` | Component-specific styles: glow ring, dot, branding, auth input, scroll hint, vignette |
| `_glass.scss` | Reusable `.glass` utility class with backdrop-filter blur |

The background is a **CSS gradient** applied via inline style: `linear-gradient(180deg, #e8e8ed 0%, #f5f5f7 50%, #f5f5f7 100%)`. This matches Image 2's subtle top-to-bottom darkening.

**Richness enhancements** (added 2026-06-26):
- `portal-bg-deep` — multiple radial gradients at low opacity (green + blue tints) for ambient depth
- `portal-vignette` — stronger vignette for focus on the center portal
- `portal-tagline` — "your AI workspace" subtitle under the branding
- `portal-status` — "online" status dot at bottom-right
- Particles increased from 30→50, with larger dot sizes and subtle glow trails
- Portal glow container enlarged to 280×280px (was 200×200)
- All 4 SVG rings now rotate at different speeds in alternating directions (12s–60s periods)
- Center dot has 3-layer box-shadow glow (12px, 40px, 80px)

### 7.5 Branding

"STRUBLOID" in Inter font, thin weight, wide tracking (0.15em), positioned center-bottom with opacity 0.6.

---

## 8. Phase 2: Fast Authentication

### 8.1 The Portal Asks "Who are you?"

After a brief delay (~1 second on first visit), a minimal input appears:

```
                          . . .
                      .  ( ○ )  .
                      .  .  .  .
                      
              Who are you?
              [____type your name____]
              
              or
              
              Continue as [previous_user] →
```

### 8.2 Implementation

`src/components/portal/AuthOverlay.tsx`

- Framer Motion `AnimatePresence` for fade-in after delay
- Input styled as a minimal glass element — no borders, just a glowing underline
- On submit: store username, transition to Phase 3
- Check localStorage for previous username → show "Continue as" button

### 8.3 The "Continue as" Experience

If returning user:
- On landing, after ~500ms, show: "Welcome back, {name} →"
- Clicking it skips auth input and goes straight to scroll-to-enter
- The portal "recognizes" the user — this is the emotional hook

### 8.4 No Loading State

Auth must be instant. No API call on first visit — just store in localStorage. If we need a real auth check, do it in the background while the user experiences the portal.

---

## 9. Phase 3: Scroll-to-Enter

### 9.1 The Scroll Binding

After auth, the app enters the "portal transition" mode. Scrolling now drives:

1. **Portal scale** — `useTransform(scrollYProgress, [0, 0.4], [1, 80])`
   - At scroll 0: portal is its original size
   - At scroll 0.4: portal fills the entire screen

2. **Background shift** — subtle horizon line appears, stars/particles move faster in periphery

3. **Camera forward movement** — all interior elements slowly begin to shift into view

4. **Hallway pre-glow** — the interior hallway starts faintly visible behind the growing portal

### 9.2 The Transition Moment

At scroll progress ~0.4–0.5:

1. Portal covers entire viewport
2. **Flash/Light bloom** — CSS filter `brightness(3)` for ~100ms
3. The clip-path or opacity overlay swaps from landing to interior
4. Camera is now "inside" — the hallway is visible

The flash is critical. It covers the seam between the two scenes. Think of the light flash in sci-fi movies when crossing through a portal.

### 9.3 The Interior Reveal

At scroll progress 0.5+:

1. Hallway fades in (opacity 0→1 over 200ms)
2. Left wall panels begin to appear (staggered entrance)
3. Right wall panels begin to appear (staggered entrance)
4. Center focus area becomes visible
5. User is now in the hallway

### 9.4 Component

`src/components/portal/ScrollToEnter.tsx`

### 9.5 Implementation Notes (from actual build)

- **500vh scroll track** — a 500vh-height invisible div provides the scroll space needed for smooth Framer Motion `useScroll` progression. Without it, the scroll event fires too rapidly and the spring animation can't track smoothly.
- **Spring physics** — `useSpring` wraps `useTransform` with `{ stiffness: 60, damping: 25 }` for smooth organic feel on the portal scale-up.
- **SSR flash prevention** — During SSR, `page.tsx` renders a plain white fullscreen div. On client mount, it switches to the animated ScrollToEnter. This prevents a flash of the dark LayoutShell before hydration.
- **White flash** — At scroll 0.4, a `<motion.div>` with `background: #fff` and `opacity: 1` covers the viewport for ~150ms. This visually masks the transition from portal to hallway interior.
- **Gradient background** — The portal uses `linear-gradient(180deg, #e8e8ed 0%, #f5f5f7 50%, #f5f5f7 100%)` applied via inline style to match Image 2's subtle top-to-bottom darkening.
- **Phase lifecycle** — `scrollYProgress.on('change')` listener calls `setPhase('interior')` once when progress exceeds 0.4. A `transitioned` ref prevents re-triggers. Hallway renders 200ms later via a `useEffect` timeout.

- Wraps the scroll-to-enter logic
- Contains both the landing page and the interior overlay
- Uses `useScroll()` + `useTransform()` + `useSpring()` for smooth animations
- Handles the transition moment (flash, swap)

---

## 10. Phase 4: Interior Hallway

### 10.1 Hallway Container

`src/components/hallway/Hallway.tsx`

- CSS `perspective: 1200px` on a fixed container
- Three child containers: `WallLeft`, `WallRight`, `CenterFocus`
- Scroll drives vertical translation of hallway elements
- Walls rotate via `rotateY(±28deg)` with `translateZ(-150px)`

### 10.2 Scroll Physics

The hallway contains enough content to make scrolling feel substantial:

- Use `scroll-snap-type: y proximity` so users land on natural stopping points
- Each "chunk" of content (3-4 cards) is one scroll snap unit
- Between landing and end-of-hallway: ~200vh of scroll space

**Config:**
```typescript
const HALLWAY_LENGTH = 300 // vh equivalent
const CARDS_PER_VIEW = 4
const CARD_HEIGHT = 140 // px
```

### 10.3 Floating Ambient Elements

- Very subtle green-tinted fog near the floor (CSS gradient)
- Slow-moving geometric shapes (Framer Motion floating animation) at far hallway end
- A glow at the far end of the hallway — the "exit" or "next" point, creating curiosity

### 10.4 The "Travel" Feeling

As the user scrolls deeper, the ambient elements should shift:

- At hallway start: wide angle, lots of context, labels visible
- At hallway middle: narrower focus, cards are the primary visual
- At hallway end: everything converges toward the center, creating a climax point

This is achieved by gradually adjusting `perspective-origin` based on scroll progress.

---

## 11. Phase 5: Left Wall — Random Chats

### 11.1 Card Design

`src/components/hallway/RandomChatCard.tsx`

Each random chat appears as a glass card mounted on the left wall.

```tsx
<motion.div
  className="wall-card wall-card--random"
  style={{
    transform: `translateZ(${-index * 8}px)`,
    opacity: 1 - index * 0.03,
  }}
  initial={{ opacity: 0, x: -50 }}
  whileInView={{ opacity: 1, x: 0 }}
  transition={{ delay: index * 0.05 }}
>
  <div className="card-header">
    <span className="card-title">{chat.name}</span>
    <span className="card-time">{timeAgo(chat.updatedAt)}</span>
  </div>
  <p className="card-preview">{chat.lastMessage}</p>
  <div className="card-meta">
    <span>{chat.messageCount} messages</span>
    {chat.hasMemory && <span className="memory-badge">🧠</span>}
  </div>
</motion.div>
```

### 11.2 Card Content

Each card shows:
- Chat name/title
- Last message preview (1 line, truncated)
- Time since last activity
- Message count
- Memory indicator (if brain has data from this chat)
- Pinned indicator (if pinned)

### 11.3 Empty State

If no random chats exist, show a placeholder:
"A casual thought? It goes here."
With a "+ New Random Chat" button, styled as a glass card with dashed border.

### 11.4 Interaction

- Click card: hallway rotates slightly left, camera approaches, card expands → chat opens
- Hover: card lifts (translateZ + shadow increase)
- Long-press / right-click: context menu (pin, delete, rename)

---

## 12. Phase 6: Right Wall — Projects

### 12.1 Card Design

`src/components/hallway/ProjectCard.tsx`

Projects are visually heftier than random chat cards:

```tsx
<motion.div
  className="wall-card wall-card--project"
  style={{
    transform: `translateZ(${-index * 6}px)`,
  }}
  // Staggered entrance with slower animation (more deliberate)
  initial={{ opacity: 0, x: 50 }}
  whileInView={{ opacity: 1, x: 0 }}
  transition={{
    delay: index * 0.08,
    duration: 0.6,
    ease: [0.34, 1.56, 0.64, 1], // Bouncier = more substantial
  }}
>
  <div className="project-header">
    <h3 className="project-name">{project.name}</h3>
    {/* Health indicator: green/yellow/red dot */}
    <span className={`health-dot health--${project.health}`} />
  </div>
  <div className="project-stats">
    <span>{project.chatCount} chats</span>
    <span>{project.memoryCount} memories</span>
    <span>{project.memberCount} members</span>
  </div>
  <p className="project-description">{project.description}</p>
</motion.div>
```

### 12.2 Visual Differences from Left Wall

| Aspect | Random Chats (Left) | Projects (Right) |
|--------|-------------------|-------------------|
| Card size | Smaller (280px wide) | Larger (340px wide) |
| Card background | More transparent (0.06) | More solid (0.10) |
| Border | Thinner (0.5px) | Thicker (1px) |
| Corner radius | 12px | 16px |
| Animation speed | Faster entrance (0.4s) | Slower entrance (0.6s) |
| Hover lift | 3px | 6px |
| Shadow | Lighter | Heavier |
| Color accent | Green | Teal/green mixed |

These differences communicate the emotional contrast without labels.

### 12.3 Empty State

"No projects yet. Start something meaningful."
With a "+ New Project" button.

### 12.4 Interaction

- Click: hallway rotates toward right wall, camera approaches, project expands
- Projects "feel" bigger when opening — the camera gets closer, the card takes more of the field of view

---

## 13. Phase 7: Navigation — Entering a Space

### 13.1 The Camera Movement

When a user clicks a card (chat or project), the app doesn't navigate to a route — it **moves the camera**.

The sequence:
1. Hallway perspective shifts — `perspective-origin` slides toward the clicked wall
2. The wall rotates slightly more toward the user (wall angle goes from 28° to 15°)
3. The clicked card scales up (1→1.3×)
4. Other cards fade/slide out of view
5. Camera Z moves forward (center stays at Z=0, but camera.position.z moves to -200)
6. The wall content now fills the main view
7. The chat/project interface is the focus

### 13.2 Entering a Chat

`src/components/hallway/EnterChat.tsx`

When clicking a random chat card:

1. Left wall cards (non-selected) slide downward and fade
2. Left wall rotates slightly toward center (28° → 15°)
3. Selected card expands to fill ~70% of the viewport
4. The chat message list appears inside the expanded card
5. The ChatComposer appears at the bottom (glass style)
6. Center focus shifts to show the chat content

The transition should feel like **walking toward that part of the wall and sitting down at that conversation**.

### 13.3 Entering a Project

`src/components/hallway/EnterProject.tsx`

When clicking a project card:

1. Right wall cards fade downward
2. Right wall rotates toward center (28° → 10° — closer, more immersive)
3. The camera moves closer than for chat (Z: -200 vs -300)
4. Selected project expands to fill ~80% of viewport
5. Project workspace appears — tabs, files, chat threads
6. The transition is slower, more deliberate

### 13.4 Returning to Hallway

An "Exit" gesture:
- Press Escape
- Swipe down (mobile)
- Click a small "×" or "Back to Hallway" in the corner

The camera reverses its movement: card shrinks, wall rotates back, other cards slide back in.

### 13.5 Navigation Between Items

While inside a chat/project, the user can:
- Swipe left/right (mobile) to see other cards on that wall
- Click a different card to move to it (camera slides to new card)
- Scroll within the chat/project content

---

## 14. Phase 8: Mobile

### 14.1 Same Concept, Touch-Driven

The mobile experience should feel like **walking inside the same world**, not a responsive layout.

- Landing: Single tap to start (instead of scroll)
- Portal growth: Touch and hold → portal grows with finger pressure
- Through portal: Swipe up to enter
- Hallway: Swipe up/down to move through hallway
- Walls: Swipe left/right to focus on left/right walls
- Enter chat/project: Tap card, brief transition, interior view
- Exit: Two-finger swipe down or tap "×"

### 14.2 Touch Gesture Mapping

| Desktop (scroll) | Mobile (touch) |
|-----------------|----------------|
| Scroll down | Swipe up |
| Scroll up | Swipe down |
| Click left card | Swipe right then tap |
| Click right card | Swipe left then tap |
| Escape back | Two-finger swipe down |

### 14.3 Performance on Mobile

- No Three.js (already avoided)
- Reduce particle count to 20 (from 50-100)
- Reduce `backdrop-filter: blur()` to 10px (from 20px) — less expensive
- Use `will-change: transform` sparingly
- Reduce glass card shadow complexity
- Detect low-end device → flatten perspective to 2D fallback

---

## 15. Phase 9: Polish, Accessibility, Performance

### 15.1 Accessibility

| Concern | Implementation |
|---------|---------------|
| Screen readers | `aria-hidden="true"` on decorative portal/particles |
| Keyboard nav | Tab through cards in hallway, Enter to select, Escape to go back |
| Motion sensitivity | `prefers-reduced-motion` → flatten all perspective, disable scroll animations |
| Focus management | When entering a chat, focus the message input |
| Color contrast | Green on white: ensure all text meets WCAG AA (4.5:1) |
| Landmarks | `role="region"` on walls, `aria-label="Random Chats"` etc. |

### 15.2 Performance Budget

| Asset | Budget |
|-------|--------|
| Landing page JS | < 50KB (no Three.js) |
| Interior JS | < 100KB (Framer Motion + Zustand) |
| First paint | < 1s on desktop |
| Scroll response | < 16ms (60fps) |
| Portal transition | 60fps throughout |

### 15.3 Smoothness Guarantees

- All scroll-driven animations use `useSpring` for interpolation
- Spring stiffness/damping adapts to scroll velocity
- CSS `will-change: transform` on hallway, wall containers, cards
- GPU compositing: `transform` and `opacity` only (no layout-triggering properties during animation)
- Debounced scroll handlers for non-critical updates

### 15.4 Error States

- **No WebGL**: Particles fallback to CSS dots
- **Low memory**: Flat layout, no glass effect, no animations
- **Mobile Safari**: Test `backdrop-filter` support (known Safari issues) — provide solid background fallback
- **Auth failure**: Show a subtle error below the portal input
- **API failure** (loading chats/projects): Show glass card placeholders with "..." text

### 15.5 Testing

| Test type | What to test |
|-----------|-------------|
| Visual | Landing page renders with portal. Hallway has correct perspective |
| Scroll | Scroll-to-enter animation plays smoothly. Flash occurs at right progress |
| Auth | Username input appears. "Continue as" works. Data persisted |
| Navigation | Click card → camera moves. Click back → returns to hallway |
| Mobile | Swipe gestures work. Touch-driven portal growth works |
| Accessibility | Keyboard nav works. Screen reader doesn't read decorative elements |
| Performance | 60fps during scroll. No frame drops during transition |

---

## 16. Implementation Order

### Sprint A — Foundation (estimated: 2-3 hours)
- [ ] Install framer-motion (verify/install)
- [ ] Create `src/stores/portal.store.ts` (Zustand)
- [ ] Create `src/styles/_portal-variables.scss` (CSS vars)
- [ ] Create utility hooks (`usePortalScroll`, `useScrollVelocity`, `usePortalAuth`)
- [ ] Smoke test: store works, scroll values are tracked

### Sprint B — Landing Page (estimated: 3-4 hours)
- [ ] `src/components/portal/PortalGlow.tsx` — SVG ring animation
- [ ] `src/components/portal/Particles.tsx` — Canvas 2D particle field
- [ ] `src/components/portal/Branding.tsx` — "STRUBLOID" text
- [ ] `src/components/portal/AuthOverlay.tsx` — "Who are you?" input
- [ ] `src/app/page.tsx` — Rewrite landing to use PortalContainer
- [ ] Verify: Landing renders correctly, portal animates, particles float, auth works

### Sprint C — Scroll-to-Enter (estimated: 4-5 hours)
- [ ] `src/components/portal/ScrollToEnter.tsx` — scroll binding + transition
- [ ] Prototype: portal grows with scroll (scale transform)
- [ ] Implement: flash/brightness at transition point
- [ ] Implement: scene swap (landing → interior)
- [ ] Verify: scroll-to-enter feels cinematic, no jank

### Sprint D — Hallway Layout (estimated: 4-5 hours)
- [ ] `src/components/hallway/Hallway.tsx` — perspective container
- [ ] `src/components/hallway/WallLeft.tsx` — left wall wrapper
- [ ] `src/components/hallway/WallRight.tsx` — right wall wrapper
- [ ] `src/components/hallway/ScrollSnap.tsx` — scroll snap behavior
- [ ] CSS: perspective, wall angles, depth, floor gradient
- [ ] Verify: hallway looks correct, walls recede, scroll works smoothly

### Sprint E — Left Wall Content (estimated: 3-4 hours)
- [ ] `src/components/hallway/RandomChatCard.tsx` — card design
- [ ] Card entrance animation (staggered, glass transition)
- [ ] Fetch and map real random chat data
- [ ] Empty state
- [ ] Verify: cards render, entrance animation works, empty state shows

### Sprint F — Right Wall Content (estimated: 3-4 hours)
- [ ] `src/components/hallway/ProjectCard.tsx` — card design (heftier)
- [ ] Card entrance animation (slower, more deliberate)
- [ ] Fetch and map real project data
- [ ] Empty state
- [ ] Verify: cards feel heavier, emotional contrast with left wall

### Sprint G — Navigation (estimated: 4-5 hours)
- [ ] `src/components/hallway/CameraTransition.tsx` — camera movement logic
- [ ] `src/components/hallway/EnterChat.tsx` — chat interior view
- [ ] `src/components/hallway/EnterProject.tsx` — project interior view
- [ ] `src/components/hallway/ExitButton.tsx` — return to hallway
- [ ] Verify: camera moves smoothly, chat/project opens, exit works

### Sprint H — Mobile (estimated: 2-3 hours)
- [ ] Touch gesture handlers (swipe up/down/left/right)
- [ ] Touch-to-enter portal (press and hold)
- [ ] Mobile hallway layout adjustment
- [ ] Performance tuning for mobile
- [ ] Verify: mobile feels immersive, not like a responsive site

### Sprint I — Polish & QA (estimated: 2-3 hours)
- [ ] `prefers-reduced-motion` handling
- [ ] Keyboard navigation
- [ ] Error states
- [ ] Performance audit (60fps check)
- [ ] Visual QA against reference image

**Total estimated: 27–36 hours**

---

## 17. Component Manifest

### New Components to Create

| Component | File | Sprint |
|-----------|------|--------|
| PortalGlow | `src/components/portal/PortalGlow.tsx` | B |
| Particles | `src/components/portal/Particles.tsx` | B |
| Branding | `src/components/portal/Branding.tsx` | B |
| AuthOverlay | `src/components/portal/AuthOverlay.tsx` | B |
| ScrollToEnter | `src/components/portal/ScrollToEnter.tsx` | C |
| Hallway | `src/components/hallway/Hallway.tsx` | D |
| WallLeft | `src/components/hallway/WallLeft.tsx` | D |
| WallRight | `src/components/hallway/WallRight.tsx` | D |
| RandomChatCard | `src/components/hallway/RandomChatCard.tsx` | E |
| ProjectCard | `src/components/hallway/ProjectCard.tsx` | F |
| CameraTransition | `src/components/hallway/CameraTransition.tsx` | G |
| EnterChat | `src/components/hallway/EnterChat.tsx` | G |
| EnterProject | `src/components/hallway/EnterProject.tsx` | G |
| ExitButton | `src/components/hallway/ExitButton.tsx` | G |

### New Hooks to Create

| Hook | File | Sprint |
|------|------|--------|
| usePortalScroll | `src/hooks/usePortalScroll.ts` | A |
| useScrollVelocity | `src/hooks/useScrollVelocity.ts` | A |
| usePortalAuth | `src/hooks/usePortalAuth.ts` | A |
| useHallwayNavigation | `src/hooks/useHallwayNavigation.ts` | D |
| useTouchNavigation | `src/hooks/useTouchNavigation.ts` | H |
| useReducedMotion | `src/hooks/useReducedMotion.ts` | I |

### New Store

| Store | File | Sprint |
|-------|------|--------|
| portal.store | `src/stores/portal.store.ts` | A |

### New Styles

| File | Sprint |
|------|--------|
| `src/styles/_portal-variables.scss` | A |
| `src/styles/_landing.scss` | B |
| `src/styles/_hallway.scss` | D |
| `src/styles/_wall-cards.scss` | E |
| `src/styles/_glass.scss` | A |

### Files to Modify

| File | Change | Sprint |
|------|--------|--------|
| `src/app/page.tsx` | Replace with portal — standalone fullscreen, bypasses LayoutShell, overrides html/body bg | B |
| `src/app/globals.scss` | Import new partials (`portal-variables`, `landing`, `hallway`, `wall-cards`, `glass`) | A |
| `src/components/LayoutShell/LayoutShell.tsx` | No changes needed — portal covers via z-index + fixed position | D |
| `src/styles/_variables.scss` | No changes needed — portal uses its own `:root` vars | A |

---

## 18. Appendix: Reference Projects & Techniques

### CSS 3D Perspective
- [CSS 3D Transforms Guide (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_transforms/Using_CSS_transforms)
- [Intro to CSS 3D Transforms (David DeSandro)](https://3dtransforms.desandro.com/)
- [CSS Perspective Property](https://developer.mozilla.org/en-US/docs/Web/CSS/perspective)

### Framer Motion Scroll Animations
- [useScroll docs](https://www.framer.com/motion/use-scroll/)
- [useTransform docs](https://www.framer.com/motion/use-transform/)
- [useSpring docs](https://www.framer.com/motion/use-spring/)
- [Scroll-driven animations guide](https://www.framer.com/motion/scroll-animations/)

### Apple Vision Pro Design Language
- [Apple Human Interface Guidelines — Spatial](https://developer.apple.com/design/human-interface-guidelines/spatial-interfaces)
- Vision Pro glass/glassmorphism patterns: layered panels, subtle lighting, depth via shadow

### Glassmorphism
- [Glassmorphism CSS Generator](https://glassmorphism.com/)
- `backdrop-filter: blur()` support: Chrome/Edge 76+, Firefox 103+, Safari 9+

### Portal Transition Effect
- [CSS clip-path: circle() animation](https://developer.mozilla.org/en-US/docs/Web/CSS/clip-path)
- Framer Motion AnimatePresence for scene transitions

### Performance
- [CSS will-change property](https://developer.mozilla.org/en-US/docs/Web/CSS/will-change)
- [GPU Accelerated Rendering (Smashing Magazine)](https://www.smashingmagazine.com/2016/12/gpu-animation-doing-it-right/)
- [Scroll performance best practices](https://web.dev/articles/scroll-performance)

### Reference Image Analysis (Image 2 — `clip_20260626_172200_2.png`)

The target reference (1900×951px) was analyzed via pixel sampling:
- **88% white/light gray** (RGB 240–255) — the dominant visual is empty space.
- **5% dark elements** (RGB 0–30) — text, dividers, subtle card strokes.
- **2.5% mid-gray** (RGB 128–191) — secondary UI elements, glass borders.
- **Subtle gradient**: top ~30% of frame avg RGB(219, 220, 220) → bottom ~70% of frame avg RGB(241, 241, 243). Creates a gentle ceiling → floor depth.

Key takeaways for implementation:
1. The portal must be overwhelmingly **white/light gray** — not dark. Dark theme is abandoned for the entrance.
2. The **gradient** is critical to the premium feel — a flat white background won't match.
3. **Minimalism** — 88% empty space means every element must earn its place.
4. No large color blocks — green accent is used only for portal glow and interactive hints.
5. Apple-like refinement: thin borders, soft shadows, glass blur.

---

*End of plan-portal.md — This document describes the complete redesign of strubloid as an immersive portal experience. The direction has shifted from a dark Matrix room to a clean, white/glass spatial hallway entered through a glowing portal. CSS 3D transforms + Framer Motion are the primary techniques; Three.js is reserved only for effects that genuinely require it.*
