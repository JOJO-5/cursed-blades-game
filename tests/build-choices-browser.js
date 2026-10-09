async page=>{
 const url=page.url(),checks=[],errors=[],screenshots=[];page.on('pageerror',e=>errors.push(String(e)));
 const check=(name,ok)=>{checks.push({name,passed:!!ok});if(!ok)throw Error(name);};
 const click=async r=>{const pos=await page.evaluate(r=>{const b=Game.canvas.getBoundingClientRect(),x=r.x+r.w/2,y=r.y+r.h/2;return Game._rotate90?{x:b.x+(1-y/540)*b.width,y:b.y+x/960*b.height}:{x:b.x+x/960*b.width,y:b.y+y/540*b.height};},r);await page.mouse.click(pos.x,pos.y);await page.waitForTimeout(120);};
 const story=async()=>{for(let i=0;i<40;i++){if(await page.evaluate(()=>Game.state!=='story'))return;await page.waitForTimeout(330);await page.keyboard.press('Space');}};
 const shot=async name=>{const file=`output/playwright/v120/v190-${name}.png`;await page.screenshot({path:file});screenshots.push(file);};
 try{
  await page.goto(url);await page.waitForFunction(()=>typeof Game!=='undefined'&&Game.state==='menu');
  await page.evaluate(()=>{Game.selectedCharacter='warden';Game.selectedExpedition='campaign';Game.selectedRunProfile='normal';Game.startNewGame();});await story();
  await page.evaluate(()=>{Game.player.level=3;Game.player.invuln=999;Game.spawnTimer=999;Game.enemies=[];Game.pickups=[];Game.onLevelUp();});
  check('First eligible level presents two exclusive blade styles',await page.evaluate(()=>Game.upgradeChoices.filter(c=>c.type==='branch').length===2));await shot('desktop-choice');
  const oldKeys=await page.evaluate(()=>Game.upgradeChoices.map(c=>Game.choiceKey(c)));
  await page.keyboard.press('r');await page.waitForFunction(()=>Game.buildControl.rerolls===1);check('Keyboard reroll consumes one charge and replaces all candidates',await page.evaluate(keys=>Game.buildControl.rerolls===1&&Game.upgradeChoices.every(c=>!keys.includes(Game.choiceKey(c))),oldKeys));
  const keys=await page.evaluate(()=>Game.upgradeChoices.map(c=>Game.choiceKey(c)));
  await page.reload();await page.waitForFunction(()=>Game.state==='menu');await click(await page.evaluate(()=>Game.getMenuLayout().continue));
  check('Real refresh resumes exact pending reward and budget',await page.evaluate(keys=>Game.state==='levelup'&&Game.buildControl.rerolls===1&&JSON.stringify(Game.upgradeChoices.map(c=>Game.choiceKey(c)))===JSON.stringify(keys),keys));
  await page.keyboard.press('x');await page.waitForFunction(()=>Game._banishMode);await click(await page.evaluate(()=>Game.getChoiceLayout(Game.upgradeChoices.length).cards[0]));
  check('Banish consumes charge and removes selected candidate',await page.evaluate(()=>Game.buildControl.banishes===0&&!Game.upgradeChoices.some(c=>Game.buildControl.banished.includes(Game.choiceKey(c)))));
  const coins=await page.evaluate(()=>Game.runCoins);await page.keyboard.press('f');await page.waitForFunction(()=>Game.state==='playing');check('Skip grants currency and resumes the actual game',await page.evaluate(n=>Game.state==='playing'&&Game.runCoins===n+2,coins));
  for(const size of [{width:390,height:844},{width:320,height:568},{width:844,height:390}]){
   await page.setViewportSize(size);await page.evaluate(()=>{Game.resizeCanvas();Game.player.level=3;Game.onLevelUp();});
   check(`Choice cards and tools fit ${size.width}x${size.height}`,await page.evaluate(()=>{const v=Game.getVisibleCanvasRect(),cards=Game.getChoiceLayout(Game.upgradeChoices.length).cards,tools=Game.getChoiceToolsLayout();return [...cards,...tools].every(r=>r.x>=v.x&&r.y>=v.y&&r.x+r.w<=v.x+v.w&&r.y+r.h<=v.y+v.h)&&tools[0].y>=Math.max(...cards.map(c=>c.y+c.h))+12;}));await shot(`choice-${size.width}`);
   await click(await page.evaluate(()=>Game.getChoiceToolsLayout().find(r=>r.key==='skip')));check(`Visible skip button works at ${size.width}`,await page.evaluate(()=>Game.state==='playing'));
  }
  await page.setViewportSize({width:1280,height:720});await page.evaluate(()=>Game.resizeCanvas());
  for(const id of ['sword_close','sword_far','hammer_fissure','hammer_recoil','bow_piercing','bow_bounce','imp_lone','imp_swarm']){
   await page.evaluate(id=>{Game.state='paused';const d=WeaponBranches[id];Game.player.weapons=[new Weapon(d.base,CONFIG.WEAPONS[d.base])];Game.player.level=3;Game.player.branchGuard=0;Game.player.branchGuardTime=0;Game.player.invuln=999;Game.player.x=Game.levelData.mapW*24;Game.player.y=Game.levelData.mapH*24;Game.enemies=[];Game.pickups=[];Game.projectiles=[];Game.minions=[];Game.branchEffects=[];Game.spawnTimer=999;Game.onLevelUp();},id);
   const index=await page.evaluate(id=>Game.upgradeChoices.findIndex(c=>c.branchId===id),id);await click(await page.evaluate(i=>Game.getChoiceLayout(Game.upgradeChoices.length).cards[i],index));
   check(id+': card selection applies actual branch',await page.evaluate(id=>Game.state==='playing'&&Game.player.weapons[0].branch===id,id));
   await page.evaluate(()=>{const p=Game.player,w=p.weapons[0];w.angle=0;const x=p.x+(w.def.type==='orbit'?w.getRange():90),e=new Enemy('skeleton',x,p.y);e.speed=0;e.hp=e.maxHp=10000;e.damage=0;Game.enemies=[e];Game._branchTarget=e;});
   await page.waitForFunction(()=>Game._branchTarget.hp<10000,null,{timeout:6000});if(id==='imp_swarm')await page.waitForTimeout(3800);if(id==='sword_far')await page.waitForTimeout(2900);check(id+': actual main loop damages a target',await page.evaluate(()=>Game._branchTarget.hp<10000));await shot(id);
  }
  await page.evaluate(()=>{Game.state='paused';Game.player.weapons=[new Weapon('sword',CONFIG.WEAPONS.sword)];Game.chooseWeaponBranch(Game.player.weapons[0],'sword_far');Game.player.upgradeLevels.attackspeed=3;Game.state='chestReward';Game.generateChestReward(true);});
  const evolution=await page.evaluate(()=>Game.chestRewardChoices.findIndex(c=>c.type==='evolution'));await click(await page.evaluate(i=>Game.getChoiceLayout(Game.chestRewardChoices.length).cards[i],evolution));
  check('Actual chest evolution retains blade style',await page.evaluate(()=>Game.player.weapons[0].id==='sword_wind'&&Game.player.weapons[0].branch==='sword_far'));
  await page.evaluate(()=>{Game.state='paused';Game.saveProgress();});await page.reload();await page.waitForFunction(()=>Game.state==='menu');await click(await page.evaluate(()=>Game.getMenuLayout().continue));
  check('Evolved branch and budget survive real reload',await page.evaluate(()=>Game.player.weapons[0].branch==='sword_far'&&Game.buildControl.rerolls===1&&Game.buildControl.banishes===0));
  check('No browser runtime errors',errors.length===0);return{passed:true,checks,errors,screenshots};
 }catch(e){await shot('failure');return{passed:false,failure:String(e.stack||e),checks,errors,screenshots};}
 finally{await page.setViewportSize({width:1280,height:720});await page.evaluate(()=>{Game.resizeCanvas();Game.state='menu';});}
}
