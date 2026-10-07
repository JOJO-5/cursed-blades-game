# v0.14–v0.17 开发与验收记录

## v0.14 首领专属战斗

- 五个首领各有两种专属招式；第二阶段叠加组合并缩短攻击间隔。
- 1.1 秒固定目标预警、攻击后恢复；蛛网减速、孵化巢、扫射吐息、熔岩落点、临时冰墙、碎冰、潮汐缺口与绿色安全岛。
- 显示与伤害使用同一套几何判定；冰墙预警时可穿过、激活后碰撞、首领死亡后移除。
- 单元检查通过；实景首领专项 31 项通过，零运行错误。
- v0.14 构建 `487572df8531c70829306637b7afe99c55dfaa26`；[CI 37622248088](https://github.com/JOJO-5/cursed-blades-game/actions/runs/37622248088) 验证与部署成功。线上首领专项 31 项通过，16 个缓存参数与首领源码一致。

## v0.15 随机事件

- 每图按种子生成两项可选事件，沿实际可行走路径布置，避开地标目标和危险区。
- 击杀获得局内旅途币；游商 8 币强化武器，祭坛扣 15% 生命换 12% 伤害；救援有 45 秒期限和 8 秒驻守，悬赏生成额外精英。
- 进行中的敌人、计时和领奖状态保存；奖励完成与选择宝箱后保存，防止重复领取。
- 单元检查通过；四类事件实景专项 16 项通过；新增两张透明 NPC 素材，原图与完整提示词见 [生成记录](assets/source_sheets/V150_GENERATION.md)。
- CI 与线上核验待本版发布后补充。

## v0.16 角色主动技能

- 已实现守卫格挡反击、游侠闪避齐射、术士蓄力爆发，Q 键与独立触控按钮。
- 冷却与蓄力状态保存；暂停冻结，切关重置，死亡拒绝施放。
- 单元检查与实景专项 19 项通过，包括触控不触发普通闪避、真实格挡 / 箭矢 / 爆发伤害。
- v0.16 构建 `454eed575344ad21ab4ec76ee5cec65e4cb52086`；[CI 37630275694](https://github.com/JOJO-5/cursed-blades-game/actions/runs/37630275694) 验证与部署成功，完整浏览器 582 项、真实开局 3 项通过。线上技能 19 项通过，18 个资源缓存参数、触控入口和技能源码一致。

## v0.17 通关挑战

- 已实现普通 / 噩梦 / 铁誓三种模式，完整战役解锁挑战；九项角色与构筑成就、路线 / 角色 / 模式通关记录，不增加永久属性。
- 铁誓限制三武器、禁止治疗（包括切关恢复），过滤无效治疗升级；旧版完整战役存档可以导入解锁一次。
- 首领生命、二阶段和攻击轮换位置保存；恢复时清除瞬时攻击，给出 1.1 秒恢复窗口。
- 38 武器在 Lv.1 / Lv.6 的真实更新、数值成长与已有进化回归通过。
- 三角色 × 四路线实际武器 / 技能伤害、最终存档、成就、死亡重试检查通过；窄屏触控回归加入最终门禁。
- 自然完整流程矩阵正在运行，逐行记录胜利 / 死亡、实际到达地图及真实保存刷新；首关死亡不能代表后续地图的自然覆盖。

## 验收边界

自动化模拟触控不等于手机真机体验，渲染测试不等于物理屏幕与实际音响验收；两项需真实设备才能完成，分别记录。

## v0.17 桌面压力检查

- 90 秒、120 持久敌人、六件 Lv.6 实际武器；无运行错误，敌人 / 弹体 / 粒子 / 召唤物数量有界，粒子最多 600。
- 更新 p95 2.80 ms，渲染 p95 2.80 ms，RAF 间隔 p95 12.20 ms。本次桌面样本满足 60fps 的 p95 间隔条件，不代表所有设备、所有阶段的严格 60fps。
- GC 后堆内存增加 1.74 MiB，包含对象池与本次场景缓存；90 秒检查不能证明数小时无泄漏。

## 重跑命令

- `npm test`：逻辑、素材、存档、全部武器 Lv.1 / Lv.6 与挑战条件。
- `npm run test:e2e`：桌面 / 触控浏览器回归与 90 秒敌潮压力样本。
- `npm run test:opening`：三个角色真实首分钟；不等同完整通关。
- `npm run test:matrix -- --route=mine-hell`：三角色的真实完整战役 / 死亡结果与 90 秒保存刷新；分别使用 `mine-marsh`、`frost-hell`、`frost-marsh` 重跑其他路线，最长每行 40 分钟。结果标记实际到达的地图，首关死亡不计作后三段覆盖。

## 三角色 × 四路线自然流程结果

固定随机种子、真实键盘选择、原始生命 / 数值 / 计时：12 胜利，0 死亡，12/12 完成保存 / 刷新 / 继续，运行错误 0。自动操作不能代替人工平衡判断。

| 角色 | 计划路线 | 实际地图 | 结果 | 游戏秒数 | 保存刷新 |
|---|---|---|---|---|---|
| ranger | mine-hell | village → mine → hell | victory | 1474 | 通过 |
| warden | mine-hell | village → mine → hell | victory | 1479 | 通过 |
| arcanist | mine-hell | village → mine → hell | victory | 1479 | 通过 |
| arcanist | mine-marsh | village → mine → marsh | victory | 1210 | 通过 |
| ranger | mine-marsh | village → mine → marsh | victory | 1207 | 通过 |
| warden | mine-marsh | village → mine → marsh | victory | 1210 | 通过 |
| ranger | frost-hell | village → frost → hell | victory | 1301 | 通过 |
| warden | frost-hell | village → frost → hell | victory | 1306 | 通过 |
| arcanist | frost-hell | village → frost → hell | victory | 1308 | 通过 |
| ranger | frost-marsh | village → frost → marsh | victory | 1028 | 通过 |
| warden | frost-marsh | village → frost → marsh | victory | 1036 | 通过 |
| arcanist | frost-marsh | village → frost → marsh | victory | 1043 | 通过 |

机器记录：`output/playwright/v120/v170-natural-matrix.json` 与各路线结果、截图。自然死亡若发生在首关，不计后续路线的自然覆盖。
