/* SousShift AI — happy hour strip with a live countdown (Antidote, 2026-11-02: "when it's happy hour put on the app
   that it is happy hour and the time left, the ticking timer of when happy hour ends").
   Include once, after the page's own config and before the closing body tag:
     <script>window.SSAI_HAPPY={start:"15:00",end:"18:00",note:"Ask your server for the happy hour menu."};</script>
     <script src="../happyhour.js?v=hh1"></script>

   The strip only exists while happy hour is actually running, and it goes away by itself when the clock runs out.
   Nothing is shown before it starts or after it ends.

   TIME ZONE: the restaurant's clock, not the guest's. A guest on east-coast time at 5pm their time is at 2pm in
   Westchester and happy hour has not started; reading the phone's local hour would tell them it had. Every check
   goes through America/Los_Angeles (override with SSAI_HAPPY.tz for a client in another zone).

   Fields: start/end "HH:MM" 24h (end < start wraps past midnight) · days [0-6], 0 = Sunday, default every day ·
   label (default "Happy hour") · note (one line under the countdown, optional) · tz (default America/Los_Angeles) ·
   mount (CSS selector to put it before; default: the top of the page). */
(function () {
  "use strict";
  var C = window.SSAI_HAPPY; if (!C || !C.start || !C.end) return;
  var TZ = C.tz || "America/Los_Angeles", LABEL = C.label || "Happy hour";
  var DAYS = Array.isArray(C.days) && C.days.length ? C.days : null;

  function mins(hhmm) { var m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || "")); if (!m) return null;
    var h = +m[1], mi = +m[2]; return h >= 0 && h <= 23 && mi >= 0 && mi <= 59 ? h * 60 + mi : null; }
  var S = mins(C.start), E = mins(C.end); if (S == null || E == null || S === E) return;

  // the restaurant's wall clock right now: {day 0-6, minutes since its midnight, seconds into the minute}
  function local() {
    try {
      var p = {}, f = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
      f.formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
      var wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday);
      var h = +p.hour % 24;   // some engines render midnight as 24
      return { d: wd < 0 ? new Date().getDay() : wd, m: h * 60 + (+p.minute), s: +p.second };
    } catch (x) { var d = new Date(); return { d: d.getDay(), m: d.getHours() * 60 + d.getMinutes(), s: d.getSeconds() }; }
  }
  // minutes left, or 0 when happy hour is not running. Wraps when end < start (a window that runs past midnight):
  // on a wrapped window the day is the day it STARTED, so after-midnight minutes belong to yesterday's happy hour.
  function leftMin(t) {
    var wrap = E < S, on = wrap ? (t.m >= S || t.m < E) : (t.m >= S && t.m < E);
    if (!on) return 0;
    if (DAYS) { var day = wrap && t.m < E ? (t.d + 6) % 7 : t.d; if (DAYS.indexOf(day) < 0) return 0; }
    return (wrap && t.m >= S ? E + 1440 : E) - t.m;
  }
  function hhmm12(m) { var h = Math.floor(m / 60) % 24, mi = m % 60, ap = h < 12 ? "AM" : "PM", h12 = h % 12 || 12;
    return h12 + (mi ? ":" + ("0" + mi).slice(-2) : "") + " " + ap; }
  function two(n) { return (n < 10 ? "0" : "") + n; }

  var css = "#ssai-hh{all:initial;display:block;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;box-sizing:border-box;" +
    "padding:9px 96px 9px 14px;background:linear-gradient(90deg,#7a1f2b,#b8343f 55%,#e0a32a);color:#fff;text-align:left;line-height:1.3}" +
    /* the language pill is fixed at top-right (79px wide at right:10px) and sits over anything at the top of the
       page, so the strip keeps its right side clear rather than running the countdown under it */ +
    "#ssai-hh *{box-sizing:border-box;font-family:inherit}" +
    "#ssai-hh .l{font:800 13.5px/1.3 inherit;letter-spacing:.01em}" +
    "#ssai-hh .t{font:900 15px/1.3 ui-monospace,Menlo,monospace;color:#FFE08A;font-variant-numeric:tabular-nums}" +
    "#ssai-hh .n{display:block;font:600 11.5px/1.35 inherit;color:#ffffffcc;margin-top:2px}" +
    "@media(min-width:520px){#ssai-hh{text-align:center;padding-left:96px}#ssai-hh .l{font-size:15px}#ssai-hh .t{font-size:16px}}";
  var el = null, timer = 0;

  function mount() {
    if (el) return el;
    var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    el = document.createElement("div"); el.id = "ssai-hh"; el.setAttribute("role", "status");
    // the seconds change every tick: announcing them would talk over a screen reader, so only the label is read out
    el.setAttribute("aria-live", "off");
    var at = C.mount && document.querySelector(C.mount);
    if (at && at.parentNode) at.parentNode.insertBefore(el, at);
    else document.body.insertBefore(el, document.body.firstChild);
    return el;
  }
  function clear() { if (el && el.parentNode) el.parentNode.removeChild(el); el = null; }

  function tick() {
    var t = local(), left = leftMin(t);
    if (!left) { clear(); return; }
    // whole minutes left counts the current minute too, so take the seconds already gone off it
    var secs = left * 60 - t.s, h = Math.floor(secs / 3600), m = Math.floor(secs % 3600 / 60), s = secs % 60;
    var e = mount();
    e.setAttribute("aria-label", LABEL + " until " + hhmm12(E));
    e.innerHTML = '<span class="l">🍹 ' + esc(LABEL) + ' · ends in </span><span class="t">' +
      (h ? h + ":" + two(m) : m) + ":" + two(s) + '</span>' + (C.note ? '<span class="n">' + esc(C.note) + "</span>" : "");
  }
  function esc(x) { return String(x).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function start() { tick(); if (!timer) timer = setInterval(tick, 1000); }
  // a backgrounded phone throttles the interval, so re-check the clock the moment the guest comes back
  document.addEventListener("visibilitychange", function () { if (!document.hidden) tick(); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();

  window.SSAI_HAPPYHOUR = { on: function () { return leftMin(local()) > 0; }, leftMin: function () { return leftMin(local()); },
    now: local, _leftMin: leftMin, refresh: tick };
})();
