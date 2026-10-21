/* Melody flight game: 3D LOOK PROTOTYPES (2026-10-16). Not the game: a scripted 7.5 s fly-through so Antidote can pick a camera
   and an art style before the real game is converted. Same Melody airliner, enemies, food pickup, red/gold beams and HUD as
   the game; window.LOOK picks the look (A chase cam · B high aerial chase · C wide cinematic · D chase cam, toon style).
   Deterministic: window.frameAt(t) renders the moment t (seconds) and returns a JPEG of the frame (used to record the clips).
   Open A.html … D.html in a browser to watch it loop live. */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

const LOOK = (window.LOOK || new URLSearchParams(location.search).get("look") || "A").toUpperCase();
const CFG = {
  A: { name: "A · Chase cam", sub: "Low behind the tail, golden-hour sky", toon: false, alt: 70, tile: 1100, v: 230, fov: 56, cam: [0, 13, 82], look: [0, 6, -170], lag: .18, clouds: 14, lines: 0, shadow: true },
  B: { name: "B · High chase", sub: "Above and behind, the map below", toon: false, alt: 120, tile: 520, v: 200, fov: 50, cam: [0, 92, 92], look: [0, 0, -46], lag: .1, clouds: 6, lines: 0, shadow: true },
  C: { name: "C · Wide cinematic", sub: "Farther back, wide lens, speed", toon: false, alt: 85, tile: 1000, v: 300, fov: 76, cam: [0, 22, 92], look: [0, 12, -220], lag: .3, clouds: 30, lines: 70, shadow: true },
  D: { name: "D · Chase cam, toon", sub: "Same camera as A, clean cartoon style", toon: true, alt: 70, tile: 1100, v: 230, fov: 56, cam: [0, 13, 82], look: [0, 6, -170], lag: .18, clouds: 14, lines: 0, shadow: false } }[LOOK] || null;

const W = 720, H = 1280, TAU = Math.PI * 2, SPAN = 40;   // render size (phone shape) · the player's wingspan in world units
const cv = document.getElementById("gl");
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = CFG.shadow; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(CFG.fov, W / H, 2, 9000);

const mkc = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const canTex = (c, srgb) => { const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; return t; };
const GRAD = (() => { const c = mkc(4, 1), x = c.getContext("2d"); [["#3b3f5c", 0], ["#a8a0b0", 1], ["#fff6e6", 2], ["#ffffff", 3]].forEach(([col, i]) => { x.fillStyle = col; x.fillRect(i, 0, 1, 1); });
  const t = new THREE.CanvasTexture(c); t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; return t; })();
