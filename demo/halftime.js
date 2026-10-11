/* SousShift AI — HALFTIME: a ~20 s break that plays Antidote The Foodie's own highlight reel of THIS restaurant's review
   (three big bites + a FOLLOW @THEREALANTIDOTE outro), then offers "▶ Watch the full review" (YouTube) or "Back to the game".
   Same look and behaviour as the Drizzle Bowl halftime: full-screen overlay, HALFTIME tag, SKIP, TAP FOR SOUND when the
   browser blocks sound, game music paused and resumed, stall watch.

   Include it early (before the game creates its AudioContext, so it can pause the game's sound), after REVIEW_EGG:
     <script>window.REVIEW_EGG={vid:"<YouTube id>",restaurant:"…",short:"…"};</script>
     <script src="../halftime.js"></script>
   Optional window.HALFTIME={src:"img/review/halftime.mp4",poster:"img/review/halftime.jpg",vid:"…",min:90,max:120}.

   When it shows (once per run):
     · games with levels: Halftime.levelUp(newLevel, resume[, playMs]) at every level-up. It takes over at the first
       level-up into level 3, 4 or 5 (= after finishing level 2, 3 or 4) once ~90 s have been played, or at the 4 → 5
       level-up regardless. Returns true when it took over: the game must stay frozen until resume() is called.
     · games without levels: Halftime.tick(playMs, pauseGame, resume) at natural pause points (between rounds, after a
       match…). Once playMs passes the run's 90–120 s mark it calls pauseGame(), plays, then resume(). Returns true if it took over.
     · Halftime.reset() at the start of every run. Halftime.active → true while it is on screen.
   Test: ?half=1 → it takes over at the next level-up, or at the first tick() after 5 s of play. */
