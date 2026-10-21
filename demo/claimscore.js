/* SousShift AI — "CLAIM YOUR SCORE" card for every restaurant game (Antidote, 2026-10-14: "let them access the game fast,
   then when they finish and want to put their score, tell them they're in the top and can win, put your information").
   PLAY FIRST: no sign-up before a run. When a GUEST (nobody signed in on this phone) finishes a run, this:
     1. ranks the score against the board the game already uses (live weekly board, the page's sample board, or last
        week's champions.json top 3) and words an offer from that rank + the restaurant's own configured prize / reward,
     2. puts a small "claim" strip on the game-over screen (stays there, tap any time), and
     3. opens the sign-up sheet once (crm.js SSAI_GATE: the SAME fields, consent boxes and destination as before) with an
        animated white cartoon glove pointing at the first field. The glove stops as soon as a field is focused and is a
        still pointer under prefers-reduced-motion. "Not now, keep playing" closes it (and starts the next run when the
        game passes again()); after a "Not now" the sheet won't pop up by itself again for 3 minutes (the strip stays).
   Members skip all of this (their info is already on file). Kid runs pass skip:true (kid play lives on the parent's account).
   PRIZES ARE NEVER INVENTED: prize comes from the game (opts.prize), else GAME_MENU.prizes.champion, else generic
   "this week's prize". prize:false = the board has no prize (bragging rights only, e.g. Melody while rewards are off).
   Usage, in the game's end-of-run code:
     if (window.SSAI_CLAIM) SSAI_CLAIM.show({
       key: "storm-burger",            // id for this game (snooze + guest best)
       score: 1234, unit: "time",      // unit "time" = seconds, shown m:ss (optional)
       board: {api: "https://…/api/game-scores", game: "melody", week: "2026-10-12"}   // live weekly board, or
       rows: [{name, score}, …],       // the page's own board, or
       champs: "storm-burger",         // champions.json games[…].top3 (last week's winners)
       boardName: "this week's board",
       prize: "Free Melody Fries" | false,   fame: true | "ig" (the board's top 3 show on the page's champs.js card),   reward: "…" (optional, defaults to held game points + SSAI_GATE.offer)
       reason: "score" | "play",       // which SSAI_GATE sheet (the one the game used before: "play" = phone AND email)
       mount: el, where: "beforebegin",// where the strip goes on the game-over screen
       after: function (member) {},    // runs once their info is saved (post the score, save the prize, …)
       again: function () {},          // "Not now, keep playing" starts the next run
       alive: function () { return true; },   // false = the game-over screen is gone, don't pop the sheet
       skip: false });
   Guest identity: localStorage "ssai_guest" = {id, runs:{key:{week, best, n}}} so a guest's runs this week are remembered
   on this phone before they ever sign up. */
