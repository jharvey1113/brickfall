/* Plays Double Up headlessly: stub DOM, hand-cranked animation frames, a
   simple corner strategy, several games in a row. The browser pane throttles
   requestAnimationFrame, so this is where the game actually gets tested. */
const fs = require("fs"), vm = require("vm"), path = require("path");
const dir = process.argv[2] || ".";
const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/g).pop().replace(/^<script>|<\/script>$/g, "");
const realIds = new Set([...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]));
// elements that start hidden in the markup must start hidden here too, or the
// page's "is a modal open?" guards swallow every key
const hiddenIds = new Set();
for (const tag of html.match(/<[^>]+>/g) || []) {
  const id = /id="([^"]+)"/.exec(tag);
  if (id && /\shidden(\s|>|=)/.test(tag)) hiddenIds.add(id[1]);
}

let now = 0, timerId = 0, timers = [], frames = [];
const store = {}, missing = new Set(), els = {};

function mkEl(id) {
  const h = {}, kids = [];
  const el = {
    id, hidden: false, textContent: "", value: "", disabled: false, children: kids,
    style: new Proxy({}, { get: (t, k) => (k === "setProperty" ? () => {} : t[k] || ""), set: (t, k, v) => (t[k] = v, true) }),
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    dataset: {}, clientWidth: 380, clientHeight: 380, width: 380, height: 380, offsetWidth: 1,
    addEventListener(t, fn) { (h[t] = h[t] || []).push(fn); },
    removeEventListener() {}, append(...c) { kids.push(...c); },
    replaceChildren(...c) { kids.length = 0; kids.push(...c); },
    remove() {}, setAttribute() {}, getAttribute: () => null, insertAdjacentHTML() {},
    focus() {}, blur() {}, scrollIntoView() {}, setPointerCapture() {}, releasePointerCapture() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 380, height: 380 }),
    querySelector: () => null, querySelectorAll: () => [], closest: () => null,
    click() { (h.click || []).forEach(f => f({ preventDefault() {} })); },
    fire(type, ev) { (h[type] || []).forEach(f => f(Object.assign({ preventDefault() {} }, ev))); },
    getContext: () => new Proxy({}, {
      get: (t, k) => (k === "canvas" ? el
        : k === "measureText" ? () => ({ width: 10 })
        : () => ({ addColorStop() {}, data: [] }))
    })
  };
  Object.defineProperty(el, "innerHTML", { set(v) { el._html = v; }, get() { return el._html || ""; } });
  Object.defineProperty(el, "className", { set(v) { el._cls = v; }, get() { return el._cls || ""; } });
  return el;
}
const byId = id => {
  if (!realIds.has(id)) { missing.add(id); return null; }
  if (!els[id]) { els[id] = mkEl(id); els[id].hidden = hiddenIds.has(id); }
  return els[id];
};

const docHandlers = {};
// the hub's [data-go] buttons, so the harness can open a game the way a tap does
const goButtons = ["classic", "blast", "dbl", "ladder", "slots", "sweet"].map(go => {
  const b = mkEl("go-" + go);
  b.dataset.go = go;
  return b;
});
const ctx = {
  console,
  performance: { now: () => now },
  requestAnimationFrame: fn => { frames.push(fn); return frames.length; },
  cancelAnimationFrame: () => {},
  setTimeout: (fn, ms) => { const id = ++timerId; timers.push({ id, fn, at: now + (ms || 0) }); return id; },
  clearTimeout: id => { const i = timers.findIndex(t => t.id === id); if (i >= 0) timers.splice(i, 1); },
  setInterval: () => 0, clearInterval: () => {},
  matchMedia: () => ({ matches: false, addEventListener() {} }),
  localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => (store[k] = String(v)), removeItem: k => delete store[k] },
  Math, Date, JSON, Set, Map, Promise, Array, Object, String, Number, Boolean, isNaN, Float32Array,
  parseInt, parseFloat, URLSearchParams, encodeURIComponent, Proxy, Reflect, Error,
  fetch: async () => ({ ok: true, status: 200, json: async () => [], text: async () => "[]" }),
  location: { hostname: "localhost", search: "?solo&debug", href: "http://localhost/" },
  getComputedStyle: () => ({ fontFamily: "sans-serif" }),
  devicePixelRatio: 1, innerWidth: 390, innerHeight: 844,
  addEventListener() {}, removeEventListener() {},
  AudioContext: function () {
    const param = () => ({ value: 0, setValueAtTime() {}, setTargetAtTime() {}, linearRampToValueAtTime() {},
      exponentialRampToValueAtTime() {}, cancelScheduledValues() {}, setValueCurveAtTime() {} });
    const node = () => new Proxy({
      connect: () => node(), disconnect() {}, start() {}, stop() {},
      type: "", buffer: null, onended: null, loop: false, curve: null, oversample: "none",
      getChannelData: () => new Float32Array(128)
    }, {
      get(t, k) {
        if (k in t) return t[k];
        if (typeof k === "string") return (t[k] = param());   // any audio param works
        return undefined;
      },
      set(t, k, v) { t[k] = v; return true; }
    });
    return {
      currentTime: 0, sampleRate: 44100, state: "running", destination: node(),
      resume: () => Promise.resolve(), close: () => Promise.resolve(),
      createOscillator: node, createGain: node, createBiquadFilter: node, createBufferSource: node,
      createDynamicsCompressor: node, createWaveShaper: node, createDelay: node, createStereoPanner: node,
      createConvolver: node, createChannelMerger: node, createAnalyser: node, createPeriodicWave: node,
      createBuffer: (ch, len) => ({ length: len, numberOfChannels: ch, getChannelData: () => new Float32Array(len) })
    };
  },
  speechSynthesis: { speak() {}, cancel() {}, getVoices: () => [] },
  SpeechSynthesisUtterance: function () { return {}; },
  HTMLInputElement: function () {}
};
ctx.window = ctx;
ctx.document = {
  body: mkEl("body"), documentElement: mkEl("html"), hidden: false, activeElement: null,
  getElementById: byId, createElement: t => mkEl(t),
  addEventListener(t, fn) { (docHandlers[t] = docHandlers[t] || []).push(fn); },
  removeEventListener() {},
  querySelector: sel => {
    const m = /data-go="([a-z]+)"/.exec(sel);
    if (m) { const b = mkEl("go-" + m[1]); b.dataset.go = m[1]; return b; }
    return null;
  },
  querySelectorAll: sel => (sel === "[data-go]" ? goButtons : [])
};
vm.createContext(ctx);
vm.runInContext(script, ctx);

