/* Melody flight game: LOOK A4 preview (2026-10-16): Venice Beach, realistic. A low pass along the water and the sand: clear water
   with the sun's glitter path, surfers riding and wiping out, waders jumping waves, the crowd on towels and under umbrellas
   waving and cheering as you pass low, volleyball, the lifeguard tower, kids' sand castle, and Nalu Vida's sign on the pier.
   Same modules as the game (../world3d.js → ../beach3d.js, ../air3d.js). window.frameAt(t) → JPEG. */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { makeWorld } from "../world3d.js";
import { buildAirliner, makeFX, makeDamage } from "../air3d.js";

const W = 720, H = 1280, DUR = 10.5, SPAN = 86, V = 170;
const cv = document.getElementById("gl");
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(56, W / H, 4, 6000);
const pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
{ const c = document.createElement("canvas"); c.width = 4; c.height = 512; const x = c.getContext("2d"), g = x.createLinearGradient(0, 0, 0, 512);
  [[0, "#141c44"], [.2, "#2b2c62"], [.32, "#6a3f72"], [.39, "#c4616e"], [.43, "#f29a5c"], [.455, "#ffd08a"], [.48, "#e9a26c"], [1, "#e9a26c"]].forEach(s => g.addColorStop(s[0], s[1])); x.fillStyle = g; x.fillRect(0, 0, 4, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; scene.background = t; }
scene.fog = new THREE.Fog(0xd89068, 1000, 3600);
scene.add(new THREE.HemisphereLight(0xffe2c4, 0x3a2c3a, 1.15));
const sun = new THREE.DirectionalLight(0xffc28a, 2.3); scene.add(sun, sun.target);

const fx = makeFX(THREE, scene, { max: 2600 });
const world = makeWorld(THREE, { base: "../", fx }); scene.add(world.root);
const ROUTE = [["coast", 520], ["coast", 520], ["venice", 560], ["pier", 540], ["coast", 500]];
const segs = []; { let z = 600; ROUTE.forEach((r, i) => { const s = world.segment(r[0], r[1], 51 + i * 7, r[2] || {}); s.group.position.z = z - r[1] / 2; z -= r[1]; scene.add(s.group); segs.push(s); }); }

const AIR = buildAirliner(THREE), plane = new THREE.Group(); plane.add(AIR.node); const PK = SPAN / AIR.size.x; AIR.node.scale.setScalar(PK); plane.rotation.order = "YXZ"; scene.add(plane);
const key = (K, t) => { let i = 0; while (i < K.length - 2 && t > K[i + 1][0]) i++; const [t0, a] = K[i], [t1, b] = K[i + 1], u = Math.max(0, Math.min(1, (t - t0) / (t1 - t0))), e = u * u * (3 - 2 * u); return a + (b - a) * e; };
const KX = [[0, -40], [2, -150], [4, -110], [5.6, -190], [7.2, -150], [8.6, -40], [10.5, -80]];
const KY = [[0, 120], [1.6, 82], [4, 72], [5.6, 96], [7.2, 92], [8.6, 74], [10.5, 100]];
const px = t => key(KX, t), py = t => key(KY, t), pz = t => 300 - V * t;
const dpx = t => (px(t + .03) - px(t - .03)) / .06, dpy = t => (py(t + .03) - py(t - .03)) / .06;

const hud = document.getElementById("hud"), hx = hud.getContext("2d"), PV = new THREE.Vector3();
const project = (v) => { PV.copy(v).project(cam); return [(PV.x + 1) / 2 * W, (1 - PV.y) / 2 * H, PV.z < 1]; };
function rr(x, y, w, h, r) { hx.beginPath(); hx.moveTo(x + r, y); hx.arcTo(x + w, y, x + w, y + h, r); hx.arcTo(x + w, y + h, x, y + h, r); hx.arcTo(x, y + h, x, y, r); hx.arcTo(x, y, x + w, y, r); hx.closePath(); }
const coverImg = new Image(); coverImg.src = "../img/review/cover.webp";
const POPS = [];
function drawHud(t) {
  hx.clearRect(0, 0, W, H);
  const g = hx.createLinearGradient(0, 0, 0, 176); g.addColorStop(0, "rgba(12,18,36,.95)"); g.addColorStop(1, "rgba(12,18,36,.84)"); hx.fillStyle = g; hx.fillRect(0, 0, W, 176);
  const score = 6480 + Math.floor(t * 40) + (t > 9 ? 250 : 0);
  hx.fillStyle = "#f0d375"; hx.font = "400 64px Anton, Impact, sans-serif"; hx.textAlign = "left"; hx.fillText(score.toLocaleString("en-US"), 26, 98);
  hx.fillStyle = "#9aa3b5"; hx.font = "800 22px Barlow, system-ui, sans-serif"; hx.fillText("H E A L T H", 250, 58); hx.textAlign = "right"; hx.fillText("100%", 590, 58);
  const hg = hx.createLinearGradient(250, 0, 590, 0); hg.addColorStop(0, "#43c27e"); hg.addColorStop(1, "#8ee05a"); hx.fillStyle = hg; rr(250, 72, 340, 26, 13); hx.fill(); hx.fillStyle = "rgba(12,18,36,.9)"; hx.fillRect(362, 72, 4, 26); hx.fillRect(476, 72, 4, 26);
  hx.fillStyle = "#fff"; hx.font = "800 40px Barlow, system-ui, sans-serif"; hx.fillText(Math.max(0, 30 - Math.floor(t)) + "s", 700, 96);
  hx.textAlign = "left"; hx.fillStyle = "#c9d2ee"; hx.font = "700 24px Barlow, system-ui, sans-serif"; hx.fillText("Level 6 of 10 · the coast", 26, 150);
  if (coverImg.complete && coverImg.naturalWidth) { hx.save(); rr(W - 178, 194, 160, 90, 12); hx.clip(); hx.drawImage(coverImg, W - 178, 194, 160, 90); hx.restore(); hx.strokeStyle = "#d4af37"; hx.lineWidth = 3; rr(W - 178, 194, 160, 90, 12); hx.stroke(); }
  const ay0 = 330, ay1 = 760, ah = Math.max(0, Math.min(1, (plane.position.y - 62) / 153)); hx.fillStyle = "rgba(12,18,36,.7)"; rr(W - 46, ay0 - 10, 30, ay1 - ay0 + 20, 15); hx.fill();
  hx.fillStyle = "#f0d375"; rr(W - 42, ay1 - ah * (ay1 - ay0) - 7, 22, 14, 7); hx.fill(); hx.fillStyle = "#c9d2ee"; hx.font = "800 15px Barlow, system-ui, sans-serif"; hx.textAlign = "center"; hx.fillText("ALT", W - 31, ay0 - 18);
  POPS.forEach(p => { const u = (t - p.t0) / 1.4; if (u < 0 || u > 1) return; const q = project(p.v); if (!q[2]) return; hx.globalAlpha = 1 - u * u; hx.textAlign = "center"; hx.font = "800 34px Barlow, system-ui, sans-serif"; hx.lineWidth = 6; hx.strokeStyle = "rgba(5,8,20,.85)"; hx.strokeText(p.txt, q[0], q[1] - 70 * u); hx.fillStyle = p.col; hx.fillText(p.txt, q[0], q[1] - 70 * u); hx.globalAlpha = 1; });
  hx.textAlign = "left"; hx.font = "800 26px Barlow, system-ui, sans-serif"; hx.fillStyle = "rgba(12,18,36,.78)"; rr(22, H - 112, 620, 84, 20); hx.fill();
  hx.fillStyle = "#f0d375"; hx.fillText("A4 · Venice Beach, realistic", 42, H - 72); hx.fillStyle = "#c9d2ee"; hx.font = "600 20px Barlow, system-ui, sans-serif"; hx.fillText("Clear water + sun glitter · surfers wipe out · the beach waves at you", 42, H - 44);
}

let simT = 0; const tmp = new THREE.Vector3(), P = new THREE.Vector3(), V3 = new THREE.Vector3(); let waved = 0, flyPop = false;
function segAt(z) { return segs.find(s => Math.abs(z - s.group.position.z) <= s.len / 2); }
function step(t, dt) {
  const X = px(t), Y = py(t), Z = pz(t), bank = Math.max(-1, Math.min(1, dpx(t) / 120)), climb = Math.max(-1, Math.min(1, dpy(t) / 60));
  plane.position.set(X, Y, Z); plane.rotation.set(-climb * .3, Math.PI - bank * .1, bank * .55); AIR.spin(t); plane.updateMatrixWorld(true);
  world.wind.set(0, 0, 0); world.tick(dt, t);
  const L = (q) => AIR.node.localToWorld(tmp.copy(q));
  fx.glow(L(AIR.pts.tipL), 8, [1, .15, .12], .95); fx.glow(L(AIR.pts.tipR), 8, [.15, 1, .35], .95);
  const sp = t % 1.2; if (sp < .06 || (sp > .16 && sp < .22)) { fx.glow(L(AIR.pts.tipL), 26, [1, 1, 1], 1); fx.glow(L(AIR.pts.tipR), 26, [1, 1, 1], 1); }
  AIR.pts.eng.forEach(e => fx.glow(L(e), 7, [1, .55, .25], .5));
  // the low pass: everyone near you waves (and the surfers look up)
  segs.forEach(s => { if (s.flyby && Math.abs(Z - s.group.position.z) < s.len / 2 + 160) waved += s.flyby(X, Y, Z) > 0 ? dt : 0; });
  const sg = segAt(Z);
  if (sg && sg.water(X) && Y < 95) { const k = (95 - Y) / 30; for (let i = 0; i < 3; i++) if (Math.random() < dt * 60 * k) fx.emit(P.set(X + (Math.random() - .5) * 50, 1.5, Z + 10 + Math.random() * 20), V3.set((Math.random() - .5) * 30, 18 + Math.random() * 22, 30 + Math.random() * 30), .9, 3, 14, [.97, .97, .96], [.85, .88, .9], .75, false, 0, .8, -30); }
  if (t > 9 && !flyPop) { flyPop = true; POPS.push({ t0: t, txt: "Beach flyby! +250", col: "#7ef7c8", v: plane.position.clone().add(new THREE.Vector3(0, 30, 0)) }); }
  segs.forEach(s => s.update(t, dt, Math.abs(s.group.position.z - Z) < 1500));
  const lag = X * .82 + px(t - .35) * .18; cam.position.set(lag, Y * .85 + 50, Z + 176); cam.up.set(Math.sin(bank * .07), 1, 0).normalize(); cam.lookAt(X * .9, Y * .6 - 24, Z - 380);
  sun.position.set(X - 260, Y + 240, Z + 360); sun.target.position.set(X, 0, Z - 200);
  fx.update(dt);
}
function frame(t) { while (simT < t - 1e-6) { const d = Math.min(1 / 60, t - simT); simT += d; step(simT, d); } if (simT === 0) step(0, 0); renderer.render(scene, cam); drawHud(t); }
const out = document.createElement("canvas"); out.width = W; out.height = H; const ox = out.getContext("2d");
window.frameAt = (t) => { frame(t); ox.drawImage(cv, 0, 0); ox.drawImage(hud, 0, 0); return out.toDataURL("image/jpeg", .92); };
try { await Promise.all([document.fonts.load("400 64px Anton"), document.fonts.load("800 22px Barlow"), document.fonts.load("600 20px Barlow"), document.fonts.load("700 24px Barlow")]); } catch (e) {}
await new Promise(r => setTimeout(r, 800));
window.LOOK_READY = true;
if (!window.CAPTURE) { const t0 = performance.now(); const loop = () => { frame(Math.min(DUR, (performance.now() - t0) / 1000)); requestAnimationFrame(loop); }; loop(); }
