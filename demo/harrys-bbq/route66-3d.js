/* Harry's · Route 66 — the 3D drive view (2026-11-10). VISUAL ONLY.
   route66.js keeps every rule, score, hitbox and the whole cook stop, and still owns the 2D canvas (HUD, labels, pops).
   This module draws the same road state in WebGL on a canvas UNDER that one, the way storm-burger/storm3d.js does:
   a chase camera behind the rig, the road bending for real, smoke off the stack.
   The rig, the traffic and the cones are real 3D models (route66-models.js) under a sun and a sky: they catch light, reflect
   and throw shadows. Scenery, animals and food stay photo cut-outs (unlit, true colour) that stand in the same depth and
   throw shadows too. Every shader is compiled on the menu, objects are pooled.
   ?render=2d, no WebGL, a failed boot, or LOW not holding 30 fps on the menu all leave the 2D road exactly as it was. */
const R = window.__R66, REQ = (new URLSearchParams(location.search).get("render") || "").toLowerCase();
const STATUS = window.__R663 = { on: false, reason: "", fps: 0, tier: "" };
function hasWebGL() { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (e) { return false; } }
if (R && REQ !== "2d") {
  if (!hasWebGL()) STATUS.reason = "no WebGL";
  else {
    // Play waits for the 3D models (20 s at most) so a run never starts on the flat road and never swaps mid-drive
    const R3 = R.r3d, free = () => { R3.wait = false; const go = R3.go; R3.go = null; if (go) go(); };
    R3.wait = true; setTimeout(free, 20000);
    boot().catch(e => { STATUS.reason = "boot failed: " + (e && e.message || e); console.warn("[route66-3d] staying 2D:", e); R3.on = false; R3.render = null; }).then(free);
  }
}

