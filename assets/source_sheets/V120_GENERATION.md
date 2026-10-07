# v0.12 Generated environment assets

Built-in imagegen, 2026-10-07. Original generated outputs are preserved locally and copied to this folder. No external art was downloaded.

## Four landmarks

- Generation: exec-f268ca2b-65cc-4259-b031-a9e6bbd4ec8e, source `v120_landmarks.png`.
- Cleanup edit: exec-7f15e9f9-6898-456e-8e36-5bb8b4bc9316, source `v120_landmarks_clean.png`.
- Transparent alpha requested in both calls. A grey-background composite was visually reviewed separately from RGB-only previews; alpha-zero RGB can contain grey glow which is invisible when composited.
- Packaging: `tools/prepare_v120_assets.py`, four explicit quadrants, crop bounds derived from alpha >12, original alpha values preserved unchanged, aspect ratio retained, nearest-neighbor thumbnail. No local background removal or alpha painting.
- Runtime sizes capped at mine entrance 184x154, forge 142x120, wind brazier 124x102, tide monument 94x120. Bottom-center anchors (0.5,1), independent physical foot rectangles. Door-like landmarks use two solid side piers with an open center.

Generation prompt:

Create a production pixel-art transparent sprite sheet for a dark fantasy top-down survivor game, four isolated environment landmarks in a strict 2 by 2 grid, equal spacious quadrants, each item fully contained in its quadrant with at least 60 pixels margin. TOP LEFT: abandoned underground mine entrance, timber supports framing an open dark doorway, grey rock shoulder, small cyan crystal ore at the side, NO rails protruding. TOP RIGHT: abandoned infernal forge, squat dark stone furnace with a warm ember opening, iron anvil at the side, worn obsidian stones, no flame halo. BOTTOM LEFT: frost graveyard wind shelter brazier, low broken stone crescent windbreak behind a squat iron brazier with small amber fire, snow on stones. BOTTOM RIGHT: reclaimed drowned-ruin tide monument, upright carved green-grey stone stele with muted turquoise rune, broken moss stone platform at base, a few reeds, no water pool. Cohesive hand-crafted crisp nearest-neighbor pixel texture, small readable shapes, slightly top-down three-quarter perspective matching old fantasy game props, fixed top-left illumination, dark outline accents, muted olive/grey/red/cyan palettes. Objects upright, their feet bottom-center of each quadrant. NO ground rectangles, NO large shadows, NO haze, NO glow outside silhouettes, NO text, NO labels, NO characters, NO checkerboard. Background MUST be truly transparent alpha. Separate all four objects clearly, avoid any cross-quadrant pixels.

Cleanup prompt:

Edit this exact 2x2 sprite sheet for production game assets. Keep the four object designs and positions, style and top-left illumination. Remove ALL surrounding light haze, bloom, atmospheric glow, cast floor shadows, black or grey background pixels, and any backdrop. Every pixel outside each hard object silhouette must be perfectly transparent alpha zero. Remove standalone ground slabs outside the base of each item. Preserve the physical snow shelter stones, snow and base stones of each item, but no large blurred light halo. Clean crisp pixel-art silhouettes. Four separate cutout game props on a TRUE TRANSPARENT background, no environmental scene. Do not add new items or text.
## Frost refinement and legacy crop packaging

- Snow tile edit: exec-dca8ca4d-87f8-4ef0-9fef-5fe1d64d456c, reference `assets/tiles/ground_frost_v100.png`, output `v120_ground_frost.png`, opaque. Nearest-neighbor RGB resize to 256x256.
- Frost grave edit: exec-e37332b7-d257-4c28-a446-82d37e90936e, reference `assets/props/grave_v110.png`, output `v120_frost_grave.png`, transparent. Crop and nearest thumbnail to 42x56, alpha preserved.
- Existing `frost_rock_v100` and `reeds_urn_v100` contained oversized transparent padding. Added tight sibling crops `frost_rock_v120` and `reeds_urn_v120`, original alpha unchanged, source files retained unchanged. Physical foot dimensions are independent of the image and remain explicit.
- Eight new runtime images, 329 total. Scene boundary sprites and deterministic ground details are baked once; old layouts keep the original tile, props and ground decorations.

Snow edit prompt:

Edit this production game pixel-art snow ground tile. Retain blue-grey low-contrast snowy soil, sparse small frost grass, top-down view and consistent crisp pixel grain. Remove the lighter outer border and any rectangular edge. Make the FULL surface uniformly textured and truly seamless repeating on all four sides, without a frame, line, grid, vignette, or edge highlight. Reduce grass density slightly and lower contrast to let characters stand out. No props, no path, no cast shadows, no text. Opaque full-bleed square texture, suitable for nearest-neighbor downsampling to 256x256.

Grave edit prompt:

Edit this exact upright pixel-art gravestone into a snowy frost graveyard variant. Preserve its silhouette, upright three-quarter top-down perspective and bottom-center feet anchor. Change warm golden/yellow stone to cold blue-grey weathered stone with subtle dark carved details; add sparse white snow caps to top and foot edges. Top-left illumination, crisp pixel art, dark outline, readable small-scale silhouette. Isolated object on true transparent alpha background. No backdrop, no cast shadow, no haze, no glow, no ground rectangle, no text. Keep the entire object within generous margins, all pixels outside the object alpha zero.
