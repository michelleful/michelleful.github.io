/**
 * Buckwalter ↔ Unicode ↔ ALA transliteration
 *
 * Ported from transliterate.py in FuzzyArabicDict.
 */

// Buckwalter encoding characters (56 total)
const buck = "'|>&<}AbptvjHxd*rzs$SDTZEg_fqklmnhwYyFNKaui~o0123456789`{";

// Corresponding Unicode code points
const unicodePoints = [
  ...range(0x0621, 0x063b), // hamza through ghayn
  ...range(0x0640, 0x0653), // tatweel through sukuun
  ...range(0x0660, 0x066a), // numerals
  ...range(0x0670, 0x0672), // dagger alif, wasla
];

// ALA/Wehr readable transliteration
const ala = [
  // hamza through ghayn
  "\u02BE","\u02BE\u0101","\u02BE","\u02BE","\u02BE","\u02BE",
  "\u0101","b","h","t","\u1E6F","j","\u1E25","\u1E35",
  "d","\u1E0F","r","z","s","\u0161","\u1E63","\u1E0D","\u1E6D","\u1E93",
  "\u02BF","\u1E21",
  // tatweel through sukuun
  "","f","q","k","l","m","n","h","w","\u0101","y",
  "an","un","in","a","u","i","~","",
  // numerals
  "0","1","2","3","4","5","6","7","8","9",
  // dagger alif, wasla
  "\u0101","",
];

function range(start, end) {
  const r = [];
  for (let i = start; i < end; i++) r.push(i);
  return r;
}

// Build lookup maps
const buck2unicMap = {};
const unic2buckMap = {};
for (let i = 0; i < buck.length; i++) {
  buck2unicMap[buck[i]] = String.fromCharCode(unicodePoints[i]);
  unic2buckMap[String.fromCharCode(unicodePoints[i])] = buck[i];
}

/**
 * Buckwalter → Unicode Arabic
 */
export function buckwalterToUnicode(str) {
  let result = "";
  for (const ch of str) {
    result += buck2unicMap[ch] || ch;
  }
  // Replace alef wasla with plain alef (displays better)
  return result.replace(/\u0671/g, "\u0627");
}

/**
 * Unicode Arabic → Buckwalter
 */
export function unicodeToBuckwalter(str) {
  let result = "";
  for (const ch of str) {
    result += unic2buckMap[ch] || ch;
  }
  return result;
}

/**
 * Buckwalter → ALA romanization
 */
export function buckwalterToALA(str) {
  // Handle shadda (doubled letters) first
  let s = str.replace(/(.)~/g, "$1$1");

  // Convert letter by letter
  let result = "";
  for (const ch of s) {
    const idx = buck.indexOf(ch);
    result += idx >= 0 ? ala[idx] : ch;
  }

  // Post-processing
  result = result.replace(/uw/g, "\u016B");   // uw → ū
  result = result.replace(/iy/g, "\u012B");    // iy → ī
  result = result.replace(/\u0101an/g, "an"); // nunated alif
  result = result.replace(/\u0101a/g, "\u0101"); // āa → ā
  result = result.replace(/\u016Bu/g, "\u016B");    // ūu → ū
  result = result.replace(/lll/g, "ll");       // Allah fix

  return result;
}
