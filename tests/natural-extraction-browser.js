async page=>{
 const url=page.url(),context=await page.context().browser().newContext({viewport:{width:1280,height:720}}),p=await context.newPage(),errors=[],samples=[],screenshots=[],choices=[];let held=[],lastMinute=-1,outcome;const started=Date.now();
 p.on('pageerror',e=>errors.push(String(e)));await p.addInitScript(()=>{let seed=25077;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};});
 const release=async()=>{for(const k of held)await p.keyboard.up(k);held=[];};
 const click=async r=>{const b=await p.locator('canvas').boundingBox();await p.mouse.click(b.x+(r.x+r.w/2)/960*b.width,b.y+(r.y+r.h/2)/540*b.height);};
 try{
  await p.goto(url);await p.waitForFunction(()=>Game.state==='menu',null,{timeout:65000});await click(await p.evaluate(()=>Game.getMenuLayout().characters.find(r=>r.id==='warden')));
  // Navigate through visible menu controls; combat state, stats and timers stay unchanged.
  await click(await p.evaluate(()=>Game.getMenuLayout().challenge));await p.waitForFunction(()=>Game._challengeMenu);await click(await p.evaluate(()=>Game.getChallengeLayout().trials));await p.waitForFunction(()=>Game._trialMenu);await click(await p.evaluate(()=>Game.getTrialHubLayout().tabs.find(r=>r.id==='trials')));await p.waitForFunction(()=>Game._trialTab==='trials');await click(await p.evaluate(()=>Game.getTrialHubLayout().next));await p.waitForFunction(()=>Game._trialPage===1);await click(await p.evaluate(()=>Game.getTrialHubLayout().cards[0]));
  while(Date.now()-started<16*60*1000){
   const s=await p.evaluate(()=>{
    const g=Game,a=g.player,m=g.extraction;if(!a||!m)return {state:g.state};const list=g.state==='levelup'?g.upgradeChoices:g.chestRewardChoices;
    const rank=c=>c.type==='evolution'?250:c.weaponId?150+(a.weapons.some(w=>w.id===c.weaponId)?15:0):({regen:190,armor:180,damage:175,projectile_barrage:170,attackspeed:165,maxhp:a.hp<a.getMaxHp()*.7?185:130,xpbonus:120,pickuprange:100}[c.id]||80);let choice=0;for(let i=1;i<list.length;i++)if(rank(list[i])>rank(list[choice]))choice=i;
    const site=m.sites.filter(s=>['ready','guarded'].includes(s.status)).sort((x,y)=>(x.status==='guarded')-(y.status==='guarded')||dist(a.x,a.y,x.x,x.y)-dist(a.x,a.y,y.x,y.y))[0];let target={x:m.exit.x+Math.cos(g.levelTime*.12)*160,y:m.exit.y+Math.sin(g.levelTime*.12)*160};
    const xp=g.pickups.filter(e=>e.alive&&['xp','heart','magnet','chest'].includes(e.type)&&e.value!==2).sort((x,y)=>dist(a.x,a.y,x.x,x.y)-dist(a.x,a.y,y.x,y.y))[0];if(xp)target=xp;
    if(site)target=site.status==='ready'?site:{x:site.x+Math.cos(g.levelTime*.35)*145,y:site.y+Math.sin(g.levelTime*.35)*145};if(m.elapsed>=480&&m.shards>0)target=m.exit;
    const heart=g.pickups.find(e=>e.alive&&e.type==='heart'&&dist(a.x,a.y,e.x,e.y)<180);if(heart&&a.hp<a.getMaxHp()*.45)target=heart;
    // Choose unobstructed movement while reading hazards; do not change game objects.
    const options=[[0,0],[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];let best=options[0],score=-Infinity;
    for(const v of options){const len=Math.hypot(...v)||1,dx=v[0]/len*30,dy=v[1]/len*30,x=a.x+dx,y=a.y+dy;if(g.isCircleBlocked(x,y,a.radius)||g.isCircleBlocked(a.x+dx/2,a.y+dy/2,a.radius))continue;let n=-dist(x,y,target.x,target.y);
     for(const e of g.enemies)if(e.alive){const d=dist(x,y,e.x,e.y)-e.radius-a.radius;if(d<55)n-=(55-d)*3;}for(const e of g.enemyProjectiles)if(e.alive){const d=dist(x,y,e.x+e.vx*.15,e.y+e.vy*.15);if(d<50)n-=(50-d)*4;}
     if(g.getTrialWeather?.().marsh&&g.getTrialWeather().active&&g.trialZones.some(z=>g.isPointInTrialZone(x,y,z)))n-=600;if(n>score){score=n;best=v;}}
    const replacement=g._weaponReplacement?g.getBuildPanelLayout().rows[a.weapons.reduce((best,w,i)=>w.level<a.weapons[best].level?i:best,0)]:null;
    return {state:g.state,seconds:m.elapsed,hp:a.hp,maxHp:a.getMaxHp(),level:a.level,kills:a.kills,shards:m.shards,sites:m.sites.map(s=>({id:s.id,status:s.status})),x:a.x,y:a.y,alive:a.alive,choice,choiceId:list[choice]?.id||list[choice]?.weaponId,row:replacement,storyReady:g.storyTimer>.31,keys:[...(best[0]?[best[0]>0?'KeyD':'KeyA']:[]),...(best[1]?[best[1]>0?'KeyS':'KeyW']:[])],action:g.getCurrentObjective()?.action,dash:a.dashCooldown<=0&&g.enemies.some(e=>e.alive&&dist(e.x,e.y,a.x,a.y)<e.radius+a.radius+25),skill:g.enemies.some(e=>e.alive&&dist(e.x,e.y,a.x,a.y)<220),weapons:a.weapons.map(w=>({id:w.id,level:w.level})),channeling:m.channeling,recorded:m.recorded,success:m.success};
   });outcome=s;if(errors.length)throw Error(errors.at(-1));if(['victory','gameover'].includes(s.state)||s.alive===false)break;
   if(s.state==='story'){await release();if(s.storyReady)await p.keyboard.press('Enter');await p.waitForTimeout(100);continue;}
   if(['levelup','chestReward'].includes(s.state)){await release();choices.push({seconds:s.seconds,id:s.choiceId});if(s.row)await click(s.row);else await p.keyboard.press('Digit'+(s.choice+1));await p.waitForTimeout(80);continue;}
   if(s.state==='extractionChoice'){await release();await p.keyboard.press('Digit1');await p.waitForTimeout(100);continue;}
   if(s.state!=='playing'){await release();await p.waitForTimeout(100);continue;}
   const minute=Math.floor(s.seconds/60);if(minute!==lastMinute){lastMinute=minute;samples.push(s);const path=`output/playwright/v120/v250-natural-extract-${minute}.png`;await p.screenshot({path});screenshots.push(path);}
   const keys=s.channeling?[]:s.keys;for(const k of held)if(!keys.includes(k))await p.keyboard.up(k);for(const k of keys)if(!held.includes(k))await p.keyboard.down(k);held=keys;if(s.action&&!s.channeling)await p.keyboard.press('KeyE');if(s.dash&&!s.channeling)await p.keyboard.press('Space');if(s.skill)await p.keyboard.press('KeyQ');await p.waitForTimeout(100);
  }
  await release();const passed=outcome?.state==='victory'&&outcome.success&&outcome.seconds>=480&&outcome.seconds<720;return {passed,checks:[{name:'Natural extraction and actual exit in 8–12 gameplay minutes',passed,mode:'seeded random, real-time keyboard only; unchanged health, timers, enemies and rewards'}],outcome,samples,choices,screenshots,errors,wallSeconds:(Date.now()-started)/1000};
 }catch(e){return {passed:false,failure:String(e),outcome,samples,choices,screenshots,errors};}finally{await release().catch(()=>{});await context.close();}
}
