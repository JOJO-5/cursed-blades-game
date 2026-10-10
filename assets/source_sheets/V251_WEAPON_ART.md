# v0.25.0-preview.2 武器素材

30 张独立透明 64×64 装备图片。12 张生成、15 张由实际战斗 Canvas 造型导出、3 张从旧图中提取完整物件。原图保留，运行图片在 `assets/weapons/*_v251.png`。

## 生成记录

工具：image_gen；透明背景。以下 shared prompt 中 `{SPEC}` 分别替换表格内容；生成结果保存在 `v251_<名称>_original.png`。

> Create one SINGLE standalone weapon sprite: {SPEC}. For Cursed Blades dark cute pixel-art top-down survival RPG. Detailed handcrafted pixel art, crisp stepped pixel edges, 48x48 pixel sprite aesthetic, dark brown outlines, warm bronze highlights, readable at 24 pixels. Entire item fits centered with at least 15 percent generous transparent padding on ALL sides. One equipment icon ONLY, no sheet, no neighboring sprite fragments, no UI, no labels, no text, no scenery, no background rectangle. Transparent background.

| 名称 | SPEC |
|---|---|
| spellbook | a burning spellbook: a clearly recognizable open leather BOOK with two complete cream parchment pages and a small orange flame rising above its spine, bronze corners |
| wand_arcane | a blue arcane WAND: slender dark wooden shaft with bronze bindings and a single luminous blue ORB held in a bronze crescent at its tip |
| ballista | a compact heavy BALLISTA crossbow: complete wide curved bow arms, taut string, stout wooden stock, steel rail with one loaded bolt, bronze mechanical crank |
| fire_cannon | a FIRE CANNON: complete short charcoal iron barrel pointing upper right, orange glowing muzzle, bronze reinforcement bands, small wooden grip and dark mounting stock, no wheels |
| poison_sprayer | a POISON SPRAYER: complete dark bronze handheld nozzle connected to a bulbous green glass toxin tank with small wooden grip, a tiny green vapor plume at the nozzle |
| spear | a triple-pronged cyan energy TRIDENT: complete long dark shaft and three distinct steel spear prongs edged in cyan energy, diagonal lower-left to upper-right |
| blade_dual | two complete opposing curved cyan energy BLADES forming a symmetrical double-ended throwing blade, bronze center grip, luminous cyan cutting edges, no flames |
| torch_classic | a classic FIRE TORCH: complete wooden handle wrapped in cloth, a bright orange and gold flame at the upper end, diagonal lower-left to upper-right, no skull |
| flamethrower | a SKULL FLAMETHROWER: a complete handheld dark bronze tube gun with a small ivory skull at the nozzle, orange pilot flame, metal fuel tank behind the barrel, wooden grip, readable complete silhouette |
| poison_cannon | a POISON CANNON: a complete stout dark iron cannon barrel with bronze bands, a green glass toxin chamber on its side, green glowing muzzle, wooden grip, no wheels |
| buckler | a ROUND WOODEN BUCKLER shield: one complete circular brown oak shield with iron rim, central bronze boss, small rivets and visible wooden planks, front-facing, perfectly intact circular silhouette |

crystal 使用完整提示词：

> Create one SINGLE standalone complete cyan crystal magic STAFF weapon sprite for Cursed Blades dark cute pixel-art top-down survival RPG. Long dark wooden shaft, bronze bindings, clearly visible large faceted icy cyan crystal at its top, held diagonally lower-left to upper-right. Detailed handcrafted pixel art, crisp stepped pixel edges, 48x48 pixel game sprite aesthetic, restrained dark brown outlines, warm bronze highlights, luminous cyan crystal, readable at 24 pixels. Entire weapon fits centered with generous transparent padding on every side. One object ONLY, no sheet, no neighboring sprite fragments, no UI, no labels, no text, no scenery, no shadow rectangle. This is a usable equipment icon and small in-game weapon emitter.

## 打包与导出

`python tools/prepare_v251_weapon_art.py` 使用已提交的原图，将所有 alpha≥24 像素的联合边界完整裁出，以最近邻缩小至 56×56 内，居中放入 64×64 透明画布；同步 manifest 与装备、解锁、升级、进化图标映射。依赖 Pillow。

原生造型在 `tools/export-native-weapon-art.js`，通过 Playwright CLI 的 run-code 导出为 `output/weapon-native-art.txt`（Windows PowerShell 重定向 UTF-16）。本地页面需在 8763 端口运行；导出后再次运行打包脚本。若无导出文件，则直接使用已提交的 `v251_*_native.png`。

旧图提取框使用 Pillow 坐标 `(left,top,right,bottom)`：torch_skull_fire `(0,0,47,42)`；crossbow_compact `(0,8,62,45)`；ring_fire 使用完整 ring_fire_awakened 图。边框外的邻近物件不属于该装备。

装备图片只用于 HUD、奖励、构筑和图鉴；战斗弹丸保持独立效果绘制。链枷与火焰钉锤同时修正了实际 Canvas 造型的尖刺 miter 拉长问题，碰撞头部仍位于原接触中心。

检查：`tests/weapon-assets-browser.js`（38 件的完整像素、22/42/64px 范围、刷新读档）；`tests/weapon-visual-browser.js`（四方向两等级、头柄、尖刺边界）；`tests/weapon-combat-browser.js`（38 件真实帧伤害，包括召唤物）。
