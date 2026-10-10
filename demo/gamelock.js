/* Second Shift AI — game screen lock. Include once on any page with a game: <script src="../gamelock.js"></script>
   1) A finger on a game canvas never scrolls, bounces or zooms the page (always on).
   2) The first touch anywhere in a game area LOCKS THE WHOLE SCREEN: nothing on the page scrolls, bounces,
      zooms or pull-to-refreshes, so grabbing the phone or missing a button never slides it around.
      A pill shows "Screen locked · Unlock". Tapping it frees the page (free mode) and the pill becomes
      "Lock screen", which locks it again. Free mode stays until they lock again.
   Game areas: canvas#game, canvas#cv, canvas[data-game], [data-game], .gamebox.
   While locked, scrollable panels/modals (or anything with [data-scroll-ok]) still scroll inside themselves.
   Also loads gamepause.js (Pause button for every game).
   Touch only: a mouse never locks the page. Pill position: window.GAMELOCK_POS = "top-left" | "top-right" |
   "bottom-left" | "bottom-right" (default "bottom-left"), set before this script. */
(function () {
  "use strict";
  if (window.__ssaiGameLock) return;
  window.__ssaiGameLock = 1;
  // Every game also gets a Pause button (gamepause.js, served next to this file).
  var me = document.currentScript;
  if (me && me.src && !window.__ssaiGamePause) {
    var gp = document.createElement("script");
    gp.src = me.src.replace(/gamelock\.js(\?.*)?$/, "gamepause.js");
    document.head.appendChild(gp);
  }
  var CANVAS = "canvas#game, canvas#cv, canvas[data-game]";
  var AREA = CANVAS + ", [data-game], .gamebox";
  var POS = (window.GAMELOCK_POS || "bottom-left").split("-");

  var st = document.createElement("style");
  st.textContent =
    CANVAS + "{touch-action:none!important;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;overscroll-behavior:none}" +
    "#s-play{overflow:hidden!important;overscroll-behavior:none}" +
    "html.ssai-locked,html.ssai-locked body{overscroll-behavior:none}" +
    ":where(html.ssai-locked) :where(body *){touch-action:manipulation}" +
    ".ssai-lockpill{position:fixed;" + (POS[0] === "top" ? "top:calc(10px + env(safe-area-inset-top))" : "bottom:calc(12px + env(safe-area-inset-bottom))") + ";" +
    (POS[1] === "right" ? "right:calc(10px + env(safe-area-inset-right))" : "left:calc(10px + env(safe-area-inset-left))") + ";" +
    "z-index:2147483000;display:none;align-items:center;gap:6px;padding:9px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.22);" +
    "background:rgba(14,17,30,.86);color:#fff;font:600 13px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;letter-spacing:.2px;" +
    "box-shadow:0 6px 20px rgba(0,0,0,.35);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation}" +
    ".ssai-lockpill.on{display:inline-flex}.ssai-lockpill.free{background:rgba(255,255,255,.92);color:#14171c;border-color:rgba(0,0,0,.12)}" +
    ".ssai-lockpill b{font-weight:800}";
  document.head.appendChild(st);

  var locked = false, free = false, pill = null;

  function within(t, sel) { return t && t.closest ? t.closest(sel) : null; }
  function onPill(t) { return pill && t && (t === pill || pill.contains(t)); }
  function canScrollInside(t) {
    for (var el = t; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
      if (el.hasAttribute && el.hasAttribute("data-scroll-ok")) return true;
      var s = getComputedStyle(el), o = s.overflowY, ox = s.overflowX;
      if ((o === "auto" || o === "scroll") && el.scrollHeight > el.clientHeight + 1) return true;
      if ((ox === "auto" || ox === "scroll") && el.scrollWidth > el.clientWidth + 1) return true;
    }
    return false;
  }
  function render() {
    if (!pill) {
      pill = document.createElement("button");
      pill.type = "button";
      pill.className = "ssai-lockpill";
      pill.setAttribute("aria-live", "polite");
      pill.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); locked ? unlock() : lock(null, true); });
      document.body.appendChild(pill);
    }
    pill.classList.add("on");
    pill.classList.toggle("free", !locked);
    pill.innerHTML = locked ? "🔒 Screen locked · <b>Unlock</b>" : "🔓 <b>Lock screen</b>";
    pill.setAttribute("aria-label", locked ? "Screen locked. Tap to unlock and scroll the page." : "Tap to lock the screen while you play.");
  }
  function lock(area, manual) {
    if (locked) return;
    locked = true;
    if (manual) free = false;
    // Make sure the whole game is on screen before freezing the page.
    if (area && area.getBoundingClientRect) {
      var r = area.getBoundingClientRect(), vh = window.innerHeight;
      if (r.height <= vh && (r.top < -40 || r.bottom > vh + 40)) window.scrollTo(0, Math.max(0, window.scrollY + r.top - (vh - r.height) / 2));
    }
    document.documentElement.classList.add("ssai-locked");
    render();
  }
  function unlock() {
    if (!locked) return;
    locked = false;
    free = true;
    document.documentElement.classList.remove("ssai-locked");
    render();
  }

  document.addEventListener("touchstart", function (e) {
    if (onPill(e.target)) return;
    var a = within(e.target, AREA);
    if (a && !free) lock(a);
    if (within(e.target, CANVAS) && e.cancelable) e.preventDefault();
  }, { passive: false, capture: true });
  document.addEventListener("touchmove", function (e) {
    if (!e.cancelable || onPill(e.target)) return;
    if (within(e.target, CANVAS)) { e.preventDefault(); return; }
    if (locked && !canScrollInside(e.target)) e.preventDefault();
  }, { passive: false, capture: true });
  ["gesturestart", "gesturechange"].forEach(function (ev) {
    document.addEventListener(ev, function (e) { if (locked || within(e.target, CANVAS)) e.preventDefault(); }, { capture: true });
  });
  ["contextmenu", "selectstart", "dragstart"].forEach(function (ev) {
    document.addEventListener(ev, function (e) { if (within(e.target, CANVAS) || (locked && within(e.target, AREA))) e.preventDefault(); }, { capture: true });
  });
  window.GameLock = { lock: function () { lock(null, true); }, unlock: unlock, get locked() { return locked; } };
})();
