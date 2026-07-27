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
    this.hitFlash = 0;
    this.hitShakeX = 0;
    this.hitShakeY = 0;

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
      // --- new stats (upgrade system v2) ---
      critMultBonus: 0,         // 暴击伤害倍率加成
      cooldownMult: 1.0,        // 武器冷却乘数 (越低越快)
      projectileSpeedMult: 1.0, // 弹丸速度乘数
      knockbackMult: 1.0,       // 击退乘数
      pickupRangeBonus: 0,      // 拾取范围加成
      dashCooldownMult: 1.0,    // 闪避冷却乘数
      armor: 0,                 // 固定减伤
      luck: 0,                  // 幸运 (影响稀有升级出现率)
      xpMult: 1.0,              // 经验获取乘数
      lifesteal: 0,             // 生命偷取比例
    };

    // track upgrade levels for maxLevel enforcement
    this.upgradeLevels = {};

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
    this.xp += amount * this.stats.xpMult;
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
    // armor: flat reduction after percentage reduction
    amount = Math.max(1, Math.floor(amount * (1 - reduction)) - this.stats.armor);
    this.hp -= amount;
    this.invuln = 0.8;
    this.hitFlash = 0.2;
    this.hitShakeX = rand(-4, 4);
    this.hitShakeY = rand(-4, 4);
    Audio2.hurt();
    Game.spawnDamageNumber(this.x, this.y - 20, amount, '#ff4040');
    Game.shakeScreen(6, 0.2);
    Game.damageVignette = 0.6;
    // red hit particles
    for (let i = 0; i < 6; i++) {
      const ang = Math.random() * TAU;
      const spd = rand(40, 100);
      Game.particles.push(Game.particlePool.obtain(this.x, this.y, Math.cos(ang)*spd, Math.sin(ang)*spd, '#ff4040', rand(0.3, 0.6), rand(2, 4)));
    }
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
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.hitShakeX *= 0.82;
    this.hitShakeY *= 0.82;
    if (Math.abs(this.hitShakeX) < 0.1) this.hitShakeX = 0;
    if (Math.abs(this.hitShakeY) < 0.1) this.hitShakeY = 0;
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
      this.dashCooldown = CONFIG.PLAYER.dashCooldown * this.stats.dashCooldownMult;
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

    // resolve collision with solid props
    Game.resolvePropCollision(this);

    // update weapons
    for (const w of this.weapons) w.update(dt, this);
  }

  draw(ctx) {
    if (!this.alive) return;

    // semi-transparent blink during invuln (visible but ghostly, not fully invisible)
    let alpha = 1;
    if (this.invuln > 0 && Math.floor(this.animTime * 20) % 2 === 0) {
      alpha = 0.35;
    }

    // hit shake offset
    const sx = this.hitShakeX;
    const sy = this.hitShakeY;

    // shadow
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(this.x + sx, this.y + 14 + sy, 14, 6, 0, 0, TAU);
    ctx.fill();

    // walk bob
    const bob = this.isMoving ? Math.sin(this.animTime * 10) * 2 : Math.sin(this.animTime * 3) * 1;
    Assets.drawCentered(ctx, 'player/hero', this.x + sx, this.y + bob + sy, 0.7, 0, alpha);

    // hit flash overlay (red tint on sprite)
    if (this.hitFlash > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      ctx.globalAlpha = alpha * 0.7 * (this.hitFlash / 0.2);
      ctx.fillStyle = '#ff2020';
      const img = Assets.get('player/hero');
      const w = img ? img.width * 0.7 : 32;
      const h = img ? img.height * 0.7 : 32;
      ctx.fillRect(this.x + sx - w/2, this.y + bob + sy - h/2, w, h);
      ctx.restore();
    }

    ctx.globalAlpha = 1;

    // draw weapons (always fully visible)
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
    return this.def.cooldown / Game.player.stats.attackSpeedMult * Game.player.stats.cooldownMult;
  }
  getPierce() {
    return (this.def.pierce || 0) + Game.player.stats.pierceBonus;
  }
  getCritChance() {
    return (this.def.critChance || 0) + Game.player.stats.critChanceBonus;
  }
  getCritMult() {
    return (this.def.critMult || 2.0) + Game.player.stats.critMultBonus;
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

        const nearby = Game.enemyGrid.query(wx, wy, 80);
        for (const e of nearby) {
          if (!e.alive) continue;
          const d = dist(wx, wy, e.x, e.y);
          if (d < (e.radius + 20)) {
            // hit
            const hitId = e.id + '_' + Math.floor(this.angle / 0.5);
            if (!this.hitSet.has(hitId)) {
              this.hitSet.add(hitId);
              let damage = dmg;
              let isCrit = Math.random() < crit;
              if (isCrit) damage *= this.getCritMult();
              const kb = (this.def.knockback || 0) * player.stats.knockbackMult;
              e.takeDamage(damage, isCrit, kb, player.x, player.y);
              // lifesteal
              if (player.stats.lifesteal > 0) {
                player.heal(damage * player.stats.lifesteal);
              }
              if (this.def.type === 'orbit' && this.id !== 'shield') {
                Audio2.hit();
              }
              // splash damage for evolved orbit weapons (e.g. hammer_meteor)
              if (this.def.splash) {
                const splashR = this.def.splash;
                for (const e2 of Game.enemyGrid.query(e.x, e.y, splashR)) {
                  if (!e2.alive || e2.id === e.id) continue;
                  const sd = dist(e.x, e.y, e2.x, e2.y);
                  if (sd < splashR) {
                    const splashDmg = damage * 0.5;
                    e2.takeDamage(splashDmg, false, kb * 0.5, e.x, e.y);
                  }
                }
                // splash particles
                for (let p = 0; p < 6; p++) {
                  const pa = Math.random() * TAU;
                  const ps = rand(40, 100);
                  Game.particles.push(Game.particlePool.obtain(
                    e.x, e.y, Math.cos(pa) * ps, Math.sin(pa) * ps,
                    this.def.color, 0.3, 3
                  ));
                }
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
    for (const e of Game.enemyGrid.query(player.x, player.y, this.def.range)) {
      if (!e.alive) continue;
      const d = dist(player.x, player.y, e.x, e.y);
      if (d < minD) { minD = d; target = e; }
    }
    if (!target) return;

    const baseAng = angleTo(player.x, player.y, target.x, target.y);
    const dmg = this.getDamage();
    const crit = this.getCritChance();
    const pierce = this.getPierce();
    const critMult = this.getCritMult();
    const projSpeed = this.def.projectileSpeed * player.stats.projectileSpeedMult;
    // multiShot: fire multiple projectiles in a spread (e.g. soul_hunter)
    const shots = this.def.multiShot || 1;
    const spread = shots > 1 ? 0.3 : 0; // total spread angle in radians

    for (let s = 0; s < shots; s++) {
      const ang = shots > 1
        ? baseAng - spread/2 + (s / (shots - 1)) * spread
        : baseAng;
      const proj = Game.projectilePool.obtain(
        player.x, player.y,
        Math.cos(ang) * projSpeed,
        Math.sin(ang) * projSpeed,
        dmg, this.def.range, pierce, crit, critMult,
        this.id === 'fireball' ? '#ff8030' : this.def.color,
        this.def.icon, this.def.size, this.id
      );
      proj.homing = this.def.type === 'homing';
      proj.homingStrength = this.def.homingStrength || 0;
      proj.splash = this.def.splash || 0;
      Game.projectiles.push(proj);
    }
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

// ==================== ENEMY BEHAVIORS ====================
// Strategy pattern: each behavior encapsulates movement + attack logic.
// Behaviors are stateless singletons; enemy state lives on the enemy itself.

class EnemyBehavior {
  // compute movement velocity and perform attacks
  // returns nothing; modifies enemy.vx/vy and may spawn projectiles
  update(enemy, dt, player, d) { /* override */ }
}

class ChaseBehavior extends EnemyBehavior {
  update(enemy, dt, player, d) {
    const ang = angleTo(enemy.x, enemy.y, player.x, player.y);
    enemy.vx = Math.cos(ang) * enemy.speed;
    enemy.vy = Math.sin(ang) * enemy.speed;
  }
}

class RangedBehavior extends EnemyBehavior {
  update(enemy, dt, player, d) {
    const ang = angleTo(enemy.x, enemy.y, player.x, player.y);
    if (d < 120) {
      // back away
      enemy.vx = -Math.cos(ang) * enemy.speed;
      enemy.vy = -Math.sin(ang) * enemy.speed;
    } else if (d > 250) {
      // approach
      enemy.vx = Math.cos(ang) * enemy.speed * 0.5;
      enemy.vy = Math.sin(ang) * enemy.speed * 0.5;
    } else {
      // strafe sideways
      enemy.vx = -Math.sin(ang) * enemy.speed * 0.6;
      enemy.vy = Math.cos(ang) * enemy.speed * 0.6;
    }
    // shoot on cooldown
    enemy.shootTimer -= dt;
    if (enemy.shootTimer <= 0 && d < enemy.def.shootRange) {
      enemy.shootTimer = enemy.def.shootCooldown;
      enemy.shoot(player);
    }
  }
}

class BossBehavior extends EnemyBehavior {
  update(enemy, dt, player, d) {
    // boss movement depends on state machine state
    const ang = angleTo(enemy.x, enemy.y, player.x, player.y);
    let sp = enemy.speed;
    if (enemy.bossState === 'charging') {
      sp = 0; // velocity set by charge
    } else if (enemy.bossState === 'windup' || enemy.bossState === 'attack') {
      sp = enemy.speed * 0.2; // slow during attacks
    } else {
      // idle: keep moderate distance, approach if far
      if (d < 120) sp *= 0.3;
      else if (d > 260) sp *= 1.2;
    }
    enemy.vx = Math.cos(ang) * sp;
    enemy.vy = Math.sin(ang) * sp;
  }
}

// Bat: zig-zag flight pattern — chases player but weaves sideways sinusoidally
class BatBehavior extends EnemyBehavior {
  update(enemy, dt, player, d) {
    const ang = angleTo(enemy.x, enemy.y, player.x, player.y);
    // lateral sine offset based on enemy animTime for irregular trajectory
    const lateral = Math.sin(enemy.animTime * 8) * 0.7;
    const finalAng = ang + lateral;
    enemy.vx = Math.cos(finalAng) * enemy.speed;
    enemy.vy = Math.sin(finalAng) * enemy.speed;
  }
}

// Dash: chases player, periodically bursts forward at high speed.
// State machine: chase → windup (telegraph) → dash (burst) → recover → chase
class DashBehavior extends EnemyBehavior {
  update(enemy, dt, player, d) {
    // lazy-init per-enemy dash state
    if (!enemy.dashState) {
      enemy.dashState = 'chase';
      enemy.dashTimer = 0;
      enemy.dashCooldownTimer = 2.0 + Math.random() * 2;
      enemy.dashDir = { x: 0, y: 0 };
    }

    const ang = angleTo(enemy.x, enemy.y, player.x, player.y);
    enemy.dashTimer -= dt;
    enemy.dashCooldownTimer -= dt;

    switch (enemy.dashState) {
      case 'chase':
        enemy.vx = Math.cos(ang) * enemy.speed;
        enemy.vy = Math.sin(ang) * enemy.speed;
        // start windup when in range and cooldown ready
        if (d < 220 && d > 50 && enemy.dashCooldownTimer <= 0) {
          enemy.dashState = 'windup';
          enemy.dashTimer = 0.4;
        }
        break;
      case 'windup':
        // slow down, telegraph the dash
        enemy.vx = Math.cos(ang) * enemy.speed * 0.15;
        enemy.vy = Math.sin(ang) * enemy.speed * 0.15;
        enemy.hitFlash = Math.max(enemy.hitFlash, 0.1); // visual flash during windup
        if (enemy.dashTimer <= 0) {
          enemy.dashState = 'dash';
          enemy.dashTimer = 0.3;
          enemy.dashDir = { x: Math.cos(ang), y: Math.sin(ang) };
          Audio2.play('sawtooth', 300, 0.1, 0.06);
        }
        break;
      case 'dash':
        // burst toward player at high speed
        const dashSpeed = enemy.speed * 3.5;
        enemy.vx = enemy.dashDir.x * dashSpeed;
        enemy.vy = enemy.dashDir.y * dashSpeed;
        if (enemy.dashTimer <= 0) {
          enemy.dashState = 'recover';
          enemy.dashTimer = 0.4;
        }
        break;
      case 'recover':
        // slow down after dash
        enemy.vx = Math.cos(ang) * enemy.speed * 0.4;
        enemy.vy = Math.sin(ang) * enemy.speed * 0.4;
        if (enemy.dashTimer <= 0) {
          enemy.dashState = 'chase';
          enemy.dashCooldownTimer = 2.5 + Math.random() * 1.5;
        }
        break;
    }
  }
}

// Elite Scarecrow: chases player, periodically cleaves in an arc and summons scarecrows.
// State machine: chase → cleaveWindup → cleave → chase, with summon on cooldown.
class EliteScarecrowBehavior extends EnemyBehavior {
  update(enemy, dt, player, d) {
    // lazy-init per-enemy state
    if (!enemy.esState) {
      enemy.esState = 'chase';
      enemy.esTimer = 0;
      enemy.esCleaveCd = enemy.def.cleaveCooldown * 0.5; // first cleave comes sooner
      enemy.esSummonCd = enemy.def.summonCooldown || 8;
      enemy.esCleaveAngle = 0;
    }

    const ang = angleTo(enemy.x, enemy.y, player.x, player.y);
    enemy.esTimer -= dt;
    enemy.esCleaveCd -= dt;
    enemy.esSummonCd -= dt;

    // summon scarecrows on cooldown
    if (enemy.esSummonCd <= 0) {
      enemy.esSummonCd = enemy.def.summonCooldown;
      ENEMY_SUMMON_BEHAVIOR.execute(enemy, enemy.def.summonCount, 60, 'scarecrow', ' 召唤了稻草怪！');
    }

    switch (enemy.esState) {
      case 'chase':
        enemy.vx = Math.cos(ang) * enemy.speed;
        enemy.vy = Math.sin(ang) * enemy.speed;
        // start cleave windup when in range
        if (d < enemy.def.cleaveRange && enemy.esCleaveCd <= 0) {
          enemy.esState = 'cleaveWindup';
          enemy.esTimer = enemy.def.cleaveWindup;
          enemy.esCleaveAngle = ang;
        }
        break;
      case 'cleaveWindup':
        // slow down, telegraph
        enemy.vx = Math.cos(ang) * enemy.speed * 0.1;
        enemy.vy = Math.sin(ang) * enemy.speed * 0.1;
        enemy.hitFlash = Math.max(enemy.hitFlash, 0.08);
        if (enemy.esTimer <= 0) {
          enemy.esState = 'cleave';
          enemy.esTimer = 0.2;
          this.executeCleave(enemy, player);
        }
        break;
      case 'cleave':
        enemy.vx *= 0.5;
        enemy.vy *= 0.5;
        if (enemy.esTimer <= 0) {
          enemy.esState = 'chase';
          enemy.esCleaveCd = enemy.def.cleaveCooldown;
        }
        break;
    }
  }

  // cleave: damage player if within arc range
  executeCleave(enemy, player) {
    const range = enemy.def.cleaveRange;
    const arc = enemy.def.cleaveArc;
    const dmg = enemy.damage * enemy.def.cleaveDamage;
    const d = dist(enemy.x, enemy.y, player.x, player.y);
    if (d < range + player.radius) {
      const angToPlayer = angleTo(enemy.x, enemy.y, player.x, player.y);
      let diff = angToPlayer - enemy.esCleaveAngle;
      while (diff > Math.PI) diff -= TAU;
      while (diff < -Math.PI) diff += TAU;
      if (Math.abs(diff) < arc / 2) {
        player.takeDamage(dmg);
      }
    }
    // cleave particles — arc slash effect
    for (let i = 0; i < 16; i++) {
      const a = enemy.esCleaveAngle - arc / 2 + (i / 16) * arc;
      const spd = rand(60, 120);
      const r = range * 0.7;
      Game.particles.push(Game.particlePool.obtain(
        enemy.x + Math.cos(a) * r, enemy.y + Math.sin(a) * r,
        Math.cos(a) * spd, Math.sin(a) * spd,
        '#ffaa30', 0.3, 4
      ));
    }
    Audio2.play('sawtooth', 200, 0.15, 0.08);
    Game.shakeScreen(4, 0.15);
  }
}

// Corrupted Knight: chases player, periodically charges with telegraph.
// Has flat armor damage reduction. State machine: chase → windup → charge → recover.
class KnightChargeBehavior extends EnemyBehavior {
  update(enemy, dt, player, d) {
    // lazy-init per-enemy state
    if (!enemy.kcState) {
      enemy.kcState = 'chase';
      enemy.kcTimer = 0;
      enemy.kcChargeCd = enemy.def.chargeCooldown * 0.6; // first charge sooner
      enemy.kcDir = { x: 0, y: 0 };
    }

    const ang = angleTo(enemy.x, enemy.y, player.x, player.y);
    enemy.kcTimer -= dt;
    enemy.kcChargeCd -= dt;

    switch (enemy.kcState) {
      case 'chase':
        enemy.vx = Math.cos(ang) * enemy.speed;
        enemy.vy = Math.sin(ang) * enemy.speed;
        // start charge windup when in range and cooldown ready
        if (d < 300 && d > 40 && enemy.kcChargeCd <= 0) {
          enemy.kcState = 'windup';
          enemy.kcTimer = enemy.def.chargeWindup;
        }
        break;
      case 'windup':
        // stop and telegraph — flash and face player
        enemy.vx *= 0.1;
        enemy.vy *= 0.1;
        enemy.hitFlash = Math.max(enemy.hitFlash, 0.12);
        if (enemy.kcTimer <= 0) {
          enemy.kcState = 'charge';
          enemy.kcTimer = enemy.def.chargeDuration || 0.4;
          enemy.kcDir = { x: Math.cos(ang), y: Math.sin(ang) };
          Audio2.play('sawtooth', 250, 0.15, 0.08);
        }
        break;
      case 'charge':
        // burst toward player at high speed
        const chargeSpd = enemy.def.chargeSpeed;
        enemy.vx = enemy.kcDir.x * chargeSpd;
        enemy.vy = enemy.kcDir.y * chargeSpd;
        // charge particles trail
        if (Math.random() < 0.5) {
          Game.particles.push(Game.particlePool.obtain(
            enemy.x, enemy.y,
            rand(-30, 30), rand(-30, 30),
            '#806060', 0.2, 3
          ));
        }
        // charge contact damage
        if (d < enemy.radius + 16 && enemy.contactCooldown <= 0) {
          player.takeDamage(enemy.damage * enemy.def.chargeDamage);
          enemy.contactCooldown = 0.8;
          Game.shakeScreen(6, 0.2);
        }
        if (enemy.kcTimer <= 0) {
          enemy.kcState = 'recover';
          enemy.kcTimer = 0.5;
        }
        break;
      case 'recover':
        // slow down after charge
        enemy.vx *= 0.7;
        enemy.vy *= 0.7;
        if (enemy.kcTimer <= 0) {
          enemy.kcState = 'chase';
          enemy.kcChargeCd = enemy.def.chargeCooldown;
        }
        break;
    }
  }
}

// Mimic (treasure chest monster): state machine with disguise → reveal → chase →
// attack / jumpAttack → hurt → dead.  Disguise renders as a normal chest; the
// enemy becomes aggressive when the player approaches.
// States: disguise | reveal | chase | attack | jumpWindup | jumpAttack | jumpRecover | hurt
// Consume state is reserved for future weapon-eating mechanic (interface only).
class MimicBehavior extends EnemyBehavior {
  update(enemy, dt, player, d) {
    // lazy-init per-enemy state
    if (!enemy.mimicState) {
      enemy.mimicState = 'disguise';
      enemy.mimicTimer = 0;
      enemy.mimicAttackCd = enemy.def.attackCooldown;
      enemy.mimicJumpCd = enemy.def.jumpCooldown;
      enemy.mimicJumpDir = { x: 0, y: 0 };
      enemy.mimicPrevHp = enemy.hp;
    }

    const ang = angleTo(enemy.x, enemy.y, player.x, player.y);
    enemy.mimicTimer -= dt;
    enemy.mimicAttackCd -= dt;
    enemy.mimicJumpCd -= dt;

    // detect heavy hits (crit or >15% maxHp in one blow) → stagger
    if (enemy.mimicPrevHp - enemy.hp > enemy.maxHp * 0.15) {
      enemy.mimicState = 'hurt';
      enemy.mimicTimer = enemy.def.hurtDuration;
      // stagger particles
      for (let i = 0; i < 6; i++) {
        const a = Math.random() * TAU;
        const spd = rand(30, 80);
        Game.particles.push(Game.particlePool.obtain(
          enemy.x, enemy.y,
          Math.cos(a) * spd, Math.sin(a) * spd,
          '#cc8844', 0.3, 3
        ));
      }
    }
    enemy.mimicPrevHp = enemy.hp;

    switch (enemy.mimicState) {
      case 'disguise':
        // stay still, look like a chest
        enemy.vx = 0;
        enemy.vy = 0;
        // reveal when player approaches
        if (d < enemy.def.disguiseRange) {
          enemy.mimicState = 'reveal';
          enemy.mimicTimer = enemy.def.revealDuration;
          this.revealEffect(enemy);
        }
        break;

      case 'reveal':
        // brief stationary reveal animation (jaw snapping open)
        enemy.vx = 0;
        enemy.vy = 0;
        enemy.hitFlash = Math.max(enemy.hitFlash, 0.06);
        if (enemy.mimicTimer <= 0) {
          enemy.mimicState = 'chase';
        }
        break;

      case 'chase':
        enemy.vx = Math.cos(ang) * enemy.speed;
        enemy.vy = Math.sin(ang) * enemy.speed;
        // close-range bite attack
        if (d < enemy.def.attackRange && enemy.mimicAttackCd <= 0) {
          enemy.mimicState = 'attack';
          enemy.mimicTimer = 0.4;
          enemy.mimicAttackCd = enemy.def.attackCooldown;
        }
        // periodic jump attack at medium range
        else if (d > enemy.def.jumpRange[0] && d < enemy.def.jumpRange[1] && enemy.mimicJumpCd <= 0) {
          enemy.mimicState = 'jumpWindup';
          enemy.mimicTimer = enemy.def.jumpWindup;
        }
        break;

      case 'attack':
        // quick lunge toward player
        enemy.vx = Math.cos(ang) * enemy.speed * 0.6;
        enemy.vy = Math.sin(ang) * enemy.speed * 0.6;
        // bite contact damage
        if (d < enemy.radius + 18 && enemy.contactCooldown <= 0) {
          // Future: 20% chance to consume a weapon instead of dealing damage
          // if (Math.random() < 0.2) { this.consumeWeapon(enemy, player); break; }
          player.takeDamage(enemy.damage * enemy.def.attackDamage);
          enemy.contactCooldown = 0.8;
          Game.shakeScreen(4, 0.15);
        }
        if (enemy.mimicTimer <= 0) {
          enemy.mimicState = 'chase';
        }
        break;

      case 'jumpWindup':
        // telegraph the leap — flash and face player
        enemy.vx *= 0.1;
        enemy.vy *= 0.1;
        enemy.hitFlash = Math.max(enemy.hitFlash, 0.1);
        if (enemy.mimicTimer <= 0) {
          enemy.mimicState = 'jumpAttack';
          enemy.mimicTimer = enemy.def.jumpDuration;
          enemy.mimicJumpDir = { x: Math.cos(ang), y: Math.sin(ang) };
          Audio2.play('sawtooth', 200, 0.1, 0.06);
        }
        break;

      case 'jumpAttack':
        // leap toward player at high speed
        const jumpSpd = enemy.speed * enemy.def.jumpSpeed;
        enemy.vx = enemy.mimicJumpDir.x * jumpSpd;
        enemy.vy = enemy.mimicJumpDir.y * jumpSpd;
        // trail particles
        if (Math.random() < 0.4) {
          Game.particles.push(Game.particlePool.obtain(
            enemy.x, enemy.y,
            rand(-20, 20), rand(-20, 20),
            '#8a5a2a', 0.2, 3
          ));
        }
        // jump contact damage
        if (d < enemy.radius + 20 && enemy.contactCooldown <= 0) {
          player.takeDamage(enemy.damage * enemy.def.jumpDamage);
          enemy.contactCooldown = 0.8;
          Game.shakeScreen(6, 0.2);
        }
        if (enemy.mimicTimer <= 0) {
          enemy.mimicState = 'jumpRecover';
          enemy.mimicTimer = enemy.def.jumpRecover;
        }
        break;

      case 'jumpRecover':
        // slow down after landing
        enemy.vx *= 0.6;
        enemy.vy *= 0.6;
        if (enemy.mimicTimer <= 0) {
          enemy.mimicState = 'chase';
          enemy.mimicJumpCd = enemy.def.jumpCooldown + Math.random() * 2;
        }
        break;

      case 'hurt':
        // brief stagger after heavy hit
        enemy.vx *= 0.3;
        enemy.vy *= 0.3;
        if (enemy.mimicTimer <= 0) {
          enemy.mimicState = 'chase';
        }
        break;
    }
  }

  // visual + audio feedback when the mimic drops its disguise
  revealEffect(enemy) {
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * TAU;
      const spd = rand(40, 100);
      Game.particles.push(Game.particlePool.obtain(
        enemy.x, enemy.y,
        Math.cos(a) * spd, Math.sin(a) * spd,
        '#aa6a3a', rand(0.3, 0.6), rand(2, 4)
      ));
    }
    Audio2.play('sawtooth', 150, 0.2, 0.08);
    Game.shakeScreen(3, 0.15);
  }

  // ============================================================
  // Consume — future feature: mimic swallows a player's weapon.
  // Reserved interface: when implemented, the mimic will steal one
  // of the player's active weapons during a successful attack,
  // temporarily disabling it or permanently removing it.
  //
  // Planned signature:
  //   consumeWeapon(enemy, player)
  //     → picks a random weapon from player.weapons
  //     → sets weapon.consumed = true + weapon.consumeTimer = 5.0s
  //     → weapon.update() skips logic while consumed
  //     → weapon.restore() reactivates after timer expires
  //     → visual: weapon icon dims + "eaten" particle effect
  //     → if weapon has no backup, permanently lost (hardcore mode)
  //
  // Trigger condition: on 'attack' state hit, 20% chance to consume
  // instead of dealing damage. Plays a distinct "chomp" sound.
  // ============================================================
  consumeWeapon(enemy, player) {
    // TODO: implement weapon consumption logic
    // 1. Filter player.weapons to non-consumed, non-evolved weapons
    // 2. Pick one at random
    // 3. Set weapon.consumed = true, weapon.consumeTimer = 5.0
    // 4. Spawn "eaten" particles (weapon color + brown splash)
    // 5. Play Audio2.play('sawtooth', 100, 0.3, 0.1)
    // 6. Game.addMessage('宝箱怪吞噬了你的' + weapon.def.name + '！', '#cc4444')
  }
}

// behavior registry: map behavior string -> singleton instance
const ENEMY_BEHAVIORS = {
  chase: new ChaseBehavior(),
  ranged: new RangedBehavior(),
  boss: new BossBehavior(),
  bat: new BatBehavior(),
  dash: new DashBehavior(),
  eliteScarecrow: new EliteScarecrowBehavior(),
  knightCharge: new KnightChargeBehavior(),
  mimic: new MimicBehavior(),
};

// ==================== SUMMON BEHAVIOR ====================
// Encapsulates boss summoning logic: spawns minions in a circle around the summoner.
// Used by both 'summon' (random trash) and 'soldierSummon' (skeletons) abilities.
class SummonBehavior {
  // @param summoner  The enemy doing the summoning (provides x, y, def)
  // @param count     Number of minions to spawn
  // @param radius    Spawn radius around summoner
  // @param types     Array of enemy type strings to pick from (or a single string)
  // @param message   Optional message to display
  execute(summoner, count, radius, types, message) {
    const typeArr = Array.isArray(types) ? types : [types];
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * TAU + Math.random() * 0.5; // evenly distributed + jitter
      const r = radius + Math.random() * 20;
      const ex = summoner.x + Math.cos(ang) * r;
      const ey = summoner.y + Math.sin(ang) * r;
      const type = pick(typeArr);
      Game.enemies.push(new Enemy(type, ex, ey));
    }
    if (message) {
      Game.addMessage((summoner.def.name || 'Boss') + message, '#ff6040');
    }
    // summon particles
    for (let i = 0; i < count * 3; i++) {
      const ang = Math.random() * TAU;
      const spd = rand(30, 80);
      Game.particles.push(Game.particlePool.obtain(
        summoner.x, summoner.y,
        Math.cos(ang) * spd, Math.sin(ang) * spd,
        '#c060e0', rand(0.3, 0.6), rand(2, 4)
      ));
    }
    Audio2.boss();
  }
}

// shared summon behavior singleton
const ENEMY_SUMMON_BEHAVIOR = new SummonBehavior();

// ==================== DEATH BEHAVIOR ====================
// Encapsulates death effects: XP drops, particles, rewards, screen shake.
// Stateless singleton — reads enemy flags (isBoss/isElite/isMimic) to branch.
class DeathBehavior {
  execute(enemy) {
    // XP gem drops (size scales with enemy tier)
    const gemType = enemy.isBoss ? 'xp_gem_large' : (enemy.isElite ? 'xp_gem_medium' : 'xp_gem_small');
    const gemCount = enemy.isBoss ? 10 : (enemy.isElite ? 3 : 1);
    for (let i = 0; i < gemCount; i++) {
      const ang = Math.random() * TAU;
      const r = Math.random() * 20;
      Game.pickups.push(Game.pickupPool.obtain(enemy.x + Math.cos(ang) * r, enemy.y + Math.sin(ang) * r, 'xp', gemType, enemy.xp / gemCount));
    }

    // death particles (boss bursts more)
    const pCount = enemy.isBoss ? 30 : 8;
    for (let i = 0; i < pCount; i++) {
      const ang = Math.random() * TAU;
      const spd = rand(50, 150);
      Game.particles.push(Game.particlePool.obtain(enemy.x, enemy.y, Math.cos(ang) * spd, Math.sin(ang) * spd, enemy.def.color, rand(0.3, 0.8), rand(2, 5)));
    }

    // tier-based rewards
    if (enemy.isBoss) {
      Game.spawnChest(enemy.x, enemy.y, true);
      Game.onBossDefeated();
    } else if (enemy.isMimic) {
      Game.triggerMimicReward();
    } else if (enemy.isElite && Math.random() < 0.5) {
      Game.spawnChest(enemy.x, enemy.y, false);
    }

    // screen shake (heavier for boss)
    Game.shakeScreen(enemy.isBoss ? 15 : 3, enemy.isBoss ? 0.5 : 0.1);
  }
}

// shared death behavior singleton
const ENEMY_DEATH_BEHAVIOR = new DeathBehavior();

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

    // assign behavior strategy
    this.behavior = ENEMY_BEHAVIORS[def.behavior] || ENEMY_BEHAVIORS.chase;

    // ---- Boss state machine (无头骑士) ----
    // bossState: 'idle' | 'windup' | 'attack' | 'recover' | 'charging'
    // currentAbility: 'cleave' | 'fanShot' | 'charge' | 'orbit' | 'swordThrow' | 'soldierSummon' | 'hazard' | 'summon'
    if (this.isBoss) {
      this.bossState = 'idle';
      this.currentAbility = null;
      this.stateTimer = 0;          // generic timer for current state
      this.abilityTimer = 0;        // counts down between abilities
      this.abilityQueue = [];       // upcoming abilities to execute
      this.abilityDir = 0;          // facing angle for current attack
      this.chargeVx = 0;            // charge velocity
      this.chargeVy = 0;
      this.chargeDuration = 0;
      // phase-2 orbiting weapons
      this.orbitWeapons = [];       // { angle, radius }
      this.orbitAngle = 0;
      // ground hazards (damage zones)
      this.hazards = [];            // { x, y, r, life, damage }
      // sword-throw tracking
      this.thrownSwords = [];
    }
  }

  static nextId = 0;

  // Map enemy type to sound material category
  getMaterial() {
    if (this.isBoss) return 'metal';
    switch (this.type) {
      case 'slime': case 'rat': return 'flesh';
      case 'bat': case 'boar': case 'wild_dog': return 'leather';
      case 'skeleton': case 'spider': case 'beetle': return 'bone';
      case 'archer': case 'mage': case 'crystal': case 'miner': case 'villager': case 'plague_archer': return 'flesh';
      case 'golem': case 'scarecrow': case 'elite_scarecrow': return 'wood';
      case 'reaper': case 'corrupted_knight': return 'metal';
      case 'mimic': return 'chest';
      default: return 'flesh';
    }
  }

  takeDamage(amount, isCrit, knockback, fromX, fromY) {
    if (!this.alive) return;
    // apply flat armor reduction (e.g. corrupted_knight)
    if (this.def.armor) amount = Math.max(1, amount - this.def.armor);
    this.hp -= amount;
    this.hitFlash = 0.15;
    Game.spawnDamageNumber(this.x, this.y - this.radius - 5, Math.floor(amount), isCrit ? '#ffd040' : '#ffffff', isCrit);
    Audio2.hitMaterial(this.getMaterial());

    // spawn hit particles scaled to enemy size
    const particleCount = isCrit ? 8 : 4;
    const particleSize = clamp(this.radius * 0.25, 2, 5);
    for (let i = 0; i < particleCount; i++) {
      const ang = fromX !== undefined ? angleTo(fromX, fromY, this.x, this.y) + rand(-1, 1) : Math.random() * TAU;
      const spd = rand(60, 140);
      const px = this.x + Math.cos(ang) * this.radius * 0.5;
      const py = this.y + Math.sin(ang) * this.radius * 0.5;
      Game.particles.push(Game.particlePool.obtain(px, py, Math.cos(ang) * spd, Math.sin(ang) * spd, isCrit ? '#ffd040' : '#ffcc60', rand(0.2, 0.4), particleSize));
    }

    if (knockback && fromX !== undefined) {
      const ang = angleTo(fromX, fromY, this.x, this.y);
      this.knockbackVx += Math.cos(ang) * knockback;
      this.knockbackVy += Math.sin(ang) * knockback;
    }

    if (this.isBoss) {
      const hpPct = this.hp / this.maxHp;
      if (!this.enraged && hpPct <= this.def.enrageHpPct) {
        this.enraged = true;
        this.phase = 2;
        // phase transition: speed up, refresh timers, spawn orbiting weapons
        this.speed *= 1.25;
        this.damage *= 1.15;
        this.shootTimer = 0.4;
        this.abilityTimer = 0;
        this.abilityQueue = [];
        this.bossState = 'idle';
        // initialize orbiting weapons for phase 2
        const wCount = this.def.orbitWeaponCount || 3;
        for (let i = 0; i < wCount; i++) {
          this.orbitWeapons.push({ angle: (i / wCount) * TAU, radius: this.radius + 30 });
        }
        Audio2.boss();
        Game.addMessage('无头骑士拔出腐化巨剑！第二阶段！', '#ff4040');
        Game.shakeScreen(12, 0.4);
      }
    }

    if (this.hp <= 0) this.die();
  }

  die() {
    this.alive = false;
    Game.player.kills++;
    // track elite/boss kills for run statistics
    if (this.isBoss) Game.bossKills++;
    else if (this.isElite) Game.eliteKills++;
    Audio2.death();
    // death explosion (e.g. scarecrow) — happens before normal death effects
    if (this.def.deathExplosion) this.explode();
    // delegate death effects (drops, particles, rewards, shake) to DeathBehavior
    ENEMY_DEATH_BEHAVIOR.execute(this);
  }

  // death explosion: area damage + visual/sound feedback
  explode() {
    const exp = this.def.deathExplosion;
    const player = Game.player;

    // damage player if within explosion radius
    const d = dist(this.x, this.y, player.x, player.y);
    if (d < exp.radius + player.radius) {
      player.takeDamage(exp.damage);
    }

    // explosion burst particles (fire colors)
    for (let i = 0; i < 20; i++) {
      const ang = Math.random() * TAU;
      const spd = rand(80, 200);
      const r = Math.random() * exp.radius * 0.4;
      Game.particles.push(Game.particlePool.obtain(
        this.x + Math.cos(ang) * r, this.y + Math.sin(ang) * r,
        Math.cos(ang) * spd, Math.sin(ang) * spd,
        pick(['#ff8030', '#ffaa30', '#ffd040']),
        rand(0.4, 0.8), rand(3, 6)
      ));
    }
    // shockwave ring
    for (let i = 0; i < 14; i++) {
      const ang = (i / 14) * TAU;
      const spd = 160;
      Game.particles.push(Game.particlePool.obtain(
        this.x, this.y,
        Math.cos(ang) * spd, Math.sin(ang) * spd,
        '#ff6020', 0.3, 5
      ));
    }

    // explosion sound + screen shake
    Audio2.play('sawtooth', 80, 0.3, 0.12);
    Game.shakeScreen(8, 0.3);
    Game.spawnDamageNumber(this.x, this.y - 20, '爆炸!', '#ff6020');
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

    // delegate movement + attack to behavior strategy
    this.behavior.update(this, dt, player, d);

    // charge velocity overrides normal movement
    if (this.isBoss && this.bossState === 'charging') {
      this.vx = this.chargeVx;
      this.vy = this.chargeVy;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // resolve collision with solid props (enemies too)
    Game.resolvePropCollision(this);

    // boss state machine
    if (this.isBoss) {
      this.updateBoss(dt, player, d);
    }

    // contact damage (mimics in disguise/reveal don't deal contact damage)
    const mimicPassive = this.isMimic && (this.mimicState === 'disguise' || this.mimicState === 'reveal');
    if (!mimicPassive && d < this.radius + 16 && this.contactCooldown <= 0) {
      player.takeDamage(this.damage);
      this.contactCooldown = 0.8;
      // push enemy back slightly
      const ang = angleTo(player.x, player.y, this.x, this.y);
      this.knockbackVx += Math.cos(ang) * 50;
      this.knockbackVy += Math.sin(ang) * 50;
    }
  }

  // ---- Boss state machine (无头骑士 two-phase boss) ----
  updateBoss(dt, player, d) {
    // update phase-2 persistent effects (orbit weapons, hazards, thrown swords)
    if (this.phase >= 2) {
      this.updateOrbitWeapons(dt, player);
      this.updateHazards(dt, player);
      this.updateThrownSwords(dt, player);
    }

    this.stateTimer -= dt;

    switch (this.bossState) {
      case 'idle':
        this.abilityTimer -= dt;
        if (this.abilityTimer <= 0) {
          this.pickNextAbility(player, d);
        }
        break;

      case 'windup':
        // telegraph the attack; boss is slow/vulnerable
        if (this.stateTimer <= 0) {
          this.bossState = 'attack';
          this.stateTimer = this.getAttackDuration();
          this.executeAbilityStart(player, d);
        }
        break;

      case 'attack':
        if (this.bossState === 'attack' && this.currentAbility === 'charge') {
          // charge moves the boss; check duration
          this.chargeDuration -= dt;
          // charge collision damage
          if (d < this.radius + player.radius && this.contactCooldown <= 0) {
            player.takeDamage(this.damage * this.def.chargeDamage);
            this.contactCooldown = 0.5;
            Game.shakeScreen(10, 0.3);
          }
          if (this.chargeDuration <= 0) {
            this.endAbility();
          }
        } else if (this.stateTimer <= 0) {
          this.endAbility();
        }
        break;

      case 'recover':
        if (this.stateTimer <= 0) {
          this.bossState = 'idle';
          this.abilityTimer = this.def.abilityInterval || 1.0;
        }
        break;

      case 'charging':
        // charge handled in attack state; this is a fallback
        this.bossState = 'attack';
        break;
    }
  }

  pickNextAbility(player, d) {
    // build a queue of abilities if empty
    if (this.abilityQueue.length === 0) {
      if (this.phase === 1) {
        // phase-1 rotation: cleave (if close), fan shot, charge
        this.abilityQueue.push('fanShot');
        this.abilityQueue.push('charge');
        if (d < this.def.cleaveRange + 40) this.abilityQueue.push('cleave');
        // occasional summon
        this.summonTimer -= 2;
        if (this.summonTimer <= 0) {
          this.summonTimer = this.def.summonCooldown;
          this.abilityQueue.push('summon');
        }
        // shuffle
        shuffle(this.abilityQueue);
      } else {
        // phase-2 rotation: all phase-1 abilities + phase-2 abilities
        this.abilityQueue.push('fanShot');
        this.abilityQueue.push('charge');
        this.abilityQueue.push('swordThrow');
        this.abilityQueue.push('hazard');
        if (d < this.def.cleaveRange + 40) this.abilityQueue.push('cleave');
        // soldier summon on cooldown
        this.soldierSummonTimer = (this.soldierSummonTimer || this.def.soldierSummonCooldown) - 2;
        if (this.soldierSummonTimer <= 0) {
          this.soldierSummonTimer = this.def.soldierSummonCooldown;
          this.abilityQueue.push('soldierSummon');
        }
        shuffle(this.abilityQueue);
      }
    }

    const ability = this.abilityQueue.shift();
    if (!ability) {
      this.abilityTimer = 0.5;
      return;
    }

    this.currentAbility = ability;
    this.bossState = 'windup';
    this.stateTimer = this.getWindupDuration(ability);
    this.abilityDir = angleTo(this.x, this.y, player.x, player.y);
  }

  getWindupDuration(ability) {
    switch (ability) {
      case 'cleave': return this.def.cleaveWindup;
      case 'fanShot': return this.def.fanShotWindup;
      case 'charge': return this.def.chargeWindup;
      case 'swordThrow': return this.def.swordThrowWindup;
      default: return 0.5;
    }
  }

  getAttackDuration() {
    switch (this.currentAbility) {
      case 'cleave': return 0.3;
      case 'fanShot': return 0.2;
      case 'charge': return 0; // handled by chargeDuration
      case 'swordThrow': return 0.3;
      default: return 0.3;
    }
  }

  executeAbilityStart(player, d) {
    switch (this.currentAbility) {
      case 'cleave': this.doCleave(player); break;
      case 'fanShot': this.doFanShot(player); break;
      case 'charge': this.doCharge(player); break;
      case 'summon': this.summon(); break;
      case 'swordThrow': this.doSwordThrow(player); break;
      case 'soldierSummon': this.doSoldierSummon(); break;
      case 'hazard': this.doHazard(player); break;
    }
  }

  endAbility() {
    this.bossState = 'recover';
    this.stateTimer = 0.5;
    this.currentAbility = null;
  }

  // ---- Phase-1 abilities ----
  doCleave(player) {
    Audio2.play('sawtooth', 80, 0.2, 0.1);
    Game.shakeScreen(8, 0.2);
    const range = this.def.cleaveRange;
    const arc = this.def.cleaveArc;
    const dmg = this.damage * this.def.cleaveDamage;
    const ang = angleTo(this.x, this.y, player.x, player.y);
    // hit player if within arc
    const pd = dist(this.x, this.y, player.x, player.y);
    const pang = angleTo(this.x, this.y, player.x, player.y);
    let angDiff = Math.abs(normalizeAngle(pang - ang));
    if (pd < range + player.radius && angDiff < arc / 2) {
      player.takeDamage(dmg);
    }
    // cleave particles
    for (let i = 0; i < 12; i++) {
      const a = ang + rand(-arc/2, arc/2);
      const r = range * (0.5 + Math.random() * 0.5);
      const px = this.x + Math.cos(a) * r;
      const py = this.y + Math.sin(a) * r;
      Game.particles.push(Game.particlePool.obtain(px, py, Math.cos(a)*30, Math.sin(a)*30, '#c04040', rand(0.2,0.4), rand(2,4)));
    }
  }

  doFanShot(player) {
    const baseAng = angleTo(this.x, this.y, player.x, player.y);
    const shots = this.def.fanShotCount;
    for (let i = 0; i < shots; i++) {
      const a = baseAng + (i - (shots-1)/2) * 0.2;
      Game.enemyProjectiles.push(Game.enemyProjectilePool.obtain(
        this.x, this.y,
        Math.cos(a) * this.def.projectileSpeed,
        Math.sin(a) * this.def.projectileSpeed,
        this.damage * 0.6, this.def.projectileColor, 400
      ));
    }
    Audio2.play('sawtooth', 120, 0.1, 0.08);
  }

  doCharge(player) {
    const ang = angleTo(this.x, this.y, player.x, player.y);
    this.abilityDir = ang;
    this.chargeVx = Math.cos(ang) * this.def.chargeSpeed;
    this.chargeVy = Math.sin(ang) * this.def.chargeSpeed;
    this.chargeDuration = 0.8;
    this.bossState = 'attack';
    this.stateTimer = 0; // charge uses chargeDuration instead
    Audio2.play('square', 200, 0.3, 0.08);
    Game.shakeScreen(6, 0.3);
    // charge hit handled in updateBossContact during charging
  }

  // ---- Phase-2 abilities ----
  doSwordThrow(player) {
    // throw a giant sword projectile toward player
    const ang = angleTo(this.x, this.y, player.x, player.y);
    const dmg = this.damage * this.def.swordThrowDamage;
    const proj = Game.enemyProjectilePool.obtain(
      this.x, this.y,
      Math.cos(ang) * this.def.projectileSpeed * 0.8,
      Math.sin(ang) * this.def.projectileSpeed * 0.8,
      dmg, '#ff6030', 500
    );
    proj.radius = 18;
    Game.enemyProjectiles.push(proj);
    Audio2.play('sawtooth', 180, 0.15, 0.1);
  }

  doSoldierSummon() {
    ENEMY_SUMMON_BEHAVIOR.execute(this, this.def.soldierSummonCount, 80, 'skeleton', '召唤了腐化士兵!');
  }

  doHazard(player) {
    // create a ground damage zone at player's current position
    const r = this.def.hazardRadius;
    this.hazards.push({
      x: player.x, y: player.y, r: r,
      life: this.def.hazardDuration, maxLife: this.def.hazardDuration,
      damage: this.def.hazardDamage, tickTimer: 0
    });
    Game.addMessage('地面冒出腐化之火!', '#c040c0');
    Audio2.play('sine', 90, 0.3, 0.06);
  }

  updateOrbitWeapons(dt, player) {
    if (this.orbitWeapons.length === 0) return;
    this.orbitAngle += (this.def.orbitWeaponSpeed || 3) * dt;
    const dmg = this.def.orbitWeaponDamage || 20;
    for (const w of this.orbitWeapons) {
      const wx = this.x + Math.cos(w.angle + this.orbitAngle) * w.radius;
      const wy = this.y + Math.sin(w.angle + this.orbitAngle) * w.radius;
      // hit player
      const pd = dist(wx, wy, player.x, player.y);
      if (pd < 20 + player.radius && this.contactCooldown <= 0) {
        player.takeDamage(dmg);
        this.contactCooldown = 0.6;
      }
    }
  }

  updateHazards(dt, player) {
    for (const h of this.hazards) {
      h.life -= dt;
      h.tickTimer -= dt;
      if (h.tickTimer <= 0) {
        h.tickTimer = 0.5;
        const pd = dist(h.x, h.y, player.x, player.y);
        if (pd < h.r + player.radius) {
          player.takeDamage(h.damage);
        }
      }
    }
    this.hazards = this.hazards.filter(h => h.life > 0);
  }

  updateThrownSwords(dt, player) {
    // thrown swords are EnemyProjectiles; nothing extra to update here
    // placeholder for future homing behavior
  }

  shoot(player) {
    const ang = angleTo(this.x, this.y, player.x, player.y);
    Game.enemyProjectiles.push(Game.enemyProjectilePool.obtain(
      this.x, this.y,
      Math.cos(ang) * this.def.projectileSpeed,
      Math.sin(ang) * this.def.projectileSpeed,
      this.damage, this.def.projectileColor, 300
    ));
    Audio2.play('sawtooth', 200, 0.05, 0.04);
  }

  summon() {
    ENEMY_SUMMON_BEHAVIOR.execute(this, this.def.summonCount, 60, ['slime', 'bat', 'spider'], '召唤了仆从!');
  }

  draw(ctx) {
    if (!this.alive) return;
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + this.radius * 0.7, this.radius * 0.8, this.radius * 0.35, 0, 0, TAU);
    ctx.fill();

    // ---- Mimic disguise: render as a normal chest while disguised ----
    if (this.isMimic && this.mimicState === 'disguise') {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      Assets.drawCentered(ctx, 'items/chest', this.x, this.y, 1, 0, 1);
      ctx.restore();
      return; // no health bar, no bob — fully disguised
    }

    // ---- Boss extras: ground hazards, windup telegraphs, orbit weapons ----
    if (this.isBoss) {
      this.drawBossExtras(ctx);
    }

    // bob animation
    const bob = Math.sin(this.animTime * 6) * 2;
    const scale = this.isBoss ? 1.5 : (this.isElite ? 1.2 : 1.0);

    ctx.save();
    if (this.hitFlash > 0) {
      ctx.globalCompositeOperation = 'source-over';
    }
    Assets.drawCentered(ctx, this.def.sprite, this.x, this.y + bob, scale, 0, 1);

    // hit flash overlay - use collision radius so it matches enemy size
    if (this.hitFlash > 0) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = '#ffffff';
      // Use the enemy's collision radius for the flash area
      const flashR = this.radius * scale;
      ctx.fillRect(this.x - flashR, this.y - flashR + bob, flashR * 2, flashR * 2);
    }
    ctx.restore();

    // health bar (for elites/boss/damaged — mimic shows bar only after reveal)
    const showHpBar = (this.isBoss || this.isElite || this.hp < this.maxHp)
      && !(this.isMimic && this.mimicState === 'disguise');
    if (showHpBar) {
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

  // Draw boss-specific extras: ground hazards, windup telegraphs, orbiting weapons
  drawBossExtras(ctx) {
    // ground hazards (phase 2)
    for (const h of this.hazards) {
      const alpha = clamp(h.life / h.maxLife, 0, 1);
      const grad = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, h.r);
      grad.addColorStop(0, 'rgba(192,64,192,' + (0.4 * alpha) + ')');
      grad.addColorStop(0.7, 'rgba(160,32,160,' + (0.5 * alpha) + ')');
      grad.addColorStop(1, 'rgba(120,16,120,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.r, 0, TAU);
      ctx.fill();
      // flickering edge
      ctx.strokeStyle = 'rgba(220,80,220,' + (0.6 * alpha) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.r, 0, TAU);
      ctx.stroke();
    }

    // windup telegraph (attack warning)
    if (this.bossState === 'windup') {
      ctx.save();
      const t = 1 - (this.stateTimer / this.getWindupDuration(this.currentAbility));
      const pulse = 0.4 + 0.3 * Math.sin(this.animTime * 20);
      switch (this.currentAbility) {
        case 'cleave': {
          // arc telegraph
          ctx.fillStyle = 'rgba(255,80,80,' + (0.25 + 0.2 * t) + ')';
          ctx.beginPath();
          ctx.moveTo(this.x, this.y);
          ctx.arc(this.x, this.y, this.def.cleaveRange,
            this.abilityDir - this.def.cleaveArc / 2,
            this.abilityDir + this.def.cleaveArc / 2);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,120,120,' + pulse + ')';
          ctx.lineWidth = 2;
          ctx.stroke();
          break;
        }
        case 'charge': {
          // line telegraph in charge direction
          const len = 300;
          ctx.strokeStyle = 'rgba(255,60,60,' + (0.4 + 0.3 * t) + ')';
          ctx.lineWidth = 4;
          ctx.setLineDash([10, 6]);
          ctx.beginPath();
          ctx.moveTo(this.x, this.y);
          ctx.lineTo(this.x + Math.cos(this.abilityDir) * len, this.y + Math.sin(this.abilityDir) * len);
          ctx.stroke();
          ctx.setLineDash([]);
          break;
        }
        case 'fanShot':
        case 'swordThrow': {
          // small circle telegraph at boss
          ctx.strokeStyle = 'rgba(255,100,60,' + pulse + ')';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.radius + 8, 0, TAU);
          ctx.stroke();
          break;
        }
        case 'hazard': {
          // target circle at player's last position (approx)
          ctx.strokeStyle = 'rgba(200,60,200,' + pulse + ')';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.def.hazardRadius * 0.5, 0, TAU);
          ctx.stroke();
          ctx.setLineDash([]);
          break;
        }
      }
      ctx.restore();
    }

    // orbiting weapons (phase 2)
    if (this.orbitWeapons.length > 0) {
      for (const w of this.orbitWeapons) {
        const wx = this.x + Math.cos(w.angle + this.orbitAngle) * w.radius;
        const wy = this.y + Math.sin(w.angle + this.orbitAngle) * w.radius;
        // motion trail
        ctx.strokeStyle = 'rgba(255,80,40,0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const trailAng = w.angle + this.orbitAngle - 0.3;
        ctx.moveTo(this.x + Math.cos(trailAng) * w.radius, this.y + Math.sin(trailAng) * w.radius);
        ctx.lineTo(wx, wy);
        ctx.stroke();
        // weapon sprite
        ctx.save();
        ctx.translate(wx, wy);
        ctx.rotate(w.angle + this.orbitAngle + Math.PI / 4);
        const img = Assets.get('weapons/sword');
        if (img && img.complete) {
          ctx.drawImage(img, -12, -12, 24, 24);
        } else {
          ctx.fillStyle = '#ff6040';
          ctx.fillRect(-10, -10, 20, 20);
        }
        ctx.restore();
      }
    }
  }
}

