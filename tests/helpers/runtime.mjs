import {readFileSync} from 'node:fs';
import vm from 'node:vm';
export function runtime(extra=[]){
  const storage=new Map(),drawing=new Proxy({}, {get:(o,k)=>k==='measureText'?s=>({width:String(s).length*8}):o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
  const ctx=vm.createContext({console,Math,setTimeout:f=>f(),window:{innerWidth:1280,innerHeight:720},document:{createElement:()=>({getContext:()=>drawing})},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}});
  for(const f of ['config','core','entities','game','objectives','builds','world','run-summary','expansion','campaign',...extra])vm.runInContext(readFileSync(new URL(`../../js/${f}.js`,import.meta.url),'utf8'),ctx);
  const run=s=>vm.runInContext(s,ctx);
  run(`Audio2.playMusic=()=>{};Audio2.syncVolumes=()=>{};Audio2.play=()=>{};Audio2.click=()=>{};Audio2.hitMaterial=()=>{};Audio2.boss=()=>{};Assets.get=()=>undefined;Game.pickupPool=new ObjectPool(Pickup,10);Game.particlePool=new ObjectPool(Particle,10);Game.damageNumberPool=new ObjectPool(DamageNumber,10);Game.enemyProjectilePool=new ObjectPool(EnemyProjectile,10);Game.projectilePool=new ObjectPool(Projectile,10);Game.startStory=(lines,done)=>done();Game.startNewGame();`);
  run('Game.enemyGrid=new SpatialGrid(128)');return {ctx,run,storage,drawing};
}
