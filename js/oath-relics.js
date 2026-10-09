// Run-scoped rule relics. Secondary damage never invokes primary-hit effects.
const OathRelics={
 ember:{name:'余烬誓约',desc:'击败燃烧敌人留下 3 秒火种，每半秒灼烧附近敌人。触发间隔 0.8 秒，火种击杀不连锁。',color:'#e8a06f'},
 return:{name:'回锋誓约',desc:'每轮环刃命中三名不同敌人后，向第三名敌人释放一次 40% 伤害的回锋线。每圈限一次。',color:'#dbcb8c'},
 breaker:{name:'破盾誓约',desc:'守卫成功主动格挡后，10 秒内下次环刃命中释放 35% 伤害冲击。',color:'#a9cdda'},
 solitude:{name:'孤刃誓约',desc:'本局最多两把武器。首武器每 3 秒释放一次半伤害镜刃，扫击附近敌人。',color:'#c8b7e6'},
 spirit:{name:'契灵誓约',desc:'召唤物自然消失积累灵能，最多 3 层。下次主动技能消耗灵能，每层强化伤害 20%。',color:'#b5d8ba'},
 greed:{name:'贪行誓约',desc:'持币至少 30 时，每四次普通击杀额外获得 1 币；每 35 秒吸引追猎者，最多同时两名。',color:'#ead08a'}
};
(() => {
 const old={};for(const k of ['startNewGame','loadLevel','loadAndContinue','applyPlayerHitEffects','activateHeroSkill','updatePlaying','renderWorld','getBuildEntries','enforceChallenge'])old[k]=Game[k];
 const finite=(v,max,fallback=0)=>Number.isFinite(v)?clamp(v,0,max):fallback;
 Object.assign(Game,{
  resetOathRun(data){
   const ids=Array.isArray(data?.owned)?data.owned.filter(id=>OathRelics[id]):[];
   this.oathRun={owned:[...new Set(ids)],fields:[],emberCooldown:finite(data?.emberCooldown,.8),mirrorCooldown:finite(data?.mirrorCooldown,3),breakerTime:finite(data?.breakerTime,10),spiritCharges:Math.floor(finite(data?.spiritCharges,3)),skillPower:finite(data?.skillPower,1.6,1),skillTime:finite(data?.skillTime,1.3),greedKills:Math.floor(finite(data?.greedKills,3)),hunterTimer:finite(data?.hunterTimer,35,35),burden:Math.floor(finite(data?.burden,2))};
  },
  hasOathRelic(id){return !!this.oathRun?.owned.includes(id);},
  canAcquireOathRelic(id){return !!OathRelics[id]&&!this.hasOathRelic(id)&&(id!=='breaker'||this.player?.characterId==='warden')&&(id!=='solitude'||this.player?.weapons.length<=2);},
  acquireOathRelic(id){if(!this.canAcquireOathRelic(id))return false;this.oathRun.owned.push(id);this.enforceChallenge();this.addMessage('获得 '+OathRelics[id].name,OathRelics[id].color);this.saveProgress();return true;},
  enforceChallenge(){old.enforceChallenge?.call(this);if(this.hasOathRelic('solitude')&&this.player)this.player.weaponCapacity=Math.min(this.player.weaponCapacity,2);},
  serializeOathRun(){return {...this.oathRun,hunters:this.enemies.filter(e=>e.alive&&e.oathHunter).slice(0,2).map(e=>({x:e.x,y:e.y,hp:e.hp}))};},
  startNewGame(...a){this.resetOathRun();return old.startNewGame.apply(this,a);},
  loadLevel(...a){if(this.oathRun){this.oathRun.fields=[];this.oathRun.breakerTime=0;}const r=old.loadLevel.apply(this,a);this.enforceChallenge();return r;},
  loadAndContinue(){let data;try{data=JSON.parse(localStorage.getItem(this.saveKey)||'null');}catch{}this.resetOathRun(data?.oathRun);old.loadAndContinue.call(this);this.enforceChallenge();
   for(const f of (Array.isArray(data?.oathRun?.fields)?data.oathRun.fields:[]).slice(0,16))if(f.kind==='ember'&&Number.isFinite(f.x+f.y+f.damage)&&f.life>0)this.addOathField({...f,x:clamp(f.x,0,this.levelData.mapW*48),y:clamp(f.y,0,this.levelData.mapH*48),life:finite(f.life,3),tick:finite(f.tick,.5),damage:finite(f.damage,10000),r:52});
   // Restore the finite remaining window of a previously successful block.
   this.oathRun.breakerTime=finite(data?.oathRun?.breakerTime,10);
   for(const g of (Array.isArray(data?.oathRun?.hunters)?data.oathRun.hunters:[]).slice(0,2))if(Number.isFinite(g.x+g.y+g.hp)&&g.hp>0){const e=new Enemy('corrupted_knight',clamp(g.x,32,this.levelData.mapW*48-32),clamp(g.y,32,this.levelData.mapH*48-32));this.applyRunProfile?.(e);e.hp=Math.min(g.hp,e.maxHp);e.oathHunter=true;this.enemies.push(e);}
  },
  addOathField(f){if(this.oathRun.fields.length>=16)this.oathRun.fields.shift();this.oathRun.fields.push(f);},
  damageOathEnemy(e,damage,x,y){const previous=e._oathSecondary;e._oathSecondary=true;try{e.takeDamage(damage,false,0,x,y);}finally{e._oathSecondary=previous;}},
  oathAreaDamage(x,y,r,damage){for(const e of this.enemyGrid.query(x,y,r+60))if(e.alive&&dist(x,y,e.x,e.y)<r+e.radius)this.damageOathEnemy(e,damage,x,y);},
  oathReturnDamage(x,y,damage){const p=this.player,dx=x-p.x,dy=y-p.y,r=Math.hypot(dx,dy);for(const e of this.enemyGrid.query(p.x,p.y,r+60)){if(!e.alive)continue;const t=clamp(((e.x-p.x)*dx+(e.y-p.y)*dy)/(r*r||1),0,1);if(dist(e.x,e.y,p.x+t*dx,p.y+t*dy)<16+e.radius)this.damageOathEnemy(e,damage,p.x,p.y);}this.addOathField({kind:'return',x:p.x,y:p.y,tx:x,ty:y,life:.3,color:'#dbcb8c'});},
  applyPlayerHitEffects(e,damage,w,p,crit,opts){
   if(e&&w?.def?.type==='orbit'&&!opts?.secondary){
    if(this.hasOathRelic('return')){const turn=Math.floor(w.angle/TAU);if(w.oathTurn!==turn){w.oathTurn=turn;w.oathHits=new Set();w.oathReturned=false;}w.oathHits.add(e.id);if(w.oathHits.size>=3&&!w.oathReturned){w.oathReturned=true;this.oathReturnDamage(e.x,e.y,damage*.4);}}
    if(this.hasOathRelic('breaker')&&this.oathRun.breakerTime>0){this.oathRun.breakerTime=0;this.oathAreaDamage(e.x,e.y,75,damage*.35);this.addOathField({kind:'pulse',x:e.x,y:e.y,r:75,life:.35,color:'#a9cdda'});}
   }
   return old.applyPlayerHitEffects.call(this,e,damage,w,p,crit,opts);
  },
  activateHeroSkill(){const s=this.oathRun;if(!s)return old.activateHeroSkill.call(this);const power=s.skillPower,time=s.skillTime,charges=s.spiritCharges,start=this.projectiles.length;s.skillPower=this.hasOathRelic('spirit')?1+charges*.2:1;
   const ok=old.activateHeroSkill.call(this);if(!ok){s.skillPower=power;s.skillTime=time;return false;}
   s.spiritCharges=0;s.skillTime=1.3;for(const shot of this.projectiles.slice(start))shot.damage*=s.skillPower;this.saveProgress();return true;
  },
  spawnOathHunter(){if(this.enemies.filter(e=>e.alive&&e.oathHunter).length>=2)return false;const p=this.player;for(let i=0;i<16;i++){const a=i*TAU/16,x=p.x+Math.cos(a)*250,y=p.y+Math.sin(a)*250;if(x<40||y<40||x>this.levelData.mapW*48-40||y>this.levelData.mapH*48-40||this.isCircleBlocked(x,y,24))continue;const e=new Enemy('corrupted_knight',x,y);e.oathHunter=true;this.enemies.push(e);this.addMessage('贪行追猎者逼近','#e8b17c');return true;}return false;},
  updateOathRelics(dt){
   const s=this.oathRun,p=this.player;if(!s||!p?.alive||this.state!=='playing')return;
   for(const key of ['emberCooldown','mirrorCooldown','breakerTime','skillTime'])s[key]=Math.max(0,s[key]-dt);if(!s.skillTime)s.skillPower=1;
   for(const f of s.fields){f.life-=dt;if(f.kind==='ember'){f.tick-=dt;if(f.tick<=0&&f.life>0){f.tick+=.5;this.oathAreaDamage(f.x,f.y,f.r,f.damage);}}}s.fields=s.fields.filter(f=>f.life>0);
   if(this.hasOathRelic('solitude')&&s.mirrorCooldown<=0&&p.weapons.length&&this.enemies.some(e=>e.alive)){const w=p.weapons[0],r=clamp(w.getRange(),80,160);s.mirrorCooldown=3;this.oathAreaDamage(p.x,p.y,r,w.getDamage()*.5);this.addOathField({kind:'mirror',x:p.x,y:p.y,r,life:.35,color:'#c8b7e6'});}
   if(this.hasOathRelic('greed')&&this.runCoins>=30&&!this.bossSpawned){s.hunterTimer-=dt;if(s.hunterTimer<=0){s.hunterTimer=35;this.spawnOathHunter();}}else s.hunterTimer=35;
  },
  updatePlaying(dt){old.updatePlaying.call(this,dt);if(this.state==='playing')this.updateOathRelics(dt);},
  getBuildEntries(){const entries=old.getBuildEntries.call(this);if(this._buildTab==='relics'&&!this._weaponReplacement)for(const id of this.oathRun?.owned||[])entries.unshift({title:OathRelics[id].name,subtitle:'誓约遗物 · '+OathRelics[id].desc,description:OathRelics[id].desc});return entries;},
  renderWorld(){old.renderWorld.call(this);const c=this.ctx;c.save();c.translate(-this.camera.x-this.camera.shakeX,-this.camera.y-this.camera.shakeY);for(const f of this.oathRun?.fields||[]){c.strokeStyle=f.color||'#e8a06f';c.lineWidth=f.kind==='return'?3:2;c.globalAlpha=Math.min(.8,f.life*3);c.beginPath();if(f.kind==='return'){c.moveTo(f.x,f.y);c.lineTo(f.tx,f.ty);}else c.arc(f.x,f.y,f.kind==='ember'?f.r:f.r*(1-f.life/.35),0,TAU);c.stroke();
    if(f.kind==='ember'){c.fillStyle='#e8a06f';c.globalAlpha=.1;c.fill();for(let i=0;i<5;i++){const x=f.x+Math.cos(i*1.8)*32,y=f.y+Math.sin(i*1.8)*26,h=8+Math.sin(f.life*11+i)*3;c.globalAlpha=.7;c.fillStyle=i%2?'#e3a052':'#f0c785';c.beginPath();c.moveTo(x-4,y+3);c.lineTo(x+2,y-h);c.lineTo(x+4,y+3);c.closePath();c.fill();}}
    if(f.kind==='mirror')for(const offset of [0,Math.PI]){const a=(1-f.life/.35)*TAU+offset;c.save();c.translate(f.x+Math.cos(a)*f.r,f.y+Math.sin(a)*f.r);c.rotate(a+Math.PI/2);c.globalAlpha=Math.min(.75,f.life*4);c.fillStyle='#ddd5ec';c.beginPath();c.moveTo(0,-22);c.lineTo(5,-11);c.lineTo(3,11);c.lineTo(-3,11);c.lineTo(-5,-11);c.closePath();c.fill();c.fillStyle='#9c83bd';c.fillRect(-5,9,10,3);c.restore();}
   }c.restore();}
 });
 const die=Enemy.prototype.die;Enemy.prototype.die=function(...a){
  if(this.alive&&Game.oathRun){const s=Game.oathRun;if(!this._oathSecondary&&this.burnTimer>0&&Game.hasOathRelic('ember')&&s.emberCooldown<=0){s.emberCooldown=.8;Game.addOathField({kind:'ember',x:this.x,y:this.y,r:52,damage:6*Game.player.stats.damageMult,life:3,tick:.5});}
   if(Game.hasOathRelic('greed')&&Game.runCoins>=30&&!this.isBoss&&!this.isElite){s.greedKills++;if(s.greedKills>=4){s.greedKills=0;Game.runCoins++;}}
  }return die.apply(this,a);
 };
 const take=Player.prototype.takeDamage;Player.prototype.takeDamage=function(...a){const blocked=this.activeSkill?.blocked,r=take.apply(this,a);if(!blocked&&this.activeSkill?.blocked&&Game.hasOathRelic('breaker')){Game.oathRun.breakerTime=10;Game.addMessage('破盾冲击已蓄势','#a9cdda');Game.saveProgress();}return r;};
 const minionUpdate=Minion.prototype.update;Minion.prototype.update=function(dt){const alive=this.alive;minionUpdate.call(this,dt);if(alive&&!this.alive&&this.lifetime<=0&&Game.hasOathRelic('spirit'))Game.oathRun.spiritCharges=Math.min(3,Game.oathRun.spiritCharges+1);};
 const area=HeroSkills.damageArea;HeroSkills.damageArea=function(p,r,damage){return area.call(this,p,r,damage*(Game.oathRun?.skillPower||1));};
})();
