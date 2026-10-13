/* SousShift AI — SEASONAL THEMES loader. Customer apps include it ONCE, as the last script on the page:
     <script src="../seasons/seasons.js?v=20261013a" defer></script>
   It reads calendar.json (next to this file), picks the theme whose date range contains today in Los Angeles time,
   and loads only that theme's script (and three.js only if the theme asks for it). Themes switch on and off by date
   with no page edits. See README.md for how to add a theme, the quality bar and the testing checklist.

   Force / test:  ?season=<id>  forces a theme (even if "ready" is false)  ·  ?season=off  turns themes off
                  ?halloween=1 / ?halloween=0  (legacy alias for ?season=halloween / ?season=off)
                  ?seasonfx=2d  forces the light CSS fallback  ·  ?seasonfx=3d  skips the low-end check
   Per client:    window.SSAI_SEASONS_OFF = true  (set before this script) opts the page out.
   Never runs on back offices, staff apps, owner, setup or kit pages, whatever the page includes.

   What the loader gives every theme (window.SSAISeason.define({...}) — see README.md):
     · one full-screen fixed canvas, pointer-events:none, under the app's sheets/modals (z-index 35)
     · a ~30 fps frame loop, pixel ratio <= 1.5, stopped while the tab is hidden
     · pause/hide while a game is on screen or a game overlay/sheet/full screen is open
     · an event bus: "idle" after 5 s without touch/scroll/keys/motion, "wake" on any of them, the last finger position,
       and optional "Shake to scare" (DeviceMotion, iOS permission asked only from that control)
     · reduced-motion + low-end + no-WebGL detection (theme gets ctx.reduced / a 2D fallback instead)
     · the small toggle button (sound on/off, shake, turn the theme off), saved per theme id in localStorage
     · an unlocked, quiet WebAudio context after the first user gesture (null until then or when muted) */
