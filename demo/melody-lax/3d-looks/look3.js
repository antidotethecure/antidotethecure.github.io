/* Melody flight game: LOOK A3 preview (2026-10-16). Look A2 plus Antidote's third round: windows switching on and off,
   rooftop kit and restaurant kitchen smoke, a lower skyline, climbing and diving, buildings that break when you clip them
   (and when your beams hit them), a helicopter burst you dodge (tracers), and Venice: the wave shader with sunset glints,
   breaking waves and foam, surfers, paddlers, the beach crowd, the lifeguard tower, the pier and Nalu Vida on it, with spray
   when you skim the water. Same modules as the game (../world3d.js, ../air3d.js). 15.5 s scripted flight;
   window.frameAt(t) steps the simulation to t and returns a JPEG (A3 = 0-8.6 s, A3b = 8-15.5 s). */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { makeWorld } from "../world3d.js";
import { buildAirliner, makeFX, makeDamage } from "../air3d.js";

const W = 720, H = 1280, DUR = 15.5, SPAN = 86, V = 200;
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

const fx = makeFX(THREE, scene, { max: 2400 });
const world = makeWorld(THREE, { base: "../", fx }); scene.add(world.root);
const ROUTE = [["city", 500], ["towers", 500], ["city", 500], ["city", 480], ["venice", 560], ["coast", 500], ["pier", 540], ["coast", 500]];
const segs = []; { let z = 600; ROUTE.forEach((r, i) => { const s = world.segment(r[0], r[1], 31 + i * 7, r[2] || {}); s.group.position.z = z - r[1] / 2; z -= r[1]; scene.add(s.group); segs.push(s); }); }

/* ---------- aircraft ---------- */
const AIR = buildAirliner(THREE), plane = new THREE.Group(); plane.add(AIR.node); const PK = SPAN / AIR.size.x; AIR.node.scale.setScalar(PK); plane.rotation.order = "YXZ"; scene.add(plane);
const pDmg = makeDamage(THREE, fx, AIR.node, AIR.pts.wound);
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
async function glb(file, size) { const g = await loader.loadAsync("../3d/" + file), root = g.scene; root.traverse(o => { if (o.isMesh) { if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals(); o.material.metalness = .3; o.material.roughness = .45; } });
  const box = new THREE.Box3().setFromObject(root), c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3()); root.position.sub(c); const inner = new THREE.Group(); inner.add(root); inner.scale.setScalar(size / Math.max(sz.x, sz.z));
  const o = new THREE.Group(); o.add(inner); scene.add(o); o.userData.mats = []; root.traverse(n => { if (n.isMesh) o.userData.mats.push(n.material); }); return o; }
const [heli, burger] = await Promise.all([glb("heli_blue.glb", 100), glb("p_burger.glb", 40)]);
const rotor = new THREE.Mesh(new THREE.CircleGeometry(52, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x20242c, transparent: true, opacity: .3, depthWrite: false })); scene.add(rotor);
const token = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshBasicMaterial({ transparent: true, alphaTest: .3, side: THREE.DoubleSide, toneMapped: false })); scene.add(token);
new THREE.TextureLoader().load("../img/game/antidote-logo.webp?v=ag1", t => { t.colorSpace = THREE.SRGBColorSpace; token.material.map = t; token.material.needsUpdate = true; });

