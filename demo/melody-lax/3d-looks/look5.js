/* Melody flight game: LOOK A5 "AAA" bench (2026-10-16). The same world3d/beach3d/air3d modules as the game plus the shared
   engine (../../engine3d): real rigged crowds, physical sky, volumetric clouds, weather, traffic, damage, post-processing.
   A scripted low pass so screenshots are repeatable:
     ?route=beach|melody|city   ?t=seconds (freeze)   ?tod=0..24   ?weather=sunny|partly|overcast|fog|rain|storm   ?q=low|med|high|ultra
     ?alt=60 (flight height)   ?dmg=0..3 (hits on the plane)   ?cam=chase|low|street */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { makeWorld } from "../world3d.js";
import { buildAirliner, makeFX } from "../air3d.js";
import { createCrowd } from "../../engine3d/crowd.js";
import { makeGPUFX } from "../../engine3d/particles.js";
import { makeHitDamage } from "../../engine3d/damage.js";
import { upgradeAircraft } from "../../engine3d/aircraft.js";
import { makeSky } from "../../engine3d/sky.js";
import { makeClouds } from "../../engine3d/clouds.js";
import { makeWeather } from "../../engine3d/weather.js";
import { makePost } from "../../engine3d/postfx.js";
import { makeQuality } from "../../engine3d/quality.js";

const Qs = new URLSearchParams(location.search), W = 720, H = 1280, V = 150;
const ROUTE = Qs.get("route") || "beach", ALT = +(Qs.get("alt") || 70), TFIX = Qs.get("t");
const cv = document.getElementById("gl");
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
const QUAL = makeQuality({ id: "look5", renderer });
renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.shadowMap.enabled = QUAL.cfg.shadows > 0; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(56, W / H, 2, 6000);
const pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
{ const c = document.createElement("canvas"); c.width = 4; c.height = 512; const x = c.getContext("2d"), g = x.createLinearGradient(0, 0, 0, 512);
  [[0, "#141c44"], [.2, "#2b2c62"], [.32, "#6a3f72"], [.39, "#c4616e"], [.43, "#f29a5c"], [.455, "#ffd08a"], [.48, "#e9a26c"], [1, "#e9a26c"]].forEach(s => g.addColorStop(s[0], s[1])); x.fillStyle = g; x.fillRect(0, 0, 4, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; scene.background = t; }
scene.fog = new THREE.Fog(0xd89068, 1000, 3600);
const hemi = new THREE.HemisphereLight(0xffe2c4, 0x3a2c3a, 1.15); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffc28a, 2.3); scene.add(sun, sun.target);
const TODQ = Qs.get("tod") != null ? +Qs.get("tod") : 18.4;
const SKY = makeSky(THREE, { renderer, scene, sun, hemi, hours: TODQ, azimuth: -.42 });
const CLOUDS = makeClouds(THREE, { renderer, sky: SKY, quality: QUAL.cfg.clouds });
const WX = makeWeather(THREE, { scene, state: Qs.get("weather") || "partly", quality: { rain: QUAL.cfg.rain } }); WX.set(Qs.get("weather") || "partly", 0);
const POST = await makePost(THREE, { renderer, scene, camera: cam, clouds: CLOUDS, quality: QUAL.cfg.post, width: W, height: H, pixelRatio: 1 }); sun.castShadow = QUAL.cfg.shadows > 0; sun.shadow.mapSize.set(QUAL.cfg.shadowSize, QUAL.cfg.shadowSize);
Object.assign(sun.shadow.camera, { left: -420, right: 420, top: 420, bottom: -420, near: 10, far: 1600 }); sun.shadow.bias = -.0008; sun.shadow.normalBias = 1.2;

