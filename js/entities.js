// ============================================================
// entities.js — Player, Enemy, Weapon, Projectile, Pickup, Particle
// ============================================================

// ==================== PLAYER ====================
class Player {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.facing = 0; // angle
    this.moveAngle = 0;
    this.hp = CONFIG.PLAYER.maxHp;
    this.invuln = 0;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.dashDir = { x: 0, y: 0 };
    this.animTime = 0;
    this.isMoving = false;

    this.level = 1;
    this.xp = 0;
    this.xpToNext = CONFIG.XP_CURVE[0];

    // weapons
    this.weapons = [];
    this.addWeapon('sword');

    // stats (upgradeable)
    this.stats = {
      damageMult: 1.0,
      attackSpeedMult: 1.0,
      rotateSpeedMult: 1.0,
      rangeMult: 1.0,
      moveSpeedMult: 1.0,
      pierceBonus: 0,
      critChanceBonus: 0,
      weaponCountBonus: 0,
      maxHpBonus: 0,
      regenBonus: 0,
    };

    this.kills = 0;
    this.alive = true;
  }

  getMaxHp() { return CONFIG.PLAYER.maxHp + this.stats.maxHpBonus; }

  addWeapon(weaponId) {
    const wdef = CONFIG.WEAPONS[weaponId];
    if (!wdef) return;
    // check if already owned
    const existing = this.weapons.find(w => w.id === weaponId);
    if (existing) {
      existing.level += 1;
      return;
    }
    this.weapons.push(new Weapon(weaponId, wdef));
  }

  gainXp(amount) {
    this.xp += amount;
    let leveled = false;
    while (this.level <= CONFIG.XP_CURVE.length && this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level++;
      this.xpToNext = CONFIG.XP_CURVE[Math.min(this.level - 1, CONFIG.XP_CURVE.length - 1)] || 9999;
      leveled = true;
      // heal 20% on level up
      this.heal(this.getMaxHp() * 0.2);
    }
    return leveled;
  }

  takeDamage(amount) {
    if (this.invuln > 0 || !this.alive) return;
    // shield block reduction
    let reduction = 0;
    for (const w of this.weapons) {
      if (w.def.blockReduction) reduction = Math.max(reduction, w.def.blockReduction);
    }
    amount = Math.max(1, Math.floor(amount * (1 - reduction)));
    this.hp -= amount;
    this.invuln = 0.8;
    Audio2.hurt();
    Game.spawnDamageNumber(this.x, this.y - 20, amount, '#ff4040');
    Game.shakeScreen(6, 0.2);
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      Audio2.death();
    }
  }

  heal(amount) {
    this.hp = Math.min(this.getMaxHp(), this.hp + amount);
  }

  update(dt) {
    if (!this.alive) return;

    this.animTime += dt;
    this.invuln = Math.max(0, this.invuln - dt);
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    this.dashTimer = Math.max(0, this.dashTimer - dt);

    // regen
    if (this.stats.regenBonus > 0) {
      this.heal(this.stats.regenBonus * dt);
    }

    // movement
    let mx = 0, my = 0;
    if (Input.isDown('KeyW') || Input.isDown('ArrowUp')) my -= 1;
    if (Input.isDown('KeyS') || Input.isDown('ArrowDown')) my += 1;
    if (Input.isDown('KeyA') || Input.isDown('ArrowLeft')) mx -= 1;
    if (Input.isDown('KeyD') || Input.isDown('ArrowRight')) mx += 1;

    // Virtual joystick input (overrides keyboard if active)
    if (Input.joystick.active && (Math.abs(Input.joystick.dx) > 0.1 || Math.abs(Input.joystick.dy) > 0.1)) {
      mx = Input.joystick.dx;
      my = Input.joystick.dy;
    }

    this.isMoving = (mx !== 0 || my !== 0);
    if (this.isMoving) {
      const len = Math.sqrt(mx*mx + my*my);
      mx /= len; my /= len;
      this.moveAngle = Math.atan2(my, mx);
    }

    // dash (keyboard or touch button)
    if ((Input.wasPressed('Space') || Input.dashButton.pressed) && this.dashCooldown <= 0 && this.isMoving) {
      this.dashTimer = CONFIG.PLAYER.dashDuration;
      this.dashCooldown = CONFIG.PLAYER.dashCooldown;
      this.dashDir = { x: mx, y: my };
      this.invuln = Math.max(this.invuln, CONFIG.PLAYER.dashDuration + 0.05);
      Audio2.play('sine', 400, 0.1, 0.06);
    }

    let speed = CONFIG.PLAYER.speed * this.stats.moveSpeedMult;
    if (this.dashTimer > 0) {
      speed = CONFIG.PLAYER.dashSpeed;
      this.vx = this.dashDir.x * speed;
      this.vy = this.dashDir.y * speed;
    } else {
      this.vx = mx * speed;
      this.vy = my * speed;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // clamp to map
    const mapW = CONFIG.MAP_W * CONFIG.TILE_SIZE;
    const mapH = CONFIG.MAP_H * CONFIG.TILE_SIZE;
    this.x = clamp(this.x, 30, mapW - 30);
    this.y = clamp(this.y, 30, mapH - 30);

    // update weapons
    for (const w of this.weapons) w.update(dt, this);
  }

  draw(ctx) {
    if (!this.alive) return;
    // flash when invuln
    if (this.invuln > 0 && Math.floor(this.animTime * 20) % 2 === 0) return;

    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 14, 14, 6, 0, 0, TAU);
    ctx.fill();

    // walk bob
    const bob = this.isMoving ? Math.sin(this.animTime * 10) * 2 : Math.sin(this.animTime * 3) * 1;
    Assets.drawCentered(ctx, 'player/hero', this.x, this.y + bob, 0.7, 0, 1);

    // draw weapons
    for (const w of this.weapons) w.draw(ctx);
  }
}

