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
      projectileSprite: 'effects/fire_projectile',
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
      projectileSprite: 'effects/spirit_orbs_blue',
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
    holy_cross: {
      name: '圣光十字', type: 'projectile', icon: 'weapons/holy_cross',
      damage: 12, range: 280, cooldown: 0.8, projectileSpeed: 280,
      pierce: 1, critChance: 0.08, critMult: 2.0,
      color: '#ffe8a0', size: 18,
      projectileCount: 4, // fires in cross pattern (4 directions)
      desc: '旋转弹幕·十字方向发射',
    },
    poison_aura: {
      name: '剧毒光环', type: 'aura', icon: 'weapons/poison_aura',
      damage: 5, range: 90, cooldown: 0.5,
      pierce: 0, critChance: 0.05, critMult: 2.0,
      color: '#60c040', size: 20,
      desc: '持续光环·范围毒伤',
    },
    shadow_imp: {
      name: '暗影小鬼', type: 'summon', icon: 'weapons/shadow_imp',
      damage: 8, range: 300, cooldown: 3.0, projectileSpeed: 100,
      pierce: 0, critChance: 0.0, critMult: 1.5,
      color: '#8040a0', size: 12,
      summonCount: 1, // minions spawned per cooldown
      summonLifetime: 8, // seconds
      desc: '召唤小鬼·自动追击敌人',
    },
    // ---- Evolved weapons (replaced via evolution system) ----
    sword_wind: {
      name: '疾风双刃', type: 'orbit', icon: 'weapons/sword_slash_wind',
      damage: 22, range: 90, rotateSpeed: 5.5, knockback: 80,
      pierce: 1, critChance: 0.12, critMult: 2.0,
      color: '#80ffd0', size: 32,
      desc: '进化·高速双刃环绕',
      evolved: true,
    },
    hammer_meteor: {
      name: '星陨重锤', type: 'orbit', icon: 'weapons/ring_fire_awakened',
      damage: 36, range: 80, rotateSpeed: 2.0, knockback: 200,
      pierce: 0, critChance: 0.08, critMult: 2.0, splash: 50,
      color: '#ff6020', size: 38,
      desc: '进化·大范围震荡重击',
      evolved: true,
    },
    soul_hunter: {
      name: '千魂追猎', type: 'homing', icon: 'weapons/ring_target',
      damage: 18, range: 350, cooldown: 0.8, projectileSpeed: 240,
      pierce: 3, critChance: 0.12, critMult: 2.2, homingStrength: 12,
      color: '#a0ff80', size: 22,
      desc: '进化·多弹追踪穿透',
      evolved: true,
      multiShot: 2, // fires 2 projectiles per volley
    },
  },

  // ---- Rarity system ----
  RARITY: {
    common:  { name: '普通', color: '#8a7a5a', glow: '#c4a87a' },
    rare:    { name: '稀有', color: '#4080ff', glow: '#60a0ff' },
    epic:    { name: '史诗', color: '#c060e0', glow: '#e080ff' },
  },

  // ---- Prop collision radii (0 = no collision) ----
  // Map prop category to collision radius in pixels. Props not listed here are non-solid.
  PROP_COLLISION: {
    trees: 16,       // dead trees - solid trunk
    tombstones: 12,  // tombstones - small obstacle
    fences: 10,      // broken fences - small obstacle
    barrels: 10,     // barrels - small obstacle
    braziers: 10,    // braziers - small obstacle
    ruins: 20,       // stone ruins - large obstacle
    houses: 24,      // shrines - large obstacle
    // Mine-specific props
    caves: 28,       // cave entrances - large obstacle
    campfires: 12,   // campfires - small obstacle
    spikes: 8,       // wooden spikes - small obstacle
    rocks: 14,       // rock piles - medium obstacle
    platforms: 16,   // wooden platforms - medium obstacle
    watchtowers: 24, // watchtowers - large obstacle
    furniture: 10,   // benches/shelves/workbenches - small obstacle
    stonework: 20,   // stone tables/foundations/monoliths - large obstacle
    bones: 14,       // bone piles - medium obstacle
    gallows: 18,     // wooden gallows - large obstacle
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
      rarity:'rare', weight:40, maxLevel:5, prerequisite:'crit',
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
      rarity:'epic', weight:18, maxLevel:3, prerequisite:'armor',
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

  // ---- Weapon evolutions (epic, triggered by chest when conditions met) ----
  // Each recipe requires a base weapon + a relic upgrade at sufficient level.
  // On evolution, the base weapon is replaced by the evolved weapon.
  WEAPON_EVOLUTIONS: [
    {
      id: 'evo_sword_wind',
      baseWeapon: 'sword',
      relic: 'attackspeed',    // upgrade id
      relicMinLevel: 3,        // need attackspeed Lv.3+
      resultWeapon: 'sword_wind',
      name: '武器进化: 疾风双刃',
      desc: '铁剑 + 攻速遗物Lv.3 → 疾风双刃 (高速双刃环绕)',
      icon: 'weapons/sword_slash_wind',
      rarity: 'epic',
    },
    {
      id: 'evo_hammer_meteor',
      baseWeapon: 'hammer',
      relic: 'range',
      relicMinLevel: 3,
      resultWeapon: 'hammer_meteor',
      name: '武器进化: 星陨重锤',
      desc: '战锤 + 范围遗物Lv.3 → 星陨重锤 (大范围震荡 splash)',
      icon: 'weapons/ring_fire_awakened',
      rarity: 'epic',
    },
    {
      id: 'evo_soul_hunter',
      baseWeapon: 'soul',
      relic: 'pierce',
      relicMinLevel: 2,
      resultWeapon: 'soul_hunter',
      name: '武器进化: 千魂追猎',
      desc: '灵魂弹 + 穿透遗物Lv.2 → 千魂追猎 (多弹追踪穿透)',
      icon: 'weapons/ring_target',
      rarity: 'epic',
    },
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
      color: '#6a4a8a', behavior: 'bat',
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
    // corrupted villager — low HP, spawns in groups, basic chase
    villager: {
      name: '腐化村民', sprite: 'enemies/bandit_hooded',
      hp: 14, speed: 45, damage: 5, xp: 2, radius: 14,
      color: '#7a6a4a', behavior: 'chase',
    },
    // wild dog — fast, periodically dashes toward player
    wild_dog: {
      name: '腐化猎犬', sprite: 'enemies/bear_armored',
      hp: 22, speed: 70, damage: 8, xp: 4, radius: 16,
      color: '#5a4a3a', behavior: 'dash',
    },
    // ranged
    archer: {
      name: '暗影弓手', sprite: 'enemies/archer',
      hp: 25, speed: 40, damage: 10, xp: 5, radius: 15,
      color: '#4a6a3a', behavior: 'ranged', shootRange: 250, shootCooldown: 2.0,
      projectileSpeed: 200, projectileColor: '#8acc4a',
    },
    // plague archer — ranged, poison projectiles, keeps distance
    plague_archer: {
      name: '瘟疫弓手', sprite: 'enemies/spearman',
      hp: 28, speed: 38, damage: 12, xp: 6, radius: 15,
      color: '#5a7a3a', behavior: 'ranged', shootRange: 240, shootCooldown: 2.2,
      projectileSpeed: 190, projectileColor: '#6acc4a',
    },
    // scarecrow — slow, high HP, explodes on death dealing area damage
    scarecrow: {
      name: '腐化稻草怪', sprite: 'enemies/torchbearer',
      hp: 60, speed: 25, damage: 8, xp: 8, radius: 20,
      color: '#8a6a2a', behavior: 'chase',
      deathExplosion: { radius: 85, damage: 25 },
    },
    mage: {
      name: '冰霜法师', sprite: 'enemies/dwarf_mage',
      hp: 30, speed: 35, damage: 14, xp: 7, radius: 15,
      color: '#4a6aaa', behavior: 'ranged', shootRange: 220, shootCooldown: 2.5,
      projectileSpeed: 160, projectileColor: '#78dcff',
      projectileSprite: 'effects/ice_shard_small',
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
    // elite scarecrow — cleave arc attack + summons regular scarecrows
    elite_scarecrow: {
      name: '腐化稻草人之王', sprite: 'enemies/dwarf_torchbearer',
      hp: 220, speed: 28, damage: 16, xp: 28, radius: 26,
      color: '#9a6a2a', behavior: 'eliteScarecrow', elite: true,
      cleaveRange: 120, cleaveDamage: 1.2, cleaveCooldown: 4.0, cleaveWindup: 0.6, cleaveArc: 1.6,
      summonCooldown: 8.0, summonCount: 2,
      deathExplosion: { radius: 100, damage: 30 },
    },
    // corrupted knight — high HP, defense, charge attack with telegraph
    corrupted_knight: {
      name: '腐化骑士', sprite: 'enemies/hooded_warrior',
      hp: 280, speed: 32, damage: 22, xp: 32, radius: 28,
      color: '#4a3a3a', behavior: 'knightCharge', elite: true,
      armor: 6, // flat damage reduction
      chargeCooldown: 5.0, chargeWindup: 0.8, chargeSpeed: 360, chargeDamage: 1.5,
      chargeDuration: 0.4,
    },
    // mimic — treasure chest monster with state machine
    mimic: {
      name: '宝箱怪', sprite: 'enemies/mimic_chest_red',
      hp: 100, speed: 35, damage: 18, xp: 15, radius: 22,
      color: '#aa6a3a', behavior: 'mimic', isMimic: true,
      // state machine params
      disguiseRange: 80,     // reveal when player within this distance
      revealDuration: 0.6,   // reveal animation time
      attackRange: 40,       // bite attack range
      attackCooldown: 1.5,   // between bite attacks
      attackDamage: 1.3,     // bite damage multiplier
      jumpRange: [60, 250],  // min/max distance to trigger jump attack
      jumpCooldown: 5.0,     // between jump attacks
      jumpWindup: 0.5,       // jump telegraph time
      jumpDuration: 0.35,    // jump travel time
      jumpSpeed: 4.0,        // jump speed multiplier (× enemy.speed)
      jumpDamage: 1.5,       // jump attack damage multiplier
      jumpRecover: 0.4,      // recovery after landing
      hurtDuration: 0.3,     // stagger duration when taking heavy hit
    },
    // boss — 无头骑士 (Headless Knight), two-phase boss
    boss: {
      name: '无头骑士', sprite: 'bosses/dark_knight_flame',
      hp: 1000, speed: 42, damage: 28, xp: 120, radius: 38,
      color: '#3a1a2a', behavior: 'boss',
      phases: 2, enrageHpPct: 0.5,
      shootRange: 320, shootCooldown: 1.8,
      projectileSpeed: 200, projectileColor: '#ff4030',
      projectileSprite: 'effects/fire_projectile',
      summonCooldown: 9, summonCount: 3,
      // phase-1 abilities (melee cleave / fan shot / charge)
      cleaveRange: 110, cleaveDamage: 1.1, cleaveCooldown: 4.0, cleaveWindup: 0.7, cleaveArc: 1.4,
      fanShotCooldown: 3.0, fanShotWindup: 0.6, fanShotCount: 5,
      chargeCooldown: 5.5, chargeWindup: 0.9, chargeSpeed: 380, chargeDamage: 1.4,
      // phase-2 abilities (orbiting weapons / sword throw / summon soldiers / ground hazards)
      orbitWeaponCooldown: 6.0, orbitWeaponCount: 3, orbitWeaponSpeed: 3.2, orbitWeaponDamage: 22,
      swordThrowCooldown: 5.0, swordThrowWindup: 0.8, swordThrowDamage: 1.3,
      soldierSummonCooldown: 8.0, soldierSummonCount: 2,
      hazardCooldown: 7.0, hazardRadius: 90, hazardDamage: 14, hazardDuration: 4.0,
      // ability cycle timer for phase-1 rotation
      abilityInterval: 1.2,
    },
    // level 2 enemies
    miner: {
      name: '腐化矿工', sprite: 'enemies/hooded_warrior',
      hp: 35, speed: 48, damage: 12, xp: 5, radius: 16,
      color: '#6a5a3a', behavior: 'chase',
    },
    rat: {
      name: '疫病鼠群', sprite: 'enemies/toxic_slime',
      hp: 12, speed: 90, damage: 6, xp: 2, radius: 12,
      color: '#8a6a3a', behavior: 'chase',
    },
    beetle: {
      name: '岩甲甲虫', sprite: 'enemies/bone_spider',
      hp: 40, speed: 55, damage: 10, xp: 5, radius: 18,
      color: '#5a4a2a', behavior: 'chase',
    },
    crystal: {
      name: '水晶法师', sprite: 'enemies/dwarf_mage',
      hp: 35, speed: 30, damage: 16, xp: 8, radius: 15,
      color: '#4a8aaa', behavior: 'ranged', shootRange: 240, shootCooldown: 2.0,
      projectileSpeed: 180, projectileColor: '#80e0ff',
      projectileSprite: 'effects/ice_orb',
    },
    // level 2 elite
    crusher: {
      name: '岩石粉碎者', sprite: 'enemies/fungal_golem',
      hp: 240, speed: 28, damage: 28, xp: 25, radius: 30,
      color: '#6a5a4a', behavior: 'chase', elite: true,
    },
    // level 2 boss
    bossSpider: {
      name: '腐化巨蛛', sprite: 'enemies/bone_spider',
      hp: 1200, speed: 50, damage: 35, xp: 150, radius: 42,
      color: '#4a2a3a', behavior: 'boss',
      phases: 3, enrageHpPct: 0.4,
      shootRange: 350, shootCooldown: 1.2,
      projectileSpeed: 220, projectileColor: '#c040c0',
      projectileSprite: 'effects/void_particle_small',
      summonCooldown: 6, summonCount: 4,
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
      enemyPool: ['slime','bat','skeleton','spider','boar','villager','scarecrow','wild_dog'],
      rangedPool: ['archer','mage','plague_archer'],
      elitePool: ['golem','reaper','elite_scarecrow','corrupted_knight'],
      eliteInterval: 90, // seconds — first elite at ~1.5min, then every 1.5min
      bossSpawnTime: 480,  // boss appears at 8 minutes
      bossId: 'boss',
      chestCount: 5,
      mimicChance: 0.4,
      // ---- Phased spawning (data-driven) ----
      phases: [
        { time: 0,   name: '初始骚扰',   enemyPool: ['villager','wild_dog','slime','bat'],                          rangedPool: [],             maxEnemies: 12, spawnInterval: 3.0, events: [] },
        { time: 120, name: '远程加入',   enemyPool: ['villager','wild_dog','slime','bat','spider'],                 rangedPool: ['archer'],     maxEnemies: 16, spawnInterval: 2.7, events: [{type:'chest', rare:false, mimic:false}, {type:'message', text:'弓手出现了！', color:'#ff8030'}] },
        { time: 240, name: '精英登场',   enemyPool: ['villager','wild_dog','slime','bat','spider','skeleton','scarecrow'],      rangedPool: ['archer','plague_archer'], maxEnemies: 20, spawnInterval: 2.4, events: [{type:'elite'}, {type:'chest', rare:false, mimic:true}] },
        { time: 360, name: '腐化加剧',   enemyPool: ['villager','wild_dog','slime','bat','spider','skeleton','boar','scarecrow'], rangedPool: ['archer','mage','plague_archer'], maxEnemies: 25, spawnInterval: 2.0, events: [{type:'elite'}, {type:'chest', rare:true, mimic:false}] },
        { time: 480, name: 'Boss降临',   enemyPool: [],                                       rangedPool: [],             maxEnemies: 0,  spawnInterval: 999, events: [{type:'boss'}] },
      ],
      props: {
        trees: ['props/tree_dead_gnarled_01'],
        tombstones: ['props/tombstone_single_rounded','props/tombstone_single_tall_ornate','props/tombstone_double_rounded'],
        fences: ['props/fence_wooden_broken_01'],
        barrels: ['props/barrel_wooden_single','props/barrels_wooden_group'],
        braziers: ['props/brazier_single_lit','props/brazier_double_lit','props/brazier_single_tall_lit'],
        ruins: ['props/stone_arch_broken','props/stone_pillars_01','props/stone_well_broken'],
        houses: ['props/shrine_stone_lit'],
        bones: ['props/bone_pile'],
        gallows: ['props/gallows_wooden'],
      },
      groundTiles: ['tiles/ground_dirt_grass_01','tiles/ground_dirt_stones_01','tiles/ground_dirt_path_01','tiles/ground_mossy_stone_01','tiles/ground_grass_strip_01'],
    },
    mine: {
      name: '地下矿洞',
      theme: 'mine',
      bgMusic: null,
      mapW: 36, mapH: 36,
      spawnInterval: 2.5,
      maxEnemies: 30,
      enemyPool: ['rat','miner','beetle','spider','skeleton'],
      rangedPool: ['crystal','archer'],
      elitePool: ['crusher','reaper','elite_scarecrow','corrupted_knight'],
      eliteInterval: 75,
      bossSpawnTime: 420,  // boss appears at 7 minutes
      bossId: 'bossSpider',
      chestCount: 6,
      mimicChance: 0.45,
      // ---- Phased spawning (data-driven) ----
      phases: [
        { time: 0,   name: '矿洞探索',   enemyPool: ['rat','beetle'],                          rangedPool: [],             maxEnemies: 14, spawnInterval: 2.5, events: [] },
        { time: 120, name: '水晶法师',   enemyPool: ['rat','beetle','miner'],                   rangedPool: ['crystal'],    maxEnemies: 18, spawnInterval: 2.2, events: [{type:'chest', rare:false, mimic:false}, {type:'message', text:'水晶法师出现了！', color:'#ff8030'}] },
        { time: 240, name: '腐化蔓延',   enemyPool: ['rat','beetle','miner','spider'],          rangedPool: ['crystal'],    maxEnemies: 22, spawnInterval: 2.0, events: [{type:'elite'}, {type:'chest', rare:false, mimic:true}] },
        { time: 360, name: '深渊回响',   enemyPool: ['rat','beetle','miner','spider','skeleton'], rangedPool: ['crystal','archer'], maxEnemies: 30, spawnInterval: 1.6, events: [{type:'elite'}, {type:'chest', rare:true, mimic:false}] },
        { time: 420, name: 'Boss降临',   enemyPool: [],                                         rangedPool: [],             maxEnemies: 0,  spawnInterval: 999, events: [{type:'boss'}] },
      ],
      props: {
        // Mine-themed props using previously unused assets
        caves: ['props/cave_entrance_lit'],
        campfires: ['props/campfire_burnt','props/brazier_small_lit'],
        spikes: ['props/wooden_spikes_01'],
        rocks: ['props/rocks_small_pile','props/rock_mossy_01','props/stone_fragment_01'],
        platforms: ['props/wooden_platform_01'],
        watchtowers: ['props/watchtower_wooden_lit'],
        furniture: ['props/wooden_bench_broken','props/wooden_shelf_rack','props/wooden_workbench'],
        stonework: ['props/stone_table_01','props/stone_foundation_01','props/stone_monolith_01','props/stone_fireplace','props/stone_wall_doorway','props/ruin_tree_stone_base'],
        bones: ['props/bone_pile'],
        // Reuse some shared props
        barrels: ['props/barrel_wooden_single','props/barrels_wooden_group'],
        braziers: ['props/brazier_single_lit','props/brazier_double_lit','props/brazier_single_tall_lit'],
        ruins: ['props/stone_arch_broken','props/stone_pillars_01','props/stone_pillars_02','props/stone_well_broken'],
        houses: ['props/shrine_stone_lit'],
      },
      groundTiles: ['tiles/ground_dirt_stones_01','tiles/ground_mossy_stone_01','tiles/ground_dirt_path_01','tiles/ground_dirt_large_01','tiles/ground_dirt_patch_01','tiles/ground_dirt_edge_01','tiles/ground_mossy_patch_01'],
      // Mine-specific wall tiles for cave border and interior wall segments
      wallTiles: ['tiles/wall_stone_stacked_01','tiles/wall_stone_horizontal_01','tiles/wall_stone_gapped_01','tiles/wall_stone_base_mossy','tiles/wall_stone_brick_vertical','tiles/ruin_stone_wall_broken_01','tiles/ruin_stone_wall_broken_02'],
      // Ground decoration overlays (drawn on top of ground tiles)
      groundDecorations: ['effects/ground_crack','effects/ice_spikes_vertical'],
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
        { speaker: '无头骑士', text: '这把剑的诅咒，正是我赋予的！头颅又算什么……' },
        { speaker: '旅者', text: '你就是诅咒的源头？受死吧！' },
      ],
      victory: [
        { speaker: '旅者', text: '诅咒……消散了一些，但并未根除。' },
        { speaker: '旁白', text: '骑士倒下了，但他提到诅咒来自更深处……' },
        { speaker: '旅者', text: '地下矿洞，或许藏着真正的答案。' },
      ],
    },
    mine: {
      intro: [
        { speaker: '旁白', text: '幽暗的矿洞深处，空气中弥漫着腐朽的气息……' },
        { speaker: '旅者', text: '这里的诅咒浓度远超村庄。' },
        { speaker: '旅者', text: '那些矿工……已经被腐化成了怪物。' },
        { speaker: '旁白', text: '深入矿洞，找到诅咒真正的源头。' },
      ],
      bossIntro: [
        { speaker: '???', text: '嘶嘶嘶……又有猎物送上门了……' },
        { speaker: '腐化巨蛛', text: '我的蛛网遍布整个矿洞，你逃不掉的！' },
        { speaker: '旅者', text: '一只巨大的腐化蜘蛛？来吧！' },
      ],
      victory: [
        { speaker: '旅者', text: '终于……结束了。' },
        { speaker: '旁白', text: '巨蛛倒下了，矿洞中的腐化气息开始消退。' },
        { speaker: '旅者', text: '诅咒的源头已被根除，村庄终于安全了。' },
        { speaker: '旁白', text: '旅者带着环刀，踏上了新的旅途……' },
      ],
    },
    // Triggered on first mimic encounter (any level)
    mimicEncounter: [
      { speaker: '旁白', text: '那个宝箱……似乎有些不对劲。' },
      { speaker: '旅者', text: '等等，它在动！' },
      { speaker: '宝箱怪', text: '嗷——！想拿宝物？先成为我的养分吧！' },
      { speaker: '旅者', text: '是宝箱怪！小心应对！' },
    ],
  },
};
