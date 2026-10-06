// Character starts and independent expeditions share the campaign's combat rules.
(() => {
  CONFIG.CHARACTERS = {
    warden:{name:'守望者',role:'环绕近战',weapon:'sword',color:'#d1ac68',perk:'护甲 +1 · 生命 +20',stats:{armor:1,maxHpBonus:20}},
    ranger:{name:'林地游侠',role:'穿透远射',weapon:'bow',color:'#8fc7ae',perk:'移速 +12% · 穿透 +1',stats:{moveSpeedMult:1.12,pierceBonus:1}},
    arcanist:{name:'余烬术士',role:'火焰法术',weapon:'fireball',color:'#c6a0d0',perk:'弹幕伤害 +15%',stats:{projectileDamageMult:1.15}}
  };
  for(const id of ['sword','hammer','scythe','shield'])CONFIG.WEAPONS[id].icon='weapons/'+id;
  CONFIG.ENEMIES.frostWarden={...CONFIG.ENEMIES.boss,name:'寒霜守卫',hp:800,damage:25,speed:30,color:'#8bbfdb',projectileColor:'#8bbfdb'};
  CONFIG.ENEMIES.tideKeeper={...CONFIG.ENEMIES.bossSpider,name:'沉渊守卫',hp:900,damage:28,speed:38,color:'#6bbaa4',projectileColor:'#6bbaa4'};
  const phases=(pool,ranged,time)=>[
    {time:0,name:'踏入禁地',enemyPool:pool.slice(0,2),rangedPool:[],maxEnemies:12,spawnInterval:2.7,events:[]},
    {time:60,name:'迷雾围猎',enemyPool:pool,rangedPool:ranged,maxEnemies:18,spawnInterval:2.2,events:[{type:'chest',rare:false,mimic:false}]},
    {time:120,name:'古老守军',enemyPool:pool,rangedPool:ranged,maxEnemies:24,spawnInterval:1.8,events:[{type:'elite'},{type:'chest',rare:true,mimic:false}]},
    {time:180,name:'最后防线',enemyPool:pool,rangedPool:ranged,maxEnemies:28,spawnInterval:1.5,events:[{type:'ambush',count:5,enemyPool:pool}]},
    {time,name:'守卫降临',enemyPool:[],rangedPool:[],maxEnemies:0,spawnInterval:999,events:[{type:'boss'}]}
  ];
  for(const [id,name,boss,pool,ranged,time] of [
    ['frost','寒霜墓园','frostWarden',['skeleton','bat','wild_dog'],['archer'],240],
    ['marsh','沉没遗迹','tideKeeper',['spider','rat','miner'],['crystal','mage'],270]
  ]) {
    CONFIG.LEVELS[id]={...CONFIG.LEVELS.village,name,theme:id,challenge:true,bgMusic:id==='frost'?'mine':'village',bossId:boss,bossSpawnTime:time,
      mapW:32,mapH:28,enemyPool:pool,rangedPool:ranged,elitePool:id==='frost'?['corrupted_knight']:['golem'],chestCount:4,mimicChance:.15,
      phases:phases(pool,ranged,time),encounters:[{id:'beacon',name:id==='frost'?'守夜火炬':'净潮石碑',availableAt:25,distance:220,triggerRadius:100,count:4,enemyPool:pool.slice(0,2),reward:1,sprite:'props/shrine_stone_lit'}],
      props:id==='frost'?{trees:['props/frost_pine_v100'],rocks:['props/frost_rock_v100'],stonework:['props/frost_obelisk_v100'],tombstones:CONFIG.LEVELS.village.props.tombstones}:
        {trees:['props/marsh_tree_v100'],ruins:['props/moss_arch_v100'],bones:['props/reeds_urn_v100'],stonework:CONFIG.LEVELS.mine.props.stonework}};
    CONFIG.LEVEL_VISUALS[id]={...CONFIG.LEVEL_VISUALS.village,terrainPattern:'',baseColor:id==='frost'?'#263d4c':'#1c302c',groundTintColor:'rgba(0,0,0,0)',patchCount:0,decorationCount:8,interiorWallSegments:0,mapFeatures:{},propScatterCounts:{trees:10,rocks:7,stonework:5,tombstones:10,ruins:7,bones:9}};
    CONFIG.STORY[id]={intro:[{speaker:'旅者',text:id==='frost'?'暴风雪每四十秒来袭。守住火炬，在暖光中迎击寒霜守卫。':'潮水每三十二秒涨落。留意水洼预警，夺回净潮石碑。'}],bossIntro:[{speaker:CONFIG.ENEMIES[boss].name,text:'禁地的守卫苏醒了。'}],victory:[{speaker:'旅者',text:'远征完成。下一段旅途由你选择。'}]};
  }
  const old={};for(const k of ['startNewGame','loadLevel','updateMenu','loadAndContinue','generateMap','updateThemeHazards','renderEncounterSites','renderObjectiveHUD','drawContinuousGround'])old[k]=Game[k];
  Object.assign(Game,{
    selectedCharacter:'warden',selectedExpedition:'campaign',
    getMenuLayout(){
      const v=this.getVisibleCanvasRect(),w=Math.min(600,v.w-24),x=v.x+(v.w-w)/2,gap=8,cardW=(w-2*gap)/3,scale=v.h/540;
      const rect=(y,h=32)=>({x,y:v.y+y*scale,w,h:h*scale});
      return {visible:v,scale,characters:Object.keys(CONFIG.CHARACTERS).map((id,i)=>({id,x:x+i*(cardW+gap),y:v.y+106*scale,w:cardW,h:110*scale})),
        expeditions:['campaign','frost','marsh'].map((id,i)=>({id,x:x+i*(cardW+gap),y:v.y+261*scale,w:cardW,h:43*scale})),
        start:rect(350,42),continue:rect(402,36),settings:rect(this.hasSave()?448:402),reset:rect(489,30)};
    },
    updateMenu(){
      if(this._settingsOverlay)return old.updateMenu.call(this);
      const l=this.getMenuLayout();
      for(const r of l.characters)if(Input.consumeClick(r.x,r.y,r.w,r.h)){this.selectedCharacter=r.id;Audio2.click();return;}
      for(const r of l.expeditions)if(Input.consumeClick(r.x,r.y,r.w,r.h)){this.selectedExpedition=r.id;Audio2.click();return;}
      return old.updateMenu.call(this);
    },
    renderMenu(){
      const c=this.ctx,l=this.getMenuLayout(),v=l.visible,compact=v.w<420,scale=l.scale;
      c.save();c.fillStyle='#101414';c.fillRect(0,0,960,540);
      const bg=Assets.get('backgrounds/scene_village_forest');if(bg?.complete){c.globalAlpha=.16;c.drawImage(bg,0,0,960,540);c.globalAlpha=1;}
      const text=(s,y,size,color='#d8c298')=>{c.textAlign='center';c.fillStyle=color;c.font=`${size}px Courier New`;c.fillText(this.fitChoiceBadgeText(c,s,v.w-24),v.x+v.w/2,v.y+y*scale);};
      text('环刀旅者',53,compact?26:36);text('选择旅者 · 开始你的远征',82,12,'#9fafa5');
      for(const r of l.characters){const d=CONFIG.CHARACTERS[r.id],selected=r.id===this.selectedCharacter;
        c.fillStyle=selected?'#26302a':'#161d1b';c.fillRect(r.x,r.y,r.w,r.h);c.strokeStyle=selected?d.color:'#455047';c.lineWidth=selected?2:1;c.strokeRect(r.x,r.y,r.w,r.h);
        this.drawCroppedAsset(c,`player/${r.id}_south_0_v100`,r.x+r.w/2,r.y+43*scale,42,62*scale);
        c.fillStyle=selected?d.color:'#b3b8ac';c.textAlign='center';c.font=`bold ${compact?11:14}px Courier New`;c.fillText(d.name,r.x+r.w/2,r.y+86*scale);c.font='10px Courier New';c.fillText(d.role,r.x+r.w/2,r.y+103*scale);
      }
      const hero=CONFIG.CHARACTERS[this.selectedCharacter];text(`${hero.perk} · ${CONFIG.WEAPONS[hero.weapon].name}`,240,compact?10:13,hero.color);
      for(const r of l.expeditions)this.drawButton(r.x,r.y,r.w,r.h,r.id==='campaign'?'三关战役':CONFIG.LEVELS[r.id].name,r.id===this.selectedExpedition?'#dfbf72':'#82968d');
      text(this.selectedExpedition==='campaign'?'村庄 → 矿洞 → 地狱':this.selectedExpedition==='frost'?'4 分钟首领 · 暴风雪 / 火炬避风':'4.5 分钟首领 · 潮汐 / 净潮石碑',328,compact?10:12,'#a0b1aa');
      this.drawButton(l.start.x,l.start.y,l.start.w,l.start.h,'开始远征','#dfbf72');
      if(this.hasSave()){const r=l.continue;this.drawButton(r.x,r.y,r.w,r.h,'继续存档中的旅途','#8fc7ae');const b=l.reset;this.drawButton(b.x,b.y,b.w,b.h,this.resetConfirmTimer>0?'再次点击确认清除':'重置存档','#aa8060');}
      const s=l.settings;this.drawButton(s.x,s.y,s.w,s.h,'设置','#b0a8c4');text(this.usesTouchControls()?'摇杆移动 · 右侧闪避':'WASD 移动 · 空格闪避 · ESC 暂停',531,9,'#87988d');c.restore();
    },
    startNewGame(...args){this._startingExpedition=true;try{return old.startNewGame.apply(this,args);}finally{this._startingExpedition=false;}},
    loadLevel(id){
      if(this._startingExpedition){const character=CONFIG.CHARACTERS[this.selectedCharacter]||CONFIG.CHARACTERS.warden;
        this.player.characterId=CONFIG.CHARACTERS[this.selectedCharacter]?this.selectedCharacter:'warden';this.player.stats={...this.player.stats,...character.stats};
        this.player.weapons=[];this.player.addWeapon(character.weapon);id=CONFIG.LEVELS[this.selectedExpedition]?.challenge?this.selectedExpedition:'village';
      }
      this.trialTickTimer=0;return old.loadLevel.call(this,id);
    },
    loadAndContinue(){old.loadAndContinue.call(this);if(this.levelData.challenge){this.runHistory=[];this.runHistoryComplete=true;this.runStartKills=0;this.runStartChests=0;}},
    drawContinuousGround(ctx,theme,w,h){
      const image=Assets.get('tiles/ground_'+theme+'_v100');
      if(!image?.complete)return old.drawContinuousGround.call(this,ctx,theme,w,h);
      ctx.save();ctx.globalAlpha=1;const tile=document.createElement('canvas');tile.width=tile.height=512;const t=tile.getContext('2d');t.imageSmoothingEnabled=false;
      for(let y=0;y<2;y++)for(let x=0;x<2;x++){t.save();t.translate(x?512:0,y?512:0);t.scale(x?-1:1,y?-1:1);t.drawImage(image,0,0,256,256);t.restore();}
      ctx.fillStyle=ctx.createPattern(tile,'repeat');ctx.fillRect(0,0,w,h);
      ctx.globalAlpha=.2;ctx.fillStyle=this.getLevelVisualProfile(theme).baseColor||'#25221b';ctx.fillRect(0,0,w,h);ctx.globalAlpha=1;
      if(theme==='village'){t.fillStyle='rgba(116,90,57,.32)';t.fillRect(0,0,512,512);this.villageRoadPattern=ctx.createPattern(tile,'repeat');}ctx.restore();
    },
    generateMap(){old.generateMap.call(this);this.trialZones=[];
      const c=this.groundTileCache.getContext('2d'),rng=makeRNG((this.runSeed^0x76313030)>>>0),w=this.levelData.mapW*48,h=this.levelData.mapH*48;
      // Tiny surface details are baked once, do not alter any collision footprint.
      for(let i=0;i<80;i++){const x=rng()*w,y=rng()*h;if(this.isCircleBlocked(x,y,24))continue;
        c.fillStyle=this.levelData.theme==='frost'?'#628297':this.levelData.theme==='hell'?'#47322b':'#45503b';c.globalAlpha=.22;
        for(let n=0;n<3;n++){c.fillRect(x+n*4,y+n%2*3,2,5);}}
      c.globalAlpha=1;
      if(this.levelData.challenge){for(let i=0;i<6;i++){const angle=i*TAU/6+.2,radius=320+rng()*140,z={x:w/2+Math.cos(angle)*radius,y:h/2+Math.sin(angle)*radius,r:82};
        z.points=Array.from({length:10},(_,n)=>{const a=n*TAU/10,r=z.r*(.7+rng()*.3);return{x:Math.round(z.x+Math.cos(a)*r),y:Math.round(z.y+Math.sin(a)*r*.85)};});this.trialZones.push(z);}
        if(this.levelData.theme==='marsh'){const water=Assets.get('tiles/water_marsh_v100'),pattern=water?.complete&&c.createPattern?c.createPattern(water,'repeat'):null;
          for(const z of this.trialZones){this.traceTrialZone(c,z);c.fillStyle=pattern||'#183734';c.fill();c.strokeStyle='#525b3e';c.lineWidth=7;c.stroke();
            c.strokeStyle='#3d5e50';c.lineWidth=2;c.stroke();}}}
    },
    traceTrialZone(ctx,z){ctx.beginPath();z.points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();},
    isPointInTrialZone(x,y,z){let inside=false;const ps=z.points;for(let i=0,j=ps.length-1;i<ps.length;j=i++){
      const a=ps[i],b=ps[j];if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)inside=!inside;}return inside;},
    getTrialWeather(){const frost=this.levelData?.theme==='frost',marsh=this.levelData?.theme==='marsh',period=frost?40:32,t=this.levelTime%period;
      return {active:(frost||marsh)&&t>=period-8,warning:(frost||marsh)&&t>=period-12&&t<period-8,next:Math.ceil(period-12-t),frost,marsh};},
    isTrialSheltered(){const p=this.player;return this.levelEncounters.some(s=>s.id==='beacon'&&s.status==='complete'&&dist(p.x,p.y,s.x,s.y)<180);},
    updateThemeHazards(dt){old.updateThemeHazards.call(this,dt);if(!this.levelData.challenge)return;const weather=this.getTrialWeather(),safe=this.isTrialSheltered();
      this.trialTickTimer=Math.max(0,(this.trialTickTimer||0)-dt);
      if(weather.frost&&weather.active&&!safe)this.environmentSpeedMult=.72;
      if(weather.marsh&&weather.active&&!safe&&this.trialZones.some(z=>this.isPointInTrialZone(this.player.x,this.player.y,z))){
        this.environmentSpeedMult=.65;if(this.trialTickTimer<=0){this.player.takeDamage(6);this.trialTickTimer=.6;}}
    },
    renderEncounterSites(ctx){old.renderEncounterSites.call(this,ctx);if(!this.levelData.challenge)return;const weather=this.getTrialWeather();ctx.save();
      for(const s of this.levelEncounters.filter(s=>s.id==='beacon'&&s.status==='complete')){ctx.strokeStyle='#d6c07f';ctx.lineWidth=2;ctx.beginPath();ctx.arc(s.x,s.y,180,0,TAU);ctx.stroke();}
      if(weather.marsh&&(weather.warning||weather.active))for(const z of this.trialZones){ctx.strokeStyle=weather.active?'#80c6bd':'#d8ba71';ctx.lineWidth=3;ctx.setLineDash(weather.active?[]:[6,6]);this.traceTrialZone(ctx,z);ctx.stroke();}
      if(weather.frost&&weather.active){ctx.fillStyle='#c4e3eb';for(let i=0;i<30;i++){const x=this.camera.x+(i*79+this.levelTime*95)%960,y=this.camera.y+(i*131+this.levelTime*40)%540;ctx.fillRect(x,y,3,2);}}
      ctx.restore();
    },
    renderObjectiveHUD(){old.renderObjectiveHUD.call(this);if(!this.levelData.challenge)return;const v=this.getVisibleCanvasRect(),c=this.ctx,w=this.getTrialWeather();c.save();c.textAlign='right';c.font='11px Courier New';c.fillStyle=w.active?'#efbc78':'#a1c8c8';
      c.fillText(this.isTrialSheltered()?'石碑暖光 · 环境庇护':w.active?(w.frost?'暴风雪 · 寻找暖光':'涨潮 · 离开水洼'):w.warning?'环境预警 · 4 秒内来袭':`环境来袭 · ${Math.max(0,w.next)} 秒`,v.x+v.w-12,v.y+130);c.restore();}
  });
})();