// ==================== WEAPON ====================
class Weapon {
  constructor(id, def) {
    this.id = id;
    this.def = def;
    this.level = 1;
    this.angle = Math.random() * TAU;
    this.cooldown = 0;
    this.hitSet = new Set(); // track enemies hit this rotation (for orbit)
    this.lastHitAngle = 0;
  }

  getDamage() {
    return this.def.damage * Game.player.stats.damageMult * (1 + (this.level - 1) * 0.15);
  }
  getRange() {
    return this.def.range * Game.player.stats.rangeMult * (1 + (this.level - 1) * 0.05);
  }
  getRotateSpeed() {
    return this.def.rotateSpeed * Game.player.stats.rotateSpeedMult * Game.player.stats.attackSpeedMult;
  }
  getCooldown() {
    return this.def.cooldown / (Game.player.stats.attackSpeedMult);
  }
  getPierce() {
    return (this.def.pierce || 0) + Game.player.stats.pierceBonus;
  }
  getCritChance() {
    return (this.def.critChance || 0) + Game.player.stats.critChanceBonus;
  }

  update(dt, player) {
    if (this.def.type === 'orbit') {
      this.angle += this.getRotateSpeed() * dt;

      // check collisions
      const range = this.getRange();
      const count = 1 + Game.player.stats.weaponCountBonus;
      const dmg = this.getDamage();
      const crit = this.getCritChance();
      const pierce = this.getPierce();

      for (let i = 0; i < count; i++) {
        const offset = (i / count) * TAU;
        const wx = player.x + Math.cos(this.angle + offset) * range;
        const wy = player.y + Math.sin(this.angle + offset) * range;

        for (const e of Game.enemies) {
          if (!e.alive) continue;
          const d = dist(wx, wy, e.x, e.y);
          if (d < (e.radius + 20)) {
            // hit
            const hitId = e.id + '_' + Math.floor(this.angle / 0.5);
            if (!this.hitSet.has(hitId)) {
              this.hitSet.add(hitId);
              let damage = dmg;
              let isCrit = Math.random() < crit;
              if (isCrit) damage *= this.def.critMult;
              e.takeDamage(damage, isCrit, this.def.knockback, player.x, player.y);
              if (this.def.type === 'orbit' && this.def.id !== 'shield') {
                Audio2.hit();
              }
            }
          }
        }
      }
      // clear hit set periodically (when angle wraps)
      if (this.hitSet.size > 200) this.hitSet.clear();
    } else if (this.def.type === 'ranged' || this.def.type === 'homing') {
      this.cooldown -= dt;
      if (this.cooldown <= 0) {
        this.cooldown = this.getCooldown();
        this.fire(player);
      }
    }
  }

