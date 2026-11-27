/* SousShift AI seasonal theme: Christmas.
   3D: two snow-dusted Christmas trees in the bottom corners (twinkling coloured lights, metal ornaments,
       a gold star), coloured metal jingle bells swinging from the top corners, and snow with depth.
   Idle 5 s  -> the bells ring one after another, the tree lights run a chase, snow drifts to the finger.
   Tap / scroll / shake -> the bells get knocked and jingle, the trees shiver, the snow gusts.
   Santa: a photo cut-out sleigh team (christmas/santa.webp) crosses the upper sky. On a page with its own
       flyover (Melody sets window.SSAI_SANTA_CUE and fires "ssai-flyover-done" {dir}) Santa follows the plane,
       same direction, every other pass. Every other page gets Santa on a timer.
   Reduced motion -> one still frame, no Santa. Low-end / no WebGL -> CSS snow + a string of coloured lights.
   Sound (after the first tap, quiet, mutable): synthesized sleigh bells. No audio files. */
(function () {
  "use strict";
  var S = window.SSAISeason;
  if (!S || !S.define) return;

  var COLORS = [0xd81e2c, 0xf2b632, 0x1f9d4d, 0x2a6fe0, 0xcfd6e2, 0xb03ad6];   // bells
  var BULBS = [[1, 0.16, 0.14], [1, 0.74, 0.2], [0.2, 1, 0.38], [0.22, 0.5, 1], [1, 0.3, 0.75]];

  function rnd(seed) { var s = seed >>> 0 || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function cv(w, h) { var c = document.createElement("canvas"); c.width = w; c.height = h; return c; }

  /* ---------------- sound ---------------- */
  var lastJ = 0;
  function jingle(ctx, pan, k) {
    var ac = ctx.audio(), now = performance.now();
    if (!ac || now - lastJ < 180) return;
    lastJ = now;
    var t = ac.currentTime, g = ac.createGain(), V = 0.02 * (k || 1);
    g.gain.value = 0;
    if (ac.createStereoPanner) { var p = ac.createStereoPanner(); p.pan.value = Math.max(-0.8, Math.min(0.8, pan || 0)); g.connect(p); p.connect(ac.destination); } else g.connect(ac.destination);
    // three quick shakes, the last one left to ring
    for (var i = 0; i < 3; i++) {
      var a = t + i * 0.08;
      g.gain.setValueAtTime(0.0001, a);
      g.gain.linearRampToValueAtTime(V, a + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, a + (i < 2 ? 0.075 : 0.5));
    }
    [2637, 3520, 4186, 5274, 6272].forEach(function (f) {
      var o = ac.createOscillator(); o.type = "sine"; o.frequency.value = f * (1 + (Math.random() - 0.5) * 0.012);
      o.connect(g); o.start(t); o.stop(t + 0.7);
    });
  }

  /* ---------------- Santa (shared by the 3D and the light version) ---------------- */
  function santa(ctx) {
    var IMG = new Image(), el = null, raf = 0, n = 0, passes = 0;
    IMG.src = ctx.base + "christmas/santa.webp";
    function stop() { cancelAnimationFrame(raf); if (el) el.remove(); el = null; }
    function fly(dir) {
      if (el || ctx.reduced || document.hidden || (S.status && S.status.blocked) || !IMG.complete || !IMG.naturalWidth) return false;
      dir = dir === 1 || dir === -1 ? dir : (Math.random() < 0.5 ? 1 : -1);
      el = IMG.cloneNode();
      el.alt = ""; el.setAttribute("aria-hidden", "true");
      var vw = innerWidth, vh = innerHeight, w = Math.min(560, vw * 0.92), y0 = vh * (0.09 + Math.random() * 0.07), dur = 7000, t0 = performance.now(), rung = -1;
      el.style.cssText = "position:fixed;left:0;top:0;width:" + w + "px;height:auto;z-index:35;pointer-events:none;will-change:transform;filter:drop-shadow(0 10px 12px rgba(0,0,0,.35))";
      document.body.appendChild(el);
      passes++;
      (function step(now) {
        if (!el) return;
        var p = Math.min(1, (now - t0) / dur), run = vw + w * 1.2, x = dir > 0 ? -w * 1.1 + run * p : vw + w * 0.1 - run * p;
        // a shallow arc: climbing in, level over the middle, dipping away
        var y = y0 - Math.sin(p * Math.PI) * vh * 0.035 + Math.sin(p * 21) * 3, tilt = -Math.cos(p * Math.PI) * 5 * dir;
        el.style.transform = "translate(" + x + "px," + y + "px) scaleX(" + (dir > 0 ? -1 : 1) + ") rotate(" + (dir > 0 ? -tilt : tilt) + "deg)";
        var beat = Math.floor(p * 6);
        if (beat !== rung) { rung = beat; jingle(ctx, (x + w / 2) / vw * 2 - 1, 0.8); }
        if (p < 1) raf = requestAnimationFrame(step); else stop();
      })(t0);
      return true;
    }
    // every other plane pass; a pass Santa could not take (image still loading, game open) does not count
    addEventListener("ssai-flyover-done", function (e) { if (n-- <= 0 && fly(e.detail && e.detail.dir)) n = 1; });
    if (!window.SSAI_SANTA_CUE) {
      setTimeout(function first() { if (!fly()) setTimeout(first, 2000); }, 8000);
      setInterval(fly, 40000);
    }
    ctx.on("block", function (b) { if (b) stop(); });
    return { fly: fly, stop: stop, flying: function () { return !!el; }, passes: function () { return passes; } };
  }

  /* ---------------- textures ---------------- */
  function glowTexture(THREE) {
    var N = 64, c = cv(N, N), a = c.getContext("2d"), g = a.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2);
    g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.25, "rgba(255,255,255,.75)"); g.addColorStop(0.6, "rgba(255,255,255,.16)"); g.addColorStop(1, "rgba(255,255,255,0)");
    a.fillStyle = g; a.fillRect(0, 0, N, N);
    return new THREE.CanvasTexture(c);
  }
  // fir needles: short light/dark strokes, tinted by the vertex colours
  function needleTexture(THREE) {
    var N = 256, c = cv(N, N), a = c.getContext("2d"), r = rnd(11);
    a.fillStyle = "#b9b9b9"; a.fillRect(0, 0, N, N);
    for (var i = 0; i < 2600; i++) {
      var x = r() * N, y = r() * N, v = 110 + Math.floor(r() * 145), L = 5 + r() * 9, ang = Math.PI / 2 + (r() - 0.5) * 1.1;
      a.strokeStyle = "rgb(" + v + "," + v + "," + v + ")"; a.lineWidth = 1 + r();
      a.beginPath(); a.moveTo(x, y); a.lineTo(x + Math.cos(ang) * L, y + Math.sin(ang) * L); a.stroke();
    }
    var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 1); t.anisotropy = 2;
    if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  // jingle bell: the cross slot at the bottom, with the round hole at the end of each cut
  function bellTexture(THREE) {
    var W = 256, H = 128, c = cv(W, H), a = c.getContext("2d");
    a.fillStyle = "#fff"; a.fillRect(0, 0, W, H);
    a.fillStyle = "#0a0806";
    for (var i = 0; i <= 4; i++) {
      var x = i * W / 4;
      a.fillRect(x - 4, H * 0.66, 8, H * 0.34);
      a.beginPath(); a.arc(x, H * 0.66, 9, 0, 7); a.fill();
    }
    var t = new THREE.CanvasTexture(c); t.anisotropy = 2;
    if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  // something for the metal to reflect: a dim room with a warm window and a few fairy lights
  function envTexture(THREE) {
    var W = 256, H = 128, c = cv(W, H), a = c.getContext("2d"), g = a.createLinearGradient(0, 0, 0, H), r = rnd(5);
    g.addColorStop(0, "#5d6f96"); g.addColorStop(0.5, "#2a2f45"); g.addColorStop(1, "#191417");
    a.fillStyle = g; a.fillRect(0, 0, W, H);
    a.fillStyle = "#fff4d8"; a.fillRect(40, 20, 46, 34); a.fillRect(170, 26, 30, 24);
    ["#ff5a4a", "#ffd76a", "#6affa0", "#6aa8ff", "#ff8ad8"].forEach(function (col, i) {
      for (var k = 0; k < 4; k++) { a.fillStyle = col; a.beginPath(); a.arc(r() * W, 30 + r() * 70, 2 + r() * 3, 0, 7); a.fill(); }
    });
    var t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping;
    if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  /* ---------------- geometry ---------------- */
  var TIERS = 7, TREE_R = 0.3;
  function tierY(i) { return 0.13 + i * 0.112; }
  function tierR(i) { return TREE_R * (1 - i / (TIERS + 0.9)); }
  // one skirt of branches: a cone whose rim is pulled out into drooping boughs
  function tierGeometry(THREE, i, seed) {
    var h = 0.3 - i * 0.012, R = tierR(i), n = 9 - Math.floor(i * 0.7), off = seed * 1.7 + i * 0.9, r = rnd(seed * 31 + i);
    var g = new THREE.ConeGeometry(R, h, 36, 5, true), P = g.attributes.position, C = new Float32Array(P.count * 3);
    for (var k = 0; k < P.count; k++) {
      var x = P.getX(k), y = P.getY(k), z = P.getZ(k), v = y / h + 0.5, th = Math.atan2(z, x), lobe = Math.cos(n * th + off), out = 1 - v;
      var s = 1 + 0.2 * lobe * out;
      P.setXYZ(k, x * s, y - out * out * (0.05 + 0.035 * lobe), z * s);
      // dark in the gaps, lighter on the boughs, snow lying on the bough tips
      var ridge = lobe * 0.5 + 0.5, snow = Math.max(0, ridge - 0.45) * out * (0.5 + r() * 0.9);
      var gr = 0.15 + 0.22 * ridge + 0.06 * out;
      C[k * 3] = 0.04 + 0.07 * ridge + snow * 0.9; C[k * 3 + 1] = gr + snow * 0.75; C[k * 3 + 2] = 0.07 + 0.06 * ridge + snow * 0.95;
    }
    g.setAttribute("color", new THREE.BufferAttribute(C, 3));
    g.translate(0, tierY(i) + h / 2, 0);
    g.computeVertexNormals();
    return g;
  }
  function starGeometry(THREE) {
    var sh = new THREE.Shape();
    for (var i = 0; i < 10; i++) { var a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.42 : 1; sh[i ? "lineTo" : "moveTo"](Math.cos(a) * r, Math.sin(a) * r); }
    sh.closePath();
    var g = new THREE.ExtrudeGeometry(sh, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.08, bevelSegments: 1 });
    g.translate(0, 0, -0.08);
    return g;
  }
  // a point on the outside of the tree at height y (0..1) and angle th
  function onTree(y, th, push) {
    var f = Math.max(0, Math.min(1, (y - 0.1) / 0.88)), r = (TREE_R * 1.08) * (1 - f) + 0.012 + (push || 0);
    return [Math.cos(th) * r, y, Math.sin(th) * r];
  }

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

    // cold moonlight from above, a warm lamp from the front
    scene.add(new THREE.AmbientLight(0xcfdcff, 0.55));
    var key = new THREE.DirectionalLight(0xfff1dc, 1.7); key.position.set(-3, 6, 8); scene.add(key);
    var rim = new THREE.DirectionalLight(0x9fc0ff, 0.5); rim.position.set(5, 2, -3); scene.add(rim);
    try { scene.environment = envTexture(THREE); } catch (e) {}

    var glowT = glowTexture(THREE), needleT = needleTexture(THREE), bellT = bellTexture(THREE);

    /* trees: nx = screen x (-1..1), frac = height as a share of the screen height */
    var firMat = new THREE.MeshStandardMaterial({ vertexColors: true, map: needleT, roughness: 0.86, metalness: 0, side: THREE.DoubleSide, envMapIntensity: 0.25 });
    var trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a2f1c, roughness: 0.9 });
    var goldMat = new THREE.MeshStandardMaterial({ color: 0xffc64a, emissive: 0xb86a00, emissiveIntensity: 0.55, metalness: 0.9, roughness: 0.25 });
    var ballMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.92, roughness: 0.2 });
    var ballG = new THREE.SphereGeometry(0.03, 14, 10), starG = starGeometry(THREE);
    var trees = [{ nx: -0.9, z: -1, frac: 0.22 }, { nx: 0.93, z: -4, frac: 0.17 }].map(function (sp, ti) {
      var g = new THREE.Group(), r = rnd(77 + ti * 13), i;
      for (i = 0; i < TIERS; i++) g.add(new THREE.Mesh(tierGeometry(THREE, i, ti + 1), firMat));
      var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.16, 8), trunkMat); trunk.position.y = 0.08; g.add(trunk);
      var star = new THREE.Mesh(starG, goldMat); star.scale.setScalar(0.06); star.position.y = 1.02; g.add(star);
      var halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, color: 0xffd98a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.8 }));
      halo.scale.setScalar(0.3); halo.position.y = 1.02; g.add(halo);
      // ornaments on the front of the tree only (the back is never seen)
      var NB = 16, balls = new THREE.InstancedMesh(ballG, ballMat, NB), m = new THREE.Matrix4(), col = new THREE.Color();
      for (i = 0; i < NB; i++) {
        var p = onTree(0.2 + (i / NB) * 0.68 + r() * 0.03, Math.PI / 2 + (r() - 0.5) * 2.5, -0.012);
        m.makeTranslation(p[0], p[1], p[2]); balls.setMatrixAt(i, m);
        balls.setColorAt(i, col.setHex([0xd81e2c, 0xf2b632, 0x2a6fe0, 0xdfe5ee][i % 4]));
      }
      g.add(balls);
      // the light string, wound round the tree
      var NL = 44, pos = new Float32Array(NL * 3), lc = new Float32Array(NL * 3), base = [];
      for (i = 0; i < NL; i++) {
        var q = onTree(0.17 + (i / NL) * 0.78, Math.PI / 2 + Math.sin(i * 0.9 + ti) * 1.3, 0.004);
        pos[i * 3] = q[0]; pos[i * 3 + 1] = q[1] - 0.012 * Math.sin(i * 1.3); pos[i * 3 + 2] = q[2];
        base.push(BULBS[i % BULBS.length]);
      }
      var lg = new THREE.BufferGeometry();
      lg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      lg.setAttribute("color", new THREE.BufferAttribute(lc, 3));
      var lights = new THREE.Points(lg, new THREE.PointsMaterial({ map: glowT, size: 0.26, sizeAttenuation: true, vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true }));
      g.add(lights);
      scene.add(g);
      return { g: g, sp: sp, star: star, halo: halo, lights: lights, base: base, n: NL, ph: ti * 2.1, lean: 0, leanV: 0 };
    });

    /* jingle bells: three a corner, each on its own cord from above the top edge */
    var bellG = new THREE.SphereGeometry(1, 28, 20), bandG = new THREE.TorusGeometry(1.01, 0.055, 6, 32), loopG = new THREE.TorusGeometry(0.2, 0.06, 6, 14);
    var cordMat = new THREE.MeshStandardMaterial({ color: 0x8c1420, roughness: 0.7 });
    var R = 0.19;
    var bells = [];
    [-1, 1].forEach(function (side, si) {
      [[0.17, 1.9], [0.36, 1.45], [0.55, 1.05]].forEach(function (b, bi) {
        var i = si * 3 + bi, mat = new THREE.MeshStandardMaterial({ color: COLORS[i], map: bellT, metalness: 0.88, roughness: 0.24, envMapIntensity: 1.25 });
        var g = new THREE.Group(), bell = new THREE.Group();
        bell.add(new THREE.Mesh(bellG, mat));
        var band = new THREE.Mesh(bandG, mat); band.rotation.x = Math.PI / 2; bell.add(band);
        var loop = new THREE.Mesh(loopG, goldMat); loop.position.y = 1.12; bell.add(loop);
        bell.scale.setScalar(R); bell.position.y = -b[1]; bell.rotation.x = 0.35;   // tipped back so the slots show
        g.add(bell);
        var cord = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, b[1] - R * 1.1, 5), cordMat); cord.position.y = -(b[1] - R * 1.1) / 2; g.add(cord);
        scene.add(g);
        bells.push({ g: g, bell: bell, side: side, inset: b[0], len: b[1], ang: 0, vel: 0, k: Math.pow(2 * Math.PI * 0.85 / Math.sqrt(b[1]), 2), ph: i * 1.7 });
      });
    });

    /* snow */
    var NS = ctx.lowEnd ? 50 : 90, sp = new Float32Array(NS * 3), flakes = [], sr = rnd(3);
    for (var i = 0; i < NS; i++) flakes.push({ z: -9 + sr() * 11, x: 0, y: 0, f: 0.45 + sr() * 0.7, s: sr() * 6.28, vx: 0, vy: 0, fresh: 1 });
    var sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
    var snow = new THREE.Points(sg, new THREE.PointsMaterial({ map: glowT, size: 0.16, sizeAttenuation: true, color: 0xf4f8ff, transparent: true, opacity: 0.9, depthWrite: false }));
    snow.frustumCulled = false;
    scene.add(snow);

    function place() {
      trees.forEach(function (T) {
        var H = T.sp.frac * 2 * halfH(T.sp.z);
        T.g.scale.setScalar(H);
        T.g.position.set(T.sp.nx * halfW(T.sp.z), -halfH(T.sp.z) - 0.015 * H, T.sp.z);
      });
      bells.forEach(function (b) { b.g.position.set(b.side * (halfW(0) - b.inset), halfH(0) + 0.12, 0); });
    }

    /* reactions */
    var chase = 0, ringT = 0, ringI = 0, t0 = 0;
    function knock(k, silent) {
      if (ctx.reduced) return;
      var px = (ctx.pointer.x * 2 - 1) * halfW(0);
      bells.forEach(function (b) {
        var bx = b.g.position.x, d = bx - px;
        b.vel += (d >= 0 ? 1 : -1) * k * (0.6 + 1.6 / (1 + Math.abs(d)));
      });
      trees.forEach(function (T) { T.leanV += (Math.random() - 0.5) * 0.5 * k; });
      flakes.forEach(function (f) { var d = f.x - px; f.vx += (d >= 0 ? 1 : -1) * (1 + Math.random() * 2) * k; f.vy += (0.6 + Math.random() * 1.6) * k; });
      if (!silent) jingle(ctx, ctx.pointer.x * 2 - 1, 1);
    }
    ctx.on("idle", function () { if (ctx.reduced) return; chase = 1; ringT = 0.2; ringI = 0; });
    ctx.on("wake", function () { chase = 0; knock(1); });
    ctx.on("activity", function () { knock(0.45); });
    ctx.on("shake", function () { knock(1.6); });
    ctx.on("block", function (b) { if (b) { chase = 0; bells.forEach(function (x) { x.vel = 0; }); } });

    function frame(dt, t, still) {
      if (still && !t0) t = 0;
      t0 = t;
      var idle = ctx.isIdle() && !still, i;
      // idle: the bells ring one after another, nearest the finger first
      if (chase && idle) {
        ringT -= dt;
        if (ringT <= 0) {
          var b = bells[ringI % bells.length]; ringI++;
          b.vel += (b.side > 0 ? -1 : 1) * 2.2;
          jingle(ctx, b.side * 0.7, 0.6);
          ringT = ringI % bells.length ? 0.55 : 3.2;
        }
      }
      bells.forEach(function (b) {
        if (!still) {
          b.vel += (-b.k * b.ang - 1.1 * b.vel + Math.sin(t * 0.7 + b.ph) * 0.35) * dt;
          b.vel = Math.max(-6, Math.min(6, b.vel));
          b.ang = Math.max(-1.1, Math.min(1.1, b.ang + b.vel * dt));
        }
        b.g.rotation.z = b.ang;
        b.bell.rotation.y = b.ph + t * 0.25 + b.ang * 1.5;
      });
      trees.forEach(function (T) {
        if (!still) { T.leanV += (-60 * T.lean - 5 * T.leanV) * dt; T.lean += T.leanV * dt; }
        T.g.rotation.z = T.lean * 0.12;
        T.star.rotation.y = Math.sin(t * 0.6 + T.ph) * 0.5;
        T.halo.material.opacity = still ? 0.8 : 0.62 + 0.25 * Math.sin(t * 2.3 + T.ph);
        // each bulb on its own slow twinkle; idle runs a chase up the string
        var c = T.lights.geometry.attributes.color;
        for (i = 0; i < T.n; i++) {
          var k = still ? 1 : chase && idle ? 0.25 + 0.75 * Math.pow(0.5 + 0.5 * Math.sin(t * 5 - i * 0.55), 3) : 0.55 + 0.45 * Math.sin(t * (1.3 + (i % 5) * 0.37) + i * 2.1 + T.ph);
          var bc = T.base[i];
          c.setXYZ(i, bc[0] * k, bc[1] * k, bc[2] * k);
        }
        c.needsUpdate = true;
      });
      // snow: falls and sways; gusts die down; when idle it drifts toward the finger
      var px = (ctx.pointer.x * 2 - 1), py = -(ctx.pointer.y * 2 - 1);
      for (i = 0; i < NS; i++) {
        var f = flakes[i], hw = halfW(f.z), hh = halfH(f.z);
        if (f.fresh) { f.fresh = 0; f.x = (Math.random() * 2 - 1) * hw; f.y = (Math.random() * 2 - 1) * hh; }
        if (!still) {
          f.vx *= Math.exp(-dt * 1.6); f.vy *= Math.exp(-dt * 1.6);
          if (idle) { f.vx += (px * hw - f.x) * 0.1 * dt; f.vy += (py * hh - f.y) * 0.03 * dt; }
          f.x += (Math.sin(t * 0.6 + f.s) * 0.35 + f.vx) * dt;
          f.y += (-f.f + f.vy) * dt;
          if (f.y < -hh - 0.3) { f.y = hh + 0.3; f.x = (Math.random() * 2 - 1) * hw; f.vx = f.vy = 0; }
          if (f.y > hh + 0.6) f.y = hh + 0.6;
          if (f.x > hw + 0.4) f.x = -hw - 0.3; else if (f.x < -hw - 0.4) f.x = hw + 0.3;
        }
        sp[i * 3] = f.x; sp[i * 3 + 1] = f.y; sp[i * 3 + 2] = f.z;
      }
      sg.attributes.position.needsUpdate = true;
      renderer.render(scene, cam);
    }
    function resize(w, h, dpr) {
      renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
      cam.aspect = w / h; cam.updateProjectionMatrix();
      place();
    }
    function dispose() { sleigh.stop(); renderer.dispose(); try { renderer.forceContextLoss(); } catch (e) {} }
    var sleigh = santa(ctx);
    S.__dbg = { trees: trees, bells: bells, snow: flakes, santa: sleigh, scene: scene, renderer: renderer };   // read by tests/the checklist only
    return { frame: frame, resize: resize, dispose: dispose, static: ctx.reduced };
  }

  /* light version: CSS snow and a string of coloured lights along the top. No emoji, no images but Santa. */
  function fallback(ctx) {
    var d = document.createElement("div"), anim = !ctx.reduced, h = "", i;
    d.className = "ssai-season-2d"; d.setAttribute("aria-hidden", "true");
    var st = document.createElement("style");
    st.textContent = ".ssai-season-2d{position:fixed;inset:0;z-index:35;pointer-events:none;overflow:hidden;contain:strict}" +
      ".ssai-season-2d b{position:absolute;width:9px;height:9px;border-radius:50%;box-shadow:0 0 9px 2px currentColor;background:currentColor}" +
      ".ssai-season-2d i{position:absolute;top:-12px;width:7px;height:7px;border-radius:50%;background:#fff;opacity:.8;box-shadow:0 0 5px #cfe2ff}" +
      (anim ? ".ssai-season-2d b{animation:ssai-xm-tw 2.4s ease-in-out infinite}.ssai-season-2d i{animation:ssai-xm-fall linear infinite}" +
        "@keyframes ssai-xm-tw{50%{opacity:.35}}@keyframes ssai-xm-fall{to{transform:translate(24px,105vh)}}" : ".ssai-season-2d i{display:none}");
    document.head.appendChild(st);
    var cols = ["#ff3b30", "#ffc233", "#2fd163", "#3d8bff", "#ff5fc4"];
    for (i = 0; i < 11; i++) h += '<b style="left:' + (2 + i * 9.6) + '%;top:' + (5 + Math.sin(i / 10 * Math.PI) * 7) + 'px;color:' + cols[i % 5] + ';animation-delay:' + (-i * 0.37) + 's"></b>';
    for (i = 0; i < 10; i++) h += '<i style="left:' + (4 + i * 9.7) + '%;animation-duration:' + (9 + (i * 7) % 6) + 's;animation-delay:' + (-i * 1.3) + 's"></i>';
    d.innerHTML = h;
    document.body.appendChild(d);
    var sleigh = santa(ctx);
    S.__dbg = { santa: sleigh };
    return { setVisible: function (v) { d.style.display = v ? "" : "none"; if (!v) sleigh.stop(); } };
  }

  S.define({ id: "christmas", label: "Christmas", icon: "🎄", three: true, shake: true, setup: setup, fallback: fallback });
})();