// Flight silhouettes stay aligned with velocity; effects do not change hitboxes.
Projectile.prototype.getVisualFamily=function(){
  const id=this.weaponId||'';
  if(/bow|ballista|spear/.test(id))return 'arrow';
  if(/knife/.test(id))return 'knife';
  if(/fire|burning/.test(id))return 'flame';
  if(/poison/.test(id))return 'toxin';
  if(this.homing||/soul/.test(id))return 'spirit';
  return 'arcane';
};
const drawProjectileSprite=Projectile.prototype.draw;
Projectile.prototype.draw=function(ctx){
  const family=this.getVisualFamily(),size=this.size;
  ctx.save();ctx.translate(this.x,this.y);ctx.rotate(this.angle);ctx.globalAlpha=.35;ctx.fillStyle=this.color;
  ctx.beginPath();ctx.moveTo(-Math.min(36,size*1.1),0);ctx.lineTo(-size*.2,-size*.13);ctx.lineTo(size*.1,0);ctx.lineTo(-size*.2,size*.13);ctx.closePath();ctx.fill();ctx.globalAlpha=1;
  if(family==='arrow'||family==='knife'){
    const len=size*.7;ctx.strokeStyle=family==='knife'?'#d6dfe0':'#c4a76e';ctx.lineWidth=family==='knife'?3:2;ctx.beginPath();ctx.moveTo(-len/2,0);ctx.lineTo(len/2,0);ctx.stroke();
    ctx.fillStyle='#e6e5d2';ctx.beginPath();ctx.moveTo(len/2+4,0);ctx.lineTo(len/2-5,-4);ctx.lineTo(len/2-5,4);ctx.closePath();ctx.fill();
    ctx.strokeStyle=family==='knife'?'#8c634a':'#9ac3ae';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-len/2,0);ctx.lineTo(-len/2-5,-3);ctx.moveTo(-len/2,0);ctx.lineTo(-len/2-5,3);ctx.stroke();ctx.restore();return;
  }
  ctx.restore();drawProjectileSprite.call(this,ctx);
  if(family==='spirit'||family==='arcane'){ctx.save();ctx.strokeStyle=this.color+'90';ctx.lineWidth=1;ctx.beginPath();ctx.arc(this.x,this.y,size*.36,0,TAU);ctx.stroke();ctx.restore();}
};
