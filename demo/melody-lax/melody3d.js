/* Melody Approach: optional real-3D renderer (three.js r160 + GLB models).
   VISUAL ONLY. The game in index.html keeps running exactly as before (logic, scoring, hitboxes, timing, HUD).
   When this layer is on, the game's 2D canvas becomes a transparent HUD/text overlay and this module draws the world
   (aerial LA ground, runway, landmarks, every aircraft, pickups, shots, smoke/fire/debris/explosions) in WebGL under it,
   reading positions, rotations and types from the game's own objects each frame (window.__M3 bridge).
   Camera: straight down over the same 400x600 field. The ground plane maps 1:1 to the 2D layout and every flying object is
   placed so it lands on exactly the same screen spot and size as its 2D sprite; altitude only adds parallax, real shadows
   and the 3D shape.
   Modes: ?render=2d (old renderer) · ?render=3d (force 3D) · default = MELODY_3D_DEFAULT below (auto: falls back to 2D if
   WebGL is missing or the frame rate stays under ~40 fps for 5 s). */
const MELODY_3D_DEFAULT = true;   // on by default (2026-10-11); auto-falls back to 2D if the phone stays under ~40 fps
const M = window.__M3;
const Q = new URLSearchParams(location.search);
const REQ = (Q.get("render") || "").toLowerCase();
const MODE = REQ === "2d" ? "off" : REQ === "3d" ? "force" : (window.MELODY_RENDER === "3d" || MELODY_3D_DEFAULT) ? "auto" : "off";
const STATUS = window.__M3STATUS = { mode: MODE, on: false, reason: "", fps: 0, loaded: 0 };

function hasWebGL() { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (e) { return false; } }

if (M && MODE !== "off") {
  if (!hasWebGL()) STATUS.reason = "no WebGL";
  else boot().catch(e => { STATUS.reason = "boot failed: " + (e && e.message || e); console.warn("[melody3d] staying 2D:", e); try { M.on(false); } catch (x) {} });
}

