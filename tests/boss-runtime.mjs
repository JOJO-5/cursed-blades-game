import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const ctx=vm.createContext({console,Math,window:{}});
for(const file of ['config','core','entities','game','expansion'])vm.runInContext(readFileSync(new URL(`../js/${file}.js`,import.meta.url),'utf8'),ctx);
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

run('Game.particlePool={obtain:()=>({})};Game.particles=[];Game.spawnDamageNumber=()=>{};Audio2.hitMaterial=()=>{};Audio2.boss=()=>{};let phaseMessage="";Game.addMessage=m=>{phaseMessage=m};');
for(const id of bosses){ctx.bossId=id;const phase=run('(()=>{const b=new Enemy(bossId,200,200);b.hp=b.maxHp*b.def.enrageHpPct+1;b.takeDamage(2);return {name:b.def.name,message:phaseMessage,phase:b.phase};})()');assert.equal(phase.phase,2);assert.ok(phase.message.includes(phase.name),id+': phase announcement uses own identity');}
const sprites=run('Object.values(CONFIG.ENEMIES).filter(e=>e.behavior==="boss").map(e=>e.sprite)');
assert.equal(new Set(sprites).size,sprites.length,'Bosses must have distinct silhouettes');
console.log('All five boss silhouettes and phase announcements passed.');
