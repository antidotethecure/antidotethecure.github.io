/* Drone fly-in intro: the gym's own FPV tour (sped up) under a high-tech HUD.
   Plays once per device (replay with ?intro=1), Skip button, blocks the idle sweat while it runs. */
(function () {
  "use strict";
  var force = /[?&]intro=1/.test(location.search), seen = false;
  try { seen = localStorage.getItem("aog_intro") === "1"; } catch (e) {}
  if ((seen && !force) || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)) return;

  // [start, end, label, sub] in seconds of intro.mp4
  var CUES = [
    [0.0, 1.0, "ALL-ONE GYM", "5436 Woodruff Ave · Lakewood"],
    [1.0, 1.4, "Entry", "Private club · members only"],
    [1.4, 2.8, "Main floor", "Two levels · open 24/5"],
    [3.8, 4.4, "Cardio deck", "Stairs · treads · bikes"],
    [4.4, 5.4, "Strength floor", "Racks · cables · plate-loaded"],
    [5.9, 7.6, "Free weights", "Benches · racks · dumbbells"],
    [7.6, 8.9, "Machines", "Plate-loaded + selectorized"],
    [9.8, 10.4, "Heavy bags", "Boxing · conditioning"],
    [11.4, 12.2, "Fuel bar", "Drinks · supplements · merch"],
    [12.4, 13.3, "The ring", "Spar · train · compete"]
  ];
  var LAND = 13.9; // the drone lands on the ALL-ONE turf logo

  var css = document.createElement("style");
  css.textContent =
    "#intro{position:fixed;inset:0;z-index:95;background:#000;overflow:hidden;font-family:Oswald,sans-serif;color:#fff;transition:opacity .6s}" +
    "#intro video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:contrast(1.08) saturate(.85)}" +
    "#intro .hud{position:absolute;inset:max(14px,env(safe-area-inset-top)) 14px max(14px,env(safe-area-inset-bottom));pointer-events:none}" +
    "#intro .c{position:absolute;width:26px;height:26px;border:2px solid rgba(255,255,255,.85)}" +
    "#intro .c1{left:0;top:0;border-right:0;border-bottom:0}#intro .c2{right:0;top:0;border-left:0;border-bottom:0}" +
    "#intro .c3{left:0;bottom:0;border-right:0;border-top:0}#intro .c4{right:0;bottom:0;border-left:0;border-top:0}" +
    "#intro .scan{position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(255,255,255,.035) 0 1px,transparent 1px 3px);mix-blend-mode:overlay}" +
    "#intro .sweep{position:absolute;left:0;right:0;height:22%;background:linear-gradient(transparent,rgba(255,255,255,.07),transparent);animation:aogSweep 2.4s linear infinite}" +
    "@keyframes aogSweep{from{top:-25%}to{top:100%}}" +
    "#intro .ret{position:absolute;left:50%;top:50%;width:64px;height:64px;margin:-32px 0 0 -32px;border:1px solid rgba(255,255,255,.5);border-radius:50%;animation:aogPulse 1.2s ease-in-out infinite}" +
    "#intro .ret:before,#intro .ret:after{content:'';position:absolute;background:rgba(255,255,255,.7)}" +
    "#intro .ret:before{left:50%;top:-10px;bottom:-10px;width:1px}#intro .ret:after{top:50%;left:-10px;right:-10px;height:1px}" +
    "@keyframes aogPulse{50%{transform:scale(1.12);opacity:.6}}" +
    "#intro .tl,#intro .tr{position:absolute;top:34px;font:500 11px/1.5 Inter,system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;text-shadow:0 1px 3px #000}" +
    "#intro .tl{left:12px}#intro .tr{right:12px;text-align:right}" +
    "#intro .rec{display:inline-block;width:7px;height:7px;border-radius:50%;background:#ff2a2a;margin-right:6px;animation:aogBlink 1s steps(2) infinite}" +
    "@keyframes aogBlink{50%{opacity:0}}" +
    "#intro .tag{position:absolute;left:12px;bottom:64px;padding:8px 14px 9px;border-left:3px solid #fff;background:linear-gradient(90deg,rgba(0,0,0,.65),transparent);opacity:0;transform:translateX(-14px);transition:opacity .2s,transform .25s}" +
    "#intro .tag.on{opacity:1;transform:none}" +
    "#intro .tag b{display:block;font-size:26px;letter-spacing:.06em;text-transform:uppercase;line-height:1.05}" +
    "#intro .tag i{font:500 11px Inter,system-ui,sans-serif;font-style:normal;letter-spacing:.16em;text-transform:uppercase;opacity:.8}" +
    "#intro .bar{position:absolute;left:12px;right:12px;bottom:40px;height:2px;background:rgba(255,255,255,.18)}#intro .bar span{display:block;height:100%;width:0;background:#fff}" +
    "#intro .skip{position:absolute;right:max(14px,env(safe-area-inset-right));bottom:max(56px,calc(env(safe-area-inset-bottom) + 42px));pointer-events:auto;font:600 12px Inter,system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#fff;background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.6);border-radius:99px;padding:9px 16px;min-height:40px}" +
    "#intro .land{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:radial-gradient(circle,rgba(0,0,0,.35),rgba(0,0,0,.85));opacity:0;transition:opacity .5s}" +
    "#intro .land.on{opacity:1}#intro .land img{width:120px;height:auto;filter:drop-shadow(0 0 18px rgba(255,255,255,.35))}" +
    "#intro .land b{font-size:34px;letter-spacing:.08em;text-transform:uppercase}#intro .land i{font:500 11px Inter,system-ui,sans-serif;font-style:normal;letter-spacing:.3em;text-transform:uppercase;opacity:.75}";
  document.head.appendChild(css);

  var el = document.createElement("div");
  el.id = "intro"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "ALL-ONE GYM intro video");
  el.innerHTML =
    '<video src="intro.mp4?v=2" poster="intro-poster.jpg?v=2" muted playsinline autoplay preload="auto"></video>' +
    '<div class="hud" aria-hidden="true"><div class="scan"></div><div class="sweep"></div>' +
    '<i class="c c1"></i><i class="c c2"></i><i class="c c3"></i><i class="c c4"></i><div class="ret"></div>' +
    '<div class="tl"><span class="rec"></span>Live feed · Drone 01<br><span class="t">00:00</span></div>' +
    '<div class="tr">ALT <span class="alt">040</span> FT<br>SPD <span class="spd">22</span> MPH</div>' +
    '<div class="tag"><b></b><i></i></div><div class="bar"><span></span></div></div>' +
    '<div class="land" aria-hidden="true"><img src="mark.png" alt=""><b>Set the standard.</b><i>Private club · Lakewood</i></div>' +
    '<button class="skip" type="button">Skip intro</button>';
  document.body.appendChild(el);
  window.AOG_BUSY = true;

  var v = el.querySelector("video"), tag = el.querySelector(".tag"), land = el.querySelector(".land"),
      bar = el.querySelector(".bar span"), tEl = el.querySelector(".t"), alt = el.querySelector(".alt"), spd = el.querySelector(".spd"),
      cur = -1, done = false;

  function pad(n, w) { n = String(Math.max(0, Math.round(n))); while (n.length < w) n = "0" + n; return n; }
  function tick() {
    if (done) return;
    var t = v.currentTime || 0, d = v.duration || 17;
    bar.style.width = (100 * t / d) + "%";
    tEl.textContent = "00:" + pad(t, 2);
    alt.textContent = pad(t < 1 ? 14 - t * 8 : 6 + Math.sin(t * 3) * 1.5, 3); // drops to chest height at the door
    spd.textContent = pad(t > LAND ? 4 : 20 + Math.sin(t * 2.3) * 4, 2);
    var i = -1; for (var k = 0; k < CUES.length; k++) if (t >= CUES[k][0] && t < CUES[k][1]) i = k;
    if (i !== cur) {
      cur = i; tag.classList.remove("on");
      if (i >= 0) setTimeout(function () { tag.firstChild.textContent = CUES[i][2]; tag.lastChild.textContent = CUES[i][3]; tag.classList.add("on"); }, 120);
    }
    land.classList.toggle("on", t >= LAND);
    requestAnimationFrame(tick);
  }
  function end() {
    if (done) return; done = true;
    try { localStorage.setItem("aog_intro", "1"); } catch (e) {}
    el.style.opacity = "0";
    setTimeout(function () { el.remove(); css.remove(); window.AOG_BUSY = false; if (window.AOG_SWEAT) window.AOG_SWEAT.wake(); }, 650);
  }

  el.querySelector(".skip").addEventListener("click", end);
  v.addEventListener("ended", function () { setTimeout(end, 900); });
  v.addEventListener("error", end);
  var p = v.play(); if (p && p.catch) p.catch(end); // autoplay blocked: go straight to the app
  requestAnimationFrame(tick);
})();
