// Combat behavior for the eight branches. Secondary effects never recurse.
(() => {
 const oldHit=Game.applyPlayerHitEffects,oldUpdate=Game.updatePlaying,oldRender=Game.renderWorld;
 Game.branchEffects=[];
 Game.addBranchEffect=function(effect){if(this.branchEffects.length>=24)this.branchEffects.shift();this.branchEffects.push(effect);};
 Game.branchAreaDamage=function(x,y,r,damage){for(const e of this.enemyGrid.query(x,y,r+60))if(e.alive&&dist(x,y,e.x,e.y)<r+e.radius)e.takeDamage(damage,false,0,x,y);};
 Game.onBranchHit=function(e,damage,w,player,opts){
  if(opts?.secondary||!w?.branch)return;
  if(w.branch==='sword_close'){
   w.branchHits=(w.branchHits||0)+1;if(w.branchHits>=4){w.branchHits=0;player.branchGuard=Math.min(16,(player.branchGuard||0)+8);player.branchGuardTime=6;}
  }
  if(w.branch==='hammer_fissure'&&!(w.branchCooldown>0)){
   w.branchCooldown=.65;this.addBranchEffect({kind:'fissure',x:e.x,y:e.y,r:48,damage:damage*.22,life:1.15,tick:.3,color:WeaponBranches[w.branch].color});
  }
  if(w.branch==='hammer_recoil'&&!e.isBoss&&!(e.branchStaggerGrace>0)){e.branchStagger=.22;e.branchStaggerGrace=1.2;}
 };
 Game.applyPlayerHitEffects=function(e,damage,w,p,crit,opts){this.onBranchHit(e,damage,w,p,opts);return oldHit.call(this,e,damage,w,p,crit,opts);};
 Game.updateBranchEffects=function(dt){
  for(const f of this.branchEffects){f.life-=dt;if(f.kind==='fissure'){f.tick-=dt;if(f.tick<=0&&f.life>0){f.tick+=.3;this.branchAreaDamage(f.x,f.y,f.r,f.damage);}}}
  this.branchEffects=this.branchEffects.filter(f=>f.life>0);
 };
 Game.updatePlaying=function(dt){oldUpdate.call(this,dt);if(this.state==='playing')this.updateBranchEffects(dt);};
 const load=Game.loadLevel;Game.loadLevel=function(...a){this.branchEffects=[];return load.apply(this,a);};
 const continuation=Game.loadAndContinue;Game.loadAndContinue=function(...a){this.branchEffects=[];return continuation.apply(this,a);};
 Game.renderWorld=function(){
  oldRender.call(this);const c=this.ctx;c.save();c.translate(-this.camera.x,-this.camera.y);c.lineCap='round';
  for(const f of this.branchEffects){c.strokeStyle=f.color;c.globalAlpha=Math.min(.7,f.life*2);c.lineWidth=f.kind==='return'?3:2;c.beginPath();
   if(f.kind==='return'){c.moveTo(f.x,f.y);c.lineTo(f.tx,f.ty);}
   else if(f.kind==='fissure'){c.moveTo(f.x-40,f.y+10);c.lineTo(f.x-14,f.y-6);c.lineTo(f.x+6,f.y+4);c.lineTo(f.x+40,f.y-12);c.moveTo(f.x-14,f.y-6);c.lineTo(f.x-4,f.y-24);}
   else c.arc(f.x,f.y,f.r*(1-f.life/.35),0,TAU);c.stroke();
  }c.restore();
 };
 const weaponUpdate=Weapon.prototype.update;
 Weapon.prototype.update=function(dt,p){
  this.branchCooldown=Math.max(0,(this.branchCooldown||0)-dt);
  if(this.branch==='imp_lone'||this.branch==='imp_swarm'){
   this.cooldown-=dt;if(this.cooldown>0)return;
   const lone=this.branch==='imp_lone',limit=lone?1:Math.min(8,4+p.stats.weaponCountBonus),count=Game.minions.filter(m=>m.alive&&m.sourceWeapon===this.id).length;
   this.cooldown=(lone?2:3)*p.stats.cooldownMult/p.stats.attackSpeedMult;const spawn=Math.min(limit-count,lone?1:3);
   for(let i=0;i<spawn;i++){
    const a=(i/Math.max(1,spawn))*TAU+this.angle,r=65;
    const m=new Minion(p.x+Math.cos(a)*r,p.y+Math.sin(a)*r,this.getDamage()*(lone?1.85:.65),this.def.projectileSpeed*p.stats.projectileSpeedMult,(lone?20:3.5)+(p.stats.summonLifetimeBonus||0),this.def.color,lone?44:30,this.def.minionSprite||this.def.icon,this.def.name);
    m.sourceWeapon=this.id;m.branch=this.branch;Game.minions.push(m);
   }
   if(spawn>0)Audio2.play('triangle',180,.08,.025);return;
  }
  const angle=this.angle;weaponUpdate.call(this,dt,p);
  if(this.branch==='sword_far'&&Math.floor(angle/TAU)<Math.floor(this.angle/TAU)){
   const x=p.x+Math.cos(this.angle)*this.getRange(),y=p.y+Math.sin(this.angle)*this.getRange(),dx=p.x-x,dy=p.y-y;
   for(const e of Game.enemyGrid.query(p.x,p.y,this.getRange()+60)){if(!e.alive)continue;const t=clamp(((e.x-x)*dx+(e.y-y)*dy)/(dx*dx+dy*dy||1),0,1);if(dist(e.x,e.y,x+dx*t,y+dy*t)<e.radius+16)e.takeDamage(this.getDamage()*.55,false,0,x,y);}
   Game.addBranchEffect({kind:'return',x,y,tx:p.x,ty:p.y,life:.28,color:this.def.color});
  }
 };
 const fire=Weapon.prototype.fire;Weapon.prototype.fire=function(p){const start=Game.projectiles.length;fire.call(this,p);for(const shot of Game.projectiles.slice(start)){shot.branch=this.branch||null;if(this.branch==='bow_bounce'){shot.pierce=0;shot.branchBounces=2;}}};
 const reset=Projectile.prototype.reset;Projectile.prototype.reset=function(...a){reset.apply(this,a);this.branch=null;this.branchBounces=0;};
 const projectileUpdate=Projectile.prototype.update;Projectile.prototype.update=function(dt){
  if(!this.alive)return;const hits=this.hitEnemies.size;projectileUpdate.call(this,dt);
  if(this.branch!=='bow_bounce'||this.hitEnemies.size===hits||this.branchBounces<=0)return;
  let nearest=null,distance=180;for(const e of Game.enemyGrid.query(this.x,this.y,180)){if(!e.alive||this.hitEnemies.has(e.id))continue;const d=dist(this.x,this.y,e.x,e.y);if(d<distance){distance=d;nearest=e;}}
  if(nearest){const a=angleTo(this.x,this.y,nearest.x,nearest.y),speed=Math.hypot(this.vx,this.vy);this.vx=Math.cos(a)*speed;this.vy=Math.sin(a)*speed;this.angle=a;this.branchBounces--;this.alive=true;this.traveled=0;this.maxRange=180;}
 };
 const minionUpdate=Minion.prototype.update;Minion.prototype.update=function(dt){
  if(!this.alive)return;minionUpdate.call(this,dt);
  if(!this.alive&&this.branch==='imp_swarm'&&!this.branchExploded){this.branchExploded=true;Game.branchAreaDamage(this.x,this.y,62,this.damage*.9);Game.addBranchEffect({kind:'burst',x:this.x,y:this.y,r:62,life:.35,color:'#dfa0df'});}
 };
 const enemyUpdate=Enemy.prototype.update;Enemy.prototype.update=function(dt){this.branchStaggerGrace=Math.max(0,(this.branchStaggerGrace||0)-dt);if(this.branchStagger>0&&!this.isBoss){this.branchStagger=Math.max(0,this.branchStagger-dt);return;}enemyUpdate.call(this,dt);};
 const playerUpdate=Player.prototype.update;Player.prototype.update=function(dt){this.branchGuardTime=Math.max(0,(this.branchGuardTime||0)-dt);if(!this.branchGuardTime)this.branchGuard=0;playerUpdate.call(this,dt);};
 const draw=Player.prototype.draw;Player.prototype.draw=function(c){draw.call(this,c);if(this.branchGuard>0){c.save();c.strokeStyle='#9bd4ce';c.globalAlpha=.55;c.lineWidth=2;c.beginPath();c.arc(this.x,this.y-8,27,-Math.PI*.15,Math.PI*1.15);c.stroke();c.font='9px Courier New';c.textAlign='center';c.fillStyle='#c5f1e8';c.fillText('护盾 '+this.branchGuard,this.x,this.y-41);c.restore();}};
})();
