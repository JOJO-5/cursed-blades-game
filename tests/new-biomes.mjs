import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const storage=new Map(),draw=new Proxy({}, {get:(o,k)=>k==='measureText'?s=>({width:String(s).length*8}):k.startsWith('create')?()=>({addColorStop(){}}):o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const ctx=vm.createContext({console,Math,setTimeout:f=>f(),window:{innerWidth:1280,innerHeight:720},document:{createElement:()=>({getContext:()=>draw})},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}});
for(const f of ['config','core','entities','game','objectives','builds','world','run-summary','expansion','scene','campaign','boss-combat','random-events','hero-skills','challenges','new-biomes'])vm.runInContext(readFileSync(new URL(`../js/${f}.js`,import.meta.url),'utf8'),ctx);
const run=s=>vm.runInContext(`{${s}}`,ctx);
run(`Audio2.playMusic=()=>{};Audio2.syncVolumes=()=>{};Audio2.play=()=>{};Assets.get=()=>undefined;Game.pickupPool=new ObjectPool(Pickup,10);Game.particlePool=new ObjectPool(Particle,10);Game.damageNumberPool=new ObjectPool(DamageNumber,10);Game.startStory=(lines,done)=>done();Game.selectedExpedition='campaign';Game.startNewGame();`);
assert.equal(run('Object.keys(CONFIG.LEVELS).length'),8);
assert.ok(run('Game.getCampaignRouteOptions().includes("forest")'));
for(const mid of ['mine','frost','forest'])for(const end of ['hell','marsh'])for(const final of ['clock','court']){
 ctx.mid=mid;ctx.end=end;ctx.final=final;
 run(`Game.state='menu';Game.selectedExpedition='campaign';Game.startNewGame();Game.bossDefeated=true;Game.finishCampaignStage();Game.chooseCampaignRoute(mid);Game.bossDefeated=true;Game.finishCampaignStage();Game.chooseCampaignRoute(end);Game.bossDefeated=true;Game.finishCampaignStage();`);
 assert.equal(run('Game.state'),'routeChoice');
 assert.equal(run('Game.chooseCampaignRoute(final)'),true);
 run(`Game.levelTime=120;Game.saveProgress();Game.loadAndContinue();`);
 assert.equal(run('Game.campaignRoute.length'),4);
 assert.equal(run('Game.levelData.theme'),final);
 run('Game.bossSpawned=true');
 assert.ok(run('Game.getCurrentObjective().next.includes("完成")'),'Final guardian HUD describes completion');
 run('Game.bossDefeated=true;Game.bossDefeatedGraceTimer=0;Game.finishCampaignStage();Game.saveProgress();Game.loadAndContinue()');
 assert.equal(run('Game.state'),'victory');
 assert.equal(run('Game.getRunSummary().levels.length'),4);
}
assert.equal(run('Game.meta.campaignClears'),12,'All four-stage clears award once, including after refresh');
for(const theme of ['forest','clock','court'])for(const seed of [1,77,909]){
 ctx.theme=theme;ctx.seed=seed;
 run(`Game.state='menu';Game.selectedExpedition='campaign';Game.startNewGame();Game.runSeed=seed;Game.loadLevel(theme);`);
 assert.equal(run('Game.isCircleBlocked(Game.player.x,Game.player.y,Game.player.radius)'),false);
 const geometry=run('JSON.stringify(Game.collisionProps)');
 run('Game.saveProgress();Game.loadAndContinue()');
 assert.equal(run('JSON.stringify(Game.collisionProps)'),geometry);
 assert.ok(run(`Game.mapData.regions.length===4&&Game.mapData.props.some(p=>p.landmark)`));
 const reachable=run(`(()=>{const step=24,r=Game.player.radius,w=Game.levelData.mapW*48,h=Game.levelData.mapH*48,cx=w/2,cy=h/2,q=[[cx,cy]],seen=new Set([cx+','+cy]);for(let i=0;i<q.length;i++)for(const [dx,dy] of [[24,0],[-24,0],[0,24],[0,-24]]){const x=q[i][0]+dx,y=q[i][1]+dy,k=x+','+y;if(x<96||y<96||x>w-96||y>h-96||seen.has(k)||Game.isCircleBlocked(x,y,r)||Game.isCircleBlocked(x-dx/2,y-dy/2,r))continue;seen.add(k);q.push([x,y]);}return [...Game.mapData.regions,...Game.levelEncounters,...Game.pickups].every(p=>q.some(([x,y])=>dist(x,y,p.x,p.y)<36));})()`);
 assert.ok(reachable,theme+'/'+seed+': region, objective and chest reachable at actual radius');
 run(`Game.player.takeDamage=function(n){this.hp-=n};Game.player.hp=100;Game.levelTime=10;Game.oathHazardTick=0;const z=Game.oathZones[0];Game.player.x=theme==='clock'?Game.levelData.mapW*24:z.x;Game.player.y=theme==='clock'?Game.levelData.mapH*24-180:z.y;if(theme==='court'){Game.player.x=Game.levelData.mapW*24;Game.player.y=Game.levelData.mapH*24;}Game.updateThemeHazards(.1);`);
 assert.equal(run('Game.player.hp'),100,'Warnings cause no damage');
 run('Game.levelTime=14;Game.updateThemeHazards(.1)');
 assert.equal(run('Game.player.hp'),93,'Active geometry damages player');
 run(`Game.oathHazardTick=0;Game.player.hp=100;Game.player.x=Game.oathZones[0].x;Game.player.y=Game.oathZones[0].y;if(theme!=='court'){Game.player.x=Game.levelData.mapW*24;Game.player.y=Game.levelData.mapH*24;}Game.updateThemeHazards(.1)`);
 assert.equal(run('Game.player.hp'),100,'Visible safe space prevents hazard damage');
 run(`Game.player.x=Game.levelEncounters[0].x;Game.player.y=Game.levelEncounters[0].y;Game.levelEncounters[0].status='complete';Game.oathHazardTick=0;Game.updateThemeHazards(.1)`);
 assert.equal(run('Game.player.hp'),100,'Purified oath grants shelter');
 for(const phase of [1,2]){ctx.phase=phase;assert.ok(run(`(()=>{const b=new Enemy(Game.levelData.bossId,Game.player.x+180,Game.player.y);b.phase=phase;b.pickNextAbility(Game.player,180);return b.isBoss&&b.signatureEffects.length>0&&b.signatureEffects.every(e=>e.warn>=1&&Number.isFinite(e.damage));})()`),'New guardian has real telegraphed attacks');}
}
run(`Game.state='menu';Game.startNewGame();Game.campaignVersion=1;Game.campaignRoute=['village','mine','hell'];Game.loadLevel('hell');Game.bossDefeated=true;Game.finishCampaignStage();Game.saveProgress();Game.loadAndContinue();`);
assert.equal(run('Game.state'),'victory','Old three-stage saves remain complete');
console.log('Eight biomes, twelve four-stage routes, exact geometry saves and legacy completion passed.');
