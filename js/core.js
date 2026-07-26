// ============================================================
// core.js — Engine core: math, input, asset loader, audio
// ============================================================

// ---- Math utilities ----
const TAU = Math.PI * 2;
function clamp(v, mn, mx) { return v < mn ? mn : v > mx ? mx : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function dist(ax, ay, bx, by) { const dx = bx-ax, dy = by-ay; return Math.sqrt(dx*dx + dy*dy); }
function dist2(ax, ay, bx, by) { const dx = bx-ax, dy = by-ay; return dx*dx + dy*dy; }
function angleTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }
function rand(min, max) { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pickN(arr, n) {
  const copy = arr.slice();
  const result = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}
// Fisher-Yates shuffle (in-place)
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  return arr;
}
// normalize angle to [-PI, PI]
function normalizeAngle(a) {
  while (a > Math.PI) a -= TAU;
  while (a < -Math.PI) a += TAU;
  return a;
}

// ---- Input manager ----
const Input = {
  keys: {},
  mouse: { x: 0, y: 0, down: false, clicked: false },
  _justPressed: {},

  // Virtual joystick state
  joystick: {
    active: false,
    touchId: null,
    cx: 0, cy: 0,       // center position (where touch started)
    dx: 0, dy: 0,       // delta from center (normalized -1..1)
    radius: 60,         // max drag radius
    // fixed anchor position (set by Game based on portrait/landscape)
    anchorX: 110, anchorY: 0,  // updated by Game.resizeCanvas
  },
  // Dash button state
  dashButton: {
    active: false,
    touchId: null,
    cx: 0, cy: 0,
    radius: 42,
    pressed: false,     // just pressed this frame
    // fixed anchor position (set by Game based on portrait/landscape)
    anchorX: 0, anchorY: 0,  // updated by Game.resizeCanvas
  },
  // Track if any touch is on UI elements (don't trigger joystick)
  _touchIsUI: false,

  init(canvas) {
    this.canvas = canvas;
    window.addEventListener('keydown', (e) => {
      Audio2.resume();
      if (!this.keys[e.code]) this._justPressed[e.code] = true;
      this.keys[e.code] = true;
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });

    canvas.addEventListener('mousemove', (e) => {
      const pos = this.screenToCanvas(e.clientX, e.clientY);
      this.mouse.x = pos.x;
      this.mouse.y = pos.y;
    });
    canvas.addEventListener('mousedown', (e) => {
      Audio2.resume();
      this.mouse.down = true;
      this.mouse.clicked = true;
    });
    canvas.addEventListener('mouseup', (e) => { this.mouse.down = false; });

    // ---- Touch events for mobile ----
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      Audio2.resume();

      for (const touch of e.changedTouches) {
        const pos = this.screenToCanvas(touch.clientX, touch.clientY);
        const tx = pos.x;
        const ty = pos.y;

        // Check rotate button first (works in all states and cropped views).
        const rotate = Game.getRotateButtonRect();
        if (tx >= rotate.x && tx <= rotate.x + rotate.w && ty >= rotate.y && ty <= rotate.y + rotate.h) {
          // Let Game.update() handle via mouse click for consistency
          this.mouse.x = tx;
          this.mouse.y = ty;
          this.mouse.clicked = true;
          this.mouse.down = true;
          continue;
        }

        // For menu/pause/upgrade screens, treat as mouse click
        if (Game.state !== 'playing') {
          this.mouse.x = tx;
          this.mouse.y = ty;
          this.mouse.clicked = true;
          this.mouse.down = true;
          continue;
        }

        // In playing state: check pause button first, then left side = joystick, right-bottom = dash
        const pause = Game.getPauseButtonRect();
        if (tx >= pause.x && tx <= pause.x + pause.w && ty >= pause.y && ty <= pause.y + pause.h) {
          this._justPressed['Escape'] = true;
          this.keys['Escape'] = true;
          continue;
        }

        if (tx < CONFIG.CANVAS_W * 0.5 && !this.joystick.active) {
          // Start joystick at fixed anchor position
          this.joystick.active = true;
          this.joystick.touchId = touch.identifier;
          this.joystick.cx = this.joystick.anchorX;
          this.joystick.cy = this.joystick.anchorY;
          this.joystick.dx = 0;
          this.joystick.dy = 0;
        } else if (tx >= CONFIG.CANVAS_W * 0.5 && !this.dashButton.active) {
          // Dash button at fixed anchor position
          this.dashButton.active = true;
          this.dashButton.touchId = touch.identifier;
          this.dashButton.cx = this.dashButton.anchorX;
          this.dashButton.cy = this.dashButton.anchorY;
          this.dashButton.pressed = true;
        }
      }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();

      for (const touch of e.changedTouches) {
        const pos = this.screenToCanvas(touch.clientX, touch.clientY);
        const tx = pos.x;
        const ty = pos.y;

        if (touch.identifier === this.joystick.touchId) {
          let dx = tx - this.joystick.cx;
          let dy = ty - this.joystick.cy;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist > this.joystick.radius) {
            dx = (dx / dist) * this.joystick.radius;
            dy = (dy / dist) * this.joystick.radius;
          }
          this.joystick.dx = dx / this.joystick.radius;
          this.joystick.dy = dy / this.joystick.radius;
        }
      }
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      for (const touch of e.changedTouches) {
        if (touch.identifier === this.joystick.touchId) {
          this.joystick.active = false;
          this.joystick.touchId = null;
          this.joystick.dx = 0;
          this.joystick.dy = 0;
        }
        if (touch.identifier === this.dashButton.touchId) {
          this.dashButton.active = false;
          this.dashButton.touchId = null;
        }
      }
      // If no more touches, release mouse
      if (e.touches.length === 0) {
        this.mouse.down = false;
      }
    }, { passive: false });

    canvas.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      this.joystick.active = false;
      this.joystick.touchId = null;
      this.joystick.dx = 0;
      this.joystick.dy = 0;
      this.dashButton.active = false;
      this.dashButton.touchId = null;
      this.mouse.down = false;
    }, { passive: false });
  },

  isDown(code) { return !!this.keys[code]; },
  wasPressed(code) { return !!this._justPressed[code]; },

  // Transform screen (client) coordinates to canvas internal coordinates.
  // Handles CSS scaling and optional 90° rotation (forced landscape on portrait screens).
  screenToCanvas(screenX, screenY) {
    const rect = this.canvas.getBoundingClientRect();

    // If canvas is rotated 90 degrees clockwise, transform coordinates.
    // After rotate(90deg): rect.width = canvas CSS height, rect.height = canvas CSS width.
    // Screen Y → canvas X, Screen X → canvas Y (reversed, right-to-left).
    if (Game && Game._rotate90) {
      const sx = this.canvas.width / rect.height;   // canvas X range / visible height
      const sy = this.canvas.height / rect.width;    // canvas Y range / visible width
      const x = (screenY - rect.top) * sx;
      const y = this.canvas.height - (screenX - rect.left) * sy;
      return { x, y };
    }

    // Normal (no rotation)
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (screenX - rect.left) * scaleX;
    const y = (screenY - rect.top) * scaleY;
    return { x, y };
  },

  isMouseInRect(x, y, w, h) {
    return this.mouse.x >= x && this.mouse.x <= x+w && this.mouse.y >= y && this.mouse.y <= y+h;
  },
  consumeClick(x, y, w, h) {
    if (this.mouse.clicked && this.isMouseInRect(x, y, w, h)) {
      this.mouse.clicked = false;
      return true;
    }
    return false;
  },

  clearFrame() {
    this._justPressed = {};
    this.mouse.clicked = false;
    this.dashButton.pressed = false;
  }
};

