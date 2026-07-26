# 修改记录 (CHANGELOG)

## [v0.7.0] - 2026-07-26

### 关卡分阶段刷怪系统（阶段4.1）
- **数据驱动的 phases 配置**：为 village 和 mine 两关各新增 5 个阶段配置，每个阶段定义 `time`（触发时间秒）、`name`（阶段名）、`enemyPool`（该阶段敌人池）、`rangedPool`（远程敌人池）、`maxEnemies`（敌人上限）、`spawnInterval`（刷怪间隔）、`events`（一次性触发事件）
  - 影响文件：`js/config.js`
- **village 阶段流程**：
  - 0-2分钟「初始骚扰」：史莱姆 + 蝙蝠，上限12，3.0s间隔
  - 2-4分钟「远程加入」：+蜘蛛 +弓手，首个普通宝箱，上限16，2.7s间隔
  - 4-6分钟「精英登场」：+骷髅，第一只精英怪，可疑宝箱，上限20，2.4s间隔
  - 6-8分钟「腐化加剧」：+野猪 +法师，第二只精英怪，稀有宝箱，上限25，2.0s间隔
  - 8分钟「Boss降临」：清理普通敌人，Boss战
- **mine 阶段流程**：
  - 0-2分钟「矿洞探索」：疫病鼠 + 岩甲甲虫，上限14，2.5s间隔
  - 2-4分钟「水晶法师」：+腐化矿工 +水晶法师，首个普通宝箱，上限18，2.2s间隔
  - 4-6分钟「腐化蔓延」：+蜘蛛，第一只精英怪，可疑宝箱，上限22，2.0s间隔
  - 6-7分钟「深渊回响」：+骷髅 +弓手，第二只精英怪，稀有宝箱，上限30，1.6s间隔
  - 7分钟「Boss降临」：清理普通敌人，腐化巨蛛Boss战
- **Game 新增阶段系统**：
  - `currentPhase` / `triggeredPhases` 状态追踪当前阶段和已触发阶段
  - `getActivePhase()` 根据 `levelTime` 返回当前活跃阶段对象
  - `updatePhase(dt)` 替代原固定刷怪逻辑，调用 `spawnEnemyFromPhase()` 使用阶段专属敌人池
  - `triggerPhaseEvents(phase)` 进入新阶段时触发一次性事件（宝箱/精英怪/Boss/消息）
  - `spawnEnemyFromPhase(phase)` 使用阶段专属 enemyPool 和 rangedPool 刷怪
  - `updateLegacySpawning(dt)` 保留原逻辑作为无 phases 配置时的回退
  - 影响文件：`js/game.js`
- **Boss 出现时清理普通敌人**：`spawnBoss()` 新增 `this.enemies.filter(e => e.isBoss)`，符合设计"清理普通敌人 + Boss战"
  - 影响文件：`js/game.js`
- **阶段事件类型**：
  - `chest`：生成宝箱，支持 `rare`（稀有）和 `mimic`（按关卡 mimicChance 概率变为宝箱怪）
  - `elite`：调用 `spawnElite()` 生成精英怪
  - `boss`：调用 `spawnBoss()` 触发Boss战
  - `message`：显示自定义颜色提示消息
- **阶段名横幅**：进入新阶段时显示 `【阶段名】` 金色消息提示

### 验证结果
- [x] village 5个阶段配置正确（time/name/enemyPool/maxEnemies/spawnInterval）
- [x] mine 5个阶段配置正确
- [x] 阶段切换基于 levelTime 自动触发
- [x] 阶段事件一次性触发（宝箱/精英/Boss/消息）
- [x] 宝箱怪按 mimicChance 概率生成
- [x] Boss出现时清理普通敌人
- [x] 无 phases 配置时回退到 legacy 刷怪逻辑
- [x] npm test 通过（17敌人，2关卡，phases 校验）

## [v0.6.0] - 2026-07-26

