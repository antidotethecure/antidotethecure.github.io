/* StormBurger · Storm Run: optional 3D chase view (three.js r160 + ../engine3d).
   VISUAL ONLY. index.html keeps running the game exactly as before (lanes, spawns, hits, score, timer, HUD, prizes). At the end
   of every frame it calls __S.render(now, dt); this module draws that same state in WebGL under the game canvas, from a
   camera behind and above the StormBurger food truck (the Melody plane angle). While it is on, the 2D canvas only draws text.
   Mapping: x is 1:1 (lanes at -120 / 0 / 120). Ahead of the truck the 2D field is stretched KF× along the road, so pickups and
   hazards come out of the storm far ahead; the road scrolls at the same rate, so a coin sits still on the asphalt. Cops behind
   you are 1:1, so a ram lands exactly where the 2D hitbox says it does.
   Scenery is the real drive: Long Beach on Cherry Ave (Signal Hill pumpjacks at Hill St, Long Beach Airport at Carson St,
   StormBurger at Cherry & South, Jordan High School) and Inglewood on La Brea Ave (city monument, the stadium canopy at
   Century, the Forum colonnade + the giant donut at Manchester, StormBurger at 1500 N La Brea). The storefronts in between use
   made-up shop words, never real brands. Route: Settings → Route (localStorage "sb-route": both | lb | ing).
   ?render=2d (or Settings → View: Classic 2D) = the original 2D game, also the automatic fallback when WebGL is missing or even
   the LOW tier can't hold 30 fps. ?debug=1 shows a status badge. */
const S = window.__S, Q = new URLSearchParams(location.search), REQ = (Q.get("render") || "").toLowerCase();
const STATUS = window.__SB3 = { on: false, booted: false, reason: "", fps: 0, tier: "", enable: null };
const pref = () => { try { return localStorage.getItem("sb-render") || "3d"; } catch (e) { return "3d"; } };
function hasWebGL() { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (e) { return false; } }
if (S && REQ !== "2d" && (REQ === "3d" || pref() !== "2d")) {
  if (!hasWebGL()) STATUS.reason = "no WebGL";
  else boot().catch(e => { STATUS.reason = "boot failed: " + (e && e.message || e); console.warn("[storm3d] staying 2D:", e); S.r3 = false; S.render = null; });
}

