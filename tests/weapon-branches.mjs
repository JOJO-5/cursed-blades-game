import assert from 'node:assert/strict';
import {runtime} from './helpers/runtime.mjs';
const {run,ctx}=runtime(['boss-combat','random-events','hero-skills','challenges','build-choices','weapon-branches']);
assert.equal(run('typeof Game.onBranchHit'),'function','Weapon branches produce actual combat effects');
run(`Audio2.hit=()=>{};Game.state='playing';Game.player.x=800;Game.player.y=800;Game.enemies=[];
function target(x,y,id=1){return {id,x,y,alive:true,radius:12,hp:10000,isBoss:false,takeDamage(d){this.hp-=d;}};}
function grid(enemies){Game.enemies=enemies;Game.enemyGrid.clear();enemies.forEach(e=>Game.enemyGrid.insert(e));}
function weapon(id,branch){const w=new Weapon(id,CONFIG.WEAPONS[id]);Game.restoreWeaponBranch(w,branch);Game.player.weapons=[w];w.angle=0;return w;}`);
run(`const close=weapon('sword','sword_close');const e=target(800+close.getRange(),800);grid([e]);for(let i=0;i<4;i++){close.angle=0;close.hitSet.clear();close.update(0,Game.player);}`);
assert.ok(run('e.hp<10000'));assert.equal(run('Game.player.branchGuard'),8);
run(`Game.player.invuln=0;Game.player.stats.armor=0;Game.player.activeSkill.active=0;const hp=Game.player.hp;Game.player.takeDamage(5);`);assert.equal(run('Game.player.hp'),run('hp'));assert.equal(run('Game.player.branchGuard'),3);
run(`const far=weapon('sword','sword_far');const returnTarget=target(850,800,2);grid([returnTarget]);far.angle=TAU-.01;far.update(.02,Game.player);`);assert.ok(run('returnTarget.hp<10000'),'Return path damages targets between hero and orbit');assert.ok(run('far.getRange()>CONFIG.WEAPONS.sword.range'));
run(`const hammer=weapon('hammer','hammer_fissure');const rock=target(860,800,3);grid([rock]);hammer.update(0,Game.player);const rockHp=rock.hp;Game.updateBranchEffects(.31);`);assert.ok(run('rock.hp<rockHp'),'Fissures deal delayed damage');
run(`const recoil=weapon('hammer','hammer_recoil');recoil.update(0,Game.player);`);assert.ok(run('rock.branchStagger>0'));
run(`const boss=target(860,800,4);boss.isBoss=true;grid([boss]);recoil.hitSet.clear();recoil.update(0,Game.player);`);assert.equal(run('boss.branchStagger||0'),0,'Bosses cannot be stun locked');
run(`const heavy=weapon('bow','bow_piercing');grid([target(900,800)]);Game.projectiles=[];heavy.update(0,Game.player);`);assert.equal(run('Game.projectiles.length'),1);assert.ok(run('Game.projectiles[0].pierce>=5'));assert.ok(run('heavy.getCooldown()>CONFIG.WEAPONS.bow.cooldown'));
run(`const bounce=weapon('bow','bow_bounce');const a=target(840,800,10),b=target(900,830,11),c=target(950,800,12);grid([a,b,c]);Game.projectiles=[];bounce.update(0,Game.player);const arrow=Game.projectiles[1];arrow.x=a.x;arrow.y=a.y;arrow.update(0);`);assert.equal(run('Game.projectiles.length'),3);assert.equal(run('arrow.branchBounces'),1);assert.ok(run('arrow.alive'));
run(`arrow.x=b.x;arrow.y=b.y;arrow.update(0);arrow.x=c.x;arrow.y=c.y;arrow.update(0);`);assert.equal(run('arrow.branchBounces'),0);assert.equal(run('arrow.alive'),false);assert.equal(run('arrow.hitEnemies.size'),3);
run(`const lone=weapon('shadow_imp','imp_lone');Game.player.stats.weaponCountBonus=4;Game.minions=[];lone.update(.01,Game.player);lone.cooldown=0;lone.update(.01,Game.player);`);assert.equal(run('Game.minions.length'),1,'Solitary summon stays solitary with bonus count');
run(`const swarm=weapon('shadow_imp','imp_swarm');Game.minions=[];swarm.update(.01,Game.player);const minion=Game.minions[0];const victim=target(minion.x,minion.y,20);grid([victim]);minion.lifetime=.01;minion.update(.02);const explodedHp=victim.hp;minion.update(.02);`);assert.equal(run('Game.minions.length'),3);assert.ok(run('explodedHp<10000'));assert.equal(run('victim.hp'),run('explodedHp'),'Expired minion explodes only once');
run(`Game.player.stats.weaponCountBonus=0;const evolved=weapon('sword','sword_close');Game.player.upgradeLevels.attackspeed=3;Game.state='chestReward';Game.generateChestReward(true);Game.selectChestReward(Game.chestRewardChoices.findIndex(c=>c.type==='evolution'));`);assert.equal(run('Game.player.weapons[0].id'),'sword_wind');assert.equal(run('Game.player.weapons[0].branch'),'sword_close');
for(const id of run('Object.keys(WeaponBranches)')){ctx.branchId=id;run(`{Game.state='playing';const b=WeaponBranches[branchId],w=weapon(b.base,branchId);w.level=6;grid([target(880,800)]);for(let i=0;i<120;i++)w.update(1/60,Game.player);}`);assert.ok(run('Game.projectiles.every(p=>Number.isFinite(p.damage+p.vx+p.vy))'));}
console.log('Eight weapon branches: real hit geometry, guard, return, fissure, stagger, ricochet, summons and evolution passed.');
