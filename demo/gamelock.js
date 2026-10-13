/* SousShift AI — game screen lock. Include once on any page with a game: <script src="../gamelock.js?v=…"></script>
   The page scrolls NORMALLY until a run is actually live. Only then:
   1) a finger on the game canvas never scrolls, bounces or zooms the page, and
   2) the whole screen is LOCKED: nothing on the page scrolls, bounces, zooms or pull-to-refreshes, so grabbing the phone
      or missing a button never slides it around. A pill shows "Screen locked · Unlock". Tapping it frees the page (free
      mode) and the pill becomes "Lock screen", which locks it again. Free mode stays until they lock again.
   The lock lets go the moment the run is not live: game over, the Pause screen, the start menu back up (restart-to-menu),
   halftime, leaving full screen, switching apps/tabs. Before PLAY a swipe that starts on the canvas or the start menu
   scrolls the page like anywhere else.
   "Run is live" comes from, in order:
     · window.GameLock.playing(true|false|null)   explicit override from the page (null = back to auto)
     · window.GAMELOCK_RUNNING = function(){ return bool }   a page hook
     · the game's own state: __MG/__S/__NV/__LD/__OG .get().running (attract/demo runs don't count), __CL .get().state
     · otherwise: PLAY on the start menu, or a tap on the game canvas, starts it; it ends on the menu coming back, Pause,
       or ~4 s with no touch in the game area.
   Game areas: canvas#game, canvas#cv, canvas[data-game], [data-game] (not leaderboards), .gamebox.
   While locked, scrollable panels/modals (or anything with [data-scroll-ok]) still scroll inside themselves.
   html gets .ssai-playing while a run is live and .ssai-locked while the screen is locked.
   Also loads gamepause.js (Pause button for every game) with the same ?v= as this file.
   Touch only: a mouse never locks the page. Pill position: window.GAMELOCK_POS = "top-left" | "top-right" |
   "bottom-left" | "bottom-right" (default "bottom-left"), set before this script. */
