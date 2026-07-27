# 后续任务 (NEXT)

按开发阶段排列优先级。当前处于 **阶段1完成 + 阶段2部分完成 + 阶段3.3行为拆分中 + 阶段4完成（Boss双阶段/地图碰撞）+ 阶段6.4视觉反馈完成 + 阶段6.6存档基础完成**，玩家受伤反馈、升级稀有度系统、两关流程、命中特效、分阶段刷怪、Boss双阶段技能与预警、地图碰撞、顶部Boss血条、宝箱类型、失败结算统计、存档容错已实现。

## 工程与预览
- [x] 零依赖 Node smoke 测试（JS 语法、配置结构、资源清单与 PNG 存在性）
- [x] GitHub Pages 自动预览（Push 部署、Pull Request 仅验证）
- [x] 补齐 20 种升级的 UI 图标和 manifest 条目

## 阶段1：核心战斗闭环加固

### 1.1 玩家受伤反馈增强
- [x] 受伤时闪红效果（hitFlash + source-atop 红色叠加，0.2秒持续）
- [x] 受伤时角色轻微震动（hitShakeX/Y 随机偏移，0.82衰减）
- [x] 临时占位音效已接入（Audio2.hurt 锯齿波 150Hz），需替换为正式音效

### 1.2 死亡和失败流程
- [x] 玩家死亡 → gameover状态 → 失败结算页面
- [x] 重新开始 → startNewGame()
- [x] 返回主菜单
- [x] 失败结算页面增加更多统计（获得武器列表、击败精英数量、Boss击杀、宝箱开启数 — renderGameOver）

### 1.3 暂停和继续
- [x] ESC/P暂停
- [x] 暂停界面（继续/保存退出/返回主菜单）
- [x] 暂停时游戏逻辑真正暂停

## 阶段2：武器与升级框架

### 2.1 补齐6种核心武器行为
当前已有10种武器定义，但行为类型不够丰富：
- [x] Orbit类型：铁剑、战锤、镰刀、盾牌、炎之环刃、虚空环刃
- [x] Ranged类型：弓箭、火球、飞刀
- [x] Homing类型：灵魂弹
- [ ] Projectile类型：定时向敌人发射弹丸（与Ranged类似但需区分行为）
- [x] Shield类型：环绕角色并**阻挡攻击**（EnemyProjectile.update 检查盾牌轨道位置，拦截弹丸+火花粒子+音效）
- [ ] Aura类型：持续影响范围内敌人或玩家
- [ ] Summon类型：生成自动作战单位

### 2.2 扩展升级池至20+
- [x] 暴击伤害提升
- [x] 攻击冷却降低
- [x] 弹丸速度提升
- [x] 击退提升
- [x] 拾取范围提升
- [x] 闪避冷却降低
- [x] 护甲提升
- [x] 幸运提升
- [x] 经验加成
- [x] 生命偷取

### 2.3 升级稀有度系统
- [x] 为每个升级添加 `rarity` 字段（common/rare/epic）
- [x] 添加 `weight` 权重字段
- [x] 添加 `maxLevel` 最大等级限制
- [x] 升级界面显示稀有度颜色
- [x] 升级界面显示当前等级和升级后变化
- [x] 加权随机选择系统（luck属性影响稀有度权重）
- [x] 添加 `prerequisite` 前置条件（critdamage 需 crit，lifesteal 需 armor）

### 2.4 武器进化系统
- [ ] 定义进化配方数据结构
- [ ] 实现至少3个进化配方：
  - [ ] 铁剑 + 攻速遗物 → 疾风双刃
  - [ ] 巨锤 + 范围遗物 → 星陨重锤
  - [ ] 灵魂飞弹 + 索敌遗物 → 千魂追猎
- [ ] 进化后替换原武器，改变外观和行为
- [ ] 通过宝箱奖励触发进化

## 阶段3：敌人与宝箱怪

