/* Melody flight game: LOOK A2 preview (2026-10-16). Look A (chase cam, golden hour) with Antidote's second round of asks:
   a more detailed airliner, real damage (scorched holes that keep trailing smoke and fire, black smoke from a burning
   engine at low health), the 3D city below with moving cars, Melody Bar & Grill with its guard and line, and the Easter
   egg: his review on a roadside screen and his white sedan with the ANTIDOTE plate. Same modules as the game
   (../world3d.js, ../air3d.js). Scripted 11 s flight; window.frameAt(t) steps the simulation to t and returns a JPEG. */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { makeWorld } from "../world3d.js";
import { buildAirliner, makeFX, makeDamage } from "../air3d.js";

const W = 720, H = 1280, DUR = 11, SPAN = 86, ALT = 150, V = 200;
const cv = document.getElementById("gl");
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(56, W / H, 4, 6000);
const pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
{ const c = document.createElement("canvas"); c.width = 4; c.height = 512; const x = c.getContext("2d"), g = x.createLinearGradient(0, 0, 0, 512);
  [[0, "#141c44"], [.2, "#2b2c62"], [.32, "#6a3f72"], [.39, "#c4616e"], [.43, "#f29a5c"], [.455, "#ffd08a"], [.48, "#e9a26c"], [1, "#e9a26c"]].forEach(s => g.addColorStop(s[0], s[1])); x.fillStyle = g; x.fillRect(0, 0, 4, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; scene.background = t; }
scene.fog = new THREE.Fog(0xd89068, 900, 3400);
scene.add(new THREE.HemisphereLight(0xffd9b8, 0x3a2c3a, 1.05));
const sun = new THREE.DirectionalLight(0xffc28a, 2.2); scene.add(sun, sun.target);

/* ---------- the ground route ---------- */
const world = makeWorld(THREE, { base: "../" });
const ROUTE = [["runway", 520], ["city", 500], ["melody", 500, { side: -1 }], ["city", 500, { egg: 1, eggSide: 1 }], ["towers", 500], ["stadium", 520, { side: 1 }], ["hills", 520], ["coast", 500], ["pier", 520]];
const segs = []; { let z = 600; ROUTE.forEach((r, i) => { const s = world.segment(r[0], r[1], 11 + i * 7, r[2] || {}); s.group.position.z = z - r[1] / 2; z -= r[1]; scene.add(s.group); segs.push(s); }); }
const eggSeg = segs[3], EGG_T = 7.6;

/* ---------- aircraft ---------- */
const fx = makeFX(THREE, scene);
const AIR = buildAirliner(THREE), plane = new THREE.Group(); plane.add(AIR.node); const PK = SPAN / AIR.size.x; AIR.node.scale.setScalar(PK); plane.rotation.order = "YXZ"; scene.add(plane);
const pDmg = makeDamage(THREE, fx, AIR.node, AIR.pts.wound);
const ENEMY = buildAirliner(THREE, { livery: "enemy" }), kami = new THREE.Group(); kami.add(ENEMY.node); ENEMY.node.scale.setScalar(80 / ENEMY.size.x); scene.add(kami);
const kDmg = makeDamage(THREE, fx, ENEMY.node, ENEMY.pts.wound);
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
async function glb(file, size) { const g = await loader.loadAsync("../3d/" + file), root = g.scene; root.traverse(o => { if (o.isMesh) { if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals(); o.material.metalness = .3; o.material.roughness = .45; } });
  const box = new THREE.Box3().setFromObject(root), c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3()); root.position.sub(c); const inner = new THREE.Group(); inner.add(root); inner.scale.setScalar(size / Math.max(sz.x, sz.z));
  const o = new THREE.Group(); o.add(inner); scene.add(o); o.userData.mats = []; root.traverse(n => { if (n.isMesh) o.userData.mats.push(n.material); });
  // wound spots: real points on the model's surface
  o.updateMatrixWorld(true); const pts = []; root.traverse(n => { if (!n.isMesh) return; const p = n.geometry.attributes.position; for (let i = 0; i < 10; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, (Math.random() * p.count) | 0); n.localToWorld(v); inner.worldToLocal(v); pts.push(v); } });
  o.userData.inner = inner; o.userData.spots = pts; return o; }
const [jet, ufo, burger] = await Promise.all([glb("jet.glb", 92), glb("ufo.glb", 84), glb("p_burger.glb", 40)]);
const jDmg = makeDamage(THREE, fx, jet.userData.inner, jet.userData.spots, { hole: 2.2 / jet.userData.inner.scale.x });
const flash = (o, v) => o.userData.mats && o.userData.mats.forEach(m => { if (m.emissive) { m.emissive.setHex(0xff6a5a); m.emissiveIntensity = v; } });