(function () {
  "use strict";
  if (window.__ssaiGameLock) return;
  window.__ssaiGameLock = 1;
  var W = window, D = document, H = D.documentElement;
  var every = W.setInterval.bind(W);   // grabbed before gamepause.js wraps timers (its wrapped ones stop while paused)
  // Every game also gets a Pause button (gamepause.js, served next to this file, same cache-busting version).
  var me = D.currentScript;
  if (me && me.src && !W.__ssaiGamePause) {
    var gp = D.createElement("script");
    gp.src = me.src.replace(/gamelock\.js(\?[^#]*)?(#.*)?$/, function (m, qs) { return "gamepause.js" + (qs || ""); });
    D.head.appendChild(gp);
  }
  var CANVAS = "canvas#game, canvas#cv, canvas[data-game]";
  var AREA = CANVAS + ", [data-game]:not(#champs):not([data-champs]), .gamebox";
  var POS = (W.GAMELOCK_POS || "bottom-left").split("-");
  var IDLE_MS = 4000;
  var CV = CANVAS.split(", ");
  function scoped(pre) { return CV.map(function (s) { return pre + " " + s; }).join(","); }

  var st = D.createElement("style");
  st.textContent =
    CANVAS + "{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}" +
    // at rest the canvas pans the page like any other element (beats the games' own touch-action:none)…
    // (the game box too: some games set touch-action:none on their whole wrapper, which freezes every swipe over the menu)
    scoped("html:not(.ssai-playing):not(.ssai-fs)") + ",html:not(.ssai-playing):not(.ssai-fs) .gamebox{touch-action:pan-x pan-y pinch-zoom!important}" +
    // …and only a live run takes the finger for the game
    scoped("html.ssai-playing") + "{touch-action:none!important;overscroll-behavior:none}" +
    "html.ssai-playing #s-play{overflow:hidden!important;overscroll-behavior:none}" +
    "html.ssai-locked,html.ssai-locked body{overscroll-behavior:none}" +
    ":where(html.ssai-locked) :where(body *){touch-action:manipulation}" +
    ".ssai-lockpill{position:fixed;" + (POS[0] === "top" ? "top:calc(10px + env(safe-area-inset-top))" : "bottom:calc(12px + env(safe-area-inset-bottom))") + ";" +
    (POS[1] === "right" ? "right:calc(10px + env(safe-area-inset-right))" : "left:calc(10px + env(safe-area-inset-left))") + ";" +
    "z-index:2147483000;display:none;align-items:center;gap:6px;padding:9px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.22);" +
    "background:rgba(14,17,30,.86);color:#fff;font:600 13px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;letter-spacing:.2px;" +
    "box-shadow:0 6px 20px rgba(0,0,0,.35);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation}" +
    ".ssai-lockpill.on{display:inline-flex}.ssai-lockpill.free{background:rgba(255,255,255,.92);color:#14171c;border-color:rgba(0,0,0,.12)}" +
    ".ssai-lockpill b{font-weight:800}";
  D.head.appendChild(st);

  var locked = false, playing = false, free = false, suspended = false, wasRun = false, pill = null, shown = "";
  var forced = null, fbPlay = false, lastTouch = 0, menuWas = H.classList.contains("gm-up"), fsWas = H.classList.contains("ssai-fs");

  function within(t, sel) { return t && t.closest ? t.closest(sel) : null; }
  function onPill(t) { return pill && t && (t === pill || pill.contains(t)); }
  function canScrollInside(t) {
    for (var el = t; el && el !== D.body && el !== H; el = el.parentElement) {
      if (el.hasAttribute && el.hasAttribute("data-scroll-ok")) return true;
      var s = getComputedStyle(el), o = s.overflowY, ox = s.overflowX;
      if ((o === "auto" || o === "scroll") && el.scrollHeight > el.clientHeight + 1) return true;
      if ((ox === "auto" || ox === "scroll") && el.scrollWidth > el.clientWidth + 1) return true;
    }
    return false;
  }

  /* ---------- is a run live? ---------- */
  var PROBES = ["__MG", "__S", "__NV", "__LD", "__OG", "__CL"];
  function probe() {
    if (typeof W.GAMELOCK_RUNNING === "function") { try { return !!W.GAMELOCK_RUNNING(); } catch (e) { return false; } }
    for (var i = 0; i < PROBES.length; i++) {
      var o = W[PROBES[i]], g;
      if (!o || typeof o.get !== "function") continue;
      try { g = o.get(); } catch (e) { continue; }
      if (!g || typeof g !== "object") continue;
      if (typeof g.running === "boolean") return g.running && !g.demo && !g.over;
      if (typeof g.state === "string") return !/^(idle|over|menu|ready|intro)$/.test(g.state);
    }
    return null;   // unknown game: fall back to PLAY / canvas tap / idle timeout
  }
  function running() {
    if (forced !== null) return forced;
    var p = probe();
    if (p !== null) return p;
    if (fbPlay && Date.now() - lastTouch > IDLE_MS) fbPlay = false;
    return fbPlay;
  }
  function isPaused() { return H.classList.contains("ssai-paused") || !!(W.GamePause && W.GamePause.paused); }

  function centerGame() {
    if (H.classList.contains("ssai-fs")) return;
    var c = D.querySelector(CANVAS), a = c && (c.closest(".gamebox") || c);
    if (!a || !a.getBoundingClientRect) return;
    var r = a.getBoundingClientRect(), vh = W.innerHeight;
    if (r.height <= vh && (r.top < -40 || r.bottom > vh + 40)) W.scrollTo(0, Math.max(0, W.scrollY + r.top - (vh - r.height) / 2));
  }
  function update() {
    var cls = H.classList, menu = cls.contains("gm-up"), fs = cls.contains("ssai-fs");
    if (menuWas && !menu && forced === null && probe() === null) { fbPlay = true; lastTouch = Date.now(); }   // PLAY on the start menu
    if (menu) fbPlay = false;
    if (fsWas && !fs) suspended = true;   // left full screen: free the page until they touch the game again
    menuWas = menu; fsWas = fs;
    var run = running();
    if (run && !wasRun) suspended = false;   // a new run starts clean
    wasRun = run;
    playing = run && !menu && !isPaused() && !D.hidden && !(W.Halftime && W.Halftime.active);
    var want = playing && !free && !suspended;
    if (cls.contains("ssai-playing") !== playing) cls.toggle("ssai-playing", playing);
    if (want !== locked) {
      locked = want;
      if (locked) centerGame();
      cls.toggle("ssai-locked", locked);
    }
    render();
  }
  function render() {
    var key = playing ? (locked ? "L" : "F") : "";
    if (key === shown) return;
    shown = key;
    if (!pill) {
      if (!key) return;
      pill = D.createElement("button");
      pill.type = "button";
      pill.className = "ssai-lockpill";
      pill.setAttribute("aria-live", "polite");
      pill.addEventListener("click", function (e) {
        e.preventDefault(); e.stopPropagation();
        if (locked) { free = true; } else { free = false; suspended = false; }
        update();
      });
      D.body.appendChild(pill);
    }
    pill.classList.toggle("on", !!key);
    if (!key) return;
    pill.classList.toggle("free", !locked);
    pill.innerHTML = locked ? "🔒 Screen locked · <b>Unlock</b>" : "🔓 <b>Lock screen</b>";
    pill.setAttribute("aria-label", locked ? "Screen locked. Tap to unlock and scroll the page." : "Tap to lock the screen while you play.");
  }

  /* ---------- touch ---------- */
  function onDown(e) {
    if (onPill(e.target)) return;
    var a = within(e.target, AREA);
    if (!a) return;
    lastTouch = Date.now();
    if (suspended && running()) suspended = false;   // back in the game after leaving full screen / switching apps
    update();
  }
  /* At rest a finger that lands on the canvas belongs to the PAGE. Games restart on pointerdown ("tap to play again"), so a
     swipe that starts there would start a run and lock the screen mid-scroll. Hold the touch back from the game; if it turns
     out to be a tap (no real movement), hand the game a pointerdown + pointerup at that spot (still inside the tap's user
     gesture, so sound can start). The games' own touchmove blockers are skipped at rest too (see touchmove below). */
  var held = null, SLOP = 10;
  function ptr(type, e) {
    try {
      return new PointerEvent(type, { bubbles: true, cancelable: true, composed: true, view: W, pointerId: e.pointerId, pointerType: e.pointerType,
        isPrimary: e.isPrimary, clientX: e.clientX, clientY: e.clientY, screenX: e.screenX, screenY: e.screenY, width: e.width, height: e.height,
        pressure: type === "pointerup" ? 0 : (e.pressure || 0.5), button: 0, buttons: type === "pointerup" ? 0 : 1 });
    } catch (x) { return null; }
  }
  D.addEventListener("pointerdown", function (e) {
    if (!e.isTrusted || e.pointerType === "mouse" || playing || onPill(e.target)) return;
    if (!within(e.target, CANVAS)) return;
    e.stopImmediatePropagation();
    held = { t: e.target, id: e.pointerId, x: e.clientX, y: e.clientY, at: Date.now(), moved: false, down: e };
  }, true);
  D.addEventListener("pointermove", function (e) {
    if (!held || !e.isTrusted || e.pointerId !== held.id) return;
    if (Math.abs(e.clientX - held.x) > SLOP || Math.abs(e.clientY - held.y) > SLOP) held.moved = true;
    e.stopImmediatePropagation();
  }, true);
  D.addEventListener("pointercancel", function (e) { if (held && e.pointerId === held.id) { held = null; e.stopImmediatePropagation(); } }, true);
  D.addEventListener("pointerup", function (e) {
    if (!held || !e.isTrusted || e.pointerId !== held.id) return;
    var h = held; held = null;
    e.stopImmediatePropagation();
    if (h.moved || Date.now() - h.at > 800 || playing) return;
    var d = ptr("pointerdown", h.down), u = ptr("pointerup", e);
    // a game without a known state counts as started by a tap on its canvas (when no start menu is up)
    if (forced === null && probe() === null && !H.classList.contains("gm-up") && !isPaused()) { fbPlay = true; lastTouch = Date.now(); }
    if (d) h.t.dispatchEvent(d);
    if (u) h.t.dispatchEvent(u);
    update();
  }, true);
  D.addEventListener("pointerdown", function (e) { if (e.pointerType === "touch" || e.pointerType === "pen") onDown(e); }, { capture: true, passive: true });
  D.addEventListener("touchstart", function (e) {
    onDown(e);
    if (playing && within(e.target, CANVAS) && e.cancelable) e.preventDefault();
  }, { passive: false, capture: true });
  /* At rest a swipe on a panel that scrolls inside the game box (the start menu) moves the PAGE once that panel is at its
     top/bottom, in the same swipe direction, instead of dead-ending there. Done by hand because browsers don't reliably
     chain a nested scroll to the page (and the start menu sits right where the thumb lands near the top of the page). */
  var ch = null;
  function vScroller(t) {
    for (var el = t; el && el.nodeType === 1 && el !== D.body && el !== H; el = el.parentElement) {
      if (!within(el, AREA)) return null;
      var s = getComputedStyle(el);
      if ((s.overflowY === "auto" || s.overflowY === "scroll") && el.scrollHeight > el.clientHeight + 1) return el;
    }
    return null;
  }
  // on window (capture): the start menu stops touchstart propagation before it reaches document listeners
  W.addEventListener("touchstart", function (e) {
    ch = null;
    if (locked || !e.touches || e.touches.length !== 1) return;
    var sc = vScroller(e.target);
    if (sc) ch = { sc: sc, x: e.touches[0].clientX, y: e.touches[0].clientY, decided: false, on: false };
  }, { capture: true, passive: true });
  function chain(e) {
    if (!ch || locked || !e.touches || e.touches.length !== 1) { ch = null; return false; }
    var t = e.touches[0], dy = t.clientY - ch.y, dx = t.clientX - ch.x;
    if (!ch.decided) {
      if (Math.abs(dy) < 3 && Math.abs(dx) < 3) return false;
      ch.decided = true;
      var sc = ch.sc, max = sc.scrollHeight - sc.clientHeight;
      ch.on = e.cancelable && Math.abs(dy) > Math.abs(dx) && (dy < 0 ? sc.scrollTop >= max - 1 : sc.scrollTop <= 0);
    }
    ch.x = t.clientX; ch.y = t.clientY;
    if (!ch.on) return false;
    if (e.cancelable) e.preventDefault();
    try { W.scrollBy({ top: -dy, left: 0, behavior: "instant" }); } catch (x) { W.scrollBy(0, -dy); }
    return true;
  }
  D.addEventListener("touchmove", function (e) {
    if (chain(e)) return;
    if (!playing && within(e.target, CANVAS)) { e.stopPropagation(); return; }   // at rest: the page scrolls, the game's own blocker never runs
    if (!e.cancelable || onPill(e.target)) return;
    if (playing && within(e.target, AREA)) lastTouch = Date.now();
    if (playing && within(e.target, CANVAS)) { e.preventDefault(); return; }
    if (locked && !canScrollInside(e.target)) e.preventDefault();
  }, { passive: false, capture: true });
  ["gesturestart", "gesturechange"].forEach(function (ev) {
    D.addEventListener(ev, function (e) { if (locked || (playing && within(e.target, CANVAS))) e.preventDefault(); }, { capture: true });
  });
  ["contextmenu", "selectstart", "dragstart"].forEach(function (ev) {
    D.addEventListener(ev, function (e) { if (within(e.target, CANVAS) || (locked && within(e.target, AREA))) e.preventDefault(); }, { capture: true });
  });

  /* ---------- follow the game: start, game over, pause, menu, full screen, app switch ---------- */
  if (W.MutationObserver) new MutationObserver(update).observe(H, { attributes: true, attributeFilter: ["class"] });
  D.addEventListener("visibilitychange", function () { if (D.hidden) suspended = true; update(); });
  W.addEventListener("pagehide", function () { suspended = true; update(); });
  every(update, 150);
  if (D.readyState === "loading") D.addEventListener("DOMContentLoaded", update); else update();

  W.GameLock = {
    lock: function () { free = false; suspended = false; update(); },
    unlock: function () { free = true; update(); },
    playing: function (v) { forced = v == null ? null : !!v; update(); },
    get locked() { return locked; },
    get active() { return playing; }
  };
})();
