async page => {
  // Full natural campaign: only random seed and keyboard decisions are controlled.
  // No health, stats, enemies, timers, rewards or transition callbacks are changed.
  const results=[],screenshots=[],errors=[],checks=[],url=page.url();
  const selected=new URL(url).searchParams.get('naturalProfile');
  const route=(new URL(url).searchParams.get('route')||'mine-hell').split('-');
  const villageOnly=new URL(url).searchParams.get('stopAfter')==='village';
  const profiles=[{id:'orbit',hero:'warden',seed:77},{id:'projectile',hero:'ranger',seed:123},{id:'summon',hero:'arcanist',seed:909}].filter(p=>!selected||p.id===selected);
  await Promise.all(profiles.map(async profile => {
    const context=await page.context().browser().newContext({viewport:{width:1280,height:720}});
    const p=await context.newPage();p.on('pageerror',e=>errors.push(e.stack||String(e)));
    await p.addInitScript(seed=>{let s=seed>>>0;Math.random=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};},profile.seed);
    const samples=[],choices=[],started=Date.now();let held=[],lastSample='',outcome,lastSeen,checkpoint=false;
    const release=async()=>{for(const k of held)await p.keyboard.up(k);held=[];};
    try {
      await p.goto(url);await p.waitForFunction(()=>Game.state==='menu',null,{timeout:65000});
      const setup=new URL(url).searchParams;setup.set('character',profile.hero);
      for(const [param,list] of [['character','characters'],['expedition','expeditions']])if(setup.get(param)){
        const rect=await p.evaluate(({list,id})=>Game.getMenuLayout()[list].find(r=>r.id===id),{list,id:setup.get(param)});
        const bounds=await p.locator('canvas').boundingBox();await p.mouse.click(bounds.x+(rect.x+rect.w/2)/960*bounds.width,bounds.y+(rect.y+rect.h/2)/540*bounds.height);await p.waitForTimeout(80);
      }
      const r=await p.evaluate(()=>Game.getMenuLayout().start),b=await p.locator('canvas').boundingBox();
      await p.mouse.click(b.x+(r.x+r.w/2)/960*b.width,b.y+(r.y+r.h/2)/540*b.height);
      await p.evaluate(()=>{Game._naturalTiming={update:[],render:[],separation:[],frame:[]};const record=(key,value)=>{const a=Game._naturalTiming[key];if(a.length<4000)a.push(value);else a[(Game._naturalTiming[key+'Index']=(Game._naturalTiming[key+'Index']||0)+1)%4000]=value;};for(const [method,key] of [['updatePlaying','update'],['render','render'],['separateEnemies','separation']]){const original=Game[method];Game[method]=function(...args){const t=performance.now();try{return original.apply(this,args);}finally{if(this.state==='playing'){record(key,performance.now()-t);if(key==='render'){if(this._naturalFrameTime)record('frame',this._lastTime-this._naturalFrameTime);this._naturalFrameTime=this._lastTime;}}else if(key==='render')this._naturalFrameTime=0;}};}});
      while(Date.now()-started<40*60*1000) {
        const s=await p.evaluate(profile=>{
          const g=Game,a=g.player,theme=g.levelData?.theme;
          if(!a)return {state:g.state};
          const owned=new Set(a.weapons.map(w=>w.id));
          const rank=c=>{
            if(c.type==='evolution')return 200;
            if(c.weaponId){const type=CONFIG.WEAPONS[c.weaponId].type,wanted=profile.id==='orbit'?type==='orbit':profile.id==='projectile'?['ranged','projectile','homing'].includes(type):type==='summon';return (wanted?175:55)+(owned.has(c.weaponId)?15:0);}
            return ({regen:145,armor:135,damage:130,weaponcount:125,attackspeed:120,rotatespeed:profile.id==='orbit'?115:70,orbit_mastery:profile.id==='orbit'?120:60,projectile_barrage:profile.id==='projectile'?125:60,summoner_pact:profile.id==='summon'?150:50,maxhp:a.hp<a.getMaxHp()*.6?140:90,pickuprange:90,xpbonus:100}[c.id]||70);
          };
          const list=g.state==='levelup'?g.upgradeChoices:g.chestRewardChoices;
          let choice=0;for(let i=1;i<list.length;i++)if(rank(list[i])>rank(list[choice]))choice=i;
          const replaceIndex=a.weapons.reduce((best,w,i)=>w.level<a.weapons[best].level?i:best,0);
          const row=g._weaponReplacement?g.getBuildPanelLayout().rows[replaceIndex]:null;
          const boss=g.enemies.find(e=>e.alive&&e.isBoss);
          let target={x:g.levelData.mapW*24+Math.cos(g.levelTime*.12)*150,y:g.levelData.mapH*24+Math.sin(g.levelTime*.12)*150};
          const objective=g.levelEncounters.find(e=>!['complete','expired'].includes(e.status));
          const treasure=g.pickups.filter(e=>e.alive&&e.type==='chest'&&e.value!==2).sort((x,y)=>dist(a.x,a.y,x.x,x.y)-dist(a.x,a.y,y.x,y.y))[0];
          const pickupScore=e=>dist(a.x,a.y,e.x,e.y)-(e.type==='heart'&&a.hp<a.getMaxHp()*.7?200:e.type==='magnet'?100:0);
          const xp=g.pickups.filter(e=>e.alive&&['xp','heart','magnet'].includes(e.type)).sort((x,y)=>pickupScore(x)-pickupScore(y))[0];
          if(objective&&objective.status!=='waiting'){const guard=g.enemies.find(e=>e.alive&&e.encounterId===objective.id);const offset=objective.id==='rift'?103:guard?70:0;target={x:objective.x+Math.cos(g.levelTime*.7)*offset,y:objective.y+Math.sin(g.levelTime*.7)*offset};}
          else if(treasure)target=treasure;
          else if(xp)target=xp;
          if(boss){const hasReach=a.weapons.some(w=>['ranged','projectile','homing','summon'].includes(w.def.type)),radius=hasReach?200:Math.min(125,Math.max(60,Math.max(...a.weapons.map(w=>w.getRange()))*.9+boss.radius)),angle=angleTo(boss.x,boss.y,a.x,a.y)+.18;target={x:boss.x+Math.cos(angle)*radius,y:boss.y+Math.sin(angle)*radius};}
          if(xp?.type==='heart'&&a.hp<a.getMaxHp()*.5)target=xp;
          const options=[[0,0],[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
          let best=options[0],bestScore=-Infinity;
          for(const v of options){const len=Math.hypot(...v)||1,dx=v[0]/len*32,dy=v[1]/len*32,x=a.x+dx,y=a.y+dy;
            if(g.isCircleBlocked(x,y,a.radius)||g.isCircleBlocked(a.x+dx/2,a.y+dy/2,a.radius))continue;
            let score=-dist(x,y,target.x,target.y);
            for(const e of g.enemies)if(e.alive){const d=dist(x,y,e.x,e.y)-e.radius-a.radius;if(d<45)score-=(45-d)*3;}
            for(const e of g.enemyProjectiles)if(e.alive){const d=dist(x,y,e.x+e.vx*.15,e.y+e.vy*.15);if(d<60)score-=(60-d)*4;}
            if(g.mapData.features.some(f=>!f.sealed&&['demonRift','lavaFissure','crystalVein'].includes(f.type)&&g.isPointNearThemeFeature(x,y,a.radius,[f])))score-=800;
            if(g.getTrialWeather?.().marsh&&g.getTrialWeather().active&&g.trialZones.some(z=>g.isPointInTrialZone(x,y,z)))score-=800;
            if(boss)for(const effect of boss.signatureEffects||[])if(BossCombat.hit(effect,{x,y,radius:a.radius}))score-=1000;
            if(score>bestScore){bestScore=score;best=v;}
          }
          return {state:g.state,theme,time:g.levelTime,hp:a.hp,maxHp:a.getMaxHp(),level:a.level,kills:a.kills,bosses:g.bossKills,chests:g.chestsOpened,
            skill:a.activeSkill?.cooldown<=0,alive:a.alive,choice,choiceId:list[choice]?.id||list[choice]?.weaponId||list[choice]?.resultWeapon,offered:list.map(c=>c.id||c.weaponId||c.resultWeapon),row,
            keys:[...(best[0]?[best[0]>0?'KeyD':'KeyA']:[]),...(best[1]?[best[1]>0?'KeyS':'KeyW']:[])],
            dash:a.dashCooldown<=0&&g.enemies.some(e=>e.alive&&dist(e.x,e.y,a.x,a.y)<e.radius+a.radius+25),
            action:g.getCurrentObjective()?.action,storyReady:g.storyTimer>.31,
            weapons:a.weapons.map(w=>({id:w.id,level:w.level})),encounters:g.levelEncounters.map(e=>({id:e.id,status:e.status,progress:e.progress||0})),summary:g.getRunSummary?.(),
            timing:Object.fromEntries(Object.entries(g._naturalTiming||{}).filter(([,v])=>Array.isArray(v)).map(([k,v])=>{const a=[...v].sort((a,b)=>a-b);return [k,{samples:a.length,mean:a.reduce((s,x)=>s+x,0)/(a.length||1),p95:a[Math.floor(a.length*.95)]||0,max:a.at(-1)||0}];}))};
        },profile);
        lastSeen=s;
        if(errors.length){outcome=s;throw new Error('Game runtime error: '+errors.at(-1));}
        if(s.state==='victory'||s.state==='gameover'||s.alive===false){outcome=s;break;}
        if(villageOnly&&s.summary?.levels.some(r=>r.theme==='village'&&r.completed)&&s.theme==='mine'){outcome={...s,villageCompleted:true};break;}
        if(s.state==='story'){await release();if(s.storyReady)await p.keyboard.press('Space');await p.waitForTimeout(80);continue;}
        if(s.state==='eventChoice'){await release();await p.keyboard.press('Digit2');await p.waitForTimeout(80);continue;}
        if(s.state==='routeChoice'){await release();const index=await p.evaluate(route=>Game.getCampaignRouteOptions().indexOf(route[Game.campaignRoute.length-1]),route);await p.keyboard.press('Digit'+(Math.max(0,index)+1));await p.waitForTimeout(80);continue;}
        if(['levelup','chestReward'].includes(s.state)) {
          await release();choices.push({theme:s.theme,time:s.time,id:s.choiceId,offered:s.offered});
          if(s.row){const b=await p.locator('canvas').boundingBox(),r=s.row;await p.mouse.click(b.x+(r.x+r.w/2)/960*b.width,b.y+(r.y+r.h/2)/540*b.height);}
          else await p.keyboard.press(`Digit${s.choice+1}`);
          await p.waitForTimeout(80);continue;
        }
        if(s.state!=='playing'){await release();await p.waitForTimeout(100);continue;}
        if(!checkpoint&&s.time>=90){await release();await p.keyboard.press('Escape');await p.waitForFunction(()=>Game.state==='paused');const rect=await p.evaluate(()=>Game.getPauseMenuButtons().find(r=>r.key==='save')),box=await p.locator('canvas').boundingBox();await p.mouse.click(box.x+(rect.x+rect.w/2)/960*box.width,box.y+(rect.y+rect.h/2)/540*box.height);await p.waitForFunction(()=>Game.state==='menu');await p.reload();await p.waitForFunction(()=>Game.state==='menu');const r=await p.evaluate(()=>Game.getMenuLayout().continue),b=await p.locator('canvas').boundingBox();await p.mouse.click(b.x+(r.x+r.w/2)/960*b.width,b.y+(r.y+r.h/2)/540*b.height);await p.waitForFunction(()=>Game.state==='playing');checkpoint=true;}
        const sampleKey=s.theme+'-'+Math.floor(s.time/60);
        if(sampleKey!==lastSample){samples.push(s);lastSample=sampleKey;const path=`output/playwright/v120/natural-${route.join("-")}-${profile.id}-${sampleKey}-hp${Math.round(s.hp)}-lv${s.level}.png`;await p.screenshot({path});screenshots.push(path);}
        for(const k of held)if(!s.keys.includes(k))await p.keyboard.up(k);
        for(const k of s.keys)if(!held.includes(k))await p.keyboard.down(k);held=s.keys;
        if(s.skill)await p.keyboard.press('KeyQ');
        if(s.action)await p.keyboard.press('KeyE');if(s.dash)await p.keyboard.press('Space');
        await p.waitForTimeout(100);
      }
      await release();
      if(!outcome){outcome=lastSeen;const path=`output/playwright/v120/natural-${route.join("-")}-${profile.id}-timeout.png`;await p.screenshot({path});screenshots.push(path);}
      results.push({profile,plannedRoute:route,checkpoint,...outcome,samples,choices,wallSeconds:(Date.now()-started)/1000});
      const passed=['victory','gameover'].includes(outcome?.state);
      checks.push({name:`Natural terminal outcome with checkpoint recorded: ${profile.hero}/${route.join('-')}`,passed,mode:'real-time seeded random + keyboard, unchanged stats/timers'});
      // Continue all matrix rows even if the bot reaches the time limit.

    }catch(error){const path=`output/playwright/v120/natural-${route.join("-")}-${profile.id}-failure.png`;await p.screenshot({path}).catch(()=>{});screenshots.push(path);results.push({profile,...lastSeen,samples,choices,wallSeconds:(Date.now()-started)/1000});checks.push({name:`Natural full campaign: ${profile.id}`,passed:false});return {passed:false,checks,results,screenshots,errors,failure:String(error.stack||error)};}
    finally{await release().catch(()=>{});await context.close();}
  }));
  return {passed:errors.length===0&&checks.every(c=>c.passed),checks,results,screenshots,errors,limits:['A death before branching records a natural death, not coverage of the planned later maps. Automated decisions do not establish human balance or physical-device acceptance. Build profiles are upgrade preferences, not injected starting weapons.']};
}
