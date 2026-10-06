import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const storage=new Map(),drawing=new Proxy({}, {get:(o,k)=>k==='measureText'?s=>({width:String(s).length*8}):k==='createPattern'?undefined:o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const ctx=vm.createContext({console,Math,window:{innerWidth:1280,innerHeight:720},document:{createElement:()=>({getContext:()=>drawing})},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}});
for(const f of ['config','core','entities','game','objectives','builds','world','run-summary','expansion'])vm.runInContext(readFileSync(new URL(`../js/${f}.js`,import.meta.url),'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
run(`Audio2.playMusic=()=>{};Audio2.syncVolumes=()=>{};Audio2.play=()=>{};Assets.get=()=>undefined;Game.pickupPool=new ObjectPool(Pickup,10);Game.particlePool=new ObjectPool(Particle,10);Game.damageNumberPool=new ObjectPool(DamageNumber,10);`);
for(const id of ['warden','ranger','arcanist']){
  ctx.hero=id;run('Game.selectedCharacter=hero;Game.selectedExpedition="frost";Game.startNewGame()');
  assert.equal(run('Game.player.weapons[0].id'),run('CONFIG.CHARACTERS[hero].weapon'));
  assert.equal(run('Game.levelData.theme'),'frost');assert.equal(run('Game.player.hp'),run('Game.player.getMaxHp()'));
  const before=run('JSON.stringify(Game.player.stats)');run('Game.player.spriteDirection="north";Game.saveProgress();Game.selectedCharacter="warden";Game.loadAndContinue()');
  assert.equal(run('Game.player.characterId'),id,'Continue restores saved character, not current menu choice');
  assert.equal(run('JSON.stringify(Game.player.stats)'),before,'Character perks cannot be applied twice on load');
  assert.equal(run('Game.player.getSpritePose().direction'),'north');assert.equal(run('Game.getRunSummary().complete'),true);
}
run('Game.levelTime=33;Game.updateThemeHazards(.1)');assert.equal(run('Game.environmentSpeedMult'),.72,'Storm slows an exposed hero');
run('const beacon=Game.levelEncounters[0];beacon.status="complete";Game.player.x=beacon.x;Game.player.y=beacon.y;Game.updateThemeHazards(.1)');assert.equal(run('Game.environmentSpeedMult'),1,'Completed torch protects from cold');
run('Game.selectedExpedition="marsh";Game.startNewGame();Game.levelTime=25;const pool=Game.trialZones[0];Game.player.x=pool.x;Game.player.y=pool.y;const hp=Game.player.hp;Game.updateThemeHazards(.1)');assert.ok(run('Game.player.hp<hp'),'Active tide damages flooded cells');
run('Game.levelEncounters[0].status="complete";Game.player.x=Game.levelEncounters[0].x;Game.player.y=Game.levelEncounters[0].y;Game.player.invuln=0;const safeHp=Game.player.hp;Game.updateThemeHazards(1)');assert.equal(run('Game.player.hp'),run('safeHp'),'Net tide sanctuary protects the player');
for(const theme of ['frost','marsh']){ctx.theme=theme;for(const seed of [1,77,123,909]){ctx.seed=seed;run('Game.runSeed=seed;Game.loadLevel(theme)');assert.equal(run('Game.isCircleBlocked(Game.player.x,Game.player.y,Game.player.radius)'),false);assert.equal(run('Game.trialZones.length'),6);}}
console.log('Character starts, nonduplicating saves, weather, sanctuary and expedition spawn checks passed.');
