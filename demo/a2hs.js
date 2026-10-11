/* SousShift AI — "Add to Home Screen" for every restaurant app. Include once, near the end of <body>:
     <script src="../a2hs.js"></script>
   Optional, before it: window.A2HS_CFG={name:"Gritz N Wafflez", theme:{bg,card,edge,accent,ink,dim,btnInk}}
   (defaults: GAME_MENU.by / CRM_CFG.name / the page title, and GAME_MENU.theme colors).

   Saved to the Home Screen the app opens full screen like a real app (manifest display:standalone +
   apple-mobile-web-app-capable on each page), which is the only TRUE full screen on iPhone.
     · iPhone / iPad Safari: a card with the 3 steps (Share icon → "Add to Home Screen" → Add) and an animated arrow
       pointing at Safari's Share button (bottom centre on iPhone, top right on iPad).
     · Android / Chrome: captures beforeinstallprompt → "Install app" button that calls prompt(); otherwise the
       ⋮ menu → "Add to Home screen" steps.
     · In-app browsers (Instagram, Facebook, TikTok…) can't install: "Open this in Safari/Chrome first" + Copy link.
     · Never shows once installed (display-mode: standalone / navigator.standalone).
   When it pops up by itself: never on first load. After real engagement only: when their first game ends
   (ReviewEgg.endCard, which every game calls on its end screen), right after they join rewards, or after ~45 s on the page
   (never mid-run). At most once per 7 days, with "Not now". Always reachable: 📲 Add to Home Screen in the game's start
   menu (gamemenu.js), a link in the page footer, and the iPhone full-screen tip (fullscreen.js).
   API: window.A2HS.open(reason) · close() · available() · platform */
