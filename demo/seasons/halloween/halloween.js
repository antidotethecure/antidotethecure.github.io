/* SousShift AI seasonal theme: HALLOWEEN (calendar.json: 10-01 .. 10-31, Los Angeles time). Loaded by ../seasons.js only.
   Everything is modelled in code with three.js (no image/model files, no paid credits):
     · Jack-o'-lanterns: ribbed LatheGeometry pumpkin, bent stem, carved triangle eyes / nose / jagged mouth painted into
       procedural colour + emissive canvas textures, a flickering candle (emissive + warm point light + additive glow sprite).
       Four of them at different depths, tucked half off-screen in the corners, slowly bobbing, low opacity.
     · Sheet ghosts: a draped-sheet lathe (head + flared skirt) animated in a custom shader (folds, wavy hem, sway, arm
       bumps, fresnel translucency) in four variants: tall, short, round, wavy. Dark eye holes (+ an "O" mouth on some).
       Two faint ghosts always drift far away. After 5 s of no touch/scroll/motion, ghosts pop in one by one far away and
       float TOWARD the camera, crowding around the last finger position. Any scroll / swipe / tap / shake makes them
       flee away from the camera and fade, then the idle timer restarts.
     · Sound: a soft synthesized "woooo" (WebAudio: vibrato sine + hollow triangle + band-passed noise; no audio file,
       nothing to license) as each ghost approaches, and a short whoosh when they scatter. Quiet, only after the first
       tap, mutable from the 👻 button.
   Reduced motion: static pumpkins only (one frame, no ghosts, steady glow). No WebGL / low-end: light CSS version. */
