async page => {
 const checks=[],errors=[],screenshots=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.route('**/*',r=>r.continue());await page.reload();await page.waitForFunction(()=>Game.state==='menu',null,{timeout:65000});
 const result=await page.evaluate(()=>{
  const checks=[],add=(name,passed,evidence)=>checks.push({name,passed,evidence,mode:'weapon renderer fixture'});
  Game.state='menu';const p=new Player(192,192);Game.player=p;Game.levelTime=3;
  const make=()=>{const c=document.createElement('canvas');c.width=c.height=384;return c.getContext('2d',{willReadFrequently:true})};
  const crop=Game.drawCroppedAsset;let reads=[];Game.drawCroppedAsset=function(ctx,key,...args){reads.push(key);return crop.call(this,ctx,key,...args)};
  for(const [id,d] of Object.entries(CONFIG.WEAPONS)){
   const c=make();const w=new Weapon(id,d);let visible=true,balanced=true;reads=[];
   for(const level of [1,5])for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
    w.level=level;w.angle=angle;c.clearRect(0,0,384,384);
    if(['orbit','aura'].includes(d.type)){p.weapons=[w];p.drawWeapons(c,'underHero');p.drawWeapons(c,'aboveHero')}
    else if(d.type==='summon'){Game.drawCroppedAsset(c,d.minionSprite||d.icon,192,192,40,40)}
    else {const q=new Projectile(192,192,Math.cos(angle)*200,Math.sin(angle)*200,w.getDamage(),d.range,d.pierce,0,2,d.color,d.projectileSprite||d.icon,d.size,id);q.homing=d.type==='homing';q.draw(c)}
    const data=c.getImageData(0,0,384,384).data;visible&&=data.some((v,i)=>i%4===3&&v>0);balanced&&=c.globalAlpha===1&&c.getTransform().isIdentity;
    if(d.type==='aura'){let alpha=0;for(let i=3;i<data.length;i+=4){const x=((i-3)/4)%384,y=Math.floor((i-3)/4/384);if(Math.abs(x-p.x)>42||Math.abs(y-p.y)>55)alpha=Math.max(alpha,data[i]);}add(id+' Lv'+level+' angle '+angle+': translucent ground effect',alpha<=55,{maxAlpha:alpha})}
   }
   add(id+': visible and canvas state restored at both levels in four directions',visible&&balanced);
   if(!['orbit','aura','summon'].includes(d.type))add(id+': flight never draws an equipment or ring icon',!reads.some(k=>k.startsWith('weapons/')),{reads});
  }
  const c=make();for(const id of ['hammer','war_hammer_double','hammer_meteor']){c.clearRect(0,0,384,384);c.save();c.translate(192,192);const handled=Game.drawRepresentativeWeapon(c,id,40);c.restore();const head=c.getImageData(190,190,4,4).data,handle=c.getImageData(165,190,8,4).data;add(id+': solid head at contact center and visible handle',handled&&head.some((v,i)=>i%4===3&&v>200)&&handle.some((v,i)=>i%4===3&&v>200));}
  for(const id of ['flail','mace_fire']){const t=make();t.translate(192,192);Game.drawRepresentativeWeapon(t,id,40);const pixels=t.getImageData(0,0,384,384).data;let outside=0,handle=0;for(let y=0;y<384;y++)for(let x=0;x<384;x++)if(pixels[(y*384+x)*4+3]>=24){if(Math.abs(y-192)>15||x>207||x<158)outside++;if(x>=161&&x<=171&&Math.abs(y-192)<3)handle++;}add(id+': spikes stay near contact head and complete handle remains visible',outside===0&&handle>20,{outside,handle});}
  Game.drawCroppedAsset=crop;return checks;
 });checks.push(...result);await page.evaluate(()=>Game.state='menu');
 return {passed:checks.every(c=>c.passed)&&!errors.length,checks,screenshots,errors};
}
