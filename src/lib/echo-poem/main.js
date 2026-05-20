import { EchoEngine } from './engine/EchoEngine.js';
import { TimerSync } from './engine/TimerSync.js';
import { YouTubeSync } from './engine/YouTubeSync.js';
import { TextRenderer } from './renderer/TextRenderer.js';
import { CanvasRenderer } from './renderer/CanvasRenderer.js';
import { Controls } from './ui/Controls.js';

function _loadYouTubeAPI() {
  if (window.YT?.Player) return Promise.resolve();
  if (window._ytLoadPromise) return window._ytLoadPromise;
  window._ytLoadPromise = new Promise(resolve => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { if (prev) prev(); resolve(); };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  });
  return window._ytLoadPromise;
}

function _createYTPlayer(el, videoId, startSec = 0) {
  return new Promise((resolve, reject) => {
    new window.YT.Player(el, {
      videoId,
      playerVars: { autoplay: 0, controls: 0, rel: 0, start: Math.floor(startSec) },
      events: {
        onReady: e => resolve(e.target),
        onError: () => reject(new Error('Video unavailable')),
      },
    });
  });
}

export function initAll() {
  const roots = document.querySelectorAll('.echo-poem-root:not([data-initialized])');
  for (const root of roots) {
    root.dataset.initialized = 'true';
    const instanceId = root.dataset.instanceId;
    const dataEl = root.querySelector(`script[data-echo-data="${instanceId}"]`);
    if (!dataEl) continue;

    let poem;
    try {
      poem = JSON.parse(dataEl.textContent);
    } catch (e) {
      console.error('[echo-poem] Failed to parse poem data:', e);
      continue;
    }

    _initInstance(root, poem);
  }
}

