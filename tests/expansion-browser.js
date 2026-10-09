async page => {
  const url=page.url(),checks=[],errors=[],screenshots=[];
  const check=(name,ok)=>{checks.push({name,passed:!!ok,mode:'actual menu/keyboard/touch + accelerated weather and boss scenarios'});if(!ok)throw new Error(name);};
  const click=async(p,r,touch=false)=>{const pos=await p.evaluate(r=>{const b=Game.canvas.getBoundingClientRect();return{x:b.x+(r.x+r.w/2)/960*b.width,y:b.y+(r.y+r.h/2)/540*b.height};},r);if(touch)await p.touchscreen.tap(pos.x,pos.y);else await p.mouse.click(pos.x,pos.y);await p.waitForTimeout(60);};
  const story=async p=>{for(let i=0;i<20;i++){if(await p.evaluate(()=>Game.state!=='story'))return;await p.waitForFunction(()=>Game.storyTimer>.31);await p.keyboard.press('Space');await p.waitForTimeout(90);}};
  const shot=async(p,name)=>{const path=`output/playwright/v120/${name}.png`;await p.screenshot({path});screenshots.push(path);};
  for(const hero of ['warden','ranger','arcanist']){
    const context=await page.context().browser().newContext({viewport:{width:1280,height:720}}),p=await context.newPage();p.on('pageerror',e=>errors.push(e.stack||String(e)));
    try{
      await p.goto(url);await p.waitForFunction(()=>Game.state==='menu',null,{timeout:65000});
      await click(p,await p.evaluate(id=>Game.getMenuLayout().characters.find(r=>r.id===id),hero));
      check(`${hero}: menu character selection`,await p.evaluate(id=>Game.selectedCharacter===id,hero));
      await shot(p,`menu-${hero}`);await click(p,await p.evaluate(()=>Game.getMenuLayout().start));await story(p);
      check(`${hero}: selected starting weapon and full health`,await p.evaluate(id=>Game.player.characterId===id&&Game.player.weapons[0].id===CONFIG.CHARACTERS[id].weapon&&Game.player.hp===Game.player.getMaxHp(),hero));
      for(const [key,direction,flip] of [['KeyW','north',false],['KeyA','east',true],['KeyD','east',false],['KeyS','south',false]]){
        await p.keyboard.down(key);await p.waitForTimeout(180);
        const moving=await p.evaluate(()=>{const a=Game.player,draw=Game.ctx.drawImage,heights=[];Game.ctx.drawImage=function(...args){heights.push(args.at(-1));return draw.apply(this,args);};try{a.draw(Game.ctx);}finally{Game.ctx.drawImage=draw;}return{pose:a.getSpritePose(),height:heights[0]};});
        check(`${hero}/${key}: directional walk at 64 visible pixels`,moving.pose.direction===direction&&moving.pose.flip===flip&&Math.abs(moving.height-64)<.1);
        await shot(p,`${hero}-${key}`);await p.keyboard.up(key);await p.waitForTimeout(100);
        check(`${hero}/${key}: idle retains direction and size`,await p.evaluate(d=>{const a=Game.player,s=a.getSpritePose();return s.direction===d&&s.frame===0&&s.height===64;},direction));
      }
      const stats=await p.evaluate(()=>JSON.stringify(Game.player.stats));await p.evaluate(()=>Game.saveProgress());await p.reload();await p.waitForFunction(()=>Game.state==='menu',null,{timeout:65000});await click(p,await p.evaluate(()=>Game.getMenuLayout().continue));
      check(`${hero}: saved character and perks survive refresh once`,await p.evaluate(({hero,stats})=>Game.player.characterId===hero&&JSON.stringify(Game.player.stats)===stats,{hero,stats}));
      await p.evaluate(()=>{Game.player.invuln=0;Game.player.takeDamage(9999);});await p.waitForFunction(()=>Game.state==='gameover');
      await click(p,await p.evaluate(()=>Game.getGameOverButtons().restart));await story(p);
      check(`${hero}: death restart after refresh keeps character and starting perks`,await p.evaluate(({hero,stats})=>Game.player.characterId===hero&&JSON.stringify(Game.player.stats)===stats,{hero,stats}));
    }catch(e){await shot(p,`expansion-${hero}-failure`).catch(()=>{});return{passed:false,checks,errors,screenshots,failure:String(e.stack||e)};}finally{await context.close();}
  }
  for(const theme of ['frost','marsh']){
    const context=await page.context().browser().newContext({viewport:{width:1280,height:720}}),p=await context.newPage();p.on('pageerror',e=>errors.push(e.stack||String(e)));
    try{
      await p.goto(url);await p.waitForFunction(()=>Game.state==='menu',null,{timeout:65000});await click(p,await p.evaluate(id=>Game.getMenuLayout().expeditions.find(r=>r.id===id),theme));await click(p,await p.evaluate(()=>Game.getMenuLayout().start));await story(p);
      check(`${theme}: selectable independent map with clear spawn`,await p.evaluate(t=>Game.levelData.theme===t&&Game.levelData.challenge&&!Game.isCircleBlocked(Game.player.x,Game.player.y,Game.player.radius),theme));await shot(p,`map-${theme}`);
      const weather=await p.evaluate(()=>{Game.levelTime=Game.levelData.theme==='frost'?33:25;const z=Game.trialZones[0];Game.player.x=z.x;Game.player.y=z.y;Game.player.invuln=0;const hp=Game.player.hp;Game.updateThemeHazards(.1);return{speed:Game.environmentSpeedMult,hurt:Game.player.hp<hp};});
      check(`${theme}: advertised weather affects exposed player`,weather.speed<1&&(theme==='frost'||weather.hurt));await shot(p,`weather-${theme}`);
      const safe=await p.evaluate(()=>{const s=Game.levelEncounters[0];s.status='complete';Game.player.x=s.x;Game.player.y=s.y;Game.player.invuln=0;const hp=Game.player.hp;Game.updateThemeHazards(1);Game.saveProgress();return Game.environmentSpeedMult===1&&Game.player.hp===hp;});check(`${theme}: completed sanctuary prevents weather penalty`,safe);
      await p.reload();await p.waitForFunction(()=>Game.state==='menu',null,{timeout:65000});await click(p,await p.evaluate(()=>Game.getMenuLayout().continue));check(`${theme}: map, sanctuary and complete history survive reload`,await p.evaluate(t=>Game.levelData.theme===t&&Game.levelEncounters[0].status==='complete'&&Game.getRunSummary().complete,theme));
      await p.evaluate(()=>{Game.player.invuln=0;Game.player.takeDamage(9999);});await p.waitForFunction(()=>Game.state==='gameover');
      await click(p,await p.evaluate(()=>Game.getGameOverButtons().restart));await story(p);
      check(`${theme}: death restart after refresh keeps independent expedition`,await p.evaluate(t=>Game.levelData.theme===t&&Game.levelData.challenge&&Game.levelEncounters[0].status!=='complete',theme));
      await p.evaluate(()=>{Game.levelTime=Game.levelData.bossSpawnTime+.1;Game.player.invuln=999;Game.enemies=[];Game.updatePhase(.1);});await story(p);
      await p.evaluate(()=>{const b=Game.enemies.find(e=>e.isBoss);b.hp=1;const w=Game.player.weapons[0];b.x=Game.player.x+Math.cos(w.angle)*w.getRange();b.y=Game.player.y+Math.sin(w.angle)*w.getRange();});
      await p.waitForFunction(()=>Game.bossDefeated,null,{timeout:15000});
      // A retrieved chest may introduce a mimic before the actual ending story.
      for(let i=0;i<375;i++){
        const s=await p.evaluate(()=>Game.state);if(s==='victory')break;
        if(s==='bossOathChoice')await p.keyboard.press('Digit2');
        if(s==='story')await story(p);
        if(['levelup','chestReward'].includes(s)){
          const key=await p.evaluate(()=>Game._weaponReplacement?'Escape':'Digit'+(Math.max(0,(Game.state==='levelup'?Game.upgradeChoices:Game.chestRewardChoices).findIndex(c=>!c.weaponId&&c.type!=='evolution'))+1));
          await p.keyboard.press(key);
        }
        await p.waitForTimeout(80);
      }
      await p.waitForFunction(()=>Game.state==='victory');
      check(`${theme}: boss combat finishes expedition without campaign transition`,await p.evaluate(t=>Game.levelData.theme===t&&Game.getRunSummary().levels.length===1&&Game.getRunSummary().levels[0].completed,theme));await shot(p,`victory-${theme}`);
    }catch(e){await shot(p,`expansion-${theme}-failure`).catch(()=>{});return{passed:false,checks,errors,screenshots,failure:String(e.stack||e)};}finally{await context.close();}
  }
  const context=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),p=await context.newPage();p.on('pageerror',e=>errors.push(e.stack||String(e)));
  try{await p.goto(url);await p.waitForFunction(()=>Game.state==='menu',null,{timeout:65000});
    check('Portrait menu cards and all actions stay within visible canvas',await p.evaluate(()=>{const l=Game.getMenuLayout(),v=l.visible;return [...l.characters,...l.expeditions,l.start,l.settings].every(r=>r.x>=v.x&&r.x+r.w<=v.x+v.w&&r.y>=v.y&&r.y+r.h<=v.y+v.h);}));
    await click(p,await p.evaluate(()=>Game.getMenuLayout().characters[2]),true);await click(p,await p.evaluate(()=>Game.getMenuLayout().expeditions[1]),true);
    check('Portrait touch chooses sorcerer and frost expedition',await p.evaluate(()=>Game.selectedCharacter==='arcanist'&&Game.selectedExpedition==='frost'));await shot(p,'mobile-selection');
  }finally{await context.close();}
  check('Expansion runtime has no JavaScript errors',errors.length===0);
  return{passed:true,checks,errors,screenshots};
}
