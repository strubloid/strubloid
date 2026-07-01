# Strubloid Hall Fix — Visual Instruction Package

## Goal

Keep the good tunnel/hall feeling from the rolled-back commit, but fix the movement model.

The current commit has the right atmosphere:
- dark sci-fi tunnel
- green Matrix lighting
- central depth
- HUD header/sidebar
- wall feeling starting to appear

But the behavior is wrong:
- it moves both sides together
- it moves one message/card per movement
- it shows floating single cards
- it does not create a true wall made of grouped chats

## Core rule

THE WALL IS THE MOVING OBJECT.

Do not animate cards individually.
Do not move one message/card per wheel step.
Do not move both sides together.
Do not change wall angle on hover.

A wall is a grouped container of chats.

- Left side: Random Chats wall pages.
- Right side: Project Chat wall pages.
- Max 6 chats per wall.
- The wall moves as one unit.
- Cards inside the wall stay normal children.

## Interaction model

Split the screen into two movement zones:

### Left half

Mouse wheel / touch / gesture on the left half:
- moves only the left wall
- updates only left progress
- keeps right wall still
- keeps portal still
- keeps header/sidebar/footer still

### Right half

Mouse wheel / touch / gesture on the right half:
- moves only the right wall
- updates only right progress
- keeps left wall still
- keeps portal still
- keeps header/sidebar/footer still

## No hover angle changes

Remove the idea that hover changes wall angle.

Allowed:
- dim inactive side slightly
- brighten active side slightly
- show active progress

Not allowed:
- changing wall rotateY on hover
- shifting the whole tunnel on hover
- moving both walls on hover

## Wall grouping

### Random chats

Random chats can be grouped into wall pages.

Example:
- Random Wall 1: chats 1 to 6
- Random Wall 2: chats 7 to 12

### Project chats

Project chats must be grouped by project.

Do not mix chats from different projects.

Example:
- Strubloid wall: only Strubloid project chats
- Crypto Dashboard wall: only Crypto Dashboard chats
- Game Design wall: only Game Design chats

Use color coding per project:
- Strubloid: yellow-green
- Crypto Dashboard: cyan/blue
- Game Design: magenta/purple
- Research: amber/orange

## Implementation concept

Use one moving container per side.

```tsx
<LeftWall movement={leftMovement}>
  <WallPage chats={randomChats.slice(0, 6)} />
</LeftWall>

<RightWall movement={rightMovement}>
  <ProjectWallPage
    project={activeProject}
    chats={activeProjectChats.slice(0, 6)}
    color={activeProject.color}
  />
</RightWall>
```

The transform must be applied to the wall container or one inner `.wallMover`.

```tsx
<div
  className={styles.wallMover}
  data-side={side}
  style={{ "--wall-offset": `${movement.offset}px` } as React.CSSProperties}
>
  {children}
</div>
```

Do not apply transform to each card.

## Suggested structure

```txt
src/app/hall/
  page.tsx
  components/
    Hall.tsx
    HallHeader.tsx
    HallSidebar.tsx
    HallScene.tsx
    HallFloorControls.tsx
    wall/
      HallWall.tsx
      WallViewport.tsx
      WallProgressIndicator.tsx
      left/
        LeftWall.tsx
        LeftWallContent.tsx
      right/
        RightWall.tsx
        RightWallContent.tsx
    chat/
      ChatCard.tsx
      ChatWallPage.tsx
      ProjectWallPage.tsx
    portal/
      PortalBackground.tsx
      PortalCore.tsx
  hooks/
    useWallMovement.ts
    useHallMovement.ts
  types/
    hall.types.ts
  data/
    hall.mock.ts
  styles/
    hall.module.css
```

## CSS direction

Keep the tunnel from the current commit. Do not rebuild into a dashboard.

```css
.hallScene {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.wallViewport {
  position: relative;
  height: 100%;
  overflow: hidden;
}

.wallMover {
  transition: transform 320ms cubic-bezier(.22,1,.36,1);
  will-change: transform;
}

.wallMover[data-side="left"] {
  transform: translate3d(var(--wall-offset), 0, 0);
}

.wallMover[data-side="right"] {
  transform: translate3d(var(--wall-offset), 0, 0);
}
```

If vertical paging feels better, use it consistently:

```css
.wallMover {
  transform: translate3d(0, var(--wall-offset), 0);
}
```

## Hook requirements

`useWallMovement(side)`:
- progress 0 to 100
- offset calculated from progress
- moveForward
- moveBackward
- setProgress
- reset

`useHallMovement()`:
- left = useWallMovement("left")
- right = useWallMovement("right")
- activeSide: "left" | "right" | null
- moving left never changes right
- moving right never changes left
- reset returns both to 0

## Success criteria

The result is successful only if:

- The tunnel feeling remains.
- It does not become a flat dashboard.
- It does not show only one chat per movement.
- It does not move both sides together.
- Left half movement moves only the left wall.
- Right half movement moves only the right wall.
- Walls are grouped containers of chats.
- Max 6 chats per wall.
- Project walls contain only chats from the same project.
- Project walls are color coded.
- Portal stays stable.
- Header/sidebar/footer stay stable.
- No hover angle changes.
- No TypeScript errors.
- No lint errors.

## Image guide

Use the images in `/images`:

- `00_current_rollback_reference.png`: current tunnel feeling to keep.
- `01_idle_tunnel_layout.jpg`: idle layout with left and right wall groups.
- `02_wall_group_model.jpg`: wall group concept.
- `03_left_half_moves_left_wall_only.jpg`: left half movement.
- `04_right_half_moves_right_wall_only.jpg`: right half movement.
- `05_project_color_coded_walls.jpg`: project wall grouping/color coding.
- `06_keep_tunnel_replace_single_message_movement.jpg`: what to replace.
