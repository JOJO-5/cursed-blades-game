// ============================================================
// config.js — Game configuration: weapons, enemies, upgrades
// ============================================================

const CONFIG = {
  CANVAS_W: 960,
  CANVAS_H: 540,
  TILE_SIZE: 48,
  MAP_W: 40,   // tiles
  MAP_H: 30,   // tiles

  PLAYER: {
    speed: 150,
    maxHp: 150,
    radius: 14,
    pickupRadius: 80,
    dashSpeed: 420,
    dashDuration: 0.2,
    dashCooldown: 0.7,
  },

  XP_CURVE: [5, 12, 22, 35, 52, 74, 101, 134, 173, 219, 273, 336, 409, 493, 589, 699, 824, 966, 1126, 1306],

  // ---- Weapon definitions ----
  WEAPONS: {
    sword: {
      name: '铁剑', type: 'orbit', icon: 'weapons/sword',
      damage: 16, range: 75, rotateSpeed: 2.8, knockback: 100,
      pierce: 0, critChance: 0.05, critMult: 2.0,
      color: '#c8c8d0', size: 28,
      desc: '环绕近战·基础均衡',
    },
    hammer: {
      name: '战锤', type: 'orbit', icon: 'weapons/hammer',
      damage: 24, range: 60, rotateSpeed: 1.6, knockback: 160,
      pierce: 0, critChance: 0.05, critMult: 2.0,
      color: '#a0a0b0', size: 32,
      desc: '环绕近战·高伤慢速',
    },
    scythe: {
      name: '镰刀', type: 'orbit', icon: 'weapons/scythe',
      damage: 10, range: 85, rotateSpeed: 3.0, knockback: 40,
      pierce: 3, critChance: 0.08, critMult: 2.0,
      color: '#d0d0e0', size: 36,
      desc: '环绕近战·穿透大范围',
    },
    bow: {
      name: '弓箭', type: 'ranged', icon: 'weapons/bow',
      damage: 10, range: 320, cooldown: 1.0, projectileSpeed: 300,
      pierce: 1, critChance: 0.1, critMult: 2.0,
      color: '#d4a850', size: 20,
      desc: '远程发射·直线穿透',
    },
    fireball: {
      name: '火球', type: 'ranged', icon: 'weapons/fireball',
      damage: 18, range: 280, cooldown: 1.4, projectileSpeed: 220,
      pierce: 0, critChance: 0.05, critMult: 2.0, splash: 40,
      color: '#ff8030', size: 22,
      desc: '远程发射·范围爆炸',
    },
    knife: {
      name: '飞刀', type: 'ranged', icon: 'weapons/knife',
      damage: 6, range: 260, cooldown: 0.35, projectileSpeed: 400,
      pierce: 0, critChance: 0.15, critMult: 2.5,
      color: '#c0c0d0', size: 16,
      desc: '远程发射·高频低伤',
    },
    soul: {
      name: '灵魂弹', type: 'homing', icon: 'weapons/soul',
      damage: 14, range: 300, cooldown: 1.2, projectileSpeed: 180,
      pierce: 0, critChance: 0.08, critMult: 2.0, homingStrength: 8,
      color: '#78dcff', size: 20,
      desc: '自动追踪·灵能制导',
    },
    shield: {
      name: '盾牌', type: 'orbit', icon: 'weapons/shield',
      damage: 5, range: 55, rotateSpeed: 1.2, knockback: 120,
      pierce: 0, critChance: 0.0, critMult: 1.5,
      color: '#7896c8', size: 30,
      blockReduction: 0.3,
      desc: '防御辅助·减伤格挡',
    },
    ring_fire: {
      name: '炎之环刃', type: 'orbit', icon: 'weapons/ring_fire',
      damage: 16, range: 80, rotateSpeed: 2.8, knockback: 60,
      pierce: 2, critChance: 0.1, critMult: 2.0,
      color: '#ff6020', size: 34,
      desc: '诅咒环刃·火焰穿透',
    },
    ring_void: {
      name: '虚空环刃', type: 'orbit', icon: 'weapons/ring_void',
      damage: 14, range: 90, rotateSpeed: 3.5, knockback: 30,
      pierce: 5, critChance: 0.12, critMult: 2.2,
      color: '#a040c0', size: 34,
      desc: '诅咒环刃·虚空多穿',
    },
  },

  // ---- Rarity system ----
  RARITY: {
    common:  { name: '普通', color: '#8a7a5a', glow: '#c4a87a' },
    rare:    { name: '稀有', color: '#4080ff', glow: '#60a0ff' },
    epic:    { name: '史诗', color: '#c060e0', glow: '#e080ff' },
  },

  // ---- Upgrade pool (20 upgrades with rarity/weight/maxLevel) ----
  UPGRADES: [
    // --- Common (high weight, frequent) ---
    { id:'damage', name:'伤害提升', icon:'ui/upgrade_damage', desc:'武器伤害 +25%',
      rarity:'common', weight:100, maxLevel:8,
      apply:(p)=>{ p.stats.damageMult *= 1.25; } },
    { id:'attackspeed', name:'攻速提升', icon:'ui/upgrade_attackspeed', desc:'攻击/旋转速度 +20%',
      rarity:'common', weight:100, maxLevel:6,
      apply:(p)=>{ p.stats.attackSpeedMult *= 1.20; } },
    { id:'rotatespeed', name:'旋转速度提升', icon:'ui/upgrade_rotatespeed', desc:'环绕速度 +30%',
      rarity:'common', weight:90, maxLevel:6,
      apply:(p)=>{ p.stats.rotateSpeedMult *= 1.30; } },
    { id:'range', name:'攻击范围提升', icon:'ui/upgrade_range', desc:'武器范围 +20%',
      rarity:'common', weight:80, maxLevel:6,
      apply:(p)=>{ p.stats.rangeMult *= 1.20; } },
    { id:'movespeed', name:'移动速度提升', icon:'ui/upgrade_movespeed', desc:'移速 +15%',
      rarity:'common', weight:80, maxLevel:6,
      apply:(p)=>{ p.stats.moveSpeedMult *= 1.15; } },
    { id:'maxhp', name:'最大生命提升', icon:'ui/upgrade_maxhp', desc:'最大生命 +30 并回满',
      rarity:'common', weight:80, maxLevel:8,
      apply:(p)=>{ p.stats.maxHpBonus += 30; p.hp = p.getMaxHp(); } },
    { id:'projspeed', name:'弹丸速度提升', icon:'ui/upgrade_projspeed', desc:'弹丸飞行速度 +25%',
      rarity:'common', weight:70, maxLevel:5,
      apply:(p)=>{ p.stats.projectileSpeedMult *= 1.25; } },
    { id:'knockback', name:'击退提升', icon:'ui/upgrade_knockback', desc:'击退效果 +35%',
      rarity:'common', weight:60, maxLevel:5,
      apply:(p)=>{ p.stats.knockbackMult *= 1.35; } },
    { id:'pickuprange', name:'拾取范围提升', icon:'ui/upgrade_pickuprange', desc:'经验拾取范围 +35',
      rarity:'common', weight:70, maxLevel:4,
      apply:(p)=>{ p.stats.pickupRangeBonus += 35; } },
    { id:'xpmult', name:'经验加成', icon:'ui/upgrade_xpmult', desc:'经验获取 +15%',
      rarity:'common', weight:70, maxLevel:5,
      apply:(p)=>{ p.stats.xpMult *= 1.15; } },
    // --- Rare (medium weight, impactful) ---
    { id:'weaponcount', name:'武器数量增加', icon:'ui/upgrade_weaponcount', desc:'每把环绕武器多 +1 分身',
      rarity:'rare', weight:35, maxLevel:3,
      apply:(p)=>{ p.stats.weaponCountBonus += 1; } },
    { id:'pierce', name:'穿透提升', icon:'ui/upgrade_pierce', desc:'穿透 +1',
      rarity:'rare', weight:45, maxLevel:5,
      apply:(p)=>{ p.stats.pierceBonus += 1; } },
    { id:'crit', name:'暴击提升', icon:'ui/upgrade_crit', desc:'暴击率 +10%',
      rarity:'rare', weight:45, maxLevel:5,
      apply:(p)=>{ p.stats.critChanceBonus += 0.10; } },
    { id:'regen', name:'回复效果提升', icon:'ui/upgrade_regen', desc:'每秒回血 +1',
      rarity:'rare', weight:35, maxLevel:5,
      apply:(p)=>{ p.stats.regenBonus += 1; } },
    { id:'critdamage', name:'暴击伤害提升', icon:'ui/upgrade_critdamage', desc:'暴击伤害倍率 +0.3',
      rarity:'rare', weight:40, maxLevel:5,
      apply:(p)=>{ p.stats.critMultBonus += 0.3; } },
    { id:'cooldown', name:'冷却降低', icon:'ui/upgrade_cooldown', desc:'武器冷却 -15%',
      rarity:'rare', weight:40, maxLevel:5,
      apply:(p)=>{ p.stats.cooldownMult *= 0.85; } },
    { id:'dashcd', name:'闪避冷却降低', icon:'ui/upgrade_dashcd', desc:'闪避冷却 -20%',
      rarity:'rare', weight:40, maxLevel:4,
      apply:(p)=>{ p.stats.dashCooldownMult *= 0.80; } },
    { id:'armor', name:'护甲提升', icon:'ui/upgrade_armor', desc:'固定减伤 +2',
      rarity:'rare', weight:35, maxLevel:5,
      apply:(p)=>{ p.stats.armor += 2; } },
    // --- Epic (low weight, game-changing) ---
    { id:'luck', name:'幸运提升', icon:'ui/upgrade_luck', desc:'稀有升级出现率提升',
      rarity:'epic', weight:18, maxLevel:3,
      apply:(p)=>{ p.stats.luck += 1; } },
    { id:'lifesteal', name:'生命偷取', icon:'ui/upgrade_lifesteal', desc:'造成伤害时回血 +2%',
      rarity:'epic', weight:18, maxLevel:3,
      apply:(p)=>{ p.stats.lifesteal += 0.02; } },
  ],

  // ---- Weapon unlock upgrades (rare, from mimics/chests) ----
  WEAPON_UNLOCKS: [
    { weaponId:'hammer',  name:'获得武器: 战锤', icon:'weapons/hammer',   rarity:'rare' },
    { weaponId:'scythe',  name:'获得武器: 镰刀', icon:'weapons/scythe',   rarity:'rare' },
    { weaponId:'bow',     name:'获得武器: 弓箭', icon:'weapons/bow',      rarity:'rare' },
    { weaponId:'fireball',name:'获得武器: 火球', icon:'weapons/fireball', rarity:'rare' },
    { weaponId:'knife',   name:'获得武器: 飞刀', icon:'weapons/knife',    rarity:'rare' },
    { weaponId:'soul',    name:'获得武器: 灵魂弹', icon:'weapons/soul',   rarity:'rare' },
    { weaponId:'shield',  name:'获得武器: 盾牌', icon:'weapons/shield',   rarity:'rare' },
    { weaponId:'ring_fire',name:'获得武器: 炎之环刃', icon:'weapons/ring_fire', rarity:'epic' },
    { weaponId:'ring_void',name:'获得武器: 虚空环刃', icon:'weapons/ring_void', rarity:'epic' },
  ],

  // ---- Enemy definitions ----
  ENEMIES: {
    slime: {
      name: '腐烂史莱姆', sprite: 'enemies/toxic_slime',
      hp: 18, speed: 42, damage: 6, xp: 3, radius: 16,
      color: '#5a9a3a', behavior: 'chase',
    },
    bat: {
      name: '影翼蝙蝠', sprite: 'enemies/demon_bat',
      hp: 10, speed: 80, damage: 5, xp: 2, radius: 14,
      color: '#6a4a8a', behavior: 'chase',
    },
    skeleton: {
      name: '骸骨战士', sprite: 'enemies/hooded_warrior',
      hp: 30, speed: 50, damage: 10, xp: 5, radius: 16,
      color: '#a0a0a0', behavior: 'chase',
    },
    spider: {
      name: '骨蛛', sprite: 'enemies/bone_spider',
      hp: 24, speed: 65, damage: 8, xp: 4, radius: 18,
      color: '#8a7a5a', behavior: 'chase',
    },
    boar: {
      name: '棘刺野猪', sprite: 'enemies/spiked_boar',
      hp: 45, speed: 55, damage: 12, xp: 6, radius: 20,
      color: '#7a5a3a', behavior: 'chase',
    },
    // ranged
    archer: {
      name: '暗影弓手', sprite: 'enemies/archer',
      hp: 25, speed: 40, damage: 10, xp: 5, radius: 15,
      color: '#4a6a3a', behavior: 'ranged', shootRange: 250, shootCooldown: 2.0,
      projectileSpeed: 200, projectileColor: '#8acc4a',
    },
    mage: {
      name: '冰霜法师', sprite: 'enemies/dwarf_mage',
      hp: 30, speed: 35, damage: 14, xp: 7, radius: 15,
      color: '#4a6aaa', behavior: 'ranged', shootRange: 220, shootCooldown: 2.5,
      projectileSpeed: 160, projectileColor: '#78dcff',
    },
    // elites
    golem: {
      name: '蘑菇巨像', sprite: 'enemies/fungal_golem',
      hp: 180, speed: 30, damage: 22, xp: 20, radius: 28,
      color: '#8a6a3a', behavior: 'chase', elite: true,
    },
    reaper: {
      name: '收割者', sprite: 'enemies/grim_reaper',
      hp: 140, speed: 50, damage: 25, xp: 18, radius: 24,
      color: '#3a2a4a', behavior: 'chase', elite: true,
    },
    // mimic
    mimic: {
      name: '宝箱怪', sprite: 'enemies/mimic_chest_red',
      hp: 100, speed: 35, damage: 18, xp: 15, radius: 22,
      color: '#aa6a3a', behavior: 'chase', isMimic: true,
    },
    // boss
    boss: {
      name: '诅咒骑士', sprite: 'bosses/dark_knight_flame',
      hp: 800, speed: 45, damage: 30, xp: 100, radius: 36,
      color: '#3a1a2a', behavior: 'boss',
      phases: 3, enrageHpPct: 0.33,
      shootRange: 300, shootCooldown: 1.5,
      projectileSpeed: 200, projectileColor: '#ff4030',
      summonCooldown: 8, summonCount: 3,
    },
  },

  // ---- Level 1: Abandoned Village ----
  LEVELS: {
    village: {
      name: '荒废村庄',
      theme: 'village',
      bgMusic: null,
      mapW: 40, mapH: 30,
      spawnInterval: 3.0,
      maxEnemies: 25,
      enemyPool: ['slime','bat','skeleton','spider','boar'],
      rangedPool: ['archer','mage'],
      elitePool: ['golem','reaper'],
      eliteInterval: 90, // seconds — first elite at ~1.5min, then every 1.5min
      bossSpawnTime: 480,  // boss appears at 8 minutes
      bossId: 'boss',
      chestCount: 5,
      mimicChance: 0.4,
      props: {
        trees: ['props/tree_dead_gnarled_01'],
        tombstones: ['props/tombstone_single_rounded','props/tombstone_single_tall_ornate','props/tombstone_double_rounded'],
        fences: ['props/fence_wooden_broken_01'],
        barrels: ['props/barrel_wooden_single','props/barrels_wooden_group'],
        braziers: ['props/brazier_single_lit','props/brazier_double_lit','props/brazier_single_tall_lit'],
        ruins: ['props/stone_arch_broken','props/stone_pillars_01','props/stone_well_broken'],
        houses: ['props/shrine_stone_lit'],
      },
      groundTiles: ['tiles/ground_dirt_grass_01','tiles/ground_dirt_stones_01','tiles/ground_dirt_path_01','tiles/ground_mossy_stone_01'],
    },
  },

  // ---- Story ----
  STORY: {
    village: {
      intro: [
        { speaker: '旁白', text: '曾经的安宁村庄，如今只剩残垣断壁……' },
        { speaker: '旅者', text: '这些武器……它们在诅咒之下开始袭击人类。' },
        { speaker: '旅者', text: '但我能控制它们环绕在我身边。' },
        { speaker: '旁白', text: '调查诅咒的源头，从这座荒废村庄开始。' },
      ],
      bossIntro: [
        { speaker: '???', text: '你竟敢踏入我的领地……' },
        { speaker: '诅咒骑士', text: '这把剑的诅咒，正是我赋予的！' },
        { speaker: '旅者', text: '你就是诅咒的源头？受死吧！' },
      ],
      victory: [
        { speaker: '旅者', text: '诅咒……消散了一些，但并未根除。' },
        { speaker: '旁白', text: '骑士倒下了，但他提到诅咒来自更深处……' },
        { speaker: '旅者', text: '地下矿洞，或许藏着真正的答案。' },
      ],
    },
  },
};
