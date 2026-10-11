/* Ride the Nalu — Nalu Vida's surf game.
   Route (from the real map): paddle out from the sand in front of Nalu Vida, ride up one side of the Venice
   Fishing Pier, loop around the round end, ride back down the other side to Nalu Vida. Every lap is faster.
   Scoring has no ceiling: grab food rafts, boat hand-offs and helicopter drink drops back to back to build a streak;
   every 4 in a row adds ×1 to the multiplier (×2, ×3, ×4 …). A hit resets it. Near misses and shooting the pier pay.
   Water = WebGL shader (falls back to a 2D gradient). Sprites live in img/game/*.webp; anything missing is drawn. */
(function () {
  "use strict";
  var mount = document.getElementById("nalu-game"); if (!mount) return;
  var W = 400, H = 640, HC = H / 2, LEAD = H * 0.22, LEG = 6200, PIER_X = 200, PIER_W = 38, END_R = 74, END_Y = LEG + 150;
  var PRIZES = window.NALU_PRIZES || [[9500, "$3 off any drink"], [18000, "Free Jungle Fries"], [32000, "Free Coconut Shrimp"], [55000, "Free Signature Taco plate"]];
  var QS = (function () { try { return new URLSearchParams(location.search); } catch (e) { return { get: function () { return null; } }; } })();
  var DBG_LVL = Math.max(1, Math.min(5, +QS.get("lvl") || 1)), DBG_BOSS = QS.get("boss") === "1", DBG_GOD = QS.get("god") === "1", DBG_SPD = Math.max(1, Math.min(8, +QS.get("spd") || 1));   // test hooks: ?lvl=5 &boss=1 &god=1
  /* ---------- levels: ~60 s each; level 3 ends with Big Manō, level 5 with Manō Nui ----------
     dur = riding seconds before the level clears (or before the boss shows up on a boss level) */
  var LV = [null,
    { dur: 60, spd: 1.00, haz: 1.00, shark: .34, lunge: 330, eel: 60, jel: 0, big: 0, rock: 0, harp: [18, 24], pack: 0, sub: "Grab the food · dodge the bites" },
    { dur: 60, spd: 1.07, haz: 1.25, shark: .40, lunge: 365, eel: 75, jel: .25, big: .16, rock: [10, 14], harp: [15, 21], pack: 0, sub: "Faster sharks · rocks · bigger waves" },
    { dur: 42, spd: 1.11, haz: 1.42, shark: .44, lunge: 395, eel: 88, jel: .35, big: .22, rock: [8, 11], harp: [12, 17], pack: 0, boss: 3, sub: "Something BIG is hunting out there…" },
    { dur: 60, spd: 1.16, haz: 1.65, shark: .48, lunge: 425, eel: 100, jel: .45, big: .3, rock: [7, 10], harp: [11, 15], pack: .25, sub: "Shark packs · closeout sets" },
    { dur: 36, spd: 1.20, haz: 1.85, shark: .50, lunge: 450, eel: 110, jel: .5, big: .34, rock: [6, 9], harp: [9, 13], pack: .35, boss: 5, sub: "Final ride · Manō Nui is waiting" }];
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
    ".nv-hearts{text-align:right;font-size:18px;letter-spacing:2px}.nv-leg{margin-top:6px;font-size:11.5px;opacity:.95}" +
    "#nv-jump{position:absolute;right:12px;bottom:26px;width:78px;height:78px;border-radius:50%;border:3px solid rgba(255,255,255,.55);background:rgba(6,24,46,.55);color:#fff;font:900 15px system-ui;letter-spacing:.06em;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;display:none;z-index:3}" +
    "#nv-jump.on{display:block}#nv-jump.ready{background:radial-gradient(circle,#7fe3f2,#1673c4);border-color:#fff;box-shadow:0 0 0 0 rgba(127,227,242,.8);animation:nvj .8s infinite}#nv-jump:active{transform:scale(.94)}" +
    "@keyframes nvj{0%{box-shadow:0 0 0 0 rgba(127,227,242,.8)}100%{box-shadow:0 0 0 18px rgba(127,227,242,0)}}" +
    "#nv-fire{position:absolute;right:98px;bottom:30px;width:66px;height:66px;border-radius:50%;border:3px solid #fff;background:radial-gradient(circle at 40% 35%,#ffb15e,#e2452b 70%);color:#fff;font:900 13px/1.05 system-ui;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;display:none;z-index:3;box-shadow:0 4px 14px rgba(0,0,0,.35);text-shadow:0 1px 3px rgba(0,0,0,.5)}" +
    "#nv-fire.on{display:block}#nv-fire:active{transform:scale(.93)}#nv-fire b{display:block;font-size:20px}" +
    ".nv-pickonly .nv-how,.nv-pickonly>p{display:none}" +
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
    ".nv-toast{position:absolute;left:12px;right:12px;bottom:26px;display:flex;gap:10px;align-items:center;padding:8px 10px;border-radius:14px;background:rgba(6,24,46,.82);color:#fff;font:800 14px system-ui;transform:translateY(140%);opacity:0;visibility:hidden;transition:transform .35s,opacity .35s,visibility .35s;pointer-events:none}" +
    ".nv-toast.on{transform:none;opacity:1;visibility:visible}.nv-toast img{width:54px;height:54px;object-fit:contain;flex:none}" +
    "#nv-end{justify-content:flex-start;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;touch-action:pan-y}#nv-end>:first-child{margin-top:auto}#nv-end>.nv-board{margin-bottom:auto}";
  document.head.appendChild(css);
  mount.innerHTML =
    '<div class="nv-wrap gamebox" data-game>' +
    '<canvas id="nv-water"></canvas><canvas id="cv" data-game></canvas>' +
    '<div class="nv-hud"><div><div class="nv-score" id="nv-score">0</div><span class="nv-mult" id="nv-mult">×1</span><div class="nv-leg" id="nv-leg"></div></div><div><div class="nv-hearts" id="nv-hearts"></div><div class="nv-leg" id="nv-lap"></div><button type="button" id="nv-mute" aria-label="Sound on or off" style="pointer-events:auto;margin-top:6px;float:right;border:0;border-radius:999px;padding:5px 9px;background:rgba(6,24,46,.55);color:#fff;font-size:15px;cursor:pointer">🔊</button></div></div>' +
    '<div class="nv-bar"><i id="nv-prog" style="width:0"></i></div>' +
    '<button type="button" id="nv-jump" aria-label="Jump">JUMP</button>' +
    '<button type="button" id="nv-fire" aria-label="Fire harpoon"><b>🔱</b>×0</button>' +
    '<div class="nv-toast" id="nv-toast"><img id="nv-toast-img" alt=""><span id="nv-toast-t"></span></div>' +
    '<div class="nv-ov" id="nv-start"><h3>Ride the Nalu</h3><p>Surf the Venice Pier loop. Grab the food, dodge the bites, and win free food &amp; drinks at Nalu Vida.</p>' +
    '<div class="nv-pick"><button type="button" data-s="f"><img src="img/game/surfer_f.webp" alt="" onerror="this.outerHTML=\'<div class=ph style=font-size:64px;line-height:96px>🏄‍♀️</div>\'">She rides</button>' +
    '<button type="button" data-s="m"><img src="img/game/surfer_m.webp" alt="" onerror="this.outerHTML=\'<div class=ph style=font-size:64px;line-height:96px>🏄‍♂️</div>\'">He rides</button></div>' +
    '<p class="nv-how">Drag to steer · <b>Catch a wave, then tap to jump</b> over the pier (hit the pier without a wave: −1 ❤️, −200) · 5 hearts · Grab food rafts, boat hand-offs and helicopter drops · 4 in a row = ×2, 8 = ×3, and it keeps going · Dodge sharks, eels &amp; jellyfish · Shoot the pier for a bonus · <b>5 levels</b> · Catch 🔱 harpoons and fire them at sharks · Lure the boss sharks into the rocks · Tap the banner plane 👀</p><p class="nv-how" id="nv-best"></p></div>' +
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
    "drop", "buoy", "shore", "pier", "pierend", "lifeguard_f", "lifeguard_m", "staff", "palm", "storefront", "wave", "splash", "fish_gold", "fish_mahi", "fish_parrot", "raft_fries", "skeleton"].forEach(function (k) { var i = new Image(); i.decoding = "async"; i.src = "img/game/" + k + ".webp"; IM[k] = i; });
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
  try { MUTED = localStorage.getItem("nalu-mute") === "1"; SFX_ON = localStorage.getItem("nalu-sfx") !== "0"; MUSIC_ON = localStorage.getItem("nalu-music") !== "0"; } catch (e) {}
  function audio() {
    if (AC) return AC;
    try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    MASTER = AC.createGain(); MASTER.gain.value = MUTED ? 0 : 0.8; MASTER.connect(AC.destination);
    FX = AC.createGain(); FX.gain.value = SFX_ON ? 1 : 0; FX.connect(MASTER);
    try {   // the song is streamed through WebAudio so its volume works on iPhone (HTMLAudio volume is read-only there)
      MUS = new Audio(); MUS.src = "audio/cheat-code.m4a"; MUS.loop = true; MUS.preload = "auto"; MUS.setAttribute("playsinline", "");
      MUSG = AC.createGain(); MUSG.gain.value = MUSIC_VOL * (MUSIC_ON ? 1 : 0); AC.createMediaElementSource(MUS).connect(MUSG); MUSG.connect(MASTER);
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
  function musicSync() { if (!MUS) return; if (MUSIC_ON && !MUTED && G && (G.running || G.over)) { var p = MUS.play(); if (p && p.catch) p.catch(function () {}); } else MUS.pause(); }
  // shared start-menu hook (../gamemenu.js): music(false) only silences the song; nothing here creates audio before a tap
  window.GAME_AUDIO = { music: function (on) { setMusic(on); }, sfx: function (on) { setSfx(on); },
    state: function () { return { hasMusic: true, hasSfx: true, music: MUSIC_ON, sfx: SFX_ON, muted: MUTED, unlocked: !!AC }; } };

  /* ---------- state ---------- */
  var G = { running: false, over: false, score: 0, best: 0, lap: 1, dir: 1, phase: "ride", hearts: 3, streak: 0, mult: 1, lastGain: 0, hurt: 0, inv: 0, shake: 0,
    x: 140, yw: 0, vx: 0, ang: 0, cam: 0, lead: LEAD, t: 0, ents: [], fx: [], wake: [], gulls: [], spawn: {}, turn: null, surfer: "f", runId: 0, underPier: 0, pierSide: 0,
    level: 1, lvT: 0, ammo: 0, fcd: 0, harps: [], blobs: [], boss: null, banner: null, conf: [], wo: 0, won: 0 };
  try { G.best = +localStorage.getItem("nalu-best") || 0; } catch (e) {}
  $("nv-best").textContent = G.best ? "Your best: " + G.best.toLocaleString() : "";
  function buzz(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} }
  var sy = function (yw) { return HC - (yw - G.cam); };
  var ZOOM = 1.35, CAM = { x: 200, y: 400 };   // the 2D layer and the water shader both zoom around the surfer
  function camUpdate() { var tx = G.x, ty = sy(G.yw); CAM.x += (tx - CAM.x) * .12; CAM.y += (ty - CAM.y) * .2; }
  function toWorld(px, py) { return { x: CAM.x + (px - CAM.x) / ZOOM, y: CAM.y + (py - CAM.y) / ZOOM }; }

  function reset() {
    G.score = 0; G.lap = 1; G.dir = 1; G.phase = "ride"; G.hearts = 5; G.streak = 0; G.mult = 1; G.hurt = 0; G.inv = 1.2; G.shake = 0;
    G.x = 120; G.yw = END_Y - 420; G.vx = 0; G.ang = Math.PI; G.dir = -1; G.lead = -LEAD; G.cam = G.yw + G.lead; G.phase = "intro"; G.introT = 0; G.ents = []; G.fx = []; G.wake = []; G.turn = null; G.underPier = 0;
    G.spawn = { food: 1.2, haz: 2.5, boat: 9, heli: 16, plane: 26, buoy: 40, swell: 3 }; G.runId++; G.posted = 0; G.planeTapped = 0; G.lastGain = G.t;
    G.pierSide = G.x < PIER_X ? -1 : 1; G.staffToss = 2.2; G.jump = 0; G.jumpDur = 0; G.jcd = 0; G.hint = 6; G.wave = 0;
    G.level = DBG_LVL; G.lvT = DBG_BOSS && LV[G.level].boss ? LV[G.level].dur - 3 : 0; G.ammo = G.level > 1 ? 3 : 0; G.fcd = 0; G.harps = []; G.blobs = []; G.boss = null; G.bossBeat = 0;
    G.banner = null; G.conf = []; G.wo = 0; G.won = 0; G.winT = 0; G.finaleMsg = ""; G.spawn.harp = G.level > 1 ? 6 : 14; G.spawn.rock = 5; G.spawn.ski = 9; G.harpHint = 0;
    G.eggT = 0; if (window.ReviewEgg) ReviewEgg.reset(20, 40);
    if (window.Halftime) Halftime.reset();   // halftime: Antidote's Nalu Vida review reel, once a run, at a level-up after ~90 s   // Antidote's review billboard buoy: once a run, 20-40 s of riding in
  }
  function L() { return LV[G.level] || LV[5]; }
  function speed() { return (150 + 22 * (G.lap - 1)) * L().spd * (G.boss ? .8 : 1) * (G.phase === "ride" || G.phase === "victory" ? 1 : 0); }

  /* ---------- spawning ---------- */
  var FOOD = [["raft_taco", "Island Tacos", 100], ["raft_burger", "Smash-N-Stack", 150], ["raft_shrimp", "Coconut Shrimp", 150], ["raft_oysters", "$2 Oysters", 200], ["raft_mimosa", "Mimosa", 120], ["raft_fries", "Jungle Fries", 120]];
  function ahead(d) { return G.yw + G.dir * d; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[(Math.random() * a.length) | 0]; }
  function laneX() { var x = rnd(30, W - 30); if (Math.abs(x - PIER_X) < PIER_W / 2 + 16) x += (x < PIER_X ? -1 : 1) * (PIER_W / 2 + 18); return x; }
  function add(o) { G.ents.push(o); return o; }
  function food(x, yw, extra) { var f = pick(FOOD); if (Math.random() < 0.06) f = ["raft_burger", "Golden Poke Bowl", 500, 1]; return add(Object.assign({ t: "food", k: f[0], name: f[1], pts: f[2], gold: f[3], x: x, yw: yw, r: 22, bob: Math.random() * 6 }, extra || {})); }
  function hazard() {
    var lv = G.lap, P = L(), r = Math.random(), x = laneX(), y = ahead(H * 0.75), sh = G.boss ? 0 : P.shark;
    if (r < sh) { add({ t: "shark", x: x, yw: y, r: 20, st: "fin", vx: 0, vy: 0, lunge: 0, hp: G.level >= 4 ? 3 : 2 }); radioOnce("shark", "🦈 Warning — shark incoming!", { tone: "warn" });
      if (Math.random() < P.pack) add({ t: "shark", x: x < W / 2 ? x + rnd(90, 140) : x - rnd(90, 140), yw: y + G.dir * rnd(60, 120), r: 20, st: "fin", vx: 0, vy: 0, lunge: 0, hp: 2 }); }
    else if (r < sh + (1 - sh) * .45 && (radioOnce("eel", "Eels in the water, stay sharp!", { tone: "warn" }), 1)) add({ t: "eel", x: Math.random() < .5 ? -40 : W + 40, yw: y, r: 18, ph: Math.random() * 6, sp: (P.eel + 15 * (lv - 1)) * (Math.random() < .5 ? 1 : -1), base: y });
    else { add({ t: "jelly", x: x, yw: y, r: 17, ph: Math.random() * 6 }); radioOnce("jelly", "Jellyfish ahead!", { tone: "warn" }); }
    if (Math.random() < 0.12 * (lv - 1) + P.jel) add({ t: "jelly", x: laneX(), yw: y + G.dir * 90, r: 17, ph: 0 });
  }
  function boat() { radioOnce("help", "Help's on the way! Grab the boat toss.", { tone: "info" }); var fromL = Math.random() < .5; add({ t: "boat", x: fromL ? -70 : W + 70, yw: ahead(H * 0.42), vx: fromL ? 95 : -95, r: 34, toss: 0.6 }); }
  function heli() { radioOnce("help", "Help's on the way! Chopper drop incoming.", { tone: "info" }); var fromL = Math.random() < .5; add({ t: "heli", x: fromL ? -60 : W + 60, yw: ahead(H * 0.3), vx: fromL ? 110 : -110, drops: 3, dt: 0.7, sky: 1 }); }
  function plane() { var fromR = Math.random() < .5; add({ t: "plane", x: fromR ? W + 60 : -330, y: rnd(70, 150), vx: fromR ? -70 : 70, sky: 1, scr: 1 }); }
  // from level 2 some swells are bigger and close out: a breaking whitewater section you must steer around (or be airborne over)
  function swell() { var e = add({ t: "swell", yw: ahead(H * 0.8), x: W / 2, r: 0, hit: 0 });
    if (Math.random() < L().big) { var w = rnd(150, 210), c0 = Math.random() < .5 ? rnd(-20, 40) : rnd(W - w - 40, W - w + 20); if (G.x > c0 && G.x < c0 + w && Math.random() < .5) c0 = G.x < W / 2 ? G.x + 60 : G.x - 60 - w; e.big = 1; e.c0 = c0; e.c1 = c0 + w; } }
  // rocks: single boulder clusters, or a jetty (a short breakwater) sticking out from one side. Boss sharks smash into them.
  function rock(x, yw, r, jet) { var bs = [], n = 3 + (Math.random() * 2 | 0);
    for (var i = 0; i < n; i++) { var br = r * (i ? rnd(.42, .62) : rnd(.62, .78)), a = i * 2.4 + rnd(-.4, .4), d = i ? r * rnd(.35, .6) : 0, pts = [];
      for (var k = 0; k < 9; k++) pts.push(br * rnd(.78, 1.08)); bs.push({ dx: Math.cos(a) * d, dy: Math.sin(a) * d * .8, r: br, pts: pts, sh: rnd(-.08, .08) }); }
    return add({ t: "rock", x: x, yw: yw, r: r, bs: bs, jet: jet, ph: Math.random() * 6 }); }
  function rockSpot() { var x; do { x = rnd(34, W - 34); } while (Math.abs(x - PIER_X) < 62); return x; }
  function rocks() {
    var y = ahead(H * 0.78);
    if (G.level >= 3 && Math.random() < .3) { var left = Math.random() < .5, n = 4 + (Math.random() * 2 | 0); for (var i = 0; i < n; i++) rock(left ? 14 + i * 27 : W - 14 - i * 27, y + rnd(-6, 6), rnd(17, 22), 1); }
    else rock(rockSpot(), y, rnd(22, 30)); }
  function harpPick(x, yw) { return add({ t: "harpoon", x: x, yw: yw, r: 20, bob: Math.random() * 6 }); }
  // lifeguard on a rescue jet ski: crosses the screen and tosses you a harpoon bundle
  function ski() { var fromL = G.x > W / 2; add({ t: "ski", x: fromL ? -50 : W + 50, yw: ahead(rnd(150, 230)), vx: fromL ? 160 : -160, tossed: 0, sky: 0 }); }
  function gull() { var fromL = Math.random() < .5; G.gulls.push({ x: fromL ? -30 : W + 30, y: rnd(40, H - 60), vx: (fromL ? 1 : -1) * rnd(60, 110), vy: rnd(-12, 12), f: Math.random() * 6 }); }

  /* ---------- scoring ---------- */
  function pop(x, y, txt, col, big) { G.fx.push({ k: "txt", x: x, y: y, t: 0, txt: txt, col: col || "#fff", big: big }); }
  function gain(base, x, y, label) {
    if (G.t - G.lastGain > 4) G.streak = 0;
    G.streak++; G.lastGain = G.t;
    var m = 1 + Math.floor(G.streak / 4);
    if (m > G.mult) { G.mult = m; milestone(m); }
    G.mult = m; var pts = base * G.mult; G.score += pts;
    pop(x, y, "+" + pts.toLocaleString() + (label ? " " + label : ""), G.mult > 1 ? "#ffd23f" : "#fff"); sfx(label === "AIR!" ? "air" : "grab");
  }
  function milestone(m) {
    var el = $("nv-mult"); el.animate && el.animate([{ transform: "scale(1.6)" }, { transform: "scale(1)" }], { duration: 380 });
    pop(W / 2, H * 0.38, "STREAK ×" + m + "!", "#ffd23f", 1); buzz(30); sfx("streak");
    if (RA) { if (m === 2 || m % 2 === 1) radio(pick(["Nice ride! ×" + m, "You're on fire! ×" + m, "Keep it going! ×" + m]), { tone: "info", ms: 2200 }); }
    else if (m === 2 || m % 2 === 1) toast(Math.random() < .5 ? "lifeguard_f" : "lifeguard_m", pick(["Nice ride! ×" + m, "You're on fire! ×" + m, "Keep it going! ×" + m, "Lifeguards are watching 👀 ×" + m]));
  }
  var tt = 0;
  function toast(img, t) { var e = $("nv-toast"), i = $("nv-toast-img"); if (ok(IM[img])) { i.src = IM[img].src; i.style.display = ""; } else i.style.display = "none"; $("nv-toast-t").textContent = t; e.classList.add("on"); clearTimeout(tt); tt = setTimeout(function () { e.classList.remove("on"); }, 1800); }
  function hurt(why) {
    if (G.inv > 0 || G.phase !== "ride" || G.jump > 0.06) return;
    if (DBG_GOD) { G.inv = 1; G.streak = 0; G.mult = 1; pop(G.x, sy(G.yw) - 30, why, "#ff6b6b"); return; }
    var cause = /SHARK/.test(why) ? "shark" : /ZAP/.test(why) ? "eel" : "wave";
    G.hearts--; G.inv = 1.6; G.hurt = 0.35; G.shake = 10; G.streak = 0; G.mult = 1; buzz([60, 40, 90]);
    pop(G.x, sy(G.yw) - 30, why, "#ff6b6b", 1); sfx(cause === "shark" ? "bite" : cause === "eel" ? "zap" : "hit");
    if (G.hearts <= 0) { die(cause); return; }
    G.wipe = .9; G.fx.push({ k: "washover", x: G.x, y: sy(G.yw), t: 0 });          // wipeout: the wave rolls over you
  }
  function die(cause) {
    G.boss = null; G.blobs = []; G.harps = []; G.phase = "death"; G.deathT = 0; G.deathCause = cause; G.deathX = G.x; G.deathYw = G.yw; G.jump = 0; G.wipe = 0;
    G.shake = cause === "eel" ? 18 : 12; buzz(cause === "eel" ? [80, 40, 80, 40, 200] : [140, 60, 220]); sfx("over");
    radio("Out of the water! Come grab a bite and try again.", { tone: "warn", ms: 3400, pri: 2 });
    if (cause === "shark") add({ t: "shark", x: G.x - 70, yw: G.yw + G.dir * 50, r: 0, st: "lunge", vx: 260, vy: -G.dir * 120, lunge: 0, dead: 1 });
    G.finaleMsg = cause === "shark" ? "🦈 The lifeguards pulled you out" : cause === "eel" ? "⚡ The lifeguards revived you" : "🌊 The Nalu Vida crew pulled you in";
  }
  function deathStep(dt) {
    G.deathT += dt; if (G.deathCause === "eel") G.shake = Math.max(G.shake, 9 * Math.max(0, 1 - G.deathT / 2.4));
    G.ents.forEach(function (e) { if (e.dead) { e.x += e.vx * dt; e.yw += e.vy * dt; } });
    G.cam += (G.yw + G.lead - G.cam) * Math.min(1, dt * 3); tickEnts(dt);
    if (G.deathT > 2.9) end();
  }

  /* ---------- update ---------- */
  function update(dt) {
    G.t += dt; if (G.inv > 0) G.inv -= dt; if (G.hurt > 0) G.hurt -= dt; if (G.shake > 0) G.shake *= 0.86;
    if (G.phase === "intro") return introStep(dt);
    if (G.fcd > 0) G.fcd -= dt; if (G.banner) { G.banner.t += dt; if (G.banner.t > G.banner.dur) G.banner = null; }
    if (G.phase === "finale") return finaleStep(dt);
    if (G.phase === "victory") return victoryStep(dt);
    if (G.phase === "death") return deathStep(dt);
    if (G.wipe > 0) G.wipe -= dt;
    if (G.phase === "turn") return turnStep(dt);
    if (G.phase === "shore") return shoreStep(dt);
    var v = speed();
    G.yw += G.dir * v * dt; G.eggT += dt;
    if (G.boss) { if (G.dir > 0 ? G.yw > END_Y - 1100 : G.yw < 1100) wrapWorld(-G.dir * 2400); }   // boss fights never run out of pier
    else { G.lvT += dt; var P = L(); if (G.lvT >= P.dur) { if (P.boss && !G.bossBeat) bossStart(P.boss); else if (!P.boss) levelUp(); } }
    if (SURF && AC) { var nearP = G.yw > 0 && G.yw < END_Y ? Math.max(0, 1 - Math.abs(G.x - PIER_X) / 170) : 0; SURF.gain.setTargetAtTime(.15 + .14 * nearP, AC.currentTime, .3); }   // surf is louder under the pier
    if (MUSG && AC && MUSIC_ON) MUSG.gain.setTargetAtTime(G.boss ? MUSIC_VOL * .6 : MUSIC_VOL, AC.currentTime, .5);
    if (G.hint > 0) G.hint -= dt; if (G.jcd > 0) G.jcd -= dt; if (G.wave > 0) G.wave -= dt;
    if (G.jump > 0) { G.jump -= dt; if (G.jump <= 0) { G.jump = 0; land(); } }
    // steering
    G.x += G.vx * dt; G.vx *= Math.pow(0.0009, dt); G.x = Math.max(16, Math.min(W - 16, G.x));
    G.ang += ((G.dir > 0 ? 0 : Math.PI) + Math.max(-0.5, Math.min(0.5, G.vx / 420)) * G.dir - G.ang) * Math.min(1, dt * 8);
    G.lead += (LEAD * G.dir - G.lead) * Math.min(1, dt * 2.5);
    G.cam = G.yw + G.lead;
    G.score += Math.round(v * dt * 0.05 * G.mult * 100) / 100;
    // wake
    if (Math.random() < 0.9) G.wake.push({ x: G.x + rnd(-4, 4), yw: G.yw - G.dir * 18, t: 0, s: rnd(3, 6) });
    // pier: pilings every 80 world px, shooting the pier = crossing under without touching one
    var onPier = G.yw > -40 && G.yw < END_Y - END_R, bigAir = G.jump > 0 && G.jumpDur > .6;
    if (onPier && !bigAir && Math.abs(G.x - PIER_X) < PIER_W / 2 + 12) {          // ran into the pier
      var back = G.pierSide || (G.x < PIER_X ? -1 : 1); G.x = PIER_X + back * (PIER_W / 2 + 16); G.vx = back * 260;
      if (G.inv <= 0) { G.score = Math.max(0, G.score - 200); hurt("Hit the pier! −200"); G.fx.push({ k: "wsplash", x: G.x, y: sy(G.yw), t: 0 }); }
    } else if (G.jump <= 0) G.pierSide = G.x < PIER_X ? -1 : 1;
    // spawns
    var S = G.spawn, lv = G.lap, nearEnd = G.dir > 0 ? G.yw > LEG - 500 : G.yw < 500;
    S.food -= dt; S.fish = (S.fish == null ? 9 : S.fish) - dt; S.haz -= dt; S.boat -= dt; S.heli -= dt; S.plane -= dt; S.buoy -= dt; S.swell -= dt;
    if (!nearEnd) {
      if (S.food <= 0) { food(laneX(), ahead(H * 0.75)); if (Math.random() < .2) food(laneX(), ahead(H * 0.75 + 90)); S.food = rnd(2.0, 3.2) / (1 + 0.06 * lv); }
      if (S.fish <= 0) { var fk = Math.random() < .2 ? "fish_gold" : Math.random() < .5 ? "fish_mahi" : "fish_parrot"; add({ t: "fish", k: fk, x: laneX(), yw: ahead(H * 0.7), r: 20, ph: Math.random() * 1.4, pts: fk === "fish_gold" ? 800 : 300 }); S.fish = rnd(8, 13); }
      if (S.haz <= 0) { hazard(); S.haz = rnd(1.5, 2.4) / (1 + 0.14 * (lv - 1)) / L().haz * (G.boss ? 2.2 : 1); }
      if (S.boat <= 0) { boat(); S.boat = rnd(11, 16); }
      if (S.heli <= 0) { heli(); S.heli = rnd(18, 26); }
      if (S.buoy <= 0 && G.hearts < 4) { add({ t: "buoy", x: laneX(), yw: ahead(H * 0.75), r: 16 }); S.buoy = rnd(35, 50); }
      if (S.swell <= 0) { swell(); S.swell = rnd(2.2, 3.6); }
      var P2 = L(); S.harp -= dt; S.rock -= dt; S.ski -= dt;
      if (S.harp <= 0) { harpPick(laneX(), ahead(H * 0.75)); S.harp = G.boss ? rnd(5, 7) : rnd(P2.harp[0], P2.harp[1]); }
      if (S.rock <= 0 && (P2.rock || G.boss)) { rocks(); S.rock = G.boss ? rnd(2.4, 3.4) : rnd(P2.rock[0], P2.rock[1]); }
      if (S.ski <= 0 && (G.boss || G.level >= 3)) { ski(); S.ski = G.boss ? rnd(8, 11) : rnd(22, 30); }
      if (!G.boss && window.ReviewEgg && ReviewEgg.due(G.eggT * 1000)) add({ t: "rsign", x: Math.max(70, Math.min(W - 70, laneX())), yw: ahead(H * 0.75), r: 30, bob: Math.random() * 6 });
    }
    if (S.plane <= 0) { plane(); S.plane = rnd(40, 55); }
    if (Math.random() < dt * 0.35 && G.gulls.length < 5) gull();
    // entities
    var py = sy(G.yw);
    for (var i = G.ents.length - 1; i >= 0; i--) {
      var e = G.ents[i], ey;
      if (e.t === "shark") {
        var dy = (e.yw - G.yw) * G.dir;
        if (e.st === "fin" && dy < 190 && dy > 0) { e.st = "warn"; e.wt = 0.55; buzz(15); }
        if (e.fl > 0) e.fl -= dt;
        if (e.st === "warn") { e.wt -= dt; if (e.wt <= 0) { e.st = "lunge"; sfx("lunge"); var ls = L().lunge + 20 * (G.lap - 1), ax = G.x - e.x, ay = G.yw - e.yw, l = Math.hypot(ax, ay) || 1; e.vx = ax / l * ls; e.vy = ay / l * ls; } }
        if (e.st === "flee") { e.x += e.vx * dt; e.yw += e.vy * dt; e.ft += dt; if (e.ft > 1.3) { G.ents.splice(i, 1); continue; } }
        if (e.st === "lunge") { e.x += e.vx * dt; e.yw += e.vy * dt; e.lunge += dt; if (e.lunge > 0.9) e.st = "gone"; }
        else if (e.st === "gone") { e.yw += e.vy * dt * .5; e.x += e.vx * dt * .5; }
      } else if (e.t === "eel") { e.x += e.sp * dt; e.ph += dt; e.yw = e.base + Math.sin(e.ph * 2.2) * 26; e.zap = Math.sin(e.ph * 4.2) > 0.25; }
      else if (e.t === "jelly") { e.ph += dt; e.x += Math.sin(e.ph * .8) * 12 * dt; }
      else if (e.t === "boat") { e.x += e.vx * dt; e.toss -= dt; if (e.toss <= 0 && e.x > 20 && e.x < W - 20) { e.toss = 0.75; var hp0 = !e.gave && G.level >= 2 && Math.random() < (G.boss ? .6 : .18); if (hp0) e.gave = 1; tossTo(e.x, e.yw, laneX(), ahead(rnd(120, 230)), "boat", hp0 ? "harpoon" : 0); } }
      else if (e.t === "ski") { e.x += e.vx * dt; if (!e.tossed && Math.abs(e.x - G.x) < 90) { e.tossed = 1; tossTo(e.x, e.yw, Math.max(30, Math.min(W - 30, G.x + rnd(-40, 40))), ahead(rnd(130, 190)), "ski", "harpoon"); toast(Math.random() < .5 ? "lifeguard_m" : "lifeguard_f", "Catch! 🔱 Harpoons incoming"); } }
      else if (e.t === "rock") { e.ph += dt; }
      else if (e.t === "heli") { e.x += e.vx * dt; e.dt -= dt; if (e.drops > 0 && e.dt <= 0 && e.x > 30 && e.x < W - 30) { e.drops--; e.dt = 0.8; var tx = Math.max(30, Math.min(W - 30, G.x + rnd(-110, 110))); add({ t: "drop", x: tx, yw: ahead(rnd(150, 260)), r: 20, air: 1.4, pts: 250 }); } }
      else if (e.t === "plane") { e.x += e.vx * dt; }
      else if (e.t === "toss") { e.f += dt / e.dur; if (e.f >= 1) { landToss(e); G.ents.splice(i, 1); continue; } }
      else if (e.t === "drop") { e.air -= dt; }
      else if (e.t === "fish") { e.ph += dt; var lp = e.ph % 1.6; e.air = lp > .9 ? (lp - .9) / .7 : 0; if (e.air && !e.sp0) { e.sp0 = 1; G.fx.push({ k: "spray", x: e.x, y: sy(e.yw), t: 0 }); } if (!e.air) e.sp0 = 0; }
      // collisions
      if (!e.sky && e.t !== "toss" && e.t !== "swell") {
        var d = Math.hypot(e.x - G.x, (e.yw - G.yw)), hitR = e.r + 14;
        if (e.t === "fish" && e.air > 0 && d < hitR + 14) { gain(e.pts, e.x, sy(e.yw) - 20, e.k === "fish_gold" ? "GOLDEN DORADO!" : e.k === "fish_mahi" ? "MAHI-MAHI!" : "PARROTFISH!"); buzz(15); G.fx.push({ k: "wsplash", x: e.x, y: sy(e.yw), t: 0 }); G.ents.splice(i, 1); continue; }
        if (e.t === "food" && d < hitR + 6) { gain(e.pts, e.x, sy(e.yw), e.gold ? "GOLDEN!" : ""); buzz(10); G.fx.push({ k: "ring", x: e.x, y: sy(e.yw), t: 0 }); G.ents.splice(i, 1); continue; }
        if (e.t === "drop" && e.air <= 0.25 && d < hitR + 8) { gain(e.pts, e.x, sy(e.yw), "DRINK DROP!"); buzz(12); G.ents.splice(i, 1); continue; }
        if (e.t === "harpoon" && d < hitR + 8) { var first = !G.harpHint; G.ammo = Math.min(9, G.ammo + 3); G.harpHint = 1; pop(e.x, sy(e.yw) - 10, "+3 HARPOONS 🔱", "#ffb15e", 1); sfx("grab"); buzz(15); G.fx.push({ k: "ring", x: e.x, y: sy(e.yw), t: 0 });
          if (first) toast("lifeguard_m", "Harpoons! Tap 🔱 FIRE to hit sharks"); G.ents.splice(i, 1); continue; }
        if (e.t === "rock") { if (d < e.r + 12 && G.jump <= .06) { var sd = G.x >= e.x ? 1 : -1; G.x = e.x + sd * (e.r + 14); G.vx = sd * 280; if (G.inv <= 0) { hurt("Hit the rocks!"); G.fx.push({ k: "wsplash", x: G.x, y: py, t: 0 }); } } continue; }
        if (e.t === "rsign" && d < e.r + 24) { var eb = ReviewEgg.collect(); G.score += eb; pop(e.x, sy(e.yw) - 40, "+" + eb + " 📺 ANTIDOTE'S REVIEW", "#ffd23f", 1); sfx("egg"); buzz([20, 40, 20]); G.fx.push({ k: "ring", x: e.x, y: sy(e.yw), t: 0 }); G.fx.push({ k: "wsplash", x: e.x, y: sy(e.yw), t: 0 }); G.ents.splice(i, 1); continue; }
        if (e.t === "buoy" && d < hitR + 6) { G.hearts = Math.min(6, G.hearts + 1); pop(e.x, sy(e.yw), "+1 ❤️ Lifeguard save!", "#ff9db0", 1); toast("lifeguard_f", "Rescue can! +1 heart"); G.ents.splice(i, 1); continue; }
        var danger = e.t === "jelly" || (e.t === "eel" && e.zap) || (e.t === "shark" && e.st === "lunge") || e.t === "boat";
        if (danger && d < hitR) { hurt(e.t === "shark" ? "SHARK BITE!" : e.t === "eel" ? "⚡ ZAPPED!" : e.t === "jelly" ? "Jellyfish sting!" : "Boat wake!"); if (e.t === "shark") e.st = "gone"; continue; }
        if ((e.t === "jelly" || e.t === "eel" || e.t === "shark") && !e.nm && d < hitR + 26 && d >= hitR && (e.t !== "shark" || e.st === "lunge")) { e.nm = 1; gain(50, G.x, py - 40, "close one!"); }
      }
      if (e.t === "swell" && !e.snd && (e.yw - G.yw) * G.dir < 260) { e.snd = 1; sfx("wbreak"); }
      if (e.t === "swell" && !e.hit && e.big && Math.abs(e.yw - G.yw) < 12 && G.x > e.c0 && G.x < e.c1 && G.jump <= .06) { e.hit = 1; G.fx.push({ k: "wsplash", x: G.x, y: py, t: 0 }); hurt("Closeout wave!"); }
      if (e.t === "swell" && !e.hit && Math.abs(e.yw - G.yw) < 10) { e.hit = 1; G.wave = 2.0; jump(false); sfx("splash"); G.fx.push({ k: "wsplash", x: G.x, y: sy(G.yw), t: 0 }); pop(G.x, sy(G.yw) - 54, "WAVE! TAP TO JUMP", "#7fe3f2"); if (Math.abs(G.vx) > 120) { gain(150, G.x, py - 36, "AIR!"); G.fx.push({ k: "spray", x: G.x, y: py, t: 0 }); } }
      ey = e.scr ? e.y : sy(e.yw);
      if (e.t === "plane" ? (e.x < -360 || e.x > W + 360) : (ey < -260 || ey > H + 260 || e.x < -120 || e.x > W + 120)) G.ents.splice(i, 1);
    }
    harpStep(dt); if (G.boss) bossStep(dt); blobStep(dt);
    if (G.phase !== "ride") return;     // died, or the final boss is down
    if (G.gulls.length && Math.random() < dt * 0.45) gullCall();
    if (HELI) { var hh = G.ents.filter(function (e) { return e.t === "heli"; })[0]; HELI.gain.value = MUTED || !hh ? 0 : Math.max(0, .5 - Math.abs(hh.x - W / 2) / 900); }
    for (var j = G.gulls.length - 1; j >= 0; j--) { var gg = G.gulls[j]; gg.x += gg.vx * dt; gg.y += gg.vy * dt; gg.f += dt; if (gg.x < -60 || gg.x > W + 60) G.gulls.splice(j, 1); }
    // end of a leg
    if (G.dir > 0 && G.yw >= END_Y - END_R - 60) startTurn();
    if (G.dir < 0 && G.yw <= 120) { G.phase = "shore"; G.shoreT = 0; G.staffToss = 0.2; G.ents = G.ents.filter(function (e) { return e.t === "food" || e.sky; }); toast("staff", "Welcome back to Nalu Vida! 🌴 Grab what we toss you!"); }
    // bookkeeping
    G.wake = G.wake.filter(function (w) { w.t += dt; return w.t < 1.1; });
    G.fx = G.fx.filter(function (f) { f.t += dt; return f.t < (f.k === "txt" ? 1.1 : 0.6); });
  }
  // a boat idles offshore, the surfer jumps off with the board and splashes in
  function introStep(dt) {
    G.introT += dt; var f = Math.min(1, G.introT / 1.9);
    G.cam += (G.yw + G.lead - G.cam) * Math.min(1, dt * 4);
    if (G.introT > 1.15 && !G.splashed) { G.splashed = 1; G.fx.push({ k: "splash", x: G.x, y: sy(G.yw), t: 0 }); sfx("splash"); buzz(25); }
    tickEnts(dt);
    if (f >= 1) { G.phase = "ride"; G.inv = 1; G.spawn.food = 0.4; G.spawn.haz = 1.6; banner("LEVEL " + G.level, L().sub, G.level > 1 ? "TEST START" : "RIDE IN TO NALU VIDA"); sfx("level"); radio("Lifeguard on duty. Ride safe out there!", { tone: "info", ms: 2200 }); }
  }
  // game over: the crew pulls you back to the sand in front of Nalu Vida
  function finaleStep(dt) {
    G.finT += dt; var k = Math.min(1, G.finT / 2.4), e = k * k * (3 - 2 * k);
    G.yw = G.finFrom + (-36 - G.finFrom) * e; G.x += (322 - G.x) * Math.min(1, dt * 1.5); G.ang = Math.PI;
    G.cam = G.yw - LEAD * .3; tickEnts(dt);
    if (k >= 1 && !G.finDone) { G.finDone = 1; showEnd(); }
  }
  // tap to launch off a wave: airborne you clear the pier and fly over sharks, eels and jellies
  function jump(big) {
    if (!G.running || G.phase !== "ride" || G.jump > 0 || (big && G.jcd > 0)) return;
    if (big && !(G.wave > 0)) { G.jumpDur = .3; G.jump = .3; G.jumpFrom = G.x < PIER_X ? -1 : 1; pop(G.x, sy(G.yw) - 50, "Catch a wave to jump!", "#cfe8ff"); return; }
    G.flip = big && G.wave > 1.55; if (G.flip) pop(G.x, sy(G.yw) - 64, "PERFECT TIMING!", "#ffd23f", 1);
    if (big) G.wave = 0;
    G.jumpDur = big ? (G.flip ? 1.0 : 0.82) : 0.38; G.jump = G.jumpDur; if (big) { G.jcd = 1.0; sfx("air"); buzz(12); }
    G.jumpFrom = G.x < PIER_X ? -1 : 1; G.fx.push({ k: "spray", x: G.x, y: sy(G.yw), t: 0 });
  }
  function land() {
    G.fx.push({ k: "splash", x: G.x, y: sy(G.yw), t: 0 }); sfx("splash");
    if (G.flip && G.jumpDur > .9) { gain(750, G.x, sy(G.yw) - 70, "FLIP!"); G.fx.push({ k: "wsplash", x: G.x, y: sy(G.yw), t: 0 }); buzz(25); } G.flip = false;
    var side = G.x < PIER_X ? -1 : 1;
    if (G.jumpDur > 0.6 && side !== G.jumpFrom && G.yw > -40 && G.yw < END_Y - END_R) { gain(500, G.x, sy(G.yw) - 40, "PIER JUMP!"); }
    G.pierSide = side; G.underPier = 0;
  }
  function tossTo(fx, fyw, tx, tyw, from, item) { add({ t: "toss", x: fx, yw: fyw, fx: fx, fyw: fyw, tx: tx, tyw: tyw, f: 0, dur: 0.75, from: from, item: item }); }
  function landToss(e) { if (e.item === "harpoon") harpPick(e.tx, e.tyw); else food(e.tx, e.tyw, { from: e.from }); }

  // round the end of the pier: follow an arc around the platform, camera swings to look back toward shore
  function startTurn() {
    G.phase = "turn"; G.ents = G.ents.filter(function (e) { return e.sky; });
    var a0 = Math.atan2(G.yw - END_Y, G.x - PIER_X); if (G.x > PIER_X) a0 = Math.PI - a0; // always go around the far side
    G.turn = { t: 0, dur: 2.4, r: END_R + 46, a0: Math.PI, a1: 0, sx: G.x, syw: G.yw, side: G.x < PIER_X ? 1 : -1 };
    for (var k = 0; k < 4; k++) tossTo(PIER_X + rnd(-30, 30), END_Y, PIER_X + (G.turn.side) * rnd(60, 150), END_Y - rnd(140, 330), "pier");
    pop(W / 2, H * 0.3, "AROUND THE PIER!", "#ffd23f", 1); G.score += 300 * G.mult;
  }
  function turnStep(dt) {
    var T = G.turn; T.t += dt; var f = Math.min(1, T.t / T.dur), e = f < .5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
    var a = Math.PI * (1 - e), s = T.side;               // from the start side, over the top, to the other side
    var px = PIER_X - s * Math.cos(a) * T.r, pyw = END_Y + Math.sin(a) * T.r;
    if (f < 0.15) { var k = f / 0.15; px = T.sx + (px - T.sx) * k; pyw = T.syw + (pyw - T.syw) * k; }
    var nx = px - G.x, ny = pyw - G.yw; G.x = px; G.yw = pyw;
    if (Math.hypot(nx, ny) > 0.01) G.ang = Math.atan2(nx, ny);
    G.lead += (-LEAD - G.lead) * Math.min(1, dt * 1.6); G.cam += (G.yw + G.lead - G.cam) * Math.min(1, dt * 4);
    G.wake.push({ x: G.x, yw: G.yw, t: 0, s: 5 });
    tickEnts(dt);
    if (f >= 1) { G.phase = "ride"; G.dir = -1; G.x = Math.max(20, Math.min(W - 20, G.x)); G.pierSide = G.x < PIER_X ? -1 : 1; G.spawn.haz = 1.2; G.spawn.food = 0.6; }
  }
  function shoreStep(dt) {
    G.shoreT += dt; G.cam += (G.yw + G.lead - G.cam) * Math.min(1, dt * 3);
    if (!G.shoreHeli) { G.shoreHeli = 1; add({ t: "heli", x: -70, yw: G.yw - 150, vx: 115, drops: 0, dt: 9, sky: 1 }); }
    G.x += G.vx * dt; G.vx *= Math.pow(0.0009, dt); G.x = Math.max(16, Math.min(W - 16, G.x));
    G.staffToss -= dt; if (G.staffToss <= 0 && G.shoreT < 3.2) { G.staffToss = 0.45; var tx = Math.max(30, Math.min(W - 30, G.x + rnd(-120, 120))); tossTo(rnd(120, 330), -120, tx, G.yw + rnd(-40, 60), "staff"); }
    tickEnts(dt);
    for (var i = G.ents.length - 1; i >= 0; i--) { var e = G.ents[i]; if (e.t === "food" && Math.hypot(e.x - G.x, e.yw - G.yw) < 42) { gain(e.pts, e.x, sy(e.yw)); buzz(10); G.ents.splice(i, 1); } }
    if (G.shoreT > 4.2) {
      var bonus = 1000 * G.lap; G.score += bonus; pop(W / 2, H * .35, "LAP " + G.lap + " DONE · +" + bonus.toLocaleString(), "#ffd23f", 1);
      toast(Math.random() < .5 ? "lifeguard_f" : "lifeguard_m", "Lap " + G.lap + " done! Faster now 🌊");
      G.lap++; G.shoreHeli = 0; G.phase = "ride"; G.dir = 1; G.ang = 0; G.spawn.haz = 1.5; G.spawn.food = 0.5; G.ents = G.ents.filter(function (e) { return e.sky; });
    }
    G.wake = G.wake.filter(function (w) { w.t += dt; return w.t < 1.1; });
    G.fx = G.fx.filter(function (f) { f.t += dt; return f.t < (f.k === "txt" ? 1.1 : 0.6); });
  }
  function tickEnts(dt) {
    for (var i = G.ents.length - 1; i >= 0; i--) { var e = G.ents[i];
      if (e.t === "toss") { e.f += dt / e.dur; if (e.f >= 1) { landToss(e); G.ents.splice(i, 1); } }
      else if (e.t === "plane" || e.t === "heli") e.x += e.vx * dt; }
    G.fx = G.fx.filter(function (f) { f.t += dt; return f.t < (f.k === "txt" ? 1.1 : 0.6); });
    G.wake = G.wake.filter(function (w) { w.t += dt; return w.t < 1.1; });
  }

  /* ---------- levels, harpoons and boss sharks ---------- */
  // during a boss fight the world quietly slides back along the pier so the fight never hits the end of a leg
  function wrapWorld(D) {
    G.yw += D; G.cam += D; G.wo += D;
    G.ents.forEach(function (e) { if (e.scr) return; e.yw += D; if (e.base != null) e.base += D; if (e.fyw != null) { e.fyw += D; e.tyw += D; } });
    G.wake.forEach(function (w) { w.yw += D; }); G.harps.forEach(function (h) { h.yw += D; });
  }
  function banner(title, sub, top, col, dur) { G.banner = { t: 0, dur: dur || 2.8, title: title, sub: sub || "", top: top || "", col: col || "#ffd23f" }; }
  function clearNear() { G.ents = G.ents.filter(function (e) { return !((e.t === "shark" || e.t === "eel" || e.t === "jelly") && Math.abs(e.yw - G.yw) < 320); }); }
  function levelUp() {
    var bonus = 1500 * G.level; G.score += bonus; G.bossBeat = 0; var done = G.level; G.level = Math.min(5, G.level + 1); G.lvT = 0; G.inv = Math.max(G.inv, 1.6); clearNear();
    var lv = G.level, rid = G.runId, go = function () { if (G.runId !== rid || G.over) return;
      banner("LEVEL " + lv, LV[lv].sub, "LEVEL " + done + " CLEAR · +" + bonus.toLocaleString()); sfx("level"); buzz([30, 40, 30]);
      radio(done === 4 ? "Level 4 clear! Last set, ride it home." : "Level " + done + " clear! Nice ride, keep it going.", { tone: "win" }); };
    // HALFTIME between levels (after level 2, 3 or 4 once ~90 s are ridden): everything freezes until the break is over
    if (window.Halftime && Halftime.levelUp(lv, function () { if (G.runId !== rid || G.over) return; G.running = true; last = 0; drag = null; musicSync(); go(); })) { G.running = false; drag = null; }
    else go();
    if (G.level >= 2 && G.ammo < 3) { G.ammo = 3; pop(G.x, sy(G.yw) - 60, "+3 HARPOONS 🔱", "#ffb15e"); }
    G.spawn.harp = Math.min(G.spawn.harp, 6); G.spawn.rock = 3;
  }
  function bossStart(kind) {
    var B = BOSS[kind];
    G.boss = { kind: kind, B: B, name: B.name, size: B.size, hp: B.hp, max: B.hp, st: "enter", t: 0, x: W / 2, f: 560, vx: 0, vf: 0, ang: Math.PI, sub: 1, fl: 0, ph: Math.random() * 6, dur: 2, br: 0, side0: 0, wakeT: 0 };
    G.ents = G.ents.filter(function (e) { return e.t !== "shark"; }); clearNear();
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
        b.side0 = Math.abs(b.x - PIER_X) < PIER_W / 2 + 10 ? 0 : (b.x < PIER_X ? -1 : 1); sfx("lunge"); buzz(20); } }
    else if (b.st === "charge") { b.x += b.vx * dt; b.f += b.vf * dt; b.sub = .05;
      b.wakeT -= dt; if (b.wakeT <= 0) { b.wakeT = .07; G.fx.push({ k: "spray", x: b.x, y: sy(bossYw(b)), t: 0 }); }
      if (Math.hypot(b.x - G.x, b.f) < hitR) hurt(b.kind === 5 ? "SHARK CHOMP!" : "SHARK BITE!");
      if (G.phase !== "ride") return;
      var byw = bossYw(b);
      for (var i = G.ents.length - 1; i >= 0; i--) { var e = G.ents[i]; if (e.t !== "rock") continue;
        if (Math.hypot(e.x - b.x, e.yw - byw) < e.r + b.size * .17) { G.ents.splice(i, 1); bossCrash(b, e.x, sy(e.yw), B.rock, "SMASHED THE ROCKS!"); return; } }
      var side = b.x < PIER_X ? -1 : 1;
      if (b.side0 && side !== b.side0 && G.yw > 200 && G.yw < END_Y - 200) { b.x = PIER_X + b.side0 * (PIER_W / 2 + b.size * .14); bossCrash(b, PIER_X, sy(byw), B.pier, "SLAMMED THE PIER!"); return; }
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
        if (Math.hypot(b.x - G.x, b.f) < 74) hurt("SHARK CHOMP!"); } }
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
    else { sfx("win"); toast("lifeguard_m", B.name + " swam off with a headache 😵 Nice!"); radio("Big Manō is gone! Water's safe… for now.", { tone: "win" }); var rid = G.runId; setTimeout(function () { if (G.running && G.runId === rid && G.phase !== "finale" && G.phase !== "death") levelUp(); }, 1400); }
  }
  function victoryStep(dt) {
    G.winT += dt; G.yw += G.dir * speed() * .5 * dt; G.cam += (G.yw + G.lead - G.cam) * Math.min(1, dt * 3); tickEnts(dt);
    if (G.winT > 3.4) { G.phase = "finale"; G.finT = 0; G.finFrom = G.yw; G.finDone = 0; G.ents = G.ents.filter(function (e) { return e.sky; }); }
  }
  function confetti(n) { var cols = ["#ffd23f", "#ff7a3d", "#7fe3f2", "#3ddc97", "#ff6bb0", "#fff"]; for (var i = 0; i < n; i++) G.conf.push({ x: rnd(0, W), y: rnd(-80, -10), vx: rnd(-40, 40), vy: rnd(90, 220), r: rnd(3, 6), rot: rnd(0, 6), vr: rnd(-8, 8), c: pick(cols), t: 0 }); }
  function confStep(dt) { G.conf = G.conf.filter(function (c) { c.t += dt; c.x += c.vx * dt + Math.sin(c.t * 4 + c.rot) * 20 * dt; c.y += c.vy * dt; c.rot += c.vr * dt; return c.y < H + 20; }); }
  // tail-slap waves: little curling walls of whitewater fanned out at you (relative to the rider, like the boss)
  function blobStep(dt) {
    for (var i = G.blobs.length - 1; i >= 0; i--) { var o = G.blobs[i]; o.t += dt; o.x += o.vx * dt; o.f += o.vf * dt;
      if (Math.hypot(o.x - G.x, o.f) < 24 && G.jump <= .06) { G.blobs.splice(i, 1); hurt("Tail-slap wave!"); continue; }
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
  function draw() {
    camUpdate();
    water(G.t, G.cam);
    cx.setTransform(DPR, 0, 0, DPR, 0, 0); cx.clearRect(0, 0, W, H);
    cx.translate(CAM.x, CAM.y); cx.scale(ZOOM, ZOOM); cx.translate(-CAM.x, -CAM.y);
    if (!GL) water(G.t, G.cam);
    if (G.shake > 0.5) cx.translate(rnd(-G.shake, G.shake), rnd(-G.shake, G.shake));
    drawShore();
    // swells
    G.ents.forEach(function (e) { if (e.t !== "swell") return; drawWave(e); });
    if (G.phase === "death") deathWater();
    // wake
    G.wake.forEach(function (w) { cx.globalAlpha = (1 - w.t / 1.1) * .7; cx.fillStyle = "#fff"; cx.beginPath(); cx.arc(w.x, sy(w.yw), w.s * (1 + w.t), 0, 7); cx.fill(); }); cx.globalAlpha = 1;
    // water-level things under the pier deck
    G.ents.forEach(function (e) { if (!e.sky && e.t !== "swell" && e.t !== "toss") drawEnt(e); });
    drawBoss(); drawBlobs();
    // player (drawn before the deck so the deck covers you when you shoot the pier)
    drawSurfer();
    drawPier();
    if (G.jump > 0 && G.jumpDur > .6) drawSurfer();   // airborne over the deck: draw the surfer above the pier
    drawHarps(); drawBossBar();
    G.ents.forEach(function (e) { if (e.t === "toss") drawEnt(e); });
    // sky layer: gull shadows, gulls, heli, plane
    G.gulls.forEach(function (g) { var flap = Math.sin(g.f * 9) * .15; cx.globalAlpha = .18; cx.fillStyle = "#001018"; cx.beginPath(); cx.ellipse(g.x + 26, g.y + 34, 14, 5, 0, 0, 7); cx.fill(); cx.globalAlpha = 1;
      if (!spr("gull", g.x, g.y, 46 + flap * 40, (g.vx > 0 ? 1 : -1) * Math.PI / 2)) { cx.strokeStyle = "#fff"; cx.lineWidth = 2.5; cx.beginPath(); cx.moveTo(g.x - 12, g.y - 4 + flap * 20); cx.quadraticCurveTo(g.x - 5, g.y - 8, g.x, g.y); cx.quadraticCurveTo(g.x + 5, g.y - 8, g.x + 12, g.y - 4 + flap * 20); cx.stroke(); } });
    G.ents.forEach(function (e) { if (e.sky) drawEnt(e); });
    // effects
    G.fx.forEach(function (f) {
      if (f.k === "txt") { var a = 1 - f.t / 1.1; cx.globalAlpha = Math.max(0, a); cx.font = (f.big ? "900 24px" : "800 15px") + " 'Alfa Slab One',Georgia,serif"; cx.textAlign = "center"; cx.lineWidth = 4; cx.strokeStyle = "rgba(0,20,40,.7)"; cx.strokeText(f.txt, f.x, f.y - f.t * 40); cx.fillStyle = f.col; cx.fillText(f.txt, f.x, f.y - f.t * 40); cx.globalAlpha = 1; }
      else if (f.k === "ring") { cx.strokeStyle = "rgba(255,210,63," + (1 - f.t / .6) + ")"; cx.lineWidth = 3; cx.beginPath(); cx.arc(f.x, f.y, 14 + f.t * 70, 0, 7); cx.stroke(); }
      else if (f.k === "washover") { var wf = f.t / .6; if (ok(IM.wave)) { var wh2 = 90, ww2 = wh2 * IM.wave.naturalWidth / IM.wave.naturalHeight; cx.save(); cx.globalAlpha = Math.max(0, 1 - wf * .8); cx.drawImage(IM.wave, f.x - ww2 / 2, f.y - 120 + wf * 130, ww2, wh2); cx.restore(); } }
      else if (f.k === "wsplash") { var a2 = Math.max(0, 1 - f.t / .6), s2 = 70 + f.t * 120; if (ok(IM.splash)) spr("splash", f.x, f.y - 6, s2, 0, a2); }
      else if (f.k === "splash") { for (var q2 = 0; q2 < 18; q2++) { var an = q2 / 18 * 6.283, rr2 = f.t * 120; cx.fillStyle = "rgba(255,255,255," + (1 - f.t / .6) + ")"; cx.beginPath(); cx.arc(f.x + Math.cos(an) * rr2, f.y + Math.sin(an) * rr2 * .6, 4 - f.t * 4, 0, 7); cx.fill(); } cx.strokeStyle = "rgba(255,255,255," + (1 - f.t / .6) + ")"; cx.lineWidth = 3; cx.beginPath(); cx.ellipse(f.x, f.y, f.t * 90, f.t * 54, 0, 0, 7); cx.stroke(); }
      else if (f.k === "bubble") { cx.strokeStyle = "rgba(255,255,255," + (.8 * (1 - f.t / .6)) + ")"; cx.lineWidth = 1.4; cx.beginPath(); cx.arc(f.x, f.y - f.t * 14, 2 + f.t * 6, 0, 7); cx.stroke(); }
      else if (f.k === "debris") { f.p.forEach(function (q) { var d = q[1] * f.t, a = 1 - f.t / .6; cx.fillStyle = "rgba(110,104,96," + a + ")"; cx.beginPath(); cx.arc(f.x + Math.cos(q[0]) * d, f.y + Math.sin(q[0]) * d * .8 - Math.sin(f.t / .6 * Math.PI) * 24, q[2] * (1 - f.t), 0, 7); cx.fill(); }); }
      else if (f.k === "spray") { for (var k = 0; k < 10; k++) { cx.fillStyle = "rgba(255,255,255," + (1 - f.t / .6) + ")"; cx.beginPath(); cx.arc(f.x + Math.cos(k) * f.t * 80, f.y + Math.sin(k * 2) * f.t * 50, 3, 0, 7); cx.fill(); } }
    });
    if (G.hint > 0 && G.phase === "ride") { cx.save(); cx.setTransform(DPR, 0, 0, DPR, 0, 0); cx.globalAlpha = Math.min(1, G.hint) * (.6 + .4 * Math.sin(G.t * 6)); label("🌊 Catch a wave, then tap to jump the pier", W / 2, H - 40, "#fff"); cx.restore(); }
    if (G.phase === "death" && G.deathCause === "eel") eelScreen();
    if (G.hurt > 0) { cx.fillStyle = "rgba(255,40,60," + G.hurt * .9 + ")"; cx.fillRect(-20, -20, W + 40, H + 40); }
    if ((G.phase === "shore" || G.phase === "finale") && ok(IM.storefront)) {
      var k = Math.min(1, (G.phase === "shore" ? G.shoreT : G.finT) / .5), cw = W - 40, ch = cw * IM.storefront.naturalHeight / IM.storefront.naturalWidth, yy = 64 - (1 - k) * (ch + 80);
      cx.save(); cx.shadowColor = "rgba(0,0,0,.45)"; cx.shadowBlur = 18; cx.beginPath(); if (cx.roundRect) cx.roundRect(20, yy, cw, ch, 14); else cx.rect(20, yy, cw, ch); cx.clip(); cx.drawImage(IM.storefront, 20, yy, cw, ch); cx.restore();
      label(G.phase === "shore" ? "★ Welcome back to Nalu Vida ★" : "★ " + (G.finaleMsg || "The Nalu Vida crew pulled you in").replace(/^\S+ /, "") + " ★", W / 2, yy + ch + 18, "#ffd23f");
    }
    drawConf(); drawBanner();
    hud(); jumpBtn();
  }
  // a rolling wave with real depth: dark trough behind, sunlit face, breaking white crest (photo art) and spray
  function drawWave(e) {
    var y = sy(e.yw), up = G.dir > 0 ? 1 : -1, sw = Math.sin(G.t * 1.6 + e.yw * .01) * 4;
    if (e.big) {   // closeout: a tall breaking whitewater wall across part of the swell
      var c0 = e.c0, c1 = e.c1; cx.fillStyle = "rgba(2,30,55,.35)"; cx.fillRect(c0, Math.min(y - up * 40, y + up * 14), c1 - c0, 54);
      if (ok(IM.wave)) { var wh2 = 112, ww2 = wh2 * IM.wave.naturalWidth / IM.wave.naturalHeight; cx.save(); cx.beginPath(); cx.rect(c0, y - 90, c1 - c0, 180); cx.clip(); if (up < 0) { cx.translate(0, y * 2); cx.scale(1, -1); }
        for (var x1 = c0 - ((G.t * 30) % ww2); x1 < c1; x1 += ww2 * .85) cx.drawImage(IM.wave, x1, y - wh2 * .62 + sw, ww2, wh2); cx.restore(); }
      for (var k1 = 0; k1 < 16; k1++) { var fx1 = c0 + (k1 + .5) / 16 * (c1 - c0), fy1 = y - up * (6 + Math.abs(Math.sin(G.t * 5 + k1)) * 16); cx.fillStyle = "rgba(255,255,255,.9)"; cx.beginPath(); cx.arc(fx1, fy1, 5 + (k1 % 3) * 2, 0, 7); cx.fill(); }
      label("CLOSEOUT!", (c0 + c1) / 2, y - up * 34, "#ff9d9d");
    }
    var tr = cx.createLinearGradient(0, y - up * 46, 0, y + up * 6); tr.addColorStop(0, "rgba(2,30,55,0)"); tr.addColorStop(.75, "rgba(2,30,55,.42)"); tr.addColorStop(1, "rgba(2,30,55,0)");
    cx.fillStyle = tr; cx.fillRect(-60, Math.min(y - up * 46, y + up * 6), W + 120, 52);                                   // trough shadow in front of the wave
    var fc = cx.createLinearGradient(0, y + up * 4, 0, y + up * 34); fc.addColorStop(0, "rgba(120,235,235,.55)"); fc.addColorStop(1, "rgba(20,120,160,0)");
    cx.fillStyle = fc; cx.fillRect(-60, Math.min(y + up * 4, y + up * 34), W + 120, 30);                                  // light passing through the face
    if (ok(IM.wave)) { var wh = 74, ww = wh * IM.wave.naturalWidth / IM.wave.naturalHeight, off = ((G.t * 18 + e.yw) % ww + ww) % ww;
      cx.save(); if (up < 0) { cx.translate(0, y * 2); cx.scale(1, -1); }
      for (var x0 = -off - ww; x0 < W + ww; x0 += ww * .92) cx.drawImage(IM.wave, x0, y - wh * .55 + sw, ww, wh);
      cx.restore(); }
    else { cx.strokeStyle = "rgba(255,255,255,.8)"; cx.lineWidth = 6; cx.beginPath(); for (var x = -10; x <= W + 10; x += 10) { var yy = y + Math.sin(x * .035 + G.t * 2) * 6; x === -10 ? cx.moveTo(x, yy) : cx.lineTo(x, yy); } cx.stroke(); }
    for (var k = 0; k < 5; k++) { var sx = (k * 97 + G.t * 60 + e.yw) % (W + 40) - 20, ph = (G.t * 2.2 + k) % 1;             // spray kicking off the lip
      cx.fillStyle = "rgba(255,255,255," + (.7 * (1 - ph)) + ")"; cx.beginPath(); cx.arc(sx + ph * 10, y - up * (10 + ph * 26), 1.5 + ph * 2.5, 0, 7); cx.fill(); }
  }
  function deathWater() {
    var x = G.deathX, y = sy(G.deathYw), t = G.deathT;
    if (G.deathCause === "shark") {                                    // the water turns red where it happened
      for (var k = 0; k < 6; k++) { var r = (24 + k * 14) * Math.min(1.6, .3 + t * .9), ox = Math.sin(k * 2.1) * 18 * t, oy = Math.cos(k * 1.7) * 14 * t;
        var gr = cx.createRadialGradient(x + ox, y + oy, 2, x + ox, y + oy, r); gr.addColorStop(0, "rgba(150,0,12," + (.55 - k * .05) + ")"); gr.addColorStop(1, "rgba(150,0,12,0)");
        cx.fillStyle = gr; cx.beginPath(); cx.arc(x + ox, y + oy, r, 0, 7); cx.fill(); }
      for (var b = 0; b < 8; b++) { var bt = (t * 1.3 + b * .13) % 1; cx.strokeStyle = "rgba(255,255,255," + (.6 * (1 - bt)) + ")"; cx.lineWidth = 1.2; cx.beginPath(); cx.arc(x + Math.sin(b * 3) * 22, y + Math.cos(b * 2) * 18 - bt * 10, 2 + bt * 4, 0, 7); cx.stroke(); }
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
  // bruises and blood build up as hearts are lost (painted onto the surfer only)
  var DMG = {};
  function hurtImg(img, lvl) {
    if (lvl <= 0) return img; var key = (img.src.indexOf("surfer_m") > 0 ? "m" : "f") + lvl; if (DMG[key]) return DMG[key];
    var w = img.naturalWidth, h = img.naturalHeight, c = document.createElement("canvas"); c.width = w; c.height = h; var x = c.getContext("2d"); x.drawImage(img, 0, 0);
    x.globalCompositeOperation = "source-atop"; x.fillStyle = "rgba(150,20,40," + (lvl * .05) + ")"; x.fillRect(0, 0, w, h);
    var spots = [[.42, .28], [.58, .36], [.36, .5], [.62, .55], [.48, .62], [.4, .4], [.55, .22], [.5, .46]];
    for (var i = 0; i < Math.min(spots.length, lvl * 2); i++) { var sx = spots[i][0] * w, syy = spots[i][1] * h, r = w * (.035 + (i % 3) * .01);
      var gr = x.createRadialGradient(sx, syy, 1, sx, syy, r); gr.addColorStop(0, i % 2 ? "rgba(90,30,90,.75)" : "rgba(170,0,10,.8)"); gr.addColorStop(1, "rgba(90,30,90,0)"); x.fillStyle = gr; x.beginPath(); x.arc(sx, syy, r, 0, 7); x.fill(); }
    if (lvl >= 3) { x.strokeStyle = "rgba(170,0,10,.75)"; x.lineWidth = Math.max(2, w * .01); for (var k = 0; k < lvl - 2; k++) { x.beginPath(); x.moveTo(w * (.44 + k * .06), h * .3); x.lineTo(w * (.45 + k * .06), h * (.38 + k * .03)); x.stroke(); } }
    DMG[key] = c; return c;
  }
  function drawShore() {
    var y0 = sy(0); if (y0 < -40) return;   // waterline on screen
    if (ok(IM.shore)) { var w = W, h = w * IM.shore.naturalHeight / IM.shore.naturalWidth, top = y0 - h * 0.255; cx.drawImage(IM.shore, 0, top, w, h); palms(top, h); }
    else { cx.fillStyle = "#ecd9a8"; cx.fillRect(0, y0, W, H); cx.fillStyle = "#e6a5a0"; cx.fillRect(40, y0 + 150, 170, 90); cx.fillStyle = "#5bc6d6"; cx.fillRect(40, y0 + 150, 170, 10); }
    // labels from the map
    label("★ NALU VIDA ★", 342, y0 + 214, "#ffd23f"); label("Venice Beach", 70, y0 + 95, "#fff"); label("Venice Fishing Pier", PIER_X, y0 - 26, "#fff"); label("Washington Blvd", 140, y0 + 382, "#fff");
    // lifeguards next to the two towers on the aerial
    spr("lifeguard_f", 140, y0 + 52, 26); spr("lifeguard_m", 330, y0 + 54, 24);
    if (G.phase === "shore" || G.phase === "finale") { spr("staff", 300, y0 + 26 + Math.sin(G.t * 6) * 2, 30); spr("staff", 360, y0 + 30, 28); }
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
  function tower(x, y, who) { cx.fillStyle = "#3fa9d6"; cx.fillRect(x - 15, y - 12, 30, 22); cx.fillStyle = "#fff"; cx.fillRect(x - 15, y - 14, 30, 4); spr(who, x + 18, y + 4, 30); }
  function label(t, x, y, col) { cx.font = "800 12.5px system-ui,sans-serif"; cx.textAlign = "center"; cx.lineWidth = 3.5; cx.strokeStyle = "rgba(5,18,34,.8)"; cx.strokeText(t, x, y); cx.fillStyle = col; cx.fillText(t, x, y); }
  function drawPier() {
    var top = sy(END_Y), bot = sy(-60), x0 = PIER_X - PIER_W / 2;
    if (bot < -50 || top > H + 120) return;
    var a = Math.max(-40, top), b = Math.min(H + 40, bot);
    // shadow + pilings on the water
    cx.fillStyle = "rgba(0,20,35,.28)"; cx.fillRect(x0 + 8, a + 10, PIER_W, b - a);
    if (ok(IM.pier)) { var pw = PIER_W * 1.15, ph = pw * IM.pier.naturalHeight / IM.pier.naturalWidth, base = sy(G.wo), y = base - Math.ceil((base - a) / ph) * ph;
      for (; y < b; y += ph) cx.drawImage(IM.pier, PIER_X - pw / 2, y, pw, ph + 0.5);
      for (var py2 = base - Math.ceil((base - a) / 80) * 80; py2 < b; py2 += 80) { cx.fillStyle = "rgba(0,15,25,.35)"; cx.fillRect(x0 - 3, py2 - 3, 5, 6); cx.fillRect(x0 + PIER_W - 2, py2 - 3, 5, 6); } }
    else {
      cx.fillStyle = "#cfc9bd"; cx.fillRect(x0, a, PIER_W, b - a);
      cx.fillStyle = "#b9b2a5"; for (var yy = Math.floor((a - sy(0)) / 14) * 14 + sy(0); yy < b; yy += 14) cx.fillRect(x0, yy, PIER_W, 1.2);
      cx.fillStyle = "#6f6a62"; cx.fillRect(x0, a, 3, b - a); cx.fillRect(x0 + PIER_W - 3, a, 3, b - a);
      for (var ly = Math.floor((a - sy(0)) / 160) * 160 + sy(0); ly < b; ly += 160) { cx.fillStyle = "#3a3a3a"; cx.fillRect(x0 + 2, ly, 4, 4); cx.fillRect(x0 + PIER_W - 6, ly, 4, 4); cx.fillStyle = "rgba(255,240,180,.35)"; cx.beginPath(); cx.arc(x0 + 4, ly + 2, 9, 0, 7); cx.fill(); }
    }
    // the round end
    if (top > -END_R - 20 && top < H + END_R) {
      if (!spr("pierend", PIER_X, top, END_R * 2.3)) { cx.fillStyle = "rgba(0,20,35,.28)"; cx.beginPath(); cx.arc(PIER_X + 8, top + 10, END_R, 0, 7); cx.fill(); cx.fillStyle = "#cfc9bd"; cx.beginPath(); cx.arc(PIER_X, top, END_R, 0, 7); cx.fill(); cx.strokeStyle = "#6f6a62"; cx.lineWidth = 3; cx.stroke(); }
      label("End of the Venice Pier", PIER_X, top + 4, "#fff");
    }
  }
  function drawSurfer() {
    var x = G.x, y = sy(G.yw), blink = G.inv > 0 && Math.floor(G.t * 12) % 2;
    if (G.phase === "intro") {
      var bx = x - 70, by = y - 30; spr("boat", bx, by + Math.sin(G.t * 2) * 2, 120, Math.PI * .9);
      var f = Math.min(1, G.introT / 1.15), jx = bx + (x - bx) * f, jy = by + (y - by) * f - Math.sin(f * Math.PI) * 70, sc = 1 + Math.sin(f * Math.PI) * .35;
      if (f < 1) { cx.fillStyle = "rgba(0,20,35,.25)"; cx.beginPath(); cx.ellipse(jx + 10, by + (y - by) * f + 10, 12, 26, 0, 0, 7); cx.fill(); spr(G.surfer === "m" ? "surfer_m" : "surfer_f", jx, jy, 64 * sc, (G.surfer === "m" ? 0 : Math.PI) + f * .6); return; }
    }
    if (G.phase === "death") { var dt0 = G.deathT;
      if (G.deathCause === "shark" && dt0 > .45) return;                           // pulled under
      if (G.deathCause === "wave" && dt0 > 1.1) return;                            // swallowed
      if (G.deathCause === "eel") { x += rnd(-5, 5); y += rnd(-5, 5); var sk = dt0 > 1.9 || Math.floor(dt0 * 16) % 2;
        if (sk && ok(IM.skeleton)) { var sw = 60, sh = sw * IM.skeleton.naturalHeight / IM.skeleton.naturalWidth; cx.save(); cx.globalAlpha = dt0 > 2.2 ? Math.max(0, 1 - (dt0 - 2.2) / .6) : 1; cx.translate(x, y); cx.rotate(G.ang); cx.globalCompositeOperation = "lighter"; cx.drawImage(IM.skeleton, -sw / 2, -sh / 2, sw, sh); cx.restore(); return; } }
    }
    if (blink && G.phase !== "death") return;
    var air = G.jump > 0 ? Math.sin(Math.PI * (1 - G.jump / G.jumpDur)) * (G.jumpDur > .6 ? 1 : .45) : 0;
    var bob = Math.sin(G.t * 2.3 + G.yw * .018) * 2.5, tilt = Math.sin(G.t * 1.7 + G.yw * .011) * .07;
    cx.fillStyle = "rgba(0,20,35," + (.25 - air * .1) + ")"; cx.beginPath(); cx.ellipse(x + 6 + air * 26, y + 8 + air * 34, 12 * (1 - air * .25), 30 * (1 - air * .25), G.ang, 0, 7); cx.fill();
    y = y + bob - air * 34;
    if (G.wave > 0) { var wr = 40 + Math.sin(G.t * 12) * 4; cx.strokeStyle = "rgba(127,227,242," + Math.min(1, G.wave) + ")"; cx.lineWidth = 3; cx.beginPath(); cx.arc(x, y, wr, 0, 7); cx.stroke();
      cx.strokeStyle = "rgba(255,255,255," + Math.min(.6, G.wave * .5) + ")"; cx.lineWidth = 1.5; cx.beginPath(); cx.arc(x, y, wr + 6, 0, 7); cx.stroke(); }
    var sun = cx.createRadialGradient(x, y, 4, x, y, 46); sun.addColorStop(0, "rgba(255,240,200,.30)"); sun.addColorStop(1, "rgba(255,240,200,0)"); cx.fillStyle = sun; cx.beginPath(); cx.arc(x, y, 46, 0, 7); cx.fill();
    var lean = Math.max(-.55, Math.min(.55, G.vx / 380)), shift = lean * 6;                       // weight shifts into the turn
    cx.save(); cx.filter = "brightness(1.2) contrast(1.08) saturate(1.12)";
    var drew = (function () { var i = IM[G.surfer === "m" ? "surfer_m" : "surfer_f"]; if (!ok(i)) return false; var w = 56 * (1 + air * .42), h = w * i.naturalHeight / i.naturalWidth;
      var spin = G.flip && G.jump > 0 ? (1 - G.jump / G.jumpDur) * Math.PI * 2 : 0, wipe = G.wipe > 0 ? (1 - G.wipe / .9) : 0;
      if (wipe) { spin += wipe * Math.PI * 2.4; w *= 1 - Math.sin(wipe * Math.PI) * .25; h = w * i.naturalHeight / i.naturalWidth; }
      if (G.phase === "death") { var dd = G.deathT; spin += G.deathCause === "wave" ? dd * 6 : 0; w *= G.deathCause === "shark" ? Math.max(.2, 1 - dd * 1.6) : G.deathCause === "wave" ? Math.max(.2, 1 - dd * .7) : 1; h = w * i.naturalHeight / i.naturalWidth; }
      cx.translate(x + shift, y); cx.rotate(G.ang + (G.surfer === "m" ? Math.PI : 0) + tilt * .6 + air * .25 * (G.vx > 0 ? 1 : -1) + spin); cx.transform(1, 0, -lean * .35, 1, 0, 0); cx.scale(1 - Math.abs(lean) * .1, 1);
      cx.drawImage(hurtImg(i, Math.max(0, 5 - G.hearts)), -w / 2, -h / 2, w, h); return true; })();
    cx.restore();
    if (!drew) {
      cx.save(); cx.translate(x, y); cx.rotate(G.ang); var gr = cx.createLinearGradient(0, -30, 0, 30); gr.addColorStop(0, "#ffb02e"); gr.addColorStop(.5, "#ffd23f"); gr.addColorStop(.5, "#2f8fd8"); gr.addColorStop(1, "#173d8f");
      cx.fillStyle = gr; cx.beginPath(); cx.ellipse(0, 0, 10, 30, 0, 0, 7); cx.fill(); cx.fillStyle = G.surfer === "m" ? "#7a4a2a" : "#b5735a"; cx.beginPath(); cx.arc(0, -2, 7, 0, 7); cx.fill(); cx.restore();
    }
  }
  function drawEnt(e) {
    var y = e.scr ? e.y : sy(e.yw), x = e.x;
    if (e.t === "fish") { var a = e.air || 0;
      if (!a) { cx.fillStyle = "rgba(0,25,40,.28)"; cx.beginPath(); cx.ellipse(x, y, 16, 6, Math.sin(e.ph * 3) * .3, 0, 7); cx.fill(); return; }   // a dark shape under the water
      var hgt = Math.sin(a * Math.PI) * 46, rot = (a - .5) * 1.6;
      cx.fillStyle = "rgba(0,25,40,.2)"; cx.beginPath(); cx.ellipse(x, y + 4, 14, 5, 0, 0, 7); cx.fill();
      if (e.k === "fish_gold") { cx.save(); cx.globalCompositeOperation = "lighter"; var gg = cx.createRadialGradient(x, y - hgt, 2, x, y - hgt, 40); gg.addColorStop(0, "rgba(255,215,90,.6)"); gg.addColorStop(1, "rgba(255,215,90,0)"); cx.fillStyle = gg; cx.beginPath(); cx.arc(x, y - hgt, 40, 0, 7); cx.fill(); cx.restore(); }
      spr(e.k, x, y - hgt, 54 + a * 10, rot); return; }
    if (e.t === "rock") { drawRock(e, x, y); return; }
    if (e.t === "rsign") { drawRSign(e, x, y); return; }
    if (e.t === "harpoon") { drawHarpPick(e, x, y); return; }
    if (e.t === "ski") { drawSki(e, x, y); return; }
    if (e.t === "food") {
      var b = Math.sin(G.t * 3 + e.bob) * 2.5;
      cx.fillStyle = "rgba(0,20,35,.22)"; cx.beginPath(); cx.ellipse(x + 4, y + 6, 26, 15, 0, 0, 7); cx.fill();
      if (e.gold) { cx.fillStyle = "rgba(255,210,63," + (.35 + .25 * Math.sin(G.t * 6)) + ")"; cx.beginPath(); cx.arc(x, y + b, 34, 0, 7); cx.fill(); }
      if (!spr(e.k, x, y + b, 58)) { cx.fillStyle = "#b07a3c"; cx.fillRect(x - 22, y - 12 + b, 44, 24); cx.fillStyle = "#59c3d1"; cx.beginPath(); cx.arc(x, y + b, 12, 0, 7); cx.fill(); cx.font = "18px system-ui"; cx.textAlign = "center"; cx.fillText({ raft_taco: "🌮", raft_burger: "🍔", raft_shrimp: "🍤", raft_oysters: "🦪", raft_mimosa: "🥂" }[e.k], x, y + 6 + b); }
    } else if (e.t === "shark") {
      if (e.st === "fin" || e.st === "warn") {
        if (e.st === "warn") { cx.strokeStyle = "rgba(255,60,60," + (.5 + .5 * Math.sin(G.t * 30)) + ")"; cx.lineWidth = 3; cx.beginPath(); cx.arc(x, y, 34, 0, 7); cx.stroke(); cx.font = "900 18px system-ui"; cx.fillStyle = "#ff4d4d"; cx.textAlign = "center"; cx.fillText("!", x, y - 38); }
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
    } else if (e.t === "jelly") {
      var pul = 1 + Math.sin(e.ph * 3) * .08;
      if (!spr("jelly", x, y, 48 * pul, 0, .92)) { cx.fillStyle = "rgba(255,120,200,.6)"; cx.beginPath(); cx.arc(x, y, 16 * pul, 0, 7); cx.fill(); }
    } else if (e.t === "boat") {
      cx.fillStyle = "rgba(255,255,255,.5)"; for (var wk = 1; wk < 6; wk++) { cx.beginPath(); cx.arc(x - Math.sign(e.vx) * wk * 16, y + Math.sin(wk) * 3, 6 + wk * 2, 0, 7); cx.fill(); }
      if (!spr("boat", x, y, 110, e.vx > 0 ? Math.PI / 2 : -Math.PI / 2)) { cx.fillStyle = "#fff"; cx.beginPath(); cx.ellipse(x, y, 40, 15, 0, 0, 7); cx.fill(); cx.fillStyle = "#ff7a3d"; cx.fillRect(x - 12, y - 6, 24, 12); }
      label("Nalu Vida crew", x, y - 30, "#ffd23f");
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
    var y = H * .34, hgt = 128, gr = cx.createLinearGradient(0, y, 0, y + hgt); gr.addColorStop(0, "rgba(6,24,46,0)"); gr.addColorStop(.2, "rgba(6,24,46,.82)"); gr.addColorStop(.8, "rgba(6,24,46,.82)"); gr.addColorStop(1, "rgba(6,24,46,0)");
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
  function jumpBtn() { fireBtn(); var b = $("nv-jump"); if (!b) return; var on = G.running && G.phase === "ride", rd = on && G.wave > 0, k = on + "" + rd;
    if (k === lastJ) return; lastJ = k; b.classList.toggle("on", on); b.classList.toggle("ready", rd); b.textContent = rd ? "JUMP 🌊" : "JUMP"; }
  function hud() {
    var s = Math.floor(G.score).toLocaleString(), m = "×" + G.mult + (G.streak >= 3 ? " · " + G.streak + " streak 🔥" : ""), hs = "❤️".repeat(Math.max(0, G.hearts)) + "🤍".repeat(Math.max(0, 5 - G.hearts)),
      leg = G.boss ? "⚠ " + G.boss.name + " " + Math.ceil(G.boss.hp) + "/" + G.boss.max : G.phase === "turn" ? "Rounding the pier!" : G.phase === "shore" ? "Nalu Vida pit stop" : G.dir > 0 ? "Out to the end of the pier" : "Back to Nalu Vida",
      pr = G.boss ? G.boss.hp / G.boss.max : Math.min(1, G.lvT / L().dur), key = s + m + hs + leg + G.lap + G.level + Math.round(pr * 100);
    if (key === lastHud) return; lastHud = key;
    $("nv-score").textContent = s; $("nv-mult").textContent = m; $("nv-hearts").textContent = hs; $("nv-leg").textContent = leg; $("nv-lap").textContent = "Level " + G.level + "/5 · Lap " + G.lap;
    var pe = $("nv-prog"); pe.style.width = Math.max(0, Math.min(1, pr)) * 100 + "%"; pe.style.background = G.boss ? "linear-gradient(90deg,#ff3b3b,#ff9d2e)" : "";
  }

  /* ---------- loop ---------- */
  var last = 0;
  function frame(ts) {
    var dt = Math.min(0.05, (ts - (last || ts)) / 1000); last = ts;
    if (G.running) for (var k = 0; k < DBG_SPD && G.running; k++) update(dt); else { G.t += dt; G.cam = G.cam || 260; }
    confStep(dt); if (G.banner && !G.running) G.banner = null;
    draw();
    requestAnimationFrame(frame);
  }

  /* ---------- start / end ---------- */
  function start(s) { radioReset(); audio(); if (AC && AC.state === "suspended") AC.resume(); G.surfer = s || G.surfer; G.splashed = 0; reset(); G.running = true; G.over = false; $("nv-start").style.display = "none"; $("nv-end").style.display = "none"; musicSync(); }
  function end() {
    G.phase = "finale"; G.finT = 0; G.finFrom = G.yw; G.finDone = 0; G.ents = G.ents.filter(function (e) { return e.sky; }); sfx("over");
  }
  function showEnd() {
    G.running = false; G.over = true; var sc = Math.floor(G.score); G.score = sc;
    if (sc > G.best) { G.best = sc; try { localStorage.setItem("nalu-best", sc); } catch (e) {} }
    var prize = ""; PRIZES.forEach(function (p) { if (sc >= p[0]) prize = p[1]; });
    var win = "";
    var member = window.SSAI_GATE && SSAI_GATE.member ? SSAI_GATE.member() : null;
    function claimHtml(r) { return r.blocked ? "🏆 You'd win " + esc(prize) + ", but you already have <b>" + esc(r.prize.t) + "</b> waiting (code " + r.prize.c + ")." : "🏆 You won <b>" + esc(prize) + "</b>!<br><span style='font:900 20px ui-monospace,Menlo,monospace;letter-spacing:.1em;color:#ffd23f'>" + r.prize.c + "</span><br><span style='font-weight:600;font-size:12.5px'>Show this at Nalu Vida · good for 3 days</span>"; }
    if (prize && window.SSAI_WIN && member) win = claimHtml(window.SSAI_WIN(prize));
    else if (prize) win = "🏆 You won <b>" + esc(prize) + "</b>!<br><button class='nv-btn' id='nv-save' type='button' style='margin-top:8px'>Save my prize</button><br><span style='font-weight:600;font-size:12px;opacity:.85'>Add your name and phone or email to get your code</span>";
    var next = PRIZES.filter(function (p) { return p[0] > sc; })[0];
    var sv = {}; try { sv = JSON.parse(localStorage.getItem("nalu-board") || "{}"); } catch (e) {}
    $("nv-end").innerHTML = (ok(IM.storefront) ? "<img src='" + IM.storefront.src + "' alt='Nalu Vida' style='width:100%;max-width:330px;" + (window.ReviewEgg ? "max-height:110px;object-fit:cover;" : "") + "border-radius:14px;box-shadow:0 8px 24px rgba(0,0,0,.4);margin-bottom:8px'>" : "") + (G.won ? "<h3>You beat Manō Nui! 🏆</h3>" : "<h3>You made it to Nalu Vida! 🌴</h3>") + "<p style='font:900 30px system-ui;margin:4px 0'>" + sc.toLocaleString() + "</p><p>" + (G.won ? "All 5 levels cleared" : "Level " + G.level + "/5") + " · best " + G.best.toLocaleString() + "</p>" +
      (win ? "<div class='nv-win'>" + win + "</div>" : next ? "<p>" + (next[0] - sc).toLocaleString() + " more points wins <b>" + esc(next[1]) + "</b></p>" : "") +
      "<button class='nv-btn' id='nv-order' type='button' style='font-size:18px;padding:14px 24px'>🍽️ Head inside &amp; order</button><br>" +
      "<button class='nv-btn' id='nv-again' type='button' style='background:#fff'>🏄 Ride again</button>" +
      "<div class='nv-board'><b>This week's top riders</b> <span id='nv-wk' style='opacity:.7'></span><ol id='nv-list'><li>Loading…</li></ol>" +
      "<input id='nv-n' maxlength='16' placeholder='Name for the board' value='" + esc(sv.n || "") + "'><input id='nv-ig' maxlength='31' placeholder='@instagram (optional)' value='" + (sv.ig ? "@" + esc(sv.ig) : "") + "'>" +
      "<button class='nv-btn' id='nv-post' type='button' style='width:100%;margin-top:6px'>Post my score</button><div id='nv-msg' style='margin-top:6px;font-size:12.5px'></div><div style='font-size:12px;opacity:.8;margin-top:4px'>#1 at the end of the week wins half off their meal.</div></div>";
    if (window.ReviewEgg) ReviewEgg.endCard($("nv-end"), $("nv-order"));
    $("nv-end").style.display = "flex";
    var fly = document.createElement("button"); fly.type = "button"; fly.className = "nv-fly"; fly.setAttribute("aria-label", "Fly to Melody Bar and Grill");
    fly.innerHTML = "<img src='img/game/plane.webp' alt=''><span>✈ Fly to Melody Bar &amp; Grill · LAX — tap for a deal</span>";
    fly.onclick = function () { var code; try { code = localStorage.getItem("nalu-melody-egg-" + new Date().toDateString()); } catch (e) {}
      if (!code) { code = "MELODY-" + Math.random().toString(36).slice(2, 6).toUpperCase(); try { localStorage.setItem("nalu-melody-egg-" + new Date().toDateString(), code); } catch (e) {} }
      location.href = "../melody-lax/?from=nalu&deal=" + encodeURIComponent(code) + "#play"; };
    $("nv-end").appendChild(fly);
    $("nv-again").onclick = function () { start(); };
    $("nv-order").onclick = function () { $("nv-end").style.display = "none"; var t = document.getElementById("seat") || document.getElementById("food"); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" }); };
    $("nv-post").onclick = function () { if (window.SSAI_GATE) SSAI_GATE("score", function (m) { if (m && !$("nv-n").value) $("nv-n").value = (m.name || "").split(" ")[0]; post(); }); else post(); }; loadBoard();
    var sv2 = $("nv-save"); if (sv2) sv2.onclick = function () { SSAI_GATE("prize", function (m) { var r = window.SSAI_WIN(prize); sv2.parentNode.innerHTML = claimHtml(r); if (m && !$("nv-n").value) $("nv-n").value = (m.name || "").split(" ")[0]; }); };
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
  // weekly champion: last week's #1 on this phone gets half off, once
  (function () { var sv = {}; try { sv = JSON.parse(localStorage.getItem("nalu-board") || "{}"); } catch (e) {} if (!sv.n) return; var lw = wkey(1), k = "nalu-champ-" + lw; try { if (localStorage.getItem(k)) return; } catch (e) {}
    fetch(BAPI + "?game=" + BGAME + "&week=" + lw).then(function (r) { return r.json(); }).then(function (rows) { if (rows[0] && rows[0].name === sv.n && window.SSAI_WIN) { var r = window.SSAI_WIN("Weekly champion: half off your meal"); try { localStorage.setItem(k, "1"); } catch (e) {} if (!r.blocked) toast("lifeguard_f", "👑 Last week's #1! Half off your meal · " + r.prize.c); } }).catch(function () {}); })();

  // Easter egg: the Melody banner plane
  function melodyEgg() {
    var key = "nalu-melody-egg-" + new Date().toDateString(), code; try { code = localStorage.getItem(key); } catch (e) {}
    sfx("egg"); if (!code) { code = "MELODY-" + Math.random().toString(36).slice(2, 6).toUpperCase(); try { localStorage.setItem(key, code); } catch (e) {} gain(500, W / 2, 120, "EASTER EGG!"); }
    var o = document.createElement("div"); o.className = "nv-ov"; o.style.zIndex = 5;
    o.innerHTML = "<h3 style='font-size:26px'>✈️ You found it!</h3><p>Nalu Vida's sister spot by LAX says hi.</p><div class='nv-win'>Show this at <b>Melody Bar &amp; Grill</b><br>$3 off any drink<br><span style='font:900 20px ui-monospace,Menlo,monospace;color:#ffd23f'>" + code + "</span><br><span style='font-weight:600;font-size:12.5px'>9132 S Sepulveda Blvd · good for 3 days</span></div>" +
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
    drag = { id: e.pointerId, x: p.x, x0: p.x, t0: performance.now(), moved: 0 }; try { cv.setPointerCapture(e.pointerId); } catch (x) {}
  });
  cv.addEventListener("pointermove", function (e) { if (!drag || e.pointerId !== drag.id) return; var p = local(e), dx = p.x - drag.x; drag.x = p.x; drag.moved += Math.abs(dx); G.x += dx * 1.15 / ZOOM * 1.2; G.vx = dx * 60; });
  cv.addEventListener("pointerup", function () { if (drag && drag.moved < 10 && performance.now() - drag.t0 < 280) jump(true); drag = null; });
  cv.addEventListener("pointercancel", function () { drag = null; });
  var keys = {};
  window.addEventListener("keydown", function (e) { if (!G.running) return; if (e.key === "f" || e.key === "F" || e.key === "x" || e.key === "X") { fire(); e.preventDefault(); return; } if (e.key === " " || e.key === "ArrowUp") { jump(true); e.preventDefault(); return; } if (e.key === "ArrowLeft" || e.key === "ArrowRight") { keys[e.key] = 1; e.preventDefault(); } });
  window.addEventListener("keyup", function (e) { keys[e.key] = 0; });
  setInterval(function () { if (keys.ArrowLeft) G.vx = Math.max(-380, G.vx - 90); if (keys.ArrowRight) G.vx = Math.min(380, G.vx + 90); }, 50);
  $("nv-jump").addEventListener("pointerdown", function (e) { e.preventDefault(); e.stopPropagation(); jump(true); buzz(8); });
  $("nv-fire").addEventListener("pointerdown", function (e) { e.preventDefault(); e.stopPropagation(); fire(); });
  $("nv-mute").onclick = function () { audio(); if (AC && AC.state === "suspended") AC.resume(); setMute(!MUTED); }; setMute(MUTED);
  [].forEach.call(wrap.querySelectorAll(".nv-pick button"), function (b) { b.onclick = function () { start(b.getAttribute("data-s")); }; });

  /* ---------- points table under the game ---------- */
  (function () {
    var rows = [["raft_taco", "Island Tacos raft", "+100"], ["raft_mimosa", "Mimosa raft", "+120"], ["raft_burger", "Smash-N-Stack raft", "+150"], ["raft_shrimp", "Coconut Shrimp raft", "+150"],
      ["raft_oysters", "$2 Oysters raft", "+200"], ["drop", "Helicopter drink drop", "+250"], ["boat", "Nalu Vida crew boat toss", "+100–200"], ["", "🌟 Golden Poke Bowl (rare)", "+500"],
      ["", "🏄 Shoot the pier (under it, clean)", "+400"], ["", "🌊 Catch air off a swell", "+150"], ["", "😮 Close call with a shark/eel/jelly", "+50"], ["", "🔄 Round the end of the pier", "+300"],
      ["", "🏁 Finish a lap at Nalu Vida", "+1,000 × lap"], ["", "⭐ Clear a level (5 levels)", "+1,500 × level"], ["", "🔱 Harpoon a shark off", "+300"],
      ["", "🦈 Harpoon / crash a boss", "+20 × damage"], ["shark", "Beat Big Manō (level 3)", "+5,000"], ["shark", "Beat Manō Nui (final boss)", "+15,000"], ["", "🪨 Rocks / closeout wave", "−❤️", 1], ["plane", "Tap the Melody banner plane", "+500 + a Melody deal"], ["", "📺 Ride through Antidote's review billboard (secret)", "+500"], ["buoy", "Lifeguard rescue can", "+1 ❤️"],
      ["shark", "Shark bite", "−❤️", 1], ["eel", "Electric eel zap", "−❤️", 1], ["jelly", "Jellyfish sting", "−❤️", 1], ["", "🪵 Pier piling / boat wake", "−❤️", 1]];
    var st = document.createElement("style");
    st.textContent = ".nv-pts{max-width:430px;margin:14px auto 0;color:inherit}.nv-pts h4{margin:0 0 4px;font:900 18px 'Alfa Slab One',Georgia,serif}.nv-pts p{margin:0 0 8px;font-size:13px;opacity:.85}" +
      ".nv-pts .g{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.nv-pts .r{min-width:0;display:flex;align-items:center;gap:8px;padding:7px 9px;border-radius:12px;background:rgba(6,40,70,.08);border:1px solid rgba(6,60,100,.15);font-size:12.5px;line-height:1.2}" +
      ".nv-pts .r img,.nv-pts .r .e{width:38px;height:38px;flex:none;object-fit:contain;text-align:center;font-size:22px;line-height:38px}.nv-pts .r div.t{min-width:0;display:flex;flex-direction:column;gap:2px}.nv-pts .r b{color:#ff8a3d;font-weight:900}.nv-pts .r.bad b{color:#d33}";
    document.head.appendChild(st);
    var box = document.createElement("div"); box.className = "nv-pts";
    box.innerHTML = "<h4>What everything's worth</h4><p>5 levels, about a minute each, every one faster. Level 3 ends with Big Manō, level 5 with the giant Manō Nui: catch 🔱 harpoons, fire them at sharks, and make the bosses crash into rocks and the pier. Grab 4 in a row without getting hit and every point doubles (×2). 8 in a row = ×3, 12 = ×4, and it keeps climbing. One hit resets the streak. Each lap is faster and pays more.</p><div class='g'>" +
      rows.map(function (r) { var em = r[1].match(/^(\S+)\s/); return "<div class='r" + (r[3] ? " bad" : "") + "'>" + (r[0] ? "<img src='img/game/" + r[0] + ".webp' alt='' loading='lazy'>" : "<div class='e'>" + (em ? em[1] : "") + "</div>") + "<div class='t'><span>" + (r[0] ? r[1] : r[1].replace(/^\S+\s/, "")) + "</span><b>" + r[2] + "</b></div></div>"; }).join("") + "</div>";
    mount.appendChild(box);
  })();

  window.__NV = { radio: function (t, o) { radio(t, o); }, get: function () { return G; }, start: start, end: function () { if (G.running) showEnd(); }, W: W, H: H, PIER_X: PIER_X, fire: fire, boss: function (k) { bossStart(k || 5); }, levelUp: function () { levelUp(); },
    // the start menu's PLAY: show the surfer pick (character select) instead of the old full start screen
    pick: function () { var o = $("nv-start"); o.classList.add("nv-pickonly"); o.querySelector("h3").textContent = "Pick your surfer"; o.style.display = "flex"; } };
  requestAnimationFrame(frame);
})();
