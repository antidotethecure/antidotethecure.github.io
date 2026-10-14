/* Sports Bar Package perk: FOOTBALL SQUARES (2026-10). Adds a "🏈 Squares" tab to the scoreboard sheet when the client
   has a board up. A promotional contest with a FREE way in (California Penal Code 319: purchase-only entry would be an illegal
   lottery): every Rewards member gets 1 FREE square per board, no purchase necessary ("Get my free square"); each purchase can
   add one more square (staff scan the member's Rewards card in Christian HQ → "+1 Squares ticket"), up to the owner's per-person
   cap. No paid entry fee, no cash prizes. Prizes are set by the owner in
   the back office (food, merch, % off, a non-alcoholic drink, or % off a drink 21+).
   How it plays: a 10x10 board per NFL / college game. Rewards members (with a name) claim their squares before kickoff,
   tapping them or using auto-pick. At kickoff entries lock and the row (home) / column (away) digits are drawn and shown.
   After Q1, halftime, Q3 and the final, the last digit of each team's score picks the winning square; an unclaimed square
   rolls its prize to the next quarter if the owner has rollover on.
   The server owns everything (Code.gs squares_get / squares_claim / squares_admin); this file only shows it.
   Config: SPORTS_CFG.perks.squares = { on, slug, owner, api: fn → /exec URL, member: fn → {id,name}|null, join: fn(cb) }.
   ?test=1 (or squares.mock:true) uses the offline demo backend in squares-mock.js (made-up data, this browser only).
   If the deployed backend doesn't have the squares endpoints yet, the tab simply stays hidden. */