(function () {
  "use strict";
  var S = window.SSAISeason;
  if (!S) return;

  /* ---------------- sound ---------------- */
  var lastWoo = 0, noiseBuf = null;
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
  function woo(ac, pan) {
    var now = performance.now(); if (now - lastWoo < 1700) return; lastWoo = now;
    var t = ac.currentTime, dur = 2.1, base = 200 + Math.random() * 60, vol = 0.03;
    var g = out(ac, pan);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.55); g.gain.linearRampToValueAtTime(vol * 0.7, t + 1.3); g.gain.linearRampToValueAtTime(0, t + dur);
    var lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900; lp.connect(g);
    var o1 = ac.createOscillator(), o2 = ac.createOscillator(), lfo = ac.createOscillator(), lg = ac.createGain(), g2 = ac.createGain();
    o1.type = "sine"; o2.type = "triangle"; g2.gain.value = 0.25;
    [o1.frequency, o2.frequency].forEach(function (f, i) {
      var k = i ? 1.5 : 1;
      f.setValueAtTime(base * k, t); f.linearRampToValueAtTime(base * 1.55 * k, t + 0.7); f.exponentialRampToValueAtTime(base * 0.8 * k, t + dur);
    });
    lfo.frequency.value = 5.2; lg.gain.value = 10; lfo.connect(lg); lg.connect(o1.frequency); lg.connect(o2.frequency);
    o1.connect(lp); o2.connect(g2); g2.connect(lp);
    var n = ac.createBufferSource(), bp = ac.createBiquadFilter(), ng = ac.createGain();
    n.buffer = noise(ac); bp.type = "bandpass"; bp.Q.value = 0.9; ng.gain.value = 0.35;
    bp.frequency.setValueAtTime(350, t); bp.frequency.linearRampToValueAtTime(1300, t + 0.8); bp.frequency.linearRampToValueAtTime(300, t + dur);
    n.connect(bp); bp.connect(ng); ng.connect(g);
    [o1, o2, lfo, n].forEach(function (s) { s.start(t); s.stop(t + dur + 0.05); });
  }
  function whoosh(ac) {
    var t = ac.currentTime, g = out(ac, 0), n = ac.createBufferSource(), bp = ac.createBiquadFilter();
    n.buffer = noise(ac); bp.type = "bandpass"; bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(1400, t); bp.frequency.exponentialRampToValueAtTime(260, t + 0.55);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.025, t + 0.06); g.gain.linearRampToValueAtTime(0, t + 0.6);
    n.connect(bp); bp.connect(g); n.start(t); n.stop(t + 0.65);
  }

  /* ---------------- procedural textures ---------------- */
  function pumpkinTextures(THREE, seed) {
    var Wd = 1024, Ht = 512, cx = 512;
    function cv() { var c = document.createElement("canvas"); c.width = Wd; c.height = Ht; return c; }
    var col = cv(), em = cv(), a = col.getContext("2d"), e = em.getContext("2d");
    // skin: warm orange, darker toward the ribs' grooves, top and bottom, speckles
    var vg = a.createLinearGradient(0, 0, 0, Ht);
    vg.addColorStop(0, "#9a4a0c"); vg.addColorStop(0.18, "#e0731c"); vg.addColorStop(0.5, "#f08a2a"); vg.addColorStop(0.82, "#d96a17"); vg.addColorStop(1, "#7c3a08");
    a.fillStyle = vg; a.fillRect(0, 0, Wd, Ht);
    for (var k = 0; k < 8; k++) { // grooves sit at u = (2k+1)/16
      var gx = (2 * k + 1) / 16 * Wd, gg = a.createLinearGradient(gx - 40, 0, gx + 40, 0);
      gg.addColorStop(0, "rgba(120,50,5,0)"); gg.addColorStop(0.5, "rgba(120,50,5,.55)"); gg.addColorStop(1, "rgba(120,50,5,0)");
      a.fillStyle = gg; a.fillRect(gx - 40, 0, 80, Ht);
      var hx = (k / 8) * Wd, hg = a.createLinearGradient(hx - 50, 0, hx + 50, 0); // lobe highlight
      hg.addColorStop(0, "rgba(255,190,110,0)"); hg.addColorStop(0.5, "rgba(255,190,110,.18)"); hg.addColorStop(1, "rgba(255,190,110,0)");
      a.fillStyle = hg; a.fillRect(hx - 50, 0, 100, Ht);
    }
    var r = seed * 9301 + 49297;
    function rnd() { r = (r * 9301 + 49297) % 233280; return r / 233280; }
    for (var s = 0; s < 900; s++) { a.fillStyle = "rgba(" + (rnd() < 0.5 ? "90,40,5," : "255,200,120,") + (0.05 + rnd() * 0.1) + ")"; a.fillRect(rnd() * Wd, rnd() * Ht, 1 + rnd() * 3, 1 + rnd() * 6); }

    // the carved face (centre of the texture, u = 0.5, faces the camera)
    var eyeY = 196, ew = 80, eh = 70;
    function face(c) {
      c.beginPath();
      // triangle eyes, tilted a little for an angry look
      c.moveTo(cx - 140, eyeY + eh / 2); c.lineTo(cx - 140 + ew, eyeY + eh / 2 + 6); c.lineTo(cx - 140 + ew * 0.55, eyeY - eh / 2); c.closePath();
      c.moveTo(cx + 140, eyeY + eh / 2); c.lineTo(cx + 140 - ew, eyeY + eh / 2 + 6); c.lineTo(cx + 140 - ew * 0.55, eyeY - eh / 2); c.closePath();
      // nose
      c.moveTo(cx - 22, 272); c.lineTo(cx + 22, 272); c.lineTo(cx, 238); c.closePath();
      // jagged grin with teeth
      var L = cx - 190, R = cx + 190, top = 300, bot = 360;
      c.moveTo(L, top - 18);
      c.quadraticCurveTo(cx, top + 26, R, top - 18);
      c.lineTo(R - 22, top + 14); c.lineTo(R - 48, top + 6);
      c.quadraticCurveTo(cx + 120, bot + 10, cx, bot + 6);
      c.quadraticCurveTo(cx - 120, bot + 10, L + 48, top + 6);
      c.lineTo(L + 22, top + 14); c.closePath();
      c.fill("evenodd");
    }
    // teeth (skin left in the cut): two hanging from the top lip, one rising from the bottom
    function teeth(c, fill) {
      c.fillStyle = fill;
      [[-75, 0], [75, 0]].forEach(function (t) { c.fillRect(cx + t[0] - 16, 312, 32, 22); });
      [[0, 1]].forEach(function (t) { c.fillRect(cx + t[0] - 18, 338, 36, 22); });
    }
    // colour: dark burnt carving with a pale cut-flesh rim
    a.save(); a.lineJoin = "round"; a.strokeStyle = "#f6c886"; a.lineWidth = 12; a.fillStyle = "#f6c886"; face(a); a.stroke(); a.restore();
    a.save(); a.fillStyle = "#4a1f04"; face(a); a.restore();
    teeth(a, "#e9822a");
    // emissive: the candle seen through the holes, hot centre, soft bloom around the cuts
    e.fillStyle = "#000"; e.fillRect(0, 0, Wd, Ht);
    e.save(); e.filter = "blur(10px)"; e.fillStyle = "#b34a00"; face(e); e.restore();
    var fg = e.createRadialGradient(cx, 270, 10, cx, 270, 230);
    fg.addColorStop(0, "#fff3c0"); fg.addColorStop(0.45, "#ffc048"); fg.addColorStop(1, "#ff7a10");
    e.fillStyle = fg; face(e);
    teeth(e, "#000");
    var t1 = new THREE.CanvasTexture(col), t2 = new THREE.CanvasTexture(em);
    t1.colorSpace = THREE.SRGBColorSpace; t2.colorSpace = THREE.SRGBColorSpace;
    t1.anisotropy = t2.anisotropy = 2;
    return { map: t1, emissive: t2 };
  }
  function glowTexture(THREE) {
    var c = document.createElement("canvas"); c.width = c.height = 128;
    var g = c.getContext("2d"), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, "rgba(255,210,120,1)"); r.addColorStop(0.35, "rgba(255,140,40,.45)"); r.addColorStop(1, "rgba(255,90,0,0)");
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
    var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }

  /* ---------------- geometry ---------------- */
  function pumpkinGeometry(THREE) {
    var pts = [], N = 22;
    for (var i = 0; i <= N; i++) {
      var a = -Math.PI / 2 + Math.PI * i / N, s = Math.sin(a), r = Math.max(0.0001, Math.cos(a));
      var y = 0.8 * s - (s > 0 ? 0.2 * Math.pow(s, 14) : -0.12 * Math.pow(-s, 14)); // dimpled top and bottom
      pts.push(new THREE.Vector2(r * (1 + 0.03 * Math.sin(a * 3)), y));
    }
    var g = new THREE.LatheGeometry(pts, 48), p = g.attributes.position;
    for (var j = 0; j < p.count; j++) {
      var x = p.getX(j), z = p.getZ(j), phi = Math.atan2(x, z);
      var lobe = Math.pow(Math.abs(Math.cos(phi * 4)), 0.38); // 8 lobes, narrow grooves
      var k = 0.9 + 0.1 * lobe + 0.012 * Math.sin(phi * 13 + p.getY(j) * 5);
      p.setX(j, x * k); p.setZ(j, z * k);
    }
    g.rotateY(Math.PI); // texture centre (u = 0.5) faces +z, the camera
    g.computeVertexNormals();
    return g;
  }
  function stemGeometry(THREE) {
    var g = new THREE.CylinderGeometry(0.06, 0.12, 0.42, 7, 5), p = g.attributes.position;
    for (var i = 0; i < p.count; i++) {
      var y = p.getY(i) + 0.21, ang = Math.atan2(p.getX(i), p.getZ(i)), k = 1 + 0.12 * Math.cos(ang * 5);
      p.setX(i, p.getX(i) * k + y * y * 0.9); p.setZ(i, p.getZ(i) * k);
    }
    g.computeVertexNormals();
    return g;
  }
  var GHOST_VARIANTS = [
    { name: "tall",  R: 0.5,  L: 2.1, flare: 0.6,  folds: 7,  amp: 0.07, arm: 0.12, mouth: false },
    { name: "short", R: 0.56, L: 1.15, flare: 0.5, folds: 6,  amp: 0.06, arm: 0.10, mouth: false },
    { name: "round", R: 0.72, L: 1.0, flare: 0.25, folds: 8,  amp: 0.05, arm: 0.0,  mouth: true },
    { name: "wavy",  R: 0.5,  L: 1.7, flare: 0.75, folds: 10, amp: 0.13, arm: 0.15, mouth: true }
  ];
  function ghostGeometry(THREE, v) {
    var pts = [], i;
    for (i = 0; i <= 8; i++) { var a = (Math.PI / 2) * i / 8; pts.push(new THREE.Vector2(Math.max(0.0001, v.R * Math.sin(a)), -v.R * (1 - Math.cos(a)))); }
    for (i = 1; i <= 14; i++) {
      var t = i / 14, r = v.R * (1 + v.flare * Math.pow(t, 1.6)) * (1 - 0.07 * Math.sin(Math.PI * t));
      pts.push(new THREE.Vector2(r, -v.R - (v.L - v.R) * t));
    }
    var g = new THREE.LatheGeometry(pts, 28);
    g.translate(0, v.L * 0.5, 0);
    g.computeVertexNormals();
    g.userData = { headY: v.L * 0.5 - v.R, hemY: -v.L * 0.5 };
    return g;
  }
  var GHOST_VS = [
    "uniform float uTime, uSeed, uFolds, uAmp, uArm, uHeadY, uHemY, uSway;",
    "varying vec3 vN; varying vec3 vV; varying float vH;",
    "void main(){",
    "  vec3 p = position;",
    "  float h = clamp((uHeadY - p.y) / (uHeadY - uHemY), 0.0, 1.0);",
    "  float ang = atan(p.x, p.z);",
    "  float w = sin(ang * uFolds + uTime * 1.7 + uSeed) * 0.6 + sin(ang * (uFolds + 3.0) - uTime * 1.1 + uSeed * 2.0) * 0.4;",
    "  float arms = exp(-pow((abs(ang) - 1.5708) / 0.38, 2.0)) * exp(-pow((h - 0.3) / 0.16, 2.0));",
    "  p.xz *= 1.0 + w * uAmp * h * h + arms * uArm;",
    "  p.y += sin(ang * uFolds * 0.5 + uTime * 2.0 + uSeed) * 0.09 * h * h * h;",
    "  p.x += sin(uTime * 1.3 + p.y * 1.6 + uSeed) * uSway * h;",
    "  p.z += cos(uTime * 1.1 + p.y * 1.3 + uSeed) * uSway * 0.6 * h;",
    "  vec4 mv = modelViewMatrix * vec4(p, 1.0);",
    "  vN = normalize(normalMatrix * normal); vV = -mv.xyz; vH = h;",
    "  gl_Position = projectionMatrix * mv;",
    "}"
  ].join("\n");
  var GHOST_FS = [
    "uniform float uOpacity;",
    "varying vec3 vN; varying vec3 vV; varying float vH;",
    "void main(){",
    "  vec3 n = normalize(vN), v = normalize(vV);",
    "  float facing = abs(dot(n, v));",
    "  float rim = 1.0 - facing;",
    "  float lit = 0.78 + 0.22 * abs(dot(n, normalize(vec3(-0.35, 0.85, 0.4))));",
    "  vec3 col = mix(vec3(0.95, 0.97, 1.0), vec3(1.0), rim) * lit * 1.08;",
    "  float a = uOpacity * (0.42 + 0.58 * pow(rim, 1.4)) * (1.0 - 0.45 * smoothstep(0.82, 1.0, vH));",
    "  gl_FragColor = vec4(col, a);",
    "}"
  ].join("\n");

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

    scene.add(new THREE.AmbientLight(0x8a7aa8, 0.9));
    var moon = new THREE.DirectionalLight(0xbfd0ff, 1.1); moon.position.set(-3, 5, 6); scene.add(moon);

    /* pumpkins */
    var pg = pumpkinGeometry(THREE), sg = stemGeometry(THREE), glowT = glowTexture(THREE);
    var stemMat = new THREE.MeshStandardMaterial({ color: 0x5b5a24, roughness: 0.95, transparent: true, opacity: 0.66 });
    var SPOTS = [ // nx, ny in screen units (-1..1), depth, scale, tilt
      { nx: -1.08, ny: -0.86, z: -1, s: 1.0 },
      { nx: 1.1,   ny: -0.7,  z: -4, s: 1.15 },
      { nx: -1.06, ny: 0.84,  z: -6, s: 1.1 },
      { nx: 1.08,  ny: 0.62,  z: -10, s: 1.35 }
    ];
    var pumpkins = SPOTS.map(function (sp, i) {
      var tex = pumpkinTextures(THREE, i + 3);
      var mat = new THREE.MeshStandardMaterial({ map: tex.map, emissiveMap: tex.emissive, emissive: 0xffffff, emissiveIntensity: 1.6, roughness: 0.55, metalness: 0, transparent: true, opacity: 0.66 });
      var grp = new THREE.Group(), body = new THREE.Mesh(pg, mat), stem = new THREE.Mesh(sg, stemMat);
      stem.position.set(0, 0.66, 0); stem.rotation.z = (i % 2 ? 1 : -1) * 0.25; stem.rotation.y = i;
      var glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, color: 0xffa040, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.45 }));
      glow.position.set(0, -0.05, 1.05); glow.scale.set(2.4, 2.0, 1);
      var light = new THREE.PointLight(0xff8a2a, 5, 4.5, 2); light.position.set(0, 0, 1.3);
      grp.add(body, stem, glow, light);
      grp.scale.setScalar(sp.s);
      scene.add(grp);
      return { g: grp, mat: mat, glow: glow, light: light, sp: sp, ph: i * 1.7 + 0.4 };
    });
    function placePumpkins() {
      pumpkins.forEach(function (p) {
        var sp = p.sp;
        p.bx = sp.nx * halfW(sp.z); p.by = sp.ny * halfH(sp.z);
        p.g.position.set(p.bx, p.by, sp.z);
        p.g.rotation.set(-sp.ny * 0.18, -sp.nx * 0.45, sp.nx * 0.06);
      });
    }

    /* ghosts */
    var geos = GHOST_VARIANTS.map(function (v) { return ghostGeometry(THREE, v); });
    var eyeGeo = new THREE.SphereGeometry(1, 12, 8);
    var ghosts = [], MAX = 9;
    function makeGhost(vi, ambient) {
      var v = GHOST_VARIANTS[vi], geo = geos[vi], seed = Math.random() * 100;
      var mat = new THREE.ShaderMaterial({
        vertexShader: GHOST_VS, fragmentShader: GHOST_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide,
        uniforms: { uTime: { value: 0 }, uSeed: { value: seed }, uFolds: { value: v.folds }, uAmp: { value: v.amp }, uArm: { value: v.arm },
          uHeadY: { value: geo.userData.headY }, uHemY: { value: geo.userData.hemY }, uSway: { value: 0.08 }, uOpacity: { value: 0 } }
      });
      var eyeMat = new THREE.MeshBasicMaterial({ color: 0x0a0a14, transparent: true, opacity: 0, depthWrite: false });
      var grp = new THREE.Group(), body = new THREE.Mesh(geo, mat);
      body.renderOrder = 2; grp.add(body);
      var hy = geo.userData.headY + v.R * 0.05, ex = v.R * 0.34;
      [-1, 1].forEach(function (sx) {
        var e = new THREE.Mesh(eyeGeo, eyeMat), y = hy + v.R * 0.12, z = Math.sqrt(Math.max(0, v.R * v.R - ex * ex - (y - geo.userData.headY) * (y - geo.userData.headY)));
        e.scale.set(v.R * 0.15, v.R * 0.22, 0.03); e.position.set(sx * ex, y, z * 0.99 + 0.005); e.rotation.y = sx * 0.3; e.renderOrder = 3; grp.add(e);
      });
      if (v.mouth) { var m = new THREE.Mesh(eyeGeo, eyeMat); m.scale.set(v.R * 0.12, v.R * 0.16, 0.03); m.position.set(0, hy - v.R * 0.3, v.R * 0.92); m.renderOrder = 3; grp.add(m); }
      scene.add(grp);
      return { g: grp, mat: mat, eyeMat: eyeMat, v: v, seed: seed, op: 0, ambient: !!ambient, state: ambient ? "ambient" : "approach",
        pos: new THREE.Vector3(), vel: new THREE.Vector3(), age: 0, ox: 0, oy: 0, tz: 0 };
    }
    function removeGhost(gh) { scene.remove(gh.g); gh.mat.dispose(); gh.eyeMat.dispose(); ghosts.splice(ghosts.indexOf(gh), 1); }
    function pointerWorld(z) { return { x: (ctx.pointer.x * 2 - 1) * halfW(z), y: -(ctx.pointer.y * 2 - 1) * halfH(z) }; }

    if (!ctx.reduced) for (var a = 0; a < 2; a++) {
      var amb = makeGhost(a ? 1 : 3, true);
      amb.pos.set((a ? 1 : -1) * 2, 2.5 + a * 1.5, -12 - a * 2); amb.dir = a ? -1 : 1; amb.g.scale.setScalar(0.8);
      ghosts.push(amb);
    }

    var crowd = false, spawnT = 0, spawned = 0, t0 = 0;
    ctx.on("idle", function () { if (ctx.reduced) return; crowd = true; spawnT = 0; spawned = 0; });
    function scatter(silent) {
      crowd = false;
      var fled = 0, w = pointerWorld(0);
      ghosts.forEach(function (gh) {
        if (gh.ambient || gh.state === "flee") return;
        fled++;
        gh.state = "flee";
        var dx = gh.pos.x - w.x * 0.3, dy = gh.pos.y - w.y * 0.3, l = Math.sqrt(dx * dx + dy * dy) || 1;
        gh.vel.set(dx / l * (3 + Math.random() * 3), dy / l * (3 + Math.random() * 3), -(9 + Math.random() * 7));
      });
      var ac = ctx.audio(); if (fled && ac && !silent) whoosh(ac);
    }
    ctx.on("wake", function () { scatter(false); });
    ctx.on("block", function (b) { if (b) scatter(true); });

    function frame(dt, t, still) {
      if (still && !t0) t = 0;
      t0 = t;
      // pumpkins: bob, sway, candle flicker
      pumpkins.forEach(function (p, i) {
        var f = ctx.reduced ? 0.9 : 0.78 + 0.12 * Math.sin(t * 11 + p.ph * 3) + 0.08 * Math.sin(t * 23.3 + p.ph) + (Math.random() - 0.5) * 0.09;
        p.mat.emissiveIntensity = 1.7 * f;
        p.light.intensity = 5 * f;
        p.glow.material.opacity = 0.34 * f;
        if (!ctx.reduced) {
          p.g.position.y = p.by + Math.sin(t * 0.7 + p.ph) * 0.09 * p.sp.s;
          p.g.rotation.z = p.sp.nx * 0.06 + Math.sin(t * 0.5 + p.ph) * 0.04;
        }
      });
      if (!ctx.reduced) {
        // spawn one by one while idle
        if (crowd && spawned < MAX) {
          spawnT -= dt;
          if (spawnT <= 0) {
            spawnT = 0.75 + Math.random() * 0.4; spawned++;
            var gh = makeGhost(Math.floor(Math.random() * 4), false), z0 = -16;
            gh.pos.set((Math.random() * 2 - 1) * halfW(z0) * 0.8, (Math.random() * 2 - 1) * halfH(z0) * 0.7, z0);
            var k = spawned * 2.39996, rad = 0.35 + 0.22 * Math.sqrt(spawned); // golden-angle ring around the thumb
            gh.ox = Math.cos(k) * rad; gh.oy = Math.sin(k) * rad * 1.3;
            gh.tz = 1.5 + Math.random() * 3.5;
            ghosts.push(gh);
            var ac = ctx.audio(); if (ac) woo(ac, gh.pos.x / halfW(z0));
          }
        }
        for (var i = ghosts.length - 1; i >= 0; i--) {
          var g = ghosts[i], s = g.seed; g.age += dt;
          var target = 0, P = g.pos;
          if (g.state === "ambient") {
            var hw = halfW(P.z);
            P.x += g.dir * dt * 0.35; if (P.x > hw + 2) P.x = -hw - 2; if (P.x < -hw - 2) P.x = hw + 2;
            target = 0.32;
          } else if (g.state === "approach") {
            P.z += (g.tz - P.z) * Math.min(1, dt * 0.22) + dt * 0.35 * (P.z < g.tz ? 1 : 0);
            if (P.z > g.tz) P.z = g.tz;
            var w = pointerWorld(P.z), sc = halfH(P.z) / 3;
            P.x += (w.x + g.ox * sc - P.x) * Math.min(1, dt * 0.9);
            P.y += (w.y + g.oy * sc - P.y) * Math.min(1, dt * 0.9);
            // less opaque the closer it gets, so text under it stays readable
            target = 0.62 - 0.34 * Math.min(1, Math.max(0, (P.z + 4) / 8));
          } else if (g.state === "flee") {
            P.addScaledVector(g.vel, dt); g.vel.multiplyScalar(1 + dt * 0.6);
            target = 0;
            if (g.op <= 0.01 || P.z < -40) { removeGhost(g); continue; }
          }
          if (g.state === "flee") g.op = Math.max(0, g.op - dt * 0.6); // ~0.8 s fade while it shoots away
          else g.op += (target - g.op) * Math.min(1, dt * 1.8);
          var fx = Math.sin(t * 0.7 + s) * 0.35, fy = Math.sin(t * 1.1 + s * 1.3) * 0.18, fz = g.state === "approach" ? Math.sin(t * 0.5 + s) * 0.5 : 0;
          g.g.position.set(P.x + fx, P.y + fy, P.z + fz);
          g.g.rotation.set(Math.sin(t * 0.6 + s) * 0.08, Math.sin(t * 0.4 + s) * 0.35, Math.sin(t * 0.9 + s) * 0.12);
          g.mat.uniforms.uTime.value = t;
          g.mat.uniforms.uOpacity.value = g.op;
          g.eyeMat.opacity = Math.min(0.8, g.op * 1.5);
          g.g.visible = g.op > 0.005;
        }
      }
      renderer.render(scene, cam);
    }
    function resize(w, h, dpr) {
      renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
      cam.aspect = w / h; cam.updateProjectionMatrix();
      placePumpkins();
    }
    function dispose() { renderer.dispose(); try { renderer.forceContextLoss(); } catch (e) {} }
    return { frame: frame, resize: resize, dispose: dispose, static: ctx.reduced, debug: { ghosts: ghosts, scene: scene, renderer: renderer } };
  }

  /* ---------------- light 2D version (no WebGL / low-end) ---------------- */
  function fallback(ctx) {
    var d = document.createElement("div"), anim = !ctx.reduced;
    d.className = "ssai-season-2d"; d.setAttribute("aria-hidden", "true");
    var st = document.createElement("style");
    st.textContent = ".ssai-season-2d{position:fixed;inset:0;z-index:35;pointer-events:none;overflow:hidden;contain:strict}" +
      ".ssai-season-2d i{position:absolute;font-style:normal;line-height:1;opacity:.55;filter:drop-shadow(0 0 12px rgba(255,140,30,.8))}" +
      ".ssai-season-2d i.g{opacity:.28;filter:none}" +
      (anim ? "@keyframes ssaiFlick{0%,100%{filter:drop-shadow(0 0 12px rgba(255,140,30,.8))}40%{filter:drop-shadow(0 0 6px rgba(255,120,20,.5))}70%{filter:drop-shadow(0 0 16px rgba(255,170,60,.9))}}" +
        "@keyframes ssaiBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}" +
        "@keyframes ssaiDrift{0%{transform:translate(-20vw,0)}50%{transform:translate(60vw,-14px)}100%{transform:translate(130vw,0)}}" +
        ".ssai-season-2d i.p{animation:ssaiFlick 1.7s infinite,ssaiBob 5s ease-in-out infinite}" +
        ".ssai-season-2d i.g{animation:ssaiDrift 38s linear infinite}" : "");
    document.head.appendChild(st);
    d.innerHTML = '<i class="p" style="left:-22px;bottom:-14px;font-size:64px">🎃</i><i class="p" style="right:-20px;bottom:12%;font-size:54px;animation-delay:-2s">🎃</i>' +
      '<i class="p" style="left:-16px;top:9%;font-size:46px;animation-delay:-1s">🎃</i>' + (anim ? '<i class="g" style="left:0;top:22%;font-size:40px">👻</i>' : "");
    document.body.appendChild(d);
    return { setVisible: function (v) { d.style.display = v ? "" : "none"; } };
  }

  S.define({ id: "halloween", label: "Halloween", icon: "👻", three: true, shake: true, setup: setup, fallback: fallback });
})();
