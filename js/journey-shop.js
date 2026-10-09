// Seeded stock, paid rerolls and atomic purchases. Camp never blocks direct route selection.
(() => {
 Object.assign(RandomEvents.merchant,{desc:'三件随机商品：誓约遗物、锻片与补给。购物时暂停，可花 3 币重抽一次。',cost:'查看三件商品 · 商店内显示价格'});
 const old={};for(const k of ['startNewGame','loadAndContinue','openRandomEvent','getCampaignRouteLayout','update','render','renderCampaignRoutes','renderHUD','canShowRotateButton'])old[k]=Game[k];
 const hazards={mine:'矿洞：护送路线，注意虫群',frost:'墓园：留意暴风雪与火炬',forest:'誓林：离开亮起的枝根',hell:'熔渊：绕开裂隙和吐息',marsh:'遗迹：留意潮汐安全岛',clock:'工坊：离开亮起的电轨',court:'王庭：进入亮起的誓光'};
 const offeredKinds=new Set(['relic','forge','heal','cleanse','ward']);
 Object.assign(Game,{
  journeyStores:{},journeyStore:null,
  startNewGame(...a){this.journeyStores={};this.journeyStore=null;return old.startNewGame.apply(this,a);},
  journeyShopKey(source,site){return this.levelData.theme+':'+(source==='camp'?'camp':site.id);},
  generateJourneyOffers(store,previous=[]){
   const rng=makeRNG(this.runSeed^Array.from(store.key).reduce((n,c)=>n*31+c.charCodeAt(0),20)^(store.revision||0)),ids=Object.keys(OathRelics).filter(id=>this.canAcquireOathRelic(id)&&!previous.some(o=>o.relicId===id));
   const id=ids[Math.floor(rng()*ids.length)],w=[...this.player.weapons].filter(w=>w.level<CONFIG.WEAPON_MAX_LEVEL).sort((a,b)=>Number(!!b.branch)-Number(!!a.branch)||a.level-b.level)[0];
   const supply=this.oathRun.burden>0?{kind:'cleanse',name:'净咒盐',desc:'清除全部腐化负担，恢复被负担削减的移动速度。',price:6}:(this.runProfile==='iron'||store.source==='camp')?{kind:'ward',name:'封护符',desc:'获得 12 点消耗式护盾，持续 6 秒；不属于治疗。',price:6}:{kind:'heal',name:'旅途药剂',desc:'恢复 30 点生命。生命已满时不能购买。',price:6};
   const offers=[id?{kind:'relic',relicId:id,name:OathRelics[id].name,desc:OathRelics[id].desc,price:18}:{kind:'ward',name:'封护符',desc:'获得 12 点护盾，持续 6 秒。',price:6},w?{kind:'forge',weaponId:w.id,name:'定式锻片 · '+CONFIG.WEAPONS[w.id].name,desc:'此武器等级 +1，保留已选分支；优先锻造变异武器。',price:10}:{kind:'ward',name:'封护符',desc:'武器均已满级，改售 12 点限时护盾。',price:6},supply];
   return offers.map((o,i)=>previous[i]?.sold?previous[i]:{...o,sold:false});
  },
  openJourneyShop(source,site){
   if(source==='camp'){if(this.state!=='routeChoice'||!this.campaignMode||!this.getCampaignRouteOptions().length)return false;}
   else if(this.state!=='eventChoice'||site!==this.activeEvent||site.kind!=='merchant'||site.status!=='ready')return false;
   const key=this.journeyShopKey(source,site);let store=this.journeyStores[key];if(!store){store={key,source,siteId:site?.id,rerolls:1,revision:0};store.offers=this.generateJourneyOffers(store);this.journeyStores[key]=store;}
   this.journeyStore=store;this.state='journeyShop';this.saveProgress();return true;
  },
  openRandomEvent(site){const ok=old.openRandomEvent.call(this,site);if(ok&&site.kind==='merchant')this.openJourneyShop('merchant',site);return ok;},
  journeyOfferAvailable(o){if(!o||o.sold)return false;if(o.kind==='relic')return this.canAcquireOathRelic(o.relicId);if(o.kind==='forge')return this.player.weapons.some(w=>w.id===o.weaponId&&w.level<CONFIG.WEAPON_MAX_LEVEL);if(o.kind==='heal')return this.runProfile!=='iron'&&this.player.hp<this.player.getMaxHp();if(o.kind==='cleanse')return this.oathRun.burden>0;return o.kind==='ward'&&(this.player.branchGuard||0)<16;},
  buyJourneyOffer(index){
   const o=this.journeyStore?.offers[index];if(this.state!=='journeyShop'||!this.journeyOfferAvailable(o)||this.runCoins<o.price)return false;
   // Validation precedes payment; the UI remains paused until the transaction is durably saved.
   if(o.kind==='relic'&&!this.canAcquireOathRelic(o.relicId))return false;
   this.runCoins-=o.price;o.sold=true;
   if(o.kind==='relic')this.acquireOathRelic(o.relicId);
   else if(o.kind==='forge')this.player.weapons.find(w=>w.id===o.weaponId).level++;
   else if(o.kind==='heal')this.player.heal(30);
   else if(o.kind==='cleanse')this.oathRun.burden=0;
   else{this.player.branchGuard=Math.min(16,(this.player.branchGuard||0)+12);this.player.branchGuardTime=6;}
   this.addMessage('购入 '+o.name,'#dfc78e');Audio2.click();this.saveProgress();return true;
  },
  rerollJourneyShop(){const s=this.journeyStore;if(this.state!=='journeyShop'||!s||s.rerolls<=0||this.runCoins<3||s.offers.every(o=>o.sold))return false;this.runCoins-=3;s.rerolls--;s.revision++;s.offers=this.generateJourneyOffers(s,s.offers);Audio2.click();this.saveProgress();return true;},
  leaveJourneyShop(){const s=this.journeyStore;if(this.state!=='journeyShop'||!s)return false;if(s.source==='merchant'){const site=this.randomEvents.find(e=>e.id===s.siteId&&e.kind==='merchant');if(site){site.status='complete';site.claimed=true;}this.activeEvent=null;this.state='playing';}else this.state='routeChoice';this.journeyStore=null;this.saveProgress();return true;},
  serializeJourneySession(){return this.state==='journeyShop'&&this.journeyStore?{key:this.journeyStore.key}:null;},
  loadAndContinue(){let data;try{data=JSON.parse(localStorage.getItem(this.saveKey)||'null');}catch{}this.journeyStores={};this.journeyStore=null;old.loadAndContinue.call(this);
   if(data?.journeyStores&&typeof data.journeyStores==='object')for(const [key,s] of Object.entries(data.journeyStores).slice(0,16)){if(!s||s.key!==key||!['camp','merchant'].includes(s.source)||!Array.isArray(s.offers))continue;
    const offers=s.offers.slice(0,3).filter(o=>o&&offeredKinds.has(o.kind)&&[6,10,18].includes(o.price)&&typeof o.name==='string'&&typeof o.desc==='string'&&(o.kind!=='relic'||OathRelics[o.relicId])&&(o.kind!=='forge'||CONFIG.WEAPONS[o.weaponId])).map(o=>({...o,sold:!!o.sold}));if(offers.length!==3)continue;
    this.journeyStores[key]={...s,offers,rerolls:s.rerolls===1?1:0,revision:s.revision===1?1:0};
   }
   const store=this.journeyStores[data?.journeySession?.key];if(!store||!store.key.startsWith(this.levelData.theme+':'))return;
   if(store.source==='camp'&&this.campaignMode&&this.bossDefeated&&this.getCampaignRouteOptions().length){this.journeyStore=store;this.state='journeyShop';}
   else if(store.source==='merchant'){const site=this.randomEvents.find(s=>s.id===store.siteId&&s.kind==='merchant'&&s.status==='ready');if(site){this.activeEvent=site;this.journeyStore=store;this.state='journeyShop';}}
  },
  getJourneyShopLayout(){const v=this.getVisibleCanvasRect(),w=Math.min(560,v.w-28),x=v.x+(v.w-w)/2,h=Math.min(96,(v.h-228)/3);return {v,cards:[0,1,2].map(i=>({x,y:v.y+106+i*(h+9),w,h})),reroll:{x,y:v.y+v.h-78,w,h:30},leave:{x,y:v.y+v.h-39,w,h:30}};},
  canShowRotateButton(){return !['journeyShop','explorationChoice','oathReward'].includes(this.state)&&old.canShowRotateButton.call(this);},
  getCampaignRouteLayout(){const l=old.getCampaignRouteLayout.call(this),v=l.visible,h=Math.min(130,(v.h-214)/Math.max(2,l.cards.length)-12);l.cards=l.cards.map((r,i)=>({...r,y:v.y+102+i*(h+12),h}));l.camp={x:l.menu.x,y:v.y+v.h-78,w:l.menu.w,h:28};return l;},
  update(dt){if(this.state==='journeyShop'){const l=this.getJourneyShopLayout();for(const [i,r] of l.cards.entries())if(Input.wasPressed('Digit'+(i+1))||Input.consumeClick(r.x,r.y,r.w,r.h)){this.buyJourneyOffer(i);return;}if(Input.wasPressed('KeyR')||Input.consumeClick(l.reroll.x,l.reroll.y,l.reroll.w,l.reroll.h)){this.rerollJourneyShop();return;}if(Input.wasPressed('Escape')||Input.consumeClick(l.leave.x,l.leave.y,l.leave.w,l.leave.h))this.leaveJourneyShop();return;}
   if(this.state==='routeChoice'){const r=this.getCampaignRouteLayout().camp;if(Input.wasPressed('KeyC')||Input.consumeClick(r.x,r.y,r.w,r.h)){this.openJourneyShop('camp');return;}}old.update.call(this,dt);
  },
  renderCampaignRoutes(){const c=this.ctx,l=this.getCampaignRouteLayout(),v=l.visible;c.save();c.fillStyle='rgba(8,15,13,.95)';c.fillRect(0,0,960,540);c.textAlign='center';c.fillStyle='#e5cf99';c.font='bold 22px Courier New';c.fillText('关间营地 · 选择路线',v.x+v.w/2,v.y+46);c.font='11px Courier New';c.fillStyle='#a7b7ab';c.fillText(this.fitChoiceBadgeText(c,this.campaignRoute.map(id=>CONFIG.LEVELS[id].name).join(' → '),v.w-28),v.x+v.w/2,v.y+77);
   for(const [i,r] of l.cards.entries()){const d=this.getCampaignRouteDetails(r.id);c.fillStyle='#1a2823';c.fillRect(r.x,r.y,r.w,r.h);c.strokeStyle=d.color;c.lineWidth=2;c.strokeRect(r.x,r.y,r.w,r.h);c.fillStyle=d.color;c.font='bold 16px Courier New';c.fillText(`${i+1} · ${d.title}`,r.x+r.w/2,r.y+23);c.font='11px Courier New';c.fillStyle='#b6c0b7';c.fillText(this.fitChoiceBadgeText(c,hazards[r.id]||d.desc,r.w-24),r.x+r.w/2,r.y+44);c.fillStyle='#e0cd9a';c.fillText(this.fitChoiceBadgeText(c,d.reward,r.w-24),r.x+r.w/2,r.y+64);c.font='10px Courier New';c.fillStyle='#819b90';c.fillText(`首领约 ${CONFIG.LEVELS[r.id].bossSpawnTime/60} 分钟 · 点击前进`,r.x+r.w/2,r.y+r.h-10);}
   const r=l.camp;this.drawButton(r.x,r.y,r.w,r.h,'关间营地 · 购物准备 [C]','#dfc78e');this.drawButton(l.menu.x,l.menu.y,l.menu.w,l.menu.h,'保存并返回菜单','#a7b7ab');c.restore();
  },
  render(){old.render.call(this);if(this.state!=='journeyShop')return;const c=this.ctx,l=this.getJourneyShopLayout(),v=l.v,s=this.journeyStore;c.save();c.fillStyle='rgba(16,14,17,.97)';c.fillRect(0,0,960,540);c.textAlign='center';c.fillStyle='#e6ce9e';c.font='bold 23px Courier New';c.fillText(s.source==='camp'?'关间营地':'遗迹游商',v.x+v.w/2,v.y+45);c.font='12px Courier New';c.fillText(`旅途币 ${this.runCoins} · 生命 ${Math.ceil(this.player.hp)}/${this.player.getMaxHp()} · 购物时暂停`,v.x+v.w/2,v.y+76);
   for(const [i,r] of l.cards.entries()){const o=s.offers[i],available=this.journeyOfferAvailable(o),color=o.kind==='relic'?OathRelics[o.relicId].color:'#d4bd91';c.fillStyle=o.sold?'#19191c':'#28232a';c.fillRect(r.x,r.y,r.w,r.h);c.strokeStyle=available&&this.runCoins>=o.price?color:'#61584f';c.strokeRect(r.x,r.y,r.w,r.h);c.fillStyle=o.sold?'#82796d':color;c.font='bold 13px Courier New';c.fillText(this.fitChoiceBadgeText(c,`${i+1} · ${o.name} · ${o.sold?'已购':o.price+' 币'}`,r.w-24),r.x+r.w/2,r.y+22);c.font='11px Courier New';c.fillStyle='#c8baa6';this.drawTextBlock(c,o.desc,r.x+r.w/2,r.y+43,r.w-24,16,3);if(!available&&!o.sold){c.fillStyle='#938477';c.fillText('当前条件不满足',r.x+r.w/2,r.y+r.h-6);}}
   c.font='10px Courier New';c.fillStyle='#ad9f8a';const help=s.source==='camp'?this.getCampaignRouteOptions().map(id=>hazards[id]).join(' · '):'每件商品限购一次 · 重抽保留已购商品 · 离开后继续战斗';this.drawTextBlock(c,help,v.x+v.w/2,v.y+422,Math.min(540,v.w-30),15,3);
   this.drawButton(l.reroll.x,l.reroll.y,l.reroll.w,l.reroll.h,`重抽未购商品 · 3 币 · 剩 ${s.rerolls} 次 [R]`,s.rerolls>0&&this.runCoins>=3?'#d2b885':'#74695a');this.drawButton(l.leave.x,l.leave.y,l.leave.w,l.leave.h,s.source==='camp'?'继续选择路线 · ESC':'离开商店 · ESC','#d4c3a0');c.restore();
  },
  renderHUD(){old.renderHUD.call(this);if(!this.oathRun)return;const info=[];if(this.oathRun.burden)info.push(`腐化 ${this.oathRun.burden} 层`);if(this.hasOathRelic('spirit'))info.push(`灵能 ${this.oathRun.spiritCharges}/3`);if(this.hasOathRelic('greed'))info.push(this.runCoins>=30?`追猎 ${Math.ceil(this.oathRun.hunterTimer)}s`:'贪行阈值 30 币');if(!info.length)return;const c=this.ctx,v=this.getVisibleCanvasRect();c.save();c.font='10px Courier New';c.textAlign='right';c.fillStyle='#ceb892';c.fillText(this.fitChoiceBadgeText(c,info.join(' · '),Math.min(260,v.w-30)),v.x+v.w-12,v.y+113);c.restore();}
 });
})();