  fire(player) {
    // find nearest enemy
    let target = null;
    let minD = this.def.range;
    for (const e of Game.enemies) {
      if (!e.alive) continue;
      const d = dist(player.x, player.y, e.x, e.y);
      if (d < minD) { minD = d; target = e; }
    }
    if (!target) return;

    const ang = angleTo(player.x, player.y, target.x, target.y);
    const dmg = this.getDamage();
    const crit = this.getCritChance();
    const pierce = this.getPierce();

    const proj = new Projectile(
      player.x, player.y,
      Math.cos(ang) * this.def.projectileSpeed,
      Math.sin(ang) * this.def.projectileSpeed,
      dmg, this.def.range, pierce, crit, this.def.critMult,
      this.def.id === 'fireball' ? '#ff8030' : this.def.color,
      this.def.icon, this.def.size, this.def.id
    );
    proj.homing = this.def.type === 'homing';
    proj.homingStrength = this.def.homingStrength || 0;
    proj.splash = this.def.splash || 0;
    Game.projectiles.push(proj);
    Audio2.play('square', 300, 0.04, 0.04);
  }

  draw(ctx) {
    if (this.def.type !== 'orbit') return;
    const range = this.getRange();
    const count = 1 + Game.player.stats.weaponCountBonus;
    const player = Game.player;

    for (let i = 0; i < count; i++) {
      const offset = (i / count) * TAU;
      const wx = player.x + Math.cos(this.angle + offset) * range;
      const wy = player.y + Math.sin(this.angle + offset) * range;

      ctx.save();
      ctx.translate(wx, wy);
      ctx.rotate(this.angle + offset + Math.PI / 4);
      ctx.imageSmoothingEnabled = false;
      const img = Assets.get(this.def.icon);
      if (img && img.complete) {
        const sz = this.def.size;
        ctx.drawImage(img, -sz/2, -sz/2, sz, sz);
      } else {
        // fallback: draw a colored shape
        ctx.fillStyle = this.def.color;
        ctx.fillRect(-8, -8, 16, 16);
      }
      ctx.restore();

      // motion trail
      ctx.strokeStyle = this.def.color + '40';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const trailAng = this.angle + offset - 0.3;
      ctx.moveTo(player.x + Math.cos(trailAng) * range, player.y + Math.sin(trailAng) * range);
      ctx.lineTo(wx, wy);
      ctx.stroke();
    }
  }
}

// ==================== ENEMY ====================
class Enemy {
  constructor(type, x, y) {
    const def = CONFIG.ENEMIES[type];
    if (!def) { console.error('Unknown enemy: ' + type); return; }
    this.type = type;
    this.def = def;
    this.id = Enemy.nextId++;
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.speed = def.speed;
    this.damage = def.damage;
    this.xp = def.xp;
    this.radius = def.radius;
    this.alive = true;
    this.hitFlash = 0;
    this.shootTimer = def.shootCooldown ? Math.random() * def.shootCooldown : 0;
    this.summonTimer = def.summonCooldown || 0;
    this.animTime = Math.random() * 10;
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    this.isBoss = def.behavior === 'boss';
    this.isElite = !!def.elite;
    this.isMimic = !!def.isMimic;
    this.phase = 1;
    this.enraged = false;
    this.contactCooldown = 0;
  }

  static nextId = 0;

  takeDamage(amount, isCrit, knockback, fromX, fromY) {
    if (!this.alive) return;
    this.hp -= amount;
    this.hitFlash = 0.15;
    Game.spawnDamageNumber(this.x, this.y - this.radius - 5, Math.floor(amount), isCrit ? '#ffd040' : '#ffffff', isCrit);
    Audio2.hit();

    if (knockback && fromX !== undefined) {
      const ang = angleTo(fromX, fromY, this.x, this.y);
      this.knockbackVx += Math.cos(ang) * knockback;
      this.knockbackVy += Math.sin(ang) * knockback;
    }

    if (this.isBoss) {
      const hpPct = this.hp / this.maxHp;
      if (!this.enraged && hpPct <= this.def.enrageHpPct) {
        this.enraged = true;
        this.speed *= 1.5;
        this.damage *= 1.3;
        this.shootTimer = 0.5;
        Audio2.boss();
        Game.addMessage('诅咒骑士进入狂暴状态!', '#ff4040');
      }
    }

    if (this.hp <= 0) this.die();
  }

