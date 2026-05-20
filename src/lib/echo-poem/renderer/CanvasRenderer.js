// Site palette: Stormy Teal #15616D, Night Bordeaux #690C22,
//               Papaya Whip #FFECD1, Vivid Tangerine #FF7D00
// Previous colours (kept for reference):
//   phonetic:     [120, 152, 255]   (periwinkle blue)
//   semantic:     [255, 190, 80]    (amber)
//   etymological: [140, 220, 160]   (sage green)
//   pun:          [220, 130, 220]   (mauve)
const ANNOTATION_COLORS = {
  surprise: [255, 140, 60],  // warm orange
};

const TYPE_COLORS = {
  primary:      [255, 255, 255],
  phonetic:     [120, 152, 255],  // periwinkle blue
  semantic:     [255, 190,  80],  // amber
  both:         [140, 220, 160],  // sage green — same word (phonetic + semantic)
  etymological: [140, 220, 160],  // sage green — historical/formal etymology
  pun:          [220, 130, 220],
};

export class CanvasRenderer {
  constructor({ canvasEl, textRenderer, echoEngine, controlsEl, annotations = [] }) {
    this.canvasEl = canvasEl;
    this.textRenderer = textRenderer;
    this.echoEngine = echoEngine;
    this._controlsEl = controlsEl || null;

    this.maxRadius = 40;
    this.growthDuration = 10000;
    this.ringGap = 7;  // fixed px between rings
    this.pulsePeriod = 3500;
    this.lineDuration = 4000;
    this.lineGrowDuration = 700; // ms to grow from source to target (live echoes)
    this.hoverLineDuration = 500; // ms for hover lines to grow from source to target

    this._rafId = null;
    this._currentTime = 0;
    this._dpr = 1;
    this._cssWidth = 0;
    this._cssHeight = 0;

    this._finalStateActive = false;
    this._finalCircles = null;
    this._hoverWordId = null;
    this._hoverStartTime = null;

    // Map<wordId, annotationType> for words with special annotations
    this._annotations = new Map();
    for (const a of annotations) {
      this._annotations.set(a.wordId, a.type);
    }
  }

  resize() {
    const root = this.canvasEl.parentElement;
    if (!root) return;

    const rect = root.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    this._dpr = dpr;
    this._cssWidth = rect.width;
    this._cssHeight = rect.height;

    this.canvasEl.width = rect.width * dpr;
    this.canvasEl.height = rect.height * dpr;
    this.canvasEl.style.width = rect.width + 'px';
    this.canvasEl.style.height = rect.height + 'px';

    const ctx = this.canvasEl.getContext('2d');
    ctx.scale(dpr, dpr);
  }

  setTime(t) {
    this._currentTime = t;
  }

  // Start the perpetual draw loop (idempotent).
  beginDraw() {
    if (this._rafId) return;
    this._rafId = requestAnimationFrame(this._draw.bind(this));
  }

  // Called on Play: switch to live-echo mode and ensure draw loop is running.
  start() {
    this._finalStateActive = false;
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._rafId = requestAnimationFrame(this._draw.bind(this));
  }

  // No-op: loop keeps running so rings keep pulsing when paused.
  stop() {}

  // Pre-compute and show fully-grown final circles (pre-play and post-play).
  showFinalState() {
    this._finalCircles = this.echoEngine.getFinalCircles();
    this._finalStateActive = true;
    this.beginDraw();
  }

  setHoverWord(wordId) {
    if (wordId !== this._hoverWordId) {
      this._hoverStartTime = performance.now();
    }
    this._hoverWordId = wordId;
  }

  clearHover() {
    this._hoverWordId = null;
    this._hoverStartTime = null;
  }

  // ── Master draw loop ────────────────────────────────────────────────────────

  _draw() {
    const ctx = this.canvasEl.getContext('2d');
    const now = performance.now();
    ctx.clearRect(0, 0, this._cssWidth, this._cssHeight);

    if (this._hoverWordId !== null) {
      this._renderHoverContent(ctx);
    } else if (this._finalStateActive) {
      this._drawFinalCircles(ctx, now);
    } else {
      this._drawLiveEchoes(ctx, now);
    }

    if (this._annotations.size > 0) {
      this._drawAnnotations(ctx, now);
    }

    this._rafId = requestAnimationFrame(this._draw.bind(this));
  }

  // Returns the gap to use between rings for n total rings.
  // Fixed ringGap for 5 or fewer; compressed to fit within the same min radius for more.
  _ringGapFor(n) {
    if (n <= 5) return this.ringGap;
    const minRadius = this.maxRadius - 4 * this.ringGap;
    return (this.maxRadius - minRadius) / (n - 1);
  }

