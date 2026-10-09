// One finite blade resource; orbit geometry is shared by collision and drawing.
(() => {
 const old={};for(const key of ['startNewGame','loadAndContinue','saveProgress','updatePlaying','applyPlayerHitEffects','absorbExplorationHit','renderHUD'])old[key]=Game[key];
 const bounded=(n,max)=>Number.isFinite(n)?clamp(n,0,max):0;
 Object.assign(Game,{
  resetBladeStance(data){const mode=['outward','inward'].includes(data?.mode)?data.mode:'';this.bladeStance={charge:bounded(data?.charge,100),mode,remaining:bounded(data?.remaining,4),guard:mode==='inward'?bounded(data?.guard,45):0};if(!this.bladeStance.remaining){this.bladeStance.mode='';this.bladeStance.guard=0;}},
  startNewGame(...a){this.resetBladeStance();return old.startNewGame.apply(this,a);},
  activateBladeStance(mode){const s=this.bladeStance;if(this.state!=='playing'||!this.player?.alive||!['outward','inward'].includes(mode)||!s||s.charge<30||s.remaining>0||!this.player.weapons.some(w=>w.def.type==='orbit'))return false;const charge=s.charge;s.charge=0;s.mode=mode;s.remaining=mode==='outward'?3:4;s.guard=mode==='inward'?charge*.45:0;this.addMessage(mode==='outward'?'展开环刃 · 三秒远环强攻':'收刃护身 · 四秒有限护盾',mode==='outward'?'#e7c990':'#a8cfd0');this.saveProgress();return true;},
  applyPlayerHitEffects(e,damage,w,p,crit,opts){const s=this.bladeStance;if(s&&w?.def.type==='orbit'&&!opts?.secondary&&!e?._oathSecondary&&damage>0)s.charge=Math.min(100,s.charge+4);return old.applyPlayerHitEffects.call(this,e,damage,w,p,crit,opts);},
  absorbExplorationHit(amount){amount=old.absorbExplorationHit.call(this,amount);const s=this.bladeStance;if(s?.mode==='inward'&&s.remaining>0){const absorbed=Math.min(amount,s.guard);s.guard-=absorbed;amount-=absorbed;}return amount;},
  updateBladeStance(dt){if(this.state!=='playing'||!this.player?.alive||!this.bladeStance)return;const s=this.bladeStance;s.remaining=Math.max(0,s.remaining-dt);if(!s.remaining){s.mode='';s.guard=0;}},
  getBladeStanceButtons(){if(!this.player?.weapons.some(w=>w.def.type==='orbit'))return [];const v=this.getVisibleCanvasRect();return [{mode:'outward',key:'KeyR',label:'展开',x:v.x+v.w-102,y:v.y+v.h-178,w:64,h:44},{mode:'inward',key:'KeyF',label:'收刃',x:v.x+v.w-174,y:v.y+v.h-178,w:64,h:44}];},
  updateBladeInput(){if(this.state!=='playing')return;for(const r of this.getBladeStanceButtons())if(Input.wasPressed(r.key)||Input.consumeClick(r.x,r.y,r.w,r.h))this.activateBladeStance(r.mode);},
  updatePlaying(dt){old.updatePlaying.call(this,dt);this.updateBladeStance(dt);this.updateBladeInput();},
  renderHUD(){old.renderHUD.call(this);if(!this.bladeStance)return;const s=this.bladeStance,c=this.ctx;c.save();for(const r of this.getBladeStanceButtons()){c.fillStyle='rgba(14,25,21,.82)';c.fillRect(r.x,r.y,r.w,r.h);c.strokeStyle=s.mode===r.mode?'#e7c990':'#758e86';c.strokeRect(r.x,r.y,r.w,r.h);c.textAlign='center';c.font='11px Courier New';c.fillStyle=s.charge>=30?'#e7c990':'#92a99d';c.fillText(r.label+' · '+r.key.slice(-1),r.x+r.w/2,r.y+16);c.font='9px Courier New';const text=s.remaining>0?(s.mode===r.mode?(s.mode==='inward'?'盾 '+Math.ceil(s.guard):'强攻')+' '+s.remaining.toFixed(1)+'s':'等待刃式结束'):(s.charge<30?'需30 · '+Math.floor(s.charge):'刃势 '+Math.floor(s.charge)+'/100');c.fillText(text,r.x+r.w/2,r.y+32);}c.restore();},
  saveProgress(){old.saveProgress.call(this);if(!this.player?.alive||!this.bladeStance)return;try{const d=JSON.parse(localStorage.getItem(this.saveKey)||'null');if(d){d.bladeStance={...this.bladeStance};localStorage.setItem(this.saveKey,JSON.stringify(d));}}catch{}},
  loadAndContinue(){let d;try{d=JSON.parse(localStorage.getItem(this.saveKey)||'null');}catch{}old.loadAndContinue.call(this);this.resetBladeStance(d?.bladeStance);}
 });
 const range=Weapon.prototype.getRange,damage=Weapon.prototype.getDamage;
 Weapon.prototype.getRange=function(){const r=range.call(this),s=Game.bladeStance;return this.def.type==='orbit'&&s?.remaining>0?r*(s.mode==='outward'?1.45:.65):r;};
 Weapon.prototype.getDamage=function(){const d=damage.call(this),s=Game.bladeStance;return this.def.type==='orbit'&&s?.remaining>0?d*(s.mode==='outward'?1.35:.65):d;};
 const draw=Player.prototype.draw;Player.prototype.draw=function(c){draw.call(this,c);const s=Game.bladeStance;if(!this.alive||s?.mode!=='inward'||!(s.guard>0))return;c.save();c.strokeStyle='#a7d3d0';c.globalAlpha=.25+.5*s.guard/45;c.lineWidth=2;for(let i=0;i<4;i++){c.beginPath();c.arc(this.x,this.y,34,i*TAU/4+.12,i*TAU/4+1.3);c.stroke();}c.restore();};
})();
