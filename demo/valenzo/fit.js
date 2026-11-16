/* Valenzo Studio fitting room: one mannequin wearing any shirt with any jeans, to spin, zoom and inspect.
   Every garment was scanned on its own mannequin, so an outfit is two mannequins standing in the same spot:
   a cut in the fragment shader keeps the shirt (with sleeves and hands) of one and the jeans of the other.
   Loaded on demand by valenzo.js. Reads window.VZ.look / VZ.girth, publishes VZ.fit. */
import * as THREE from './lib/three.module.min.js';
import { GLTFLoader } from './lib/GLTFLoader.js';
import { OrbitControls } from './lib/OrbitControls.js';
import { RoomEnvironment } from './lib/RoomEnvironment.js';

const VZ = window.VZ, $ = (id) => document.getElementById(id);
const canvas = $('fit'), stage = $('stage');
const { degToRad: rad, radToDeg: deg, clamp, lerp } = THREE.MathUtils;
const say = (text) => { $('fit-note').textContent = text; };

/* Measured on the models, in metres. Each mannequin is 0.98 tall, centred on the origin, faces +X, arms along z. */
const FEET = -0.49;
const TOP = {   // shirt tail [hem at the front, at the back, at the side seams, middle of the air between hip and hand, half width at the hem]
  rh_white: [0.05, 0.045, 0.068, 0.113, 0.105], rh_black: [0.055, 0.04, 0.065, 0.118, 0.112], pr_navy: [0.035, 0.03, 0.065, 0.114, 0.108],
  pr_blue: [0.04, 0.035, 0.065, 0.109, 0.104], pr_cream: [0.05, 0.055, 0.075, 0.103, 0.102], pr_sage: [0.045, 0.045, 0.065, 0.109, 0.106]
};
const BOT = {   // [top of the waistband, middle of the air between hip and bare arm, half width at the hip]
  vdm07: [0.172, 0.118, 0.110], bc_blue: [0.182, 0.122, 0.114], bc_black: [0.187, 0.109, 0.102], bc_ice: [0.167, 0.118, 0.109]
};
/* az: degrees round from the front. pol: 90 = level with the target. y: height the camera looks at. */
const VIEWS = {
  front: { az: 0, pol: 86, dist: 3.574, y: -0.057 },      // feet land on the plinth of img/niche.webp
  back: { az: 180 },
  collar: { az: 0, pol: 80, dist: 0.7, y: 0.39 },
  buttons: { az: 0, dist: 0.95, y: 0.2 },
  pocket: { az: 180, pol: 88, dist: 0.72, y: 0.08, tuck: true }   // an untucked shirt hangs over the pockets
};
const HOME = new THREE.Vector3(0, VIEWS.front.y, 0);

function fail() {
  stage.classList.remove('dark', 'live'); stage.classList.add('failed');
  say('The 3D view could not load on this device.');
}

let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch (e) { fail(); throw e; }
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
const key = new THREE.DirectionalLight(0xfff0d8, 1.1);
key.position.set(2, 3, 1);
scene.add(key);

const rig = new THREE.Group(), body = new THREE.Group();   // rig origin = the feet, so sizes grow from the plinth up
rig.position.y = FEET;
rig.add(body);
scene.add(rig);

const blob = document.createElement('canvas');
blob.width = blob.height = 128;
const pen = blob.getContext('2d'), fade = pen.createRadialGradient(64, 64, 6, 64, 64, 64);
fade.addColorStop(0, 'rgba(0,0,0,.62)'); fade.addColorStop(1, 'rgba(0,0,0,0)');
pen.fillStyle = fade; pen.fillRect(0, 0, 128, 128);
const shadow = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(blob), transparent: true, depthWrite: false }));
shadow.rotation.x = -Math.PI / 2;
shadow.position.y = 0.002;
rig.add(shadow);

const cam = new THREE.PerspectiveCamera(24, 4 / 5, 0.05, 20);
const ctl = new OrbitControls(cam, canvas);
ctl.enableDamping = true;
ctl.minDistance = 0.36; ctl.maxDistance = VIEWS.front.dist;
ctl.minPolarAngle = rad(56); ctl.maxPolarAngle = rad(90);   // never from below: the cut-off mannequins are hollow
ctl.maxTargetRadius = 0.5;                                   // panning stays on the mannequin
ctl.autoRotateSpeed = 4.3;                                   // about 26 degrees a second
ctl.enableZoom = false;                                      // the wheel scrolls the page until the visitor grabs the mannequin
canvas.style.touchAction = 'pan-y';
canvas.addEventListener('pointerdown', () => { ctl.enableZoom = true; });
canvas.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') ctl.enableZoom = false; });

