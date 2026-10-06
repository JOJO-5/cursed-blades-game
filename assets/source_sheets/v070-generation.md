# v0.7 ground textures

Generated with the built-in imagegen tool on 2026-10-06. Source image retained as `v070_ground_atlas.png` (three equal horizontal panels: village earth, mine slate dust, volcanic basalt).

Prompt: production top-down dark fantasy pixel-art ground texture atlas; three equal square panels with no margins, gaps, text, objects, perspective, transparency, grids, slabs, borders, vignette or large shadows. Independently seamless flat ground, fine granular pixel clusters with limited subdued colors. Village: brown ochre dirt, sparse olive moss and tiny grit. Mine: dark blue-grey compact slate dust, mineral flecks and irregular tiny stones. Hell: charcoal basalt and very sparse subdued ember flecks, no lava rivers. Low contrast so detailed buildings and combat actors remain readable.

`tools/prepare_v070_ground.py` preserves source, crops the three panels, packs at 128×128, reduces contrast to 55% and brightness to 78%, and writes opaque RGB PNGs. Runtime mirrors tile edges before repeating; the road uses the village texture with a warm tint and irregular pixel soil edges. New versioned files are used; old artwork is retained.

The three runtime tiles and source are in the repository. Generated image origin: `01a1027b-6c5e-72b3-9578-385c55ae6273`. No source atlas is included in the Pages runtime artifact.