  die() {
    this.alive = false;
    Game.player.kills++;
    Audio2.death();
    // spawn XP gem
    const gemType = this.isBoss ? 'xp_gem_large' : (this.isElite ? 'xp_gem_medium' : 'xp_gem_small');
    const gemCount = this.isBoss ? 10 : (this.isElite ? 3 : 1);
    for (let i = 0; i < gemCount; i++) {
      const ang = Math.random() * TAU;
      const r = Math.random() * 20;
      Game.pickups.push(new Pickup(this.x + Math.cos(ang)*r, this.y + Math.sin(ang)*r, 'xp', gemType, this.xp / gemCount));
    }

    // death particles
    for (let i = 0; i < (this.isBoss ? 30 : 8); i++) {
      const ang = Math.random() * TAU;
      const spd = rand(50, 150);
      Game.particles.push(new Particle(this.x, this.y, Math.cos(ang)*spd, Math.sin(ang)*spd, this.def.color, rand(0.3, 0.8), rand(2, 5)));
    }

    // boss/elite drops
    if (this.isBoss) {
      Game.spawnChest(this.x, this.y, true);
      Game.onBossDefeated();
    } else if (this.isMimic) {
      // mimic drops rare upgrade
      Game.triggerMimicReward();
    } else if (this.isElite && Math.random() < 0.5) {
      Game.spawnChest(this.x, this.y, false);
    }

    Game.shakeScreen(this.isBoss ? 15 : 3, this.isBoss ? 0.5 : 0.1);
  }

  update(dt) {
    if (!this.alive) return;
    this.animTime += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.contactCooldown = Math.max(0, this.contactCooldown - dt);

    const player = Game.player;

    // knockback decay
    this.x += this.knockbackVx * dt;
    this.y += this.knockbackVy * dt;
    this.knockbackVx *= 0.85;
    this.knockbackVy *= 0.85;

    const d = dist(this.x, this.y, player.x, player.y);

    if (this.def.behavior === 'chase' || this.def.behavior === 'boss') {
      // move toward player
      const ang = angleTo(this.x, this.y, player.x, player.y);
      let sp = this.speed;
      if (this.def.behavior === 'boss') {
        // boss keeps some distance sometimes
        if (d < 100) sp *= 0.3;
      }
      this.vx = Math.cos(ang) * sp;
      this.vy = Math.sin(ang) * sp;
    } else if (this.def.behavior === 'ranged') {
      // keep distance, shoot
      const ang = angleTo(this.x, this.y, player.x, player.y);
      if (d < 120) {
        this.vx = -Math.cos(ang) * this.speed;
        this.vy = -Math.sin(ang) * this.speed;
      } else if (d > 250) {
        this.vx = Math.cos(ang) * this.speed * 0.5;
        this.vy = Math.sin(ang) * this.speed * 0.5;
      } else {
        // strafe
        this.vx = -Math.sin(ang) * this.speed * 0.6;
        this.vy = Math.cos(ang) * this.speed * 0.6;
      }
      this.shootTimer -= dt;
      if (this.shootTimer <= 0 && d < this.def.shootRange) {
        this.shootTimer = this.def.shootCooldown;
        this.shoot(player);
      }
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // boss abilities
    if (this.def.behavior === 'boss') {
      this.shootTimer -= dt;
      if (this.shootTimer <= 0 && d < this.def.shootRange) {
        this.shootTimer = this.def.shootCooldown;
        // fan shot
        const baseAng = angleTo(this.x, this.y, player.x, player.y);
        const shots = this.enraged ? 5 : 3;
        for (let i = 0; i < shots; i++) {
          const a = baseAng + (i - (shots-1)/2) * 0.25;
          Game.enemyProjectiles.push(new EnemyProjectile(
            this.x, this.y,
            Math.cos(a) * this.def.projectileSpeed,
            Math.sin(a) * this.def.projectileSpeed,
            this.damage * 0.6, this.def.projectileColor, 400
          ));
        }
        Audio2.play('sawtooth', 120, 0.1, 0.08);
      }

      this.summonTimer -= dt;
      if (this.summonTimer <= 0) {
        this.summonTimer = this.def.summonCooldown;
        this.summon();
      }
    }

    // contact damage
    if (d < this.radius + 16 && this.contactCooldown <= 0) {
      player.takeDamage(this.damage);
      this.contactCooldown = 0.8;
      // push enemy back slightly
      const ang = angleTo(player.x, player.y, this.x, this.y);
      this.knockbackVx += Math.cos(ang) * 50;
      this.knockbackVy += Math.sin(ang) * 50;
    }
  }

  shoot(player) {
    const ang = angleTo(this.x, this.y, player.x, player.y);
    Game.enemyProjectiles.push(new EnemyProjectile(
      this.x, this.y,
      Math.cos(ang) * this.def.projectileSpeed,
      Math.sin(ang) * this.def.projectileSpeed,
      this.damage, this.def.projectileColor, 300
    ));
    Audio2.play('sawtooth', 200, 0.05, 0.04);
  }

  summon() {
    const count = this.def.summonCount;
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * TAU;
      const r = 60;
      const ex = this.x + Math.cos(ang) * r;
      const ey = this.y + Math.sin(ang) * r;
      const type = pick(['slime', 'bat', 'spider']);
      Game.enemies.push(new Enemy(type, ex, ey));
    }
    Game.addMessage('诅咒骑士召唤了仆从!', '#ff6040');
    Audio2.boss();
  }

