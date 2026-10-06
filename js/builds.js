// v0.7 — build inspection and atomic reward replacement.
(() => {
  const original = {};
  for (const name of ['selectUpgrade','selectChestReward','updateLevelUp','updateChestReward','renderLevelUp','renderChestReward','startNewGame','loadAndContinue','migrateSave']) original[name]=Game[name];
  Object.assign(Game, {
    weaponForChoice(choice) {
      return choice.weaponId || (choice.id === 'summoner_pact' && !this.player.weapons.some(w=>w.id==='shadow_imp') ? 'shadow_imp' : null);
    },
    requestWeaponReplacement(source, index) {
      const choices=source==='levelup'?this.upgradeChoices:this.chestRewardChoices;
      const choice=choices[index];
      if(!choice) return true;
      const id=this.weaponForChoice(choice);
      if(id && !this.player.weapons.some(w=>w.id===id) && this.player.weapons.length>=this.player.weaponCapacity) {
        this._weaponReplacement={source,index,id,choice};this._buildPage=0;this._choiceDetails=null;
        return true;
      }
      return false;
    },
    cancelWeaponReplacement() {this._weaponReplacement=null;Audio2.click();},
    confirmWeaponReplacement(slot) {
      const pending=this._weaponReplacement;
      if(!pending || !this.player.weapons[slot] || this.state!==pending.source) return;
      const choices=pending.source==='levelup'?this.upgradeChoices:this.chestRewardChoices;
      if(choices[pending.index]!==pending.choice || !CONFIG.WEAPONS[pending.id]) {this.cancelWeaponReplacement();return;}
      // Replace exactly one slot, then consume the original reward exactly once.
      this.player.weapons[slot]=new Weapon(pending.id,CONFIG.WEAPONS[pending.id]);
      this._weaponReplacement=null;
      if(pending.choice.weaponId) {
        this.addMessage('替换武器：'+CONFIG.WEAPONS[pending.id].name,'#ffd040');
        if(!this.meta.unlockedWeapons.includes(pending.id)){this.meta.unlockedWeapons.push(pending.id);this.saveMeta();}
        Audio2.click();
        if(pending.source==='levelup')this.finishLevelUpSelection();else this.state='playing';
      } else original[pending.source==='levelup'?'selectUpgrade':'selectChestReward'].call(this,pending.index);
    },
    selectUpgrade(index) {
      if(this._weaponReplacement || this.requestWeaponReplacement('levelup',index))return;
      original.selectUpgrade.call(this,index);
    },
    selectChestReward(index) {
      const choice=this.chestRewardChoices[index];
      if(choice?.type==='evolution' && !this.checkEvolutions().some(e=>e.baseWeapon===choice.baseWeapon&&e.resultWeapon===choice.resultWeapon))return;
      if(this._weaponReplacement || this.requestWeaponReplacement('chestReward',index))return;
      original.selectChestReward.call(this,index);
    },
    resetBuildUI() {this._weaponReplacement=null;this._buildOpen=false;this._buildPage=0;this._buildTab='weapons';this._buildDetail=null;},
    startNewGame(...args){this.resetBuildUI();return original.startNewGame.apply(this,args);},
    loadAndContinue(...args){this.resetBuildUI();return original.loadAndContinue.apply(this,args);},
    migrateSave(data) {
      data=original.migrateSave.call(this,data);
      if(data && typeof data==='object') {
        const count=new Set((data.weapons||[]).filter(w=>CONFIG.WEAPONS[w.id]).map(w=>w.id)).size;
        data.weaponCapacity=Math.max(6,count,Math.min(38,Math.floor(Number(data.weaponCapacity)||6)));
        data.summonPactGranted=data.summonPactGranted ?? (data.weapons||[]).some(w=>w.id==='shadow_imp');
      }
      return data;
    },
    getPauseMenuButtons() {
      const v=this.getVisibleCanvasRect(), w=Math.min(240,v.w-32), h=40, gap=10;
      const x=v.x+(v.w-w)/2,y=v.y+(v.h-290)/2+40;
      return ['resume','build','save','menu','settings'].map((key,i)=>({key,x,y:y+i*(h+gap),w,h}));
    },
    openBuildPanel(){this._buildOpen=true;this._buildTab='weapons';this._buildPage=0;this._buildDetail=null;},
    updatePause() {
      if(this._settingsOverlay){this.updateSettingsOverlay();return;}
      if(this._buildOpen){this.updateBuildPanel(false);return;}
      if(Input.wasPressed('Escape')||Input.wasPressed('KeyP')){this.state='playing';Audio2.click();return;}
      for(const r of this.getPauseMenuButtons())if(Input.consumeClick(r.x,r.y,r.w,r.h)) {
        Audio2.click();
        if(r.key==='resume')this.state='playing';
        if(r.key==='build')this.openBuildPanel();
        if(r.key==='settings')this.openSettings();
        if(r.key==='save'){this.saveProgress();this.state='menu';Audio2.playMusic('menu');}
        if(r.key==='menu'){this.state='menu';Audio2.playMusic('menu');}
        return;
      }
      if(Input.wasPressed('KeyB'))this.openBuildPanel();
    },
    renderPause() {
      if(this._buildOpen){this.renderBuildPanel(false);return;}
      const c=this.ctx,v=this.getVisibleCanvasRect(),buttons=this.getPauseMenuButtons();
      c.fillStyle='rgba(0,0,0,.8)';c.fillRect(0,0,960,540);c.textAlign='center';c.font='bold 28px Courier New';c.fillStyle='#c4a87a';
      c.fillText('暂停',v.x+v.w/2,buttons[0].y-22);
      const labels=['继续游戏','构筑详情 [B]','保存并退出','返回主菜单','设置'];
      buttons.forEach((r,i)=>this.drawButton(r.x,r.y,r.w,r.h,labels[i],i===1?'#ffd040':'#c4a87a'));
    },
    getBuildEntries() {
      if(this._weaponReplacement || this._buildTab==='weapons')return this.player.weapons.map((w,i)=>({title:`${i+1}. ${w.def.name}  Lv.${w.level}`,subtitle:`伤害 ${Math.round(w.getDamage(this.player))} · ${[...this.getWeaponTags(w.id)].map(t=>CONFIG.BUILD_TAG_LABELS[t]||t).join(' / ')}`,icon:w.def.hudIcon||w.def.icon,weapon:w,index:i}));
      if(this._buildTab==='relics')return CONFIG.UPGRADES.filter(u=>(this.player.upgradeLevels[u.id]||0)>0).map(u=>({title:`${u.name} ${this.player.upgradeLevels[u.id]}/${u.maxLevel}`,subtitle:u.desc,icon:u.icon,description:u.desc}));
      if(this._buildTab==='evolutions')return CONFIG.WEAPON_EVOLUTIONS.filter(e=>this.player.weapons.some(w=>w.id===e.baseWeapon||w.id===e.resultWeapon)).map(e=>{
        const done=this.player.weapons.some(w=>w.id===e.resultWeapon),level=this.player.upgradeLevels[e.relic]||0, relic=CONFIG.UPGRADES.find(u=>u.id===e.relic);
        return {title:e.name,subtitle:done?'已进化':`${relic?.name||e.relic} ${level}/${e.relicMinLevel} · ${level>=e.relicMinLevel?'宝箱可选进化':'继续升级遗物'}`,icon:e.icon,description:`${e.desc}。${done?'已完成':`需要 ${relic?.name||e.relic} 达到 ${e.relicMinLevel} 级，再开启宝箱选择进化。原武器等级与槽位保留。`}`};
      });
      return [
        {title:'环绕流 · 近身游走',subtitle:'铁剑 + 环刃共振 + 护甲',description:'围绕敌群侧面移动，让环绕武器持续命中。先获得旋转速度提升，再选择环刃共振；范围与护甲帮助近身游走。在进化页查看铁剑的遗物需求。'},
        {title:'弹幕流 · 拉开距离',subtitle:'弓箭 + 弹幕校准 + 穿透',description:'选择弓箭等远程武器，移动拉开敌群距离。先获得弹丸速度提升，再选弹幕校准以提升伤害并触发连锁闪电；搭配攻速和穿透。'},
        {title:'召唤流 · 借军团牵制',subtitle:'暗影小鬼 + 召唤契约 + 移速',description:'召唤契约会提供暗影小鬼，满槽时先选择替换。优先召唤物伤害与持续时间，并用移速、护甲保护自己。替换掉小鬼后不会自动重新占用槽位。'}
      ];
    },
    getBuildPanelLayout() {
      const v=this.getVisibleCanvasRect(),w=Math.min(650,v.w-20),h=Math.min(470,v.h-20),x=v.x+(v.w-w)/2,y=v.y+(v.h-h)/2;
      const replacing=!!this._weaponReplacement,top=replacing?98:104,rowH=52;
      const pageSize=Math.max(1,Math.floor((h-top-76)/rowH));
      const rows=Array.from({length:pageSize},(_,i)=>({x:x+12,y:y+top+i*rowH,w:w-24,h:rowH-6}));
      return {x,y,w,h,pageSize,rows,tabs:Array.from({length:4},(_,i)=>({x:x+12+i*(w-24)/4,y:y+63,w:(w-24)/4-3,h:32})),
        prev:{x:x+12,y:y+h-65,w:48,h:28},next:{x:x+w-60,y:y+h-65,w:48,h:28},back:{x:x+12,y:y+h-32,w:w-24,h:26}};
    },
    updateBuildPanel(replacing) {
      const l=this.getBuildPanelLayout(),entries=this.getBuildEntries(),pages=Math.max(1,Math.ceil(entries.length/l.pageSize));
      const hit=r=>Input.consumeClick(r.x,r.y,r.w,r.h);
      if(Input.wasPressed('Escape')||hit(l.back)) {
        if(this._buildDetail){this._buildDetail=null;return;}
        if(replacing)this.cancelWeaponReplacement();else this._buildOpen=false;
        return;
      }
      if(this._buildDetail)return;
      if(!replacing)l.tabs.forEach((r,i)=>{if(hit(r)){this._buildTab=['weapons','relics','evolutions','guides'][i];this._buildPage=0;}});
      if(hit(l.prev)||Input.wasPressed('ArrowLeft'))this._buildPage=Math.max(0,(this._buildPage||0)-1);
      if(hit(l.next)||Input.wasPressed('ArrowRight'))this._buildPage=Math.min(pages-1,(this._buildPage||0)+1);
      l.rows.forEach((r,i)=>{
        const entry=entries[(this._buildPage||0)*l.pageSize+i];
        if(entry && (hit(r)||(replacing&&Input.wasPressed('Digit'+(i+1))))) {
          if(replacing)this.confirmWeaponReplacement(entry.index);
          else this._buildDetail=entry;
        }
      });
    },
    buildText(text,x,y,width,color='#c4a87a',size=12) {
      const c=this.ctx;c.textAlign='left';c.fillStyle=color;c.font=`${size}px Courier New`;
      while(c.measureText(text).width>width && text.length>1)text=text.slice(0,-2)+'…';
      c.fillText(text,x,y);
    },
    renderBuildPanel(replacing) {
      const c=this.ctx,l=this.getBuildPanelLayout(),entries=this.getBuildEntries(),page=this._buildPage||0,pages=Math.max(1,Math.ceil(entries.length/l.pageSize));
      c.fillStyle='rgba(5,5,12,.95)';c.fillRect(0,0,960,540);c.fillStyle='#14121b';c.fillRect(l.x,l.y,l.w,l.h);
      c.strokeStyle='#806747';c.strokeRect(l.x,l.y,l.w,l.h);
      this.buildText(replacing?'武器槽已满 · 选择替换':'旅人的构筑',l.x+14,l.y+27,l.w-28,'#ffd040',18);
      const pending=this._weaponReplacement;
      this.buildText(replacing?`新武器：${CONFIG.WEAPONS[pending.id].name}`:`武器 ${this.player.weapons.length}/${this.player.weaponCapacity} · 遗物与进化 · 点击查看`,l.x+14,l.y+49,l.w-28);
      if(this._buildDetail) {
        const e=this._buildDetail;
        this.buildText(e.title,l.x+14,l.y+87,l.w-28,'#ffd040',15);
        c.font='13px Courier New';c.textAlign='left';c.fillStyle='#d1c5aa';
        const text=e.description || this.getChoiceDescription({weaponId:e.weapon.id});
        this.drawTextBlock(c,text,l.x+14,l.y+116,l.w-28,20,Math.floor((l.h-158)/20));
      } else {
        if(!replacing)l.tabs.forEach((r,i)=>this.drawButton(r.x,r.y,r.w,r.h,['武器','遗物','进化','流派'][i],this._buildTab===['weapons','relics','evolutions','guides'][i]?'#ffd040':'#806747'));
        else this.buildText('替换重置 Lv.1 · 取消保留奖励',l.x+14,l.y+79,l.w-28,'#e09880',11);
        l.rows.forEach((r,i)=>{
          const e=entries[page*l.pageSize+i];if(!e)return;
          c.fillStyle='#211e29';c.fillRect(r.x,r.y,r.w,r.h);c.strokeStyle='#665139';c.strokeRect(r.x,r.y,r.w,r.h);
          const img=e.icon&&Assets.get(e.icon);
          if(img)Assets.draw(c,e.icon,r.x+23,r.y+23,30/Math.max(img.width,img.height));
          const offset=e.icon?45:10;
          this.buildText(e.title,r.x+offset,r.y+18,r.w-offset-8,'#efdcad',13);
          this.buildText(e.subtitle,r.x+offset,r.y+36,r.w-offset-8,'#a79aa8',11);
        });
        if(!entries.length)this.buildText(this._buildTab==='evolutions'?'当前武器暂无进化配方':'还未获得遗物',l.x+14,l.y+130,l.w-28);
        this.drawButton(l.prev.x,l.prev.y,l.prev.w,l.prev.h,'←','#806747');this.drawButton(l.next.x,l.next.y,l.next.w,l.next.h,'→','#806747');
        c.textAlign='center';c.font='12px Courier New';c.fillStyle='#c4a87a';c.fillText(`${page+1} / ${pages}`,l.x+l.w/2,l.prev.y+18);
      }
      this.drawButton(l.back.x,l.back.y,l.back.w,l.back.h,this._buildDetail?'返回列表':replacing?'取消替换 · 返回奖励':'返回暂停','#c4a87a');
    },
    updateLevelUp(){if(this._weaponReplacement)this.updateBuildPanel(true);else original.updateLevelUp.call(this);},
    updateChestReward(){if(this._weaponReplacement)this.updateBuildPanel(true);else original.updateChestReward.call(this);},
    renderLevelUp(){if(this._weaponReplacement)this.renderBuildPanel(true);else original.renderLevelUp.call(this);},
    renderChestReward(){if(this._weaponReplacement)this.renderBuildPanel(true);else original.renderChestReward.call(this);}
  });
})();
