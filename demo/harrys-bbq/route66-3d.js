/* Harry's · Route 66 — the 3D drive view (2026-11-10). VISUAL ONLY.
   route66.js keeps every rule, score, hitbox and the whole cook stop, and still owns the 2D canvas (HUD, labels, pops).
   This module draws the same road state in WebGL on a canvas UNDER that one, the way storm-burger/storm3d.js does:
   a chase camera behind the rig, the road bending for real, photo cut-outs standing in the world, smoke off the stack.
   No lights and no tone mapping (the photos keep their true colour), every shader compiled on the menu, objects pooled.
   ?render=2d, no WebGL, a failed boot, or LOW not holding 30 fps on the menu all leave the 2D road exactly as it was. */
const R = window.__R66, REQ = (new URLSearchParams(location.search).get("render") || "").toLowerCase();
const STATUS = window.__R663 = { on: false, reason: "", fps: 0, tier: "" };
function hasWebGL() { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (e) { return false; } }
if (R && REQ !== "2d") {
  if (!hasWebGL()) STATUS.reason = "no WebGL";
  else boot().catch(e => { STATUS.reason = "boot failed: " + (e && e.message || e); console.warn("[route66-3d] staying 2D:", e); R.r3d.on = false; R.r3d.render = null; });
}

async function boot() {
  const THREE = await import("three"), QM = await import("../engine3d/quality.js?v=e3v");
  const R3 = R.r3d, K = R.K, SP = R.SP, OW = R.OW, off = R.off;
  const KZ = 4, FAR = K.ZMAX * KZ;                       // game z -> world depth; the game's lanes (wx) are world X as they are
  const CAM_Y = 300, CAM_Z = 470, LOOK_Y = 149, LOOK_Z = -530;   // puts the horizon and the rig where the 2D game has them (y 236 and 566 of 640)
  const ready = im => im && (im.naturalWidth > 0 || im.width > 0 && !("naturalWidth" in im));
  // the photos load on their own clock: wait for the rig, the first sky and the smoke before going 3D (8 s, then stay 2D)
  for (let i = 0; !(SP.truck && ready(R.BGI[0]) && R.SMK.every(ready)); i++) { if (i > 80) throw new Error("art not loaded"); await new Promise(r => setTimeout(r, 100)); }
  // photo ground per leg (Higgsfield top-down textures); the code-drawn tile is the fallback until/unless they load
  const GT = 800, GND = ["grass", "dry", "desert", "desert", "desert", "grass"], GTINT = ["#ffffff", "#ffffff", "#e8b78c", "#f2c79a", "#ffffff", "#ffffff"], gphoto = {};
  ["grass", "dry", "desert"].forEach(n => { const im = new Image(); im.src = "img/r66/ground-" + n + ".webp"; gphoto[n] = im; });
  for (let i = 0; i < 30 && !Object.values(gphoto).every(im => im.complete); i++) await new Promise(r => setTimeout(r, 100));

  const game = document.getElementById("game"), host = game.parentNode;
  const cv = document.createElement("canvas"); cv.setAttribute("aria-hidden", "true");
  cv.style.cssText = "position:absolute;border-radius:12px;display:block;pointer-events:none;z-index:0;visibility:hidden";
  if (getComputedStyle(host).position === "static") host.style.position = "relative";
  if (getComputedStyle(game).position === "static") { game.style.position = "relative"; game.style.zIndex = "1"; }
  host.insertBefore(cv, game);
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: !QM.isHandheld(), powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
  const q = QM.makeQuality({ id: "harrys-route66", renderer, target: 50, minFps: 30, calm: () => R.get().phase !== "drive" });
  let cfg = q.cfg; STATUS.tier = q.smooth ? "smooth" : q.tier;

  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(60, K.VW / K.VH, 20, 12000);
  scene.fog = new THREE.Fog(0xffffff, FAR * 0.38, FAR * 1.03);   // things come out of the heat haze instead of popping in
  scene.background = new THREE.Color(0x000000);
  let dirty = true;
  const size = () => {   // sits exactly over #game (the box around it has padding), also in full screen
    const w = game.clientWidth || K.VW, h = game.clientHeight || K.VH;
    cv.style.left = game.offsetLeft + "px"; cv.style.top = game.offsetTop + "px"; cv.style.width = w + "px"; cv.style.height = h + "px";
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, cfg.pr || 1.5)); renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); dirty = true;
  };
  size(); { const ro = new ResizeObserver(size); ro.observe(game); ro.observe(host); }
  q.onChange((t, c) => { cfg = c; STATUS.tier = q.smooth ? "smooth" : t; size(); });
  let visible = true; new IntersectionObserver(e => { visible = e[0].isIntersecting; }).observe(game);

  /* ---------- textures + materials (one per picture, shared) ---------- */
  const texs = new Map(), mats = new Map(), ANI = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  function tex(src) {
    let t = texs.get(src);
    if (!t) { t = src instanceof HTMLCanvasElement ? new THREE.CanvasTexture(src) : new THREE.Texture(src); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = ANI; t.needsUpdate = true; texs.set(src, t); }
    return t;
  }
  function mat(src) {
    let m = mats.get(src);
    if (!m) { m = new THREE.MeshBasicMaterial({ map: tex(src), transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide }); mats.set(src, m); }
    return m;
  }
  function paint(w, h, f) { const c = document.createElement("canvas"); c.width = w; c.height = h; f(c.getContext("2d"), w, h); return c; }
  // nothing writes depth: the draw order is sky, ground, shoulder, road, decals, then the cut-outs far to near
  const UP = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0), MID = new THREE.PlaneGeometry(1, 1), FLAT = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);

  /* ---------- the ground, the shoulders and the road ---------- */
  const RT = 720, RW = 165, SHW = 250;   // one texture tile = 720 world units of road; asphalt half-width (same as the 2D road); dirt half-width
  const roadC = paint(512, 1024, (g, w, h) => {
    g.fillStyle = "#33312f"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 26000; i++) { const v = 28 + Math.random() * 60 | 0; g.fillStyle = "rgba(" + v + "," + v + "," + (v - 3) + "," + (0.25 + Math.random() * 0.4) + ")"; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2); }
    [100, 256, 412].forEach(x => { const gr = g.createLinearGradient(x - 46, 0, x + 46, 0); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(0.5, "rgba(0,0,0,.22)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(x - 46, 0, 92, h); });   // worn wheel paths
    g.strokeStyle = "rgba(10,9,8,.75)"; g.lineWidth = 1.6;
    for (let i = 0; i < 9; i++) { let x = 30 + Math.random() * (w - 60), y = 60 + Math.random() * (h - 260); g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 9; j++) { x += (Math.random() - 0.5) * 34; y += 8 + Math.random() * 14; g.lineTo(x, y); } g.stroke(); }
    g.fillStyle = "rgba(236,232,220,.9)"; g.fillRect(14, 0, 9, h); g.fillRect(w - 23, 0, 9, h);                    // edge lines
    g.fillStyle = "rgba(240,190,50,.92)"; [178, 334].forEach(x => g.fillRect(x - 4, 0, 8, h * 0.42));              // lane dashes, 50 either side of the middle like the game's lanes
    for (let i = 0; i < 1400; i++) { g.fillStyle = "rgba(40,38,36,.5)"; g.fillRect(Math.random() < 0.5 ? 12 + Math.random() * 13 : w - 25 + Math.random() * 13, Math.random() * h, 2, 2); g.fillRect((Math.random() < 0.5 ? 174 : 330) + Math.random() * 8, Math.random() * h * 0.42, 2, 2); }   // paint wear
  });
  const dirtC = paint(128, 256, (g, w, h) => {   // dirt shoulder: solid in the middle, feathered out into the ground at both sides
    const id = g.createImageData(w, h), d = id.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4, v = 190 + Math.random() * 65, e = Math.min(1, Math.min(x, w - 1 - x) / 22); d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255 * e * (0.75 + Math.random() * 0.25); }
    g.putImageData(id, 0, 0);
  });
  const groundC = paint(256, 256, (g, w, h) => {
    const id = g.createImageData(w, h), d = id.data;
    for (let i = 0; i < d.length; i += 4) { const v = 196 + Math.random() * 59; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
    g.putImageData(id, 0, 0);
    for (let i = 0; i < 260; i++) { g.fillStyle = "rgba(40,45,20," + (0.12 + Math.random() * 0.2) + ")"; const r = 1.5 + Math.random() * 4; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, r * 1.6, r, 0, 0, 7); g.fill(); }   // scrub
  });
  const scroll = [roadC, dirtC].map(c => { const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; });
  const gtex = src => { const t = tex(src); t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping; return t; };   // mirrored: no seams in the photo tiles
  gtex(groundC);
  const flatMat = (c, order) => { const m = new THREE.MeshBasicMaterial({ map: tex(c), transparent: true, depthWrite: false, depthTest: false }); m.userData.order = order; return m; };
  const ROWS = 44, rowZ = []; for (let i = 0; i < ROWS; i++) rowZ.push(-130 + (K.ZMAX * 1.06 + 130) * Math.pow(i / (ROWS - 1), 1.7));   // game z of each cross-row, denser near the rig
  function strip(hw, material) {
    const pos = new Float32Array(ROWS * 6), uv = new Float32Array(ROWS * 4), idx = [];
    for (let i = 0; i < ROWS; i++) { pos[i * 6 + 2] = pos[i * 6 + 5] = -rowZ[i] * KZ; uv[i * 4] = 0; uv[i * 4 + 2] = 1; uv[i * 4 + 1] = uv[i * 4 + 3] = rowZ[i] * KZ / RT; if (i) { const a = i * 2 - 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); geo.setIndex(idx);
    const m = new THREE.Mesh(geo, material); m.frustumCulled = false; m.renderOrder = material.userData.order; scene.add(m);
    return bend => { for (let i = 0; i < ROWS; i++) { const o = off(rowZ[i]); pos[i * 6] = o - hw; pos[i * 6 + 3] = o + hw; } geo.attributes.position.needsUpdate = true; };
  }
  const groundMat = flatMat(groundC, -10), dirtMat = flatMat(dirtC, -9), roadMat = flatMat(roadC, -8);
  { const G = 9000, geo = new THREE.BufferGeometry(), z0 = 700, z1 = -FAR * 1.1;
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-G, 0, z0, G, 0, z0, -G, 0, z1, G, 0, z1]), 3));
    geo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array([0, -z0 / GT, 2 * G / GT, -z0 / GT, 0, -z1 / GT, 2 * G / GT, -z1 / GT]), 2)); geo.setIndex([0, 1, 2, 1, 3, 2]);
    const m = new THREE.Mesh(geo, groundMat); m.frustumCulled = false; m.renderOrder = -10; scene.add(m); }
  const bendDirt = strip(SHW, dirtMat), bendRoad = strip(RW, roadMat);

  /* ---------- the sky photo of each leg, far behind everything ---------- */
  const BW = 6200, BH = BW * 583 / 1600, skyMat = new THREE.MeshBasicMaterial({ map: tex(R.BGI[0]), fog: false, transparent: true, depthWrite: false, depthTest: false });
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(BW, BH).translate(0, BH / 2, 0), skyMat); sky.renderOrder = -20; sky.frustumCulled = false; sky.position.z = -FAR * 1.02; scene.add(sky);
  const hazeC = document.createElement("canvas"), hazeG = hazeC.getContext("2d", { willReadFrequently: true }), hazeOf = []; hazeC.width = hazeC.height = 8;
  function haze(leg) {   // the colour along the bottom of the sky photo: the fog fades the road into it, so there is no seam at the horizon
    if (!hazeOf[leg]) { const g = hazeG; g.drawImage(R.BGI[leg], 0, 0, 8, 8); const d = g.getImageData(0, 7, 8, 1).data; let r = 0, gg = 0, b = 0; for (let i = 0; i < 32; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; } hazeOf[leg] = [r / 8 / 255, gg / 8 / 255, b / 8 / 255]; }
    return hazeOf[leg];
  }
  let legShown = -1;
  function dress(st) {   // new leg: its sky photo, ground and shoulder colours
    const L = R.LEGS[st.leg], ph = R.BGI[st.leg];
    const gp = gphoto[GND[st.leg]]; dirtMat.color.set(L.sh);
    if (ready(gp)) { groundMat.map = gtex(gp); groundMat.color.set(GTINT[st.leg]); } else { groundMat.map = gtex(groundC); groundMat.color.set(L.g1); }
    if (ready(ph)) { skyMat.map = tex(ph); const h = haze(st.leg); scene.fog.color.setRGB(h[0], h[1], h[2], THREE.SRGBColorSpace); legShown = st.leg; }
    else scene.fog.color.set(L.sky[1]);   // the photo is still loading: keep the last sky, try again next frame
    scene.background.copy(scene.fog.color);
  }

  /* ---------- pooled cut-outs ---------- */
  const pool = [], views = new Map(); let frameNo = 0;
  function mesh(geo, src, order) {
    const m = pool.pop() || new THREE.Mesh(geo, mat(src)); m.geometry = geo; m.material = mat(src); m.renderOrder = order || 0; m.visible = true; m.rotation.set(0, 0, 0);
    if (!m.parent) scene.add(m); return m;
  }
  const blobC = paint(64, 64, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 2, w / 2, w / 2, w / 2); gr.addColorStop(0, "rgba(0,0,0,.6)"); gr.addColorStop(0.6, "rgba(0,0,0,.32)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
  const ringC = paint(128, 128, (g, w) => { g.strokeStyle = "rgba(255,206,92,.95)"; g.lineWidth = 9; g.shadowColor = "#ffb020"; g.shadowBlur = 14; g.beginPath(); g.arc(w / 2, w / 2, w / 2 - 20, 0, 7); g.stroke(); });
  function view(key) { let v = views.get(key); if (!v) { v = { a: null, b: null, n: 0, own: null }; views.set(key, v); } v.n = frameNo; return v; }
  function drop(v) {
    if (v.a) { v.a.visible = false; pool.push(v.a); } if (v.b) { v.b.visible = false; pool.push(v.b); }
    if (v.own) { const t = texs.get(v.own), m = mats.get(v.own); if (t) t.dispose(); if (m) m.dispose(); texs.delete(v.own); mats.delete(v.own); }   // each mileage sign is its own little canvas
  }
  const truck = mesh(UP, SP.truck, 1), truckSh = mesh(FLAT, blobC, -1), TW = 136, TH = TW * SP.truck.h / SP.truck.w;
  truck.scale.set(TW, TH, 1); truckSh.scale.set(TW * 1.5, 1, TH * 1.25);

  /* ---------- smoke off the stack ---------- */
  const puffs = []; let puffI = 0, puffAcc = 0;
  for (let i = 0; i < 30; i++) {
    const im = R.SMK[i % 3], m = new THREE.SpriteMaterial({ map: tex(im), transparent: true, depthWrite: false, depthTest: false, opacity: i ? 0 : 0.01 }), s = new THREE.Sprite(m);
    s.visible = !i; s.renderOrder = 2; scene.add(s); puffs.push({ s, m, t: 9, life: 1, vx: 0, vy: 0, vz: 0, vr: 0, k: im.naturalHeight / im.naturalWidth, w0: 20, w1: 90 });   // the first one is on for the warm-up compile
  }
  function smoke(st, dt) {
    puffAcc += dt * (st.speed > 30 ? 10 + st.speed / 70 : 5);
    while (puffAcc >= 1) {
      puffAcc -= 1; const p = puffs[puffI = (puffI + 1) % puffs.length];
      p.t = 0; p.life = 1.25 + Math.random() * 0.6; p.s.position.set(st.px - 1 + (Math.random() - 0.5) * 6, TH * 0.93, 4); p.s.visible = true;
      p.vx = -st.bend * 26 + (Math.random() - 0.5) * 26; p.vy = 62 + Math.random() * 34; p.vz = 60 + st.speed * 0.2 + Math.random() * 30;   // rises, and the wind of the drive carries it back past the camera
      p.vr = (Math.random() - 0.5) * 1.6; p.m.rotation = Math.random() * 6.28; p.w0 = 16 + Math.random() * 8; p.w1 = 78 + Math.random() * 44;
    }
    for (let i = 0; i < puffs.length; i++) {
      const p = puffs[i]; if (!p.s.visible) continue;
      p.t += dt; const u = p.t / p.life; if (u >= 1) { p.s.visible = false; continue; }
      p.s.position.x += p.vx * dt; p.s.position.y += p.vy * dt; p.s.position.z += p.vz * dt; p.vy *= 1 - dt * 0.5; p.m.rotation += p.vr * dt;
      const w = p.w0 + (p.w1 - p.w0) * (1 - (1 - u) * (1 - u)); p.s.scale.set(w, w * p.k, 1); p.m.opacity = Math.min(1, u * 7) * (1 - u) * (1 - u) * 0.5;
    }
  }

  /* ---------- one frame ---------- */
  const v3 = new THREE.Vector3();
  const toGame = (x, y, z) => { v3.set(x, y, z).project(cam); return [(v3.x * 0.5 + 0.5) * K.VW, (0.5 - v3.y * 0.5) * K.VH]; };
  function put(m, x, y, z, w, h) { m.position.set(x, y, z); m.scale.set(w, h, 1); }
  function shadow(v, x, z, w, d) { if (!v.b) v.b = mesh(FLAT, blobC, -1); v.b.position.set(x, 0, z); v.b.scale.set(w, 1, d); }
  function drawFrame(st, dt) {
    frameNo++;
    if (legShown !== st.leg) dress(st);
    const sh = st.shake > 0 ? st.shake : 0;
    cam.position.set(st.camX + (Math.random() - 0.5) * sh * 26, CAM_Y + (Math.random() - 0.5) * sh * 16, CAM_Z);
    cam.lookAt(st.camX + st.bend * 36, LOOK_Y, LOOK_Z); cam.updateMatrixWorld();
    const k = st.bgX < 400 ? st.bgX / 400 : (800 - st.bgX) / 400; sky.position.x = cam.position.x + (0.5 - k) * 1700; sky.position.y = -40;   // the bends pan the sky like the 2D road does
    const sc = st.dist * KZ / RT; scroll.forEach(t => { t.offset.y = sc % 1; }); groundMat.map.offset.y = (st.dist * KZ / GT) % 2;
    bendDirt(); bendRoad();
    truck.position.set(st.px, Math.sin(st.dist / 46) * 0.9, 0); truck.rotation.z = -st.tilt * 0.5; truckSh.position.set(st.px, 0, -8);

    st.bbRect = null;
    for (let i = 0; i < st.props.length; i++) {
      const p = st.props[i], spr = p.spr; if (!spr || !(spr.w > 0)) continue;
      const v = view(p), h = p.h * 2.3, w = h * spr.w / spr.h, x = p.wx * 1.5 + off(p.z), z = -p.z * KZ;
      if (!v.a) { v.a = mesh(UP, spr, 0); if (p.k === "sign") v.own = spr; }
      put(v.a, x, 0, z, w, h);
      if (p.k === "billboard") { const a = toGame(x - w / 2, h, z), b = toGame(x + w / 2, 0, z), bh = b[1] - a[1]; if (bh > 30 && p.z > 0) st.bbRect = [a[0], a[1], b[0] - a[0], bh * 0.66]; }   // the review poster: route66.js opens the card when this is tapped
    }
    for (let i = 0; i < st.objs.length; i++) {
      const o = st.objs[i]; if (o.z < -900) continue;   // already hit or picked up
      const spr = o.bad && o.kind === "car" ? o.spr : SP[o.kind]; if (!spr || !(spr.w > 0)) continue;
      const v = view(o), ow = (OW[o.kind] || 60) * 1.15, oh = ow * spr.h / spr.w, x = o.wx + off(o.z), z = -o.z * KZ;
      if (!o.bad) {   // goodies float over a gold ring
        if (!v.a) { v.a = mesh(UP, spr, 0); v.b = mesh(FLAT, ringC, -1); }
        put(v.a, x, 16 + Math.sin(st.t / 220 + o.bob) * 7, z, ow, oh); const rw = Math.max(ow, 64) * 1.7; v.b.position.set(x, 0, z); v.b.scale.set(rw, 1, rw * 1.5);
      } else if (o.kind === "hole") { if (!v.a) v.a = mesh(FLAT, spr, -1); v.a.position.set(x, 0, z); v.a.scale.set(ow * 1.15, 1, ow * 1.9); }
      else if (o.kind === "weed") { if (!v.a) v.a = mesh(MID, spr, 0); put(v.a, x, ow / 2, z, ow, ow); v.a.rotation.z = -o.rot; shadow(v, x, z, ow * 1.2, ow * 1.3); }
      else if (o.kind === "deer") { if (!v.a) v.a = mesh(UP, spr, 0); put(v.a, x, Math.abs(Math.sin(st.t / 90)) * 9, z, (o.vx > 0 ? -ow : ow) * 1.25, oh * 1.25); shadow(v, x, z, ow * 1.3, ow * 0.9); }   // the photo faces left
      else { if (!v.a) v.a = mesh(UP, spr, 0); put(v.a, x, 0, z, ow, oh); if (o.kind === "car") { v.a.rotation.z = -Math.max(-0.13, Math.min(0.13, (o.lean || 0) / 900)); shadow(v, x, z - 6, ow * 1.45, oh * 1.5); } }
    }
    views.forEach((v, key) => { if (v.n !== frameNo) { drop(v); views.delete(key); } });
    smoke(st, dt);
    renderer.render(scene, cam);
  }

  /* ---------- warm up on the menu, then switch the 2D road off ---------- */
  renderer.initTexture(tex(blobC)); renderer.initTexture(tex(ringC)); Object.values(gphoto).forEach(im => { if (ready(im)) renderer.initTexture(gtex(im)); });
  Object.keys(SP).forEach(n => { const s = SP[n]; if (s && s.w > 0) { mat(s); renderer.initTexture(tex(s)); } });
  drawFrame(R.get(), 0.016);   // compiles every shader this view will ever use
  const off2d = () => { R3.on = false; R3.render = null; STATUS.on = false; cv.remove(); game.style.background = ""; };
  let odd = 0, frames = 0, fpsT = 0;
  R3.render = function (now, dtMs) {
    try {
      const st = R.get(), covered = st.phase === "finish" || (st.phase === "dead" && st.deadAtStop) || (st.phase === "stop" && st.stopT > 0.5);   // the cook stop paints the whole 2D canvas
      if (!dirty && (!visible || document.hidden || covered || st.over || st.paused)) return;
      if (!dirty && q.lock30 && (odd ^= 1)) return;
      const dt = Math.min(0.05, dtMs / 1000) * (q.lock30 ? 2 : 1); dirty = false;
      drawFrame(st, covered || st.over || st.paused ? 0 : dt);
      frames++; fpsT += dt;
      if (fpsT >= 1) { STATUS.fps = Math.round(frames / fpsT); const r = q.sample(STATUS.fps); frames = 0; fpsT = 0; if (r === "fail" && !st.running) { STATUS.reason = "low fps, 2D road"; off2d(); } }
    } catch (e) { STATUS.reason = "render failed: " + (e && e.message || e); console.warn("[route66-3d] back to 2D:", e); off2d(); }
  };
  game.style.background = "transparent"; cv.style.visibility = "visible"; R3.on = STATUS.on = true;
}
