/* Melody Approach: optional real-3D renderer (three.js r160 + GLB models).
   VISUAL ONLY. The game in index.html keeps running exactly as before (logic, scoring, hitboxes, timing, HUD).
   When this layer is on, the game's 2D canvas becomes a transparent HUD/text overlay and this module draws the world
   (aerial LA ground, runway, generic scenery, every aircraft, pickups, shots, smoke/fire/debris/explosions) in WebGL under it,
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
/* CHASE VIEW (2026-10-16, Antidote: "like you're looking at the back of the plane as it's flying"): a camera behind and a
   little above a real 3D Melody airliner that banks and pitches as you steer. The game underneath is the same 400x600
   field: its "up the screen" is now "ahead of you", so enemies, pickups and bosses come at you out of the distance.
   ?view=top = the previous straight-down 3D camera · ?render=2d = the original 2D game (also the automatic fallback). */
const VIEWQ = (Q.get("view") || window.MELODY_VIEW || "").toLowerCase();
const CHASE = VIEWQ !== "top";
const STATUS = window.__M3STATUS = { mode: MODE, view: CHASE ? "chase" : "top", on: false, reason: "", fps: 0, loaded: 0 };

function hasWebGL() { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (e) { return false; } }

if (M && MODE !== "off") {
  if (!hasWebGL()) STATUS.reason = "no WebGL";
  else boot().catch(e => { try { LOADBAR && LOADBAR.done(); } catch (x) {} STATUS.reason = "boot failed: " + (e && e.message || e); console.warn("[melody3d] staying 2D:", e); try { M.on(false); } catch (x) {} });
}

/* PREVIEW STATUS BADGE (2026-10-16): mode 3D/2D · tier · fps · the exact boot error / fallback reason / systems that switched
   themselves off. On during the preview phase; ?debug=0 hides it, ?debug=1 forces it. Tap it to copy the text. */
const SHOW_BADGE = Q.get("debug") !== "0";
const BADGE = (() => { if (!SHOW_BADGE || !M) return null; const cv0 = document.getElementById("cv"); if (!cv0) return null; const el = document.createElement("div");
  el.style.cssText = "position:absolute;left:6px;top:34px;z-index:6;max-width:62%;padding:3px 7px;border-radius:7px;background:rgba(5,8,20,.72);color:#cfe3ff;font:600 9px/1.3 ui-monospace,Menlo,monospace;pointer-events:auto;white-space:pre-wrap;word-break:break-word;opacity:.85";
  el.addEventListener("click", () => { try { navigator.clipboard.writeText(el.textContent); } catch (e) {} });
  cv0.parentNode.appendChild(el);
  const ua = navigator.userAgent, dev = /iPhone|iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? "iOS" : /Android/.test(ua) ? "Android" : /Tesla|QtCarBrowser/.test(ua) ? "Tesla" : "desktop";
  const tick = () => { const S2 = STATUS, on = S2.on; el.textContent = (on ? "3D" : "2D") + " · " + (S2.tier || "-") + " · " + (S2.fps || 0) + "fps · " + dev + (S2.reason ? " · " + S2.reason : "") + (S2.off && S2.off.length ? " · off: " + S2.off.join("; ") : "") + (S2.caps ? " · " + S2.caps : "");
    el.style.color = on ? "#cfe3ff" : "#ffb4a8"; };
  tick(); setInterval(tick, 700); return el; })();
STATUS.off = [];
// a slim loading bar on the game while the 3D assets stream in (models, crowd, cars); gone once everything is in
const LOADBAR = (() => { const cv0 = document.getElementById("cv"); if (!cv0 || !M || MODE === "off" || !hasWebGL()) return null; const host = cv0.parentNode, el = document.createElement("div");
  el.setAttribute("role", "progressbar"); el.setAttribute("aria-label", "Loading 3D"); el.style.cssText = "position:absolute;left:12%;right:12%;top:6px;height:16px;z-index:5;pointer-events:none;font:700 10px Barlow,system-ui,sans-serif;color:#f0d375;text-align:center;letter-spacing:.06em;opacity:.92;transition:opacity .6s";
  el.innerHTML = '<div style="height:3px;border-radius:2px;background:rgba(255,255,255,.14);overflow:hidden"><div style="height:100%;width:0%;background:linear-gradient(90deg,#d4af37,#f0d375);transition:width .25s"></div></div><span>LOADING 3D 0%</span>';
  host.appendChild(el); const bar = el.firstChild.firstChild, lab = el.lastChild; let done = false;
  return { set(f, txt) { if (done) return; const p = Math.round(Math.max(0, Math.min(1, f)) * 100); bar.style.width = p + "%"; lab.textContent = (txt || "LOADING 3D") + " " + p + "%"; el.setAttribute("aria-valuenow", p); },
    done() { if (done) return; done = true; bar.style.width = "100%"; el.style.opacity = "0"; setTimeout(() => el.remove(), 700); } }; })();