/* ---------- the flight script ---------- */
const key = (K, t) => { let i = 0; while (i < K.length - 2 && t > K[i + 1][0]) i++; const [t0, a] = K[i], [t1, b] = K[i + 1], u = Math.max(0, Math.min(1, (t - t0) / (t1 - t0))), e = u * u * (3 - 2 * u); return a + (b - a) * e; };
const KX = [[0, 20], [1.5, 0], [3.2, -30], [5.2, -10], [5.9, 70], [6.8, 20], [8.2, -90], [9.6, -150], [11, -205], [12.6, -150], [14, -60], [16, -20]];
const KY = [[0, 140], [1.6, 140], [3.25, 74], [3.6, 82], [5, 150], [5.9, 176], [6.8, 150], [8.2, 110], [9.2, 66], [10.2, 62], [11.4, 82], [12.6, 64], [14, 70], [16, 120]];
const px = t => key(KX, t), py = t => key(KY, t), pz = t => 300 - V * t;
const dpx = t => (px(t + .03) - px(t - .03)) / .06, dpy = t => (py(t + .03) - py(t - .03)) / .06;
// make sure there is a tall roof under the dive at 3.3 s (the rooftop clip)
{ const zc = pz(3.3), xc = px(3.3); let best = null, bd = 1e9; segs.forEach(s => s.blds.forEach(B => B.L.forEach(o => { const gp = s.group.position, d = Math.hypot(gp.x + o.x - xc, gp.z + o.z - zc); if (d < bd) { bd = d; best = [B, o, s]; } })));
  if (best) { const [B, o, s] = best; const gp = s.group.position; o.x = xc - gp.x; o.z = zc - gp.z - 30; o.w = Math.max(o.w, 60); o.d = Math.max(o.d, 60); o.h = o.h0 = 92; B.im.setMatrixAt(o.i, new THREE.Matrix4().compose(new THREE.Vector3(o.x, 0, o.z), new THREE.Quaternion(), new THREE.Vector3(o.w, o.h, o.d))); B.im.instanceMatrix.needsUpdate = true; } }
