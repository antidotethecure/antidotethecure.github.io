/* SousShift AI · DIGITAL REWARDS CARD (2026-10-13, standard for every restaurant; first on Melody + Nalu Vida).
   A "💳 My Rewards Card" button on the points card opens a premium, full-screen member card in the restaurant's colors:
     - the guest's name, permanent card ID (assigned by the backend, e.g. MLD-4K7Q2; never changes) and points balance
     - the next reward and the progress bar toward it
     - a QR code of the card ID (a staff phone camera opens the staff app's card lookup; the text ID works too)
     - the rotating one-visit code: the live pass code + countdown while a reward pass is open (demo/interim.js),
       otherwise how to get one, or "next code tomorrow" once today's prize is used (one code per visit, one prize per day)
     - "Add to Home Screen" steps (iPhone / Android) so it opens like a card, and an "open to my card" switch
     - "Add to Apple Wallet / Google Wallet" buttons ONLY when configured (card.wallet.apple / .google, default off;
       setup: command-center/clients/melody-lax/WALLET-SETUP.md)
   Include AFTER crm.js + interim.js. Settings: window.SSAI_REWARDS.card = {prefix, logo, theme:{a,b,c,gold,ink},
   staffUrl, wallet:{apple:false, google:false, appleUrl:"", googleUrl:""}}. Needs window.SSAI_CRM (interim mode).
   ?card=1 or #card opens it straight away. Test hook: SSAI_CARD.open(). */