/* ---------- script ---------- */
const KX = [[0, 0], [2, -20], [4.6, -55], [6.2, 40], [7.6, 150], [9.2, 110], [11, 10], [12, 0]];
function px(t) { let i = 0; while (i < KX.length - 2 && t > KX[i + 1][0]) i++; const [t0, a] = KX[i], [t1, b] = KX[i + 1], u = Math.max(0, Math.min(1, (t - t0) / (t1 - t0))), e = u * u * (3 - 2 * u); return a + (b - a) * e; }
const py = t => ALT + 6 * Math.sin(t * .9), pz = t => 300 - V * t;
const dpx = t => (px(t + .03) - px(t - .03)) / .06, dpy = t => (py(t + .03) - py(t - .03)) / .06;
const TE = 3.4, jetX = px(2.6), jetPos = t => new THREE.Vector3(jetX, ALT + 8, pz(t) - (1300 - 330 * t));
const kamiPos = t => new THREE.Vector3(px(9.6) - 6, ALT + 4, pz(t) - (2300 - 260 * t));
const ORBS = [[4.5, 0], [5.3, 1]], HIT1 = 5.3 + 1, HIT2 = 9.3;
const FIRE = []; for (let f = 1.3; f < TE; f += .1) FIRE.push(f); for (let f = 8.2; f < 10.6; f += .1) FIRE.push(f);
const laserG = new THREE.BoxGeometry(1.6, 1.6, 56), laserM = new THREE.MeshBasicMaterial({ color: 0xffd0c8, toneMapped: false }), laserGM = new THREE.MeshBasicMaterial({ color: 0xff2030, transparent: true, opacity: .75, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), laserGG = new THREE.BoxGeometry(5.5, 5.5, 62);
const lasers = FIRE.flatMap(() => [0, 1]).map(() => { const g = new THREE.Group(); g.add(new THREE.Mesh(laserG, laserM), new THREE.Mesh(laserGG, laserGM)); scene.add(g); return g; });
const debris = Array.from({ length: 16 }, () => { const m = new THREE.Mesh(new THREE.BoxGeometry(4 + Math.random() * 6, 1, 3 + Math.random() * 4), new THREE.MeshStandardMaterial({ color: Math.random() < .5 ? 0x8c939e : 0x4a4f58, metalness: .6, roughness: .4 })); scene.add(m); m.visible = false;
  return { m, v: new THREE.Vector3((Math.random() - .5) * 240, 60 + Math.random() * 140, (Math.random() - .5) * 240), r: new THREE.Vector3(Math.random() * 9, Math.random() * 9, Math.random() * 9) }; });
const orbM = new THREE.MeshBasicMaterial({ color: 0x9effd8, toneMapped: false }), orbs = ORBS.map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(3.4, 10, 8), orbM); scene.add(m); return m; });

