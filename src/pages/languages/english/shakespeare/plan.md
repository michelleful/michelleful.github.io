# Sonnet Ripple Visualizer — Phase 1: Static Layout + Ripple Engine

## Goal

Render Sonnet 2 ("When forty winters shall besiege thy brow") as interactive text on a canvas. A "Play" button triggers words in timed sequence (no real audio yet — just a timer stepping through words). When each word fires, it ripples, and connected words receive secondary ripples. Ripples accumulate and compound visually.

By the end of Phase 1 you should be able to hit Play, watch the sonnet "read itself," and see meaning-connections light up across the text in real time.

---

## File Structure

```
sonnet-ripple/
  index.html            -- app shell, loads everything
  style.css             -- layout, typography, word styling, glow effects
  data/
    sonnet2.json        -- sonnet text, fake timestamps, connection map
  engine/
    RippleEngine.js     -- core state: receives word events, propagates ripples, manages decay
    TimerSync.js        -- steps through words on a timer (stand-in for audio sync in Phase 2)
  renderer/
    TextRenderer.js     -- creates word <span> elements, positions them, applies energy styles
    CanvasRenderer.js   -- draws expanding ripple circles on a <canvas> overlay
  ui/
    Controls.js         -- play / pause / restart buttons
  main.js               -- wires everything together
```

---

## Data File: `data/sonnet2.json`

This contains three sections: `lines`, `timestamps`, and `connections`.

### Sample Data

