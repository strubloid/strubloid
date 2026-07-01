# Matrix Corridor Wall System — Reproducible Spatial UI Specification

> Status: authoritative design/implementation spec for Strubloid's Matrix-inspired corridor wall layout.
>
> Purpose: make the desired layout reproducible in any environment by a human or AI implementer with no context.
>
> Source material:
> - `/home/strubloid/apps/strubloid/matrix/00_full_spec_board.png`
> - `/home/strubloid/apps/strubloid/matrix/01_walls_feeling_before_after.png`
> - `/home/strubloid/apps/strubloid/matrix/02_hover_active_wall_behavior.png`
> - `/home/strubloid/apps/strubloid/matrix/03_depth_movement_side_based_scroll.png`
> - `/home/strubloid/apps/strubloid/matrix/04_click_open_expand_into_chat.png`
> - `/home/strubloid/apps/strubloid/matrix/05_hacker_mode_chat_experience.png`
> - `/home/strubloid/apps/strubloid/matrix/06_mode_toggle_hacker_normal.png`
> - `/home/strubloid/apps/strubloid/matrix/07_sound_motion_toggle.png`
> - `/home/strubloid/apps/strubloid/matrix/08_mobile_side_based_interaction.png`
> - `/home/strubloid/apps/strubloid/matrix/09_visual_style_guide_reference.png`
>
> Non-negotiable rule: this is not a list, carousel, dashboard, modal system, or flat overlay. It is a physical corridor with wall-mounted information slabs moving through 3D space.

---

## 1. Executive Summary

The Matrix corridor is a fixed-viewport spatial navigation system.

The user stands in the center of a long green-black tunnel. The left wall contains Random Chat memory walls. The right wall contains Project and Project Chat walls. Wheel or touch movement does not scroll the page. It moves wall-mounted information slabs through depth.

The important correction from previous failed iterations:

- Wrong: each chat appears one by one like `A`, `B`, `C` as separate plaques, with the rest of the wall empty.
- Correct: a whole wall slab appears. The slab has a header attached to it and a grid/table of multiple chats. Wheel movement moves the entire slab as one rigid physical object. The header, border, grid, rows, corner marks, glow, and all child chat tiles keep their internal shape and move together.

The user should feel:

1. A wall of information exists on the left or right side.
2. The wall belongs to the corridor architecture.
3. Wheel movement moves the wall through 3D space.
4. Hover keeps the wall stable for many seconds, never flickering or disappearing.
5. Hovering a chat tile makes that tile readable/active without moving the wall.
6. Clicking a chat tile pulls that chat out from the wall toward the center as a readable detail terminal.
7. The corridor remains visible behind the terminal.

---

## 2. Vocabulary

Use these words exactly in implementation discussions.

### Corridor

The fixed 100vh viewport. It owns the camera perspective, background image, fog, vanishing line, ribs, floor, ceiling, and global input handling.

### Camera

The viewer's implied eye. It does not literally move with CSS `camera` APIs. Movement is simulated by translating wall worlds or wall segments along the Z axis.

### Wall side

Either `left` or `right`.

- Left wall: Random Chats / Random Access Memory.
- Right wall: Projects and Project Chats / Project Index.

### Wall world

A per-side 3D container that owns all segments for that side.

Selector target:

```scss
.corridor-wall--left .corridor-wall__world
.corridor-wall--right .corridor-wall__world
```

The wall world may translate by travel, but this is not enough by itself. The visible unit must be a wall segment/slab, not a single chat card.

### Wall segment / wall slab

The main object that moves.

A wall segment is a large rectangular/trapezoidal mounted information board on the wall. It contains:

- a persistent header bar,
- a side label,
- a segment index/depth code,
- multiple chat/project tiles arranged as a table/grid,
- an internal glow/border frame,
- optional footer/status line.

The segment must move as one rigid group. Its header is stuck to the segment, not to the viewport.

### Chat tile

A row/card inside a wall segment. It represents one chat or one project chat. A chat tile can be hovered and clicked, but it should not be the unit that travels independently through the tunnel.

### Center preview

A stable readable preview near the vanishing point. It mirrors the currently hovered or nearest tile. It is optional when the wall segment itself is large and readable, but useful for accessibility and exact click targeting.

### Expanded terminal

The center detail view after click. It is not a normal webpage modal. It visually grows/pulls out from the wall tile toward the center while preserving a physical relationship to the corridor.

---

## 3. Reference Board Interpretation

The `/matrix` folder is not decorative. Each file describes a required behavior.

### `00_full_spec_board.png` — master board

Interpretation:

- It is the overview of the full system.
- It likely combines the main corridor, wall behavior, hover, scroll, click expansion, and visual style rules.
- The implementer must treat every later board as a zoomed-in acceptance criterion from this master board.

Implementation consequence:

- Build from architecture outward: corridor → wall planes → wall segments → internal chat tiles → hover → click expansion.
- Do not begin by styling standalone chat cards.

### `01_walls_feeling_before_after.png` — wall feeling

