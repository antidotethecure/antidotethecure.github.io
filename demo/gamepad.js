/* SousShift AI — GAME CONTROLLER support for every restaurant game (standing rule: every new game includes this file).
   Built for Antidote's Tesla: park, open the game in the Tesla browser, pair a controller (Bluetooth or USB), press any
   button. Also works on phones/computers in any browser with the standard Gamepad API (Chrome, Edge, Safari, Firefox).
   Include ONCE, early (in <head> is best, so it grabs the real requestAnimationFrame before gamepause.js wraps it):
     <script src="../gamepad.js?v=…"></script>
   Nothing in the game changes. The controller drives the game's EXISTING controls:
     · arcade games: synthetic keyboard events (arrow keys, Space, T, Q/E…) or synthetic pointer events on the canvas,
       or the game's own test API (window.__CL.trySwap for the match-3 grid);
     · menus, the start screen, Pause, sheets, trivia / word games / anything with buttons: spatial navigation. The D-pad or
       stick moves a gold focus ring over the clickable elements, A taps the one under the ring (pointerdown → pointerup →
       click, exactly like a finger).
   Buttons (standard mapping: Xbox, PlayStation, 8BitDo, Switch Pro; non-standard pads fall back to buttons 0–9 + axes):
     Left stick (deadzone) / D-pad  move · steer · move the focus ring        A / ✕  primary (play, select, jump…)
     B / ○  back (closes sheets, Esc)        X / □  special (per game)        Y / △  full screen on/off (fullscreen.js)
     Start / Options  pause ↔ resume (gamepause.js), or PLAY on the start menu
     Select / Share   restart on the game-over screen, otherwise opens "How to play with a controller"
     LB / RB          per game (Melody: switch gun)     Triggers + right stick  scroll the page / panel in menus
   Game profiles are detected from each game's own API object (__MG Melody, __S Storm Run, __NV Nalu Vida, __LD Hibachi
   Catch, __CL Loco Match, __OG Order Up!, the /try catch game), so copied pages work without config.
   Optional page config: window.GAMEPAD_CFG = { hint:"…", keys:{A:" ",X:"t"}, kind:"keys"|"pointer"|"nav" } (rarely needed).
   Locking: this file NEVER locks the screen (manual-only rule: only gamelock.js's lock button locks). It sends no touch
   events, so gamelock.js never sees a "first touch".
   Rumble: vibrationActuator "dual-rumble" on hits / game over where the pad and browser support it; fails silently.
   Large landscape screens (Tesla ~1920×1200): starting a run from the controller turns on the existing full screen
   (GameFS: play area fills the height, aspect ratio kept, centered). Y toggles it.
   Help sheet: "🎮 Play with a game controller" link on the start menu + Pause screen (+ under /try's game), or Select.
   API: window.GamePad = { connected, mode, help(), close(), profile } */
