import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
const storage=new Map();
const drawing=new Proxy({}, {get:(o,k)=>k==='measureText'?s=>({width:String(s).length*8}):k==='createLinearGradient'?()=>({addColorStop(){}}):k==='createPattern'?undefined:o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const ctx=vm.createContext({console,Math,window:{innerWidth:1280,innerHeight:720},document:{createElement:()=>({getContext:()=>drawing})},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}});
for(const file of ['config','core','entities','game','objectives','builds','world']) {const p=new URL(`../js/${file}.js`,import.meta.url);if(existsSync(p))vm.runInContext(readFileSync(p,'utf8'),ctx);}
const run=s=>vm.runInContext(s,ctx);
assert.equal(run('typeof Game.advanceWorldEncounter'),'function','Minecart and rift progress must have a real completion contract');
run(`Assets.get=()=>({complete:true,width:96,height:94});Audio2.playMusic=()=>{};Audio2.click=()=>{};Audio2.syncVolumes=()=>{};Game.saveMeta=()=>{};
Game.pickupPool={obtain:(...a)=>new Pickup(...a)};Game.player=new Player(960,720);Game.meta={seenStories:[],unlockedWeapons:[],unlockedUpgrades:[]};
Game.mapLayoutVersion=1;Game.runSeed=123;Game.levelData=CONFIG.LEVELS.mine;Game.levelTime=30;Game.enemies=[];Game.pickups=[];Game.messages=[];Game.state='playing';Game.generateMap();
const cart=Game.levelEncounters.find(s=>s.id==='cart');Game.player.x=cart.x;Game.player.y=cart.y;Game.updateLevelEncounters(.1);`);
assert.equal(run('cart.status'),'ready','Cart needs explicit consent');
run('Input._justPressed={KeyE:true};Game.updateLevelEncounters(.1);Input._justPressed={}');
assert.equal(run('cart.status'),'active');
run('Game.updateLevelEncounters(1)');
assert.equal(run('cart.progress'),0,'Guards hold the cart');
run('Game.enemies.forEach(e=>e.alive=false);Game.player.x=cart.x+400;Game.updateLevelEncounters(1)');
assert.equal(run('cart.progress'),0,'Leaving pauses escort');
run('Game.player.x=cart.x;Game.player.y=cart.y;Game.updateLevelEncounters(1)');
assert.ok(run('cart.progress>0&&cart.progress<1'));
const progress=run('cart.progress');
run('Game.saveProgress();Game.loadAndContinue()');
assert.equal(run("Game.levelEncounters.find(s=>s.id==='cart').progress"),progress,'Escort progress survives save and reload');
run(`for(let i=0;i<30;i++){const c=Game.levelEncounters[0];Game.player.x=c.x;Game.player.y=c.y;Game.updateLevelEncounters(1);}Game.updateLevelEncounters(1);`);
assert.equal(run("Game.levelEncounters[0].status"),'complete');
assert.equal(run("Game.pickups.filter(p=>p.objectiveId==='cart').length"),1,'Escort only pays once');
run('Game.saveProgress();Game.loadAndContinue();Game.updateLevelEncounters(1)');
assert.equal(run("Game.pickups.filter(p=>p.objectiveId==='cart').length"),1);
run(`Game.levelData=CONFIG.LEVELS.hell;Game.levelTime=45;Game.bossSpawned=false;Game.enemies=[];Game.pickups=[];Game.generateMap();
const rift=Game.levelEncounters[0];Game.player.x=rift.x;Game.player.y=rift.y;Game.updateLevelEncounters(1);Input._justPressed={KeyE:true};Game.updateLevelEncounters(1);Input._justPressed={};`);
assert.equal(run('rift.status'),'active');
run('Game.updateLevelEncounters(1)');assert.equal(run('rift.progress'),0);
run('Game.enemies.forEach(e=>e.alive=false);Game.player.x=rift.x+400;Game.updateLevelEncounters(1)');assert.equal(run('rift.progress'),0);
run('Game.player.x=rift.x;Game.player.y=rift.y;Game.updateLevelEncounters(1)');assert.ok(run('rift.progress>0'));
run('Game.bossSpawned=true;Game.updateLevelEncounters(1)');assert.equal(run('rift.status'),'expired');assert.equal(run('Game.pickups.length'),0,'Boss interruption never grants an unearned reward');
run(`Game.bossSpawned=false;Game.enemies=[];Game.generateMap();const seal=Game.levelEncounters[0];seal.status='active';Game.player.x=seal.x;Game.player.y=seal.y;
for(let i=0;i<6;i++)Game.updateLevelEncounters(1);`);
assert.equal(run('seal.status'),'complete');
assert.equal(run('Game.mapData.features.find(f=>f.objectiveRift).sealed'),true);
assert.equal(run("Game.pickups.filter(p=>p.objectiveId==='rift').length"),1);
run('Game.saveProgress();Game.loadAndContinue();Game.player.invuln=0;Game.mapData.features=Game.mapData.features.filter(f=>f.objectiveRift);const sealedHP=Game.player.hp;Game.updateThemeHazards(1);Game.updateLevelEncounters(1)');
assert.equal(run('Game.player.hp'),run('sealedHP'),'Restored seal cannot damage the player');
assert.equal(run('Game.environmentSpeedMult'),1,'Restored seal cannot slow the player');
assert.equal(run("Game.pickups.filter(p=>p.objectiveId==='rift').length"),1,'Restored seal only pays once');
assert.equal(run('Game.migrateSave({schemaVersion:6,weapons:[]}).mapLayoutVersion'),0,'Legacy saves keep their layout');
// Actual collision geometry: breadth-first search over 32px cells, using
// player radius, reaches all region centers and new objective sites.
for(const seed of [0,1,77,123,909,65535,987654])for(const theme of ['village','mine','hell']) {
  run(`Game.mapLayoutVersion=1;Game.runSeed=${seed};Game.levelData=CONFIG.LEVELS.${theme};Game.levelTime=0;Game.bossSpawned=false;Game.generateMap()`);
  const result=run(`(()=>{
    const step=32,w=Game.levelData.mapW*CONFIG.TILE_SIZE,h=Game.levelData.mapH*CONFIG.TILE_SIZE;
    const cx=w/2,cy=h/2,seen=new Set(),queue=[[cx,cy]],key=(x,y)=>x+','+y;seen.add(key(cx,cy));
    for(let i=0;i<queue.length;i++)for(const [dx,dy] of [[step,0],[-step,0],[0,step],[0,-step]]) {
      const [x,y]=[queue[i][0]+dx,queue[i][1]+dy],k=key(x,y);
      if(x<64||y<64||x>w-64||y>h-64||seen.has(k)||Game.isCircleBlocked(x,y,16))continue;seen.add(k);queue.push([x,y]);
    }
    const targets=[...(Game.mapData.regions||[]),...Game.levelEncounters];
    const reachable=targets.every(p=>queue.some(([x,y])=>dist(x,y,p.x,p.y)<40));
    return {reachable,spawnClear:!Game.isCircleBlocked(cx,cy,20),targets:targets.length};
  })()`);
  assert.ok(result.reachable&&result.spawnClear,`${theme}/${seed}: spawn and goals must be connected`);
}
console.log('World objectives, save compatibility, boss interruption and 21 seeded collision maps passed.');