(function () {
  "use strict";
  if (window.Halftime) return;
  var W = window, D = document, C = W.HALFTIME || {}, E = W.REVIEW_EGG || {};
  var VID = C.vid || E.vid || "";
  var URL_ = VID ? "https://www.youtube.com/watch?v=" + encodeURIComponent(VID) : "https://www.youtube.com/@therealantidote";
  var SRC = C.src || "img/review/halftime.mp4", POSTER = C.poster || "img/review/halftime.jpg";
  var SHORT = (C.short || E.short || E.restaurant || "").toUpperCase();
  var TEST = /[?&]half=1(?:&|$)/.test(location.search);
  var T = function (s) { return (W.__T || String)(s); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]; }); };
  /* real timers: gamepause.js wraps setTimeout/setInterval later; the break keeps its own clock either way */
  var sT = W.setTimeout.bind(W), cT = W.clearTimeout.bind(W), sI = W.setInterval.bind(W), cI = W.clearInterval.bind(W);
  var now = function () { return W.performance.now(); };   // gamepause.js freezes this while the game is paused: play time, not wall time

  /* every AudioContext the game makes, so its music + sfx can be hushed for the break and brought back after */
  var ctxs = [];
  ["AudioContext", "webkitAudioContext"].forEach(function (k) {
    var Ctor = W[k]; if (!Ctor || Ctor.__htWrapped) return;
    var P = function () { var c = new (Function.prototype.bind.apply(Ctor, [null].concat([].slice.call(arguments))))(); ctxs.push(c); return c; };
    P.prototype = Ctor.prototype; P.__htWrapped = 1; W[k] = P;
  });

  var S = { shown: false, t0: now(), at: 0, lastPlay: null, active: false };
  function pickAt() { var a = C.min || 90, b = C.max || 120; S.at = TEST ? 5000 : (a + Math.random() * (b - a)) * 1000; }
  function reset() { S.shown = false; S.t0 = now(); S.lastPlay = null; pickAt(); }
  pickAt();
  function played(ms) { if (typeof ms === "number" && ms >= 0) S.lastPlay = ms; return S.lastPlay != null ? S.lastPlay : now() - S.t0; }
  function canPlay() { var v = D.createElement("video"); return !!(v.canPlayType && v.canPlayType("video/mp4")); }

  /* ---------- styles (Drizzle Bowl halftime, in his brand: blue base, bold yellow, red play) ---------- */
  var st = D.createElement("style");
  st.textContent =
    ".ht{position:fixed;inset:0;z-index:2147483000;display:none;align-items:center;justify-content:center;background:#000;overflow:hidden;touch-action:none;-webkit-user-select:none;user-select:none}" +
    ".ht.on{display:flex}.ht video{width:100%;height:100%;object-fit:contain;background:#000}" +
    ".ht-tag{position:absolute;top:calc(14px + env(safe-area-inset-top));left:0;right:0;text-align:center;font-family:Impact,'Arial Black',sans-serif;font-size:24px;letter-spacing:4px;color:#ffd23f;text-shadow:0 0 10px #ffd23f,0 0 26px rgba(255,210,63,.55),0 2px 4px #000;pointer-events:none}" +
    ".ht-sub{position:absolute;bottom:calc(22px + env(safe-area-inset-bottom));left:0;right:0;text-align:center;font:bold 12px Verdana,sans-serif;letter-spacing:2px;color:rgba(255,255,255,.88);text-shadow:0 1px 3px #000;pointer-events:none;padding:0 12px}" +
    ".ht-skip{position:absolute;top:calc(12px + env(safe-area-inset-top));right:12px;font:bold 12px Verdana,sans-serif;letter-spacing:1px;color:#fff;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.6);border-radius:20px;padding:9px 14px;cursor:pointer;opacity:0;pointer-events:none;transition:opacity .3s}" +
    ".ht-skip.on{opacity:1;pointer-events:auto}.ht-skip:focus-visible,.ht-end a:focus-visible,.ht-end button:focus-visible{outline:2px solid #ffd23f;outline-offset:2px}" +
    ".ht-tap{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-family:Impact,'Arial Black',sans-serif;font-size:28px;letter-spacing:3px;color:#fff;background:rgba(0,0,0,.6);border:2px solid #ffd23f;border-radius:14px;padding:16px 24px;cursor:pointer;text-shadow:0 0 12px #ffd23f;white-space:nowrap}" +
    ".ht-tap[hidden],.ht-end[hidden]{display:none!important}" +
    ".ht-end{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px 16px;box-sizing:border-box;text-align:center;" +
    "background:radial-gradient(ellipse at 50% 40%,rgba(22,86,235,.94),rgba(5,20,92,.97) 70%);color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}" +
    ".ht-end img{width:min(240px,62vw);aspect-ratio:9/16;object-fit:contain;border-radius:14px;box-shadow:0 0 0 3px #ffd23f,0 12px 30px rgba(0,0,0,.45);background:#000}" +
    ".ht-end b{font-family:Impact,'Arial Black',sans-serif;font-weight:400;font-size:22px;letter-spacing:1.5px;color:#ffd23f;text-shadow:0 2px 0 #8a0000}" +
    ".ht-watch{display:inline-flex;align-items:center;justify-content:center;gap:10px;width:min(330px,100%);padding:15px 18px;border-radius:999px;background:#e10600;color:#ffd23f;border:3px solid #ffd23f;" +
    "font:400 22px/1 Impact,'Arial Black',sans-serif;letter-spacing:1px;text-decoration:none;box-shadow:0 6px 0 #780000,0 12px 26px rgba(0,0,0,.45);box-sizing:border-box}" +
    ".ht-watch:active{transform:translateY(3px);box-shadow:0 3px 0 #780000}" +
    ".ht-back{width:min(330px,100%);padding:13px 18px;border-radius:999px;background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.6);font:800 16px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;cursor:pointer;box-sizing:border-box}" +
    ".ht-end small{font-size:12px;color:#dbe4ff;font-weight:700;letter-spacing:.4px}";
  D.head.appendChild(st);

  var el, v, tag, sub, skip, tap, endP;
  function build() {
    if (el) return;
    el = D.createElement("div"); el.className = "ht"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Halftime: Antidote's review of " + (E.restaurant || "this spot"));
    el.innerHTML = '<video playsinline webkit-playsinline preload="auto"></video><div class="ht-tag">' + esc(T("HALFTIME")) + '</div>' +
      '<div class="ht-sub"></div><button type="button" class="ht-skip">' + esc(T("SKIP")) + ' &#9654;</button><div class="ht-tap" hidden>' + esc(T("TAP FOR SOUND")) + '</div>' +
      '<div class="ht-end" hidden><img alt=""><b>' + esc(T("Like the bites?")) + '</b>' +
      '<a class="ht-watch" target="_blank" rel="noopener" href="' + esc(URL_) + '">&#9654; ' + esc(T("Watch the full review")) + '</a>' +
      '<button type="button" class="ht-back">' + esc(T("Back to the game")) + '</button><small>@therealantidote</small></div>';
    v = el.querySelector("video"); tag = el.querySelector(".ht-tag"); sub = el.querySelector(".ht-sub"); skip = el.querySelector(".ht-skip");
    tap = el.querySelector(".ht-tap"); endP = el.querySelector(".ht-end");
    // nothing on the overlay may reach the game underneath (taps would steer / restart it)
    ["pointerdown", "pointerup", "touchstart", "touchend", "mousedown", "mouseup", "click", "wheel"].forEach(function (ev) {
      el.addEventListener(ev, function (e) { e.stopPropagation(); }, { passive: true });
    });
    D.body.appendChild(el);
  }

  /* ---------- the break ---------- */
  var hushed = [], wasRunning = [];
  function hush() {
    hushed = [].filter.call(D.querySelectorAll("audio,video"), function (m) { return m !== v && !m.paused && !m.ended; });
    hushed.forEach(function (m) { try { m.pause(); } catch (e) {} });
    wasRunning = ctxs.filter(function (c) { return c.state === "running"; });
    wasRunning.forEach(function (c) { try { c.suspend(); } catch (e) {} });
    try { W.RadioAvatar && W.RadioAvatar.clear && W.RadioAvatar.clear(); } catch (e) {}
  }
  function unhush() {
    wasRunning.forEach(function (c) { try { c.resume(); } catch (e) {} });
    hushed.forEach(function (m) { try { var p = m.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {} });
    hushed = []; wasRunning = [];
  }

  function show(resume) {
    build(); S.shown = true; S.active = true; hush();
    var done = false, ended = false, wantSound = true, timers = [], lastT = -1, stuck = 0, started = false, backT = null;
    function later(f, ms) { var id = sT(f, ms); timers.push(id); return id; }
    sub.textContent = "ANTIDOTE REVIEWS" + (SHORT ? " · " + SHORT : "");
    tag.textContent = T("HALFTIME"); tag.style.display = ""; sub.style.display = "";
    endP.hidden = true; tap.hidden = true; skip.classList.remove("on"); v.style.visibility = "";
    el.classList.add("on");
    try { W.navigator.vibrate && W.navigator.vibrate([20, 40, 20]); } catch (e) {}
    function finish() {
      if (done) return; done = true; S.active = false;
      timers.forEach(cT); cI(watch); if (backT) cI(backT);
      try { v.pause(); } catch (e) {} v.onended = v.onerror = null; v.removeAttribute("src"); try { v.load(); } catch (e) {}
      el.classList.remove("on"); unhush();
      try { resume && resume(); } catch (e) { if (W.console) console.error(e); }
    }
    function endPanel() {
      if (ended || done) return; ended = true;
      try { v.pause(); } catch (e) {}
      tag.style.display = "none"; sub.style.display = "none"; tap.hidden = true; skip.classList.remove("on");
      var im = endP.querySelector("img"); im.src = POSTER; im.onerror = function () { im.style.display = "none"; };
      endP.hidden = false;
      var back = endP.querySelector(".ht-back"), n = 15, lbl = T("Back to the game");
      back.textContent = lbl + " (" + n + ")";
      back.onclick = function (e) { e.stopPropagation(); finish(); };
      endP.querySelector(".ht-watch").onclick = function () { /* opens YouTube in a new tab; the game stays parked on this panel */ n = 1e9; back.textContent = lbl; };
      backT = sI(function () { if (n > 1e8) return; n--; if (n <= 0) finish(); else back.textContent = lbl + " (" + n + ")"; }, 1000);
      try { back.focus({ preventScroll: true }); } catch (e) {}
    }
    skip.onclick = function (e) { e.stopPropagation(); if (!ended) endPanel(); else finish(); };
    later(function () { skip.classList.add("on"); }, 3000);                       // SKIP after ~3 s
    v.onended = endPanel;
    v.onerror = function () { started ? endPanel() : finish(); };               // the reel won't load at all: straight back to the game
    v.muted = false; v.src = SRC; try { v.load(); } catch (e) { finish(); return; }
    var p = v.play();
    if (p && p.catch) p.catch(function () {                                      // sound blocked: play muted + TAP FOR SOUND
      if (done) return; wantSound = false; v.muted = true; tap.hidden = false; tap.textContent = T("TAP FOR SOUND");
      tap.onclick = function (e) { e.stopPropagation(); wantSound = true; v.muted = false; tap.hidden = true; var p3 = v.play(); if (p3 && p3.catch) p3.catch(function () {}); };
      var p2 = v.play(); if (p2 && p2.catch) p2.catch(function () {
        tap.textContent = T("TAP TO PLAY");
        tap.onclick = function (e) { e.stopPropagation(); v.muted = false; tap.hidden = true; var p4 = v.play(); if (p4 && p4.catch) p4.catch(endPanel); };
      });
    });
    /* stall watch: a phone gets time to buffer; a reel that truly stops moving goes to the end panel. A clip with no data yet
       is kept out of sight so nobody stares at a frozen first frame. */
    var noData = 0, watch = sI(function () {
      if (done || ended) return;
      if (v.readyState >= 2) { noData = 0; v.style.visibility = ""; } else if (++noData >= 2) v.style.visibility = "hidden";
      sub.style.display = v.duration && v.currentTime > v.duration - 4.8 ? "none" : "";   // the outro card carries its own text
      if (!tap.hidden && v.paused) return;                                        // parked on the user's tap
      if (v.paused && !v.ended) { try { v.muted = !wantSound; var pw = v.play(); if (pw && pw.catch) pw.catch(function () { v.muted = true; v.play().catch(function () {}); }); } catch (e) {} }
      if (v.currentTime > lastT + 0.05) { lastT = v.currentTime; stuck = 0; started = true; return; }
      stuck++;
      if (v.readyState < 2 && stuck >= 20) { started ? endPanel() : finish(); return; }   // 10 s and no data
      if (stuck >= 30) endPanel();
    }, 500);
    later(function () { if (!done && !ended) endPanel(); }, 60000);              // never longer than a minute of reel
  }

  function levelUp(newLevel, resume, playMs) {
    if (S.shown || S.active || !canPlay()) return false;
    var n = +newLevel || 0, ms = played(playMs);
    if (!TEST) { if (n < 3 || n > 5) return false; if (ms < (C.min || 90) * 1000 && n !== 5) return false; }
    show(resume); return true;
  }
  function tick(playMs, pauseGame, resume) {
    if (S.shown || S.active || !canPlay()) return false;
    if (played(playMs) < S.at) return false;
    try { pauseGame && pauseGame(); } catch (e) {}
    show(resume); return true;
  }

  W.Halftime = { levelUp: levelUp, tick: tick, reset: reset, show: function (resume) { if (!S.active) show(resume); }, url: URL_, test: TEST,
    get active() { return S.active; }, get shown() { return S.shown; } };
})();
