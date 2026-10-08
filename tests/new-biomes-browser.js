async page => {
 const checks=[],errors=[],screenshots=[],url=page.url();page.on('pageerror',e=>errors.push(String(e)));const check=(name,v)=>{checks.push({name,passed:!!v});if(!v)throw Error(name);};
 const click=async r=>{const p=await page.evaluate(r=>{const b=Game.canvas.getBoundingClientRect();return{x:b.x+(r.x+r.w/2)/960*b.width,y:b.y+(r.y+r.h/2)/540*b.height};},r);await page.mouse.click(p.x,p.y);await page.waitForTimeout(100);};
 const settle=async()=>{for(let i=0;i<40;i++){if(await page.evaluate(()=>Game.state!=='story'))return;await page.waitForTimeout(330);await page.keyboard.press('Space');}};
 try{
  await page.goto(url);await page.waitForFunction(()=>typeof Game!=='undefined'&&Game.state==='menu');
  for(const theme of ['forest','clock','court']){
   await page.evaluate(theme=>{Game.state='menu';Game.selectedExpedition='campaign';Game.selectedRunProfile='normal';Game.startNewGame();Game.loadLevel(theme);},theme);await settle();
   check(theme+': real scene assets loaded',await page.evaluate(()=>Game.mapData.props.filter(p=>p.landmark).every(p=>Assets.get(p.type)?.complete)));
   check(theme+': boss has distinct original sprite',await page.evaluate(()=>{const d=CONFIG.ENEMIES[Game.levelData.bossId];return Assets.get(d.sprite)?.complete&&d.sprite.startsWith('bosses/');}));
   await page.evaluate(()=>{Game.state='paused';Game.levelTime=10;Game.enemies=[];Game.pickups=[];const r=Game.mapData.regions[0];Game.player.x=r.x;Game.player.y=r.y+40;Game.camera.x=Game.player.x-480;Game.camera.y=Game.player.y-270;Game.state='playing';Game.spawnTimer=999;Game.player.invuln=999;});
   await page.waitForTimeout(150);const file=`output/playwright/v120/v180-${theme}-scene.png`;await page.screenshot({path:file});screenshots.push(file);
   await page.evaluate(()=>{Game.state='paused';Game.levelTime=14;Game.player.invuln=0;Game.player.hp=Game.player.getMaxHp();Game.oathHazardTick=0;const z=Game.oathZones[0],s=Game.getOathHazardState();Game.player.x=s.theme==='clock'?Game.levelData.mapW*24:s.theme==='court'?Game.levelData.mapW*24:z.x;Game.player.y=s.theme==='clock'?Game.levelData.mapH*24-180:s.theme==='court'?Game.levelData.mapH*24:z.y;Game._testHp=Game.player.hp;Game.updateThemeHazards(.1);});
   check(theme+': actual active hazard causes damage',await page.evaluate(()=>Game.player.hp<Game._testHp));
   await page.evaluate(()=>{Game.player.invuln=0;Game.player.hp=Game.player.getMaxHp();Game.oathHazardTick=0;const s=Game.getOathHazardState(),z=Game.oathZones[0];Game.player.x=s.theme==='court'?z.x:Game.levelData.mapW*24;Game.player.y=s.theme==='court'?z.y:Game.levelData.mapH*24;Game._testHp=Game.player.hp;Game.updateThemeHazards(.1);});
   check(theme+': drawn safe space avoids damage',await page.evaluate(()=>Game.player.hp===Game._testHp));
   await page.evaluate(()=>{Game.state='playing';Game.enemies=[];Game.player.invuln=999;Game.spawnBoss();});await settle();
   await page.evaluate(()=>{Game.state='paused';const b=Game.enemies.find(e=>e.isBoss);b.takeDamage(b.maxHp*.6);b.pickNextAbility(Game.player,200);Game._testBossHp=b.hp;Game.saveProgress();});const hp=await page.evaluate(()=>Game._testBossHp);
   await page.reload();await page.waitForFunction(()=>Game.state==='menu');await click(await page.evaluate(()=>Game.getMenuLayout().continue));
   check(theme+': boss health and phase survive real refresh',await page.evaluate(hp=>{const b=Game.enemies.find(e=>e.isBoss);return b&&b.hp===hp&&b.phase===2;},hp));
   await page.evaluate(()=>{Game.state='playing';Game.player.invuln=999;Game.spawnTimer=999;Game.enemies.forEach(b=>{b.abilityTimer=.1;});});await page.waitForTimeout(2200);
   const bossFile=`output/playwright/v120/v180-${theme}-boss.png`;await page.screenshot({path:bossFile});screenshots.push(bossFile);
   check(theme+': unique attack runs without invalid geometry',await page.evaluate(()=>{const b=Game.enemies.find(e=>e.isBoss);return b.signatureIndex>0&&(b.signatureEffects||[]).every(e=>Number.isFinite(e.x)&&Number.isFinite(e.y));}));
  }
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{Game.resizeCanvas();Game.state='menu';Game.selectedExpedition='campaign';Game.startNewGame();Game.bossDefeated=true;Game.bossDefeatedGraceTimer=0;Game.finishCampaignStage();});
  check('Portrait three route cards fit visible area',await page.evaluate(()=>{const l=Game.getCampaignRouteLayout(),v=l.visible;return l.cards.length===3&&[...l.cards,l.menu].every(r=>r.x>=v.x&&r.y>=v.y&&r.x+r.w<=v.x+v.w&&r.y+r.h<=v.y+v.h)&&l.cards.every((r,i)=>!i||r.y>=l.cards[i-1].y+l.cards[i-1].h);}));
  const file='output/playwright/v120/v180-routes-portrait.png';await page.screenshot({path:file});screenshots.push(file);
  await click(await page.evaluate(()=>Game.getCampaignRouteLayout().cards.find(r=>r.id==='forest')));await settle();check('Portrait click selects new forest route',await page.evaluate(()=>Game.levelData.theme==='forest'&&Game.campaignRoute.length===2));
  check('No runtime errors',errors.length===0);return{passed:true,checks,errors,screenshots,limits:['Accelerated scene and combat fixtures; not natural full campaign or physical phone acceptance.']};
 }catch(e){return{passed:false,failure:String(e.stack||e),checks,errors,screenshots};}
 finally{await page.setViewportSize({width:1280,height:720});await page.evaluate(()=>Game.state='menu');}
}
