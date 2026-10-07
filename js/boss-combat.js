// Signature geometry is shared by warnings, collision, and the live renderer.
const BossCombat={
  profiles:{boss:['knightLunge','pursuitSlash'],bossSpider:['webFan','broodNest'],bossDragon:['dragonBreath','lavaFall'],frostWarden:['iceWalls','shatter'],tideKeeper:['tideRing','safeIslands']},
  names:{knightLunge:'锁定冲锋',pursuitSlash:'追击斩',webFan:'蛛网扇面',broodNest:'孵化巢',dragonBreath:'扫射吐息',lavaFall:'熔岩落点',iceWalls:'冰墙封路',shatter:'碎冰冲击',tideRing:'潮汐环',safeIslands:'净潮安全岛'},
  safePoint(x,y,angle,radius=90){
    const w=Game.levelData.mapW*CONFIG.TILE_SIZE,h=Game.levelData.mapH*CONFIG.TILE_SIZE;
    for(let i=0;i<8;i++){const a=angle+i*TAU/8,p={x:x+Math.cos(a)*radius,y:y+Math.sin(a)*radius,r:54};if(p.x>65&&p.y>65&&p.x<w-65&&p.y<h-65&&!Game.isCircleBlocked(p.x,p.y,54))return p;}
    return {x,y,r:54};
  },
  hit(e,p){
    if(e.safe&&dist(p.x,p.y,e.safe.x,e.safe.y)<e.safe.r-p.radius)return false;
    const dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy),a=Math.abs(normalizeAngle(Math.atan2(dy,dx)-e.angle));
    if(e.kind==='cone')return d<e.r+p.radius&&a<e.arc/2;
    if(e.kind==='lane'){const x=dx*Math.cos(e.angle)+dy*Math.sin(e.angle),y=-dx*Math.sin(e.angle)+dy*Math.cos(e.angle);return x>=-p.radius&&x<=e.r+p.radius&&Math.abs(y)<e.width/2+p.radius;}
    if(e.kind==='ring')return Math.abs(d-e.r)<e.width/2+p.radius&&a>.45;
    if(e.kind==='wall')return Math.abs(dx)<e.halfW+p.radius&&Math.abs(dy)<e.halfH+p.radius;
    return d<e.r+p.radius;
  },
  make(b,p,ability){
    const base={x:b.x,y:b.y,angle:b.abilityDir,r:140,width:34,arc:1.5,warn:1.1,life:.5,tick:0,damage:b.damage*.85,color:'#ec977a',ability};
    const add=o=>({...base,...o});
    switch(ability){
      case 'knightLunge':return [add({kind:'lane',r:300,width:54,life:.65})];
      case 'pursuitSlash':return [add({kind:'cone',r:155,arc:1.8,life:.3})];
      case 'webFan':return [-.6,0,.6].map(a=>add({kind:'lane',angle:base.angle+a,r:340,width:28,life:2.5,damage:b.damage*.45,slow:.55,color:'#d5c6ad'}));
      case 'broodNest':return [add({kind:'nest',x:p.x+Math.cos(base.angle+1.57)*110,y:p.y+Math.sin(base.angle+1.57)*110,r:48,life:2,color:'#b5c883'})];
      case 'dragonBreath':return [add({kind:'cone',r:330,arc:1.5,life:1.6,sweep:true,color:'#fbb364'})];
      case 'lavaFall':return [-90,0,90].map(x=>add({kind:'circle',x:p.x+x,y:p.y+(x?65:0),r:48,life:3,color:'#f38a49'}));
      case 'iceWalls':return [-78,78].map(x=>add({kind:'wall',x:p.x+x,y:p.y,r:52,halfW:13,halfH:70,life:3,damage:0,color:'#a2d9ed'})).filter(e=>!Game.isCircleBlocked(e.x,e.y,80));
      case 'shatter':return [-.75,-.25,.25,.75].map(a=>add({kind:'lane',angle:base.angle+a,r:300,width:24,life:.4,color:'#a2d9ed'}));
      case 'tideRing':return [add({kind:'ring',r:80,width:28,life:2.4,expand:true,safe:{x:b.x+Math.cos(base.angle)*200,y:b.y+Math.sin(base.angle)*200,r:52},color:'#93d6ce'})];
      case 'safeIslands':return [add({kind:'circle',x:p.x,y:p.y,r:185,life:2,safe:this.safePoint(p.x,p.y,base.angle+1.57),color:'#93d6ce'})];
      default:return [];
    }
  },
  draw(c,e){
    c.save();c.translate(e.x,e.y);c.rotate(e.angle);c.strokeStyle=e.color;c.fillStyle=e.color;c.lineWidth=e.warn>0?2:3;c.setLineDash(e.warn>0?[7,5]:[]);c.globalAlpha=e.warn>0?.12:.24;c.beginPath();
    if(e.kind==='lane')c.rect(0,-e.width/2,e.r,e.width);
    else if(e.kind==='wall')c.rect(-e.halfW,-e.halfH,e.halfW*2,e.halfH*2);
    else if(e.kind==='cone'){c.moveTo(0,0);c.arc(0,0,e.r,-e.arc/2,e.arc/2);c.closePath();}
    else if(e.kind==='ring'){c.arc(0,0,e.r,.45,TAU-.45);c.lineWidth=e.width;}
    else c.arc(0,0,e.r,0,TAU);
    if(e.kind!=='ring')c.fill();c.globalAlpha=.9;c.stroke();
    if(e.kind==='wall'&&e.warn<=0){c.globalAlpha=.85;for(let x=-10;x<14;x+=8){c.beginPath();c.moveTo(x,-70);c.lineTo(x+5,-54);c.lineTo(x+5,70);c.stroke();}}
    if(e.kind==='nest'){c.globalAlpha=.9;for(let i=0;i<5;i++){c.beginPath();c.ellipse(Math.cos(i)*20,Math.sin(i)*18,7,10,i,0,TAU);c.stroke();}}
    c.restore();
    if(e.safe){c.save();c.strokeStyle='#b1e6a9';c.fillStyle='rgba(116,191,127,.2)';c.lineWidth=3;c.beginPath();c.arc(e.safe.x,e.safe.y,e.safe.r,0,TAU);c.fill();c.stroke();c.fillStyle='#d8f5c7';c.textAlign='center';c.font='11px Courier New';c.fillText('安全区',e.safe.x,e.safe.y+4);c.restore();}
  }
};
(() => {
  const oldPick=Enemy.prototype.pickNextAbility,oldUpdate=Enemy.prototype.updateBoss,oldDraw=Enemy.prototype.drawBossExtras;
  Enemy.prototype.pickNextAbility=function(p,d){
    if(!BossCombat.profiles[this.type])return oldPick.call(this,p,d);
    const seq=BossCombat.profiles[this.type];this.signatureIndex=(this.signatureIndex||0)+1;
    this.currentAbility=seq[(this.signatureIndex-1)%seq.length];this.bossState='windup';this.stateTimer=1.1;this.abilityDir=angleTo(this.x,this.y,p.x,p.y);
    this.signatureEffects=(this.signatureEffects||[]).concat(BossCombat.make(this,p,this.currentAbility)).slice(-12);
    if(this.phase>=2&&this.signatureIndex%3===0)this.signatureEffects.push(...BossCombat.make(this,p,seq[1]));
    Game.addMessage(`${this.def.name} · ${BossCombat.names[this.currentAbility]}`,this.def.color);
  };
  Enemy.prototype.updateBoss=function(dt,p,d){
    if(!BossCombat.profiles[this.type])return oldUpdate.call(this,dt,p,d);
    for(const e of this.signatureEffects||[]){
      if(e.warn>0){e.warn=Math.max(0,e.warn-dt);continue;}
      e.life-=dt;e.tick-=dt;
      if(e.expand)e.r+=110*dt;
      if(e.sweep){e.angle=this.abilityDir-.45+(1.6-e.life)/1.6*.9;e.arc=.5;}
      if(e.kind==='nest'&&!e.hatched){e.hatched=true;for(let i=0;i<(this.phase>=2?3:2);i++){const x=e.x+(i-1)*32,y=e.y;if(!Game.isCircleBlocked(x,y,14)&&Game.enemies.length<180)Game.enemies.push(new Enemy('spider',x,y));}}
      if(BossCombat.hit(e,p)&&e.tick<=0){e.tick=.6;if(e.slow)p.webSlowTimer=.7;if(e.damage>0)p.takeDamage(e.damage);}
    }
    this.signatureEffects=(this.signatureEffects||[]).filter(e=>e.life>0);
    this.stateTimer-=dt;
    if(this.bossState==='idle'){this.abilityTimer-=dt;if(this.abilityTimer<=0)this.pickNextAbility(p,d);}
    else if(this.bossState==='windup'&&this.stateTimer<=0){this.bossState='attack';this.stateTimer=this.currentAbility==='knightLunge'?.65:.6;Audio2.play('triangle',this.type==='bossDragon'?95:180,.15,.06);}
    else if(this.bossState==='attack'){
      if(this.currentAbility==='knightLunge'){this.prevX=this.x;this.prevY=this.y;this.x+=Math.cos(this.abilityDir)*420*dt;this.y+=Math.sin(this.abilityDir)*420*dt;Game.resolvePropCollision(this);this.clampToLevelBounds();}
      if(this.stateTimer<=0){this.bossState='recover';this.stateTimer=this.phase>=2?.9:1.2;this.currentAbility=null;}
    }else if(this.bossState==='recover'&&this.stateTimer<=0){this.bossState='idle';this.abilityTimer=this.phase>=2?1:1.6;}
  };
  Enemy.prototype.drawBossExtras=function(c){if(!BossCombat.profiles[this.type])return oldDraw.call(this,c);for(const e of this.signatureEffects||[])BossCombat.draw(c,e);};
  const oldHazards=Game.updateThemeHazards,oldCollision=Game.resolvePropCollision,oldBlocked=Game.isCircleBlocked;
  Game.getBossWalls=function(){return this.enemies.flatMap(b=>b.alive?(b.signatureEffects||[]).filter(e=>e.kind==='wall'&&e.warn<=0&&e.life>0):[]);};
  Game.resolvePropCollision=function(p){let hit=oldCollision.call(this,p);if(p===this.player)for(const e of this.getBossWalls())if(this.resolveRectPropCollision(p,e))hit=true;return hit;};
  Game.isCircleBlocked=function(x,y,r){return oldBlocked.call(this,x,y,r)||this.getBossWalls().some(e=>Math.abs(x-e.x)<e.halfW+r&&Math.abs(y-e.y)<e.halfH+r);};
  Game.updateThemeHazards=function(dt){oldHazards.call(this,dt);const p=this.player;if(p?.webSlowTimer>0){p.webSlowTimer=Math.max(0,p.webSlowTimer-dt);this.environmentSpeedMult*=.55;}};
})();
