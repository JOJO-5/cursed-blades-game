async page => {
  const mode=new URL(page.url()).searchParams.get('sceneMode')||'after',screenshots=[],errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.setExtraHTTPHeaders({'Cache-Control':'no-cache'});await page.setViewportSize({width:1280,height:720});await page.reload();await page.waitForFunction(()=>typeof Game!=='undefined'&&Game.state==='menu',null,{timeout:65000});
  const prepare=()=>{Game.selectedCharacter='warden';Game.selectedExpedition='campaign';Game.startNewGame();Game.runSeed=123;Game.loadLevel('village');Game.state='paused';Game.renderPause=()=>{};Game.camera.shakeX=Game.camera.shakeY=0;};
  await page.evaluate(prepare);
  const sites=await page.evaluate(()=>[{id:'spawn',x:Game.player.x,y:Game.player.y},...Game.getVillageRegions()]);
  for(const s of sites){await page.evaluate(s=>{Game.player.x=s.x;Game.player.y=s.y;Game.camera.x=s.x-480;Game.camera.y=s.y-270;Game.render();},s);
    const path=`output/playwright/v110/${mode}-${s.id}.png`;await page.screenshot({path});screenshots.push(path);}
  const performance=await page.evaluate(async()=>{
    const update=Game.update,render=Game.render,random=Math.random,rows=[];Game.update=Game.render=()=>{};
    const summary=a=>{const sorted=[...a].sort((a,b)=>a-b);return{samples:a.length,mean:a.reduce((a,b)=>a+b,0)/a.length,p95:sorted[Math.floor(sorted.length*.95)],max:sorted.at(-1),over50ms:a.filter(x=>x>50).length};};
    try{for(const [name,time,count] of [['opening',0,4],['horde',120,24],['boss',610,30]]){
      Math.random=makeRNG(123);Game.selectedCharacter='warden';Game.selectedExpedition='campaign';Game.startNewGame();Game.runSeed=123;Game.loadLevel('village');Game.state='playing';Game.levelTime=time;Game.spawnTimer=999;Game.player.invuln=999;
      Game.player.weapons=['sword','shield','bow','fireball'].map(id=>{const w=new Weapon(id,CONFIG.WEAPONS[id]);w.level=3;return w;});Game.enemies=[];Game.pickups=[];
      const cx=Game.player.x,cy=Game.player.y;
      for(let i=0;i<count;i++){const a=i*TAU/count;Game.enemies.push(new Enemy('skeleton',cx+Math.cos(a)*240,cy+Math.sin(a)*170));}
      if(name==='boss'){Game.bossSpawned=true;Game.bossActive=true;Game.enemies.push(new Enemy('boss',cx+170,cy));}
      for(let i=0;i<12;i++)Game.pickups.push(new Pickup(cx+i*18-100,cy+70,'xp','xp_gem_small',1));
      const u=[],r=[],frames=[];let previous;
      for(let i=0;i<300;i++){const stamp=await new Promise(requestAnimationFrame);if(previous!==undefined)frames.push(stamp-previous);previous=stamp;Game.state='playing';Game.pendingLevelUps=0;let t=globalThis.performance.now();update.call(Game,1/60);u.push(globalThis.performance.now()-t);t=globalThis.performance.now();render.call(Game);r.push(globalThis.performance.now()-t);}
      rows.push({name,time,count,update:summary(u),render:summary(r),frame:summary(frames)});
    }}finally{Game.update=update;Game.render=render;Math.random=random;Game.state='paused';}return rows;
  });
  const runtime=await page.evaluate(()=>({layout:Game.mapLayoutVersion,representativeWeapons:Weapon.prototype.draw.toString().includes('drawRepresentativeWeapon'),props:['cottage','torch','altar'].map(id=>{const p=Assets.get(`props/${id}_v110`);return{id,w:p?.width,h:p?.height};})}));
  return{passed:errors.length===0,mode,seed:123,viewport:[1280,720],screenshots,performance,errors,runtime,method:'fixed combat fixtures, 300 RAF samples per phase; same seed, character, weapons and enemy counts'};
}
