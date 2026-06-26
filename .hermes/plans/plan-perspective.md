# Plan: Perspective — The Strubloid Portal (3D Immersive Redesign)

> **Author:** AI-assisted study & plan  
> **Date:** 2026-06-26  
> **Goal:** Transform the 2D strubloid website into an immersive 3D experience inspired by The Matrix — a cube/portal you enter, where the sidebar becomes a wall, the center has depth/tunnel perspective, and the entire UI lives inside a living, breathing 3D environment.

---

## Table of Contents

1. [The Vision — What We Are Building](#1-the-vision)
2. [Research Study — How This Works on the Web](#2-research-study)
3. [Architecture — The Hybrid Approach](#3-architecture)
4. [Phase 0: Foundation & Dependencies](#4-phase-0-foundation)
5. [Phase 1: The 3D Room (Three.js Layer)](#5-phase-1-3d-room)
6. [Phase 2: CSS 3D Perspective UI Layer](#6-phase-2-css-perspective-ui)
7. [Phase 3: Matrix Aesthetic — Rain, Glow, Particles](#7-phase-3-matrix-aesthetic)
8. [Phase 4: Mouse-Driven Parallax & Camera Controls](#8-phase-4-parallax-controls)
9. [Phase 5: Brain Memory Visualization (3D Data Explorer)](#9-phase-5-brain-visualization)
10. [Phase 6: Navigation & Section Transitions](#10-phase-6-navigation-transitions)
11. [Implementation Order (Build Sequence)](#11-implementation-order)
12. [Performance Budget](#12-performance)
13. [Appendix: Reference Projects & Techniques](#13-appendix)

---

## 1. The Vision

### What the user described (verbatim)

> "A square that you enter, the walls are the same elements we have now. The center has a perspective that goes inside. The left panel is a perspective wall. Everything fits in this perspective. A cube we enter, and keep entering. Things seen in perspective — feel a wall there, not just a static 2D feel. More depth, more movement. Feel like I'm inside The Matrix. A square with 4 walls. When moving from one thing to another, feel like walking inside. Strubloid is an open portal to other machines. You enter a squared portal and new things show up. The brain savings — visually see what was saved, navigate around it."

### Design principles distilled

| Principle | Meaning |
|-----------|---------|
| **Depth** | The Z-axis is real. Elements have position, rotation, and scale in 3D space |
| **Immersion** | The browser window becomes a window into a 3D world, not a document |
| **Living environment** | Subtle animations always running — nothing is completely static |
| **Matrix aesthetic** | Green/neon glow, code rain, scanlines, dark with bright accents |
| **Room metaphor** | You are inside a cube. Each wall has a purpose |
| **Portal metaphor** | Navigation feels like moving through the space, not clicking links |

### The Room Layout (top-down view)

```
┌─────────────────────────────────────────────────────────────┐
│                      BACK WALL                               │
│              (Memory Brain Visualization)                     │
│                                                              │
│         ┌─────────────────────────────────────┐              │
│         │                                     │              │
│  LEFT   │         CENTER PORTAL               │   RIGHT     │
│  WALL   │         (Chat / Content)            │   WALL      │
│ (Side-  │         · Depth going inward        │  (Settings/ │
│  bar)   │         · Tunneling perspective     │   Projects) │
│         │         · 3D scroll                  │             │
│         └─────────────────────────────────────┘              │
│                                                              │
│                      FLOOR                                    │
│              (ChatComposer / Input)                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                         ↓
                   YOU ARE HERE
                  (The Camera)
```

---

## 2. Research Study

### 2.1 How 3D on the Web Actually Works

There are three fundamentally different techniques for creating 3D web experiences. Each has different trade-offs that matter for this project.

#### A. WebGL / Three.js (Native 3D)

- **What it is:** A full 3D engine that renders triangles/polygons directly to a `<canvas>` element using the GPU via WebGL or WebGPU.
- **Strengths:** True 3D geometry, lighting, shaders, shadows, camera controls, materials — everything a game engine has.
- **Weaknesses:** Renders to a flat canvas. HTML elements (inputs, text, buttons) cannot exist inside the 3D scene natively — they must be projected onto the canvas surface or overlaid. Text rendering in Three.js is handled via bitmap textures or SDF fonts, which means no real CSS styling, no `<textarea>`, no `<select>`, no native form controls.
- **Key libraries:** Three.js, React Three Fiber (R3F), @react-three/drei, @react-three/postprocessing.

**Critical insight for this project:** You CANNOT put an HTML textarea, select dropdown, or scrollable chat list inside a Three.js scene. The 3D canvas handles its own rendering. To have interactive web UI inside 3D, you need either:
  - `drei`'s `<Html>` component (projects HTML onto a 3D surface — expensive and limited)
  - CSS 3D transforms (place real HTML in 3D space using CSS)
  - A hybrid: Three.js for the environment/background, CSS 3D for the UI layer

#### B. CSS 3D Transforms

- **What it is:** The browser's own rendering engine (not GPU-accelerated in the same way) applies 3D transformations to real DOM elements using `perspective`, `transform: rotateX() rotateY() translateZ()`, and `transform-style: preserve-3d`.
- **Strengths:** Real HTML elements. Real CSS styling. Real interactivity (forms, inputs, clicks, scroll). Accessibility works. Text is crisp and selectable. MUCH simpler to integrate with an existing Next.js app.
- **Weaknesses:** Limited to transforming flat planes in 3D space. Cannot create actual 3D geometry (no cubes, no spheres, no lighting models). More limited animation options.
- **Key properties:** `perspective`, `transform-style: preserve-3d`, `backface-visibility`, `rotateY`, `translateZ`, `perspective-origin`.

**Critical insight:** CSS 3D transforms are PERFECT for the UI layer. The sidebar as a "wall" is literally `transform: rotateY(25deg) translateZ(-50px)`. The center with "perspective going inward" is `perspective: 800px` on the container with children at different Z depths. This preserves all existing components.

#### C. Hybrid (The Recommended Approach)

- **Use Three.js/R3F for:** The background/environment — the room walls with Matrix rain, floating particles, glow effects, the "world" the user is inside.
- **Use CSS 3D transforms for:** The UI layer — sidebar, chat content, composer, navigation. These are real HTML elements positioned in 3D space.
- **Bridge them:** The Three.js canvas sits as a fixed background behind the CSS 3D UI layer. The camera in Three.js moves in sync with the CSS perspective to maintain visual coherence.

### 2.2 The Matrix Aesthetic — What Makes It Work

Study of Matrix-inspired web designs and the actual film aesthetic:

| Element | Technical Implementation | Why It Works |
|---------|------------------------|--------------|
| **Code rain** | Canvas 2D rendering of falling katakana/ASCII characters | Creates sense of living data, the "machine" world |
| **Neon green glow** | CSS `box-shadow` / `drop-shadow` with green + UnrealBloomPass in Three.js | The accent color against dark backgrounds creates depth |
| **Scanlines** | CSS `repeating-linear-gradient` overlay with 1px lines or a custom shader | Gives the screen a CRT/old-tech feel |
| **Grid floors** | Three.js GridHelper or `repeating-linear-gradient` in CSS | Ground plane establishes spatial reference |
| **Fog** | Three.js `FogExp2` or CSS `perspective` + opacity falloff | Creates depth cue — things farther away are less visible |
| **Slow camera drift** | CSS `@keyframes` on `perspective-origin` or Three.js `OrbitControls` auto-rotate | The scene is alive, not static |
| **Glitch/static** | Three.js postprocessing glitch pass or CSS `clip-path` animation | Disruptions in the simulation |

### 2.3 Key Reference Projects Studied

| Project | Technique | What to Learn |
|---------|-----------|---------------|
| **Three.js Minecraft example** | Inverted BoxGeometry as a room | How to create the 4-wall room from a single box with flipped normals |
| **Linear app design system** | Clean 3D depth via CSS shadows and transforms | How to keep UI functional while 3D |
| **Matrix code rain (canvas)** | 2D canvas rendering of falling characters | Pure JS, no dependencies — runs independently |
| **R3F + drei Html** | HTML elements mapped to 3D positions | How to overlay UI on specific 3D surfaces |
| **Three.js Bloom example** | UnrealBloomPass for glow | How to make neon elements glow |
| **Bruno Simon's Three.js Journey** | Comprehensive 3D web course | Best practices for 3D performance |

### 2.4 Why NOT Pure Three.js

**Do NOT put the entire UI in Three.js.** Reasons:
- `<textarea>` (ChatComposer) cannot work inside a 3D scene — you'd lose native keyboard handling, auto-resize, and paste behavior
- `<select>` model picker would need a custom 3D dropdown
- Text rendering in Three.js (TextGeometry or Troika Text) is resolution-dependent and can't use CSS
- Accessibility (screen readers) would break completely
- SEO would break (Next.js SSR)
- Development speed would drop 10x — every UI change needs 3D coding

**Do use Three.js for the environment** behind and around the UI.

### 2.5 Key Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| 3D environment engine | Three.js via React Three Fiber (R3F) | Integrates naturally with Next.js, component-based |
| 3D helpers | @react-three/drei | Text, Html, environment, controls |
| Post-processing | @react-three/postprocessing | Bloom, glitch effects |
| UI 3D positioning | CSS 3D transforms (`perspective`, `rotateY`, `translateZ`) | All existing components work unchanged |
| Matrix rain | Canvas 2D overlay or custom shader | Better performance than Three.js particles for this effect |
| State management | Zustand (already in drei ecosystem) | Track 3D camera positions, UI states |
| Animation | CSS `@keyframes` + Framer Motion (existing) | UI animations stay in the React ecosystem |

---

## 3. Architecture

### 3.1 Layout Structure (Simplified)

```
<html>
  <body>
    <LayoutShell>
      <!-- LAYER 0: Three.js Canvas (always fixed) -->
      <ThreeCanvas>              ← position: fixed, z-index: 0
        <Room />                 ← inverted BoxGeometry
        <MatrixRain />           ← custom shader
        <Particles />
        <PostProcessing />       ← Bloom + Glitch
        <CameraController />     ← slow drift / mouse-follow
      </ThreeCanvas>

      <!-- LAYER 1: CSS 3D Scene (everything the user interacts with) -->
      <div className="perspective-scene">  ← perspective: 1000px, transform-style: preserve-3d
        <Sidebar />             ← transform: rotateY(25deg) translateZ(-80px)
        <main className="center-portal">   ← transform: translateZ(0), perspective: 800px
          <HeaderBar />          ← translateZ(20px)
          <ChatMessages />       ← translateZ(0px), scrolls with depth
          <ChatComposer />       ← translateZ(30px)
        </main>
        <!-- Right wall for Settings/Projects -->
        <RightPanel />           ← transform: rotateY(-25deg) translateZ(-80px)
      </div>
    </LayoutShell>
  </body>
</html>
```

### 3.2 The "Portal" — How the Center Tunnel Works

The center of the layout (the chat area) is treated as a **portal going inward**. This is achieved through:

1. **`perspective` on the outer container** — defines the vanishing point
2. **Nested `perspective` on the center** — creates a secondary depth field for the chat content
3. **Messages at different Z positions** — as you scroll, older messages appear deeper
4. **Fog effect via opacity** — messages farther away (older) are more transparent and smaller

```css
.center-portal {
  perspective: 800px;
  perspective-origin: center top;
  transform-style: preserve-3d;
}

.message {
  /* Each message sits slightly deeper in Z as you go back in history */
  transform: translateZ(calc(var(--message-index) * -2px));
  opacity: calc(1 - var(--message-index) * 0.02);
}
```

### 3.3 Camera Synchronization

The Three.js camera and the CSS perspective must move together for visual coherence.

**Approach:** Use `perspective-origin` in CSS and `camera.position` in Three.js, both driven by the same state (mouse position, scroll position).

```typescript
// Shared state via Zustand
const usePerspectiveStore = create((set) => ({
  cameraX: 0,
  cameraY: 0,
  scrollDepth: 0,
  activeWall: 'center', // which wall is currently active
  setCameraPosition: (x, y) => set({ cameraX: x, cameraY: y }),
  setScrollDepth: (d) => set({ scrollDepth: d }),
}))

// CSS: perspective-origin shifts with mouse
// Three.js: camera.position.x/y shifts with mouse
```

### 3.4 Component Tree (New & Modified)

```
LayoutShell
  ├── ThreeCanvas (NEW)
  │   ├── Room (inverted BoxGeometry)
  │   ├── WallMatrixRain (custom ShaderMaterial)
  │   ├── FloatingParticles (Points)
  │   ├── PortalRing (TorusGeometry at center entrance)
  │   ├── FloorGrid (GridHelper)
  │   └── CameraController
  ├── PerspectiveScene (NEW wrapper — CSS 3D)
  │   ├── Sidebar (existing, now rotateY + translateZ)
  │   ├── MainContent (center portal)
  │   │   ├── HeaderBar (existing, elevated Z)
  │   │   ├── MessageList (existing, depth-scroll)
  │   │   └── ChatComposer (existing, elevated Z)
  │   └── RightPanel (NEW — settings/projects wall)
  └── BrainVisualization (NEW — Three.js overlay for memory)
```

---

## 4. Phase 0: Foundation & Dependencies

### Step 0.1 — Install Three.js + React Three Fiber

```bash
npm install three @types/three @react-three/fiber @react-three/drei @react-three/postprocessing
```

**Compatibility check:** @react-three/fiber@9 pairs with React 19, which we have (19.2.7). Next.js 16.2.9.

### Step 0.2 — Install Zustand (state management)

```bash
npm install zustand
```

Zustand is already in the drei ecosystem — it's the recommended state manager.

### Step 0.3 — Create perspective store

`src/stores/perspective.store.ts` — Central state for camera, active wall, scroll depth, and mouse position.

### Step 0.4 — Define CSS custom properties for 3D

Add to `src/styles/_variables.scss`:
- `$perspective-depth: 1000px`
- `$wall-angle: 25deg`
- `$sidebar-z: -80px`
- `$composer-z: 30px`
- `$header-z: 20px`

### Step 0.5 — Create ThreeCanvas component wrapper

`src/components/ThreeCanvas.tsx` — R3F Canvas with SSR guard (`dynamic` import with `ssr: false`).

**Why SSR guard:** Three.js uses `window`, `canvas`, `WebGLRenderingContext` — none exist on the server. Must be client-only.

---

## 5. Phase 1: The 3D Room (Three.js Layer)

### Step 1.1 — Create the Room

The room is a BoxGeometry with inverted normals (faces pointing inward). The camera sits inside the box.

```typescript
// src/components/room/Room.tsx
function Room() {
  return (
    <mesh>
      <boxGeometry args={[20, 12, 20]} />
      <meshStandardMaterial
        side={THREE.BackSide}    // ← inverted normals
        transparent
        opacity={0.15}
        color="#0a0a0f"
      />
    </mesh>
  )
}
```

**What this creates:** A 20x12x20 unit box. The camera is inside it. The walls are semi-transparent dark panels.

### Step 1.2 — Wall Segmentation

Each wall needs to be a separate mesh so we can apply different materials/textures per wall.

```typescript
// Each wall is a PlaneGeometry positioned as a cube face
function RoomWalls() {
  return (
    <group>
      {/* Back wall — Memory Brain visualization */}
      <mesh position={[0, 0, -10]} rotation={[0, 0, 0]}>
        <planeGeometry args={[20, 12]} />
        <meshStandardMaterial color="#0d1a0d" />
      </mesh>
      {/* Left wall — Sidebar */}
      <mesh position={[-10, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args=[20, 12] />
        <meshStandardMaterial color="#0a0f0a" />
      </mesh>
      {/* Right wall — Settings/Projects */}
      <mesh position={[10, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[20, 12]} />
        <meshStandardMaterial color="#0a0f0a" />
      </mesh>
      {/* Floor — Grid */}
      <mesh position={[0, -6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#050805" />
      </mesh>
      {/* Ceiling */}
      <mesh position={[0, 6, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#050805" />
      </mesh>
    </group>
  )
}
```

### Step 1.3 — Floor Grid Helper

Three.js `GridHelper` provides a perspective grid on the floor — essential for the depth/space feel.

```typescript
import { Grid } from '@react-three/drei'

function FloorGrid() {
  return (
    <Grid
      position={[0, -5.9, 0]}
      args={[20, 20]}
      cellSize={0.5}
      cellThickness={0.6}
      cellColor="#1a3a1a"
      sectionSize={2}
      sectionThickness={1.2}
      sectionColor="#2a5a2a"
      fadeDistance={30}
      infiniteGrid
    />
  )
}
```

### Step 1.4 — Portal Ring (Entrance Frame)

At the "entrance" of the center portal, place a wireframe torus or ring that the user passes through visually — marking the transition from the room into the chat content.

```typescript
function PortalRing() {
  const meshRef = useRef()
  useFrame((state) => {
    meshRef.current.rotation.y = state.clock.elapsedTime * 0.3
    meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.1
  })
  return (
    <mesh ref={meshRef} position={[0, 1, 6]}>
      <torusGeometry args={[3, 0.05, 16, 64]} />
      <meshStandardMaterial color="#9ad933" emissive="#9ad933" emissiveIntensity={0.5} />
    </mesh>
  )
}
```

### Step 1.5 — Camera Setup

```typescript
function CameraController() {
  const { cameraX, cameraY } = usePerspectiveStore()
  const { camera } = useThree()

  useEffect(() => {
    // Initial position: slightly back, eye level
    camera.position.set(0, 0, 8)
    camera.fov = 60
    camera.lookAt(0, 0, -2)
  }, [])

  // Subtle drift based on mouse
  useFrame((state) => {
    camera.position.x += (cameraX * 0.5 - camera.position.x) * 0.02
    camera.position.y += (cameraY * 0.3 - camera.position.y) * 0.02
    camera.lookAt(0, 0, -2)
  })

  return null
}
```

---

## 6. Phase 2: CSS 3D Perspective UI Layer

### Step 2.1 — The Perspective Scene Wrapper

```scss
// src/styles/_perspective.scss

.perspective-scene {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100vh;
  perspective: 1000px;
  perspective-origin: center 45%;
  transform-style: preserve-3d;
  overflow: visible;  // don't clip the 3D walls
}
```

### Step 2.2 — Sidebar as a Left Wall

The sidebar needs to feel like it's on the left wall of the room — angled away from the user.

```scss
.sidebar.perspective-wall {
  transform: rotateY(28deg) translateZ(-60px);
  transform-origin: left center;
  // Keep it attached to the left edge but angled inward
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: 280px;
  backface-visibility: hidden;
}
```

**How it works:** `rotateY(28deg)` rotates the sidebar around its Y axis, making it appear as a flat surface angled away. `translateZ(-60px)` pushes it "into the room" so it feels like a wall.

### Step 2.3 — Center Portal (Main Content)

```scss
.center-portal {
  position: absolute;
  left: 280px;   // after sidebar
  right: 0;
  top: 0;
  height: 100%;
  perspective: 1200px;   // inner perspective for the tunnel
  perspective-origin: center 40%;
  transform-style: preserve-3d;
  overflow-y: auto;
  overflow-x: hidden;
}
```

### Step 2.4 — Depth-Scrolling Messages

Each message gets a Z offset based on its position in the scroll:

```scss
.message-item {
  transform: translateZ(calc(var(--depth) * -1px));
  opacity: calc(1 - var(--depth) * 0.015);
}

// The deeper messages get smaller
.message-item .message-content {
  transform: scale(calc(1 - var(--depth) * 0.008));
}
```

The `--depth` CSS variable is set dynamically via JavaScript as the user scrolls.

### Step 2.5 — ChatComposer Elevated

```scss
.chat-composer {
  transform: translateZ(30px);
  // Slightly elevated above the message list
  position: relative;
  z-index: 2;
}
```

### Step 2.6 — Right Wall (Future: Settings / Projects)

```scss
.right-panel.perspective-wall {
  transform: rotateY(-28deg) translateZ(-60px);
  transform-origin: right center;
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
  width: 280px;
  backface-visibility: hidden;
}
```

---

## 7. Phase 3: Matrix Aesthetic — Rain, Glow, Particles

### Step 3.1 — Matrix Code Rain (Canvas 2D)

A full-screen canvas overlay for the falling katakana/ASCII characters. This is rendered on a 2D canvas, not Three.js, because it's more performant for this specific effect.

```typescript
// src/components/effects/CodeRain.tsx
// Uses a <canvas> element with position: fixed, z-index: 0.5
// Drops columns of green characters at varying speeds
// Characters are katakana + ASCII + numbers
// Opacity fades from bright at top to dim at bottom
```

**Performance considerations:**
- ~60 columns × ~20 characters each
- Update every ~80ms (not every frame — code rain doesn't need 60fps)
- Use `requestAnimationFrame` but throttle character drops
- Only render on visible columns (skip off-screen)

### Step 3.2 — Bloom Post-Processing

```typescript
// src/components/effects/NeonGlow.tsx
import { EffectComposer, Bloom } from '@react-three/postprocessing'

function NeonGlow() {
  return (
    <EffectComposer>
      <Bloom
        luminanceThreshold={0.2}
        luminanceSmoothing={0.9}
        intensity={1.5}
      />
    </EffectComposer>
  )
}
```

Makes the neon elements (portal ring, accent-colored UI, grid lines) glow with a Matrix-green aura.

### Step 3.3 — Floating Particles

```typescript
// src/components/effects/FloatingParticles.tsx
// Uses Three.js Points with ~1000 particles
// Particles are small dots slowly floating in the room
// Green tint with random positions within the room bounds
// Slow upward drift (like dust in a beam of light)
function FloatingParticles() { ... }
```

### Step 3.4 — Wall Glow/Accent Lines

Each wall gets vertical accent lines that pulse slowly:

```scss
.wall-accent-line {
  position: absolute;
  height: 100%;
  width: 1px;
  background: linear-gradient(
    transparent,
    rgba(#9ad933, 0.3),
    rgba(#9ad933, 0.6),
    rgba(#9ad933, 0.3),
    transparent
  );
  animation: wallPulse 4s ease-in-out infinite;
}
```

### Step 3.5 — Scanline Overlay

```scss
// Applied to the entire perspective scene
.scanlines {
  position: fixed;
  inset: 0;
  z-index: 998;
  pointer-events: none;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 1px,
    rgba(0, 0, 0, 0.08) 1px,
    rgba(0, 0, 0, 0.08) 2px
  );
}
```

---

## 8. Phase 4: Mouse-Driven Parallax & Camera Controls

### Step 8.1 — Mouse Tracking

```typescript
// Track mouse position normalized to [-1, 1]
function MouseTracker() {
  const setCameraPosition = usePerspectiveStore((s) => s.setCameraPosition)

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1
      const y = (e.clientY / window.innerHeight) * 2 - 1
      setCameraPosition(x, y)
    }
    window.addEventListener('mousemove', handleMouse)
    return () => window.removeEventListener('mousemove', handleMouse)
  }, [])

  return null
}
```

### Step 8.2 — CSS Perspective-Origin Shift

```typescript
// Sync CSS perspective-origin with mouse
function usePerspectiveOrigin() {
  const { cameraX, cameraY } = usePerspectiveStore()
  const sceneRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sceneRef.current) return
    const x = 50 + cameraX * 8  // shift 8% max
    const y = 45 + cameraY * 5   // shift 5% max
    sceneRef.current.style.perspectiveOrigin = `${x}% ${y}%`
  }, [cameraX, cameraY])

  return sceneRef
}
```

### Step 8.3 — Section Transition (Wall Pivot)

When navigating between sections (Chat → Projects → Settings), the room rotates. This is the "walking inside the cube" feeling.

```typescript
function useWallTransition() {
  const activeWall = usePerspectiveStore((s) => s.activeWall)
  const sceneRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const rotations = {
      center: { ry: 0, rz: 0 },
      left:   { ry: 28, rz: 0 },   // sidebar wall
      right:  { ry: -28, rz: 0 },  // settings wall
      back:   { ry: 90, rz: 0 },   // memory wall
    }
    const target = rotations[activeWall] || rotations.center
    // Animate the scene's transform
    sceneRef.current?.style.setProperty('--wall-rotation', `${target.ry}deg`)
  }, [activeWall])

  return sceneRef
}
```

---

## 9. Phase 5: Brain Memory Visualization (3D Data Explorer)

### Step 9.1 — The Concept

Memory entries (from the Brain/Randoms system) are visualized as floating data particles/orbs in the room — specifically on the back wall. Each memory entry becomes a glowing node that you can navigate toward.

### Step 9.2 — Data → 3D Mapping

```typescript
interface MemoryNode {
  id: string
  title: string
  summary: string
  position: [number, number, number]  // placed on the back wall
  color: string                       // based on project or topic
  size: number                        // based on fact count / importance
  pulseSpeed: number                  // random for organic feel
}
```

### Step 9.3 — Rendering Memory Nodes

```typescript
// src/components/brain/MemoryNodes.tsx
function MemoryNodes() {
  const memories = useMemories()  // from existing memory service

  return memories.map((mem, i) => (
    <MemoryNode
      key={mem.id}
      position={[x, y, -9.5]}     // on the back wall
      title={mem.title}
      summary={mem.summary}
      size={calculateSize(mem)}
      color={getColor(mem)}
    />
  ))
}

function MemoryNode({ position, title, summary, size, color }) {
  const [hovered, setHovered] = useState(false)

  return (
    <group position={position}>
      {/* Glowing sphere */}
      <mesh
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <sphereGeometry args={[size, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 0.8 : 0.3}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Hover label (Html overlay) */}
      {hovered && (
        <Html distanceFactor={8}>
          <div className="memory-tooltip">
            <h4>{title}</h4>
            <p>{summary}</p>
          </div>
        </Html>
      )}
    </group>
  )
}
```

### Step 9.4 — Navigating Memory Space

When the user opens the Brain view, the camera transitions to face the back wall. The memory nodes become interactive — clicking one "enters" that memory, showing details. This is the portal-inside-a-portal concept.

**Visual effect:** When viewing memory, the room's walls move farther away (animate scale or camera FOV) and memory nodes zoom toward the user, creating a data-space feel.

---

## 10. Phase 6: Navigation & Section Transitions

### Step 10.1 — Room Rotation Navigation

Instead of page transitions, the room rotates. Clicking "Settings" rotates the room so the right wall faces you. Clicking "Projects" rotates to the back wall.

```typescript
// Simplified transition
function navigateTo(wall: 'center' | 'left' | 'right' | 'back') {
  usePerspectiveStore.setState({ activeWall: wall })
  // CSS transforms update → the world rotates
  // Three.js camera matches with smooth lerp
}
```

### Step 10.2 — Transition Animations

```scss
.perspective-scene {
  transition: transform 0.8s cubic-bezier(0.65, 0, 0.35, 1);
  transform: rotateY(var(--wall-rotation, 0deg));
}
```

**Timing:** 800ms ease-in-out creates a smooth "room turning" feeling.

### Step 10.3 — Sidebar Click → Wall Focus

When clicking a chat or section in the sidebar, that item doesn't just navigate — the wall "zooms" slightly:
1. Sidebar wall angle decreases (less rotated, more front-facing) → `rotateY(12deg)`
2. Center portal shifts right slightly → `translateX(20px)`
3. Camera in Three.js drifts left to look at the sidebar more directly

### Step 10.4 — Scroll → Tunnel Depth

```typescript
function useScrollDepth() {
  const scrollContainer = useRef<HTMLDivElement>(null)
  const setScrollDepth = usePerspectiveStore((s) => s.setScrollDepth)

  useEffect(() => {
    const el = scrollContainer.current
    if (!el) return

    const handleScroll = () => {
      const scrollPercent = el.scrollTop / (el.scrollHeight - el.clientHeight)
      // Map 0-1 scroll to 0-200 depth units
      setScrollDepth(scrollPercent * 200)
    }

    el.addEventListener('scroll', handleScroll)
    return () => el.removeEventListener('scroll', handleScroll)
  }, [])
}
```

As the user scrolls down in a chat:
- Messages gain depth → `translateZ` goes more negative
- The entire center tunnel visually extends inward
- The Three.js camera subtly pushes forward

---

## 11. Implementation Order

This is the recommended build sequence. Each step produces a working, testable increment.

### Sprint 1: Foundation (1-2 days)

| Step | Task | Files | Test |
|------|------|-------|------|
| 1 | Install deps: three, R3F, drei, zustand | package.json | ✅ `npm ls three` |
| 2 | Create `perspective.store.ts` | src/stores/ | ✅ Import in component |
| 3 | Create `ThreeCanvas.tsx` (dynamic import, SSR: false) | src/components/ | ✅ Renders blank canvas |
| 4 | Create perspective.scss with CSS custom properties | src/styles/ | ✅ Compiles |
| 5 | Wrap LayoutShell in ThreeCanvas (layer behind UI) | LayoutShell.tsx | ✅ Canvas visible as background |

### Sprint 2: CSS 3D UI (1-2 days)

| Step | Task | Files | Test |
|------|------|-------|------|
| 6 | Add `.perspective-scene` wrapper in LayoutShell | LayoutShell.tsx | ✅ No visual change yet |
| 7 | Apply sidebar as perspective wall | Sidebar.tsx, _sidebar-layout.scss | ✅ Sidebar angled |
| 8 | Apply center portal perspective | Chat page CSS | ✅ Depth perceptible |
| 9 | Apply composer elevation | ChatComposer.module.scss | ✅ Composer floats slightly |
| 10 | Add depth-scroll on messages | MessageList CSS | ✅ Messages recede on scroll |

### Sprint 3: 3D Room (2-3 days)

| Step | Task | Files | Test |
|------|------|-------|------|
| 11 | Create Room with inverted walls | room/Room.tsx | ✅ 4 walls visible |
| 12 | Add floor Grid | room/FloorGrid.tsx | ✅ Grid visible |
| 13 | Add CameraController with drift | room/CameraController.tsx | ✅ Subtle camera motion |
| 14 | Add PortalRing | room/PortalRing.tsx | ✅ Ring visible at center |
| 15 | Wire mouse tracking → camera sync | MouseTracker.tsx | ✅ Moving mouse shifts camera |
| 16 | Wire mouse → CSS perspective-origin | usePerspectiveOrigin.ts | ✅ Mouse parallax on UI |

### Sprint 4: Matrix Aesthetic (2-3 days)

| Step | Task | Files | Test |
|------|------|-------|------|
| 17 | Code rain canvas overlay | effects/CodeRain.tsx | ✅ Green characters falling |
| 18 | Bloom post-processing | effects/NeonGlow.tsx | ✅ Accent elements glow |
| 19 | Floating particles | effects/FloatingParticles.tsx | ✅ Dots floating in room |
| 20 | Wall accent lines | WallAccents.tsx | ✅ Pulsing vertical lines |
| 21 | Scanline overlay | _scanlines.scss | ✅ CRT line effect |
| 22 | Fog setup | Room.tsx (fog prop) | ✅ Depth fog on far walls |

### Sprint 5: Navigation & Transitions (1-2 days)

| Step | Task | Files | Test |
|------|------|-------|------|
| 23 | Room rotation on nav | LayoutShell.tsx, store | ✅ Clicking wall rotates scene |
| 24 | Transition animations | _perspective.scss | ✅ Smooth 800ms rotation |
| 25 | Sidebar click → wall focus | Sidebar.tsx | ✅ Sidebar angles change |
| 26 | Scroll → tunnel depth | useScrollDepth.ts | ✅ Scrolling pushes depth |

### Sprint 6: Brain Memory Visualization (2-3 days)

| Step | Task | Files | Test |
|------|------|-------|------|
| 27 | Fetch memory entries for 3D | brain/MemoryNodes.tsx | ✅ Data loaded |
| 28 | Render floating memory nodes | brain/MemoryNode.tsx | ✅ Orbs visible on back wall |
| 29 | Hover/click interactions | brain/MemoryNode.tsx | ✅ Tooltip shows memory |
| 30 | Navigate to memory wall | Navigation system | ✅ Camera rotates to back wall |
| 31 | "Enter memory" zoom effect | CameraController.tsx | ✅ Zoom into data |

---

## 12. Performance Budget

| Metric | Target | How to Achieve |
|--------|--------|----------------|
| FPS | 60fps (target), 30fps (minimum) | Three.js canvas on GPU, CSS transforms on compositor thread |
| First load JS | < +200KB for 3D | Dynamic import ThreeCanvas, lazy load effects |
| Code rain | ~2% CPU | 2D canvas, throttled updates (every 80ms) |
| Particles | < 1000 points | Use BufferGeometry + Points, no individual meshes |
| Room geometry | 6 planes = trivial | No complex meshes |
| Bloom | Off on low-end GPUs | Detect via `renderer.capabilities` |
| Mobile | Graceful degradation | Reduce particles, disable bloom, reduce code rain columns |
| Accessibility | Screen readers work | 3D is purely visual enhancement, all content in HTML layer |

### Fallback Strategy

```typescript
// src/lib/detect-3d-capability.ts
export function get3DCapability(): 'high' | 'medium' | 'low' {
  // Check WebGL support
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    if (!gl) return 'low'
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
    const renderer = debugInfo
      ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      : ''
    // Mobile GPUs or Intel integrated → medium
    if (renderer.includes('Intel') || renderer.includes('Mali') || renderer.includes('Adreno')) {
      return 'medium'
    }
    return 'high'
  } catch {
    return 'low'
  }
}
```

On **low** capability: Only CSS perspective (no Three.js, no code rain, no particles).
On **medium**: CSS perspective + code rain only (no Three.js room, no bloom).
On **high**: Everything.

---

## 13. Appendix

### A. Reference Techniques & URLs

| Technique | URL/Resource |
|-----------|-------------|
| Three.js Room (inverted normals) | https://threejs.org/manual/#en/cameras |
| R3F Introduction | https://r3f.docs.pmnd.rs/getting-started/introduction |
| drei documentation | https://github.com/pmndrs/drei |
| UnrealBloomPass | https://threejs.org/examples/#webgl_postprocessing_unreal_bloom |
| CSS 3D Transforms (MDN) | https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_transforms/Using_CSS_transforms |
| Matrix Code Rain (canvas) | https://codepen.io/search/pens?q=matrix+rain+canvas |
| GridHelper in R3F | https://docs.pmnd.rs/drei/en/helpers/grid |

### B. Key Files Reference (Current Project)

| Path | Purpose |
|------|---------|
| `src/components/LayoutShell/LayoutShell.tsx` | Main layout wrapper — where PerspectiveScene will be added |
| `src/components/LayoutShell/HeaderBar.tsx` | Chat header — minor Z elevation needed |
| `src/components/LayoutShell/HeaderBar.module.scss` | Header styles |
| `src/components/ChatComposer.tsx` | Input module — elevated Z position |
| `src/components/ChatComposer.module.scss` | Composer styles |
| `src/components/Sidebar.tsx` | Sidebar — becomes perspective wall |
| `src/styles/_sidebar-layout.scss` | Sidebar styles |
| `src/styles/_variables.scss` | SCSS variables — add $perspective-* |
| `src/app/globals.scss` | Global styles — add scanlines |
| `src/app/layout.tsx` | Root layout — dynamic import ThreeCanvas |
| `package.json` | Add deps |

### C. Package Dependencies to Add

```json
{
  "dependencies": {
    "three": "^0.170.0",
    "@react-three/fiber": "^9.0.0",
    "@react-three/drei": "^10.0.0",
    "@react-three/postprocessing": "^3.0.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@types/three": "^0.170.0"
  }
}
```

Note: Three.js is peer-dep of R3F. Drei includes many helpers (Text, Html, Grid, Environment, etc.) that we'll use per-phase.

### D. CSS Custom Properties to Add

```scss
// src/styles/_variables.scss additions
$perspective-depth: 1000px;
$wall-angle: 28deg;
$sidebar-z: -60px;
$composer-z: 30px;
$header-z: 20px;
$wall-z-back: -200px;
$room-transition: 0.8s cubic-bezier(0.65, 0, 0.35, 1);
```

```css
/* :root in globals.scss */
--room-width: 20;
--room-height: 12;
--room-depth: 20;
--wall-angle: 28deg;
--perspective-depth: 1000px;
```

### E. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Three.js bundle size large | Slow initial load | Dynamic import with `next/dynamic`, loading skeleton |
| CSS 3D clipping issues | Parts of UI invisible | Use `backface-visibility: hidden`, test all viewports |
| Performance on low-end | Janky experience | Capability detection, graceful degradation |
| Navigation complexity | Hard to maintain | Zustand store as single source of truth for camera/wall state |
| Accessibility lost | Screen readers unusable | All content in HTML layer (Three.js is only visual enhancement) |
| Motion sickness | Users feel disoriented | `prefers-reduced-motion` → disable all 3D transforms and camera movement |

### F. `prefers-reduced-motion` Handling

```scss
@media (prefers-reduced-motion: reduce) {
  .perspective-scene {
    perspective: none;
    transform: none !important;
  }
  .sidebar.perspective-wall,
  .right-panel.perspective-wall {
    transform: none !important;
  }
  .message-item {
    transform: none !important;
    opacity: 1 !important;
  }
  .scanlines,
  .code-rain {
    display: none;
  }
}
```

---

*End of plan-perspective.md — This document describes the complete study and implementation strategy for transforming strubloid into an immersive 3D Matrix-themed experience. Each phase builds on the previous, and every increment is testable. Discuss with the user before starting implementation to validate direction and prioritize phases.*