```json
{
  "title": "Sonnet 2",
  "author": "William Shakespeare",
  "lines": [
    "When forty winters shall besiege thy brow",
    "And dig deep trenches in thy beauty's field,",
    "Thy youth's proud livery, so gazed on now,",
    "Will be a tattered weed of small account.",
    "Then being asked where all thy beauty lies,",
    "Where all the treasure of thy lusty days,",
    "To say within thine own deep-sunken eyes",
    "Were an all-eating shame and thriftless praise.",
    "How much more praise would thy beauty's use deserve,",
    "If thou couldst answer, 'This fair child of mine",
    "Shall sum my count and make my old excuse,'",
    "Proving his beauty by succession thine.",
    "  This were to be new made when thou art old,",
    "  And see thy blood warm when thou feel'st it cold."
  ],
  "words": [
    { "id": 0,  "text": "When",       "line": 0, "pos": 0 },
    { "id": 1,  "text": "forty",      "line": 0, "pos": 1 },
    { "id": 2,  "text": "winters",    "line": 0, "pos": 2 },
    { "id": 3,  "text": "shall",      "line": 0, "pos": 3 },
    { "id": 4,  "text": "besiege",    "line": 0, "pos": 4 },
    { "id": 5,  "text": "thy",        "line": 0, "pos": 5 },
    { "id": 6,  "text": "brow",       "line": 0, "pos": 6 },
    { "id": 7,  "text": "And",        "line": 1, "pos": 0 },
    { "id": 8,  "text": "dig",        "line": 1, "pos": 1 },
    { "id": 9,  "text": "deep",       "line": 1, "pos": 2 },
    { "id": 10, "text": "trenches",   "line": 1, "pos": 3 },
    { "id": 11, "text": "in",         "line": 1, "pos": 4 },
    { "id": 12, "text": "thy",        "line": 1, "pos": 5 },
    { "id": 13, "text": "beauty's",   "line": 1, "pos": 6 },
    { "id": 14, "text": "field,",     "line": 1, "pos": 7 },
    { "id": 15, "text": "Thy",        "line": 2, "pos": 0 },
    { "id": 16, "text": "youth's",    "line": 2, "pos": 1 },
    { "id": 17, "text": "proud",      "line": 2, "pos": 2 },
    { "id": 18, "text": "livery,",    "line": 2, "pos": 3 },
    { "id": 19, "text": "so",         "line": 2, "pos": 4 },
    { "id": 20, "text": "gazed",      "line": 2, "pos": 5 },
    { "id": 21, "text": "on",         "line": 2, "pos": 6 },
    { "id": 22, "text": "now,",       "line": 2, "pos": 7 },
    { "id": 23, "text": "Will",       "line": 3, "pos": 0 },
    { "id": 24, "text": "be",         "line": 3, "pos": 1 },
    { "id": 25, "text": "a",          "line": 3, "pos": 2 },
    { "id": 26, "text": "tattered",   "line": 3, "pos": 3 },
    { "id": 27, "text": "weed",       "line": 3, "pos": 4 },
    { "id": 28, "text": "of",         "line": 3, "pos": 5 },
    { "id": 29, "text": "small",      "line": 3, "pos": 6 },
    { "id": 30, "text": "account.",   "line": 3, "pos": 7 },
    { "id": 31, "text": "Then",       "line": 4, "pos": 0 },
    { "id": 32, "text": "being",      "line": 4, "pos": 1 },
    { "id": 33, "text": "asked",      "line": 4, "pos": 2 },
    { "id": 34, "text": "where",      "line": 4, "pos": 3 },
    { "id": 35, "text": "all",        "line": 4, "pos": 4 },
    { "id": 36, "text": "thy",        "line": 4, "pos": 5 },
    { "id": 37, "text": "beauty",     "line": 4, "pos": 6 },
    { "id": 38, "text": "lies,",      "line": 4, "pos": 7 },
    { "id": 39, "text": "Where",      "line": 5, "pos": 0 },
    { "id": 40, "text": "all",        "line": 5, "pos": 1 },
    { "id": 41, "text": "the",        "line": 5, "pos": 2 },
    { "id": 42, "text": "treasure",   "line": 5, "pos": 3 },
    { "id": 43, "text": "of",         "line": 5, "pos": 4 },
    { "id": 44, "text": "thy",        "line": 5, "pos": 5 },
    { "id": 45, "text": "lusty",      "line": 5, "pos": 6 },
    { "id": 46, "text": "days,",      "line": 5, "pos": 7 },
    { "id": 47, "text": "To",         "line": 6, "pos": 0 },
    { "id": 48, "text": "say",        "line": 6, "pos": 1 },
    { "id": 49, "text": "within",     "line": 6, "pos": 2 },
    { "id": 50, "text": "thine",      "line": 6, "pos": 3 },
    { "id": 51, "text": "own",        "line": 6, "pos": 4 },
    { "id": 52, "text": "deep-sunken","line": 6, "pos": 5 },
    { "id": 53, "text": "eyes",       "line": 6, "pos": 6 },
    { "id": 54, "text": "Were",       "line": 7, "pos": 0 },
    { "id": 55, "text": "an",         "line": 7, "pos": 1 },
    { "id": 56, "text": "all-eating", "line": 7, "pos": 2 },
    { "id": 57, "text": "shame",      "line": 7, "pos": 3 },
    { "id": 58, "text": "and",        "line": 7, "pos": 4 },
    { "id": 59, "text": "thriftless", "line": 7, "pos": 5 },
    { "id": 60, "text": "praise.",    "line": 7, "pos": 6 },
    { "id": 61, "text": "How",        "line": 8, "pos": 0 },
    { "id": 62, "text": "much",       "line": 8, "pos": 1 },
    { "id": 63, "text": "more",       "line": 8, "pos": 2 },
    { "id": 64, "text": "praise",     "line": 8, "pos": 3 },
    { "id": 65, "text": "would",      "line": 8, "pos": 4 },
    { "id": 66, "text": "thy",        "line": 8, "pos": 5 },
    { "id": 67, "text": "beauty's",   "line": 8, "pos": 6 },
    { "id": 68, "text": "use",        "line": 8, "pos": 7 },
    { "id": 69, "text": "deserve,",   "line": 8, "pos": 8 },
    { "id": 70, "text": "If",         "line": 9, "pos": 0 },
    { "id": 71, "text": "thou",       "line": 9, "pos": 1 },
    { "id": 72, "text": "couldst",    "line": 9, "pos": 2 },
    { "id": 73, "text": "answer,",    "line": 9, "pos": 3 },
    { "id": 74, "text": "'This",      "line": 9, "pos": 4 },
    { "id": 75, "text": "fair",       "line": 9, "pos": 5 },
    { "id": 76, "text": "child",      "line": 9, "pos": 6 },
    { "id": 77, "text": "of",         "line": 9, "pos": 7 },
    { "id": 78, "text": "mine",       "line": 9, "pos": 8 },
    { "id": 79, "text": "Shall",      "line": 10, "pos": 0 },
    { "id": 80, "text": "sum",        "line": 10, "pos": 1 },
    { "id": 81, "text": "my",         "line": 10, "pos": 2 },
    { "id": 82, "text": "count",      "line": 10, "pos": 3 },
    { "id": 83, "text": "and",        "line": 10, "pos": 4 },
    { "id": 84, "text": "make",       "line": 10, "pos": 5 },
    { "id": 85, "text": "my",         "line": 10, "pos": 6 },
    { "id": 86, "text": "old",        "line": 10, "pos": 7 },
    { "id": 87, "text": "excuse,'",   "line": 10, "pos": 8 },
    { "id": 88, "text": "Proving",    "line": 11, "pos": 0 },
    { "id": 89, "text": "his",        "line": 11, "pos": 1 },
    { "id": 90, "text": "beauty",     "line": 11, "pos": 2 },
    { "id": 91, "text": "by",         "line": 11, "pos": 3 },
    { "id": 92, "text": "succession", "line": 11, "pos": 4 },
    { "id": 93, "text": "thine.",     "line": 11, "pos": 5 },
    { "id": 94, "text": "This",       "line": 12, "pos": 0 },
    { "id": 95, "text": "were",       "line": 12, "pos": 1 },
    { "id": 96, "text": "to",         "line": 12, "pos": 2 },
    { "id": 97, "text": "be",         "line": 12, "pos": 3 },
    { "id": 98, "text": "new",        "line": 12, "pos": 4 },
    { "id": 99, "text": "made",       "line": 12, "pos": 5 },
    { "id": 100,"text": "when",       "line": 12, "pos": 6 },
    { "id": 101,"text": "thou",       "line": 12, "pos": 7 },
    { "id": 102,"text": "art",        "line": 12, "pos": 8 },
    { "id": 103,"text": "old,",       "line": 12, "pos": 9 },
    { "id": 104,"text": "And",        "line": 13, "pos": 0 },
    { "id": 105,"text": "see",        "line": 13, "pos": 1 },
    { "id": 106,"text": "thy",        "line": 13, "pos": 2 },
    { "id": 107,"text": "blood",      "line": 13, "pos": 3 },
    { "id": 108,"text": "warm",       "line": 13, "pos": 4 },
    { "id": 109,"text": "when",       "line": 13, "pos": 5 },
    { "id": 110,"text": "thou",       "line": 13, "pos": 6 },
    { "id": 111,"text": "feel'st",    "line": 13, "pos": 7 },
    { "id": 112,"text": "it",         "line": 13, "pos": 8 },
    { "id": 113,"text": "cold.",      "line": 13, "pos": 9 }
  ],
  "timestamps_ms": [
    { "id": 0,   "start": 0,     "end": 300 },
    { "id": 1,   "start": 300,   "end": 700 },
    { "id": 2,   "start": 700,   "end": 1200 },
    { "id": 3,   "start": 1200,  "end": 1500 },
    { "id": 4,   "start": 1500,  "end": 2100 },
    { "id": 5,   "start": 2100,  "end": 2350 },
    { "id": 6,   "start": 2350,  "end": 2800 },
    { "id": 7,   "start": 3200,  "end": 3450 },
    { "id": 8,   "start": 3450,  "end": 3700 },
    { "id": 9,   "start": 3700,  "end": 4100 },
    { "id": 10,  "start": 4100,  "end": 4700 },
    { "id": 11,  "start": 4700,  "end": 4900 },
    { "id": 12,  "start": 4900,  "end": 5150 },
    { "id": 13,  "start": 5150,  "end": 5700 },
    { "id": 14,  "start": 5700,  "end": 6300 },
    { "id": 15,  "start": 6700,  "end": 6950 },
    { "id": 16,  "start": 6950,  "end": 7400 },
    { "id": 17,  "start": 7400,  "end": 7800 },
    { "id": 18,  "start": 7800,  "end": 8400 },
    { "id": 19,  "start": 8400,  "end": 8600 },
    { "id": 20,  "start": 8600,  "end": 9100 },
    { "id": 21,  "start": 9100,  "end": 9300 },
    { "id": 22,  "start": 9300,  "end": 9800 },
    { "id": 23,  "start": 10200, "end": 10500 },
    { "id": 24,  "start": 10500, "end": 10700 },
    { "id": 25,  "start": 10700, "end": 10850 },
    { "id": 26,  "start": 10850, "end": 11400 },
    { "id": 27,  "start": 11400, "end": 11800 },
    { "id": 28,  "start": 11800, "end": 12000 },
    { "id": 29,  "start": 12000, "end": 12400 },
    { "id": 30,  "start": 12400, "end": 13100 },
    { "id": 31,  "start": 13500, "end": 13800 },
    { "id": 32,  "start": 13800, "end": 14200 },
    { "id": 33,  "start": 14200, "end": 14600 },
    { "id": 34,  "start": 14600, "end": 15000 },
    { "id": 35,  "start": 15000, "end": 15250 },
    { "id": 36,  "start": 15250, "end": 15500 },
    { "id": 37,  "start": 15500, "end": 16100 },
    { "id": 38,  "start": 16100, "end": 16700 },
    { "id": 39,  "start": 17100, "end": 17500 },
    { "id": 40,  "start": 17500, "end": 17750 },
    { "id": 41,  "start": 17750, "end": 17950 },
    { "id": 42,  "start": 17950, "end": 18500 },
    { "id": 43,  "start": 18500, "end": 18700 },
    { "id": 44,  "start": 18700, "end": 18950 },
    { "id": 45,  "start": 18950, "end": 19400 },
    { "id": 46,  "start": 19400, "end": 20000 },
    { "id": 47,  "start": 20400, "end": 20600 },
    { "id": 48,  "start": 20600, "end": 20900 },
    { "id": 49,  "start": 20900, "end": 21300 },
    { "id": 50,  "start": 21300, "end": 21700 },
    { "id": 51,  "start": 21700, "end": 22000 },
    { "id": 52,  "start": 22000, "end": 22800 },
    { "id": 53,  "start": 22800, "end": 23300 },
    { "id": 54,  "start": 23700, "end": 24000 },
    { "id": 55,  "start": 24000, "end": 24200 },
    { "id": 56,  "start": 24200, "end": 24900 },
    { "id": 57,  "start": 24900, "end": 25400 },
    { "id": 58,  "start": 25400, "end": 25600 },
    { "id": 59,  "start": 25600, "end": 26300 },
    { "id": 60,  "start": 26300, "end": 27000 },
    { "id": 61,  "start": 27400, "end": 27700 },
    { "id": 62,  "start": 27700, "end": 28000 },
    { "id": 63,  "start": 28000, "end": 28400 },
    { "id": 64,  "start": 28400, "end": 28900 },
    { "id": 65,  "start": 28900, "end": 29100 },
    { "id": 66,  "start": 29100, "end": 29350 },
    { "id": 67,  "start": 29350, "end": 29900 },
    { "id": 68,  "start": 29900, "end": 30200 },
    { "id": 69,  "start": 30200, "end": 30900 },
    { "id": 70,  "start": 31300, "end": 31500 },
    { "id": 71,  "start": 31500, "end": 31800 },
    { "id": 72,  "start": 31800, "end": 32200 },
    { "id": 73,  "start": 32200, "end": 32800 },
    { "id": 74,  "start": 32800, "end": 33200 },
    { "id": 75,  "start": 33200, "end": 33600 },
    { "id": 76,  "start": 33600, "end": 34100 },
    { "id": 77,  "start": 34100, "end": 34300 },
    { "id": 78,  "start": 34300, "end": 34800 },
    { "id": 79,  "start": 35200, "end": 35500 },
    { "id": 80,  "start": 35500, "end": 35800 },
    { "id": 81,  "start": 35800, "end": 36050 },
    { "id": 82,  "start": 36050, "end": 36500 },
    { "id": 83,  "start": 36500, "end": 36700 },
    { "id": 84,  "start": 36700, "end": 37100 },
    { "id": 85,  "start": 37100, "end": 37300 },
    { "id": 86,  "start": 37300, "end": 37600 },
    { "id": 87,  "start": 37600, "end": 38300 },
    { "id": 88,  "start": 38700, "end": 39300 },
    { "id": 89,  "start": 39300, "end": 39550 },
    { "id": 90,  "start": 39550, "end": 40100 },
    { "id": 91,  "start": 40100, "end": 40350 },
    { "id": 92,  "start": 40350, "end": 41100 },
    { "id": 93,  "start": 41100, "end": 41700 },
    { "id": 94,  "start": 42100, "end": 42500 },
    { "id": 95,  "start": 42500, "end": 42800 },
    { "id": 96,  "start": 42800, "end": 43000 },
    { "id": 97,  "start": 43000, "end": 43200 },
    { "id": 98,  "start": 43200, "end": 43600 },
    { "id": 99,  "start": 43600, "end": 44000 },
    { "id": 100, "start": 44000, "end": 44350 },
    { "id": 101, "start": 44350, "end": 44650 },
    { "id": 102, "start": 44650, "end": 44900 },
    { "id": 103, "start": 44900, "end": 45500 },
    { "id": 104, "start": 45900, "end": 46150 },
    { "id": 105, "start": 46150, "end": 46500 },
    { "id": 106, "start": 46500, "end": 46750 },
    { "id": 107, "start": 46750, "end": 47200 },
    { "id": 108, "start": 47200, "end": 47700 },
    { "id": 109, "start": 47700, "end": 48050 },
    { "id": 110, "start": 48050, "end": 48350 },
    { "id": 111, "start": 48350, "end": 48900 },
    { "id": 112, "start": 48900, "end": 49100 },
    { "id": 113, "start": 49100, "end": 49800 }
  ],
  "connections": [
    {
      "source": 4, "target": 10,
      "type": "semantic",
      "strength": 0.9,
      "note": "besiege → trenches: military siege imagery. The metaphor of aging as warfare runs through both."
    },
    {
      "source": 4, "target": 14,
      "type": "semantic",
      "strength": 0.7,
      "note": "besiege → field: 'field' activates both agricultural and battlefield senses. The siege needs a field."
    },
    {
      "source": 2, "target": 113,
      "type": "semantic",
      "strength": 0.8,
      "note": "winters → cold: the sonnet's temperature arc — cold opens and closes the poem."
    },
    {
      "source": 6, "target": 14,
      "type": "phonetic",
      "strength": 0.6,
      "note": "brow / field: end-rhyme positions (ABAB scheme, lines 1 and 3 don't rhyme but brow/now do — see next)."
    },
    {
      "source": 6, "target": 22,
      "type": "phonetic",
      "strength": 1.0,
      "note": "brow / now: rhyme pair (lines 1 & 3). The 'ow' sound."
    },
    {
      "source": 14, "target": 30,
      "type": "phonetic",
      "strength": 1.0,
      "note": "field / account: doesn't rhyme — but field / gazed-on-now... Actually: field / wield is latent. The real rhyme pair is field (line 2) / held? No — Shakespearean: brow/now, field/child? Let's mark the actual ABAB: brow-field-now-account. So field(B) pairs with account? No. Let me correct: the scheme is brow(A) field(B) now(A) account(B). In Elizabethan pronunciation field/account may have been a near-rhyme (feeld/accoont)."
    },
    {
      "source": 8, "target": 9,
      "type": "phonetic",
      "strength": 0.7,
      "note": "dig / deep: alliterative 'd' pair, reinforcing the downward physical action."
    },
    {
      "source": 8, "target": 52,
      "type": "semantic",
      "strength": 0.85,
      "note": "dig → deep-sunken: the trenches dug in the brow become the sunken eyes. The digging has moved inward."
    },
    {
      "source": 9, "target": 52,
      "type": "phonetic",
      "strength": 0.9,
      "note": "deep → deep-sunken: literal repetition of 'deep'. The word returns, transformed by compound."
    },
    {
      "source": 10, "target": 52,
      "type": "semantic",
      "strength": 0.8,
      "note": "trenches → deep-sunken: wrinkles-as-trenches become eye-sockets-as-sunken-ground. Same excavation imagery."
    },
    {
      "source": 13, "target": 37,
      "type": "phonetic",
      "strength": 1.0,
      "note": "beauty's → beauty: repetition. The word recurs 4 times in the sonnet (13, 37, 67, 90) — each time in a different grammatical/semantic context."
    },
    {
      "source": 13, "target": 67,
      "type": "phonetic",
      "strength": 1.0,
      "note": "beauty's → beauty's: exact repetition across octave/sestet divide."
    },
    {
      "source": 13, "target": 90,
      "type": "phonetic",
      "strength": 1.0,
      "note": "beauty's → beauty: the final 'beauty' — now it belongs to the child, not the addressee."
    },
    {
      "source": 37, "target": 67,
      "type": "semantic",
      "strength": 0.8,
      "note": "beauty (lies) → beauty's (use): from passive possession to active deployment. The argument turns on this shift."
    },
    {
      "source": 37, "target": 90,
      "type": "semantic",
      "strength": 0.9,
      "note": "beauty (lies) → beauty (by succession): from hidden/wasted to inherited/proven."
    },
    {
      "source": 17, "target": 18,
      "type": "semantic",
      "strength": 0.7,
      "note": "proud / livery: 'livery' is a servant's uniform — 'proud livery' is an oxymoron (gorgeous subservience), or pride in borrowed clothing."
    },
    {
      "source": 18, "target": 27,
      "type": "semantic",
      "strength": 0.95,
      "note": "livery → weed: both are garments. 'Livery' (fine uniform) degrades into 'weed' (ragged clothing). Clothing-as-body metaphor."
    },
    {
      "source": 27, "target": 14,
      "type": "semantic",
      "strength": 0.6,
      "note": "weed / field: 'weed' as garment, but also activates 'weed' as plant — which grows in a field. Double meaning floats between lines."
    },
    {
      "source": 30, "target": 82,
      "type": "phonetic",
      "strength": 0.85,
      "note": "account → count: 'count' is literally inside 'account'. Financial/numerical language — the poem's ledger metaphor."
    },
    {
      "source": 30, "target": 80,
      "type": "semantic",
      "strength": 0.7,
      "note": "account → sum: accounting vocabulary. The financial metaphor from the octave resolves in the sestet."
    },
    {
      "source": 42, "target": 59,
      "type": "semantic",
      "strength": 0.8,
      "note": "treasure → thriftless: both economic language. Treasure wasted = thriftlessness."
    },
    {
      "source": 42, "target": 30,
      "type": "semantic",
      "strength": 0.7,
      "note": "treasure → account: continued financial metaphor — beauty as capital."
    },
    {
      "source": 38, "target": 53,
      "type": "phonetic",
      "strength": 0.8,
      "note": "lies → eyes: near-rhyme (the actual rhyme pair in ABAB). Also semantic: beauty 'lies' (resides/deceives) in the eyes."
    },
    {
      "source": 46, "target": 60,
      "type": "phonetic",
      "strength": 0.9,
      "note": "days → praise: rhyme pair (lines 6 & 8)."
    },
    {
      "source": 60, "target": 64,
      "type": "phonetic",
      "strength": 1.0,
      "note": "praise → praise: exact repetition across the volta. The word pivots from 'thriftless praise' (empty) to 'more praise' (earned)."
    },
    {
      "source": 56, "target": 35,
      "type": "phonetic",
      "strength": 0.7,
      "note": "all-eating / all: 'all' recurs (35, 40, 56) — escalating from 'all thy beauty' to 'all the treasure' to 'all-eating'. The totalizing word devours."
    },
    {
      "source": 45, "target": 46,
      "type": "phonetic",
      "strength": 0.5,
      "note": "lusty / days: near-rhyme with the -y endings. Also: 'lusty days' as a unit echoes 'youth's proud livery' — both are flashy descriptions of vigor."
    },
    {
      "source": 45, "target": 16,
      "type": "semantic",
      "strength": 0.7,
      "note": "lusty → youth's: both denote youthful vigor, sexual energy."
    },
    {
      "source": 68, "target": 87,
      "type": "semantic",
      "strength": 0.75,
      "note": "use → excuse: 'use' (investment, usury) is literally inside 'excuse'. Booth: the financial 'use' of beauty (breeding) becomes an 'excuse' for aging."
    },
    {
      "source": 68, "target": 87,
      "type": "phonetic",
      "strength": 0.85,
      "note": "use / excuse: phonetic embedding — 'use' sits inside 'ex-cuse'. The ear catches the repetition."
    },
    {
      "source": 86, "target": 103,
      "type": "phonetic",
      "strength": 1.0,
      "note": "old → old: exact repetition in the couplet. 'My old excuse' → 'thou art old'. The word transfers from figurative to literal."
    },
    {
      "source": 98, "target": 99,
      "type": "semantic",
      "strength": 0.7,
      "note": "new / made: 'new made' — creation, rebirth. Opposes the 'old' that follows."
    },
    {
      "source": 98, "target": 103,
      "type": "semantic",
      "strength": 0.9,
      "note": "new → old: the couplet's central antithesis. New-made vs. old."
    },
    {
      "source": 108, "target": 113,
      "type": "semantic",
      "strength": 1.0,
      "note": "warm → cold: the poem's final antithesis. Blood warm / feel cold. Also closes the temperature arc opened by 'winters'."
    },
    {
      "source": 2, "target": 108,
      "type": "semantic",
      "strength": 0.6,
      "note": "winters → warm: temperature arc — the cold of line 1 is answered by the warmth of line 14, but only conditionally ('if you have a child')."
    },
    {
      "source": 0, "target": 100,
      "type": "phonetic",
      "strength": 0.9,
      "note": "When → when: the poem's temporal frame. 'When forty winters' opens; 'when thou art old' closes. The word is a structural bracket."
    },
    {
      "source": 0, "target": 109,
      "type": "phonetic",
      "strength": 0.7,
      "note": "When → when: third 'when' in the couplet — 'when thou feel'st it cold.' Triple repetition creates rhythmic closure."
    },
    {
      "source": 5, "target": 12,
      "type": "phonetic",
      "strength": 0.9,
      "note": "thy → thy: 'thy' recurs constantly (5, 12, 15, 36, 44, 66, 106). Each recurrence is a gentle pulse connecting the addressee to everything — brow, beauty, youth, days, blood."
    },
    {
      "source": 50, "target": 93,
      "type": "phonetic",
      "strength": 0.9,
      "note": "thine → thine: the possessive shifts from 'thine own deep-sunken eyes' (decay) to 'succession thine' (renewal)."
    },
    {
      "source": 76, "target": 14,
      "type": "phonetic",
      "strength": 0.7,
      "note": "child / field: rhyme pair (lines 10 & 2 in the ABAB scheme across quatrains — actually lines 2 and 10: field/child). A deep structural rhyme connecting the agricultural metaphor to its resolution: the field produces the child."
    },
    {
      "source": 57, "target": 56,
      "type": "semantic",
      "strength": 0.8,
      "note": "shame / all-eating: 'all-eating shame' — shame that consumes everything. Connects to the devouring/consuming imagery (siege, eating, spending)."
    },
    {
      "source": 80, "target": 30,
      "type": "phonetic",
      "strength": 0.8,
      "note": "sum / account: 'sum my count' echoes 'small account' — the accounting metaphor reaches its resolution. What was of 'small account' can now be 'summed'."
    },
    {
      "source": 92, "target": 88,
      "type": "phonetic",
      "strength": 0.6,
      "note": "succession / Proving: both Latinate, polysyllabic, legal/formal register. They stand out against the poem's Anglo-Saxon base."
    }
  ]
}
```

