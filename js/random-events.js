// Seeded optional events; rewards and enemy membership are saved atomically.
const RandomEvents={
  merchant:{name:'遗迹游商',desc:'花费 8 枚旅途币，最低等级武器 +1。满级时改为范围 +8%。',cost:'8 枚旅途币',color:'#e4ca89',sprite:'props/merchant_v150'},
  altar:{name:'诅咒祭坛',desc:'献出最大生命的 15%，本局伤害 +12%。生命不足时不能献祭。',cost:'15% 最大生命',color:'#cdb0df',sprite:'props/shrine_stone_lit'},
  rescue:{name:'限时救援',desc:'45 秒内清理守卫并在旅者身边驻守 8 秒。奖励稀有宝箱、回血和 10 枚旅途币。',cost:'守卫会出现 · 可随时离开',color:'#adcfa7',sprite:'props/traveler_v150'},
  bounty:{name:'精英悬赏',desc:'挑战一名腐化骑士，击败后获得稀有宝箱和 12 枚旅途币。',cost:'额外精英战',color:'#d4a286',sprite:'props/barrel'}
};
(() => {
  const old={};for(const k of ['startNewGame','loadLevel','loadAndContinue','updateLevelEncounters','renderEncounterSites','getCurrentObjective','getEncounterActionLabel','update','render','renderHUD','selectChestReward','confirmWeaponReplacement'])old[k]=Game[k];
  const die=Enemy.prototype.die;Enemy.prototype.die=function(...a){if(this.alive)Game.runCoins=(Game.runCoins||0)+(this.isBoss?20:this.isElite?6:1);return die.apply(this,a);};
  Object.assign(Game,{
    randomEvents:[],runCoins:0,activeEvent:null,
    selectChestReward(...a){const r=old.selectChestReward.apply(this,a);if(!this._weaponReplacement&&this.state!=='chestReward')this.saveProgress();return r;},
    confirmWeaponReplacement(...a){const source=this._weaponReplacement?.source,r=old.confirmWeaponReplacement.apply(this,a);if(source==='chestReward'&&!this._weaponReplacement)this.saveProgress();return r;},
    startNewGame(...a){this.runCoins=0;this.activeEvent=null;return old.startNewGame.apply(this,a);},
    loadLevel(...a){const r=old.loadLevel.apply(this,a);this.initRandomEvents();return r;},
    initRandomEvents(){
      this.activeEvent=null;
      const theme=this.levelData.theme,rng=makeRNG((this.runSeed^([...theme].reduce((n,c)=>n*31+c.charCodeAt(0),15)))>>>0);
      const kinds=Object.keys(RandomEvents);for(let i=kinds.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[kinds[i],kinds[j]]=[kinds[j],kinds[i]];}
      const cx=this.levelData.mapW*24,cy=this.levelData.mapH*24,step=32,q=[{ix:0,iy:0}],seen=new Set(['0,0']),points=[];
      for(let i=0;i<q.length;i++){
        const n=q[i],x=cx+n.ix*step,y=cy+n.iy*step,d=dist(cx,cy,x,y);
        if(d>230&&d<520&&!this.levelEncounters.some(s=>dist(x,y,s.x,s.y)<180)&&this.isPickupPositionSafe(x,y,26,{minPickupDistance:0}))points.push({x,y});
        for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const ix=n.ix+dx,iy=n.iy+dy,k=ix+','+iy,nx=cx+ix*step,ny=cy+iy*step;
          if(seen.has(k)||Math.hypot(ix,iy)>19||nx<80||ny<80||nx>cx*2-80||ny>cy*2-80||this.isCircleBlocked(nx,ny,22)||this.isCircleBlocked(nx-dx*16,ny-dy*16,22))continue;
          seen.add(k);q.push({ix,iy});
        }
      }
      this.randomEvents=[];
      for(let i=0;i<2;i++){const angle=rng()*TAU,target={x:cx+Math.cos(angle)*360,y:cy+Math.sin(angle)*360};
        const point=points.filter(p=>!this.randomEvents.some(e=>dist(e.x,e.y,p.x,p.y)<200)).sort((a,b)=>dist(a.x,a.y,target.x,target.y)-dist(b.x,b.y,target.x,target.y))[0];
        if(point)this.randomEvents.push({id:'random-'+i,kind:kinds[i],...point,status:'waiting',availableAt:35+i*25,progress:0,claimed:false});
      }
    },
    serializeRandomEvents(){return this.randomEvents.map(s=>({...s,guards:this.enemies.filter(e=>e.alive&&e.eventId===s.id).map(e=>({type:e.type,x:e.x,y:e.y,hp:e.hp}))}));},
    loadAndContinue(){
      let data;try{data=JSON.parse(localStorage.getItem(this.saveKey)||'null');}catch{}
      old.loadAndContinue.call(this);this.initRandomEvents();this.runCoins=Math.max(0,Math.floor(Number(data?.runCoins)||0));
      for(const site of this.randomEvents){const saved=Array.isArray(data?.randomEvents)?data.randomEvents.find(s=>s?.id===site.id&&s.kind===site.kind):null;
        if(!saved||!['waiting','ready','active','complete','expired','declined'].includes(saved.status))continue;
        site.status=saved.status;site.claimed=!!saved.claimed||saved.status==='complete';site.progress=clamp(Number(saved.progress)||0,0,8);site.deadline=Number.isFinite(saved.deadline)?saved.deadline:this.levelTime+45;
        if(site.status==='active')for(const g of (Array.isArray(saved.guards)?saved.guards:[]).slice(0,3)){
          if(!['wild_dog','villager','corrupted_knight'].includes(g.type)||!Number.isFinite(g.hp)||g.hp<=0)continue;
          const e=new Enemy(g.type,clamp(Number(g.x)||site.x,32,this.levelData.mapW*48-32),clamp(Number(g.y)||site.y,32,this.levelData.mapH*48-32));e.hp=Math.min(g.hp,e.maxHp);e.eventId=site.id;this.enemies.push(e);
        }
      }
    },
    openRandomEvent(site){
      if(this.state!=='playing'||this.bossSpawned||site.status!=='ready'||dist(this.player.x,this.player.y,site.x,site.y)>90)return false;
      this.activeEvent=site;this.state='eventChoice';return true;
    },
    acceptRandomEvent(site){
      if(this.state!=='eventChoice'||site!==this.activeEvent||site.status!=='ready'||site.claimed)return false;
      const p=this.player,cost=Math.ceil(p.getMaxHp()*.15);
      if(site.kind==='merchant'&&this.runCoins<8){this.addMessage('旅途币不足','#eeab7e');return false;}
      if(site.kind==='altar'&&p.hp<=cost){this.addMessage('生命不足，不能献祭','#eeab7e');return false;}
      if(['rescue','bounty'].includes(site.kind)){
        const count=site.kind==='rescue'?3:1,wave=[];
        for(let i=0;i<count;i++){const type=site.kind==='bounty'?'corrupted_knight':i%2?'wild_dog':'villager';let pos;
          for(let a=0;a<24;a++){const angle=i/count*TAU+a*.3,x=site.x+Math.cos(angle)*140,y=site.y+Math.sin(angle)*140;if(x>32&&y>32&&x<this.levelData.mapW*48-32&&y<this.levelData.mapH*48-32&&!this.isCircleBlocked(x,y,CONFIG.ENEMIES[type].radius)){pos={x,y};break;}}
          if(!pos)return false;const e=new Enemy(type,pos.x,pos.y);e.eventId=site.id;wave.push(e);
        }
        this.enemies.push(...wave);site.status='active';site.deadline=this.levelTime+45;
      }else{
        if(site.kind==='merchant'){this.runCoins-=8;const w=[...p.weapons].filter(w=>w.level<(CONFIG.WEAPON_MAX_LEVEL||6)).sort((a,b)=>a.level-b.level)[0];if(w)w.level++;else p.stats.rangeMult*=1.08;}
        else{p.hp-=cost;p.stats.damageMult*=1.12;}
        site.status='complete';site.claimed=true;
      }
      this.state='playing';this.activeEvent=null;this.saveProgress();return true;
    },
    updateRandomEvents(dt){
      if(this.state!=='playing'||!this.player?.alive)return;
      for(const s of this.randomEvents){
        if(this.bossSpawned&&!['complete','declined','expired'].includes(s.status)){s.status='expired';continue;}
        if(s.status==='waiting'&&this.levelTime>=s.availableAt)s.status='ready';
        if(s.status==='active'){
          if(s.kind==='rescue'&&this.levelTime>s.deadline){s.status='expired';this.addMessage('救援时间已过','#d6aa87');continue;}
          const guards=this.enemies.some(e=>e.alive&&e.eventId===s.id);
          if(!guards&&(s.kind==='bounty'||dist(this.player.x,this.player.y,s.x,s.y)<90)){s.progress+=dt;
            if(s.kind==='bounty'||s.progress>=8){s.status='complete';if(!s.claimed){s.claimed=true;this.runCoins+=s.kind==='rescue'?10:12;this.player.heal(s.kind==='rescue'?30:0);const r=this.pickupPool.obtain(s.x,s.y,'chest','items/chest',1);r.life=300;r.objectiveId=s.id;this.pickups.push(r);this.addMessage(`${RandomEvents[s.kind].name}完成 · 稀有宝箱`, '#a5d79d');this.saveProgress();}}
          }
        }
      }
      const s=this.randomEvents.find(s=>s.status==='ready'&&dist(this.player.x,this.player.y,s.x,s.y)<90);
      if(s){const b=this.getEncounterActionButton();if(Input.wasPressed('KeyE')||Input.consumeClick(b.x,b.y,b.w,b.h)){delete Input._justPressed.KeyE;this.openRandomEvent(s);}}
    },
    updateLevelEncounters(dt){this.updateRandomEvents(dt);if(this.state==='playing')return old.updateLevelEncounters.call(this,dt);},
    getCurrentObjective(){
      const s=this.randomEvents.find(s=>['ready','active'].includes(s.status)&&dist(this.player?.x||0,this.player?.y||0,s.x,s.y)<90);
      if(!s||this.bossSpawned)return old.getCurrentObjective.call(this);
      return {site:s,title:RandomEvents[s.kind].name,detail:s.status==='active'?s.kind==='rescue'?`驻守 ${Math.floor(s.progress)}/8 秒 · 剩余 ${Math.max(0,Math.ceil(s.deadline-this.levelTime))} 秒`:'击败悬赏精英':RandomEvents[s.kind].cost,action:s.status==='ready',next:'自愿参与 · 旅途币 '+this.runCoins};
    },
    getEncounterActionLabel(s){return s?.id?.startsWith('random-')?'查看交易 / 挑战 · E':old.getEncounterActionLabel.call(this,s);},
    renderEncounterSites(c){old.renderEncounterSites.call(this,c);for(const s of this.randomEvents){if(['waiting','expired','declined'].includes(s.status)||!this.isOnScreen(s.x,s.y,100))continue;const d=RandomEvents[s.kind];c.save();
      this.drawCroppedAsset(c,d.sprite,s.x,s.y-16,40,50,{imageSmoothingEnabled:false});c.textAlign='center';c.font='11px Courier New';c.fillStyle=d.color;c.fillText(d.name+(s.status==='complete'?' · 完成':''),s.x,s.y+20);c.strokeStyle=d.color;c.globalAlpha=.5;c.beginPath();c.ellipse(s.x,s.y+7,31,10,0,0,TAU);c.stroke();c.restore();}},
    getRandomEventLayout(){const v=this.getVisibleCanvasRect(),w=Math.min(500,v.w-32),x=v.x+(v.w-w)/2;return {visible:v,panel:{x,y:v.y+108,w,h:Math.min(240,v.h-255)},cards:[{x,y:v.y+v.h-125,w,h:45},{x,y:v.y+v.h-65,w,h:45}]};},
    update(dt){if(this.state!=='eventChoice')return old.update.call(this,dt);const l=this.getRandomEventLayout(),s=this.activeEvent;
      if(Input.wasPressed('Digit1')||Input.consumeClick(l.cards[0].x,l.cards[0].y,l.cards[0].w,l.cards[0].h)){this.acceptRandomEvent(s);return;}
      if(Input.wasPressed('Digit2')||Input.wasPressed('Escape')||Input.consumeClick(l.cards[1].x,l.cards[1].y,l.cards[1].w,l.cards[1].h)){s.status='declined';this.activeEvent=null;this.state='playing';this.saveProgress();}
    },
    render(){old.render.call(this);if(this.state==='eventChoice')this.renderRandomEvent();},
    renderHUD(){old.renderHUD.call(this);const c=this.ctx,v=this.getVisibleCanvasRect();c.save();c.fillStyle='#dbc58b';c.textAlign='right';c.font='11px Courier New';c.fillText(`旅途币 ${this.runCoins}`,v.x+v.w-12,v.y+78);c.restore();},
    renderRandomEvent(){const c=this.ctx,s=this.activeEvent;if(!s)return;const d=RandomEvents[s.kind],l=this.getRandomEventLayout(),v=l.visible;c.save();c.fillStyle='rgba(8,15,13,.94)';c.fillRect(0,0,960,540);c.textAlign='center';c.fillStyle=d.color;c.font='bold 22px Courier New';c.fillText(d.name,v.x+v.w/2,v.y+52);c.font='12px Courier New';c.fillText(`旅途币 ${this.runCoins} · 生命 ${Math.ceil(this.player.hp)}/${this.player.getMaxHp()}`,v.x+v.w/2,v.y+80);
      const p=l.panel;c.fillStyle='#1c2923';c.fillRect(p.x,p.y,p.w,p.h);c.strokeStyle=d.color;c.strokeRect(p.x,p.y,p.w,p.h);c.fillStyle='#d7ddc9';this.drawTextBlock(c,d.desc,p.x+p.w/2,p.y+32,p.w-28,21,8);
      for(const [i,r] of l.cards.entries())this.drawButton(r.x,r.y,r.w,r.h,i?'2 · 离开':'1 · 接受',i?'#a7b6aa':d.color);
      c.restore();}
  });
})();

