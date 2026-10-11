/* SousShift AI — FULL SCREEN for every restaurant mini game (and any other game on this site).
   Standing rule: "When you get to the screen to play it, you can tap full screen, and it takes away being able to
   swipe off screen."

   Include: gamemenu.js loads this file by itself and wires it in (⛶ Full screen on the start menu, auto-enter on PLAY when
   the guest chose full screen last time). A page without the start menu can include it directly:
     <script>window.GAME_FS={box:".gamebox", hide:".how", bg:"#0b1230"};</script><script src="../fullscreen.js"></script>
   or, for a game that already IS the whole page (Drizzle Bowl):  window.GAME_FS={page:true}

   What "full screen" does:
     · Real Fullscreen API (requestFullscreen / webkitRequestFullscreen) on the whole document where the browser has it:
       Android Chrome, desktop, iPad. The whole document goes full screen (not just the game box), so halftime ads,
       review cards, cook lessons, the kid-mode parent sheet, the Pause screen and every other overlay keep showing.
     · Pseudo full screen everywhere (and the only thing on iPhone Safari, which has no element fullscreen):
       the game box becomes position:fixed over a solid backdrop that covers the page, laid out at the screen width and
       scaled to fit (aspect ratio kept, letterboxed) inside env(safe-area-inset-*); the page cannot scroll
       (html/body overflow:hidden + overscroll-behavior:none; on iOS the body is pinned with position:fixed;top:-scrollY
       and the scroll position is put back on exit); touch-action:none on the game area; pinch-zoom (gesture events,
       two-finger touchmove) and double-tap zoom are blocked while it is on.
     · Refits on enter, exit, resize, orientation change, visual-viewport change and whenever the game box changes size.
   HONEST LIMIT (iOS): Safari still owns the edge back/forward swipe and the bottom home-bar swipe; no web page can block
   those. Pseudo full screen + the scroll lock stop the PAGE from scrolling or bouncing and stop swipes inside the game
   area. A true full-screen app on iPhone comes from Add to Home Screen (manifest display:standalone +
   apple-mobile-web-app-capable, see a2hs.js), so on iPhone we show a one-line tip that opens the Add-to-Home-Screen sheet.
   Exit: the ✕ button (in-game corner button or the start menu), Esc, the browser's own exit (fullscreenchange).
   The choice is remembered per device (localStorage "ssai:fs").
   API: window.GameFS.attach(cfg) · enter() · exit() · toggle() · active · pref · playing(on) · supportsReal */