  draw(ctx) {
    if (!this.alive) return;
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + this.radius * 0.7, this.radius * 0.8, this.radius * 0.35, 0, 0, TAU);
    ctx.fill();

    // bob animation
    const bob = Math.sin(this.animTime * 6) * 2;
    const scale = this.isBoss ? 1.5 : (this.isElite ? 1.2 : 1.0);

    ctx.save();
    if (this.hitFlash > 0) {
      ctx.globalCompositeOperation = 'source-over';
    }
    Assets.drawCentered(ctx, this.def.sprite, this.x, this.y + bob, scale, 0, 1);

    // hit flash overlay
    if (this.hitFlash > 0) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = '#ffffff';
      const img = Assets.get(this.def.sprite);
      const w = img ? img.width * scale : 32;
      const h = img ? img.height * scale : 32;
      ctx.fillRect(this.x - w/2, this.y - h/2 + bob, w, h);
    }
    ctx.restore();

    // health bar (for elites/boss/damaged)
    if (this.isBoss || this.isElite || this.hp < this.maxHp) {
      const barW = this.isBoss ? 60 : 30;
      const barH = this.isBoss ? 6 : 4;
      const bx = this.x - barW/2;
      const by = this.y - this.radius - 12;
      ctx.fillStyle = '#1a0a0a';
      ctx.fillRect(bx-1, by-1, barW+2, barH+2);
      ctx.fillStyle = '#3a1a1a';
      ctx.fillRect(bx, by, barW, barH);
      const pct = clamp(this.hp / this.maxHp, 0, 1);
      ctx.fillStyle = this.isBoss ? '#ff3030' : (this.isElite ? '#ff8030' : '#c04040');
      ctx.fillRect(bx, by, barW * pct, barH);
    }

    // boss name
    if (this.isBoss) {
      ctx.fillStyle = '#ff4040';
      ctx.font = 'bold 12px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText(this.def.name, this.x, this.y - this.radius - 18);
    }
  }
}