(function () {
  "use strict";
  if (window.SSAISeason || window.SSAI_SEASONS_OFF) return;
  var W = window, D = document;
  var me = D.currentScript;
  var BASE = me && me.src ? me.src.replace(/[^\/]*$/, "") : "../seasons/";
  var VER = (me && me.src && (me.src.match(/[?&]v=([^&]+)/) || [])[1]) || "1";
  var THREE_URL = W.SSAI_THREE_URL || "https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.min.js";

  // never on back offices / staff / owner / setup pages
  if (/\/(shop|setup|owner|staff|back-?office|admin|kit|hq)(\/|$)/i.test(location.pathname)) return;

  var Q = new URLSearchParams(location.search);
  var force = (Q.get("season") || "").toLowerCase();
  if (!force && Q.has("halloween")) force = Q.get("halloween") === "0" ? "off" : "halloween";
  if (force === "off" || force === "0") return;
  var FX = (Q.get("seasonfx") || "").toLowerCase();

  function store(k, v) {
    try { if (arguments.length > 1) { localStorage.setItem(k, JSON.stringify(v)); return v; } return JSON.parse(localStorage.getItem(k) || "null"); }
    catch (e) { return null; }
  }

  /* ---------- calendar (America/Los_Angeles) ---------- */
  function laMMDD() {
    try {
      var p = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
      var m = "", d = "";
      p.forEach(function (x) { if (x.type === "month") m = x.value; if (x.type === "day") d = x.value; });
      return m + "-" + d;
    } catch (e) { var n = new Date(); return ("0" + (n.getMonth() + 1)).slice(-2) + "-" + ("0" + n.getDate()).slice(-2); }
  }
  function inRange(today, a, b) { return a <= b ? (today >= a && today <= b) : (today >= a || today <= b); } // b < a wraps the new year
  function pick(list) {
    if (force) { for (var i = 0; i < list.length; i++) if (list[i].id === force) return list[i]; return null; }
    var t = laMMDD();
    for (var j = 0; j < list.length; j++) {
      var e = list[j];
      if (e.ready === false || !e.script || !e.start || !e.end) continue;
      if (inRange(t, e.start, e.end)) return e;
    }
    return null;
  }

  /* ---------- environment ---------- */
  var reduced = false;
  try { reduced = W.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
  var nav = navigator, conn = nav.connection || {};
  var lowEnd = FX === "2d" || (FX !== "3d" && ((nav.hardwareConcurrency && nav.hardwareConcurrency <= 2) ||
    (nav.deviceMemory && nav.deviceMemory <= 2) || conn.saveData === true));
  function hasWebGL() {
    try { var c = D.createElement("canvas"); return !!(W.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl"))); }
    catch (e) { return false; }
  }

  /* ---------- game / overlay detection ---------- */
  var GAME_AREAS = "canvas#game, canvas#cv, canvas[data-game], [data-game]:not(#champs), .gamebox:not(.keybox), #nalu-game .nv-wrap" +
    (W.SSAI_SEASONS_AVOID ? ", " + W.SSAI_SEASONS_AVOID : "");
  var OVERLAYS = "#mg-ov.on, .gm-sheet.on, .ssai-fsbox, #sheet, #ov, .ssai-pause.on" + (W.SSAI_SEASONS_BLOCK ? ", " + W.SSAI_SEASONS_BLOCK : "");
  function shown(el) {
    var cs = W.getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity === 0) return false;
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }
  function blocked() {
    if (D.fullscreenElement || D.webkitFullscreenElement) return "fullscreen";
    var h = D.documentElement;
    if (h.classList.contains("ssai-fs") || h.classList.contains("ssai-locked")) return "game-lock";
    var o = D.querySelectorAll(OVERLAYS);
    for (var i = 0; i < o.length; i++) if (shown(o[i]) && o[i].getBoundingClientRect().height > innerHeight * 0.5) return "overlay";
    var g = D.querySelectorAll(GAME_AREAS), vh = innerHeight;
    for (var j = 0; j < g.length; j++) {
      var r = g[j].getBoundingClientRect();
      var vis = Math.min(r.bottom, vh) - Math.max(r.top, 0);
      if (r.width > 40 && vis > Math.min(vh * 0.3, r.height * 0.6)) return "game";
    }
    return "";
  }

  /* ---------- event bus: idle / wake / pointer / shake ---------- */
  var listeners = {};
  function on(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); }
  function emit(ev, a) { (listeners[ev] || []).forEach(function (fn) { try { fn(a); } catch (e) { console.warn("[seasons]", e); } }); }
  var IDLE_MS = W.SSAI_SEASONS_IDLE_MS || 5000;
  var lastAct = Date.now(), idle = false, pointer = { x: 0.5, y: 0.62, at: 0 };
  function activity(type) {
    lastAct = Date.now();
    if (idle) { idle = false; emit("wake", type); } else emit("activity", type);
  }
  function setPointer(x, y) { pointer.x = x / Math.max(1, innerWidth); pointer.y = y / Math.max(1, innerHeight); pointer.at = Date.now(); }
  var opt = { passive: true, capture: true };
  W.addEventListener("touchstart", function (e) { var t = e.touches[0]; if (t) setPointer(t.clientX, t.clientY); activity("touch"); }, opt);
  W.addEventListener("touchmove", function (e) { var t = e.touches[0]; if (t) setPointer(t.clientX, t.clientY); activity("swipe"); }, opt);
  W.addEventListener("pointerdown", function (e) { setPointer(e.clientX, e.clientY); activity("touch"); }, opt);
  var lastMove = null;
  W.addEventListener("pointermove", function (e) {
    if (e.pointerType === "touch") return;
    setPointer(e.clientX, e.clientY);
    if (lastMove && Math.abs(e.clientX - lastMove[0]) + Math.abs(e.clientY - lastMove[1]) > 6) activity("move");
    lastMove = [e.clientX, e.clientY];
  }, opt);
  W.addEventListener("wheel", function () { activity("scroll"); }, opt);
  W.addEventListener("scroll", function () { activity("scroll"); }, opt);
  W.addEventListener("keydown", function () { activity("key"); }, opt);
  setInterval(function () { if (!idle && !D.hidden && Date.now() - lastAct >= IDLE_MS) { idle = true; emit("idle"); } }, 250);

  var shakeOn = false, lastShake = 0;
  function onMotion(e) {
    var a = e.accelerationIncludingGravity || e.acceleration; if (!a) return;
    var g = Math.sqrt((a.x || 0) * (a.x || 0) + (a.y || 0) * (a.y || 0) + (a.z || 0) * (a.z || 0));
    var j = e.acceleration ? Math.sqrt((e.acceleration.x || 0) * (e.acceleration.x || 0) + (e.acceleration.y || 0) * (e.acceleration.y || 0) + (e.acceleration.z || 0) * (e.acceleration.z || 0)) : Math.abs(g - 9.8);
    if (j > 11 && Date.now() - lastShake > 600) { lastShake = Date.now(); activity("shake"); emit("shake"); }
  }
  function enableShake() { // must be called from a tap (iOS permission prompt)
    var DM = W.DeviceMotionEvent;
    if (!DM) return Promise.resolve(false);
    var p = typeof DM.requestPermission === "function" ? DM.requestPermission() : Promise.resolve("granted");
    return p.then(function (s) {
      if (s !== "granted") return false;
      if (!shakeOn) { W.addEventListener("devicemotion", onMotion, { passive: true }); shakeOn = true; }
      return true;
    }).catch(function () { return false; });
  }

  /* ---------- audio: only after a real gesture, quiet, mutable ---------- */
  var actx = null, gestured = false, prefs = {}, themeId = "";
  function unlock() {
    gestured = true;
    if (prefs.mute || prefs.off) return;
    try {
      if (!actx) { var AC = W.AudioContext || W.webkitAudioContext; if (AC) actx = new AC(); }
      if (actx && actx.state === "suspended") actx.resume();
    } catch (e) { actx = null; }
  }
  ["pointerup", "touchend", "keydown", "click"].forEach(function (ev) { W.addEventListener(ev, unlock, { passive: true, capture: true }); });
  function audio() { return gestured && actx && !prefs.mute && !prefs.off && !D.hidden && actx.state === "running" ? actx : null; }

  /* ---------- UI: canvas + toggle ---------- */
  var css = D.createElement("style");
  css.textContent =
    ".ssai-season-cv{position:fixed;left:0;top:0;width:100vw;height:100vh;height:100lvh;z-index:35;pointer-events:none!important;opacity:0;transition:opacity .45s ease;contain:strict}" +
    ".ssai-season-cv.on{opacity:1}" +
    ".ssai-season-btn{position:fixed;left:calc(10px + env(safe-area-inset-left));bottom:calc(86px + env(safe-area-inset-bottom));z-index:36;width:38px;height:38px;border-radius:50%;" +
    "border:1px solid rgba(255,255,255,.28);background:rgba(12,10,22,.62);color:#fff;font:18px/1 system-ui,sans-serif;display:flex;align-items:center;justify-content:center;padding:0;" +
    "cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation;box-shadow:0 4px 14px rgba(0,0,0,.3);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);transition:opacity .3s}" +
    ".ssai-season-btn.dim{opacity:.45}.ssai-season-btn.hide{opacity:0;pointer-events:none}" +
    ".ssai-season-menu{position:fixed;left:calc(10px + env(safe-area-inset-left));bottom:calc(132px + env(safe-area-inset-bottom));z-index:37;min-width:196px;max-width:calc(100vw - 20px);" +
    "padding:6px;border-radius:14px;background:rgba(14,12,26,.94);border:1px solid rgba(255,255,255,.18);box-shadow:0 10px 30px rgba(0,0,0,.45);color:#fff;" +
    "font:600 14px/1.2 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:none}" +
    ".ssai-season-menu.on{display:block}" +
    ".ssai-season-menu button{display:flex;width:100%;align-items:center;gap:10px;padding:11px 12px;border:0;border-radius:10px;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}" +
    ".ssai-season-menu button:active,.ssai-season-menu button:hover{background:rgba(255,255,255,.1)}" +
    ".ssai-season-menu small{display:block;padding:4px 12px 6px;color:rgba(255,255,255,.6);font-weight:500}";

  function buildToggle(theme, api) {
    var b = D.createElement("button"), m = D.createElement("div");
    b.type = "button"; b.className = "ssai-season-btn"; b.textContent = theme.icon || "✨";
    b.setAttribute("aria-label", (theme.label || theme.id) + " theme settings"); b.setAttribute("aria-expanded", "false");
    m.className = "ssai-season-menu"; m.setAttribute("role", "menu");
    function render() {
      b.classList.toggle("dim", !!prefs.off);
      m.innerHTML = "<small>" + (theme.label || theme.id) + " theme</small>" +
        (prefs.off ? '<button type="button" data-a="on">' + (theme.icon || "✨") + " Turn theme on</button>" :
          '<button type="button" data-a="mute">' + (prefs.mute ? "🔇 Sound is off" : "🔊 Sound is on") + "</button>" +
          (theme.shake && !reduced && W.DeviceMotionEvent ? '<button type="button" data-a="shake">📳 ' + (shakeOn ? "Shake to scare: on" : "Shake to scare") + "</button>" : "") +
          '<button type="button" data-a="off">🚫 Turn theme off</button>');
    }
    function close() { m.classList.remove("on"); b.setAttribute("aria-expanded", "false"); }
    b.addEventListener("click", function (e) { e.stopPropagation(); render(); var o = !m.classList.contains("on"); m.classList.toggle("on", o); b.setAttribute("aria-expanded", String(o)); });
    m.addEventListener("click", function (e) {
      e.stopPropagation();
      var a = e.target.closest && e.target.closest("button"); if (!a) return;
      var k = a.getAttribute("data-a");
      if (k === "mute") { prefs.mute = !prefs.mute; if (!prefs.mute) unlock(); else if (actx) try { actx.suspend(); } catch (x) {} }
      if (k === "off") { prefs.off = true; api.stop(); close(); }
      if (k === "on") { prefs.off = false; api.start(); close(); }
      if (k === "shake") { enableShake().then(function (ok) { if (!ok) a.textContent = "📳 Motion not allowed"; else render(); }); return; }
      store("ssai-season-" + themeId, prefs); render();
    });
    D.addEventListener("click", close, true);
    D.body.appendChild(m); D.body.appendChild(b);
    render();
    return { setHidden: function (h) { b.classList.toggle("hide", h); if (h) close(); } };
  }

  /* ---------- runtime ---------- */
  var defined = null;
  function define(theme) { if (!defined) { defined = theme; boot(theme); } }

  function loadThree() {
    var hasMap = D.querySelector('script[type="importmap"]');
    var url = hasMap && /"three"\s*:/.test(hasMap.textContent) ? "three" : THREE_URL; // share the page's copy when it has one
    if (url !== "three") try { // or the exact three.js URL a game on this page already imported (one instance, no duplicate download)
      var r = performance.getEntriesByType("resource").filter(function (e) { return /\/three@0\.1\d\d\.\d+\/(\+esm|build\/three\.module(\.min)?\.js)$/.test(e.name); })[0];
      if (r) url = r.name;
    } catch (e) {}
    return import(url).catch(function () { return import(THREE_URL); });
  }

  function boot(theme) {
    themeId = theme.id;
    prefs = store("ssai-season-" + theme.id) || {};
    var canvas = null, inst = null, running = false, raf = 0, last = 0, acc = 0, fpsLog = [], mode = "", block = "";
    var STEP = 1000 / (theme.fps || 30);
    var ctx = {
      id: theme.id, base: BASE, reduced: reduced, lowEnd: lowEnd, on: on, emit: emit, pointer: pointer,
      isIdle: function () { return idle; }, audio: audio, store: store, prefs: function () { return prefs; },
      size: function () { return { w: innerWidth, h: innerHeight, dpr: Math.min(W.devicePixelRatio || 1, 1.5) }; }
    };
    var toggle = null;

    function makeCanvas() {
      canvas = D.createElement("canvas");
      canvas.className = "ssai-season-cv"; canvas.setAttribute("aria-hidden", "true"); canvas.setAttribute("data-season", theme.id);
      D.body.appendChild(canvas);
      ctx.canvas = canvas;
    }
    function startFallback(why) {
      mode = "2d"; ctx.mode = "2d"; ctx.why = why;
      if (canvas) { canvas.remove(); canvas = null; }
      if (theme.fallback) { try { inst = theme.fallback(ctx) || null; } catch (e) { console.warn("[seasons] fallback", e); inst = null; } }
      W.SSAISeason.status = { id: theme.id, mode: "2d", reason: why };
      tick();
    }
    function start3d(THREE) {
      mode = "3d"; ctx.mode = "3d"; ctx.THREE = THREE;
      makeCanvas();
      try { inst = theme.setup(ctx); } catch (e) { console.warn("[seasons] 3d setup failed, using 2D", e); return startFallback("setup-error"); }
      W.SSAISeason.status = { id: theme.id, mode: "3d", reason: "" };
      W.addEventListener("resize", resize, { passive: true });
      resize();
      tick();
    }
    function resize() { if (inst && inst.resize) { var s = ctx.size(); inst.resize(s.w, s.h, s.dpr); if (!running && inst.frame) inst.frame(0, performance.now() / 1000, true); } }

    // visibility of the whole layer: hidden during games/overlays/fullscreen and when the theme is off
    function show(v) {
      if (canvas) canvas.classList.toggle("on", v);
      if (inst && inst.setVisible) inst.setVisible(v);
      if (toggle) toggle.setHidden(block === "game" || block === "fullscreen" || block === "game-lock" || block === "overlay");
    }
    function tick() {
      var b = prefs.off ? "off" : D.hidden ? "hidden" : blocked();
      if (b !== block) { block = b; emit("block", b); }
      var vis = !b;
      show(vis);
      W.SSAISeason.status && (W.SSAISeason.status.blocked = b);
      var animate = vis && mode === "3d" && inst && inst.frame && !(reduced && inst.static);
      if (animate && !running) { running = true; last = 0; raf = requestAnimationFrame(loop); }
      if (!animate && running) { running = false; cancelAnimationFrame(raf); }
      if (vis && mode === "3d" && reduced && inst && inst.frame && !inst._drawn) { inst._drawn = 1; inst.frame(0, 0, true); }
    }
    function loop(ts) {
      if (!running) return;
      raf = requestAnimationFrame(loop);
      if (!last) { last = ts; return; }
      var d = ts - last;
      if (d < STEP - 2) return; // ~30 fps cap
      last = ts - (d % STEP);
      var dt = Math.min(d, 100) / 1000;
      try { inst.frame(dt, ts / 1000, false); } catch (e) { console.warn("[seasons] frame", e); running = false; cancelAnimationFrame(raf); return; }
      // runtime low-end check: sustained < 14 fps for ~4 s -> light 2D version (skipped with ?seasonfx=3d)
      if (FX !== "3d") {
        fpsLog.push(Math.min(d, 250)); // one shader-compile hitch must not trip it if (fpsLog.length > 40) fpsLog.shift();
        if (fpsLog.length === 40) {
          var avg = fpsLog.reduce(function (a, x) { return a + x; }, 0) / 40;
          if (avg > 1000 / 14) { running = false; cancelAnimationFrame(raf); try { inst.dispose && inst.dispose(); } catch (e) {} startFallback("slow"); }
        }
      }
    }

    var api = {
      stop: function () { tick(); },
      start: function () { tick(); }
    };
    D.addEventListener("visibilitychange", function () { if (D.hidden && actx) try { actx.suspend(); } catch (e) {} if (!D.hidden && actx && !prefs.mute) unlock(); tick(); });
    setInterval(tick, 400);
    W.addEventListener("scroll", function () { if (!running) tick(); }, { passive: true });

    D.head.appendChild(css);
    toggle = buildToggle(theme, api);
    if (theme.three === false) return start3d(null);
    if (lowEnd) return startFallback(FX === "2d" ? "forced" : "low-end");
    if (!hasWebGL()) return startFallback("no-webgl");
    loadThree().then(start3d, function (e) { console.warn("[seasons] three.js failed to load", e); startFallback("no-three"); });
  }

  W.SSAISeason = { define: define, base: BASE, version: VER, today: laMMDD, inRange: inRange, status: null };

  function go() {
    fetch(BASE + "calendar.json?v=" + VER, { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (cal) {
      var e = pick(cal.themes || cal);
      if (!e || !e.script) return;
      var s = D.createElement("script");
      s.src = BASE + e.script + (e.script.indexOf("?") < 0 ? "?v=" + VER : "");
      s.async = true;
      D.head.appendChild(s);
    }).catch(function (e) { console.warn("[seasons] calendar", e); });
  }
  // after the page has fully loaded, so the theme never competes with the app's own first paint
  if (D.readyState === "complete") setTimeout(go, 300); else W.addEventListener("load", function () { setTimeout(go, 300); });
})();