// realistic looks: standard PBR; toon look: 4-step cel shading (same colours, same maps)
const std = (c, o) => CFG.toon ? new THREE.MeshToonMaterial(Object.assign({ color: c, gradientMap: GRAD }, strip(o || {}))) : new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: .5 }, o || {}));
function strip(o) { const r = Object.assign({}, o); delete r.roughness; delete r.metalness; return r; }
const meshIn = (g, geo, mat, x, y, z, cast) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast !== false; g.add(m); return m; };
function normGroup(g) { const box = new THREE.Box3().setFromObject(g), c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3()); g.position.sub(c); const o = new THREE.Group(); o.add(g); return { node: o, size: sz }; }
  function buildAirliner() {
    const g = new THREE.Group();
    const skinC = mkc(512, 256), sk = skinC.getContext("2d");   // fuselage skin: u = around (0 belly, .25 right side, .5 top, .75 left), v = tail → nose
    sk.fillStyle = "#f6f6f3"; sk.fillRect(0, 0, 512, 256);
    sk.fillStyle = "#d9dce2"; sk.fillRect(0, 0, 40, 256); sk.fillRect(472, 0, 40, 256);                         // light grey belly
    [[.25, 1], [.75, -1]].forEach(([u, d]) => { const x = u * 512;
      sk.fillStyle = "#a33645"; sk.fillRect(x + d * 4 - 7, 0, 14, 256);                                         // wine cheatline
      sk.fillStyle = "#d4af37"; sk.fillRect(x - d * 9 - 2, 0, 4, 256);                                          // gold pinstripe under it
      sk.fillStyle = "#1c2433"; for (let v = 40; v < 226; v += 7.5) sk.fillRect(x + d * 17 - 3, v, 6, 4.2); });  // cabin windows
    const skinT = canTex(skinC, true); skinT.anisotropy = 4;
    const white = std(0xf6f6f3, { roughness: .38, metalness: .12 }), skin = std(0xffffff, { map: skinT, roughness: .36, metalness: .1 }),
      wine = std(0xa33645, { roughness: .42, metalness: .15 }), gold = std(0xd4af37, { roughness: .28, metalness: .75, emissive: 0x3a2800, emissiveIntensity: .4 }),
      grey = std(0xb9bec8, { roughness: .4, metalness: .35 }), dark = std(0x23272f, { roughness: .55, metalness: .3 });
    const merge = (parts) => { const pos = [], nor = []; parts.forEach(([geo, m]) => { const q = geo.index ? geo.toNonIndexed() : geo.clone(); q.applyMatrix4(m);
        if (m.determinant() < 0) { const a = q.attributes.position.array; for (let i = 0; i < a.length; i += 9) for (let j = 0; j < 3; j++) { const t = a[i + 3 + j]; a[i + 3 + j] = a[i + 6 + j]; a[i + 6 + j] = t; } }   // mirrored half: keep the faces pointing out
        q.computeVertexNormals(); pos.push(...q.attributes.position.array); nor.push(...q.attributes.normal.array); });
      const out = new THREE.BufferGeometry(); out.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); return out; };
    const M4 = (x, y, z, sx) => new THREE.Matrix4().makeScale(sx || 1, 1, 1).setPosition(x, y, z);
    // fuselage (textured), nose cap with cockpit glass, tail cone
    const fus = new THREE.CylinderGeometry(2, 2, 27, 28, 1, true); fus.rotateX(Math.PI / 2); meshIn(g, fus, skin, 0, 0, 0);
    const nose = new THREE.SphereGeometry(2, 24, 12, 0, TAU, 0, Math.PI / 2); nose.rotateX(Math.PI / 2); nose.scale(1, 1, 1.9); meshIn(g, nose, white, 0, 0, 13.5);
    const tail = new THREE.CylinderGeometry(2, .45, 8, 24, 1, true); tail.rotateX(Math.PI / 2); meshIn(g, tail, white, 0, .25, -17.5);
    // swept wings with a little dihedral; tailplanes
    const plan = (pts) => { const sh = new THREE.Shape(); sh.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) sh.lineTo(pts[i][0], pts[i][1]); sh.closePath(); return sh; };
    const slab = (sh, t, dih) => { const geo = new THREE.ExtrudeGeometry(sh, { depth: t, bevelEnabled: false }); geo.rotateX(Math.PI / 2); geo.translate(0, t / 2, 0);   // shape (x, y) → (x, -z)
      const a = geo.attributes.position; for (let i = 0; i < a.count; i++) a.setY(i, a.getY(i) + Math.abs(a.getX(i)) * (dih || 0)); return geo; };
    const wing = slab(plan([[1.2, 4], [17, -6.6], [17, -8.4], [1.2, -3.4]]), .42, .075);
    meshIn(g, merge([[wing, M4(0, -.9, 0)], [wing, M4(0, -.9, 0, -1)]]), white, 0, 0, 0);
    const stab = slab(plan([[.4, -15.2], [6.6, -19.6], [6.6, -21.2], [.4, -18.6]]), .3, .05);
    meshIn(g, merge([[stab, M4(0, .7, 0)], [stab, M4(0, .7, 0, -1)]]), white, 0, 0, 0);
    // fin + winglets in wine; gold fin leading edge, gold engine lips, a gold note on each side of the fin
    const fin = new THREE.ExtrudeGeometry(plan([[-12.6, 1.4], [-21.6, 1.4], [-22.6, 9.6], [-19.4, 9.6]]), { depth: .4, bevelEnabled: false }); fin.rotateY(-Math.PI / 2); fin.translate(.2, 0, 0);   // shape x → z, shape y → y
    const wl = new THREE.ExtrudeGeometry(plan([[-6.6, 0], [-8.4, 0], [-8.9, 2.6], [-7.8, 2.6]]), { depth: .22, bevelEnabled: false }); wl.rotateY(-Math.PI / 2);
    const tipY = -.9 + 17 * .075 + .2;
    meshIn(g, merge([[fin, M4(0, 0, 0)], [wl, M4(17.05, tipY, 0)], [wl, M4(-16.83, tipY, 0)]]), wine, 0, 0, 0);
    const lead = new THREE.CylinderGeometry(.26, .26, 1, 8), lz = 19.4 - 12.6, ly = 9.6 - 1.4;
    const leadG = lead.clone().applyMatrix4(new THREE.Matrix4().makeScale(1, Math.hypot(lz, ly), 1)).applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.atan2(lz, ly))).translate(0, (1.4 + 9.6) / 2, -(12.6 + 19.4) / 2);
    const ENG = [-6.4, 6.4], ey = -2.3, ez = 1.6;
    const lip = new THREE.TorusGeometry(1.02, .17, 8, 22);
    meshIn(g, merge([[leadG, M4(0, 0, 0)]].concat(ENG.map(x => [lip, M4(x, ey, ez + 2.3)]))), gold, 0, 0, 0);
    const noteC = mkc(128, 128), nx = noteC.getContext("2d"); nx.fillStyle = "#e6c25a"; nx.font = "900 104px 'Playfair Display',Georgia,serif"; nx.textAlign = "center"; nx.textBaseline = "middle"; nx.fillText("♪", 64, 70);
    const noteM = new THREE.MeshStandardMaterial({ map: canTex(noteC, true), transparent: true, alphaTest: .3, roughness: .3, metalness: .5, emissive: 0x6a4800, emissiveIntensity: .6, side: THREE.DoubleSide });
    [-1, 1].forEach(sx => { const ng = new THREE.PlaneGeometry(3.8, 3.8); ng.rotateY(sx * Math.PI / 2); meshIn(g, ng, noteM, sx * .26, 5.3, -19.1, false); });
    // engines under the wings: grey nacelles, dark fan faces, exhaust cones and pylons
    const nac = new THREE.CylinderGeometry(1.05, .88, 4.6, 20, 1, true); nac.rotateX(Math.PI / 2);
    meshIn(g, merge(ENG.map(x => [nac, M4(x, ey, ez)])), grey, 0, 0, 0);
    const fan = new THREE.CircleGeometry(.96, 20), cone = new THREE.ConeGeometry(.62, 1.7, 14); cone.rotateX(-Math.PI / 2);
    const pyl = new THREE.BoxGeometry(.34, 1.3, 3.6);
    meshIn(g, merge(ENG.map(x => [fan, M4(x, ey, ez + 2.15)]).concat(ENG.map(x => [cone, M4(x, ey, ez - 3.1)]), ENG.map(x => [pyl, M4(x, ey + 1.05, ez - .3)]))), dark, 0, 0, 0, false);
    const n = normGroup(g), off = g.position.clone();   // normGroup re-centred the airframe: shift the light/engine points the same way
    n.eng = ENG.map(x => new THREE.Vector3(x, ey, ez - 4).add(off)); n.tips = [new THREE.Vector3(17.2, tipY + .2, -7.6).add(off), new THREE.Vector3(-17.2, tipY + .2, -7.6).add(off)];
    return n; }

