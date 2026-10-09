// v0.8 world layouts and biome objectives. Version 0 keeps pre-v0.8 geometry.
(() => {
  CONFIG.LEVELS.mine.encounters=[{id:'cart',name:'晶矿运输',mode:'escort',manual:true,minLayout:1,
    availableAt:30,distance:260,triggerRadius:110,count:4,enemyPool:['miner','bat'],reward:1,sprite:'props/minecart_v080',speed:52,length:520}];
  CONFIG.LEVELS.hell.encounters=[{id:'rift',name:'深渊封印',mode:'seal',manual:true,minLayout:1,
    availableAt:45,distance:330,triggerRadius:110,count:6,enemyPool:['imp','hellhound','demon_soldier'],reward:1,sprite:'effects/hell_ai_rune_circle',duration:5}];
  const old={};
  for(const name of ['loadLevel','migrateSave','initLevelEncounters','serializeEncounters','restoreLevelEncounters','generateThemeMapFeatures','isPointNearThemeFeature','generateMap','drawMapFeature','renderEncounterSites','renderObjectiveHUD','updateThemeHazards','spawnEnemyGroupAtMapFeatures'])old[name]=Game[name];
  Object.assign(Game,{
    mapLayoutVersion:2,
    loadLevel(...args){this.mapLayoutVersion=args[0]==='village'?2:3;return old.loadLevel.apply(this,args);},
    migrateSave(data){const version=data?.mapLayoutVersion;data=old.migrateSave.call(this,data);if(data&&typeof data==='object')data.mapLayoutVersion=[1,2].includes(version)?version:0;return data;},
    getLevelEncounterDefinitions(){return (this.levelData.encounters||[]).filter(d=>!d.minLayout||this.mapLayoutVersion>=d.minLayout);},
    initLevelEncounters(){
      old.initLevelEncounters.call(this);
      for(const site of this.levelEncounters) {
        site.progress=0;
        if(site.id==='cart') {
          const cx=this.levelData.mapW*CONFIG.TILE_SIZE/2,cy=this.levelData.mapH*CONFIG.TILE_SIZE/2;
          site.startX=cx-260;site.endX=cx+260;site.x=site.startX;site.y=cy;
        }
      }
    },
    serializeEncounters(){return old.serializeEncounters.call(this).map(s=>({...s,progress:this.levelEncounters.find(e=>e.id===s.id)?.progress||0}));},
    restoreLevelEncounters(saved){
      old.restoreLevelEncounters.call(this,saved);
      for(const site of this.levelEncounters) {
        const data=Array.isArray(saved)?saved.find(e=>e?.id===site.id):null;
        site.progress=site.status==='complete'?1:clamp(Number(data?.progress)||0,0,.999999);
        if(site.id==='cart')site.x=site.startX+(site.endX-site.startX)*site.progress;
        if(site.id==='rift')for(const f of this.mapData?.features||[])if(f.objectiveRift)f.sealed=site.status==='complete';
      }
    },
    advanceWorldEncounter(site,def,dt) {
      if(!def.mode)return true;
      if(dist(this.player.x,this.player.y,site.x,site.y)>def.triggerRadius)return false;
      const increment=def.mode==='escort'?dt*def.speed/def.length:dt/def.duration;
      site.progress=clamp((site.progress||0)+increment,0,1);
      if(def.mode==='escort')site.x=site.startX+(site.endX-site.startX)*site.progress;
      if(site.progress<1)return false;
      if(def.mode==='seal')for(const feature of this.mapData.features||[])if(feature.type==='demonRift'&&dist(feature.x,feature.y,site.x,site.y)<1)feature.sealed=true;
      return true;
    },
    getEncounterActionLabel(site) {
      const def=this.levelData.encounters.find(d=>d.id===site.id);
      return def.mode==='escort'?'启动矿车 · E / 点按':def.mode==='seal'?'开始封印 · E / 点按':`挑战${def.count}只守卫 · E / 点按`;
    },
    getEncounterObjectiveDetail(site,def,distance) {
      const guards=this.enemies.filter(e=>e.alive&&e.encounterId===site.id).length;
      if(site.status==='active')return guards?`清理守卫 ${guards}/${def.count} · 稀有宝箱`:
        def.mode==='escort'?`护送 ${Math.floor(site.progress*100)}% · 靠近矿车推进`:`封印 ${Math.floor(site.progress*100)}% · 留在光圈内`;
      return def.mode==='escort'?`${Math.ceil(distance/CONFIG.TILE_SIZE)}格 · 清场后护送，获稀有宝箱`:`${Math.ceil(distance/CONFIG.TILE_SIZE)}格 · 清场后驻守5秒，封印裂隙`;
    },
    getVillageRegions() {
      const cx=this.levelData.mapW*CONFIG.TILE_SIZE/2,cy=this.levelData.mapH*CONFIG.TILE_SIZE/2;
      const rotation=(this.runSeed>>>0)%4;
      return [{id:'graveyard',name:'荒废墓园',categories:['tombstones','bones']},{id:'homestead',name:'旧居遗址',categories:['houses','ruins']},
        {id:'market',name:'破败集市',categories:['barrels','fences','gallows']},{id:'grove',name:'枯木林地',categories:['trees']}].map((r,i)=>{
          const quadrant=(i+rotation)%4;return {...r,type:'regionSite',x:cx+(quadrant%2?400:-400),y:cy+(quadrant<2?-300:300),radius:100};
        });
    },
    generateThemeMapFeatures(...args) {
      const features=old.generateThemeMapFeatures.apply(this,args);
      if(this.mapLayoutVersion<1)return features;
      const theme=this.levelData.theme,cx=this.levelData.mapW*CONFIG.TILE_SIZE/2,cy=this.levelData.mapH*CONFIG.TILE_SIZE/2;
      if(theme==='village'&&this.mapLayoutVersion===2)for(let i=features.length-1;i>=0;i--)if(features[i].type==='villageCrossroads')features.splice(i,1);
      if(theme==='village')for(const region of this.getVillageRegions()) {
        const points=this.mapLayoutVersion===2?[{x:cx,y:cy},{x:cx+(region.x-cx)*.36,y:cy+(region.y-cy)*.52},{x:cx+(region.x-cx)*.7,y:cy+(region.y-cy)*.68},{x:region.x,y:region.y}]:null;
        features.push(region,{type:'regionPath',x1:cx,y1:points?cy:region.y,x2:region.x,y2:region.y,width:this.mapLayoutVersion===2?88:62,points});
      }
      if(theme==='mine')features.push({type:'railLine',x1:cx-370,y1:cy,x2:cx+370,y2:cy,horizontal:true,width:100,sleeperGap:30,railColor:'#786b53',sleeperColor:'#362b22',objectiveRoute:true});
      if(theme==='hell') {
        const site=this.levelEncounters.find(s=>s.id==='rift');
        if(site)features.push({type:'demonRift',x:site.x,y:site.y,radius:64,damage:7,tickRate:.8,slow:.82,sprite:'effects/hell_ai_rune_circle',objectiveRift:true});
      }
      return features;
    },
    isPointNearThemeFeature(x,y,radius,features) {
      if(old.isPointNearThemeFeature.call(this,x,y,radius,features))return true;
      for(const f of features||[]) {
        if(f.type==='regionSite'&&dist(x,y,f.x,f.y)<f.radius+radius)return true;
        if(f.type==='regionPath'&&f.points){for(let i=1;i<f.points.length;i++){const a=f.points[i-1],b=f.points[i],dx=b.x-a.x,dy=b.y-a.y,t=clamp(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);if(dist(x,y,a.x+dx*t,a.y+dy*t)<f.width/2+radius)return true;}continue;}
        if(f.type==='regionPath'&&x>=Math.min(f.x1,f.x2)-radius&&x<=Math.max(f.x1,f.x2)+radius&&Math.abs(y-f.y1)<f.width/2+radius)return true;
      }
      return false;
    },
    drawMapFeature(ctx,f) {
      if(f.objectiveRift)return; // Draw the seal dynamically so its danger can visibly end.
      if(!f.objectiveRoute)return old.drawMapFeature.call(this,ctx,f);
      ctx.save();ctx.fillStyle='#32291f';
      for(let x=f.x1;x<=f.x2;x+=30)ctx.fillRect(x-4,f.y1-38,8,76);
      ctx.fillStyle='#80705a';ctx.fillRect(f.x1,f.y1-27,f.x2-f.x1,4);ctx.fillRect(f.x1,f.y1+24,f.x2-f.x1,4);
      ctx.fillStyle='#b2a28b';ctx.fillRect(f.x1,f.y1-27,f.x2-f.x1,1);ctx.fillRect(f.x1,f.y1+24,f.x2-f.x1,1);ctx.restore();
    },
    generateMap() {
      old.generateMap.call(this);
      this.mapData.regions=[];
      if(this.mapLayoutVersion<1)return;
      if(this.levelData.theme==='village') {
        const regions=this.getVillageRegions(),rng=makeRNG((this.runSeed^0x72656769)>>>0);
        this.mapData.regions=regions;
        if(this.mapLayoutVersion===1)for(const region of regions)for(const prop of this.mapData.props.filter(p=>region.categories.includes(p.category))) {
          const others=this.collisionProps.filter(p=>p!==prop);
          for(let attempt=0;attempt<60;attempt++) {
            const angle=rng()*TAU,ring=145+rng()*120,x=region.x+Math.cos(angle)*ring,y=region.y+Math.sin(angle)*ring;
            const radius=Math.max(prop.radius||0,prop.halfWidth||0,prop.halfHeight||0);
            if(this.isPointNearThemeFeature(x,y,radius,this.mapData.features)||others.some(p=>this.footprintOverlapsCircle(p.x,p.y,p,x,y,radius+12)))continue;
            prop.x=x;prop.y=y;prop.collisionX=x+(prop.collisionOffsetX||0);prop.collisionY=y+(prop.collisionOffsetY||0);prop.regionId=region.id;break;
          }
        }
        if(this.mapLayoutVersion===2)this.composeVillageScene(regions,rng);
        const ctx=this.groundTileCache.getContext('2d');
        for(const f of this.mapData.features.filter(f=>f.type==='regionPath')) {
          if(f.points){ctx.save();ctx.lineCap=ctx.lineJoin='round';for(const [extra,alpha] of [[28,.08],[14,.18],[0,.65]]){ctx.globalAlpha=alpha;ctx.strokeStyle=this.villageRoadPattern||'#605033';ctx.lineWidth=f.width+extra;ctx.beginPath();f.points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();}ctx.restore();continue;}
          ctx.save();ctx.strokeStyle=this.villageRoadPattern||'#423724';ctx.lineWidth=f.width;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(f.x1,f.y1);ctx.lineTo(f.x2,f.y2);ctx.stroke();ctx.restore();
        }
        this.mapData.props.sort((a,b)=>a.y-b.y);
      }
      for(const site of this.levelEncounters.filter(s=>s.id==='rift')) {
        const feature=this.mapData.features.find(f=>f.objectiveRift);
        if(feature)feature.sealed=site.status==='complete';
      }
    },
    composeVillageScene(regions,rng) {
      const templates={
        homestead:[['cottage',-80,-108,true],['wall',110,-112],['wall',-174,102],['barrels',85,108],['torch',-16,-110],['cottage',176,154]],
        graveyard:[['altar',0,-112,true],['grave',-104,-112],['grave',104,-112],['grave',-104,100],['grave',0,100],['grave',104,100],['wall',-188,0],['wall',188,0],['torch',-62,-92],['torch',62,-92]],
        market:[['stall',-104,-106,true],['stall',114,110],['barrels',140,-106],['barrels',-150,106],['wall',-215,-100],['torch',24,-96]],
        grove:[['oak',-114,-102,true],['oak',120,-106],['oak',-166,130],['oak',178,116],['log',0,112],['log',170,-90],['grave',-224,-102]]
      };
      const sizes={cottage:[194,164,81,32],stall:[174,118,50,15],wall:[118,55,48,12],barrels:[76,65,25,16],torch:[38,80,9,9],altar:[90,115,27,19],grave:[46,62,16,9],oak:[140,190,17,12],log:[136,50,53,10]};
      const w=this.levelData.mapW*48,h=this.levelData.mapH*48,cx=w/2,cy=h/2,props=[],bodies=this.collisionProps.filter(p=>p.category==='wall');
      const canPlace=(p)=>p.x>80&&p.x<w-80&&p.y>90&&p.y<h-90&&!this.footprintOverlapsCircle(p.x,p.y,p,cx,cy,110)&&
        !this.levelEncounters.some(s=>this.footprintOverlapsCircle(p.x,p.y,p,s.x,s.y,110))&&
        !this.isPointNearThemeFeature(p.collisionX,p.collisionY,p.radius+4,this.mapData.features.filter(f=>f.type==='regionPath'))&&
        !props.some(q=>this.footprintOverlapsCircle(q.x,q.y,q,p.collisionX,p.collisionY,p.radius+8));
      for(const region of regions)for(const [id,dx,dy,landmark] of templates[region.id]){
        const [drawW,drawH,halfW,halfH]=sizes[id],jitter=landmark?0:Math.round((rng()-.5)*8);let placed;
        // Reflect the compound with its quadrant: the landmark stays outside
        // the incoming road instead of crossing it when seed rotation changes.
        const sx=region.x<cx?1:-1,sy=region.y<cy?1:-1;
        for(const offset of [0,28,-28,56,-56,100,-100,160,-160]){
          const x=region.x+dx*sx+jitter,y=region.y+(dy+offset)*sy,p={type:`props/${id}_v110`,category:id==='oak'?'trees':id==='cottage'?'houses':'stonework',x,y,scene:true,drawW,drawH,regionId:region.id,landmark:!!landmark,radius:Math.max(halfW,halfH),halfW,halfH,collisionOffsetY:-halfH,collisionX:x,collisionY:y-halfH};
          if(!canPlace(p))continue;props.push(p);placed=p;break;
        }
        if(!placed&&landmark)throw new Error('No safe landmark placement: '+region.id);
      }
      for(const p of props.filter(p=>p.type==='props/cottage_v110')){p.compound=true;p.doorOffsetX=40;
        // The generated cottage door is on the right of its front wall.
        for(const [dx,dy,halfW,halfH] of [[-26,-22,34,24],[69,-22,12,24],[8,-55,73,9]])bodies.push({type:'scene-wall',category:'wall',x:p.x+dx,y:p.y+dy,collisionX:p.x+dx,collisionY:p.y+dy,radius:Math.max(halfW,halfH),halfW,halfH});}
      this.mapData.props=props;this.collisionProps=bodies.concat(props.filter(p=>p.radius>0&&!p.compound));
    },
    updateThemeHazards(dt) {
      // The objective rift has an intentional dangerous core while unsealed.
      // Completed seals permanently remove its damage, slow and phase ambush.
      const features=this.mapData?.features;
      if(!features)return old.updateThemeHazards.call(this,dt);
      const active=features.filter(f=>!f.sealed);this.mapData.features=active;
      try{return old.updateThemeHazards.call(this,dt);}finally{this.mapData.features=features;}
    },
    spawnEnemyGroupAtMapFeatures(...args) {
      const features=this.mapData?.features;if(!features)return old.spawnEnemyGroupAtMapFeatures.apply(this,args);
      this.mapData.features=features.filter(f=>!f.sealed);
      try{return old.spawnEnemyGroupAtMapFeatures.apply(this,args);}finally{this.mapData.features=features;}
    },
    renderEncounterSites(ctx) {
      const regular=this.levelEncounters.filter(s=>!['cart','rift'].includes(s.id));
      const all=this.levelEncounters;this.levelEncounters=regular;
      try{old.renderEncounterSites.call(this,ctx);}finally{this.levelEncounters=all;}
      for(const site of all.filter(s=>['cart','rift'].includes(s.id))) {
        if(site.status==='expired'||!this.isOnScreen(site.x,site.y,200))continue;
        const def=this.levelData.encounters.find(d=>d.id===site.id),done=site.status==='complete';
        ctx.save();ctx.strokeStyle=done?'#7dd8a0':'#cfa85d';ctx.lineWidth=2;
        ctx.beginPath();ctx.arc(site.x,site.y,def.triggerRadius,0,TAU);ctx.stroke();
        if(site.id==='cart') {
          Assets.drawCentered(ctx,def.sprite,site.x,site.y-8,.85,0,1);
          if(site.status==='active'&&site.progress>0&&dist(this.player.x,this.player.y,site.x,site.y)<=def.triggerRadius&&!this.enemies.some(e=>e.alive&&e.encounterId===site.id)) {
            ctx.fillStyle='#b9dddb';for(let i=0;i<3;i++)ctx.fillRect(site.x-32-i*10,site.y+4+Math.sin(this.levelTime*14+i)*3,3,2);
          }
        } else {
          ctx.globalAlpha=done?0.45:0.65+Math.sin(this.levelTime*3)*0.15;
          if(done)ctx.filter='hue-rotate(95deg) saturate(0.5)';
          Assets.drawCentered(ctx,def.sprite,site.x,site.y,.8,done?0:this.levelTime*.12,1);ctx.globalAlpha=1;ctx.filter='none';
          ctx.strokeStyle=done?'#7dd8a0':'#d490ef';ctx.lineWidth=4;ctx.beginPath();ctx.arc(site.x,site.y,58,-Math.PI/2,-Math.PI/2+TAU*(site.progress||.001));ctx.stroke();
        }
        ctx.fillStyle=done?'#7dd8a0':'#f4d28c';ctx.font='bold 12px Courier New';ctx.textAlign='center';
        ctx.fillText(done?`${def.name} · 已完成`:def.name,site.x,site.y+70);ctx.restore();
      }
    },
    renderObjectiveHUD() {
      old.renderObjectiveHUD.call(this);
      if(this.mapLayoutVersion<1)return;
      const ctx=this.ctx,p=this.getObjectiveLayout();let name=this.levelData.challenge?this.levelData.name:this.levelData.theme==='mine'?'晶矿运输线':this.levelData.theme==='hell'?'深渊前沿':'荒村十字路';
      for(const region of this.mapData?.regions||[])if(dist(this.player.x,this.player.y,region.x,region.y)<270)name=region.name;
      ctx.save();ctx.font='11px Courier New';ctx.textAlign='left';ctx.fillStyle='#bbae8f';ctx.fillText(`区域 · ${name}`,p.x+4,p.y-8);ctx.restore();
    }
  });
})();

