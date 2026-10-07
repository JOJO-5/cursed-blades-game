// Finite world encounters. Sites follow the map seed; progress follows the save.
Object.assign(Game, {
  levelEncounters: [],

  getLevelEncounterDefinitions() { return this.levelData.encounters || []; },

  initLevelEncounters() {
    const definitions = this.getLevelEncounterDefinitions();
    const rng = makeRNG((this.runSeed ^ 0x43616d70) >>> 0);
    const direction = Math.floor(rng() * 4);
    const cx = this.levelData.mapW * CONFIG.TILE_SIZE/2, cy = this.levelData.mapH * CONFIG.TILE_SIZE/2;
    this.levelEncounters = definitions.map((def, index) => {
      const angle = ((direction + index + 1) % 4) * Math.PI/2;
      const radius = def.distance + Math.floor(rng() * 24);
      return {id: def.id, x: cx + Math.cos(angle)*radius, y: cy + Math.sin(angle)*radius,
        status: this.levelTime >= def.availableAt ? 'ready' : 'waiting', rewardSpawned: false};
    });
  },

  serializeEncounters() {
    return this.levelEncounters.map(site => ({id: site.id, status: site.status, rewardSpawned: site.rewardSpawned,
      enemies: this.enemies.filter(e => e.alive && e.encounterId === site.id)
        .map(e => ({type: e.type, x: e.x, y: e.y, hp: e.hp}))}));
  },

  restoreLevelEncounters(saved) {
    if (!Array.isArray(saved)) return;
    for (const site of this.levelEncounters) {
      const data = saved.find(s => s && s.id === site.id);
      if (!data || !['waiting','ready','active','complete','expired'].includes(data.status)) continue;
      site.status = data.status;
      site.rewardSpawned = data.status === 'complete' || !!data.rewardSpawned;
      if (site.status !== 'active') continue;
      const def = this.levelData.encounters.find(d => d.id === site.id);
      for (const member of (Array.isArray(data.enemies) ? data.enemies : []).slice(0, def.count)) {
        if (!def.enemyPool.includes(member.type) || !Number.isFinite(member.hp) || member.hp <= 0) continue;
        const enemy = new Enemy(member.type,
          clamp(Number.isFinite(member.x) ? member.x : site.x, 32, this.levelData.mapW*CONFIG.TILE_SIZE-32),
          clamp(Number.isFinite(member.y) ? member.y : site.y, 32, this.levelData.mapH*CONFIG.TILE_SIZE-32));
        enemy.hp = Math.min(enemy.maxHp, member.hp); enemy.encounterId = site.id;
        this.enemies.push(enemy);
      }
    }
  },

  startLevelEncounter(site) {
    const def = this.levelData.encounters.find(d => d.id === site.id);
    if (!def || site.status !== 'ready' || this.bossSpawned) return false;
    const cost = Math.ceil(this.player.getMaxHp() * (def.healthCost || 0));
    if (this.player.hp <= cost) { this.addMessage('生命不足，无法献祭', '#ff8060'); return false; }
    const wave = [];
    // Reserve the whole encounter footprint during map generation; fallback
    // positions still need to be clear if map content changes later.
    for (let i = 0; i < def.count; i++) {
      const type = def.enemyPool[i % def.enemyPool.length], radius = CONFIG.ENEMIES[type].radius || 16;
      let position = null;
      for (let attempt = 0; attempt < 24; attempt++) {
        const angle = i/def.count*TAU + attempt*.27;
        const ring = 130 + Math.floor(attempt/8)*24;
        const x = site.x + Math.cos(angle)*ring, y = site.y + Math.sin(angle)*ring;
        if (!this.isCircleBlocked(x,y,radius)) { position = {x,y}; break; }
      }
      if (!position) return false; // Never charge health for an incomplete wave.
      const enemy = new Enemy(type,position.x,position.y);enemy.encounterId=site.id;wave.push(enemy);
    }
    site.status = 'active';this.player.hp -= cost;this.enemies.push(...wave);
    this.addMessage(`${def.name}：清理 ${def.count} 只守卫`, '#ffd080');Audio2.click();
    return true;
  },

  advanceWorldEncounter() { return true; },

  updateLevelEncounters(dt = 0) {
    if (!this.player?.alive || this.state !== 'playing') return;
    for (const site of this.levelEncounters) {
      const def = this.levelData.encounters.find(d => d.id === site.id);
      if (this.bossSpawned && !['complete','expired'].includes(site.status)) {site.status='expired';continue;}
      if (site.status === 'active') {
        if (!this.enemies.some(e => e.alive && e.encounterId === site.id) && this.advanceWorldEncounter(site,def,dt)) {
          site.status = 'complete';
          if (!site.rewardSpawned) {
            site.rewardSpawned = true;
            const reward = this.pickupPool.obtain(site.x,site.y,'chest','items/chest',def.reward);
            reward.objectiveId=site.id;reward.life=300;reward.vx=0;reward.vy=0;
            this.pickups.push(reward);this.addMessage(`${def.name}净化 · ${def.reward === 1 ? '稀有' : ''}宝箱已出现`, '#8ddd9c');
          }
        }
        continue;
      }
      if (['complete','expired'].includes(site.status)) continue;
      if (this.bossSpawned) { site.status='expired';continue; }
      if (site.status === 'waiting' && this.levelTime >= def.availableAt) {
        site.status='ready';this.addMessage(`${def.name}已显现，跟随金色指引`, '#d4b87a');
      }
      if (site.status !== 'ready' || dist(this.player.x,this.player.y,site.x,site.y)>def.triggerRadius) continue;
      if (!def.healthCost && !def.manual) this.startLevelEncounter(site);
      else {
        const b=this.getEncounterActionButton();
        if (Input.wasPressed('KeyE') || Input.consumeClick(b.x,b.y,b.w,b.h)) this.startLevelEncounter(site);
      }
    }
  },

  getObjectiveLayout() {
    const v=this.getVisibleCanvasRect(), portrait=this.isPortrait();
    return {x:v.x+12,y:v.y+(portrait ? (this.bossSpawned ? 148 : 116) : 84),
      w:Math.min(portrait ? v.w-24 : 300,v.w-24),h:72};
  },

  getEncounterActionButton() {
    const p=this.getObjectiveLayout();return {x:p.x+8,y:p.y+p.h-33,w:p.w-16,h:28};
  },

  getCurrentObjective() {
    if (!this.player) return null;
    if (this.bossDefeated) return {title:'收集战利品',detail:`${Math.ceil(this.bossDefeatedGraceTimer)}秒后继续旅程`,next:'Boss 已击败'};
    if (this.bossSpawned) return {title:`击败${CONFIG.ENEMIES[this.levelData.bossId || 'boss'].name}`,detail:'躲开红色预警，寻找输出窗口',next:'击败 Boss 后进入下一关'};
    const active=this.levelEncounters.find(s=>s.status==='active');
    const target=active || this.levelEncounters.find(s=>s.status==='ready') || this.levelEncounters.find(s=>s.status==='waiting');
    const nextPhase=(this.levelData.phases||[]).find(p=>p.time>this.levelTime);
    const next=nextPhase ? `${nextPhase.name} · ${Math.ceil(nextPhase.time-this.levelTime)}秒` : '保持移动，收集经验';
    if (!target) return {title:this.getActivePhase()?.name || '探索与成长',detail:'收集经验，强化构筑，准备迎战 Boss',next};
    const def=this.levelData.encounters.find(d=>d.id===target.id);
    const distance=Math.ceil(dist(this.player.x,this.player.y,target.x,target.y));
    const near=distance<=def.triggerRadius;
    return {site:target,title:target.status==='active' ? `${def.mode==='escort'?'护送':def.mode==='seal'?'封印':'净化'}${def.name}` : `调查${def.name}`,
      detail:def.mode && target.status!=='waiting' ? this.getEncounterObjectiveDetail(target,def,distance) : target.status==='waiting' ? `${Math.ceil(def.availableAt-this.levelTime)}秒后显现 · 跟随金色指引` :
        target.status==='active' ? `守卫剩余 ${this.enemies.filter(e=>e.alive&&e.encounterId===target.id).length}/${def.count} · ${def.reward===1?'稀有':''}宝箱` :
        def.healthCost ? `${Math.ceil(distance/CONFIG.TILE_SIZE)}格 · 献祭15%生命 → 稀有宝箱` : `${Math.ceil(distance/CONFIG.TILE_SIZE)}格 · 靠近触发3只守卫，清理获宝箱`,
      action:target.status==='ready' && near && !!(def.healthCost || def.manual),next};
  },

  renderObjectiveHUD() {
    const objective=this.getCurrentObjective();if(!objective)return;
    const ctx=this.ctx,p=this.getObjectiveLayout();
    ctx.save();ctx.fillStyle='rgba(20,16,10,0.86)';ctx.fillRect(p.x,p.y,p.w,p.h);
    ctx.strokeStyle='#715833';ctx.lineWidth=1;ctx.strokeRect(p.x,p.y,p.w,p.h);
    ctx.textAlign='left';ctx.fillStyle='#f4d28c';ctx.font='bold 12px Courier New';
    ctx.fillText(this.fitChoiceBadgeText(ctx,objective.title,p.w-16),p.x+8,p.y+16);
    ctx.font='10px Courier New';ctx.fillStyle='#e1cfac';
    ctx.fillText(this.fitChoiceBadgeText(ctx,objective.detail,p.w-16),p.x+8,p.y+32);
    if(objective.action) {
      const b=this.getEncounterActionButton();this.drawButton(b.x,b.y,b.w,b.h,this.getEncounterActionLabel ? this.getEncounterActionLabel(objective.site) : '挑战5只守卫 · E / 点按','#d4a65c');
    } else {
      ctx.fillStyle='#a69d88';ctx.fillText(this.fitChoiceBadgeText(ctx,`下一事件：${objective.next}`,p.w-16),p.x+8,p.y+51);
    }
    const site=objective.site;
    if(site && ['waiting','ready','active'].includes(site.status)) {
      const v=this.getVisibleCanvasRect(),sx=site.x-this.camera.x,sy=site.y-this.camera.y;
      const x=clamp(sx,v.x+24,v.x+v.w-24),y=clamp(sy,p.y+p.h+28,v.y+v.h-100);
      if(sx!==x || sy!==y) {
        ctx.translate(x,y);ctx.rotate(angleTo(this.player.x,this.player.y,site.x,site.y));
        ctx.fillStyle='#f4cc72';ctx.beginPath();ctx.moveTo(10,0);ctx.lineTo(-6,-7);ctx.lineTo(-6,7);ctx.closePath();ctx.fill();
      }
    }
    ctx.restore();
  },

  renderEncounterSites(ctx) {
    for(const site of this.levelEncounters) {
      if(site.status==='expired'||!this.isOnScreen(site.x,site.y,180))continue;
      const def=this.levelData.encounters.find(d=>d.id===site.id);
      const color=site.status==='complete' ? '#73ba87' : site.status==='active' ? '#ef8057' : '#d7b46d';
      ctx.save();
      this.drawSceneObjective(ctx,site);
      ctx.textAlign='center';ctx.font='bold 12px Courier New';ctx.fillStyle=color;
      ctx.fillText(`${def.name}${site.status==='complete'?' · 已净化':''}`,site.x,site.y+25);
      ctx.restore();
    }
  },
});
