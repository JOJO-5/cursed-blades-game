# v0.11 生成素材与接入记录

2026-10-07，使用内置 imagegen。保留生成原图；打包脚本只裁切、最近邻缩放和更新清单，保留生成的 alpha，不以颜色抠背景。生成物体越过等分单元边界，使用逐个检查的源图矩形隔离；alpha > 12 仅用于寻找裁切边界，未改变运行图的 alpha 值。

## 道具

- 原始图：`v110_props.png`，生成标识 `d8af1bbe-bd16-49a6-a5c7-d6b51362771d`。
- 最终图：`v110_props_clean.png`，编辑标识 `e5d03ecd-7d08-4599-856d-6c15f114644a`。
- 规格：透明 3×3 图集，依次为破屋、摊位、断墙、倒木、立体祭坛、铁火盆、墓碑、箱桶、枯橡树。统一三分之四俯视、左上光照、暗色轮廓和中世纪像素风格，完整物体，不带地板或文字。
- 清理提示词约束：保留九个物体的布局、轮廓、颜色、视角和位置；移除物体外部所有棕黑背景与环境光晕；物体外 alpha 为 0，包括摊位杆之间、树枝间和火盆腿间。保留物体内部与暗轮廓，保留火焰而移除外围光晕，不加地面。
- 运行文件：`assets/props/*_v110.png`。锚点为下边缘中点 `(0.5,1)`；具体显示尺寸见 `world.js`。接地阴影单独烘焙，角色靠近高建筑后方时降低建筑不透明度。

## 村庄地面

- 原图：`v110_ground_village.png`，编辑标识 `78c94b59-093b-4079-9498-aa7fbad130d5`。参考旧 `ground_village_v100.png`。
- 提示词：Edit target: this game ground texture. Preserve its quiet dark olive dirt, low-contrast sparse pixel grass and stones, exact strictly top-down style and palette. Produce a single square seamless repeating opaque texture. Remove the thin dark border along bottom and right edges; NO straight lines, borders, grid, vignette, shadows or objects. All four edges must have the same low contrast natural soil density as center, no dark seam when tiled. Crisp small pixel clusters and broad quiet combat space. No background transparency. Output only the texture.
- 输出最近邻缩放为 256×256 RGB，用镜像重复接边，原图保留。不得仅凭生成成功认定实景无接缝。