// ---- Asset loader ----
const Assets = {
  images: {},
  loaded: 0,
  total: 0,
  onProgress: null,

  loadList(manifest) {
    return new Promise((resolve) => {
      const keys = Object.keys(manifest);
      this.total = keys.length;
      this.loaded = 0;
      if (this.total === 0) { resolve(); return; }
      for (const key of keys) {
        const path = 'assets/' + key + '.png';
        const img = new Image();
        img.onload = () => {
          this.loaded++;
          if (this.onProgress) this.onProgress(this.loaded, this.total);
          if (this.loaded >= this.total) resolve();
        };
        img.onerror = () => {
          console.warn('Failed to load: ' + path);
          this.loaded++;
          if (this.onProgress) this.onProgress(this.loaded, this.total);
          if (this.loaded >= this.total) resolve();
        };
        img.src = path;
        this.images[key] = img;
      }
    });
  },

  get(key) { return this.images[key]; },

  draw(ctx, key, x, y, scale, rotation, alpha) {
    const img = this.images[key];
    if (!img || !img.complete) return;
    scale = scale || 1;
    alpha = alpha !== undefined ? alpha : 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    if (rotation) ctx.rotate(rotation);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, -w/2, -h/2, w, h);
    ctx.restore();
  },

  drawCentered(ctx, key, cx, cy, scale, rotation, alpha) {
    this.draw(ctx, key, cx, cy, scale, rotation, alpha);
  },
};

// ---- Audio (simple WebAudio beeps/tones) ----
const Audio2 = {
  ctx: null,
  enabled: true,
  hasUserInteracted: false,

  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.hasUserInteracted) this.resume();
    } catch(e) { this.enabled = false; }
  },

  resume() {
    this.hasUserInteracted = true;
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },

  play(type, freq, duration, volume) {
    if (!this.enabled || !this.ctx) return;
    volume = volume || 0.1;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.value = freq || 440;
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + (duration || 0.1));
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + (duration || 0.1));
  },

  hit()    { this.play('square', 200, 0.05, 0.06); },
  hurt()   { this.play('sawtooth', 150, 0.15, 0.1); },
  pickup() { this.play('sine', 800, 0.08, 0.08); this.play('sine', 1200, 0.06, 0.05); },
  levelup(){ this.play('sine', 523, 0.1, 0.1); setTimeout(()=>this.play('sine',659,0.1,0.1),80); setTimeout(()=>this.play('sine',784,0.15,0.1),160); },
  death()  { this.play('sawtooth', 100, 0.3, 0.12); },
  boss()   { this.play('sawtooth', 80, 0.5, 0.15); setTimeout(()=>this.play('sawtooth',60,0.5,0.12),200); },
  click()  { this.play('square', 600, 0.03, 0.05); },
  victory(){ [523,659,784,1047].forEach((f,i)=>setTimeout(()=>this.play('sine',f,0.2,0.1),i*120)); },
};

// ---- Random number generator (seeded, for map gen) ----
function makeRNG(seed) {
  let s = seed;
  return function() {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}