// ==================== PROJECTILE ====================
class Projectile {
  constructor(x, y, vx, vy, damage, range, pierce, critChance, critMult, color, sprite, size, weaponId) {
    this.hitEnemies = new Set();
    this.reset(x, y, vx, vy, damage, range, pierce, critChance, critMult, color, sprite, size, weaponId);
  }

  // Reinitialize all fields for pool reuse (avoids GC from new allocations)
  reset(x, y, vx, vy, damage, range, pierce, critChance, critMult, color, sprite, size, weaponId) {
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
    if (this.hitEnemies) this.hitEnemies.clear(); else this.hitEnemies = new Set();
    this.angle = Math.atan2(vy, vx);
    this.life = 3.0;
  }

  update(dt) {
    this.life -= dt;
    if (this.life <= 0) { this.alive = false; return; }

    if (this.homing) {
      let target = null;
      let minD = 250;
      for (const e of Game.enemyGrid.query(this.x, this.y, 250)) {
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
    for (const e of Game.enemyGrid.query(this.x, this.y, 80)) {
      if (!e.alive || this.hitEnemies.has(e.id)) continue;
      const d = dist(this.x, this.y, e.x, e.y);
      if (d < e.radius + this.size * 0.5) {
        this.hitEnemies.add(e.id);
        let dmg = this.damage;
        let isCrit = Math.random() < this.critChance;
        if (isCrit) dmg *= this.critMult;
        e.takeDamage(dmg, isCrit, 0, this.x, this.y);
        // lifesteal
        if (Game.player.stats.lifesteal > 0) {
          Game.player.heal(dmg * Game.player.stats.lifesteal);
        }

        // splash
        if (this.splash > 0) {
          for (const e2 of Game.enemyGrid.query(this.x, this.y, this.splash)) {
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
            Game.particles.push(Game.particlePool.obtain(this.x, this.y, Math.cos(a)*s, Math.sin(a)*s, this.color, 0.3, 3));
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
    this.reset(x, y, vx, vy, damage, color, range);
  }

  // Reinitialize all fields for pool reuse
  reset(x, y, vx, vy, damage, color, range) {
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

    const player = Game.player;

    // Shield block: check if any shield weapon orbit position intercepts the projectile
    const shieldWeapons = player.weapons.filter(w => w.id === 'shield');
    for (const sw of shieldWeapons) {
      const range = sw.getRange();
      const count = 1 + player.stats.weaponCountBonus;
      for (let i = 0; i < count; i++) {
        const offset = (i / count) * TAU;
        const wx = player.x + Math.cos(sw.angle + offset) * range;
        const wy = player.y + Math.sin(sw.angle + offset) * range;
        if (dist(this.x, this.y, wx, wy) < 22 + this.radius) {
          // blocked! destroy projectile, spawn spark particles
          this.alive = false;
          for (let j = 0; j < 5; j++) {
            const ang = Math.random() * TAU;
            const spd = rand(40, 100);
            Game.particles.push(Game.particlePool.obtain(this.x, this.y, Math.cos(ang)*spd, Math.sin(ang)*spd, '#7896c8', rand(0.2, 0.4), rand(2, 3)));
          }
          Audio2.play('sine', 600, 0.05, 0.04);
          return;
        }
      }
    }

    const d = dist(this.x, this.y, player.x, player.y);
    if (d < this.radius + 14) {
      player.takeDamage(this.damage);
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
    this.reset(x, y, type, sprite, value);
  }

  // Reinitialize all fields for pool reuse
  reset(x, y, type, sprite, value) {
    this.x = x; this.y = y;
    this.type = type; // 'xp', 'heart', 'chest'
    this.sprite = sprite;
    this.value = value || 0;
    this.alive = true;
    this.bob = Math.random() * TAU;
    this.life = 30;
    this.magnetized = false;
    // initial scatter
    const ang = Math.random() * TAU;
    this.vx = Math.cos(ang) * 40;
    this.vy = Math.sin(ang) * 40;
    this.tremble = 0;
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

    // magnet (chests are not magnetized)
    if (this.type !== 'chest' && (d < CONFIG.PLAYER.pickupRadius + player.stats.pickupRangeBonus || this.magnetized)) {
      this.magnetized = true;
      const ang = angleTo(this.x, this.y, player.x, player.y);
      // pickupRangeBonus can magnetize gems outside the base radius; never let
      // that turn the attraction velocity negative.
      const speed = Math.max(80, 200 + (CONFIG.PLAYER.pickupRadius - d) * 4);
      this.vx = Math.cos(ang) * speed;
      this.vy = Math.sin(ang) * speed;
    }

    // suspicious chest: tremble when player is near
    if (this.type === 'chest' && this.value === 2) {
      this.tremble = d < 100 ? (100 - d) / 100 : 0;
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
      // pickup flash: green sparkles
      for (let i = 0; i < 4; i++) {
        const ang = Math.random() * TAU;
        const spd = rand(40, 90);
        Game.particles.push(Game.particlePool.obtain(this.x, this.y, Math.cos(ang) * spd, Math.sin(ang) * spd, '#80ff80', rand(0.2, 0.4), rand(1.5, 3)));
      }
      if (leveled) {
        Game.onLevelUp();
      }
    } else if (this.type === 'heart') {
      Game.player.heal(20);
      Audio2.pickup();
      Game.addMessage('+20 生命', '#40ff40');
    } else if (this.type === 'chest') {
      Game.openChest(this.x, this.y, this.value);
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
      // chest types: 0=normal, 1=rare(golden glow), 2=suspicious(purple, trembles)
      const isRare = this.value === 1;
      const isSuspicious = this.value === 2;
      // glow for rare/suspicious
      if (isRare) {
        ctx.fillStyle = 'rgba(255,200,60,0.25)';
        ctx.beginPath();
        ctx.arc(this.x, this.y + bobY, 22, 0, TAU);
        ctx.fill();
      } else if (isSuspicious) {
        ctx.fillStyle = 'rgba(160,60,200,0.2)';
        ctx.beginPath();
        ctx.arc(this.x, this.y + bobY, 20, 0, TAU);
        ctx.fill();
      }
      // tremble offset for suspicious chest when player near
      let tx = 0, ty = 0;
      if (isSuspicious && this.tremble > 0) {
        tx = rand(-2, 2) * this.tremble;
        ty = rand(-2, 2) * this.tremble;
      }
      Assets.drawCentered(ctx, 'items/chest', this.x + tx, this.y + bobY + ty, 1, 0, 1);
      // rare chest: golden tint overlay
      if (isRare) {
        ctx.globalCompositeOperation = 'source-atop';
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#ffd040';
        const img = Assets.get('items/chest');
        const sz = img ? img.width : 32;
        ctx.fillRect(this.x + tx - sz/2, this.y + bobY + ty - sz/2, sz, sz);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
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
    this.reset(x, y, vx, vy, color, life, size);
  }

  // Reinitialize all fields for pool reuse (avoids GC from new allocations)
  reset(x, y, vx, vy, color, life, size) {
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
    this.reset(x, y, value, color, isCrit);
  }

  // Reinitialize all fields for pool reuse
  reset(x, y, value, color, isCrit) {
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