> **Note on the connections:** These are approximate and partly invented, inspired by the *kind* of observations Booth makes rather than transcribed from his commentary. They're meant to be good enough to demo the visualization. Refining them from Booth's actual notes is a separate task.

> **Note on the timestamps:** These are fake — spaced to simulate a slow, measured reading at roughly sonnet-recitation pace (~50 seconds total). They'll be replaced with real timestamps from an audio file in Phase 2.

---

## Module Specifications

### `engine/RippleEngine.js`

The central state manager. Framework-free, pure JS class.

```
class RippleEngine {
  constructor({ words, connections, config })

  // --- Config defaults ---
  // config.decayHalfLife = 3000        // ms — how fast ripples fade
  // config.propagationDelay = 200      // ms — delay before secondary ripples fire
  // config.maxAmplitude = 3.0          // cap so nothing blows out
  // config.secondaryStrengthScale = 0.7 // secondary ripples are 70% of connection strength

  // --- State ---
  // this.wordStates: Map<wordId, { energy: number, ripples: [] }>
  //   where each ripple is { fromWordId, time, strength, type }

  // --- Methods ---
  triggerWord(wordId, time)
    // 1. Add a primary ripple to wordStates[wordId]
    //    - strength 1.0, type "primary", fromWordId: null
    // 2. Look up all connections where source === wordId
    // 3. For each connection, schedule (via setTimeout) a secondary ripple:
    //    - target = connection.target
    //    - strength = connection.strength * config.secondaryStrengthScale
    //    - type = connection.type
    //    - delay = config.propagationDelay
    // 4. Also look up connections where target === wordId (reverse echoes)
    //    - these fire with lower strength (× 0.4) — a word being spoken
    //      reminds you faintly of words it's connected TO, not just FROM

  getWordEnergy(wordId, currentTime)
    // Sum all ripples for this word, each decayed:
    //   energy = Σ ripple.strength * exp(-timeSince / decayHalfLife)
    // Clamp to maxAmplitude

  getWordRipples(wordId, currentTime)
    // Return active (non-fully-decayed) ripples for canvas rendering
    // Each includes: { x, y, age, strength, type }

  getAllEnergies(currentTime)
    // Return Map<wordId, energy> for the renderer

  reset()
    // Clear all state
}
```

