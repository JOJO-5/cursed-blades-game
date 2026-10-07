async page => {
  const checks=[],errors=[],screenshots=[],url=page.url();
  page.on('pageerror',e=>errors.push(String(e)));
  const check=(name,ok)=>{checks.push({name,passed:!!ok,mode:'accelerated-progression / real-input'});if(!ok)throw Error(name);};
  const wait=s=>page.waitForFunction(s=>Game.state===s,s,{timeout:65000});
  const click=async r=>{const p=await page.evaluate(r=>{const b=Game.canvas.getBoundingClientRect();return{x:b.x+(r.x+r.w/2)/960*b.width,y:b.y+(r.y+r.h/2)/540*b.height};},r);await page.mouse.click(p.x,p.y);await page.waitForTimeout(100);};
  const settle=async()=>{for(let i=0;i<50;i++){const s=await page.evaluate(()=>Game.state);if(s!=='story')return;await page.waitForTimeout(330);await page.keyboard.press('Space');}throw Error('Story did not finish');};
  const complete=async()=>{await page.evaluate(()=>{Game.bossDefeated=true;Game.bossDefeatedGraceTimer=0;Game.enemies=[];Game.startVictorySequence();});await page.waitForTimeout(1150);await settle();};
  try{
    await wait('menu');
    for(const middle of ['mine','frost'])for(const end of ['hell','marsh']){
      await page.evaluate(()=>{Game.state='menu';Game.selectedExpedition='campaign';});
      await click(await page.evaluate(()=>Game.getMenuLayout().start));await page.waitForTimeout(150);await settle();await wait('playing');
      await complete();await wait('routeChoice');
      if(middle==='mine'&&end==='hell'){const file='output/playwright/v120/campaign-routes-desktop.png';await page.screenshot({path:file});screenshots.push(file);}
      check(`${middle}/${end}: no stage timer advances while choosing`,await page.evaluate(async()=>{const t=Game.levelTime;await new Promise(r=>setTimeout(r,150));return Game.levelTime===t;}));
      await click(await page.evaluate(()=>Game.getCampaignRouteLayout().menu));await wait('menu');await page.reload();await wait('menu');
      await click(await page.evaluate(()=>Game.getMenuLayout().continue));await wait('routeChoice');
      check(`${middle}/${end}: pending choice restores after refresh`,await page.evaluate(()=>Game.campaignMode&&Game.levelData.theme==='village'));
      await click(await page.evaluate(id=>Game.getCampaignRouteLayout().cards.find(r=>r.id===id),middle));await settle();await wait('playing');
      check(`${middle}/${end}: stage two loads and retains history`,await page.evaluate(id=>Game.levelData.theme===id&&Game.getRunSummary().levels.length===2,middle));
      await complete();await wait('routeChoice');await page.keyboard.press(end==='hell'?'Digit1':'Digit2');await page.waitForTimeout(100);await settle();await wait('playing');
      check(`${middle}/${end}: stage three keyboard choice`,await page.evaluate(id=>Game.levelData.theme===id&&Game.campaignRoute.length===3,end));
      await complete();await wait('victory');
      check(`${middle}/${end}: three completed stages counted`,await page.evaluate(()=>Game.getRunSummary().levels.length===3&&Game.getRunSummary().levels.every(r=>r.completed)));
      await page.reload();await wait('menu');await click(await page.evaluate(()=>Game.getMenuLayout().continue));await wait('victory');
      check(`${middle}/${end}: final result restores`,await page.evaluate(()=>Game.campaignFinished));
    }
    await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{Game.state='menu';Game.selectedExpedition='campaign';});
    await click(await page.evaluate(()=>Game.getMenuLayout().start));await page.waitForTimeout(150);await settle();await complete();await wait('routeChoice');
    check('Portrait cards and exit stay inside visible canvas',await page.evaluate(()=>{const l=Game.getCampaignRouteLayout(),v=l.visible;return [...l.cards,l.menu].every(r=>r.x>=v.x&&r.x+r.w<=v.x+v.w&&r.y>=v.y&&r.y+r.h<=v.y+v.h);}));
    const file='output/playwright/v120/campaign-routes-portrait.png';await page.screenshot({path:file});screenshots.push(file);
    await click(await page.evaluate(()=>Game.getCampaignRouteLayout().cards[1]));await settle();await wait('playing');
    check('Portrait route card loads frost',await page.evaluate(()=>Game.levelData.theme==='frost'));
    const context=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    try{
      const mobile=await context.newPage();mobile.on('pageerror',e=>errors.push(String(e)));await mobile.goto(url);await mobile.waitForFunction(()=>typeof Game!=='undefined'&&Game.state==='menu',null,{timeout:65000});
      await mobile.evaluate(()=>{Game.startNewGame();Game.bossDefeated=true;Game.finishCampaignStage();});
      const r=await mobile.evaluate(()=>{const r=Game.getCampaignRouteLayout().cards[1],b=Game.canvas.getBoundingClientRect();return{x:b.x+(r.x+r.w/2)/960*b.width,y:b.y+(r.y+r.h/2)/540*b.height};});
      await mobile.touchscreen.tap(r.x,r.y);await mobile.waitForFunction(()=>Game.levelData.theme==='frost');
      check('Emulated native touch selects campaign route',await mobile.evaluate(()=>Game.campaignRoute.join('/')==='village/frost'));
    }finally{await context.close();}
    check('No runtime errors',errors.length===0);
    return {passed:true,checks,errors,screenshots};
  }catch(e){return {passed:false,failure:String(e.stack||e),checks,errors,screenshots};}
  finally{await page.setViewportSize({width:1280,height:720});await page.evaluate(()=>Game.state='menu');}
}