// ---- hand-cranked frames -------------------------------------------------
function step(ms) {
  const end = now + ms;
  while (now < end) {
    now += 16;
    for (const t of timers.filter(t => t.at <= now)) { timers = timers.filter(x => x !== t); t.fn(); }
    const due = frames; frames = [];
    for (const f of due) f(now);
  }
}
const press = key => (docHandlers.keydown || []).forEach(fn =>
  fn({ key, target: {}, repeat: false, preventDefault() {}, stopPropagation() {} }));

// ---- open the game -------------------------------------------------------
const D = ctx.window.__D;
if (!D) { console.log("no debug handle — is the ?debug export still in the page?"); process.exit(1); }
goButtons.find(b => b.dataset.go === "dbl").click();     // open Double Up
step(200);

// ---- undo, new game, and the end-of-game buttons -----------------------
{
  const dbg = ctx.window.__D;
  dbg.reset(); step(100);
  const seq = ["ArrowDown", "ArrowLeft", "ArrowRight", "ArrowUp"];
  for (let i = 0; i < 30; i++) { press(seq[i % 4]); step(120); }
  const before = dbg.debug;
  press("z"); step(60);
  const after = dbg.debug;
  console.log("undo:", `score ${before.score} -> ${after.score}`,
              `| undos ${before.undos} -> ${after.undos}`,
              `| grid changed: ${before.grid !== after.grid}`,
              `| button: ${byId("dblUndo").textContent}`);
  byId("dblNew").click(); step(60);
  const fresh = dbg.debug;
  const tiles = fresh.grid.split(/[,|]/).filter(v => v.trim() !== "0").length;
  console.log("new game:", `score ${fresh.score}, undos ${fresh.undos}, tiles on board ${tiles}`);
}

const games = Number(process.argv[3] || 3);
let results = [];
for (let g = 0; g < games; g++) {
  const dbg = ctx.window.__D;
  if (!dbg) break;
  dbg.reset();
  step(100);
  const seq = ["ArrowDown", "ArrowLeft", "ArrowDown", "ArrowRight"];
  let moves = 0;
  while (byId("dblDone").hidden && moves < 4000) {
    press(seq[moves % 4]);
    if (moves % 13 === 12) press("ArrowUp");     // break out of a stuck corner
    step(120);
    moves++;
  }
  const d = dbg.debug;
  results.push({ moves, score: d.score, best: dbg.best, bestTile: dbg.bestTile,
                 over: !byId("dblDone").hidden, title: byId("dblDoneTitle").textContent,
                 note: byId("dblDoneNote").textContent, grid: d.grid, phase: d.phase });
}
for (const r of results) {
  console.log(`game: ${r.moves} moves, score ${r.score}, biggest ${r.bestTile}, ended "${r.title}" (${r.phase})`);
  console.log("   " + r.grid);
  if (r.note) console.log("   " + r.note);
}
const last = ctx.window.__D;
if (last) console.log("lifetime best:", last.best, "best tile:", last.bestTile);
if (missing.size) console.log("MISSING ELEMENT IDS:", [...missing].join(", "));