### 攻击命中特效修复
- **hitFlash 改用碰撞半径**：白色闪烁覆盖区域从图片原始尺寸改为 `this.radius * scale`，贴合不同大小敌人
  - 影响文件：`js/entities.js`
- **新增命中粒子飞溅**：`Enemy.takeDamage()` 生成 4 个（普通）/ 8 个（暴击）粒子，颜色为金色（#ffcc60 / #ffd040），粒子大小根据敌人半径缩放（`radius * 0.25`，clamp 2-5），粒子从命中方向飞溅
  - 影响文件：`js/entities.js`

### 新增第二关：地下矿洞
- **新增 6 种敌人**：腐化矿工、疫病鼠群、岩甲甲虫、水晶法师（远程）、岩石粉碎者（精英）、腐化巨蛛（Boss）
  - 影响文件：`js/config.js`
- **新增 mine 关卡配置**：36x36 地图，2.5s 刷怪间隔，30 上限，7 分钟 Boss，bossId=bossSpider，6 个宝箱
  - 影响文件：`js/config.js`
- **新增 mine 剧情**：intro（矿洞探索）、bossIntro（腐化巨蛛登场）、victory（最终通关结局）
  - 影响文件：`js/config.js`
- **关卡切换逻辑**：village Boss 击败后自动 `loadLevel('mine')`，mine Boss 击败后进入最终 victory 状态
  - 影响文件：`js/game.js`
- **loadLevel 重置关卡状态**：重置 levelTime/spawnTimer/eliteTimer/bossSpawned/bossDefeated/所有实体数组，玩家放置到地图中心，满血恢复
  - 影响文件：`js/game.js`
- **地图尺寸改为数据驱动**：generateMap/spawnBoss/getSpawnPosition/camera clamp/renderWorld 全部使用 `levelData.mapW/mapH` 替代全局 `CONFIG.MAP_W/MAP_H`
  - 影响文件：`js/game.js`
- **spawnBoss 动态 Boss**：使用 `levelData.bossId` 生成对应 Boss，消息显示 Boss 名称
  - 影响文件：`js/game.js`
- **renderVictory 更新**：最终通关文字改为"最终通关!"，描述腐化巨蛛被击败
  - 影响文件：`js/game.js`

### 验证结果
- [x] 命中粒子正常生成（普通 4 个，暴击 8 个，颜色和尺寸正确）
- [x] hitFlash 闪烁区域贴合敌人碰撞半径
- [x] 第二关 mine 正确加载（地图/宝箱/剧情/Boss ID）
- [x] village Boss 击败 → victory 剧情 → 自动进入 mine 关卡
- [x] mine Boss 击败 → victory 剧情 → 最终 victory 状态
- [x] 关卡切换时正确重置所有状态（时间/敌人/弹丸/粒子）
- [x] 地图尺寸使用 levelData 配置而非全局常量
- [x] npm test 通过（17 敌人，2 关卡）

## [v0.4.0-preview] - 2026-07-26

### 核心修复
- 修复手机竖屏 `cover` 裁切后的可视坐标，摇杆、闪避、暂停、HUD、剧情框与奖励卡片均限制在实际可视区域内。
- 修复拾取范围提升后经验宝石磁吸速度变为负数的问题。
- 存档增加版本字段并兼容旧属性，恢复关卡时间、玩家位置和刷怪计时；死亡不再覆盖可继续的存档。
- 满级升级不会重新进入随机池；全部满级后提供生命恢复奖励。
- 首次键盘、鼠标或触屏交互会恢复 Web Audio；修复 Boss 剧情额外点击和武器 ID 引用错误。

### 预览与工程化
- 新增零依赖的 Node smoke 测试：校验全部 JavaScript 语法、10 种武器、20 种升级、11 种敌人的关键配置，以及配置资源是否同时存在于清单和 PNG 文件中。
- 补齐 10 个升级图标（弹丸速度、击退、拾取范围、经验、暴击伤害、冷却、闪避冷却、护甲、幸运、生命偷取），全部为清晰的 16×16 像素 PNG，并登记至资源清单。
- 新增 GitHub Pages 工作流：main 与预览分支会先验证，再部署仓库根目录；Pull Request 只验证。
- 更新 README 的本地启动路径、内容统计、版本和 GitHub Pages 使用说明。