### 3.1 补齐5种普通敌人（按设计文档）
当前敌人不完全匹配设计文档要求：
- [ ] 腐化村民（普通近战追击，生命低，数量多）— 可复用 slime 或 skeleton
- [ ] 野犬（移动速度快，短距离冲刺）— 需新增冲刺AI
- [ ] 瘟疫弓手（保持距离，定时发射弹丸）— 可复用 archer
- [ ] 稻草怪（移动慢，生命高，死亡范围伤害）— 需新增死亡爆炸逻辑
- [x] 蝙蝠（不规则轨迹，快速接近）— BatBehavior 正弦侧向偏移，zig-zag 飞行

### 3.2 补齐2种精英敌人
- [ ] 精英稻草人（镰刀范围攻击，召唤普通稻草怪）
- [ ] 腐化骑士（高生命高防御，冲锋，冲锋前提示）

### 3.3 敌人AI拆分
已用策略模式将敌人 AI 拆分为独立行为类，Enemy.update() 委托给 behavior 策略：
- [x] ChaseBehavior（追击）— 直线追击玩家
- [x] RangedBehavior（保持距离 + 远程攻击）— 保持距离、侧移、定时射击
- [x] BossBehavior（Boss 移动）— 根据状态机调整移速，委托 updateBoss 处理技能
- [ ] DashBehavior（冲刺）— 预留接口，当前无敌人使用
- [ ] SummonBehavior（召唤）— 当前在 Boss 状态机内实现，可进一步抽离
- [x] DeathBehavior（死亡效果）— 已抽离为独立类，Enemy.die() 委托执行（掉落/粒子/奖励/震屏）

### 3.4 宝箱怪状态机
- [ ] Disguise（伪装为普通宝箱）
- [ ] Reveal（暴露身份，张嘴动画）
- [ ] Chase（追击玩家）
- [ ] Attack（普通攻击）
- [ ] JumpAttack（跳跃攻击）
- [ ] Consume（吞噬武器 — 预留接口）
- [ ] Hurt（受伤）
- [ ] Dead（死亡，掉落稀有奖励）

### 3.5 宝箱类型
- [x] 普通宝箱（已实现）
- [x] 稀有宝箱（generateChestReward 强制 2 个从 rare/epic 池抽取；武器进化待进化系统实现）
- [x] 可疑宝箱（80% 变宝箱怪 + 靠近颤抖 + 紫色光晕 — openChest/Pickup.update）

## 阶段4：第一关和Boss

### 4.1 关卡时间流程
当前 bossSpawnTime=480s(8分钟)，需实现分阶段刷怪：
- [x] 0-2分钟：腐化村民 + 野犬 + 基础升级
- [x] 2-4分钟：加入蝙蝠和弓手 + 首个普通宝箱
- [x] 4-6分钟：第一只精英怪 + 敌人数量提升 + 可疑宝箱
- [x] 6-8分钟：高强度敌潮 + 第二只精英怪 + 稀有宝箱
- [x] 8-10分钟：Boss出现提示 + 清理普通敌人 + Boss战

### 4.2 Boss无头骑士
当前Boss已按设计文档实现为"无头骑士"双阶段Boss：
- [x] 第一阶段：近战挥砍(cleave)、扇形弹幕(fanShot)、直线冲锋(charge)
- [x] 第二阶段（HP<50%）：环绕武器(orbit)、投掷巨剑(swordThrow)、召唤腐化士兵(soldierSummon)、地面危险区域(hazard)
- [x] 攻击前摇和范围提示（windup telegraph：cleave扇形/charge虚线/fanShot圆圈/hazard圆圈）
- [x] 阶段转换提示（"无头骑士拔出腐化巨剑！第二阶段！"）
- [x] HP降至50%时进入第二阶段（enrageHpPct: 0.5）

### 4.3 地图碰撞
- [x] 场景物件添加碰撞体（CONFIG.PROP_COLLISION 定义各类 prop 碰撞半径）
- [x] 玩家不能穿过墙壁/大型物件（Player.update 调用 resolvePropCollision）
- [x] 敌人也不能穿过碰撞体（Enemy.update 调用 resolvePropCollision）
- [x] Props 生成时避开玩家出生点（地图中心 80px 范围内不生成）

## 阶段5：素材整理

### 5.1 素材切分工具
- [ ] 创建 `tools/sprite_slicer.py` 脚本
- [ ] 支持透明背景连通区域切分
- [ ] 支持纯色背景去除
- [ ] 支持网格切分
- [ ] 支持手动矩形配置（JSON）
- [ ] 生成预览索引图

