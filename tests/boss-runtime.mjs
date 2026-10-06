import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const ctx=vm.createContext({console,Math,window:{}});
for(const file of ['config','core','entities','game'])vm.runInContext(readFileSync(new URL(`../js/${file}.js`,import.meta.url),'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
run('Audio2.play=()=>{};Game.addMessage=()=>{};Game.shakeScreen=()=>{};');
const bosses=run('Object.keys(CONFIG.ENEMIES).filter(id=>CONFIG.ENEMIES[id].behavior==="boss")');
for(const id of bosses){
  ctx.bossId=id;
  const result=run(`(()=>{const b=new Enemy(bossId,200,200),p={x:300,y:300};b.phase=2;b.doHazard(p);b.doCharge(p);return {hazard:b.hazards[0],vx:b.chargeVx,vy:b.chargeVy,windups:['cleave','fanShot','charge','swordThrow'].map(a=>b.getWindupDuration(a)),count:b.def.fanShotCount};})()`);
  for(const field of ['r','life','maxLife','damage'])assert.ok(Number.isFinite(result.hazard[field])&&result.hazard[field]>0,`${id}: valid hazard ${field}`);
  assert.ok(Number.isFinite(result.vx)&&Number.isFinite(result.vy),`${id}: finite charge velocity`);
  assert.ok(result.windups.every(v=>Number.isFinite(v)&&v>0),`${id}: abilities leave windup`);
  assert.ok(Number.isInteger(result.count)&&result.count>0,`${id}: actual fan projectiles`);
}
console.log('All boss phase-two hazards, charges, windups and projectile counts are finite.');