## [v0.1.0] - 2026-07-26

### 阶段0：现有项目审计

#### 审计结果
- 确认技术栈：纯 Vanilla JS + HTML5 Canvas + Web Audio API + localStorage
- 确认项目结构：5个JS文件 + CSS + HTML入口 + assets目录
- 确认游戏可正常运行，控制台无错误
- 验证核心战斗闭环：移动 → 环绕武器攻击 → 敌人受伤死亡 → 掉落经验 → 拾取升级 → 三选一
- 验证移动端触屏控制：虚拟摇杆 + 闪避按钮 + 暂停按钮
- 验证响应式适配：cover策略填充屏幕

#### Bug修复
- **修复升级界面文字居中问题**：`renderLevelUp()` 和 `renderChestReward()` 中竖向卡片布局的文字 x 坐标从 `cardX + 10` 改为 `cardX + cardW/2`，使文字正确居中在卡片内
  - 影响文件：`js/game.js`
- **修复帧内状态切换问题**：`updatePlaying()` 中 pickups 更新后添加状态检查 `if (this.state !== 'playing') return`，防止升级/宝箱触发后同帧内继续执行刷怪和相机逻辑
  - 影响文件：`js/game.js`

#### 数值调整
- **Boss出现时间**：从 90秒 调整为 480秒（8分钟），匹配8-12分钟关卡设计
  - 影响文件：`js/config.js`
- **精英怪间隔**：从 25秒 调整为 90秒（1.5分钟），避免前期精英怪过于频繁
  - 影响文件：`js/config.js`

#### 文档创建
- 创建 `README.md`：项目启动和玩法说明
- 创建 `ARCHITECTURE.md`：当前系统架构文档
- 创建 `NEXT.md`：后续任务和优先级
- 创建 `CHANGELOG.md`：本文件

#### 已有功能清单（审计确认）
- [x] 游戏主循环（requestAnimationFrame + update/render 分离）
- [x] 状态机（loading/menu/story/playing/paused/levelup/chestReward/gameover/victory）
- [x] 玩家八方向移动（键盘 + 虚拟摇杆）
- [x] 闪避机制（无敌帧 + 加速 + 冷却）
- [x] 环绕武器系统（Orbit类型，旋转碰撞，多分身，hitSet防重复）
- [x] 远程武器系统（Ranged类型，定时发射，最近敌人索敌）
- [x] 追踪武器系统（Homing类型，弹丸自动追踪）
- [x] 10种武器定义（铁剑/战锤/镰刀/弓箭/火球/飞刀/灵魂弹/盾牌/炎之环刃/虚空环刃）
- [x] 10种升级（伤害/攻速/武器数量/旋转速度/范围/穿透/暴击/移速/生命/回复）
- [x] 9种武器解锁选项
- [x] 12种敌人（5近战 + 2远程 + 2精英 + 宝箱怪 + Boss）
- [x] 敌人AI（追击/保持距离射击/Boss多技能）
- [x] Boss战（扇形弹幕/召唤仆从/狂暴模式）
- [x] 经验掉落和拾取（磁吸效果）
- [x] 升级三选一（随机池 + 武器解锁）
- [x] 宝箱系统（普通宝箱 + 宝箱怪伪装）
- [x] 宝箱奖励选择界面
- [x] 剧情系统（开场/Boss出现/通关 三组对话）
- [x] 暂停/继续
- [x] 失败结算/通关结算
- [x] 本地存档（保存/加载/继续游戏）
- [x] 地图生成（种子化RNG + 地面tile缓存 + 场景物件散布）
- [x] 相机跟随 + 屏幕震动
- [x] 伤害数字（普通/暴击）
- [x] 粒子效果
- [x] 程序生成音效（Web Audio API）
- [x] 移动端触屏控制（虚拟摇杆 + 闪避按钮 + 暂停按钮）
- [x] 响应式Canvas适配（cover策略）
- [x] 竖屏/横屏升级卡片布局自适应

