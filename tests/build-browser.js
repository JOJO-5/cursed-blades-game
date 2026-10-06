async page => {
  const checks=[],screenshots=[],errors=[],url=page.url();
  const check=(name,value)=>{checks.push({name,passed:!!value,mode:'seeded-state + browser-input'});if(!value)throw new Error(name);};
  const wait=s=>page.waitForFunction(s=>typeof Game!=='undefined'&&Game.state===s,s);
  const click=async(rect,touch=false)=>{
    const p=await page.evaluate(r=>{const b=Game.canvas.getBoundingClientRect(),x=r.x+r.w/2,y=r.y+r.h/2;return Game._rotate90?{x:b.left+(1-y/540)*b.width,y:b.top+x/960*b.height}:{x:b.left+x/960*b.width,y:b.top+y/540*b.height};},rect);
    if(touch)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);
    await page.waitForTimeout(50); // Canvas consumes one queued pointer event per animation frame.
  };
  const capture=async name=>{const path=`output/playwright/v090/${name}.png`;await page.screenshot({path});screenshots.push(path);};
  page.on('pageerror',e=>errors.push(String(e)));
  try {
    await page.setViewportSize({width:1280,height:720});await page.goto(url);await wait('menu');
    await page.evaluate(()=>{Game.startNewGame();Game.state='paused';Game.spawnTimer=999;Game.player.invuln=999;});
    await click(await page.evaluate(()=>Game.getPauseMenuButtons().find(r=>r.key==='build')));
    await page.waitForFunction(()=>Game._buildOpen);
    const timer=await page.evaluate(()=>Game.levelTime);await page.waitForTimeout(200);
    check('Build panel opens from pause and freezes combat',await page.evaluate(t=>Game.levelTime===t,timer));
    await capture('build-weapons');
    await click(await page.evaluate(()=>Game.getBuildPanelLayout().rows[0]));await page.waitForFunction(()=>!!Game._buildDetail);
    check('Weapon detail exposes current level and damage',await page.evaluate(()=>Game._buildDetail.weapon.level===1&&Game._buildDetail.subtitle.includes('16')));
    await click(await page.evaluate(()=>Game.getBuildPanelLayout().back));
    await click(await page.evaluate(()=>Game.getBuildPanelLayout().tabs[2]));await page.waitForFunction(()=>Game._buildTab==='evolutions');
    check('Evolution tab reveals unmet relic progress',await page.evaluate(()=>Game.getBuildEntries()[0].subtitle.includes('0/3')));
    await page.evaluate(()=>Game.player.upgradeLevels.attackspeed=3);
    check('Evolution tab reveals chest requirement when ready',await page.evaluate(()=>Game.getBuildEntries()[0].subtitle.includes('宝箱可选')));
    await capture('build-evolution');
    await click(await page.evaluate(()=>Game.getBuildPanelLayout().tabs[3]));await page.waitForFunction(()=>Game._buildTab==='guides');
    check('Three distinct build guides are discoverable',await page.evaluate(()=>Game.getBuildEntries().length===3));
    await click(await page.evaluate(()=>Game.getBuildPanelLayout().back));await page.waitForFunction(()=>!Game._buildOpen);
    check('Closing build panel returns to paused state',await page.evaluate(()=>Game.state==='paused'));
    await page.evaluate(()=>{
      const ids=['sword','hammer','bow','fireball','knife','soul'];Game.player.weapons=ids.map(id=>new Weapon(id,CONFIG.WEAPONS[id]));
      Game.player.weapons[1].level=4;Game.upgradeChoices=[CONFIG.WEAPON_UNLOCKS.find(u=>u.weaponId==='shadow_imp')];Game.pendingLevelUps=1;Game.state='levelup';
    });
    const inventory=await page.evaluate(()=>JSON.stringify(Game.player.weapons.map(w=>[w.id,w.level])));
    await page.keyboard.press('Digit1');await page.waitForFunction(()=>!!Game._weaponReplacement);
    await capture('weapon-replacement');await page.keyboard.press('Escape');await page.waitForFunction(()=>!Game._weaponReplacement);
    check('Cancel preserves inventory and queued level-up',await page.evaluate(before=>JSON.stringify(Game.player.weapons.map(w=>[w.id,w.level]))===before&&Game.pendingLevelUps===1&&Game.state==='levelup',inventory));
    await page.keyboard.press('Digit1');await page.waitForFunction(()=>!!Game._weaponReplacement);
    await click(await page.evaluate(()=>Game.getBuildPanelLayout().rows[1]));await page.waitForFunction(()=>!Game._weaponReplacement);
    check('Replacement consumes one reward, preserves other slots',await page.evaluate(()=>Game.player.weapons.length===6&&Game.player.weapons[1].id==='shadow_imp'&&Game.player.weapons[1].level===1&&Game.player.weapons[0].id==='sword'&&Game.pendingLevelUps===0&&Game.state==='levelup'));
    await page.evaluate(()=>{Game.pendingLevelUps=0;Game.upgradeChoices=[CONFIG.UPGRADES.find(u=>u.id==='damage')];});
    await page.keyboard.press('Digit1');await wait('playing');
    await page.evaluate(()=>{Game.state='chestReward';Game.chestRewardChoices=[{weaponId:'ring_fire',name:CONFIG.WEAPONS.ring_fire.name,icon:CONFIG.WEAPONS.ring_fire.icon}];});
    await page.keyboard.press('Digit1');await page.waitForFunction(()=>!!Game._weaponReplacement);
    await click(await page.evaluate(()=>Game.getBuildPanelLayout().back));await page.waitForFunction(()=>!Game._weaponReplacement);
    check('Chest replacement cancel preserves chest reward',await page.evaluate(()=>Game.state==='chestReward'&&Game.chestRewardChoices[0].weaponId==='ring_fire'&&Game.player.weapons.length===6));
    await page.keyboard.press('Digit1');await page.waitForFunction(()=>!!Game._weaponReplacement);await click(await page.evaluate(()=>Game.getBuildPanelLayout().rows[2]));await wait('playing');
    check('Chest replacement resumes after one acquisition',await page.evaluate(()=>Game.player.weapons[2].id==='ring_fire'&&Game.player.weapons.length===6));
    await page.evaluate(()=>{const e=CONFIG.WEAPON_EVOLUTIONS[0];Game.player.weapons[0].level=5;Game.player.upgradeLevels[e.relic]=e.relicMinLevel;Game.chestRewardChoices=[{type:'evolution',...e}];Game.state='chestReward';});
    await page.keyboard.press('Digit1');await wait('playing');
    check('Full inventory evolution retains slot and level',await page.evaluate(()=>Game.player.weapons[0].id==='sword_wind'&&Game.player.weapons[0].level===5&&Game.player.weapons.length===6));
    await page.keyboard.press('Escape');await wait('paused');
    await click(await page.evaluate(()=>Game.getPauseMenuButtons().find(r=>r.key==='save')));await wait('menu');
    await page.reload();await wait('menu');await click(await page.evaluate(()=>Game.getMenuLayout().continue));await wait('playing');
    check('Replaced and evolved inventory survives reload',await page.evaluate(()=>Game.player.weapons[0].id==='sword_wind'&&Game.player.weapons[0].level===5&&Game.player.weapons[1].id==='shadow_imp'&&Game.player.weaponCapacity===6));
    await page.evaluate(()=>{Game.state='paused';Game.saveProgress();const s=JSON.parse(localStorage.getItem(Game.saveKey));s.schemaVersion=5;delete s.weaponCapacity;delete s.summonPactGranted;s.weapons=Object.keys(CONFIG.WEAPONS).slice(0,9).map(id=>({id,level:3}));localStorage.setItem(Game.saveKey,JSON.stringify(s));Game.state='menu';});
    await page.reload();await wait('menu');await click(await page.evaluate(()=>Game.getMenuLayout().continue));await wait('playing');
    check('Legacy nine-weapon save restores all levels and capacity',await page.evaluate(()=>Game.player.weapons.length===9&&Game.player.weaponCapacity===9&&Game.player.weapons.every(w=>w.level===3)));
    for(const theme of ['village','mine','hell']) {
      await page.evaluate(theme=>{Game.runSeed=123;Game.loadLevel(theme);Game.mapLayoutVersion=0;Game.generateMap();Game.state='paused';Game._buildOpen=false;},theme);
      // Captured from v0.6's generator, seed 123. Visual changes must retain
      // obstacle types and positions for saved players and encounter guards.
      const hash=await page.evaluate(()=>{
        let hash=2166136261;const source=JSON.stringify(Game.mapData.props.map(p=>[p.type,p.x,p.y]));
        for(const c of source){hash^=c.charCodeAt(0);hash=Math.imul(hash,16777619)>>>0;}return hash;
      });
      check(`${theme}: terrain update preserves v0.6 obstacle layout`,hash==={village:779931628,mine:3508978612,hell:1609912571}[theme]);
      const pixels=await page.evaluate(theme=>{const c=document.createElement('canvas');c.width=c.height=128;const t=c.getContext('2d');t.drawImage(Assets.get(`tiles/ground_${theme}_v070`),0,0);const d=t.getImageData(0,0,128,128).data;let opaque=true;for(let i=3;i<d.length;i+=4)if(d[i]!==255)opaque=false;return {opaque,complete:Assets.get(`tiles/ground_${theme}_v070`).complete};},theme);
      check(`${theme}: opaque ground texture loads`,pixels.opaque&&pixels.complete);
      // Compare adjacent pixels at former tile boundaries; no periodic dark strips.
      const seam=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=256;Game.drawContinuousGround(c.getContext('2d'),Game.levelData.theme,256,256);const d=c.getContext('2d').getImageData(0,0,256,256).data;let max=0;for(let y=0;y<256;y++)for(const x of [128])for(let k=0;k<3;k++)max=Math.max(max,Math.abs(d[(y*256+x-1)*4+k]-d[(y*256+x)*4+k]));return max;});
      check(`${theme}: mirrored ground has no hard tile seam`,seam===0);
      await page.evaluate(()=>{Game.renderPause=()=>{};});await page.waitForTimeout(60);await capture(`terrain-${theme}`);
    }
    await page.reload();await wait('menu');await page.evaluate(()=>{Game.startNewGame();Game.state='paused';Game.openBuildPanel();});
    for(const [width,height] of [[390,844],[320,568],[844,390]]) {
      await page.setViewportSize({width,height});
      check(`Build controls fit ${width}x${height}`,await page.evaluate(()=>{const l=Game.getBuildPanelLayout(),v=Game.getVisibleCanvasRect();return [...l.rows,...l.tabs,l.back,l.prev,l.next].every(r=>r.x>=v.x&&r.y>=v.y&&r.x+r.w<=v.x+v.w&&r.y+r.h<=v.y+v.h);}));
      await capture(`build-${width}x${height}`);
    }
    const context=await page.context().browser().newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
    const mobile=await context.newPage();mobile.on('pageerror',e=>errors.push(String(e)));await mobile.goto(url);await mobile.waitForFunction(()=>typeof Game!=='undefined'&&Game.state==='menu');
    // Swap the active page so the same coordinate helper uses actual emulated taps.
    const desktop=page;page=mobile;
    await page.evaluate(()=>{Game.startNewGame();Game.state='paused';});
    await click(await page.evaluate(()=>Game.getPauseMenuButtons().find(r=>r.key==='build')),true);await page.waitForFunction(()=>Game._buildOpen);
    await click(await page.evaluate(()=>Game.getBuildPanelLayout().tabs[2]),true);await page.waitForFunction(()=>Game._buildTab==='evolutions');
    check('Mobile taps open build panel and evolution tab',true);
    await click(await page.evaluate(()=>Game.getBuildPanelLayout().rows[0]),true);await page.waitForFunction(()=>!!Game._buildDetail);await capture('mobile-evolution-details');
    await click(await page.evaluate(()=>Game.getBuildPanelLayout().back),true);await page.waitForFunction(()=>!Game._buildDetail);
    await click(await page.evaluate(()=>Game.getBuildPanelLayout().back),true);await page.waitForFunction(()=>!Game._buildOpen);
    await page.evaluate(()=>{Game.player.weapons=['sword','hammer','bow','fireball','knife','soul'].map(id=>new Weapon(id,CONFIG.WEAPONS[id]));Game.state='levelup';Game.upgradeChoices=[CONFIG.UPGRADES.find(u=>u.id==='summoner_pact')];});
    await click(await page.evaluate(()=>Game.getChoiceLayout(1).cards[0]),true);await page.waitForFunction(()=>!!Game._weaponReplacement);
    await click(await page.evaluate(()=>Game.getBuildPanelLayout().next),true);await page.waitForFunction(()=>Game._buildPage===1);
    await capture('mobile-replacement-page2');await click(await page.evaluate(()=>Game.getBuildPanelLayout().rows[0]),true);await wait('playing');
    check('Mobile second-page replacement applies pact once',await page.evaluate(()=>Game.player.weapons[5].id==='shadow_imp'&&Game.player.weapons.length===6&&Game.player.upgradeLevels.summoner_pact===1&&Game.player.stats.summonDamageMult===1.2));
    await context.close();page=desktop;
    check('Build and terrain flows have no JavaScript errors',errors.length===0);
    return {passed:true,checks,screenshots,errors};
  } catch(error){await capture('build-failure').catch(()=>{});return {passed:false,checks,screenshots,errors,failure:String(error.stack||error)};}
}