/* ---------------- seeded random (the clip is the same every time) ---------------- */
let SEED = 7; const rnd = () => { SEED |= 0; SEED = SEED + 0x6D2B79F5 | 0; let t = Math.imul(SEED ^ SEED >>> 15, 1 | SEED); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), ease = (u) => u * u * (3 - 2 * u);

/* ---------------- sky, fog, light ---------------- */
const SKY = CFG.toon
  ? [[0, "#3f86d8"], [.3, "#6fa8e8"], [.44, "#a9c9f0"], [.49, "#ffe0a8"], [.52, "#ffd49a"], [1, "#ffd49a"]]
  : [[0, "#141c44"], [.22, "#2b2c62"], [.36, "#6a3f72"], [.44, "#c4616e"], [.48, "#f29a5c"], [.505, "#ffd08a"], [.53, "#e9a26c"], [1, "#e9a26c"]];
{ const c = mkc(4, 512), x = c.getContext("2d"), g = x.createLinearGradient(0, 0, 0, 512); SKY.forEach(s => g.addColorStop(s[0], s[1])); x.fillStyle = g; x.fillRect(0, 0, 4, 512); scene.background = canTex(c, true); }
const FOG = CFG.toon ? 0xffd49a : 0xe0996a;
scene.fog = new THREE.Fog(FOG, LOOK === "B" ? 900 : 520, LOOK === "B" ? 3200 : 2700);
scene.add(new THREE.HemisphereLight(CFG.toon ? 0xdfefff : 0xffe2c4, CFG.toon ? 0x6a5a70 : 0x3a2c3a, CFG.toon ? 1.3 : 1.15));
const sun = new THREE.DirectionalLight(0xffc48a, CFG.toon ? 1.6 : 2.4); scene.add(sun, sun.target);
sun.castShadow = CFG.shadow; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.radius = 3;
Object.assign(sun.shadow.camera, { left: -220, right: 220, top: 220, bottom: -220, near: 10, far: 1400 });
const boomLight = new THREE.PointLight(0xff8a3a, 0, 900, 1.2); scene.add(boomLight);

/* ---------------- textures for sprites ---------------- */
function puffTex(inner, outer) { const c = mkc(128, 128), x = c.getContext("2d"), g = x.createRadialGradient(64, 64, 0, 64, 64, 62); g.addColorStop(0, inner); g.addColorStop(.45, outer); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return canTex(c, true); }
const T_GLOW = puffTex("rgba(255,255,255,1)", "rgba(255,255,255,.35)");
const T_CLOUD = (() => { const c = mkc(256, 160), x = c.getContext("2d"); SEED = 3;
  for (let i = 0; i < 16; i++) { const cx = 50 + rnd() * 156, cy = 60 + rnd() * 50, r = 26 + rnd() * 40, g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, CFG.toon ? "rgba(255,255,255,.95)" : "rgba(255,240,226,.6)"); g.addColorStop(1, "rgba(255,240,226,0)"); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill(); }
  return canTex(c, true); })();
const T_SMOKE = puffTex("rgba(70,62,60,.9)", "rgba(60,54,54,.45)");
const sprite = (tex, col, add, op) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: col, transparent: true, depthWrite: false, opacity: op == null ? 1 : op, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, fog: !add })); scene.add(s); return s; };

