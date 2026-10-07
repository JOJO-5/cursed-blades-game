# v0.12 Combat art generation

Built-in imagegen, 2026-10-07. Transparent background requested for every sprite. Originals remain in the generation store; final source PNGs are included here.

## Bosses

- `v120_cursed_knight_draft.png`: 7ae251e9-a9c0-442b-bd1d-74a21af7fa93. Black plate armour, crimson cloak, horned helm, massive sword, front three-quarter pixel art.
- `v120_cursed_knight.png`: dca49df2-c321-47aa-967e-ed3c0cb688a3. Edit draft: remove helmet/head above scarf, preserve body and sword, small amber flame at empty neck; matches existing headless-knight story.
- `v120_brood_matriarch.png`: 44c8297b-e497-418b-bce0-2af4ada53ce8. Eight-legged mineral spider queen, purple crystal abdomen, stone plates, violet eyes.
- `v120_infernal_dragon.png`: b52acc78-2b65-4f08-971e-86223ff92a51. Red horned dragon, wings, curved tail, orange throat, clawed feet.
- `v120_frost_warden.png`: 5cbc3a83-b922-41b6-b9c8-3ec513443467. Ice golem, asymmetrical glacier shoulders, crown, thick fists, cyan core.
- `v120_tide_keeper.png`: c1bf46d8-265f-4e02-a7aa-d91667060e4a. Drowned shell guardian, curled tentacles, coral, barnacles, green eye.

Shared prompt constraints: single full-body sprite, slightly elevated three-quarter view, dark fantasy pixel art, strong silhouette, transparent background, no scenery/ground/shadow/text/frame.

## Walks

Intermediate `v120_walk_warden.png`: 90a03be2-40d3-44fc-842c-031a18b62f38.
Intermediate `v120_walk_ranger.png`: c39d807a-68f3-4401-b7d1-c985e88d8482.
Intermediate `v120_walk_arcanist.png`: 77a8bac9-3de1-4b96-8bd9-b895bbc38f21.

Reference: corresponding v100 hero atlas. Edit constraints: preserve identity, outfit, palette and pixel style. Four columns, two rows (south/east); contact, passing, opposite contact, opposite passing; upright supporting legs, reciprocal arms, identical body scale and foot line, transparent gutters. Second edit explicitly requested opposite viewer-side forward boots, passing boots beneath hips, bright near and dark far leg.

Generated front poses still repeated their dominant leg. Runtime uses the first contact/pass pair and mirrors it for the second half of the stride. This explicitly alternates the feet. Existing north frames are retained. South/east stride advances per 18 units actually travelled (72-unit cycle); blocked movement remains idle. Idle uses the new passing pose at the same scale. East uses the final locally corrected four-pose atlas described below; left mirrors east.

Packaging: `tools/prepare_v120_combat_assets.py`. Alpha threshold only derives crop bounds; original alpha is preserved. Bosses nearest-thumbnail to 128x128; heroes nearest-resize to visible 88 high on a fixed 96x96 canvas, top4 and foot92. No alpha removal, recoloring, or background replacement in packaging. Runtime alpha tint is a separate cached canvas with source-in; the world canvas receives only source-over masked sprites.

## Final side-contact correction

- `v120_east_opposite_warden.png`: 99ee1841-e6f4-4d8b-80ff-06e984b88da2.
- `v120_east_opposite_ranger.png`: 7d4f5422-8360-4ba0-9397-5a7dbaaaeb27.
- `v120_east_opposite_arcanist.png`: 41f8f92a-fa42-42b9-9f2f-30a23222735c.

Single-pose references explicitly put the bright foreground leg backwards LEFT, dark far leg forwards RIGHT, near arm forwards. Direct use was rejected because these redraws changed body proportions. These files are references only.

Runtime hero packaging uses final atlases:

- `v120_walk_final_warden.png`: ab0113ac-8eac-4e77-87a3-31c6ed5fa794.
- `v120_walk_final_ranger.png`: 974a5722-9248-44c7-a208-15aab833de94.
- `v120_walk_final_arcanist.png`: d9fda8d6-9a49-4a4f-9b62-921e1d667509.

Edit target: intermediate atlas. Supporting reference: opposite single pose. Preserve grid, heads, torsos, clothing, heights and baseline exactly. Bottom column1 retains bright foreground leg forwards and swings near arm backwards. Bottom column3 retains existing leg geometry but makes LEFT/BACK leg bright and RIGHT/FRONT leg dark, near arm forwards. Top row and passing columns unchanged. Never lengthen legs or shrink torso/head.

Pixel regression verifies foreground-leg luminance changes sides between side contacts and head silhouette width differs by at most two source pixels. Full draw gallery separately reviews proportions and foot alignment.
