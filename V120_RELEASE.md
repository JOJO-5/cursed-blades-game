# v0.12.0-preview.3 线上发布验证

2026-10-07，已发布到 https://jojo-5.github.io/cursed-blades-game/ 。

- Pages 构建提交：`95fdfc85918ece604b3ae5a2dd731a148efcc5d7`；公开 build-info.json 版本为 `0.12.0-preview.3`。14 个脚本/样式版本参数均匹配该提交，官网武器绘制模块与提交内容逐字一致。
- 发布流水线：https://github.com/JOJO-5/cursed-blades-game/actions/runs/37594365506 。validate 与 deploy 均成功；完整端到端 **488 项**、三角色自然开局 **3 项**通过。
- 官网武器渲染 **96 项**、实际战斗帧 **38 项**通过，零 JavaScript 错误。全部武器实际造成伤害或产生召唤物，弹丸坐标/速度有限。
- 上线内容：三种锤及六种近战轮廓、专用弹丸形状、低遮挡光环、重击震荡/震屏限频、三种弹幕 NaN 修复；另修复随机地狱地标摆放失败，保留正常旧布局。
- 武器伤害/冷却/射程等配置保持原值。隔离目标战斗检查属于调试夹具，三角色自然开局为独立真实时钟验证；本批没有重跑全部构筑自然长局，也未做实体手机/真人听感验收。

证据：`output/playwright/v120/weapon-public-metadata.json`、`weapon-public-visual.json`、`weapon-public-combat.json`、`weapon-ci-success-log.txt` 与六种武器实景截图。修复与边界见 [V120_WEAPONS.md](V120_WEAPONS.md)。本记录在部署和官网核验后以仅文档提交补充，不改变已验证的运行代码或发布构建。

---

## 历史：v0.12.0-preview.2 线上发布验证

2026-10-07，已发布到 https://jojo-5.github.io/cursed-blades-game/ 。

- Pages 构建提交：`591b9faf36763ccb69406b032f991e768776675e`；公开 build-info.json 版本为 `0.12.0-preview.2`，13 个脚本/样式资源查询参数均包含该提交前缀。
- 发布流水线：https://github.com/JOJO-5/cursed-blades-game/actions/runs/37575799196 。validate 与 deploy 均成功；完整端到端 354 项、三角色自然开局 3 项通过。
- 官网 Chromium 实际选人、开始游戏、四方向键盘移动：22 项通过；364 张素材全部加载成功，未发现 JavaScript 运行错误。
- 官网最终 Boss、各方向步态、命中透明轮廓与缓存检查：61 项通过，未发现 JavaScript 运行错误。
- 本次上线包含四地图场景精修、五 Boss 独立素材、左右/向下交替脚与反向手臂摆动、按透明轮廓闪光、受伤和宝箱染色修复。

机器报告和官网截图位于 `output/playwright/v120/release-public-metadata.json`、`public-release-results.json`、`public-combat-results.json`、`public-*-playing.png`。这些实际网页检查不等同实体手机或真人手感验收；自然全关卡/性能历史证据见 V120_ACCEPTANCE.md，批次边界见 V120_COMBAT_ACCEPTANCE.md。

本记录在部署和官网核验后以仅文档提交补充，不改变已验证的运行代码或发布构建。
