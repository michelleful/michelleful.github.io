export class TextRenderer {
  constructor({ containerEl, canvasEl, words, lines, stanzaBreaks = [] }) {
    this.containerEl = containerEl;
    this.canvasEl = canvasEl;
    this.words = words;
    this.lines = lines;
    this.stanzaBreaks = new Set(stanzaBreaks);
    this.wordEls = new Map(); // wordId → <span>
  }

  render() {
    const sonnet = document.createElement('div');
    sonnet.className = 'sonnet';

    // Group words by line index
    const wordsByLine = new Map();
    for (const word of this.words) {
      if (!wordsByLine.has(word.line)) wordsByLine.set(word.line, []);
      wordsByLine.get(word.line).push(word);
    }

    for (let lineIdx = 0; lineIdx < this.lines.length; lineIdx++) {
      if (this.stanzaBreaks.has(lineIdx)) {
        const breakEl = document.createElement('div');
        breakEl.className = 'stanza-break';
        sonnet.appendChild(breakEl);
      }

      const lineEl = document.createElement('div');
      lineEl.className = 'line';
      lineEl.dataset.line = lineIdx;

      const lineWords = (wordsByLine.get(lineIdx) || []).slice().sort((a, b) => a.pos - b.pos);

      for (let i = 0; i < lineWords.length; i++) {
        const word = lineWords[i];
        const span = document.createElement('span');
        span.className = 'word';
        span.dataset.wordId = word.id;
        span.textContent = word.text;
        span.style.setProperty('--energy', '0');

        lineEl.appendChild(span);
        this.wordEls.set(word.id, span);

        // Space between words (not after last)
        if (i < lineWords.length - 1) {
          lineEl.appendChild(document.createTextNode(' '));
        }
      }

      sonnet.appendChild(lineEl);
    }

    this.containerEl.appendChild(sonnet);
  }

  getWordPosition(wordId) {
    const el = this.wordEls.get(wordId);
    if (!el || !this.canvasEl) return { x: 0, y: 0 };

    const wordRect = el.getBoundingClientRect();
    const canvasRect = this.canvasEl.getBoundingClientRect();

    return {
      x: (wordRect.left + wordRect.right) / 2 - canvasRect.left,
      y: (wordRect.top + wordRect.bottom) / 2 - canvasRect.top,
    };
  }

  update(energies, activeWordId) {
    for (const [wordId, el] of this.wordEls) {
      const energy = energies.get(wordId) || 0;
      el.style.setProperty('--energy', energy);

      if (energy > 0.01) {
        const b1 = energy * 18;
        const b2 = energy * 38;
        const a1 = Math.min(energy * 0.55, 0.9);
        const a2 = Math.min(energy * 0.25, 0.6);
        el.style.textShadow = `0 0 ${b1}px rgba(245,239,230,${a1}), 0 0 ${b2}px rgba(245,239,230,${a2})`;
      } else {
        el.style.textShadow = '';
      }

      if (wordId === activeWordId) {
        el.classList.add('speaking');
      } else {
        el.classList.remove('speaking');
      }
    }
  }
}
