async page => {
  const checks=[],screenshots=[],errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  const check=(name,passed,evidence)=>{checks.push({name,passed:!!passed,mode:'scene-runtime',evidence});if(!passed)throw new Error(name);};
  const legacy={"village-0": "850fd65126ffcaec88f37f9c685e1835d31cd2907a5dc19abb12f023ea5d6c8b", "mine-0": "071116382c9ce369f3a2bb0330819521bdfe0bd4ed51342f6374768c3ed77915", "hell-0": "1679f5d3c11067b03268b147fb0fde491107255fe1c03aca401a00cc9d3da7ea", "village-1": "a2323e8fd9ce54091e5c1098255fbd07fe049c55b0a2d2b8dd22fa8d9f3f78ab", "mine-1": "b32c57d9961d0169cac960f02ad3a46cb5c48744ac05267d800356413b4204bc", "hell-1": "3a7b2203e6f9075c2a5224fdf191fbcf1408827a29610d8c6e2df81b7fd01020"};
  try{
    await page.setViewportSize({width:1280,height:720});await page.reload();
    await page.waitForFunction(()=>Game.state==='menu',null,{timeout:65000});
    check('Representative weapon renderer is loaded',await page.evaluate(()=>typeof Game.drawRepresentativeWeapon==='function'&&Weapon.prototype.draw.toString().includes('drawRepresentativeWeapon')));
    for(const [key,expected] of Object.entries(legacy)){
      const actual=await page.evaluate(async key=>{
        const [theme,version]=key.split('-');Game.selectedExpedition='campaign';Game.startNewGame();Game.loadLevel(theme);Game.mapLayoutVersion=Number(version);Game.runSeed=123;Game.generateMap();Game.state='paused';
        const source=JSON.stringify(Game.collisionProps.map(p=>[p.type,p.x,p.y,p.radius,p.halfW,p.halfH,p.collisionX,p.collisionY]));
        const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source));return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
      },key);
      check(`Legacy geometry identical to public v0.10: ${key}`,actual===expected,{expected,actual});
    }
    for(const seed of [0,1,77,123,909,65535,987654]){
      const result=await page.evaluate(seed=>{
        Game.runSeed=seed;Game.loadLevel('village');Game.state='paused';
        return {version:Game.mapLayoutVersion,clear:!Game.isCircleBlocked(Game.player.x,Game.player.y,Game.player.radius),
          regions:Game.mapData.regions.map(r=>({id:r.id,landmark:Game.mapData.props.some(p=>p.regionId===r.id&&p.landmark)})),
          props:Game.mapData.props.every(p=>Assets.get(p.type)?.complete)};
      },seed);
      check(`Loaded composed village assets and clear spawn: ${seed}`,result.version===2&&result.clear&&result.props&&result.regions.every(r=>r.landmark),result);
    }
    const saved=await page.evaluate(()=>{const old=JSON.stringify(Game.collisionProps);Game.saveProgress();Game.loadAndContinue();Game.state='paused';return {version:Game.mapLayoutVersion,same:old===JSON.stringify(Game.collisionProps),clear:!Game.isCircleBlocked(Game.player.x,Game.player.y,Game.player.radius)};});
    check('Composed layout restores exact collisions with loaded assets',saved.version===2&&saved.same&&saved.clear,saved);
    await page.evaluate(()=>{Game.selectedExpedition='campaign';Game.startNewGame();Game.runSeed=123;Game.loadLevel('village');Game.state='playing';Game.enemies=[];Game.pickups=[];Game.spawnTimer=999;Game.player.invuln=999;for(const s of Game.levelEncounters)s.status='expired';});
    const paths=await page.evaluate(()=>Game.mapData.features.filter(f=>f.type==='regionPath').map(f=>f.points));
    const walk=async target=>{
      let held=[];
      try{for(let i=0;i<150;i++){
        const p=await page.evaluate(()=>({x:Game.player.x,y:Game.player.y,state:Game.state}));
        if(p.state==='levelup'||p.state==='chestReward'){for(const k of held)await page.keyboard.up(k);held=[];await page.keyboard.press('Digit1');continue;}
        const dx=target.x-p.x,dy=target.y-p.y;if(Math.hypot(dx,dy)<16)return p;
        const keys=[...(Math.abs(dx)>7?[dx>0?'KeyD':'KeyA']:[]),...(Math.abs(dy)>7?[dy>0?'KeyS':'KeyW']:[])];
        for(const k of held)if(!keys.includes(k))await page.keyboard.up(k);for(const k of keys)if(!held.includes(k))await page.keyboard.down(k);held=keys;
        await page.waitForTimeout(100);
      }throw new Error('Keyboard path traversal timed out');}finally{for(const k of held)await page.keyboard.up(k);}
    };
    for(const [i,path] of paths.entries()){
      for(const p of path.slice(1))await walk(p);
      const end=await page.evaluate(()=>({x:Game.player.x,y:Game.player.y})),goal=path.at(-1);
      check(`Keyboard travels from spawn along the road to region ${i+1}`,Math.hypot(end.x-goal.x,end.y-goal.y)<20,{end,goal,fixture:'enemies and encounters suppressed; actual keyboard and player collision'});
      for(const p of path.slice(0,-1).reverse())await walk(p);
    }
    await page.evaluate(()=>{Game.state='paused';});
    for(const character of ['warden','ranger','arcanist']){
      await page.evaluate(character=>{
        Game.selectedCharacter=character;Game.selectedExpedition='campaign';Game.startNewGame();Game.runSeed=123;Game.loadLevel('village');Game.state='paused';Game.renderPause=()=>{};
        Game.player.weapons=['sword','shield','bow','fireball'].map(id=>new Weapon(id,CONFIG.WEAPONS[id]));
        Game.enemies=[new Enemy('skeleton',Game.player.x+150,Game.player.y)];Game.enemyGrid.clear();for(const e of Game.enemies)Game.enemyGrid.insert(e);
        for(const w of Game.player.weapons)if(w.def.type==='ranged')w.fire(Game.player);
        for(const p of Game.projectiles)p.update(.12);
        Game.camera.x=Game.player.x-480;Game.camera.y=Game.player.y-270;Game.render();
      },character);
      const path=`output/playwright/v110/scene-${character}-weapons.png`;await page.screenshot({path});screenshots.push(path);
      check(`Scene renders four representative weapons with ${character}`,await page.evaluate(()=>Game.player.weapons.length===4&&Game.projectiles.length>=2));
    }
    for(const [width,height] of [[1280,720],[390,844],[844,390]]){
      await page.setViewportSize({width,height});await page.waitForTimeout(250);
      const path=`output/playwright/v110/scene-${width}x${height}.png`;await page.screenshot({path});screenshots.push(path);
      check(`Scene viewport ${width}x${height} remains finite`,await page.evaluate(()=>Number.isFinite(Game.camera.x)&&Number.isFinite(Game.camera.y)));
    }
    check('Scene renderer has no browser errors',errors.length===0,errors);
    return {passed:true,checks,screenshots,errors};
  }catch(e){return {passed:false,checks,screenshots,errors,failure:String(e.stack||e)};}
}
