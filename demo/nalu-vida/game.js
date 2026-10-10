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
  var PRIZES = window.NALU_PRIZES || [[9500, "$3 off any drink"], [14000, "Free Jungle Fries"], [20000, "Free Coconut Shrimp"], [28000, "Free Signature Taco plate"]];
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
    ".nv-toast.on{transform:none;opacity:1;visibility:visible}.nv-toast img{width:54px;height:54px;object-fit:contain;flex:none}";
  document.head.appendChild(css);
  mount.innerHTML =
    '<div class="nv-wrap gamebox" data-game>' +
    '<canvas id="nv-water"></canvas><canvas id="cv" data-game></canvas>' +
    '<div class="nv-hud"><div><div class="nv-score" id="nv-score">0</div><span class="nv-mult" id="nv-mult">×1</span><div class="nv-leg" id="nv-leg"></div></div><div><div class="nv-hearts" id="nv-hearts"></div><div class="nv-leg" id="nv-lap"></div><button type="button" id="nv-mute" aria-label="Sound on or off" style="pointer-events:auto;margin-top:6px;float:right;border:0;border-radius:999px;padding:5px 9px;background:rgba(6,24,46,.55);color:#fff;font-size:15px;cursor:pointer">🔊</button></div></div>' +
    '<div class="nv-bar"><i id="nv-prog" style="width:0"></i></div>' +
    '<button type="button" id="nv-jump" aria-label="Jump">JUMP</button>' +
    '<div class="nv-toast" id="nv-toast"><img id="nv-toast-img" alt=""><span id="nv-toast-t"></span></div>' +
    '<div class="nv-ov" id="nv-start"><h3>Ride the Nalu</h3><p>Surf the Venice Pier loop. Grab the food, dodge the bites, and win free food &amp; drinks at Nalu Vida.</p>' +
    '<div class="nv-pick"><button type="button" data-s="f"><img src="img/game/surfer_f.webp" alt="" onerror="this.outerHTML=\'<div class=ph style=font-size:64px;line-height:96px>🏄‍♀️</div>\'">She rides</button>' +
    '<button type="button" data-s="m"><img src="img/game/surfer_m.webp" alt="" onerror="this.outerHTML=\'<div class=ph style=font-size:64px;line-height:96px>🏄‍♂️</div>\'">He rides</button></div>' +
    '<p class="nv-how">Drag to steer · <b>Catch a wave, then tap to jump</b> over the pier (hit the pier without a wave: −1 ❤️, −200) · 5 hearts · Grab food rafts, boat hand-offs and helicopter drops · 4 in a row = ×2, 8 = ×3, and it keeps going · Dodge sharks, eels &amp; jellyfish · Shoot the pier for a bonus · Tap the banner plane 👀</p><p class="nv-how" id="nv-best"></p></div>' +
    '<div class="nv-ov" id="nv-end" style="display:none"></div>' +
    "</div>";
  var wrap = mount.firstChild, gl_c = document.getElementById("nv-water"), cv = document.getElementById("cv"), cx = cv.getContext("2d");
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- images ---------- */
  var IM = {};
  ["surfer_m", "surfer_f", "shark", "eel", "jelly", "gull", "boat", "heli", "plane", "raft_taco", "raft_burger", "raft_oysters", "raft_mimosa", "raft_shrimp",
    "drop", "buoy", "shore", "pier", "pierend", "lifeguard_f", "lifeguard_m", "staff", "palm", "storefront", "wave", "splash"].forEach(function (k) { var i = new Image(); i.decoding = "async"; i.src = "img/game/" + k + ".webp"; IM[k] = i; });
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
    if (GL) { GL.viewport(0, 0, gl_c.width, gl_c.height); GL.uniform2f(U.R, gl_c.width, gl_c.height); GL.uniform1f(U.T, t); GL.uniform1f(U.S, -p); GL.uniform1f(U.SH, sy0); GL.uniform1f(U.K, G.hurt > 0 ? 1.15 : 1); GL.uniform2f(U.C, CAM.x, CAM.y); GL.uniform1f(U.Z, ZOOM); GL.drawArrays(GL.TRIANGLE_STRIP, 0, 4); return; }
    var gr = cx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#0b3b5e"); gr.addColorStop(1, "#1aa3b0"); cx.fillStyle = gr; cx.fillRect(0, 0, W, H);
  }

  /* ---------- sound (synthesized with WebAudio) ---------- */
  var AC = null, MASTER = null, MUTED = false, HELI = null;
  try { MUTED = localStorage.getItem("nalu-mute") === "1"; } catch (e) {}
  function audio() {
    if (AC) return AC;
    try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    MASTER = AC.createGain(); MASTER.gain.value = MUTED ? 0 : 0.8; MASTER.connect(AC.destination);
    // surf: brown noise through a lowpass that swells like waves rolling in
    var len = AC.sampleRate * 4, b = AC.createBuffer(1, len, AC.sampleRate), d = b.getChannelData(0), l = 0;
    for (var i = 0; i < len; i++) { l = (l + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = l * 3.2; }
    var src = AC.createBufferSource(); src.buffer = b; src.loop = true;
    var lp = AC.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 700;
    var g = AC.createGain(); g.gain.value = 0.16; var lfo = AC.createOscillator(), lg = AC.createGain(); lfo.frequency.value = 0.11; lg.gain.value = 0.1; lfo.connect(lg); lg.connect(g.gain);
    var lf2 = AC.createOscillator(), l2 = AC.createGain(); lf2.frequency.value = 0.11; l2.gain.value = 380; lf2.connect(l2); l2.connect(lp.frequency);
    src.connect(lp); lp.connect(g); g.connect(MASTER); src.start(); lfo.start(); lf2.start();
    // helicopter: noise chopped by a ~12 Hz blade pulse; volume set every frame
    var hs = AC.createBufferSource(); hs.buffer = b; hs.loop = true; var hl = AC.createBiquadFilter(); hl.type = "lowpass"; hl.frequency.value = 420;
    var hg = AC.createGain(); hg.gain.value = 0; var chop = AC.createGain(); chop.gain.value = 0.5; var co = AC.createOscillator(); co.type = "square"; co.frequency.value = 12; var cg = AC.createGain(); cg.gain.value = 0.5; co.connect(cg); cg.connect(chop.gain);
    hs.connect(hl); hl.connect(chop); chop.connect(hg); hg.connect(MASTER); hs.start(); co.start(); HELI = hg;
    return AC;
  }
  function tone(type, f0, f1, dur, vol, when) {
    if (!AC || MUTED) return; var t = AC.currentTime + (when || 0), o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(MASTER); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, vol, freq, when) {
    if (!AC || MUTED) return; var t = AC.currentTime + (when || 0), n = AC.createBufferSource(), b = AC.createBuffer(1, AC.sampleRate * dur, AC.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    var f = AC.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = freq || 900; var g = AC.createGain(); g.gain.value = vol;
    n.buffer = b; n.connect(f); f.connect(g); g.connect(MASTER); n.start(t);
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
      o.connect(bp); bp.connect(g); g.connect(MASTER); o.start(t); o2.start(t); o.stop(t + .2); o2.stop(t + .2);
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
  }
  function setMute(m) { MUTED = m; try { localStorage.setItem("nalu-mute", m ? "1" : "0"); } catch (e) {} if (MASTER) MASTER.gain.value = m ? 0 : .8; var b = $("nv-mute"); if (b) b.textContent = m ? "🔇" : "🔊"; }

  /* ---------- state ---------- */
  var G = { running: false, over: false, score: 0, best: 0, lap: 1, dir: 1, phase: "ride", hearts: 3, streak: 0, mult: 1, lastGain: 0, hurt: 0, inv: 0, shake: 0,
    x: 140, yw: 0, vx: 0, ang: 0, cam: 0, lead: LEAD, t: 0, ents: [], fx: [], wake: [], gulls: [], spawn: {}, turn: null, surfer: "f", runId: 0, underPier: 0, pierSide: 0 };
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
  }
  function speed() { return (150 + 22 * (G.lap - 1)) * (G.phase === "ride" ? 1 : 0); }

  /* ---------- spawning ---------- */
  var FOOD = [["raft_taco", "Island Tacos", 100], ["raft_burger", "Smash-N-Stack", 150], ["raft_shrimp", "Coconut Shrimp", 150], ["raft_oysters", "$2 Oysters", 200], ["raft_mimosa", "Mimosa", 120]];
  function ahead(d) { return G.yw + G.dir * d; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[(Math.random() * a.length) | 0]; }
  function laneX() { var x = rnd(30, W - 30); if (Math.abs(x - PIER_X) < PIER_W / 2 + 16) x += (x < PIER_X ? -1 : 1) * (PIER_W / 2 + 18); return x; }
  function add(o) { G.ents.push(o); return o; }
  function food(x, yw, extra) { var f = pick(FOOD); if (Math.random() < 0.06) f = ["raft_burger", "Golden Poke Bowl", 500, 1]; return add(Object.assign({ t: "food", k: f[0], name: f[1], pts: f[2], gold: f[3], x: x, yw: yw, r: 22, bob: Math.random() * 6 }, extra || {})); }
  function hazard() {
    var lv = G.lap, r = Math.random(), x = laneX(), y = ahead(H * 0.75);
    if (r < 0.34) add({ t: "shark", x: x, yw: y, r: 20, st: "fin", vx: 0, vy: 0, lunge: 0 });
    else if (r < 0.62) add({ t: "eel", x: Math.random() < .5 ? -40 : W + 40, yw: y, r: 18, ph: Math.random() * 6, sp: (60 + 15 * lv) * (Math.random() < .5 ? 1 : -1), base: y });
    else add({ t: "jelly", x: x, yw: y, r: 17, ph: Math.random() * 6 });
    if (lv > 1 && Math.random() < 0.15 * lv) add({ t: "jelly", x: laneX(), yw: y + G.dir * 90, r: 17, ph: 0 });
  }
  function boat() { var fromL = Math.random() < .5; add({ t: "boat", x: fromL ? -70 : W + 70, yw: ahead(H * 0.42), vx: fromL ? 95 : -95, r: 34, toss: 0.6 }); }
  function heli() { var fromL = Math.random() < .5; add({ t: "heli", x: fromL ? -60 : W + 60, yw: ahead(H * 0.3), vx: fromL ? 110 : -110, drops: 3, dt: 0.7, sky: 1 }); }
  function plane() { var fromR = Math.random() < .5; add({ t: "plane", x: fromR ? W + 60 : -330, y: rnd(70, 150), vx: fromR ? -70 : 70, sky: 1, scr: 1 }); }
  function swell() { add({ t: "swell", yw: ahead(H * 0.8), x: W / 2, r: 0, hit: 0 }); }
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
    if (m === 2 || m % 2 === 1) toast(Math.random() < .5 ? "lifeguard_f" : "lifeguard_m", pick(["Nice ride! ×" + m, "You're on fire! ×" + m, "Keep it going! ×" + m, "Lifeguards are watching 👀 ×" + m]));
  }
  var tt = 0;
  function toast(img, t) { var e = $("nv-toast"), i = $("nv-toast-img"); if (ok(IM[img])) { i.src = IM[img].src; i.style.display = ""; } else i.style.display = "none"; $("nv-toast-t").textContent = t; e.classList.add("on"); clearTimeout(tt); tt = setTimeout(function () { e.classList.remove("on"); }, 1800); }
  function hurt(why) {
    if (G.inv > 0 || G.phase !== "ride" || G.jump > 0.06) return;
    G.hearts--; G.inv = 1.6; G.hurt = 0.35; G.shake = 10; G.streak = 0; G.mult = 1; buzz([60, 40, 90]);
    pop(G.x, sy(G.yw) - 30, why, "#ff6b6b", 1); sfx(/SHARK/.test(why) ? "bite" : /ZAP/.test(why) ? "zap" : "hit");
    if (G.hearts <= 0) end();
  }

  /* ---------- update ---------- */
  function update(dt) {
    G.t += dt; if (G.inv > 0) G.inv -= dt; if (G.hurt > 0) G.hurt -= dt; if (G.shake > 0) G.shake *= 0.86;
    if (G.phase === "intro") return introStep(dt);
    if (G.phase === "finale") return finaleStep(dt);
    if (G.phase === "turn") return turnStep(dt);
    if (G.phase === "shore") return shoreStep(dt);
    var v = speed();
    G.yw += G.dir * v * dt;
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
    S.food -= dt; S.haz -= dt; S.boat -= dt; S.heli -= dt; S.plane -= dt; S.buoy -= dt; S.swell -= dt;
    if (!nearEnd) {
      if (S.food <= 0) { food(laneX(), ahead(H * 0.75)); if (Math.random() < .45) food(laneX(), ahead(H * 0.75 + 70)); S.food = rnd(0.9, 1.6) / (1 + 0.08 * lv); }
      if (S.haz <= 0) { hazard(); S.haz = rnd(1.5, 2.4) / (1 + 0.18 * (lv - 1)); }
      if (S.boat <= 0) { boat(); S.boat = rnd(11, 16); }
      if (S.heli <= 0) { heli(); S.heli = rnd(18, 26); }
      if (S.buoy <= 0 && G.hearts < 4) { add({ t: "buoy", x: laneX(), yw: ahead(H * 0.75), r: 16 }); S.buoy = rnd(35, 50); }
      if (S.swell <= 0) { swell(); S.swell = rnd(2.2, 3.6); }
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
        if (e.st === "warn") { e.wt -= dt; if (e.wt <= 0) { e.st = "lunge"; var ax = G.x - e.x, ay = G.yw - e.yw, l = Math.hypot(ax, ay) || 1; e.vx = ax / l * (330 + 30 * G.lap); e.vy = ay / l * (330 + 30 * G.lap); } }
        if (e.st === "lunge") { e.x += e.vx * dt; e.yw += e.vy * dt; e.lunge += dt; if (e.lunge > 0.9) e.st = "gone"; }
        else if (e.st === "gone") { e.yw += e.vy * dt * .5; e.x += e.vx * dt * .5; }
      } else if (e.t === "eel") { e.x += e.sp * dt; e.ph += dt; e.yw = e.base + Math.sin(e.ph * 2.2) * 26; e.zap = Math.sin(e.ph * 4.2) > 0.25; }
      else if (e.t === "jelly") { e.ph += dt; e.x += Math.sin(e.ph * .8) * 12 * dt; }
      else if (e.t === "boat") { e.x += e.vx * dt; e.toss -= dt; if (e.toss <= 0 && e.x > 20 && e.x < W - 20) { e.toss = 0.75; tossTo(e.x, e.yw, laneX(), ahead(rnd(120, 230)), "boat"); } }
      else if (e.t === "heli") { e.x += e.vx * dt; e.dt -= dt; if (e.drops > 0 && e.dt <= 0 && e.x > 30 && e.x < W - 30) { e.drops--; e.dt = 0.8; var tx = Math.max(30, Math.min(W - 30, G.x + rnd(-110, 110))); add({ t: "drop", x: tx, yw: ahead(rnd(150, 260)), r: 20, air: 1.4, pts: 250 }); } }
      else if (e.t === "plane") { e.x += e.vx * dt; }
      else if (e.t === "toss") { e.f += dt / e.dur; if (e.f >= 1) { food(e.tx, e.tyw, { from: e.from }); G.ents.splice(i, 1); continue; } }
      else if (e.t === "drop") { e.air -= dt; }
      // collisions
      if (!e.sky && e.t !== "toss" && e.t !== "swell") {
        var d = Math.hypot(e.x - G.x, (e.yw - G.yw)), hitR = e.r + 14;
        if (e.t === "food" && d < hitR + 6) { gain(e.pts, e.x, sy(e.yw), e.gold ? "GOLDEN!" : ""); buzz(10); G.fx.push({ k: "ring", x: e.x, y: sy(e.yw), t: 0 }); G.ents.splice(i, 1); continue; }
        if (e.t === "drop" && e.air <= 0.25 && d < hitR + 8) { gain(e.pts, e.x, sy(e.yw), "DRINK DROP!"); buzz(12); G.ents.splice(i, 1); continue; }
        if (e.t === "buoy" && d < hitR + 6) { G.hearts = Math.min(6, G.hearts + 1); pop(e.x, sy(e.yw), "+1 ❤️ Lifeguard save!", "#ff9db0", 1); toast("lifeguard_f", "Rescue can! +1 heart"); G.ents.splice(i, 1); continue; }
        var danger = e.t === "jelly" || (e.t === "eel" && e.zap) || (e.t === "shark" && e.st === "lunge") || e.t === "boat";
        if (danger && d < hitR) { hurt(e.t === "shark" ? "SHARK BITE!" : e.t === "eel" ? "⚡ ZAPPED!" : e.t === "jelly" ? "Jellyfish sting!" : "Boat wake!"); if (e.t === "shark") e.st = "gone"; continue; }
        if ((e.t === "jelly" || e.t === "eel" || e.t === "shark") && !e.nm && d < hitR + 26 && d >= hitR && (e.t !== "shark" || e.st === "lunge")) { e.nm = 1; gain(50, G.x, py - 40, "close one!"); }
      }
      if (e.t === "swell" && !e.hit && Math.abs(e.yw - G.yw) < 10) { e.hit = 1; G.wave = 2.0; jump(false); sfx("splash"); G.fx.push({ k: "wsplash", x: G.x, y: sy(G.yw), t: 0 }); pop(G.x, sy(G.yw) - 54, "WAVE! TAP TO JUMP", "#7fe3f2"); if (Math.abs(G.vx) > 120) { gain(150, G.x, py - 36, "AIR!"); G.fx.push({ k: "spray", x: G.x, y: py, t: 0 }); } }
      ey = e.scr ? e.y : sy(e.yw);
      if (e.t === "plane" ? (e.x < -360 || e.x > W + 360) : (ey < -260 || ey > H + 260 || e.x < -120 || e.x > W + 120)) G.ents.splice(i, 1);
    }
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
    if (f >= 1) { G.phase = "ride"; G.inv = 1; G.spawn.food = 0.4; G.spawn.haz = 1.6; pop(W / 2, H * .3, "RIDE IN TO NALU VIDA!", "#ffd23f", 1); }
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
    if (big) G.wave = 0;
    G.jumpDur = big ? 0.82 : 0.38; G.jump = G.jumpDur; if (big) { G.jcd = 1.0; sfx("air"); buzz(12); }
    G.jumpFrom = G.x < PIER_X ? -1 : 1; G.fx.push({ k: "spray", x: G.x, y: sy(G.yw), t: 0 });
  }
  function land() {
    G.fx.push({ k: "splash", x: G.x, y: sy(G.yw), t: 0 }); sfx("splash");
    var side = G.x < PIER_X ? -1 : 1;
    if (G.jumpDur > 0.6 && side !== G.jumpFrom && G.yw > -40 && G.yw < END_Y - END_R) { gain(500, G.x, sy(G.yw) - 40, "PIER JUMP!"); }
    G.pierSide = side; G.underPier = 0;
  }
  function tossTo(fx, fyw, tx, tyw, from) { add({ t: "toss", x: fx, yw: fyw, fx: fx, fyw: fyw, tx: tx, tyw: tyw, f: 0, dur: 0.75, from: from }); }

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
      if (e.t === "toss") { e.f += dt / e.dur; if (e.f >= 1) { food(e.tx, e.tyw, { from: e.from }); G.ents.splice(i, 1); } }
      else if (e.t === "plane" || e.t === "heli") e.x += e.vx * dt; }
    G.fx = G.fx.filter(function (f) { f.t += dt; return f.t < (f.k === "txt" ? 1.1 : 0.6); });
    G.wake = G.wake.filter(function (w) { w.t += dt; return w.t < 1.1; });
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
    // wake
    G.wake.forEach(function (w) { cx.globalAlpha = (1 - w.t / 1.1) * .7; cx.fillStyle = "#fff"; cx.beginPath(); cx.arc(w.x, sy(w.yw), w.s * (1 + w.t), 0, 7); cx.fill(); }); cx.globalAlpha = 1;
    // water-level things under the pier deck
    G.ents.forEach(function (e) { if (!e.sky && e.t !== "swell" && e.t !== "toss") drawEnt(e); });
    // player (drawn before the deck so the deck covers you when you shoot the pier)
    drawSurfer();
    drawPier();
    if (G.jump > 0 && G.jumpDur > .6) drawSurfer();   // airborne over the deck: draw the surfer above the pier
    G.ents.forEach(function (e) { if (e.t === "toss") drawEnt(e); });
    // sky layer: gull shadows, gulls, heli, plane
    G.gulls.forEach(function (g) { var flap = Math.sin(g.f * 9) * .15; cx.globalAlpha = .18; cx.fillStyle = "#001018"; cx.beginPath(); cx.ellipse(g.x + 26, g.y + 34, 14, 5, 0, 0, 7); cx.fill(); cx.globalAlpha = 1;
      if (!spr("gull", g.x, g.y, 46 + flap * 40, (g.vx > 0 ? 1 : -1) * Math.PI / 2)) { cx.strokeStyle = "#fff"; cx.lineWidth = 2.5; cx.beginPath(); cx.moveTo(g.x - 12, g.y - 4 + flap * 20); cx.quadraticCurveTo(g.x - 5, g.y - 8, g.x, g.y); cx.quadraticCurveTo(g.x + 5, g.y - 8, g.x + 12, g.y - 4 + flap * 20); cx.stroke(); } });
    G.ents.forEach(function (e) { if (e.sky) drawEnt(e); });
    // effects
    G.fx.forEach(function (f) {
      if (f.k === "txt") { var a = 1 - f.t / 1.1; cx.globalAlpha = Math.max(0, a); cx.font = (f.big ? "900 24px" : "800 15px") + " 'Alfa Slab One',Georgia,serif"; cx.textAlign = "center"; cx.lineWidth = 4; cx.strokeStyle = "rgba(0,20,40,.7)"; cx.strokeText(f.txt, f.x, f.y - f.t * 40); cx.fillStyle = f.col; cx.fillText(f.txt, f.x, f.y - f.t * 40); cx.globalAlpha = 1; }
      else if (f.k === "ring") { cx.strokeStyle = "rgba(255,210,63," + (1 - f.t / .6) + ")"; cx.lineWidth = 3; cx.beginPath(); cx.arc(f.x, f.y, 14 + f.t * 70, 0, 7); cx.stroke(); }
      else if (f.k === "wsplash") { var a2 = Math.max(0, 1 - f.t / .6), s2 = 70 + f.t * 120; if (ok(IM.splash)) spr("splash", f.x, f.y - 6, s2, 0, a2); }
      else if (f.k === "splash") { for (var q2 = 0; q2 < 18; q2++) { var an = q2 / 18 * 6.283, rr2 = f.t * 120; cx.fillStyle = "rgba(255,255,255," + (1 - f.t / .6) + ")"; cx.beginPath(); cx.arc(f.x + Math.cos(an) * rr2, f.y + Math.sin(an) * rr2 * .6, 4 - f.t * 4, 0, 7); cx.fill(); } cx.strokeStyle = "rgba(255,255,255," + (1 - f.t / .6) + ")"; cx.lineWidth = 3; cx.beginPath(); cx.ellipse(f.x, f.y, f.t * 90, f.t * 54, 0, 0, 7); cx.stroke(); }
      else if (f.k === "spray") { for (var k = 0; k < 10; k++) { cx.fillStyle = "rgba(255,255,255," + (1 - f.t / .6) + ")"; cx.beginPath(); cx.arc(f.x + Math.cos(k) * f.t * 80, f.y + Math.sin(k * 2) * f.t * 50, 3, 0, 7); cx.fill(); } }
    });
    if (G.hint > 0 && G.phase === "ride") { cx.save(); cx.setTransform(DPR, 0, 0, DPR, 0, 0); cx.globalAlpha = Math.min(1, G.hint) * (.6 + .4 * Math.sin(G.t * 6)); label("🌊 Catch a wave, then tap to jump the pier", W / 2, H - 40, "#fff"); cx.restore(); }
    if (G.hurt > 0) { cx.fillStyle = "rgba(255,40,60," + G.hurt * .9 + ")"; cx.fillRect(-20, -20, W + 40, H + 40); }
    if ((G.phase === "shore" || G.phase === "finale") && ok(IM.storefront)) {
      var k = Math.min(1, (G.phase === "shore" ? G.shoreT : G.finT) / .5), cw = W - 40, ch = cw * IM.storefront.naturalHeight / IM.storefront.naturalWidth, yy = 64 - (1 - k) * (ch + 80);
      cx.save(); cx.shadowColor = "rgba(0,0,0,.45)"; cx.shadowBlur = 18; cx.beginPath(); if (cx.roundRect) cx.roundRect(20, yy, cw, ch, 14); else cx.rect(20, yy, cw, ch); cx.clip(); cx.drawImage(IM.storefront, 20, yy, cw, ch); cx.restore();
      label(G.phase === "shore" ? "★ Welcome back to Nalu Vida ★" : "★ The Nalu Vida crew pulled you in ★", W / 2, yy + ch + 18, "#ffd23f");
    }
    hud(); jumpBtn();
  }
  // a rolling wave with real depth: dark trough behind, sunlit face, breaking white crest (photo art) and spray
  function drawWave(e) {
    var y = sy(e.yw), up = G.dir > 0 ? 1 : -1, sw = Math.sin(G.t * 1.6 + e.yw * .01) * 4;
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
    if (ok(IM.pier)) { var pw = PIER_W * 1.15, ph = pw * IM.pier.naturalHeight / IM.pier.naturalWidth, base = sy(0), y = base - Math.ceil((base - a) / ph) * ph;
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
    if (blink) return;
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
      cx.translate(x + shift, y); cx.rotate(G.ang + (G.surfer === "m" ? Math.PI : 0) + tilt * .6 + air * .25 * (G.vx > 0 ? 1 : -1)); cx.transform(1, 0, -lean * .35, 1, 0, 0); cx.scale(1 - Math.abs(lean) * .1, 1); cx.drawImage(i, -w / 2, -h / 2, w, h); return true; })();
    cx.restore();
    if (!drew) {
      cx.save(); cx.translate(x, y); cx.rotate(G.ang); var gr = cx.createLinearGradient(0, -30, 0, 30); gr.addColorStop(0, "#ffb02e"); gr.addColorStop(.5, "#ffd23f"); gr.addColorStop(.5, "#2f8fd8"); gr.addColorStop(1, "#173d8f");
      cx.fillStyle = gr; cx.beginPath(); cx.ellipse(0, 0, 10, 30, 0, 0, 7); cx.fill(); cx.fillStyle = G.surfer === "m" ? "#7a4a2a" : "#b5735a"; cx.beginPath(); cx.arc(0, -2, 7, 0, 7); cx.fill(); cx.restore();
    }
  }
  function drawEnt(e) {
    var y = e.scr ? e.y : sy(e.yw), x = e.x;
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
      } else { var a = Math.atan2(e.vx, e.vy) + Math.PI; if (!spr("shark", x, y, 96, a)) { cx.fillStyle = "#4a5866"; cx.beginPath(); cx.ellipse(x, y, 13, 40, a, 0, 7); cx.fill(); } }
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
      spr(FOOD[(e.tx * 7 | 0) % FOOD.length][0], tx, ty, 40 + Math.sin(f * Math.PI) * 12, f * 6);
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
  function jumpBtn() { var b = $("nv-jump"); if (!b) return; var on = G.running && G.phase === "ride", rd = on && G.wave > 0, k = on + "" + rd;
    if (k === lastJ) return; lastJ = k; b.classList.toggle("on", on); b.classList.toggle("ready", rd); b.textContent = rd ? "JUMP 🌊" : "JUMP"; }
  function hud() {
    var s = Math.floor(G.score).toLocaleString(), m = "×" + G.mult + (G.streak >= 3 ? " · " + G.streak + " streak 🔥" : ""), hs = "❤️".repeat(Math.max(0, G.hearts)) + "🤍".repeat(Math.max(0, 5 - G.hearts)),
      leg = G.phase === "turn" ? "Rounding the pier!" : G.phase === "shore" ? "Nalu Vida pit stop" : G.dir > 0 ? "Out to the end of the pier" : "Back to Nalu Vida", key = s + m + hs + leg + G.lap;
    if (key === lastHud) return; lastHud = key;
    $("nv-score").textContent = s; $("nv-mult").textContent = m; $("nv-hearts").textContent = hs; $("nv-leg").textContent = leg; $("nv-lap").textContent = "Lap " + G.lap;
    var pr = G.dir > 0 ? G.yw / END_Y : 1 - G.yw / END_Y; $("nv-prog").style.width = Math.max(0, Math.min(1, pr)) * 100 + "%";
  }

  /* ---------- loop ---------- */
  var last = 0;
  function frame(ts) {
    var dt = Math.min(0.05, (ts - (last || ts)) / 1000); last = ts;
    if (G.running) update(dt); else { G.t += dt; G.cam = G.cam || 260; }
    draw();
    requestAnimationFrame(frame);
  }

  /* ---------- start / end ---------- */
  function start(s) { audio(); if (AC && AC.state === "suspended") AC.resume(); G.surfer = s || G.surfer; G.splashed = 0; reset(); G.running = true; G.over = false; $("nv-start").style.display = "none"; $("nv-end").style.display = "none"; }
  function end() {
    G.phase = "finale"; G.finT = 0; G.finFrom = G.yw; G.finDone = 0; G.ents = G.ents.filter(function (e) { return e.sky; }); sfx("over");
  }
  function showEnd() {
    G.running = false; G.over = true; var sc = Math.floor(G.score); G.score = sc;
    if (sc > G.best) { G.best = sc; try { localStorage.setItem("nalu-best", sc); } catch (e) {} }
    var prize = ""; PRIZES.forEach(function (p) { if (sc >= p[0]) prize = p[1]; });
    var win = "";
    if (prize && window.SSAI_WIN) { var r = window.SSAI_WIN(prize); win = r.blocked ? "🏆 You'd win " + esc(prize) + ", but you already have <b>" + esc(r.prize.t) + "</b> waiting (code " + r.prize.c + ")." : "🏆 You won <b>" + esc(prize) + "</b>!<br><span style='font:900 20px ui-monospace,Menlo,monospace;letter-spacing:.1em;color:#ffd23f'>" + r.prize.c + "</span><br><span style='font-weight:600;font-size:12.5px'>Show this at Nalu Vida · good for 3 days</span>"; }
    else if (prize) win = "🏆 You won <b>" + esc(prize) + "</b>! Join Nalu Vida Rewards below to save it.";
    var next = PRIZES.filter(function (p) { return p[0] > sc; })[0];
    var sv = {}; try { sv = JSON.parse(localStorage.getItem("nalu-board") || "{}"); } catch (e) {}
    $("nv-end").innerHTML = (ok(IM.storefront) ? "<img src='" + IM.storefront.src + "' alt='Nalu Vida' style='width:100%;max-width:330px;border-radius:14px;box-shadow:0 8px 24px rgba(0,0,0,.4);margin-bottom:8px'>" : "") + "<h3>You made it to Nalu Vida! 🌴</h3><p style='font:900 30px system-ui;margin:4px 0'>" + sc.toLocaleString() + "</p><p>Lap " + G.lap + " · best " + G.best.toLocaleString() + "</p>" +
      (win ? "<div class='nv-win'>" + win + "</div>" : next ? "<p>" + (next[0] - sc).toLocaleString() + " more points wins <b>" + esc(next[1]) + "</b></p>" : "") +
      "<button class='nv-btn' id='nv-order' type='button' style='font-size:18px;padding:14px 24px'>🍽️ Head inside &amp; order</button><br>" +
      "<button class='nv-btn' id='nv-again' type='button' style='background:#fff'>🏄 Ride again</button>" +
      "<div class='nv-board'><b>This week's top riders</b> <span id='nv-wk' style='opacity:.7'></span><ol id='nv-list'><li>Loading…</li></ol>" +
      "<input id='nv-n' maxlength='16' placeholder='Name for the board' value='" + esc(sv.n || "") + "'><input id='nv-ig' maxlength='31' placeholder='@instagram (optional)' value='" + (sv.ig ? "@" + esc(sv.ig) : "") + "'>" +
      "<button class='nv-btn' id='nv-post' type='button' style='width:100%;margin-top:6px'>Post my score</button><div id='nv-msg' style='margin-top:6px;font-size:12.5px'></div><div style='font-size:12px;opacity:.8;margin-top:4px'>#1 at the end of the week wins half off their meal.</div></div>";
    $("nv-end").style.display = "flex";
    var fly = document.createElement("button"); fly.type = "button"; fly.className = "nv-fly"; fly.setAttribute("aria-label", "Fly to Melody Bar and Grill");
    fly.innerHTML = "<img src='img/game/plane.webp' alt=''><span>✈ Fly to Melody Bar &amp; Grill · LAX — tap for a deal</span>";
    fly.onclick = function () { var code; try { code = localStorage.getItem("nalu-melody-egg-" + new Date().toDateString()); } catch (e) {}
      if (!code) { code = "MELODY-" + Math.random().toString(36).slice(2, 6).toUpperCase(); try { localStorage.setItem("nalu-melody-egg-" + new Date().toDateString(), code); } catch (e) {} }
      location.href = "../melody-lax/?from=nalu&deal=" + encodeURIComponent(code) + "#play"; };
    $("nv-end").appendChild(fly);
    $("nv-again").onclick = function () { start(); };
    $("nv-order").onclick = function () { $("nv-end").style.display = "none"; var t = document.getElementById("seat") || document.getElementById("food"); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" }); };
    $("nv-post").onclick = post; loadBoard();
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
  window.addEventListener("keydown", function (e) { if (!G.running) return; if (e.key === " " || e.key === "ArrowUp") { jump(true); e.preventDefault(); return; } if (e.key === "ArrowLeft" || e.key === "ArrowRight") { keys[e.key] = 1; e.preventDefault(); } });
  window.addEventListener("keyup", function (e) { keys[e.key] = 0; });
  setInterval(function () { if (keys.ArrowLeft) G.vx = Math.max(-380, G.vx - 90); if (keys.ArrowRight) G.vx = Math.min(380, G.vx + 90); }, 50);
  $("nv-jump").addEventListener("pointerdown", function (e) { e.preventDefault(); e.stopPropagation(); jump(true); buzz(8); });
  $("nv-mute").onclick = function () { audio(); setMute(!MUTED); }; setMute(MUTED);
  [].forEach.call(wrap.querySelectorAll(".nv-pick button"), function (b) { b.onclick = function () { start(b.getAttribute("data-s")); }; });

  /* ---------- points table under the game ---------- */
  (function () {
    var rows = [["raft_taco", "Island Tacos raft", "+100"], ["raft_mimosa", "Mimosa raft", "+120"], ["raft_burger", "Smash-N-Stack raft", "+150"], ["raft_shrimp", "Coconut Shrimp raft", "+150"],
      ["raft_oysters", "$2 Oysters raft", "+200"], ["drop", "Helicopter drink drop", "+250"], ["boat", "Nalu Vida crew boat toss", "+100–200"], ["", "🌟 Golden Poke Bowl (rare)", "+500"],
      ["", "🏄 Shoot the pier (under it, clean)", "+400"], ["", "🌊 Catch air off a swell", "+150"], ["", "😮 Close call with a shark/eel/jelly", "+50"], ["", "🔄 Round the end of the pier", "+300"],
      ["", "🏁 Finish a lap at Nalu Vida", "+1,000 × lap"], ["plane", "Tap the Melody banner plane", "+500 + a Melody deal"], ["buoy", "Lifeguard rescue can", "+1 ❤️"],
      ["shark", "Shark bite", "−❤️", 1], ["eel", "Electric eel zap", "−❤️", 1], ["jelly", "Jellyfish sting", "−❤️", 1], ["", "🪵 Pier piling / boat wake", "−❤️", 1]];
    var st = document.createElement("style");
    st.textContent = ".nv-pts{max-width:430px;margin:14px auto 0;color:inherit}.nv-pts h4{margin:0 0 4px;font:900 18px 'Alfa Slab One',Georgia,serif}.nv-pts p{margin:0 0 8px;font-size:13px;opacity:.85}" +
      ".nv-pts .g{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.nv-pts .r{min-width:0;display:flex;align-items:center;gap:8px;padding:7px 9px;border-radius:12px;background:rgba(6,40,70,.08);border:1px solid rgba(6,60,100,.15);font-size:12.5px;line-height:1.2}" +
      ".nv-pts .r img,.nv-pts .r .e{width:38px;height:38px;flex:none;object-fit:contain;text-align:center;font-size:22px;line-height:38px}.nv-pts .r div.t{min-width:0;display:flex;flex-direction:column;gap:2px}.nv-pts .r b{color:#ff8a3d;font-weight:900}.nv-pts .r.bad b{color:#d33}";
    document.head.appendChild(st);
    var box = document.createElement("div"); box.className = "nv-pts";
    box.innerHTML = "<h4>What everything's worth</h4><p>Grab 4 in a row without getting hit and every point doubles (×2). 8 in a row = ×3, 12 = ×4, and it keeps climbing. One hit resets the streak. Each lap is faster and pays more.</p><div class='g'>" +
      rows.map(function (r) { var em = r[1].match(/^(\S+)\s/); return "<div class='r" + (r[3] ? " bad" : "") + "'>" + (r[0] ? "<img src='img/game/" + r[0] + ".webp' alt='' loading='lazy'>" : "<div class='e'>" + (em ? em[1] : "") + "</div>") + "<div class='t'><span>" + (r[0] ? r[1] : r[1].replace(/^\S+\s/, "")) + "</span><b>" + r[2] + "</b></div></div>"; }).join("") + "</div>";
    mount.appendChild(box);
  })();

  window.__NV = { get: function () { return G; }, start: start, W: W, H: H, PIER_X: PIER_X };
  requestAnimationFrame(frame);
})();
