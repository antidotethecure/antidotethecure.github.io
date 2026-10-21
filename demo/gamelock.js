/* SousShift AI — game screen lock, MANUAL ONLY. Include once on any page with a game: <script src="../gamelock.js?v=…"></script>
   Owner rule (Antidote, 2026-10-13): "do not lock the screen automatically when the page loads. Only keep the button on the
   right, that square, to make you lock the screen", with a heads-up before the game starts.
     · The page NEVER locks by itself: not on load, not on the first touch, not when a run starts. Until the guest taps the
       lock button, a swipe anywhere (including one that starts on the game canvas) scrolls the page. Canvases and their
       wrappers get touch-action:pan-y pinch-zoom (beats the games' own touch-action:none), and a game's own
       touchstart/touchmove preventDefault on the canvas is ignored, so vertical swipes scroll and taps/sideways drags still
       reach the game.
     · The ONLY way to lock: the square 🔒 Lock button on the right edge (stacked above Full screen / music / Pause). It shows
       whenever the game is on screen (and always while locked). Tap again (🔓 Unlock) to free the page.
     · While locked: the canvas takes every finger (touch-action:none), and nothing on the page scrolls, bounces, zooms or
       pull-to-refreshes. Scrollable panels/modals (or [data-scroll-ok]) still scroll inside themselves.
     · The lock lets go by itself (never the other way round) on game over / the start menu coming back, switching
       apps/tabs or leaving the page, and leaving full screen.
     · When a run starts (PLAY on the start menu, or the first tap on a game without one) a short hint points at the button:
       "Tip: tap ⛶ Full screen and 🔒 Lock …" (Antidote, 2026-10-19: tell them to tap both). It hides after ~5 s or on tap, at most once per
       session, and never blocks the game.
   Full screen (fullscreen.js) keeps its own no-scroll behavior; it does not set the lock.
   "Run is live" (used for game over + the hint) comes from, in order: window.GameLock.playing(true|false|null),
   window.GAMELOCK_RUNNING(), the game's own state (__MG/__S/__NV/__LD/__OG .get().running, __CL .get().state), else
   PLAY on the start menu / a tap on the canvas until the start menu comes back.
   html gets .ssai-playing while a run is live and .ssai-locked while locked. Also loads gamepause.js with the same ?v=. */
