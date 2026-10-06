# v0.8 generated sprites

Generated with the built-in imagegen tool on 2026-10-06. Original PNGs are retained as `v080_minecart.png` and `v080_hero_walk.png`. Old art remains available.

Minecart prompt: isolated abandoned wooden minecart loaded with small cyan crystals; dark fantasy gritty pixel art, iron wheels and timber rim, top-down three-quarter view, compact squat silhouette facing right, roughly 96×72 visual pixels; no rails, ground, text, labels, external glow or shadows; true transparent background.

Walking prompt: use `assets/player/hero.png` as the exact character reference; preserve the brown hair, warm brown cloak, red scarf, leather boots, small sword, proportions and palette; generate four equally spaced frames facing slightly right/front in a restrained walking cycle (left foot, passing, right foot, alternate passing), consistent scale, common foot baseline, true transparent background, no labels or cell boundaries. Original idle art is retained.

Packing: `tools/prepare_v080_assets.py` archives the original output, crops transparent cell bounds, uses one common walking-frame scale and baseline, and packs four 96×94 frames plus a 100×80 cart. Only nearest-neighbor resizing and sprite packing are applied. Runtime uses 8 fps while moving and the original sprite while idle.

Image generation session: `01a1027b-6c5e-72b3-9578-385c55ae6273`; cart output `exec-105d5776-c618-4183-80d7-862b1e6c759a.png`, walk output `exec-5407e1aa-c7d2-4a9a-872c-4a65885e0b17.png`. Source sheets are excluded from Pages artifacts.
