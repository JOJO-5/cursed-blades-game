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
  minions: [], // summoned allies that fight for the player

  camera: { x: 0, y: 0, shakeX: 0, shakeY: 0, shakeTime: 0, shakeMag: 0 },
  damageVignette: 0,
  time: 0,
  levelTime: 0,
  spawnTimer: 0,
  eliteTimer: 0,
  bossSpawned: false,
  bossDefeated: false,
  bossDefeatedGraceTimer: 0,
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
  pendingLevelUps: 0,
  _choiceIconCropCache: {},

  // settings overlay state
  _settingsOverlay: false,
  _dragSlider: null,    // which slider is being dragged: 'master'|'sfx'|'music'|null

  // run statistics (persist across levels within a run, reset on new game)
  eliteKills: 0,
  bossKills: 0,
  chestsOpened: 0,

  saveKey: 'cursed_blades_save',
  metaKey: 'cursed_blades_meta',
  saveSchemaVersion: 4,

  // Object pools (initialized in init() — reduce GC by reusing entities)
  particlePool: null,
  projectilePool: null,
  enemyProjectilePool: null,
  damageNumberPool: null,
  pickupPool: null,

  // Spatial grid for broad-phase collision (rebuilt each frame)
  enemyGrid: null,

  // ---- Initialization ----
  init() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    // Initialize object pools (pre-allocate to reduce GC during gameplay)
    this.particlePool = new ObjectPool(Particle, 200);
    this.projectilePool = new ObjectPool(Projectile, 50);
    this.enemyProjectilePool = new ObjectPool(EnemyProjectile, 30);
    this.damageNumberPool = new ObjectPool(DamageNumber, 100);
    this.pickupPool = new ObjectPool(Pickup, 50);

    // Spatial grid for collision optimization (128px cells)
    this.enemyGrid = new SpatialGrid(128);

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
        Audio2.playMusic('menu');
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
    Audio2.playMusic('menu');
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
      this.particlePool.recycle(this.particles);
      for (const d of this.damageNumbers) d.update(dt);
      this.damageNumberPool.recycle(this.damageNumbers);
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
      Audio2.stopMusic();
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

    // Boss defeated grace period: allow player to collect drops before victory sequence
    if (this.bossDefeatedGraceTimer > 0) {
      this.bossDefeatedGraceTimer -= dt;
      if (this.bossDefeatedGraceTimer <= 0) {
        this.bossDefeatedGraceTimer = 0;
        this.startVictorySequence();
      }
      // Still update player, pickups, particles, camera during grace period
      this.player.update(dt);
      for (const p of this.pickups) p.update(dt);
      this.pickupPool.recycle(this.pickups);
      for (const p of this.particles) p.update(dt);
      this.particlePool.recycle(this.particles);
      for (const d of this.damageNumbers) d.update(dt);
      this.damageNumberPool.recycle(this.damageNumbers);
      // camera follows player
      const tx = this.player.x - CONFIG.CANVAS_W / 2;
      const ty = this.player.y - CONFIG.CANVAS_H / 2;
      this.camera.x = lerp(this.camera.x, tx, 0.1);
      this.camera.y = lerp(this.camera.y, ty, 0.1);
      const mapW = this.levelData.mapW * CONFIG.TILE_SIZE;
      const mapH = this.levelData.mapH * CONFIG.TILE_SIZE;
      this.camera.x = clamp(this.camera.x, 0, Math.max(0, mapW - CONFIG.CANVAS_W));
      this.camera.y = clamp(this.camera.y, 0, Math.max(0, mapH - CONFIG.CANVAS_H));
      return;
    }

    // Rebuild spatial grid for collision queries (before player/weapons/projectiles use it)
    this.enemyGrid.clear();
    for (const e of this.enemies) {
      if (e.alive) this.enemyGrid.insert(e);
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
    this.projectilePool.recycle(this.projectiles);

    for (const p of this.enemyProjectiles) p.update(dt);
    this.enemyProjectilePool.recycle(this.enemyProjectiles);

    // update summoned minions
    for (const m of this.minions) m.update(dt);
    this.minions = this.minions.filter(m => m.alive);

    for (const p of this.pickups) p.update(dt);
    this.pickupPool.recycle(this.pickups);

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
      } else if (ev.type === 'ambush') {
        const count = this.spawnEnemyGroup(ev.enemyPool || phase.enemyPool || [], ev.count || 4);
        if (count > 0) {
          this.addMessage(ev.text || '怪物突袭！', ev.color || '#ff6040');
          this.shakeScreen(4, 0.2);
        }
      } else if (ev.type === 'veinAmbush' || ev.type === 'riftAmbush') {
        const count = this.spawnEnemyGroupAtMapFeatures(
          ev.featureType || (ev.type === 'riftAmbush' ? 'demonRift' : 'crystalVein'),
          ev.enemyPool || phase.enemyPool || [],
          ev.count || 4,
          ev.radius || 90
        );
        if (count > 0) {
          this.addMessage(ev.text || (ev.type === 'riftAmbush' ? '恶魔裂隙涌出敌人！' : '矿脉惊动了敌人！'), ev.color || '#80e8ff');
          this.shakeScreen(5, 0.25);
        }
      } else if (ev.type === 'boss') {
        this.spawnBoss();
      } else if (ev.type === 'message') {
        this.addMessage(ev.text || '', ev.color || '#ffffff');
      }
    }
  },

  spawnEnemyGroup(pool, count) {
    if (!pool || pool.length === 0 || !this.player) return 0;
    let spawned = 0;
    const maxExtra = Math.max(0, (this.getActivePhase()?.maxEnemies || this.levelData.maxEnemies || 30) - this.enemies.length);
    const targetCount = Math.min(count, Math.max(maxExtra, Math.ceil(count * 0.5)));
    for (let i = 0; i < targetCount; i++) {
      const type = pick(pool);
      const pos = this.getSpawnPosition(CONFIG.ENEMIES[type]?.radius || 16);
      if (!pos) continue;
      this.enemies.push(new Enemy(type, pos.x, pos.y));
      spawned++;
    }
    return spawned;
  },

  spawnEnemyGroupAtMapFeatures(featureType, pool, count, spawnRadius) {
    if (!pool || pool.length === 0 || !this.player) return 0;
    const features = (this.mapData && this.mapData.features || []).filter(f => f.type === featureType);
    if (features.length === 0) return this.spawnEnemyGroup(pool, count);

    let spawned = 0;
    const maxExtra = Math.max(0, (this.getActivePhase()?.maxEnemies || this.levelData.maxEnemies || 30) - this.enemies.length);
    const targetCount = Math.min(count, Math.max(maxExtra, Math.ceil(count * 0.5)));
    const mapW = this.levelData.mapW * CONFIG.TILE_SIZE;
    const mapH = this.levelData.mapH * CONFIG.TILE_SIZE;
    const radius = spawnRadius || 90;

    for (let i = 0; i < targetCount; i++) {
      const feature = features[i % features.length];
      const type = pick(pool);
      const enemyRadius = CONFIG.ENEMIES[type]?.radius || 16;
      let pos = null;

      for (let attempt = 0; attempt < 12; attempt++) {
        const ang = Math.random() * TAU;
        const r = radius * (0.35 + Math.random() * 0.75);
        const x = clamp(feature.x + Math.cos(ang) * r, 30, mapW - 30);
        const y = clamp(feature.y + Math.sin(ang) * r, 30, mapH - 30);
        const clear = !this.isCircleBlocked(x, y, enemyRadius);
        const notOnTopOfPlayer = dist(x, y, this.player.x, this.player.y) > 170 || attempt > 8;
        if (clear && notOnTopOfPlayer) {
          pos = { x, y };
          break;
        }
      }

      if (!pos) continue;
      this.enemies.push(new Enemy(type, pos.x, pos.y));
      spawned++;
    }

    return spawned;
  },

  spawnEnemyFromPhase(phase) {
    const pool = phase.enemyPool && phase.enemyPool.length > 0 ? phase.enemyPool : this.levelData.enemyPool;
    if (pool.length === 0) return;
    const type = pick(pool);
    const pos = this.getSpawnPosition(CONFIG.ENEMIES[type]?.radius || 16);
    if (pos) this.enemies.push(new Enemy(type, pos.x, pos.y));

    // sometimes spawn ranged from phase rangedPool
    const rPool = phase.rangedPool || [];
    if (rPool.length > 0 && Math.random() < 0.3) {
      const rType = pick(rPool);
      const pos2 = this.getSpawnPosition(CONFIG.ENEMIES[rType]?.radius || 16);
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
          this.clampEntityToMap(a);
          this.clampEntityToMap(b);
        }
      }
    }
  },

  // ---- Spawning ----
  spawnEnemy() {
    const type = pick(this.levelData.enemyPool);
    const pos = this.getSpawnPosition(CONFIG.ENEMIES[type]?.radius || 16);
    if (pos) this.enemies.push(new Enemy(type, pos.x, pos.y));

    // sometimes spawn ranged
    if (Math.random() < 0.3 && this.levelData.rangedPool.length > 0) {
      const rType = pick(this.levelData.rangedPool);
      const pos2 = this.getSpawnPosition(CONFIG.ENEMIES[rType]?.radius || 16);
      if (pos2) this.enemies.push(new Enemy(rType, pos2.x, pos2.y));
    }
  },

  spawnElite() {
    const type = pick(this.levelData.elitePool);
    const pos = this.getSpawnPosition(CONFIG.ENEMIES[type]?.radius || 20);
    if (pos) {
      this.enemies.push(new Enemy(type, pos.x, pos.y));
      this.addMessage('精英怪物出现: ' + CONFIG.ENEMIES[type].name, '#ff8030');
      Audio2.boss();
    }
  },

  // ---- Prop collision: push entity out of solid props ----
  // entity is { x, y, radius }. Modifies entity.x/y in place.
  resolvePropCollision(entity) {
    if (!this.collisionProps || this.collisionProps.length === 0) return false;
    let collided = false;
    for (const prop of this.collisionProps) {
      if (prop.halfW && prop.halfH) {
        if (this.resolveRectPropCollision(entity, prop)) collided = true;
        continue;
      }

      let dx = entity.x - prop.x;
      let dy = entity.y - prop.y;
      const minDist = entity.radius + prop.radius;
      let d2 = dx * dx + dy * dy;
      if (d2 < minDist * minDist) {
        let push;
        if (d2 <= 0.001) {
          dx = 1;
          dy = 0;
          d2 = 1;
          push = minDist;
        } else {
          const d = Math.sqrt(d2);
          push = (minDist - d) / d;
        }
        entity.x += dx * push;
        entity.y += dy * push;
        collided = true;
      }
    }
    return collided;
  },

  resolveRectPropCollision(entity, prop) {
    const cx = prop.collisionX ?? prop.x;
    const cy = prop.collisionY ?? prop.y;
    const left = cx - prop.halfW;
    const right = cx + prop.halfW;
    const top = cy - prop.halfH;
    const bottom = cy + prop.halfH;

    if (entity.x >= left && entity.x <= right && entity.y >= top && entity.y <= bottom) {
      const prevX = Number.isFinite(entity.prevX) ? entity.prevX : null;
      const prevY = Number.isFinite(entity.prevY) ? entity.prevY : null;
      if (prevX !== null && prevY !== null) {
        if (prevX < left && entity.x >= left) {
          entity.x = left - entity.radius;
          return true;
        }
        if (prevX > right && entity.x <= right) {
          entity.x = right + entity.radius;
          return true;
        }
        if (prevY < top && entity.y >= top) {
          entity.y = top - entity.radius;
          return true;
        }
        if (prevY > bottom && entity.y <= bottom) {
          entity.y = bottom + entity.radius;
          return true;
        }
      }

      const distLeft = entity.x - left;
      const distRight = right - entity.x;
      const distTop = entity.y - top;
      const distBottom = bottom - entity.y;
      const minSide = Math.min(distLeft, distRight, distTop, distBottom);

      if (minSide === distLeft) entity.x = left - entity.radius;
      else if (minSide === distRight) entity.x = right + entity.radius;
      else if (minSide === distTop) entity.y = top - entity.radius;
      else entity.y = bottom + entity.radius;
      return true;
    }

    const closestX = clamp(entity.x, left, right);
    const closestY = clamp(entity.y, top, bottom);
    let dx = entity.x - closestX;
    let dy = entity.y - closestY;
    let d2 = dx * dx + dy * dy;
    if (d2 >= entity.radius * entity.radius) return false;

    if (d2 <= 0.001) {
      dx = 1;
      dy = 0;
      d2 = 1;
    }
    const d = Math.sqrt(d2);
    const push = (entity.radius - d) / d;
    entity.x += dx * push;
    entity.y += dy * push;
    return true;
  },

  clampEntityToMap(entity, marginOverride) {
    if (!entity || !this.levelData) return;
    const mapW = this.levelData.mapW * CONFIG.TILE_SIZE;
    const mapH = this.levelData.mapH * CONFIG.TILE_SIZE;
    const margin = Math.max(1, marginOverride ?? entity.radius ?? 16);
    const oldX = entity.x;
    const oldY = entity.y;
    entity.x = clamp(entity.x, margin, Math.max(margin, mapW - margin));
    entity.y = clamp(entity.y, margin, Math.max(margin, mapH - margin));

    if (entity.x !== oldX) {
      if ((oldX < entity.x && entity.vx < 0) || (oldX > entity.x && entity.vx > 0)) entity.vx = 0;
      if ((oldX < entity.x && entity.knockbackVx < 0) || (oldX > entity.x && entity.knockbackVx > 0)) entity.knockbackVx = 0;
      if ((oldX < entity.x && entity.chargeVx < 0) || (oldX > entity.x && entity.chargeVx > 0)) entity.chargeVx = 0;
    }
    if (entity.y !== oldY) {
      if ((oldY < entity.y && entity.vy < 0) || (oldY > entity.y && entity.vy > 0)) entity.vy = 0;
      if ((oldY < entity.y && entity.knockbackVy < 0) || (oldY > entity.y && entity.knockbackVy > 0)) entity.knockbackVy = 0;
      if ((oldY < entity.y && entity.chargeVy < 0) || (oldY > entity.y && entity.chargeVy > 0)) entity.chargeVy = 0;
    }
  },

  getPropCollisionRadius(categoryKey, type) {
    return this.getPropCollisionFootprint(categoryKey, type).radius;
  },

  getPropCollisionFootprint(categoryKey, type) {
    const base = CONFIG.PROP_COLLISION[categoryKey] || 0;
    if (base <= 0) return { radius: 0 };

    const img = Assets.get(type);
    if (!img || !img.width || !img.height) return { radius: base };

    const shape = (CONFIG.PROP_COLLISION_SHAPES && CONFIG.PROP_COLLISION_SHAPES[categoryKey]) || {};
    const scaleX = shape.scaleX ?? 0.18;
    const scaleY = shape.scaleY ?? 0.14;
    const maxHalfW = shape.maxHalfW ?? 34;
    const maxHalfH = shape.maxHalfH ?? 26;
    const halfW = Math.max(base, Math.min(maxHalfW, Math.round(img.width * scaleX)));
    const halfH = Math.max(base, Math.min(maxHalfH, Math.round(img.height * scaleY)));
    const radius = Math.max(base, Math.max(halfW, halfH));
    return {
      radius,
      halfW,
      halfH,
      collisionOffsetX: shape.offsetX || 0,
      collisionOffsetY: shape.offsetY || 0,
    };
  },

  footprintOverlapsCircle(propX, propY, footprint, circleX, circleY, circleRadius) {
    if (!footprint || footprint.radius <= 0) return false;
    const cx = footprint.collisionX ?? (propX + (footprint.collisionOffsetX || 0));
    const cy = footprint.collisionY ?? (propY + (footprint.collisionOffsetY || 0));

    if (footprint.halfW && footprint.halfH) {
      const closestX = clamp(circleX, cx - footprint.halfW, cx + footprint.halfW);
      const closestY = clamp(circleY, cy - footprint.halfH, cy + footprint.halfH);
      return dist(closestX, closestY, circleX, circleY) < circleRadius;
    }

    return dist(cx, cy, circleX, circleY) < footprint.radius + circleRadius;
  },

  isCircleBlocked(x, y, radius) {
    if (!this.collisionProps || this.collisionProps.length === 0) return false;
    return this.collisionProps.some(prop => this.footprintOverlapsCircle(prop.x, prop.y, prop, x, y, radius));
  },

  applyPlayerHitEffects(enemy, damage, weapon, player, isCrit, opts) {
    if (!enemy || !enemy.alive || !player || !player.stats) return;
    const secondary = opts && opts.secondary;
    const weaponId = typeof weapon === 'string' ? weapon : weapon?.id;
    const weaponDef = (weapon && weapon.def) || CONFIG.WEAPONS[weaponId] || {};
    const tags = this.getWeaponTags(weaponId);
    const stats = player.stats;

    if (enemy.applyStatusEffect && tags.has('fire') && stats.burnChance > 0 && Math.random() < stats.burnChance) {
      const burnDps = Math.max(2, damage * 0.18 * (stats.burnDamageMult || 1));
      enemy.applyStatusEffect('burn', 3.0, burnDps);
      this.spawnDamageNumber(enemy.x, enemy.y - enemy.radius - 18, '点燃', '#ff8030');
    }

    if (enemy.applyStatusEffect && tags.has('poison') && stats.poisonChance > 0 && Math.random() < stats.poisonChance) {
      const poisonDps = Math.max(1.5, damage * 0.12 * (stats.poisonDamageMult || 1));
      const slowMult = clamp(1 - (stats.poisonSlow || 0), 0.55, 0.95);
      enemy.applyStatusEffect('poison', 4.0, poisonDps, slowMult);
      this.spawnDamageNumber(enemy.x, enemy.y - enemy.radius - 18, '剧毒', '#60d060');
    }

    if (!secondary && stats.chainLightningChance > 0 &&
        (tags.has('projectile') || tags.has('homing') || tags.has('arcane')) &&
        Math.random() < stats.chainLightningChance) {
      this.chainLightning(enemy, damage * 0.45, weaponDef.color || '#80c0ff', isCrit);
    }

    if (!secondary && stats.orbitPulseChance > 0 &&
        (tags.has('orbit') || tags.has('aura')) &&
        Math.random() < stats.orbitPulseChance) {
      this.orbitPulse(enemy.x, enemy.y, damage * 0.32, weaponDef.color || '#ffd040');
    }
  },

  chainLightning(sourceEnemy, damage, color, fromCrit) {
    if (!sourceEnemy || !this.enemyGrid) return;
    const candidates = this.enemyGrid.query(sourceEnemy.x, sourceEnemy.y, 150)
      .filter(e => e.alive && e.id !== sourceEnemy.id)
      .sort((a, b) => dist(sourceEnemy.x, sourceEnemy.y, a.x, a.y) - dist(sourceEnemy.x, sourceEnemy.y, b.x, b.y))
      .slice(0, fromCrit ? 3 : 2);
    if (!candidates.length) return;
    let fromX = sourceEnemy.x;
    let fromY = sourceEnemy.y;
    for (const target of candidates) {
      target.takeDamage(damage, false, 20, fromX, fromY);
      if (this.particles.length < 800) {
        for (let i = 0; i < 6; i++) {
          const t = i / 5;
          this.particles.push(this.particlePool.obtain(
            fromX + (target.x - fromX) * t,
            fromY + (target.y - fromY) * t,
            rand(-20, 20), rand(-20, 20),
            color || '#80c0ff',
            0.25,
            3
          ));
        }
      }
      fromX = target.x;
      fromY = target.y;
    }
    this.spawnDamageNumber(sourceEnemy.x, sourceEnemy.y - sourceEnemy.radius - 20, '连锁', color || '#80c0ff');
    Audio2.play('triangle', 520, 0.08, 0.04);
  },

  orbitPulse(x, y, damage, color) {
    if (!this.enemyGrid) return;
    const radius = 85;
    let hits = 0;
    for (const enemy of this.enemyGrid.query(x, y, radius)) {
      if (!enemy.alive) continue;
      const d = dist(x, y, enemy.x, enemy.y);
      if (d > radius + enemy.radius) continue;
      enemy.takeDamage(damage, false, 35, x, y);
      hits++;
    }
    if (hits > 0) {
      this.spawnDamageNumber(x, y - 24, '共振', color || '#ffd040');
      for (let i = 0; i < 14 && this.particles.length < 800; i++) {
        const a = (i / 14) * TAU;
        this.particles.push(this.particlePool.obtain(
          x, y,
          Math.cos(a) * 120,
          Math.sin(a) * 120,
          color || '#ffd040',
          0.28,
          4
        ));
      }
      this.shakeScreen(3, 0.12);
    }
  },

  guardRetaliation(player) {
    if (!player || !this.enemyGrid) return;
    const radius = 95;
    const damage = 14 + (player.stats.armor || 0) * 4;
    let hits = 0;
    for (const enemy of this.enemyGrid.query(player.x, player.y, radius)) {
      if (!enemy.alive) continue;
      if (dist(player.x, player.y, enemy.x, enemy.y) > radius + enemy.radius) continue;
      enemy.takeDamage(damage, false, 90, player.x, player.y);
      hits++;
    }
    if (hits > 0) {
      this.spawnDamageNumber(player.x, player.y - 36, '反击', '#80c0ff');
      this.addMessage('守势反击!', '#80c0ff');
      Audio2.play('square', 180, 0.12, 0.06);
      this.shakeScreen(5, 0.18);
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
    Audio2.playMusic('boss');
    this.shakeScreen(10, 0.5);
    // show boss intro dialogue
    this.startStory(CONFIG.STORY[this.levelData.theme].bossIntro, () => { this.state = 'playing'; });
  },

  getSpawnPosition(radius) {
    const player = this.player;
    const spawnRadius = radius || 16;
    const mapW = this.levelData.mapW * CONFIG.TILE_SIZE;
    const mapH = this.levelData.mapH * CONFIG.TILE_SIZE;
    for (let attempt = 0; attempt < 20; attempt++) {
      const ang = Math.random() * TAU;
      const r = rand(350, 500);
      const x = clamp(player.x + Math.cos(ang) * r, 30, mapW - 30);
      const y = clamp(player.y + Math.sin(ang) * r, 30, mapH - 30);
      // make sure not too close to player
      if (dist(x, y, player.x, player.y) > 300 && !this.isCircleBlocked(x, y, spawnRadius)) {
        return { x, y };
      }
    }
    return null;
  },

  spawnChest(x, y, isRare) {
    // isRare: 0=normal, 1=rare, 2=suspicious
    this.pickups.push(this.pickupPool.obtain(x, y, 'chest', 'chest', isRare ? isRare : 0));
  },

  collectAllXpPickups(originX, originY) {
    if (!this.player || !Array.isArray(this.pickups)) return 0;
    let totalXp = 0;
    let count = 0;
    const visualLimit = 32;

    for (const pickup of this.pickups) {
      if (!pickup.alive || pickup.type !== 'xp') continue;
      totalXp += pickup.value || 0;
      pickup.alive = false;
      if (count < visualLimit && this.particlePool && this.particles.length < 800) {
        const ox = originX ?? this.player.x;
        const oy = originY ?? this.player.y;
        const ang = angleTo(pickup.x, pickup.y, ox, oy);
        this.particles.push(this.particlePool.obtain(
          pickup.x,
          pickup.y,
          Math.cos(ang) * 180,
          Math.sin(ang) * 180,
          '#80ffff',
          0.45,
          3
        ));
      }
      count++;
    }

    if (totalXp <= 0) {
      this.addMessage('没有可吸收的经验', '#80c0ff');
      return 0;
    }

    const levelsGained = this.player.gainXp(totalXp);
    this.addMessage('全图经验吸收 +' + Math.round(totalXp) + ' XP', '#80ffff');
    if (this.spawnDamageNumber && this.damageNumberPool) {
      this.spawnDamageNumber(this.player.x, this.player.y - 34, '+' + Math.round(totalXp) + 'XP', '#80ffff');
    }
    this.shakeScreen(3, 0.12);
    if (typeof Audio2 !== 'undefined' && Audio2.play) {
      Audio2.play('triangle', 780, 0.12, 0.05);
    }
    if (levelsGained) this.onLevelUp(levelsGained);
    return totalXp;
  },

  // ---- Level up ----
  onLevelUp(levelsGained = 1) {
    const count = Math.max(1, Math.floor(Number(levelsGained) || 1));
    this.pendingLevelUps = (this.pendingLevelUps || 0) + Math.max(0, count - 1);
    Audio2.levelup();
    this.state = 'levelup';
    this.generateUpgradeChoices();
  },

  finishLevelUpSelection() {
    if ((this.pendingLevelUps || 0) > 0) {
      this.pendingLevelUps--;
      this.onLevelUp(1);
    } else {
      this.state = 'playing';
    }
  },

  generateUpgradeChoices() {
    // Filter out maxed upgrades and unmet prerequisites
    const available = CONFIG.UPGRADES.filter(u => {
      const currentLevel = this.player.upgradeLevels[u.id] || 0;
      if (currentLevel >= u.maxLevel) return false;
      return this.upgradePrerequisiteMet(u);
    });

    const pool = available;

    // Luck increases the weight of rare/epic upgrades
    const luckMult = 1 + this.player.stats.luck * 0.15;
    const buildTags = this.getPlayerBuildTags();

    // Build weighted list
    const weighted = pool.map(u => {
      let w = u.weight || 50;
      if (u.rarity === 'rare') w *= luckMult;
      if (u.rarity === 'epic') w *= luckMult * 1.5;
      const synergy = this.getChoiceSynergyScore(u, buildTags);
      if (synergy > 0) w *= 1 + synergy * 0.45;
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

    this.ensureBuildChoice(choices, available, buildTags);

    // Offer weapons often, but not on every level: stat/relic choices still
    // need room so builds can reach evolution prerequisites and utility picks.
    const weaponChoices = this.getAvailableWeaponChoices(buildTags);
    if (weaponChoices.length > 0 && (!choices.length || Math.random() < this.getWeaponChoiceChance(weaponChoices, buildTags))) {
      const weaponChoice = this.pickWeightedChoice(this.weightWeaponChoices(weaponChoices, buildTags));
      if (choices.length) choices[choices.length - 1] = weaponChoice;
      else choices.push(weaponChoice);
    }

    if (!choices.length) choices.push(this.createRecoveryChoice());

    this.upgradeChoices = choices;
  },

  upgradePrerequisiteMet(upgrade) {
    if (!upgrade || !upgrade.prerequisite) return true;
    const prereqLevel = this.player.upgradeLevels[upgrade.prerequisite] || 0;
    return prereqLevel >= (upgrade.prerequisiteLevel || 1);
  },

  pickWeightedChoice(weighted) {
    if (!weighted || weighted.length === 0) return null;
    const totalW = weighted.reduce((sum, item) => sum + Math.max(0, item.weight || 0), 0);
    if (totalW <= 0) return weighted[0].upgrade;
    let r = Math.random() * totalW;
    for (const item of weighted) {
      r -= Math.max(0, item.weight || 0);
      if (r <= 0) return item.upgrade;
    }
    return weighted[weighted.length - 1].upgrade;
  },

  getWeaponUpgradeDescription(weapon, currentLevel, nextLevel) {
    const parts = [`${weapon.name} Lv.${currentLevel} → Lv.${nextLevel}`];
    parts.push('伤害 +15%');
    parts.push('范围 +5%');
    if (weapon.type === 'orbit') parts.push('视觉/命中体积 +15%');
    return parts.join(' | ');
  },

  getAvailableWeaponChoices(buildTags) {
    if (!this.player || !Array.isArray(this.player.weapons)) return [];
    const maxLevel = CONFIG.WEAPON_MAX_LEVEL || 6;
    const owned = new Map(this.player.weapons.map(w => [w.id, w]));
    const listedWeaponIds = new Set();
    const choices = [];

    const pushOwnedWeaponUpgrade = (weaponId, ownedWeapon, fallbackRarity) => {
      const weapon = CONFIG.WEAPONS[weaponId];
      if (!weapon || !ownedWeapon || ownedWeapon.level >= maxLevel) return;
      const currentLevel = ownedWeapon.level || 1;
      const nextLevel = currentLevel + 1;
      choices.push({
        weaponId,
        name: '强化武器: ' + weapon.name,
        icon: weapon.hudIcon || weapon.icon,
        rarity: fallbackRarity || 'rare',
        desc: this.getWeaponUpgradeDescription(weapon, currentLevel, nextLevel),
        currentLevel,
        nextLevel,
        maxLevel,
        isWeaponUpgrade: true,
      });
    };

    for (const unlock of CONFIG.WEAPON_UNLOCKS) {
      const weapon = CONFIG.WEAPONS[unlock.weaponId];
      if (!weapon) continue;
      listedWeaponIds.add(unlock.weaponId);
      const ownedWeapon = owned.get(unlock.weaponId);
      if (ownedWeapon) {
        pushOwnedWeaponUpgrade(unlock.weaponId, ownedWeapon, unlock.rarity);
      } else {
        choices.push({
          ...unlock,
          currentLevel: 0,
          nextLevel: 1,
          maxLevel,
          isWeaponUnlock: true,
        });
      }
    }

    for (const ownedWeapon of this.player.weapons) {
      if (listedWeaponIds.has(ownedWeapon.id)) continue;
      pushOwnedWeaponUpgrade(ownedWeapon.id, ownedWeapon, 'rare');
    }

    return choices;
  },

  weightWeaponChoices(weaponChoices, buildTags) {
    const ownedCount = this.player && this.player.weapons ? this.player.weapons.length : 0;
    return weaponChoices.map(choice => {
      const rarityBonus = choice.rarity === 'epic' ? 15 : 0;
      const synergy = this.getChoiceSynergyScore(choice, buildTags || this.getPlayerBuildTags());
      const lowLevelBonus = choice.isWeaponUpgrade ? Math.max(0, 4 - (choice.currentLevel || 1)) * 8 : 0;
      const upgradeBonus = choice.isWeaponUpgrade ? 32 + lowLevelBonus : Math.max(0, 22 - ownedCount * 3);
      return {
        upgrade: choice,
        weight: 25 + rarityBonus + upgradeBonus + synergy * 30,
      };
    });
  },

  getWeaponChoiceChance(weaponChoices, buildTags) {
    if (!weaponChoices || weaponChoices.length === 0) return 0;
    const ownedCount = this.player && this.player.weapons ? this.player.weapons.length : 0;
    const hasUpgrade = weaponChoices.some(choice => choice.isWeaponUpgrade);
    const hasLowLevelUpgrade = weaponChoices.some(choice => choice.isWeaponUpgrade && (choice.currentLevel || 1) <= 2);
    const hasUnlock = weaponChoices.some(choice => choice.isWeaponUnlock);
    let chance = hasUpgrade ? 0.42 : 0.28;
    if (hasLowLevelUpgrade) chance += 0.18;
    if (hasUnlock && ownedCount < 4) chance += 0.14;
    if (buildTags && weaponChoices.some(choice => this.getChoiceSynergyScore(choice, buildTags) > 0)) chance += 0.10;
    return Math.max(0.2, Math.min(0.82, chance));
  },

  ensureBuildChoice(choices, available, buildTags) {
    if (!choices.length || buildTags.size === 0) return;
    const hasSynergy = choices.some(choice => this.getChoiceSynergyScore(choice, buildTags) > 0);
    if (hasSynergy) return;
    const candidates = available
      .filter(u => this.getChoiceSynergyScore(u, buildTags) > 0)
      .filter(u => !choices.some(choice => choice.id === u.id));
    if (!candidates.length) return;
    const replacement = this.pickWeightedChoice(candidates.map(u => ({
      upgrade: u,
      weight: (u.weight || 50) * (1 + this.getChoiceSynergyScore(u, buildTags) * 0.6),
    })));
    if (replacement) choices[choices.length - 1] = replacement;
  },

  getPlayerBuildTags() {
    const tags = new Set();
    if (!this.player || !this.player.weapons) return tags;
    for (const weapon of this.player.weapons) {
      for (const tag of this.getWeaponTags(weapon.id)) tags.add(tag);
    }
    return tags;
  },

  getWeaponTags(weaponId) {
    const def = CONFIG.WEAPONS[weaponId];
    const tags = new Set();
    if (!def) return tags;
    if (def.type) tags.add(def.type);
    if (def.type === 'ranged' || def.type === 'homing') tags.add('projectile');
    if (def.type === 'projectile') tags.add('ranged');
    if (def.blockReduction) tags.add('guard');
    if (def.splash) tags.add('area');
    if ((def.pierce || 0) >= 2) tags.add('pierce');
    if ((def.critChance || 0) >= 0.12) tags.add('crit');
    if (def.homingStrength) tags.add('arcane');
    const key = `${weaponId} ${def.icon || ''} ${def.color || ''}`.toLowerCase();
    if (key.includes('fire') || key.includes('torch') || key.includes('flame') || key.includes('#ff')) tags.add('fire');
    if (key.includes('poison') || key.includes('toxic') || key.includes('#60c040')) tags.add('poison');
    if (key.includes('void') || key.includes('soul') || key.includes('arcane') || key.includes('crystal')) tags.add('arcane');
    if (def.evolved) tags.add('evolved');
    return tags;
  },

  getChoiceBuildTags(choice) {
    if (!choice) return new Set();
    if (choice.weaponId) return this.getWeaponTags(choice.weaponId);
    const tags = new Set(choice.buildTags || []);
    const idTags = {
      damage: ['orbit','ranged','projectile','aura','summon'],
      attackspeed: ['orbit','ranged','projectile','aura','summon'],
      rotatespeed: ['orbit'],
      range: ['orbit','ranged','projectile','aura','homing'],
      projspeed: ['ranged','projectile','homing'],
      pierce: ['ranged','projectile','pierce'],
      weaponcount: ['orbit','summon'],
      cooldown: ['ranged','projectile','aura','summon'],
      crit: ['crit','ranged','projectile','orbit'],
      critdamage: ['crit'],
      armor: ['guard'],
      lifesteal: ['guard','aura'],
      knockback: ['orbit','guard'],
    };
    for (const tag of idTags[choice.id] || []) tags.add(tag);
    return tags;
  },

  getChoiceSynergyScore(choice, buildTags) {
    if (!buildTags || buildTags.size === 0) return 0;
    const choiceTags = this.getChoiceBuildTags(choice);
    let score = 0;
    for (const tag of choiceTags) {
      if (buildTags.has(tag)) score++;
    }
    return score;
  },

  getTagLabel(tag) {
    return (CONFIG.BUILD_TAG_LABELS && CONFIG.BUILD_TAG_LABELS[tag]) || tag;
  },

  getEvolutionHintForChoice(choice) {
    if (!choice || !this.player) return '';
    const ownedWeaponIds = new Set(this.player.weapons.map(w => w.id));
    if (choice.weaponId) {
      const evo = CONFIG.WEAPON_EVOLUTIONS.find(e => e.baseWeapon === choice.weaponId);
      if (!evo) return '';
      const relic = CONFIG.UPGRADES.find(u => u.id === evo.relic);
      return `进化线: ${relic ? relic.name : evo.relic} Lv.${evo.relicMinLevel}`;
    }
    const evo = CONFIG.WEAPON_EVOLUTIONS.find(e =>
      e.relic === choice.id &&
      ownedWeaponIds.has(e.baseWeapon) &&
      !ownedWeaponIds.has(e.resultWeapon)
    );
    if (!evo) return '';
    const baseName = CONFIG.WEAPONS[evo.baseWeapon]?.name || evo.baseWeapon;
    const nextLevel = (this.player.upgradeLevels[choice.id] || 0) + 1;
    return `进化材料: ${baseName} ${nextLevel}/${evo.relicMinLevel}`;
  },

  getChoiceDescription(choice) {
    const base = choice.desc || (choice.weaponId ? (CONFIG.WEAPONS[choice.weaponId] ? CONFIG.WEAPONS[choice.weaponId].desc : '') : '');
    const parts = base ? [base] : [];
    if (choice && !choice.weaponId && choice.id && choice.maxLevel && this.player) {
      const currentLevel = this.player.upgradeLevels[choice.id] || 0;
      parts.push(`当前 Lv.${currentLevel}/${choice.maxLevel}`);
      if (currentLevel < choice.maxLevel) parts.push(`下一级 Lv.${currentLevel + 1}`);
    }
    const buildTags = this.getPlayerBuildTags();
    const synergy = this.getChoiceSynergyScore(choice, buildTags);
    if (synergy > 0) {
      const labels = [...this.getChoiceBuildTags(choice)]
        .filter(tag => buildTags.has(tag))
        .slice(0, 3)
        .map(tag => this.getTagLabel(tag));
      if (labels.length) parts.push(`适配: ${labels.join('/')}`);
    }
    const evoHint = this.getEvolutionHintForChoice(choice);
    if (evoHint) parts.push(evoHint);
    return parts.join('  |  ');
  },

  drawChoiceBadges(ctx, choice, cardX, cardY, cardW) {
    const buildTags = this.getPlayerBuildTags();
    const labels = [];
    if (this.getChoiceSynergyScore(choice, buildTags) > 0) labels.push({ text: '适配', color: '#40d080' });
    if (this.getEvolutionHintForChoice(choice)) labels.push({ text: '进化线', color: '#e080ff' });
    const tagLabels = [...this.getChoiceBuildTags(choice)]
      .filter(tag => !['ranged'].includes(tag))
      .slice(0, 2)
      .map(tag => this.getTagLabel(tag));
    if (tagLabels.length) labels.push({ text: tagLabels.join('/'), color: '#80c0ff' });

    // Keep the card header readable:
    // row 1 is reserved for rarity (center) and level/evolution (right).
    // Build badges live on row 2 with strict width limits, so labels never
    // collide with "稀有"/"普通" or "Lv.x/y".
    let x = cardX + 10;
    let y = cardY + 26;
    const maxRight = cardX + cardW - 10;
    const maxBadgeW = Math.min(92, cardW * 0.42);
    const rowH = 15;
    const maxRows = cardW < 180 ? 1 : 2;
    let row = 0;

    ctx.font = 'bold 10px Courier New';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    for (const label of labels.slice(0, 3)) {
      const text = this.fitChoiceBadgeText(ctx, label.text, maxBadgeW - 10);
      const w = Math.min(maxBadgeW, ctx.measureText(text).width + 10);
      if (x + w > maxRight) {
        row++;
        if (row >= maxRows) break;
        x = cardX + 10;
        y += rowH + 3;
      }
      ctx.fillStyle = label.color + '33';
      ctx.fillRect(x, y - 11, w, 14);
      ctx.strokeStyle = label.color;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y - 11, w, 14);
      ctx.fillStyle = label.color;
      ctx.fillText(text, x + 5, y);
      x += w + 7;
    }
  },

  fitChoiceBadgeText(ctx, text, maxW) {
    if (ctx.measureText(text).width <= maxW) return text;
    let out = text;
    while (out.length > 1 && ctx.measureText(out + '…').width > maxW) {
      out = out.slice(0, -1);
    }
    return out + '…';
  },

  drawCroppedAsset(ctx, iconKey, cx, cy, maxW, maxH, options = {}) {
    const img = Assets.get(iconKey);
    if (!img || !img.complete || img.width <= 0 || img.height <= 0) return false;

    const crop = iconKey && iconKey.startsWith('weapons/')
      ? this.getChoiceIconCrop(iconKey, img)
      : null;
    const srcW = crop ? crop.w : img.width;
    const srcH = crop ? crop.h : img.height;
    const maxScale = Number.isFinite(options.maxScale) ? options.maxScale : Infinity;
    const scale = Math.min(maxScale, maxW / srcW, maxH / srcH);
    if (!Number.isFinite(scale) || scale <= 0) return false;
    const drawW = srcW * scale;
    const drawH = srcH * scale;

    ctx.save();
    ctx.translate(cx, cy);
    if (options.rotation) ctx.rotate(options.rotation);
    if (typeof options.alpha === 'number') {
      ctx.globalAlpha = Math.max(0, Math.min(1, ctx.globalAlpha * options.alpha));
    }
    ctx.imageSmoothingEnabled = options.imageSmoothingEnabled === true;
    if (crop) {
      ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, -drawW/2, -drawH/2, drawW, drawH);
    } else {
      ctx.drawImage(img, -drawW/2, -drawH/2, drawW, drawH);
    }
    ctx.restore();
    return true;
  },

  drawChoiceIcon(ctx, iconKey, cx, cy, maxW, maxH) {
    this.drawCroppedAsset(ctx, iconKey, cx, cy, maxW, maxH, {
      maxScale: 3.0,
      imageSmoothingEnabled: false,
    });
  },

  getChoiceIconCrop(iconKey, img) {
    if (Object.prototype.hasOwnProperty.call(this._choiceIconCropCache, iconKey)) {
      return this._choiceIconCropCache[iconKey];
    }
    const crop = this.findDominantOpaqueCrop(img);
    this._choiceIconCropCache[iconKey] = crop;
    return crop;
  },

  findDominantOpaqueCrop(img) {
    const w = img.width || 0;
    const h = img.height || 0;
    if (w <= 0 || h <= 0 || w * h > 20000) return null;

    let canvas;
    try {
      canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const cctx = canvas.getContext('2d');
      cctx.drawImage(img, 0, 0);
      const alpha = cctx.getImageData(0, 0, w, h).data;
      const seen = new Uint8Array(w * h);
      let best = null;

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const start = y * w + x;
          if (seen[start] || alpha[start * 4 + 3] < 24) continue;

          const queue = [start];
          seen[start] = 1;
          let count = 0;
          let minX = x, maxX = x, minY = y, maxY = y;

          while (queue.length) {
            const idx = queue.pop();
            const px = idx % w;
            const py = Math.floor(idx / w);
            count++;
            if (px < minX) minX = px;
            if (px > maxX) maxX = px;
            if (py < minY) minY = py;
            if (py > maxY) maxY = py;

            for (let oy = -1; oy <= 1; oy++) {
              for (let ox = -1; ox <= 1; ox++) {
                if (ox === 0 && oy === 0) continue;
                const nx = px + ox;
                const ny = py + oy;
                if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                const nidx = ny * w + nx;
                if (seen[nidx] || alpha[nidx * 4 + 3] < 24) continue;
                seen[nidx] = 1;
                queue.push(nidx);
              }
            }
          }

          if (count < 12) continue;
          const bw = maxX - minX + 1;
          const bh = maxY - minY + 1;
          const centerX = (minX + maxX) / 2;
          const centerY = (minY + maxY) / 2;
          const centerPenalty = Math.hypot(centerX - w / 2, centerY - h / 2) / Math.hypot(w / 2, h / 2);
          const score = count * (1.15 - Math.min(0.45, centerPenalty * 0.35)) + Math.min(bw * bh, count * 1.8) * 0.08;
          if (!best || score > best.score) {
            best = { x: minX, y: minY, w: bw, h: bh, count, score };
          }
        }
      }

      if (!best) return null;
      const visibleRatio = (best.w * best.h) / (w * h);
      const hasMeaningfulCrop = visibleRatio < 0.78 || best.x > 3 || best.y > 3 || best.x + best.w < w - 3 || best.y + best.h < h - 3;
      if (!hasMeaningfulCrop) return null;

      const pad = 2;
      const x0 = Math.max(0, best.x - pad);
      const y0 = Math.max(0, best.y - pad);
      const x1 = Math.min(w, best.x + best.w + pad);
      const y1 = Math.min(h, best.y + best.h + pad);
      return {
        x: x0,
        y: y0,
        w: Math.max(1, x1 - x0),
        h: Math.max(1, y1 - y0),
      };
    } catch (err) {
      return null;
    }
  },

  selectUpgrade(idx) {
    const choice = this.upgradeChoices[idx];
    if (!choice) return;
    if (choice.weaponId) {
      const before = this.player.weapons.find(w => w.id === choice.weaponId);
      this.player.addWeapon(choice.weaponId);
      const after = this.player.weapons.find(w => w.id === choice.weaponId);
      const prefix = before ? '强化武器: ' : '获得武器: ';
      const levelText = after ? ` Lv.${after.level}` : '';
      this.addMessage(prefix + CONFIG.WEAPONS[choice.weaponId].name + levelText, '#40c0ff');
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
    this.finishLevelUpSelection();
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
    const buildTags = this.getPlayerBuildTags();
    const weaponChoices = this.getAvailableWeaponChoices(buildTags);
    const rewards = [];

    // ---- Weapon evolution check: if player has base weapon + relic at required level ----
    const evolutions = this.checkEvolutions();
    for (const evo of evolutions) {
      rewards.push({
        type: 'evolution',
        evolutionId: evo.id,
        baseWeapon: evo.baseWeapon,
        resultWeapon: evo.resultWeapon,
        name: evo.name,
        desc: evo.desc,
        icon: evo.icon,
        rarity: evo.rarity,
      });
    }

    if (weaponChoices.length > 0) {
      rewards.push(this.pickWeightedChoice(this.weightWeaponChoices(weaponChoices, buildTags)));
    }
    // add stat upgrades (respect maxLevel)
    const availableUpgrades = CONFIG.UPGRADES.filter(u => {
      const currentLevel = this.player.upgradeLevels[u.id] || 0;
      return currentLevel < u.maxLevel && this.upgradePrerequisiteMet(u);
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

  // Check for available weapon evolutions based on owned weapons and upgrade levels
  checkEvolutions() {
    const ownedWeaponIds = new Set(this.player.weapons.map(w => w.id));
    const result = [];
    for (const evo of CONFIG.WEAPON_EVOLUTIONS) {
      // player must own the base weapon (and not already have the evolved version)
      if (!ownedWeaponIds.has(evo.baseWeapon)) continue;
      if (ownedWeaponIds.has(evo.resultWeapon)) continue;
      // relic upgrade must be at sufficient level
      const relicLevel = this.player.upgradeLevels[evo.relic] || 0;
      if (relicLevel >= evo.relicMinLevel) {
        result.push(evo);
      }
    }
    return result;
  },

  triggerMimicReward() {
    this.state = 'chestReward';
    this.generateChestReward();
    this.addMessage('宝箱怪掉落了稀有奖励!', '#ffd040');
  },

  selectChestReward(idx) {
    const choice = this.chestRewardChoices[idx];
    if (!choice) return;
    if (choice.type === 'evolution') {
      // weapon evolution: remove base weapon, add evolved weapon
      const baseIdx = this.player.weapons.findIndex(w => w.id === choice.baseWeapon);
      if (baseIdx >= 0) {
        const baseWeapon = this.player.weapons[baseIdx];
        const evolvedLevel = baseWeapon.level; // preserve weapon level
        this.player.weapons.splice(baseIdx, 1);
        this.player.addWeapon(choice.resultWeapon);
        // restore level (addWeapon sets level=1 for new weapons)
        const newWeapon = this.player.weapons[this.player.weapons.length - 1];
        newWeapon.level = evolvedLevel;
      }
      this.addMessage('武器进化! ' + choice.name, '#e080ff');
      Audio2.boss(); // dramatic sound for evolution
      Game.shakeScreen(8, 0.3);
      // evolution particles
      for (let i = 0; i < 20; i++) {
        const a = Math.random() * TAU;
        const spd = rand(60, 160);
        Game.particles.push(Game.particlePool.obtain(
          this.player.x, this.player.y,
          Math.cos(a) * spd, Math.sin(a) * spd,
          '#e080ff', rand(0.4, 0.8), rand(3, 5)
        ));
      }
    } else if (choice.weaponId) {
      const before = this.player.weapons.find(w => w.id === choice.weaponId);
      this.player.addWeapon(choice.weaponId);
      const after = this.player.weapons.find(w => w.id === choice.weaponId);
      const prefix = before ? '强化武器: ' : '获得新武器: ';
      const levelText = after ? ` Lv.${after.level}` : '';
      this.addMessage(prefix + CONFIG.WEAPONS[choice.weaponId].name + levelText, '#ffd040');
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
    if (this.bossDefeated) return; // already handled
    this.bossDefeated = true;
    Audio2.victory();
    // record level completion in meta
    if (this.levelData && this.levelData.theme) {
      this.meta.levelsCompleted[this.levelData.theme] = true;
      this.saveMeta();
    }
    // Enter grace period so player can collect boss drops
    this.bossDefeatedGraceTimer = 8; // 8 seconds to collect drops
    this.addMessage('Boss已击败！8秒后可拾取掉落物', '#ffd040');
  },

  // Continue to victory story after grace period expires
  startVictorySequence() {
    setTimeout(() => {
      this.startStory(CONFIG.STORY[this.levelData.theme].victory, () => {
        if (this.levelData.theme === 'village') {
          this.loadLevel('mine');
        } else if (this.levelData.theme === 'mine') {
          this.loadLevel('hell');
        } else {
          // Final victory after hell
          this.state = 'victory';
          Audio2.playMusic('victory');
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
      Audio2.playMusic('menu');
      Audio2.click();
    }
    if (Input.consumeClick(CONFIG.CANVAS_W/2 - 100, 340, 200, 45)) {
      this.state = 'menu';
      Audio2.playMusic('menu');
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
      Audio2.playMusic('menu');
      Audio2.click();
    }
  },

  // ---- Victory ----
  updateVictory() {
    if (Input.consumeClick(CONFIG.CANVAS_W/2 - 100, 380, 200, 45)) {
      this.state = 'menu';
      Audio2.playMusic('menu');
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
    this.minions = [];
    this.pendingLevelUps = 0;
    this.levelTime = 0;
    this.spawnTimer = 1;
    this.eliteTimer = 0;
    this.bossSpawned = false;
    this.bossDefeated = false;
    this.bossDefeatedGraceTimer = 0;
    this.currentPhase = -1;
    this.triggeredPhases = {};
    this.pendingMimicStory = false;
    this.damageVignette = 0;
    this.eliteKills = 0;
    this.bossKills = 0;
    this.chestsOpened = 0;
    this.camera.x = this.player.x - CONFIG.CANVAS_W/2;
    this.camera.y = this.player.y - CONFIG.CANVAS_H/2;

    this.loadLevel('village');
  },

  // ---- Load level ----
  loadLevel(levelId) {
    this.levelData = CONFIG.LEVELS[levelId];
    // reset level state
    this.levelTime = 0;
    this.spawnTimer = 1;
    this.eliteTimer = 0;
    this.bossSpawned = false;
    this.bossDefeated = false;
    this.bossDefeatedGraceTimer = 0;
    this.currentPhase = -1;
    this.triggeredPhases = {};
    this.pendingMimicStory = false;
    this.enemies = [];
    this.projectiles = [];
    this.enemyProjectiles = [];
    this.pickups = [];
    this.particles = [];
    this.damageNumbers = [];
    this.messages = [];
    this.minions = [];
    // place player at map center
    this.player.x = this.levelData.mapW * CONFIG.TILE_SIZE / 2;
    this.player.y = this.levelData.mapH * CONFIG.TILE_SIZE / 2;
    this.camera.x = this.player.x - CONFIG.CANVAS_W/2;
    this.camera.y = this.player.y - CONFIG.CANVAS_H/2;
    // full heal on level transition
    this.player.hp = this.player.getMaxHp();

    this.generateMap();
    // spawn initial chests
    this.spawnInitialChests();

    // start gameplay BGM (resumes from menu/victory)
    Audio2.playMusic('gameplay');
    // start story
    const storyLines = CONFIG.STORY[this.levelData.theme].intro;
    this.startStory(storyLines, () => { this.state = 'playing'; });
  },

  spawnInitialChests() {
    for (let i = 0; i < this.levelData.chestCount; i++) {
      const x = rand(200, this.levelData.mapW * CONFIG.TILE_SIZE - 200);
      const y = rand(200, this.levelData.mapH * CONFIG.TILE_SIZE - 200);
      this.pickups.push(this.pickupPool.obtain(x, y, 'chest', 'chest', 0));
    }
  },

  inferTriggeredPhases(levelTime, bossAlreadyHandled) {
    const triggered = {};
    const phases = this.levelData && this.levelData.phases ? this.levelData.phases : [];
    for (let i = 0; i < phases.length; i++) {
      if (levelTime < phases[i].time) continue;
      const hasBossEvent = (phases[i].events || []).some(ev => ev.type === 'boss');
      if (hasBossEvent && !bossAlreadyHandled) continue;
      triggered[i] = true;
    }
    return triggered;
  },

  getDefaultPropScatterCounts() {
    return {
      trees: 25, tombstones: 15, fences: 12, barrels: 8, braziers: 10,
      ruins: 10, houses: 3,
      // Mine-specific
      caves: 4, campfires: 8, spikes: 10, rocks: 15, platforms: 6,
      watchtowers: 2, furniture: 8, stonework: 10,
      // Shared decorative props
      bones: 6, gallows: 2,
    };
  },

  getLevelVisualProfile(theme) {
    const fallbackTheme = theme || (this.levelData && this.levelData.theme) || 'village';
    return (CONFIG.LEVEL_VISUALS && CONFIG.LEVEL_VISUALS[fallbackTheme]) || {};
  },

  getThemePropScatterCount(categoryKey, visualProfile) {
    const visual = visualProfile || this.getLevelVisualProfile();
    if (
      visual.propScatterCounts &&
      Object.prototype.hasOwnProperty.call(visual.propScatterCounts, categoryKey)
    ) {
      return visual.propScatterCounts[categoryKey];
    }
    const defaults = this.getDefaultPropScatterCounts();
    return defaults[categoryKey] || 8;
  },

  generateThemeMapFeatures(theme, visualProfile, rng, mapW, mapH, ts, cx, cy) {
    const visual = visualProfile || this.getLevelVisualProfile(theme);
    const featureConfig = visual.mapFeatures || {};
    const features = [];
    const worldW = mapW * ts;
    const worldH = mapH * ts;

    if (theme === 'mine' && featureConfig.railLines) {
      const cfg = featureConfig.railLines;
      const count = cfg.count || 0;
      for (let i = 0; i < count; i++) {
        const horizontal = i % 2 === 0;
        const t = (i + 1) / (count + 1);
        const jitter = (rng() - 0.5) * ts * 2.5;
        if (horizontal) {
          const y = clamp(worldH * t + jitter, ts * 4, worldH - ts * 4);
          features.push({
            type: 'railLine',
            x1: ts * 2,
            y1: y,
            x2: worldW - ts * 2,
            y2: y,
            horizontal: true,
            width: cfg.width || 42,
            sleeperGap: cfg.sleeperGap || 34,
            railColor: cfg.railColor || 'rgba(118,92,52,0.55)',
            sleeperColor: cfg.sleeperColor || 'rgba(34,23,16,0.70)',
          });
        } else {
          const x = clamp(worldW * t + jitter, ts * 4, worldW - ts * 4);
          features.push({
            type: 'railLine',
            x1: x,
            y1: ts * 2,
            x2: x,
            y2: worldH - ts * 2,
            horizontal: false,
            width: cfg.width || 42,
            sleeperGap: cfg.sleeperGap || 34,
            railColor: cfg.railColor || 'rgba(118,92,52,0.55)',
            sleeperColor: cfg.sleeperColor || 'rgba(34,23,16,0.70)',
          });
        }
      }
    }

    if (theme === 'mine' && featureConfig.crystalVeins) {
      const cfg = featureConfig.crystalVeins;
      const count = cfg.count || 0;
      const minRing = Math.min(worldW, worldH) * 0.24;
      const maxRing = Math.min(worldW, worldH) * 0.42;
      for (let i = 0; i < count; i++) {
        const angle = (i / Math.max(1, count)) * TAU + rng() * 0.45;
        const ring = minRing + rng() * (maxRing - minRing);
        let x = clamp(cx + Math.cos(angle) * ring, ts * 4, worldW - ts * 4);
        let y = clamp(cy + Math.sin(angle) * ring, ts * 4, worldH - ts * 4);
        if (dist(x, y, cx, cy) <= 180) {
          x = clamp(cx + Math.cos(angle) * 220, ts * 4, worldW - ts * 4);
          y = clamp(cy + Math.sin(angle) * 220, ts * 4, worldH - ts * 4);
        }
        features.push({
          type: 'crystalVein',
          x,
          y,
          radius: cfg.radius || 84,
          clusterCount: cfg.clusterCount || 4,
          glowColor: cfg.glowColor || 'rgba(70,220,255,0.18)',
          coreColor: cfg.coreColor || 'rgba(170,255,255,0.34)',
          shardColor: cfg.shardColor || 'rgba(92,235,255,0.50)',
          rimColor: cfg.rimColor || 'rgba(210,255,255,0.70)',
          enemyPool: cfg.enemyPool || ['crystal'],
        });
      }
    }

    if (theme === 'hell' && featureConfig.lavaFissures) {
      const cfg = featureConfig.lavaFissures;
      const count = cfg.count || 0;
      for (let i = 0; i < count; i++) {
        const angle = (i % 2 === 0 ? 0.12 : -0.75) + (rng() - 0.5) * 0.45;
        const x = clamp(worldW * (0.18 + rng() * 0.64), ts * 4, worldW - ts * 4);
        const y = clamp(worldH * ((i + 1) / (count + 1)) + (rng() - 0.5) * ts * 3, ts * 4, worldH - ts * 4);
        features.push({
          type: 'lavaFissure',
          x,
          y,
          length: ts * (4.5 + rng() * 3),
          width: cfg.width || 34,
          angle,
          sprite: cfg.sprite,
          glowColor: cfg.glowColor || 'rgba(255,80,20,0.24)',
          coreColor: cfg.coreColor || 'rgba(255,185,45,0.42)',
        });
      }
    }

    if (theme === 'hell' && featureConfig.demonRifts) {
      const cfg = featureConfig.demonRifts;
      const count = cfg.count || 0;
      const minRing = Math.min(worldW, worldH) * 0.26;
      const maxRing = Math.min(worldW, worldH) * 0.44;
      for (let i = 0; i < count; i++) {
        const angle = (i / Math.max(1, count)) * TAU + rng() * 0.55;
        const ring = minRing + rng() * (maxRing - minRing);
        let x = clamp(cx + Math.cos(angle) * ring, ts * 4, worldW - ts * 4);
        let y = clamp(cy + Math.sin(angle) * ring, ts * 4, worldH - ts * 4);
        if (dist(x, y, cx, cy) <= 190) {
          x = clamp(cx + Math.cos(angle) * 245, ts * 4, worldW - ts * 4);
          y = clamp(cy + Math.sin(angle) * 245, ts * 4, worldH - ts * 4);
        }
        features.push({
          type: 'demonRift',
          x,
          y,
          radius: cfg.radius || 96,
          sprite: cfg.sprite,
          glowColor: cfg.glowColor || 'rgba(255,45,25,0.20)',
          coreColor: cfg.coreColor || 'rgba(255,105,20,0.36)',
          enemyPool: cfg.enemyPool || ['imp','hellhound'],
        });
      }
    }

    return features;
  },

  drawMapFeature(ctx, feature) {
    if (!ctx || !feature) return;

    if (feature.type === 'railLine') {
      const oldAlpha = ctx.globalAlpha;
      ctx.globalAlpha = 1;
      ctx.fillStyle = feature.sleeperColor || 'rgba(34,23,16,0.70)';
      if (feature.horizontal) {
        const y = feature.y1;
        const minX = Math.min(feature.x1, feature.x2);
        const maxX = Math.max(feature.x1, feature.x2);
        for (let x = minX; x <= maxX; x += feature.sleeperGap || 34) {
          ctx.fillRect(x - 4, y - feature.width / 2, 8, feature.width);
        }
        ctx.fillStyle = feature.railColor || 'rgba(118,92,52,0.55)';
        ctx.fillRect(minX, y - 10, maxX - minX, 4);
        ctx.fillRect(minX, y + 8, maxX - minX, 4);
      } else {
        const x = feature.x1;
        const minY = Math.min(feature.y1, feature.y2);
        const maxY = Math.max(feature.y1, feature.y2);
        for (let y = minY; y <= maxY; y += feature.sleeperGap || 34) {
          ctx.fillRect(x - feature.width / 2, y - 4, feature.width, 8);
        }
        ctx.fillStyle = feature.railColor || 'rgba(118,92,52,0.55)';
        ctx.fillRect(x - 10, minY, 4, maxY - minY);
        ctx.fillRect(x + 8, minY, 4, maxY - minY);
      }
      ctx.globalAlpha = oldAlpha;
      return;
    }

    if (feature.type === 'crystalVein') {
      const oldAlpha = ctx.globalAlpha;
      ctx.globalAlpha = 1;
      ctx.fillStyle = feature.glowColor || 'rgba(70,220,255,0.18)';
      ctx.beginPath();
      ctx.ellipse(feature.x, feature.y, feature.radius * 1.45, feature.radius * 0.78, -0.4, 0, TAU);
      ctx.fill();

      ctx.fillStyle = feature.coreColor || 'rgba(170,255,255,0.34)';
      ctx.beginPath();
      ctx.ellipse(feature.x, feature.y, feature.radius * 0.72, feature.radius * 0.36, -0.35, 0, TAU);
      ctx.fill();

      const clusterCount = feature.clusterCount || 4;
      for (let i = 0; i < clusterCount; i++) {
        const a = (i / clusterCount) * TAU;
        const px = feature.x + Math.cos(a) * feature.radius * (0.18 + (i % 3) * 0.08);
        const py = feature.y + Math.sin(a) * feature.radius * (0.10 + (i % 2) * 0.08);
        const h = feature.radius * (0.34 + (i % 4) * 0.045);
        const w = feature.radius * (0.09 + (i % 3) * 0.018);

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(a * 0.35 - 0.25);
        ctx.fillStyle = feature.shardColor || 'rgba(92,235,255,0.50)';
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.62);
        ctx.lineTo(w, h * 0.26);
        ctx.lineTo(0, h * 0.48);
        ctx.lineTo(-w, h * 0.26);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = feature.rimColor || 'rgba(210,255,255,0.70)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        ctx.beginPath();
        ctx.ellipse(
          px,
          py + h * 0.32,
          feature.radius * (0.18 + i * 0.025),
          feature.radius * 0.10,
          a,
          0,
          TAU
        );
        ctx.fill();
      }
      ctx.globalAlpha = oldAlpha;
    }

    if (feature.type === 'lavaFissure') {
      const img = feature.sprite && Assets.get(feature.sprite);
      if (img && img.complete) {
        const scale = Math.max(0.6, Math.min(1.6, (feature.length || img.width) / img.width));
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        ctx.save();
        ctx.globalAlpha = 0.95;
        ctx.translate(feature.x, feature.y);
        ctx.rotate(feature.angle || 0);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();
        return;
      }

      const oldAlpha = ctx.globalAlpha;
      const segments = 7;
      const dx = Math.cos(feature.angle || 0);
      const dy = Math.sin(feature.angle || 0);
      ctx.globalAlpha = 1;
      for (let i = 0; i < segments; i++) {
        const t = i / Math.max(1, segments - 1) - 0.5;
        const px = feature.x + dx * feature.length * t;
        const py = feature.y + dy * feature.length * t;
        const taper = 1 - Math.abs(t) * 0.9;
        ctx.fillStyle = feature.glowColor || 'rgba(255,80,20,0.24)';
        ctx.beginPath();
        ctx.ellipse(px, py, feature.width * taper, feature.width * 0.55 * taper, feature.angle || 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = feature.coreColor || 'rgba(255,185,45,0.42)';
        ctx.beginPath();
        ctx.ellipse(px, py, feature.width * 0.42 * taper, feature.width * 0.16 * taper, feature.angle || 0, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = oldAlpha;
      return;
    }

    if (feature.type === 'demonRift') {
      const img = feature.sprite && Assets.get(feature.sprite);
      if (img && img.complete) {
        const targetW = (feature.radius || 96) * 2.1;
        const scale = Math.max(0.7, Math.min(1.8, targetW / img.width));
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        ctx.save();
        ctx.globalAlpha = 0.95;
        ctx.translate(feature.x, feature.y);
        ctx.rotate(0.18);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();
        return;
      }

      const oldAlpha = ctx.globalAlpha;
      ctx.globalAlpha = 1;
      ctx.fillStyle = feature.glowColor || 'rgba(255,45,25,0.20)';
      ctx.beginPath();
      ctx.ellipse(feature.x, feature.y, feature.radius * 1.1, feature.radius * 0.78, 0.35, 0, TAU);
      ctx.fill();
      ctx.fillStyle = feature.coreColor || 'rgba(255,105,20,0.36)';
      ctx.beginPath();
      ctx.ellipse(feature.x, feature.y, feature.radius * 0.46, feature.radius * 0.22, 0.35, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(90,0,0,0.34)';
      ctx.beginPath();
      ctx.ellipse(feature.x, feature.y, feature.radius * 0.26, feature.radius * 0.12, 0.35, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = oldAlpha;
    }
  },

  // ---- Map generation ----
  generateMap() {
    // Use a theme-based seed so each level has a unique random pattern
    let seed = 0;
    const theme = this.levelData.theme || 'default';
    const visual = this.getLevelVisualProfile(theme);
    for (let i = 0; i < theme.length; i++) seed = seed * 31 + theme.charCodeAt(i);
    const rng = makeRNG(seed);
    const mapW = this.levelData.mapW, mapH = this.levelData.mapH, ts = CONFIG.TILE_SIZE;
    this.mapData = { tiles: [], props: [] };

    // generate ground tile texture cache
    this.groundTileCache = document.createElement('canvas');
    this.groundTileCache.width = mapW * ts;
    this.groundTileCache.height = mapH * ts;
    const gctx = this.groundTileCache.getContext('2d');
    gctx.imageSmoothingEnabled = false;

    // fill ground with theme-specific base colour
    const baseColors = { village: '#2a2218', mine: '#1a1520', hell: '#201010' };
    gctx.fillStyle = visual.baseColor || baseColors[theme] || '#2a2218';
    gctx.fillRect(0, 0, mapW * ts, mapH * ts);

    // Blend one level scene background into the combat map so biome art is
    // visible beyond props and ground tiles.
    const sceneUnderlayAlpha = visual.sceneUnderlayAlpha || 0;
    const sceneBgs = this.levelData.sceneBgs || [];
    if (sceneUnderlayAlpha > 0 && sceneBgs.length > 0) {
      const sceneKey = sceneBgs[Math.floor(rng() * sceneBgs.length)];
      const sceneImg = Assets.get(sceneKey);
      if (sceneImg && sceneImg.complete) {
        const canvasW = mapW * ts;
        const canvasH = mapH * ts;
        const iw = sceneImg.naturalWidth || sceneImg.width || canvasW;
        const ih = sceneImg.naturalHeight || sceneImg.height || canvasH;
        const scale = Math.max(canvasW / iw, canvasH / ih);
        const dw = iw * scale;
        const dh = ih * scale;
        gctx.globalAlpha = sceneUnderlayAlpha;
        gctx.drawImage(sceneImg, (canvasW - dw) / 2, (canvasH - dh) / 2, dw, dh);
        gctx.globalAlpha = 1;
      }
    }

    // draw ground tiles with larger organic patches instead of pure random
    const groundTiles = this.levelData.groundTiles;
    const groundAlphaMin = visual.groundAlphaMin ?? 0.6;
    const groundAlphaMax = visual.groundAlphaMax ?? 1.0;
    // Pre-generate a low-res noise map so adjacent tiles tend to be similar
    const patchW = Math.ceil(mapW / 4), patchH = Math.ceil(mapH / 4);
    const patchMap = new Array(patchH);
    for (let py = 0; py < patchH; py++) {
      patchMap[py] = new Array(patchW);
      for (let px = 0; px < patchW; px++) {
        patchMap[py][px] = Math.floor(rng() * groundTiles.length);
      }
    }
    for (let ty = 0; ty < mapH; ty++) {
      for (let tx = 0; tx < mapW; tx++) {
        const px = Math.min(patchW - 1, Math.floor(tx / 4));
        const py = Math.min(patchH - 1, Math.floor(ty / 4));
        // 20% chance to pick a neighbour patch for smooth blending
        let tileIdx = patchMap[py][px];
        if (rng() < 0.2) {
          const npx = clamp(px + (rng() < 0.5 ? -1 : 1), 0, patchW - 1);
          const npy = clamp(py + (rng() < 0.5 ? -1 : 1), 0, patchH - 1);
          tileIdx = patchMap[npy][npx];
        }
        const tileName = groundTiles[tileIdx];
        const img = Assets.get(tileName);
        if (img && img.complete) {
          // draw with slight random offset and alpha for variation
          gctx.globalAlpha = groundAlphaMin + rng() * Math.max(0, groundAlphaMax - groundAlphaMin);
          const ox = (rng() - 0.5) * 6;
          const oy = (rng() - 0.5) * 6;
          gctx.drawImage(img, tx * ts + ox, ty * ts + oy, ts + 4, ts + 4);
        }
      }
    }
    gctx.globalAlpha = 1;

    if (visual.groundTintColor) {
      gctx.fillStyle = visual.groundTintColor;
      gctx.fillRect(0, 0, mapW * ts, mapH * ts);
    }

    // Smooth tile edges: draw soft gradient strips between tiles to hide grid lines
    const edgeGrad = gctx.createLinearGradient(0, 0, ts, 0);
    edgeGrad.addColorStop(0, 'rgba(0,0,0,0.18)');
    edgeGrad.addColorStop(0.5, 'rgba(0,0,0,0)');
    edgeGrad.addColorStop(1, 'rgba(0,0,0,0.18)');
    for (let ty = 0; ty < mapH; ty++) {
      for (let tx = 1; tx < mapW; tx++) {
        gctx.fillStyle = edgeGrad;
        gctx.fillRect(tx * ts - 3, ty * ts, 6, ts);
      }
    }
    const edgeGradV = gctx.createLinearGradient(0, 0, 0, ts);
    edgeGradV.addColorStop(0, 'rgba(0,0,0,0.18)');
    edgeGradV.addColorStop(0.5, 'rgba(0,0,0,0)');
    edgeGradV.addColorStop(1, 'rgba(0,0,0,0.18)');
    for (let tx = 0; tx < mapW; tx++) {
      for (let ty = 1; ty < mapH; ty++) {
        gctx.fillStyle = edgeGradV;
        gctx.fillRect(tx * ts, ty * ts - 3, ts, 6);
      }
    }

    // add some dark patches / paths (theme-tinted)
    const patchColor = visual.patchColor || (theme === 'mine' ? 'rgba(8,5,12,0.35)' : 'rgba(15,10,5,0.3)');
    const patchCount = visual.patchCount ?? 30;
    gctx.fillStyle = patchColor;
    for (let i = 0; i < patchCount; i++) {
      const x = rng() * mapW * ts;
      const y = rng() * mapH * ts;
      gctx.beginPath();
      gctx.ellipse(x, y, 40 + rng() * 60, 30 + rng() * 40, rng() * TAU, 0, TAU);
      gctx.fill();
    }

    // map center (player spawn) — must be defined before wall/decoration code uses it
    const cx = mapW * ts / 2, cy = mapH * ts / 2;
    const mapFeatures = this.generateThemeMapFeatures(theme, visual, rng, mapW, mapH, ts, cx, cy);
    this.mapData.features = mapFeatures;
    for (const feature of mapFeatures) {
      this.drawMapFeature(gctx, feature);
    }
    const wallCollisionProps = [];
    const addWallCollision = (x, y) => {
      wallCollisionProps.push({ type: 'wall', x, y, category: 'wall', radius: ts * 0.45 });
    };

    // draw wall tiles around map border and as interior wall segments (mine/cave themes)
    const wallTiles = this.levelData.wallTiles;
    if (wallTiles && wallTiles.length > 0) {
      const borderThick = visual.wallBorderThick ?? 2; // tiles thick border
      // top and bottom borders
      for (let by = 0; by < borderThick; by++) {
        for (let tx = 0; tx < mapW; tx++) {
          const wt = wallTiles[Math.floor(rng() * wallTiles.length)];
          const img = Assets.get(wt);
          addWallCollision(tx * ts + ts / 2, by * ts + ts / 2);
          addWallCollision(tx * ts + ts / 2, (mapH - 1 - by) * ts + ts / 2);
          if (img && img.complete) {
            gctx.globalAlpha = 0.7 + rng() * 0.3;
            gctx.drawImage(img, tx * ts - 4, by * ts - 6, ts + 8, ts + 8);
            gctx.drawImage(img, tx * ts - 4, (mapH - 1 - by) * ts - 6, ts + 8, ts + 8);
          }
        }
      }
      // left and right borders
      for (let bx = 0; bx < borderThick; bx++) {
        for (let ty = borderThick; ty < mapH - borderThick; ty++) {
          const wt = wallTiles[Math.floor(rng() * wallTiles.length)];
          const img = Assets.get(wt);
          addWallCollision(bx * ts + ts / 2, ty * ts + ts / 2);
          addWallCollision((mapW - 1 - bx) * ts + ts / 2, ty * ts + ts / 2);
          if (img && img.complete) {
            gctx.globalAlpha = 0.7 + rng() * 0.3;
            gctx.drawImage(img, bx * ts - 6, ty * ts - 4, ts + 8, ts + 8);
            gctx.drawImage(img, (mapW - 1 - bx) * ts - 6, ty * ts - 4, ts + 8, ts + 8);
          }
        }
      }
      // scatter interior wall segments as broken cave walls
      const wallSegments = visual.interiorWallSegments ?? 8;
      for (let i = 0; i < wallSegments; i++) {
        const segLen = 2 + Math.floor(rng() * 4);
        const horiz = rng() > 0.5;
        const startX = 4 + Math.floor(rng() * (mapW - 8));
        const startY = 4 + Math.floor(rng() * (mapH - 8));
        for (let j = 0; j < segLen; j++) {
          const wt = wallTiles[Math.floor(rng() * wallTiles.length)];
          const img = Assets.get(wt);
          const wx = horiz ? (startX + j) * ts : startX * ts;
          const wy = horiz ? startY * ts : (startY + j) * ts;
          const wallX = wx + ts / 2;
          const wallY = wy + ts / 2;
          // skip if too close to player spawn
          if (dist(wallX, wallY, cx, cy) < 100) continue;
          addWallCollision(wallX, wallY);
          if (img && img.complete) {
            gctx.globalAlpha = 0.5 + rng() * 0.4;
            gctx.drawImage(img, wx - 4, wy - 4, ts + 8, ts + 8);
          }
        }
      }
      gctx.globalAlpha = 1;
    }

    // draw ground decoration overlays (e.g. ground cracks for mine level)
    const groundDecorations = this.levelData.groundDecorations;
    if (groundDecorations && groundDecorations.length > 0) {
      const decoCount = visual.decorationCount ?? 20;
      for (let i = 0; i < decoCount; i++) {
        const dx = rng() * mapW * ts;
        const dy = rng() * mapH * ts;
        const dt = groundDecorations[Math.floor(rng() * groundDecorations.length)];
        const img = Assets.get(dt);
        if (img && img.complete) {
          gctx.globalAlpha = 0.3 + rng() * 0.3;
          const scale = 0.6 + rng() * 0.8;
          gctx.drawImage(img, dx - img.width * scale / 2, dy - img.height * scale / 2,
                         img.width * scale, img.height * scale);
        }
      }
      gctx.globalAlpha = 1;
    }

    // generate props — dynamically scatter all categories defined in level config
    const props = this.levelData.props;
    const propList = [];
    // helper: scatter a prop category, avoid spawning on top of player spawn
    const scatter = (count, categoryKey, categoryArr) => {
      for (let i = 0; i < count; i++) {
        const type = pick(categoryArr);
        const footprint = this.getPropCollisionFootprint(categoryKey, type);
        let px, py, tries = 0;
        do {
          px = rng() * mapW * ts;
          py = rng() * mapH * ts;
          tries++;
        } while (
          tries < 12 &&
          (dist(px, py, cx, cy) < 120 || this.footprintOverlapsCircle(px, py, footprint, cx, cy, 90))
        );
        const prop = { type, x: px, y: py, category: categoryKey, ...footprint };
        prop.collisionX = px + (footprint.collisionOffsetX || 0);
        prop.collisionY = py + (footprint.collisionOffsetY || 0);
        propList.push(prop);
      }
    };

    // Scatter all categories defined in the level's props config
    for (const [categoryKey, categoryArr] of Object.entries(props)) {
      const count = this.getThemePropScatterCount(categoryKey, visual);
      if (count <= 0) continue;
      scatter(count, categoryKey, categoryArr);
    }

    this.mapData.props = propList;
    // build collision list (only solid props)
    this.collisionProps = propList.filter(p => p.radius > 0).concat(wallCollisionProps);
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
    // v3 → v4: hell level support
    if (ver < 4) {
      // ensure level state fields for third boss
      data.bossDefeatedGraceTimer = data.bossDefeatedGraceTimer ?? 0;
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
      bossDefeatedGraceTimer: this.bossDefeatedGraceTimer,
      currentPhase: this.currentPhase,
      triggeredPhases: this.triggeredPhases,
      eliteKills: this.eliteKills,
      bossKills: this.bossKills,
      chestsOpened: this.chestsOpened,
      pickups: this.pickups
        .filter(p => p.alive)
        .map(p => ({
          x: p.x, y: p.y, type: p.type, sprite: p.sprite, value: p.value,
          life: p.life, magnetized: p.magnetized,
        })),
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
      const levelId = CONFIG.LEVELS[data.levelId] ? data.levelId : 'village';
      this.levelData = CONFIG.LEVELS[levelId];
      this.player = new Player(this.levelData.mapW * CONFIG.TILE_SIZE / 2, this.levelData.mapH * CONFIG.TILE_SIZE / 2);
      this.enemies = [];
      this.projectiles = [];
      this.enemyProjectiles = [];
      this.pickups = [];
      this.particles = [];
      this.damageNumbers = [];
      this.messages = [];
      this.minions = [];
      this.pendingLevelUps = 0;
      this.damageVignette = 0;
      this.player.level = data.level ?? 1;
      this.player.xp = data.xp ?? 0;
      this.player.xpToNext = CONFIG.XP_CURVE[Math.min(this.player.level - 1, CONFIG.XP_CURVE.length - 1)] || 9999;
      // Merge so old saves gain every later-added stat with a safe default.
      this.player.stats = Object.assign({}, this.player.stats, data.stats || {});
      this.player.hp = data.hp ?? this.player.getMaxHp();
      this.player.kills = data.kills ?? 0;
      this.player.upgradeLevels = data.upgradeLevels || {};
      if (data.playerPosition) {
        this.player.x = clamp(data.playerPosition.x ?? this.player.x, 30, this.levelData.mapW * CONFIG.TILE_SIZE - 30);
        this.player.y = clamp(data.playerPosition.y ?? this.player.y, 30, this.levelData.mapH * CONFIG.TILE_SIZE - 30);
      }
      this.levelTime = data.levelTime ?? 0;
      this.spawnTimer = data.spawnTimer ?? 1;
      this.eliteTimer = data.eliteTimer ?? 0;
      this.bossDefeated = !!data.bossDefeated;
      this.bossDefeatedGraceTimer = data.bossDefeatedGraceTimer ?? 0;
      this.currentPhase = data.currentPhase ?? -1;
      this.triggeredPhases = data.triggeredPhases || this.inferTriggeredPhases(this.levelTime, !!data.bossSpawned || !!data.bossDefeated);
      this.eliteKills = data.eliteKills ?? 0;
      this.bossKills = data.bossKills ?? 0;
      this.chestsOpened = data.chestsOpened ?? 0;
      // load weapons
      this.player.weapons = [];
      if (data.weapons) {
        for (const w of data.weapons) {
          this.player.addWeapon(w.id);
          const wobj = this.player.weapons.find(x => x.id === w.id);
          if (wobj) wobj.level = w.level;
        }
      }
      if (this.player.weapons.length === 0) this.player.addWeapon('sword');
      this.generateMap();
      if (Array.isArray(data.pickups)) {
        for (const p of data.pickups) {
          const pickup = this.pickupPool.obtain(p.x, p.y, p.type, p.sprite, p.value);
          pickup.life = p.life ?? pickup.life;
          pickup.magnetized = !!p.magnetized;
          pickup.vx = 0;
          pickup.vy = 0;
          this.pickups.push(pickup);
        }
      } else {
        this.spawnInitialChests();
      }
      if (data.bossSpawned && !data.bossDefeated) {
        const bossId = this.levelData.bossId || 'boss';
        const mapW = this.levelData.mapW * CONFIG.TILE_SIZE;
        const mapH = this.levelData.mapH * CONFIG.TILE_SIZE;
        const bossX = clamp(this.player.x + 200, 50, mapW - 50);
        const bossY = clamp(this.player.y, 50, mapH - 50);
        this.enemies.push(new Enemy(bossId, bossX, bossY));
        this.bossSpawned = true;
        Audio2.playMusic('boss');
      } else {
        this.bossSpawned = !!data.bossDefeated;
        Audio2.playMusic('gameplay');
      }
      this.camera.x = clamp(this.player.x - CONFIG.CANVAS_W / 2, 0, Math.max(0, this.levelData.mapW * CONFIG.TILE_SIZE - CONFIG.CANVAS_W));
      this.camera.y = clamp(this.player.y - CONFIG.CANVAS_H / 2, 0, Math.max(0, this.levelData.mapH * CONFIG.TILE_SIZE - CONFIG.CANVAS_H));
      this.state = 'playing';
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
    this.damageNumbers.push(this.damageNumberPool.obtain(x, y, value, color, isCrit));
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

  getWeaponHudLayout(count) {
    const visible = this.getVisibleCanvasRect();
    const portrait = this.isPortrait();
    const leftSafe = portrait ? 12 : 180;
    const rightSafe = portrait ? 12 : 180;
    const maxWidth = Math.max(120, visible.w - leftSafe - rightSafe);
    const iconSize = count > 16 ? 24 : (count > 10 ? 28 : 36);
    const gap = iconSize + (iconSize <= 28 ? 8 : 6);
    const maxColumns = portrait ? 6 : 12;
    const columns = Math.max(1, Math.min(Math.max(1, count), maxColumns, Math.floor((maxWidth + gap - iconSize) / gap)));
    const rows = Math.max(1, Math.ceil(Math.max(1, count) / columns));
    const rowGap = iconSize + 14;
    const itemHeight = rows * rowGap;
    const totalW = Math.max(0, columns - 1) * gap + iconSize;
    const rawX = visible.x + (visible.w - totalW) / 2;
    const x = clamp(rawX, visible.x + leftSafe, Math.max(visible.x + leftSafe, visible.x + visible.w - totalW - rightSafe));
    const rawY = portrait ? visible.y + visible.h - 165 : visible.y + visible.h - itemHeight - 12;
    const y = clamp(rawY, visible.y + 8, Math.max(visible.y + 8, visible.y + visible.h - itemHeight - 8));
    return { x, y, gap, iconSize, itemHeight, totalW, columns, rows, rowGap };
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

    // draw pickups
    for (const p of this.pickups) p.draw(ctx);

    if (this.mapData) {
      for (const prop of this.mapData.props) {
        if (prop.x < viewL || prop.x > viewR || prop.y < viewT || prop.y > viewB) continue;
        Assets.drawCentered(ctx, prop.type, prop.x, prop.y, 0.8, 0, 1);
      }
    }

    // Draw player weapon effects before the hero body so bright/tall weapon
    // sprites do not cover the character in dense late-game builds.
    if (this.player) this.player.drawWeapons(ctx, 'underHero');

    const actorDrawables = [];
    for (const e of this.enemies) {
      if (this.isOnScreen(e.x, e.y, 80)) actorDrawables.push({ y: e.y, draw: () => e.draw(ctx) });
    }

    if (this.player) actorDrawables.push({ y: this.player.y, draw: () => this.player.draw(ctx) });

    actorDrawables.sort((a, b) => a.y - b.y);
    for (const item of actorDrawables) item.draw();

    // draw projectiles
    for (const p of this.projectiles) { if (this.isOnScreen(p.x, p.y, 50)) p.draw(ctx); }
    for (const p of this.enemyProjectiles) { if (this.isOnScreen(p.x, p.y, 50)) p.draw(ctx); }

    // draw particles
    for (const p of this.particles) { if (this.isOnScreen(p.x, p.y, 50)) p.draw(ctx); }

    // Summons are gameplay-critical companions. Draw them after the player
    // weapon layer and particle clutter so orbit/projectile effects do not
    // hide the small imp companions.
    for (const m of this.minions) {
      if (this.isOnScreen(m.x, m.y, 80)) m.draw(ctx);
    }

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
    const weaponHud = this.getWeaponHudLayout(p.weapons.length);
    const weaponStartX = weaponHud.x;
    const weaponGap = weaponHud.gap;
    const iconSize = weaponHud.iconSize;
    const rowGap = weaponHud.rowGap;
    const columns = weaponHud.columns || Math.max(1, p.weapons.length);
    for (let i = 0; i < p.weapons.length; i++) {
      const w = p.weapons[i];
      const col = i % columns;
      const row = Math.floor(i / columns);
      const wx = weaponStartX + col * weaponGap;
      const wY = weaponHud.y + row * rowGap;
      // bg
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(wx - 2, wY - 2, iconSize, iconSize);
      this.drawChoiceIcon(ctx, w.def.hudIcon || w.def.icon, wx + iconSize / 2 - 2, wY + iconSize / 2 - 2, iconSize - 6, iconSize - 6);
      // level
      ctx.fillStyle = '#ffd040';
      ctx.font = iconSize <= 28 ? '9px Courier New' : '10px Courier New';
      ctx.fillText(`Lv${w.level}`, wx - 1, wY + iconSize + 10);
    }

    // dash cooldown indicator
    if (p.dashCooldown > 0) {
      ctx.fillStyle = 'rgba(120,180,255,0.3)';
      ctx.fillRect(weaponStartX, weaponHud.y - 20, 100, 6);
      ctx.fillStyle = '#78b4ff';
      ctx.fillRect(weaponStartX, weaponHud.y - 20, 100 * (1 - p.dashCooldown / CONFIG.PLAYER.dashCooldown), 6);
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

    // draw scene backdrop — use death_knight_rider if village completed, otherwise village_forest
    const villageDone = this.meta && this.meta.levelsCompleted && this.meta.levelsCompleted.village;
    const bgKey = villageDone ? 'backgrounds/scene_death_knight_rider' : 'backgrounds/scene_village_forest';
    const bg = Assets.get(bgKey);
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
      this.drawChoiceBadges(ctx, choice, cardX, cardY, cardW);

      // Evolution badge (top right) for evolution choices
      if (choice.type === 'evolution') {
        ctx.fillStyle = '#e080ff';
        ctx.font = 'bold 10px Courier New';
        ctx.textAlign = 'right';
        ctx.fillText('★进化', cardX + cardW - 8, cardY + 16);
      }

      // Level indicator (top right) for weapon/stat upgrades
      if (choice.weaponId && choice.isWeaponUpgrade) {
        ctx.fillStyle = choice.nextLevel >= choice.maxLevel ? '#ffd040' : '#8a7a5a';
        ctx.font = '10px Courier New';
        ctx.textAlign = 'right';
        ctx.fillText(`Lv.${choice.currentLevel}/${choice.maxLevel}`, cardX + cardW - 8, cardY + 16);
      } else if (!choice.weaponId && !choice.type && choice.maxLevel) {
        const curLevel = this.player.upgradeLevels[choice.id] || 0;
        ctx.fillStyle = curLevel >= choice.maxLevel ? '#ff6040' : '#8a7a5a';
        ctx.font = '10px Courier New';
        ctx.textAlign = 'right';
        ctx.fillText(`Lv.${curLevel}/${choice.maxLevel}`, cardX + cardW - 8, cardY + 16);
      }

      // Desc with fallback for weapon unlocks (fixes crash)
      const descText = this.getChoiceDescription(choice);

      if (portrait) {
        // Horizontal card layout: icon on left, text on right
        // Auto-fit icon scale to fit within available space (max 48px wide, cardH - 10px tall)
        const iconMaxW = 48, iconMaxH = cardH - 10;
        this.drawChoiceIcon(ctx, choice.icon, cardX + 30, cardY + cardH/2, iconMaxW, iconMaxH);

        ctx.fillStyle = '#ffd040';
        ctx.font = 'bold 14px Courier New';
        ctx.textAlign = 'left';
        this.drawTextWrapped(ctx, choice.name, cardX + 65, cardY + 42, cardW - 75, 17);

        ctx.fillStyle = '#c4a87a';
        ctx.font = '12px Courier New';
        if (descText) this.drawTextWrapped(ctx, descText, cardX + 65, cardY + 68, cardW - 75, 15);
      } else {
        // Vertical card layout: icon on top, text below
        // Auto-fit icon scale to fit within card (max 90% of cardW wide, 55px tall to leave room for text)
        const iconMaxW = cardW * 0.9, iconMaxH = 55;
        this.drawChoiceIcon(ctx, choice.icon, cardX + cardW/2, cardY + 40 + iconMaxH/2, iconMaxW, iconMaxH);

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
      this.drawChoiceBadges(ctx, choice, cardX, cardY, cardW);

      // Level indicator (top right) for weapon/stat upgrades
      if (choice.weaponId && choice.isWeaponUpgrade) {
        ctx.fillStyle = choice.nextLevel >= choice.maxLevel ? '#ffd040' : '#8a7a5a';
        ctx.font = '10px Courier New';
        ctx.textAlign = 'right';
        ctx.fillText(`Lv.${choice.currentLevel}/${choice.maxLevel}`, cardX + cardW - 8, cardY + 16);
      } else if (!choice.weaponId && choice.maxLevel) {
        const curLevel = this.player.upgradeLevels[choice.id] || 0;
        ctx.fillStyle = curLevel >= choice.maxLevel ? '#ff6040' : '#8a7a5a';
        ctx.font = '10px Courier New';
        ctx.textAlign = 'right';
        ctx.fillText(`Lv.${curLevel}/${choice.maxLevel}`, cardX + cardW - 8, cardY + 16);
      }

      const descText = this.getChoiceDescription(choice);

      if (portrait) {
        const iconMaxW = 48, iconMaxH = cardH - 10;
        this.drawChoiceIcon(ctx, choice.icon, cardX + 30, cardY + cardH/2, iconMaxW, iconMaxH);
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
        const iconMaxW = cardW * 0.9, iconMaxH = 55;
        this.drawChoiceIcon(ctx, choice.icon, cardX + cardW/2, cardY + 40 + iconMaxH/2, iconMaxW, iconMaxH);
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