**Key design decisions:**
- Connections are **directional but with weak reverse echoes**. When "dig" fires and connects to "deep-sunken," the primary ripple goes forward to "deep-sunken." But "dig" also gets a faint reverse pulse from any *earlier* word that connects to it — acknowledging that hearing "dig" also retroactively activates its connections backward.
- Energy is computed on-demand (not pre-stepped), so scrubbing/pausing is trivial.
- The engine knows nothing about rendering — it only deals in word IDs, strengths, and times.

### `engine/TimerSync.js`

Phase 1 stand-in for audio sync. Steps through the timestamp array using `requestAnimationFrame`.

```
class TimerSync {
  constructor({ timestamps, onWordStart, onWordEnd })

  // --- State ---
  // this.currentTime = 0
  // this.playing = false
  // this.lastFrameTime = null
  // this.currentWordIndex = 0  // pointer into sorted timestamps
  // this.playbackRate = 1.0

  play()
  pause()
  restart()
  seekTo(timeMs)

  // --- Internal ---
  _tick(frameTime)
    // Advance this.currentTime by (frameTime - lastFrameTime) * playbackRate
    // Check if currentTime has crossed any word start times
    // For each crossed word: call onWordStart(wordId)
    // For each word whose end time has passed: call onWordEnd(wordId)
    // Request next frame
}
```

