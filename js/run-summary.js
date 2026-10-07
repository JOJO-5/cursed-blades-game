// Campaign accounting keeps levelTime local to each biome and archives transitions.
(() => {
  const original={};for(const key of ['startNewGame','loadLevel','updateMeta','onBossDefeated'])original[key]=Game[key];
  const nonnegative=value=>Number.isFinite(Number(value))?Math.max(0,Number(value)):0;
  Object.assign(Game,{
    runHistory:[],runStartKills:0,runStartChests:0,runHistoryComplete:true,_runTracking:false,
    startNewGame(...args){this.runHistory=[];this.runHistoryComplete=true;this._runTracking=false;return original.startNewGame.apply(this,args);},
    loadLevel(...args){
      if(this._runTracking&&this.levelData&&this.player)this.runHistory.push(this.getCurrentStageRecord());
      const result=original.loadLevel.apply(this,args);
      this.runStartKills=this.player?.kills||0;this.runStartChests=this.chestsOpened||0;this._runTracking=true;return result;
    },
    getCurrentStageRecord(){return {theme:this.levelData.theme,seconds:nonnegative(this.levelTime),kills:Math.max(0,(this.player?.kills||0)-this.runStartKills),chests:Math.max(0,(this.chestsOpened||0)-this.runStartChests),completed:!!this.bossDefeated};},
    getRunSummary(){const levels=[...this.runHistory,this.getCurrentStageRecord()];return {levels,seconds:levels.reduce((sum,r)=>sum+r.seconds,0),complete:this.runHistoryComplete};},
    restoreRunHistory(data){
      const tiers=[['village'],['mine','frost'],['hell','marsh']];
      const route=Array.isArray(data.campaignRoute)?data.campaignRoute:[];
      const valid=data.campaignMode===true&&route.length>=1&&route.length<=3&&route.every((id,i)=>tiers[i].includes(id))&&route.at(-1)===data.levelId;
      this.campaignMode=valid;this.campaignRoute=valid?[...route]:[];this.campaignFinished=valid&&route.length===3&&data.campaignFinished===true;
      if(valid){
        const history=Array.isArray(data.runHistory)?data.runHistory:[];
        this.runHistory=route.slice(0,-1).flatMap(theme=>{const r=history.find(r=>r?.theme===theme&&Number.isFinite(r.seconds)&&r.seconds>=0);return r?[{theme,seconds:r.seconds,kills:Math.floor(nonnegative(r.kills)),chests:Math.floor(nonnegative(r.chests)),completed:!!r.completed}]:[];});
        this.runStartKills=Math.floor(nonnegative(data.runStartKills));this.runStartChests=Math.floor(nonnegative(data.runStartChests));this.runHistoryComplete=data.runHistoryComplete!==false&&this.runHistory.length===route.length-1;this._runTracking=true;return;
      }
      const current=['village','mine','hell'].indexOf(data.levelId),seen=new Set();
      this.runHistory=(Array.isArray(data.runHistory)?data.runHistory:[]).filter(r=>{
        const index=['village','mine','hell'].indexOf(r?.theme);
        if(index<0||index>=current||seen.has(r.theme)||!Number.isFinite(r.seconds)||r.seconds<0)return false;
        seen.add(r.theme);return true;
      }).slice(0,2).map(r=>({theme:r.theme,seconds:r.seconds,kills:Math.floor(nonnegative(r.kills)),chests:Math.floor(nonnegative(r.chests)),completed:!!r.completed}));
      this.runStartKills=Math.floor(nonnegative(data.runStartKills??0));this.runStartChests=Math.floor(nonnegative(data.runStartChests??0));
      this.runHistoryComplete=data.runHistoryComplete!==false&&(current===0||this.runHistory.length===current);
      this._runTracking=true;
    },
    getEndingText(){const name=CONFIG.ENEMIES[this.levelData.bossId]?.name||'最终首领';return `${name}已被击败，诅咒已消散。`;},
    formatRunTime(){const summary=this.getRunSummary(),seconds=Math.floor(summary.seconds);return `${summary.complete?'总用时':'已记录用时'}: ${Math.floor(seconds/60)}分${seconds%60}秒`;},
    getEndingLayout(){const v=this.getVisibleCanvasRect(),w=Math.min(220,v.w-32),x=v.x+(v.w-w)/2;return {visible:v,x:v.x+16,w:v.w-32,cx:v.x+v.w/2,restart:{x,y:v.y+v.h-116,w,h:42},menu:{x,y:v.y+v.h-60,w,h:42}};},
    getGameOverButtons(){const l=this.getEndingLayout();return {restart:l.restart,menu:l.menu};},
    updateVictory(){const r=this.getEndingLayout().menu;if(Input.consumeClick(r.x,r.y,r.w,r.h)){this.state='menu';Audio2.playMusic('menu');Audio2.click();}},
    renderEnding(victory){
      const c=this.ctx,l=this.getEndingLayout(),v=l.visible,compact=v.w<400,summary=this.getRunSummary();
      c.save();c.fillStyle=victory?'#07120b':'#160a0a';c.fillRect(0,0,960,540);
      const line=(text,y,color='#c4a87a',size=compact?12:15)=>{c.font=`${size}px Courier New`;c.textAlign='center';c.fillStyle=color;c.fillText(this.fitChoiceBadgeText(c,text,l.w),l.cx,v.y+y);};
      line(victory?(this.levelData.challenge&&!this.campaignMode?'远征完成！':'最终通关！'):'旅途止步',65,victory?'#7dd8a0':'#ff7060',compact?30:44);
      c.font=`${compact?12:15}px Courier New`;c.textAlign='center';c.fillStyle='#c4a87a';
      this.drawTextBlock(c,victory?this.getEndingText():'整理构筑，下一次再挑战。',l.cx,v.y+105,Math.min(l.w,540),18,2);
      line(`等级 ${this.player.level} · 击杀 ${this.player.kills}`,157);
      line(this.formatRunTime(),182,'#efdcad');
      line(`精英 ${this.eliteKills} · 首领 ${this.bossKills} · 宝箱 ${this.chestsOpened}`,207,'#bbae8f');
      summary.levels.slice(-3).forEach((r,i)=>line(`${CONFIG.LEVELS[r.theme].name} · ${Math.floor(r.seconds/60)}:${String(Math.floor(r.seconds%60)).padStart(2,'0')}`,237+i*20,'#8fa991',compact?11:13));
      c.font='11px Courier New';c.textAlign='center';c.fillStyle='#a8bdd1';
      this.drawTextBlock(c,this.player.weapons.map(w=>`${w.def.name} Lv.${w.level}`).join(' · '),l.cx,v.y+315,Math.min(l.w,600),16,3);
      if(victory)line('旅者继续踏上新的旅途。',402,'#8a7a5a',11);
      else {
        line(`最佳 Lv.${this.meta.bestLevel} · ${this.meta.bestKills}击杀`,379,'#8fa991',11);
        const best=Math.floor(this.meta.bestSurvivalTime||0);line(`最长记录 ${Math.floor(best/60)}分${best%60}秒`,398,'#8fa991',11);
        this.drawButton(l.restart.x,l.restart.y,l.restart.w,l.restart.h,'重新开始','#c4a87a');
      }
      this.drawButton(l.menu.x,l.menu.y,l.menu.w,l.menu.h,'返回主菜单',victory?'#c4a87a':'#aa6a4a');c.restore();
    },
    renderGameOver(){this.renderEnding(false);},renderVictory(){this.renderEnding(true);},
    updateMeta(){this.meta.bestSurvivalTime=Math.max(this.meta.bestSurvivalTime||0,this.getRunSummary().seconds);return original.updateMeta.call(this);},
    onBossDefeated(){const already=this.bossDefeated;const result=original.onBossDefeated.call(this);if(!already)this.updateMeta();return result;},
  });
})();