// v0.12: composed biome scenes. Historic layouts still take the original path.
(() => {
  const themes=['mine','hell','frost','marsh'];
  const old={};for(const k of ['loadLevel','migrateSave','getLevelVisualProfile','generateThemeMapFeatures','isPointNearThemeFeature','generateMap','drawMapFeature'])old[k]=Game[k];
  const layouts={
    mine:[['head','旧矿口','mine_entrance_v120','NW'],['ore','采矿工坊','wooden_workbench','NE'],['stores','废弃仓储','wooden_shelf_rack','SW'],['shaft','岩脊岔口','stone_arch_broken','SE']],
    hell:[['gate','封印门庭','hell_ai_demon_gate','NW'],['forge','废弃熔炉','forge_v120','NE'],['chains','锁链庭院','hell_ai_obsidian_obelisk','SW'],['crag','黑曜岩脊','hell_ai_lava_rock','SE']],
    frost:[['memorial','守卫纪念碑','frost_obelisk_v100','NW'],['graves','覆雪墓列','frost_obelisk_v100','NE'],['shelter','避风营地','wind_brazier_v120','SW'],['pines','雪松林地','frost_pine_v100','SE']],
    marsh:[['arch','残拱入口','moss_arch_v100','NW'],['court','净潮庭院','tide_monument_v120','NE'],['shore','枯木岸边','marsh_tree_v100','SW'],['ruins','淹没遗址','moss_arch_v100','SE']]
  };
  const specs={
    mine_entrance_v120:[184,154,65,20,'stonework'],wooden_workbench:[100,102,27,17,'stonework'],wooden_shelf_rack:[128,110,40,16,'stonework'],stone_arch_broken:[148,132,48,16,'stonework'],
    hell_ai_demon_gate:[164,174,53,18,'stonework'],forge_v120:[142,120,46,19,'stonework'],hell_ai_obsidian_obelisk:[76,124,23,16,'stonework'],hell_ai_lava_rock:[112,96,34,19,'rocks'],hell_ai_chain_pile:[72,46,25,12,'stonework'],
    frost_obelisk_v100:[76,108,24,15,'stonework'],wind_brazier_v120:[124,102,40,17,'stonework'],frost_pine_v100:[96,154,15,11,'trees'],frost_rock_v100:[52,34,18,9,'rocks'],grave_v110:[42,56,14,9,'tombstones'],frost_grave_v120:[42,56,14,9,'tombstones'],frost_rock_v120:[52,34,18,9,'rocks'],reeds_urn_v120:[46,56,14,9,'stonework'],
    moss_arch_v100:[134,130,43,17,'stonework'],tide_monument_v120:[94,120,26,17,'stonework'],marsh_tree_v100:[118,144,23,15,'trees'],reeds_urn_v100:[46,56,14,9,'stonework'],barrels_v110:[62,54,22,14,'stonework'],torch_v110:[34,72,8,8,'stonework'],wall_v110:[92,44,35,11,'stonework']
  };
  const secondary={mine:['wooden_workbench','barrels_v110','torch_v110','stone_arch_broken'],hell:['hell_ai_chain_pile','hell_ai_lava_rock','hell_ai_obsidian_obelisk','torch_v110'],frost:['frost_grave_v120','frost_pine_v100','frost_rock_v120','frost_grave_v120'],marsh:['reeds_urn_v120','marsh_tree_v100','reeds_urn_v120','moss_arch_v100']};
  // Keep successful historic placements identical; only exhaust extra positions
  // when hazards and routes consume every original landmark candidate.
  const preferredPositions=[[0,0],[0,32],[0,-32],[0,64],[0,-64],[64,0],[-64,0],[112,64],[-112,-64],[176,0],[-176,0],[0,176],[0,-176],[176,176],[-176,-176]];
  const fallbackPositions=[];
  for(let y=-320;y<=320;y+=32)for(let x=-320;x<=320;x+=32)fallbackPositions.push([x,y]);
  fallbackPositions.sort((a,b)=>a[0]*a[0]+a[1]*a[1]-b[0]*b[0]-b[1]*b[1]);
  Object.assign(Game,{
    migrateSave(data){const version=data?.mapLayoutVersion;const result=old.migrateSave.call(this,data);if(result&&version===3)result.mapLayoutVersion=3;return result;},
    getLevelVisualProfile(theme){const p=old.getLevelVisualProfile.call(this,theme);return this.mapLayoutVersion===3&&themes.includes(theme)?{...p,interiorWallSegments:0,decorationCount:0}:p;},
    paintBiomeBoundary(){
      const c=this.groundTileCache.getContext('2d'),w=this.levelData.mapW*48,h=this.levelData.mapH*48,theme=this.levelData.theme;
      const palette={mine:['#283036','#43484b','#626763'],hell:['#292321','#433a36','#655249'],frost:['#3c535e','#5d7580','#a8bbc0'],marsh:['#24332c','#43594a','#7b8c67']}[theme],rng=makeRNG(this.runSeed^0x72696467);
      c.save();c.globalAlpha=1;c.fillStyle=palette[0];c.fillRect(0,0,w,104);c.fillRect(0,h-104,w,104);c.fillRect(0,0,104,h);c.fillRect(w-104,0,104,h);
      const borderAsset={mine:'props/rocks_small_pile',hell:'props/hell_ai_lava_rock',frost:'props/frost_rock_v120',marsh:'props/wall_v110'}[theme],image=Assets.get(borderAsset);
      const rock=(x,y)=>{
        if(image?.complete){const scale=Math.min((62+rng()*10)/image.width,54/image.height),dw=image.width*scale,dh=image.height*scale;c.imageSmoothingEnabled=false;c.drawImage(image,Math.round(x-dw/2+(rng()-.5)*12),Math.round(y+25-dh+(rng()-.5)*10),dw,dh);return;}
        const left=20+Math.floor(rng()*5),right=20+Math.floor(rng()*5),top=18+Math.floor(rng()*5),bottom=19+Math.floor(rng()*4);
        c.fillStyle=palette[1];c.beginPath();c.moveTo(x-left+6,y-top);c.lineTo(x+right-8,y-top-3);c.lineTo(x+right,y-top+7);c.lineTo(x+right-2,y+bottom-6);c.lineTo(x+right-9,y+bottom);c.lineTo(x-left+5,y+bottom-2);c.lineTo(x-left,y+bottom-11);c.lineTo(x-left+2,y-top+8);c.closePath();c.fill();
        c.fillStyle=palette[2];c.globalAlpha=.38;c.fillRect(x-left+8,y-top+2,12,3);c.fillRect(x-left+5,y-top+6,3,9);c.globalAlpha=1;c.fillStyle=palette[0];c.fillRect(x+5,y+bottom-5,12,3);};
      // Overlapping visual fragments hide regular tiling; physical border rows stay unchanged.
      for(let x=16;x<w;x+=32)for(const y of [20,52,84,h-84,h-52,h-20])rock(x,y);
      for(let y=112;y<h-96;y+=32)for(const x of [20,52,84,w-84,w-52,w-20])rock(x,y);c.restore();
    },
    getBiomeRegions(){
      const cx=this.levelData.mapW*24,cy=this.levelData.mapH*24;
      return (layouts[this.levelData.theme]||[]).map(([id,name,asset,q])=>({id,name,asset,type:'biomeRegion',x:cx+(q.endsWith('W')?-340:340),y:cy+(q.startsWith('N')?-265:265),radius:88}));
    },
    generateThemeMapFeatures(...args){
      const features=old.generateThemeMapFeatures.apply(this,args);if(this.mapLayoutVersion!==3||!themes.includes(this.levelData.theme))return features;
      const cx=this.levelData.mapW*24,cy=this.levelData.mapH*24,regions=this.getBiomeRegions();
      for(const site of [...regions,...this.levelEncounters]){
        const points=[{x:cx,y:cy},{x:cx+(site.x-cx)*.5,y:cy+(site.y-cy)*.38},{x:site.x,y:site.y}];
        features.push({type:'scenePath',regionId:site.id,width:96,points});
      }
      return features.concat(regions);
    },
    isPointNearThemeFeature(x,y,radius,features){
      if(old.isPointNearThemeFeature.call(this,x,y,radius,features))return true;
      for(const f of features||[])if(f.type==='scenePath')for(let i=1;i<f.points.length;i++){
        const a=f.points[i-1],b=f.points[i],dx=b.x-a.x,dy=b.y-a.y,t=clamp(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);
        if(dist(x,y,a.x+dx*t,a.y+dy*t)<f.width/2+radius)return true;
      }
      return false;
    },
    drawMapFeature(ctx,f){
      if(f.type!=='scenePath'&&f.type!=='biomeRegion')return old.drawMapFeature.call(this,ctx,f);
      if(f.type==='biomeRegion')return;
      this.drawBiomeTravelMarks(ctx,this.levelData.theme,f.points,this.runSeed^Math.round(f.points.at(-1).x*31+f.points.at(-1).y));
    },
    drawBiomeTravelMarks(ctx,theme,points,seed){
      const rng=makeRNG(seed);ctx.save();ctx.lineCap='round';
      for(let segment=1;segment<points.length;segment++){
        const a=points[segment-1],b=points[segment],length=dist(a.x,a.y,b.x,b.y),angle=angleTo(a.x,a.y,b.x,b.y);
        for(let d=18;d<length;d+=theme==='frost'?25:theme==='forest'?20:38){
          const t=d/length,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;
          // Leave the spawn clearing open instead of converging every route into a stamp.
          if(['mine','hell','frost','marsh'].includes(theme)&&dist(x,y,this.levelData.mapW*24,this.levelData.mapH*24)<150)continue;
          if(['mine','marsh'].includes(theme)&&rng()<.3)continue;
          ctx.save();ctx.translate(x,y);ctx.rotate(angle);
          if(theme==='mine'){
            ctx.globalAlpha=.25;ctx.strokeStyle='#80786b';ctx.lineWidth=1.5;ctx.beginPath();
            for(const y of [-9,9]){ctx.moveTo(-8,y);ctx.lineTo(6+rng()*9,y+(rng()-.5)*3);}ctx.stroke();
            ctx.fillStyle='#73624b';ctx.fillRect(-4,17+rng()*12,3+rng()*5,2);
          }else if(theme==='hell'){
            ctx.globalAlpha=.3;ctx.strokeStyle='#211d20';ctx.lineWidth=2+rng()*2;ctx.beginPath();ctx.moveTo(-16,-10+rng()*20);ctx.lineTo(0,5);ctx.lineTo(12,-5);ctx.stroke();
            ctx.fillStyle='#786052';ctx.fillRect(6,18+rng()*15,3+rng()*5,2);
          }else if(theme==='frost'){
            ctx.globalAlpha=.27;ctx.fillStyle='#53717b';ctx.rotate(.2);ctx.beginPath();ctx.ellipse(0,d%50<25?-7:7,5,2.5,0,0,TAU);ctx.fill();
          }else if(theme==='marsh'){
            ctx.globalAlpha=.3;ctx.fillStyle=rng()<.5?'#6c7056':'#74745e';ctx.translate(0,(rng()-.5)*26);ctx.rotate((rng()-.5)*.8);
            ctx.beginPath();ctx.moveTo(-10,-5);ctx.lineTo(2,-9);ctx.lineTo(12,-3);ctx.lineTo(8,6);ctx.lineTo(-7,7);ctx.closePath();ctx.fill();
          }else if(theme==='forest'){
            ctx.globalAlpha=.25;ctx.strokeStyle='#91815a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-8,-4);ctx.quadraticCurveTo(0,9,15,3);ctx.stroke();
            ctx.fillStyle='#aaa16b';for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse((rng()-.5)*28,(rng()-.5)*42,3,1.5,rng()*3,0,TAU);ctx.fill();}
          }else if(theme==='clock'){
            ctx.globalAlpha=.28;ctx.fillStyle='#b09a6b';ctx.fillRect(-12,-21,24,2);ctx.fillRect(-12,19,24,2);for(const y of [-24,24]){ctx.beginPath();ctx.arc(0,y,1.8,0,TAU);ctx.fill();}
          }else if(theme==='court'){
            ctx.globalAlpha=.24;ctx.fillStyle=rng()<.5?'#928798':'#756e83';ctx.rotate((rng()-.5)*.07);ctx.fillRect(-14,-32,27,28);ctx.fillRect(-12,3,25,27);
            ctx.strokeStyle='#292630';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-10,-18);ctx.lineTo(0,-9);ctx.lineTo(2,-3);ctx.stroke();
          }
          ctx.restore();
        }
      }
      ctx.restore();
    },
    generateMap(){
      old.generateMap.call(this);if(this.mapLayoutVersion!==3||!themes.includes(this.levelData.theme))return;
      const theme=this.levelData.theme,cx=this.levelData.mapW*24,cy=this.levelData.mapH*24,w=cx*2,h=cy*2,regions=this.getBiomeRegions(),rng=makeRNG(this.runSeed^0x76313230),props=[];
      const walls=this.collisionProps.filter(p=>p.category==='wall');
      const candidates=[[0,-112,true],[-112,-94,false],[112,-94,false],[-144,104,false],[130,114,false],[12,160,false],[-210,-20,false]];
      for(const region of regions)for(const [index,[dx,dy,landmark]] of candidates.entries()){
        const id=landmark?region.asset:secondary[theme][(index-1)%4],spec=specs[id],sx=region.x<cx?1:-1,sy=region.y<cy?1:-1,jitter=landmark?0:Math.round((rng()-.5)*12);let placed;
        for(const [ox,offset] of (landmark?preferredPositions.concat(fallbackPositions):preferredPositions)){
          const [drawW,drawH,halfW,halfH,category]=spec,x=region.x+(dx+jitter+ox)*sx,y=region.y+(dy+offset)*sy;
          const p={type:'props/'+id,x,y,category,scene:true,drawW,drawH,halfW,halfH,radius:Math.max(halfW,halfH),collisionOffsetY:-halfH,collisionX:x,collisionY:y-halfH,regionId:region.id,landmark};
          if(x<110||x>w-110||y<110||y>h-110||this.footprintOverlapsCircle(x,y,p,cx,cy,120)||this.levelEncounters.some(s=>this.footprintOverlapsCircle(x,y,p,s.x,s.y,125))||this.isPointNearThemeFeature(x,y,Math.max(halfW,halfH)+8,this.mapData.features.filter(f=>f.type!=='biomeRegion'))||props.some(q=>this.footprintOverlapsCircle(q.x,q.y,q,p.collisionX,p.collisionY,p.radius+10)))continue;
          props.push(p);placed=p;break;
        }
        if(!placed&&landmark)throw Error('No safe biome landmark: '+theme+'/'+region.id);
      }
      for(const p of props.filter(p=>['props/mine_entrance_v120','props/hell_ai_demon_gate','props/moss_arch_v100','props/stone_arch_broken'].includes(p.type))){
        p.compound=true;p.occludes=true;
        for(const side of [-1,1]){const x=p.x+side*p.halfW*.72,y=p.collisionY,halfW=p.halfW*.28,halfH=p.halfH;walls.push({type:'scene-pier',category:'wall',x,y,collisionX:x,collisionY:y,halfW,halfH,radius:Math.max(halfW,halfH)});}
      }
      this.mapData.regions=regions;this.mapData.props=props.sort((a,b)=>a.y-b.y);this.collisionProps=walls.concat(props.filter(p=>!p.compound));this.paintBiomeBoundary();
    }
  });
})();
