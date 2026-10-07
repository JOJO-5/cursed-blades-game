async page => {
 const checks=[],screenshots=[],errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.route('**/*',r=>r.continue());await page.reload();await page.waitForFunction(()=>Game.state==='menu',null,{timeout:65000});
 const result=await page.evaluate(()=>{
  const checks=[];const add=(name,passed,evidence)=>checks.push({name,passed,evidence,mode:'sprite pixel regression'});
  const make=()=>{const c=document.createElement('canvas');c.width=c.height=384;return c.getContext('2d',{willReadFrequently:true})};
  const bossTypes=['boss','bossSpider','bossDragon','frostWarden','tideKeeper'];
  add('Five bosses use distinct loaded silhouettes',new Set(bossTypes.map(t=>CONFIG.ENEMIES[t].sprite)).size===5&&bossTypes.every(t=>Assets.get(CONFIG.ENEMIES[t].sprite)?.complete));
  const enemies=['skeleton','slime','bat',...bossTypes].map(t=>[t,new Enemy(t,192,230)]);
  const heroes=[];
  for(const id of ['warden','ranger','arcanist'])for(const direction of ['north','south','east'])for(let phase=0;phase<4;phase++){
   const p=new Player(192,230);p.characterId=id;p.spriteDirection=direction;p.spriteFlip=direction==='east'&&phase%2===1;p.isMoving=true;p.stepDistance=phase*(direction==='north'?12:18);heroes.push([`${id}/${direction}/${phase}`,p]);
  }
  for(const [name,e] of [...enemies,...heroes]){
   e.animTime=0;e.invuln=0;e.hp=e.maxHp;if(e.isBoss)e.y=Math.round(e.y+e.radius*.7)-e.radius*.7;const c=make();c.fillText=()=>{}; // Names are reviewed in the full draw gallery.
   const render=flash=>{c.clearRect(0,0,384,384);c.fillStyle='#274356';c.fillRect(0,0,384,384);e.hitFlash=flash;e.draw(c);return c.getImageData(0,0,384,384).data};
   render(0);const before=render(0),after=render(.2);c.clearRect(0,0,384,384);
   if(e instanceof Player){const pose=e.getSpritePose();c.save();c.translate(e.x,e.y+14);c.scale(pose.flip!==!!pose.walkFlip?-1:1,1);Game.drawCroppedAsset(c,pose.key,0,-32,64,64);c.restore();}
   else {const img=Assets.get(e.def.sprite),scale=e.isBoss?e.def.spriteHeight/img.height:1;Assets.drawCentered(c,e.def.sprite,e.x,e.isBoss?e.y+e.radius*.7-e.def.spriteHeight/2:e.y,scale,0,1);}
   const mask=c.getImageData(0,0,384,384).data;let inside=0,outside=0,examples=[];
   for(let i=0;i<before.length;i+=4)if(before[i]!==after[i]||before[i+1]!==after[i+1]||before[i+2]!==after[i+2]){if(mask[i+3])inside++;else {outside++;if(examples.length<5)examples.push({x:(i/4)%384,y:Math.floor(i/4/384),before:Array.from(before.slice(i,i+4)),after:Array.from(after.slice(i,i+4))})}}
   add(name+': hit changes sprite pixels only',inside>0&&outside===0,{inside,outside,examples});
  }
  const c=make();c.fillStyle='#274356';c.fillRect(0,0,384,384);const before=c.getImageData(0,0,384,384).data;Assets.drawTinted(c,'items/chest',192,192,1,'#ffd040',.3);const after=c.getImageData(0,0,384,384).data;c.clearRect(0,0,384,384);Assets.drawCentered(c,'items/chest',192,192,1,0,1);const mask=c.getImageData(0,0,384,384).data;let outside=0,inside=0;
  for(let i=0;i<before.length;i+=4)if(before[i]!==after[i]||before[i+1]!==after[i+1]||before[i+2]!==after[i+2]){if(mask[i+3])inside++;else outside++}
  add('Rare chest tint respects alpha silhouette',outside===0&&inside>0,{outside,inside});
  const cached=Assets.getTinted('items/chest','#ffd040');add('Repeated tint reuses canvas',cached===Assets.getTinted('items/chest','#ffd040'));add('Tint cache bounded',Assets.tintCache.size<=128,{size:Assets.tintCache.size});
  for(const hero of ['warden','ranger','arcanist']){const p=new Player(0,0);p.characterId=hero;p.isMoving=true;p.spriteDirection='south';p.stepDistance=0;const a=p.getSpritePose();p.stepDistance=36;const b=p.getSpritePose();add(hero+': front stride alternates feet deterministically',a.key===b.key&&!a.walkFlip&&b.walkFlip);}
  for(const hero of ['warden','ranger','arcanist']) {
   const p=new Player(192,230);p.characterId=hero;p.invuln=1;p.animTime=0;const c=make();p.draw(c);const d=c.getImageData(145,170,94,60).data;let maxAlpha=0;for(let i=3;i<d.length;i+=4)maxAlpha=Math.max(maxAlpha,d[i]);add(hero+': hurt blink alpha applies once',maxAlpha>=80&&maxAlpha<=92,{maxAlpha});
  }
  const gallery=document.createElement('canvas');gallery.width=1100;gallery.height=650;const g=gallery.getContext('2d');g.fillStyle='#274356';g.fillRect(0,0,1100,650);g.imageSmoothingEnabled=false;
  bossTypes.forEach((t,i)=>{const e=new Enemy(t,110+i*220,210);e.animTime=0;e.draw(g)});
  for(const [row,hero] of ['warden','ranger','arcanist'].entries())for(const [column,direction] of ['south','east'].entries())for(let frame=0;frame<4;frame++){
   const p=new Player(60+column*550+frame*115,340+row*140);p.characterId=hero;p.spriteDirection=direction;p.isMoving=true;p.stepDistance=frame*18;p.draw(g);g.fillStyle='#f5e9c7';g.font='13px monospace';g.fillText(`${hero} ${direction} ${frame+1}`,p.x-50,p.y+40);
  }
  const image=document.createElement('img');image.id='combat-review';image.src=gallery.toDataURL();image.style.cssText='position:fixed;z-index:99999;left:0;top:0;width:1100px;height:650px';document.body.append(image);
  return checks;
 });checks.push(...result);
 const path='output/playwright/v120/combat-sprites-review.png';await page.locator('#combat-review').screenshot({path});screenshots.push(path);await page.locator('#combat-review').evaluate(e=>e.remove());
 checks.push({name:'Combat visual browser errors',passed:errors.length===0,evidence:errors});return {passed:checks.every(c=>c.passed),checks,screenshots,errors};
}
