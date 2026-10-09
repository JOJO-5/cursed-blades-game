// One optional objective template per map. Positions come from a player-radius flood fill.
const ExplorationKinds={
 anchor:{name:'破除诅咒支点',desc:'两处可选支点。靠近驻守 6 秒关闭；离开会流失进度。每处令首领场地招式伤害降低 15%。',color:'#a6cbd6'},
 carry:{name:'携带誓火',desc:'将誓火送往归火台，限时 90 秒。携带时移速 -20%，消耗式护盾 20 点；E 可放下，重新拾起不补充护盾。',color:'#e3b87a'},
 vault:{name:'腐化宝库',desc:'取普通宝箱，或接受 6 名守卫的 45 秒挑战，获得誓约遗物。挑战留下腐化负担，每层移速 -5%，最多两层。',color:'#c1aadf'}
};
(() => {
 const themes={village:'anchor',frost:'anchor',clock:'anchor',mine:'carry',forest:'carry',marsh:'carry',hell:'vault',court:'vault'};
 const anchorNames={village:'村祠咒柱',frost:'怨碑',clock:'电轨支点'};
 const old={};for(const k of ['loadLevel','loadAndContinue','startNewGame','updateLevelEncounters','getCurrentObjective','getEncounterActionLabel','updateThemeHazards','renderEncounterSites','renderObjectiveHUD','update','render'])old[k]=Game[k];
 const num=(v,max=9999)=>Number.isFinite(v)?clamp(v,0,max):0;
 Object.assign(Game,{
  getExplorationReachable(){
   const cx=this.levelData.mapW*24,cy=this.levelData.mapH*24,q=[{x:cx,y:cy}],seen=new Set(['0,0']),step=32;
   for(let i=0;i<q.length;i++)for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const x=q[i].x+dx*step,y=q[i].y+dy*step,key=(x-cx)/step+','+(y-cy)/step;
    if(seen.has(key))continue;seen.add(key);if(x<50||y<50||x>cx*2-50||y>cy*2-50||dist(cx,cy,x,y)>700||this.isCircleBlocked(x,y,22)||this.isCircleBlocked(x-dx*16,y-dy*16,22))continue;q.push({x,y});
   }return q;
  },
  initExploration(){
   this._explorationChoice=null;this._oathReward=null;this.explorationReachable=this.getExplorationReachable();
   const kind=themes[this.levelData.theme]||'anchor',cx=this.levelData.mapW*24,cy=this.levelData.mapH*24;
   const rng=makeRNG((this.runSeed^0x2020^Array.from(this.levelData.theme).reduce((n,c)=>n*31+c.charCodeAt(0),7))>>>0),angle=rng()*TAU;
   const candidates=this.explorationReachable.filter(p=>dist(cx,cy,p.x,p.y)>280&&dist(cx,cy,p.x,p.y)<610&&this.isPickupPositionSafe(p.x,p.y,26,{minPickupDistance:0})&&!this.levelEncounters.some(s=>dist(p.x,p.y,s.x,s.y)<160)&&!this.randomEvents.some(s=>dist(p.x,p.y,s.x,s.y)<130));
   const pick=(a,other)=>{const target={x:cx+Math.cos(a)*440,y:cy+Math.sin(a)*440};return candidates.filter(p=>!other||dist(p.x,p.y,other.x,other.y)>320).sort((a,b)=>dist(a.x,a.y,target.x,target.y)-dist(b.x,b.y,target.x,target.y))[0];};
   const first=pick(angle),second=first&&pick(angle+Math.PI,first),status=this.bossSpawned?'expired':this.levelTime>=65?'ready':'waiting';
   this.exploration={kind,sites:[]};if(!first)return;
   this.exploration.sites.push({id:'explore-0',...first,status,progress:0,claimed:false,carrying:false,guard:20,...(kind==='carry'&&second?{destination:{...second}}:{})});
   if(kind==='anchor'&&second)this.exploration.sites.push({id:'explore-1',...second,status,progress:0,claimed:false});
   if(kind==='carry'&&!second)this.exploration.sites=[];
  },
  loadLevel(...a){const r=old.loadLevel.apply(this,a);this.initExploration();return r;},
  serializeExploration(){return {...this.exploration,sites:this.exploration?.sites.map(s=>({...s,guards:this.enemies.filter(e=>e.alive&&e.explorationId===s.id).map(e=>({type:e.type,x:e.x,y:e.y,hp:e.hp}))})),choice:this._explorationChoice?.id,reward:this._oathReward};},
  loadAndContinue(){let data;try{data=JSON.parse(localStorage.getItem(this.saveKey)||'null');}catch{}old.loadAndContinue.call(this);this.initExploration();const saved=data?.exploration;
   if(!saved||saved.kind!==this.exploration.kind)return;
   for(const s of this.exploration.sites){const d=saved.sites?.find?.(d=>d.id===s.id);if(!d||!['waiting','ready','active','complete','expired'].includes(d.status))continue;
    s.status=d.status;s.claimed=!!d.claimed;s.progress=num(d.progress,6);s.guard=num(d.guard,20);s.carrying=!!d.carrying&&s.status==='active';s.deadline=Number.isFinite(d.deadline)?d.deadline:this.levelTime+90;
    if(this.exploration.kind==='carry'&&Number.isFinite(d.x+d.y)&&!this.isCircleBlocked(d.x,d.y,this.player.radius)){s.x=d.x;s.y=d.y;}
    if(s.status==='active'&&this.exploration.kind==='vault')for(const g of (Array.isArray(d.guards)?d.guards:[]).slice(0,6)){if(!CONFIG.ENEMIES[g.type]||!Number.isFinite(g.x+g.y+g.hp)||g.hp<=0)continue;const e=new Enemy(g.type,g.x,g.y);this.applyRunProfile?.(e);e.hp=Math.min(g.hp,e.maxHp);e.explorationId=s.id;this.enemies.push(e);}
   }
   const choice=this.exploration.sites.find(s=>s.id===saved.choice&&s.status==='ready');if(choice&&this.exploration.kind==='vault'){this._explorationChoice=choice;this.state='explorationChoice';}
   const reward=saved.reward,site=this.exploration.sites.find(s=>s.id===reward?.siteId&&s.status==='complete'&&!s.claimed);if(site&&Array.isArray(reward.ids)){this._oathReward={siteId:site.id,ids:reward.ids.filter(id=>this.canAcquireOathRelic(id)).slice(0,3)};this.state='oathReward';}
  },
  startExplorationSite(s){
   if(this.state!=='playing'||this.bossSpawned||!this.exploration.sites.includes(s)||dist(this.player.x,this.player.y,s.x,s.y)>85||!['ready','active'].includes(s.status))return false;
   const kind=this.exploration.kind;
   if(kind==='vault'){if(s.status!=='ready')return false;this._explorationChoice=s;this.state='explorationChoice';}
   else if(kind==='carry'){if(s.carrying)return this.dropOathFire();if(s.status==='ready')s.deadline=this.levelTime+90;s.status='active';s.carrying=true;}
   else s.status='active';
   this.saveProgress();return true;
  },
  dropOathFire(){const s=this.exploration?.sites.find(s=>s.carrying);if(this.state!=='playing'||!s)return false;s.x=this.player.x;s.y=this.player.y;s.carrying=false;this.saveProgress();return true;},
  absorbExplorationHit(amount){const s=this.exploration?.sites.find(s=>s.carrying&&s.status==='active');if(!s)return amount;const absorbed=Math.min(s.guard,amount);s.guard-=absorbed;return amount-absorbed;},
  getAnchorWeakening(){return this.exploration?.kind==='anchor'?Math.min(.3,this.exploration.sites.filter(s=>s.status==='complete').length*.15):0;},
  spawnExplorationChest(s,rare=false){const p=this.pickupPool.obtain(s.x,s.y,'chest','items/chest',rare?1:0);p.objectiveId=s.id;p.life=300;this.pickups.push(p);},
  chooseVaultRisk(risk){
   const s=this._explorationChoice;if(this.state!=='explorationChoice'||!s||s.status!=='ready')return false;
   if(!risk){s.status='complete';s.claimed=true;this.spawnExplorationChest(s);}
   else{const wave=[];for(let i=0;i<6;i++){const type=this.levelData.enemyPool[i%this.levelData.enemyPool.length];let point;for(let a=0;a<24;a++){const angle=i*TAU/6+a*.27,x=s.x+Math.cos(angle)*140,y=s.y+Math.sin(angle)*140;if(x<40||y<40||x>this.levelData.mapW*48-40||y>this.levelData.mapH*48-40||this.isCircleBlocked(x,y,CONFIG.ENEMIES[type].radius))continue;point={x,y};break;}if(!point){this.addMessage('此处无法展开敌潮','#d6aa87');return false;}const e=new Enemy(type,point.x,point.y);e.explorationId=s.id;this.applyRunProfile?.(e);wave.push(e);}
    this.enemies.push(...wave);s.status='active';s.deadline=this.levelTime+45;this.oathRun.burden=Math.min(2,this.oathRun.burden+1);}
   this._explorationChoice=null;this.state='playing';this.saveProgress();return true;
  },
  completeExploration(s){if(s.status!=='active')return;s.status='complete';s.carrying=false;if(this.exploration.kind==='carry'){s.x=s.destination.x;s.y=s.destination.y;}
   if(this.exploration.kind==='vault'){const rng=makeRNG(this.runSeed^0x0a7b),ids=Object.keys(OathRelics).filter(id=>this.canAcquireOathRelic(id));for(let i=ids.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}this._oathReward={siteId:s.id,ids:ids.slice(0,3)};this.state='oathReward';this.runCoins+=12;}
   else if(!s.claimed){s.claimed=true;this.spawnExplorationChest(s,true);this.runCoins+=6;this.addMessage(this.exploration.kind==='anchor'?'支点已关闭 · 首领招式伤害削弱':'誓火归台 · 稀有宝箱已解锁','#b8d6b1');}
   this.saveProgress();
  },
  selectOathReward(index){const r=this._oathReward,s=this.exploration?.sites.find(s=>s.id===r?.siteId);if(this.state!=='oathReward'||!s||s.claimed)return false;
   if(index===-1)this.runCoins+=8;else if(!this.acquireOathRelic(r.ids[index]))return false;
   s.claimed=true;this._oathReward=null;this.state='playing';this.saveProgress();return true;
  },
  updateExploration(dt){
   if(this.state!=='playing'||!this.player?.alive)return;const kind=this.exploration.kind;
   for(const s of this.exploration.sites){
    if(['complete','expired'].includes(s.status))continue;
    if(this.bossSpawned){s.status='expired';s.carrying=false;continue;}
    if(s.status==='waiting'&&this.levelTime>=65){s.status='ready';this.addMessage(ExplorationKinds[kind].name+'已显现 · 蓝色指引','#a6cbd6');}
    if(s.status!=='active')continue;
    if(kind==='anchor'){s.progress=dist(this.player.x,this.player.y,s.x,s.y)<72?s.progress+dt:Math.max(0,s.progress-dt);if(s.progress>=6)this.completeExploration(s);}
    else if(this.levelTime>s.deadline){s.status='expired';s.carrying=false;this.addMessage('可选目标超时 · 旅程继续','#cfaa83');this.saveProgress();}
    else if(kind==='carry'&&s.carrying&&dist(this.player.x,this.player.y,s.destination.x,s.destination.y)<65)this.completeExploration(s);
    else if(kind==='vault'&&!this.enemies.some(e=>e.alive&&e.explorationId===s.id))this.completeExploration(s);
    if(this.state!=='playing')return;
   }
   const carried=this.exploration.sites.find(s=>s.carrying),near=this.exploration.sites.find(s=>['ready','active'].includes(s.status)&&dist(this.player.x,this.player.y,s.x,s.y)<85&&(kind!=='vault'||s.status==='ready'));
   if(carried||near){const b=this.getEncounterActionButton();if(Input.wasPressed('KeyE')||Input.consumeClick(b.x,b.y,b.w,b.h)){delete Input._justPressed.KeyE;if(carried)this.dropOathFire();else this.startExplorationSite(near);}}
  },
  updateLevelEncounters(dt){this.updateExploration(dt);if(this.state==='playing')old.updateLevelEncounters.call(this,dt);},
  getCurrentObjective(){
   const base=old.getCurrentObjective.call(this);if(!this.exploration||this.bossSpawned)return base;
   const s=this.exploration.sites.find(s=>s.status==='active')||this.exploration.sites.find(s=>s.status==='ready'&&dist(this.player.x,this.player.y,s.x,s.y)<85);
   if(!s)return base;const kind=this.exploration.kind,d=ExplorationKinds[kind],site=s.carrying?{...s,...s.destination}:s,distance=Math.ceil(dist(this.player.x,this.player.y,site.x,site.y)/48),remaining=Math.max(0,Math.ceil(s.deadline-this.levelTime));
   const carryDetail=kind==='carry'?(s.status==='ready'?`90 秒护送 · 归火台 ${Math.ceil(dist(this.player.x,this.player.y,s.destination.x,s.destination.y)/48)} 格 · 护盾 20`:s.carrying?`归火台 ${distance} 格 · ${remaining} 秒 · 护盾 ${s.guard}`:`誓火 ${distance} 格 · 已放下 · ${remaining} 秒`):'';
   return {site,title:kind==='anchor'?(anchorNames[this.levelData.theme]||d.name):d.name,detail:kind==='anchor'?`驻守 ${Math.min(6,s.progress).toFixed(1)}/6 秒 · 首领招式 -15%`:kind==='carry'?carryDetail:`守卫 ${this.enemies.filter(e=>e.alive&&e.explorationId===s.id).length}/6 · ${remaining||45} 秒`,action:s.carrying||s.status==='ready'||kind==='carry'&&dist(this.player.x,this.player.y,s.x,s.y)<85,next:s.status==='ready'?'E 查看 / 开始 · 自愿参与':'离开危险区也可继续主线'};
  },
  getEncounterActionLabel(s){if(!s?.id?.startsWith('explore'))return old.getEncounterActionLabel.call(this,s);return this.exploration.sites.some(s=>s.carrying)?'放下誓火 · E':this.exploration.kind==='vault'?'查看宝库 · E':'开始 / 拾起 · E';},
  updateThemeHazards(dt){old.updateThemeHazards.call(this,dt);if(this.exploration?.sites.some(s=>s.carrying))this.environmentSpeedMult*=.8;this.environmentSpeedMult*=1-(this.oathRun?.burden||0)*.05;},
  renderEncounterSites(c){old.renderEncounterSites.call(this,c);const kind=this.exploration?.kind,d=ExplorationKinds[kind];if(!d)return;
   for(const s of this.exploration.sites){if(['waiting','expired'].includes(s.status))continue;const points=[];if(!s.carrying&&!(kind==='carry'&&s.status==='complete'))points.push({x:s.x,y:s.y,label:kind==='anchor'?anchorNames[this.levelData.theme]:kind==='carry'?'誓火':'腐化宝库'});if(s.destination)points.push({...s.destination,label:'归火台'});
    for(const p of points){if(!this.isOnScreen(p.x,p.y,90))continue;c.save();c.strokeStyle=s.status==='complete'?'#a7d1a0':d.color;c.lineWidth=2;c.globalAlpha=.7;c.beginPath();c.ellipse(p.x,p.y+6,32,12,0,0,TAU);c.stroke();c.globalAlpha=1;
     this.drawCroppedAsset(c,kind==='vault'?'items/chest':kind==='anchor'?'props/shrine_stone_lit':'props/campfire_burnt',p.x,p.y-20,42,54,{imageSmoothingEnabled:false});
     if(kind==='carry'){c.fillStyle='#e7b778';c.beginPath();c.moveTo(p.x-8,p.y-18);c.lineTo(p.x,p.y-42);c.lineTo(p.x+9,p.y-18);c.closePath();c.fill();}
     c.textAlign='center';c.font='11px Courier New';c.fillStyle=d.color;c.fillText(p.label+(s.status==='complete'?' · 完成':''),p.x,p.y+25);c.restore();}
   }
  },
  renderObjectiveHUD(){old.renderObjectiveHUD.call(this);if(this.bossSpawned)return;const s=this.exploration?.sites.find(s=>s.status==='ready');if(!s||this.getCurrentObjective()?.site?.id===s.id)return;const v=this.getVisibleCanvasRect(),sx=s.x-this.camera.x,sy=s.y-this.camera.y,p=this.getObjectiveLayout(),x=clamp(sx,v.x+22,v.x+v.w-22),y=clamp(sy,p.y+p.h+30,v.y+v.h-105);if(sx===x&&sy===y)return;const c=this.ctx;c.save();c.translate(x,y);c.rotate(angleTo(this.player.x,this.player.y,s.x,s.y));c.fillStyle='#a6cbd6';c.beginPath();c.moveTo(9,0);c.lineTo(-5,-5);c.lineTo(-5,5);c.closePath();c.fill();c.restore();},
  getExplorationChoiceLayout(){const v=this.getVisibleCanvasRect(),w=Math.min(520,v.w-28),x=v.x+(v.w-w)/2;return {v,panel:{x,y:v.y+98,w,h:150},cards:[0,1].map(i=>({x,y:v.y+v.h-135+i*58,w,h:44}))};},
  getOathRewardLayout(){const v=this.getVisibleCanvasRect(),w=Math.min(560,v.w-28),x=v.x+(v.w-w)/2;return {v,cards:(this._oathReward?.ids||[]).map((id,i)=>({id,x,y:v.y+103+i*106,w,h:98})),skip:{x,y:v.y+v.h-48,w,h:32}};},
  update(dt){if(this.state==='explorationChoice'){const l=this.getExplorationChoiceLayout();for(const [i,r] of l.cards.entries())if(Input.wasPressed('Digit'+(i+1))||Input.consumeClick(r.x,r.y,r.w,r.h)){this.chooseVaultRisk(i===0);return;}if(Input.wasPressed('Escape')){this._explorationChoice=null;this.state='playing';this.saveProgress();}return;}
   if(this.state==='oathReward'){const l=this.getOathRewardLayout();for(const [i,r] of l.cards.entries())if(Input.wasPressed('Digit'+(i+1))||Input.consumeClick(r.x,r.y,r.w,r.h)){this.selectOathReward(i);return;}if(Input.wasPressed('Escape')||Input.consumeClick(l.skip.x,l.skip.y,l.skip.w,l.skip.h))this.selectOathReward(-1);return;}old.update.call(this,dt);
  },
  render(){old.render.call(this);if(!['explorationChoice','oathReward'].includes(this.state))return;const c=this.ctx;c.save();c.fillStyle='rgba(15,12,19,.96)';c.fillRect(0,0,960,540);c.textAlign='center';c.fillStyle='#dfc99a';c.font='bold 23px Courier New';const v=this.getVisibleCanvasRect();c.fillText(this.state==='oathReward'?'选择誓约遗物':'腐化宝库',v.x+v.w/2,v.y+48);
   if(this.state==='explorationChoice'){const l=this.getExplorationChoiceLayout();c.font='12px Courier New';c.fillStyle='#c4b9a6';this.drawTextBlock(c,ExplorationKinds.vault.desc,l.panel.x+l.panel.w/2,l.panel.y+26,l.panel.w-26,22,6);for(const [i,r] of l.cards.entries())this.drawButton(r.x,r.y,r.w,r.h,i?'2 · 取普通宝箱':'1 · 接受挑战 · 誓约遗物',i?'#b9bcab':'#d5b4df');}
   else{const l=this.getOathRewardLayout();c.font='11px Courier New';c.fillText('只能选择一件 · 效果本局有效 · 暂停构筑中可查看',v.x+v.w/2,v.y+79);for(const [i,r] of l.cards.entries()){const d=OathRelics[r.id];c.fillStyle='#242028';c.fillRect(r.x,r.y,r.w,r.h);c.strokeStyle=d.color;c.strokeRect(r.x,r.y,r.w,r.h);c.fillStyle=d.color;c.font='bold 15px Courier New';c.fillText((i+1)+' · '+d.name,r.x+r.w/2,r.y+24);c.font='11px Courier New';c.fillStyle='#d4c9b6';this.drawTextBlock(c,d.desc,r.x+r.w/2,r.y+46,r.w-24,17,3);}this.drawButton(l.skip.x,l.skip.y,l.skip.w,l.skip.h,'换成 8 枚旅途币 · ESC','#c7b48c');}c.restore();
  }
 });
 const make=BossCombat.make;BossCombat.make=function(...a){const result=make.apply(this,a),mult=1-Game.getAnchorWeakening();for(const e of result)e.damage*=mult;return result;};
 const take=Player.prototype.takeDamage;Player.prototype.takeDamage=function(...a){const hp=this.hp,r=take.apply(this,a);if(this.hp<hp&&Game.exploration?.kind==='anchor')for(const s of Game.exploration.sites)if(s.status==='active')s.progress=Math.max(0,s.progress-1);return r;};
 const draw=Player.prototype.draw;Player.prototype.draw=function(c){draw.call(this,c);const s=Game.exploration?.sites.find(s=>s.carrying);if(!s)return;c.save();Game.drawCroppedAsset(c,'props/torch_v110',this.x+25,this.y-33,20,36,{imageSmoothingEnabled:false});c.font='9px Courier New';c.textAlign='center';c.fillStyle='#e3b87a';c.fillText('誓火 · '+s.guard,this.x,this.y-67);if(s.guard>0){c.globalAlpha=.45;c.strokeStyle='#e3b87a';c.lineWidth=2;c.beginPath();c.arc(this.x,this.y-12,26,-Math.PI*.15,Math.PI*1.15);c.stroke();}c.restore();};
})();
