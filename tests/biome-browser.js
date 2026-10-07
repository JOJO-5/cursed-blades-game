async page => {
 const checks=[],screenshots=[],errors=[];
 page.on('pageerror',e=>errors.push(String(e)));await page.setExtraHTTPHeaders({'Cache-Control':'no-cache'});await page.setViewportSize({width:1280,height:720});await page.reload();await page.waitForFunction(()=>Game.state==='menu',null,{timeout:65000});
 const check=(name,passed,evidence)=>{checks.push({name,passed:!!passed,evidence,mode:'biome-runtime'});if(!passed)throw Error(name)};
 const legacy={
  "mine-0": "b7f26e02e6a07cdaeda0cd309eb8809562e4990f18045f6895b1df8d84e55886",
  "mine-1": "5845b9364cce964ebc4fbbf69224eae7d46ec9ca12d3ac77b5909b3a2077439f",
  "mine-2": "5845b9364cce964ebc4fbbf69224eae7d46ec9ca12d3ac77b5909b3a2077439f",
  "hell-0": "d6afa908c9834d3e118cd52b051ab2f4b2489dcf0b1d6ce349ecbabf65f3f12b",
  "hell-1": "c82ee7e71320a7b90df1eaf75b10d034403d59f8836715b5c6f8b86a842cff36",
  "hell-2": "c82ee7e71320a7b90df1eaf75b10d034403d59f8836715b5c6f8b86a842cff36",
  "frost-0": "6601e182ab33d400a1c79065d71b8fcc2808ecc1f88f96a95651adb4d0ca6b6a",
  "frost-1": "6601e182ab33d400a1c79065d71b8fcc2808ecc1f88f96a95651adb4d0ca6b6a",
  "frost-2": "6601e182ab33d400a1c79065d71b8fcc2808ecc1f88f96a95651adb4d0ca6b6a",
  "marsh-0": "60c4f242c99e373bdf821782952c7a8f10ff897c3b97882f7bc25bc0fa7651e6",
  "marsh-1": "60c4f242c99e373bdf821782952c7a8f10ff897c3b97882f7bc25bc0fa7651e6",
  "marsh-2": "60c4f242c99e373bdf821782952c7a8f10ff897c3b97882f7bc25bc0fa7651e6"
}
;
 try{
 for(const [key,expected] of Object.entries(legacy)){
  const actual=await page.evaluate(async key=>{const [theme,v]=key.split('-');Game.selectedExpedition='campaign';Game.startNewGame();Game.runSeed=123;Game.loadLevel(theme);Game.mapLayoutVersion=Number(v);Game.generateMap();Game.state='paused';const source=JSON.stringify({collisions:Game.collisionProps.map(p=>[p.type,p.x,p.y,p.radius,p.halfW,p.halfH,p.collisionX,p.collisionY]),features:Game.mapData.features,zones:Game.trialZones});return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source))),b=>b.toString(16).padStart(2,'0')).join('');},key);
  check('v0.11 complete geometry preserved: '+key,actual===expected,{expected,actual});
 }
 const walk=async target=>{let held=[];try{for(let i=0;i<160;i++){const p=await page.evaluate(()=>({x:Game.player.x,y:Game.player.y}));const dx=target.x-p.x,dy=target.y-p.y;if(Math.hypot(dx,dy)<16)return p;const keys=[...(Math.abs(dx)>7?[dx>0?'KeyD':'KeyA']:[]),...(Math.abs(dy)>7?[dy>0?'KeyS':'KeyW']:[])];for(const k of held)if(!keys.includes(k))await page.keyboard.up(k);for(const k of keys)if(!held.includes(k))await page.keyboard.down(k);held=keys;await page.waitForTimeout(100)}throw Error('Real keyboard route timed out')}finally{for(const k of held)await page.keyboard.up(k)}};
 for(const theme of ['mine','hell','frost','marsh']){
  for(const seed of [0,1,77,123,909,65535,987654]){
   const result=await page.evaluate(({theme,seed})=>{Game.runSeed=seed;Game.loadLevel(theme);Game.state='paused';return {version:Game.mapLayoutVersion,clear:!Game.isCircleBlocked(Game.player.x,Game.player.y,Game.player.radius),assets:Game.mapData.props.every(p=>Assets.get(p.type)?.complete),regions:Game.mapData.regions.map(r=>({id:r.id,landmark:Game.mapData.props.some(p=>p.landmark&&p.regionId===r.id)})),doors:Game.mapData.props.filter(p=>p.compound).every(p=>!Game.isCircleBlocked(p.x,p.y-12,Game.player.radius))}}, {theme,seed});
   check(`${theme}/${seed}: loaded assets, doors, landmarks and clear spawn`,result.version===3&&result.clear&&result.assets&&result.doors&&result.regions.length===4&&result.regions.every(r=>r.landmark),result);
  }
  const saved=await page.evaluate(()=>{const before=JSON.stringify({props:Game.collisionProps,features:Game.mapData.features,zones:Game.trialZones});Game.saveProgress();Game.loadAndContinue();Game.state='paused';return {version:Game.mapLayoutVersion,same:before===JSON.stringify({props:Game.collisionProps,features:Game.mapData.features,zones:Game.trialZones}),clear:!Game.isCircleBlocked(Game.player.x,Game.player.y,Game.player.radius)}});
  check(theme+': layout 3 exact save restore',saved.version===3&&saved.same&&saved.clear,saved);
  await page.evaluate(theme=>{Game.runSeed=123;Game.loadLevel(theme);Game.state='playing';Game.enemies=[];Game.pickups=[];Game.spawnTimer=999;Game.levelTime=0;Game.player.invuln=999;for(const s of Game.levelEncounters)s.status='expired';Game.updateThemeHazards=()=>{};},theme);
  const paths=await page.evaluate(()=>Game.mapData.features.filter(f=>f.type==='scenePath'&&Game.mapData.regions.some(r=>r.id===f.regionId)).map(f=>({id:f.regionId,points:f.points})));
  for(const path of paths){for(const p of path.points.slice(1))await walk(p);check(theme+': actual keyboard road '+path.id,true,{fixture:'encounters/spawning/hazards suppressed, unchanged movement and collisions'});for(const p of path.points.slice(0,-1).reverse())await walk(p)}
  await page.evaluate(()=>{Game.state='paused';Game.renderPause=()=>{};Game.camera.x=Game.player.x-480;Game.camera.y=Game.player.y-270;Game.render()});
  for(const [width,height] of [[1280,720],[390,844],[844,390]]){await page.setViewportSize({width,height});await page.waitForTimeout(150);const path=`output/playwright/v120/biome-${theme}-${width}x${height}.png`;await page.screenshot({path});screenshots.push(path);check(`${theme}: viewport ${width}x${height}`,await page.evaluate(()=>Number.isFinite(Game.camera.x)&&Number.isFinite(Game.camera.y)))}
  await page.setViewportSize({width:1280,height:720});
 }
 check('Four biomes have no browser errors',errors.length===0,errors);return {passed:true,checks,screenshots,errors};
 }catch(e){return {passed:false,checks,screenshots,errors,failure:String(e.stack||e)}}
}
