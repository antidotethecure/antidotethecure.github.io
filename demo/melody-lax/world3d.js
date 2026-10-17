/* Melody flight game: the 3D GROUND for the chase view (2026-10-16, Antidote: "make sure you can see everything on the floor
   3D, the cars. You can see Melody Bar and Grill with the security outside with people in line ... you can even pass by my
   food review ... and see me in a Tesla or something, like something sneaky like an Easter egg").
   Low-altitude LA at golden hour/dusk, built from primitives in the game's own units (1 unit = 1 game px; your wingspan is
   ~86, you fly at 150): street grid with moving cars (headlights, taillights), lit buildings, palm trees, the LAX runway
   approach, a generic stadium, the hills, the beach and a pier, and Melody Bar & Grill itself (gold sign from the real logo,
   patio string lights, a security guard and a line of guests). The Easter egg: a roadside screen playing Antidote's Melody
   review and a white electric sedan with an ANTIDOTE plate cruising nearby. No real brands or logos except Melody.
   Cheap on phones: everything is instanced or merged per segment (~7 draw calls for a city block strip), nothing casts shadows.
   2nd pass (same day, Antidote: "lights cutting on or off ... smoke coming out the top from a building that's using a restaurant
   ... you can actually crash and hit the buildings and break them ... make the buildings a little bit lower"): every window
   switches on and off on its own (shader, per window, no CPU), rooftops get AC units, water tanks, antennas with blinking
   red lights, helipads and signs, restaurant rooftops puff kitchen smoke, the skyline sits lower, and buildings break:
   seg.collide()/seg.smash() knock the top off where you hit (debris falls, the windows there go dark, the hole burns).
   Melody, Nalu Vida and the review screen are not in that list: they never break.
   Venice (Antidote: "you see the water, surfers in the water, people on the beach ... as realistic as possible"): a wave
   shader with sunset glints, breaking waves and foam rolling onto the sand, surfers riding the faces, paddlers and heads past
   the break, towels, umbrellas, volleyball, a lifeguard tower, the boardwalk, the pier, and Nalu Vida on the pier with its logo.
   Used by melody3d.js (the game) and 3d-looks/look2.js + look3.js (the preview clips).
   makeWorld(THREE, {base, fx}) → { segment(kind, len, seed, o), root, wind, tick(dt, t), debris(...) }. */
import { makeBeachKit } from "./beach3d.js?v=e3o";
import { makeVideoBoards } from "../engine3d/billboard.js?v=e3o";
import { makeFacades } from "../engine3d/facades.js?v=e3o";
import { buildCars } from "../engine3d/carmodels.js?v=e3o";
/* The storefront name. The real business is "Melody Bar & Grill"; change this one line to rename the awning / blade sign / door
   glass lettering (the gold logo boards use the real artwork, img/logo.png). */