(function () {
  "use strict";
  if (window.SSAI_CLAIM) return;
  var W = window, D = document;
  var reduce = W.matchMedia && W.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function num(n) { return Math.round(+n || 0).toLocaleString("en-US"); }
  function fmt(n, unit) { if (unit !== "time") return num(n); n = Math.max(0, Math.round(+n || 0)); return Math.floor(n / 60) + ":" + String(n % 60).padStart(2, "0"); }
  function wkey() { var d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function lc1(s) { s = String(s || "").trim(); return s ? s.charAt(0).toLowerCase() + s.slice(1) : s; }

  /* ---- guest identity: remembered on this phone only ---- */
  var GK = "ssai_guest";
  function guest() { var g = null; try { g = JSON.parse(localStorage.getItem(GK) || "null"); } catch (x) {} if (!g || !g.id) g = { id: "G-" + Math.random().toString(36).slice(2, 10).toUpperCase(), since: Date.now(), runs: {} }; g.runs = g.runs || {}; return g; }
  function logRun(key, score) {
    var g = guest(), r = g.runs[key], wk = wkey();
    if (!r || r.week !== wk) r = { week: wk, best: 0, n: 0 };
    r.n++; if (score > r.best) r.best = score; g.runs[key] = r;
    try { localStorage.setItem(GK, JSON.stringify(g)); } catch (x) {}
    return r;
  }
  function snoozed(key) { try { return Date.now() - (+sessionStorage.getItem("ssai_claim_snooze_" + key) || 0) < 180000; } catch (x) { return false; } }
  function snooze(key) { try { sessionStorage.setItem("ssai_claim_snooze_" + key, String(Date.now())); } catch (x) {} }

  /* ---- styles ---- */
  function css() {
    if (D.getElementById("ssai-claim-css")) return;
    var s = D.createElement("style"); s.id = "ssai-claim-css";
    s.textContent =
      ".ssai-cl-strip{position:relative;box-sizing:border-box;max-width:340px;width:100%;margin:10px auto 6px;padding:11px 12px;border-radius:14px;text-align:left;color:#fff;" +
      "background:linear-gradient(135deg,rgba(255,210,63,.20),rgba(255,210,63,.06)),rgba(8,12,28,.72);border:2px solid #FFD23F;box-shadow:0 6px 22px rgba(0,0,0,.35);font:600 13.5px/1.35 system-ui,-apple-system,sans-serif}" +
      ".ssai-cl-strip b.h{display:block;font:900 16px/1.2 system-ui,-apple-system,sans-serif;color:#FFD23F;margin-bottom:3px}" +
      ".ssai-cl-strip .s{display:block;color:#E8ECFA;overflow-wrap:anywhere}" +
      ".ssai-cl-strip button{display:block;width:100%;margin-top:9px;padding:11px 12px;border:0;border-radius:11px;background:#FFD23F;color:#14121F;font:900 15px/1.1 system-ui,-apple-system,sans-serif;cursor:pointer;-webkit-tap-highlight-color:transparent}" +
      ".ssai-cl-strip button:active{transform:scale(.98)}" +
      ".ssai-cl-strip.done{border-color:#3DDC97;background:rgba(10,40,28,.8)}.ssai-cl-strip.done b.h{color:#3DDC97}" +
      ".ssai-claim .crm-card{position:relative;overflow:visible}" +
      ".ssai-claim .crm-card h3{color:#FFD23F}" +
      ".ssai-cl-lead{display:grid;gap:6px;margin:8px 0 10px}" +
      ".ssai-cl-lead div{display:flex;gap:8px;align-items:flex-start;padding:8px 10px;border-radius:12px;font-size:13.5px;line-height:1.35;background:rgba(255,210,63,.12);border:1px solid rgba(255,210,63,.55);color:inherit;overflow-wrap:anywhere}" +
      ".ssai-cl-lead i{font-style:normal;font-size:18px;line-height:1.1;flex:none}" +
      ".ssai-claim form.ssai-cl-pulse{border-radius:14px;animation:ssaiClForm 1.8s ease-in-out infinite}" +
      ".ssai-claim form.ssai-cl-pulse input[name=name]{animation:ssaiClRing 1.2s ease-out infinite;border-color:#FFD23F!important}" +
      "@keyframes ssaiClRing{0%{box-shadow:0 0 0 0 rgba(255,210,63,.75)}100%{box-shadow:0 0 0 12px rgba(255,210,63,0)}}" +
      "@keyframes ssaiClForm{0%,100%{box-shadow:0 0 0 0 rgba(255,210,63,0)}50%{box-shadow:0 0 0 4px rgba(255,210,63,.18)}}" +
      ".ssai-glove{position:absolute;z-index:3;width:104px;height:66px;pointer-events:none;transform-origin:10% 40%;filter:drop-shadow(0 4px 6px rgba(0,0,0,.45));transition:opacity .3s}" +
      ".ssai-glove svg{display:block;width:100%;height:100%;animation:ssaiGlove .9s ease-in-out infinite}" +
      ".ssai-glove.bye{opacity:0}" +
      "@keyframes ssaiGlove{0%,100%{transform:translate(0,0) rotate(0)}45%{transform:translate(-13px,2px) rotate(-6deg)}55%{transform:translate(-13px,2px) rotate(-6deg)}}" +
      "@media (prefers-reduced-motion:reduce){.ssai-glove svg,.ssai-claim form.ssai-cl-pulse,.ssai-claim form.ssai-cl-pulse input[name=name]{animation:none}" +
      ".ssai-claim form.ssai-cl-pulse input[name=name]{box-shadow:0 0 0 3px rgba(255,210,63,.6)}}";
    D.head.appendChild(s);
  }

  /* ---- the white cartoon glove (inline SVG, points left, three stitch lines on the back, rolled cuff) ---- */
  var GLOVE = '<svg viewBox="0 0 132 84" aria-hidden="true" focusable="false"><g fill="#fff" stroke="#151515" stroke-width="3.4" stroke-linejoin="round" stroke-linecap="round">' +
    '<path d="M98 19c11-5 23-4 30 1c3 14 3 29 0 43c-8 5-20 6-30 1c-3-15-3-30 0-45z"/>' +                       // cuff
    '<path d="M104 24c-2 12-2 25 0 37M111 22c-2 13-2 27 0 40M118 22c-2 13-2 27 0 40" fill="none" stroke-width="2.2"/>' +
    '<path d="M100 22c-8-6-24-8-36-3l-6 4v38c8 9 28 11 42 3z"/>' +                                            // back of the hand
    '<path d="M70 37h16M70 45h18M70 53h16" fill="none" stroke-width="2.4"/>' +                                 // Mickey stitch lines
    '<path d="M64 24H15C3 24 3 41 15 41h49"/>' +                                                               // pointing finger
    '<path d="M62 41c-14 0-15 12-1 12M62 53c-13 0-13 11 0 11M64 64c-9 1-8 9 2 7"/>' +                          // curled fingers
    '<path d="M70 22c-4-12 11-17 16-8c2 4 0 7-3 9"/>' +                                                        // thumb
    '</g><ellipse cx="22" cy="29" rx="5" ry="2.2" fill="#e9eef7"/></svg>';

  function attachGlove(ov) {
    var card = ov.querySelector(".crm-card"), f = card && card.querySelector("form"), inp = f && f.querySelector("input[name=name]");
    if (!card || !inp) return;
    var g = D.createElement("div"); g.className = "ssai-glove"; g.innerHTML = GLOVE; card.appendChild(g);
    f.classList.add("ssai-cl-pulse");
    function place() {
      if (!g.parentNode) return;
      var c = card.getBoundingClientRect(), r = inp.getBoundingClientRect();
      g.style.left = Math.max(0, r.right - c.left - 94) + "px";
      g.style.top = (r.top - c.top + r.height / 2 - 24) + "px";
    }
    place(); setTimeout(place, 80); setTimeout(place, 400);
    W.addEventListener("resize", place);
    function stop() {
      f.classList.remove("ssai-cl-pulse"); g.classList.add("bye");
      W.removeEventListener("resize", place); f.removeEventListener("focusin", stop);
      setTimeout(function () { if (g.parentNode) g.remove(); }, 320);
    }
    f.addEventListener("focusin", stop);
  }

  /* ---- board rows ---- */
  function rowsOf(o, cb) {
    var done = false, fin = function (r) { if (done) return; done = true; cb(r); };
    setTimeout(function () { fin(null); }, 4500);
    try {
      if (o.rows) { var rr = typeof o.rows === "function" ? o.rows() : o.rows; return fin(rr || []); }
      if (o.board && o.board.api && W.fetch) {
        return fetch(o.board.api + "?game=" + encodeURIComponent(o.board.game) + "&week=" + encodeURIComponent(o.board.week || wkey()), { cache: "no-store" })
          .then(function (r) { return r.json(); }).then(function (j) { fin(Array.isArray(j) ? j : []); }).catch(function () { fin(null); });
      }
      if (o.champs && W.SSAI_CHAMPS) return W.SSAI_CHAMPS.load(function (d) { var g = d && d.games && d.games[o.champs]; fin(g ? g.top3 || [] : null); });
    } catch (x) {}
    fin(null);
  }

  /* ---- copy: rank + prize + reward ---- */
  function words(o, rows) {
    var u = o.unit, sc = +o.score || 0, board = o.boardName || "this week's board";
    var prize = o.prize;
    if (prize === undefined) { var gm = W.GAME_MENU && W.GAME_MENU.prizes; prize = gm && gm.champion ? { line: gm.champion } : null; }
    else if (prize) prize = { win: prize };
    var GP = W.SSAI_GAMEPTS, held = GP && GP.held ? GP.held() : 0, offer = (W.SSAI_GATE && W.SSAI_GATE.offer) || "";
    var reward = o.reward || ((held ? "your " + held + " game point" + (held === 1 ? "" : "s") + (offer ? " + " : "") : "") + lc1(offer));
    var prizeTxt = prize === false ? "" : prize && prize.line ? prize.line : "#1 this week wins " + (prize && prize.win ? prize.win : "this week's prize");
    var out = { lead: [] }, rank = 0, list = null;
    if (rows) { list = rows.map(function (r) { return +r.score || 0; }).filter(function (n) { return n > 0; }).sort(function (a, b) { return b - a; }); rank = 1 + list.filter(function (n) { return n > sc; }).length; }
    if (rank && rank <= 3) {
      out.title = rank === 1 ? "🔥 You're #1 on " + board + "!" : "🔥 You're #" + rank + " on " + board + "!";
      out.sub = "Enter your info to lock in your spot" + (prize === false ? " before someone passes you." : ". " + (prize && prize.line ? "Top score wins." : prizeTxt + "."));
      out.btn = "🔒 Lock in my spot";
      out.strip = [out.title, "Lock it in before someone passes you" + (prize === false ? "." : ": " + prizeTxt + ".")];
    } else if (rank) {
      var target = list.length >= 10 && rank > 10 ? 10 : 3, gap = list[target - 1] - sc + 1;
      out.title = rank <= 10 ? "💪 You're #" + rank + " on " + board + "!" : "🎯 You're only " + fmt(gap, u) + (u === "time" ? "" : " points") + " from the top " + target + "!";
      out.sub = rank <= 10 ? "Only " + fmt(gap, u) + (u === "time" ? "" : " points") + " from the top " + target + ". Save your score to keep climbing" + (reward ? " and get " + reward + "." : ".")
        : "Save your score to keep climbing" + (reward ? " and get " + reward + "." : ".");
      out.btn = "🏆 Save my score";
      out.strip = [out.title, "Save it to keep climbing" + (reward ? " and get " + reward : "") + "."];
    } else {   // board didn't load: no rank claims, just the offer
      out.title = "🏆 Nice run: " + fmt(sc, u) + (u === "time" ? "" : " points") + "!";
      out.sub = "Save your score to get on " + board + (reward ? " and get " + reward + "." : ".");
      out.btn = "🏆 Save my score";
      out.strip = [out.title, out.sub];
    }
    if (prizeTxt) out.lead.push(["🏆", prizeTxt]);
    if (o.fame) out.lead.push(["👑", "This week's top 3 go up on the champions card in the app, with your name" + (o.fame === "ig" ? " and Instagram" : "") + "."]);
    if (held) out.lead.push(["⭐", "Your " + held + " game point" + (held === 1 ? " is" : "s are") + " waiting: they save to your account when you join."]);
    out.rank = rank;
    return out;
  }

  var cur = null;   // the open claim (one at a time)
  function show(o) {
    o = o || {};
    if (!W.SSAI_GATE || o.skip) return;
    var key = o.key || location.pathname, sc = +o.score || 0;
    if (!(sc > 0)) return;
    if (W.SSAI_GATE.member && W.SSAI_GATE.member()) return;   // members: info already on file
    css(); logRun(key, sc);
    var token = {}; cur = token;
    rowsOf(o, function (rows) {
      if (cur !== token) return;
      var w = words(o, rows);
      // the strip on the game-over screen
      var old = D.querySelectorAll(".ssai-cl-strip[data-k='" + key.replace(/'/g, "") + "']"); [].forEach.call(old, function (x) { x.remove(); });
      var strip = null;
      if (o.mount) {
        strip = D.createElement("div"); strip.className = "ssai-cl-strip"; strip.setAttribute("data-k", key.replace(/'/g, "")); strip.setAttribute("role", "status");
        strip.innerHTML = '<b class="h">' + esc(w.strip[0]) + '</b><span class="s">' + esc(w.strip[1]) + '</span><button type="button">' + esc(w.btn) + "</button>";
        try { o.mount.insertAdjacentElement(o.where || "beforebegin", strip); } catch (x) { strip = null; }
        if (strip) strip.querySelector("button").onclick = function (ev) { ev.preventDefault(); ev.stopPropagation(); open(); };
      }
      function open() {
        if (D.querySelector(".crm-gate")) return;
        W.SSAI_GATE(o.reason || "score", function (m) {
          if (strip && strip.parentNode) { strip.classList.add("done"); strip.innerHTML = '<b class="h">✅ Saved' + (m && m.name ? ", " + esc(String(m.name).split(" ")[0]) : "") + "!</b><span class=\"s\">You're in " + esc(nameOf()) + ". Your next scores and prizes save to your account.</span>"; setTimeout(function () { if (strip.parentNode) strip.remove(); }, 6000); }
          if (o.after) try { o.after(m); } catch (x) { if (W.console) console.error(x); }
        }, {
          title: w.title, sub: w.sub, btn: w.btn, cls: "ssai-claim", noFocus: true, later: "Not now, keep playing",
          lead: '<div class="ssai-cl-lead">' + w.lead.map(function (l) { return "<div><i>" + l[0] + "</i><span>" + esc(l[1]) + "</span></div>"; }).join("") + "</div>",
          onOpen: attachGlove,
          onLater: function () { snooze(key); if (o.again) setTimeout(function () { try { o.again(); } catch (x) {} }, 50); }
        });
      }
      if (o.auto !== false && !snoozed(key)) setTimeout(function () {
        if (cur !== token) return;
        if (o.alive && !o.alive()) return;
        if (W.SSAI_GATE.member && W.SSAI_GATE.member()) return;
        open();
      }, o.delay == null ? 1100 : o.delay);
    });
  }
  function nameOf() { var C = W.CRM_CFG || {}; return (C.name || "Rewards") + " Rewards"; }
  W.SSAI_CLAIM = { show: show, guest: guest, words: words };
})();