async function boot() {
  const THREE = await import("three");
  // progress: every GLTF/texture fetch goes through three's default loading manager
  { let seen = 0, finished = 0; THREE.DefaultLoadingManager.onStart = (u, l, t) => { seen = Math.max(seen, t); }; THREE.DefaultLoadingManager.onProgress = (u, l, t) => { seen = Math.max(seen, t); finished = l; if (LOADBAR) LOADBAR.set(finished / Math.max(seen, 24) * .9); }; }
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  const { MeshoptDecoder } = await import("three/addons/libs/meshopt_decoder.module.js");
  // chase view: the detailed airliner + damage FX, the 3D city, and soft reflections on the airframes
  const AIRM = CHASE ? await import("./air3d.js?v=e3n") : null, WORLDM = CHASE ? await import("./world3d.js?v=e3n") : null;
  const { RoomEnvironment } = CHASE ? await import("three/addons/environments/RoomEnvironment.js") : {};
  let PROPT = null;
  const QM = await import("../engine3d/quality.js?v=e3n");
  // every optional system loads and starts on its own: one that fails (import, shader, GPU feature) switches only itself off (STATUS.off)
  const FAILQ = (Q.get("fail") || "").split(",");   // test hook: ?fail=clouds,post,crowd,… makes those systems fail on purpose
  const offNote = (n, e) => { const m = n + ": " + String(e && e.message || e).slice(0, 80); if (!STATUS.off.includes(m)) STATUS.off.push(m); console.warn("[melody3d] " + m); };
  const safe = (n, fn) => { try { if (FAILQ.includes(n)) throw new Error("forced by ?fail"); return fn(); } catch (e) { offNote(n, e); return null; } };
  const safeA = async (n, fn) => { try { if (FAILQ.includes(n)) throw new Error("forced by ?fail"); return await fn(); } catch (e) { offNote(n, e); return null; } };
  const impE = (n) => import("../engine3d/" + n + ".js?v=e3n").catch(e => { offNote(n, e); return null; });
  const [PARTM, DMGM, ACM, SKYM, CLDM, WXM, POSTM, WATM, AUDM, CBM, APXM] = CHASE ? await Promise.all(["particles", "damage", "aircraft", "sky", "clouds", "weather", "postfx", "water", "audio", "combat", "apex"].map(impE)) : [];
  const W = M.W, H = M.H, S = M.S, FX = M.FX, FXI = FX._i(), TAU = Math.PI * 2;
  const D = 1000;                                   // camera height above the ground plane
  const ws = Y => CHASE ? 1 : (D - Y) / D;          // world units per screen px at altitude Y (chase view: 1:1, no top-down parallax)
  // chase view: depth for things that FLY. Ahead of your plane the 2D field is stretched 2.4× along the flight, so pickups, enemies and
  // their fire close in on you ~2.4× faster than the ground streams by (at eye level they'd otherwise seem to hang in front of you or
  // drift away), and spawns start far out near the horizon. Your plane's row (y = H-130) maps to itself, so every 2D hit lines up.
  const YP = H - 130, KF = 2.4, KB = 1.5;
  const far = y => CHASE ? (y < YP ? YP + (y - YP) * KF : YP + (y - YP) * KB) : y;
  const wx = (x, Y) => (x - W / 2) * ws(Y), zm = (y, Y) => { if (!CHASE) return y; const f = Math.max(0, Math.min(1, (Y - 16) / 50)); return y + (far(y) - y) * f; }, wz = (y, Y) => (zm(y, Y) - H / 2) * ws(Y);   // things on the ground (Y < 16) move with the ground; it blends to the stretched air depth by Y 66 (no jump at lift-off)
  const A = { trf: 128, player: 150, ufo: 176, jet: 192, cop: 200, kami: 182, gun: 214, sj: 200, rp: 236, blimp: 250, item: 104, shot: 150, eshot: 164, air: 138, esc: 188, bigjet: 208, rocket: 222, base: 14, bird: 172 };
  // chase view: everything that flies sits close to your own flight level (150), so your shots visibly meet what they hit
  if (CHASE) Object.assign(A, { trf: 132, ufo: 156, jet: 158, cop: 160, kami: 154, gun: 162, sj: 158, rp: 172, blimp: 186, item: 146, shot: 150, eshot: 151, air: 150, esc: 156, bigjet: 160, rocket: 160, bird: 154 });

  /* ---------------- renderer, camera, lights ---------------- */
  const cv = document.getElementById("cv"), wrap = cv.parentNode;
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  // phones / tablets / Tesla: step the tiers down at < 40 fps, and fall back to 2D only if LOW stays under ~20 fps for 8 s
  const MOBILE = /iPhone|iPad|Android|Mobile|Tesla|QtCarBrowser/i.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  const QUAL = window.__E3Q = QM.makeQuality({ id: "melody-lax", renderer, target: MOBILE ? 40 : 50, minFps: MOBILE ? 20 : 40, failSecs: MOBILE ? 8 : 5,
    calm: () => { const G = M.G(); return !G.running || (G.ens.length <= 3 && !G.ens.some(e => e && e.boss)); } });   // tier changes wait for a quiet moment
  let WARMQ = 0; const OLDCAM = Q.get("cam") === "old", NALUCAM = Q.get("nalucam") === "1", CAM_PITCH_DEG = 22, CAM_HEIGHT = 175, CAM_PLANE_DEG = 38, CAM_MIN_Y = 150;   // above-the-plane chase camera: tune here
  const SIDECAM = Q.get("side") === "1", BBCAM = Q.get("bbcam") === "1", CARCAM = Q.get("carcam") === "1", SMOOTH = QUAL.smooth, tierName = () => (QUAL.smooth ? "smooth" : QUAL.tier) + (QUAL.lock30 ? " 30" : "");
  // GPU features: render targets fall back to 8-bit when half/float colour buffers aren't renderable (some iOS / older GPUs)
  const glc0 = renderer.getContext(), isGL2 = renderer.capabilities.isWebGL2, NOF = Q.get("nofloat") === "1";
  const CAPS = { gl2: isGL2, half: !NOF && isGL2 && !!(glc0.getExtension("EXT_color_buffer_float") || glc0.getExtension("EXT_color_buffer_half_float")), floatLin: !NOF && !!glc0.getExtension("OES_texture_float_linear") };
  STATUS.caps = (CAPS.gl2 ? "gl2" : "gl1") + (CAPS.half ? "" : " no-halfRT") + (CAPS.floatLin ? "" : " no-floatLin");
  renderer.setPixelRatio(Math.min(QUAL.cfg.pr, window.devicePixelRatio || 1)); STATUS.tier = tierName();
  // a tier change only recompiles materials when the shadow switch actually flips (that rebuild is the visible hitch)
  QUAL.onChange((t, cfg) => { STATUS.tier = tierName(); renderer.setPixelRatio(Math.min(cfg.pr, window.devicePixelRatio || 1)); renderer.setSize(W, H, false); const sh = cfg.shadows > 0; if (renderer.shadowMap.enabled !== sh) { renderer.shadowMap.enabled = sh; scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => m.needsUpdate = true); }); } });
  renderer.setSize(W, H, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = QUAL.cfg.shadows > 0; renderer.shadowMap.type = MOBILE ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x0c1220, 1);
  const gl = renderer.domElement;
  gl.className = "m3d"; gl.setAttribute("aria-hidden", "true");
  gl.style.cssText = "position:absolute;left:0;top:0;width:100%;height:auto;aspect-ratio:400/600;border-radius:12px;z-index:-1;pointer-events:none;display:block";
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x3a4466, 760, 4200);   // dusk haze: the ground sits a touch deeper in it than the aircraft
  const cam = new THREE.PerspectiveCamera(2 * Math.atan(H / 2 / D) * 180 / Math.PI, W / H, 20, 2400);
  cam.position.set(0, D, 0); cam.up.set(0, 0, -1); cam.lookAt(0, 0, 0);
  if (CHASE) {   // dusk sky over LA + haze that swallows the far ground, so the field ahead fades into the night instead of ending
    cam.fov = 64; cam.near = 4; cam.far = 3200; cam.up.set(0, 1, 0); cam.updateProjectionMatrix();
    const sc = document.createElement("canvas"); sc.width = 4; sc.height = 256; const sx = sc.getContext("2d"), sg = sx.createLinearGradient(0, 0, 0, 256);
    [[0, "#141c44"], [.2, "#2b2c62"], [.32, "#6a3f72"], [.39, "#c4616e"], [.43, "#f29a5c"], [.455, "#ffd08a"], [.48, "#e9a26c"], [1, "#e9a26c"]].forEach(c => sg.addColorStop(c[0], c[1]));
    sx.fillStyle = sg; sx.fillRect(0, 0, 4, 256);
    const st = new THREE.CanvasTexture(sc); st.colorSpace = THREE.SRGBColorSpace; scene.background = st;   // (replaced by the physical sky below; kept as the first-frame fallback)
    scene.fog = new THREE.Fog(0xd89068, 900, 3100); cam.fov = 61;   // a touch wider for portrait phones cam.updateProjectionMatrix();
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  }
  const hemi = new THREE.HemisphereLight(0xc4d0ff, 0x3a2c22, 1.25);   // r160 lights are physical (÷π): these sum to ~1.05× on the flat ground so the aerial photo keeps its 2D brightness scene.add(hemi);
  if (CHASE) scene.add(hemi);   // chase view: the sky's ambient (driven by engine3d/sky.js)
  const sun = new THREE.DirectionalLight(0xffe0bc, 1.75);   // low warm LA sun from the upper left: shadows fall down-right like the 2D drop shadows
  sun.position.set(-170, 1000, -230); sun.target.position.set(0, 0, 0); scene.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -330, right: 330, top: 430, bottom: -430, near: 300, far: 1500 });
  sun.shadow.bias = -0.0015; sun.shadow.radius = 4; sun.shadow.camera.updateProjectionMatrix();
  const rim = new THREE.DirectionalLight(0x8fa6ff, 0.8); rim.position.set(220, 500, 300); scene.add(rim);   // cool sky fill on the far sides
  const FIRE_L = [0, 1, 2].map(() => { const l = new THREE.PointLight(0xff7a2a, 0, 340, 0); l.position.set(0, 40, 0); scene.add(l); return l; });
  /* ---- chase view: physical sky + time of day, volumetric clouds, weather, post-processing (demo/engine3d) ---- */
  const LS = (k, d) => { try { return localStorage.getItem(k) || d; } catch (e) { return d; } };
  const TOD = { sunrise: 6.35, day: 12.4, sunset: 18.55, night: 22.5 }, SKYPREF = () => (Q.get("tod") ? "fixed" : LS("melody-sky", "live")), WXPREF = () => Q.get("weather") || LS("melody-weather", "live");
  let SKY = null, CLOUDS = null, WX = null, POST = null, MIRROR = null, AMB = null, FLYN = 0, todH = Q.get("tod") ? +Q.get("tod") : TOD[SKYPREF()] || 18.35;
  if (CHASE) {
    const RT = CAPS.half ? THREE.HalfFloatType : THREE.UnsignedByteType;
    SKY = SKYM && safe("sky", () => SKYM.makeSky(THREE, { renderer, scene, sun, hemi, hours: todH, azimuth: -.42, envEvery: SMOOTH ? 90000 : QUAL.tier === "low" ? 30000 : 1500 }));   // re-baking the sky reflections is a hitch on phones: rarely on low
    CLOUDS = SKY && CLDM && CAPS.gl2 && CAPS.half && QUAL.cfg.clouds && QUAL.tier !== "low" ? safe("clouds", () => CLDM.makeClouds(THREE, { renderer, sky: SKY, quality: QUAL.cfg.clouds, rtType: RT })) : null;
    const wp = WXPREF(); WX = WXM && safe("weather", () => WXM.makeWeather(THREE, { scene, state: wp === "live" ? "partly" : wp, auto: wp === "live", quality: { rain: QUAL.cfg.rain }, airflow: () => (M.G().gsp || 0) * 60 }));
    POST = CLOUDS && POSTM ? await safeA("post", () => POSTM.makePost(THREE, { renderer, scene, camera: cam, clouds: CLOUDS, quality: Object.assign({}, QUAL.cfg.post, CAPS.half ? {} : { ssao: false, bloom: false }), width: W, height: H, pixelRatio: renderer.getPixelRatio(), rtType: RT })) : null;
    if (POST) { const ok = safe("post-first-frame", () => { POST.render(.016, 0, { puffs: [] }); return true; }); if (!ok) { POST = null; scene.background = scene.background || null; } }
    rim.intensity = .35;
    MIRROR = WATM && CAPS.gl2 && !SMOOTH ? safe("reflections", () => WATM.makeMirror(THREE, renderer, { y: 0, scale: .5, rtType: RT })) : null;
    AMB = AUDM && safe("audio", () => AUDM.makeAmbience({ out: () => M.audioOut && M.audioOut() })); if (WX && AMB) WX.onThunder((d, k) => { try { AMB.thunder(d, k); } catch (e) {} });
    QUAL.onChange((t, cfg) => { safe("tier-change", () => { if (CLOUDS && cfg.clouds) CLOUDS.setQuality(cfg.clouds); if (WX) WX.setQuality({ rain: cfg.rain }); if (POST) { POST.setQuality(Object.assign({}, cfg.post, CAPS.half ? {} : { ssao: false, bloom: false })); POST.setSize(W, H, renderer.getPixelRatio()); } sun.shadow.mapSize.set(cfg.shadowSize, cfg.shadowSize); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }); });
    // the game menu's Settings → Sky / Weather (gamemenu.js selects) talk to these
    window.MELODY_ENV = { sky(v) { try { localStorage.setItem("melody-sky", v); } catch (e) {} if (TOD[v]) todH = TOD[v]; }, weather(v) { try { localStorage.setItem("melody-weather", v); } catch (e) {} if (!WX) return; if (v === "live") WX.auto(true); else { WX.auto(false); WX.set(v, 8); } },
      get: () => ({ sky: SKYPREF(), weather: WXPREF(), hours: todH, state: WX ? WX.state : "-" }) };
  }

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
  UV.beam.ax = 1; if (UV.spark) UV.spark.ax = 1;   // long sprites that turn on their own axis in the chase view (Batch.ax)
  lateSprites();

  /* ---------------- sprite batches (instanced quads lying flat, facing the camera) ---------------- */
  // uBill (chase view, air batches only): quads stand up and face the camera (smoke, fire, glows), or with iAx turn about
  // their own long axis so shots and tracers read as bolts flying away from you instead of flat stickers on the ground
  const VS = `uniform float uBill; attribute vec3 iPos; attribute vec3 iSz; attribute vec4 iUV; attribute vec4 iCol; attribute float iAx; varying vec2 vUv; varying vec4 vCol;
    void main(){ vec2 c=vec2(position.x*iSz.x, position.z*iSz.y); float s=sin(iSz.z), co=cos(iSz.z); vec3 p;
      if(uBill<0.5) p=iPos+vec3(c.x*co-c.y*s, 0.0, c.x*s+c.y*co);
      else if(iAx>0.5){ vec3 L=vec3(-s,0.0,co); vec3 wd=normalize(cross(L, normalize(cameraPosition-iPos))); p=iPos+wd*c.x+L*c.y; }
      else { vec3 R=vec3(viewMatrix[0][0],viewMatrix[1][0],viewMatrix[2][0]), U=vec3(viewMatrix[0][1],viewMatrix[1][1],viewMatrix[2][1]); p=iPos+R*(c.x*co-c.y*s)-U*(c.x*s+c.y*co); }
      vUv=vec2(mix(iUV.x,iUV.z,uv.x), mix(iUV.y,iUV.w,uv.y)); vCol=iCol;
      gl_Position=projectionMatrix*viewMatrix*vec4(p,1.0); }`;
  const FS = `uniform sampler2D map; varying vec2 vUv; varying vec4 vCol; void main(){ vec4 t=texture2D(map,vUv); gl_FragColor=vec4(t.rgb*vCol.rgb, t.a*vCol.a); if(gl_FragColor.a<.003) discard; }`;
  class Batch {
    constructor(max, blending, order, tex) {
      const base = new THREE.PlaneGeometry(1, 1); base.rotateX(-Math.PI / 2);
      const g = new THREE.InstancedBufferGeometry(); g.index = base.index; g.setAttribute("position", base.getAttribute("position")); g.setAttribute("uv", base.getAttribute("uv"));
      this.max = max; this.p = new Float32Array(max * 3); this.s = new Float32Array(max * 3); this.u = new Float32Array(max * 4); this.c = new Float32Array(max * 4); this.x = new Float32Array(max); this.ax = 0;
      this.ap = new THREE.InstancedBufferAttribute(this.p, 3); this.as = new THREE.InstancedBufferAttribute(this.s, 3); this.au = new THREE.InstancedBufferAttribute(this.u, 4); this.ac = new THREE.InstancedBufferAttribute(this.c, 4); this.aa = new THREE.InstancedBufferAttribute(this.x, 1);
      [this.ap, this.as, this.au, this.ac, this.aa].forEach(a => a.setUsage(THREE.DynamicDrawUsage));
      g.setAttribute("iPos", this.ap); g.setAttribute("iSz", this.as); g.setAttribute("iUV", this.au); g.setAttribute("iCol", this.ac); g.setAttribute("iAx", this.aa);
      const mat = new THREE.ShaderMaterial({ uniforms: { map: { value: tex || atlasTex }, uBill: { value: 0 } }, vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, blending });
      this.mesh = new THREE.Mesh(g, mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = order; this.g = g; this.n = 0; scene.add(this.mesh);
    }
    begin() { this.n = 0; }
    // world position + world size + canvas-style rotation (clockwise on screen), atlas slot, colour (0-1) + alpha
    w(X, Y, Z, sw, sh, rot, uv, r, g, b, a) { if (this.n >= this.max || a <= .004 || !uv) return; const i = this.n++, p = this.p, s = this.s, u = this.u, c = this.c;
      p[i * 3] = X; p[i * 3 + 1] = Y; p[i * 3 + 2] = Z; this.x[i] = this.ax && uv.ax ? 1 : 0; s[i * 3] = sw; s[i * 3 + 1] = sh; s[i * 3 + 2] = rot;
      u[i * 4] = uv[0]; u[i * 4 + 1] = uv[1]; u[i * 4 + 2] = uv[2]; u[i * 4 + 3] = uv[3]; c[i * 4] = r; c[i * 4 + 1] = g; c[i * 4 + 2] = b; c[i * 4 + 3] = a; }
    // screen position/size (2D game px) at altitude Y
    q(x, y, Y, sw, sh, rot, uv, r, g, b, a) { const k = ws(Y); this.w(wx(x, Y), Y, wz(y, Y), sw * k, sh * k, rot, uv, r, g, b, a); }
    end() { this.g.instanceCount = this.n; [this.ap, this.as, this.au, this.ac, this.aa].forEach(a => { a.needsUpdate = true; }); }
  }
  const Bg = new Batch(700, THREE.NormalBlending, 70);     // ground decals: scorch, skid marks
  const BgA = new Batch(700, THREE.AdditiveBlending, 71);  // ground light: fire glow, Nalu LEDs, collapse flash
  const Bn = new Batch(1400, THREE.NormalBlending, 120);   // smoke, dust, dark bits, on-airframe flames
  const Ba = new Batch(2600, THREE.AdditiveBlending, 130); // fire, embers, fireballs, glows, tracers, lasers, lights
  const Bc = new Batch(400, THREE.NormalBlending, 40);     // street traffic: car bodies (over the aerial tiles, under the runway + landmarks)
  const BcA = new Batch(1600, THREE.AdditiveBlending, 41); // headlight beams, head + tail lights
  const BATCHES = [Bg, BgA, Bn, Ba, Bc, BcA];
  /* ---- tracer streams (chase view): the rounds fly straight away from the camera, so a world-space streak is seen end-on and
     vanishes. Each round is drawn as a SCREEN-SPACE line from its head back toward the gun it came from: the vertex shader projects
     both ends and builds the quad in pixels (min width in device px), additive, depth-tested, no fog. Hot white-yellow core + orange
     halo (the halo is drawn by the shader itself, so it glows without bloom on Smooth). */
  const TRC = (() => { const max = 600, g = new THREE.InstancedBufferGeometry(), base = new THREE.PlaneGeometry(1, 1); g.index = base.index; g.setAttribute("position", base.getAttribute("position")); g.setAttribute("uv", base.getAttribute("uv"));
    const A = new Float32Array(max * 3), B = new Float32Array(max * 3), C = new Float32Array(max * 4), Wd = new Float32Array(max * 2);
    const aA = new THREE.InstancedBufferAttribute(A, 3), aB = new THREE.InstancedBufferAttribute(B, 3), aC = new THREE.InstancedBufferAttribute(C, 4), aW = new THREE.InstancedBufferAttribute(Wd, 2);
    [aA, aB, aC, aW].forEach(a => a.setUsage(THREE.DynamicDrawUsage)); g.setAttribute("iA", aA); g.setAttribute("iB", aB); g.setAttribute("iC", aC); g.setAttribute("iW", aW);
    const U = { uRes: { value: new THREE.Vector2(400, 600) } };
    const mat = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, fog: false,
      vertexShader: `uniform vec2 uRes; attribute vec3 iA; attribute vec3 iB; attribute vec4 iC; attribute vec2 iW; varying vec2 vUv; varying vec4 vC; varying float vW;
        void main(){ vec4 ca = projectionMatrix * viewMatrix * vec4(iA, 1.0), cb = projectionMatrix * viewMatrix * vec4(iB, 1.0);
          if (cb.w < 1.0) cb = mix(ca, cb, (ca.w - 1.0) / max(1e-3, ca.w - cb.w));
          vec2 sa = ca.xy / ca.w * uRes * .5, sb = cb.xy / cb.w * uRes * .5; vec2 d = sb - sa; float L = length(d); vec2 dir = L > .5 ? d / L : vec2(0.0, -1.0); vec2 nrm = vec2(-dir.y, dir.x);
          float w = iW.x + iW.y; float t = uv.x; vec2 sp = mix(sa - dir * w * .5, sb + dir * w * .5, t) + nrm * (uv.y - .5) * w * 2.0;
          vec4 c = t < .5 ? ca : cb; gl_Position = vec4(sp / (uRes * .5) * c.w, c.z, c.w); vUv = uv; vC = iC; vW = iW.x / max(1.0, w); }`,
      fragmentShader: `varying vec2 vUv; varying vec4 vC; varying float vW;
        void main(){ float r = abs(vUv.y - .5) * 4.0; float core = smoothstep(vW * 1.15, vW * .35, r), halo = exp(-r * r * 2.2) * .55;
          float tail = mix(1.0, .25, vUv.x); vec3 col = mix(vC.rgb, vec3(1.0, .97, .85) * 2.2, core) * (core + halo) * tail;
          gl_FragColor = vec4(col * vC.a, 1.0); }` });
    const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.renderOrder = 132; scene.add(mesh); let n = 0;
    return { mesh, U, begin() { n = 0; }, add(a, b, r, gg, bb, al, core, halo) { if (n >= max) return; A.set([a.x, a.y, a.z], n * 3); B.set([b.x, b.y, b.z], n * 3); C.set([r, gg, bb, al], n * 4); Wd[n * 2] = core; Wd[n * 2 + 1] = halo; n++; },
      end() { g.instanceCount = n; [aA, aB, aC, aW].forEach(a => { a.needsUpdate = true; }); } }; })();
  const TRA = new THREE.Vector3(), TRB = new THREE.Vector3(), MZL = [new THREE.Vector3(), new THREE.Vector3()], BEAMT = { t: -1e9, a: [0, 0], far: [new THREE.Vector3(), new THREE.Vector3()] };
  if (CHASE) [Bn, Ba].forEach(b => { b.mesh.material.uniforms.uBill.value = 1; });
  const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
  const rgbaCache = {}; function rgb(s) { if (rgbaCache[s]) return rgbaCache[s]; let v; if (s[0] === "#") v = hex(s); else { const m = s.match(/[\d.]+/g).map(Number); v = [m[0] / 255, m[1] / 255, m[2] / 255]; } return rgbaCache[s] = v; }

  /* ---------------- models ---------------- */
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  const BASE = new URL("3d/", location.href).href, MODELS = {};
  const FILES = { plane: "plane.glb", jet: "jet.glb", ufo: "ufo.glb", cop0: "heli_blue.glb", cop1: "heli_black.glb",
    p_wings: "p_wings.glb?v=st3", p_marg: "p_marg.glb?v=ag1", p_shots: "p_shots.glb?v=ag1", p_mic: "p_mic.glb", p_mac: "p_mac.glb", p_burger: "p_burger.glb?v=ag1",
    p_lobmac: "p_lobmac.glb?v=fv2", p_ribs: "p_ribs.glb?v=st3", p_tacos: "p_tacos.glb?v=st3", p_nachos: "p_nachos.glb?v=fv2", p_strips: "p_strips.glb?v=st3",
    p_espresso: "p_espresso.glb?v=fv2", p_mimosa: "p_mimosa.glb?v=fv2" };
  async function loadModel(k) {
    try {
      const g = await loader.loadAsync(BASE + FILES[k]); const root = g.scene;
      root.traverse(o => { if (o.isMesh) { if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals(); const m = o.material; m.metalness = 0; m.roughness = .58; o.castShadow = true; o.receiveShadow = false; } });
      const box = new THREE.Box3().setFromObject(root), c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3());
      root.position.sub(c); const inner = new THREE.Group(); inner.add(root);
      if (k === "p_shots") addShotGlasses(inner, sz);
      MODELS[k] = { node: inner, size: sz }; STATUS.loaded++;
    } catch (e) { console.warn("[melody3d] model failed", k, e); }
  }
  // PICK tilt3 = optional per-pickup camera tilt override
  // round of shots: the generated GLB is the wooden tray; six glass shot glasses with real golden tequila in them sit on it (3 x 2), lime wedges between
  function addShotGlasses(g, sz) {
    const r = sz.x * .1, h = r * 2.3, top = sz.y / 2 - sz.y * .25;
    const glass = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: .32, roughness: .04, metalness: .2, side: THREE.DoubleSide, depthWrite: false });
    const base = new THREE.MeshStandardMaterial({ color: 0xe8f4ff, transparent: true, opacity: .55, roughness: .05, metalness: .2 });
    const liquid = new THREE.MeshStandardMaterial({ color: 0xffb627, roughness: .12, metalness: .05, emissive: 0xa86400, emissiveIntensity: .7 }); liquid.userData.keep = 1;
    const surf = new THREE.MeshStandardMaterial({ color: 0xffe08a, roughness: .05, metalness: .1, emissive: 0xffc94a, emissiveIntensity: .55 }); surf.userData.keep = 1;
    const lime = new THREE.MeshStandardMaterial({ color: 0x86d23a, roughness: .45, emissive: 0x2c5a00, emissiveIntensity: .5 }); lime.userData.keep = 1;
    const gG = new THREE.CylinderGeometry(r, r * .84, h, 20, 1, true), bG = new THREE.CylinderGeometry(r * .84, r * .84, h * .18, 20), lG = new THREE.CylinderGeometry(r * .9, r * .74, h * .62, 20), sG = new THREE.CircleGeometry(r * .9, 20); sG.rotateX(-Math.PI / 2);
    const hG = new THREE.CircleGeometry(r * .22, 12); hG.rotateX(-Math.PI / 2); const shine = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .8 }); shine.userData.keep = 1;
    const wG = new THREE.CylinderGeometry(r * .55, r * .55, r * .5, 12, 1, false, 0, Math.PI); wG.rotateZ(Math.PI / 2);
    for (let i = 0; i < 6; i++) { const cx = (i % 3 - 1) * sz.x * .29, cz = ((i / 3 | 0) - .5) * sz.z * .44;
      const add = (geo, mat, y) => { const m = new THREE.Mesh(geo, mat); m.position.set(cx, top + y, cz); m.castShadow = mat !== glass; g.add(m); return m; };
      add(bG, base, h * .09); add(lG, liquid, h * .18 + h * .31); add(sG, surf, h * .18 + h * .62); add(gG, glass, h / 2); const hl = add(hG, shine, h * .18 + h * .62 + .002 * h); hl.position.x -= r * .38; hl.position.z -= r * .34; hl.castShadow = false; }
    [[-.145, 0, .4], [.145, 0, 2.1], [-.43, 0, 3.3], [.43, 0, 1.2]].forEach(L => { const m = new THREE.Mesh(wG, lime); m.position.set(L[0] * sz.x, top + r * .28, L[1] * sz.z); m.rotation.y = L[2]; m.castShadow = true; g.add(m); }); }
  await Promise.all(Object.keys(FILES).map(loadModel));
  if (!MODELS.plane) throw new Error("player model missing");
  // other traffic: a small unbranded high-wing prop plane, built from primitives (nose = +Z, like the GLB aircraft). No logos, no livery.
  (() => { const g = new THREE.Group(), body = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: .5 }), trim = new THREE.MeshStandardMaterial({ color: 0x1f8a8a, roughness: .5 }),
      glass = new THREE.MeshStandardMaterial({ color: 0x22344f, roughness: .2, metalness: .3 }), dark = new THREE.MeshStandardMaterial({ color: 0x2a2d35, roughness: .6, transparent: true, opacity: .45 });
    const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
    const fus = new THREE.CylinderGeometry(2.3, 0.9, 24, 14); fus.rotateX(Math.PI / 2); add(fus, body, 0, 0, 0);
    const nose = new THREE.SphereGeometry(2.3, 14, 10); nose.scale(1, 1, 1.25); add(nose, body, 0, 0, 12);
    add(new THREE.BoxGeometry(36, .7, 5.2), body, 0, 2.3, 4);                          // high wing
    add(new THREE.BoxGeometry(3.4, .8, 5.3), trim, 16.4, 2.3, 4); add(new THREE.BoxGeometry(3.4, .8, 5.3), trim, -16.4, 2.3, 4);
    add(new THREE.BoxGeometry(13, .5, 3.4), body, 0, .5, -10.6);                       // tailplane
    add(new THREE.BoxGeometry(.6, 4.6, 4.2), trim, 0, 2.6, -10.2);                     // fin
    add(new THREE.BoxGeometry(3.8, 1.5, 3.2), glass, 0, 1.6, 8);                       // windshield
    const prop = CHASE ? ACM.propDisc(THREE, 4.6, 2) : add(new THREE.BoxGeometry(9, .25, .4), dark, 0, 0, 14.8); if (CHASE) { prop.position.set(0, 0, 14.9); g.add(prop); PROPT = prop.material.map; PROPT.center.set(.5, .5); } prop.castShadow = false;   // spinning prop: a motion-blur disc
    const box = new THREE.Box3().setFromObject(g), c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3());
    g.position.sub(c); const inner = new THREE.Group(); inner.add(g); MODELS.trf = { node: inner, size: sz };
  })();

  /* ---- new bosses (2026-10-12): simple procedural meshes. Nose / head = +Z (screen down), like the GLB aircraft. ---- */
  const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: .5 }, o || {}));
  const meshIn = (g, geo, mat, x, y, z, cast) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast !== false; g.add(m); return m; };
  const along = (geo) => { geo.rotateX(Math.PI / 2); return geo; };   // cylinders/cones: Y axis → Z axis (tip toward +Z)
  function normGroup(g) { const box = new THREE.Box3().setFromObject(g), c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3()); g.position.sub(c); const o = new THREE.Group(); o.add(g); return { node: o, size: sz }; }
  // the rocket ship: polished body, red nose + bands, red fins, engine bell, two missile pods
  function buildRocket() { const g = new THREE.Group(), metal = std(0xe9edf3, { metalness: .45, roughness: .28 }), red = std(0xc8262f, { roughness: .45 }), dark = std(0x30343d, { roughness: .6 }), pod = std(0xb7bcc6, { metalness: .4, roughness: .35 });
    meshIn(g, along(new THREE.CylinderGeometry(13, 13, 104, 28)), metal, 0, 0, 0);
    meshIn(g, along(new THREE.ConeGeometry(13, 34, 28)), metal, 0, 0, 69);
    meshIn(g, along(new THREE.ConeGeometry(5.6, 15, 20)), red, 0, 0, 79.5);
    meshIn(g, along(new THREE.CylinderGeometry(13.4, 13.4, 7, 28)), red, 0, 0, -30);
    meshIn(g, along(new THREE.CylinderGeometry(13.4, 13.4, 4, 28)), dark, 0, 0, 40);
    meshIn(g, along(new THREE.CylinderGeometry(9, 12.5, 12, 20)), dark, 0, 0, -58);
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b]) => { const f = meshIn(g, new THREE.BoxGeometry(a ? 22 : 1.6, b ? 22 : 1.6, 26), red, a * 23, b * 23, -40); f.rotation.z = 0; });
    [-1, 1].forEach(sx => { meshIn(g, along(new THREE.CylinderGeometry(5.5, 5.5, 34, 16)), pod, sx * 40, 0, 4); meshIn(g, along(new THREE.ConeGeometry(5.5, 8, 16)), red, sx * 40, 0, 25); meshIn(g, new THREE.BoxGeometry(22, 2, 8), dark, sx * 25, 0, 4); });
    const win = meshIn(g, new THREE.SphereGeometry(4.5, 14, 10), std(0x1d3554, { metalness: .6, roughness: .15, emissive: 0x2a6acc, emissiveIntensity: .35 }), 0, 11.5, 10); win.scale.set(1, .5, 1);
    return normGroup(g); }
  // the army base: the 2D base art on a concrete slab + real hangars, launcher turrets (rotating), radar and fuel tank
  function buildBase() { const BW = M.BASE_W, BH = M.BASE_H, g = new THREE.Group(), olive = std(0x7d8761, { roughness: .7 }), dark = std(0x3f4630, { roughness: .7 }), steel = std(0x9aa0a8, { metalness: .4, roughness: .4 });
    const t = canTex(M.baseIm(), true); t.anisotropy = 4;
    const slab = meshIn(g, new THREE.BoxGeometry(BW, 4, BH), [dark, dark, new THREE.MeshStandardMaterial({ map: t, roughness: .85 }), dark, dark, dark], 0, 0, 0, false); slab.receiveShadow = true;
    [[-90, -40], [90, -40]].forEach(([x, z]) => { const h = meshIn(g, new THREE.CylinderGeometry(23, 23, 74, 22).rotateZ(Math.PI / 2), olive, x, 2, z); h.scale.set(1, .62, 1); h.receiveShadow = true; });
    const L = [], tubeG = along(new THREE.CylinderGeometry(2.6, 2.6, 18, 10)), tubeM = std(0x262a20, { roughness: .8 });
    (M.BASE_L || []).forEach(p => { const tg = new THREE.Group(); tg.position.set(p[0] - BW / 2, 6, p[1] - BH / 2); g.add(tg);
      meshIn(tg, new THREE.CylinderGeometry(11, 12, 5, 18), dark, 0, -2, 0);
      const head = new THREE.Group(); tg.add(head); meshIn(head, new THREE.BoxGeometry(22, 9, 20), olive, 0, 3, 0);
      for (let i = 0; i < 4; i++) { const tb = meshIn(head, tubeG, tubeM, (i % 2 ? 5 : -5), 6 + (i < 2 ? 3.5 : -1.5), 6); tb.rotation.x = -.45; }
      L.push(head); });
    const radar = new THREE.Group(); radar.position.set(28 - BW / 2, 2, 112 - BH / 2); g.add(radar);
    meshIn(radar, new THREE.CylinderGeometry(2, 3, 16, 10), steel, 0, 8, 0); const dish = meshIn(radar, new THREE.BoxGeometry(24, 7, 2.5), std(0xd6dacb, { roughness: .45 }), 0, 17, 0); dish.rotation.x = -.3;
    meshIn(g, new THREE.CylinderGeometry(12, 12, 14, 20), std(0xdfe3e8, { metalness: .3, roughness: .35 }), 266 - BW / 2, 8, 116 - BH / 2);
    const n = normGroup(g); n.node.userData = { L, radar }; return n; }
  // a white bird (dove or a plumper pigeon): body, head, pink beak, tail fan, two wings on shoulder pivots that flap
  const BIRD_M = std(0xffffff, { roughness: .6, emissive: 0xc9d3ea, emissiveIntensity: .55, side: THREE.DoubleSide }), BIRD_TIP = std(0xd9dee6, { roughness: .6, emissive: 0x7a8396, emissiveIntensity: .35 }), BEAK_M = std(0xf2a8a0, { roughness: .5 });
  const EYE_M = new THREE.MeshBasicMaterial({ color: 0x1a1d24 });
  function buildBird(pg) { const g = new THREE.Group(), bodyG = new THREE.SphereGeometry(1, 14, 10);
    const body = meshIn(g, bodyG, BIRD_M, 0, 0, 0); body.scale.set(pg ? 6.6 : 5.2, pg ? 5.2 : 4.4, pg ? 12 : 12.5);
    meshIn(g, new THREE.SphereGeometry(pg ? 4.8 : 4.1, 12, 10), BIRD_M, 0, 1.6, pg ? 11 : 12);
    meshIn(g, along(new THREE.ConeGeometry(1.3, 4, 8)), BEAK_M, 0, 1.2, pg ? 17 : 17.5);
    [-1, 1].forEach(sx => meshIn(g, new THREE.SphereGeometry(.8, 6, 5), EYE_M, sx * 2.4, 3, pg ? 13.5 : 14.3, false));
    // tail fan + wings as flat feathered shapes (lying in the XZ plane), not boxes
    const flat = (pts) => { const sh = new THREE.Shape(); sh.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) sh.lineTo(pts[i][0], pts[i][1]); const geo = new THREE.ShapeGeometry(sh); geo.rotateX(Math.PI / 2); return geo; };
    const tw = pg ? 7.5 : 5.5; meshIn(g, flat([[-2.5, -5], [-tw, -19], [-tw * .5, -21], [0, -21.5], [tw * .5, -21], [tw, -19], [2.5, -5]]), BIRD_M, 0, .8, 0);
    const span = pg ? 19 : 22, ch = pg ? 11 : 8.5;
    const wings = [-1, 1].map(sx => { const pv = new THREE.Group(); pv.position.set(sx * 3, 1.5, 1); g.add(pv);
      const pts = [[0, 3], [span * .5, 3.5], [span, 1], [span - 1, -ch * .35], [span * .78, -ch * .6], [span * .55, -ch * .5], [span * .32, -ch * .78], [span * .1, -ch * .62], [0, -ch * .7]].map(([x, z]) => [sx * x, z]);
      meshIn(pv, flat(pts), BIRD_M, 0, 0, 0); return pv; });
    const n = normGroup(g); n.wings = wings; return n; }
  const BIRDS = [[], []], BOSSM = {}; let birdN = [0, 0];
  function birdGet(pg) { let o = BIRDS[pg][birdN[pg]++]; if (!o) { const b = buildBird(pg); o = b.node; o.userData = { size: b.size, wings: b.wings }; o.rotation.order = "YXZ"; o.traverse(n => { if (n.isMesh) n.castShadow = true; }); scene.add(o); BIRDS[pg].push(o); } o.visible = true; return o; }
  function bossMesh(k) { if (!BOSSM[k]) { const b = k === "rocket" ? buildRocket() : buildBase(); const o = b.node; o.userData = Object.assign(o.userData || {}, { size: b.size, mats: [] }); o.traverse(n => { if (n.isMesh) { n.material = Array.isArray(n.material) ? n.material.map(m => m.clone()) : n.material.clone(); (Array.isArray(n.material) ? n.material : [n.material]).forEach(m => o.userData.mats.push(m)); } }); o.rotation.order = "YXZ"; scene.add(o); BOSSM[k] = o; } const o = BOSSM[k]; o.visible = true; o.userData.used = 1; return o; }
  // chase view: the player flies air3d's detailed airliner (one instance, never pooled, so its wounds stay put)
  let AIR = null, UPA = null, PLY = null, FXA = null, pDmg = null, ENEMY = null, WORLD = null, CROWD = null, TRAFFIC = null, COMBAT = null; const SEEN = new WeakSet(); const RAIN = { v: 0 }, FLYT = { s: 0 };
  const alt3 = (o, d) => CHASE && o && o.z3 != null ? o.z3 : d;   // chase view: things fly at their own height (the game's z3)
  if (CHASE) {
    AIR = AIRM.buildAirliner(THREE); UPA = (ACM && safe("aircraft-pbr", () => ACM.upgradeAircraft(THREE, AIR, { envIntensity: 1.25 }))) || { attitude: (dt, b, p) => ({ bank: b, pitch: p }), spin: (t) => AIR.spin(t) }; PLY = new THREE.Group(); PLY.add(AIR.node); PLY.rotation.order = "YXZ"; PLY.userData = { size: AIR.size, mats: [] };
    AIR.node.traverse(n => { if (n.isMesh) { n.castShadow = true; if (n.material.emissive && !PLY.userData.mats.includes(n.material) && n.material !== AIR.mats.gold) PLY.userData.mats.push(n.material); } });
    scene.add(PLY); PLY.visible = false;
    // GPU particles (engine3d/particles.js, same API as air3d's makeFX) + raycast bullet damage with decals (engine3d/damage.js)
    FXA = (PARTM && CAPS.gl2 && safe("gpu-particles", () => PARTM.makeGPUFX(THREE, scene, { max: SMOOTH ? 1024 : MOBILE ? 2048 : 4096 }))) || AIRM.makeFX(THREE, scene, { max: 1800 });
    pDmg = (DMGM && safe("bullet-damage", () => DMGM.makeHitDamage(THREE, { fx: FXA, target: AIR.node, engines: AIR.pts.eng, maxDecals: QUAL.cfg.decals }))) || (() => { const d = AIRM.makeDamage(THREE, FXA, AIR.node, AIR.pts.wound); const h = d.hit; d.hit = () => { h(); return true; }; d.hitNear = (l) => h(l); const u = d.update; d.update = (s2, t2, k2, w2) => u(s2, t2, k2, w2, AIR.pts.eng); return d; })();
    WORLD = WORLDM.makeWorld(THREE, { camZ: () => cam.position.z, fireCap: () => SMOOTH ? 4 : ({ low: 6, med: 10, high: 16, ultra: 24 })[QUAL.tier] || 10, clock: () => FLYT.s, bbFirst: Q.get("bb") === "now" ? -500 : Q.get("bb") === "soon" ? -44 : null, bbGap: Q.get("bbgap") ? +Q.get("bbgap") : Q.get("bb") === "now" ? 4 : undefined, pbr: !SMOOTH && QUAL.tier !== "low", facadeSize: SMOOTH ? 512 : 1024, lite: SMOOTH, noVideo: FAILQ.includes("video"), fx: FXA, fxScale: () => ({ low: .3, med: .6, high: .85, ultra: 1 })[QUAL.tier] || 1, crowd: () => CROWD, traffic: () => TRAFFIC, rain: RAIN, density: () => QUAL.cfg.crowd.density }); scene.add(WORLD.root);   // the 3D city / beach under you (world3d.js)
    // muzzle flashes + real crashes + jet pilot ejections (engine3d/combat.js); detail follows the quality tier
    COMBAT = CBM && safe("combat", () => CBM.makeCombat(THREE, { scene, fx: FXA, crowd: () => CROWD, lights: QUAL.tier === "low" ? 0 : QUAL.tier === "med" ? 1 : 2,
      quality: () => ({ lights: QUAL.tier === "low" ? 0 : 2, shells: QUAL.tier !== "low", debris: QUAL.tier === "low" ? .4 : QUAL.tier === "med" ? .7 : 1 }),
      debris: (p, n, col, sp) => WORLD.debris(p, n, col, sp),
      // wrecks steer into a nearby building most of the time and smash it (world3d wreck smash); Melody / Nalu Vida / billboards aren't buildings here, so they're never hit
      aim: (p, kind) => { if (Math.random() > .75) return null; let best = null; for (const sg of SEGS.values()) { if (Math.abs(p.z - sg.group.position.z) > sg.len / 2 + 300) continue; for (const B of sg.blds || []) { const n = B.nearest(p.x, p.z - 120, 260); if (n && (!best || Math.hypot(n.x - p.x, n.z - p.z) < Math.hypot(best.x - p.x, best.z - p.z))) best = n; } } return best ? { x: best.x, y: best.y, z: best.z } : null; },
      hitTest: (p, k) => { for (const sg of SEGS.values()) { if (Math.abs(p.z - sg.group.position.z) > sg.len / 2 + 40) continue; const h = sg.collide(p.x, p.y, p.z, 5 * k, 5 * k); if (h) { const r = sg.smash(h, p.x, p.y, p.z, "wreck"); if (sg.scatter) sg.scatter(p.x, p.z, 200); return r; } } return null; },
      shake: (k) => { const G = M.G(); G.shake = Math.max(G.shake || 0, 14 + 14 * k); },
      onImpact: (p, k) => { for (const sg of SEGS.values()) if (Math.abs(p.z - sg.group.position.z) < sg.len / 2 + 200 && sg.scatter) sg.scatter(p.x, p.z, 120 + 60 * k); } }));
    // engine3d crowd: the Nalu Vida cast as real rigged, animated people (VAT-instanced far, SkinnedMesh near). Loads after the game is up.
    if (renderer.capabilities.isWebGL2 && !FAILQ.includes("crowd")) import("../engine3d/crowd.js?v=e3n").then(m => m.createCrowd(THREE, { base: new URL("../engine3d/assets/humans/", location.href).href, loader, scene, renderer, height: 8.6, quality: QUAL.cfg.crowd }))
      .then(c => { CROWD = c; STATUS.crowd = "on"; WARMQ = 1; if (TRAFFIC && LOADBAR) LOADBAR.done(); QUAL.onChange((t, cfg) => c.setQuality(cfg.crowd)); }).catch(e => { offNote("crowd", e); STATUS.crowd = "off: " + (e && e.message || e); console.warn("[melody3d] crowd", e); });
    // engine3d traffic: Kenney CC0 cars on the street grid with signals, turns, brake lights, crossing pedestrians
    (FAILQ.includes("traffic") ? Promise.reject(new Error("forced by ?fail")) : import("../engine3d/traffic.js?v=e3n").then(m => m.makeTraffic(THREE, { procedural: true, loader, base: new URL("../engine3d/assets/cars/", location.href).href, parent: scene, fx: FXA, quality: { density: QUAL.cfg.traffic } })))
      .then(tr => { TRAFFIC = tr; STATUS.traffic = "on"; WARMQ = 1; if (CROWD && LOADBAR) LOADBAR.done(); QUAL.onChange((t, cfg) => tr.setQuality({ density: cfg.traffic })); }).catch(e => { offNote("traffic", e); STATUS.traffic = "off: " + (e && e.message || e); console.warn("[melody3d] traffic", e); });
    ENEMY = AIRM.buildAirliner(THREE, { livery: "enemy" }); MODELS.kami3 = { node: ENEMY.node, size: ENEMY.size };   // the head-on airliners: same detailed airframe, grey
  }
  const PK = "plane";
  // instances: each model type has a pool of clones; materials are cloned per clone so hit flashes/tints stay local
  const POOLS = {};
  function cloneModel(k, tint) {
    const src = MODELS[k]; const o = new THREE.Group(), inner = src.node.clone(true); const mats = [];
    const food = k.startsWith("p_") && k !== "p_mic";
    inner.traverse(n => { if (n.isMesh) { n.material = n.material.clone(); if (tint) n.material.color.multiply(new THREE.Color(tint)); if (!n.material.userData.keep && n.material.emissive) n.material.emissive = new THREE.Color(0);   // (unlit materials have no emissive uniform: giving them one crashed the render)
      if (food && n.material.map) { n.material.emissiveMap = n.material.map; n.material.roughness = .42; n.material.needsUpdate = true; } mats.push(n.material); } });
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
  // pickups glow from their own texture (emissiveMap = map) so they read bright; procedural parts (glass, liquid) keep their own look
  function foodLit(o, v) { const m = o.userData.mats; for (let i = 0; i < m.length; i++) if (m[i].emissiveMap) { m[i].emissive.setHex(0xffffff); m[i].emissiveIntensity = v; } }
  function flash(o, v, col) { const m = o.userData.mats; for (let i = 0; i < m.length; i++) { if (!m[i].emissive) continue; m[i].emissive.setHex(col || 0xffffff); m[i].emissiveIntensity = v; } }
  const V = new THREE.Vector3();
  function local(o, lx, ly, lz) { V.set(lx, ly, lz); return o.localToWorld(V); }   // model-local (normalized by its bbox) → world
  // model-local point given in fractions of the model's bbox
  function frac(o, fx, fy, fz) { const s = o.userData.size; return local(o, fx * s.x, fy * s.y, fz * s.z); }

  /* ---------------- procedural props: coin, drizzle emblem, med kit, crate + chute, blimp, rotors ---------------- */
  function capTex(draw, n) { const c = mkc(n || 128, n || 128); draw(c.getContext("2d"), c.width); return canTex(c, true); }
  const coinCap = capTex((x, n) => { const g = x.createLinearGradient(0, 0, n, n); g.addColorStop(0, "#fff7c2"); g.addColorStop(.4, "#ffd23f"); g.addColorStop(.75, "#c88a0c"); g.addColorStop(1, "#ffe38a"); x.fillStyle = g; x.fillRect(0, 0, n, n);
    x.strokeStyle = "#9b6a06"; x.lineWidth = 6; x.beginPath(); x.arc(n / 2, n / 2, n * .42, 0, TAU); x.stroke(); x.fillStyle = "#9b6a06"; x.font = "900 " + (n * .55 | 0) + "px 'Playfair Display',Georgia,serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("\u266A", n / 2, n / 2 + 4); });   // a gold music note (Melody), not a coin: one currency (points)
  const goldSide = new THREE.MeshStandardMaterial({ color: 0xd9a21b, metalness: .35, roughness: .35, emissive: 0x4a3000, emissiveIntensity: .6 });
  const coinGeo = new THREE.CylinderGeometry(1, 1, .22, 36);
  function coinMesh() { const m = new THREE.Mesh(coinGeo, [goldSide, new THREE.MeshStandardMaterial({ map: coinCap, metalness: .25, roughness: .4, emissive: 0x3a2600, emissiveIntensity: .5 }), new THREE.MeshStandardMaterial({ map: coinCap, metalness: .25, roughness: .4 })]); m.castShadow = true; return m; }
  let drizTexC = null;
  function drizTex() { if (drizTexC) return drizTexC; const im = M.DRIZ_IM; if (!M.ready(im)) return null;
    drizTexC = new THREE.Texture(im); drizTexC.colorSpace = THREE.SRGBColorSpace; drizTexC.anisotropy = 4; drizTexC.needsUpdate = true; return drizTexC; }
  const drizGeo = new THREE.PlaneGeometry(1, 1); drizGeo.rotateX(-Math.PI / 2);   // lies flat facing the camera; spins about the screen's vertical axis
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
  // chase view: the detailed airship (engine3d/blimp.js): fabric gores, fins, gondola, props, a scrolling LED band with
  // "ANTIDOTE FOOD REVIEW · antidotethefoodie.com" on both sides, MELODY on top, the Nalu Vida logo low on the flanks + belly
  let BLIMP3 = null;
  if (CHASE) { const BM = await import("../engine3d/blimp.js?v=e3n").catch(e => (offNote("blimp", e), null)), lt = new THREE.Texture(); lt.colorSpace = THREE.SRGBColorSpace; { const im = new Image(); im.onload = () => { lt.image = im; lt.needsUpdate = true; }; im.src = "../nalu-vida/img/logo.png"; }
    BLIMP3 = BM.buildBlimp(THREE, { top: "MELODY", led: ["ANTIDOTE FOOD REVIEW", "antidotethefoodie.com"], logo: lt }); BLIMP3.node.visible = false; BLIMP3.node.traverse(n => { if (n.isMesh) n.castShadow = true; }); scene.add(BLIMP3.node); }

  /* ---------------- ground: lit aerial tiles, landmarks, runway, shadow catcher ---------------- */
  const tileGeo = new THREE.PlaneGeometry(1, 1); tileGeo.rotateX(-Math.PI / 2);
  const tileMats = {}, tileMeshes = [];
  function tileMat(key) { const T = M.TILES[key]; if (!T) return null; if (tileMats[key]) return tileMats[key];
    const t = canTex(T.c, true); t.anisotropy = 4; return tileMats[key] = new THREE.MeshLambertMaterial({ map: t, transparent: true, depthWrite: false }); }
  const lmMats = {};
  function lmMat(k) { const im = S[k]; if (!M.ready(im)) return null; if (lmMats[k]) return lmMats[k]; const t = new THREE.Texture(im); t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; return lmMats[k] = new THREE.MeshLambertMaterial({ map: t, transparent: true, depthWrite: false, opacity: .95 }); }
  const lmMeshes = [], sideMeshes = [];
  if (CHASE) { const far = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), new THREE.MeshBasicMaterial({ color: 0x141829 })); far.rotation.x = -Math.PI / 2; far.position.y = -1.5; far.renderOrder = -1; scene.add(far); }   // night ground beyond the tiles, into the haze
  const RWT = { t: 0, n: 0 }, rwC = mkc(500, 900), rwX = rwC.getContext("2d"), rwTex = canTex(rwC, true);
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
  const LMK = { melody: 1, stadium: 1, towers: 1 }, LMW = M.LMW || { melody: 250, stadium: 270, towers: 240 };
  function drawGround(now, G) {
    let ti = 0, li = 0, si = 0, rwOn = false;
    G.ground.forEach((g, idx) => {
      const T = M.TILES[g.t], mat = tileMat(g.t);
      if (T && mat && !CHASE) { let m = tileMeshes[ti++]; if (!m) { m = new THREE.Mesh(tileGeo, mat); m.receiveShadow = false; scene.add(m); tileMeshes.push(m); }
        const h = T.c.height / 2; m.material = mat; m.visible = true; m.scale.set(W, 1, h); m.position.set(0, .01 * idx, g.y + h / 2 - H / 2); m.renderOrder = idx;
        if (CHASE) for (const sd of [-1, 1]) {   // the chase camera sees past the 400-wide field: mirrored copies of the same tile left and right
          let e = sideMeshes[si++]; if (!e) { e = new THREE.Mesh(tileGeo, mat); scene.add(e); sideMeshes.push(e); }
          e.material = mat; e.visible = true; e.scale.set(-W, 1, h); e.position.set(sd * W, .01 * idx, m.position.z); e.renderOrder = idx; } }
      if (!CHASE && (g.k === "nalu" || g.t === "nalu")) { const gx = W * .74, gy = g.y + g.h * .12, p = .55 + .45 * Math.sin(now / 260) * Math.sin(now / 610);
        BgA.q(gx, gy, 1, 160, 160, 0, UV.dot, 1, .67, .35, .45 * p); BgA.q(gx, gy, 1, 150, 150, 0, UV.glow, .31, .67, 1, .25 * p); }
      if (g.k === "runway" && g.y < H + 40 && g.y + g.h + 150 > -40) { rwOn = true; const sc = rwC.width / W;
        if (!RWT.n++ || !(MOBILE || SMOOTH) || now - RWT.t > 66) { RWT.t = now; rwX.setTransform(1, 0, 0, 1, 0, 0); rwX.clearRect(0, 0, rwC.width, rwC.height); rwX.setTransform(sc, 0, 0, sc, 0, 0); M.runway(rwX, g, 40); rwTex.needsUpdate = true; }   /* phones: the animated runway lights redraw at ~15 Hz (canvas glow + upload) */ const hh = rwC.height / sc; rwMesh.scale.set(W, 1, hh); rwMesh.position.set(0, .3, g.y - 40 + hh / 2 - H / 2); }
      if (LMK[g.k] && !CHASE) { const im = S[g.k], mm = lmMat(g.k); if (mm) { const w = LMW[g.k] || 230, h = w * im.naturalHeight / im.naturalWidth, x = W / 2 + g.side * 70 - w / 2, y = g.y + (g.h - h) / 2;
        let m = lmMeshes[li++]; if (!m) { m = new THREE.Mesh(tileGeo, mm); m.receiveShadow = true; scene.add(m); lmMeshes.push(m); } m.material = mm; m.visible = true; m.renderOrder = 50; m.scale.set(w, 1, h); m.position.set(x + w / 2 - W / 2, .2, y + h / 2 - H / 2); } }
    });
    for (let i = ti; i < tileMeshes.length; i++) tileMeshes[i].visible = false;
    for (let i = li; i < lmMeshes.length; i++) lmMeshes[i].visible = false;
    for (let i = si; i < sideMeshes.length; i++) sideMeshes[i].visible = false;
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
  const PL = { x: W / 2, y: H - 110, Y: 5, pitch: 0 }, GEAR = { v: 1, t: 0 }, RWY = .45, TOS = -1;   // TOS: the sign that tips the nose up (model faces +z)   // where the player's plane was last drawn (the chase camera follows it)
  function birthAlt(p) { // which layer a new particle belongs to: a ground fire, the falling plane, or the sky
    if (crashAlt >= 0 && Math.abs(p.x - crashX) < 60 && Math.abs(p.y - crashY) < 60) return Math.max(4, crashAlt - 6);
    if (playerAlt >= 0 && Math.abs(p.x - playerX) < 50 && Math.abs(p.y - playerY) < 60) return CHASE ? -2 : Math.max(3, playerAlt - 8);   // chase view: your own hits are drawn by engine3d/damage.js (decals, sparks, localized fire)
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
      if (p.alt === -2) continue; const u = p.age / p.life, al = p.a * (u < .1 ? u / .1 : 1) * Math.pow(1 - u, 1.5); if (al < .01) continue;
      const Y = p.alt < 0 ? 10 + 70 * u : p.alt; Bn.q(p.x, p.y, Y, p.s * 2, p.s * 2, 0, UV["sm" + p.sh + p.v], 1, 1, 1, al);
      if (p.hot && u < .3) Ba.q(p.x, p.y, Y + .5, p.s * 1.6, p.s * 1.6, 0, UV.glow, 1, 1, 1, .3 * (1 - u / .3) * p.a); }
    // debris: 3D tumbling shards that fall away toward the ground, burning ones glow
    let dn = 0;
    for (let i = 0; i < DB.length && dn < 80; i++) { const p = DB[i]; if (p.n3) { p.n3 = 0; p.alt = birthAlt(p); if (p.alt === -2) p.alt = Math.max(3, playerAlt - 8); else if (p.alt < 0) p.alt = 18; p.tilt = Math.random() * 6.3; }
      const u = p.age / p.life, sc = (1 - .6 * u) * p.sz * (p.sx || 1), Y = Math.max(2, p.alt * (1 - u * .9)), k = ws(Y);
      DM.compose(DP.set(wx(p.x, Y), Y, wz(p.y, Y)), DQ.setFromEuler(DE.set(p.tilt + p.rot * 1.3, -p.rot, p.rot * .7)), DS.set(sc * 2 * k, sc * 2 * k, sc * 2 * k / (p.sx || 1)));
      DC.set(p.col); if (p.burn) DC.lerp(HOT, Math.max(0, 1 - u * 1.6)); debrisMesh.setMatrixAt(dn, DM); debrisMesh.setColorAt(dn, DC); dn++;
      if (p.burn) { const g = 5 + p.sz; Ba.q(p.x, p.y, Y + 2, g * 2, g * 2, 0, UV.glow, 1, 1, 1, .7 * (1 - u)); } }
    debrisMesh.count = dn; debrisMesh.instanceMatrix.needsUpdate = true; if (debrisMesh.instanceColor) debrisMesh.instanceColor.needsUpdate = true;
    // fire: embers, fireballs, flame licks (additive)
    for (let i = 0; i < FI.length; i++) { const p = FI[i]; if (p.n3) { p.n3 = 0; p.alt = birthAlt(p); }
      if (p.alt === -2) continue; const u = p.age / p.life, Y = p.alt < 0 ? 12 + 30 * u : p.alt + 4;
      if (p.k === "em") { if (UV.spark) streak(Ba, p.x, p.y, Y, p.vx, p.vy, p.s * 1.8, p.s * 2 + Math.hypot(p.vx, p.vy) * 3.2, 1 - u);
        else { const c = u < .3 ? [1, .95, .77] : u < .6 ? [1, .7, .28] : [1, .35, .12]; Ba.q(p.x, p.y, Y, p.s * 1.6, p.s * 1.6, 0, UV.dot, c[0], c[1], c[2], 1 - u); } }
      else if (p.k === "fb") { const r = u < .22 ? p.s * (.3 + .7 * u / .22) : p.s * (1 - .45 * (u - .22) / .78); Ba.q(p.x, p.y, Y + 2, r * 2, r * 2, 0, UV.fball, 1, 1, 1, u < .22 ? 1 : Math.max(0, 1 - (u - .22) / .78)); }
      else { const s2 = p.s * (1 - .4 * u); tongueQ(Ba, p.x, p.y, Y, s2, p.ang + Math.PI / 2, UV.tongue, 1, 1, 1, 1 - u); } }
    // shock rings + dust rings
    for (let i = 0; i < RG.length; i++) { const p = RG[i], u = p.age / p.life, r = p.s * (1 - Math.pow(1 - u, 2)); if (r < 1) continue;
      if (p.dust) Bn.q(p.x, p.y, 3, r * 2.3, r * 2.3, 0, UV.ring, .61, .58, .54, .45 * (1 - u)); else Ba.q(p.x, p.y, A.air - 10, r * 2.3, r * 2.3, 0, UV.ring, 1, .81, .54, .85 * (1 - u)); }
    // wrecks: the shot-down aircraft spin down to the ground as real models
    for (let i = 0; i < WR.length && !(CHASE && COMBAT); i++) { const p = WR[i], u = Math.min(1, p.t / p.dur), key = p.im === S.cop1 ? "cop1" : p.im === S.cop0 ? "cop0" : p.im === S.jet ? "jet" : "plane";
      const o = take(key); if (!o) continue; const Y = Math.max(8, (key === "jet" ? A.jet : key === "plane" ? A.kami : A.cop) * (1 - u * .92));
      const base = key === "plane" ? Math.PI : 0;   // 2D draws wrecks at sprite width p.w, shrinking as they fall
      put(o, p.x, p.y, Y, p.w * (1 - .6 * u), false, base - p.rot, Math.sin(p.t / 90) * .9, .5 * u); flash(o, .15, 0xff5a1f); }
    // the game's older one-shot sprites (G.fx): spark squares, catch rings, kamikaze smoke, flame bursts
    for (let i = 0; i < G.fx.length; i++) { const p = G.fx[i], a = Math.max(0, Math.min(1, p.a));
      if (CHASE && (p.k === "f" || p.k === "s") && playerAlt >= 0 && Math.abs(p.x - playerX) < 60 && Math.abs(p.y - playerY) < 70) continue;
      if (p.k === "e") { if (UV.spark) streak(Ba, p.x, p.y, A.air + 6, p.vx, p.vy, p.s * 1.2, p.s * 2 + Math.hypot(p.vx, p.vy) * 2.5, a); else Ba.q(p.x, p.y, A.air + 6, p.s * 1.4, p.s * 1.4, 0, UV.dot, 1, .81, .42, a); }
      else if (p.k === "r") Ba.q(p.x, p.y, A.air + 6, p.s * 2.2, p.s * 2.2, 0, UV.ring, 1, .81, .54, a);
      else if (p.k === "w") Bn.q(p.x, p.y, A.bird + 4, p.s * 2.8, p.s, (p.rot || 0) + p.a * 3, UV.dot, 1, 1, 1, a);
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
    if (G.dying && C) { if (C.hit) { crashAlt = -1; if (CHASE) PLY.visible = false; return; }
      const p = Math.min(1, C.t / C.dur), Y = Math.max(6, (CHASE ? (C.a0 || (C.a0 = Math.max(40, PL.Y))) : A.player) * (1 - p)), o = CHASE ? PLY : take(PK); if (CHASE) PLY.visible = true; crashAlt = Y; crashX = C.x; crashY = C.y; PL.x = C.x; PL.y = C.y; PL.Y = Y;
      put(o, C.x, C.y, Y, M.PLANE_W * C.sc, false, Math.PI - C.rot, C.dir * (.5 + p * 1.1), -.25 * p); flash(o, 0); playerFire(o, G, now, 3.6, C); return; }
    crashAlt = -1; playerAlt = -1; if (CHASE) PLY.visible = false; if (G.crashed) return;
    const proll = Math.max(-1, Math.min(1, G.vx * .12)), palt = G.alt == null ? (G.running ? 1 : 0) : G.alt, pw = M.PLANE_W * (.74 + .26 * palt);
    const vis = G.inv <= 0 || G.landing || Math.floor(G.inv / 6) % 2 === 0; if (!vis) return;
    let Y = 5 + ((CHASE && G.alt3 != null ? G.alt3 : A.player) - 5) * palt; const o = CHASE ? PLY : take(PK); if (CHASE) PLY.visible = true;
    let pTO = 0; if (CHASE) {   // on the runway: sit on the wheels (gear bottom on the asphalt), rotate nose-up, lift off, gear up; gear down again to land
      const k = pw / PLY.userData.size.x, Yg = RWY - AIR.pts.gearLow * k, gearOn = palt < .14 || (G.landing && palt < .7) || !G.running;
      GEAR.v += ((gearOn ? 1 : 0) - GEAR.v) * Math.min(1, (now - (GEAR.t || now)) / 900); GEAR.t = now; if (AIR.gear) AIR.gear(GEAR.v);
      const top = G.alt3 != null ? G.alt3 : A.player; Y = Yg + (top - Yg) * palt * palt * (3 - 2 * palt);
      if (G.running && !G.landing) { const rot = Math.max(0, Math.min(1, ((G.el || 0) - 950) / 450)); pTO = .2 * rot * (1 - Math.max(0, Math.min(1, (palt - .45) / .55))); }
      else if (G.landing && palt < .5) pTO = .07 * palt / .5;   // landing flare
      Y += Math.sin(pTO) * 2.6 * k; }   // rotating about the main wheels, not the middle of the plane
    if (CHASE) {   // chase view: bank into the turn, nose up when you push ahead (and climb a touch), nose down when you ease back
      const pv = Math.max(-1, Math.min(1, -(G.mvz || 0) / 240)) * (G.running ? 1 : 0); PL.pitch += (pv - PL.pitch) * (1 - Math.exp(-Math.min(100, now - (PL.tA || now)) / 130));   // frame-rate independent
      const att = UPA.attitude((now - (PL.tA || now)) / 1000, proll * .95, PL.pitch * .3 * Math.max(.3, palt), 7); PL.tA = now;   // critically damped bank + pitch
      put(o, G.x, G.y, Y, pw, false, Math.PI - att.bank * .17, att.bank * Math.min(1, palt * 3), att.pitch + TOS * pTO);
      UPA.spin(now / 1000, G.boostT > 0 ? 1 : .85); o.updateMatrixWorld(true); const L = (q) => AIR.node.localToWorld(V.copy(q)), bst = G.boostT > 0 ? 1.8 : 1;
      AIR.pts.eng.forEach(e => FXA.glow(L(e), 9 * bst, G.boostT > 0 ? [.45, .75, 1] : [1, .55, .25], .55));
      FXA.glow(L(AIR.pts.tipL), 9, [1, .15, .12], .95); FXA.glow(L(AIR.pts.tipR), 9, [.15, 1, .35], .95);   // nav lights: red left, green right
      const sp = (now / 1000) % 1.2; if (sp < .06 || (sp > .16 && sp < .22)) { FXA.glow(L(AIR.pts.tipL), 28, [1, 1, 1], 1); FXA.glow(L(AIR.pts.tipR), 28, [1, 1, 1], 1); FXA.glow(L(AIR.pts.tail), 20, [1, 1, 1], 1); }   // double strobe
      if ((now / 1000 + .5) % 1 < .12) { FXA.glow(L(AIR.pts.beaconTop), 13, [1, .1, .05], 1); FXA.glow(L(AIR.pts.beaconBot), 13, [1, .1, .05], 1); }
      if (palt < .5) AIR.pts.land.forEach(q => FXA.glow(L(q), 26, [1, .96, .85], .8));   // landing lights low and slow
    } else put(o, G.x, G.y, Y, pw, false, Math.PI - proll * .35, -proll * .62, 0);
    playerAlt = Y; playerX = G.x; playerY = G.y; PL.x = G.x; PL.y = G.y; PL.Y = Y; flash(o, 0);
    if (!CHASE) navPair(now, 0, frac(o, .47, .1, -.02).clone(), frac(o, -.47, .1, -.02), 2.2);
    if (G.sev > .15 && !CHASE) playerFire(o, G, now, G.sev, null);   // chase view: real wounds instead (playerWounds)
    if (CHASE && G.mfl > 0 && G.running && !G.dying) { const c = rgb(M.WPN[G.wpn].c); AIR.pts.muzzle.forEach(q => FXA.glow(AIR.node.localToWorld(V.copy(q)), MOBILE ? 40 : 28, c, G.mfl / 70)); }
    else if (G.mfl > 0 && G.running && !G.dying) { const c = rgb(M.WPN[G.wpn].c), a = G.mfl / 70, pts = G.wpn < 3 ? [-22, 22] : [-22, 0, 22];
      pts.forEach(of => { const x = G.x + of, y = G.y - (of ? 20 : 36); Ba.q(x, y, Y + 6, 24, 24, 0, UV.dot, c[0], c[1], c[2], a); Ba.q(x, y, Y + 7, 10, 10, 0, UV.dot, 1, 1, 1, a); }); }
  }
  const EXT = new WeakMap(); const ext = (o) => { let e = EXT.get(o); if (!e) { e = { seed: 1 + Math.random() * 9, px: o.x }; EXT.set(o, e); } return e; };
  function drawEnemies(now, G) {
    const tt = now / 1000; if (APXO) { APXO.visible = false; BEAMM.forEach(m => m.visible = false); }
    for (let e = 0; e < G.ens.length; e++) { const en = G.ens[e]; if (!en) continue; const hit = en.hit > 0 ? Math.min(1, en.hit / 240) : 0;
      if (en.t === "ufo") { const bob = Math.sin(now / 300 + en.ph) * .06, o = take("ufo"); put(o, en.x, en.y, alt3(en, A.ufo), en.w, false, now / 700 + en.ph, bob, .18); flash(o, hit * .45); Object.assign(ext(en), { o, key: "ufo", tint: undefined });
        Ba.q(en.x, en.y + 16, alt3(en, A.ufo) - 30, 120, 120, 0, UV.dot, .49, .97, .78, .35); }
      else if (en.t === "jet") { const o = take("jet"); put(o, en.x, en.y, alt3(en, A.jet), en.w, false, -(en.ra || 0), 0, -.05); flash(o, hit * .45); Object.assign(ext(en), { o, key: "jet", tint: undefined });
        navPair(now, ext(en).seed, frac(o, .45, 0, .05).clone(), frac(o, -.45, 0, .05), 1.9);
        Ba.q(en.x, en.y - en.w * .55, alt3(en, A.jet) - 4, 10, 26, 0, UV.tongue, 1, .7, .4, .7); }
      else if (en.t === "kami") { const o = take(CHASE ? "kami3" : "plane"); put(o, en.x, en.y, alt3(en, A.kami), en.w, false, 0, Math.sin(now / 500 + en.x) * .08, CHASE ? 0 : .08); flash(o, hit * .45); Object.assign(ext(en), { o, key: CHASE ? "kami3" : "plane", tint: undefined });
        Ba.q(en.x, en.y + 50, alt3(en, A.kami) - 10, 180, 180, 0, UV.dot, 1, .98, .86, .55);
        navPair(now, ext(en).seed, frac(o, -.47, .1, .02).clone(), frac(o, .47, .1, .02), 2.6); }
      else if (en.t === "cop") { const key = en.v ? "cop1" : "cop0", o = take(key); if (!o) continue; const hb = M.copPt(en, "hub");
        const ex = ext(en), lean = Math.max(-.3, Math.min(.3, (en.x - ex.px) * -.25)); ex.px = en.x; ex.lean = (ex.lean || 0) * .85 + lean * .15;
        put(o, en.x, en.y, alt3(en, A.cop), M.COP_LEN, true, 0, ex.lean, .06); flash(o, hit * .45); Object.assign(ex, { o, key, tint: undefined, hub: hb });
        const top = o.position.y + o.userData.size.y * o.scale.x * .5 + 2; rotor(hb[0], hb[1], top, 70, tt * 2.6 * (en.v ? -1 : 1) * 3.1);
        const on = Math.floor(tt * 7) % 2, bp = M.copPt(en, "bar");
        if (on) Ba.q(bp[0] - 7, bp[1], top - 4, 52, 52, 0, UV.dot, 1, .16, .24, .95); else Ba.q(bp[0] + 7, bp[1], top - 4, 52, 52, 0, UV.dot, .16, .47, 1, .95);
        if (en.flash > 0) { const gp = M.copPt(en, "gun"); Ba.q(gp[0], gp[1], alt3(en, A.cop) + 4, 32, 32, 0, UV.dot, 1, .9, .6, 1); } }
      else if (en.t === "gunship") { const o = take("cop0", 0x9aa66a); if (!o) continue; put(o, en.x, en.y, alt3(en, A.gun), M.GS_LEN, true, -(en.a || 0), Math.sin(en.ph || 0) * .08, .05); flash(o, Math.min(1, (en.hit || 0) / 400) * .5);
        const top = o.position.y + o.userData.size.y * o.scale.x * .5 + 2, hb = M.gsPt(en, "hub"), tp = M.gsPt(en, "tail");
        rotor(hb[0], hb[1], top, 102, tt * 2.6 * 3.1); rotor(tp[0], tp[1], top - 6, 15, tt * 1.8 * 2.6 * 3.1);
        navPair(now, 4, frac(o, .5, .2, .1).clone(), frac(o, -.5, .2, .1), 2.4);
        en.guns.forEach((g, i) => { if (g.fl <= 0) return; const p = M.gsPt(en, i ? "gunR" : "gunL"); Ba.q(p[0], p[1], alt3(en, A.gun) + 4, 36, 36, 0, UV.dot, 1, .9, .6, 1); }); }
      else if (en.t === "superjet") { const o = take("jet", 0x6a7184); if (!o) continue; const a = en.a || 0; put(o, en.x, en.y, alt3(en, A.sj), M.SJ_W, false, -a, Math.sin(a * 2) * .35, 0); flash(o, Math.min(1, (en.hit || 0) / 400) * .5);
        const h = M.SJ_W * (S.jet.naturalHeight || 708) / (S.jet.naturalWidth || 520), burn = (en.st === "streak" || en.st === "zip") ? 1.7 : en.phase === 3 ? 1.15 : .75, ca = Math.cos(a), sa = Math.sin(a);
        [-7, 7].forEach(of => { const lx = of, ly = -h * .47, x = en.x + lx * ca - ly * sa, y = en.y + lx * sa + ly * ca, L = (26 + Math.random() * 10) * burn; tongueQ(Ba, x, y, alt3(en, A.sj) - 2, L / 46, a, UV.tongue, 1, .9, .8, .95); });
        if (en.st === "turn") { const pu = .5 + .5 * Math.sin(now / 90), ly = -h * .18; Ba.q(en.x - ly * sa, en.y + ly * ca, alt3(en, A.sj) + 8, 80, 80, 0, UV.dot, 1, .31, .24, .75 * pu); }
        navPair(now, 7, local(o, o.userData.size.x * .47, 0, 0).clone(), local(o, -o.userData.size.x * .47, 0, 0), 2.6); }
      else if (en.t === "esc") { const o = take("jet", 0x9fb0c8); if (!o) continue; const ex = ext(en), lean = Math.max(-.4, Math.min(.4, (en.x - ex.px) * -.2)); ex.px = en.x; ex.lean = (ex.lean || 0) * .85 + lean * .15;
        put(o, en.x, en.y, alt3(en, A.esc), en.w, false, 0, ex.lean, -.05); flash(o, hit * .5); Object.assign(ex, { o, key: "jet", tint: 0x9fb0c8 });
        navPair(now, ext(en).seed, frac(o, .45, 0, .05).clone(), frac(o, -.45, 0, .05), 1.8); Ba.q(en.x, en.y - en.w * .55, alt3(en, A.esc) - 4, 9, 24, 0, UV.tongue, 1, .7, .4, .7); }
      else if (en.t === "squad") { const o = take("jet", 0xc4b48a); if (!o) continue; put(o, en.x, en.y, alt3(en, A.bigjet), M.BJ_W, false, 0, Math.sin(en.ph || 0) * .1, -.04); flash(o, Math.min(1, (en.hit || 0) / 400) * .5);
        const h = M.BJ_W * (S.jet.naturalHeight || 708) / (S.jet.naturalWidth || 520); [-26, -9, 9, 26].forEach(of => tongueQ(Ba, en.x + of, en.y - h * .47, alt3(en, A.bigjet) - 2, (22 + Math.random() * 10) / 46, 0, UV.tongue, 1, .9, .8, .9));
        navPair(now, 5, frac(o, .47, 0, .05).clone(), frac(o, -.47, 0, .05), 3); }
      else if (en.t === "apex") { drawApex(now, en); }
      else if (en.t === "rocket") { const o = bossMesh("rocket"); put(o, en.x, en.y, alt3(en, A.rocket), M.RK_L, true, 0, Math.sin(now / 900) * .06, 0); flash(o, Math.min(1, (en.hit || 0) / 400) * .5);
        const ey = en.y - M.RK_L * .47, L2 = 46 + Math.random() * 16; Ba.q(en.x, ey - L2 / 2, alt3(en, A.rocket) - 4, 22, L2, 0, UV.tongue, .55, .8, 1, .95); Ba.q(en.x, ey, alt3(en, A.rocket) - 3, 40, 40, 0, UV.glow, .5, .7, 1, .6); }
      else if (en.t === "base") { const o = bossMesh("base"); put(o, en.x, en.y, A.base, M.BASE_W, false, 0, 0, 0); flash(o, Math.min(1, (en.hit || 0) / 700) * .35, 0xffc070);
        const u = o.userData; (en.L || []).forEach((l, i) => { const hd = u.L[i]; if (hd) hd.rotation.y = Math.PI / 2 - l.a; }); if (u.radar) u.radar.rotation.y = -en.rad; }
      else if (en.t === "bird") { const pg = en.pg ? 1 : 0, o = birdGet(pg), vx = en.vx || 0, vy = en.vy || 1, fl = Math.sin((en.fl || 0) / 8 * TAU), wing = o.userData.wings;
        put(o, en.x, en.y, alt3(en, A.bird), M.BIRD_W, false, Math.atan2(vx, vy), 0, en.st === "dive" ? .25 : 0); wing[0].rotation.z = fl * .75; wing[1].rotation.z = -fl * .75;
        if (en.hit > 0) Ba.q(en.x, en.y, alt3(en, A.bird) + 6, 40, 40, 0, UV.dot, 1, 1, 1, Math.min(.8, en.hit / 200)); }
    }
    const bd = G.bossDie; if (bd) { const b = bd.b, dur = b.t === "gunship" ? 1800 : b.t === "flock" ? 900 : 2600; if (bd.t < dur * .8) { const sc = 1 - .25 * bd.t / dur, u = bd.t / dur;
      if (b.t === "gunship") { const o = take("cop0", 0x9aa66a); if (o) { put(o, b.x, b.y, A.gun * (1 - u * .6), M.GS_LEN * sc, true, -(b.spin || 0), .4 * u, .3 * u); flash(o, .25, 0xff5a1f); } }
      else if (b.t === "squad") { const o = take("jet", 0xc4b48a); if (o) { put(o, b.x, b.y, A.bigjet * (1 - u * .6), M.BJ_W * sc, false, -(b.spin || 0), .6 * u, .3 * u); flash(o, .25, 0xff5a1f); } }
      else if (b.t === "rocket") { const o = bossMesh("rocket"); put(o, b.x, b.y, A.rocket * (1 - u * .6), M.RK_L * sc, true, -(b.spin || 0), .6 * u, .3 * u); flash(o, .25, 0xff5a1f); }
      else if (b.t === "base") { const o = bossMesh("base"); put(o, b.x, b.y, A.base, M.BASE_W, false, 0, 0, 0); flash(o, .3 + .2 * Math.sin(now / 60), 0xff5a1f); }
      else if (b.t === "flock" || b.t === "apex") { }
      else { const o = take("jet", 0x6a7184); if (o) { put(o, b.x, b.y, A.sj * (1 - u * .6), M.SJ_W * sc, false, -((b.a || 0) + (b.spin || 0)), .6 * u, .3 * u); flash(o, .25, 0xff5a1f); } } } }
  }
  const TRF_TINT = (M.TRF_COLS || []).map(c => new THREE.Color(c[0]).getHex());
  function drawTraffic(now, G) { const T = G.trf; if (!T) return;
    for (let i = 0; i < T.length; i++) { const p = T[i], o = take("trf", TRF_TINT[p.v] || 0); if (!o) continue;
      const roll = p.wob > 0 ? Math.sin(now / 55) * p.wob * .5 : Math.sin(now / 900 + p.seed) * .05;
      put(o, p.x, p.y, alt3(p, A.trf), p.w, false, Math.atan2(p.vx, p.vy), roll, 0); flash(o, 0);
      navPair(now, p.seed, frac(o, .47, .2, .1).clone(), frac(o, -.47, .2, .1), 1.6); } }
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
    banner.visible = true; banner.position.set(wx(bx, Y), Y, wz(by + 4, Y)); banner.scale.set(k, 1, k); banner.rotation.set(CHASE ? Math.PI / 2 : 0, -(rot || 0), 0);   // chase view: the towed review banner hangs upright, facing you banner.material.opacity = alpha;
  }
  function drawRescue(now, G) {
    const R = G.rescue; blimp.visible = false; if (BLIMP3) BLIMP3.node.visible = false; if (!R || R.st === "wait") return;
    const by = R.by + (M.reduce ? 0 : Math.sin(now / 520) * 3), d = R.st === "out" ? R.d : (R.lx >= R.bx ? 1 : -1);
    if (BLIMP3 && R.bx > -110 && R.bx < W + 110) { const b = BLIMP3.node; b.visible = true; b.position.set(wx(R.bx, A.blimp), A.blimp + Math.sin(now / 1300) * 2.5, wz(by, A.blimp)); b.scale.setScalar(ws(A.blimp) * 1.05);
      b.rotation.set(Math.sin(now / 1700) * .035, d > 0 ? 0 : Math.PI, Math.sin(now / 900) * .04); BLIMP3.update(now / 1000, FXA); }
    else if (R.bx > -110 && R.bx < W + 110) { const k = ws(A.blimp); blimp.visible = true; blimp.position.set(wx(R.bx, A.blimp), A.blimp, wz(by, A.blimp)); blimp.scale.setScalar(k); blimp.rotation.set(0, d > 0 ? 0 : Math.PI, Math.sin(now / 900) * .04);
      const u = blimp.userData; u.word.position.set(0, 18, d > 0 ? -5 : 5); u.word.rotation.set(-Math.PI / 2, 0, d > 0 ? 0 : Math.PI); u.prop.position.set(-54, 0, 0); u.prop.scale.setScalar(8); u.prop.rotation.y = now / 30;
      const bl = (now / 380 | 0) % 2, nose = local(blimp, 46, 4, 0); if (bl) navLight(nose.x, nose.y, nose.z, "#ff3b3b", 2.2); }
    const K = R.kit; if (K) { kitAt(K, now, true); if (!M.reduce) { const L = Math.hypot(K.vx, K.vy) * 9, rot = Math.atan2(-K.vx, K.vy); Ba.q(K.x - K.vx * 4.5, K.y - K.vy * 4.5, A.item - 2, 12, L, rot, UV.beam, .31, 1, .59, .55); } }
  }
  let kitN = 0;
  function kitAt(it, now, fast) { const o = poolGet(kits, kitN++, () => { const m = new THREE.Mesh(kitGeo, kitMats); m.castShadow = true; return m; }), p = 1 + .08 * Math.sin(now / 150), k = ws(A.item), IY = alt3(it, A.item);
    o.position.set(wx(it.x, IY), IY, wz(it.y, IY)); o.scale.setScalar(k * p); o.rotation.set(CHASE ? .95 : -.35, Math.sin(now / 400) * .3 + (fast ? now / 200 : 0), 0);
    Ba.q(it.x, it.y, A.item - 14, 68 * p, 68 * p, 0, UV.dot, .31, 1, .59, .55); }
  const FOOD_TILT = -1.05;
  function drawItems(now, G) {
    let cn = 0, dn2 = 0, crn = 0;
    for (let i = 0; i < G.items.length; i++) { const it = G.items[i];
      if (CHASE) { const Y = alt3(it, A.item), X = wx(it.x, Y), Z = wz(it.y, Y);   // where is it? a soft shadow on the ground right under it + a faint ring around it
        Bg.w(X, .8, Z, 22, 22, 0, UV.dot, 0, 0, 0, .3); Ba.w(X, Y, Z, 30, 30, 0, UV.ring, 1, .86, .45, it.mag ? .5 : .22);
        if (it.mag) { if (it._tx != null) for (let k = 1; k <= 4; k++) { const u = k / 5; Ba.w(X + (it._tx - X) * u, Y + (it._ty - Y) * u, Z + (it._tz - Z) * u, 12 * (1 - u * .6), 12 * (1 - u * .6), 0, UV.dot, 1.4, 1.1, .5, .6 * (1 - u)); }   // the zoom trail
          if (it._tx == null) { it._tx = X; it._ty = Y; it._tz = Z; } else { it._tx += (X - it._tx) * .3; it._ty += (Y - it._ty) * .3; it._tz += (Z - it._tz) * .3; } } }   // the tail lags behind: a short glowing streak
      if (it.t === "coin") { const o = poolGet(coins, cn++, coinMesh), r = it.r, k = ws(alt3(it, A.item)); o.position.set(wx(it.x, alt3(it, A.item)), alt3(it, A.item), wz(it.y, alt3(it, A.item))); o.scale.set(r * k, r * k, r * k); if (CHASE) { o.rotation.order = "YXZ"; o.rotation.set(Math.PI / 2, it.spin || 0, 0); } else { o.rotation.set(0, 0, it.spin || 0); o.rotation.order = "ZXY"; }
        Ba.q(it.x, it.y, alt3(it, A.item) - 12, r * 4, r * 4, 0, UV.dot, 1, .84, .27, .45); }
      else if (it.t === "driz") { const tex = drizTex(); const o = poolGet(drizs, dn2++, () => new THREE.Mesh(drizGeo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: .35, side: THREE.DoubleSide, color: 0xffffff })));
        if (tex && o.material.map !== tex) { o.material.map = tex; o.material.needsUpdate = true; } o.visible = !!tex;
        const Yd = alt3(it, A.item) + 6, k = ws(Yd), pu = .5 + .5 * Math.sin(now / 180), Hd = 54, Wd = tex ? Hd * tex.image.naturalWidth / tex.image.naturalHeight : 34, c = Math.cos(it.spin || 0);
        o.position.set(wx(it.x, Yd), Yd, wz(it.y, Yd)); o.scale.set(Wd * k * Math.max(.14, Math.abs(c)), 1, Hd * k); o.rotation.set(CHASE ? Math.PI / 2 : 0, 0, 0);   // coin-style turn (never fully edge-on), like the 2D one
        o.material.color.setScalar(c < 0 ? .82 : 1.08 + .12 * pu);
        const gr = Hd * (1.05 + .18 * pu) * 2;   // pulsing soft gold halo, same as 2D
        Ba.q(it.x, it.y, Yd - 10, gr * 1.25, gr * 1.25, 0, UV.dot, 1, .8, .26, .5 + .3 * pu); Ba.q(it.x, it.y, Yd - 9, gr * .6, gr * .6, 0, UV.dot, 1, .92, .6, .3 + .25 * pu);
        if ((now / 90 | 0) % 5 === 0) { const a = Math.random() * TAU; Ba.q(it.x + Math.cos(a) * 34, it.y + Math.sin(a) * 34, Yd + 20, 5, 5, 0, UV.dot, 1, 1, .86, .95); } }
      else if (it.t === "heal") kitAt(it, now, false);
      else if (it.t === "crate") { const nx = M.WPN[Math.min(4, G.wpn + 1)], col = G.wpn >= 4 ? "#ffd23f" : nx.c, sw = Math.sin(now / 420 + it.sw) * .16, k = ws(alt3(it, A.item));
        const o = poolGet(crates, crn++, makeCrate), u = o.userData; if (!crateTexC[col]) crateTexC[col] = crateTex(col); if (u.box.material.map !== crateTexC[col]) { u.box.material.map = crateTexC[col]; u.box.material.needsUpdate = true; }
        o.position.set(wx(it.x, alt3(it, A.item)), alt3(it, A.item), wz(it.y, alt3(it, A.item))); o.scale.setScalar(k); o.rotation.set(0, -sw, 0);
        u.ch.position.set(0, 26, -30); u.ch.rotation.set(-.55, 0, 0);
        const L = u.lines.geometry.attributes.position.array; L.set([-12, 11, -6, -24, 22, -24, 12, 11, -6, 24, 22, -24, -5, 11, -8, -8, 26, -30, 5, 11, -8, 8, 26, -30]); u.lines.geometry.attributes.position.needsUpdate = true;
        const c = rgb(col); Ba.q(it.x, it.y + 4, alt3(it, A.item) - 12, 92, 92, 0, UV.dot, c[0], c[1], c[2], .45 + .2 * Math.sin(now / 140)); }
      else if (it.t === "slow" || it.t === "boost") { }   // slow-mo hourglass + boost pickup: drawn on the 2D overlay (index.html)
      else { const P = it.t === "mic" ? M.MIC : it.p, key = P.k, bob = Math.sin(now / 260 + it.x) * 3, o = MODELS[key] ? take(key) : null;
        if (o) { const zs = o.userData.size, flat = zs.y < .5 * Math.max(zs.x, zs.z);   // plates/skillets show their top (the food), glasses/bottles/mic lean toward the camera
          put(o, it.x, it.y + bob, alt3(it, A.item), (P.w3 || P.w) * zs.x / (flat ? Math.max(zs.x, zs.z) : Math.max(zs.x, zs.y)), false, now / 1100 + it.x, (it.rot || 0) * .8, CHASE ? (flat ? .8 : .12) : P.tilt3 != null ? P.tilt3 : flat ? .32 : FOOD_TILT); o.rotation.order = "XYZ"; foodLit(o, it.t === "mic" ? 0 : P.drink ? .5 : .42); }
        else if (M.ready(P.im)) cardAt(P, it.x, it.y + bob, it.rot || 0);
        const c = it.t === "mic" ? [.89, .42, .51] : [1, .88, .55]; Ba.q(it.x, it.y, alt3(it, A.item) - 16, P.w * 1.7, P.w * 1.7, 0, UV.dot, c[0], c[1], c[2], .4);
        if (it.t === "food") { if (P.drink) drinkGlint(P, it.x, it.y + bob, now); else steam3(P, it.x, it.y + bob, now); } } }
    hideFrom(coins, cn); hideFrom(drizs, dn2); hideFrom(kits, kitN); hideFrom(crates, crn);
  }
  // soft wispy steam rising off the hot plates (3 puffs each, the shared sprite batch: no extra draw calls) and a sliding glint on the drinks
  function steam3(P, x, y, now) { if (M.reduce) return; const w = P.w;
    for (let i = 0; i < 3; i++) { const u = ((now / 1500) + i / 3 + x * .013) % 1, sz = w * (.3 + .5 * u), dx = (i - 1) * w * .2 + Math.sin(now / 420 + i * 2.1 + x) * w * .09 * (1 + u);
      Bn.q(x + dx, y - w * .22 - u * w * .75, A.item + 14 + u * 10, sz, sz * 1.25, 0, UV.dot, 1, 1, 1, .42 * Math.sin(u * Math.PI)); } }
  function drinkGlint(P, x, y, now) { const u = ((now / 1300) + x * .01) % 1, h = P.w * 1.3;
    Ba.q(x - P.w * .45 + u * P.w * .9, y, A.item + 18, 9, h, 0, UV.dot, 1, .97, .85, .38 * Math.sin(u * Math.PI)); }
  // fallback for a pickup without a GLB: its photo on a thin card, tilted toward the camera (same size as the 2D sprite)
  const cards = [], cardMats = {}; let cardN = 0;
  function cardAt(P, x, y, rot) { if (!cardMats[P.k]) { const t = new THREE.Texture(P.im); t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; cardMats[P.k] = new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: .4, side: THREE.DoubleSide, roughness: .6 }); }
    const o = poolGet(cards, cardN++, () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), cardMats[P.k]); m.castShadow = true; return m; }); o.material = cardMats[P.k];
    const k = ws(A.item), h = P.w * P.im.naturalHeight / P.im.naturalWidth; o.position.set(wx(x, A.item), A.item, wz(y, A.item)); o.scale.set(P.w * k, h * k, 1); o.rotation.set(CHASE ? -.15 : -Math.PI / 2 + .35, 0, -rot); }
  function drawShots(now, G) {
    const run = G.running && !G.dying, LK = CHASE ? 3 : 1, BK = MOBILE ? 1.7 : 1.25; Ba.ax = CHASE ? 1 : 0;   // chase view: bolts turn on their own axis and are stretched so they read flying away from you
    // every round = wide soft halo (reads on any tier, even without bloom) + coloured streak + HDR white-hot core (>1 feeds the bloom)
    // (rounds fly straight away from the chase camera, so a streak along the flight path is seen end-on: the read comes from
    //  bright round sprites — a hot core + halo — and a dotted trail behind each round, which does spread out on screen)
    const bolt = (x, y, Y, w, L, r, g, b) => { Ba.q(x, y, Y - .5, w * 3.6 * BK, w * 3.6 * BK, 0, UV.dot, r, g, b, .5); Ba.q(x, y + L * .35, Y, w * 1.5 * BK, L * 1.15 * LK, 0, UV.beam, r, g, b, .8);
      Ba.q(x, y, Y + .5, w * 1.45 * BK, w * 1.45 * BK, 0, UV.dot, 1.6 + r, 1.6 + g, 1.6 + b, 1);
      for (let k = 1; k <= 3; k++) Ba.q(x, y + k * L * .32, Y, w * (1.5 - k * .3) * BK, w * (1.5 - k * .3) * BK, 0, UV.dot, 1 + r, 1 + g, 1 + b, .75 - k * .18); };
    if (CHASE && PLY && PLY.visible && AIR) { // tracer streams from the two wing guns
      const pr = renderer.getPixelRatio(), DP = Math.max(1, pr), WC = MOBILE ? 1.6 : 1.3;
      TRC.U.uRes.value.set(W * pr, H * pr); PLY.updateMatrixWorld(true); AIR.pts.muzzle.forEach((q, i) => AIR.node.localToWorld(MZL[i].copy(q)));
      const fired = G.mfl > 0 && run; if (fired) BEAMT.t = now; const ba = Math.max(0, 1 - (now - BEAMT.t) / 150);
      const far = [null, null];
      for (let s = 0; s < G.shots.length; s++) { const sh = G.shots[s], Y = alt3(sh, A.shot) + 2; TRA.set(wx(sh.x, Y), Y, wz(sh.y, Y)); const gi = MZL.length > 1 && Math.abs(TRA.x - MZL[1].x) < Math.abs(TRA.x - MZL[0].x) ? 1 : 0, M0 = MZL[gi];   /* the gun on the round's own side */ const d = TRA.distanceTo(M0), seg = Math.min(d, 46 + sh.w * 8); TRB.copy(M0).sub(TRA).setLength(seg).add(TRA);
        const c = sh.w === 1 ? [.45, 1, .4] : sh.w === 3 ? [.3, .7, 1] : sh.w === 4 ? [1, .25, .2] : [1, .62, .18];
        TRC.add(TRA, TRB, c[0], c[1], c[2], 1, (3.2 + sh.w * .5) * WC * DP, (7 + sh.w) * WC * DP);
        if (!far[gi] || d > far[gi].d) far[gi] = { d, p: far[gi] ? far[gi].p.copy(TRA) : TRA.clone() }; }
      // a faint glowing beam along each gun's stream, fading ~150 ms after the last shot (reads as a strip even at 30 fps)
      if (ba > 0) for (let i = 0; i < 2; i++) if (far[i]) TRC.add(far[i].p, MZL[i % MZL.length], 1, .55, .15, .35 * ba, 1.2 * WC * DP, 6 * WC * DP);
    }
    for (let s = 0; s < G.shots.length; s++) { const sh = G.shots[s], x = sh.x, y = sh.y, Y = alt3(sh, A.shot) + 2;
      if (CHASE) { Ba.q(x, y, Y, 7 * BK, 7 * BK, 0, UV.dot, 2, 1.7, 1.1, .9); continue; }   // (the stream above draws the rest)
      if (sh.w === 0) bolt(x, y, Y, 5, 18, 1, .82, .35);
      else if (sh.w === 1) bolt(x, y, Y, 6, 30, .45, 1, .4);
      else if (sh.w === 2) { bolt(x, y, Y, 8, 20, 1, .55, .16); Ba.q(x, y, Y + .5, 24 * BK, 24 * BK, 0, UV.fball, 1, 1, 1, 1); }
      else if (sh.w === 3) bolt(x, y, Y, 7, 38, .25, .66, 1);
      else bolt(x, y, Y, 10, 48, 1, .2, .18); }
    for (let q = 0; q < G.eshots.length; q++) { const es = G.eshots[q]; if (!es) continue; const c = rgb(es.c), Y = alt3(es, A.eshot);
      if (es.tr && es.tr.length) for (let ti = 0; ti < es.tr.length; ti += 2) { const tu = ti / es.tr.length; Bn.q(es.tr[ti], es.tr[ti + 1], Y - 2, 5 + 7 * (1 - tu), 5 + 7 * (1 - tu), 0, UV.dot, .86, .87, .9, .1 + .3 * tu); }
      if (es.missile) { const rot = Math.atan2(es.vy, es.vx) - Math.PI / 2, ca = Math.cos(rot), sa = Math.sin(rot), body = (ly) => [es.x - ly * sa, es.y + ly * ca];
        let p = body(-5); Bn.q(p[0], p[1], Y, 4, 14, rot, UV.sq, c[0] * .9, c[1] * .9, c[2] * .9, 1); Ba.q(p[0], p[1], Y + .5, 12, 24, rot, UV.dot, c[0], c[1], c[2], .55);
        p = body(-17); Ba.q(p[0], p[1], Y + .2, 4, 12, rot, UV.beam, 1, .78, .47, .8); }
      else if (es.bomb) { const bl = (now / 150 | 0) % 2; Bn.q(es.x, es.y, Y, es.r * 2.4, es.r * 2.4, 0, UV.dot, .11, .12, .16, 1); Bn.q(es.x, es.y, Y + .2, es.r * 2, es.r * 2, 0, UV.dot, .11, .12, .16, 1);
        if (bl) { Ba.q(es.x, es.y, Y + .5, 16, 16, 0, UV.dot, 1, .23, .23, 1); } }
      else if (es.bullet && es.big) { const L = Math.hypot(es.vx, es.vy) * 2.6, rot = Math.atan2(-es.vx, es.vy);   // heavy slugs (gunship, LAPD heavy burst): thick glowing round
        Ba.q(es.x, es.y, Y - .5, 36 * BK, 36 * BK, 0, UV.dot, 1, .3, .08, .55); Ba.q(es.x - es.vx * 1.3, es.y - es.vy * 1.3, Y, 10 * BK, L + 6, rot, UV.beam, 1, .35, .1, .95); Ba.q(es.x, es.y, Y + .3, 20 * BK, 20 * BK, 0, UV.dot, 1, .45, .15, .8); Ba.q(es.x, es.y, Y + .5, 8, 8, 0, UV.dot, 1, .97, .85, 1); }
      else if (es.bullet) { const L = Math.hypot(es.vx, es.vy) * 3, rot = Math.atan2(-es.vx, es.vy);   // enemy rounds: red/orange tracer with a hot core, coming at you
        Ba.q(es.x, es.y, Y - .5, 24 * BK, 24 * BK, 0, UV.dot, 1, .3, .08, .55); for (let k = 1; k <= 3; k++) Ba.q(es.x - es.vx * k * 2.2, es.y - es.vy * k * 2.2, Y, (9 - k * 2) * BK, (9 - k * 2) * BK, 0, UV.dot, 1.6, .55, .15, .8 - k * .2); Ba.q(es.x - es.vx * 1.5, es.y - es.vy * 1.5, Y, 6 * BK, L + 5, rot, UV.beam, 1, .38, .1, .9); Ba.q(es.x - es.vx * .8, es.y - es.vy * .8, Y + .3, 2.4 * BK, L * .7 + 3, rot, UV.beam, 2, 1.3, .6, 1); Ba.q(es.x, es.y, Y + .5, 9 * BK, 9 * BK, 0, UV.dot, 2, .9, .4, 1); }
      else { Ba.q(es.x, es.y, Y, es.r * 5, es.r * 5, 0, UV.dot, c[0], c[1], c[2], .55); Ba.q(es.x, es.y, Y + .5, es.r * 2.1, es.r * 2.1, 0, UV.dot, Math.min(1, c[0] + .4), Math.min(1, c[1] + .4), Math.min(1, c[2] + .4), 1); } }
  Ba.ax = 0;
  }

  /* ---------------- chase view: camera, the game's world overlay, clouds, screen projection ---------------- */
  // The game's 2D overlay is split in two (index.html): HUD stays on the 2D canvas on top; everything it draws IN the world
  // (lightning lanes, aim lines, warning rings, beams, the boost trail) goes to this canvas, which lies on your flight level.
  const WSC = MOBILE ? 1.15 : 1.5, wcv = mkc(W * WSC, H * WSC), wcx = wcv.getContext("2d"), wTex = canTex(wcv, true);
  wcx.setTransform(WSC, 0, 0, WSC, 0, 0);
  // smoothness: re-upload this canvas to the GPU only on frames something was drawn on it (plus one more to show it cleared);
  // a full-canvas texture upload every frame was one of the biggest per-frame costs on iPhone
  const WD = { d: 0, was: 0 }; ["fill", "stroke", "fillRect", "strokeRect", "fillText", "strokeText", "drawImage", "putImageData"].forEach(k => { const f = wcx[k]; wcx[k] = function () { WD.d = 1; return f.apply(this, arguments); }; });
  const wGeo = new THREE.PlaneGeometry(W, H, 1, 2); wGeo.rotateX(-Math.PI / 2);
  { const p = wGeo.attributes.position; for (let i = 0; i < p.count; i++) { const z = p.getZ(i), y = z > -1e-3 && z < 1e-3 ? YP : z + H / 2; p.setZ(i, far(y) - H / 2); } p.needsUpdate = true; }   // the overlay follows the same stretched depth as the 3D things (middle row = your plane's row)
  const wMesh = new THREE.Mesh(wGeo, new THREE.MeshBasicMaterial({ map: wTex, transparent: true, depthTest: false, depthWrite: false, fog: false }));
  wMesh.position.y = A.player + 1; wMesh.renderOrder = 1000; wMesh.frustumCulled = false; wMesh.visible = CHASE; scene.add(wMesh);
  const CAM = { p: new THREE.Vector3(), l: new THREE.Vector3(), roll: 0, ok: false }, CT = new THREE.Vector3(), LT = new THREE.Vector3();
  function chaseCam(G, dt) {
    const X = PL.x - W / 2, Z = zm(PL.y, PL.Y) - H / 2, bank = Math.max(-1, Math.min(1, (G.vx || 0) * .12));
    // behind and a little above the plane; the camera follows you sideways most of the way so the field stays in view
    if (OLDCAM) { CT.set(X * .9, Math.max(34, PL.Y * .85 + 76), Z + 248); LT.set(X * .82, Math.max(0, PL.Y * .7 + 14), Z - 380); }   /* ?cam=old: the previous low chase framing */
    else {   // ABOVE-the-plane chase: CAM_HEIGHT over the plane (never below CAM_MIN_Y, so rooftops can't block it), looking down CAM_PITCH_DEG;
             // the plane is seen ~38 deg down (lower-middle third), the horizon band stays at the top, buildings keep their 3D sides
      const cy = Math.max(CAM_MIN_Y, PL.Y + CAM_HEIGHT), back = (cy - PL.Y) / Math.tan(CAM_PLANE_DEG * Math.PI / 180), p = CAM_PITCH_DEG * Math.PI / 180;
      CT.set(X * .9, cy, Z + back); LT.set(X * .84 + 0, cy - Math.sin(p) * 1000, Z + back - Math.cos(p) * 1000); }
    wMesh.position.y = PL.Y + 1;
    const ds = Math.min(.1, (dt || 16) / 1000), a = CAM.ok ? 1 - Math.exp(-ds * 5.2) : 1, al = CAM.ok ? 1 - Math.exp(-ds * 7.5) : 1; CAM.ok = true;   // body lags a little more than the aim: smooth, never floaty
    CAM.p.lerp(CT, a); CAM.l.lerp(LT, al); CAM.roll += (-bank * .07 - CAM.roll) * a;
    const sh = M.SHK; cam.position.set(CAM.p.x - sh[0] * .5, CAM.p.y + sh[1] * .5, CAM.p.z);
    cam.up.set(Math.sin(CAM.roll), Math.cos(CAM.roll), 0); cam.lookAt(CAM.l);
    if (BBCAM && WORLD) { const bs = WORLD.boards(); if (bs.length) { const b = bs[bs.length - 1]; b.updateWorldMatrix(true, false); b.getWorldPosition(V); const r = b.rotation.y + (b.parent ? b.parent.rotation.y : 0); cam.up.set(0, 1, 0); cam.position.set(V.x + Math.sin(r) * 120, 92, V.z + Math.cos(r) * 120); cam.lookAt(V.x, 92, V.z); } }   // ?bbcam=1: billboard close-up (testing)
    if (CARCAM) { cam.up.set(0, 1, 0); cam.position.set(174, 15, Z - 30); cam.lookAt(150, 3, Z - 160); }   // ?carcam=1: street-level look at the traffic (testing)
    if (NALUCAM) { for (const sg of SEGS.values()) if (sg.nalu) { const x = sg.group.position.x + sg.nalu.x, z = sg.group.position.z + sg.nalu.z; cam.up.set(0, 1, 0); cam.position.set(x - 170, 120, z + 170); cam.lookAt(x, 18, z); break; } }   // ?nalucam=1 (testing)
    if (SIDECAM) { cam.up.set(0, 1, 0); cam.position.set(X + 150, PL.Y + 12, Z + 20); cam.lookAt(X, PL.Y + 4, Z); }   // ?side=1: a look at the gear + rotation from the side (testing)
  }
  function drawClouds(G) { if (!smokeOK || !G.clouds) return;   // the game's drifting cloud wisps, now at different heights so you fly past and through them
    for (let i = 0; i < G.clouds.length; i++) { const c = G.clouds[i]; Bn.q(c.x, c.y, A.player + [-60, 45, 95][i % 3], c.s * 2.6, c.s * 1.5, 0, UV.smoke, .78, .82, .98, .2); } }
  const PV = new THREE.Vector3(), TF = Math.tan(cam.fov * Math.PI / 360);
  // game px (x, y) at altitude Y (default: your flight level) → [x, y, scale] on the 400x600 overlay, or null if behind the camera
  function proj(x, y, Y) { PV.set(x - W / 2, Y == null ? PL.Y : Y, (Y === 0 ? y : far(y)) - H / 2).applyMatrix4(cam.matrixWorldInverse); const vz = -PV.z; if (vz < 8) return null;
    PV.applyMatrix4(cam.projectionMatrix); return [(PV.x + 1) / 2 * W, (1 - PV.y) / 2 * H, (H / 2) / (vz * TF)]; }


  /* ---------------- chase view: the 3D ground, breaking buildings, the Easter egg, wounds ---------------- */
  const BBF = { f: new THREE.Frustum(), m: new THREE.Matrix4(), s: new THREE.Sphere() };
  const SEGS = new Map(), KIND = { runway: "runway", city: "city", towers: "towers", melody: "melody", stadium: "stadium", hills: "hills", coast: "coast", venice: "venice", pier: "pier" };
  const V2 = new THREE.Vector3(), WV = new THREE.Vector3();
  let segSeed = 1, eggRun = -1, eggSeg = null, clipCD = 0, lastHp = 100; const FLY = { seg: null, ok: false, hp: 100 };
  function drawWorld(now, dt, G) {
    const t = now / 1000, s = Math.min(.05, (dt || 16) / 1000), gsp = (G.gsp || 0) * 60; WORLD.wind.set(0, 0, gsp); WORLD.tick(s, t);
    if (G.runId !== eggRun) { eggRun = G.runId; eggSeg = null; }
    // Antidote's car + review screen: once the review is unlocked (7 Drizzle emblems) or past EGG_SCORE, one city strip ahead gets them
    const unlocked = G.running && !G.debug && ((G.dz || 0) >= M.DRIZ_N || G.score >= (M.EGG_SCORE || 3000)), live = new Set(), camZ = cam.position.z;
    let built = 0;   // at most one new ground strip is built per frame (building one is a few ms of CPU; two at once was a dropped frame)
    for (const g of G.ground) { const kind = KIND[g.k] || "city"; let sg = SEGS.get(g);
      if (sg && sg.kind !== kind) { scene.remove(sg.group); sg.dispose(); if (sg === eggSeg) eggSeg = null; sg = null; }
      if (!sg && built && SEGS.size && g.y + g.h < 0) continue;
      if (!sg) { built++; const egg = !eggSeg && unlocked && !G.eggFound && kind === "city" && g.y < -200; sg = WORLD.segment(kind, g.h, segSeed++, { side: g.side || 1, noStrip: true, egg, eggSide: g.side || 1 }); if (egg) eggSeg = sg; scene.add(sg.group); SEGS.set(g, sg); }
      sg.group.position.z = g.y + g.h / 2 - H / 2; sg.update(t, s, Math.abs(sg.group.position.z - camZ) < 1150); live.add(g); }
    for (const [g, sg] of SEGS) if (!live.has(g)) { scene.remove(sg.group); sg.dispose(); SEGS.delete(g); if (sg === eggSeg) eggSeg = null; }
    // hard rule: at most ONE review screen on screen per frame (billboards + the Easter-egg screen); extra ones are hidden
    { cam.updateMatrixWorld(); BBF.m.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); BBF.f.setFromProjectionMatrix(BBF.m); let shown = 0, raw = 0;
      for (const b of WORLD.boards()) { b.visible = true; b.updateWorldMatrix(true, false); BBF.s.center.setFromMatrixPosition(b.matrixWorld); BBF.s.center.y += 70; BBF.s.radius = 80;
        if (BBF.f.intersectsSphere(BBF.s)) { raw++; if (shown) b.visible = false; else shown = 1; } }
      if (eggSeg && eggSeg.egg && eggSeg.egg.screen) { const e = eggSeg.egg.screen; e.visible = true; e.getWorldPosition(BBF.s.center); BBF.s.radius = 60; if (shown && BBF.f.intersectsSphere(BBF.s)) e.visible = false; else if (BBF.f.intersectsSphere(BBF.s)) shown++; }
      STATUS.screens = shown; if (shown > (window.__BBMAX || 0)) window.__BBMAX = shown; if (raw > (window.__BBRAW || 0)) window.__BBRAW = raw; }
    M.egg = eggSeg && eggSeg.egg ? { on: true, x: eggSeg.egg.x + W / 2, y: eggSeg.group.position.z + eggSeg.egg.z + H / 2 } : null;
    const PX = PL.x - W / 2, PZ = zm(PL.y, PL.Y) - H / 2; clipCD -= s;
    // you vs the buildings: a rooftop scrape is a small hit, flying into one is a full hit; either way the building breaks where you hit it
    if (G.running && !G.dying && clipCD <= 0 && (G.alt == null || G.alt > .95)) for (const sg of SEGS.values()) { if (Math.abs(PZ - sg.group.position.z) > sg.len / 2 + 20) continue;
      const h = sg.collide(PX, PL.Y - 4, PZ, 30, 16); if (h) { const scrape = h.o.h - PL.Y < 14; sg.smash(h, PX, PL.Y, PZ, "plane"); if (sg.scatter) sg.scatter(PX, PZ, 160); clipCD = .7; if (M.bldHit) M.bldHit(!scrape); break; } }
    // your shots vs the buildings (they chip them; the shot is spent)
    for (const sh of G.shots) { if (sh.dead) continue; const sx = sh.x - W / 2, sz = far(sh.y) - H / 2, sy = alt3(sh, A.shot);
      for (const sg of SEGS.values()) { if (Math.abs(sz - sg.group.position.z) > sg.len / 2) continue; const h = sg.collide(sx, sy, sz, 2, 14); if (h) { sg.smash(h, sx, sy, sz, "shot"); sh.dead = 1; if (M.bldShot) M.bldShot(); } break; } }
    // the beach: a low pass makes the crowd wave and cheer; a whole beach strip flown low without a hit pays a bonus
    let onBeach = null; for (const sg of SEGS.values()) { if (!sg.flyby) continue; if (Math.abs(PZ - sg.group.position.z) < sg.len / 2 + 160 && G.running) FLYN = Math.max(FLYN, sg.flyby(PX, PL.Y, PZ) || 0); if (Math.abs(PZ - sg.group.position.z) <= sg.len / 2) onBeach = sg; }
    if (onBeach !== FLY.seg) { if (FLY.seg && FLY.ok && G.running && !G.dying && M.beachBonus) M.beachBonus(); FLY.seg = onBeach; FLY.ok = !!onBeach; FLY.hp = G.hp; }
    if (FLY.seg && (PL.Y > 100 || G.hp < FLY.hp)) FLY.ok = false;
    // skimming the water: spray and a wake
    if (G.running) for (const sg of SEGS.values()) { if (Math.abs(PZ - sg.group.position.z) > sg.len / 2) continue; if (sg.water(PX) && PL.Y < 95) { const k = (95 - PL.Y) / 30;
      for (let i = 0; i < 3; i++) if (Math.random() < s * 60 * k) FXA.emit(V.set(PX + (Math.random() - .5) * 50, 1.5, PZ + 10 + Math.random() * 20), V2.set((Math.random() - .5) * 30, 18 + Math.random() * 22, gsp + 30 * Math.random()), .9, 3, 14, [.97, .97, .96], [.85, .88, .9], .75, false, 0, .8, -30); } break; }
  }
  /* ---- takeoff: ground crew (aircraft marshallers) from the crowd system — hi-vis vests, ear defenders, glowing orange wands.
     Where the 2D game drew its mar0/mar1/mar2 sprites (beside the runway, ahead of the parked plane): "proceed" until the wheels
     leave the ground, then the big two-arm wave-off. The wands are lit along the forearm the clip is playing right now. */
  const MAR = { list: null, on: false }, MARV = new THREE.Vector3(), MARS = [[-50, 62, "m"], [54, 122, "f"], [-78, 215, "m"]];
  const MCLIP = {}; import("../engine3d/clips.js?v=e3n").then(m => { MCLIP.c = m.CLIPS; }).catch(() => {});
  function drawMarshals(now, G) {
    const rw = G.ground.find(g => g.k === "runway"), show = !!(CROWD && rw && !G.landing && !G.over && (!G.running || (G.el || 0) < 7000) && rw.y < H + 300);
    M.crew3d = !!CROWD; if (!show) { if (MAR.on) { MAR.list.forEach(m => { m.p.visible = false; m.ear.visible = false; }); MAR.on = false; } return; }
    if (!MAR.list) { const vest = CROWD.col ? CROWD.col("#c9ff1c") : [.58, 1, .02], pants = CROWD.col ? CROWD.col("#1f232b") : [.02, .02, .03];
      const earM = new THREE.MeshStandardMaterial({ color: 0x1b1d22, roughness: .5 }), capM = new THREE.MeshStandardMaterial({ color: 0xffc21a, roughness: .45 });
      MAR.list = MARS.map(([dx, dy, body], i) => { const look = CROWD.randomLook(77 + i * 13, body, "street"); look.top = [...vest, 2]; look.bot = [...pants, 3]; delete look._pk;
        const p = CROWD.add({ body, look, seed: 900 + i, scale: 1.35 }); p.play("marshal");
        const ear = new THREE.Group(); [-1, 1].forEach(sx => { const c = new THREE.Mesh(new THREE.SphereGeometry(.075, 10, 8), earM); c.scale.set(.55, 1, 1); c.position.set(sx * .075, 0, 0); ear.add(c); const d = new THREE.Mesh(new THREE.CircleGeometry(.04, 10), capM); d.rotation.y = sx * Math.PI / 2; d.position.set(sx * .097, 0, 0); ear.add(d); });
        const band = new THREE.Mesh(new THREE.TorusGeometry(.078, .012, 6, 16, Math.PI), earM); ear.add(band); scene.add(ear); return { p, dx, dy, ear }; }); }
    MAR.on = true; const lifted = G.running && (G.alt || 0) > .02, t = now / 1000, C = MCLIP.c;
    for (const m of MAR.list) { const p = m.p, x = W / 2 + m.dx, y = rw.y + 307 - m.dy, X = x - W / 2, Z = y - H / 2, s = p.s;
      const yaw = Math.atan2(PL.x - x, (H - 110) - y + 200) * .6; p.visible = true; p.set(X, RWY, Z, yaw); p.play(lifted ? "waveoff" : "marshal");
      m.ear.visible = true; m.ear.position.set(X, RWY + s * .915, Z); m.ear.rotation.y = yaw; m.ear.scale.setScalar(s);
      if (!C) continue; const clip = C[p.clip] || C.marshal, u = (((t - p.t0) / clip.dur) % 1 + 1) % 1, P = clip.fn(u), cy = Math.cos(yaw), sy = Math.sin(yaw);
      for (const [arm, sx] of [[P.armL, 1], [P.armR, -1]]) { const up = arm[0], fo = arm[1];
        const hx = sx * .17 + up[0] * .17 + fo[0] * .25, hy = .81 + up[1] * .17 + fo[1] * .25, hz = up[2] * .17 + fo[2] * .25;
        for (let q = 0; q < 5; q++) { const e = q * .055, lx = hx + fo[0] * e, ly = hy + fo[1] * e, lz = hz + fo[2] * e;   // the wand: a lit tube out of the hand
          MARV.set(X + (lx * cy + lz * sy) * s, RWY + ly * s, Z + (-lx * sy + lz * cy) * s); FXA.glow(MARV, q === 4 ? 3.4 : 2.4, [1, .42, .06], 1); }
        MARV.set(X + ((hx + fo[0] * .12) * cy + (hz + fo[2] * .12) * sy) * s, RWY + (hy + fo[1] * .12) * s, Z + (-(hx + fo[0] * .12) * sy + (hz + fo[2] * .12) * cy) * s); FXA.glow(MARV, 10, [1, .35, .04], .5); } }
  }
  const ALT_OF = { ufo: "ufo", jet: "jet", cop: "cop", kami: "kami", gunship: "gun", superjet: "sj", esc: "esc", squad: "bigjet", rocket: "rocket", base: "base", bird: "bird" };
  // enemies: each hit leaves a burning hole on the airframe that trails smoke; badly hurt ones burn before they blow
  function enemyWounds(now, dt, G) { const s = Math.min(.05, (dt || 16) / 1000), wz0 = (G.gsp || 0) * 60;
    for (const en of G.ens) { if (!en || !en.mhp || en.t === "base") continue; const lvl = 1 - Math.max(0, en.hp) / en.mhp; if (lvl <= .02) continue; const e = ext(en); e.w = e.w || [];
      const n = Math.min(5, Math.ceil(lvl * 4)); while (e.w.length < n) e.w.push([(Math.random() - .5) * .7, .1 + Math.random() * .3, (Math.random() - .4) * .6]);
      const size = en.boss ? (en.rw || 80) * 1.6 : (en.w || en.r * 2.4), cx = en.x - W / 2, cz = far(en.y) - H / 2, cy = alt3(en, A[ALT_OF[en.t]] || A.air);
      for (const w of e.w) { V.set(cx + w[0] * size, cy + w[1] * size * .4, cz + w[2] * size); FXA.dark(V, 4 + size * .05, .85); FXA.glow(V, 3 + size * .03, [1, .45, .12], .9);
        if (Math.random() < s * (10 + 12 * lvl)) FXA.emit(V, V2.set((Math.random() - .5) * 8, 8, wz0 + (Math.random() - .5) * 8), 1.2 + lvl, 3, 12 + 14 * lvl, lvl > .55 ? [.2, .18, .17] : [.5, .48, .47], [.12, .12, .12], .7, false, 0, .4, 4);
        if (lvl > .45 && Math.random() < s * 36) FXA.emit(V, V2.set(0, 6, wz0 * .9), .3, 7 * (.6 + Math.random() * .6), 2, [1, .82, .35], [1, .25, .05], 1, true, 0, 0, 16); } } }
  // you: each health drop opens a wound on a wing / engine / fuselage that keeps smoking; low health = engine fire + black smoke
  function playerWounds(now, dt, G) { const s = Math.min(.05, (dt || 16) / 1000);
    if (G.hp >= 99.9 && !G.dying && pDmg.count()) pDmg.reset();
    if (G.hp < lastHp - .5) { PLY.updateMatrixWorld(true);
      // each hit: a ray along the bullet's real path (from where it was a few frames ago to where it struck) against the airframe;
      // the hole, the sparks and the fire start exactly where that ray meets the mesh. Collisions (no bullet) hit the side they came from.
      const hits = HITS.length ? HITS.splice(0) : [{ x: G.x + (Math.random() - .5) * 40, y: G.y - 30 }];
      for (const h of hits) { const c = new THREE.Box3().setFromObject(AIR.node).getCenter(new THREE.Vector3()), es = h.es;
        let ok = false;
        if (es) { const ax = alt3(es, A.eshot), O3 = new THREE.Vector3(es.x - es.vx * 10 - W / 2, ax + (PL.Y - ax) * .2, far(es.y - es.vy * 10) - H / 2), T3 = new THREE.Vector3(es.x - W / 2, PL.Y, far(es.y) - H / 2).lerp(c, .55);
          ok = pDmg.hit(O3, T3.sub(O3)); }
        if (!ok) { const O3 = new THREE.Vector3(h.x - W / 2, PL.Y + 30, far(h.y) - H / 2 - 60), J = new THREE.Vector3((Math.random() - .5) * 18, (Math.random() - .5) * 3, (Math.random() - .5) * 18);
          ok = pDmg.hit(O3, c.clone().add(J).sub(O3)); }
        if (!ok) pDmg.hitNear(AIR.pts.wound[(Math.random() * AIR.pts.wound.length) | 0]); } }
    else if (G.hp > lastHp + 5) pDmg.heal();
    lastHp = G.hp; pDmg.level = G.dying ? 1 : 1 - G.hp / 100;
    if (PLY.visible) pDmg.update(s, now / 1000, PLY.scale.x, WV.set(0, 0, (G.gsp || 0) * 60 + 24)); }

  /* ---------------- frame ---------------- */
  let last = 0, fpsT = 0, fpsN = 0, bad = 0, started = performance.now(), FAILP = 0;
  // frame budget probe: which part of a slow frame (>28 ms) took the time; window.__M3SPK (read by the perf harness / ?debug)
  const SPK = window.__M3SPK = [], PT = { n: 0, k: [], v: [], t: 0 }; function pt(k) { const t = performance.now(); if (PT.n === 0) PT.t0 = PT.t; PT.k[PT.n] = k; PT.v[PT.n] = t - (PT.n ? PT.t : PT.s); PT.n++; PT.t = t; }
  function render(now, dt) {
    const G = M.G(); if (G.running && !G.dying) FLYT.s += Math.min(.05, (dt || 16) / 1000); if (!APEXREQ && G.running && M.NL && G.lvl >= M.NL() - 1) apexPreload(); if (WARMQ === 2 || (WARMQ && !G.running)) { WARMQ = 0; if (!Q.get("nowarm")) warm(now, G); } const T0 = performance.now(); PT.n = 0; PT.s = T0; lateSprites();
    BATCHES.forEach(b => b.begin()); TRC.begin(); poolsBegin(); ROTORS.n = 0; cardN = 0; kitN = 0; birdN = [0, 0]; for (const k in BOSSM) BOSSM[k].userData.used = 0;
    drawGround(now, G);
    drawCars(G);
    drawFX(now, G);
    if (CHASE && !POST) drawClouds(G);
    pt("ground+fx"); drawPlayer(now, G); if (CHASE) drawMarshals(now, G); drawTraffic(now, G); drawEnemies(now, G); drawReview(now, G); drawRescue(now, G); drawItems(now, G); drawShots(now, G); pt("actors");
    if (CHASE) { drawWorld(now, dt, G); pt("world"); enemyWounds(now, dt, G); playerWounds(now, dt, G); FXA.update((dt || 16) / 1000); pt("wounds+particles"); }
    for (let i = ROTORS.n; i < ROTORS.list.length; i++) ROTORS.list[i].visible = false;
    hideFrom(cards, cardN); poolsEnd(); hideFrom(BIRDS[0], birdN[0]); hideFrom(BIRDS[1], birdN[1]); for (const k in BOSSM) if (!BOSSM[k].userData.used) BOSSM[k].visible = false; BATCHES.forEach(b => b.end()); TRC.end();
    if (CHASE) { chaseCam(G, dt); if (WD.d || WD.was) wTex.needsUpdate = true; WD.was = WD.d; WD.d = 0; } else { const sh = M.SHK; cam.position.set(-sh[0], D, -sh[1]); }
    if (PROPT) PROPT.rotation = -now / 1000 * 9.7;
    pt("batches"); if (COMBAT) { try { gunfire(now, G); COMBAT.update((dt || 16) / 1000, now / 1000, { scroll: (G.gsp || 0) * 60, cullZ: cam.position.z + 220 }); } catch (er) { offNote("combat", er); COMBAT = null; } }
    pt("combat"); if (TRAFFIC) { try { TRAFFIC.update(cam, now / 1000, (dt || 16) / 1000, { night: SKY ? SKY.info.night : .8, rain: WX ? WX.v.rain : 0 }); } catch (er) { offNote("traffic", er); TRAFFIC = null; } }
    pt("traffic"); if (CROWD) { try { cam.updateMatrixWorld(); CROWD.update(cam, now / 1000, (dt || 16) / 1000); } catch (er) { offNote("crowd", er); CROWD = null; } }
    pt("crowd"); if (SKY) { try { envFrame(now, dt, G); } catch (er) { offNote("sky", er); SKY = null; renderer.render(scene, cam); } } else renderer.render(scene, cam);
    pt("render"); { const tot = performance.now() - T0; const AV = window.__M3PT || (window.__M3PT = { n: 0 }); AV.n++; AV.total = (AV.total || 0) + tot; for (let i = 0; i < PT.n; i++) AV[PT.k[i]] = (AV[PT.k[i]] || 0) + PT.v[i]; if (tot > 28 && SPK.length < 60) { const o = { at: (now / 1000).toFixed(1), ms: +tot.toFixed(1) }; for (let i = 0; i < PT.n; i++) if (PT.v[i] > 3) o[PT.k[i]] = +PT.v[i].toFixed(1); SPK.push(o); } }
    if (PVC) { const pv = document.getElementById("mpv"); if (pv && pv.isConnected && now - PVT3 > 60) { PVT3 = now; try { PVC.getContext("2d").drawImage(gl, 0, 0, PVC.width, PVC.height); M.pvFrame = PVC; } catch (er) {} } }
    // frame-rate guard (auto mode): under ~40 fps for 5 s straight → back to the 2D renderer for this visit
    fpsN++; if (!fpsT) fpsT = now;
    if (now - fpsT >= 1000) { const fps = fpsN * 1000 / (now - fpsT); STATUS.fps = Math.round(fps); fpsN = 0; fpsT = now;
      // quality tiers: step down ultra → high → med → low while the frame rate stays under 50; only when LOW still can't hold
      // ~40 fps for 5 s does this visit fall back to the 2D renderer (the old guard, now the last resort)
      if (!document.hidden && now - started > 4000) { const r = QUAL.sample(fps); STATUS.tier = tierName(); M.lock30 = QUAL.lock30; if (r === "fail" && MODE === "auto") FAILP = Math.round(fps); } }
    // the 2D fallback (only when even Smooth/LOW can't hold ~20 fps) never happens mid-flight: it waits for the menu / game over
    if (FAILP && !G.running) { fallback("low fps " + FAILP); return; }
  }
  // sky + weather + clouds + post for this frame (chase view)
  const ENV = { wind: new THREE.Vector3(), puffs: [], moon: new THREE.Color(.5, .58, .85), ambT: new THREE.Color(), ambB: new THREE.Color(), mist: new THREE.Color(), white: new THREE.Color(1, 1, 1) };
  function envFrame(now, dt, G) { const t = now / 1000, s = Math.min(.05, (dt || 16) / 1000); STATUS.mist = CLOUDS ? +CLOUDS.mist.toFixed(2) : 0; if (COMBAT) STATUS.combat = COMBAT.stats(); STATUS.hours = +todH.toFixed(2); STATUS.weather = WX ? WX.state : "-";
    if (SKYPREF() === "live") todH = (todH + s / 80) % 24;
    SKY.setTime(todH); if (WX) { try { WX.update(s, t, cam); } catch (er) { offNote("weather", er); WX = null; } } const w = WX ? WX.v : { cover: .4, density: 1, overcast: .1, dark: 0, haze: .1, vis: 1, rain: 0, wind: .3, wet: 0, base: 270 }; SKY.update(s, w, t); const I = SKY.info, fl = WX ? WX.flash : 0;
    scene.fog.color.copy(I.horizon); const vis = w.vis; const FB = OLDCAM ? 0 : 1; scene.fog.near = (POST && POST.on ? 900 + 900 * vis : 250 + 650 * vis) + FB * 350; scene.fog.far = (POST && POST.on ? 4000 + 3000 * vis : 900 + 2300 * vis) + FB * 700;   // the higher camera looks through more air: push the haze back
    renderer.toneMappingExposure = 1.05 * I.exposure * (1 + fl * 1.6); RAIN.v = w.rain; if (WORLD.setDaylight) { WORLD.setDaylight(I.night, w); WORLD.setSkyLight(I, w); }
    const gsp = (G.gsp || 0) * 60; ENV.wind.set(-14 * w.wind, 0, gsp + 22 * w.wind);
    ENV.puffs.length = 0; if (G.clouds) for (let i = 0; i < G.clouds.length && ENV.puffs.length < 6; i++) { const c = G.clouds[i]; ENV.puffs.push([c.x - W / 2, A.player + (OLDCAM ? [170, 40, 260] : [340, 40, 430])[i % 3], far(c.y) - H / 2, c.s * (i % 3 === 1 ? .42 : .6)]); }
    const night = I.night > .5;
    ENV.ambT.copy(I.zenith).multiplyScalar(1.1).lerp(ENV.white, .15 * (1 - I.night)); ENV.ambB.copy(I.horizon).multiplyScalar(.6); ENV.mist.copy(I.horizon).lerp(ENV.white, .45 - .3 * I.night);
    if (WORLD.setWind) WORLD.setWind(.15 + w.wind * .85);
    // what is around you, for the reflections and the ambience
    let coast = 0, city = 0, crowdN = 0; for (const sg of SEGS.values()) { const dz = Math.abs(sg.group.position.z - (PL.y - H / 2)); if (dz > sg.len / 2 + 700) continue; const k = 1 - Math.max(0, dz - sg.len / 2) / 700;
      if (sg.shore != null) { coast = Math.max(coast, k); crowdN = Math.max(crowdN, k * .8); } else if (sg.kind !== "runway" && sg.kind !== "hills") city = Math.max(city, k); if (sg.melody) crowdN = Math.max(crowdN, k); }
    const U = WORLD.beachWater && WORLD.beachWater.uniforms; if (U) { const on = MIRROR && QUAL.cfg.water.reflect && coast > .05; U.uReflOn.value = on ? 1 : 0; if (on) { cam.updateMatrixWorld(); try { MIRROR.render(scene, cam); } catch (er) { offNote("reflections", er); MIRROR = null; U.uReflOn.value = 0; } U.uRefl.value = MIRROR.texture; U.uReflMat.value.copy(MIRROR.matrix); } }
    const low = Math.max(0, 1 - PL.Y / 260);
    if (AMB) try { AMB.update(s, { ocean: coast * (.35 + .65 * low), traffic: city * (.25 + .75 * low), crowd: crowdN * low, cheer: Math.min(1, FLYN / 25) * low, rain: w.rain, wind: Math.max(CLOUDS ? CLOUDS.mist : 0, w.wind * w.overcast * .8), engine: G.running ? 1 : 0, rpm: G.boostT > 0 ? 1 : .55 }); } catch (er) { offNote("audio", er); AMB = null; } FLYN = 0;
    if (!POST) { if (!CLOUDS && SKY.dome && !scene.userData.dome) { scene.userData.dome = 1; safe("sky-dome", () => { SKY.dome.scale.setScalar(2000); scene.add(SKY.dome); scene.background = null; }); } if (SKY.dome) SKY.dome.position.copy(cam.position); renderer.render(scene, cam); return; }
    try { POST.render(s, t, { cover: w.cover, density: w.density, base: w.base + (OLDCAM ? 0 : 200), top: w.base + (OLDCAM ? 560 : 760),   /* the above-the-plane camera sits higher: lift the cloud deck so it never films from inside a cloud */ dark: w.dark, wind: ENV.wind, puffs: ENV.puffs, sunCol: night ? ENV.moon : I.sunCol, sunI: night ? .12 : .25 + I.sunI * .5,
      ambTop: ENV.ambT, ambBot: ENV.ambB, fogCol: I.horizon, fogFar: scene.fog.far * .8, flash: fl, wet: w.wet, skyRef: I.horizon, sunVis: 1 - I.night, mistCol: ENV.mist,
      fogStart: 80 + 1300 * vis * vis + (OLDCAM ? 0 : 520), fogDen: (.0001 + .0035 * Math.pow(1 - vis, 1.5)) * (OLDCAM ? 1 : .5), bloom: .3 + .2 * I.night, bloomT: 1.5 + 1.8 * (1 - I.night) }); } catch (er) { offNote("post", er); POST = null; renderer.render(scene, cam); }
  }
  const PVC = document.createElement("canvas"); PVC.width = 160; PVC.height = 240; let PVT3 = 0;   // the start screen's LIVE preview copies the 3D frame right after it's drawn (iOS can't read the WebGL canvas later)
  function fallback(why) { if (LOADBAR) LOADBAR.done(); STATUS.reason = why; STATUS.on = false; M.render = null; M.chase = 0; M.wcx = null; M.proj = null; M.egg = null; M.on(false); gl.remove(); try { renderer.dispose(); } catch (e) {} console.info("[melody3d] switched to 2D:", why); }
  gl.addEventListener("webglcontextlost", (e) => { e.preventDefault(); fallback("context lost"); });
  wrap.style.isolation = "isolate";
  wrap.insertBefore(gl, cv);
  // explosions (the game's boom()): people on the ground nearby scatter, the bigger the blast the wider (visual only)
  // a kill: the 2D game already scored it; here the aircraft burns, falls, crashes (and a jet pilot ejects)
  M.onKill = (en) => { if (!CHASE || !COMBAT) return; const ex = EXT.get(en); if (!ex || !ex.o || !MODELS[ex.key]) return;
    const kind = en.t === "cop" ? "heli" : en.t === "ufo" ? "ufo" : en.t === "kami" ? "airliner" : "jet";
    const o = cloneModel(ex.key, ex.tint); o.position.copy(ex.o.position); o.quaternion.copy(ex.o.quaternion); o.scale.copy(ex.o.scale); o.visible = true;
    let rotor = null; if (kind === "heli") { rotor = new THREE.Mesh(rotorGeo, rotorMat); const sz = o.userData.size; rotor.position.set(0, sz.y * .5 + 1, 0); rotor.scale.setScalar(70 / o.scale.x); o.add(rotor); }
    const span = new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3()).length();
    COMBAT.crash({ obj: o, kind, k: Math.max(.6, span / 90), rotor, eject: kind === "jet", ground: 0 }); };
  // FINAL BOSS: APEX, the flying wedge supercar (engine3d/apex.js). Thrusters under the folded wheels puff smoke, burst on every
  // direction change; the red lock-on laser and the beam are real 3D lines; damage = sparks, smoke and a flickering light bar.
  let APX = null, APXO = null, BEAMM = null; const APXT = { t: 0 };
  // the generated GLB of the roadster (engine3d/assets/apex, ~270 KB high / ~115 KB Smooth+Low): fetched during the level before the
  // final one, compiled against the scene right away, swapped in for the procedural body (apex.js useModel). The procedural car stays if it fails.
  let APEXGLB = null, APEXREQ = false, APEXUSED = false;
  function apexPreload() { if (APEXREQ || !CHASE || FAILQ.includes("apexglb")) return; APEXREQ = true;
    loader.loadAsync(new URL("../engine3d/assets/apex/apex_" + (SMOOTH || QUAL.tier === "low" ? "lo" : "hi") + ".glb", location.href).href)
      .then(g => { APEXGLB = g.scene; STATUS.apex = "glb"; apexMesh(); }).catch(e => { STATUS.apex = "procedural: " + (e && e.message || e); console.warn("[melody3d] apex glb", e); }); } const APV = new THREE.Vector3(), APV2 = new THREE.Vector3(), APD = new THREE.Vector3();
  function apexMesh() { if (APX) { apexSwap(); return APXO; } APX = APXM.buildApex(THREE); APX.fold(1); APXO = new THREE.Group(); APXO.add(APX.node); APXO.rotation.order = "YXZ"; APXO.userData = { size: APX.size, mats: [] }; scene.add(APXO);
    BEAMM = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 10, 1, true).translate(0, .5, 0).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, .25, .2), transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); m.visible = false; m.renderOrder = 150; scene.add(m); return m; });
    apexSwap(); return APXO; }
  function apexSwap() { if (APEXUSED || !APEXGLB || !APX) return; APEXUSED = true; try { APX.useModel(APEXGLB); const v = APXO.visible; APXO.visible = true; renderer.compile(APXO, cam, scene); APXO.visible = v; } catch (e) { console.warn("[melody3d] apex swap", e); } }
  function beamLine(m, a, b, r, op) { m.visible = true; m.position.copy(a); APD.copy(b).sub(a); const L = APD.length(); m.scale.set(r, r, L); m.lookAt(b); m.material.opacity = op; }
  function drawApex(now, en) { apexPreload(); const G = M.G(), o = apexMesh(), t = now / 1000, Y = alt3(en, A.rocket), roll = Math.max(-.5, Math.min(.5, -(en.vx || 0) * .07));
    o.visible = true; put(o, en.x, en.y, Y, 340, true, 0, roll, en.st === "swoop" ? .18 : en.st === "lock" ? -.12 : 0); o.updateMatrixWorld(true);
    const dmg = 1 - en.hp / en.mhp, burst = en.burst > 0 ? 1 : 0, k = o.scale.x / 25;   // k ≈ 1 at the boss's size (the mesh is ~4.6 model units long, drawn ~118 game px)
    APX.update(t, { dmg: dmg * .5, flicker: dmg > .5 && Math.random() < .3 + dmg * .4, thrust: .6 + burst * .4, dt: Math.min(.05, (now - (APXT.t || now)) / 1000), wing: en.st === "lock" || en.st === "beam" ? 1 : 0 }); APXT.t = now;   // rear wing: High-Downforce while it locks on and fires, Low-Drag flat for the swipes
    if (en.hit > 0) flash(o, 0); 
    APX.pts.thrusters.forEach((q, i) => { APX.node.localToWorld(APV.copy(q)); FXA.glow(APV, (9 + burst * 10) * k, [1, .7, .35], .9);
      if (Math.random() < (burst ? .9 : .35)) FXA.emit(APV, APV2.set((Math.random() - .5) * 10, -60 - burst * 60, (G.gsp || 0) * 60 + 20), .8 + burst * .6, 3 * k, (12 + burst * 14) * k, [.85, .85, .85], [.55, .55, .58], .5, false, 0, 1.2, 8); });
    APX.pts.lightF.forEach(q => FXA.glow(APX.node.localToWorld(APV.copy(q)), 10 * k, [.85, .9, 1], .7));
    if (dmg > .25 && Math.random() < .15 + dmg * .5) { APX.node.localToWorld(APV.set((Math.random() - .5) * 1.6, .9, (Math.random() - .5) * 3)); FXA.emit(APV, APV2.set(0, 12, (G.gsp || 0) * 60 + 30), 1.8, 4 * k, 18 * k, dmg > .6 ? [.18, .17, .16] : [.5, .5, .5], [.1, .1, .1], .7, false, 0, .4, 5);
      if (dmg > .5 && FXA.sparks && Math.random() < .3) FXA.sparks(APV, APV2.set(0, 1, 0), null, k * 1.5, 6); }
    // the lock-on laser(s) and the beam, from the nose to the locked point and beyond
    BEAMM.forEach(m => m.visible = false);
    if (en.st === "lock" || en.st === "beam") { APX.node.localToWorld(APV.copy(APX.pts.nose)); const dirs = en.st === "beam" ? en.dirs : M.apexDirs ? M.apexDirs(en) : [Math.atan2(en.aimY - en.y - 26, en.aimX - en.x)];
      const az = CHASE ? en.aimZ : A.player;
      dirs.forEach((a, i) => { const L = 900, ex = en.x + Math.cos(a) * L, ey = en.y + 26 + Math.sin(a) * L; APV2.set(ex - W / 2, az + (APV.y - az) * 0, far(ey) - H / 2);
        if (en.st === "beam") { const f = en.beamT / 480; beamLine(BEAMM[i], APV, APV2, 2 + 6 * f, .9 * f); FXA.glow(APV, 30, [1, .3, .25], f); }
        else beamLine(BEAMM[i], APV, APV2, en.frz ? .9 : .35, en.frz ? .95 : .45 + .3 * Math.sin(now / 60)); });
      if (en.st === "lock") FXA.glow(APV, en.frz ? 16 : 9, [1, .2, .15], .9); } }
  const SHOTV = new THREE.Vector3(), SHOTD = new THREE.Vector3();
  function gunfire(now, G) { if (!COMBAT) return; let n = 0;
    for (const sh of G.shots) { if (SEEN.has(sh)) continue; SEEN.add(sh); if (n++ > 3 || !PLY.visible) continue; const c = rgb(M.WPN[G.wpn].c);
      PLY.updateMatrixWorld(true); const mz = AIR.pts.muzzle[(sh.x < G.x ? 1 : 0) % AIR.pts.muzzle.length]; AIR.node.localToWorld(SHOTV.copy(mz)); COMBAT.muzzle(SHOTV, SHOTD.set(0, 0, -1), c, 1.1); }
    for (const es of G.eshots) { if (SEEN.has(es)) continue; SEEN.add(es); if (es.bomb || n++ > 6) continue; const Y = alt3(es, A.eshot); SHOTV.set(es.x - W / 2, Y, far(es.y) - H / 2);
      SHOTD.set(es.vx || 0, 0, es.vy || 1).normalize(); SHOTV.addScaledVector(SHOTD, -6); COMBAT.muzzle(SHOTV, SHOTD, es.missile ? [1, .7, .4] : [1, .42, .14], es.big ? 1.3 : .9); } }
  M.onBossDown = (b) => { if (!CHASE || !COMBAT || b.t !== "apex" || !APXO) return; const o = APXO.clone(true); o.traverse(n => { if (n.isMesh) n.material = n.material.clone(); }); o.visible = true; scene.add(o);
    COMBAT.crash({ obj: o, kind: "apex", k: 1.6, ground: 0, eject: false }); APXO.visible = false; };
  const HITS = []; M.onHurt = (x, y, es) => { if (CHASE && HITS.length < 6) HITS.push({ x, y, es }); };
  M.onBoom = (x, y, n) => { if (!CHASE || !WORLD) return; const X = x - W / 2, Z = far(y) - H / 2, r = 60 + n * 3; for (const sg of SEGS.values()) if (Math.abs(Z - sg.group.position.z) < sg.len / 2 + r && sg.scatter) sg.scatter(X, Z, r); };
  if (CHASE) { M.wcx = wcx; M.proj = proj; M.chase = 1; chaseCam(M.G(), 0); cam.updateMatrixWorld(); }
  /* ---- warm-up: compile every shader and upload every texture BEFORE you fly ----
     One hidden frame with one of everything in front of the camera (each enemy/pickup model, both bosses, birds, APEX, the
     blimp, one ground strip of every kind with its people/cars, every sprite batch) through the real pipeline, so nothing
     compiles or uploads mid-flight (each first-time shader was a 40-200 ms freeze on phones). Runs at the start of a frame
     (the normal frame then draws over it): once at boot, again when the people + cars have loaded. */
  WARMQ = CHASE ? 2 : 0;   // 2 = now; 1 = at the next moment you aren't flying (people/cars loaded later never freeze a flight)
  function warm(now, G) {
    const t0 = performance.now(), z0 = cam.position.z - 420, tmp = [], segs = [];
    const front = (o, i) => { o.visible = true; o.position.set(((i % 7) - 3) * 60, 90 + (i % 3) * 30, z0 - (i % 5) * 40); tmp.push(o); };
    try {
      poolsBegin(); let i = 0; for (const k in MODELS) { const o = take(k); if (o) front(o, i++); }
      ["rocket", "base"].forEach(k => { try { front(bossMesh(k), i++); } catch (e) {} });
      [0, 1].forEach(pg => { try { front(birdGet(pg), i++); } catch (e) {} });
      if (APXM) try { front(apexMesh(), i++); BEAMM.forEach(m => { m.visible = true; m.position.set(0, 100, z0); tmp.push(m); }); } catch (e) {}
      if (BLIMP3) front(BLIMP3.node, i++); front(blimp, i++); if (PLY) { PLY.visible = true; tmp.push(PLY); }
      ["city", "towers", "melody", "stadium", "hills", "coast", "venice", "pier", "runway"].forEach((k, j) => { try { const sg = WORLD.segment(k, 700, 9000 + j, { side: j % 2 ? 1 : -1, noStrip: true, warm: true }); sg.group.position.z = z0 - 300; scene.add(sg.group); sg.update(now / 1000, .016, true); segs.push(sg); } catch (e) {} });
      BATCHES.forEach(b => { b.begin(); b.w(0, 100, z0, 10, 10, 0, UV.dot, 1, 1, 1, .5); b.end(); });
      cam.updateMatrixWorld(); if (CROWD) CROWD.update(cam, now / 1000, .016); if (TRAFFIC) TRAFFIC.update(cam, now / 1000, .016, { night: .5, rain: 0 });
      if (SKY) envFrame(now, 0, G); else renderer.render(scene, cam);
      if (renderer.initTexture) scene.traverse(o => { const m = o.material; if (!m) return; [].concat(m).forEach(mm => { for (const k of ["map", "normalMap", "roughnessMap", "emissiveMap", "alphaMap", "metalnessMap", "aoMap"]) if (mm[k] && mm[k].isTexture && !mm[k].isVideoTexture) try { renderer.initTexture(mm[k]); } catch (e) {} }); });
    } catch (e) { console.warn("[melody3d] warm-up", e); }
    segs.forEach(sg => { scene.remove(sg.group); sg.dispose(); }); tmp.forEach(o => { o.visible = false; }); poolsBegin(); poolsEnd(); birdN = [0, 0];
    STATUS.warm = (STATUS.warm ? STATUS.warm + "+" : "") + Math.round(performance.now() - t0) + "ms";
  }
  M.render = render; M.on(true); STATUS.on = true; document.documentElement.classList.add("m3d-on");
  if (LOADBAR) { LOADBAR.set(.92, "LOADING PEOPLE + CARS"); setTimeout(() => LOADBAR.done(), 25000); if (!CHASE || !renderer.capabilities.isWebGL2) LOADBAR.done(); }
  window.MELODY_3D = { segs: () => SEGS, status: () => Object.assign({}, STATUS), off: () => fallback("manual"), _: { THREE, scene, renderer, sun, cam, shadowCatcher, get clouds() { return CLOUDS; }, get post() { return POST; }, get sky() { return SKY; }, get wx() { return WX; } } };
}
