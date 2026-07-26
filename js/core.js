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
  },
  // Dash button state
  dashButton: {
    active: false,
    touchId: null,
    cx: 0, cy: 0,
    radius: 40,
    pressed: false,     // just pressed this frame
  },
  // Track if any touch is on UI elements (don't trigger joystick)
  _touchIsUI: false,

  init(canvas) {
    this.canvas = canvas;
    window.addEventListener('keydown', (e) => {
      if (!this.keys[e.code]) this._justPressed[e.code] = true;
      this.keys[e.code] = true;
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const sx = canvas.width / rect.width;
      const sy = canvas.height / rect.height;
      this.mouse.x = (e.clientX - rect.left) * sx;
      this.mouse.y = (e.clientY - rect.top) * sy;
    });
    canvas.addEventListener('mousedown', (e) => {
      this.mouse.down = true;
      this.mouse.clicked = true;
    });
    canvas.addEventListener('mouseup', (e) => { this.mouse.down = false; });

    // ---- Touch events for mobile ----
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const sx = canvas.width / rect.width;
      const sy = canvas.height / rect.height;

      for (const touch of e.changedTouches) {
        const tx = (touch.clientX - rect.left) * sx;
        const ty = (touch.clientY - rect.top) * sy;

        // Check if touch is on a UI button area (top half of screen = UI clicks)
        // For menu/pause/upgrade screens, treat as mouse click
        if (Game.state !== 'playing') {
          this.mouse.x = tx;
          this.mouse.y = ty;
          this.mouse.clicked = true;
          this.mouse.down = true;
          continue;
        }

        // In playing state: check pause button first, then left side = joystick, right-bottom = dash
        // Pause button at (CANVAS_W - 30, 60), size ~24
        if (tx >= CONFIG.CANVAS_W - 50 && tx <= CONFIG.CANVAS_W - 10 && ty >= 40 && ty <= 80) {
          this._justPressed['Escape'] = true;
          this.keys['Escape'] = true;
          continue;
        }

        if (tx < CONFIG.CANVAS_W * 0.5 && !this.joystick.active) {
          // Start joystick
          this.joystick.active = true;
          this.joystick.touchId = touch.identifier;
          this.joystick.cx = tx;
          this.joystick.cy = ty;
          this.joystick.dx = 0;
          this.joystick.dy = 0;
        } else if (tx >= CONFIG.CANVAS_W * 0.5 && !this.dashButton.active) {
          // Dash button area (right side)
          this.dashButton.active = true;
          this.dashButton.touchId = touch.identifier;
          this.dashButton.cx = tx;
          this.dashButton.cy = ty;
          this.dashButton.pressed = true;
        }
      }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const sx = canvas.width / rect.width;
      const sy = canvas.height / rect.height;

      for (const touch of e.changedTouches) {
        const tx = (touch.clientX - rect.left) * sx;
        const ty = (touch.clientY - rect.top) * sy;

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

  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch(e) { this.enabled = false; }
  },

  resume() {
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
