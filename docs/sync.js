/* Brickfall — progress that follows your name, not your phone.

   Every page on the family link loads this file. It keeps a copy of each
   player's game progress in Supabase (table arcade_saves), keyed by board
   group + player name, the same name used on the leaderboard. Open the link
   in Safari, a home-screen shortcut, or a new phone, type the same name, and
   your levels, coins and best scores come back.

   When two copies disagree, the one with more progress wins (higher level,
   more chips, better score), so a fresh start can never overwrite real
   progress. Without a name, in ?solo mode, or if the database can't be
   reached, games simply keep saving on the phone as before. */
(() => {
  const URL = "https://csnrueehdjxqfkbxqcxe.supabase.co";
  const KEY = "sb_publishable__Gjp9HLDRtXeJQ5XTuC_XA_Y8dF9UOY";
  const base = URL + "/rest/v1/arcade_saves";
  const headers = { apikey: KEY, "Content-Type": "application/json" };

  // key -> how to tell which copy has more progress
  const RULES = {
    "brickfall-best": "max",
    "brickfall-blast-best": "max",
    "brickfall-ladder": "level",   // Letter Ladder: { level, coins, ... }
    "brickfall-sweet": "level",    // Sweet Swap: { level, best }
    "brickfall-slots": "chips",    // Spin to Win: { chips, best, ... }
    "brickfall-double": "double",  // Double Up: { best, bestTile }
    "meatballkart-best": "fastest",
    "meatball-top": "max",
    "starswarm-top": "max",
    "boombots-top": "max",
    "meteoroids-hi": "max"
  };

  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  const params = new URLSearchParams(location.search);
  const script = document.currentScript;
  const reloadOnPull = !!(script && script.dataset.reload);
  const enabled = !/claude|anthropic/i.test(location.hostname) && !params.has("solo");

  const groupRaw = (params.get("group") || ls.get("brickfall-group") || "").trim();
  const GROUP = groupRaw.toLowerCase().replace(/[^a-z0-9 _-]/g, "").trim().slice(0, 32) || "family";
  const nameNow = () => (ls.get("brickfall-name") || "").trim().slice(0, 16);
  const playerKey = name => GROUP + "|" + name.toLowerCase();

  const num = v => { const n = parseFloat(v); return isFinite(n) ? n : null; };
  const obj = v => { try { return JSON.parse(v) || {}; } catch (e) { return {}; } };
  function pick(local, remote, rule) {
    if (local == null) return remote == null ? null : remote;
    if (remote == null) return local;
    if (rule === "max") return (num(remote) || 0) > (num(local) || 0) ? remote : local;
    if (rule === "fastest") { const a = num(local), b = num(remote); if (!(a > 0)) return remote; if (!(b > 0)) return local; return b < a ? remote : local; }
    const a = obj(local), b = obj(remote);
    if (rule === "level") {
      const sa = (a.level || 0) * 1e6 + (a.coins || a.best || 0), sb = (b.level || 0) * 1e6 + (b.coins || b.best || 0);
      return sb > sa ? remote : local;
    }
    if (rule === "chips") return (b.chips || 0) > (a.chips || 0) ? remote : local;
    if (rule === "double") {
      const m = Object.assign({}, a, b);
      m.best = Math.max(a.best || 0, b.best || 0); m.bestTile = Math.max(a.bestTile || 0, b.bestTile || 0);
      return JSON.stringify(m);
    }
    return local;
  }

  let online = enabled, lastSent = "", lastRemote = null, status = "", busy = false;
  async function req(url, opts) {
    const r = await fetch(url, Object.assign({ headers }, opts));
    if (!r.ok) throw new Error(r.status + " " + (await r.text()));
    return r.status === 204 || r.status === 201 ? null : r.json();
  }

  // Pull the saved copy, keep the better value for every game, write it back to both sides.
  async function sync(opts = {}) {
    const name = nameNow();
    if (!online || !name || busy) return;
    busy = true;
    try {
      const rows = await req(base + "?select=data&player=eq." + encodeURIComponent(playerKey(name)));
      const remote = (rows && rows[0] && rows[0].data) || {};
      let pulled = false;
      const merged = {};
      for (const k in RULES) {
        const local = ls.get(k), win = pick(local, remote[k] == null ? null : String(remote[k]), RULES[k]);
        if (win == null) continue;
        merged[k] = win;
        if (win !== local) { ls.set(k, win); pulled = true; }
      }
      const body = JSON.stringify(merged);
      if (body !== JSON.stringify(remote) && body !== lastSent) await push(name, merged);
      lastSent = body; lastRemote = merged;
      status = "saved";
      if (pulled && opts.first) {
        status = "restored";
        // the game already loaded its old save, so reload once to show the restored progress
        if (reloadOnPull) {
          let last = 0; try { last = +sessionStorage.getItem("arcade-sync-reload") || 0; } catch (e) {}
          if (Date.now() - last > 60000) { try { sessionStorage.setItem("arcade-sync-reload", String(Date.now())); } catch (e) {} location.reload(); return; }
        }
      }
    } catch (e) {
      // table missing or offline: stay quiet, try again later
      status = "offline";
    } finally { busy = false; renderBar(); }
  }
  function push(name, data, keepalive) {
    return req(base + "?on_conflict=player", {
      method: "POST", keepalive: !!keepalive,
      headers: Object.assign({}, headers, { Prefer: "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify({ player: playerKey(name), grp: GROUP, name, data, updated_at: new Date().toISOString() })
    });
  }
  // Quick save when the page is hidden or closed: merge with the last copy we saw on the
  // server (so nothing better gets overwritten) and send it with keepalive.
  function flush() {
    const name = nameNow(); if (!online || !name || !lastRemote) return;
    const merged = {};
    for (const k in RULES) { const w = pick(ls.get(k), lastRemote[k] == null ? null : String(lastRemote[k]), RULES[k]); if (w != null) merged[k] = w; }
    const body = JSON.stringify(merged);
    if (body === lastSent) return;
    lastSent = body; lastRemote = merged;
    push(name, merged, true).catch(() => {});
  }

  // ---- the little "saving as" bar on the door and arcade pages ----
  const bar = document.getElementById("saveBar");
  function renderBar(editing) {
    if (!bar) return;
    if (!enabled) { bar.hidden = true; return; }
    bar.hidden = false;
    const name = nameNow();
    if (!name || editing) {
      bar.innerHTML = '<form class="sb-form"><label for="sbName">' + (name ? "Change the name your progress saves under" : "Type your name to save your progress, and to get it back on any phone or home-screen shortcut") +
        '</label><span class="sb-row"><input id="sbName" maxlength="16" autocomplete="nickname" placeholder="Your name" value="' + (name || "").replace(/"/g, "&quot;") + '"><button type="submit">Save</button></span></form>';
      const f = bar.querySelector("form"), inp = bar.querySelector("input");
      f.addEventListener("submit", e => { e.preventDefault(); const v = inp.value.trim().slice(0, 16); if (!v) { inp.focus(); return; } ls.set("brickfall-name", v); lastSent = ""; renderBar(); sync({ first: true }); });
      return;
    }
    const note = status === "restored" ? "Progress restored" : status === "saved" ? "Progress saved" : status === "offline" ? "Saving on this phone" : "Checking your progress";
    bar.innerHTML = '<span class="sb-dot ' + (status === "offline" ? "off" : "") + '"></span><span>' + note + ' for <b></b></span><button type="button" class="sb-link">Not you?</button>';
    bar.querySelector("b").textContent = name;
    bar.querySelector("button").addEventListener("click", () => renderBar(true));
  }
  if (bar) {
    const css = document.createElement("style");
    css.textContent = "#saveBar{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;margin:0 auto;max-width:640px;padding:10px 14px;border-radius:12px;" +
      "background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);color:#e8ecf5;font-size:14px;line-height:1.4;text-align:center}" +
      "#saveBar[hidden]{display:none}#saveBar b{color:#ffd23f}.sb-dot{width:9px;height:9px;border-radius:50%;background:#3ddc84;flex:none}.sb-dot.off{background:#9aa4bb}" +
      ".sb-form{display:grid;gap:8px;width:100%}.sb-row{display:flex;gap:8px;justify-content:center}#saveBar input{font:inherit;font-size:16px;padding:8px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.3);background:rgba(0,0,0,.3);color:#fff;min-width:0;width:12em}" +
      "#saveBar button{font:inherit;font-weight:800;border-radius:10px;padding:8px 14px;border:0;background:#ffd23f;color:#1a1406;cursor:pointer}#saveBar .sb-link{background:none;color:#9fd8ff;padding:4px 6px;font-weight:600;text-decoration:underline}" +
      "#saveBar :focus-visible{outline:2px solid #ffd23f;outline-offset:2px}";
    document.head.appendChild(css);
    renderBar();
  }

  if (!enabled) return;
  sync({ first: true });
  setInterval(() => { if (!document.hidden) sync(); }, 30000);
  document.addEventListener("visibilitychange", () => { if (document.hidden) flush(); else sync({ first: true }); });
  addEventListener("pagehide", flush);
  addEventListener("storage", e => { if (e.key === "brickfall-name") { lastSent = ""; sync({ first: true }); } });
})();