window.__DMG = () => DMG; window.__AIR = () => AIR; window.__THREE = THREE;
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
const fx = makeGPUFX(THREE, scene, { max: 4096 });
let CROWD = null; const RAIN = { v: 0 };
CROWD = await createCrowd(THREE, { base: "../../engine3d/assets/humans/", loader, scene, renderer, height: 8.6, quality: QUAL.cfg.crowd });
const world = makeWorld(THREE, { base: "../", fx, crowd: () => CROWD, rain: RAIN, density: () => QUAL.cfg.crowd.density }); scene.add(world.root);
const ROUTES = { beach: [["coast", 520], ["coast", 520], ["venice", 560], ["pier", 540], ["coast", 500]], melody: [["city", 460], ["melody", 520], ["city", 460], ["city", 460]], city: [["city", 460], ["towers", 460], ["city", 460], ["city", 460]] };
const segs = []; { let z = 600; ROUTES[ROUTE].forEach((r, i) => { const s = world.segment(r[0], r[1], 51 + i * 7, { side: 1 }); s.group.position.z = z - r[1] / 2; z -= r[1]; scene.add(s.group); segs.push(s); }); }
const AIR = buildAirliner(THREE), plane = new THREE.Group(); plane.add(AIR.node); AIR.node.scale.setScalar(86 / AIR.size.x); plane.rotation.order = "YXZ"; scene.add(plane);
const UPA = upgradeAircraft(THREE, AIR, { envIntensity: 1.25 }); AIR.node.traverse(n => { if (n.isMesh) n.castShadow = true; });
const DMG = makeHitDamage(THREE, { fx, target: AIR.node, engines: AIR.pts.eng, maxDecals: 40 }); const NDMG = +(Qs.get("dmg") || 0); let fired = 0;

