async page=>{
  const checks=[],screenshots=[],errors=[];page.on('pageerror',e=>errors.push(String(e)));
  const check=(name,ok)=>{checks.push({name,passed:!!ok,mode:'live boss / fixed-position fixture'});if(!ok)throw Error(name);};
  try{
    await page.reload();await page.waitForFunction(()=>Game.state==='menu',null,{timeout:65000});
    await page.evaluate(()=>{Game.startNewGame();Game.state='playing';Game.player.invuln=999;});
    for(const type of ['boss','bossSpider','bossDragon','frostWarden','tideKeeper'])for(const index of [0,1]){
      const r=await page.evaluate(({type,index})=>{const p=Game.player;p.x=900;p.y=800;const b=new Enemy(type,650,800);b.hp=b.maxHp=999999;b.signatureIndex=index;Game.collisionProps=[];Game.enemies=[b];Game.bossSpawned=true;Game.bossDefeated=false;Game.levelTime=0;Game.spawnTimer=999;Game.pickups=[];b.pickNextAbility(p,250);return {ability:b.currentAbility,dir:b.abilityDir};},{type,index});
      check(`${type}/${index}: own signature selected`,await page.evaluate(({type,r})=>BossCombat.profiles[type].includes(r.ability),{type,r}));
      await page.waitForTimeout(180);
      check(`${type}/${index}: warning holds locked aim`,await page.evaluate(r=>Game.enemies[0].abilityDir===r.dir&&Game.enemies[0].signatureEffects.every(e=>e.warn>0),r));
      await page.waitForFunction(()=>Game.enemies[0].bossState==='attack',null,{timeout:4000});
      check(`${type}/${index}: warning becomes live attack`,await page.evaluate(()=>Game.enemies[0].signatureEffects.some(e=>e.warn<=0)));
      const file=`output/playwright/v120/signature-${type}-${index}.png`;await page.screenshot({path:file});screenshots.push(file);
    }
    check('Signature rendering has no JavaScript errors',errors.length===0);
    return {passed:true,checks,screenshots,errors};
  }catch(e){return {passed:false,failure:String(e.stack||e),checks,screenshots,errors};}
  finally{await page.evaluate(()=>{Game.state='menu';Game.enemies=[];});}
}
