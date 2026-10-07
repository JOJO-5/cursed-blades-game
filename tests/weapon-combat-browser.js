async page => {
 await page.route('**/*',r=>r.continue());await page.reload();await page.waitForFunction(()=>Game.state==='menu',null,{timeout:65000});
 const r=await page.evaluate(()=>Game.getMenuLayout().start),b=await page.locator('canvas').boundingBox();await page.mouse.click(b.x+(r.x+r.w/2)/960*b.width,b.y+(r.y+r.h/2)/540*b.height);
 await page.waitForFunction(()=>!["menu","loading"].includes(Game.state));for(let i=0;i<16;i++){if(await page.evaluate(()=>Game.state!=='story'))break;await page.waitForFunction(()=>Game.storyTimer>.31);await page.keyboard.press('Space');await page.waitForTimeout(70)}
 await page.waitForFunction(()=>Game.state==='playing');const results=[],errors=[];page.on('pageerror',e=>errors.push(String(e)));
 for(const id of await page.evaluate(()=>Object.keys(CONFIG.WEAPONS))){
  await page.evaluate(id=>{const p=Game.player,d=CONFIG.WEAPONS[id];p.invuln=999;p.weapons=[];p.addWeapon(id);p.weapons[0].angle=0;Game.projectiles=[];Game.minions=[];Game.particles=[];Game.enemies=[];Game.levelTime=0;Game.spawnTimer=999;
   const x=p.x+(d.type==='orbit'?p.weapons[0].getRange():d.type==='aura'?50:110),y=p.y;const e=new Enemy('skeleton',x,y);e.hp=e.maxHp=10000;e.speed=0;e.def={...e.def,speed:0};Game.enemies.push(e);
  },id);
  await page.waitForTimeout(900);
  results.push(await page.evaluate(id=>({id,state:Game.state,damage:10000-Game.enemies[0].hp,finite:Game.projectiles.every(q=>[q.x,q.y,q.vx,q.vy].every(Number.isFinite)),summons:Game.minions.length}),id));
  if(['hammer','hammer_meteor','poison_aura','holy_cross','scythe','blade_dual'].includes(id))await page.screenshot({path:'output/playwright/v120/weapon-live-'+id+'.png'});
 }
 await page.evaluate(()=>{Game.state='menu';Game.enemies=[];Game.projectiles=[];Game.minions=[];});const checks=results.map(r=>({name:r.id+': real frames produce damage or summons and finite projectiles',passed:r.state==='playing'&&r.finite&&(r.damage>0||r.summons>0),evidence:r,mode:'stationary durable target fixture'}));return {passed:checks.every(c=>c.passed)&&!errors.length,checks,errors,screenshots:['hammer','hammer_meteor','poison_aura','holy_cross','scythe','blade_dual'].map(id=>'weapon-live-'+id+'.png')};
}
