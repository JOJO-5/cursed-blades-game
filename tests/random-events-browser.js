async page=>{
  const checks=[],errors=[],screenshots=[];page.on('pageerror',e=>errors.push(String(e)));
  const check=(name,ok)=>{checks.push({name,passed:!!ok,mode:'seeded event / real keys / accelerated targets'});if(!ok)throw Error(name);};
  const settle=async()=>{for(let i=0;i<30;i++){const s=await page.evaluate(()=>Game.state);if(s==='story'){await page.waitForTimeout(340);await page.keyboard.press('Space');}else if(['levelup','chestReward'].includes(s)){await page.keyboard.press('Digit1');await page.waitForTimeout(80);}else return;}};
  try{
    await page.reload();await page.waitForFunction(()=>Game.state==='menu',null,{timeout:65000});
    for(const kind of ['merchant','altar','rescue','bounty']){
      await page.evaluate(kind=>{Game.state='menu';Game.startNewGame();for(let seed=1;seed<50;seed++){Game.runSeed=seed;Game.loadLevel('village');if(Game.randomEvents[0].kind===kind)break;}const s=Game.randomEvents[0];s.status='ready';Game.player.x=s.x;Game.player.y=s.y;Game.player.invuln=999;Game.runCoins=20;Game.enemies=[];Game.pickups=[];Game.state='playing';},kind);
      await page.keyboard.press('KeyE');await page.waitForFunction(k=>Game.state===(k==='merchant'?'journeyShop':'eventChoice'),kind);
      const f=`output/playwright/v120/event-${kind}.png`;await page.screenshot({path:f});screenshots.push(f);
      const before=await page.evaluate(()=>({hp:Game.player.hp,coins:Game.runCoins,level:Game.player.weapons[0].level,time:Game.levelTime}));await page.waitForTimeout(150);
      check(`${kind}: offer freezes time`,await page.evaluate(t=>Game.levelTime===t,before.time));
      if(kind==='merchant'){await page.keyboard.press('Digit2');await page.waitForFunction(()=>Game.journeyStore.offers[1].sold);await page.keyboard.press('Escape');}else await page.keyboard.press('Digit1');await page.waitForFunction(()=>Game.state==='playing');
      if(['rescue','bounty'].includes(kind)){
        await page.evaluate(()=>Game.saveProgress());await page.reload();await page.waitForFunction(()=>Game.state==='menu');await page.evaluate(()=>Game.loadAndContinue());await settle();
        check(`${kind}: guards restore after refresh`,await page.evaluate(()=>Game.randomEvents[0].status==='active'&&Game.enemies.some(e=>e.eventId)));
        for(let i=0;i<50;i++){await settle();await page.evaluate(()=>{Game.player.invuln=999;const w=Game.player.weapons[0];for(const e of Game.enemies.filter(e=>e.eventId&&e.alive)){e.hp=1;e.x=Game.player.x+Math.cos(w.angle)*w.getRange();e.y=Game.player.y+Math.sin(w.angle)*w.getRange();}});await page.waitForTimeout(100);if(await page.evaluate(()=>!Game.enemies.some(e=>e.eventId&&e.alive)))break;}
        for(let i=0;i<130;i++){if(await page.evaluate(()=>Game.randomEvents[0].status==='complete'))break;await settle();await page.waitForTimeout(100);}await settle();
      }
      check(`${kind}: selected outcome applies`,await page.evaluate(({kind,before})=>{const s=Game.randomEvents[0];return s.status==='complete'&&s.claimed&&(kind==='merchant'?Game.runCoins===before.coins-10&&Game.player.weapons[0].level===before.level+1:kind==='altar'?Game.player.hp<before.hp:true);},{kind,before}));
      await page.evaluate(()=>Game.saveProgress());await page.reload();await page.waitForFunction(()=>Game.state==='menu');await page.evaluate(()=>Game.loadAndContinue());await settle();
      check(`${kind}: completed event survives reload`,await page.evaluate(()=>Game.randomEvents[0].status==='complete'&&Game.randomEvents[0].claimed));
    }
    check('Generated NPCs load with transparent edges',await page.evaluate(()=>['props/merchant_v150','props/traveler_v150'].every(k=>{const im=Assets.get(k),c=document.createElement('canvas');if(!im?.complete)return false;c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);return x.getImageData(0,0,1,1).data[3]===0&&x.getImageData(im.width>>1,im.height>>1,1,1).data[3]>0;}))); 
    check('Events produce no runtime errors',errors.length===0);return {passed:true,checks,errors,screenshots};
  }catch(e){return {passed:false,failure:String(e.stack||e),checks,errors,screenshots};}
  finally{await page.evaluate(()=>Game.state='menu');}
}