## [v0.2.0] - 2026-07-26

### 阶段2：武器与升级框架 - 升级稀有度系统

#### Bug修复
- **修复升级界面武器解锁选项崩溃**：`renderLevelUp()` 中武器解锁选项缺少 `desc` 字段，导致 `drawTextWrapped(ctx, choice.desc, ...)` 传入 `undefined` 可能崩溃。添加与 `renderChestReward()` 一致的 desc 回退逻辑：从 `CONFIG.WEAPONS[weaponId].desc` 获取描述
  - 影响文件：`js/game.js`

#### 新功能：升级稀有度系统
- **新增 `CONFIG.RARITY` 配置**：定义三种稀有度（common普通/rare稀有/epic史诗），每种含 name、color、glow 字段
  - 影响文件：`js/config.js`
- **为全部20个升级添加 `rarity`/`weight`/`maxLevel` 字段**：
  - Common（高权重 frequent）：伤害/攻速/旋转速度/范围/移速/最大生命/弹丸速度/击退/拾取范围/经验加成
  - Rare（中权重 impactful）：武器数量/穿透/暴击/回复/暴击伤害/冷却降低/闪避冷却/护甲
  - Epic（低权重 game-changing）：幸运/生命偷取
  - 影响文件：`js/config.js`
- **为 `WEAPON_UNLOCKS` 添加 `rarity` 字段**：普通武器解锁=rare，诅咒环刃=epic
  - 影响文件：`js/config.js`

#### 新功能：10个新升级
- 暴击伤害提升：暴击伤害倍率 +0.3（rare, maxLevel:5）
- 冷却降低：武器冷却 -15%（rare, maxLevel:5）
- 弹丸速度提升：弹丸飞行速度 +25%（common, maxLevel:5）
- 击退提升：击退效果 +35%（common, maxLevel:5）
- 拾取范围提升：经验拾取范围 +35（common, maxLevel:4）
- 闪避冷却降低：闪避冷却 -20%（rare, maxLevel:4）
- 护甲提升：固定减伤 +2（rare, maxLevel:5）
- 幸运提升：稀有升级出现率提升（epic, maxLevel:3）
- 经验加成：经验获取 +15%（common, maxLevel:5）
- 生命偷取：造成伤害时回血 +2%（epic, maxLevel:3）
  - 影响文件：`js/config.js`

#### 新功能：10个新玩家属性
- `critMultBonus`：暴击伤害倍率加成，接入 `Weapon.getCritMult()`
- `cooldownMult`：武器冷却乘数，接入 `Weapon.getCooldown()`
- `projectileSpeedMult`：弹丸速度乘数，接入 `Weapon.fire()`
- `knockbackMult`：击退乘数，接入 `Weapon.update()` orbit碰撞
- `pickupRangeBonus`：拾取范围加成，接入 `Pickup.update()` 磁吸判定
- `dashCooldownMult`：闪避冷却乘数，接入 `Player.update()` 闪避触发
- `armor`：固定减伤，接入 `Player.takeDamage()`
- `luck`：幸运值，接入 `generateUpgradeChoices()` 稀有权重计算
- `xpMult`：经验获取乘数，接入 `Player.gainXp()`
- `lifesteal`：生命偷取比例，接入 `Weapon.update()` 和 `Projectile.update()` 命中回血
  - 影响文件：`js/entities.js`

#### 新功能：加权随机升级选择
- **`generateUpgradeChoices()` 重写**：
  - 过滤已达到 maxLevel 的升级
  - 根据 `weight` 字段进行加权随机选择
  - `luck` 属性提升 rare/epic 升级的出现权重
  - 保留20%概率插入武器解锁选项
