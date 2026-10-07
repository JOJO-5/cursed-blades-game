import assert from 'node:assert/strict';
import {runtime} from './helpers/runtime.mjs';
const {run,ctx}=runtime(['boss-combat','random-events']);
assert.equal(run('Array.isArray(Game.randomEvents)&&Game.randomEvents.length===2'),true,'A new map offers two optional events');
const seen=new Set();
for(const seed of [1,7,42,77,123,909]){ctx.seed=seed;run('Game.runSeed=seed;Game.loadLevel("village")');const a=run('JSON.stringify(Game.randomEvents.map(e=>[e.kind,e.x,e.y]))');run('Game.loadLevel("village")');assert.equal(run('JSON.stringify(Game.randomEvents.map(e=>[e.kind,e.x,e.y]))'),a);for(const k of run('Game.randomEvents.map(e=>e.kind)'))seen.add(k);assert.equal(run('Game.randomEvents.every(e=>!Game.isCircleBlocked(e.x,e.y,22))'),true);}
assert.equal(seen.size,4,'All four events appear across seeds');
for(const kind of ['merchant','altar','rescue','bounty']){ctx.kind=kind;run('Game.state="menu";Game.startNewGame();for(let eventSeed=1;eventSeed<40;eventSeed++){Game.runSeed=eventSeed;Game.loadLevel("village");if(Game.randomEvents[0].kind===kind)break;}var s=Game.randomEvents[0];s.status="ready";Game.player.x=s.x;Game.player.y=s.y;Game.runCoins=20;');
  assert.equal(run('Game.openRandomEvent(s)'),true);
  const hp=run('Game.player.hp');assert.equal(run('Game.acceptRandomEvent(s)'),true);
  if(kind==='merchant'){assert.equal(run('Game.runCoins'),12);assert.equal(run('Game.player.weapons[0].level'),2);}
  if(kind==='altar')assert.ok(run('Game.player.hp')<hp);
  if(['rescue','bounty'].includes(kind)){run('Game.state="playing";Game.saveProgress();Game.loadAndContinue()');assert.equal(run('Game.randomEvents[0].status'),'active');assert.ok(run('Game.enemies.some(e=>e.eventId===Game.randomEvents[0].id)'));run('Game.enemies=Game.enemies.filter(e=>!e.eventId);Game.player.x=Game.randomEvents[0].x;Game.player.y=Game.randomEvents[0].y;Game.updateRandomEvents(9)');}
  assert.equal(run('Game.randomEvents[0].status'),'complete');
  const after=run('JSON.stringify([Game.player.stats,Game.runCoins,Game.pickups.length])');run('Game.acceptRandomEvent(Game.randomEvents[0]);Game.updateRandomEvents(9)');assert.equal(run('JSON.stringify([Game.player.stats,Game.runCoins,Game.pickups.length])'),after,'No duplicate reward');
  run('Game.saveProgress();Game.loadAndContinue()');assert.equal(run('Game.randomEvents[0].status'),'complete');
}
run('Game.startNewGame();const rescue=Game.randomEvents[0];rescue.kind="rescue";rescue.status="ready";Game.player.x=rescue.x;Game.player.y=rescue.y;Game.openRandomEvent(rescue);Game.acceptRandomEvent(rescue);Game.levelTime=rescue.deadline+1;Game.updateRandomEvents(.1)');assert.equal(run('rescue.status'),'expired','Rescue can time out without granting reward');
console.log('Seeded optional events, safe placement, prices, guard saves, rescue timeout and idempotent rewards passed.');