async function boot() {
  const THREE = await import("three"), QM = await import("../engine3d/quality.js?v=e3v");
  const { RoundedBoxGeometry } = await import("three/addons/geometries/RoundedBoxGeometry.js"), { mergeGeometries } = await import("three/addons/utils/BufferGeometryUtils.js"), { makeModels } = await import("./route66-models.js?v=1");
  const R3 = R.r3d, K = R.K, SP = R.SP, OW = R.OW, off = R.off;
  const KZ = 4, FAR = K.ZMAX * KZ;                       // game z -> world depth; the game's lanes (wx) are world X as they are
  const U = 56, RZ = 172, HITCH = 1.47 * U;              // world units per metre; the truck's rear bumper (its nose is where the game's hits happen); hitch ball behind the rear axle
  const CAM_Y = 320, CAM_Z = 740, LOOK_Y = CAM_Y - 151, LOOK_Z = CAM_Z - 1000;   // same pitch as before (horizon at y 236 of 640), pulled back to fit the whole rig
  const ready = im => im && (im.naturalWidth > 0 || im.width > 0 && !("naturalWidth" in im));
  // the photos load on their own clock: wait for the rig, the first sky and the smoke before going 3D (30 s, then stay 2D)
  for (let i = 0; !(SP.truck && SP.fire && ready(R.BGI[0]) && R.SMK.every(ready)); i++) { if (i > 300) throw new Error("art not loaded"); await new Promise(r => setTimeout(r, 100)); }
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
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: !QM.isCar(), powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
  const q = QM.makeQuality({ id: "harrys-route66", renderer, target: 50, minFps: 30, calm: () => R.get().phase !== "drive" });
  let cfg = q.cfg; STATUS.tier = q.smooth ? "smooth" : q.tier;
  const wantSh = c => c.shadows > 0 || (q.smooth && !QM.isCar());   // phones get real shadows too; they go first if the frame rate drops
  let shOn = STATUS.shadows = wantSh(cfg); renderer.shadowMap.enabled = shOn; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

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
  q.onChange((t, c) => { cfg = c; STATUS.tier = q.smooth ? "smooth" : t; if (shOn && !wantSh(c)) shadowsOff(); size(); });
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
    if (!m) { m = new THREE.MeshBasicMaterial({ map: tex(src), transparent: true, depthWrite: false, side: THREE.DoubleSide }); mats.set(src, m); }
    return m;
  }
  function paint(w, h, f) { const c = document.createElement("canvas"); c.width = w; c.height = h; f(c.getContext("2d"), w, h); return c; }
  // only the 3D models write depth; the rest is drawn sky, ground, shoulder, road, shadows, decals, then the cut-outs far to near, hidden where a model is in front
  const UP = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0), MID = new THREE.PlaneGeometry(1, 1), FLAT = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);

  /* ---------- the ground, the shoulders and the road ---------- */
  const RT = 720, RW = 247.5, SHW = 335;   // one texture tile = 720 world units of road; asphalt half-width (same as the 2D road); dirt half-width
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
  const flatMat = (c, order) => { const m = new THREE.MeshBasicMaterial({ map: tex(c), transparent: true, depthWrite: false }); m.userData.order = order; return m; };
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
  const BW = 6200, BH = BW * 583 / 1600, skyMat = new THREE.MeshBasicMaterial({ map: tex(R.BGI[0]), fog: false, transparent: true, depthWrite: false });
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
    hemi.color.set(L.sky[0]).lerp(WHITE, 0.45); hemi.groundColor.set(L.g1).lerp(WHITE, 0.2); sun.color.set(L.sun);
  }

  /* ---------- pooled cut-outs ---------- */
  const pool = [], views = new Map(); let frameNo = 0;
  const dmats = new Map();
  function dmat(src) {   // a cut-out's shadow has the shape of its picture
    let m = dmats.get(src);
    if (!m) { m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex(src), alphaTest: 0.5 }); dmats.set(src, m); }
    return m;
  }
  function mesh(geo, src, order, cast) {
    const m = pool.pop() || new THREE.Mesh(geo, mat(src)); m.geometry = geo; m.material = mat(src); m.renderOrder = order || 0; m.visible = true; m.rotation.set(0, 0, 0);
    m.castShadow = !!cast; m.customDepthMaterial = cast ? dmat(src) : undefined;
    if (!m.parent) scene.add(m); return m;
  }
  const blobC = paint(64, 64, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 2, w / 2, w / 2, w / 2); gr.addColorStop(0, "rgba(0,0,0,.6)"); gr.addColorStop(0.6, "rgba(0,0,0,.32)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
  const ringC = paint(128, 128, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 4, w / 2, w / 2, w / 2); gr.addColorStop(0, "rgba(255,214,140,.5)"); gr.addColorStop(0.5, "rgba(255,190,96,.2)"); gr.addColorStop(1, "rgba(255,180,80,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, w); });   // soft warm light on the road, no outline
  function view(key) { let v = views.get(key); if (!v) { v = { a: null, b: null, n: 0, own: null }; views.set(key, v); } v.n = frameNo; return v; }
  function drop(v) {
    if (v.a) { v.a.visible = false; pool.push(v.a); } if (v.b) { v.b.visible = false; pool.push(v.b); } if (v.g) { v.g.visible = false; vpool[v.gk].push(v.g); }
    if (v.own) { [texs, mats, dmats].forEach(M => { const x = M.get(v.own); if (x) x.dispose(); M.delete(v.own); }); }   // each mileage sign is its own little canvas
  }

  /* ---------- sun, sky light and shadows ---------- */
  const WHITE = new THREE.Color(0xffffff), hemi = new THREE.HemisphereLight(0xffffff, 0xffffff, 1), sun = new THREE.DirectionalLight(0xffffff, 2.4);
  sun.target.position.set(0, 0, -1300); sun.position.copy(sun.target.position).addScaledVector(new THREE.Vector3(-0.7, 0.6, 0.35).normalize(), 3000);   // from the left, behind the camera: lit tails, shadows across the next lane
  { const sh = sun.shadow, c = sh.camera, S = 1800; c.left = c.bottom = -S; c.right = c.top = S; c.near = 100; c.far = 6000; c.updateProjectionMatrix(); sh.mapSize.setScalar(q.smooth ? 1024 : cfg.shadowSize || 1024); sh.bias = -0.0005; sh.normalBias = 2; }
  sun.castShadow = shOn; scene.add(hemi, sun, sun.target);
  const shPlane = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: 0.42, depthWrite: false }));   // the road itself is unlit: this layer only darkens where a shadow falls
  shPlane.position.set(0, 0.5, -1500); shPlane.receiveShadow = true; shPlane.renderOrder = -5; shPlane.frustumCulled = false; shPlane.visible = shOn; scene.add(shPlane);
  function shadowsOff() { shOn = STATUS.shadows = false; sun.castShadow = false; shPlane.visible = false; }   // the soft blobs take over
  { // what the paint and the chrome reflect: a late-afternoon sky with a hot sun, baked once
    const ec = paint(64, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); [[0, "#4f7fc0"], [0.47, "#f3c79a"], [0.5, "#ffe2b0"], [0.53, "#b98a5e"], [1, "#7a5a3c"]].forEach(a => gr.addColorStop(a[0], a[1])); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    const es = new THREE.Scene(), et = new THREE.CanvasTexture(ec), ball = new THREE.Mesh(new THREE.SphereGeometry(5, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(8, 6, 3.5) })), pm = new THREE.PMREMGenerator(renderer);
    et.colorSpace = THREE.SRGBColorSpace; es.add(new THREE.Mesh(new THREE.SphereGeometry(50, 24, 16), new THREE.MeshBasicMaterial({ map: et, side: THREE.BackSide }))); ball.position.set(-32, 24, -18); es.add(ball);
    scene.environment = pm.fromScene(es, 0.03).texture; pm.dispose(); et.dispose();
  }

  /* ---------- the 3D models: the rig, the traffic, the cones ---------- */
  const M = makeModels(THREE, RoundedBoxGeometry, mergeGeometries);
  /* photo-real meshes we generated (engine3d/CREDITS.md), each turned, sized and set down like the code-built model it replaces; one that is slow or fails to load keeps that stand-in */
  const GLB = { truck: [5.5], trailer: [4.0, 1.0], car1: [5.1], car2: [4.9], car3: [4.9] }, G = {};   // length in metres; a second number = measured from its front, which sits that far ahead of z 0 (the smoker's tongue reaches under the bumper to the hitch)
  try {
    const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js"), { MeshoptDecoder } = await import("three/addons/libs/meshopt_decoder.module.js"), ld = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder), box = new THREE.Box3(), v = new THREE.Vector3();
    await Promise.all(Object.keys(GLB).map(k => Promise.race([ld.loadAsync(new URL("./models/" + k + ".glb", import.meta.url).href), new Promise((_, no) => setTimeout(no, 25000))]).then(gl => {
      const s = gl.scene, g = new THREE.Group(), top = new THREE.Vector3(0, -1, 0);
      s.rotation.y = -Math.PI / 2; s.updateMatrixWorld(true); box.setFromObject(s);   // they come lying along x
      const f = GLB[k][0] / (box.max.z - box.min.z);
      s.scale.setScalar(f); s.position.set(-f * (box.min.x + box.max.x) / 2, -f * box.min.y, GLB[k][1] ? -f * box.min.z - GLB[k][1] : -f * box.max.z); s.updateMatrixWorld(true);
      s.traverse(o => { if (!o.isMesh) return; o.castShadow = o.receiveShadow = true; const p = o.geometry.attributes.position; for (let i = 0; i < p.count; i++) if (v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld).y > top.y) top.copy(v); });
      g.userData.top = top; g.add(s); G[k] = g;   // top = its highest point, where the smoker's stack ends
    }, () => {})));
  } catch (e) {}
  STATUS.models = Object.keys(G);
  const glowC = paint(64, 64, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(255,255,255,.55)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
  const glowM = c => new THREE.SpriteMaterial({ map: tex(glowC), color: c, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false, opacity: 0.85 }), RED = glowM(0xff3018), EMBER = glowM(0xff8a2a);
  function glow(g, m, x, y, z, s) { const sp = new THREE.Sprite(m); sp.position.set(x, y, z); sp.scale.set(s, s, 1); g.add(sp); }   // lamp glow: light added on top, in the model's own metres
  const protos = { car1: G.car1 || M.sedan(0x4fb3b0), car2: G.car2 || M.pickup(0xefe2c0), car3: G.car3 || M.wagon(0xa8231c), cone: M.cone() }, vpool = { car1: [], car2: [], car3: [], cone: [] };
  [["car1", 0.9, 1.0], ["car2", 0.9, 1.06], ["car3", 0.84, 0.78]].forEach(a => [-1, 1].forEach(s => glow(protos[a[0]], RED, s * a[1], a[2], 0.14, 0.55)));
  Object.keys(protos).forEach(k => protos[k].scale.setScalar(k === "cone" ? U * 1.8 : U));
  function veh(key) { const g = vpool[key].pop() || protos[key].clone(); g.visible = true; g.rotation.set(0, 0, 0); if (!g.parent) scene.add(g); return g; }   // clones share geometry and materials
  // the rig: the truck turns about its rear axle, the smoker hangs on the hitch ball and swings on it
  const rig = new THREE.Group(), pivot = new THREE.Group(), truck = G.truck || M.pickup(0xb3201a), trailer = G.trailer || M.trailer(), heroSh = mesh(FLAT, blobC, -1), TL = G.trailer ? [0.51, 0.42, 3.02] : [0.7, 0.47, 2.86];
  if (G.trailer) { trailer.userData.stack = trailer.userData.top; trailer.userData.fire = new THREE.Vector3(0, 1.0, 2.55); }   // its firebox door faces back
  [-1, 1].forEach(s => { glow(truck, RED, s * 0.9, 1.06, 0.14, 0.5); glow(trailer, RED, s * TL[0], TL[1], TL[2], 0.42); }); glow(trailer, EMBER, trailer.userData.fire.x, trailer.userData.fire.y, trailer.userData.fire.z + 0.1, 0.8);
  truck.scale.setScalar(U); trailer.scale.setScalar(U); pivot.position.z = RZ - 1.2 * U; truck.position.z = 1.2 * U; pivot.add(truck); trailer.position.z = RZ + 0.27 * U; rig.add(pivot, trailer); scene.add(rig);
  // the truck's four wheels are their own parts (cut out of the mesh, engine3d/CREDITS.md): they roll, and the front pair steers
  const wheels = ["wheel_fl", "wheel_fr", "wheel_rl", "wheel_rr"].map(n => truck.getObjectByName(n)).filter(Boolean), NOSE = 2.4 * U;   // NOSE = rear axle to the middle of the cab, the part the game's hit box follows
  wheels.forEach(w => { w.rotation.order = "YZX"; }); rig.updateMatrixWorld(true);
  const wheelR = wheels[0] ? new THREE.Box3().setFromObject(wheels[0]).getSize(new THREE.Vector3()).y / 2 : 1;
  let rearX = 0, steerA = 0, spin = 0;
  heroSh.scale.set(175, 1, 540);
  const stackW = new THREE.Vector3(), hoodW = new THREE.Vector3();

  /* ---------- smoke off the stack ---------- */
  const puffs = []; let puffI = 0, puffAcc = 0;
  for (let i = 0; i < 30; i++) {
    const im = R.SMK[i % 3], m = new THREE.SpriteMaterial({ map: tex(im), transparent: true, depthWrite: false, opacity: i ? 0 : 0.01 }), s = new THREE.Sprite(m);
    s.visible = !i; s.renderOrder = 2; scene.add(s); puffs.push({ s, m, t: 9, life: 1, vx: 0, vy: 0, vz: 0, vr: 0, k: im.naturalHeight / im.naturalWidth, w0: 20, w1: 90 });   // the first one is on for the warm-up compile
  }
  function smoke(st, dt) {
    puffAcc += dt * (st.speed > 30 ? 10 + st.speed / 70 : 5);
    while (puffAcc >= 1) {
      puffAcc -= 1; const p = puffs[puffI = (puffI + 1) % puffs.length];
      p.t = 0; p.life = 1.25 + Math.random() * 0.6; p.s.position.set(stackW.x + (Math.random() - 0.5) * 6, stackW.y, stackW.z); p.s.visible = true;
      p.vx = -st.bend * 26 + (Math.random() - 0.5) * 26; p.vy = 36 + Math.random() * 26; p.vz = 120 + st.speed * 0.2 + Math.random() * 30;   // rises a little, and the wind of the drive streams it back off the tail (not up over the cab)
      p.vr = (Math.random() - 0.5) * 1.6; p.m.rotation = Math.random() * 6.28; p.w0 = 16 + Math.random() * 8; p.w1 = 78 + Math.random() * 44;
    }
    for (let i = 0; i < puffs.length; i++) {
      const p = puffs[i]; if (!p.s.visible) continue;
      p.t += dt; const u = p.t / p.life; if (u >= 1) { p.s.visible = false; continue; }
      p.s.position.x += p.vx * dt; p.s.position.y += p.vy * dt; p.s.position.z += p.vz * dt; p.vy *= 1 - dt * 0.5; p.m.rotation += p.vr * dt;
      const w = p.w0 + (p.w1 - p.w0) * (1 - (1 - u) * (1 - u)); p.s.scale.set(w, w * p.k, 1); p.m.opacity = Math.min(1, u * 7) * (1 - u) * (1 - u) * 0.5;
    }
  }

  /* ---------- damage: engine smoke and flames, tyre and crash dust ---------- */
  const fxs = [], fires = []; let fxI = 0, fireI = 0, engAcc = 0, fireAcc = 0, dustAcc = 0;
  for (let i = 0; i < 44; i++) {
    const im = R.SMK[i % 3], m = new THREE.SpriteMaterial({ map: tex(im), transparent: true, depthWrite: false, opacity: i ? 0 : 0.01 }), s = new THREE.Sprite(m);
    s.visible = !i; scene.add(s); fxs.push({ s, m, t: 9, life: 1, vx: 0, vy: 0, vz: 0, k: im.naturalHeight / im.naturalWidth, w0: 20, w1: 90, a: 0.5 });
  }
  for (let i = 0; i < 14; i++) {   // the flame photo is on black: added as light
    const m = new THREE.SpriteMaterial({ map: tex(SP.fire), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: i ? 0 : 0.01 }), s = new THREE.Sprite(m);
    s.center.set(0.5, 0.04); s.visible = !i; s.renderOrder = 0.95; scene.add(s); fires.push({ s, m, t: 9, life: 1, h: 80, x: 0, flip: 1 });
  }
  function puff(x, y, z, col, order, w0, w1, life, a, vx, vy, vz) {
    const p = fxs[fxI = (fxI + 1) % fxs.length]; p.t = 0; p.life = life; p.w0 = w0; p.w1 = w1; p.a = a; p.vx = vx; p.vy = vy; p.vz = vz;
    p.m.color.setHex(col); p.m.rotation = Math.random() * 6.28; p.s.renderOrder = order; p.s.position.set(x, y, z); p.s.visible = true;
  }
  const rs = n => (Math.random() - 0.5) * n;
  function damage(st, dt) {
    const d = st.dmg || 0, wind = st.speed * 0.25;
    if (d > 0) {   // off the hood: the cab hides where it starts
      engAcc += dt * (4 + d * 6);
      while (engAcc >= 1) { engAcc -= 1; puff(hoodW.x + rs(44), hoodW.y + 10 + rs(16), hoodW.z, [0, 0x9a9a9a, 0x4a4744, 0x23211f][d], 0.9, 26 + d * 6, 80 + d * 34, 1 + Math.random() * 0.5, 0.42 + d * 0.13, -st.bend * 26 + rs(24), 74 + Math.random() * 40, 30 + wind); }
    }
    if (d > 1) {
      fireAcc += dt * (d > 2 ? 22 : 9);
      while (fireAcc >= 1) { fireAcc -= 1; const f = fires[fireI = (fireI + 1) % fires.length]; f.t = 0; f.life = 0.32 + Math.random() * 0.3; f.h = (d > 2 ? 136 : 100) * (0.8 + Math.random() * 0.45); f.x = rs(d > 2 ? 76 : 50); f.flip = Math.random() < 0.5 ? -1 : 1; f.s.visible = true; }
    }
    if (st.flat > 0) {   // the popped rear tyre drags
      dustAcc += dt * 14;
      while (dustAcc >= 1) { dustAcc -= 1; puff(st.px - 48 + rs(10), 6, RZ - 1.2 * U + 10, 0xc9b08a, 1.6, 14, 62, 0.7 + Math.random() * 0.3, 0.5, rs(30) - 14, 16 + Math.random() * 18, 120 + wind); }
    }
    for (let i = 0; i < fxs.length; i++) {
      const p = fxs[i]; if (!p.s.visible) continue;
      p.t += dt; const u = p.t / p.life; if (u >= 1) { p.s.visible = false; continue; }
      p.s.position.x += p.vx * dt; p.s.position.y += p.vy * dt; p.s.position.z += p.vz * dt;
      const w = p.w0 + (p.w1 - p.w0) * (1 - (1 - u) * (1 - u)); p.s.scale.set(w, w * p.k, 1); p.m.opacity = Math.min(1, u * 7) * (1 - u) * p.a;
    }
    for (let i = 0; i < fires.length; i++) {   // each tongue grows, leans with the wind and dies in a third of a second
      const f = fires[i]; if (!f.s.visible) continue;
      f.t += dt; const u = f.t / f.life; if (u >= 1) { f.s.visible = false; continue; }
      const h = f.h * (0.55 + 0.45 * u); f.s.position.set(hoodW.x + f.x, hoodW.y, hoodW.z); f.s.scale.set(h * 0.69 * f.flip, h, 1); f.m.opacity = Math.min(1, u * 6) * (1 - u * u) * 0.8;
    }
  }

  /* ---------- one frame ---------- */
  const v3 = new THREE.Vector3();
  const toGame = (x, y, z) => { v3.set(x, y, z).project(cam); return [(v3.x * 0.5 + 0.5) * K.VW, (0.5 - v3.y * 0.5) * K.VH]; };
  function put(m, x, y, z, w, h) { m.position.set(x, y, z); m.scale.set(w, h, 1); }
  function shadow(v, x, z, w, d) { if (shOn) { if (v.b) v.b.visible = false; return; } if (!v.b) v.b = mesh(FLAT, blobC, -1); v.b.position.set(x, 0, z); v.b.scale.set(w, 1, d); }
  function drawFrame(st, dt) {
    frameNo++;
    if (legShown !== st.leg) dress(st);
    const sh = st.shake > 0 ? st.shake : 0;
    cam.position.set(st.camX + (Math.random() - 0.5) * sh * 26, CAM_Y + (Math.random() - 0.5) * sh * 16, CAM_Z);
    cam.lookAt(st.camX + st.bend * 36, LOOK_Y, LOOK_Z); cam.rotateZ(-(st.tilt || 0) * 0.06); cam.updateMatrixWorld();   // banks a touch into the lane change
    const k = st.bgX < 400 ? st.bgX / 400 : (800 - st.bgX) / 400; sky.position.x = cam.position.x + (0.5 - k) * 1700; sky.position.y = -40;   // the bends pan the sky like the 2D road does
    const sc = st.dist * KZ / RT; scroll.forEach(t => { t.offset.y = sc % 1; }); groundMat.map.offset.y = (st.dist * KZ / GT) % 2;
    bendDirt(); bendRoad();
    const flat = st.flat > 0, ty = Math.sin(st.dist / 46) * 0.9 + (flat ? Math.abs(Math.sin(st.t / 45)) * 2.4 : 0), sw = st.sway || 0, V = Math.max(st.speed * KZ, 500);
    // it steers like a real truck: the cab goes where the game puts it and drags the rear axle after it, so the nose swings into the lane change and the tail follows
    rearX += (st.px - rearX) * (1 - Math.exp(-V / NOSE * dt)); rearX = Math.max(st.px - NOSE * 0.42, Math.min(st.px + NOSE * 0.42, rearX));
    const yaw = -Math.asin((st.px - rearX) / NOSE);
    steerA += (Math.max(-0.6, Math.min(0.6, Math.atan2(st.pv || 0, V) + yaw)) - steerA) * Math.min(1, dt * 18);   // the front wheels point where the cab is heading
    rig.position.set(rearX, ty, 0); pivot.rotation.set(0, yaw, steerA * 0.12 + (flat ? 0.04 : 0));   // the body rolls out of the turn; a flat drops the left rear
    spin += Math.min(V / wheelR, 16) * dt;   // slower than true so the spokes read as rolling instead of strobing
    for (let i = 0; i < wheels.length; i++) { wheels[i].rotation.z = spin; if (wheels[i].name.charAt(6) === "f") wheels[i].rotation.y = -steerA; }
    trailer.position.x = HITCH * Math.sin(pivot.rotation.y); trailer.position.y = Math.sin(st.dist / 23) * 0.8; trailer.rotation.set(0, sw * 0.012, -sw * 0.004);   // the hitch swings out with the truck's tail, the smoker lags behind it
    rig.updateMatrixWorld(true); trailer.localToWorld(stackW.copy(trailer.userData.stack)); truck.localToWorld(hoodW.set(0, 1.3, -4.6));
    heroSh.visible = !shOn; heroSh.position.set(st.px, 0, RZ - 30);

    st.bbRect = null;
    for (let i = 0; i < st.props.length; i++) {
      const p = st.props[i], spr = p.spr; if (!spr || !(spr.w > 0)) continue;
      const v = view(p), h = p.h * 2.3, w = h * spr.w / spr.h, x = p.wx * (p.k === "billboard" ? 1.36 : 1.5) + off(p.z), z = -p.z * KZ;   // the review board hugs the shoulder so phones see all of it
      if (!v.a) { v.a = mesh(UP, spr, 0, true); if (p.k === "sign") v.own = spr; }
      put(v.a, x, 0, z, w, h);
      if (p.k === "billboard") { const a = toGame(x - w / 2, h, z), b = toGame(x + w / 2, 0, z), bh = b[1] - a[1]; if (bh > 30 && p.z > 0) st.bbRect = [a[0], a[1], b[0] - a[0], bh * 0.66]; }   // the review poster: route66.js opens the card when this is tapped
    }
    for (let i = 0; i < st.objs.length; i++) {
      const o = st.objs[i]; if (o.z < -900) continue;   // already hit or picked up
      const x = o.wx + off(o.z), z = -o.z * KZ;
      if (o.bad && (o.kind === "car" || o.kind === "cone")) {   // real models; a car's tail is at the game's z, so the truck's nose meets it right when the game says hit
        const v = view(o), key = o.kind === "cone" ? "cone" : o.spr === SP.car1 ? "car1" : o.spr === SP.car2 ? "car2" : "car3";
        if (!v.g) { v.g = veh(key); v.gk = key; v.ph = Math.random() * 6.28; }
        if (key === "cone") { v.g.position.set(x, 0, z); shadow(v, x, z, 64, 64); continue; }
        const ln = Math.max(-0.13, Math.min(0.13, (o.lean || 0) / 900)), rz = o.rotz || 0;
        v.g.position.set(x, 0.9 + Math.sin(st.dist / 37 + v.ph) * 0.9, z); shadow(v, x, z - 140, 175, 350);   // rides on its springs
        v.g.rotation.set(0, o.kx ? -rz * 1.5 : -ln * 1.2, o.kx ? -rz * 0.25 : ln * 0.3);   // steers into a weave; one that got hit spins off toward the shoulder in a cloud of dust
        if (o.kx && !v.hit) { v.hit = true; for (let j = 0; j < 7; j++) puff(x + rs(60), 10 + Math.random() * 30, z - 100, j % 2 ? 0xb9a487 : 0x6a6660, 0.5, 24, 100 + Math.random() * 50, 0.7 + Math.random() * 0.5, 0.55, rs(90) + o.kx * 0.2, 30 + Math.random() * 50, 40); }
        continue;
      }
      const spr = SP[o.kind]; if (!spr || !(spr.w > 0)) continue;
      const v = view(o), ow = (OW[o.kind] || 60) * 1.15, oh = ow * spr.h / spr.w;
      if (!o.bad) {   // goodies float over a gold ring
        if (!v.a) { v.a = mesh(UP, spr, 0); v.b = mesh(FLAT, ringC, -1); }
        put(v.a, x, 16 + Math.sin(st.t / 220 + o.bob) * 7, z, ow, oh); const rw = Math.max(ow, 64) * 1.7; v.b.position.set(x, 0, z); v.b.scale.set(rw, 1, rw * 1.5);
      } else if (o.kind === "hole") { if (!v.a) v.a = mesh(FLAT, spr, -1); v.a.position.set(x, 0, z); v.a.scale.set(ow * 1.15, 1, ow * 1.9); }
      else if (o.kind === "weed") { if (!v.a) v.a = mesh(MID, spr, 0, true); put(v.a, x, ow / 2, z, ow, ow); v.a.rotation.z = -o.rot; shadow(v, x, z, ow * 1.2, ow * 1.3); }
      else if (o.kind === "deer") {   // the photo faces left and is mid-leap: it bounds across in arcs, nose up then down, its shadow shrinking under it, dust where it lands
        const u = Math.abs(o.wx + 4000) / 75 % 1, hop = 4 * u * (1 - u), dir = o.vx > 0 ? -1 : 1, dh = oh * 1.25;
        if (!v.a) v.a = mesh(MID, spr, 0, true); put(v.a, x, dh / 2 + hop * 34, z, dir * ow * 1.25, dh); v.a.rotation.z = -dir * (0.5 - u) * 0.5;
        shadow(v, x, z, ow * 1.3 * (1 - hop * 0.35), ow * 0.9 * (1 - hop * 0.35));
        if (v.u > u + 0.5) puff(x, 5, z, 0xc9b08a, 1.6, 12, 50, 0.5, 0.4, rs(24), 14, st.speed * KZ);
        v.u = u;
      }
      else { if (!v.a) v.a = mesh(UP, spr, 0, true); put(v.a, x, 0, z, ow, oh); }
    }
    views.forEach((v, key) => { if (v.n !== frameNo) { drop(v); views.delete(key); } });
    smoke(st, dt); damage(st, dt);
    renderer.render(scene, cam);
  }

  /* ---------- warm up on the menu, then switch the 2D road off ---------- */
  renderer.initTexture(tex(blobC)); renderer.initTexture(tex(ringC)); Object.values(gphoto).forEach(im => { if (ready(im)) renderer.initTexture(gtex(im)); });
  Object.keys(SP).forEach(n => { const s = SP[n]; if (s && s.w > 0) { mat(s); renderer.initTexture(tex(s)); } });
  { const warm = Object.keys(protos).map(k => { const g = veh(k); g.position.set(0, 0, -400); return [k, g]; }), wd = mesh(UP, SP.truck, 0, true); put(wd, 120, 0, -300, 80, 80);
    drawFrame(R.get(), 0.016);   // compiles every shader this view will ever use, with one of every model and a shadow-casting cut-out in front of the camera
    warm.forEach(a => { a[1].visible = false; vpool[a[0]].push(a[1]); }); wd.visible = false; pool.push(wd); dirty = true; }
  const off2d = () => { R3.on = false; R3.render = null; STATUS.on = false; cv.remove(); game.style.background = ""; };
  let odd = 0, frames = 0, fpsT = 0, slow = 0;
  R3.render = function (now, dtMs) {
    try {
      const st = R.get(), covered = st.phase === "finish" || (st.phase === "dead" && st.deadAtStop) || (st.phase === "stop" && st.stopT > 0.5);   // the cook stop paints the whole 2D canvas
      if (!dirty && (!visible || document.hidden || covered || st.over || st.paused)) return;
      if (!dirty && q.lock30 && (odd ^= 1)) return;
      const dt = Math.min(0.05, dtMs / 1000) * (q.lock30 ? 2 : 1); dirty = false;
      drawFrame(st, covered || st.over || st.paused ? 0 : dt);
      frames++; fpsT += dt;
      if (fpsT >= 1) {
        STATUS.fps = Math.round(frames / fpsT); frames = 0; fpsT = 0;
        if (shOn && q.smooth && STATUS.fps < 45) { if (++slow > 1) shadowsOff(); }   // a phone that can't hold it loses the real shadows first, before anything else steps down
        else { slow = 0; if (q.sample(STATUS.fps) === "fail" && !st.running) { STATUS.reason = "low fps, 2D road"; off2d(); } }
      }
    } catch (e) { STATUS.reason = "render failed: " + (e && e.message || e); console.warn("[route66-3d] back to 2D:", e); off2d(); }
  };
  game.style.background = "transparent"; cv.style.visibility = "visible"; R3.on = STATUS.on = true;
}
