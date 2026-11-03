/* SousShift AI seasonal theme: THANKSGIVING (calendar.json: 11-01 .. 11-27, Los Angeles time). Loaded by ../seasons.js only.
   Everything is modelled in code with three.js (no image/model files, no paid credits, nothing to license):
     · Roast turkey: a plump LatheGeometry body with two drumsticks (meat cone + bone) and tucked wings, on a ceramic
       platter. Roasted skin is a procedural canvas texture - golden through mahogany, crisped patches, glossy render
       and a little char - with a separate gloss map so the basting shine sits where the light is.
     · Glazed ham: lathe bulb, spiral diamond scoring and amber glaze painted into the texture, protruding bone,
       three pineapple rings (tori) with cherries.
     · Pumpkin pie: crimped crust (torus + texture), custard top, a dollop of cream.
     · All three sit half off-screen in the corners at different depths, low opacity, breathing gently, with warm
       additive steam wisps rising off the two hot dishes.
     · Autumn leaves: a maple-lobed Shape extruded to a flat blade, curled and fluttered in a custom shader (centre
       vein bend, edge flutter, backlit rim) in four colours - crimson, burnt orange, amber, ochre. Two leaves always
       drift down far away. After 5 s of no touch/scroll/motion, leaves spawn one by one high up, spiral down and
       float TOWARD the camera, gathering in a slow swirl around the last finger position. Any scroll / swipe / tap /
       shake blows them outward and away, and the idle timer restarts.
     · Sound: a soft synthesized leaf rustle (band-passed noise bursts) as each leaf drifts in, and a warmer gust when
       they scatter. Quiet, only after the first tap, mutable from the 🦃 button.
   Reduced motion: the food only, one frame, no leaves. No WebGL / low-end: light CSS version. */
