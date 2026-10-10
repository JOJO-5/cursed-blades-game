async page=>{
 const checks=[],errors=[],screenshots=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.reload();await page.waitForFunction(()=>Game.state==='menu',null,{timeout:65000});
 checks.push(...await page.evaluate(()=>{
  const checks=[];
  for(const [id,d] of Object.entries(CONFIG.WEAPONS)){
   const key=d.hudIcon||d.icon,img=Assets.get(key),loaded=!!img?.complete&&img.naturalWidth>0;
   const c=document.createElement('canvas');c.width=img?.width||1;c.height=img?.height||1;const ctx=c.getContext('2d');if(loaded)ctx.drawImage(img,0,0);
   const pixels=ctx.getImageData(0,0,c.width,c.height).data,crop=loaded?Game.getChoiceIconCrop(key,img):null;let opaque=0,lost=0;
   for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(pixels[(y*c.width+x)*4+3]>=24){opaque++;if(crop&&(x<crop.x||y<crop.y||x>=crop.x+crop.w||y>=crop.y+crop.h))lost++;}
   checks.push({name:id+': loaded equipment image retains every visible component',passed:loaded&&opaque>0&&lost===0,evidence:{key,opaque,lost,crop}});
   for(const size of [22,42,64]){
    const tile=document.createElement('canvas');tile.width=tile.height=96;const t=tile.getContext('2d');Game.drawChoiceIcon(t,key,48,48,size,size);
    const p=t.getImageData(0,0,96,96).data;let count=0,outside=0;for(let y=0;y<96;y++)for(let x=0;x<96;x++)if(p[(y*96+x)*4+3]>=24){count++;if(x<48-size/2||y<48-size/2||x>=48+size/2||y>=48+size/2)outside++;}
    checks.push({name:id+': whole icon fits '+size+'px HUD/card bounds',passed:count>=8&&outside===0&&t.globalAlpha===1&&t.getTransform().isIdentity,evidence:{count,outside}});
   }
  }
  const fragmented=document.createElement('canvas');fragmented.width=fragmented.height=64;const f=fragmented.getContext('2d');f.fillRect(20,25,12,25);f.fillRect(37,6,5,5);f.fillRect(6,48,4,4);
  const crop=Game.findCompleteOpaqueCrop(fragmented);checks.push({name:'Separated crystal and handle fragments stay inside the complete sprite crop',passed:crop.x<=6&&crop.y<=6&&crop.x+crop.w>=42&&crop.y+crop.h>=52,evidence:crop});
  return checks;
 }));
 const ids=await page.evaluate(()=>Object.keys(CONFIG.WEAPONS));
 for(let i=0;i<ids.length;i+=6){
  const group=ids.slice(i,i+6);
  await page.evaluate(ids=>{Game.startNewGame();Game.player.weapons=ids.map(id=>{const w=new Weapon(id,CONFIG.WEAPONS[id]);w.level=3;return w});Game.state='paused';Game.saveProgress();},group);
  await page.reload();await page.waitForFunction(()=>Game.state==='menu',null,{timeout:65000});
  checks.push(...await page.evaluate(ids=>{Game.loadAndContinue();Game.state='paused';return ids.map(id=>{const w=Game.player.weapons.find(w=>w.id===id);return {name:id+': stored weapon ID restores level, damage and complete equipment art after refresh',passed:!!w&&w.level===3&&w.getDamage()>0&&!!Assets.get(w.def.hudIcon||w.def.icon)?.naturalWidth}})},group));
 }
 await page.setViewportSize({width:1280,height:720});
 await page.evaluate(()=>{Game.player.weapons=['flail','crystal_weapon','spellbook_burning','ballista','shield_round_buckler','poison_sprayer'].map(id=>new Weapon(id,CONFIG.WEAPONS[id]));Game.state='paused';Game._buildOpen=true;Game._buildTab='weapons';Game._buildPage=0;});
 await page.screenshot({path:'output/playwright/v120/v251-build-desktop.png'});screenshots.push('v251-build-desktop.png');
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'output/playwright/v120/v251-build-portrait.png'});screenshots.push('v251-build-portrait.png');
 await page.evaluate(()=>{Game._buildOpen=false;Game.state='menu'});await page.setViewportSize({width:1280,height:720});
 return {passed:checks.every(c=>c.passed)&&!errors.length,checks,errors,screenshots};
}
