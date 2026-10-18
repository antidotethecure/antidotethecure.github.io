/* Ride the Nalu — Nalu Vida's surf game. Every level is one trip out and back, like Melody's flight:
   1. SAND + SWIM: start on the sand in front of Nalu Vida, run into the water and paddle out through the break.
      Breaking waves roll in at you: tap JUMP to duck-dive under each one. Get caught = ENGULFED (−1 ❤️).
   2. RIDE (~90 s on level 1): pop up and ride the wave in. Each wave forms on one side and peels across. Behind the
      curl is the breaking WHITE FOAM; ahead of it is the clean, unbroken face (and its shoulder, out to the side). The
      foam is the ONLY thing on the ride that hurts (touch it = FOAM wipeout, −½ ❤️). Anywhere on the clean face is safe:
      JUMP (or swipe up) carves up the face to the lip and launches you; the steeper face near the curl and a fast carve
      = bigger air. In the air tap TRICK / tap the water / swipe (sideways = 360, down = grab, up = flip; keys R/G/F,
      pad X/LB/RB) and land it: NICE! + trick points, and back-to-back clean landings build a small combo (×1.25 … ×2).
      Still mid-trick on landing = a light bail (−150, no heart). Riding the pocket near the curl still scores extra.
      Health kits float by on the ride every 20–30 s while you're hurt (+1 ❤️). No sharks or other clutter on the ride
      (Antidote, 2026-10-14: nothing in the water to distract you). Everything else lives on the paddle-out: the Nalu
      Vida care boat (food rafts, a heart, a harpoon bundle), stingrays / eels / jellies ramping up by level, double sets from
      level 3, and from level 2 a submarine that surfaces ahead, locks a red aim line on you and fires a harpoon (dodge it or
      duck-dive; level 4+ fires twice). Boss fights bring pier sections (JUMP them, −1 ❤️) and rocks to ram the boss into.
      The first ride of a run gets a tutorial card (once per phone; replay from How to play) and lifeguard coaching.
      Family version (Christian's feedback, 2026-10): no harpoons, no boss fights, no red/injury effects. Sea life is only
      something to steer around; touching it = a mild wipeout (splash, bubbles, pop back up). Level 5's ride-in ends the run.
   3. RIDE IN (~125–130 s on level 1): ride onto the sand and run up the beach into Nalu Vida to eat. Between levels
      that is drawn in-engine; the final win and game over play the Higgsfield cutscene img/scene/ending.mp4.
   All arc timings live in the LV table. 5 hearts, lost in halves: washed by the wave / under the lip = ½,
   pier wall, bail, bumping a shark, stingray, jelly, eel or rocks = 1 each (a splash wipeout). Out at 0.
   REWARDS: the run's score turns into Nalu Vida Rewards points through window.SSAI_GAMEPTS (crm.js): 1 pt per 100 score,
   capped per day (SSAI_REWARDS.game). Playing never needs an account; a guest is offered "Join to save your N points".
   Scoring has no ceiling: grab 4 in a row for ×2, 8 = ×3 … A hit resets it.
   Test hooks: ?wave=1 (start on the ride back in) ?lvl=1-5 &boss=1 &god=1 &spd=1-8 &phase=swim|ride|ending &hits=0-4 &gore=0 &bot=1 (autopilot) &bot=wash &tut=1 &render=2d|3d &keep3d=1
   Water = WebGL shader (falls back to a 2D gradient). Sprites live in img/game/*.webp; anything missing is drawn. */
