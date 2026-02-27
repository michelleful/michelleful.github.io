export class Controls {
  constructor({ containerEl, onPlay, onPause, onRestart, onSpeedChange }) {
    this.containerEl = containerEl;
    this.onPlay = onPlay;
    this.onPause = onPause;
    this.onRestart = onRestart;
    this.onSpeedChange = onSpeedChange;
    this._playing = false;

    this._render();
  }

  _render() {
    const bar = document.createElement('div');
    bar.className = 'controls-inner';

    // Play/Pause button
    this._playBtn = document.createElement('button');
    this._playBtn.className = 'ctrl-btn ctrl-play';
    this._playBtn.textContent = '\u25B6 Play';
    this._playBtn.addEventListener('click', () => this._togglePlay());
    bar.appendChild(this._playBtn);

    // Restart button
    const restartBtn = document.createElement('button');
    restartBtn.className = 'ctrl-btn ctrl-restart';
    restartBtn.textContent = '\u27F2 Restart';
    restartBtn.addEventListener('click', () => {
      this._playing = false;
      this._playBtn.textContent = '\u25B6 Play';
      this._playBtn.classList.remove('active');
      this.onRestart();
    });
    bar.appendChild(restartBtn);

    // Speed segmented control
    const speedGroup = document.createElement('div');
    speedGroup.className = 'ctrl-speed-group';

    const speeds = [
      { label: '0.5\u00D7', value: 0.5 },
      { label: '0.75\u00D7', value: 0.75 },
      { label: '1\u00D7', value: 1.0 },
    ];

    for (const { label, value } of speeds) {
      const btn = document.createElement('button');
      btn.className = 'ctrl-btn ctrl-speed' + (value === 1.0 ? ' active' : '');
      btn.textContent = label;
      btn.addEventListener('click', () => {
        speedGroup.querySelectorAll('.ctrl-speed').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.onSpeedChange(value);
      });
      speedGroup.appendChild(btn);
    }

    bar.appendChild(speedGroup);
    this.containerEl.appendChild(bar);
  }

  _togglePlay() {
    if (this._playing) {
      this._playing = false;
      this._playBtn.textContent = '\u25B6 Play';
      this._playBtn.classList.remove('active');
      this.onPause();
    } else {
      this._playing = true;
      this._playBtn.textContent = '\u23F8 Pause';
      this._playBtn.classList.add('active');
      this.onPlay();
    }
  }

  resetToPlay() {
    this._playing = false;
    this._playBtn.textContent = '\u25B6 Play';
    this._playBtn.classList.remove('active');
  }
}