(function () {
  "use strict";
  if (window.A2HS) return;
  var W = window, D = document, H = D.documentElement;
  var GM = W.GAME_MENU || {}, CF = W.A2HS_CFG || {};
  var th = CF.theme || GM.theme || {};
  var NAME = CF.name || GM.by || (W.CRM_CFG && W.CRM_CFG.name) || (D.title || "").split(/ [—–-] /)[0] || "this app";
  var LAST = "ssai:a2hs:last", WEEK = 7 * 864e5;
  var ua = navigator.userAgent || "";
  var inApp = /Instagram|FBAN|FBAV|FB_IAB|FBIOS|TikTok|musical_ly|BytedanceWebview|Snapchat|Line\/|LinkedInApp|Twitter/i.test(ua);
  var iPad = /iPad/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var iOS = /iPhone|iPod/.test(ua) || iPad;
  var android = /Android/i.test(ua);
  var appName = /Instagram/i.test(ua) ? "Instagram" : /FBAN|FBAV|FB_IAB|FBIOS/i.test(ua) ? "Facebook" : /TikTok|musical_ly|Bytedance/i.test(ua) ? "TikTok" : "this app";
  var PLATFORM = inApp ? "inapp" : iOS ? "ios" : android ? "android" : "desktop";
  var deferred = null;
  function standalone() { try { return W.matchMedia("(display-mode: standalone)").matches || W.matchMedia("(display-mode: fullscreen)").matches || navigator.standalone === true; } catch (e) { return false; } }
  function available() { return !standalone(); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]; }); }
  function T(s) { return (W.__T || String)(s); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  W.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferred = e; if (sheet && sheet.classList.contains("on")) render(); });
  W.addEventListener("appinstalled", function () { deferred = null; close(); });

  /* ---------- styles (restaurant colors) ---------- */
  var V = "--ah-bg:" + (th.bg || "#0e1120") + ";--ah-bg2:" + (th.bg2 || th.bg || "#1b2140") + ";--ah-card:" + (th.card || "rgba(255,255,255,.08)") +
    ";--ah-edge:" + (th.edge || "rgba(255,255,255,.18)") + ";--ah-acc:" + (th.accent || "#ffb020") + ";--ah-acc2:" + (th.accent2 || th.accent || "#ffd23f") +
    ";--ah-ink:" + (th.ink || "#fff") + ";--ah-dim:" + (th.dim || "rgba(255,255,255,.72)") + ";--ah-btnink:" + (th.btnInk || "#fff") +
    ";--ah-soft:" + (th.soft || "rgba(127,127,127,.14)") + ";--ah-disp:" + (th.display || "inherit") + ";--ah-body:" + (th.body || "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif");
  var st = D.createElement("style");
  st.textContent =
    ".a2hs{" + V + ";position:fixed;inset:0;z-index:2147483006;display:flex;align-items:flex-end;justify-content:center;background:rgba(4,6,14,.55);opacity:0;pointer-events:none;transition:opacity .2s;font-family:var(--ah-body)}" +
    ".a2hs.on{opacity:1;pointer-events:auto}.a2hs *{box-sizing:border-box}" +
    ".a2hs.top{align-items:flex-start;padding-top:calc(14px + env(safe-area-inset-top,0px))}" +
    ".a2hs-card{width:100%;max-width:440px;max-height:88vh;max-height:88dvh;overflow-y:auto;overscroll-behavior:contain;color:var(--ah-ink);border:1px solid var(--ah-edge);" +
    "background:linear-gradient(180deg,var(--ah-bg2),var(--ah-bg));border-radius:22px 22px 0 0;padding:18px 18px calc(18px + env(safe-area-inset-bottom,0px));box-shadow:0 -20px 60px rgba(0,0,0,.45);transform:translateY(24px);transition:transform .25s}" +
    ".a2hs.top .a2hs-card{border-radius:22px;width:calc(100% - 24px);padding-bottom:18px;transform:translateY(-16px)}" +
    ".a2hs.on .a2hs-card{transform:none}" +
    ".a2hs-hd{display:flex;align-items:flex-start;gap:12px}.a2hs-ic{flex:none;width:52px;height:52px;border-radius:13px;object-fit:cover;background:var(--ah-acc);box-shadow:0 4px 12px rgba(0,0,0,.3)}" +
    ".a2hs h3{margin:0;font:900 21px/1.15 var(--ah-disp);letter-spacing:.01em}.a2hs-sub{margin:4px 0 0;color:var(--ah-dim);font-size:14px;line-height:1.35}" +
    ".a2hs-x{margin-left:auto;flex:none;width:44px;height:44px;border-radius:50%;border:1px solid var(--ah-edge);background:var(--ah-card);color:var(--ah-ink);font:700 19px/1 var(--ah-body);cursor:pointer}" +
    ".a2hs ol{list-style:none;margin:14px 0 0;padding:0;display:grid;gap:8px;counter-reset:s}" +
    ".a2hs li{counter-increment:s;display:flex;align-items:center;gap:12px;min-height:56px;padding:8px 12px;border-radius:14px;background:var(--ah-card);border:1px solid var(--ah-edge);font-size:15px;line-height:1.3}" +
    ".a2hs li:before{content:counter(s);flex:none;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:900 14px/1 var(--ah-body);background:var(--ah-acc);color:var(--ah-btnink)}" +
    ".a2hs li .gl{flex:none;width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:#fff;color:#0a84ff;font:800 20px/1 var(--ah-body)}" +
    ".a2hs li .gl svg{width:24px;height:24px}.a2hs li b{font-weight:800}" +
    ".a2hs-row{display:flex;gap:8px;margin-top:14px}.a2hs-row button{flex:1;min-height:50px;border-radius:999px;font:800 15px/1 var(--ah-body);cursor:pointer;touch-action:manipulation}" +
    ".a2hs-go{border:0;color:var(--ah-btnink);background:linear-gradient(180deg,var(--ah-acc2),var(--ah-acc));box-shadow:0 5px 0 color-mix(in srgb,var(--ah-acc) 55%,#000)}" +
    ".a2hs-no{border:1px solid var(--ah-edge);background:var(--ah-card);color:var(--ah-ink)}" +
    ".a2hs-note{margin:10px 2px 0;color:var(--ah-dim);font-size:12.5px;line-height:1.35}" +
    ".a2hs-url{margin-top:10px;padding:10px 12px;border-radius:12px;background:var(--ah-soft);font:600 12.5px/1.3 ui-monospace,Menlo,monospace;word-break:break-all;color:var(--ah-ink)}" +
    // the arrow that points at Safari's Share button
    ".a2hs-arrow{position:fixed;z-index:2147483007;left:50%;bottom:calc(6px + env(safe-area-inset-bottom,0px));margin-left:-22px;width:44px;height:58px;pointer-events:none;display:none;color:var(--ah-acc2);filter:drop-shadow(0 3px 8px rgba(0,0,0,.6));animation:a2hsBob 1.1s ease-in-out infinite}" +
    ".a2hs.on .a2hs-arrow{display:block}.a2hs-arrow.up{bottom:auto;top:calc(4px + env(safe-area-inset-top,0px));left:auto;right:70px;margin:0;transform:rotate(180deg);animation-name:a2hsBobUp}" +
    "@keyframes a2hsBob{0%,100%{translate:0 0}50%{translate:0 10px}}@keyframes a2hsBobUp{0%,100%{translate:0 0}50%{translate:0 -10px}}" +
    ".a2hs-link{display:inline-flex;align-items:center;gap:6px;margin:10px auto 0;padding:9px 14px;border-radius:999px;border:1px solid currentColor;background:transparent;color:inherit;font:700 13.5px/1 inherit;cursor:pointer;opacity:.9}" +
    ".a2hs-foot{text-align:center}" +
    "@media (prefers-reduced-motion:reduce){.a2hs-arrow{animation:none}}";
  D.head.appendChild(st);

  var SHARE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 9H6.5A1.5 1.5 0 0 0 5 10.5v9A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 17.5 9H16"/><path d="M12 15V3"/><path d="M8.5 6.5 12 3l3.5 3.5"/></svg>';
  var PLUS = '<svg viewBox="0 0 24 24" fill="none" stroke="#1c1c1e" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8.5v7M8.5 12h7"/></svg>';
  var ARROW = '<svg viewBox="0 0 44 58" aria-hidden="true"><path d="M22 2v44" stroke="currentColor" stroke-width="6" stroke-linecap="round"/><path d="M8 34l14 16 14-16" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function icon() {
    var l = D.querySelector("link[rel=apple-touch-icon]") || D.querySelector("link[rel~=icon]");
    return l ? '<img class="a2hs-ic" src="' + esc(l.href) + '" alt="">' : '<span class="a2hs-ic" aria-hidden="true"></span>';
  }
  function hd(title, sub) {
    return '<div class="a2hs-hd">' + icon() + '<div style="flex:1;min-width:0"><h3 id="a2hs-t">' + title + '</h3><p class="a2hs-sub">' + sub + '</p></div>' +
      '<button type="button" class="a2hs-x" data-a="close" aria-label="' + esc(T("Close")) + '">✕</button></div>';
  }
  var PITCH = "Opens like an app, full screen, rewards one tap away.";
  function html() {
    var n = esc(NAME), h = "";
    if (PLATFORM === "inapp") {
      h += hd("📲 " + esc(T("Open this in")) + " " + (iOS ? "Safari" : "Chrome") + " " + esc(T("first")),
        esc(T(appName + "'s browser can't add apps to your Home Screen.")) + " " + esc(T("Open")) + " " + n + " " + esc(T("in your phone's browser, then add it from there.")));
      h += "<ol><li><span class=\"gl\">•••</span><span>" + esc(T("Tap")) + " <b>•••</b> " + esc(T(iOS ? "(top right or bottom right)" : "(top right)")) + "</span></li>" +
        "<li><span class=\"gl\">🧭</span><span>" + esc(T("Tap")) + " <b>" + esc(T(iOS ? "Open in external browser" : "Open in Chrome")) + "</b> " + esc(T("(or Open in browser)")) + "</span></li>" +
        "<li><span class=\"gl\">📲</span><span>" + esc(T("Then tap")) + " <b>" + esc(T("Add to Home Screen")) + "</b></span></li></ol>";
      h += '<div class="a2hs-url" aria-label="Page link">' + esc(cleanUrl()) + "</div>";
      h += '<div class="a2hs-row"><button type="button" class="a2hs-go" data-a="copy">🔗 ' + esc(T("Copy link")) + '</button><button type="button" class="a2hs-no" data-a="later">' + esc(T("Not now")) + "</button></div>";
      h += '<p class="a2hs-note" id="a2hs-msg" aria-live="polite">' + esc(T("Paste it into Safari or Chrome.")) + "</p>";
    } else if (PLATFORM === "ios") {
      h += hd("📲 " + esc(T("Add")) + " " + n + " " + esc(T("to your Home Screen")), esc(T(PITCH)));
      h += '<ol><li><span class="gl">' + SHARE + "</span><span>" + esc(T("Tap the")) + " <b>" + esc(T("Share")) + "</b> " + esc(T("button")) + " " +
        esc(T(iPad ? "at the top of Safari" : "at the bottom of Safari")) + "</span></li>" +
        '<li><span class="gl">' + PLUS + "</span><span>" + esc(T("Scroll and tap")) + " <b>" + esc(T("Add to Home Screen")) + "</b></span></li>" +
        '<li><span class="gl" style="color:#0a84ff;font-size:15px">' + esc(T("Add")) + "</span><span>" + esc(T("Tap")) + " <b>" + esc(T("Add")) + "</b> " + esc(T("(top right)")) + "</span></li></ol>";
      h += '<div class="a2hs-row"><button type="button" class="a2hs-go" data-a="close">' + esc(T("Got it")) + '</button><button type="button" class="a2hs-no" data-a="later">' + esc(T("Not now")) + "</button></div>";
    } else {
      h += hd("📲 " + esc(T("Add")) + " " + n + " " + esc(T("to your Home Screen")), esc(T(PITCH)));
      if (deferred) {
        h += '<div class="a2hs-row"><button type="button" class="a2hs-go" data-a="install">⬇️ ' + esc(T("Install app")) + '</button><button type="button" class="a2hs-no" data-a="later">' + esc(T("Not now")) + "</button></div>";
        h += '<p class="a2hs-note">' + esc(T("Free. No app store. Takes one tap.")) + "</p>";
      } else {
        h += '<ol><li><span class="gl" style="color:#1c1c1e">⋮</span><span>' + esc(T("Tap the")) + " <b>⋮</b> " + esc(T(android ? "menu (top right in Chrome)" : "browser menu")) + "</span></li>" +
          '<li><span class="gl">' + PLUS + "</span><span>" + esc(T("Tap")) + " <b>" + esc(T("Add to Home screen")) + "</b> " + esc(T("(or Install app)")) + "</span></li>" +
          '<li><span class="gl" style="color:#1a73e8;font-size:13px">' + esc(T("Install")) + "</span><span>" + esc(T("Tap")) + " <b>" + esc(T("Install")) + "</b> " + esc(T("or")) + " <b>" + esc(T("Add")) + "</b></span></li></ol>";
        h += '<div class="a2hs-row"><button type="button" class="a2hs-go" data-a="close">' + esc(T("Got it")) + '</button><button type="button" class="a2hs-no" data-a="later">' + esc(T("Not now")) + "</button></div>";
      }
    }
    return '<div class="a2hs-card" role="document" data-scroll-ok>' + h + "</div>" +
      (PLATFORM === "ios" ? '<div class="a2hs-arrow' + (iPad ? " up" : "") + '" aria-hidden="true">' + ARROW + "</div>" : "");
  }
  function cleanUrl() { var u = location.href.split("#")[0]; return u; }

  var sheet = null, lastFocus = null;
  function render() { if (sheet) sheet.innerHTML = html(); }
  function open(reason) {
    if (!available()) return false;
    if (!sheet) {
      sheet = D.createElement("div"); sheet.className = "a2hs"; sheet.setAttribute("role", "dialog"); sheet.setAttribute("aria-modal", "true"); sheet.setAttribute("aria-labelledby", "a2hs-t");
      sheet.addEventListener("click", onClick);
      ["pointerdown", "touchstart", "mousedown"].forEach(function (ev) { sheet.addEventListener(ev, function (e) { e.stopPropagation(); }, { passive: true }); });
      D.body.appendChild(sheet);
    }
    sheet.classList.toggle("top", PLATFORM === "ios" && !iPad);   // iPhone: card up top so the arrow to the Share button is clear
    sheet.setAttribute("data-reason", reason || "");
    render(); lastFocus = D.activeElement;
    void sheet.offsetWidth; sheet.classList.add("on");
    try { sheet.querySelector(".a2hs-x").focus({ preventScroll: true }); } catch (e) {}
    lsSet(LAST, String(Date.now()));
    return true;
  }
  function close() { if (!sheet) return; sheet.classList.remove("on"); try { lastFocus && lastFocus.focus && lastFocus.focus({ preventScroll: true }); } catch (e) {} }
  function onClick(e) {
    if (e.target === sheet) { e.stopPropagation(); return close(); }
    var b = e.target.closest && e.target.closest("[data-a]"); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    var a = b.getAttribute("data-a");
    if (a === "close") close();
    else if (a === "later") { lsSet(LAST, String(Date.now())); close(); }
    else if (a === "install" && deferred) {
      var p = deferred; deferred = null;
      try { p.prompt(); (p.userChoice || Promise.resolve()).then(function () { close(); }, function () { close(); }); } catch (x) { render(); }
    } else if (a === "copy") copy();
  }
  function copy() {
    var u = cleanUrl(), msg = sheet && sheet.querySelector("#a2hs-msg");
    function ok() { if (msg) msg.textContent = T("Link copied. Open Safari or Chrome and paste it in the address bar."); }
    function fb() { try { var t = D.createElement("textarea"); t.value = u; t.setAttribute("readonly", ""); t.style.cssText = "position:fixed;top:0;left:0;opacity:0"; D.body.appendChild(t); t.select(); D.execCommand("copy"); t.remove(); ok(); } catch (x) { if (msg) msg.textContent = T("Press and hold the link above to copy it."); } }
    try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(u).then(ok, fb); else fb(); } catch (x) { fb(); }
  }
  W.addEventListener("keydown", function (e) { if (e.key === "Escape" && sheet && sheet.classList.contains("on")) { e.stopPropagation(); close(); } }, true);

  /* ---------- when it shows by itself ---------- */
  var inRun = false, pending = false, t0 = Date.now(), seen = 0;
  function due() { var l = +lsGet(LAST) || 0; return Date.now() - l > WEEK; }
  function busy() {
    return inRun || !!(W.Halftime && W.Halftime.active) || !!(W.GamePause && W.GamePause.paused) ||
      !!D.querySelector(".gm-sheet.on, .a2hs.on, .ht.on, .crm-ov.on") || D.visibilityState === "hidden";
  }
  function auto(reason, delay) {
    if (!available() || !due() || pending) return;
    pending = true;
    setTimeout(function tryShow() {
      if (!due()) { pending = false; return; }
      if (busy()) { setTimeout(tryShow, 4000); return; }
      pending = false; open(reason);
    }, delay || 0);
  }
  // 1) first game ends: every game puts ReviewEgg.endCard on its end screen; ReviewEgg.reset starts a run
  function hookEgg() {
    var R = W.ReviewEgg; if (!R || R.__a2hs) return !!R; R.__a2hs = 1;
    var oe = R.endCard, or = R.reset;
    if (typeof or === "function") R.reset = function () { inRun = true; return or.apply(this, arguments); };
    if (typeof oe === "function") R.endCard = function () { inRun = false; auto("gameover", 3500); return oe.apply(this, arguments); };
    return true;
  }
  // 2) they just joined rewards (crm.js keeps members under ssai_crm_<slug>; a new entry = a join)
  function crmCount() { var n = 0; try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (/^ssai_crm_[a-z0-9-]+$/.test(k)) { var v = JSON.parse(localStorage.getItem(k) || "[]"); if (v && v.length) n += v.length; } } } catch (e) {} return n; }
  // 3) ~45 s of the page actually being looked at
  function init() {
    if (!available()) return;
    if (!hookEgg()) { var tries = 0, iv = setInterval(function () { if (hookEgg() || ++tries > 20) clearInterval(iv); }, 500); }
    var base = crmCount();
    setInterval(function () {
      if (D.visibilityState !== "hidden") seen += 3;
      var c = crmCount(); if (c > base) { base = c; auto("joined", 2500); }
      if (seen >= 45 && seen < 48) auto("time", 0);
    }, 3000);
    footer();
  }
  function footer() {
    var f = D.querySelector("footer"); if (!f || f.querySelector(".a2hs-link")) return;
    var d = D.createElement("div"); d.className = "a2hs-foot";
    d.innerHTML = '<button type="button" class="a2hs-link">📲 ' + esc(T("Add to Home Screen")) + "</button>";
    d.firstChild.addEventListener("click", function (e) { e.preventDefault(); open("footer"); });
    f.appendChild(d);
  }
  if (D.readyState === "loading") D.addEventListener("DOMContentLoaded", init); else init();

  W.A2HS = { open: open, close: close, available: available, platform: PLATFORM, get canInstall() { return !!deferred; } };
  if (W.GameMenu && W.GameMenu.refresh) W.GameMenu.refresh();
})();