/* ---------- HUD ---------- */
const hud = document.getElementById("hud"), hx = hud.getContext("2d"), PV = new THREE.Vector3();
const project = (v) => { PV.copy(v).project(cam); return [(PV.x + 1) / 2 * W, (1 - PV.y) / 2 * H, PV.z < 1]; };
function rr(x, y, w, h, r) { hx.beginPath(); hx.moveTo(x + r, y); hx.arcTo(x + w, y, x + w, y + h, r); hx.arcTo(x + w, y + h, x, y + h, r); hx.arcTo(x, y + h, x, y, r); hx.arcTo(x, y, x + w, y, r); hx.closePath(); }
const coverImg = new Image(); coverImg.src = "../img/review/cover.webp";
function drawHud(t, hp) {
  hx.clearRect(0, 0, W, H);
  const g = hx.createLinearGradient(0, 0, 0, 176); g.addColorStop(0, "rgba(12,18,36,.95)"); g.addColorStop(1, "rgba(12,18,36,.84)"); hx.fillStyle = g; hx.fillRect(0, 0, W, 176);
  const score = 2240 + Math.floor(t * 40) + (t > TE ? 500 : 0) + (t > EGG_T ? 500 : 0);
  hx.fillStyle = "#f0d375"; hx.font = "400 64px Anton, Impact, sans-serif"; hx.textAlign = "left"; hx.fillText(score.toLocaleString("en-US"), 26, 98);
  hx.fillStyle = "#9aa3b5"; hx.font = "800 22px Barlow, system-ui, sans-serif"; hx.fillText("H E A L T H", 250, 58); hx.textAlign = "right"; hx.fillText(Math.round(hp) + "%", 590, 58);
  hx.fillStyle = "rgba(255,255,255,.08)"; rr(250, 72, 340, 26, 13); hx.fill(); const f = hp / 100, hg = hx.createLinearGradient(250, 0, 590, 0); hg.addColorStop(0, f > .5 ? "#43c27e" : "#ff8a3a"); hg.addColorStop(1, f > .5 ? "#8ee05a" : "#ffb03b"); hx.fillStyle = hg; rr(250, 72, Math.max(26, 340 * f), 26, 13); hx.fill();
  hx.fillStyle = "rgba(12,18,36,.9)"; hx.fillRect(362, 72, 4, 26); hx.fillRect(476, 72, 4, 26);
  hx.fillStyle = "#fff"; hx.font = "800 40px Barlow, system-ui, sans-serif"; hx.fillText(Math.max(0, 33 - Math.floor(t)) + "s", 700, 96);
  hx.textAlign = "left"; hx.fillStyle = "#c9d2ee"; hx.font = "700 24px Barlow, system-ui, sans-serif"; hx.fillText("Level 4 of 10", 26, 150);
  hx.textAlign = "right"; hx.fillStyle = "#ff4a4a"; hx.font = "800 28px Barlow, system-ui, sans-serif"; hx.fillText("Red beams", 610, 150);
  ["#f0d375", "#7dff6a", "#ff9a2e", "#3aa8ff", "#ff2d2d"].forEach((c, i) => { hx.fillStyle = c; rr(624 + i * 18, 128, 14, 26, 4); hx.fill(); });
  // drizzle token counter (the review quest), full = review unlocked
  hx.textAlign = "left"; hx.fillStyle = "rgba(12,18,36,.8)"; rr(18, 192, 250, 44, 22); hx.fill(); hx.fillStyle = "#f0d375"; hx.font = "800 24px Barlow, system-ui, sans-serif"; hx.fillText(t > 2.2 ? "✓ 7/7 Drizzle · review unlocked" : "6/7 Antidote Drizzle", 34, 222);
  // the review poster: always on screen in the game, kept as a small corner card
  if (coverImg.complete && coverImg.naturalWidth) { hx.save(); rr(W - 178, 194, 160, 90, 12); hx.clip(); hx.drawImage(coverImg, W - 178, 194, 160, 90); hx.restore(); hx.strokeStyle = "#d4af37"; hx.lineWidth = 3; rr(W - 178, 194, 160, 90, 12); hx.stroke(); }
  const pop = (txt, col, v, t0, big) => { const u = (t - t0) / 1.2; if (u < 0 || u > 1) return; const p = project(v); if (!p[2]) return; hx.globalAlpha = 1 - u * u; hx.textAlign = "center"; hx.font = "800 " + (big ? 38 : 32) + "px Barlow, system-ui, sans-serif"; hx.lineWidth = 6; hx.strokeStyle = "rgba(5,8,20,.85)"; hx.strokeText(txt, p[0], p[1] - 70 * u); hx.fillStyle = col; hx.fillText(txt, p[0], p[1] - 70 * u); hx.globalAlpha = 1; };
  pop("+500  JET DOWN!", "#f0d375", jetPos(TE), TE, 1); pop("-33%  Zapped!", "#ff7a6a", plane.position.clone().add(new THREE.Vector3(0, 30, 0)), HIT1); pop("-33%  Mid-air hit!", "#ff7a6a", plane.position.clone().add(new THREE.Vector3(0, 30, 0)), HIT2);
  pop("MELODY BAR & GRILL", "#f0d375", new THREE.Vector3(segs[2].melody.x, 70, segs[2].group.position.z + segs[2].melody.z), 3.0);
  // Easter egg toast
  const u = t - EGG_T; if (u > 0 && u < 2.6) { const a = Math.min(1, u * 5, (2.6 - u) * 3); hx.globalAlpha = a; hx.fillStyle = "rgba(12,18,36,.92)"; rr(60, 300, 600, 132, 26); hx.fill(); hx.strokeStyle = "#d4af37"; hx.lineWidth = 3; rr(60, 300, 600, 132, 26); hx.stroke();
    hx.textAlign = "center"; hx.fillStyle = "#f0d375"; hx.font = "800 38px Barlow, system-ui, sans-serif"; hx.fillText("🚗 You found Antidote! +500", W / 2, 352); hx.fillStyle = "#e8eefc"; hx.font = "700 28px Barlow, system-ui, sans-serif"; hx.fillText("Watch his Melody review ▶", W / 2, 400); hx.globalAlpha = 1; }
  hx.textAlign = "left"; hx.font = "800 26px Barlow, system-ui, sans-serif"; hx.fillStyle = "rgba(12,18,36,.78)"; rr(22, H - 112, 470, 84, 20); hx.fill();
  hx.fillStyle = "#f0d375"; hx.fillText("A2 · Chase cam, detailed", 42, H - 72); hx.fillStyle = "#c9d2ee"; hx.font = "600 20px Barlow, system-ui, sans-serif"; hx.fillText("3D city · damage smoke & fire · Melody · Easter egg", 42, H - 44);
}

