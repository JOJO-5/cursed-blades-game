// Permanent unlocks count real combat and committed objective/transaction events.
const HeroSpecializations={
 counter:{hero:'warden',name:'裂阵反击',desc:'成功格挡的反击范围 165，基础伤害 48。',task:'blocks'},
 sanctuary:{hero:'warden',name:'守誓领域',desc:'反击伤害减半，成功格挡留下 5 秒领域；身处其中每秒补充 3 护盾，上限 16。',task:'eliteBlock'},
 precision:{hero:'ranger',name:'贯日重箭',desc:'闪避后射出一支基础伤害 66 的重箭，射程 720，额外穿透 4。',task:'arrowHits'},
 scatter:{hero:'ranger',name:'逐风散射',desc:'闪避后射出五支扇形箭，每箭基础伤害 16，覆盖更多方向。',task:'volley'},
 eruption:{hero:'arcanist',name:'余烬震爆',desc:'蓄力延长至 0.95 秒，爆发范围 220，基础伤害 90。',task:'bursts'},
 ritual:{hero:'arcanist',name:'驻火法阵',desc:'蓄力后不立即爆发，留下 5 秒法阵，每半秒造成 8 基础伤害，范围 140。',task:'crowd'}
};
const StartingTokens={
 ward:{name:'守誓护符',desc:'开局获得 12 护盾，持续 12 秒。',task:'anchors'},
 fire:{name:'余烬火种',desc:'本局首次主动技能在脚下留下 3 秒火种，每半秒造成 6 基础伤害。',task:'delivery'},
 purse:{name:'游商钱袋',desc:'开局额外获得 6 旅途币。',task:'vault'},
 forge:{name:'旧日锻片',desc:'起始武器等级 +1，不改变武器分支。',task:'forge'},
 focus:{name:'猎者印记',desc:'本局首次主动技能的冷却缩短 30%。',task:'bosses'},
 scout:{name:'寻路旅徽',desc:'本局前 30 秒战斗时间移速 +10%，跨关不刷新。',task:'branches'}
};
const HeroTasks={
 blocks:{name:'守望者的时机',desc:'使用守卫成功格挡 5 次，每次技能计一次。',target:5,reward:'counter',type:'specialization'},
 eliteBlock:{name:'守住破阵一击',desc:'守卫成功格挡一次精英近身攻击。',target:1,reward:'sanctuary',type:'specialization'},
 arrowHits:{name:'箭无虚发',desc:'游侠主动技能箭累计命中 30 名敌人；同次技能同敌人计一次。',target:30,reward:'precision',type:'specialization'},
 volley:{name:'一闪三敌',desc:'游侠一次主动技能箭命中 3 名不同敌人。',target:1,reward:'scatter',type:'specialization'},
 bursts:{name:'余烬练习',desc:'术士完成 10 次蓄力释放，提前死亡不计。',target:10,reward:'eruption',type:'specialization'},
 crowd:{name:'破开包围',desc:'术士一次主动爆发实际伤害命中至少 3 名敌人。',target:1,reward:'ritual',type:'specialization'},
 anchors:{name:'熄灭咒柱',desc:'累计完成两个诅咒支点。',target:2,reward:'ward',type:'token'},
 delivery:{name:'誓火归途',desc:'完成一次誓火搬运。',target:1,reward:'fire',type:'token'},
 vault:{name:'腐化试炼',desc:'清理一次腐化宝库六名守卫。',target:1,reward:'purse',type:'token'},
 forge:{name:'锻刃旅途',desc:'累计在商人或营地购买三次武器锻片。',target:3,reward:'forge',type:'token'},
 bosses:{name:'直面守卫',desc:'累计击败三个地图首领。',target:3,reward:'focus',type:'token'},
 branches:{name:'武器新解',desc:'累计为两件武器选择分支。',target:2,reward:'scout',type:'token'}
};
(() => {
 const old={};for(const k of ['loadMeta','resetSave','startNewGame','loadLevel','loadAndContinue','saveProgress','activateHeroSkill','updatePlaying','updateThemeHazards','onBossDefeated','completeExploration','buyJourneyOffer','chooseWeaponBranch','getMenuLayout','updateMenu','renderMenu','renderWorld','getBuildEntries','canShowRotateButton','renderObjectiveHUD'])old[k]=Game[k];
 const number=(n,max,fallback=0)=>Number.isFinite(n)?clamp(n,0,max):fallback;
 Object.assign(Game,{
  selectedSpecializations:{warden:'',ranger:'',arcanist:''},selectedStartingToken:'',trackedHeroTask:'blocks',
  getHeroSkillDefinition(p){const base=HeroSkills[p.characterId]||HeroSkills.warden,d=HeroSpecializations[this.heroJourney?.specialization];return d?.hero===p.characterId?{...base,name:d.name,desc:d.desc,...(d.task==='bursts'?{duration:.95,charge:.95}:{})}:base;},
  ensureHeroTasks(){this.meta.heroTasks=this.meta.heroTasks||{};},
  heroTaskComplete(id){return !!HeroTasks[id]&&(this.meta.heroTasks?.[id]||0)>=HeroTasks[id].target;},
  recordHeroTask(id,amount=1){const d=HeroTasks[id];if(!d||!this.player?.alive||!Number.isFinite(amount)||amount<=0)return false;this.ensureHeroTasks();const before=this.meta.heroTasks[id]||0,after=Math.min(d.target,before+Math.floor(amount));if(before===after)return false;this.meta.heroTasks[id]=after;if(after===d.target)this.addMessage('任务完成 · '+d.name+' · 解锁 '+(d.type==='token'?StartingTokens[d.reward]:HeroSpecializations[d.reward]).name,'#dfc78e');this.saveMeta();return true;},
  loadHeroJourneyMeta(data){this.meta.heroTasks={};for(const [id,d] of Object.entries(HeroTasks))this.meta.heroTasks[id]=Math.floor(number(data?.heroTasks?.[id],d.target));this.selectedSpecializations={};for(const hero of Object.keys(CONFIG.CHARACTERS)){const id=data?.selectedSpecializations?.[hero];this.selectedSpecializations[hero]=HeroSpecializations[id]?.hero===hero&&this.heroTaskComplete(HeroSpecializations[id].task)?id:'';}const token=data?.startingToken;this.selectedStartingToken=StartingTokens[token]&&this.heroTaskComplete(StartingTokens[token].task)?token:'';this.trackedHeroTask=HeroTasks[data?.trackedHeroTask]?data.trackedHeroTask:'blocks';},
  loadMeta(){old.loadMeta.call(this);let data;try{data=JSON.parse(localStorage.getItem(this.metaKey)||'null');}catch{}this.loadHeroJourneyMeta(data);},
  saveHeroJourneySelection(){this.meta.selectedSpecializations={...this.selectedSpecializations};this.meta.startingToken=this.selectedStartingToken;this.meta.trackedHeroTask=this.trackedHeroTask;this.saveMeta();},
  selectHeroSpecialization(id){const d=HeroSpecializations[id];if(this.state!=='menu'||id&&(!d||d.hero!==this.selectedCharacter||!this.heroTaskComplete(d.task)))return false;this.selectedSpecializations[this.selectedCharacter]=id;this.saveHeroJourneySelection();return true;},
  selectStartingToken(id){if(this.state!=='menu'||id&&(!StartingTokens[id]||!this.heroTaskComplete(StartingTokens[id].task)))return false;this.selectedStartingToken=id;this.saveHeroJourneySelection();return true;},
  resetSave(){old.resetSave.call(this);this.loadHeroJourneyMeta(null);this.heroJourney=null;},
  createHeroJourney(data){return {specialization:HeroSpecializations[data?.specialization]?.hero===this.player?.characterId?data.specialization:'',token:StartingTokens[data?.token]?data.token:'',tokenConsumed:!!data?.tokenConsumed,elapsed:number(data?.elapsed,30),castSerial:Math.floor(number(data?.castSerial,1000000)),castHits:{},fields:[]};},
  startNewGame(...a){this.ensureHeroTasks();this.heroJourney=null;this._heroJournal=false;const r=old.startNewGame.apply(this,a),hero=this.player.characterId,id=this.selectedSpecializations[hero],token=this.selectedStartingToken;
   this.heroJourney=this.createHeroJourney({specialization:HeroSpecializations[id]?.hero===hero&&this.heroTaskComplete(HeroSpecializations[id].task)?id:'',token:StartingTokens[token]&&this.heroTaskComplete(StartingTokens[token].task)?token:''});
   const owner={blocks:'warden',eliteBlock:'warden',arrowHits:'ranger',volley:'ranger',bursts:'arcanist',crowd:'arcanist'};if(this.heroTaskComplete(this.trackedHeroTask)||owner[this.trackedHeroTask]&&owner[this.trackedHeroTask]!==hero){const next=Object.keys(HeroTasks).find(id=>owner[id]===hero&&!this.heroTaskComplete(id))||Object.keys(HeroTasks).find(id=>!owner[id]&&!this.heroTaskComplete(id));if(next){this.trackedHeroTask=next;this.saveHeroJourneySelection();}}
   if(this.heroJourney.token==='ward'){this.player.branchGuard=12;this.player.branchGuardTime=12;}if(this.heroJourney.token==='purse')this.runCoins+=6;if(this.heroJourney.token==='forge')this.player.weapons[0].level=Math.min(CONFIG.WEAPON_MAX_LEVEL,this.player.weapons[0].level+1);
   if(!['fire','focus'].includes(this.heroJourney.token))this.heroJourney.tokenConsumed=true;this.saveProgress();return r;
  },
  loadLevel(...a){if(this.heroJourney)this.heroJourney.fields=[];return old.loadLevel.apply(this,a);},
  saveProgress(){old.saveProgress.call(this);if(!this.player?.alive||!this.heroJourney)return;try{const d=JSON.parse(localStorage.getItem(this.saveKey)||'null');if(d){d.heroJourney={...this.heroJourney};localStorage.setItem(this.saveKey,JSON.stringify(d));}}catch{}},
  loadAndContinue(){let data;try{data=JSON.parse(localStorage.getItem(this.saveKey)||'null');}catch{}this.heroJourney=null;old.loadAndContinue.call(this);this.heroJourney=this.createHeroJourney(data?.heroJourney);
   for(const f of (Array.isArray(data?.heroJourney?.fields)?data.heroJourney.fields:[]).slice(0,3))if(['ritual','sanctuary','starterFire'].includes(f.kind)&&Number.isFinite(f.x+f.y)&&f.life>0)this.heroJourney.fields.push({kind:f.kind,x:clamp(f.x,32,this.levelData.mapW*48-32),y:clamp(f.y,32,this.levelData.mapH*48-32),life:number(f.life,f.kind==='starterFire'?3:5),tick:number(f.tick,1),power:number(f.power,2,1)});
   for(const [key,hits] of Object.entries(data?.heroJourney?.castHits||{}).slice(-8))if(/^\d+$/.test(key)&&Array.isArray(hits))this.heroJourney.castHits[key]=hits.filter(n=>Number.isFinite(n)).slice(0,30);
   HeroSkills.reset(this.player,data?.activeSkill);this._heroJournal=false;
  },
  addHeroJourneyField(kind){const j=this.heroJourney;if(!j)return;const life=kind==='starterFire'?3:5;if(j.fields.length>=3)j.fields.shift();j.fields.push({kind,x:this.player.x,y:this.player.y,life,tick:kind==='sanctuary'?1:.5,power:this.oathRun?.skillPower||1});},
  activateHeroSkill(){const start=this.projectiles.length;if(!old.activateHeroSkill.call(this))return false;const p=this.player,j=this.heroJourney;if(!j)return true;j.castSerial++;j.castHits[j.castSerial]=[];for(const key of Object.keys(j.castHits).slice(0,-8))delete j.castHits[key];
   if(p.characterId==='ranger'){let shots=this.projectiles.slice(start);if(['precision','scatter'].includes(j.specialization)){for(const s of this.projectiles.splice(start))this.projectilePool.release(s);const target=this.enemies.filter(e=>e.alive).sort((a,b)=>dist(p.x,p.y,a.x,a.y)-dist(p.x,p.y,b.x,b.y))[0],angle=target?angleTo(p.x,p.y,target.x,target.y):p.moveAngle||0,precision=j.specialization==='precision';shots=[];for(const offset of precision?[0]:[-.3,-.15,0,.15,.3]){const a=angle+offset,s=this.projectilePool.obtain(p.x,p.y,Math.cos(a)*400,Math.sin(a)*400,(precision?66:16)*p.stats.damageMult*p.stats.projectileDamageMult*(this.oathRun?.skillPower||1),precision?720:520,precision?4:1,p.stats.critChanceBonus,1.5,'#a7d7b3','weapons/arrow',precision?24:20,'bow');shots.push(s);this.projectiles.push(s);}}
    for(const s of shots)s.heroJourneyTag=j.castSerial;
   }
   if(j.specialization==='eruption'){p.activeSkill.charge=.95;p.activeSkill.active=.95;}
   if(!j.tokenConsumed&&j.token==='fire'){j.tokenConsumed=true;this.addHeroJourneyField('starterFire');}if(!j.tokenConsumed&&j.token==='focus'){j.tokenConsumed=true;p.activeSkill.cooldown*=.7;}
   this.saveProgress();return true;
  },
  updateHeroJourney(dt){const p=this.player,j=this.heroJourney;if(this.state!=='playing'||!p?.alive||!j)return;j.elapsed=Math.min(30,j.elapsed+dt);
   for(const f of j.fields){f.life-=dt;f.tick-=dt;if(f.life<=0||f.tick>0)continue;f.tick+=f.kind==='sanctuary'?1:.5;if(f.kind==='sanctuary'){if(dist(p.x,p.y,f.x,f.y)<100){p.branchGuard=Math.min(16,(p.branchGuard||0)+3);p.branchGuardTime=Math.max(p.branchGuardTime||0,2);}}else{const radius=f.kind==='ritual'?140:70,damage=(f.kind==='ritual'?8:6)*p.stats.damageMult*f.power;for(const e of [...this.enemies])if(e.alive&&dist(e.x,e.y,f.x,f.y)<radius+e.radius)this.damageOathEnemy(e,damage,f.x,f.y);}}
   j.fields=j.fields.filter(f=>f.life>0);
  },
  updatePlaying(dt){old.updatePlaying.call(this,dt);this.updateHeroJourney(dt);},
  updateThemeHazards(dt){old.updateThemeHazards.call(this,dt);if(this.heroJourney?.token==='scout'&&this.heroJourney.elapsed<30)this.environmentSpeedMult*=1.1;},
  onBossDefeated(){const before=this.bossDefeated;old.onBossDefeated.call(this);if(!before&&this.bossDefeated){this.recordHeroTask('bosses');this.saveProgress();}},
  completeExploration(s){const before=s.status;old.completeExploration.call(this,s);if(before==='active'&&s.status==='complete'){this.recordHeroTask({anchor:'anchors',carry:'delivery',vault:'vault'}[this.exploration.kind]);this.saveProgress();}},
  buyJourneyOffer(index){const kind=this.journeyStore?.offers[index]?.kind,ok=old.buyJourneyOffer.call(this,index);if(ok&&kind==='forge'){this.recordHeroTask('forge');this.saveProgress();}return ok;},
  chooseWeaponBranch(w,id){const before=w?.branch,r=old.chooseWeaponBranch.call(this,w,id);if(r&&!before){this.recordHeroTask('branches');this.saveProgress();}return r;},
  getBuildEntries(){const entries=old.getBuildEntries.call(this);if(this._buildTab==='relics'){const j=this.heroJourney;if(j?.specialization){const d=HeroSpecializations[j.specialization];entries.unshift({title:d.name,subtitle:'角色专精 · '+d.desc,description:d.desc});}if(j?.token){const d=StartingTokens[j.token];entries.unshift({title:d.name,subtitle:'起始信物 · '+d.desc,description:d.desc});}}return entries;},
  getMenuLayout(){const l=old.getMenuLayout.call(this),r=l.challenge,w=(r.w-8)/2;l.challenge={...r,w};l.journal={x:r.x+w+8,y:r.y,w,h:r.h};return l;},
  getHeroJournalLayout(){const v=this.getVisibleCanvasRect(),w=Math.min(580,v.w-28),x=v.x+(v.w-w)/2,columns=v.w>=620&&v.h<500?2:1,h=columns===2?Math.min(110,(v.h-228)/2):Math.min(72,(v.h-240)/4),cardW=(w-(columns-1)*8)/columns;return {v,tabs:['specialization','tasks','tokens'].map((id,i)=>({id,x:x+i*(w+6)/3,y:v.y+72,w:(w-12)/3,h:30})),cards:[0,1,2,3].map(i=>({x:x+(i%columns)*(cardW+8),y:v.y+126+Math.floor(i/columns)*(h+8),w:cardW,h})),prev:{x,y:v.y+v.h-79,w:(w-8)/2,h:30},next:{x:x+(w+8)/2,y:v.y+v.h-79,w:(w-8)/2,h:30},back:{x,y:v.y+v.h-40,w,h:30}};},
  getHeroJournalEntries(){const tab=this._heroJournalTab||'specialization';if(tab==='tasks')return Object.entries(HeroTasks).map(([id,d])=>({id,name:d.name,desc:d.desc,extra:`${this.meta.heroTasks?.[id]||0}/${d.target} · 解锁 ${(d.type==='token'?StartingTokens:HeroSpecializations)[d.reward].name}`,available:true,selected:id===this.trackedHeroTask,done:this.heroTaskComplete(id)}));
   const defs=tab==='tokens'?StartingTokens:HeroSpecializations,selected=tab==='tokens'?this.selectedStartingToken:this.selectedSpecializations[this.selectedCharacter];return [{id:'',name:tab==='tokens'?'不携带信物':'原生技能',desc:tab==='tokens'?'不添加开局收益。':HeroSkills[this.selectedCharacter].desc,extra:'默认可用',available:true,selected:!selected},...Object.entries(defs).filter(([,d])=>tab==='tokens'||d.hero===this.selectedCharacter).map(([id,d])=>({id,...d,available:this.heroTaskComplete(d.task),selected:selected===id,extra:this.heroTaskComplete(d.task)?'已解锁 · 点击选择':`${HeroTasks[d.task].name} · ${this.meta.heroTasks?.[d.task]||0}/${HeroTasks[d.task].target}`}))];
  },
  updateMenu(){if(this._settingsOverlay||this._challengeMenu)return old.updateMenu.call(this);if(this._heroJournal){const l=this.getHeroJournalLayout();for(const r of l.tabs)if(Input.consumeClick(r.x,r.y,r.w,r.h)){this._heroJournalTab=r.id;this._heroJournalPage=0;return;}const entries=this.getHeroJournalEntries(),page=this._heroJournalPage||0;for(const [i,r] of l.cards.entries())if(Input.consumeClick(r.x,r.y,r.w,r.h)){const e=entries[page*4+i];if(!e)return;if(this._heroJournalTab==='tasks'){this.trackedHeroTask=e.id;this.saveHeroJourneySelection();}else if(this._heroJournalTab==='tokens')this.selectStartingToken(e.id);else this.selectHeroSpecialization(e.id);return;}
    if(Input.consumeClick(l.prev.x,l.prev.y,l.prev.w,l.prev.h))this._heroJournalPage=Math.max(0,page-1);if(Input.consumeClick(l.next.x,l.next.y,l.next.w,l.next.h))this._heroJournalPage=Math.min(Math.ceil(entries.length/4)-1,page+1);if(Input.wasPressed('Escape')||Input.consumeClick(l.back.x,l.back.y,l.back.w,l.back.h))this._heroJournal=false;return;}
   const r=this.getMenuLayout().journal;if(Input.consumeClick(r.x,r.y,r.w,r.h)){this._heroJournal=true;this._heroJournalTab='specialization';this._heroJournalPage=0;Audio2.click();return;}return old.updateMenu.call(this);
  },
  renderMenu(){old.renderMenu.call(this);if(this._settingsOverlay||this._challengeMenu)return;const c=this.ctx,l=this.getMenuLayout();c.save();c.fillStyle='#101917';c.fillRect(l.challenge.x-2,l.challenge.y-3,l.challenge.w+l.journal.w+12,l.challenge.h+6);this.drawButton(l.challenge.x,l.challenge.y,l.challenge.w,l.challenge.h,'难度 · '+RunProfiles[this.selectedRunProfile].name,'#b5c9ae');this.drawButton(l.journal.x,l.journal.y,l.journal.w,l.journal.h,'专精 / 任务 / 信物','#dfc78e');c.restore();if(!this._heroJournal)return;
   const q=this.getHeroJournalLayout(),v=q.v,entries=this.getHeroJournalEntries(),page=this._heroJournalPage||0;c.save();c.fillStyle='#101917';c.fillRect(0,0,960,540);c.textAlign='center';c.fillStyle='#dfc78e';c.font='bold 21px Courier New';c.fillText(CONFIG.CHARACTERS[this.selectedCharacter].name+' · 旅者手记',v.x+v.w/2,v.y+35);c.font='10px Courier New';c.fillStyle='#a4b7a7';c.fillText('任务自动解锁 · 失败保留进度 · 每局一项专精与信物',v.x+v.w/2,v.y+55);
   for(const r of q.tabs)this.drawButton(r.x,r.y,r.w,r.h,{specialization:'角色专精',tasks:'定向任务',tokens:'起始信物'}[r.id],r.id===this._heroJournalTab?'#dfc78e':'#a4b7a7');
   for(const [i,r] of q.cards.entries()){const e=entries[page*4+i];if(!e)continue;c.fillStyle=e.selected?'#28372b':'#18221e';c.fillRect(r.x,r.y,r.w,r.h);c.strokeStyle=e.selected?'#ddc78c':e.available?'#596a5c':'#464b46';c.strokeRect(r.x,r.y,r.w,r.h);c.fillStyle=e.available?'#dfc78e':'#8b938a';c.font='bold 12px Courier New';c.fillText(this.fitChoiceBadgeText(c,(e.selected?'◆ ':'')+e.name+(e.done?' · 完成':''),r.w-20),r.x+r.w/2,r.y+17);c.font='10px Courier New';c.fillStyle='#b4c0b2';this.drawTextBlock(c,e.desc,r.x+r.w/2,r.y+33,r.w-20,12,2);c.fillStyle=e.available?'#b6caaa':'#a49a86';c.fillText(this.fitChoiceBadgeText(c,e.extra,r.w-20),r.x+r.w/2,r.y+r.h-6);}
   this.drawButton(q.prev.x,q.prev.y,q.prev.w,q.prev.h,'上一页','#a4b7a7');this.drawButton(q.next.x,q.next.y,q.next.w,q.next.h,`${page+1}/${Math.ceil(entries.length/4)} · 下一页`,'#a4b7a7');this.drawButton(q.back.x,q.back.y,q.back.w,q.back.h,'返回 · 选择应用于下一局','#dfc78e');c.restore();
  },
  canShowRotateButton(){return !this._heroJournal&&old.canShowRotateButton.call(this);},
  renderObjectiveHUD(){old.renderObjectiveHUD.call(this);const id=this.trackedHeroTask,d=HeroTasks[id];if(!d)return;const c=this.ctx,r=this.getObjectiveLayout();c.save();c.fillStyle='rgba(16,25,23,.85)';c.fillRect(r.x,r.y+r.h+2,r.w,18);c.fillStyle=this.heroTaskComplete(id)?'#a8c6a0':'#cbb788';c.font='9px Courier New';c.textAlign='left';c.fillText(this.fitChoiceBadgeText(c,`手记 · ${d.name} ${this.meta.heroTasks?.[id]||0}/${d.target}${this.heroTaskComplete(id)?' · 已解锁':''}`,r.w-16),r.x+8,r.y+r.h+14);c.restore();},
  renderWorld(){old.renderWorld.call(this);const c=this.ctx;c.save();c.translate(-this.camera.x-this.camera.shakeX,-this.camera.y-this.camera.shakeY);for(const f of this.heroJourney?.fields||[]){const r=f.kind==='sanctuary'?100:f.kind==='ritual'?140:70;c.globalAlpha=Math.min(.65,f.life);c.strokeStyle=f.kind==='sanctuary'?'#a6cdd0':'#e4ac78';c.lineWidth=2;c.beginPath();c.arc(f.x,f.y,r,0,TAU);c.stroke();c.globalAlpha=.09;c.fillStyle=c.strokeStyle;c.fill();if(f.kind!=='sanctuary')for(let i=0;i<6;i++){const a=i*TAU/6+f.life*.3,x=f.x+Math.cos(a)*r*.6,y=f.y+Math.sin(a)*r*.6;c.globalAlpha=.7;c.fillStyle='#e4ac78';c.beginPath();c.moveTo(x-4,y+3);c.lineTo(x,y-10);c.lineTo(x+4,y+3);c.closePath();c.fill();}}c.restore();}
 });
 const area=HeroSkills.damageArea;HeroSkills.damageArea=function(p,r,damage){const spec=Game.heroJourney?.specialization;if(p.characterId==='warden'&&r===125){if(spec==='counter'){r=165;damage=48;}if(spec==='sanctuary')damage=16;}if(p.characterId==='arcanist'&&r===170&&spec==='eruption'){r=220;damage=90;}const hits=area.call(this,p,r,damage);if(p.characterId==='arcanist'&&r>=170&&hits>=3)Game.recordHeroTask('crowd');return hits;};
 const burst=HeroSkills.burst;HeroSkills.burst=function(p){if(!p.alive||Game.state!=='playing')return;Game.recordHeroTask('bursts');if(Game.heroJourney?.specialization==='ritual'){p.activeSkill.charge=0;p.activeSkill.active=0;p.activeSkill.burst=.3;Game.addHeroJourneyField('ritual');Game.addMessage('驻火法阵','#e4ac78');Game.saveProgress();return;}return burst.call(this,p);};
 const take=Player.prototype.takeDamage;Player.prototype.takeDamage=function(...a){const before=this.activeSkill?.blocked,source=Game._heroEnemySource,r=take.apply(this,a);if(!before&&this.activeSkill?.blocked){Game.recordHeroTask('blocks');if(source?.isElite)Game.recordHeroTask('eliteBlock');if(Game.heroJourney?.specialization==='sanctuary')Game.addHeroJourneyField('sanctuary');Game.saveProgress();}return r;};
 const enemyUpdate=Enemy.prototype.update;Enemy.prototype.update=function(...a){const previous=Game._heroEnemySource;Game._heroEnemySource=this;try{return enemyUpdate.apply(this,a);}finally{Game._heroEnemySource=previous;}};
 const shotReset=Projectile.prototype.reset;Projectile.prototype.reset=function(...a){delete this.heroJourneyTag;return shotReset.apply(this,a);};
 const shotUpdate=Projectile.prototype.update;Projectile.prototype.update=function(...a){const previous=Game._heroShotSource;Game._heroShotSource=this;try{return shotUpdate.apply(this,a);}finally{Game._heroShotSource=previous;}};
 const enemyTake=Enemy.prototype.takeDamage;Enemy.prototype.takeDamage=function(...a){const hp=this.hp,alive=this.alive,r=enemyTake.apply(this,a),shot=Game._heroShotSource,tag=shot?.heroJourneyTag,j=Game.heroJourney;if(alive&&this.hp<hp&&!this._oathSecondary&&shot?.hitEnemies.has(this.id)&&tag&&j){const hits=j.castHits[tag]||[];if(!hits.includes(this.id)){hits.push(this.id);j.castHits[tag]=hits;Game.recordHeroTask('arrowHits');if(hits.length>=3)Game.recordHeroTask('volley');Game.saveProgress();}}return r;};
})();
