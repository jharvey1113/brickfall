// Builds Letter Ladder levels from words.txt and writes them into ../index.html
// between the LADDER-DATA markers. Every level is checked: each required word
// must be spellable from that level's letters.
// Usage: node tools/gen-ladder.js
const fs = require("fs");
const path = require("path");

const LEVEL_COUNT = 100;
const root = path.join(__dirname, "..");

// ---- word list ----
const words = [...new Set(
  fs.readFileSync(path.join(__dirname, "words.txt"), "utf8")
    .split("\n")
    .filter(l => !l.trim().startsWith("#"))
    .join(" ")
    .split(/\s+/)
    .map(w => w.trim().toUpperCase())
    .filter(w => /^[A-Z]{3,7}$/.test(w))
)].sort();
const dict = new Set(words);

// ---- helpers ----
const counts = w => { const c = {}; for (const ch of w) c[ch] = (c[ch] || 0) + 1; return c; };
function canMake(word, letters) {
  const have = counts(letters);
  for (const ch of word) { if (!have[ch]) return false; have[ch]--; }
  return true;
}
const isPluralish = w => w.endsWith("S") && !w.endsWith("SS") && dict.has(w.slice(0, -1));
const sortKey = w => w.split("").sort().join("");

// Small seeded RNG so the levels are the same every build
let seed = 20260919;
const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// Letters and required-word count for each level
function spec(level) {
  if (level <= 5) return { n: 4, k: level <= 2 ? 2 : 3 };
  if (level <= 15) return { n: 5, k: 3 + Math.floor((level - 6) / 4) };
  if (level <= 30) return { n: 6, k: 4 + Math.floor((level - 16) / 5) };
  if (level <= 50) return { n: 7, k: 6 + Math.floor((level - 31) / 7) };
  return { n: 7, k: Math.min(10, 8 + Math.floor((level - 51) / 17)) };
}

// Every dictionary word (3+ letters) spellable from a root word, minus plurals
function subwords(rootWord) {
  return words.filter(w => w !== rootWord && w.length <= rootWord.length && canMake(w, rootWord) && !isPluralish(w));
}

const usedKeys = new Set();
const levels = [];
for (let level = 1; level <= LEVEL_COUNT; level++) {
  const { n, k } = spec(level);
  const roots = shuffle(words.filter(w => w.length === n && !isPluralish(w) && !usedKeys.has(sortKey(w))));
  let picked = null;
  for (const r of roots) {
    const subs = subwords(r);
    // Early levels: keep it gentle (not too many possible words); later: need enough to choose from
    const min = k - 1, max = level <= 5 ? 6 : 999;
    if (subs.length >= min && subs.length <= max) { picked = { r, subs }; break; }
  }
  if (!picked) throw new Error(`No root found for level ${level} (n=${n}, k=${k})`);

  const { r, subs } = picked;
  usedKeys.add(sortKey(r));
  // Prefer a mix: longer words first, then fill with shorter ones
  const byLen = shuffle(subs.slice()).sort((a, b) => b.length - a.length);
  const longer = byLen.filter(w => w.length >= 4), shorter = byLen.filter(w => w.length === 3);
  const pool = [];
  while (pool.length < k - 1 && (longer.length || shorter.length)) {
    const takeLong = longer.length && (pool.length % 2 === 0 || !shorter.length);
    pool.push(takeLong ? longer.shift() : shorter.shift());
  }
  const required = [r, ...pool].sort((a, b) => a.length - b.length || a.localeCompare(b));

  // Verify
  for (const w of required) {
    if (!dict.has(w)) throw new Error(`Level ${level}: ${w} is not in the word list`);
    if (!canMake(w, r)) throw new Error(`Level ${level}: ${w} can't be made from ${r}`);
  }
  let letters = shuffle(r.split("")).join("");
  if (letters === r) letters = r.slice(1) + r[0];
  levels.push({ l: letters, w: required });
}

// ---- write into index.html ----
const file = path.join(root, "index.html");
const html = fs.readFileSync(file, "utf8");
const start = "/* LADDER-DATA:START */", end = "/* LADDER-DATA:END */";
const a = html.indexOf(start), b = html.indexOf(end);
if (a < 0 || b < a) throw new Error("LADDER-DATA markers not found in index.html");
const data = `${start}\n  const LADDER_WORDS = ${JSON.stringify(words.join(" "))};\n` +
  `  const LADDER_LEVELS = ${JSON.stringify(levels)};\n  `;
fs.writeFileSync(file, html.slice(0, a) + data + html.slice(b));

console.log(`${words.length} words, ${levels.length} levels written.`);
for (const i of [0, 1, 4, 5, 15, 30, 50, 99]) console.log(`  Level ${i + 1}: ${levels[i].l} -> ${levels[i].w.join(", ")}`);