Target:

- Before/failure: floating or detached cards, empty corridor, isolated panels, or panels that read like browser lists.
- After/success: the left and right surfaces feel like actual walls, with UI mounted on them.

Implementation consequence:

- Add persistent wall surfaces behind segments.
- Use trapezoid clipping and perspective-matched rotation.
- Keep the wall surfaces visible at all times.
- Never hide a wall surface on hover.

### `02_hover_active_wall_behavior.png` — hover behavior

Target:

- Hovering left or right activates that wall.
- Activation means brighter glow, clearer contrast, stronger scanlines, maybe a subtle active rail.
- Activation does NOT mean the wall moves toward the mouse, rotates differently, jumps, changes layout, or disappears.

Implementation consequence:

- Hover changes only color, glow, filter, and maybe internal tile highlight.
- The computed transform of `.matrix-wall-segment` must stay byte-for-byte stable during a 3+ second hover hold.

### `03_depth_movement_side_based_scroll.png` — depth movement

Target:

- Wheel movement on a side makes a whole wall slab move through the tunnel.
- The next slab comes from the previous depth position into the active readable side position.
- The previous slab moves past the user/behind the camera.
- Header and child tiles remain attached to the slab.

Implementation consequence:

- Do not move individual chat cards independently as the primary motion.
- Group chats into slabs.
- Move slabs along Z with a single segment transform.

### `04_click_open_expand_into_chat.png` — click expansion

Target:

- The user clicks a chat tile inside a slab.
- That tile is pulled out of the wall toward the center.
- The movement should look like a physical extrusion from wall plane to center terminal.
- It must not look like a route navigation or generic popup.

Implementation consequence:

- Use an expansion animation with a clear origin: left tile pulls from left, right tile pulls from right.
- Keep corridor and both walls behind the terminal.
- While data loads, keep the terminal visible with a loading state.

### `05_hacker_mode_chat_experience.png` — hacker mode chat

Target:

- Hacker mode is the immersive Matrix/corridor mode.
- The chat experience should remain usable inside this mode: readable messages, input composer, terminal frame, green scanline/hacker aesthetic.

Implementation consequence:

- Expanded terminal must include full chat behavior, not just a summary.
- It should stream messages and keep composer/input stable.

### `06_mode_toggle_hacker_normal.png` — mode toggle

Target:

- Hacker Mode and Normal Mode are real modes, not just labels.
- Hacker Mode = spatial wall corridor.
- Normal Mode = practical readable lists.

Implementation consequence:

- Keep mode toggle visible/stable.
- Normal Mode can be a flat readable fallback, but it must not affect Hacker Mode geometry.

### `07_sound_motion_toggle.png` — motion/sound controls

Target:

- Motion can be reduced without breaking layout.
- Sound is a separate optional ambient/haptic layer.

Implementation consequence:

- Motion Off should reduce interpolation and effects, not turn the wall into a flat list.
- Sound Off/On must not change geometry.

### `08_mobile_side_based_interaction.png` — mobile side interaction

Target:

- On mobile/touch, the side rule still exists.
- Left half gestures control left wall. Right half gestures control right wall.
- Cards/tile tap targets remain stable and readable.

Implementation consequence:

- Do not rely on hover only.
- Touch pointer down stores active side.
- Vertical drag changes the travel of that side.

### `09_visual_style_guide_reference.png` — style guide

Target visual language:

- Matrix-inspired, but not unreadable.
- Dark graphite/olive surfaces.
- Warm lime green accent, close to `#9ad933` / `#b8ee48`.
- Fine grid/scanline/circuit detail.
- Transparent glass, but enough opacity to read.
- The corridor background remains visible; UI does not become a flat black dashboard.

Implementation consequence:

- Use green glows sparingly but confidently.
- Use terminal monospace for metadata.
- Avoid harsh pure neon cyan/blue.
- Avoid full-screen black masks hiding corridor depth.

---

## 4. Previous Commit Study

The previous working corridor idea existed around these commits:

- `37ce50a` — first corridor version.
- `c4ab1f9` — corridor 2, added readable preview and project color support.
- `379b2e5` — corridor 3, preserved readable preview and travel mechanics.
- `c564d12` — layout change around main chat window.

Important old mechanics discovered:

```ts
const CARD_GAP = 600;
```

Old behavior:

- items were placed at negative Z depths: `z = -index * CARD_GAP`.
- travel was a single number.
- each card computed `localZ = card.z + travel`.
- cards became readable near the camera.
- `ReadableNearestPreview` existed and rendered center readable content.
- CSS had:
  - `.corridor-travel-card--left { rotateY(68deg) }`
  - `.corridor-travel-card--right { rotateY(-68deg) }`
  - `.corridor-readable-preview`
  - `.corridor-focus`

What was good about the old commit:

- It understood depth.
- It had a center preview.
- It made hover/click easier than using only angled cards.
- It had project color strips.

What was not enough for the new `/matrix` requirement:

