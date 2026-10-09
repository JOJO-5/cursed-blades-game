// Run-scoped choice tools and mutually exclusive weapon branches.
const WeaponBranches={
 sword_close:{base:'sword',name:'贴身刃阵',desc:'环绕距离 -35%，伤害 +15%。每四次命中获得 8 护盾，最多 16，持续 6 秒。',color:'#9bd4ce',range:.65,damage:1.15},
 sword_far:{base:'sword',name:'远环回锋',desc:'环绕距离 +55%，转速 -20%。每转一圈沿回锋路径追加 55% 伤害。',color:'#d8c17b',range:1.55,rotateSpeed:.8},
 hammer_fissure:{base:'hammer',name:'裂地锤',desc:'伤害 -10%。命中留下短时裂缝，每 0.3 秒造成 22% 伤害，触发间隔 0.65 秒。',color:'#dd9a66',damage:.9},
 hammer_recoil:{base:'hammer',name:'回震锤',desc:'伤害 -15%，击退 +60%。使普通敌人短暂停顿，首领免疫停顿。',color:'#afd1e0',damage:.85,knockback:1.6},
 bow_piercing:{base:'bow',name:'贯穿重矢',desc:'射击间隔 +45%，伤害 +70%，额外穿透 4 个敌人。',color:'#edd49b',damage:1.7,cooldown:1.45,pierce:4},
 bow_bounce:{base:'bow',name:'弹跳散射',desc:'三箭散射，单箭伤害 -45%，间隔 +20%。每箭最多弹跳两次，不重复命中。',color:'#a5dfbb',damage:.55,cooldown:1.2,multiShot:3},
 imp_lone:{base:'shadow_imp',name:'独行恶灵',desc:'只保留一个恶灵，伤害 +85%，持续 20 秒。更适合持续追击。',color:'#bfb0ed'},
 imp_swarm:{base:'shadow_imp',name:'献祭群灵',desc:'每次召唤三只短命小鬼，单体伤害 -35%。消失时在周围爆发，最多 8 只。',color:'#eaa2d9'}
};
(() => {
 const old={};for(const k of ['startNewGame','loadAndContinue','upgradePrerequisiteMet','getAvailableWeaponChoices','generateUpgradeChoices','selectUpgrade','confirmWeaponReplacement','selectChestReward','updateLevelUp','renderLevelUp','getBuildEntries'])old[k]=Game[k];
 const number=(n,lo,hi,fallback)=>Number.isFinite(n)?clamp(Math.floor(n),lo,hi):fallback;
 Object.assign(Game,{
  resetBuildControl(data){this.buildControl={rerolls:number(data?.rerolls,0,2,2),banishes:number(data?.banishes,0,1,1),banished:Array.isArray(data?.banished)?[...new Set(data.banished.filter(k=>typeof k==='string'&&/^[uwb]:[a-z_]+$/.test(k)))].slice(0,1):[]};this._banishMode=false;},
  choiceKey(c){return c.type==='branch'?'b:'+c.branchId:c.weaponId?'w:'+c.weaponId:c.isFallback?'f:'+c.id:'u:'+c.id;},
  choiceAllowed(c){const key=this.choiceKey(c);return !(this.buildControl?.banished||[]).includes(key)&&!this._rerollExcluded?.has(key);},
  startNewGame(...args){this.resetBuildControl();return old.startNewGame.apply(this,args);},
  upgradePrerequisiteMet(u){return this.choiceAllowed(u)&&old.upgradePrerequisiteMet.call(this,u);},
  getAvailableWeaponChoices(...args){return old.getAvailableWeaponChoices.apply(this,args).filter(c=>this.choiceAllowed(c));},
  branchFamily(w){return CONFIG.WEAPON_EVOLUTIONS.find(e=>e.resultWeapon===w.id)?.baseWeapon||w.id;},
  branchChoice(id){const d=WeaponBranches[id];return d?{id:'branch_'+id,type:'branch',branchId:id,name:d.name,desc:d.desc,icon:CONFIG.WEAPONS[d.base].hudIcon||CONFIG.WEAPONS[d.base].icon,rarity:'epic',isFallback:true,apply:()=>{const w=this.player.weapons.find(w=>this.branchFamily(w)===d.base&&!w.branch);if(w)this.chooseWeaponBranch(w,id);}}:null;},
  generateUpgradeChoices(){
   old.generateUpgradeChoices.call(this);this._banishMode=false;this._choiceDetails=null;
   if(this.player.level<3)return;
   const weapon=this.player.weapons.find(w=>!w.branch&&Object.values(WeaponBranches).some(b=>b.base===this.branchFamily(w)));
   if(!weapon)return;
   const branches=Object.keys(WeaponBranches).filter(id=>WeaponBranches[id].base===this.branchFamily(weapon)).map(id=>this.branchChoice(id)).filter(c=>this.choiceAllowed(c));
   this.upgradeChoices=this.upgradeChoices.slice(0,3-branches.length).concat(branches);
  },
  restoreWeaponBranch(w,id){
   const d=WeaponBranches[id];if(!w||!d||d.base!==this.branchFamily(w))return false;
   const base=CONFIG.WEAPONS[w.id];w.def={...base,name:base.name+' · '+d.name,desc:d.desc,color:d.color};
   for(const k of ['range','damage','rotateSpeed','cooldown','knockback'])if(d[k])w.def[k]=(base[k]||0)*d[k];
   if(d.pierce)w.def.pierce=(base.pierce||0)+d.pierce;if(d.multiShot)w.def.multiShot=d.multiShot;
   w.branch=id;w.branchHits=0;w.branchCooldown=0;return true;
  },
  chooseWeaponBranch(w,id){if(w?.branch||!this.restoreWeaponBranch(w,id))return false;if(this.branchFamily(w)==='shadow_imp')for(const m of this.minions)if(m.sourceWeapon===w.id||m.color===CONFIG.WEAPONS.shadow_imp.color)m.alive=false;this.addMessage('武器变异 · '+WeaponBranches[id].name,WeaponBranches[id].color);return true;},
  canUseChoiceTools(){return this.state==='levelup'&&!this._weaponReplacement&&!this._choiceDetails;},
  rerollUpgradeChoices(){
   if(!this.canUseChoiceTools()||!(this.buildControl?.rerolls>0))return false;
   this.buildControl.rerolls--;this._rerollExcluded=new Set(this.upgradeChoices.map(c=>this.choiceKey(c)));
   try{this.generateUpgradeChoices();}finally{this._rerollExcluded=null;}
   this.saveProgress();Audio2.click();return true;
  },
  banishUpgradeChoice(index){
   const c=this.upgradeChoices[index];if(!this.canUseChoiceTools()||!this._banishMode||!(this.buildControl?.banishes>0)||!c||c.isFallback&&c.type!=='branch')return false;
   this.buildControl.banishes--;this.buildControl.banished.push(this.choiceKey(c));this.generateUpgradeChoices();this.saveProgress();Audio2.click();return true;
  },
  skipUpgradeChoice(){
   if(!this.canUseChoiceTools())return false;
   this._banishMode=false;this.runCoins=(this.runCoins||0)+2;this.finishLevelUpSelection();this.saveProgress();Audio2.click();return true;
  },
  selectUpgrade(i){
   if(this.state!=='levelup')return;
   if(this._banishMode){this.banishUpgradeChoice(i);return;}
   old.selectUpgrade.call(this,i);if(!this._weaponReplacement)this.saveProgress();
  },
  confirmWeaponReplacement(...args){const pending=this._weaponReplacement;old.confirmWeaponReplacement.apply(this,args);if(pending&&!this._weaponReplacement)this.saveProgress();},
  selectChestReward(i){const c=this.chestRewardChoices[i],base=this.player.weapons.find(w=>w.id===c?.baseWeapon),branch=base?.branch;old.selectChestReward.call(this,i);if(c?.type==='evolution'&&branch){const evolved=this.player.weapons.find(w=>w.id===c.resultWeapon);if(evolved&&!evolved.branch)this.restoreWeaponBranch(evolved,branch);this.saveProgress();}},
  serializeChoice(c){return {key:this.choiceKey(c),type:c.type,evolutionId:c.evolutionId};},
  restoreChoice(saved){
   if(!saved||typeof saved.key!=='string')return null;const [kind,id]=saved.key.split(':');
   if(kind==='b')return this.branchChoice(id);if(kind==='f')return this.createRecoveryChoice();
   if(kind==='w')return this.getAvailableWeaponChoices().find(c=>c.weaponId===id)||null;
   if(saved.type==='evolution'){const e=CONFIG.WEAPON_EVOLUTIONS.find(e=>e.id===saved.evolutionId);return e?{...e,type:'evolution',evolutionId:e.id}:null;}
   return CONFIG.UPGRADES.find(u=>u.id===id)||null;
  },
  loadAndContinue(){
   let data;try{data=JSON.parse(localStorage.getItem(this.saveKey)||'null');}catch{}
   this.resetBuildControl(data?.buildControl);old.loadAndContinue.call(this);this._banishMode=false;
   if(!data||!this.player)return;
   this.player.branchGuard=number(data.branchGuard,0,16,0);this.player.branchGuardTime=clamp(Number(data.branchGuardTime)||0,0,6);
   const s=data.rewardSession;if(s&&['levelup','chestReward'].includes(s.source)&&Array.isArray(s.choices)&&s.choices.length<=3){
    const choices=s.choices.map(c=>this.restoreChoice(c)).filter(Boolean);
    if(choices.length){this.state=s.source;this.pendingLevelUps=number(s.pending,0,100,0);this[s.source==='levelup'?'upgradeChoices':'chestRewardChoices']=choices;}
   }
  },
  getChoiceToolsLayout(){const v=this.getVisibleCanvasRect(),cards=this.getChoiceLayout(this.upgradeChoices.length).cards,w=Math.min(420,v.w-20),gap=6,bw=(w-gap*2)/3,y=Math.min(v.y+v.h-38,Math.max(...cards.map(c=>c.y+c.h))+24);return ['reroll','banish','skip'].map((key,i)=>({key,x:v.x+(v.w-w)/2+i*(bw+gap),y,w:bw,h:28}));},
  updateLevelUp(){
   if(this.canUseChoiceTools()){
    if(Input.wasPressed('KeyR')){this.rerollUpgradeChoices();return;}
    if(Input.wasPressed('KeyX')&&this.buildControl.banishes>0){this._banishMode=!this._banishMode;return;}
    if(Input.wasPressed('KeyF')){this.skipUpgradeChoice();return;}
    if(this._banishMode&&Input.wasPressed('Escape')){this._banishMode=false;return;}
    for(const r of this.getChoiceToolsLayout())if(Input.consumeClick(r.x,r.y,r.w,r.h)){if(r.key==='reroll')this.rerollUpgradeChoices();if(r.key==='skip')this.skipUpgradeChoice();if(r.key==='banish'&&this.buildControl.banishes>0)this._banishMode=!this._banishMode;return;}
   }
   old.updateLevelUp.call(this);
  },
  renderLevelUp(){
   old.renderLevelUp.call(this);if(this._weaponReplacement||this._choiceDetails)return;
   const c=this.ctx,buttons=this.getChoiceToolsLayout();c.save();c.textAlign='center';c.fillStyle='#d7c48b';c.font='10px Courier New';
   c.fillText(this._banishMode?'点击一张卡牌将其放逐 · ESC 取消':'本局额度 · 重抽排除当前候选 · 跳过 +2 旅途币',CONFIG.CANVAS_W/2,buttons[0].y-8);
   for(const r of buttons){const text=r.key==='reroll'?`重抽 ${this.buildControl.rerolls} [R]`:r.key==='banish'?`放逐 ${this.buildControl.banishes} [X]`:'跳过 [F]';this.drawButton(r.x,r.y,r.w,r.h,text,this._banishMode&&r.key==='banish'?'#ffe394':r.key==='reroll'&&!this.buildControl.rerolls||r.key==='banish'&&!this.buildControl.banishes?'#695f4a':'#c9b87f');}c.restore();
  },
  getBuildEntries(){const entries=old.getBuildEntries.call(this);if(this._buildTab==='weapons'||this._weaponReplacement)entries.forEach(e=>{if(e.weapon?.branch)e.description=WeaponBranches[e.weapon.branch].desc;});return entries;}
 });
})();
