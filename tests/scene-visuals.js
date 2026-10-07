async page => {
  const screenshots=[],checks=[],errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.setExtraHTTPHeaders({'Cache-Control':'no-cache'});
  await page.setViewportSize({width:1280,height:720});await page.reload();
  await page.waitForFunction(()=>Game.state==='menu',null,{timeout:65000});
  for(const [phase,time,count] of [['opening',0,4],['horde',120,24],['boss',610,30]]){
    await page.evaluate(({phase,time,count})=>{
      Game.selectedCharacter='warden';Game.selectedExpedition='campaign';Game.startNewGame();Game.runSeed=123;Game.loadLevel('village');Game.state='paused';Game.renderPause=()=>{};Game.levelTime=time;
      const x=Game.player.x,y=Game.player.y;Game.camera.x=x-480;Game.camera.y=y-270;
      Game.player.weapons=['sword','shield','bow','fireball'].map(id=>new Weapon(id,CONFIG.WEAPONS[id]));Game.enemies=[];
      for(let i=0;i<count;i++){const a=i*TAU/count;Game.enemies.push(new Enemy('skeleton',x+Math.cos(a)*210,y+Math.sin(a)*155));}
      if(phase==='boss'){const boss=new Enemy('boss',x+145,y-20);boss.phase=2;boss.doHazard(Game.player);Game.enemies.push(boss);Game.bossActive=Game.bossSpawned=true;}
      Game.pickups=Array.from({length:12},(_,i)=>new Pickup(x-90+i*18,y+85,'xp','xp_gem_small',1));Game.render();
    },{phase,time,count});
    const path=`output/playwright/v120/scene-${phase}.png`;await page.screenshot({path});screenshots.push(path);
    checks.push({name:`Visual combat fixture: ${phase}`,passed:true,mode:'controlled visual fixture, not natural progression'});
  }
  for(const theme of ['frost','marsh'])for(const weather of ['warning','active']){
    await page.evaluate(({theme,weather})=>{
      Game.selectedCharacter='ranger';Game.selectedExpedition=theme;Game.startNewGame();Game.runSeed=123;Game.loadLevel(theme);Game.state='paused';Game.renderPause=()=>{};
      Game.levelTime=theme==='frost'?(weather==='warning'?29:33):(weather==='warning'?21:25);
      const s=Game.levelEncounters.find(s=>s.id==='beacon');s.status='complete';Game.player.x=s.x;Game.player.y=s.y+65;Game.camera.x=s.x-480;Game.camera.y=s.y-230;Game.render();
    },{theme,weather});
    const path=`output/playwright/v120/scene-${theme}-${weather}.png`;await page.screenshot({path});screenshots.push(path);
    const actual=await page.evaluate(()=>Game.getTrialWeather());
    checks.push({name:`Shared objective and weather visual: ${theme}/${weather}`,passed:!!actual[weather],mode:'controlled completed beacon fixture',evidence:actual});
  }
  return {passed:errors.length===0&&checks.every(c=>c.passed),checks,screenshots,errors,limits:['These captures support separate visual review, not proof of natural combat or physical-device performance.']};
}