- It moved one chat card at a time.
- The user now wants a whole wall of information to move as a group.
- The header must be attached to the moving wall slab.
- Multiple chats must live inside a single slab.

Correct evolution:

- Keep the old Z-depth movement model.
- Replace `one chat = one moving wall object` with `one group/slab = one moving wall object`.
- Put many chat tiles inside each slab.
- Keep readable preview and click expansion.

---

## 5. Coordinate System

All numbers below are defaults for a 1536×1024 design board. They must scale with CSS variables, but these base numbers make the intended machine geometry unambiguous.

### Viewport

```txt
viewport.width  = 1536px
viewport.height = 1024px
horizonY        = 430px
vanishingX      = 768px
vanishingY      = 430px
cameraZ         = 0
nearClipZ       = +360px
farVisibleZ     = -3600px
```

### Scene CSS

```scss
.matrix-corridor-scene {
  position: fixed;
  inset: 0;
  overflow: hidden;
  perspective: 1200px;
  perspective-origin: 50% 42%;
  transform-style: preserve-3d;
}
```

Important:

- The scene itself must not rotate on hover.
- The perspective origin remains stable.
- Side-specific activity is expressed inside the wall, not by moving the camera.

### Left wall plane

For 1536×1024:

```txt
leftWall.surface.x        = 80px
leftWall.surface.y        = 118px
leftWall.surface.width    = 540px
leftWall.surface.height   = 760px
leftWall.transformOrigin  = left center
leftWall.rotateY          = +58deg to +68deg for strong wall feeling
leftWall.skewY            = -1deg to -3deg
leftWall.clipPath         = polygon(0 0, 100% 11%, 100% 89%, 0 100%)
```

Recommended CSS:

```scss
.matrix-wall-surface--left {
  left: clamp(48px, 5.2vw, 96px);
  top: 11.5vh;
  width: clamp(420px, 34vw, 620px);
  height: 74vh;
  transform-origin: left center;
  transform: perspective(1200px) rotateY(62deg) skewY(-2deg);
  clip-path: polygon(0 0, 100% 11%, 100% 89%, 0 100%);
}
```

### Right wall plane

Mirror of left:

```txt
rightWall.surface.right   = 80px
rightWall.surface.y       = 118px
rightWall.surface.width   = 540px
rightWall.surface.height  = 760px
rightWall.transformOrigin = right center
rightWall.rotateY         = -58deg to -68deg
rightWall.skewY           = +1deg to +3deg
rightWall.clipPath        = polygon(0 11%, 100% 0, 100% 100%, 0 89%)
```

Recommended CSS:

```scss
.matrix-wall-surface--right {
  right: clamp(48px, 5.2vw, 96px);
  top: 11.5vh;
  width: clamp(420px, 34vw, 620px);
  height: 74vh;
  transform-origin: right center;
  transform: perspective(1200px) rotateY(-62deg) skewY(2deg);
  clip-path: polygon(0 11%, 100% 0, 100% 100%, 0 89%);
}
```

---

## 6. Wall Segment / Slab Geometry

A wall segment is the core object.

### Segment dimensions

For each side:

```txt
segment.width        = 500px to 620px desktop
segment.height       = 620px to 760px desktop
segment.headerHeight = 56px
segment.footerHeight = 32px
segment.padding      = 18px
segment.tileGap      = 10px
segment.gridColumns  = 1 or 2 depending side/width
```

Use one segment for a group of chats:

```ts
const CHATS_PER_RANDOM_SEGMENT = 6;
const PROJECTS_PER_INDEX_SEGMENT = 4;
const CHATS_PER_PROJECT_SEGMENT = 6;
const SEGMENT_GAP_Z = 980; // not 340; this is a full wall slab spacing
```

### Segment transform

Each segment has its own Z position:

```ts
segment.z = -segmentIndex * SEGMENT_GAP_Z;
localZ = segment.z + wallTravel;
```

Segment world transform:

```scss
.matrix-wall-segment--left {
  transform:
    translate3d(0, -50%, var(--segment-z))
    rotateY(62deg)
    skewY(-2deg)
    scale(var(--segment-scale));
}

.matrix-wall-segment--right {
  transform:
    translate3d(0, -50%, var(--segment-z))
    rotateY(-62deg)
    skewY(2deg)
    scale(var(--segment-scale));
}
```

Do not transform child tiles independently for primary travel. Tiles are internal children of the segment.

### Segment internal layout

Random chat segment:

```txt
┌────────────────────────────────────────────┐
│ RANDOM ACCESS MEMORY        SEG 01 / 08    │  <- header, glued to slab
├────────────────────────────────────────────┤
│ [tile 01: New Chat]                        │
│ [tile 02: Numbers chat]                    │
│ [tile 03: Test strubloid search by brain]  │
│ [tile 04: What is the sky color?]          │
│ [tile 05: Test]                            │
│ [tile 06: New Chat]                        │
├────────────────────────────────────────────┤
│ wheel left side = memory wall travel       │  <- footer/status, glued to slab
└────────────────────────────────────────────┘
```

