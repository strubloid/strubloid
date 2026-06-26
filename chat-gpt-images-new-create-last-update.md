# ChatGPT image prompts — latest portal corridor update

Use these to regenerate the hallway assets if you want the post-portal scene to match the reference more tightly.

## 1. Main corridor background

Save as:

`public/images/portal/corridor-hall.png`

Prompt:

```text
Create a 16:9 ultra-wide dark futuristic hacker corridor background for a web app landing experience.

Camera/view:
- first-person view standing inside a long narrow hallway
- very strong central vanishing point
- left and right walls angled sharply inward toward the center
- ceiling and floor panels also converge toward the same vanishing point
- the viewer must feel like they are inside a corridor, not looking at flat UI panels

Environment:
- black graphite / dark gunmetal metallic tunnel
- glossy reflective floor
- repeating rectangular ribs/frames along the hallway depth
- wall panels, cable traces, circuit-board linework, technical grid marks
- subtle fog/haze and depth falloff
- small glowing circular green portal or emblem at the far end center

Lighting/style:
- dark cyberpunk hacker aesthetic
- neon lime green accent lights only
- high contrast black and green palette
- cinematic, immersive, moody
- similar feeling to a sci-fi server-room corridor / matrix archive hallway

Important negatives:
- no people
- no readable text
- no UI chrome
- no browser header
- no white panels
- no book/spread layout
- no flat dashboard
- no large centered cards
- leave enough dark wall space on left and right for live app cards to be overlaid later
```

## 2. Transparent side wall ribs overlay

Save as:

`public/images/portal/corridor-ribs.png`

Prompt:

```text
Transparent PNG overlay, 16:9, dark sci-fi corridor perspective ribs and neon green wall outlines only.

Content:
- central vanishing point
- repeating rectangular frame outlines receding into depth
- left and right side-wall circuit/grid linework
- floor and ceiling perspective guide lines
- neon lime green thin strokes
- transparent background

Important:
- no filled panels
- no text
- no logo
- no characters
- should overlay on top of a dark corridor background
```

## 3. Far portal/core emblem

Save as:

`public/images/portal/corridor-core.png`

Prompt:

```text
Transparent PNG, glowing circular hacker portal emblem, centered logo-like orb.

Style:
- black center with neon lime green ring
- subtle radial glow
- cyberpunk / matrix terminal mood
- no text except an optional tiny abstract S-like glyph if it is not readable as a word
- transparent outside glow
```

## Implementation note

The app currently uses CSS fallback corridor geometry. If `corridor-hall.png` is added later, update `.corridor-bg` in `src/styles/_hallway.scss` to place it before the existing CSS gradients.