(function () {
  "use strict";
  var S = window.SSAISeason;
  if (!S) return;

  /* ---------------- sound ---------------- */
  var lastRustle = 0, noiseBuf = null;
  function noise(ac) {
    if (noiseBuf) return noiseBuf;
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }
  function out(ac, pan) {
    var g = ac.createGain(); g.gain.value = 0;
    if (ac.createStereoPanner) { var p = ac.createStereoPanner(); p.pan.value = Math.max(-0.8, Math.min(0.8, pan || 0)); g.connect(p); p.connect(ac.destination); }
    else g.connect(ac.destination);
    return g;
  }
  // dry leaf rustle: three short band-passed noise taps, high and papery
  function rustle(ac, pan) {
    var now = performance.now(); if (now - lastRustle < 1500) return; lastRustle = now;
    var t = ac.currentTime, g = out(ac, pan);
    g.gain.setValueAtTime(0, t);
    for (var i = 0; i < 3; i++) {
      var o = t + i * 0.085 + Math.random() * 0.04;
      g.gain.linearRampToValueAtTime(0.022 * (1 - i * 0.22), o + 0.012);
      g.gain.linearRampToValueAtTime(0.0015, o + 0.07);
    }
    g.gain.linearRampToValueAtTime(0, t + 0.42);
    var n = ac.createBufferSource(), bp = ac.createBiquadFilter(), hp = ac.createBiquadFilter();
    n.buffer = noise(ac); n.loop = true;
    bp.type = "bandpass"; bp.Q.value = 1.1; bp.frequency.setValueAtTime(2400 + Math.random() * 900, t);
    bp.frequency.linearRampToValueAtTime(1500, t + 0.42);
    hp.type = "highpass"; hp.frequency.value = 900;
    n.connect(hp); hp.connect(bp); bp.connect(g);
    n.start(t); n.stop(t + 0.46);
  }
  // scatter gust: a wider, lower sweep with a touch of body, like wind through a pile
  function gust(ac) {
    var t = ac.currentTime, g = out(ac, 0), n = ac.createBufferSource(), bp = ac.createBiquadFilter();
    n.buffer = noise(ac); bp.type = "bandpass"; bp.Q.value = 0.8;
    bp.frequency.setValueAtTime(1900, t); bp.frequency.exponentialRampToValueAtTime(320, t + 0.7);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.03, t + 0.09); g.gain.linearRampToValueAtTime(0, t + 0.78);
    n.connect(bp); bp.connect(g); n.start(t); n.stop(t + 0.8);
  }

  /* ---------------- procedural textures ---------------- */
  function rnd(seed) { var r = seed * 9301 + 49297; return function () { r = (r * 9301 + 49297) % 233280; return r / 233280; }; }
  function cv(w, h) { var c = document.createElement("canvas"); c.width = w; c.height = h; return c; }

  // roasted skin: golden belly through mahogany shoulders, crisped blotches, basting gloss, a little char
  function turkeyTextures(THREE) {
    var W = 1024, H = 512, col = cv(W, H), gl = cv(512, 256), a = col.getContext("2d"), s = gl.getContext("2d"), R = rnd(7);
    var vg = a.createLinearGradient(0, 0, 0, H);
    vg.addColorStop(0, "#5d2a0c"); vg.addColorStop(0.16, "#8d4612"); vg.addColorStop(0.42, "#c0792a");
    vg.addColorStop(0.62, "#d89042"); vg.addColorStop(0.84, "#a85c18"); vg.addColorStop(1, "#4e2208");
    a.fillStyle = vg; a.fillRect(0, 0, W, H);
    // crisped blotches: irregular darker patches with a lighter rim, the way skin pulls as it roasts
    for (var i = 0; i < 46; i++) {
      var x = R() * W, y = 60 + R() * (H - 120), rx = 26 + R() * 62, ry = rx * (0.5 + R() * 0.5), rot = R() * 6.28;
      a.save(); a.translate(x, y); a.rotate(rot);
      var bg = a.createRadialGradient(0, 0, rx * 0.2, 0, 0, rx);
      bg.addColorStop(0, "rgba(96,44,8,.5)"); bg.addColorStop(0.72, "rgba(132,66,14,.28)"); bg.addColorStop(1, "rgba(226,160,80,0)");
      a.fillStyle = bg; a.beginPath(); a.ellipse(0, 0, rx, ry, 0, 0, 6.2832); a.fill(); a.restore();
    }
    // pebbled skin + salt flecks
    for (var p = 0; p < 2600; p++) {
      var px = R() * W, py = R() * H, dark = R() < 0.55;
      a.fillStyle = dark ? "rgba(84,38,6," + (0.05 + R() * 0.14) + ")" : "rgba(255,214,150," + (0.04 + R() * 0.13) + ")";
      a.beginPath(); a.ellipse(px, py, 1 + R() * 3.4, 1 + R() * 2.2, R() * 3, 0, 6.2832); a.fill();
    }
    // char at the very top (where the oven hits hardest) and a few burnt edges
    var cg = a.createLinearGradient(0, 0, 0, 90);
    cg.addColorStop(0, "rgba(38,16,4,.72)"); cg.addColorStop(1, "rgba(38,16,4,0)");
    a.fillStyle = cg; a.fillRect(0, 0, W, 90);
    for (var c = 0; c < 14; c++) { a.fillStyle = "rgba(30,12,2," + (0.2 + R() * 0.4) + ")"; a.beginPath(); a.ellipse(R() * W, 20 + R() * 70, 10 + R() * 26, 5 + R() * 12, R() * 3, 0, 6.2832); a.fill(); }
    // gloss map: shine on the upper belly where fat pools, dull on the char
    s.fillStyle = "#3a3a3a"; s.fillRect(0, 0, 512, 256);
    var sg = s.createLinearGradient(0, 0, 0, 256);
    sg.addColorStop(0, "#1c1c1c"); sg.addColorStop(0.45, "#cfcfcf"); sg.addColorStop(0.72, "#efefef"); sg.addColorStop(1, "#2a2a2a");
    s.fillStyle = sg; s.fillRect(0, 0, 512, 256);
    for (var q = 0; q < 160; q++) { s.fillStyle = "rgba(0,0,0," + (0.1 + R() * 0.3) + ")"; s.beginPath(); s.ellipse(R() * 512, R() * 256, 4 + R() * 22, 3 + R() * 12, R() * 3, 0, 6.2832); s.fill(); }
    var t1 = new THREE.CanvasTexture(col), t2 = new THREE.CanvasTexture(gl);
    t1.anisotropy = t2.anisotropy = 2;
    return { map: t1, gloss: t2 };
  }

  // ham: amber-mahogany glaze with the classic diamond scoring cut into it
  function hamTextures(THREE) {
    var W = 1024, H = 512, col = cv(W, H), a = col.getContext("2d"), R = rnd(23);
    var vg = a.createLinearGradient(0, 0, 0, H);
    vg.addColorStop(0, "#6b1f10"); vg.addColorStop(0.2, "#9c3514"); vg.addColorStop(0.46, "#c85a1d");
    vg.addColorStop(0.66, "#d9741f"); vg.addColorStop(0.88, "#9a3a10"); vg.addColorStop(1, "#5a1a0c");
    a.fillStyle = vg; a.fillRect(0, 0, W, H);
    // diamond score: two sets of parallel cuts. Dark groove with a caramelised bright lip on the lower side.
    function cuts(dx) {
      a.save(); a.lineCap = "round";
      for (var k = -14; k < 30; k++) {
        var off = k * 78;
        a.beginPath(); a.moveTo(off, -40); a.lineTo(off + dx * (H + 80), H + 40);
        a.strokeStyle = "rgba(60,16,4,.62)"; a.lineWidth = 11; a.stroke();
        a.beginPath(); a.moveTo(off + 6, -40); a.lineTo(off + 6 + dx * (H + 80), H + 40);
        a.strokeStyle = "rgba(255,196,110,.3)"; a.lineWidth = 4; a.stroke();
      }
      a.restore();
    }
    cuts(0.85); cuts(-0.85);
    // sticky glaze pooling in the grooves + sugar crystals catching the light
    for (var g = 0; g < 70; g++) {
      var x = R() * W, y = R() * H, r = 14 + R() * 46;
      var rg = a.createRadialGradient(x, y, 2, x, y, r);
      rg.addColorStop(0, "rgba(255,186,86,.26)"); rg.addColorStop(1, "rgba(255,186,86,0)");
      a.fillStyle = rg; a.beginPath(); a.arc(x, y, r, 0, 6.2832); a.fill();
    }
    for (var c = 0; c < 700; c++) { a.fillStyle = "rgba(255,232,180," + (0.1 + R() * 0.35) + ")"; a.fillRect(R() * W, R() * H, 1 + R() * 2, 1 + R() * 2); }
    var t = new THREE.CanvasTexture(col); t.anisotropy = 2;
    return { map: t };
  }

  // pumpkin pie custard: baked orange with a darker set ring, cracks and a dusting of spice
  function pieTexture(THREE) {
    var N = 512, c = cv(N, N), a = c.getContext("2d"), R = rnd(41), h = N / 2;
    a.fillStyle = "#00000000"; a.fillRect(0, 0, N, N);
    var rg = a.createRadialGradient(h, h, 10, h, h, h);
    rg.addColorStop(0, "#d98b34"); rg.addColorStop(0.55, "#c67526"); rg.addColorStop(0.84, "#a85a18"); rg.addColorStop(1, "#8a4411");
    a.fillStyle = rg; a.beginPath(); a.arc(h, h, h, 0, 6.2832); a.fill();
    for (var i = 0; i < 26; i++) { // set cracks radiating from the middle
      var ang = R() * 6.2832, len = h * (0.2 + R() * 0.55), x = h + Math.cos(ang) * h * 0.12, y = h + Math.sin(ang) * h * 0.12;
      a.beginPath(); a.moveTo(x, y);
      a.quadraticCurveTo(x + Math.cos(ang + 0.4) * len * 0.6, y + Math.sin(ang + 0.4) * len * 0.6, x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      a.strokeStyle = "rgba(120,58,12,.34)"; a.lineWidth = 1 + R() * 2.4; a.stroke();
    }
    for (var s = 0; s < 900; s++) { // cinnamon / nutmeg dusting
      var sx = R() * N, sy = R() * N; if ((sx - h) * (sx - h) + (sy - h) * (sy - h) > h * h) continue;
      a.fillStyle = "rgba(" + (R() < 0.5 ? "92,44,10," : "60,28,6,") + (0.12 + R() * 0.3) + ")"; a.fillRect(sx, sy, 1 + R() * 2, 1 + R() * 2);
    }
    var t = new THREE.CanvasTexture(c); t.anisotropy = 2; return t;
  }

  // crust: flaky golden pastry with crimp shadows across it
  function crustTexture(THREE) {
    var W = 512, H = 128, c = cv(W, H), a = c.getContext("2d"), R = rnd(59);
    var g = a.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#8a4e14"); g.addColorStop(0.4, "#d79a44"); g.addColorStop(0.7, "#e8b05c"); g.addColorStop(1, "#8a4e14");
    a.fillStyle = g; a.fillRect(0, 0, W, H);
    for (var k = 0; k < 34; k++) { // crimps
      var x = k / 34 * W;
      var cg = a.createLinearGradient(x - 7, 0, x + 7, 0);
      cg.addColorStop(0, "rgba(104,54,12,0)"); cg.addColorStop(0.5, "rgba(104,54,12,.6)"); cg.addColorStop(1, "rgba(104,54,12,0)");
      a.fillStyle = cg; a.fillRect(x - 7, 0, 14, H);
      var hg = a.createLinearGradient(x + 7, 0, x + 15, 0);
      hg.addColorStop(0, "rgba(255,216,150,.34)"); hg.addColorStop(1, "rgba(255,216,150,0)");
      a.fillStyle = hg; a.fillRect(x + 7, 0, 8, H);
    }
    for (var f = 0; f < 420; f++) { a.fillStyle = "rgba(" + (R() < 0.5 ? "110,56,12," : "255,226,170,") + (0.07 + R() * 0.2) + ")"; a.fillRect(R() * W, R() * H, 1 + R() * 3, 1 + R() * 2); }
    var t = new THREE.CanvasTexture(c); t.anisotropy = 2; return t;
  }

  function glowTexture(THREE) {
    var N = 128, c = cv(N, N), a = c.getContext("2d"), g = a.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2);
    g.addColorStop(0, "rgba(255,255,255,.85)"); g.addColorStop(0.35, "rgba(255,236,200,.3)"); g.addColorStop(1, "rgba(255,220,170,0)");
    a.fillStyle = g; a.fillRect(0, 0, N, N);
    return new THREE.CanvasTexture(c);
  }

  /* ---------------- geometry ---------------- */
  // plump roast bird: wide at the thighs, tapering to the neck end
  function turkeyBody(THREE) {
    var pts = [], P = [[0.02, -0.52], [0.26, -0.55], [0.46, -0.5], [0.58, -0.36], [0.64, -0.16], [0.655, 0.04], [0.62, 0.22], [0.54, 0.37], [0.42, 0.48], [0.26, 0.55], [0.1, 0.57], [0.02, 0.56]];
    P.forEach(function (p) { pts.push(new THREE.Vector2(p[0], p[1])); });
    var g = new THREE.LatheGeometry(pts, 26);
    g.scale(1.18, 1, 0.92);   // a roast is wider across than it is deep
    g.computeVertexNormals();
    return g;
  }
  function drumstick(THREE) {
    var pts = [], P = [[0.015, -0.3], [0.08, -0.29], [0.1, -0.2], [0.095, -0.06], [0.13, 0.06], [0.19, 0.16], [0.215, 0.26], [0.2, 0.35], [0.14, 0.41], [0.05, 0.43], [0.01, 0.42]];
    P.forEach(function (p) { pts.push(new THREE.Vector2(p[0], p[1])); });
    var g = new THREE.LatheGeometry(pts, 14); g.computeVertexNormals(); return g;
  }
  function hamBody(THREE) {
    var pts = [], P = [[0.02, -0.48], [0.3, -0.5], [0.5, -0.42], [0.6, -0.26], [0.635, -0.06], [0.6, 0.14], [0.5, 0.3], [0.36, 0.42], [0.2, 0.5], [0.08, 0.54], [0.02, 0.54]];
    P.forEach(function (p) { pts.push(new THREE.Vector2(p[0], p[1])); });
    var g = new THREE.LatheGeometry(pts, 24); g.scale(1, 1, 0.94); g.computeVertexNormals(); return g;
  }
  // a maple-ish leaf: five lobes mirrored around the central vein, flat blade, UV 0..1 with x=0.5 on the vein
  function leafGeometry(THREE) {
    var sh = new THREE.Shape();
    var L = [[0, -0.5], [0.07, -0.3], [0.1, -0.16], [0.3, -0.2], [0.26, -0.05], [0.47, -0.02], [0.33, 0.14], [0.44, 0.26], [0.24, 0.27], [0.2, 0.44], [0.08, 0.34], [0, 0.5]];
    sh.moveTo(L[0][0], L[0][1]);
    for (var i = 1; i < L.length; i++) sh.quadraticCurveTo(L[i - 1][0] * 0.6 + L[i][0] * 0.4, L[i - 1][1] * 0.4 + L[i][1] * 0.6, L[i][0], L[i][1]);
    for (var j = L.length - 2; j >= 0; j--) sh.quadraticCurveTo(-(L[j + 1][0] * 0.4 + L[j][0] * 0.6), L[j + 1][1] * 0.6 + L[j][1] * 0.4, -L[j][0], L[j][1]);
    sh.closePath();
    var g = new THREE.ShapeGeometry(sh, 7);
    g.computeBoundingBox();
    var bb = g.boundingBox, pos = g.attributes.position, uv = g.attributes.uv;
    var sx = bb.max.x - bb.min.x, sy = bb.max.y - bb.min.y;
    for (var k = 0; k < pos.count; k++) uv.setXY(k, (pos.getX(k) - bb.min.x) / sx, (pos.getY(k) - bb.min.y) / sy);
    uv.needsUpdate = true;
    g.computeVertexNormals();
    return g;
  }

  var LEAF_VS = [
    "uniform float uTime; uniform float uSeed; uniform float uCurl;",
    "varying vec2 vUv; varying float vShade;",
    "void main(){",
    "  vUv = uv;",
    "  vec3 p = position;",
    "  float s = uSeed;",
    // curl the blade up around the central vein, and bow it along the vein like a dried leaf
    "  float a = abs(p.x);",
    "  p.z += a * a * (1.6 + 0.5 * sin(uTime * 0.8 + s)) * uCurl;",
    "  p.z += (p.y * p.y) * 0.7 * uCurl;",
    // edge flutter, strongest at the tips
    "  p.z += sin(p.x * 7.0 + uTime * 3.4 + s) * 0.035 * a * 2.0;",
    "  p.y += sin(p.x * 5.0 + uTime * 2.6 + s * 1.7) * 0.012;",
    "  vShade = 0.72 + 0.28 * (1.0 - a * 1.6) + 0.18 * p.z;",
    "  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);",
    "}"
  ].join("\n");

  var LEAF_FS = [
    "precision mediump float;",
    "uniform vec3 uColA; uniform vec3 uColB; uniform float uOpacity;",
    "varying vec2 vUv; varying float vShade;",
    "void main(){",
    "  vec2 q = vUv - 0.5;",
    // base: darker at the stem end, warmer at the tips, mottled like a real fallen leaf
    "  float grad = smoothstep(-0.5, 0.5, q.y);",
    "  vec3 col = mix(uColA, uColB, grad);",
    "  float blotch = sin(vUv.x * 19.0) * sin(vUv.y * 23.0);",
    "  col *= 0.93 + 0.07 * blotch;",
    // central vein + five side veins fanning out from it
    "  float vein = smoothstep(0.035, 0.0, abs(q.x));",
    "  for (int i = 0; i < 5; i++) {",
    "    float k = (float(i) - 2.0) * 0.42;",
    "    float d = abs(q.x * cos(k) - (q.y - 0.06) * sin(k));",
    "    vein = max(vein, smoothstep(0.02, 0.0, d) * smoothstep(0.52, 0.1, length(q)));",
    "  }",
    "  col = mix(col, col * 1.42 + 0.06, vein * 0.75);",
    // thin dry edge, and backlit translucency toward the tips
    "  float edge = smoothstep(0.42, 0.5, length(q));",
    "  col = mix(col, col * 0.55, edge * 0.5);",
    "  col *= vShade;",
    "  col += vec3(0.16, 0.07, 0.0) * grad * 0.5;",
    "  gl_FragColor = vec4(col, uOpacity);",
    "}"
  ].join("\n");

  var LEAF_COLS = [
    [[0.42, 0.06, 0.04], [0.74, 0.16, 0.07]],   // crimson maple
    [[0.52, 0.17, 0.03], [0.88, 0.42, 0.08]],   // burnt orange
    [[0.60, 0.34, 0.05], [0.94, 0.68, 0.18]],   // amber
    [[0.38, 0.26, 0.07], [0.70, 0.52, 0.14]]    // ochre oak
  ];

  /* ---------------- the 3D scene ---------------- */
  function setup(ctx) {
    var THREE = ctx.THREE, sz = ctx.size();
    var renderer = new THREE.WebGLRenderer({ canvas: ctx.canvas, alpha: true, antialias: sz.dpr < 1.5, powerPreference: "low-power", premultipliedAlpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(sz.dpr);
    var scene = new THREE.Scene();
    var cam = new THREE.PerspectiveCamera(50, sz.w / sz.h, 0.5, 60);
    cam.position.set(0, 0, 10);
    var TAN = Math.tan((cam.fov / 2) * Math.PI / 180);
    function halfH(z) { return TAN * (cam.position.z - z); }
    function halfW(z) { return halfH(z) * cam.aspect; }

    // warm late-afternoon light: low sun from the left, a soft fill, and two small hearth lamps on the hot dishes
    scene.add(new THREE.AmbientLight(0xffd2a0, 0.32));
    var sun = new THREE.DirectionalLight(0xfff0cf, 1.55); sun.position.set(-4, 5, 7); scene.add(sun);
    var rim = new THREE.DirectionalLight(0xff9a4a, 0.42); rim.position.set(5, -2, 3); scene.add(rim);

    var glowT = glowTexture(THREE);
    var tTex = turkeyTextures(THREE), hTex = hamTextures(THREE), pTex = pieTexture(THREE), cTex = crustTexture(THREE);
    var bodyG = turkeyBody(THREE), drumG = drumstick(THREE), hamG = hamBody(THREE);

    var boneMat = new THREE.MeshStandardMaterial({ color: 0xf2e6cf, roughness: 0.78, transparent: true, opacity: 0.66 });
    var platterMat = new THREE.MeshStandardMaterial({ color: 0xf6f1e6, roughness: 0.34, metalness: 0.05, transparent: true, opacity: 0.58 });
    var OP = 0.78;   // under full opacity so app text keeps reading, but enough to read as food over a photo

    function steam(n, spread, y) {   // warm additive wisps rising off a hot dish
      var arr = [];
      for (var i = 0; i < n; i++) {
        var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, color: 0xffe2bc, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
        sp.scale.set(0.5, 0.75, 1);
        sp.position.set((Math.random() - 0.5) * spread, y, 0.2);
        arr.push({ s: sp, ph: Math.random() * 6.28, x0: sp.position.x, y0: y });
      }
      return arr;
    }

    function makeTurkey() {
      var g = new THREE.Group();
      var mat = new THREE.MeshStandardMaterial({ map: tTex.map, roughnessMap: tTex.gloss, roughness: 0.62, metalness: 0.04, transparent: true, opacity: OP });
      g.add(new THREE.Mesh(bodyG, mat));
      [-1, 1].forEach(function (sx) {   // drumsticks crossed at the front, bone ends up
        var d = new THREE.Group(), meat = new THREE.Mesh(drumG, mat), bone = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.2, 8), boneMat);
        bone.position.y = -0.36; d.add(meat, bone);
        d.position.set(sx * 0.3, -0.1, 0.52); d.rotation.set(0.5, 0, sx * 0.55); d.scale.setScalar(1.05);
        g.add(d);
      });
      [-1, 1].forEach(function (sx) {   // wings tucked against the sides
        var w = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10), mat);
        w.scale.set(0.42, 0.78, 0.95); w.position.set(sx * 0.68, -0.02, -0.02); w.rotation.z = sx * 0.3;
        g.add(w);
      });
      var pl = new THREE.Mesh(new THREE.CylinderGeometry(1.06, 0.92, 0.075, 28), platterMat);
      pl.position.y = -0.58; g.add(pl);
      var st = steam(3, 0.9, 0.62); st.forEach(function (x) { g.add(x.s); });
      return { g: g, mats: [mat], steam: st };
    }

    function makeHam() {
      var g = new THREE.Group();
      var mat = new THREE.MeshStandardMaterial({ map: hTex.map, roughness: 0.3, metalness: 0.12, transparent: true, opacity: OP });
      g.add(new THREE.Mesh(hamG, mat));
      var bone = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.3, 10), boneMat);
      bone.position.y = 0.62; g.add(bone);
      var ringG = new THREE.TorusGeometry(0.085, 0.026, 7, 14), ringM = new THREE.MeshStandardMaterial({ color: 0xf0c23e, roughness: 0.42, transparent: true, opacity: OP });
      var cherryM = new THREE.MeshStandardMaterial({ color: 0x9c1020, roughness: 0.26, transparent: true, opacity: OP });
      [[-0.07, 0.3, 0.52], [-0.34, 0.04, 0.46], [0.3, 0.1, 0.46]].forEach(function (p) {
        var r = new THREE.Mesh(ringG, ringM); r.position.set(p[0], p[1], p[2]); r.rotation.x = 0.2; g.add(r);
        var ch = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), cherryM); ch.position.set(p[0], p[1], p[2] + 0.03); g.add(ch);
      });
      var pl = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.74, 0.07, 24), platterMat);
      pl.position.y = -0.52; g.add(pl);
      var st = steam(2, 0.7, 0.5); st.forEach(function (x) { g.add(x.s); });
      return { g: g, mats: [mat, ringM, cherryM], steam: st };
    }

    function makePie() {
      var g = new THREE.Group();
      var fill = new THREE.MeshStandardMaterial({ map: pTex, roughness: 0.68, transparent: true, opacity: OP });
      var crust = new THREE.MeshStandardMaterial({ map: cTex, roughness: 0.82, transparent: true, opacity: OP });
      var tin = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.52, 0.2, 28), crust);
      var top = new THREE.Mesh(new THREE.CircleGeometry(0.58, 28), fill);
      top.rotation.x = -Math.PI / 2; top.position.y = 0.101;
      var rimM = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.075, 8, 30), crust);
      rimM.rotation.x = Math.PI / 2; rimM.position.y = 0.1;
      var cream = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 9), new THREE.MeshStandardMaterial({ color: 0xfffaf0, roughness: 0.6, transparent: true, opacity: OP }));
      cream.scale.set(1, 0.72, 1); cream.position.set(0.1, 0.17, 0.05);
      g.add(tin, top, rimM, cream);
      return { g: g, mats: [fill, crust, cream.material], steam: [] };
    }

    // nx, ny in screen units (-1..1), depth, scale, builder. The turkey is the hero: nearest, biggest, bottom-left
    // where the thumb already is. Everything sits at |nx| < 0.9 so a whole dish is on screen, not a sliver of one.
    var SPOTS = [
      { nx: -0.84, ny: -0.80, z: -1, s: 1.05, make: makeTurkey },
      { nx: 0.88, ny: -0.66, z: -4, s: 1.15, make: makeHam },
      { nx: 0.86, ny: 0.80, z: -7, s: 1.10, make: makePie },
      { nx: -0.88, ny: 0.62, z: -10, s: 1.00, make: makeTurkey }
    ];
    var dishes = SPOTS.map(function (sp, i) {
      var d = sp.make();
      d.g.scale.setScalar(sp.s);
      scene.add(d.g);
      return { g: d.g, mats: d.mats, steam: d.steam, sp: sp, ph: i * 1.9 + 0.3, bx: 0, by: 0 };
    });
    function placeDishes() {
      dishes.forEach(function (d) {
        var sp = d.sp;
        d.bx = sp.nx * halfW(sp.z); d.by = sp.ny * halfH(sp.z);
        d.g.position.set(d.bx, d.by, sp.z);
        d.g.rotation.set(-sp.ny * 0.16, -sp.nx * 0.5, sp.nx * 0.05);
      });
    }

    /* leaves */
    var leafG = leafGeometry(THREE);
    var leaves = [], MAX = 10;
    function makeLeaf(ci, ambient) {
      var c = LEAF_COLS[ci], seed = Math.random() * 100;
      var mat = new THREE.ShaderMaterial({
        vertexShader: LEAF_VS, fragmentShader: LEAF_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide,
        uniforms: {
          uTime: { value: 0 }, uSeed: { value: seed }, uCurl: { value: 0.5 + Math.random() * 0.5 }, uOpacity: { value: 0 },
          uColA: { value: new THREE.Color(c[0][0], c[0][1], c[0][2]) }, uColB: { value: new THREE.Color(c[1][0], c[1][1], c[1][2]) }
        }
      });
      var m = new THREE.Mesh(leafG, mat);
      m.renderOrder = 2;
      scene.add(m);
      return {
        g: m, mat: mat, seed: seed, op: 0, ambient: !!ambient, state: ambient ? "ambient" : "approach",
        pos: new THREE.Vector3(), vel: new THREE.Vector3(), spin: new THREE.Vector3(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28),
        rate: new THREE.Vector3((Math.random() - 0.5) * 1.4, (Math.random() - 0.5) * 1.8, (Math.random() - 0.5) * 1.1),
        sc: 0.9 + Math.random() * 0.7, ox: 0, oy: 0, tz: 0, swirl: Math.random() * 6.28, fall: 0.5 + Math.random() * 0.5
      };
    }
    function removeLeaf(l) { scene.remove(l.g); l.mat.dispose(); leaves.splice(leaves.indexOf(l), 1); }
    function pointerWorld(z) { return { x: (ctx.pointer.x * 2 - 1) * halfW(z), y: -(ctx.pointer.y * 2 - 1) * halfH(z) }; }

    if (!ctx.reduced) for (var a = 0; a < 2; a++) {
      var amb = makeLeaf(a ? 3 : 1, true);
      amb.pos.set((a ? 1 : -1) * 2.5, 3 + a * 1.2, -13 - a * 2);
      amb.g.scale.setScalar(amb.sc * 0.9);
      leaves.push(amb);
    }

    var crowd = false, spawnT = 0, spawned = 0, t0 = 0;
    ctx.on("idle", function () { if (ctx.reduced) return; crowd = true; spawnT = 0; spawned = 0; });
    function scatter(silent) {
      crowd = false;
      var blown = 0, w = pointerWorld(0);
      leaves.forEach(function (l) {
        if (l.ambient || l.state === "flee") return;
        blown++;
        l.state = "flee";
        var dx = l.pos.x - w.x * 0.3, dy = l.pos.y - w.y * 0.3, len = Math.sqrt(dx * dx + dy * dy) || 1;
        l.vel.set(dx / len * (4 + Math.random() * 4), dy / len * (3 + Math.random() * 4) + 1.5, -(7 + Math.random() * 7));
        l.rate.multiplyScalar(3.2);
      });
      var ac = ctx.audio(); if (blown && ac && !silent) gust(ac);
    }
    ctx.on("wake", function () { scatter(false); });
    ctx.on("shake", function () { scatter(false); });
    ctx.on("block", function (b) { if (b) scatter(true); else if (ctx.isIdle()) { crowd = true; spawnT = 0.3; spawned = 0; } });

    function frame(dt, t, still) {
      if (still && !t0) t = 0;
      t0 = t;
      // dishes: a slow breath, and the steam curling up off the hot ones
      dishes.forEach(function (d) {
        if (!ctx.reduced) {
          d.g.position.y = d.by + Math.sin(t * 0.55 + d.ph) * 0.07 * d.sp.s;
          d.g.rotation.z = d.sp.nx * 0.05 + Math.sin(t * 0.4 + d.ph) * 0.028;
        }
        d.steam.forEach(function (x, i) {
          var k = ((t * 0.26 + x.ph) % 1);
          x.s.material.opacity = (ctx.reduced ? 0.2 : 0.3) * Math.sin(k * Math.PI) * 0.8;
          x.s.position.y = x.y0 + k * 1.15;
          x.s.position.x = x.x0 + Math.sin(k * 4 + x.ph) * 0.17 * k;
          var g = 0.42 + k * 1.5;
          x.s.scale.set(g * 0.62, g, 1);
        });
      });
      if (!ctx.reduced) {
        // while idle, leaves drift in one at a time
        if (crowd && spawned < MAX) {
          spawnT -= dt;
          if (spawnT <= 0) {
            spawnT = 0.7 + Math.random() * 0.45; spawned++;
            var l = makeLeaf(Math.floor(Math.random() * 4), false), z0 = -15;
            l.pos.set((Math.random() * 2 - 1) * halfW(z0) * 0.85, halfH(z0) * (0.75 + Math.random() * 0.3), z0);
            var kk = spawned * 2.39996, rad = 0.35 + 0.22 * Math.sqrt(spawned);   // golden-angle ring around the thumb
            l.ox = Math.cos(kk) * rad; l.oy = Math.sin(kk) * rad * 1.25;
            l.tz = 1.2 + Math.random() * 3.6;
            leaves.push(l);
            var ac = ctx.audio(); if (ac) rustle(ac, l.pos.x / halfW(z0));
          }
        }
        for (var i = leaves.length - 1; i >= 0; i--) {
          var L = leaves[i], s = L.seed, P = L.pos, target = 0;
          if (L.state === "ambient") {
            var hw = halfW(P.z), hh = halfH(P.z);
            P.y -= dt * 0.3 * L.fall;
            P.x += Math.sin(t * 0.4 + s) * dt * 0.5;
            if (P.y < -hh - 2) { P.y = hh + 2; P.x = (Math.random() * 2 - 1) * hw * 0.8; }
            target = 0.3;
          } else if (L.state === "approach") {
            // fall and spiral in toward the camera, settling around the last finger position
            P.z += (L.tz - P.z) * Math.min(1, dt * 0.2) + dt * 0.3 * (P.z < L.tz ? 1 : 0);
            if (P.z > L.tz) P.z = L.tz;
            L.swirl += dt * 0.9;
            var w = pointerWorld(P.z), sc = halfH(P.z) / 3;
            var tx = w.x + (L.ox + Math.cos(L.swirl) * 0.16) * sc, ty = w.y + (L.oy + Math.sin(L.swirl) * 0.16) * sc;
            P.x += (tx - P.x) * Math.min(1, dt * 0.85);
            P.y += (ty - P.y) * Math.min(1, dt * 0.7) - dt * 0.1;
            // the closer and bigger it gets, the more transparent, so nothing it crosses becomes hard to read
            target = 0.6 - 0.33 * Math.min(1, Math.max(0, (P.z + 4) / 8));
          } else {
            P.addScaledVector(L.vel, dt); L.vel.multiplyScalar(1 + dt * 0.5); L.vel.y -= dt * 1.2;
            target = 0;
            if (L.op <= 0.01 || P.z < -40) { removeLeaf(L); continue; }
          }
          if (L.state === "flee") L.op = Math.max(0, L.op - dt * 0.7);
          else L.op += (target - L.op) * Math.min(1, dt * 1.6);
          var fx = Math.sin(t * 0.8 + s) * 0.3, fy = Math.sin(t * 1.15 + s * 1.4) * 0.14;
          L.g.position.set(P.x + fx, P.y + fy, P.z);
          L.g.rotation.set(L.spin.x + L.rate.x * t, L.spin.y + L.rate.y * t, L.spin.z + L.rate.z * t);
          L.g.scale.setScalar(L.sc);
          L.mat.uniforms.uTime.value = t;
          L.mat.uniforms.uOpacity.value = L.op;
          L.g.visible = L.op > 0.005;
        }
      }
      renderer.render(scene, cam);
    }
    function resize(w, h, dpr) {
      renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
      cam.aspect = w / h; cam.updateProjectionMatrix();
      placeDishes();
    }
    function dispose() { renderer.dispose(); try { renderer.forceContextLoss(); } catch (e) {} }
    S.__dbg = { leaves: leaves, dishes: dishes, scene: scene, renderer: renderer };   // read by tests/the checklist only
    return { frame: frame, resize: resize, dispose: dispose, static: ctx.reduced };
  }

  /* ---------------- light 2D version (no WebGL / low-end) ---------------- */
  function fallback(ctx) {
    var d = document.createElement("div"), anim = !ctx.reduced;
    d.className = "ssai-season-2d"; d.setAttribute("aria-hidden", "true");
    var st = document.createElement("style");
    st.textContent = ".ssai-season-2d{position:fixed;inset:0;z-index:35;pointer-events:none;overflow:hidden;contain:strict}" +
      ".ssai-season-2d i{position:absolute;font-style:normal;line-height:1;opacity:.55;filter:drop-shadow(0 4px 14px rgba(180,80,20,.5))}" +
      ".ssai-season-2d i.l{opacity:.32;filter:none}" +
      (anim ? "@keyframes ssaiBob{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-7px) rotate(-2deg)}}" +
        "@keyframes ssaiFall{0%{transform:translate(0,-12vh) rotate(0)}100%{transform:translate(14vw,112vh) rotate(420deg)}}" +
        ".ssai-season-2d i.f{animation:ssaiBob 5.5s ease-in-out infinite}" +
        ".ssai-season-2d i.l{animation:ssaiFall 17s linear infinite}" : "");
    document.head.appendChild(st);
    d.innerHTML = '<i class="f" style="left:-18px;bottom:-12px;font-size:62px">🦃</i>' +
      '<i class="f" style="right:-16px;bottom:11%;font-size:52px;animation-delay:-1.8s">🍖</i>' +
      '<i class="f" style="right:-14px;top:8%;font-size:44px;animation-delay:-3.4s">🥧</i>' +
      (anim ? '<i class="l" style="left:12%;top:0;font-size:30px">🍁</i><i class="l" style="left:62%;top:0;font-size:26px;animation-delay:-8s">🍂</i>' : "");
    document.body.appendChild(d);
    return { setVisible: function (v) { d.style.display = v ? "" : "none"; } };
  }

  S.define({ id: "thanksgiving", label: "Thanksgiving", icon: "🦃", three: true, shake: true, setup: setup, fallback: fallback });
})();