(function () {
  "use strict";
  var SB = window.SportsBar, CFG = window.SPORTS_CFG || {}, SQ = (CFG.perks || {}).squares;
  if (!SB || !SQ || !SQ.on) return;
  var MOCK = !!SQ.mock || /[?&]test=1(&|$)/.test(location.search);
  var esc = SB.esc, boards = [], ready = false, sel = {}, busy = false, timer = null, QN = { q1: "Q1", q2: "Halftime", q3: "Q3", final: "Final" }, Q = ["q1", "q2", "q3", "final"];
  var ICON = { food: "🍔", drink: "🥤", drinkdeal: "🍹", merch: "🧢", percent: "🏷️" };
  function dev() { try { var d = localStorage.getItem("sp-dev"); if (!d) { d = "D" + Math.random().toString(36).slice(2, 12); localStorage.setItem("sp-dev", d); } return d; } catch (e) { return ""; } }
  function me() { try { return SQ.member ? SQ.member() : null; } catch (e) { return null; } }
  var mockReady = null;
  function loadMock() {
    if (window.SQUARES_MOCK) return Promise.resolve();
    if (mockReady) return mockReady;
    mockReady = new Promise(function (res) { var s = document.createElement("script"); s.src = (SQ.mockUrl || "../sports/squares-mock.js") + "?v=sq2"; s.onload = res; s.onerror = res; document.head.appendChild(s); });
    return mockReady;
  }
  function call(body) {
    body.slug = SQ.slug;
    if (MOCK) return loadMock().then(function () { return window.SQUARES_MOCK ? window.SQUARES_MOCK(body) : { ok: false }; });
    var api = typeof SQ.api === "function" ? SQ.api() : SQ.api;
    if (!api) return Promise.resolve({ ok: false, reason: "offline" });
    return fetch(api, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(body) }).then(function (r) { return r.json(); }).catch(function () { return { ok: false, reason: "Can't reach the server." }; });
  }
  function load() {
    var m = me();
    var q = { type: "squares_get", member: m ? m.id : "" };
    if (MOCK && m && m.card) { q.card = m.card; q.name = m.name; }   // test mode only: lets Christian HQ (?test=1) find this guest by card ID
    return call(q).then(function (r) {
      if (!r || !r.ok) return;   // not deployed yet ("unknown type") or offline: keep the tab hidden / keep the last boards
      boards = (r.boards || []).filter(function (b) { return b.status !== "void"; }).sort(function (a, b) { return a.kickoff - b.kickoff; });
      if (!ready && boards.length) { ready = true; SB.addTab({ id: "squares", label: "🏈 Squares", visible: function () { return boards.length > 0; }, render: render });
        if (window.MelodyGames && SQ.tile !== false) window.MelodyGames.register({ id: "squares", order: 15, icon: "🏈", title: "Football Squares", sub: "1 free square per game for Rewards members. No purchase necessary.", tag: "Free",
          start: function () { window.MelodyGames.close(); SB.open("squares"); } }); }
      else if (SB.isOpen()) SB.render();
    });
  }
  function initials(n) { var p = String(n || "").replace(/[^A-Za-z0-9 ]/g, " ").trim().split(/\s+/); return ((p[0] || "")[0] || "") + ((p[1] || "")[0] || ""); }
  function prizeLine(p) { return p ? (ICON[p.kind] || "🎁") + " " + esc(p.text) + (p.adult ? " <small>(21+)</small>" : "") : '<span style="color:var(--sp-dim)">no prize</span>'; }
  function statusChip(b) {
    if (b.status === "open") return '<span>🟢 Open · entries lock at kickoff</span>';
    if (b.status === "live" || (b.score && b.score.state === "in")) return '<span class="lv"><i class="sp-dot"></i>LIVE' + (b.score ? " · " + esc(b.away) + " " + b.score.away + " – " + b.score.home + " " + esc(b.home) : "") + '</span>';
    if (b.status === "final") return '<span>🏁 Final' + (b.results.final ? " · " + esc(b.away) + " " + b.results.final.away + " – " + b.results.final.home + " " + esc(b.home) : "") + '</span>';
    return '<span>🔒 Locked · numbers revealed</span>';
  }
  function gridHTML(b) {
    var win = {}; Q.forEach(function (q) { var r = b.results[q]; if (r) (win[r.sq] = win[r.sq] || []).push(QN[q].replace("Halftime", "H").replace("Final", "F")); });
    var mine = {}; (b.mine || []).forEach(function (s) { mine[s] = 1; });
    var s = b.id, open = b.status === "open", h = '<div class="sq-axis"><span>' + esc(b.away || "Away") + ' →</span></div><div class="sq-wrap"><div class="sq-side"><span>' + esc(b.home || "Home") + ' →</span></div><div class="sq-grid" role="grid" aria-label="Football squares board">';
    h += '<div class="sq-h sq-c0">' + (b.cols ? "#" : "?") + '</div>';
    for (var c = 0; c < 10; c++) h += '<div class="sq-h">' + (b.cols ? b.cols[c] : "?") + '</div>';
    for (var r = 0; r < 10; r++) {
      h += '<div class="sq-h">' + (b.rows ? b.rows[r] : "?") + '</div>';
      for (var c2 = 0; c2 < 10; c2++) {
        var k = r * 10 + c2, who = b.claims[k], w = win[k], cls = "sq-s" + (who ? " t" : "") + (mine[k] ? " me" : "") + (sel[s] && sel[s][k] ? " sel" : "") + (w ? " win" : "");
        h += '<button type="button" class="' + cls + '" data-sq="' + k + '" data-b="' + esc(s) + '"' + (open && !who ? "" : " tabindex=-1") + ' aria-label="Square ' + (r + 1) + "-" + (c2 + 1) + (who ? ", " + esc(who) : ", open") + (w ? ", winner " + w.join(" ") : "") + '">' +
          (w ? '<em>' + w.join("") + '</em>' : '') + (who ? esc(initials(who)) : "") + '</button>';
      }
    }
    return h + '</div></div>';
  }
  function winnersHTML(b) {
    var rows = Q.filter(function (q) { return b.results[q]; }).map(function (q) {
      var r = b.results[q], line = esc(b.away) + " " + r.away + " – " + r.home + " " + esc(b.home) + " · box " + (r.home % 10) + "-" + (r.away % 10);
      var pz = (r.prizes || []).map(function (k) { return b.prizes[k] ? esc(b.prizes[k].text) : ""; }).filter(Boolean).join(" + ");
      var res = r.status === "won" ? "🏆 <b>" + esc(r.name) + (r.mine ? " (you!)" : "") + "</b>" + (pz ? " wins " + pz : "") + (b.redeemed[q] ? " · ✓ redeemed" : (r.mine ? " · show this to your server" : ""))
        : r.status === "rolled" ? "Nobody on that box: the prize rolls to the next quarter" : "Nobody on that box: unclaimed";
      return '<div class="sq-wr' + (r.mine ? " me" : "") + '"><b>' + QN[q] + '</b><span>' + line + '<br>' + res + '</span></div>';
    });
    return rows.length ? '<div class="sp-lbl">Winners</div>' + rows.join("") : "";
  }
  function render(box, H) {
    var m = me(), h = "";
    if (!boards.length) { box.innerHTML = '<div class="sp-empty"><b>No squares board right now</b>' + esc(SQ.owner || "The bar") + ' posts one for big game days.</div>'; return; }
    boards.forEach(function (b) {
      var n = (b.mine || []).length, pick = Object.keys(sel[b.id] || {}).length, open = b.status === "open";
      var my = b.my || { have: n, tickets: 0, allowed: 1 }, allowed = Math.max(1, Math.min(b.per, my.allowed || 1)), left = Math.max(0, allowed - n), tk = my.tickets || 0;
      h += '<div class="sp-fx sq-card"><div class="sp-tp">' + statusChip(b) + '<span>' + esc((b.league === "cfb" ? "College" : "NFL") + " · " + H.fmtTime(b.kickoff, true)) + '</span></div>' +
        '<div class="ev">' + esc(b.game) + '</div><div class="sq-legal">' + esc(b.legal || "No purchase necessary · 1 free square per member per game · extra squares with purchase") + (b.test ? " · TEST MODE (made-up data)" : "") + '</div>' +
        '<div class="sq-prizes">' + Q.map(function (q) { return '<div><small>' + QN[q] + '</small>' + prizeLine(b.prizes[q]) + '</div>'; }).join("") + '</div>' +
        '<div class="sp-info" style="border:0;padding-top:0"><div>👥 ' + b.entrants + ' of ' + b.max + ' players · up to ' + b.per + ' squares each (1 free + purchases)' + (m ? ' · <b>you: ' + n + ' square' + (n === 1 ? '' : 's') + (tk ? ', ' + tk + ' purchase ticket' + (tk === 1 ? '' : 's') : '') + '</b>' : '') + (b.rollover ? ' · unclaimed prizes roll over' : '') + '</div></div>' +
        gridHTML(b) +
        (open ? (!m || n === 0 ? '<div class="sq-act"><button type="button" class="sp-btn" data-free="' + esc(b.id) + '">🎟️ Get my free square' + (pick ? " (the one you picked)" : "") + '</button></div>' +
            '<p class="sp-cred">' + (m ? "No purchase necessary. Tap an empty square to choose it, or we'll pick one for you." : "Free for Rewards members: 1 free square per game, no purchase necessary. You'll be asked to join (free).") + '</p>'
          : left > 0 ? '<div class="sq-act"><button type="button" class="sp-btn" data-claim="' + esc(b.id) + '"' + (pick ? "" : " disabled") + '>✅ Claim ' + (pick || "") + ' square' + (pick === 1 ? "" : "s") + '</button><button type="button" class="sp-btn sq-alt" data-auto="' + esc(b.id) + '">🎲 Auto-pick ' + left + '</button></div>' +
            '<p class="sp-cred">Your purchases added ' + left + ' more square' + (left === 1 ? "" : "s") + ': tap empty squares, then Claim.</p>'
          : n >= b.per ? '<p class="sp-cred">✅ You have the most squares allowed (' + b.per + '). Numbers are drawn at kickoff.</p>'
          : '<p class="sp-cred">✅ You\'re in with ' + n + ' square' + (n === 1 ? "" : "s") + '. Want more? Each purchase adds a square (up to ' + b.per + '): ask your server to scan your Rewards card.</p>') : '') +
        winnersHTML(b) + '</div>';
    });
    box.innerHTML = h + '<p class="sp-cred">Row = last digit of the home score, column = away score, at the end of Q1, halftime, Q3 and the final.</p>';
    [].forEach.call(box.querySelectorAll("[data-sq]"), function (el) {
      el.onclick = function () {
        var bid = el.getAttribute("data-b"), k = +el.getAttribute("data-sq"), b = boards.filter(function (x) { return x.id === bid; })[0];
        if (!b || b.status !== "open" || b.claims[k]) return;
        var s = sel[bid] = sel[bid] || {}, mm = me(), have = (b.mine || []).length, left = !mm || !have ? 1 : Math.max(0, Math.min(b.per, (b.my && b.my.allowed) || 1) - have);
        if (s[k]) delete s[k]; else { if (left === 1 && Object.keys(s).length >= 1) { s = sel[bid] = {}; } else if (Object.keys(s).length >= left) { H.toast(left ? "You can pick " + left + " more square" + (left === 1 ? "" : "s") + "." : "Each purchase adds a square: ask your server to scan your Rewards card."); return; } s[k] = 1; }
        render(box, H);
      };
    });
    [].forEach.call(box.querySelectorAll("[data-claim],[data-auto]"), function (el) {
      el.onclick = function () { var bid = el.getAttribute("data-claim") || el.getAttribute("data-auto"); claim(bid, !!el.getAttribute("data-auto"), box, H); };
    });
    // free square: the one square they picked, or one picked for them (no purchase necessary)
    [].forEach.call(box.querySelectorAll("[data-free]"), function (el) {
      el.onclick = function () { var bid = el.getAttribute("data-free"); claim(bid, !Object.keys(sel[bid] || {}).length, box, H, 1); };
    });
  }
  function claim(bid, auto, box, H, only) {
    if (busy) return;
    var m = me();
    if (!m || !m.id || !m.name) {
      if (SQ.join) { H.close(); SQ.join(function () { SB.open("squares"); setTimeout(function () { claim(bid, auto, box, H, only); }, 400); }); }
      else H.toast("Join Rewards (free) to play Football Squares.");
      return;
    }
    busy = true;
    var body = { type: "squares_claim", board: bid, member: m.id, name: m.name, dev: dev() };
    if (auto) body.auto = only || 99; else body.squares = Object.keys(sel[bid] || {}).map(Number).slice(0, only || 100);
    call(body).then(function (r) {
      busy = false;
      if (r && r.ok) { sel[bid] = {}; boards = boards.map(function (b) { return b.id === bid ? r.board : b; }); H.toast("🏈 You're in: " + r.got.length + (only ? " free" : "") + " square" + (r.got.length === 1 ? "" : "s") + ". Numbers are drawn at kickoff."); }
      else { H.toast(esc((r && r.reason) || "Didn't work. Try again.")); if (r && r.locked) load(); }
      SB.render();
    });
  }
  setTimeout(load, 2000);
  var lastLoad = Date.now();   // 30 s while the scoreboard is open; otherwise a light check every 5 minutes for new boards
  timer = setInterval(function () { if (document.hidden) return; if (SB.isOpen() || Date.now() - lastLoad > 3e5) { lastLoad = Date.now(); load(); } }, 30000);
  window.SportsSquares = { load: load, boards: function () { return boards; }, mock: MOCK };
})();
