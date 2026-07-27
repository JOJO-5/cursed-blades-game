// ============================================================
// game.js — Main game logic, states, map gen, spawning, UI
// ============================================================

const Game = {
  canvas: null,
  ctx: null,
  state: 'loading', // loading, menu, story, playing, paused, levelup, gameover, victory, chestReward
  prevState: null,
  player: null,
  enemies: [],
  projectiles: [],
  enemyProjectiles: [],
  pickups: [],
  particles: [],
  damageNumbers: [],
  messages: [],

  camera: { x: 0, y: 0, shakeX: 0, shakeY: 0, shakeTime: 0, shakeMag: 0 },
  damageVignette: 0,
  time: 0,
  levelTime: 0,
  spawnTimer: 0,
  eliteTimer: 0,
  bossSpawned: false,
  bossDefeated: false,
  levelData: null,
  mapData: null,
  propPositions: [],
  collisionProps: [],   // solid props for collision detection
  groundTileCache: null,
  forcedLandscape: false,  // user toggled force-landscape on portrait screens
  currentPhase: -1,        // index into levelData.phases, -1 = not started
  triggeredPhases: {},     // phase index -> true once events fired

  upgradeChoices: [],
  chestRewardChoices: [],

  // settings overlay state
  _settingsOverlay: false,
  _dragSlider: null,    // which slider is being dragged: 'master'|'sfx'|'music'|null

  // run statistics (persist across levels within a run, reset on new game)
  eliteKills: 0,
  bossKills: 0,
  chestsOpened: 0,

  saveKey: 'cursed_blades_save',
  metaKey: 'cursed_blades_meta',
  saveSchemaVersion: 3,

  // ---- Initialization ----
  init() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    // Responsive canvas scaling - fill screen while maintaining 16:9 aspect ratio
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resizeCanvas(), 100));

    Input.init(this.canvas);

    Assets.onProgress = (loaded, total) => {
      const pct = Math.floor((loaded / total) * 100);
      document.getElementById('loading-fill').style.width = pct + '%';
      document.getElementById('loading-text').textContent = pct + '%';
    };

    // load manifest
    fetch('assets/manifest.json')
      .then(r => r.json())
      .then(manifest => Assets.loadList(manifest))
      .then(() => {
        Audio2.init();
        this.loadMeta();
        this.state = 'menu';
        document.getElementById('loading-screen').style.display = 'none';
        this.loop();
      })
      .catch(err => {
        console.error('Load error:', err);
        // try loading with known assets anyway
        this.fallbackLoad();
      });
  },

  resizeCanvas() {
    // Fill the entire screen using "cover" strategy (may crop edges slightly)
    // Internal resolution stays 960x540, CSS scales to fill viewport
    const container = document.getElementById('game-container');
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const gameAspect = CONFIG.CANVAS_W / CONFIG.CANVAS_H; // 1.7778

    const screenPortrait = winH > winW;
    // When forcedLandscape is on and screen is portrait, we rotate the canvas 90deg
    const rotate90 = this.forcedLandscape && screenPortrait;
    // Set before calculating visible bounds for touch anchors.
    this._rotate90 = rotate90;

    let cssW, cssH;

    if (rotate90) {
      // Screen is portrait but we want landscape view:
      // Swap screen dimensions so we treat it as landscape
      const effW = winH;  // treat screen height as width
      const effH = winW;  // treat screen width as height
      const effAspect = effW / effH;
      if (effAspect > gameAspect) {
        cssW = effW;
        cssH = effW / gameAspect;
      } else {
        cssH = effH;
        cssW = effH * gameAspect;
      }
      // The canvas is sized as landscape but rotated to fit portrait screen
      this.canvas.style.width = cssW + 'px';
      this.canvas.style.height = cssH + 'px';
      this.canvas.style.position = 'absolute';
      // Rotate 90 degrees clockwise around center, then position
      this.canvas.style.left = '50%';
      this.canvas.style.top = '50%';
      this.canvas.style.transform = 'translate(-50%, -50%) rotate(90deg)';
    } else {
      // Normal mode: no rotation
      const screenAspect = winW / winH;
      if (screenAspect > gameAspect) {
        cssW = winW;
        cssH = winW / gameAspect;
      } else {
        cssH = winH;
        cssW = winH * gameAspect;
      }
      this.canvas.style.width = cssW + 'px';
      this.canvas.style.height = cssH + 'px';
      this.canvas.style.position = 'absolute';
      this.canvas.style.left = '50%';
      this.canvas.style.top = '50%';
      this.canvas.style.transform = 'translate(-50%, -50%)';
    }

    if (container) {
      container.style.width = winW + 'px';
      container.style.height = winH + 'px';
      container.style.overflow = 'hidden';
      container.style.position = 'relative';
    }

    // Anchor controls to the actually visible canvas in every aspect ratio.
    // Forced landscape can still crop the top/bottom on tall phones.
    const visible = this.getVisibleCanvasRect();
    Input.joystick.anchorX = visible.x + 75;
    Input.joystick.anchorY = visible.y + visible.h - 75;
    Input.dashButton.anchorX = visible.x + visible.w - 70;
    Input.dashButton.anchorY = visible.y + visible.h - 85;

  },

  toggleForcedLandscape() {
    this.forcedLandscape = !this.forcedLandscape;
    this.resizeCanvas();
    Audio2.click();
  },

  fallbackLoad() {
    const manifest = {};
    const cats = ['player','enemies','bosses','weapons','items','ui','tiles','props','backgrounds','effects'];
    // We'll just proceed with what we have
    Audio2.init();
    this.state = 'menu';
    document.getElementById('loading-screen').style.display = 'none';
    this.loop();
  },

  // ---- Game loop ----
  loop(timestamp) {
    if (!this._lastTime) this._lastTime = timestamp || 0;
    const now = timestamp || performance.now();
    let dt = (now - this._lastTime) / 1000;
    this._lastTime = now;
    if (dt > 0.05) dt = 0.05; // cap

    this.update(dt);
    this.render();

    Input.clearFrame();
    requestAnimationFrame((t) => this.loop(t));
  },

  update(dt) {
    this.time += dt;

    // Rotate button click (works in all states, both mouse and touch)
    const rotateButton = this.getRotateButtonRect();
    if (Input.mouse.clicked && Input.isMouseInRect(rotateButton.x, rotateButton.y, rotateButton.w, rotateButton.h)) {
      Input.mouse.clicked = false;
      this.toggleForcedLandscape();
    }

    // camera shake decay
    if (this.camera.shakeTime > 0) {
      this.camera.shakeTime -= dt;
      const t = this.camera.shakeTime;
      this.camera.shakeX = (Math.random() - 0.5) * this.camera.shakeMag * (t > 0 ? 1 : 0);
      this.camera.shakeY = (Math.random() - 0.5) * this.camera.shakeMag * (t > 0 ? 1 : 0);
    } else {
      this.camera.shakeX = 0;
      this.camera.shakeY = 0;
    }

    // damage vignette decay
    if (this.damageVignette > 0) {
      this.damageVignette = Math.max(0, this.damageVignette - dt);
    }

    if (this.state === 'playing') {
      this.levelTime += dt;
      this.updatePlaying(dt);
    } else if (this.state === 'story') {
      this.updateStory(dt);
    } else if (this.state === 'levelup') {
      this.updateLevelUp();
    } else if (this.state === 'chestReward') {
      this.updateChestReward();
    } else if (this.state === 'paused') {
      this.updatePause();
    } else if (this.state === 'menu') {
      this.updateMenu();
    } else if (this.state === 'gameover') {
      this.updateGameOver();
    } else if (this.state === 'victory') {
      this.updateVictory();
    }

    // always update particles/messages for visual continuity in some states
    if (this.state !== 'paused' && this.state !== 'loading') {
      // skip particle updates for off-screen particles (purely visual)
      for (const p of this.particles) {
        if (this.isOnScreen(p.x, p.y, 60)) p.update(dt);
      }
      this.particles = this.particles.filter(p => p.alive);
      for (const d of this.damageNumbers) d.update(dt);
      this.damageNumbers = this.damageNumbers.filter(d => d.alive);
      for (const m of this.messages) m.life -= dt;
      this.messages = this.messages.filter(m => m.life > 0);
    }
  },

  // ---- Performance: off-screen culling ----
  // CULL_MARGIN: entities beyond this many pixels from the visible canvas edge are skipped.
  CULL_MARGIN: 280,

  // Returns true if the point (x, y) is within the visible canvas area + margin.
  isOnScreen(x, y, margin) {
    margin = margin !== undefined ? margin : 0;
    const camX = this.camera.x;
    const camY = this.camera.y;
    return x > camX - margin && x < camX + CONFIG.CANVAS_W + margin &&
           y > camY - margin && y < camY + CONFIG.CANVAS_H + margin;
  },

  updatePlaying(dt) {
    if (!this.player.alive) {
      this.state = 'gameover';
      this.updateMeta();
      this.saveProgress();
      return;
    }

    // trigger pending mimic encounter story
    if (this.pendingMimicStory) {
      this.pendingMimicStory = false;
      this.startStory(CONFIG.STORY.mimicEncounter, () => { this.state = 'playing'; });
      return;
    }

    this.player.update(dt);

    // update enemies — skip far-off-screen enemies for performance (bosses always update)
    const cm = this.CULL_MARGIN;
    for (const e of this.enemies) {
      if (e.isBoss || this.isOnScreen(e.x, e.y, cm)) {
        e.update(dt);
      }
    }
    this.enemies = this.enemies.filter(e => e.alive);

    // separate enemies to avoid overlap (only on-screen ones — O(n²) optimized)
    this.separateEnemies();

    // update projectiles
    for (const p of this.projectiles) p.update(dt);
    this.projectiles = this.projectiles.filter(p => p.alive);

    for (const p of this.enemyProjectiles) p.update(dt);
    this.enemyProjectiles = this.enemyProjectiles.filter(p => p.alive);

    for (const p of this.pickups) p.update(dt);
    this.pickups = this.pickups.filter(p => p.alive);

    // If a level-up or chest reward was triggered mid-frame, stop further updates
    if (this.state !== 'playing') return;

    // camera follows player
    const tx = this.player.x - CONFIG.CANVAS_W / 2;
    const ty = this.player.y - CONFIG.CANVAS_H / 2;
    this.camera.x = lerp(this.camera.x, tx, 0.1);
    this.camera.y = lerp(this.camera.y, ty, 0.1);

    // clamp camera
    const mapW = this.levelData.mapW * CONFIG.TILE_SIZE;
    const mapH = this.levelData.mapH * CONFIG.TILE_SIZE;
    this.camera.x = clamp(this.camera.x, 0, Math.max(0, mapW - CONFIG.CANVAS_W));
    this.camera.y = clamp(this.camera.y, 0, Math.max(0, mapH - CONFIG.CANVAS_H));

    // phased spawning — data-driven, replaces fixed spawn/elite/boss timers
    this.updatePhase(dt);

    // pause toggle
    if (Input.wasPressed('Escape') || Input.wasPressed('KeyP')) {
      this.state = 'paused';
      Audio2.click();
    }
  },

  // ---- Phase system ----
  // Returns the active phase object based on levelTime, or null if no phases configured.
  getActivePhase() {
    const phases = this.levelData.phases;
    if (!phases || phases.length === 0) return null;
    let active = null;
    for (let i = 0; i < phases.length; i++) {
      if (this.levelTime >= phases[i].time) {
        active = phases[i];
        this.currentPhase = i;
      }
    }
    return active;
  },

  updatePhase(dt) {
    const phase = this.getActivePhase();
    if (!phase) {
      // fallback: legacy fixed spawning if no phases defined
      this.updateLegacySpawning(dt);
      return;
    }

    // trigger one-time events when entering a new phase
    if (this.currentPhase >= 0 && !this.triggeredPhases[this.currentPhase]) {
      this.triggeredPhases[this.currentPhase] = true;
      this.triggerPhaseEvents(phase);
    }

    // regular enemy spawning using phase pool
    this.spawnTimer -= dt;
    const maxE = phase.maxEnemies;
    if (this.spawnTimer <= 0 && this.enemies.length < maxE && !this.bossSpawned) {
      this.spawnTimer = phase.spawnInterval;
      this.spawnEnemyFromPhase(phase);
    }
  },

  triggerPhaseEvents(phase) {
    // show phase name banner
    if (phase.name) {
      this.addMessage('【' + phase.name + '】', '#ffd040');
    }

    const events = phase.events || [];
    for (const ev of events) {
      if (ev.type === 'chest') {
        const pos = this.getSpawnPosition();
        if (pos) {
          // rare chest -> value=1, suspicious(mimic) -> value=2, normal -> value=0
          let chestType = 0;
          if (ev.rare) chestType = 1;
          else if (ev.mimic) chestType = 2;  // suspicious: appears as chest, high mimic chance on open
          this.spawnChest(pos.x, pos.y, chestType);
          const msg = chestType === 1 ? '稀有宝箱出现!' : (chestType === 2 ? '可疑的宝箱……' : '宝箱出现!');
          const color = chestType === 1 ? '#e080ff' : (chestType === 2 ? '#ff6060' : '#80c0ff');
          this.addMessage(msg, color);
        }
      } else if (ev.type === 'elite') {
        this.spawnElite();
      } else if (ev.type === 'boss') {
        this.spawnBoss();
      } else if (ev.type === 'message') {
        this.addMessage(ev.text || '', ev.color || '#ffffff');
      }
    }
  },

  spawnEnemyFromPhase(phase) {
    const pool = phase.enemyPool && phase.enemyPool.length > 0 ? phase.enemyPool : this.levelData.enemyPool;
    if (pool.length === 0) return;
    const type = pick(pool);
    const pos = this.getSpawnPosition();
    if (pos) this.enemies.push(new Enemy(type, pos.x, pos.y));

    // sometimes spawn ranged from phase rangedPool
    const rPool = phase.rangedPool || [];
    if (rPool.length > 0 && Math.random() < 0.3) {
      const rType = pick(rPool);
      const pos2 = this.getSpawnPosition();
      if (pos2) this.enemies.push(new Enemy(rType, pos2.x, pos2.y));
    }
  },

  // Legacy fixed spawning — only used when a level has no phases array
  updateLegacySpawning(dt) {
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.enemies.length < this.levelData.maxEnemies && !this.bossSpawned) {
      this.spawnTimer = this.levelData.spawnInterval;
      this.spawnEnemy();
    }

    this.eliteTimer += dt;
    if (this.eliteTimer >= this.levelData.eliteInterval && !this.bossSpawned) {
      this.eliteTimer = 0;
      this.spawnElite();
    }

    if (!this.bossSpawned && this.levelTime >= this.levelData.bossSpawnTime) {
      this.spawnBoss();
    }
  },

  separateEnemies() {
    const enemies = this.enemies;
    const cm = this.CULL_MARGIN;
    // Pre-filter to on-screen enemies only — avoids O(n²) on the full pool
    const nearby = enemies.filter(e => this.isOnScreen(e.x, e.y, cm));
    for (let i = 0; i < nearby.length; i++) {
      for (let j = i + 1; j < nearby.length; j++) {
        const a = nearby[i], b = nearby[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.sqrt(dx*dx + dy*dy);
        const minD = a.radius + b.radius;
        if (d < minD && d > 0.1) {
          const push = (minD - d) * 0.5;
          const nx = dx / d, ny = dy / d;
          a.x -= nx * push * 0.5;
          a.y -= ny * push * 0.5;
          b.x += nx * push * 0.5;
          b.y += ny * push * 0.5;
        }
      }
    }
  },

  // ---- Spawning ----
  spawnEnemy() {
    const type = pick(this.levelData.enemyPool);
    const pos = this.getSpawnPosition();
    if (pos) this.enemies.push(new Enemy(type, pos.x, pos.y));

    // sometimes spawn ranged
    if (Math.random() < 0.3 && this.levelData.rangedPool.length > 0) {
      const rType = pick(this.levelData.rangedPool);
      const pos2 = this.getSpawnPosition();
      if (pos2) this.enemies.push(new Enemy(rType, pos2.x, pos2.y));
    }
  },

  spawnElite() {
    const type = pick(this.levelData.elitePool);
    const pos = this.getSpawnPosition();
    if (pos) {
      this.enemies.push(new Enemy(type, pos.x, pos.y));
      this.addMessage('精英怪物出现: ' + CONFIG.ENEMIES[type].name, '#ff8030');
      Audio2.boss();
    }
  },

  // ---- Prop collision: push entity out of solid props ----
  // entity is { x, y, radius }. Modifies entity.x/y in place.
  resolvePropCollision(entity) {
    if (!this.collisionProps || this.collisionProps.length === 0) return;
    for (const prop of this.collisionProps) {
      const dx = entity.x - prop.x;
      const dy = entity.y - prop.y;
      const minDist = entity.radius + prop.radius;
      const d2 = dx * dx + dy * dy;
      if (d2 < minDist * minDist && d2 > 0.001) {
        const d = Math.sqrt(d2);
        const push = (minDist - d) / d;
        entity.x += dx * push;
        entity.y += dy * push;
      }
    }
  },

  spawnBoss() {
    this.bossSpawned = true;
    // clear normal enemies when boss appears (design: "清理普通敌人")
    this.enemies = this.enemies.filter(e => e.isBoss);
    const pos = { x: this.player.x + 200, y: this.player.y };
    // clamp to map
    const mapW = this.levelData.mapW * CONFIG.TILE_SIZE;
    const mapH = this.levelData.mapH * CONFIG.TILE_SIZE;
    pos.x = clamp(pos.x, 50, mapW - 50);
    pos.y = clamp(pos.y, 50, mapH - 50);
    const bossId = this.levelData.bossId || 'boss';
    this.enemies.push(new Enemy(bossId, pos.x, pos.y));
    const bossName = CONFIG.ENEMIES[bossId] ? CONFIG.ENEMIES[bossId].name : 'Boss';
    this.addMessage('Boss出现: ' + bossName + '!', '#ff3030');
    Audio2.boss();
    this.shakeScreen(10, 0.5);
    // show boss intro dialogue
    this.startStory(CONFIG.STORY[this.levelData.theme].bossIntro, () => { this.state = 'playing'; });
  },

  getSpawnPosition() {
    const player = this.player;
    const mapW = this.levelData.mapW * CONFIG.TILE_SIZE;
    const mapH = this.levelData.mapH * CONFIG.TILE_SIZE;
    for (let attempt = 0; attempt < 20; attempt++) {
      const ang = Math.random() * TAU;
      const r = rand(350, 500);
      const x = clamp(player.x + Math.cos(ang) * r, 30, mapW - 30);
      const y = clamp(player.y + Math.sin(ang) * r, 30, mapH - 30);
      // make sure not too close to player
      if (dist(x, y, player.x, player.y) > 300) {
        return { x, y };
      }
    }
    return null;
  },

  spawnChest(x, y, isRare) {
    // isRare: 0=normal, 1=rare, 2=suspicious
    this.pickups.push(new Pickup(x, y, 'chest', 'chest', isRare ? isRare : 0));
  },

  // ---- Level up ----
  onLevelUp() {
    Audio2.levelup();
    this.state = 'levelup';
    this.generateUpgradeChoices();
  },

  generateUpgradeChoices() {
    // Filter out maxed upgrades and unmet prerequisites
    const available = CONFIG.UPGRADES.filter(u => {
      const currentLevel = this.player.upgradeLevels[u.id] || 0;
      if (currentLevel >= u.maxLevel) return false;
      // check prerequisite: player must have at least 1 level in the prerequisite upgrade
      if (u.prerequisite) {
        const prereqLevel = this.player.upgradeLevels[u.prerequisite] || 0;
        if (prereqLevel < 1) return false;
      }
      return true;
    });

    const pool = available;

    // Luck increases the weight of rare/epic upgrades
    const luckMult = 1 + this.player.stats.luck * 0.15;

    // Build weighted list
    const weighted = pool.map(u => {
      let w = u.weight || 50;
      if (u.rarity === 'rare') w *= luckMult;
      if (u.rarity === 'epic') w *= luckMult * 1.5;
      return { upgrade: u, weight: w };
    });

    // Pick 3 unique via weighted random
    const choices = [];
    const tempPool = weighted.slice();
    for (let i = 0; i < 3 && tempPool.length > 0; i++) {
      const totalW = tempPool.reduce((sum, w) => sum + w.weight, 0);
      let r = Math.random() * totalW;
      let idx = 0;
      for (let j = 0; j < tempPool.length; j++) {
        r -= tempPool[j].weight;
        if (r <= 0) { idx = j; break; }
      }
      choices.push(tempPool[idx].upgrade);
      tempPool.splice(idx, 1);
    }

    // 20% chance to include a weapon unlock (replaces one choice)
    const ownedWeaponIds = new Set(this.player.weapons.map(w => w.id));
    const availableUnlocks = CONFIG.WEAPON_UNLOCKS.filter(u => !ownedWeaponIds.has(u.weaponId));
    if (availableUnlocks.length > 0 && Math.random() < 0.2) {
      const unlock = pick(availableUnlocks);
      // Replace the last choice with the weapon unlock
      if (choices.length) choices[choices.length - 1] = unlock;
      else choices.push(unlock);
    }

    if (!choices.length) choices.push(this.createRecoveryChoice());

    this.upgradeChoices = choices;
  },

  selectUpgrade(idx) {
    const choice = this.upgradeChoices[idx];
    if (!choice) return;
    if (choice.weaponId) {
      this.player.addWeapon(choice.weaponId);
      this.addMessage('获得武器: ' + CONFIG.WEAPONS[choice.weaponId].name, '#40c0ff');
      // record unlocked weapon
      if (!this.meta.unlockedWeapons.includes(choice.weaponId)) {
        this.meta.unlockedWeapons.push(choice.weaponId);
        this.saveMeta();
      }
    } else if (choice.apply) {
      choice.apply(this.player);
      if (!choice.isFallback) {
        this.player.upgradeLevels[choice.id] = (this.player.upgradeLevels[choice.id] || 0) + 1;
        // record unlocked upgrade
        if (!this.meta.unlockedUpgrades.includes(choice.id)) {
          this.meta.unlockedUpgrades.push(choice.id);
          this.saveMeta();
        }
      }
      this.addMessage(choice.name, '#c0c0ff');
    }
    Audio2.click();
    this.state = 'playing';
  },

  // ---- Chest / Mimic ----
  // chestType: 0=normal, 1=rare, 2=suspicious
  openChest(x, y, chestType) {
    this.chestsOpened++;
    const ct = chestType || 0;
    // suspicious chest: much higher mimic chance
    // rare chest: never a mimic, better rewards
    let mimicChance = this.levelData.mimicChance;
    if (ct === 2) mimicChance = 0.8;       // suspicious: 80% mimic
    else if (ct === 1) mimicChance = 0;    // rare: always safe

    if (Math.random() < mimicChance) {
      // spawn mimic
      this.enemies.push(new Enemy('mimic', x, y));
      this.addMessage('宝箱怪! 它是活的!', '#ff6030');
      Audio2.boss();
      // first mimic encounter triggers story
      if (!this.meta.seenStories.includes('mimicEncounter')) {
        this.meta.seenStories.push('mimicEncounter');
        this.saveMeta();
        this.pendingMimicStory = true;
      }
    } else {
      // normal/rare chest: give reward
      this.state = 'chestReward';
      this.generateChestReward(ct === 1);
      if (ct === 1) this.addMessage('稀有宝箱! 收获丰厚!', '#ffd040');
    }
  },

  generateChestReward(isRare) {
    const ownedWeaponIds = new Set(this.player.weapons.map(w => w.id));
    const availableUnlocks = CONFIG.WEAPON_UNLOCKS.filter(u => !ownedWeaponIds.has(u.weaponId));
    const rewards = [];

    if (availableUnlocks.length > 0) {
      rewards.push(pick(availableUnlocks));
    }
    // add stat upgrades (respect maxLevel)
    const availableUpgrades = CONFIG.UPGRADES.filter(u => {
      const currentLevel = this.player.upgradeLevels[u.id] || 0;
      return currentLevel < u.maxLevel;
    });
    const upgradePool = availableUpgrades;
    // rare chest: bias toward rare/epic upgrades
    let picked;
    if (isRare) {
      const rarePool = upgradePool.filter(u => u.rarity === 'rare' || u.rarity === 'epic');
      const normalPool = upgradePool.filter(u => u.rarity === 'common');
      // 2 from rare/epic pool (if available), 1 from any
      if (rarePool.length >= 2) {
        picked = pickN(rarePool, 2);
        if (normalPool.length > 0) picked.push(pick(normalPool));
        else if (rarePool.length > 2) picked.push(pick(rarePool));
      } else {
        picked = pickN(upgradePool, 2);
      }
    } else {
      picked = pickN(upgradePool, 2);
    }
    rewards.push(...picked);
    if (!rewards.length) rewards.push(this.createRecoveryChoice());
    this.chestRewardChoices = rewards.slice(0, 3);
  },

  triggerMimicReward() {
    this.state = 'chestReward';
    this.generateChestReward();
    this.addMessage('宝箱怪掉落了稀有奖励!', '#ffd040');
  },

  selectChestReward(idx) {
    const choice = this.chestRewardChoices[idx];
    if (!choice) return;
    if (choice.weaponId) {
      this.player.addWeapon(choice.weaponId);
      this.addMessage('获得新武器: ' + CONFIG.WEAPONS[choice.weaponId].name, '#ffd040');
      if (!this.meta.unlockedWeapons.includes(choice.weaponId)) {
        this.meta.unlockedWeapons.push(choice.weaponId);
        this.saveMeta();
      }
    } else if (choice.apply) {
      choice.apply(this.player);
      if (!choice.isFallback) {
        this.player.upgradeLevels[choice.id] = (this.player.upgradeLevels[choice.id] || 0) + 1;
        if (!this.meta.unlockedUpgrades.includes(choice.id)) {
          this.meta.unlockedUpgrades.push(choice.id);
          this.saveMeta();
        }
      }
    }
    Audio2.click();
    this.state = 'playing';
  },

  // ---- Boss defeated ----
  onBossDefeated() {
    this.bossDefeated = true;
    Audio2.victory();
    // record level completion in meta
    if (this.levelData && this.levelData.theme) {
      this.meta.levelsCompleted[this.levelData.theme] = true;
      this.saveMeta();
    }
    // start victory story
    setTimeout(() => {
      this.startStory(CONFIG.STORY[this.levelData.theme].victory, () => {
        // After village victory, proceed to mine level
        if (this.levelData.theme === 'village') {
          this.loadLevel('mine');
        } else {
          // Final victory after mine
          this.state = 'victory';
        }
      });
    }, 1000);
  },

  // ---- Story ----
  startStory(lines, onComplete) {
    this.storyLines = lines;
    this.storyIndex = 0;
    this.storyComplete = onComplete;
    this.state = 'story';
    this.storyTimer = 0;
    // record seen story for this level theme
    if (this.levelData && this.levelData.theme) {
      const storyKey = this.levelData.theme + '_story_' + (this.storyComplete ? 'victory' : 'intro');
      if (!this.meta.seenStories.includes(storyKey)) {
        this.meta.seenStories.push(storyKey);
        this.saveMeta();
      }
    }
  },

  updateStory(dt) {
    this.storyTimer += dt;
    if (Input.wasPressed('Space') || Input.wasPressed('Enter') || Input.consumeClick(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H)) {
      if (this.storyTimer > 0.3) {
        this.storyTimer = 0;
        if (this.storyIndex < this.storyLines.length - 1) {
          this.storyIndex++;
          Audio2.click();
        } else {
          const cb = this.storyComplete;
          this.storyComplete = null;
          if (cb) cb();
          else this.state = 'playing';
        }
      }
    }
  },

  // ---- Menu ----
  updateMenu() {
    // settings overlay takes priority when open
    if (this._settingsOverlay) { this.updateSettingsOverlay(); return; }

    // start button
    if (Input.consumeClick(CONFIG.CANVAS_W/2 - 100, 300, 200, 50)) {
      this.startNewGame();
      Audio2.click();
    }
    // continue button
    if (this.hasSave()) {
      if (Input.consumeClick(CONFIG.CANVAS_W/2 - 100, 370, 200, 50)) {
        this.loadAndContinue();
        Audio2.click();
      }
      // reset save button (with confirmation)
      if (Input.consumeClick(CONFIG.CANVAS_W/2 - 100, 440, 200, 36)) {
        if (this.resetConfirmTimer > 0) {
          this.resetSave();
          this.addMessage('存档已清除', '#ff6060');
          Audio2.click();
        } else {
          this.resetConfirmTimer = 3;
          Audio2.click();
        }
      }
      // settings button
      if (Input.consumeClick(CONFIG.CANVAS_W/2 - 100, 490, 200, 36)) {
        this.openSettings();
        Audio2.click();
      }
    } else {
      // settings button (no save case)
      if (Input.consumeClick(CONFIG.CANVAS_W/2 - 100, 370, 200, 36)) {
        this.openSettings();
        Audio2.click();
      }
    }
    // decay confirmation timer
    if (this.resetConfirmTimer > 0) this.resetConfirmTimer -= 1/60;
  },

  // ---- Pause ----
  updatePause() {
    // settings overlay takes priority when open
    if (this._settingsOverlay) { this.updateSettingsOverlay(); return; }

    if (Input.wasPressed('Escape') || Input.wasPressed('KeyP')) {
      this.state = 'playing';
      Audio2.click();
    }
    if (Input.consumeClick(CONFIG.CANVAS_W/2 - 100, 220, 200, 45)) {
      this.state = 'playing';
      Audio2.click();
    }
    if (Input.consumeClick(CONFIG.CANVAS_W/2 - 100, 280, 200, 45)) {
      this.saveProgress();
      this.state = 'menu';
      Audio2.click();
    }
    if (Input.consumeClick(CONFIG.CANVAS_W/2 - 100, 340, 200, 45)) {
      this.state = 'menu';
      Audio2.click();
    }
    // settings button
    if (Input.consumeClick(CONFIG.CANVAS_W/2 - 100, 400, 200, 45)) {
      this.openSettings();
      Audio2.click();
    }
  },

  // ---- Game Over ----
  updateGameOver() {
    if (Input.consumeClick(CONFIG.CANVAS_W/2 - 100, 340, 200, 45)) {
      this.startNewGame();
      Audio2.click();
    }
    if (Input.consumeClick(CONFIG.CANVAS_W/2 - 100, 400, 200, 45)) {
      this.state = 'menu';
      Audio2.click();
    }
  },

  // ---- Victory ----
  updateVictory() {
    if (Input.consumeClick(CONFIG.CANVAS_W/2 - 100, 380, 200, 45)) {
      this.state = 'menu';
      Audio2.click();
    }
  },

  // ---- Level up UI ----
  updateLevelUp() {
    const layout = this.getChoiceLayout(this.upgradeChoices.length);

    for (let i = 0; i < this.upgradeChoices.length; i++) {
      const card = layout.cards[i];
      if (Input.consumeClick(card.x, card.y, card.w, card.h)) {
        this.selectUpgrade(i);
        return;
      }
      // keyboard shortcuts
      if (Input.wasPressed(['Digit1','Digit2','Digit3'][i])) {
        this.selectUpgrade(i);
        return;
      }
    }
  },

  updateChestReward() {
    const layout = this.getChoiceLayout(this.chestRewardChoices.length);

    for (let i = 0; i < this.chestRewardChoices.length; i++) {
      const card = layout.cards[i];
      if (Input.consumeClick(card.x, card.y, card.w, card.h)) {
        this.selectChestReward(i);
        return;
      }
    }
  },

  // ---- New game ----
  startNewGame() {
    this.player = new Player(CONFIG.MAP_W * CONFIG.TILE_SIZE / 2, CONFIG.MAP_H * CONFIG.TILE_SIZE / 2);
    this.enemies = [];
    this.projectiles = [];
    this.enemyProjectiles = [];
    this.pickups = [];
    this.particles = [];
    this.damageNumbers = [];
    this.messages = [];
    this.levelTime = 0;
    this.spawnTimer = 1;
    this.eliteTimer = 0;
    this.bossSpawned = false;
    this.bossDefeated = false;
    this.currentPhase = -1;
    this.triggeredPhases = {};
    this.damageVignette = 0;
    this.eliteKills = 0;
    this.bossKills = 0;
    this.chestsOpened = 0;
    this.camera.x = this.player.x - CONFIG.CANVAS_W/2;
    this.camera.y = this.player.y - CONFIG.CANVAS_H/2;

    this.loadLevel('village');
  },

  loadLevel(levelId) {
    this.levelData = CONFIG.LEVELS[levelId];
    // reset level state
    this.levelTime = 0;
    this.spawnTimer = 1;
    this.eliteTimer = 0;
    this.bossSpawned = false;
    this.bossDefeated = false;
    this.enemies = [];
    this.projectiles = [];
    this.enemyProjectiles = [];
    this.pickups = [];
    this.particles = [];
    this.damageNumbers = [];
    this.messages = [];
    // place player at map center
    this.player.x = this.levelData.mapW * CONFIG.TILE_SIZE / 2;
    this.player.y = this.levelData.mapH * CONFIG.TILE_SIZE / 2;
    this.camera.x = this.player.x - CONFIG.CANVAS_W/2;
    this.camera.y = this.player.y - CONFIG.CANVAS_H/2;
    // full heal on level transition
    this.player.hp = this.player.getMaxHp();

    this.generateMap();
    // spawn initial chests
    for (let i = 0; i < this.levelData.chestCount; i++) {
      const x = rand(200, this.levelData.mapW * CONFIG.TILE_SIZE - 200);
      const y = rand(200, this.levelData.mapH * CONFIG.TILE_SIZE - 200);
      this.pickups.push(new Pickup(x, y, 'chest', 'chest', 0));
    }

    // start story
    const storyLines = CONFIG.STORY[this.levelData.theme].intro;
    this.startStory(storyLines, () => { this.state = 'playing'; });
  },

  // ---- Map generation ----
  generateMap() {
    const rng = makeRNG(42);
    const mapW = this.levelData.mapW, mapH = this.levelData.mapH, ts = CONFIG.TILE_SIZE;
    this.mapData = { tiles: [], props: [] };

    // generate ground tile texture cache
    this.groundTileCache = document.createElement('canvas');
    this.groundTileCache.width = mapW * ts;
    this.groundTileCache.height = mapH * ts;
    const gctx = this.groundTileCache.getContext('2d');
    gctx.imageSmoothingEnabled = false;

    // fill ground with dirt base
    gctx.fillStyle = '#2a2218';
    gctx.fillRect(0, 0, mapW * ts, mapH * ts);

    // draw ground tiles
    const groundTiles = this.levelData.groundTiles;
    for (let ty = 0; ty < mapH; ty++) {
      for (let tx = 0; tx < mapW; tx++) {
        const tileName = groundTiles[Math.floor(rng() * groundTiles.length)];
        const img = Assets.get(tileName);
        if (img && img.complete) {
          // draw with slight random offset and alpha for variation
          gctx.globalAlpha = 0.6 + rng() * 0.4;
          const ox = (rng() - 0.5) * 6;
          const oy = (rng() - 0.5) * 6;
          gctx.drawImage(img, tx * ts + ox, ty * ts + oy, ts + 4, ts + 4);
        }
      }
    }
    gctx.globalAlpha = 1;

    // add some dark patches / paths
    gctx.fillStyle = 'rgba(15,10,5,0.3)';
    for (let i = 0; i < 30; i++) {
      const x = rng() * mapW * ts;
      const y = rng() * mapH * ts;
      gctx.beginPath();
      gctx.ellipse(x, y, 40 + rng() * 60, 30 + rng() * 40, rng() * TAU, 0, TAU);
      gctx.fill();
    }

    // generate props
    const props = this.levelData.props;
    const propList = [];
    const collRad = CONFIG.PROP_COLLISION;
    const cx = mapW * ts / 2, cy = mapH * ts / 2; // map center (player spawn)

    // helper: scatter a prop category, avoid spawning on top of player spawn
    const scatter = (count, categoryKey, categoryArr) => {
      for (let i = 0; i < count; i++) {
        let px, py, tries = 0;
        do {
          px = rng() * mapW * ts;
          py = rng() * mapH * ts;
          tries++;
        } while (tries < 5 && dist(px, py, cx, cy) < 80);
        const radius = collRad[categoryKey] || 0;
        propList.push({ type: pick(categoryArr), x: px, y: py, category: categoryKey, radius: radius });
      }
    };

    scatter(25, 'trees', props.trees);
    scatter(15, 'tombstones', props.tombstones);
    scatter(12, 'fences', props.fences);
    scatter(8, 'barrels', props.barrels);
    scatter(10, 'braziers', props.braziers);
    scatter(10, 'ruins', props.ruins);
    scatter(3, 'houses', props.houses);

    this.mapData.props = propList;
    // build collision list (only solid props)
    this.collisionProps = propList.filter(p => p.radius > 0);
    // sort by Y for proper depth
    this.mapData.props.sort((a, b) => a.y - b.y);
  },

  // ---- Save/Load ----

  // Migrate save data forward across schema versions.
  // Each migration fills in fields introduced in that version.
  migrateSave(data) {
    if (!data || typeof data !== 'object') return data;
    const ver = data.schemaVersion || 0;
    // v0 → v1: ensure basic run-progress fields exist
    if (ver < 1) {
      data.weapons = data.weapons || [];
      data.upgradeLevels = data.upgradeLevels || {};
      data.stats = data.stats || {};
    }
    // v1 → v2: ensure phased-spawning fields exist
    if (ver < 2) {
      data.spawnTimer = data.spawnTimer ?? 1;
      data.eliteTimer = data.eliteTimer ?? 0;
      data.bossSpawned = !!data.bossSpawned;
      data.bossDefeated = !!data.bossDefeated;
    }
    // v2 → v3: meta-progression and settings (added in this update)
    if (ver < 3) {
      data.meta = data.meta || {
        bestSurvivalTime: 0,
        bestLevel: 1,
        bestKills: 0,
        levelsCompleted: {},
        unlockedWeapons: ['sword'],
        unlockedUpgrades: [],
        seenStories: [],
      };
      data.settings = data.settings || { masterVolume: 0.5, sfxVolume: 0.7, musicVolume: 0.4 };
    }
    data.schemaVersion = this.saveSchemaVersion;
    return data;
  },

  saveProgress() {
    // A death screen must not replace a resumable run with a dead character.
    if (!this.player || !this.player.alive) return;
    const data = {
      schemaVersion: this.saveSchemaVersion,
      level: this.player.level,
      xp: this.player.xp,
      hp: this.player.hp,
      kills: this.player.kills,
      weapons: this.player.weapons.map(w => ({ id: w.id, level: w.level })),
      stats: this.player.stats,
      upgradeLevels: this.player.upgradeLevels,
      levelTime: this.levelTime,
      levelId: this.levelData ? this.levelData.theme : 'village',
      playerPosition: { x: this.player.x, y: this.player.y },
      spawnTimer: this.spawnTimer,
      eliteTimer: this.eliteTimer,
      bossSpawned: this.bossSpawned,
      bossDefeated: this.bossDefeated,
    };
    try {
      localStorage.setItem(this.saveKey, JSON.stringify(data));
    } catch(e) { console.warn('Save failed', e); }
  },

  hasSave() {
    try {
      return localStorage.getItem(this.saveKey) !== null;
    } catch(e) { return false; }
  },

  resetSave() {
    try {
      localStorage.removeItem(this.saveKey);
      localStorage.removeItem(this.metaKey);
    } catch(e) { console.warn('Reset save failed', e); }
    this.resetConfirmTimer = 0;
    this.meta = {
      bestSurvivalTime: 0, bestLevel: 1, bestKills: 0,
      levelsCompleted: {}, unlockedWeapons: ['sword'],
      unlockedUpgrades: [], seenStories: [],
    };
  },

  // ---- Meta progression (persists across runs, survives death) ----
  meta: {
    bestSurvivalTime: 0,
    bestLevel: 1,
    bestKills: 0,
    levelsCompleted: {},
    unlockedWeapons: ['sword'],
    unlockedUpgrades: [],
    seenStories: [],
  },

  // ---- Settings (persisted in meta) ----
  settings: {
    masterVolume: 0.5,
    sfxVolume: 0.7,
    musicVolume: 0.4,
  },

  loadMeta() {
    try {
      const raw = localStorage.getItem(this.metaKey);
      if (!raw) return;
      const data = JSON.parse(raw);
      this.meta.bestSurvivalTime = data.bestSurvivalTime ?? 0;
      this.meta.bestLevel = data.bestLevel ?? 1;
      this.meta.bestKills = data.bestKills ?? 0;
      this.meta.levelsCompleted = data.levelsCompleted || {};
      this.meta.unlockedWeapons = data.unlockedWeapons || ['sword'];
      this.meta.unlockedUpgrades = data.unlockedUpgrades || [];
      this.meta.seenStories = data.seenStories || [];
      // load settings
      if (data.settings) {
        this.settings.masterVolume = data.settings.masterVolume ?? 0.5;
        this.settings.sfxVolume = data.settings.sfxVolume ?? 0.7;
        this.settings.musicVolume = data.settings.musicVolume ?? 0.4;
      }
      // sync Audio2 with loaded settings
      Audio2.syncVolumes(this.settings);
    } catch(e) { console.warn('Load meta failed', e); }
  },

  saveMeta() {
    try {
      const data = Object.assign({}, this.meta, { settings: this.settings });
      localStorage.setItem(this.metaKey, JSON.stringify(data));
    } catch(e) { console.warn('Save meta failed', e); }
  },

  updateMeta() {
    // update best records from current run
    if (this.levelTime > this.meta.bestSurvivalTime) this.meta.bestSurvivalTime = this.levelTime;
    if (this.player.level > this.meta.bestLevel) this.meta.bestLevel = this.player.level;
    if (this.player.kills > this.meta.bestKills) this.meta.bestKills = this.player.kills;
    this.saveMeta();
  },

  loadAndContinue() {
    try {
      const raw = localStorage.getItem(this.saveKey);
      if (!raw) { this.startNewGame(); return; }
      const data = this.migrateSave(JSON.parse(raw));
      this.startNewGame();
      const levelId = CONFIG.LEVELS[data.levelId] ? data.levelId : 'village';
      this.levelData = CONFIG.LEVELS[levelId];
      this.player.level = data.level ?? 1;
      this.player.xp = data.xp ?? 0;
      this.player.xpToNext = CONFIG.XP_CURVE[Math.min(this.player.level - 1, CONFIG.XP_CURVE.length - 1)] || 9999;
      // Merge so old saves gain every later-added stat with a safe default.
      this.player.stats = Object.assign({}, this.player.stats, data.stats || {});
      this.player.hp = data.hp ?? this.player.getMaxHp();
      this.player.kills = data.kills ?? 0;
      this.player.upgradeLevels = data.upgradeLevels || {};
      if (data.playerPosition) {
        this.player.x = clamp(data.playerPosition.x ?? this.player.x, 0, CONFIG.MAP_W * CONFIG.TILE_SIZE);
        this.player.y = clamp(data.playerPosition.y ?? this.player.y, 0, CONFIG.MAP_H * CONFIG.TILE_SIZE);
      }
      this.levelTime = data.levelTime ?? 0;
      this.spawnTimer = data.spawnTimer ?? 1;
      this.eliteTimer = data.eliteTimer ?? 0;
      this.bossDefeated = !!data.bossDefeated;
      // A save may claim its boss spawned while the boss entity itself was not
      // persisted. Re-spawn it when the timer has passed, unless it was defeated.
      this.bossSpawned = !!data.bossDefeated;
      // load weapons
      this.player.weapons = [];
      if (data.weapons) {
        for (const w of data.weapons) {
          this.player.addWeapon(w.id);
          const wobj = this.player.weapons.find(x => x.id === w.id);
          if (wobj) wobj.level = w.level;
        }
      }
      if (this.levelData) {
        const cb = () => { this.state = 'playing'; };
        this.startStory(CONFIG.STORY[this.levelData.theme].intro, cb);
      }
    } catch(e) {
      console.error('Load failed', e);
      this.startNewGame();
    }
  },

  // ---- Helpers ----
  shakeScreen(magnitude, duration) {
    this.camera.shakeMag = magnitude;
    this.camera.shakeTime = duration;
  },

  spawnDamageNumber(x, y, value, color, isCrit) {
    this.damageNumbers.push(new DamageNumber(x, y, value, color, isCrit));
  },

  addMessage(text, color) {
    this.messages.push({ text, color: color || '#ffffff', life: 3, maxLife: 3 });
  },

  createRecoveryChoice() {
    return {
      id: 'recovery', name: '生命恢复', desc: '恢复 35% 最大生命',
      icon: 'items/heart', rarity: 'common', isFallback: true,
      apply: (player) => player.heal(player.getMaxHp() * 0.35),
    };
  },

  getVisibleCanvasRect() {
    const winW = window.innerWidth || CONFIG.CANVAS_W;
    const winH = window.innerHeight || CONFIG.CANVAS_H;
    if (this._rotate90 && this.canvas) {
      const rect = this.canvas.getBoundingClientRect();
      const visibleW = Math.min(CONFIG.CANVAS_W, winH / rect.height * CONFIG.CANVAS_W);
      const visibleH = Math.min(CONFIG.CANVAS_H, winW / rect.width * CONFIG.CANVAS_H);
      return {
        x: (CONFIG.CANVAS_W - visibleW) / 2,
        y: (CONFIG.CANVAS_H - visibleH) / 2,
        w: visibleW, h: visibleH,
      };
    }
    const scale = Math.max(winW / CONFIG.CANVAS_W, winH / CONFIG.CANVAS_H);
    const visibleW = Math.min(CONFIG.CANVAS_W, winW / scale);
    const visibleH = Math.min(CONFIG.CANVAS_H, winH / scale);
    return {
      x: (CONFIG.CANVAS_W - visibleW) / 2,
      y: (CONFIG.CANVAS_H - visibleH) / 2,
      w: visibleW, h: visibleH,
    };
  },

  getPauseButtonRect() {
    const visible = this.getVisibleCanvasRect();
    return { x: visible.x + visible.w - 38, y: visible.y + 18, w: 28, h: 28 };
  },

  getRotateButtonRect() {
    const visible = this.getVisibleCanvasRect();
    return { x: visible.x + 12, y: visible.y + 52, w: 36, h: 36 };
  },

  getChoiceLayout(count) {
    const portrait = this.isPortrait();
    const visible = this.getVisibleCanvasRect();
    const cards = [];
    if (portrait) {
      const cardW = Math.min(280, visible.w - 20);
      const gap = 10;
      const cardH = Math.min(115, (visible.h - 115 - gap * Math.max(0, count - 1)) / Math.max(count, 1));
      const startY = 105;
      for (let i = 0; i < count; i++) cards.push({ x: visible.x + (visible.w - cardW) / 2, y: startY + i * (cardH + gap), w: cardW, h: cardH });
    } else {
      const cardW = 200, cardH = 260, gap = 20;
      const totalW = count * cardW + Math.max(0, count - 1) * gap;
      for (let i = 0; i < count; i++) cards.push({ x: (CONFIG.CANVAS_W - totalW) / 2 + i * (cardW + gap), y: 160, w: cardW, h: cardH });
    }
    return { portrait, cards };
  },

  // ---- Rendering ----
  render() {
    const ctx = this.ctx;
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);

    if (this.state === 'menu') {
      this.renderMenu();
      if (this._settingsOverlay) this.renderSettings();
    } else if (this.state === 'loading') {
      // loading screen handled by DOM
    } else {
      this.renderWorld();
      this.renderHUD();

      // damage vignette (red screen edge when player takes damage)
      if (this.damageVignette > 0) {
        const a = (this.damageVignette / 0.6) * 0.5;
        const grad = ctx.createRadialGradient(
          CONFIG.CANVAS_W/2, CONFIG.CANVAS_H/2, 150,
          CONFIG.CANVAS_W/2, CONFIG.CANVAS_H/2, 450
        );
        grad.addColorStop(0, 'rgba(255,30,30,0)');
        grad.addColorStop(0.6, 'rgba(255,20,20,' + (a * 0.3) + ')');
        grad.addColorStop(1, 'rgba(255,20,20,' + a + ')');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
      }

      if (this.state === 'story') this.renderStory();
      if (this.state === 'paused') {
        this.renderPause();
        if (this._settingsOverlay) this.renderSettings();
      }
      if (this.state === 'levelup') this.renderLevelUp();
      if (this.state === 'chestReward') this.renderChestReward();
      if (this.state === 'gameover') this.renderGameOver();
      if (this.state === 'victory') this.renderVictory();
    }

    // Rotate button overlay - visible in all states on mobile/touch devices
    this.renderRotateButton();
  },

  renderWorld() {
    const ctx = this.ctx;
    ctx.save();
    const camX = this.camera.x + this.camera.shakeX;
    const camY = this.camera.y + this.camera.shakeY;
    ctx.translate(-camX, -camY);

    // draw cached ground
    if (this.groundTileCache) {
      ctx.drawImage(this.groundTileCache, 0, 0);
    }

    // map bounds
    const mapW = this.levelData.mapW * CONFIG.TILE_SIZE;
    const mapH = this.levelData.mapH * CONFIG.TILE_SIZE;
    ctx.strokeStyle = '#1a0a0a';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, mapW, mapH);

    // visible prop range for culling
    const viewL = camX - 50, viewR = camX + CONFIG.CANVAS_W + 50;
    const viewT = camY - 50, viewB = camY + CONFIG.CANVAS_H + 50;

    // draw props that are behind player (y < player.y)
    if (this.mapData) {
      for (const prop of this.mapData.props) {
        if (prop.x < viewL || prop.x > viewR || prop.y < viewT || prop.y > viewB) continue;
        Assets.drawCentered(ctx, prop.type, prop.x, prop.y, 0.8, 0, 1);
      }
    }

    // draw pickups
    for (const p of this.pickups) p.draw(ctx);

    // draw enemies
    for (const e of this.enemies) {
      if (this.isOnScreen(e.x, e.y, 80)) e.draw(ctx);
    }

    // draw player
    if (this.player) this.player.draw(ctx);

    // draw projectiles
    for (const p of this.projectiles) { if (this.isOnScreen(p.x, p.y, 50)) p.draw(ctx); }
    for (const p of this.enemyProjectiles) { if (this.isOnScreen(p.x, p.y, 50)) p.draw(ctx); }

    // draw particles
    for (const p of this.particles) { if (this.isOnScreen(p.x, p.y, 50)) p.draw(ctx); }

    // draw damage numbers
    for (const d of this.damageNumbers) d.draw(ctx);

    ctx.restore();

    // vignette
    const grad = ctx.createRadialGradient(
      CONFIG.CANVAS_W/2, CONFIG.CANVAS_H/2, 200,
      CONFIG.CANVAS_W/2, CONFIG.CANVAS_H/2, 500
    );
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
  },

  renderHUD() {
    const ctx = this.ctx;
    const p = this.player;
    if (!p) return;
    const visible = this.getVisibleCanvasRect();
    const portrait = this.isPortrait();

    // HP bar
    const hpBarW = portrait ? Math.min(80, visible.w - 155) : 200;
    const hpBarH = 16;
    const hpX = visible.x + 12, hpY = visible.y + 20;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(hpX-2, hpY-2, hpBarW+4, hpBarH+4);
    ctx.fillStyle = '#3a1a1a';
    ctx.fillRect(hpX, hpY, hpBarW, hpBarH);
    const hpPct = clamp(p.hp / p.getMaxHp(), 0, 1);
    ctx.fillStyle = '#c04040';
    ctx.fillRect(hpX, hpY, hpBarW * hpPct, hpBarH);
    ctx.strokeStyle = '#5a3a20';
    ctx.lineWidth = 1;
    ctx.strokeRect(hpX, hpY, hpBarW, hpBarH);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px Courier New';
    ctx.textAlign = 'left';
    ctx.fillText(`HP ${Math.ceil(p.hp)}/${p.getMaxHp()}`, hpX + 5, hpY + 12);

    // XP bar
    const xpY = hpY + hpBarH + 4;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(hpX-2, xpY-2, hpBarW+4, 10+4);
    ctx.fillStyle = '#1a2a1a';
    ctx.fillRect(hpX, xpY, hpBarW, 10);
    const xpPct = clamp(p.xp / p.xpToNext, 0, 1);
    ctx.fillStyle = '#40c060';
    ctx.fillRect(hpX, xpY, hpBarW * xpPct, 10);
    ctx.fillStyle = '#80ffa0';
    ctx.font = '10px Courier New';
    ctx.fillText(`LV ${p.level}  XP ${Math.floor(p.xp)}/${p.xpToNext}`, hpX + 5, xpY + 8);

    // timer
    const min = Math.floor(this.levelTime / 60);
    const sec = Math.floor(this.levelTime % 60);
    ctx.fillStyle = '#c4a87a';
    ctx.font = 'bold 18px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(`${min}:${sec.toString().padStart(2,'0')}`, visible.x + visible.w/2, visible.y + 30);

    // boss timer warning
    if (!this.bossSpawned) {
      const bossTime = Math.max(0, this.levelData.bossSpawnTime - this.levelTime);
      if (bossTime < 10) {
        ctx.fillStyle = '#ff4040';
        ctx.font = 'bold 14px Courier New';
        ctx.fillText(`Boss即将出现: ${bossTime.toFixed(1)}s`, visible.x + visible.w/2, visible.y + 50);
      }
    }

    // kills
    ctx.fillStyle = '#8a7a5a';
    ctx.font = '12px Courier New';
    ctx.textAlign = 'right';
    const infoX = visible.x + visible.w - 12;
    ctx.fillText(`击杀: ${p.kills}`, infoX, visible.y + 25);
    ctx.fillText(`敌人: ${this.enemies.length}`, infoX, visible.y + 40);

    // weapon icons
    ctx.textAlign = 'left';
    const weaponGap = 42;
    const weaponTotalW = Math.max(0, p.weapons.length - 1) * weaponGap + 36;
    const weaponStartX = portrait ? visible.x + (visible.w - weaponTotalW) / 2 : visible.x + 20;
    // Keep the bar above the mobile controls' large touch targets.
    const wY = portrait ? visible.y + visible.h - 165 : visible.y + visible.h - 40;
    for (let i = 0; i < p.weapons.length; i++) {
      const w = p.weapons[i];
      const wx = weaponStartX + i * weaponGap;
      // bg
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(wx-2, wY-2, 36, 36);
      Assets.drawCentered(ctx, w.def.icon, wx + 16, wY + 16, 0.8, 0, 1);
      // level
      ctx.fillStyle = '#ffd040';
      ctx.font = '10px Courier New';
      ctx.fillText(`Lv${w.level}`, wx, wY + 46);
    }

    // dash cooldown indicator
    if (p.dashCooldown > 0) {
      ctx.fillStyle = 'rgba(120,180,255,0.3)';
      ctx.fillRect(weaponStartX, wY - 20, 100, 6);
      ctx.fillStyle = '#78b4ff';
      ctx.fillRect(weaponStartX, wY - 20, 100 * (1 - p.dashCooldown / CONFIG.PLAYER.dashCooldown), 6);
    }

    // messages
    ctx.textAlign = 'center';
    for (let i = 0; i < this.messages.length; i++) {
      const m = this.messages[i];
      const alpha = m.life / m.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = m.color;
      ctx.font = 'bold 14px Courier New';
      ctx.fillText(m.text, visible.x + visible.w/2, visible.y + 80 + i * 22);
    }
    ctx.globalAlpha = 1;

    // controls hint
    if (!portrait) {
      ctx.fillStyle = 'rgba(138,122,90,0.5)';
      ctx.font = '10px Courier New';
      ctx.textAlign = 'right';
      ctx.fillText('WASD/摇杆移动  空格/按钮闪避  ESC暂停', visible.x + visible.w - 20, visible.y + visible.h - 10);
    }

    // portrait orientation hint (show for first 30 seconds of gameplay)
    if (this.isPortrait() && !this.forcedLandscape && this.levelTime < 30) {
      const alpha = this.levelTime < 25 ? 0.8 : (0.8 * (30 - this.levelTime) / 5);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#c4a87a';
      ctx.font = 'bold 13px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText('点击左上角按钮可旋转为横屏', CONFIG.CANVAS_W / 2, CONFIG.CANVAS_H / 2 - 40);
      ctx.font = '11px Courier New';
      ctx.fillStyle = '#8a7a5a';
      ctx.fillText('← 摇杆移动    闪避 →', CONFIG.CANVAS_W / 2, CONFIG.CANVAS_H / 2 - 20);
      ctx.globalAlpha = 1;
    }

    // ---- Boss top health bar ----
    const boss = this.enemies.find(e => e.isBoss && e.alive);
    if (boss) {
      const barW = Math.min(400, visible.w - 80);
      const barH = 14;
      const bx = visible.x + (visible.w - barW) / 2;
      const by = visible.y + 56;
      // bg
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillRect(bx - 2, by - 2, barW + 4, barH + 4);
      ctx.fillStyle = '#2a0a0a';
      ctx.fillRect(bx, by, barW, barH);
      // hp fill
      const hpPct = clamp(boss.hp / boss.maxHp, 0, 1);
      // color shifts: green->yellow->red as hp drops
      let hpColor = '#ff3030';
      if (hpPct > 0.5) hpColor = '#ff6030';
      else if (hpPct > 0.25) hpColor = '#ff4040';
      ctx.fillStyle = hpColor;
      ctx.fillRect(bx, by, barW * hpPct, barH);
      // phase divider at 50%
      const phaseX = bx + barW * (boss.def.enrageHpPct || 0.5);
      ctx.strokeStyle = '#ffd040';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(phaseX, by);
      ctx.lineTo(phaseX, by + barH);
      ctx.stroke();
      // border
      ctx.strokeStyle = '#5a2a20';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, barW, barH);
      // boss name + phase
      ctx.fillStyle = '#ff6060';
      ctx.font = 'bold 12px Courier New';
      ctx.textAlign = 'center';
      const phaseLabel = boss.phase >= 2 ? ' [阶段2]' : '';
      ctx.fillText(boss.def.name + phaseLabel, visible.x + visible.w / 2, by - 4);
    }

    // ---- Touch controls overlay ----
    this.renderTouchControls(ctx);
  },

  renderTouchControls(ctx) {
    // Only show during active gameplay
    if (this.state !== 'playing') return;

    const j = Input.joystick;
    const d = Input.dashButton;

    // ---- Virtual joystick (always show at fixed anchor) ----
    // Outer ring
    ctx.strokeStyle = j.active ? 'rgba(200,180,120,0.5)' : 'rgba(200,180,120,0.25)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(j.anchorX, j.anchorY, j.radius, 0, TAU);
    ctx.stroke();
    // Inner ring (translucent fill)
    ctx.fillStyle = j.active ? 'rgba(60,50,30,0.4)' : 'rgba(60,50,30,0.15)';
    ctx.beginPath();
    ctx.arc(j.anchorX, j.anchorY, j.radius, 0, TAU);
    ctx.fill();
    // Thumbstick
    const thumbX = j.active ? (j.anchorX + j.dx * j.radius) : j.anchorX;
    const thumbY = j.active ? (j.anchorY + j.dy * j.radius) : j.anchorY;
    ctx.fillStyle = j.active ? 'rgba(200,180,120,0.8)' : 'rgba(200,180,120,0.4)';
    ctx.beginPath();
    ctx.arc(thumbX, thumbY, 20, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = j.active ? 'rgba(255,220,150,0.9)' : 'rgba(200,180,120,0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // ---- Dash button (always show at fixed anchor) ----
    const ready = this.player.dashCooldown <= 0;
    ctx.fillStyle = ready ? 'rgba(120,180,255,0.3)' : 'rgba(60,60,80,0.2)';
    ctx.beginPath();
    ctx.arc(d.anchorX, d.anchorY, d.radius, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = ready ? 'rgba(120,180,255,0.7)' : 'rgba(80,80,100,0.4)';
    ctx.lineWidth = 3;
    ctx.stroke();
    // Label
    ctx.fillStyle = ready ? '#78b4ff' : '#555566';
    ctx.font = 'bold 14px Courier New';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('闪避', d.anchorX, d.anchorY);
    ctx.textBaseline = 'alphabetic';

    // ---- Pause button (top-right of the actually visible canvas) ----
    const pause = this.getPauseButtonRect();
    const px = pause.x + pause.w / 2;
    const py = pause.y + pause.h / 2;
    ctx.fillStyle = 'rgba(200,180,120,0.3)';
    ctx.fillRect(px - 12, py - 12, 24, 24);
    ctx.fillStyle = 'rgba(200,180,120,0.7)';
    ctx.fillRect(px - 7, py - 7, 4, 14);
    ctx.fillRect(px + 3, py - 7, 4, 14);
  },

  // Draw rotate button in all states (top-left corner)
  renderRotateButton() {
    const ctx = this.ctx;
    const button = this.getRotateButtonRect();
    const rx = button.x + button.w / 2;
    const ry = button.y + button.h / 2;
    const r = 18;
    // Background circle
    ctx.fillStyle = 'rgba(120,180,255,0.25)';
    ctx.beginPath();
    ctx.arc(rx, ry, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,180,255,0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Draw rotation icon: phone outline + curved arrow
    ctx.strokeStyle = '#78b4ff';
    ctx.lineWidth = 2;
    // Phone outline (portrait orientation)
    ctx.strokeRect(rx - 5, ry - 8, 10, 16);
    // Curved arrow indicating rotation
    ctx.beginPath();
    ctx.arc(rx + 8, ry, 6, -Math.PI * 0.7, Math.PI * 0.7);
    ctx.stroke();
    // Arrow head
    ctx.fillStyle = '#78b4ff';
    const ax = rx + 8 + Math.cos(Math.PI * 0.7) * 6;
    const ay = ry + Math.sin(Math.PI * 0.7) * 6;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax - 3, ay - 4);
    ctx.lineTo(ax + 2, ay - 5);
    ctx.closePath();
    ctx.fill();
  },

  renderMenu() {
    const ctx = this.ctx;
    // dark background
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);

    // draw village scene as backdrop
    const bg = Assets.get('backgrounds/scene_village_forest');
    if (bg && bg.complete) {
      ctx.globalAlpha = 0.4;
      ctx.drawImage(bg, 0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
      ctx.globalAlpha = 1;
    }

    // title logo
    const logo = Assets.get('ui/title_logo');
    if (logo && logo.complete) {
      const scale = Math.min(400 / logo.width, 1.5);
      Assets.drawCentered(ctx, 'ui/title_logo', CONFIG.CANVAS_W/2, 150, scale, 0, 1);
    } else {
      ctx.fillStyle = '#c4a87a';
      ctx.font = 'bold 48px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText('环刀旅者', CONFIG.CANVAS_W/2, 150);
    }

    ctx.fillStyle = '#8a7a5a';
    ctx.font = '14px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('CURSED BLADES — 诅咒之刃', CONFIG.CANVAS_W/2, 200);

    // start button
    this.drawButton(CONFIG.CANVAS_W/2 - 100, 300, 200, 50, '开始新游戏', '#c4a87a');
    // continue button
    if (this.hasSave()) {
      this.drawButton(CONFIG.CANVAS_W/2 - 100, 370, 200, 50, '继续游戏', '#8aaa6a');
      // reset save button with confirmation state
      const confirmActive = this.resetConfirmTimer > 0;
      this.drawButton(CONFIG.CANVAS_W/2 - 100, 440, 200, 36,
        confirmActive ? '再次点击确认清除' : '重置存档',
        confirmActive ? '#ff6060' : '#6a4a3a');
      // settings button
      this.drawButton(CONFIG.CANVAS_W/2 - 100, 490, 200, 36, '设置', '#6a6a8a');
    } else {
      // settings button (no save case)
      this.drawButton(CONFIG.CANVAS_W/2 - 100, 370, 200, 36, '设置', '#6a6a8a');
    }

    ctx.fillStyle = '#5a4a30';
    ctx.font = '11px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('WASD / 摇杆移动  |  空格 / 按钮闪避  |  ESC / 图标暂停', CONFIG.CANVAS_W/2, CONFIG.CANVAS_H - 30);
  },

  drawButton(x, y, w, h, text, color) {
    const ctx = this.ctx;
    const hover = Input.isMouseInRect(x, y, w, h);
    ctx.fillStyle = hover ? 'rgba(60,50,30,0.9)' : 'rgba(30,25,15,0.8)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = hover ? color : '#4a3a20';
    ctx.lineWidth = hover ? 3 : 2;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = hover ? '#ffffff' : color;
    ctx.font = 'bold 16px Courier New';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + w/2, y + h/2);
    ctx.textBaseline = 'alphabetic';
  },

  renderStory() {
    StoryUI.render(this);
  },

  drawTextWrapped(ctx, text, x, y, maxW, lineH) {
    const chars = text.split('');
    let line = '';
    let curY = y;
    for (let i = 0; i < chars.length; i++) {
      const testLine = line + chars[i];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxW && line.length > 0) {
        ctx.fillText(line, x, curY);
        line = chars[i];
        curY += lineH;
      } else {
        line = testLine;
      }
    }
    if (line) ctx.fillText(line, x, curY);
  },

  renderPause() {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
    ctx.fillStyle = '#c4a87a';
    ctx.font = 'bold 36px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('暂停', CONFIG.CANVAS_W/2, 160);

    this.drawButton(CONFIG.CANVAS_W/2 - 100, 220, 200, 45, '继续游戏', '#c4a87a');
    this.drawButton(CONFIG.CANVAS_W/2 - 100, 280, 200, 45, '保存并退出', '#8aaa6a');
    this.drawButton(CONFIG.CANVAS_W/2 - 100, 340, 200, 45, '返回主菜单', '#aa6a4a');
    this.drawButton(CONFIG.CANVAS_W/2 - 100, 400, 200, 45, '设置', '#6a6a8a');
  },

  // ---- Settings overlay ----
  openSettings() {
    this._settingsOverlay = true;
    this._dragSlider = null;
  },

  closeSettings() {
    this._settingsOverlay = false;
    this._dragSlider = null;
    // persist and apply
    Audio2.syncVolumes(this.settings);
    this.saveMeta();
  },

  // slider geometry helper
  _getSliderRects() {
    const cx = CONFIG.CANVAS_W / 2;
    const trackW = 240;
    const trackX = cx - trackW / 2;
    const baseY = 220;
    const gap = 60;
    return [
      { key: 'master', label: '主音量',  val: this.settings.masterVolume, x: trackX, y: baseY,             w: trackW },
      { key: 'sfx',    label: '音效音量', val: this.settings.sfxVolume,    x: trackX, y: baseY + gap,       w: trackW },
      { key: 'music',  label: '音乐音量', val: this.settings.musicVolume,  x: trackX, y: baseY + gap * 2,   w: trackW },
    ];
  },

  updateSettingsOverlay() {
    const sliders = this._getSliderRects();

    // start dragging a slider
    if (Input.mouse.clicked) {
      for (const s of sliders) {
        // clickable area: track + knob (expanded vertically for touch)
        if (Input.isMouseInRect(s.x - 10, s.y - 12, s.w + 20, 24)) {
          this._dragSlider = s.key;
          Input.mouse.clicked = false;
          break;
        }
      }
      // back button
      if (Input.consumeClick(CONFIG.CANVAS_W/2 - 80, 420, 160, 40)) {
        this.closeSettings();
        Audio2.click();
        return;
      }
    }

    // while dragging, update value from mouse X
    if (this._dragSlider && Input.mouse.down) {
      const s = sliders.find(sl => sl.key === this._dragSlider);
      if (s) {
        const t = clamp((Input.mouse.x - s.x) / s.w, 0, 1);
        this.settings[this._dragSlider + 'Volume'] = t;
        Audio2.syncVolumes(this.settings);
        // preview sound when adjusting sfx
        if (this._dragSlider === 'sfx' && Math.random() < 0.15) Audio2.click();
      }
    } else {
      this._dragSlider = null;
    }

    // ESC closes
    if (Input.wasPressed('Escape')) {
      this.closeSettings();
      Audio2.click();
    }
  },

  renderSettings() {
    const ctx = this.ctx;
    // dark overlay
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);

    // panel
    const px = CONFIG.CANVAS_W/2 - 170;
    const py = 150;
    const pw = 340;
    const ph = 320;
    ctx.fillStyle = 'rgba(20,18,25,0.95)';
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = '#6a6a8a';
    ctx.lineWidth = 3;
    ctx.strokeRect(px, py, pw, ph);

    // title
    ctx.fillStyle = '#a0a0d0';
    ctx.font = 'bold 24px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('设置', CONFIG.CANVAS_W/2, py + 35);

    // sliders
    const sliders = this._getSliderRects();
    for (const s of sliders) {
      // label
      ctx.fillStyle = '#c0c0d0';
      ctx.font = '14px Courier New';
      ctx.textAlign = 'left';
      ctx.fillText(s.label, s.x, s.y - 8);

      // value
      ctx.fillStyle = '#8a8aaa';
      ctx.font = '12px Courier New';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(s.val * 100) + '%', s.x + s.w, s.y - 8);

      // track background
      ctx.fillStyle = 'rgba(40,38,50,0.9)';
      ctx.fillRect(s.x, s.y, s.w, 8);
      ctx.strokeStyle = '#3a3a4a';
      ctx.lineWidth = 1;
      ctx.strokeRect(s.x, s.y, s.w, 8);

      // filled portion
      const fillW = s.w * s.val;
      const isDragging = this._dragSlider === s.key;
      ctx.fillStyle = isDragging ? '#a0a0ff' : '#6a6acc';
      ctx.fillRect(s.x, s.y, fillW, 8);

      // knob
      const knobX = s.x + fillW;
      const knobR = isDragging ? 10 : 8;
      ctx.fillStyle = isDragging ? '#e0e0ff' : '#a0a0cc';
      ctx.beginPath();
      ctx.arc(knobX, s.y + 4, knobR, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#4a4a6a';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // back button
    this.drawButton(CONFIG.CANVAS_W/2 - 80, 420, 160, 40, '返回', '#6a6a8a');

    // hint
    ctx.fillStyle = '#5a5a6a';
    ctx.font = '11px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('拖动滑块调节音量  |  ESC 返回', CONFIG.CANVAS_W/2, 475);
  },

  isPortrait() {
    return !this._rotate90 && window.innerHeight > window.innerWidth;
  },

  renderLevelUp() {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,20,0.8)';
    ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);

    const layout = this.getChoiceLayout(this.upgradeChoices.length);
    const portrait = layout.portrait;

    ctx.fillStyle = '#ffd040';
    ctx.font = 'bold 32px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('升级!', CONFIG.CANVAS_W/2, portrait ? 60 : 80);
    ctx.fillStyle = '#c4a87a';
    ctx.font = '14px Courier New';
    ctx.fillText(`等级 ${this.player.level}  —  选择一项强化`, CONFIG.CANVAS_W/2, portrait ? 90 : 110);

    // draw 3 cards
    for (let i = 0; i < this.upgradeChoices.length; i++) {
      const choice = this.upgradeChoices[i];
      const card = layout.cards[i];
      const cardX = card.x, cardY = card.y, cardW = card.w, cardH = card.h;
      const hover = Input.isMouseInRect(cardX, cardY, cardW, cardH);

      // Rarity-based colors
      const rarityKey = choice.rarity || 'common';
      const rarity = CONFIG.RARITY[rarityKey] || CONFIG.RARITY.common;

      ctx.fillStyle = hover ? 'rgba(40,35,20,0.95)' : 'rgba(20,18,12,0.9)';
      ctx.fillRect(cardX, cardY, cardW, cardH);
      ctx.strokeStyle = hover ? rarity.glow : rarity.color;
      ctx.lineWidth = hover ? 4 : 2;
      ctx.strokeRect(cardX, cardY, cardW, cardH);

      // Rarity label (top center)
      ctx.fillStyle = rarity.color;
      ctx.font = 'bold 10px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText(rarity.name, cardX + cardW/2, cardY + 16);

      // Level indicator (top right) for stat upgrades
      if (!choice.weaponId && choice.maxLevel) {
        const curLevel = this.player.upgradeLevels[choice.id] || 0;
        ctx.fillStyle = curLevel >= choice.maxLevel ? '#ff6040' : '#8a7a5a';
        ctx.font = '10px Courier New';
        ctx.textAlign = 'right';
        ctx.fillText(`Lv.${curLevel}/${choice.maxLevel}`, cardX + cardW - 8, cardY + 16);
      }

      // Desc with fallback for weapon unlocks (fixes crash)
      const descText = choice.desc || (choice.weaponId ? (CONFIG.WEAPONS[choice.weaponId] ? CONFIG.WEAPONS[choice.weaponId].desc : '') : '');

      if (portrait) {
        // Horizontal card layout: icon on left, text on right
        const iconScale = 3.0;
        Assets.drawCentered(ctx, choice.icon, cardX + 32, cardY + cardH/2, iconScale, 0, 1);

        ctx.fillStyle = '#ffd040';
        ctx.font = 'bold 14px Courier New';
        ctx.textAlign = 'left';
        this.drawTextWrapped(ctx, choice.name, cardX + 65, cardY + 42, cardW - 75, 17);

        ctx.fillStyle = '#c4a87a';
        ctx.font = '12px Courier New';
        if (descText) this.drawTextWrapped(ctx, descText, cardX + 65, cardY + 68, cardW - 75, 15);
      } else {
        // Vertical card layout: icon on top, text below
        const iconScale = 3.0;
        Assets.drawCentered(ctx, choice.icon, cardX + cardW/2, cardY + 70, iconScale, 0, 1);

        ctx.fillStyle = '#ffd040';
        ctx.font = 'bold 15px Courier New';
        ctx.textAlign = 'center';
        this.drawTextWrapped(ctx, choice.name, cardX + cardW/2, cardY + 130, cardW - 20, 18);

        ctx.fillStyle = '#c4a87a';
        ctx.font = '12px Courier New';
        if (descText) this.drawTextWrapped(ctx, descText, cardX + cardW/2, cardY + 175, cardW - 20, 16);
      }

      // key hint
      ctx.fillStyle = '#5a4a30';
      ctx.font = '11px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText(`[${i+1}]`, cardX + cardW/2, cardY + cardH - 15);
    }
  },

  renderChestReward() {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(20,15,5,0.85)';
    ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);

    const layout = this.getChoiceLayout(this.chestRewardChoices.length);
    const portrait = layout.portrait;

    ctx.fillStyle = '#ffd040';
    ctx.font = 'bold 32px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('宝箱奖励!', CONFIG.CANVAS_W/2, portrait ? 60 : 80);
    ctx.fillStyle = '#c4a87a';
    ctx.font = '14px Courier New';
    ctx.fillText('选择一项奖励', CONFIG.CANVAS_W/2, portrait ? 90 : 110);

    for (let i = 0; i < this.chestRewardChoices.length; i++) {
      const choice = this.chestRewardChoices[i];
      const card = layout.cards[i];
      const cardX = card.x, cardY = card.y, cardW = card.w, cardH = card.h;
      const hover = Input.isMouseInRect(cardX, cardY, cardW, cardH);

      // Rarity-based colors
      const rarityKey = choice.rarity || 'common';
      const rarity = CONFIG.RARITY[rarityKey] || CONFIG.RARITY.common;

      ctx.fillStyle = hover ? 'rgba(40,35,15,0.95)' : 'rgba(25,20,10,0.9)';
      ctx.fillRect(cardX, cardY, cardW, cardH);
      ctx.strokeStyle = hover ? rarity.glow : rarity.color;
      ctx.lineWidth = hover ? 4 : 2;
      ctx.strokeRect(cardX, cardY, cardW, cardH);

      // Rarity label (top center)
      ctx.fillStyle = rarity.color;
      ctx.font = 'bold 10px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText(rarity.name, cardX + cardW/2, cardY + 16);

      // Level indicator (top right) for stat upgrades
      if (!choice.weaponId && choice.maxLevel) {
        const curLevel = this.player.upgradeLevels[choice.id] || 0;
        ctx.fillStyle = curLevel >= choice.maxLevel ? '#ff6040' : '#8a7a5a';
        ctx.font = '10px Courier New';
        ctx.textAlign = 'right';
        ctx.fillText(`Lv.${curLevel}/${choice.maxLevel}`, cardX + cardW - 8, cardY + 16);
      }

      const chestIconScale = choice.weaponId ? 2.5 : 3.0;
      const descText = choice.desc || (choice.weaponId ? (CONFIG.WEAPONS[choice.weaponId] ? CONFIG.WEAPONS[choice.weaponId].desc : '') : '');

      if (portrait) {
        Assets.drawCentered(ctx, choice.icon, cardX + 32, cardY + cardH/2, chestIconScale, 0, 1);
        ctx.fillStyle = '#ffd040';
        ctx.font = 'bold 14px Courier New';
        ctx.textAlign = 'left';
        this.drawTextWrapped(ctx, choice.name, cardX + 65, cardY + 42, cardW - 75, 17);
        if (descText) {
          ctx.fillStyle = '#c4a87a';
          ctx.font = '12px Courier New';
          this.drawTextWrapped(ctx, descText, cardX + 65, cardY + 68, cardW - 75, 15);
        }
      } else {
        Assets.drawCentered(ctx, choice.icon, cardX + cardW/2, cardY + 70, chestIconScale, 0, 1);
        ctx.fillStyle = '#ffd040';
        ctx.font = 'bold 15px Courier New';
        ctx.textAlign = 'center';
        this.drawTextWrapped(ctx, choice.name, cardX + cardW/2, cardY + 130, cardW - 20, 18);
        if (descText) {
          ctx.fillStyle = '#c4a87a';
          ctx.font = '12px Courier New';
          this.drawTextWrapped(ctx, descText, cardX + cardW/2, cardY + 175, cardW - 20, 16);
        }
      }
    }
  },

  renderGameOver() {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(20,0,0,0.8)';
    ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);

    ctx.fillStyle = '#ff4040';
    ctx.font = 'bold 48px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('你失败了', CONFIG.CANVAS_W/2, 120);

    // stats
    ctx.fillStyle = '#c4a87a';
    ctx.font = '16px Courier New';
    ctx.fillText(`等级: ${this.player.level}  |  击杀: ${this.player.kills}`, CONFIG.CANVAS_W/2, 165);
    ctx.fillText(`存活时间: ${Math.floor(this.levelTime/60)}分${Math.floor(this.levelTime%60)}秒`, CONFIG.CANVAS_W/2, 190);
    ctx.fillStyle = '#ff8040';
    ctx.fillText(`精英击杀: ${this.eliteKills}  |  Boss击杀: ${this.bossKills}  |  宝箱开启: ${this.chestsOpened}`, CONFIG.CANVAS_W/2, 215);

    // weapon list
    ctx.fillStyle = '#80c0ff';
    ctx.font = 'bold 14px Courier New';
    ctx.fillText('获得武器:', CONFIG.CANVAS_W/2, 250);
    ctx.font = '13px Courier New';
    const weaponNames = this.player.weapons.map(w => `${w.def.name} Lv.${w.level}`);
    // wrap weapon names into rows of up to 4
    const perRow = 4;
    for (let i = 0; i < weaponNames.length; i += perRow) {
      const row = weaponNames.slice(i, i + perRow).join('  ');
      ctx.fillText(row, CONFIG.CANVAS_W/2, 275 + Math.floor(i / perRow) * 20);
    }

    // best records
    ctx.fillStyle = '#5a8a5a';
    ctx.font = '12px Courier New';
    const bestTime = Math.floor(this.meta.bestSurvivalTime/60) + '分' + Math.floor(this.meta.bestSurvivalTime%60) + '秒';
    ctx.fillText(`最高记录: 等级${this.meta.bestLevel}  |  击杀${this.meta.bestKills}  |  存活${bestTime}`, CONFIG.CANVAS_W/2, 320);

    this.drawButton(CONFIG.CANVAS_W/2 - 100, 360, 200, 45, '重新开始', '#c4a87a');
    this.drawButton(CONFIG.CANVAS_W/2 - 100, 420, 200, 45, '返回主菜单', '#aa6a4a');
  },

  renderVictory() {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,15,5,0.8)';
    ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);

    ctx.fillStyle = '#40ff60';
    ctx.font = 'bold 48px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('最终通关!', CONFIG.CANVAS_W/2, 160);

    ctx.fillStyle = '#c4a87a';
    ctx.font = '16px Courier New';
    ctx.fillText('腐化巨蛛已被击败，诅咒的源头彻底消散！', CONFIG.CANVAS_W/2, 210);
    ctx.fillText(`等级: ${this.player.level}  |  击杀: ${this.player.kills}`, CONFIG.CANVAS_W/2, 240);
    ctx.fillText(`用时: ${Math.floor(this.levelTime/60)}分${Math.floor(this.levelTime%60)}秒`, CONFIG.CANVAS_W/2, 270);

    ctx.fillStyle = '#8a7a5a';
    ctx.font = '13px Courier New';
    ctx.fillText('旅者带着环刀，踏上了新的旅途……', CONFIG.CANVAS_W/2, 320);

    this.drawButton(CONFIG.CANVAS_W/2 - 100, 380, 200, 45, '返回主菜单', '#c4a87a');
  },
};