### 5.2 资源清单
- [ ] 创建 `assets/asset_manifest.json`（含id/名称/分类/路径/尺寸/锚点/动画等）
- [ ] 规范命名：`player_knight_idle_01.png` 等
- [ ] 当前素材已有 manifest.json（仅含宽高），需扩展

### 5.3 替换占位素材
- [ ] 玩家：当前 `player/hero.png` 单张静态图 → 需 idle/move 动画帧
- [ ] 敌人：当前各一张静态图 → 需 idle/move/attack/hit/death 帧或简单浮动模拟
- [ ] Boss：当前 `bosses/dark_knight_flame.png` → 需多状态图

## 阶段6：剧情、UI、音效和优化

### 6.1 剧情节点
- [x] 开场剧情（已实现）
- [x] Boss出现剧情（已实现）
- [x] 通关剧情（已实现）
- [x] 首次遇见宝箱怪剧情（mimicEncounter 剧情，首次生成宝箱怪时触发，meta.seenStories 记录）
- [x] 剧情数据与UI分离（数据在 CONFIG.STORY；渲染逻辑抽离至 js/story.js 的 StoryUI 模块）

### 6.2 HUD完善
- [x] 生命条、经验条、等级、计时器、击杀数
- [x] 武器图标栏
- [x] 闪避冷却提示
- [x] Boss生命条（敌人头上显示）
- [x] Boss生命条也显示在屏幕顶部（renderHUD 顶部血条，含阶段分隔线与阶段标签）
- [x] 设置界面（音量调节等）— 主菜单/暂停界面可打开设置覆盖层，3条音量滑块（主/音效/音乐），拖拽调节+实时预览+持久化

### 6.3 音效
- [x] 基础音效已接入（hit/hurt/pickup/levelup/death/boss/click/victory）
- [x] 武器命中不同材质音效（hitMaterial: flesh/bone/leather/metal/wood/chest 六种音色）
- [x] Boss阶段转换音效（复用 Audio2.boss，HP<50% 狂暴时触发）
- [ ] 背景音乐

### 6.4 视觉反馈
- [x] 伤害数字（普通/暴击）
- [x] 命中闪烁
- [x] 击退效果
- [x] 死亡粒子
- [x] 屏幕震动
- [x] 玩家受伤红色边框（damageVignette 径向渐变，0.6秒持续）
- [x] Boss技能预警圈（drawBossExtras：cleave 扇形/charge 虚线/fanShot·swordThrow 圆圈/hazard 圆圈，含 pulse 动画）
- [x] 拾取经验闪光（Pickup.collect 绿色粒子迸发 + 持续 glow）

### 6.5 性能优化
- [ ] 敌人对象池（预分配+复用，替代 new + filter）
- [ ] 弹丸对象池
- [ ] 经验物对象池
- [ ] 伤害数字对象池
- [ ] 空间分区（网格或四叉树）替代 O(n²) 碰撞
- [ ] 屏幕外实体跳过更新
- [ ] 目标：100+敌人稳定运行

### 6.6 存档系统完善
- [x] 保存：等级/经验/HP/击杀/武器/属性/时间/关卡
- [x] 保存：是否完成第一关（meta.levelsCompleted 记录已通关关卡，Boss击败时写入）
- [x] 保存：已解锁武器/升级/剧情（selectUpgrade/selectChestReward 记录 unlockedWeapons/unlockedUpgrades，startStory 记录 seenStories）
- [x] 保存：最高生存时间/等级/击杀数（metaKey 独立存储，updateMeta 在死亡时更新，失败页显示最高记录）
- [x] 保存：设置项（settings.masterVolume/sfxVolume/musicVolume 存入 metaKey）
- [x] 读取失败时使用默认数据（loadAndContinue try/catch 回退 startNewGame）
- [x] 存档字段增加后兼容旧版本（migrateSave 按版本号逐步迁移 v0→v3，字段容错 + 迁移逻辑）
- [x] 提供重置存档入口（菜单"重置存档"按钮，二次确认机制）
