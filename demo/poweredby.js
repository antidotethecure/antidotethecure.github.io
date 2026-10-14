/* Shared "Powered by SousShift AI" credit footer for every app built for a business.
   One tag per page:  <script src="<rel>/demo/poweredby.js?v=20261013a" defer></script>
   Optional: data-into="#selector" on the tag to place the footer inside a scroll container
   instead of <body>.
   - Credit line only: no prices, no pitch.
   - Uses the host page's own colors (inherits text color, or its --muted/--dim/... variable);
     never SousShift's own blue/yellow.
   - Idempotent: runs once per page. An older "Powered by SousShift AI" line is replaced unless it
     already carries both the Instagram and the email contact.
   - Keeps clear of fixed/sticky bottom bars by reserving their height under the footer. */
(function () {
  "use strict";
  var IG = "https://instagram.com/second.shiftai";
  var MAIL = "mailto:secondshiftai@gmail.com?subject=" + encodeURIComponent("App for my business");
  var ID = "ssai-pw";
  var me = document.currentScript;

  function hasBoth(el) {
    var h = el.innerHTML || "";
    return /second\.shiftai/i.test(h) && /secondshiftai@gmail\.com/i.test(h);
  }

  /* Find older credit lines: the smallest block that holds "Powered by SousShift AI". */
  function oldLines() {
    var out = [], w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null), n;
    while ((n = w.nextNode())) {
      if (!/powered by\s+sousshift/i.test(n.nodeValue)) continue;
      var el = n.parentNode;
      if (!el || el.closest("#" + ID) || el.closest("script,style,noscript,template,svg")) continue;
      while (el.parentNode && el.parentNode !== document.body &&
             (el.parentNode.textContent || "").replace(/\s+/g, " ").trim().length < 90) el = el.parentNode;
      if ((el.textContent || "").replace(/\s+/g, " ").trim().length > 140) continue; /* prose that mentions it */
      if (out.indexOf(el) < 0) out.push(el);
    }
    return out;
  }

  function muted() {
    var cs = getComputedStyle(document.documentElement), v = ["--muted", "--mute", "--dim", "--sub", "--mut", "--ink-2", "--ink2", "--text-2", "--soft"];
    for (var i = 0; i < v.length; i++) { var c = cs.getPropertyValue(v[i]).trim(); if (c && !/^\d/.test(c)) return c; }
    return "";
  }

  var CSS =
    "#" + ID + "{position:relative;z-index:38;display:block;clear:both;box-sizing:border-box;width:100%;max-width:100%;" +
    "margin:28px 0 0;padding:14px 16px calc(14px + env(safe-area-inset-bottom));text-align:center;" +
    "font-family:inherit;font-size:12px;font-weight:500;line-height:1.5;letter-spacing:.01em;opacity:.78;background:transparent}" +
    "#" + ID + " .pw{display:block;margin:0 0 6px;font-weight:600}" +
    "#" + ID + " .ct{display:flex;flex-wrap:wrap;justify-content:center;gap:4px 14px}" +
    "#" + ID + " a{display:inline-flex;align-items:center;gap:5px;min-height:28px;padding:2px 2px;color:inherit!important;" +
    "text-decoration:none;border:0;background:none;box-shadow:none;font:inherit;white-space:nowrap}" +
    "#" + ID + " a:hover,#" + ID + " a:focus-visible{text-decoration:underline;text-underline-offset:2px}" +
    "#" + ID + " svg{width:14px;height:14px;flex:0 0 14px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}" +
    "@media print{#" + ID + "{opacity:1;padding-bottom:6px}}";

  var ICON_IG = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="currentColor"/></svg>';
  var ICON_MAIL = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/></svg>';

  function build() {
    if (document.getElementById(ID)) return;
    var keep = null, old = oldLines();
    for (var i = 0; i < old.length; i++) {
      if (!keep && hasBoth(old[i])) { keep = old[i]; continue; }
      old[i].parentNode && old[i].parentNode.removeChild(old[i]);
    }
    if (keep) { keep.id = keep.id || ID; return; }

    var st = document.createElement("style"); st.id = ID + "-css"; st.textContent = CSS; document.head.appendChild(st);
    var f = document.createElement("footer");
    f.id = ID; f.setAttribute("role", "contentinfo"); f.setAttribute("translate", "no");
    var c = muted(); if (c) f.style.color = c;
    f.innerHTML = '<span class="pw">Powered by SousShift AI</span><span class="ct">' +
      '<a href="' + IG + '" target="_blank" rel="noopener">' + ICON_IG + '<span>@second.shiftai</span></a>' +
      '<a href="' + MAIL + '">' + ICON_MAIL + '<span>secondshiftai@gmail.com</span></a></span>';
    var host = null, sel = me && me.getAttribute("data-into");
    if (sel) { try { host = document.querySelector(sel); } catch (e) {} }
    (host || document.body).appendChild(f);
    watch(f);
  }

  /* Reserve room under the footer for anything fixed/sticky sitting on the bottom of the screen
     (order pills, tab bars, the seasonal toggle). Full-screen overlays (games, sheets) are ignored. */
  function watch(f) {
    var base = 14, last = -1, t = 0;
    function fixedAncestor(el) {
      for (; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
        if (el === f || f.contains(el)) return null;
        var p = getComputedStyle(el).position;
        if (p === "fixed" || p === "sticky") return el;
      }
      return null;
    }
    function measure() {
      t = 0;
      var vh = window.innerHeight, vw = window.innerWidth, need = 0, seen = [];
      if (!document.elementsFromPoint) return;
      for (var y = vh - 2; y > vh - 170; y -= 24) {
        for (var x = 0.08; x < 1; x += 0.28) {
          var els = document.elementsFromPoint(vw * x, y);
          for (var i = 0; i < els.length; i++) {
            var a = fixedAncestor(els[i]);
            if (!a || seen.indexOf(a) >= 0) continue;
            seen.push(a);
            var r = a.getBoundingClientRect();
            if (r.height > vh * 0.5 || r.bottom < vh - 170 || r.height < 1) continue;
            if (getComputedStyle(a).position === "sticky" && r.bottom < vh - 1) continue;
            need = Math.max(need, Math.ceil(vh - r.top + 8));
          }
        }
      }
      need = Math.min(need, 220);
      if (need !== last) {
        last = need;
        f.style.paddingBottom = need ? "calc(" + (need + base) + "px + env(safe-area-inset-bottom))" : "";
      }
    }
    function soon() { if (!t) t = setTimeout(measure, 250); }
    window.addEventListener("scroll", soon, { passive: true, capture: true });
    window.addEventListener("resize", soon);
    setTimeout(measure, 300); setTimeout(measure, 1500);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();
