async page=>{
  const checks=[],errors=[],screenshots=[],url=page.url();page.on('pageerror',e=>errors.push(String(e)));
  const check=(name,ok)=>{checks.push({name,passed:!!ok,mode:'real Q / pause / refresh / emulated touch'});if(!ok)throw Error(name);};
  const click=async r=>{const b=await page.locator('canvas').boundingBox();await page.mouse.click(b.x+(r.x+r.w/2)/960*b.width,b.y+(r.y+r.h/2)/540*b.height);await page.waitForTimeout(100);};
  const settle=async()=>{for(let i=0;i<30;i++){if(await page.evaluate(()=>Game.state!=='story'))return;await page.waitForTimeout(340);await page.keyboard.press('Space');}};
  try{
    await page.reload();await page.waitForFunction(()=>Game.state==='menu',null,{timeout:65000});
    for(const hero of ['warden','ranger','arcanist']){
      await page.evaluate(()=>{Game.state='menu';Game.selectedExpedition='campaign';});await click(await page.evaluate(h=>Game.getMenuLayout().characters.find(r=>r.id===h),hero));
      await click(await page.evaluate(()=>Game.getMenuLayout().start));await page.waitForFunction(()=>Game.state!=='menu');await settle();await page.waitForFunction(()=>Game.state==='playing');
      await page.evaluate(()=>{Game.player.invuln=999;Game.enemies=[];Game.pickups=[];Game.spawnTimer=999;});
      await page.keyboard.press('KeyQ');await page.waitForFunction(()=>Game.player.activeSkill.used===1);
      check(`${hero}: Q activates own skill`,await page.evaluate(h=>Game.player.characterId===h&&Game.player.activeSkill.cooldown>0,hero));
      if(hero==='warden'){check('Live guard blocks real damage',await page.evaluate(()=>{Game.player.invuln=0;const h=Game.player.hp;Game.player.takeDamage(30);return Game.player.hp===h&&Game.player.activeSkill.blocked;}));}
      if(hero==='ranger')check('Volley projectiles remain finite',await page.evaluate(()=>Game.projectiles.length>=3&&Game.projectiles.every(p=>Number.isFinite(p.vx+p.vy+p.damage))));
      if(hero==='arcanist'){check('Arcane skill starts with a charge',await page.evaluate(()=>Game.player.activeSkill.charge>0));await page.waitForFunction(()=>Game.player.activeSkill.burst>0);check('Charge releases once',await page.evaluate(()=>Game.player.activeSkill.charge===0));}
      const file=`output/playwright/v120/skill-${hero}.png`;await page.screenshot({path:file});screenshots.push(file);
      await page.keyboard.press('Escape');await page.waitForFunction(()=>Game.state==='paused');const cooldown=await page.evaluate(()=>Game.player.activeSkill.cooldown);await page.waitForTimeout(250);
      check(`${hero}: pause freezes cooldown`,await page.evaluate(c=>Game.player.activeSkill.cooldown===c,cooldown));
      await page.evaluate(()=>Game.saveProgress());await page.reload();await page.waitForFunction(()=>Game.state==='menu');await click(await page.evaluate(()=>Game.getMenuLayout().continue));await page.waitForFunction(()=>Game.state==='playing');
      check(`${hero}: refresh retains cooldown`,await page.evaluate(c=>Game.player.activeSkill.cooldown>c-1&&Game.player.activeSkill.cooldown<=c,cooldown));
      await page.keyboard.press('KeyQ');await page.waitForTimeout(100);check(`${hero}: reload cannot recast immediately`,await page.evaluate(()=>Game.player.activeSkill.used===1));
    }
    const context=await page.context().browser().newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
    try{const m=await context.newPage();m.on('pageerror',e=>errors.push(String(e)));await m.goto(url);await m.waitForFunction(()=>typeof Game!=='undefined'&&Game.state==='menu',null,{timeout:65000});await m.evaluate(()=>{Game.startNewGame();Game.state='playing';Game.player.invuln=999;});
      const r=await m.evaluate(()=>{const r=Game.getHeroSkillButton(),b=Game.canvas.getBoundingClientRect();return{x:b.x+(r.x+r.w/2)/960*b.width,y:b.y+(r.y+r.h/2)/540*b.height};});await m.touchscreen.tap(r.x,r.y);await m.waitForFunction(()=>Game.player.activeSkill.used===1);
      check('Native touch activates skill independently of dash',await m.evaluate(()=>Game.player.dashCooldown===0&&!Input.joystick.active));
      check('Skill button stays in visible mobile area',await m.evaluate(()=>{const r=Game.getHeroSkillButton(),v=Game.getVisibleCanvasRect();return r.x>=v.x&&r.y>=v.y&&r.x+r.w<=v.x+v.w&&r.y+r.h<=v.y+v.h;}));
    }finally{await context.close();}
    check('Skill flows have no runtime errors',errors.length===0);return {passed:true,checks,errors,screenshots};
  }catch(e){return {passed:false,failure:String(e.stack||e),checks,errors,screenshots};}
  finally{await page.evaluate(()=>Game.state='menu');}
}
