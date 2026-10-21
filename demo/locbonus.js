/* SousShift AI · NEARBY ALERTS + "LOCATION BUDDY" BONUS (Melody first, 2026-10-12; any restaurant can turn it on by adding
   window.SSAI_REWARDS.locationBonus). Include after crm.js / interim.js:  <script src="../locbonus.js?v=lb1"></script>

   WHAT A WEB APP CAN AND CAN'T DO (honest limits, so nobody promises more):
   - A website / Home Screen web app can only read location WHILE IT IS OPEN. No background tracking, no geofences
     (especially on iPhone). So "You're nearby" is an in-app banner shown when the guest opens the app near the restaurant.
   - Notifications: Web Push works on Android/desktop browsers and on iPhone only for Home Screen apps (iOS 16.4+).
     A real "you just walked past Melody" push is NOT possible from a web app (it would need background location).
     The alternative is SCHEDULED pushes (lunch / happy hour), which need a push server + service worker. There is no
     push server yet, so that part is a stub (cfg.push.schedule below); this file only asks for the permission.

   THE BONUS (one time, default 100 pts, amount + on/off editable in Christian HQ › Discounts › "Location bonus"):
   eligible once location permission (Permissions API "granted") AND notifications ("granted") have been confirmed on app
   opens on at least cfg.minDays different days spanning at least cfg.spanDays days. Then it is credited ONCE through the
   normal points path (SSAI_CRM.add, ledger tag "loc_bonus", member.locBuddy = when) and never again, even if they turn location off and on.
   With a backend (SSAI_REWARDS.interim.api) the SERVER records each qualifying day with its own clock and decides
   eligibility + the single credit (Code.gs "LOCATION BUDDY"), so editing localStorage or the phone clock can't fake it.
   Without a backend (today) it is tracked on this phone only (noted in the card).
   Test hook for headless tests only: window.SSAI_LB_FAKE(body) → Promise (never set live). */
