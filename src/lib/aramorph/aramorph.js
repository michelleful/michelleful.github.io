/**
 * Buckwalter Arabic Morphological Analyzer — client-side port
 *
 * Usage:
 *   import { init, analyze } from './aramorph.js';
 *   await init();                    // fetches JSON data files once
 *   const results = analyze("كتاب"); // returns array of analysis objects
 */

import {
  unicodeToBuckwalter,
  buckwalterToUnicode,
  buckwalterToALA,
} from "./transliterate.js";

let prefixes = null;
let stems = null;
let suffixes = null;
let tableAB = null;
let tableBC = null;
let tableAC = null; // loaded but unused — preserving original behaviour

const DATA_BASE = "/aramorph/data";

/**
 * Fetch and parse all 6 data files. Call once before analyze().
 */
export async function init() {
  if (prefixes) return; // already loaded

  const [pf, st, sf, ab, bc, ac] = await Promise.all([
    fetch(`${DATA_BASE}/prefixes.json`).then((r) => r.json()),
    fetch(`${DATA_BASE}/stems.json`).then((r) => r.json()),
    fetch(`${DATA_BASE}/suffixes.json`).then((r) => r.json()),
    fetch(`${DATA_BASE}/compat-ab.json`).then((r) => r.json()),
    fetch(`${DATA_BASE}/compat-bc.json`).then((r) => r.json()),
    fetch(`${DATA_BASE}/compat-ac.json`).then((r) => r.json()),
  ]);

  prefixes = pf;
  stems = st;
  suffixes = sf;
  tableAB = ab;
  tableBC = bc;
  tableAC = ac;
}

/**
 * Analyze a single Arabic word (Unicode).
 * Returns an array of result objects:
 *   { word, vowelled, transliteration, root, pos, gloss }
 */
export function analyze(arabicWord) {
  const buckWord = unicodeToBuckwalter(arabicWord);
  return analyzeBuckwalter(buckWord);
}

function analyzeBuckwalter(word) {
  const results = [];
  const seen = new Set();

  for (const alt of alternatives(word)) {
    for (const [pre, stem, suf] of segment(alt)) {
      if (!(pre in prefixes) || !(stem in stems) || !(suf in suffixes)) {
        continue;
      }
      const solutions = checkCompatibility(alt, pre, stem, suf);
      for (const sol of solutions) {
        const key = `${sol.vowelled}|${sol.pos}|${sol.gloss}`;
        if (!seen.has(key)) {
          seen.add(key);
          results.push(sol);
        }
      }
    }
  }
  return results;
}

/**
 * Generate spelling alternatives for the Buckwalter word.
 */
function alternatives(word) {
  const alts = [word];
  if (word.endsWith("w")) {
    alts.push(word + "A");
  }
  return alts;
}

/**
 * Generate all possible (prefix, stem, suffix) segmentations.
 * Prefix: 0–4 chars, suffix: 0–6 chars, stem: 1+ chars.
 */
function segment(word) {
  const segs = [];
  const len = word.length;

  for (let preLen = 0; preLen <= 4; preLen++) {
    let stemLen = len - preLen;
    let sufLen = 0;

    while (stemLen >= 1 && sufLen <= 6) {
      segs.push([
        word.slice(0, preLen),
        word.slice(preLen, preLen + stemLen),
        word.slice(preLen + stemLen),
      ]);
      stemLen--;
      sufLen++;
    }
  }
  return segs;
}

/**
 * Check prefix–stem–suffix compatibility and build result objects.
 */
function checkCompatibility(word, pre, stem, suf) {
  const solutions = [];

  for (const pEntry of prefixes[pre]) {
    for (const sEntry of stems[stem]) {
      // Check prefix–stem compatibility (table AB)
      if (!tableAB[pEntry.category]?.[sEntry.category]) continue;

      for (const xEntry of suffixes[suf]) {
        // Check stem–suffix compatibility (table BC)
        if (!tableBC[sEntry.category]?.[xEntry.category]) continue;

        const vowelled =
          pEntry.vowelled + sEntry.vowelled + xEntry.vowelled;

        let gloss = `${pEntry.gloss} + ${sEntry.gloss} + ${xEntry.gloss}`;
        gloss = gloss.trim().replace(/^\+\s*/, "").replace(/\s*\+\s*$/, "").trim();

        solutions.push({
          word: buckwalterToUnicode(word),
          vowelled: buckwalterToUnicode(vowelled),
          transliteration: buckwalterToALA(vowelled),
          root: buckwalterToUnicode(sEntry.root || ""),
          pos: sEntry.pos,
          gloss,
        });
      }
    }
  }

  return solutions;
}

/**
 * Return stub info for words not found in the dictionary.
 */
export function infoForWord(arabicWord) {
  return {
    word: arabicWord,
    vowelled: "",
    transliteration: buckwalterToALA(unicodeToBuckwalter(arabicWord)),
    root: "",
    pos: "",
    gloss: "Not found in dictionary",
  };
}
