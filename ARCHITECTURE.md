# 架构文档 (ARCHITECTURE)

## 技术栈

| 层面 | 技术 |
|------|------|
| 语言 | Vanilla JavaScript (ES2020+) |
| 渲染 | HTML5 Canvas 2D Context |
| 音频 | Web Audio API (OscillatorNode 程序生成) |
| 存储 | localStorage (JSON序列化) |
| 样式 | CSS (响应式 cover 适配) |
| 模块 | 无打包工具，script标签直接加载 |

## 文件依赖关系

```
index.html
  ├── css/style.css
  ├── js/config.js    → 全局 CONFIG 对象
  ├── js/core.js      → 依赖 CONFIG；定义 Input, Assets, Audio2, makeRNG, 数学函数
  ├── js/entities.js  → 依赖 CONFIG, Input, Assets, Audio2, Game；定义所有实体类
  ├── js/story.js     → 依赖 CONFIG；定义 StoryUI 剧情渲染模块
  ├── js/game.js      → 依赖 CONFIG, Input, Assets, Audio2, StoryUI, 所有实体类；定义 Game 对象
  └── js/main.js      → 依赖 Game；DOMContentLoaded 时调用 Game.init()
```

加载顺序：config → core → entities → story → game → main

## 核心系统

### 1. Game 对象 (game.js)

中央游戏控制器，单例模式。管理：

- **状态机**：`loading → menu → story → playing ↔ paused/levelup/chestReward → gameover/victory`
- **游戏循环**：`requestAnimationFrame` 驱动，`update(dt)` + `render()` 分离
- **实体容器**：`enemies[]`, `projectiles[]`, `enemyProjectiles[]`, `pickups[]`, `particles[]`, `damageNumbers[]`
- **相机系统**：跟随玩家，支持屏幕震动
- **刷怪系统**：定时生成普通敌人、精英敌人、Boss
- **地图生成**：种子化RNG生成地面tile缓存 + 随机散布场景物件
- **UI渲染**：HUD、菜单、暂停、升级、宝箱奖励、结算等全部用Canvas绘制
- **存档系统**：localStorage 保存/加载玩家进度

### 2. Player 类 (entities.js)

- 八方向移动（键盘 + 虚拟摇杆）
- 闪避机制（短暂无敌 + 加速）
- 属性系统：`stats` 对象包含所有可升级属性
- 武器管理：`weapons[]` 数组，支持动态添加
- 经验/升级：`gainXp()` → `onLevelUp()` 触发三选一
- 受伤系统：无敌帧、减伤（盾牌）、伤害数字、屏幕震动

### 3. Weapon 类 (entities.js)

- **Orbit类型**：围绕玩家旋转，碰撞检测，hitSet防重复伤害
- **Ranged类型**：定时向最近敌人发射弹丸
- **Homing类型**：发射追踪弹丸，自动调整方向
- 属性计算：`getDamage()`, `getRange()`, `getRotateSpeed()`, `getCooldown()`, `getPierce()`, `getCritChance()`
- 等级系统：每级 +15% 伤害，+5% 范围
- 与Player解耦：通过 `Game.player.stats` 读取属性，通过 `Game.enemies` 查找目标

### 4. Enemy 类 (entities.js)

- **AI行为**：`chase`（追击）、`ranged`（保持距离+射击）、`boss`（多技能）
- Boss技能：扇形弹幕、召唤仆从、狂暴模式（HP<33%时触发）
- 受伤系统：击退、闪烁、伤害数字
- 死亡掉落：经验宝石（数量按敌人类型）、宝箱（精英/Boss）
- 对象复用：通过 `alive` 标志 + filter 实现简单池化

### 5. Input 管理 (core.js)

- 键盘：`keys{}` 状态 + `_justPressed{}` 单帧触发
- 鼠标：`mouse{x, y, down, clicked}` + `consumeClick()` 矩形判定
- 触屏：虚拟摇杆（左侧）+ 闪避按钮（右侧）+ 暂停按钮（右上角）
- 坐标转换：`getBoundingClientRect()` + 缩放因子，正确映射触屏到canvas坐标