(function () {
  "use strict";
  var R = window.SSAI_REWARDS || {}, C = R.locationBonus, CRM = window.SSAI_CRM;
  if (!C || !CRM) return;
  var API = (R.interim && R.interim.api) || "", FAKE = window.SSAI_LB_FAKE, SERVER = !!(API || FAKE);
  var e = CRM.esc, NAME = CRM.name, KEY = "ssai_lb_" + CRM.slug, DEVK = CRM.key + "_dev", CONSENT_V = "2026-10-12";
  var MIN_DAYS = C.minDays || 3, SPAN = C.spanDays || 7, RAD = C.radiusMi || 0.5;
  var P = { geo: "unknown", push: "unknown" }, NEAR = null, SRV = null, el = null;

  function load() { try { var s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s && typeof s === "object") { s.days = Array.isArray(s.days) ? s.days : []; return s; } } catch (x) {} return { days: [] }; }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (x) {} }
  var S = load();
  function dev() { try { return localStorage.getItem(DEVK) || ""; } catch (x) { return ""; } }
  function laDay(t) { return new Date(t || Date.now()).toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" }); }
  function dnum(ymd) { var p = String(ymd).split("-"); return Math.round(Date.UTC(+p[0], +p[1] - 1, +p[2]) / 864e5); }
  function prog(days) { var d = days.slice().sort(), n = d.length, span = n ? dnum(d[n - 1]) - dnum(d[0]) : 0;
    return { n: n, span: span, ok: n >= MIN_DAYS && span >= SPAN, left: Math.max(0, MIN_DAYS - n), spanLeft: Math.max(0, SPAN - span) }; }
  function miles(a, b, c, d) { var r = Math.PI / 180, x = Math.sin((c - a) * r / 2), y = Math.sin((d - b) * r / 2), h = x * x + Math.cos(a * r) * Math.cos(c * r) * y * y; return 7917.5 * Math.asin(Math.min(1, Math.sqrt(h))); }
  function member() { return CRM.member(); }
  function pushState() { return typeof Notification === "undefined" ? "unsupported" : Notification.permission === "default" ? "prompt" : Notification.permission; }
  function geoState() {
    if (!navigator.permissions || !navigator.permissions.query) return Promise.resolve(navigator.geolocation ? "unknown" : "unsupported");
    return navigator.permissions.query({ name: "geolocation" }).then(function (s) { return s.state; }, function () { return "unknown"; });
  }
  // notifications: Permissions API first (same source as location), Notification.permission as the fallback
  function notifState() {
    var fb = pushState(); if (fb === "unsupported" || !navigator.permissions || !navigator.permissions.query) return Promise.resolve(fb);
    return navigator.permissions.query({ name: "notifications" }).then(function (s) { return s.state; }, function () { return fb; });
  }
  function readPerms() { return Promise.all([geoState(), notifState()]).then(function (a) { P = { geo: a[0], push: a[1] }; return P; }); }
  function iosNoPush() { return /iP(hone|ad|od)/.test(navigator.userAgent) && typeof Notification === "undefined"; }

  function call(body) {
    body.slug = CRM.slug; var m = member(); body.member = m ? m.id : ""; body.dev = dev();
    if (FAKE) return FAKE(body);
    if (body.type === "status") return fetch(API + (API.indexOf("?") < 0 ? "?" : "&") + "loc=1&slug=" + encodeURIComponent(body.slug) + "&member=" + encodeURIComponent(body.member) +
      "&dev=" + encodeURIComponent(body.dev) + "&geo=" + encodeURIComponent(body.geo || "") + "&push=" + encodeURIComponent(body.push || "") + "&t=" + Date.now())
      .then(function (r) { return r.json(); }).catch(function () { return null; });
    return fetch(API, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(body) }).then(function (r) { return r.json(); }).catch(function () { return null; });
  }

  // ---- the one-time credit, through the normal points path ----
  function credit(pts) {
    var m = member(); if (!m || !pts) return 0;
    if (m.locBuddy || S.done) { S.done = S.done || m.locBuddy; save(S); return 0; }   // m.locBuddy = the member's permanent "already earned" mark
    CRM.add(m, pts, "📍 Location buddy bonus (one time)", "loc_bonus");
    m.locBuddy = Date.now(); CRM.save(m);
    S.done = Date.now(); S.pts = pts; save(S);
    CRM.toast("📍 +" + pts + " points · Location buddy bonus!");
    return pts;
  }
  function tryLocal() {
    if (SERVER || !C.on || S.done || !S.optin) return;
    if (prog(S.days).ok && member()) credit(C.pts);
  }
  function tryServer(qualifies) {
    if (!SERVER || !S.optin) return Promise.resolve();
    return call({ type: "status", geo: P.geo, push: P.push, ok: qualifies ? 1 : 0 }).then(function (r) {
      if (!r || !r.ok) return; SRV = r;
      if (r.credited) { if (!S.done) { S.done = Date.now(); save(S); } return; }   // credited before (maybe on another install): never again
      if (r.on && r.eligible && member() && !S.done) return call({ type: "loc_claim" }).then(function (c) { if (c && c.ok && c.pts) { credit(c.pts); SRV.credited = 1; } });
    }).then(draw, draw);
  }

  // ---- runs on every app open ----
  function onOpen() {
    readPerms().then(function () {
      var qualifies = !!S.optin && P.geo === "granted" && P.push === "granted";
      if (qualifies) { var d = laDay(); if (S.days.indexOf(d) < 0) { S.days.push(d); S.days = S.days.sort().slice(-90); save(S); } }
      if (S.optin && P.geo === "granted") checkNearby();
      try { tryLocal(); } catch (x) {} draw(); tryServer(qualifies);
    });
  }
  function checkNearby() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(function (pos) {
      var mi = miles(pos.coords.latitude, pos.coords.longitude, C.lat, C.lng); NEAR = mi;
      if (mi <= RAD) banner(mi);
    }, function () {}, { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 });
  }
  function banner(mi) {
    var k = KEY + "_banner"; try { if (sessionStorage.getItem(k) === laDay()) return; } catch (x) {}
    if (document.getElementById("lb-near")) return;
    var b = document.createElement("div"); b.id = "lb-near"; b.className = "lb-near"; b.setAttribute("role", "status");
    b.innerHTML = '<span class="lb-pin">' + e(C.pin || "📍") + '</span><div><b>You\'re nearby!</b> ' + e(NAME) + ' is ' + (mi < 0.1 ? "right here" : mi.toFixed(1) + " mi away") + '.<small>' + e(C.nearbyDeal || "") + '</small></div>' +
      '<button type="button" aria-label="Close" class="lb-x">✕</button>';
    b.querySelector(".lb-x").onclick = function () { b.remove(); try { sessionStorage.setItem(k, laDay()); } catch (x) {} };
    document.body.appendChild(b);
  }

  // ---- opt-in / opt-out ----
  function optIn() {
    S.optin = { ts: Date.now(), v: CONSENT_V }; save(S);
    var waits = [];
    if (navigator.geolocation) waits.push(new Promise(function (res) { navigator.geolocation.getCurrentPosition(function () { res(); }, function () { res(); }, { timeout: 15000, maximumAge: 300000 }); }));
    if (typeof Notification !== "undefined" && Notification.permission === "default") { try { var q = Notification.requestPermission(); if (q && q.then) waits.push(q.catch(function () {})); } catch (x) {} }
    Promise.all(waits).then(function () { onOpen(); });
  }
  function optOut() { delete S.optin; save(S); var b = document.getElementById("lb-near"); if (b) b.remove(); draw(); }

  // ---- card ----
  var css = document.createElement("style");
  css.textContent = ".lb-card{all:initial;display:block;box-sizing:border-box;max-width:640px;margin:16px auto;padding:16px;border-radius:20px;font:500 14.5px/1.45 system-ui,-apple-system,sans-serif;color:#f6f1e4;background:#141e34;border:1px solid #27324d}" +
    ".lb-card h3{margin:2px 0 6px;font:900 19px/1.2 system-ui;color:#f0d375}.lb-card .k{font:900 11px system-ui;letter-spacing:.14em;text-transform:uppercase;color:#9aa3b5}" +
    ".lb-card p{margin:6px 0}.lb-card small,.lb-card .fine{display:block;font-size:12.5px;color:#b9c0cf;margin-top:6px}.lb-card ul{margin:6px 0;padding-left:20px}.lb-card li{margin:3px 0}" +
    ".lb-card details{margin-top:8px}.lb-card summary{cursor:pointer;font-weight:800;color:#f0d375}" +
    ".lb-go{display:block;width:100%;margin-top:10px;padding:13px;border:0;border-radius:14px;background:#f0d375;color:#1a1206;font:900 16px system-ui;cursor:pointer}" +
    ".lb-off{background:none;border:0;color:#9aa3b5;text-decoration:underline;font:600 13px system-ui;cursor:pointer;margin-top:8px;padding:4px 0}" +
    ".lb-bar{height:10px;border-radius:99px;background:#0b1220;overflow:hidden;margin:8px 0 2px}.lb-bar i{display:block;height:100%;background:linear-gradient(90deg,#d4af37,#f0d375)}" +
    ".lb-st{display:inline-block;margin:2px 6px 2px 0;padding:2px 10px;border-radius:99px;font:800 12px system-ui}.lb-st.on{background:#3fbf8f33;color:#7fe0b8}.lb-st.no{background:#ff6b6b26;color:#ffb0b0}" +
    ".lb-near{position:fixed;left:50%;top:max(10px,env(safe-area-inset-top));transform:translateX(-50%);z-index:99998;width:min(560px,calc(100vw - 32px));display:flex;gap:10px;align-items:flex-start;" +
    "background:linear-gradient(135deg,#f0d375,#d4af37);color:#1a1206;border-radius:16px;padding:12px 40px 12px 12px;box-shadow:0 12px 34px #000a;font:600 14.5px/1.35 system-ui,-apple-system,sans-serif;animation:lbIn .35s}" +
    ".lb-near small{display:block;font-size:13px;margin-top:2px}.lb-pin{font-size:24px}.lb-x{position:absolute;right:8px;top:8px;border:0;background:#1a120622;border-radius:99px;width:28px;height:28px;cursor:pointer;font:900 14px system-ui;color:#1a1206}" +
    "@keyframes lbIn{from{opacity:0;transform:translate(-50%,-12px)}to{opacity:1;transform:translate(-50%,0)}}";
  document.head.appendChild(css);

  function consentHTML() {
    return '<details><summary>What we collect and why (privacy)</summary><ul>' +
      '<li><b>What:</b> your phone\'s precise location, and whether location and notifications are turned on. California treats precise location as <b>sensitive personal information</b>.</li>' +
      '<li><b>When:</b> only while this app is open on your screen. It can\'t and doesn\'t track you in the background.</li>' +
      '<li><b>Why:</b> to show a "You\'re nearby" deal when you open the app near ' + e(NAME) + ', and to count the days for the one-time bonus. Your exact location stays on your phone; ' +
      (SERVER ? 'we only send whether location and notifications are on, by date.' : 'nothing is sent anywhere.') + '</li>' +
      '<li><b>Never sold or shared</b>, and not used for ads or anything else.</li>' +
      '<li><b>Turn it off any time:</b> tap "Turn off nearby alerts" below, and/or switch off Location and Notifications for this site/app in your phone\'s Settings. Points you already earned stay.</li></ul></details>';
  }
  function draw() {
    if (!el) { el = document.createElement("section"); el.className = "lb-card"; el.id = "lb-card"; el.setAttribute("aria-label", "Nearby alerts"); }
    var host = document.getElementById("lbhost"), j = document.getElementById("crm-join");
    if (host) { if (el.parentNode !== host) host.appendChild(el); } else if (j && j.parentNode && el.parentNode !== j.parentNode) j.parentNode.insertBefore(el, j.nextSibling);
    var pr = prog(S.days), on = !!S.optin, bon = !!C.on, m = member(), h = '<div class="k">' + e(C.pin || "📍") + ' Nearby alerts</div>';
    if (S.done) h += '<h3>Location buddy ✓</h3><p>You earned the one-time <b>+' + (S.pts || C.pts) + ' points</b> bonus. Thanks for keeping nearby alerts on.</p>';
    else h += '<h3>' + (bon ? 'Get +' + C.pts + ' points for keeping nearby alerts on' : 'Know when you\'re near ' + e(NAME)) + '</h3>';
    if (!on) {
      h += '<p>Turn on location and notifications and we\'ll show you a deal when you open the app near ' + e(NAME) + ' (within about ' + RAD + ' mi).' +
        (bon && !S.done ? ' Keep both on and open the app on <b>' + MIN_DAYS + ' different days over at least ' + SPAN + ' days</b> to earn a one-time <b>+' + C.pts + ' points</b>.' : '') + '</p>';
      if (iosNoPush()) h += '<small>📱 iPhone: notifications only work after you add ' + e(NAME) + ' to your Home Screen (Share › Add to Home Screen, iOS 16.4+). Open it from there, then turn this on.</small>';
      h += consentHTML() + '<button type="button" class="lb-go" data-lb="on">📍 Turn on nearby alerts</button>' +
        '<small>By tapping, you agree to the use of your location described above. Your phone will ask for permission.</small>';
    } else {
      h += '<div><span class="lb-st ' + (P.geo === "granted" ? "on" : "no") + '">Location: ' + (P.geo === "granted" ? "on" : P.geo === "denied" ? "blocked" : "off") + '</span>' +
        '<span class="lb-st ' + (P.push === "granted" ? "on" : "no") + '">Notifications: ' + (P.push === "granted" ? "on" : P.push === "denied" ? "blocked" : P.push === "unsupported" ? "not available here" : "off") + '</span></div>';
      if (P.geo !== "granted" || P.push !== "granted") h += '<small>' + (P.geo === "denied" || P.push === "denied" ? 'Blocked in your settings: open your phone\'s Settings for this site/app and allow it.' : iosNoPush() ? 'iPhone: add ' + e(NAME) + ' to your Home Screen (iOS 16.4+) and open it from there to allow notifications.' : '<button type="button" class="lb-off" data-lb="on" style="color:#f0d375">Allow now</button>') + ' Days only count while both are on.</small>';
      if (bon && !S.done) {
        var n = SRV ? SRV.days : pr.n, sp = SRV ? SRV.span : pr.span, pct = Math.min(100, Math.round((Math.min(n, MIN_DAYS) / MIN_DAYS * 50) + (Math.min(sp, SPAN) / SPAN * 50)));
        h += '<div class="lb-bar" aria-hidden="true"><i style="width:' + pct + '%"></i></div><small>' + n + ' of ' + MIN_DAYS + ' days · ' + Math.min(sp, SPAN) + ' of ' + SPAN + ' days since your first day.' +
          (!m ? ' <b>Join ' + e(NAME) + ' Rewards</b> to receive the points.' : '') + '</small>';
      }
      h += '<small>We check your location only when the app is open. Real "you just walked by" alerts aren\'t possible from a web app; ' +
        (C.push && C.push.vapid ? 'we send a few scheduled reminders (lunch, happy hour).' : 'scheduled lunch / happy-hour reminders are coming soon.') + '</small>';
      if (bon && !S.done) h += '<small class="fine">' + (SERVER ? 'Your qualifying days are recorded by ' + e(NAME) + '\'s rewards system.' : 'Tracked on this phone only for now (the rewards system isn\'t connected yet).') + ' One bonus per member, ever; turning alerts off and on again doesn\'t earn it twice.</small>';
      h += consentHTML() + '<button type="button" class="lb-off" data-lb="off">Turn off nearby alerts</button>';
    }
    el.innerHTML = h;
  }
  document.addEventListener("click", function (ev) { var b = ev.target.closest && ev.target.closest("[data-lb]"); if (!b || !el || !el.contains(b)) return; if (b.dataset.lb === "on") optIn(); else optOut(); });

  window.SSAI_LOCBONUS = { redraw: draw, state: function () { return { S: S, P: P, near: NEAR, srv: SRV, prog: prog(S.days) }; }, open: onOpen };
  onOpen();
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") onOpen(); });
})();