/* ---------------- toon outlines (look D): inverted hull pushed out in view space ---------------- */
const OUTLINE = new THREE.ShaderMaterial({ side: THREE.BackSide, uniforms: { th: { value: .32 } },
  vertexShader: "uniform float th; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); vec3 n=normalize(normalMatrix*normal); mv.xyz+=n*th*(-mv.z/120.0); gl_Position=projectionMatrix*mv; }",
  fragmentShader: "void main(){ gl_FragColor=vec4(0.09,0.07,0.12,1.0); }" });
function outline(root) { if (!CFG.toon) return; const list = []; root.traverse(o => { if (o.isMesh && o.geometry.attributes.normal && !o.material.transparent) list.push(o); });
  list.forEach(o => { const m = new THREE.Mesh(o.geometry, OUTLINE); m.castShadow = false; o.add(m); }); }

/* ---------------- models ---------------- */
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
async function glb(file, size) { const g = await loader.loadAsync("../3d/" + file); const root = g.scene;
  root.traverse(o => { if (o.isMesh) { if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals(); const m0 = o.material;
    o.material = CFG.toon ? new THREE.MeshToonMaterial({ map: m0.map, color: 0xffffff, gradientMap: GRAD }) : Object.assign(m0, { metalness: .1, roughness: .55 }); o.castShadow = true; } });
  const box = new THREE.Box3().setFromObject(root), c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3()); root.position.sub(c);
  const o = new THREE.Group(), s = size / Math.max(sz.x, sz.z); o.add(root); o.scale.setScalar(s); o.rotation.order = "YXZ"; outline(o); scene.add(o);
  o.userData.mats = []; root.traverse(n => { if (n.isMesh) o.userData.mats.push(n.material); }); return o; }

const AIR = buildAirliner(); const plane = new THREE.Group(); plane.add(AIR.node); AIR.node.scale.setScalar(SPAN / AIR.size.x); plane.rotation.order = "YXZ"; outline(AIR.node); scene.add(plane);
AIR.node.traverse(o => { if (o.isMesh) o.castShadow = true; });
const [jet, ufo, heli, burger] = await Promise.all([glb("jet.glb", 46), glb("ufo.glb", 42), glb("heli_blue.glb", 52), glb("p_burger.glb", 20)]);
burger.userData.mats.forEach(m => { if (m.map && !CFG.toon) { m.emissiveMap = m.map; m.emissive = new THREE.Color(0xffffff); m.emissiveIntensity = .45; } });
const rotorM = new THREE.MeshBasicMaterial({ color: 0x20242c, transparent: true, opacity: .35, depthWrite: false });
const rotor = new THREE.Mesh(new THREE.CircleGeometry(30, 32).rotateX(-Math.PI / 2), rotorM); scene.add(rotor);
const flash = (o, v, col) => o.userData.mats.forEach(m => { if (m.emissive) { m.emissive.setHex(col || 0xffffff); m.emissiveIntensity = v; } });

/* ---------------- the flight: your path, the scripted world ---------------- */
const V = CFG.v, ALT = CFG.alt;
const px = t => 34 * Math.sin(t * .85) + 14 * Math.sin(t * 2 + 1), py = t => ALT + 5 * Math.sin(t * .9), pz = t => -V * t;
const dpx = t => (px(t + .02) - px(t - .02)) / .04, dpy = t => (py(t + .02) - py(t - .02)) / .04;

