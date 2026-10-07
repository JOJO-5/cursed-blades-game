import assert from 'node:assert/strict';
import {runtime} from './helpers/runtime.mjs';
const {run,ctx}=runtime(['boss-combat']);
for(const id of ['boss','bossSpider','bossDragon','frostWarden','tideKeeper']){
  ctx.id=id;
  for(const phase of [1,2]){ctx.phase=phase;const r=run(`(()=>{const b=new Enemy(id,700,700);b.phase=phase;Game.enemies=[b];const p=Game.player;p.x=950;p.y=700;let actions=[];for(let i=0;i<2;i++){b.pickNextAbility(p,250);actions.push(b.currentAbility);for(const e of b.signatureEffects){if(!Number.isFinite(e.x+e.y+e.r+e.life))throw Error('Nonfinite geometry');}const locked=b.abilityDir;p.y+=70;b.updateBoss(.2,p,250);if(b.abilityDir!==locked)throw Error('Aim tracks during warning');for(let j=0;j<40;j++)b.updateBoss(.05,p,250);}return actions;})()`);assert.equal(new Set(r).size,2,id+': two distinct signature actions');}
}
run('Game.enemies=[];const e={kind:"cone",x:0,y:0,r:200,angle:0,arc:1,width:20};');
assert.equal(run('BossCombat.hit(e,{x:100,y:0,radius:12})'),true);
assert.equal(run('BossCombat.hit(e,{x:0,y:100,radius:12})'),false,'Cone has an escape direction');
assert.equal(run('BossCombat.hit({...e,kind:"ring",r:150},{x:150,y:0,radius:12})'),false,'Ring has a safe gap');
assert.equal(run('BossCombat.hit({...e,kind:"circle",safe:{x:90,y:0,r:50}},{x:90,y:0,radius:12})'),false,'Marked island is safe');
run('const b=new Enemy("frostWarden",700,700);b.signatureEffects=[{kind:"wall",x:900,y:700,halfW:13,halfH:70,warn:1,life:2}];Game.enemies=[b]');
assert.equal(run('Game.isCircleBlocked(900,700,12)'),false,'Warning wall is passable');
run('b.signatureEffects[0].warn=0');assert.equal(run('Game.isCircleBlocked(900,700,12)'),true);
run('b.alive=false');assert.equal(run('Game.isCircleBlocked(900,700,12)'),false,'Death removes ice walls');
run('Game.player.alive=true;Game.player.hp=Game.player.getMaxHp();Game.player.invuln=0;const h=Game.player.hp;b.alive=true;b.bossState="recover";b.stateTimer=99;b.signatureEffects=[{kind:"circle",x:Game.player.x,y:Game.player.y,r:60,warn:.1,life:.5,damage:10,tick:0,angle:0}];b.updateBoss(.05,Game.player,100)');
assert.equal(run('Game.player.hp'),run('h'),'Warning cannot damage');
run('b.updateBoss(.06,Game.player,100);b.updateBoss(.02,Game.player,100)');assert.ok(run('Game.player.hp<h'),'Active signature deals real player damage');
console.log('Five distinct boss rotations, fixed warnings, escape geometry, islands and temporary wall collision passed.');