const HELI = { t0: 4.3 }, heliPos = t => new THREE.Vector3(30 + 40 * Math.sin(t * .9), 168, pz(t) - (1500 - 190 * t));
const BURST = []; for (let b = 0; b < 3; b++) for (let i = 0; i < 6; i++) BURST.push(5.15 + b * .55 + i * .07);   // three bursts, aimed where you are when they fire
const FIRE = []; for (let f = .7; f < 1.5; f += .1) FIRE.push(f); for (let f = 6.9; f < 7.9; f += .1) FIRE.push(f);
const laserG = new THREE.BoxGeometry(1.6, 1.6, 56), laserM = new THREE.MeshBasicMaterial({ color: 0xffd0c8, toneMapped: false }), laserGM = new THREE.MeshBasicMaterial({ color: 0xff2030, transparent: true, opacity: .75, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), laserGG = new THREE.BoxGeometry(5.5, 5.5, 62);
const lasers = FIRE.flatMap(() => [0, 1]).map(() => { const g = new THREE.Group(); g.add(new THREE.Mesh(laserG, laserM), new THREE.Mesh(laserGG, laserGM)); g.userData.dead = false; scene.add(g); return g; });
const trG = new THREE.BoxGeometry(1.2, 1.2, 30), trM = new THREE.MeshBasicMaterial({ color: 0xfff0b0, toneMapped: false }), trGG = new THREE.BoxGeometry(4, 4, 36), trGM = new THREE.MeshBasicMaterial({ color: 0xffa030, transparent: true, opacity: .7, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
const tracers = BURST.map(tf => { const g = new THREE.Group(); g.add(new THREE.Mesh(trG, trM), new THREE.Mesh(trGG, trGM)); scene.add(g); const from = heliPos(tf).add(new THREE.Vector3(0, -8, 20)), to = new THREE.Vector3(px(tf), py(tf), pz(tf + .9)); g.userData = { tf, from, dir: to.sub(from).normalize() }; g.lookAt(g.position.clone().add(g.userData.dir)); return g; });

/* ---------- HUD ---------- */
const hud = document.getElementById("hud"), hx = hud.getContext("2d"), PV = new THREE.Vector3();
const project = (v) => { PV.copy(v).project(cam); return [(PV.x + 1) / 2 * W, (1 - PV.y) / 2 * H, PV.z < 1]; };
function rr(x, y, w, h, r) { hx.beginPath(); hx.moveTo(x + r, y); hx.arcTo(x + w, y, x + w, y + h, r); hx.arcTo(x + w, y + h, x, y + h, r); hx.arcTo(x, y + h, x, y, r); hx.arcTo(x, y, x + w, y, r); hx.closePath(); }
const coverImg = new Image(); coverImg.src = "../img/review/cover.webp";
let LABEL = ["A3 · Chase cam, buildings + altitude", "Lights on/off · kitchen smoke · climb/dive · break roofs · dodge"];
window.setLabel = (a, b) => { LABEL = [a, b]; };
const POPS = [];
function drawHud(t, hp) {
  hx.clearRect(0, 0, W, H);
  const g = hx.createLinearGradient(0, 0, 0, 176); g.addColorStop(0, "rgba(12,18,36,.95)"); g.addColorStop(1, "rgba(12,18,36,.84)"); hx.fillStyle = g; hx.fillRect(0, 0, W, 176);
  const score = 4120 + Math.floor(t * 40) + (t > 4.25 ? 120 : 0) + (t > 4.75 ? 50 : 0);
  hx.fillStyle = "#f0d375"; hx.font = "400 64px Anton, Impact, sans-serif"; hx.textAlign = "left"; hx.fillText(score.toLocaleString("en-US"), 26, 98);
  hx.fillStyle = "#9aa3b5"; hx.font = "800 22px Barlow, system-ui, sans-serif"; hx.fillText("H E A L T H", 250, 58); hx.textAlign = "right"; hx.fillText(Math.round(hp) + "%", 590, 58);
  hx.fillStyle = "rgba(255,255,255,.08)"; rr(250, 72, 340, 26, 13); hx.fill(); const f = hp / 100, hg = hx.createLinearGradient(250, 0, 590, 0); hg.addColorStop(0, f > .5 ? "#43c27e" : "#ff8a3a"); hg.addColorStop(1, f > .5 ? "#8ee05a" : "#ffb03b"); hx.fillStyle = hg; rr(250, 72, Math.max(26, 340 * f), 26, 13); hx.fill();
  hx.fillStyle = "rgba(12,18,36,.9)"; hx.fillRect(362, 72, 4, 26); hx.fillRect(476, 72, 4, 26);
  hx.fillStyle = "#fff"; hx.font = "800 40px Barlow, system-ui, sans-serif"; hx.fillText(Math.max(0, 38 - Math.floor(t)) + "s", 700, 96);
  hx.textAlign = "left"; hx.fillStyle = "#c9d2ee"; hx.font = "700 24px Barlow, system-ui, sans-serif"; hx.fillText("Level 5 of 10", 26, 150);
  hx.textAlign = "right"; hx.fillStyle = "#ff4a4a"; hx.font = "800 28px Barlow, system-ui, sans-serif"; hx.fillText("Red beams", 610, 150);
  ["#f0d375", "#7dff6a", "#ff9a2e", "#3aa8ff", "#ff2d2d"].forEach((c, i) => { hx.fillStyle = c; rr(624 + i * 18, 128, 14, 26, 4); hx.fill(); });
  hx.textAlign = "left"; hx.fillStyle = "rgba(12,18,36,.8)"; rr(18, 192, 290, 44, 22); hx.fill(); hx.fillStyle = "#f0d375"; hx.font = "800 24px Barlow, system-ui, sans-serif"; hx.fillText(t > 4.75 ? "✓ 7/7 Drizzle · review unlocked" : "6/7 Antidote Drizzle", 34, 222);
  if (coverImg.complete && coverImg.naturalWidth) { hx.save(); rr(W - 178, 194, 160, 90, 12); hx.clip(); hx.drawImage(coverImg, W - 178, 194, 160, 90); hx.restore(); hx.strokeStyle = "#d4af37"; hx.lineWidth = 3; rr(W - 178, 194, 160, 90, 12); hx.stroke(); }
  // altitude gauge (right edge): your height between the rooftops and the ceiling
  const ay0 = 330, ay1 = 760, ah = Math.max(0, Math.min(1, (plane.position.y - 60) / 160)); hx.fillStyle = "rgba(12,18,36,.7)"; rr(W - 46, ay0 - 10, 30, ay1 - ay0 + 20, 15); hx.fill();
  hx.fillStyle = "rgba(255,255,255,.18)"; hx.fillRect(W - 32, ay0, 2, ay1 - ay0); hx.fillStyle = "#f0d375"; const yy = ay1 - ah * (ay1 - ay0); rr(W - 42, yy - 7, 22, 14, 7); hx.fill();
  hx.fillStyle = "#c9d2ee"; hx.font = "800 15px Barlow, system-ui, sans-serif"; hx.textAlign = "center"; hx.fillText("ALT", W - 31, ay0 - 18);
  POPS.forEach(p => { const u = (t - p.t0) / 1.3; if (u < 0 || u > 1) return; const q = project(p.v); if (!q[2]) return; hx.globalAlpha = 1 - u * u; hx.textAlign = "center"; hx.font = "800 34px Barlow, system-ui, sans-serif"; hx.lineWidth = 6; hx.strokeStyle = "rgba(5,8,20,.85)"; hx.strokeText(p.txt, q[0], q[1] - 70 * u); hx.fillStyle = p.col; hx.fillText(p.txt, q[0], q[1] - 70 * u); hx.globalAlpha = 1; });
  hx.textAlign = "left"; hx.font = "800 26px Barlow, system-ui, sans-serif"; hx.fillStyle = "rgba(12,18,36,.78)"; rr(22, H - 112, 600, 84, 20); hx.fill();
  hx.fillStyle = "#f0d375"; hx.fillText(LABEL[0], 42, H - 72); hx.fillStyle = "#c9d2ee"; hx.font = "600 20px Barlow, system-ui, sans-serif"; hx.fillText(LABEL[1], 42, H - 44);
}

/* ---------- simulation ---------- */
let simT = 0, hp = 100, clipCD = 0, tokenGot = false, burgerGot = false; const ZERO = new THREE.Vector3(), tmp = new THREE.Vector3(), P = new THREE.Vector3();
function segAt(z) { return segs.find(s => Math.abs(z - s.group.position.z) <= s.len / 2); }
function step(t, dt) {
  const X = px(t), Y = py(t), Z = pz(t), bank = Math.max(-1, Math.min(1, dpx(t) / 120)), climb = Math.max(-1, Math.min(1, dpy(t) / 60));
  plane.position.set(X, Y, Z); plane.rotation.set(-climb * .32, Math.PI - bank * .1, bank * .55); AIR.spin(t); plane.updateMatrixWorld(true);
  world.wind.set(0, 0, 0); world.tick(dt, t * 1.6);
  // buildings: clip one and it breaks (and so do you, a little)
  clipCD -= dt; const sg = segAt(Z);
  if (sg && clipCD <= 0) { const h = sg.collide(X, Y - 4, Z, 30, 16); if (h) { const scrape = h.o.h - Y < 14; sg.smash(h, X, Y, Z, "plane"); clipCD = .8; hp -= scrape ? 12 : 30; pDmg.hit(AIR.pts.wound[(Math.random() * 4) | 0]); pDmg.level = 1 - hp / 100; POPS.push({ t0: t, txt: scrape ? "Rooftop scrape! -12%" : "Building hit! -30%", col: "#ff8a6a", v: plane.position.clone().add(new THREE.Vector3(0, 30, 0)) }); shakeT = t; } }
  pDmg.update(dt, t, PK, ZERO, AIR.pts.eng);
  const L = (q) => AIR.node.localToWorld(tmp.copy(q));
  fx.glow(L(AIR.pts.tipL), 8, [1, .15, .12], .95); fx.glow(L(AIR.pts.tipR), 8, [.15, 1, .35], .95);
  const sp = t % 1.2; if (sp < .06 || (sp > .16 && sp < .22)) { fx.glow(L(AIR.pts.tipL), 26, [1, 1, 1], 1); fx.glow(L(AIR.pts.tipR), 26, [1, 1, 1], 1); fx.glow(L(AIR.pts.tail), 18, [1, 1, 1], 1); }
  if ((t + .5) % 1 < .12) { fx.glow(L(AIR.pts.beaconTop), 12, [1, .1, .05], 1); fx.glow(L(AIR.pts.beaconBot), 12, [1, .1, .05], 1); }
  AIR.pts.eng.forEach(e => fx.glow(L(e), 7, [1, .55, .25], .5));
  // skimming the water: spray and a wake
  if (sg && sg.water(X) && Y < 92) { const k = (92 - Y) / 30; for (let i = 0; i < 3; i++) if (Math.random() < dt * 60 * k) fx.emit(P.set(X + (Math.random() - .5) * 50, 1.5, Z + 10 + Math.random() * 20), tmp.set((Math.random() - .5) * 30, 18 + Math.random() * 22, 30 + Math.random() * 30), .9, 3, 14, [.97, .97, .96], [.85, .88, .9], .75, false, 0, .8, -30); }
  // your beams: they chip a building in the way
  let li = 0, firing = false; FIRE.forEach(tf => [0, 1].forEach(side => { const Lz = lasers[li++], age = t - tf; if (age < 0 || age > 1.1 || Lz.userData.dead) { Lz.visible = false; return; } if (age < .05) firing = true;
    const z = pz(tf) - 30 - (V + 1300) * age, x = px(tf) + (side ? 1 : -1) * 16, y = py(tf) - 3; Lz.visible = true; Lz.position.set(x, y, z);
    const s2 = segAt(z); const h = s2 && s2.collide(x, y, z, 2, 20); if (h) { s2.smash(h, x, y, z, "shot"); Lz.userData.dead = true; Lz.visible = false; } }));
  if (firing) AIR.pts.muzzle.forEach(m => fx.glow(L(m), 22, [1, .3, .25], 1));
  // the helicopter: arrives high, fires three bursts (tracers) aimed where you are; you slide and climb out of the way
  const hpz = heliPos(t); heli.visible = t > HELI.t0 && t < 8.6; heli.position.copy(hpz); heli.rotation.set(.08, Math.PI, Math.sin(t * 1.1) * .1); rotor.visible = heli.visible; rotor.position.copy(hpz).y += 18; rotor.rotation.y = t * 30;
  if (heli.visible) { fx.glow(tmp.copy(hpz).add(new THREE.Vector3(-8, 14, -6)), 16, (t * 7 | 0) % 2 ? [1, .1, .15] : [.15, .4, 1], 1); }
  tracers.forEach(g => { const u = g.userData, age = t - u.tf; g.visible = age > 0 && age < 1.4; if (!g.visible) return; g.position.copy(u.from).addScaledVector(u.dir, 900 * age); g.lookAt(tmp.copy(g.position).add(u.dir)); if (age < .05) fx.glow(u.from, 30, [1, .8, .4], 1); });
  // pickups: a Melody burger and the 7th Drizzle token, at different heights
  burger.visible = t < 4.75; burger.position.set(px(4.75), py(4.75) + 2, pz(4.75)); burger.rotation.set(.35, t * 2.2, 0); fx.glow(burger.position, 70, [1, .8, .45], .45);
  token.visible = t < 4.25; token.position.set(px(4.25), py(4.25) + 4, pz(4.25)); token.rotation.y = t * 3; fx.glow(token.position, 80, [1, .82, .3], .55);
  if (t >= 4.25 && !tokenGot) { tokenGot = true; POPS.push({ t0: t, txt: "7/7 Drizzle! Review unlocked", col: "#f0d375", v: token.position.clone() }); }
  if (t >= 4.75 && !burgerGot) { burgerGot = true; POPS.push({ t0: t, txt: "+50 Classic Burger", col: "#f0d375", v: burger.position.clone() }); }
  if (t >= 5.6 && !POPS.some(p => p.dodge)) POPS.push({ t0: 5.9, dodge: 1, txt: "Dodged!", col: "#7ef7c8", v: plane.position.clone().add(new THREE.Vector3(0, 34, 0)) });
  // the world
  segs.forEach(s => s.update(t, dt, Math.abs(s.group.position.z - Z) < 1300));
  const sk = Math.max(0, .9 - (t - shakeT)) * 5;
  const lag = X * .82 + px(t - .35) * .18; cam.position.set(lag + Math.sin(t * 61) * sk, Y * .85 + 52 + Math.cos(t * 53) * sk, Z + 182); cam.up.set(Math.sin(bank * .07), 1, 0).normalize(); cam.lookAt(X * .9, Y * .7 - 20, Z - 380);
  sun.position.set(X - 260, Y + 240, Z + 360); sun.target.position.set(X, 0, Z - 200);
  fx.update(dt);
}
let shakeT = -9;
function frame(t) { while (simT < t - 1e-6) { const d = Math.min(1 / 60, t - simT); simT += d; step(simT, d); } if (simT === 0) step(0, 0); renderer.render(scene, cam); drawHud(t, hp); }
const out = document.createElement("canvas"); out.width = W; out.height = H; const ox = out.getContext("2d");
window.frameAt = (t) => { frame(t); ox.drawImage(cv, 0, 0); ox.drawImage(hud, 0, 0); return out.toDataURL("image/jpeg", .92); };
try { await Promise.all([document.fonts.load("400 64px Anton"), document.fonts.load("800 22px Barlow"), document.fonts.load("600 20px Barlow"), document.fonts.load("700 24px Barlow")]); } catch (e) {}
await new Promise(r => setTimeout(r, 700));
window.LOOK_READY = true;
if (!window.CAPTURE) { const t0 = performance.now(); const loop = () => { frame(Math.min(DUR, (performance.now() - t0) / 1000)); requestAnimationFrame(loop); }; loop(); }
