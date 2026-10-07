import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const storage=new Map(),drawing=new Proxy({}, {get:(o,k)=>k==='measureText'?s=>({width:String(s).length*8}):k==='createLinearGradient'||k==='createRadialGradient'?()=>({addColorStop(){}}):k==='createPattern'?undefined:o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const ctx=vm.createContext({console,Math,window:{innerWidth:1280,innerHeight:720},document:{createElement:()=>({getContext:()=>drawing})},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}});
for(const f of ['config','core','entities','game','objectives','builds','world','run-summary','expansion','scene'])vm.runInContext(readFileSync(new URL(`../js/${f}.js`,import.meta.url),'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
run('Assets.get=()=>undefined;Audio2.playMusic=()=>{};Audio2.syncVolumes=()=>{};Audio2.play=()=>{};Game.pickupPool=new ObjectPool(Pickup,10);Game.particlePool=new ObjectPool(Particle,10);Game.damageNumberPool=new ObjectPool(DamageNumber,10);Game.startNewGame();');
for(const theme of ['mine','hell','frost','marsh'])for(const seed of [0,1,77,123,909,65535,987654]){
 ctx.theme=theme;ctx.seed=seed;run('Game.runSeed=seed;Game.loadLevel(theme)');
 assert.equal(run('Game.mapLayoutVersion'),3,'New four-biome scenes use layout 3');
 const before=run('JSON.stringify(Game.collisionProps)');
 const result=run(`(()=>{
 const step=24,r=Game.player.radius,cx=Game.levelData.mapW*24,cy=Game.levelData.mapH*24,w=cx*2,h=cy*2,queue=[[cx,cy]],seen=new Set([cx+','+cy]);
 for(let i=0;i<queue.length;i++)for(const [dx,dy] of [[step,0],[-step,0],[0,step],[0,-step]]){const x=queue[i][0]+dx,y=queue[i][1]+dy,k=x+','+y;if(x<48||y<48||x>w-48||y>h-48||seen.has(k)||Game.isCircleBlocked(x,y,r)||Game.isCircleBlocked(x-dx/2,y-dy/2,r))continue;seen.add(k);queue.push([x,y]);}
 const targets=[...Game.mapData.regions,...Game.levelEncounters,...Game.pickups.filter(p=>p.type==='chest')];
 return {reachable:targets.every(p=>queue.some(([x,y])=>dist(x,y,p.x,p.y)<30)),clear:!Game.isCircleBlocked(cx,cy,r),regions:Game.mapData.regions.length,landmarks:Game.mapData.regions.every(s=>Game.mapData.props.some(p=>p.regionId===s.id&&p.landmark)),paths:Game.mapData.features.filter(f=>f.type==='scenePath').every(f=>f.width>=88)};
 })()`);
 assert.ok(result.reachable&&result.clear&&result.regions>=3&&result.landmarks&&result.paths,`${theme}/${seed}: connected landmark compounds`);
 run('Game.saveProgress();Game.loadAndContinue()');assert.equal(run('Game.mapLayoutVersion'),3);assert.equal(run('JSON.stringify(Game.collisionProps)'),before);assert.equal(run('Game.isCircleBlocked(Game.player.x,Game.player.y,Game.player.radius)'),false);
}
for(const version of [0,1,2,3]){ctx.version=version;assert.equal(run('Game.migrateSave({schemaVersion:8,levelId:"mine",mapLayoutVersion:version}).mapLayoutVersion'),version);}
console.log('Four biome scenes, 28 seeds, actual-radius routes, landmark compounds and exact saves passed.');