### `renderer/TextRenderer.js`

Creates the DOM structure and applies visual styles based on engine state.

```
class TextRenderer {
  constructor({ containerEl, words, lines })

  // --- Setup ---
  render()
    // Create the DOM:
    //   <div class="sonnet">
    //     <div class="line" data-line="0">
    //       <span class="word" data-word-id="0">When</span>
    //       <span class="word" data-word-id="1">forty</span>
    //       ...
    //     </div>
    //     ...
    //   </div>
    // Store references: this.wordEls = Map<wordId, HTMLElement>

  getWordPosition(wordId)
    // Returns { x, y } center of the word element (for canvas ripple positioning)
    // Use getBoundingClientRect() relative to the canvas

  update(energies, activeWordId)
    // energies: Map<wordId, number>
    // activeWordId: the word currently being "spoken" (or null)
    //
    // For each word:
    //   - If activeWordId: add class "speaking" (distinct highlight)
    //   - Apply energy-based styles:
    //     scale: 1 + energy * 0.12
    //     text-shadow glow: radius and opacity proportional to energy
    //     color shift: from base color toward bright at high energy
    //   - Use CSS custom properties for smooth updates:
    //     el.style.setProperty('--energy', energy)
    //     Then CSS handles: transform: scale(calc(1 + var(--energy) * 0.12))
}
```