(function () {
  "use strict";
  if (window.GameFS) return;
  var W = window, D = document, H = D.documentElement;
  var KEY = "ssai:fs", Z = 2147481000;
  var ua = navigator.userAgent || "";
  var iPhone = /iPhone|iPod/.test(ua);
  var iOS = iPhone || /iPad/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  // iPhone Safari has no element/document fullscreen (only <video>), so it always takes the pseudo path.
  var supportsReal = !iPhone && !!(H.requestFullscreen || H.webkitRequestFullscreen) && D.fullscreenEnabled !== false && D.webkitFullscreenEnabled !== false;
  function standalone() { try { return W.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true; } catch (e) { return false; } }
  function getPref() { try { return localStorage.getItem(KEY) === "1"; } catch (e) { return false; } }
  function setPref(on) { try { localStorage.setItem(KEY, on ? "1" : "0"); } catch (e) {} }
  function fsEl() { return D.fullscreenElement || D.webkitFullscreenElement || null; }

  var cfg = W.GAME_FS || {}, box = null, hidden = [], back = null, btn = null, tip = null, probe = null;
  var on = false, viaReal = false, saved = null, play = false, vis = true, fitQ = 0, lastFit = "";

  var st = D.createElement("style");
  st.textContent =
    "html.ssai-fs,html.ssai-fs body{overflow:hidden!important;overscroll-behavior:none!important}" +
    ".ssai-fsback{position:fixed;inset:0;z-index:" + (Z - 1) + ";background:#000;touch-action:none}" +
    ".ssai-fsbox{position:fixed!important;left:0!important;top:0!important;right:auto!important;bottom:auto!important;margin:0!important;max-width:none!important;" +
    "min-width:0!important;box-sizing:border-box!important;transform-origin:0 0!important;z-index:" + Z + "!important;touch-action:none!important;overscroll-behavior:none!important}" +
    ".ssai-fsbox *{touch-action:none}" +
    ".ssai-fshide{display:none!important}" +
    ".ssai-fsprobe{position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;" +
    "padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)}" +
    // in-game corner toggle: right edge, stacked above gamemenu's 🎵 (bottom 60px) and gamepause's ⏸ Pause (bottom 12px)
    ".ssai-fsbtn{position:fixed;right:calc(10px + env(safe-area-inset-right,0px));bottom:calc(112px + env(safe-area-inset-bottom,0px));z-index:2147483001;" +
    "width:44px;height:44px;border-radius:50%;display:none;align-items:center;justify-content:center;font:700 19px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;" +
    "border:1px solid rgba(255,255,255,.22);background:rgba(14,17,30,.86);color:#fff;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.35);" +
    "-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);-webkit-tap-highlight-color:transparent;touch-action:manipulation;padding:0}" +
    ".ssai-fsbtn.on{display:inline-flex}.ssai-fsbtn.page{bottom:calc(100px + env(safe-area-inset-bottom,0px));right:auto;left:calc(10px + env(safe-area-inset-left,0px))}" +
    ".ssai-fstip{position:fixed;right:calc(62px + env(safe-area-inset-right,0px));bottom:calc(114px + env(safe-area-inset-bottom,0px));z-index:2147483001;max-width:min(250px,calc(100vw - 84px));" +
    "padding:8px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.22);background:rgba(14,17,30,.92);color:#fff;font:700 12.5px/1.3 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;" +
    "text-align:left;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.35);opacity:0;transform:translateX(8px);transition:opacity .25s,transform .25s;pointer-events:none}" +
    ".ssai-fstip.on{opacity:1;transform:none;pointer-events:auto}.ssai-fstip u{color:#ffd23f;text-decoration:none}" +
    ".ssai-fstip.page{right:auto;bottom:calc(102px + env(safe-area-inset-bottom,0px));left:calc(62px + env(safe-area-inset-left,0px))}";
  D.head.appendChild(st);

  function q(s) { return typeof s === "string" ? D.querySelector(s) : s; }
  function findBox() {
    if (cfg.page) return null;
    if (box && box.isConnected) return box;
    var b = q(cfg.box);
    if (!b) { var c = D.querySelector("canvas#game, canvas#cv, canvas[data-game]"); b = c && (c.closest(".gamebox") || c.parentNode); }
    if (!b) b = D.querySelector(".gamebox:not(.keybox)");
    box = b || null;
    if (box && W.ResizeObserver && !box.__ssaiFsRO) { box.__ssaiFsRO = new ResizeObserver(function () { if (on) queueFit(); }); box.__ssaiFsRO.observe(box); }
    if (box && W.IntersectionObserver && !box.__ssaiFsIO) {
      box.__ssaiFsIO = new IntersectionObserver(function (es) { if (es[0].target === box) { vis = es[0].isIntersecting; sync(); } }, { threshold: 0.2 });
      box.__ssaiFsIO.observe(box);
      // a game without the start menu counts as "playing" from the first touch/click in it
      ["pointerdown", "touchstart"].forEach(function (ev) { box.addEventListener(ev, function () { if (!W.GameMenu && !play) { play = true; sync(); } }, { passive: true }); });
    }
    return box;
  }
  function bgOf(el) {
    if (cfg.bg) return cfg.bg;
    for (var n = el; n && n.nodeType === 1; n = n.parentElement) { var c = getComputedStyle(n).backgroundColor; if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c; }
    return "#000";
  }
  function insets() {
    if (!probe) { probe = D.createElement("div"); probe.className = "ssai-fsprobe"; D.body.appendChild(probe); }
    var s = getComputedStyle(probe);
    return { t: parseFloat(s.paddingTop) || 0, r: parseFloat(s.paddingRight) || 0, b: parseFloat(s.paddingBottom) || 0, l: parseFloat(s.paddingLeft) || 0 };
  }

  function fit() {
    fitQ = 0;
    if (!on || !box) return;
    var vw = W.innerWidth, vh = W.innerHeight, i = insets();
    var aw = Math.max(200, vw - i.l - i.r), ah = Math.max(200, vh - i.t - i.b);
    // lay the game out at the screen width (phones) or its normal page width (desktop/tablet), then scale to fit
    var lw = Math.round(Math.min(aw <= 700 ? aw : Math.min(aw, Math.max(saved.w, cfg.minWidth || 340)), cfg.maxWidth || 1e9));
    box.style.setProperty("width", lw + "px", "important");
    box.style.setProperty("height", "auto", "important");
    var h = box.offsetHeight || 1;
    var s = Math.min(aw / lw, ah / h, cfg.maxScale || 3);
    var x = i.l + (aw - lw * s) / 2, y = i.t + Math.max(0, (ah - h * s) / 2);
    var t = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px) scale(" + s.toFixed(4) + ")";
    if (t !== lastFit) { lastFit = t; box.style.setProperty("transform", t, "important"); }
    H.style.setProperty("--ssai-fs-scale", s.toFixed(4));
  }
  function queueFit() { if (!fitQ) fitQ = (W.requestAnimationFrame || setTimeout)(fit); }
  function kick() { // let games / the start menu re-measure (canvas games recompute on resize)
    try { W.dispatchEvent(new Event("resize")); } catch (e) {}
  }

  function lockScroll() {
    var y = W.scrollY || W.pageYOffset || 0, x = W.scrollX || W.pageXOffset || 0, b = D.body;
    saved.sx = x; saved.sy = y; saved.body = b.getAttribute("style");
    H.classList.add("ssai-fs");
    if (iOS) { b.style.position = "fixed"; b.style.top = -y + "px"; b.style.left = -x + "px"; b.style.right = "0"; b.style.width = "100%"; }
  }
  function unlockScroll() {
    var b = D.body;
    H.classList.remove("ssai-fs");
    if (saved.body == null) b.removeAttribute("style"); else b.setAttribute("style", saved.body);
    var html = H.style.scrollBehavior; H.style.scrollBehavior = "auto";
    W.scrollTo(saved.sx, saved.sy);
    H.style.scrollBehavior = html;
  }

  function enter(user) {
    if (user) setPref(true);
    if (on) return true;
    if (!cfg.page && !findBox()) return false;
    on = true; saved = { w: 0, sx: 0, sy: 0 }; lastFit = "";
    lockScroll();
    if (!cfg.page) {
      saved.w = box.getBoundingClientRect().width || box.offsetWidth || 360;
      saved.style = box.getAttribute("style");
      back = D.createElement("div"); back.className = "ssai-fsback"; back.style.background = bgOf(box); back.setAttribute("aria-hidden", "true");
      D.body.appendChild(back);
      box.classList.add("ssai-fsbox");
      // long how-to / point lists under the game stay on the page; full screen is for playing
      hidden = [].slice.call(box.querySelectorAll(".how, #points" + (cfg.hide ? ", " + cfg.hide : "")));
      hidden.forEach(function (h) { h.classList.add("ssai-fshide"); });
      fit();
    }
    if (supportsReal && !fsEl()) {
      try {
        var p = H.requestFullscreen ? H.requestFullscreen({ navigationUI: "hide" }) : H.webkitRequestFullscreen();
        viaReal = true;
        if (p && p.catch) p.catch(function () { viaReal = false; });   // no user gesture / blocked: pseudo still on
      } catch (e) { viaReal = false; }
    }
    sync(); kick();
    if (iPhone && !standalone() && W.A2HS) setTimeout(function () { if (on) showTip(); }, 450);   // after PLAY has closed the menu
    return true;
  }
  function exit(user) {
    if (user) setPref(false);
    if (!on) return;
    on = false;
    if (box && !cfg.page) {
      box.classList.remove("ssai-fsbox");
      if (saved.style == null) box.removeAttribute("style"); else box.setAttribute("style", saved.style);
      hidden.forEach(function (h) { h.classList.remove("ssai-fshide"); }); hidden = [];
    }
    if (back) { back.remove(); back = null; }
    unlockScroll();
    if (viaReal && fsEl()) { try { (D.exitFullscreen || D.webkitExitFullscreen).call(D); } catch (e) {} }
    viaReal = false; hideTip(); sync(); kick();
  }
  function toggle() { if (on) exit(true); else enter(true); return on; }

  /* ---------- the in-game corner button + iPhone tip ---------- */
  function sync() {
    if (!D.body) return;
    if (!btn) {
      btn = D.createElement("button"); btn.type = "button"; btn.className = "ssai-fsbtn" + (cfg.page ? " page" : "");
      btn.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); toggle(); W.GameMenu && W.GameMenu.refresh && W.GameMenu.refresh(); });
      ["pointerdown", "touchstart"].forEach(function (ev) { btn.addEventListener(ev, function (e) { e.stopPropagation(); }, { passive: true }); });
      D.body.appendChild(btn);
    }
    btn.textContent = on ? "✕" : "⛶";
    btn.setAttribute("aria-label", on ? "Exit full screen" : "Full screen");
    btn.title = on ? "Exit full screen" : "Full screen";
    var menuUp = H.classList.contains("gm-up");
    btn.classList.toggle("on", cfg.page ? true : (on && !menuUp) || (play && vis && !menuUp));
  }
  function showTip() {
    if (!tip) {
      tip = D.createElement("button"); tip.type = "button"; tip.className = "ssai-fstip" + (cfg.page ? " page" : "");
      tip.innerHTML = "For true full screen, <u>add us to your Home Screen</u> 📲";
      tip.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); hideTip(); if (W.A2HS) W.A2HS.open("fullscreen"); });
      ["pointerdown", "touchstart"].forEach(function (ev) { tip.addEventListener(ev, function (e) { e.stopPropagation(); }, { passive: true }); });
      D.body.appendChild(tip);
    }
    if (H.classList.contains("gm-up")) return;   // the start menu shows its own tip line
    void tip.offsetWidth; tip.classList.add("on");
    clearTimeout(tip.__t); tip.__t = setTimeout(hideTip, 7000);
  }
  function hideTip() { if (tip) tip.classList.remove("on"); }

  /* ---------- while on: no page scroll, no pinch, no double-tap zoom ---------- */
  function inGame(t) { return t && t.nodeType === 1 && ((box && box.contains(t)) || (back && back === t) || cfg.page); }
  function scrollOk(t) { return t && t.closest && t.closest("[data-scroll-ok], .gm-bd, .a2hs-card, .crm-ov, .crm-card"); }
  D.addEventListener("touchmove", function (e) {
    if (!on) return;
    if (e.touches && e.touches.length > 1) { e.preventDefault(); return; }       // pinch
    if (inGame(e.target) && !scrollOk(e.target)) e.preventDefault();             // swipe in the game area
  }, { passive: false, capture: true });
  ["gesturestart", "gesturechange"].forEach(function (ev) { D.addEventListener(ev, function (e) { if (on) e.preventDefault(); }, { passive: false }); });
  var lastTouch = 0;
  D.addEventListener("touchend", function (e) {
    if (!on || !inGame(e.target)) return;
    var n = Date.now(); if (n - lastTouch < 300 && e.cancelable && !(e.target.closest && e.target.closest("button,a,input,select,textarea,label"))) e.preventDefault();
    lastTouch = n;
  }, { passive: false, capture: true });
  D.addEventListener("dblclick", function (e) { if (on && inGame(e.target)) e.preventDefault(); }, { capture: true });

  /* ---------- exits + refits ---------- */
  W.addEventListener("keydown", function (e) {
    if (!on || e.key !== "Escape" || fsEl()) return;
    // Esc closes an open sheet / resumes from Pause first; only a "bare" Esc leaves full screen
    if (D.querySelector(".gm-sheet.on, .a2hs.on") || (W.GamePause && W.GamePause.paused)) return;
    exit(true); W.GameMenu && W.GameMenu.refresh && W.GameMenu.refresh();
  }, true);
  function onFsChange() {
    if (fsEl()) { queueFit(); return; }
    if (on && viaReal) { viaReal = false; exit(true); W.GameMenu && W.GameMenu.refresh && W.GameMenu.refresh(); }   // system exit (Esc, back, swipe)
  }
  D.addEventListener("fullscreenchange", onFsChange); D.addEventListener("webkitfullscreenchange", onFsChange);
  W.addEventListener("resize", function () { if (on) queueFit(); });
  W.addEventListener("orientationchange", function () { if (on) { queueFit(); setTimeout(fit, 350); } });
  if (W.visualViewport) W.visualViewport.addEventListener("resize", function () { if (on) queueFit(); });
  if (W.MutationObserver) new MutationObserver(sync).observe(H, { attributes: true, attributeFilter: ["class"] });

  function attach(c) { if (c) { for (var k in c) cfg[k] = c[k]; } if (c && c.box) box = null; findBox(); sync(); return W.GameFS; }
  function init() {
    findBox(); sync();
    // pages that render their game later (demo/try): find the box once it exists
    if (!cfg.page && !box && W.MutationObserver) { var mo = new MutationObserver(function () { if (findBox()) { mo.disconnect(); sync(); } }); mo.observe(D.body, { childList: true, subtree: true }); }
  }
  if (D.readyState === "loading") D.addEventListener("DOMContentLoaded", init); else init();

  W.GameFS = {
    attach: attach, enter: enter, exit: exit, toggle: toggle, fit: fit,
    playing: function (v) { play = !!v; sync(); },
    get active() { return on; }, get pref() { return getPref(); }, get real() { return !!fsEl(); },
    supportsReal: supportsReal, iPhone: iPhone, iOS: iOS, standalone: standalone
  };
})();