const key = (K, t) => { let i = 0; while (i < K.length - 2 && t > K[i + 1][0]) i++; const [t0, a] = K[i], [t1, b] = K[i + 1], u = Math.max(0, Math.min(1, (t - t0) / (t1 - t0))), e = u * u * (3 - 2 * u); return a + (b - a) * e; };
const KX = ROUTE === "beach" ? [[0, -40], [2, -150], [4, -110], [5.6, -190], [7.2, -150], [8.6, -40], [10.5, -80]] : [[0, 0], [3, 60], [6, -20], [10.5, 30]];
const px = t => key(KX, t), py = t => ALT + 8 * Math.sin(t * .7), pz = t => 300 - V * t, dpx = t => (px(t + .03) - px(t - .03)) / .06;
const tmp = new THREE.Vector3();
function step(t, dt) {
  const X = px(t), Y = py(t), Z = pz(t), bank = Math.max(-1, Math.min(1, dpx(t) / 120));
  const att = UPA.attitude(dt, bank * .55, 0); plane.position.set(X, Y, Z); plane.rotation.set(att.pitch, Math.PI - att.bank * .17, att.bank); UPA.spin(t, 1); plane.updateMatrixWorld(true);
  // ?dmg=N: N bullets from the side/front (seeded), raycast against the airframe; damage level climbs with them
  while (fired < NDMG * 3 && t > .3 + fired * .25) { const a = fired * 2.399, src = new THREE.Vector3(X + Math.cos(a) * 140, Y + 40 + Math.sin(a * 1.7) * 30, Z - 160 + Math.sin(a) * 120);
    const ms = []; AIR.node.traverse(n => { if (n.isMesh && !n.userData.decal && n.geometry.attributes.position.count > 60) ms.push(n); }); const mm = ms[(fired * 7) % ms.length], pa = mm.geometry.attributes.position, vi = (fired * 977) % pa.count;
    const aim = new THREE.Vector3().fromBufferAttribute(pa, vi).applyMatrix4(mm.matrixWorld); (window.__HL = window.__HL || []).push(DMG.hit(src, aim.sub(src))); fired++; DMG.level = Math.min(1, fired / 9); }
  DMG.update(dt, t, plane.scale.x * AIR.node.scale.x, tmp.set(0, 0, 12));
  world.tick(dt, t);
  const L = (q) => AIR.node.localToWorld(tmp.copy(q)); fx.glow(L(AIR.pts.tipL), 8, [1, .15, .12], .95); fx.glow(L(AIR.pts.tipR), 8, [.15, 1, .35], .95);
  segs.forEach(s => { if (s.flyby && Math.abs(Z - s.group.position.z) < s.len / 2 + 160) s.flyby(X, Y, Z); });
  if (Qs.get("boom") && !step.boomed && t > +Qs.get("boom")) { step.boomed = 1; const bx = X + 120, bz = Z - 260; segs.forEach(s => s.scatter && s.scatter(bx, bz, 140)); fx.boom(tmp.set(bx, 4, bz), 2.2); }
  segs.forEach(s => s.update(t, dt, Math.abs(s.group.position.z - Z) < 1500));
  const mode = Qs.get("cam") || "chase";
  if (mode === "sky") { cam.position.set(X, Y + 20, Z + 100); cam.lookAt(X - 100, Y + 20 + 220, Z - 600); }
  else if (mode === "wound" && DMG.wounds().length) { const w = DMG.wounds()[0], P = w.g.getWorldPosition(new THREE.Vector3()), N = w.n.clone().transformDirection(AIR.node.matrixWorld); cam.position.copy(P).addScaledVector(N, 16).add(new THREE.Vector3(0, 4, 6)); cam.lookAt(P); }
  else if (mode === "plane") { const a = t * .4 + 2.2; cam.position.set(X + Math.sin(a) * (+(Qs.get("cd") || 70)), Y + 34, Z + Math.cos(a) * (+(Qs.get("cd") || 70))); cam.lookAt(X, Y, Z); }
  else if (mode === "street") { cam.position.set(X + 60, 14, Z - 120); cam.lookAt(X + 20, 8, Z - 260); }
  else if (mode === "low") { cam.position.set(X * .9, Y * .5 + 18, Z + 120); cam.lookAt(X * .9, 6, Z - 260); }
  else { cam.position.set(X * .82, Y * .85 + 50, Z + 176); cam.lookAt(X * .9, Y * .6 - 24, Z - 380); }
  sun.position.set(X - 260, 420, Z + 360); sun.target.position.set(X, 0, Z - 200);
  fx.update(dt); cam.updateMatrixWorld(); CROWD.update(cam, t, dt);
  WX.update(dt, t, cam); SKY.setTime(TODQ + (Qs.get("live") ? t / 6 : 0)); SKY.update(dt, WX.v, t); world.setDaylight(SKY.info.night, WX.v); world.setSkyLight(SKY.info, WX.v); RAIN.v = WX.v.rain;
}
const ENVW = new THREE.Vector3(), ENVA = new THREE.Color(), ENVB = new THREE.Color(), ENVM = new THREE.Color(), MOON = new THREE.Color(.5, .58, .85), WHITE = new THREE.Color(1, 1, 1);
const PUFFS = (Qs.get("puffs") || "").split(";").filter(Boolean).map(s => s.split(",").map(Number));
function env(t, dt) { const w = WX.v, I = SKY.info, vis = w.vis, fl = WX.flash; scene.fog.color.copy(I.horizon); scene.fog.near = 900 + 900 * vis; scene.fog.far = 4000 + 3000 * vis;
  renderer.toneMappingExposure = 1.05 * I.exposure * (1 + fl * 1.6); ENVW.set(-14 * w.wind, 0, -V + 22 * w.wind); const night = I.night > .5;
  ENVA.copy(I.zenith).multiplyScalar(1.1).lerp(WHITE, .15 * (1 - I.night)); ENVB.copy(I.horizon).multiplyScalar(.6); ENVM.copy(I.horizon).lerp(WHITE, .45 - .3 * I.night);
  const zz = pz(0), puffs = PUFFS.map(p => [p[0], p[1], zz + p[2], p[3]]);
  return { cover: w.cover, density: w.density, base: w.base, top: w.base + 560, dark: w.dark, wind: ENVW.set(0, 0, 0), puffs, sunCol: night ? MOON : I.sunCol, sunI: night ? .12 : .25 + I.sunI * .5,
    ambTop: ENVA, ambBot: ENVB, fogCol: I.horizon, fogFar: scene.fog.far * .8, flash: fl, wet: w.wet, skyRef: I.horizon, sunVis: 1 - I.night, mistCol: ENVM, fogStart: 80 + 1300 * vis * vis, fogDen: .0001 + .0035 * Math.pow(1 - vis, 1.5), bloom: .3 + .2 * I.night, bloomT: 1.5 + 1.8 * (1 - I.night) }; }
let simT = 0;
function frame(t) { while (simT < t - 1e-6) { const d = Math.min(1 / 30, t - simT); simT += d; step(simT, d); } if (simT === 0) step(0, 0); POST.render(1 / 60, simT, env(simT, 1 / 60)); }
let frames = 0, ft = performance.now(), fps = 0;
window.__E3 = { wx: WX, sky: SKY, clouds: CLOUDS, stats: () => Object.assign({ fps, tier: QUAL.tier, hours: SKY.hours, state: WX.state, mist: CLOUDS.mist }, CROWD.stats(), { calls: renderer.info.render.calls, tris: renderer.info.render.triangles }) };
const t0 = performance.now();
const loop = (now) => { const t = TFIX != null ? +TFIX : (now - t0) / 1000; frame(t); frames++; if (now - ft > 1000) { fps = Math.round(frames * 1000 / (now - ft)); frames = 0; ft = now; } requestAnimationFrame(loop); };
requestAnimationFrame(loop);
