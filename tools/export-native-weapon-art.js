async page=>{
 await page.goto('http://127.0.0.1:8763/index.html');await page.waitForFunction(()=>Game.state==='menu',null,{timeout:65000});
 return await page.evaluate(()=>['sword','shield','bow','fireball','hammer','scythe','war_hammer_double','flail','mace_fire','axe','void_blade','sword_wind','hammer_meteor','knife','soul_hunter'].map(id=>{
  const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');ctx.translate(64,64);if(['hammer','scythe','war_hammer_double','flail','mace_fire','axe','void_blade','sword_wind','hammer_meteor'].includes(id))ctx.rotate(-Math.PI/4);if(!Game.drawRepresentativeWeapon(ctx,id,72))throw Error(id);return {id,png:c.toDataURL('image/png').split(',')[1]};
 }));
}