Project index segment:

```txt
┌────────────────────────────────────────────┐
│ PROJECT INDEX              SEG 01 / 04     │
├────────────────────────────────────────────┤
│ [project: Rafael]       2 chats   #f38181  │
│ [project: Strubloid]    4 chats   #ffe66d  │
│ [project: ...]                             │
│ [project: ...]                             │
├────────────────────────────────────────────┤
│ click project = pull project terminal       │
└────────────────────────────────────────────┘
```

Project chat segment:

```txt
┌────────────────────────────────────────────┐
│ PROJECT: STRUBLOID         SEG 02 / 04     │
├────────────────────────────────────────────┤
│ [chat: New Chat]                           │
│ [chat: Data to check]                      │
│ [chat: ...]                                │
│ [chat: ...]                                │
├────────────────────────────────────────────┤
│ project color strip persists on every tile  │
└────────────────────────────────────────────┘
```

### Segment depth styling

```ts
function segmentDepthStyle(segmentZ: number, travel: number) {
  const localZ = segmentZ + travel;

  if (localZ > 420) {
    return {
      opacity: 0,
      interactive: false,
      blur: 8,
      scale: 1.08,
      state: 'behind-camera'
    };
  }

  const distance = Math.abs(localZ);
  const readableBand = localZ > -260 && localZ < 160;
  const approachBand = localZ > -980 && localZ <= -260;
  const recedeBand = localZ >= 160 && localZ <= 420;

  return {
    opacity: readableBand ? 1 : approachBand ? 0.58 : recedeBand ? 0.32 : 0.18,
    interactive: localZ > -420 && localZ < 220,
    blur: readableBand ? 0 : approachBand ? 1.2 : 2.8,
    scale: readableBand ? 1 : approachBand ? 0.86 : 0.74,
    state: readableBand ? 'active-wall-position' : approachBand ? 'approaching' : 'far'
  };
}
```

The active wall position is where the whole slab is readable enough to hover tiles.

---

## 7. Wheel Movement — Exact Behavioral Spec

### Non-negotiable movement rule

Wheel movement moves a wall segment group, not individual chat cards.

When the user wheels on the left half:

```txt
leftWall.targetTravel changes
rightWall.targetTravel remains unchanged
window.scrollY remains 0
```

When the user wheels on the right half:

```txt
rightWall.targetTravel changes
leftWall.targetTravel remains unchanged
window.scrollY remains 0
```

### Input constants

Current issue: movement has felt too fast and complicated.

Use slower slab movement:

```ts
const SEGMENT_GAP_Z = 980;
const WALL_TRAVEL_SPEED = 0.22;     // deltaY multiplier
const TOUCH_TRAVEL_SPEED = 0.85;
const TRAVEL_LERP = 0.045;          // softer than 0.08
const TRAVEL_SETTLE_EPSILON = 0.05;
```

For a typical wheel notch/gesture:

```txt
input.deltaY = 120
travelDelta  = 26.4px
```

That means it takes roughly:

```txt
SEGMENT_GAP_Z / 26.4 ≈ 37 wheel notches
```

to move one full wall slab from one segment position to the next. This is intentionally slow and walk-like.

For high-resolution trackpads, accumulate small deltas normally but clamp per frame:

```ts
const MAX_DELTA_PER_EVENT = 80;
const normalizedDelta = clamp(event.deltaY, -MAX_DELTA_PER_EVENT, MAX_DELTA_PER_EVENT);
targetTravel += normalizedDelta * WALL_TRAVEL_SPEED;
```

### Segment movement timeline

Assume left wall has segments:

```txt
segment 0 z = 0
segment 1 z = -980
segment 2 z = -1960
segment 3 z = -2940
```

At `travel = 0`:

```txt
segment 0 localZ = 0       active/readable
segment 1 localZ = -980    approaching/far
segment 2 localZ = -1960   distant
segment 3 localZ = -2940   barely visible/fog
```

At `travel = 245`:

```txt
segment 0 localZ = +245    receding toward camera/edge
segment 1 localZ = -735    approaching, larger and brighter
segment 2 localZ = -1715   distant
```

At `travel = 490`:

```txt
segment 0 localZ = +490    behind camera, hidden/non-interactive
segment 1 localZ = -490    entering readable band soon
segment 2 localZ = -1470   distant
```

At `travel = 980`:

```txt
segment 0 localZ = +980    gone behind camera
segment 1 localZ = 0       active/readable
segment 2 localZ = -980    approaching/far
```

The user-visible feeling:

1. First wall slab starts readable on the side wall.
2. Wheel forward: the whole slab slides past the viewer, still keeping its header and internal tile grid intact.
3. The next slab approaches from the corridor depth, growing and sharpening.
4. At the next travel stop, the next slab occupies the same active wall position the previous slab had.

### Reverse movement

Wheel up reverses travel:

```ts
targetTravel = clamp(targetTravel + normalizedDelta * WALL_TRAVEL_SPEED, 0, maxTravel);
```