- **`generateChestReward()` 更新**：同样过滤 maxLevel 升级
- **`selectUpgrade()` / `selectChestReward()` 更新**：选择后递增 `upgradeLevels[upgradeId]`
  - 影响文件：`js/game.js`

#### 新功能：升级UI稀有度显示
- **`renderLevelUp()` 更新**：
  - 卡片边框颜色根据稀有度变化（common=棕色, rare=蓝色, epic=紫色）
  - 卡片顶部显示稀有度名称
  - 卡片右上角显示当前等级/最大等级（Lv.X/Y）
  - 满级时等级文字变红
  - 修复武器解锁选项 desc 回退
- **`renderChestReward()` 更新**：同步添加稀有度颜色和等级显示
  - 影响文件：`js/game.js`

#### 存档系统更新
- **`saveProgress()`**：新增保存 `upgradeLevels` 对象
- **`loadAndContinue()`**：新增加载 `upgradeLevels`
  - 影响文件：`js/game.js`

#### 其他修改
- **`index.html`**：为所有 `<script>` 标签添加 `?v=2` 缓存破坏参数
- **`Weapon` 类新增 `getCritMult()` 方法**：统一暴击伤害倍率计算（基础值 + critMultBonus）

#### 验证结果
- [x] 20个升级全部加载，3种稀有度配置正确
- [x] 加权随机选择正常工作，50次测试中 maxLevel 升级未出现
- [x] 升级选择后等级追踪正确（upgradeLevels 递增）
- [x] 存档/加载 upgradeLevels 正确
- [x] 新属性全部接入游戏逻辑（armor减伤/xpMult加成/lifesteal回血/critMultBonus暴击/dashCooldownMult冷却等）
- [x] 升级界面和宝箱界面稀有度颜色和等级显示正确
- [x] 武器解锁选项 desc 回退正常，不再崩溃
- [x] 完整战斗闭环验证通过（移动→攻击→杀敌→掉落经验→升级→三选一）

## [v0.3.0] - 2026-07-26

### 阶段1：核心战斗闭环加固 - 玩家受伤反馈增强

#### 新功能：玩家受伤红色闪烁
- **`Player` 类新增 `hitFlash` 属性**：受伤时设为 0.2 秒，在 `draw()` 中使用 `source-atop` 合成模式叠加红色矩形（#ff2020），实现精灵红色染色效果
- **`Player.update()` 衰减 hitFlash**：每帧递减，自然消失
  - 影响文件：`js/entities.js`

#### 新功能：玩家角色震动
- **`Player` 类新增 `hitShakeX` / `hitShakeY` 属性**：受伤时设为 rand(-4, 4) 随机偏移
- **`Player.update()` 衰减震动**：每帧乘以 0.82，低于 0.1 时归零
- **`Player.draw()` 应用震动偏移**：精灵绘制位置加上 sx/sy 偏移
  - 影响文件：`js/entities.js`

#### 新功能：受伤红色粒子
- **`Player.takeDamage()` 生成 6 个红色粒子**：颜色 #ff4040，速度 rand(40,100)，生命周期 rand(0.3,0.6)，尺寸 rand(2,4)
  - 影响文件：`js/entities.js`

#### 新功能：屏幕红色边框（damageVignette）
- **`Game` 类新增 `damageVignette` 属性**：受伤时设为 0.6 秒
- **`Game.update()` 衰减 vignette**：每帧递减至 0
- **`Game.render()` 绘制红色径向渐变**：在 renderWorld 和 renderHUD 之后绘制，圆心透明，边缘红色（最大 alpha 0.5），使用 createRadialGradient
- **`Game.startNewGame()` 重置 vignette**：新游戏时清零
- **`Player.takeDamage()` 设置 `Game.damageVignette = 0.6`**：触发红色边框效果
  - 影响文件：`js/game.js`、`js/entities.js`

#### 新功能：无敌帧闪烁优化
- **`Player.draw()` 无敌帧闪烁改为半透明**：从完全闪烁改为 alpha=0.35 的半透明幽灵效果，受伤后仍可见角色位置
  - 影响文件：`js/entities.js`

