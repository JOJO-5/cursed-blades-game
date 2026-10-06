import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const ctx = vm.createContext({ console, Math, window: { innerWidth: 390, innerHeight: 844 } });
for (const file of ['config', 'core', 'entities', 'game']) {
  vm.runInContext(readFileSync(new URL(`../js/${file}.js`, import.meta.url), 'utf8'), ctx);
}
const results = vm.runInContext(`
  Game.player = new Player(960, 720);
  Game.particles = [];
  Game.particlePool = { obtain: () => ({}) };
  Game.applyPlayerHitEffects = () => {};
  Audio2.hit = () => {};
  Audio2.play = () => {};
  const samples = [];
  for (const level of [1, 6]) {
    const weapon = new Weapon('sword', CONFIG.WEAPONS.sword);
    weapon.level = level; weapon.angle = 0;
    let hits = 0;
    const enemy = {id:1,alive:true,radius:14,x:960+weapon.getRange()+40,y:720,takeDamage:()=>hits++};
    Game.enemyGrid = { query: () => [enemy] };
    weapon.update(0, Game.player);
    samples.push({level, hits});
  }
  samples;
`, ctx);
assert.equal(results[0].hits, 0, 'Lv.1 sword should miss an enemy outside its visible blade');
assert.equal(results[1].hits, 1, 'Lv.6 sword should hit where its larger visible blade reaches');
console.log('Reliability regression passed: weapon level changes effective hit volume.');
const dash = vm.runInContext(`
  Game.levelData = CONFIG.LEVELS.village;
  Game.player = new Player(960,720);
  Game.player.moveAngle = Math.PI / 2;
  Game.enemyGrid = {query:()=>[]};
  Game.resolvePropCollision = ()=>{};
  Input.keys = {}; Input._justPressed = {Space:true};
  Game.player.update(1/60);
  ({cooldown:Game.player.dashCooldown, direction:Game.player.dashDir});
`, ctx);
assert.ok(dash.cooldown > 0, 'Dash must respond while stationary');
assert.ok(dash.direction.y > .99, 'Stationary dash should use the last movement direction');
console.log('Reliability regression passed: stationary dash uses the last facing direction.');