If `deltaY` is negative, previous segment returns from behind/depth to the active wall position.

---

## 8. Hover Behavior

Hover is about inspection, not movement.

### Hovering a wall side

When pointer enters left half:

```txt
activeSide = 'left'
leftWall.filter = saturate(1.12) brightness(1.06)
rightWall.filter = saturate(0.86) brightness(0.92)
leftWall.opacity = 1
rightWall.opacity = 1
NO transform changes
```

When pointer enters right half, mirror the behavior.

### Hovering a wall segment

The segment should remain physically locked to its wall plane.

Allowed changes:

- border-color stronger,
- glow stronger,
- scanline opacity slightly stronger,
- header metadata brightness stronger.

Forbidden changes:

- no `translateX`,
- no different `rotateY`,
- no different `skewY`,
- no layout reflow,
- no `display: none`,
- no opacity below 0.95 for active side,
- no changing pointer hit area.

### Hovering a chat tile inside a segment

Tile hover should:

1. brighten the tile;
2. show a stable internal hover ring;
3. update center preview with that chat;
4. optionally show a thin connection line from tile to center preview;
5. never move the slab.

Tile hover should last indefinitely. If the mouse stays still over a tile for 3, 5, or 10 seconds, the wall must remain visible and stable.

### Required hover test

This test must not be a 100ms smoke test. It must hold for real time.

Browser test shape:

```ts
const tile = page.locator('.matrix-chat-tile').first();
await tile.hover();
await page.waitForTimeout(3500);

const before = await tile.evaluate(el => getComputedStyle(el.closest('.matrix-wall-segment')!).transform);
await page.waitForTimeout(3500);
const after = await tile.evaluate(el => getComputedStyle(el.closest('.matrix-wall-segment')!).transform);

expect(after).toBe(before);
await expect(tile).toBeVisible();
await expect(page.locator('.matrix-wall-segment').first()).toBeVisible();
await expect(page.locator('.matrix-readable-preview')).toBeVisible();
```

Manual validation:

- Hover a tile.
- Count to 5 seconds.
- Nothing disappears.
- The wall does not jump.
- The preview remains visible.
- The hovered tile still looks selected.

---

## 9. Click Expansion Behavior

Clicking a chat tile should create a physical pull-out.

### Click stages

#### Stage 0 — idle wall

The segment is mounted on the wall. A tile is visible inside it.

#### Stage 1 — pointer down feedback, 0–80ms

The tile receives a subtle pressed state:

```txt
scale: 0.992
brightness: +8%
inner glow: stronger
```

No wall geometry changes.

#### Stage 2 — clone/extraction begins, 80–220ms

Create an animated extraction layer.

It begins at the tile's screen rect:

```ts
const sourceRect = tile.getBoundingClientRect();
```

Animate from:

```txt
x      = sourceRect.left
 y     = sourceRect.top
width  = sourceRect.width
height = sourceRect.height
rotateY = wall side angle (+62deg left / -62deg right)
opacity = 0.95
```

Toward center:

```txt
x      = viewport.width * 0.5 - terminal.width * 0.5
y      = viewport.height * 0.50 - terminal.height * 0.5
width  = min(1060px, 82vw)
height = min(760px, 78vh)
rotateY = 0deg
opacity = 1
```

#### Stage 3 — terminal settles, 220–520ms

The terminal becomes readable and front-facing.

```txt
scale: 1
blur: 0
composer opacity: 1
messages pane opacity: 1
```

#### Stage 4 — data loading, parallel

If messages are not loaded yet, the terminal remains visible with:

```txt
Loading wall chat…
```

The panel must not disappear while fetching.

#### Stage 5 — interaction

User can:

- read messages,
- scroll messages inside terminal,
- type and send,
- close terminal,
- wheel outside terminal to keep corridor movement alive behind it.

### Closing terminal

Close animation reverses conceptual direction:

- terminal fades/scales down toward source side;
- it does not need exact FLIP back to original tile if the wall has moved;
- corridor remains visible.

---

## 10. Header Behavior

The header belongs to the moving slab.

This is critical.

Wrong:

```txt
Header fixed at top of viewport while wall content moves.
```

Correct:

```txt
Header is a child of the segment.
Header has same parent transform as every tile.
When the segment moves through Z, the header moves with it.
```

DOM shape:

```tsx
<section className="matrix-wall-segment matrix-wall-segment--left">
  <header className="matrix-wall-segment__header">
    <span>RANDOM ACCESS MEMORY</span>
    <span>SEG 01 / 08</span>
  </header>

  <div className="matrix-wall-segment__grid">
    <button className="matrix-chat-tile">...</button>
    <button className="matrix-chat-tile">...</button>
    <button className="matrix-chat-tile">...</button>
  </div>

  <footer className="matrix-wall-segment__footer">
    wheel left side = memory wall travel
  </footer>
</section>
```

No fixed header for segment data.

