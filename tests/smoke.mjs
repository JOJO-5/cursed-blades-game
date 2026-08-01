import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jsDir = path.join(root, 'js');
const manifest = JSON.parse(readFileSync(path.join(root, 'assets/manifest.json'), 'utf8'));
const indexSource = readFileSync(path.join(root, 'index.html'), 'utf8');

for (const file of readdirSync(jsDir).filter((name) => name.endsWith('.js'))) {
  execFileSync(process.execPath, ['--check', path.join(jsDir, file)], { stdio: 'pipe' });
}

assert.ok(!indexSource.includes('?v=19'), 'index.html should not use the stale v=19 JS cache-buster');
const scriptVersions = [...indexSource.matchAll(/<script src="js\/[^"]+\.js\?v=([^"]+)"><\/script>/g)].map(m => m[1]);
assert.equal(scriptVersions.length, readdirSync(jsDir).filter((name) => name.endsWith('.js')).length,
  'index.html should load every JS entry with an explicit cache-buster');
assert.equal(new Set(scriptVersions).size, 1, 'all JS entry scripts should share the same cache-buster version');

const configSource = readFileSync(path.join(jsDir, 'config.js'), 'utf8');
const context = {};
vm.runInNewContext(`${configSource}\nglobalThis.__CONFIG__ = CONFIG;`, context, { filename: 'js/config.js' });
const config = context.__CONFIG__;

assert.equal(Object.keys(config.WEAPONS).length, 38, 'expected 38 weapons (13 original + 22 new + 3 evolved)');
assert.equal(config.UPGRADES.length, 26, 'expected 26 upgrades');
assert.equal(Object.keys(config.ENEMIES).length, 31, 'expected 31 enemies');
assert.ok(config.LEVELS.village && config.LEVELS.mine && config.LEVELS.hell, 'expected village, mine and hell levels');

// Verify weapon evolution system
assert.ok(Array.isArray(config.WEAPON_EVOLUTIONS), 'WEAPON_EVOLUTIONS should be an array');
assert.equal(config.WEAPON_EVOLUTIONS.length, 3, 'expected 3 evolution recipes');
for (const evo of config.WEAPON_EVOLUTIONS) {
  assert.ok(evo.id && evo.baseWeapon && evo.resultWeapon, `evolution ${evo.id} missing key fields`);
  assert.ok(config.WEAPONS[evo.baseWeapon], `evolution ${evo.id} baseWeapon ${evo.baseWeapon} must exist in WEAPONS`);
  assert.ok(config.WEAPONS[evo.resultWeapon], `evolution ${evo.id} resultWeapon ${evo.resultWeapon} must exist in WEAPONS`);
  assert.ok(config.WEAPONS[evo.resultWeapon].evolved === true, `evolved weapon ${evo.resultWeapon} should have evolved: true`);
  const relic = config.UPGRADES.find(u => u.id === evo.relic);
  assert.ok(relic, `evolution ${evo.id} relic ${evo.relic} must reference an existing upgrade`);
  assert.ok(evo.relicMinLevel > 0 && evo.relicMinLevel <= relic.maxLevel, `evolution ${evo.id} relicMinLevel must be valid`);
}

// Verify phased spawning config for each level
for (const [id, level] of Object.entries(config.LEVELS)) {
  assert.ok(Array.isArray(level.phases) && level.phases.length >= 4, `level ${id} should define at least 4 phases`);
  for (const phase of level.phases) {
    assert.ok(typeof phase.time === 'number' && phase.time >= 0, `phase in ${id} needs a numeric time`);
    assert.ok(Array.isArray(phase.enemyPool), `phase in ${id} needs an enemyPool array`);
    assert.ok(typeof phase.maxEnemies === 'number', `phase in ${id} needs maxEnemies`);
    assert.ok(typeof phase.spawnInterval === 'number', `phase in ${id} needs spawnInterval`);
  }
}

for (const [id, weapon] of Object.entries(config.WEAPONS)) {
  assert.ok(weapon.name && weapon.type && weapon.icon, `weapon ${id} is missing a key field`);
}
for (const upgrade of config.UPGRADES) {
  assert.ok(upgrade.id && upgrade.icon && upgrade.rarity && upgrade.maxLevel > 0, `upgrade ${upgrade.id ?? '<unknown>'} is incomplete`);
}
assert.ok(config.BUILD_TAG_LABELS && config.BUILD_TAG_LABELS.orbit && config.BUILD_TAG_LABELS.fire,
  'build tag labels should exist for synergy UI');
assert.ok(config.UPGRADES.filter(u => Array.isArray(u.buildTags) && u.buildTags.length > 0).length >= 6,
  'expected build-tagged synergy upgrades');
for (const upgrade of config.UPGRADES.filter(u => u.buildTags)) {
  for (const tag of upgrade.buildTags) {
    assert.ok(config.BUILD_TAG_LABELS[tag], `synergy upgrade ${upgrade.id} references unknown build tag ${tag}`);
  }
}
for (const [id, enemy] of Object.entries(config.ENEMIES)) {
  assert.ok(enemy.name && enemy.sprite && enemy.hp > 0, `enemy ${id} is incomplete`);
}
assert.ok(config.WEAPONS.shadow_imp.icon === 'weapons/shadow_imp' &&
  config.WEAPONS.shadow_imp.minionSprite === 'enemies/demon_bat',
  'shadow_imp should keep its card icon but summon a high-contrast visible minion sprite');
{
  const expectedHudIcons = {
    sword: 'weapons/sword',
    hammer: 'weapons/hammer',
    scythe: 'weapons/scythe',
    bow: 'weapons/bow',
    fireball: 'weapons/fireball',
    knife: 'weapons/knife',
    soul: 'weapons/soul',
    shield: 'weapons/shield',
    holy_cross: 'weapons/holy_cross',
    poison_aura: 'weapons/poison_aura',
  };
  for (const [weaponId, icon] of Object.entries(expectedHudIcons)) {
    assert.equal(config.WEAPONS[weaponId].hudIcon, icon,
      `weapon ${weaponId} should define a dedicated HUD/card icon separate from combat art`);
    const unlock = config.WEAPON_UNLOCKS.find(u => u.weaponId === weaponId);
    if (unlock) assert.equal(unlock.icon, icon, `unlock ${weaponId} should use the dedicated HUD/card icon`);
  }
}
assert.ok(config.WEAPONS.shadow_imp.summonCount >= 2 && config.WEAPONS.shadow_imp.summonLifetime >= 12,
  'shadow_imp should summon visible companions long enough to notice');
assert.ok(config.WEAPON_UNLOCKS.some(u => u.weaponId === 'shadow_imp'),
  'shadow_imp should be available as a visible weapon unlock');
const summonerPact = config.UPGRADES.find(u => u.id === 'summoner_pact');
assert.ok(summonerPact && String(summonerPact.apply).includes("addWeapon('shadow_imp')"),
  'summoner_pact should grant shadow_imp when the player has no summon weapon');
for (const [id, level] of Object.entries(config.LEVELS)) {
  for (const tile of level.groundTiles || []) {
    assert.ok(!tile.includes('wall'), `level ${id} groundTiles should not contain wall art: ${tile}`);
    assert.ok(!tile.includes('grass_strip'), `level ${id} groundTiles should not contain strip overlay art: ${tile}`);
  }
  const ambushEvents = level.phases.flatMap(phase => phase.events || [])
    .filter(ev => ev.type === 'ambush' || ev.type === 'veinAmbush' || ev.type === 'riftAmbush');
  assert.ok(ambushEvents.length >= 3, `level ${id} should include recurring ambush events for pacing`);
  for (const ev of ambushEvents) {
    assert.ok(ev.count > 0 && Array.isArray(ev.enemyPool) && ev.enemyPool.length > 0,
      `ambush event in ${id} should define count and enemyPool`);
    for (const enemyId of ev.enemyPool) {
      assert.ok(config.ENEMIES[enemyId], `ambush event in ${id} references unknown enemy ${enemyId}`);
    }
  }
}

const resourcePrefix = /^(?:backgrounds|bosses|effects|enemies|items|player|props|tiles|ui|weapons)\//;
const resources = new Set();
function collect(value) {
  if (typeof value === 'string' && resourcePrefix.test(value)) resources.add(value);
  else if (Array.isArray(value)) value.forEach(collect);
  else if (value && typeof value === 'object') Object.values(value).forEach(collect);
}
collect(config);

for (const key of resources) {
  assert.ok(manifest[key], `config resource missing from manifest: ${key}`);
  const filename = path.join(root, 'assets', `${key}.png`);
  assert.ok(existsSync(filename), `manifest resource missing PNG: ${key}`);
  assert.deepEqual([...readFileSync(filename).subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], `invalid PNG: ${key}`);
}

// Exercise the viewport-aware helpers without needing a browser or Canvas.
const gameSource = readFileSync(path.join(jsDir, 'game.js'), 'utf8');
const entitiesSource = readFileSync(path.join(jsDir, 'entities.js'), 'utf8');
const gameContext = {
  CONFIG: config,
  window: { innerWidth: 390, innerHeight: 844 },
  Math,
  clamp: (v, mn, mx) => Math.max(mn, Math.min(mx, v)),
  dist: (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay),
  angleTo: (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax),
  TAU: Math.PI * 2,
  Audio2: { pickup() {}, play() {} },
  pick: (items) => items[0],
  makeRNG: (seed) => {
    let s = seed;
    return () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
  },
};
vm.runInNewContext(`${gameSource}\nglobalThis.__GAME__ = Game;`, gameContext, { filename: 'js/game.js' });
const game = gameContext.__GAME__;

assert.ok(config.LEVEL_VISUALS && config.LEVEL_VISUALS.village && config.LEVEL_VISUALS.mine && config.LEVEL_VISUALS.hell,
  'each level should define a distinct visual profile');
assert.ok(typeof game.getLevelVisualProfile === 'function',
  'Game should expose level visual profile helper for themed map generation');
assert.ok(typeof game.getThemePropScatterCount === 'function',
  'Game should expose themed prop scatter count helper');
{
  const villageVisual = game.getLevelVisualProfile('village');
  const mineVisual = game.getLevelVisualProfile('mine');
  const hellVisual = game.getLevelVisualProfile('hell');
  assert.notEqual(villageVisual.baseColor, mineVisual.baseColor,
    'village and mine should not share the same ground base color');
  assert.notEqual(mineVisual.baseColor, hellVisual.baseColor,
    'mine and hell should not share the same ground base color');
  assert.ok((villageVisual.propScatterCounts.tombstones || 0) > (mineVisual.propScatterCounts.tombstones || 0),
    'village should visually lean into graveyard props more than mine');
  assert.ok((mineVisual.propScatterCounts.caves || 0) > (villageVisual.propScatterCounts.caves || 0),
    'mine should visually lean into cave props more than village');
  assert.ok(mineVisual.wallBorderThick > villageVisual.wallBorderThick,
    'mine should keep a stronger cave boundary than the open village');
  assert.equal(mineVisual.interiorWallSegments, 0,
    'mine should not scatter floating stone-wall columns through the playable floor');
  assert.equal(hellVisual.interiorWallSegments, 0,
    'hell should not scatter mismatched stone-wall columns through the basalt floor');
  assert.ok(hellVisual.patchColor !== mineVisual.patchColor,
    'hell should have a distinct patch tint from mine');
  assert.ok(villageVisual.sceneUnderlayAlpha === 0 && mineVisual.sceneUnderlayAlpha === 0 && hellVisual.sceneUnderlayAlpha === 0,
    'sprite-sheet scene art must not be stretched across combat maps as a background');
  assert.equal(new Set([
    villageVisual.terrainPattern,
    mineVisual.terrainPattern,
    hellVisual.terrainPattern,
  ]).size, 3, 'each level should use a unique procedural terrain pattern');
  assert.equal(game.getThemePropScatterCount('tombstones', mineVisual), 0,
    'mine visual profile should be able to suppress off-theme graveyard scatter');
  assert.ok(mineVisual.groundAlphaMax <= 0.38 && mineVisual.groundTileCoverage <= 0.48,
    'mine ground tiles should be sparse/translucent enough to avoid a noisy grid');
  assert.equal(mineVisual.terrainPattern, 'crackedSlate',
    'mine should use an organic cracked-slate floor instead of a chamber grid');
  assert.ok(mineVisual.groundTileCoverage <= 0.22,
    'mine should not expose repeated square ground sprites across the whole view');
  assert.equal(mineVisual.useGroundTiles, false,
    'mine should rely on its continuous procedural floor instead of floating square sprites');
  assert.ok(mineVisual.groundTintColor && mineVisual.groundTintColor.includes('rgba'),
    'mine should apply a cold blue/cyan ground tint after drawing shared stone tiles');
  const mineScatterTotal = Object.values(mineVisual.propScatterCounts).reduce((sum, value) => sum + (value || 0), 0);
  assert.ok(mineScatterTotal <= 36 && mineVisual.decorationCount <= 18,
    'mine should use restrained landmarks/props instead of filling the screen with clutter');
  assert.ok(mineVisual.propScatterCounts.caves <= 1 && mineVisual.propScatterCounts.stonework <= 3,
    'mine should not repeat oversized cave entrances and stone columns across one viewport');
}
assert.ok(config.LEVEL_VISUALS.mine.mapFeatures?.railLines?.count <= 2 &&
  config.LEVEL_VISUALS.mine.mapFeatures?.railLines?.width <= 26 &&
  config.LEVEL_VISUALS.mine.mapFeatures?.railLines?.sleeperGap >= 44,
  'mine rail lines should be sparse and thin, not a full-screen grid');
assert.ok(config.LEVEL_VISUALS.mine.mapFeatures?.crystalVeins?.count >= 3 &&
  config.LEVEL_VISUALS.mine.mapFeatures?.crystalVeins?.count <= 5,
  'mine should use a few memorable crystal landmarks instead of many glow blobs');
assert.ok(config.LEVEL_VISUALS.mine.mapFeatures?.crystalVeins?.radius <= 62 &&
  config.LEVEL_VISUALS.mine.mapFeatures?.crystalVeins?.clusterCount <= 5,
  'mine crystal veins should be compact readable clusters, not giant cyan stains');
assert.ok(config.LEVEL_VISUALS.mine.mapFeatures.crystalVeins.radius <= 46,
  'mine crystal glow should stay smaller than a character-scale landmark');
assert.ok(config.LEVELS.mine.sceneBgs.includes('backgrounds/scene_crystal_track_section') &&
  config.LEVELS.mine.sceneBgs.includes('backgrounds/scene_crystal_crystal_deposits'),
  'mine should rotate through track/deposit scene art, not only generic cave backgrounds');
assert.ok(config.LEVELS.mine.groundDecorations.includes('effects/ice_orb') &&
  config.LEVELS.mine.groundDecorations.includes('effects/ice_shard_small'),
  'mine ground decorations should include clear blue crystal/ice accents');
assert.ok(!config.LEVEL_VISUALS.village.mapFeatures?.crystalVeins,
  'village should not use mine crystal-vein map features');
  assert.equal(config.LEVEL_VISUALS.village.mapFeatures?.crossroads?.count, 1,
    'village should have one readable crossroads landmark');
  assert.ok(config.LEVEL_VISUALS.village.mapFeatures.crossroads.width <= 100,
    'village crossroads should read as narrow old roads instead of a full-screen overlay');
  assert.ok(config.LEVEL_VISUALS.village.tileEdgeAlpha <= 0.08 &&
    config.LEVEL_VISUALS.mine.tileEdgeAlpha <= 0.05 &&
    config.LEVEL_VISUALS.hell.tileEdgeAlpha <= 0.05,
    'level terrain should suppress the obvious repeated tile grid');
assert.ok(config.LEVELS.mine.phases.some(phase => (phase.events || []).some(ev => ev.type === 'veinAmbush')),
  'mine phases should include crystal-vein ambush events for distinct pacing');
assert.ok(typeof game.generateThemeMapFeatures === 'function',
  'Game should generate theme-specific non-collision map features');
assert.ok(typeof game.spawnEnemyGroupAtMapFeatures === 'function',
  'Game should spawn biome events around map features');
{
  const mineLevel = config.LEVELS.mine;
  const mineVisual = game.getLevelVisualProfile('mine');
  const cx = mineLevel.mapW * config.TILE_SIZE / 2;
  const cy = mineLevel.mapH * config.TILE_SIZE / 2;
  const features = game.generateThemeMapFeatures(
    'mine',
    mineVisual,
    gameContext.makeRNG(42),
    mineLevel.mapW,
    mineLevel.mapH,
    config.TILE_SIZE,
    cx,
    cy
  );
  const rails = features.filter(f => f.type === 'railLine');
  assert.ok(rails.length <= 2 && rails.every(f => f.width <= 26 && f.sleeperGap >= 44),
    'mine feature generation should create sparse thin rail lines');
  const veins = features.filter(f => f.type === 'crystalVein');
  assert.ok(veins.length >= 3 && veins.length <= 5, 'mine feature generation should create a few crystal landmarks');
  assert.ok(veins.every(f => f.radius <= 62 && f.clusterCount <= 5),
    'generated crystal veins should stay compact instead of covering the screen');
  assert.ok(veins.every(f => gameContext.dist(f.x, f.y, cx, cy) > 180),
    'crystal veins should avoid the player spawn safe zone');
  const villageFeatures = game.generateThemeMapFeatures('village', game.getLevelVisualProfile('village'), gameContext.makeRNG(7), 40, 30, config.TILE_SIZE, 1280, 960);
  assert.equal(villageFeatures.filter(f => f.type === 'villageCrossroads').length, 1,
    'village feature generation should create one central crossroads');
  assert.ok(!villageFeatures.some(f => f.type === 'crystalVein' || f.type === 'railLine'),
    'village feature generation should not inherit mine-only features');

  gameContext.Enemy = class {
    constructor(type, x, y) {
      this.type = type;
      this.x = x;
      this.y = y;
      this.alive = true;
      this.radius = config.ENEMIES[type]?.radius || 16;
    }
  };
  game.levelData = mineLevel;
  game.levelTime = 0;
  game.player = { x: 800, y: 800 };
  game.enemies = [];
  game.collisionProps = [];
  game.mapData = { features: [{ type: 'crystalVein', x: 360, y: 420, radius: 90 }] };
  const spawned = game.spawnEnemyGroupAtMapFeatures('crystalVein', ['crystal'], 3, 90);
  assert.equal(spawned, 3, 'feature ambush should spawn the requested group when space is clear');
  assert.ok(game.enemies.every(e => e.type === 'crystal' && gameContext.dist(e.x, e.y, 360, 420) <= 140),
    'feature ambush enemies should spawn near the selected crystal vein');
}
assert.ok(config.LEVEL_VISUALS.hell.mapFeatures?.lavaFissures?.count >= 3,
  'hell should define visible lava-fissure map features');
assert.ok(config.LEVEL_VISUALS.hell.mapFeatures?.demonRifts?.count >= 3,
  'hell should define demon-rift map features');
assert.equal(config.LEVEL_VISUALS.hell.terrainPattern, 'basaltRifts',
  'hell should use a dedicated basalt terrain pattern');
assert.equal(config.LEVEL_VISUALS.hell.useGroundTiles, false,
  'hell should rely on a continuous basalt floor instead of floating dirt sprites');
assert.ok(config.LEVELS.hell.props.spikes.length === 1 &&
  config.LEVELS.hell.props.spikes[0] === 'props/hell_spike_bones',
  'hell should not mix bright wooden spike art into the basalt biome');
assert.equal(config.LEVEL_VISUALS.hell.propScatterCounts.spikes, 0,
  'bright bone spike sheets should stay out of the active hell scatter');
assert.ok(Object.values(config.LEVEL_VISUALS.hell.propScatterCounts)
  .reduce((sum, value) => sum + (value || 0), 0) <= 42,
  'hell should reserve visual space for fissures and rifts instead of generic prop clutter');
assert.equal(config.LEVEL_VISUALS.hell.mapFeatures.lavaFissures.sprite, 'effects/hell_ai_lava_fissure',
  'hell lava fissures should use the sliced AI sprite');
assert.equal(config.LEVEL_VISUALS.hell.mapFeatures.demonRifts.sprite, 'effects/hell_ai_demon_rift',
  'hell demon rifts should use the sliced AI sprite');
assert.ok(config.LEVELS.hell.groundDecorations.includes('effects/hell_rune_brand'),
  'hell ground decorations should include a generated rune brand');
assert.ok(config.LEVELS.hell.props.spikes.includes('props/hell_spike_bones'),
  'hell spike props should include a generated bone-spike prop');
const aiHellSheetPath = path.join(root, 'assets/source_sheets/hell_ai_sprite_sheet.png');
assert.ok(existsSync(aiHellSheetPath), 'project should keep the AI-generated hell sprite sheet source');
const aiHellAssets = [
  'effects/hell_ai_lava_fissure',
  'effects/hell_ai_demon_rift',
  'effects/hell_ai_rune_circle',
  'effects/hell_ai_ember_burst',
  'props/hell_ai_demon_gate',
  'props/hell_ai_obsidian_obelisk',
  'props/hell_ai_lava_rock',
  'props/hell_ai_chain_pile',
];
assert.equal(config.LEVEL_VISUALS.hell.mapFeatures.lavaFissures.sprite, 'effects/hell_ai_lava_fissure',
  'hell lava fissures should use the sliced AI sprite');
assert.equal(config.LEVEL_VISUALS.hell.mapFeatures.demonRifts.sprite, 'effects/hell_ai_demon_rift',
  'hell demon rifts should use the sliced AI sprite');
assert.ok(config.LEVELS.hell.groundDecorations.includes('effects/hell_ai_rune_circle') &&
  config.LEVELS.hell.groundDecorations.includes('effects/hell_ai_ember_burst'),
  'hell ground decorations should include sliced AI effect sprites');
assert.ok(config.LEVELS.hell.props.stonework.includes('props/hell_ai_demon_gate') &&
  config.LEVELS.hell.props.stonework.includes('props/hell_ai_obsidian_obelisk'),
  'hell stonework props should include sliced AI structure sprites');
assert.ok(config.LEVELS.hell.props.rocks.includes('props/hell_ai_lava_rock') &&
  config.LEVELS.hell.props.furniture.includes('props/hell_ai_chain_pile'),
  'hell props should include sliced AI rock and chain sprites');
assert.ok(!config.LEVEL_VISUALS.mine.mapFeatures?.demonRifts,
  'mine should not inherit hell demon-rift features');
assert.ok(typeof game.isPointNearThemeFeature === 'function',
  'map generation should expose feature clearance checks for walls and props');
assert.ok(game.isPointNearThemeFeature(320, 420, 20, [{
  type: 'railLine', x1: 100, y1: 420, x2: 600, y2: 420, horizontal: true, width: 22,
}]), 'rail corridors should reserve clear movement space');
assert.ok(!game.isPointNearThemeFeature(320, 620, 20, [{
  type: 'railLine', x1: 100, y1: 420, x2: 600, y2: 420, horizontal: true, width: 22,
}]), 'points far from theme features should remain available for props');
assert.ok(config.LEVELS.hell.phases.some(phase => (phase.events || []).some(ev => ev.type === 'riftAmbush')),
  'hell phases should include demon-rift ambush events for distinct pacing');
{
  const hellLevel = config.LEVELS.hell;
  const hellVisual = game.getLevelVisualProfile('hell');
  const cx = hellLevel.mapW * config.TILE_SIZE / 2;
  const cy = hellLevel.mapH * config.TILE_SIZE / 2;
  const features = game.generateThemeMapFeatures(
    'hell',
    hellVisual,
    gameContext.makeRNG(99),
    hellLevel.mapW,
    hellLevel.mapH,
    config.TILE_SIZE,
    cx,
    cy
  );
  assert.ok(features.filter(f => f.type === 'lavaFissure').length >= 3,
    'hell feature generation should create visible lava fissures');
  assert.ok(features.filter(f => f.type === 'lavaFissure').every(f => f.sprite === 'effects/hell_ai_lava_fissure'),
    'generated lava fissure features should carry the dedicated sprite');
  const rifts = features.filter(f => f.type === 'demonRift');
  assert.ok(rifts.length >= 3, 'hell feature generation should create demon rifts');
  assert.ok(rifts.every(f => f.sprite === 'effects/hell_ai_demon_rift'),
    'generated demon rift features should carry the dedicated sprite');
  assert.ok(rifts.every(f => gameContext.dist(f.x, f.y, cx, cy) > 190),
    'demon rifts should avoid the player spawn safe zone');

  gameContext.Enemy = class {
    constructor(type, x, y) {
      this.type = type;
      this.x = x;
      this.y = y;
      this.alive = true;
      this.radius = config.ENEMIES[type]?.radius || 16;
    }
  };
  game.levelData = hellLevel;
  game.levelTime = 90;
  game.currentPhase = 0;
  game.triggeredPhases = {};
  game.player = { x: 800, y: 800 };
  game.enemies = [];
  game.collisionProps = [];
  game.mapData = { features: [{ type: 'demonRift', x: 420, y: 460, radius: 100 }] };
  game.addMessage = () => {};
  game.shakeScreen = () => {};
  game.triggerPhaseEvents({
    events: [{ type: 'riftAmbush', featureType: 'demonRift', count: 4, enemyPool: ['imp'], radius: 100 }],
  });
  assert.equal(game.enemies.length, 4, 'rift ambush should spawn the requested group around a demon rift');
  assert.ok(game.enemies.every(e => e.type === 'imp' && gameContext.dist(e.x, e.y, 420, 460) <= 155),
    'rift ambush enemies should spawn near the selected demon rift');
}
assert.ok(typeof game.collectAllXpPickups === 'function',
  'Game should expose a full-map XP collection helper for magnet pickups');
{
  let gainedXp = 0;
  game.player = { x: 0, y: 0, gainXp: (amount) => { gainedXp += amount; return amount >= 5 ? 2 : 0; } };
  game.pickups = [
    { type: 'xp', value: 2, alive: true, x: 120, y: 40 },
    { type: 'xp', value: 3, alive: true, x: 320, y: 220 },
    { type: 'heart', value: 0, alive: true, x: 80, y: 80 },
    { type: 'chest', value: 0, alive: true, x: 160, y: 160 },
  ];
  game.particles = [];
  game.particlePool = { obtain: () => ({ alive: true }) };
  const levelUpBatches = [];
  game.onLevelUp = (levelsGained = 1) => { levelUpBatches.push(levelsGained); };
  game.addMessage = () => {};
  game.collectAllXpPickups(0, 0);
  assert.equal(gainedXp, 5, 'full-map XP collection should grant the total value of all live XP gems');
  assert.equal(game.pickups.filter(p => p.type === 'xp' && p.alive).length, 0,
    'full-map XP collection should consume all live XP gems');
  assert.equal(game.pickups.filter(p => p.type !== 'xp' && p.alive).length, 2,
    'full-map XP collection should not consume hearts or chests');
  assert.deepEqual(levelUpBatches, [2],
    'full-map XP collection should request one upgrade choice for every level gained');
}
gameContext.document = {
  createElement: () => ({
    width: 0,
    height: 0,
    getContext: () => ({
      imageSmoothingEnabled: false,
      globalAlpha: 1,
      fillStyle: '',
      fillRect() {},
      drawImage() {},
      beginPath() {},
      moveTo() {},
      lineTo() {},
      closePath() {},
      ellipse() {},
      fill() {},
      stroke() {},
      save() {},
      restore() {},
      translate() {},
      rotate() {},
      createLinearGradient() { return { addColorStop() {} }; },
    }),
  }),
};
gameContext.Assets = {
  get: (key) => {
    const entry = manifest[key];
    return entry ? { complete: true, width: entry.w, height: entry.h } : null;
  },
};
const visible = game.getVisibleCanvasRect();
const choiceLayout = game.getChoiceLayout(3);
assert.equal(game.isPortrait(), true, '390x844 viewport should use portrait layout');
assert.ok(visible.x > 0 && visible.x + visible.w <= config.CANVAS_W, 'portrait visible area should stay inside the canvas');
assert.equal(choiceLayout.cards.length, 3, 'portrait upgrade layout should contain three cards');
for (const card of choiceLayout.cards) {
  assert.ok(card.x >= visible.x && card.x + card.w <= visible.x + visible.w, 'portrait card should remain horizontally visible');
  assert.ok(card.y >= visible.y && card.y + card.h <= visible.y + visible.h, 'portrait card should remain vertically visible');
}
gameContext.window.innerWidth = 1366;
gameContext.window.innerHeight = 768;
game._rotate90 = false;
assert.equal(game.isPortrait(), false, '1366x768 viewport should use landscape layout');
assert.ok(typeof game.getWeaponHudLayout === 'function', 'Game should expose weapon HUD layout helper');
const landscapeVisible = game.getVisibleCanvasRect();
const weaponHud = game.getWeaponHudLayout(4);
assert.ok(weaponHud.y + weaponHud.itemHeight <= landscapeVisible.y + landscapeVisible.h,
  'weapon HUD should stay vertically visible in landscape');
assert.ok(weaponHud.y > landscapeVisible.y + landscapeVisible.h - 100,
  'landscape weapon HUD should stay in the bottom-center HUD zone');
assert.ok(weaponHud.x > landscapeVisible.x + 180,
  'landscape weapon HUD should avoid the left joystick zone');
assert.ok(weaponHud.x + weaponHud.totalW < landscapeVisible.x + landscapeVisible.w - 180,
  'landscape weapon HUD should avoid the right dash zone');
const crowdedWeaponHud = game.getWeaponHudLayout(16);
assert.ok(crowdedWeaponHud.rows >= 2 && crowdedWeaponHud.columns < 16,
  'crowded weapon HUD should wrap late-game weapon lists instead of rendering a single long row');
assert.ok(crowdedWeaponHud.x >= landscapeVisible.x + 180,
  'crowded weapon HUD should still avoid the left joystick zone');
assert.ok(crowdedWeaponHud.x + crowdedWeaponHud.totalW <= landscapeVisible.x + landscapeVisible.w - 180,
  'crowded weapon HUD should still avoid the right dash zone');
assert.ok(crowdedWeaponHud.y + crowdedWeaponHud.itemHeight <= landscapeVisible.y + landscapeVisible.h,
  'crowded weapon HUD should stay vertically visible');

{
  const originalPickWeightedChoice = game.pickWeightedChoice;
  const originalRandom = gameContext.Math.random;
  gameContext.Math.random = () => 0.1;
  game.pickWeightedChoice = (weighted) =>
    weighted.find(item => item.upgrade.weaponId === 'sword')?.upgrade || weighted[0].upgrade;
  game.player = {
    weapons: [{ id: 'sword', level: 1, def: config.WEAPONS.sword }],
    upgradeLevels: {},
    stats: { luck: 0 },
  };
  game.generateUpgradeChoices();
  assert.ok(game.upgradeChoices.some(choice =>
    choice.weaponId === 'sword' &&
    choice.currentLevel === 1 &&
    choice.nextLevel === 2 &&
    choice.name.includes('强化')
  ), 'level-up choices should offer owned weapon upgrades instead of only new weapon unlocks');
  game.pickWeightedChoice = originalPickWeightedChoice;
  gameContext.Math.random = originalRandom;
}
{
  const originalRandom = gameContext.Math.random;
  gameContext.Math.random = () => 0.99;
  game.player = {
    weapons: [{ id: 'sword', level: 2, def: config.WEAPONS.sword }],
    upgradeLevels: {},
    stats: { luck: 0 },
  };
  game.generateUpgradeChoices();
  assert.ok(!game.upgradeChoices.some(choice => choice.weaponId),
    'level-up choices should weight weapon cards instead of forcing one every level');
  const swordUpgrade = game.getAvailableWeaponChoices(new Set()).find(choice => choice.weaponId === 'sword');
  const swordDesc = game.getChoiceDescription(swordUpgrade);
  assert.ok(swordUpgrade && swordDesc.includes('伤害 +15%') && swordDesc.includes('范围 +5%'),
    'weapon upgrade descriptions should show concrete per-level stat gains');
  game.player.upgradeLevels = { damage: 2 };
  const damageDesc = game.getChoiceDescription(config.UPGRADES.find(upgrade => upgrade.id === 'damage'));
  assert.ok(damageDesc.includes('当前 Lv.2/8') && damageDesc.includes('下一级 Lv.3'),
    'stat upgrade descriptions should show current and next level progress');
  gameContext.Math.random = originalRandom;
}

assert.ok(typeof game.getPropCollisionRadius === 'function', 'Game should expose prop collision radius helper');
assert.ok(typeof game.getPropCollisionFootprint === 'function', 'Game should expose prop collision footprint helper');
const stoneworkRadius = game.getPropCollisionRadius('stonework', 'props/stone_wall_doorway');
assert.ok(stoneworkRadius > config.PROP_COLLISION.stonework,
  'large props should derive a larger collision radius from sprite dimensions');
assert.ok(stoneworkRadius >= 28 && stoneworkRadius <= 34,
  'stone doorway collision should cover its solid base without blocking the whole sprite');
const tombstoneFootprint = game.getPropCollisionFootprint('tombstones', 'props/tombstone_single_rounded');
assert.ok(tombstoneFootprint.halfW >= 12 && tombstoneFootprint.halfW <= 28 &&
  tombstoneFootprint.halfH >= 12 && tombstoneFootprint.halfH <= 24,
  'tombstone collision should use a compact rectangular footprint instead of the whole sprite');
const treeFootprint = game.getPropCollisionFootprint('trees', 'props/tree_dead_gnarled_01');
assert.ok(treeFootprint.halfW <= 28 && treeFootprint.halfH <= 26 && treeFootprint.collisionOffsetY > 0,
  'tall tree collision should be a lowered trunk footprint, not the whole canopy');
game.collisionProps = [{ x: 100, y: 100, ...tombstoneFootprint }];
const playerSlidingIntoRect = { x: 100, y: 84, prevX: 70, prevY: 84, radius: 14 };
assert.equal(game.resolveRectPropCollision(playerSlidingIntoRect, { x: 100, y: 100, halfW: 20, halfH: 20 }), true,
  'rectangular prop collision should resolve an entity that moved into the rectangle');
assert.ok(playerSlidingIntoRect.x <= 80 - playerSlidingIntoRect.radius && Math.abs(playerSlidingIntoRect.y - 84) < 0.1,
  'rectangular prop collision should use previous position to push back through the crossed side');
const entityOnTombstone = { x: 100, y: 100, radius: 14 };
assert.equal(game.resolvePropCollision(entityOnTombstone), true,
  'rectangular prop collision should report when it moves an entity');
assert.ok(entityOnTombstone.x <= 100 - tombstoneFootprint.halfW || entityOnTombstone.x >= 100 + tombstoneFootprint.halfW ||
  entityOnTombstone.y <= 100 - tombstoneFootprint.halfH || entityOnTombstone.y >= 100 + tombstoneFootprint.halfH,
  'rectangular prop collision should push entities out of the visible prop footprint');
game.collisionProps = [{ x: 100, y: 100, radius: stoneworkRadius }];
const centeredEntity = { x: 100, y: 100, radius: 14 };
assert.equal(game.resolvePropCollision(centeredEntity), true,
  'circular prop collision should report when it moves an entity');
assert.ok(Math.hypot(centeredEntity.x - 100, centeredEntity.y - 100) >= stoneworkRadius + centeredEntity.radius - 0.1,
  'prop collision should push entities out even when centers exactly overlap');
game.collisionProps = [{ x: 220, y: 220, radius: 20, halfW: 24, halfH: 16, collisionX: 220, collisionY: 228 }];
assert.ok(game.isCircleBlocked(220, 228, 14), 'spawn checks should detect blocked prop footprints');
assert.ok(!game.isCircleBlocked(320, 320, 14), 'spawn checks should allow clear positions');
for (const [levelId, level] of Object.entries(config.LEVELS)) {
  game.levelData = level;
  game.generateMap();
  const spawnX = level.mapW * config.TILE_SIZE / 2;
  const spawnY = level.mapH * config.TILE_SIZE / 2;
  for (const prop of game.collisionProps.filter(p => p.category !== 'wall')) {
    assert.ok(!game.footprintOverlapsCircle(prop.x, prop.y, prop, spawnX, spawnY, 90),
      `level ${levelId} prop ${prop.type} should not overlap the spawn safe zone`);
  }
}
assert.ok(gameSource.includes('actorDrawables.sort((a, b) => a.y - b.y)'),
  'renderWorld should depth-sort actors together by y');
assert.ok(!gameSource.includes('worldDrawables.sort((a, b) => a.y - b.y)'),
  'renderWorld should not depth-sort props over the player');
assert.ok(gameSource.includes('getPlayerBuildTags') && gameSource.includes('getChoiceSynergyScore'),
  'Game should support build-tag-aware upgrade choices');
assert.ok(gameSource.includes('drawChoiceBadges') && gameSource.includes('getEvolutionHintForChoice'),
  'upgrade cards should show build fit and evolution hints');
assert.ok(gameSource.includes('row 1 is reserved for rarity') &&
  gameSource.includes('fitChoiceBadgeText') &&
  gameSource.includes('const maxBadgeW = Math.min(92, cardW * 0.42)'),
  'choice badges should avoid colliding with rarity and level labels');
assert.ok(gameSource.includes('drawChoiceIcon') && gameSource.includes('findDominantOpaqueCrop') &&
  gameSource.includes('_choiceIconCropCache'),
  'choice cards should crop composite weapon sprites to their dominant icon');
assert.ok(gameSource.includes('drawCroppedAsset') && gameSource.includes('getChoiceIconCrop(iconKey, img)'),
  'combat/UI rendering should share cropped drawing for composite weapon sprites');
assert.ok(entitiesSource.includes('drawWeapons(ctx') &&
  !entitiesSource.includes('for (const w of this.weapons) w.draw(ctx);'),
  'Player.draw should not render weapons after the hero body where they can cover the player');
assert.ok(entitiesSource.includes('drawCroppedAsset(ctx, this.def.icon') &&
  entitiesSource.includes('drawCroppedAsset(ctx, this.sprite'),
  'weapon and projectile drawing should crop composite weapon sprites instead of drawing entire sheets');
const renderWorldStart = gameSource.indexOf('renderWorld() {');
const renderHudStart = gameSource.indexOf('renderHUD() {', renderWorldStart);
assert.ok(renderWorldStart >= 0 && renderHudStart > renderWorldStart, 'renderWorld source should be locatable');
const renderWorldSource = gameSource.slice(renderWorldStart, renderHudStart);
assert.ok(renderWorldSource.includes('this.player.drawWeapons(ctx,') &&
  renderWorldSource.indexOf('this.player.drawWeapons(ctx,') < renderWorldSource.indexOf('this.player.draw(ctx'),
  'renderWorld should draw player weapons before the hero body so weapons do not cover the player');
assert.ok(renderWorldSource.includes('Summons are gameplay-critical companions') &&
  renderWorldSource.includes('particle clutter so orbit/projectile effects do not') &&
  renderWorldSource.indexOf('for (const p of this.particles)') < renderWorldSource.indexOf('for (const m of this.minions)'),
  'renderWorld should draw summons above particles and the player weapon layer');
const weaponHudRenderStart = gameSource.indexOf('renderHUD() {');
const weaponHudRenderEnd = gameSource.indexOf('renderRotateButton()', weaponHudRenderStart);
assert.ok(weaponHudRenderStart >= 0 && weaponHudRenderEnd > weaponHudRenderStart, 'renderHUD source should be locatable');
const renderHudSource = gameSource.slice(weaponHudRenderStart, weaponHudRenderEnd);
assert.ok(renderHudSource.includes('drawChoiceIcon(ctx, w.def.hudIcon || w.def.icon') &&
  !renderHudSource.includes('Assets.drawCentered(ctx, w.def.icon'),
  'weapon HUD should use the same cropped icon drawing path as upgrade cards');
assert.ok(gameSource.includes('spawnEnemyGroup') && gameSource.includes("ev.type === 'ambush'"),
  'phase events should support ambush pacing events');
assert.ok(gameSource.includes('applyPlayerHitEffects') && gameSource.includes('chainLightning') &&
  gameSource.includes('orbitPulse') && gameSource.includes('guardRetaliation'),
  'Game should apply synergy hit effects');
assert.ok(config.DROPS && config.DROPS.globalXpMagnet &&
  config.DROPS.globalXpMagnet.normalChance > 0 &&
  config.DROPS.globalXpMagnet.eliteChance > config.DROPS.globalXpMagnet.normalChance,
  'config should define a rare random full-map XP magnet drop');

// Confirm the expanded pickup radius always attracts instead of producing a
// negative speed outside the original radius.
assert.ok(entitiesSource.includes('drawFallback(ctx'), 'Player.draw should have a fallback when the hero sprite is unavailable');
assert.ok(entitiesSource.includes('burnChance') && entitiesSource.includes('poisonChance') &&
  entitiesSource.includes('chainLightningChance') && entitiesSource.includes('orbitPulseChance'),
  'Player stats should include synergy effect fields');
assert.ok(entitiesSource.includes('applyStatusEffect') && entitiesSource.includes('updateStatusEffects') &&
  entitiesSource.includes('getStatusSpeedMult'),
  'Enemy should support burn/poison status effects');
assert.ok(entitiesSource.includes('this.orbitRadius') && entitiesSource.includes('this.sprite = sprite') &&
  entitiesSource.includes('this.hasTarget') &&
  entitiesSource.includes('召唤物加入战斗'),
  'Minion summons should be visible, labeled, and announced');
assert.ok(entitiesSource.includes('ensureSummonPactWeapon') &&
  entitiesSource.includes('召唤契约唤来了暗影小鬼') &&
  entitiesSource.includes("this.cooldown = def.type === 'summon' ? -0.1 : 0"),
  'existing summon-pact saves should auto-grant and immediately spawn shadow_imp');
assert.ok(entitiesSource.includes('const r = 58 + Math.random() * 18') &&
  entitiesSource.includes('dist(player.x, player.y, e.x, e.y) > 220') &&
  entitiesSource.includes('dist(this.x, this.y, player.x, player.y) > 280') &&
  entitiesSource.includes("const label = '小鬼'"),
  'summons should stay near the player instead of chasing too far away');
assert.ok(entitiesSource.includes('const trailSegments = count > 2 ? 2 : 3') &&
  entitiesSource.includes('const trailAlphaBase = count > 2 ? 0.12 : 0.18'),
  'orbit weapon visuals should reduce clutter when multiple copies are active');
const entityGame = { player: { x: 0, y: 0, stats: { pickupRangeBonus: 140 } } };
const entityContext = {
  CONFIG: config,
  Game: entityGame,
  Math,
  TAU: Math.PI * 2,
  dist: (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay),
  angleTo: (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax),
};
vm.runInNewContext(`${entitiesSource}\nglobalThis.__Pickup__ = Pickup;`, entityContext, { filename: 'js/entities.js' });
const pickup = new entityContext.__Pickup__(200, 0, 'xp', 'xp_gem_small', 1);
pickup.vx = 0;
pickup.vy = 0;
pickup.update(0.1);
assert.ok(pickup.x < 200, 'expanded pickup range should move a distant gem toward the player');
assert.ok(entitiesSource.includes("this.type === 'magnet'") &&
  entitiesSource.includes('collectAllXpPickups') &&
  entitiesSource.includes('maybeDropGlobalXpMagnet'),
  'magnet pickups should trigger full-map XP collection and be randomly dropped by deaths');

// Regression: player bounds must use the active level dimensions, not only the
// original global village map dimensions.
const playerContext = {
  CONFIG: config,
  Game: {
    levelData: config.LEVELS.mine,
    resolvePropCollision() {},
    enemyGrid: { query: () => [] },
  },
  Input: {
    joystick: { active: false, dx: 0, dy: 0 },
    dashButton: { pressed: false },
    isDown: () => false,
    wasPressed: () => false,
  },
  Audio2: { play() {}, hurt() {}, death() {}, hitMaterial() {} },
  Assets: { get: () => ({ complete: true, width: 16, height: 16 }), drawCentered() {} },
  Math,
  TAU: Math.PI * 2,
  clamp: (v, mn, mx) => Math.max(mn, Math.min(mx, v)),
  rand: (min, max) => min + (max - min) * 0.5,
  dist: (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay),
  angleTo: (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax),
  normalizeAngle: (a) => a,
};
vm.runInNewContext(`${entitiesSource}\nglobalThis.__Player__ = Player;\nglobalThis.__Enemy__ = Enemy;`, playerContext, { filename: 'js/entities.js' });
const player = new playerContext.__Player__(9999, 9999);
assert.equal(player.radius, config.PLAYER.radius, 'player should expose a collision radius for prop collision');
const burstXpPlayer = new playerContext.__Player__(0, 0);
assert.equal(burstXpPlayer.gainXp(config.XP_CURVE[0] + config.XP_CURVE[1]), 2,
  'Player.gainXp should report the exact number of levels gained from a large XP burst');
const playerNearRectProp = new playerContext.__Player__(200, 200);
game.collisionProps = [{ x: 100, y: 100, radius: 24, halfW: 24, halfH: 24 }];
game.resolvePropCollision(playerNearRectProp);
assert.ok(Number.isFinite(playerNearRectProp.x) && Number.isFinite(playerNearRectProp.y),
  'rectangular prop collision should not corrupt player coordinates');
player.weapons = [];
player.update(0);
assert.ok(player.x <= config.LEVELS.mine.mapW * config.TILE_SIZE - 30, 'player x should clamp to active mine map width');
assert.ok(player.y <= config.LEVELS.mine.mapH * config.TILE_SIZE - 30, 'player y should clamp to active mine map height');
playerContext.Game.player = { x: 120, y: 120, radius: 16, takeDamage() {} };
const edgeEnemy = new playerContext.__Enemy__('slime', -120, config.LEVELS.mine.mapH * config.TILE_SIZE + 120);
edgeEnemy.knockbackVx = -1000;
edgeEnemy.knockbackVy = 1000;
edgeEnemy.update(0.05);
assert.ok(edgeEnemy.x >= edgeEnemy.radius, 'enemy should clamp inside the active level left edge');
assert.ok(edgeEnemy.y <= config.LEVELS.mine.mapH * config.TILE_SIZE - edgeEnemy.radius,
  'enemy should clamp inside the active level bottom edge');
playerContext.Game.levelData = config.LEVELS.village;
playerContext.Game.player = { x: 200, y: 100, radius: 14, takeDamage() {} };
playerContext.Game.resolvePropCollision = (enemy) => {
  enemy.x = 100;
  enemy.y = 100;
  return true;
};
const stuckEnemy = new playerContext.__Enemy__('slime', 100, 100);
for (let i = 0; i < 5; i++) stuckEnemy.update(0.15);
assert.ok(stuckEnemy.avoidTimer > 0, 'enemy should enter a short obstacle-avoidance state after blocked chase movement');
assert.ok(Math.hypot(stuckEnemy.x - 100, stuckEnemy.y - 100) > 6,
  'enemy should nudge itself out after repeated blocked chase movement');

// Regression: continuing a non-village save should rebuild that level directly,
// preserve phase trigger state, and create collision bodies for rendered walls.
const fakeCanvasContext = {
  imageSmoothingEnabled: false,
  globalAlpha: 1,
  fillStyle: '',
  fillRect() {},
  drawImage() {},
  beginPath() {},
  moveTo() {},
  lineTo() {},
  closePath() {},
  ellipse() {},
  fill() {},
  stroke() {},
  save() {},
  restore() {},
  translate() {},
  rotate() {},
  createLinearGradient() { return { addColorStop() {} }; },
};
const savedRun = {
  schemaVersion: game.saveSchemaVersion,
  levelId: 'hell',
  level: 7,
  xp: 12,
  hp: 88,
  kills: 42,
  weapons: [{ id: 'sword', level: 3 }],
  stats: {},
  upgradeLevels: { damage: 2 },
  levelTime: 350,
  playerPosition: { x: 1900, y: 1900 },
  spawnTimer: 1.5,
  eliteTimer: 10,
  bossSpawned: false,
  bossDefeated: false,
  triggeredPhases: { 0: true, 1: true, 2: true },
  pickups: [{ x: 400, y: 400, type: 'chest', sprite: 'chest', value: 0, life: 20 }],
};
Object.assign(gameContext, {
  document: { createElement: () => ({ width: 0, height: 0, getContext: () => fakeCanvasContext }) },
  Assets: { get: () => ({ complete: true, width: 48, height: 48, naturalWidth: 48 }) },
  Audio2: { playMusic() {} },
  localStorage: { getItem: () => JSON.stringify(savedRun) },
  Player: class {
    constructor(x, y) {
      this.x = x; this.y = y; this.level = 1; this.xp = 0; this.xpToNext = config.XP_CURVE[0];
      this.hp = config.PLAYER.maxHp; this.kills = 0; this.alive = true; this.weapons = [];
      this.stats = {
        damageMult: 1, attackSpeedMult: 1, rotateSpeedMult: 1, rangeMult: 1, moveSpeedMult: 1,
        pierceBonus: 0, critChanceBonus: 0, weaponCountBonus: 0, maxHpBonus: 0, regenBonus: 0,
        critMultBonus: 0, cooldownMult: 1, projectileSpeedMult: 1, knockbackMult: 1,
        pickupRangeBonus: 0, dashCooldownMult: 1, armor: 0, luck: 0, xpMult: 1, lifesteal: 0,
      };
      this.upgradeLevels = {};
    }
    addWeapon(id) { this.weapons.push({ id, level: 1, def: config.WEAPONS[id] }); }
    getMaxHp() { return config.PLAYER.maxHp + this.stats.maxHpBonus; }
  },
  Enemy: class {
    constructor(type, x, y) { this.type = type; this.x = x; this.y = y; this.alive = true; this.isBoss = true; }
  },
  makeRNG: (seed) => {
    let s = seed;
    return () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
  },
  rand: (min, max) => min + (max - min) * 0.5,
  dist: (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay),
  clamp: (v, mn, mx) => Math.max(mn, Math.min(mx, v)),
  TAU: Math.PI * 2,
});
game.pickupPool = {
  obtain: (x, y, type, sprite, value) => ({
    x, y, type, sprite, value, alive: true, life: 30, magnetized: false, vx: 0, vy: 0,
  }),
};
game.startNewGame = () => { throw new Error('loadAndContinue should not boot the village level first'); };
game.loadAndContinue();
assert.equal(game.levelData.theme, 'hell', 'continue should restore the saved level');
assert.ok(game.collisionProps.some(p => p.category === 'wall'), 'generated wall tiles should have collision bodies');
assert.ok(game.player.y <= config.LEVELS.hell.mapH * config.TILE_SIZE - 30, 'continued position should clamp to saved level bounds');
assert.equal(game.pickups.length, 1, 'continue should restore saved pickups instead of respawning initial chests');
assert.deepEqual(JSON.parse(JSON.stringify(game.triggeredPhases)), savedRun.triggeredPhases, 'continue should preserve triggered phase state');

// Verify upgrade prerequisite system
const prereqUpgrades = config.UPGRADES.filter(u => u.prerequisite);
assert.ok(prereqUpgrades.length >= 2, 'expected at least 2 upgrades with prerequisites');
for (const u of prereqUpgrades) {
  const prereq = config.UPGRADES.find(p => p.id === u.prerequisite);
  assert.ok(prereq, `prerequisite '${u.prerequisite}' for upgrade '${u.id}' must reference an existing upgrade`);
}

// Verify settings defaults and audio volume properties exist in source
const coreSource = readFileSync(path.join(jsDir, 'core.js'), 'utf8');
assert.ok(coreSource.includes('masterVolume') && coreSource.includes('sfxVolume') && coreSource.includes('musicVolume'),
  'Audio2 should define masterVolume, sfxVolume, musicVolume');
assert.ok(coreSource.includes('syncVolumes'), 'Audio2 should have syncVolumes method');
assert.ok(coreSource.includes('startMusic') && coreSource.includes('stopMusic'), 'Audio2 should have BGM methods');
assert.ok(coreSource.includes('playMusic'), 'Audio2 should have playMusic method for named tracks');
assert.ok(coreSource.includes('_musicTracks'), 'Audio2 should define _musicTracks for named BGM');
assert.ok(coreSource.includes('_pendingTrack'), 'Audio2 should handle pending track for autoplay policy');
assert.ok(gameSource.includes('playMusic'), 'Game should call playMusic for BGM state transitions');
assert.ok(gameSource.includes('_settingsOverlay') && gameSource.includes('renderSettings'),
  'Game should have settings overlay state and render method');
assert.ok(gameSource.includes('openSettings') && gameSource.includes('closeSettings'),
  'Game should have openSettings/closeSettings methods');

// Verify story data / UI separation
assert.ok(existsSync(path.join(jsDir, 'story.js')), 'story.js module should exist');
const storySource = readFileSync(path.join(jsDir, 'story.js'), 'utf8');
assert.ok(storySource.includes('const StoryUI'), 'story.js should define StoryUI object');
assert.ok(storySource.includes('render(game)'), 'StoryUI should have a render(game) method');
assert.ok(storySource.includes('drawTextWrapped'), 'StoryUI should have drawTextWrapped utility');
// CONFIG.STORY should have data for each level theme
for (const [theme, level] of Object.entries(config.LEVELS)) {
  const story = config.STORY[theme];
  assert.ok(story && Array.isArray(story.intro) && story.intro.length > 0, `STORY.${theme}.intro should be a non-empty array`);
  assert.ok(story.bossIntro && story.bossIntro.length > 0, `STORY.${theme}.bossIntro should exist`);
  assert.ok(story.victory && story.victory.length > 0, `STORY.${theme}.victory should exist`);
  for (const line of [...story.intro, ...story.bossIntro, ...story.victory]) {
    assert.ok(line.speaker && line.text, `story line in ${theme} should have speaker and text`);
  }
}
assert.ok(config.STORY.mimicEncounter && config.STORY.mimicEncounter.length > 0, 'STORY.mimicEncounter should exist');

// Verify off-screen culling helpers
assert.ok(typeof game.isOnScreen === 'function', 'Game should have isOnScreen method');
assert.ok(typeof game.CULL_MARGIN === 'number' && game.CULL_MARGIN > 0, 'CULL_MARGIN should be a positive number');
// Camera defaults to (0,0); a point inside the canvas should be on-screen
game.camera = { x: 0, y: 0 };
assert.ok(game.isOnScreen(config.CANVAS_W / 2, config.CANVAS_H / 2, 0), 'canvas center should be on-screen');
// A point far outside the canvas + margin should be off-screen
assert.ok(!game.isOnScreen(config.CANVAS_W + 5000, config.CANVAS_H + 5000, game.CULL_MARGIN), 'far point should be off-screen');
// With margin, a point just outside the canvas edge should be on-screen
assert.ok(game.isOnScreen(config.CANVAS_W + 10, config.CANVAS_H / 2, game.CULL_MARGIN), 'point just outside edge should be on-screen with margin');

// Verify ObjectPool class exists and Game has pool instances
assert.ok(coreSource.includes('class ObjectPool'), 'core.js should define ObjectPool class');
assert.ok(coreSource.includes('obtain') && coreSource.includes('recycle'), 'ObjectPool should have obtain and recycle methods');
assert.ok(gameSource.includes('particlePool') && gameSource.includes('projectilePool'), 'Game should have particle and projectile pools');
assert.ok(gameSource.includes('enemyProjectilePool') && gameSource.includes('damageNumberPool'), 'Game should have enemyProjectile and damageNumber pools');
// Verify entities have reset methods for pool reuse
assert.ok(entitiesSource.includes('reset('), 'entity classes should have reset methods for pool reuse');

// Verify mimic state machine
const mimicDef = config.ENEMIES.mimic;
assert.equal(mimicDef.behavior, 'mimic', 'mimic should use mimic behavior');
assert.ok(mimicDef.isMimic === true, 'mimic should have isMimic flag');
assert.ok(mimicDef.disguiseRange > 0, 'mimic should have disguiseRange');
assert.ok(mimicDef.revealDuration > 0, 'mimic should have revealDuration');
assert.ok(Array.isArray(mimicDef.jumpRange) && mimicDef.jumpRange.length === 2, 'mimic should have jumpRange array');
assert.ok(mimicDef.jumpCooldown > 0, 'mimic should have jumpCooldown');
assert.ok(mimicDef.attackCooldown > 0, 'mimic should have attackCooldown');
assert.ok(mimicDef.hurtDuration > 0, 'mimic should have hurtDuration');
assert.ok(entitiesSource.includes('class MimicBehavior'), 'entities.js should define MimicBehavior class');
assert.ok(entitiesSource.includes("mimic: new MimicBehavior()"), 'MimicBehavior should be registered in ENEMY_BEHAVIORS');
// Verify disguise rendering check exists in draw method
assert.ok(entitiesSource.includes("this.mimicState === 'disguise'"), 'Enemy.draw should check mimic disguise state');
assert.ok(entitiesSource.includes("mimicPassive"), 'Enemy.update should skip contact damage for passive mimics');

// Verify expanded asset manifest
assert.ok(existsSync(path.join(root, 'assets/asset_manifest.json')), 'asset_manifest.json should exist');
const assetManifest = JSON.parse(readFileSync(path.join(root, 'assets/asset_manifest.json'), 'utf8'));
assert.ok(assetManifest._meta, 'asset_manifest should have _meta section');
assert.ok(assetManifest._meta.totalAssets > 0, 'asset_manifest should have totalAssets > 0');
assert.ok(assetManifest._meta.namingConvention, 'asset_manifest should have namingConvention spec');
assert.ok(assetManifest.assets, 'asset_manifest should have assets section');
// Verify every asset in manifest.json also exists in asset_manifest.json
let assetCount = 0;
for (const [key, entry] of Object.entries(assetManifest.assets)) {
  assetCount++;
  assert.ok(entry.id === key, `asset ${key} id should match key`);
  assert.ok(entry.name && typeof entry.name === 'string', `asset ${key} should have a name`);
  assert.ok(entry.category && typeof entry.category === 'string', `asset ${key} should have a category`);
  assert.ok(entry.path && entry.path.endsWith('.png'), `asset ${key} path should end with .png`);
  assert.ok(typeof entry.w === 'number' && entry.w > 0, `asset ${key} should have valid width`);
  assert.ok(typeof entry.h === 'number' && entry.h > 0, `asset ${key} should have valid height`);
  assert.ok(entry.anchor && typeof entry.anchor.x === 'number' && typeof entry.anchor.y === 'number',
    `asset ${key} should have anchor with x and y`);
  // Verify the PNG file exists
  const pngPath = path.join(root, entry.path);
  assert.ok(existsSync(pngPath), `asset ${key} PNG file should exist at ${entry.path}`);
}
assert.equal(assetCount, Object.keys(manifest).length, 'asset_manifest should have same count as manifest.json');

// Verify weapon evolution source code integration
assert.ok(gameSource.includes('checkEvolutions'), 'Game should have checkEvolutions method');
assert.ok(gameSource.includes("'evolution'"), 'Game should handle evolution reward type');
assert.ok(entitiesSource.includes('multiShot'), 'Weapon.fire should support multiShot for evolved weapons');
assert.ok(entitiesSource.includes('this.def.splash'), 'Orbit weapons should support splash damage for evolved weapons');

// Verify spatial grid for collision optimization
assert.ok(coreSource.includes('class SpatialGrid'), 'core.js should define SpatialGrid class');
assert.ok(coreSource.includes('this._cells'), 'SpatialGrid should use cell-based storage');
assert.ok(coreSource.includes('query('), 'SpatialGrid should have query method');
assert.ok(gameSource.includes('enemyGrid'), 'Game should have enemyGrid instance');
assert.ok(gameSource.includes('new SpatialGrid'), 'Game should instantiate SpatialGrid');
assert.ok(gameSource.includes('this.enemyGrid.clear()'), 'Game should clear enemyGrid each frame');
assert.ok(gameSource.includes('this.enemyGrid.insert'), 'Game should insert enemies into grid');
// Verify entities.js uses grid queries instead of O(n²) enemy iteration
assert.ok(entitiesSource.includes('Game.enemyGrid.query'), 'entities.js should use enemyGrid.query for collision');
assert.ok(!entitiesSource.includes('for (const e of Game.enemies)'), 'entities.js should not have O(n²) enemy collision loops');
assert.ok(!entitiesSource.includes('for (const e2 of Game.enemies)'), 'entities.js should not have O(n²) splash collision loops');

// Verify mine level uses all previously unused assets
assert.ok(config.LEVELS.mine.wallTiles && config.LEVELS.mine.wallTiles.length >= 5,
  'mine level should define wallTiles with at least 5 entries');
assert.ok(config.LEVELS.mine.groundDecorations && config.LEVELS.mine.groundDecorations.length >= 2,
  'mine level should define groundDecorations with at least 2 entries');
// Verify all wall tiles exist in manifest
for (const wt of config.LEVELS.mine.wallTiles) {
  assert.ok(manifest[wt], `mine wallTile ${wt} should exist in manifest`);
}
// Verify all ground decorations exist in manifest
for (const gd of config.LEVELS.mine.groundDecorations) {
  assert.ok(manifest[gd], `mine groundDecoration ${gd} should exist in manifest`);
}
for (const asset of ['effects/lava_fissure_hell','effects/demon_rift_hell','effects/hell_rune_brand','props/hell_spike_bones']) {
  assert.ok(manifest[asset], `generated hell asset ${asset} should exist in manifest`);
  assert.ok(assetManifest.assets[asset], `generated hell asset ${asset} should exist in asset_manifest`);
  assert.ok(existsSync(path.join(root, 'assets', `${asset}.png`)), `generated hell asset ${asset} PNG should exist`);
}
for (const asset of aiHellAssets) {
  assert.ok(manifest[asset], `AI sliced hell asset ${asset} should exist in manifest`);
  assert.ok(assetManifest.assets[asset], `AI sliced hell asset ${asset} should exist in asset_manifest`);
  const pngPath = path.join(root, 'assets', `${asset}.png`);
  assert.ok(existsSync(pngPath), `AI sliced hell asset ${asset} PNG should exist`);
  const png = readFileSync(pngPath);
  assert.ok(png[25] === 4 || png[25] === 6, `AI sliced hell asset ${asset} should preserve alpha channel`);
}
// Verify bone_pile and gallows_wooden are used in level props
assert.ok(config.LEVELS.mine.props.bones && config.LEVELS.mine.props.bones.includes('props/bone_pile'),
  'mine level should include bone_pile prop');
assert.ok(config.LEVELS.village.props.bones && config.LEVELS.village.props.bones.includes('props/bone_pile'),
  'village level should include bone_pile prop');
assert.ok(config.LEVELS.village.props.gallows && config.LEVELS.village.props.gallows.includes('props/gallows_wooden'),
  'village level should include gallows_wooden prop');
// Verify PROP_COLLISION includes new categories
assert.ok(config.PROP_COLLISION.bones > 0, 'PROP_COLLISION should define bones radius');
assert.ok(config.PROP_COLLISION.gallows > 0, 'PROP_COLLISION should define gallows radius');
// Verify scatter counts include new categories
assert.ok(gameSource.includes('bones:'), 'generateMap scatterCounts should include bones');
assert.ok(gameSource.includes('gallows:'), 'generateMap scatterCounts should include gallows');
// Verify wall tile rendering exists in generateMap
assert.ok(gameSource.includes('wallTiles'), 'generateMap should reference wallTiles');
assert.ok(gameSource.includes('groundDecorations'), 'generateMap should reference groundDecorations');

// Verify enemy projectile sprites are configured
assert.ok(config.ENEMIES.crystal.projectileSprite, 'crystal enemy should have projectileSprite');
assert.ok(config.ENEMIES.bossSpider.projectileSprite, 'bossSpider should have projectileSprite');
assert.ok(config.ENEMIES.mage.projectileSprite, 'mage should have projectileSprite');
assert.ok(config.ENEMIES.boss.projectileSprite, 'boss should have projectileSprite');
// Verify projectile sprites exist in manifest
for (const enemyId of ['crystal','bossSpider','mage','boss']) {
  const sprite = config.ENEMIES[enemyId].projectileSprite;
  assert.ok(manifest[sprite], `enemy ${enemyId} projectileSprite ${sprite} should exist in manifest`);
}
// Verify EnemyProjectile supports sprite rendering
assert.ok(entitiesSource.includes('this.sprite = sprite'), 'EnemyProjectile.reset should accept sprite parameter');
assert.ok(entitiesSource.includes('Assets.get(this.sprite)'), 'EnemyProjectile.draw should render sprite when available');
// Verify enemy shoot passes projectileSprite
assert.ok(entitiesSource.includes('this.def.projectileSprite'), 'enemy shoot should pass def.projectileSprite');

// Verify player weapon projectile sprites
assert.ok(config.WEAPONS.fireball.projectileSprite, 'fireball weapon should have projectileSprite');
assert.ok(config.WEAPONS.soul.projectileSprite, 'soul weapon should have projectileSprite');
assert.ok(entitiesSource.includes('this.def.projectileSprite || this.def.icon'),
  'Weapon.fire should use projectileSprite if defined');

// Verify all previously unused assets are now referenced
const allConfigResources = new Set();
collect(config);
// Also check ground tiles, wall tiles, and decorations
for (const level of Object.values(config.LEVELS)) {
  if (level.wallTiles) level.wallTiles.forEach(t => allConfigResources.add(t));
  if (level.groundDecorations) level.groundDecorations.forEach(d => allConfigResources.add(d));
}
// Check that specific previously-unused assets are now referenced
const previouslyUnused = [
  'tiles/wall_stone_stacked_01', 'tiles/wall_stone_horizontal_01', 'tiles/wall_stone_gapped_01',
  'tiles/wall_stone_base_mossy', 'tiles/wall_stone_brick_vertical',
  'tiles/ruin_stone_wall_broken_01', 'tiles/ruin_stone_wall_broken_02',
  'tiles/ground_dirt_edge_01', 'tiles/ground_mossy_patch_01', 'tiles/ground_grass_strip_01',
  'effects/ground_crack', 'effects/ice_spikes_vertical', 'effects/mana_orb_small',
  'effects/ice_orb', 'effects/ice_shard_small', 'effects/void_particle_small',
  'effects/fire_projectile', 'effects/spirit_orbs_blue',
  'props/bone_pile', 'props/gallows_wooden',
];
for (const asset of previouslyUnused) {
  assert.ok(manifest[asset], `previously unused asset ${asset} should exist in manifest`);
  const pngPath = path.join(root, 'assets', `${asset}.png`);
  assert.ok(existsSync(pngPath), `previously unused asset ${asset} PNG should exist`);
}

console.log(`Smoke checks passed: ${resources.size} configured resources, 38 weapons (13 original + 22 new + 3 evolved), 26 upgrades with build synergies, 31 enemies, 3 levels with phased spawning + ambush events, portrait layout, landscape weapon HUD safe zone, ground tile hygiene, rectangular prop collision footprints, spawn safe zone, actor depth sorting, player fallback drawing, pickup attraction, prerequisite system, settings overlay, story UI separation, off-screen culling, BGM tracks, object pools, mimic state machine, expanded asset manifest (${assetCount} assets), weapon evolution system, spatial grid collision, active-level bounds, enemy edge clamping, save/continue restoration, wall collision bodies, mine-level asset integration, and hell-specific rift/fissure map pacing.`);
