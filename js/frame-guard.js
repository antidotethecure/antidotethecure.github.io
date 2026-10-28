/* frame-guard.js: clickjacking guard for every page (2026-10-28 security sweep).
   GitHub Pages can't send X-Frame-Options / CSP frame-ancestors headers, so this script does it in the browser:
   if a page is framed by a site that isn't ours, it hides itself and tries to break out to the top window.
   Our own pages (same origin), antidotethefoodie.com, githack previews and localhost may still frame it.
   Load it first thing in <head>, synchronously (no defer/async). It does nothing per frame and costs ~0 ms. */
(function () {
  "use strict";
  if (window.top === window.self) return;
  var ok = false;
  try { ok = window.top.location.origin === location.origin; } catch (e) { ok = false; }   // cross-origin top throws
  var A = location.ancestorOrigins;   // Chrome / Safari; Firefox lacks it, so a framed page there only passes same-origin
  if (!ok && A && A.length) {
    ok = true;
    for (var i = 0; i < A.length; i++)
      if (!/^https:\/\/(antidotethecure\.github\.io|(www\.)?antidotethefoodie\.com|raw\.githack\.com|rawcdn\.githack\.com)$|^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(A[i])) ok = false;
  }
  if (ok) return;
  document.documentElement.style.display = "none";
  try { window.top.location = location.href; } catch (e) {}
})();