The top application bar (`Hacker Mode`, `Normal Mode`, `Motion`, `Sound`) may remain viewport-fixed because it is a control layer, not the moving wall header.

---

## 11. Data Grouping Rules

### Left wall grouping

Input: random chats.

Group into segments:

```ts
function groupRandomChats(chats: Chat[]): WallSegment[] {
  return chunk(chats, 6).map((group, index) => ({
    side: 'left',
    kind: 'random-segment',
    title: 'RANDOM ACCESS MEMORY',
    segmentIndex: index,
    totalSegments: Math.ceil(chats.length / 6),
    z: -index * SEGMENT_GAP_Z,
    items: group
  }));
}
```

If there are no chats, still render one empty segment with header and one empty-state tile.

### Right wall grouping

Right wall has a narrative sequence:

1. First segment: Project Index.
2. Subsequent segments: one project per segment, showing that project's chats.

```ts
const rightSegments = [
  buildProjectIndexSegment(projects),
  ...projects.map(buildProjectChatSegment)
];
```

This avoids the current bad behavior where projects and project chats become a long mixed A/B/C list.

### Project color

Every project segment and project chat tile must carry the project color.

Visual uses:

- left/right vertical strip,
- small project dot,
- low-opacity glow,
- metadata label.

---

## 12. DOM Architecture

Recommended component tree:

```txt
Hallway
└─ MatrixCorridor
   ├─ CorridorBackground
   ├─ CorridorWorldRibs
   ├─ MatrixWall side="left"
   │  ├─ MatrixWallSurface
   │  └─ MatrixWallWorld travel={leftTravel}
   │     ├─ MatrixWallSegment segment={randomSegment0}
   │     │  ├─ MatrixWallSegmentHeader
   │     │  ├─ MatrixChatTile x6
   │     │  └─ MatrixWallSegmentFooter
   │     ├─ MatrixWallSegment segment={randomSegment1}
   │     └─ MatrixWallSegment segment={randomSegment2}
   ├─ MatrixWall side="right"
   │  ├─ MatrixWallSurface
   │  └─ MatrixWallWorld travel={rightTravel}
   │     ├─ MatrixWallSegment segment={projectIndex}
   │     ├─ MatrixWallSegment segment={projectRafael}
   │     └─ MatrixWallSegment segment={projectStrubloid}
   ├─ MatrixReadablePreview hoveredOrNearestTile
   ├─ MatrixExpandedTerminal selectedTile
   └─ CorridorControls
```

Current `Hallway.tsx` has enough pieces to evolve, but its current `CorridorCard` concept is too granular. It represents one chat as one moving object. The target requires a new `WallSegment` type.

Suggested types:

```ts
type WallSide = 'left' | 'right';

type WallSegmentKind =
  | 'random-chats'
  | 'project-index'
  | 'project-chats'
  | 'empty';

interface WallTile {
  id: string;
  type: 'random' | 'project' | 'projectChat';
  title: string;
  subtitle: string;
  detail: string;
  meta: string;
  accentColor?: string;
  projectId?: string;
  projectName?: string;
}

interface WallSegment {
  key: string;
  side: WallSide;
  kind: WallSegmentKind;
  title: string;
  subtitle: string;
  segmentIndex: number;
  totalSegments: number;
  z: number;
  accentColor?: string;
  items: WallTile[];
}
```

---

## 13. CSS Architecture

Use these class names for the next implementation pass. Names can be mapped to existing `corridor-*` classes, but this is the intended mental model.

```scss
.matrix-corridor {}
.matrix-corridor-scene {}
.matrix-corridor-background {}
.matrix-corridor-ribs {}

.matrix-wall {}
.matrix-wall--left {}
.matrix-wall--right {}
.matrix-wall--active {}
.matrix-wall--passive {}
.matrix-wall-surface {}
.matrix-wall-world {}

.matrix-wall-segment {}
.matrix-wall-segment--left {}
.matrix-wall-segment--right {}
.matrix-wall-segment--active-depth {}
.matrix-wall-segment--approaching {}
.matrix-wall-segment--behind-camera {}
.matrix-wall-segment__header {}
.matrix-wall-segment__grid {}
.matrix-wall-segment__footer {}

.matrix-chat-tile {}
.matrix-chat-tile--hovered {}
.matrix-chat-tile--selected {}

.matrix-readable-preview {}
.matrix-expanded-terminal {}
.matrix-corridor-controls {}
```

### Segment CSS baseline

