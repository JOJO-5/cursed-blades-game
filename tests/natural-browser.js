async page => {
  const results=[],checks=[],baseURL=page.url();
  // Real-time first-minute runs. Only the random seed is fixed. Never alter
  // timers, health, enemy stats, drops, damage or encounter progress.
  for(const [character,seed] of [['warden',77],['ranger',123],['arcanist',909]]) {
    const context=await page.context().browser().newContext({viewport:{width:1280,height:720}});
    const p=await context.newPage();const errors=[];p.on('pageerror',e=>errors.push(String(e)));
    await p.addInitScript(seed=>{
      let s=seed>>>0;Math.random=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};
    },seed);
    try {
      await p.goto(baseURL);await p.waitForFunction(()=>Game.state==='menu',null,{timeout:65000});
      const hero=await p.evaluate(id=>Game.getMenuLayout().characters.find(r=>r.id===id),character),bounds=await p.locator('canvas').boundingBox();
      await p.mouse.click(bounds.x+(hero.x+hero.w/2)/960*bounds.width,bounds.y+(hero.y+hero.h/2)/540*bounds.height);await p.waitForTimeout(80);
      const rect=await p.evaluate(()=>Game.getMenuLayout().start),b=await p.locator('canvas').boundingBox();
      await p.mouse.click(b.x+(rect.x+rect.w/2)/960*b.width,b.y+(rect.y+rect.h/2)/540*b.height);
      await p.waitForFunction(()=>!['menu','loading'].includes(Game.state));
      for(let i=0;i<16;i++) {
        if(await p.evaluate(()=>Game.state!=='story'))break;
        await p.waitForFunction(()=>Game.storyTimer>.31);await p.keyboard.press('Space');await p.waitForTimeout(70);
      }
      const started=Date.now();let held=null;
      while(Date.now()-started<100000) {
        const state=await p.evaluate(()=>{
          const site=Game.levelEncounters.find(s=>s.id==='camp');
          const target=site.status==='complete' && Game.pickups.some(p=>p.objectiveId==='camp') ? site :
            {x:site.x+Math.cos(Game.levelTime*.8)*75,y:site.y+Math.sin(Game.levelTime*.8)*75};
          const rank=c=>({damage:100,weaponcount:95,attackspeed:90,rotatespeed:85,regen:80,armor:75,maxhp:70}[c.id]|| (c.weaponId?60:10));
          const choices=Game.state==='levelup'?Game.upgradeChoices:Game.chestRewardChoices;
          let choice=0;for(let i=1;i<choices.length;i++)if(rank(choices[i])>rank(choices[choice]))choice=i;
          return {state:Game.state,time:Game.levelTime,hp:Game.player.hp,alive:Game.player.alive,
            x:Game.player.x,y:Game.player.y,target,choice,dash:Game.player.dashCooldown,
            danger:Game.enemies.some(e=>e.alive&&dist(e.x,e.y,Game.player.x,Game.player.y)<45),
            camp:site.status,runSeed:Game.runSeed,level:Game.player.level,kills:Game.player.kills};
        });
        if(!state.alive||state.state==='gameover')throw new Error(`Seed ${seed} died at ${state.time.toFixed(1)}s`);
        if(state.state==='levelup'||state.state==='chestReward') {
          if(held) {await p.keyboard.up(held);held=null;}
          await p.keyboard.press(`Digit${state.choice+1}`);await p.waitForTimeout(80);continue;
        }
        if(state.state==='story') {await p.keyboard.press('Space');await p.waitForTimeout(350);continue;}
        if(state.time>=60) {
          if(held)await p.keyboard.up(held);
          await p.screenshot({path:`output/playwright/v110/natural-seed-${seed}.png`});
          if(state.camp!=='complete')throw new Error(`Seed ${seed}: camp incomplete after first minute`);
          if(errors.length)throw new Error(errors.join('\n'));
          results.push({character,seed,runSeed:state.runSeed,seconds:state.time,hp:state.hp,level:state.level,kills:state.kills,camp:state.camp});
          checks.push({name:`Natural first minute and camp clear: ${character}, seed ${seed}`,passed:true,mode:'real-time seeded random + keyboard'});
          break;
        }
        const dx=state.target.x-state.x,dy=state.target.y-state.y;
        const key=Math.hypot(dx,dy)<8?null:Math.abs(dx)>Math.abs(dy)?(dx>0?'KeyD':'KeyA'):(dy>0?'KeyS':'KeyW');
        if(key!==held) {if(held)await p.keyboard.up(held);if(key)await p.keyboard.down(key);held=key;}
        if(state.danger&&state.dash<=0)await p.keyboard.press('Space');
        await p.waitForTimeout(100);
      }
      if(results.length!==checks.length||!results.some(r=>r.seed===seed))throw new Error(`Seed ${seed}: first minute timed out`);
    } catch(error) {
      await p.screenshot({path:`output/playwright/v110/natural-seed-${seed}-failure.png`}).catch(()=>{});
      return {passed:false,checks,results,failure:String(error)};
    } finally {await context.close();}
  }
  return {passed:true,checks,results,limits:['Three real-time opening minutes with automated keyboard play; not three full natural level clears or human/physical-device acceptance.']};
}