**Typography & layout:**
- Font: a good serif. Suggestions: `"Cormorant Garamond"` (available on Google Fonts — elegant, literary, good at large sizes). Fallback: `Georgia, serif`.
- Font size: large. ~28px on desktop, responsive down.
- Line height: generous — 2.2 or so. The ripple circles need room between lines.
- Letter spacing: slightly tracked out (+0.02em) for legibility.
- Text color: muted warm white (`#e8e0d4`) on a very dark background (`#0a0a0f`). Words glow brighter as energy increases.
- Line layout: centered, each line is its own block, standard sonnet indentation for the couplet.

### `renderer/CanvasRenderer.js`

Draws ripple circles on a `<canvas>` element that overlays the text.

```
class CanvasRenderer {
  constructor({ canvasEl, textRenderer, rippleEngine })

  // --- Config ---
  // colors by type:
  //   primary:      "rgba(255, 255, 255, ...)"   — white flash for the spoken word
  //   phonetic:     "rgba(120, 160, 255, ...)"   — cool blue
  //   semantic:     "rgba(255, 190, 80, ...)"    — warm gold
  //   etymological: "rgba(140, 220, 160, ...)"   — sage green
  //   pun:          "rgba(220, 130, 220, ...)"   — soft purple
  //
  // maxRadius: 55   — pixels
  // rippleDuration: 1800  — ms for full expansion

  start()
    // Begin requestAnimationFrame loop

  stop()

  _draw(currentTime)
    // 1. Clear canvas
    // 2. For each word that has active ripples (from engine.getWordRipples):
    //    a. Get word center position from textRenderer.getWordPosition(wordId)
    //    b. For each ripple:
    //       - age = currentTime - ripple.time
    //       - progress = age / rippleDuration  (0 → 1)
    //       - radius = progress * maxRadius
    //       - opacity = ripple.strength * (1 - progress) * 0.6
    //       - Draw circle:
    //           ctx.beginPath()
    //           ctx.arc(x, y, radius, 0, Math.PI * 2)
    //           ctx.strokeStyle = colorForType(ripple.type, opacity)
    //           ctx.lineWidth = 2 - progress  (thins as it expands)
    //           ctx.stroke()
    //    c. If energy > 0.3, draw a soft radial gradient "glow" behind the word:
    //       - Small filled circle, heavily blurred, matching the dominant ripple type color
    //
    // 3. Request next frame
```

