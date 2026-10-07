async page => {
 const mode=new URL(page.url()).searchParams.get('biomeMode')||'after',checks=[],screenshots=[],errors=[],geometry={},performance=[];
 page.on('pageerror',e=>errors.push(String(e)));await page.setExtraHTTPHeaders({'Cache-Control':'no-cache'});await page.setViewportSize({width:1280,height:720});await page.reload();await page.waitForFunction(()=>typeof Game!=='undefined'&&Game.state==='menu',null,{timeout:65000});
 for(const theme of ['mine','hell','frost','marsh']){
  await page.evaluate(theme=>{Game.selectedExpedition='campaign';Game.startNewGame();Game.runSeed=123;Game.loadLevel(theme);Game.state='paused';Game.renderPause=()=>{};Game.camera.shakeX=Game.camera.shakeY=0;},theme);
  for(const version of [0,1,2])geometry[theme+'-'+version]=await page.evaluate(async version=>{Game.mapLayoutVersion=version;Game.generateMap();const source=JSON.stringify({collisions:Game.collisionProps.map(p=>[p.type,p.x,p.y,p.radius,p.halfW,p.halfH,p.collisionX,p.collisionY]),features:Game.mapData.features,zones:Game.trialZones});return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source))),b=>b.toString(16).padStart(2,'0')).join('');},version);
  await page.evaluate(theme=>{Game.loadLevel(theme);Game.state='paused';},theme);
  const sites=await page.evaluate(()=>{const cx=Game.levelData.mapW*24,cy=Game.levelData.mapH*24;return [{id:'spawn',x:cx,y:cy},...['NW','NE','SW','SE'].map(q=>({id:q,x:cx+(q.endsWith('W')?-340:340),y:cy+(q.startsWith('N')?-265:265)}))]});
  for(const s of sites){await page.evaluate(s=>{Game.player.x=s.x;Game.player.y=s.y;Game.camera.x=s.x-480;Game.camera.y=s.y-270;Game.render();},s);const path=`output/playwright/v120/${mode}-${theme}-${s.id}.png`;await page.screenshot({path});screenshots.push(path);}
  const rows=await page.evaluate(async theme=>{
   const update=Game.update,render=Game.render,random=Math.random,rows=[];Game.update=Game.render=()=>{};
   const summary=a=>{const s=[...a].sort((a,b)=>a-b);return {samples:a.length,mean:a.reduce((a,b)=>a+b,0)/a.length,p95:s[Math.floor(s.length*.95)],max:s.at(-1),over50ms:a.filter(x=>x>50).length}};
   try{for(const [name,time,count] of [['opening',0,4],['horde',120,24],['boss',610,30]]){
    Math.random=makeRNG(123);Game.selectedCharacter='warden';Game.selectedExpedition='campaign';Game.startNewGame();Game.runSeed=123;Game.loadLevel(theme);Game.state='playing';Game.levelTime=time;Game.spawnTimer=999;Game.player.invuln=999;
    Game.player.weapons=['sword','shield','bow','fireball'].map(id=>{const w=new Weapon(id,CONFIG.WEAPONS[id]);w.level=3;return w;});Game.enemies=[];Game.pickups=[];const cx=Game.player.x,cy=Game.player.y;
    for(let i=0;i<count;i++){const a=i*TAU/count;Game.enemies.push(new Enemy('skeleton',cx+Math.cos(a)*240,cy+Math.sin(a)*170));}
    if(name==='boss'){Game.bossSpawned=true;Game.bossActive=true;Game.enemies.push(new Enemy(Game.levelData.bossId,cx+170,cy));}
    for(let i=0;i<12;i++)Game.pickups.push(new Pickup(cx+i*18-100,cy+70,'xp','xp_gem_small',1));
    const u=[],r=[],frames=[];let previous;for(let i=0;i<300;i++){const stamp=await new Promise(requestAnimationFrame);if(previous!==undefined)frames.push(stamp-previous);previous=stamp;Game.state='playing';Game.pendingLevelUps=0;let t=globalThis.performance.now();update.call(Game,1/60);u.push(globalThis.performance.now()-t);t=globalThis.performance.now();render.call(Game);r.push(globalThis.performance.now()-t)}
    rows.push({theme,name,time,count,update:summary(u),render:summary(r),frame:summary(frames)});
   }}finally{Game.update=update;Game.render=render;Math.random=random;Game.state='paused'}return rows;
  },theme);performance.push(...rows);
 }
 return {passed:errors.length===0,mode,seed:123,viewport:[1280,720],geometry,screenshots,performance,errors,method:'four themes, fixed identical combat fixtures, 300 RAF samples per phase'};
}
