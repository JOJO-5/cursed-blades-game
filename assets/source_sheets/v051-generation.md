# v0.5.1 生成素材来源

2026-10-06 使用 Codex 内置 `imagegen` 生成，透明背景。新增 20 个升级图标、腐化猎犬和瘟疫弓手，共 22 个运行时素材；旧素材保留。原始生成图片保存在本目录。

## 升级图标

源图：`v051_upgrade_icons.png`，1254 × 1254，4 列 × 5 行。

提示词要点：

> Create a transparent pixel-art sprite sheet for a dark cute top-down survival game. Exactly 20 separate upgrade icons in a 4-column by 5-row grid, generous transparent gutters, no text, no labels, no UI panels. Warm gold outlines, dark brown shadows, readable silhouettes, crisp pixel edges, consistent lighting. Each icon must remain recognizable at 32 pixels. Row 1: red sword for damage, lightning bolt for attack speed, three spinning blades for rotation speed, target reticle for range. Row 2: boots for movement speed, red heart for max health, blue arrow for projectile speed, hammer for knockback. Row 3: magnet for pickup range, experience gem, crossed swords for weapon count, spear for piercing. Row 4: critical-hit star, heart with healing plus, explosive critical-damage burst, hourglass for cooldown. Row 5: winged boots for dash cooldown, blue shield for armor, four-leaf clover for luck, blood fangs for life steal. Transparent background, complete icons, no cropped pieces.

行优先顺序与 `tools/prepare_v051_assets.py` 中的 `ICON_IDS` 一致。

## 腐化猎犬

源图：`corrupted_hound_v051.png`。

提示词要点：

> A single corrupted hound enemy sprite for a dark cute pixel-art top-down survival game. Clearly a canine, lean four-legged body, pointed ears, elongated muzzle, visible fangs, tail, dark charcoal fur with purple corruption patches and glowing red eyes. Three-quarter top-down view facing down-right, full body centered, bold readable silhouette, crisp pixel-art edges, dark brown outlines, restrained warm highlights, consistent with small 2D RPG sprites. No bear anatomy, no equipment, no scenery, no text. Transparent background with generous margins.

运行时限制：72 × 64，映射到 `CONFIG.ENEMIES.wild_dog`。

## 瘟疫弓手

源图：`plague_archer_v051.png`。

提示词要点：

> A single plague archer enemy sprite for a dark cute pixel-art top-down survival game. Hooded undead humanoid in weathered dark green clothing, sickly skin, clearly holding a curved wooden bow with visible bowstring and an arrow, quiver on the back. Three-quarter top-down view facing down-right, full body centered, readable bow silhouette, crisp pixel-art edges, dark brown outlines and restrained warm highlights. No spear, no scenery, no text. Transparent background with generous margins. Match small 2D RPG enemy sprites.

运行时限制：64 × 88，映射到 `CONFIG.ENEMIES.plague_archer`。

## 制备与检查

```powershell
python tools/prepare_v051_assets.py
```

需要 Pillow。脚本只做图集裁切、透明边界裁切和 nearest-neighbour 缩放，并更新两个资源清单及配置映射；不会删除旧素材。每张运行时图片要求至少 80 个有效 alpha 像素。浏览器端到端测试还会重新检查实际加载的图片像素，防止出现文件存在但图标几乎为空的情况。重新生成源图后需要人工确认图集分隔位置。