async function boot() {
  const THREE = await import("three");
  const [QM, WXM, PM, BBMOD, CMOD] = await Promise.all(["quality", "weather", "particles", "billboard", "carmodels"].map(n => import("../engine3d/" + n + ".js?v=e3u")));
  const game = document.getElementById("game"), host = game.parentNode;
  const W = S.W, H = S.H, PY = S.PY, KF = 3.2, TAU = Math.PI * 2;
  const wx = x => x - W / 2;
  const wz = y => (y - PY) * (y < PY ? KF : 1);
  const LANEX = [-150, -50, 50, 150];   // 4 lanes (Antidote 2026-10-21: more room to dodge)

  /* ---------- renderer + quality ---------- */
  const cv = document.createElement("canvas"); cv.setAttribute("aria-hidden", "true");
  cv.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;border-radius:12px;display:block;pointer-events:none;z-index:0;visibility:hidden";
  if (getComputedStyle(host).position === "static") host.style.position = "relative";
  if (getComputedStyle(game).position === "static") { game.style.position = "relative"; game.style.zIndex = "1"; }   // the 2D canvas (HUD text, warnings, +points) stays on top of the 3D view
  host.insertBefore(cv, game);
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: !QM.isHandheld(), powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.45;
  const q = window.__E3Q = QM.makeQuality({ id: "storm-burger", renderer, target: 50, minFps: 30, calm: () => !S.get().running });
  let cfg = q.cfg; STATUS.tier = q.smooth ? "smooth" : q.tier;
  const LITE = q.smooth || q.tier === "low";
  const scene = new THREE.Scene();
  const BG = new THREE.Color(0x0c1330), BGF = new THREE.Color(0x5a6890);
  scene.background = BG.clone(); scene.fog = new THREE.Fog(0x141d3c, 900, 2900);
  const cam = new THREE.PerspectiveCamera(72, W / H, 4, 4600);
  const size = () => { const w = game.clientWidth || W, h = game.clientHeight || H; renderer.setPixelRatio(Math.min(devicePixelRatio || 1, cfg.pr)); renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
  size(); new ResizeObserver(size).observe(game);
  q.onChange((t, c) => { cfg = c; STATUS.tier = q.smooth ? "smooth" : t; size(); });
  let visible = true; new IntersectionObserver(e => { visible = e[0].isIntersecting; }).observe(game);

  /* ---------- light ---------- */
  const hemi = new THREE.HemisphereLight(0x8ea3d8, 0x1b1b24, 1.0); scene.add(hemi);
  const moon = new THREE.DirectionalLight(0xc4ceff, .7); moon.position.set(-300, 700, 200); scene.add(moon);
  // a fixed set of lights (count never changes, so shaders never recompile mid-run): truck headlights, cop light bars, engine fire, strike flash
  const spots = (LITE ? [0] : [-16, 16]).map(x => { const s = new THREE.SpotLight(0xfff1d0, LITE ? 900 : 520, 1300, .42, .55, 1); s.position.set(x, 28, -52); s.target.position.set(x * 1.4, 0, -520); return s; });
  const copLights = [0, 1].slice(0, LITE ? 1 : 2).map(() => { const l = new THREE.PointLight(0xff2a2a, 0, 420, 1); scene.add(l); return l; });
  const fireLight = new THREE.PointLight(0xff7a2a, 0, 260, 1); scene.add(fireLight);
  const flashLight = new THREE.PointLight(0xcfe0ff, 0, 1400, 1); scene.add(flashLight);
  const heliSpot = new THREE.SpotLight(0xf2f6ff, 0, 1100, .2, .5, 1); scene.add(heliSpot); scene.add(heliSpot.target);   // police helicopter searchlight on the truck
  { // wet-night reflections: a dark sky dome with a warm street-light horizon, baked once into an env map
    const pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene();
    es.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide,
      vertexShader: "varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }",
      fragmentShader: "varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 c = mix(vec3(.04,.05,.09), vec3(.15,.19,.33), smoothstep(-.1,.6,h)); c += vec3(1.,.6,.3) * .55 * exp(-abs(h - .03) * 28.); gl_FragColor = vec4(c, 1.); }" })));
    for (let i = 0; i < 12; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(3, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(7, 4.5, 2.2) })), a = i / 12 * TAU; m.position.set(Math.cos(a) * 60, 6 + (i % 3) * 5, Math.sin(a) * 60); es.add(m); }
    scene.environment = pm.fromScene(es, .02).texture; pm.dispose();
  }

  /* ---------- helpers ---------- */
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }, pick = a => a[(rnd() * a.length) | 0];
  const ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const ctex = (w, h, draw, srgb = true) => { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = ANISO; t.userData.canvas = c; t.userData.draw = draw; return t; };
  const redraw = t => { const c = t.userData.canvas, x = c.getContext("2d"); x.clearRect(0, 0, c.width, c.height); t.userData.draw(x, c.width, c.height); t.needsUpdate = true; };
  const TL = new THREE.TextureLoader(), img = (src, srgb = true) => { const t = TL.load(src); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = ANISO; return t; };
  const LOGO = new Image(); LOGO.src = "img/logo.png"; const logoTex = [];   // canvases that draw the logo redraw once it loads
  LOGO.onload = () => logoTex.forEach(redraw);
  const pic = src => { const i = new Image(); i.onload = () => logoTex.forEach(redraw); i.src = src; return i; }, ok = i => i.complete && i.naturalWidth;
  const P_ROAD = pic("img/world/road.webp"), P_SHOP = [pic("img/world/shops-a.webp"), pic("img/world/shops-b.webp")], P_SB = pic("img/world/stormburger.webp");   /* Higgsfield photo textures (10-21) */
  const BOX = new THREE.BoxGeometry(1, 1, 1), PLANE = new THREE.PlaneGeometry(1, 1), CYL = new THREE.CylinderGeometry(1, 1, 1, 10), CYL6 = new THREE.CylinderGeometry(1, 1, 1, 6);
  const std = (color, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: .8, metalness: 0 }, o));
  const basic = (color, o = {}) => new THREE.MeshBasicMaterial(Object.assign({ color }, o));
  const add = (g, geo, mat, sx, sy, sz, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z); g.add(m); return m; };
  const box = (g, mat, sx, sy, sz, x, y, z) => add(g, BOX, mat, sx, sy, sz, x, y, z);
  const glowTex = ctex(64, 64, (x) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(.35, "rgba(255,255,255,.45)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 64, 64); });
  const glowMat = (color, a = 1) => new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity: a, blending: THREE.AdditiveBlending, depthWrite: false });
  const glowPlaneMat = (color, a) => new THREE.MeshBasicMaterial({ map: glowTex, color, transparent: true, opacity: a, blending: THREE.AdditiveBlending, depthWrite: false });
  const signCache = new Map();
  // green street-name sign / any flat text sign (cached by text, so nothing leaks as intersections scroll by)
  function textTex(key, w, h, draw) { if (!signCache.has(key)) signCache.set(key, ctex(w, h, draw)); return signCache.get(key); }
  function streetSign(name, sub, wide = 1) {
    return textTex("st:" + name + "|" + sub, 512, 112, (x, w, h) => { x.fillStyle = "#0f6b3a"; x.fillRect(0, 0, w, h); x.strokeStyle = "#f4f6f2"; x.lineWidth = 6; x.strokeRect(6, 6, w - 12, h - 12);
      x.fillStyle = "#f4f6f2"; x.textAlign = "center"; x.textBaseline = "middle"; x.font = "800 64px Arial,Helvetica,sans-serif"; x.fillText(name, w / 2 + (sub ? 40 : 0), h / 2 + 3);
      if (sub) { x.font = "800 26px Arial,Helvetica,sans-serif"; x.fillText(sub, 70, h / 2 + 2); } });
  }

  /* ---------- road ---------- */
  const RT = 800;   // units per road texture tile
  const roadTex = ctex(1024, 2048, (x, w, h) => { const k = w / 400;
    x.fillStyle = "#21263a"; x.fillRect(0, 0, w, h);
    if (ok(P_ROAD)) { x.filter = "brightness(.8) saturate(.85)"; x.drawImage(P_ROAD, 0, 0, w, h / 2); x.save(); x.translate(0, h); x.scale(1, -1); x.drawImage(P_ROAD, 0, 0, w, h / 2); x.restore(); x.filter = "none"; }
    else for (let i = 0; i < 9000; i++) { const v = 26 + rnd() * 30 | 0; x.fillStyle = "rgb(" + v + "," + (v + 3) + "," + (v + 14) + ")"; x.fillRect(rnd() * w, rnd() * h, 1.4, 1.4); }
    LANEX.forEach(l => [-24, 24].forEach(o => { x.fillStyle = "rgba(10,12,20,.35)"; x.fillRect((200 + l + o - 7) * k, 0, 14 * k, h); }));   // darker tire tracks
    if (!ok(P_ROAD)) for (let i = 0; i < 14; i++) { x.fillStyle = "rgba(8,10,18,.45)"; x.beginPath(); x.ellipse(rnd() * w, rnd() * h, 20 + rnd() * 50, 40 + rnd() * 110, 0, 0, TAU); x.fill(); }   // puddles
    x.fillStyle = "#e9ecf2"; for (let z = 0; z < 5; z++) [-100, 0, 100].forEach(l => x.fillRect((200 + l - 2.5) * k, (z * 160 + 20) * (h / RT), 5 * k, 72 * (h / RT)));
    x.fillStyle = "#E8582A"; [-196, 196].forEach(l => x.fillRect((200 + l - 3) * k, 0, 6 * k, h));
  }); logoTex.push(roadTex);
  const roadRough = ctex(256, 512, (x, w, h) => { const k = w / 400; x.fillStyle = "rgb(150,150,150)"; x.fillRect(0, 0, w, h);
    LANEX.forEach(l => [-24, 24].forEach(o => { x.fillStyle = "rgb(105,105,105)"; x.fillRect((200 + l + o - 7) * k, 0, 14 * k, h); }));
    seed = 7; for (let i = 0; i < 9000; i++) rnd(); LANEX.forEach(() => {});   // same puddle positions as the colour map
    for (let i = 0; i < 14; i++) { x.fillStyle = "rgb(18,18,18)"; x.beginPath(); x.ellipse(rnd() * w, rnd() * h, (20 + rnd() * 50) / 2, (40 + rnd() * 110) / 2, 0, 0, TAU); x.fill(); } }, false);
  [roadTex, roadRough].forEach(t => { t.wrapS = THREE.ClampToEdgeWrapping; t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 4400 / RT); });
  const road = new THREE.Mesh(new THREE.PlaneGeometry(400, 4400), std(0xffffff, { map: roadTex, roughnessMap: roadRough, roughness: 1, metalness: .05, envMapIntensity: 1.4 }));
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0, -1900); scene.add(road);
  const lotTex = ctex(256, 256, (x, w, h) => { x.fillStyle = "#16181f"; x.fillRect(0, 0, w, h); for (let i = 0; i < 3000; i++) { const v = 18 + rnd() * 18 | 0; x.fillStyle = "rgb(" + v + "," + v + "," + (v + 6) + ")"; x.fillRect(rnd() * w, rnd() * h, 2, 2); } });
  lotTex.wrapS = lotTex.wrapT = THREE.RepeatWrapping; lotTex.repeat.set(12, 22);
  const lots = new THREE.Mesh(new THREE.PlaneGeometry(5000, 4400), std(0xffffff, { map: lotTex, roughness: .9 })); lots.rotation.x = -Math.PI / 2; lots.position.set(0, -.6, -1900); scene.add(lots);
  const walkTex = ctex(128, 256, (x, w, h) => { x.fillStyle = "#6c6f78"; x.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { const v = 90 + rnd() * 40 | 0; x.fillStyle = "rgb(" + v + "," + v + "," + (v + 6) + ")"; x.fillRect(rnd() * w, rnd() * h, 2, 2); } x.fillStyle = "#4a4d55"; for (let y = 0; y < h; y += 64) x.fillRect(0, y, w, 3); x.fillStyle = "#9a9ca4"; x.fillRect(0, 0, 12, h); });
  walkTex.wrapS = walkTex.wrapT = THREE.RepeatWrapping;
  const walkMat = std(0xffffff, { map: walkTex, roughness: .75 });

  /* ---------- shared scenery materials ---------- */
  const MAT = { dark: std(0x0f1016, { roughness: .6 }), pole: std(0x5b616d, { metalness: .6, roughness: .45 }), lamp: basic(new THREE.Color(5, 3.4, 1.8)),
    trunk: std(0x4a3a2c, { roughness: .95 }), roof: std(0x24262c, { roughness: .9 }), wall: std(0x3a3c45), fence: std(0x7d8592, { metalness: .5, roughness: .5, transparent: true, opacity: .55 }),
    sigG: basic(new THREE.Color(.2, 3, .8)), sigY: basic(new THREE.Color(3, 2.2, .2)), sigR: basic(new THREE.Color(3.5, .25, .2)), sigOff: std(0x15161b), white: std(0xe9ecf2), grass: std(0x1f3a22, { roughness: 1 }) };
  const poolMat = glowPlaneMat(0xffb060, .32), streakMat = glowPlaneMat(0xffb060, .22);
  const frondTex = ctex(128, 256, (x, w, h) => { x.strokeStyle = "#1c3a20"; x.lineWidth = 6; x.beginPath(); x.moveTo(w / 2, h); x.quadraticCurveTo(w / 2 + 6, h / 2, w / 2, 0); x.stroke();
    x.strokeStyle = "#2d5a2e"; x.lineWidth = 3; for (let y = 10; y < h; y += 9) { const l = (w / 2 - 6) * Math.sin(y / h * Math.PI); x.beginPath(); x.moveTo(w / 2, y); x.lineTo(w / 2 - l, y + 16); x.moveTo(w / 2, y); x.lineTo(w / 2 + l, y + 16); x.stroke(); } });
  const frondMat = std(0xffffff, { map: frondTex, alphaTest: .4, side: THREE.DoubleSide, roughness: .9 });
  const SHOPS = ["TACOS", "DONUTS", "LIQUOR", "TIRES", "LAUNDRY", "BEAUTY SUPPLY", "PHONE REPAIR", "CHECKS CASHED", "BARBER", "PIZZA", "AUTO PARTS", "MARKET", "DENTAL", "WINGS", "SMOG CHECK", "NAILS", "BBQ", "PHO"];
  const PAINT = ["#3b3f52", "#5a4636", "#2e4a52", "#523a4a", "#45503a", "#5c5544", "#3a3a3a", "#6b4a3a"];
  const facade = (word, paint, neon, n) => { { const ph = P_SHOP[n % 2], by = n % 2 ? .205 : .16;
      const t = ctex(1024, 512, (x, w, h) => { x.fillStyle = paint; x.fillRect(0, 0, w, h); if (ok(ph)) x.drawImage(ph, 0, 0, w, h);
        x.font = "900 " + (word.length > 9 ? 52 : 70) + "px Arial Black,Arial,sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.shadowColor = neon; x.shadowBlur = 24; x.fillStyle = neon; x.fillText(word, w / 2, h * by); x.shadowBlur = 0; x.fillStyle = "rgba(255,255,255,.75)"; x.fillText(word, w / 2, h * by); }); logoTex.push(t);
      return std(0xffffff, { map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: .6, roughness: .8 }); } };
  const NEON = ["#ff5a5a", "#ffd23f", "#5affc8", "#62b6ff", "#ff7ae0", "#ffffff"];
  const FACADES = []; for (let i = 0; i < (LITE ? 8 : 14); i++) FACADES.push(facade(SHOPS[i % SHOPS.length], PAINT[i % PAINT.length], NEON[i % NEON.length], i));

  /* ---------- scrolling world ---------- */
  const world = new THREE.Group(); scene.add(world);
  const live = [];
  const place = (o, z, upd) => { o.position.z = z; world.add(o); live.push({ o, upd }); };
  const FAR = -2600; const front = [700, 700];
  function sidewalk(g, s, len) { const m = box(g, walkMat, 92, 6, len, s * 246, 3, 0); m.material = walkMat; return m; }
  function streetlight(g, s, z) { const x = s * 214; add(g, CYL6, MAT.pole, 2.6, 175, 2.6, x, 87, z); box(g, MAT.pole, 70, 3, 3, x - s * 35, 172, z); box(g, MAT.lamp, 18, 4, 9, x - s * 66, 169, z);
    const p = add(g, PLANE, poolMat, 190, 190, 1, x - s * 70, .7, z); p.rotation.x = -Math.PI / 2;
    const r = add(g, PLANE, streakMat, 26, 320, 1, x - s * 66, .9, z + 160); r.rotation.x = -Math.PI / 2; }
  function palm(g, x, z, hgt) { const t = new THREE.Group(); t.position.set(x, 0, z); g.add(t); add(t, CYL6, MAT.trunk, 3.5, hgt, 3.5, 0, hgt / 2, 0);
    const crown = new THREE.Group(); crown.position.y = hgt; t.add(crown);
    for (let i = 0; i < 8; i++) { const f = add(crown, PLANE, frondMat, 26, 70, 1, 0, 0, 0); f.geometry = PLANE; f.rotation.set(-1.0 - rnd() * .5, i / 8 * TAU, 0, "YXZ"); f.translateY(30); }
    return crown; }
  function lot(s) {   // a generic block on side s (-1 left, 1 right)
    const g = new THREE.Group(), r = rnd(), len = 160 + rnd() * 160; let upd = null; const crowns = [];
    sidewalk(g, s, len);
    if (rnd() < .62) streetlight(g, s, -len / 2 + 20);
    if (r < .55) { const hgt = 55 + rnd() * 70, dep = 110 + rnd() * 60, mats = [MAT.wall, MAT.wall, MAT.roof, MAT.wall, MAT.wall, MAT.wall]; mats[s < 0 ? 0 : 1] = pick(FACADES);
      box(g, mats, dep, hgt, len - 14, s * (300 + dep / 2), hgt / 2, 0); box(g, MAT.dark, 4, 6, len - 14, s * 301, hgt, 0); }
    else if (r < .82) { const hw = 80 + rnd() * 30, hh = 34 + rnd() * 10, x0 = s * (340 + hw / 2);
      box(g, std(pick(["#b9a88a", "#9fb0b8", "#c2a6a0", "#a8b49a", "#d2c7b0"])), hw, hh, Math.min(len - 30, 120), x0, hh / 2, 0);
      const rf = add(g, new THREE.ConeGeometry(1, 1, 4), MAT.roof, hw * .8, 26, Math.min(len - 30, 120) * .8, x0, hh + 13, 0); rf.rotation.y = Math.PI / 4;
      box(g, basic(new THREE.Color(1.6, 1.2, .6)), 1, 10, 16, s * 339.4, hh * .5, -12);
      add(g, PLANE, MAT.grass, 40, len, 1, s * 316, .2, 0).rotation.x = -Math.PI / 2;
      crowns.push(palm(g, s * 318, -len * .3, 210 + rnd() * 110)); }
    else { add(g, PLANE, std(0x23252e, { roughness: .4 }), 200, len - 10, 1, s * 395, .3, 0).rotation.x = -Math.PI / 2;
      for (let i = 0; i < 3; i++) if (rnd() < .6) box(g, std(pick([0x6b1f1f, 0x2a3a5a, 0xbfc4cc, 0x1d1d1f, 0x5a5a40])), 46, 26, 90, s * (330 + i * 60), 13, (rnd() - .5) * 40);
      if (rnd() < .5) crowns.push(palm(g, s * 300, len * .35, 240 + rnd() * 90)); }
    if (rnd() < .35) crowns.push(palm(g, s * 222, len * .2, 230 + rnd() * 120));
    if (crowns.length) { const ph = rnd() * 6; upd = (o, t) => crowns.forEach((c, i) => { c.rotation.z = Math.sin(t * 1.7 + ph + i) * .12; c.rotation.x = Math.sin(t * 1.3 + ph) * .06; }); }
    return { o: g, len, upd };
  }

  /* ---------- intersections, signs, landmarks ---------- */
  function signal(g, s, z, cross, main) {   // mast-arm traffic signal at the far corner, the cross street's name on the arm
    const x = s * 222; add(g, CYL6, MAT.pole, 4, 210, 4, x, 105, z); box(g, MAT.pole, 230, 4, 4, x - s * 115, 200, z);
    const green = rnd() < .7;
    [x - s * 90, x - s * 200].forEach(hx => { box(g, MAT.dark, 14, 38, 12, hx, 178, z); [[MAT.sigR, 190], [MAT.sigY, 178], [MAT.sigG, 166]].forEach(([m, y], i) => { const on = green ? i === 2 : i === 0; box(g, on ? m : MAT.sigOff, 9, 9, 1, hx, y, z + 6.2); }); });
    const sg = add(g, PLANE, basic(0xffffff, { map: streetSign(cross, ""), toneMapped: false, side: THREE.DoubleSide }), 92, 20, 1, x - s * 145, 214, z + 1); sg.material.color.setScalar(1.2);
    const ps = add(g, PLANE, basic(0xffffff, { map: streetSign(main, ""), side: THREE.DoubleSide }), 54, 12, 1, x, 150, z + 3); ps.rotation.y = s * Math.PI / 2 * .0;
  }
  function intersection(E) { const g = new THREE.Group(), L = 170;
    const asph = std(0x1b1f2e, { roughness: .35, envMapIntensity: 1.3 });
    [-1, 1].forEach(s => { const m = add(g, PLANE, asph, 1400, L, 1, s * 900, .4, 0); m.rotation.x = -Math.PI / 2; });
    const cw = basic(0xd9dde6); [-L / 2 + 14, L / 2 - 14].forEach(z => { for (let i = -6; i <= 6; i++) { const m = add(g, PLANE, cw, 16, 22, 1, i * 28, .45, z); m.rotation.x = -Math.PI / 2; } });
    add(g, PLANE, cw, 360, 5, 1, 0, .45, L / 2 + 4).rotation.x = -Math.PI / 2;
    signal(g, 1, -L / 2 + 4, E.cross[1], E.cross[0]); signal(g, -1, -L / 2 + 4, E.cross[1], E.cross[0]);
    [-1, 1].forEach(s => streetlight(g, s, L / 2 - 10));
    return g; }
  function gantry(shield, text, sub) { const g = new THREE.Group();
    [-1, 1].forEach(s => box(g, MAT.pole, 6, 230, 6, s * 225, 115, 0)); box(g, MAT.pole, 460, 10, 6, 0, 226, 0); box(g, MAT.pole, 460, 4, 4, 0, 205, 0);
    const t = textTex("gt:" + shield + text + sub, 512, 220, (x, w, h) => { x.fillStyle = "#0f6b3a"; x.fillRect(0, 0, w, h); x.strokeStyle = "#eef2ee"; x.lineWidth = 8; x.strokeRect(8, 8, w - 16, h - 16);
      x.fillStyle = "#eef2ee"; x.beginPath(); x.moveTo(60, 36); x.lineTo(132, 36); x.lineTo(140, 60); x.quadraticCurveTo(136, 112, 96, 128); x.quadraticCurveTo(56, 112, 52, 60); x.closePath(); x.fill();
      x.fillStyle = "#1a3f8f"; x.fillRect(58, 64, 76, 46); x.fillStyle = "#c8202f"; x.fillRect(58, 40, 76, 20); x.fillStyle = "#fff"; x.font = "900 34px Arial,sans-serif"; x.textAlign = "center"; x.fillText(shield, 96, 100);
      x.fillStyle = "#eef2ee"; x.textAlign = "left"; x.font = "900 40px Arial,sans-serif"; x.fillText(text, 162, 80); x.font = "900 54px Arial,sans-serif"; x.fillText(sub, 40, 186); x.font = "900 54px Arial,sans-serif"; x.fillText("↑", w - 70, 186); });
    add(g, PLANE, basic(0xffffff, { map: t, side: THREE.DoubleSide }), 210, 90, 1, 70, 260, 4);
    return { o: g, len: 60 }; }
  const storeFace = (addr) => { const t = ctex(1024, 424, (x, w, h) => { x.fillStyle = "#d6c4a4"; x.fillRect(0, 0, w, h);
      if (ok(P_SB)) { x.drawImage(P_SB, 0, 0, w, h); const sx = w * .32, sy = h * .173, sw = w * .357, sh = h * .2; x.fillStyle = "#fbfcff"; x.shadowColor = "#cfe0ff"; x.shadowBlur = 30; x.fillRect(sx, sy, sw, sh); x.shadowBlur = 0;
        if (ok(LOGO)) { const lw = sw * .9, lh = Math.min(sh * .88, lw * LOGO.naturalHeight / LOGO.naturalWidth), lw2 = lh * LOGO.naturalWidth / LOGO.naturalHeight; x.drawImage(LOGO, sx + (sw - lw2) / 2, sy + (sh - lh) / 2, lw2, lh); }
        x.fillStyle = "#fff"; x.font = "800 22px Arial,sans-serif"; x.textAlign = "right"; x.fillText(addr, w - 24, h * .1); return; } x.fillStyle = "#1d43b5"; for (let i = 0; i < 5; i++) x.fillRect(i * 250 - 10, 0, 22, h * .62); x.fillStyle = "#f2f3f5"; x.fillRect(0, h * .02, w, h * .05);
      x.fillStyle = "#E8582A"; x.beginPath(); x.moveTo(0, h * .44); x.lineTo(w * .55, h * .44); x.lineTo(w * .5, h * .52); x.lineTo(w, h * .52); x.lineTo(w, h * .58); x.lineTo(w * .45, h * .58); x.lineTo(w * .5, h * .5); x.lineTo(0, h * .5); x.closePath(); x.fill();
      x.fillStyle = "#f2d9a6"; for (let i = 0; i < 4; i++) x.fillRect(40 + i * 245, h * .64, 205, h * .3); x.fillStyle = "rgba(0,0,0,.35)"; for (let i = 0; i < 4; i++) x.fillRect(40 + i * 245 + 100, h * .64, 5, h * .3);
      if (LOGO.complete && LOGO.naturalWidth) { const lw = w * .62, lh = lw * LOGO.naturalHeight / LOGO.naturalWidth; x.drawImage(LOGO, (w - lw) / 2, h * .06, lw, lh); }
      x.fillStyle = "#FFD23F"; x.font = "800 30px Arial,sans-serif"; x.textAlign = "right"; x.fillText(addr, w - 30, h * .41); }); logoTex.push(t);
    return std(0xffffff, { map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 1.25, roughness: .7 }); };
  function store(s, addr, walk) { const g = new THREE.Group(), len = 620; if (walk) sidewalk(g, s, len);
    const lot = add(g, PLANE, std(0x23262d, { roughness: .55, metalness: .1 }), 420, len, 1, s * 500, .5, 0); lot.rotation.x = -Math.PI / 2;   // their parking lot
    for (let i = 0; i < 6; i++) box(g, basic(0xd8dbe0), 40, .4, 2.5, s * 640, 1, -230 + i * 60);   // walk=false: drawn on top of the street, which already has its sidewalk
    const mats = [MAT.wall, MAT.wall, MAT.roof, MAT.wall, MAT.wall, MAT.wall]; mats[s < 0 ? 0 : 1] = storeFace(addr);
    box(g, mats, 200, 140, 320, s * 520, 70, -60); box(g, std(0xE8582A, { emissive: 0xE8582A, emissiveIntensity: .8 }), 6, 12, 322, s * 419, 140, -60);
    // the real pylon (his 10-21 photo): rounded white face with a thick red rim + red sides, the logo, one white pole, red DRIVE THRU box under it
    const px = s * 300, pz = 170, P = new THREE.Group(); P.position.set(px, 0, pz); P.rotation.y = -s * .45; P.scale.setScalar(1.7); g.add(P);   // big enough to read from far up the road
    const wpost = std(0xf2f3f5, { roughness: .5 }); add(P, CYL6, wpost, 7, 200, 7, 0, 100, 0);
    const pt = ctex(1024, 384, (x, w, h) => { const rr = (a, b, c, d, r) => { x.beginPath(); x.roundRect(a, b, c, d, r); x.fill(); };
      x.fillStyle = "#d9262f"; x.fillRect(0, 0, w, h); x.fillStyle = "#e33a36"; rr(6, 6, w - 12, h - 12, 70); x.fillStyle = "#f7f8fa"; rr(34, 30, w - 68, h - 60, 54);
      if (ok(LOGO)) { const lw = w * .8, lh = lw * LOGO.naturalHeight / LOGO.naturalWidth; x.drawImage(LOGO, (w - lw) / 2, (h - lh) / 2, lw, lh); } }); logoTex.push(pt);
    const pm = std(0xffffff, { map: pt, emissive: 0xffffff, emissiveMap: pt, emissiveIntensity: 1.7 }), red = std(0xd9262f, { emissive: 0x5a0a0a });
    box(P, [red, red, red, red, pm, pm], 150, 56, 18, 0, 222, 0);
    const dt = textTex("drivethru", 256, 64, (x, w, h) => { x.fillStyle = "#d9262f"; x.fillRect(0, 0, w, h); x.strokeStyle = "#fff"; x.lineWidth = 4; x.strokeRect(4, 4, w - 8, h - 8); x.fillStyle = "#fff"; x.font = "800 38px Arial,sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("DRIVE THRU", w / 2, h / 2 + 2); });
    const dm = std(0xffffff, { map: dt, emissive: 0xffffff, emissiveMap: dt, emissiveIntensity: 1.5 }); box(P, [red, red, red, red, dm, dm], 64, 17, 10, -14, 158, 0); box(P, red, 70, 21, 4, -12, 156, -7);
    const sg = new THREE.Sprite(glowMat(0xeaf0ff, .7)); sg.scale.set(260, 130, 1); sg.position.set(s * 415, 90, -60); g.add(sg);
    const gl = new THREE.Sprite(glowMat(0xdfe8ff, .9)); gl.scale.set(560, 330, 1); gl.position.set(px, 378, pz); g.add(gl);
    const sl = new THREE.PointLight(0xfff2e0, 2.2, 700, 1.2); sl.position.set(px, 300, pz + 60); g.add(sl);
    for (let i = 0; i < 6; i++) { const c = makeCar(i + (addr.includes("LONG") ? 3 : 0)); c.position.set(s * 360, 0, -200 + i * 72); c.rotation.y = s * .04; g.add(c); }   // the drive-thru line, in their lot
    // the StormBurger truck parked out front (it really sat outside the Long Beach spot while the restaurant was built)
    const tk = makeTruck(true); tk.g.position.set(s * 420, 6, 250); tk.g.rotation.y = s > 0 ? 0 : Math.PI; tk.g.scale.setScalar(.9); g.add(tk.g);
    return { o: g, len }; }
  function pumpjacks(s) { const g = new THREE.Group(), len = 440, js = [];
    sidewalk(g, s, len); add(g, PLANE, std(0x3a3226, { roughness: 1 }), 520, len, 1, s * 560, .3, 0).rotation.x = -Math.PI / 2;
    box(g, MAT.fence, 2, 30, len - 20, s * 300, 15, 0);
    const steel = std(0x2b2f36, { metalness: .6, roughness: .5 }), head = std(0xc79a2a, { metalness: .4, roughness: .5 });
    for (let i = 0; i < 3; i++) { const j = new THREE.Group(); j.position.set(s * (400 + i * 110), 0, -140 + i * 140); j.rotation.y = s * (Math.PI / 2) + (rnd() - .5) * .5; g.add(j);
      box(j, steel, 16, 8, 120, 0, 4, 0); box(j, steel, 6, 70, 6, -8, 38, -8).rotation.x = .2; box(j, steel, 6, 70, 6, 8, 38, -8).rotation.x = .2;
      const beam = new THREE.Group(); beam.position.set(0, 72, -6); j.add(beam); box(beam, head, 8, 8, 110, 0, 0, 6);
      const hd = box(beam, head, 10, 30, 14, 0, -10, -52); hd.rotation.x = .25; box(beam, steel, 26, 22, 10, 0, -8, 58);
      const crank = add(j, CYL, steel, 18, 6, 18, 0, 30, 46); crank.rotation.z = Math.PI / 2; js.push({ beam, crank, ph: rnd() * 6 }); }
    const sign = textTex("signalhill", 512, 128, (x, w, h) => { x.fillStyle = "#1f3b5a"; x.fillRect(0, 0, w, h); x.fillStyle = "#f2e7c8"; x.font = "900 54px Georgia,serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("SIGNAL HILL", w / 2, h / 2); });
    add(g, PLANE, basic(0xffffff, { map: sign, side: THREE.DoubleSide }), 90, 22, 1, s * 312, 44, -len / 2 + 30).rotation.y = -s * .6;
    return { o: g, len, upd: (o, t) => js.forEach(J => { J.beam.rotation.x = Math.sin(t * 1.4 + J.ph) * .28; J.crank.rotation.x = t * 1.4 + J.ph; }) }; }
  function airport(s) { const g = new THREE.Group(), len = 900; sidewalk(g, s, len);
    box(g, MAT.fence, 2, 44, len - 20, s * 300, 22, 0);
    add(g, PLANE, std(0x262a31, { roughness: .5 }), 1600, len, 1, s * 1100, .3, 0).rotation.x = -Math.PI / 2;
    const bl = basic(new THREE.Color(.4, .8, 3)), yl = basic(new THREE.Color(3, 2.4, .5));
    for (let i = 0; i < 18; i++) { box(g, bl, 4, 4, 4, s * 520, 2, -len / 2 + i * 50); box(g, yl, 4, 4, 4, s * 700, 2, -len / 2 + i * 50 + 25); }
    // control tower
    const tx = s * 400, tz = -150; add(g, CYL, std(0xd8d4c8), 26, 300, 26, tx, 150, tz);
    add(g, new THREE.CylinderGeometry(1, .8, 1, 8), std(0x0c2a2a, { emissive: 0x2a8a7a, emissiveIntensity: 1.1, metalness: .4, roughness: .2 }), 48, 40, 48, tx, 320, tz);
    add(g, CYL, MAT.roof, 52, 6, 52, tx, 343, tz); const bc = box(g, basic(new THREE.Color(4, .3, .2)), 6, 6, 6, tx, 352, tz);
    // terminal + a parked airliner
    const term = ctex(512, 128, (x, w, h) => { x.fillStyle = "#cfc6b3"; x.fillRect(0, 0, w, h); x.fillStyle = "#2c3644"; x.fillRect(0, h * .55, w, h * .3); x.fillStyle = "#e7d6a6"; for (let i = 0; i < 14; i++) x.fillRect(10 + i * 36, h * .6, 26, h * .2); x.fillStyle = "#1e3a6a"; x.font = "900 40px Arial,sans-serif"; x.textAlign = "center"; x.fillText("LONG BEACH AIRPORT", w / 2, h * .38); });
    const tm = [MAT.wall, MAT.wall, MAT.roof, MAT.wall, MAT.wall, MAT.wall]; tm[s < 0 ? 0 : 1] = std(0xffffff, { map: term, emissive: 0xffffff, emissiveMap: term, emissiveIntensity: .45 }); box(g, tm, 160, 70, 380, s * 820, 35, 260);
    const jet = new THREE.Group(); jet.position.set(s * 600, 0, 180); jet.rotation.y = s * .9; g.add(jet); const wm = std(0xeef0f4, { metalness: .3, roughness: .35 });
    const fu = add(jet, CYL, wm, 20, 300, 20, 0, 34, 0); fu.rotation.x = Math.PI / 2; box(jet, wm, 300, 4, 50, 0, 30, 10); box(jet, wm, 100, 3, 30, 0, 38, 130); box(jet, std(0x1e3a8a), 3, 60, 40, 0, 70, 135);
    [-60, 60].forEach(x => add(jet, CYL, std(0x9aa0aa, { metalness: .6, roughness: .4 }), 9, 30, 9, x, 20, 0).rotation.x = Math.PI / 2);
    return { o: g, len, upd: (o, t) => { bc.visible = Math.floor(t * 1.5) % 2 === 0; } }; }
  function panther(x, cx, cy, R) {   // a roaring panther head in the school's blue (drawn here, not copied from a photo)
    x.save(); x.translate(cx, cy);
    x.fillStyle = "#132a6e"; [[-.62, -.72], [.62, -.72]].forEach(([ex, ey]) => { x.beginPath(); x.moveTo(R * ex * .7, R * ey * .55); x.lineTo(R * ex * 1.05, R * ey * 1.15); x.lineTo(R * ex * .25, R * ey * .82); x.closePath(); x.fill(); });
    const hg = x.createRadialGradient(-R * .2, -R * .3, R * .1, 0, 0, R); hg.addColorStop(0, "#4f86e8"); hg.addColorStop(.6, "#2350c0"); hg.addColorStop(1, "#0f2463"); x.fillStyle = hg;
    x.beginPath(); x.moveTo(0, -R * .95); x.bezierCurveTo(R * .95, -R * .95, R * 1.05, R * .1, R * .55, R * .7); x.lineTo(0, R * 1.02); x.lineTo(-R * .55, R * .7); x.bezierCurveTo(-R * 1.05, R * .1, -R * .95, -R * .95, 0, -R * .95); x.fill();
    x.strokeStyle = "rgba(170,210,255,.7)"; x.lineWidth = R * .03; for (let i = -2; i <= 2; i++) { x.beginPath(); x.moveTo(i * R * .12, -R * .9); x.quadraticCurveTo(i * R * .2, -R * .55, i * R * .1, -R * .3); x.stroke(); }
    x.fillStyle = "#c9f03a"; [[-1], [1]].forEach(([sd]) => { x.beginPath(); x.ellipse(sd * R * .34, -R * .18, R * .17, R * .09, sd * -.35, 0, TAU); x.fill(); });
    x.fillStyle = "#06102a"; [[-1], [1]].forEach(([sd]) => { x.beginPath(); x.ellipse(sd * R * .34, -R * .18, R * .035, R * .08, 0, 0, TAU); x.fill(); });
    x.fillStyle = "#0b1636"; x.beginPath(); x.moveTo(-R * .12, R * .05); x.lineTo(R * .12, R * .05); x.lineTo(0, R * .18); x.closePath(); x.fill();
    x.fillStyle = "#c81e2a"; x.beginPath(); x.moveTo(-R * .42, R * .3); x.quadraticCurveTo(0, R * .2, R * .42, R * .3); x.quadraticCurveTo(R * .3, R * .95, 0, R * .92); x.quadraticCurveTo(-R * .3, R * .95, -R * .42, R * .3); x.fill();
    x.fillStyle = "#fff"; [[-.3, .3, 1], [.3, .3, 1], [-.22, .86, -1], [.22, .86, -1]].forEach(([fx, fy, d]) => { x.beginPath(); x.moveTo(R * (fx - .07), R * fy); x.lineTo(R * (fx + .07), R * fy); x.lineTo(R * fx, R * (fy + d * .26)); x.closePath(); x.fill(); });
    x.strokeStyle = "rgba(220,235,255,.85)"; x.lineWidth = R * .015; [-1, 1].forEach(sd => { for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(sd * R * .2, R * (.14 + i * .05)); x.lineTo(sd * R * .8, R * (.05 + i * .12)); x.stroke(); } });
    x.restore(); }
  function jordan(s, walk = true) { const g = new THREE.Group(), len = 720; if (walk) sidewalk(g, s, len);
    const tan = std(0xcdb38f, { roughness: .9 }), tanD = std(0xb79c78, { roughness: .9 });
    const mural = textTex("jordanmural", 512, 1024, (x, w, h) => { x.fillStyle = "#cdb38f"; x.fillRect(0, 0, w, h); for (let i = 0; i < 2500; i++) { x.fillStyle = "rgba(0,0,0," + (rnd() * .05) + ")"; x.fillRect(rnd() * w, rnd() * h, 3, 3); }
      x.font = "900 150px Arial Black,Impact,sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.lineJoin = "round"; x.lineWidth = 22; x.strokeStyle = "#ffffff"; x.save(); x.translate(w / 2, 150); x.scale(.62, 1); x.strokeText("JORDAN", 0, 0); x.fillStyle = "#2346b5"; x.fillText("JORDAN", 0, 0); x.restore();
      panther(x, w * .55, 470, 190); });
    const stripes = textTex("jordanstripes", 256, 1024, (x, w, h) => { x.fillStyle = "#cdb38f"; x.fillRect(0, 0, w, h); x.save(); x.translate(w / 2, h * .4); x.rotate(-.5); [["#c8202f", 0], ["#ffffff", 1], ["#2346b5", 2], ["#ffffff", 3], ["#c8202f", 4]].forEach(([c, i]) => { x.fillStyle = c; x.fillRect(-300, -120 + i * 48, 600, 44); }); x.restore(); });
    // tower: the mural faces the road, the red-white-blue stripes face oncoming traffic
    const tw = [tan, tan, tanD, tanD, basic(0xffffff, { map: stripes }), tan]; tw[s < 0 ? 0 : 1] = std(0xffffff, { map: mural, emissive: 0xffffff, emissiveMap: mural, emissiveIntensity: 1, roughness: .9 });
    box(g, tw, 100, 250, 120, s * 380, 125, -40);
    const up = new THREE.Sprite(glowMat(0xffe2b0, .5)); up.scale.set(300, 340, 1); up.position.set(s * 330, 150, -40); g.add(up);
    // the "2000" building: tan block with a blue-green window grid
    const f2 = textTex("jordan2000", 1024, 256, (x, w, h) => { x.fillStyle = "#cdb38f"; x.fillRect(0, 0, w, h); x.fillStyle = "#1d2a33"; x.fillRect(w * .32, h * .38, w * .62, h * .5);
      for (let r = 0; r < 3; r++) for (let i = 0; i < 12; i++) { x.fillStyle = rnd() < .5 ? "#7fb9b0" : "#3f6d72"; x.fillRect(w * .33 + i * w * .051, h * (.4 + r * .16), w * .046, h * .14); }
      x.fillStyle = "#1d2a33"; x.font = "900 54px Arial,sans-serif"; x.textAlign = "left"; x.fillText("2000", w * .34, h * .25); for (let i = 0; i < 5; i++) { x.fillStyle = "#24343c"; x.fillRect(w * (.04 + i * .05), h * .5, w * .035, h * .22); } });
    const bm = [tanD, tanD, std(0x9c8a70), tanD, tanD, tanD]; bm[s < 0 ? 0 : 1] = std(0xffffff, { map: f2, emissive: 0xffffff, emissiveMap: f2, emissiveIntensity: .6, roughness: .9 });
    box(g, bm, 130, 95, 340, s * 395, 47.5, 210);
    box(g, MAT.fence, 2, 34, 300, s * 304, 17, 210); box(g, std(0x2346b5), 4, 30, 60, s * 330, 15, 90);   // blue roll-up door
    // the school sign by the road (Antidote 10-21: "a Panther under Jordan"): JORDAN HIGH SCHOOL, the panther head under it, lit up
    const mono = textTex("jordanmono2", 512, 680, (x, w, h) => { x.fillStyle = "#0d1a4a"; x.fillRect(0, 0, w, h); x.fillStyle = "#1f46b8"; x.fillRect(12, 12, w - 24, h - 24); x.strokeStyle = "#fff"; x.lineWidth = 8; x.strokeRect(24, 24, w - 48, h - 48);
      x.fillStyle = "#fff"; x.textAlign = "center"; x.textBaseline = "middle"; x.font = "900 112px Arial Black,Arial,sans-serif"; x.fillText("JORDAN", w / 2, 100); x.font = "800 44px Arial,sans-serif"; x.fillText("HIGH SCHOOL", w / 2, 172);
      panther(x, w / 2, 400, 160); x.font = "800 34px Arial,sans-serif"; x.fillStyle = "#fff"; x.fillText("HOME OF THE PANTHERS", w / 2, 628); });
    const SG = new THREE.Group(); SG.position.set(s * 292, 0, -170); SG.rotation.y = -s * .5; g.add(SG);
    [-52, 52].forEach(px => add(SG, CYL6, MAT.pole, 5, 70, 5, px, 35, 0));
    const signM = basic(0xffffff, { map: mono, toneMapped: false }); signM.color.setScalar(1.08);
    box(SG, [MAT.dark, MAT.dark, MAT.dark, MAT.dark, signM, signM], 124, 165, 8, 0, 150, 0);
    const sgl = new THREE.Sprite(glowMat(0x9ab8ff, .55)); sgl.scale.set(260, 300, 1); sgl.position.set(0, 150, -10); SG.add(sgl);
    const fld = ctex(256, 512, (x, w, h) => { x.fillStyle = "#1d5a2a"; x.fillRect(0, 0, w, h); x.fillStyle = "rgba(255,255,255,.85)"; for (let y = 32; y < h; y += 44) x.fillRect(10, y, w - 20, 3); x.strokeStyle = "#fff"; x.lineWidth = 4; x.strokeRect(8, 8, w - 16, h - 16); });
    add(g, PLANE, std(0xffffff, { map: fld, roughness: .9 }), 300, 560, 1, s * 720, .5, -60).rotation.x = -Math.PI / 2;
    [[-300], [180]].forEach(([z]) => [560, 900].forEach(xx => { add(g, CYL6, MAT.pole, 5, 280, 5, s * xx, 140, z); box(g, basic(new THREE.Color(5, 5, 4.4)), 50, 26, 6, s * xx, 285, z); const sp = new THREE.Sprite(glowMat(0xfff4dd, .55)); sp.scale.set(200, 140, 1); sp.position.set(s * xx, 285, z); g.add(sp); }));
    return { o: g, len }; }
  /* the giant white LONG BEACH letters on the grass off the freeway (3D text, loaded once) */
  const FONT = import("three/addons/loaders/FontLoader.js").then(async ({ FontLoader }) => { const { TextGeometry } = await import("three/addons/geometries/TextGeometry.js");
    const f = await new FontLoader().loadAsync("https://cdn.jsdelivr.net/npm/three@0.160.1/examples/fonts/helvetiker_regular.typeface.json");
    const geo = new TextGeometry("LONGBEACH", { font: f, size: 62, height: 12, curveSegments: 4 }); geo.computeBoundingBox(); geo.translate(-(geo.boundingBox.max.x + geo.boundingBox.min.x) / 2, 0, 0); return geo; }).catch(e => { offNote && offNote("font", e); return null; });
  const offNote = (n, e) => { const m = n + ": " + String(e && e.message || e).slice(0, 80); (STATUS.off = STATUS.off || []).push(m); console.warn("[storm3d] " + m); };
  function roundTree(g, x, z, r) { add(g, CYL6, MAT.trunk, 4, r * 1.2, 4, x, r * .6, z); add(g, new THREE.SphereGeometry(1, 10, 8), std(0x1d3a22, { roughness: 1 }), r, r * .9, r, x, r * 1.5, z); }
  function lbsign(s) { const g = new THREE.Group(), len = 560; sidewalk(g, s, len);
    const berm = add(g, BOX, MAT.grass, 520, 30, 500, s * 560, 2, 0); berm.rotation.z = s * .06;
    const L = new THREE.Group(); L.position.set(s * 420, 18, -40); L.rotation.y = -s * .6; g.add(L);
    const letterM = std(0xf4f5f2, { roughness: .45, emissive: 0xdfe6ff, emissiveIntensity: .55 });
    FONT.then(geo => { if (geo) L.add(new THREE.Mesh(geo, letterM)); else { const t = textTex("lbflat", 1024, 160, (x, w, h) => { x.fillStyle = "#f4f5f2"; x.font = "300 150px Helvetica,Arial,sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("LONGBEACH", w / 2, h / 2); }); add(L, PLANE, basic(0xffffff, { map: t, transparent: true }), 460, 72, 1, 0, 36, 0); } });
    const up = new THREE.Sprite(glowMat(0xdfe8ff, .6)); up.scale.set(640, 190, 1); up.position.set(s * 420, 40, -40); g.add(up);
    roundTree(g, s * 330, -260, 34); roundTree(g, s * 560, -200, 44); roundTree(g, s * 640, 120, 40); roundTree(g, s * 480, 200, 30);
    const crowns = [palm(g, s * 300, 180, 280), palm(g, s * 700, -60, 320)];
    return { o: g, len, upd: (o, t) => crowns.forEach((c, i) => { c.rotation.z = Math.sin(t * 1.7 + i) * .12; }) }; }
  function lighthouse(s) { const g = new THREE.Group(), len = 420; sidewalk(g, s, len);   // the white lighthouse on its grass hill by the water
    add(g, new THREE.SphereGeometry(1, 24, 12, 0, TAU, 0, Math.PI / 2), MAT.grass, 240, 70, 200, s * 560, 0, 0);
    add(g, new THREE.CylinderGeometry(15, 22, 240, 16), std(0xf2f2ee, { roughness: .6 }), 1, 1, 1, s * 560, 180, 0);
    add(g, CYL, MAT.dark, 30, 5, 30, s * 560, 302, 0); add(g, CYL, std(0xfff3c0, { emissive: 0xffe08a, emissiveIntensity: 2 }), 13, 22, 13, s * 560, 316, 0); add(g, new THREE.ConeGeometry(1, 1, 12), MAT.dark, 16, 18, 16, s * 560, 336, 0);
    const beam = new THREE.Group(); beam.position.set(s * 560, 316, 0); g.add(beam); const bm = add(beam, new THREE.ConeGeometry(60, 900, 16, 1, true), glowPlaneMat(0xfff2c0, .12), 1, 1, 1, 0, 0, 450); bm.rotation.x = -Math.PI / 2; bm.material.side = THREE.DoubleSide; bm.material.map = null;
    const gl = new THREE.Sprite(glowMat(0xfff0b0, .9)); gl.scale.set(120, 120, 1); gl.position.set(s * 560, 316, 0); g.add(gl);
    [palm(g, s * 420, -120, 260), palm(g, s * 460, 90, 300), palm(g, s * 700, 120, 280)];
    return { o: g, len, upd: (o, t) => { beam.rotation.y = t * 1.4; } }; }
  function ferris(s) { const g = new THREE.Group(), len = 420; sidewalk(g, s, len);   // the Ferris wheel by the shore, slowly turning, lit up
    const cx = s * 520, cy = 200, R = 150, W2 = new THREE.Group(); W2.position.set(cx, cy, 0); W2.rotation.y = s * .9; g.add(W2);
    const wheel = new THREE.Group(); W2.add(wheel); const steel = std(0xe8ecf2, { metalness: .6, roughness: .35 });
    [-8, 8].forEach(z => { const r = add(wheel, new THREE.TorusGeometry(R, 2.5, 6, 64), steel, 1, 1, 1, 0, 0, z); });
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, sp = box(wheel, steel, 2, R, 2, Math.cos(a) * R / 2, Math.sin(a) * R / 2, 0); sp.rotation.z = a - Math.PI / 2; }
    const cols = [0xff4a4a, 0xffd23f, 0x4ad2ff, 0x7cff9b, 0xff7ae0, 0xffffff], gond = [];
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, gd = box(wheel, std(cols[i % 6], { emissive: cols[i % 6], emissiveIntensity: .7 }), 16, 14, 18, Math.cos(a) * R, Math.sin(a) * R - 10, 0); gond.push(gd); }
    for (let i = 0; i < 48; i++) { const a = i / 48 * TAU; box(wheel, basic(new THREE.Color().setHex(cols[i % 6]).multiplyScalar(2.5)), 3, 3, 3, Math.cos(a) * R, Math.sin(a) * R, 9); }
    [-1, 1].forEach(sd => { const l = box(W2, steel, 4, cy + 10, 4, sd * 60, -cy / 2, 14); l.rotation.z = sd * .3; const l2 = box(W2, steel, 4, cy + 10, 4, sd * 60, -cy / 2, -14); l2.rotation.z = sd * .3; });
    const gl = new THREE.Sprite(glowMat(0xffc0f0, .35)); gl.scale.set(420, 420, 1); gl.position.set(cx, cy, 0); g.add(gl);
    return { o: g, len, upd: (o, t) => { wheel.rotation.z = t * .25; gond.forEach(gd => { gd.rotation.z = -wheel.rotation.z; }); } }; }
  function welcome(s) { const g = new THREE.Group(), len = 260; sidewalk(g, s, len);
    const t = textTex("inglewood", 1024, 256, (x, w, h) => { x.fillStyle = "#6e3a2a"; x.fillRect(0, 0, w, h); for (let r = 0; r < 8; r++) for (let i = 0; i < 16; i++) { x.fillStyle = "rgba(0,0,0," + (.08 + rnd() * .1) + ")"; x.fillRect(i * 64 + (r % 2) * 32, r * 32, 62, 30); }
      x.fillStyle = "#f6e6b8"; x.textAlign = "center"; x.font = "800 52px Georgia,serif"; x.fillText("Welcome to", w / 2, 70); x.font = "900 112px Georgia,serif"; x.fillText("INGLEWOOD", w / 2, 170); x.font = "700 40px Georgia,serif"; x.fillText("City of Champions", w / 2, 226); });
    const m = box(g, [MAT.wall, MAT.wall, MAT.roof, MAT.wall, std(0xffffff, { map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: .95 }), MAT.wall], 300, 76, 14, s * 360, 38, 0); m.rotation.y = -s * .8;
    add(g, PLANE, MAT.grass, 260, len - 30, 1, s * 360, .3, 0).rotation.x = -Math.PI / 2;
    const crowns = [palm(g, s * 260, -80, 300), palm(g, s * 420, 70, 260)];
    const up = new THREE.Sprite(glowMat(0xffd59a, .45)); up.scale.set(260, 90, 1); up.position.set(s * 330, 20, 10); g.add(up);
    return { o: g, len, upd: (o, tt) => crowns.forEach((c, i) => { c.rotation.z = Math.sin(tt * 1.7 + i) * .12; }) }; }
  const donutTex = ctex(256, 128, (x, w, h) => { x.fillStyle = "#b8916a"; x.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { const v = rnd(); x.fillStyle = v < .5 ? "rgba(90,60,35,.35)" : "rgba(235,205,165,.35)"; x.beginPath(); x.arc(rnd() * w, rnd() * h, .6 + rnd() * 1.8, 0, TAU); x.fill(); } });
  donutTex.wrapS = donutTex.wrapT = THREE.RepeatWrapping; donutTex.repeat.set(6, 2);
  function donut(s) { const g = new THREE.Group(), len = 300; sidewalk(g, s, len);   // the giant donut on its drive-in stand (shape only, no name on it)
    const cx = s * 390; box(g, std(0xefe6d2), 110, 36, 150, cx, 18, 0); box(g, std(0x7a4a2a), 110, 10, 150, cx, 5, 0);
    box(g, std(0xe6dcc6, { roughness: .6 }), 170, 7, 200, cx, 42, 0); box(g, basic(new THREE.Color(2.4, 2, 1.4)), 172, 2, 202, cx, 38, 0);   // the overhanging flat roof with its lit edge
    for (let i = 0; i < 4; i++) box(g, basic(new THREE.Color(2.2, 1.8, 1.2)), 1, 18, 26, cx - s * 55.5, 22, -54 + i * 36);   // glowing service windows
    [-40, 40].forEach(z => box(g, MAT.pole, 4, 70, 4, cx, 80, z)); box(g, MAT.pole, 4, 4, 90, cx, 114, 0);
    const d = add(g, new THREE.TorusGeometry(1, .4, 24, 64), std(0xffffff, { map: donutTex, roughness: .85, bumpMap: donutTex, bumpScale: 2, emissive: 0x2a1a0c, emissiveIntensity: .5 }), 96, 96, 96, cx, 214, 0); d.rotation.y = Math.PI / 2 - s * .35;
    const gl = new THREE.Sprite(glowMat(0xffd2a0, .3)); gl.scale.set(340, 320, 1); gl.position.set(cx, 214, 0); g.add(gl);
    return { o: g, len }; }
  function forum(s) { const g = new THREE.Group(), len = 760; sidewalk(g, s, len);   // the round colonnade: tall white columns with red between them, washed in light
    const cx = s * 640, R = 300; add(g, new THREE.CylinderGeometry(1, 1, 1, 64, 1, true), std(0xc8202f, { roughness: .6, side: THREE.DoubleSide, emissive: 0x7a0c14, emissiveIntensity: .8 }), R - 8, 112, R - 8, cx, 56, 0);
    add(g, new THREE.CylinderGeometry(1, 1, 1, 64), std(0xf4f0ea, { emissive: 0x6a5a6a, emissiveIntensity: .6 }), R + 14, 18, R + 14, cx, 121, 0);   // white crown ring
    const col = std(0xf6f2ee, { roughness: .5, emissive: 0x5a4a5a, emissiveIntensity: .5 }); for (let i = 0; i < 48; i++) { const a = i / 48 * TAU; add(g, CYL6, col, 8, 116, 8, cx + Math.cos(a) * R, 56, Math.sin(a) * R); }
    const up = new THREE.Sprite(glowMat(0xd8b0ff, .4)); up.scale.set(900, 240, 1); up.position.set(cx, 70, 0); g.add(up);
    add(g, PLANE, std(0x23252e, { roughness: .4 }), 900, len - 20, 1, cx, .3, 0).rotation.x = -Math.PI / 2;   // its big parking lot
    return { o: g, len }; }
  function academy(s) { const g = new THREE.Group(), len = 320; sidewalk(g, s, len);   // the art-deco theatre: white building, marquee, tall round spire (no lettering)
    const cx = s * 400, wht = std(0xf3f1ec, { roughness: .6, emissive: 0x2a2a30, emissiveIntensity: .5 });
    box(g, wht, 150, 70, 220, cx, 35, 0); box(g, wht, 166, 10, 236, cx, 74, 0);
    const mq = textTex("academymarquee", 512, 96, (x, w, h) => { x.fillStyle = "#f3f1ec"; x.fillRect(0, 0, w, h); x.fillStyle = "#c8202f"; x.fillRect(0, 0, w, 14); x.fillRect(0, h - 14, w, 14); x.fillStyle = "#1a1a1e"; x.font = "800 30px Arial,sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("NOW SHOWING · STORM RUN", w / 2, h / 2); });
    const mm = [MAT.dark, MAT.dark, MAT.dark, MAT.dark, MAT.dark, MAT.dark]; mm[s < 0 ? 0 : 1] = basic(0xffffff, { map: mq }); box(g, mm, 26, 34, 180, cx - s * 88, 50, 0);
    add(g, CYL, wht, 18, 330, 18, cx + s * 30, 165, -70); add(g, CYL, wht, 26, 14, 26, cx + s * 30, 335, -70); add(g, new THREE.SphereGeometry(1, 16, 10), wht, 14, 14, 14, cx + s * 30, 352, -70);
    for (let i = 0; i < 8; i++) box(g, basic(new THREE.Color(3, .6, .5)), 4, 18, 4, cx + s * 30 - s * 18.5, 70 + i * 30, -70);   // red neon bands down the spire
    const gl = new THREE.Sprite(glowMat(0xffd0c0, .35)); gl.scale.set(200, 420, 1); gl.position.set(cx + s * 30, 200, -70); g.add(gl);
    return { o: g, len }; }
  function stadium(s) { const g = new THREE.Group(), len = 900; sidewalk(g, s, len);
    // the huge translucent canopy roof, floating low over the stadium bowl (no name on it)
    const roof = add(g, new THREE.SphereGeometry(1, 48, 16, 0, TAU, 0, .42), std(0xdfe6f0, { transparent: true, opacity: .55, roughness: .2, metalness: .3, side: THREE.DoubleSide, emissive: 0x6a7aa0, emissiveIntensity: .35 }), 900, 260, 650, s * 720, -90, 0);
    const edge = add(g, new THREE.TorusGeometry(1, .006, 6, 96), basic(new THREE.Color(2.4, 2.6, 3.2)), 900 * Math.sin(.42), 650 * Math.sin(.42), 1, s * 720, -90 + 260 * Math.cos(.42), 0); edge.rotation.x = Math.PI / 2; edge.scale.z = 1;
    box(g, std(0x2a2e38), 1200, 40, 900, s * 720, 20, 0);
    const gl = new THREE.Sprite(glowMat(0x9ab8ff, .35)); gl.scale.set(1600, 380, 1); gl.position.set(s * 720, 120, 0); g.add(gl);
    return { o: g, len }; }

  /* one landmark stop per level (index.html LVNAME), Inglewood to Long Beach; plain intersections of that city in between */
  const sbLB = s => store(s, "5801 CHERRY AVE · LONG BEACH", true);
  const LVL = [{ R: welcome, city: "ing" }, { cross: ["LA BREA AV", "CENTURY BL"], L: stadium }, { cross: ["LA BREA AV", "MANCHESTER BL"], L: forum, R: donut },
    { cross: ["LA BREA AV", "FLORENCE AV"], L: academy }, { gantry: ["710", "SOUTH", "LONG BEACH"], R: lbsign, city: "lb" }, { cross: ["SHORELINE DR", "PINE AV"], L: ferris, R: lighthouse },
    { cross: ["CHERRY AV", "HILL ST"], L: pumpjacks, R: pumpjacks }, { cross: ["CHERRY AV", "CARSON ST"], R: airport }, { R: jordan }, { cross: ["CHERRY AV", "SOUTH ST"], R: sbLB }];
  const FILL = { ing: [["LA BREA AV", "ARBOR VITAE ST"], ["LA BREA AV", "HYDE PARK BL"]], lb: [["CHERRY AV", "WARDLOW RD"], ["CHERRY AV", "DEL AMO BL"], ["CHERRY AV", "ARTESIA BL"]] };
  let city = "ing", lvShown = 0, midDone = 0, fi = 0, evtIn = 900; const SPACING = 2700;
  function fill() {
    for (let s = 0; s < 2; s++) while (front[s] > FAR) { const L = lot(s ? 1 : -1); place(L.o, front[s] - L.len / 2, L.upd); front[s] -= L.len; }
  }
  function event(E) { E = E || { cross: FILL[city][fi++ % FILL[city].length] }; if (E.city) city = E.city;
    const z = Math.min(front[0], front[1]);
    if (E.cross) { place(intersection(E), z - 85); front[0] = front[1] = z - 170; }
    if (E.gantry) { const G = gantry(E.gantry[0], E.gantry[1], E.gantry[2]); place(G.o, z - 30); }
    [E.L && E.L(-1), E.R && E.R(1)].forEach((L, s) => { if (!L) return; place(L.o, front[s] - L.len / 2, L.upd); front[s] -= L.len; STATUS.lm = L.o; });   // landmarks go right on the far corner
  }

  /* ---------- the StormBurger truck: their real step van wrap (blue lightning, orange roof cap with LED strip, big white
     STORM BURGER, orange arrow down the side, serving window on the passenger side, steel rear door, orange wheels + grille) ---------- */
  const tint = (x, sx, sy, sw, sh, dx, dy, dw, dh, col) => { if (!(LOGO.complete && LOGO.naturalWidth)) return; const k = LOGO.naturalWidth / 760, c = document.createElement("canvas"); c.width = Math.ceil(dw); c.height = Math.ceil(dh);
    const y = c.getContext("2d"); y.drawImage(LOGO, sx * k, sy * k, sw * k, sh * k, 0, 0, dw, dh); y.globalCompositeOperation = "source-in"; y.fillStyle = col; y.fillRect(0, 0, dw, dh); x.drawImage(c, dx, dy); };
  const logoText = (x, dx, dy, dw, col = "#fff") => tint(x, 222, 28, 512, 146, dx, dy, dw, dw * 146 / 512, col);      // the STORM / BURGER wordmark only
  const logoIcon = (x, dx, dy, dw, col = "#fff") => tint(x, 30, 26, 190, 150, dx, dy, dw, dw * 150 / 190, col);       // the round bolt icon only
  function lightning(x, w, h, sd) { let q = sd; const r = () => { q = (q * 16807) % 2147483647; return q / 2147483647; };
    const g = x.createLinearGradient(0, 0, w * .3, h); g.addColorStop(0, "#0a1d5a"); g.addColorStop(.5, "#1641b5"); g.addColorStop(1, "#0b2260"); x.fillStyle = g; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { const gx = r() * w, gy = r() * h, rr = 20 + r() * 90, gr = x.createRadialGradient(gx, gy, 0, gx, gy, rr); gr.addColorStop(0, r() < .5 ? "rgba(70,150,255,.35)" : "rgba(5,12,40,.45)"); gr.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = gr; x.fillRect(gx - rr, gy - rr, rr * 2, rr * 2); }
    x.lineCap = "round"; x.shadowColor = "#7fdcff";
    const bolt = (bx, by, a, len, wd, depth) => { x.lineWidth = wd; x.shadowBlur = wd * 6; x.strokeStyle = "rgba(190,238,255,.95)"; x.beginPath(); x.moveTo(bx, by);
      for (let i = 0; i < len; i++) { a += (r() - .5) * 1.1; bx += Math.cos(a) * (6 + r() * 12); by += Math.sin(a) * (6 + r() * 12); x.lineTo(bx, by); if (depth < 2 && r() < .16) { x.stroke(); bolt(bx, by, a + (r() - .5) * 2, len * .45 | 0, wd * .6, depth + 1); x.lineWidth = wd; x.shadowBlur = wd * 6; x.strokeStyle = "rgba(190,238,255,.95)"; x.beginPath(); x.moveTo(bx, by); } }
      x.stroke(); };
    for (let i = 0; i < Math.round(w * h / 26000); i++) bolt(r() * w, r() * h, r() * TAU, 14 + r() * 26 | 0, 1 + r() * 1.8, 0);
    x.shadowBlur = 0; }
  const arrow = (x, w, h, toRight) => { x.save(); if (!toRight) { x.translate(w, 0); x.scale(-1, 1); } x.fillStyle = "rgba(226,82,43,.93)";
    x.beginPath(); x.moveTo(w * .02, h * .7); x.lineTo(w * .55, h * .62); x.lineTo(w * .52, h * .54); x.lineTo(w * .97, h * .69); x.lineTo(w * .5, h * .86); x.lineTo(w * .53, h * .77); x.lineTo(w * .02, h * .82); x.closePath(); x.fill();
    x.strokeStyle = "rgba(120,30,10,.6)"; x.lineWidth = 2; for (let i = 1; i < 5; i++) { x.beginPath(); x.moveTo(w * (.1 + i * .17), h * .63); x.lineTo(w * (.1 + i * .17), h * .84); x.stroke(); } x.restore(); };
  function wrapSide(right) { const t = ctex(780, 660, (x, w, h) => { lightning(x, w, h, right ? 11 : 23); arrow(x, w, h, right);
      if (right) { x.fillStyle = "#a9afb8"; x.fillRect(w * .24, h * .2, w * .74, h * .44); x.fillStyle = "#151a24"; x.fillRect(w * .255, h * .225, w * .71, h * .39); const gi = x.createLinearGradient(0, h * .225, 0, h * .615); gi.addColorStop(0, "#f6dfae"); gi.addColorStop(1, "#b98c52"); x.fillStyle = gi; x.fillRect(w * .265, h * .235, w * .69, h * .37);
        x.fillStyle = "#c8ccd2"; for (let i = 1; i < 4; i++) x.fillRect(w * (.265 + i * .17), h * .235, 4, h * .37); x.fillStyle = "#9aa0a8"; x.fillRect(w * .265, h * .5, w * .69, h * .1);   // steel counter + window frames
        x.fillStyle = "rgba(255,255,255,.22)"; x.fillRect(w * .28, h * .25, w * .1, h * .22); x.fillStyle = "#d9dde3"; x.fillRect(w * .24, h * .64, w * .74, h * .025);
        x.fillStyle = "#fff"; x.beginPath(); x.ellipse(w * .11, h * .4, w * .065, h * .095, 0, 0, TAU); x.fill();   // their round bolt logo
        x.fillStyle = "#e2522b"; x.beginPath(); x.moveTo(w * .05, h * .42); x.lineTo(w * .12, h * .37); x.lineTo(w * .115, h * .405); x.lineTo(w * .175, h * .385); x.lineTo(w * .1, h * .445); x.lineTo(w * .105, h * .41); x.closePath(); x.fill();
        x.fillStyle = "#fff"; x.font = "800 30px Arial,sans-serif"; x.fillText("@STORMBURGER", w * .3, h * .16); x.font = "600 16px Arial,sans-serif"; x.fillText("EVENTS@STORMBURGER.COM", w * .3, h * .195); }
      else { logoText(x, w * .38, h * .08, w * .58); x.fillStyle = "#fff"; x.font = "700 26px Arial,sans-serif"; x.textAlign = "right"; x.fillText("@STORMBURGER", w * .95, h * .55); x.font = "600 18px Arial,sans-serif"; x.fillText("EVENTS@STORMBURGER.COM", w * .95, h * .59); } });
    logoTex.push(t); return t; }
  function capTex(kind) { const t = ctex(kind === "end" || kind === "front" ? 512 : 1024, 128, (x, w, h) => { x.fillStyle = "#e0532c"; x.fillRect(0, 0, w, h);
      x.globalAlpha = .1; x.fillStyle = "#7a1d0a"; x.font = "900 20px Arial,sans-serif"; for (let yy = 18; yy < h; yy += 22) for (let xx = (yy % 44 ? -40 : 0); xx < w; xx += 150) x.fillText("STORMBURGER", xx, yy); x.globalAlpha = 1;
      x.fillStyle = "#fff"; x.textBaseline = "middle"; x.textAlign = "center";
      if (kind === "front") logoText(x, w * .2, h * .12, w * .6);
      else if (kind === "end") { x.font = "700 30px Arial,sans-serif"; x.fillText("EVENTS@STORMBURGER.COM", w / 2, h / 2); }
      else { x.font = "700 34px Arial,sans-serif"; x.fillText("FRIED CHICKEN", w * .27, h * .32); x.fillText("BURGERS", w * .27, h * .7); x.fillText("SHAKES", w * .8, h * .32); x.fillText("FRIES", w * .8, h * .7);
        x.fillStyle = "#141519"; x.fillRect(w * .44, h * .12, w * .2, h * .76); x.fillStyle = "#2a2d36"; x.fillRect(w * .45, h * .18, w * .18, h * .64);
        x.fillStyle = "#f4f6f8"; [w * .08, w * .95].forEach(px => { x.fillRect(px - 16, h * .3, 32, 40); }); } });
    logoTex.push(t); return t; }
  const rearTex = ctex(420, 520, (x, w, h) => { lightning(x, w, h, 37);
    const dg = x.createLinearGradient(w * .05, 0, w * .5, 0); dg.addColorStop(0, "#8d939c"); dg.addColorStop(.5, "#c3c8cf"); dg.addColorStop(1, "#8a9099"); x.fillStyle = dg; x.fillRect(w * .05, h * .03, w * .45, h * .94);
    x.fillStyle = "rgba(60,64,72,.55)"; for (let i = 0; i < 26; i++) x.fillRect(w * .05, h * (.08 + i * .034), w * .45, 2);   // ribbed aluminium
    x.fillStyle = "#3a3f48"; x.fillRect(w * .1, h * .08, w * .35, h * .3); x.fillStyle = "#0e1420"; x.fillRect(w * .12, h * .1, w * .31, h * .26); x.fillStyle = "rgba(255,255,255,.15)"; x.fillRect(w * .14, h * .11, w * .08, h * .24);
    x.fillStyle = "#2a2e36"; x.fillRect(w * .43, h * .52, 12, 34); x.fillStyle = "#d8dce2"; x.fillRect(w * .44, h * .53, 6, 32);
    x.fillStyle = "#fff"; x.fillRect(w * .62, h * .2, w * .25, w * .25); x.fillStyle = "#111"; for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) if ((i * 7 + j * 3 + i * j) % 3 === 0 || (i < 2 && j < 2) || (i > 5 && j < 2) || (i < 2 && j > 5)) x.fillRect(w * .63 + i * w * .029, h * .205 + j * w * .029, w * .027, w * .027);
    x.fillStyle = "#fff"; x.beginPath(); x.arc(w * .745, h * .205 + w * .125, w * .035, 0, TAU); x.fill(); x.fillStyle = "#1d43b5"; x.beginPath(); x.arc(w * .745, h * .205 + w * .125, w * .024, 0, TAU); x.fill();
    x.font = "700 15px Arial,sans-serif"; x.fillStyle = "#fff"; x.textAlign = "center"; x.fillText("SCAN ME!", w * .745, h * .18); });
  logoTex.push(rearTex);
  const cabSide = ctex(256, 256, (x, w, h) => { lightning(x, w, h, 51); });
  const noseTex = ctex(256, 128, (x, w, h) => { lightning(x, w, h, 61); x.fillStyle = "#1a1a1e"; x.fillRect(w * .22, h * .25, w * .56, h * .6); x.fillStyle = "#ff6a1a"; for (let r = 0; r < 2; r++) for (let i = 0; i < 9; i++) x.fillRect(w * (.25 + i * .058), h * (.3 + r * .28), w * .05, h * .2);
    x.fillStyle = "#e9eef5"; x.fillRect(w * .02, h * .3, w * .16, h * .22); x.fillRect(w * .82, h * .3, w * .16, h * .22); });
  const TREAD = ctex(256, 64, (x, w, h) => { x.fillStyle = "#141416"; x.fillRect(0, 0, w, h); x.fillStyle = "#050506"; for (let i = 0; i < 32; i++) { x.save(); x.translate(i * 8, 0); x.transform(1, 0, .5, 1, 0, 0); x.fillRect(0, 6, 3, 22); x.fillRect(-10, 36, 3, 22); x.restore(); } x.fillRect(0, h / 2 - 2, w, 4); });
  TREAD.wrapS = THREE.RepeatWrapping; TREAD.repeat.set(2, 1);
  const TRUCKM = { wrapR: std(0xffffff, { map: wrapSide(true), roughness: .32, metalness: .15 }), wrapL: std(0xffffff, { map: img("img/truck/side-l.webp"), roughness: .32, metalness: .15 }), /* driver side = their photo */ rear: std(0xffffff, { map: rearTex, roughness: .35, metalness: .15 }),
    cab: std(0xffffff, { map: cabSide, roughness: .3, metalness: .15 }), nose: std(0xffffff, { map: noseTex, roughness: .35, metalness: .2 }),
    capR: std(0xffffff, { map: capTex("R"), roughness: .45 }), capL: std(0xffffff, { map: img("img/truck/cap-l.webp"), roughness: .45, emissive: 0xffffff, emissiveMap: img("img/truck/cap-l.webp"), emissiveIntensity: .12 }), capEnd: std(0xffffff, { map: capTex("end"), roughness: .45 }), capFront: std(0xffffff, { map: capTex("front"), roughness: .45 }), capTop: std(0xd5d9de, { roughness: .45, metalness: .5 }), capLip: std(0xe0532c, { roughness: .5 }),   // white metal roof like the real step van
    glass: new THREE.MeshPhysicalMaterial({ color: 0x0a1222, metalness: .3, roughness: .05, clearcoat: 1, envMapIntensity: 1.8 }), chrome: std(0xdfe4ea, { metalness: 1, roughness: .18 }), steel: std(0x9aa1ad, { metalness: .8, roughness: .35 }),
    tire: std(0xffffff, { map: TREAD, bumpMap: TREAD, bumpScale: 1.5, roughness: .92 }), rim: std(0xff6a1a, { metalness: .4, roughness: .35, emissive: 0x401400, emissiveIntensity: .5 }), led: basic(new THREE.Color(4, 2.4, 1.1)), flood: basic(new THREE.Color(5, 5, 4.4)),
    head: basic(new THREE.Color(5, 4.6, 3.6)), tail: basic(new THREE.Color(2.4, .15, .1)) };
  function makeTruck(parked) { const g = new THREE.Group(), M = TRUCKM, wheels = [];
    box(g, MAT.dark, 48, 10, 104, 0, 12, 0);
    const body = box(g, [M.wrapR, M.wrapL, M.capTop, MAT.dark, M.rear, M.cab], 52, 50, 78, 0, 53, 11);
    box(g, [M.cab, M.cab, MAT.dark, MAT.dark, M.steel, M.cab], 51.4, 16, 78, 0, 20, 11);   // lower skirt + rear step
    box(g, [M.cab, M.cab, M.capTop, MAT.dark, M.cab, M.cab], 50, 52, 22, 0, 40, -39);
    box(g, [M.cab, M.cab, M.cab, MAT.dark, M.cab, M.nose], 50, 22, 8, 0, 25, -54);
    const ws = box(g, M.glass, 44, 21, 1.5, 0, 53, -50.3); ws.rotation.x = -.1; [-1, 1].forEach(sd => box(g, M.glass, 1, 15, 13, sd * 25.2, 54, -40));
    box(g, M.chrome, 54, 7, 4, 0, 13, -59); box(g, M.chrome, 52, 5, 7, 0, 12, 52);
    [-1, 1].forEach(sd => { box(g, MAT.dark, 2, 2, 8, sd * 28, 56, -47); box(g, MAT.dark, 3, 10, 5, sd * 31, 54, -51); });
    box(g, [M.capR, M.capL, M.capTop, M.capTop, M.capEnd, M.capFront], 54, 14, 110, 0, 85, -3);
    [-27.4, 27.4].forEach(x => box(g, M.led, 1.2, 1.2, 110, x, 92.4, -3)); box(g, M.led, 54, 1.2, 1.2, 0, 92.4, 52.4); box(g, M.led, 54, 1.2, 1.2, 0, 92.4, -58.4);
    box(g, M.steel, 16, 8, 14, 0, 96, 18); box(g, M.steel, 20, 2, 18, 0, 101, 18);   // exhaust hood over the grill
    box(g, M.chrome, 22, 9, 26, 0, 96.5, -22); box(g, MAT.dark, 18, .6, 20, 0, 101.2, -22);   // roof A/C unit
    [-26.6, 26.6].forEach(x => box(g, M.capLip, 1.2, 2, 110, x, 92.6, -3)); [52, -58].forEach(z => box(g, M.capLip, 54, 2, 1.2, 0, 92.6, z + .3));   // orange lip around the roof
    const aw = box(g, M.steel, 14, 1.2, 40, 33, 75, 8); aw.rotation.z = -.55;   // serving window flap propped open (passenger side)
    const tails = [-22, 22].map(x => box(g, M.tail, 6, 8, 1, x, 24, 50.6));
    [[-37], [29]].forEach(([z]) => [-24, 24].forEach(x => { const w = new THREE.Group(); w.position.set(x, 10.5, z); g.add(w); add(w, CYL, M.tire, 10.5, 9, 10.5, 0, 0, 0).rotation.z = Math.PI / 2;
      add(w, CYL, M.rim, 6.8, 9.6, 6.8, 0, 0, 0).rotation.z = Math.PI / 2; add(w, CYL6, MAT.dark, 2.4, 10, 2.4, 0, 0, 0).rotation.z = Math.PI / 2; wheels.push(w); }));
    /* parts that break off one per hit, in this order (mirrors, window flap, bumpers, A/C, hood, tail light) */
    const C = g.children, parts = [C[13], C[11], aw, C[9], C[8], C[22], C[21], C[20], C[19], tails[0], C[12], C[10]];
    parts.forEach(p => p.userData.home = { p: p.position.clone(), r: p.rotation.clone() });
    return { g, wheels, body, tails, parts }; }
  const truck = makeTruck(false); scene.add(truck.g); spots.forEach(s => { truck.g.add(s); truck.g.add(s.target); });
  const SKN = 260, skid = new THREE.InstancedMesh(PLANE, new THREE.MeshBasicMaterial({ color: 0x040405, transparent: true, opacity: .62, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), SKN);
  skid.frustumCulled = false; skid.count = 0; scene.add(skid); const SK = []; let skI = 0; const SKM = new THREE.Matrix4(), SKQ = new THREE.Quaternion(), SKE = new THREE.Euler(), SKS = new THREE.Vector3(), SKP = new THREE.Vector3();
  const shadowM = new THREE.MeshBasicMaterial({ map: glowTex, color: 0x000000, transparent: true, opacity: .55, depthWrite: false });
  const tShadow = add(scene, PLANE, shadowM, 80, 130, 1, 0, .8, 0); tShadow.rotation.x = -Math.PI / 2;
  const scorch = new THREE.Color(0x3a3530);
  /* TORNADO WARNING: the lane it will come down glows red on the road */
  const twTex = ctex(64, 512, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "rgba(255,40,30,0)"); g.addColorStop(.25, "rgba(255,40,30,.9)"); g.addColorStop(1, "rgba(255,60,40,.55)"); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = "rgba(255,230,200,.9)"; for (let y = 40; y < h; y += 64) { x.beginPath(); x.moveTo(w * .2, y); x.lineTo(w * .5, y + 26); x.lineTo(w * .8, y); x.lineTo(w * .8, y + 12); x.lineTo(w * .5, y + 38); x.lineTo(w * .2, y + 12); x.fill(); } });
  const twLaneM = new THREE.MeshBasicMaterial({ map: twTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -3 });
  const twLane = add(scene, PLANE, twLaneM, 84, 1500, 1, 0, 1.2, -760); twLane.rotation.x = -Math.PI / 2; twLane.visible = false;
  /* COP COMING: the lane a cop will come up glows with red/blue arrows pointing up the road (away from you), like the tornado lane */
  const cpTex = ctex(64, 256, (x, w, h) => { for (let y = 0, i = 0; y < h; y += 64, i++) { x.fillStyle = i % 2 ? "rgba(255,60,60,.95)" : "rgba(80,150,255,.95)"; x.beginPath(); x.moveTo(w * .2, y + 40); x.lineTo(w * .5, y + 12); x.lineTo(w * .8, y + 40); x.lineTo(w * .8, y + 54); x.lineTo(w * .5, y + 26); x.lineTo(w * .2, y + 54); x.closePath(); x.fill(); } });
  cpTex.wrapT = THREE.RepeatWrapping; cpTex.repeat.set(1, 3.2);
  const cpLaneM = new THREE.MeshBasicMaterial({ map: cpTex, color: new THREE.Color(2.2, 2.2, 2.2), toneMapped: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -3 });
  const cpLane = add(scene, PLANE, cpLaneM, 86, 1000, 1, 0, 1.3, -260); cpLane.rotation.x = -Math.PI / 2; cpLane.visible = false;
  const cpGlow = add(scene, PLANE, glowPlaneMat(0x3a6bff, .5), 130, 1000, 1, 0, 1.25, -260); cpGlow.rotation.x = -Math.PI / 2; cpGlow.visible = false;

  /* police helicopter (Antidote 10-21): hangs over the road just ahead and keeps its searchlight on the truck */
  const HELI = (() => { const g = new THREE.Group(), body = new THREE.MeshPhysicalMaterial({ color: 0x15171d, metalness: .5, roughness: .32, clearcoat: 1 }), wht = std(0xf2f4f8, { roughness: .4 });
    add(g, new THREE.SphereGeometry(1, 20, 14), body, 13, 12, 26, 0, 0, 0);                                   // cabin
    add(g, new THREE.SphereGeometry(1, 16, 12), wht, 13.3, 5, 18, 0, -2, 4);                                // white belly band
    add(g, new THREE.SphereGeometry(1, 16, 12), TRUCKM.glass, 10, 8, 12, 0, 3, -13);                         // bubble windshield (front = -z)
    const boom = add(g, CYL6, body, 2.6, 48, 2.6, 0, 3, 38); boom.rotation.x = Math.PI / 2;
    box(g, body, 1.6, 14, 9, 0, 10, 60); box(g, body, 16, 1.4, 5, 0, 4, 58);                                 // fin + stabilizer
    const tr = new THREE.Group(); tr.position.set(2, 10, 61); g.add(tr); box(tr, MAT.dark, .6, 16, 2, 0, 0, 0);
    [-9, 9].forEach(x => { box(g, MAT.pole, 1.6, 1.6, 34, x, -15, 0); box(g, MAT.pole, 1.4, 6, 1.4, x, -12, -8); box(g, MAT.pole, 1.4, 6, 1.4, x, -12, 8); });
    add(g, CYL6, body, 2.5, 6, 2.5, 0, 13, 0);
    const rotor = new THREE.Group(); rotor.position.set(0, 16.5, 0); g.add(rotor); const bm = std(0x0b0c10, { roughness: .6 });
    [0, 1].forEach(i => { box(rotor, bm, 118, .7, 4, 0, 0, 0).rotation.y = i * Math.PI / 2; });
    const disc = add(rotor, new THREE.CircleGeometry(59, 40), new THREE.MeshBasicMaterial({ color: 0x9aa6b8, transparent: true, opacity: .1, depthWrite: false, side: THREE.DoubleSide }), 1, 1, 1, 0, -.2, 0); disc.rotation.x = -Math.PI / 2;
    const navR = box(g, basic(new THREE.Color(5, .2, .2)), 2.4, 2.4, 2.4, -9, -1, 2), navG = box(g, basic(new THREE.Color(.2, 5, .5)), 2.4, 2.4, 2.4, 9, -1, 2), strobe = box(g, basic(new THREE.Color(8, 8, 8)), 2, 2, 2, 0, 18, 62);
    const lamp = box(g, basic(new THREE.Color(8, 8, 7)), 5, 3, 5, 0, -11, -12);
    const lampGlow = new THREE.Sprite(glowMat(0xffffff, .9)); lampGlow.scale.set(40, 40, 1); lampGlow.position.set(0, -12, -12); g.add(lampGlow);
    const coneGeo = new THREE.ConeGeometry(1, 1, 28, 1, true); coneGeo.translate(0, -.5, 0);                // apex at the lamp, opening downward
    const cone = new THREE.Mesh(coneGeo, new THREE.MeshBasicMaterial({ color: 0xe8f0ff, transparent: true, opacity: .045, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    const pool = add(scene, PLANE, glowPlaneMat(0xf2f6ff, .5), 150, 190, 1, 0, 1.6, 0); pool.rotation.x = -Math.PI / 2;
    scene.add(g); scene.add(cone);
    const P = new THREE.Vector3(0, 600, 500), Lp = new THREE.Vector3(), D = new THREE.Vector3(), UP = new THREE.Vector3(0, -1, 0);
    return { update(dt, t, tx, run, on) {
      const away = run && !on;   // not a helicopter level: it peels off into the clouds and its light goes out
      const tgt = away ? V2.set(tx + 400, 900, -1900) : run ? V2.set(tx * .7 + Math.sin(t * .35) * 26, 232 + Math.sin(t * .9) * 6, -250 + Math.sin(t * .27) * 22) : V2.set(Math.sin(t * .2) * 120, 300, -420);
      const vx = (tgt.x - P.x); P.lerp(tgt, Math.min(1, dt * (run ? 1.4 : .5)));
      g.position.copy(P); g.rotation.set(-.14, Math.sin(t * .3) * .08, Math.max(-.3, Math.min(.3, -vx * .004)));
      rotor.rotation.y += dt * 31; tr.rotation.x += dt * 44; strobe.visible = (t * 1.3 % 1) < .08; navR.visible = navG.visible = (t * .9 % 1) < .6;
      g.updateMatrixWorld(); lamp.getWorldPosition(Lp); D.set(tx, 0, 0).sub(Lp); const len = D.length(); D.normalize();
      cone.position.copy(Lp); cone.quaternion.setFromUnitVectors(UP, D); const r = len * Math.tan(.15); cone.scale.set(r, len, r);
      const lit = !away || P.y < 500; g.visible = !away || P.y < 860; cone.visible = pool.visible = lit;
      heliSpot.position.copy(Lp); heliSpot.target.position.set(tx, 0, 0); heliSpot.intensity = lit ? (LITE ? 900 : 1500) : 0;
      pool.position.set(tx + Math.sin(t * 1.7) * 6, 1.6, Math.cos(t * 1.3) * 6); pool.material.opacity = .42 + Math.sin(t * 9) * .03; } };
  })();

  /* ---------- cops ---------- */
  /* police SUVs, black with white doors, styled per city: Long Beach (small gold POLICE + round badge) and Inglewood
     (big italic POLICE with speed stripes, INGLEWOOD above it, round seal up front). Light bar + push bar. */
  const doorTex = city => textTex("copdoor:" + city, 512, 160, (x, w, h) => { x.fillStyle = "#f4f5f7"; x.fillRect(0, 0, w, h); x.fillStyle = "#0c0d12"; x.fillRect(0, h * .9, w, h * .1);
    x.strokeStyle = "rgba(0,0,0,.25)"; x.lineWidth = 3; x.beginPath(); x.moveTo(w * .5, 0); x.lineTo(w * .5, h * .9); x.stroke();
    if (city === "ing") { x.save(); x.translate(w * .55, h * .58); x.transform(1, 0, -.22, 1, 0, 0); x.fillStyle = "#0c0d12"; x.font = "900 74px Arial Black,Arial,sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("POLICE", 0, 0);
        for (let i = 0; i < 3; i++) x.fillRect(150 + i * 16, -24, 7, 48); x.restore(); x.fillStyle = "#0c0d12"; x.font = "800 18px Arial,sans-serif"; x.textAlign = "center"; x.fillText("INGLEWOOD", w * .5, h * .26);
      x.fillStyle = "#2f7a3a"; x.beginPath(); x.arc(w * .1, h * .58, 22, 0, TAU); x.fill(); x.strokeStyle = "#d9b44a"; x.lineWidth = 4; x.stroke(); }
    else { x.fillStyle = "#b8922e"; x.font = "800 30px Arial,sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("POLICE", w * .3, h * .3); x.fillRect(w * .42, h * .28, 40, 4);
      x.fillStyle = "#2b4f8a"; x.beginPath(); x.arc(w * .32, h * .6, 24, 0, TAU); x.fill(); x.strokeStyle = "#d9b44a"; x.lineWidth = 5; x.stroke(); } });
  const COPM = { black: new THREE.MeshPhysicalMaterial({ color: 0x0c0d12, metalness: .5, roughness: .3, clearcoat: 1 }), white: std(0xf2f4f8, { roughness: .35 }), push: std(0x121318, { metalness: .6, roughness: .4 }),
    red: basic(new THREE.Color(4, .2, .2)), redOff: basic(0x3a0c0c), blue: basic(new THREE.Color(.3, .8, 5)), blueOff: basic(0x0c1a3a) };
  const copDoorM = { lb: std(0xffffff, { map: doorTex("lb"), roughness: .35, metalness: .1 }), ing: std(0xffffff, { map: doorTex("ing"), roughness: .35, metalness: .1 }) };
  /* bodies from engine3d/carmodels.js (lofted from real cross-sections), in metres with the nose at +z: SPU game units per metre */
  const CARS3 = CMOD.buildCars(THREE), SPU = 19.5, geoCache = new Map();
  function paintGeo(name, paint, door) {   // copy a car body and bake its paint (door = white front + rear doors, the cruiser look)
    const key = name + paint + (door || ""); if (geoCache.has(key)) return geoCache.get(key);
    const src = (CARS3.find(c => c.name === name) || CARS3[0]).geo, g = src.clone(), col = g.attributes.color, part = g.attributes._part, pos = g.attributes.position;
    const P = new THREE.Color(paint), Dc = new THREE.Color(door || paint);
    for (let i = 0; i < col.count; i += 3) { if (part.getX(i) !== 1) continue; const z = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3, y = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
      const c = door && z > -1.05 && z < .95 && y > .3 && y < 1.03 ? Dc : P; for (let k = 0; k < 3; k++) col.setXYZ(i + k, c.r, c.g, c.b); }
    col.needsUpdate = true; geoCache.set(key, g); return g; }
  const carBodyM = new THREE.MeshPhysicalMaterial({ vertexColors: true, metalness: .45, roughness: .3, clearcoat: 1, clearcoatRoughness: .15 });
  function carMesh(name, paint, door) { const m = new THREE.Mesh(paintGeo(name, paint, door), carBodyM); m.scale.setScalar(SPU); m.rotation.y = Math.PI; return m; }   // nose toward -z like everything on the road
  /* police cruiser: Ford Police Interceptor Utility look (his LB + Inglewood photos): black body, white doors with the city's POLICE decal,
     push bar, low light bar, spot lamp, steel wheels */
  function makeCop(city) { const g = new THREE.Group(), M = COPM, D = copDoorM[city] || copDoorM.lb;
    g.add(carMesh("suv", 0x0b0c10, 0xf2f4f8));
    [-1, 1].forEach(sd => { const d = add(g, PLANE, D, 37, 11, 1, sd * 19.4, 14.5, 1); d.rotation.y = sd * Math.PI / 2; });   // POLICE door decals both sides
    box(g, M.push, 40, 3, 3, 0, 20, -51); box(g, M.push, 34, 3, 3, 0, 12, -51); [-12, 12].forEach(x => box(g, M.push, 3, 16, 3, x, 15, -51)); box(g, M.push, 26, 2, 6, 0, 8, -49);   // push bar
    box(g, M.black, 30, 2.2, 7, 0, 35, -2); const r = box(g, M.red, 13, 3, 6.5, -7.5, 37, -2), b = box(g, M.blue, 13, 3, 6.5, 7.5, 37, -2);   // light bar on the roof
    box(g, M.push, 2, 3, 3, -18, 27, -14);   // A-pillar spot lamp
    [-13, 13].forEach(x => box(g, TRUCKM.head, 8, 2.6, 1, x, 17.5, -48)); [-15, 15].forEach(x => box(g, TRUCKM.tail, 5, 8, 1, x, 19, 48));
    const glow = new THREE.Sprite(glowMat(0xff3030, .9)); glow.scale.set(100, 64, 1); glow.position.set(0, 40, -2); g.add(glow);
    return { g, r, b, glow }; }
  const CARC = [0xe9e9ee, 0x1d1d22, 0x8a9099, 0x7a1f1f, 0x2b4b8a, 0xc9ccd2, 0x3a3a40, 0xb8b0a0, 0x1f3a2a], carMats = CARC.map(c => new THREE.MeshPhysicalMaterial({ color: c, metalness: .5, roughness: .32, clearcoat: 1 }));
  const brake = basic(new THREE.Color(4.5, .25, .15));
  const CAR_NAMES = ["suv", "ev-sedan", "pickup", "ev-suv", "suv", "ev-sedan"];
  function makeCar(i) { const g = new THREE.Group(); g.add(carMesh(CAR_NAMES[i % CAR_NAMES.length], CARC[(i * 4 + 1) % CARC.length]));
    [-15, 15].forEach(x => box(g, brake, 7, 3, 1, x, 18, 46.5));
    const bg = add(g, PLANE, glowPlaneMat(0xff2a1a, .35), 60, 70, 1, 0, .8, 70); bg.rotation.x = -Math.PI / 2;
    return g; }
  const STORES = { lb: ["5801 CHERRY AVE · LONG BEACH"], ing: ["1500 N LA BREA AVE · INGLEWOOD"] };
  const storeFor = q => q ? STORES.lb[0] : STORES.ing[0];

  /* ---------- pickups, hazards ---------- */
  const SPRT = {}; S.FOOD.map(f => f.k).concat(["cow", "stop", "smoke"]).forEach(k => SPRT[k] = img("img/game/" + k + ".webp"));
  // StormBurger's menu, the cow, the stop sign and the drizzle coin as real 3D models (food3d.js); built + compiled up front so nothing hitches mid-run
  const PROPS = (await import("./food3d.js?v=f3")).makeProps(THREE, { aniso: ANISO });
  try { const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js"), gl = await new GLTFLoader().loadAsync("img/3d/cow.glb");   /* photoreal cow mesh (Higgsfield, 10-21); the drawn cow stays as fallback */
    gl.scene.traverse(m => { if (m.isMesh) { m.geometry.computeVertexNormals(); m.material.roughness = .85; if (m.material.map) m.material.map.anisotropy = ANISO; } }); PROPS.setModel("cow", gl.scene); } catch (e) { console.warn("cow.glb", e); }
  { const warm = new THREE.Group(); PROPS.kinds.forEach((k, i) => { const o = PROPS.fit(k, 50); o.position.set((i - 5) * 30, 20, -200); warm.add(o); }); const dz0 = PROPS.driz(40); dz0.position.set(0, 30, -220); warm.add(dz0);
    scene.add(warm); renderer.compile(scene, cam); scene.remove(warm); }
  const FOODM = {}; S.FOOD.forEach(f => FOODM[f.k] = new THREE.SpriteMaterial({ map: SPRT[f.k], transparent: true, depthWrite: false }));
  const coinFace = ctex(128, 128, (x, w, h) => { const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, "#fff3b0"); g.addColorStop(.5, "#ffcf3a"); g.addColorStop(1, "#c98a0c"); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.strokeStyle = "#8a5a06"; x.lineWidth = 7; x.beginPath(); x.arc(64, 64, 48, 0, TAU); x.stroke(); x.fillStyle = "#a8650a"; x.beginPath(); x.moveTo(72, 26); x.lineTo(44, 70); x.lineTo(62, 70); x.lineTo(52, 104); x.lineTo(84, 58); x.lineTo(66, 58); x.closePath(); x.fill(); });
  const coinGeo = new THREE.CylinderGeometry(15, 15, 5, 28); coinGeo.rotateX(Math.PI / 2);
  const coinMats = [std(0xffc93a, { metalness: 1, roughness: .25, emissive: 0x6a4200, emissiveIntensity: .6 }), std(0xffffff, { map: coinFace, metalness: .8, roughness: .3, emissive: 0x7a5200, emissiveIntensity: .5, emissiveMap: coinFace }), null]; coinMats[2] = coinMats[1];
  const goldGlow = glowMat(0xffd23f, .55);
  const coverTex = img("img/review/cover.webp");
  const boltTex = ctex(128, 128, (x) => { x.font = "96px system-ui,Apple Color Emoji,sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("⚡", 64, 70); });
  const smokeMats = [0, 1, 2].map(i => new THREE.SpriteMaterial({ map: SPRT.smoke, color: new THREE.Color().setRGB(.42 + i * .1, .45 + i * .1, .55 + i * .1), transparent: true, opacity: .62 - i * .1, depthWrite: false }));
  const dirtM = std(0x2a2118);
  function makeTwister(k = 1) { const g = new THREE.Group(), parts = [], bits = [];
    for (let i = 0; i < 12; i++) for (let j = 0; j < 2; j++) { const m = new THREE.Sprite(smokeMats[Math.min(2, i >> 2)]); g.add(m); parts.push({ m, i, a: j * Math.PI + i * .7, r: (8 + i * i * .55) * k, y: i * 20 * k, s: (30 + i * 8) * k }); }
    for (let i = 0; i < 4; i++) { const m = new THREE.Sprite(smokeMats[0]); g.add(m); parts.push({ m, i: -1, a: i * 1.6, r: 26 * k, y: 6 * k, s: 70 * k }); }
    for (let i = 0; i < 12; i++) { const m = box(g, dirtM, 3 * k, 3 * k, 3 * k, 0, 0, 0); bits.push({ m, a: i * .53, y: (i * 19) * k, r: (14 + (i % 3) * 14) * k }); }
    const upd = (t, sway) => { for (const p of parts) { const a = p.a + t * (p.i < 0 ? 1.4 : 5 - p.i * .2), wob = p.i < 0 ? 0 : Math.sin(t * 2.2 + p.i * .6) * (3 + p.i * 1.4) * k * sway;
        p.m.position.set(Math.cos(a) * p.r + wob, p.y + 10 * k, Math.sin(a) * p.r * .6); p.m.scale.set(p.s, p.i < 0 ? p.s * .45 : p.s * .7, 1); }
      for (const b of bits) { const a = b.a + t * 6; b.m.position.set(Math.cos(a) * b.r, (b.y + t * 90 * k) % (240 * k), Math.sin(a) * b.r * .6); b.m.rotation.set(t * 3, t * 2, 0); } };
    return { g, upd }; }
  function makeBolt(x, z) { const pts = []; let px = x, y = 950; while (y > 0) { pts.push([px, y]); y -= 50 + Math.random() * 70; px += (Math.random() - .5) * 70; } pts.push([x + (Math.random() - .5) * 20, 0]);
    const rib = (w) => { const pos = []; for (let i = 0; i < pts.length - 1; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1]; pos.push(ax - w, ay, z, ax + w, ay, z, bx + w, by, z, ax - w, ay, z, bx + w, by, z, bx - w, by, z); }
      const gm = new THREE.BufferGeometry(); gm.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); return gm; };
    const g = new THREE.Group(); g.add(new THREE.Mesh(rib(4.5), basic(new THREE.Color(9, 9.5, 12), { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide })));
    g.add(new THREE.Mesh(rib(24), basic(0x7fb6ff, { transparent: true, opacity: .45, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide })));
    const pool = add(g, PLANE, glowPlaneMat(0xbfe0ff, .9), 260, 260, 1, x, 1.5, z); pool.rotation.x = -Math.PI / 2;
    return g; }
  const TARGET_RING = new THREE.RingGeometry(52, 60, 48);

  /* ---------- FX ---------- */
  const fx = PM.makeGPUFX(THREE, scene, { max: Math.max(600, cfg.particles) });
  const wx3 = WXM.makeWeather(THREE, { scene, state: "storm", quality: { rain: cfg.rain }, box: new THREE.Vector3(900, 520, 1300) });
  scene.traverse(o => { if (o.isLineSegments || (o.material && o.material.blending === THREE.AdditiveBlending && o.geometry && o.geometry.type === "PlaneGeometry" && !o.parent.isGroup)) o.material.fog = false; });   // far bolts must not vanish in the storm fog
  const V = new THREE.Vector3(), V2 = new THREE.Vector3();

  /* ---------- Jordan High kids (pit crew): simple figures in Panthers royal blue ---------- */
  const PITZ = 170;   // the bay sits this far toward the camera from the pit item, so it's beside the truck when you pull in
  const KIDS = [[0x6b4423, 0x1f46b8], [0x8d5524, 0xffffff], [0x3d2314, 0x1f46b8], [0xc68642, 0x121318], [0x5a3a22, 0x1f46b8], [0xe0ac69, 0xffffff]];
  const pants = std(0x16181f), wrenchM = std(0xb9bec8, { metalness: .9, roughness: .3 });
  function makeKid([skin, shirt]) { const g = new THREE.Group(), sm = std(skin), shm = std(shirt);
    add(g, CYL6, pants, 3.2, 16, 3.2, -2.6, 8, 0); add(g, CYL6, pants, 3.2, 16, 3.2, 2.6, 8, 0);
    const torso = add(g, CYL6, shm, 6.5, 17, 4.5, 0, 24.5, 0);
    const head = add(g, new THREE.SphereGeometry(1, 12, 10), sm, 5.4, 6, 5.4, 0, 38, 0);
    const armL = new THREE.Group(), armR = new THREE.Group(); armL.position.set(-7.5, 31, 0); armR.position.set(7.5, 31, 0); g.add(armL, armR);
    add(armL, CYL6, shm, 2, 15, 2, 0, -7, 0); add(armR, CYL6, shm, 2, 15, 2, 0, -7, 0); box(armR, wrenchM, 2, 9, 1.4, 0, -16, 0);
    return { g, armL, armR, ph: Math.random() * 6 }; }

  /* ---------- Antidote's review on roadside LED billboards (like Melody): one rolls by every ~60 s of driving, alternating
     right / left, each playing the next clip of his StormBurger review (the CLAMP, the drizzle, everybody on that bus…).
     A second review is a second entry in window.SB_REVIEWS ({dir, clips}); the boards take turns between them. ---------- */
  const REVIEWS = window.SB_REVIEWS || [{ dir: "img/review/clips/", clips: ["c14", "c13", "c16", "c12", "c15", "c10", "c11"] }];
  let BBM = null, bbT = 25, bbSide = 1, bbN = 0; const bbC = REVIEWS.map(() => 0);
  function spawnBoard() { const r = bbN++ % REVIEWS.length, R = REVIEWS[r], src = R.dir + R.clips[bbC[r]++ % R.clips.length];
    if (!BBM) BBM = BBMOD.makeVideoBoards(THREE, { src: src + ".mp4", poster: src + ".jpg" }); else { BBM.video.src = src + ".mp4"; const pl = BBM.video.play(); if (pl && pl.catch) pl.catch(() => {}); }
    const b = BBM.create({ w: 140, pole: 110, caption: "ANTIDOTE FOOD REVIEW · STORMBURGER" }), g = new THREE.Group(); b.position.x = bbSide * 262; b.rotation.y = -bbSide * .42; g.add(b);
    place(g, front[bbSide > 0 ? 1 : 0] + 40); bbSide = -bbSide; }
  
  /* ---------- per-object views ---------- */
  const views = new Map(); let frameNo = 0; const ghosts = [];
  function viewFor(o, kind) { let v = views.get(o); if (v) return v; v = { kind, n: 0 };
    if (kind === "coin") { v.o = new THREE.Group(); v.m = new THREE.Mesh(coinGeo, coinMats); v.o.add(v.m); const gl = new THREE.Sprite(goldGlow); gl.scale.set(70, 70, 1); v.o.add(gl); }
    else if (kind === "food") { v.o = new THREE.Group(); const f = o.f; v.m = PROPS.fit(f.k, f.w * 1.1); if (!v.m) { const im = SPRT[f.k].image, ar = im && im.width ? im.height / im.width : 1; v.m = new THREE.Sprite(FOODM[f.k]); v.m.scale.set(f.w * 1.3, f.w * 1.3 * ar, 1); }
      v.o.add(v.m); const gl = new THREE.Sprite(goldGlow); gl.scale.set(f.w * 1.8, f.w * 1.8, 1); gl.position.y = f.w * .3; gl.renderOrder = -1; v.o.add(gl); }
    else if (kind === "debris") { v.o = new THREE.Group(); v.m = new THREE.Group(); const P3 = PROPS.fit(o.d.k, o.d.k === "cow" ? o.d.w * 1.05 : o.d.w * .62); P3.position.y = o.d.k === "cow" ? -22 : -40; v.m.add(P3); v.o.add(v.m);   // pivot at the middle so it tumbles
      v.sh = add(v.o, PLANE, shadowM, o.d.w * 1.1, o.d.w * .6, 1, 0, .9, 0); v.sh.rotation.x = -Math.PI / 2; }
    else if (kind === "twister") { const T = makeTwister(1); v.o = T.g; v.upd = T.upd; }
    else if (kind === "egg") { v.o = new THREE.Group(); [-80, 80].forEach(x => add(v.o, CYL6, MAT.pole, 3, 150, 3, x, 75, 0)); box(v.o, MAT.dark, 176, 104, 4, 0, 160, -2);
      add(v.o, PLANE, basic(0xffffff, { map: coverTex }), 168, 96, 1, 0, 160, .5); const gl = new THREE.Sprite(glowMat(0xffd23f, .35)); gl.scale.set(300, 190, 1); gl.position.set(0, 160, -4); v.o.add(gl);
      v.m = new THREE.Mesh(coinGeo, [coinMats[0], std(0xe3262f, { emissive: 0xe3262f, emissiveIntensity: .8 }), coinMats[0]]); v.m.scale.setScalar(1.3); v.m.position.y = 24; v.o.add(v.m); }
    else if (kind === "cop") { const C = makeCop(city); v.o = C.g; v.C = C; }
    else if (kind === "block") { v.o = new THREE.Group(); v.cars = [];   // police roadblock: SUVs parked sideways across every lane but one
      LANEX.forEach((lx, l) => { if (l === o.gap) return; const C = makeCop(city); C.g.position.set(lx, 0, 0); C.g.rotation.y = Math.PI / 2 + (l % 2 ? .14 : -.1); v.o.add(C.g); v.cars.push(C); });
      [-46, 46].forEach(d => { const c = add(v.o, new THREE.ConeGeometry(1, 1, 10), std(0xff7a1a, { emissive: 0xff5a00, emissiveIntensity: .6 }), 7, 20, 7, LANEX[o.gap] + d, 10, 0); });
      const og = add(v.o, PLANE, glowPlaneMat(0x7cff9b, .55), 70, 260, 1, LANEX[o.gap], 1.4, 60); og.rotation.x = -Math.PI / 2; }   // the open lane glows green
    else if (kind === "spike") { v.o = new THREE.Group();   // spike strip: a dark strip with steel spikes, yellow end caps
      box(v.o, std(0x23262c, { roughness: .6 }), 92, 2.4, 9, 0, 1.4, 0); [-48, 48].forEach(x => box(v.o, std(0xffd23f, { emissive: 0x5a4a00 }), 8, 4, 11, x, 2, 0));
      const sm = std(0xd9dde3, { metalness: .9, roughness: .25 }), cg = new THREE.ConeGeometry(1, 1, 5); for (let i = 0; i < 15; i++) [-2.5, 2.5].forEach(z => add(v.o, cg, sm, 1.6, 6, 1.6, -42 + i * 6, 5.5, z));
      const sg = add(v.o, PLANE, glowPlaneMat(0xffd23f, .25), 120, 40, 1, 0, 1.2, 0); sg.rotation.x = -Math.PI / 2; }
    else if (kind === "driz") { v.o = new THREE.Group(); v.m = PROPS.driz(50); v.o.add(v.m); const gl = new THREE.Sprite(goldGlow); gl.scale.set(120, 120, 1); v.o.add(gl); }
    else if (kind === "queue") { v.o = new THREE.Group(); v.cars = []; for (let i = 0; i < o.n; i++) { const c = makeCar(i + o.q * 4); v.o.add(c); v.cars.push(c); }   // the drive-thru line, with its StormBurger at the front
      const st2 = store(1, storeFor(o.q), false); v.st = st2.o; v.o.add(v.st); }
    else if (kind === "pit") { v.o = new THREE.Group(); const J = jordan(1, false); J.o.position.z = -260; v.o.add(J.o);   // Jordan High School behind its pit bay (the bay lines up with the truck when you pull in)
      const bay = add(v.o, PLANE, std(0x1f46b8, { roughness: .5 }), 130, 220, 1, 250, 6.6, PITZ); bay.rotation.x = -Math.PI / 2;
      const bt = textTex("pitbay", 256, 512, (x, w, h) => { x.fillStyle = "#1f46b8"; x.fillRect(0, 0, w, h); x.strokeStyle = "#fff"; x.lineWidth = 10; x.strokeRect(8, 8, w - 16, h - 16); x.fillStyle = "#fff"; x.font = "900 62px Arial Black,Arial,sans-serif"; x.textAlign = "center"; x.save(); x.translate(w / 2, h / 2); x.rotate(-Math.PI / 2); x.fillText("PIT STOP", 0, 22); x.restore(); });
      bay.material.map = bt; bay.material.color.setHex(0xffffff);
      for (let i = 0; i < 4; i++) [190, 312].forEach(x => { const c = add(v.o, new THREE.ConeGeometry(1, 1, 10), std(0xff7a1a, { emissive: 0x5a2000 }), 6, 16, 6, x, 14, PITZ - 90 + i * 60); });
      [188, 314].forEach(x => add(v.o, CYL6, MAT.pole, 3, 150, 3, x, 75, PITZ - 110));
      const ar = textTex("pitarch", 1024, 160, (x, w, h) => { x.fillStyle = "#121318"; x.fillRect(0, 0, w, h); x.fillStyle = "#1f46b8"; x.fillRect(6, 6, w - 12, h - 12); x.fillStyle = "#fff"; x.font = "900 70px Arial Black,Arial,sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("🔧 PIT STOP · JORDAN HIGH", w / 2, h / 2 + 4); });
      add(v.o, PLANE, basic(0xffffff, { map: ar, side: THREE.DoubleSide }), 140, 22, 1, 251, 146, PITZ - 110);
      const gl = new THREE.Sprite(glowMat(0x6a9cff, .45)); gl.scale.set(260, 120, 1); gl.position.set(251, 140, PITZ - 110); v.o.add(gl);
      v.kids = KIDS.map((K, i) => { const k = makeKid(K); k.home = new THREE.Vector3(205 + (i % 3) * 45, 0, PITZ - 60 + (i >> 1) * 40); k.g.position.copy(k.home); v.o.add(k.g); return k; }); }
    else if (kind === "bolt") { v.o = new THREE.Group();   // like Melody: a target lights up on the road where the truck is, then the bolt comes down from the sky right onto it
      v.strip = new THREE.Mesh(TARGET_RING, new THREE.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); v.strip.rotation.x = -Math.PI / 2; v.strip.position.set(0, 1.6, -10); v.o.add(v.strip);
      v.disc = new THREE.Mesh(PLANE, glowPlaneMat(0x9fd4ff, .5)); v.disc.rotation.x = -Math.PI / 2; v.disc.position.set(0, 1.4, -10); v.disc.scale.set(150, 150, 1); v.o.add(v.disc);
      v.beam = new THREE.Mesh(new THREE.CylinderGeometry(40, 55, 900, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0x9fd4ff, transparent: true, opacity: .08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })); v.beam.position.set(0, 450, -10); v.o.add(v.beam);
      v.ic = new THREE.Sprite(new THREE.SpriteMaterial({ map: boltTex, transparent: true, depthWrite: false })); v.ic.scale.set(56, 56, 1); v.ic.position.set(0, 150, -10); v.o.add(v.ic); }
    scene.add(v.o); views.set(o, v); return v; }
  function drop(o, v) { scene.remove(v.o); views.delete(o); if (v.mat) v.mat.dispose(); if (v.ic) v.ic.material.dispose(); if (v.bolt) v.bolt.traverse(m => { if (m.geometry && m.geometry !== PLANE) m.geometry.dispose(); }); }


  /* ---------- rain on the screen (Antidote 2026-10-21): drops land on the "lens", grow, the big ones run down and leave
     a trail, and the picture bends through each drop. The scene renders into a texture, then one full-screen pass
     refracts it through a height map of the drops (a small canvas, updated ~30x a second). ?lens=0 turns it off. ---------- */
  const LENS = (() => { if (Q.get("lens") === "0") return null;
    const DW = LITE ? 160 : 256, DH = Math.round(DW * H / W), u = DW / 256;
    const dc = document.createElement("canvas"); dc.width = DW; dc.height = DH; const dx = dc.getContext("2d"); dx.fillStyle = "#000"; dx.fillRect(0, 0, DW, DH);
    const dtex = new THREE.CanvasTexture(dc); dtex.minFilter = dtex.magFilter = THREE.LinearFilter; dtex.generateMipmaps = false;
    const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: LITE ? 0 : 4 });
    const mat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false,
      uniforms: { tScene: { value: rt.texture }, tDrops: { value: dtex }, px: { value: new THREE.Vector2(1 / DW, 1 / DH) }, glint: { value: 0 } },
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }",
      fragmentShader: `uniform sampler2D tScene, tDrops; uniform vec2 px; uniform float glint; varying vec2 vUv;
        void main(){ float h = texture2D(tDrops, vUv).r;
          vec2 g = vec2(texture2D(tDrops, vUv + vec2(px.x, 0.)).r - texture2D(tDrops, vUv - vec2(px.x, 0.)).r, texture2D(tDrops, vUv + vec2(0., px.y)).r - texture2D(tDrops, vUv - vec2(0., px.y)).r);
          vec2 off = -g * .07 - (vUv - .5) * h * .06;                      // a drop is a little lens: it bends + flips what's behind it
          vec3 c = texture2D(tScene, vUv + off).rgb;
          c *= 1. - smoothstep(.08, .5, length(g)) * .18;                   // dark rim
          c += vec3(.8, .88, 1.) * pow(max(0., dot(normalize(vec3(g * 5., 1.)), normalize(vec3(-.4, .55, .73)))), 28.) * h * (.35 + glint * 1.6);   // glint, brighter in a lightning flash
          gl_FragColor = vec4(c, 1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }` });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); quad.frustumCulled = false; const ls = new THREE.Scene(); ls.add(quad);
    const drops = [], bs = new THREE.Vector2(); let acc = 0;
    function dot(x, y, r, a, sy = 1) { const g = dx.createRadialGradient(x, y - r * .25, 0, x, y, r); g.addColorStop(0, "rgba(255,255,255," + a + ")"); g.addColorStop(.55, "rgba(190,190,190," + a * .85 + ")"); g.addColorStop(1, "rgba(0,0,0,0)");
      dx.fillStyle = g; dx.beginPath(); dx.ellipse(x, y, r, r * sy, 0, 0, TAU); dx.fill(); }
    function step(dt, rain) { acc += dt; if (acc < 1 / 30) return; const d = acc; acc = 0;
      dx.fillStyle = "rgba(0,0,0," + Math.min(1, d * 1.6) + ")"; dx.fillRect(0, 0, DW, DH);   // trails dry up
      const n = rain * d * 16; for (let i = 0; i < n || (i < 1 && Math.random() < n); i++) if (drops.length < (LITE ? 34 : 52)) drops.push({ x: Math.random() * DW, y: Math.random() * DH, r: (1.2 + Math.pow(Math.random(), 2.2) * 5.5) * u, v: 0, life: 4 + Math.random() * 6 });
      for (let i = drops.length - 1; i >= 0; i--) { const p = drops[i]; p.life -= d; p.r += d * .25 * u * rain;   // drops collect more rain, then run
        if (p.r > 4.2 * u) { p.v = Math.min(110 * u, p.v + 220 * u * d); const y0 = p.y; p.y += p.v * d; p.x += (Math.random() - .5) * 1.4 * u; if (Math.random() < .22) dot(p.x, (y0 + p.y) / 2, p.r * .24, .45); p.r -= d * .7 * u; }
        if (p.y - p.r > DH || p.life <= 0 || p.r < .8 * u) { drops.splice(i, 1); continue; }
        dot(p.x, p.y, p.r, 1, p.v > 0 ? 1.25 : 1); }
      dtex.needsUpdate = true; }
    return { render(dt, fl) { renderer.getDrawingBufferSize(bs); if (rt.width !== bs.x || rt.height !== bs.y) rt.setSize(bs.x, bs.y);
      renderer.setRenderTarget(rt); renderer.render(scene, cam); renderer.setRenderTarget(null); step(dt, 1); mat.uniforms.glint.value = fl; renderer.render(ls, cam); } };
  })();

  /* ---------- frame ---------- */
  let brokeN = 0; const flying = []; let warp = 0, last = 0, t = 0, odo = 0, wasRun = false, frames = 0, fpsT = 0, odd = 0, camX = 0, camShake = 0, flashK = 0, failed = false;
  const off2d = () => { S.r3 = false; S.render = null; cv.remove(); game.style.background = ""; STATUS.on = false; };
  STATUS.enable = on => { if (!on) { S.r3 = false; cv.style.visibility = "hidden"; game.style.background = ""; STATUS.on = false; } else if (!failed) { S.r3 = true; cv.style.visibility = "visible"; game.style.background = "transparent"; STATUS.on = true; } };
  const proj = (x, y) => { V.set(wx(x), 50, wz(y)).project(cam); return [(V.x + 1) / 2 * W, (1 - V.y) / 2 * H]; };
  // prime the street so the first frame already has blocks on both sides
  fill();

  S.render = function (now, dtMs) {
    if (!visible || document.hidden) return;
    if (q.lock30 && (odd ^= 1)) return;
    const st = S.get(), dt = Math.min(.05, dtMs / 1000), k = dt * 60;
    t += dt; frames++; fpsT += dt;
    if (fpsT >= 1) { STATUS.fps = Math.round(frames / fpsT); const r = q.sample(STATUS.fps); frames = 0; fpsT = 0; if (r === "fail" && !st.running) { failed = true; STATUS.reason = "low fps → 2D"; off2d(); return; } }
    const run = st.running && !st.dying;
    if (st.running && !wasRun) { lvShown = 0; city = "ing"; }
    if (st.running && st.lvl && st.lvl !== lvShown) { lvShown = st.lvl; midDone = 0; event(LVL[Math.min(LVL.length, st.lvl) - 1]); evtIn = SPACING; }
    if (st.running && st.lvl < 10 && midDone === 0 && st.t < 44000) { midDone = 1; event({ R: s2 => store(s2, st.lvl >= 5 ? "5801 CHERRY AVE · LONG BEACH" : "1500 N LA BREA AVE · INGLEWOOD", true) }); evtIn = SPACING; }   // StormBurger with its drive-thru line, every level
    if (st.running && st.lvl % 3 && midDone === 1 && st.t < 22000) { midDone = 2; event({ R: jordan }); evtIn = SPACING; }   // Jordan High every level (levels 3/6/9 show it at the pit stop)   // each new level puts its landmark on the road ahead right away
    wasRun = st.running;
    // ground speed: the stretched 2D speed, so pickups sit still on the road; a slow cruise under the menu
    const pitting = st.pitT > 0, pp = pitting ? (st.pitT > 3000 ? .5 : 1 - st.pitT / 2600) : 0;   // > 3000 = parked in the Jordan kitchen stop
    const dz = (pitting ? 0 : run ? st.speed * KF : st.dying ? Math.max(0, st.speed * KF * (1 - (now - st.dying) / 900)) : 2.5) * k;
    const dzw = dz + warp; warp = 0; odo += dzw; roadTex.offset.y += dzw / RT; roadRough.offset.y = roadTex.offset.y;
    for (let i = live.length - 1; i >= 0; i--) { const L = live[i]; L.o.position.z += dzw; if (L.upd && L.o.position.z > -1900) L.upd(L.o, t, dt); if (L.o.position.z > 900) { world.remove(L.o); live.splice(i, 1); } }
    if (run && !pitting) { bbT -= dt; if (bbT <= 0) { spawnBoard(); bbT = 60; } } if (BBM) BBM.update(t);
    front[0] += dzw; front[1] += dzw; evtIn -= dz; if (evtIn <= 0) { event(); evtIn = SPACING; } fill();

    /* truck */
    const T = truck.g; let tx = wx(st.x), ty = 0, yaw = -st.rot * .9 - (st.spinA || 0), roll = st.rot * .12, sc = 1;
    if (!st.running && !st.over) { tx = Math.sin(t * .6) * 60; yaw = -Math.cos(t * .6) * .12; }
    if (st.dying) { const d2 = (now - st.dying) / 1000, txx = st.dx + (1 - Math.min(1, d2 / .7)) * (st.dx < W / 2 ? W * .7 : -W * .7), lift = d2 < .7 ? 0 : Math.pow((d2 - .7) / 1.5, 1.6);
      tx = wx(st.dx + (d2 < .7 ? Math.sin(d2 * 9) * 18 : Math.sin(d2 * 5) * 30 * (1 - lift))); ty = lift * 700; yaw = st.spin; roll = Math.sin(d2 * 7) * .3 * Math.min(1, lift * 3); sc = Math.max(.4, 1 - lift * .5);
      if (!st._tw && d2 > .15) { st._tw = makeTwister(2.8); scene.add(st._tw.g); st._twS = 0; }
      if (st._tw) { st._twS = Math.min(1, st._twS + dt * 2.2); st._tw.g.position.set(wx(st.dx * .6 + txx * .4) * 1, 0, -20); st._tw.g.scale.setScalar(st._twS); st._tw.upd(t, 1.4); } }
    else if (st._tw) { scene.remove(st._tw.g); st._tw = null; }
    if (pitting) { const e = u => u * u * (3 - 2 * u), o = e(Math.min(1, pp / .22)) * e(Math.min(1, (1 - pp) / .18)); tx += 112 * o; yaw = -Math.sin(pp * Math.PI * 4.5) * .18 * o * (pp < .22 || pp > .82 ? 1 : 0);
      if (Math.random() < .35) fx.sparks(V.set(tx + (Math.random() < .5 ? -27 : 27), 14 + Math.random() * 20, (Math.random() - .5) * 70), V2.set(0, 1, 0), null, .8, 6); }
    T.position.set(tx, ty, 0); T.rotation.set(0, yaw, roll); T.scale.setScalar(sc);
    T.visible = !(st.over && st.lives <= 0) && (st.inv <= 0 || st.inv > 1e8 || Math.floor(st.inv / 6) % 2 === 0);
    truck.wheels.forEach(w => { w.rotation.x -= dz / 9.5; });
    for (const m of SK) m.z += dz;
    if (run && T.visible && ty < 5 && Math.abs(st.rot) > .06) { const c = Math.cos(yaw), sn = Math.sin(yaw);
      for (const lx of [-24, 24]) { const px = tx + c * lx + sn * 29, pz = -sn * lx + c * 29; const m = SK[skI] || (SK[skI] = {}); Object.assign(m, { x: px, z: pz, y: yaw, l: dz + 5 }); skI = (skI + 1) % SKN;
        if (Math.random() < .5) fx.emit(V.set(px, 4, pz), V2.set((Math.random() - .5) * 30, 20 + Math.random() * 20, st.speed * KF * 18), .9, 8, 50, [.86, .87, .9], [.6, .62, .66], .4, false, 0, 1.6, 10); } }   // + white tire smoke
    skid.count = SK.length; SK.forEach((m, i) => { SKE.set(-Math.PI / 2, 0, m.y); SKQ.setFromEuler(SKE); SKS.set(7, m.l, 1); SKP.set(m.x, .9, m.z); SKM.compose(SKP, SKQ, SKS); skid.setMatrixAt(i, SKM); }); skid.instanceMatrix.needsUpdate = true;
    twLane.visible = run && !st.dying && !pitting && st.twT < 3200; if (twLane.visible) { twLane.position.x = wx(S.LX(st.twLane)); twLaneM.opacity = .55 + .45 * Math.sin(t * 14); }
    const wc = run && !pitting ? st.cops.find(c => c.warn > 0 || c.y > PY + 30) : null; cpLane.visible = cpGlow.visible = !!wc;
    if (wc) { cpLane.position.x = cpGlow.position.x = LANEX[wc.lane]; cpTex.offset.y -= dt * 1.6; cpLaneM.opacity = .6 + .4 * Math.sin(t * 16); cpGlow.material.color.setHex(Math.floor(now / 110) % 2 ? 0xff3030 : 0x3a6bff); }
    HELI.update(dt, t, tx, st.running, !window.SB_HELI || SB_HELI(st.lvl));
    tShadow.position.set(tx, .8, 0); tShadow.visible = T.visible && ty < 40;
    const heat = Math.max(0, Math.min(1, 1 - st.lives / (window.SB_LIVES ? SB_LIVES.max() : 5)));   /* fire grows slowly with every hit */
    const scorchK = Math.min(1, heat * 1.2); [TRUCKM.wrapR, TRUCKM.wrapL, TRUCKM.rear, TRUCKM.cab].forEach(m => m.color.setHex(0xffffff).lerp(scorch, scorchK * .6));
    // spray off the wet road behind the rear wheels, and smoke + fire from the engine once it's hit
    const gs = run ? st.speed * KF * 60 : 120;
    if (T.visible && ty < 10 && run) for (const x of [-24, 24]) if (Math.random() < .7) fx.emit(V.set(tx + x * Math.cos(yaw), 4, 44), V2.set((Math.random() - .5) * 30, 18 + Math.random() * 20, gs * .35), .55, 6, 36, [.62, .68, .8], [.4, .44, .55], .22, false, 0, 2, 4);
    if (T.visible && ty < 10 && Math.random() < .55) fx.emit(V.set(tx + (Math.random() - .5) * 10, 104, 18), V2.set((Math.random() - .5) * 12, 55 + Math.random() * 25, gs * .5), 1.6, 10, 70, [.72, .72, .74], [.42, .42, .46], .34, false, 0, 1.2, 30);   // grill smoke: they're cooking burgers in there
    if (heat > 0 && T.visible) { const hx = tx - Math.sin(yaw) * 46, hy = ty + 40, hz = -Math.cos(yaw) * 46, hh = st.dying ? 1 : heat;
      if (Math.random() < .4 + hh) fx.emit(V.set(hx + (Math.random() - .5) * 14, hy, hz), V2.set((Math.random() - .5) * 16, 30 + Math.random() * 20, gs * .55), 1.3, 8 + hh * 10, 40 + hh * 60, [.22, .21, .22], [.09, .09, .1], .18 + hh * .22, false, 0, 1.4, 18);
      if (hh > .15) for (let i = 0; i < 1 + hh * 2; i++) if (Math.random() < hh * 1.2) fx.emit(V.set(hx + (Math.random() - .5) * 26 * hh, hy - 4, hz + (Math.random() - .5) * 20 * hh), V2.set((Math.random() - .5) * 20, 40, gs * .25), .25 + hh * .2, 6 + hh * 14, 3, [1, .62, .2], [.9, .2, .05], 1, true, 1, 1, 20);
      if (hh > .35 && Math.random() < (hh - .3) * 1.4) { const rx = tx + (Math.random() - .5) * 44 * Math.min(1, hh * 1.3), rz = -30 + Math.random() * 60 * hh; fx.emit(V.set(rx, ty + 93, rz), V2.set((Math.random() - .5) * 14, 46, gs * .3), .3 + hh * .25, 6 + hh * 16, 3, [1, .62, .2], [.9, .2, .05], 1, true, 1, 1, 20); }   /* past ~a third of the damage the fire spreads onto the roof, so you see it from behind */
      fireLight.position.set(hx, hy + 10, hz); fireLight.intensity = (hh > .15 ? 60 + hh * 240 : 0) * (.75 + Math.random() * .5); } else fireLight.intensity = 0;
    /* broken parts: one more falls off per half-life lost, and the kids' repairs put them back */
    const want = st.dying ? truck.parts.length : Math.min(truck.parts.length, Math.round(((window.SB_LIVES ? SB_LIVES.max() : 5) - st.lives) * 2));
    while (brokeN < want) { const p = truck.parts[brokeN++]; T.updateMatrixWorld(); p.updateMatrixWorld(); p.matrixWorld.decompose(p.position, p.quaternion, p.scale); scene.add(p);
      flying.push({ p, vx: (Math.random() - .5) * 120, vy: 90 + Math.random() * 60, vz: 160 + Math.random() * 120, sx: Math.random() * 8 - 4, sz: Math.random() * 8 - 4, t: 0 });
      fx.sparks(V.copy(p.position), V2.set(0, 1, 0), null, 1, 10); }
    while (brokeN > want) { const p = truck.parts[--brokeN]; const f = flying.findIndex(q => q.p === p); if (f >= 0) flying.splice(f, 1); T.add(p); p.position.copy(p.userData.home.p); p.rotation.copy(p.userData.home.r); p.scale.setScalar(1); p.visible = true; }
    for (const f of flying) { f.t += dt; f.vy -= 400 * dt; f.p.position.x += f.vx * dt; f.p.position.y = Math.max(1, f.p.position.y + f.vy * dt); f.p.position.z += (f.vz + dz / Math.max(dt, 1e-3)) * dt; f.p.rotation.x += f.sx * dt; f.p.rotation.z += f.sz * dt; f.p.visible = f.p.position.z < 900; }
    /* blown tire: that rear wheel sags, the truck leans on it, sparks + rubber smoke */
    truck.wheels.forEach((w, i) => { const fl = st.flat && i === (st.flat > 0 ? 3 : 2); w.position.y = fl ? 7 : 10.5; w.scale.set(1, fl ? .8 : 1, fl ? 1.1 : 1); });
    if (st.flat && T.visible && run) { T.rotation.z += st.flat * -.05; const wx2 = tx + st.flat * 24 * Math.cos(yaw); if (Math.random() < .6) fx.sparks(V.set(wx2, 2, 29), V2.set(0, 1, .4), null, .7, 4);
      if (Math.random() < .5) fx.emit(V.set(wx2, 4, 32), V2.set((Math.random() - .5) * 20, 16, gs * .4), .9, 8, 46, [.8, .8, .84], [.55, .56, .6], .35, false, 0, 1.6, 10); }

    /* camera: behind and above, leaning into lane changes */
    const camT = st.dying ? camX : tx * (pitting ? .85 : .42); camX += (camT - camX) * Math.min(1, dt * 5);
    if (st.shake > 0) camShake = Math.max(camShake, st.shake);
    camShake *= Math.pow(.02, dt);
    cam.position.set(camX + (Math.random() - .5) * camShake * 1.2, 150 + (Math.random() - .5) * camShake + (st.dying ? Math.min(160, ty * .3) : 0), 330);   // pulled back to show more of the city
    V.set(camX + tx * .2, st.dying ? 40 + ty * .7 : 20, -320); cam.lookAt(V); cam.rotation.z += -st.rot * .05;
    if (STATUS.camO) { const c = STATUS.camO; cam.position.set(tx + c[0], c[1], c[2]); cam.lookAt(tx + c[3], c[4], c[5]); }   // test hook: look at the truck from anywhere

    /* things on the road */
    frameNo++;
    for (const it of st.items) { const v = viewFor(it, it.type); v.n = frameNo; const z = wz(it.y), x = wx(it.x);
      if (it.type === "coin") { v.o.position.set(x, 24, z); v.m.rotation.y = it.spin; }
      else if (it.type === "food") { v.o.position.set(x, 18 + Math.sin(now / 260 + it.x) * 4, z); v.m.rotation.y = now / 650 + it.x; }
      else if (it.type === "debris") { const hgt = .75 + .25 * Math.sin(now / 300 + it.ph); const orb = now / 650 + it.ph, cr = it.d.k === "cow" ? 16 : 6; v.o.position.set(x + Math.cos(orb) * cr, 0, z + Math.sin(orb) * cr); v.m.position.y = 60 + 50 * hgt;   /* cows loop in a small circle inside their lane */ v.m.rotation.set(it.d.k === "cow" ? Math.sin(now / 500 + it.ph) * .5 : 0, (now / (it.d.k === "cow" ? 1400 : 700) + it.ph) * (it.vr < 0 ? -1 : 1), it.rot); v.sh.scale.setScalar(.7 + .3 * (1 - hgt)); }
      else if (it.type === "twister") { v.o.position.set(x, 0, z); v.upd(t + it.ph, 1); }
      else if (it.type === "driz") { v.o.position.set(x, 42 + Math.sin(now / 220 + it.x) * 5, z); v.m.rotation.y = now / 380; }
      else if (it.type === "queue") { v.o.position.set(0, 0, 0); const sp = it.len / it.n;
        v.cars.forEach((c, i) => { const y = it.y - it.len / 2 + sp * (i + .5); c.position.set(LANEX[LANEX.length - 1] + Math.sin(i * 1.7) * 5, 0, (y - PY) * KF); c.rotation.y = Math.sin(i * 2.3) * .04; });
        v.st.position.z = (it.y - it.len / 2 - PY) * KF - 60; }
      else if (it.type === "pit") { v.o.position.set(0, 0, z);
        v.kids.forEach((K, i) => { const g = K.g; let tgt = K.home;
          if (pitting && it.used) { const a = i / v.kids.length * TAU + t * .6; V2.set(tx + Math.cos(a) * 48, 0, Math.sin(a) * 66 - z); tgt = V2; K.armR.rotation.x = -1.2 + Math.sin(t * 14 + K.ph) * .7; K.armL.rotation.x = -.6 + Math.sin(t * 9 + K.ph) * .3; }
          else { K.armR.rotation.x = 0; K.armR.rotation.z = 2.6 + Math.sin(t * 8 + K.ph) * .4; K.armL.rotation.x = 0; }
          g.position.lerp(tgt, Math.min(1, dt * 6)); g.position.y = Math.abs(Math.sin(t * 7 + K.ph)) * (pitting ? 3 : 1.5); g.lookAt(V.set(tx, 0, 0)); }); }
      else if (it.type === "block") { v.o.position.set(0, 0, z); const on = Math.floor(now / 110) % 2; v.cars.forEach(C => { C.r.material = on ? COPM.red : COPM.redOff; C.b.material = on ? COPM.blueOff : COPM.blue; C.glow.material.color.setHex(on ? 0xff3030 : 0x3a7bff); }); }
      else if (it.type === "spike") v.o.position.set(x, 0, z);
      else if (it.type === "egg") { v.o.position.set(Math.max(-130, Math.min(130, x)), 0, z); v.m.position.x = x - v.o.position.x; v.m.rotation.y = now / 300; }
      v.x = x; v.z = z; }
    for (const c of st.cops) { if (c.warn > 0) continue; const v = viewFor(c, "cop"); v.n = frameNo; v.o.position.set(wx(c.x), 0, wz(c.y)); v.o.rotation.y = -(S.LX(c.tl) - c.x) * .004; const on = Math.floor(now / 110) % 2;
      v.C.r.material = on ? COPM.red : COPM.redOff; v.C.b.material = on ? COPM.blueOff : COPM.blue; v.C.glow.material.color.setHex(on ? 0xff3030 : 0x3a7bff); v.x = wx(c.x); v.z = wz(c.y); }
    let ci = 0; for (const c of st.cops) { if (c.warn > 0 || ci >= copLights.length) continue; const l = copLights[ci++], on = Math.floor(now / 110) % 2; l.color.setHex(on ? 0xff2a2a : 0x2a6bff); l.intensity = 420; l.position.set(wx(c.x), 46, wz(c.y)); }
    for (; ci < copLights.length; ci++) copLights[ci].intensity = 0;
    for (const bo of st.bolts) { const v = viewFor(bo, "bolt"); v.n = frameNo; v.o.position.x = LANEX[bo.lane];
      if (bo.phase === "warn") { const a = .5 + .5 * Math.sin(bo.age / 50), k2 = 1 - Math.min(1, bo.age / 1300) * .45; v.strip.scale.setScalar(k2); v.strip.material.opacity = .45 + a * .5; v.disc.material.opacity = .2 + a * .35; v.beam.material.opacity = .04 + .08 * Math.min(1, bo.age / 1300);
        v.strip.visible = v.disc.visible = v.beam.visible = v.ic.visible = true; v.ic.material.opacity = .6 + a * .4; v.ic.position.y = 150 + Math.sin(bo.age / 90) * 8; }
      else { v.strip.visible = v.disc.visible = v.beam.visible = v.ic.visible = false; if (!v.bolt) { v.bolt = makeBolt(0, -60); v.o.add(v.bolt); flashLight.position.set(LANEX[bo.lane], 200, -10); flashK = 1; fx.sparks(V.set(LANEX[bo.lane], 4, -10), V2.set(0, 1, 0), null, 3, 30); fx.boom(V.set(LANEX[bo.lane], 6, -10), .6); } v.bolt.visible = bo.age < 160 || Math.random() > .3; } }
    for (const [o, v] of views) if (v.n !== frameNo) {   // gone from the game: picked up / hit (animate it into the truck) or scrolled away
      if ((v.kind === "coin" || v.kind === "food" || v.kind === "driz" || v.kind === "egg" || v.kind === "debris" || v.kind === "twister") && v.z > -320 && Math.abs(v.x - tx) < 90) {
        ghosts.push({ v, o, t: 0, x0: v.o.position.x, z0: v.o.position.z, bad: v.kind === "debris" || v.kind === "twister" }); views.delete(o); }
      else drop(o, v); }
    for (let i = ghosts.length - 1; i >= 0; i--) { const G = ghosts[i]; G.t += dt; const u = Math.min(1, G.t / .16);
      G.v.o.position.x = G.x0 + (tx - G.x0) * u; G.v.o.position.z = G.z0 + (-40 - G.z0) * u; if (!G.bad) G.v.o.scale.setScalar(1 - u * .8);
      if (u >= 1) { if (G.bad) { fx.boom(V.set(tx, 40, -50), 1.1); fx.sparks(V.set(tx, 30, -50), V2.set(0, 1, -.5), null, 2, 30); } else { fx.glow(V.set(tx, 50, -40), 90, [1, .85, .3], 1); for (let j = 0; j < 10; j++) fx.emit(V.set(tx, 50, -40), V2.set((Math.random() - .5) * 160, Math.random() * 140, (Math.random() - .5) * 160), .5, 6, 1, [1, .9, .4], [1, .6, .1], 1, true, 2, 1.5, -80); }
        drop(G.o, G.v); ghosts.splice(i, 1); } }

    /* storm: flashes from the game's own lightning + the sky's */
    wx3.update(dt, t, cam);
    flashK = Math.max(flashK * Math.pow(.004, dt), st.flash * .9); const fl = Math.max(flashK, wx3.flash);
    flashLight.intensity = flashK * 3000; hemi.intensity = 1.55 + fl * 3.2; scene.background.copy(BG).lerp(BGF, Math.min(1, fl * .8)); scene.fog.color.copy(BG).lerp(BGF, Math.min(1, fl * .6)).multiplyScalar(1.2);
    fx.update(dt);
    if (LENS) LENS.render(dt, fl); else renderer.render(scene, cam);
    if (!S.r3 && !failed && pref() !== "2d") { STATUS.enable(true); S.proj = proj; }
  };
  STATUS.warp = d => { warp += d; }; STATUS.board = () => { bbT = 0; };
  STATUS.store = z => { const o = store(1, "1500 N LA BREA AVE", true).o; o.position.z = z; scene.add(o); return o; };   // test hook: drop the StormBurger stop beside the road
  STATUS.jump = n => event(LVL[n - 1]);   // test hook: put the landmark of level n on the road ahead now
  STATUS.booted = true;
}
