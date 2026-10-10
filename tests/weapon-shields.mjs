import assert from 'node:assert/strict';
import {runtime} from './helpers/runtime.mjs';
const {run,ctx}=runtime(['scene','weapon-visuals']);
for(const id of ['shield','shield_round_buckler'])for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
 ctx.id=id;ctx.angle=angle;
 run('Game.player=new Player(400,400);Game.player.weapons=[new Weapon(id,CONFIG.WEAPONS[id])];Game.player.weapons[0].angle=angle;Game.particles=[];Game.player.invuln=0;{const w=Game.player.weapons[0];Game._shot=new EnemyProjectile(400+Math.cos(angle)*w.getRange(),400+Math.sin(angle)*w.getRange(),0,0,20,"#fff",500);Game._shot.update(.01);}');
 assert.equal(run('Game._shot.alive'),false,id+': actual orbit shield intercepts incoming projectile');
 assert.equal(run('Game.player.hp'),run('Game.player.getMaxHp()'),id+': interception does not damage the player');
 run('Game._miss=new EnemyProjectile(400-Math.cos(angle)*120,400-Math.sin(angle)*120,0,0,20,"#fff",500);Game._miss.update(.01);');
 assert.equal(run('Game._miss.alive'),true,id+': outside shield remains an active projectile');
 run('Game.player.invuln=0;Game.player.takeDamage(20);');
 assert.equal(run('Game.player.getMaxHp()-Game.player.hp'),id==='shield'?14:12,id+': actual contact reduction remains in effect');
}
run('Game.player=new Player(400,400);Game.player.weapons=[new Weapon("sword",CONFIG.WEAPONS.sword)];Game._shot=new EnemyProjectile(475,400,0,0,20,"#fff",500);Game._shot.update(.01);');
assert.equal(run('Game._shot.alive'),true,'Ordinary orbit weapons do not gain shield interception');
console.log('Both shield weapons intercept real projectiles in four directions, preserve contact reduction and do not block outside the orbit.');