(function () {
  "use strict";
  if (window.GamePad) return;
  var W = window, D = document, H = D.documentElement;
  function isNative(f) { try { return typeof f === "function" && /\[native code\]/.test(Function.prototype.toString.call(f)); } catch (e) { return false; } }
  // real timers, grabbed before gamepause.js wraps them (it holds rAF/timeouts while paused; we must keep polling to resume)
  var nRAF = isNative(W.requestAnimationFrame) ? W.requestAnimationFrame.bind(W) : null;
  var nST = isNative(W.setTimeout) ? W.setTimeout.bind(W) : null, nCT = W.clearTimeout.bind(W);
  function tick(cb) {
    if (nRAF) return nRAF(cb);
    if (W.GamePause && W.GamePause.paused && W.requestIdleCallback) return W.requestIdleCallback(function () { cb(Date.now()); }, { timeout: 34 });
    return W.requestAnimationFrame(cb);
  }
  function later(fn, ms) { return (nST || W.setTimeout)(fn, ms); }
  var now = function () { return Date.now(); };
  var CFG = W.GAMEPAD_CFG || {};
  var CANVAS = "canvas#game, canvas#cv, canvas[data-game]";

  /* ---------------- per-game profiles (from each game's own API) ---------------- */
  function g(o, f) { try { return o ? f(o) : undefined; } catch (e) { return undefined; } }
  var PROFILES = [
    { id: "melody", test: function () { return W.__MG; }, kind: "keys", canvas: "canvas#cv",
      running: function () { return g(W.__MG, function (m) { return !!m.get().running; }); },
      hp: function () { return g(W.__MG, function (m) { return m.get().hp; }); },
      A: ["b", "KeyB"], X: ["e", "KeyE"], LB: ["q", "KeyQ"], RB: ["e", "KeyE"],
      hint: "Stick or D-pad: fly. Your guns fire on their own. A: speed boost. X, LB or RB: switch gun." },
    { id: "storm", test: function () { return W.__S; }, kind: "keys", canvas: "canvas#game", repeat: { ArrowLeft: 1, ArrowRight: 1 },
      running: function () { return g(W.__S, function (s) { return !!s.get().running; }); },
      hp: function () { return g(W.__S, function (s) { return -(s.get().dmg || 0); }); },
      hint: "Left / right on the stick or D-pad: change lanes. Hold it to keep sliding over." },
    { id: "nalu", test: function () { return W.__NV; }, kind: "keys", canvas: "canvas#cv", first: ".nv-pick button",
      running: function () { return g(W.__NV, function (n) { return !!n.get().running; }); },
      hp: function () { return g(W.__NV, function (n) { return n.get().hearts; }); },
      A: [" ", "Space"], X: ["t", "KeyT"], LB: ["g", "KeyG"], RB: ["f", "KeyF"],
      hint: "Left / right: steer. A or up: duck-dive / launch off the lip. In the air: X or down = trick, LB = grab, RB = flip." },
    { id: "dragon", test: function () { return W.__LD; }, kind: "pointer", canvas: "canvas#game",
      running: function () { return g(W.__LD, function (l) { return !!l.get().running; }); },
      hp: function () { return g(W.__LD, function (l) { return l.get().score; }); },
      start: function () { var o = g(W.__LD, function (l) { return l.get(); }); return o ? o.bowlX / o.W : 0.5; },
      hint: "Stick or D-pad: slide the bowl left and right to catch the food." },
    { id: "churrito", test: function () { return W.__CL; }, kind: "grid", canvas: "canvas#game",
      running: function () { return g(W.__CL, function (c) { var s = c.get().state; return s === "play" || s === "clear" || s === "fall"; }); },
      hp: function () { return g(W.__CL, function (c) { return c.get().score; }); },
      hint: "D-pad: move the box. A: pick a snack, then push a direction to swap it. B: drop it." },
    { id: "gritz", test: function () { return W.__OG; }, kind: "nav", scope: "#og",
      running: function () { return g(W.__OG, function (o) { var x = o.get(); return !!(x.running && !x.demo && !x.sim); }); },
      hp: function () { return g(W.__OG, function (o) { return -(o.get().walk || 0); }); },
      hint: "D-pad: move between food, plates and tables. A: tap it (build the plate, Serve, pick the plate, pick the table)." },
    { id: "catch", test: function () { return !W.GAME_MENU && D.querySelector("canvas#cv") && D.getElementById("tm"); }, kind: "pointer", canvas: "canvas#cv",
      running: function () { var t = D.getElementById("tm"); if (!t) return false; var v = t.textContent; if (v !== catchT.v) { catchT.at = catchT.v === null ? 0 : now(); catchT.v = v; } return now() - catchT.at < 1400 && v !== "0"; },
      hint: "Stick or D-pad: slide the paddle. A: start." }
  ];
  var catchT = { v: null, at: 0 };
  var GENERIC = { id: "generic", kind: CFG.kind || "keys", canvas: CANVAS, running: function () { return false; }, hint: CFG.hint || "" };
  var prof = null;
  function profile() {
    if (prof && prof.test && prof.test()) return prof;
    for (var i = 0; i < PROFILES.length; i++) if (PROFILES[i].test()) { prof = PROFILES[i]; break; }
    if (!prof) return GENERIC;
    if (CFG.keys) for (var k in CFG.keys) prof[k] = [CFG.keys[k], ""];
    if (CFG.hint) prof.hint = CFG.hint;
    return prof;
  }
  function canvasEl(P) { return D.querySelector((P && P.canvas) || CANVAS) || D.querySelector(CANVAS); }

  /* ---------------- glyphs ---------------- */
  var BRAND = "xbox";
  function brandOf(id) {
    id = String(id || "").toLowerCase();
    if (/xbox|xinput|045e/.test(id)) return "xbox";
    if (/054c|playstation|dualshock|dualsense|sony/.test(id) || /^wireless controller/.test(id)) return "ps";
    if (/057e|nintendo|pro controller|joy-con/.test(id)) return "switch";
    return "xbox";
  }
  var GLY = {
    xbox: { A: "A", B: "B", X: "X", Y: "Y", start: "☰ Menu", select: "⧉ View", LB: "LB", RB: "RB" },
    ps: { A: "✕", B: "○", X: "□", Y: "△", start: "Options", select: "Share", LB: "L1", RB: "R1" },
    "switch": { A: "B", B: "A", X: "Y", Y: "X", start: "+", select: "−", LB: "L", RB: "R" }   // positional (bottom face button = Switch B)
  };
  var FACE = { A: "#3fbf5f", B: "#e5484d", X: "#3b82f6", Y: "#f5b301" };
  function gl(k) { var t = GLY[BRAND][k] || k, round = /^[ABXY]$/.test(k); return '<span class="gp-g' + (round ? " r" : "") + '"' + (round && BRAND !== "switch" ? ' style="--gc:' + FACE[k] + '"' : "") + ">" + t + "</span>"; }

  /* ---------------- styles + UI ---------------- */
  var st = D.createElement("style");
  st.textContent =
    ".gp-ring{position:fixed;left:0;top:0;width:0;height:0;z-index:2147483646;pointer-events:none;border:3px solid #ffd23f;border-radius:12px;" +
    "box-shadow:0 0 0 3px rgba(10,12,24,.85),0 0 22px 4px rgba(255,210,63,.55);display:none;transition:transform .09s ease-out,width .09s,height .09s}" +
    ".gp-ring.on{display:block}.gp-ring.pick{border-color:#3fe08a;box-shadow:0 0 0 3px rgba(10,12,24,.85),0 0 26px 6px rgba(63,224,138,.7);animation:gpPulse .6s ease-in-out infinite alternate}" +
    "@keyframes gpPulse{to{box-shadow:0 0 0 3px rgba(10,12,24,.85),0 0 10px 2px rgba(63,224,138,.4)}}" +
    ".gp-toast{position:fixed;left:50%;top:calc(14px + env(safe-area-inset-top,0px));z-index:2147483647;transform:translate(-50%,-20px);opacity:0;pointer-events:none;" +
    "max-width:calc(100vw - 32px);padding:11px 16px;border-radius:16px;background:rgba(12,14,26,.94);color:#fff;border:1px solid rgba(255,255,255,.2);" +
    "font:700 15px/1.35 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.45);transition:opacity .25s,transform .25s;text-align:center}" +
    ".gp-toast.on{opacity:1;transform:translate(-50%,0)}.gp-toast small{display:block;font-weight:600;font-size:12.5px;opacity:.85;margin-top:3px}" +
    ".gp-g{display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:22px;padding:0 6px;margin:0 1px;border-radius:7px;background:#2a3150;color:#fff;" +
    "font:800 12px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;vertical-align:1px;border:1px solid rgba(255,255,255,.25)}" +
    ".gp-g.r{border-radius:50%;padding:0;width:22px;background:var(--gc,#2a3150)}" +
    ".gp-hint{width:min(300px,100%);margin:2px auto 0;padding:7px 10px;border-radius:12px;background:rgba(0,0,0,.45);color:#fff;font:700 13px/1.35 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;text-align:center}" +
    ".gp-link{display:block;margin:4px auto 0;padding:6px 10px;border:0;background:none;color:inherit;opacity:.85;font:700 12.5px/1.3 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;cursor:pointer;text-decoration:underline;text-underline-offset:2px}" +
    ".ssai-pauseov .gp-link{color:#fff;font-size:14px;padding:10px 18px;margin-top:-4px;background:transparent!important;box-shadow:none!important;border:0!important}" +
    ".gp-sheet{position:fixed;inset:0;z-index:2147483640;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(4,6,14,.72);" +
    "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}.gp-sheet.on{display:flex}" +
    ".gp-card{width:100%;max-width:560px;max-height:calc(100vh - 32px);max-height:calc(100dvh - 32px);overflow:auto;overscroll-behavior:contain;background:#10142a;color:#eef2ff;" +
    "border:1px solid rgba(255,255,255,.18);border-radius:20px;padding:18px 18px 16px;box-shadow:0 20px 60px rgba(0,0,0,.6);box-sizing:border-box}" +
    ".gp-card h2{margin:0 0 4px;font-size:22px;line-height:1.2;color:#fff}.gp-card h3{margin:16px 0 6px;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#ffd23f}" +
    ".gp-card p,.gp-card li{font-size:14.5px;line-height:1.45;color:#d8def5}.gp-card ol{margin:6px 0;padding-left:22px}.gp-card li{margin:5px 0}" +
    ".gp-card table{width:100%;border-collapse:collapse;font-size:14px}.gp-card td{padding:6px 4px;border-top:1px solid rgba(255,255,255,.08);vertical-align:top;color:#d8def5}" +
    ".gp-card td:first-child{white-space:nowrap;width:1%;padding-right:10px}.gp-note{margin-top:12px;padding:10px 12px;border-radius:12px;background:rgba(255,210,63,.1);border:1px dashed rgba(255,210,63,.5);font-size:13.5px!important}" +
    ".gp-card .gp-ok{display:block;width:100%;min-height:50px;margin-top:14px;border:0;border-radius:14px;background:#ffd23f;color:#14171c;font:800 17px inherit;font-family:inherit;cursor:pointer}" +
    ".gp-cv{position:fixed;left:0;top:0;z-index:2147483645;pointer-events:none;border:3px solid #ffd23f;border-radius:10px;box-shadow:0 0 0 2px rgba(10,12,24,.8),0 0 16px rgba(255,210,63,.6);display:none}" +
    ".gp-cv.on{display:block}.gp-cv.pick{border-color:#3fe08a;box-shadow:0 0 0 2px rgba(10,12,24,.8),0 0 20px rgba(63,224,138,.9)}";
  (D.head || H).appendChild(st);

  var ring = null, toastEl = null, sheet = null, cvBox = null, toastT = 0;
  function ui() {
    if (ring || !D.body) return;
    ring = D.createElement("div"); ring.className = "gp-ring"; ring.setAttribute("aria-hidden", "true");
    cvBox = D.createElement("div"); cvBox.className = "gp-cv"; cvBox.setAttribute("aria-hidden", "true");
    toastEl = D.createElement("div"); toastEl.className = "gp-toast"; toastEl.setAttribute("role", "status"); toastEl.setAttribute("aria-live", "polite");
    D.body.appendChild(ring); D.body.appendChild(cvBox); D.body.appendChild(toastEl);
  }
  function toast(html, ms) {
    ui(); if (!toastEl) return;
    toastEl.innerHTML = html; void toastEl.offsetWidth; toastEl.classList.add("on");
    if (toastT) nCT(toastT); toastT = later(function () { toastEl.classList.remove("on"); }, ms || 4200);
  }

  /* ---------------- help sheet ---------------- */
  function helpHTML() {
    var P = profile();
    return '<div class="gp-card" role="document"><h2>🎮 Play with a game controller</h2>' +
      '<p>Xbox, PlayStation, Switch Pro and 8BitDo controllers work in most browsers, including the Tesla browser on cars that support it.</p>' +
      "<h3>In a Tesla</h3><ol>" +
      "<li><b>Pair it:</b> on the touchscreen open <b>Controls › Bluetooth</b>, put the controller in pairing mode and pick it. Or plug it into a USB port.</li>" +
      "<li><b>Park</b>, then open this page in the Tesla browser.</li>" +
      "<li><b>Press any button</b> on the controller to wake it up. You'll see “🎮 Controller connected”.</li></ol>" +
      "<h3>Buttons</h3><table>" +
      "<tr><td>Stick / D-pad</td><td>Move, steer, or move the gold box over buttons</td></tr>" +
      "<tr><td>" + gl("A") + "</td><td>Play / select / tap what's in the gold box</td></tr>" +
      "<tr><td>" + gl("B") + "</td><td>Back (closes a panel)</td></tr>" +
      "<tr><td>" + gl("Y") + "</td><td>Full screen on / off</td></tr>" +
      "<tr><td>" + gl("start") + "</td><td>Pause and resume</td></tr>" +
      "<tr><td>" + gl("select") + "</td><td>Restart after game over (otherwise opens this help)</td></tr>" +
      "<tr><td>Triggers</td><td>Scroll menus and long pages</td></tr>" +
      (P.hint ? "<tr><td>This game</td><td>" + P.hint.replace(/\bA\b/g, gl("A")).replace(/\bB\b/g, gl("B")).replace(/\bX\b/g, gl("X")).replace(/\bLB\b/g, gl("LB")).replace(/\bRB\b/g, gl("RB")) + "</td></tr>" : "") +
      "</table>" +
      '<p class="gp-note"><b>Honest limits:</b> the Tesla browser only works while the car is in Park. Whether a controller shows up in the browser depends on the car\'s software version and the controller itself; some cars or pads won\'t connect. If nothing happens after pressing a button, try a USB cable, reload the page, or just use the touchscreen. Full screen in the Tesla browser fills the page area; the car\'s own top bar may stay.</p>' +
      '<button type="button" class="gp-ok">Got it</button></div>';
  }
  function help() {
    ui(); if (!D.body) return;
    if (!sheet) {
      sheet = D.createElement("div"); sheet.className = "gp-sheet"; sheet.setAttribute("role", "dialog"); sheet.setAttribute("aria-modal", "true");
      sheet.setAttribute("aria-label", "How to play with a game controller"); sheet.setAttribute("data-scroll-ok", "");
      sheet.addEventListener("click", function (e) { e.stopPropagation(); if (e.target === sheet || (e.target.closest && e.target.closest(".gp-ok"))) close(); });
      ["pointerdown", "touchstart", "mousedown"].forEach(function (ev) { sheet.addEventListener(ev, function (e) { e.stopPropagation(); }, { passive: true }); });
      D.body.appendChild(sheet);
    }
    sheet.innerHTML = helpHTML(); sheet.classList.add("on");
    if (W.GamePause && !W.GamePause.paused && profile().running()) W.GamePause.pause();
    focusEl = null;
  }
  function close() { if (sheet) sheet.classList.remove("on"); focusEl = null; }
  function helpOpen() { return !!(sheet && sheet.classList.contains("on")); }
  function linkBtn(txt) {
    var b = D.createElement("button"); b.type = "button"; b.className = "gp-link"; b.textContent = txt || "🎮 Play with a game controller";
    b.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); help(); });
    ["pointerdown", "pointerup", "touchstart", "touchend", "mousedown", "mouseup"].forEach(function (ev) { b.addEventListener(ev, function (e) { e.stopPropagation(); }, { passive: true }); });
    return b;
  }
  // keep the help link on the start menu (gamemenu.js re-renders it), the Pause screen, and under games with no start menu
  function decorate() {
    if (!D.body) return;
    var gm = D.querySelector(".gm-ov");
    if (gm) {
      if (!gm.querySelector(".gp-link")) gm.appendChild(linkBtn());
      var hint = gm.querySelector(".gp-hint");
      if (connected && !hint) { hint = D.createElement("div"); hint.className = "gp-hint"; var pl = gm.querySelector("[data-gm=play]"); (pl && pl.parentNode ? pl.parentNode : gm).insertBefore(hint, pl ? pl.nextSibling : null); }
      if (hint) { if (!connected) hint.remove(); else { var h = "🎮 Press " + gl("A") + " to play" + (W.GameFS ? " · " + gl("Y") + " full screen" : ""); if (hint.__h !== h) { hint.__h = h; hint.innerHTML = h; } } }
    } else if (!W.GAME_MENU) {
      var cv = canvasEl(profile()), box = cv && (cv.closest(".gamebox") || cv.parentNode);
      if (box && !box.querySelector(".gp-link")) box.appendChild(linkBtn());
    }
    var po = D.querySelector(".ssai-pauseov");
    if (po && !po.querySelector(".gp-link")) { var p = po.querySelector("p"); po.insertBefore(linkBtn("🎮 Controller help"), p); }
  }
  function decorLoop() { try { decorate(); } catch (e) {} later(decorLoop, connected ? 500 : 1500); }

  /* ---------------- synthetic input ---------------- */
  function key(type, k, code, rep) {
    var kc = { ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, " ": 32, Enter: 13, Escape: 27 }[k] || (k && k.length === 1 ? k.toUpperCase().charCodeAt(0) : 0);
    var e = new KeyboardEvent(type, { key: k, code: code || (k && k.indexOf("Arrow") === 0 ? k : k === " " ? "Space" : k === "Escape" ? "Escape" : "Key" + String(k).toUpperCase()), bubbles: true, cancelable: true, repeat: !!rep });
    try { Object.defineProperty(e, "keyCode", { get: function () { return kc; } }); Object.defineProperty(e, "which", { get: function () { return kc; } }); } catch (x) {}
    (D.body || H).dispatchEvent(e);
  }
  function ptr(el, type, x, y) {
    var down = type === "pointerdown" || type === "mousedown";
    var o = { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, button: type === "pointermove" ? -1 : 0, buttons: down || type === "pointermove" && ptrDown ? 1 : 0,
      pointerId: 7301, pointerType: "mouse", isPrimary: true, view: W };
    var E = /^pointer/.test(type) && W.PointerEvent ? W.PointerEvent : W.MouseEvent;
    el.dispatchEvent(new E(type, o));
  }
  var ptrDown = false;
  function tapAt(el, x, y) { ptr(el, "pointerdown", x, y); ptr(el, "mousedown", x, y); ptr(el, "pointerup", x, y); ptr(el, "mouseup", x, y); ptr(el, "click", x, y); }
  function tap(el) {
    var r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && !/^(button|submit|checkbox|radio|reset)$/i.test(el.type || "")) { try { el.focus(); } catch (e) {} return; }
    if (el.tagName === "CANVAS") { tapAt(el, x, y); return; }
    ptr(el, "pointerdown", x, y); ptr(el, "mousedown", x, y); ptr(el, "pointerup", x, y); ptr(el, "mouseup", x, y);
    if (el.isConnected) el.click();
  }

  /* ---------------- rumble ---------------- */
  var lastRumble = 0;
  function rumble(ms, strong, weak) {
    var t = now(); if (t - lastRumble < 120) return; lastRumble = t;
    try {
      var p = pad(); if (!p) return;
      var a = p.vibrationActuator;
      if (a && a.playEffect) { var r = a.playEffect(a.type || "dual-rumble", { startDelay: 0, duration: ms, strongMagnitude: strong, weakMagnitude: weak }); if (r && r.catch) r.catch(function () {}); }
      else if (p.hapticActuators && p.hapticActuators[0] && p.hapticActuators[0].pulse) { var q = p.hapticActuators[0].pulse(strong, ms); if (q && q.catch) q.catch(function () {}); }
    } catch (e) {}
  }

  /* ---------------- reading the pad ---------------- */
  var padIndex = -1;
  function pads() { try { return navigator.getGamepads ? [].slice.call(navigator.getGamepads() || []) : []; } catch (e) { return []; } }
  function pad() {
    var ps = pads(), p = padIndex >= 0 ? ps[padIndex] : null;
    if (p && p.connected !== false) return p;
    for (var i = 0; i < ps.length; i++) if (ps[i] && ps[i].connected !== false) { padIndex = i; return ps[i]; }
    return null;
  }
  function bt(p, i) { var b = p.buttons[i]; return !!b && (b.pressed || (typeof b === "object" ? b.value > 0.5 : b > 0.5)); }
  function ax(p, i) { var v = p.axes[i]; return typeof v === "number" && isFinite(v) ? v : 0; }
  var stickDir = { l: false, r: false, u: false, d: false };
  function read(p) {
    var s = {};
    if (p.mapping === "standard" || p.buttons.length >= 16) {
      s.A = bt(p, 0); s.B = bt(p, 1); s.X = bt(p, 2); s.Y = bt(p, 3); s.LB = bt(p, 4); s.RB = bt(p, 5);
      s.lt = p.buttons[6] ? p.buttons[6].value || (bt(p, 6) ? 1 : 0) : 0; s.rt = p.buttons[7] ? p.buttons[7].value || (bt(p, 7) ? 1 : 0) : 0;
      s.select = bt(p, 8); s.start = bt(p, 9);
      s.du = bt(p, 12); s.dd = bt(p, 13); s.dl = bt(p, 14); s.dr = bt(p, 15);
    } else {   // non-standard: best guess, the common DirectInput/HID layout
      s.A = bt(p, 0); s.B = bt(p, 1); s.X = bt(p, 2); s.Y = bt(p, 3); s.LB = bt(p, 4); s.RB = bt(p, 5);
      s.lt = bt(p, 6) ? 1 : 0; s.rt = bt(p, 7) ? 1 : 0; s.select = bt(p, 8); s.start = bt(p, 9);
      var hx = ax(p, 6), hy = ax(p, 7), hat = p.axes.length > 9 ? ax(p, 9) : 9;
      s.du = hy < -0.5; s.dd = hy > 0.5; s.dl = hx < -0.5; s.dr = hx > 0.5;
      if (hat >= -1.01 && hat <= 1.01 && Math.abs(hat) > 0.01 && p.axes.length > 9) {   // POV hat axis: -1 up … clockwise in 1/7 steps
        var k = Math.round((hat + 1) / (2 / 7)); s.du = s.du || k === 0 || k === 1 || k === 7; s.dr = s.dr || (k >= 1 && k <= 3); s.dd = s.dd || (k >= 3 && k <= 5); s.dl = s.dl || (k >= 5 && k <= 7);
      }
    }
    s.lx = ax(p, 0); s.ly = ax(p, 1); s.rx = ax(p, 2); s.ry = ax(p, 3);
    // stick → directions, radial deadzone + hysteresis
    var mag = Math.sqrt(s.lx * s.lx + s.ly * s.ly);
    if (mag < 0.25) { s.lx = 0; s.ly = 0; }
    stickDir.l = s.lx < (stickDir.l ? -0.3 : -0.5); stickDir.r = s.lx > (stickDir.r ? 0.3 : 0.5);
    stickDir.u = s.ly < (stickDir.u ? -0.3 : -0.5); stickDir.d = s.ly > (stickDir.d ? 0.3 : 0.5);
    s.l = s.dl || stickDir.l; s.r = s.dr || stickDir.r; s.u = s.du || stickDir.u; s.d = s.dd || stickDir.d;
    if (Math.abs(s.ry) < 0.2) s.ry = 0;
    return s;
  }

  /* ---------------- modes: what the controller drives right now ---------------- */
  function visible(el) {
    if (!el || !el.isConnected || !el.getClientRects().length) return false;
    var r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false;
    var cs = getComputedStyle(el); if (cs.visibility === "hidden" || cs.pointerEvents === "none" && el.tagName !== "CANVAS") return false;
    for (var n = el; n && n !== D.body; n = n.parentElement) { var c = n === el ? cs : getComputedStyle(n); if (parseFloat(c.opacity) < 0.05) return false; }
    return true;
  }
  function onScreen(el) { var r = el.getBoundingClientRect(); return r.bottom > 0 && r.right > 0 && r.top < W.innerHeight && r.left < W.innerWidth; }
  // the top-most modal layer, if any: our help, Pause, a start-menu sheet, or any big fixed overlay (games pack, sign-up, halftime…)
  function modal() {
    if (helpOpen()) return sheet;
    var q = D.querySelector(".ssai-pauseov.on"); if (q) return q;
    q = D.querySelector(".gm-sheet.on"); if (q) return q;
    var vw = W.innerWidth, vh = W.innerHeight, at = D.elementFromPoint(vw / 2, vh / 2), best = null;
    for (var n = at; n && n !== D.body && n !== H; n = n.parentElement) {
      var cs = getComputedStyle(n);
      if (cs.position === "fixed") { var r = n.getBoundingClientRect(); if (r.width * r.height >= vw * vh * 0.35 && !n.classList.contains("ssai-fsbox")) best = n; }
    }
    return best;
  }
  function gmUp() { var o = D.querySelector(".gm-ov"); return H.classList.contains("gm-up") && o && !o.classList.contains("off") && !o.classList.contains("gone") ? o : null; }
  var mode = "idle", scope = null, roam = false, lastScopeAt = 0, ran = false, wasRunning = false, lastHp = null;
  function decide() {
    var before = scope; decide2();
    // a new layer (start menu, sign-up sheet, Pause, a game's panel) → put the gold box on its first/likeliest button
    if (connected && mode === "nav" && (scope !== before || (!focusEl && scope && scope !== D.body)) && (!focusEl || !scope || !scope.contains(focusEl))) { var l = candidates(); if (l.length) setFocus(firstFocus(l)); }
  }
  function decide2() {
    var P = profile(), m = modal(), gm = gmUp(), run = !m && !gm && !!P.running();
    if (run) { ran = true; roam = false; }
    if (run && P.kind !== "nav") { mode = P.kind; scope = null; return; }
    mode = "nav";
    if (m) scope = m;
    else if (gm && !roam) scope = gm;
    else if (run && P.scope) scope = D.querySelector(P.scope) || D.body;
    else if (W.GameFS && W.GameFS.active) scope = D.querySelector(".ssai-fsbox") || D.body;
    else scope = D.body;
  }

  /* ---------------- spatial navigation ---------------- */
  var SEL = "a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=tab],[role=menuitem],[role=option],[role=link],[role=switch]," +
    "[tabindex]:not([tabindex='-1']),[data-tb],[data-gm],.plt img,.cupz img,.tk,[onclick]";
  var focusEl = null, lastRect = null;
  function candidates() {
    var root = scope || D.body, P = profile(), list = [], seen = [];
    var els = root.querySelectorAll(SEL);
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.disabled || el.getAttribute("aria-disabled") === "true") continue;
      if (el.closest("[inert],[aria-hidden='true'],.gp-ring,.gp-toast,.ssai-fshide")) continue;
      if (el.parentElement && el.parentElement.closest(SEL) && el.parentElement.closest(SEL) !== el && root.contains(el.parentElement.closest(SEL))) continue;   // a clickable inside a clickable: keep the outer one
      if (!visible(el)) continue;
      list.push(el); seen.push(el);
    }
    if (scope === D.body || (scope && scope.classList && scope.classList.contains("ssai-fsbox"))) {   // the game canvas = "tap to play"
      var cv = canvasEl(P); if (cv && root.contains(cv) && visible(cv) && seen.indexOf(cv) < 0 && !P.running()) list.push(cv);
    }
    return list;
  }
  function rectOf(el) { return el.getBoundingClientRect(); }
  function firstFocus(list) {
    var P = profile(), pref = ["[data-gm=play]", ".ssai-pauseov button", ".gp-ok"].concat(P.first ? [P.first] : []), i, j;
    for (i = 0; i < pref.length; i++) for (j = 0; j < list.length; j++) if (list[j].matches(pref[i])) return list[j];
    var cv = canvasEl(P), page = scope === D.body || (scope && scope.classList && scope.classList.contains("ssai-fsbox"));
    if (page && cv && list.indexOf(cv) >= 0) return cv;   // on the page itself the game comes first: A = tap to play
    if (lastRect) return nearest(list, lastRect.left + lastRect.width / 2, lastRect.top + lastRect.height / 2);
    for (j = 0; j < list.length; j++) if (onScreen(list[j])) return list[j];
    return list[0] || null;
  }
  function nearest(list, x, y) {
    var best = null, bd = 1e12;
    list.forEach(function (el) { var r = rectOf(el), dx = r.left + r.width / 2 - x, dy = r.top + r.height / 2 - y, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = el; } });
    return best;
  }
  function move(dir) {
    var list = candidates(); if (!list.length) { scrollBy(dir); return; }
    if (!focusEl || list.indexOf(focusEl) < 0) { setFocus(firstFocus(list)); return; }
    var r = rectOf(focusEl), cx = r.left + r.width / 2, cy = r.top + r.height / 2, best = null, bs = 1e12;
    list.forEach(function (el) {
      if (el === focusEl || focusEl.contains(el) || el.contains(focusEl)) return;
      var c = rectOf(el), ex = c.left + c.width / 2, ey = c.top + c.height / 2, main, gap, ortho, cross;
      if (dir === "r") { main = ex - cx; gap = Math.max(0, c.left - r.right); ortho = Math.max(0, c.top - r.bottom, r.top - c.bottom); cross = Math.abs(ey - cy); }
      else if (dir === "l") { main = cx - ex; gap = Math.max(0, r.left - c.right); ortho = Math.max(0, c.top - r.bottom, r.top - c.bottom); cross = Math.abs(ey - cy); }
      else if (dir === "d") { main = ey - cy; gap = Math.max(0, c.top - r.bottom); ortho = Math.max(0, c.left - r.right, r.left - c.right); cross = Math.abs(ex - cx); }
      else { main = cy - ey; gap = Math.max(0, r.top - c.bottom); ortho = Math.max(0, c.left - r.right, r.left - c.right); cross = Math.abs(ex - cx); }
      if (main <= 4) return;
      var s = gap + ortho * 3 + cross * 0.3 + main * 0.05;
      if (s < bs) { bs = s; best = el; }
    });
    if (best) setFocus(best); else scrollBy(dir);
  }
  function setFocus(el) {
    focusEl = el; if (!el) return;
    lastRect = rectOf(el);
    var r = lastRect;
    if (r.top < 0 || r.bottom > W.innerHeight || r.left < 0 || r.right > W.innerWidth) { try { el.scrollIntoView({ block: r.height > W.innerHeight * 0.8 ? "start" : "center", inline: "nearest" }); } catch (e) { el.scrollIntoView(); } }
  }
  function scroller(from) {
    for (var n = from; n && n !== D.body && n !== H; n = n.parentElement) { var cs = getComputedStyle(n); if (/(auto|scroll)/.test(cs.overflowY) && n.scrollHeight > n.clientHeight + 2) return n; }
    return null;
  }
  function scrollBy(dir, px) {
    if (dir !== "u" && dir !== "d") return;
    var amt = (px || W.innerHeight * 0.6) * (dir === "u" ? -1 : 1), s = scroller(focusEl || scope);
    if (s) s.scrollTop += amt; else if (!H.classList.contains("ssai-fs")) W.scrollBy(0, amt);
  }
  function drawRing() {
    ui();
    var show = connected && mode === "nav" && focusEl && focusEl.isConnected && visible(focusEl);
    if (!show) { if (ring) ring.classList.remove("on"); return; }
    var r = rectOf(focusEl), pad2 = 4;
    ring.style.transform = "translate(" + (r.left - pad2) + "px," + (r.top - pad2) + "px)";
    ring.style.width = r.width + pad2 * 2 + "px"; ring.style.height = r.height + pad2 * 2 + "px";
    ring.classList.add("on");
  }

  /* ---------------- per-mode handlers ---------------- */
  var held = {};   // synthetic keys currently down
  function keyDown(k, code) { if (held[k]) return; held[k] = { code: code, t: now(), n: 0 }; key("keydown", k, code); }
  function keyUp(k) { if (!held[k]) return; var c = held[k].code; delete held[k]; key("keyup", k, c); }
  function releaseAll() { Object.keys(held).forEach(keyUp); if (ptrDown) ptrDown = false; }
  var vx = null;   // pointer mode: virtual x (0..1 across the canvas)
  var cur = { c: 3, r: 3 }, picked = false;   // grid mode

  function gameKeys(s, e, P) {
    var dirs = { l: "ArrowLeft", r: "ArrowRight", u: "ArrowUp", d: "ArrowDown" };
    Object.keys(dirs).forEach(function (d) {
      var k = dirs[d];
      if (s[d]) {
        if (!held[k]) keyDown(k, k);
        else if (P.repeat && P.repeat[k]) { var h = held[k], due = h.n ? 190 : 260; if (now() - h.t > due) { h.t = now(); h.n++; key("keydown", k, k, true); } }
      } else keyUp(k);
    });
    ["A", "X", "LB", "RB"].forEach(function (b) {
      var m = P[b]; if (!m) return;
      var id = m[0] + "#" + b;
      if (e[b]) { held[id] = { code: m[1], t: now(), n: 0 }; key("keydown", m[0], m[1]); }
      else if (!s[b] && held[id]) { delete held[id]; key("keyup", m[0], m[1]); }
    });
  }
  function gamePointer(s, e, P, dt) {
    var cv = canvasEl(P); if (!cv) return;
    var r = cv.getBoundingClientRect();
    if (vx == null) vx = P.start ? (P.start() || 0.5) : 0.5;
    var dx = s.lx || 0; if (s.dl || stickDir.l && !dx) dx = -1; if (s.dr || stickDir.r && !dx) dx = 1;
    var y = r.top + r.height * 0.85;
    if (dx) { vx = Math.max(0, Math.min(1, vx + dx * Math.min(dt, 50) / 1000 * 1.25)); ptr(cv, "pointermove", r.left + vx * r.width, y); }
    if (e.A) { var idle = !P.running(); tapAt(cv, r.left + vx * r.width, y); if (idle) assistFs(); }
  }
  function gameGrid(s, e, P, rp) {
    var C = W.__CL, cv = canvasEl(P); if (!C || !cv) return;
    var cols = C.COLS || 7, rows = C.ROWS || 7, d = rp;
    if (d) {
      var nc = cur.c + (d === "r" ? 1 : d === "l" ? -1 : 0), nr = cur.r + (d === "d" ? 1 : d === "u" ? -1 : 0);
      if (nc >= 0 && nc < cols && nr >= 0 && nr < rows) {
        if (picked) { picked = false; try { C.trySwap({ c: cur.c, r: cur.r }, { c: nc, r: nr }); } catch (x) {} }
        cur.c = nc; cur.r = nr;
      }
    }
    if (e.A) picked = !picked;
    if (e.B) picked = false;
    var r = cv.getBoundingClientRect(), w = r.width / cols, h = r.height / rows;
    ui(); cvBox.style.transform = "translate(" + (r.left + cur.c * w) + "px," + (r.top + cur.r * h) + "px)"; cvBox.style.width = w + "px"; cvBox.style.height = h + "px";
    cvBox.classList.add("on"); cvBox.classList.toggle("pick", picked);
  }

  /* ---------------- global buttons ---------------- */
  function bigLandscape() { return W.innerWidth >= 1000 && W.innerWidth > W.innerHeight; }
  function assistFs() { if (bigLandscape() && W.GameFS && !W.GameFS.active) later(function () { try { if (!W.GameFS.active) W.GameFS.enter(false); } catch (x) {} }, 80); }
  function restartFn() {
    if (typeof W.GAMEPAUSE_RESTART === "function") return W.GAMEPAUSE_RESTART;
    if (W.GameMenu && W.GameMenu.play) return function () { W.GameMenu.play(); };
    if (W.GAME_MENU && typeof W.GAME_MENU.start === "function") return W.GAME_MENU.start;
    var cv = canvasEl(profile()); return cv ? function () { tap(cv); } : null;
  }
  function onStart() {
    var P = profile();
    if (helpOpen()) { close(); return; }
    if (W.GamePause && W.GamePause.paused) { W.GamePause.resume(); return; }
    if (P.running() || (D.getElementById("mg-ov") && D.getElementById("mg-ov").classList.contains("on"))) { if (W.GamePause) { releaseAll(); W.GamePause.pause(); } return; }
    var gm = gmUp(); if (gm && W.GameMenu) { W.GameMenu.play(); assistFs(); return; }
    if (focusEl) activate();
  }
  function onSelect() {
    var P = profile();
    if (W.GamePause && W.GamePause.paused) { var rs = D.querySelector(".ssai-pauseov .ssai-restart"); if (rs) { tap(rs); assistFs(); return; } }
    if (ran && !P.running() && !gmUp() && !helpOpen() && !D.querySelector(".gm-sheet.on")) {
      var f = restartFn();
      if (f) {
        if (modal()) { key("keydown", "Escape", "Escape"); key("keyup", "Escape", "Escape"); }   // e.g. the game-over Add-to-Home-Screen card
        later(function () { try { f(); } catch (x) {} assistFs(); }, 60); return;
      }
    }
    if (helpOpen()) close(); else help();
  }
  function onBack() {
    if (helpOpen()) { close(); return; }
    if (W.GamePause && W.GamePause.paused) { W.GamePause.resume(); return; }
    var ae = D.activeElement; if (ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) { ae.blur(); return; }
    if (scope && scope === gmUp()) { roam = true; focusEl = null; return; }
    key("keydown", "Escape", "Escape"); key("keyup", "Escape", "Escape");
  }
  function activate() {
    if (!focusEl) return;
    var el = focusEl, P = profile(), startsRun = el.matches("[data-gm=play]") || el.tagName === "CANVAS" || (P.first && el.matches(P.first));
    lastRect = rectOf(el);
    tap(el);
    if (startsRun) assistFs();
  }

  /* ---------------- the loop (runs only while a controller is connected) ---------------- */
  var connected = false, looping = false, prev = {}, lastT = 0, dirT = {}, missing = 0;
  function loop(t) {
    looping = false;
    var p = pad();
    if (!p) { if (++missing > 90) { disconnect(); return; } schedule(); return; }
    missing = 0;
    var s = read(p), e = {}, n = now(), dt = lastT ? n - lastT : 16; lastT = n;
    ["A", "B", "X", "Y", "LB", "RB", "start", "select", "l", "r", "u", "d"].forEach(function (k) { e[k] = s[k] && !prev[k]; });
    var any = false; for (var k in e) if (e[k]) any = true;
    if (!connected) { onConnect(p); }
    if (n - lastScopeAt > 150 || any) { lastScopeAt = n; var was = mode; decide(); if (was !== mode && was !== "nav" && mode === "nav") { releaseAll(); } if (mode !== "grid" && cvBox) cvBox.classList.remove("on"); }
    var P = profile();
    // direction with auto-repeat (nav + grid)
    var rp = null;
    ["l", "r", "u", "d"].forEach(function (d) {
      if (!s[d]) { dirT[d] = 0; return; }
      if (e[d]) { dirT[d] = n + 380; rp = d; } else if (dirT[d] && n >= dirT[d]) { dirT[d] = n + 115; rp = d; }
    });
    if (e.start) onStart();
    else if (e.select) onSelect();
    else if (e.Y && W.GameFS) { W.GameFS.toggle(); if (W.GameMenu && W.GameMenu.refresh) W.GameMenu.refresh(); }
    else if (mode === "keys") gameKeys(s, e, P);
    else if (mode === "pointer") gamePointer(s, e, P, dt);
    else if (mode === "grid") gameGrid(s, e, P, rp);
    else {
      if (rp) move(rp);
      if (e.A) {
        if (!focusEl || !focusEl.isConnected || !visible(focusEl)) {   // first press: show the ring; only "safe" targets get tapped right away
          setFocus(firstFocus(candidates()));
          if (focusEl && (focusEl.tagName === "CANVAS" || focusEl.matches("[data-gm=play],.ssai-pauseov button,.gp-ok" + (P.first ? "," + P.first : "")))) activate();
        } else activate();
      }
      if (e.B) onBack();
      var sc = (s.rt || 0) - (s.lt || 0) + (s.ry || 0);
      if (Math.abs(sc) > 0.15) { var sEl = scroller(focusEl || scope); if (sEl) sEl.scrollTop += sc * dt * 1.2; else if (!H.classList.contains("ssai-fs")) W.scrollBy(0, sc * dt * 1.2); }
    }
    if (mode === "nav" && focusEl && (!focusEl.isConnected || !visible(focusEl) || (scope && !scope.contains(focusEl)))) {
      if (focusEl.isConnected && visible(focusEl)) lastRect = rectOf(focusEl);
      focusEl = null;
    }
    drawRing();
    // rumble on hits + game over
    var run = !!P.running();
    if (run) { var hp = P.hp ? P.hp() : null; if (typeof hp === "number" && typeof lastHp === "number" && hp < lastHp) rumble(180, 0.7, 0.9); lastHp = hp; }
    else lastHp = null;
    if (wasRunning && !run && !(W.GamePause && W.GamePause.paused)) { rumble(450, 1, 0.6); focusEl = null; lastRect = null; }
    wasRunning = run;
    prev = s;
    schedule();
  }
  function schedule() { if (!looping) { looping = true; tick(loop); } }
  function onConnect(p) {
    connected = true; BRAND = brandOf(p.id);
    var P = profile();
    toast("🎮 Controller connected<small>" + gl("A") + " play / select · " + gl("B") + " back · " + gl("start") + " pause" + (W.GameFS ? " · " + gl("Y") + " full screen" : "") + " · " + gl("select") + " help</small>", 5200);
    decorate();
    if (P.id === "generic" && !D.querySelector(CANVAS) && !D.getElementById("mg-ov")) return;
  }
  function disconnect() {
    if (!connected) return;
    connected = false; releaseAll(); focusEl = null; vx = null; picked = false;
    if (ring) ring.classList.remove("on"); if (cvBox) cvBox.classList.remove("on");
    if (profile().running() && W.GamePause && !W.GamePause.paused) W.GamePause.pause();
    toast("🎮 Controller disconnected", 3000); decorate();
  }
  W.addEventListener("gamepadconnected", function (ev) { if (ev.gamepad) padIndex = ev.gamepad.index; missing = 0; schedule(); });
  W.addEventListener("gamepaddisconnected", function (ev) { if (ev.gamepad && ev.gamepad.index === padIndex) padIndex = -1; if (!pad()) disconnect(); });
  W.addEventListener("blur", releaseAll);
  // a pad that was already awake before the page loaded
  function boot() { decorLoop(); if (pad()) schedule(); }
  if (D.readyState === "loading") D.addEventListener("DOMContentLoaded", boot); else boot();

  W.GamePad = { help: help, close: close, get connected() { return connected; }, get mode() { return mode; }, get profile() { return profile().id; },
    get focus() { return focusEl; }, rumble: rumble };
})();
