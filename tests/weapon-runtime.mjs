import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const ctx=vm.createContext({console,Math,window:{}});
for(const file of ['config','core','entities','game','expansion'])vm.runInContext(readFileSync(new URL(`../js/${file}.js`,import.meta.url),'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
run(`Game.player=new Player(192,192);Game.particles=[];Game.projectiles=[];Game.minions=[];Game.levelData=CONFIG.LEVELS.village;
Game.particlePool={obtain:(...args)=>new Particle(...args)};Game.projectilePool={obtain:(...args)=>new Projectile(...args)};
Game.minionPool={obtain:(...args)=>new Minion(...args)};Game.applyPlayerHitEffects=()=>{};Game.shakeScreen=()=>{};Audio2.play=()=>{};Audio2.hit=()=>{};
const target={id:1,alive:true,x:240,y:192,radius:20,takeDamage:()=>{}};Game.enemyGrid={query:()=>[target]};`);
for(const id of run('Object.keys(CONFIG.WEAPONS)')){
 ctx.id=id;const results=run(`(()=>{const w=new Weapon(id,CONFIG.WEAPONS[id]);w.angle=0;Game.projectiles=[];Game.minions=[];w.update(1/60,Game.player);return {type:w.def.type,angle:w.angle,projectiles:Game.projectiles.map(p=>({x:p.x,y:p.y,vx:p.vx,vy:p.vy,damage:p.damage,maxRange:p.maxRange})),minions:Game.minions.length}})()`);
 assert.ok(Number.isFinite(results.angle),id+': finite attack angle after a real update');
 if(['projectile','ranged','homing'].includes(results.type)){assert.ok(results.projectiles.length>0,id+': actually fires');for(const p of results.projectiles)for(const [key,value] of Object.entries(p))assert.ok(Number.isFinite(value),id+': finite '+key);}
 if(results.type==='summon')assert.ok(results.minions>0,id+': actually summons');
}
console.log('All 38 weapons execute real updates; projectile positions, velocities, damage and range remain finite.');
// Crowded heavy hits retain all damage while avoiding repeated camera resets.
run(`Game.player=new Player(192,192);Game.player.stats.critChance=0;Game.particles=[];let shakes=0,hits=0;
Game.shakeScreen=()=>shakes++;const crowd=[1,2,3].map(id=>({id,alive:true,x:272,y:192,radius:18,takeDamage:()=>hits++}));Game.enemyGrid={query:()=>crowd};
const hammer=new Weapon('hammer_meteor',{...CONFIG.WEAPONS.hammer_meteor,critChance:0});hammer.angle=0;hammer.update(0,Game.player);`);
assert.equal(run('shakes'),1,'Crowded impact triggers one brief camera shake');
assert.equal(run('hits'),9,'All primary and splash hits retain their damage');
assert.ok(run('Game.particles.filter(p=>p.weaponImpact).every(p=>p.x===272&&p.y===192)'), 'Heavy shockwaves originate at the actual struck enemy');
run('const reused=new Particle(0,0,0,0,"#fff",1,1);reused.weaponImpact=true;reused.reset(0,0,0,0,"#fff",1,1)');
assert.equal(run('reused.weaponImpact'),false,'A reused normal particle cannot retain a heavy impact shape');
console.log('Crowded heavy strikes preserve damage, bound camera shake, anchor impacts and reset pooled effects.');