(function () {
  "use strict";
  if (window.__ssaiGameLock) return;
  window.__ssaiGameLock = 1;
  var W = window, D = document, H = D.documentElement;
  var every = W.setInterval.bind(W), later = W.setTimeout.bind(W), unlater = W.clearTimeout.bind(W);   // before gamepause.js wraps timers
  var frame = W.requestAnimationFrame ? W.requestAnimationFrame.bind(W) : function (f) { return later(f, 16); };
  var me = D.currentScript;
  if (me && me.src && !W.__ssaiGamePause) {
    var gp = D.createElement("script");
    gp.src = me.src.replace(/gamelock\.js(\?[^#]*)?(#.*)?$/, function (m, qs) { return "gamepause.js" + (qs || ""); });
    D.head.appendChild(gp);
  }
  var CANVAS = "canvas#game, canvas#cv, canvas[data-game]";
  var AREA = CANVAS + ", [data-game]:not(#champs):not([data-champs]), .gamebox";
  var CV = CANVAS.split(", ");
  function scoped(pre) { return CV.map(function (s) { return pre + " " + s; }).join(","); }
  var FREE = "html:not(.ssai-locked):not(.ssai-fs)";

  var st = D.createElement("style");
  st.textContent =
    CANVAS + "{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}" +
    // unlocked: vertical swipes on the game scroll the page (touch-action is the intersection of the element and its
    // ancestors, so wrappers that set touch-action:none get tagged .ssai-tz and freed too)
    scoped(FREE) + "," + FREE + " .gamebox," + FREE + " .ssai-tz{touch-action:pan-y pinch-zoom!important}" +
    // locked: the game takes the finger, the page stays put
    scoped("html.ssai-locked") + "{touch-action:none!important;overscroll-behavior:none}" +
    // full screen (fullscreen.js) keeps the game area swipe-proof on its own, lock or not
    scoped("html.ssai-fs") + "{touch-action:none!important}" +
    "html.ssai-locked #s-play{overflow:hidden!important;overscroll-behavior:none}" +
    "html.ssai-locked,html.ssai-locked body{overscroll-behavior:none}" +
    ":where(html.ssai-locked) :where(body *){touch-action:manipulation}" +
    // the square lock button: right edge, above fullscreen.js ⛶ (bottom 112px), gamemenu 🎵 (60px) and ⏸ Pause (12px)
    ".ssai-lockbtn{position:fixed;right:calc(8px + env(safe-area-inset-right,0px));bottom:calc(164px + env(safe-area-inset-bottom,0px));z-index:2147483001;" +
    "width:52px;height:52px;padding:0;border-radius:12px;display:none;flex-direction:column;align-items:center;justify-content:center;gap:2px;" +
    "border:1px solid rgba(255,255,255,.28);background:rgba(14,17,30,.88);color:#fff;font:800 10.5px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;letter-spacing:.2px;" +
    "box-shadow:0 6px 20px rgba(0,0,0,.35);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation}" +
    ".ssai-lockbtn i{font-style:normal;font-size:20px;line-height:1}.ssai-lockbtn.on{display:flex}" +
    ".ssai-lockbtn.lk{background:#ffd23f;color:#14171c;border-color:rgba(0,0,0,.2)}" +
    ".ssai-lockhint{position:fixed;right:calc(70px + env(safe-area-inset-right,0px));bottom:calc(166px + env(safe-area-inset-bottom,0px));z-index:2147483001;" +
    "max-width:min(240px,calc(100vw - 96px));padding:9px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.22);background:rgba(14,17,30,.94);color:#fff;" +
    "font:700 13px/1.3 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;text-align:left;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.35);" +
    "opacity:0;transform:translateX(8px);transition:opacity .25s,transform .25s;pointer-events:none}" +
    ".ssai-lockhint:after{content:'';position:absolute;right:-6px;bottom:18px;width:10px;height:10px;background:inherit;border:inherit;border-left:0;border-bottom:0;transform:rotate(45deg)}" +
    ".ssai-lockhint.on{opacity:1;transform:none;pointer-events:auto}";
  D.head.appendChild(st);

  var locked = false, playing = false, wasRun = false, btn = null, hint = null, hintT = 0, vis = false;
  var forced = null, fbPlay = false, menuWas = H.classList.contains("gm-up"), fsWas = H.classList.contains("ssai-fs");

  function within(t, sel) { return t && t.closest ? t.closest(sel) : null; }
  function onUi(t) { return t && ((btn && (t === btn || btn.contains(t))) || (hint && (t === hint || hint.contains(t)))); }
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
    return null;
  }
  function running() {
    if (forced !== null) return forced;
    var p = probe();
    return p !== null ? p : fbPlay;
  }

  /* ---------- free the game's wrappers (touch-action:none on an ancestor would still freeze swipes) ---------- */
  function tagWrappers() {
    var cs = D.querySelectorAll(CANVAS);
    for (var i = 0; i < cs.length; i++) {
      if (cs[i].__ssaiTz) continue;
      cs[i].__ssaiTz = 1;
      for (var el = cs[i].parentElement; el && el !== D.body && el !== H; el = el.parentElement) {
        if (getComputedStyle(el).touchAction === "none") el.classList.add("ssai-tz");
      }
    }
  }

  /* ---------- lock / unlock (only the button locks) ---------- */
  function centerGame() {
    if (H.classList.contains("ssai-fs")) return;
    var c = D.querySelector(CANVAS), a = c && (c.closest(".gamebox") || c);
    if (!a || !a.getBoundingClientRect) return;
    var r = a.getBoundingClientRect(), vh = W.innerHeight;
    if (r.height <= vh && (r.top < -40 || r.bottom > vh + 40)) W.scrollTo(0, Math.max(0, W.scrollY + r.top - (vh - r.height) / 2));
  }
  function setLocked(on) {
    on = !!on;
    if (on === locked) return;
    locked = on;
    if (locked) { hideHint(); centerGame(); }
    H.classList.toggle("ssai-locked", locked);
    render();
  }

  function update() {
    var cls = H.classList, menu = cls.contains("gm-up"), fs = cls.contains("ssai-fs");
    var started = false;
    if (menuWas && !menu) { started = true; if (forced === null && probe() === null) fbPlay = true; }   // PLAY on the start menu
    if (menu) { fbPlay = false; if (!menuWas) setLocked(false); }   // start menu back up = run over
    if (fsWas && !fs) setLocked(false);                              // left full screen
    menuWas = menu; fsWas = fs;
    var run = running();
    if (run && !wasRun) started = true;
    if (!run && wasRun) setLocked(false);                            // game over
    wasRun = run;
    playing = run && !menu;
    if (cls.contains("ssai-playing") !== playing) cls.toggle("ssai-playing", playing);
    if (started) showHint();
    tagWrappers();
    render();
  }

  function render() {
    if (!D.body) return;
    if (!btn) {
      btn = D.createElement("button");
      btn.type = "button";
      btn.className = "ssai-lockbtn";
      btn.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); setLocked(!locked); });
      ["pointerdown", "pointerup", "touchstart", "touchend", "mousedown", "mouseup"].forEach(function (ev) {
        btn.addEventListener(ev, function (e) { e.stopPropagation(); }, { passive: true });
      });
      D.body.appendChild(btn);
    }
    var show = locked || vis || H.classList.contains("ssai-fs");
    btn.classList.toggle("on", show);
    btn.classList.toggle("lk", locked);
    var key = locked ? "L" : "U";
    if (btn.__k !== key) {
      btn.__k = key;
      btn.innerHTML = locked ? "<i>🔓</i>Unlock" : "<i>🔒</i>Lock";
      btn.setAttribute("aria-pressed", locked ? "true" : "false");
      btn.setAttribute("aria-label", locked ? "Screen locked. Tap to unlock and scroll the page." : "Lock the screen so it doesn't scroll while you play.");
      btn.title = locked ? "Unlock the screen" : "Lock the screen";
    }
  }

  /* ---------- the one-time heads-up ---------- */
  var HINT_KEY = "ssai:lockhint";
  function hintSeen() { try { return W.sessionStorage.getItem(HINT_KEY) === "1"; } catch (e) { return !!W.__ssaiLockHint; } }
  function markHint() { W.__ssaiLockHint = 1; try { W.sessionStorage.setItem(HINT_KEY, "1"); } catch (e) {} }
  function showHint() {
    if (locked || hintSeen() || !D.body) return;
    markHint();
    vis = true; render();
    if (!hint) {
      hint = D.createElement("button");
      hint.type = "button";
      hint.className = "ssai-lockhint";
      hint.setAttribute("role", "status");
      hint.textContent = (W.__T || String)("Tip: tap ⛶ Full screen and 🔒 Lock so the screen doesn't scroll and nothing blocks your game.");
      hint.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); hideHint(); });
      ["pointerdown", "pointerup", "touchstart", "touchend", "mousedown", "mouseup"].forEach(function (ev) {
        hint.addEventListener(ev, function (e) { e.stopPropagation(); }, { passive: true });
      });
      D.body.appendChild(hint);
    }
    void hint.offsetWidth;
    hint.classList.add("on");
    unlater(hintT); hintT = later(hideHint, 5000);
  }
  function hideHint() { if (hint) hint.classList.remove("on"); unlater(hintT); }

  /* ---------- is the game on screen? (the button shows while it is) ---------- */
  var io = null, watched = null;
  function watch() {
    var c = D.querySelector(CANVAS), a = c ? (c.closest(".gamebox") || c) : D.querySelector(".gamebox:not(.keybox)");
    if (!a || a === watched || !W.IntersectionObserver) return;
    if (io) io.disconnect();
    watched = a;
    io = new IntersectionObserver(function (es) { vis = es[es.length - 1].isIntersecting; render(); }, { threshold: 0 });
    io.observe(a);
  }

  /* ---------- touch ---------- */
  function fsOn() { return H.classList.contains("ssai-fs"); }
  // Unlocked, a game's own preventDefault on a canvas touch would freeze the page scroll: ignore it.
  function neuter(e) {
    if (locked || fsOn() || !within(e.target, CANVAS)) return;
    try { Object.defineProperty(e, "preventDefault", { value: function () {}, configurable: true }); } catch (x) {}
  }
  W.addEventListener("touchstart", neuter, { capture: true, passive: true });
  W.addEventListener("touchmove", neuter, { capture: true, passive: true });

  /* At rest a finger that lands on the canvas belongs to the PAGE. Games restart on pointerdown ("tap to play again"), so a
     swipe that starts there would start a run mid-scroll. Hold the touch back from the game; if it turns out to be a tap
     (no real movement), hand the game a pointerdown + pointerup at that spot (still inside the tap's user gesture, so sound
     can start). */
  var held = null, SLOP = 10;
  function ptr(type, e) {
    try {
      return new PointerEvent(type, { bubbles: true, cancelable: true, composed: true, view: W, pointerId: e.pointerId, pointerType: e.pointerType,
        isPrimary: e.isPrimary, clientX: e.clientX, clientY: e.clientY, screenX: e.screenX, screenY: e.screenY, width: e.width, height: e.height,
        pressure: type === "pointerup" ? 0 : (e.pressure || 0.5), button: 0, buttons: type === "pointerup" ? 0 : 1 });
    } catch (x) { return null; }
  }
  D.addEventListener("pointerdown", function (e) {
    if (!e.isTrusted || e.pointerType === "mouse" || playing || locked || onUi(e.target)) return;
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
    if (forced === null && probe() === null && !H.classList.contains("gm-up")) fbPlay = true;
    if (d) h.t.dispatchEvent(d);
    if (u) h.t.dispatchEvent(u);
    update();
  }, true);

  D.addEventListener("touchstart", function (e) {
    if (locked && within(e.target, CANVAS) && e.cancelable) e.preventDefault();
  }, { passive: false, capture: true });
  /* Unlocked, a vertical swipe on a panel that scrolls inside the game box (the start menu, which has
     overscroll-behavior:contain) scrolls that panel and then carries on into the PAGE in the same swipe, instead of
     dead-ending at the panel's top/bottom. Done by hand because browsers don't chain a contained nested scroll. */
  var ch = null;
  function vScroller(t) {
    for (var el = t; el && el.nodeType === 1 && el !== D.body && el !== H; el = el.parentElement) {
      if (!within(el, AREA)) return null;
      var s = getComputedStyle(el);
      if ((s.overflowY === "auto" || s.overflowY === "scroll") && el.scrollHeight > el.clientHeight + 1) return el;
    }
    return null;
  }
  var fling = 0;
  W.addEventListener("touchstart", function (e) {
    ch = null; fling++;
    if (locked || fsOn() || !e.touches || e.touches.length !== 1) return;
    var sc = vScroller(e.target);
    if (sc) ch = { sc: sc, x: e.touches[0].clientX, y: e.touches[0].clientY, decided: false, on: false, v: 0, t: Date.now() };
  }, { capture: true, passive: true });
  function pageBy(d) { try { W.scrollBy({ top: d, left: 0, behavior: "instant" }); } catch (x) { W.scrollBy(0, d); } }
  function scrollChain(sc, want) {   // panel first, the rest to the page; returns how far it really moved
    var max = sc.scrollHeight - sc.clientHeight, to = Math.max(0, Math.min(max, sc.scrollTop + want)), used = to - sc.scrollTop, y0 = W.scrollY;
    if (used) sc.scrollTop = to;
    if (Math.abs(want - used) >= 0.5) pageBy(want - used);
    return used + (W.scrollY - y0);
  }
  function chain(e) {
    if (!ch || locked || !e.touches || e.touches.length !== 1) { ch = null; return false; }
    var t = e.touches[0], dy = t.clientY - ch.y, dx = t.clientX - ch.x, now = Date.now();
    if (!ch.decided) {
      if (Math.abs(dy) < 3 && Math.abs(dx) < 3) return false;
      ch.decided = true;
      ch.on = e.cancelable && Math.abs(dy) > Math.abs(dx);
    }
    ch.x = t.clientX; ch.y = t.clientY;
    if (!ch.on) return false;
    if (e.cancelable) Event.prototype.preventDefault.call(e);
    var dt = Math.max(1, now - ch.t); ch.v = 0.6 * ch.v + 0.4 * (-dy / dt); ch.t = now;
    scrollChain(ch.sc, -dy);
    return true;
  }
  // let go mid-swipe: keep gliding (panel, then page) like a native fling
  W.addEventListener("touchend", function () {
    if (!ch || !ch.on) { ch = null; return; }
    var sc = ch.sc, v = Date.now() - ch.t > 80 ? 0 : ch.v, id = ++fling, last = Date.now();
    ch = null;
    if (Math.abs(v) < 0.15) return;
    (function step() {
      if (id !== fling || locked) return;
      var now = Date.now(), dt = Math.min(40, now - last); last = now;
      v *= Math.pow(0.996, dt);
      if (Math.abs(v) < 0.05) return;
      if (Math.abs(scrollChain(sc, v * dt)) < 0.5 && Math.abs(v * dt) >= 1) return;   // hit the end of everything
      frame(step);
    })();
  }, { capture: true, passive: true });
  D.addEventListener("touchmove", function (e) {
    if (chain(e)) return;
    if (!locked || !e.cancelable || onUi(e.target)) return;
    if (within(e.target, CANVAS)) { e.preventDefault(); return; }
    if (!canScrollInside(e.target)) e.preventDefault();
  }, { passive: false, capture: true });
  ["gesturestart", "gesturechange"].forEach(function (ev) {
    D.addEventListener(ev, function (e) { if (locked) e.preventDefault(); }, { capture: true });
  });
  ["contextmenu", "selectstart", "dragstart"].forEach(function (ev) {
    D.addEventListener(ev, function (e) { if (within(e.target, CANVAS) || (locked && within(e.target, AREA))) e.preventDefault(); }, { capture: true });
  });

  /* ---------- follow the game: start, game over, menu, full screen, app switch ---------- */
  if (W.MutationObserver) new MutationObserver(update).observe(H, { attributes: true, attributeFilter: ["class"] });
  D.addEventListener("visibilitychange", function () { if (D.hidden) setLocked(false); update(); });
  W.addEventListener("pagehide", function () { setLocked(false); });
  every(function () { watch(); update(); }, 200);
  function init() { watch(); update(); }
  if (D.readyState === "loading") D.addEventListener("DOMContentLoaded", init); else init();

  W.GameLock = {
    lock: function () { setLocked(true); },
    unlock: function () { setLocked(false); },
    toggle: function () { setLocked(!locked); return locked; },
    playing: function (v) { forced = v == null ? null : !!v; update(); },
    get locked() { return locked; },
    get active() { return playing; }
  };
})();
