# ChatGPT — Background Images for Strubloid Portal

Use the prompts below to generate background images for the portal landing page at `localhost:3000`. The portal is a full-screen immersive entrance with green neon glow rings, floating particles, and glassmorphic auth UI, on a light Apple/HIG-style gradient.

## Style Reference

- **Aesthetic:** Apple Human Interface Guidelines — clean, minimal, airy, premium
- **Colors:** #e8e8ed (top) → #f5f5f7 (bottom) gradient base
- **Accent:** Matrix-green (#00ff41 / #00cc33) neon glow
- **Glass:** Frosted glass panels with 20px blur, subtle shadows
- **Typography:** Inter, monochrome, muted grays (#6e6e73, #aeaeb2)

## Image 1 — Portal Background (main backdrop)

Used as: layered behind the green glow rings and auth UI.

**Prompt:**
> Create a wide 1900×951 pixel background image for a futuristic AI portal landing page. The scene is a clean, minimalist space station interior or data-center hallway viewed from a low angle, with cool gray/silver walls (#e0e0e5) and a slightly darker ceiling (#d4d4dc). Soft ambient blue-gray lighting from hidden sources creates a calm, premium atmosphere. The perspective should feel like standing at the entrance of a long corridor. No text, no logos, no UI elements. Subtle lens flare or light rays from a central focal point. 8K quality, photorealistic but slightly stylized — think Apple keynote backgrounds or high-end architectural visualization. Matte finish, no high contrast.

## Image 2 — Portal Core (the "aperture" behind the glow rings)

Used as: visual depth layer inside the green ring aperture, visible behind the center dot.

**Prompt:**
> Create a 500×500 pixel circular image of a glowing green sci-fi portal core. Deep black center with concentric rings of emerald green (#00ff41) light fading outward. Subtle Cherenkov blue-green undertones. The center should feel like deep space or a quantum aperture — bright white-green core that fades to dark teal edges. No text, no logos. High contrast, glowing effect, perfect for a circular mask/crop.

## Image 3 — Particle Sprites (optional enhancement)

Used as: replacement for CSS-generated particles if richer detail is needed.

**Prompt:**
> Generate a 256×256 pixel sprite sheet of small glowing particles for a sci-fi interface. 4 rows of 4 circles each (16 total), varying sizes from 2px to 8px diameter. Colors: bright green (#00ff41), soft green (#5cb85c), white (#ffffff at 60% opacity), and teal (#0dc5c5). Each particle should have a soft glow halo. Transparent PNG background.

## Image 4 — Ambient Light Rays (optional overlay)

Used as: subtle animated light rays across the background.

**Prompt:**
> Create a 1900×951 pixel subtle light rays/volumetric lighting image. Very faint diagonal rays coming from the center outward at 15° angle. Colors: very soft white-green (#e8ffee at 5% opacity) on transparent background. The rays should be barely visible — more of a texture/atmosphere than a visible element. 8K quality, PNG with alpha.

## Installation

Save generated images to:
```
public/images/portal/
```

Files:
- `public/images/portal/bg-main.jpg` (or .png)
- `public/images/portal/core.png`
- `public/images/portal/particles.png`
- `public/images/portal/rays.png`

Then tell the developer to import them in `ScrollToEnter.tsx` and set as `backgroundImage` on the portal layers.
