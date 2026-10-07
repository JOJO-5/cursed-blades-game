// Branching campaign progression.
(() => {
  const old={};for(const key of ['startNewGame','loadAndContinue','startVictorySequence','update','render'])old[key]=Game[key];
  const routes={
    mine:{title:'幽暗矿洞',desc:'矿车护送 · 地底虫群',reward:'锻造补给：伤害 +8%',apply:p=>p.stats.damageMult*=1.08,color:'#bd9dcc'},
    frost:{title:'寒霜墓园',desc:'暴风雪 · 火炬庇护',reward:'守夜补给：最大生命 +15',apply:p=>p.stats.maxHpBonus+=15,color:'#a6d2df'},
    hell:{title:'地狱熔渊',desc:'熔岩裂隙 · 地狱炎龙',reward:'烈焰补给：攻击冷却缩短 8%',apply:p=>p.stats.cooldownMult*=.92,color:'#eeab76'},
    marsh:{title:'沉没遗迹',desc:'潮汐水洼 · 净潮石碑',reward:'净潮补给：移动速度 +8%',apply:p=>p.stats.moveSpeedMult*=1.08,color:'#9dccae'}
  };
  Object.assign(Game,{
    campaignMode:false,campaignRoute:[],campaignFinished:false,_victoryPending:false,
    startNewGame(...args){
      if(this.state==='gameover'&&this.player)this.selectedExpedition=this.campaignMode?'campaign':this.levelData.challenge?this.levelData.theme:'campaign';
      this.campaignMode=this.selectedExpedition==='campaign';this.campaignRoute=this.campaignMode?['village']:[];this.campaignFinished=false;this._victoryPending=false;
      return old.startNewGame.apply(this,args);
    },
    getCampaignRouteOptions(){return this.levelData?.theme==='village'?['mine','frost']:['mine','frost'].includes(this.levelData?.theme)?['hell','marsh']:[];},
    finishCampaignStage(){
      if(this.getCampaignRouteOptions().length){this.state='routeChoice';this.saveProgress();}
      else {this.campaignFinished=true;this.state='victory';this.updateMeta();Audio2.playMusic('victory');this.saveProgress();}
    },
    startVictorySequence(){
      if(!this.campaignMode)return old.startVictorySequence.call(this);
      if(this._victoryPending)return;this._victoryPending=true;
      const theme=this.levelData.theme;
      setTimeout(()=>{
        if(!this.campaignMode||this.levelData.theme!==theme||!this.bossDefeated)return;
        this.startStory([{speaker:'旅者',text:this.getCampaignRouteOptions().length?'首领已经倒下。收好战利品，在岔路选择下一段旅程。':'三段旅程终于走到尽头。诅咒散去，这条路线的故事由你完成。'}],()=>this.finishCampaignStage(),'routeVictory');
      },1000);
    },
    chooseCampaignRoute(id){
      if(this.state!=='routeChoice'||!this.campaignMode||!this.getCampaignRouteOptions().includes(id))return false;
      this.campaignRoute.push(id);routes[id].apply(this.player);this._victoryPending=false;
      this.loadLevel(id);this.saveProgress();return true;
    },
    loadAndContinue(){
      this.campaignMode=false;this.campaignRoute=[];this.campaignFinished=false;this._victoryPending=false;
      old.loadAndContinue.call(this);
      if(this.campaignMode){this.selectedExpedition='campaign';
        if(this.campaignFinished)this.state='victory';
        else if(this.bossDefeated&&this.bossDefeatedGraceTimer<=0)this.state='routeChoice';
      }
    },
    getCampaignRouteLayout(){
      const v=this.getVisibleCanvasRect(),w=Math.min(600,v.w-32),h=Math.min(140,(v.h-170)/2),x=v.x+(v.w-w)/2;
      return {visible:v,cards:this.getCampaignRouteOptions().map((id,i)=>({id,x,y:v.y+110+i*(h+14),w,h})),menu:{x,y:v.y+v.h-40,w,h:28}};
    },
    update(dt){
      if(this.state!=='routeChoice')return old.update.call(this,dt);
      const l=this.getCampaignRouteLayout();
      for(const [i,r] of l.cards.entries())if(Input.wasPressed('Digit'+(i+1))||Input.consumeClick(r.x,r.y,r.w,r.h)){Audio2.click();this.chooseCampaignRoute(r.id);return;}
      const r=l.menu;if(Input.consumeClick(r.x,r.y,r.w,r.h)||Input.wasPressed('Escape')){this.saveProgress();this.state='menu';Audio2.playMusic('menu');}
    },
    render(){old.render.call(this);if(this.state==='routeChoice')this.renderCampaignRoutes();},
    renderCampaignRoutes(){
      const c=this.ctx,l=this.getCampaignRouteLayout(),v=l.visible;
      c.save();c.fillStyle='rgba(8,15,13,.95)';c.fillRect(0,0,960,540);c.textAlign='center';c.fillStyle='#e5cf99';c.font='bold 24px Courier New';c.fillText('选择下一段旅程',v.x+v.w/2,v.y+48);
      c.font='12px Courier New';c.fillStyle='#a7b7ab';c.fillText(this.campaignRoute.map(id=>CONFIG.LEVELS[id].name).join(' → '),v.x+v.w/2,v.y+78);
      for(const [i,r] of l.cards.entries()){
        const d=routes[r.id];c.fillStyle='#1a2823';c.fillRect(r.x,r.y,r.w,r.h);c.strokeStyle=d.color;c.lineWidth=2;c.strokeRect(r.x,r.y,r.w,r.h);
        c.fillStyle=d.color;c.font='bold 18px Courier New';c.fillText(`${i+1} · ${d.title}`,r.x+r.w/2,r.y+29);
        c.font='12px Courier New';c.fillStyle='#b6c0b7';c.fillText(d.desc,r.x+r.w/2,r.y+53);
        c.fillStyle='#e0cd9a';c.fillText(d.reward,r.x+r.w/2,r.y+77);
        c.fillStyle='#819b90';c.font='11px Courier New';c.fillText(`首领约 ${CONFIG.LEVELS[r.id].bossSpawnTime/60} 分钟 · 点击选择`,r.x+r.w/2,r.y+r.h-13);
      }
      const r=l.menu;this.drawButton(r.x,r.y,r.w,r.h,'保存并返回菜单','#a7b7ab');c.restore();
    }
  });
})();