```scss
.matrix-wall-segment {
  position: absolute;
  top: 50%;
  width: clamp(420px, 34vw, 620px);
  height: min(74vh, 760px);
  display: grid;
  grid-template-rows: 56px minmax(0, 1fr) 32px;
  border: 1px solid color-mix(in srgb, var(--segment-accent, #9ad933) 36%, transparent);
  border-radius: 18px;
  background:
    linear-gradient(180deg, rgba(12, 24, 12, 0.82), rgba(3, 9, 5, 0.66)),
    repeating-linear-gradient(0deg, rgba(154, 217, 51, 0.045) 0 1px, transparent 1px 24px),
    repeating-linear-gradient(90deg, rgba(154, 217, 51, 0.03) 0 1px, transparent 1px 32px);
  opacity: var(--segment-opacity);
  filter: blur(var(--segment-blur));
  transform-style: preserve-3d;
  backface-visibility: visible;
  will-change: transform, opacity, filter;
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease,
    background 180ms ease;
}

.matrix-wall-segment--left {
  left: clamp(52px, 5.6vw, 96px);
  transform-origin: left center;
  transform:
    translate3d(0, -50%, var(--segment-z))
    perspective(1200px)
    rotateY(62deg)
    skewY(-2deg)
    scale(var(--segment-scale));
}

.matrix-wall-segment--right {
  right: clamp(52px, 5.6vw, 96px);
  transform-origin: right center;
  transform:
    translate3d(0, -50%, var(--segment-z))
    perspective(1200px)
    rotateY(-62deg)
    skewY(2deg)
    scale(var(--segment-scale));
}
```

Hover rule:

```scss
.matrix-wall-segment:hover {
  border-color: color-mix(in srgb, var(--segment-accent, #9ad933) 74%, white 8%);
  box-shadow:
    0 0 52px color-mix(in srgb, var(--segment-accent, #9ad933) 28%, transparent),
    inset 0 0 38px rgba(0, 0, 0, 0.44);
}
```

No hover transform.

---

## 14. Test Requirements

Testing must prove the spatial behavior stays correct over time.

### Unit tests

Pure math tests must cover:

1. segment grouping;
2. segment Z spacing;
3. segment depth style;
4. nearest active segment;
5. nearest/hovered tile preview selection;
6. left/right independent travel;
7. reverse travel;
8. behind-camera non-interactivity.

Existing `tests/unit/corridorTravel.test.ts` is a starting point, but it currently validates card-level travel. It must be expanded or replaced to validate segment/slab-level travel.

Required new test examples:

```ts
it('moves a whole wall segment as one object', () => {
  const segments = buildRandomSegments(makeChats(12));
  expect(segments).toHaveLength(2);
  expect(segments[0].items).toHaveLength(6);
  expect(segments[1].items).toHaveLength(6);
  expect(segments[0].z).toBe(0);
  expect(segments[1].z).toBe(-SEGMENT_GAP_Z);
});

it('keeps header and tiles in the same segment coordinate system', () => {
  const segment = buildRandomSegments(makeChats(6))[0];
  const transform = segmentTransform(segment, 320, 'left');
  expect(transform.headerParentKey).toBe(segment.key);
  expect(transform.tileParentKeys.every(key => key === segment.key)).toBe(true);
});
```

### Browser tests

These must be real browser tests, not only unit tests.

#### Long hover stability test

Duration: minimum 7 seconds total.

```ts
await segment.hover();
const transformAt0 = await getTransform(segment);
await page.waitForTimeout(3500);
const transformAt35 = await getTransform(segment);
await page.waitForTimeout(3500);
const transformAt70 = await getTransform(segment);

expect(transformAt35).toBe(transformAt0);
expect(transformAt70).toBe(transformAt0);
await expect(segment).toBeVisible();
await expect(preview).toBeVisible();
```

#### Wheel movement test

```ts
const left0 = await getTransform(leftWallWorld);
const right0 = await getTransform(rightWallWorld);

await wheelAt({ x: viewport.width * 0.25, y: viewport.height * 0.5, deltaY: 120 });
await page.waitForTimeout(900);

const left1 = await getTransform(leftWallWorld);
const right1 = await getTransform(rightWallWorld);

expect(left1).not.toBe(left0);
expect(right1).toBe(right0);
expect(await page.evaluate(() => window.scrollY)).toBe(0);
```

#### Segment progression test

```ts
for (let i = 0; i < 40; i++) {
  await wheelAt(leftCenter, 120);
  await page.waitForTimeout(40);
}

await expect(activeSegmentHeader).toContainText('SEG 02');
await expect(activeSegment.locator('.matrix-chat-tile')).toHaveCount(6);
```

This test ensures we moved to the next whole wall segment, not just one tile.

#### Click expansion test

```ts
await tile.hover();
await page.waitForTimeout(1000);
await tile.click();
await expect(terminal).toBeVisible();
await expect(terminal).toContainText(tileTitle);
await page.waitForTimeout(1500);
await expect(terminal).toBeVisible();
```

#### Wheel while terminal open

```ts
await tile.click();
await expect(terminal).toBeVisible();
await wheelOutsideTerminal();
await page.waitForTimeout(1000);
await expect(terminal).toBeVisible();
expect(await page.evaluate(() => window.scrollY)).toBe(0);
```

---

## 15. Acceptance Checklist

A build is acceptable only if every item below is true.

### Visual/geometry

