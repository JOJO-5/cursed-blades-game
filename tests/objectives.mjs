import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

const storage=new Map();
const ctx=vm.createContext({console,Math,window:{innerWidth:390,innerHeight:844},
  localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)}});
for(const file of ['config','core','entities','game','objectives']) {
  const url=new URL(`../js/${file}.js`,import.meta.url);
  if(existsSync(url))vm.runInContext(readFileSync(url,'utf8'),ctx);
}
const run=code=>vm.runInContext(code,ctx);
run(`
  Game.levelData=CONFIG.LEVELS.village;Game.runSeed=123;Game.levelTime=0;
  Game.player=new Player(960,720);Game.enemies=[];Game.pickups=[];Game.messages=[];
  Game.collisionProps=[];Game.state='playing';Input.mouse.clicked=false;
  Game.pickupPool={obtain:(...args)=>new Pickup(...args)};
  Audio2.click=()=>{};Audio2.playMusic=()=>{};Audio2.syncVolumes=()=>{};
`);
assert.equal(run('typeof Game.initLevelEncounters'),'function','Village encounter system must exist');
run('Game.initLevelEncounters()');
const positions=run('JSON.stringify(Game.levelEncounters.map(e=>[e.id,e.x,e.y]))');
run('Game.initLevelEncounters()');
assert.equal(run('JSON.stringify(Game.levelEncounters.map(e=>[e.id,e.x,e.y]))'),positions,'Sites must be stable for a save seed');
assert.ok(run('Game.levelEncounters.every(e=>dist(e.x,e.y,960,720)>180)'), 'Sites must not activate on the spawn point');
run(`const camp=Game.levelEncounters.find(e=>e.id==='camp');Game.player.x=camp.x;Game.player.y=camp.y;Game.updateLevelEncounters()`);
assert.equal(run('camp.status'),'waiting','Walking to camp before its timer must not start a wave');
run('Game.levelTime=20;Game.updateLevelEncounters()');
assert.equal(run('camp.status'),'active','Approaching the available camp must start its wave');
assert.equal(run('Game.enemies.filter(e=>e.encounterId===camp.id).length'),3,'Camp has a complete finite wave');
run('Game.player.x=960;Game.player.y=720;Game.updateLevelEncounters()');
assert.equal(run('camp.status'),'active','Leaving the camp must not reset its challenge');
run('Game.enemies.filter(e=>e.encounterId===camp.id).forEach(e=>e.alive=false);Game.updateLevelEncounters();Game.updateLevelEncounters()');
assert.equal(run('camp.status'),'complete','Clearing the camp must complete its objective');
assert.equal(run('Game.pickups.filter(p=>p.objectiveId===camp.id).length'),1,'Completing the wave must grant exactly one reward');
run(`const altar=Game.levelEncounters.find(e=>e.id==='altar');Game.levelTime=60;Game.player.x=altar.x;Game.player.y=altar.y;Game.updateLevelEncounters()`);
assert.equal(run('altar.status'),'ready','Optional altar must not activate automatically');
const hp=run('Game.player.hp');
run("Game.player.hp=1;Input._justPressed={KeyE:true};Game.updateLevelEncounters()");
assert.equal(run('altar.status'),'ready','Altar cannot charge lethal health');
run(`Game.player.hp=${hp};Game.updateLevelEncounters();Input._justPressed={};Game.updateLevelEncounters()`);
assert.equal(run('altar.status'),'active','Explicit interaction must activate the altar');
assert.equal(run('Game.player.hp'),hp-Math.ceil(hp*.15),'Altar charges health only once');
run('Game.saveProgress();Game.generateMap=()=>Game.initLevelEncounters();Game.loadAndContinue()');
assert.equal(run("Game.levelEncounters.find(e=>e.id==='altar').status"),'active','Save must restore an active altar');
assert.equal(run("Game.enemies.filter(e=>e.encounterId==='altar').length"),5,'Save must restore remaining encounter enemies');
assert.equal(run("Game.pickups.filter(p=>p.objectiveId==='camp').length"),1,'Reload must preserve an uncollected objective reward');
run('Game.enemies.forEach(e=>e.alive=false);Game.updateLevelEncounters();Game.updateLevelEncounters();Game.saveProgress();Game.loadAndContinue();Game.updateLevelEncounters()');
assert.equal(run("Game.pickups.filter(p=>p.objectiveId==='altar').length"),1,'Repeated completion and reload must not duplicate rewards');
run("const legacy=JSON.parse(localStorage.getItem(Game.saveKey));legacy.schemaVersion=4;delete legacy.encounters;localStorage.setItem(Game.saveKey,JSON.stringify(legacy));Game.loadAndContinue()");
assert.equal(run('Game.levelEncounters.length'),2,'Old saves must gain the current level objectives safely');
console.log('Objective regressions passed: availability, approach, consent, cost, completion, save and reward idempotency.');