#### 验证结果
- [x] 受伤时角色红色闪烁正常（hitFlash=0.2s，source-atop 红色叠加）
- [x] 受伤时角色震动正常（hitShakeX/Y 随机偏移，0.82衰减）
- [x] 受伤时屏幕震动正常（shakeScreen 6.0 magnitude, 0.2s duration）
- [x] 受伤时红色粒子生成正常（6个 #ff4040 粒子）
- [x] 受伤时红色边框渲染正常（damageVignette 径向渐变，截图确认可见）
- [x] 受伤时伤害数字生成正常（红色 #ff4040 数字）
- [x] 受伤音效正常（Audio2.hurt 锯齿波 150Hz）
- [x] 无敌帧 0.8s 正常（半透明闪烁而非完全消失）
- [x] 已有功能不受影响（移动/攻击/敌人死亡/经验升级/暂停/失败/通关/存档）

## [v0.5.0] - 2026-07-26

### 移动端：一键切换横竖屏

#### Bug修复
- **修复 screenToCanvas 方法缺失**：`Input` 对象中调用了 `screenToCanvas()` 方法但从未定义，导致所有鼠标和触摸输入完全失效。新增完整实现，支持 CSS 缩放和 90° 旋转坐标变换
  - 影响文件：`js/core.js`
- **修复旋转模式下坐标变换缩放因子错误**：旋转 90° 时，canvas X 轴对应屏幕高度、canvas Y 轴对应屏幕宽度，但原代码使用了错误的缩放因子。修正为 `canvas.width / rect.height` 和 `canvas.height / rect.width`
  - 影响文件：`js/core.js`

#### 新功能：横竖屏切换按钮
- **`Game.toggleForcedLandscape()`**：切换 `forcedLandscape` 标志，调用 `resizeCanvas()` 重新布局
  - 影响文件：`js/game.js`
- **`resizeCanvas()` 增强旋转逻辑**：当 `forcedLandscape=true` 且屏幕为竖屏时，将画布旋转 90°（`translate(-50%, -50%) rotate(90deg)`），交换屏幕宽高计算 CSS 尺寸
  - 影响文件：`js/game.js`
- **`renderRotateButton()` 新方法**：在所有游戏状态下绘制旋转按钮（左上角蓝色圆形，含手机图标 + 旋转箭头），通过 `render()` 末尾统一调用
  - 影响文件：`js/game.js`
- **`update()` 增加旋转按钮点击检测**：在所有状态下检测鼠标点击旋转按钮区域 `isMouseInRect(12, 52, 36, 36)`
  - 影响文件：`js/game.js`
- **触摸事件增加旋转按钮优先检测**：`touchstart` 中最先检查旋转按钮区域，支持所有状态下的触摸切换
  - 影响文件：`js/core.js`
- **`screenToCanvas()` 新方法**：将屏幕坐标转换为画布内部坐标，处理 CSS 缩放和可选的 90° 旋转变换
  - 影响文件：`js/core.js`
- **竖屏提示文字更新**：从"建议横屏游戏体验更佳"改为"点击左上角按钮可旋转为横屏"，仅在 `forcedLandscape=false` 时显示
  - 影响文件：`js/game.js`

#### 验证结果
- [x] 旋转按钮在所有状态下可见（菜单/游戏/暂停/升级/死亡/通关）
- [x] 鼠标点击旋转按钮正确切换 forcedLandscape 状态
- [x] 触摸点击旋转按钮正确切换 forcedLandscape 状态
- [x] 竖屏 + forcedLandscape 时画布正确旋转 90°（transform: rotate(90deg)）
- [x] 坐标变换四角验证正确（屏幕四角精确映射到画布四角）
- [x] 游戏中按钮点击在旋转模式下正常工作（坐标变换正确）
- [x] `node -c` 语法检查通过（core.js, game.js）
- [x] 已推送至 GitHub Pages
