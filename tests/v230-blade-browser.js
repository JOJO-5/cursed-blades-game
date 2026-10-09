async page=>{
 const checks=[],errors=[],url=page.url(),screenshots=[];const check=(name,ok)=>{checks.push({name,passed:!!ok});if(!ok)throw Error(name);};
 for(const [width,height,rotated] of [[1280,720,false],[390,844,false],[390,844,true]]){
  const context=await page.context().browser().newContext({viewport:{width,height},hasTouch:true,isMobile:width===390}),p=await context.newPage();p.on('pageerror',e=>errors.push(String(e)));
  try{await p.goto(url);await p.waitForFunction(()=>typeof Game!=='undefined'&&Game.state==='menu',null,{timeout:65000});await p.evaluate(rotated=>{Game.forcedLandscape=rotated;Game.resizeCanvas();Game.startNewGame();},rotated);
   for(let i=0;i<50;i++){if(await p.evaluate(()=>Game.state!=='story'))break;await p.waitForTimeout(350);await p.keyboard.press('Enter');await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
   await p.waitForFunction(()=>Game.state==='playing');await p.evaluate(()=>{Game.enemies=[];Game.pickups=[];Game.spawnTimer=999;Game.player.invuln=999;Game.bladeStance.charge=60;});
   if(width===1280)await p.keyboard.press('KeyR');else{const q=await p.evaluate(()=>{const r=Game.getBladeStanceButtons()[0],b=Game.canvas.getBoundingClientRect(),x=r.x+r.w/2,y=r.y+r.h/2;return Game._rotate90?{x:b.x+(1-y/540)*b.width,y:b.y+x/960*b.height}:{x:b.x+x/960*b.width,y:b.y+y/540*b.height};});await p.touchscreen.tap(q.x,q.y);}
   await p.waitForFunction(()=>Game.bladeStance.mode==='outward');check(`Outward input works ${width} rotated=${rotated}`,await p.evaluate(()=>Game.bladeStance.charge===0&&!Input.joystick.active&&Game.player.dashCooldown===0));
   await p.evaluate(()=>{Game.bladeStance.remaining=0;Game.bladeStance.mode='';Game.bladeStance.charge=80;});
   if(width===1280)await p.keyboard.press('KeyF');else{const q=await p.evaluate(()=>{const r=Game.getBladeStanceButtons()[1],b=Game.canvas.getBoundingClientRect(),x=r.x+r.w/2,y=r.y+r.h/2;return Game._rotate90?{x:b.x+(1-y/540)*b.width,y:b.y+x/960*b.height}:{x:b.x+x/960*b.width,y:b.y+y/540*b.height};});await p.touchscreen.tap(q.x,q.y);}
   await p.waitForFunction(()=>Game.bladeStance.mode==='inward');check(`Inward input consumes charge ${width} rotated=${rotated}`,await p.evaluate(()=>Game.bladeStance.guard===36&&Game.bladeStance.charge===0));
   check(`Stance buttons fit ${width} rotated=${rotated}`,await p.evaluate(()=>{const v=Game.getVisibleCanvasRect(),q=Game.getHeroSkillButton();return Game.getBladeStanceButtons().every(r=>r.x>=v.x&&r.y>=v.y&&r.x+r.w<=v.x+v.w&&r.y+r.h<=v.y+v.h&&r.y>=q.y+q.h);}));
   const path=`output/playwright/v120/v230-blade-${width}-${rotated}.png`;await p.screenshot({path});screenshots.push(path);
  }catch(e){return {passed:false,failure:String(e),checks,errors,screenshots};}finally{await context.close();}
 }
 check('No blade runtime errors',errors.length===0);return {passed:true,checks,errors,screenshots};
}
