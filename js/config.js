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
      name: '铁剑', type: 'orbit', icon: 'weapons/ring_steel',
      damage: 16, range: 75, rotateSpeed: 2.8, knockback: 100,
      pierce: 0, critChance: 0.05, critMult: 2.0,
      color: '#c8c8d0', size: 48,
      desc: '环绕近战·基础均衡',
    },
    hammer: {
      name: '战锤', type: 'orbit', icon: 'weapons/ring_fire_awakened',
      damage: 24, range: 60, rotateSpeed: 1.6, knockback: 160,
      pierce: 0, critChance: 0.05, critMult: 2.0,
      color: '#a0a0b0', size: 56,
      desc: '环绕近战·高伤慢速',
    },
    scythe: {
      name: '镰刀', type: 'orbit', icon: 'weapons/sword_slash_wind',
      damage: 10, range: 85, rotateSpeed: 3.0, knockback: 40,
      pierce: 3, critChance: 0.08, critMult: 2.0,
      color: '#d0d0e0', size: 52,
      desc: '环绕近战·穿透大范围',
    },
    bow: {
      name: '弓箭', type: 'ranged', icon: 'weapons/sword_slash_wind',
      damage: 10, range: 320, cooldown: 1.0, projectileSpeed: 300,
      pierce: 1, critChance: 0.1, critMult: 2.0,
      color: '#d4a850', size: 40,
      desc: '远程发射·直线穿透',
    },
    fireball: {
      name: '火球', type: 'ranged', icon: 'weapons/ring_fire',
      damage: 18, range: 280, cooldown: 1.4, projectileSpeed: 220,
      pierce: 0, critChance: 0.05, critMult: 2.0, splash: 40,
      color: '#ff8030', size: 44,
      projectileSprite: 'effects/fire_projectile',
      desc: '远程发射·范围爆炸',
    },
    knife: {
      name: '飞刀', type: 'ranged', icon: 'weapons/sword_slash_wind',
      damage: 6, range: 260, cooldown: 0.35, projectileSpeed: 400,
      pierce: 0, critChance: 0.15, critMult: 2.5,
      color: '#c0c0d0', size: 32,
      desc: '远程发射·高频低伤',
    },
    soul: {
      name: '灵魂弹', type: 'homing', icon: 'weapons/ring_void',
      damage: 14, range: 300, cooldown: 1.2, projectileSpeed: 180,
      pierce: 0, critChance: 0.08, critMult: 2.0, homingStrength: 8,
      color: '#78dcff', size: 44,
      projectileSprite: 'effects/spirit_orbs_blue',
      desc: '自动追踪·灵能制导',
    },
    shield: {
      name: '盾牌', type: 'orbit', icon: 'weapons/ring_target',
      damage: 5, range: 55, rotateSpeed: 1.2, knockback: 120,
      pierce: 0, critChance: 0.0, critMult: 1.5,
      color: '#7896c8', size: 52,
      blockReduction: 0.3,
      desc: '防御辅助·减伤格挡',
    },
    ring_fire: {
      name: '炎之环刃', type: 'orbit', icon: 'weapons/ring_fire',
      damage: 16, range: 80, rotateSpeed: 2.8, knockback: 60,
      pierce: 2, critChance: 0.1, critMult: 2.0,
      color: '#ff6020', size: 48,
      desc: '诅咒环刃·火焰穿透',
    },
    ring_void: {
      name: '虚空环刃', type: 'orbit', icon: 'weapons/ring_void',
      damage: 14, range: 90, rotateSpeed: 3.5, knockback: 30,
      pierce: 5, critChance: 0.12, critMult: 2.2,
      color: '#a040c0', size: 48,
      desc: '诅咒环刃·虚空多穿',
    },
    holy_cross: {
      name: '圣光十字', type: 'projectile', icon: 'weapons/ring_steel',
      damage: 12, range: 280, cooldown: 0.8, projectileSpeed: 280,
      pierce: 1, critChance: 0.08, critMult: 2.0,
      color: '#ffe8a0', size: 44,
      projectileCount: 4,
      desc: '旋转弹幕·十字方向发射',
    },
    poison_aura: {
      name: '剧毒光环', type: 'aura', icon: 'weapons/ring_fire_double',
      damage: 5, range: 90, cooldown: 0.5,
      pierce: 0, critChance: 0.05, critMult: 2.0,
      color: '#60c040', size: 48,
      desc: '持续光环·范围毒伤',
    },
    shadow_imp: {
      name: '暗影小鬼', type: 'summon', icon: 'weapons/ring_void',
      damage: 8, range: 300, cooldown: 3.0, projectileSpeed: 100,
      pierce: 0, critChance: 0.0, critMult: 1.5,
      color: '#8040a0', size: 40,
      summonCount: 1,
      summonLifetime: 8,
      desc: '召唤小鬼·自动追击敌人',
    },
    // ---- New weapons (using previously unused + new sprite assets) ----
    ring_steel: {
      name: '钢铁环刃', type: 'orbit', icon: 'weapons/ring_steel',
      damage: 14, range: 85, rotateSpeed: 3.2, knockback: 55,
      pierce: 1, critChance: 0.07, critMult: 2.0,
      color: '#a0a8b0', size: 30,
      desc: '钢铁环刃·穿透均衡',
    },
    ring_fire_double: {
      name: '双炎环刃', type: 'orbit', icon: 'weapons/ring_fire_double',
      damage: 18, range: 95, rotateSpeed: 2.6, knockback: 45,
      pierce: 2, critChance: 0.08, critMult: 2.0, splash: 35,
      color: '#ff5020', size: 34,
      desc: '双炎环刃·穿透溅射',
    },
    torch_skull_fire: {
      name: '骷髅火把', type: 'aura', icon: 'weapons/torch_skull_fire',
      damage: 8, range: 100, cooldown: 0.4,
      pierce: 0, critChance: 0.05, critMult: 2.0,
      color: '#ff7030', size: 24,
      desc: '骷髅火把·灼热光环',
    },
    crossbow_compact: {
      name: '精钢连弩', type: 'ranged', icon: 'weapons/crossbow_compact',
      damage: 9, range: 300, cooldown: 0.5, projectileSpeed: 380,
      pierce: 2, critChance: 0.12, critMult: 2.0,
      color: '#a0b0c0', size: 20,
      desc: '精钢连弩·高频穿透',
    },
    spellbook_burning: {
      name: '燃烧法典', type: 'ranged', icon: 'weapons/spellbook_burning',
      damage: 20, range: 260, cooldown: 1.6, projectileSpeed: 200,
      pierce: 0, critChance: 0.05, critMult: 2.0, splash: 50,
      color: '#ff6020', size: 24,
      projectileSprite: 'effects/fire_projectile',
      desc: '燃烧法典·大范围爆炸',
    },
    flamethrower_skull: {
      name: '骷髅喷火器', type: 'aura', icon: 'weapons/flamethrower_skull',
      damage: 6, range: 120, cooldown: 0.3,
      pierce: 0, critChance: 0.05, critMult: 2.0,
      color: '#ff8030', size: 24,
      desc: '骷髅喷火器·近身灼烧',
    },
    dagger_fire_ring: {
      name: '炎环匕首', type: 'orbit', icon: 'weapons/dagger_fire_ring',
      damage: 8, range: 70, rotateSpeed: 4.5, knockback: 30,
      pierce: 0, critChance: 0.20, critMult: 2.5,
      color: '#ff9040', size: 26,
      desc: '炎环匕首·高速暴击',
    },
    war_hammer_double: {
      name: '双面战锤', type: 'orbit', icon: 'weapons/war_hammer_double',
      damage: 28, range: 65, rotateSpeed: 1.4, knockback: 180,
      pierce: 0, critChance: 0.05, critMult: 2.0, splash: 30,
      color: '#9098a0', size: 34,
      desc: '双面战锤·重击震荡',
    },
    shield_round_buckler: {
      name: '圆木盾', type: 'orbit', icon: 'weapons/shield_round_buckler',
      damage: 4, range: 50, rotateSpeed: 1.0, knockback: 80,
      pierce: 0, critChance: 0.0, critMult: 1.5,
      color: '#8a6030', size: 32,
      blockReduction: 0.4,
      desc: '圆木盾·高减伤格挡',
    },
    spear_triple_energy: {
      name: '三叉能量矛', type: 'projectile', icon: 'weapons/spear_triple_energy',
      damage: 14, range: 300, cooldown: 0.9, projectileSpeed: 300,
      pierce: 2, critChance: 0.08, critMult: 2.0,
      color: '#40d0ff', size: 22,
      projectileCount: 3,
      desc: '三叉能量矛·三向穿透',
    },
    poison_sprayer: {
      name: '毒雾喷射', type: 'aura', icon: 'weapons/poison_sprayer',
      damage: 4, range: 130, cooldown: 0.4,
      pierce: 0, critChance: 0.05, critMult: 2.0,
      color: '#60c040', size: 24,
      desc: '毒雾喷射·大范围持续毒伤',
    },
    crystal_weapon: {
      name: '晶能法杖', type: 'homing', icon: 'weapons/crystal_weapon',
      damage: 16, range: 320, cooldown: 1.0, projectileSpeed: 220,
      pierce: 1, critChance: 0.1, critMult: 2.0, homingStrength: 10,
      color: '#40b0ff', size: 22,
      projectileSprite: 'effects/ice_orb',
      desc: '晶能法杖·追踪穿透',
    },
    torch_classic: {
      name: '经典火把', type: 'aura', icon: 'weapons/torch_classic',
      damage: 6, range: 85, cooldown: 0.4,
      pierce: 0, critChance: 0.05, critMult: 2.0,
      color: '#ff9040', size: 24,
      desc: '经典火把·灼热光环',
    },
    fire_cannon: {
      name: '火焰炮', type: 'ranged', icon: 'weapons/fire_cannon',
      damage: 22, range: 300, cooldown: 1.8, projectileSpeed: 180,
      pierce: 0, critChance: 0.05, critMult: 2.0, splash: 55,
      color: '#ff5020', size: 28,
      projectileSprite: 'effects/fire_projectile',
      desc: '火焰炮·大范围爆炸',
    },
    wand_arcane: {
      name: '奥术之杖', type: 'homing', icon: 'weapons/wand_arcane_blue',
      damage: 12, range: 340, cooldown: 0.9, projectileSpeed: 200,
      pierce: 2, critChance: 0.1, critMult: 2.0, homingStrength: 6,
      color: '#6080ff', size: 22,
      projectileSprite: 'effects/spirit_orbs_blue',
      desc: '奥术之杖·追踪穿透',
    },
    ballista: {
      name: '重型弩炮', type: 'ranged', icon: 'weapons/ballista_heavy',
      damage: 28, range: 350, cooldown: 2.0, projectileSpeed: 320,
      pierce: 3, critChance: 0.08, critMult: 2.0,
      color: '#a08060', size: 26,
      desc: '重型弩炮·远程穿透',
    },
    flail: {
      name: '荆棘链锤', type: 'orbit', icon: 'weapons/flail_spiked_single',
      damage: 20, range: 90, rotateSpeed: 2.2, knockback: 140,
      pierce: 0, critChance: 0.06, critMult: 2.0,
      color: '#806040', size: 52,
      desc: '荆棘链锤·高伤击退',
    },
    mace_fire: {
      name: '烈焰钉锤', type: 'orbit', icon: 'weapons/mace_spiked_fire',
      damage: 22, range: 75, rotateSpeed: 2.4, knockback: 120,
      pierce: 1, critChance: 0.08, critMult: 2.0, splash: 25,
      color: '#ff6030', size: 48,
      desc: '烈焰钉锤·穿透溅射',
    },
    axe: {
      name: '巨斧', type: 'orbit', icon: 'weapons/axe_single_right',
      damage: 30, range: 70, rotateSpeed: 1.8, knockback: 200,
      pierce: 0, critChance: 0.06, critMult: 2.5,
      color: '#a0a0a0', size: 56,
      desc: '巨斧·超高击退暴击',
    },
    blade_dual: {
      name: '双能刃', type: 'projectile', icon: 'weapons/blade_dual_energy',
      damage: 10, range: 300, cooldown: 0.6, projectileSpeed: 260,
      pierce: 1, critChance: 0.12, critMult: 2.0,
      color: '#40d0ff', size: 24,
      projectileCount: 2,
      desc: '双能刃·双弹发射',
    },
    poison_cannon: {
      name: '毒液炮', type: 'ranged', icon: 'weapons/poison_cannon',
      damage: 15, range: 280, cooldown: 1.5, projectileSpeed: 200,
      pierce: 0, critChance: 0.05, critMult: 2.0, splash: 45,
      color: '#60c040', size: 26,
      desc: '毒液炮·范围毒伤爆炸',
    },
    void_blade: {
      name: '虚空之刃', type: 'orbit', icon: 'weapons/void_weapon',
      damage: 18, range: 100, rotateSpeed: 3.8, knockback: 40,
      pierce: 4, critChance: 0.14, critMult: 2.2,
      color: '#8040c0', size: 46,
      desc: '虚空之刃·超远多穿',
    },
    // ---- Evolved weapons (replaced via evolution system) ----
    sword_wind: {
      name: '疾风双刃', type: 'orbit', icon: 'weapons/sword_slash_wind',
      damage: 22, range: 90, rotateSpeed: 5.5, knockback: 80,
      pierce: 1, critChance: 0.12, critMult: 2.0,
      color: '#80ffd0', size: 48,
      desc: '进化·高速双刃环绕',
      evolved: true,
    },
    hammer_meteor: {
      name: '星陨重锤', type: 'orbit', icon: 'weapons/ring_fire_awakened',
      damage: 36, range: 80, rotateSpeed: 2.0, knockback: 200,
      pierce: 0, critChance: 0.08, critMult: 2.0, splash: 50,
      color: '#ff6020', size: 56,
      desc: '进化·大范围震荡重击',
      evolved: true,
    },
    soul_hunter: {
      name: '千魂追猎', type: 'homing', icon: 'weapons/ring_target',
      damage: 18, range: 350, cooldown: 0.8, projectileSpeed: 240,
      pierce: 3, critChance: 0.12, critMult: 2.2, homingStrength: 12,
      color: '#a0ff80', size: 44,
      desc: '进化·多弹追踪穿透',
      evolved: true,
      multiShot: 2,
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
    { weaponId:'hammer',  name:'获得武器: 战锤', icon:'weapons/ring_fire_awakened', rarity:'rare' },
    { weaponId:'scythe',  name:'获得武器: 镰刀', icon:'weapons/sword_slash_wind',   rarity:'rare' },
    { weaponId:'bow',     name:'获得武器: 弓箭', icon:'weapons/sword_slash_wind',   rarity:'rare' },
    { weaponId:'fireball',name:'获得武器: 火球', icon:'weapons/ring_fire',          rarity:'rare' },
    { weaponId:'knife',   name:'获得武器: 飞刀', icon:'weapons/sword_slash_wind',   rarity:'rare' },
    { weaponId:'soul',    name:'获得武器: 灵魂弹', icon:'weapons/ring_void',        rarity:'rare' },
    { weaponId:'shield',  name:'获得武器: 盾牌', icon:'weapons/ring_target',        rarity:'rare' },
    { weaponId:'ring_fire',name:'获得武器: 炎之环刃', icon:'weapons/ring_fire', rarity:'epic' },
    { weaponId:'ring_void',name:'获得武器: 虚空环刃', icon:'weapons/ring_void', rarity:'epic' },
    { weaponId:'ring_steel',name:'获得武器: 钢铁环刃', icon:'weapons/ring_steel', rarity:'rare' },
    { weaponId:'ring_fire_double',name:'获得武器: 双炎环刃', icon:'weapons/ring_fire_double', rarity:'epic' },
    { weaponId:'torch_skull_fire',name:'获得武器: 骷髅火把', icon:'weapons/torch_skull_fire', rarity:'rare' },
    { weaponId:'crossbow_compact',name:'获得武器: 精钢连弩', icon:'weapons/crossbow_compact', rarity:'rare' },
    { weaponId:'spellbook_burning',name:'获得武器: 燃烧法典', icon:'weapons/spellbook_burning', rarity:'rare' },
    { weaponId:'flamethrower_skull',name:'获得武器: 骷髅喷火器', icon:'weapons/flamethrower_skull', rarity:'rare' },
    { weaponId:'dagger_fire_ring',name:'获得武器: 炎环匕首', icon:'weapons/dagger_fire_ring', rarity:'rare' },
    { weaponId:'war_hammer_double',name:'获得武器: 双面战锤', icon:'weapons/war_hammer_double', rarity:'rare' },
    { weaponId:'shield_round_buckler',name:'获得武器: 圆木盾', icon:'weapons/shield_round_buckler', rarity:'rare' },
    { weaponId:'spear_triple_energy',name:'获得武器: 三叉能量矛', icon:'weapons/spear_triple_energy', rarity:'rare' },
    { weaponId:'poison_sprayer',name:'获得武器: 毒雾喷射', icon:'weapons/poison_sprayer', rarity:'rare' },
    { weaponId:'crystal_weapon',name:'获得武器: 晶能法杖', icon:'weapons/crystal_weapon', rarity:'epic' },
    { weaponId:'torch_classic',name:'获得武器: 经典火把', icon:'weapons/torch_classic', rarity:'rare' },
    { weaponId:'fire_cannon',name:'获得武器: 火焰炮', icon:'weapons/fire_cannon', rarity:'epic' },
    { weaponId:'wand_arcane',name:'获得武器: 奥术之杖', icon:'weapons/wand_arcane_blue', rarity:'rare' },
    { weaponId:'ballista',name:'获得武器: 重型弩炮', icon:'weapons/ballista_heavy', rarity:'epic' },
    { weaponId:'flail',name:'获得武器: 荆棘链锤', icon:'weapons/flail_spiked_single', rarity:'rare' },
    { weaponId:'mace_fire',name:'获得武器: 烈焰钉锤', icon:'weapons/mace_spiked_fire', rarity:'rare' },
    { weaponId:'axe',name:'获得武器: 巨斧', icon:'weapons/axe_single_right', rarity:'epic' },
    { weaponId:'blade_dual',name:'获得武器: 双能刃', icon:'weapons/blade_dual_energy', rarity:'rare' },
    { weaponId:'poison_cannon',name:'获得武器: 毒液炮', icon:'weapons/poison_cannon', rarity:'rare' },
    { weaponId:'void_blade',name:'获得武器: 虚空之刃', icon:'weapons/void_weapon', rarity:'epic' },
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
    // ---- Level 3: Hell enemies ----
    imp: {
      name: '地狱小鬼', sprite: 'enemies/enemy_new_04',
      hp: 16, speed: 85, damage: 7, xp: 3, radius: 12,
      color: '#c04030', behavior: 'chase',
    },
    hellhound: {
      name: '地狱犬', sprite: 'enemies/flame_turtle',
      hp: 30, speed: 70, damage: 10, xp: 5, radius: 18,
      color: '#ff6020', behavior: 'dash',
    },
    demon_soldier: {
      name: '恶魔士兵', sprite: 'enemies/enemy_new_00',
      hp: 50, speed: 45, damage: 14, xp: 7, radius: 18,
      color: '#6a2a2a', behavior: 'chase',
    },
    lava_archer: {
      name: '熔岩射手', sprite: 'enemies/enemy_new_01',
      hp: 32, speed: 35, damage: 16, xp: 7, radius: 15,
      color: '#ff8030', behavior: 'ranged', shootRange: 260, shootCooldown: 1.8,
      projectileSpeed: 210, projectileColor: '#ff6020',
      projectileSprite: 'effects/fire_projectile',
    },
    succubus: {
      name: '魅魔', sprite: 'enemies/enemy_new_02',
      hp: 38, speed: 55, damage: 12, xp: 6, radius: 16,
      color: '#c040a0', behavior: 'ranged', shootRange: 200, shootCooldown: 2.5,
      projectileSpeed: 160, projectileColor: '#ff60c0',
    },
    hell_guard: {
      name: '地狱守卫', sprite: 'enemies/enemy_new_03',
      hp: 200, speed: 30, damage: 30, xp: 30, radius: 30,
      color: '#3a1a1a', behavior: 'chase', elite: true,
      armor: 4,
    },
    flame_mage: {
      name: '炎魔', sprite: 'enemies/reaper_with_minion',
      hp: 160, speed: 38, damage: 28, xp: 28, radius: 26,
      color: '#ff4020', behavior: 'ranged', shootRange: 240, shootCooldown: 1.5,
      projectileSpeed: 180, projectileColor: '#ff4020', elite: true,
      projectileSprite: 'effects/fire_projectile',
    },
    // Level 3 Boss — 地狱炎龙 (Hell Dragon)
    bossDragon: {
      name: '地狱炎龙', sprite: 'bosses/dark_knight_flame',
      hp: 1800, speed: 38, damage: 40, xp: 200, radius: 48,
      color: '#ff3020', behavior: 'boss',
      phases: 3, enrageHpPct: 0.33,
      shootRange: 380, shootCooldown: 1.0,
      projectileSpeed: 240, projectileColor: '#ff4020',
      projectileSprite: 'effects/fire_projectile',
      summonCooldown: 8, summonCount: 3,
      cleaveRange: 140, cleaveDamage: 1.2, cleaveCooldown: 3.5, cleaveWindup: 0.6, cleaveArc: 1.8,
      fanShotCooldown: 2.5, fanShotWindup: 0.5, fanShotCount: 7,
      chargeCooldown: 6.0, chargeWindup: 1.0, chargeSpeed: 400, chargeDamage: 1.6,
      orbitWeaponCooldown: 5.0, orbitWeaponCount: 4, orbitWeaponSpeed: 4.0, orbitWeaponDamage: 28,
      swordThrowCooldown: 4.0, swordThrowWindup: 0.7, swordThrowDamage: 1.5,
      soldierSummonCooldown: 7.0, soldierSummonCount: 3,
      hazardCooldown: 6.0, hazardRadius: 100, hazardDamage: 18, hazardDuration: 5.0,
      abilityInterval: 1.0,
    },
  },

  // ---- Level 1: Abandoned Village ----
  LEVELS: {
    village: {
      name: '荒废村庄',
      theme: 'village',
      bgMusic: null,
      sceneBgs: ['backgrounds/scene_crypt_graveyard_upper','backgrounds/scene_crypt_scene_graveyard','backgrounds/scene_crypt_tomb_area'],
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
      groundTiles: ['tiles/ground_dirt_grass_01','tiles/ground_grass_strip_01','tiles/ground_dirt_path_01','tiles/ground_dirt_patch_01','tiles/ground_dirt_edge_01'],
      // Village border walls (ruined stone walls fitting the graveyard theme)
      wallTiles: ['tiles/ruin_stone_wall_broken_01','tiles/ruin_stone_wall_broken_02','tiles/wall_stone_gapped_01'],
    },
    mine: {
      name: '地下矿洞',
      theme: 'mine',
      bgMusic: null,
      sceneBgs: ['backgrounds/scene_crystal_mine_entrance','backgrounds/scene_crystal_cave_chamber','backgrounds/scene_crystal_crystal_cavern'],
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
      groundTiles: ['tiles/ground_mossy_stone_01','tiles/ground_dirt_large_01','tiles/ground_mossy_patch_01','tiles/ground_dirt_stones_01','tiles/ground_dirt_edge_01'],
      // Mine-specific wall tiles for cave border and interior wall segments
      wallTiles: ['tiles/wall_stone_stacked_01','tiles/wall_stone_horizontal_01','tiles/wall_stone_gapped_01','tiles/wall_stone_base_mossy','tiles/wall_stone_brick_vertical','tiles/ruin_stone_wall_broken_01','tiles/ruin_stone_wall_broken_02'],
      // Ground decoration overlays (drawn on top of ground tiles)
      groundDecorations: ['effects/ground_crack','effects/ice_spikes_vertical'],
    },
    hell: {
      name: '地狱熔渊',
      theme: 'hell',
      bgMusic: null,
      sceneBgs: ['backgrounds/scene_hell_forge_area','backgrounds/scene_hell_column_hall','backgrounds/scene_hell_lava_pool'],
      mapW: 38, mapH: 38,
      spawnInterval: 2.0,
      maxEnemies: 35,
      enemyPool: ['imp','hellhound','demon_soldier','succubus','lava_archer'],
      rangedPool: ['lava_archer','succubus','flame_mage'],
      elitePool: ['hell_guard','flame_mage','reaper','corrupted_knight'],
      eliteInterval: 60,
      bossSpawnTime: 540,  // boss appears at 9 minutes
      bossId: 'bossDragon',
      chestCount: 8,
      mimicChance: 0.5,
      phases: [
        { time: 0,   name: '地狱边境',   enemyPool: ['imp','hellhound'],                     rangedPool: [],             maxEnemies: 16, spawnInterval: 2.0, events: [] },
        { time: 90,  name: '恶魔军团',   enemyPool: ['imp','hellhound','demon_soldier'],      rangedPool: ['lava_archer'], maxEnemies: 20, spawnInterval: 1.8, events: [{type:'chest', rare:false, mimic:false}, {type:'message', text:'恶魔士兵出现了！', color:'#ff4020'}] },
        { time: 180, name: '魅魔之歌',   enemyPool: ['imp','hellhound','demon_soldier','succubus'], rangedPool: ['lava_archer','succubus'], maxEnemies: 25, spawnInterval: 1.6, events: [{type:'elite'}, {type:'chest', rare:false, mimic:true}] },
        { time: 300, name: '炎魔降临',   enemyPool: ['imp','hellhound','demon_soldier','succubus','lava_archer'], rangedPool: ['lava_archer','succubus','flame_mage'], maxEnemies: 30, spawnInterval: 1.4, events: [{type:'elite'}, {type:'chest', rare:true, mimic:false}] },
        { time: 420, name: '深渊集结',   enemyPool: ['demon_soldier','succubus','lava_archer'], rangedPool: ['lava_archer','succubus','flame_mage'], maxEnemies: 35, spawnInterval: 1.2, events: [{type:'elite'}, {type:'elite'}, {type:'chest', rare:true, mimic:true}] },
        { time: 540, name: 'Boss降临',   enemyPool: [],                                       rangedPool: [],             maxEnemies: 0,  spawnInterval: 999, events: [{type:'boss'}] },
      ],
      props: {
        spikes: ['props/wooden_spikes_01'],
        rocks: ['props/rocks_small_pile','props/rock_mossy_01','props/stone_fragment_01'],
        bones: ['props/bone_pile'],
        campfires: ['props/campfire_burnt','props/brazier_small_lit'],
        braziers: ['props/brazier_single_lit','props/brazier_double_lit','props/brazier_single_tall_lit'],
        ruins: ['props/stone_arch_broken','props/stone_pillars_01','props/stone_pillars_02'],
        houses: ['props/shrine_stone_lit'],
        stonework: ['props/stone_table_01','props/stone_fireplace','props/stone_monolith_01','props/stone_wall_doorway'],
        barrels: ['props/barrel_wooden_single'],
        platforms: ['props/wooden_platform_01'],
        watchtowers: ['props/watchtower_wooden_lit'],
        furniture: ['props/wooden_bench_broken','props/wooden_shelf_rack'],
      },
      groundTiles: ['tiles/ground_dirt_large_01','tiles/ground_dirt_patch_01','tiles/ground_dirt_edge_01','tiles/ground_dirt_stones_01','tiles/ruin_stone_wall_broken_01','tiles/wall_stone_gapped_01'],
      wallTiles: ['tiles/wall_stone_stacked_01','tiles/wall_stone_horizontal_01','tiles/wall_stone_base_mossy','tiles/wall_stone_brick_vertical','tiles/ruin_stone_wall_broken_02'],
      groundDecorations: ['effects/ground_crack','effects/fire_projectile'],
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
        { speaker: '旅者', text: '巨蛛倒下了……但诅咒并未消失。' },
        { speaker: '旁白', text: '蛛网深处，一道灼热的裂缝隐隐发光……' },
        { speaker: '旅者', text: '真正的源头，还在更深处。' },
        { speaker: '旁白', text: '旅者握紧环刀，踏入了裂缝之中……' },
      ],
    },
    hell: {
      intro: [
        { speaker: '旁白', text: '矿洞深处隐藏的通道……通向一片炽热的地狱。' },
        { speaker: '旅者', text: '这就是诅咒真正的源头吗？空气中全是硫磺的气息。' },
        { speaker: '旅者', text: '环刀在剧烈震动，仿佛在渴望着什么……' },
        { speaker: '旁白', text: '踏过熔岩与烈焰，找到诅咒的最终源头。' },
      ],
      bossIntro: [
        { speaker: '???', text: '吼——！渺小的人类竟敢闯入我的领域！' },
        { speaker: '地狱炎龙', text: '诅咒之力滋养了我，你是来送死的吗？' },
        { speaker: '旅者', text: '炎龙……这就是诅咒的终极形态。' },
        { speaker: '旅者', text: '环刀啊，让我们一起终结这一切！' },
      ],
      victory: [
        { speaker: '旅者', text: '诅咒……终于彻底消散了。' },
        { speaker: '旁白', text: '炎龙倒下，地狱之门缓缓关闭。' },
        { speaker: '旅者', text: '环刀恢复了原本的光芒，旅程结束了。' },
        { speaker: '旁白', text: '旅者带着平静的心情，踏上了归途……' },
        { speaker: '旁白', text: '环刀旅者，传说就此落幕。' },
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
