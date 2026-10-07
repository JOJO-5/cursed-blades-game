import assert from 'node:assert/strict';
import {runtime} from './helpers/runtime.mjs';
const {run,ctx}=runtime(['boss-combat','random-events','hero-skills']);
assert.equal(run('typeof Game.activateHeroSkill'),'function','Characters have an active skill');
for(const hero of ['warden','ranger','arcanist']){ctx.hero=hero;run('Game.state="menu";Game.selectedCharacter=hero;Game.startNewGame();Game.player.invuln=0;Game.player.x=800;Game.player.y=800;Game.enemies=[];Game.state="playing";');
  assert.equal(run('Game.activateHeroSkill()'),true);assert.equal(run('Game.activateHeroSkill()'),false,'Cooldown prevents repeated activation');
  if(hero==='warden'){run('const guardHp=Game.player.hp;Game.player.takeDamage(40)');assert.equal(run('Game.player.hp'),run('guardHp'));assert.equal(run('Game.player.activeSkill.blocked'),true);}
  if(hero==='ranger'){assert.equal(run('Game.projectiles.length'),3);assert.ok(run('Game.projectiles.every(p=>Number.isFinite(p.vx+p.vy))'));}
  if(hero==='arcanist'){run('const target=new Enemy("skeleton",850,800);target.hp=target.maxHp=1000;Game.enemies=[target];const targetHp=target.hp;Game.player.update(.3)');assert.equal(run('target.hp'),run('targetHp'),'Charge is not an instant blast');run('Game.player.update(.4)');assert.ok(run('target.hp<targetHp'),'Charge releases real damage');}
  const cooldown=run('Game.player.activeSkill.cooldown');run('Game.state="paused";Game.update(.4)');assert.equal(run('Game.player.activeSkill.cooldown'),cooldown,'Paused skills freeze');
  run('Game.saveProgress();Game.loadAndContinue()');assert.equal(run('Game.player.activeSkill.cooldown'),cooldown,'Reload retains cooldown');
  run('Game.loadLevel("mine")');assert.equal(run('Game.player.activeSkill.cooldown'),0,'Transition clears transient stance');
  run('Game.state="gameover"');assert.equal(run('Game.activateHeroSkill()'),false,'Cannot cast after death');
}
console.log('Three active skills, actual block/projectiles/charged damage, cooldown, pause, save and transition passed.');
