// Drop-in replacement for TimerSync that drives time from a YouTube IFrame player.
// poem timestamps remain 0-based (ms from poem start); audioStartOffset shifts to YT time.
export class YouTubeSync {
  constructor({ player, startOffset, timestamps, onWordStart, onWordEnd, onEnd }) {
    this.player = player;
    this.startOffset = startOffset; // ms into YT video where poem begins
    this.timestamps = [...timestamps].sort((a, b) => a.start - b.start);
    this.onWordStart = onWordStart;
    this.onWordEnd = onWordEnd || (() => {});
    this.onEnd = onEnd || (() => {});

    this.currentTime = 0;
    this.playing = false;
    this.playbackRate = 1.0;
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
      if (this.currentTime >= ts.start && this.currentTime < ts.end) return ts.id;
    }
    return null;
  }

  play() {
    if (this.playing) return;
    this.playing = true;
    // playVideo() must come before seekTo() when player is in ENDED state,
    // otherwise seekTo() is silently ignored by the YouTube API.
    this.player.playVideo();
    this.player.seekTo((this.currentTime + this.startOffset) / 1000, true);
    this.player.setPlaybackRate(this.playbackRate);
    this._rafId = requestAnimationFrame(this._tick.bind(this));
  }

  pause() {
    if (!this.playing) return;
    this.playing = false;
    this.player.pauseVideo();
    if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
  }

  restart() {
    this.pause();
    this.currentTime = 0;
    this._nextWordIndex = 0;
    this._activeWords.clear();
    this.player.seekTo(this.startOffset / 1000, true);
  }

  seekTo(timeMs) {
    this.currentTime = timeMs;
    this._nextWordIndex = 0;
    while (
      this._nextWordIndex < this.timestamps.length &&
      this.timestamps[this._nextWordIndex].start <= timeMs
    ) this._nextWordIndex++;
    this._activeWords.clear();
    this.player.seekTo((timeMs + this.startOffset) / 1000, true);
  }

  _tick() {
    if (!this.playing) return;

    const ytRaw = this.player.getCurrentTime();
    // Guard against NaN (player not ready yet).
    if (typeof ytRaw !== 'number' || isNaN(ytRaw)) {
      this._rafId = requestAnimationFrame(this._tick.bind(this));
      return;
    }
    const ytTime = Math.max(0, ytRaw * 1000 - this.startOffset);
    // Guard against stale pre-seek position: after a restart currentTime is 0,
    // but YouTube may still report the old end-of-poem position for a few frames
    // while the seek to startOffset completes. Skip those frames.
    if (ytTime > this.currentTime + 5000) {
      this._rafId = requestAnimationFrame(this._tick.bind(this));
      return;
    }

    this.currentTime = ytTime;

    while (
      this._nextWordIndex < this.timestamps.length &&
      this.timestamps[this._nextWordIndex].start <= this.currentTime
    ) {
      const ts = this.timestamps[this._nextWordIndex++];
      this._activeWords.add(ts.id);
      this.onWordStart(ts.id);
    }

    for (const id of [...this._activeWords]) {
      const ts = this.timestamps.find(t => t.id === id);
      if (ts && this.currentTime >= ts.end) {
        this._activeWords.delete(id);
        this.onWordEnd(id);
      }
    }

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