/* ---- models ---- */
const loader = new GLTFLoader(), have = new Map();   // id -> Promise<Mesh>; only what is being worn stays in memory
function get(id) {
  if (!have.has(id)) have.set(id, loader.loadAsync('models/' + id + '.glb').then((gltf) => {
    let mesh;
    gltf.scene.traverse((o) => { if (o.isMesh) mesh = o; });
    mesh.removeFromParent();
    const bottom = id in BOT, cut = new THREE.Vector3(), hem = new THREE.Vector3();
    mesh.userData = { s: mesh.scale.x, cut, hem };            // positions are quantized: metres = raw position * s
    mesh.position.y -= FEET;
    mesh.material.onBeforeCompile = (sh) => {
      sh.uniforms.uCut = { value: cut };                 // raw units. x: arm gap, y: lowest point of the hands, z: half width at the shirt hem
      sh.uniforms.uHem = { value: hem };                 // the curved shirt tail that separates the two. x: front, y: back, z: side seams
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vRaw;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvRaw = position;');
      if (bottom) sh.vertexShader = sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n' +   // jeans sit 5 cm deeper in the depth buffer, so a seat or hip never pokes through the shirt
        'vec4 vzBack = projectionMatrix * vec4(mvPosition.xyz * (1.0 + 0.05 / length(mvPosition.xyz)), 1.0);\ngl_Position.z = vzBack.z / vzBack.w * gl_Position.w;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vRaw;\nuniform vec3 uCut;\nuniform vec3 uHem;').replace('#include <clipping_planes_fragment>',
        'float vzSide = min(abs(vRaw.z) / uCut.z, 1.0);\n' +
        'float vzHem = mix(mix(uHem.y, uHem.x, smoothstep(-0.04, 0.04, vRaw.x)), uHem.z, vzSide * vzSide);\n' + (bottom
          ? 'if (vRaw.y > vzHem || (abs(vRaw.z) > uCut.x && vRaw.y > uCut.y)) discard;'             // jeans: drop the tee and the bare arms, never the flare of the leg
          : 'if (vRaw.y < vzHem && !(abs(vRaw.z) > uCut.x && vRaw.y > uCut.y)) discard;'));         // shirt: drop the trousers, keep the hands
    };
    mesh.material.customProgramCacheKey = () => (bottom ? 'vz-bottom' : 'vz-top');
    return mesh;
  }).catch((e) => { have.delete(id); throw e; }));
  return have.get(id);
}
function drop(id) {
  have.get(id).then((m) => {
    m.geometry.dispose();
    for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap']) if (m.material[k]) m.material[k].dispose();
    m.material.dispose();
  }, () => {});
  have.delete(id);
}

let worn = null, tucked = false, turn = 0;
function fitCut() {
  if (!worn) return;
  const [t, b] = body.children, s = t.userData.s;
  if (worn.solo) {                                       // one scan exactly as it was made (used for the collection photos)
    t.userData.cut.set(99, -99, 1);
    t.userData.hem.setScalar(worn.solo in BOT ? 99 : -99);
    t.scale.setScalar(s);
    return;
  }
  const T = TOP[worn.top], B = BOT[worn.bottom], q = b.userData.s;
  const k = clamp((T[4] - 0.002) / B[2], 0.93, 1.06);    // the jeans slip just inside this shirt's hem
  const hem = tucked ? [B[0], B[0], B[0]] : T, up = tucked ? 0 : 0.02;   // untucked, the jeans carry on a little way up under the shirt
  t.userData.cut.set(T[3] / s, -0.1 / s, T[4] / s);
  t.userData.hem.set(hem[0] / s, hem[1] / s, hem[2] / s);
  b.userData.cut.set(B[1] / q, -0.015 / q, T[4] / (q * k));   // the bare fingertips end just above here
  b.userData.hem.set((hem[0] + up) / q, (hem[1] + up) / q, (hem[2] + up) / q);
  b.scale.set(q * k, q, q * k);
}
async function show(reset) {
  const my = ++turn, look = VZ.look, ids = look.solo ? [look.solo] : [look.top, look.bottom];
  stage.classList.remove('failed'); stage.classList.add('dark');        // lights down while the mannequin changes
  say('Dressing the mannequin…');
  let meshes;
  try { meshes = await Promise.all(ids.map(get)); } catch (e) { if (my === turn) fail(); return; }
  if (my !== turn) return;                               // a newer pick is already on its way
  body.clear(); body.add(...meshes);
  for (const id of [...have.keys()]) if (!ids.includes(id)) drop(id);
  worn = look; fitCut();
  if (reset || !stage.classList.contains('live')) { view('front', 0); spin(!VZ.calm); }
  stage.classList.remove('dark'); stage.classList.add('live');          // lights up
  say('Drag to turn · scroll or pinch to zoom');
}