async function boot() {
  const THREE = await import("three");
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  const { MeshoptDecoder } = await import("three/addons/libs/meshopt_decoder.module.js");
  const W = M.W, H = M.H, S = M.S, FX = M.FX, FXI = FX._i(), TAU = Math.PI * 2;
  const D = 1000;                                   // camera height above the ground plane
  const ws = Y => (D - Y) / D;                      // world units per screen px at altitude Y
  const wx = (x, Y) => (x - W / 2) * ws(Y), wz = (y, Y) => (y - H / 2) * ws(Y);
  const A = { player: 150, ufo: 176, jet: 192, cop: 200, kami: 182, gun: 214, sj: 200, rp: 236, blimp: 250, item: 104, shot: 150, eshot: 164, air: 138 };

  /* ---------------- renderer, camera, lights ---------------- */
  const cv = document.getElementById("cv"), wrap = cv.parentNode;
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(W, H, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x0c1220, 1);
  const gl = renderer.domElement;
  gl.className = "m3d"; gl.setAttribute("aria-hidden", "true");
  gl.style.cssText = "position:absolute;left:0;top:0;width:100%;height:auto;aspect-ratio:400/600;border-radius:12px;z-index:-1;pointer-events:none;display:block";
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x3a4466, 760, 4200);   // dusk haze: the ground sits a touch deeper in it than the aircraft
  const cam = new THREE.PerspectiveCamera(2 * Math.atan(H / 2 / D) * 180 / Math.PI, W / H, 20, 2400);
  cam.position.set(0, D, 0); cam.up.set(0, 0, -1); cam.lookAt(0, 0, 0);
  const hemi = new THREE.HemisphereLight(0xc4d0ff, 0x3a2c22, 1.25);   // r160 lights are physical (÷π): these sum to ~1.05× on the flat ground so the aerial photo keeps its 2D brightness scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe0bc, 1.75);   // low warm LA sun from the upper left: shadows fall down-right like the 2D drop shadows
  sun.position.set(-170, 1000, -230); sun.target.position.set(0, 0, 0); scene.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -330, right: 330, top: 430, bottom: -430, near: 300, far: 1500 });
  sun.shadow.bias = -0.0015; sun.shadow.radius = 4; sun.shadow.camera.updateProjectionMatrix();
  const rim = new THREE.DirectionalLight(0x8fa6ff, 0.8); rim.position.set(220, 500, 300); scene.add(rim);   // cool sky fill on the far sides
  const FIRE_L = [0, 1, 2].map(() => { const l = new THREE.PointLight(0xff7a2a, 0, 340, 0); l.position.set(0, 40, 0); scene.add(l); return l; });

  /* ---------------- textures ---------------- */
  const mkc = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
  const canTex = (c, srgb) => { const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; return t; };
  // particle atlas, built from the game's own pre-rendered FX sprites so smoke/fire look like the 2D version
  const AW = 1024, AH = 256, atlas = mkc(AW, AH), ax = atlas.getContext("2d"), UV = {};
  const slot = (k, x, y, w, h) => { UV[k] = [x / AW, 1 - (y + h) / AH, (x + w) / AW, 1 - y / AH]; };
  FXI.SMK.forEach((row, sh) => row.forEach((c, v) => { const x = (sh * 3 + v) * 64; ax.drawImage(c, x, 0); slot("sm" + sh + v, x, 0, 64, 64); }));
  ax.drawImage(FXI.TONGUE, 768, 0); slot("tongue", 768, 0, 32, 64);
  ax.drawImage(FXI.TONGUEN, 800, 0); slot("tonguen", 800, 0, 32, 64);
  (() => { const g = ax.createRadialGradient(864, 32, 0, 864, 32, 31); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(.4, "rgba(255,255,255,.55)"); g.addColorStop(1, "rgba(255,255,255,0)"); ax.fillStyle = g; ax.fillRect(832, 0, 64, 64); slot("dot", 832, 0, 64, 64); })();
  ax.fillStyle = "#fff"; ax.fillRect(896, 0, 16, 16); slot("sq", 900, 4, 8, 8);
  (() => { const g = ax.createLinearGradient(960, 0, 992, 0); g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(.3, "rgba(255,255,255,.9)"); g.addColorStop(.5, "#fff"); g.addColorStop(.7, "rgba(255,255,255,.9)"); g.addColorStop(1, "rgba(255,255,255,0)"); ax.fillStyle = g; ax.beginPath(); ax.roundRect ? ax.roundRect(962, 2, 28, 124, 14) : ax.rect(962, 2, 28, 124); ax.fill(); slot("beam", 960, 0, 32, 128); })();
  ax.drawImage(FXI.GLOW, 0, 64); slot("glow", 0, 64, 64, 64);
  ax.drawImage(FXI.FBALL, 64, 64); slot("fball", 64, 64, 128, 128);
  ax.drawImage(FXI.SCORCH, 192, 64); slot("scorch", 192, 64, 128, 128);
  ax.strokeStyle = "#fff"; ax.lineWidth = 9; ax.beginPath(); ax.arc(384, 128, 56, 0, TAU); ax.stroke(); slot("ring", 320, 64, 128, 128);
  if (FXI.SPARK) { ax.drawImage(FXI.SPARK, 704, 64); slot("spark", 704, 64, 8, 32); }
  const CR = M.CARS; if (CR) { ax.drawImage(CR.WHITE, 648, 64); slot("car", 648, 64, 16, 32); ax.drawImage(CR.BEAM, 668, 64); slot("beam2", 668, 64, 32, 64); }
  let flameOK = false, smokeOK = false;
  function lateSprites() {   // the game's flame/smoke images may still be loading when we boot
    if (!flameOK && M.ready(S.flame)) { ax.clearRect(448, 64, 58, 160); ax.drawImage(S.flame, 448, 64, 58, 160); slot("flame", 448, 64, 58, 160); flameOK = true; atlasTex.needsUpdate = true; }
    if (!smokeOK && M.ready(S.smoke)) { ax.clearRect(512, 64, 128, 128); ax.drawImage(S.smoke, 512, 64, 128, 128); slot("smoke", 512, 64, 128, 128); smokeOK = true; atlasTex.needsUpdate = true; }
  }
  const atlasTex = canTex(atlas, false);
  lateSprites();

  /* ---------------- sprite batches (instanced quads lying flat, facing the camera) ---------------- */
  const VS = `attribute vec3 iPos; attribute vec3 iSz; attribute vec4 iUV; attribute vec4 iCol; varying vec2 vUv; varying vec4 vCol;
    void main(){ vec2 c=vec2(position.x*iSz.x, position.z*iSz.y); float s=sin(iSz.z), co=cos(iSz.z);
      vec3 p=iPos+vec3(c.x*co-c.y*s, 0.0, c.x*s+c.y*co); vUv=vec2(mix(iUV.x,iUV.z,uv.x), mix(iUV.y,iUV.w,uv.y)); vCol=iCol;
      gl_Position=projectionMatrix*viewMatrix*vec4(p,1.0); }`;
  const FS = `uniform sampler2D map; varying vec2 vUv; varying vec4 vCol; void main(){ vec4 t=texture2D(map,vUv); gl_FragColor=vec4(t.rgb*vCol.rgb, t.a*vCol.a); if(gl_FragColor.a<.003) discard; }`;
  class Batch {
    constructor(max, blending, order, tex) {
      const base = new THREE.PlaneGeometry(1, 1); base.rotateX(-Math.PI / 2);
      const g = new THREE.InstancedBufferGeometry(); g.index = base.index; g.setAttribute("position", base.getAttribute("position")); g.setAttribute("uv", base.getAttribute("uv"));
      this.max = max; this.p = new Float32Array(max * 3); this.s = new Float32Array(max * 3); this.u = new Float32Array(max * 4); this.c = new Float32Array(max * 4);
      this.ap = new THREE.InstancedBufferAttribute(this.p, 3); this.as = new THREE.InstancedBufferAttribute(this.s, 3); this.au = new THREE.InstancedBufferAttribute(this.u, 4); this.ac = new THREE.InstancedBufferAttribute(this.c, 4);
      [this.ap, this.as, this.au, this.ac].forEach(a => a.setUsage(THREE.DynamicDrawUsage));
      g.setAttribute("iPos", this.ap); g.setAttribute("iSz", this.as); g.setAttribute("iUV", this.au); g.setAttribute("iCol", this.ac);
      const mat = new THREE.ShaderMaterial({ uniforms: { map: { value: tex || atlasTex } }, vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, blending });
      this.mesh = new THREE.Mesh(g, mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = order; this.g = g; this.n = 0; scene.add(this.mesh);
    }
    begin() { this.n = 0; }
    // world position + world size + canvas-style rotation (clockwise on screen), atlas slot, colour (0-1) + alpha
    w(X, Y, Z, sw, sh, rot, uv, r, g, b, a) { if (this.n >= this.max || a <= .004 || !uv) return; const i = this.n++, p = this.p, s = this.s, u = this.u, c = this.c;
      p[i * 3] = X; p[i * 3 + 1] = Y; p[i * 3 + 2] = Z; s[i * 3] = sw; s[i * 3 + 1] = sh; s[i * 3 + 2] = rot;
      u[i * 4] = uv[0]; u[i * 4 + 1] = uv[1]; u[i * 4 + 2] = uv[2]; u[i * 4 + 3] = uv[3]; c[i * 4] = r; c[i * 4 + 1] = g; c[i * 4 + 2] = b; c[i * 4 + 3] = a; }
    // screen position/size (2D game px) at altitude Y
    q(x, y, Y, sw, sh, rot, uv, r, g, b, a) { const k = ws(Y); this.w(wx(x, Y), Y, wz(y, Y), sw * k, sh * k, rot, uv, r, g, b, a); }
    end() { this.g.instanceCount = this.n; [this.ap, this.as, this.au, this.ac].forEach(a => { a.needsUpdate = true; }); }
  }
  const Bg = new Batch(700, THREE.NormalBlending, 70);     // ground decals: scorch, skid marks
  const BgA = new Batch(700, THREE.AdditiveBlending, 71);  // ground light: fire glow, Nalu LEDs, collapse flash
  const Bn = new Batch(1400, THREE.NormalBlending, 120);   // smoke, dust, dark bits, on-airframe flames
  const Ba = new Batch(2600, THREE.AdditiveBlending, 130); // fire, embers, fireballs, glows, tracers, lasers, lights
  const Bc = new Batch(400, THREE.NormalBlending, 40);     // street traffic: car bodies (over the aerial tiles, under the runway + landmarks)
  const BcA = new Batch(1600, THREE.AdditiveBlending, 41); // headlight beams, head + tail lights
  const BATCHES = [Bg, BgA, Bn, Ba, Bc, BcA];
  const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
  const rgbaCache = {}; function rgb(s) { if (rgbaCache[s]) return rgbaCache[s]; let v; if (s[0] === "#") v = hex(s); else { const m = s.match(/[\d.]+/g).map(Number); v = [m[0] / 255, m[1] / 255, m[2] / 255]; } return rgbaCache[s] = v; }

  /* ---------------- models ---------------- */
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  const BASE = new URL("3d/", location.href).href, MODELS = {};
  const FILES = { plane: "plane.glb", jet: "jet.glb", ufo: "ufo.glb", cop0: "heli_blue.glb", cop1: "heli_black.glb",
    p_wings: "p_wings.glb", p_toast: "p_toast.glb", p_omelette: "p_omelette.glb", p_marg: "p_marg.glb", p_bottle: "p_bottle.glb", p_shots: "p_shots.glb", p_mic: "p_mic.glb", p_mac: "p_mac.glb" };
  async function loadModel(k) {
    try {
      const g = await loader.loadAsync(BASE + FILES[k]); const root = g.scene;
      root.traverse(o => { if (o.isMesh) { if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals(); const m = o.material; m.metalness = 0; m.roughness = .58; o.castShadow = true; o.receiveShadow = false; } });
      const box = new THREE.Box3().setFromObject(root), c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3());
      root.position.sub(c); const inner = new THREE.Group(); inner.add(root);
      MODELS[k] = { node: inner, size: sz }; STATUS.loaded++;
    } catch (e) { console.warn("[melody3d] model failed", k, e); }
  }
  await Promise.all(Object.keys(FILES).map(loadModel));
  if (!MODELS.plane) throw new Error("player model missing");

  // instances: each model type has a pool of clones; materials are cloned per clone so hit flashes/tints stay local
  const POOLS = {};
  function cloneModel(k, tint) {
    const src = MODELS[k]; const o = new THREE.Group(), inner = src.node.clone(true); const mats = [];
    inner.traverse(n => { if (n.isMesh) { n.material = n.material.clone(); if (tint) n.material.color.multiply(new THREE.Color(tint)); n.material.emissive = new THREE.Color(0); mats.push(n.material); } });
    o.add(inner); o.rotation.order = "YXZ"; o.userData = { mats, size: src.size, inner }; scene.add(o); return o;
  }
  function take(k, tint) { const P = POOLS[k + (tint || "")] || (POOLS[k + (tint || "")] = { list: [], n: 0, k, tint }); if (!MODELS[k]) return null;
    let o = P.list[P.n]; if (!o) { o = cloneModel(k, tint); P.list.push(o); } P.n++; o.visible = true; return o; }
  function poolsBegin() { for (const k in POOLS) POOLS[k].n = 0; }
  function poolsEnd() { for (const k in POOLS) { const P = POOLS[k]; for (let i = P.n; i < P.list.length; i++) P.list[i].visible = false; } }
  // place a model so it covers the same screen spot/size as the 2D sprite: x,y screen px, Y altitude, size in screen px along the model's X (span) or Z (length)
  function put(o, x, y, Y, px, byLen, yaw, roll, pitch) {
    const sz = o.userData.size, k = ws(Y) * px / (byLen ? sz.z : sz.x);
    o.position.set(wx(x, Y), Y, wz(y, Y)); o.scale.setScalar(k); o.rotation.order = "YXZ"; o.rotation.set(pitch || 0, yaw || 0, roll || 0);
  }
  function flash(o, v, col) { const m = o.userData.mats; for (let i = 0; i < m.length; i++) { m[i].emissive.setHex(col || 0xffffff); m[i].emissiveIntensity = v; } }
  const V = new THREE.Vector3();
  function local(o, lx, ly, lz) { V.set(lx, ly, lz); return o.localToWorld(V); }   // model-local (normalized by its bbox) → world
  // model-local point given in fractions of the model's bbox
  function frac(o, fx, fy, fz) { const s = o.userData.size; return local(o, fx * s.x, fy * s.y, fz * s.z); }

  /* ---------------- procedural props: coin, drizzle emblem, med kit, crate + chute, blimp, rotors, Theme Building ---------------- */
  function capTex(draw, n) { const c = mkc(n || 128, n || 128); draw(c.getContext("2d"), c.width); return canTex(c, true); }
  const coinCap = capTex((x, n) => { const g = x.createLinearGradient(0, 0, n, n); g.addColorStop(0, "#fff7c2"); g.addColorStop(.4, "#ffd23f"); g.addColorStop(.75, "#c88a0c"); g.addColorStop(1, "#ffe38a"); x.fillStyle = g; x.fillRect(0, 0, n, n);
    x.strokeStyle = "#9b6a06"; x.lineWidth = 6; x.beginPath(); x.arc(n / 2, n / 2, n * .42, 0, TAU); x.stroke(); x.fillStyle = "#9b6a06"; x.font = "900 " + (n * .55 | 0) + "px 'Playfair Display',Georgia,serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("M", n / 2, n / 2 + 4); });
  const goldSide = new THREE.MeshStandardMaterial({ color: 0xd9a21b, metalness: .35, roughness: .35, emissive: 0x4a3000, emissiveIntensity: .6 });
  const coinGeo = new THREE.CylinderGeometry(1, 1, .22, 36);
  function coinMesh() { const m = new THREE.Mesh(coinGeo, [goldSide, new THREE.MeshStandardMaterial({ map: coinCap, metalness: .25, roughness: .4, emissive: 0x3a2600, emissiveIntensity: .5 }), new THREE.MeshStandardMaterial({ map: coinCap, metalness: .25, roughness: .4 })]); m.castShadow = true; return m; }
  let drizCap = null;
  function drizTex() { if (drizCap) return drizCap; const im = M.DRIZ_IM; if (!M.ready(im)) return null;
    drizCap = capTex((x, n) => { const R = n / 2; const fg = x.createLinearGradient(0, 0, n, n); fg.addColorStop(0, "#ffe27a"); fg.addColorStop(.5, "#d9a21b"); fg.addColorStop(1, "#ffd23f"); x.fillStyle = fg; x.fillRect(0, 0, n, n);
      x.fillStyle = "#e10600"; x.beginPath(); x.arc(R, R, R * .84, 0, TAU); x.fill(); x.save(); x.beginPath(); x.arc(R, R, R * .84, 0, TAU); x.clip(); const h = R * 1.6, w = h * im.naturalWidth / im.naturalHeight; x.drawImage(im, R - w / 2, R - h / 2 + 1, w, h); x.restore(); }, 256);
    return drizCap; }
  const drizRim = new THREE.MeshStandardMaterial({ color: 0xffd23f, metalness: .4, roughness: .35, emissive: 0x553300, emissiveIntensity: .6 });
  const kitTop = capTex((x, n) => { x.fillStyle = "#f4f7f5"; x.fillRect(0, 0, n, n); x.strokeStyle = "#2fae6a"; x.lineWidth = 8; x.strokeRect(4, 4, n - 8, n - 8); x.fillStyle = "#26b864"; x.fillRect(n * .38, n * .16, n * .24, n * .68); x.fillRect(n * .16, n * .38, n * .68, n * .24); });
  const kitMats = [new THREE.MeshStandardMaterial({ color: 0xe8ece9, roughness: .5 }), new THREE.MeshStandardMaterial({ color: 0xe8ece9, roughness: .5 }), new THREE.MeshStandardMaterial({ map: kitTop, roughness: .45, emissive: 0x0d3a20, emissiveIntensity: .4 }), new THREE.MeshStandardMaterial({ color: 0xcfd6d2 }), new THREE.MeshStandardMaterial({ color: 0xe8ece9 }), new THREE.MeshStandardMaterial({ color: 0xe8ece9 })];
  const kitGeo = new THREE.BoxGeometry(34, 12, 30);
  function crateTex(col) { return capTex((x, n) => { x.fillStyle = "#5b4426"; x.fillRect(0, 0, n, n); x.fillStyle = "#7a5d35"; for (let i = 0; i < 3; i++) x.fillRect(6, 14 + i * 38, n - 12, 22); x.fillStyle = "#9aa1ad"; x.fillRect(0, n * .46, n, 9);
    x.fillStyle = col; x.beginPath(); x.moveTo(70, 26); x.lineTo(40, 70); x.lineTo(62, 70); x.lineTo(54, 104); x.lineTo(88, 56); x.lineTo(66, 56); x.closePath(); x.fill(); x.strokeStyle = "#111"; x.lineWidth = 3; x.stroke(); }); }
  const crateTexC = {};
  const chuteTex = capTex((x, n) => { const g = x.createLinearGradient(0, 0, n, 0); g.addColorStop(0, "#c8ccd6"); g.addColorStop(.5, "#fff"); g.addColorStop(1, "#aab0bd"); x.fillStyle = g; x.fillRect(0, 0, n, n); x.fillStyle = "#e2393f"; for (let i = 0; i < 8; i += 2) x.fillRect(i * n / 8, 0, n / 8, n); });
  const chuteGeo = new THREE.SphereGeometry(1, 16, 8, 0, TAU, 0, Math.PI / 2);
  function makeCrate() { const g = new THREE.Group(); const box = new THREE.Mesh(new THREE.BoxGeometry(30, 22, 24), new THREE.MeshStandardMaterial({ roughness: .8 })); box.castShadow = true; g.add(box);
    const ch = new THREE.Mesh(chuteGeo, new THREE.MeshStandardMaterial({ map: chuteTex, roughness: .7, side: THREE.DoubleSide })); ch.scale.set(26, 12, 20); ch.castShadow = true; g.add(ch);
    const lg = new THREE.BufferGeometry(); lg.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(24), 3)); const lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0xe6ebf5, transparent: true, opacity: .8 })); g.add(lines);
    g.userData = { box, ch, lines }; scene.add(g); return g; }
  // rotor blur disc: streaky conic blur + 4 tapered blades, like the 2D rotorFX but a real spinning mesh
  const rotorTex = capTex((x, n) => { const h = n / 2; x.translate(h, h);
    for (let i = 0; i < 24; i++) { x.fillStyle = i % 2 ? "rgba(25,25,30,.20)" : "rgba(25,25,30,.07)"; x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, h - 1, i / 24 * TAU, (i + 1) / 24 * TAU); x.closePath(); x.fill(); }
    x.strokeStyle = "rgba(255,255,255,.12)"; x.lineWidth = 2; x.beginPath(); x.arc(0, 0, h - 2, 0, TAU); x.stroke();
    for (let b = 0; b < 4; b++) for (let g = 0; g < 6; g++) { x.save(); x.rotate(b * Math.PI / 2 - g * .07); x.globalAlpha = g ? (.24 - g * .036) : .7; x.fillStyle = g ? "#5c6370" : "#7d8592"; x.beginPath(); x.moveTo(0, -5); x.lineTo(h * .96, -3); x.lineTo(h, 0); x.lineTo(h * .96, 3); x.lineTo(0, 5); x.closePath(); x.fill(); x.restore(); }
    x.globalAlpha = 1; x.fillStyle = "#2b2e35"; x.beginPath(); x.arc(0, 0, h * .09, 0, TAU); x.fill(); }, 256);
  const rotorGeo = new THREE.CircleGeometry(1, 40); rotorGeo.rotateX(-Math.PI / 2);
  const rotorMat = new THREE.MeshBasicMaterial({ map: rotorTex, transparent: true, depthWrite: false, opacity: .95 });
  const ROTORS = { list: [], n: 0 };
  function rotor(x, y, Y, r, ang) { let m = ROTORS.list[ROTORS.n++]; if (!m) { m = new THREE.Mesh(rotorGeo, rotorMat); m.renderOrder = 110; scene.add(m); ROTORS.list.push(m); }
    m.visible = true; const k = ws(Y); m.position.set(wx(x, Y), Y, wz(y, Y)); m.scale.setScalar(r * k); m.rotation.y = -ang; }
  // Christian's tower blimp: cream envelope + wine stripe + gold MELODY lettering, wine fins, gondola, spinning prop
  const blimp = (() => { const g = new THREE.Group();
    const envT = capTex((x, n) => { const gr = x.createLinearGradient(0, 0, 0, n); gr.addColorStop(0, "#b8a67c"); gr.addColorStop(.5, "#fffaf0"); gr.addColorStop(1, "#b8a67c"); x.fillStyle = gr; x.fillRect(0, 0, n, n); x.fillStyle = "#a33645"; x.fillRect(0, n * .46, n, n * .08); }, 256);
    const env = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 20), new THREE.MeshStandardMaterial({ map: envT, roughness: .55 })); env.scale.set(47, 17, 17); env.castShadow = true; g.add(env);
    // the stripe runs along the top centre line (sphere v=0.5 is the equator, so rotate the sphere so its equator ring passes over the top)
    env.rotation.x = Math.PI / 2;
    const finM = new THREE.MeshStandardMaterial({ color: 0x77242e, roughness: .6 });
    [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([a, b]) => { const f = new THREE.Mesh(new THREE.BoxGeometry(18, 1.6, 12), finM); f.position.set(-44, a * 10, b * 10); if (a) f.rotation.x = Math.PI / 2; f.castShadow = true; g.add(f); });
    const gon = new THREE.Mesh(new THREE.BoxGeometry(16, 5, 6), new THREE.MeshStandardMaterial({ color: 0x2a1a10 })); gon.position.set(2, -16, 0); g.add(gon);
    const lt = capTex((x, n) => { x.clearRect(0, 0, n, n); x.font = "400 " + (n * .3 | 0) + "px Anton,Impact,sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.lineWidth = 6; x.strokeStyle = "rgba(60,30,10,.55)"; x.strokeText("MELODY", n / 2, n / 2); x.fillStyle = "#d4af37"; x.fillText("MELODY", n / 2, n / 2); }, 256);
    const word = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: lt, transparent: true, depthWrite: false })); word.rotation.x = -Math.PI / 2; word.scale.set(44, 44, 1); word.renderOrder = 111; g.add(word);
    const prop = new THREE.Mesh(rotorGeo, rotorMat); prop.renderOrder = 111; g.add(prop);
    g.userData = { word, prop, env }; g.visible = false; scene.add(g); return g; })();
  // the LAX Theme Building: two crossing white parabolic arches over the saucer restaurant, purple-blue uplights (procedural)
  // the LAX Theme Building: its circular plaza is lifted out of the ground as a real 3D plinth (the aerial photo on top,
  // lit stone sides, purple uplight band) so aircraft shadows and the perspective show its height. Built for the 230 px sprite.
  const TH_R = 97, TH_H = 11, TH_CX = .5, TH_CY = .53;
  let themeTop = null;
  const thTopGeo = new THREE.CircleGeometry(TH_R, 64); thTopGeo.rotateX(-Math.PI / 2);
  const thSideGeo = new THREE.CylinderGeometry(TH_R, TH_R + 3, TH_H, 64, 1, true); thSideGeo.translate(0, TH_H / 2, 0);
  const thBandTex = capTex((x, n) => { const g = x.createLinearGradient(0, 0, 0, n); g.addColorStop(0, "#c9c3e8"); g.addColorStop(.18, "#3a3550"); g.addColorStop(.7, "#1d1b28"); g.addColorStop(1, "#0d0c14"); x.fillStyle = g; x.fillRect(0, 0, n, n);
    for (let i = 0; i < 16; i++) { const cx = (i + .5) * n / 16, gl = x.createRadialGradient(cx, n * .85, 0, cx, n * .85, n * .09); gl.addColorStop(0, "rgba(150,110,255,.95)"); gl.addColorStop(1, "rgba(150,110,255,0)"); x.fillStyle = gl; x.fillRect(cx - n * .1, n * .6, n * .2, n * .4); } }, 128);
  const thSideMat = new THREE.MeshStandardMaterial({ map: thBandTex, roughness: .8, emissive: 0x2a1f66, emissiveIntensity: .35 });
  function makeTheme() { const g = new THREE.Group();
    const top = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, alphaTest: .35 }); const t = new THREE.Mesh(thTopGeo, top); t.position.y = TH_H; t.receiveShadow = true; g.add(t);
    const side = new THREE.Mesh(thSideGeo, thSideMat); side.castShadow = true; side.receiveShadow = true; g.add(side);
    g.userData.top = top; g.visible = false; scene.add(g); return g; }
  function themeSkin() { // the plinth's top wears the game's own Theme photo, cropped to the plaza circle
    if (themeTop || !M.ready(S.theme)) return; const im = S.theme, sw = 230, sh = 230 * im.naturalHeight / im.naturalWidth, ru = TH_R / sw, rv = TH_R / sh;
    const t = new THREE.Texture(im); t.colorSpace = THREE.SRGBColorSpace; t.repeat.set(2 * ru, 2 * rv); t.offset.set(TH_CX - ru, (1 - TH_CY) - rv); t.needsUpdate = true; themeTop = t;
    THEMES.forEach(g => { g.userData.top.map = t; g.userData.top.needsUpdate = true; }); }
  const THEMES = [makeTheme(), makeTheme()];

  /* ---------------- ground: lit aerial tiles, landmarks, runway, shadow catcher ---------------- */
  const tileGeo = new THREE.PlaneGeometry(1, 1); tileGeo.rotateX(-Math.PI / 2);
  const tileMats = {}, tileMeshes = [];
  function tileMat(key) { const T = M.TILES[key]; if (!T) return null; if (tileMats[key]) return tileMats[key];
    const t = canTex(T.c, true); t.anisotropy = 4; return tileMats[key] = new THREE.MeshLambertMaterial({ map: t, transparent: true, depthWrite: false }); }
  const lmMats = {};
  function lmMat(k) { const im = S[k]; if (!M.ready(im)) return null; if (lmMats[k]) return lmMats[k]; const t = new THREE.Texture(im); t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; return lmMats[k] = new THREE.MeshLambertMaterial({ map: t, transparent: true, depthWrite: false, opacity: .95 }); }
  const lmMeshes = [];
  const rwC = mkc(500, 900), rwX = rwC.getContext("2d"), rwTex = canTex(rwC, true);
  const rwMesh = new THREE.Mesh(tileGeo, new THREE.MeshBasicMaterial({ map: rwTex, transparent: true, depthWrite: false })); rwMesh.renderOrder = 60; rwMesh.visible = false; scene.add(rwMesh);
  const shadowCatcher = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.6, H * 1.6), new THREE.ShadowMaterial({ opacity: .44, depthWrite: false })); shadowCatcher.rotation.x = -Math.PI / 2; shadowCatcher.position.y = .6; shadowCatcher.receiveShadow = true; shadowCatcher.renderOrder = 80; scene.add(shadowCatcher);
  // tumbling 3D debris (panel shards, rivets, rubble) — the game's own debris particles, given depth
  const shardGeo = new THREE.BoxGeometry(1, .28, .7);
  // unlit: lit shards went near-black against the fireball behind them (the "black blocks" in the crash fire); flat colour reads like the 2D shards
  const debrisMesh = new THREE.InstancedMesh(shardGeo, new THREE.MeshBasicMaterial({ color: 0xd8d8d8 }), 80);
  debrisMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(80 * 3), 3); debrisMesh.castShadow = true; debrisMesh.frustumCulled = false; debrisMesh.count = 0; scene.add(debrisMesh);
  const HOT = new THREE.Color(1.6, .62, .18), DM = new THREE.Matrix4(), DQ = new THREE.Quaternion(), DE = new THREE.Euler(), DP = new THREE.Vector3(), DS = new THREE.Vector3(), DC = new THREE.Color();
  // the review banner: his cover on a towed cloth that ripples (canvas re-drawn by the game's own rpBanner each frame)
  const banC = mkc(256, 192), banX = banC.getContext("2d"), banTex = canTex(banC, true);
  const banGeo = new THREE.PlaneGeometry(128, 96, 18, 2); banGeo.rotateX(-Math.PI / 2);
  const banBase = banGeo.attributes.position.array.slice();
  const banner = new THREE.Mesh(banGeo, new THREE.MeshLambertMaterial({ map: banTex, transparent: true, side: THREE.DoubleSide, depthWrite: false })); banner.castShadow = true; banner.renderOrder = 115; banner.visible = false; scene.add(banner);
  const towGeo = new THREE.BufferGeometry(); towGeo.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(12), 3));
  const tow = new THREE.LineSegments(towGeo, new THREE.LineBasicMaterial({ color: 0xf0f0f0, transparent: true, opacity: .75 })); tow.visible = false; tow.frustumCulled = false; scene.add(tow);
  const coins = [], drizs = [], kits = [], crates = [];
  function poolGet(arr, n, make) { let o = arr[n]; if (!o) { o = make(); arr.push(o); scene.add(o); } o.visible = true; return o; }
  function hideFrom(arr, n) { for (let i = n; i < arr.length; i++) arr[i].visible = false; }

  /* ---------------- helpers shared with the 2D look ---------------- */
  const NAV = M.NAV;
  function navLight(X, Y, Z, col, r) { const c = rgb(col), k = 1; Ba.w(X, Y, Z, r * 10, r * 10, 0, UV.dot, c[0], c[1], c[2], .55); Ba.w(X, Y + .5, Z, r * 2.6, r * 2.6, 0, UV.dot, c[0], c[1], c[2], 1); }
  function navPair(now, seed, L, R, r) { const t = now + (seed || 0) * 1730, pair = NAV[(t / 3600 | 0) % NAV.length], bl = (t / 420 | 0) % 2;
    navLight(L.x, L.y, L.z, bl ? pair[0] : pair[1], r); navLight(R.x, R.y, R.z, bl ? pair[1] : pair[0], r);
    if (((t / 900) | 0) % 3 === 0 && (t % 900) < 90) Ba.w((L.x + R.x) / 2, L.y + 1, (L.z + R.z) / 2 - r * 3, r * 4, r * 4, 0, UV.dot, 1, 1, 1, .9); }
  function tongueQ(B, x, y, Y, s, rot, uv, r, g, b, a) { // flame tongue anchored at its hot base (x,y), like FX drawFlames (sprite 32x64, base at 16,52)
    const ox = 20 * s * Math.sin(rot), oy = -20 * s * Math.cos(rot); B.q(x + ox, y + oy, Y, 32 * s, 64 * s, rot, uv, r, g, b, a); }
  function streak(B, x, y, Y, vx, vy, w, el, a) { // spark sprite: bright head at (x,y), tail trailing back along the velocity (like the 2D drawImage)
    const r = Math.atan2(vy, vx) - Math.PI / 2, cy = -el / 2; B.q(x - cy * Math.sin(r), y + cy * Math.cos(r), Y, w, el, r, UV.spark, 1, 1, 1, a); }
  function flamesAt(B, x, y, Y, size, ang, tt, ph, n, uv) { for (let t = 0; t < n; t++) { const fl = .72 + .28 * Math.sin(tt * .021 + ph + t * 2.1) + .18 * Math.random(), s = size * fl / 26, a = ang + (t - (n - 1) / 2) * .38 + Math.sin(tt * .013 + ph * 3 + t) * .18;
    tongueQ(B, x + (t - (n - 1) / 2) * size * .12, y, Y, s, a + Math.PI / 2, uv, 1, 1, 1, Math.min(1, .65 + .35 * fl)); } }

  /* ---------------- per-frame: ground ---------------- */
  const LMK = { theme: 1, melody: 1, innout: 1, sofi: 1, crypto: 1 };
  function drawGround(now, G) {
    let ti = 0, li = 0, th = 0, rwOn = false;
    G.ground.forEach((g, idx) => {
      const T = M.TILES[g.t], mat = tileMat(g.t);
      if (T && mat) { let m = tileMeshes[ti++]; if (!m) { m = new THREE.Mesh(tileGeo, mat); m.receiveShadow = false; scene.add(m); tileMeshes.push(m); }
        const h = T.c.height / 2; m.material = mat; m.visible = true; m.scale.set(W, 1, h); m.position.set(0, .01 * idx, g.y + h / 2 - H / 2); m.renderOrder = idx; }
      if (g.k === "nalu" || g.t === "nalu") { const gx = W * .74, gy = g.y + g.h * .12, p = .55 + .45 * Math.sin(now / 260) * Math.sin(now / 610);
        BgA.q(gx, gy, 1, 160, 160, 0, UV.dot, 1, .67, .35, .45 * p); BgA.q(gx, gy, 1, 150, 150, 0, UV.glow, .31, .67, 1, .25 * p); }
      if (g.k === "runway" && g.y < H + 40 && g.y + g.h + 150 > -40) { rwOn = true; const sc = rwC.width / W; rwX.setTransform(1, 0, 0, 1, 0, 0); rwX.clearRect(0, 0, rwC.width, rwC.height); rwX.setTransform(sc, 0, 0, sc, 0, 0);
        M.runway(rwX, g, 40); rwTex.needsUpdate = true; const hh = rwC.height / sc; rwMesh.scale.set(W, 1, hh); rwMesh.position.set(0, .3, g.y - 40 + hh / 2 - H / 2); }
      if (LMK[g.k]) { const im = S[g.k], mm = lmMat(g.k); if (mm) { const w = g.k === "melody" ? 250 : g.k === "sofi" ? 270 : 230, h = w * im.naturalHeight / im.naturalWidth, x = W / 2 + g.side * 70 - w / 2, y = g.y + (g.h - h) / 2;
        let m = lmMeshes[li++]; if (!m) { m = new THREE.Mesh(tileGeo, mm); m.receiveShadow = true; scene.add(m); lmMeshes.push(m); } m.material = mm; m.visible = true; m.renderOrder = 50; m.scale.set(w, 1, h); m.position.set(x + w / 2 - W / 2, .2, y + h / 2 - H / 2);
        if (g.k === "theme" && th < THEMES.length) { themeSkin(); const t3 = THEMES[th++]; t3.visible = true; t3.position.set(x + w * TH_CX - W / 2, 0, y + h * TH_CY - H / 2); } } }
    });
    for (let i = ti; i < tileMeshes.length; i++) tileMeshes[i].visible = false;
    for (let i = li; i < lmMeshes.length; i++) lmMeshes[i].visible = false;
    for (let i = th; i < THEMES.length; i++) THEMES[i].visible = false;
    rwMesh.visible = rwOn;
  }

  /* ---------------- per-frame: street traffic (positions come from the game's CARS module, same as 2D) ---------------- */
  function drawCars(G) { if (!UV.car) return;
    for (let gi = 0; gi < G.ground.length; gi++) { const g = G.ground[gi]; if (!g.cars || g.k === "runway") continue;
      for (let i = 0; i < g.cars.length; i++) { const c = g.cars[i], y = g.y + c.ry; if (c.al <= 0 || y < -20 || y > H + 20) continue;
        const k = c.k, ca = Math.cos(c.a), sa = Math.sin(c.a), col = rgb(c.col);
        Bc.q(c.x, y, .4, 4.8 * k, 9.6 * k, c.a + Math.PI / 2, UV.car, col[0], col[1], col[2], c.al);
        BcA.q(c.x + ca * (4.4 + 11) * k, y + sa * (4.4 + 11) * k, .5, 12 * k, 22 * k, c.a + Math.PI / 2, UV.beam2, 1, 1, 1, .55 * c.al);
        for (const sd of [-1, 1]) { BcA.q(c.x + ca * 4.6 * k + sd * sa * 1.5 * k, y + sa * 4.6 * k - sd * ca * 1.5 * k, .6, 2.4, 2.4, 0, UV.dot, 1, .96, .86, c.al);
          BcA.q(c.x - ca * 4.7 * k + sd * sa * 1.6 * k, y - sa * 4.7 * k - sd * ca * 1.6 * k, .6, 2.6, 2.6, 0, UV.dot, 1, .16, .12, .9 * c.al); } } } }

  /* ---------------- per-frame: FX (the game's pooled particles, same caps/timings — only drawn here) ---------------- */
  let crashAlt = -1, crashX = 0, crashY = 0, playerAlt = -1, playerX = 0, playerY = 0;
  function birthAlt(p) { // which layer a new particle belongs to: a ground fire, the falling plane, or the sky
    if (crashAlt >= 0 && Math.abs(p.x - crashX) < 60 && Math.abs(p.y - crashY) < 60) return Math.max(4, crashAlt - 6);
    if (playerAlt >= 0 && Math.abs(p.x - playerX) < 50 && Math.abs(p.y - playerY) < 60) return Math.max(3, playerAlt - 8);
    const S2 = FXI.SITES; for (let i = 0; i < S2.length; i++) { const s = S2[i]; if (Math.abs(p.x - s.x) < s.rx + 30 && Math.abs(p.y - s.y) < s.ry + 70) return -1; }
    return A.air; }
  const SHADE_G = [.84, .53, .27, .1];
  function drawFX(now, G) {
    const { SM, FI, DB, RG, SITES, WR, LITE } = FXI;
    // ground sites: scorch decal, rubble, skid, glow, flames
    for (let i = 0; i < SITES.length; i++) { const s = SITES[i];
      s.n3 = 0;
      const fa = Math.min(1, s.age / 180) * (s.age > s.life - 1500 ? Math.max(0, (s.life - s.age) / 1500) : 1);
      Bg.q(s.x, s.y, 1.2, s.rx * 2, s.ry * 2, 0, UV.scorch, 1, 1, 1, .88 * fa);
      // (a crashed building no longer gets dark slab/wall-stub boxes: from straight above they read as black squares over the fire)
      if (s.v === "street" && !s.lite) { const a = .7 * fa; Bg.q(s.x, s.y + 35, 1.3, 9, 74, 0, UV.beam, .08, .06, .05, a); Bg.q(s.x - 13, s.y + 31, 1.3, 4.5, 58, -.04, UV.beam, .08, .06, .05, a); Bg.q(s.x + 13.5, s.y + 30, 1.3, 4.5, 56, .05, UV.beam, .08, .06, .05, a); }
      const it = s.inten || 0; if (it <= 0) continue;
      if (s.v === "building" && !s.lite && s.age < 520) { const f2 = 1 - s.age / 520; BgA.q(s.x, s.y, 2, 120 + 100 * (1 - f2), 96 + 80 * (1 - f2), 0, UV.fball, 1, 1, 1, f2); }
      if (s.v === "theme" && !s.lite) { const pu = .6 + .4 * Math.sin(now / 170); BgA.q(s.x, s.y, 2, 220, 220, 0, UV.glow, 1, 1, 1, .42 * it * pu); }
      const gr = (s.lite ? 26 : s.rx * 1.9) * (.92 + .08 * Math.sin(now / 90 + s.x)); BgA.q(s.x, s.y, 2, gr * 2, gr * 2, 0, UV.glow, 1, 1, 1, (s.lite ? .35 : .5) * it);
      for (let j = 0; j < s.fires.length; j++) { const f = s.fires[j]; if (s.age < f.on) continue; const fi = it * Math.min(1, (s.age - f.on) / 300), sz = f.s * fi * (s.lite ? 1 : 1.6); if (sz < .6) continue;
        Ba.q(s.x + f.dx, s.y + f.dy, 6, sz * 3, sz * 3, 0, UV.glow, 1, 1, 1, .38 * fi);
        flamesAt(Ba, s.x + f.dx, s.y + f.dy, 8 + j * .3, sz * 1.5, -Math.PI / 2 + .45, now, f.ph, s.lite || LITE ? 1 : 3, UV.tongue);
        const fk = .75 + .25 * Math.sin(now * .031 + f.ph * 5) * Math.sin(now * .017 + f.ph), cr = sz * .42 * fk; Ba.q(s.x + f.dx, s.y + f.dy, 9 + j * .3, cr * 2, cr * 2, 0, UV.fball, 1, 1, 1, .5 * fi * fk); } }
    // smoke (normal blend, the game's own 4-shade puffs), rising off ground fires toward the camera
    for (let i = 0; i < SM.length; i++) { const p = SM[i]; if (p.n3) { p.n3 = 0; p.alt = birthAlt(p); }
      const u = p.age / p.life, al = p.a * (u < .1 ? u / .1 : 1) * Math.pow(1 - u, 1.5); if (al < .01) continue;
      const Y = p.alt < 0 ? 10 + 70 * u : p.alt; Bn.q(p.x, p.y, Y, p.s * 2, p.s * 2, 0, UV["sm" + p.sh + p.v], 1, 1, 1, al);
      if (p.hot && u < .3) Ba.q(p.x, p.y, Y + .5, p.s * 1.6, p.s * 1.6, 0, UV.glow, 1, 1, 1, .3 * (1 - u / .3) * p.a); }
    // debris: 3D tumbling shards that fall away toward the ground, burning ones glow
    let dn = 0;
    for (let i = 0; i < DB.length && dn < 80; i++) { const p = DB[i]; if (p.n3) { p.n3 = 0; p.alt = birthAlt(p); if (p.alt < 0) p.alt = 18; p.tilt = Math.random() * 6.3; }
      const u = p.age / p.life, sc = (1 - .6 * u) * p.sz * (p.sx || 1), Y = Math.max(2, p.alt * (1 - u * .9)), k = ws(Y);
      DM.compose(DP.set(wx(p.x, Y), Y, wz(p.y, Y)), DQ.setFromEuler(DE.set(p.tilt + p.rot * 1.3, -p.rot, p.rot * .7)), DS.set(sc * 2 * k, sc * 2 * k, sc * 2 * k / (p.sx || 1)));
      DC.set(p.col); if (p.burn) DC.lerp(HOT, Math.max(0, 1 - u * 1.6)); debrisMesh.setMatrixAt(dn, DM); debrisMesh.setColorAt(dn, DC); dn++;
      if (p.burn) { const g = 5 + p.sz; Ba.q(p.x, p.y, Y + 2, g * 2, g * 2, 0, UV.glow, 1, 1, 1, .7 * (1 - u)); } }
    debrisMesh.count = dn; debrisMesh.instanceMatrix.needsUpdate = true; if (debrisMesh.instanceColor) debrisMesh.instanceColor.needsUpdate = true;
    // fire: embers, fireballs, flame licks (additive)
    for (let i = 0; i < FI.length; i++) { const p = FI[i]; if (p.n3) { p.n3 = 0; p.alt = birthAlt(p); }
      const u = p.age / p.life, Y = p.alt < 0 ? 12 + 30 * u : p.alt + 4;
      if (p.k === "em") { if (UV.spark) streak(Ba, p.x, p.y, Y, p.vx, p.vy, p.s * 1.8, p.s * 2 + Math.hypot(p.vx, p.vy) * 3.2, 1 - u);
        else { const c = u < .3 ? [1, .95, .77] : u < .6 ? [1, .7, .28] : [1, .35, .12]; Ba.q(p.x, p.y, Y, p.s * 1.6, p.s * 1.6, 0, UV.dot, c[0], c[1], c[2], 1 - u); } }
      else if (p.k === "fb") { const r = u < .22 ? p.s * (.3 + .7 * u / .22) : p.s * (1 - .45 * (u - .22) / .78); Ba.q(p.x, p.y, Y + 2, r * 2, r * 2, 0, UV.fball, 1, 1, 1, u < .22 ? 1 : Math.max(0, 1 - (u - .22) / .78)); }
      else { const s2 = p.s * (1 - .4 * u); tongueQ(Ba, p.x, p.y, Y, s2, p.ang + Math.PI / 2, UV.tongue, 1, 1, 1, 1 - u); } }
    // shock rings + dust rings
    for (let i = 0; i < RG.length; i++) { const p = RG[i], u = p.age / p.life, r = p.s * (1 - Math.pow(1 - u, 2)); if (r < 1) continue;
      if (p.dust) Bn.q(p.x, p.y, 3, r * 2.3, r * 2.3, 0, UV.ring, .61, .58, .54, .45 * (1 - u)); else Ba.q(p.x, p.y, A.air - 10, r * 2.3, r * 2.3, 0, UV.ring, 1, .81, .54, .85 * (1 - u)); }
    // wrecks: the shot-down aircraft spin down to the ground as real models
    for (let i = 0; i < WR.length; i++) { const p = WR[i], u = Math.min(1, p.t / p.dur), key = p.im === S.cop1 ? "cop1" : p.im === S.cop0 ? "cop0" : p.im === S.jet ? "jet" : "plane";
      const o = take(key); if (!o) continue; const Y = Math.max(8, (key === "jet" ? A.jet : key === "plane" ? A.kami : A.cop) * (1 - u * .92));
      const base = key === "plane" ? Math.PI : 0;   // 2D draws wrecks at sprite width p.w, shrinking as they fall
      put(o, p.x, p.y, Y, p.w * (1 - .6 * u), false, base - p.rot, Math.sin(p.t / 90) * .9, .5 * u); flash(o, .15, 0xff5a1f); }
    // the game's older one-shot sprites (G.fx): spark squares, catch rings, kamikaze smoke, flame bursts
    for (let i = 0; i < G.fx.length; i++) { const p = G.fx[i], a = Math.max(0, Math.min(1, p.a));
      if (p.k === "e") { if (UV.spark) streak(Ba, p.x, p.y, A.air + 6, p.vx, p.vy, p.s * 1.2, p.s * 2 + Math.hypot(p.vx, p.vy) * 2.5, a); else Ba.q(p.x, p.y, A.air + 6, p.s * 1.4, p.s * 1.4, 0, UV.dot, 1, .81, .42, a); }
      else if (p.k === "r") Ba.q(p.x, p.y, A.air + 6, p.s * 2.2, p.s * 2.2, 0, UV.ring, 1, .81, .54, a);
      else if (p.k === "s" && UV.smoke) Bn.q(p.x, p.y, A.kami - 8, p.s * 2, p.s * 2, p.rot || 0, UV.smoke, 1, 1, 1, Math.min(1, p.a));
      else if (p.k === "f" && UV.flame) { const h = p.s * 2.4, w = h * 58 / 160, r = Math.PI + (p.rot || 0); Ba.q(p.x - h * .4 * Math.sin(r), p.y + h * .4 * Math.cos(r), A.air + 4, w, h, r, UV.flame, 1, 1, 1, a); } }
    // fire lights: the three hottest things light the ground and the airframes around them
    const hot = [];
    for (let i = 0; i < FI.length; i++) { const p = FI[i]; if (p.k !== "fb") continue; const u = p.age / p.life; hot.push([p.x, p.y, (1 - u) * Math.min(1.6, p.s / 30) * 1.8]); }
    for (let i = 0; i < SITES.length; i++) { const s = SITES[i]; if (s.inten > 0) hot.push([s.x, s.y, s.inten * (s.lite ? .5 : 1.1)]); }
    if (G.sev > 1.4 && !G.crashed) hot.push([G.x, G.y, .35 * (G.sev - 1)]);
    hot.sort((a, b) => b[2] - a[2]);
    FIRE_L.forEach((l, i) => { const h = hot[i]; if (!h) { l.intensity = 0; return; } l.intensity = Math.min(6, h[2] * 2.8); l.position.set(wx(h[0], 40), 40, wz(h[1], 40)); });
  }

  /* ---------------- per-frame: aircraft, pickups, shots ---------------- */
  const PLANE_HW = 524 / 520;
  function playerFire(o, G, now, sev, crash) { // flame tongues + heat cores on the fire points of the airframe (same spread rules as FX.planeFire)
    if (sev <= .15) return; const P = FXI.PTS, sz0 = o.userData.size, wspan = sz0.x, stage = sev < 1.5 ? 1 : sev < 2.5 ? 2 : 3;
    const rot = crash ? crash.rot : Math.max(-1, Math.min(1, G.vx * .12)) * .35, tail = rot + Math.PI / 2, sc = crash ? crash.sc : 1, pw = crash ? M.PLANE_W : M.PLANE_W * (.74 + .26 * (G.alt == null ? 1 : G.alt));
    for (let i = 0; i < P.length; i++) { const Pt = P[i], it = i === 0 ? (sev < .6 ? 0 : Math.min(1, .32 + (sev - 1) * .34)) : Math.max(0, Math.min(1, (sev - Pt[2]) / .5)); if (it <= 0) continue;
      const w = local(o, -Pt[0] * wspan, sz0.y * .5, -Pt[1] * wspan * PLANE_HW); const X = w.x, Y = w.y + 2, Z = w.z, k = ws(Y), x = X / k + W / 2, y = Z / k + H / 2;
      const sz = (6 + 10 * it) * sc; flamesAt(Bn, x, y, Y, sz * 1.3, tail, now, i * 1.7, it > .55 && !FXI.LITE ? 3 : 2, UV.tonguen);
      Ba.q(x, y, Y + 1, sz * 1.8, sz * 1.8, 0, UV.glow, 1, 1, 1, .32 * it * (.8 + .2 * Math.sin(now * .03 + i))); } }
  function drawPlayer(now, G) {
    const C = G.crash;
    if (G.dying && C) { if (C.hit) { crashAlt = -1; return; }
      const p = Math.min(1, C.t / C.dur), Y = Math.max(6, A.player * (1 - p)), o = take("plane"); crashAlt = Y; crashX = C.x; crashY = C.y;
      put(o, C.x, C.y, Y, M.PLANE_W * C.sc, false, Math.PI - C.rot, C.dir * (.5 + p * 1.1), -.25 * p); flash(o, 0); playerFire(o, G, now, 3.6, C); return; }
    crashAlt = -1; playerAlt = -1; if (G.crashed) return;
    const proll = Math.max(-1, Math.min(1, G.vx * .12)), palt = G.alt == null ? (G.running ? 1 : 0) : G.alt, pw = M.PLANE_W * (.74 + .26 * palt);
    const vis = G.inv <= 0 || G.landing || Math.floor(G.inv / 6) % 2 === 0; if (!vis) return;
    const Y = 5 + (A.player - 5) * palt, o = take("plane"); playerAlt = Y; playerX = G.x; playerY = G.y; put(o, G.x, G.y, Y, pw, false, Math.PI - proll * .35, -proll * .62, 0); flash(o, 0);
    navPair(now, 0, frac(o, .47, .1, -.02).clone(), frac(o, -.47, .1, -.02), 2.2);
    if (G.sev > .15) playerFire(o, G, now, G.sev, null);
    if (G.mfl > 0 && G.running && !G.dying) { const c = rgb(M.WPN[G.wpn].c), a = G.mfl / 70, pts = G.wpn < 3 ? [-22, 22] : [-22, 0, 22];
      pts.forEach(of => { const x = G.x + of, y = G.y - (of ? 20 : 36); Ba.q(x, y, Y + 6, 24, 24, 0, UV.dot, c[0], c[1], c[2], a); Ba.q(x, y, Y + 7, 10, 10, 0, UV.dot, 1, 1, 1, a); }); }
  }
  const EXT = new WeakMap(); const ext = (o) => { let e = EXT.get(o); if (!e) { e = { seed: 1 + Math.random() * 9, px: o.x }; EXT.set(o, e); } return e; };
  function drawEnemies(now, G) {
    const tt = now / 1000;
    for (let e = 0; e < G.ens.length; e++) { const en = G.ens[e]; if (!en) continue; const hit = en.hit > 0 ? Math.min(1, en.hit / 240) : 0;
      if (en.t === "ufo") { const bob = Math.sin(now / 300 + en.ph) * .06, o = take("ufo"); put(o, en.x, en.y, A.ufo, en.w, false, now / 700 + en.ph, bob, .18); flash(o, hit * .45);
        Ba.q(en.x, en.y + 16, A.ufo - 30, 120, 120, 0, UV.dot, .49, .97, .78, .35); }
      else if (en.t === "jet") { const o = take("jet"); put(o, en.x, en.y, A.jet, en.w, false, 0, 0, -.05); flash(o, hit * .45);
        navPair(now, ext(en).seed, frac(o, .45, 0, .05).clone(), frac(o, -.45, 0, .05), 1.9);
        Ba.q(en.x, en.y - en.w * .55, A.jet - 4, 10, 26, 0, UV.tongue, 1, .7, .4, .7); }
      else if (en.t === "kami") { const o = take("plane"); put(o, en.x, en.y, A.kami, en.w, false, 0, Math.sin(now / 500 + en.x) * .08, .08); flash(o, hit * .45);
        Ba.q(en.x, en.y + 50, A.kami - 10, 180, 180, 0, UV.dot, 1, .98, .86, .55);
        navPair(now, ext(en).seed, frac(o, -.47, .1, .02).clone(), frac(o, .47, .1, .02), 2.6); }
      else if (en.t === "cop") { const key = en.v ? "cop1" : "cop0", o = take(key); if (!o) continue; const hb = M.copPt(en, "hub");
        const ex = ext(en), lean = Math.max(-.3, Math.min(.3, (en.x - ex.px) * -.25)); ex.px = en.x; ex.lean = (ex.lean || 0) * .85 + lean * .15;
        put(o, en.x, en.y, A.cop, M.COP_LEN, true, 0, ex.lean, .06); flash(o, hit * .45);
        const top = o.position.y + o.userData.size.y * o.scale.x * .5 + 2; rotor(hb[0], hb[1], top, 70, tt * 2.6 * (en.v ? -1 : 1) * 3.1);
        const on = Math.floor(tt * 7) % 2, bp = M.copPt(en, "bar");
        if (on) Ba.q(bp[0] - 7, bp[1], top - 4, 52, 52, 0, UV.dot, 1, .16, .24, .95); else Ba.q(bp[0] + 7, bp[1], top - 4, 52, 52, 0, UV.dot, .16, .47, 1, .95);
        if (en.flash > 0) { const gp = M.copPt(en, "gun"); Ba.q(gp[0], gp[1], A.cop + 4, 32, 32, 0, UV.dot, 1, .9, .6, 1); } }
      else if (en.t === "gunship") { const o = take("cop0", 0x9aa66a); if (!o) continue; put(o, en.x, en.y, A.gun, M.GS_LEN, true, 0, Math.sin(en.ph || 0) * .08, .05); flash(o, Math.min(1, (en.hit || 0) / 400) * .5);
        const top = o.position.y + o.userData.size.y * o.scale.x * .5 + 2, hb = M.gsPt(en, "hub"), tp = M.gsPt(en, "tail");
        rotor(hb[0], hb[1], top, 102, tt * 2.6 * 3.1); rotor(tp[0], tp[1], top - 6, 15, tt * 1.8 * 2.6 * 3.1);
        navPair(now, 4, frac(o, .5, .2, .1).clone(), frac(o, -.5, .2, .1), 2.4);
        en.guns.forEach((g, i) => { if (g.fl <= 0) return; const p = M.gsPt(en, i ? "gunR" : "gunL"); Ba.q(p[0], p[1], A.gun + 4, 36, 36, 0, UV.dot, 1, .9, .6, 1); }); }
      else if (en.t === "superjet") { const o = take("jet", 0x6a7184); if (!o) continue; const a = en.a || 0; put(o, en.x, en.y, A.sj, M.SJ_W, false, -a, Math.sin(a * 2) * .35, 0); flash(o, Math.min(1, (en.hit || 0) / 400) * .5);
        const h = M.SJ_W * (S.jet.naturalHeight || 708) / (S.jet.naturalWidth || 520), burn = (en.st === "streak" || en.st === "zip") ? 1.7 : en.phase === 3 ? 1.15 : .75, ca = Math.cos(a), sa = Math.sin(a);
        [-7, 7].forEach(of => { const lx = of, ly = -h * .47, x = en.x + lx * ca - ly * sa, y = en.y + lx * sa + ly * ca, L = (26 + Math.random() * 10) * burn; tongueQ(Ba, x, y, A.sj - 2, L / 46, a, UV.tongue, 1, .9, .8, .95); });
        if (en.st === "turn") { const pu = .5 + .5 * Math.sin(now / 90), ly = -h * .18; Ba.q(en.x - ly * sa, en.y + ly * ca, A.sj + 8, 80, 80, 0, UV.dot, 1, .31, .24, .75 * pu); }
        navPair(now, 7, local(o, o.userData.size.x * .47, 0, 0).clone(), local(o, -o.userData.size.x * .47, 0, 0), 2.6); }
    }
    const bd = G.bossDie; if (bd) { const b = bd.b, dur = b.t === "gunship" ? 1800 : 2600; if (bd.t < dur * .8) { const sc = 1 - .25 * bd.t / dur, u = bd.t / dur;
      if (b.t === "gunship") { const o = take("cop0", 0x9aa66a); if (o) { put(o, b.x, b.y, A.gun * (1 - u * .6), M.GS_LEN * sc, true, -(b.spin || 0), .4 * u, .3 * u); flash(o, .25, 0xff5a1f); } }
      else { const o = take("jet", 0x6a7184); if (o) { put(o, b.x, b.y, A.sj * (1 - u * .6), M.SJ_W * sc, false, -((b.a || 0) + (b.spin || 0)), .6 * u, .3 * u); flash(o, .25, 0xff5a1f); } } } }
  }
  function drawReview(now, G) {
    const p = G.rp, D = G.rpDie; banner.visible = false; tow.visible = false;
    if (p) { const px = p.x + (p.sway || 0), bx = px - p.d * 128, by = p.y + 4, o = take("plane");
      put(o, px, p.y, A.rp, 72, false, Math.PI - (p.d > 0 ? Math.PI / 2 : -Math.PI / 2) - Math.sin(p.t / 700) * .06, p.d * Math.sin(p.t / 1300) * .12, 0); flash(o, p.hit > 0 ? p.hit / 220 : 0);
      navPair(now, 3, frac(o, .47, .1, 0).clone(), frac(o, -.47, .1, 0), 2);
      showBanner(p, bx, by, A.rp - 8, 1, 0, now);
      const a0 = [wx(px - p.d * 30, A.rp), A.rp - 2, wz(p.y, A.rp)], k = ws(A.rp - 8), pts = towGeo.attributes.position.array;
      pts.set([...a0, wx(bx + p.d * 62, A.rp - 8), A.rp - 8, wz(by - 30, A.rp - 8), ...a0, wx(bx + p.d * 62, A.rp - 8), A.rp - 8, wz(by + 40, A.rp - 8)]); towGeo.attributes.position.needsUpdate = true; tow.visible = true; }
    if (D) { const fall = Math.min(1, D.t / 5200);
      if (D.by < H + 120) showBanner(D.p, D.bx, D.by, Math.max(6, (A.rp - 8) * (1 - fall * .9)), Math.max(0, 1 - D.t / 5200), D.br, now);
      if (!D.boomed) { const o = take("plane"), u = Math.min(1, D.t / 2600); put(o, D.x, D.y, Math.max(10, A.rp * (1 - u * .85)), 72 * D.sc, false, Math.PI - (D.d > 0 ? Math.PI / 2 : -Math.PI / 2) - D.rot, D.rot * .8, .3); flash(o, .2, 0xff5a1f); } }
  }
  function showBanner(p, bx, by, Y, alpha, rot, now) {
    banX.setTransform(1, 0, 0, 1, 0, 0); banX.clearRect(0, 0, 256, 192); banX.setTransform(2, 0, 0, 2, 0, 0); banX.save(); M.rpBanner(banX, 64, 44, p, null, 0); banX.restore(); banTex.needsUpdate = true;
    const k = ws(Y), pos = banGeo.attributes.position.array, t = now / 160;
    for (let i = 0; i < pos.length; i += 3) { const x0 = banBase[i]; pos[i + 1] = Math.sin(t + x0 * .06) * 4 * (0.4 + Math.abs(x0) / 64); }
    banGeo.attributes.position.needsUpdate = true; banGeo.computeVertexNormals();
    banner.visible = true; banner.position.set(wx(bx, Y), Y, wz(by + 4, Y)); banner.scale.set(k, 1, k); banner.rotation.set(0, -(rot || 0), 0); banner.material.opacity = alpha;
  }
  function drawRescue(now, G) {
    const R = G.rescue; blimp.visible = false; if (!R || R.st === "wait") return;
    const by = R.by + (M.reduce ? 0 : Math.sin(now / 520) * 3), d = R.st === "out" ? R.d : (R.lx >= R.bx ? 1 : -1);
    if (R.bx > -110 && R.bx < W + 110) { const k = ws(A.blimp); blimp.visible = true; blimp.position.set(wx(R.bx, A.blimp), A.blimp, wz(by, A.blimp)); blimp.scale.setScalar(k); blimp.rotation.set(0, d > 0 ? 0 : Math.PI, Math.sin(now / 900) * .04);
      const u = blimp.userData; u.word.position.set(0, 18, d > 0 ? -5 : 5); u.word.rotation.set(-Math.PI / 2, 0, d > 0 ? 0 : Math.PI); u.prop.position.set(-54, 0, 0); u.prop.scale.setScalar(8); u.prop.rotation.y = now / 30;
      const bl = (now / 380 | 0) % 2, nose = local(blimp, 46, 4, 0); if (bl) navLight(nose.x, nose.y, nose.z, "#ff3b3b", 2.2); }
    const K = R.kit; if (K) { kitAt(K, now, true); if (!M.reduce) { const L = Math.hypot(K.vx, K.vy) * 9, rot = Math.atan2(-K.vx, K.vy); Ba.q(K.x - K.vx * 4.5, K.y - K.vy * 4.5, A.item - 2, 12, L, rot, UV.beam, .31, 1, .59, .55); } }
  }
  let kitN = 0;
  function kitAt(it, now, fast) { const o = poolGet(kits, kitN++, () => { const m = new THREE.Mesh(kitGeo, kitMats); m.castShadow = true; return m; }), p = 1 + .08 * Math.sin(now / 150), k = ws(A.item);
    o.position.set(wx(it.x, A.item), A.item, wz(it.y, A.item)); o.scale.setScalar(k * p); o.rotation.set(-.35, Math.sin(now / 400) * .3 + (fast ? now / 200 : 0), 0);
    Ba.q(it.x, it.y, A.item - 14, 68 * p, 68 * p, 0, UV.dot, .31, 1, .59, .55); }
  const FOOD_TILT = -1.05;
  function drawItems(now, G) {
    let cn = 0, dn2 = 0, crn = 0;
    for (let i = 0; i < G.items.length; i++) { const it = G.items[i];
      if (it.t === "coin") { const o = poolGet(coins, cn++, coinMesh), r = it.r, k = ws(A.item); o.position.set(wx(it.x, A.item), A.item, wz(it.y, A.item)); o.scale.set(r * k, r * k, r * k); o.rotation.set(0, 0, it.spin || 0); o.rotation.order = "ZXY";
        Ba.q(it.x, it.y, A.item - 12, r * 4, r * 4, 0, UV.dot, 1, .84, .27, .45); }
      else if (it.t === "driz") { const tex = drizTex(); const o = poolGet(drizs, dn2++, () => { const face = new THREE.MeshStandardMaterial({ map: tex, roughness: .4, emissive: 0x401000, emissiveIntensity: .45 }); const m = new THREE.Mesh(coinGeo, [drizRim, face, face]); m.castShadow = true; return m; });
        if (tex && o.material[1].map !== tex) { o.material[1].map = tex; o.material[1].needsUpdate = true; }
        const k = ws(A.item + 6), pu = .5 + .5 * Math.sin(now / 180); o.position.set(wx(it.x, A.item + 6), A.item + 6, wz(it.y, A.item + 6)); o.scale.set(22 * k, 26 * k, 22 * k); o.rotation.order = "ZXY"; o.rotation.set(0, 0, it.spin || 0);
        Ba.q(it.x, it.y, A.item - 10, 22 * 4.6, 22 * 4.6, 0, UV.dot, 1, .82, .25, .55 + .25 * pu); Ba.q(it.x, it.y, A.item - 11, 22 * 5, 22 * 5, 0, UV.glow, .88, .1, 0, .3);
        if ((now / 90 | 0) % 7 === 0) { const a = Math.random() * TAU; Ba.q(it.x + Math.cos(a) * 26, it.y + Math.sin(a) * 26, A.item + 20, 5, 5, 0, UV.dot, 1, 1, .86, .9); } }
      else if (it.t === "heal") kitAt(it, now, false);
      else if (it.t === "crate") { const nx = M.WPN[Math.min(4, G.wpn + 1)], col = G.wpn >= 4 ? "#ffd23f" : nx.c, sw = Math.sin(now / 420 + it.sw) * .16, k = ws(A.item);
        const o = poolGet(crates, crn++, makeCrate), u = o.userData; if (!crateTexC[col]) crateTexC[col] = crateTex(col); if (u.box.material.map !== crateTexC[col]) { u.box.material.map = crateTexC[col]; u.box.material.needsUpdate = true; }
        o.position.set(wx(it.x, A.item), A.item, wz(it.y, A.item)); o.scale.setScalar(k); o.rotation.set(0, -sw, 0);
        u.ch.position.set(0, 26, -30); u.ch.rotation.set(-.55, 0, 0);
        const L = u.lines.geometry.attributes.position.array; L.set([-12, 11, -6, -24, 22, -24, 12, 11, -6, 24, 22, -24, -5, 11, -8, -8, 26, -30, 5, 11, -8, 8, 26, -30]); u.lines.geometry.attributes.position.needsUpdate = true;
        const c = rgb(col); Ba.q(it.x, it.y + 4, A.item - 12, 92, 92, 0, UV.dot, c[0], c[1], c[2], .45 + .2 * Math.sin(now / 140)); }
      else { const P = it.t === "mic" ? M.MIC : it.p, key = P.k, bob = Math.sin(now / 260 + it.x) * 3, o = MODELS[key] ? take(key) : null;
        if (o) { const zs = o.userData.size, flat = zs.y < .5 * Math.max(zs.x, zs.z);   // plates/skillets show their top (the food), glasses/bottles/mic lean toward the camera
          put(o, it.x, it.y + bob, A.item, P.w * zs.x / (flat ? Math.max(zs.x, zs.z) : Math.max(zs.x, zs.y)), false, now / 1100 + it.x, (it.rot || 0) * .8, flat ? .32 : FOOD_TILT); o.rotation.order = "XYZ"; flash(o, 0); }
        else if (M.ready(P.im)) cardAt(P, it.x, it.y + bob, it.rot || 0);
        const c = it.t === "mic" ? [.89, .42, .51] : [.94, .83, .46]; Ba.q(it.x, it.y, A.item - 16, P.w * 1.6, P.w * 1.6, 0, UV.dot, c[0], c[1], c[2], .32); } }
    hideFrom(coins, cn); hideFrom(drizs, dn2); hideFrom(kits, kitN); hideFrom(crates, crn);
  }
  // fallback for a pickup without a GLB: its photo on a thin card, tilted toward the camera (same size as the 2D sprite)
  const cards = [], cardMats = {}; let cardN = 0;
  function cardAt(P, x, y, rot) { if (!cardMats[P.k]) { const t = new THREE.Texture(P.im); t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; cardMats[P.k] = new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: .4, side: THREE.DoubleSide, roughness: .6 }); }
    const o = poolGet(cards, cardN++, () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), cardMats[P.k]); m.castShadow = true; return m; }); o.material = cardMats[P.k];
    const k = ws(A.item), h = P.w * P.im.naturalHeight / P.im.naturalWidth; o.position.set(wx(x, A.item), A.item, wz(y, A.item)); o.scale.set(P.w * k, h * k, 1); o.rotation.set(-Math.PI / 2 + .35, 0, -rot); }
  function drawShots(now, G) {
    const run = G.running && !G.dying;
    for (let s = 0; s < G.shots.length; s++) { const sh = G.shots[s], x = sh.x, y = sh.y, Y = A.shot + 2;
      if (sh.w === 0) { Ba.q(x, y + 6, Y, 3.4, 13, 0, UV.beam, .94, .83, .46, 1); Ba.q(x, y + 6, Y - 1, 9, 22, 0, UV.beam, .94, .83, .46, .35); }
      else if (sh.w === 1) { Ba.q(x, y + 11, Y, 8, 32, 0, UV.beam, .49, 1, .42, .45); Ba.q(x, y + 11, Y + .5, 2.6, 24, 0, UV.beam, .92, 1, .88, 1); }
      else if (sh.w === 2) { Ba.q(x, y + 12, Y, 6, 18, 0, UV.beam, 1, .55, .16, .45); Ba.q(x, y, Y + .5, 22, 22, 0, UV.fball, 1, 1, 1, 1); }
      else if (sh.w === 3) { Ba.q(x, y + 14, Y, 11, 40, 0, UV.beam, .23, .66, 1, .45); Ba.q(x, y + 14, Y + .3, 6, 34, 0, UV.beam, .47, .78, 1, .85); Ba.q(x, y + 14, Y + .6, 2.4, 30, 0, UV.beam, .93, .97, 1, 1); }
      else { Ba.q(x, y + 18, Y, 16, 52, 0, UV.beam, 1, .16, .16, .4); Ba.q(x, y + 18, Y + .3, 8, 46, 0, UV.beam, 1, .27, .24, .9); Ba.q(x, y + 18, Y + .6, 3.4, 40, 0, UV.beam, 1, .95, .93, 1); } }
    for (let q = 0; q < G.eshots.length; q++) { const es = G.eshots[q]; if (!es) continue; const c = rgb(es.c), Y = A.eshot;
      if (es.missile) { const rot = Math.atan2(es.vy, es.vx) - Math.PI / 2, ca = Math.cos(rot), sa = Math.sin(rot), body = (ly) => [es.x - ly * sa, es.y + ly * ca];
        let p = body(-5); Bn.q(p[0], p[1], Y, 4, 14, rot, UV.sq, c[0] * .9, c[1] * .9, c[2] * .9, 1); Ba.q(p[0], p[1], Y + .5, 12, 24, rot, UV.dot, c[0], c[1], c[2], .55);
        p = body(-17); Ba.q(p[0], p[1], Y + .2, 4, 12, rot, UV.beam, 1, .78, .47, .8); }
      else if (es.bomb) { const bl = (now / 150 | 0) % 2; Bn.q(es.x, es.y, Y, es.r * 2.4, es.r * 2.4, 0, UV.dot, .11, .12, .16, 1); Bn.q(es.x, es.y, Y + .2, es.r * 2, es.r * 2, 0, UV.dot, .11, .12, .16, 1);
        if (bl) { Ba.q(es.x, es.y, Y + .5, 16, 16, 0, UV.dot, 1, .23, .23, 1); } }
      else if (es.bullet) { const L = Math.hypot(es.vx, es.vy) * 3, rot = Math.atan2(-es.vx, es.vy); Ba.q(es.x - es.vx * 1.5, es.y - es.vy * 1.5, Y, 3.4, L + 3, rot, UV.beam, 1, .86, .55, .95); Ba.q(es.x, es.y, Y, 10, 10, 0, UV.dot, 1, .86, .55, .6); }
      else { Ba.q(es.x, es.y, Y, es.r * 5, es.r * 5, 0, UV.dot, c[0], c[1], c[2], .55); Ba.q(es.x, es.y, Y + .5, es.r * 2.1, es.r * 2.1, 0, UV.dot, Math.min(1, c[0] + .4), Math.min(1, c[1] + .4), Math.min(1, c[2] + .4), 1); } }
  }

  /* ---------------- frame ---------------- */
  let last = 0, fpsT = 0, fpsN = 0, bad = 0, started = performance.now();
  function render(now, dt) {
    const G = M.G(); lateSprites();
    BATCHES.forEach(b => b.begin()); poolsBegin(); ROTORS.n = 0; cardN = 0; kitN = 0;
    drawGround(now, G);
    drawCars(G);
    drawFX(now, G);
    drawPlayer(now, G); drawEnemies(now, G); drawReview(now, G); drawRescue(now, G); drawItems(now, G); drawShots(now, G);
    for (let i = ROTORS.n; i < ROTORS.list.length; i++) ROTORS.list[i].visible = false;
    hideFrom(cards, cardN); poolsEnd(); BATCHES.forEach(b => b.end());
    const sh = M.SHK; cam.position.set(-sh[0], D, -sh[1]);
    renderer.render(scene, cam);
    // frame-rate guard (auto mode): under ~40 fps for 5 s straight → back to the 2D renderer for this visit
    fpsN++; if (!fpsT) fpsT = now;
    if (now - fpsT >= 1000) { const fps = fpsN * 1000 / (now - fpsT); STATUS.fps = Math.round(fps); fpsN = 0; fpsT = now;
      if (MODE === "auto" && !document.hidden && now - started > 4000) { bad = fps < 40 ? bad + 1 : 0; if (bad >= 5) fallback("low fps " + Math.round(fps)); } }
  }
  function fallback(why) { STATUS.reason = why; STATUS.on = false; M.render = null; M.on(false); gl.remove(); try { renderer.dispose(); } catch (e) {} console.info("[melody3d] switched to 2D:", why); }
  gl.addEventListener("webglcontextlost", (e) => { e.preventDefault(); fallback("context lost"); });
  wrap.style.isolation = "isolate";
  wrap.insertBefore(gl, cv);
  M.render = render; M.on(true); STATUS.on = true; document.documentElement.classList.add("m3d-on");
  window.MELODY_3D = { status: () => Object.assign({}, STATUS), off: () => fallback("manual"), _: { THREE, scene, renderer, sun, cam, shadowCatcher } };
}