/* ---------- simulation ---------- */
let simT = 0, hp = 100, boomed = false; const ZERO = new THREE.Vector3(), tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
function step(t, dt) {
  const X = px(t), Y = py(t), Z = pz(t), bank = Math.max(-1, Math.min(1, dpx(t) / 120)), climb = Math.max(-1, Math.min(1, dpy(t) / 12));
  plane.position.set(X, Y, Z); plane.rotation.set(-climb * .1, Math.PI - bank * .1, bank * .55); AIR.spin(t);
  // hits on you: the second orb (wing), then the enemy airliner's clip (engine) → low health: burning engine
  if (t >= HIT1 && hp > 90) { hp = 66.7; pDmg.hit(AIR.pts.wound[0]); }
  if (t >= HIT2 && hp > 60) { hp = 33.3; pDmg.hit(AIR.pts.wound[3]); pDmg.hit(AIR.pts.wound[4]); pDmg.level = .7; }
  pDmg.update(dt, t, PK, ZERO, AIR.pts.eng);
  // lights: nav red (left) / green (right), double white strobes, red beacons, warm engine exhaust
  plane.updateMatrixWorld(true); const L = (p) => AIR.node.localToWorld(tmp.copy(p));
  fx.glow(L(AIR.pts.tipL), 8, [1, .15, .12], .95); fx.glow(L(AIR.pts.tipR), 8, [.15, 1, .35], .95);
  const sp = t % 1.2; if (sp < .06 || (sp > .16 && sp < .22)) { fx.glow(L(AIR.pts.tipL), 26, [1, 1, 1], 1); fx.glow(L(AIR.pts.tipR), 26, [1, 1, 1], 1); fx.glow(L(AIR.pts.tail), 18, [1, 1, 1], 1); }
  if ((t + .5) % 1 < .12) { fx.glow(L(AIR.pts.beaconTop), 12, [1, .1, .05], 1); fx.glow(L(AIR.pts.beaconBot), 12, [1, .1, .05], 1); }
  AIR.pts.eng.forEach(e => fx.glow(L(e), 7, [1, .55, .25], .5));
  // the jet: closes in, takes hits (wounds smoke, then burn), explodes at TE
  const jp = jetPos(Math.min(t, TE)); jet.visible = t < TE; jet.position.copy(jp); jet.rotation.set(.05, 0, Math.sin(t * 1.3) * .15);
  const hits = FIRE.filter(f => f < TE && t > f + .35).length; while (jDmg.count() < Math.min(5, Math.floor(hits / 5))) jDmg.hit(); jDmg.level = Math.min(1, hits / 26); if (t < TE) jDmg.update(dt, t, jet.userData.inner.scale.x, ZERO, null);
  flash(jet, t > 1.7 && t < TE && Math.sin(t * 47) > .55 ? .8 : 0);
  if (t >= TE && !boomed) { boomed = true; fx.boom(jetPos(TE), 1.0); }
  debris.forEach(d => { const u = t - TE; d.m.visible = u > 0 && u < 3; if (!d.m.visible) return; d.m.position.copy(jetPos(TE)).addScaledVector(d.v, u); d.m.position.y -= 90 * u * u; d.m.rotation.set(d.r.x * u, d.r.y * u, d.r.z * u); if (Math.random() < dt * 30) fx.emit(d.m.position, ZERO, .9, 3, 12, [.3, .28, .27], [.1, .1, .1], .7, false, 0); });
  // the enemy airliner: head-on from far ahead, banks away under fire, smoking and burning
  const kp = kamiPos(t); kami.visible = t > 5.2 && kp.z < plane.position.z + 60; kami.position.copy(kp); kami.position.x += Math.max(0, t - 9.4) * 60; kami.rotation.set(0, 0, Math.max(0, t - 9.4) * -.5);
  const kh = FIRE.filter(f => f > 8 && t > f + .3).length; while (kDmg.count() < Math.min(5, Math.floor(kh / 4))) kDmg.hit(); kDmg.level = Math.min(1, kh / 18); if (kami.visible) kDmg.update(dt, t, 80 / ENEMY.size.x, ZERO, ENEMY.pts.eng);
  ENEMY.spin(t); if (kami.visible) { kami.updateMatrixWorld(true); [ENEMY.pts.land[0], ENEMY.pts.land[1]].forEach(p => fx.glow(ENEMY.node.localToWorld(tmp2.copy(p)), 30, [1, .95, .8], .8)); }
  // lasers
  let li = 0, firing = false; FIRE.forEach(tf => [0, 1].forEach(side => { const Lz = lasers[li++], age = t - tf; if (age < 0 || age > 1.2) { Lz.visible = false; return; } if (age < .05) firing = true;
    const z = pz(tf) - 30 - (V + 1300) * age, tz = tf < TE ? jetPos(t).z : kamiPos(t).z; Lz.visible = !(t < (tf < TE ? TE : 10.6) && z < tz + 10); Lz.position.set(px(tf) + (side ? 1 : -1) * 16, py(tf) - 3, z); }));
  if (firing) AIR.pts.muzzle.forEach(m => fx.glow(L(m), 22, [1, .3, .25], 1));
  // ufo + orbs
  const ud = 1700 - 230 * t; ufo.position.set(-170 + 40 * Math.sin(t * 1.3), ALT + 30, pz(t) - ud); ufo.rotation.set(.12, t * 1.8, 0); ufo.visible = ud > -80; fx.glow(tmp.copy(ufo.position).setY(ALT + 14), 120, [.4, 1, .75], .35);
  ORBS.forEach(([t0, hits], i) => { const a = (t - t0) / 1.0, o = orbs[i]; o.visible = a > 0 && a < 1; if (!o.visible) return; const from = new THREE.Vector3(-170 + 40 * Math.sin(t0 * 1.3), ALT + 26, pz(t0) - (1700 - 230 * t0)), to = hits ? new THREE.Vector3(px(t0 + 1) + 14, py(t0 + 1), pz(t0 + 1)) : new THREE.Vector3(px(t0 + 1) - 70, py(t0 + 1) + 10, pz(t0 + 1) + 40);
    o.position.lerpVectors(from, to, a); fx.glow(o.position, 36, [.4, 1, .8], .9); });
  // a Melody burger floating in your path
  burger.visible = t < 6.9; burger.position.set(px(6.9), py(6.9) + 2, pz(6.9)); burger.rotation.set(.35, t * 2.2, 0); fx.glow(burger.position, 70, [1, .8, .45], .45);
  // the world
  segs.forEach((s, i) => s.update(s === eggSeg ? t - EGG_T + 5.15 : t));
  // camera: behind and above, a little lag on the turns, shake after the blast and the hits
  const lag = X * .82 + px(t - .35) * .18, sh = (t > TE ? 4 * Math.exp(-(t - TE) * 4) : 0) + (t > HIT1 ? 3 * Math.exp(-(t - HIT1) * 6) : 0) + (t > HIT2 ? 3 * Math.exp(-(t - HIT2) * 6) : 0);
  cam.position.set(lag + Math.sin(t * 61) * sh, Y + 34 + Math.cos(t * 53) * sh, Z + 182); cam.up.set(Math.sin(bank * .07), 1, 0).normalize(); cam.lookAt(X * .9, Y - 52, Z - 380);
  sun.position.set(X - 260, Y + 240, Z + 360); sun.target.position.set(X, 0, Z - 200);
  fx.update(dt);
}
function frame(t) { while (simT < t - 1e-6) { const d = Math.min(1 / 60, t - simT); simT += d; step(simT, d); } if (simT === 0) step(0, 0); renderer.render(scene, cam); drawHud(t, hp); }
const out = document.createElement("canvas"); out.width = W; out.height = H; const ox = out.getContext("2d");
window.frameAt = (t) => { frame(t); ox.drawImage(cv, 0, 0); ox.drawImage(hud, 0, 0); return out.toDataURL("image/jpeg", .92); };
try { await Promise.all([document.fonts.load("400 64px Anton"), document.fonts.load("800 22px Barlow"), document.fonts.load("600 20px Barlow"), document.fonts.load("700 24px Barlow")]); } catch (e) {}
await new Promise(r => setTimeout(r, 600));   // textures (logo, review cover) finish decoding
window.LOOK_READY = true;
if (!window.CAPTURE) { const t0 = performance.now(); const loop = () => { const t = ((performance.now() - t0) / 1000) % DUR; if (t < simT) { simT = 0; hp = 100; boomed = false; pDmg.reset(); jDmg.reset(); kDmg.reset(); fx.clear(); } frame(t); requestAnimationFrame(loop); }; loop(); }