// ground: the game's own aerial tiles (dusk LA), each one's near edge feathered over the one before; mirrored copies either side
const TILE_SEQ = LOOK === "B" ? ["city1", "city2", "venicecoast", "pier", "city1"] : ["city1", "city2", "hills", "city1", "venicecoast", "pier", "city2"];
const imgs = {}; await Promise.all([...new Set(TILE_SEQ)].map(k => new Promise(res => { const i = new Image(); i.onload = () => { imgs[k] = i; res(); }; i.src = "../img/game/ground/" + k + ".jpg"; })));
const TW = CFG.tile, FEA = .08;
if (!CFG.toon) {
  let z = 700, n = 0;
  for (let rep = 0; z > -(V * 8 + 4200); rep++) for (const k of TILE_SEQ) { if (z <= -(V * 8 + 4200)) break;
    const im = imgs[k], c = mkc(im.width, im.height), x = c.getContext("2d"); x.drawImage(im, 0, 0);
    if (n) { x.globalCompositeOperation = "destination-out"; const f = im.height * FEA, g = x.createLinearGradient(0, im.height - f, 0, im.height); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,1)"); x.fillStyle = g; x.fillRect(0, im.height - f, im.width, f); }
    const t = canTex(c, true); t.anisotropy = 8; const th = TW * im.height / im.width;
    const mat = new THREE.MeshLambertMaterial({ map: t, color: 0xfff0e2, transparent: n > 0, depthWrite: !n });
    for (let col = -2; col <= 2; col++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), mat); m.scale.set(col % 2 ? -TW : TW, 1, th); m.position.set(col * TW, .02 * n, z - th / 2); m.renderOrder = n; m.receiveShadow = true; scene.add(m); }
    z -= th * (1 - FEA); n++; }
} else {   // toon: a clean low-poly city in Melody colours on a teal ground with a road grid
  const gc = mkc(256, 256), gx = gc.getContext("2d"); gx.fillStyle = "#4f8f86"; gx.fillRect(0, 0, 256, 256); gx.fillStyle = "#3b4a5c"; gx.fillRect(0, 118, 256, 20); gx.fillRect(118, 0, 20, 256);
  gx.fillStyle = "#f3d27a"; for (let i = 0; i < 256; i += 32) { gx.fillRect(i, 126, 14, 4); gx.fillRect(126, i, 4, 14); }
  const gt = canTex(gc, true); gt.wrapS = gt.wrapT = THREE.RepeatWrapping; gt.repeat.set(30, 60); gt.anisotropy = 8;
  const gm = new THREE.Mesh(new THREE.PlaneGeometry(6000, 12000).rotateX(-Math.PI / 2), new THREE.MeshToonMaterial({ map: gt, gradientMap: GRAD })); gm.position.z = -5000; gm.receiveShadow = true; scene.add(gm);
  const N = 900, bg = new THREE.BoxGeometry(1, 1, 1).translate(0, .5, 0), bm = new THREE.MeshToonMaterial({ gradientMap: GRAD }), ib = new THREE.InstancedMesh(bg, bm, N), M4 = new THREE.Matrix4(), col = new THREE.Color();
  const PAL = ["#f4ead7", "#a33645", "#d4af37", "#efe4c9", "#77242e", "#e46b83", "#6fb3c9", "#f0d375"]; SEED = 11;
  for (let i = 0; i < N; i++) { const cell = 200, gxi = Math.round((rnd() - .5) * 28), gzi = -Math.round(rnd() * 58) + 3, w = 40 + rnd() * 70, d = 40 + rnd() * 70, h = 8 + Math.pow(rnd(), 1.6) * 38;
    M4.makeScale(w, h, d).setPosition(gxi * cell + (rnd() - .5) * 40, 0, gzi * cell + (rnd() - .5) * 40); ib.setMatrixAt(i, M4); ib.setColorAt(i, col.set(PAL[(rnd() * PAL.length) | 0])); }
  ib.castShadow = false; scene.add(ib);
}

// clouds (and C's speed lines)
SEED = 21; const clouds = [];
for (let i = 0; i < CFG.clouds; i++) { const s = sprite(T_CLOUD, 0xffffff, false, CFG.toon ? .8 : .55); const near = LOOK === "C" && i % 3 === 0;
  s.position.set(near ? (rnd() - .5) * 160 : (rnd() < .5 ? -1 : 1) * (170 + rnd() * 480), ALT + (LOOK === "B" ? -30 - rnd() * 60 : (rnd() - .4) * 120), -rnd() * (V * 8 + 1200) - 100); const sc = near ? 60 + rnd() * 60 : 160 + rnd() * 220; s.scale.set(sc, sc * .62, 1); clouds.push(s); }
