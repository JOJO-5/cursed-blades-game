async page => {
  const checks = [], errors = [], screenshots = [];
  const baseURL = page.url();
  const watch = p => { p.on('pageerror', e => errors.push(String(e))); p.on('console', m => {if(m.type()==='error') errors.push(m.text());}); };
  watch(page);
  const check = (name, condition, mode='user-input', evidence=null) => {
    checks.push({name, passed:!!condition, mode, evidence});
    if (!condition) throw new Error(name);
  };
  const waitState = (p, state) => p.waitForFunction(s => typeof Game !== 'undefined' && Game.state === s, state, {timeout:15000});
  const capture = async (p, name) => { const filename=`output/playwright/v060/${name}.png`; await p.screenshot({path:filename}); screenshots.push(filename); };
  const clickRect = async (p, rect, touch=false) => {
    const pos = await p.evaluate(r => {
      const b=Game.canvas.getBoundingClientRect(), x=r.x+r.w/2, y=r.y+r.h/2;
      return Game._rotate90 ? {x:b.left+(1-y/540)*b.width,y:b.top+x/960*b.height} :
        {x:b.left+x/960*b.width,y:b.top+y/540*b.height};
    },rect);
    if(touch) await p.touchscreen.tap(pos.x,pos.y); else await p.mouse.click(pos.x,pos.y);
  };
  const clickMenu = async (p, key, touch=false) => clickRect(p, await p.evaluate(k=>Game.getMenuLayout()[k],key),touch);
  const walkTo = async (p,target,tolerance=35) => {
    for(let i=0;i<80;i++) {
      const position=await p.evaluate(()=>({x:Game.player.x,y:Game.player.y,state:Game.state}));
      if(position.state==='levelup') {await p.keyboard.press('Digit1');continue;}
      if(position.state==='chestReward') return;
      const dx=target.x-position.x,dy=target.y-position.y;
      if(Math.hypot(dx,dy)<=tolerance)return;
      const key=Math.abs(dx)>Math.abs(dy) ? (dx>0?'KeyD':'KeyA') : (dy>0?'KeyS':'KeyW');
      await p.keyboard.down(key);await p.waitForTimeout(Math.min(220,Math.max(35,Math.hypot(dx,dy)*4)));
      await p.keyboard.up(key);
    }
    throw new Error('Keyboard could not reach objective: '+JSON.stringify(await p.evaluate(()=>({x:Game.player.x,y:Game.player.y,state:Game.state})))+' target '+JSON.stringify(target));
  };
  const clearEncounter = async (p,id) => {
    await p.evaluate(id=>{
      const w=Game.player.weapons[0];
      for(const e of Game.enemies.filter(e=>e.encounterId===id)) {
        e.hp=1;e.x=Game.player.x+Math.cos(w.angle)*w.getRange();e.y=Game.player.y+Math.sin(w.angle)*w.getRange();
      }
    },id);
    for(let i=0;i<80;i++) {
      const state=await p.evaluate(id=>({state:Game.state,done:Game.levelEncounters.find(s=>s.id===id).status==='complete'}),id);
      if(state.done)return;
      if(state.state==='levelup'||state.state==='chestReward')await p.keyboard.press('Digit1');
      await p.waitForTimeout(100);
    }
    throw new Error('Encounter did not complete');
  };
  const finishStories = async (p, touch=false) => {
    await p.waitForFunction(()=>!['menu','loading'].includes(Game.state));
    for(let i=0;i<16;i++) {
      if(await p.evaluate(()=>Game.state !== 'story')) return;
      await p.waitForFunction(()=>Game.storyTimer > .31);
      if(touch) await p.touchscreen.tap(150,300); else await p.keyboard.press('Space');
      await p.waitForTimeout(60);
    }
    throw new Error('Story did not complete');
  };
  const cardBounds = p => p.evaluate(()=>{
    const choices=Game.state==='chestReward'?Game.chestRewardChoices:Game.upgradeChoices;
    const layout=Game.getChoiceLayout(choices.length), ctx=Game.ctx, records=[];
    const original=ctx.fillText;
    ctx.fillText=function(text,x,y,...args) {
      const m=this.measureText(text), w=m.width;
      let left=x;if(this.textAlign==='center')left-=w/2;else if(this.textAlign==='right')left-=w;
      const middle=this.textBaseline==='middle';
      records.push({text,anchor:x,left,right:left+w,top:y-(middle?m.actualBoundingBoxAscent/2:m.actualBoundingBoxAscent),bottom:y+(middle?m.actualBoundingBoxDescent/2:m.actualBoundingBoxDescent)});
      return original.call(this,text,x,y,...args);
    };
    try {Game.state==='chestReward' ? Game.renderChestReward() : Game.renderLevelUp();} finally {ctx.fillText=original;}
    const violations=[];
    for(const record of records) {
      const card=layout.cards.find(c=>record.anchor>=c.x && record.anchor<=c.x+c.w && record.top>=c.y && record.top<c.y+c.h);
      if(card && (record.left<card.x-1 || record.right>card.x+card.w+1 || record.bottom>card.y+card.h+1)) violations.push(record);
    }
    return {violations,cards:layout.cards};
  });
  try {
    await waitState(page,'menu');
    check('All runtime assets loaded',await page.evaluate(()=>Assets.failed.length===0),'browser-load');
    const generatedArt = await page.evaluate(()=>{
      const keys=Object.keys(Assets.images).filter(k=>k.endsWith('_v051'));
      return keys.map(key=>{
        const img=Assets.images[key], c=document.createElement('canvas');c.width=img.width;c.height=img.height;
        const ctx=c.getContext('2d');ctx.drawImage(img,0,0);
        const pixels=ctx.getImageData(0,0,c.width,c.height).data;
        let opaque=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>=24)opaque++;
        return {key,opaque,width:img.width,height:img.height};
      });
    });
    check('Generated assets have usable visible pixels',generatedArt.length===22 && generatedArt.every(a=>a.opaque>=80),'browser-pixels',generatedArt);
    await capture(page,'desktop-menu');
    await clickMenu(page,'start'); await finishStories(page); await waitState(page,'playing');
    const start = await page.evaluate(()=>({x:Game.player.x,y:Game.player.y}));
    await page.keyboard.down('KeyD'); await page.waitForTimeout(450); await page.keyboard.up('KeyD');
    check('Keyboard movement changes player position',await page.evaluate(a=>Game.player.x>a.x+20,start));
    await page.keyboard.press('Space');
    await page.waitForFunction(()=>Game.player.dashCooldown>0);
    check('Space triggers dash and cooldown',true);
    await page.keyboard.press('Escape'); await waitState(page,'paused');
    const time=await page.evaluate(()=>Game.levelTime); await page.waitForTimeout(300);
    check('Pause freezes gameplay time',await page.evaluate(t=>Game.levelTime===t,time));
    await clickRect(page,{x:380,y:280,w:200,h:45}); await waitState(page,'menu');
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem(Game.saveKey)));
    check('Save and exit persists position and timer',saved.levelTime>0 && !!saved.playerPosition);
    await page.reload(); await waitState(page,'menu'); await clickMenu(page,'continue'); await waitState(page,'playing');
    check('Reload and continue restores progression',await page.evaluate(s=>Game.levelTime>=s.levelTime && Game.levelTime<s.levelTime+2 && Game.player.level===s.level,saved));

    await page.evaluate(()=>{Game.levelTime=19.9;Game.spawnTimer=999;Game.enemies=[];Game.player.invuln=30;});
    const camp=await page.evaluate(()=>Game.levelEncounters.find(s=>s.id==='camp'));
    await walkTo(page,camp,65);await page.waitForFunction(()=>Game.levelEncounters[0].status==='active');
    check('Approaching the camp starts its finite wave',await page.evaluate(()=>{
      const remaining=Game.enemies.filter(e=>e.encounterId==='camp').length;return remaining>0&&remaining<=3;
    }),'seeded-timer + keyboard');
    await capture(page,'camp-challenge');await page.keyboard.press('Escape');await waitState(page,'paused');
    const propSignature=await page.evaluate(()=>JSON.stringify(Game.mapData.props.map(p=>[p.type,p.x,p.y])));
    await clickRect(page,{x:380,y:280,w:200,h:45});await waitState(page,'menu');
    const encounterSave=await page.evaluate(()=>JSON.parse(localStorage.getItem(Game.saveKey)));
    await page.reload();await waitState(page,'menu');await clickMenu(page,'continue');await waitState(page,'playing');
    check('Reload reproduces the same prop types and positions',await page.evaluate(signature=>JSON.stringify(Game.mapData.props.map(p=>[p.type,p.x,p.y]))===signature,propSignature),'seeded-map + reload');
    check('Active camp and remaining guards restore',await page.evaluate(s=>{
      const site=Game.levelEncounters.find(e=>e.id==='camp');
      return site.x===s.x&&site.y===s.y&&site.status==='active'&&Game.enemies.some(e=>e.encounterId==='camp');
    },camp),'save + reload + user-input',encounterSave.encounters);
    await clearEncounter(page,'camp');
    check('Camp clearing creates exactly one guaranteed chest',await page.evaluate(()=>Game.pickups.filter(p=>p.objectiveId==='camp').length===1),'seeded-combat');
    await walkTo(page,camp,10);await waitState(page,'chestReward');await page.keyboard.press('Digit1');await waitState(page,'playing');
    await page.evaluate(()=>Game.updateLevelEncounters());
    check('Collected camp reward never respawns',await page.evaluate(()=>Game.levelEncounters[0].status==='complete'&&!Game.pickups.some(p=>p.objectiveId==='camp')),'objective-idempotency');
    await page.evaluate(()=>{Game.levelTime=60;Game.player.invuln=30;});
    const altar=await page.evaluate(()=>Game.levelEncounters.find(s=>s.id==='altar'));
    await walkTo(page,await page.evaluate(()=>({x:Game.levelData.mapW*CONFIG.TILE_SIZE/2,y:Game.levelData.mapH*CONFIG.TILE_SIZE/2})),25);
    await walkTo(page,altar,55);
    check('Altar waits for explicit interaction',await page.evaluate(()=>Game.levelEncounters[1].status==='ready'),'keyboard');
    const altarHP=await page.evaluate(()=>Game.player.hp),altarCost=await page.evaluate(()=>Math.ceil(Game.player.getMaxHp()*.15));
    await page.keyboard.press('KeyE');await page.waitForFunction(()=>Game.levelEncounters[1].status==='active');
    check('Altar charges its health cost once',await page.evaluate(s=>Math.abs(Game.player.hp-(s.hp-s.cost))<1,{hp:altarHP,cost:altarCost}),'keyboard');
    await capture(page,'altar-challenge');await clearEncounter(page,'altar');
    check('Altar clearing creates a rare chest once',await page.evaluate(()=>Game.pickups.filter(p=>p.objectiveId==='altar'&&p.value===1).length===1),'seeded-combat');
    for(let i=0;i<5;i++) {
      if(await page.evaluate(()=>Game.state==='playing'))break;
      await page.keyboard.press('Digit1');await page.waitForTimeout(100);
    }

    // Seed a real XP pickup; game collection, level-up queue and UI still run normally.
    await page.evaluate(()=>Game.pickups.push(Game.pickupPool.obtain(Game.player.x,Game.player.y,'xp','xp_gem_small',Game.player.xpToNext)));
    await waitState(page,'levelup');
    const before=await page.evaluate(()=>Game.player.weapons.map(w=>({id:w.id,level:w.level})));
    const rewardLevel=await page.evaluate(()=>Game.player.level);
    const choices=await page.evaluate(()=>Game.upgradeChoices.map(c=>({id:c.id,weaponId:c.weaponId})));
    await capture(page,'desktop-upgrade');
    check('Desktop reward text stays inside cards',(await cardBounds(page)).violations.length===0,'canvas-layout');
    await clickRect(page,await page.evaluate(()=>Game.getChoiceDetailButton(Game.getChoiceLayout(3).cards[0])));
    await page.waitForFunction(()=>!!Game._choiceDetails);
    check('Details opens without consuming reward',await page.evaluate(level=>Game.state==='levelup' && Game.player.level===level,rewardLevel));
    await capture(page,'desktop-details'); await page.keyboard.press('Escape');
    await page.waitForFunction(()=>!Game._choiceDetails);
    await page.keyboard.press('Digit1'); await waitState(page,'playing');
    check('Reward selection resumes combat',await page.evaluate(()=>Game.state==='playing'),'seeded-pickup + user-input',{before,choices});
    const chests=await page.evaluate(()=>Game.chestsOpened);
    await page.evaluate(()=>Game.pickups.push(Game.pickupPool.obtain(Game.player.x,Game.player.y,'chest','chest',1)));
    await waitState(page,'chestReward');
    await capture(page,'desktop-chest');
    check('Chest opens with readable choices',(await cardBounds(page)).violations.length===0,'seeded-pickup');
    await page.keyboard.press('Digit1'); await waitState(page,'playing');
    check('Chest reward applies and resumes combat',await page.evaluate(n=>Game.chestsOpened===n+1,chests),'seeded-pickup + user-input');

    // Accelerated boss fixtures: advance timer, then use the normal spawn/death/grace/story transitions.
    // This is state-flow coverage, not natural 24-minute balance acceptance.
    for (const theme of ['village','mine','hell']) {
      check(`${theme}: expected level reached`,await page.evaluate(t=>Game.levelData.theme===t,theme),'accelerated-flow');
      await page.evaluate(()=>{Game.player.invuln=999;Game.levelTime=Game.levelData.bossSpawnTime-.15;Game.messages=[];});
      for(let i=0;i<120;i++) {
        const s=await page.evaluate(()=>({boss:Game.bossSpawned,state:Game.state}));
        if(s.boss)break;
        if(s.state==='levelup'||s.state==='chestReward')await page.keyboard.press('Digit1');
        await page.waitForTimeout(100);
      }
      check(`${theme}: boss spawn survives pickup interrupts`,await page.evaluate(()=>Game.bossSpawned),'accelerated-flow');
      await finishStories(page); await waitState(page,'playing');
      check(`${theme}: boss enters combat`,await page.evaluate(()=>Game.enemies.some(e=>e.isBoss&&e.alive)),'accelerated-flow');
      await capture(page,`${theme}-boss`);
      await page.evaluate(()=>{
        const b=Game.enemies.find(e=>e.isBoss); const w=Game.player.weapons[0];
        b.hp=1; b.x=Game.player.x+Math.cos(w.angle)*w.getRange();b.y=Game.player.y+Math.sin(w.angle)*w.getRange();
      });
      await page.waitForFunction(()=>Game.bossDefeated,{},{timeout:10000});
      check(`${theme}: boss drops allow pickup grace`,await page.evaluate(()=>Game.bossDefeatedGraceTimer>0),'accelerated-flow');
      // Consume any genuine reward interrupts while waiting for the grace period.
      for(let i=0;i<120;i++) {
        const state=await page.evaluate(()=>Game.state);
        if(state==='levelup'||state==='chestReward') await page.keyboard.press('Digit1');
        if(state==='story'||state==='victory') break;
        await page.waitForTimeout(100);
      }
      await finishStories(page);
      if(theme!=='hell') await finishStories(page); // next biome intro
    }
    await waitState(page,'victory'); await capture(page,'final-victory');
    check('All three completion flags persist',await page.evaluate(()=>['village','mine','hell'].every(t=>Game.meta.levelsCompleted[t])),'accelerated-flow');
    await clickRect(page,{x:380,y:380,w:200,h:45}); await waitState(page,'menu');
    await clickMenu(page,'start'); await finishStories(page); await waitState(page,'playing');
    await page.evaluate(()=>{
      Game.player.hp=1;Game.player.invuln=0;
      Game.enemies.push(new Enemy('villager',Game.player.x,Game.player.y));
    });
    await waitState(page,'gameover'); await capture(page,'gameover');
    await clickRect(page,await page.evaluate(()=>Game.getGameOverButtons().restart)); await finishStories(page); await waitState(page,'playing');
    check('Death screen restarts a fresh run',await page.evaluate(()=>Game.player.alive&&Game.player.level===1&&Game.player.hp>0),'seeded-contact + user-input');
    await page.keyboard.press('Escape'); await waitState(page,'paused');

    const mobileContext=await page.context().browser().newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:1});
    const mobile=await mobileContext.newPage();watch(mobile);await mobile.goto(baseURL);await waitState(mobile,'menu');
    await capture(mobile,'mobile-menu');
    check('Mobile menu and logo fit visible area',await mobile.evaluate(()=>{
      const l=Game.getMenuLayout(),v=l.visible,img=Assets.get('ui/title_logo');
      const width=img.width*Math.min(400/img.width,(v.w-36)/img.width,1.5);
      return width<=v.w && Object.values(l).filter(r=>r.w&&r!==v).every(r=>r.x>=v.x&&r.x+r.w<=v.x+v.w&&r.y+r.h<=v.y+v.h);
    }),'mobile-layout');
    await clickMenu(mobile,'settings',true);await mobile.waitForFunction(()=>Game._settingsOverlay);
    check('Mobile settings panel fits visible area',await mobile.evaluate(()=>{
      const s=Game.getSettingsLayout(),v=Game.getVisibleCanvasRect();
      return s.x>=v.x&&s.x+s.w<=v.x+v.w&&s.y>=v.y&&s.y+s.h<=v.y+v.h;
    }),'mobile-layout');
    const slider=await mobile.evaluate(()=>{const s=Game._getSliderRects()[0];return {x:s.x+s.w*.25,y:s.y,w:0,h:0}});
    await clickRect(mobile,slider,true);
    await mobile.waitForFunction(()=>Math.abs(Game.settings.masterVolume-.25)<.02);
    check('Mobile tap adjusts volume',true,'emulated-touch');await capture(mobile,'mobile-settings');
    await clickRect(mobile,await mobile.evaluate(()=>Game.getSettingsLayout().back),true);
    await mobile.waitForFunction(()=>!Game._settingsOverlay);await mobile.reload();await waitState(mobile,'menu');
    check('Volume setting persists after reload',await mobile.evaluate(()=>Math.abs(Game.settings.masterVolume-.25)<.02),'emulated-touch + storage');
    await clickMenu(mobile,'start',true);await finishStories(mobile,true);await waitState(mobile,'playing');
    const touchSession=await mobileContext.newCDPSession(mobile);
    const anchor=await mobile.evaluate(()=>{
      const b=Game.canvas.getBoundingClientRect(),j=Input.joystick;
      return {x:b.left+j.anchorX/960*b.width,y:b.top+j.anchorY/540*b.height};
    });
    const initialX=await mobile.evaluate(()=>Game.player.x);
    await touchSession.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:anchor.x,y:anchor.y}]});
    await touchSession.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:anchor.x+55,y:anchor.y}]});
    await mobile.waitForTimeout(350);
    await touchSession.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    check('Mobile native touch joystick moves player',await mobile.evaluate(x=>Game.player.x>x+10,initialX),'emulated-touch');
    await clickRect(mobile,await mobile.evaluate(()=>({x:Input.dashButton.anchorX-20,y:Input.dashButton.anchorY-20,w:40,h:40})),true);
    await mobile.waitForFunction(()=>Game.player.dashCooldown>0);
    check('Mobile native touch dash triggers',true,'emulated-touch');
    await capture(mobile,'mobile-combat');
    await clickRect(mobile,await mobile.evaluate(()=>Game.getPauseButtonRect()),true);await waitState(mobile,'paused');
    check('Mobile pause button works',true,'emulated-touch');
    await mobile.keyboard.press('Escape');await waitState(mobile,'playing');
    check('Touch pause does not leave Escape held',await mobile.evaluate(()=>!Input.keys.Escape),'emulated-touch + keyboard');
    await mobile.waitForFunction(()=>Game.player.dashTimer<=0);
    await mobile.evaluate(()=>{
      Game.levelTime=60;Game.spawnTimer=999;Game.enemies=[];Game.player.invuln=20;
      Game.levelEncounters[0].status='complete';Game.levelEncounters[0].rewardSpawned=true;
      const altar=Game.levelEncounters[1];Game.player.x=altar.x;Game.player.y=altar.y;
    });
    await mobile.waitForFunction(()=>Game.getCurrentObjective().action);
    await mobile.waitForFunction(()=>Math.abs(Game.camera.x-clamp(Game.player.x-480,0,Game.levelData.mapW*CONFIG.TILE_SIZE-960))<15&&Math.abs(Game.camera.y-clamp(Game.player.y-270,0,Game.levelData.mapH*CONFIG.TILE_SIZE-540))<15);
    await capture(mobile,'mobile-altar');
    await clickRect(mobile,await mobile.evaluate(()=>Game.getEncounterActionButton()),true);
    await mobile.waitForFunction(()=>Game.levelEncounters[1].status==='active');
    const mobileAltar=await mobile.evaluate(()=>({dash:Game.player.dashTimer,guards:Game.enemies.filter(e=>e.encounterId==='altar').length}));
    check('Mobile objective button starts altar without triggering dash',mobileAltar.dash<=0&&mobileAltar.guards===5,'seeded-position + emulated-touch',mobileAltar);
    // A long existing choice verifies the original overflow with a genuine collected pickup.
    await mobile.evaluate(()=>{
      Game.pickups.push(Game.pickupPool.obtain(Game.player.x,Game.player.y,'xp','xp_gem_small',Game.player.xpToNext));
    });
    await waitState(mobile,'levelup');
    await mobile.evaluate(()=>{Game.upgradeChoices=[CONFIG.UPGRADES.find(u=>u.id==='attackspeed'),CONFIG.UPGRADES.find(u=>u.id==='maxhp'),CONFIG.UPGRADES.find(u=>u.id==='summoner_pact')];});
    const bounds=await cardBounds(mobile);
    check('Mobile long reward text stays inside cards',bounds.violations.length===0,'seeded-layout',bounds);
    await capture(mobile,'mobile-upgrade');
    await clickRect(mobile,await mobile.evaluate(()=>Game.getChoiceDetailButton(Game.getChoiceLayout(3).cards[0])),true);
    await mobile.waitForFunction(()=>!!Game._choiceDetails);await capture(mobile,'mobile-details');
    await clickRect(mobile,await mobile.evaluate(()=>Game.getChoiceDetailsLayout().close),true);await mobile.waitForFunction(()=>!Game._choiceDetails);
    check('Mobile details closes by touch without choosing reward',await mobile.evaluate(()=>Game.state==='levelup'),'emulated-touch');
    await clickRect(mobile,await mobile.evaluate(()=>Game.getChoiceLayout(3).cards[0]),true);await waitState(mobile,'playing');
    check('Mobile card tap applies the upgrade',await mobile.evaluate(()=>Game.player.upgradeLevels.attackspeed===1),'emulated-touch');
    await clickRect(mobile,await mobile.evaluate(()=>Game.getRotateButtonRect()),true);
    await mobile.waitForFunction(()=>Game._rotate90);await capture(mobile,'mobile-rotated');
    await clickRect(mobile,await mobile.evaluate(()=>Game.getPauseButtonRect()),true);await waitState(mobile,'paused');
    check('Rotated touch coordinates reach pause',true,'emulated-touch');
    await mobileContext.close();

    for(const [width,height] of [[320,568],[844,390],[1024,768]]) {
      await page.setViewportSize({width,height});
      await page.evaluate(()=>{Game.state='menu'});
      const fits=await page.evaluate(()=>{
        const l=Game.getMenuLayout(),v=l.visible;
        return [l.start,l.continue,l.settings,l.reset].every(r=>r.x>=v.x&&r.x+r.w<=v.x+v.w&&r.y>=v.y&&r.y+r.h<=v.y+v.h);
      });
      check(`Menu fits ${width}x${height}`,fits,'viewport-layout');await capture(page,`menu-${width}x${height}`);
    }
    const failed=await page.context().newPage();
    await failed.route('**/assets/player/hero.png',route=>route.abort());
    await failed.goto(baseURL);await failed.waitForSelector('.load-error');
    check('Missing resource blocks combat with readable retry',await failed.getByRole('button',{name:'重新加载'}).isVisible(),'network-failure');
    await capture(failed,'asset-error');await failed.unroute('**/assets/player/hero.png');
    await failed.getByRole('button',{name:'重新加载'}).click();await waitState(failed,'menu');
    check('Retry recovers after asset is available',true,'network-failure + user-input');await failed.close();
    check('Runtime has no console errors',errors.length===0,'console',errors);
    return {passed:true,checks,screenshots,errors,limits:['Boss and progression use accelerated fixtures, not natural complete runs.','Touch is emulated Chromium input, not physical-device or audio acceptance.']};
  } catch(error) {
    await capture(page,'failure').catch(()=>{});
    return {passed:false,checks,screenshots,errors,failure:String(error)};
  }
}
