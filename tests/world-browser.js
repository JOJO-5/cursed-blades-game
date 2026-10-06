async page => {
  const checks=[],screenshots=[],errors=[],url=page.url();
  const check=(name,value,evidence=null)=>{checks.push({name,passed:!!value,mode:'seeded state + real keyboard/touch + collision geometry',evidence});if(!value)throw new Error(name);};
  const wait=s=>page.waitForFunction(s=>typeof Game!=='undefined'&&Game.state===s,s,{timeout:15000});
  const click=async(r,touch=false)=>{
    const pos=await page.evaluate(r=>{const b=Game.canvas.getBoundingClientRect(),x=r.x+r.w/2,y=r.y+r.h/2;return Game._rotate90?{x:b.left+(1-y/540)*b.width,y:b.top+x/960*b.height}:{x:b.left+x/960*b.width,y:b.top+y/540*b.height};},r);
    if(touch)await page.touchscreen.tap(pos.x,pos.y);else await page.mouse.click(pos.x,pos.y);await page.waitForTimeout(60);
  };
  const capture=async name=>{const path=`output/playwright/v090/${name}.png`;await page.screenshot({path});screenshots.push(path);};
  const settle=async()=>{
    for(let i=0;i<40;i++) {
      const state=await page.evaluate(()=>Game.state);
      if(state==='story'){await page.waitForFunction(()=>Game.storyTimer>.31);await page.keyboard.press('Space');}
      else if(state==='levelup'||state==='chestReward') {
        const choice=await page.evaluate(()=>{const c=Game.state==='levelup'?Game.upgradeChoices:Game.chestRewardChoices;return {replace:!!Game._weaponReplacement,index:Math.max(0,c.findIndex(u=>u.apply&&!u.weaponId&&u.id!=='summoner_pact'))};});
        if(choice.replace)await click(await page.evaluate(()=>Game.getBuildPanelLayout().rows[0]));else await page.keyboard.press(`Digit${choice.index+1}`);
      } else return;
      await page.waitForTimeout(70);
    }
    throw new Error('State did not settle');
  };
  const clearGuards=async id=>{
    for(let i=0;i<70;i++) {
      await settle();
      const count=await page.evaluate(id=>{
        const guards=Game.enemies.filter(e=>e.alive&&e.encounterId===id),w=Game.player.weapons[0];
        for(const e of guards){e.hp=1;e.x=Game.player.x+Math.cos(w.angle)*w.getRange();e.y=Game.player.y+Math.sin(w.angle)*w.getRange();}return guards.length;
      },id);
      if(!count){await page.waitForTimeout(200);await settle();await page.evaluate(()=>{Game.pickups=Game.pickups.filter(p=>p.type!=='xp');});return;}await page.waitForTimeout(80);
    }
    throw new Error('Guards not cleared through weapon damage');
  };
  page.on('pageerror',e=>errors.push(String(e)));
  try {
    await page.setViewportSize({width:1280,height:720});await page.goto(url);await wait('menu');
    const art=await page.evaluate(()=>['props/minecart_v080',...Array.from({length:4},(_,i)=>`player/hero_walk_v080_0${i+1}`)].map(key=>{
      const img=Assets.get(key),c=document.createElement('canvas');c.width=img.width;c.height=img.height;const t=c.getContext('2d');t.drawImage(img,0,0);const d=t.getImageData(0,0,c.width,c.height).data;let visible=0,transparent=0;for(let i=3;i<d.length;i+=4){if(d[i]>32)visible++;if(d[i]===0)transparent++;}return {key,visible,transparent};
    }));
    check('Five generated sprites load with visible pixels and transparent margins',art.every(a=>a.visible>500&&a.transparent>100),art);
    const maps=await page.evaluate(()=>{
      Game.startNewGame();Game.state='paused';const results=[];
      for(const seed of [0,1,77,123,909,65535,987654])for(const theme of ['village','mine','hell']) {
        Game.runSeed=seed;Game.loadLevel(theme);Game.state='paused';const props=JSON.stringify(Game.mapData.props.map(p=>[p.type,p.x,p.y]));Game.generateMap();
        const stable=props===JSON.stringify(Game.mapData.props.map(p=>[p.type,p.x,p.y]));
        const step=32,w=Game.levelData.mapW*48,h=Game.levelData.mapH*48,cx=w/2,cy=h/2,queue=[[cx,cy]],seen=new Set([cx+','+cy]);
        for(let i=0;i<queue.length;i++)for(const [dx,dy] of [[step,0],[-step,0],[0,step],[0,-step]]){
          const x=queue[i][0]+dx,y=queue[i][1]+dy,k=x+','+y;if(x<64||y<64||x>w-64||y>h-64||seen.has(k)||Game.isCircleBlocked(x,y,16))continue;seen.add(k);queue.push([x,y]);
        }
        const targets=[...(Game.mapData.regions||[]),...Game.levelEncounters];
        const reachable=targets.every(p=>queue.some(([x,y])=>dist(x,y,p.x,p.y)<40));
        const grouped=theme!=='village'||Game.mapData.regions.every(r=>Game.mapData.props.some(p=>p.regionId===r.id));
        const safe=Game.getSafePickupPosition(24,{minPlayerDistance:180,minPickupDistance:72});
        const rewardSafe=!!safe&&!Game.isCircleBlocked(safe.x,safe.y,24)&&!Game.isPointNearThemeFeature(safe.x,safe.y,24,Game.mapData.features);
        results.push({seed,theme,stable,reachable,grouped,rewardSafe,spawnClear:!Game.isCircleBlocked(cx,cy,20)});
      }
      return results;
    });
    check('Twenty-one actual sprite-sized maps preserve seed, paths, region clusters and safe reward positions',maps.every(r=>r.stable&&r.reachable&&r.grouped&&r.rewardSafe&&r.spawnClear),maps);
    await page.evaluate(()=>{Game.startNewGame();Game.runSeed=123;Game.loadLevel('village');Game.state='paused';Game.renderPause=()=>{};Game.player.invuln=0;});
    await capture('village-regions');
    const animation=await page.evaluate(()=>{
      const p=Game.player,seen=[],original=Assets.drawCentered;
      Assets.drawCentered=function(c,key,...args){if(key.startsWith('player/'))seen.push(key);return original.call(this,c,key,...args);};
      try{p.isMoving=true;for(let i=0;i<4;i++){p.animTime=i/8;p.draw(Game.ctx);}p.isMoving=false;p.draw(Game.ctx);}finally{Assets.drawCentered=original;}
      return seen;
    });
    check('Moving player renders four walking frames and returns to original idle',new Set(animation.slice(0,4)).size===4&&animation.at(-1)==='player/hero',animation);
    await page.reload();await wait('menu');await page.evaluate(()=>{Game.startNewGame();Game.loadLevel('mine');});await settle();await wait('playing');
    await page.evaluate(()=>{Game.levelTime=29.9;Game.spawnTimer=999;Game.player.invuln=999;Game.enemies=[];Game.pickups=[];});
    await page.keyboard.down('KeyA');await page.waitForTimeout(1600);await page.keyboard.up('KeyA');
    await page.waitForFunction(()=>Game.getCurrentObjective()?.action);
    check('Minecart is discoverable and does not start on approach',await page.evaluate(()=>Game.levelEncounters[0].status==='ready'));
    await capture('minecart-ready');await page.keyboard.press('KeyE');await page.waitForFunction(()=>Game.levelEncounters[0].status==='active');await page.keyboard.press('KeyE');
    check('Cart activation creates one finite wave',await page.evaluate(()=>Game.enemies.filter(e=>e.encounterId==='cart').length===4));
    await clearGuards('cart');
    await page.keyboard.down('KeyW');await page.waitForTimeout(1300);await page.keyboard.up('KeyW');await page.waitForTimeout(150);
    const paused=await page.evaluate(()=>Game.levelEncounters[0].progress);await page.waitForTimeout(300);
    check('Escort progress pauses when player leaves',await page.evaluate(p=>Game.levelEncounters[0].progress===p&&p>0&&p<1,paused));
    await settle();await page.keyboard.press('Escape');await wait('paused');await click(await page.evaluate(()=>Game.getPauseMenuButtons().find(r=>r.key==='save')));await wait('menu');
    await page.reload();await wait('menu');await click(await page.evaluate(()=>Game.getMenuLayout().continue));await settle();await wait('playing');
    check('Cart progress and clear guards survive reload',await page.evaluate(p=>Game.levelEncounters[0].status==='active'&&Game.levelEncounters[0].progress===p&&!Game.enemies.some(e=>e.encounterId==='cart'),paused));
    await page.evaluate(()=>{Game.spawnTimer=999;Game.player.invuln=999;});
    for(let i=0;i<240;i++) {
      const s=await page.evaluate(()=>({done:Game.levelEncounters[0].status==='complete',state:Game.state,x:Game.player.x,y:Game.player.y,cx:Game.levelEncounters[0].x,cy:Game.levelEncounters[0].y}));
      if(s.done)break;
      if(s.state!=='playing'){await settle();continue;}
      const dx=s.cx-s.x,dy=s.cy-s.y,key=Math.abs(dy)>20?(dy>0?'KeyS':'KeyW'):Math.abs(dx)>22?(dx>0?'KeyD':'KeyA'):null;
      if(key){await page.keyboard.down(key);await page.waitForTimeout(100);await page.keyboard.up(key);}else await page.waitForTimeout(100);
    }
    check('Keyboard escort reaches the destination and grants one reward',await page.evaluate(()=>Game.levelEncounters[0].status==='complete'&&Game.chestsOpened+Game.pickups.filter(p=>p.objectiveId==='cart').length===1));
    await settle();await capture('minecart-complete');
    await page.evaluate(()=>{Game.updateLevelEncounters(1);Game.updateLevelEncounters(1);});
    check('Repeated completion does not duplicate cart reward',await page.evaluate(()=>Game.chestsOpened+Game.pickups.filter(p=>p.objectiveId==='cart').length===1));
    await page.evaluate(()=>Game.loadLevel('hell'));await settle();await wait('playing');
    const riftChestBaseline=await page.evaluate(()=>Game.chestsOpened);
    await page.evaluate(()=>{const s=Game.levelEncounters[0];Game.levelTime=45;Game.player.x=s.x+100;Game.player.y=s.y;Game.player.invuln=999;Game.enemies=[];Game.pickups=[];Game.spawnTimer=999;});
    await page.waitForFunction(()=>Game.getCurrentObjective()?.action);await page.keyboard.press('KeyE');await page.waitForFunction(()=>Game.levelEncounters[0].status==='active');
    check('Rift requires consent and spawns six guards',await page.evaluate(()=>Game.enemies.filter(e=>e.encounterId==='rift').length===6));
    await clearGuards('rift');
    await page.evaluate(()=>{const s=Game.levelEncounters[0];Game.player.x=s.x+200;Game.player.y=s.y;});
    const held=await page.evaluate(()=>Game.levelEncounters[0].progress);await page.waitForTimeout(250);
    check('Leaving sealing circle pauses progress',await page.evaluate(p=>Game.levelEncounters[0].progress===p,held));
    await page.evaluate(()=>{const s=Game.levelEncounters[0];Game.player.x=s.x+100;Game.player.y=s.y;});
    await page.waitForFunction(()=>Game.levelEncounters[0].progress>.2);await page.keyboard.press('Escape');await wait('paused');
    const seal=await page.evaluate(()=>Game.levelEncounters[0].progress);await click(await page.evaluate(()=>Game.getPauseMenuButtons().find(r=>r.key==='save')));await wait('menu');
    await page.reload();await wait('menu');await click(await page.evaluate(()=>Game.getMenuLayout().continue));await settle();await wait('playing');
    check('Partial rift sealing survives save and reload',await page.evaluate(p=>Game.levelEncounters[0].progress>=p&&Game.levelEncounters[0].progress<p+.1,seal));
    await page.evaluate(()=>{Game.player.invuln=999;Game.spawnTimer=999;});await page.waitForFunction(()=>Game.levelEncounters[0].status==='complete',null,{timeout:10000});
    check('Completed seal removes its hazard and pays once',await page.evaluate(n=>Game.mapData.features.find(f=>f.objectiveRift).sealed&&Game.chestsOpened+Game.pickups.filter(p=>p.objectiveId==='rift').length===n+1,riftChestBaseline));
    await capture('rift-sealed');
    await page.evaluate(()=>{const s=Game.levelEncounters[0];Game.player.x=s.x;Game.player.y=s.y;Game.player.invuln=0;Game.enemies=[];Game.mapData.features=Game.mapData.features.filter(f=>f.objectiveRift);Game._sealHP=Game.player.hp;});
    await page.waitForTimeout(300);check('Sealed rift no longer damages or slows the player',await page.evaluate(()=>Game.player.hp===Game._sealHP&&Game.environmentSpeedMult===1));
    const context=await page.context().browser().newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
    const mobile=await context.newPage();mobile.on('pageerror',e=>errors.push(String(e)));const desktop=page;page=mobile;
    await page.goto(url);await wait('menu');await page.evaluate(()=>{Game.startNewGame();Game.loadLevel('mine');});await settle();await wait('playing');
    await page.evaluate(()=>{const s=Game.levelEncounters[0];Game.levelTime=30;Game.player.x=s.x;Game.player.y=s.y;Game.enemies=[];Game.pickups=[];Game.spawnTimer=999;Game.player.invuln=999;Game.player.dashTimer=0;});
    await page.waitForFunction(()=>Game.getCurrentObjective()?.action);await page.waitForTimeout(500);await capture('mobile-cart-ready');
    await click(await page.evaluate(()=>Game.getEncounterActionButton()),true);await page.waitForFunction(()=>Game.levelEncounters[0].status==='active');
    check('Mobile cart action starts guards without unintended dash',await page.evaluate(()=>Game.enemies.filter(e=>e.encounterId==='cart').length===4&&Game.player.dashTimer===0));
    await page.evaluate(()=>Game.loadLevel('hell'));await settle();await wait('playing');
    await page.evaluate(()=>{const s=Game.levelEncounters[0];Game.levelTime=45;Game.player.x=s.x+100;Game.player.y=s.y;Game.enemies=[];Game.pickups=[];Game.spawnTimer=999;Game.player.invuln=999;});
    await page.waitForFunction(()=>Game.getCurrentObjective()?.action);await click(await page.evaluate(()=>Game.getEncounterActionButton()),true);await page.waitForFunction(()=>Game.levelEncounters[0].status==='active');
    check('Mobile rift action starts a finite seal challenge',await page.evaluate(()=>Game.enemies.filter(e=>e.encounterId==='rift').length===6));
    await page.waitForTimeout(500);await capture('mobile-rift-active');await context.close();page=desktop;
    check('World objectives and animation have no JavaScript errors',errors.length===0,errors);
    return {passed:true,checks,screenshots,errors};
  }catch(error){await capture('world-failure').catch(()=>{});return {passed:false,checks,screenshots,errors,failure:String(error.stack||error)};}
}