const lines = []; for (let i = 0; i < CFG.lines; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(.35, .35, 70), new THREE.MeshBasicMaterial({ color: 0xfff2dc, transparent: true, opacity: .4, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  const a = rnd() * TAU, r = 26 + rnd() * 70; m.userData = { x: Math.cos(a) * r, y: Math.sin(a) * r * .8 + 10, ph: rnd() }; scene.add(m); lines.push(m); }

// script
const TE = 3.05;                                   // the jet goes down
const jetX = px(2.4), jetD = t => 1100 - 300 * t;  // jet: holds your line ahead, closing
const FIRE = []; for (let f = 1.45; f < 3.0; f += .1) FIRE.push(f); for (let f = 5.9; f < 7.6; f += .1) FIRE.push(f);
const lasers = FIRE.flatMap(() => [-1, 1]).map(() => { const g = new THREE.Group(); const core = new THREE.Mesh(new THREE.BoxGeometry(.9, .9, 26), new THREE.MeshBasicMaterial({ color: 0xffb0a8, fog: false }));
  const glow = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.4, 32), new THREE.MeshBasicMaterial({ color: 0xff1a2a, transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); g.add(core, glow); scene.add(g); return g; });
const muzzle = [-1, 1].map(() => sprite(T_GLOW, 0xff5a4a, true));
const engGlow = AIR.eng.map(() => sprite(T_GLOW, 0xffa24a, true));
SEED = 99; const BOOM = { fire: Array.from({ length: 16 }, () => ({ s: sprite(T_GLOW, 0xff8a2a, true), o: new THREE.Vector3((rnd() - .5) * 26, (rnd() - .5) * 18, (rnd() - .5) * 26), d: rnd() * .25, k: .6 + rnd() * .8 })),
  smoke: Array.from({ length: 14 }, () => ({ s: sprite(T_SMOKE, 0xffffff, false), o: new THREE.Vector3((rnd() - .5) * 30, (rnd() - .3) * 20, (rnd() - .5) * 30), d: .15 + rnd() * .5, k: .7 + rnd() * .7 })),
  bits: Array.from({ length: 18 }, () => { const m = new THREE.Mesh(new THREE.BoxGeometry(2.4 + rnd() * 3, .5, 1.6 + rnd() * 2), std(rnd() < .5 ? 0x8c939e : 0x50555e)); scene.add(m); outline(m);
    return { m, v: new THREE.Vector3((rnd() - .5) * 120, 30 + rnd() * 70, (rnd() - .5) * 120), r: new THREE.Vector3(rnd() * 9, rnd() * 9, rnd() * 9), tr: sprite(T_GLOW, 0xff7a2a, true) }; }),
  flash: sprite(T_GLOW, 0xfff0c0, true) };
const ufoGlow = sprite(T_GLOW, 0x7ef7c8, true), orbs = [4.2, 4.9].map(() => ({ s: sprite(T_GLOW, 0x7ef7c8, true), c: sprite(T_GLOW, 0xffffff, true) }));
const burgerGlow = sprite(T_GLOW, 0xffd27a, true), spark = Array.from({ length: 14 }, () => sprite(T_GLOW, 0xffe6a0, true));
const jetPos = t => new THREE.Vector3(jetX, ALT + 4, pz(t) - jetD(t));
const BURG_T = 5.0;

/* ---------------- HUD (the game's own HUD, drawn over the 3D frame) ---------------- */
const hud = document.getElementById("hud"), hx = hud.getContext("2d");
const PV = new THREE.Vector3();
function project(v) { PV.copy(v).project(cam); return [(PV.x + 1) / 2 * W, (1 - PV.y) / 2 * H, PV.z < 1]; }
function drawHud(t) {
  hx.clearRect(0, 0, W, H);
  const g = hx.createLinearGradient(0, 0, 0, 190); g.addColorStop(0, "rgba(12,18,36,.94)"); g.addColorStop(1, "rgba(12,18,36,.82)"); hx.fillStyle = g; hx.fillRect(0, 0, W, 176);
  const score = 1240 + Math.floor(t * 40) + (t > TE ? 500 : 0) + (t > BURG_T ? 50 : 0);
  hx.fillStyle = "#f0d375"; hx.font = "400 64px Anton, Impact, sans-serif"; hx.textBaseline = "alphabetic"; hx.textAlign = "left"; hx.fillText(score.toLocaleString("en-US"), 26, 98);
  hx.fillStyle = "#9aa3b5"; hx.font = "800 22px Barlow, system-ui, sans-serif"; hx.fillText("H E A L T H", 250, 58); hx.textAlign = "right"; hx.fillText("100%", 590, 58);
  hx.fillStyle = "rgba(255,255,255,.08)"; roundRect(250, 72, 340, 26, 13); hx.fill(); const hg = hx.createLinearGradient(250, 0, 590, 0); hg.addColorStop(0, "#43c27e"); hg.addColorStop(1, "#8ee05a"); hx.fillStyle = hg; roundRect(250, 72, 340, 26, 13); hx.fill();
  hx.fillStyle = "rgba(12,18,36,.9)"; hx.fillRect(362, 72, 4, 26); hx.fillRect(476, 72, 4, 26);
  hx.fillStyle = "#fff"; hx.font = "800 40px Barlow, system-ui, sans-serif"; hx.fillText(Math.max(0, 41 - Math.floor(t)) + "s", 700, 96);
  hx.textAlign = "left"; hx.fillStyle = "#c9d2ee"; hx.font = "700 24px Barlow, system-ui, sans-serif"; hx.fillText("Level 3 of 10", 26, 150);
  hx.textAlign = "right"; hx.fillStyle = "#ff4a4a"; hx.font = "800 28px Barlow, system-ui, sans-serif"; hx.fillText("Red beams", 610, 150);
  ["#f0d375", "#7dff6a", "#ff9a2e", "#3aa8ff", "#ff2d2d"].forEach((c, i) => { hx.fillStyle = c; roundRect(624 + i * 18, 128, 14, 26, 4); hx.fill(); });
  hx.textAlign = "left"; hx.fillStyle = "rgba(240,211,117,.75)"; hx.font = "800 22px Barlow, system-ui, sans-serif"; hx.fillText("MELODY BAR & GRILL ★", 18, 214);
  // pops at the world spot, like the game
  const pop = (txt, col, v, t0) => { const u = (t - t0) / 1.1; if (u < 0 || u > 1) return; const p = project(v); if (!p[2]) return; hx.globalAlpha = 1 - u; hx.textAlign = "center"; hx.font = "800 34px Barlow, system-ui, sans-serif"; hx.lineWidth = 6; hx.strokeStyle = "rgba(5,8,20,.8)"; hx.strokeText(txt, p[0], p[1] - 60 * u); hx.fillStyle = col; hx.fillText(txt, p[0], p[1] - 60 * u); hx.globalAlpha = 1; };
  pop("+500  JET DOWN!", "#f0d375", jetPos(TE), TE); pop("+50 Classic Burger", "#f0d375", new THREE.Vector3(px(BURG_T), py(BURG_T) + 14, pz(BURG_T)), BURG_T);
  // which look this is
  hx.textAlign = "left"; hx.font = "800 26px Barlow, system-ui, sans-serif"; const lw = hx.measureText(CFG.name).width; hx.fillStyle = "rgba(12,18,36,.78)"; roundRect(22, H - 112, Math.max(lw, 330) + 40, 84, 20); hx.fill();
  hx.fillStyle = "#f0d375"; hx.fillText(CFG.name, 42, H - 72); hx.fillStyle = "#c9d2ee"; hx.font = "600 20px Barlow, system-ui, sans-serif"; hx.fillText(CFG.sub, 42, H - 44);
}
function roundRect(x, y, w, h, r) { hx.beginPath(); hx.moveTo(x + r, y); hx.arcTo(x + w, y, x + w, y + h, r); hx.arcTo(x + w, y + h, x, y + h, r); hx.arcTo(x, y + h, x, y, r); hx.arcTo(x, y, x + w, y, r); hx.closePath(); }

/* ---------------- one moment of the flight ---------------- */
const tmp = new THREE.Vector3();
function update(t) {
  // you
  const X = px(t), Y = py(t), Z = pz(t), bank = clamp(dpx(t) / 70, -1, 1), climb = clamp(dpy(t) / 12, -1, 1);
  plane.position.set(X, Y, Z); plane.rotation.set(-climb * .12, Math.PI - bank * .12, bank * .75);
  plane.updateMatrixWorld(true); AIR.eng.forEach((e, i) => { AIR.node.localToWorld(tmp.copy(e)); const f = .8 + .2 * Math.sin(t * 37 + i); engGlow[i].position.copy(tmp); engGlow[i].scale.setScalar(5.5 * f); engGlow[i].material.opacity = .9; });
  // camera
  const lagX = X * (1 - CFG.lag) + px(t - .35) * CFG.lag, sh = t > TE ? 2.2 * Math.exp(-(t - TE) * 4) : 0;
  cam.position.set(lagX + CFG.cam[0] + Math.sin(t * 60) * sh, Y + CFG.cam[1] + Math.cos(t * 53) * sh, Z + CFG.cam[2]);
  cam.up.set(Math.sin(bank * .06), 1, 0).normalize(); cam.lookAt(X * .9 + CFG.look[0], Y + CFG.look[1], Z + CFG.look[2]);
  sun.position.set(X + 140, Y + 190, Z + 160); sun.target.position.set(X, Y - (LOOK === "B" ? 60 : 0), Z - 20);
  // the jet: closes on your line, takes hits, goes down at TE
  const jp = jetPos(Math.min(t, TE)); jet.visible = t < TE; jet.position.copy(jp); jet.rotation.set(.05, 0, Math.sin(t * 1.3) * .15); flash(jet, t > 1.95 && Math.sin(t * 47) > .55 ? .7 : 0, 0xff6a5a);
  // lasers from the wing guns (red beams), each one flies straight ahead from where you were when it fired
  let li = 0; let firing = false;
  FIRE.forEach(tf => [-1, 1].forEach(side => { const L = lasers[li++], age = t - tf; if (age < 0 || age > 1.1) { L.visible = false; return; } if (age < .06) firing = true;
    const z = pz(tf) - 10 - (V + 1100) * age; let vis = true; if (tf < TE && t < TE + .02 && z < jetPos(t).z) vis = false; if (tf > 5 && z < pz(t) - (1600 - 200 * t) + 4 && t > 5.9) vis = false;
    L.visible = vis; L.position.set(px(tf) + side * 7.5, py(tf) - 1.2, z); }));
  muzzle.forEach((m, i) => { m.visible = firing; tmp.set(i ? 7.5 : -7.5, -1.2, -12).applyEuler(plane.rotation).add(plane.position); m.position.copy(tmp); m.scale.setScalar(7 + 3 * Math.sin(t * 90)); });
  // explosion
  const u = t - TE, bp = jetPos(TE); boomLight.position.copy(bp); boomLight.intensity = u > 0 ? 9000 * Math.exp(-u * 3) : 0;
  BOOM.flash.visible = u > 0 && u < .5; BOOM.flash.position.copy(bp); BOOM.flash.scale.setScalar(50 + u * 150); BOOM.flash.material.opacity = clamp(1 - u * 2.2, 0, 1);
  BOOM.fire.forEach(f => { const a = (u - f.d) / 1.3; f.s.visible = a > 0 && a < 1; if (!f.s.visible) return; f.s.position.copy(bp).addScaledVector(f.o, .4 + a * 1.6); f.s.position.y += a * 14;
    f.s.scale.setScalar((22 + 80 * ease(Math.min(1, a * 2.2))) * f.k); f.s.material.color.setRGB(1, .5 - a * .3, .12 - a * .1); f.s.material.opacity = clamp(1.3 - a * 1.4, 0, 1); });
  BOOM.smoke.forEach(f => { const a = (u - f.d) / 3.2; f.s.visible = a > 0 && a < 1; if (!f.s.visible) return; f.s.position.copy(bp).addScaledVector(f.o, .6 + a * 2); f.s.position.y += a * 40;
    f.s.scale.setScalar((30 + 130 * ease(a)) * f.k); f.s.material.opacity = clamp(.85 - a * .9, 0, 1) * clamp(a * 6, 0, 1); });
  BOOM.bits.forEach(b => { b.m.visible = u > 0 && u < 3; b.tr.visible = b.m.visible && u < 1.6; if (!b.m.visible) return; b.m.position.copy(bp).addScaledVector(b.v, u); b.m.position.y -= 45 * u * u; b.m.rotation.set(b.r.x * u, b.r.y * u, b.r.z * u);
    b.tr.position.copy(b.m.position); b.tr.scale.setScalar(9 * (1 - u / 1.6)); });
  // ufo: drifts in on your left, lobs two green orbs that miss
  const ud = 1300 - 190 * t; ufo.position.set(-110 + 30 * Math.sin(t * 1.3), ALT + 16, pz(t) - ud); ufo.rotation.set(.12, t * 1.8, 0); ufo.visible = ud > -60;
  ufoGlow.position.copy(ufo.position).y -= 6; ufoGlow.scale.setScalar(70); ufoGlow.material.opacity = .45; ufoGlow.visible = ufo.visible;
  orbs.forEach((o, i) => { const t0 = [4.2, 4.9][i], a = (t - t0) / 1.1; o.s.visible = o.c.visible = a > 0 && a < 1; if (!o.s.visible) return; const from = new THREE.Vector3(-110 + 30 * Math.sin(t0 * 1.3), ALT + 14, pz(t0) - (1300 - 190 * t0));
    const to = new THREE.Vector3(px(t0 + 1.1) - 30, py(t0 + 1.1) + 4, pz(t0 + 1.1) + 20); o.s.position.lerpVectors(from, to, a); o.c.position.copy(o.s.position); o.s.scale.setScalar(16); o.c.scale.setScalar(6); });
  // the LAPD-style helicopter arrives at the end and starts taking fire
  const hd = 1600 - 200 * t; heli.visible = t > 3.6; heli.position.set(px(6.6) + 6, ALT + 10 + Math.sin(t * 2) * 2, pz(t) - hd); heli.rotation.set(.08, Math.PI, Math.sin(t * 1.1) * .1);
  flash(heli, t > 6.4 && Math.sin(t * 47) > .55 ? .6 : 0, 0xff6a5a); rotor.visible = heli.visible; rotor.position.copy(heli.position).y += 12; rotor.rotation.y = t * 30;
  // a Melody burger floating in your path: you fly through it at BURG_T
  burger.visible = t < BURG_T; burger.position.set(px(BURG_T), py(BURG_T) + 1, pz(BURG_T)); burger.rotation.set(.35, t * 2.2, 0); burgerGlow.visible = burger.visible; burgerGlow.position.copy(burger.position); burgerGlow.scale.setScalar(34 + 4 * Math.sin(t * 9)); burgerGlow.material.opacity = .6;
  spark.forEach((s, i) => { const a = (t - BURG_T) / .7, ang = i / spark.length * TAU; s.visible = a > 0 && a < 1; if (!s.visible) return; s.position.set(px(BURG_T) + Math.cos(ang) * 30 * a, py(BURG_T) + Math.sin(ang) * 22 * a + 2, pz(t) - 14); s.scale.setScalar(6 * (1 - a)); });
  // speed lines (C): streaks rushing past the camera
  lines.forEach(m => { const d = m.userData, Lz = 900, zr = ((d.ph * Lz - t * V * 2.2) % Lz + Lz) % Lz; m.position.set(cam.position.x + d.x, cam.position.y + d.y - 10, cam.position.z - zr - 20); m.material.opacity = .35 * Math.min(1, zr / 200); });
}
function frame(t) { update(t); renderer.render(scene, cam); drawHud(t); }
const out = mkc(W, H), ox = out.getContext("2d");
window.frameAt = (t) => { frame(t); ox.drawImage(cv, 0, 0); ox.drawImage(hud, 0, 0); return out.toDataURL("image/jpeg", .92); };
try { await Promise.all([document.fonts.load("400 64px Anton"), document.fonts.load("800 22px Barlow"), document.fonts.load("600 20px Barlow"), document.fonts.load("700 24px Barlow")]); } catch (e) {}
window.LOOK_READY = true;
if (!window.CAPTURE) { const t0 = performance.now(); const loop = () => { frame(((performance.now() - t0) / 1000) % 7.5); requestAnimationFrame(loop); }; loop(); }
