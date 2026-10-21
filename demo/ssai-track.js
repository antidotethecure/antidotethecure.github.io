/* ssai-track.js — anonymous usage counts for SousShift Command (Antidote's HQ back office), 2026-10-13.
   Counts only: QR scans, app opens, unique devices, sign-ups/logins, game plays, rewards, orders (+ cart total),
   calls, directions, shares. No names, phones, emails or form contents ever leave the phone; the device id is a
   random string kept in this browser and hashed per day on the server.
   Include once per client app:  <script src="../ssai-track.js?v=t1" defer></script>
   Apps can also report exact events:  window.ssaiTrack("order", 24.50)  ·  ssaiTrack("play")  ·  ssaiTrack("redeem") */
(function () {
  "use strict";
  var API = "https://vault-production-89c0.up.railway.app/e";
  var m = location.pathname.match(/\/demo\/([a-z0-9-]+)\//) || location.pathname.match(/^\/([a-z0-9-]+)\/demo\//);
  var biz = (document.currentScript && document.currentScript.dataset.biz) || (m && m[1]);
  if (!biz || /^(start|kit|everything|growth)$/.test(biz)) return;
  var dev = "";
  try { dev = localStorage.getItem("ssai.d") || ""; if (!dev) { dev = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem("ssai.d", dev); } } catch (e) {}
  function send(t, v) {
    var body = JSON.stringify({ b: biz, t: t, v: v || 0, d: dev });
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(API, new Blob([body], { type: "text/plain" }))) return;
    } catch (e) {}
    try { fetch(API, { method: "POST", body: body, keepalive: true, mode: "no-cors", headers: { "Content-Type": "text/plain" } }); } catch (e) {}
  }
  var once = {};
  window.ssaiTrack = function (t, v) { send(t, v); once[t] = 1; };
  // open (once per tab session) + scan (QR links carry ?s=table|sticker|poster…)
  var q = new URLSearchParams(location.search);
  try {
    if (!sessionStorage.getItem("ssai.o")) {
      sessionStorage.setItem("ssai.o", "1");
      send("open");
      if (q.get("s") || q.get("qr") || q.get("src") === "qr") send("scan");
    }
  } catch (e) { send("open"); }
  // light auto-detection from taps, so the existing apps report without being rewritten
  var RULES = [
    ["order", /\b(place order|send order|checkout|order now|send to (the )?kitchen|confirm order)\b/i],
    ["redeem", /\b(redeem|claim( reward)?|use reward)\b/i],
    ["play", /\b(play( now| again)?|start game|tap to start|let'?s play)\b/i],
    ["share", /\b(share|invite)\b/i]
  ];
  var lastPlay = 0;
  document.addEventListener("click", function (e) {
    var el = e.target && e.target.closest && e.target.closest("a,button,[role=button]");
    if (!el) return;
    var href = el.getAttribute("href") || "";
    if (/^tel:/.test(href)) return send("call");
    if (/maps\.(google|apple)|google\.com\/maps|maps\.app\.goo/.test(href)) return send("directions");
    var txt = (el.innerText || el.getAttribute("aria-label") || "").trim().slice(0, 60);
    for (var i = 0; i < RULES.length; i++) {
      if (RULES[i][1].test(txt)) {
        if (RULES[i][0] === "play") { if (Date.now() - lastPlay < 20000) return; lastPlay = Date.now(); }
        var v = 0;
        if (RULES[i][0] === "order") {               // cart total, if the page shows one near the button
          var box = el.closest("form,section,div") || document.body;
          var mt = (box.innerText || "").match(/total[^$\d]{0,12}\$?\s?(\d{1,4}(?:\.\d{2})?)/i);
          v = mt ? parseFloat(mt[1]) : 0;
        }
        return send(RULES[i][0], v);
      }
    }
  }, true);
  // sign-up / login: any form submit with an email, phone or password field (contents never read)
  document.addEventListener("submit", function (e) {
    var f = e.target; if (!f || !f.querySelector) return;
    if (f.querySelector("input[type=password]")) return send("login");
    if (f.querySelector("input[type=email],input[type=tel],input[name*=phone],input[name*=email]")) send("signup");
  }, true);
})();
