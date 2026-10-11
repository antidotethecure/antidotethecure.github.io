/* SousShift AI — "steamy dish flybys": ambient decoration for a restaurant demo page.
   Every 15–25 s one hot dish cut-out (transparent webp) drifts across the screen with steam wisps rising off it and a
   sizzle shimmer. Tapping it scrolls to that dish in the menu and opens it (menu3d's Plate View when the card has one).
     <script>window.FLYBY={items:[{img:"img/fly/fly-catfish-wafflez.webp",name:"Catfish N' Wafflez",to:"img/catfish-wafflez.jpg"},…],
       every:[15,25], first:6, busy:function(){ return gameIsRunning; }};</script><script src="../flyby.js"></script>
   to: the src of the menu photo to jump to (or any CSS selector).
   Never shows: while busy() is true (e.g. the game is being played), while a sheet / form / modal is open or a field
   has focus, while the tab is hidden, or for anyone with prefers-reduced-motion. A flyby in the air when one of those
   starts fades out. It lives in a fixed, overflow-hidden layer, so it can never cause horizontal scroll.
   Test hook: window.FLYBY_NOW() launches one immediately. */
(function () {
  "use strict";
  var C = window.FLYBY; if (!C || !(C.items || []).length || window.__flyby) return;
  window.__flyby = 1;
  var D = document, W = window;
  var RM = W.matchMedia && W.matchMedia("(prefers-reduced-motion: reduce)");
  var css = ".fly-l{position:fixed;inset:0;z-index:60;pointer-events:none;overflow:hidden;contain:strict}" +
    ".fly-d{position:absolute;left:0;top:0;width:clamp(104px,31vw,160px);border:0;padding:0;background:none;cursor:pointer;pointer-events:auto;-webkit-tap-highlight-color:transparent;touch-action:manipulation;will-change:transform,opacity}" +
    ".fly-d img{display:block;width:100%;height:auto;filter:drop-shadow(0 10px 14px rgba(60,30,0,.35)) saturate(1.12);animation:flySz 1.1s ease-in-out infinite}" +
    ".fly-d .sh{position:absolute;inset:0;-webkit-mask:var(--m) center/100% 100% no-repeat;mask:var(--m) center/100% 100% no-repeat;background:linear-gradient(105deg,transparent 35%,rgba(255,236,170,.55) 50%,transparent 65%) 0 0/250% 100%;animation:flySheen 1.6s linear infinite;mix-blend-mode:screen}" +
    ".fly-d .st{position:absolute;left:50%;bottom:62%;width:70%;height:90%;transform:translateX(-50%);pointer-events:none}" +
    ".fly-d .st i{position:absolute;bottom:0;width:22%;height:70%;border-radius:50%;background:radial-gradient(closest-side,rgba(255,255,255,.95),rgba(236,228,218,.55) 55%,rgba(200,190,180,0));filter:blur(4px);opacity:0;animation:flySteam 2.4s ease-out infinite}" +
    ".fly-d .st i:nth-child(1){left:12%;animation-delay:0s}.fly-d .st i:nth-child(2){left:40%;animation-delay:.8s}.fly-d .st i:nth-child(3){left:66%;animation-delay:1.6s}.fly-d .st i:nth-child(4){left:28%;animation-delay:1.2s;width:16%}" +
    ".fly-d b{position:absolute;left:50%;top:100%;transform:translateX(-50%);margin-top:2px;white-space:nowrap;font:800 11px/1 system-ui,-apple-system,sans-serif;color:#fff;background:rgba(42,30,54,.82);border-radius:99px;padding:5px 9px;box-shadow:0 4px 10px rgba(0,0,0,.25)}" +
    "@keyframes flySz{0%,100%{transform:translateY(0) rotate(-1deg)}50%{transform:translateY(-1.5px) rotate(1deg) scale(1.01)}}" +
    "@keyframes flySheen{from{background-position:120% 0}to{background-position:-130% 0}}" +
    "@keyframes flySteam{0%{opacity:0;transform:translateY(10px) scale(.6)}25%{opacity:.85}100%{opacity:0;transform:translateY(-70px) translateX(8px) scale(1.5)}}" +
    ".fly-hit{animation:flyHit 1.4s ease-out 2}@keyframes flyHit{0%{box-shadow:0 0 0 0 rgba(242,193,78,.9)}100%{box-shadow:0 0 0 16px rgba(242,193,78,0)}}" +
    "@media (prefers-reduced-motion:reduce){.fly-l{display:none}}";
  var st = D.createElement("style"); st.textContent = css; D.head.appendChild(st);
  var layer = null, cur = null, timer = 0, idx = Math.floor(Math.random() * C.items.length);
  var EV = C.every || [15, 25];

  function blocked() {
    if (RM && RM.matches) return true;
    if (D.hidden) return true;
    try { if (C.busy && C.busy()) return true; } catch (e) {}
    if (D.querySelector(".crm-gate,.crm-draw,.gm-sheet.on,.tok-ov,#m3d-o[style*='grid'],.ssai-pauseov:not([hidden])")) return true;
    var a = D.activeElement; if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return true;
    return false;
  }
  function target(it) {
    var t = it.to || "";
    var img = /[\/.]/.test(t) && !/^[#.\[]/.test(t) ? D.querySelector('img[src="' + t + '"]') : D.querySelector(t);
    return img ? (img.closest(".item,.dish,article") || img) : null;
  }
  function go(it) {
    var el = target(it); if (!el) return;
    el.scrollIntoView({ behavior: RM && RM.matches ? "auto" : "smooth", block: "center" });
    el.classList.remove("fly-hit"); void el.offsetWidth; el.classList.add("fly-hit");
    setTimeout(function () { el.classList.remove("fly-hit"); }, 3000);
    // open the dish: menu3d adds a "3D" badge that opens Plate View
    setTimeout(function () { var b = el.querySelector(".m3d-b"); if (b) b.click(); }, 900);
  }
  function launch() {
    if (cur || blocked()) return false;
    if (!layer) { layer = D.createElement("div"); layer.className = "fly-l"; layer.setAttribute("aria-hidden", "false"); D.body.appendChild(layer); }
    var it = C.items[idx++ % C.items.length];
    var b = D.createElement("button"); b.type = "button"; b.className = "fly-d";
    b.setAttribute("aria-label", (it.name || "Dish") + ": see it on the menu");
    b.innerHTML = '<span class="st"><i></i><i></i><i></i><i></i></span><img src="' + it.img + '" alt=""><span class="sh" style="--m:url(\'' + it.img + '\')"></span>' + (it.name ? "<b>" + String(it.name).replace(/[<>&]/g, "") + " 🔥</b>" : "");
    layer.appendChild(b);
    var vw = layer.clientWidth, vh = layer.clientHeight, w = b.offsetWidth || 130;
    var ltr = Math.random() < 0.5, y0 = vh * (0.18 + Math.random() * 0.5), y1 = y0 + (Math.random() * 2 - 1) * vh * 0.12;
    var x0 = ltr ? -w - 20 : vw + 20, x1 = ltr ? vw + 20 : -w - 20, rot = ltr ? 8 : -8, dur = 7500 + Math.random() * 2500;
    var kf = [], N = 6;
    for (var i = 0; i <= N; i++) { var f = i / N, x = x0 + (x1 - x0) * f, y = y0 + (y1 - y0) * f + Math.sin(f * Math.PI * 2) * 14;
      kf.push({ transform: "translate(" + x + "px," + y + "px) rotate(" + (rot * Math.sin(f * Math.PI * 2 + 1) * 0.6) + "deg)", opacity: i === 0 || i === N ? 0.0 : 1 }); }
    kf[1].opacity = 1;
    var anim = b.animate(kf, { duration: dur, easing: "linear", fill: "forwards" });
    cur = { el: b, anim: anim };
    b.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); done(true); go(it); });
    anim.onfinish = function () { done(false); };
    return true;
  }
  function done(fast) {
    if (!cur) return; var c = cur; cur = null;
    if (fast) { c.anim.pause(); c.el.animate([{ opacity: 1, transform: getComputedStyle(c.el).transform }, { opacity: 0, transform: getComputedStyle(c.el).transform + " scale(1.3)" }], { duration: 250, fill: "forwards" }).onfinish = function () { c.el.remove(); }; }
    else c.el.remove();
    schedule();
  }
  function schedule(ms) { clearTimeout(timer); timer = setTimeout(function () { if (!launch()) schedule(3000); }, ms != null ? ms : (EV[0] + Math.random() * (EV[1] - EV[0])) * 1000); }
  // a flyby in the air when the game starts or a sheet opens fades away
  setInterval(function () { if (cur && blocked()) { var c = cur; cur = null; c.anim.pause(); c.el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: "forwards" }).onfinish = function () { c.el.remove(); }; schedule(); } }, 400);
  W.FLYBY_NOW = function () { if (cur) { cur.el.remove(); cur = null; } return launch(); };
  function init() { schedule((C.first != null ? C.first : 6) * 1000); }
  if (D.readyState === "loading") D.addEventListener("DOMContentLoaded", init); else init();
})();