export const MELODY_SIGN_TEXT = "MELODY BAR & GRILL";
// seconds of FLIGHT between two review billboards (they alternate right, left, right…); tune here
export const BB_GAP_S = 50;
export function makeWorld(THREE, O = {}) {
  const TAU = Math.PI * 2, BASE = O.base || "";
  const rng = (seed) => { let s = (seed * 2654435761) | 0; return () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  const mkc = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
  const tex = (c, rep) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
  const img = (src) => { const t = new THREE.Texture(); t.colorSpace = THREE.SRGBColorSpace; const i = new Image(); i.onload = () => { t.image = i; t.needsUpdate = true; if (t.onReady) t.onReady(i); }; i.src = BASE + src; return t; };
  const XW = O.width || 2000, CX = 320, CZ = 230, ROAD = 36, SIDE = 9;   // ground width · street grid cell · road + sidewalk widths
  const AVE = [-800, -480, -160, 160, 480, 800];                          // avenues run along the flight (z); cross streets every CZ

  /* ---------- shared textures ---------- */
  // streets: asphalt with grain, patches, cracks, tyre-polished lanes, manholes, oil stains; concrete sidewalks in slabs with a
  // kerb line; lots with gravel/grass/parking. One 1024-wide tile per street-grid cell (drawn once, mipmapped)
  const groundTex = (() => { const GW = O.lite ? 512 : 1024, GH = Math.round(GW * 368 / 512), c = mkc(GW, GH), x = c.getContext("2d"), k = GW / 512; x.scale(k, k);
    const sx = 512 / CX, sz = 368 / CZ, rw = ROAD * sx, rz = ROAD * sz, sw = SIDE * sx, swz = SIDE * sz, R = rng(5);
    x.fillStyle = "#56544f"; x.fillRect(0, 0, 512, 368);                                                   // lots
    for (let i = 0; i < 90; i++) { x.fillStyle = R() < .5 ? "rgba(60,82,52,.55)" : "rgba(40,40,44,.35)"; x.fillRect(R() * 512, R() * 368, 8 + R() * 50, 8 + R() * 40); }
    for (let i = 0; i < 700; i++) { x.fillStyle = `rgba(${R() < .5 ? "255,255,255" : "0,0,0"},${.03 + R() * .05})`; x.fillRect(R() * 512, R() * 368, .6 + R(), .6 + R()); }   // gravel
    x.fillStyle = "#8d8a84"; x.fillRect(0, 0, rw / 2 + sw, 368); x.fillRect(512 - rw / 2 - sw, 0, rw / 2 + sw, 368); x.fillRect(0, 0, 512, rz / 2 + swz); x.fillRect(0, 368 - rz / 2 - swz, 512, rz / 2 + swz);   // sidewalks
    x.strokeStyle = "rgba(0,0,0,.12)"; x.lineWidth = .35; for (let z = 0; z < 368; z += 6) { x.beginPath(); x.moveTo(0, z); x.lineTo(rw / 2 + sw, z); x.moveTo(512 - rw / 2 - sw, z); x.lineTo(512, z); x.stroke(); }   // sidewalk slabs
    for (let q = 0; q < 512; q += 6) { x.beginPath(); x.moveTo(q, 0); x.lineTo(q, rz / 2 + swz); x.moveTo(q, 368 - rz / 2 - swz); x.lineTo(q, 368); x.stroke(); }
    x.fillStyle = "#2b2c31"; x.fillRect(0, 0, rw / 2, 368); x.fillRect(512 - rw / 2, 0, rw / 2, 368); x.fillRect(0, 0, 512, rz / 2); x.fillRect(0, 368 - rz / 2, 512, rz / 2);   // asphalt
    const onRoad = (px, py) => px < rw / 2 || px > 512 - rw / 2 || py < rz / 2 || py > 368 - rz / 2;
    for (let i = 0; i < 2600; i++) { const px = R() * 512, py = R() * 368; if (!onRoad(px, py)) continue; x.fillStyle = `rgba(${R() < .5 ? "190,190,190" : "0,0,0"},${.05 + R() * .08})`; x.fillRect(px, py, .5 + R() * .8, .5 + R() * .8); }   // aggregate
    for (let i = 0; i < 14; i++) { const v = R() < .5, px = v ? (R() < .5 ? R() * rw / 2 : 512 - R() * rw / 2) : R() * 512, py = v ? R() * 368 : (R() < .5 ? R() * rz / 2 : 368 - R() * rz / 2);
      x.fillStyle = `rgba(${R() < .5 ? "20,20,24" : "70,70,74"},.5)`; x.fillRect(px - 4, py - 3, 6 + R() * 12, 4 + R() * 8); }   // patches
    x.strokeStyle = "rgba(10,10,12,.55)"; x.lineWidth = .4; for (let i = 0; i < 26; i++) { let px = R() * 512, py = R() * 368; if (!onRoad(px, py)) continue; x.beginPath(); x.moveTo(px, py); for (let j = 0; j < 5; j++) { px += (R() - .5) * 8; py += (R() - .5) * 8; x.lineTo(px, py); } x.stroke(); }   // cracks
    for (const lx of [rw * .12, rw * .38, 512 - rw * .12, 512 - rw * .38]) { x.fillStyle = "rgba(0,0,0,.18)"; x.fillRect(lx - 1.2, 0, 2.4, 368); }   // tyre-darkened lanes
    for (let i = 0; i < 10; i++) { const px = R() < .5 ? rw * (.15 + R() * .25) : 512 - rw * (.15 + R() * .25), py = R() * 368; x.fillStyle = "rgba(5,5,8,.35)"; x.beginPath(); x.ellipse(px, py, 1.5 + R() * 2, 2 + R() * 4, 0, 0, TAU); x.fill(); }   // oil
    for (const [mx, my] of [[rw * .25, 120], [512 - rw * .25, 260], [200, rz * .25], [330, 368 - rz * .25]]) { x.fillStyle = "#3b3a37"; x.beginPath(); x.arc(mx, my, 1.8, 0, TAU); x.fill(); x.strokeStyle = "#1a1a1c"; x.lineWidth = .3; x.stroke(); }   // manholes
    x.fillStyle = "#b9b4a9"; x.fillRect(rw / 2, 0, .8, 368); x.fillRect(512 - rw / 2 - .8, 0, .8, 368); x.fillRect(0, rz / 2, 512, .8); x.fillRect(0, 368 - rz / 2 - .8, 512, .8);   // kerbs
    x.fillStyle = "#e3b93a"; x.fillRect(0, 0, 1.2, 368); x.fillRect(510.8, 0, 1.2, 368); x.fillRect(0, 0, 512, .9); x.fillRect(0, 367.1, 512, .9);   // yellow centre lines
    x.fillStyle = "rgba(240,240,240,.8)"; for (let z = 30; z < 340; z += 26) { x.fillRect(rw * .25 - 1, z, 2, 12); x.fillRect(512 - rw * .25 - 1, z, 2, 12); }
    for (let i = 0; i < 6; i++) { x.fillRect(rw / 2 + 4 + i * 7, rz / 2 + 2, 4, swz + 6); x.fillRect(rw / 2 + 4 + i * 7, 368 - rz / 2 - swz - 8, 4, swz + 6); }   // crosswalks
    x.fillRect(rw / 2 + 1, rz / 2 + swz + 9, 1.2, rw / 2 - 2);   // stop bar
    const t = tex(c, true); t.anisotropy = 8; return t; })();
  const winTex = (() => { const c = mkc(256, 256), x = c.getContext("2d"), e = mkc(256, 256), ex = e.getContext("2d"), R = rng(9);
    x.fillStyle = "#c9c2b6"; x.fillRect(0, 0, 256, 256); ex.fillStyle = "#000"; ex.fillRect(0, 0, 256, 256);
    for (let r = 0; r < 32; r++) for (let q = 0; q < 24; q++) { const px = 3 + q * 10.6, py = 3 + r * 8;
      x.fillStyle = R() < .5 ? "#39404c" : "#2f3640"; x.fillRect(px, py, 6, 4.6); const u = R(); ex.fillStyle = u < .6 ? "#ffcf8a" : u < .85 ? "#ffe6b8" : "#cfe3ff"; ex.fillRect(px, py, 6, 4.6); }
    for (let q = 0; q < 24; q++) { x.fillStyle = "rgba(255,255,255,.06)"; x.fillRect(1 + q * 10.6, 0, 1, 256); }   // mullions
    for (let r = 0; r < 4; r++) { x.fillStyle = "rgba(0,0,0,.12)"; x.fillRect(0, r * 64, 256, 2); }
    return [tex(c, false), tex(e, false)]; })();
  const roofTex = (() => { const c = mkc(64, 64), x = c.getContext("2d"); x.fillStyle = "#77736c"; x.fillRect(0, 0, 64, 64); x.fillStyle = "#5f5b55"; x.fillRect(8, 8, 18, 12); x.fillRect(38, 30, 16, 18); x.strokeStyle = "#8b877f"; x.lineWidth = 3; x.strokeRect(1.5, 1.5, 61, 61); return tex(c, false); })();
  const glowTex = (() => { const c = mkc(64, 64), x = c.getContext("2d"), g = x.createRadialGradient(32, 32, 0, 32, 32, 31); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(.35, "rgba(255,255,255,.5)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); return t; })();
  const coneTex = (() => { const c = mkc(32, 64), x = c.getContext("2d"), g = x.createLinearGradient(0, 64, 0, 0); g.addColorStop(0, "rgba(255,255,255,.9)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 32, 64); return new THREE.CanvasTexture(c); })();

  /* ---------- shared materials ---------- */
  const UT = { value: 0 }, ROOF0 = {};
  const M = {
    ground: new THREE.MeshLambertMaterial({ map: groundTex }),
    facade: null,
    roof: new THREE.MeshLambertMaterial({ map: roofTex }),
    trunk: new THREE.MeshLambertMaterial({ color: 0x8a6a4a }), leaf: new THREE.MeshLambertMaterial({ color: 0x4f8a3a, side: THREE.DoubleSide, alphaTest: .45 }),
    car: new THREE.MeshStandardMaterial({ roughness: .35, metalness: .55 }), glass: new THREE.MeshStandardMaterial({ color: 0x141a24, roughness: .1, metalness: .6 }),
    lamp: new THREE.MeshBasicMaterial({ toneMapped: false }), pool: new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xfff1c8, opacity: .55, toneMapped: false }),
    person: new THREE.MeshLambertMaterial(), sand: new THREE.MeshLambertMaterial({ color: 0xd9b98a }), grass: new THREE.MeshLambertMaterial({ color: 0x4f7a3a }),
    wood: new THREE.MeshLambertMaterial({ color: 0x8a6342 }), white: new THREE.MeshLambertMaterial({ color: 0xf2efe8 }), dark: new THREE.MeshLambertMaterial({ color: 0x2a2c33 }),
    wine: new THREE.MeshStandardMaterial({ color: 0x77242e, roughness: .6 }), brick: new THREE.MeshStandardMaterial({ color: 0x5a2a2c, roughness: .8 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: .25, metalness: .8, emissive: 0x5a3e00, emissiveIntensity: .7 }),
    beam: new THREE.MeshBasicMaterial({ map: coneTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xfff0c8, opacity: .22, side: THREE.DoubleSide, toneMapped: false }),
  };
  M.car.vertexColors = true;
  // window lights: one cell of the window grid = one window; each switches on/off on its own clock. aDmg (per building) darkens a broken one
  // facades: engine3d/facades.js — stucco / glass curtain wall / brick / concrete office in one atlas, tiled at real window size,
  // normal + roughness detail on the PBR path (Lambert on Smooth), every window lit on its own clock; aDmg darkens a broken one
  const FAC = makeFacades(THREE, { size: O.facadeSize || 1024, pbr: O.pbr !== false, time: UT }); M.facade = FAC.material;
  ROOF0.para = new THREE.MeshLambertMaterial({ color: 0xa29d94 }); ROOF0.house = new THREE.MeshLambertMaterial({ color: 0x8f8a82 }); ROOF0.solar = new THREE.MeshStandardMaterial({ color: 0x1b2638, roughness: .25, metalness: .4 }); ROOF0.heater = new THREE.MeshLambertMaterial({ color: 0xd8d8d2 });
  // palm fronds sway: the further from the crown, the more they move; gusts follow the weather's wind (setWind)
  const UWIND = { value: .3 };
  M.leaf.onBeforeCompile = (sh) => { sh.uniforms.uT = UT; sh.uniforms.uWind = UWIND;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uT; uniform float uWind;").replace("#include <begin_vertex>", `#include <begin_vertex>
      { vec3 ip = vec3(0.0);
        #ifdef USE_INSTANCING
          ip = instanceMatrix[3].xyz;
        #endif
        float r = length(transformed.xz), k = smoothstep(1.0, 16.0, r), ph = ip.x * .07 + ip.z * .05;
        float g = sin(uT * (1.1 + uWind) + ph) * .6 + sin(uT * 2.7 + ph * 1.7) * .25 + sin(uT * 6.1 + r * .4 + ph) * .12;
        transformed.x += g * k * (1.2 + 3.5 * uWind); transformed.z += cos(uT * 1.3 + ph) * k * (.6 + 2.0 * uWind) * .5; transformed.y -= abs(g) * k * k * (.5 + 1.5 * uWind); }`); };
  M.leaf.customProgramCacheKey = () => "palm-sway";
  const ROOF = { ac: new THREE.MeshLambertMaterial({ color: 0xb8bcc2 }), tank: new THREE.MeshLambertMaterial({ color: 0x7a5236 }), pad: null, stack: new THREE.MeshLambertMaterial({ color: 0x8a8e94 }) };
  ROOF.pad = new THREE.MeshLambertMaterial({ map: (() => { const c = mkc(128, 128), x = c.getContext("2d"); x.fillStyle = "#3a3d44"; x.beginPath(); x.arc(64, 64, 62, 0, TAU); x.fill(); x.strokeStyle = "#f0d375"; x.lineWidth = 6; x.beginPath(); x.arc(64, 64, 50, 0, TAU); x.stroke(); x.fillStyle = "#f2f2f2"; x.font = "900 64px Arial"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("H", 64, 68); return tex(c, false); })(), transparent: true });
  let SIGNS = null; const signMats = () => SIGNS || (SIGNS = ["HOTEL", "LOFTS", "DINER", "TACOS", "PHARMACY", "PLAZA"].map(w => new THREE.MeshBasicMaterial({ map: textTex(w, ["#ff5a5a", "#f0d375", "#7ee0ff", "#ffffff"][w.length % 4], 512, 128, "900 86px Arial,sans-serif"), transparent: true, toneMapped: false, side: THREE.DoubleSide })));

  /* ---------- shared geometry ---------- */
  const box = new THREE.BoxGeometry(1, 1, 1).translate(0, .5, 0);
  // bullet scorch / char marks on facades (soft dark-brown discs), shared by all buildings
  const scorchG = new THREE.PlaneGeometry(1, 1), scorchM = new THREE.MeshBasicMaterial({ map: (() => { const c = mkc(64, 64), x = c.getContext("2d"), g = x.createRadialGradient(32, 32, 2, 32, 32, 31); g.addColorStop(0, "rgba(12,8,6,.95)"); g.addColorStop(.45, "rgba(30,20,14,.75)"); g.addColorStop(1, "rgba(40,30,22,0)"); x.fillStyle = g; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); return t; })(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const SHV = new THREE.Vector3(), SHN = new THREE.Vector3(); let FIREN = 0;
  const merge = (parts) => { const pos = [], nor = [], uv = []; parts.forEach(([g, m]) => { const q = (g.index ? g.toNonIndexed() : g.clone()).applyMatrix4(m); q.computeVertexNormals(); pos.push(...q.attributes.position.array); nor.push(...q.attributes.normal.array); if (q.attributes.uv) uv.push(...q.attributes.uv.array); });
    const o = new THREE.BufferGeometry(); o.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); o.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); if (uv.length === pos.length / 3 * 2) o.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); return o; };
  const T4 = (x, y, z, rx, ry, rz, sx, sy, sz) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0)), new THREE.Vector3(sx || 1, sy || 1, sz || 1));
  // palms: a slightly leaning ringed trunk and a crown of 11 arching fronds (pinnate leaf texture, alpha-tested) that sway in the wind
  const trunkG = (() => { const g = new THREE.CylinderGeometry(.75, 1.45, 34, 8, 8).translate(0, 17, 0), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i), k = y / 34; p.setX(i, p.getX(i) + k * k * 2.2); } g.computeVertexNormals(); return g; })();
  const leafTex = (() => { const c = mkc(64, 256), x = c.getContext("2d"); x.strokeStyle = "#fff"; x.lineCap = "round";
    for (let i = 0; i < 46; i++) { const y = 8 + i * 5.3, L = 26 * Math.sin(Math.min(1, (i + 3) / 46) * Math.PI) + 3; x.lineWidth = 2.6; x.beginPath(); x.moveTo(32, y); x.lineTo(32 - L, y + 10); x.moveTo(32, y); x.lineTo(32 + L, y + 10); x.stroke(); }
    x.lineWidth = 3; x.beginPath(); x.moveTo(32, 0); x.lineTo(32, 256); x.stroke(); const t = new THREE.CanvasTexture(c); return t; })();
  M.leaf.alphaMap = leafTex;
  const crownG = (() => { const parts = []; for (let i = 0; i < 11; i++) { const g = new THREE.PlaneGeometry(5, 17, 1, 8), p = g.attributes.position;
      for (let k = 0; k < p.count; k++) { const v = (p.getY(k) + 8.5) / 17, x0 = p.getX(k); p.setXYZ(k, x0 * (1 - v * .35), Math.sin(v * 1.9) * 4.5 - v * v * 9, v * 16); }   // arch out, then droop
      g.computeVertexNormals(); parts.push([g, T4(2.2, 34, 0, -.08 * (i % 3), i / 11 * TAU + (i % 2) * .2, 0)]); }
    const o = new THREE.BufferGeometry(), pos = [], nor = [], uv = [], idx = []; let base = 0;
    parts.forEach(([g, m]) => { const q = g.clone().applyMatrix4(m); pos.push(...q.attributes.position.array); nor.push(...q.attributes.normal.array); uv.push(...q.attributes.uv.array); for (const k of q.index.array) idx.push(k + base); base += q.attributes.position.count; });
    o.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); o.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); o.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); o.setIndex(idx); return o; })();
  const carG = (() => { const c = buildCars(THREE).find(k => k.name === "midsize-sedan"); const g = c.geo.clone(); g.scale(3.3, 3.3, 3.3); g.deleteAttribute("_part"); return g; })();   // the simple loop's cars: a real-proportioned sedan (engine3d/carmodels.js), painted per instance
  const lampG = new THREE.BoxGeometry(1.5, 1, .5);
  const poolG = new THREE.PlaneGeometry(9, 26).rotateX(-Math.PI / 2).translate(0, .35, 20);
  const bodyG = new THREE.CapsuleGeometry(1.5, 3.4, 3, 8).translate(0, 3.2, 0), headG = new THREE.SphereGeometry(1.25, 8, 6).translate(0, 7.5, 0);
  const Q = new THREE.Matrix4(), QP = new THREE.Vector3(), QQ = new THREE.Quaternion(), QS = new THREE.Vector3(), QE = new THREE.Euler(), QC = new THREE.Color();
  const set = (im, i, x, y, z, ry, sx, sy, sz) => { QP.set(x, y, z); QQ.setFromEuler(QE.set(0, ry || 0, 0)); QS.set(sx || 1, sy || 1, sz || 1); im.setMatrixAt(i, Q.compose(QP, QQ, QS)); };
  const inst = (g, m, n, col) => { const im = new THREE.InstancedMesh(g, m, Math.max(1, n)); im.count = n; if (col) im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, n) * 3), 3); im.frustumCulled = false; return im; };
  const mesh = (g, m, x, y, z) => { const o = new THREE.Mesh(g, m); o.position.set(x || 0, y || 0, z || 0); return o; };
  const CAR_COLS = ["#e9e9ea", "#1d1f24", "#9aa1ab", "#7b1f2a", "#25467a", "#c9b48a", "#3e4148", "#f2f2ee", "#a8322f", "#5c6b54"];
  const SKIN = ["#4a2e22", "#5e3a28", "#7a4a32", "#8d5a3b", "#a46c48", "#6b4430", "#3a241b", "#b07a52"];
  const CLOTH = ["#111318", "#d4af37", "#77242e", "#f2efe8", "#2c4a7a", "#e46b83", "#3e6b4a", "#a33645", "#f0d375", "#5a5f6b"];

  /* ---------- the Melody logo (real artwork) in gold, and the review cover ---------- */
  const logoTex = (() => { const c = mkc(600, 300), x = c.getContext("2d"), t = tex(c, false); const i = new Image();
    i.onload = () => { x.clearRect(0, 0, 600, 300); x.drawImage(i, 10, 10, 580, 280 * Math.min(1, (580 * i.naturalHeight / i.naturalWidth) / 280)); x.globalCompositeOperation = "source-in"; const g = x.createLinearGradient(0, 0, 0, 300); g.addColorStop(0, "#fff1b8"); g.addColorStop(.5, "#f0c24a"); g.addColorStop(1, "#c8901c"); x.fillStyle = g; x.fillRect(0, 0, 600, 300); t.needsUpdate = true; };
    i.src = BASE + "img/logo.png"; return t; })();
  const coverTex = img("img/review/cover.webp");
  const plateTex = (() => { const c = mkc(256, 128), x = c.getContext("2d"); x.fillStyle = "#f4f4f0"; x.fillRect(0, 0, 256, 128); x.strokeStyle = "#1b2a6b"; x.lineWidth = 8; x.strokeRect(4, 4, 248, 120);
    x.fillStyle = "#b3262e"; x.font = "italic 700 26px Georgia,serif"; x.textAlign = "center"; x.fillText("California", 128, 34); x.fillStyle = "#1b2a6b"; x.font = "900 54px Arial,sans-serif"; x.fillText("ANTIDOTE", 128, 98); return tex(c, false); })();
  const tagTex = (() => { const c = mkc(512, 96), x = c.getContext("2d"); x.font = "800 52px Arial,sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.lineWidth = 8; x.strokeStyle = "rgba(10,12,20,.9)"; x.strokeText("@therealantidote", 256, 50); x.fillStyle = "#f0d375"; x.fillText("@therealantidote", 256, 50); return tex(c, false); })();
  const textTex = (txt, col, w, h, font) => { const c = mkc(w || 512, h || 128), x = c.getContext("2d"); x.font = font || "900 80px Arial,sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillStyle = col; x.fillText(txt, c.width / 2, c.height / 2 + 4); return tex(c, false); };

  /* ---------- world-level: wind (the air moves past you), debris chunks, the clock ---------- */
  const FX = O.fx || null, root = new THREE.Group(), wind = new THREE.Vector3();
  const DN = 160, debrisM = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial(), DN); debrisM.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(DN * 3), 3); debrisM.frustumCulled = false; debrisM.count = DN; root.add(debrisM);
  const DB = Array.from({ length: DN }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), vr: new THREE.Vector3(), s: 0, life: 0 })); let dbi = 0;
  const DQ = new THREE.Quaternion(), DS = new THREE.Vector3(), DM = new THREE.Matrix4(), ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < DN; i++) debrisM.setMatrixAt(i, ZERO);
  function debris(p, n, col, sp, sz) { for (let i = 0; i < n; i++) { const d = DB[dbi = (dbi + 1) % DN]; d.p.copy(p); d.v.set((Math.random() - .5) * sp, Math.random() * sp * .6, (Math.random() - .5) * sp).add(wind); d.r.set(Math.random() * 6, Math.random() * 6, 0); d.vr.set(Math.random() * 8, Math.random() * 8, Math.random() * 8); d.s = (2 + Math.random() * 4.5) * (sz || 1); d.life = sz ? 3.6 : 2.6;
    debrisM.setColorAt(dbi, QC.set(col || (Math.random() < .5 ? "#8b8680" : "#5d5a56"))); } debrisM.instanceColor.needsUpdate = true; }
  // the digital billboards playing Antidote's Melody review (one shared muted, inline, looping video; poster if autoplay is blocked)
  let VB = null; const vboards = () => VB || (VB = makeVideoBoards(THREE, { src: BASE + "img/review/billboard.mp4", poster: BASE + "img/review/billboard.jpg" }));
  // the review billboard shows up about once per 2 minutes of flight (O.clock = seconds flown); the first one ~1 minute in.
  // The Venice pier board counts toward the same budget. Warm-up strips (o.warm) always get one so its shader is compiled early.
  // Sides alternate (left, right, left…); boards are never back to back (≥ 120 s of flight apart, so two are never on screen together).
  let bbLast = O.bbFirst != null ? O.bbFirst : -BB_GAP_S * .6, bbSide = 1, WARM = false;
  const bbDue = (side) => { if (WARM) return side || 1; const t = O.clock ? O.clock() : performance.now() / 1000; if (t - bbLast < (O.bbGap || BB_GAP_S)) return 0;
    if (side && side !== bbSide) return 0;   // a fixed-side board (the pier) only when it's that side's turn
    bbLast = t; const s = bbSide; bbSide = -bbSide; return s; };
  const boardsAll = [];
  function billboard(group, x, z, ry, sc) { if (O.noVideo) return null; try { return billboard0(group, x, z, ry, sc); } catch (e) { O.noVideo = 1; console.warn("[world3d] video billboard off:", e); return null; } }
  function billboard0(group, x, z, ry, sc) { const b = vboards().create({ w: 64 * (sc || 1), pole: 44, caption: "ANTIDOTE FOOD REVIEW · antidotethefoodie.com" }); b.position.set(x, 0, z); b.rotation.y = ry || 0; group.add(b); if (!WARM) { boardsAll.push(b); if (boardsAll.length > 3) boardsAll.shift(); } return b; }
  function tick(dt, t) { UT.value = t; FIREN = 0; if (VB) VB.update(t); toppleTick(dt); for (let i = 0; i < DN; i++) { const d = DB[i]; if (d.life <= 0) continue; d.life -= dt; d.v.y -= 160 * dt; d.p.addScaledVector(d.v, dt); if (d.p.y < .8) { d.p.y = .8; if (Math.abs(d.v.y) > 25) { d.v.y = -d.v.y * .35; d.v.x *= .5; d.v.z *= .5; d.vr.multiplyScalar(.5); } else { d.v.set(wind.x, 0, wind.z); d.vr.set(0, 0, 0); } }   // chunks bounce once or twice, then rest
      d.r.x += d.vr.x * dt; d.r.y += d.vr.y * dt; d.r.z += d.vr.z * dt; DQ.setFromEuler(d.r); const s = d.life > 0 ? d.s : 0; debrisM.setMatrixAt(i, DM.compose(d.p, DQ, DS.set(s, s * .6, s * .8))); if (d.life <= 0) debrisM.setMatrixAt(i, ZERO); }
    debrisM.instanceMatrix.needsUpdate = true; }
  const SMV = new THREE.Vector3(), SMP = new THREE.Vector3(), GPV = new THREE.Vector3();
  function puff(p, kind, k, dk) { if (!FX) return; k = k || 1;   // kind: "steam" (kitchen), "smoke" (fire), "fire"
    if (kind === "fire") FX.emit(p, SMV.set(wind.x * .9 + (Math.random() - .5) * 6, 10 + Math.random() * 8, wind.z * .9 + (Math.random() - .5) * 6), .45, 6 * k, 2 * k, [1, .82, .35], [1, .25, .05], 1, true, 0, 0, 20);
    else if (kind === "dust") FX.emit(p, SMV.set(wind.x + (Math.random() - .5) * 40, 6 + Math.random() * 10, wind.z + (Math.random() - .5) * 40), 3.4, 10 * k, 48 * k, [.62, .58, .52], [.5, .48, .45], .55, false, 0, .9, 2);
    else if (kind === "smoke") { const d = dk == null ? 1 : dk, c0 = .46 - .3 * d, c1 = .3 - .22 * d; FX.emit(p, SMV.set(wind.x + (Math.random() - .5) * 6, 14 + Math.random() * 6, wind.z + (Math.random() - .5) * 6), 3.2, 6 * k, 30 * k, [c0 * 1.04, c0, c0 * .96], [c1, c1, c1], .62 + .2 * d, false, 0, .3, 4); }   // light grey at first, black and thick when it's burning badly
    else FX.emit(p, SMV.set(wind.x + (Math.random() - .5) * 4, 12 + Math.random() * 5, wind.z + (Math.random() - .5) * 4), 2.6, 3 * k, 16 * k, [.86, .85, .84], [.6, .6, .62], .45, false, 0, .4, 3); }

  /* ---------- pieces ---------- */
  function cars(seg, R, n, len, lanes) {   // n cars on the given lanes; each lane: [axis "z"|"x", coord, dir]
    const body = inst(carG, M.car, n, true), lamps = inst(lampG, M.lamp, n * 4, true), pools = inst(poolG, M.pool, n), list = [];
    for (let i = 0; i < n; i++) { const L = lanes[(R() * lanes.length) | 0], sp = 38 + R() * 46; list.push({ L, sp, ph: R() * 5000 });
      body.instanceColor.setXYZ(i, ...QC.set(CAR_COLS[(R() * CAR_COLS.length) | 0]).toArray());
      for (let j = 0; j < 4; j++) lamps.instanceColor.setXYZ(i * 4 + j, ...(j < 2 ? [1.6, 1.45, 1.1] : [1.6, .12, .1])); }
    seg.group.add(body, lamps, pools);
    seg.tick.push((t) => { for (let i = 0; i < n; i++) { const c = list[i], L = c.L, span = L[0] === "z" ? len : XW * .9, s = ((c.ph + t * c.sp) % span) - span / 2, d = L[2], ry = L[0] === "z" ? (d > 0 ? 0 : Math.PI) : (d > 0 ? Math.PI / 2 : -Math.PI / 2);
      const x = L[0] === "z" ? L[1] : s * d, z = L[0] === "z" ? s * d : L[1]; set(body, i, x, 0, z, ry); set(pools, i, x, 0, z, ry);
      const fx = Math.sin(ry), fz = Math.cos(ry); for (let j = 0; j < 4; j++) { const f = j < 2 ? 7.9 : -7.9, sd = (j % 2 ? 1 : -1) * 2.3; set(lamps, i * 4 + j, x + fx * f + fz * sd, 2.4, z + fz * f - fx * sd, ry); } }
      body.instanceMatrix.needsUpdate = lamps.instanceMatrix.needsUpdate = pools.instanceMatrix.needsUpdate = true; });
  }
  function palms(seg, R, spots) { const tr = inst(trunkG, M.trunk, spots.length), cr = inst(crownG, M.leaf, spots.length);
    spots.forEach((p, i) => { const s = .8 + R() * .5, ry = R() * TAU; set(tr, i, p[0], 0, p[1], ry, s, s, s); set(cr, i, p[0], 0, p[1], ry, s, s, s); }); seg.group.add(tr, cr); }
  // a building's top section toppling off after a wreck hits it (pooled; one box with the facade texture, pivoting on a roof edge)
  const TOP = [], topM = new THREE.MeshLambertMaterial({ map: winTex[0], color: 0x9a948c });
  for (let i = 0; i < 4; i++) { const pv = new THREE.Group(), b = new THREE.Mesh(box, topM); b.castShadow = true; pv.add(b); pv.visible = false; root.add(pv); TOP.push({ pv, b, t: -1 }); }
  function topple(x, y, z, w, h, d, side) { const T = TOP.find(q => q.t < 0) || TOP[0]; T.t = 0; T.side = side; T.h = h; T.y0 = y; T.pv.visible = true; T.pv.position.set(x + side * w / 2, y, z); T.pv.rotation.set(0, 0, 0); T.b.scale.set(w, h, d); T.b.position.set(-side * w / 2, 0, 0); T.w = w; T.d = d; }
  function toppleTick(dt) { for (const T of TOP) { if (T.t < 0) continue; T.t += dt; const u = T.t;
      T.pv.rotation.z = -T.side * Math.min(1.45, u * u * 1.1); if (u > 1.1) T.pv.position.y = Math.max(-T.h, T.y0 - (u - 1.1) * (u - 1.1) * 260);
      if (FX && u > .3 && Math.random() < dt * 30) puff(SMP.set(T.pv.position.x, T.pv.position.y + 4, T.pv.position.z), "dust", 2);
      if (u > 1.1 && !T.landed && T.pv.position.y < T.y0 * .5) { T.landed = 1; debris(T.pv.position.clone(), 18, null, 140, 1.6); for (let i = 0; i < 10; i++) puff(SMP.set(T.pv.position.x + (Math.random() - .5) * T.w, 3, T.pv.position.z + (Math.random() - .5) * T.d), "dust", 3); }
      if (u > 3.2) { T.t = -1; T.landed = 0; T.pv.visible = false; } } }
  function buildings(seg, R, lots, opt) {   // lots: [x, z, w, d, h]
    opt = opt || {}; const n = lots.length, geo = box.clone(), dmg = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, n)), 1); geo.setAttribute("aDmg", dmg);
    const vr = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, n)), 1); geo.setAttribute("aVar", vr);
    const im = new THREE.InstancedMesh(geo, [M.facade, M.facade, M.roof, M.roof, M.facade, M.facade], Math.max(1, n)); im.count = n; im.frustumCulled = false;
    im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, n) * 3), 3);
    const TINT = ["#efe6d8", "#b9b0a4", "#9fa9b4", "#d8c4ac", "#8e949b", "#e9e0d4", "#c4a986", "#a08f7c", "#7d8691", "#cfd6dc"];
    const L = lots.map((b, i) => ({ i, x: b[0], z: b[1], w: b[2], d: b[3], h: b[4], h0: b[4], dmg: 0, props: [], fires: [], vent: null }));
    L.forEach(o => { set(im, o.i, o.x, 0, o.z, 0, o.w, o.h, o.d); const v = FAC.pick(R, o.h); vr.setX(o.i, v); im.instanceColor.setXYZ(o.i, ...QC.set(FAC.tint(R, v)).toArray()); });
    // roof edges: a parapet wall round every roof (4 thin walls per building, one instanced draw) + stair/lift houses on many
    const para = inst(box, ROOF0.para, n * 4), house = [];
    L.forEach(o => { if (!opt.plain && o.h > 24 && R() < .5) house.push([o, (R() - .5) * o.w * .3, (R() - .5) * o.d * .3, .18 + R() * .14, 4 + R() * 3]); });
    const hsM = inst(box, ROOF0.house, house.length);
    seg.group.add(im);
    // rooftop kit: AC units on most, a water tank on some, antennas (blinking red) on the tall ones, helipads on the biggest, a few signs, kitchen stacks
    const ac = [], tank = [], ant = [], pad = [], stk = [], signs = [], sol = [], wh = [];
    L.forEach(o => { if (opt.plain) return;
      const k = 1 + (R() * 3 | 0); for (let j = 0; j < k; j++) ac.push([o, (R() - .5) * o.w * .6, (R() - .5) * o.d * .6, 3 + R() * 3]);
      if (R() < .22 && o.w > 26) tank.push([o, (R() - .5) * o.w * .4, (R() - .5) * o.d * .4]);
      if (o.h > 60 && R() < .55) ant.push([o, (R() - .5) * o.w * .5, (R() - .5) * o.d * .5, 14 + R() * 22]);
      else if (o.w > 48 && o.d > 48 && R() < .16) pad.push([o]);
      else if (o.h < 46 && R() < .2) { stk.push([o, (R() - .5) * o.w * .5, (R() - .5) * o.d * .5]); }
      if (o.h < 70 && o.w > 24 && R() < .3) sol.push([o, (R() - .5) * o.w * .3, (R() - .5) * o.d * .3]); if (R() < .35) wh.push([o, (R() - .5) * o.w * .6, (R() - .5) * o.d * .6]);   // solar panels, water heaters
      if (R() < .06 && signs.length < 2) signs.push([o, (R() * 6) | 0]); });
    const acM = inst(new THREE.BoxGeometry(1, 1, 1).translate(0, .5, 0), ROOF.ac, ac.length), tkM = inst(merge([[new THREE.CylinderGeometry(4, 4, 7, 10), T4(0, 9.5, 0)], [new THREE.ConeGeometry(4.4, 3, 10), T4(0, 14.5, 0)], [new THREE.BoxGeometry(6, 6, .6), T4(0, 3, 0)], [new THREE.BoxGeometry(.6, 6, 6), T4(0, 3, 0)]]), ROOF.tank, tank.length);
    const anM = inst(new THREE.CylinderGeometry(.35, .6, 1, 5).translate(0, .5, 0), M.dark, ant.length), anL = inst(new THREE.SphereGeometry(1.3, 6, 4), M.lamp, ant.length, true), pdM = inst(new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2), ROOF.pad, pad.length);
    const solM = inst(new THREE.BoxGeometry(1, .6, 1).translate(0, .8, 0), ROOF0.solar, sol.length), whM = inst(new THREE.CylinderGeometry(1.4, 1.4, 4.5, 8).translate(0, 2.25, 0), ROOF0.heater, wh.length);
    const stM = inst(merge([[new THREE.CylinderGeometry(1.4, 1.6, 9, 8), T4(0, 4.5, 0)], [new THREE.CylinderGeometry(2.2, 2.2, 1.2, 8), T4(0, 9.6, 0)]]), ROOF.stack, stk.length);
    const place = () => { ac.forEach((a, j) => set(acM, j, a[0].x + a[1], a[0].h, a[0].z + a[2], 0, a[3] * 1.5, a[3], a[3] * 1.2)); tank.forEach((a, j) => set(tkM, j, a[0].x + a[1], a[0].h, a[0].z + a[2], 0));
      ant.forEach((a, j) => { set(anM, j, a[0].x + a[1], a[0].h, a[0].z + a[2], 0, 1, a[3], 1); set(anL, j, a[0].x + a[1], a[0].h + a[3], a[0].z + a[2], 0); });
      pad.forEach((a, j) => set(pdM, j, a[0].x, a[0].h + .3, a[0].z, 0, Math.min(a[0].w, a[0].d) * .4, 1, Math.min(a[0].w, a[0].d) * .4)); stk.forEach((a, j) => set(stM, j, a[0].x + a[1], a[0].h, a[0].z + a[2], 0));
      L.forEach(o => { const t = Math.min(1.4, o.w * .04), ph = o.wrecked ? .01 : 2.2; set(para, o.i * 4, o.x, o.h, o.z - o.d / 2 + t / 2, 0, o.w, ph, t); set(para, o.i * 4 + 1, o.x, o.h, o.z + o.d / 2 - t / 2, 0, o.w, ph, t);
        set(para, o.i * 4 + 2, o.x - o.w / 2 + t / 2, o.h, o.z, 0, t, ph, o.d); set(para, o.i * 4 + 3, o.x + o.w / 2 - t / 2, o.h, o.z, 0, t, ph, o.d); });
      sol.forEach((a, j) => set(solM, j, a[0].x + a[1], a[0].h, a[0].z + a[2], .2, a[0].w * .38, 1, a[0].d * .3)); wh.forEach((a, j) => set(whM, j, a[0].x + a[1], a[0].h, a[0].z + a[2], 0));
      house.forEach((a, j) => set(hsM, j, a[0].x + a[1], a[0].h, a[0].z + a[2], 0, a[0].w * a[3], a[0].wrecked ? .01 : a[4], a[0].d * a[3]));
      [acM, tkM, anM, anL, pdM, stM, para, hsM, solM, whM].forEach(m => m.instanceMatrix.needsUpdate = true); };
    place(); seg.group.add(acM, tkM, anM, anL, pdM, stM, para, hsM, solM, whM);
    signs.forEach(([o, w]) => { const sg = mesh(new THREE.PlaneGeometry(o.w * .8, o.w * .2), signMats()[w], o.x, o.h + o.w * .12, o.z + o.d * .3); seg.group.add(sg); o.sign = sg; });
    seg.tick.push((t, dt, near) => { const on = (t % 1.3) < .45; ant.forEach((a, j) => anL.instanceColor.setXYZ(j, on ? 2 : .25, on ? .08 : .02, on ? .06 : .02)); if (ant.length) anL.instanceColor.needsUpdate = true;
      if (!near || !FX) return; const gp = seg.group.getWorldPosition(GPV);
      stk.forEach(a => { if (a[0].h < a[0].h0 - 1) return; if (Math.random() < dt * 3) puff(SMP.set(gp.x + a[0].x + a[1], a[0].h + 11, gp.z + a[0].z + a[2]), "steam", 1); });
      const cap = O.fireCap ? O.fireCap() : 12;   // active fire/smoke columns per frame (Smooth: 4)
      const cz = O.camZ ? O.camZ() : 1e9; L.forEach(o => o.fires.forEach(f => { if (FIREN >= cap || gp.z + f[2] > cz - 40) return; FIREN++; const P = SMP.set(gp.x + f[0], f[1], gp.z + f[2]);   /* (fires behind the camera don't use up the budget) */
        const kf = .9 + f[3]; if (Math.random() < dt * (6 + 8 * f[3])) puff(P, "smoke", kf * (.9 + o.dmg * .8), o.dmg); if (Math.random() < dt * (16 + 16 * f[3])) puff(SHV.set(P.x + (Math.random() - .5) * 6, P.y + (Math.random() - .5) * 4, P.z), "fire", kf * 1.3);
        if (FX && FX.glow) FX.glow(P, 6 + 6 * f[3], [1, .5, .15], .55 + .3 * Math.random()); })); });
    const SCN = 28, scM = new THREE.InstancedMesh(scorchG, scorchM, SCN); scM.count = 0; scM.frustumCulled = false; scM.renderOrder = 2; seg.group.add(scM); let scI = 0;
    const scorch = (x, y, z, r) => { set(scM, scI % SCN, x, y, z, 0, r, r, 1); scI++; scM.count = Math.min(SCN, scI); scM.instanceMatrix.needsUpdate = true; };
    const B = { L, im, dmg,
      // the closest standing building to a world point (for falling wrecks that steer into one), or null
      nearest(wx, wz, maxD) { const gp = seg.group.getWorldPosition(GPV); let best = null, bd = maxD * maxD;
        for (const o of L) { if (o.h < 16) continue; const dx = gp.x + o.x - wx, dz = gp.z + o.z - wz, dd = dx * dx + dz * dz; if (dd < bd) { bd = dd; best = { x: gp.x + o.x, y: o.h, z: gp.z + o.z, o, B }; } } return best; },
      // the building under/at a world point (plane or shot), or null
      hit(wx, wy, wz, rx, rz) { const gp = seg.group.getWorldPosition(GPV), lx = wx - gp.x, lz = wz - gp.z;
        for (const o of L) if (Math.abs(lx - o.x) < o.w / 2 + rx && Math.abs(lz - o.z) < o.d / 2 + rz && wy < o.h + 2) return o; return null; },
      // knock the top off down to `to` (world y) where it was hit: debris falls, windows there go dark, the hole burns
      smash(o, wx, wy, wz, how) { if (how === "wreck") return B.wreck(o, wx, wy, wz);
        if (how === "shot") {   // a bullet strike: sparks + dust + a scorch mark right where it hit; sustained hits light fires there
          const gp = seg.group.getWorldPosition(GPV), lx = Math.max(o.x - o.w / 2, Math.min(o.x + o.w / 2, wx - gp.x)), ly = Math.max(2, Math.min(o.h - 1, wy)), lz = o.z + o.d / 2 + .35;   // the face toward you
          const W3 = SHV.set(gp.x + lx, ly, gp.z + lz); if (FX && FX.sparks) FX.sparks(W3, SHN.set(0, .2, 1), null, .9, 8); if (Math.random() < .5) puff(W3, "dust", .35);
          scorch(lx, ly, lz, 3 + Math.random() * 3 + o.dmg * 4);
          o.hits = (o.hits || 0) + 1; o.dmg = Math.min(1, o.dmg + .05); dmg.setX(o.i, o.dmg); dmg.needsUpdate = true;
          const want = Math.min(5, Math.ceil(o.hits / 2)); let near = null, nd = 1e9; for (const f of o.fires) { const d = Math.hypot(f[0] - lx, f[1] - ly); if (d < nd) { nd = d; near = f; } }
          if (o.fires.length < want && (!near || nd > 10)) o.fires.push([lx, ly, lz + .6, .7]); else if (near) near[3] = Math.min(1.9, near[3] + .1);
          return o; }
        const gp = seg.group.getWorldPosition(GPV), plane = how === "plane", to = plane ? Math.max(6, wy - 18) : Math.max(6, o.h - 4);
        const P = SMP.set(Math.max(o.x - o.w / 2, Math.min(o.x + o.w / 2, wx - gp.x)), Math.min(o.h, wy), Math.max(o.z - o.d / 2, Math.min(o.z + o.d / 2, wz - gp.z)));
        debris(new THREE.Vector3(gp.x + P.x, P.y, gp.z + P.z), plane ? 22 : 5, null, plane ? 120 : 60);
        if (plane || o.h - to > 0) { o.h = to; set(im, o.i, o.x, 0, o.z, 0, o.w, o.h, o.d); im.instanceMatrix.needsUpdate = true; place(); if (o.sign) o.sign.visible = false; }
        o.dmg = Math.min(1, o.dmg + (plane ? .65 : .12)); dmg.setX(o.i, o.dmg); dmg.needsUpdate = true;
        if (o.fires.length < 3) o.fires.push([P.x, o.h + 1, P.z, plane ? 1.4 : .8]); else o.fires.forEach(f => { f[1] = o.h + 1; f[3] = Math.min(1.8, f[3] + .1); });
        for (let i = 0; i < (plane ? 10 : 3); i++) puff(new THREE.Vector3(gp.x + P.x, P.y, gp.z + P.z), i % 2 ? "fire" : "smoke", plane ? 1.6 : 1); return o; },
      // a falling wreck smashes into it: fireball, wall/roof/glass chunks flying, the top section topples off, dust rolls out,
      // the windows go dark, the hole keeps burning (and the broken shell stays as it is while it's on screen)
      wreck(o, wx, wy, wz) { const gp = seg.group.getWorldPosition(GPV), q = O.fxScale ? O.fxScale() : 1, old = o.h, to = Math.max(8, Math.min(old - 10, old * (.3 + R() * .2)));
        const cx = gp.x + o.x, cz = gp.z + o.z, hitP = new THREE.Vector3(Math.max(cx - o.w / 2, Math.min(cx + o.w / 2, wx)), Math.min(old, Math.max(to, wy)), Math.max(cz - o.d / 2, Math.min(cz + o.d / 2, wz)));
        if (FX && FX.boom) FX.boom(hitP, 2.4);
        debris(hitP, Math.round(30 * q), null, 160, 1.5); debris(hitP, Math.round(14 * q), "#9fc4dc", 190, .7);   // concrete + wall chunks, glass
        if (old - to > 6) topple(cx, to, cz, o.w * .96, old - to, o.d * .96, wx < cx ? 1 : -1);
        o.h = to; set(im, o.i, o.x, 0, o.z, 0, o.w, o.h, o.d); im.instanceMatrix.needsUpdate = true; place(); if (o.sign) o.sign.visible = false;
        o.dmg = 1; dmg.setX(o.i, 1); dmg.needsUpdate = true; o.wrecked = 1;
        o.fires = [[o.x, o.h + 1, o.z, 1.8], [o.x - o.w * .25, o.h + 1, o.z + o.d * .2, 1.3], [o.x + o.w * .2, o.h + 1, o.z - o.d * .2, 1.2]];
        for (let i = 0; i < Math.round(16 * q) + 4; i++) puff(SMP.set(cx + (Math.random() - .5) * o.w * 1.4, 2 + Math.random() * 6, cz + (Math.random() - .5) * o.d * 1.4), "dust", 2.2);   // the dust cloud rolling out at street level
        return { y: to, x: hitP.x, z: hitP.z }; } };
    (seg.blds = seg.blds || []).push(B); return B; }

  /* ---------- people: one shaped figure (legs, torso, arms, head, hair) instanced per crowd; the vertex shader animates it
     (walk, stand, lie, swim, sit, surf stance), the instance picks shirt / pants / skin / hair colours. One draw call a crowd. ---------- */
  const PERSON = (() => { const parts = [];
    const P = (geo, part, m) => { const q = (geo.index ? geo.toNonIndexed() : geo).applyMatrix4(m); const n = q.attributes.position.count; q.setAttribute("aPart", new THREE.Float32BufferAttribute(new Float32Array(n).fill(part), 1)); parts.push(q); };
    for (const sx of [-1, 1]) P(new THREE.CapsuleGeometry(.52, 3.2, 3, 8), sx < 0 ? 1 : 2, T4(sx * .62, 2.05, 0));                          // legs (pants)
    P(new THREE.CapsuleGeometry(1.0, 1.0, 3, 10), 0, T4(0, 3.95, 0, 0, 0, 0, 1.12, 1, .8));                                                // hips (pants colour via shirt? no: part 0 = shirt)
    P(new THREE.CapsuleGeometry(1.05, 1.9, 4, 12), 0, T4(0, 5.35, 0, 0, 0, 0, 1.08, 1, .72));                                               // torso
    for (const sx of [-1, 1]) P(new THREE.CapsuleGeometry(.36, 2.5, 3, 8), sx < 0 ? 3 : 4, T4(sx * 1.48, 4.95, 0, 0, 0, sx * .08));       // arms
    P(new THREE.CylinderGeometry(.38, .42, .7, 8), 5, T4(0, 6.85, 0));                                                                       // neck
    P(new THREE.SphereGeometry(.92, 14, 10), 5, T4(0, 7.75, .05, 0, 0, 0, .92, 1.05, 1));                                                     // head
    P(new THREE.SphereGeometry(.98, 14, 8, 0, TAU, 0, Math.PI * .56), 6, T4(0, 7.9, -.08));                                                  // hair
    const pos = [], nor = [], prt = []; parts.forEach(q => { q.computeVertexNormals(); pos.push(...q.attributes.position.array); nor.push(...q.attributes.normal.array); prt.push(...q.attributes.aPart.array); });
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute("aPart", new THREE.Float32BufferAttribute(prt, 1));
    g.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(pos.length).fill(1), 3)); return g; })();
  const crowdM = new THREE.MeshLambertMaterial({ vertexColors: true });
  crowdM.onBeforeCompile = (sh) => { sh.uniforms.uT = UT;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", `#include <common>
      uniform float uT; attribute float aPart; attribute vec3 aShirt; attribute vec3 aPants; attribute vec3 aSkin; attribute vec3 aHair; attribute vec2 aAnim;
      mat3 rotX(float a){ float c = cos(a), s = sin(a); return mat3(1., 0., 0., 0., c, s, 0., -s, c); }
      mat3 rotZ(float a){ float c = cos(a), s = sin(a); return mat3(c, s, 0., -s, c, 0., 0., 0., 1.); }`)
    .replace("#include <begin_vertex>", `#include <begin_vertex>
      { float mode = aAnim.x, ph = aAnim.y, sw = sin(uT * 6.5 + ph), walk = mode == 1. ? 1. : 0., swim = mode == 3. ? 1. : 0., sit = mode == 4. ? 1. : 0., surf = mode == 6. ? 1. : 0., idle = mode == 0. ? 1. : 0.;
        vec3 hip = vec3(0., 3.75, 0.), sho = vec3(0., 6.25, 0.);
        if (aPart == 1.) transformed = hip + rotX(sw * .6 * walk - 1.45 * sit + .25 * surf) * (transformed - hip);
        if (aPart == 2.) transformed = hip + rotX(-sw * .6 * walk - 1.45 * sit - .25 * surf) * (transformed - hip);
        float idleArm = idle * .06 * sin(uT * 1.7 + ph);
        if (aPart == 3.) transformed = sho + rotZ(-1.15 * surf) * rotX(-sw * .5 * walk + swim * (uT * 3.6 + ph) + idleArm) * (transformed - sho);
        if (aPart == 4.) transformed = sho + rotZ(1.15 * surf) * rotX(sw * .5 * walk + swim * (uT * 3.6 + ph + 3.14) - idleArm) * (transformed - sho);
        if (surf > .5) { transformed = rotX(.18) * transformed; transformed.y -= .6; }
        transformed.y -= 1.9 * sit;
        if (mode == 2. || swim > .5) { transformed = rotX(-1.5708) * transformed; transformed.y += .9; }
        if (walk > .5) transformed.y += abs(sw) * .25; }`)
    .replace("#include <color_vertex>", `#include <color_vertex>
      vColor.rgb = aPart < .5 ? aShirt : (aPart < 2.5 ? aPants : (aPart < 5.5 ? aSkin : aHair));`); };
  crowdM.customProgramCacheKey = () => "crowd-v1";
  const HAIR = ["#141012", "#1c1512", "#2a1c14", "#0e0c0c", "#3a2618", "#4a3020", "#151515", "#5a3a22"];
  const PANTS = ["#1f2a44", "#2b2f36", "#111318", "#5a4a36", "#3b4b6b", "#7a6a52", "#f2efe8", "#2a3550"];
  // spots: [x, z, ry]; o: { mode 0 stand · 1 walk · 2 lie · 3 swim · 4 sit · 6 surf, shirt: fn(R)|hex, y, skin }
  // engine3d crowd (real rigged humans) when the page provided one; the primitive figures below stay as the WebGL1 / no-engine fallback
  const getE = () => (O.crowd ? O.crowd() : null), RAIN = O.rain || { v: 0 };
  function crowdE(E, group, R, spots, o, seg) { const C = BEACH.makeCrowdE(E, group), MODE = { 0: "stand", 1: "walk", 2: "lie", 3: "swim", 4: "sitChair", 6: "surf" };
    spots.forEach(p => { const sec = p[3] === 0, kind = o.kind || (sec ? "street" : "street"); const c = C.add(kind, R, { x: p[0], y: o.y || 0, z: p[1], ry: p[2], pose: MODE[p[4] != null ? p[4] : (o.mode || 0)] || "stand" });
      if (sec) { const L = c.p.look; L.top = [.05, .05, .06, 3]; L.bot = [.04, .04, .05, 3]; L._pk = null; c.idle = "idle2"; }
      if (o.walkX) { const x0 = p[0], sp = (8 + R() * 6) * (p[2] > 0 ? 1 : -1), span = o.walkX; c.tick = (cc, t) => { cc.x = ((x0 + t * sp - o.walkX0 + span * 50) % span) + o.walkX0; cc.ry = sp > 0 ? Math.PI / 2 : -Math.PI / 2; }; } });
    if (seg) { (seg.crowds = seg.crowds || []).push(C); seg.tick.push((t, dt, near) => C.update(t, dt, near)); }
    return { im: null, n: spots.length, set() {}, mode() {}, done() {}, C }; }
  function crowd(group, R, spots, o, seg) { o = o || {}; const E = getE(); if (E && seg) return crowdE(E, group, R, spots, o, seg); const n = Math.max(1, spots.length), g = PERSON.clone();
    const A3 = (k) => { const a = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3); g.setAttribute(k, a); return a; };
    const sh = A3("aShirt"), pa = A3("aPants"), sk = A3("aSkin"), ha = A3("aHair"), an = new THREE.InstancedBufferAttribute(new Float32Array(n * 2), 2); g.setAttribute("aAnim", an);
    const im = new THREE.InstancedMesh(g, crowdM, n); im.count = spots.length; im.frustumCulled = false; group.add(im);
    const skins = o.skin || SKIN;
    spots.forEach((p, i) => { const pick = (a) => a[(R() * a.length) | 0];
      const shirt = p[3] === 0 ? "#111318" : typeof o.shirt === "function" ? o.shirt(R, i) : o.shirt || pick(CLOTH), skin = pick(skins);
      sh.setXYZ(i, ...QC.set(shirt === "skin" ? skin : shirt).toArray()); pa.setXYZ(i, ...QC.set(p[3] === 0 ? "#111318" : o.pants ? (typeof o.pants === "function" ? o.pants(R, i) : o.pants) : pick(PANTS)).toArray());
      sk.setXYZ(i, ...QC.set(skin).toArray()); ha.setXYZ(i, ...QC.set(pick(HAIR)).toArray()); an.setXY(i, p[4] != null ? p[4] : (o.mode || 0), R() * 6);
      set(im, i, p[0], o.y || 0, p[1], p[2], .95 + R() * .18, .95 + R() * .18, .95 + R() * .18); });
    return { im, n: spots.length, set: (i, x, y, z, ry, s) => set(im, i, x, y, z, ry, s || 1, s || 1, s || 1), mode: (i, m) => { an.setX(i, m); an.needsUpdate = true; }, done: () => { im.instanceMatrix.needsUpdate = true; } }; }

  function people(seg, R, spots, anim, o) {   // spots: [x, z, ry, outfit|-1 (0 = all black: security)]
    const c = crowd(seg.group, R, spots, o || {}, seg), base = spots.map(p => [p[0], p[1], p[2], R() * 6]);   // standing guests: a little weight shifting + turning
    if (c.C) return c;
    if (anim) seg.tick.push((t, dt, near) => { if (!near) return; base.forEach((p, i) => c.set(i, p[0], (o && o.y) || 0, p[1], p[2] + Math.sin(t * .7 + p[3]) * .25)); c.done(); });
    return c; }
  function streetLamps(seg, spots) { const g = merge([[new THREE.CylinderGeometry(.5, .7, 26, 5), T4(0, 13, 0)], [new THREE.BoxGeometry(6, .6, 1.2), T4(-3, 26, 0)]]), p = inst(g, M.dark, spots.length), bulbs = inst(new THREE.SphereGeometry(1.2, 6, 4), M.lamp, spots.length, true), pl = inst(new THREE.PlaneGeometry(26, 26).rotateX(-Math.PI / 2), M.pool, spots.length);
    spots.forEach((s, i) => { set(p, i, s[0], 0, s[1], s[2]); const ox = -Math.cos(s[2]) * 6, oz = Math.sin(s[2]) * 6; set(bulbs, i, s[0] + ox, 25.4, s[1] + oz, 0); bulbs.instanceColor.setXYZ(i, 1.7, 1.4, .9); set(pl, i, s[0] + ox, .4, s[1] + oz, 0); }); seg.group.add(p, bulbs, pl); }

  // cross streets of a strip, where the ground texture draws them (tile edges, counted from the strip's +z end)
  const streetsOf = (len) => { const a = []; for (let z = len / 2; z > -len / 2; z -= CZ) if (Math.abs(z) < len / 2 - 20) a.push(z); return a; };
  /* ---------- the city block strip (base for most segments) ---------- */
  function city(seg, R, len, o) {
    const g = new THREE.PlaneGeometry(XW, len).rotateX(-Math.PI / 2), uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * XW - XW / 2 + 160) / CX, (uv.getY(i) * len) / CZ);
    seg.group.add(mesh(g, M.ground));
    const lots = [], tall = o.tall || 0, clear = (o.clear || []).slice(), palmSpots = [], lampSpots = [];
    // a review billboard beside the flight path on most city strips (in the lot between the 1st and 2nd avenue)
    let sd0; if (!o.noBillboard && (sd0 = bbDue())) { const sd = sd0, bx = sd * (196 + R() * 26), bz = (R() - .5) * len * .45; clear.push([bx, bz, 90, 60]); billboard(seg.group, bx, bz, -sd * .28); }
    const free = (x, z, w, d) => !clear.some(c => Math.abs(x - c[0]) < (w + c[2]) / 2 && Math.abs(z - c[1]) < (d + c[3]) / 2);
    for (let ax = 0; ax < AVE.length - 1; ax++) { const x0 = AVE[ax] + ROAD / 2 + SIDE + 4, x1 = AVE[ax + 1] - ROAD / 2 - SIDE - 4;
      for (let z0 = -len / 2 + ROAD / 2 + SIDE + 4; z0 < len / 2 - 40; z0 += CZ) { const z1 = Math.min(len / 2 - 6, z0 + CZ - ROAD - 2 * SIDE - 8);
        const nx = 2 + (R() * 2 | 0), nz = 1 + (R() * 2 | 0), bw = (x1 - x0) / nx, bd = (z1 - z0) / nz;
        for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { if (R() < .14) continue; const w = bw * (.62 + R() * .3), d = bd * (.6 + R() * .32), x = x0 + bw * (i + .5), z = z0 + bd * (j + .5);
          if (!free(x, z, w, d)) continue; const inField = Math.abs(x) < 240, hmax = tall ? (inField ? 104 : 250) : (inField ? 62 : 96);   // lower skyline: you cruise above it, dive to hit the tall ones
          lots.push([x, z, w, d, 12 + Math.pow(R(), 1.9) * hmax]); } } }
    buildings(seg, R, lots);
    for (const ax of AVE) for (let z = -len / 2 + 30; z < len / 2; z += 52) { for (const sd of [-1, 1]) { const x = ax + sd * (ROAD / 2 + 4); if (free(x, z, 6, 6) && R() < .8) palmSpots.push([x, z]); } }
    palms(seg, R, palmSpots);
    for (const ax of [-160, 160]) for (let z = -len / 2 + 60; z < len / 2; z += 115) lampSpots.push([ax + ROAD / 2 + 2, z, 0], [ax - ROAD / 2 - 2, z + 57, Math.PI]);
    streetLamps(seg, lampSpots.filter(s => Math.abs(s[1]) < len / 2 - 4));
    // pedestrians on the sidewalks (engine3d crowd only): walkers both ways along every avenue, a few people chatting by the corners
    const E = getE(); if (E && !o.noPeds) { const dens = O.density ? O.density() : 1, C = BEACH.makeCrowdE(E, seg.group), half = ROAD / 2 + SIDE / 2;
      for (const ax of AVE) for (const sd of [-1, 1]) { const n = Math.round((2 + R() * 3) * dens); for (let i = 0; i < n; i++) { const z0 = (R() - .5) * len, sp = (7 + R() * 5) * (R() < .5 ? 1 : -1), x = ax + sd * (half + (R() - .5) * 4);
          C.add("street", R, { x, z: z0, ry: sp > 0 ? 0 : Math.PI, pose: "walk", tick: (c, t) => { c.z = ((z0 + t * sp + len * 50) % len) - len / 2; } }); }
        if (R() < .5 * dens) { const z = (Math.floor(R() * (len / CZ)) - .5) * CZ * .5, x = ax + sd * (half + 1); for (let k = 0; k < 2 + (R() * 2 | 0); k++) C.add("street", R, { x: x + (R() - .5) * 5, z: z + (R() - .5) * 6, ry: R() * TAU, pose: "stand" }); } }
      (seg.crowds = seg.crowds || []).push(C); seg.tick.push((t, dt, near) => C.update(t, dt, near)); }
    // traffic: engine3d/traffic.js (signals, stops, turns, brake lights, crossing pedestrians) when the page has it, else the simple loop
    const TR = !o.noTraffic && O.traffic && O.traffic();
    if (TR) { const net = TR.network(seg.group, { avenues: AVE, streets: streetsOf(len), len, width: XW * .9, road: ROAD, lane: 8, cars: (o.cars || 30) * 1.9, parked: o.parked != null ? o.parked : 22, parkedAt: o.parkedAt, crowd: getE(), pedestrians: 12, rng: R });
      (seg.nets = seg.nets || []).push(net); }
    else { const lanes = []; for (const ax of AVE) lanes.push(["z", ax - 8, 1], ["z", ax + 8, -1]);
      for (let z = -len / 2; z < len / 2; z += CZ) if (Math.abs(z) < len / 2 - 20) lanes.push(["x", z + 8, 1], ["x", z - 8, -1]);
      cars(seg, R, o.cars || 30, len, lanes); }
  }

  /* ---------- landmarks ---------- */
  // Melody faces a cross street: its front wall sits on the sidewalk line of the street nearest the strip's middle
  function melodyZ(len) { const st = streetsOf(len); let z = st[0]; for (const q of st) if (Math.abs(q - 20) < Math.abs(z - 20)) z = q;
    const front = z - ROAD / 2 - SIDE, BD = 96;
    return { street: z, front, cz: front - BD / 2, parked: (side) => [0, 1, 2, 3].map(i => [side * (-40 + i * 34) + (i > 1 ? side * 40 : 0), z - ROAD / 2 + 4, Math.PI / 2 * (i % 2 ? 1 : -1) * 0 - Math.PI / 2]) }; }
  const brickTex = (() => { const c = mkc(256, 256), x = c.getContext("2d"), R = rng(31); x.fillStyle = "#4a2025"; x.fillRect(0, 0, 256, 256);
    for (let r = 0; r < 32; r++) for (let q = 0; q < 9; q++) { const o = r % 2 ? 14 : 0, v = 70 + R() * 40; x.fillStyle = `rgb(${v + 30 | 0},${v * .42 | 0},${v * .45 | 0})`; x.fillRect(q * 30 + o - 14, r * 8 + 1, 28, 6); }
    return tex(c, true); })();
  const interiorTex = (() => { const c = mkc(512, 256), x = c.getContext("2d"), g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, "#3a1d12"); g.addColorStop(.5, "#a0552a"); g.addColorStop(1, "#2a140c"); x.fillStyle = g; x.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 9; i++) { const px = 30 + i * 56, gr = x.createRadialGradient(px, 40, 0, px, 40, 46); gr.addColorStop(0, "rgba(255,214,140,.95)"); gr.addColorStop(1, "rgba(255,214,140,0)"); x.fillStyle = gr; x.fillRect(px - 50, 0, 100, 110); }   // pendant lights
    x.fillStyle = "#1c0f0a"; x.fillRect(0, 150, 512, 40); x.fillStyle = "#d4af37"; x.fillRect(0, 148, 512, 3);   // the bar counter + brass rail
    for (let i = 0; i < 70; i++) { x.fillStyle = ["#7ec8e3", "#f0d375", "#a33645", "#e8e2d0", "#3e6b4a"][i % 5]; x.fillRect(8 + i * 7.2, 104 + (i % 3) * 2, 3, 14 + (i % 4) * 3); }   // bottles on the back bar
    const R = rng(77); for (let i = 0; i < 16; i++) { const px = R() * 512, h = 50 + R() * 26; x.fillStyle = "rgba(20,10,8,.85)"; x.beginPath(); x.arc(px, 256 - h - 10, 9, 0, TAU); x.fill(); x.fillRect(px - 11, 256 - h, 22, h); }   // guests in silhouette
    for (let i = 0; i < 3; i++) { x.fillStyle = "#0b2a4a"; x.fillRect(60 + i * 160, 60, 70, 40); x.fillStyle = "#3f8a3a"; x.fillRect(64 + i * 160, 64, 62, 32); }   // TVs (a game on)
    return tex(c, false); })();
  const signTextTex = (txt, w, h, size, col) => { const c = mkc(w, h), x = c.getContext("2d"); x.fillStyle = "#14080a"; x.fillRect(0, 0, w, h); x.font = `800 ${size}px Georgia, 'Times New Roman', serif`; x.textAlign = "center"; x.textBaseline = "middle";
    x.shadowColor = col; x.shadowBlur = size * .35; x.fillStyle = col; x.fillText(txt, w / 2, h / 2 + 2); return tex(c, false); };
  function melody(seg, R, len, side, mz) {   // Melody Bar & Grill: brick building, real gold logo, glass storefront with the bar inside, doors that open, sconces, the line, the guard
    const BW = 150, BD = 96, BH = 34, cx = side * 64, cz = mz.cz, gp = new THREE.Group(); gp.position.set(cx, 0, cz); seg.group.add(gp);
    const brick = new THREE.MeshStandardMaterial({ map: brickTex, roughness: .82, metalness: 0 }); brickTex.repeat.set(5, 1.4);
    gp.add(mesh(new THREE.BoxGeometry(BW, BH, BD).translate(0, BH / 2, 0), brick));
    gp.add(mesh(new THREE.BoxGeometry(BW + 4, 3, BD + 4).translate(0, BH + 1.5, 0), M.gold));                                     // gold cornice
    const roofSign = mesh(new THREE.PlaneGeometry(128, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: logoTex, transparent: true, depthWrite: false, toneMapped: false }), 0, BH + 3.2, 0); gp.add(roofSign);
    const front = new THREE.Group(); front.position.set(0, 0, BD / 2); gp.add(front);
    // raised sign board with the real gold logo, framed, lit by two gooseneck lamps
    front.add(mesh(new THREE.BoxGeometry(96, 30, 3).translate(0, 44, 1.5), M.dark)); front.add(mesh(new THREE.BoxGeometry(100, 33, 1.5).translate(0, 44, 0), M.gold));
    const fs = mesh(new THREE.PlaneGeometry(84, 28), new THREE.MeshBasicMaterial({ map: logoTex, transparent: true, toneMapped: false }), 0, 44, 3.2); front.add(fs);
    // storefront: dark brass mullions, reflective glass over a lit bar interior (two bays either side of the door)
    const interior = new THREE.MeshBasicMaterial({ map: interiorTex, toneMapped: false, color: new THREE.Color(1.5, 1.5, 1.5) }), glass = new THREE.MeshPhysicalMaterial({ color: 0x0a0f14, roughness: .04, metalness: 0, clearcoat: 1, transparent: true, opacity: .18, envMapIntensity: 1.6, depthWrite: false });
    for (const sx of [-1, 1]) { const bx = sx * 44; front.add(mesh(new THREE.PlaneGeometry(56, 17), interior, bx, 11.5, .25)); const gl = mesh(new THREE.PlaneGeometry(56, 17), glass, bx, 11.5, .55); gl.renderOrder = 3; front.add(gl);
      front.add(mesh(merge([[new THREE.BoxGeometry(58, 1.2, 1.2), T4(0, 20.6, .9)], [new THREE.BoxGeometry(58, 1.4, 1.4), T4(0, 2.6, .9)], [new THREE.BoxGeometry(1, 18, 1.2), T4(-28.5, 11.5, .9)], [new THREE.BoxGeometry(1, 18, 1.2), T4(28.5, 11.5, .9)], [new THREE.BoxGeometry(.8, 18, 1), T4(-9.5, 11.5, .9)], [new THREE.BoxGeometry(.8, 18, 1), T4(9.5, 11.5, .9)]]), M.gold, bx, 0, 0)); }
    // the door: a lit vestibule and two glass leaves on hinges (they swing open as guests go in and out)
    const dx = side * 20 * 0; front.add(mesh(new THREE.PlaneGeometry(16, 17), new THREE.MeshBasicMaterial({ color: 0xc8823e, toneMapped: false }), dx, 8.5, .2));
    const leaves = [-1, 1].map(sd => { const hinge = new THREE.Group(); hinge.position.set(dx + sd * 8, 0, .6); front.add(hinge);
      const leaf = mesh(new THREE.BoxGeometry(7.8, 16.4, .5).translate(-sd * 3.9, 8.4, 0), new THREE.MeshPhysicalMaterial({ color: 0x1a120c, roughness: .1, transparent: true, opacity: .55, clearcoat: 1, envMapIntensity: 1.4 })); hinge.add(leaf);
      hinge.add(mesh(new THREE.BoxGeometry(.5, 6, .7).translate(-sd * 6.6, 9, .5), M.gold)); return hinge; });
    // awning with the name (MELODY_SIGN_TEXT), wall sconces, marquee bulbs around the sign board, uplights
    const awn = mesh(new THREE.BoxGeometry(46, 2.6, 14).translate(0, 19.4, 7), M.wine); front.add(awn);
    const awT = mesh(new THREE.PlaneGeometry(44, 2.4), new THREE.MeshBasicMaterial({ map: signTextTex(MELODY_SIGN_TEXT, 1024, 56, 40, "#f0d375"), toneMapped: false }), 0, 19.4, 14.05); front.add(awT);
    const blade = mesh(new THREE.BoxGeometry(1.2, 22, 9).translate(0, 0, 0), M.dark, side * -72, 30, 6); front.add(blade);
    [-1, 1].forEach(f => { const bt = mesh(new THREE.PlaneGeometry(8, 20), new THREE.MeshBasicMaterial({ map: signTextTex("MELODY", 128, 320, 0, "#f0d375"), toneMapped: false }), side * -72 + f * .65, 30, 6); bt.rotation.y = f * Math.PI / 2;
      const c2 = mkc(96, 320), x2 = c2.getContext("2d"); x2.fillStyle = "#14080a"; x2.fillRect(0, 0, 96, 320); x2.font = "900 54px Georgia,serif"; x2.textAlign = "center"; x2.fillStyle = "#f0d375"; x2.shadowColor = "#f0d375"; x2.shadowBlur = 16; "MELODY".split("").forEach((ch, i) => x2.fillText(ch, 48, 52 + i * 50)); bt.material.map = tex(c2, false); front.add(bt); });
    const sconces = [[-30, 24], [30, 24], [-74, 24], [74, 24], [-12, 21], [12, 21]], scM = inst(new THREE.CylinderGeometry(1, .6, 2.4, 8), M.lamp, sconces.length, true);
    sconces.forEach((p, i) => { set(scM, i, p[0], p[1], 1.6, 0); scM.instanceColor.setXYZ(i, 2, 1.6, 1); }); front.add(scM);
    const bulbs2 = []; for (let i = 0; i <= 24; i++) { const u = i / 24; bulbs2.push([-50 + u * 100, 61.5], [-50 + u * 100, 26.5]); } for (let i = 1; i < 8; i++) { const u = i / 8; bulbs2.push([-50, 26.5 + u * 35], [50, 26.5 + u * 35]); }
    const mq = inst(new THREE.SphereGeometry(.8, 6, 4), M.lamp, bulbs2.length, true); bulbs2.forEach((b, i) => { set(mq, i, b[0], b[1], 1.2, 0); }); front.add(mq);
    const washes = mesh(new THREE.PlaneGeometry(BW + 6, 50), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffb060, opacity: .25, toneMapped: false }), 0, 22, 1.2); front.add(washes);
    const sidewalkGlow = mesh(new THREE.PlaneGeometry(130, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffb860, opacity: .35, toneMapped: false }), 0, .5, 14); front.add(sidewalkGlow);
    // gold stanchions + rope along the curb side of the sidewalk
    const n = 12, lineX = (i) => cx + dx + side * (16 + i * 8.4), lineZ = cz + BD / 2 + 4.6;
    const st = inst(new THREE.CylinderGeometry(.5, .5, 6, 5).translate(0, 3, 0), M.gold, n + 1); for (let i = 0; i <= n; i++) set(st, i, cx + dx + side * (12 + i * 8.4), 0, cz + BD / 2 + 8.4, 0); seg.group.add(st);
    seg.group.add(mesh(new THREE.BoxGeometry(n * 8.4, .6, .6).translate(0, 5, 0), M.wine, cx + dx + side * (12 + n * 4.2), 0, cz + BD / 2 + 8.4));
    // the people: engine3d crowd (talk / phone / text / laugh while they wait; the line moves up; guests go in, others come out)
    const E = getE(); let lineState = null;
    if (E) { const C = BEACH.makeCrowdE(E, seg.group), q = [], VIBE = ["talk", "phone", "laugh", "text", "idle", "talk", "idle2", "laugh"];
      const mk = (i) => { const c = C.add("street", R, { x: lineX(i), z: lineZ + (i % 2) * 1.2, ry: side > 0 ? -Math.PI / 2 : Math.PI / 2, pose: "stand" }); c.idle = VIBE[(R() * VIBE.length) | 0]; c.slot = i; c.tx = c.x; c.tz = c.z; return c; };
      for (let i = 0; i < n; i++) q.push(mk(i));
      const guard = C.add("street", R, { x: cx + dx - side * 10, z: lineZ - 1, ry: 0, pose: "stand" }); guard.idle = "idle2"; { const L = guard.p.look; L.top = [.04, .04, .05, 3]; L.bot = [.03, .03, .04, 3]; L._pk = null; }
      const goers = []; let nextIn = 4 + R() * 3, nextOut = 7 + R() * 6, doorOpen = 0;
      // walkers: move toward (tx, tz) at their pace, then hold their idle
      const walkTo = (c, x, z, sp) => { c.tx = x; c.tz = z; c.sp = sp || 11; };
      C.list.forEach(c => { c.tick = (cc, t, dt) => { const dX = cc.tx - cc.x, dZ = cc.tz - cc.z, d = Math.hypot(dX, dZ);
        if (d > .4) { const k = Math.min(1, (cc.sp || 11) * dt / d); cc.x += dX * k; cc.z += dZ * k; cc.pose = "walk"; cc.ry = Math.atan2(dX, dZ); } else if (cc.pose === "walk") { cc.pose = "stand"; cc.ry = cc === guard ? 0 : side > 0 ? -Math.PI / 2 : Math.PI / 2; } }; });
      seg.tick.push((t, dt, near) => { if (!near) { C.update(t, dt, false); return; }
        nextIn -= dt; nextOut -= dt; doorOpen = Math.max(0, doorOpen - dt);
        if (nextIn <= 0 && q.length) { const g0 = q.shift(); walkTo(g0, cx + dx, cz + BD / 2 + 1.5, 9); g0.inside = true; goers.push(g0);   // the front of the line goes in
          q.forEach((c, i) => { c.slot = i; walkTo(c, lineX(i), lineZ + (i % 2) * 1.2, 6); });
          const nc = q.length < n ? (() => { const c = mk(n - 1); c.x = lineX(n + 8); c.tx = c.x; walkTo(c, lineX(q.length), lineZ + (q.length % 2) * 1.2, 10); c.tick = C.list[0].tick; return c; })() : null; if (nc) q.push(nc);   // a newcomer joins the back
          nextIn = 7 + R() * 6; }
        for (let i = goers.length - 1; i >= 0; i--) { const c = goers[i]; if (Math.hypot(c.x - (cx + dx), c.z - (cz + BD / 2 + 1.5)) < 1.2) { doorOpen = 1.4; if (c.inside) { c.p.visible = false; C.list.splice(C.list.indexOf(c), 1); E.remove(c.p); goers.splice(i, 1); } } }
        if (nextOut <= 0) { const c = C.add("street", R, { x: cx + dx, z: cz + BD / 2 - 1, ry: 0, pose: "stand" }); c.idle = "talk"; c.tick = C.list[0].tick; walkTo(c, cx + dx - side * 160, cz + BD / 2 + 6, 10); c.leaving = 1; doorOpen = 1.4; nextOut = 9 + R() * 8; }
        C.list.forEach(c => { if (c.leaving && Math.abs(c.x - c.tx) < 1) { c.p.visible = false; E.remove(c.p); C.list.splice(C.list.indexOf(c), 1); } });
        const open = Math.min(1, doorOpen * 2); leaves.forEach((h, k) => { h.rotation.y += ((k ? -1 : 1) * open * 1.25 - h.rotation.y) * Math.min(1, dt * 8); });
        C.update(t, dt, near); });
      (seg.crowds = seg.crowds || []).push(C); lineState = { q, guard };
    } else {   // no engine crowd (WebGL1): the primitive figures, as before
      const sp = []; for (let i = 0; i < n; i++) sp.push([lineX(i), lineZ + (i % 2) * 1.5, side > 0 ? -Math.PI / 2 : Math.PI / 2, -1]); sp.push([cx + dx - side * 10, lineZ - 1, Math.PI, 0]); people(seg, R, sp, true); }
    // back patio on the field side: deck, umbrellas, tables, string lights in swags, seated guests
    const px = cx - side * (BW / 2 + 48), pg = new THREE.Group(); pg.position.set(px, 0, cz); seg.group.add(pg);
    pg.add(mesh(new THREE.BoxGeometry(92, 1.4, 92).translate(0, .7, 0), M.wood));
    const fence = merge([[new THREE.BoxGeometry(92, 6, 1), T4(0, 3, 46)], [new THREE.BoxGeometry(92, 6, 1), T4(0, 3, -46)], [new THREE.BoxGeometry(1, 6, 92), T4(-side * 46, 3, 0)]]); pg.add(mesh(fence, M.wine));
    const umb = inst(new THREE.ConeGeometry(9, 4, 8).translate(0, 12, 0), M.gold, 6), pole = inst(new THREE.CylinderGeometry(.4, .4, 12, 4).translate(0, 6, 0), M.dark, 6), tb = inst(new THREE.CylinderGeometry(4, 4, 1, 10).translate(0, 5, 0), M.white, 6);
    for (let i = 0; i < 6; i++) { const x = ((i % 3) - 1) * 28, z = ((i / 3 | 0) - .5) * 40; [umb, pole, tb].forEach(m => set(m, i, x, 0, z, 0)); } pg.add(umb, pole, tb);
    const bulbs = [], posts = [[-40, -40], [40, -40], [40, 40], [-40, 40]];
    pg.add(mesh(merge(posts.map(p => [new THREE.CylinderGeometry(.6, .6, 22, 5), T4(p[0], 11, p[1])])), M.dark));
    const swag = (a, b) => { for (let k = 1; k < 14; k++) { const u = k / 14; bulbs.push([a[0] + (b[0] - a[0]) * u, 22 - Math.sin(u * Math.PI) * 6, a[1] + (b[1] - a[1]) * u]); } };
    swag(posts[0], posts[2]); swag(posts[1], posts[3]); swag(posts[0], posts[1]); swag(posts[2], posts[3]);
    const bl = inst(new THREE.SphereGeometry(.9, 6, 4), M.lamp, bulbs.length, true); bulbs.forEach((b, i) => { set(bl, i, b[0], b[1], b[2], 0); bl.instanceColor.setXYZ(i, 1.8, 1.35, .7); }); pg.add(bl);
    const glow = mesh(new THREE.PlaneGeometry(110, 110).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffb060, opacity: .5, toneMapped: false }), 0, 1.6, 0); pg.add(glow);
    const guests = []; for (let i = 0; i < 6; i++) { const x = ((i % 3) - 1) * 28, z = ((i / 3 | 0) - .5) * 40; guests.push([px + x - 5, cz + z, Math.PI / 2, -1, 4], [px + x + 5, cz + z, -Math.PI / 2, -1, 4]); }
    for (let i = 0; i < 4; i++) guests.push([px + (R() - .5) * 70, cz + (R() - .5) * 70, R() * TAU, -1]);
    if (E) crowd(seg.group, R, guests.map(g => [g[0], g[1], g[2], -1, g[4] != null ? g[4] : 0]), { kind: "street", y: 1.4 }, seg); else people(seg, R, guests, true);
    seg.tick.push((t, dt, near) => { if (near && FX && Math.random() < dt * 2.5) puff(SMP.set(seg.group.position.x + cx - side * 40, BH + 10, seg.group.position.z + cz - 20), "steam", 1.2);   // Melody's kitchen
      const twinkle = (t * 6 | 0) % 3; for (let i = 0; i < bulbs2.length; i++) { const on = (i + twinkle) % 3 !== 0 ? 1.9 : .5; mq.instanceColor.setXYZ(i, on, on * .78, on * .42); } mq.instanceColor.needsUpdate = true; });
    gp.add(mesh(merge([[new THREE.CylinderGeometry(1.8, 2, 9, 8), T4(-side * 40, BH + 4.5, -20)], [new THREE.CylinderGeometry(2.6, 2.6, 1.2, 8), T4(-side * 40, BH + 9.6, -20)]]), ROOF.stack, 0, 0, 0));
    // two searchlights sweeping the sky over the roof
    const beams = [-1, 1].map(s2 => { const b = mesh(new THREE.CylinderGeometry(9, 1.5, 260, 12, 1, true).translate(0, 130, 0), M.beam, cx + s2 * 50, BH, cz - 30); seg.group.add(b); return b; });
    seg.tick.push((t) => { beams.forEach((b, i) => { b.rotation.set(.35 * Math.sin(t * .7 + i * 2), 0, .4 * Math.cos(t * .5 + i)); }); glow.material.opacity = .42 + .08 * Math.sin(t * 3); });
    seg.melody = { x: cx, z: cz, front: cz + BD / 2, line: lineState };
  }
  function egg(seg, R, len, side) {   // Antidote's Easter egg: a roadside screen with his Melody review + a white electric sedan with his plate
    const ax = side * 160, sx = ax + side * (ROAD / 2 + 26), gp = new THREE.Group(); gp.position.set(sx, 0, -len * .12); seg.group.add(gp);
    gp.add(mesh(merge([[new THREE.CylinderGeometry(1.2, 1.4, 44, 6), T4(-26, 22, 0)], [new THREE.CylinderGeometry(1.2, 1.4, 44, 6), T4(26, 22, 0)]]), M.dark));
    const scr = new THREE.Group(); scr.position.set(0, 62, 0); scr.rotation.x = -.32; gp.add(scr);
    scr.add(mesh(new THREE.BoxGeometry(76, 46, 3), M.dark)); scr.add(mesh(new THREE.BoxGeometry(78, 1.6, 3.4).translate(0, 23.5, 0), M.gold)); scr.add(mesh(new THREE.BoxGeometry(78, 1.6, 3.4).translate(0, -23.5, 0), M.gold));
    const screen = mesh(new THREE.PlaneGeometry(72, 40.5), new THREE.MeshBasicMaterial({ map: coverTex, toneMapped: false }), 0, 0, 1.6); scr.add(screen);
    const halo = mesh(new THREE.PlaneGeometry(130, 90), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffd7a0, opacity: .35, toneMapped: false }), 0, 0, -.5); scr.add(halo);
    // the sedan: smooth white body, black glass roof, ANTIDOTE plate, a tiny @therealantidote on the roof (only readable from above)
    const car = new THREE.Group(), body = new THREE.MeshStandardMaterial({ color: 0xf7f7f5, roughness: .22, metalness: .35 });
    const shell = new THREE.CapsuleGeometry(3.6, 10, 4, 12).rotateX(Math.PI / 2); shell.scale(1, .42, 1); car.add(mesh(shell, body, 0, 2.6, 0));
    const cabin = new THREE.SphereGeometry(3.2, 14, 8, 0, TAU, 0, Math.PI / 2); cabin.scale(1, .62, 2); car.add(mesh(cabin, M.glass, 0, 3.6, -.6));
    const plate = mesh(new THREE.PlaneGeometry(3.4, 1.7), new THREE.MeshBasicMaterial({ map: plateTex, toneMapped: false }), 0, 2.4, -8.62); plate.rotation.y = Math.PI; car.add(plate);
    const plate2 = plate.clone(); plate2.position.z = 8.62; plate2.rotation.y = 0; car.add(plate2);
    const tag = mesh(new THREE.PlaneGeometry(8.5, 1.6).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tagTex, transparent: true, toneMapped: false }), 0, 5.65, -.6); car.add(tag);
    const lights = inst(lampG, M.lamp, 4, true); [[-2.4, 8.3, 0], [2.4, 8.3, 0], [-2.4, -8.3, 1], [2.4, -8.3, 1]].forEach((l, i) => { set(lights, i, l[0], 2.6, l[1], 0); lights.instanceColor.setXYZ(i, ...(l[2] ? [1.7, .1, .1] : [1.7, 1.6, 1.4])); }); car.add(lights);
    const pool = mesh(poolG, M.pool); car.add(pool);
    const wh = inst(new THREE.CylinderGeometry(1.5, 1.5, 1, 10).rotateZ(Math.PI / 2), M.dark, 4); [[-3.4, 5], [3.4, 5], [-3.4, -5], [3.4, -5]].forEach((p, i) => set(wh, i, p[0], 1.5, p[1], 0)); car.add(wh);
    const ring = mesh(new THREE.RingGeometry(9, 12, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xf0d375, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), 0, .5, 0); car.add(ring);   // a faint gold ring: findable, not loud
    car.scale.setScalar(1.6); seg.group.add(car);
    const lane = ax - 8, dir = 1;   // drives toward you (the +z lane of that avenue), right past the screen
    seg.egg = { x: lane, z: 0, car, screen: scr };
    seg.tick.push((t) => { const s = ((t * 34) % (len * .9)) - len * .45; car.position.set(lane, 0, s * dir); car.rotation.y = dir > 0 ? 0 : Math.PI; seg.egg.z = car.position.z; ring.material.opacity = .35 + .25 * Math.sin(t * 4); });
  }
  function runway(seg, R, len, o) {   // LAX-style runway with approach lights; the game draws its own animated runway texture on top when it has one
    seg.group.add(mesh(new THREE.PlaneGeometry(XW, len).rotateX(-Math.PI / 2), M.grass));
    if (!o.noStrip) { seg.group.add(mesh(new THREE.PlaneGeometry(240, len).rotateX(-Math.PI / 2).translate(0, .2, 0), new THREE.MeshLambertMaterial({ color: 0x33363c })));
      const marks = []; for (let z = -len / 2 + 30; z < len / 2 - 30; z += 44) marks.push([new THREE.PlaneGeometry(4, 24).rotateX(-Math.PI / 2), T4(0, .3, z)]); seg.group.add(mesh(merge(marks), M.white)); }
    const L = []; for (let z = -len / 2; z < len / 2; z += 26) for (const sx of [-124, 124]) L.push([sx, z, 0]); for (let z = -len / 2; z < len / 2; z += 34) for (const sx of [-250, 250]) L.push([sx, z, 2]);
    const im = inst(new THREE.SphereGeometry(1.6, 5, 4), M.lamp, L.length, true); L.forEach((p, i) => { set(im, i, p[0], 1, p[1], 0); im.instanceColor.setXYZ(i, ...(p[2] ? [.3, .6, 2] : [1.8, 1.7, 1.4])); }); seg.group.add(im);
    // terminals and hangars along both sides, parked jets as simple shapes
    const lots = []; for (const sd of [-1, 1]) for (let z = -len / 2 + 60; z < len / 2; z += 150) lots.push([sd * (380 + R() * 80), z, 120 + R() * 60, 90, 18 + R() * 14]); buildings(seg, R, lots);
    const lanes = [["z", -300, 1], ["z", 300, -1]]; cars(seg, R, 8, len, lanes);
  }
  function stadium(seg, R, len, side) { city(seg, R, len, { clear: [[side * 40, 0, 330, 300]], cars: 22 });
    const g = new THREE.Group(); g.position.set(side * 40, 0, 0); seg.group.add(g);
    const bowl = new THREE.LatheGeometry([new THREE.Vector2(100, 0), new THREE.Vector2(150, 0), new THREE.Vector2(150, 30), new THREE.Vector2(118, 34), new THREE.Vector2(100, 6)], 40); bowl.scale(1, 1, .75);
    g.add(mesh(bowl, new THREE.MeshLambertMaterial({ color: 0xc9ccd2, side: THREE.DoubleSide })));
    const pitch = new THREE.CircleGeometry(100, 32).rotateX(-Math.PI / 2); pitch.scale(1, 1, .75); g.add(mesh(pitch, new THREE.MeshLambertMaterial({ color: 0x3f8a3a }), 0, 1, 0));
    const lines = []; for (let i = -4; i <= 4; i++) lines.push([new THREE.PlaneGeometry(1.2, 110).rotateX(-Math.PI / 2), T4(i * 18, 1.3, 0, 0, Math.PI / 2, 0)]); g.add(mesh(merge(lines), M.white));
    const roof = new THREE.TorusGeometry(140, 4, 6, 40).rotateX(Math.PI / 2); roof.scale(1, .75, 1); g.add(mesh(roof, M.gold, 0, 40, 0));
    const tw = inst(new THREE.CylinderGeometry(1, 1.4, 70, 5).translate(0, 35, 0), M.dark, 4), lt = inst(new THREE.BoxGeometry(12, 6, 2).translate(0, 70, 0), M.lamp, 4, true);
    [[-150, -112], [150, -112], [-150, 112], [150, 112]].forEach((p, i) => { set(tw, i, p[0], 0, p[1], 0); set(lt, i, p[0], 0, p[1], Math.atan2(p[0], p[1])); lt.instanceColor.setXYZ(i, 2, 2, 1.8); }); g.add(tw, lt); }
  function hills(seg, R, len) {
    const g = new THREE.PlaneGeometry(XW, len, 40, 16).rotateX(-Math.PI / 2), p = g.attributes.position, col = [];
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), h = Math.max(0, (Math.sin(x * .007 + seg.seed) * .5 + .5) * (Math.sin(z * .011 + x * .003) * .5 + .5)) * (Math.abs(x) > 200 ? 110 : 55); p.setY(i, h); const u = h / 110; col.push(.3 + u * .25, .36 + u * .12, .2 + u * .05); }
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); seg.group.add(mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true })));
    const hs = [], pl = []; for (let i = 0; i < 46; i++) { const x = (R() - .5) * XW * .8, z = (R() - .5) * len * .9, h = hAt(g, x, z); hs.push([x, z, 14 + R() * 10, 12 + R() * 8, 8 + R() * 8, h]); if (R() < .7) pl.push([x + 14, z + 8, h]); }
    const im = new THREE.InstancedMesh(box, [M.white, M.white, M.wine, M.wine, M.white, M.white], hs.length); im.frustumCulled = false; hs.forEach((b, i) => set(im, i, b[0], b[5] - 2, b[1], R() * 3, b[2], b[4], b[3])); seg.group.add(im);
    const tr = inst(trunkG, M.trunk, pl.length), cr = inst(crownG, M.leaf, pl.length); pl.forEach((q, i) => { set(tr, i, q[0], q[2] - 1, q[1], R() * 6); set(cr, i, q[0], q[2] - 1, q[1], R() * 6); }); seg.group.add(tr, cr);
    const mast = mesh(new THREE.CylinderGeometry(.8, 2.2, 140, 4).translate(0, 70, 0), M.white, 420, hAt(g, 420, 0), 0); seg.group.add(mast);
    const red = mesh(new THREE.SphereGeometry(2.6, 6, 4), M.lamp.clone(), 420, hAt(g, 420, 0) + 141, 0); red.material.color.setRGB(2, .1, .1); seg.group.add(red);
    seg.tick.push((t) => { red.visible = (t % 1.4) < .7; });
    cars(seg, R, 6, len, [["z", -160, 1], ["z", 160, -1]]);
  }
  function hAt(g, x, z) { const p = g.attributes.position; let best = 0, bd = 1e9; for (let i = 0; i < p.count; i++) { const d = (p.getX(i) - x) ** 2 + (p.getZ(i) - z) ** 2; if (d < bd) { bd = d; best = p.getY(i); } } return best; }
  /* ---------- Venice: the ocean, the beach, the boardwalk, the pier, Nalu Vida ---------- */
  const SHORE = -110;   // segment-local x of the waterline (ocean to the left)
  const SUN = new THREE.Vector3(-.35, .32, -.88).normalize();
  const oceanM = new THREE.ShaderMaterial({ fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { t: { value: 0 }, shore: { value: SHORE }, sunDir: { value: SUN } }]),
    vertexShader: `#include <fog_pars_vertex>
      uniform float t; uniform float shore; varying vec3 vW; varying vec3 vL; varying vec3 vN;
      float wv(vec2 p){ float d = shore - p.x, calm = .35 + .65 * smoothstep(0., 140., d);
        float a = 1.6 * sin(p.x * .05 + t * 1.25) + 1.0 * sin(p.x * .031 - p.y * .022 + t * .9) + .5 * sin(p.x * .13 + p.y * .07 + t * 2.2) + .3 * sin(p.y * .17 - t * 1.7);
        float sw = pow(.5 + .5 * sin((p.x - t * 26.) * .045), 3.) * 3.2 * (1. - smoothstep(30., 300., d) * .5);
        return a * calm + sw * smoothstep(3., 40., d); }
      void main(){ vec3 p = position; float h = wv(p.xz), e = 1.5; vN = normalize(vec3(-(wv(p.xz + vec2(e, 0.)) - h) / e, 1., -(wv(p.xz + vec2(0., e)) - h) / e));
        p.y += h; vL = p; vec4 w = modelMatrix * vec4(p, 1.); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `#include <fog_pars_fragment>
      uniform float t; uniform float shore; uniform vec3 sunDir; varying vec3 vW; varying vec3 vL; varying vec3 vN;
      void main(){ float d = shore - vL.x; vec3 deep = vec3(.03, .15, .23), mid = vec3(.05, .31, .38), shal = vec3(.24, .53, .5);
        vec3 c = mix(shal, mid, smoothstep(4., 70., d)); c = mix(c, deep, smoothstep(70., 460., d));
        vec3 N = normalize(vN), V = normalize(cameraPosition - vW); float fr = pow(1. - max(dot(N, V), 0.), 4.);
        c = mix(c, vec3(.93, .6, .43), fr * .6);
        float sp = pow(max(dot(reflect(-V, N), sunDir), 0.), 110.); c += vec3(1., .8, .52) * sp * 2.4;
        float n = .55 + .45 * sin(vL.z * .09 + sin(vL.z * .021 + t * .3) * 3.) * sin(vL.z * .035 - t * .4);
        float crest = pow(.5 + .5 * sin((vL.x - t * 26.) * .045), 14.);
        float foam = crest * smoothstep(150., 35., d) * smoothstep(0., 12., d) * (.55 + .6 * n);              // breaking waves
        foam += pow(.5 + .5 * sin((vL.x - t * 26.) * .045 - .5), 30.) * smoothstep(110., 20., d) * .5 * n;   // the foam line behind each break
        float wash = 7. + 5. * sin(t * .8 + vL.z * .015) + 3. * sin(vL.z * .05 - t * 1.1);
        foam += smoothstep(wash + 4., wash - 2., d);                                                       // the wash running up the sand
        if (d < wash - 5.) discard;                                                                       // past the wash: dry sand shows
        foam += smoothstep(.75, .98, sin(vL.x * .21 + t * 1.7) * sin(vL.z * .17 - t * 1.3)) * .35 * smoothstep(60., 300., d);   // whitecaps
        c = mix(c, vec3(.96, .93, .88), clamp(foam, 0., 1.));
        gl_FragColor = vec4(c, 1.);
        #include <fog_fragment>
      }` });
  const sandTex = (() => { const c = mkc(256, 256), x = c.getContext("2d"), R = rng(17), g = x.createLinearGradient(0, 0, 256, 0);
    g.addColorStop(0, "#9c8366"); g.addColorStop(.08, "#b99c78"); g.addColorStop(.16, "#dcc39a"); g.addColorStop(1, "#e6d0a8"); x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) { const v = R(); x.fillStyle = v < .5 ? "rgba(120,96,70,.12)" : "rgba(255,248,230,.14)"; x.fillRect(R() * 256, R() * 256, 1 + R() * 2, 1 + R() * 2); }
    for (let i = 0; i < 40; i++) { x.strokeStyle = "rgba(150,124,94,.18)"; x.beginPath(); const y0 = R() * 256; x.moveTo(40, y0); x.bezierCurveTo(100, y0 + 20, 160, y0 - 20, 256, y0 + 10); x.stroke(); }   // footprints / tracks
    const t = tex(c, true); return t; })();
  // sand relief: wind ripples (finer toward the dry sand), footprints and grain, used as a bump map so low sun rakes across it
  const sandBump = (() => { const c = mkc(512, 512), x = c.getContext("2d"), R = rng(23), im = x.createImageData(512, 512), d = im.data;
    for (let j = 0; j < 512; j++) for (let i = 0; i < 512; i++) { const u = i / 512, v = j / 512, w = Math.sin((v * 34 + Math.sin(u * 9 + v * 6) * .9 + Math.sin(u * 23) * .2) * 6.283) * .5 + .5;
      const k = (i * 7 + j * 13) % 17 / 17, val = 110 + w * 80 * Math.min(1, u * 3) + (R() - .5) * 60 * (.4 + k * .6); const o = (j * 512 + i) * 4; d[o] = d[o + 1] = d[o + 2] = val; d[o + 3] = 255; }
    x.putImageData(im, 0, 0); for (let i = 0; i < 160; i++) { const px = R() * 512, py = R() * 512; x.fillStyle = "rgba(40,40,40,.35)"; x.beginPath(); x.ellipse(px, py, 3, 6, R() * 3, 0, TAU); x.fill(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
  const sandMat = new THREE.MeshStandardMaterial({ map: sandTex, bumpMap: sandBump, bumpScale: 2.2, roughness: .96, metalness: 0 });
  const naluTex = img("../nalu-vida/img/logo.png");
  const SURF = ["#f2f2ee", "#f0d375", "#ff7a3a", "#3aa8ff", "#e4566b", "#7ee0b0", "#ffffff"], TOWEL = ["#ff5a6a", "#f0d375", "#3aa8ff", "#7ee0b0", "#ffffff", "#ff9a2e", "#a33645", "#5a4ad8"];
  const BEACH_SKIN = SKIN.concat(["#c68e63", "#e0b48c", "#5e3a28", "#8d5a3b"]);
  const boardG = new THREE.CapsuleGeometry(1.5, 9, 3, 8).rotateX(Math.PI / 2).scale(1, .22, 1).translate(0, .4, 0);
  const lyingG = new THREE.CapsuleGeometry(1.4, 3.6, 3, 8).rotateX(Math.PI / 2).translate(0, 1.3, 0), lyingHead = new THREE.SphereGeometry(1.2, 8, 6).translate(0, 1.4, 3.9);
  const E4 = new THREE.Euler();
  const setE = (im, i, x, y, z, rx, ry, rz, s) => { QP.set(x, y, z); QQ.setFromEuler(E4.set(rx, ry, rz, "YXZ")); QS.set(s || 1, s || 1, s || 1); im.setMatrixAt(i, Q.compose(QP, QQ, QS)); };
  const BEACH = makeBeachKit(THREE, { FX, wind, UT, rng, E: getE, rain: RAIN });
  const H = { mesh, inst, set, setE, merge, T4, TOWEL, SMP, SMV, white: M.white, boardG, get glowTex() { return glowTex; } };
  function coast(seg, R, len, kind) {
    seg.shore = SHORE; seg.water = (wx) => wx - seg.group.position.x < SHORE;
    const sg = new THREE.PlaneGeometry(260, len).rotateX(-Math.PI / 2), su = sg.attributes.uv; for (let i = 0; i < su.count; i++) su.setY(i, su.getY(i) * len / 256);
    seg.group.add(mesh(sg, sandMat, SHORE + 130 - 12, -.4, 0));
    seg.group.add(mesh(new THREE.PlaneGeometry(26, len).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x8a8580 }), 133, .2, 0));   // the boardwalk
    seg.group.add(mesh(new THREE.PlaneGeometry(260, len).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x56544f }), 280, .1, 0));
    const cityG = new THREE.Group(); cityG.position.x = 1410; seg.group.add(cityG); city({ group: cityG, tick: seg.tick, blds: seg.blds || (seg.blds = []), crowds: seg.crowds || (seg.crowds = []) }, R, len, { cars: 14, noPeds: true, noTraffic: true, noBillboard: true });
    // boardwalk shops (low, colourful, awnings) + palms
    const shops = [], aw = [], pz0 = kind === "venice" ? -len * .12 : 1e9; for (let z = -len / 2 + 20; z < len / 2 - 20; z += 34 + R() * 10) { const w = 40 + R() * 20, d = 26 + R() * 6, h = 14 + R() * 12; if (Math.abs(z - pz0) < 95) continue; shops.push([186 + R() * 10, z, w, d, h]); aw.push([186 - w / 2 - 3, z, d * .9]); }
    const sh = new THREE.InstancedMesh(box, new THREE.MeshLambertMaterial(), shops.length); sh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(shops.length * 3), 3); sh.frustumCulled = false;
    const SHOP = ["#f4d8b0", "#7ec8c0", "#f29a8a", "#f6efe0", "#c8a8e0", "#f0d375", "#8fc0e8"]; shops.forEach((b, i) => { set(sh, i, b[0], 0, b[1], Math.PI / 2, b[3], b[4], b[2]); sh.instanceColor.setXYZ(i, ...QC.set(SHOP[(R() * SHOP.length) | 0]).toArray()); }); seg.group.add(sh);
    const awM = inst(new THREE.BoxGeometry(6, .8, 1).translate(0, 9, 0), M.wine, aw.length, true); aw.forEach((a, i) => { set(awM, i, a[0], 0, a[1], 0, 1, 1, a[2]); awM.instanceColor.setXYZ(i, ...QC.set(TOWEL[i % TOWEL.length]).toArray()); }); seg.group.add(awM);
    const pl = []; for (let z = -len / 2 + 14; z < len / 2; z += 38) pl.push([116, z + R() * 8], [150, z + 19]); palms(seg, R, pl.filter(p => Math.abs(p[1] - pz0) > 75));   // (no palms in front of Nalu Vida)
    BEACH.populate(seg, R, len, SHORE, H);   // the water, the seabed and everyone on the beach and in the waves (beach3d.js)
    if (kind === "pier" || kind === "venice") pier(seg, R, len, kind);
  }
  function pier(seg, R, len, kind) {   // the pier into the ocean; "venice" puts Nalu Vida on it
    const pz = kind === "venice" ? -len * .12 : 0, g = new THREE.Group(); g.position.set(0, 0, pz); seg.group.add(g);
    g.add(mesh(new THREE.BoxGeometry(770, 2.4, 34).translate(150 - 385, 12, 0), M.wood));
    const posts = []; for (let x = -600; x < 140; x += 26) for (const z of [-15, 15]) posts.push([new THREE.CylinderGeometry(.9, .9, 14, 5), T4(x, 5, z)]); g.add(mesh(merge(posts), M.wood));
    const rails = [[new THREE.BoxGeometry(770, 1.6, .5), T4(150 - 385, 14.6, -16.6)], [new THREE.BoxGeometry(770, 1.6, .5), T4(150 - 385, 14.6, 16.6)]]; g.add(mesh(merge(rails), M.white));
    const lm = inst(new THREE.SphereGeometry(1.3, 6, 4), M.lamp, 28, true), lp = inst(new THREE.CylinderGeometry(.3, .3, 9, 4).translate(0, 4.5, 0), M.dark, 28);
    for (let i = 0; i < 28; i++) { const x = -600 + i * 27, z = i % 2 ? 16 : -16; set(lp, i, x, 13, z, 0); set(lm, i, x, 22.5, z, 0); lm.instanceColor.setXYZ(i, 1.8, 1.5, 1); } g.add(lm, lp);
    const strollers = []; for (let i = 0; i < 18; i++) strollers.push([-560 + R() * 680, (R() - .5) * 24, R() < .5 ? Math.PI / 2 : -Math.PI / 2, -1]);
    crowd(g, R, strollers.map(p => [p[0], p[1], p[2], -1, 1]), { y: 13.2, skin: BEACH_SKIN, shirt: (R) => TOWEL[(R() * TOWEL.length) | 0], kind: "beachM", walkX: 690, walkX0: -570 }, seg);   // strolling the pier
    if (kind === "pier") { const wheel = new THREE.Group(); wheel.position.set(-430, 70, -30); g.add(wheel); wheel.add(mesh(new THREE.TorusGeometry(46, 1.4, 6, 40), M.white));
      const spk = []; for (let i = 0; i < 12; i++) spk.push([new THREE.BoxGeometry(.8, 92, .8), T4(0, 0, 0, 0, 0, i / 12 * Math.PI)]); wheel.add(mesh(merge(spk), M.white));
      const cabs = inst(new THREE.BoxGeometry(6, 6, 6), M.lamp, 12, true); wheel.add(cabs); g.add(mesh(new THREE.CylinderGeometry(2, 3, 60, 5).translate(0, 30, 0), M.white, -430, 12, -30));
      seg.tick.push((t) => { wheel.rotation.z = t * .25; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU - t * .25; set(cabs, i, Math.cos(a) * 46, Math.sin(a) * 46 - 4, 0, 0); cabs.instanceColor.setXYZ(i, ...[[1.8, .4, .5], [1.8, 1.5, .4], [.4, 1.2, 1.8]][i % 3]); } cabs.instanceMatrix.needsUpdate = true; cabs.instanceColor.needsUpdate = true; }); }
    if (kind === "venice") {   // Nalu Vida where it really is: 1 Washington Blvd — on land at the FOOT of the Venice Pier (right of the sand +
      // the beach walk), the old Pier House: a 2-storey beach bar facing the sand and the pier, open front + patio under orange/teal
      // umbrellas and string lights, a roof deck, the NALU VIDA logo big on the roof (readable from the plane) and on the front,
      // Washington Blvd running inland behind it with palms. Never a building target (not in seg.blds): it can't be damaged.
      const nx = 150, n = new THREE.Group(); n.position.set(nx, 0, pz); n.scale.setScalar(1.3); seg.group.add(n);   // a touch larger than life so it reads from the plane
      const stucco = new THREE.MeshStandardMaterial({ color: 0xf3ead8, roughness: .7 }), teal = new THREE.MeshStandardMaterial({ color: 0x1b8fa6, roughness: .5 }), orange = new THREE.MeshStandardMaterial({ color: 0xff7a3a, roughness: .55 });
      n.add(mesh(new THREE.BoxGeometry(70, 2, 100).translate(0, 1, 0), M.wood));                                                        // plinth
      n.add(mesh(new THREE.BoxGeometry(56, 15, 92).translate(8, 9, 0), stucco));                                                      // ground floor (back + sides)
      n.add(mesh(new THREE.BoxGeometry(2, 11, 84).translate(-20.5, 7.5, 0), new THREE.MeshBasicMaterial({ color: 0xffc98a, toneMapped: false })));   // the open front: warm-lit bar inside
      n.add(mesh(new THREE.BoxGeometry(62, 2.2, 96).translate(5, 17.5, 0), teal));                                                   // teal band between the floors
      n.add(mesh(new THREE.BoxGeometry(52, 13, 88).translate(10, 25, 0), stucco));                                                    // upper floor
      n.add(mesh(new THREE.BoxGeometry(.8, 7, 78).translate(-16.2, 26, 0), new THREE.MeshBasicMaterial({ color: 0xffe1b0, toneMapped: false })));   // upper windows
      n.add(mesh(new THREE.BoxGeometry(54, 1.2, 90).translate(10, 31.8, 0), M.wood));                                                 // roof deck
      n.add(mesh(merge([[new THREE.BoxGeometry(54, 2.4, .6), T4(10, 33.6, 45)], [new THREE.BoxGeometry(54, 2.4, .6), T4(10, 33.6, -45)], [new THREE.BoxGeometry(.6, 2.4, 90), T4(-17, 33.6, 0)], [new THREE.BoxGeometry(.6, 2.4, 90), T4(37, 33.6, 0)]]), M.white));   // deck rail
      n.add(mesh(new THREE.BoxGeometry(14, 1.6, 90).translate(-27, 16.2, 0), orange));                                               // orange awning over the open front
      // the logo: huge on the roof (lying flat, lit) + a sign on the front parapet facing the beach, tipped up toward the plane
      const lr = mesh(new THREE.CircleGeometry(30, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: naluTex, transparent: true, toneMapped: false }), 10, 32.8, 0); n.add(lr);
      n.add(mesh(new THREE.RingGeometry(30, 33, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffb070, toneMapped: false }), 10, 32.7, 0));
      const lf = mesh(new THREE.CircleGeometry(15, 40), new THREE.MeshBasicMaterial({ map: naluTex, transparent: true, toneMapped: false }), -20, 42, 0); lf.rotation.y = -Math.PI / 2; lf.rotation.x = 0; lf.rotation.order = "YXZ"; lf.rotation.x = -.45; n.add(lf);
      n.add(mesh(merge([[new THREE.CylinderGeometry(.7, .7, 12, 6), T4(-20, 36, -9)], [new THREE.CylinderGeometry(.7, .7, 12, 6), T4(-20, 36, 9)]]), M.dark));
      // patio on the sand side: deck, tables under orange / teal umbrellas, diners, string lights
      n.add(mesh(new THREE.BoxGeometry(34, 1, 96).translate(-40, .9, 0), M.wood));
      const tb = inst(new THREE.CylinderGeometry(3, 3, .8, 10).translate(0, 4.4, 0), M.white, 12), ub = inst(new THREE.ConeGeometry(7.5, 3.2, 8).translate(0, 12.5, 0), new THREE.MeshLambertMaterial(), 12, true), diners = [];
      for (let i = 0; i < 12; i++) { const x = -48 + (i % 2) * 16, z = -38 + (i / 2 | 0) * 15.5; set(tb, i, x, 1.2, z, 0); set(ub, i, x, 1.2, z, 0); ub.instanceColor.setXYZ(i, ...QC.set(i % 2 ? "#ff7a3a" : "#1d9bb8").toArray()); diners.push([nx + x * 1.3, pz + z * 1.3 - 5, 0, -1, 4], [nx + x * 1.3, pz + z * 1.3 + 5, Math.PI, -1, 4]); }
      n.add(tb, ub); crowd(seg.group, R, diners.map(d => [d[0], d[1], d[2], d[3], d[4]]), { y: 2.1, skin: BEACH_SKIN, kind: "beachF" }, seg);   // diners, seated
      const bulbs = []; const swag = (a, b, y) => { for (let k = 1; k < 14; k++) { const u = k / 14; bulbs.push([a[0] + (b[0] - a[0]) * u, y - Math.sin(u * Math.PI) * 4, a[1] + (b[1] - a[1]) * u]); } };
      swag([-57, -46], [-57, 46], 19); swag([-23, -46], [-57, 0], 19); swag([-23, 46], [-57, 0], 19); swag([-17, -45], [37, -45], 38); swag([-17, 45], [37, 45], 38);
      const bl = inst(new THREE.SphereGeometry(.8, 6, 4), M.lamp, bulbs.length, true); bulbs.forEach((b, i) => { set(bl, i, b[0], b[1], b[2], 0); bl.instanceColor.setXYZ(i, 1.8, 1.35, .7); }); n.add(bl);
      for (const z of [-46, 46]) for (const x of [-57, -23]) n.add(mesh(new THREE.CylinderGeometry(.5, .5, 19, 5).translate(x, 9.5, z), M.dark));
      // Washington Blvd: from the pier entrance inland (east), palms both sides
      seg.group.add(mesh(new THREE.PlaneGeometry(760, 34).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x2b2c31 }), nx + 40 + 380, .25, pz + 72));
      seg.group.add(mesh(new THREE.PlaneGeometry(760, 1.2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xe3b93a }), nx + 40 + 380, .3, pz + 72));
      const wp = []; for (let x = nx + 50; x < nx + 760; x += 34) wp.push([x, pz + 52], [x + 17, pz + 92]); palms(seg, R, wp);
      const glow = mesh(new THREE.PlaneGeometry(200, 170).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffa860, opacity: .4, toneMapped: false }), -30, 1.2, 0); n.add(glow);
      seg.nalu = { x: nx, z: pz };   // (segment-local)
      if (bbDue(-1)) billboard(seg.group, SHORE + 70, pz + 70, .25, 1.1);   // by the pier, next to Nalu Vida: Antidote's review on a big LED screen
      seg.tick.push((t, dt, near) => { glow.material.opacity = .34 + .06 * Math.sin(t * 2.6); if (near && FX && Math.random() < dt * 2) puff(SMP.set(seg.group.position.x + nx + 30, 36, seg.group.position.z + pz - 30), "steam", 1); });
    }
  }

  /* ---------- a ground segment: kind ∈ city|towers|melody|stadium|hills|coast|venice|pier|runway ---------- */
  function segment(kind, len, seed, o = {}) {
    const R = rng(seed || 1), seg = { kind, len, seed: seed || 1, group: new THREE.Group(), tick: [], egg: null, melody: null, nalu: null, blds: [], shore: null, water: () => false };
    const side = o.side || 1; WARM = !!o.warm;
    if (kind === "runway") runway(seg, R, len, o);
    else if (kind === "hills") hills(seg, R, len);
    else if (kind === "coast" || kind === "venice" || kind === "pier") coast(seg, R, len, kind);
    else if (kind === "stadium") stadium(seg, R, len, side);
    else if (kind === "melody") { const mz = melodyZ(len); city(seg, R, len, { clear: [[side * 64 - side * 50, mz.cz, 300, 150]], cars: 24, parkedAt: mz.parked(side) }); melody(seg, R, len, side, mz); }
    else { city(seg, R, len, { tall: kind === "towers", clear: o.egg ? [[(o.eggSide || 1) * 210, -len * .12, 70, 40]] : [], cars: 30 }); if (o.egg) egg(seg, R, len, o.eggSide || 1); }
    seg.update = (t, dt, near) => { for (let i = 0; i < seg.tick.length; i++) seg.tick[i](t, dt || 0, !!near); };
    // the building a world point is inside (plane: rx/rz = half wingspan / half length; shots: small), or null
    seg.collide = (wx, wy, wz, rx, rz) => { for (const B of seg.blds) { const o = B.hit(wx, wy, wz, rx, rz); if (o) return { B, o }; } return null; };
    seg.smash = (h, wx, wy, wz, how) => h.B.smash(h.o, wx, wy, wz, how);
    seg.scatter = (wx, wz, r) => { (seg.crowds || []).forEach(C => C.scatterW && C.scatterW(wx, wz, r)); };
    seg.dispose = () => { (seg.crowds || []).forEach(C => C.dispose && C.dispose()); (seg.nets || []).forEach(n => n.dispose()); seg.group.traverse(n => { if (n.isInstancedMesh) n.dispose(); if (n.isMesh && n.geometry && !SHARED.has(n.geometry)) n.geometry.dispose(); }); };
    seg.update(0, 0, false); WARM = false; return seg;
  }
  const SHARED = new Set([box, trunkG, crownG, carG, lampG, poolG, bodyG, headG, boardG, lyingG, lyingHead, PERSON]);
  // time of day: window lights, street lamps, pools of light and the searchlights fade with the daylight (engine3d/sky.js → night 0..1)
  const BASEI = { facade: M.facade.emissiveIntensity, pool: M.pool.opacity, beam: M.beam.opacity };
  // the ocean follows the sky: body colour by the light level, reflections of the real horizon/zenith, the glitter path from the real sun
  function setSkyLight(info, w) { const U = BEACH.water.uniforms, L = Math.max(.08, (1 - info.night) * Math.min(1, .35 + info.sunI * .25) * (1 - (w ? w.dark * .8 : 0))) * (1 - info.night * .7) + info.night * .02;
    U.uLight.value.set(L, L * (1 - info.night * .1), L * (1 + info.night * .25)); U.uSkyH.value.copy(info.horizon); U.uSkyZ.value.copy(info.zenith); U.uSunAmt.value = Math.max(0, Math.min(1, info.sunI / 2)); if (info.night > .5) U.uSunAmt.value = 0;
    U.sunDir.value.copy(info.sunDir); }
  function setDaylight(night, w) { const n = Math.max(.08, Math.min(1, night * 1.15 + (w ? w.dark * .5 : 0)));
    M.facade.emissiveIntensity = BASEI.facade * (.12 + .88 * n); M.pool.opacity = BASEI.pool * n; M.beam.opacity = BASEI.beam * n; M.lamp.color.setScalar(.35 + .65 * n); }
  return { boards: () => boardsAll.filter(b => { let p = b.parent, n = 0; while (p && n++ < 12) { if (p.isScene) return true; p = p.parent; } return false; }), segment, root, wind, tick, debris, sun: SUN, M, ocean: oceanM, coverTex, logoTex, setDaylight, setSkyLight, beachWater: BEACH.water, setWind: (v) => { UWIND.value = v; } };
}
