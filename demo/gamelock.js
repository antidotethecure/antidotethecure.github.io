/* Second Shift AI — game touch lock. Include once on any page with a game: <script src="../gamelock.js"></script>
   A finger that lands on a game canvas belongs to the game: no page scroll, no rubber-band bounce,
   no pull-to-refresh, no pinch/double-tap zoom, no long-press magnifier or text selection.
   iPhone Safari doesn't always honor CSS touch-action alone (and fires pointercancel when it decides to
   scroll, which drops the game's drag), so this also cancels the touch itself. Scrolling anywhere
   off the game is untouched. Game canvases are matched by id: #game, #cv, or [data-game]. */
(function () {
  "use strict";
  var SEL = "canvas#game, canvas#cv, canvas[data-game]";
  var st = document.createElement("style");
  st.textContent = SEL.split(",").map(function (s) { return s.trim(); }).join(",") +
    "{touch-action:none!important;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;overscroll-behavior:none}" +
    "#s-play{overflow:hidden!important;overscroll-behavior:none}";
  document.head.appendChild(st);
  function onGame(e) { var t = e.target; return t && t.closest && t.closest(SEL); }
  function block(e) { if (onGame(e) && e.cancelable) e.preventDefault(); }
  // non-passive so preventDefault actually stops the browser's scroll/zoom; pointer events still reach the game
  ["touchstart", "touchmove"].forEach(function (ev) { document.addEventListener(ev, block, { passive: false, capture: true }); });
  ["gesturestart", "gesturechange", "contextmenu", "selectstart", "dragstart"].forEach(function (ev) { document.addEventListener(ev, block, { capture: true }); });
})();