  // ── Final state (pre-play / post-play) ──────────────────────────────────────

  _drawFinalCircles(ctx, now) {
    if (!this._finalCircles) return;
    for (const [wordId, connections] of this._finalCircles) {
      const { x, y } = this.textRenderer.getWordPosition(wordId);
      const gap = this._ringGapFor(connections.length);
      connections.forEach((conn, i) => {
        const [r, g, b] = TYPE_COLORS[conn.type] || TYPE_COLORS.primary;
        const radius = this.maxRadius - i * gap;
        const period = this.pulsePeriod * (0.85 + 0.3 * ((wordId * 0.618033) % 1));
        const phase = (wordId * 2.618 + i * 1.414) % (Math.PI * 2);
        const pulse = 0.12 * Math.sin(now / period * Math.PI * 2 + phase);
        const opacity = Math.max(0.30 + 0.35 * conn.strength + pulse, 0.05);
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${r},${g},${b},${opacity})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
    }
  }

  // ── Live playback ───────────────────────────────────────────────────────────

  _drawLiveEchoes(ctx, now) {
    const t = this._currentTime;

    for (const [wordId] of this.echoEngine.wordStates) {
      const echoes = this.echoEngine.getWordEchoes(wordId, t);
      if (echoes.length === 0) continue;

      const { x, y } = this.textRenderer.getWordPosition(wordId);

      // Connection lines — start drawing from when the word was spoken (before propagation delay)
      for (const echo of echoes) {
        if (echo.fromWordId === null) continue;
        const propDelay = this.echoEngine.config.propagationDelay;
        const lineStartTime = echo.time - propDelay; // when the spoken word fired
        const age = t - lineStartTime;
        if (age < 0 || age >= this.lineDuration) continue;
        const color = TYPE_COLORS[echo.type] || TYPE_COLORS.primary;
        const drawP = Math.min(age / this.lineGrowDuration, 1.0);
        const fadeP = Math.max(0, (age - this.lineGrowDuration) / (this.lineDuration - this.lineGrowDuration));
        const lineOpacity = echo.strength * drawP * Math.pow(1 - fadeP, 2) * 0.85;
        const fromPos = this.textRenderer.getWordPosition(echo.fromWordId);

        const fromEl = this.textRenderer.wordEls.get(echo.fromWordId);
        const toEl = this.textRenderer.wordEls.get(wordId);
        const sameRow = fromEl && toEl && fromEl.closest('.line') === toEl.closest('.line');

        ctx.beginPath();
        ctx.moveTo(fromPos.x, fromPos.y);
        if (sameRow) {
          const bow = Math.min(Math.abs(x - fromPos.x) * 0.35, 80);
          const ctrlX = (fromPos.x + x) / 2;
          const ctrlY = (fromPos.y + y) / 2 - bow;
          // De Casteljau split at drawP
          const q0x = fromPos.x + (ctrlX - fromPos.x) * drawP;
          const q0y = fromPos.y + (ctrlY - fromPos.y) * drawP;
          const q1x = ctrlX + (x - ctrlX) * drawP;
          const q1y = ctrlY + (y - ctrlY) * drawP;
          ctx.quadraticCurveTo(q0x, q0y, q0x + (q1x - q0x) * drawP, q0y + (q1y - q0y) * drawP);
        } else {
          ctx.lineTo(fromPos.x + (x - fromPos.x) * drawP, fromPos.y + (y - fromPos.y) * drawP);
        }
        ctx.strokeStyle = `rgba(${color[0]},${color[1]},${color[2]},${lineOpacity})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Rings — oldest first so they get the largest cap, newer rings nest inside
      const connEchoes = echoes
        .filter(r => r.type !== 'primary')
        .sort((a, b) => a.time - b.time);

      const totalN = this._finalCircles?.get(wordId)?.length ?? connEchoes.length;
      const liveGap = this._ringGapFor(totalN);
      connEchoes.forEach((echo, i) => {
        const age = t - echo.time;
        if (age < 0) return;
        const color = TYPE_COLORS[echo.type] || TYPE_COLORS.primary;
        const growP = age / this.growthDuration;
        const radius = (this.maxRadius - i * liveGap) * (1 - Math.exp(-growP * 4));
        if (radius < 1) return;
        const decay = Math.exp(-age / this.echoEngine.config.decayHalfLife);
        const period = this.pulsePeriod * (0.85 + 0.3 * ((wordId * 0.618033) % 1));
        const phase = (wordId * 2.618 + i * 1.414) % (Math.PI * 2);
        const pulse = 0.12 * Math.sin(now / period * Math.PI * 2 + phase);
        const opacity = Math.max(0.30 + decay * 0.40 + pulse, 0.05);
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${color[0]},${color[1]},${color[2]},${opacity})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      // Radial glow for high-energy words
      const energy = this.echoEngine.getWordEnergy(wordId, t);
      if (energy > 0.3) {
        let dominantEcho = echoes[0];
        for (const r of echoes) {
          if (r.strength > dominantEcho.strength) dominantEcho = r;
        }
        const gc = TYPE_COLORS[dominantEcho.type] || TYPE_COLORS.primary;
        const glowR = 32 * Math.min(energy / this.echoEngine.config.maxAmplitude, 1);
        const glowA = Math.min((energy - 0.3) * 0.32, 0.45);
        const grad = ctx.createRadialGradient(x, y, 0, x, y, glowR);
        grad.addColorStop(0, `rgba(${gc[0]},${gc[1]},${gc[2]},${glowA})`);
        grad.addColorStop(1, `rgba(${gc[0]},${gc[1]},${gc[2]},0)`);
        ctx.beginPath();
        ctx.arc(x, y, glowR, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }
    }
  }

  // ── Hover (connection lines + circles for origin and targets) ───────────────

  _renderHoverContent(ctx) {
    const wordId = this._hoverWordId;
    const connections = this.echoEngine.getConnections(wordId);
    if (connections.length === 0) return;

    const now = performance.now();
    const elapsed = this._hoverStartTime !== null ? now - this._hoverStartTime : Infinity;
    const progress = Math.min(elapsed / this.hoverLineDuration, 1.0);

    const fromPos = this.textRenderer.getWordPosition(wordId);

    const canvasRect = this.canvasEl.getBoundingClientRect();
    const controlsH = this._controlsEl ? this._controlsEl.getBoundingClientRect().height : 0;
    const vpTop = -canvasRect.top;
    const vpBottom = window.innerHeight - canvasRect.top - controlsH;
    const vpLeft = -canvasRect.left;
    const vpRight = window.innerWidth - canvasRect.left;

    // Circles for the hovered word itself (always visible)
    this._drawFinalCirclesForWord(ctx, wordId, now);

    for (const conn of connections) {
      const color = TYPE_COLORS[conn.type] || TYPE_COLORS.primary;
      const toPos = this.textRenderer.getWordPosition(conn.connectedWordId);
      const [r, g, b] = color;

      // Same-row connections get a catenary-like arc bowing above the line
      const fromEl = this.textRenderer.wordEls.get(wordId);
      const toEl = this.textRenderer.wordEls.get(conn.connectedWordId);
      const sameRow = fromEl && toEl && fromEl.closest('.line') === toEl.closest('.line');
      const bow = sameRow ? Math.min(Math.abs(toPos.x - fromPos.x) * 0.35, 80) : 0;
      const ctrlX = (fromPos.x + toPos.x) / 2;
      const ctrlY = (fromPos.y + toPos.y) / 2 - bow;

      ctx.beginPath();
      ctx.moveTo(fromPos.x, fromPos.y);
      if (sameRow) {
        // De Casteljau split: partial quadratic Bézier up to `progress`
        const q0x = fromPos.x + (ctrlX - fromPos.x) * progress;
        const q0y = fromPos.y + (ctrlY - fromPos.y) * progress;
        const q1x = ctrlX + (toPos.x - ctrlX) * progress;
        const q1y = ctrlY + (toPos.y - ctrlY) * progress;
        const endX = q0x + (q1x - q0x) * progress;
        const endY = q0y + (q1y - q0y) * progress;
        ctx.quadraticCurveTo(q0x, q0y, endX, endY);
      } else {
        ctx.lineTo(
          fromPos.x + (toPos.x - fromPos.x) * progress,
          fromPos.y + (toPos.y - fromPos.y) * progress,
        );
      }
      ctx.strokeStyle = `rgba(${r},${g},${b},${conn.strength * 0.6})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      const inViewport =
        toPos.y >= vpTop && toPos.y <= vpBottom &&
        toPos.x >= vpLeft && toPos.x <= vpRight;

      if (!inViewport) {
        // Compute the fraction at which the line reaches the viewport edge
        const edge = this._viewportEdgePoint(fromPos, toPos, vpTop, vpBottom, vpLeft, vpRight);
        if (edge) {
          const dx = toPos.x - fromPos.x, dy = toPos.y - fromPos.y;
          const ex = edge.x - fromPos.x, ey = edge.y - fromPos.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const tEdge = Math.sqrt(ex * ex + ey * ey) / dist;
          if (progress >= tEdge) {
            const wordEl = this.textRenderer.wordEls.get(conn.connectedWordId);
            const text = wordEl ? wordEl.textContent.trim() : '';
            this._drawGhostLabel(ctx, edge, fromPos, toPos, text, color, conn.strength);
          }
        }
      } else {
        // Only the specific ring for this connection appears once the line reaches it
        if (progress >= 1.0) {
          this._drawSingleCircle(ctx, conn.connectedWordId, conn.type, conn.strength, now);
        }
      }
    }
  }

  _drawFinalCirclesForWord(ctx, wordId, now) {
    if (!this._finalCircles) return;
    const conns = this._finalCircles.get(wordId);
    if (!conns) return;
    const { x, y } = this.textRenderer.getWordPosition(wordId);
    const gap = this._ringGapFor(conns.length);
    conns.forEach((conn, i) => {
      const [r, g, b] = TYPE_COLORS[conn.type] || TYPE_COLORS.primary;
      const radius = this.maxRadius - i * gap;
      const period = this.pulsePeriod * (0.85 + 0.3 * ((wordId * 0.618033) % 1));
      const phase = (wordId * 2.618 + i * 1.414) % (Math.PI * 2);
      const pulse = 0.12 * Math.sin(now / period * Math.PI * 2 + phase);
      const opacity = Math.max(0.30 + 0.35 * conn.strength + pulse, 0.05);
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${r},${g},${b},${opacity})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  }

  _drawSingleCircle(ctx, wordId, type, strength, now) {
    const { x, y } = this.textRenderer.getWordPosition(wordId);
    const [r, g, b] = TYPE_COLORS[type] || TYPE_COLORS.primary;
    const period = this.pulsePeriod * (0.85 + 0.3 * ((wordId * 0.618033) % 1));
    const phase = (wordId * 2.618) % (Math.PI * 2);
    const pulse = 0.12 * Math.sin(now / period * Math.PI * 2 + phase);
    const opacity = Math.max(0.30 + 0.35 * strength + pulse, 0.05);
    ctx.beginPath();
    ctx.arc(x, y, this.maxRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${r},${g},${b},${opacity})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // ── Annotations (surprise etc.) — always drawn on top ───────────────────────

  _drawAnnotations(ctx, now) {
    const canvasRect = this.canvasEl.getBoundingClientRect();

    for (const [wordId, type] of this._annotations) {
      // Show in final state (pre/post-play), or once the word has been spoken during playback
      const state = this.echoEngine.wordStates.get(wordId);
      const hasBeenSpoken = state && state.echoes.length > 0;
      if (!this._finalStateActive && !hasBeenSpoken) continue;

      const color = ANNOTATION_COLORS[type];
      if (!color) continue;

      const el = this.textRenderer.wordEls.get(wordId);
      if (!el) continue;
      const wordRect = el.getBoundingClientRect();
      const x = wordRect.right - canvasRect.left - 4;
      const y = wordRect.top - canvasRect.top + (wordRect.bottom - wordRect.top) * 0.4;

      const [r, g, b] = color;
      ctx.font = "bold 16px 'Jost', sans-serif";
      ctx.fillStyle = `rgba(${r},${g},${b},0.95)`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText('!', x, y);
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  _viewportEdgePoint(from, to, vpTop, vpBottom, vpLeft, vpRight) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    let tBest = Infinity;
    let best = null;

    const tryT = (t, x, y) => {
      if (t > 0.001 && t < tBest &&
          x >= vpLeft - 0.5 && x <= vpRight + 0.5 &&
          y >= vpTop - 0.5 && y <= vpBottom + 0.5) {
        tBest = t;
        best = { x, y };
      }
    };

    if (Math.abs(dy) > 0.001) {
      const tTop = (vpTop - from.y) / dy;
      tryT(tTop, from.x + tTop * dx, vpTop);
      const tBottom = (vpBottom - from.y) / dy;
      tryT(tBottom, from.x + tBottom * dx, vpBottom);
    }
    if (Math.abs(dx) > 0.001) {
      const tLeft = (vpLeft - from.x) / dx;
      tryT(tLeft, vpLeft, from.y + tLeft * dy);
      const tRight = (vpRight - from.x) / dx;
      tryT(tRight, vpRight, from.y + tRight * dy);
    }
    return best;
  }

  _drawGhostLabel(ctx, edge, fromPos, toPos, text, color, strength) {
    if (!text) return;
    const [r, g, b] = color;
    const alpha = strength * 0.55;

    const dx = fromPos.x - toPos.x;
    const dy = fromPos.y - toPos.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = dx / len;
    const ny = dy / len;

    ctx.beginPath();
    ctx.arc(edge.x, edge.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
    ctx.fill();

    const lx = edge.x + nx * 30;
    const ly = edge.y + ny * 14;

    ctx.font = "italic 17px 'IM Fell English', Georgia, serif";
    ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, lx, ly);
  }
}