**Canvas setup:**
- The canvas is positioned absolutely over the text container, same dimensions.
- Use `window.devicePixelRatio` for crisp rendering on retina displays.
- Resize handler to keep canvas in sync with text layout.

### `ui/Controls.js`

Minimal UI. A bar below the sonnet with:

```
[ ▶ Play ]  [ ⟲ Restart ]  [ Speed: 0.5x  0.75x  1x ]
```

- Play toggles to Pause when playing.
- Restart resets everything (engine state + timer).
- Speed buttons set `timerSync.playbackRate`.
- Styled minimally — small, unobtrusive, at the bottom of the viewport.

### `main.js`

Wiring:

```js
import data from './data/sonnet2.json'
import { RippleEngine } from './engine/RippleEngine.js'
import { TimerSync } from './engine/TimerSync.js'
import { TextRenderer } from './renderer/TextRenderer.js'
import { CanvasRenderer } from './renderer/CanvasRenderer.js'
import { Controls } from './ui/Controls.js'

// 1. Create text renderer, build DOM
const textRenderer = new TextRenderer({
  containerEl: document.getElementById('sonnet-container'),
  words: data.words,
  lines: data.lines
})
textRenderer.render()

// 2. Create engine
const engine = new RippleEngine({
  words: data.words,
  connections: data.connections
})

// 3. Create timer sync
const timerSync = new TimerSync({
  timestamps: data.timestamps_ms,
  onWordStart: (wordId) => {
    engine.triggerWord(wordId, timerSync.currentTime)
  },
  onWordEnd: (wordId) => { /* optional: clear "speaking" state */ }
})

// 4. Create canvas renderer
const canvasRenderer = new CanvasRenderer({
  canvasEl: document.getElementById('ripple-canvas'),
  textRenderer,
  rippleEngine: engine
})

// 5. Animation loop — separate from canvas, updates text styles
function updateLoop() {
  const t = timerSync.currentTime
  const energies = engine.getAllEnergies(t)
  textRenderer.update(energies, timerSync.currentActiveWordId)
  requestAnimationFrame(updateLoop)
}
requestAnimationFrame(updateLoop)

// 6. Controls
const controls = new Controls({
  onPlay: () => { timerSync.play(); canvasRenderer.start() },
  onPause: () => { timerSync.pause(); canvasRenderer.stop() },
  onRestart: () => { engine.reset(); timerSync.restart() },
  onSpeedChange: (rate) => { timerSync.playbackRate = rate }
})
```

