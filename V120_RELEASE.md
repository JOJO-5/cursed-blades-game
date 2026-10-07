# v0.12.0-preview.2 线上发布验证

2026-10-07，已发布到 https://jojo-5.github.io/cursed-blades-game/ 。

- Pages 构建提交：`591b9faf36763ccb69406b032f991e768776675e`；公开 build-info.json 版本为 `0.12.0-preview.2`，13 个脚本/样式资源查询参数均包含该提交前缀。
- 发布流水线：https://github.com/JOJO-5/cursed-blades-game/actions/runs/37575799196 。validate 与 deploy 均成功；完整端到端 354 项、三角色自然开局 3 项通过。
- 官网 Chromium 实际选人、开始游戏、四方向键盘移动：22 项通过；364 张素材全部加载成功，未发现 JavaScript 运行错误。
- 官网最终 Boss、各方向步态、命中透明轮廓与缓存检查：61 项通过，未发现 JavaScript 运行错误。
- 本次上线包含四地图场景精修、五 Boss 独立素材、左右/向下交替脚与反向手臂摆动、按透明轮廓闪光、受伤和宝箱染色修复。

机器报告和官网截图位于 `output/playwright/v120/release-public-metadata.json`、`public-release-results.json`、`public-combat-results.json`、`public-*-playing.png`。这些实际网页检查不等同实体手机或真人手感验收；自然全关卡/性能历史证据见 V120_ACCEPTANCE.md，批次边界见 V120_COMBAT_ACCEPTANCE.md。

本记录在部署和官网核验后以仅文档提交补充，不改变已验证的运行代码或发布构建。