(function () {
  "use strict";
  var CRM = window.SSAI_CRM, R = window.SSAI_REWARDS || {};
  if (!CRM) return;
  var C = { prefix: "MBR", logo: "img/logo.png", theme: { a: "#0b1220", b: "#1b2a4a", c: "#77242e", gold: "#f0d375", ink: "#f6f1e4" }, staffUrl: "", wallet: { apple: false, google: false, appleUrl: "", googleUrl: "" } };
  var cc = R.card || {}; for (var k in cc) if (k !== "theme" && k !== "wallet") C[k] = cc[k];
  for (k in (cc.theme || {})) C.theme[k] = cc.theme[k]; for (k in (cc.wallet || {})) C.wallet[k] = cc.wallet[k];
  var e = CRM.esc, NAME = CRM.name, T = C.theme, PREF = "ssai_card_launch_" + CRM.slug;
  var STAFF = C.staffUrl || new URL("../../staff/christian/", location.href).href;

  var css = document.createElement("style");
  css.textContent =
    ".lc-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;margin-top:10px;padding:12px;border-radius:14px;cursor:pointer;font:900 15px system-ui,-apple-system,sans-serif;color:" + T.ink + ";border:1px solid " + T.gold + "88;background:linear-gradient(120deg," + T.a + "," + T.b + " 55%," + T.c + ");box-shadow:inset 0 1px 0 #ffffff22}" +
    ".lc-btn small{font-weight:700;opacity:.75;font-family:ui-monospace,Menlo,monospace;letter-spacing:.06em}" +
    ".lc-ov{position:fixed;inset:0;z-index:2147482600;overflow:auto;-webkit-overflow-scrolling:touch;background:radial-gradient(120% 70% at 50% 0%," + T.b + " 0%," + T.a + " 60%,#000 100%);color:" + T.ink + ";font:600 15px/1.45 system-ui,-apple-system,'Segoe UI',sans-serif;padding:calc(14px + env(safe-area-inset-top)) 16px calc(24px + env(safe-area-inset-bottom));box-sizing:border-box}" +
    ".lc-in{max-width:420px;margin:0 auto}.lc-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}.lc-top b{font:900 12px system-ui;letter-spacing:.2em;text-transform:uppercase;color:" + T.gold + "}" +
    ".lc-x{border:0;background:#ffffff1a;color:" + T.ink + ";border-radius:999px;padding:8px 14px;font:800 14px system-ui;cursor:pointer}" +
    /* the card front: credit-card proportions, metallic gradient, guilloche lines, moving sheen */
    ".lc-card{position:relative;aspect-ratio:1.586;border-radius:20px;overflow:hidden;padding:18px 20px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;" +
    "background:linear-gradient(135deg," + T.c + " 0%," + T.b + " 42%," + T.a + " 100%);border:1px solid " + T.gold + "66;box-shadow:0 22px 50px #000a,0 2px 0 #ffffff1a inset,0 0 0 1px #0006}" +
    ".lc-card:before{content:'';position:absolute;inset:0;background:repeating-radial-gradient(circle at 115% -20%,transparent 0 9px," + T.gold + "14 9px 10px),repeating-linear-gradient(115deg,transparent 0 22px,#ffffff06 22px 23px);pointer-events:none}" +
    ".lc-card:after{content:'';position:absolute;inset:-40%;background:linear-gradient(110deg,transparent 42%,#ffffff2e 50%,transparent 58%);animation:lcsheen 5.5s ease-in-out infinite;pointer-events:none}" +
    "@keyframes lcsheen{0%,55%{transform:translateX(-60%)}100%{transform:translateX(60%)}}@media (prefers-reduced-motion:reduce){.lc-card:after{animation:none;display:none}}" +
    ".lc-card>*{position:relative;z-index:1}.lc-r1{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}" +
    ".lc-logo{height:46px;max-width:52%;object-fit:contain;object-position:left;filter:drop-shadow(0 2px 6px #0008)}" +
    ".lc-tag{font:900 10px system-ui;letter-spacing:.22em;text-transform:uppercase;color:" + T.gold + ";text-align:right;line-height:1.5}" +
    ".lc-chip{width:38px;height:28px;border-radius:6px;background:linear-gradient(135deg," + T.gold + ",#fff7d6 45%," + T.gold + " 55%,#9c7a1c);box-shadow:inset 0 0 0 1px #0004;margin-top:6px;display:inline-block}" +
    ".lc-name{font:800 clamp(19px,5.6vw,24px)/1.15 Georgia,'Times New Roman',serif;letter-spacing:.01em;text-shadow:0 2px 8px #0009;margin:0}" +
    ".lc-id{font:800 clamp(15px,4.6vw,19px) ui-monospace,Menlo,monospace;letter-spacing:.2em;color:" + T.gold + ";text-shadow:0 1px 0 #000a}" +
    ".lc-r3{display:flex;justify-content:space-between;align-items:flex-end}.lc-k{font:800 9.5px system-ui;letter-spacing:.2em;text-transform:uppercase;opacity:.75}" +
    ".lc-pts{font:900 clamp(28px,8.4vw,36px)/1 system-ui;letter-spacing:-.01em}.lc-pts small{font-size:13px;font-weight:800;opacity:.8;margin-left:4px}" +
    /* the card back: white panel with QR, visit code, progress */
    ".lc-back{margin-top:14px;background:#fbf8f1;color:#121826;border-radius:20px;padding:16px;box-shadow:0 14px 34px #0008}" +
    ".lc-qrrow{display:grid;grid-template-columns:132px 1fr;gap:14px;align-items:center}.lc-qr{width:132px;height:132px;background:#fff;border-radius:12px;padding:6px;box-sizing:border-box;border:1px solid #e3dccb}.lc-qr svg{width:100%;height:100%;display:block}" +
    ".lc-scan b{display:block;font:900 15px system-ui}.lc-scan span{font-size:13px;color:#4a5265}.lc-scan code{display:inline-block;margin-top:6px;font:900 15px ui-monospace,Menlo,monospace;letter-spacing:.14em;background:#121826;color:" + T.gold + ";padding:4px 9px;border-radius:8px}" +
    ".lc-prog{margin-top:14px;padding-top:12px;border-top:1px dashed #d8d0bd}.lc-prog p{margin:0 0 6px;font-size:14px}.lc-bar{height:10px;border-radius:99px;background:#e9e2d2;overflow:hidden}.lc-bar i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg," + T.c + "," + T.gold + ")}" +
    ".lc-visit{margin-top:14px;border-radius:16px;padding:12px 14px;background:#121826;color:#fff}.lc-visit .lc-k{color:" + T.gold + ";opacity:1}" +
    ".lc-visit .lc-code{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-top:4px}.lc-visit .lc-code b{font:900 26px ui-monospace,Menlo,monospace;letter-spacing:.14em}.lc-visit .lc-code span{font:900 22px ui-monospace,Menlo,monospace;color:#3DDC97}" +
    ".lc-visit p{margin:4px 0 0;font-size:13.5px;color:#d5dbea}.lc-visit button{margin-top:8px;border:0;border-radius:12px;padding:10px 12px;font:900 14px system-ui;background:" + T.gold + ";color:#1a1206;cursor:pointer}" +
    ".lc-wal{display:flex;gap:8px;margin-top:14px}.lc-wal a{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;background:#000;color:#fff;border-radius:12px;padding:11px 8px;font:800 13.5px system-ui;text-decoration:none;border:1px solid #444}" +
    ".lc-home{margin-top:14px;padding:12px 14px;border-radius:16px;border:1px solid " + T.gold + "55;background:#ffffff0d;font-size:14px}.lc-home h4{margin:0 0 6px;font:900 15px system-ui;color:" + T.gold + "}.lc-home ol{margin:4px 0 0;padding-left:20px}.lc-home li{margin:3px 0}" +
    ".lc-home label{display:flex;gap:8px;align-items:center;margin-top:8px;font-size:13.5px}.lc-fine{font-size:12px;opacity:.7;text-align:center;margin-top:12px}";
  document.head.appendChild(css);

  function tiers() { return (CRM.tiers() || []).slice().sort(function (a, b) { return a[0] - b[0]; }); }
  function cardId(m) { return m && m.card ? m.card : ""; }
  function standalone() { return (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true; }
  function ios() { return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); }
  function pref() { try { return localStorage.getItem(PREF) !== "0"; } catch (x) { return true; } }
  function setPref(v) { try { localStorage.setItem(PREF, v ? "1" : "0"); } catch (x) {} }
  function qrData(id) { return STAFF + "?card=" + encodeURIComponent(id) + "&r=" + encodeURIComponent(CRM.slug); }
  function qrPaint(box, id) {
    function paint() { try { var q = window.qrcode(0, "M"); q.addData(qrData(id)); q.make(); box.innerHTML = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); } catch (x) { box.textContent = id; } }
    if (window.qrcode) paint();
    else { var sc = document.createElement("script"); sc.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js"; sc.integrity = "sha384-mZT2gIty7ZDdOGkxfP6joZcYdMW1Jvj9dRlfpTmaJAKKXTqzygtB22k7FLe+KZC1"; sc.crossOrigin = "anonymous"; sc.onload = paint; sc.onerror = function () { box.innerHTML = "<div style='font:900 14px ui-monospace,monospace;text-align:center;padding-top:44px'>" + e(id) + "</div>"; }; document.head.appendChild(sc); }
  }
  function livePass() { var I = window.SSAI_INTERIM, m = CRM.member(); if (!I || !m) return null; var now = Date.now();
    return (I.data().redeems || []).filter(function (r) { return r.member === m.id && r.status === "live" && r.exp > now; })[0] || null; }
  function usedToday() { var I = window.SSAI_INTERIM; return !!((I && I.usedToday && I.usedToday()) || (CRM.prizeUsedToday && CRM.prizeUsedToday())); }
  function mmss(ms) { var s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }

  function visitHTML() {
    var p = livePass();
    if (p) return '<div class="lc-visit"><div class="lc-k">This visit · one-time code</div><div class="lc-code"><b>' + e(p.code) + '</b><span data-lc="cd">' + mmss(p.exp - Date.now()) + '</span></div>' +
      '<p>' + e(p.reward) + '. Show it at the register: it works once and expires when the timer ends.</p><button type="button" data-lc="pass">Open the live pass</button></div>';
    if (usedToday()) return '<div class="lc-visit"><div class="lc-k">This visit · one-time code</div><p style="font-size:15px;color:#fff;margin-top:6px">✅ <b>Today\'s prize is used.</b></p><p>Your next code comes on your next visit: next prize available tomorrow.</p></div>';
    return '<div class="lc-visit"><div class="lc-k">This visit · one-time code</div><p style="font-size:15px;color:#fff;margin-top:6px">No code yet today.</p><p>At the register, tap <b>Use reward</b> on a reward you have points for: a fresh code for this visit shows here for 10 minutes. One code per visit, one prize per day.</p></div>';
  }
  function homeHTML() {
    if (standalone()) return '<div class="lc-home"><h4>📲 On your Home Screen</h4><label><input type="checkbox" data-lc="launch"' + (pref() ? ' checked' : '') + '> Open straight to my card when I tap the app icon</label></div>';
    return '<div class="lc-home"><h4>📲 Keep your card one tap away</h4>' +
      (ios() ? '<ol><li>Tap <b>Share</b> <span aria-hidden="true">⬆️</span> at the bottom of Safari.</li><li>Choose <b>Add to Home Screen</b>, then <b>Add</b>.</li><li>Open ' + e(NAME) + ' from the icon: your card is the first thing you see.</li></ol>'
        : '<ol><li>Tap the browser menu <b>⋮</b>.</li><li>Choose <b>Add to Home screen</b> or <b>Install app</b>.</li><li>Open ' + e(NAME) + ' from the icon: your card is the first thing you see.</li></ol>') +
      '<label><input type="checkbox" data-lc="launch"' + (pref() ? ' checked' : '') + '> Open straight to my card from the Home Screen icon</label></div>';
  }
  function walletHTML(id) {
    var w = C.wallet, a = w.apple && w.appleUrl, g = w.google && w.googleUrl; if (!id || (!a && !g)) return "";
    var q = (w.appleUrl.indexOf("?") < 0 ? "?" : "&") + "slug=" + encodeURIComponent(CRM.slug) + "&card=" + encodeURIComponent(id);
    return '<div class="lc-wal">' + (a ? '<a href="' + e(w.appleUrl + q) + '" data-lc="apple"> Add to Apple Wallet</a>' : '') +
      (g ? '<a href="' + e(w.googleUrl + (w.googleUrl.indexOf("?") < 0 ? "?" : "&") + "slug=" + encodeURIComponent(CRM.slug) + "&card=" + encodeURIComponent(id)) + '" target="_blank" rel="noopener" data-lc="google">Add to Google Wallet</a>' : '') + '</div>';
  }
  function cardHTML(m) {
    var pts = m.stars || 0, T2 = tiers(), nx = T2.filter(function (t) { return t[0] > pts; })[0], ready = T2.filter(function (t) { return t[0] <= pts; }).pop(), id = cardId(m);
    var since = m.joined ? new Date(m.joined).toLocaleDateString([], { month: "short", year: "numeric" }) : "";
    var prog = nx ? '<p><b>' + (nx[0] - pts).toLocaleString() + ' pts</b> to <b>' + e(nx[1]) + '</b></p><div class="lc-bar" role="progressbar" aria-valuemin="0" aria-valuemax="' + nx[0] + '" aria-valuenow="' + pts + '"><i style="width:' + Math.max(3, Math.min(100, pts / nx[0] * 100)) + '%"></i></div>'
      : '<p>🎉 <b>Top reward unlocked.</b></p><div class="lc-bar"><i style="width:100%"></i></div>';
    if (ready) prog += '<p style="margin:8px 0 0;font-size:13px;color:#4a5265">Ready now: <b>' + e(ready[1]) + '</b> (' + ready[0].toLocaleString() + ' pts)</p>';
    return '<div class="lc-in"><div class="lc-top"><b>' + e(NAME) + ' Rewards</b><button type="button" class="lc-x" data-lc="x">Close</button></div>' +
      '<div class="lc-card" role="img" aria-label="' + e(NAME) + ' Rewards card for ' + e(m.name) + ', card ' + e(id || "pending") + ', ' + pts + ' points">' +
        '<div class="lc-r1"><img class="lc-logo" src="' + e(C.logo) + '" alt="" onerror="this.style.visibility=\'hidden\'"><div class="lc-tag">Rewards<br>Member<br><span class="lc-chip"></span></div></div>' +
        '<div><p class="lc-name">' + e(m.name || "Member") + '</p><div class="lc-id" data-lc="id">' + (id ? e(id) : C.prefix + '-·····') + '</div></div>' +
        '<div class="lc-r3"><div><div class="lc-k">Points</div><div class="lc-pts">' + pts.toLocaleString() + '<small>pts</small></div></div><div style="text-align:right"><div class="lc-k">Member since</div><div style="font-weight:800">' + e(since) + '</div></div></div>' +
      '</div>' +
      '<div class="lc-back">' +
        '<div class="lc-qrrow"><div class="lc-qr" data-lc="qr" aria-label="QR code of your card ID"></div><div class="lc-scan"><b>Scan or say your card ID</b><span>Staff can scan this or look up your ID to find your rewards.</span><br>' + (id ? '<code>' + e(id) + '</code>' : '<span style="display:block;margin-top:6px">Your card ID is on its way: it appears as soon as you\'re online.</span>') + '</div></div>' +
        '<div class="lc-prog">' + prog + '</div>' + visitHTML() + walletHTML(id) +
      '</div>' + homeHTML() +
      '<p class="lc-fine">Your card ID never changes. No cash value. One code per visit, one prize per day.</p></div>';
  }
  var ov = null, tmr = 0;
  function open() {
    var m = CRM.member(); if (!m) { if (CRM.join) CRM.join(function () { setTimeout(open, 300); }); return; }
    if (!cardId(m) && CRM.sync) CRM.sync();   // backfill: the next sync brings the card ID
    close(); ov = document.createElement("div"); ov.className = "lc-ov"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-label", "My Rewards Card"); ov.setAttribute("data-scroll-ok", "");
    document.body.appendChild(ov); draw();
    ov.addEventListener("click", function (ev) { var b = ev.target.closest("[data-lc]"); if (!b) return; var a = b.getAttribute("data-lc");
      if (a === "x") close(); else if (a === "pass") { var p = livePass(); if (p && window.SSAI_INTERIM) SSAI_INTERIM.openPass(p.code); } });
    ov.addEventListener("change", function (ev) { if (ev.target.getAttribute("data-lc") === "launch") setPref(ev.target.checked); });
    tmr = setInterval(function () { var p = livePass(), cd = ov && ov.querySelector("[data-lc=cd]"); if (cd && p) cd.textContent = mmss(p.exp - Date.now()); else if (cd && !p) draw(); }, 500);
  }
  function draw() { if (!ov) return; var m = CRM.member(); if (!m) { close(); return; } var y = ov.scrollTop; ov.innerHTML = cardHTML(m); ov.scrollTop = y; var id = cardId(m); if (id) qrPaint(ov.querySelector("[data-lc=qr]"), id); else ov.querySelector("[data-lc=qr]").innerHTML = '<div style="font:800 12px system-ui;color:#8a8f9c;text-align:center;padding-top:48px">QR appears<br>with your ID</div>'; }
  function close() { clearInterval(tmr); if (ov) ov.remove(); ov = null; }
  function buttonHTML(m) { var id = cardId(m); return '<button type="button" class="lc-btn" onclick="SSAI_CARD.open()">💳 My Rewards Card' + (id ? ' <small>' + e(id) + '</small>' : '') + '</button>'; }
  window.SSAI_CARD = { open: open, close: close, refresh: draw, buttonHTML: buttonHTML, cfg: C };
  CRM.redraw();
  if (/[?&]card=1(&|$)/.test(location.search) || location.hash === "#card" || (standalone() && pref() && CRM.member())) setTimeout(open, 50);
})();