// ==================== PROJECTILE ====================
class Projectile {
  constructor(x, y, vx, vy, damage, range, pierce, critChance, critMult, color, sprite, size, weaponId) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.damage = damage;
    this.maxRange = range;
    this.traveled = 0;
    this.pierce = pierce;
    this.critChance = critChance;
    this.critMult = critMult;
    this.color = color;
    this.sprite = sprite;
    this.size = size || 16;
    this.weaponId = weaponId;
    this.alive = true;
    this.homing = false;
    this.homingStrength = 0;
    this.splash = 0;
    this.hitEnemies = new Set();
    this.angle = Math.atan2(vy, vx);
    this.life = 3.0;
  }

  update(dt) {
    this.life -= dt;
    if (this.life <= 0) { this.alive = false; return; }

    if (this.homing) {
      let target = null;
      let minD = 250;
      for (const e of Game.enemies) {
        if (!e.alive || this.hitEnemies.has(e.id)) continue;
        const d = dist(this.x, this.y, e.x, e.y);
        if (d < minD) { minD = d; target = e; }
      }
      if (target) {
        const targetAng = angleTo(this.x, this.y, target.x, target.y);
        const speed = Math.sqrt(this.vx*this.vx + this.vy*this.vy);
        const currentAng = Math.atan2(this.vy, this.vx);
        let diff = targetAng - currentAng;
        while (diff > Math.PI) diff -= TAU;
        while (diff < -Math.PI) diff += TAU;
        const newAng = currentAng + diff * this.homingStrength * dt;
        this.vx = Math.cos(newAng) * speed;
        this.vy = Math.sin(newAng) * speed;
      }
    }

    const moveX = this.vx * dt;
    const moveY = this.vy * dt;
    this.x += moveX;
    this.y += moveY;
    this.traveled += Math.sqrt(moveX*moveX + moveY*moveY);
    this.angle = Math.atan2(this.vy, this.vx);

    if (this.traveled > this.maxRange) { this.alive = false; return; }

    // check collisions
    for (const e of Game.enemies) {
      if (!e.alive || this.hitEnemies.has(e.id)) continue;
      const d = dist(this.x, this.y, e.x, e.y);
      if (d < e.radius + this.size * 0.5) {
        this.hitEnemies.add(e.id);
        let dmg = this.damage;
        let isCrit = Math.random() < this.critChance;
        if (isCrit) dmg *= this.critMult;
        e.takeDamage(dmg, isCrit, 0, this.x, this.y);

        // splash
        if (this.splash > 0) {
          for (const e2 of Game.enemies) {
            if (!e2.alive || e2.id === e.id) continue;
            const sd = dist(this.x, this.y, e2.x, e2.y);
            if (sd < this.splash) {
              e2.takeDamage(dmg * 0.5, false, 0, this.x, this.y);
            }
          }
          // splash particles
          for (let i = 0; i < 8; i++) {
            const a = Math.random() * TAU;
            const s = rand(50, 120);
            Game.particles.push(new Particle(this.x, this.y, Math.cos(a)*s, Math.sin(a)*s, this.color, 0.3, 3));
          }
        }

        if (this.hitEnemies.size > this.pierce) {
          this.alive = false;
          break;
        }
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.imageSmoothingEnabled = false;
    const img = Assets.get(this.sprite);
    if (img && img.complete) {
      ctx.drawImage(img, -this.size/2, -this.size/2, this.size, this.size);
    } else {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(0, 0, this.size * 0.4, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    // glow trail
    ctx.fillStyle = this.color + '30';
    ctx.beginPath();
    ctx.arc(this.x - this.vx * 0.02, this.y - this.vy * 0.02, this.size * 0.3, 0, TAU);
    ctx.fill();
  }
}

// ==================== ENEMY PROJECTILE ====================
class EnemyProjectile {
  constructor(x, y, vx, vy, damage, color, range) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.damage = damage;
    this.color = color;
    this.maxRange = range;
    this.traveled = 0;
    this.alive = true;
    this.radius = 6;
    this.life = 4.0;
  }

  update(dt) {
    this.life -= dt;
    if (this.life <= 0) { this.alive = false; return; }
    const mx = this.vx * dt, my = this.vy * dt;
    this.x += mx; this.y += my;
    this.traveled += Math.sqrt(mx*mx + my*my);
    if (this.traveled > this.maxRange) { this.alive = false; return; }

    const d = dist(this.x, this.y, Game.player.x, Game.player.y);
    if (d < this.radius + 14) {
      Game.player.takeDamage(this.damage);
      this.alive = false;
    }
  }

  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, TAU);
    ctx.fill();
    ctx.fillStyle = this.color + '60';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 1.8, 0, TAU);
    ctx.fill();
  }
}

