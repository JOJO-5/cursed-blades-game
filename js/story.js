// ============================================================
// story.js — Story/dialogue UI rendering (separated from game.js)
// Renders the dialogue box overlay during story sequences.
// Data lives in CONFIG.STORY; this module only handles presentation.
// ============================================================

const StoryUI = {
  // Colors and layout constants — tweak here without touching game logic
  COLORS: {
    overlay:    'rgba(0,0,0,0.75)',
    boxBg:      'rgba(20,15,10,0.95)',
    boxBorder:  '#4a3a20',
    speaker:    '#c4a87a',
    text:       '#e0d0b0',
    skipHint:   '#5a4a30',
  },
  // Typewriter speed (characters per second)
  TYPE_SPEED: 40,
  // Dialogue box geometry offsets from bottom of visible area
  BOX_HEIGHT: 140,
  BOX_OFFSET_FROM_BOTTOM: 180,
  BOX_PADDING: 10,

  // Wrap text to fit within maxW, drawing each line at lineH intervals.
  // Kept here so story rendering is fully self-contained.
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

  // Main render entry point — called by Game.renderStory()
  // @param game  The Game object (provides ctx, storyLines, storyIndex, storyTimer, getVisibleCanvasRect)
  render(game) {
    const ctx = game.ctx;
    const C = this.COLORS;

    // Full-screen dark overlay
    ctx.fillStyle = C.overlay;
    ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);

    const line = game.storyLines[game.storyIndex];
    if (!line) return;

    // Position dialogue box within the visible canvas area (handles cover-crop)
    const visible = game.getVisibleCanvasRect();
    const boxX = visible.x + this.BOX_PADDING;
    const boxW = visible.w - this.BOX_PADDING * 2;
    const boxY = visible.y + visible.h - this.BOX_OFFSET_FROM_BOTTOM;
    const boxH = this.BOX_HEIGHT;

    // Box background and border
    ctx.fillStyle = C.boxBg;
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = C.boxBorder;
    ctx.lineWidth = 3;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    // Speaker name
    ctx.fillStyle = C.speaker;
    ctx.font = 'bold 16px Courier New';
    ctx.textAlign = 'left';
    ctx.fillText('【' + line.speaker + '】', boxX + 15, boxY + 30);

    // Dialogue text with typewriter effect
    ctx.fillStyle = C.text;
    ctx.font = '15px Courier New';
    const maxChars = Math.floor(game.storyTimer * this.TYPE_SPEED);
    const displayText = line.text.substring(0, Math.min(line.text.length, maxChars));
    this.drawTextWrapped(ctx, displayText, boxX + 15, boxY + 60, boxW - 30, 22);

    // Skip / continue indicator (only after initial delay)
    if (game.storyTimer > 0.3) {
      ctx.fillStyle = C.skipHint;
      ctx.font = '11px Courier New';
      ctx.textAlign = 'right';
      const isLast = game.storyIndex >= game.storyLines.length - 1;
      ctx.fillText(isLast ? '点击/空格 结束 →' : '点击/空格 继续 →', boxX + boxW - 15, boxY + boxH - 15);
    }
  },
};
