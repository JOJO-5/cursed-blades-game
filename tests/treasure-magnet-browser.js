async page => {
 const checks=[],errors=[],screenshots=[],url=page.url();page.on('pageerror',e=>errors.push(String(e)));
 const check=(name,v)=>{checks.push({name,passed:!!v});if(!v)throw Error(name);};
 const settle=async()=>{for(let i=0;i<40;i++){if(await page.evaluate(()=>Game.state!=='story'))return;await page.waitForTimeout(330);await page.keyboard.press('Space');}};
 try{
  await page.goto(url);await page.waitForFunction(()=>typeof Game!=='undefined'&&Game.state==='menu');
  await page.evaluate(()=>{Game.selectedExpedition='campaign';Game.selectedRunProfile='normal';Game.startNewGame();});await settle();
  await page.evaluate(()=>{
   Game.state='paused';Game.enemies=[];Game.pickups=[];Game.spawnTimer=999;Game.levelTime=1;Game.player.invuln=999;
   const x=Game.player.x,y=Game.player.y;
   const a=Game.pickupPool.obtain(x-700,y,'chest','chest',0);a.objectiveId='test-quest';a.life=1;
   const b=Game.pickupPool.obtain(x+650,y+100,'chest','chest',1);
   const trap=Game.pickupPool.obtain(x,y-600,'chest','chest',2);
   const magnet=Game.pickupPool.obtain(x+60,y,'chestMagnet','chest',0);magnet.vx=magnet.vy=0;
   Game.pickups.push(a,b,trap,magnet);Game.state='playing';
  });
  await page.keyboard.down('d');await page.waitForTimeout(180);await page.keyboard.up('d');
  await page.waitForFunction(()=>Game.pickups.filter(p=>p.type==='chest'&&p.magnetized).length===2);
  check('Real movement retrieves treasure magnet',await page.evaluate(()=>!Game.pickups.some(p=>p.type==='chestMagnet'&&p.alive)));
  check('Quest and rare treasure pulled, trap excluded',await page.evaluate(()=>Game.pickups.filter(p=>p.magnetized).length===2&&!Game.pickups.find(p=>p.value===2).magnetized));
  await page.evaluate(()=>{Game.state='paused';Game.saveProgress();});
  await page.reload();await page.waitForFunction(()=>Game.state==='menu');
  await page.evaluate(()=>Game.loadAndContinue());
  check('Real refresh restores chest attraction and quest protection',await page.evaluate(()=>Game.pickups.filter(p=>p.magnetized).length===2&&Game.pickups.some(p=>p.objectiveId==='test-quest')));
  await page.waitForFunction(()=>Game.state==='chestReward');
  check('First reward has three actual choices',await page.evaluate(()=>Game.chestRewardChoices.length===3&&Game.pickups.filter(p=>p.type==='chest'&&p.value!==2&&p.alive).length===1));
  await page.waitForTimeout(250);await page.keyboard.press('1');
  await page.waitForFunction(()=>Game.state==='chestReward'&&Game.pickups.filter(p=>p.type==='chest'&&p.value!==2&&p.alive).length===0);
  check('Second chest opens after choosing first reward',true);
  await page.waitForTimeout(250);await page.keyboard.press('1');await page.waitForFunction(()=>Game.state==='playing');
  check('Both rewards finish and trap stays in world',await page.evaluate(()=>Game.pickups.some(p=>p.type==='chest'&&p.value===2&&p.alive)));
  for(const theme of ['village','mine','hell','frost','marsh','forest','clock','court']){
   await page.evaluate(theme=>{Game.state='menu';Game.runSeed=1820182;Game.loadLevel(theme);},theme);await settle();
   await page.evaluate(()=>{Game.state='playing';Game.player.invuln=999;Game.spawnTimer=999;Game.enemies=[];Game.pickups=[];Game.levelTime=1;Game.camera.x=Game.player.x-480;Game.camera.y=Game.player.y-270;});
   await page.waitForTimeout(100);const file=`output/playwright/v120/v182-${theme}-roads.png`;await page.screenshot({path:file});screenshots.push(file);
   check(theme+': scene ground regenerates successfully',await page.evaluate(()=>Game.groundTileCache.width>0&&Game.mapData.props.length>0));
  }
  check('No browser runtime errors',errors.length===0);return{passed:true,checks,errors,screenshots};
 }catch(e){return{passed:false,failure:String(e.stack||e),checks,errors,screenshots};}
 finally{await page.evaluate(()=>Game.state='menu');}
}