### 6. Assets 资源加载 (core.js)

- 从 `manifest.json` 读取资源列表
- `loadList()` 返回 Promise，全部加载完成后resolve
- `get(key)` 获取Image对象
- `draw()` / `drawCentered()` 统一绘制接口，强制 `imageSmoothingEnabled = false`

### 7. Audio 音频 (core.js)

- Web Audio API，程序生成音调（无需音频文件）
- 预设音效：`hit()`, `hurt()`, `pickup()`, `levelup()`, `death()`, `boss()`, `click()`, `victory()`
- `play(type, freq, duration, volume)` 通用接口

## 数据驱动设计

所有游戏数据集中在 `CONFIG` 对象中：

| 数据 | 位置 | 说明 |
|------|------|------|
| 画布/地图配置 | `CONFIG.CANVAS_W/H`, `MAP_W/H`, `TILE_SIZE` | 固定参数 |
| 玩家属性 | `CONFIG.PLAYER` | 基础移速、生命、拾取范围、闪避参数 |
| 经验曲线 | `CONFIG.XP_CURVE` | 20级经验表 |
| 武器定义 | `CONFIG.WEAPONS` | 38种武器，每种含伤害/范围/速度/暴击等 |
| 升级池 | `CONFIG.UPGRADES` | 20种升级，每种含apply函数 |
| 武器解锁 | `CONFIG.WEAPON_UNLOCKS` | 多种武器解锁选项 |
| 敌人定义 | `CONFIG.ENEMIES` | 31种敌人，含HP/速度/伤害/AI行为 |
| 关卡定义 | `CONFIG.LEVELS` | 3个关卡（荒废村庄、地下矿洞、地狱熔渊），含阶段刷怪、精英池、Boss时间 |
| 剧情文本 | `CONFIG.STORY` | 3组剧情（开场/Boss出现/通关） |

## 渲染流程

```
render()
  ├── 清屏 (#0a0a0f)
  ├── if menu → renderMenu()
  └── else
      ├── renderWorld()
      │   ├── translate(-camera)
      │   ├── drawImage(groundTileCache)    # 缓存的地面
      │   ├── drawProps()                    # 视锥裁剪
      │   ├── drawPickups()
      │   ├── drawEnemies()
      │   ├── drawPlayer()
      │   ├── drawProjectiles()
      │   ├── drawParticles()
      │   ├── drawDamageNumbers()
      │   └── 渐变暗角
      ├── renderHUD()
      │   ├── HP条 / XP条 / 等级
      │   ├── 计时器 / Boss倒计时
      │   ├── 击杀数 / 敌人数
      │   ├── 武器图标栏
      │   ├── 闪避冷却
      │   ├── 消息提示
      │   └── renderTouchControls()          # 摇杆/闪避/暂停
      └── 覆盖层 (story/paused/levelup/chestReward/gameover/victory)
```

## 性能特点

- 地面tile预渲染到离屏Canvas（`groundTileCache`），每帧只drawImage一次
- 场景物件视锥裁剪（只绘制屏幕可见区域）
- Projectile/Pickup/Particle/DamageNumber 等热路径对象使用 `ObjectPool` 复用，减少GC压力
- 敌人碰撞查询使用 `SpatialGrid` 做 broad phase，`separateEnemies()` 仅处理屏幕附近敌人
- `dt` 上限 0.05s，防止帧率波动导致物理穿越

## 已知限制

- 敌人/召唤物本体仍直接 new，极端数量下仍需继续压测
- `separateEnemies()` 仍是局部 O(n²)，高密度同屏敌人时还可继续优化
- 武器hitSet使用Set，清理策略简单（>200条目时全清）
- 帧动画仍是轻量硬编码接入，尚未抽象成统一 animation clip 系统
- 无正式音频文件，全部使用WebAudio程序生成音调
