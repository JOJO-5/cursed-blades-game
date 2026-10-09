import assert from 'node:assert/strict';
import {runtime} from './helpers/runtime.mjs';
const {run,storage}=runtime(['boss-combat','random-events','hero-skills','challenges','build-choices']);
// Load separately so the first red assertion proves the missing public behavior.
assert.equal(run('typeof Game.rerollUpgradeChoices'),'function','Players can reroll an upgrade');
run(`Game.state='playing';Game.player.level=3;Game.onLevelUp();`);
assert.equal(run('Game.upgradeChoices.filter(c=>c.type==="branch").length'),2);
const initial=run('JSON.stringify(Game.upgradeChoices.map(c=>c.id||c.weaponId))');
assert.equal(run('Game.rerollUpgradeChoices()'),true);
assert.notEqual(run('JSON.stringify(Game.upgradeChoices.map(c=>c.id||c.weaponId))'),initial);
assert.equal(run('Game.buildControl.rerolls'),1);
run('Game.saveProgress();Game.loadAndContinue()');
assert.equal(run('Game.state'),'levelup');
assert.equal(run('Game.buildControl.rerolls'),1);
run(`Game._banishMode=true;Game.banishUpgradeChoice(Game.upgradeChoices.findIndex(c=>c.type!=='branch'));`);
const banned=run('Game.buildControl.banished[0]');assert.ok(banned);
for(let i=0;i<30;i++){run('Game.generateUpgradeChoices()');assert.equal(run(`Game.upgradeChoices.some(c=>Game.choiceKey(c)===${JSON.stringify(banned)})`),false);}
run(`Game.generateUpgradeChoices();Game.selectUpgrade(Game.upgradeChoices.findIndex(c=>c.type==='branch'));`);
assert.ok(run('Game.player.weapons[0].branch'));
assert.equal(run('Game.chooseWeaponBranch(Game.player.weapons[0],"sword_far")'),false,'Branches are mutually exclusive');
run('Game.saveProgress();Game.loadAndContinue()');
assert.ok(run('Game.player.weapons[0].branch'),'Branch survives save');
const range=run('Game.player.weapons[0].getRange()');run('Game.saveProgress();Game.loadAndContinue()');assert.equal(run('Game.player.weapons[0].getRange()'),range,'Restore never compounds modifiers');
run('Game.loadLevel("mine")');assert.equal(run('Game.buildControl.rerolls'),1,'Budgets span the campaign');
run('Game.state="playing";Game.onLevelUp();Game.pendingLevelUps=1;Game.skipUpgradeChoice()');assert.equal(run('Game.state'),'levelup');
run('Game.skipUpgradeChoice()');assert.equal(run('Game.state'),'playing');const coins=run('Game.runCoins');assert.equal(run('Game.skipUpgradeChoice()'),false);assert.equal(run('Game.runCoins'),coins,'Skip cannot pay twice');
run('Game.state="menu";Game.startNewGame()');assert.equal(run('Game.buildControl.rerolls'),2);assert.equal(run('Game.buildControl.banished.length'),0);
// Simulate an older save with no new fields.
run('Game.saveProgress()');const old=JSON.parse(storage.get(run('Game.saveKey')));delete old.buildControl;delete old.rewardSession;storage.set(run('Game.saveKey'),JSON.stringify(old));run('Game.loadAndContinue()');assert.equal(run('Game.buildControl.rerolls'),2);
console.log('Build-choice budgets, exclusion, branch selection, transactions and exact reward refresh passed.');

run(`Game.state='levelup';Game.player.weapons=[new Weapon('sword',CONFIG.WEAPONS.sword)];Game.player.weaponCapacity=1;Game.upgradeChoices=[{weaponId:'bow'}];Game.saveProgress();Game.selectUpgrade(0);Game.confirmWeaponReplacement(0);Game.loadAndContinue();`);
assert.equal(run('Game.player.weapons[0].id'),'bow','Confirmed upgrade replacement autosaves');
assert.equal(run('Game.state'),'playing','Consumed reward does not return after refresh');
