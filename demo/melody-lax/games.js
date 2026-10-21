/* Melody Games Pack (Christian, 2026-10): Trivia, Sports Trivia, Truth or Dare, Melody Word (daily 5-letter) and Melody Mix
   (word scramble), plus the LA Scoreboard tile that the Sports Bar Package (../sports/sports.js) registers. Everything runs on this phone: question banks live
   in games-data.js, no network calls, no AI.
   Mount: <div id="gameshost"></div> (the Games section); games open in a full-screen sheet (#mg-ov).
   POINTS: the same hook as Melody Approach: window.SSAI_GAMEPTS from ../crm.js (1 point per SSAI_REWARDS.game.perScore
   score, shared daily cap SSAI_REWARDS.game.dailyCap). The Games Pack adds its own smaller cap on top: PACK_CAP points a day
   per phone (Los Angeles date), so the quick games can't be farmed. While Melody's game rewards are switched off
   (window.MELODY_REWARDS_ON() false, the BETA state) no points are given, exactly like the flight game.
   KID MODE: if the page ever runs a kid/parent mode (window.SSAI_KID_MODE true or a function returning true, or ?kid=1 to
   test), Truth or Dare is hidden. Melody has no kid mode today. */
(function () {
  "use strict";
  var D = window.MELODY_GAMES_DATA;
  var host = document.getElementById("gameshost");
  if (!D || !host || window.MelodyGames) return;

  /* NAMES: universal product, so the word game and scramble names are per-restaurant config:
     window.SSAI_GAMES = { wordName: "Melody Word", mixName: "Melody Mix", shareTag: "Melody Bar & Grill ✈️" } (Melody sets it in games-data.js). */
  var GCFG = window.SSAI_GAMES || {};
  function cfgName(k, d) { var v = GCFG[k]; return typeof v === "string" && v.trim() ? v.trim() : d; }
  var WORD_NAME = cfgName("wordName", "House Word"), MIX_NAME = cfgName("mixName", "Word Scramble"), SHARE_TAG = cfgName("shareTag", "");
  var PACK_CAP = 10;            // Games Pack points per phone per day (inside the shared game cap)
  var Q_SECS = 15;              // seconds per trivia question
  var MIX_SECS = 60;            // Melody Mix round length

  /* ---------- helpers ---------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function laDay(d) { try { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(d || new Date()); } catch (e) { var x = d || new Date(); return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0"); } }
  function dayNum(s) { var p = s.split("-"); return Math.round((Date.UTC(+p[0], +p[1] - 1, +p[2]) - Date.UTC(2026, 0, 1)) / 864e5); }
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function shuffle(a, r) { r = r || Math.random; a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function el(html) { var d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstChild; }
  function kidMode() {
    try { if (new URLSearchParams(location.search).get("kid") === "1") return true; var k = window.SSAI_KID_MODE; return typeof k === "function" ? !!k() : !!k; } catch (e) { return false; }
  }
  function rewardsOn() { try { return typeof window.MELODY_REWARDS_ON === "function" ? !!window.MELODY_REWARDS_ON() : true; } catch (e) { return false; } }

  /* ---------- styles (Melody tokens from the page :root) ---------- */
  var css = document.createElement("style");
  css.textContent =
  ".mg-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}" +
  ".mg-tile{position:relative;min-width:0;text-align:left;border:1px solid var(--edge);background:linear-gradient(160deg,#1b2742,#0e1628);color:var(--ink);border-radius:18px;padding:14px 12px 12px;cursor:pointer;font-family:var(--body);box-shadow:0 10px 30px #0006;overflow:hidden}" +
  ".mg-tile:active{transform:scale(.98)}.mg-tile .i{font-size:30px;line-height:1;display:block;margin-bottom:8px}" +
  ".mg-tile b{display:block;font-family:var(--display);font-weight:900;font-size:19px;line-height:1.1;color:var(--cream)}" +
  ".mg-tile small{display:block;margin-top:4px;color:var(--dim);font-size:12.5px;line-height:1.3}" +
  ".mg-tile .tg{position:absolute;top:10px;right:10px;font:800 10px var(--body);letter-spacing:.12em;text-transform:uppercase;color:#1a1405;background:var(--gold2);border-radius:99px;padding:3px 7px}" +
  ".mg-tile.wide{grid-column:1/-1;background:linear-gradient(120deg,#2a1420,#141e34 55%);border-color:#77242e}" +
  ".mg-tile::after{content:'';position:absolute;right:-30px;bottom:-30px;width:90px;height:90px;border-radius:50%;background:radial-gradient(closest-side,#d4af3730,#0000)}" +
  ".mg-note{margin:10px 2px 0;color:var(--dim);font-size:12.5px;line-height:1.45}.mg-note b{color:var(--gold2)}" +
  "#mg-ov{position:fixed;inset:0;z-index:95;display:none;flex-direction:column;background:radial-gradient(700px 420px at 50% -10%,#2a2445 0,transparent 62%),var(--sky);color:var(--ink)}" +
  "#mg-ov.on{display:flex}" +
  ".mg-top{display:flex;align-items:center;gap:10px;padding:calc(10px + env(safe-area-inset-top,0px)) 96px 10px 16px;border-bottom:1px solid var(--edge);background:#0b1220e6}" +
  ".mg-top .x{flex:none;width:40px;height:40px;border-radius:12px;border:1px solid var(--edge);background:var(--panel);color:var(--ink);font:800 18px var(--body);cursor:pointer}" +
  ".mg-top .t{flex:1;min-width:0;font-family:var(--display);font-weight:900;font-size:20px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
  ".mg-top .h{flex:none;font-family:var(--punch);font-size:20px;color:var(--gold2);letter-spacing:.03em}" +
  ".mg-body{flex:1;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}" +
  ".mg-in{max-width:560px;margin:0 auto;padding:16px 16px calc(28px + env(safe-area-inset-bottom,0px))}" +
  ".mg-h{font-family:var(--display);font-weight:900;font-size:26px;margin:4px 0 6px;line-height:1.15}.mg-h small{display:block;font:800 11px var(--body);letter-spacing:.2em;text-transform:uppercase;color:var(--gold)}" +
  ".mg-p{color:var(--dim);font-size:14.5px;margin:0 0 12px}" +
  ".mg-chips{display:flex;flex-wrap:wrap;gap:7px;margin:8px 0 12px}.mg-chips button{border:1px solid var(--edge);background:var(--panel);color:var(--ink);border-radius:99px;padding:8px 13px;font:700 14px var(--body);cursor:pointer}" +
  ".mg-chips button[aria-pressed=true]{background:linear-gradient(180deg,var(--gold2),var(--gold));border-color:var(--gold);color:#1a1405}" +
  ".mg-lbl{font:800 11px var(--body);letter-spacing:.18em;text-transform:uppercase;color:var(--gold);margin:14px 2px 6px}" +
  ".mg-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:50px;border-radius:14px;border:1px solid var(--edge);background:var(--panel);color:var(--ink);font:800 16px var(--body);cursor:pointer;margin-top:10px;padding:10px 14px}" +
  ".mg-btn.hot{background:linear-gradient(180deg,var(--gold2),var(--gold));border-color:var(--gold);color:#1a1405;box-shadow:0 8px 24px #d4af3744}.mg-btn.wine{background:var(--wine2);border-color:var(--wine2);color:#fff}" +
  ".mg-row2{display:grid;grid-template-columns:1fr 1fr;gap:10px}.mg-row2 .mg-btn{margin-top:0}" +
  ".mg-names input{width:100%;padding:12px;border-radius:12px;border:1px solid var(--edge);background:#0b1220;color:var(--ink);font:600 16px var(--body);margin-top:7px}" +
  ".mg-names .nr{display:flex;gap:7px;align-items:center}.mg-names .nr button{flex:none;margin-top:7px;width:44px;height:46px;border-radius:12px;border:1px solid var(--edge);background:var(--panel);color:var(--dim);font:800 18px var(--body);cursor:pointer}" +
  ".mg-tbar{height:8px;border-radius:6px;background:#0a0f1c;border:1px solid var(--edge);overflow:hidden;margin:6px 0 14px}.mg-tbar i{display:block;height:100%;background:linear-gradient(90deg,var(--gold),var(--gold2));transition:width .25s linear}.mg-tbar i.low{background:linear-gradient(90deg,#d64545,#ff7a59)}" +
  ".mg-meta{display:flex;justify-content:space-between;gap:8px;font:800 13px var(--body);color:var(--dim)}.mg-meta b{color:var(--ink)}" +
  ".mg-q{font-family:var(--display);font-weight:700;font-size:23px;line-height:1.25;margin:4px 0 14px;overflow-wrap:anywhere}" +
  ".mg-ans{display:grid;gap:9px}.mg-ans button{text-align:left;min-height:54px;border-radius:14px;border:1px solid var(--edge);background:var(--panel);color:var(--ink);font:700 16px var(--body);padding:12px 14px;cursor:pointer;overflow-wrap:anywhere}" +
  ".mg-ans button.ok{background:#3fbf8f2e;border-color:var(--go);color:#cff5e6}.mg-ans button.no{background:#d6454530;border-color:#d64545;color:#ffd6d0}.mg-ans button:disabled{cursor:default}" +
  ".mg-card{background:linear-gradient(160deg,#1b2742,#0e1628);border:1px solid var(--edge);border-radius:20px;padding:18px;box-shadow:0 20px 50px #0008}" +
  ".mg-big{font-family:var(--punch);font-size:56px;line-height:1;color:var(--gold2);text-align:center;margin:6px 0}" +
  ".mg-rank{list-style:none;margin:10px 0 0;padding:0}.mg-rank li{display:flex;justify-content:space-between;gap:10px;padding:10px 12px;border:1px solid var(--edge);border-radius:12px;margin-top:7px;background:#0b1220;font-weight:800}.mg-rank li:first-child{border-color:var(--gold);background:#d4af3718}.mg-rank span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.mg-rank em{font-style:normal;font-family:var(--punch);color:var(--gold2);font-size:18px}" +
  ".mg-won{margin:12px 0 0;background:#3fbf8f22;border:2px dashed var(--go);border-radius:14px;padding:10px 12px;font-weight:800;text-align:center}.mg-won small{display:block;font-weight:600;font-size:13px;color:#c9d2ee;margin-top:3px}" +
  ".mg-pass{text-align:center;padding:30px 0}.mg-pass .ph{font-size:60px}.mg-pass b{display:block;font-family:var(--display);font-size:30px;margin:8px 0}" +
  /* Melody Word: arrivals-board tiles */
  ".mw-grid{display:grid;grid-template-rows:repeat(6,1fr);gap:6px;width:min(100%,330px);margin:4px auto 12px}.mw-row{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}" +
  ".mw-t{position:relative;aspect-ratio:1/1;display:grid;place-items:center;border-radius:9px;background:#0a0f1c;border:1px solid #27324d;font:400 clamp(24px,8vw,32px)/1 var(--punch);color:var(--cream);letter-spacing:.02em;overflow:hidden}" +
  ".mw-t::after{content:'';position:absolute;left:0;right:0;top:50%;height:1px;background:#00000080;box-shadow:0 1px 0 #ffffff10}" +
  ".mw-t.f{border-color:#5a6788}.mw-t.hit{background:linear-gradient(180deg,var(--gold2),var(--gold));border-color:var(--gold);color:#1a1405}.mw-t.near{background:linear-gradient(180deg,var(--pink),var(--wine2));border-color:var(--pink);color:#fff}.mw-t.miss{background:#1c2540;border-color:#1c2540;color:#7d879e}" +
  ".mw-t.flip{animation:mwflip .5s ease both}@keyframes mwflip{0%{transform:rotateX(0)}50%{transform:rotateX(90deg)}100%{transform:rotateX(0)}}" +
  ".mw-row.shake{animation:mwshake .35s}@keyframes mwshake{20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}" +
  ".mw-kb{display:grid;gap:6px;margin-top:6px}.mw-kr{display:flex;gap:5px;justify-content:center}.mw-k{flex:1 1 0;min-width:0;max-width:44px;height:52px;border-radius:9px;border:1px solid var(--edge);background:#2a3658;color:var(--ink);font:800 15px var(--body);cursor:pointer;padding:0}" +
  ".mw-k.wd{flex:1.6 1 0;max-width:68px;font-size:12px}.mw-k.hit{background:var(--gold);color:#1a1405;border-color:var(--gold)}.mw-k.near{background:var(--wine2);border-color:var(--pink)}.mw-k.miss{background:#121a2e;color:#5d6780}" +
  ".mw-hb{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px 12px;width:min(100%,330px);margin:0 auto 10px}.mw-hb .mg-btn{width:auto;margin:0;min-height:40px;padding:6px 14px;font-size:14px;border-color:var(--gold);color:var(--gold2)}.mw-hb .mg-btn:disabled{opacity:.5;cursor:default;border-color:var(--edge);color:var(--dim)}" +
  ".mw-hrow{display:flex;align-items:center;gap:4px;font:800 11px var(--body);letter-spacing:.12em;text-transform:uppercase;color:var(--dim)}.mw-hrow span{margin-right:2px}" +
  ".mw-ht{width:24px;height:28px;border-radius:6px;border:1px dashed #3a4566;display:grid;place-items:center;font:400 17px/1 var(--punch);color:var(--gold2)}.mw-ht.on{border:2px solid var(--gold);background:#d4af3718}" +
  ".mw-clue{flex:1 1 100%;text-align:center;font-weight:800;font-size:14px;color:var(--cream);background:#d4af3712;border:1px dashed var(--gold);border-radius:12px;padding:7px 10px}.mw-k.hint{box-shadow:inset 0 0 0 2px var(--gold)}" +
  ".mg-msg{min-height:22px;text-align:center;font-weight:800;color:var(--gold2);margin:0 0 6px}" +
  ".mg-legend{display:flex;justify-content:center;gap:12px;font-size:12px;color:var(--dim);margin-top:8px}.mg-legend i{display:inline-block;width:12px;height:12px;border-radius:3px;vertical-align:-1px;margin-right:4px}" +
  /* Melody Mix */
  ".mx-slots,.mx-tiles{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;margin:10px 0}" +
  ".mx-s{width:36px;height:44px;border-radius:9px;border:1px dashed #5a6788;display:grid;place-items:center;font:400 24px var(--punch);color:var(--cream)}.mx-s.f{border-style:solid;border-color:var(--gold);background:#d4af3718}" +
  ".mx-t{width:44px;height:52px;border-radius:10px;border:1px solid var(--gold);background:linear-gradient(180deg,#2a3658,#1b2742);color:var(--gold2);font:400 26px var(--punch);cursor:pointer;padding:0}.mx-t:disabled{opacity:.2}" +
  ".mx-row{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}.mx-row .mg-btn{margin-top:0;min-height:46px;font-size:14px;padding:6px}" +
  ".mx-shake{animation:mwshake .35s}.mx-ok{animation:mxok .5s}@keyframes mxok{50%{transform:scale(1.06);filter:brightness(1.4)}}" +
  /* Truth or Dare */
  ".td-pick{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.td-pick button{min-height:130px;border-radius:20px;border:1px solid var(--edge);color:#fff;font:400 34px var(--punch);letter-spacing:.04em;cursor:pointer}" +
  ".td-pick .tr{background:linear-gradient(160deg,#2b4d8f,#152a55)}.td-pick .da{background:linear-gradient(160deg,var(--wine2),var(--wine))}.td-pick small{display:block;font:700 12.5px var(--body);letter-spacing:0;opacity:.85;margin-top:4px}" +
  ".td-card{min-height:200px;display:flex;flex-direction:column;justify-content:center;text-align:center;animation:tdin .45s cubic-bezier(.2,1.4,.4,1)}@keyframes tdin{from{transform:rotateY(80deg) scale(.9);opacity:0}to{transform:none;opacity:1}}" +
  ".td-card .k{font:800 12px var(--body);letter-spacing:.22em;text-transform:uppercase;color:var(--gold)}.td-card p{font-family:var(--display);font-weight:700;font-size:24px;line-height:1.3;margin:10px 0 0;overflow-wrap:anywhere}" +
  ".td-safe{margin:14px 0 0;padding:9px 12px;border-radius:12px;border:1px dashed var(--gold);color:var(--gold2);font-size:13px;font-weight:700;text-align:center}" +
  /* Sports Trivia: Fan Test (team picker + Fan Rating) */
  ".ft-all{display:flex;align-items:center;gap:10px;width:100%;min-height:52px;border-radius:14px;border:1px solid var(--edge);background:var(--panel);color:var(--ink);font:800 15px var(--body);padding:8px 12px;cursor:pointer;text-align:left}.ft-all .e{font-size:24px}" +
  ".ft-all small{display:block;font:600 12px var(--body);color:var(--dim)}.ft-all[aria-pressed=true],.ft-grid button[aria-pressed=true]{border-color:var(--gold);background:#d4af3722;box-shadow:inset 0 0 0 1px var(--gold)}" +
  ".ft-lg{font:800 10.5px var(--body);letter-spacing:.16em;text-transform:uppercase;color:var(--dim);margin:10px 2px 5px}" +
  ".ft-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.ft-grid button{min-width:0;display:flex;flex-direction:column;align-items:center;gap:4px;border-radius:13px;border:1px solid var(--edge);background:var(--panel);color:var(--ink);font:700 12.5px/1.15 var(--body);padding:8px 4px 7px;cursor:pointer}" +
  ".ft-grid img,.ft-hd img{width:36px;height:36px;object-fit:contain}.ft-grid span{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
  ".ft-hd{display:flex;align-items:center;justify-content:center;gap:8px;font:800 12px var(--body);letter-spacing:.14em;text-transform:uppercase;color:var(--gold)}" +
  ".ft-stars{font-size:38px;letter-spacing:4px;line-height:1;margin:10px 0 4px;color:var(--gold2)}.ft-stars i{font-style:normal;color:#3a4566}" +
  ".ft-tier{font-family:var(--punch);font-size:30px;line-height:1.05;color:var(--cream);letter-spacing:.02em}.ft-line{font-family:var(--display);font-weight:700;font-size:19px;line-height:1.3;margin:8px 0 6px;overflow-wrap:anywhere}" +
  "@media (prefers-reduced-motion:reduce){.mw-t.flip,.mw-row.shake,.td-card,.mx-ok,.mx-shake{animation:none}}";
  document.head.appendChild(css);

  /* ---------- overlay ---------- */
  var ov = el('<div id="mg-ov" role="dialog" aria-modal="true" aria-label="Melody Games"><div class="mg-top"><button type="button" class="x" aria-label="Close games">✕</button><div class="t"></div><div class="h" aria-live="polite"></div></div><div class="mg-body" data-scroll-ok><div class="mg-in"></div></div></div>');
  document.body.appendChild(ov);
  var ovT = ov.querySelector(".t"), ovH = ov.querySelector(".h"), ovIn = ov.querySelector(".mg-in"), ovBody = ov.querySelector(".mg-body");
  var cleanups = [], prevOverflow = "", keyHandler = null;
  function clearTimers() { cleanups.splice(0).forEach(function (f) { try { f(); } catch (e) {} }); keyHandler = null; }
  function later(fn, ms) { var t = setTimeout(fn, ms); cleanups.push(function () { clearTimeout(t); }); return t; }
  function every(fn, ms) { var t = setInterval(fn, ms); cleanups.push(function () { clearInterval(t); }); return t; }
  function screen(title, html) { clearTimers(); ovT.textContent = title; ovH.textContent = ""; ovIn.innerHTML = html; ovBody.scrollTop = 0; return ovIn; }
  function openOv() { if (!ov.classList.contains("on")) { prevOverflow = document.documentElement.style.overflow; document.documentElement.style.overflow = "hidden"; ov.classList.add("on"); } }
  function closeOv() { clearTimers(); ov.classList.remove("on"); document.documentElement.style.overflow = prevOverflow; if (current && current.onClose) try { current.onClose(); } catch (e) {} current = null; }
  ov.querySelector(".x").onclick = closeOv;
  document.addEventListener("keydown", function (e) { if (!ov.classList.contains("on")) return; if (e.key === "Escape") { closeOv(); return; } if (keyHandler) keyHandler(e); });

  /* ---------- registry + tiles ---------- */
  var GAMES = [], current = null;
  function register(g) { GAMES.push(g); GAMES.sort(function (a, b) { return (a.order || 50) - (b.order || 50); }); drawTiles(); }
  function open(id) { var g = GAMES.filter(function (x) { return x.id === id; })[0]; if (!g || (g.adult && kidMode())) return false; current = g; openOv(); g.start(); return true; }
  function drawTiles() {
    var kid = kidMode();
    host.innerHTML = '<div class="mg-grid">' + GAMES.filter(function (g) { return !(g.adult && kid); }).map(function (g) {
      return '<button type="button" class="mg-tile' + (g.wide ? " wide" : "") + '" data-mg="' + g.id + '">' + (g.tag ? '<span class="tg">' + esc(g.tag) + '</span>' : '') +
        '<span class="i" aria-hidden="true">' + g.icon + '</span><b>' + esc(g.title) + '</b><small>' + esc(g.sub) + '</small></button>';
    }).join("") + '</div><p class="mg-note">' + pointsNote() + '</p>';
    [].forEach.call(host.querySelectorAll("[data-mg]"), function (b) { b.onclick = function () { open(b.getAttribute("data-mg")); }; });
  }
  function pointsNote() {
    var GP = window.SSAI_GAMEPTS;
    if (!GP) return "Just for fun: play at the table, no sign-in needed.";
    if (!rewardsOn()) return "🧪 <b>BETA:</b> Games Pack points switch on when Melody turns game rewards on. Play for fun and bragging rights until then.";
    return "⭐ Earn up to <b>" + PACK_CAP + " Melody Rewards points a day</b> from the Games Pack (it counts toward the " + GP.cfg.dailyCap + "-a-day game limit). Truth or Dare is just for fun.";
  }

  /* ---------- points ---------- */
  function packUsed() { var p = lsGet("mg-pack-pts", null); return p && p.day === laDay() ? p.pts : 0; }
  function packAdd(n) { lsSet("mg-pack-pts", { day: laDay(), pts: packUsed() + n }); }
  // Returns an element describing what this round earned (or why not). Call once per finished round.
  function award(want, label) {
    var box = el('<div class="mg-won"></div>'), GP = window.SSAI_GAMEPTS;
    if (!GP) { box.style.display = "none"; return box; }
    if (!rewardsOn()) { box.innerHTML = "🧪 BETA · Game rewards switch on soon<small>No points are given until Melody turns rewards on.</small>"; return box; }
    var left = Math.max(0, PACK_CAP - packUsed()), n = Math.max(0, Math.min(want, left));
    if (!want) { box.innerHTML = "Nice try!<small>Score higher to earn Melody Rewards points (up to " + PACK_CAP + " a day from games).</small>"; return box; }
    if (!n) { box.innerHTML = "⭐ Today's Games Pack limit is reached<small>" + PACK_CAP + " points a day. Keep playing for fun.</small>"; return box; }
    var r; try { r = GP.award(n * GP.cfg.perScore, "Games Pack · " + label); } catch (e) { box.style.display = "none"; return box; }
    packAdd(r.pts);
    var paint = function () {
      if (r.saved) box.innerHTML = r.pts ? "⭐ +" + r.pts + " Melody Rewards point" + (r.pts === 1 ? "" : "s") + "<small>" + packUsed() + " of " + PACK_CAP + " Games Pack points today</small>" : "⭐ Today's game limit is reached<small>" + GP.cfg.dailyCap + " game points a day across all Melody games.</small>";
      else {
        box.innerHTML = (r.pts ? "⭐ This round is worth " + r.pts + " point" + (r.pts === 1 ? "" : "s") : "⭐ Today's game limit is reached") + '<button type="button" class="mg-btn hot">🎁 Join to save your ' + GP.held() + ' points</button><small>Free · Melody Rewards</small>';
        box.querySelector("button").onclick = function () { closeOv(); GP.join(function (res) { r = { pts: res.pts, saved: true }; }); };
      }
    };
    paint(); return box;
  }

  /* ---------- player names (pass the phone) ---------- */
  function namesEditor(wrap, min, max) {
    var names = (lsGet("mg-names", []) || []).filter(function (x) { return typeof x === "string"; }).slice(0, max);
    while (names.length < min) names.push("");
    function draw() {
      wrap.innerHTML = names.map(function (n, i) { return '<div class="nr"><input maxlength="14" autocomplete="off" placeholder="Player ' + (i + 1) + '" value="' + esc(n) + '" data-i="' + i + '" aria-label="Player ' + (i + 1) + ' name">' + (names.length > min ? '<button type="button" data-rm="' + i + '" aria-label="Remove player">✕</button>' : '') + '</div>'; }).join("") +
        (names.length < max ? '<button type="button" class="mg-btn" data-add>➕ Add player</button>' : '');
      [].forEach.call(wrap.querySelectorAll("input"), function (x) { x.oninput = function () { names[+x.getAttribute("data-i")] = x.value; }; });
      [].forEach.call(wrap.querySelectorAll("[data-rm]"), function (b) { b.onclick = function () { names.splice(+b.getAttribute("data-rm"), 1); draw(); }; });
      var a = wrap.querySelector("[data-add]"); if (a) a.onclick = function () { names.push(""); draw(); var ins = wrap.querySelectorAll("input"); ins[ins.length - 1].focus(); };
    }
    draw();
    return function () { var out = names.map(function (n, i) { return (n || "").trim().slice(0, 14) || "Player " + (i + 1); }); lsSet("mg-names", names.map(function (n) { return (n || "").trim().slice(0, 14); })); return out; };
  }
  function chips(wrap, opts, cur, onPick) {
    wrap.innerHTML = opts.map(function (o) { return '<button type="button" data-v="' + o[0] + '" aria-pressed="' + (o[0] === cur) + '">' + esc(o[1]) + '</button>'; }).join("");
    [].forEach.call(wrap.querySelectorAll("button"), function (b) { b.onclick = function () { [].forEach.call(wrap.querySelectorAll("button"), function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); }); onPick(b.getAttribute("data-v")); }; });
  }
  function rankList(players, key, fmt) {
    var s = players.slice().sort(function (a, b) { return b[key] - a[key]; });
    return '<ol class="mg-rank">' + s.map(function (p, i) { return '<li><span>' + (i === 0 ? "🏆 " : (i + 1) + ". ") + esc(p.name) + '</span><em>' + fmt(p) + '</em></li>'; }).join("") + '</ol>';
  }

  /* ================= TRIVIA + SPORTS TRIVIA ================= */
  /* FAN TEST (Sports Trivia): before a round the player picks a favorite team (D.FAN_TEAMS, the same LA/CA list as the Sports
     module) or "All LA sports" (the mixed category mode). A team round asks 10 questions from D.FAN[team] (5 each when passing
     the phone), then shows a 1–5★ Fan Rating with a random line from D.FAN_LINES. Points use the normal Sports Trivia rule below. */
  var FAN_LG = { nfl: "NFL", mlb: "MLB", nba: "NBA", nhl: "NHL", mls: "MLS", wnba: "WNBA", cfb: "College" };
  var FAN_CUP = { nfl: "Super Bowl", mlb: "World Series", nba: "NBA Finals", nhl: "Stanley Cup Final", mls: "MLS Cup", wnba: "WNBA Finals", cfb: "Rose Bowl" };
  var FAN_TIER = ["", "Fair-Weather Fan", "Bandwagon Fan", "Solid Fan", "Die-Hard Fan", "Super Fan"];
  var FAN_TEAMS = (D.FAN_TEAMS || []).filter(function (t) { return (D.FAN && D.FAN[t[0]] || []).length >= 10; });
  var FAN_BY = {}; FAN_TEAMS.forEach(function (t) { FAN_BY[t[0]] = t; });
  function fanLg(t) { return t[0].split(":")[0]; }
  function fanName(t) { return t[4] || t[2]; }
  function fanLogo(t) {   // same ESPN logo paths as ../sports/sports.js
    var lg = fanLg(t), id = t[0].split(":")[1];
    if (lg === "mls") return "https://a.espncdn.com/i/teamlogos/soccer/500/" + id + ".png";
    if (lg === "cfb") return "https://a.espncdn.com/i/teamlogos/ncaa/500/" + id + ".png";
    return "https://a.espncdn.com/i/teamlogos/" + lg + "/500/" + t[1].toLowerCase() + ".png";
  }
  function fanImg(t) { return '<img src="' + esc(fanLogo(t)) + '" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'">'; }
  function followedTeam() {   // first team the guest follows in the LA Scoreboard (sp:<client>:follow), if it has a Fan Test
    var f = lsGet("sp:" + ((window.SPORTS_CFG || {}).client || "melody-lax") + ":follow", []);
    if (!Array.isArray(f)) return "";
    for (var i = 0; i < f.length; i++) { var k = String(f[i]).replace(/^cbb:/, "cfb:"); if (FAN_BY[k]) return k; }
    return "";
  }
  function fanStars(c, n) { var p = n ? c / n : 0; return p >= 0.9 ? 5 : p >= 0.7 ? 4 : p >= 0.5 ? 3 : p >= 0.3 ? 2 : 1; }
  function fanLine(stars, t) {
    var L = (D.FAN_LINES || {})[stars] || [""], s = L[Math.floor(Math.random() * L.length)];
    return s.replace(/\{team\}/g, fanName(t)).replace(/\{cup\}/g, FAN_CUP[fanLg(t)] || "championship");
  }

  function triviaGame(kind) {
    var bank = kind === "sports" ? D.SPORTS : D.TRIVIA, isSports = kind === "sports";
    var cats = isSports ? [["all", "🏆 All sports"], ["la", "🌴 LA teams"], ["nba", "🏀 NBA"], ["nfl", "🏈 NFL & college"], ["mlb", "⚾ MLB"], ["soccer", "⚽ Soccer"], ["more", "🏒 More"]]
                        : [["all", "🎲 Everything"], ["music", "🎤 Music"], ["food", "🍔 Food & drink"], ["pop", "🎬 Pop culture"], ["la", "🌴 LA"]];
    var baseTitle = isSports ? "Sports Trivia" : "Melody Trivia";
    var cfg = lsGet("mg-cfg-" + kind, { cat: "all", table: false }) || { cat: "all", table: false };
    var getNames = null;
    function team() { return isSports && cfg.fan && FAN_BY[cfg.fan] || null; }
    function title() { var t = team(); return t ? fanName(t) + " Fan Test" : baseTitle; }

    function setup() {
      if (isSports && FAN_TEAMS.length && !(cfg.fan === "all" || FAN_BY[cfg.fan])) cfg.fan = followedTeam() || "all";   // first visit: their followed team
      var w = screen(baseTitle, '<div class="mg-h"><small>' + (isSports ? "Fan Test · NBA · NFL · MLB · NHL · soccer" : "Music · food & drink · pop culture · LA") + '</small>' + baseTitle + '</div>' +
        '<p class="mg-p">' + (isSports && FAN_TEAMS.length ? "Pick your team for a 10-question Fan Test and get your Fan Rating, or play all LA sports. " : "") + Q_SECS + ' seconds a question. Faster right answers score more.</p>' +
        (isSports && FAN_TEAMS.length ? '<div class="mg-lbl">Your team</div><div id="ft-pick"></div>' : '') +
        '<div id="mg-catbox"><div class="mg-lbl">Category</div><div class="mg-chips" id="mg-cat"></div></div>' +
        '<div class="mg-lbl">Who\'s playing?</div><div class="mg-chips" id="mg-mode"></div>' +
        '<div class="mg-names" id="mg-names" style="display:none"></div>' +
        '<button type="button" class="mg-btn hot" id="mg-go">▶ Start</button>');
      chips(w.querySelector("#mg-cat"), cats, cfg.cat, function (v) { cfg.cat = v; });
      var go = w.querySelector("#mg-go"), catbox = w.querySelector("#mg-catbox"), pick = w.querySelector("#ft-pick");
      function syncPick() {
        var t = team();
        catbox.style.display = t ? "none" : "";
        go.textContent = t ? "▶ Start " + fanName(t) + " Fan Test" : "▶ Start";
        if (pick) [].forEach.call(pick.querySelectorAll("[data-ft]"), function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-ft") === (cfg.fan || "all") ? "true" : "false"); });
      }
      if (pick) {
        var groups = {}, order = [];
        FAN_TEAMS.forEach(function (t) { var lg = fanLg(t); if (!groups[lg]) { groups[lg] = []; order.push(lg); } groups[lg].push(t); });
        pick.innerHTML = '<button type="button" class="ft-all" data-ft="all"><span class="e" aria-hidden="true">🌴</span><span>All LA sports<small>Mixed questions, pick a category</small></span></button>' +
          order.map(function (lg) { return '<div class="ft-lg">' + esc(FAN_LG[lg] || lg) + '</div><div class="ft-grid">' + groups[lg].map(function (t) { return '<button type="button" data-ft="' + t[0] + '" aria-label="' + esc(fanName(t)) + '">' + fanImg(t) + '<span>' + esc(t[2]) + '</span></button>'; }).join("") + '</div>'; }).join("");
        [].forEach.call(pick.querySelectorAll("[data-ft]"), function (b) { b.onclick = function () { cfg.fan = b.getAttribute("data-ft"); syncPick(); }; });
      }
      syncPick();
      var nm = w.querySelector("#mg-names");
      var showNames = function () { nm.style.display = cfg.table ? "block" : "none"; if (cfg.table && !getNames) getNames = namesEditor(nm, 2, 6); };
      chips(w.querySelector("#mg-mode"), [["solo", "🙋 Just me (10 questions)"], ["table", "📱 Table: pass the phone (2–6)"]], cfg.table ? "table" : "solo", function (v) { cfg.table = v === "table"; showNames(); });
      getNames = null; showNames();
      go.onclick = function () { lsSet("mg-cfg-" + kind, cfg); begin(cfg.table && getNames ? getNames() : ["You"]); };
    }

    function pickQuestions(n) {
      var t = team(), src = t ? D.FAN[t[0]] : bank;
      var pool = t ? src : bank.filter(function (r) { return cfg.cat === "all" || (cfg.cat === "la" ? (isSports ? !!r[6] : r[5] === "la") : r[5] === cfg.cat); });
      var seenKey = t ? "mg-seen-fan-" + t[0] : "mg-seen-" + kind, seen = lsGet(seenKey, []) || [];
      var order = function (arr) { var fresh = shuffle(arr.filter(function (r) { return seen.indexOf(r[0]) < 0; })), old = shuffle(arr.filter(function (r) { return seen.indexOf(r[0]) >= 0; })); return fresh.concat(old); };
      var out;
      if (!t && isSports && cfg.cat === "all") {   // LA emphasized: about 60% LA-team questions
        var la = order(pool.filter(function (r) { return r[6]; })), rest = order(pool.filter(function (r) { return !r[6]; })), nLa = Math.round(n * 0.6);
        out = shuffle(la.slice(0, nLa).concat(rest.slice(0, n - Math.min(nLa, la.length))));
        if (out.length < n) out = out.concat(la.slice(nLa, nLa + n - out.length));
      } else out = order(pool).slice(0, n);
      seen = out.map(function (r) { return r[0]; }).concat(seen).slice(0, Math.min(80, Math.floor(src.length * 0.7)));
      lsSet(seenKey, seen);
      return out.map(function (r) { return { q: r[0], right: r[1], choices: shuffle(r.slice(1, 5)) }; });
    }

    var S = null;
    function begin(names) {
      var players = names.map(function (n) { return { name: n, score: 0, correct: 0 }; });
      var per = players.length > 1 ? 5 : 10, qs = pickQuestions(per * players.length);
      if (qs.length < per * players.length) per = Math.floor(qs.length / players.length);
      S = { players: players, qs: qs.slice(0, per * players.length), i: 0, table: players.length > 1, team: team() };
      if (S.table) handoff(); else ask();
    }
    function who() { return S.players[S.i % S.players.length]; }
    function handoff() {
      var p = who(), w = screen(title(), '<div class="mg-pass"><div class="ph">📱</div><span class="mg-p">Question ' + (S.i + 1) + ' of ' + S.qs.length + '</span><b>Pass to ' + esc(p.name) + '</b><p class="mg-p">Everyone else, no peeking 👀</p><button type="button" class="mg-btn hot" id="mg-rdy">I\'m ' + esc(p.name) + ', ready!</button></div>');
      w.querySelector("#mg-rdy").onclick = ask;
    }
    function ask() {
      var q = S.qs[S.i], p = who(), left = Q_SECS * 10, done = false;
      var w = screen(title(), (S.team ? '<div class="ft-hd" style="margin-bottom:8px">' + fanImg(S.team) + 'Fan Test</div>' : '') + '<div class="mg-meta"><span>Question <b>' + (S.i + 1) + '</b> of ' + S.qs.length + '</span><span>' + (S.table ? esc(p.name) + ' · ' : '') + '<b>' + p.score.toLocaleString() + '</b> pts</span></div>' +
        '<div class="mg-tbar"><i style="width:100%"></i></div><div class="mg-q">' + esc(q.q) + '</div><div class="mg-ans">' +
        q.choices.map(function (c, i) { return '<button type="button" data-i="' + i + '">' + esc(c) + '</button>'; }).join("") + '</div>');
      var bar = w.querySelector(".mg-tbar i"), btns = w.querySelectorAll(".mg-ans button");
      ovH.textContent = Q_SECS + "s";
      every(function () { if (done) return; left--; bar.style.width = (left / (Q_SECS * 10) * 100) + "%"; bar.classList.toggle("low", left < 50); ovH.textContent = Math.ceil(left / 10) + "s"; if (left <= 0) answer(-1); }, 100);
      function answer(i) {
        if (done) return; done = true;
        var ok = i >= 0 && q.choices[i] === q.right;
        [].forEach.call(btns, function (b, j) { b.disabled = true; if (q.choices[j] === q.right) b.classList.add("ok"); else if (j === i) b.classList.add("no"); });
        if (ok) { p.correct++; p.score += 100 + Math.round(left / (Q_SECS * 10) * 50); }
        ovH.textContent = ok ? "✓" : i < 0 ? "⏱" : "✕";
        later(function () { S.i++; if (S.i >= S.qs.length) results(); else if (S.table) handoff(); else ask(); }, ok ? 1100 : 1800);
      }
      [].forEach.call(btns, function (b) { b.onclick = function () { answer(+b.getAttribute("data-i")); }; });
      keyHandler = function (e) { var k = "1234".indexOf(e.key); if (k >= 0 && btns[k]) answer(k); };
    }
    function results(preview) {
      var top = S.players.slice().sort(function (a, b) { return b.score - a.score; })[0], per = S.qs.length / S.players.length, t = S.team;
      var bestKey = t ? "mg-best-fan-" + t[0] : "mg-best-" + kind, best = +lsGet(bestKey, 0) || 0, solo = !S.table;
      if (solo && !preview && top.score > best) lsSet(bestKey, top.score);
      var head;
      if (t) {   // Fan Rating for the best player at this phone
        var st = fanStars(top.correct, per);
        head = '<div class="ft-hd">' + fanImg(t) + esc(fanName(t)) + ' Fan Rating</div>' +
          '<div class="ft-stars" aria-label="' + st + ' out of 5 stars">' + "★".repeat(st) + '<i>' + "★".repeat(5 - st) + '</i></div>' +
          '<div class="ft-tier" id="ft-tier">' + (st === 5 ? "SUPER FAN" : esc(FAN_TIER[st])) + '</div>' +
          '<div class="ft-line" id="ft-line">' + esc(fanLine(st, t)) + '</div>' +
          '<div class="mg-p" style="margin:0">' + (solo ? "" : "🏆 " + esc(top.name) + " · ") + top.correct + ' of ' + per + ' right · ' + top.score.toLocaleString() + ' pts' + (solo ? ' · best ' + Math.max(best, top.score).toLocaleString() : '') + '</div>';
      } else head = '<div class="mg-p" style="margin:0">' + (solo ? "Your score" : "🏆 " + esc(top.name) + " wins!") + '</div><div class="mg-big">' + top.score.toLocaleString() + '</div>' +
        '<div class="mg-p" style="margin:0">' + top.correct + ' of ' + per + ' right' + (solo ? ' · best ' + Math.max(best, top.score).toLocaleString() : '') + '</div>';
      var w = screen(title(), '<div class="mg-card" style="text-align:center">' + head +
        (S.table ? rankList(S.players, "score", function (p) { return (t ? fanStars(p.correct, per) + "★ · " : "") + p.score.toLocaleString() + " · " + p.correct + "/" + per; }) : '') + '<div id="mg-pts"></div>' +
        (t ? '<button type="button" class="mg-btn" id="ft-share">📤 Share my Fan Rating</button>' : '') + '</div>' +
        '<button type="button" class="mg-btn hot" id="mg-again">🔁 Play again</button><div class="mg-row2" style="margin-top:10px"><button type="button" class="mg-btn" id="mg-set">' + (t ? "🏟️ Change team" : "⚙️ Change setup") + '</button><button type="button" class="mg-btn" id="mg-all">🎲 All games</button></div>');
      // points: 1 per 2 right answers of the best player at this phone, max 5 a round (Games Pack cap 10/day on top). Same for Fan Test.
      if (!preview) w.querySelector("#mg-pts").appendChild(award(Math.min(5, Math.floor(top.correct / 2)), title()));
      var sh = w.querySelector("#ft-share");
      if (sh) sh.onclick = function () {
        var stars = fanStars(top.correct, per);
        var txt = "I'm a " + stars + "★ " + fanName(t) + " " + FAN_TIER[stars] + (SHARE_TAG ? " at " + SHARE_TAG : "") + " (" + top.correct + "/" + per + " on the Fan Test). Think you know the " + fanName(t) + "?";
        if (navigator.share) navigator.share({ text: txt }).catch(function () {});
        else if (navigator.clipboard) navigator.clipboard.writeText(txt).then(function () { sh.textContent = "✅ Copied"; }, function () {});
        sh.setAttribute("data-share", txt);
      };
      var names = S.players.map(function (p) { return p.name; });
      w.querySelector("#mg-again").onclick = function () { begin(names); };
      w.querySelector("#mg-set").onclick = setup;
      w.querySelector("#mg-all").onclick = closeOv;
    }
    // TEST HOOK (no points, no saved best): MelodyGames.fanPreview("nfl:14", 9, 10) opens the Fan Rating for 9 of 10 right.
    setup.fanPreview = function (key, correct, of) {
      if (!FAN_BY[key]) return false;
      cfg.fan = key; current = GAMES.filter(function (g) { return g.id === kind; })[0] || current; openOv();
      S = { players: [{ name: "You", score: correct * 125, correct: correct }], qs: new Array(of || 10), i: 0, table: false, team: FAN_BY[key] };
      results(true); return true;
    };
    return setup;
  }

  /* ================= MELODY WORD (daily 5-letter) ================= */
  var WORDS = D.WORDS.slice(), WORD_ORDER = shuffle(WORDS, rng(1952));   // Melody, since 1952
  function wordOfDay(day) { var n = dayNum(day); return WORD_ORDER[((n % WORD_ORDER.length) + WORD_ORDER.length) % WORD_ORDER.length]; }
  function scoreGuess(g, ans) {
    var res = [0, 0, 0, 0, 0], left = {};
    for (var i = 0; i < 5; i++) { if (g[i] === ans[i]) res[i] = 2; else left[ans[i]] = (left[ans[i]] || 0) + 1; }
    for (i = 0; i < 5; i++) if (res[i] !== 2 && left[g[i]]) { res[i] = 1; left[g[i]]--; }
    return res;   // 2 hit, 1 near, 0 miss
  }
  function melodyWord(practice) {
    var day = laDay(), ans = practice ? WORDS[Math.floor(Math.random() * WORDS.length)] : wordOfDay(day);
    var st = practice ? { day: day, guesses: [], done: false, won: false, t0: Date.now() } : lsGet("mg-word", null);
    if (!st || st.day !== day) st = { day: day, guesses: [], done: false, won: false, t0: Date.now() };
    if (!Array.isArray(st.hints)) st.hints = [];   // HINTS: max 2 per word. Hint 1 = the clue (if the word has one), else a letter; hint 2 = a letter.
    var cur = "", busy = false, num = dayNum(day) + 1, CLS = ["miss", "near", "hit"], HINT_MAX = 2;
    var clue = (D.WORD_CLUES || {})[ans] || "";
    var hintOrder = shuffle([0, 1, 2, 3, 4], practice ? Math.random : rng(dayNum(day) * 7919 + 1952));   // daily word: same reveal order for everyone
    var w = screen(WORD_NAME, '<div class="mg-h" style="text-align:center"><small>' + (practice ? "Practice word · no points" : "Daily word #" + num + " · same for everyone today") + '</small>' + esc(WORD_NAME) + '</div>' +
      '<div class="mg-msg" id="mw-msg" aria-live="polite"></div><div class="mw-grid" id="mw-grid"></div><div class="mw-hb" id="mw-hb"></div><div class="mw-kb" id="mw-kb"></div>' +
      '<div class="mg-legend"><span><i style="background:var(--gold)"></i>Right spot</span><span><i style="background:var(--wine2)"></i>In the word</span><span><i style="background:#1c2540"></i>Not in it</span></div><div id="mw-end"></div>');
    var grid = w.querySelector("#mw-grid"), kb = w.querySelector("#mw-kb"), msg = w.querySelector("#mw-msg"), end = w.querySelector("#mw-end"), hb = w.querySelector("#mw-hb");
    grid.innerHTML = [0, 1, 2, 3, 4, 5].map(function () { return '<div class="mw-row">' + "<div class=mw-t></div>".repeat(5) + '</div>'; }).join("");
    var rows = grid.querySelectorAll(".mw-row");
    kb.innerHTML = ["QWERTYUIOP", "ASDFGHJKL", "+ZXCVBNM-"].map(function (r) {
      return '<div class="mw-kr">' + r.split("").map(function (k) { return k === "+" ? '<button type="button" class="mw-k wd" data-k="ENTER">ENTER</button>' : k === "-" ? '<button type="button" class="mw-k wd" data-k="BACK" aria-label="Delete">⌫</button>' : '<button type="button" class="mw-k" data-k="' + k + '">' + k + '</button>'; }).join("") + '</div>';
    }).join("");
    function paintRow(r, g, res, anim) {
      var ts = rows[r].children;
      for (var i = 0; i < 5; i++) { ts[i].textContent = g[i] || ""; ts[i].className = "mw-t" + (g[i] ? " f" : ""); if (res) (function (t, c, d) { if (anim) { t.style.animationDelay = d + "ms"; t.classList.add("flip"); later(function () { t.classList.add(c); }, d + 250); } else t.classList.add(c); })(ts[i], CLS[res[i]], i * 140); }
    }
    function paintKeys() {
      var best = {};
      st.guesses.forEach(function (g) { var r = scoreGuess(g, ans); for (var i = 0; i < 5; i++) best[g[i]] = Math.max(best[g[i]] == null ? -1 : best[g[i]], r[i]); });
      [].forEach.call(kb.querySelectorAll("[data-k]"), function (b) { var k = b.getAttribute("data-k"); b.classList.remove("hit", "near", "miss", "hint"); if (best[k] != null) b.classList.add(CLS[best[k]]); });
      st.hints.forEach(function (h) { if (h.i != null) { var b = kb.querySelector('[data-k="' + ans[h.i] + '"]'); if (b) b.classList.add("hint"); } });
    }
    function hintTxt() { var h = st.hints.length; return h ? h + " hint" + (h === 1 ? "" : "s") : "no hints"; }
    function paintHints() {
      var left = HINT_MAX - st.hints.length, shown = {}, hasClue = false;
      st.hints.forEach(function (h) { if (h.i != null) shown[h.i] = 1; else hasClue = true; });
      var html = '<button type="button" class="mg-btn" id="mw-hint"' + (left <= 0 || st.done ? " disabled" : "") + '>' + (left > 0 ? "💡 Hint (" + left + " left)" : "No hints left") + '</button>';
      if (Object.keys(shown).length) html += '<div class="mw-hrow" aria-label="Hint letters"><span>Hint:</span>' + [0, 1, 2, 3, 4].map(function (i) { return shown[i] ? '<div class="mw-ht on">' + ans[i] + '</div>' : '<div class="mw-ht"></div>'; }).join("") + '</div>';
      if (hasClue) html += '<div class="mw-clue">💡 ' + esc(clue) + '</div>';
      hb.innerHTML = html;
      hb.querySelector("#mw-hint").onclick = useHint;
    }
    function useHint() {
      if (st.done || busy || st.hints.length >= HINT_MAX) return;
      if (!st.hints.length && clue) { st.hints.push({ c: 1 }); msg.textContent = "Clue unlocked"; }
      else {
        var found = {};
        st.guesses.forEach(function (g) { scoreGuess(g, ans).forEach(function (x, i) { if (x === 2) found[i] = 1; }); });
        st.hints.forEach(function (h) { if (h.i != null) found[h.i] = 1; });
        var pos = hintOrder.filter(function (i) { return !found[i]; })[0];
        if (pos == null) { msg.textContent = "You've already found every letter spot"; return; }
        st.hints.push({ i: pos }); msg.textContent = "Letter " + (pos + 1) + " is " + ans[pos];
      }
      save(); paintHints(); paintKeys();
    }
    function save() { if (!practice) lsSet("mg-word", st); }
    function tickClock() { var s = Math.floor(((st.t1 || Date.now()) - st.t0) / 1000); ovH.textContent = Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }
    st.guesses.forEach(function (g, r) { paintRow(r, g, scoreGuess(g, ans), false); });
    paintKeys(); paintHints(); tickClock(); if (!st.done) every(tickClock, 1000);
    if (st.done) finish(false);
    function press(k) {
      if (st.done || busy) return;
      if (k === "BACK") cur = cur.slice(0, -1);
      else if (k === "ENTER") {
        if (cur.length < 5) { msg.textContent = "5 letters, please"; rows[st.guesses.length].classList.remove("shake"); void rows[st.guesses.length].offsetWidth; rows[st.guesses.length].classList.add("shake"); return; }
        var r = st.guesses.length, res = scoreGuess(cur, ans); st.guesses.push(cur); busy = true;
        paintRow(r, cur, res, true); cur = ""; msg.textContent = "";
        if (res.join("") === "22222") { st.done = true; st.won = true; st.t1 = Date.now(); }
        else if (st.guesses.length >= 6) { st.done = true; st.t1 = Date.now(); }
        save();
        later(function () { busy = false; paintKeys(); if (st.done) finish(true); }, 950);
        return;
      } else if (/^[A-Z]$/.test(k) && cur.length < 5) cur += k;
      paintRow(st.guesses.length, cur, null, false);
    }
    function finish(fresh) {
      clearTimers(); tickClock(); paintKeys(); paintHints();
      var n = st.guesses.length;
      msg.textContent = st.won ? ["Genius!", "Magnificent!", "Impressive!", "Splendid!", "Great!", "Phew!"][n - 1] : "The word was " + ans;
      var stats = lsGet("mg-word-stats", { played: 0, wins: 0, streak: 0, last: "" }) || { played: 0, wins: 0, streak: 0, last: "" };
      if (fresh && !practice && stats.last !== day) { stats.played++; if (st.won) { stats.wins++; stats.streak = (stats.last && dayNum(day) - dayNum(stats.last) === 1 && stats.lastWon) ? stats.streak + 1 : 1; } else stats.streak = 0; stats.last = day; stats.lastWon = st.won; lsSet("mg-word-stats", stats); }
      var grid = st.guesses.map(function (g) { return scoreGuess(g, ans).map(function (x) { return ["⬛", "🟥", "🟨"][x]; }).join(""); }).join("\n");
      end.innerHTML = '<div class="mg-card" style="margin-top:12px;text-align:center">' + (practice ? '<div class="mg-p" style="margin:0">Practice word</div>' :
        '<div class="mg-meta" style="justify-content:space-around"><span><b>' + stats.played + '</b> played</span><span><b>' + (stats.played ? Math.round(stats.wins / stats.played * 100) : 0) + '%</b> wins</span><span><b>' + stats.streak + '</b> streak</span></div>') +
        '<div class="mg-p" id="mw-sum" style="margin:10px 0 0;color:var(--ink);font-weight:800">' + (st.won ? "Solved in " + n : "Not solved") + " · " + hintTxt() + '</div>' +
        '<div id="mw-pts"></div>' + (practice ? '' : '<button type="button" class="mg-btn" id="mw-share">📤 Share my result</button><div class="mg-p" style="margin:8px 0 0">New ' + esc(WORD_NAME) + ' every day at midnight (LA time).</div>') + '</div>' +
        '<button type="button" class="mg-btn hot" id="mw-again">🔁 Play again (practice word)</button><button type="button" class="mg-btn" id="mw-all">🎲 All games</button>';
      if (!practice && st.won) {
        if (!st.awarded) { st.awarded = 1; save(); end.querySelector("#mw-pts").appendChild(award(Math.max(1, 3 - st.hints.length), WORD_NAME)); /* 3 pts, 2 with 1 hint, 1 with 2 hints */ }
        else end.querySelector("#mw-pts").innerHTML = '<div class="mg-won">✅ Solved today<small>Points for today\'s word are already counted.</small></div>';
      }
      var sh = end.querySelector("#mw-share");
      if (sh) sh.onclick = function () {
        var txt = WORD_NAME + " #" + num + " " + (st.won ? n : "X") + "/6 · " + hintTxt() + "\n" + grid + (SHARE_TAG ? "\n" + SHARE_TAG : "");
        if (navigator.share) navigator.share({ text: txt }).catch(function () {});
        else if (navigator.clipboard) navigator.clipboard.writeText(txt).then(function () { sh.textContent = "✅ Copied"; }, function () {});
      };
      end.querySelector("#mw-again").onclick = function () { melodyWord(true); };
      end.querySelector("#mw-all").onclick = closeOv;
    }
    [].forEach.call(kb.querySelectorAll("[data-k]"), function (b) { b.onclick = function () { press(b.getAttribute("data-k")); }; });
    keyHandler = function (e) { if (e.metaKey || e.ctrlKey || e.altKey) return; var k = e.key; if (k === "Enter") press("ENTER"); else if (k === "Backspace") press("BACK"); else if (/^[a-z]$/i.test(k)) press(k.toUpperCase()); };
  }

  /* ================= MELODY MIX (word scramble) ================= */
  function melodyMix() {
    var first = lsGet("mg-mix-day", "") !== laDay();
    var list = shuffle(D.SCRAMBLE, first ? rng(dayNum(laDay()) + 7) : null);   // today's set first, random after that
    lsSet("mg-mix-day", laDay());
    var S = { i: 0, solved: 0, score: 0, skips: 3, left: MIX_SECS }, pick = [], word, hint, tiles;
    var w = screen(MIX_NAME, '<div class="mg-meta"><span>Solved <b id="mx-n">0</b></span><span>Score <b id="mx-sc">0</b></span><span>Skips <b id="mx-sk">3</b></span></div>' +
      '<div class="mg-tbar"><i style="width:100%"></i></div><div class="mg-p" style="text-align:center;margin:0">Hint: <b id="mx-h" style="color:var(--gold2)"></b></div>' +
      '<div class="mx-slots" id="mx-sl"></div><div class="mx-tiles" id="mx-t"></div>' +
      '<div class="mx-row"><button type="button" class="mg-btn" id="mx-bk">⌫</button><button type="button" class="mg-btn" id="mx-cl">Clear</button><button type="button" class="mg-btn" id="mx-sh">🔀 Mix</button><button type="button" class="mg-btn" id="mx-skp">Skip ⏭</button></div>' +
      '<p class="mg-p" style="text-align:center;margin-top:12px">Tap the letters to unscramble the word. ' + MIX_SECS + ' seconds, as many as you can.</p>');
    var sl = w.querySelector("#mx-sl"), tw = w.querySelector("#mx-t"), bar = w.querySelector(".mg-tbar i");
    function next() {
      var r = list[S.i++ % list.length]; word = r[0]; hint = r[1]; pick = [];
      var letters = word.split(""), mixed; do { mixed = shuffle(letters); } while (mixed.join("") === word && word.length > 1);
      tiles = mixed; w.querySelector("#mx-h").textContent = hint + " · " + word.length + " letters"; draw();
    }
    function draw() {
      sl.innerHTML = word.split("").map(function (c, i) { return '<div class="mx-s' + (pick[i] != null ? " f" : "") + '">' + (pick[i] != null ? tiles[pick[i]] : "") + '</div>'; }).join("");
      tw.innerHTML = tiles.map(function (c, i) { return '<button type="button" class="mx-t" data-i="' + i + '"' + (pick.indexOf(i) >= 0 ? " disabled" : "") + '>' + c + '</button>'; }).join("");
      [].forEach.call(tw.querySelectorAll("button"), function (b) { b.onclick = function () { tap(+b.getAttribute("data-i")); }; });
    }
    function tap(i) {
      if (S.left <= 0 || pick.indexOf(i) >= 0) return; pick.push(i); draw();
      if (pick.length === word.length) {
        var g = pick.map(function (j) { return tiles[j]; }).join("");
        if (g === word) { S.solved++; S.score += 50 + word.length * 10; sl.classList.remove("mx-ok"); void sl.offsetWidth; sl.classList.add("mx-ok"); hud(); later(next, 380); }
        else { sl.classList.remove("mx-shake"); void sl.offsetWidth; sl.classList.add("mx-shake"); later(function () { pick = []; sl.classList.remove("mx-shake"); draw(); }, 420); }
      }
    }
    function hud() { w.querySelector("#mx-n").textContent = S.solved; w.querySelector("#mx-sc").textContent = S.score; w.querySelector("#mx-sk").textContent = S.skips; }
    w.querySelector("#mx-bk").onclick = function () { pick.pop(); draw(); };
    w.querySelector("#mx-cl").onclick = function () { pick = []; draw(); };
    w.querySelector("#mx-sh").onclick = function () { var picked = pick.map(function (j) { return tiles[j]; }); tiles = shuffle(tiles); pick = []; var used = tiles.map(function () { return 0; }); picked.forEach(function (c) { for (var j = 0; j < tiles.length; j++) if (!used[j] && tiles[j] === c) { used[j] = 1; pick.push(j); break; } }); draw(); };
    w.querySelector("#mx-skp").onclick = function () { if (S.skips <= 0) return; S.skips--; hud(); next(); };
    keyHandler = function (e) { if (e.key === "Backspace") { pick.pop(); draw(); return; } var k = (e.key || "").toUpperCase(); if (!/^[A-Z]$/.test(k)) return; for (var j = 0; j < tiles.length; j++) if (tiles[j] === k && pick.indexOf(j) < 0) { tap(j); break; } };
    ovH.textContent = MIX_SECS + "s"; next();
    var t0 = Date.now();
    every(function () { S.left = Math.max(0, MIX_SECS - (Date.now() - t0) / 1000); bar.style.width = (S.left / MIX_SECS * 100) + "%"; bar.classList.toggle("low", S.left < 10); ovH.textContent = Math.ceil(S.left) + "s"; if (S.left <= 0) done(); }, 200);
    function done() {
      var best = +lsGet("mg-best-mix", 0) || 0; if (S.score > best) lsSet("mg-best-mix", S.score);
      var w2 = screen(MIX_NAME, '<div class="mg-card" style="text-align:center"><div class="mg-p" style="margin:0">Time! You unscrambled</div><div class="mg-big">' + S.solved + '</div><div class="mg-p" style="margin:0">words · score ' + S.score + ' · best ' + Math.max(best, S.score) + '</div><div class="mg-p" style="margin:8px 0 0">Last one was <b style="color:var(--gold2)">' + esc(word) + '</b></div><div id="mg-pts"></div></div>' +
        '<button type="button" class="mg-btn hot" id="mg-again">🔁 Play again</button><button type="button" class="mg-btn" id="mg-all">🎲 All games</button>');
      w2.querySelector("#mg-pts").appendChild(award(Math.min(3, Math.floor(S.solved / 2)), MIX_NAME));
      w2.querySelector("#mg-again").onclick = melodyMix; w2.querySelector("#mg-all").onclick = closeOv;
    }
  }

  /* ================= TRUTH OR DARE (bar-friendly) ================= */
  var SAFE = "🍹 Play responsibly. Dares never involve drinking. Pass anytime, no pressure.";
  function truthOrDare() {
    var getNames = null;
    var w = screen("Truth or Dare", '<div class="mg-h"><small>Table game · 1–6 players</small>Truth or Dare</div>' +
      '<p class="mg-p">Light truths and fun table dares: sing a chorus, toast the table, group selfies, 5-second dance moves. Everyone stays at the table.</p>' +
      '<div class="mg-lbl">Players (optional)</div><div class="mg-names" id="mg-names"></div>' +
      '<button type="button" class="mg-btn hot" id="td-go">▶ Start (3 turns each)</button><button type="button" class="mg-btn" id="td-quick">⚡ Quick play, no names</button><div class="td-safe">' + SAFE + '</div>');
    getNames = namesEditor(w.querySelector("#mg-names"), 1, 6);
    w.querySelector("#td-go").onclick = function () { start(getNames()); };
    w.querySelector("#td-quick").onclick = function () { start(["You"]); };
    function start(names) {
      var S = { players: names.map(function (n) { return { name: n, stars: 0 }; }), turn: 0, truths: shuffle(D.TRUTHS), dares: shuffle(D.DARES), ti: 0, di: 0 };
      S.total = S.players.length > 1 ? S.players.length * 3 : 10;
      function p() { return S.players[S.turn % S.players.length]; }
      function choose() {
        if (S.turn >= S.total) return results();
        var multi = S.players.length > 1;
        var w = screen("Truth or Dare", '<div class="mg-meta"><span>Turn <b>' + (S.turn + 1) + '</b> of ' + S.total + '</span><span>⭐ <b>' + p().stars + '</b></span></div>' +
          '<div class="mg-pass" style="padding:18px 0 4px"><b>' + (multi ? esc(p().name) + "'s turn" : "Your turn") + '</b><span class="mg-p">Pick one</span></div>' +
          '<div class="td-pick"><button type="button" class="tr" data-k="t">TRUTH<small>A light question</small></button><button type="button" class="da" data-k="d">DARE<small>A fun table dare</small></button></div>' +
          '<button type="button" class="mg-btn" data-k="r">🎲 Surprise me</button><div class="td-safe">' + SAFE + '</div>');
        [].forEach.call(w.querySelectorAll("[data-k]"), function (b) { b.onclick = function () { var k = b.getAttribute("data-k"); if (k === "r") k = Math.random() < 0.5 ? "t" : "d"; card(k); }; });
      }
      function card(k) {
        var isD = k === "d", item = isD ? S.dares[S.di++ % S.dares.length] : S.truths[S.ti++ % S.truths.length];
        var text = isD ? item[0] : item, secs = isD ? item[1] : 0;
        var w = screen("Truth or Dare", '<div class="mg-meta"><span>' + esc(p().name) + '</span><span>⭐ <b>' + p().stars + '</b></span></div>' +
          '<div class="mg-card td-card" style="margin-top:10px' + (isD ? ';border-color:var(--wine2)' : '') + '"><span class="k">' + (isD ? "Dare" : "Truth") + '</span><p>' + esc(text) + '</p></div>' +
          (secs ? '<div class="mg-tbar" style="margin-top:14px"><i style="width:100%"></i></div><button type="button" class="mg-btn" id="td-t">⏱ Start ' + secs + 's timer</button>' : '') +
          '<div class="mg-row2" style="margin-top:12px"><button type="button" class="mg-btn hot" id="td-ok">✓ Done</button><button type="button" class="mg-btn" id="td-pass">Pass</button></div><div class="td-safe">' + SAFE + '</div>');
        var tb = w.querySelector("#td-t");
        if (tb) tb.onclick = function () {
          tb.disabled = true; var t0 = Date.now(), bar = w.querySelector(".mg-tbar i");
          every(function () { var l = Math.max(0, secs - (Date.now() - t0) / 1000); bar.style.width = (l / secs * 100) + "%"; bar.classList.toggle("low", l < 4); ovH.textContent = Math.ceil(l) + "s"; tb.textContent = l > 0 ? "⏱ " + Math.ceil(l) + "s left" : "⏰ Time!"; }, 200);
        };
        w.querySelector("#td-ok").onclick = function () { p().stars++; S.turn++; choose(); };
        w.querySelector("#td-pass").onclick = function () { S.turn++; choose(); };
      }
      function results() {
        var w = screen("Truth or Dare", '<div class="mg-card" style="text-align:center"><div class="mg-p" style="margin:0">Game over</div><div class="mg-big">⭐</div>' +
          (S.players.length > 1 ? rankList(S.players, "stars", function (x) { return x.stars + " ⭐"; }) : '<div class="mg-p">You finished ' + S.players[0].stars + ' of ' + S.total + ' cards</div>') +
          '<div class="mg-p" style="margin:10px 0 0">Truth or Dare is just for fun: no points.</div></div>' +
          '<button type="button" class="mg-btn hot" id="mg-again">🔁 Play again</button><button type="button" class="mg-btn" id="mg-all">🎲 All games</button><div class="td-safe">' + SAFE + '</div>');
        w.querySelector("#mg-again").onclick = function () { start(names); }; w.querySelector("#mg-all").onclick = closeOv;
      }
      choose();
    }
  }

  /* ---------- register the games ---------- */
  register({ id: "trivia", order: 20, icon: "🎤", title: "Melody Trivia", sub: "Music, food & drink, pop culture, LA. Solo or pass the phone.", tag: "+pts", start: triviaGame("trivia") });
  var sportsStart = triviaGame("sports");
  register({ id: "sports", order: 30, icon: "🏆", title: "Sports Trivia", sub: FAN_TEAMS.length ? "Fan Test: pick your team, get your Fan Rating." : "NBA, NFL, MLB, soccer. Heavy on LA teams.", tag: "+pts", start: sportsStart });
  register({ id: "word", order: 40, icon: "🔤", title: WORD_NAME, sub: "Today's 5-letter word. 6 tries.", tag: "Daily", start: function () { melodyWord(false); } });
  register({ id: "mix", order: 50, icon: "🔀", title: MIX_NAME, sub: "Unscramble as many words as you can in 60s.", start: melodyMix });
  register({ id: "truthdare", order: 60, adult: true, icon: "🎭", title: "Truth or Dare", sub: "Light truths, fun table dares. No drinking dares.", start: truthOrDare });

  window.MelodyGames = { register: register, open: open, close: closeOv, screen: screen, every: every, later: later, esc: esc, lsGet: lsGet, lsSet: lsSet, laDay: laDay, refresh: drawTiles,
    fanPreview: sportsStart.fanPreview,
    setHud: function (t) { ovH.textContent = t; }, isOpen: function (id) { return ov.classList.contains("on") && current && current.id === id; }, kidMode: kidMode };
  // deep link: #games/<id> opens a game (e.g. a table card QR)
  var m = /^#games\/([a-z]+)/.exec(location.hash || ""); if (m) setTimeout(function () { open(m[1]); }, 300);
  document.addEventListener("visibilitychange", function () { if (!document.hidden && !ov.classList.contains("on")) drawTiles(); });
})();
