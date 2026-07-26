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
assert.equal(Object.keys(config.ENEMIES).length, 17, 'expected 17 enemies');
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

console.log(`Smoke checks passed: ${resources.size} configured resources, 10 weapons, 20 upgrades, 17 enemies, 2 levels with phased spawning, portrait layout, pickup attraction.`);
