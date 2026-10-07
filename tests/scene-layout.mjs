import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const store=new Map(),drawing=new Proxy({}, {get:(o,k)=>k==='measureText'?s=>({width:String(s).length*8}):k==='createLinearGradient'||k==='createRadialGradient'?()=>({addColorStop(){}}):k==='createPattern'?undefined:o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const ctx=vm.createContext({console,Math,window:{innerWidth:1280,innerHeight:720},document:{createElement:()=>({getContext:()=>drawing})},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)}});
for(const f of ['config','core','entities','game','objectives','builds','world','run-summary','expansion','scene'])vm.runInContext(readFileSync(new URL(`../js/${f}.js`,import.meta.url),'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
run('Assets.get=()=>undefined;Audio2.playMusic=()=>{};Audio2.syncVolumes=()=>{};Audio2.play=()=>{};Game.pickupPool=new ObjectPool(Pickup,10);Game.particlePool=new ObjectPool(Particle,10);Game.damageNumberPool=new ObjectPool(DamageNumber,10);Game.startNewGame();');
assert.equal(run('Game.mapLayoutVersion'),2,'New runs use composed scene layout');
for(const v of [0,1,2]){ctx.version=v;assert.equal(run('Game.migrateSave({schemaVersion:8,levelId:"village",mapLayoutVersion:version}).mapLayoutVersion'),v,'Old and new layout versions survive migration');}
for(const seed of [0,1,77,123,909,65535,987654]){
  ctx.seed=seed;run('Game.runSeed=seed;Game.loadLevel("village");');
  const result=run(`(()=>{
    const step=24,r=Game.player.radius,cx=Game.levelData.mapW*24,cy=Game.levelData.mapH*24,w=cx*2,h=cy*2,queue=[[cx,cy]],seen=new Set([cx+','+cy]);
    for(let i=0;i<queue.length;i++)for(const [dx,dy] of [[step,0],[-step,0],[0,step],[0,-step]]){const x=queue[i][0]+dx,y=queue[i][1]+dy,k=x+','+y;if(x<48||y<48||x>w-48||y>h-48||seen.has(k)||Game.isCircleBlocked(x,y,r)||Game.isCircleBlocked(x-dx/2,y-dy/2,r))continue;seen.add(k);queue.push([x,y]);}
    const targets=[...Game.mapData.regions,...Game.levelEncounters,...Game.pickups.filter(p=>p.type==='chest')];
    return {reachable:targets.every(p=>queue.some(([x,y])=>dist(x,y,p.x,p.y)<30)),clear:!Game.isCircleBlocked(cx,cy,r),landmarks:Game.mapData.regions.every(s=>Game.mapData.props.some(p=>p.regionId===s.id&&p.landmark)),paths:Game.mapData.features.filter(f=>f.type==='regionPath').every(f=>f.width>=80)};
  })()`);
  assert.ok(result.reachable&&result.clear&&result.landmarks&&result.paths,`Seed ${seed}: landmarks, spawn, roads, objectives and rewards are reachable`);
  assert.equal(run('Game.mapData.props.filter(p=>p.compound).every(p=>!Game.isCircleBlocked(p.x+p.doorOffsetX,p.y-15,Game.player.radius)&&Game.isCircleBlocked(p.x-26,p.y-22,Game.player.radius))'),true,'Cottage doorway is open while its visible front walls remain solid');
  const before=run('JSON.stringify(Game.collisionProps)');run('Game.saveProgress();Game.loadAndContinue()');assert.equal(run('Game.mapLayoutVersion'),2);assert.equal(run('JSON.stringify(Game.collisionProps)'),before,'Saved composed layout does not move its solids');assert.equal(run('Game.isCircleBlocked(Game.player.x,Game.player.y,Game.player.radius)'),false);
}
console.log('Seven composed village layouts, old/new save versions, roads and goal reachability passed.');
