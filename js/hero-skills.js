// Independent character skills and saved cooldowns.
const HeroSkills={
  warden:{name:'格挡反击',cooldown:10,duration:1.2,color:'#9bbdd9',desc:'格挡 1.2 秒，首次格挡反击周围敌人。'},
  ranger:{name:'闪避齐射',cooldown:8,duration:.25,color:'#9dcfae',desc:'沿移动方向闪避，同时射出三支穿透箭。'},
  arcanist:{name:'蓄力爆发',cooldown:12,duration:.65,color:'#c6b1e1',desc:'蓄力 0.65 秒后爆发，命中周围敌人。'},
  get(p){return Game.getHeroSkillDefinition?.(p)||this[p.characterId]||this.warden;},
  reset(p,data){const d=this.get(p),number=(v,max)=>Number.isFinite(v)?clamp(v,0,max):0;p.activeSkill={cooldown:number(data?.cooldown,d.cooldown),active:number(data?.active,d.duration),charge:number(data?.charge,d.charge||.65),burst:number(data?.burst,.3),blocked:!!data?.blocked,used:Math.max(0,Math.floor(Number(data?.used)||0))};},
  damageArea(p,r,damage){let hits=0;for(const e of [...Game.enemies])if(e.alive&&dist(p.x,p.y,e.x,e.y)<=r+e.radius){e.takeDamage(damage*p.stats.damageMult,false,95,p.x,p.y);hits++;}return hits;},
  burst(p){p.activeSkill.charge=0;p.activeSkill.active=0;p.activeSkill.burst=.3;this.damageArea(p,170,55);Audio2.play('triangle',160,.2,.07);Game.addMessage('奥术爆发','#c6b1e1');Game.saveProgress();}
};
(() => {
  const old={};for(const k of ['loadLevel','loadAndContinue','renderHUD','updateThemeHazards'])old[k]=Game[k];
  const update=Player.prototype.update,take=Player.prototype.takeDamage,draw=Player.prototype.draw;
  Object.assign(Game,{
    loadLevel(...a){const r=old.loadLevel.apply(this,a);HeroSkills.reset(this.player);return r;},
    loadAndContinue(){let data;try{data=JSON.parse(localStorage.getItem(this.saveKey)||'null');}catch{}old.loadAndContinue.call(this);HeroSkills.reset(this.player,data?.activeSkill);},
    getHeroSkillButton(){const v=this.getVisibleCanvasRect();return {x:v.x+v.w-102,y:v.y+v.h-252,w:64,h:64};},
    activateHeroSkill(){
      const p=this.player;if(this.state!=='playing'||!p?.alive||this.bossDefeated)return false;
      if(!p.activeSkill)HeroSkills.reset(p);const s=p.activeSkill,d=HeroSkills.get(p);if(s.cooldown>0||s.active>0)return false;
      s.cooldown=d.cooldown;s.active=d.duration;s.blocked=false;s.used++;
      if(p.characterId==='ranger'){
        const angle=p.moveAngle||0;p.dashDir={x:Math.cos(angle),y:Math.sin(angle)};p.dashTimer=.2;p.invuln=Math.max(p.invuln,.25);
        const target=this.enemies.filter(e=>e.alive).sort((a,b)=>dist(p.x,p.y,a.x,a.y)-dist(p.x,p.y,b.x,b.y))[0],aim=target?angleTo(p.x,p.y,target.x,target.y):angle;
        for(const offset of [-.15,0,.15]){const a=aim+offset;this.projectiles.push(this.projectilePool.obtain(p.x,p.y,Math.cos(a)*400,Math.sin(a)*400,22*p.stats.damageMult*p.stats.projectileDamageMult,520,1,p.stats.critChanceBonus,1.5,'#a7d7b3','weapons/arrow',20,'bow'));}
      }else if(p.characterId==='arcanist')s.charge=.65;
      this.addMessage(d.name,d.color);Audio2.play('sine',p.characterId==='warden'?250:420,.1,.05);this.saveProgress();return true;
    },
    updateThemeHazards(dt){old.updateThemeHazards.call(this,dt);if(this.player?.activeSkill?.charge>0)this.environmentSpeedMult*=.8;},
    renderHUD(){old.renderHUD.call(this);const p=this.player;if(!p)return;const c=this.ctx,r=this.getHeroSkillButton(),s=p.activeSkill||{},d=HeroSkills.get(p);c.save();c.fillStyle='rgba(14,25,21,.82)';c.fillRect(r.x,r.y,r.w,r.h);c.strokeStyle=d.color;c.lineWidth=s.active>0?3:1;c.strokeRect(r.x,r.y,r.w,r.h);c.textAlign='center';c.fillStyle=s.cooldown>0?'#8a9c91':d.color;c.font='bold 15px Courier New';c.fillText(s.cooldown>0?Math.ceil(s.cooldown)+'s':'Q',r.x+32,r.y+25);c.font='10px Courier New';c.fillText(d.name,r.x+32,r.y+46);if(s.cooldown>0){c.strokeStyle=d.color;c.lineWidth=2;c.beginPath();c.arc(r.x+32,r.y+31,29,-Math.PI/2,-Math.PI/2+TAU*(1-s.cooldown/d.cooldown));c.stroke();}c.restore();}
  });
  Player.prototype.update=function(dt){
    if(!this.activeSkill)HeroSkills.reset(this);const s=this.activeSkill;
    if(Game.state==='playing'){
      s.cooldown=Math.max(0,s.cooldown-dt);s.active=Math.max(0,s.active-dt);s.burst=Math.max(0,s.burst-dt);
      if(s.charge>0){s.charge=Math.max(0,s.charge-dt);if(s.charge<=0)HeroSkills.burst(this);}
    }
    const r=update.call(this,dt);if(Game.state==='playing'){const b=Game.getHeroSkillButton();if(Input.wasPressed('KeyQ')||Input.consumeClick(b.x,b.y,b.w,b.h))Game.activateHeroSkill();}return r;
  };
  Player.prototype.takeDamage=function(amount){const s=this.activeSkill;
    if(this.characterId==='warden'&&s?.active>0&&this.alive&&this.invuln<=0&&Game.state==='playing'){
      if(!s.blocked){s.blocked=true;HeroSkills.damageArea(this,125,32);Game.addMessage('格挡反击成功','#9bbdd9');Game.saveProgress();}return;
    }return take.call(this,amount);
  };
  Player.prototype.draw=function(c){draw.call(this,c);const s=this.activeSkill;if(!s||(s.active<=0&&s.burst<=0))return;const d=HeroSkills.get(this);c.save();c.strokeStyle=d.color;c.lineWidth=2;c.globalAlpha=.65;c.beginPath();
    if(this.characterId==='warden'){c.moveTo(this.x-30,this.y-25);c.lineTo(this.x+30,this.y-25);c.lineTo(this.x+27,this.y+12);c.lineTo(this.x,this.y+30);c.lineTo(this.x-27,this.y+12);c.closePath();}
    else {const r=s.burst>0?40+(1-s.burst/.3)*130:24+(1-s.charge/(d.charge||.65))*15;c.arc(this.x,this.y,r,0,TAU);}
    c.stroke();c.restore();
  };
})();