// ==================== PICKUP ====================
class Pickup {
  constructor(x, y, type, sprite, value) {
    this.x = x; this.y = y;
    this.type = type; // 'xp', 'heart', 'chest'
    this.sprite = sprite;
    this.value = value || 0;
    this.alive = true;
    this.bob = Math.random() * TAU;
    this.life = 30;
    this.magnetized = false;
    this.vx = 0; this.vy = 0;
    // initial scatter
    const ang = Math.random() * TAU;
    this.vx = Math.cos(ang) * 40;
    this.vy = Math.sin(ang) * 40;
  }

  update(dt) {
    this.life -= dt;
    if (this.life <= 0) { this.alive = false; return; }
    this.bob += dt * 4;

    // scatter decay
    this.vx *= 0.9;
    this.vy *= 0.9;

    const player = Game.player;
    const d = dist(this.x, this.y, player.x, player.y);

    // magnet
    if (d < CONFIG.PLAYER.pickupRadius || this.magnetized) {
      this.magnetized = true;
      const ang = angleTo(this.x, this.y, player.x, player.y);
      const speed = 200 + (CONFIG.PLAYER.pickupRadius - d) * 4;
      this.vx = Math.cos(ang) * speed;
      this.vy = Math.sin(ang) * speed;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // pickup
    if (d < 18) {
      this.collect();
    }
  }

  collect() {
    this.alive = false;
    if (this.type === 'xp') {
      const leveled = Game.player.gainXp(this.value);
      Audio2.pickup();
      if (leveled) {
        Game.onLevelUp();
      }
    } else if (this.type === 'heart') {
      Game.player.heal(20);
      Audio2.pickup();
      Game.addMessage('+20 生命', '#40ff40');
    } else if (this.type === 'chest') {
      Game.openChest(this.x, this.y);
    }
  }

  draw(ctx) {
    const bobY = Math.sin(this.bob) * 3;
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    if (this.type === 'xp') {
      // glow
      ctx.fillStyle = 'rgba(120,255,120,0.15)';
      ctx.beginPath();
      ctx.arc(this.x, this.y + bobY, 12, 0, TAU);
      ctx.fill();
      Assets.drawCentered(ctx, 'items/' + this.sprite, this.x, this.y + bobY, 1, 0, 1);
    } else if (this.type === 'heart') {
      Assets.drawCentered(ctx, 'items/heart', this.x, this.y + bobY, 1.2, 0, 1);
    } else if (this.type === 'chest') {
      Assets.drawCentered(ctx, 'items/chest', this.x, this.y + bobY, 1, 0, 1);
    }

    // blink when about to despawn
    if (this.life < 5 && Math.floor(this.life * 6) % 2 === 0) {
      ctx.globalAlpha = 0.3;
    }
    ctx.restore();
  }
}

// ==================== PARTICLE ====================
class Particle {
  constructor(x, y, vx, vy, color, life, size) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.color = color;
    this.maxLife = life;
    this.life = life;
    this.size = size;
    this.alive = true;
  }

  update(dt) {
    this.life -= dt;
    if (this.life <= 0) { this.alive = false; return; }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= 0.92;
    this.vy *= 0.92;
  }

  draw(ctx) {
    const alpha = this.life / this.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    const s = this.size * alpha;
    ctx.fillRect(this.x - s/2, this.y - s/2, s, s);
    ctx.globalAlpha = 1;
  }
}

// ==================== DAMAGE NUMBER ====================
class DamageNumber {
  constructor(x, y, value, color, isCrit) {
    this.x = x + rand(-10, 10);
    this.y = y;
    this.vy = -50;
    this.value = value;
    this.color = color;
    this.isCrit = isCrit;
    this.life = 0.8;
    this.maxLife = 0.8;
    this.alive = true;
  }

  update(dt) {
    this.life -= dt;
    if (this.life <= 0) { this.alive = false; return; }
    this.y += this.vy * dt;
    this.vy += 60 * dt;
  }

  draw(ctx) {
    const alpha = this.life / this.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.font = this.isCrit ? 'bold 18px Courier New' : '12px Courier New';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    const text = this.isCrit ? this.value + '!' : '' + this.value;
    ctx.strokeText(text, this.x, this.y);
    ctx.fillText(text, this.x, this.y);
    ctx.globalAlpha = 1;
  }
}
