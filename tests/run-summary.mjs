import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
const store=new Map();
const ctx=vm.createContext({console,Math,window:{},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)}});
for(const name of ['config','core','entities','game','objectives','builds','world','run-summary'])if(existsSync(new URL(`../js/${name}.js`,import.meta.url)))vm.runInContext(readFileSync(new URL(`../js/${name}.js`,import.meta.url),'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
assert.equal(run('typeof Game.getRunSummary'),'function','Ending time must cover the whole campaign');
run(`Game.player=new Player(720,720);Game.runHistory=[{theme:'village',seconds:500,kills:100,chests:4},{theme:'mine',seconds:450,kills:80,chests:5}];
Game.levelData=CONFIG.LEVELS.hell;Game.levelTime=550;Game.player.kills=250;Game.chestsOpened=12;Game.runStartKills=180;Game.runStartChests=9;Game.runHistoryComplete=true;`);
assert.equal(run('Game.getRunSummary().seconds'),1500);
assert.equal(run('Game.getRunSummary().levels[2].kills'),70);
assert.equal(run('Game.getRunSummary().levels[2].chests'),3);
assert.ok(run('Game.getEndingText().includes(CONFIG.ENEMIES.bossDragon.name)'));
run(`Game.restoreRunHistory({levelId:'mine',kills:70,chestsOpened:3});`);
assert.equal(run('Game.runHistoryComplete'),false,'Legacy mid-campaign saves must not invent previous time');
run(`Game.restoreRunHistory({levelId:'hell',runHistory:[{theme:'village',seconds:500,kills:100,chests:4},{theme:'mine',seconds:450,kills:80,chests:5}],runStartKills:180,runStartChests:9,runHistoryComplete:true});`);
assert.equal(run('Game.getRunSummary().seconds'),1500,'Saved stage totals survive restoration');
run(`Game.restoreRunHistory({levelId:'village',runHistory:[{theme:'oops',seconds:10},{theme:'village',seconds:Infinity,kills:-3}],runStartKills:-2,runStartChests:NaN});`);
assert.equal(run('Game.runHistory.length'),0);
assert.equal(run('Game.runStartKills'),0);
for(const [width,height] of [[1280,720],[390,844],[844,390],[320,568]]) {
  run(`window.innerWidth=${width};window.innerHeight=${height};Game._rotate90=false;`);
  const layout=run('Game.getEndingLayout()');
  for(const button of [layout.restart,layout.menu])assert.ok(button.x>=layout.visible.x&&button.x+button.w<=layout.visible.x+layout.visible.w&&button.y+button.h<=layout.visible.y+layout.visible.h,'Ending buttons must fit the visible canvas');
}
console.log('Campaign totals, stage counters, ending boss and legacy save disclosure passed.');
