import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jsDir = path.join(root, 'js');
const manifest = JSON.parse(readFileSync(path.join(root, 'assets/manifest.json'), 'utf8'));

for (const file of readdirSync(jsDir).filter((name) => name.endsWith('.js'))) {
  execFileSync(process.execPath, ['--check', path.join(jsDir, file)], { stdio: 'pipe' });
}

const configSource = readFileSync(path.join(jsDir, 'config.js'), 'utf8');
const context = {};
vm.runInNewContext(`${configSource}\nglobalThis.__CONFIG__ = CONFIG;`, context, { filename: 'js/config.js' });
const config = context.__CONFIG__;

assert.equal(Object.keys(config.WEAPONS).length, 10, 'expected 10 weapons');
assert.equal(config.UPGRADES.length, 20, 'expected 20 upgrades');
assert.equal(Object.keys(config.ENEMIES).length, 23, 'expected 23 enemies');
assert.ok(config.LEVELS.village && config.LEVELS.mine, 'expected village and mine levels');

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
for (const [id, enemy] of Object.entries(config.ENEMIES)) {
  assert.ok(enemy.name && enemy.sprite && enemy.hp > 0, `enemy ${id} is incomplete`);
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
const gameContext = {
  CONFIG: config,
  window: { innerWidth: 390, innerHeight: 844 },
  Math,
  pick: (items) => items[0],
};
vm.runInNewContext(`${gameSource}\nglobalThis.__GAME__ = Game;`, gameContext, { filename: 'js/game.js' });
const game = gameContext.__GAME__;
const visible = game.getVisibleCanvasRect();
const choiceLayout = game.getChoiceLayout(3);
assert.equal(game.isPortrait(), true, '390x844 viewport should use portrait layout');
assert.ok(visible.x > 0 && visible.x + visible.w <= config.CANVAS_W, 'portrait visible area should stay inside the canvas');
assert.equal(choiceLayout.cards.length, 3, 'portrait upgrade layout should contain three cards');
for (const card of choiceLayout.cards) {
  assert.ok(card.x >= visible.x && card.x + card.w <= visible.x + visible.w, 'portrait card should remain horizontally visible');
  assert.ok(card.y >= visible.y && card.y + card.h <= visible.y + visible.h, 'portrait card should remain vertically visible');
}

// Confirm the expanded pickup radius always attracts instead of producing a
// negative speed outside the original radius.
const entitiesSource = readFileSync(path.join(jsDir, 'entities.js'), 'utf8');
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

console.log(`Smoke checks passed: ${resources.size} configured resources, 10 weapons, 20 upgrades, 23 enemies, 2 levels with phased spawning, portrait layout, pickup attraction, prerequisite system, settings overlay, story UI separation, off-screen culling, BGM tracks, object pools, mimic state machine, expanded asset manifest (${assetCount} assets).`);
