import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const ctx=vm.createContext({console,Math,window:{}});
for(const file of ['config','core','entities','game'])vm.runInContext(readFileSync(new URL(`../js/${file}.js`,import.meta.url),'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
run('Game.levelData=CONFIG.LEVELS.village;Game.resolvePropCollision=()=>{};Game.clampEntityToMap=()=>{};const p=new Player(500,500);p.weapons=[];');
assert.equal(run('typeof p.getSpritePose'),'function','Hero must expose a directional, fixed-size pose');
for(const [key,dir,flip] of [['KeyW','north',false],['KeyS','south',false],['KeyD','east',false],['KeyA','east',true]]){
  ctx.key=key;run('Input.keys={[key]:true};p.update(.1)');const pose=run('p.getSpritePose()');
  assert.equal(pose.direction,dir);assert.equal(pose.flip,flip);assert.equal(pose.height,64);
  run('Input.keys={};p.update(.1)');const idle=run('p.getSpritePose()');
  assert.equal(idle.direction,dir,'Idle keeps last direction');assert.equal(idle.height,pose.height,'Idle cannot enlarge the hero');assert.equal(idle.frame,0);
}
run('Game.resolvePropCollision=a=>{a.x=a.prevX;a.y=a.prevY;};Input.keys={KeyD:true};p.update(.1)');
assert.equal(run('p.getSpritePose().frame'),0,'Blocked movement cannot keep sliding feet');
console.log('Directional motion, stable visible height, idle facing and blocked-foot behavior passed.');
