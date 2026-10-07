import assert from 'node:assert/strict';
import {runtime} from './helpers/runtime.mjs';
const {run}=runtime(['boss-combat','random-events','hero-skills','challenges']);
assert.equal(run("Game.selectRunProfile('nightmare')"),false,'nightmare requires a full campaign clear');
assert.equal(run("Game.selectRunProfile('normal')"),true);
run("Game.meta.campaignClears=1;Game.selectRunProfile('nightmare');Game.startNewGame();Game.state='playing';Game.enemies=[];Game.enemies.push(new Enemy('villager',900,720));Game.applyRunProfile(Game.enemies[0]);");
assert.equal(run('Game.enemies[0].maxHp'),run('CONFIG.ENEMIES.villager.hp*1.35'));
const hp=run('Game.enemies[0].maxHp');run('Game.applyRunProfile(Game.enemies[0])');assert.equal(run('Game.enemies[0].maxHp'),hp);
run("Game.bossSpawned=true;Game.enemies=[new Enemy('boss',1100,720)];Game.applyRunProfile(Game.enemies[0]);Game.enemies[0].takeDamage(Game.enemies[0].maxHp*.6,false,0,0,0);Game.saveProgress();");
const bossHp=run('Game.enemies[0].hp');run('Game.loadAndContinue()');assert.equal(run('Game.runProfile'),'nightmare');assert.equal(run('Game.enemies.find(e=>e.isBoss).hp'),bossHp);assert.equal(run('Game.enemies.find(e=>e.isBoss).phase'),2);
run("Game.selectRunProfile('iron');Game.startNewGame();Game.state='playing';Game.player.hp=40;Game.player.heal(100);");assert.equal(run('Game.player.hp'),40);assert.equal(run('Game.player.weaponCapacity'),3);run('Game.saveProgress();Game.loadAndContinue()');assert.equal(run('Game.player.weaponCapacity'),3);
run("Game.runProfile='iron';Game.campaignMode=true;Game.loadLevel('hell');Game.campaignRoute=['village','mine','hell'];Game.bossDefeated=true;Game.runHistory=[{theme:'village',completed:true,seconds:60,kills:0,chests:0},{theme:'mine',completed:true,seconds:60,kills:0,chests:0}];Game.finishCampaignStage();");
assert.ok(run('Game.meta.achievements.includes("iron")'));const clears=run('Game.meta.campaignClears');run('Game.finishCampaignStage()');assert.equal(run('Game.meta.campaignClears'),clears);run('Game.meta.achievements=[];Game.loadMeta()');assert.ok(run('Game.meta.achievements.includes("iron")'));
console.log('Challenge unlocks, one-time scaling, boss HP/phase saves, iron rules and durable idempotent achievements passed.');


run('Game.particles=Array.from({length:900},()=>Game.particlePool.obtain(0,0,0,0,"#fff",1,2));Game.trimCombatVisuals()');assert.equal(run('Game.particles.length'),600);

run("Game.runProfile='iron';Game.player.hp=38;Game.loadLevel('marsh')");assert.equal(run('Game.player.hp'),38,'iron stage change cannot heal');assert.equal(run("Game.upgradePrerequisiteMet({id:'regen'})"),false);assert.equal(run('Game.createRecoveryChoice().id'),'iron_range');

run("Game.runProfile='normal';Game.challengeAwarded=false;Game.campaignMode=true;Game.campaignRoute=['village','mine','marsh'];Game.bossDefeated=true;Game.campaignFinished=false;Game.player.weapons=[new Weapon('bow',CONFIG.WEAPONS.bow),new Weapon('shadow_imp',CONFIG.WEAPONS.shadow_imp)];Game.player.weapons.forEach(w=>w.level=6);Game.finishCampaignStage();Game.saveProgress();const legacy=JSON.parse(localStorage.getItem(Game.saveKey));delete legacy.challengeAwarded;localStorage.setItem(Game.saveKey,JSON.stringify(legacy));Game.loadAndContinue();");assert.ok(run("Game.meta.achievements.includes('projectile')&&Game.meta.achievements.includes('summon')"));const imported=run('Game.meta.campaignClears');run('Game.loadAndContinue()');assert.equal(run('Game.meta.campaignClears'),imported,'old completed campaign is imported once');

run("Game.challengeAwarded=false;Game.campaignMode=false;Game.levelData=CONFIG.LEVELS.hell;Game.state='victory';Game.bossDefeated=true;Game.updateMeta();");const legacyClears=run('Game.meta.campaignClears');run('Game.updateMeta()');assert.equal(run('Game.meta.campaignClears'),legacyClears,'legacy linear campaign also awards once');assert.equal(run('Game.campaignMode'),false,'legacy mode is preserved');

run("Game.loadAndContinue();Game.state='victory';Game.updateMeta();");assert.equal(run('Game.meta.campaignClears'),legacyClears,'legacy claim persists through reload');
