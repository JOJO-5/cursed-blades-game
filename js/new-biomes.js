// Three oath biomes: deterministic scenery and shared telegraph/damage geometry.
(() => {
  CONFIG.CAMPAIGN_TIERS=[['village'],['mine','frost','forest'],['hell','marsh'],['clock','court']];
  const profiles={
    forest:{name:'荆棘誓林',base:'#202b23',path:'#4b4934',accent:'#b9b682',boss:'thornHeart',pool:['wild_dog','spider','bat'],ranged:['archer'],asset:'oath_tree_v180',music:'village',time:240,desc:'枝根苏醒 · 守护誓印',reward:'荆棘誓约：范围 +10%',apply:p=>p.stats.rangeMult*=1.1},
    clock:{name:'断钟工坊',base:'#282725',path:'#514637',accent:'#d7b877',boss:'bellEngine',pool:['miner','skeleton','golem'],ranged:['crystal'],asset:'oath_clock_v180',music:'mine',time:270,desc:'轮替电轨 · 钟摆审判',reward:'断钟誓约：攻击冷却缩短 6%',apply:p=>p.stats.cooldownMult*=.94},
    court:{name:'无光王庭',base:'#252532',path:'#494455',accent:'#c5b4df',boss:'hollowCrown',pool:['corrupted_knight','skeleton','bat'],ranged:['mage','archer'],asset:'oath_throne_v180',music:'hell',time:270,desc:'交替誓灯 · 空冠回响',reward:'王庭誓约：伤害 +10%',apply:p=>p.stats.damageMult*=1.1}
  };
  CONFIG.OATH_ROUTES={};
  for(const [id,p] of Object.entries(profiles)){
    CONFIG.STORY[id]={intro:[{speaker:'旅者',text:p.name+'的誓印已经黯淡。'+({forest:'枝根亮起后即将苏醒，留在道路上，夺回净化誓印获得庇护。',clock:'电轨将交替通电。留意四秒预警，离开亮起的轨道。',court:'无光吞噬未受庇护的土地。四秒预警后，进入亮起的誓光。'})[id]}],bossIntro:[{speaker:'守誓者',text:'背负环刃之人，你能承受最后的誓约吗？'}],victory:[{speaker:'旅者',text:'这片土地的诅咒终于松动了。'}]};
    CONFIG.OATH_ROUTES[id]={title:p.name,desc:p.desc,reward:p.reward,apply:p.apply,color:p.accent};
    const phases=[0,60,120,180,p.time].map((time,i)=>({time,name:['誓印初现','诅咒蔓延','破誓守军','余响围猎','誓主降临'][i],enemyPool:i===4?[]:p.pool,rangedPool:i>0&&i<4?p.ranged:[],maxEnemies:i===4?0:12+i*5,spawnInterval:i===4?999:2.7-i*.35,events:i===4?[{type:'boss'}]:i===1?[{type:'chest',rare:false,mimic:false}]:i===2?[{type:'elite'},{type:'chest',rare:true,mimic:false}]:[]}));
    CONFIG.ENEMIES[p.boss]={...CONFIG.ENEMIES.boss,name:({forest:'缚誓古树',clock:'断钟机心',court:'空冠之座'})[id],sprite:'bosses/'+p.boss+'_v180',spriteHeight:id==='forest'?132:120,color:p.accent,hp:id==='forest'?850:1100,damage:id==='forest'?25:30,speed:id==='clock'?22:28};
    CONFIG.LEVELS[id]={...CONFIG.LEVELS.frost,name:p.name,theme:id,bgMusic:p.music,bossId:p.boss,bossSpawnTime:p.time,mapW:36,mapH:30,challenge:true,props:{},phases,enemyPool:p.pool,rangedPool:p.ranged,elitePool:['corrupted_knight'],sceneBgs:[],encounters:[{id:'oath',name:'净化誓印',availableAt:25,distance:220,triggerRadius:95,count:4,enemyPool:p.pool.slice(0,2),reward:1,sprite:'props/shrine_stone_lit'}]};
    CONFIG.LEVEL_VISUALS[id]={...CONFIG.LEVEL_VISUALS.frost,baseColor:p.base,useGroundTiles:false,terrainPattern:'',groundTintColor:'',patchCount:0,decorationCount:0,interiorWallSegments:0,mapFeatures:{},propScatterCounts:{}};
  }
  const old={};for(const k of ['generateMap','drawContinuousGround','updateThemeHazards','renderEncounterSites','renderObjectiveHUD','drawSceneObjective'])old[k]=Game[k];
  Object.assign(Game,{
    drawContinuousGround(c,theme,w,h){
      const p=profiles[theme];if(!p)return old.drawContinuousGround.call(this,c,theme,w,h);
      const rng=makeRNG(this.runSeed^0x1800);c.fillStyle=p.base;c.fillRect(0,0,w,h);
      const image=Assets.get('tiles/ground_'+theme+'_v180');
      if(image?.complete){const tile=document.createElement('canvas');tile.width=tile.height=512;const t=tile.getContext('2d');t.imageSmoothingEnabled=false;for(let y=0;y<2;y++)for(let x=0;x<2;x++){t.save();t.translate(x?512:0,y?512:0);t.scale(x?-1:1,y?-1:1);t.drawImage(image,0,0,256,256);t.restore();}c.fillStyle=c.createPattern(tile,'repeat');c.fillRect(0,0,w,h);}
      c.save();c.globalAlpha=.26;c.fillStyle=p.base;c.fillRect(0,0,w,h);c.restore();
      // Original low-contrast material, baked once; no tile grid or noisy overlays.
      c.save();c.lineCap='round';c.strokeStyle=p.path;
      const cx=w/2,cy=h/2;for(const [dx,dy] of [[-330,-260],[330,-260],[-330,260],[330,260]]){
        for(const [width,alpha] of [[110,.05],[88,.08],[62,.1]]){c.globalAlpha=alpha;c.lineWidth=width;c.beginPath();c.moveTo(cx,cy);c.quadraticCurveTo(cx+dx*.25,cy+dy*.75,cx+dx,cy+dy);c.stroke();}
        for(let i=0;i<32;i++){const t=i/32,x=cx+2*(1-t)*t*dx*.25+t*t*dx,y=cy+2*(1-t)*t*dy*.75+t*t*dy;c.globalAlpha=.18+rng()*.13;c.fillStyle=theme==='forest'?'#8b8056':p.accent;const offset=(rng()-.5)*62;c.fillRect(Math.round(x+offset),Math.round(y+(rng()-.5)*40),theme==='forest'?3:10+rng()*14,theme==='forest'?2:4+rng()*7);}
      }c.restore();
    },
    generateMap(){
      old.generateMap.call(this);const p=profiles[this.levelData.theme];this.oathHazardTick=0;if(!p)return;
      const cx=this.levelData.mapW*24,cy=this.levelData.mapH*24,c=this.groundTileCache.getContext('2d'),rng=makeRNG(this.runSeed^0x1818);
      const walls=this.collisionProps.filter(p=>p.category==='wall'),props=[];
      const secondary=this.levelData.theme==='forest'?['tree_dead_gnarled_01','marsh_tree_v100','ruin_tree_stone_base']:this.levelData.theme==='clock'?['wooden_workbench','barrels_v110','forge_v120']:['wall_v110','grave_v110','hell_ai_obsidian_obelisk'];
      this.mapData.regions=[[-330,-260],[330,-260],[-330,260],[330,260]].map(([dx,dy],i)=>({id:'oath'+i,name:['失落誓印','断誓遗址','旧路营地','诅咒之心'][i],x:cx+dx,y:cy+dy,radius:80}));
      for(const region of this.mapData.regions){
        for(let i=0;i<6;i++){
          const x=region.x+(i===0?0:Math.cos(i*1.2)*130),y=region.y-100+(i===0?0:Math.sin(i*1.2)*95),landmark=i===0;
          const prop={type:'props/'+(landmark?p.asset:secondary[(i-1)%3]),x,y,scene:true,drawW:landmark?150:62,drawH:landmark?162:78,halfW:landmark?36:15,halfH:landmark?16:10,category:'stonework',regionId:region.id,landmark};
          prop.radius=prop.halfW;prop.collisionX=x;prop.collisionY=y-prop.halfH;
          if(dist(x,y,cx,cy)<155||this.levelEncounters.some(s=>dist(x,y,s.x,s.y)<145)||props.some(q=>dist(x,y,q.x,q.y)<80))continue;
          props.push(prop);this.bakeSceneContact(c,x,y,prop.drawW,Math.floor(rng()*1e6));
        }
      }
      this.mapData.props=props.sort((a,b)=>a.y-b.y);this.collisionProps=walls.concat(props);
      this.oathZones=Array.from({length:6},(_,i)=>({x:cx+Math.cos(i*TAU/6)*330,y:cy+Math.sin(i*TAU/6)*270,r:72}));
      // Tracks are static scenery, the live highlighted strip is the actual danger.
      if(this.levelData.theme==='clock'){c.save();c.strokeStyle='#73634b';c.lineWidth=3;for(const d of [-180,180]){for(const s of [-15,15]){c.beginPath();c.moveTo(110,cy+d+s);c.lineTo(cx*2-110,cy+d+s);c.stroke();c.beginPath();c.moveTo(cx+d+s,110);c.lineTo(cx+d+s,cy*2-110);c.stroke();}}c.restore();}
      if(this.levelData.theme==='court')for(const z of this.oathZones){c.save();c.strokeStyle=p.path;c.lineWidth=5;c.beginPath();c.arc(z.x,z.y,94,0,TAU);c.stroke();c.restore();}
    },
    getOathHazardState(){
      const theme=this.levelData.theme;if(!profiles[theme])return null;
      const t=this.levelTime%16,index=Math.floor(this.levelTime/16)%2;
      return {theme,index,warning:t>=9&&t<13,active:t>=13,remaining:Math.ceil(13-t),color:profiles[theme].accent};
    },
    oathHazardContains(x,y,s=this.getOathHazardState()){
      const cx=this.levelData.mapW*24,cy=this.levelData.mapH*24;
      if(!s)return false;
      if(s.theme==='forest')return this.oathZones.some((z,i)=>i%2===s.index&&dist(x,y,z.x,z.y)<z.r);
      if(s.theme==='clock')return [-180,180].some(d=>Math.abs((s.index?x-cx:y-cy)-d)<34);
      return !this.oathZones.some((z,i)=>i%2===s.index&&dist(x,y,z.x,z.y)<150);
    },
    updateThemeHazards(dt){
      old.updateThemeHazards.call(this,dt);const s=this.getOathHazardState();if(!s)return;
      this.oathHazardTick=Math.max(0,(this.oathHazardTick||0)-dt);
      const shelter=this.levelEncounters.some(z=>z.id==='oath'&&z.status==='complete'&&dist(this.player.x,this.player.y,z.x,z.y)<160);
      if(s.active&&!shelter&&this.oathHazardContains(this.player.x,this.player.y,s)){if(s.theme==='forest')this.environmentSpeedMult*=.75;if(this.oathHazardTick<=0){this.player.takeDamage(7);this.oathHazardTick=.8;}}
    },
    drawSceneObjective(c,site){if(site.id!=='oath')return old.drawSceneObjective.call(this,c,site);this.drawSceneProp(c,{type:'props/shrine_stone_lit',x:site.x,y:site.y,scene:true,drawW:62,drawH:82});},
    renderEncounterSites(c){
      old.renderEncounterSites.call(this,c);const s=this.getOathHazardState();if(!s)return;c.save();
      if(s.warning||s.active){c.strokeStyle=s.color;c.fillStyle=s.color;c.lineWidth=2;c.setLineDash(s.warning?[6,5]:[]);
        if(s.theme==='clock'){const cx=this.levelData.mapW*24,cy=this.levelData.mapH*24;for(const d of [-180,180]){const x=s.index?cx+d-34:110,y=s.index?110:cy+d-34,w=s.index?68:cx*2-220,h=s.index?cy*2-220:68;c.globalAlpha=.18;c.fillRect(x,y,w,h);c.globalAlpha=.85;c.strokeRect(x,y,w,h);}}
        else for(const [i,z] of this.oathZones.entries()){if(i%2!==s.index)continue;c.beginPath();c.arc(z.x,z.y,s.theme==='court'?150:z.r,0,TAU);c.globalAlpha=.15;c.fill();c.globalAlpha=.9;c.stroke();if(s.theme==='court'){c.font='12px Courier New';c.textAlign='center';c.fillText('誓光庇护',z.x,z.y);}}
      }
      for(const z of this.levelEncounters.filter(z=>z.id==='oath'&&z.status==='complete')){c.globalAlpha=.9;c.strokeStyle='#dfcd8b';c.beginPath();c.arc(z.x,z.y,160,0,TAU);c.stroke();}c.restore();
    },
    renderObjectiveHUD(){old.renderObjectiveHUD.call(this);const s=this.getOathHazardState();if(!s)return;const c=this.ctx,v=this.getVisibleCanvasRect();c.save();c.fillStyle=s.color;c.font='11px Courier New';c.textAlign='right';const tip={forest:'离开亮起的枝根',clock:'离开亮起的电轨',court:'进入亮起的誓光'}[s.theme];c.fillText(s.active?tip:s.warning?`4 秒预警 · ${tip}`:`誓印轮替 · ${Math.max(0,9-this.levelTime%16).toFixed(0)} 秒`,v.x+v.w-12,v.y+130);c.restore();}
  });
  // Each new guardian has its own paired signature; the geometry uses BossCombat's renderer.
  Object.assign(BossCombat.profiles,{thornHeart:['rootCross','seedBurst'],bellEngine:['clockHands','gearRain'],hollowCrown:['crownRing','oathJudgment']});
  Object.assign(BossCombat.names,{rootCross:'断誓根刺',seedBurst:'诅咒花种',clockHands:'钟针扫荡',gearRain:'落齿审判',crownRing:'空冠回响',oathJudgment:'誓光裁决'});
  const make=BossCombat.make;
  BossCombat.make=function(b,p,ability){
    const base={x:b.x,y:b.y,angle:b.abilityDir,r:140,width:32,arc:1.1,warn:1.3,life:.8,tick:0,damage:b.damage*.8,color:b.def.color,ability},add=o=>({...base,...o});
    if(ability==='rootCross')return [-.65,0,.65].map(a=>add({kind:'lane',angle:base.angle+a,r:330,width:28}));
    if(ability==='seedBurst')return [-1,0,1].map(i=>add({kind:'circle',x:p.x+i*90,y:p.y+Math.abs(i)*75,r:44,life:2}));
    if(ability==='clockHands')return [0,Math.PI].map(a=>add({kind:'cone',angle:base.angle+a,r:270,arc:.65}));
    if(ability==='gearRain')return [-1,0,1].map(i=>add({kind:'circle',x:p.x+i*100,y:p.y,r:40,life:1.4}));
    if(ability==='crownRing')return [add({kind:'ring',r:70,width:24,expand:true,life:2})];
    if(ability==='oathJudgment')return [add({kind:'circle',x:p.x,y:p.y,r:190,life:1.6,safe:this.safePoint(p.x,p.y,base.angle+1.57,90)})];
    return make.call(this,b,p,ability);
  };
})();
