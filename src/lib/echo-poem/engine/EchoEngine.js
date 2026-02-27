export class EchoEngine {
  constructor({ words, connections, config = {}, timestamps = [] }) {
    this.config = {
      decayHalfLife: 15000,
      propagationDelay: 300,
      maxAmplitude: 3.0,
      secondaryStrengthScale: 0.8,
      ...config,
    };

    // Build directional connection maps
    this._forwardMap = new Map(); // wordId → [{ target, type, strength }]
    this._reverseMap = new Map(); // wordId → [{ source, type, strength }]

    for (const w of words) {
      this._forwardMap.set(w.id, []);
      this._reverseMap.set(w.id, []);
    }

    for (const conn of connections) {
      if (!this._forwardMap.has(conn.source)) this._forwardMap.set(conn.source, []);
      if (!this._reverseMap.has(conn.target)) this._reverseMap.set(conn.target, []);

      this._forwardMap.get(conn.source).push({
        target: conn.target,
        type: conn.type,
        strength: conn.strength,
      });
      this._reverseMap.get(conn.target).push({
        source: conn.source,
        type: conn.type,
        strength: conn.strength,
      });
    }

    // Map<wordId, startMs> for "has this word already been spoken?" checks
    this._timestampMap = new Map();
    for (const ts of timestamps) {
      this._timestampMap.set(ts.id, ts.start);
    }

    // State: Map<wordId, { echoes: Array<{ fromWordId, time, strength, type }> }>
    this.wordStates = new Map();
    for (const w of words) {
      this.wordStates.set(w.id, { echoes: [] });
    }

    this._timeouts = [];
  }

  triggerWord(wordId, time) {
    // 1. Primary echo on the spoken word
    this._addEcho(wordId, { fromWordId: null, time, strength: 1.0, type: 'primary' });

    const delay = this.config.propagationDelay;
    const scale = this.config.secondaryStrengthScale;

    // Track which connection types actually fire (deduped by type, keeping max strength)
    // so we can add one colored echo per type back onto the spoken word itself.
    const firedTypes = new Map();

    // 2. Forward connections — only to words already spoken (retrospective)
    //    e.g. "all-eating" (56) → "all" (35): when all-eating fires, all was spoken earlier
    const forward = this._forwardMap.get(wordId) || [];
    for (const conn of forward) {
      const targetStart = this._timestampMap.get(conn.target);
      if (targetStart === undefined || targetStart >= time) continue;

      firedTypes.set(conn.type, Math.max(firedTypes.get(conn.type) ?? 0, conn.strength * scale));

      const t = setTimeout(() => {
        this._addEcho(conn.target, {
          fromWordId: wordId,
          time: time + delay,
          strength: conn.strength * scale,
          type: conn.type,
        });
      }, delay);
      this._timeouts.push(t);
    }

    // 3. Reverse connections — current word is the target; fire echoes on source words
    //    that have already been spoken
    //    e.g. brow(6)→now(22): when "now" fires, it echoes back to "brow" (already spoken)
    const reverse = this._reverseMap.get(wordId) || [];
    for (const conn of reverse) {
      const sourceStart = this._timestampMap.get(conn.source);
      if (sourceStart === undefined || sourceStart >= time) continue;

      firedTypes.set(conn.type, Math.max(firedTypes.get(conn.type) ?? 0, conn.strength * scale));

      const t = setTimeout(() => {
        this._addEcho(conn.source, {
          fromWordId: wordId,
          time: time + delay,
          strength: conn.strength * scale,
          type: conn.type,
        });
      }, delay);
      this._timeouts.push(t);
    }

    // 4. One colored echo per distinct fired type back onto the spoken word —
    //    gives it a circle in each connection color it triggered.
    for (const [type, strength] of firedTypes) {
      const t = setTimeout(() => {
        this._addEcho(wordId, {
          fromWordId: null,
          time: time + delay,
          strength,
          type,
        });
      }, delay);
      this._timeouts.push(t);
    }
  }

  _addEcho(wordId, echo) {
    if (!this.wordStates.has(wordId)) {
      this.wordStates.set(wordId, { echoes: [] });
    }
    this.wordStates.get(wordId).echoes.push(echo);
  }

  getWordEnergy(wordId, currentTime) {
    const state = this.wordStates.get(wordId);
    if (!state) return 0;

    let energy = 0;
    for (const echo of state.echoes) {
      const dt = currentTime - echo.time;
      if (dt < 0) continue;
      energy += echo.strength * Math.exp(-dt / this.config.decayHalfLife);
    }
    return Math.min(energy, this.config.maxAmplitude);
  }

  getWordEchoes(wordId, currentTime) {
    const state = this.wordStates.get(wordId);
    if (!state) return [];

    return state.echoes.filter((r) => {
      const age = currentTime - r.time;
      return age >= 0 && r.strength * Math.exp(-age / this.config.decayHalfLife) > 0.001;
    });
  }

  getAllEnergies(currentTime) {
    const result = new Map();
    for (const [wordId] of this.wordStates) {
      result.set(wordId, this.getWordEnergy(wordId, currentTime));
    }
    return result;
  }

  // Returns all words connected to wordId in either direction
  getConnections(wordId) {
    const result = [];
    for (const conn of (this._forwardMap.get(wordId) || [])) {
      result.push({ connectedWordId: conn.target, type: conn.type, strength: conn.strength });
    }
    for (const conn of (this._reverseMap.get(wordId) || [])) {
      result.push({ connectedWordId: conn.source, type: conn.type, strength: conn.strength });
    }
    return result;
  }

  // Returns Map<wordId, [{type, strength}]> — all connections both directions,
  // one entry per connection, sorted by when the connection fires (earliest first = outermost ring).
  // This is the fully-accumulated state after the entire poem has played.
  getFinalCircles() {
    const result = new Map();
    for (const [wordId] of this.wordStates) {
      const conns = [];
      const selfTime = this._timestampMap.get(wordId) ?? Infinity;
      for (const conn of (this._forwardMap.get(wordId) || [])) {
        conns.push({ type: conn.type, strength: conn.strength * this.config.secondaryStrengthScale, _t: selfTime });
      }
      for (const conn of (this._reverseMap.get(wordId) || [])) {
        const sourceTime = this._timestampMap.get(conn.source) ?? Infinity;
        conns.push({ type: conn.type, strength: conn.strength * this.config.secondaryStrengthScale, _t: sourceTime });
      }
      if (conns.length > 0) {
        conns.sort((a, b) => a._t - b._t);
        result.set(wordId, conns.map(({ type, strength }) => ({ type, strength })));
      }
    }
    return result;
  }

  // Returns Map<wordId, [{type, strength}]> — backward connections only.
  // "Backward" = the connected word has a lower id (appears earlier in the poem).
  // These are the connections that would fire retrospectively during playback.
  getPrePlayResonance() {
    const result = new Map();
    for (const [wordId] of this.wordStates) {
      const connections = [];
      for (const conn of (this._forwardMap.get(wordId) || [])) {
        if (conn.target < wordId)
          connections.push({ type: conn.type, strength: conn.strength * this.config.secondaryStrengthScale });
      }
      for (const conn of (this._reverseMap.get(wordId) || [])) {
        if (conn.source < wordId)
          connections.push({ type: conn.type, strength: conn.strength * this.config.secondaryStrengthScale });
      }
      if (connections.length > 0) result.set(wordId, connections);
    }
    return result;
  }

  reset() {
    for (const t of this._timeouts) clearTimeout(t);
    this._timeouts = [];
    for (const [, state] of this.wordStates) {
      state.echoes = [];
    }
  }
}