async function _initInstance(root, poem) {
  const containerEl = root.querySelector('.sonnet-container');
  const canvasEl = root.querySelector('.echo-canvas');
  // controls-bar is a sibling of root (not a child) so position:fixed has no problematic ancestor
  const controlsEl = root.nextElementSibling?.classList.contains('controls-bar')
    ? root.nextElementSibling
    : null;
  if (!containerEl || !canvasEl || !controlsEl) return;

  // Build DOM
  const textRenderer = new TextRenderer({
    containerEl,
    canvasEl,
    words: poem.words,
    lines: poem.lines,
    stanzaBreaks: poem.stanzaBreaks || [],
  });
  textRenderer.render();

  // Engine
  const engine = new EchoEngine({
    words: poem.words,
    connections: poem.connections,
    timestamps: poem.timestamps_ms,
  });

  // Pre-compute the fully-accumulated final state (all connections, both directions)
  const finalCircles = engine.getFinalCircles();
  const finalEnergies = new Map();
  for (const [wordId, conns] of finalCircles) {
    finalEnergies.set(wordId, Math.min(conns.reduce((s, c) => s + c.strength, 0) * 0.4, 1.0));
  }

  // Hoisted so onEnd closure can reference it before Controls is created
  let controls;

  // Track scroll state to avoid re-scrolling the same line
  let lastActiveWordId = null;
  let lastActiveLine = null;

  // Coast mode: after poem ends, keep time advancing via wall clock so echoes finish growing
  let coastFrozenTime = null;
  let coastStartWall = null;
  function getEffectiveTime() {
    if (timerSync.playing) return timerSync.currentTime;
    if (coastFrozenTime !== null) return coastFrozenTime + (performance.now() - coastStartWall);
    return timerSync.currentTime;
  }

  // Guard against ResizeObserver restoring final state mid-playback
  let playbackStarted = false;

  // Timer — YouTube-backed if youtubeId present, otherwise internal rAF clock
  let timerSync;
  if (poem.youtubeId) {
    const loadingEl = document.createElement('div');
    loadingEl.className = 'controls-loading';
    loadingEl.textContent = 'Loading audio…';
    controlsEl.appendChild(loadingEl);

    await _loadYouTubeAPI();
    const ytEl = root.querySelector('.yt-player');
    let ytPlayer;
    try {
      ytPlayer = await _createYTPlayer(ytEl, poem.youtubeId, (poem.audioStartOffset ?? 0) / 1000);
    } catch {
      controlsEl.style.display = 'none';
      return;
    }
    loadingEl.remove();

    timerSync = new YouTubeSync({
      player: ytPlayer,
      startOffset: poem.audioStartOffset ?? 0,
      timestamps: poem.timestamps_ms,
      onWordStart: (wordId) => { engine.triggerWord(wordId, timerSync.currentTime); },
      onWordEnd: () => {},
      onEnd: () => {
        controls.resetToPlay();
        coastFrozenTime = timerSync.currentTime;
        coastStartWall = performance.now();
        lastActiveWordId = null;
        lastActiveLine = null;
      },
    });
  } else {
    timerSync = new TimerSync({
      timestamps: poem.timestamps_ms,
      onWordStart: (wordId) => { engine.triggerWord(wordId, timerSync.currentTime); },
      onWordEnd: () => {},
      onEnd: () => {
        controls.resetToPlay();
        coastFrozenTime = timerSync.currentTime;
        coastStartWall = performance.now();
        lastActiveWordId = null;
        lastActiveLine = null;
      },
    });
  }

  // Canvas renderer
  const canvasRenderer = new CanvasRenderer({
    canvasEl,
    textRenderer,
    echoEngine: engine,
    controlsEl,
    annotations: poem.annotations || [],
  });

  // Text update loop — runs continuously for smooth decay animation
  function updateLoop() {
    const t = getEffectiveTime();
    canvasRenderer.setTime(t);
    const activeWordId = timerSync.currentActiveWordId;
    // Use live energies while playing or post-poem; final state energies only before playback starts
    const energies = t > 0 ? engine.getAllEnergies(t) : finalEnergies;
    textRenderer.update(energies, activeWordId);

    // Scroll current line to viewport center when the line changes
    if (activeWordId !== lastActiveWordId) {
      lastActiveWordId = activeWordId;
      if (activeWordId !== null) {
        const el = textRenderer.wordEls.get(activeWordId);
        if (el) {
          const lineEl = el.closest('.line');
          const lineKey = lineEl ? lineEl.dataset.line : null;
          if (lineKey !== lastActiveLine) {
            lastActiveLine = lineKey;
            lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }
    }

    requestAnimationFrame(updateLoop);
  }

  // Wait for fonts before first resize so layout is stable
  document.fonts.ready.then(() => {
    canvasRenderer.resize();
    canvasRenderer.showFinalState();
    textRenderer.update(finalEnergies, null);
    requestAnimationFrame(updateLoop);
  });

  // Keep canvas sized to root on resize; restore final state only before playback starts
  const resizeObserver = new ResizeObserver(() => {
    canvasRenderer.resize();
    if (!playbackStarted) {
      canvasRenderer.showFinalState();
    }
  });
  resizeObserver.observe(root);

  // Hover: show connection lines (circles hidden) when not playing.
  // Circles restore when mouse leaves the entire poem container.
  for (const [wordId, el] of textRenderer.wordEls) {
    el.addEventListener('mouseenter', () => {
      if (!timerSync.playing) canvasRenderer.setHoverWord(wordId);
    });
  }
  containerEl.addEventListener('mouseleave', () => {
    canvasRenderer.clearHover();
  });

  // Controls
  controls = new Controls({
    containerEl: controlsEl,
    onPlay: () => {
      canvasRenderer.clearHover();
      if (timerSync.isFinished) {
        engine.reset();
        timerSync.restart();
        coastFrozenTime = null;
        coastStartWall = null;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      playbackStarted = true;
      timerSync.play();
      canvasRenderer.start();
    },
    onPause: () => {
      timerSync.pause();
      // Canvas keeps drawing so rings keep pulsing while paused
    },
    onRestart: () => {
      engine.reset();
      timerSync.restart();
      coastFrozenTime = null;
      coastStartWall = null;
      playbackStarted = false;
      canvasRenderer.showFinalState();
      lastActiveWordId = null;
      lastActiveLine = null;
    },
    onSpeedChange: (rate) => {
      timerSync.playbackRate = rate;
    },
  });
}
