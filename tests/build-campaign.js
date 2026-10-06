async page => {
  const checks=[],screenshots=[],errors=[],url=page.url();
  const check=(name,condition)=>{checks.push({name,passed:!!condition,mode:'accelerated timer/HP + actual weapon combat + keyboard'});if(!condition)throw new Error(name);};
  for(const profile of [{id:'orbit',weapon:'sword',upgrades:['rotatespeed','orbit_mastery']},{id:'projectile',weapon:'bow',upgrades:['projspeed','projectile_barrage']},{id:'summon',weapon:'shadow_imp',upgrades:['summoner_pact']}]) {
    const context=await page.context().browser().newContext({viewport:{width:1280,height:720}});
    const p=await context.newPage();p.on('pageerror',e=>errors.push(String(e)));
    const story=async()=>{
      for(let i=0;i<30;i++) {
        if(await p.evaluate(()=>Game.state!=='story'))return;
        await p.waitForFunction(()=>Game.storyTimer>.31);await p.keyboard.press('Space');await p.waitForTimeout(70);
      }
      throw new Error('Story did not advance');
    };
    const rewards=async()=>{
      const choice=await p.evaluate(()=>{
        if(Game._weaponReplacement)return {replace:true};
        const c=Game.state==='levelup'?Game.upgradeChoices:Game.chestRewardChoices;
        return {index:Math.max(0,c.findIndex(u=>!u.weaponId&&u.type!=='evolution'))};
      });
      await p.keyboard.press(choice.replace?'Escape':`Digit${choice.index+1}`);
    };
    try {
      await p.goto(url);await p.waitForFunction(()=>typeof Game!=='undefined'&&Game.state==='menu');
      const r=await p.evaluate(()=>Game.getMenuLayout().start),b=await p.locator('canvas').boundingBox();
      await p.mouse.click(b.x+(r.x+r.w/2)/960*b.width,b.y+(r.y+r.h/2)/540*b.height);
      await p.waitForFunction(()=>!['menu','loading'].includes(Game.state));await story();
      await p.evaluate(profile=>{
        Game.player.weapons=[new Weapon(profile.weapon,CONFIG.WEAPONS[profile.weapon])];
        for(const id of profile.upgrades){const u=CONFIG.UPGRADES.find(u=>u.id===id);u.apply(Game.player);Game.player.upgradeLevels[id]=1;}
        Game.player.invuln=999;
      },profile);
      for(const theme of ['village','mine','hell']) {
        check(`${profile.id}/${theme}: normal transition reached biome`,await p.evaluate(t=>Game.levelData.theme===t,theme));
        await p.evaluate(()=>{Game.levelTime=Game.levelData.bossSpawnTime-.1;Game.player.invuln=999;Game.pickups=[];Game.enemies=[];});
        for(let i=0;i<140;i++) {
          const s=await p.evaluate(()=>({boss:Game.bossSpawned,state:Game.state}));
          if(s.boss)break;if(s.state==='levelup'||s.state==='chestReward')await rewards();await p.waitForTimeout(80);
        }
        await story();await p.waitForFunction(()=>Game.state==='playing');
        await p.evaluate(()=>{
          const b=Game.enemies.find(e=>e.isBoss&&e.alive),w=Game.player.weapons[0];
          Game.enemies=[b];b.hp=1;b.x=Game.player.x+Math.cos(w.angle)*Math.min(w.getRange(),100);b.y=Game.player.y+Math.sin(w.angle)*Math.min(w.getRange(),100);
          Game.spawnTimer=999;Game.player.stats.regenBonus=0;
        });
        await p.waitForFunction(()=>Game.bossDefeated,null,{timeout:18000});
        check(`${profile.id}/${theme}: build deals boss finishing damage`,await p.evaluate(()=>Game.bossDefeated&&Game.bossDefeatedGraceTimer>0));
        const path=`output/playwright/v080/campaign-${profile.id}-${theme}.png`;await p.screenshot({path});screenshots.push(path);
        for(let i=0;i<180;i++) {
          const s=await p.evaluate(()=>Game.state);
          if(s==='story'||s==='victory')break;
          if(s==='levelup'||s==='chestReward')await rewards();await p.waitForTimeout(80);
        }
        await story();if(theme!=='hell')await story();
      }
      await p.waitForFunction(()=>Game.state==='victory');
      check(`${profile.id}: full accelerated campaign reaches victory`,await p.evaluate(()=>['village','mine','hell'].every(t=>Game.meta.levelsCompleted[t])));
    } catch(error){await p.screenshot({path:`output/playwright/v080/campaign-${profile.id}-failure.png`}).catch(()=>{});return {passed:false,checks,screenshots,errors,failure:String(error.stack||error)};}
    finally {await context.close();}
  }
  check('Three build campaigns have no JavaScript errors',errors.length===0);
  return {passed:true,checks,screenshots,errors};
}
