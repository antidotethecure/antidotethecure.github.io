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
import { makeBeachKit } from "./beach3d.js?v=dx1";
import { makeVideoBoards } from "../engine3d/billboard.js?v=e3t";
import { makeFacades } from "../engine3d/facades.js?v=e3t";
import { buildCars } from "../engine3d/carmodels.js?v=e3t";
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
  // style: "city" (LA commercial: gravel/parking lots) · "res" (LA residential: lawns, driveways, parkway grass strips) · "oc" (Orange
  // County office parks: pale concrete, striped parking, clipped lawns). Same road grid in all three, so traffic lanes line up everywhere.
  const groundTexOf = (style) => { const GW = O.lite ? 512 : 1024, GH = Math.round(GW * 368 / 512), c = mkc(GW, GH), x = c.getContext("2d"), k = GW / 512; x.scale(k, k);
    const sx = 512 / CX, sz = 368 / CZ, rw = ROAD * sx, rz = ROAD * sz, sw = SIDE * sx, swz = SIDE * sz, R = rng(5);
    x.fillStyle = style === "res" ? "#4d6638" : style === "oc" ? "#9c978d" : "#56544f"; x.fillRect(0, 0, 512, 368);                                                   // lots
    if (style === "res") {   // front lawns (patchy, some dry), driveways and back yards; the houses themselves are 3D
      for (let i = 0; i < 160; i++) { x.fillStyle = R() < .3 ? "rgba(140,128,78,.45)" : R() < .5 ? "rgba(70,104,52,.6)" : "rgba(40,62,34,.5)"; x.fillRect(R() * 512, R() * 368, 6 + R() * 30, 6 + R() * 24); }
      x.fillStyle = "#a9a49a"; for (let q = 0; q < 12; q++) { const px = rw / 2 + sw + 10 + q * 40; x.fillRect(px, rz / 2 + swz, 6, 26); x.fillRect(px + 14, 368 - rz / 2 - swz - 26, 6, 26); }   // driveways
      x.fillStyle = "rgba(60,90,120,.75)"; for (let q = 0; q < 3; q++) { x.beginPath(); x.ellipse(110 + q * 130 + R() * 20, 184 + (R() - .5) * 30, 7, 4.5, 0, 0, TAU); x.fill(); } }   // back-yard pools
    else if (style === "oc") {   // striped parking with clipped lawn islands and young trees
      x.strokeStyle = "rgba(245,245,240,.55)"; x.lineWidth = .7; for (let r = 0; r < 4; r++) { const y0 = 60 + r * 70; for (let q = 40; q < 470; q += 6) { x.beginPath(); x.moveTo(q, y0); x.lineTo(q, y0 + 14); x.stroke(); } }
      x.fillStyle = "#5d7f45"; for (let r = 0; r < 4; r++) x.fillRect(40, 54 + r * 70, 430, 4); for (let i = 0; i < 40; i++) { x.fillStyle = "rgba(70,110,60,.7)"; x.beginPath(); x.arc(40 + R() * 430, 50 + R() * 270, 3 + R() * 4, 0, TAU); x.fill(); } }
    else for (let i = 0; i < 90; i++) { x.fillStyle = R() < .5 ? "rgba(60,82,52,.55)" : "rgba(40,40,44,.35)"; x.fillRect(R() * 512, R() * 368, 8 + R() * 50, 8 + R() * 40); }
    for (let i = 0; i < 700; i++) { x.fillStyle = `rgba(${R() < .5 ? "255,255,255" : "0,0,0"},${.03 + R() * .05})`; x.fillRect(R() * 512, R() * 368, .6 + R(), .6 + R()); }   // gravel
    x.fillStyle = style === "oc" ? "#b4b0a6" : "#8d8a84"; x.fillRect(0, 0, rw / 2 + sw, 368); x.fillRect(512 - rw / 2 - sw, 0, rw / 2 + sw, 368); x.fillRect(0, 0, 512, rz / 2 + swz); x.fillRect(0, 368 - rz / 2 - swz, 512, rz / 2 + swz);   // sidewalks
    if (style === "res") { x.fillStyle = "#5a7a3e"; const pk = sw * .45; x.fillRect(rw / 2, 0, pk, 368); x.fillRect(512 - rw / 2 - pk, 0, pk, 368); x.fillRect(0, rz / 2, 512, pk * sz / sx); x.fillRect(0, 368 - rz / 2 - pk * sz / sx, 512, pk * sz / sx); }   // LA parkway: grass strip between kerb and sidewalk
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
    const t = tex(c, true); t.anisotropy = 8; return t; };
  const groundTex = groundTexOf("city"), GROUNDM = {};
  const groundMat = (style) => style && style !== "city" ? (GROUNDM[style] || (GROUNDM[style] = new THREE.MeshLambertMaterial({ map: groundTexOf(style) }))) : M.ground;
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
  // bullet holes (2026-10-19, Antidote: "visible bullet marks where hits land"): a black punched hole, a ring of chipped grey
  // render, hairline cracks and a soot fan above it; 4 variants in one 256x64 atlas strip, picked per hole by UV offset (one draw)
  const scorchG = new THREE.PlaneGeometry(1, 1), scorchM = new THREE.MeshBasicMaterial({ map: (() => { const c = mkc(256, 64), x = c.getContext("2d"), R = rng(61);
    for (let k = 0; k < 4; k++) { const cx = 32 + k * 64, cy = 34; x.save(); x.beginPath(); x.rect(k * 64, 0, 64, 64); x.clip();
      const g = x.createRadialGradient(cx, cy - 6, 2, cx, cy - 10, 30); g.addColorStop(0, "rgba(14,10,8,.55)"); g.addColorStop(1, "rgba(14,10,8,0)"); x.fillStyle = g; x.fillRect(k * 64, 0, 64, 64);   // soot fan
      x.fillStyle = "rgba(120,116,110,.9)"; x.beginPath(); for (let a = 0; a < 14; a++) { const r = 9 + R() * 6, an = a / 14 * TAU; x.lineTo(cx + Math.cos(an) * r, cy + Math.sin(an) * r); } x.closePath(); x.fill();   // chipped render
      x.strokeStyle = "rgba(20,16,14,.85)"; x.lineWidth = 1.2; for (let a = 0; a < 6; a++) { const an = R() * TAU; let px = cx, py = cy; x.beginPath(); x.moveTo(px, py); for (let j = 0; j < 4; j++) { px += Math.cos(an + (R() - .5)) * (4 + R() * 5); py += Math.sin(an + (R() - .5)) * (4 + R() * 5); x.lineTo(px, py); } x.stroke(); }   // cracks
      const h = x.createRadialGradient(cx, cy, 0, cx, cy, 7); h.addColorStop(0, "#050404"); h.addColorStop(.7, "#120d0a"); h.addColorStop(1, "rgba(18,13,10,0)"); x.fillStyle = h; x.beginPath(); x.arc(cx, cy, 7, 0, TAU); x.fill(); x.restore(); }   // the hole
    const t = new THREE.CanvasTexture(c); return t; })(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  scorchG.setAttribute("uv", new THREE.Float32BufferAttribute([0, 1, .25, 1, 0, 0, .25, 0], 2));   // one atlas cell; the instance picks the cell (aCell)
  scorchM.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute float aCell;").replace("#include <uv_vertex>", "#include <uv_vertex>\n#ifdef USE_MAP\n vMapUv.x += aCell * .25;\n#endif"); };
  scorchM.customProgramCacheKey = () => "bullet-holes";
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
  function tick(dt, t) { UT.value = t; FIREN = 0; if (VB) VB.update(t); toppleTick(dt); gfTick(dt, t); for (let i = 0; i < DN; i++) { const d = DB[i]; if (d.life <= 0) continue; d.life -= dt; d.v.y -= 160 * dt; d.p.addScaledVector(d.v, dt); if (FX && d.p.y > 3 && d.v.lengthSq() > 900 && Math.random() < dt * 14) FX.emit(d.p, SMV.set(0, 6, wind.z * .6), 1.1, 2, 7, [.3, .28, .26], [.16, .16, .16], .55, false, 0, .4, 3);   /* chunks trail smoke while they fly */ if (d.p.y < .8) { d.p.y = .8; if (Math.abs(d.v.y) > 25) { d.v.y = -d.v.y * .35; d.v.x *= .5; d.v.z *= .5; d.vr.multiplyScalar(.5); } else { d.v.set(wind.x, 0, wind.z); d.vr.set(0, 0, 0); } }   // chunks bounce once or twice, then rest
      d.r.x += d.vr.x * dt; d.r.y += d.vr.y * dt; d.r.z += d.vr.z * dt; DQ.setFromEuler(d.r); const s = d.life > 0 ? d.s : 0; debrisM.setMatrixAt(i, DM.compose(d.p, DQ, DS.set(s, s * .6, s * .8))); if (d.life <= 0) debrisM.setMatrixAt(i, ZERO); }
    debrisM.instanceMatrix.needsUpdate = true; }
  const SMV = new THREE.Vector3(), SMP = new THREE.Vector3(), GPV = new THREE.Vector3();
  function puff(p, kind, k, dk) { if (!FX) return; k = k || 1;   // kind: "steam" (kitchen), "smoke" (fire), "fire"
    if (kind === "fire") FX.emit(p, SMV.set(wind.x * .9 + (Math.random() - .5) * 6, 10 + Math.random() * 8, wind.z * .9 + (Math.random() - .5) * 6), .45, 6 * k, 2 * k, [1, .82, .35], [1, .25, .05], 1, true, 0, 0, 20);
    else if (kind === "dust") FX.emit(p, SMV.set(wind.x + (Math.random() - .5) * 40, 6 + Math.random() * 10, wind.z + (Math.random() - .5) * 40), 3.4, 10 * k, 48 * k, [.62, .58, .52], [.5, .48, .45], .55, false, 0, .9, 2);
    else if (kind === "smoke") { const d = dk == null ? 1 : dk, c0 = .46 - .3 * d, c1 = .3 - .22 * d; FX.emit(p, SMV.set(wind.x + (Math.random() - .5) * 6, 14 + Math.random() * 6, wind.z + (Math.random() - .5) * 6), 3.2, 6 * k, 30 * k, [c0 * 1.04, c0, c0 * .96], [c1, c1, c1], .62 + .2 * d, false, 0, .3, 4); }   // light grey at first, black and thick when it's burning badly
    else FX.emit(p, SMV.set(wind.x + (Math.random() - .5) * 4, 12 + Math.random() * 5, wind.z + (Math.random() - .5) * 4), 2.6, 3 * k, 16 * k, [.86, .85, .84], [.6, .6, .62], .45, false, 0, .4, 3); }

  /* ---------- CRASH FIRE (2026-10-19, Antidote: "when the plane or any object falls and hits the ground, the ground, nearby buildings
     and cars catch fire, and nearby people run and scatter"). impact(p, k): burning patches on the ground (pooled, 20), a scorch
     mark (pooled, 16), buildings in reach catch fire (and may come down), cars in reach stop, char and burn (max 10 at once), and
     every crowd in reach scatters (they run; nobody is shown hurt). Patches live in their strip's own coordinates, so they ride the
     ground exactly; their fire/smoke columns share the per-frame fire budget (O.fireCap). ---------- */
  const LIVE = new Set();   // live (non-warm-up) ground strips
  const GF = Array.from({ length: 20 }, () => ({ seg: null, x: 0, z: 0, k: 1, life: 0, max: 1 })); let gfI = 0;
  const GSN = 16, gsM = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: (() => { const c = mkc(128, 128), x = c.getContext("2d"), R = rng(83);
      for (let i = 0; i < 26; i++) { const a = R() * TAU, r = R() * 34, px = 64 + Math.cos(a) * r, py = 64 + Math.sin(a) * r, g = x.createRadialGradient(px, py, 0, px, py, 16 + R() * 18); g.addColorStop(0, "rgba(10,8,6,.55)"); g.addColorStop(1, "rgba(10,8,6,0)"); x.fillStyle = g; x.fillRect(0, 0, 128, 128); }
      return new THREE.CanvasTexture(c); })(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), GSN);
  gsM.count = GSN; gsM.frustumCulled = false; gsM.renderOrder = 3; root.add(gsM); const GS = Array.from({ length: GSN }, () => ({ seg: null, x: 0, z: 0, r: 0, life: 0 })); let gsI = 0; for (let i = 0; i < GSN; i++) gsM.setMatrixAt(i, ZERO);
  const BURN = [];   // cars on fire: { net, car, seg }
  const segAt = (wz) => { let best = null, bd = 1e9; for (const sg of LIVE) { const d = Math.abs(wz - sg.group.position.z); if (d < sg.len / 2 + 1 && d < bd) { bd = d; best = sg; } } return best; };
  function groundFire(wx, wz, k, life) { const sg = segAt(wz); if (!sg) return; const f = GF[gfI = (gfI + 1) % GF.length]; f.seg = sg; f.x = wx - sg.group.position.x; f.z = wz - sg.group.position.z; f.k = k; f.life = f.max = life; }
  const IV = new THREE.Vector3(), IW = new THREE.Vector3();
  function impact(p, k) { k = Math.max(.5, k || 1); const r = 90 + 60 * k, q = O.fxScale ? O.fxScale() : 1;
    for (let i = 0; i < 2 + Math.round(2 * k * Math.max(.5, q)); i++) { const a = Math.random() * TAU, d = i ? (10 + Math.random() * 26) * k : 0; groundFire(p.x + Math.cos(a) * d, p.z + Math.sin(a) * d, (i ? .7 : 1.3) * Math.min(1.6, k), 10 + Math.random() * 8); }
    { const sg = segAt(p.z); if (sg) { const S = GS[gsI = (gsI + 1) % GSN]; S.seg = sg; S.x = p.x - sg.group.position.x; S.z = p.z - sg.group.position.z; S.r = 46 * k + 20; S.life = 30; } }
    if (FX) for (let i = 0; i < 10; i++) puff(IV.set(p.x + (Math.random() - .5) * 40 * k, 2 + Math.random() * 6, p.z + (Math.random() - .5) * 40 * k), "dust", 2 * k);
    for (const sg of LIVE) { if (Math.abs(p.z - sg.group.position.z) > sg.len / 2 + r) continue;
      for (const B of sg.blds || []) { const gp = B.im.parent ? B.im.parent.getWorldPosition(IW) : sg.group.position; for (const o of B.L) { const dx = Math.max(0, Math.abs(gp.x + o.x - p.x) - o.w / 2), dz = Math.max(0, Math.abs(gp.z + o.z - p.z) - o.d / 2), d = Math.hypot(dx, dz); if (d < r * .75) B.ignite(o, 1 - d / (r * .75), p.x, p.z); } }
      for (const net of sg.nets || []) { const gp = net.group.getWorldPosition(IW);
        for (const car of net.cars.concat(net.parked)) { if (car.burnt || BURN.length >= 10) continue; let x, z; if (car.L) { if (car.turn) continue; x = car.L.ax === "z" ? car.L.c : car.s; z = car.L.ax === "z" ? car.s : car.L.c; } else { x = car.x; z = car.z; }
          const d = Math.hypot(gp.x + x - p.x, gp.z + z - p.z); if (d > r * .7) continue;
          car.burnt = 1; if (car.L) { car.v = 0; car.v0 = .01; } const ch = .05 + Math.random() * .03; car.paint = new THREE.Color(ch, ch * .92, ch * .85); car.gpaint = car.paint;   // stops dead, paint scorched black
          BURN.push({ net, car, t: 14 + Math.random() * 10 }); groundFire(gp.x + x, gp.z + z, .75, 16 + Math.random() * 8); } }
      if (sg.scatter) sg.scatter(p.x, p.z, r * 1.7); } }
  const GFV = new THREE.Vector3();
  function gfTick(dt) { const cap = Math.max(2, Math.round((O.fireCap ? O.fireCap() : 12) / 2)), cz = O.camZ ? O.camZ() : 1e9; let n = 0;
    for (const f of GF) { if (f.life <= 0) continue; f.life -= dt; if (!f.seg || !LIVE.has(f.seg)) { f.life = 0; continue; } const gp = f.seg.group.position, P = GFV.set(gp.x + f.x, .5, gp.z + f.z);
      if (P.z > cz - 30 || !FX || n >= cap) continue; n++; FIREN++; const u = f.life / f.max, k = f.k * (u < .25 ? u / .25 : 1);
      if (Math.random() < dt * 34 * k) puff(SMP.set(P.x + (Math.random() - .5) * 12 * f.k, 1 + Math.random() * 3, P.z + (Math.random() - .5) * 12 * f.k), "fire", 1.5 * k);
      if (Math.random() < dt * 8 * k) puff(SMP.set(P.x, 6, P.z), "smoke", 1.1 * k, .9);
      if (FX.glow) FX.glow(SMP.set(P.x, 5, P.z), 22 * k, [1, .5, .16], .5 + .25 * Math.random()); }
    for (let i = 0; i < GSN; i++) { const S = GS[i]; if (S.life <= 0) continue; S.life -= dt; if (!S.seg || !LIVE.has(S.seg) || S.life <= 0) { S.life = 0; gsM.setMatrixAt(i, ZERO); continue; } const gp = S.seg.group.position; set(gsM, i, gp.x + S.x, .45, gp.z + S.z, i, S.r, 1, S.r); }
    gsM.instanceMatrix.needsUpdate = true;
    for (let i = BURN.length - 1; i >= 0; i--) { const b = BURN[i]; b.t -= dt; if (b.t <= 0 || b.net.disposed) BURN.splice(i, 1); } }
  // the ground slid sideways under you (lateral roam, melody3d.js): world-space leftovers (debris, toppling tops) slide with it
  function shift(dx) { for (const d of DB) if (d.life > 0) d.p.x += dx; for (const T of TOP) if (T.t >= 0) T.pv.position.x += dx; }
  const lmCount = {}; let ZK = null;   // landmark census (tests): kind -> how many built this zone visit (ZK = which visit)

  /* ---------- pieces ---------- */
  function cars(seg, R, n, len, lanes) {   // n cars on the given lanes; each lane: [axis "z"|"x", coord, dir]
    const body = inst(carG, M.car, n, true), lamps = inst(lampG, M.lamp, n * 4, true), pools = inst(poolG, M.pool, n), list = [];
    for (let i = 0; i < n; i++) { const L = lanes[(R() * lanes.length) | 0], sp = 38 + R() * 46; list.push({ L, sp, ph: R() * 5000, x: 0, z: 0 });
      body.instanceColor.setXYZ(i, ...QC.set(CAR_COLS[(R() * CAR_COLS.length) | 0]).toArray());
      for (let j = 0; j < 4; j++) lamps.instanceColor.setXYZ(i * 4 + j, ...(j < 2 ? [1.6, 1.45, 1.1] : [1.6, .12, .1])); }
    seg.group.add(body, lamps, pools); const ox = seg.ox || 0; if (seg.carSrc) seg.carSrc.push(() => list.map(c => [c.x + ox, c.z]));   // (road audit: segment-local positions)
    seg.tick.push((t) => { for (let i = 0; i < n; i++) { const c = list[i], L = c.L, span = L[0] === "z" ? len : XW * .9, s = ((c.ph + t * c.sp) % span) - span / 2, d = L[2], ry = L[0] === "z" ? (d > 0 ? 0 : Math.PI) : (d > 0 ? Math.PI / 2 : -Math.PI / 2);
      const x = L[0] === "z" ? L[1] : s * d, z = L[0] === "z" ? s * d : L[1]; c.x = x; c.z = z; set(body, i, x, 0, z, ry); set(pools, i, x, 0, z, ry);
      const fx = Math.sin(ry), fz = Math.cos(ry); for (let j = 0; j < 4; j++) { const f = j < 2 ? 7.9 : -7.9, sd = (j % 2 ? 1 : -1) * 2.3; set(lamps, i * 4 + j, x + fx * f + fz * sd, 2.4, z + fz * f - fx * sd, ry); } }
      body.instanceMatrix.needsUpdate = lamps.instanceMatrix.needsUpdate = pools.instanceMatrix.needsUpdate = true; });
  }
  function palms(seg, R, spots, tallK) { const tr = inst(trunkG, M.trunk, spots.length), cr = inst(crownG, M.leaf, spots.length), k = tallK || 1;
    spots.forEach((p, i) => { const s = .8 + R() * .5, ry = R() * TAU, sy = s * k * (k > 1 ? .9 + R() * .3 : 1); set(tr, i, p[0], 0, p[1], ry, s, sy, s); set(cr, i, p[0], (sy - s) * 34, p[1], ry, s, s, s); }); seg.group.add(tr, cr); }
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
    // hp = rounds it takes to bring it down (bigger buildings take more); see smash("shot") and the crumble below
    const L = lots.map((b, i) => ({ i, x: b[0], z: b[1], w: b[2], d: b[3], h: b[4], h0: b[4], dmg: 0, props: [], fires: [], vent: null, hits: 0, hp: Math.round(11 + Math.min(19, b[4] * .07 + b[2] * b[3] / 900)) }));
    L.forEach(o => { set(im, o.i, o.x, 0, o.z, 0, o.w, o.h, o.d); const v = opt.style != null ? (typeof opt.style === "function" ? opt.style(R, o.h) : opt.style) : FAC.pick(R, o.h); vr.setX(o.i, v);
      im.instanceColor.setXYZ(o.i, ...QC.set(opt.tints && opt.tints[v] ? opt.tints[v][(R() * opt.tints[v].length) | 0] : FAC.tint(R, v)).toArray()); });   /* opt.style: 0 stucco · 1 glass · 2 brick · 3 concrete */
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
      if (DOOM.length) crumbleTick(dt, near);
      if (!near || !FX) return; const gp = seg.group.getWorldPosition(GPV);
      stk.forEach(a => { if (a[0].h < a[0].h0 - 1) return; if (Math.random() < dt * 3) puff(SMP.set(gp.x + a[0].x + a[1], a[0].h + 11, gp.z + a[0].z + a[2]), "steam", 1); });
      const cap = O.fireCap ? O.fireCap() : 12;   // active fire/smoke columns per frame (Smooth: 4)
      const cz = O.camZ ? O.camZ() : 1e9; L.forEach(o => o.fires.forEach(f => { if (FIREN >= cap || gp.z + f[2] > cz - 40) return; FIREN++; const P = SMP.set(gp.x + f[0], f[1], gp.z + f[2]);   /* (fires behind the camera don't use up the budget) */
        const kf = .9 + f[3]; if (Math.random() < dt * (6 + 8 * f[3])) puff(P, "smoke", kf * (.9 + o.dmg * .8), o.dmg); if (Math.random() < dt * (16 + 16 * f[3])) puff(SHV.set(P.x + (Math.random() - .5) * 6, P.y + (Math.random() - .5) * 4, P.z), "fire", kf * 1.3);
        if (FX && FX.glow) FX.glow(P, 6 + 6 * f[3], [1, .5, .15], .55 + .3 * Math.random()); })); });
    // bullet holes: one pooled instanced decal set per block strip (the oldest hole is reused once all are used)
    const SCN = 72, scG = scorchG.clone(), scCell = new THREE.InstancedBufferAttribute(new Float32Array(SCN), 1), scOwn = new Int16Array(SCN).fill(-1); scG.setAttribute("aCell", scCell);
    const scM = new THREE.InstancedMesh(scG, scorchM, SCN); scM.count = 0; scM.frustumCulled = false; scM.renderOrder = 2; seg.group.add(scM); let scI = 0;
    const scorch = (x, y, z, r, own) => { const k = scI % SCN; set(scM, k, x, y, z, Math.random() * TAU * 0, r, r, 1); scCell.setX(k, (Math.random() * 4) | 0); scCell.needsUpdate = true; scOwn[k] = own == null ? -1 : own; scI++; scM.count = Math.min(SCN, scI); scM.instanceMatrix.needsUpdate = true; };
    const unscorch = (own, above) => { let any = 0; for (let k = 0; k < Math.min(SCN, scI); k++) if (scOwn[k] === own) { scM.getMatrixAt(k, Q); QP.setFromMatrixPosition(Q); if (above == null || QP.y > above) { scM.setMatrixAt(k, ZERO); scOwn[k] = -1; any = 1; } } if (any) scM.instanceMatrix.needsUpdate = true; };
    /* CRUMBLE (2026-10-19, Antidote: "they catch fire, smoke, and crumble / fall apart a couple seconds after enough hits"): when a
       building has taken its hp in rounds (or a crash), it burns harder for ~2 s (doom), then the top third topples off, the rest sinks
       into its own dust cloud over ~2.6 s with chunks flying, and a burning rubble stump stays. One instance matrix per frame per
       collapsing building; place() (roof kit) only every 3rd frame while it moves. */
    const DOOM = [];
    const doomIt = (o, delay) => { if (o.doom != null || o.cr != null || o.rubble) return; o.doom = delay; DOOM.push(o); o.dmg = 1; dmg.setX(o.i, 1); dmg.needsUpdate = true;
      for (let k = o.fires.length; k < 4; k++) o.fires.push([o.x + (Math.random() - .5) * o.w * .7, Math.max(3, o.h * (.3 + Math.random() * .6)), o.z + o.d / 2 + .6, 1.2]); o.fires.forEach(f => f[3] = Math.max(f[3], 1.5)); };
    let crF = 0;
    function crumbleTick(dt, near) { const gp = seg.group.getWorldPosition(GPV), q = O.fxScale ? O.fxScale() : 1; crF++;
      for (let j = DOOM.length - 1; j >= 0; j--) { const o = DOOM[j];
        if (o.doom != null) { o.doom -= dt; if (near && Math.random() < dt * 10) debris(SHV.set(gp.x + o.x + (Math.random() - .5) * o.w, o.h * Math.random(), gp.z + o.z + o.d / 2), 1, null, 50, .6);   // bits rain off the facade
          if (o.doom > 0) continue; o.doom = null; o.cr = 0; o.hc0 = o.h; const cut = o.h * .34; if (o.h > 30) topple(gp.x + o.x, o.h - cut, gp.z + o.z, o.w * .96, cut, o.d * .96, Math.random() < .5 ? 1 : -1);   // (topple pivots in world space)
          o.hc0 = o.h - (o.h > 30 ? cut : 0); o.h = o.hc0; if (FX && FX.boom) FX.boom(SHV.set(gp.x + o.x, o.h * .6, gp.z + o.z + o.d / 2), 1.6 + o.w / 60);
          debris(SHV.set(gp.x + o.x, o.h * .7, gp.z + o.z), Math.round(26 * q) + 6, null, 150, 1.5); debris(SHV.set(gp.x + o.x, o.h * .7, gp.z + o.z + o.d / 2), Math.round(10 * q) + 2, "#9fc4dc", 170, .7);   // concrete + glass
          if (o.sign) o.sign.visible = false; unscorch(o.i, o.h); }
        if (o.cr == null) continue; o.cr += dt; const u = Math.min(1, o.cr / 2.6), e = u * u * (3 - 2 * u), rub = Math.max(5, Math.min(14, o.hc0 * .1));
        o.h = o.hc0 + (rub - o.hc0) * e; const jx = u < 1 ? (Math.random() - .5) * 1.6 * (1 - u) : 0;   // it shudders as it goes
        set(im, o.i, o.x + jx, 0, o.z, (u < 1 ? (Math.random() - .5) * .02 : 0), o.w * (1 + .06 * e), o.h, o.d * (1 + .06 * e)); im.instanceMatrix.needsUpdate = true;
        o.fires.forEach(f => { f[1] = Math.min(f[1], o.h + 1); });
        if (near && FX) { if (Math.random() < dt * 22 * q + .2) puff(SMP.set(gp.x + o.x + (Math.random() - .5) * o.w * 1.3, 2 + Math.random() * 8, gp.z + o.z + (Math.random() - .5) * o.d * 1.3), "dust", 2.4);
          if (Math.random() < dt * 9) debris(SHV.set(gp.x + o.x + (Math.random() - .5) * o.w, o.h + 2, gp.z + o.z + (Math.random() - .5) * o.d), 2, null, 90, 1.1); }
        if (crF % 3 === 0 || u >= 1) place();
        if (u >= 1) { o.cr = null; o.rubble = 1; o.wrecked = 1; unscorch(o.i, o.h); place(); DOOM.splice(j, 1);
          o.fires = [[o.x, o.h + 1, o.z, 1.6], [o.x - o.w * .3, o.h + 1, o.z + o.d * .25, 1.1], [o.x + o.w * .25, o.h + 1, o.z - o.d * .2, 1]]; } } }
    const B = { L, im, dmg,
      // the closest standing building to a world point (for falling wrecks that steer into one), or null
      nearest(wx, wz, maxD) { const gp = seg.group.getWorldPosition(GPV); let best = null, bd = maxD * maxD;
        for (const o of L) { if (o.h < 16) continue; const dx = gp.x + o.x - wx, dz = gp.z + o.z - wz, dd = dx * dx + dz * dz; if (dd < bd) { bd = dd; best = { x: gp.x + o.x, y: o.h, z: gp.z + o.z, o, B }; } } return best; },
      // the building under/at a world point (plane or shot), or null
      // ground fire nearby (a crash): it catches fire; k 0..1 = how close
      ignite(o, k, wx, wz) { if (o.rubble) return; const gp = seg.group.getWorldPosition(GPV), lx = Math.max(o.x - o.w / 2, Math.min(o.x + o.w / 2, wx - gp.x)), lz = Math.max(o.z - o.d / 2, Math.min(o.z + o.d / 2, wz - gp.z));
        if (o.fires.length < 5) o.fires.push([lx, Math.min(o.h - 1, 4 + Math.random() * 10), lz + (lz > o.z ? .6 : -.6), .9 + k]); o.hits += o.hp * .45 * k; o.dmg = Math.max(o.dmg, Math.min(1, o.hits / o.hp)); dmg.setX(o.i, o.dmg); dmg.needsUpdate = true; if (o.hits >= o.hp) doomIt(o, 2.6); },
      hit(wx, wy, wz, rx, rz) { const gp = seg.group.getWorldPosition(GPV), lx = wx - gp.x, lz = wz - gp.z;
        for (const o of L) if (Math.abs(lx - o.x) < o.w / 2 + rx && Math.abs(lz - o.z) < o.d / 2 + rz && wy < o.h + 2) return o; return null; },
      // knock the top off down to `to` (world y) where it was hit: debris falls, windows there go dark, the hole burns
      smash(o, wx, wy, wz, how, wgt) { if (how === "wreck") { const r = B.wreck(o, wx, wy, wz); doomIt(o, 2.4); return r; }
        if (how === "shot") {   // a bullet strike: a bullet hole + sparks + dust right where it hit; past ~35% of its hp it catches fire there,
          // the fire spreads and blackens with every hit, and at 100% it is doomed: ~2 s later it crumbles (crumbleTick)
          const gp = seg.group.getWorldPosition(GPV), lx = Math.max(o.x - o.w / 2 + 1, Math.min(o.x + o.w / 2 - 1, wx - gp.x)), ly = Math.max(2, Math.min(o.h - 1, wy)), lz = o.z + o.d / 2 + .35;   // the face toward you
          const W3 = SHV.set(gp.x + lx, ly, gp.z + lz); if (FX && FX.sparks) FX.sparks(W3, SHN.set(0, .2, 1), null, 1.6, 14); if (FX && FX.glow) FX.glow(W3, 14, [1, .75, .4], .9); if (Math.random() < .6) puff(W3, "dust", .5);
          if (o.rubble || o.cr != null) return o;
          scorch(lx + (Math.random() - .5) * 2, ly + (Math.random() - .5) * 2, lz, 3.2 + Math.random() * 1.8 + (wgt || 1) * .8, o.i);
          o.hits += wgt || 1; const f0 = o.hits / o.hp; o.dmg = Math.max(o.dmg, Math.min(1, f0)); dmg.setX(o.i, o.dmg); dmg.needsUpdate = true;
          if (Math.random() < .35) debris(W3, 1, null, 40, .45);   // a chip of render
          if (f0 >= .35) { const want = Math.min(5, 1 + Math.floor((f0 - .35) * 7)); let near = null, nd = 1e9; for (const f of o.fires) { const d = Math.hypot(f[0] - lx, f[1] - ly); if (d < nd) { nd = d; near = f; } }
            if (o.fires.length < want && (!near || nd > 10)) o.fires.push([lx, ly, lz + .6, .8]); else if (near) near[3] = Math.min(1.9, near[3] + .12); }
          if (f0 >= 1) doomIt(o, 2.1);
          return o; }
        const gp = seg.group.getWorldPosition(GPV), plane = how === "plane", to = plane ? Math.max(6, wy - 18) : Math.max(6, o.h - 4);
        const P = SMP.set(Math.max(o.x - o.w / 2, Math.min(o.x + o.w / 2, wx - gp.x)), Math.min(o.h, wy), Math.max(o.z - o.d / 2, Math.min(o.z + o.d / 2, wz - gp.z)));
        debris(new THREE.Vector3(gp.x + P.x, P.y, gp.z + P.z), plane ? 22 : 5, null, plane ? 120 : 60);
        if (plane || o.h - to > 0) { o.h = to; set(im, o.i, o.x, 0, o.z, 0, o.w, o.h, o.d); im.instanceMatrix.needsUpdate = true; place(); if (o.sign) o.sign.visible = false; }
        o.dmg = Math.min(1, o.dmg + (plane ? .65 : .12)); dmg.setX(o.i, o.dmg); dmg.needsUpdate = true;
        if (o.fires.length < 3) o.fires.push([P.x, o.h + 1, P.z, plane ? 1.4 : .8]); else o.fires.forEach(f => { f[1] = o.h + 1; f[3] = Math.min(1.8, f[3] + .1); });
        if (plane) { o.hits += o.hp * .6; if (o.hits >= o.hp) doomIt(o, 1.8); }   // crashing into it hurts it too: two plane strikes bring it down
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
    const ox = o.ox || 0;   // (a sub-strip offset inside its segment, e.g. the town behind a beach: only used for the road audit)
    const g = new THREE.PlaneGeometry(XW, len).rotateX(-Math.PI / 2), uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * XW - XW / 2 + 160) / CX, (uv.getY(i) * len) / CZ);
    seg.group.add(mesh(g, groundMat(o.style)));
    const lots = [], tall = o.tall || 0, clear = (o.clear || []).concat(o.block || []), palmSpots = [], lampSpots = [];
    // roads that are really there (drawn by the ground texture) minus any a landmark sits on (o.block): traffic, walkers and the audit use these
    const blk = o.block || [], hitsBlk = (x0, x1, z0, z1) => blk.some(b => x1 > b[0] - b[2] / 2 && x0 < b[0] + b[2] / 2 && z1 > b[1] - b[3] / 2 && z0 < b[1] + b[3] / 2);
    const AV = AVE.filter(ax => !hitsBlk(ax - ROAD / 2 - SIDE, ax + ROAD / 2 + SIDE, -len / 2, len / 2) && !(o.reserve || []).includes(ax)), ST = streetsOf(len).filter(z => !hitsBlk(-XW / 2, XW / 2, z - ROAD / 2 - SIDE, z + ROAD / 2 + SIDE));
    if (seg.roads) seg.roads.push({ grid: 1, ox, aves: AVE, strs: streetsOf(len), x0: ox - XW / 2, x1: ox + XW / 2 });
    if (seg.blocked && !o.noAuditBlock) blk.forEach(b => seg.blocked.push([b[0] + ox, b[1], b[2], b[3]]));
    // a review billboard beside the flight path on most city strips (in the lot between the 1st and 2nd avenue)
    let sd0; if (!o.noBillboard && (sd0 = bbDue())) { const sd = sd0, bx = sd * (196 + R() * 26), bz = (R() - .5) * len * .45; clear.push([bx, bz, 90, 60]); billboard(seg.group, bx, bz, -sd * .28); }
    const free = (x, z, w, d) => !clear.some(c => Math.abs(x - c[0]) < (w + c[2]) / 2 && Math.abs(z - c[1]) < (d + c[3]) / 2);
    const houses = [];
    for (let ax = 0; ax < AVE.length - 1; ax++) { const x0 = AVE[ax] + ROAD / 2 + SIDE + 4, x1 = AVE[ax + 1] - ROAD / 2 - SIDE - 4;
      for (let z0 = -len / 2 + ROAD / 2 + SIDE + 4; z0 < len / 2 - 40; z0 += CZ) { const z1 = Math.min(len / 2 - 6, z0 + CZ - ROAD - 2 * SIDE - 8);
        if (o.res && !(o.mixed && Math.abs(AVE[ax] + AVE[ax + 1]) > 900 && R() < .5)) {   // LA single-storey homes: two rows per block, facing the cross streets, lawns in front
          const n = Math.max(3, Math.floor((x1 - x0) / 40)), hw = (x1 - x0) / n;
          for (const row of [0, 1]) for (let q = 0; q < n; q++) { if (R() < .08) continue; const w = hw * (.6 + R() * .18), d = 26 + R() * 8, x = x0 + hw * (q + .5) + (R() - .5) * 4, z = row ? z1 - 14 - d / 2 - R() * 4 : z0 + 14 + d / 2 + R() * 4;
            if (z1 - z0 < 70 && row) continue; if (free(x, z, w, d)) houses.push([x, z, w, d, 10 + R() * 3, row]); }
          if (R() < .5) palmSpots.push([x0 + (x1 - x0) * R(), (z0 + z1) / 2]);
          continue; }
        const nx = 2 + (R() * 2 | 0), nz = 1 + (R() * 2 | 0), bw = (x1 - x0) / nx, bd = (z1 - z0) / nz;
        for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { if (R() < .14) continue; const w = bw * (.62 + R() * .3), d = bd * (.6 + R() * .32), x = x0 + bw * (i + .5), z = z0 + bd * (j + .5);
          if (!free(x, z, w, d)) continue; const inField = Math.abs(x) < 240, hmax = inField ? (tall ? 104 : 62) * Math.min(1, o.hmul || 1) : (tall ? 250 : 96) * (o.hmul || 1);   /* the flight lane never gets taller than before (balance): only the skyline either side grows */   // lower skyline: you cruise above it, dive to hit the tall ones
          lots.push([x, z, w, d, (o.hmin || 12) + Math.pow(R(), tall > 1 ? 1.2 : 1.9) * hmax]); } } }
    if (lots.length) buildings(seg, R, lots, { style: o.bstyle, tints: o.tints });
    if (houses.length) homes(seg, R, houses);
    for (const ax of AVE) for (let z = -len / 2 + 30; z < len / 2; z += o.palmGap || 52) { for (const sd of [-1, 1]) { const x = ax + sd * (ROAD / 2 + 4); if (free(x, z, 6, 6) && R() < .8) palmSpots.push([x, z]); } }
    palms(seg, R, palmSpots, o.palmS);
    for (const ax of [-160, 160]) for (let z = -len / 2 + 60; z < len / 2; z += 115) lampSpots.push([ax + ROAD / 2 + 2, z, 0], [ax - ROAD / 2 - 2, z + 57, Math.PI]);
    streetLamps(seg, lampSpots.filter(s => Math.abs(s[1]) < len / 2 - 4 && free(s[0], s[1], 4, 4)));
    // pedestrians on the sidewalks (engine3d crowd only): walkers both ways along every avenue, a few people chatting by the corners
    const E = getE(); if (E && !o.noPeds) { const dens = (O.density ? O.density() : 1) * (o.res ? .5 : 1), C = BEACH.makeCrowdE(E, seg.group), half = ROAD / 2 + SIDE / 2;
      for (const ax of AV) for (const sd of [-1, 1]) { const n = Math.round((2 + R() * 3) * dens); for (let i = 0; i < n; i++) { const z0 = (R() - .5) * len, sp = (7 + R() * 5) * (R() < .5 ? 1 : -1), x = ax + sd * (half + (R() - .5) * 4);
          C.add("street", R, { x, z: z0, ry: sp > 0 ? 0 : Math.PI, pose: "walk", tick: (c, t) => { c.z = ((z0 + t * sp + len * 50) % len) - len / 2; } }); }
        if (R() < .5 * dens) { const z = (Math.floor(R() * (len / CZ)) - .5) * CZ * .5, x = ax + sd * (half + 1); for (let k = 0; k < 2 + (R() * 2 | 0); k++) C.add("street", R, { x: x + (R() - .5) * 5, z: z + (R() - .5) * 6, ry: R() * TAU, pose: "stand" }); } }
      (seg.crowds = seg.crowds || []).push(C); seg.tick.push((t, dt, near) => C.update(t, dt, near)); }
    // traffic: engine3d/traffic.js (signals, stops, turns, brake lights, crossing pedestrians) when the page has it, else the simple loop.
    // Hard rule: cars only ever use the lanes of real (drawn, unblocked) roads: AV × ST.
    const TR = !o.noTraffic && O.traffic && O.traffic();
    if (TR && AV.length && ST.length) { const net = TR.network(seg.group, { avenues: AV, streets: ST, len, width: XW * .9, road: ROAD, lane: 8, cars: (o.cars || 30) * 1.9, parked: o.parked != null ? o.parked : 22, parkedAt: o.parkedAt, crowd: getE(), pedestrians: 12, rng: R });
      (seg.nets = seg.nets || []).push(net); if (seg.carSrc) seg.carSrc.push(() => netPts(net, ox)); }
    else { const lanes = []; for (const ax of AV) lanes.push(["z", ax - 8, 1], ["z", ax + 8, -1]);
      for (const z of ST) lanes.push(["x", z + 8, 1], ["x", z - 8, -1]);
      if (lanes.length) cars(Object.assign(seg, { ox }), R, o.cars || 30, len, lanes); }
    return { AV, ST };   // the real (drawn, unblocked) avenues and cross streets; o.reserve avenues are drawn but left to the caller (e.g. Hollywood Blvd)
  }
  // where every car of a traffic network is right now (network-local = segment-local + ox): same maths as traffic.js update()
  function netPts(net, ox) { const out = [];
    for (const car of net.cars) { let x, z; if (car.turn) { const T = car.turn, u = Math.min(1, T.u), a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u; x = a * T.P0[0] + b * T.P1[0] + c * T.P2[0]; z = a * T.P0[1] + b * T.P1[1] + c * T.P2[1]; }
      else { const L = car.L; x = L.ax === "z" ? L.c : car.s; z = L.ax === "z" ? car.s : L.c; } out.push([x + ox, z]); }
    for (const p of net.parked) out.push([p.x + ox, p.z, 1]); return out; }
  // LA homes: stucco boxes with hip roofs (two instanced draws per strip), garage doors toward the street, a few with solar panels
  const roofHipG = (() => { const g = new THREE.ConeGeometry(.75, .42, 4, 1).rotateY(Math.PI / 4); g.translate(0, .21, 0); return g; })();
  const HOUSE = ["#efe3cc", "#e2cfae", "#f3efe6", "#d9c3a0", "#c7d3cf", "#ecd2b4", "#d6cdbd", "#f0dcc0", "#bfc9b8", "#e8d8c8"], ROOFC = ["#6e4c3a", "#5d5752", "#7a3d2f", "#8a8478", "#4f4a46", "#9a6a4e"];
  const homeM = new THREE.MeshLambertMaterial(), homeRoofM = new THREE.MeshLambertMaterial();
  function homes(seg, R, hs) { const n = hs.length, wall = inst(box, homeM, n, true), roof = inst(roofHipG, homeRoofM, n, true), gar = inst(box, M.dark, n);
    hs.forEach((h, i) => { const [x, z, w, d, ht, row] = h; set(wall, i, x, 0, z, 0, w, ht, d); set(roof, i, x, ht - .2, z, 0, w * 1.42, ht * .9, d * 1.42);
      wall.instanceColor.setXYZ(i, ...QC.set(HOUSE[(R() * HOUSE.length) | 0]).toArray()); roof.instanceColor.setXYZ(i, ...QC.set(ROOFC[(R() * ROOFC.length) | 0]).toArray());
      set(gar, i, x + w * .22, 0, z + (row ? 1 : -1) * (d / 2 + .1), 0, w * .32, ht * .62, .4); });
    seg.group.add(wall, roof, gar); }

  /* ---------- landmarks ---------- */
  // Melody faces a cross street: its front wall sits on the sidewalk line of the street nearest the strip's middle
  function melodyZ(len) { const st = streetsOf(len); let z = st[0]; for (const q of st) if (Math.abs(q - 20) < Math.abs(z - 20)) z = q;
    const front = z - ROAD / 2 - SIDE, BD = 96;
    return { street: z, front, cz: front - BD / 2, parked: (side) => [0, 1, 2, 3].map(i => [side * (-40 + i * 34) + (i > 1 ? side * 40 : 0), z - ROAD / 2 + 4, Math.PI / 2 * (i % 2 ? 1 : -1) * 0 - Math.PI / 2])
      .concat([0, 1, 2, 3, 4, 5, 6].map(k => [-118 + k * 36, z + ROAD / 2 - 4, Math.PI / 2])) }; }   // (+ the far kerb lined with cars on a busy night)
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
      // 2026-10-19 (Antidote: "people outside the bar, a security guard at the door"): a second guard on the other side of the door,
      // groups hanging out on the sidewalk (talking, laughing, on their phones), a pair by the patio fence; they stay put while the line moves
      const g2 = C.add("street", R, { x: cx + dx + side * 10, z: lineZ - 1, ry: 0, pose: "stand" }); g2.idle = "idle"; { const L = g2.p.look; L.top = [.04, .04, .05, 3]; L.bot = [.03, .03, .04, 3]; L._pk = null; } g2.tx = g2.x; g2.tz = g2.z;
      const HANG = ["talk", "laugh", "phone", "talk", "text", "laugh"]; for (let gi = 0; gi < 3; gi++) { const gx = cx + dx - side * (26 + gi * 15), gz = lineZ + 1.5;
        for (let k = 0; k < 3; k++) { const a = k / 3 * TAU + gi, c = C.add("street", R, { x: gx + Math.cos(a) * 2.2, z: gz + Math.sin(a) * 2.2, ry: Math.atan2(-Math.cos(a), -Math.sin(a)), pose: "stand" }); c.idle = HANG[(gi + k) % HANG.length]; c.tx = c.x; c.tz = c.z; c.hang = 1; } }
      const goers = []; let nextIn = 4 + R() * 3, nextOut = 7 + R() * 6, doorOpen = 0;
      // walkers: move toward (tx, tz) at their pace, then hold their idle
      const walkTo = (c, x, z, sp) => { c.tx = x; c.tz = z; c.sp = sp || 11; };
      C.list.forEach(c => { if (c.hang) { c.tick = null; return; } c.tick = (cc, t, dt) => { const dX = cc.tx - cc.x, dZ = cc.tz - cc.z, d = Math.hypot(dX, dZ);
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
    // the door: a host stand with a lamp where security checks IDs (a flashlight blinks on now and then)
    const pod = new THREE.Group(); pod.position.set(cx + dx - side * 15, 0, cz + BD / 2 + 3); seg.group.add(pod); pod.add(mesh(new THREE.BoxGeometry(3, 5, 2.4).translate(0, 2.5, 0), M.dark), mesh(new THREE.BoxGeometry(3.6, .5, 3).translate(0, 5.2, 0), M.gold));
    const podL = mesh(new THREE.SphereGeometry(.6, 6, 4), M.lamp, 0, 6.2, 0); pod.add(podL);
    seg.tick.push((t, dt, near) => { if (near && FX && FX.glow && (t % 3.7) < .9) FX.glow(SMP.set(seg.group.position.x + cx + dx - side * 10, 5, seg.group.position.z + lineZ + 1.5), 6, [1, .97, .85], .9); });
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
    seg.melody = { x: cx, z: cz, front: cz + BD / 2, line: lineState }; seg.focus = { x: cx, z: cz + BD / 2, y: 6, d: 150, h: 150 };
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
    for (const sx of [-300, 300]) { roadStrip(seg, sx, 24, len, 1); } cars(seg, R, 8, len, [["z", -306, 1], ["z", -294, -1], ["z", 294, 1], ["z", 306, -1]]);   // airport service roads (cars stay on them)
  }
  function stadium(seg, R, len, side) { city(seg, R, len, { block: [[side * 40, 0, 360, 330]], cars: 22, style: seg.kind === "stadium" && seg.oc ? "oc" : null });
    const lot = new THREE.PlaneGeometry(380, 350).rotateX(-Math.PI / 2); seg.group.add(mesh(lot, lotMat(), side * 40, .15, 0));   // the stadium's own parking lot covers the streets under it
    const g = new THREE.Group(); g.position.set(side * 40, 0, 0); seg.group.add(g);
    const bowl = new THREE.LatheGeometry([new THREE.Vector2(100, 0), new THREE.Vector2(150, 0), new THREE.Vector2(150, 30), new THREE.Vector2(118, 34), new THREE.Vector2(100, 6)], 40); bowl.scale(1, 1, .75);
    g.add(mesh(bowl, new THREE.MeshLambertMaterial({ color: 0xc9ccd2, side: THREE.DoubleSide })));
    const pitch = new THREE.CircleGeometry(100, 32).rotateX(-Math.PI / 2); pitch.scale(1, 1, .75); g.add(mesh(pitch, new THREE.MeshLambertMaterial({ color: 0x3f8a3a }), 0, 1, 0));
    const lines = []; for (let i = -4; i <= 4; i++) lines.push([new THREE.PlaneGeometry(1.2, 110).rotateX(-Math.PI / 2), T4(i * 18, 1.3, 0, 0, Math.PI / 2, 0)]); g.add(mesh(merge(lines), M.white));
    const roof = new THREE.TorusGeometry(140, 4, 6, 40).rotateX(Math.PI / 2); roof.scale(1, .75, 1); g.add(mesh(roof, M.gold, 0, 40, 0));
    const tw = inst(new THREE.CylinderGeometry(1, 1.4, 70, 5).translate(0, 35, 0), M.dark, 4), lt = inst(new THREE.BoxGeometry(12, 6, 2).translate(0, 70, 0), M.lamp, 4, true);
    [[-150, -112], [150, -112], [-150, 112], [150, 112]].forEach((p, i) => { set(tw, i, p[0], 0, p[1], 0); set(lt, i, p[0], 0, p[1], Math.atan2(p[0], p[1])); lt.instanceColor.setXYZ(i, 2, 2, 1.8); }); g.add(tw, lt); }
  // a straight two-lane road laid over terrain/grass (asphalt, kerb lines, dashed centre) — registered for the road audit
  let ROADSTRIP_M = null;
  function roadStrip(seg, x, w, len, dash) { const m = ROADSTRIP_M || (ROADSTRIP_M = new THREE.MeshLambertMaterial({ color: 0x2b2c31 }));
    seg.group.add(mesh(new THREE.PlaneGeometry(w, len).rotateX(-Math.PI / 2), m, x, .25, 0));
    const marks = [[new THREE.PlaneGeometry(.9, len).rotateX(-Math.PI / 2), T4(x - w / 2 + 1.5, .32, 0)], [new THREE.PlaneGeometry(.9, len).rotateX(-Math.PI / 2), T4(x + w / 2 - 1.5, .32, 0)]];
    if (dash) for (let z = -len / 2 + 10; z < len / 2 - 10; z += 26) marks.push([new THREE.PlaneGeometry(1, 12).rotateX(-Math.PI / 2), T4(x, .33, z)]);
    seg.group.add(mesh(merge(marks), dash ? M.white : M.white));
    if (seg.roads) seg.roads.push({ strip: [x - w / 2, x + w / 2, -len / 2, len / 2] }); }
  let LOT_M = null;
  const lotMat = () => LOT_M || (LOT_M = new THREE.MeshLambertMaterial({ map: (() => { const c = mkc(256, 256), x = c.getContext("2d"); x.fillStyle = "#3a3b40"; x.fillRect(0, 0, 256, 256);
    x.strokeStyle = "rgba(235,235,230,.7)"; x.lineWidth = 1.4; for (let r = 0; r < 4; r++) for (let q = 4; q < 252; q += 9) { x.beginPath(); x.moveTo(q, 14 + r * 62); x.lineTo(q, 40 + r * 62); x.stroke(); }
    const t = tex(c, true); t.repeat.set(3, 3); return t; })() }));
  /* hills (o.sign: the Hollywood hillside with the white letters · o.mtn: the San Gabriels, big ridges either side of a canyon road).
     The two roads (x = ±160) are real roads: the terrain is flattened under them and the cars stay on them. */
  const SIGN_TEX = {};
  const letterTex = (ch) => SIGN_TEX[ch] || (SIGN_TEX[ch] = (() => { const c = mkc(96, 128), x = c.getContext("2d"); x.fillStyle = "#fff"; x.font = "900 118px 'Arial Narrow',Arial,sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(ch, 48, 70); return tex(c, false); })());
  function hills(seg, R, len, o = {}) {
    const ss = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
    // strip ends: hills settle to flat ground (they meet city strips); mountains settle to one shared ridge profile (they meet each other), so no seams
    const ridge = (x) => { const ax = Math.abs(x); return Math.min(380, Math.max(0, ax - 240) * .55) * (.8 + .2 * Math.sin(ax * .011)); };
    const hf = (x, z) => { const e = ss(len / 2, len / 2 - 140, Math.abs(z)); let h = Math.max(0, (Math.sin(x * .007 + seg.seed) * .5 + .5) * (Math.sin(z * .011 + x * .003) * .5 + .5)) * (Math.abs(x) > 200 ? 110 : 55);
      if (o.mtn) { const ax = Math.abs(x); h = ridge(x) + e * (h * .6 + Math.min(430, Math.max(0, ax - 240) * .62) * (.62 + .38 * (Math.sin(z * .006 + x * .004 + seg.seed) * .5 + .5)) + 40 * Math.max(0, Math.sin(x * .02 + z * .013)) - ridge(x)); }
      else h *= e;
      if (o.sign) h += e * 210 * Math.exp(-(((x + 400) / 250) ** 2) - (((z + 70) / 190) ** 2));
      const d = Math.min(Math.abs(x + 160), Math.abs(x - 160)); return Math.max(0, h) * ss(ROAD / 2 + 6, ROAD / 2 + 70, d); };
    const g = new THREE.PlaneGeometry(XW, len, 80, o.mtn ? 24 : 16).rotateX(-Math.PI / 2), p = g.attributes.position, col = [];
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), h = hf(x, z); p.setY(i, h);
      if (o.mtn) { const u = Math.min(1, h / 380), rock = ss(.55, .9, u); col.push(.27 + u * .12 + rock * .2, .3 + u * .05 + rock * .14, .17 + rock * .2); }   // chaparral → bare granite up high
      else { const u = h / 110; col.push(.3 + u * .25, .36 + u * .12, .2 + u * .05); } }
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); seg.group.add(mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true })));
    for (const sx of [-160, 160]) roadStrip(seg, sx, ROAD, len, 1);
    if (o.mtn) for (const ez of [-len / 2, len / 2]) {   // end skirts: where the range meets flat city, a rock face instead of a see-through gap
      const sk = new THREE.PlaneGeometry(XW, 1, 80, 1), q = sk.attributes.position; for (let i = 0; i < q.count; i++) { const x = q.getX(i); q.setXYZ(i, x, q.getY(i) > 0 ? hf(x, ez) : -2, 0); } sk.computeVertexNormals();
      seg.group.add(mesh(sk, new THREE.MeshLambertMaterial({ color: 0x4a4636, side: THREE.DoubleSide }), 0, 0, ez)); }
    const offRoad = (x) => Math.abs(Math.abs(x) - 160) > ROAD / 2 + 26;
    // chaparral / scrub oak (one instanced draw)
    const sh = []; for (let i = 0; i < (o.mtn ? 220 : 90); i++) { const x = (R() - .5) * XW * .95, z = (R() - .5) * len * .95; if (!offRoad(x)) continue; sh.push([x, z, hf(x, z)]); }
    const shM = inst(new THREE.DodecahedronGeometry(5, 0).scale(1, .7, 1).translate(0, 2.6, 0), new THREE.MeshLambertMaterial({ color: 0xffffff }), sh.length, true);
    sh.forEach((q, i) => { const k = .7 + R() * 1.1; set(shM, i, q[0], q[2] - 1, q[1], R() * 6, k, k * (.8 + R() * .5), k); shM.instanceColor.setXYZ(i, ...QC.set(["#6a7a44", "#7d7a4a", "#5d7040", "#8a7f52", "#56683c"][(R() * 5) | 0]).toArray()); }); seg.group.add(shM);
    if (!o.mtn) { const hs = [], pl = []; for (let i = 0; i < 46; i++) { const x = (R() - .5) * XW * .8, z = (R() - .5) * len * .9; if (!offRoad(x) || (o.sign && x < -150 && x > -700 && Math.abs(z) < 260)) continue; const h = hf(x, z); hs.push([x, z, 14 + R() * 10, 12 + R() * 8, 8 + R() * 8, h]); if (R() < .7) pl.push([x + 14, z + 8, h]); }
      const im = new THREE.InstancedMesh(box, [M.white, M.white, M.wine, M.wine, M.white, M.white], Math.max(1, hs.length)); im.count = hs.length; im.frustumCulled = false; hs.forEach((b, i) => set(im, i, b[0], b[5] - 2, b[1], R() * 3, b[2], b[4], b[3])); seg.group.add(im);
      const tr = inst(trunkG, M.trunk, pl.length), cr = inst(crownG, M.leaf, pl.length); pl.forEach((q, i) => { set(tr, i, q[0], q[2] - 1, q[1], R() * 6); set(cr, i, q[0], q[2] - 1, q[1], R() * 6); }); seg.group.add(tr, cr); }
    const mx = o.mtn ? 620 : 420, mast = mesh(new THREE.CylinderGeometry(.8, 2.2, 140, 4).translate(0, 70, 0), M.white, mx, hf(mx, 0), 0); seg.group.add(mast);   // a radio mast with a blinking red light
    const red = mesh(new THREE.SphereGeometry(2.6, 6, 4), M.lamp.clone(), mx, hf(mx, 0) + 141, 0); red.material.color.setRGB(2, .1, .1); seg.group.add(red);
    seg.tick.push((t) => { red.visible = (t % 1.4) < .7; });
    if (o.sign) {   // the white letters on the hillside (generic block letters, no logo), each on its own scaffold, facing the valley
      const word = "HOLLYWOOD", lw = 40, x0 = -400 - (word.length - 1) * lw / 2, zf = 40, legs = [];
      for (let k = 0; k < word.length; k++) { const x = x0 + k * lw, y = hf(x, zf), pl = mesh(new THREE.PlaneGeometry(34, 46), new THREE.MeshBasicMaterial({ map: letterTex(word[k]), transparent: true, alphaTest: .4, side: THREE.DoubleSide, color: 0xeeeeea }), x, y + 25, zf);
        pl.rotation.x = -.32; seg.group.add(pl); legs.push([new THREE.BoxGeometry(.7, 26, .7), T4(x - 9, y + 11, zf - 6)], [new THREE.BoxGeometry(.7, 26, .7), T4(x + 9, y + 11, zf - 6)]); }
      seg.group.add(mesh(merge(legs), M.dark)); seg.sign = { x: -400, z: zf }; seg.focus = { x: -400, z: zf, y: hf(-400, zf) + 25, d: 330, h: 90 }; }
    cars(seg, R, o.mtn ? 8 : 6, len, [["z", -166, 1], ["z", -154, -1], ["z", 154, 1], ["z", 166, -1]]);
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
    const cityG = new THREE.Group(); cityG.position.x = 1410; seg.group.add(cityG); city({ group: cityG, tick: seg.tick, blds: seg.blds || (seg.blds = []), crowds: seg.crowds || (seg.crowds = []), roads: seg.roads, blocked: seg.blocked, carSrc: seg.carSrc }, R, len, { cars: 14, noPeds: true, noTraffic: true, noBillboard: true, ox: 1410, style: kind === "octown" ? "res" : null, res: kind === "octown" });
    // boardwalk shops (low, colourful, awnings) + palms
    const shops = [], aw = [], pz0 = kind === "venice" ? -len * .12 : 1e9; for (let z = -len / 2 + 20; z < len / 2 - 20 && kind !== "oceanave"; z += 34 + R() * 10) { const w = 40 + R() * 20, d = 26 + R() * 6, h = 14 + R() * 12; if (Math.abs(z - pz0) < 95) continue; shops.push([186 + R() * 10, z, w, d, h]); aw.push([186 - w / 2 - 3, z, d * .9]); }
    const sh = new THREE.InstancedMesh(box, new THREE.MeshLambertMaterial(), shops.length); sh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(shops.length * 3), 3); sh.frustumCulled = false;
    const SHOP = ["#f4d8b0", "#7ec8c0", "#f29a8a", "#f6efe0", "#c8a8e0", "#f0d375", "#8fc0e8"]; shops.forEach((b, i) => { set(sh, i, b[0], 0, b[1], Math.PI / 2, b[3], b[4], b[2]); sh.instanceColor.setXYZ(i, ...QC.set(SHOP[(R() * SHOP.length) | 0]).toArray()); }); seg.group.add(sh);
    const awM = inst(new THREE.BoxGeometry(6, .8, 1).translate(0, 9, 0), M.wine, aw.length, true); aw.forEach((a, i) => { set(awM, i, a[0], 0, a[1], 0, 1, 1, a[2]); awM.instanceColor.setXYZ(i, ...QC.set(TOWEL[i % TOWEL.length]).toArray()); }); seg.group.add(awM);
    const pl = []; for (let z = -len / 2 + 14; z < len / 2; z += 38) pl.push([116, z + R() * 8], [150, z + 19]); palms(seg, R, pl.filter(p => Math.abs(p[1] - pz0) > 75));   // (no palms in front of Nalu Vida)
    BEACH.populate(seg, R, len, SHORE, H);   // the water, the seabed and everyone on the beach and in the waves (beach3d.js)
    if (kind === "pier" || kind === "venice") pier(seg, R, len, kind);
    if (kind === "oceanave") {   // Santa Monica: Palisades Park on the bluff (lawn + very tall fan palms), Ocean Avenue right behind it
      seg.group.add(mesh(new THREE.PlaneGeometry(128, len).rotateX(-Math.PI / 2), M.grass, 218, .18, 0));
      roadStrip(seg, 300, 34, len, 1); cars(seg, R, 12, len, [["z", 292, 1], ["z", 308, -1]]);
      const tp = []; for (let z = -len / 2 + 10; z < len / 2; z += 30) tp.push([170 + R() * 10, z + R() * 8], [250 + R() * 20, z + 15 + R() * 6], [327, z + 6]); palms(seg, R, tp, 2.1);
      const lamps = []; for (let z = -len / 2 + 30; z < len / 2; z += 90) lamps.push([280, z, Math.PI], [320, z + 45, 0]); streetLamps(seg, lamps); }
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
    if (kind === "pier") { seg.focus = { x: -330, z: pz - 30, y: 50, d: 380, h: 120 }; const wheel = new THREE.Group(); wheel.position.set(-430, 70, -30); g.add(wheel); wheel.add(mesh(new THREE.TorusGeometry(46, 1.4, 6, 40), M.white));
      const spk = []; for (let i = 0; i < 12; i++) spk.push([new THREE.BoxGeometry(.8, 92, .8), T4(0, 0, 0, 0, 0, i / 12 * Math.PI)]); wheel.add(mesh(merge(spk), M.white));
      const cabs = inst(new THREE.BoxGeometry(6, 6, 6), M.lamp, 12, true); wheel.add(cabs); g.add(mesh(new THREE.CylinderGeometry(2, 3, 60, 5).translate(0, 30, 0), M.white, -430, 12, -30));
      seg.tick.push((t) => { wheel.rotation.z = t * .25; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU - t * .25; set(cabs, i, Math.cos(a) * 46, Math.sin(a) * 46 - 4, 0, 0); cabs.instanceColor.setXYZ(i, ...[[1.8, .4, .5], [1.8, 1.5, .4], [.4, 1.2, 1.8]][i % 3]); } cabs.instanceMatrix.needsUpdate = true; cabs.instanceColor.needsUpdate = true; }); }
    if (kind === "venice") {   // Nalu Vida where it really is: 1 Washington Blvd — on land at the FOOT of the Venice Pier (right of the sand +
      // the beach walk), the old Pier House: a 2-storey beach bar facing the sand and the pier, open front + patio under orange/teal
      // umbrellas and string lights, a roof deck, the NALU VIDA logo big on the roof (readable from the plane) and on the front,
      // Washington Blvd running inland behind it with palms. Never a building target (not in seg.blds): it can't be damaged.
      const nx = 150, n = new THREE.Group(); n.position.set(nx, 0, pz); n.scale.setScalar(1.3); seg.group.add(n);   // a touch larger than life so it reads from the plane
      /* 2026-10-19 (Antidote: "make the building look more like the real Nalu Vida and light it up"), from the repo's own photo
         (demo/nalu-vida/img/hero.jpg): dark-brown cedar shingle walls, coral-pink posts, beams, fascia and window frames, the
         neon sign on the front (blue "nalu vida" under an orange sunset and a green palm), warm-lit windows and open front, white
         umbrellas, a pink rail round the patio, and exterior lighting: uplights washing the shingles, sconces, the neon's glow,
         lit palms either side and a warm pool of light on the sand. The round logo (img/logo.png) stays on the roof for the plane. */
      const shTex = (() => { const c = mkc(256, 256), x = c.getContext("2d"), R2 = rng(71); x.fillStyle = "#3b2a1f"; x.fillRect(0, 0, 256, 256);
        for (let r = 0; r < 16; r++) for (let q = 0; q < 12; q++) { const w = 18 + R2() * 8, xx = q * 22 + (r % 2) * 11 - 6, v = 40 + R2() * 34; x.fillStyle = `rgb(${v + 18 | 0},${v * .72 | 0},${v * .5 | 0})`; x.fillRect(xx, r * 16, w, 15); x.fillStyle = "rgba(0,0,0,.35)"; x.fillRect(xx, r * 16 + 13, w, 3); }
        const t = tex(c, true); t.repeat.set(4, 1.2); return t; })();
      const shingle = new THREE.MeshStandardMaterial({ map: shTex, roughness: .92 }), coral = new THREE.MeshStandardMaterial({ color: 0xe8837a, roughness: .55, emissive: 0x401512, emissiveIntensity: .35 });
      const winTexN = (() => { const c = mkc(512, 64), x = c.getContext("2d"); x.fillStyle = "#3b2a1f"; x.fillRect(0, 0, 512, 64); for (let q = 0; q < 8; q++) { const xx = 14 + q * 63; if (q === 3 || q === 4) continue; x.fillStyle = "#e8837a"; x.fillRect(xx, 6, 46, 52); const g = x.createLinearGradient(0, 10, 0, 54); g.addColorStop(0, "#ffd9a0"); g.addColorStop(1, "#c9783a"); x.fillStyle = g; x.fillRect(xx + 4, 10, 38, 44); x.fillStyle = "#e8837a"; x.fillRect(xx + 21, 10, 3, 44); x.fillRect(xx + 4, 30, 38, 3); } return tex(c, false); })();
      const neonTex = (() => { const c = mkc(512, 192), x = c.getContext("2d"); x.lineCap = "round"; x.lineJoin = "round";
        const glowS = (col, w, blur, fn) => { x.save(); x.shadowColor = col; x.shadowBlur = blur; x.strokeStyle = col; x.lineWidth = w; fn(); x.restore(); };
        for (let k = 0; k < 3; k++) glowS("#ff8a2a", 6, 18, () => { x.beginPath(); x.arc(250, 92, 70 - k * 16, Math.PI * 1.08, Math.PI * 1.92); x.stroke(); });   // the sunset
        glowS("#ff5a2a", 5, 14, () => { x.beginPath(); x.moveTo(170, 96); x.lineTo(330, 96); x.stroke(); });
        glowS("#4dff7a", 5, 14, () => { x.beginPath(); x.moveTo(318, 96); x.quadraticCurveTo(322, 60, 330, 30); x.stroke(); [[-1, .2], [1, .1], [-1, -.5], [1, -.6], [0, -1]].forEach(([sx, sy]) => { x.beginPath(); x.moveTo(330, 30); x.quadraticCurveTo(330 + sx * 22, 16 + sy * 10, 330 + sx * 36, 30 - sy * 14); x.stroke(); }); });   // the palm
        x.font = "700 70px 'Arial Rounded MT Bold','Trebuchet MS',Arial,sans-serif"; x.textAlign = "center"; x.textBaseline = "middle";
        for (const [b, a] of [[26, .9], [10, 1]]) { x.save(); x.shadowColor = "#3a7dff"; x.shadowBlur = b; x.globalAlpha = a; x.strokeStyle = "#5aa0ff"; x.lineWidth = 7; x.strokeText("nalu vida", 256, 146); x.restore(); }
        x.fillStyle = "#e8f2ff"; x.fillText("nalu vida", 256, 146); return tex(c, false); })();
      n.add(mesh(new THREE.BoxGeometry(70, 2, 100).translate(0, 1, 0), M.wood));                                                        // plinth
      n.add(mesh(new THREE.BoxGeometry(56, 15, 92).translate(8, 9, 0), shingle));                                                     // ground floor (back + sides)
      n.add(mesh(new THREE.BoxGeometry(2, 11, 84).translate(-20.5, 7.5, 0), new THREE.MeshBasicMaterial({ color: 0xffc98a, toneMapped: false })));   // the open front: warm-lit bar inside
      n.add(mesh(new THREE.BoxGeometry(60, 2, 95).translate(6, 17.3, 0), coral));                                                    // coral fascia between the floors
      n.add(mesh(new THREE.BoxGeometry(52, 13, 88).translate(10, 25, 0), shingle));                                                   // upper floor
      const uw = mesh(new THREE.PlaneGeometry(84, 10.5), new THREE.MeshBasicMaterial({ map: winTexN, toneMapped: false, color: new THREE.Color(1.15, 1.1, 1.05) }), -16.1, 25.2, 0); uw.rotation.y = -Math.PI / 2; n.add(uw);   // pink-framed windows, lit
      n.add(mesh(new THREE.BoxGeometry(56, 1.6, 92).translate(10, 32.2, 0), coral));                                                 // coral roof edge
      n.add(mesh(new THREE.BoxGeometry(54, 1.2, 90).translate(10, 31.8, 0), M.wood));                                                 // roof deck
      n.add(mesh(merge([[new THREE.BoxGeometry(54, 2.4, .6), T4(10, 33.6, 45)], [new THREE.BoxGeometry(54, 2.4, .6), T4(10, 33.6, -45)], [new THREE.BoxGeometry(.6, 2.4, 90), T4(-17, 33.6, 0)], [new THREE.BoxGeometry(.6, 2.4, 90), T4(37, 33.6, 0)]]), coral));   // deck rail
      const pst = []; for (let z = -42; z <= 42; z += 12) pst.push([new THREE.BoxGeometry(1.4, 15, 1.4), T4(-21.8, 8.5, z)]); pst.push([new THREE.BoxGeometry(1.6, 1.4, 88), T4(-21.8, 15.4, 0)]); n.add(mesh(merge(pst), coral));   // pink posts + beam on the open front
      // the neon sign on the front wall, between the windows, with its glow on the shingles
      const neon = mesh(new THREE.PlaneGeometry(34, 12.75), new THREE.MeshBasicMaterial({ map: neonTex, transparent: true, depthWrite: false, toneMapped: false, color: new THREE.Color(1.6, 1.6, 1.6) }), -16.6, 25.4, 0); neon.rotation.y = -Math.PI / 2; n.add(neon);
      const ng = mesh(new THREE.PlaneGeometry(44, 18), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0x4a7dff, opacity: .45, toneMapped: false }), -16.3, 25.4, 0); ng.rotation.y = -Math.PI / 2; n.add(ng);
      // the logo: huge on the roof (lying flat, lit) + a sign on the front parapet facing the beach, tipped up toward the plane
      const lr = mesh(new THREE.CircleGeometry(30, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: naluTex, transparent: true, toneMapped: false }), 10, 32.8, 0); n.add(lr);
      n.add(mesh(new THREE.RingGeometry(30, 33, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff8f86, toneMapped: false }), 10, 32.7, 0));
      const lf = mesh(new THREE.CircleGeometry(12, 40), new THREE.MeshBasicMaterial({ map: naluTex, transparent: true, toneMapped: false }), -20, 42, 0); lf.rotation.order = "YXZ"; lf.rotation.y = -Math.PI / 2; lf.rotation.x = -.45; n.add(lf);
      n.add(mesh(merge([[new THREE.CylinderGeometry(.7, .7, 12, 6), T4(-20, 36, -7)], [new THREE.CylinderGeometry(.7, .7, 12, 6), T4(-20, 36, 7)]]), M.dark));
      // exterior lights: uplights along the front + both sides (warm washes on the shingles), sconces by the open front, lit palms
      const wsh = new THREE.MeshBasicMaterial({ map: coneTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffb070, opacity: .38, toneMapped: false, side: THREE.DoubleSide }), wl = [];
      for (let z = -36; z <= 36; z += 18) wl.push([new THREE.PlaneGeometry(10, 16).rotateY(-Math.PI / 2), T4(-16.5, 25, z)]);
      for (const sd of [-1, 1]) for (let x = -10; x <= 30; x += 14) wl.push([new THREE.PlaneGeometry(10, 30), T4(x, 16, sd * 46.6, 0, sd < 0 ? Math.PI : 0, 0)]);
      n.add(mesh(merge(wl), wsh));
      const ups = []; for (let z = -36; z <= 36; z += 18) ups.push([-17, 18.5, z]); for (const sd of [-1, 1]) for (let x = -10; x <= 30; x += 14) ups.push([x, 2.4, sd * 46.6]); for (let z = -40; z <= 40; z += 20) ups.push([-22.6, 12.5, z + 6]);
      const upM = inst(new THREE.SphereGeometry(.7, 5, 4), M.lamp, ups.length, true); ups.forEach((u, i) => { set(upM, i, u[0], u[1], u[2], 0); upM.instanceColor.setXYZ(i, 2, 1.5, .8); }); n.add(upM);
      palms(seg, R, [[nx - 34 * 1.3, pz - 66 * 1.3], [nx - 34 * 1.3, pz + 66 * 1.3]], 1.5);
      for (const sd of [-1, 1]) n.add(mesh(new THREE.PlaneGeometry(14, 40), wsh, -34, 20, sd * 66));   // palm uplights
      seg.naluLights = ups.length;
      // patio on the sand side: deck, tables under orange / teal umbrellas, diners, string lights
      n.add(mesh(new THREE.BoxGeometry(34, 1, 96).translate(-40, .9, 0), M.wood));
      const tb = inst(new THREE.CylinderGeometry(3, 3, .8, 10).translate(0, 4.4, 0), M.white, 12), ub = inst(new THREE.ConeGeometry(7.5, 3.2, 8).translate(0, 12.5, 0), new THREE.MeshLambertMaterial(), 12, true), diners = [];
      for (let i = 0; i < 12; i++) { const x = -48 + (i % 2) * 16, z = -38 + (i / 2 | 0) * 15.5; set(tb, i, x, 1.2, z, 0); set(ub, i, x, 1.2, z, 0); ub.instanceColor.setXYZ(i, ...QC.set(i % 3 === 2 ? "#e8837a" : "#f4f1ea").toArray()); diners.push([nx + x * 1.3, pz + z * 1.3 - 5, 0, -1, 4], [nx + x * 1.3, pz + z * 1.3 + 5, Math.PI, -1, 4]); }
      n.add(tb, ub); crowd(seg.group, R, diners.map(d => [d[0], d[1], d[2], d[3], d[4]]), { y: 2.1, skin: BEACH_SKIN, kind: "beachF" }, seg);   // diners, seated
      const bulbs = []; const swag = (a, b, y) => { for (let k = 1; k < 14; k++) { const u = k / 14; bulbs.push([a[0] + (b[0] - a[0]) * u, y - Math.sin(u * Math.PI) * 4, a[1] + (b[1] - a[1]) * u]); } };
      swag([-57, -46], [-57, 46], 19); swag([-23, -46], [-57, 0], 19); swag([-23, 46], [-57, 0], 19); swag([-17, -45], [37, -45], 38); swag([-17, 45], [37, 45], 38);
      const bl = inst(new THREE.SphereGeometry(.8, 6, 4), M.lamp, bulbs.length, true); bulbs.forEach((b, i) => { set(bl, i, b[0], b[1], b[2], 0); bl.instanceColor.setXYZ(i, 1.8, 1.35, .7); }); n.add(bl);
      for (const z of [-46, 46]) for (const x of [-57, -23]) n.add(mesh(new THREE.CylinderGeometry(.5, .5, 19, 5).translate(x, 9.5, z), coral));
      n.add(mesh(merge([[new THREE.BoxGeometry(.5, .5, 92), T4(-57.5, 4.5, 0)], [new THREE.BoxGeometry(.5, .5, 92), T4(-57.5, 2.5, 0)]].concat([-46, -23, 0, 23, 46].map(z => [new THREE.BoxGeometry(.9, 5, .9), T4(-57.5, 2.5, z)]))), coral));   // the pink patio rail
      // Washington Blvd: from the pier entrance inland (east), palms both sides
      seg.group.add(mesh(new THREE.PlaneGeometry(760, 34).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x2b2c31 }), nx + 40 + 380, .25, pz + 72));
      seg.group.add(mesh(new THREE.PlaneGeometry(760, 1.2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xe3b93a }), nx + 40 + 380, .3, pz + 72));
      const wp = []; for (let x = nx + 50; x < nx + 760; x += 34) wp.push([x, pz + 52], [x + 17, pz + 92]); palms(seg, R, wp);
      const glow = mesh(new THREE.PlaneGeometry(200, 170).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffa860, opacity: .5, toneMapped: false }), -30, 1.2, 0); n.add(glow);
      seg.nalu = { x: nx, z: pz }; lmCount.naluVida = (lmCount.naluVida || 0) + (WARM ? 0 : 1);   // (segment-local)
      if (bbDue(-1)) billboard(seg.group, SHORE + 70, pz + 70, .25, 1.1);   // by the pier, next to Nalu Vida: Antidote's review on a big LED screen
      seg.tick.push((t, dt, near) => { glow.material.opacity = .44 + .06 * Math.sin(t * 2.6); ng.material.opacity = .4 + .08 * Math.sin(t * 17) * Math.sin(t * 3.1);   /* (the neon hums) */ if (near && FX && Math.random() < dt * 2) puff(SMP.set(seg.group.position.x + nx + 30, 36, seg.group.position.z + pz - 30), "steam", 1); });
    }
  }

  /* ---------- the route's other districts (2026-10-17, Antidote: "follow real SoCal geography as the levels go") ----------
     Look-alikes built from primitives, no logos or names on anything. Every road a car uses is a road that is drawn. */
  const WATER_M = () => WATERM || (WATERM = new THREE.MeshStandardMaterial({ color: 0x0f2c3c, roughness: .16, metalness: .25, envMapIntensity: 1.1 }));
  let WATERM = null;
  /* Long Beach: harbor water on the left, Shoreline Drive, the domed arena, shoreline towers, the container terminal across the channel.
     2026-10-19 (Antidote: "the Queen Mary repeats many times ... show it only 2-3 times; make it look like the real ship with steam out
     of the three funnels; add the Aquarium of the Pacific and the Long Beach Grand Prix"): the liner now has a per-level budget (LB:
     at most LINER_MAX per zone visit, never two within LINER_GAP strips), and the shore band between Shoreline Drive and the first
     avenue alternates between the aquarium (wave roof) and the Grand Prix street circuit (walls, curbs, grid, gantry, grandstands, race
     cars). Look-alikes from primitives, no names or logos. */
  // budgets per level (zone visit), in seconds of flight (O.clock): the liner at most 3 times, ≥ LINER_GAP s apart (a 45 s level shows
  // her 2-3 times); the aquarium at most twice, ≥ 14 s apart; every other strip is race day (the start/finish + grid only on the first)
  const LINER_MAX = 3, LINER_GAP = 15, LB = { n: 0, t: -1e9, aq: 0, aqT: -1e9, gp: 0 }, lbClock = () => (O.clock ? O.clock() : performance.now() / 1000);
  function longBeach(seg, R, len, kind) { const WL = -60;
    seg.water = (wx) => wx - seg.group.position.x < WL;
    seg.group.add(mesh(new THREE.PlaneGeometry(2400, len).rotateX(-Math.PI / 2), WATER_M(), WL - 1200, -.6, 0));
    seg.group.add(mesh(new THREE.BoxGeometry(14, 6, len), new THREE.MeshLambertMaterial({ color: 0x8a8378 }), WL + 4, -3, 0));   // the seawall
    const cityG = new THREE.Group(); cityG.position.x = 940; seg.group.add(cityG);
    city({ group: cityG, tick: seg.tick, blds: seg.blds, crowds: seg.crowds || (seg.crowds = []), roads: seg.roads, blocked: seg.blocked, carSrc: seg.carSrc, nets: seg.nets || (seg.nets = []) }, R, len, { ox: 940, tall: 2, hmul: kind === "harbor" ? .6 : 1.25, cars: 22, noBillboard: true, bstyle: (R2, h) => h > 70 ? (R2() < .75 ? 1 : 3) : (R2() < .5 ? 0 : 3) });
    // which shore feature this strip gets (warm-up strips get all of them, so every shader is compiled before the flight)
    let lin = WARM, feat = WARM ? 3 : 2; if (!WARM) { const ck = lbClock(); if (LB.n < LINER_MAX && (LB.n === 0 || ck - LB.t >= LINER_GAP)) { lin = true; LB.n++; LB.t = ck; }
      if (!lin && LB.aq < 2 && ck - LB.aqT >= 14) { feat = 1; LB.aq++; LB.aqT = ck; } }   // feat 1 aquarium · 2 grand prix · 3 both (warm-up)
    const gp = feat & 2;
    roadStrip(seg, -25, 30, len, 1); if (gp) raceCars(seg, R, len); else cars(seg, R, 10, len, [["z", -32, 1], ["z", -18, -1]]);   // Shoreline Drive (race day on Grand Prix strips)
    const sp = []; for (let z = -len / 2 + 12; z < len / 2; z += 34) sp.push([-48, z], [-2, z + 17]); palms(seg, R, sp, 1.4);
    let az = null; if (kind === "longbeach") {
      // the domed arena by the water (a round drum, a shallow dome, a ring of lights)
      az = midBlock(len).zc; const ar = new THREE.Group(); ar.position.set(55, 0, az); seg.group.add(ar); seg.blocked.push([55, az, 112, 112]);   /* inside a block: never on a cross street */
      ar.add(mesh(new THREE.CylinderGeometry(52, 54, 22, 40).translate(0, 11, 0), new THREE.MeshLambertMaterial({ color: 0x8fb3c8 })));
      const dome = new THREE.SphereGeometry(52, 32, 10, 0, TAU, 0, Math.PI / 2); dome.scale(1, .32, 1); ar.add(mesh(dome, new THREE.MeshLambertMaterial({ color: 0xd9dcdf }), 0, 22, 0));
      const rl = inst(new THREE.SphereGeometry(1.2, 5, 4), M.lamp, 36, true); for (let k = 0; k < 36; k++) { const a = k / 36 * TAU; set(rl, k, Math.cos(a) * 54.5, 18, Math.sin(a) * 54.5, 0); rl.instanceColor.setXYZ(k, .5, 1.3, 1.9); } ar.add(rl); }
    // the free stretch of the shore band (z), away from the arena
    const fz = az == null ? [-len / 2 + 20, len / 2 - 20] : (az > 0 ? [-len / 2 + 20, az - 66] : [az + 66, len / 2 - 20]);
    if (lin) { liner(seg, -250, -len * .05); seg.focus = { x: -150, z: -len * .05, y: 30, d: 430, h: 170 }; }
    // (the cross streets run on through the shore band to Shoreline Drive: landmarks only go in the blocks between them)
    const st = streetsOf(len).sort((a, b) => a - b), cut = [-len / 2 - 99].concat(st, [len / 2 + 99]), gaps = [];
    for (let k = 0; k < cut.length - 1; k++) { const a = Math.max(fz[0], cut[k] + ROAD / 2 + SIDE + 2), b = Math.min(fz[1], cut[k + 1] - ROAD / 2 - SIDE - 2); if (b - a > 40) gaps.push([a, b]); }
    gaps.sort((p, q) => (q[1] - q[0]) - (p[1] - p[0]));
    if ((feat & 1) && gaps.length) aquarium(seg, R, (gaps[0][0] + gaps[0][1]) / 2, Math.min(170, gaps[0][1] - gaps[0][0]));
    if (gp) grandPrix(seg, R, len, fz, feat & 1, WARM || LB.gp++ === 0, (feat & 1) ? gaps.slice(1) : gaps);
    // the container terminal across the channel: apron, stacks, gantry cranes with red aircraft lights
    const tx = kind === "harbor" ? -430 : -900; seg.group.add(mesh(new THREE.PlaneGeometry(420, len).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x6d6a64 }), tx - 170, .2, 0));
    const CC = ["#b23a2e", "#1f4f8a", "#2f6b3a", "#d9822b", "#e8e6e0", "#6b2a3a", "#2b8a8a", "#7a7a72"], cs = [];
    for (let z = -len / 2 + 20; z < len / 2 - 20; z += 22) for (let r = 0; r < 7; r++) { if (R() < .2) continue; const n = 1 + (R() * 4 | 0); for (let k = 0; k < n; k++) cs.push([tx - 110 - r * 30, k * 8.4, z]); }
    const cm = inst(new THREE.BoxGeometry(24, 8, 9).translate(0, 4, 0), new THREE.MeshLambertMaterial(), cs.length, true); cs.forEach((c, k) => { set(cm, k, c[0], c[1], c[2], 0); cm.instanceColor.setXYZ(k, ...QC.set(CC[(R() * CC.length) | 0]).toArray()); }); seg.group.add(cm);
    const cr = [], nC = Math.max(2, Math.floor(len / 150)); for (let k = 0; k < nC; k++) cr.push([tx + 20, -len / 2 + 70 + k * (len - 140) / Math.max(1, nC - 1)]);
    const crM = inst(craneG(), new THREE.MeshLambertMaterial(), cr.length, true), crL = inst(new THREE.SphereGeometry(1.8, 5, 4), M.lamp, cr.length * 2, true);
    cr.forEach((c, k) => { set(crM, k, c[0], 0, c[1], 0); crM.instanceColor.setXYZ(k, ...QC.set(k % 2 ? "#e9e7e2" : "#c43b2e").toArray()); set(crL, k * 2, c[0] - 120, 68, c[1], 0); set(crL, k * 2 + 1, c[0], 104, c[1], 0); crL.instanceColor.setXYZ(k * 2, 2, .1, .1); crL.instanceColor.setXYZ(k * 2 + 1, 2, .1, .1); });
    seg.group.add(crM, crL); seg.tick.push((t) => { crL.visible = (t % 1.6) < .9; });
  }
  let CRANE_G = null;
  function craneG() { if (CRANE_G) return CRANE_G; const P = [];   // ship-to-shore gantry crane: 4 legs, portal beams, the boom out over the water, the A-frame and the machinery house
    for (const lx of [-16, 16]) for (const lz of [-14, 14]) P.push([new THREE.BoxGeometry(3, 62, 3), T4(lx, 31, lz)]);
    for (const lz of [-14, 14]) P.push([new THREE.BoxGeometry(36, 4, 3), T4(0, 58, lz)]); for (const lx of [-16, 16]) P.push([new THREE.BoxGeometry(3, 4, 31), T4(lx, 58, 0)]);
    P.push([new THREE.BoxGeometry(170, 5, 10), T4(-55, 64, 0)]); P.push([new THREE.BoxGeometry(3, 40, 3), T4(-4, 82, -6, 0, 0, .25)], [new THREE.BoxGeometry(3, 40, 3), T4(-4, 82, 6, 0, 0, .25)]);
    P.push([new THREE.BoxGeometry(2, 70, 2), T4(-50, 84, 0, 0, 0, 1.05)]); P.push([new THREE.BoxGeometry(18, 10, 14), T4(8, 72, 0)]); return (CRANE_G = merge(P)); }
  /* THE QUEEN MARY look-alike (a 1930s three-funnel liner, as she sits at her Long Beach berth). Built once and shared by every
     strip that gets her (LINER_G): a long, slim, faired black hull with sheer (higher at the bow) and a cruiser stern, a thin red
     boot-top at the waterline and a white sheer line, two rows of lit portholes, the tiered white superstructure (promenade, boat
     and sun decks, terraced aft, the bridge with its wings up front) with rows of windows, 24 white lifeboats in davits, three raked
     Cunard-red funnels with black tops and two black bands, two raked masts, ventilator cowls, and steam/smoke drifting from all
     three funnels while she is near. */
  let LINER_G = null;
  function linerParts() { if (LINER_G) return LINER_G; const Lz = 300, N = 44, pos = [], idx = [];
    // the hull, lofted: half-beam b(z) (fine bow, full midships, rounded stern), deck height h(z) (sheer), keel at y 0 (sits 6 below the water)
    const bAt = (u) => { const f = u > .72 ? Math.cos((u - .72) / .28 * Math.PI / 2) ** .8 : u < .08 ? .55 + .45 * Math.sin(u / .08 * Math.PI / 2) : 1; return 17.5 * Math.max(.02, f); };
    const hAt = (u) => 26 + 7 * Math.max(0, u - .55) ** 2 * 4 + 2.2 * Math.max(0, .12 - u) * 8;
    for (let i = 0; i <= N; i++) { const u = i / N, z = -Lz / 2 + u * Lz, b = bAt(u), h = hAt(u), bl = b * (u > .8 ? .55 : .86);   // (the bilge tucks in under the waterline)
      pos.push(-bl, 0, z, -b, h * .45, z, -b, h, z, b, h, z, b, h * .45, z, bl, 0, z); }
    for (let i = 0; i < N; i++) for (const k of [0, 1, 3, 4]) { const a = i * 6 + k, b2 = a + 6; idx.push(a, b2, a + 1, a + 1, b2, b2 + 1); }
    idx.push(0, 1, 5, 1, 4, 5, 1, 2, 4, 2, 3, 4); const e = N * 6; idx.push(e, e + 5, e + 1, e + 1, e + 5, e + 4, e + 1, e + 4, e + 2, e + 2, e + 4, e + 3);   // stern + bow caps
    const hull = new THREE.BufferGeometry(); hull.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); hull.setIndex(idx); hull.computeVertexNormals();
    // the deck (teak) on top of the hull
    const dk = []; for (let i = 0; i < N; i++) { const u0 = i / N, u1 = (i + 1) / N, z0 = -Lz / 2 + u0 * Lz, z1 = -Lz / 2 + u1 * Lz, b0 = bAt(u0) - .3, b1 = bAt(u1) - .3, h0 = hAt(u0) - .1, h1 = hAt(u1) - .1; dk.push(-b0, h0, z0, b0, h0, z0, -b1, h1, z1, b0, h0, z0, b1, h1, z1, -b1, h1, z1); }
    const deck = new THREE.BufferGeometry(); deck.setAttribute("position", new THREE.Float32BufferAttribute(dk, 3)); deck.computeVertexNormals();
    // a window-strip texture for the white superstructure (rows of dark windows; the emissive map lights them warm at dusk)
    const wt = mkc(256, 64), wx2 = wt.getContext("2d"), we = mkc(256, 64), ex = we.getContext("2d"); wx2.fillStyle = "#f1eee6"; wx2.fillRect(0, 0, 256, 64); ex.fillStyle = "#000"; ex.fillRect(0, 0, 256, 64);
    for (let r = 0; r < 2; r++) for (let q = 0; q < 32; q++) { const x = 2 + q * 8, y = 14 + r * 26; wx2.fillStyle = "#2a3038"; wx2.fillRect(x, y, 5, 8); ex.fillStyle = Math.random() < .75 ? "#ffd9a0" : "#5a4a30"; ex.fillRect(x, y, 5, 8); }
    const winM = new THREE.MeshLambertMaterial({ map: tex(wt, true), emissiveMap: tex(we, true), emissive: 0xffffff, emissiveIntensity: .85 }); winM.map.repeat.set(6, 1); winM.emissiveMap.repeat.set(6, 1);
    const sup = [], white = [];
    // tiers: [length, width, height, y0, zc] — long promenade deck, boat deck, sun deck, terraced aft decks, the bridge block forward
    [[196, 30, 8, 25, -4], [150, 26, 7, 33, 0], [96, 22, 6, 40, 6], [34, 28, 6, 25, -116], [22, 24, 5, 31, -104]].forEach(t => sup.push([new THREE.BoxGeometry(t[1], t[2], t[0]), T4(0, t[3] + t[2] / 2, t[4])]));
    white.push([new THREE.BoxGeometry(40, 3, 6), T4(0, 47.5, 64)], [new THREE.BoxGeometry(18, 5, 9), T4(0, 44.5, 62)]);   // bridge wings + wheelhouse
    white.push([new THREE.BoxGeometry(35.2, 1.1, 230), T4(0, 23.6, 0)]);   // the white sheer line just below the promenade deck
    for (let k = 0; k < 6; k++) white.push([new THREE.BoxGeometry(1.4, 3.2, 1.4), T4((k % 2 ? 1 : -1) * 6, 49.5, 30 - k * 16)], [new THREE.CylinderGeometry(1.6, 1.2, 1.4, 8).rotateX(-1.2), T4((k % 2 ? 1 : -1) * 6, 51.6, 31 - k * 16)]);   // ventilator cowls
    const red = [], blk = []; const FZ = [38, -6, -50];   // the three funnels (fore → aft), raked aft
    FZ.forEach((z, k) => { const H = k === 2 ? 30 : 33, m = (yy) => T4(0, 46 + yy, z - yy * .16, -.16, 0, 0, 1.0, 1, 1.32);
      red.push([new THREE.CylinderGeometry(5.6, 6.1, H, 18).translate(0, H / 2, 0), m(0)]);
      blk.push([new THREE.CylinderGeometry(5.7, 5.7, 6, 18).translate(0, H - 3, 0), m(0)], [new THREE.CylinderGeometry(5.75, 5.75, 1.1, 18).translate(0, H - 9, 0), m(0)], [new THREE.CylinderGeometry(5.8, 5.8, 1.1, 18).translate(0, H - 12, 0), m(0)]);
      FZ[k] = [z - (46 + H) * .16 * 0 - H * .16, 46 + H]; });   // (top of each funnel, for the steam)
    blk.push([new THREE.CylinderGeometry(.55, .9, 62, 6).translate(0, 31, 0), T4(0, 26, 112, -.1)], [new THREE.CylinderGeometry(.5, .8, 56, 6).translate(0, 28, 0), T4(0, 40, -82, -.1)]);   // masts
    const boats = []; for (const sd of [-1, 1]) for (let k = 0; k < 12; k++) boats.push([sd * 14.2, 41.5, 46 - k * 9.2]);
    LINER_G = { hull, deck, sup: merge(sup), winM, white: merge(white), red: merge(red), blk: merge(blk), boatG: new THREE.CapsuleGeometry(1.5, 5.2, 3, 8).rotateX(Math.PI / 2).scale(1, .75, 1), boats, funnels: FZ,
      hullM: new THREE.MeshStandardMaterial({ color: 0x121316, roughness: .55, metalness: .1, side: THREE.DoubleSide }), deckM: new THREE.MeshLambertMaterial({ color: 0x9a7a55 }),
      redM: new THREE.MeshStandardMaterial({ color: 0xc8401e, roughness: .55 }), blkM: new THREE.MeshLambertMaterial({ color: 0x141416 }), whiteM: new THREE.MeshLambertMaterial({ color: 0xf2efe8 }) };
    [LINER_G.hull, LINER_G.deck, LINER_G.sup, LINER_G.white, LINER_G.red, LINER_G.blk, LINER_G.boatG].forEach(g => SHARED.add(g)); return LINER_G; }
  function liner(seg, x, z) { const P = linerParts(), g = new THREE.Group(); g.position.set(x, -6, z); seg.group.add(g); seg.blocked.push([x, z, 40, 320]);
    g.add(mesh(P.hull, P.hullM), mesh(P.deck, P.deckM), mesh(P.sup, P.winM), mesh(P.white, P.whiteM), mesh(P.red, P.redM), mesh(P.blk, P.blkM));
    g.add(mesh(new THREE.BoxGeometry(36.2, 2.2, 300), new THREE.MeshLambertMaterial({ color: 0x8e2a22 }), 0, 6.6, 0));   // red boot-top at the waterline
    const bt = inst(P.boatG, P.whiteM, P.boats.length); P.boats.forEach((b, i) => set(bt, i, b[0], b[1], b[2], 0)); g.add(bt);
    const ph = inst(new THREE.SphereGeometry(.75, 4, 3), M.lamp, 140, true); for (let k = 0; k < 140; k++) { const sd = k % 2 ? 1 : -1, row = (k >> 1) % 2, zz = -120 + ((k >> 2) * 7) % 240; set(ph, k, sd * (row ? 17.3 : 16.4), 15 + row * 5, zz, 0); ph.instanceColor.setXYZ(k, 1.8, 1.5, 1); } g.add(ph);
    const gl = mesh(new THREE.PlaneGeometry(90, 340).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffc070, opacity: .22, toneMapped: false }), 0, 6.2, 0); g.add(gl);   // her lights on the water
    seg.liner = { x, z }; (seg.cams = seg.cams || {}).qm = { p: [x + 150, 60, z + 210], t: [x, 25, z - 10], fov: 55 }; lmCount.queenMary = (lmCount.queenMary || 0) + (WARM ? 0 : 1);
    // steam/smoke from the three funnels (only while she's near; light grey, darker now and then), drifting aft with the wind
    const WP3 = new THREE.Vector3();
    seg.tick.push((t, dt, near) => { if (!near || !FX) return; g.getWorldPosition(WP3);
      for (let k = 0; k < 3; k++) { const f = P.funnels[k]; if (Math.random() < dt * 5) FX.emit(SMP.set(WP3.x + (Math.random() - .5) * 3, WP3.y + f[1] + 1, WP3.z + f[0] + (Math.random() - .5) * 3), SMV.set(wind.x + (Math.random() - .5) * 5, 18 + Math.random() * 8, wind.z - 7), 3.4, 6, 30, Math.random() < .25 ? [.42, .41, .4] : [.9, .89, .88], [.62, .62, .64], .5, false, 0, .45, 3); } });
  }
  /* the Aquarium of the Pacific look-alike: a long glass hall under a roof of three overlapping blue breaking waves (rising toward
     the harbor end, the crests curling over), a blue-lit plaza with a pool in front. zc / room: the stretch of shore band it gets. */
  let AQ = null;
  function aquarium(seg, R, zc, room) { if (room < 110) return; const L = Math.min(150, room - 10), g = new THREE.Group(); g.position.set(58, 0, zc); seg.group.add(g); seg.blocked.push([58, zc, 96, L + 10]);
    if (!AQ) { const waveShape = (len, hi) => { const s = new THREE.Shape(), P = [[0, 15], [len * .3, 18 + hi * .25], [len * .62, 20 + hi * .7], [len * .82, 22 + hi], [len * .93, 21 + hi * .96], [len, 17 + hi * .7], [len * .97, 15 + hi * .58], [len * .9, 18 + hi * .8], [len * .8, 19 + hi * .84], [len * .6, 18 + hi * .6], [len * .3, 16 + hi * .2], [0, 13]];
          s.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) s.lineTo(P[i][0], P[i][1]); s.closePath(); return s; };
      AQ = { waves: [[1, 36, 0x1a62a8], [.78, 26, 0x2e93d8], [.56, 17, 0x6cc6f4]].map(w => ({ k: w[0], g: new THREE.ExtrudeGeometry(waveShape(150 * w[0], w[1]), { depth: 74, bevelEnabled: false, curveSegments: 4 }).rotateY(-Math.PI / 2).translate(37, 0, 0), m: new THREE.MeshStandardMaterial({ color: w[2], roughness: .35, metalness: .45, side: THREE.DoubleSide }) })),
        _: 0, glass: new THREE.MeshStandardMaterial({ color: 0x0f2c44, roughness: .1, metalness: .6, emissive: 0x1b5f8a, emissiveIntensity: .7 }), base: new THREE.MeshLambertMaterial({ color: 0xd8d4cc }), pool: new THREE.MeshBasicMaterial({ color: 0x2aa8e0, toneMapped: false }) }; AQ.waves.forEach(w => SHARED.add(w.g)); }
    const s = L / 150; g.add(mesh(new THREE.BoxGeometry(70, 14, L * .96).translate(0, 7, 0), AQ.glass), mesh(new THREE.BoxGeometry(76, 1.4, L).translate(0, .7, 0), AQ.base));
    AQ.waves.forEach((w, i) => { const m = mesh(w.g, w.m, 0, -2 - i * 2, -L / 2 + i * L * .22); m.scale.set(1, 1, s); g.add(m); });   // overlapping waves, the biggest at the back
    g.add(mesh(new THREE.BoxGeometry(22, .6, 30).translate(-50, .5, 0), AQ.pool));   // the lit pool on the plaza (Shoreline side)
    g.add(mesh(new THREE.PlaneGeometry(120, L + 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0x3aa8ff, opacity: .3, toneMapped: false }), -10, .8, 0));
    const ul = inst(new THREE.SphereGeometry(1, 5, 4), M.lamp, 14, true); for (let k = 0; k < 14; k++) { set(ul, k, -37, 1.6, -L / 2 + 6 + k * (L - 12) / 13, 0); ul.instanceColor.setXYZ(k, .4, 1.2, 2); } g.add(ul);
    seg.aquarium = { x: 58, z: zc }; (seg.cams = seg.cams || {}).aq = { p: [-150, 150, zc + 210], t: [58, 20, zc], fov: 55 }; lmCount.aquarium = (lmCount.aquarium || 0) + (WARM ? 0 : 1); }
  /* the Long Beach Grand Prix on Shoreline Drive: concrete walls both sides with debris-fence posts, red/white kerbs, the
     chequered start/finish line with a gantry of start lights, the starting grid, grandstands packed with fans on the shore band,
     and (raceCars) open-wheel race cars lapping in place of the traffic. */
  let GPK = null;
  function grandPrix(seg, R, len, fz, withAq, start, gaps) {
    if (!GPK) { const c = mkc(64, 8), x = c.getContext("2d"); for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? "#f2f2f0" : "#d0201c"; x.fillRect(i * 8, 0, 8, 8); } const kt = tex(c, true);
      const cc = mkc(64, 16), y = cc.getContext("2d"); for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) { y.fillStyle = (i + j) % 2 ? "#111" : "#f4f4f4"; y.fillRect(i * 4, j * 4, 4, 4); }
      GPK = { kerb: new THREE.MeshLambertMaterial({ map: kt }), chk: new THREE.MeshLambertMaterial({ map: tex(cc, false) }), wall: new THREE.MeshLambertMaterial({ color: 0xe8e6e0 }), band: new THREE.MeshLambertMaterial({ color: 0xc8241f }), stand: new THREE.MeshLambertMaterial({ color: 0x8c9096 }), roof: new THREE.MeshLambertMaterial({ color: 0xf2f2ee }) }; GPK.kerb.map.repeat.set(1, 1); }
    const G2 = new THREE.Group(); seg.group.add(G2);
    // walls (instanced segments, both sides), a red band on top, fence posts
    const wl = [], seglen = 12; for (let z = -len / 2 + seglen / 2; z < len / 2; z += seglen) for (const x of [-41.5, -8.5]) wl.push([x, z]);
    const wm = inst(new THREE.BoxGeometry(2.4, 3.4, seglen - .4).translate(0, 1.7, 0), GPK.wall, wl.length), wb = inst(new THREE.BoxGeometry(2.5, .7, seglen - .4).translate(0, 3.2, 0), GPK.band, wl.length), fp = inst(new THREE.CylinderGeometry(.25, .25, 9, 4).translate(0, 7.5, 0), M.dark, wl.length);
    wl.forEach((w, i) => { set(wm, i, w[0], 0, w[1], 0); set(wb, i, w[0], 0, w[1], 0); set(fp, i, w[0], 0, w[1] - seglen / 2, 0); }); G2.add(wm, wb, fp);
    // kerbs along both edges (a stretch either side of start/finish) + the chequered line + grid boxes
    const sf = Math.max(-len / 2 + 60, Math.min(len / 2 - 60, (fz[0] + fz[1]) / 2 + (withAq ? 0 : 0)));
    for (const x of [-38.6, -11.4]) { const k = mesh(new THREE.PlaneGeometry(2.2, 160).rotateX(-Math.PI / 2), GPK.kerb, x, .34, sf - 40); k.material.map.repeat.set(1, 20); G2.add(k); }
    if (start) { G2.add(mesh(new THREE.PlaneGeometry(29, 3.2).rotateX(-Math.PI / 2), GPK.chk, -25, .36, sf));
    const grid = []; for (let r = 0; r < 6; r++) for (const lx of [-32, -18]) grid.push([new THREE.PlaneGeometry(5, .7).rotateX(-Math.PI / 2), T4(lx, .35, sf + 14 + r * 16 + (lx > -25 ? 8 : 0))]); G2.add(mesh(merge(grid), M.white));
    // the start gantry: two posts, a beam, five start lights that go red one by one and out (lights out and away we go)
    G2.add(mesh(merge([[new THREE.BoxGeometry(1.6, 26, 1.6), T4(-43, 13, sf - 3)], [new THREE.BoxGeometry(1.6, 26, 1.6), T4(-7, 13, sf - 3)], [new THREE.BoxGeometry(37, 3.4, 2), T4(-25, 25, sf - 3)]]), M.dark));
    } const sl = inst(new THREE.SphereGeometry(1.1, 6, 4), M.lamp, 5, true); if (start) { for (let k = 0; k < 5; k++) set(sl, k, -31 + k * 3, 25, sf - 1.9, 0); G2.add(sl); }
    // grandstands on the shore band: tiers of seats packed with fans (one coloured block per fan, one draw), a white roof on posts
    const stands = []; (gaps || []).forEach(g => { for (let z = g[0] + 2; z + 74 <= g[1]; z += 84) stands.push(z + 37); });
    const fanCols = ["#e4566b", "#f0d375", "#3aa8ff", "#ffffff", "#7ee0b0", "#ff7a3a", "#1f2a44", "#a33645"], fans = [];
    const tiers = [], roofs = [], posts = [];   // (all stands of the strip merged: three draws)
    stands.forEach(zc => { for (let t = 0; t < 5; t++) tiers.push([new THREE.BoxGeometry(5, 3 + t * 3, 70), T4(2 + t * 5, (3 + t * 3) / 2, zc)]);
      roofs.push([new THREE.BoxGeometry(30, 1, 74), T4(12, 22, zc)]); for (const dz of [-34, 0, 34]) posts.push([new THREE.BoxGeometry(.8, 22, .8), T4(26, 11, zc + dz)]);
      for (let t = 0; t < 5; t++) for (let q = 0; q < 26; q++) if (R() < .9) fans.push([2 + t * 5 - 1, 3 + t * 3 + 1.1, zc - 33 + q * 2.6 + (R() - .5)]);
      seg.blocked.push([14, zc, 30, 74]); });
    if (tiers.length) G2.add(mesh(merge(tiers), GPK.stand), mesh(merge(roofs), GPK.roof), mesh(merge(posts), M.dark));
    const fm = inst(new THREE.BoxGeometry(1.5, 2.2, 1.5), new THREE.MeshLambertMaterial(), fans.length, true); fans.forEach((f, i) => { set(fm, i, f[0], f[1], f[2], 0); fm.instanceColor.setXYZ(i, ...QC.set(fanCols[(R() * fanCols.length) | 0]).toArray()); }); G2.add(fm);
    seg.tick.push((t, dt, near) => { const c = (t % 6) / 6, on = Math.floor(c * 8); for (let k = 0; k < 5; k++) sl.instanceColor.setXYZ(k, k < on && on <= 5 ? 2 : .15, .05, .04); sl.instanceColor.needsUpdate = true;
      if (near) { for (let i = 0; i < fans.length; i += 7) { const f = fans[i]; set(fm, i, f[0], f[1] + Math.max(0, Math.sin(t * 9 + i)) * .8, f[2], 0); } fm.instanceMatrix.needsUpdate = true; } });   // fans jump up and down
    seg.gp = { x: -25, z: sf }; (seg.cams = seg.cams || {}).gp = { p: [-110, 60, sf + 120], t: [-10, 4, sf - 30], fov: 60 }; lmCount.grandPrix = (lmCount.grandPrix || 0) + (WARM ? 0 : 1); }
  // open-wheel race cars lapping Shoreline Drive (both lanes, same direction, much faster than traffic); counted by the road audit
  let RC = null;
  function raceCars(seg, R, len) { const n = 7, lanes = [-32, -18];
    if (!RC) { RC = { body: merge([[new THREE.BoxGeometry(2.6, 1.6, 9), T4(0, 1.6, 0)], [new THREE.ConeGeometry(1.3, 5, 6).rotateX(Math.PI / 2), T4(0, 1.3, 7)], [new THREE.BoxGeometry(5.6, 1.4, 4), T4(0, 1.5, -1)], [new THREE.BoxGeometry(2, 2.2, 2.4), T4(0, 2.8, -1.5)]]),
      wing: merge([[new THREE.BoxGeometry(6.4, .35, 1.4), T4(0, 1, 9.2)], [new THREE.BoxGeometry(5.6, .4, 1.6), T4(0, 4.4, -5.6)], [new THREE.BoxGeometry(.3, 2.6, 1.4), T4(-2.6, 3.2, -5.6)], [new THREE.BoxGeometry(.3, 2.6, 1.4), T4(2.6, 3.2, -5.6)]]),
      wheel: new THREE.CylinderGeometry(1.25, 1.25, 1.3, 10).rotateZ(Math.PI / 2), bm: new THREE.MeshStandardMaterial({ roughness: .3, metalness: .4 }) }; RC.body.scale(1.6, 1.6, 1.6); RC.wing.scale(1.6, 1.6, 1.6); RC.wheel.scale(1.6, 1.6, 1.6); [RC.body, RC.wing, RC.wheel].forEach(g => SHARED.add(g)); }
    const body = inst(RC.body, RC.bm, n, true), wing = inst(RC.wing, M.dark, n), wh = inst(RC.wheel, M.dark, n * 4), list = [], COL = ["#e01d2a", "#f0d375", "#1f6fd8", "#ffffff", "#ff7a1a", "#1db954", "#111318"];
    for (let i = 0; i < n; i++) { list.push({ lane: lanes[i % 2], ph: R() * 5000, sp: 150 + R() * 40, x: 0, z: 0 }); body.instanceColor.setXYZ(i, ...QC.set(COL[i % COL.length]).toArray()); }
    seg.group.add(body, wing, wh); seg.carSrc.push(() => list.map(c => [c.x, c.z]));
    seg.tick.push((t) => { for (let i = 0; i < n; i++) { const c = list[i], s = ((c.ph + t * c.sp) % len) - len / 2; c.x = c.lane; c.z = -s; set(body, i, c.x, 0, c.z, Math.PI); set(wing, i, c.x, 0, c.z, Math.PI);
        for (let j = 0; j < 4; j++) set(wh, i * 4 + j, c.x + (j % 2 ? 3.6 : -3.6), 2, c.z + (j < 2 ? -9.6 : 7.4), 0); }
      body.instanceMatrix.needsUpdate = wing.instanceMatrix.needsUpdate = wh.instanceMatrix.needsUpdate = true; }); }
  /* Compton civic center, from Antidote's photos (2026-10-17): a civic SUPERBLOCK (two blocks; the cross street between them is closed,
     it's under the plaza). At the back: the courthouse, a thick square ~14-storey tower in white/cream panels with thin full-height dark
     window slots on every face (solid white corners) over a recessed dark colonnade with bronze pillar caps, low white walls at the
     entry. In front: a big open terracotta plaza with a darker sunburst pattern and curved walkways, two small palms in square
     planters; the monument (a crown of ~14 tall white blades leaning outward in a round raised planter ringed with shrubs) off to
     one side; on the other side a low, wide, flat-roofed civic building with a rooftop equipment frame and a grove of big round
     shade trees between it and the plaza. The boulevard runs past the plaza's front. Look-alike primitives, no names or plaques. */
  function superBlock(len) {   // two blocks with the cross street between them closed (it's under the plaza); a strip's +z edge carries a half road, its -z edge none
    const st = streetsOf(len).sort((a, b) => a - b), E = ROAD / 2 + SIDE; let best = null;
    for (let k = 0; k < st.length; k++) { const z0 = k > 0 ? st[k - 1] + E : -len / 2 + 12, z1 = k < st.length - 1 ? st[k + 1] - E : len / 2 - E, sc = Math.abs(z1 - z0 - 400) + Math.abs((z0 + z1) / 2) * .5;
      if (!best || sc < best.sc) best = { sc, zc: (z0 + z1) / 2, depth: z1 - z0 }; }
    if (!best) { const mb = midBlock(len); return { zc: mb.zc, depth: mb.depth }; } return best; }
  const civicTex = (W2, D, mxu, mzv) => {   // the plaza paving at 2 px per unit: salmon slabs, a darker sunburst from the monument, light curved walks
    const k = 2, c = mkc(Math.round(W2 * k), Math.round(D * k)), x = c.getContext("2d"), R2 = rng(41), mx = mxu * k, my = mzv * k; x.fillStyle = "#cf957d"; x.fillRect(0, 0, c.width, c.height);
    for (let q = 0; q < 36; q++) { const a0 = q / 36 * TAU, a1 = a0 + TAU / 72; x.fillStyle = q % 2 ? "rgba(150,74,58,.55)" : "rgba(190,112,90,.35)"; x.beginPath(); x.moveTo(mx, my); x.arc(mx, my, 2000, a0, a1); x.closePath(); x.fill(); }   // sunburst wedges
    for (let q = 0; q < 1400; q++) { x.fillStyle = `rgba(${R2() < .5 ? "255,240,225" : "90,45,35"},${.05 + R2() * .07})`; x.fillRect(R2() * c.width, R2() * c.height, 1 + R2() * 2, 1 + R2() * 2); }
    x.strokeStyle = "rgba(120,60,48,.35)"; x.lineWidth = 1; for (let q = 0; q < c.width; q += 16) { x.beginPath(); x.moveTo(q, 0); x.lineTo(q, c.height); x.stroke(); } for (let q = 0; q < c.height; q += 16) { x.beginPath(); x.moveTo(0, q); x.lineTo(c.width, q); x.stroke(); }   // slab joints
    x.strokeStyle = "#e3d8c8"; x.lineWidth = 10; x.beginPath(); x.arc(mx, my, 104 * k, -Math.PI * .32, Math.PI * .42); x.stroke(); x.lineWidth = 7; x.beginPath(); x.arc(mx, my, 70 * k, -Math.PI * .1, Math.PI * .34); x.stroke();   // curved walkways
    const t = tex(c, false); t.anisotropy = 8; return t; };
  function civic(seg, R, len, zc, depth) {
    const W2 = 264, z0 = zc - depth / 2, z1 = zc + depth / 2, G = new THREE.Group(); seg.group.add(G);
    const white = new THREE.MeshStandardMaterial({ color: 0xf1ede2, roughness: .62 }), slot = new THREE.MeshStandardMaterial({ color: 0x15191f, roughness: .25, metalness: .5, emissive: 0x3a2c18, emissiveIntensity: .45 });
    const bronze = new THREE.MeshStandardMaterial({ color: 0x6e4c34, roughness: .6 }), dark = new THREE.MeshLambertMaterial({ color: 0x23262b });
    // the plaza: one paved surface over the whole superblock (texture sunburst centred on the monument)
    const plaza = new THREE.PlaneGeometry(W2, depth).rotateX(-Math.PI / 2); const mx = -W2 / 2 + W2 * .26, mz = z0 + depth * .5; G.add(mesh(plaza, new THREE.MeshLambertMaterial({ map: civicTex(W2, depth, mx + W2 / 2, mz - z0) }), 0, .32, zc));
    // the courthouse tower (thick square, ~14 storeys) at the back of the plaza
    const TW = 88, TH = 132, BASE = 13, tz = z0 + TW / 2 + 10, tx = 24;   // (2026-10-19: a touch taller so the white tower reads from the plane)
    G.add(mesh(new THREE.BoxGeometry(TW, TH - BASE, TW).translate(0, BASE + (TH - BASE) / 2, 0), white, tx, 0, tz));
    G.add(mesh(new THREE.BoxGeometry(TW - 10, BASE, TW - 10).translate(0, BASE / 2, 0), dark, tx, 0, tz));   // recessed ground-floor colonnade
    const sl = [], pil = [], cap = [], NS = 9, sp = (TW - 16) / (NS - 1);
    for (let f = 0; f < 4; f++) { const ry = f * Math.PI / 2; for (let k = 0; k < NS; k++) { const u = -TW / 2 + 8 + k * sp, nx = Math.sin(ry), nz = Math.cos(ry), ux = Math.cos(ry), uz = -Math.sin(ry);
        sl.push([new THREE.BoxGeometry(2.4, TH - BASE - 6, .8), T4(tx + ux * u + nx * (TW / 2 + .2), BASE + (TH - BASE - 6) / 2 + 2, tz + uz * u + nz * (TW / 2 + .2), 0, ry, 0)]);   // full-height window slot
        sl.push([new THREE.BoxGeometry(.9, TH - BASE, .5), T4(tx + ux * (u + sp / 2) + nx * (TW / 2 + .25), BASE + (TH - BASE) / 2, tz + uz * (u + sp / 2) + nz * (TW / 2 + .25), 0, ry, 0)]);   // panel reveal
        pil.push([new THREE.BoxGeometry(2.6, BASE, 2.6), T4(tx + ux * u + nx * (TW / 2 - 3), BASE / 2, tz + uz * u + nz * (TW / 2 - 3))]);
        cap.push([new THREE.BoxGeometry(5, 3, 4), T4(tx + ux * u + nx * (TW / 2 - 2), BASE - 1.5, tz + uz * u + nz * (TW / 2 - 2), 0, ry, 0)]); } }
    G.add(mesh(merge(sl.filter((q, i) => i % 2 === 0)), slot), mesh(merge(sl.filter((q, i) => i % 2 === 1)), new THREE.MeshLambertMaterial({ color: 0xd9d3c4 })), mesh(merge(pil), white), mesh(merge(cap), bronze));
    G.add(mesh(new THREE.BoxGeometry(TW + .6, 1.4, TW + .6).translate(0, TH + .7, 0), new THREE.MeshLambertMaterial({ color: 0xdedad0 }), tx, 0, tz));   // roof edge
    G.add(mesh(merge([[new THREE.BoxGeometry(34, 5, 3), T4(tx - 10, 2.5, tz + TW / 2 + 12)], [new THREE.BoxGeometry(3, 5, 16), T4(tx + 7, 2.5, tz + TW / 2 + 5)], [new THREE.BoxGeometry(26, 4, 3), T4(tx + 34, 2, tz + TW / 2 + 16)]]), white));   // low white entry walls / planters
    // the monument: ~14 tall white blades leaning outward like a crown, in a round raised planter ringed with shrubs (plaza right side)
    const mon = [[new THREE.CylinderGeometry(27, 27.5, 2.2, 48), T4(mx, 1.1, mz)]];
    const blade = (h) => { const sh = new THREE.Shape([new THREE.Vector2(-6.8, 0), new THREE.Vector2(6.8, 0), new THREE.Vector2(1.2, h)]); return new THREE.ExtrudeGeometry(sh, { depth: 1.1, bevelEnabled: false }).translate(0, 0, -.55); };
    for (let k = 0; k < 15; k++) { const a = k / 15 * TAU + (R() - .5) * .15, h = 44 + R() * 26, r = 7 + R() * 3; mon.push([blade(h), T4(mx + Math.cos(a) * r, 2.2, mz + Math.sin(a) * r, 0, -a + Math.PI / 2, 0).multiply(new THREE.Matrix4().makeRotationX(.3 + R() * .12))]); }
    G.add(mesh(merge(mon.slice(1)), new THREE.MeshStandardMaterial({ color: 0xf7f5f0, roughness: .45, emissive: 0x333331, emissiveIntensity: .3, side: THREE.DoubleSide })));
    G.add(mesh(mon[0][0].applyMatrix4(mon[0][1]), new THREE.MeshLambertMaterial({ color: 0xece6da })), mesh(new THREE.CircleGeometry(25.6, 44).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x3e2c20 }), mx, 2.25, mz));
    const shr = inst(new THREE.SphereGeometry(1.6, 6, 4), new THREE.MeshLambertMaterial({ color: 0x4e7a3a }), 36); for (let k = 0; k < 36; k++) { const a = k / 36 * TAU; set(shr, k, mx + Math.cos(a) * 22.5, 3, mz + Math.sin(a) * 15.5, 0, 1, .8 + R() * .4, 1); } G.add(shr);
    G.add(mesh(new THREE.PlaneGeometry(110, 110).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xfff2d8, opacity: .3, toneMapped: false }), mx, .7, mz));   // night floodlight on the blades
    seg.monument = { x: mx, z: mz };
    // the low, wide civic building (flat white roof, rooftop equipment frame) on the left, a grove of big round shade trees beside it
    const cbx = W2 / 2 - 62, cbz = z1 - 48; G.add(mesh(new THREE.BoxGeometry(116, 15, 66).translate(0, 7.5, 0), new THREE.MeshLambertMaterial({ color: 0xcfc9bd }), cbx, 0, cbz));
    G.add(mesh(new THREE.BoxGeometry(118, 6, 68).translate(0, 3, 0), slot, cbx, 0, cbz), mesh(new THREE.BoxGeometry(120, 1.2, 70).translate(0, 15.6, 0), new THREE.MeshLambertMaterial({ color: 0xf2efe8 }), cbx, 0, cbz));
    G.add(mesh(merge([[new THREE.BoxGeometry(30, 1, 1), T4(0, 19, -9)], [new THREE.BoxGeometry(30, 1, 1), T4(0, 19, 9)], [new THREE.BoxGeometry(1, 1, 18), T4(-15, 19, 0)], [new THREE.BoxGeometry(1, 1, 18), T4(15, 19, 0)], [new THREE.BoxGeometry(12, 4, 7), T4(0, 18, 0)]]), M.white, cbx + 8, 0, cbz - 4));
    const tr = []; for (let k = 0; k < 11; k++) tr.push([cbx - 30 - R() * 70, cbz - 50 - R() * 40 + (k % 3) * 8]);
    const trk = inst(new THREE.CylinderGeometry(1.2, 1.8, 10, 6).translate(0, 5, 0), M.trunk, tr.length), crn = inst(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshLambertMaterial(), tr.length, true);
    tr.forEach((t, k) => { const r = 10 + R() * 5; set(trk, k, t[0], 0, t[1], 0); set(crn, k, t[0], 9 + r * .7, t[1], R() * 3, r, r * .78, r); crn.instanceColor.setXYZ(k, ...QC.set(["#2f5a2a", "#3a6a30", "#2a4f26"][k % 3]).toArray()); }); G.add(trk, crn);
    // two small palms in square planters along the curved walk
    const pp = [[mx + 92, mz + 14], [mx + 98, mz + 42]]; G.add(mesh(merge(pp.map(p => [new THREE.BoxGeometry(6, 2.4, 6), T4(p[0], 1.2, p[1])])), new THREE.MeshLambertMaterial({ color: 0xece6da }))); palms(seg, R, pp, .7);
    // focus + test cameras (?lmcam=civic&lmv=aerial|street)
    seg.focus = { x: mx + 20, z: mz, y: 20, d: 260, h: 140 };
    // night lighting (2026-10-19): floodlit white faces (additive washes on the two faces you see), a lit crown band and a red beacon
    const wash = new THREE.MeshBasicMaterial({ map: coneTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xfff1d6, opacity: .34, toneMapped: false, side: THREE.DoubleSide });
    G.add(mesh(new THREE.PlaneGeometry(TW, TH * .9), wash, tx, TH * .45, tz + TW / 2 + 1.2)); const ws = mesh(new THREE.PlaneGeometry(TW, TH * .9), wash, tx - TW / 2 - 1.2, TH * .45, tz); ws.rotation.y = -Math.PI / 2; G.add(ws);
    G.add(mesh(new THREE.BoxGeometry(TW + 1, 2, TW + 1).translate(0, TH - 5, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.5, 1.3), toneMapped: false }), tx, 0, tz));
    const bcn = mesh(new THREE.SphereGeometry(2.2, 6, 4), M.lamp.clone(), tx, TH + 3, tz); bcn.material.color.setRGB(2, .1, .1); G.add(bcn); seg.tick.push((t) => { bcn.visible = (t % 1.5) < .7; });
    G.add(mesh(new THREE.PlaneGeometry(180, 140).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xfff0d0, opacity: .28, toneMapped: false }), tx, .8, tz + TW / 2 + 20));
    seg.courthouse = { x: tx, z: tz, h: TH }; lmCount.courthouse = (lmCount.courthouse || 0) + (WARM ? 0 : 1);
    seg.cams = { aerial: { p: [tx - 14, TH + 34, tz + TW / 2 + 34], t: [mx + 24, 0, mz + 60], fov: 88 }, street: { p: [tx - 70, 4, z1 - 4], t: [tx, 60, tz], fov: 78 }, over: { p: [tx + 140, 300, z1 + 300], t: [tx - 20, 0, zc - 60], fov: 60 } };
  }
  /* COMPTON STREET NAMES (2026-10-19, Antidote: "real street names painted on the ground like a map"): big white lettering down the
     middle of the real streets, the way a map labels them. Cross streets (east-west) take their names in true north-to-south order
     as you fly north: Alondra Blvd, then Compton Blvd, then Rosecrans Ave (STN carries the order across strips); Long Beach Blvd is
     the north-south avenue on the east side of the flight lane (x = +480). One merged mesh per name (≤ 4 draws a strip). */
  const NAMEM = {}, STN = { i: 0 };
  const nameMat = (txt) => NAMEM[txt] || (NAMEM[txt] = (() => { const c = mkc(1024, 128), x = c.getContext("2d"); x.font = "900 96px 'Arial Narrow',Arial,sans-serif"; x.textAlign = "center"; x.textBaseline = "middle";
    x.lineWidth = 10; x.strokeStyle = "rgba(20,20,24,.35)"; x.strokeText(txt, 512, 68); x.fillStyle = "rgba(248,246,236,.95)"; x.fillText(txt, 512, 68); const t = tex(c, false); t.anisotropy = 8;
    return new THREE.MeshBasicMaterial({ map: t, color: 0xe2ded2, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }); })());   // (unlit: reads like a map label, day or night)
  function streetNames(seg, len, r) { const NS = ["ALONDRA BLVD", "COMPTON BLVD", "ROSECRANS AVE"], by = {};
    const add = (nm, x, z, along) => { (by[nm] = by[nm] || []).push([new THREE.PlaneGeometry(along ? 160 : 224, along ? 20 : 28).rotateX(-Math.PI / 2).rotateY(along ? Math.PI / 2 : 0), T4(x, .42, z)]); };
    r.ST.slice().sort((a, b) => b - a).forEach(z => { const nm = NS[(WARM ? 0 : STN.i++) % 3]; for (const x of [-640, -320, 0, 320, 640]) add(nm, x, z, 0); });
    if (r.AV.includes(480)) { const st = r.ST.slice().sort((a, b) => a - b), cuts = [-len / 2].concat(st, [len / 2]); for (let k = 0; k < cuts.length - 1; k++) { const a = cuts[k] + (k ? ROAD / 2 + 4 : 0), b = cuts[k + 1] - (k < cuts.length - 2 ? ROAD / 2 + 4 : 0); if (b - a > 155) add("LONG BEACH BLVD", 480, (a + b) / 2, 1); } }
    for (const nm in by) seg.group.add(mesh(merge(by[nm]), nameMat(nm)));
    seg.streetNames = Object.keys(by); }

  /* HOLLYWOOD BLVD (2026-10-19, Antidote: "the Walk of Fame, searchlights sweeping the sky, a premiere / celebration feel, exotic
     cars driving by"). The avenue just left of the flight lane is the Boulevard: terrazzo sidewalks with a coral-pink star in every
     square, a premiere at a theatre (marquee with chasing bulbs, red carpet, ropes, fans cheering with their phones, photographers
     flashing, a few guests walking the carpet), searchlights sweeping the sky, bulb strings over the Boulevard, and exotic sports
     cars cruising both ways (the regular traffic keeps to the other streets). Generic: no real names, stars' names or logos. */
  const HB_X = -160;
  let STAR_M = null, EXO = null, BEAM_G = null;
  const starMat = () => STAR_M || (STAR_M = (() => { const c = mkc(128, 128), x = c.getContext("2d"), R = rng(97); x.fillStyle = "#4a4245"; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 900; i++) { x.fillStyle = ["rgba(230,220,210,.25)", "rgba(20,16,18,.3)", "rgba(200,150,160,.18)"][i % 3]; x.fillRect(R() * 128, R() * 128, 1.2, 1.2); }   // terrazzo chips
    x.strokeStyle = "#c9a24a"; x.lineWidth = 3; x.strokeRect(1.5, 1.5, 125, 125);   // brass square
    x.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 19 : 46; x.lineTo(64 + Math.cos(a) * r, 66 + Math.sin(a) * r); } x.closePath(); x.fillStyle = "#ef8fa6"; x.fill(); x.lineWidth = 3; x.strokeStyle = "#d8b25a"; x.stroke();   // the pink star, brass edge
    x.beginPath(); x.arc(64, 70, 11, 0, TAU); x.fillStyle = "#c9a24a"; x.fill(); const t = tex(c, true); t.anisotropy = 8; return new THREE.MeshLambertMaterial({ map: t, emissive: 0x2a1418 }); })());
  function exoParts() { if (EXO) return EXO; const sh = new THREE.Shape([[-8.2, 1.3], [-8.4, 3.5], [-6.2, 4.1], [-2.6, 5.5], [1.2, 5.4], [3.8, 4.0], [7.9, 2.9], [8.4, 1.3]].map(p => new THREE.Vector2(p[0], p[1])));
    const body = new THREE.ExtrudeGeometry(sh, { depth: 7.4, bevelEnabled: true, bevelSize: .5, bevelThickness: .5, bevelSegments: 1, curveSegments: 2 }).rotateY(-Math.PI / 2).translate(3.7, 0, 0);
    const gsh = new THREE.Shape([[-4.4, 4.2], [-2.4, 5.6], [1.0, 5.5], [3.0, 4.2]].map(p => new THREE.Vector2(p[0], p[1]))), glass = new THREE.ExtrudeGeometry(gsh, { depth: 6.2, bevelEnabled: false }).rotateY(-Math.PI / 2).translate(3.1, .1, 0);
    EXO = { body, glass, wheel: new THREE.CylinderGeometry(1.45, 1.45, 1.3, 10).rotateZ(Math.PI / 2), wing: new THREE.BoxGeometry(7, .3, 1.4).translate(0, 5.4, -7.4), bm: new THREE.MeshStandardMaterial({ roughness: .22, metalness: .55 }) };
    [EXO.body, EXO.glass, EXO.wheel, EXO.wing].forEach(g => SHARED.add(g)); return EXO; }
  function hollywoodBlvd(seg, R, len, r, vz) { const ax = HB_X, E = getE(), dens = O.density ? O.density() : 1;
    // the Walk of Fame: both sidewalks of the Boulevard, one star per 9x9 square, broken only where the cross streets meet it
    const quads = [], cuts = [-len / 2].concat(r.ST.slice().sort((a, b) => a - b), [len / 2]);
    for (let k = 0; k < cuts.length - 1; k++) { const a = cuts[k] + (k ? ROAD / 2 + SIDE : 0), b = cuts[k + 1] - (k < cuts.length - 2 ? ROAD / 2 + SIDE : 0); if (b - a < 10) continue;
      for (const sd of [-1, 1]) { const g = new THREE.PlaneGeometry(SIDE - .6, b - a).rotateX(-Math.PI / 2), uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * (b - a) / SIDE); quads.push([g, T4(ax + sd * (ROAD / 2 + SIDE / 2), .38, (a + b) / 2)]); } }
    if (quads.length) { const g = new THREE.BufferGeometry(), pos = [], nor = [], uvs = []; quads.forEach(([q, m]) => { const n = q.toNonIndexed().applyMatrix4(m); pos.push(...n.attributes.position.array); nor.push(...n.attributes.normal.array); uvs.push(...n.attributes.uv.array); });
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2)); const wm = mesh(g, starMat()); wm.renderOrder = 1; seg.group.add(wm); }
    // the theatre (west side, mid-block): dark facade, a marquee canopy over the sidewalk with chasing bulbs, a blade sign, the red carpet
    const tx = ax - ROAD / 2 - SIDE - 38, T = new THREE.Group(); T.position.set(tx, 0, vz); seg.group.add(T); seg.blocked.push([tx, vz, 76, 84]);
    T.add(mesh(new THREE.BoxGeometry(70, 30, 80).translate(0, 15, 0), new THREE.MeshStandardMaterial({ color: 0x3a1c22, roughness: .7 })), mesh(new THREE.BoxGeometry(72, 2, 82).translate(0, 31, 0), M.dark), mesh(new THREE.BoxGeometry(1.2, 3.2, 82).translate(35.6, 31, 0), M.gold));
    T.add(mesh(new THREE.BoxGeometry(12, 3, 60).translate(38, 16, 0), new THREE.MeshStandardMaterial({ color: 0x1a0e10, roughness: .5, emissive: 0x401010, emissiveIntensity: .5 })));
    const prem = mesh(new THREE.PlaneGeometry(56, 6), new THREE.MeshBasicMaterial({ map: signTextTex("WORLD PREMIERE TONIGHT", 1024, 110, 72, "#ffe9a8"), toneMapped: false }), 44.05, 16, 0); prem.rotation.y = Math.PI / 2; T.add(prem);
    const blade = mesh(new THREE.BoxGeometry(1.4, 34, 9), M.dark, 36, 44, -24); T.add(blade); [-1, 1].forEach(f => { const p2 = mesh(new THREE.PlaneGeometry(8, 30), new THREE.MeshBasicMaterial({ map: (() => { const c = mkc(96, 360), x = c.getContext("2d"); x.fillStyle = "#14080a"; x.fillRect(0, 0, 96, 360); x.font = "900 50px Georgia,serif"; x.textAlign = "center"; x.fillStyle = "#ff6a8a"; x.shadowColor = "#ff6a8a"; x.shadowBlur = 16; "STARS".split("").forEach((ch, i) => x.fillText(ch, 48, 62 + i * 66)); return tex(c, false); })(), toneMapped: false }), 36 + f * .75, 44, -24); p2.rotation.y = f * Math.PI / 2; T.add(p2); });
    const mb = []; for (let i = 0; i <= 30; i++) mb.push([44.2, 13.2, -30 + i * 2], [44.2, 18.8, -30 + i * 2]); for (let i = 1; i < 3; i++) mb.push([44.2, 13.2 + i * 1.9, -30], [44.2, 13.2 + i * 1.9, 30]);
    const mq = inst(new THREE.SphereGeometry(.55, 5, 4), M.lamp, mb.length, true); mb.forEach((b, i) => set(mq, i, b[0], b[1], b[2], 0)); T.add(mq);
    T.add(mesh(new THREE.PlaneGeometry(8, 76).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xb0121e, emissive: 0x3a0408 }), 39, .5, 0));   // red carpet (in front of the theatre, along the walk)
    const ropes = []; for (let i = 0; i <= 12; i++) ropes.push([new THREE.CylinderGeometry(.35, .35, 4.6, 5), T4(43.4, 2.3, -36 + i * 6)]); T.add(mesh(merge(ropes), M.gold));
    T.add(mesh(new THREE.BoxGeometry(.4, .4, 72).translate(43.4, 4, 0), new THREE.MeshLambertMaterial({ color: 0x8a0f18 })));
    T.add(mesh(new THREE.PlaneGeometry(150, 130).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffc890, opacity: .45, toneMapped: false }), 40, .9, 0));
    // the people: fans behind the far rope + across the street (cheering / waving / filming), photographers by the near rope, guests on the carpet
    const fans = [], snaps = [], walkers = [];
    if (E) { const C = BEACH.makeCrowdE(E, seg.group), VIBE = ["cheer", "wave", "phone", "cheer", "text", "laugh", "wave"];
      for (let i = 0; i < Math.round(16 * dens); i++) { const c = C.add("street", R, { x: tx + 46.3 + R() * .6, z: vz - 34 + R() * 68, ry: -Math.PI / 2, pose: "stand" }); c.idle = VIBE[(R() * VIBE.length) | 0]; fans.push(c); }
      for (let i = 0; i < Math.round(12 * dens); i++) { const c = C.add("street", R, { x: ax + ROAD / 2 + 3 + R() * 5, z: vz - 50 + R() * 100, ry: -Math.PI / 2, pose: "stand" }); c.idle = VIBE[(R() * VIBE.length) | 0]; fans.push(c); }
      for (let i = 0; i < 6; i++) { const c = C.add("street", R, { x: tx + 44.6, z: vz - 28 + i * 11, ry: -Math.PI / 2, pose: "stand" }); c.idle = "phone"; snaps.push(c); }
      for (let i = 0; i < 3; i++) { const z0 = vz - 30 + i * 22, c = C.add("street", R, { x: tx + 39, z: z0, ry: Math.PI, pose: "walk" }); c.tick = (cc, t) => { cc.z = vz + 34 - ((vz + 34 - z0 + t * 3.2) % 68); cc.ry = Math.PI; }; walkers.push(c); }
      (seg.crowds = seg.crowds || []).push(C); seg.tick.push((t, dt, near) => C.update(t, dt, near)); }
    else { const sp = []; for (let i = 0; i < 20; i++) sp.push([tx + 46.3 + R() * .6, vz - 34 + R() * 68, -Math.PI / 2, -1]); for (let i = 0; i < 6; i++) sp.push([tx + 44.6, vz - 28 + i * 11, -Math.PI / 2, -1]); people(seg, R, sp, true); }
    // searchlights: six beams from the theatre's roof + the far sidewalk, sweeping (they fade in with the dusk, like Melody's)
    if (!BEAM_G) { BEAM_G = new THREE.CylinderGeometry(10, 1.6, 340, 12, 1, true).translate(0, 170, 0); SHARED.add(BEAM_G); }
    const beams = [[tx - 20, 32, vz - 30], [tx - 20, 32, vz + 30], [tx + 10, 32, vz], [ax + 40, 0, vz - 120], [ax + 40, 0, vz + 120], [ax - 60, 0, vz + 200]].map(p => { const b = mesh(BEAM_G, M.beam, p[0], p[1], p[2]); seg.group.add(b); return b; });
    const SLB = inst(new THREE.CylinderGeometry(3, 3.6, 4, 10).translate(0, 2, 0), M.dark, beams.length); beams.forEach((b, i) => set(SLB, i, b.position.x, b.position.y, b.position.z, 0)); seg.group.add(SLB);
    // bulb strings strung across the Boulevard every half block
    const sb = []; for (let z = -len / 2 + 40; z < len / 2; z += 70) { if (r.ST.some(q => Math.abs(q - z) < ROAD)) continue; for (let k = 0; k <= 14; k++) { const u = k / 14; sb.push([ax - ROAD / 2 - 4 + u * (ROAD + 8), 24 - Math.sin(u * Math.PI) * 5, z]); } }
    const sbl = inst(new THREE.SphereGeometry(.75, 5, 4), M.lamp, sb.length, true); sb.forEach((b, i) => { set(sbl, i, b[0], b[1], b[2], 0); sbl.instanceColor.setXYZ(i, ...[[1.9, 1.5, .8], [1.9, .5, .7], [.6, 1.2, 1.9]][i % 3]); }); seg.group.add(sbl);
    // exotic cars on the Boulevard (both directions) + two parked at the kerb by the carpet; all on the Boulevard's lanes (road audit)
    const P = exoParts(), n = 9, COLS = ["#c6f000", "#ffd200", "#ff5a00", "#d10f1c", "#f4f4f2", "#6a2bd8", "#11b5e4", "#111214", "#ff3d9a"], list = [];
    for (let i = 0; i < n; i++) list.push({ x: ax + (i % 2 ? -8 : 8), d: i % 2 ? -1 : 1, ph: R() * 5000, sp: 46 + R() * 40, z: 0, park: 0 });
    list.push({ x: ax - ROAD / 2 + 4.5, d: 1, z: vz - 12, park: 1 }, { x: ax - ROAD / 2 + 4.5, d: 1, z: vz + 12, park: 1 });
    const N2 = list.length, body = inst(P.body, P.bm, N2, true), gl = inst(P.glass, M.glass, N2), wh = inst(P.wheel, M.dark, N2 * 4), wg = inst(P.wing, M.dark, N2), lamps = inst(lampG, M.lamp, N2 * 4, true);
    list.forEach((c, i) => { body.instanceColor.setXYZ(i, ...QC.set(COLS[i % COLS.length]).toArray()); for (let j = 0; j < 4; j++) lamps.instanceColor.setXYZ(i * 4 + j, ...(j < 2 ? [1.7, 1.6, 1.3] : [1.8, .1, .1])); });
    wg.count = N2; seg.group.add(body, gl, wh, wg, lamps); seg.carSrc.push(() => list.map(c => [c.x, c.z, c.park]));
    const put = () => { list.forEach((c, i) => { const ry = c.d > 0 ? Math.PI : 0; set(body, i, c.x, 0, c.z, ry); set(gl, i, c.x, 0, c.z, ry); if (i % 3 === 0) set(wg, i, c.x, 0, c.z, ry); else set(wg, i, c.x, -50, c.z, ry);
        const f = c.d > 0 ? -1 : 1; for (let j = 0; j < 4; j++) { set(wh, i * 4 + j, c.x + (j % 2 ? 3.5 : -3.5), 1.45, c.z + f * (j < 2 ? 5.4 : -5.2), 0); set(lamps, i * 4 + j, c.x + (j % 2 ? 2.6 : -2.6), 2.6, c.z + f * (j < 2 ? 8.3 : -8.3), ry); } });
      body.instanceMatrix.needsUpdate = gl.instanceMatrix.needsUpdate = wh.instanceMatrix.needsUpdate = wg.instanceMatrix.needsUpdate = lamps.instanceMatrix.needsUpdate = true; };
    seg.tick.push((t, dt, near) => { for (const c of list) if (!c.park) c.z = -c.d * (((c.ph + t * c.sp) % len) - len / 2); put();
      beams.forEach((b, i) => b.rotation.set(.42 * Math.sin(t * .55 + i * 1.7), 0, .45 * Math.cos(t * .4 + i * 2.3)));
      const ch = (t * 8 | 0) % 4; for (let i = 0; i < mb.length; i++) { const on = (i + ch) % 4 ? 1.9 : .35; mq.instanceColor.setXYZ(i, on, on * .85, on * .55); } mq.instanceColor.needsUpdate = true;
      if (near && FX && FX.glow) { for (const c of snaps) if (Math.random() < dt * 1.6) FX.glow(SMP.set(seg.group.position.x + c.x, 7.5, seg.group.position.z + c.z), 16, [1, 1, 1], 1);
        for (let k = 0; k < 2; k++) if (Math.random() < dt * 3 && fans.length) { const c = fans[(Math.random() * fans.length) | 0]; FX.glow(SMP.set(seg.group.position.x + c.x, 8, seg.group.position.z + c.z), 7, [.85, .9, 1], .9); } } });   // camera flashes + phone screens
    seg.premiere = { x: tx, z: vz }; seg.focus = { x: tx + 40, z: vz, y: 6, d: 200, h: 95 }; lmCount.walkOfFame = (lmCount.walkOfFame || 0) + (WARM ? 0 : 1); }

  /* THE 105 (2026-10-19, Antidote's route part 2): the Glenn Anderson Freeway down the middle of the flight lane. Four lanes each way
     with traffic both directions, the Metro C Line (Green Line) tracks + catenary + a train in the median, concrete median barriers,
     sound walls, the cross streets carried over it on bridges, overhead "I-105" signs. The city grid either side keeps its avenues;
     cross streets have no traffic (they bridge the freeway). Every freeway car is on a registered road (road audit). */
  let FWY = null;
  /* THE EXITS (2026-10-19, Antidote: "show every exit with real exit signs as you fly past, ending at LAX"). Westbound, in real order,
     from Wikipedia's I-105 exit list (which cites Caltrans' numbered-exit system): https://en.wikipedia.org/wiki/Interstate_105_(California)
     Exit 14 Garfield Ave is eastbound-only, so westbound it is not signed. One exit per freeway strip (EX.n carries the count across the
     part's strips, per run); the I-605 / I-710 / I-110 / I-405 strips also get the interchange (the crossing freeway on a high deck plus
     two flyover ramps). After the last exit (Sepulveda Blvd / LAX) the 105 ends at Imperial Hwy and the strips become the airport. */
  const EXITS = [{ n: "18B", s: "I-605", i: "605", d: "NORTH · SOUTH" }, { n: "17", s: "Bellflower Blvd" }, { n: "16", s: "Lakewood Blvd" }, { n: "15", s: "Paramount Blvd" },
    { n: "13", s: "I-710", i: "710", d: "Long Beach · Pasadena" }, { n: "12", s: "Long Beach Blvd" }, { n: "10", s: "Wilmington Ave" }, { n: "9", s: "Central Ave" },
    { n: "7B", s: "I-110", i: "110", d: "Harbor Fwy" }, { n: "7A", s: "Vermont Ave" }, { n: "5", s: "Crenshaw Blvd" }, { n: "3", s: "Prairie Ave" },
    { n: "2B", s: "I-405", i: "405", d: "Santa Monica · Long Beach" }, { n: "2A", s: "La Cienega Blvd" }, { n: "1D", s: "Nash St", d: "LAX Airport" }, { n: "1B", s: "Sepulveda Blvd", d: "LAX Airport" },
    { end: 1, s: "Imperial Hwy", d: "END 105 · LAX" }];
  const EX = { key: null, n: 0 }, EXSIGN = {};
  const shield = (x, cx, cy, sc, num) => { x.save(); x.translate(cx, cy); x.scale(sc, sc); x.fillStyle = "#fff"; x.beginPath(); x.moveTo(-50, -56); x.lineTo(50, -56); x.lineTo(50, 2); x.quadraticCurveTo(50, 50, 0, 60); x.quadraticCurveTo(-50, 50, -50, 2); x.closePath(); x.fill();
    x.fillStyle = "#1d3f9c"; x.beginPath(); x.moveTo(-42, -26); x.lineTo(42, -26); x.lineTo(42, 2); x.quadraticCurveTo(42, 42, 0, 52); x.quadraticCurveTo(-42, 42, -42, 2); x.closePath(); x.fill(); x.fillStyle = "#c8202c"; x.fillRect(-42, -48, 84, 20);
    x.fillStyle = "#fff"; x.font = "900 40px Arial,sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(num, 0, 12); x.restore(); };
  // a green exit sign (created once per exit): the yellow-on-green "EXIT n" tab on top, the destination big, a shield for freeways, an up-right arrow
  const exitSign = (k) => EXSIGN[k] || (EXSIGN[k] = (() => { const e = EXITS[k], c = mkc(512, 300), x = c.getContext("2d");
    x.fillStyle = "#0f6b3a"; if (!e.end) { x.fillRect(300, 0, 200, 62); x.strokeStyle = "#fff"; x.lineWidth = 5; x.strokeRect(303, 3, 194, 60); x.fillStyle = "#fff"; x.font = "800 40px Arial,sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("EXIT " + e.n, 400, 34); }
    x.fillStyle = "#0f6b3a"; x.fillRect(0, 62, 512, 238); x.strokeStyle = "#fff"; x.lineWidth = 6; x.strokeRect(6, 68, 500, 226);
    x.fillStyle = "#fff"; x.textAlign = "left"; x.textBaseline = "middle";
    if (e.i) { shield(x, 90, 168, 1.1, e.i); x.font = "800 52px Arial,sans-serif"; x.fillText(e.s, 170, 140); x.font = "700 30px Arial,sans-serif"; x.fillText(e.d, 170, 200); }
    else { x.font = "800 " + (e.s.length > 13 ? 50 : 58) + "px Arial,sans-serif"; x.fillText(e.s, 34, e.d ? 140 : 170); if (e.d) { x.font = "700 34px Arial,sans-serif"; x.fillText(e.d, 34, 206); } }
    if (!e.end) { x.save(); x.translate(450, 252); x.rotate(Math.PI / 4); x.fillRect(-5, -26, 10, 40); x.beginPath(); x.moveTo(-18, -20); x.lineTo(18, -20); x.lineTo(0, -44); x.closePath(); x.fill(); x.restore(); }
    const t = tex(c, false); t.anisotropy = 8; return new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: .5, toneMapped: false, color: new THREE.Color(.92, .92, .92) }); })());
  const streetBlade = (txt) => EXSIGN["b" + txt] || (EXSIGN["b" + txt] = (() => { const c = mkc(512, 80), x = c.getContext("2d"); x.fillStyle = "#0f6b3a"; x.fillRect(0, 0, 512, 80); x.strokeStyle = "#fff"; x.lineWidth = 4; x.strokeRect(4, 4, 504, 72); x.fillStyle = "#fff"; x.font = "800 50px Arial,sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(txt, 256, 42); return new THREE.MeshBasicMaterial({ map: tex(c, false), toneMapped: false, color: new THREE.Color(.9, .9, .9) }); })());
  function freeway105(seg, R, len) { const FW = 112;
    // which exit this strip shows (per run, across the whole part); past the last one the 105 is behind you: LAX
    if (!WARM && O.zoneKey) { const zk = O.zoneKey().split("|"), k = zk[0] + "|" + zk[2]; if (k !== EX.key) { EX.key = k; EX.n = (O.exitStart || 0) * 2; } }   // (?exit=N starts the part at the Nth exit: testing / screenshots)
    const kk = WARM ? 0 : EX.n++, ei = kk >> 1; if (ei >= EXITS.length) { laxAirport(seg, R, len); return; }   // (an exit every other strip: ~34 strips of freeway over the part's two levels)
    const plain = kk % 2 === 1, ex = plain ? { s: "", plain: 1 } : EXITS[ei], ic = ex.i ? ex : null, icz = -len * .05;
    if (!FWY) { const sg = mkc(512, 160), x = sg.getContext("2d"); x.fillStyle = "#0f6b3a"; x.fillRect(0, 0, 512, 160); x.strokeStyle = "#fff"; x.lineWidth = 6; x.strokeRect(6, 6, 500, 148);
        x.fillStyle = "#fff"; x.beginPath(); x.moveTo(40, 34); x.lineTo(140, 34); x.lineTo(140, 92); x.quadraticCurveTo(140, 140, 90, 150); x.quadraticCurveTo(40, 140, 40, 92); x.closePath(); x.fill();
        x.fillStyle = "#1d3f9c"; x.beginPath(); x.moveTo(48, 58); x.lineTo(132, 58); x.lineTo(132, 92); x.quadraticCurveTo(132, 132, 90, 142); x.quadraticCurveTo(48, 132, 48, 92); x.closePath(); x.fill(); x.fillStyle = "#c8202c"; x.fillRect(48, 40, 84, 18);
        x.fillStyle = "#fff"; x.font = "900 40px Arial,sans-serif"; x.textAlign = "center"; x.fillText("105", 90, 112); x.font = "800 50px Arial,sans-serif"; x.textAlign = "left"; x.fillText("I-105 WEST", 165, 72); x.font = "700 34px Arial,sans-serif"; x.fillText("LAX · El Segundo", 165, 124);
        FWY = { sign: new THREE.MeshBasicMaterial({ map: tex(sg, false), toneMapped: false, color: new THREE.Color(.9, .9, .9) }), conc: new THREE.MeshLambertMaterial({ color: 0xb9b3a8 }), wall: new THREE.MeshLambertMaterial({ color: 0xc9b89a }), asph: new THREE.MeshLambertMaterial({ color: 0x2a2b30 }), ball: new THREE.MeshLambertMaterial({ color: 0x6b6258 }), rail: new THREE.MeshLambertMaterial({ color: 0x3a3a3e }), train: new THREE.MeshStandardMaterial({ color: 0xd8dade, roughness: .35, metalness: .5 }), stripe: new THREE.MeshBasicMaterial({ color: 0x2bb34a }) }; }
    city(seg, R, len, { res: true, mixed: true, style: "res", cars: 22, hmul: .5, block: [[0, 0, FW + 30, len + 40]], clear: ic ? [[0, icz, XW, 110]] : [], noAuditBlock: true, noBillboard: true });
    const G = new THREE.Group(); seg.group.add(G);
    G.add(mesh(new THREE.PlaneGeometry(FW, len).rotateX(-Math.PI / 2), FWY.asph, 0, .45, 0));
    const marks = []; for (const sd of [-1, 1]) { for (const lx of [14, 22, 30]) for (let z = -len / 2 + 6; z < len / 2; z += 22) marks.push([new THREE.PlaneGeometry(.8, 10).rotateX(-Math.PI / 2), T4(sd * lx, .5, z)]); marks.push([new THREE.PlaneGeometry(.8, len).rotateX(-Math.PI / 2), T4(sd * 39, .5, 0)], [new THREE.PlaneGeometry(.8, len).rotateX(-Math.PI / 2), T4(sd * 11, .5, 0)]); }
    G.add(mesh(merge(marks), M.white));
    G.add(mesh(new THREE.BoxGeometry(18, .6, len).translate(0, .6, 0), FWY.ball));   // the C Line's ballast in the median
    G.add(mesh(merge([[new THREE.BoxGeometry(1.2, 3, len), T4(-9.5, 1.5, 0)], [new THREE.BoxGeometry(1.2, 3, len), T4(9.5, 1.5, 0)]]), FWY.conc));   // median barriers
    G.add(mesh(merge([-5.5, -3.5, 3.5, 5.5].map(rx => [new THREE.BoxGeometry(.4, .5, len), T4(rx, 1.1, 0)])), FWY.rail));
    const cat = []; for (let z = -len / 2 + 10; z < len / 2; z += 40) cat.push([new THREE.BoxGeometry(.6, 13, .6), T4(0, 6.5, z)], [new THREE.BoxGeometry(14, .5, .5), T4(0, 12.5, z)]); cat.push([new THREE.BoxGeometry(.15, .15, len), T4(-4.5, 11.8, 0)], [new THREE.BoxGeometry(.15, .15, len), T4(4.5, 11.8, 0)]); G.add(mesh(merge(cat), M.dark));
    G.add(mesh(merge([[new THREE.BoxGeometry(1.4, 9, len), T4(-FW / 2 - 1, 4.5, 0)], [new THREE.BoxGeometry(1.4, 9, len), T4(FW / 2 + 1, 4.5, 0)]]), FWY.wall));   // sound walls
    // bridges carrying the cross streets over the freeway
    const br = []; streetsOf(len).forEach(z => { br.push([new THREE.BoxGeometry(FW + 30, 2.4, 34), T4(0, 13, z)], [new THREE.BoxGeometry(FW + 30, 2, .6), T4(0, 15, z - 16.6)], [new THREE.BoxGeometry(FW + 30, 2, .6), T4(0, 15, z + 16.6)]); for (const px of [-FW / 2 + 2, 0, FW / 2 - 2]) br.push([new THREE.BoxGeometry(2.6, 12, 10), T4(px, 6, z)]); });
    if (br.length) G.add(mesh(merge(br), FWY.conc));
    // the exit: an overhead gantry over the westbound lanes (right side, you fly with them) with this exit's sign, the I-105 WEST sign over the
    // left, and the exit's street named on its bridge; the off-ramp peels away to the right
    const gz = len * .32; G.add(mesh(merge([[new THREE.BoxGeometry(1.2, 22, 1.2), T4(-FW / 2 + 1, 11, gz)], [new THREE.BoxGeometry(1.2, 22, 1.2), T4(-2, 11, gz)], [new THREE.BoxGeometry(FW / 2, 1.2, 1.2), T4(-FW / 4, 21, gz)], [new THREE.BoxGeometry(1.2, 22, 1.2), T4(FW / 2 - 1, 11, gz)], [new THREE.BoxGeometry(1.2, 22, 1.2), T4(2, 11, gz)], [new THREE.BoxGeometry(FW / 2, 1.2, 1.2), T4(FW / 4, 21, gz)]]), M.dark));
    G.add(mesh(new THREE.PlaneGeometry(44, 13.75), FWY.sign, -FW / 4, 26, gz + .8)); if (plain) G.add(mesh(new THREE.PlaneGeometry(44, 13.75), FWY.sign, FW / 4, 26, gz + .8)); else G.add(mesh(new THREE.PlaneGeometry(46, 27), exitSign(ei), FW / 4, 30, gz + .8));
    const sts = streetsOf(len).filter(z => z < gz - 40).sort((a, b) => b - a), bz = sts.length ? sts[0] : null;
    if (bz != null && !ex.i && !plain) { const bl = mesh(new THREE.PlaneGeometry(60, 9.4), streetBlade(ex.s), 0, 19.6, bz + 17.2); G.add(bl); }
    if (!ex.end && !plain) G.add(mesh(new THREE.PlaneGeometry(12, 120).rotateX(-Math.PI / 2).rotateY(-.12), FWY.asph, FW / 2 + 4, .44, gz - 70));   // off-ramp
    if (ic) {   // the interchange: the crossing freeway on a high deck (with its shield on the side) + two flyover ramps
      const IG = new THREE.Group(); IG.position.z = icz; G.add(IG);
      IG.add(mesh(new THREE.BoxGeometry(XW, 3, 70).translate(0, 30, 0), FWY.conc), mesh(new THREE.PlaneGeometry(XW, 66).rotateX(-Math.PI / 2).translate(0, 31.6, 0), FWY.asph));
      IG.add(mesh(merge([[new THREE.BoxGeometry(XW, 2.4, .8), T4(0, 32.8, -34.6)], [new THREE.BoxGeometry(XW, 2.4, .8), T4(0, 32.8, 34.6)]].concat([-900, -600, -300, -FW / 2 - 8, FW / 2 + 8, 300, 600, 900].map(px => [new THREE.BoxGeometry(5, 29, 14), T4(px, 14.5, 0)]))), FWY.conc));
      for (const sd of [-1, 1]) { const rp = new THREE.TorusGeometry(110, 4.5, 4, 24, Math.PI / 2); rp.scale(1, 1, .35); const m = mesh(rp, FWY.conc, sd * 30, 20, sd * 60); m.rotation.set(Math.PI / 2, 0, sd > 0 ? 0 : Math.PI); IG.add(m); }
      const sh = mkc(256, 256), sx = sh.getContext("2d"); shield(sx, 128, 128, 1.9, ic.i); const shm = new THREE.MeshBasicMaterial({ map: tex(sh, false), transparent: true, toneMapped: false });
      for (const px of [-130, 130]) IG.add(mesh(new THREE.PlaneGeometry(22, 22), shm, px, 31, 35.4));
      seg.interchange = ic.i; }
    seg.cams = { sign: { p: [FW / 4 - 6, 34, gz + 80], t: [FW / 4, 28, gz], fov: 50 }, ic: { p: [180, 120, icz + 260], t: [0, 20, icz], fov: 60 }, fwy: { p: [0, 120, len / 2 + 120], t: [0, 0, -len / 4], fov: 60 } };
    seg.exit = plain ? null : ex; if (!plain) lmCount.exits = (lmCount.exits || 0) + (WARM ? 0 : 1);
    // traffic both ways (4 lanes each), on a registered road
    seg.roads.push({ strip: [-FW / 2, FW / 2, -len / 2, len / 2] });
    cars(seg, R, 34, len, [["z", -16, 1], ["z", -24, 1], ["z", -32, 1], ["z", 16, -1], ["z", 24, -1], ["z", 32, -1], ["z", 36, -1], ["z", -36, 1]]);
    // a C Line train (3 cars, silver with the line's green stripe) running the median
    const tr = new THREE.Group(); for (let k = 0; k < 3; k++) { tr.add(mesh(new THREE.BoxGeometry(5.6, 6, 27).translate(0, 4.6, k * 28.5), FWY.train), mesh(new THREE.BoxGeometry(5.7, .8, 27).translate(0, 3.2, k * 28.5), FWY.stripe)); } G.add(tr);
    const dir = R() < .5 ? 1 : -1; tr.position.x = dir > 0 ? -4.5 : 4.5;
    seg.tick.push((t) => { tr.position.z = dir * ((((t * 52) % (len + 120)) - len / 2 - 60)) - 28; });
    seg.f105 = true; lmCount.f105 = (lmCount.f105 || 0) + (WARM ? 0 : 1); }

  /* LAX at the end of the 105: the runways run the way you fly (east-west), terminals and service roads (runway()), plus the
     Theme Building look-alike (four white parabolic arches holding a saucer), the control tower and the row of tall colour-changing
     light pylons along Century Blvd. first: the strip where the freeway ends at Imperial Hwy / Sepulveda Blvd (an END sign). */
  let LAXM = null;
  function laxAirport(seg, R, len) { runway(seg, R, len, {});
    if (!LAXM) LAXM = { w: new THREE.MeshStandardMaterial({ color: 0xf4f2ec, roughness: .5, emissive: 0x2a2a30 }), glass: new THREE.MeshStandardMaterial({ color: 0x223040, roughness: .1, metalness: .6, emissive: 0x2a4a60, emissiveIntensity: .8 }) };
    const th = new THREE.Group(); th.position.set(200, 0, -len * .15); seg.group.add(th);
    for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + Math.PI / 4, arch = new THREE.TorusGeometry(46, 1.6, 6, 24, Math.PI); const m = mesh(arch, LAXM.w); m.rotation.y = a; m.scale.set(1, 1.15, 1); th.add(m); }
    th.add(mesh(new THREE.CylinderGeometry(24, 18, 7, 24).translate(0, 40, 0), LAXM.w), mesh(new THREE.CylinderGeometry(19, 19, 4, 24).translate(0, 36, 0), LAXM.glass), mesh(new THREE.CylinderGeometry(7, 8, 34, 12).translate(0, 17, 0), LAXM.w));
    const tw = new THREE.Group(); tw.position.set(-200, 0, len * .2); seg.group.add(tw); tw.add(mesh(new THREE.CylinderGeometry(5, 9, 90, 10).translate(0, 45, 0), LAXM.w), mesh(new THREE.CylinderGeometry(13, 9, 12, 10).translate(0, 96, 0), LAXM.glass), mesh(new THREE.CylinderGeometry(14, 14, 2, 10).translate(0, 103, 0), M.dark));
    const pyl = inst(new THREE.CylinderGeometry(2.6, 2.6, 36, 8).translate(0, 18, 0), M.lamp, 15, true); for (let k = 0; k < 15; k++) set(pyl, k, -190 + (k % 2) * 14, 0, -len / 2 + 30 + k * (len - 60) / 14, 0); seg.group.add(pyl);
    seg.tick.push((t) => { for (let k = 0; k < 15; k++) { QC.setHSL(((t * .05 + k * .07) % 1), .9, .6); pyl.instanceColor.setXYZ(k, QC.r * 1.8, QC.g * 1.8, QC.b * 1.8); } pyl.instanceColor.needsUpdate = true; });
    seg.lax = true; seg.cams = { lax: { p: [330, 130, len * .3], t: [120, 20, -len * .2], fov: 60 } }; lmCount.lax = (lmCount.lax || 0) + (WARM ? 0 : 1); }

  /* INGLEWOOD (2026-10-19, route part 1, after Melody): generic look-alikes, no names or logos.
     sofi: a huge stadium under a floating translucent canopy roof (pale panels, lit edge) with the bowl sunk below street level and its lot;
     inglewood: the round arena with its ring of tall white columns, and a drive-in donut shop with a giant donut standing on its roof. */
  let ING = null;
  const ingM = () => ING || (ING = { can: new THREE.MeshStandardMaterial({ color: 0xeef2f6, roughness: .3, metalness: .2, transparent: true, opacity: .82, emissive: 0x30343c, side: THREE.DoubleSide }),
    edge: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 1.5, 1.7), toneMapped: false }), bowl: new THREE.MeshLambertMaterial({ color: 0x9aa0a8, side: THREE.DoubleSide }), field: new THREE.MeshLambertMaterial({ color: 0x3f8a3a }),
    col: new THREE.MeshLambertMaterial({ color: 0xf2efe8 }), drum: new THREE.MeshLambertMaterial({ color: 0xd8d2c6 }), roof: new THREE.MeshLambertMaterial({ color: 0x5a5c62 }), dough: new THREE.MeshStandardMaterial({ color: 0xb8742e, roughness: .7 }) });
  function sofi(seg, R, len, side) { const M2 = ingM(), cx = side * 40; city(seg, R, len, { block: [[cx, 0, 380, 340]], cars: 22, style: "city" });
    seg.group.add(mesh(new THREE.PlaneGeometry(390, 350).rotateX(-Math.PI / 2), lotMat(), cx, .15, 0));
    const g = new THREE.Group(); g.position.set(cx, 0, 0); seg.group.add(g);
    const bowl = new THREE.LatheGeometry([new THREE.Vector2(80, -12), new THREE.Vector2(140, 4), new THREE.Vector2(150, 10)], 40); bowl.scale(1, 1, .7); g.add(mesh(bowl, M2.bowl));
    const fld = new THREE.CircleGeometry(80, 32).rotateX(-Math.PI / 2); fld.scale(1, 1, .7); g.add(mesh(fld, M2.field, 0, -11, 0));
    const can = new THREE.SphereGeometry(1, 40, 8, 0, TAU, 0, .5); can.scale(178 / .479, 150, 138 / .479); g.add(mesh(can, M2.can, 0, 32 - .878 * 150, 0));   // the canopy, floating on slim posts
    const rim = new THREE.TorusGeometry(1, .012, 4, 64).rotateX(Math.PI / 2); rim.scale(178, 1, 138); g.add(mesh(rim, M2.edge, 0, 32, 0));
    const posts = []; for (let k = 0; k < 14; k++) { const a = k / 14 * TAU; posts.push([new THREE.CylinderGeometry(1.1, 1.1, 34, 5), T4(Math.cos(a) * 172, 16, Math.sin(a) * 132)]); } g.add(mesh(merge(posts), M.dark));
    seg.focus = { x: cx, z: 0, y: 20, d: 420, h: 180 }; lmCount.stadiumRoof = (lmCount.stadiumRoof || 0) + (WARM ? 0 : 1); }
  function inglewood(seg, R, len) { const M2 = ingM(), mb = midBlock(len), fx = 320, dx = -320;
    city(seg, R, len, { res: true, mixed: true, style: "res", cars: 24, hmul: .5, clear: [[fx, mb.zc, 150, 150], [dx, mb.zc, 70, 70]] });
    seg.blocked.push([fx, mb.zc, 136, 136], [dx, mb.zc, 60, 60]);
    // the round arena: a drum, a dark flat roof, a ring of tall white columns standing off the wall, floodlit
    const a = new THREE.Group(); a.position.set(fx, 0, mb.zc); seg.group.add(a);
    a.add(mesh(new THREE.CylinderGeometry(52, 52, 26, 40).translate(0, 13, 0), M2.drum), mesh(new THREE.CylinderGeometry(60, 60, 3, 40).translate(0, 27.5, 0), M2.col), mesh(new THREE.CylinderGeometry(56, 56, 1, 40).translate(0, 29.4, 0), M2.roof));
    const cols = []; for (let k = 0; k < 40; k++) { const t = k / 40 * TAU; cols.push([new THREE.CylinderGeometry(1.2, 1.4, 27, 6), T4(Math.cos(t) * 58, 13.5, Math.sin(t) * 58)]); } a.add(mesh(merge(cols), M2.col));
    a.add(mesh(new THREE.PlaneGeometry(170, 170).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xfff0d8, opacity: .35, toneMapped: false }), 0, .6, 0));
    // the donut shop: a small drive-in with a giant donut standing upright on the roof
    const d = new THREE.Group(); d.position.set(dx, 0, mb.zc); seg.group.add(d);
    d.add(mesh(new THREE.BoxGeometry(34, 9, 24).translate(0, 4.5, 0), M2.col), mesh(new THREE.BoxGeometry(36, 1.4, 26).translate(0, 9.7, 0), M.dark));
    const dn = mesh(new THREE.TorusGeometry(13, 5.2, 12, 28), M2.dough, 0, 25, 0); d.add(dn, mesh(new THREE.BoxGeometry(2, 6, 2).translate(0, 12, 0), M.dark));
    seg.tick.push((t) => { dn.rotation.y = Math.sin(t * .3) * .3; });
    seg.inglewood = { arena: [fx, mb.zc], donut: [dx, mb.zc] }; seg.cams = { arena: { p: [fx - 40, 110, mb.zc + 190], t: [fx, 12, mb.zc], fov: 60 }, donut: { p: [dx + 30, 45, mb.zc + 80], t: [dx, 14, mb.zc], fov: 60 } }; seg.focus = { x: (fx + dx) / 2, z: mb.zc, y: 10, d: 520, h: 230 }; lmCount.arena = (lmCount.arena || 0) + (WARM ? 0 : 1); }

  // downtown signature towers (generic look-alikes): a stepped cylinder with a lit crown and a slim tower with a sail roof + spire
  function dtlaIcons(seg, side, zc) {   /* (both stand inside the block at zc: never on a street) */ const glass = new THREE.MeshStandardMaterial({ color: 0x5f7486, roughness: .2, metalness: .6, emissive: 0x1a2430, emissiveIntensity: .6 });
    const a = new THREE.Group(); a.position.set(side * 640, 0, zc); seg.group.add(a);
    a.add(mesh(new THREE.CylinderGeometry(40, 42, 300, 24).translate(0, 150, 0), glass), mesh(new THREE.CylinderGeometry(33, 38, 34, 24).translate(0, 317, 0), glass), mesh(new THREE.CylinderGeometry(24, 30, 22, 24).translate(0, 345, 0), glass));
    a.add(mesh(new THREE.TorusGeometry(31, 1.6, 6, 32).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffe6b0, toneMapped: false }), 0, 334, 0));
    const b = new THREE.Group(); b.position.set(-side * 650, 0, zc); seg.group.add(b);
    b.add(mesh(new THREE.BoxGeometry(70, 330, 46).translate(0, 165, 0), glass)); const sail = new THREE.Shape([[-35, 0], [35, 0], [35, 30], [-35, 4]].map(p => new THREE.Vector2(p[0], p[1])));
    b.add(mesh(new THREE.ExtrudeGeometry(sail, { depth: 46, bevelEnabled: false }).translate(0, 330, -23), glass)); b.add(mesh(new THREE.CylinderGeometry(.8, 2.4, 70, 6).translate(30, 395, 0), M.white));
    b.add(mesh(new THREE.BoxGeometry(72, 2, 48).translate(0, 331, 0), new THREE.MeshBasicMaterial({ color: 0x9fd4ff, toneMapped: false })));
    seg.blocked.push([side * 640, zc, 90, 90], [-side * 650, zc, 80, 60]); seg.focus = { x: 0, z: zc - 40, y: 160, d: 900, h: 140 }; }
  // the mountains behind the Valley: ridges either side, past the edge of the street grid
  function ridges(seg, R, len, hk) { for (const sd of [-1, 1]) { const g = new THREE.PlaneGeometry(900, len, 18, 10).rotateX(-Math.PI / 2), p = g.attributes.position, col = [];
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), u = (x * sd + 450) / 900, h = Math.max(0, u - .08) * (300 + 160 * (Math.sin(z * .008 + sd + seg.seed) * .5 + .5)) * hk; p.setY(i, h); const k = Math.min(1, h / 380); col.push(.3 + k * .18, .3 + k * .1, .2 + k * .14); }
      g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); seg.group.add(mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true }), sd * (XW / 2 + 440), -1, 0)); } }
  // the block nearest the middle of a strip, between two cross streets (for a landmark that must not sit on a road)
  function midBlock(len) { const st = streetsOf(len).sort((a, b) => a - b); let best = null; for (let k = 0; k < st.length - 1; k++) { const zc = (st[k] + st[k + 1]) / 2; if (!best || Math.abs(zc) < Math.abs(best.zc)) best = { zc, depth: st[k + 1] - st[k] - ROAD - 2 * SIDE }; }
    return best || { zc: 0, depth: CZ - ROAD - 2 * SIDE }; }

  /* ---------- a ground segment: kind ∈ city|towers|melody|stadium|hills|coast|venice|pier|runway ---------- */
  function segment(kind, len, seed, o = {}) {
    const R = rng(seed || 1), seg = { kind, len, seed: seed || 1, group: new THREE.Group(), tick: [], egg: null, melody: null, nalu: null, blds: [], shore: null, water: () => false, roads: [], blocked: [], carSrc: [], nets: [] };
    const side = o.side || 1; WARM = !!o.warm;
    if (!WARM && O.zoneKey) { const zk = O.zoneKey(); if (zk !== ZK) { ZK = zk; LB.n = 0; LB.t = -1e9; LB.aq = 0; LB.aqT = -1e9; LB.gp = 0; STN.i = 0; for (const q in lmCount) delete lmCount[q]; } }   // a new district / level: landmark budgets start over
    if (kind === "runway") runway(seg, R, len, o);
    else if (kind === "hills") hills(seg, R, len);
    else if (kind === "hollywood") hills(seg, R, len, { sign: true });
    else if (kind === "mountains") hills(seg, R, len, { mtn: true });
    else if (kind === "coast" || kind === "venice" || kind === "pier" || kind === "oceanave" || kind === "octown") coast(seg, R, len, kind);
    else if (kind === "stadium" || kind === "ocstadium") { seg.oc = kind === "ocstadium"; stadium(seg, R, len, side); }
    else if (kind === "longbeach" || kind === "harbor") longBeach(seg, R, len, kind);
    else if (kind === "compton") streetNames(seg, len, city(seg, R, len, { res: true, mixed: true, style: "res", cars: 22, hmul: .45, palmGap: 40, parked: 30, bstyle: (R2) => R2() < .7 ? 0 : 3 }));
    else if (kind === "civic") { const sb = superBlock(len); streetNames(seg, len, city(seg, R, len, { res: true, style: "res", cars: 22, palmGap: 40, block: [[0, sb.zc, 264, sb.depth - 2]], noBillboard: true })); civic(seg, R, len, sb.zc, sb.depth); }
    else if (kind === "f105") freeway105(seg, R, len);
    else if (kind === "sofi") sofi(seg, R, len, side);
    else if (kind === "inglewood") inglewood(seg, R, len);
    else if (kind === "hwdblvd") { const vz = midBlock(len).zc, tx = HB_X - ROAD / 2 - SIDE - 38; hollywoodBlvd(seg, R, len, city(seg, R, len, { cars: 26, hmul: .85, reserve: [HB_X], noBillboard: true, clear: [[tx, vz, 90, 96]] }), vz); }
    else if (kind === "irvine") city(seg, R, len, { style: "oc", cars: 26, hmul: .5, hmin: 18, palmGap: 64, bstyle: (R2) => R2() < .55 ? 1 : R2() < .6 ? 3 : 0, tints: { 0: ["#f3eee4", "#efe6d6", "#e8dcc6"], 1: ["#b9c9d6", "#9fb4c4", "#cfd9e0"], 3: ["#e9e5dc", "#ddd7cc"] } });
    else if (kind === "dtla") { const mb = midBlock(len); city(seg, R, len, { tall: 2, hmul: 1.6, cars: 32, clear: [[side * 640, mb.zc, 110, 110], [-side * 650, mb.zc, 100, 80]], bstyle: (R2, h) => h > 90 ? (R2() < .7 ? 1 : 3) : FAC.pick(R2, h) }); dtlaIcons(seg, side, mb.zc); }
    else if (kind === "valley") { city(seg, R, len, { res: true, mixed: true, style: "res", cars: 26, hmul: .4, palmGap: 60, bstyle: (R2) => R2() < .7 ? 0 : 3, tints: { 0: ["#e9dcc3", "#d9c7a7", "#efe6d6", "#cdb998"] } }); ridges(seg, R, len, 1); }
    else if (kind === "melody") { const mz = melodyZ(len); city(seg, R, len, { clear: [[side * 64 - side * 50, mz.cz, 300, 150]], cars: 34, parkedAt: mz.parked(side) }); melody(seg, R, len, side, mz); }
    else { city(seg, R, len, { tall: kind === "towers", clear: o.egg ? [[(o.eggSide || 1) * 210, -len * .12, 70, 40]] : [], cars: 30 }); if (o.egg) egg(seg, R, len, o.eggSide || 1); }
    seg.update = (t, dt, near) => { for (let i = 0; i < seg.tick.length; i++) seg.tick[i](t, dt || 0, !!near); };
    // ROAD AUDIT (hard rule: cars only on drawn street lanes): every car this strip owns, checked against its real roads and landmark footprints
    seg.audit = () => { const bad = []; let n = 0; const H2 = ROAD / 2 - 1;
      const onRoad = (x, z) => seg.roads.some(r => r.strip ? (x >= r.strip[0] + 1 && x <= r.strip[1] - 1 && z >= r.strip[2] - 1 && z <= r.strip[3] + 1)
        : (x >= r.x0 && x <= r.x1 && Math.abs(z) <= len / 2 + 1 && (r.aves.some(a => Math.abs(x - r.ox - a) <= H2) || r.strs.some(q => Math.abs(z - q) <= H2))));
      const inBlk = (x, z) => seg.blocked.some(b => Math.abs(x - b[0]) < b[2] / 2 && Math.abs(z - b[1]) < b[3] / 2);
      for (const src of seg.carSrc) for (const p of src()) { n++; if (!onRoad(p[0], p[1]) || inBlk(p[0], p[1])) bad.push([kind, Math.round(p[0]), Math.round(p[1]), p[2] ? "parked" : "moving"]); }
      return { n, bad }; };
    // the building a world point is inside (plane: rx/rz = half wingspan / half length; shots: small), or null
    seg.collide = (wx, wy, wz, rx, rz) => { for (const B of seg.blds) { const o = B.hit(wx, wy, wz, rx, rz); if (o) return { B, o }; } return null; };
    seg.smash = (h, wx, wy, wz, how, w) => h.B.smash(h.o, wx, wy, wz, how, w);
    seg.scatter = (wx, wz, r) => { (seg.crowds || []).forEach(C => C.scatterW && C.scatterW(wx, wz, r)); };
    if (!WARM) LIVE.add(seg);
    seg.dispose = () => { LIVE.delete(seg); (seg.crowds || []).forEach(C => C.dispose && C.dispose()); (seg.nets || []).forEach(n => n.dispose()); seg.group.traverse(n => { if (n.isInstancedMesh) n.dispose(); if (n.isMesh && n.geometry && !SHARED.has(n.geometry)) n.geometry.dispose(); }); };
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
    M.facade.emissiveIntensity = BASEI.facade * (.12 + 1.18 * n); M.pool.opacity = Math.min(1, BASEI.pool * 1.45 * n); M.beam.opacity = BASEI.beam * n; M.lamp.color.setScalar(.35 + .85 * n); }   /* night: windows +30%, street-light pools +45%, lamp heads overbright so they read */
  return { impact, shift, landmarks: () => Object.assign({}, lmCount), boards: () => boardsAll.filter(b => { let p = b.parent, n = 0; while (p && n++ < 12) { if (p.isScene) return true; p = p.parent; } return false; }), segment, root, wind, tick, debris, sun: SUN, M, ocean: oceanM, coverTex, logoTex, setDaylight, setSkyLight, beachWater: BEACH.water, setWind: (v) => { UWIND.value = v; } };
}
