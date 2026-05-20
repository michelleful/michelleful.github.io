export class TimerSync {
  constructor({ timestamps, onWordStart, onWordEnd, onEnd }) {
    this.timestamps = [...timestamps].sort((a, b) => a.start - b.start);
    this.onWordStart = onWordStart;
    this.onWordEnd = onWordEnd || (() => {});
    this.onEnd = onEnd || (() => {});

    this.currentTime = 0;
    this.playing = false;
    this.playbackRate = 1.0;
    this._lastFrameTime = null;
    this._nextWordIndex = 0;
    this._activeWords = new Set();
    this._rafId = null;
  }

  get isFinished() {
    if (this.timestamps.length === 0) return false;
    return (
      this._nextWordIndex >= this.timestamps.length &&
      this.currentTime >= this.timestamps[this.timestamps.length - 1].end + 1000
    );
  }

  get currentActiveWordId() {
    for (const ts of this.timestamps) {
      if (this.currentTime >= ts.start && this.currentTime < ts.end) {
        return ts.id;
      }
    }
    return null;
  }

  play() {
    if (this.playing) return;
    this.playing = true;
    this._lastFrameTime = null;
    this._rafId = requestAnimationFrame(this._tick.bind(this));
  }

  pause() {
    if (!this.playing) return;
    this.playing = false;
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this._lastFrameTime = null;
  }

  restart() {
    this.pause();
    this.currentTime = 0;
    this._nextWordIndex = 0;
    this._activeWords.clear();
  }

  seekTo(timeMs) {
    this.currentTime = timeMs;
    this._nextWordIndex = 0;
    while (
      this._nextWordIndex < this.timestamps.length &&
      this.timestamps[this._nextWordIndex].start <= timeMs
    ) {
      this._nextWordIndex++;
    }
    this._activeWords.clear();
  }

  _tick(frameTime) {
    if (!this.playing) return;

    if (this._lastFrameTime !== null) {
      const delta = (frameTime - this._lastFrameTime) * this.playbackRate;
      this.currentTime += delta;
    }
    this._lastFrameTime = frameTime;

    // Fire word starts for any timestamps crossed this frame
    while (
      this._nextWordIndex < this.timestamps.length &&
      this.timestamps[this._nextWordIndex].start <= this.currentTime
    ) {
      const ts = this.timestamps[this._nextWordIndex];
      this._activeWords.add(ts.id);
      this.onWordStart(ts.id);
      this._nextWordIndex++;
    }

    // Fire word ends
    for (const id of [...this._activeWords]) {
      const ts = this.timestamps.find((t) => t.id === id);
      if (ts && this.currentTime >= ts.end) {
        this._activeWords.delete(id);
        this.onWordEnd(id);
      }
    }

    // Auto-stop after the last word finishes
    if (this._nextWordIndex >= this.timestamps.length) {
      const last = this.timestamps[this.timestamps.length - 1];
      if (this.currentTime >= last.end + 1000) {
        this.pause();
        this.onEnd();
        return;
      }
    }

    this._rafId = requestAnimationFrame(this._tick.bind(this));
  }
}