---

## Visual Design Notes

### Color Palette

```
Background:       #0a0a0f (near-black with a hint of blue)
Text base:        #c8c0b4 (warm grey — parchment tone)
Text glow:        #f5efe6 (warm white — when energy is high)
Primary ripple:   #ffffff at 40% opacity
Phonetic ripple:  #7898ff (periwinkle blue)
Semantic ripple:  #ffbe50 (amber gold)
Etymological:     #8cdca0 (sage)
Pun:              #dc82dc (orchid)
Controls:         #4a4a52 background, #9a9a9a text
```

### Font Loading

```html
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet">
```

### Responsive Behavior

- Desktop (>900px): sonnet at 28px, centered with generous margins.
- Tablet (600-900px): 22px, still centered.
- Mobile (<600px): 16px, full-width with padding. Ripple radius scales down proportionally.

---

## Definition of Done (Phase 1)

- [ ] Sonnet 2 text renders beautifully on screen, one line per row, couplet indented
- [ ] Pressing Play steps through words on a timer at realistic reading speed
- [ ] The "current word" gets a distinct highlight (class toggle)
- [ ] Each spoken word produces a visible expanding ripple circle on the canvas
- [ ] Connected words receive delayed secondary ripples in the appropriate color
- [ ] Word energy accumulates — words hit by multiple ripples glow more intensely
- [ ] The glow decays over ~3 seconds when no new ripples arrive
- [ ] Play / Pause / Restart controls work
- [ ] Speed control (0.5x, 0.75x, 1x) works
- [ ] The whole thing looks good — dark background, warm text, colored ripples, no visual clutter
- [ ] Code is modular — engine knows nothing about DOM, renderers know nothing about timing

---

## Implementation Order

1. **Set up `index.html` and `style.css`** — static page with the sonnet text hardcoded. Get typography and layout right first. This is the foundation everything else sits on.

2. **Build `TextRenderer.js`** — generate the word spans from JSON data. Verify positioning with `getWordPosition()`. Add the `--energy` CSS custom property and make sure the glow/scale CSS responds to it (test by manually setting values).

3. **Build `CanvasRenderer.js`** — overlay a canvas. Test by manually drawing a ripple at a known word position. Get the circle animation loop working. Test multiple simultaneous ripples.

4. **Build `RippleEngine.js`** — pure logic, testable without DOM. Write it, then test by calling `triggerWord()` manually and logging `getAllEnergies()` over time. Verify decay math. Verify propagation.

5. **Build `TimerSync.js`** — the frame-based stepper. Wire it to the engine. Hit play and watch words fire in sequence.

6. **Wire everything in `main.js`** — connect timer → engine → renderers. This is where it comes alive.

7. **Build `Controls.js`** — play/pause/restart/speed. Style them.

8. **Polish pass** — adjust timing constants (decay rate, propagation delay, ripple duration, glow intensity) until it feels right. This is the "tuning the instrument" step and will take iteration.