/* ---- camera ---- */
const sph = new THREE.Spherical(), v3 = new THREE.Vector3();
let anim = null;
function go(v, ms) {
  sph.setFromVector3(v3.subVectors(cam.position, ctl.target));
  const want = rad(90 + v.az), th = sph.theta + Math.atan2(Math.sin(want - sph.theta), Math.cos(want - sph.theta));   // shortest way round
  anim = { t0: performance.now(), ms: VZ.calm ? 0 : ms, a: [sph.theta, sph.phi, sph.radius, ctl.target.clone()], b: [th, rad(v.pol), v.dist, new THREE.Vector3(v.x || 0, v.y, v.z || 0)] };
}
function press(id, on) { $(id).setAttribute('aria-pressed', on ? 'true' : 'false'); }
function spin(on) { ctl.autoRotate = on; press('v-spin', on); }
function view(v, ms = 900) {                             // a name from VIEWS, or the same fields directly
  v = VIEWS[v] || v;
  spin(false);
  if (!!v.tuck !== tucked) { tucked = !!v.tuck; fitCut(); }
  if ('shadow' in v) shadow.visible = v.shadow;
  go({ ...VIEWS.front, ...v }, ms);
}
function zoom(f) {
  sph.setFromVector3(v3.subVectors(cam.position, ctl.target));
  go({ az: deg(sph.theta) - 90, pol: deg(sph.phi), dist: clamp(sph.radius * f, ctl.minDistance, ctl.maxDistance), x: ctl.target.x, y: ctl.target.y, z: ctl.target.z }, 350);
}
ctl.addEventListener('start', () => { spin(false); anim = null; });
document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => view(b.dataset.view)));
$('v-spin').addEventListener('click', () => spin(!ctl.autoRotate));
$('z-in').addEventListener('click', () => zoom(0.66));
$('z-out').addEventListener('click', () => zoom(1 / 0.66));

/* ---- draw, only while the fitting room is on screen ---- */
const size = new THREE.Vector3(1, 1, 1);
let raf = 0, last = 0;
function frame(now) {
  raf = requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  if (anim) {
    const p = anim.ms ? Math.min((now - anim.t0) / anim.ms, 1) : 1, e = p * p * (3 - 2 * p), a = anim.a, b = anim.b;
    ctl.target.lerpVectors(a[3], b[3], e);
    cam.position.setFromSphericalCoords(lerp(a[2], b[2], e), lerp(a[1], b[1], e), lerp(a[0], b[0], e)).add(ctl.target);
    if (p === 1) anim = null;
  }
  const dist = cam.position.distanceTo(ctl.target), far = dist > VIEWS.front.dist * 0.9;
  stage.classList.toggle('close', dist < 2.2);           // moved in: the alcove falls out of focus behind the cloth
  if (tucked && !anim && (dist > 1.3 || cam.position.x > ctl.target.x)) { tucked = false; fitCut(); }   // away from the pockets the shirt hangs loose again
  if (far && !anim) ctl.target.lerp(HOME, 0.1);          // zoomed all the way out, the mannequin settles back on its plinth
  canvas.style.touchAction = far ? 'pan-y' : 'none';     // a phone can scroll past the full view, and pan once it is close
  ctl.update(dt);
  const g = VZ.girth || 1;                               // chosen size: wider, and a touch taller
  rig.scale.lerp(size.set(g, 1 + (g - 1) * 0.25, g), VZ.calm ? 1 : 0.12);
  renderer.render(scene, cam);
}
new ResizeObserver(() => {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  cam.aspect = w / h; cam.updateProjectionMatrix();
}).observe(canvas);
new IntersectionObserver((es) => {
  cancelAnimationFrame(raf);
  if (es[es.length - 1].isIntersecting) { last = performance.now(); raf = requestAnimationFrame(frame); }
}).observe(stage);

VZ.fit = { show, view, TOP, BOT, fitCut };
show(true);