(function () {
  "use strict";
  var mount = document.getElementById("nalu-game"); if (!mount) return;
  // PIER_X / STUB: the narrow pier that runs out from the sand (off to the side of the Nalu Vida paddle-out lane at SHORE_X)
  var W = 400, H = 640, HC = H / 2, LEAD = H * 0.16, PIER_X = 200, PIER_W = 24, STUB = 760, SHORE_X = 322, WGAP = 62, RLEAD = LEAD * .45;   // RLEAD: riding, the camera sits you lower so the wave behind you stays on screen
  var QS = (function () { try { return new URLSearchParams(location.search); } catch (e) { return { get: function () { return null; } }; } })();
  var DBG_LVL = Math.max(1, Math.min(5, +QS.get("lvl") || 1)), DBG_BOSS = QS.get("boss") === "1", DBG_GOD = QS.get("god") === "1", DBG_SPD = Math.max(1, Math.min(8, +QS.get("spd") || 1)),
    DBG_PHASE = QS.get("phase") || "", DBG_HITS = Math.max(0, Math.min(4, +QS.get("hits") || 0)), DBG_BOT = QS.get("bot") === "1",
    DBG_WASH = QS.get("bot") === "wash", DBG_TUT = QS.get("tut") === "1", DBG_WAVE = QS.get("wave") === "1";   // ?wave=1: jump straight to the ride back in   // ?bot=wash: an autopilot that sits in the whitewater (tests the −½) · ?tut=1: always show the ride tutorial
  // ?rescue=1: test the lifeguard beer rescue (the run starts 2 hits down with the rescue queued; window.__NV.rescue() re-throws)
  var DBG_RESC = QS.get("rescue") === "1", REDUCE = false; try { REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
  /* ---------- levels: the arc timings, in seconds ----------
     swim = sand run + paddle out (level 1 is the full 30 s; later levels are shorter so the whole game doesn't drag)
     ride = riding before the ride-in (on a boss level: riding before the boss shows up; the ride-in follows the boss)
     set = seconds between incoming waves on the paddle-out · peel = how fast the curl peels (px/s) · pier = seconds between pier sections
     The paddle-out is where things happen: stingrays (and the odd jellyfish), a fisherman's boat hunting a shark whose stray
     harpoons you have to dodge, food rafts, rescue cans, and only a RARE shark. The ride back in is smooth: just the wave and
     a few sharks. Every shark powers up for ~2 s first (it holds ahead of you, blinking red, the lifeguard calls it), then charges.
     hb = seconds between fisherman's boats · ss = shark share of paddle-out hazards (rare) · sray = chance of a second stingray
     dbl = chance a set comes as two waves back to back · rh = seconds between sharks on the ride in · pack = chance of a 2nd shark */
  var LV = [null,
    { swim: 30, ride: 90, set: [3.4, 4.4], peel: 60, pier: [13, 18], spd: 1.00, haz: 1.00, shark: .30, lunge: 330, eel: 60, jel: 0, ray: .22, rock: 0, pack: 0, hb: [12, 16], ss: .04, sray: 0, dbl: 0, rh: [11, 15], sub: "Paddle out · ride the wave in" },
    { swim: 18, ride: 72, set: [3.0, 3.9], peel: 68, pier: [11, 15], spd: 1.07, haz: 1.12, shark: .36, lunge: 345, eel: 75, jel: .25, ray: .26, rock: 0, pack: 0, hb: [11, 14], ss: .05, sray: .1, dbl: 0, rh: [10, 13], sub: "More stingrays · a fisherman hunting sharks" },
    { swim: 16, ride: 50, set: [2.8, 3.6], peel: 74, pier: [10, 14], spd: 1.11, haz: 1.22, shark: .40, lunge: 360, eel: 88, jel: .35, ray: .28, rock: 0, pack: 0, hb: [10, 13], ss: .06, sray: .18, dbl: .15, rh: [9, 12], sub: "Bigger sets · the fisherman fires 3" },
    { swim: 16, ride: 72, set: [2.6, 3.3], peel: 80, pier: [9, 13], spd: 1.16, haz: 1.32, shark: .44, lunge: 375, eel: 100, jel: .45, ray: .30, rock: 0, pack: .12, hb: [9, 12], ss: .07, sray: .25, dbl: .25, rh: [8, 11], sub: "Double sets · sharks hunt in pairs" },
    { swim: 16, ride: 42, set: [2.4, 3.1], peel: 86, pier: [9, 12], spd: 1.20, haz: 1.42, shark: .46, lunge: 390, eel: 110, jel: .5, ray: .32, rock: 0, pack: .2, hb: [8, 11], ss: .08, sray: .3, dbl: .3, rh: [7, 10], sub: "Final ride · bring it home to Nalu Vida" }];
  var BOSS = {
    3: { name: "BIG MANŌ", size: 150, hp: 60, harp: 5, rock: 14, pier: 10, charge: 430, warn: .72, stalk: [1.7, 2.5], bonus: 5000 },
    5: { name: "MANŌ NUI", size: 225, hp: 170, harp: 5, rock: 16, pier: 12, charge: 500, warn: .58, stalk: [1.1, 1.8], bonus: 15000 } };
  var BAPI = "https://drizzle-bowl-scores.higgsfield.app/api/game-scores", BGAME = "naluvida";

  /* ---------- DOM ---------- */
  var css = document.createElement("style");
  css.textContent =
    ".nv-wrap{position:relative;width:100%;max-width:430px;margin:0 auto;aspect-ratio:400/640;border-radius:18px;overflow:hidden;background:#0b3b5e;box-shadow:0 14px 40px rgba(0,0,0,.35);touch-action:none;user-select:none;-webkit-user-select:none}" +
    ".nv-wrap canvas{position:absolute;inset:0;width:100%;height:100%;display:block}" +
    ".nv-hud{position:absolute;left:0;right:0;top:0;display:flex;justify-content:space-between;align-items:flex-start;padding:10px 12px;pointer-events:none;font:800 14px/1.1 system-ui,sans-serif;color:#fff;text-shadow:0 2px 6px rgba(0,0,0,.55)}" +
    ".nv-score{font:900 26px/1 'Alfa Slab One',Georgia,serif;letter-spacing:.5px}.nv-mult{display:inline-block;margin-top:5px;padding:4px 9px;border-radius:999px;background:linear-gradient(90deg,#ff9d2e,#ffd23f);color:#3a1600;font-weight:900;text-shadow:none;transform-origin:left center}" +
    ".nv-hearts{text-align:right;font-size:18px;letter-spacing:2px}.nv-hh{position:relative;display:inline-block}.nv-hh i{position:absolute;left:0;top:0;width:50%;overflow:hidden;font-style:normal;white-space:nowrap}.nv-leg{margin-top:6px;font-size:11.5px;opacity:.95}" +
    // big thumb buttons in the bottom corners, under the surfer (he rides in the upper-middle of the frame)
    "#nv-jump{position:absolute;right:10px;bottom:20px;width:94px;height:94px;border-radius:50%;border:3px solid rgba(255,255,255,.6);background:rgba(6,24,46,.6);color:#fff;font:900 16px/1.05 system-ui;letter-spacing:.05em;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;display:none;z-index:3;padding:0}" +
    "#nv-jump.on{display:block}#nv-jump.ready{background:radial-gradient(circle,#7fe3f2,#1673c4);border-color:#fff;box-shadow:0 0 0 0 rgba(127,227,242,.8);animation:nvj .8s infinite}#nv-jump.duck{background:radial-gradient(circle,#ffe08a,#e2452b);border-color:#fff;animation:nvj .5s infinite}#nv-jump:active{transform:scale(.94)}" +
    "@keyframes nvj{0%{box-shadow:0 0 0 0 rgba(127,227,242,.8)}100%{box-shadow:0 0 0 18px rgba(127,227,242,0)}}" +
    "#nv-trick{position:absolute;left:10px;bottom:20px;width:86px;height:86px;border-radius:50%;border:3px solid rgba(255,255,255,.45);background:rgba(6,24,46,.5);color:rgba(255,255,255,.75);font:900 14px/1.05 system-ui;letter-spacing:.04em;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;display:none;z-index:3;padding:0}" +
    "#nv-trick.on{display:block}#nv-trick b{display:block;font-size:24px}#nv-trick.air{color:#3a1600;border-color:#fff;background:radial-gradient(circle,#ffe08a,#ff9d2e);animation:nvj .6s infinite}#nv-trick:active{transform:scale(.94)}" +
    "#nv-fire{position:absolute;right:16px;bottom:126px;width:66px;height:66px;border-radius:50%;border:3px solid #fff;background:radial-gradient(circle at 40% 35%,#ffb15e,#e2452b 70%);color:#fff;font:900 13px/1.05 system-ui;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;display:none;z-index:3;box-shadow:0 4px 14px rgba(0,0,0,.35);text-shadow:0 1px 3px rgba(0,0,0,.5)}" +
    ".nv-cut{position:absolute;inset:0;z-index:4;display:none;background:#120a06;overflow:hidden}.nv-cut.on{display:block}.nv-cut video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}" +
    ".nv-cut h3{position:absolute;left:0;right:0;top:15%;margin:0;padding:0 14px;text-align:center;font:900 27px/1.1 'Alfa Slab One',Georgia,serif;color:#ffd23f;text-shadow:0 3px 0 #ff7a3d,0 6px 18px rgba(0,0,0,.6);opacity:0;transform:translateY(12px);transition:opacity .6s,transform .6s}" +
    ".nv-cut.ttl h3{opacity:1;transform:none}.nv-cut p{position:absolute;left:0;right:0;bottom:16px;margin:0;text-align:center;font:700 12px system-ui;color:rgba(255,255,255,.8);text-shadow:0 1px 4px #000}" +
    ".nv-cut::after{content:'';position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,rgba(0,0,0,.35),rgba(0,0,0,0) 30%,rgba(0,0,0,0) 80%,rgba(0,0,0,.45))}" +
    "#nv-fire.on{display:block}#nv-fire:active{transform:scale(.93)}#nv-fire b{display:block;font-size:20px}" +
    ".nv-pickonly .nv-how,.nv-pickonly>p{display:none}" +
    "#nv-tut .nvt-curl{animation:nvtc 3.2s linear infinite}#nv-tut .nvt-band{animation:nvtb 1s ease-in-out infinite alternate}@keyframes nvtc{0%{transform:translateX(0)}100%{transform:translateX(150px)}}@keyframes nvtb{0%{opacity:.55}100%{opacity:1}}" +
    ".nv-fly{position:absolute;top:8px;left:0;display:flex;align-items:center;gap:0;border:0;background:none;padding:0;cursor:pointer;animation:nvfly 9s linear infinite;z-index:6}" +
    ".nv-fly img{width:58px;transform:rotate(-90deg);filter:drop-shadow(0 6px 6px rgba(0,0,0,.4))}.nv-fly span{order:-1;margin-right:-4px;padding:7px 12px;background:repeating-linear-gradient(90deg,#b3263a 0 14px,#c22d43 14px 28px);color:#fbf1de;font:900 12px system-ui;white-space:nowrap;border-radius:3px;box-shadow:0 4px 10px rgba(0,0,0,.35)}" +
    "@keyframes nvfly{0%{transform:translateX(110%)}100%{transform:translateX(-160%)}}" +
    ".nv-bar{position:absolute;left:12px;right:12px;bottom:10px;height:5px;border-radius:9px;background:rgba(255,255,255,.25);pointer-events:none}.nv-bar i{display:block;height:100%;border-radius:9px;background:linear-gradient(90deg,#ffd23f,#ff7a3d)}" +
    ".nv-ov{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:22px;background:linear-gradient(180deg,rgba(6,24,46,.55),rgba(6,24,46,.88));color:#fff;font:600 14px/1.45 system-ui,sans-serif}" +
    ".nv-ov h3{margin:0 0 4px;font:900 34px/1 'Alfa Slab One',Georgia,serif;letter-spacing:.5px;text-shadow:0 3px 0 #ff7a3d}.nv-ov p{margin:6px 0;max-width:330px}" +
    ".nv-pick{display:flex;gap:12px;margin:14px 0 8px}.nv-pick button{width:128px;padding:10px 8px 12px;border-radius:16px;border:2px solid rgba(255,255,255,.35);background:rgba(255,255,255,.1);color:#fff;font:800 15px system-ui;cursor:pointer}" +
    ".nv-pick button:active{transform:scale(.97)}.nv-pick img,.nv-pick .ph{display:block;width:96px;height:96px;margin:0 auto 6px;object-fit:contain}" +
    ".nv-btn{margin-top:10px;padding:12px 20px;border:0;border-radius:999px;background:linear-gradient(90deg,#ff7a3d,#ffd23f);color:#3a1600;font:900 16px system-ui;cursor:pointer}" +
    ".nv-how{font-size:12.5px;opacity:.9;max-width:320px}.nv-win{margin:10px 0;padding:10px 12px;border-radius:12px;background:rgba(61,220,151,.16);border:1px solid #3ddc97;font-weight:800}" +
    ".nv-board{width:100%;max-width:330px;margin-top:8px;font-size:13px;text-align:left}.nv-board ol{margin:6px 0;padding-left:22px;max-height:118px;overflow:auto}.nv-board input{width:100%;margin:4px 0;padding:9px 10px;border-radius:10px;border:1px solid rgba(255,255,255,.3);background:rgba(0,0,0,.25);color:#fff;font:600 14px system-ui}" +
    ".nv-toast{position:absolute;left:12px;right:12px;bottom:126px;display:flex;gap:10px;align-items:center;padding:8px 10px;border-radius:14px;background:rgba(6,24,46,.82);color:#fff;font:800 14px system-ui;transform:translateY(140%);opacity:0;visibility:hidden;transition:transform .35s,opacity .35s,visibility .35s;pointer-events:none}" +
    ".nv-toast.on{transform:none;opacity:1;visibility:visible}.nv-toast img{width:54px;height:54px;object-fit:contain;flex:none}" +
    "#nv-end{justify-content:flex-start;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;touch-action:pan-y}#nv-end>:first-child{margin-top:auto}#nv-end>.nv-board{margin-bottom:auto}";
  document.head.appendChild(css);
  mount.innerHTML =
    '<div class="nv-wrap gamebox" data-game>' +
    '<canvas id="nv-water"></canvas><canvas id="cv" data-game></canvas>' +
    '<div class="nv-hud"><div><div class="nv-score" id="nv-score">0</div><span class="nv-mult" id="nv-mult">×1</span><div class="nv-leg" id="nv-leg"></div></div><div><div class="nv-hearts" id="nv-hearts"></div><div class="nv-leg" id="nv-lap"></div><button type="button" id="nv-mute" aria-label="Sound on or off" style="pointer-events:auto;margin-top:6px;float:right;border:0;border-radius:999px;padding:5px 9px;background:rgba(6,24,46,.55);color:#fff;font-size:15px;cursor:pointer">🔊</button></div></div>' +
    '<div class="nv-bar"><i id="nv-prog" style="width:0"></i></div>' +
    '<button type="button" id="nv-jump" aria-label="Jump">JUMP</button>' +
    '<button type="button" id="nv-trick" aria-label="Trick"><b>🌀</b>TRICK</button>' +
    '<div class="nv-cut" id="nv-cut"><video id="nv-cutv" muted playsinline preload="none" poster="img/scene/ending.jpg"></video><h3>Back to Nalu Vida 🏄</h3><p>Tap to skip</p></div>' +
    '<div class="nv-toast" id="nv-toast"><img id="nv-toast-img" alt=""><span id="nv-toast-t"></span></div>' +
    '<div class="nv-ov" id="nv-start"><h3>Ride the Nalu</h3><p>Run in from the sand, paddle out past the break, ride the wave back to Nalu Vida. Earn Nalu Vida Rewards points.</p>' +
    '<div class="nv-pick"><button type="button" data-s="f"><img src="img/game/surfer_f.webp" alt="" onerror="this.outerHTML=\'<div class=ph style=font-size:64px;line-height:96px>🏄‍♀️</div>\'">She rides</button>' +
    '<button type="button" data-s="m"><img src="img/game/surfer_m.webp" alt="" onerror="this.outerHTML=\'<div class=ph style=font-size:64px;line-height:96px>🏄‍♂️</div>\'">He rides</button></div>' +
    '<p class="nv-how">Drag to steer · <b>Paddle out:</b> tap JUMP to duck-dive under each breaking wave · <b>Ride in:</b> only the <b>white foam</b> behind the curl can hurt you (−½ ❤️). Stay on the clean face, or go round to the side with no foam · tap JUMP (or swipe up) to ride up the lip and launch, then TRICK / tap / swipe in the air (sideways = 360, down = grab, up = flip) and land it: NICE! · 🩹 health kits float by when you’re hurt (+1 ❤️) · Paddling out: grab food (4 in a row = ×2), steer around stingrays &amp; jellies · <b>5 levels</b> · Tap the banner plane 👀</p><p class="nv-how" id="nv-best"></p></div>' +
    '<div class="nv-ov" id="nv-end" data-scroll-ok style="display:none"></div>' +
    "</div>";
  var wrap = mount.firstChild, gl_c = document.getElementById("nv-water"), cv = document.getElementById("cv"), cx = cv.getContext("2d");
  /* ---------- the lifeguard on the radio (../radio-avatar.js): spoken warnings only, never touches scoring ---------- */
  var RA = window.RadioAvatar, raSeen = {}, raLast = {}, RA_GAP = 12000;
  if (RA) RA.mount({ host: wrap, base: "img/game/", who: "guard", top: "92px", left: "8px", right: "8px",
    sound: function () { return AC && FX && !MUTED && SFX_ON && AC.state === "running" ? FX : null; },
    // the surfer on screen (the 2D layer zooms around the camera), in wrap pixels: the lifeguard fades while you ride under him
    avoid: function () { if (!G.running) return null; var k = wrap.clientWidth / W; return { x: (CAM.x + (G.x - CAM.x) * ZOOM) * k, y: (CAM.y + (sy(G.yw) - CAM.y) * ZOOM) * k, r: 34 * ZOOM * k }; } });
  function radio(t, o) { if (!RA) return; o = o || {}; o.who = "guard"; RA.say(t, o); }
  // one warning per kind every ~12 s; the first time each kind shows up in a run always gets called out
  function radioOnce(kind, t, o) { if (!RA) return; var now = performance.now(), first = !raSeen[kind];
    if (!first && now - (raLast[kind] || 0) < RA_GAP) return; raSeen[kind] = 1; raLast[kind] = now; o = o || {}; if (first) o.pri = (o.tone === "info" ? 0 : 1) + .5; radio(t, o); }
  function radioReset() { raSeen = {}; raLast = {}; if (RA) RA.clear(); }
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- images ---------- */
  var IM = {};
  ["surfer_m", "surfer_f", "shark", "eel", "jelly", "gull", "boat", "heli", "plane", "raft_taco", "raft_burger", "raft_oysters", "raft_mimosa", "raft_shrimp",
    "drop", "buoy", "shore", "pier", "lifeguard_f", "lifeguard_m", "staff", "palm", "storefront", "wave", "splash", "fish_gold", "fish_mahi", "fish_parrot", "raft_fries", "skeleton", "paddler_m", "paddler_f", "beachlady", "surfer_m_rider", "surfer_m_board", "surfer_f_rider", "surfer_f_board"].forEach(function (k) { var i = new Image(); i.decoding = "async"; i.src = "img/game/" + k + ".webp"; IM[k] = i; });
  function ok(i) { return i && i.complete && i.naturalWidth > 0; }
  function spr(k, x, y, w, rot, alpha) {
    var i = IM[k]; if (!ok(i)) return false; var h = w * i.naturalHeight / i.naturalWidth;
    cx.save(); cx.translate(x, y); if (rot) cx.rotate(rot); if (alpha != null) cx.globalAlpha = alpha; cx.drawImage(i, -w / 2, -h / 2, w, h); cx.restore(); return true;
  }

  /* ---------- sizing ---------- */
  var DPR = Math.min(2, window.devicePixelRatio || 1), WDPR = 1;
  function size() { cv.width = W * DPR; cv.height = H * DPR; gl_c.width = Math.round(W * WDPR); gl_c.height = Math.round(H * WDPR); }
  size();

  /* ---------- water (WebGL) ---------- */
  var GL = null, U = {};
  (function () {
    try {
      var g = gl_c.getContext("webgl", { antialias: false, premultipliedAlpha: false }); if (!g) return;
      var vs = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
      var fs = [
        "#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif",
        "uniform vec2 R,C;uniform float T,S,SH,K,Z;",
        "float h1(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}",
        "float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h1(i),h1(i+vec2(1,0)),f.x),mix(h1(i+vec2(0,1)),h1(i+1.),f.x),f.y);}",
        "float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*n2(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}",
        // swell rolling toward the shore + chop + ripples
        "float hgt(vec2 q){float h=sin(dot(q,vec2(.12,1.))*8.+T*1.3+fbm(q*1.5)*1.6)*.30;h+=sin(dot(q,vec2(-.45,1.))*13.+T*1.9)*.15;h+=sin(dot(q,vec2(.7,.7))*21.-T*2.4)*.07;",
        "h+=(fbm(q*6.+vec2(T*.15,T*.35))-.5)*.5;h+=(n2(q*38.-vec2(T*.9,T*.4))-.5)*.12;return h;}",
        // tileable caustic pattern (classic iterative trick)
        "float caus(vec2 uv){vec2 p=mod(uv*6.28318,6.28318)-250.,i=p;float c=1.,inten=.005;for(int n=0;n<4;n++){float t=T*.45*(1.-(3.5/float(n+1)));i=p+vec2(cos(t-i.x)+sin(t+i.y),sin(t-i.y)+cos(t+i.x));c+=1./length(vec2(p.x/(sin(i.x+t)/inten),p.y/(cos(i.y+t)/inten)));}c/=4.;c=1.17-pow(c,1.4);return pow(abs(c),8.);}",
        "void main(){vec2 p=gl_FragCoord.xy/R*vec2(400.,640.);p.y=640.-p.y;p=C+(p-C)/Z;vec2 q=vec2(p.x,p.y-S)/400.;",
        "float e=.0025,h=hgt(q);vec3 n=normalize(vec3(-(hgt(q+vec2(e,0))-h)/e*.06,-(hgt(q+vec2(0,e))-h)/e*.06,1.));",
        "float d=SH-p.y;float dep=clamp(d/340.,0.,1.);float m=dep*dep*14.+h*.25;",                       // water depth in 'meters'
        "vec3 V=normalize(vec3(0.,-.38*(1.-p.y/640.)-.05,1.));",                                           // camera tilts toward the horizon at the top
        // seabed: sand + caustics, seen through the water (Beer-Lambert absorption, red dies first)
        "vec3 sand=vec3(.86,.77,.58);float cz=0.;if(dep<.75){cz=caus(q*2.2+n.xy*.08);}vec3 bed=sand*(.78+cz*1.6*(1.-dep));",
        "vec3 tr=exp(-vec3(.42,.085,.055)*m);vec3 scat=vec3(.02,.24,.46);vec3 body=bed*tr+scat*(1.-tr);",
        "float F=.02+.98*pow(1.-clamp(dot(n,V),0.,1.),5.);vec3 sky=vec3(.58,.78,.96);vec3 c=mix(body,sky,clamp(F*1.4+.03,0.,.55));",
        // sun glare + sparkle
        "vec3 L=normalize(vec3(-.32,-.5,.8));vec3 Hh=normalize(L+V);float nh=clamp(dot(n,Hh),0.,1.);",
        "c+=vec3(1.,.93,.78)*(pow(nh,320.)*1.1+pow(nh,1400.)*9.*step(.78,n2(q*520.+T*3.)));",
        // light passing through crests
        "c+=vec3(.04,.32,.27)*smoothstep(.22,.55,h)*(.35+.4*dep);",
        // whitecaps + breaking waves rolling in + swash at the sand
        "float wc=smoothstep(.66,.86,h+(fbm(q*30.+T*.6)-.5)*.4)*dep*.7;",
        "float br=smoothstep(.72,.97,sin(d*.085+T*2.1+fbm(q*5.)*3.)*.5+.5)*(1.-smoothstep(25.,140.,d))*step(0.,d);",
        "float sw=smoothstep(16.,0.,abs(d-4.*sin(T*.9)))*.95;",
        "c=mix(c,vec3(.96,.99,1.),clamp(wc*.75+br*(.55+.35*fbm(q*40.+T))+sw,0.,1.));",
        "if(d<0.){c=mix(vec3(.72,.62,.45),sand,clamp(-d/30.,0.,1.));}",                                    // wet sand under the shore art
        "c*=K;c=c/(1.+c*.12);gl_FragColor=vec4(pow(c,vec3(.95)),1.);}"].join("\n");
      function sh(t, s) { var o = g.createShader(t); g.shaderSource(o, s); g.compileShader(o); if (!g.getShaderParameter(o, g.COMPILE_STATUS)) throw g.getShaderInfoLog(o); return o; }
      var pr = g.createProgram(); g.attachShader(pr, sh(g.VERTEX_SHADER, vs)); g.attachShader(pr, sh(g.FRAGMENT_SHADER, fs)); g.linkProgram(pr); g.useProgram(pr);
      var b = g.createBuffer(); g.bindBuffer(g.ARRAY_BUFFER, b); g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), g.STATIC_DRAW);
      var a = g.getAttribLocation(pr, "a"); g.enableVertexAttribArray(a); g.vertexAttribPointer(a, 2, g.FLOAT, false, 0, 0);
      ["R", "T", "S", "SH", "K", "C", "Z"].forEach(function (k) { U[k] = g.getUniformLocation(pr, k); }); GL = g;
    } catch (e) { GL = null; }
  })();
  function water(t, p) {
    var sy0 = HC + p; // screen y of the waterline (world y = 0)
    if (GL) { GL.viewport(0, 0, gl_c.width, gl_c.height); GL.uniform2f(U.R, gl_c.width, gl_c.height); GL.uniform1f(U.T, t); GL.uniform1f(U.S, -(p - G.wo)); GL.uniform1f(U.SH, sy0); GL.uniform1f(U.K, G.hurt > 0 ? 1.15 : 1); GL.uniform2f(U.C, CAM.x, CAM.y); GL.uniform1f(U.Z, ZOOM); GL.drawArrays(GL.TRIANGLE_STRIP, 0, 4); return; }
    var gr = cx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#0b3b5e"); gr.addColorStop(1, "#1aa3b0"); cx.fillStyle = gr; cx.fillRect(0, 0, W, H);
  }

  /* ---------- sound (synthesized with WebAudio) ---------- */
  // buses: FX (surf ambience + effects) and MUSIC (his song "Cheat Code") both feed MASTER; 🔊 mutes MASTER,
  // the small 🎵 button pauses only the music. Nothing is created until the first tap (iOS audio unlock).
  var AC = null, MASTER = null, FX = null, MUSG = null, MUS = null, SURF = null, MUTED = false, SFX_ON = true, MUSIC_ON = true, HELI = null, MUSIC_VOL = 0.18;
  /* two songs, switchable from the HUD 🎵 pill, the pause menu, Settings, the M key or controller B (../songswitch.js, short crossfade) */
  var MSW = window.SongSwitch ? SongSwitch({ key: "nalu-song", vol: MUSIC_VOL, fade: .8, songs: [{ id: "cheat", name: "Cheat Code", src: "audio/cheat-code.m4a" }, { id: "xrp", name: "Xtreme Rich Person", src: "audio/xtreme-rich-person.m4a" }],
    onTap: function () { audio(); if (AC && AC.state === "suspended") AC.resume(); musicSync(); } }) : null;
  try { MUTED = localStorage.getItem("nalu-mute") === "1"; SFX_ON = localStorage.getItem("nalu-sfx") !== "0"; MUSIC_ON = localStorage.getItem("nalu-music") !== "0"; } catch (e) {}
  function audio() {
    if (AC) return AC;
    try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    MASTER = AC.createGain(); MASTER.gain.value = MUTED ? 0 : 0.8; MASTER.connect(AC.destination);
    FX = AC.createGain(); FX.gain.value = SFX_ON ? 1 : 0; FX.connect(MASTER);
    try {   // the song is streamed through WebAudio so its volume works on iPhone (HTMLAudio volume is read-only there)
      MUSG = AC.createGain(); MUSG.gain.value = MUSIC_VOL * (MUSIC_ON ? 1 : 0); MUSG.connect(MASTER);
      if (MSW) { MSW.attach(AC, MUSG); MUS = MSW.el(); } else { MUS = new Audio(); MUS.src = "audio/cheat-code.m4a"; MUS.loop = true; MUS.preload = "auto"; MUS.setAttribute("playsinline", ""); AC.createMediaElementSource(MUS).connect(MUSG); }
    } catch (e) { MUS = null; }
    // surf: brown noise through a lowpass that swells like waves rolling in
    var len = AC.sampleRate * 4, b = AC.createBuffer(1, len, AC.sampleRate), d = b.getChannelData(0), l = 0;
    for (var i = 0; i < len; i++) { l = (l + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = l * 3.2; }
    var src = AC.createBufferSource(); src.buffer = b; src.loop = true;
    var lp = AC.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 700;
    var g = AC.createGain(); g.gain.value = 0.16; var lfo = AC.createOscillator(), lg = AC.createGain(); lfo.frequency.value = 0.11; lg.gain.value = 0.1; lfo.connect(lg); lg.connect(g.gain);
    var lf2 = AC.createOscillator(), l2 = AC.createGain(); lf2.frequency.value = 0.11; l2.gain.value = 380; lf2.connect(l2); l2.connect(lp.frequency);
    src.connect(lp); lp.connect(g); g.connect(FX); src.start(); lfo.start(); lf2.start(); SURF = g;
    // helicopter: noise chopped by a ~12 Hz blade pulse; volume set every frame
    var hs = AC.createBufferSource(); hs.buffer = b; hs.loop = true; var hl = AC.createBiquadFilter(); hl.type = "lowpass"; hl.frequency.value = 420;
    var hg = AC.createGain(); hg.gain.value = 0; var chop = AC.createGain(); chop.gain.value = 0.5; var co = AC.createOscillator(); co.type = "square"; co.frequency.value = 12; var cg = AC.createGain(); cg.gain.value = 0.5; co.connect(cg); cg.connect(chop.gain);
    hs.connect(hl); hl.connect(chop); chop.connect(hg); hg.connect(FX); hs.start(); co.start(); HELI = hg;
    return AC;
  }
  function tone(type, f0, f1, dur, vol, when) {
    if (!AC || MUTED) return; var t = AC.currentTime + (when || 0), o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(FX); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, vol, freq, when) {
    if (!AC || MUTED) return; var t = AC.currentTime + (when || 0), n = AC.createBufferSource(), b = AC.createBuffer(1, AC.sampleRate * dur, AC.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    var f = AC.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = freq || 900; var g = AC.createGain(); g.gain.value = vol;
    n.buffer = b; n.connect(f); f.connect(g); g.connect(FX); n.start(t);
  }
  // herring gull "kyow-kyow": a rising-then-falling squeal with a raspy edge, 2–4 calls
  function gullCall() {
    if (!AC || MUTED) return; var n = 2 + (Math.random() * 3 | 0), base = 1150 + Math.random() * 400;
    for (var k = 0; k < n; k++) {
      var t = AC.currentTime + k * (0.2 + Math.random() * .06), o = AC.createOscillator(), o2 = AC.createOscillator(), g = AC.createGain(), bp = AC.createBiquadFilter();
      o.type = "sawtooth"; o2.type = "sine"; bp.type = "bandpass"; bp.frequency.value = 2300; bp.Q.value = 1.4;
      o.frequency.setValueAtTime(base * .78, t); o.frequency.linearRampToValueAtTime(base * 1.35, t + .05); o.frequency.exponentialRampToValueAtTime(base * .62, t + .17);
      o2.frequency.value = 38; var vm = AC.createGain(); vm.gain.value = 60; o2.connect(vm); vm.connect(o.frequency);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(.09, t + .02); g.gain.exponentialRampToValueAtTime(0.0001, t + .18);
      o.connect(bp); bp.connect(g); g.connect(FX); o.start(t); o2.start(t); o.stop(t + .2); o2.stop(t + .2);
    }
  }
  function sfx(k) {
    if (!AC) return;
    if (k === "grab") { tone("sine", 660, 990, .12, .18); tone("triangle", 990, 1320, .1, .08, .05); }
    else if (k === "heal") { [523, 784, 1047, 1319].forEach(function (f, i) { tone("sine", f, f * 1.01, .22, .15, i * .06); }); tone("triangle", 1568, 2093, .25, .06, .24); }
    else if (k === "streak") { [523, 659, 784, 1047].forEach(function (f, i) { tone("triangle", f, f, .14, .14, i * .07); }); }
    else if (k === "hit") { noise(.35, .5, 300); tone("sine", 120, 45, .35, .4); }
    else if (k === "zap") { for (var i = 0; i < 6; i++) tone("square", 900 + Math.random() * 1600, 200, .05, .07, i * .04); }
    else if (k === "bite") { noise(.18, .5, 700); tone("sawtooth", 200, 60, .25, .25); }
    else if (k === "splash") { noise(.6, .55, 1200); noise(.9, .3, 400, .05); }
    else if (k === "air") { noise(.4, .25, 2500); tone("sine", 500, 1100, .3, .1); }
    else if (k === "egg") { [784, 988, 1175, 1568].forEach(function (f, i) { tone("sine", f, f, .2, .14, i * .09); }); }
    else if (k === "over") { [392, 330, 262].forEach(function (f, i) { tone("triangle", f, f * .98, .3, .16, i * .18); }); }
    else if (k === "wbreak") { noise(1.2, .2, 520); noise(.8, .1, 1900, .08); }                                   // a swell breaking ahead
    else if (k === "throw") { noise(.2, .32, 2800); tone("triangle", 320, 1300, .13, .12); tone("sawtooth", 190, 150, .3, .05, .02); }
    else if (k === "thud") { tone("sine", 170, 55, .22, .4); noise(.14, .35, 450); tone("square", 900, 600, .05, .05); }
    else if (k === "lunge") { noise(.4, .32, 1300); tone("sine", 320, 110, .35, .14); }
    else if (k === "roar") { tone("sawtooth", 78, 42, 1.3, .22); tone("sawtooth", 82, 46, 1.2, .16, .05); noise(1.3, .4, 240); noise(.6, .25, 1500, .1); }
    else if (k === "crash") { noise(.6, .7, 220); tone("sine", 95, 38, .5, .45); noise(.3, .3, 3000, .05); }
    else if (k === "level") { [523, 659, 784, 1047, 1319].forEach(function (f, i) { tone("triangle", f, f, .2, .15, i * .08); }); tone("sine", 1568, 1568, .5, .1, .42); }
    else if (k === "win") { [523, 659, 784, 1047, 784, 1047, 1319, 1568].forEach(function (f, i) { tone("triangle", f, f, .24, .16, i * .11); tone("sine", f / 2, f / 2, .24, .08, i * .11); }); }
  }
  function setMute(m) { MUTED = m; try { localStorage.setItem("nalu-mute", m ? "1" : "0"); } catch (e) {} if (MASTER) MASTER.gain.value = m ? 0 : .8; var b = $("nv-mute"); if (b) b.textContent = m ? "🔇" : "🔊"; musicSync(); }
  function setSfx(on) { SFX_ON = !!on; try { localStorage.setItem("nalu-sfx", on ? "1" : "0"); } catch (e) {} if (FX) FX.gain.value = on ? 1 : 0; }
  function setMusic(on) { MUSIC_ON = !!on; try { localStorage.setItem("nalu-music", on ? "1" : "0"); } catch (e) {} if (MUSG && AC) MUSG.gain.setTargetAtTime(on ? MUSIC_VOL : 0, AC.currentTime, .05); musicSync(); }
  function musicSync() { if (!MUS) return; if (MSW) { MSW.sync(MUSIC_ON && !MUTED && G && (G.running || G.over)); return; } if (MUSIC_ON && !MUTED && G && (G.running || G.over)) { var p = MUS.play(); if (p && p.catch) p.catch(function () {}); } else MUS.pause(); }
  // shared start-menu hook (../gamemenu.js): music(false) only silences the song; nothing here creates audio before a tap
  window.GAME_AUDIO = { music: function (on) { setMusic(on); }, sfx: function (on) { setSfx(on); },
    state: function () { return { hasMusic: true, hasSfx: true, music: MUSIC_ON, sfx: SFX_ON, muted: MUTED, unlocked: !!AC }; } };

  /* ---------- state ---------- */
  var G = { running: false, over: false, score: 0, best: 0, lap: 1, dir: 1, phase: "sand", hearts: 5, dmg: 0, streak: 0, mult: 1, lastGain: 0, hurt: 0, inv: 0, shake: 0,
    x: SHORE_X, yw: -230, vx: 0, ang: 0, cam: 0, lead: LEAD, t: 0, ents: [], fx: [], wake: [], gulls: [], spawn: {}, surfer: "f", runId: 0,
    level: 1, lvT: 0, rideT: 0, ammo: 0, fcd: 0, harps: [], blobs: [], boss: null, banner: null, conf: [], wo: 0, won: 0, tricks: [], trick: null, wv: null };
  try { G.best = +localStorage.getItem("nalu-best") || 0; } catch (e) {}
  // No red effects ever (Christian's feedback): the old "Cartoon red" option is gone; a wipeout is a splash and bubbles.
  var GORE = false;
  $("nv-best").textContent = G.best ? "Your best: " + G.best.toLocaleString() : "";
  function buzz(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} }
  var sy = function (yw) { return HC - (yw - G.cam); };
  var ZB = 1.35, ZOOM = ZB, CAM = { x: 200, y: 400 };   // the 2D layer and the water shader both zoom around the surfer
  /* on the sand the camera pulls back so the runner is the size of the people in the beach photo (~40 px instead of ~86 px);
     wading in, it eases back in to the paddle/ride framing over ~1.25 s, and riding in onto the sand it eases back out.
     The whole view scales (world + sprites); hitboxes and steering are unchanged. Reduced motion: it cuts. */
  var ZSAND = ZB * 40 / 86, ZTW = null; ZOOM = ZSAND;
  var SHK = { x: 0, y: 0 }, D3 = false, R3 = null;   // screen shake (shared with the 3D camera) · 3D renderer state (see "3D renderer" below)
  function zoomGoal() { if (G.phase === "cut" || G.phase === "death") return ZTW ? ZTW.to : ZOOM; return G.phase === "sand" || G.phase === "beach" || G.phase === "cut0" ? ZSAND : ZB; }
  function zoomSnap() { ZOOM = zoomGoal(); ZTW = null; }
  function zoomStep() {
    var g = zoomGoal(); if (REDUCE) { ZOOM = g; ZTW = null; return; }
    if (!ZTW || ZTW.to !== g) { if (!ZTW && Math.abs(ZOOM - g) < 1e-4) return; ZTW = { from: ZOOM, to: g, t0: G.t }; }
    var f = Math.max(0, Math.min(1, (G.t - ZTW.t0) / 1.25)), e = f < .5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;   // ease-in-out
    ZOOM = ZTW.from + (g - ZTW.from) * e; if (f >= 1) { ZOOM = g; ZTW = null; }
  }
  function camUpdate() { zoomStep(); var tx = G.x, ty = sy(G.yw); CAM.x += (tx - CAM.x) * .12; CAM.y += (ty - CAM.y) * .2; }
  function toWorld(px, py) { return { x: CAM.x + (px - CAM.x) / ZOOM, y: CAM.y + (py - CAM.y) / ZOOM }; }

  function reset() {
    G.rodeOnce = 0; G.exits = 0;
    G.score = 0; G.lap = 1; G.hearts = 5; G.dmg = 0; G.streak = 0; G.mult = 1; G.hurt = 0; G.shake = 0; G.runId++; G.posted = 0; G.planeTapped = 0; G.lastGain = G.t;
    G.level = DBG_LVL; G.ammo = 0; G.fcd = 0; G.harps = []; G.blobs = []; G.boss = null; G.bossBeat = 0; G.banner = null; G.conf = []; G.won = 0; G.finaleMsg = "";
    G.eggT = 0; if (window.ReviewEgg) ReviewEgg.reset(20, 40);   // Antidote's review billboard buoy: once a run, 20-40 s in
    if (window.Halftime) Halftime.reset();   // halftime: Antidote's Nalu Vida review reel, once a run, between levels after ~90 s
    if (DBG_HITS) { G.hearts = 5 - DBG_HITS; }
    G.hitsRun = DBG_HITS; G.resc = 0; G.rescPend = 0; G.beer = null;   // lifeguard beer rescue: once a run, on the 2nd hit
    if (DBG_RESC && !DBG_HITS) { G.hearts = 3; G.hitsRun = 2; G.rescPend = 1; }   // ?rescue=1&hits=1 instead tests the real 2nd-hit trigger
    levelStart(true);
    if (DBG_PHASE === "swim") { G.yw = 120; G.lvT = 4; toSwim(); }
    else if (DBG_PHASE === "ride" || DBG_BOSS || DBG_WAVE) { G.lvT = L().swim; G.yw = 2400; startRide(); if (DBG_BOSS && L().boss) G.rideT = L().ride - 2; }
    else if (DBG_PHASE === "ending") { G.level = 5; G.won = 1; G.bossBeat = 1; G.finaleMsg = "🏆 All 5 levels ridden"; G.lvT = L().swim; G.yw = 520; startRide(); rideIn(true); G.banner = null; }
    zoomSnap();
  }
  // every level starts on the sand in front of Nalu Vida, a run away from the water
  function levelStart(first) {
    G.phase = "sand"; G.lvT = 0; G.rideT = 0; G.dir = 1; G.lead = LEAD; G.x = SHORE_X; G.yw = -230; G.vx = 0; G.ang = 0; G.cam = G.yw + G.lead; G.wo = 0;
    G.ents = []; G.fx = []; RND.clear(); G.wake = []; G.jump = 0; G.jumpDur = 0; G.jcd = 0; G.duck = 0; G.dcd = 0; G.trick = null; G.tricks = []; G.wave = 0; G.wipe = 0; G.eng = 0; G.wv = null;
    G.pocket = 0; G.pocketT = 0; G.kick = 0; G.lip = 0; G.lipRise = 0; G.flat = 0; G.lipZone = 0; G.final = 0; G.beachT = 0; G.inv = 1; G.hint = 0; G.popT = 0;
    G.climb = 0; G.airAmp = 1; G.airPow = 0; G.airCombo = 0; G.lastAirT = -99; G.lastJumpT = -99;
    if (G.beer) { G.beer = null; if (!G.resc || DBG_RESC) G.rescPend = 1; }
    G.spawn = { food: 2.5, haz: 3.5, set: 2.6, hb: 9, boat: 12, heli: 20, plane: first ? 24 : 40, buoy: 28, harp: G.level > 1 ? 6 : 14, rock: 6, ski: 12, pier: 5, ray: 7, fish: 8, kit: 12 };
    banner("LEVEL " + G.level, L().sub, G.level === 1 ? "RUN IN · PADDLE OUT · RIDE IT HOME" : first ? "TEST START" : "BACK OUT FOR LEVEL " + G.level);
    sfx("level"); radio(first ? "Lifeguard on duty. Paddle out past the break!" : "Back out you go. Level " + G.level + "!", { tone: "info", ms: 2400 });
    zoomSnap();
  }
  function L() { return LV[G.level] || LV[5]; }
  function speed() {
    var P = L();
    if (G.phase === "sand" || G.phase === "beach") return 0;   // runs are scripted
    if (G.phase === "swim") return (80 + 4 * (G.level - 1)) * (G.duck > 0 ? .5 : 1);
    if (G.phase === "ride" || G.phase === "victory") return (165 + 12 * (G.level - 1)) * P.spd * (G.boss ? .8 : 1) * (G.flat ? .72 : 1);
    if (G.phase === "ridein") return 190;
    return 0;
  }
  function inWater() { return G.phase === "swim" || G.phase === "ride"; }

  /* ---------- spawning ---------- */
  var FOOD = [["raft_taco", "Island Tacos", 100], ["raft_burger", "Smash-N-Stack", 150], ["raft_shrimp", "Coconut Shrimp", 150], ["raft_oysters", "$2 Oysters", 200], ["raft_mimosa", "Mimosa", 120], ["raft_fries", "Jungle Fries", 120]];
  function ahead(d) { return G.yw + G.dir * d; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[(Math.random() * a.length) | 0]; }
  // a free x lane: clear of the pier stub while it's on screen
  function laneX() { var x = rnd(30, W - 30); if (G.yw < STUB + 400 && Math.abs(x - PIER_X) < PIER_W / 2 + 22) x += (x < PIER_X ? -1 : 1) * (PIER_W / 2 + 26); return x; }
  function add(o) { G.ents.push(o); return o; }
  function food(x, yw, extra) { var f = pick(FOOD); if (Math.random() < 0.06) f = ["raft_burger", "Golden Poke Bowl", 500, 1]; return add(Object.assign({ t: "food", k: f[0], name: f[1], pts: f[2], gold: f[3], x: x, yw: yw, r: 22, bob: Math.random() * 6 }, extra || {})); }
  function shark(x, y) { add({ t: "shark", x: x, yw: y, r: 20, st: "fin", vx: 0, vy: 0, lunge: 0, hp: G.level >= 4 ? 3 : 2 }); }
  function ray(x, y) { var fromL = x == null ? Math.random() < .5 : x < W / 2;
    add({ t: "ray", x: x == null ? (fromL ? -40 : W + 40) : x, yw: y, r: 19, vx: (fromL ? 1 : -1) * rnd(55, 95) * (1 + .08 * (G.level - 1)), ph: Math.random() * 6, sub: 0 });
    radioOnce("ray", "Stingrays in the water — steer around them!", { tone: "warn" }); }
  function hazard() {
    var P = L(), r = Math.random(), x = laneX(), y = ahead(H * 0.75), sh = G.boss ? 0 : P.shark;
    if (G.phase === "swim") {   // the paddle-out: mostly stingrays, the odd jellyfish, a RARE shark further out
      if (r < P.ss && G.yw > 600 && !G.ents.some(function (e) { return e.t === "shark"; })) shark(x, y);
      else if (r < .74) ray(null, y);
      else { add({ t: "jelly", x: x, yw: y, r: 17, ph: Math.random() * 6 }); radioOnce("jelly", "Jellyfish ahead!", { tone: "warn" }); }
      if (Math.random() < P.sray) ray(null, y + G.dir * rnd(80, 140));   // later levels: a second stingray glides through
      return;
    }
    // the ride in: a shark now and then (a pair from level 4), never more than two in the water
    if (G.ents.filter(function (e) { return e.t === "shark" && e.st !== "gone" && e.st !== "flee"; }).length >= 2) return;
    shark(x, y); if (Math.random() < P.pack) add({ t: "shark", x: x < W / 2 ? x + rnd(110, 160) : x - rnd(110, 160), yw: y + G.dir * rnd(140, 200), r: 20, st: "fin", vx: 0, vy: 0, lunge: 0, hp: 2 });
  }
  function boat() { radioOnce("help", "Help's on the way! Grab the boat toss.", { tone: "info" }); var fromL = Math.random() < .5; add({ t: "boat", x: fromL ? -70 : W + 70, yw: ahead(H * 0.42), vx: fromL ? 95 : -95, r: 34, toss: 0.6 }); }
  // the fisherman (paddle-out): his boat idles across up ahead, hunting a shark that cruises between him and you. He lines
  // up on the fin (an orange aim line shows where it's going) and fires; a miss keeps going, straight through your lane.
  // Steer off the line or duck-dive under it. 2 shots (3 from level 3). His boat never hurts you; it nudges you aside.
  function hboat() { var fromL = G.x > W / 2;
    var q = add({ t: "qfin", x: fromL ? rnd(W * .55, W * .8) : rnd(W * .2, W * .45), yw: ahead(rnd(88, 98)), r: 0, vx: (fromL ? -1 : 1) * rnd(16, 26), ph: 0, leave: 0 });
    add({ t: "boat", hunt: 1, x: fromL ? -70 : W + 70, yw: ahead(178), vx: fromL ? 50 : -50, r: 34, shots: G.level >= 3 ? 3 : 2, cd: 1.3, aim: 0, q: q });
    radio("Fisherman out there hunting a shark. Watch for stray harpoons!", { tone: "warn", pri: 2, ms: 2600 }); }
  function heli() { radioOnce("help", "Help's on the way! Chopper drop incoming.", { tone: "info" }); var fromL = Math.random() < .5; add({ t: "heli", x: fromL ? -60 : W + 60, yw: ahead(H * 0.3), vx: fromL ? 110 : -110, drops: 3, dt: 0.7, sky: 1 }); }
  function plane() { var fromR = Math.random() < .5; add({ t: "plane", x: fromR ? W + 60 : -330, y: rnd(70, 150), vx: fromR ? -70 : 70, sky: 1, scr: 1 }); }
  // a breaking wave rolling in toward the sand while you paddle out: duck-dive under it (JUMP) or get engulfed
  function set() { add({ t: "brk", x: W / 2, yw: ahead(H * 0.72), vy: -(95 + 8 * (G.level - 1)), hit: 0, ph: Math.random() * 6 }); radioOnce("set", "Wave coming! Tap JUMP to duck-dive under it.", { tone: "warn" }); }
  // a section of the Venice Pier drifting in from one side: it starts off-screen at the edge and juts diagonally
  // across your line toward the middle (and a bit past). JUMP it, or ride the far side of it.
  function pierSection() { var fromL = Math.random() < .5, ya = ahead(H * 0.78), len = rnd(640, 820);
    add({ t: "pier", x: W / 2, yw: ya, yb: ya + G.dir * len, xa: fromL ? -40 : W + 40, xb: fromL ? rnd(W * .7, W * .8) : rnd(W * .2, W * .3), r: 0 });
    radioOnce("pier", "Pier coming across — jump it!", { tone: "warn" }); }
  // the pier's centre x at world row yw (null if this section doesn't reach that row)
  function pierX(e, yw) { var f = (yw - e.yw) / (e.yb - e.yw); if (f < 0 || f > 1) return null; return e.xa + (e.xb - e.xa) * f; }
  // rocks: single boulder clusters, or a jetty (a short breakwater) sticking out from one side. Boss sharks smash into them.
  function rock(x, yw, r, jet) { var bs = [], n = 3 + (Math.random() * 2 | 0);
    for (var i = 0; i < n; i++) { var br = r * (i ? rnd(.42, .62) : rnd(.62, .78)), a = i * 2.4 + rnd(-.4, .4), d = i ? r * rnd(.35, .6) : 0, pts = [];
      for (var k = 0; k < 9; k++) pts.push(br * rnd(.78, 1.08)); bs.push({ dx: Math.cos(a) * d, dy: Math.sin(a) * d * .8, r: br, pts: pts, sh: rnd(-.08, .08) }); }
    return add({ t: "rock", x: x, yw: yw, r: r, bs: bs, jet: jet, ph: Math.random() * 6 }); }
  function rockSpot() { return rnd(34, W - 34); }
  function rocks() {
    var y = ahead(H * 0.78);
    if (G.level >= 3 && Math.random() < .3) { var left = Math.random() < .5, n = 4 + (Math.random() * 2 | 0); for (var i = 0; i < n; i++) rock(left ? 14 + i * 27 : W - 14 - i * 27, y + rnd(-6, 6), rnd(17, 22), 1); }
    else rock(rockSpot(), y, rnd(22, 30)); }
  function harpPick(x, yw) { return add({ t: "harpoon", x: x, yw: yw, r: 20, bob: Math.random() * 6 }); }
  // lifeguard on a rescue jet ski: crosses the screen and tosses you a harpoon bundle
  function ski() { var fromL = G.x > W / 2; add({ t: "ski", x: fromL ? -50 : W + 50, yw: ahead(rnd(150, 230)), vx: fromL ? 160 : -160, tossed: 0, sky: 0 }); }
  // 🩹 a floating first-aid kit on the ride back in, set on the clean side of the wave for when you reach it (+1 ❤️)
  function healthKit() {
    var w = G.wv, x = Math.max(40, Math.min(W - 40, G.x + rnd(-90, 90))), d = H * .55, t = d / Math.max(60, speed());
    if (w) { var lo = w.px + w.pd * (w.sp * t + 60); if (w.pd > 0 ? x < lo : x > lo) x = Math.max(40, Math.min(W - 40, lo + w.pd * rnd(10, 60))); }
    add({ t: "hkit", x: x, yw: ahead(d), r: 18, bob: Math.random() * 6 });
    radioOnce("kit", "Health kit floating ahead — ride through it!", { tone: "info", ms: 2200 });
  }
  function gull() { var fromL = Math.random() < .5; G.gulls.push({ x: fromL ? -30 : W + 30, y: rnd(40, H - 60), vx: (fromL ? 1 : -1) * rnd(60, 110), vy: rnd(-12, 12), f: Math.random() * 6 }); }

  /* ---------- scoring ---------- */
  function pop(x, y, txt, col, big) { G.fx.push({ k: "txt", x: x, y: y, t: 0, txt: txt, col: col || "#fff", big: big }); }
  function gain(base, x, y, label) {
    if (G.t - G.lastGain > 4) G.streak = 0;
    G.streak++; G.lastGain = G.t;
    var m = 1 + Math.floor(G.streak / 4);
    if (m > G.mult) { G.mult = m; milestone(m); }
    G.mult = m; var pts = base * G.mult; G.score += pts;
    pop(x, y, "+" + pts.toLocaleString() + (label ? " " + label : ""), G.mult > 1 ? "#ffd23f" : "#fff"); sfx(/AIR|LIP|LANDING|COMBO/.test(label || "") ? "air" : "grab");
  }
  function milestone(m) {
    var el = $("nv-mult"); el.animate && el.animate([{ transform: "scale(1.6)" }, { transform: "scale(1)" }], { duration: 380 });
    pop(W / 2, H * 0.38, "STREAK ×" + m + "!", "#ffd23f", 1); buzz(30); sfx("streak");
    if (RA) { if (m === 2 || m % 2 === 1) radio(pick(["Nice ride! ×" + m, "You're on fire! ×" + m, "Keep it going! ×" + m]), { tone: "info", ms: 2200 }); }
    else if (m === 2 || m % 2 === 1) toast(Math.random() < .5 ? "lifeguard_f" : "lifeguard_m", pick(["Nice ride! ×" + m, "You're on fire! ×" + m, "Keep it going! ×" + m, "Lifeguards are watching 👀 ×" + m]));
  }
  var tt = 0;
  function toast(img, t) { var e = $("nv-toast"), i = $("nv-toast-img"); if (ok(IM[img])) { i.src = IM[img].src; i.style.display = ""; } else i.style.display = "none"; $("nv-toast-t").textContent = t; e.classList.add("on"); clearTimeout(tt); tt = setTimeout(function () { e.classList.remove("on"); }, 1800); }
  /* hearts come in halves: washed by the wave / whitewater or hit by the falling lip = ½ ❤️, (boss bites removed: no bosses),
     everything else (pier, sharks, stingrays, eels, jellies, rocks, a bail) = 1 ❤️. Game over at 0. */
  function hurt(why, cause, amt) {
    if (G.inv > 0 || !inWater() || G.jump > 0.06) return false;
    cause = cause || (/SHARK/.test(why) ? "shark" : /EEL/.test(why) ? "eel" : /STINGRAY/.test(why) ? "ray" : "wave");
    if (DBG_GOD) { G.inv = 1; G.streak = 0; G.mult = 1; pop(G.x, sy(G.yw) - 30, why, "#ff6b6b"); return true; }
    amt = amt || 1; G.hearts = Math.max(0, Math.round((G.hearts - amt) * 2) / 2);
    G.inv = 1.6; G.hurt = 0.35; G.shake = 10; G.streak = 0; G.mult = 1; G.eng = 0; G.trick = null; G.tricks = []; buzz([60, 40, 90]);
    pop(G.x, sy(G.yw) - 30, why, "#ff6b6b", 1); sfx(cause === "wave" ? "hit" : "splash");
    if (G.hearts <= 0) { die(cause); return true; }
    if (++G.hitsRun === 2 && !G.resc) G.rescPend = 1;   // 2nd hit: the lifeguard throws a rescue (rescueStep picks a safe moment)
    if (G.hearts <= 1) radio("Last heart! Easy out there.", { tone: "warn", ms: 2400, pri: 2 });
    G.wipe = .9; G.fx.push({ k: "washover", x: G.x, y: sy(G.yw), t: 0 });          // wipeout: the wave rolls over you
    return true;
  }
  function die(cause) {
    if (cause === "eel" || cause === "shark") cause = "ray";   // family version: every sea-life wipeout ends the same mild way (splash + bubbles, no zap/x-ray, no shark swim-by)
    G.beer = null; G.rescPend = 0;
    G.deathPaddle = G.phase === "swim"; G.boss = null; G.blobs = []; G.harps = []; G.phase = "death"; G.deathT = 0; G.deathCause = cause; G.deathX = G.x; G.deathYw = G.yw; G.jump = 0; G.wipe = 0; G.duck = 0; G.trick = null;
    G.shake = 8; buzz([100, 60, 160]); sfx("over"); if (cause !== "wave") sfx("splash");
    radio("Out of the water! Come grab a bite and try again.", { tone: "warn", ms: 3400, pri: 2 });
    if (cause === "shark") add({ t: "shark", x: G.x - 70, yw: G.yw + G.dir * 50, r: 0, st: "lunge", vx: 260, vy: -G.dir * 120, lunge: 0, dead: 1 });
    G.finaleMsg = cause === "wave" ? "🌊 The Nalu Vida crew pulled you in" : "🌊 Wiped out · the lifeguards paddled you in";
  }
  function deathStep(dt) {
    G.deathT += dt;
    G.ents.forEach(function (e) { if (e.dead) { e.x += e.vx * dt; e.yw += e.vy * dt; } });
    if (Math.random() < dt * 16) G.fx.push({ k: "bubble", x: G.deathX + rnd(-30, 30), y: sy(G.deathYw) + rnd(-24, 24), t: 0 });
    G.cam += (G.yw + G.lead - G.cam) * Math.min(1, dt * 3); tickEnts(dt);
    if (G.deathT > 3.1) end();
  }


  /* ---------- 🛟 lifeguard beer rescue (Christian) ----------
     On the surfer's 2nd hit of a run (once a run), the lifeguard pops up ("You're hurt! Here — catch this! 🍺") and throws a
     cold beer from a random spot along the top of the screen, never the same spot twice in a row (the last few launch spots
     are kept, each new one at least 25% of the width away), fast (about 1.8× pickup speed), toward a catch ring near the
     surfer. Catch it: +1 heart, one bruise / a step of red comes off. Miss: no second chance that run.
     Never during a boss intro, a banner, the halftime, the ride-in / level-end cutscene, or with a pier section or a
     charging boss in the way; hazards near the catch ring are cleared and new ones held back while it flies.
     NOTE: the beer is only a health-pickup visual inside the game (it restores a heart). It is NOT a prize or reward and is
     never redeemable, so the no-free-alcohol-reward rule (Cal. Bus. & Prof. Code 25600) is not affected. */
  var RESC_SPOTS = [];   // last launch x positions (kept across runs)
  function rescueSpot() {
    var lo = 36, hi = W - 36, gap = W * .25, x, i, tries;
    for (tries = 0; tries < 40; tries++) {
      x = rnd(lo, hi); var okSpot = true;
      for (i = 0; i < RESC_SPOTS.length && i < (tries < 25 ? 2 : 1); i++) if (Math.abs(x - RESC_SPOTS[i]) < gap) okSpot = false;
      if (okSpot) break;
    }
    if (RESC_SPOTS.length && Math.abs(x - RESC_SPOTS[0]) < gap) x = RESC_SPOTS[0] < W / 2 ? Math.min(hi, RESC_SPOTS[0] + gap + rnd(0, 40)) : Math.max(lo, RESC_SPOTS[0] - gap - rnd(0, 40));
    RESC_SPOTS.unshift(x); RESC_SPOTS.length = Math.min(RESC_SPOTS.length, 4); return x;
  }
  function rescueOk() {
    if (!G.running || !(G.phase === "swim" || G.phase === "ride")) return false;            // no ride-in / beach / cutscene / halftime
    if (G.banner || G.wipe > 0 || G.jump > 0) return false;                                    // level or boss intro banner up, mid-wipeout
    var b = G.boss; if (b && b.st !== "stalk" && b.st !== "return") return false;            // boss entering / charging / diving
    for (var i = 0; i < G.ents.length; i++) { var e = G.ents[i]; if (e.t !== "pier") continue;   // a pier section near the surfer
      for (var k = -1; k <= 1; k++) { var px = pierX(e, G.yw + k * 160); if (px != null && Math.abs(px - G.x) < 110) return false; } }
    return true;
  }
  function rescueClear(tx) {   // nothing unavoidable between the surfer and the catch ring
    G.ents = G.ents.filter(function (e) { if (e.t === "brk") return e.hit || (e.yw - G.yw) * G.dir > 520;   // an incoming set wave would force a duck-dive
      if (!/^(shark|eel|jelly|ray|rock|boat)$/.test(e.t)) return true; var dy = Math.abs(e.yw - G.yw);
      return !(dy < 300 && (Math.abs(e.x - tx) < 150 || Math.abs(e.x - G.x) < 150)); });
    G.blobs = [];
  }
  function rescueLaunch() {
    var tx = Math.max(34, Math.min(W - 34, G.x + rnd(-45, 45))), sx = rescueSpot();
    G.resc = 1; G.rescPend = 0; rescueClear(tx);
    G.beer = { st: "wind", t: 0, sx: sx, tx: tx, x: sx, y: 0, rot: 0 };
    radio("You're hurt! Here — catch this! 🍺", { tone: "warn", ms: 2600, pri: 3 });
  }
  function rescueStep(dt) {
    if (G.rescPend && !G.beer && rescueOk()) rescueLaunch();
    var b = G.beer; if (!b) return;
    b.t += dt; G.spawn.haz = Math.max(G.spawn.haz || 0, .6); G.spawn.sub = Math.max(G.spawn.sub || 0, 1.5); G.spawn.rock = Math.max(G.spawn.rock || 0, .6); G.spawn.set = Math.max(G.spawn.set || 0, 1.2);   // hold new hazards + set waves back while it flies
    var top = toWorld(0, 0).y - 24, ty = sy(G.yw);
    if (b.st === "wind") {   // the line shows, the catch ring appears, then the throw
      b.x = b.sx; b.y = top;
      if (b.t >= .7) { b.st = "fly"; b.t = 0; var v = Math.max(300, (REDUCE ? 1.6 : 1.8) * Math.max(165, speed())), dx = b.tx - b.x, dy = ty - b.y, l = Math.hypot(dx, dy) || 1; b.vx = dx / l * v; b.vy = dy / l * v; sfx("grab"); }
      return;
    }
    var ox = b.x, oy = b.y; b.x += b.vx * dt; b.y += b.vy * dt; if (!REDUCE) b.rot += dt * 9;
    // swept catch: the closest point of this frame's path to the surfer
    var px = G.x, py = ty, ax = b.x - ox, ay = b.y - oy, ll = ax * ax + ay * ay, f = ll ? Math.max(0, Math.min(1, ((px - ox) * ax + (py - oy) * ay) / ll)) : 0,
      cxp = ox + ax * f, cyp = oy + ay * f;
    if (Math.hypot(cxp - px, cyp - py) < 30 && G.duck <= 0) {
      G.beer = null; G.hearts = Math.min(5, G.hearts + 1); G.dmg = Math.max(0, G.dmg - 1); G.hurt = 0;   // damage steps back: less red, fewer bruises
      pop(G.x, ty - 40, "+1 ❤️ COLD ONE!", "#7dffb0", 1); G.fx.push({ k: "ring", x: G.x, y: ty, t: 0 }); sfx("grab"); buzz([20, 30, 40]);
      if (RA) RA.clear();   // the outcome cuts the "catch this" line short
      radio("Ahh, refreshing! Back on the board 🏄", { tone: "win", ms: 2600, pri: 3 }); return;
    }
    if (b.y > ty + 70 || b.x < -60 || b.x > W + 60) {
      G.beer = null; G.fx.push({ k: "wsplash", x: b.tx, y: ty + 20, t: 0 }); sfx("splash");
      if (RA) RA.clear();   // the outcome cuts the "catch this" line short
      radio("Missed it! Watch the waves.", { tone: "warn", ms: 2400, pri: 3 });
    }
  }
  // a frosty amber beer bottle with a big green ➕ badge, drawn in code (no image file)
  function drawBeerBottle(x, y, rot, s) {
    cx.save(); cx.translate(x, y); cx.rotate(rot); cx.scale(s, s);
    if (!REDUCE) { var gl2 = cx.createRadialGradient(0, 0, 4, 0, 0, 34); gl2.addColorStop(0, "rgba(190,240,255,.55)"); gl2.addColorStop(1, "rgba(190,240,255,0)"); cx.fillStyle = gl2; cx.beginPath(); cx.arc(0, 0, 34, 0, 7); cx.fill(); }
    cx.lineJoin = "round"; cx.lineWidth = 2.2; cx.strokeStyle = "#2a1300";
    var bg = cx.createLinearGradient(-9, 0, 9, 0); bg.addColorStop(0, "#5a2a05"); bg.addColorStop(.35, "#c76a12"); bg.addColorStop(.6, "#e88a22"); bg.addColorStop(1, "#6b3307");
    cx.fillStyle = bg; cx.beginPath();   // body + shoulders + neck
    cx.moveTo(-9, 20); cx.lineTo(-9, -2); cx.quadraticCurveTo(-9, -9, -4, -12); cx.lineTo(-4, -22); cx.lineTo(4, -22); cx.lineTo(4, -12); cx.quadraticCurveTo(9, -9, 9, -2); cx.lineTo(9, 20); cx.quadraticCurveTo(9, 23, 6, 23); cx.lineTo(-6, 23); cx.quadraticCurveTo(-9, 23, -9, 20); cx.closePath(); cx.fill(); cx.stroke();
    cx.fillStyle = "#e9c046"; cx.fillRect(-5, -26, 10, 5); cx.strokeRect(-5, -26, 10, 5);   // gold cap
    cx.fillStyle = "#fdf8ef"; cx.fillRect(-9, 2, 18, 11); cx.strokeRect(-9, 2, 18, 11);   // label
    cx.fillStyle = "#0b2e52"; cx.font = "900 6px system-ui,sans-serif"; cx.textAlign = "center"; cx.fillText("NALU", 0, 10);
    cx.fillStyle = "rgba(255,255,255,.75)"; cx.fillRect(-6, -6, 2.2, 7); cx.fillRect(-6, 15, 2.2, 5);   // frost shine + droplets
    cx.beginPath(); cx.arc(5, -4, 1.3, 0, 7); cx.arc(6, 17, 1.1, 0, 7); cx.arc(-3, 19, 1, 0, 7); cx.fill();
    cx.restore();
    // the big green plus badge stays upright so it always reads as "health"
    cx.save(); cx.translate(x + 13 * s, y - 13 * s); cx.scale(s, s);
    cx.fillStyle = "#18b45b"; cx.strokeStyle = "#fff"; cx.lineWidth = 2.5; cx.beginPath(); cx.arc(0, 0, 10.5, 0, 7); cx.fill(); cx.stroke();
    cx.fillStyle = "#fff"; cx.fillRect(-6.5, -2.2, 13, 4.4); cx.fillRect(-2.2, -6.5, 4.4, 13);
    cx.restore();
  }
  function drawRescue() {
    var b = G.beer; if (!b || !(G.phase === "swim" || G.phase === "ride" || G.phase === "ridein")) return;
    var ty = sy(G.yw), pulse = REDUCE ? 1 : 1 + .08 * Math.sin(G.t * 10);
    cx.save(); cx.setLineDash([6, 5]); cx.lineWidth = 3; cx.strokeStyle = "rgba(125,255,176,.9)"; cx.beginPath(); cx.arc(b.tx, ty, 26 * pulse, 0, 7); cx.stroke(); cx.setLineDash([]);
    cx.globalAlpha = .9; cx.font = "900 12px system-ui,sans-serif"; cx.textAlign = "center"; cx.lineWidth = 3.5; cx.strokeStyle = "rgba(5,18,34,.8)"; cx.strokeText("CATCH!", b.tx, ty + 44); cx.fillStyle = "#7dffb0"; cx.fillText("CATCH!", b.tx, ty + 44); cx.restore();
    if (D3) return;
    if (b.st === "wind") { cx.save(); cx.globalAlpha = REDUCE ? 1 : .6 + .4 * Math.sin(G.t * 14); drawBeerBottle(b.x, b.y + 30, 0, 1.15); cx.restore(); return; }
    if (!REDUCE) { cx.save(); cx.globalAlpha = .35; cx.strokeStyle = "#bff3ff"; cx.lineWidth = 6; cx.lineCap = "round"; cx.beginPath(); cx.moveTo(b.x, b.y); cx.lineTo(b.x - b.vx * .06, b.y - b.vy * .06); cx.stroke(); cx.restore(); }
    drawBeerBottle(b.x, b.y, b.rot, 1.3);
  }

  /* ---------- update ---------- */
  function update(dt) {
    G.t += dt; if (G.inv > 0) G.inv -= dt; if (G.hurt > 0) G.hurt -= dt; if (G.heal > 0) G.heal -= dt; if (G.shake > 0) G.shake *= 0.86;
    if (G.fcd > 0) G.fcd -= dt; if (G.banner) { G.banner.t += dt; if (G.banner.t > G.banner.dur) G.banner = null; }
    if (G.phase === "cut" || G.phase === "cut0") return;
    if (G.phase === "sand") return sandStep(dt);
    if (G.phase === "popup") return popStep(dt);
    if (G.phase === "beach") return beachStep(dt);
    if (G.phase === "death") return deathStep(dt);
    if (G.phase === "victory") return victoryStep(dt);
    if (G.wipe > 0) G.wipe -= dt;
    rescueStep(dt);
    if (G.tutPend && G.phase === "ride") { G.tutPend = 0; rideTutorial(); return; }
    if (DBG_BOT || DBG_WASH) bot(dt);
    var v = speed(), P = L(), swim = G.phase === "swim", riding = G.phase === "ride", rin = G.phase === "ridein";
    G.yw += G.dir * v * dt; G.eggT += dt; G.lvT += dt;
    if (riding) { G.rideT += dt; if (G.yw < 1500) wrapWorld(2400); }   // the ride never runs out of ocean; the ride-in brings the sand back
    if (swim && G.lvT >= P.swim) { popUp(); return; }
    if (riding && !G.boss && G.rideT >= P.ride) { if (G.level >= 5) { G.won = 1; G.finaleMsg = "🏆 All 5 levels ridden"; var fb = 5000; G.score += fb; pop(W / 2, H * .3, "+" + fb.toLocaleString() + " FINAL RIDE!", "#ffd23f", 1); confetti(60); rideIn(true); } else rideIn(false); return; }
    if (rin && G.yw <= 40) { toBeach(); return; }
    if (SURF && AC) { var nearP = G.yw > -40 && G.yw < STUB ? Math.max(0, 1 - Math.abs(G.x - PIER_X) / 170) : 0; SURF.gain.setTargetAtTime(.15 + .14 * nearP + (swim ? .06 : 0), AC.currentTime, .3); }
    if (MUSG && AC && MUSIC_ON) MUSG.gain.setTargetAtTime(G.boss ? MUSIC_VOL * .6 : MUSIC_VOL, AC.currentTime, .5);
    if (G.hint > 0) G.hint -= dt; if (G.jcd > 0) G.jcd -= dt; if (G.wave > 0) G.wave -= dt; if (G.dcd > 0) G.dcd -= dt;
    if (G.duck > 0) { G.duck -= dt; if (Math.random() < dt * 20) G.fx.push({ k: "bubble", x: G.x + rnd(-14, 14), y: sy(G.yw) + rnd(-18, 18), t: 0 }); }
    if (G.jump > 0) { G.jump -= dt; trickStep(dt); if (G.jump <= 0) { G.jump = 0; land(); } }
    // steering (the ride-in steers itself up the beach to Nalu Vida)
    if (rin) { G.x += (SHORE_X - G.x) * Math.min(1, dt * 1.6); G.vx *= .9; }
    else { G.x += G.vx * dt; G.vx *= Math.pow(0.0009, dt); G.x = Math.max(16, Math.min(W - 16, G.x)); }
    var base = G.dir > 0 ? 0 : Math.PI;
    var amax = riding ? .85 : .5;   // riding: the board swings further across the face (carving the wave, not a flat sticker)
    G.ang += (base + Math.max(-amax, Math.min(amax, G.vx / (riding ? 300 : 420))) * G.dir - G.ang) * Math.min(1, dt * 8);
    G.lead += ((G.dir > 0 ? LEAD : -RLEAD) - G.lead) * Math.min(1, dt * 2.5);
    G.cam = G.yw + G.lead;
    if (riding) G.score += Math.round(v * dt * 0.05 * G.mult * 100) / 100;
    if (Math.random() < 0.9) G.wake.push({ x: G.x + rnd(-4, 4), yw: G.yw - G.dir * (swim ? 22 : 18), t: 0, s: swim ? rnd(2, 4) : rnd(3, 6) });
    if (riding && !G.boss) pocketStep(dt);
    pierStep();
    if (G.phase !== "ride" && G.phase !== "swim" && G.phase !== "ridein") return;   // a hit ended the run
    // spawns
    var S = G.spawn, lv = G.level;
    for (var sk in S) S[sk] -= dt;
    if (swim) {   // the paddle-out: sets to duck-dive, the fisherman's boat, food, stingrays, a rare shark
      if (S.set <= 0) { set(); S.set = G.dblNext ? .95 : rnd(P.set[0], P.set[1]); G.dblNext = !G.dblNext && Math.random() < P.dbl; if (G.dblNext) S.set = .95; }
      if (S.hb <= 0) { if (G.ents.some(function (e) { return e.t === "boat"; })) S.hb = 1.5; else { hboat(); S.hb = rnd(P.hb[0], P.hb[1]); } }
      if (S.food <= 0) { food(laneX(), ahead(H * 0.75)); S.food = rnd(4.2, 6); }
      if (S.haz <= 0) { hazard(); S.haz = rnd(3.2, 4.4) / P.haz; }
      if (S.fish <= 0) { fish(); S.fish = rnd(13, 18); }
      if (S.buoy <= 0 && G.hearts < 4) { add({ t: "buoy", x: laneX(), yw: ahead(H * 0.75), r: 16 }); S.buoy = rnd(30, 45); }
      if (window.ReviewEgg && ReviewEgg.due(G.eggT * 1000)) add({ t: "rsign", x: Math.max(70, Math.min(W - 70, laneX())), yw: ahead(H * 0.75), r: 30, bob: Math.random() * 6 });
      if (S.plane <= 0) { plane(); S.plane = rnd(40, 55); }
    } else if (riding) {   // the ride in: just you and the wave (Antidote: no objects in the water to distract you) + the odd health kit
      if (G.hearts >= 5) S.kit = Math.max(S.kit, 10);   // only while you're hurt: ~10 s after a knock, then every 20–30 s
      else if (S.kit <= 0) { if (!G.ents.some(function (e) { return e.t === "hkit"; })) healthKit(); S.kit = rnd(20, 30); }
    }
    if (Math.random() < dt * 0.35 && G.gulls.length < 5) gull();
    // entities
    var py = sy(G.yw);
    for (var i = G.ents.length - 1; i >= 0; i--) {
      var e = G.ents[i], ey;
      if (e.t === "shark") {
        var dy = (e.yw - G.yw) * G.dir;
        if (e.st === "fin" && dy < (swim ? 260 : 300) && dy > 0) { e.st = "warn"; e.wt = 2.3; e.pw = 0; e.hold = Math.max(170, Math.min(240, dy)); buzz(15);
          if (RA && RA.clear) RA.clear(); radio("🦈 Here comes a shark, be careful!", { tone: "warn", pri: 3, ms: 2300 }); sfx("lunge"); }
        if (e.fl > 0) e.fl -= dt;
        if (e.st === "warn") { e.wt -= dt; e.pw += dt;   // powering up: it keeps pace out ahead of you and drifts toward your line
          e.yw = G.yw + G.dir * e.hold; e.x += (G.x - e.x) * Math.min(1, dt * .9);
          var ys0 = sy(e.yw), yLo = toWorld(0, H - 170).y, yHi = toWorld(0, 205).y;   // keep it in full view (zoomed camera): clear of the buttons and the HUD
          if (ys0 > yLo) e.yw += ys0 - yLo; else if (ys0 < yHi) e.yw -= yHi - ys0;
          if (e.wt <= 0) { e.st = "lunge"; sfx("lunge"); buzz([30, 30, 60]); var ls = L().lunge * (swim ? .7 : .85), ax = G.x - e.x, ay = G.yw - e.yw, l = Math.hypot(ax, ay) || 1; e.vx = ax / l * ls; e.vy = ay / l * ls; } }
        if (e.st === "flee") { e.x += e.vx * dt; e.yw += e.vy * dt; e.ft += dt; if (e.ft > 1.3) { G.ents.splice(i, 1); continue; } }
        if (e.st === "lunge") { e.x += e.vx * dt; e.yw += e.vy * dt; e.lunge += dt; if (e.lunge > 0.9) e.st = "gone"; }
        else if (e.st === "gone") { e.yw += e.vy * dt * .5; e.x += e.vx * dt * .5; }
      } else if (e.t === "eel") { e.x += e.sp * dt; e.ph += dt; e.yw = e.base + Math.sin(e.ph * 2.2) * 26; e.zap = Math.sin(e.ph * 4.2) > 0.25; }
      else if (e.t === "jelly") { e.ph += dt; e.x += Math.sin(e.ph * .8) * 12 * dt; }
      else if (e.t === "ray") { e.ph += dt; e.x += e.vx * dt; e.yw += Math.sin(e.ph * 1.3) * 18 * dt * G.dir; e.sub = .5 + .5 * Math.sin(e.ph * .9); }
      else if (e.t === "brk") { e.yw += e.vy * dt; e.ph += dt; }
      else if (e.t === "boat" && e.hunt) { e.x += e.vx * dt; if (swim) e.yw = Math.max(e.yw, G.yw + 176);   // keeps out ahead of you while it crosses
        var q = e.q, on = e.x > 36 && e.x < W - 36;
        if (q && !q.leave && e.shots > 0 && on) { if (e.aim > 0) { e.aim -= dt; if (e.aim <= 0) { var hx = q.x - e.x, hy = q.yw - e.yw, hl = Math.hypot(hx, hy) || 1, hv = 235 + 12 * (G.level - 1);
                add({ t: "sharp", x: e.x + hx / hl * 30, yw: e.yw + hy / hl * 30, vx: hx / hl * hv, vy: hy / hl * hv, r: 6 }); RND.fire(e.x + hx / hl * 30, e.yw + hy / hl * 30, hx, hy); sfx("lunge"); buzz(12); e.shots--; e.cd = 1.15; } }
            else { e.cd -= dt; if (e.cd <= 0) { e.aim = .85; e.ax = q.x; e.ayw = q.yw; } } }
        if (e.aim > 0 && q) { e.ax = q.x; e.ayw = q.yw; }
        if (q && (e.shots <= 0 || !on && e.shots < (G.level >= 3 ? 3 : 2))) q.leave = 1; }
      else if (e.t === "qfin") { e.ph += dt; e.x += e.vx * dt + Math.sin(e.ph * 1.4) * 14 * dt + (G.x - e.x) * .25 * dt; if (swim && !e.leave) e.yw = G.yw + G.dir * (92 + Math.sin(e.ph * .9) * 7);
        if (e.x < 40 || e.x > W - 40) e.vx = -e.vx; if (e.ph > 20) e.leave = 1; if (e.leave) { e.lt = (e.lt || 0) + dt; if (e.lt > 1.2) { G.ents.splice(i, 1); continue; } } }
      else if (e.t === "rock") { e.ph += dt; }
      else if (e.t === "heli") { e.x += e.vx * dt; e.dt -= dt; if (e.drops > 0 && e.dt <= 0 && e.x > 30 && e.x < W - 30) { e.drops--; e.dt = 0.8; var tx = Math.max(30, Math.min(W - 30, G.x + rnd(-110, 110))); add({ t: "drop", x: tx, yw: ahead(rnd(150, 260)), r: 20, air: 1.4, pts: 250 }); } }
      else if (e.t === "plane") { e.x += e.vx * dt; }
      else if (e.t === "sharp") { e.x += e.vx * dt; e.yw += e.vy * dt; }
      else if (e.t === "toss") { e.f += dt / e.dur; if (e.f >= 1) { landToss(e); G.ents.splice(i, 1); continue; } }
      else if (e.t === "drop") { e.air -= dt; }
      else if (e.t === "fish") { e.ph += dt; var lp = e.ph % 1.6; e.air = lp > .9 ? (lp - .9) / .7 : 0; if (e.air && !e.sp0) { e.sp0 = 1; G.fx.push({ k: "spray", x: e.x, y: sy(e.yw), t: 0 }); } if (!e.air) e.sp0 = 0; }
      // the incoming wave reaches you: under it (duck-dive) or engulfed
      if (e.t === "brk" && !e.hit && (e.yw - G.yw) * G.dir < 10) { e.hit = 1;
        if (G.duck > 0) { gain(100, G.x, py - 40, "DUCK-DIVE!"); G.fx.push({ k: "wsplash", x: G.x, y: py - 10, t: 0 }); }
        else if (hurt("WASHED! −½ ❤️", "wave", .5)) { G.yw -= 46 * G.dir; G.fx.push({ k: "wsplash", x: G.x, y: py, t: 0 }); }
        if (G.phase !== "swim") return; }
      // collisions
      if (!e.sky && e.t !== "toss" && e.t !== "brk" && e.t !== "pier") {
        var d = Math.hypot(e.x - G.x, (e.yw - G.yw)), hitR = e.r + 14;
        if (e.t === "fish" && e.air > 0 && d < hitR + 14) { gain(e.pts, e.x, sy(e.yw) - 20, e.k === "fish_gold" ? "GOLDEN DORADO!" : e.k === "fish_mahi" ? "MAHI-MAHI!" : "PARROTFISH!"); buzz(15); G.fx.push({ k: "wsplash", x: e.x, y: sy(e.yw), t: 0 }); G.ents.splice(i, 1); continue; }
        if (e.t === "food" && d < hitR + 6) { gain(e.pts, e.x, sy(e.yw), e.gold ? "GOLDEN!" : ""); buzz(10); G.fx.push({ k: "ring", x: e.x, y: sy(e.yw), t: 0 }); G.ents.splice(i, 1); continue; }
        if (e.t === "drop" && e.air <= 0.25 && d < hitR + 8) { gain(e.pts, e.x, sy(e.yw), "DRINK DROP!"); buzz(12); G.ents.splice(i, 1); continue; }
        if (e.t === "harpoon" && d < hitR + 8) { var first = !G.harpHint; G.ammo = Math.min(9, G.ammo + 3); G.harpHint = 1; pop(e.x, sy(e.yw) - 10, "+3 HARPOONS 🔱", "#ffb15e", 1); sfx("grab"); buzz(15); G.fx.push({ k: "ring", x: e.x, y: sy(e.yw), t: 0 });
          if (first) toast("lifeguard_m", "Harpoons! Tap 🔱 FIRE to hit sharks"); G.ents.splice(i, 1); continue; }
        if (e.t === "rock") { if (d < e.r + 12 && G.jump <= .06) { var sd = G.x >= e.x ? 1 : -1; G.x = e.x + sd * (e.r + 14); G.vx = sd * 280; if (G.inv <= 0) { hurt("Hit the rocks!"); G.fx.push({ k: "wsplash", x: G.x, y: py, t: 0 }); } } continue; }
        if (e.t === "rsign" && d < e.r + 24) { var eb = ReviewEgg.collect(); G.score += eb; pop(e.x, sy(e.yw) - 40, "+" + eb + " 📺 ANTIDOTE'S REVIEW", "#ffd23f", 1); sfx("egg"); buzz([20, 40, 20]); G.fx.push({ k: "ring", x: e.x, y: sy(e.yw), t: 0 }); G.fx.push({ k: "wsplash", x: e.x, y: sy(e.yw), t: 0 }); G.ents.splice(i, 1); continue; }
        if (e.t === "hkit" && d < hitR + 12) { var hb = G.hearts; G.hearts = Math.min(5, G.hearts + 1); G.dmg = Math.max(0, G.dmg - 1);
          pop(e.x, sy(e.yw) - 20, hb >= 5 ? "Full health! +100" : "+1 ❤️ HEALTH KIT!", "#7dffb0", 1); if (hb >= 5) G.score += 100;
          sfx("heal"); buzz([15, 30, 15]); G.heal = .45; G.fx.push({ k: "ring", x: e.x, y: sy(e.yw), t: 0 }); G.fx.push({ k: "heal", x: e.x, y: sy(e.yw), t: 0 }); G.ents.splice(i, 1); continue; }
        if (e.t === "buoy" && d < hitR + 6) { G.hearts = Math.min(5, G.hearts + 1); pop(e.x, sy(e.yw), "+1 ❤️ Lifeguard save!", "#ff9db0", 1); toast("lifeguard_f", "Rescue can! +1 heart"); G.ents.splice(i, 1); continue; }
        if (e.t === "boat" && e.hunt) { if (d < e.r + 14) { var bs2 = G.x >= e.x ? 1 : -1; G.vx = bs2 * 220; } continue; }
        if (e.t === "qfin") continue;
        if (e.t === "sharp") { if (!e.done && d < 17 && G.duck <= 0 && hurt("HARPOONED!", "ray")) { e.done = 1; RND.hit(e.x, e.yw); G.ents.splice(i, 1); if (G.phase === "death") return; continue; }
          if (!e.done && !e.miss && (G.yw - e.yw) * G.dir > 26) { e.miss = 1; gain(150, G.x, py - 40, "DODGED!"); }
          if (e.miss && (G.yw - e.yw) * G.dir > 70) { RND.splash(e.x, e.yw); G.ents.splice(i, 1); }   // a miss drops into the water behind you (looks only)
          continue; }
        var danger = e.t === "jelly" || e.t === "ray" || (e.t === "eel" && e.zap) || (e.t === "shark" && e.st === "lunge") || e.t === "boat";
        if (danger && d < hitR && G.duck <= 0) { hurt(e.t === "shark" ? "SHARK BUMP! Wipeout" : e.t === "eel" ? "EEL BUMP! Wipeout" : e.t === "jelly" ? "Jellyfish! Wipeout" : e.t === "ray" ? "STINGRAY! Wipeout" : "Boat wake!"); if (e.t === "shark") e.st = "gone"; if (G.phase === "death") return; continue; }
        if ((e.t === "jelly" || e.t === "eel" || e.t === "shark" || e.t === "ray") && !e.nm && d < hitR + 26 && d >= hitR && (e.t !== "shark" || e.st === "lunge")) { e.nm = 1; gain(50, G.x, py - 40, "close one!"); }
      }
      ey = e.scr ? e.y : sy(e.t === "pier" ? e.yb : e.yw);
      if (e.t === "plane" ? (e.x < -360 || e.x > W + 360) : e.t === "pier" ? (G.dir < 0 ? ey < -260 : ey > H + 260) : (ey < -260 || ey > H + 260 || e.x < -120 || e.x > W + 120)) G.ents.splice(i, 1);
    }
    harpStep(dt); if (G.boss) bossStep(dt); blobStep(dt);
    if (!inWater() && G.phase !== "ridein") return;     // died, or the final boss is down
    if (G.gulls.length && Math.random() < dt * 0.45) gullCall();
    if (HELI) { var hh = G.ents.filter(function (e) { return e.t === "heli"; })[0]; HELI.gain.value = MUTED || !hh ? 0 : Math.max(0, .5 - Math.abs(hh.x - W / 2) / 900); }
    for (var j = G.gulls.length - 1; j >= 0; j--) { var gg = G.gulls[j]; gg.x += gg.vx * dt; gg.y += gg.vy * dt; gg.f += dt; if (gg.x < -60 || gg.x > W + 60) G.gulls.splice(j, 1); }
    G.wake = G.wake.filter(function (w) { w.t += dt; return w.t < 1.1; });
    G.fx = G.fx.filter(function (f) { f.t += dt; return f.t < (f.k === "txt" ? 1.1 : 0.6); });
  }
  function fish() { var fk = Math.random() < .2 ? "fish_gold" : Math.random() < .5 ? "fish_mahi" : "fish_parrot"; add({ t: "fish", k: fk, x: laneX(), yw: ahead(H * 0.7), r: 20, ph: Math.random() * 1.4, pts: fk === "fish_gold" ? 800 : 300 }); }

  /* ---------- the wave: it forms at one side and the break peels steadily across to the other ----------
     wv.px = the curl (where the lip is throwing over), wv.pd = the way it peels (+1 → right), wv.x0 = where it started.
     Behind the curl (rel < FOAM_EDGE) is the breaking WHITE FOAM: the only thing on the ride that hurts (touch it for a
     moment = FOAM wipeout, −½ ❤️, and you're shoved back out onto the clean face). Ahead of the curl is the clean,
     unbroken face, all the way out along the shoulder to the side with no foam: ride anywhere on it.
       · 14–110 px ahead of the curl = the POCKET (the glowing band, steepest part of the face): extra points.
       · JUMP anywhere on the clean face: you carve up the face to the lip (~¼ s) and launch. The face is tallest at the
         curl and tapers along the shoulder, and a fast carve sideways adds pop: closer + faster = bigger air.
     When the curl gets to the far side you shoot out of the barrel (EXIT bonus) and the next wave forms where you are. */
  var FOAM_EDGE = 4, CLIMB = .24;
  function newWave() {
    var pd = G.x < W / 2 ? 1 : -1, px = pd > 0 ? Math.min(18, G.x - 90) : Math.max(W - 18, G.x + 90);
    G.wv = { px: px, x0: px, pd: pd, sp: L().peel * rnd(.9, 1.15), st: "peel", t: 0, lipPh: 0 }; G.kick = 0; G.flat = 0; G.lip = 0; G.lipZone = 0;
  }
  function wvProg(w) { return Math.max(0, Math.min(1, (w.px - w.x0) * w.pd / (W - 70 - Math.min(w.x0, W - w.x0)))); }   // 0 at the start side → 1 at the exit
  function wvRel() { var w = G.wv; return w ? (G.x - w.px) * w.pd : 999; }   // how far ahead of the curl you are (− = in the foam)
  function faceH(rel) { return Math.max(.35, Math.min(1, 1 - (rel - 20) / 300)); }   // 1 = the steep face at the curl → .35 out on the shoulder
  function pocketStep(dt) {
    if (!G.wv) newWave(); var w = G.wv; w.t += dt;
    w.px += w.pd * w.sp * dt;
    var rel = (G.x - w.px) * w.pd, air = G.jump > 0.06, coach = G.coach, foam = !air && rel < FOAM_EDGE;
    G.pocket = !air && rel >= 14 && rel <= 110 ? 1 : 0;
    G.lipZone = 0; G.flat = 0;   // no "too far out" penalty any more: the whole clean face and shoulder is yours
    if (G.pocket) { G.wave = .6; G.pocketT += dt; G.score += 25 * dt; if (G.pocketT >= 3) { G.pocketT = 0; G.score += 150; pop(G.x, sy(G.yw) - 46, "+150 IN THE POCKET!", "#7fe3f2"); } }   // pocket points are flat (no streak multiplier) so a long ride can't snowball
    else G.pocketT = Math.max(0, G.pocketT - dt);
    // on the clean face, on the water: JUMP rides you up to the lip and launches
    var lip = !air && !foam && G.climb <= 0 && G.jump <= 0 ? 1 : 0;
    if (lip && !G.lip && coach) radioOnce("lip", "Clean face! Tap JUMP to ride up the lip and launch.", { tone: "info", ms: 2200 });
    G.lip = lip;
    if (G.climb > 0) { G.climb -= dt; if (G.climb <= 0) { G.climb = 0; launch(); } }
    G.lipRise += ((G.climb > 0 ? 1 : 0) - G.lipRise) * Math.min(1, dt * 10);
    // the white foam: the wash meter fills fast (~1/3 s), then FOAM wipeout −½ ❤️
    if (foam && G.inv <= 0) { G.eng += dt * 3.2; if (G.eng > .15) radioOnce("pocket", "Off the white foam! Stay on the clean face.", { tone: "warn" }); }
    else G.eng = Math.max(0, G.eng - dt * 2);
    if (G.eng >= 1) { G.eng = 0; G.climb = 0; G.airCombo = 0; if (hurt("FOAM! −100 −½ ❤️", "wave", .5)) { G.score = Math.max(0, G.score - 100); G.x = Math.max(16, Math.min(W - 16, w.px + w.pd * 110)); G.vx = w.pd * 160; G.fx.push({ k: "wsplash", x: G.x, y: sy(G.yw), t: 0 }); } }
    // the curl reaches the far side: shoot out of the barrel, then the next wave forms
    if (w.pd > 0 ? w.px > W - 70 : w.px < 70) {
      if (rel >= 4 && rel <= 140 || air) { G.score += 200; pop(G.x, sy(G.yw) - 50, "+200 BARREL EXIT!", "#7fe3f2", 1);   // flat (no streak multiplier), like the pocket points
        G.fx.push({ k: "spray", x: G.x, y: sy(G.yw), t: 0 }); sfx("streak"); G.exits = (G.exits || 0) + 1;
        if (coach || G.exits === 1) radioOnce("exit", "Made it through the barrel! 🌊", { tone: "win", ms: 2200 }); }
      sfx("wbreak"); if (G.phase === "ride") newWave();
    }
  }
  /* ---------- the pier: a narrow stub off the sand, and sections that drift across your line ---------- */
  function pierStep() {
    var air = G.jump > 0.06, hit = null, px = null;
    if (G.yw > -60 && G.yw < STUB && G.phase !== "ridein" && Math.abs(G.x - PIER_X) < PIER_W / 2 + 9) { px = PIER_X; hit = G; }
    G.ents.forEach(function (e) { if (e.t !== "pier") return; var x = pierX(e, G.yw); if (x == null) { e.side = 0; return; }
      var s = G.x < x ? -1 : 1;
      if (!air) { if (e.side && s !== e.side && Math.abs(G.x - x) < PIER_W / 2 + 40) { px = x; hit = e; } else if (Math.abs(G.x - x) < PIER_W / 2 + 9) { px = x; hit = e; } else e.side = s; }
      else if (!e.over && Math.abs(G.x - x) < PIER_W / 2 + 16) e.over = 1; });
    if (!hit || air) return;
    var back = hit.side || (G.x < px ? -1 : 1); if (hit === G) back = G.x < px ? -1 : 1;
    var nx = px + back * (PIER_W / 2 + 14); if (nx < 16 || nx > W - 16) { back = -back; nx = px + back * (PIER_W / 2 + 14); }
    G.x = nx; G.vx = back * 260; if (hit !== G) hit.side = back;
    if (G.inv <= 0) { G.score = Math.max(0, G.score - 200); hurt("Hit the pier! −200"); G.fx.push({ k: "wsplash", x: G.x, y: sy(G.yw), t: 0 }); sfx("crash"); }
  }
  // something to hop right in front of you: a pier section, rocks, a boss tail-slap wave (JUMP still clears those anywhere)
  function hopNear() {
    for (var i = 0; i < G.ents.length; i++) { var e = G.ents[i];
      if (e.t === "pier") { for (var k = 0; k <= 150; k += 30) { var x = pierX(e, G.yw + G.dir * k); if (x != null && Math.abs(x - G.x) < 70) return 1; } }
      else if (e.t === "rock") { var dy = (e.yw - G.yw) * G.dir; if (dy > -10 && dy < 130 && Math.abs(e.x - G.x) < e.r + 40) return 1; } }
    for (var j = 0; j < G.blobs.length; j++) if (Math.hypot(G.blobs[j].x - G.x, G.blobs[j].f) < 110) return 1;
    return 0;
  }
  // riding: JUMP (anywhere on the clean face) carves up the face to the lip, then launch() throws you off it · paddling: JUMP = duck-dive
  function jump() {
    if (!G.running) return;
    if (G.phase === "swim") { if (G.duck > 0 || G.dcd > 0) return; G.duck = .8; G.dcd = 1.0; sfx("splash"); buzz(10); for (var k = 0; k < 6; k++) G.fx.push({ k: "bubble", x: G.x + rnd(-16, 16), y: sy(G.yw) + rnd(-20, 20), t: 0 }); return; }
    if (G.phase !== "ride") return;
    if (G.jump > .05) { trick(); return; }   // already up: JUMP again = a trick
    if (G.jump > 0 || G.jcd > 0 || G.climb > 0) return;
    if (wvRel() < FOAM_EDGE) { G.jcd = .3; if (G.t - (G.jTip || -9) > 1.2) { G.jTip = G.t; pop(G.x, sy(G.yw) - 54, "Get onto the clean face ➜", "#cfe8ff"); } return; }   // can't launch out of the foam
    G.climb = CLIMB; G.jcd = .3; G.lastJumpT = G.t; sfx("air"); buzz(8);
    G.fx.push({ k: "spray", x: G.x, y: sy(G.yw), t: 0 });
  }
  // off the lip: how high = how steep the face is where you left it (near the curl) + how fast you were carving
  function launch() {
    if (G.phase !== "ride") return;
    var rel = wvRel(), pow = .45 + .55 * faceH(rel) + .4 * Math.min(1, Math.abs(G.vx) / 320);   // ≈ .64 (slow, out on the shoulder) → 1.4 (fast, at the curl)
    G.airPow = pow; G.airAmp = .55 + .6 * pow; G.jumpDur = .7 + .55 * pow; G.jump = G.jumpDur; G.jcd = .2; G.trick = null; G.tricks = [];
    pop(G.x, sy(G.yw) - 58, pow > 1.2 ? "MAX AIR!" : "OFF THE LIP!", "#7fe3f2", pow > 1.2); sfx("air"); buzz(12);
    G.fx.push({ k: "spray", x: G.x, y: sy(G.yw), t: 0 }); G.fx.push({ k: "wsplash", x: G.x, y: sy(G.yw) + 4, t: 0 });
    if (!G.trickHint) { G.trickHint = 1; pop(G.x, sy(G.yw) + 64, "Tap TRICK!", "#ffd23f", 1); }
  }
  // the air height (0 → ~1.4 at the peak), shared by both renderers (game3d.js reads G.airAmp too)
  function airF() { return G.jump > 0 ? Math.sin(Math.PI * (1 - G.jump / G.jumpDur)) * (G.airAmp || 1) : 0; }
  // tricks while airborne: TRICK button / tap the water / JUMP again (cycles 360 → grab → flip), or pick one: swipe sideways
  // = 360, swipe down = grab, swipe up = flip (keys R / G / F, pad X cycles, LB = grab, RB = flip). Chain them for a combo.
  // Land clean = NICE! + points; still mid-trick when the board hits the water = a light bail (−150, no heart).
  var TRICK = { spin: { dur: .42, pts: 400, name: "360!" }, grab: { dur: .36, pts: 300, name: "GRAB!" }, flip: { dur: .52, pts: 600, name: "FLIP!" } }, TORDER = ["spin", "grab", "flip"];
  function trick(kind) {
    if (!G.running || G.phase !== "ride" || G.jump <= 0.05 || G.trick) return;
    kind = TRICK[kind] ? kind : TORDER[G.tricks.length % 3];
    G.trick = { k: kind, t: 0, dur: TRICK[kind].dur }; sfx("throw"); buzz(8);
  }
  function trickStep(dt) { var k = G.trick; if (!k) return; k.t += dt; if (k.t >= k.dur) { G.tricks.push(k.k); pop(G.x + rnd(-20, 20), sy(G.yw) - 76, TRICK[k.k].name, "#ffd23f"); G.trick = null; } }
  function land() {
    G.fx.push({ k: "splash", x: G.x, y: sy(G.yw), t: 0 }); sfx("splash");
    if (G.trick) {   // still mid-trick when the board hits the water: a light bail (splash + tumble, a few points, no heart)
      var lost = 150; G.score = Math.max(0, G.score - lost); pop(G.x, sy(G.yw) - 70, "BAILED! −" + lost, "#ff9d9d", 1);
      G.trick = null; G.tricks = []; G.airCombo = 0; G.streak = 0; G.mult = 1; G.wipe = .9; G.inv = Math.max(G.inv, .5); G.fx.push({ k: "wsplash", x: G.x, y: sy(G.yw), t: 0 }); buzz([30, 30, 40]);
      radioOnce("bail", "Finish the trick before you land!", { tone: "warn" }); return; }
    var n = G.tricks.length, pow = G.airPow || 1;
    if (n) { var pts = 0; G.tricks.forEach(function (k) { pts += TRICK[k].pts; });
      G.airCombo = G.t - G.lastAirT < 9 ? G.airCombo + 1 : 1; G.lastAirT = G.t; var cm = Math.min(2, 1 + .25 * (G.airCombo - 1));
      gain(Math.round(pts * n * cm * (.8 + .2 * pow)), G.x, sy(G.yw) - 40, n > 1 ? "COMBO ×" + n + "!" : "CLEAN LANDING!");
      pop(G.x, sy(G.yw) - 96, (n > 1 ? "SICK!" : "NICE!") + (cm > 1 ? " ×" + cm : ""), "#7dffb0", 1);
      G.fx.push({ k: "wsplash", x: G.x, y: sy(G.yw), t: 0 }); buzz(25); }
    else if (G.jumpDur > .6) gain(Math.round(100 * pow), G.x, sy(G.yw) - 40, "AIR!");
    G.tricks = []; G.airPow = 0;
  }
  function tossTo(fx, fyw, tx, tyw, from, item) { add({ t: "toss", x: fx, yw: fyw, fx: fx, fyw: fyw, tx: tx, tyw: tyw, f: 0, dur: 0.75, from: from, item: item }); }
  function landToss(e) { if (e.item === "harpoon") harpPick(e.tx, e.tyw); else if (e.item === "buoy") add({ t: "buoy", x: e.tx, yw: e.tyw, r: 16 }); else food(e.tx, e.tyw, { from: e.from }); }

  /* ---------- the arc: sand → swim → pop up → ride → ride in → beach ---------- */
  function sandStep(dt) {   // run down the sand into the water
    G.lvT += dt; G.yw += 96 * dt; G.x += G.vx * dt; G.vx *= Math.pow(0.0009, dt); G.x = Math.max(30, Math.min(W - 30, G.x));
    G.cam += (G.yw + G.lead - G.cam) * Math.min(1, dt * 4); tickEnts(dt);
    if (G.yw >= 0) toSwim();
  }
  function toSwim() { G.spawn.hb = G.level === 1 ? 9 : 5; G.dblNext = false; G.phase = "swim"; G.inv = .6; G.fx.push({ k: "splash", x: G.x, y: sy(G.yw), t: 0 }); sfx("splash"); buzz(20); G.hint = 5; }
  function popUp() {   // stand up, spin round and take the wave in
    G.phase = "popup"; G.popT = 0; G.duck = 0; G.ents = G.ents.filter(function (e) { return e.sky; });
    pop(G.x, sy(G.yw) - 60, "STAND UP!", "#ffd23f", 1); sfx("level"); buzz([20, 30, 20]);
    radio("You're out! Pop up and ride it in. Stay in the pocket!", { tone: "info", ms: 2600 });
  }
  function popStep(dt) {
    G.popT += dt; var f = Math.min(1, G.popT / 1.1), e = f * f * (3 - 2 * f);
    G.ang = Math.PI * e; G.dir = -1; G.lead += (-RLEAD - G.lead) * Math.min(1, dt * 2.2); G.cam += (G.yw + G.lead - G.cam) * Math.min(1, dt * 5);
    tickEnts(dt);
    if (f >= 1) startRide();
  }
  function startRide() { G.phase = "ride"; G.dir = -1; G.ang = Math.PI; G.lead = -RLEAD; G.cam = G.yw + G.lead; G.rideT = 0; G.inv = 1; G.hint = 5; newWave(); G.spawn.haz = 6; G.spawn.food = .6; G.spawn.pier = 6; G.spawn.kit = DBG_WAVE ? 4 : rnd(10, 16);
    G.coach = !G.rodeOnce; G.rodeOnce = 1;   // the lifeguard coaches the first ride of a run
    var seen = 0; try { seen = localStorage.getItem("nalu-ride-tut") === "1"; } catch (e) {}
    G.tutPend = G.coach && (DBG_TUT || (!seen && !DBG_BOT && !DBG_WASH)) ? 1 : 0; }   // shown on the first ride frame (update)
  // a paused, illustrated card: the curl peeling across, the glowing pocket ahead of it, an arrow riding along, a lip jump
  function rideTutorial(cb) {
    if ($("nv-tut")) return; var was = G.running; G.running = false; drag = null;
    var o = document.createElement("div"); o.className = "nv-ov"; o.id = "nv-tut"; o.style.zIndex = 60;
    o.innerHTML = "<h3 style='font-size:26px'>Ride the wave 🌊</h3>" +
      "<svg viewBox='0 0 300 150' width='290' height='145' aria-hidden='true' style='margin:6px 0'><defs><linearGradient id='nvtf' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#7fe3d2'/><stop offset='1' stop-color='#0b5e7a'/></linearGradient>" +
      "<linearGradient id='nvtp' x1='0' y1='0' x2='1' y2='0'><stop offset='0' stop-color='#7fe3f2' stop-opacity='.15'/><stop offset='.5' stop-color='#7fe3f2' stop-opacity='.75'/><stop offset='1' stop-color='#7fe3f2' stop-opacity='.15'/></linearGradient></defs>" +
      "<rect x='0' y='0' width='300' height='150' rx='12' fill='#0b3b5e'/><path d='M0 40 Q150 20 300 40 L300 95 L0 95Z' fill='url(#nvtf)'/>" +
      "<g class='nvt-curl'><path d='M0 95 L0 30 Q40 18 70 30 Q92 40 84 62 Q78 74 66 70 Q74 56 64 48 Q50 92 0 95Z' fill='#f4fbff'/><circle cx='30' cy='70' r='9' fill='#fff' opacity='.8'/><circle cx='12' cy='82' r='7' fill='#ffd0d0' opacity='.9'/>" +
      "<rect class='nvt-band' x='88' y='74' width='96' height='22' rx='11' fill='url(#nvtp)'/><text x='136' y='112' fill='#7dffd8' font-size='12' font-weight='800' text-anchor='middle' font-family='system-ui'>CLEAN FACE</text>" +
      "<text x='38' y='112' fill='#ff9d9d' font-size='11' font-weight='800' text-anchor='middle' font-family='system-ui'>⚠ WHITE FOAM</text>" +
      "<g class='nvt-surf'><ellipse cx='126' cy='85' rx='14' ry='5' fill='#ffd23f'/><circle cx='126' cy='76' r='5' fill='#c98a5e'/></g></g>" +
      "<path d='M120 132 H270' stroke='#ffd23f' stroke-width='4' stroke-linecap='round'/><path d='M262 124 L274 132 L262 140' fill='none' stroke='#ffd23f' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'/>" +
      "<text x='285' y='60' fill='#cfe8ff' font-size='11' font-weight='800' text-anchor='end' font-family='system-ui'>EXIT ➜</text></svg>" +
      "<p style='font-weight:800'>Only the white foam can wipe you out. Ride anywhere on the clean face, or go round to the side with no foam.</p>" +
      "<p class='nv-how'>Tap <b>JUMP</b> (or swipe up) to ride up the lip and launch: closer to the curl + carving fast = more air. In the air tap <b>TRICK</b> (or swipe: sideways 360, down grab, up flip), finish it, and land: <b>NICE!</b> Still mid-trick when you land = a little bail. Health kits 🩹 float by when you're hurt.</p>" +
      "<button class='nv-btn' type='button'>Got it 👍</button>";
    wrap.appendChild(o);
    o.querySelector("button").onclick = function (e) { e.stopPropagation(); o.remove(); try { localStorage.setItem("nalu-ride-tut", "1"); } catch (x) {} if (cb) cb(); else { G.running = was && !G.over; last = 0; }
      if (G.running && G.phase === "ride") radio("Stay ahead of the curl!", { tone: "info", ms: 2200 }); };
  }
  // the level's ride is done (or the boss is down): ride in onto the sand in front of Nalu Vida
  function rideIn(final) {
    G.phase = "ridein"; G.final = final ? 1 : 0; G.wv = null; G.pocket = 0; G.eng = 0; G.trick = null; G.jump = 0;
    G.ents = G.ents.filter(function (e) { return e.sky || e.t === "food" || e.t === "toss"; });
    if (G.yw > 980) wrapWorld(980 - G.yw);
    banner("RIDE IT IN", "Back to Nalu Vida 🌴", final ? "🏆 ALL 5 LEVELS" : "LEVEL " + G.level + " DONE", "#ffd23f", 2.2);
    radio(final ? "All five! Ride it in, champ." : "Nice set! Ride it in to Nalu Vida.", { tone: "win", ms: 2600 });
  }
  function toBeach() { G.phase = "beach"; G.beachT = 0; G.bx0 = G.x; G.by0 = G.yw; G.fx.push({ k: "splash", x: G.x, y: sy(G.yw), t: 0 }); sfx("splash"); G.ents = G.ents.filter(function (e) { return e.sky; }); }
  function beachStep(dt) {   // hop off, run up the sand into Nalu Vida; then the level-clear card
    G.beachT += dt; var f = Math.min(1, G.beachT / 2.6), e = f * (2 - f);
    G.yw = G.by0 + (-215 - G.by0) * e; G.x = G.bx0 + (SHORE_X + 8 - G.bx0) * e; G.ang = Math.PI;
    G.lead += (-LEAD * .4 - G.lead) * Math.min(1, dt * 2); G.cam += (G.yw + G.lead - G.cam) * Math.min(1, dt * 3); tickEnts(dt);
    if (G.beachT > 2.4 && !G.cleared) { G.cleared = 1;
      if (G.final) { cutscene("win"); return; }
      var bonus = 1500 * G.level; G.score += bonus; banner("LEVEL " + G.level + " CLEAR", "+" + bonus.toLocaleString() + " · fuel up and paddle back out", "BACK TO NALU VIDA 🏄", "#ffd23f", 2.8); G.banner.y = 410;
      sfx("level"); buzz([30, 40, 30]); confetti(40); radio(G.level === 4 ? "Level 4 clear! One more ride to go." : "Level " + G.level + " clear! Grab a bite, then back out.", { tone: "win" }); }
    if (G.beachT > 5.4) { G.cleared = 0; levelUp(); }
  }
  // on to the next level: back on the sand for the next paddle-out
  function levelUp() {
    var lv = Math.min(5, G.level + 1), rid = G.runId, go = function () { if (G.runId !== rid || G.over) return;
      G.level = lv; G.bossBeat = 0; levelStart(false); };   // levelStart shows the banner + radio line
    G.phase = "cut0";   // hold still on the storefront card while a halftime break (if any) plays
    // HALFTIME between levels (after level 2, 3 or 4 once ~90 s are ridden): everything freezes until the break is over
    if (window.Halftime && Halftime.levelUp(lv, function () { if (G.runId !== rid || G.over) return; G.running = true; last = 0; drag = null; musicSync(); go(); })) { G.running = false; drag = null; }
    else go();
  }
  function tickEnts(dt) {
    for (var i = G.ents.length - 1; i >= 0; i--) { var e = G.ents[i];
      if (e.t === "toss") { e.f += dt / e.dur; if (e.f >= 1) { landToss(e); G.ents.splice(i, 1); } }
      else if (e.t === "plane" || e.t === "heli") e.x += e.vx * dt; }
    G.fx = G.fx.filter(function (f) { f.t += dt; return f.t < (f.k === "txt" ? 1.1 : 0.6); });
    G.wake = G.wake.filter(function (w) { w.t += dt; return w.t < 1.1; });
  }
  /* ---------- the ending cutscene (img/scene/ending.mp4, made with Higgsfield): final win and game over ---------- */
  function cutscene(kind) {
    if (RA) RA.clear(); G.phase = "cut"; G.cutKind = kind; var c = $("nv-cut"), v = $("nv-cutv"), rid = G.runId, done = false;
    function fin() { if (done || G.runId !== rid) return; done = true; try { v.pause(); } catch (e) {} c.classList.remove("on", "ttl"); c.onclick = null; showEnd(); }
    c.classList.add("on"); setTimeout(function () { c.classList.add("ttl"); }, 350);
    c.onclick = function (e) { e.stopPropagation(); fin(); };
    v.onended = fin; v.onerror = function () { setTimeout(fin, 2600); };
    try { if (!v.getAttribute("src")) v.src = "img/scene/ending.mp4"; v.currentTime = 0; var p = v.play(); if (p && p.catch) p.catch(function () { setTimeout(fin, 2600); }); } catch (e) { setTimeout(fin, 2600); }
    setTimeout(fin, 8000);   // never strand the player on the cutscene
    sfx(kind === "win" ? "win" : "level");
  }
  /* ---------- ?bot=1: an autopilot used to sanity-check the prize thresholds (not a real player) ---------- */
  function bot(dt) {
    var tx = G.x, threat = null, td = 1e9;
    G.ents.forEach(function (e) { if (!/shark|jelly|ray|eel|rock/.test(e.t) || (e.t === "shark" && e.st !== "lunge" && e.st !== "warn")) return; var dy = (e.yw - G.yw) * G.dir; if (dy < -20 || dy > 170) return; var d = Math.abs(e.x - G.x); if (d < 46 && dy < td) { td = dy; threat = e; } });
    if (G.phase === "swim") { tx = SHORE_X; G.ents.forEach(function (e) { if (e.t === "brk" && !e.hit && (e.yw - G.yw) * G.dir < 34 && (e.yw - G.yw) * G.dir > 0) jump(); }); }
    else if (G.phase === "ride") {
      if (G.wv) tx = G.wv.px + G.wv.pd * (DBG_WASH ? -30 : 55); if (G.lip && !DBG_WASH && Math.random() < dt * .8) jump();
      G.ents.forEach(function (e) { if (e.t !== "pier") return; var x = pierX(e, G.yw - 40); if (x != null && Math.abs(x - G.x) < 40) jump(); });
      if (G.jump > .62 && !G.trick && G.tricks.length < 1) trick();
      if (G.ammo && (G.boss || G.ents.some(function (e) { return e.t === "shark" && e.st !== "flee"; }))) fire();
    }
    if (threat) tx = threat.x + (G.x < threat.x ? -70 : 70);
    var sp = Math.max(-320, Math.min(320, (tx - G.x) * 5)); G.vx = sp;
  }
  /* ---------- levels, harpoons and boss sharks ---------- */
  // while riding, the world quietly slides back (the ocean never runs out); the ride-in slides the sand back into view
  function wrapWorld(D) {
    G.yw += D; G.cam += D; G.wo += D;
    G.ents.forEach(function (e) { if (e.scr) return; e.yw += D; if (e.yb != null) e.yb += D; if (e.base != null) e.base += D; if (e.fyw != null) { e.fyw += D; e.tyw += D; } });
    G.wake.forEach(function (w) { w.yw += D; }); G.harps.forEach(function (h) { h.yw += D; });
  }
  function banner(title, sub, top, col, dur) { G.banner = { t: 0, dur: dur || 2.8, title: title, sub: sub || "", top: top || "", col: col || "#ffd23f" }; }
  function clearNear() { G.ents = G.ents.filter(function (e) { return !((e.t === "shark" || e.t === "eel" || e.t === "jelly" || e.t === "ray") && Math.abs(e.yw - G.yw) < 320); }); }
  function bossStart(kind) {
    var B = BOSS[kind];
    G.boss = { kind: kind, B: B, name: B.name, size: B.size, hp: B.hp, max: B.hp, st: "enter", t: 0, x: W / 2, f: 560, vx: 0, vf: 0, ang: Math.PI, sub: 1, fl: 0, ph: Math.random() * 6, dur: 2, br: 0, side0: 0, wakeT: 0 };
    G.ents = G.ents.filter(function (e) { return e.t !== "shark"; }); clearNear(); G.wv = null; G.pocket = 0; G.eng = 0;   // the wave backs off for the fight
    banner("⚠ " + B.name + " ⚠", kind === 5 ? "Harpoon it · crash it into rocks & the pier" : "Dodge the charge · lure it into the rocks", kind === 5 ? "FINAL BOSS" : "BOSS SHARK", "#ff6b6b", 3);
    sfx("roar"); buzz([80, 60, 160]); G.shake = 10; radio(kind === 5 ? "Big one coming — Manō Nui!" : "Big one coming — Big Manō!", { tone: "warn", ms: 3000, pri: 2 });
    if (G.ammo < 3) tossTo(G.x < W / 2 ? W + 20 : -20, G.yw, Math.max(40, Math.min(W - 40, G.x)), ahead(150), "ski", "harpoon");
    toast("lifeguard_f", kind === 5 ? "That's MANŌ NUI! 🔱 Harpoons + rocks!" : "Big shark! Fire 🔱 and lure it into rocks!");
    rock(rockSpot(), ahead(320), 28); G.spawn.rock = 2.5; G.spawn.harp = 4; G.spawn.ski = 6;
  }
  function bossYw(b) { return G.yw + G.dir * b.f; }
  function bossHit(dmg, label, col) {
    var b = G.boss; if (!b || b.st === "ko") return;
    b.hp = Math.max(0, b.hp - dmg); b.fl = .32; pop(b.x, sy(bossYw(b)) - b.size * .3, label + " −" + dmg, col || "#ffd23f", 1);
    G.score += dmg * 20 * G.mult;
    if (b.hp <= 0) { b.st = "ko"; b.t = 0; b.vx = 0; b.vf = 0; sfx("roar"); G.shake = 16; buzz([100, 50, 200]); G.blobs = []; }
  }
  function bossMove(b, tx, tf, sp, dt) { var dx = tx - b.x, df = tf - b.f, l = Math.hypot(dx, df); var s = Math.min(sp, l / Math.max(dt, .001));
    var nvx = l > 1 ? dx / l * s : 0, nvf = l > 1 ? df / l * s : 0; b.vx += (nvx - b.vx) * Math.min(1, dt * 5); b.vf += (nvf - b.vf) * Math.min(1, dt * 5); b.x += b.vx * dt; b.f += b.vf * dt; return l; }
  function bossNext(b) {
    var rage = b.hp < b.max * .4, r = Math.random();
    b.t = 0;
    if (b.kind === 5 && r < (rage ? .32 : .26)) { b.st = "dive"; sfx("splash"); }
    else if (b.kind === 5 && r < (rage ? .55 : .48)) { b.st = "tail"; }
    else { b.st = "warn"; b.ax = G.x; b.af = 0; }
  }
  function retreat(b) { b.st = "return"; b.t = 0; b.again = 0; b.rx = G.x < W / 2 ? rnd(W * .6, W - 40) : rnd(40, W * .4); }
  function bossStep(dt) {
    var b = G.boss, B = b.B, v = speed(), rage = b.hp < b.max * .4, hitR = b.size * .2 + 14;
    b.t += dt; if (b.fl > 0) b.fl -= dt; if (b.br > 0) b.br -= dt;
    if (b.st === "enter") { b.sub = Math.max(.15, 1 - b.t / 1.2); bossMove(b, W / 2, 230, 260, dt); if (b.t > 1.7) { b.st = "stalk"; b.t = 0; b.dur = rnd(B.stalk[0], B.stalk[1]); } }
    else if (b.st === "stalk") { b.sub += (.15 - b.sub) * Math.min(1, dt * 3);
      var tx = Math.max(40, Math.min(W - 40, G.x + Math.sin(b.t * 1.4 + b.ph) * 130)); bossMove(b, tx, 215 + Math.sin(b.t * 2) * 28, rage ? 230 : 170, dt);
      if (b.t > b.dur * (rage ? .7 : 1)) bossNext(b); }
    else if (b.st === "warn") { var wd = B.warn * (rage ? .85 : 1); if (b.t < wd * .6) { b.ax = G.x; b.af = 0; }
      b.vx *= .9; b.vf *= .9; b.f += b.vf * dt;
      if (b.t >= wd) { b.st = "charge"; b.t = 0; var dx = b.ax - b.x, df = b.af - b.f, l = Math.hypot(dx, df) || 1, cs = B.charge * (rage ? 1.15 : 1); b.vx = dx / l * cs; b.vf = df / l * cs;
        b.pier = null; b.side0 = 0; var byw0 = bossYw(b);   // which side of a drifting pier section the charge starts on
        G.ents.forEach(function (e) { if (e.t !== "pier" || b.pier) return; var x = pierX(e, byw0); if (x != null && Math.abs(b.x - x) > PIER_W / 2 + 10) { b.pier = e; b.side0 = b.x < x ? -1 : 1; } });
        sfx("lunge"); buzz(20); } }
    else if (b.st === "charge") { b.x += b.vx * dt; b.f += b.vf * dt; b.sub = .05;
      b.wakeT -= dt; if (b.wakeT <= 0) { b.wakeT = .07; G.fx.push({ k: "spray", x: b.x, y: sy(bossYw(b)), t: 0 }); }
      if (Math.hypot(b.x - G.x, b.f) < hitR) { if (b.kind === 5) hurt("SHARK CHOMP! −1½ ❤️", "shark", 1.5); else hurt("SHARK BITE!"); }
      if (G.phase !== "ride") return;
      var byw = bossYw(b);
      for (var i = G.ents.length - 1; i >= 0; i--) { var e = G.ents[i]; if (e.t !== "rock") continue;
        if (Math.hypot(e.x - b.x, e.yw - byw) < e.r + b.size * .17) { G.ents.splice(i, 1); bossCrash(b, e.x, sy(e.yw), B.rock, "SMASHED THE ROCKS!"); return; } }
      var pxb = b.pier && G.ents.indexOf(b.pier) >= 0 ? pierX(b.pier, byw) : null;
      if (pxb != null && b.side0 && (b.x < pxb ? -1 : 1) !== b.side0) { b.x = pxb + b.side0 * (PIER_W / 2 + b.size * .14); bossCrash(b, pxb, sy(byw), B.pier, "SLAMMED THE PIER!"); return; }
      if (b.f < -190 || b.f > 460 || b.x < -80 || b.x > W + 80 || b.t > 1.5) {
        if (rage && b.f < -100 && !b.again && Math.random() < .5) { b.again = 1; b.st = "warn"; b.t = 0; b.vx = 0; b.vf = 0; b.x = Math.max(30, Math.min(W - 30, b.x)); pop(G.x, sy(G.yw) + 60, "BEHIND YOU!", "#ff6b6b", 1); }
        else retreat(b); } }
    else if (b.st === "crash") { b.vx *= Math.pow(.05, dt); b.f -= v * .4 * dt; b.x += b.vx * dt; b.sub = .1; if (b.t > 1.6) retreat(b); }
    else if (b.st === "return") { b.sub += (.6 - b.sub) * Math.min(1, dt * 3);
      var l2 = bossMove(b, b.rx, 220, 380, dt); if (l2 < 30 || b.t > 2.6) { b.st = "stalk"; b.t = 0; b.dur = rnd(B.stalk[0], B.stalk[1]); } }
    else if (b.st === "dive") { b.sub = Math.min(1, b.sub + dt * 2.2); bossMove(b, G.x, 0, 300, dt);
      if (Math.random() < dt * 14) G.fx.push({ k: "bubble", x: b.x + rnd(-20, 20), y: sy(bossYw(b)) + rnd(-20, 20), t: 0 });
      if (b.t > 1.8) { b.st = "bwarn"; b.t = 0; b.vx = 0; b.vf = 0; } }
    else if (b.st === "bwarn") { if (b.t < .2) b.x += (G.x - b.x) * Math.min(1, dt * 6);
      if (b.t > .8) { b.st = "breach"; b.t = 0; b.sub = 0; b.br = .5; sfx("crash"); sfx("splash"); G.shake = 14; buzz(40);
        G.fx.push({ k: "wsplash", x: b.x, y: sy(bossYw(b)), t: 0 }); G.fx.push({ k: "splash", x: b.x, y: sy(bossYw(b)), t: 0 });
        if (Math.hypot(b.x - G.x, b.f) < 74) hurt("SHARK CHOMP! −1½ ❤️", "shark", b.kind === 5 ? 1.5 : 1); } }
    else if (b.st === "breach") { if (b.t > .9) retreat(b); }
    else if (b.st === "tail") { b.vx *= .9; b.vf *= .9;
      if (b.t > .6 && !b.slapped) { b.slapped = 1; sfx("crash"); G.shake = 8; G.fx.push({ k: "wsplash", x: b.x, y: sy(bossYw(b)), t: 0 });
        var a0 = Math.atan2(G.x - b.x, -b.f), n = rage ? 7 : 5;
        for (var k = 0; k < n; k++) { var a = a0 + (k - (n - 1) / 2) * .26; G.blobs.push({ x: b.x, f: b.f, vx: Math.sin(a) * 240, vf: -Math.cos(a) * 240, t: 0 }); } }
      if (b.t > 1.1) { b.slapped = 0; b.st = "stalk"; b.t = 0; b.dur = rnd(B.stalk[0], B.stalk[1]); } }
    else if (b.st === "ko") { b.sub = Math.min(1, b.t / 2.6); b.f -= v * .3 * dt;
      if (Math.random() < dt * 20) G.fx.push({ k: "bubble", x: b.x + rnd(-40, 40), y: sy(bossYw(b)) + rnd(-40, 40), t: 0 });
      if (b.t > 2.8) { bossDown(); return; } }
    // facing: follow the swim direction in the world
    var wvy = G.dir * (v + b.vf), ta = Math.atan2(b.vx, wvy) + Math.PI;
    if (b.st === "warn") ta = Math.atan2(b.ax - b.x, G.dir * (b.af - b.f)) + Math.PI;
    var da = ((ta - b.ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI; b.ang += da * Math.min(1, dt * (b.st === "charge" ? 12 : 5));
  }
  function bossCrash(b, x, y, dmg, label) {
    b.vx *= -.3; b.vf = 0; G.shake = 16; sfx("crash"); buzz([60, 30, 90]);
    G.fx.push({ k: "debris", x: x, y: y, t: 0, p: Array.apply(null, Array(12)).map(function () { return [rnd(0, 6.28), rnd(60, 170), rnd(3, 7)]; }) }); G.fx.push({ k: "wsplash", x: x, y: y, t: 0 });
    bossHit(dmg, label, "#ff9d2e"); if (b.st !== "ko") { b.st = "crash"; b.t = 0; }
  }
  function bossDown() {
    var b = G.boss, B = b.B; G.boss = null; G.blobs = []; G.score += B.bonus; G.bossBeat = 1; G.inv = 2;
    pop(W / 2, H * .3, "+" + B.bonus.toLocaleString() + " " + B.name + " DOWN!", "#ffd23f", 1);
    confetti(70);
    if (b.kind === 5) { G.won = 1; G.phase = "victory"; G.winT = 0; sfx("win"); banner("YOU BEAT " + B.name + "!", "Champion of the Nalu · ride in for your feast 🌴", "🏆 FINAL BOSS DOWN", "#ffd23f", 3.2); G.finaleMsg = "🏆 Champion of the Nalu"; radio("You beat Manō Nui! Come eat, champ.", { tone: "win", ms: 3400 }); }
    else { sfx("win"); toast("lifeguard_m", B.name + " swam off with a headache 😵 Nice!"); radio("Big Manō is gone! Water's safe… for now.", { tone: "win" }); var rid = G.runId; setTimeout(function () { if (G.running && G.runId === rid && G.phase === "ride") rideIn(false); }, 1400); }
  }
  function victoryStep(dt) {
    G.winT += dt; G.yw += G.dir * speed() * .5 * dt; if (G.yw < 1500) wrapWorld(2400); G.cam += (G.yw + G.lead - G.cam) * Math.min(1, dt * 3); tickEnts(dt);
    if (G.winT > 3.4) rideIn(true);
  }
  function confetti(n) { var cols = ["#ffd23f", "#ff7a3d", "#7fe3f2", "#3ddc97", "#ff6bb0", "#fff"]; for (var i = 0; i < n; i++) G.conf.push({ x: rnd(0, W), y: rnd(-80, -10), vx: rnd(-40, 40), vy: rnd(90, 220), r: rnd(3, 6), rot: rnd(0, 6), vr: rnd(-8, 8), c: pick(cols), t: 0 }); }
  function confStep(dt) { G.conf = G.conf.filter(function (c) { c.t += dt; c.x += c.vx * dt + Math.sin(c.t * 4 + c.rot) * 20 * dt; c.y += c.vy * dt; c.rot += c.vr * dt; return c.y < H + 20; }); }
  // tail-slap waves: little curling walls of whitewater fanned out at you (relative to the rider, like the boss)
  function blobStep(dt) {
    for (var i = G.blobs.length - 1; i >= 0; i--) { var o = G.blobs[i]; o.t += dt; o.x += o.vx * dt; o.f += o.vf * dt;
      if (Math.hypot(o.x - G.x, o.f) < 24 && G.jump <= .06) { G.blobs.splice(i, 1); hurt("Tail-slap wave! −½ ❤️", "wave", .5); continue; }
      if (o.t > 2.6 || o.x < -40 || o.x > W + 40 || o.f < -260) G.blobs.splice(i, 1); }
  }
  /* harpoon: auto-aims at the boss (if surfaced) or the nearest shark, flies out on a rope, sticks, then reels back */
  function harpTarget() {
    var b = G.boss; if (b && b.sub < .6 && b.st !== "ko") return { boss: 1 };
    var best = null, bd = 430; G.ents.forEach(function (e) { if (e.t !== "shark" || e.st === "flee" || e.dead) return; var d = Math.hypot(e.x - G.x, e.yw - G.yw); if (d < bd && (e.yw - G.yw) * G.dir > -60) { bd = d; best = e; } });
    return best ? { e: best } : null;
  }
  function tgPos(tg) { if (!tg) return null; if (tg.boss) { var b = G.boss; if (!b || b.sub >= .6 || b.st === "ko") return null; return { x: b.x, yw: bossYw(b) }; } if (tg.e.st === "flee" || G.ents.indexOf(tg.e) < 0) return null; return { x: tg.e.x, yw: tg.e.yw }; }
  function fire() {
    return;   // harpoons removed (family version)
    if (!G.running || G.phase !== "ride" || G.ammo <= 0 || G.fcd > 0) return;
    G.ammo--; G.fcd = .32; var tg = harpTarget(), p = tgPos(tg), ax = 0, ay = G.dir;
    if (p) { ax = p.x - G.x; ay = p.yw - G.yw; var l = Math.hypot(ax, ay) || 1; ax /= l; ay /= l; }
    var sp = 900 + speed(); G.harps.push({ x: G.x, yw: G.yw + G.dir * 12, vx: ax * sp, vy: ay * sp, t: 0, st: "fly", tg: tg });
    sfx("throw"); buzz(12); G.fx.push({ k: "spray", x: G.x, y: sy(G.yw), t: 0 });
  }
  function harpStep(dt) {
    for (var i = G.harps.length - 1; i >= 0; i--) { var h = G.harps[i]; h.t += dt;
      if (h.st === "fly") {
        var p = tgPos(h.tg);
        if (p) { var sp = Math.hypot(h.vx, h.vy), cur = Math.atan2(h.vx, h.vy), want = Math.atan2(p.x - h.x, p.yw - h.yw), d = ((want - cur + Math.PI * 3) % (Math.PI * 2)) - Math.PI, m = 10 * dt;
          cur += Math.max(-m, Math.min(m, d)); h.vx = Math.sin(cur) * sp; h.vy = Math.cos(cur) * sp; }
        h.x += h.vx * dt; h.yw += h.vy * dt;
        var hit = 0, b = G.boss;
        if (b && b.sub < .6 && b.st !== "ko" && Math.hypot(h.x - b.x, h.yw - bossYw(b)) < b.size * .26) { hit = 1; var crit = b.st === "crash"; bossHit(Math.round(b.B.harp * (crit ? 1.6 : 1)), crit ? "CRITICAL!" : "HARPOONED!", crit ? "#ff9d2e" : "#ffd23f"); }
        if (!hit) for (var j = 0; j < G.ents.length; j++) { var e = G.ents[j]; if (e.t !== "shark" || e.st === "flee" || e.dead) continue;
          if (Math.hypot(h.x - e.x, h.yw - e.yw) < 34) { hit = 1; sharkHit(e, h); break; } }
        if (hit) { h.st = "reel"; h.stick = .14; sfx("thud"); buzz(18); G.fx.push({ k: "wsplash", x: h.x, y: sy(h.yw), t: 0 }); G.fx.push({ k: "ring", x: h.x, y: sy(h.yw), t: 0 }); }
        else if (h.t > .62) h.st = "reel";
      } else { if (h.stick > 0) { h.stick -= dt; continue; } var dx = G.x - h.x, dy = G.yw - h.yw, l = Math.hypot(dx, dy) || 1; h.x += dx / l * 1150 * dt; h.yw += dy / l * 1150 * dt; if (l < 24 || h.t > 1.6) G.harps.splice(i, 1); }
    }
  }
  function sharkHit(e, h) {
    e.hp = (e.hp || 2) - 1; e.fl = .35; e.x += h.vx * .03; e.yw += h.vy * .03;
    if (e.hp <= 0) { e.st = "flee"; e.ft = 0; var s = e.x >= G.x ? 1 : -1; e.vx = s * 230; e.vy = G.dir * 240; gain(300, e.x, sy(e.yw) - 20, "SHARK SCARED OFF!"); }
    else { pop(e.x, sy(e.yw) - 30, "HIT! 🔱", "#ffb15e"); if (e.st === "lunge") { e.st = "gone"; e.vx = -e.vx * .6; e.vy = -e.vy * .4; } else if (e.st === "warn") e.wt += .5; }
  }

  /* ---------- drawing ---------- */
  // riding the wave in (2D renderer): the camera tips a little toward a low drone angle, still mostly overhead, so the
  // wave behind you stands up on the horizon side. A CSS perspective on the two canvases (the HUD stays flat); the 3D
  // renderer already has its own tilted camera, so it stays off there.
  var TLT = 0, TLTs = "";
  function droneTilt() {
    var on = !D3 && !REDUCE && G.running && (G.phase === "ride" || G.phase === "ridein" || G.phase === "victory" || (G.phase === "popup" && G.popT > .5));
    TLT += ((on ? 1 : 0) - TLT) * (on ? .025 : .08); if (TLT < .004) TLT = 0;
    var v = TLT ? "perspective(1150px) rotateX(" + (22 * TLT).toFixed(2) + "deg) scale(" + (1 + .2 * TLT).toFixed(3) + ")" : "";
    if (v !== TLTs) { TLTs = v; [cv, gl_c].forEach(function (c) { c.style.transformOrigin = "50% 52%"; c.style.transform = v; }); }
  }
  function draw() {
    camUpdate(); droneTilt();
    SHK.x = SHK.y = 0; if (G.shake > 0.5) { SHK.x = rnd(-G.shake, G.shake); SHK.y = rnd(-G.shake, G.shake); }
    if (D3) { var t3 = performance.now(); try { R3.render(); } catch (e) { off3D("render error: " + (e && e.message)); } FPSM.r3 = (FPSM.r3 || 0) * .9 + (performance.now() - t3) * .1; } if (false) { try { R3.render(); } catch (e) { off3D("render error: " + (e && e.message)); } }   // the 3D world (game3d.js); the 2D canvas is the overlay on top
    if (!D3) water(G.t, G.cam);
    cx.setTransform(DPR, 0, 0, DPR, 0, 0); cx.clearRect(0, 0, W, H);
    cx.translate(CAM.x, CAM.y); cx.scale(ZOOM, ZOOM); cx.translate(-CAM.x, -CAM.y);
    if (!GL && !D3) water(G.t, G.cam);
    cx.translate(SHK.x, SHK.y);
    drawShore();
    if (G.wv && G.phase === "ride") drawPocket();
    // paddling out, the breaking waves roll OVER the surfer (drawn after him); otherwise they sit under everything
    var wOver = G.phase === "swim" || (G.phase === "death" && G.deathPaddle);
    if (!wOver) G.ents.forEach(function (e) { if (e.t === "brk") drawWave(e); });
    if (G.phase === "death") deathWater();
    // wake
    if (!D3) { G.wake.forEach(function (w) { cx.globalAlpha = (1 - w.t / 1.1) * .7; cx.fillStyle = "#fff"; cx.beginPath(); cx.arc(w.x, sy(w.yw), w.s * (1 + w.t), 0, 7); cx.fill(); }); cx.globalAlpha = 1; }
    G.ents.forEach(function (e) { if (!e.sky && e.t !== "brk" && e.t !== "toss" && e.t !== "pier") drawEnt(e); });
    drawBoss(); drawBlobs();
    drawPier();      // the deck never overlaps a grounded surfer (it pushes you off), so the surfer always draws on top
    drawSurfer();
    if (wOver) { G.ents.forEach(function (e) { if (e.t === "brk") drawWave(e); }); washOver(); }
    drawHarps(); drawBossBar(); drawRescue();
    G.ents.forEach(function (e) { if (e.t === "toss") drawEnt(e); });
    // sky layer: gull shadows, gulls, heli, plane
    G.gulls.forEach(function (g) { var flap = Math.sin(g.f * 9) * .15; cx.globalAlpha = .18; cx.fillStyle = "#001018"; cx.beginPath(); cx.ellipse(g.x + 26, g.y + 34, 14, 5, 0, 0, 7); cx.fill(); cx.globalAlpha = 1;
      if (!spr("gull", g.x, g.y, 46 + flap * 40, (g.vx > 0 ? 1 : -1) * Math.PI / 2)) { cx.strokeStyle = "#fff"; cx.lineWidth = 2.5; cx.beginPath(); cx.moveTo(g.x - 12, g.y - 4 + flap * 20); cx.quadraticCurveTo(g.x - 5, g.y - 8, g.x, g.y); cx.quadraticCurveTo(g.x + 5, g.y - 8, g.x + 12, g.y - 4 + flap * 20); cx.stroke(); } });
    G.ents.forEach(function (e) { if (e.sky) drawEnt(e); });
    // effects
    G.fx.forEach(function (f) {
      if (D3 && f.k !== "txt" && f.k !== "ring" && f.k !== "heal") return;
      if (f.k === "heal") { var ha = 1 - f.t / .6; cx.save(); cx.globalAlpha = Math.max(0, ha); cx.fillStyle = "#7dffb0"; cx.font = "900 18px system-ui"; cx.textAlign = "center";
        for (var hq = 0; hq < 6; hq++) { var han = hq / 6 * 6.283 + f.t * 3; cx.fillText("✚", f.x + Math.cos(han) * (16 + f.t * 70), f.y + Math.sin(han) * (10 + f.t * 40) - f.t * 30); } cx.restore(); return; }   // splashes, spray, bubbles, debris: 3D particles
      if (f.k === "txt") { var a = 1 - f.t / 1.1; cx.globalAlpha = Math.max(0, a); cx.font = (f.big ? "900 24px" : "800 15px") + " 'Alfa Slab One',Georgia,serif"; cx.textAlign = "center"; cx.lineWidth = 4; cx.strokeStyle = "rgba(0,20,40,.7)"; cx.strokeText(f.txt, f.x, f.y - f.t * 40); cx.fillStyle = f.col; cx.fillText(f.txt, f.x, f.y - f.t * 40); cx.globalAlpha = 1; }
      else if (f.k === "ring") { cx.strokeStyle = "rgba(255,210,63," + (1 - f.t / .6) + ")"; cx.lineWidth = 3; cx.beginPath(); cx.arc(f.x, f.y, 14 + f.t * 70, 0, 7); cx.stroke(); }
      else if (f.k === "washover") { var wf = f.t / .6; if (ok(IM.wave)) { var wh2 = 90, ww2 = wh2 * IM.wave.naturalWidth / IM.wave.naturalHeight; cx.save(); cx.globalAlpha = Math.max(0, 1 - wf * .8); cx.drawImage(IM.wave, f.x - ww2 / 2, f.y - 120 + wf * 130, ww2, wh2); cx.restore(); } }
      else if (f.k === "wsplash") { var a2 = Math.max(0, 1 - f.t / .6), s2 = 70 + f.t * 120; if (ok(IM.splash)) spr("splash", f.x, f.y - 6, s2, 0, a2); }
      else if (f.k === "splash") { for (var q2 = 0; q2 < 18; q2++) { var an = q2 / 18 * 6.283, rr2 = f.t * 120; cx.fillStyle = "rgba(255,255,255," + (1 - f.t / .6) + ")"; cx.beginPath(); cx.arc(f.x + Math.cos(an) * rr2, f.y + Math.sin(an) * rr2 * .6, 4 - f.t * 4, 0, 7); cx.fill(); } cx.strokeStyle = "rgba(255,255,255," + (1 - f.t / .6) + ")"; cx.lineWidth = 3; cx.beginPath(); cx.ellipse(f.x, f.y, f.t * 90, f.t * 54, 0, 0, 7); cx.stroke(); }
      else if (f.k === "bubble") { cx.strokeStyle = "rgba(255,255,255," + (.8 * (1 - f.t / .6)) + ")"; cx.lineWidth = 1.4; cx.beginPath(); cx.arc(f.x, f.y - f.t * 14, 2 + f.t * 6, 0, 7); cx.stroke(); }
      else if (f.k === "debris") { f.p.forEach(function (q) { var d = q[1] * f.t, a = 1 - f.t / .6; cx.fillStyle = "rgba(110,104,96," + a + ")"; cx.beginPath(); cx.arc(f.x + Math.cos(q[0]) * d, f.y + Math.sin(q[0]) * d * .8 - Math.sin(f.t / .6 * Math.PI) * 24, q[2] * (1 - f.t), 0, 7); cx.fill(); }); }
      else if (f.k === "spray") { for (var k = 0; k < 10; k++) { cx.fillStyle = "rgba(255,255,255," + (1 - f.t / .6) + ")"; cx.beginPath(); cx.arc(f.x + Math.cos(k) * f.t * 80, f.y + Math.sin(k * 2) * f.t * 50, 3, 0, 7); cx.fill(); } }
    });
    RND.draw();   // the fisherman's rounds: flash, smoke, brass, sparks, splashes (2D overlay in both renderers)
    if (G.hint > 0 && (G.phase === "ride" || G.phase === "swim")) { cx.save(); cx.setTransform(DPR, 0, 0, DPR, 0, 0); cx.globalAlpha = Math.min(1, G.hint) * (.6 + .4 * Math.sin(G.t * 6));
      label(G.phase === "swim" ? "🌊 Tap DUCK DIVE as each wave reaches you" : "🏄 Stay on the clean face · JUMP to launch off the lip", W / 2, H - 132, "#fff"); cx.restore(); }
    if (G.phase === "death" && G.deathCause === "eel") eelScreen();
    if (G.hurt > 0) { cx.fillStyle = "rgba(255,40,60," + G.hurt * .9 + ")"; cx.fillRect(-20, -20, W + 40, H + 40); }
    if (G.heal > 0) { cx.save(); cx.setTransform(DPR, 0, 0, DPR, 0, 0); var hg = cx.createRadialGradient(W / 2, H / 2, H * .2, W / 2, H / 2, H * .7); hg.addColorStop(0, "rgba(120,255,170,0)"); hg.addColorStop(1, "rgba(120,255,170," + (G.heal * 1.1) + ")"); cx.fillStyle = hg; cx.fillRect(0, 0, W, H); cx.restore(); }
    if (G.phase === "beach") drawNalu();
    drawConf(); drawBanner();
    hud(); jumpBtn();
  }
  // the submarine, from overhead: dark steel hull with a sail (conning tower), a foam wake; the periscope stage is just a wake line
  // a wave passing over the surfer on the paddle-out: whitewater churning on top of him + bubbles (both renderers; in 3D the
  // rigged surfer already sinks under the 3D whitewater, so this is for the 2D sprite surfers)
  function washOver() {
    if (D3 && R3.rig(G.surfer)) return; var x = G.x, y = sy(G.yw);
    G.ents.forEach(function (e) { if (e.t !== "brk") return; var d = (e.yw - G.yw) * G.dir; if (d > 46 || d < -70) return;
      var k = 1 - Math.abs(d + 12) / 58; if (k <= 0) return; k = Math.min(1, k * 1.4);
      var g = cx.createRadialGradient(x, y, 4, x, y, 58); g.addColorStop(0, "rgba(240,252,255," + (.82 * k) + ")"); g.addColorStop(.6, "rgba(215,240,250," + (.5 * k) + ")"); g.addColorStop(1, "rgba(215,240,250,0)");
      cx.fillStyle = g; cx.beginPath(); cx.ellipse(x, y, 62, 50, 0, 0, 7); cx.fill();
      cx.strokeStyle = "rgba(255,255,255," + (.7 * k) + ")"; cx.lineWidth = 1.3;
      for (var b = 0; b < 9; b++) { var a = b * 2.39 + G.t * 1.7, r = 10 + (b * 7.3 + G.t * 30) % 38; cx.beginPath(); cx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r * .8 - ((G.t * 40 + b * 9) % 20), 1.5 + b % 3, 0, 7); cx.stroke(); } });
  }
  // an incoming breaking wave on the paddle-out: dark trough, sunlit face, a white crest (photo art), whitewater and spray
  function drawWave(e) {
    var y = sy(e.yw), up = 1, sw = Math.sin(G.t * 1.6 + e.ph) * 4, near = (e.yw - G.yw) * G.dir;
    if (D3) { if (!e.hit && near > 0 && near < 170 && G.phase === "swim") label(near < 60 ? "DUCK!" : "WAVE!", G.x, y + 34, near < 60 ? "#ffd23f" : "#cfe8ff"); return; }
    var tr = cx.createLinearGradient(0, y - 46, 0, y + 6); tr.addColorStop(0, "rgba(2,30,55,0)"); tr.addColorStop(.75, "rgba(2,30,55,.42)"); tr.addColorStop(1, "rgba(2,30,55,0)");
    cx.fillStyle = tr; cx.fillRect(-60, y - 46, W + 120, 52);
    var fc = cx.createLinearGradient(0, y + 4, 0, y + 40); fc.addColorStop(0, "rgba(255,255,255,.75)"); fc.addColorStop(1, "rgba(200,240,250,0)");
    cx.fillStyle = fc; cx.fillRect(-60, y + 4, W + 120, 36);                                                 // whitewater rolling toward the sand
    if (ok(IM.wave)) {   // a wall of whitewater: the breaking part of the wave photo, tiled mirror / plain so the seams don't show
      var nw = IM.wave.naturalWidth, nh = IM.wave.naturalHeight, wh = 84, tw = wh * nw * .38 / nh, off = ((G.t * 14 + e.ph * 40) % (tw * 2) + tw * 2) % (tw * 2);
      for (var i0 = 0, x0 = -off - tw; x0 < W + tw; x0 += tw - 1, i0++) { cx.save(); cx.translate(x0 + tw / 2, 0); if (i0 % 2) cx.scale(-1, 1); cx.drawImage(IM.wave, nw * .62, 0, nw * .38, nh, -tw / 2, y - wh * .6 + sw, tw, wh); cx.restore(); } }
    else { cx.strokeStyle = "rgba(255,255,255,.8)"; cx.lineWidth = 6; cx.beginPath(); for (var x = -10; x <= W + 10; x += 10) { var yy = y + Math.sin(x * .035 + G.t * 2) * 6; x === -10 ? cx.moveTo(x, yy) : cx.lineTo(x, yy); } cx.stroke(); }
    for (var k = 0; k < 9; k++) { var sx = (k * 53 + G.t * 60 + e.ph * 30) % (W + 40) - 20, ph = (G.t * 2.2 + k * .37) % 1;             // spray kicking off the lip
      cx.fillStyle = "rgba(255,255,255," + (.75 * (1 - ph)) + ")"; cx.beginPath(); cx.arc(sx + ph * 10, y + 4 + ph * 22, 1.5 + ph * 2.5, 0, 7); cx.fill(); }
    if (!e.hit && near > 0 && near < 170 && G.phase === "swim") label(near < 60 ? "DUCK!" : "WAVE!", G.x, y + 34, near < 60 ? "#ffd23f" : "#cfe8ff");
  }
  // the wave you're riding: it sits just behind you and peels across. Open face ahead of the curl, whitewater behind.
  // Drawn by both renderers' overlay: the pocket band, the lip's landing shadow + warning ring, red-tinted spray off the
  // whitewater, the ⬆ LIP — JUMP! prompt and the wash meter. (2D only: the wave art itself; 3D draws its own wave.)
  function drawPocket() {
    // img/game/wave.webp is itself a peeling wave: open green face on the left, the curl at ~42%, whitewater to the right.
    // It is mirrored so the whitewater sits behind the curl (the side it has already broken on) and lined up on wv.px.
    var w = G.wv, ry = sy(G.yw), px = w.px, pd = w.pd, pr = wvProg(w);
    var WH = 92 + 30 * pr, im = IM.wave, has = ok(im), WW = has ? WH * im.naturalWidth / im.naturalHeight : 400, top = ry - WH - 2 + Math.sin(G.t * 1.6) * 2, CURL = .42;   // the wave grows as it peels
    if (!D3) {
      var fg = cx.createLinearGradient(0, top + WH * .55, 0, ry + 46); fg.addColorStop(0, "rgba(20,120,140,.0)"); fg.addColorStop(.35, "rgba(24,140,160,.35)"); fg.addColorStop(1, "rgba(60,190,200,0)");
      cx.fillStyle = fg; cx.fillRect(-60, top + WH * .55, W + 120, ry + 46 - (top + WH * .55));   // the face running down past the rider
      if (has) {
        var nw = im.naturalWidth, nh = im.naturalHeight;
        cx.save(); cx.translate(px, 0); cx.scale(-pd, 1);   // local x: + = the broken side, − = the open face
        var x0 = -CURL * WW; cx.drawImage(im, x0, top, WW, WH);
        for (var xb = x0 + WW; xb < W + 120; xb += WW * .38) cx.drawImage(im, nw * .62, 0, nw * .38, nh, xb - 2, top, WW * .38, WH);
        for (var xf = x0; xf > -W - 120; xf -= WW * .34) cx.drawImage(im, 0, 0, nw * .34, nh, xf - WW * .34 + 2, top, WW * .34, WH);
        cx.restore();
      }
      for (var k = 0; k < 12; k++) { var span = Math.max(1, pd > 0 ? px + 40 : W + 40 - px), fx = (pd > 0 ? -40 : px) + ((k * 47 + G.t * 70) % span), fy = top + WH - 6 + Math.sin(G.t * 5 + k) * 6;   // foam tumbling at the base
        cx.fillStyle = "rgba(255,255,255,.8)"; cx.beginPath(); cx.arc(fx, fy, 3 + (k % 3) * 2, 0, 7); cx.fill(); }
      for (var s2 = 0; s2 < 6; s2++) { var ph2 = (G.t * 2.4 + s2 * .17) % 1; cx.fillStyle = "rgba(255,255,255," + (.8 * (1 - ph2)) + ")"; cx.beginPath(); cx.arc(px - pd * (4 + ph2 * 26), top + 10 - ph2 * 18 + s2 * 2, 2 + ph2 * 2, 0, 7); cx.fill(); }   // spray off the curl
    }
    // danger: red-tinted spray kicking up off the whitewater behind the curl
    for (var q = 0; q < 9; q++) { var ph = (G.t * 1.7 + q * .113) % 1, sx = px - pd * (18 + q * 21 + ph * 10); if (sx < -20 || sx > W + 20) continue;
      cx.fillStyle = "rgba(255," + (120 + q * 8) + "," + (120 + q * 8) + "," + (.55 * (1 - ph)) + ")"; cx.beginPath(); cx.arc(sx, ry - 6 - ph * 26 + (q % 3) * 5, 2 + ph * 3, 0, 7); cx.fill(); }
    // FOAM vs CLEAN, unmistakable on your row: a churning white band (with a red-dashed edge) on the broken side of the curl,
    // and a fresh teal lane on the unbroken face running out along the shoulder to the side with no foam
    var fe = px + pd * 4, fl = pd > 0 ? -40 : fe, fr = pd > 0 ? fe : W + 40;
    if (fr > fl) { var fgd = cx.createLinearGradient(0, ry - 30, 0, ry + 30); fgd.addColorStop(0, "rgba(255,255,255,0)"); fgd.addColorStop(.5, "rgba(250,253,255,.62)"); fgd.addColorStop(1, "rgba(255,255,255,0)");
      cx.fillStyle = fgd; cx.fillRect(fl, ry - 30, fr - fl, 60);
      for (var fb = 0; fb < 14; fb++) { var fph = (G.t * 1.3 + fb * .137) % 1, fbx = fe - pd * (6 + ((fb * 37 + G.t * 40) % Math.max(1, fr - fl))); if (fbx < fl || fbx > fr) continue;
        cx.fillStyle = "rgba(255,255,255," + (.85 * (1 - fph)) + ")"; cx.beginPath(); cx.arc(fbx, ry - 18 + (fb % 5) * 9 + Math.sin(G.t * 4 + fb) * 3, 3 + (fb % 3) * 2.2, 0, 7); cx.fill(); }
      if (Math.abs(fe - W / 2) < W / 2 + 10) { var fx0 = Math.max(46, Math.min(W - 46, fe - pd * 46)); if ((fx0 - fe) * pd < -20) label("⚠ FOAM", fx0, ry + 44, "#ff9d9d"); } }
    var ca = .2 + .06 * Math.sin(G.t * 3), cl = pd > 0 ? fe : -40, cr = pd > 0 ? W + 40 : fe;
    var cg = cx.createLinearGradient(fe, 0, pd > 0 ? W + 40 : -40, 0); cg.addColorStop(0, "rgba(61,220,190," + ca + ")"); cg.addColorStop(1, "rgba(61,220,190,0)");
    cx.fillStyle = cg; cx.fillRect(cl, ry - 26, cr - cl, 52);
    cx.save(); cx.setLineDash([7, 5]); cx.lineDashOffset = -G.t * 20; cx.strokeStyle = "rgba(255,90,90,.9)"; cx.lineWidth = 3; cx.beginPath(); cx.moveTo(fe, ry - 40); cx.lineTo(fe, ry + 36); cx.stroke(); cx.restore();   // the edge of the foam
    var clx = px + pd * 150; if (clx > 60 && clx < W - 60 && (G.x - clx) * pd < 40 || G.hint > 0) label(pd > 0 ? "CLEAN FACE ➜" : "⬅ CLEAN FACE", Math.max(70, Math.min(W - 70, clx)), ry + 44, "#7dffd8");
    var rel = (G.x - px) * pd;
    // the safe POCKET: a glowing lane on the face 14–110 px ahead of the curl, ripples running the way the wave peels
    var a = px + pd * 14, b = px + pd * 110, x1 = Math.min(a, b), x2 = Math.max(a, b), on = G.pocket, ga = on ? .5 + .12 * Math.sin(G.t * 8) : .32;
    var bg = cx.createLinearGradient(0, ry - 20, 0, ry + 20); bg.addColorStop(0, "rgba(127,227,242,0)"); bg.addColorStop(.5, "rgba(127,227,242," + ga + ")"); bg.addColorStop(1, "rgba(127,227,242,0)");
    cx.fillStyle = bg; if (cx.roundRect) { cx.beginPath(); cx.roundRect(x1, ry - 20, x2 - x1, 40, 20); cx.fill(); } else cx.fillRect(x1, ry - 20, x2 - x1, 40);
    cx.strokeStyle = "rgba(127,227,242," + (on ? .75 : .45) + ")"; cx.lineWidth = 1.5; if (cx.roundRect) { cx.beginPath(); cx.roundRect(x1, ry - 17, x2 - x1, 34, 17); cx.stroke(); }
    cx.strokeStyle = "rgba(220,250,255," + (on ? .7 : .45) + ")"; cx.lineWidth = 2;
    for (var r = 0; r < 4; r++) { var f = ((G.t * .9 + r / 4) % 1), rx = pd > 0 ? x1 + f * (x2 - x1) : x2 - f * (x2 - x1); cx.globalAlpha = Math.sin(f * Math.PI); cx.beginPath(); cx.moveTo(rx, ry - 12); cx.quadraticCurveTo(rx + pd * 6, ry, rx, ry + 12); cx.stroke(); }
    cx.globalAlpha = 1;
    if (!on && G.jump <= 0) { cx.strokeStyle = "rgba(255,255,255,.5)"; cx.lineWidth = 2; cx.setLineDash([5, 6]); if (cx.roundRect) { cx.beginPath(); cx.roundRect(x1, ry - 16, x2 - x1, 32, 16); cx.stroke(); } cx.setLineDash([]); }
    if (G.lip && G.jump <= 0 && G.t - G.lastJumpT > 6) { cx.save(); cx.setTransform(DPR, 0, 0, DPR, 0, 0); cx.font = "900 17px 'Alfa Slab One',Georgia,serif"; cx.textAlign = "center"; cx.lineWidth = 5; cx.strokeStyle = "rgba(5,18,34,.85)"; var ly = H - 172, lx = W / 2; cx.strokeText("⬆ JUMP OFF THE LIP!", lx, ly); cx.fillStyle = Math.floor(G.t * 8) % 2 ? "#ffd23f" : "#fff"; cx.fillText("⬆ JUMP OFF THE LIP!", lx, ly); cx.restore(); }
    if (G.climb > 0) label("⬆ UP THE FACE", G.x, ry - 50, "#7dffd8");
    if (G.eng > .02) { cx.strokeStyle = "rgba(255,90,90,.95)"; cx.lineWidth = 4; cx.beginPath(); cx.arc(G.x, ry, 30, -Math.PI / 2, -Math.PI / 2 + G.eng * Math.PI * 2); cx.stroke(); }
  }
  function comicSplash(x, y, t, txt) {   // a cartoon splash: white starburst, droplets and a comic word
    if (t > 1.3) return; var a = Math.max(0, 1 - t / 1.3), r = 18 + t * 70;
    cx.save(); cx.globalAlpha = a; cx.fillStyle = "rgba(255,255,255,.9)"; cx.beginPath();
    for (var i = 0; i < 24; i++) { var an = i / 24 * 6.283, rr = i % 2 ? r * .55 : r; cx.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr * .7); } cx.closePath(); cx.fill();
    for (var d = 0; d < 10; d++) { var da = d * .63 + 1, dr = r * 1.15; cx.beginPath(); cx.arc(x + Math.cos(da) * dr, y + Math.sin(da) * dr * .7 - Math.sin(t * 3) * 10, 3.5, 0, 7); cx.fill(); }
    cx.font = "900 " + (20 + t * 10) + "px 'Alfa Slab One',Georgia,serif"; cx.textAlign = "center"; cx.lineWidth = 5; cx.strokeStyle = "#0b2a44"; cx.strokeText(txt, x, y - 40 - t * 20); cx.fillStyle = "#ffd23f"; cx.fillText(txt, x, y - 40 - t * 20);
    cx.restore();
  }
  function deathWater() {
    var x = G.deathX, y = sy(G.deathYw), t = G.deathT;
    if (D3) { if (G.deathCause === "shark" || G.deathCause === "ray") comicSplash(x, y, t, "SPLASH!");
      else if (G.deathCause === "eel") { cx.save(); cx.globalCompositeOperation = "lighter"; var er3 = 60 + t * 120, gl3 = cx.createRadialGradient(x, y, 4, x, y, er3); gl3.addColorStop(0, "rgba(140,230,255," + (.5 * Math.max(0, 1 - t / 2.8)) + ")"); gl3.addColorStop(1, "rgba(60,160,255,0)"); cx.fillStyle = gl3; cx.beginPath(); cx.arc(x, y, er3, 0, 7); cx.fill(); cx.restore(); }
      return; }
    if (G.deathCause === "shark" && GORE) {   // cartoon only: a soft, rounded red dye cloud spreading in the water (no gore)
      var g = Math.min(1, t / 1.8), fade = t > 2.4 ? Math.max(0, 1 - (t - 2.4) / .7) : 1;
      for (var k = 0; k < 9; k++) { var an = k * 2.399, d = (6 + k * 6) * g, r = (16 + (k % 3) * 9) * (.35 + g * 1.25);
        cx.fillStyle = "rgba(226,58,78," + ((.3 - k * .018) * fade) + ")"; cx.beginPath(); cx.arc(x + Math.cos(an) * d, y + Math.sin(an) * d * .8, r, 0, 7); cx.fill(); }
      cx.fillStyle = "rgba(255,150,160," + (.22 * fade) + ")"; cx.beginPath(); cx.arc(x - 8 * g, y - 6 * g, 18 * (.4 + g), 0, 7); cx.fill();
      comicSplash(x, y, t, "SPLASH!");
    } else if (G.deathCause === "shark" || G.deathCause === "ray") {   // "Cartoon red" off (and stingrays): a splash and bubbles
      for (var j = 0; j < 3; j++) { var rr = ((t * .8 + j / 3) % 1); cx.strokeStyle = "rgba(255,255,255," + (.7 * (1 - rr)) + ")"; cx.lineWidth = 2.5; cx.beginPath(); cx.ellipse(x, y, 14 + rr * 70, 9 + rr * 44, 0, 0, 7); cx.stroke(); }
      comicSplash(x, y, t, G.deathCause === "ray" ? "OUCH!" : "SPLASH!");
    } else if (G.deathCause === "wave") {                              // swallowed by a breaking wave
      if (ok(IM.wave)) { var f = Math.min(1, t / 1.2), wh = 150, ww = wh * IM.wave.naturalWidth / IM.wave.naturalHeight; cx.save(); cx.globalAlpha = Math.min(1, 1.6 - t * .5); cx.drawImage(IM.wave, x - ww / 2, y - 200 + f * 210, ww, wh); cx.restore(); }
    } else {                                                           // the water lights up with electricity
      cx.save(); cx.globalCompositeOperation = "lighter"; var er = 60 + t * 120, gl = cx.createRadialGradient(x, y, 4, x, y, er); gl.addColorStop(0, "rgba(140,230,255," + (.7 * Math.max(0, 1 - t / 2.8)) + ")"); gl.addColorStop(1, "rgba(60,160,255,0)");
      cx.fillStyle = gl; cx.beginPath(); cx.arc(x, y, er, 0, 7); cx.fill(); cx.restore();
    }
  }
  function eelScreen() {
    var t = G.deathT; if (t > 2.6) return;
    cx.save(); cx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (Math.random() < .5) { cx.fillStyle = "rgba(170,235,255," + (.25 * Math.random()) + ")"; cx.fillRect(0, 0, W, H); }
    cx.strokeStyle = "rgba(220,248,255,.9)"; cx.lineWidth = 2; cx.shadowColor = "#7fe3f2"; cx.shadowBlur = 12;
    for (var a = 0; a < 4; a++) { cx.beginPath(); var x0 = Math.random() * W, y0 = 0; cx.moveTo(x0, y0); for (var s = 0; s < 10; s++) { x0 += rnd(-34, 34); y0 += H / 10; cx.lineTo(x0, y0); } cx.stroke(); }
    cx.restore();
  }
  /* cartoon damage, built up with each shark / stingray hit: a redder sunburnt tint, purple bruise ovals, and
     bandage strips with little holes. No blood, ever. Painted onto the surfer sprite only (cached per level). */
  var DMG = {};
  var BRUISE = [[.42, .3], [.6, .38], [.38, .52], [.58, .56], [.48, .44]], BAND = [[.5, .34, .5], [.44, .5, -.6], [.56, .6, .3], [.47, .24, -.2]];
  function bandage(x, bx, by, w, h, rot) {
    x.save(); x.translate(bx, by); x.rotate(rot); x.fillStyle = "#f3d7a8"; x.strokeStyle = "rgba(120,80,40,.6)"; x.lineWidth = Math.max(1, w * .06);
    x.beginPath(); if (x.roundRect) x.roundRect(-w / 2, -h / 2, w, h, h / 2); else x.rect(-w / 2, -h / 2, w, h); x.fill(); x.stroke();
    x.fillStyle = "#e9c48e"; x.fillRect(-w * .16, -h / 2, w * .32, h);
    x.fillStyle = "rgba(120,80,40,.55)"; for (var i = -1; i <= 1; i += 2) for (var j = -1; j <= 1; j += 2) { x.beginPath(); x.arc(i * w * .07, j * h * .2, Math.max(.8, h * .07), 0, 7); x.fill(); }
    x.restore();
  }
  function bruise(x, bx, by, r) {
    var gr = x.createRadialGradient(bx, by, 1, bx, by, r); gr.addColorStop(0, "rgba(110,60,150,.85)"); gr.addColorStop(.6, "rgba(140,80,170,.6)"); gr.addColorStop(1, "rgba(140,80,170,0)");
    x.fillStyle = gr; x.beginPath(); x.ellipse(bx, by, r, r * .75, .4, 0, 7); x.fill();
  }
  function marks(x, w, h, lvl, ox, oy) {   // bruises from hit 1, bandages from hit 2 (shared by the sprite and the drawn runner/paddler)
    ox = ox || 0; oy = oy || 0;
    for (var i = 0; i < Math.min(BRUISE.length, lvl); i++) bruise(x, ox + BRUISE[i][0] * w, oy + BRUISE[i][1] * h, w * .07);
    for (var k = 0; k < Math.min(BAND.length, lvl - 1); k++) bandage(x, ox + BAND[k][0] * w, oy + BAND[k][1] * h, w * .2, w * .075, BAND[k][2]);
  }
  var SIL = {};
  function silh(img) {   // the rider as a flat dark shape (his shadow on the deck), cached per image
    var key = img.src.split("/").pop(); if (SIL[key]) return SIL[key];
    var c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight; var x = c.getContext("2d");
    x.drawImage(img, 0, 0); x.globalCompositeOperation = "source-in"; x.fillStyle = "#00121e"; x.fillRect(0, 0, c.width, c.height); SIL[key] = c; return c; }
  function hurtImg(img, lvl) {
    if (lvl <= 0) return img; var key = img.src.split("/").pop() + lvl; if (DMG[key]) return DMG[key];
    var w = img.naturalWidth, h = img.naturalHeight, c = document.createElement("canvas"); c.width = w; c.height = h; var x = c.getContext("2d"); x.drawImage(img, 0, 0);
    x.globalCompositeOperation = "source-atop"; x.fillStyle = "rgba(235,60,60," + (lvl * .1) + ")"; x.fillRect(0, 0, w, h);
    marks(x, w, h, lvl);
    DMG[key] = c; return c;
  }
  function skinCol() { var k = Math.min(1, G.dmg / 5) * .75, a = [201, 138, 94], b = [226, 80, 70]; return "rgb(" + a.map(function (v, i) { return Math.round(v + (b[i] - v) * k); }).join(",") + ")"; }
  function board(x, y, w, h) { var bg = cx.createLinearGradient(0, y - h, 0, y + h); bg.addColorStop(0, "#ff8a2a"); bg.addColorStop(.5, "#ffd23f"); bg.addColorStop(.52, "#38a7e0"); bg.addColorStop(1, "#1a4f9c");
    cx.fillStyle = bg; cx.beginPath(); cx.ellipse(x, y, w, h, 0, 0, 7); cx.fill(); cx.strokeStyle = "rgba(255,255,255,.85)"; cx.lineWidth = .8; cx.beginPath(); cx.moveTo(x, y - h + 2); cx.lineTo(x, y + h - 2); cx.stroke(); }
  function suit(m) { return m ? "#2f6fb5" : "#13858c"; }
  /* the realistic run-out / paddle-out surfer: img/game/paddler_m|f.webp is one strip of 8 equal, registered cells,
     the same person (and board) as surfer_m|f, seen from overhead, head up the cell:
     0-3 running TOWARD the camera (front view: the run back to Nalu Vida, down the screen), 4 left-arm stroke, 5 arms out,
     6 right-arm stroke, 7 duck-dive (prone, head up with the neck showing), 8-11 running AWAY (back view: down the sand into the
     water, up the screen; 11 doubles as the wading step). Facing always follows the direction of travel.
     Damage (red tint, bruises, bandages) is baked onto a copy of the strip per hit level, like hurtImg. */
  var PK = .32;   // strip px → game px: the prone board comes out the same length as the riding surfer's board
  var PAD_N = 12, PAD_RUN = [0, 1, 2, 1], PAD_UP = [8, 9, 11, 9], PAD_STROKE = [4, 5, 6, 5];
  function padStrip(lvl) {
    var k = G.surfer === "m" ? "paddler_m" : "paddler_f", i = IM[k]; if (!ok(i)) return null;
    if (lvl <= 0) return i; var key = k + lvl; if (DMG[key]) return DMG[key];
    var w = i.naturalWidth, h = i.naturalHeight, cw = w / PAD_N, c = document.createElement("canvas"); c.width = w; c.height = h; var x = c.getContext("2d"); x.drawImage(i, 0, 0);
    x.globalCompositeOperation = "source-atop"; x.fillStyle = "rgba(235,60,60," + (lvl * .1) + ")"; x.fillRect(0, 0, w, h);
    for (var f = 0; f < PAD_N; f++) marks(x, cw * .62, h * .5, lvl, f * cw + cw * .19, h * (f < 4 || f > 7 ? .08 : .12));   // on the back / shoulders of each pose
    DMG[key] = c; return c;
  }
  // one cell of the strip, centred on (x, y), rotated (rot 0 = head up the screen); false if the art isn't loaded yet
  function padFrame(f, x, y, rot, sc, alpha) {
    var im = padStrip(G.dmg); if (!im) return false; var n = IM[G.surfer === "m" ? "paddler_m" : "paddler_f"], cw = n.naturalWidth / PAD_N, ch = n.naturalHeight, w = cw * PK * sc, h = ch * PK * sc;
    cx.save(); cx.translate(x, y); cx.rotate(rot); if (alpha != null) cx.globalAlpha = alpha;
    cx.fillStyle = "rgba(0,20,35,.22)"; cx.beginPath(); cx.ellipse(5, 6, w * .32, h * .44, 0, 0, 7); cx.fill();   // soft shadow, like the riding surfer's
    cx.filter = "brightness(1.2) contrast(1.08) saturate(1.12)";   // the riding sprite's grade, so the two read as the same person
    cx.drawImage(im, f * cw, 0, cw, ch, -w / 2, -h / 2, w, h); cx.restore(); return true;
  }
  function animF(seq, fps) { return REDUCE ? seq[1] : seq[Math.floor(G.t * fps) % seq.length]; }
  // running on the sand with the board under his/her arm (top-down, head toward rot = 0 → up the screen)
  // rot = heading (0 = up the screen, PI = down, plus a lean toward any sideways drift)
  function runner(x, y, rot) {
    var down = Math.cos(rot) < 0;   // heading down the screen: the front-view frames, which already face down
    if (padFrame(animF(down ? PAD_RUN : PAD_UP, 9), x, y - (REDUCE ? 0 : Math.abs(Math.sin(G.t * 14)) * 1.5), down ? rot - Math.PI : rot, .92)) return;
    var t = G.t * 11, s1 = Math.sin(t), m = G.surfer === "m", sk = skinCol();
    cx.save(); cx.translate(x, y - Math.abs(s1) * 2); cx.rotate(rot); cx.scale(1.3, 1.3);
    cx.fillStyle = "rgba(60,40,20,.25)"; cx.beginPath(); cx.ellipse(4, 8, 12, 15, 0, 0, 7); cx.fill();
    cx.fillStyle = sk; cx.beginPath(); cx.ellipse(-3.5, 9 + s1 * 5, 2.6, 6, 0, 0, 7); cx.fill(); cx.beginPath(); cx.ellipse(3.5, 9 - s1 * 5, 2.6, 6, 0, 0, 7); cx.fill();
    cx.fillStyle = suit(m); cx.beginPath(); cx.ellipse(0, 4, 7, 4.5, 0, 0, 7); cx.fill();
    cx.fillStyle = sk; cx.beginPath(); cx.ellipse(-8.5, -2 - s1 * 4, 2.4, 6, -.2, 0, 7); cx.fill();
    cx.fillStyle = sk; cx.beginPath(); cx.ellipse(0, -2, 8, 6.5, 0, 0, 7); cx.fill();
    if (!m) { cx.fillStyle = suit(m); cx.fillRect(-7, -4, 14, 3); }
    board(11, -1, 4.6, 19);
    cx.fillStyle = sk; cx.beginPath(); cx.ellipse(8.5, -2 + s1 * 3, 2.4, 5.5, .2, 0, 7); cx.fill();
    cx.fillStyle = m ? "#3b2a1c" : "#5a2f17"; cx.beginPath(); cx.arc(0, -10, 5.2, 0, 7); cx.fill(); cx.fillStyle = sk; cx.beginPath(); cx.arc(0, -11.5, 3.2, Math.PI * .1, Math.PI * .9); cx.fill();
    if (G.dmg) marks(cx, 16, 14, G.dmg, -8, -9);
    cx.restore();
  }
  // lying on the board, paddling (arms stroke in turn); duck-diving pushes the board under and leaves bubbles
  function paddler(x, y, rot, sink) {
    var t = G.t * 6, m = G.surfer === "m", sk = skinCol(), duck = G.duck > 0 ? Math.sin(Math.min(1, (0.8 - G.duck) / .8) * Math.PI) : 0;
    sink = Math.max(sink || 0, duck);
    if (G.phase === "swim" && G.yw < 70 && !sink) {   // wading in: the first few steps into the shallows, board still under the arm
      var by = y + (REDUCE ? 0 : Math.sin(G.t * 7) * 1.2);
      if (padFrame(REDUCE ? 11 : [11, 9][Math.floor(G.t * 4) % 2], x, by, rot, .92)) {
        cx.save(); cx.translate(x, by); cx.rotate(rot);   // the water line over the legs + a ring of foam
        var wl = 21 - Math.min(1, Math.max(0, G.yw) / 70) * 15, wg = cx.createLinearGradient(0, wl - 6, 0, wl + 10);   // the water line climbs as it gets deeper
        wg.addColorStop(0, "rgba(22,112,136,0)"); wg.addColorStop(1, "rgba(22,112,136,.72)");
        var lh = (29 - wl) / 2;   // just the legs below the water line (the feet end ~27 px below the centre)
        cx.fillStyle = wg; cx.beginPath(); cx.ellipse(1, wl + lh - 1, 11, lh + 1, 0, 0, 7); cx.fill();
        cx.strokeStyle = "rgba(255,255,255,.65)"; cx.lineWidth = 1.5; cx.beginPath(); cx.ellipse(1, wl + 2, 13 + Math.sin(G.t * 5), 4, 0, 0, 7); cx.stroke(); cx.restore();
        return;
      }
    }
    var pf = G.duck > 0 || (sink > .05 && G.phase !== "death") ? 7 : animF(PAD_STROKE, 4.5);
    if (padFrame(pf, x, y + Math.sin(G.t * 2.2) * 2, rot, 1 - sink * .2, 1 - sink * .45)) {
      if (sink > .05) { cx.save(); cx.translate(x, y); cx.rotate(rot); cx.globalAlpha = sink * .4; cx.fillStyle = "rgba(20,100,140,1)"; cx.beginPath(); cx.ellipse(0, 4, 16, 44, 0, 0, 7); cx.fill(); cx.restore(); }
      else if (!REDUCE && (pf === 4 || pf === 6)) { cx.fillStyle = "rgba(255,255,255,.7)"; var sd = pf === 4 ? -1 : 1;   // the reaching hand splashes in
        for (var q = 0; q < 3; q++) { var lx = sd * (13 + q * 3), ly = -30 + q * 4; cx.beginPath(); cx.arc(x + Math.cos(rot) * lx - Math.sin(rot) * ly, y + Math.sin(rot) * lx + Math.cos(rot) * ly, 2.2 - q * .5, 0, 7); cx.fill(); } }
      return;
    }
    cx.save(); cx.translate(x, y + Math.sin(G.t * 2.2) * 2); cx.rotate(rot); var s = 1.3 * (1 - sink * .2); cx.scale(s, s); cx.globalAlpha = 1 - sink * .6;
    cx.fillStyle = "rgba(0,20,35,.22)"; cx.beginPath(); cx.ellipse(4, 6, 9, 27, 0, 0, 7); cx.fill();
    board(0, 2, 7.5, 25);
    cx.fillStyle = sk; cx.beginPath(); cx.ellipse(-2.6, 18 + Math.sin(t * 1.3) * 1.5, 2.2, 7, .1, 0, 7); cx.fill(); cx.beginPath(); cx.ellipse(2.6, 18 - Math.sin(t * 1.3) * 1.5, 2.2, 7, -.1, 0, 7); cx.fill();
    cx.fillStyle = suit(m); cx.beginPath(); cx.ellipse(0, 10, 6, 4, 0, 0, 7); cx.fill();
    cx.fillStyle = sk; cx.beginPath(); cx.ellipse(0, 1, 6.6, 9.5, 0, 0, 7); cx.fill();
    if (!m) { cx.fillStyle = suit(m); cx.fillRect(-6, -1, 12, 3); }
    cx.strokeStyle = sk; cx.lineWidth = 3.4; cx.lineCap = "round";
    var a1 = Math.sin(t), a2 = Math.sin(t + Math.PI);
    cx.beginPath(); cx.moveTo(-5, -4); cx.lineTo(-10 - Math.max(0, a1) * 2, -6 - a1 * 9); cx.stroke();
    cx.beginPath(); cx.moveTo(5, -4); cx.lineTo(10 + Math.max(0, a2) * 2, -6 - a2 * 9); cx.stroke(); cx.lineCap = "butt";
    cx.fillStyle = m ? "#3b2a1c" : "#5a2f17"; cx.beginPath(); cx.arc(0, -8, 4.8, 0, 7); cx.fill();
    if (G.dmg) marks(cx, 13, 18, G.dmg, -6.5, -8);
    if (sink > .05) { cx.globalAlpha = sink * .55; cx.fillStyle = "rgba(20,100,140,1)"; cx.beginPath(); cx.ellipse(0, 2, 12, 30, 0, 0, 7); cx.fill(); }
    cx.restore();
    if (!sink) { cx.fillStyle = "rgba(255,255,255,.7)"; [a1, a2].forEach(function (a, i) { if (a < -.6) { cx.beginPath(); cx.arc(x + (i ? 12 : -12) * Math.cos(rot), y + 2, 2.5, 0, 7); cx.fill(); } }); }
  }
  function drawShore() {
    var y0 = sy(0); if (y0 < -40) return;   // waterline on screen
    if (D3) { shoreLabels(y0); return; }
    if (ok(IM.shore)) { var w = W, h = w * IM.shore.naturalHeight / IM.shore.naturalWidth, top = y0 - h * 0.255, c0 = .16, nw = IM.shore.naturalWidth, nh = IM.shore.naturalHeight;
      cx.drawImage(IM.shore, 0, nh * c0, nw, nh * (1 - c0), 0, top + h * c0, w, h * (1 - c0));   // (the top strip of the aerial is cropped off)
      // zoomed out on the sand the view is wider/taller than the aerial: mirrored copies fill the edges (no hard seams)
      var vl = CAM.x - CAM.x / ZOOM - 20, vr = CAM.x + (W - CAM.x) / ZOOM + 20, vb = CAM.y + (H - CAM.y) / ZOOM + 20, sb = top + h;
      [[-1, 0], [1, 0], [0, 1], [-1, 1], [1, 1]].forEach(function (m) {
        if ((m[0] < 0 && vl >= 0) || (m[0] > 0 && vr <= W) || (m[1] && vb <= sb)) return;
        cx.save(); cx.translate(m[0] > 0 ? 2 * W : 0, m[1] ? 2 * sb : 0); cx.scale(m[0] ? -1 : 1, m[1] ? -1 : 1);
        cx.drawImage(IM.shore, 0, nh * c0, nw, nh * (1 - c0), 0, top + h * c0, w, h * (1 - c0)); cx.restore(); });
      palms(top, h); }
    else { cx.fillStyle = "#ecd9a8"; cx.fillRect(0, y0, W, H); cx.fillStyle = "#e6a5a0"; cx.fillRect(40, y0 + 150, 170, 90); cx.fillStyle = "#5bc6d6"; cx.fillRect(40, y0 + 150, 170, 10); }
    // Nalu Vida glows on the aerial: a warm pulse around the patio so you always know where you're headed
    var nx = 342, ny = y0 + 200, pg = cx.createRadialGradient(nx, ny, 6, nx, ny, 90); pg.addColorStop(0, "rgba(255,200,110," + (.32 + .1 * Math.sin(G.t * 3)) + ")"); pg.addColorStop(1, "rgba(255,170,80,0)");
    cx.fillStyle = pg; cx.beginPath(); cx.arc(nx, ny, 90, 0, 7); cx.fill();
    shoreLabels(y0);
    // lifeguards next to the two towers on the aerial
    beachLady(140, y0 + 74); spr("lifeguard_m", 330, y0 + 54, 24);
    if (G.phase === "beach" || G.phase === "sand") { spr("staff", 300, y0 + 150 + Math.sin(G.t * 6) * 2, 30); spr("staff", 372, y0 + 160, 28); }
  }
  function shoreLabels(y0) { label("★ NALU VIDA ★", 342, y0 + 214, "#ffd23f"); label("Venice Beach", 70, y0 + 95, "#fff"); label("Venice Fishing Pier", PIER_X, y0 - 26, "#fff"); label("Washington Blvd", 140, y0 + 382, "#fff"); }
  /* the lifeguard by the left tower: img/game/beachlady.webp, 3 registered cells of the same woman as lifeguard_f, her arm
     swinging through a wave. She waves while the surfer is on the sand or near the shore; reduced motion = one still frame. */
  function beachLady(x, fy) {
    var i = IM.beachlady; if (!ok(i)) { spr("lifeguard_f", x, fy - 22, 26); return; }
    var cw = i.naturalWidth / 3, ch = i.naturalHeight, h = 70, w = h * cw / ch;
    var near = G.phase === "sand" || G.phase === "beach" || G.phase === "ridein" || ((G.phase === "swim" || G.phase === "popup") && G.yw < 420);
    var f = REDUCE || !near ? 1 : [0, 1, 2, 1][Math.floor(G.t * 5) % 4];
    cx.fillStyle = "rgba(60,40,20,.32)"; cx.beginPath(); cx.ellipse(x + 7, fy - 1, 12, 4.5, -.15, 0, 7); cx.fill();   // shadow on the sand
    cx.drawImage(i, f * cw, 0, cw, ch, x - w / 2, fy - h * .985, w, h);   // feet sit on the bottom of the cell
  }
  // palms on the aerial sway in the breeze and bend hard in a helicopter's downwash
  var PALMS = [[.27, .49], [.24, .535], [.35, .55], [.69, .49], [.715, .53], [.20, .77], [.33, .68], [.64, .705], [.67, .86], [.40, .82], [.91, .95], [.08, .66]];
  function palms(top, h) {
    if (!ok(IM.palm)) return;
    var heli = G.ents.filter(function (e) { return e.t === "heli"; })[0];
    PALMS.forEach(function (p, i) {
      var x = p[0] * W, y = top + p[1] * h, gust = 0;
      if (heli) { var d = Math.hypot(heli.x + 48 - x, (sy(heli.yw) + 88) - y); gust = Math.max(0, 1 - d / 190); }
      var sway = Math.sin(G.t * 1.3 + i) * .05 + gust * Math.sin(G.t * 9 + i) * .45;
      spr("palm", x + gust * 3 * Math.sin(G.t * 7 + i), y, 40 * (1 + gust * .08), sway);
    });
  }
  function label(t, x, y, col) { cx.font = "800 12.5px system-ui,sans-serif"; cx.textAlign = "center"; cx.lineWidth = 3.5; cx.strokeStyle = "rgba(5,18,34,.8)"; cx.strokeText(t, x, y); cx.fillStyle = col; cx.fillText(t, x, y); }
  // one straight run of narrow pier deck (img/game/pier.webp tiles, scaled down) from (x1,y1) to (x2,y2), screen space
  function pierStrip(x1, y1, x2, y2, cap) {
    var dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy); if (len < 1) return; var a = Math.atan2(dx, dy), pw = PIER_W * 1.15;
    cx.save(); cx.translate(x1, y1); cx.rotate(-a);                    // local +y now runs along the pier
    cx.fillStyle = "rgba(0,20,35,.3)"; cx.fillRect(-PIER_W / 2 + 8, 10, PIER_W, len);
    if (ok(IM.pier)) { var nw = IM.pier.naturalWidth, nh = IM.pier.naturalHeight, ph = pw * nh / nw;
      for (var y = 0; y < len; y += ph) { var f = Math.min(1, (len - y) / ph); cx.drawImage(IM.pier, 0, 0, nw, nh * f, -pw / 2, y, pw, ph * f + .5); } }
    else { cx.fillStyle = "#cfc9bd"; cx.fillRect(-PIER_W / 2, 0, PIER_W, len); cx.fillStyle = "#6f6a62"; cx.fillRect(-PIER_W / 2, 0, 2, len); cx.fillRect(PIER_W / 2 - 2, 0, 2, len); }
    for (var p = 30; p < len; p += 64) { cx.fillStyle = "rgba(0,15,25,.4)"; cx.fillRect(-PIER_W / 2 - 3, p, 4, 5); cx.fillRect(PIER_W / 2 - 1, p, 4, 5); }   // pilings
    if (cap) { cx.fillStyle = "rgba(0,20,35,.3)"; cx.fillRect(-PIER_W + 8, len - 4, PIER_W * 2, 30);
      cx.fillStyle = "#c9c2b4"; if (cx.roundRect) { cx.beginPath(); cx.roundRect(-PIER_W, len - 14, PIER_W * 2, 30, 8); cx.fill(); } else cx.fillRect(-PIER_W, len - 14, PIER_W * 2, 30);
      cx.strokeStyle = "#6f6a62"; cx.lineWidth = 2; cx.strokeRect(-PIER_W + 2, len - 12, PIER_W * 2 - 4, 26);
      cx.fillStyle = "rgba(255,240,180,.8)"; cx.beginPath(); cx.arc(-PIER_W + 6, len - 8, 2.5, 0, 7); cx.arc(PIER_W - 6, len - 8, 2.5, 0, 7); cx.fill(); }
    cx.restore();
  }
  function drawPier() {
    // the stub off the sand (off to the side of the Nalu Vida lane)
    var top = sy(STUB), bot = sy(-60); if (!D3 && bot > -50 && top < H + 120) pierStrip(PIER_X, Math.min(H + 60, bot), PIER_X, top, true);
    G.warnPier = 0;
    G.ents.forEach(function (e) { if (e.t !== "pier") return;
      var ax = e.xa - (e.xb - e.xa) * .6, ay = e.yw - (e.yb - e.yw) * .6;   // runs on past the edge it comes in from
      if (!D3) pierStrip(ax, sy(ay), e.xb, sy(e.yb), true);
      var xn = pierX(e, G.yw + G.dir * 110);
      if (G.phase === "ride" && xn != null && Math.abs(xn - G.x) < 70 && G.jump <= 0) { G.warnPier = 1; label("JUMP THE PIER!", Math.max(70, Math.min(W - 70, xn)), sy(G.yw + G.dir * 110) - 12, Math.floor(G.t * 8) % 2 ? "#ffd23f" : "#fff"); } });
  }
  // the end of a level: Nalu Vida, lit up — a framed, glowing storefront card with a slow push-in and a golden light sweep
  function drawNalu() {
    var t = G.beachT - .9; if (t <= 0 || !ok(IM.storefront)) return; var k = Math.min(1, t / .6), e = k * k * (3 - 2 * k), im = IM.storefront;
    cx.save(); cx.setTransform(DPR, 0, 0, DPR, 0, 0);
    var vg = cx.createRadialGradient(W / 2, 200, 80, W / 2, 260, 520); vg.addColorStop(0, "rgba(40,16,4,0)"); vg.addColorStop(1, "rgba(20,8,2," + (.6 * e) + ")"); cx.fillStyle = vg; cx.fillRect(0, 0, W, H);
    var cw = W - 28, ch = cw * im.naturalHeight / im.naturalWidth, x0 = 14, y0 = 70 - (1 - e) * 36;
    cx.globalAlpha = e;
    cx.shadowColor = "rgba(255,170,80,.8)"; cx.shadowBlur = 36; cx.fillStyle = "#1a0d06"; cx.beginPath(); if (cx.roundRect) cx.roundRect(x0, y0, cw, ch, 16); else cx.rect(x0, y0, cw, ch); cx.fill(); cx.shadowBlur = 0;
    cx.save(); cx.clip();
    var z = Math.min(1.14, 1.03 + t * .035), dw = cw * z, dh = ch * z; cx.drawImage(im, x0 - (dw - cw) * .55, y0 - (dh - ch) * .5, dw, dh);
    var sx = x0 + ((t * .55) % 1.8 - .4) * cw, sg = cx.createLinearGradient(sx - 60, 0, sx + 60, 0); sg.addColorStop(0, "rgba(255,230,170,0)"); sg.addColorStop(.5, "rgba(255,230,170,.28)"); sg.addColorStop(1, "rgba(255,230,170,0)");
    cx.fillStyle = sg; cx.fillRect(x0, y0, cw, ch);
    var bt = cx.createLinearGradient(0, y0 + ch * .6, 0, y0 + ch); bt.addColorStop(0, "rgba(10,5,2,0)"); bt.addColorStop(1, "rgba(10,5,2,.55)"); cx.fillStyle = bt; cx.fillRect(x0, y0, cw, ch);
    cx.restore();
    cx.strokeStyle = "rgba(255,214,140,.95)"; cx.lineWidth = 2; cx.beginPath(); if (cx.roundRect) cx.roundRect(x0 + 1, y0 + 1, cw - 2, ch - 2, 15); else cx.rect(x0 + 1, y0 + 1, cw - 2, ch - 2); cx.stroke();
    cx.textAlign = "center"; cx.font = "900 25px 'Alfa Slab One',Georgia,serif"; cx.lineWidth = 5; cx.strokeStyle = "#3a1600"; cx.strokeText("Back to Nalu Vida 🏄", W / 2, y0 + ch - 16);
    cx.shadowColor = "rgba(255,190,90,.9)"; cx.shadowBlur = 14; cx.fillStyle = "#ffd23f"; cx.fillText("Back to Nalu Vida 🏄", W / 2, y0 + ch - 16);
    cx.restore();
  }
  function drawSurfer() {
    var x = G.x, y = sy(G.yw), blink = G.inv > 0 && Math.floor(G.t * 12) % 2 && G.phase !== "death";
    if (D3 && R3.rig(G.surfer)) { if (G.phase === "ride" || G.phase === "popup") { var air3 = airF(), y3 = y - air3 * 34;
        if (G.pocket) { cx.strokeStyle = "rgba(127,227,242," + (.5 + .3 * Math.sin(G.t * 10)) + ")"; cx.lineWidth = 2.5; cx.beginPath(); cx.arc(x, y3, 38, 0, 7); cx.stroke(); }
        if (G.trick) { cx.strokeStyle = "rgba(255,210,63,.85)"; cx.lineWidth = 3; cx.beginPath(); cx.arc(x, y3, 40, -Math.PI / 2, -Math.PI / 2 + G.trick.t / G.trick.dur * Math.PI * 2); cx.stroke(); } }
      return; }
    if (G.phase === "sand") { runner(x, y, Math.max(-.5, Math.min(.5, Math.atan2(G.vx, 240)))); return; }
    if (G.phase === "beach") { if (G.beachT < 2.3) runner(x, y, Math.PI - Math.max(-.6, Math.min(.6, Math.atan2(SHORE_X + 8 - G.bx0, G.by0 + 215)))); return; }
    if (G.phase === "cut" || G.phase === "cut0") return;
    var sink = 0;
    if (G.phase === "death") { var dt0 = G.deathT;
      if ((G.deathCause === "shark" || G.deathCause === "ray") && dt0 > .45) return;    // pulled under (cartoon: just gone, then the splash)
      if (G.deathCause === "wave" && dt0 > 1.1) return;                                  // swallowed
      if (G.deathCause === "eel") { x += rnd(-5, 5); y += rnd(-5, 5); var sk = dt0 > 1.9 || Math.floor(dt0 * 16) % 2;
        if (sk && ok(IM.skeleton)) { var sw = 60, sh = sw * IM.skeleton.naturalHeight / IM.skeleton.naturalWidth; cx.save(); cx.globalAlpha = dt0 > 2.2 ? Math.max(0, 1 - (dt0 - 2.2) / .6) : 1; cx.translate(x, y); cx.rotate(G.ang); cx.globalCompositeOperation = "lighter"; cx.drawImage(IM.skeleton, -sw / 2, -sh / 2, sw, sh); cx.restore(); return; } }
      sink = Math.min(1, dt0 * 1.5);
    }
    if (blink && !(G.phase === "swim" && G.yw < 70)) return;   // (no blink while wading in: the invulnerability is unchanged, it just stays visible)
    if (G.phase === "swim" || (G.phase === "popup" && G.popT < .5) || (G.phase === "death" && G.deathPaddle)) { paddler(x, y, G.ang, G.phase === "death" ? sink : 0); return; }
    var pop0 = G.phase === "popup" ? Math.min(1, (G.popT - .5) / .5) : 1;
    var air = airF();
    var bob = Math.sin(G.t * 2.3 + G.yw * .018) * 2.5, tilt = Math.sin(G.t * 1.7 + G.yw * .011) * .07;
    cx.fillStyle = "rgba(0,20,35," + (.25 - air * .1) + ")"; cx.beginPath(); cx.ellipse(x + 6 + air * 26, y + 8 + air * 34, 12 * (1 - air * .25), 30 * (1 - air * .25), G.ang, 0, 7); cx.fill();
    y = y + bob - air * 34 - (G.phase === "ride" ? (G.lipRise || 0) * 10 : 0);
    if (G.pocket) { cx.strokeStyle = "rgba(127,227,242," + (.5 + .3 * Math.sin(G.t * 10)) + ")"; cx.lineWidth = 2.5; cx.beginPath(); cx.arc(x, y, 38, 0, 7); cx.stroke(); }
    var sun = cx.createRadialGradient(x, y, 4, x, y, 46); sun.addColorStop(0, "rgba(255,240,200,.30)"); sun.addColorStop(1, "rgba(255,240,200,0)"); cx.fillStyle = sun; cx.beginPath(); cx.arc(x, y, 46, 0, 7); cx.fill();
    var lean = Math.max(-.55, Math.min(.55, G.vx / 380)), shift = lean * 6;                       // weight shifts into the turn
    if ((G.phase === "ride" || G.phase === "ridein") && !air && Math.abs(lean) > .18 && !REDUCE) {   // carving: a fan of spray thrown off the tail, out past the outside rail
      var sp = Math.min(1, (Math.abs(lean) - .18) / .37), tl = 24, tx0 = x - Math.sin(G.ang) * tl, ty0 = y + Math.cos(G.ang) * tl, out = lean > 0 ? -1 : 1;
      for (var q = 0; q < 14; q++) { var ph2 = (G.t * 3.1 + q * .173) % 1, an2 = -Math.PI / 2 + out * (.5 + q / 14 * 1.1), d2 = ph2 * (26 + 30 * sp);
        cx.fillStyle = "rgba(255,255,255," + (.75 * sp * (1 - ph2)) + ")"; cx.beginPath(); cx.arc(tx0 + Math.cos(an2) * d2, ty0 + Math.sin(an2) * d2 * .8, 1.4 + ph2 * 3.2 * sp, 0, 7); cx.fill(); } }
    cx.save(); cx.filter = "brightness(1.2) contrast(1.08) saturate(1.12)";
    var drew = (function () { var k0 = G.surfer === "m" ? "surfer_m" : "surfer_f", i = IM[k0]; if (!ok(i)) return false; var w = 56 * (1 + air * .42) * (.75 + .25 * pop0), h = w * i.naturalHeight / i.naturalWidth;
      var spin = 0, flip = 1, tk = G.trick, wipe = G.wipe > 0 ? (1 - G.wipe / .9) : 0;
      if (tk) { var f = tk.t / tk.dur; if (tk.k === "spin") spin = f * Math.PI * 2; else if (tk.k === "grab") { var gq = Math.sin(f * Math.PI); spin = gq * .55; w *= 1 - gq * .18; h = w * i.naturalHeight / i.naturalWidth; } else flip = Math.cos(f * Math.PI * 2); }
      if (wipe) { spin += wipe * Math.PI * 2.4; w *= 1 - Math.sin(wipe * Math.PI) * .25; h = w * i.naturalHeight / i.naturalWidth; }
      if (G.phase === "death") { var dd = G.deathT; spin += G.deathCause === "wave" ? dd * 6 : 0; w *= G.deathCause === "shark" || G.deathCause === "ray" ? Math.max(.2, 1 - dd * 1.6) : G.deathCause === "wave" ? Math.max(.2, 1 - dd * .7) : 1; h = w * i.naturalHeight / i.naturalWidth; }
      cx.translate(x + shift, y); cx.rotate(G.ang + (G.surfer === "m" ? Math.PI : 0) + tilt * .6 + air * .25 * (G.vx > 0 ? 1 : -1) + spin); cx.transform(1, 0, -lean * .35, 1, 0, 0); cx.scale(1 - Math.abs(lean) * .1, flip);
      if (flip < 0) cx.filter = "brightness(.75) contrast(1.08)";    // the underside of the board shows mid-flip
      var rb = IM[k0 + "_rider"], bb = IM[k0 + "_board"];
      if (ok(rb) && ok(bb)) {   // layered: the board, the rider's shadow on the deck, then the rider standing up off it (always on top, even mid-flip)
        var rot = G.ang + (G.surfer === "m" ? Math.PI : 0) + tilt * .6 + air * .25 * (G.vx > 0 ? 1 : -1) + spin, bank = Math.min(1, Math.abs(lean) / .55),
          ax = (G.surfer === "m" ? .05 : 0) * w, ay = (G.surfer === "m" ? 0 : .05) * h,   // the rider's stance (between the feet), relative to the sprite centre
          sdx = 4 + bank * 3 + air * 10, sdy = 6 + air * 12, lx = sdx * Math.cos(rot) + sdy * Math.sin(rot), ly = -sdx * Math.sin(rot) + sdy * Math.cos(rot);   // a down-right screen offset, in sprite space
        cx.save(); cx.scale(1 - bank * .24, 1); cx.drawImage(bb, -w / 2, -h / 2, w, h); cx.restore();   // railed over: the deck narrows as it tips onto its edge
        cx.save(); cx.filter = "none"; cx.globalAlpha = .42 * (1 - air * .5); cx.drawImage(silh(rb), -w / 2 + lx, -h / 2 + ly, w, h); cx.restore();
        if (flip < 0) cx.filter = "brightness(1.2) contrast(1.08) saturate(1.12)";   // only the board's underside darkens mid-flip, never the rider
        cx.translate(ax, ay); cx.transform(1, 0, -lean * .55, 1, 0, 0); cx.scale(1.08 + air * .04, 1.08 + air * .04); cx.translate(-ax, -ay);   // up off the deck, leaning into the carve
        cx.drawImage(hurtImg(rb, G.dmg), -w / 2, -h / 2, w, h); return true; }
      cx.drawImage(hurtImg(i, G.dmg), -w / 2, -h / 2, w, h); return true; })();
    cx.restore();
    if (!drew) {
      cx.save(); cx.translate(x, y); cx.rotate(G.ang); var gr = cx.createLinearGradient(0, -30, 0, 30); gr.addColorStop(0, "#ffb02e"); gr.addColorStop(.5, "#ffd23f"); gr.addColorStop(.5, "#2f8fd8"); gr.addColorStop(1, "#173d8f");
      cx.fillStyle = gr; cx.beginPath(); cx.ellipse(0, 0, 10, 30, 0, 0, 7); cx.fill(); cx.fillStyle = G.surfer === "m" ? "#7a4a2a" : "#b5735a"; cx.beginPath(); cx.arc(0, -2, 7, 0, 7); cx.fill(); cx.restore();
    }
    if (G.trick) { cx.strokeStyle = "rgba(255,210,63,.85)"; cx.lineWidth = 3; cx.beginPath(); cx.arc(x, y, 40, -Math.PI / 2, -Math.PI / 2 + G.trick.t / G.trick.dur * Math.PI * 2); cx.stroke(); }   // trick timer: finish the ring before you land
  }
  var E3 = { food: 1, shark: 1, eel: 1, jelly: 1, ray: 1, boat: 1, heli: 1, buoy: 1, rock: 1, rsign: 1 };
  function drawEnt(e) {
    var y = e.scr ? e.y : sy(e.yw), x = e.x;
    if (D3 && E3[e.t]) { entCallouts(e, x, y); return; }
    if (e.t === "fish") { var a = e.air || 0;
      if (!a) { cx.fillStyle = "rgba(0,25,40,.28)"; cx.beginPath(); cx.ellipse(x, y, 16, 6, Math.sin(e.ph * 3) * .3, 0, 7); cx.fill(); return; }   // a dark shape under the water
      var hgt = Math.sin(a * Math.PI) * 46, rot = (a - .5) * 1.6;
      cx.fillStyle = "rgba(0,25,40,.2)"; cx.beginPath(); cx.ellipse(x, y + 4, 14, 5, 0, 0, 7); cx.fill();
      if (e.k === "fish_gold") { cx.save(); cx.globalCompositeOperation = "lighter"; var gg = cx.createRadialGradient(x, y - hgt, 2, x, y - hgt, 40); gg.addColorStop(0, "rgba(255,215,90,.6)"); gg.addColorStop(1, "rgba(255,215,90,0)"); cx.fillStyle = gg; cx.beginPath(); cx.arc(x, y - hgt, 40, 0, 7); cx.fill(); cx.restore(); }
      spr(e.k, x, y - hgt, 54 + a * 10, rot); return; }
    if (e.t === "hkit") { drawKit(e, x, y); return; }
    if (e.t === "rock") { drawRock(e, x, y); return; }
    if (e.t === "rsign") { drawRSign(e, x, y); return; }
    if (e.t === "harpoon") { drawHarpPick(e, x, y); return; }
    if (e.t === "qfin") { qfin(e, x, y); return; }
    if (e.t === "sharp") { RND.bullet(e, x, y); return; }
    if (e.t === "ski") { drawSki(e, x, y); return; }
    if (e.t === "food") {
      var b = Math.sin(G.t * 3 + e.bob) * 2.5;
      cx.fillStyle = "rgba(0,20,35,.22)"; cx.beginPath(); cx.ellipse(x + 4, y + 6, 26, 15, 0, 0, 7); cx.fill();
      if (e.gold) { cx.fillStyle = "rgba(255,210,63," + (.35 + .25 * Math.sin(G.t * 6)) + ")"; cx.beginPath(); cx.arc(x, y + b, 34, 0, 7); cx.fill(); }
      if (!spr(e.k, x, y + b, 58)) { cx.fillStyle = "#b07a3c"; cx.fillRect(x - 22, y - 12 + b, 44, 24); cx.fillStyle = "#59c3d1"; cx.beginPath(); cx.arc(x, y + b, 12, 0, 7); cx.fill(); cx.font = "18px system-ui"; cx.textAlign = "center"; cx.fillText({ raft_taco: "🌮", raft_burger: "🍔", raft_shrimp: "🍤", raft_oysters: "🦪", raft_mimosa: "🥂" }[e.k], x, y + 6 + b); }
    } else if (e.t === "shark") {
      if (e.st === "fin" || e.st === "warn") {
        if (e.st === "warn") sharkPower(e, x, y);
        cx.strokeStyle = "rgba(255,255,255,.55)"; cx.lineWidth = 1.6; cx.beginPath(); cx.moveTo(x - 22, y - G.dir * 26); cx.lineTo(x, y + 4); cx.lineTo(x + 22, y - G.dir * 26); cx.stroke();
        var fg = cx.createLinearGradient(x - 8, 0, x + 9, 0); fg.addColorStop(0, "#5d6b77"); fg.addColorStop(.55, "#36424c"); fg.addColorStop(1, "#1f272e"); cx.fillStyle = fg;
        cx.beginPath(); cx.moveTo(x - 9, y + 5); cx.quadraticCurveTo(x - 4, y - 8, x + 5, y - 19); cx.quadraticCurveTo(x + 3, y - 6, x + 10, y + 5); cx.closePath(); cx.fill();
        cx.fillStyle = "rgba(0,20,35,.25)"; cx.beginPath(); cx.ellipse(x + 6, y + 8, 8, 3, 0, 0, 7); cx.fill();
      } else { var a = Math.atan2(e.vx, e.vy) + Math.PI, fa = e.st === "flee" ? Math.max(0, 1 - e.ft / 1.3) : 1, fs = e.st === "flee" ? 96 * (1 - e.ft * .3) : 96;
        if (e.fl > 0) { x += rnd(-3, 3); a += Math.sin(G.t * 40) * .25; }
        if (!spr("shark", x, y, fs, a, fa)) { cx.fillStyle = "#4a5866"; cx.beginPath(); cx.ellipse(x, y, 13, 40, a, 0, 7); cx.fill(); }
        if (e.st === "flee") img(tinted("shark", "#0a3550", 1), x, y, fs, a, (1 - fa) * .6); }
      if (e.fl > 0) { cx.strokeStyle = "rgba(255,255,255," + e.fl * 2 + ")"; cx.lineWidth = 3; cx.beginPath(); cx.arc(x, y, 30 + (1 - e.fl / .35) * 20, 0, 7); cx.stroke(); }
    } else if (e.t === "eel") {
      if (e.zap) { cx.fillStyle = "rgba(90,220,255,.28)"; cx.beginPath(); cx.arc(x, y, 40, 0, 7); cx.fill(); }
      if (!spr("eel", x, y, 92, e.sp > 0 ? 0 : Math.PI, e.zap ? 1 : .8)) { cx.strokeStyle = "#20323a"; cx.lineWidth = 9; cx.beginPath(); for (var k = -36; k <= 36; k += 6) { var yy = y + Math.sin(k * .12 + G.t * 8) * 7; k === -36 ? cx.moveTo(x + k, yy) : cx.lineTo(x + k, yy); } cx.stroke(); }
      if (e.zap) { cx.strokeStyle = "#bff6ff"; cx.lineWidth = 2; for (var z = 0; z < 3; z++) { cx.beginPath(); cx.moveTo(x + rnd(-34, 34), y + rnd(-14, 14)); for (var s = 0; s < 4; s++) cx.lineTo(x + rnd(-38, 38), y + rnd(-22, 22)); cx.stroke(); } }
    } else if (e.t === "ray") { drawRay(e, x, y);
    } else if (e.t === "jelly") {
      var pul = 1 + Math.sin(e.ph * 3) * .08;
      if (!spr("jelly", x, y, 48 * pul, 0, .92)) { cx.fillStyle = "rgba(255,120,200,.6)"; cx.beginPath(); cx.arc(x, y, 16 * pul, 0, 7); cx.fill(); }
    } else if (e.t === "boat") {
      cx.fillStyle = "rgba(255,255,255,.5)"; for (var wk = 1; wk < 6; wk++) { cx.beginPath(); cx.arc(x - Math.sign(e.vx) * wk * 16, y + Math.sin(wk) * 3, 6 + wk * 2, 0, 7); cx.fill(); }
      if (!spr("boat", x, y, 110, e.vx > 0 ? Math.PI / 2 : -Math.PI / 2)) { cx.fillStyle = "#fff"; cx.beginPath(); cx.ellipse(x, y, 40, 15, 0, 0, 7); cx.fill(); cx.fillStyle = "#ff7a3d"; cx.fillRect(x - 12, y - 6, 24, 12); }
      if (e.hunt) hboatAim(e, x, y); else label("Nalu Vida crew", x, y - 30, "#ffd23f");
    } else if (e.t === "heli") {
      // downwash: rings and spray pushed out across the water under it
      for (var dw = 0; dw < 3; dw++) { var rr = ((G.t * 1.6 + dw / 3) % 1); cx.strokeStyle = "rgba(255,255,255," + (.45 * (1 - rr)) + ")"; cx.lineWidth = 2; cx.beginPath(); cx.ellipse(x + 48, y + 88, 20 + rr * 70, 12 + rr * 40, 0, 0, 7); cx.stroke(); }
      cx.fillStyle = "rgba(0,20,35,.22)"; cx.save(); cx.translate(x + 48, y + 88); cx.rotate(e.vx > 0 ? Math.PI / 2 : -Math.PI / 2); cx.beginPath(); cx.ellipse(0, 0, 13, 40, 0, 0, 7); cx.fill(); cx.restore();
      if (!spr("heli", x, y, 34, e.vx > 0 ? Math.PI / 2 : -Math.PI / 2)) { cx.fillStyle = "#e9eef2"; cx.beginPath(); cx.ellipse(x, y, 34, 14, 0, 0, 7); cx.fill(); }
      rotor(x + (e.vx > 0 ? 1 : -1) * 23.9, y + (e.vx > 0 ? -0.34 : 0.34), 64, G.t * 38, true);   // measured hub (49%, 35%) of the 34x159 body, rotated with it
    } else if (e.t === "drop") {
      var k2 = Math.max(0, e.air) / 1.4;
      cx.fillStyle = "rgba(0,20,35," + (.35 - k2 * .2) + ")"; cx.beginPath(); cx.ellipse(x, y, 18 - k2 * 8, 7 - k2 * 3, 0, 0, 7); cx.fill();
      var dy = -k2 * 150;
      if (!spr("drop", x, y + dy - 10, 54 + (1 - k2) * 6)) { cx.fillStyle = "#ff7a3d"; cx.beginPath(); cx.arc(x, y + dy - 34, 20, Math.PI, 0); cx.fill(); cx.strokeStyle = "#fff"; cx.beginPath(); cx.moveTo(x - 20, y + dy - 34); cx.lineTo(x, y + dy - 8); cx.lineTo(x + 20, y + dy - 34); cx.stroke(); cx.font = "22px system-ui"; cx.textAlign = "center"; cx.fillText("🍹", x, y + dy); }
      if (e.air <= 0.25) { cx.strokeStyle = "rgba(255,210,63,.9)"; cx.lineWidth = 2; cx.beginPath(); cx.arc(x, y, 26 + Math.sin(G.t * 8) * 3, 0, 7); cx.stroke(); }
    } else if (e.t === "buoy") { if (!spr("buoy", x, y + Math.sin(G.t * 3) * 2, 44)) { cx.fillStyle = "#e5262e"; cx.fillRect(x - 18, y - 7, 36, 14); } }
    else if (e.t === "toss") {
      var f = e.f, tx = e.fx + (e.tx - e.fx) * f, ty = sy(e.fyw + (e.tyw - e.fyw) * f) - Math.sin(f * Math.PI) * 90;
      cx.fillStyle = "rgba(0,20,35,.18)"; cx.beginPath(); cx.ellipse(tx + 10, sy(e.fyw + (e.tyw - e.fyw) * f) + 6, 16, 7, 0, 0, 7); cx.fill();
      if (e.item === "harpoon") { spear(tx - 4, ty, f * 9, 40); spear(tx + 4, ty, f * 9 + .5, 40, 1); }
      else if (e.item === "buoy") { if (!spr("buoy", tx, ty, 38, f * 6)) { cx.fillStyle = "#e2452b"; cx.beginPath(); cx.arc(tx, ty, 13, 0, 7); cx.fill(); } }
      else spr(FOOD[(e.tx * 7 | 0) % FOOD.length][0], tx, ty, 40 + Math.sin(f * Math.PI) * 12, f * 6);
    } else if (e.t === "plane") {
      var dir = e.vx > 0 ? 1 : -1, bx = x - dir * 70, bw = 250, bh = 34, by = y - bh / 2;
      cx.strokeStyle = "rgba(255,255,255,.8)"; cx.lineWidth = 1.5; cx.beginPath(); cx.moveTo(x - dir * 22, y); cx.lineTo(bx, y); cx.stroke();
      var left = dir > 0 ? bx - bw : bx;
      for (var s2 = 0; s2 < bw; s2 += 10) { var wv = Math.sin(G.t * 7 + s2 * .05) * 3; cx.fillStyle = s2 % 20 ? "#b3263a" : "#c22d43"; cx.fillRect(left + s2, by + wv, 10.5, bh); }
      cx.save(); cx.beginPath(); cx.rect(left, by - 6, bw, bh + 12); cx.clip(); cx.font = "900 13px system-ui"; cx.textAlign = "center"; cx.fillStyle = "#fbf1de"; cx.fillText("✈ MELODY BAR & GRILL · LAX · TAP ME", left + bw / 2, y + 5); cx.restore();
      cx.fillStyle = "rgba(0,20,35,.15)"; cx.save(); cx.translate(x + 40, y + 70); cx.rotate(dir > 0 ? Math.PI / 2 : -Math.PI / 2); cx.beginPath(); cx.ellipse(0, 0, 26, 10, 0, 0, 7); cx.fill(); cx.restore();
      var drew = spr("plane", x, y, 70, dir > 0 ? Math.PI / 2 : -Math.PI / 2);
      cx.save(); cx.translate(x + dir * 34, y); cx.scale(.25, 1); var pa = G.t * 50; cx.fillStyle = "rgba(40,40,40,.18)"; cx.beginPath(); cx.arc(0, 0, 15, 0, 7); cx.fill(); cx.fillStyle = "rgba(30,30,30,.6)"; cx.fillRect(-2, Math.sin(pa) * 15 - 2, 4, 4); cx.fillRect(-2, -Math.sin(pa) * 15 - 2, 4, 4); cx.restore();
      if (!drew) { cx.fillStyle = "#fff"; cx.beginPath(); cx.ellipse(x, y, 22, 6, 0, 0, 7); cx.fill(); cx.fillRect(x - 4, y - 20, 8, 40); }
      e.hit = { x: Math.min(left, x - 30), y: by - 14, w: bw + 100, h: bh + 28 };
    }
  }
  // a shark powering up (~2.3 s): a red/white blinking glow that pulses faster as it gets ready, a ring closing in, "!"
  function sharkPower(e, x, y) { var f = Math.min(1, (e.pw || 0) / 2.3), on = Math.floor(G.t * (5 + f * 9)) % 2 === 0;
    cx.save(); cx.globalCompositeOperation = "lighter"; var gr = cx.createRadialGradient(x, y, 4, x, y, 58);
    gr.addColorStop(0, on ? "rgba(255,70,60,.75)" : "rgba(255,255,255,.55)"); gr.addColorStop(1, "rgba(255,60,60,0)"); cx.fillStyle = gr; cx.beginPath(); cx.arc(x, y, 58, 0, 7); cx.fill(); cx.restore();
    cx.strokeStyle = on ? "rgba(255,60,60,.95)" : "rgba(255,255,255,.9)"; cx.lineWidth = 3.5; cx.beginPath(); cx.arc(x, y, 30 + (1 - f) * 34, 0, 7); cx.stroke();
    cx.strokeStyle = "rgba(255,255,255,.7)"; cx.lineWidth = 2; for (var k = 1; k < 4; k++) { var wy = y - G.dir * (12 + k * 11); cx.beginPath(); cx.moveTo(x - 8 - k * 7, wy - G.dir * k * 3); cx.lineTo(x, wy + G.dir * 8); cx.lineTo(x + 8 + k * 7, wy - G.dir * k * 3); cx.stroke(); }   // churning wake
    cx.font = "900 " + (20 + f * 8) + "px system-ui"; cx.textAlign = "center"; cx.lineWidth = 4; cx.strokeStyle = "rgba(0,0,0,.55)"; cx.strokeText("!", x, y - 40); cx.fillStyle = on ? "#ff4d4d" : "#fff"; cx.fillText("!", x, y - 40); }
  function qfin(e, x, y) { var a = e.leave ? Math.max(0, 1 - (e.lt || 0) / 1.2) : 1; cx.globalAlpha = a;
    cx.strokeStyle = "rgba(255,255,255,.5)"; cx.lineWidth = 1.5; var d = e.vx > 0 ? 1 : -1; cx.beginPath(); cx.moveTo(x - d * 24, y - 8); cx.lineTo(x, y + 3); cx.lineTo(x - d * 24, y + 12); cx.stroke();
    var fg = cx.createLinearGradient(x - 8, 0, x + 9, 0); fg.addColorStop(0, "#5d6b77"); fg.addColorStop(.55, "#36424c"); fg.addColorStop(1, "#1f272e"); cx.fillStyle = fg;
    cx.beginPath(); cx.moveTo(x - 9, y + 5); cx.quadraticCurveTo(x - 4, y - 8, x + 5 * d, y - 19); cx.quadraticCurveTo(x + 3, y - 6, x + 10, y + 5); cx.closePath(); cx.fill(); cx.globalAlpha = 1; }
  function hboatAim(e, x, y) { label("🎣 Fisherman", x, y + 40, "#ffd23f");
    if (!(e.aim > 0)) return; var dx = e.ax - x, dy = sy(e.ayw) - y, l = Math.hypot(dx, dy) || 1, f = 1 - e.aim / .85;
    cx.strokeStyle = "rgba(255,150,40," + (.45 + .5 * f) + ")"; cx.lineWidth = 2 + f * 1.5; cx.setLineDash([10, 8]); cx.beginPath(); cx.moveTo(x, y); cx.lineTo(x + dx / l * 760, y + dy / l * 760); cx.stroke(); cx.setLineDash([]);
    if (f > .45) label("HARPOON!", x + dx / l * 120, y + dy / l * 120 - 18, "#ff9a3d"); }
  // what stays 2D on top of a 3D entity: warnings, labels, the eel's sparks
  function entCallouts(e, x, y) {
    if (e.t === "shark" && e.st === "warn") sharkPower(e, x, y);
    if (e.t === "shark" && e.fl > 0) { cx.strokeStyle = "rgba(255,255,255," + e.fl * 2 + ")"; cx.lineWidth = 3; cx.beginPath(); cx.arc(x, y, 30 + (1 - e.fl / .35) * 20, 0, 7); cx.stroke(); }
    else if (e.t === "eel" && e.zap) { cx.strokeStyle = "#bff6ff"; cx.lineWidth = 2; for (var z = 0; z < 3; z++) { cx.beginPath(); cx.moveTo(x + rnd(-34, 34), y + rnd(-14, 14)); for (var s = 0; s < 4; s++) cx.lineTo(x + rnd(-38, 38), y + rnd(-22, 22)); cx.stroke(); } }
    else if (e.t === "boat") { if (e.hunt) hboatAim(e, x, y); else label("Nalu Vida crew", x, y - 30, "#ffd23f"); }
    else if (e.t === "food" && e.gold) { cx.strokeStyle = "rgba(255,210,63," + (.45 + .3 * Math.sin(G.t * 6)) + ")"; cx.lineWidth = 3; cx.beginPath(); cx.arc(x, y, 34, 0, 7); cx.stroke(); }
  }
  // stingray: a flat diamond gliding just under the surface, wings rippling, a long whip tail (drawn, no sprite)
  function drawRay(e, x, y) {
    var d = e.vx > 0 ? 1 : -1, fl = Math.sin(e.ph * 7), a = .55 + (1 - e.sub) * .4;
    cx.save(); cx.translate(x, y); cx.rotate(d > 0 ? Math.PI / 2 : -Math.PI / 2);   // nose leads the way it swims
    cx.fillStyle = "rgba(0,20,35,.22)"; cx.beginPath(); cx.ellipse(5, 8, 26, 22, 0, 0, 7); cx.fill();
    cx.globalAlpha = a;
    cx.strokeStyle = "#5b4636"; cx.lineWidth = 2.2; cx.beginPath(); cx.moveTo(0, 14); cx.quadraticCurveTo(Math.sin(e.ph * 4) * 8, 32, Math.sin(e.ph * 4 + 1) * 5, 46); cx.stroke();
    cx.fillStyle = "#3a2c22"; cx.beginPath(); cx.moveTo(Math.sin(e.ph * 4) * 4, 27); cx.lineTo(Math.sin(e.ph * 4) * 4 - 3, 33); cx.lineTo(Math.sin(e.ph * 4) * 4 + 3, 33); cx.fill();   // the barb (cartoon)
    var gr = cx.createRadialGradient(0, -2, 2, 0, 0, 26); gr.addColorStop(0, "#a88a68"); gr.addColorStop(1, "#6e5641"); cx.fillStyle = gr;
    var wx = 26 * (1 + fl * .08), wy = fl * 4;
    cx.beginPath(); cx.moveTo(0, -20); cx.quadraticCurveTo(wx * .7, -12 + wy, wx, 2 + wy); cx.quadraticCurveTo(wx * .5, 12, 0, 15); cx.quadraticCurveTo(-wx * .5, 12, -wx, 2 + wy); cx.quadraticCurveTo(-wx * .7, -12 + wy, 0, -20); cx.fill();
    cx.fillStyle = "rgba(240,220,180,.55)"; [[-9, -2], [8, 0], [-3, 6], [4, -8], [12, 5], [-13, 5]].forEach(function (p) { cx.beginPath(); cx.arc(p[0], p[1], 1.8, 0, 7); cx.fill(); });
    cx.fillStyle = "#2a1f18"; cx.beginPath(); cx.arc(-4, -11, 1.6, 0, 7); cx.arc(4, -11, 1.6, 0, 7); cx.fill();
    cx.restore();
    if (e.sub < .5) { cx.strokeStyle = "rgba(255,255,255,.35)"; cx.lineWidth = 1.2; cx.beginPath(); cx.ellipse(x, y, 32, 22, 0, 0, 7); cx.stroke(); }
  }
  // Antidote's review: a floating billboard buoy (red/white float, pole, the cover in a gold frame)
  function drawRSign(e, x, y) {
    if (!window.ReviewEgg) return; var b = Math.sin(G.t * 2.4 + e.bob) * 2.5, tilt = Math.sin(G.t * 1.7 + e.bob) * .05;
    cx.fillStyle = "rgba(0,20,35,.25)"; cx.beginPath(); cx.ellipse(x + 6, y + 8, 30, 12, 0, 0, 7); cx.fill();
    cx.strokeStyle = "rgba(255,255,255," + (.35 + .2 * Math.sin(G.t * 5)) + ")"; cx.lineWidth = 2; cx.beginPath(); cx.ellipse(x, y + 2, 30 + Math.sin(G.t * 3) * 3, 11, 0, 0, 7); cx.stroke();
    cx.fillStyle = "#e3262f"; cx.beginPath(); cx.ellipse(x, y + b, 22, 9, 0, 0, 7); cx.fill(); cx.fillStyle = "#fff"; cx.fillRect(x - 6, y + b - 9, 12, 18);
    cx.save(); cx.translate(x, y + b); cx.rotate(tilt);
    cx.fillStyle = "#c9d0e2"; cx.fillRect(-2, -40, 4, 40);
    ReviewEgg.drawSign(cx, 0, -60, 88, { glow: .55 + .3 * Math.sin(G.t * 6) });
    cx.restore();
  }
  /* ---------- new art: rocks, harpoons, jet ski, boss sharks, banners (all canvas-drawn or tinted from existing sprites) ---------- */
  var TINT = {};
  function tinted(k, col, a) {   // a copy of a sprite filled with a colour (silhouettes, flashes, the darker Manō Nui)
    var i = IM[k]; if (!ok(i)) return null; var key = k + col + a; if (TINT[key]) return TINT[key];
    var c = document.createElement("canvas"); c.width = i.naturalWidth; c.height = i.naturalHeight; var x = c.getContext("2d"); x.drawImage(i, 0, 0);
    x.globalCompositeOperation = "source-atop"; x.globalAlpha = a; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height); TINT[key] = c; return c;
  }
  function img(c, x, y, w, rot, alpha, sx) { if (!c) return; var h = w * c.height / c.width; cx.save(); cx.translate(x, y); if (rot) cx.rotate(rot); if (sx) cx.scale(sx, 1); if (alpha != null) cx.globalAlpha = alpha; cx.drawImage(c, -w / 2, -h / 2, w, h); cx.restore(); }
  // the health kit: a white first-aid box with a green cross on a little orange float ring, a soft green glow so it reads at a glance
  function drawKit(e, x, y) {
    var b = Math.sin(G.t * 3 + e.bob) * 2.5, gl = .35 + .2 * Math.sin(G.t * 5 + e.bob);
    cx.save(); cx.globalCompositeOperation = "lighter"; var g = cx.createRadialGradient(x, y + b, 4, x, y + b, 46); g.addColorStop(0, "rgba(120,255,170," + gl + ")"); g.addColorStop(1, "rgba(120,255,170,0)"); cx.fillStyle = g; cx.beginPath(); cx.arc(x, y + b, 46, 0, 7); cx.fill(); cx.restore();
    cx.fillStyle = "rgba(0,20,35,.25)"; cx.beginPath(); cx.ellipse(x + 4, y + 7, 25, 13, 0, 0, 7); cx.fill();
    cx.lineWidth = 7; cx.strokeStyle = "#ff8a2a"; cx.beginPath(); cx.ellipse(x, y + b + 3, 24, 13, 0, 0, 7); cx.stroke();   // float ring
    cx.lineWidth = 2; cx.strokeStyle = "#fff"; cx.setLineDash([6, 8]); cx.beginPath(); cx.ellipse(x, y + b + 3, 24, 13, 0, 0, 7); cx.stroke(); cx.setLineDash([]);
    var bx = x - 15, by = y + b - 17; cx.fillStyle = "#fff"; cx.strokeStyle = "#1d6b3f"; cx.lineWidth = 2;
    if (cx.roundRect) { cx.beginPath(); cx.roundRect(bx, by, 30, 24, 5); cx.fill(); cx.stroke(); } else { cx.fillRect(bx, by, 30, 24); cx.strokeRect(bx, by, 30, 24); }
    cx.fillStyle = "#1d6b3f"; cx.fillRect(x - 6, by - 4, 12, 4);   // handle
    cx.fillStyle = "#22b45a"; cx.fillRect(x - 3.5, by + 4, 7, 16); cx.fillRect(x - 8, by + 8.5, 16, 7);   // the green cross
    label("+1 ❤️", x, y + b - 28, "#7dffb0");
  }
  function drawRock(e, x, y) {
    // foam collar that breathes with the swell, then wet boulders with a sunlit top edge
    var fo = .5 + .25 * Math.sin(G.t * 2.4 + e.ph);
    cx.fillStyle = "rgba(255,255,255," + (.28 + fo * .25) + ")"; cx.beginPath(); cx.ellipse(x, y + 3, e.r * 1.35 + fo * 4, e.r * 1.05 + fo * 3, 0, 0, 7); cx.fill();
    for (var k = 0; k < 7; k++) { var a = k / 7 * 6.283 + G.t * .5 + e.ph, rr = e.r * 1.25 + Math.sin(G.t * 3 + k) * 4; cx.fillStyle = "rgba(255,255,255," + (.5 + .3 * Math.sin(G.t * 4 + k * 2)) + ")"; cx.beginPath(); cx.arc(x + Math.cos(a) * rr, y + Math.sin(a) * rr * .8, 2.5 + (k % 3), 0, 7); cx.fill(); }
    cx.fillStyle = "rgba(0,20,35,.32)"; cx.beginPath(); cx.ellipse(x + 6, y + 8, e.r * 1.05, e.r * .8, 0, 0, 7); cx.fill();
    e.bs.forEach(function (b) { var bx = x + b.dx, by = y + b.dy;
      var gr = cx.createLinearGradient(bx - b.r, by - b.r, bx + b.r, by + b.r); gr.addColorStop(0, "#9b958a"); gr.addColorStop(.45, "#6d675f"); gr.addColorStop(1, "#37332f");
      cx.fillStyle = gr; cx.beginPath(); for (var k = 0; k < b.pts.length; k++) { var a = k / b.pts.length * 6.283 + b.sh, r = b.pts[k]; k ? cx.lineTo(bx + Math.cos(a) * r, by + Math.sin(a) * r * .85) : cx.moveTo(bx + Math.cos(a) * r, by + Math.sin(a) * r * .85); } cx.closePath(); cx.fill();
      cx.strokeStyle = "rgba(255,255,255,.35)"; cx.lineWidth = 1.5; cx.beginPath(); cx.arc(bx - b.r * .15, by - b.r * .2, b.r * .62, 3.5, 5.0); cx.stroke();
      cx.fillStyle = "rgba(60,90,50,.35)"; cx.beginPath(); cx.ellipse(bx + b.r * .3, by + b.r * .35, b.r * .35, b.r * .18, .4, 0, 7); cx.fill(); });
  }
  // one harpoon: wooden shaft, steel head with barbs, a little rope loop at the tail. Points along +y before rotation.
  function spear(x, y, rot, len, glow) {
    cx.save(); cx.translate(x, y); cx.rotate(rot);
    if (glow) { cx.shadowColor = "rgba(255,200,120,.9)"; cx.shadowBlur = 10; }
    var sg = cx.createLinearGradient(-2, 0, 2, 0); sg.addColorStop(0, "#5a3415"); sg.addColorStop(.5, "#b9824a"); sg.addColorStop(1, "#5a3415");
    cx.fillStyle = sg; cx.fillRect(-2.4, -len / 2, 4.8, len * .78);
    cx.shadowBlur = 0; var hg = cx.createLinearGradient(-5, 0, 5, 0); hg.addColorStop(0, "#8d98a3"); hg.addColorStop(.5, "#f2f6f9"); hg.addColorStop(1, "#6c7783"); cx.fillStyle = hg;
    cx.beginPath(); cx.moveTo(0, len / 2 + 6); cx.lineTo(4.6, len * .26); cx.lineTo(1.8, len * .28); cx.lineTo(1.8, len * .22); cx.lineTo(-1.8, len * .22); cx.lineTo(-1.8, len * .28); cx.lineTo(-4.6, len * .26); cx.closePath(); cx.fill();
    cx.strokeStyle = "#cfd6dc"; cx.lineWidth = 1.4; cx.beginPath(); cx.moveTo(1.8, len * .3); cx.lineTo(5.5, len * .2); cx.moveTo(-1.8, len * .3); cx.lineTo(-5.5, len * .2); cx.stroke();
    cx.fillStyle = "#ff7a3d"; cx.fillRect(-2.6, -len / 2, 5.2, 4); cx.strokeStyle = "#f4e2b8"; cx.lineWidth = 1.2; cx.beginPath(); cx.arc(0, -len / 2 - 3, 3, 0, 7); cx.stroke();
    cx.restore();
  }
  /* ---------- the fisherman's rounds: a real copper-jacketed bullet + tracer, muzzle flash, brass, sparks, splashes ----------
     Looks only: the hitbox, speed and "DODGED!" logic are the same as before. Every sprite is pre-rendered once into a small
     canvas, and the effects come from a fixed pool of 48 particles (nothing is allocated per frame; a full pool just skips). */
  var RND = (function () {
    var SC = 3, SP = null, P = [], N = 48, last = 0;
    for (var i = 0; i < N; i++) P.push({ on: 0, k: 0, x: 0, yw: 0, z: 0, vx: 0, vy: 0, vz: 0, t: 0, life: 1, a: 0, va: 0, s: 1 });
    function mk(w, h, fn) { var c = document.createElement("canvas"); c.width = Math.ceil(w * SC); c.height = Math.ceil(h * SC); var g = c.getContext("2d"); g.scale(SC, SC); fn(g, w, h); return c; }
    function build() {
      SP = {};
      // the round, nose along +x: boat-tail base, cylindrical copper jacket with a cannelure, pointed ogive, top-lit specular
      SP.bul = mk(16, 6, function (g) {
        var m = 3, L = 15.5, r = 2.5, cyl = 8.6;
        g.beginPath(); g.moveTo(.4, m - r * .78); g.lineTo(1.4, m - r); g.lineTo(cyl, m - r);
        g.bezierCurveTo(cyl + 3.4, m - r, L - 1.8, m - .9, L, m); g.bezierCurveTo(L - 1.8, m + .9, cyl + 3.4, m + r, cyl, m + r);
        g.lineTo(1.4, m + r); g.lineTo(.4, m + r * .78); g.closePath();
        var gr = g.createLinearGradient(0, m - r, 0, m + r);
        gr.addColorStop(0, "#5e2a10"); gr.addColorStop(.18, "#c26a33"); gr.addColorStop(.34, "#ffd8b0"); gr.addColorStop(.5, "#e08e52");
        gr.addColorStop(.78, "#94461f"); gr.addColorStop(1, "#3f1a08"); g.fillStyle = gr; g.fill();
        g.lineWidth = .35; g.strokeStyle = "rgba(40,14,4,.75)"; g.stroke();
        g.strokeStyle = "rgba(55,20,6,.7)"; g.lineWidth = .5; g.beginPath(); g.moveTo(6.4, m - r + .15); g.lineTo(6.4, m + r - .15); g.stroke();   // cannelure
        g.strokeStyle = "rgba(255,240,220,.85)"; g.lineWidth = .45; g.beginPath(); g.moveTo(1.6, m - 1.25); g.lineTo(cyl + 1.2, m - 1.25); g.quadraticCurveTo(cyl + 4, m - 1.1, L - 1.6, m - .35); g.stroke();   // specular streak
        g.fillStyle = "rgba(255,255,255,.9)"; g.beginPath(); g.ellipse(cyl + 1.6, m - 1.1, 1.3, .35, -.1, 0, 7); g.fill();
      });
      // tracer / motion streak: warm, faint at the tail, brighter at the round
      SP.trc = mk(64, 6, function (g, w, h) {
        var gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, "rgba(255,170,80,0)"); gr.addColorStop(.65, "rgba(255,190,110,.35)"); gr.addColorStop(1, "rgba(255,236,190,.95)");
        g.fillStyle = gr; g.beginPath(); g.moveTo(0, h / 2 - .2); g.lineTo(w - 2, h / 2 - 1.5); g.quadraticCurveTo(w, h / 2, w - 2, h / 2 + 1.5); g.lineTo(0, h / 2 + .2); g.closePath(); g.fill();
      });
      // muzzle flash, firing along +x from (6, 16): hot core + a 3-petal cone + side jets
      SP.fl = mk(48, 32, function (g) {
        var gr = g.createRadialGradient(8, 16, 0, 8, 16, 34); gr.addColorStop(0, "rgba(255,255,235,1)"); gr.addColorStop(.18, "rgba(255,226,120,.95)"); gr.addColorStop(.5, "rgba(255,140,40,.6)"); gr.addColorStop(1, "rgba(255,90,20,0)");
        g.fillStyle = gr; g.beginPath();
        g.moveTo(4, 16); g.quadraticCurveTo(20, 11, 46, 16); g.quadraticCurveTo(20, 21, 4, 16);
        g.moveTo(6, 15); g.quadraticCurveTo(18, 6, 34, 4); g.quadraticCurveTo(18, 11, 8, 16);
        g.moveTo(6, 17); g.quadraticCurveTo(18, 26, 34, 28); g.quadraticCurveTo(18, 21, 8, 16);
        g.moveTo(8, 15); g.lineTo(11, 3); g.lineTo(10, 15); g.moveTo(8, 17); g.lineTo(11, 29); g.lineTo(10, 17);
        g.fill(); g.beginPath(); g.arc(8, 16, 5, 0, 7); g.fill();
      });
      SP.pf = mk(32, 32, function (g) { var gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, "rgba(225,228,232,.75)"); gr.addColorStop(.6, "rgba(200,205,212,.35)"); gr.addColorStop(1, "rgba(200,205,212,0)"); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); });
      SP.ca = mk(7, 3, function (g) {   // a spent brass case, mouth to the right
        var gr = g.createLinearGradient(0, 0, 0, 3); gr.addColorStop(0, "#8a6418"); gr.addColorStop(.35, "#f6dc8c"); gr.addColorStop(.6, "#cf9f3e"); gr.addColorStop(1, "#6d4c10");
        g.fillStyle = gr; g.fillRect(.6, .3, 6.2, 2.4); g.fillStyle = "#7a5512"; g.fillRect(0, .15, .8, 2.7); g.fillStyle = "#3a2706"; g.fillRect(6.4, .7, .5, 1.6);
      });
    }
    function get() { for (var i = 0; i < N; i++) if (!P[i].on) return P[i]; return null; }
    function emit(k, x, yw, vx, vy, life, a, va, s, z, vz) { var p = get(); if (!p) return null;
      p.on = 1; p.k = k; p.x = x; p.yw = yw; p.vx = vx; p.vy = vy; p.life = life; p.t = 0; p.a = a || 0; p.va = va || 0; p.s = s || 1; p.z = z || 0; p.vz = vz || 0; return p; }
    // vx/vy below are SCREEN px/s (x right, y down); world yw runs opposite to screen y (sy = HC - (yw - cam))
    function fire(x, yw, wvx, wvy) {
      var l = Math.hypot(wvx, wvy) || 1, dx = wvx / l, dy = -wvy / l, a = Math.atan2(dy, dx), side = dx >= 0 ? 1 : -1;
      emit(1, x, yw, 0, 0, .085, a, 0, 1);                                         // the flash (2-3 frames)
      emit(2, x + dx * 10, yw - dy * 10, dx * 26, dy * 26 - 6, .55, 0, 0, .7);    // a little powder smoke drifting off the muzzle
      if (!REDUCE) emit(3, x - dx * 22, yw + dy * 22, -dy * side * rnd(55, 85) - dx * 15, dx * side * rnd(55, 85) - dy * 15, .9, rnd(0, 6), rnd(-24, 24) || 14, 1, 6, rnd(70, 95));   // one ejected case, tumbling
    }
    function sparks(x, yw) { for (var i = 0; i < 9; i++) { var an = rnd(0, 6.283), v = rnd(140, 260); emit(4, x, yw, Math.cos(an) * v, Math.sin(an) * v * .75, rnd(.16, .28), an, 0, 1); } }
    function splash(x, yw, big) {
      emit(6, x, yw, 0, 0, .55, 0, 0, big ? 1.3 : 1);
      for (var i = 0; i < (big ? 7 : 5); i++) emit(5, x + rnd(-3, 3), yw, rnd(-45, 45), rnd(-14, 14), rnd(.4, .6), 0, 0, rnd(1.4, 2.4), 0, rnd(60, 110));
    }
    function hit(x, yw) { sparks(x, yw); splash(x, yw, 1); }
    function clear() { for (var i = 0; i < N; i++) P[i].on = 0; }
    function step(dt) {
      for (var i = 0; i < N; i++) { var p = P[i]; if (!p.on) continue; p.t += dt; if (p.t >= p.life) { p.on = 0; continue; }
        p.x += p.vx * dt; p.yw -= p.vy * dt; p.a += p.va * dt;
        if (p.k === 4) { p.vx *= .9; p.vy *= .9; }
        else if (p.k === 2) { p.vx *= .96; p.vy *= .96; }
        else if (p.k === 3 || p.k === 5) { p.vz -= 320 * dt; p.z += p.vz * dt;
          if (p.z <= 0) { p.z = 0; if (p.k === 3) { p.on = 0; emit(6, p.x, p.yw, 0, 0, .35, 0, 0, .4); } else p.on = 0; } } }
    }
    // the round itself, drawn where the old harpoon was. Points along its screen velocity.
    function bullet(e, x, y) {
      if (!SP) build(); var a = Math.atan2(-e.vy, e.vx), sp = Math.hypot(e.vx, e.vy), tl = Math.min(70, 26 + sp * .14);
      cx.globalAlpha = .22; cx.fillStyle = "#001423"; cx.beginPath(); cx.ellipse(x + 5, y + 7, 9, 2.4, a, 0, 7); cx.fill();   // its shadow on the water
      cx.save(); cx.translate(x, y); cx.rotate(a);
      cx.globalCompositeOperation = "lighter"; cx.globalAlpha = .75; cx.drawImage(SP.trc, -tl + 5, -3.6, tl, 7.2);
      cx.globalCompositeOperation = "source-over"; cx.globalAlpha = 1; cx.drawImage(SP.bul, -10, -3.75, 20, 7.5);   // ~1.25x real-to-screen so it reads on a phone
      cx.restore(); cx.globalAlpha = 1;
    }
    function draw() {
      var now = performance.now(), dt = last ? Math.min(.05, (now - last) / 1000) : 0; last = now; step(dt);
      if (!SP) build(); var any = 0;
      for (var i = 0; i < N; i++) { var p = P[i]; if (!p.on) continue; any = 1; var f = p.t / p.life, x = p.x, y = sy(p.yw) - p.z;
        if (p.k === 1) { cx.save(); cx.globalCompositeOperation = "lighter"; cx.globalAlpha = 1 - f * .6; cx.translate(x, y); cx.rotate(p.a); var k = .85 + .3 * (1 - f); cx.drawImage(SP.fl, -8 * k, -16 * k, 48 * k, 32 * k); cx.restore(); }
        else if (p.k === 2) { var r = 8 + f * 18; cx.globalAlpha = .55 * (1 - f); cx.drawImage(SP.pf, x - r, y - r, r * 2, r * 2); }
        else if (p.k === 3) { cx.globalAlpha = f > .7 ? (1 - f) / .3 : 1; cx.fillStyle = "#001423"; cx.save(); cx.globalAlpha *= .25; cx.beginPath(); cx.ellipse(x + 2, sy(p.yw) + 2, 3, 1.2, 0, 0, 7); cx.fill(); cx.restore(); cx.save(); cx.translate(x, y); cx.rotate(p.a); cx.drawImage(SP.ca, -3.5, -1.5, 7, 3); cx.restore(); }
        else if (p.k === 4) { var ln = 10 * (1 - f) + 3, cs = Math.cos(p.a), sn = Math.sin(p.a); cx.globalCompositeOperation = "lighter"; cx.globalAlpha = 1 - f; cx.strokeStyle = "#ffd27a"; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(x, y); cx.lineTo(x - cs * ln, y - sn * ln * .75); cx.stroke(); cx.globalCompositeOperation = "source-over"; }
        else if (p.k === 5) { cx.globalAlpha = .85 * (1 - f); cx.fillStyle = "#f4fbff"; cx.beginPath(); cx.arc(x, y, p.s, 0, 7); cx.fill(); }
        else if (p.k === 6) { cx.globalAlpha = .7 * (1 - f); cx.strokeStyle = "#eaf8ff"; cx.lineWidth = 1.6; cx.beginPath(); cx.ellipse(x, y, (4 + f * 22) * p.s, (2 + f * 9) * p.s, 0, 0, 7); cx.stroke(); }
      }
      if (any) cx.globalAlpha = 1;
    }
    return { fire: fire, hit: hit, splash: splash, bullet: bullet, draw: draw, clear: clear };
  })();
  function drawHarpPick(e, x, y) {
    var b = Math.sin(G.t * 3 + e.bob) * 2.5, pul = .5 + .5 * Math.sin(G.t * 5 + e.bob);
    cx.save(); cx.globalCompositeOperation = "lighter"; var gg = cx.createRadialGradient(x, y + b, 3, x, y + b, 38); gg.addColorStop(0, "rgba(255,170,80," + (.35 + pul * .25) + ")"); gg.addColorStop(1, "rgba(255,170,80,0)"); cx.fillStyle = gg; cx.beginPath(); cx.arc(x, y + b, 38, 0, 7); cx.fill(); cx.restore();
    cx.fillStyle = "rgba(0,20,35,.25)"; cx.beginPath(); cx.ellipse(x + 4, y + 7, 22, 12, 0, 0, 7); cx.fill();
    cx.lineWidth = 7; cx.strokeStyle = "#ff5a3c"; cx.beginPath(); cx.ellipse(x, y + b, 18, 13, 0, 0, 7); cx.stroke();
    cx.lineWidth = 7; cx.strokeStyle = "#fff"; cx.setLineDash([6, 9]); cx.beginPath(); cx.ellipse(x, y + b, 18, 13, 0, 0, 7); cx.stroke(); cx.setLineDash([]);
    spear(x - 5, y + b, -.55, 40); spear(x + 5, y + b, .55, 40); spear(x, y + b - 2, 0, 44, 1);
    cx.font = "900 11px system-ui"; cx.textAlign = "center"; cx.lineWidth = 3; cx.strokeStyle = "rgba(5,18,34,.85)"; cx.strokeText("HARPOON ×3", x, y + b + 34); cx.fillStyle = "#ffb15e"; cx.fillText("HARPOON ×3", x, y + b + 34);
  }
  function drawSki(e, x, y) {
    var d = e.vx > 0 ? 1 : -1;
    cx.fillStyle = "rgba(255,255,255,.55)"; for (var k = 1; k < 7; k++) { cx.beginPath(); cx.arc(x - d * (20 + k * 13), y + Math.sin(k * 1.7 + G.t * 9) * 3, 4 + k * 1.6, 0, 7); cx.fill(); }
    cx.fillStyle = "rgba(0,20,35,.25)"; cx.beginPath(); cx.ellipse(x + 5, y + 8, 30, 11, 0, 0, 7); cx.fill();
    cx.save(); cx.translate(x, y); cx.scale(d, 1);
    var hg = cx.createLinearGradient(0, -12, 0, 12); hg.addColorStop(0, "#ff4b3a"); hg.addColorStop(1, "#b81d1d"); cx.fillStyle = hg;
    cx.beginPath(); cx.moveTo(30, 0); cx.quadraticCurveTo(22, -12, -6, -12); cx.lineTo(-26, -10); cx.quadraticCurveTo(-30, 0, -26, 10); cx.lineTo(-6, 12); cx.quadraticCurveTo(22, 12, 30, 0); cx.closePath(); cx.fill();
    cx.fillStyle = "#fff"; cx.fillRect(-20, -2, 36, 4); cx.fillStyle = "#222"; cx.fillRect(6, -9, 7, 18); cx.fillStyle = "#ffd23f"; cx.beginPath(); cx.arc(-8, 0, 8, 0, 7); cx.fill();
    cx.fillStyle = "#8a5a3c"; cx.beginPath(); cx.arc(-8, 0, 5, 0, 7); cx.fill(); cx.restore();
    label("Lifeguard 🔱", x, y - 22, "#ffb15e");
  }
  function drawBoss() {
    var b = G.boss; if (!b) return; var x = b.x, y = sy(bossYw(b)), s = b.size, B = b.B;
    if (y < -s || y > H + s) { if (b.st === "warn" || b.st === "charge") { cx.fillStyle = "#ff4d4d"; cx.font = "900 22px system-ui"; cx.textAlign = "center"; cx.fillText(y < 0 ? "▲ !" : "▼ !", Math.max(20, Math.min(W - 20, x)), y < 0 ? CAM.y - (CAM.y - 70) / ZOOM : CAM.y + (H - 70 - CAM.y) / ZOOM); } }
    var pul = .5 + .5 * Math.sin(G.t * 26);
    if (b.st === "warn") {   // telegraph: a dashed red charge line to where it's going to hit
      var tx = b.ax, ty = sy(G.yw + G.dir * b.af), ang = Math.atan2(ty - y, tx - x), ex = tx + Math.cos(ang) * 120, ey = ty + Math.sin(ang) * 120;
      cx.save(); cx.strokeStyle = "rgba(255,60,60," + (.45 + .45 * pul) + ")"; cx.lineWidth = 5; cx.setLineDash([14, 10]); cx.lineDashOffset = -G.t * 60; cx.beginPath(); cx.moveTo(x, y); cx.lineTo(ex, ey); cx.stroke(); cx.setLineDash([]);
      cx.fillStyle = "rgba(255,60,60,.85)"; cx.translate(ex, ey); cx.rotate(ang); cx.beginPath(); cx.moveTo(14, 0); cx.lineTo(-8, -11); cx.lineTo(-8, 11); cx.closePath(); cx.fill(); cx.restore();
      cx.strokeStyle = "rgba(255,60,60," + (.5 + .5 * pul) + ")"; cx.lineWidth = 4; cx.beginPath(); cx.arc(x, y, s * .38, 0, 7); cx.stroke();
      cx.font = "900 26px system-ui"; cx.fillStyle = "#ff4d4d"; cx.textAlign = "center"; cx.fillText("!", x, y - s * .42);
    }
    if (b.st === "bwarn") { var k = Math.min(1, b.t / .8);
      cx.fillStyle = "rgba(255,40,40," + (.12 + .14 * pul) + ")"; cx.beginPath(); cx.arc(x, y, 74, 0, 7); cx.fill();
      cx.strokeStyle = "rgba(255,70,70,.95)"; cx.lineWidth = 4; cx.setLineDash([10, 8]); cx.beginPath(); cx.arc(x, y, 74, 0, 7); cx.stroke(); cx.setLineDash([]);
      cx.strokeStyle = "rgba(255,255,255,.85)"; cx.lineWidth = 3; cx.beginPath(); cx.arc(x, y, 74 * (1 - k) + 6, 0, 7); cx.stroke();
      label("MOVE!", x, y - 84, "#ff6b6b"); }
    if (D3) { if (b.st === "crash" || b.st === "ko") { for (var q3 = 0; q3 < 4; q3++) { var a3 = G.t * 4 + q3 * 1.57; star(x + Math.cos(a3) * s * .22, y - s * .2 + Math.sin(a3) * s * .08, 6); } } return; }
    var base = b.kind === 5 ? tinted("shark", "#16243a", .38) : IM.shark; if (!ok(IM.shark)) base = null;
    var sil = tinted("shark", "#0a3550", 1), wsil = tinted("shark", "#ffffff", 1);
    var rot = b.ang, sc = 1, alpha = 1;
    if (b.st === "crash" || b.st === "ko") rot += Math.sin(G.t * 9) * .18;
    if (b.st === "tail") rot += Math.sin(b.t * 16) * .5 * Math.min(1, b.t / .3);
    if (b.st === "ko") { rot = b.ang + b.t * 1.4; sc = 1 - b.sub * .3; }
    if (b.br > 0) sc *= 1 + b.br * .5;
    // shadow on the sand below, then the body (sinks into a dark silhouette when it dives)
    img(sil, x + 12, y + 16, s * sc * .96, rot, .22);
    if (b.sub > .85 && b.st !== "ko") { img(sil, x, y, s * sc, rot, .5); }
    else {
      img(base, x, y, s * sc, rot, alpha * (1 - b.sub * .55));
      if (b.sub > .05) img(sil, x, y, s * sc, rot, b.sub * .55);
      if (b.fl > 0) img(wsil, x, y, s * sc, rot, Math.min(.85, b.fl / .32 * .85));
      if (b.st === "ko") img(wsil, x, y, s * sc, rot, .25);
      if (b.br > 0) { cx.strokeStyle = "rgba(255,255,255," + b.br * 1.6 + ")"; cx.lineWidth = 6; cx.beginPath(); cx.arc(x, y, s * .5 * (1.5 - b.br), 0, 7); cx.stroke(); }
    }
    if (b.sub < .5 && b.st !== "ko") { cx.strokeStyle = "rgba(255,255,255," + (.25 + .15 * Math.sin(G.t * 5)) + ")"; cx.lineWidth = 2; cx.beginPath(); cx.ellipse(x, y, s * .36, s * .3, rot, 0, 7); cx.stroke(); }
    if (b.st === "crash" || b.st === "ko") { for (var q = 0; q < 4; q++) { var a = G.t * 4 + q * 1.57; star(x + Math.cos(a) * s * .22, y - s * .2 + Math.sin(a) * s * .08, 6); } }
  }
  function drawBossBar() {   // health bar over the boss (drawn above the pier deck)
    var b = G.boss; if (!b) return; var x = b.x, y = sy(bossYw(b)), s = b.size;
    if (b.st !== "ko") {
      var bw = Math.min(170, s * .72), bh = 9, vl = CAM.x - W / 2 / ZOOM + 8, vr = CAM.x + W / 2 / ZOOM - 8, bx = Math.max(vl, Math.min(vr - bw, x - bw / 2)), by2 = y - s * .5 - 6, f = b.hp / b.max;
      label(b.name, bx + bw / 2, by2 - 6, b.kind === 5 ? "#ff6b6b" : "#ffd23f");
      cx.fillStyle = "rgba(5,18,34,.8)"; cx.fillRect(bx - 2, by2 - 2, bw + 4, bh + 4);
      var hg = cx.createLinearGradient(bx, 0, bx + bw, 0); hg.addColorStop(0, "#ff3b3b"); hg.addColorStop(1, f > .4 ? "#ffb02e" : "#ff3b3b"); cx.fillStyle = hg; cx.fillRect(bx, by2, bw * f, bh);
      cx.fillStyle = "rgba(255,255,255,.35)"; cx.fillRect(bx, by2, bw * f, 3);
      cx.fillStyle = "rgba(5,18,34,.6)"; for (var t = 1; t < 10; t++) cx.fillRect(bx + bw * t / 10, by2, 1, bh);
    }
  }
  function star(x, y, r) { cx.fillStyle = "#ffd23f"; cx.beginPath(); for (var i = 0; i < 10; i++) { var a = i / 10 * 6.283 - Math.PI / 2, rr = i % 2 ? r * .45 : r; cx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } cx.closePath(); cx.fill(); }
  function drawBlobs() {
    G.blobs.forEach(function (o) { var x = o.x, y = sy(G.yw + G.dir * o.f), a = Math.atan2(o.vx, -o.vf * G.dir);
      cx.save(); cx.translate(x, y); cx.rotate(a);
      cx.fillStyle = "rgba(2,40,70,.35)"; cx.beginPath(); cx.ellipse(0, 8, 24, 9, 0, 0, 7); cx.fill();
      var gr = cx.createLinearGradient(0, -14, 0, 10); gr.addColorStop(0, "rgba(255,255,255,.95)"); gr.addColorStop(1, "rgba(120,220,235,.6)"); cx.fillStyle = gr;
      cx.beginPath(); cx.moveTo(-24, 6); cx.quadraticCurveTo(-18, -16, 0, -14); cx.quadraticCurveTo(18, -16, 24, 6); cx.quadraticCurveTo(0, -2, -24, 6); cx.fill();
      for (var k = 0; k < 5; k++) { cx.fillStyle = "rgba(255,255,255,.85)"; cx.beginPath(); cx.arc(-18 + k * 9, -10 + Math.sin(G.t * 12 + k) * 3, 3, 0, 7); cx.fill(); }
      cx.restore(); });
  }
  function drawHarps() {
    G.harps.forEach(function (h) { var x = h.x, y = sy(h.yw), sx = G.x, sy0 = sy(G.yw) - 6, mx = (x + sx) / 2, my = (y + sy0) / 2, dx = x - sx, dy = y - sy0, l = Math.hypot(dx, dy) || 1;
      var sag = (h.st === "fly" ? 14 : 22) * Math.sin(G.t * 18 + h.t * 6), nx = -dy / l * sag, ny = dx / l * sag;
      cx.strokeStyle = "rgba(10,25,40,.6)"; cx.lineWidth = 4.5; cx.beginPath(); cx.moveTo(sx, sy0); cx.quadraticCurveTo(mx + nx, my + ny, x, y); cx.stroke();
      cx.strokeStyle = "#f6e6bd"; cx.lineWidth = 2.4; cx.beginPath(); cx.moveTo(sx, sy0); cx.quadraticCurveTo(mx + nx, my + ny, x, y); cx.stroke();
      var rot = Math.atan2(-h.vx, -h.vy);   // screen-space heading (world y is flipped on screen)
      if (h.st === "fly") { cx.strokeStyle = "rgba(255,255,255,.5)"; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(x, y); cx.lineTo(x - h.vx * .03, y + h.vy * .03); cx.stroke(); }
      spear(x, y, rot, 54, h.st === "fly"); });
  }
  function drawBanner() {
    var bn = G.banner; if (!bn) return; var t = bn.t, a = Math.min(1, t / .25, (bn.dur - t) / .4), sl = 1 - Math.min(1, t / .35);
    cx.save(); cx.setTransform(DPR, 0, 0, DPR, 0, 0); cx.globalAlpha = Math.max(0, a);
    var y = bn.y || H * .34, hgt = 128, gr = cx.createLinearGradient(0, y, 0, y + hgt); gr.addColorStop(0, "rgba(6,24,46,0)"); gr.addColorStop(.2, "rgba(6,24,46,.82)"); gr.addColorStop(.8, "rgba(6,24,46,.82)"); gr.addColorStop(1, "rgba(6,24,46,0)");
    cx.fillStyle = gr; cx.fillRect(0, y, W, hgt);
    cx.fillStyle = bn.col; cx.fillRect(0, y + 18, W, 2); cx.fillRect(0, y + hgt - 20, W, 2);
    cx.textAlign = "center"; cx.translate(sl * 260, 0);
    if (bn.top) { cx.font = "900 13px system-ui"; cx.fillStyle = "#fff"; cx.fillText(bn.top, W / 2, y + 38); }
    var fs = bn.title.length > 14 ? 30 : 44; cx.font = fs + "px 'Alfa Slab One',Georgia,serif"; cx.lineWidth = 6; cx.strokeStyle = "#3a1600"; cx.strokeText(bn.title, W / 2, y + 82); cx.fillStyle = "#ff7a3d"; cx.fillText(bn.title, W / 2, y + 85); cx.fillStyle = bn.col; cx.fillText(bn.title, W / 2, y + 82);
    if (bn.sub) { cx.font = "800 13px system-ui"; cx.fillStyle = "#cfe8ff"; cx.fillText(bn.sub, W / 2, y + 104); }
    cx.restore();
  }
  function drawConf() { if (!G.conf.length) return; cx.save(); cx.setTransform(DPR, 0, 0, DPR, 0, 0);
    G.conf.forEach(function (c) { cx.save(); cx.translate(c.x, c.y); cx.rotate(c.rot); cx.fillStyle = c.c; cx.fillRect(-c.r, -c.r * .5, c.r * 2, c.r); cx.restore(); }); cx.restore(); }
  // spinning blades: a soft motion-blur disc plus two blades with trailing ghosts
  function rotorFX(c,x,y,r,t,dir){ // fast rotor illusion: streaky blur disc + 4 tapered blades turning slowly with motion-blur trails
    dir=dir||1; var a=t*2.6*dir;
    c.save(); c.translate(x,y);
    if(c.createConicGradient){ var cg=c.createConicGradient(a*3.1,0,0); for(var i=0;i<=12;i++) cg.addColorStop(i/12,i%2?"rgba(25,25,30,.20)":"rgba(25,25,30,.07)"); c.fillStyle=cg; }
    else c.fillStyle="rgba(25,25,30,.13)";
    c.beginPath(); c.arc(0,0,r,0,6.283); c.fill();
    c.strokeStyle="rgba(255,255,255,.10)"; c.lineWidth=1; c.beginPath(); c.arc(0,0,r*.98,0,6.283); c.stroke();
    for(var b=0;b<4;b++) for(var g=0;g<6;g++){ var ang=a+b*Math.PI/2-g*.07*dir; c.save(); c.rotate(ang); c.globalAlpha=g?(.30-g*.045):.85;
      c.fillStyle=g?"#5c6370":"#7d8592"; c.beginPath(); c.moveTo(0,-2.6); c.lineTo(r*.96,-1.6); c.lineTo(r,0); c.lineTo(r*.96,1.6); c.lineTo(0,2.6); c.closePath(); c.fill(); if(!g){ c.strokeStyle="rgba(255,255,255,.45)"; c.lineWidth=.8; c.beginPath(); c.moveTo(r*.15,-2.2); c.lineTo(r*.95,-1.3); c.stroke(); } c.restore(); }
    c.globalAlpha=1; c.fillStyle="#2b2e35"; c.beginPath(); c.arc(0,0,r*.09,0,6.283); c.fill(); c.fillStyle="rgba(255,255,255,.35)"; c.beginPath(); c.arc(-r*.03,-r*.03,r*.035,0,6.283); c.fill();
    c.restore(); }
  function rotor(x, y, r, a, top) { if (top) rotorFX(cx, x, y, r, G.t, 1); }
  var lastHud = "", lastJ = "";
  var lastF = "";
  function fireBtn() { var b = $("nv-fire"); if (!b) return; var on = G.running && G.phase === "ride" && G.ammo > 0, k = on + "" + G.ammo + G.running + G.over;
    if (k === lastF) return; lastF = k; b.classList.toggle("on", on); b.innerHTML = "<b>🔱</b>FIRE ×" + G.ammo; }
  // JUMP doubles as DUCK DIVE on the paddle-out; TRICK only lights up in the air
  function jumpBtn() { fireBtn(); var b = $("nv-jump"), tb = $("nv-trick"); if (!b) return;
    var sw = G.phase === "swim", ride = G.phase === "ride", on = G.running && (sw || ride), near = 0;
    if (sw) G.ents.forEach(function (e) { if (e.t === "brk" && !e.hit) { var d = (e.yw - G.yw) * G.dir; if (d > 0 && d < 150) near = 1; } });
    var rd = on && ride && !!(G.lip || G.warnPier), air = ride && G.jump > .05 && !G.trick, k = [on, sw, near, rd, air, ride, G.lip].join();
    if (k === lastJ) return; lastJ = k;
    b.classList.toggle("on", on); b.classList.toggle("ready", rd); b.classList.toggle("duck", !!(sw && near));
    b.innerHTML = sw ? "DUCK<br>DIVE" : air ? "TRICK" : rd && G.lip ? "⬆ LIP<br>JUMP" : rd ? "JUMP<br>🌊" : "JUMP";
    if (tb) { tb.classList.toggle("on", G.running && ride); tb.classList.toggle("air", air); } }
  function heartsHTML(h) { var o = "", i; for (i = 1; i <= 5; i++) o += h >= i ? "❤️" : h >= i - .5 ? '<span class="nv-hh">🤍<i>❤️</i></span>' : "🤍"; return o; }   // ½ = a heart cut in half
  function mmss(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }
  function hud() {
    var P = L(), s = Math.floor(G.score).toLocaleString(), m = "×" + G.mult + (G.pocket ? " · IN THE POCKET 🌊" : G.streak >= 3 ? " · " + G.streak + " streak 🔥" : ""), hs = heartsHTML(G.hearts),
      leg = G.boss ? "⚠ " + G.boss.name + " " + Math.ceil(G.boss.hp) + "/" + G.boss.max : G.phase === "sand" ? "Run to the water 🏃" : G.phase === "swim" ? "Paddle out · " + mmss(P.swim - G.lvT) : G.phase === "popup" ? "Stand up!" :
        G.phase === "ride" ? (P.boss && !G.bossBeat ? "Ride · boss in " : "Ride it in · ") + mmss(P.ride - G.rideT) : G.phase === "ridein" || G.phase === "beach" ? "Back to Nalu Vida 🌴" : G.phase === "victory" ? "Champion! 🏆" : "",
      tot = P.swim + P.ride, pr = G.boss ? G.boss.hp / G.boss.max : G.phase === "sand" || G.phase === "swim" ? G.lvT / tot : G.phase === "ride" || G.phase === "popup" ? (P.swim + G.rideT) / tot : 1,
      key = s + m + hs + leg + G.level + Math.round(pr * 100);
    if (key === lastHud) return; lastHud = key;
    $("nv-score").textContent = s; $("nv-mult").textContent = m; $("nv-hearts").innerHTML = hs; $("nv-hearts").setAttribute("aria-label", G.hearts + " of 5 hearts"); $("nv-leg").textContent = leg; $("nv-lap").textContent = "Level " + G.level + "/5";
    var pe = $("nv-prog"); pe.style.width = Math.max(0, Math.min(1, pr)) * 100 + "%"; pe.style.background = G.boss ? "linear-gradient(90deg,#ff3b3b,#ff9d2e)" : "";
  }

  /* ---------- loop ---------- */
  var last = 0;
  function frame(ts) {
    var dt = Math.min(0.05, (ts - (last || ts)) / 1000); last = ts;
    if (G.running) for (var k = 0; k < DBG_SPD && G.running; k++) update(dt); else { G.t += dt; G.cam = G.cam || 260; }
    confStep(dt); if (G.banner && !G.running) G.banner = null;
    draw(); fpsWatch();
    requestAnimationFrame(frame);
  }

  /* ---------- start / end ---------- */
  function start(s) { radioReset(); audio(); if (AC && AC.state === "suspended") AC.resume(); G.surfer = s || G.surfer; G.splashed = 0; reset(); G.running = true; G.over = false; $("nv-start").style.display = "none"; $("nv-end").style.display = "none"; musicSync(); }
  function end() { cutscene("over"); }   // game over: the crew brings you in, and the run ends at Nalu Vida
  function showEnd() {
    G.running = false; G.over = true; var sc = Math.floor(G.score); G.score = sc; if (RA) RA.clear();   // the lifeguard bubble would sit over the end card
    if (sc > G.best) { G.best = sc; try { localStorage.setItem("nalu-best", sc); } catch (e) {} }
    // Rewards points (crm.js SSAI_GAMEPTS): 1 pt per 100 score, capped per day. Members get them now; a guest's are held
    // until they join ("Join to save your N points"). award() runs once per finished run.
    var GP = window.SSAI_GAMEPTS || null, RW = (window.SSAI_REWARDS && window.SSAI_REWARDS.game) || {}, per = (GP && GP.cfg && GP.cfg.perScore) || RW.perScore || 100, cap = (GP && GP.cfg && GP.cfg.dailyCap) || RW.dailyCap || 50;
    var worth = GP && GP.forScore ? GP.forScore(sc) : Math.min(cap, Math.floor(sc / per)), aw = null;
    if (GP && GP.award && G.awarded !== G.runId) { G.awarded = G.runId; try { aw = GP.award(sc, "🏄 Rode the Nalu · score " + sc.toLocaleString()); } catch (e) { aw = null; } G.lastAward = aw; } else aw = G.lastAward || null;
    function ptsHtml(a) {
      var head = "Score " + sc.toLocaleString() + " → <b>" + worth + " point" + (worth === 1 ? "" : "s") + "</b>";
      if (!GP) return head + "<br><span style='font-weight:600;font-size:12.5px'>1 point per " + per + " score · up to " + cap + " a day</span>";
      if (!a) return head;
      if (a.saved) return head + "<br>" + (a.pts > 0 ? "+" + a.pts + " points added to your Nalu Vida Rewards" : "Daily game limit reached (" + cap + " a day)") +
        "<br><span style='font-weight:600;font-size:12.5px'>" + (a.today != null ? a.today + " of " + cap + " game points today" : "") + "</span>";
      if (a.pts > 0) return head + "<br><button class='nv-btn' id='nv-join' type='button' style='margin-top:8px'>🎁 Join to save your " + a.pts + " points</button><br><span style='font-weight:600;font-size:12px;opacity:.85'>Free Nalu Vida Rewards · up to " + cap + " game points a day</span>";
      return head + "<br>Daily game limit reached (" + cap + " a day)";
    }
    var win = ptsHtml(aw);
    var sv = {}; try { sv = JSON.parse(localStorage.getItem("nalu-board") || "{}"); } catch (e) {}
    $("nv-end").innerHTML = (ok(IM.storefront) ? "<img src='" + IM.storefront.src + "' alt='Nalu Vida' style='width:100%;max-width:330px;" + (window.ReviewEgg ? "max-height:110px;object-fit:cover;" : "") + "border-radius:14px;box-shadow:0 8px 24px rgba(0,0,0,.4);margin-bottom:8px'>" : "") + (G.won ? "<h3>All 5 levels ridden! 🏆</h3>" : "<h3>You made it to Nalu Vida! 🌴</h3>") + "<p style='font:900 30px system-ui;margin:4px 0'>" + sc.toLocaleString() + "</p><p>" + (G.won ? "All 5 levels cleared" : "Level " + G.level + "/5") + " · best " + G.best.toLocaleString() + "</p>" +
      "<div class='nv-win' id='nv-pts'>" + win + "</div>" +
      "<button class='nv-btn' id='nv-order' type='button' style='font-size:18px;padding:14px 24px'>🍽️ Head inside &amp; order</button><br>" +
      "<button class='nv-btn' id='nv-again' type='button' style='background:#fff'>🏄 Ride again</button>" +
      "<div class='nv-board'><b>This week's top riders</b> <span id='nv-wk' style='opacity:.7'></span><ol id='nv-list'><li>Loading…</li></ol>" +
      "<input id='nv-n' maxlength='16' placeholder='Name for the board' value='" + esc(sv.n || "") + "'><input id='nv-ig' maxlength='31' placeholder='@instagram (optional)' value='" + (sv.ig ? "@" + esc(sv.ig) : "") + "'>" +
      "<button class='nv-btn' id='nv-post' type='button' style='width:100%;margin-top:6px'>Post my score</button><div id='nv-msg' style='margin-top:6px;font-size:12.5px'></div></div>";
    // "Until Toast is connected" explainer under the points (interim mode, demo/interim.js)
    if (window.SSAI_INTERIM && $("nv-pts")) { var ex = document.createElement("div"); ex.innerHTML = SSAI_INTERIM.explainerHTML(1); $("nv-pts").insertAdjacentElement("afterend", ex); }
    if (window.ReviewEgg) ReviewEgg.endCard($("nv-end"), $("nv-order"));
    $("nv-end").style.display = "flex";
    var fly = document.createElement("button"); fly.type = "button"; fly.className = "nv-fly"; fly.setAttribute("aria-label", "Fly to Melody Bar and Grill");
    fly.innerHTML = "<img src='img/game/plane.webp' alt=''><span>✈ Visit our sister spot: Melody Bar &amp; Grill · LAX</span>";
    fly.onclick = function () { location.href = "../melody-lax/?from=nalu#play"; };
    $("nv-end").appendChild(fly);
    $("nv-again").onclick = function () { start(); };   // play again: never gated (guests can play before joining)
    $("nv-order").onclick = function () { $("nv-end").style.display = "none"; var t = document.getElementById("seat") || document.getElementById("food"); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" }); };
    $("nv-post").onclick = function () { if (window.SSAI_GATE) SSAI_GATE("score", function (m) { if (m && !$("nv-n").value) $("nv-n").value = (m.name || "").split(" ")[0]; post(); }); else post(); }; loadBoard();
    var jb = $("nv-join"); if (jb && GP && GP.join) jb.onclick = function () { GP.join(function (r) { var m = (r && r.member) || (GP.member && GP.member());
        var got = r && r.pts != null ? r.pts : (aw ? aw.pts : 0); $("nv-pts").innerHTML = "Score " + sc.toLocaleString() + " → <b>" + worth + " points</b><br>✅ +" + got + " points saved to your Nalu Vida Rewards";
        if (m && !$("nv-n").value) $("nv-n").value = (m.name || "").split(" ")[0]; }); };
    // PLAY FIRST, CLAIM AFTER (demo/claimscore.js): a guest's rank on this week's board + the "save your score" sheet (same SSAI_GATE
    // "score" sheet as Post my score). Saving posts this ride with the same post() and saves the held Rewards points. No weekly prize here.
    if (window.SSAI_CLAIM) SSAI_CLAIM.show({ key: BGAME, score: sc, board: { api: BAPI, game: BGAME, week: wkey() }, prize: false, fame: "ig", reason: "score", mount: $("nv-order"),
      after: function (m) { if (m && !$("nv-n").value) $("nv-n").value = (m.name || "").split(" ")[0]; post(); var j = $("nv-join"); if (j) j.click(); },
      again: function () { start(); }, alive: function () { return G.over && !G.running; } });
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function wkey(off) { var d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7) - 7 * (off || 0)); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function loadBoard() { var l = $("nv-list"); if (!l) return; $("nv-wk").textContent = "· week of " + wkey();
    fetch(BAPI + "?game=" + BGAME + "&week=" + wkey()).then(function (r) { return r.json(); }).then(function (rows) {
      l.innerHTML = rows.length ? rows.slice(0, 10).map(function (r, i) { return "<li><b>" + esc(r.name) + "</b>" + (r.ig ? " · @" + esc(r.ig) : "") + " — " + Number(r.score).toLocaleString() + (i === 0 ? " 👑" : "") + "</li>"; }).join("") : "<li>Be the first on the board!</li>";
    }).catch(function () { l.innerHTML = "<li>Board is loading…</li>"; }); }
  function post() {
    var n = $("nv-n").value.trim().replace(/[^\w .\-]/g, "").slice(0, 16), ig = $("nv-ig").value.trim().replace(/^@/, "").replace(/[^A-Za-z0-9._]/g, "").slice(0, 30), m = $("nv-msg");
    if (!n) { m.textContent = "Add a name for the board."; return; } if (G.posted === G.runId) { m.textContent = "This ride is already on the board."; return; }
    m.textContent = "Posting…";
    fetch(BAPI, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ game: BGAME, name: n, ig: ig, score: G.score, week: wkey() }) }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j.ok) { m.textContent = j.error === "name not allowed" ? "Pick a different name." : "Couldn't post that one. Try again."; return; }
      G.posted = G.runId; try { localStorage.setItem("nalu-board", JSON.stringify({ n: n, ig: ig })); } catch (e) {} m.textContent = "✅ You're on the board!"; loadBoard(); buzz(20);
    }).catch(function () { m.textContent = "No connection. Try again in a sec."; });
  }

  // Easter egg: the Melody banner plane
  function melodyEgg() {
    var key = "nalu-melody-egg-" + new Date().toDateString(), seen; try { seen = localStorage.getItem(key); } catch (e) {}
    sfx("egg"); if (!seen) { try { localStorage.setItem(key, "1"); } catch (e) {} gain(500, W / 2, 120, "EASTER EGG!"); }
    var o = document.createElement("div"); o.className = "nv-ov"; o.style.zIndex = 5;
    o.innerHTML = "<h3 style='font-size:26px'>✈️ You found it!</h3><p>Nalu Vida's sister spot by LAX says hi.</p><div class='nv-win'><b>Melody Bar &amp; Grill</b><br><span style='font-weight:600;font-size:12.5px'>9132 S Sepulveda Blvd · by LAX</span></div>" +
      "<a class='nv-btn' href='../melody-lax/' style='text-decoration:none'>See Melody's app</a><button class='nv-btn' type='button' style='background:#fff'>Keep surfing</button>";
    var was = G.running; G.running = false; wrap.appendChild(o);
    o.querySelector("button").onclick = function () { o.remove(); G.running = was && !G.over; last = 0; };
  }

  /* ---------- input ---------- */
  var drag = null;
  function local(e) { var r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; }
  cv.addEventListener("pointerdown", function (e) {
    e.preventDefault(); var p0 = local(e), p = toWorld(p0.x, p0.y);
    var pl = G.ents.filter(function (x) { return x.t === "plane" && x.hit; })[0];
    if (pl && p.x > pl.hit.x && p.x < pl.hit.x + pl.hit.w && p.y > pl.hit.y && p.y < pl.hit.y + pl.hit.h) { melodyEgg(); return; }
    if (!G.running) return;
    drag = { id: e.pointerId, x: p0.x, x0: p0.x, y: p0.y, y0: p0.y, t0: performance.now(), moved: 0, sw: 0 }; try { cv.setPointerCapture(e.pointerId); } catch (x) {}
  });
  // drag sideways = steer · riding: a quick flick UP on the clean face = ride up the lip and launch · airborne: flick up = flip,
  // flick down = grab, a fast flick sideways = 360 · a tap = JUMP / duck-dive (in the air a tap = the next trick)
  cv.addEventListener("pointermove", function (e) { if (!drag || e.pointerId !== drag.id) return; var p = local(e), dx = p.x - drag.x, dy = p.y - drag.y0, ddx = p.x - drag.x0; drag.x = p.x; drag.moved += Math.abs(dx);
    var quick = performance.now() - drag.t0 < 400;
    if (!drag.sw && G.phase === "ride" && G.jump > .05 && quick) {
      if (Math.abs(dy) > 34 && Math.abs(dy) > Math.abs(ddx)) { drag.sw = 1; trick(dy < 0 ? "flip" : "grab"); return; }
      if (Math.abs(ddx) > 60 && Math.abs(ddx) > Math.abs(dy) * 1.5 && performance.now() - drag.t0 < 220) { drag.sw = 1; trick("spin"); } }
    if (!drag.sw && G.phase === "ride" && G.jump <= 0 && quick && dy < -40 && -dy > Math.abs(ddx) * 1.2) { drag.sw = 1; jump(); return; }
    if (G.phase === "sand" || G.phase === "swim" || G.phase === "ride") { G.x += dx * 1.15 / ZB * 1.2; G.vx = dx * 60; } });
  cv.addEventListener("pointerup", function (e) { if (drag && !drag.sw && drag.moved < 10 && performance.now() - drag.t0 < 280) { var p = local(e); if (Math.abs(p.y - drag.y0) < 20) jump(); } drag = null; });
  cv.addEventListener("pointercancel", function () { drag = null; });
  var keys = {};
  window.addEventListener("keydown", function (e) { if (!G.running) return; if (e.key === " " || e.key === "ArrowUp") { jump(); e.preventDefault(); return; }
    if (e.key === "t" || e.key === "T" || e.key === "ArrowDown") { trick(); e.preventDefault(); return; }
    var tk = { r: "spin", R: "spin", g: "grab", G: "grab", f: "flip", F: "flip", "1": "spin", "2": "grab", "3": "flip" }[e.key]; if (tk) { trick(tk); e.preventDefault(); return; } if (e.key === "ArrowLeft" || e.key === "ArrowRight") { keys[e.key] = 1; e.preventDefault(); } });
  window.addEventListener("keyup", function (e) { keys[e.key] = 0; });
  setInterval(function () { if (keys.ArrowLeft) G.vx = Math.max(-380, G.vx - 90); if (keys.ArrowRight) G.vx = Math.min(380, G.vx + 90); }, 50);
  $("nv-jump").addEventListener("pointerdown", function (e) { e.preventDefault(); e.stopPropagation(); jump(); buzz(8); });
  $("nv-trick").addEventListener("pointerdown", function (e) { e.preventDefault(); e.stopPropagation(); trick(); });
  if (MSW) MSW.button($("nv-mute").parentNode, "nv-songb", "pointer-events:auto;margin:6px 6px 0 0;float:right;border:0;border-radius:999px;padding:6px 10px;background:rgba(6,24,46,.55);color:#fff;font:600 12px/1.2 system-ui,-apple-system,sans-serif;cursor:pointer;white-space:nowrap;max-width:62vw;overflow:hidden;text-overflow:ellipsis");
  $("nv-mute").onclick = function () { audio(); if (AC && AC.state === "suspended") AC.resume(); setMute(!MUTED); }; setMute(MUTED);
  [].forEach.call(wrap.querySelectorAll(".nv-pick button"), function (b) { b.onclick = function () { start(b.getAttribute("data-s")); }; });

  /* ---------- points table under the game ---------- */
  (function () {
    var rows = [["raft_taco", "Island Tacos raft", "+100"], ["raft_mimosa", "Mimosa raft", "+120"], ["raft_burger", "Smash-N-Stack raft", "+150"], ["raft_shrimp", "Coconut Shrimp raft", "+150"],
      ["raft_oysters", "$2 Oysters raft", "+200"], ["", "🌟 Golden Poke Bowl (rare)", "+500"], ["", "🎣 Dodge a stray harpoon (paddle-out)", "+150"],
      ["", "🤿 Duck-dive under a wave (paddle-out)", "+100"], ["", "🌊 Every 3 s in the pocket", "+250 (and points while you're in it)"], ["", "🏄 Ride the barrel out the exit", "+200"], ["", "⬆ JUMP off the lip (anywhere on the clean face)", "big air"],
      ["", "🌀 360 / ✋ grab / 🤸 flip, landed clean (NICE!)", "+400 / +300 / +600 (×tricks for a combo)"], ["", "🔥 Clean landings back to back", "×1.25 … ×2"], ["", "✈️ Big air off the lip, no trick", "+65–140"], ["", "😮 Close call with a ray/jelly (paddle-out)", "+50"],
      ["", "🩹 Health kit (ride in, when you're hurt)", "+1 ❤️"],
      ["", "⭐ Ride in to Nalu Vida (clear a level)", "+1,500 × level"], ["", "🏆 Finish level 5", "+5,000"], ["plane", "Tap the Melody banner plane", "+500"], ["", "📺 Ride through Antidote's review billboard (secret)", "+500"], ["buoy", "Lifeguard rescue can", "+1 ❤️"],
      ["", "🌊 Touch the white foam (the only thing on the ride in that hurts)", "−½ ❤️ −100", 1], ["", "💥 Land mid-trick (a light bail)", "−150", 1], ["", "🌊 Engulfed by a wave (paddle-out)", "−½ ❤️", 1], ["", "🐟 Stingray (paddle-out)", "−❤️", 1],
      ["", "🎣 Hit by a fisherman's stray harpoon (paddle-out)", "−❤️", 1], ["jelly", "Bump a jellyfish", "−❤️", 1]];
    var st = document.createElement("style");
    st.textContent = ".nv-pts{max-width:430px;margin:14px auto 0;color:inherit}.nv-pts h4{margin:0 0 4px;font:900 18px 'Alfa Slab One',Georgia,serif}.nv-pts p{margin:0 0 8px;font-size:13px;opacity:.85}" +
      ".nv-pts .g{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.nv-pts .r{min-width:0;display:flex;align-items:center;gap:8px;padding:7px 9px;border-radius:12px;background:rgba(6,40,70,.08);border:1px solid rgba(6,60,100,.15);font-size:12.5px;line-height:1.2}" +
      ".nv-pts .r img,.nv-pts .r .e{width:38px;height:38px;flex:none;object-fit:contain;text-align:center;font-size:22px;line-height:38px}.nv-pts .r div.t{min-width:0;display:flex;flex-direction:column;gap:2px}.nv-pts .r b{color:#ff8a3d;font-weight:900}.nv-pts .r.bad b{color:#d33}";
    document.head.appendChild(st);
    var box = document.createElement("div"); box.className = "nv-pts";
    box.innerHTML = "<h4>What everything's worth</h4><p>5 levels. Each one: run in from the sand, paddle out through the break (duck-dive the waves), pop up and ride the wave back in to Nalu Vida. Level 1 is about 2 minutes; later levels have a shorter paddle-out. Paddling out, watch for stingrays and a fisherman's stray harpoons (sharks are rare out there). Riding back in it's just you and the wave: nothing else in the water. Only the white foam behind the curl can hurt you, so stay on the clean face, launch off the lip, throw tricks and land them. Health kits float by every now and then when you're hurt. A hit is a splash wipeout, and 5 hearts end the run. Grab 4 in a row without getting hit and every point doubles (×2); 8 in a row = ×3 and it keeps climbing. One hit resets the streak. Your score turns into Nalu Vida Rewards points: " + (function () { var g = (window.SSAI_REWARDS && window.SSAI_REWARDS.game) || {}; return "1 point per " + (g.perScore || 100) + " score, up to " + (g.dailyCap || 50) + " a day"; })() + ".</p><div class='g'>" +
      rows.map(function (r) { var em = r[1].match(/^(\S+)\s/); return "<div class='r" + (r[3] ? " bad" : "") + "'>" + (r[0] ? "<img src='img/game/" + r[0] + ".webp' alt='' loading='lazy'>" : "<div class='e'>" + (em ? em[1] : "") + "</div>") + "<div class='t'><span>" + (r[0] ? r[1] : r[1].replace(/^\S+\s/, "")) + "</span><b>" + r[2] + "</b></div></div>"; }).join("") + "</div>";
    mount.appendChild(box);
  })();

  /* ---------- 3D renderer (game3d.js: Three.js + GLB models in 3d/) ----------
     On by default (Settings → "3D graphics" turns it off, remembered on this phone). ?render=2d always forces 2D.
     The 3D layer draws the world (ocean, waves, sand, pier, surfer, sea life, splashes) on its own canvas under the 2D
     canvas, which keeps every label, ring, banner and the HUD. It drops back to the 2D renderer if WebGL / the module
     fails, or under ~40 fps for 5 s (test hook &keep3d=1 turns that off). Game logic never reads the 3D layer. */
  var RQ = QS.get("render"), KEEP3 = QS.get("keep3d") === "1", FPSM = { n: 0, acc: 0, low: 0, last: 0 }, gen3 = 0, PREF3 = false;
  PREF3 = true; try { PREF3 = localStorage.getItem("nalu-3d") !== "0"; } catch (e) {}   // 3D (realistic ocean) is the default; Settings can turn it off
  var API3 = { G: G, W: W, H: H, HC: HC, PIER_X: PIER_X, PIER_W: PIER_W, STUB: STUB, SHORE_X: SHORE_X, CAM: CAM, SHK: SHK, IM: IM, reduce: REDUCE, wrap: wrap,
    zoom: function () { return ZOOM; }, sy: sy, pierX: pierX, bossYw: bossYw, gore: function () { return GORE; }, speed: speed,
    audioOut: function () { return (typeof AC !== "undefined" && AC && FX) ? FX : null; } };   // engine3d ambience plays through the sound-effects bus (mute + Settings still rule)
  function off3D(why) {
    gen3++; var was = D3 || R3; D3 = false; try { if (R3) R3.dispose(); } catch (e) {} R3 = null;
    var c = $("nv-3d"); if (c) c.remove(); gl_c.style.display = ""; if (was || why) try { console.warn("[nv3d] 2D renderer: " + why); } catch (e) {}
  }
  function fpsWatch() {   // real frame rate (wall clock, not the capped game dt)
    var now = performance.now(); if (!D3 || !G.running || document.hidden) { FPSM.n = FPSM.acc = 0; FPSM.t = now; return; }
    FPSM.n++; FPSM.acc = (now - (FPSM.t || now)) / 1000; if (FPSM.acc < 1) return; FPSM.t = now;
    FPSM.last = FPSM.n / FPSM.acc; FPSM.n = FPSM.acc = 0; FPSM.low = FPSM.last < 40 ? FPSM.low + 1 : 0;
    if (window.__NVLIFE) { try { window.__NVLIFE.sample(FPSM.last); if (window.__E3Q && window.__E3Q.tier !== "low") FPSM.low = 0; } catch (e) {} }   // engine3d steps the quality tier down first; 2D only after LOW fails
    if (FPSM.low >= 5 && !KEEP3) off3D("slow (" + Math.round(FPSM.last) + " fps)");
  }
  function on3D() {
    if (D3 || $("nv-3d")) return; var my = ++gen3; FPSM.low = 0;
    var c = document.createElement("canvas"); c.id = "nv-3d"; c.setAttribute("aria-hidden", "true"); wrap.insertBefore(c, cv); API3.canvas = c;
    var boot = function (M) { if (my !== gen3) return; M.init(API3).then(function (r) { if (my !== gen3) { r.dispose(); return; } R3 = r; D3 = true; gl_c.style.display = "none"; }, function (e) { if (my === gen3) off3D("init: " + (e && e.message || e)); }); };
    if (window.NV3D) boot(window.NV3D);
    else { window.__NV3boot = boot; var s = document.createElement("script"); s.type = "module"; s.src = "game3d.js?v=e3n3"; s.onerror = function () { if (my === gen3) off3D("game3d.js failed to load"); }; document.head.appendChild(s); }
    setTimeout(function () { if (my === gen3 && !D3) off3D("3D took too long to load"); }, 25000);
  }
  if (RQ === "3d" || (RQ !== "2d" && PREF3)) on3D();
  window.__NV3 = { mode: function () { return D3 ? "3d" : "2d"; }, fps: function () { return Math.round(FPSM.last); }, r3ms: function () { return Math.round(FPSM.r3 || 0); }, off: function () { off3D("manual"); },
    // Settings switch: remembered per phone; takes effect right away
    pref: function (on) { if (on == null) return RQ === "3d" || (RQ !== "2d" && PREF3); PREF3 = !!on; try { localStorage.setItem("nalu-3d", on ? "1" : "0"); } catch (e) {} if (on && RQ !== "2d") on3D(); else off3D("switched off"); } };

  window.__NV = { zoom: function () { return ZOOM; }, radio: function (t, o) { radio(t, o); }, get: function () { return G; }, start: start, end: function () { if (G.running) showEnd(); }, W: W, H: H, PIER_X: PIER_X, fire: fire, boss: function () {},   /* boss fights removed (Christian, 2026-10) */ levelUp: function () { if (G.running) rideIn(false); }, jump: jump, trick: trick,
    gore: function () { return false; },   // red effects removed for good
    kit: function () { if (G.phase === "ride") healthKit(); }, wave: function () { return G.wv ? { px: G.wv.px, pd: G.wv.pd, rel: wvRel(), lip: G.lip, climb: G.climb, air: G.jump, pow: G.airPow, amp: G.airAmp } : null; },   // test hooks (ride leg)
    // the start menu's PLAY: show the surfer pick (character select) instead of the old full start screen
    rescue: function () { G.resc = 0; G.beer = null; G.rescPend = 1; return true; },   // test hook (?rescue=1): queue another throw
    rescueInfo: function () { return { spots: RESC_SPOTS.slice(), beer: G.beer ? { st: G.beer.st, x: G.beer.x, y: G.beer.y, tx: G.beer.tx, sx: G.beer.sx } : null, used: G.resc, pending: G.rescPend, hits: G.hitsRun, hearts: G.hearts, dmg: G.dmg, phase: G.phase }; },
    hit: DBG_RESC ? function (c) { G.inv = 0; G.jump = 0; return hurt("TEST HIT", c || "shark"); } : undefined,
    tutorial: function () { try { localStorage.removeItem("nalu-ride-tut"); } catch (e) {} rideTutorial(function () { if (G.running === false && !G.over && G.phase === "ride") { G.running = true; last = 0; } }); },
    pick: function () { var o = $("nv-start"); o.classList.add("nv-pickonly"); o.querySelector("h3").textContent = "Pick your surfer"; o.style.display = "flex"; } };
  requestAnimationFrame(frame);
})();
