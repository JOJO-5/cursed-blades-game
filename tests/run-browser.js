async page => {
  const checks=[],screenshots=[],errors=[],url=page.url();
  const check=(name,ok,evidence)=>{checks.push({name,passed:!!ok,mode:'seeded accounting fixture + actual save/reload and touch',evidence});if(!ok)throw new Error(name);};
  const wait=s=>page.waitForFunction(s=>Game.state===s,s);
  const story=async()=>{for(let i=0;i<40;i++){if(await page.evaluate(()=>Game.state!=='story'))return;await page.waitForFunction(()=>Game.storyTimer>.31);await page.keyboard.press('Space');await page.waitForTimeout(70);}};
  const click=async(r,touch=false)=>{const b=await page.locator('canvas').boundingBox(),x=b.x+(r.x+r.w/2)/960*b.width,y=b.y+(r.y+r.h/2)/540*b.height;if(touch)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);await page.waitForTimeout(60);};
  const capture=async name=>{const path=`output/playwright/v090/${name}.png`;await page.screenshot({path});screenshots.push(path);};
  page.on('pageerror',e=>errors.push(String(e)));
  try {
    await page.goto(url);await wait('menu');await click(await page.evaluate(()=>Game.getMenuLayout().start));await story();await wait('playing');
    await page.evaluate(()=>{Game.levelTime=500;Game.player.kills=100;Game.chestsOpened=4;Game.loadLevel('mine');});await story();
    await page.evaluate(()=>{Game.levelTime=450;Game.player.kills=180;Game.chestsOpened=9;Game.loadLevel('hell');});await story();
    await page.evaluate(()=>{Game.levelTime=550;Game.player.kills=250;Game.chestsOpened=12;Game.spawnTimer=999;Game.enemies=[];Game.pickups=[];Game.player.invuln=999;});
    await page.keyboard.press('Escape');await wait('paused');
    const summary=await page.evaluate(()=>Game.getRunSummary());
    check('Stage transitions preserve all three durations and counters',Math.abs(summary.seconds-1500)<1&&summary.levels[2].kills===70&&summary.levels[2].chests===3,summary);
    await click(await page.evaluate(()=>Game.getPauseMenuButtons().find(r=>r.key==='save')));await wait('menu');await page.reload();await wait('menu');await click(await page.evaluate(()=>Game.getMenuLayout().continue));await wait('playing');
    await page.keyboard.press('Escape');await wait('paused');
    check('Actual save and reload preserve campaign history',await page.evaluate(s=>Math.abs(Game.getRunSummary().seconds-s.seconds)<1&&Game.runHistory.length===2&&Game.runHistoryComplete,summary));
    await page.evaluate(()=>{Game.updateMeta();Game.state='victory';});
    const ending=await page.evaluate(()=>({text:Game.getEndingText(),time:Game.formatRunTime(),best:Game.meta.bestSurvivalTime}));
    check('Victory names the final dragon and records total campaign time',ending.text.includes('地狱炎龙')&&ending.time.includes('25分')&&ending.best>=1500,ending);
    await capture('campaign-summary-desktop');
    for(const [width,height] of [[390,844],[844,390],[320,568]]) {
      await page.setViewportSize({width,height});await page.waitForTimeout(80);
      for(const victory of [true,false]) {
        const bounds=await page.evaluate(victory=>{
          const c=Game.ctx,old=c.fillText,visible=Game.getVisibleCanvasRect(),violations=[];
          c.fillText=function(text,x,y,...args){const w=this.measureText(text).width,left=this.textAlign==='center'?x-w/2:this.textAlign==='right'?x-w:x;if(left<visible.x-1||left+w>visible.x+visible.w+1)violations.push({text,left,w,visible});return old.call(this,text,x,y,...args);};
          try{Game.renderEnding(victory);}finally{c.fillText=old;}return violations;
        },victory);
        check(`${victory?'Victory':'Death'} text fits ${width}x${height}`,bounds.length===0,bounds);
      }
      await capture(`campaign-summary-${width}x${height}`);
    }
    await page.setViewportSize({width:1280,height:720});
    await page.evaluate(()=>{const d=JSON.parse(localStorage.getItem(Game.saveKey));delete d.runHistory;delete d.runHistoryComplete;delete d.runStartKills;delete d.runStartChests;d.schemaVersion=7;localStorage.setItem(Game.saveKey,JSON.stringify(d));});
    await page.reload();await wait('menu');await click(await page.evaluate(()=>Game.getMenuLayout().continue));await wait('playing');
    check('Old mid-campaign saves disclose missing prior stage time',await page.evaluate(()=>!Game.runHistoryComplete&&Game.formatRunTime().startsWith('已记录用时')));
    const context=await page.context().browser().newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),desktop=page;
    page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));await page.goto(url);await wait('menu');await page.evaluate(()=>{Game.startNewGame();Game.state='victory';});
    await click(await page.evaluate(()=>Game.getEndingLayout().menu),true);await wait('menu');
    check('Mobile victory returns through its drawn button',true);
    await page.evaluate(()=>{Game.startNewGame();Game.state='gameover';});await click(await page.evaluate(()=>Game.getEndingLayout().restart),true);await story();await wait('playing');
    check('Mobile death restart clears previous campaign history',await page.evaluate(()=>Game.runHistory.length===0&&Game.levelData.theme==='village'&&Game.runHistoryComplete));
    await context.close();page=desktop;
    check('Campaign summary flows have no JavaScript errors',errors.length===0,errors);
    return {passed:true,checks,screenshots,errors};
  }catch(error){await capture('summary-failure').catch(()=>{});return {passed:false,checks,screenshots,errors,failure:String(error.stack||error)};}
}
