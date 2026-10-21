/* Football Squares TEST/DEMO backend (offline). It mirrors the squares_get / squares_claim / squares_admin endpoints in
   command-center/clients/melody-lax/signup-sheet/Code.gs so the guest app (?test=1) and Christian HQ (?test=1) work before
   the Apps Script is deployed. State lives in this browser's localStorage, shared by both pages on the same site.
   Made-up data only; nothing is sent anywhere. Scores for scoring come from ESPN's public summary JSON (CORS "*"), the
   same source the server uses. window.SQUARES_MOCK(body) → Promise<response>. */
(function () {
  "use strict";
  if (window.SQUARES_MOCK) return;
  var KEY = "ssai-squares-mock-v1", Q = ["q1", "q2", "q3", "final"], QN = { q1: "Q1", q2: "Halftime", q3: "Q3", final: "Final" };
  var KINDS = { food: 1, drink: 1, drinkdeal: 1, merch: 1, percent: 1 };
  var MONEY = /\$|\bcash\b|\bmoney\b|gift ?card|venmo|zelle|paypal|cash ?app|bitcoin|crypto|\bdollars?\b|\busd\b|credit/i;
  var BOOZE = /margarita|beer|wine|shot|cocktail|tequila|vodka|whiske?y|bourbon|rum\b|gin\b|mimosa|martini|sangria|alcohol|bottle|mule|seltzer|cider|sake|soju|michelada|paloma|old fashioned|irish/i;
  var LEAGUES = { nfl: "football/nfl", cfb: "football/college-football" };
  var SLUGS = { "melody-bar-grill": "Melody" };
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { return {}; } }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  function digits() { var a = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]; for (var i = 9; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function short(n) { var p = String(n || "").trim().split(/\s+/); return p[0] ? p[0] + (p[1] ? " " + p[1].charAt(0) + "." : "") : ""; }
  function prize(p) {
    if (!p || !p.kind) return null;
    if (!KINDS[p.kind]) return { err: "Prizes can only be food, merch, % off, a non-alcoholic drink or % off a drink (21+)." };
    var text = String(p.text || "").trim().slice(0, 60);
    if (MONEY.test(text)) return { err: "No cash, gift cards or money prizes: this is a free promotional contest. Use food, a drink, merch or % off." };
    if (p.kind === "percent" || p.kind === "drinkdeal") { var pc = Math.round(+p.percent); if (!(pc >= 5 && pc <= 50)) return { err: "% off must be 5 to 50." };
      return { kind: p.kind, percent: pc, text: pc + "% off " + (text || (p.kind === "drinkdeal" ? "a drink" : "your check")), adult: p.kind === "drinkdeal" }; }
    if (text.length < 3) return { err: "Describe the prize (3 to 60 characters)." };
    if (p.kind === "drink" && BOOZE.test(text)) return { err: "No free alcohol (California ABC). Use a non-alcoholic drink, or % off a drink (21+)." };
    return { kind: p.kind, text: text };
  }
  // free entry: 1 free square per member per board + 1 per purchase ticket, up to the owner's cap (same as Code.gs sqAllowed)
  function tix(b, m) { var t = (b.tickets || {})[m]; return t ? +t.n || 0 : 0; }
  function allowed(b, m) { return Math.min(b.per, 1 + tix(b, m)); }
  var LEGAL = "No purchase necessary · 1 free square per member per game · extra squares with purchase";
  function whoList(b) { var n = {}; Object.keys(b.claims).forEach(function (k) { n[b.claims[k].m] = 1; }); return Object.keys(n); }
  function results(b, comp) {
    if (!b.rows || !b.cols || !comp) return b.results || {};
    var done = comp.state === "post" ? 4 : Math.max(0, (+comp.period || 0) - 1), res = {}, carry = [];
    var upto = function (side, n) { var l = comp[side].lines || [], s = 0; for (var i = 0; i < n && i < l.length; i++) s += +l[i] || 0; return s; };
    for (var qi = 0; qi < 4; qi++) {
      var q = Q[qi]; if (q === "final" ? comp.state !== "post" : qi + 1 > done) break;
      var h = q === "final" ? +comp.home.score || 0 : upto("home", qi + 1), a = q === "final" ? +comp.away.score || 0 : upto("away", qi + 1);
      var sq = b.rows.indexOf(h % 10) * 10 + b.cols.indexOf(a % 10), own = b.claims[sq], pend = carry.concat(b.prizes[q] ? [q] : []);
      if (own) { res[q] = { home: h, away: a, sq: sq, status: "won", member: own.m, name: own.n, prizes: pend }; carry = []; }
      else if (b.rollover && q !== "final") { res[q] = { home: h, away: a, sq: sq, status: "rolled", prizes: [] }; carry = pend; }
      else { res[q] = { home: h, away: a, sq: sq, status: "unclaimed", prizes: pend }; carry = []; }
    }
    return res;
  }
  var espnCache = {};
  function espn(b) {
    if (b.sim) return Promise.resolve(b.sim);   // test hook: a simulated score (SQUARES_MOCK._simulate)
    var c = espnCache[b.event]; if (c && Date.now() - c.ts < 60000) return Promise.resolve(c.v);
    return fetch("https://site.api.espn.com/apis/site/v2/sports/" + LEAGUES[b.league] + "/summary?event=" + encodeURIComponent(b.event)).then(function (r) { return r.json(); }).then(function (j) {
      var x = j.header.competitions[0], side = function (ha) { var t = x.competitors.filter(function (y) { return y.homeAway === ha; })[0] || {}; return { score: +t.score || 0, lines: (t.linescores || []).map(function (l) { return +(l.displayValue != null ? l.displayValue : l.value) || 0; }) }; };
      var st = x.status || {}, home = side("home"), v = { state: (st.type && st.type.state) || "pre", period: st.period || home.lines.length, home: home, away: side("away") };
      espnCache[b.event] = { ts: Date.now(), v: v }; return v;
    }).catch(function () { return null; });
  }
  function tick(b) {
    if (b.status === "open" && Date.now() >= b.kickoff) { b.status = "locked"; if (!b.rows) { b.rows = digits(); b.cols = digits(); } }
    if ((b.status === "locked" || b.status === "live") && (Date.now() >= b.kickoff || b.sim)) return espn(b).then(function (comp) {
      if (comp) { b.results = results(b, comp); b.status = comp.state === "post" ? "final" : comp.state === "in" ? "live" : b.status; b.score = comp; } return b; });
    return Promise.resolve(b);
  }
  function pub(b, member) {
    var claims = {}, mine = [];
    Object.keys(b.claims).forEach(function (k) { claims[k] = b.claims[k].n; if (member && b.claims[k].m === member) mine.push(+k); });
    var res = {}; Object.keys(b.results || {}).forEach(function (q) { var x = b.results[q]; res[q] = { home: x.home, away: x.away, sq: x.sq, status: x.status, name: x.name || "", prizes: x.prizes, mine: !!(member && x.member === member) }; });
    var shown = b.status !== "open";
    return { id: b.id, game: b.game, league: b.league, event: b.event, kickoff: b.kickoff, status: b.status, max: b.max, per: b.per, entrants: whoList(b).length,
      rows: shown ? b.rows : null, cols: shown ? b.cols : null, prizes: b.prizes, rollover: b.rollover, claims: claims, mine: mine, results: res, redeemed: b.redeemed || {}, home: b.home, away: b.away,
      score: b.score ? { state: b.score.state, period: b.score.period, home: b.score.home.score, away: b.score.away.score } : null, test: true,
      taken: Object.keys(b.claims).length, my: member ? { have: mine.length, tickets: tix(b, member), allowed: allowed(b, member), free: mine.length ? 0 : 1 } : null,
      legal: LEGAL + " · Prizes set by " + (SLUGS[b.slug] || "the restaurant") };
  }
  function full(b) {
    var p = pub(b, ""); p.rows = b.rows; p.cols = b.cols; p.by = b.by; p.slug = b.slug;
    p.entrantsList = whoList(b).map(function (id) { var n = "", sq = []; Object.keys(b.claims).forEach(function (k) { if (b.claims[k].m === id) { n = b.claims[k].n; sq.push(+k); } }); return { member: id, name: n, squares: sq, tickets: tix(b, id), allowed: allowed(b, id) }; });
    p.ticketsOut = Object.keys(b.tickets || {}).map(function (id) { var t = b.tickets[id]; return { member: id, name: t.name || "", n: +t.n || 0, last: t.log && t.log.length ? t.log[t.log.length - 1] : null }; });
    Object.keys(p.results).forEach(function (q) { p.results[q].member = (b.results[q] || {}).member || ""; });
    return p;
  }
  function handle(d) {
    var S = load(), boards = S.boards || (S.boards = []), slug = d.slug || "melody-bar-grill";
    var mine = boards.filter(function (b) { return b.slug === slug && b.status !== "void"; });
    var finish = function (o) { S.boards = boards; save(S); return o; };
    if (d.member && d.card) { S.members = S.members || {}; S.members[String(d.card).toUpperCase()] = { id: String(d.member), name: String(d.name || "") }; }
    if (d.type === "squares_get") return Promise.all(mine.map(tick)).then(function () { return finish({ ok: true, test: true, now: Date.now(), boards: mine.map(function (b) { return pub(b, d.member); }) }); });
    if (d.type === "squares_claim") {
      var b = mine.filter(function (x) { return x.id === d.board; })[0]; if (!b) return Promise.resolve({ ok: false, reason: "That board isn't open." });
      return tick(b).then(function () {
        if (b.status !== "open") return finish({ ok: false, locked: true, reason: "Entries are locked: the game has kicked off." });
        var m = String(d.member || ""), name = short(d.name);
        if (!m || !name) return { ok: false, join: true, reason: "Join Melody Rewards (free) with your name to play Football Squares." };
        var who = whoList(b), have = Object.keys(b.claims).filter(function (k) { return b.claims[k].m === m; }).length;
        if (who.indexOf(m) < 0 && who.length >= b.max) return { ok: false, full: true, reason: "This board is full (" + b.max + " players)." };
        var left = allowed(b, m) - have; if (left <= 0) return { ok: false, cap: have >= b.per, reason: have >= b.per ? "You have the most squares allowed on this board (" + b.per + ")." : "You've used your free square. Each purchase can add another: ask your server to scan your Rewards card." };
        var free = [], want = []; for (var i = 0; i < 100; i++) if (!b.claims[i]) free.push(i);
        if (d.auto) { var n = Math.min(left, Math.max(1, Math.round(+d.auto) || left)); for (var k = 0; k < n && free.length; k++) want.push(free.splice(Math.floor(Math.random() * free.length), 1)[0]); }
        else (d.squares || []).forEach(function (s) { s = Math.round(+s); if (s >= 0 && s < 100 && !b.claims[s] && want.indexOf(s) < 0 && want.length < left) want.push(s); });
        if (!want.length) return { ok: false, reason: "Those squares were just taken. Pick again." };
        want.forEach(function (s) { b.claims[s] = { m: m, n: name, t: Date.now() }; });
        return finish({ ok: true, got: want, board: pub(b, m) });
      });
    }
    if (d.type === "squares_admin") {
      var op = d.op || "list", all = boards.filter(function (x) { return x.status !== "void"; });
      if (op === "list") return Promise.all(all.map(tick)).then(function () { return finish({ ok: true, test: true, boards: all.map(full) }); });
      if (op === "create") {
        var g = d.game || {};
        if (!LEAGUES[g.league] || !/^\d{5,14}$/.test(String(g.event || ""))) return Promise.resolve({ ok: false, reason: "Pick an NFL or college game from the list." });
        if (!(+g.kickoff > Date.now())) return Promise.resolve({ ok: false, reason: "That game has already kicked off." });
        if (all.some(function (x) { return x.event === String(g.event); })) return Promise.resolve({ ok: false, reason: "There's already a board for that game." });
        var max = Math.round(+d.max || 20), per = Math.round(+d.per || 5);
        if (!(max >= 2 && max <= 100) || !(per >= 1 && per <= 50) || max * per > 100) return Promise.resolve({ ok: false, reason: "Players × squares each can't be more than 100 (e.g. 20 players × 5 squares)." });
        var pz = {}, bad = ""; Q.forEach(function (q) { var p = prize((d.prizes || {})[q]); if (p && p.err) bad = QN[q] + ": " + p.err; else if (p) pz[q] = p; });
        if (bad) return Promise.resolve({ ok: false, reason: bad });
        var nb = { id: "SQ" + Math.random().toString(36).slice(2, 12).toUpperCase(), slug: d.slug || "melody-bar-grill", league: g.league, event: String(g.event), game: String(g.title || "").slice(0, 80), kickoff: +g.kickoff, status: "open",
          max: max, per: per, rows: null, cols: null, prizes: pz, rollover: d.rollover !== false, claims: {}, results: {}, redeemed: {}, by: d.by || "Test owner", home: g.home || "", away: g.away || "" };
        boards.push(nb); return Promise.resolve(finish({ ok: true, board: full(nb) }));
      }
      if (op === "ticket") {   // "+1 Squares ticket" (test mode: the card ID or the member ID from the guest app on this browser)
        var key = String(d.card || d.member || "").trim(); if (!key) return Promise.resolve({ ok: false, reason: "Scan or type the guest's Rewards card ID." });
        var open = all.filter(function (x) { return x.status === "open" && x.kickoff > Date.now(); }).sort(function (a, c) { return a.kickoff - c.kickoff; });
        var tb = d.board ? open.filter(function (x) { return x.id === d.board; })[0] : open[0]; if (!tb) return Promise.resolve({ ok: false, reason: "No open Squares board right now." });
        var known = (S.members || {})[key.toUpperCase()] || null, id = known ? known.id : key, nm = known ? known.name : (d.name || "Test guest");
        var tk = tix(tb, id); if (1 + tk >= tb.per) return Promise.resolve({ ok: false, cap: true, reason: nm + " already has the most squares allowed on this board (" + tb.per + ": 1 free + " + tk + " with purchase)." });
        tb.tickets = tb.tickets || {}; var tt = tb.tickets[id] = tb.tickets[id] || { n: 0, name: short(nm), log: [] };
        tt.n += 1; tt.log.push({ by: d.by || "Test owner", ts: Date.now(), rcpt: String(d.rcpt || "").slice(0, 24) });
        return Promise.resolve(finish({ ok: true, member: { name: tt.name, card: known ? key.toUpperCase() : "", tickets: tt.n, allowed: allowed(tb, id) }, board: full(tb) }));
      }
      var bd = all.filter(function (x) { return x.id === d.board; })[0]; if (!bd) return Promise.resolve({ ok: false, reason: "Board not found." });
      if (op === "prizes") { if (bd.status === "final") return Promise.resolve({ ok: false, reason: "The game is over: prizes can't change now." });
        var np = {}, err = ""; Q.forEach(function (q) { if (bd.results[q]) { if (bd.prizes[q]) np[q] = bd.prizes[q]; return; } var p = prize((d.prizes || {})[q]); if (p && p.err) err = QN[q] + ": " + p.err; else if (p) np[q] = p; });
        if (err) return Promise.resolve({ ok: false, reason: err }); bd.prizes = np; return Promise.resolve(finish({ ok: true, board: full(bd) })); }
      if (op === "rollover") { bd.rollover = !!d.on; return Promise.resolve(finish({ ok: true, board: full(bd) })); }
      if (op === "lock") { if (bd.status !== "open") return Promise.resolve({ ok: false, reason: "Already locked." }); bd.status = "locked"; if (!bd.rows) { bd.rows = digits(); bd.cols = digits(); } return Promise.resolve(finish({ ok: true, board: full(bd) })); }
      if (op === "randomize") { if (bd.status !== "open") return Promise.resolve({ ok: false, reason: "Numbers are fixed once the board is locked." }); bd.rows = digits(); bd.cols = digits(); return Promise.resolve(finish({ ok: true, board: full(bd) })); }
      if (op === "redeem") { var r = bd.results[d.q]; if (!r || r.status !== "won") return Promise.resolve({ ok: false, reason: "No winner to redeem for that quarter." });
        if (bd.redeemed[d.q]) return Promise.resolve({ ok: false, dup: true, reason: "Already marked redeemed." });
        bd.redeemed[d.q] = { by: d.by || "Test owner", ts: Date.now() }; return Promise.resolve(finish({ ok: true, board: full(bd) })); }
      if (op === "void") { bd.status = "void"; return Promise.resolve(finish({ ok: true })); }
      return Promise.resolve({ ok: false, reason: "Unknown action." });
    }
    return Promise.resolve({ ok: false, reason: "unknown type" });
  }
  window.SQUARES_MOCK = function (body) { return handle(JSON.parse(JSON.stringify(body || {}))).then(function (r) { return JSON.parse(JSON.stringify(r)); }); };
  // TEST ONLY: fill a board with made-up "Test Guest NN" entrants / set a simulated score, for demos and screenshots.
  window.SQUARES_MOCK._fill = function (id, n, per) { var S = load(), b = (S.boards || []).filter(function (x) { return x.id === id; })[0]; if (!b) return false;
    var free = []; for (var i = 0; i < 100; i++) if (!b.claims[i]) free.push(i);
    for (var g = 1; g <= n; g++) for (var k = 0; k < (per || b.per) && free.length; k++) b.claims[free.splice(Math.floor(Math.random() * free.length), 1)[0]] = { m: "TEST" + g, n: "Test G" + ("0" + g).slice(-2) + "." };
    save(S); return true; };
  window.SQUARES_MOCK._simulate = function (id, comp) { var S = load(), b = (S.boards || []).filter(function (x) { return x.id === id; })[0]; if (!b) return false; b.sim = comp; if (b.status === "open") { b.status = "locked"; if (!b.rows) { b.rows = digits(); b.cols = digits(); } } save(S); return true; };
  window.SQUARES_MOCK._reset = function () { try { localStorage.removeItem(KEY); } catch (e) {} };
})();