- [ ] The user can see a full wall slab, not individual A/B/C chat cards only.
- [ ] Each slab has a header attached to it.
- [ ] Header moves with the slab during wheel travel.
- [ ] Each slab contains multiple chat/project tiles.
- [ ] The slab appears mounted on a left/right corridor wall plane.
- [ ] The left/right wall surfaces remain visible before hover, during hover, and during scroll.
- [ ] The corridor background remains visible and aligned with UI perspective.
- [ ] No list-like vertical browser panel appears in Hacker Mode.

### Motion

- [ ] Wheel left moves only the left wall slabs.
- [ ] Wheel right moves only the right wall slabs.
- [ ] The page does not vertically scroll: `window.scrollY === 0`.
- [ ] Movement is slow enough to perceive walking.
- [ ] One whole segment moves out while the next whole segment moves in.
- [ ] No transform changes on hover.
- [ ] No `transition: transform` competes with RAF travel motion.

### Hover

- [ ] Hover over a wall side for 7 seconds: wall remains visible.
- [ ] Hover over a chat tile for 7 seconds: segment transform remains unchanged.
- [ ] Hover updates readable preview.
- [ ] Hover does not open content automatically.

### Click/open

- [ ] Clicking a chat tile opens the expanded terminal.
- [ ] Expanded terminal has loading state while messages fetch.
- [ ] Expanded terminal remains visible if fetch takes time.
- [ ] Terminal is centered and readable.
- [ ] Corridor remains visible behind terminal.
- [ ] Wheel outside terminal does not close it.
- [ ] Message list scroll inside terminal works independently.

### Tests

- [ ] Unit tests cover wall segment grouping and depth movement.
- [ ] Browser tests hold hover for at least 7 seconds total.
- [ ] Browser tests assert transforms remain stable during hover.
- [ ] Browser tests assert full segment progression after many wheel events.
- [ ] Browser tests assert click expansion remains visible after 1.5+ seconds.
- [ ] `npm run typecheck` passes.
- [ ] `npm run test` passes.
- [ ] `npm run build` passes.
- [ ] Browser console has no visible errors.

---

## 16. Implementation Phases

### Phase 1 — Rename the mental model

Do not keep thinking in terms of `CorridorCard` as the primary moving unit.

Introduce:

- `WallSegment`
- `WallTile`
- `buildLeftWallSegments`
- `buildRightWallSegments`
- `segmentDepthStyle`
- `getNearestSegment`
- `getNearestTile`

### Phase 2 — Build segment grouping

Left:

- chunk random chats into groups of 6.

Right:

- segment 0 = project index.
- segment 1..N = one segment per project, containing that project's chats.

### Phase 3 — Render segment slabs

Replace direct map of chat cards with direct map of wall segments.

Each segment renders its header/grid/footer.

### Phase 4 — Movement

Move segments along Z using `segment.z + travel`.

Keep travel independent per side.

### Phase 5 — Hover/preview

Hovering a tile sets `hoverTileKey`.

Preview selection priority:

```ts
previewTile = hoveredTile ?? nearestTileFromActiveSegment ?? firstTileFromNearestSegment;
```

### Phase 6 — Click expansion

Clicking tile sets `focusItem` and records source side/source rect for animation.

Expanded terminal shows loading immediately.

### Phase 7 — Tests

Add segment-level tests before claiming success.

Run browser tests with long hover duration.

---

## 17. What To Avoid

Avoid every pattern below. These are known failure modes from this session.

- Static `CorridorWallWindow` overlaid on the wall while scroll moves something else.
- One moving object per chat when the requirement is one moving wall per group of chats.
- Whole-scene `rotateY` on hover.
- Active wall transform changes.
- Card `transition: transform` while RAF is also updating transform.
- Header fixed to viewport instead of slab.
- Hiding opposite wall entirely.
- Rendering CSS for `.corridor-readable-preview` without rendering the component.
- 100ms hover tests.
- Clicking a chat and showing nothing while messages fetch.
- Normal route navigation as the primary click behavior.
- Using `window.scrollY` as real document scroll inside the corridor.

---

## 18. Final Target Feeling

The final result should feel like this:

The user enters a green-lit Matrix corridor. On the left wall, a complete memory wall is mounted at an angle, glowing with a header that says `RANDOM ACCESS MEMORY`. Inside that wall are several chat entries arranged like a terminal table. On the right wall, a project index wall mirrors it with project-colored strips.

The user rolls the mouse wheel on the left side. The entire left memory wall — header, border, chat rows, footer, scanlines, glow — moves as one rigid slab through the tunnel. It passes the user's viewpoint and fades behind the camera. From deeper in the corridor, the next full wall slab approaches, grows, sharpens, and lands in the same readable wall position.

The user hovers a chat tile. The tile glows. The wall does not move. The tile remains under the pointer for as long as the mouse stays there. A readable preview appears at center, describing the hovered chat.

The user clicks the tile. The tile pulls out from the wall into the center, becoming a large terminal. If messages take time to load, the terminal says `Loading wall chat…`; it never disappears. The corridor and both walls remain behind it. The user can still feel the spatial relationship: this chat came from that wall.

That is the Matrix corridor wall system.
