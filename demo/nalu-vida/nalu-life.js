/* Ride the Nalu — engine3d hookup (2026-10-16). Visual only: the game (game.js) never reads any of this.
   Adds, on top of game3d.js's ocean / surfer / pier:
   - real animated people (demo/engine3d/crowd.js, the Nalu Vida cast as rigged humans): the lifeguards and the Nalu Vida staff
     (replacing the flat cut-outs), sunbathers on towels, people under umbrellas, walkers along the waterline, kids, strollers on
     the pier, diners on the Nalu Vida patio and AI surfers paddling and waiting in the lineup;
   - the Nalu Vida patio itself: a deck on the sand by the restaurant, tables, umbrellas in Nalu orange/teal, string lights;
   - weather + time of day (engine3d sky/weather): light colour and strength, rain streaks and rings on the water, storm darkness,
     lightning flashes + thunder, wet sand, drifting cloud shadows on the water and the beach (engine3d clouds, shadows-only mode);
   - post-processing per quality tier (bloom, grade, FXAA/SMAA) and procedural ambience (crowd, rain, thunder, wind).
   Coordinates are game3d.js's: x = game px, z = screen y × K, y = height; y0 = sy(0) is the shoreline row on screen. */
const CDN = "https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/";
export async function makeNaluLife(THREE, O) {
  const { R, scene, cam, sun, hemi, A, G, K, loader, oceanMat, hide, makeBoard } = O;
  const imp = (n) => import("../engine3d/" + n + ".js?v=n6"), addons = (p) => import(CDN + p + "/+esm");
  const [QM, SKYM, CLDM, WXM, POSTM, CRM, AUDM, BBM] = await Promise.all(["quality", "sky", "clouds", "weather", "postfx", "crowd", "audio", "billboard"].map(imp));
  const QUAL = window.__E3Q = QM.makeQuality({ id: "nalu-vida", renderer: R, target: 50, minFps: 40 });
  const prBase = R.getPixelRatio(); const applyPR = () => { R.setPixelRatio(Math.min(prBase, QUAL.cfg.pr)); };
  applyPR();
  const LS = (k, d) => { try { return localStorage.getItem(k) || d; } catch (e) { return d; } }, Qs = new URLSearchParams(location.search);
  const TOD = { sunrise: 7.0, day: 13.0, sunset: 18.45, night: 21.8 };
  const skyPref = () => (Qs.get("tod") ? "fixed" : LS("nalu-sky", "live")), wxPref = () => Qs.get("weather") || LS("nalu-weather", "live");
  let hours = Qs.get("tod") ? +Qs.get("tod") : TOD[skyPref()] || 13.2;
  const SKY = SKYM.makeSky(THREE, { renderer: R, scene, env: false, hours });
  const CLOUDS = CLDM.makeClouds(THREE, { renderer: R, sky: SKY, quality: { scale: .25, steps: 1, light: 1 } });
  const center = new THREE.Vector3();
  const wp = wxPref(), WX = WXM.makeWeather(THREE, { scene, state: wp === "live" ? "sunny" : wp, auto: wp === "live", quality: { rain: QUAL.cfg.rain * .6 }, box: new THREE.Vector3(700, 900, 1100), center: () => center, bolt: false });
  if (wp !== "live") WX.set(wp, 0);
  const size = new THREE.Vector2(); R.getSize(size);
  const POST = await POSTM.makePost(THREE, { renderer: R, scene, camera: cam, clouds: CLOUDS, quality: Object.assign({}, QUAL.cfg.post, { ssao: false }), width: size.x, height: size.y, pixelRatio: R.getPixelRatio(), addons });
  const AMB = AUDM.makeAmbience({ out: () => A.audioOut && A.audioOut() }); WX.onThunder((d, k) => AMB.thunder(d, k));
  QUAL.onChange((t, cfg) => { applyPR(); R.getSize(size); POST.setQuality(Object.assign({}, cfg.post, { ssao: false })); POST.setSize(size.x, size.y, R.getPixelRatio()); WX.setQuality({ rain: cfg.rain * .6 }); });
  window.NALU_ENV = { sky(v) { try { localStorage.setItem("nalu-sky", v); } catch (e) {} if (TOD[v]) hours = TOD[v]; }, weather(v) { try { localStorage.setItem("nalu-weather", v); } catch (e) {} if (v === "live") WX.auto(true); else { WX.auto(false); WX.set(v, 8); } },
    get: () => ({ sky: skyPref(), weather: wxPref(), hours, state: WX.state }) };
  // the ocean shader learns about the weather: storm darkening + raindrop rings
  if (oceanMat) { const U = oceanMat.uniforms; U.uWxDark = { value: 0 }; U.uRain = { value: 0 }; U.uWxLight = { value: new THREE.Color(1, 1, 1) }; oceanMat.needsUpdate = true; }

  /* ---------------- people ---------------- */
  const H = 50, BASE_SUN = sun.color.clone(), BASE_SI = sun.intensity, BASE_HI = hemi.intensity;
  let crowd = null; try { crowd = await CRM.createCrowd(THREE, { base: new URL("../engine3d/assets/humans/", location.href).href, loader, scene, renderer: R, height: H, addons, quality: Object.assign({}, QUAL.cfg.crowd, { maxDist: 1e5, lod1Dist: 1e5, nearDist: 1e5, near: Math.min(4, QUAL.cfg.crowd.near) }) }); } catch (e) { console.warn("[nalu-life] crowd off:", e); }
  const R0 = (() => { let s = 99; return () => (s = (s * 16807) % 2147483647) / 2147483647; })(), pick = (a) => a[(R0() * a.length) | 0];
  const C = (h) => crowd.col(h), beach = [], water = [];
  const look = (body, style, f) => { const L = crowd.randomLook((R0() * 1e9) | 0, body, style); if (f) f(L); return L; };
  function person(o) { const body = o.body || (R0() < .5 ? "m" : "f"), p = crowd.add({ body, look: o.look || look(body, o.style || "beach"), scale: o.scale || (.95 + R0() * .12), seed: (R0() * 1e9) | 0 }); Object.assign(p, { bx: o.x, bd: o.d, bh: o.h || 0, byaw: o.yaw || 0, clip0: o.clip || "idle", kind: o.kind }); p.play(p.clip0); return p; }
  // patio by Nalu Vida (the restaurant on the aerial, around x 342, y0 + 200)
  const patio = new THREE.Group(); scene.add(patio);
  const wood = new THREE.MeshStandardMaterial({ color: 0x9a6b44, roughness: .85 }), white = new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: .6 }), dark = new THREE.MeshStandardMaterial({ color: 0x2a2c33, roughness: .6 });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(120, 3, 92 * K), wood); deck.position.y = 1.5; deck.receiveShadow = true; patio.add(deck);
  const TABLES = [[-34, -22], [10, -22], [-34, 20], [10, 20]];
  TABLES.forEach(([x, z], i) => { const t = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 1.2, 14), white); t.position.set(x, 13, z * K); t.castShadow = true; patio.add(t);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(.8, .8, 12, 6), dark); leg.position.set(x, 7, z * K); patio.add(leg);
    const um = new THREE.Mesh(new THREE.ConeGeometry(17, 7, 10, 1, true), new THREE.MeshStandardMaterial({ color: i % 2 ? 0xff7a3a : 0x1d9bb8, roughness: .7, side: THREE.DoubleSide })); um.position.set(x, 38, z * K); um.castShadow = true; patio.add(um);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.6, .6, 36, 5), dark); pole.position.set(x, 20, z * K); patio.add(pole); });
  const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(1.1, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 1.4, .8), toneMapped: false }), 40); { const m = new THREE.Matrix4(); for (let i = 0; i < 40; i++) { const u = (i % 20) / 19, side = i < 20 ? -1 : 1; m.makeTranslation(-56 + u * 112, 30 - Math.sin(u * Math.PI) * 6, side * 44 * K); bulbs.setMatrixAt(i, m); } } patio.add(bulbs);
  if (crowd) {
    // lifeguards + staff (they replace the cut-outs and the static model)
    const guardF = person({ body: "f", x: 140, d: 74, clip: "wave", kind: "guardF", look: look("f", "beach", L => { L.cloth = C("#d42a2a"); L.top = [0, 0, 0, 0]; }) });
    const guardM = person({ body: "m", x: 330, d: 54, clip: "binos", kind: "guardM", look: look("m", "beach", L => { L.top = [...C("#f4f4f2"), 2]; L.cloth = C("#d9473f"); }) });
    const staffLook = (b) => look(b, "beach", L => { L.top = [...C("#e88b8b"), 2]; L.bot = [...C("#f2efe8"), 3]; });
    const staff = [person({ body: "m", x: 300, d: 150, clip: "walk", kind: "staff", look: staffLook("m") }), person({ body: "f", x: 372, d: 160, clip: "idle", kind: "staff", look: staffLook("f") })];
    beach.push(guardF, guardM, ...staff);
    // diners on the patio
    TABLES.forEach(([x, z]) => [-1, 1].forEach(s => beach.push(person({ x: 342 + x + s * 11, d: 200 + z, h: 3, yaw: s > 0 ? -Math.PI / 2 : Math.PI / 2, clip: "sitChair", kind: "diner", style: "street" }))));
    // sunbathers, umbrellas, sitters, kids, walkers (kept off the middle where the surfer starts)
    const spot = () => { for (;;) { const x = 14 + R0() * 372, d = 22 + R0() * 84; if (x > 160 && x < 240) continue; if (Math.abs(x - 140) < 22 && Math.abs(d - 74) < 20) continue; if (Math.abs(x - 330) < 22 && Math.abs(d - 54) < 20) continue; return [x, d]; } };
    const towels = new THREE.InstancedMesh(new THREE.BoxGeometry(12, .6, 23), new THREE.MeshStandardMaterial({ roughness: .9 }), 18), umbs = new THREE.InstancedMesh(new THREE.ConeGeometry(14, 5, 12, 1, true), new THREE.MeshStandardMaterial({ roughness: .7, side: THREE.DoubleSide }), 7);
    towels.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(18 * 3), 3); umbs.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(7 * 3), 3); scene.add(towels, umbs); towels.castShadow = umbs.castShadow = true;
    const TC = ["#ff5a6a", "#f0d375", "#3aa8ff", "#7ee0b0", "#ffffff", "#ff9a2e", "#5a4ad8", "#1d9bb8"].map(h => new THREE.Color(h));
    const props = []; for (let i = 0; i < 18; i++) { const [x, d] = spot(), r = (R0() - .5) * .6; props.push({ m: towels, i, x, d, r, h: .6 }); towels.setColorAt(i, pick(TC)); if (i % 6 !== 5) beach.push(person({ x, d, h: 1, yaw: r + (R0() < .5 ? 0 : Math.PI), clip: R0() < .55 ? "lieBack" : "lieFront", kind: "sun" })); }
    for (let i = 0; i < 7; i++) { const [x, d] = spot(); props.push({ m: umbs, i, x, d, r: 0, h: 24, pole: true }); umbs.setColorAt(i, pick(TC)); beach.push(person({ x: x + 6, d: d + 4, yaw: Math.PI + (R0() - .5), clip: "sit", kind: "sit" })); if (R0() < .6) beach.push(person({ x: x - 6, d: d - 3, yaw: Math.PI + (R0() - .5), clip: R0() < .5 ? "sit" : "text", kind: "sit" })); }
    for (let i = 0; i < 2; i++) { const [x, d] = spot(); beach.push(person({ x, d, clip: "kneel", kind: "kid", scale: .58, yaw: R0() * 6 })); beach.push(person({ x: x + 16, d: d + 10, clip: "sit", kind: "sit", yaw: -2 })); }
    for (let i = 0; i < 7; i++) { const dir = R0() < .5 ? 1 : -1, sp = 16 + R0() * 10, x0 = R0() * 400, p = person({ x: x0, d: 8 + R0() * 12, clip: "walk", kind: "walk", yaw: dir > 0 ? Math.PI / 2 : -Math.PI / 2 }); p.walk = { dir, sp, x0 }; beach.push(p); }
    const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(.5, .5, 24, 5), dark, 7); scene.add(poles); props.forEach(q => { if (q.pole) q.poleI = q.i; });
    O.placeProps = (y0) => { const m = new THREE.Matrix4(), qq = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1), pv = new THREE.Vector3();
      props.forEach(q => { qq.setFromEuler(e.set(0, q.r, 0)); q.m.setMatrixAt(q.i, m.compose(pv.set(q.x, q.h, (y0 + q.d) * K), qq, one)); if (q.pole) poles.setMatrixAt(q.i, m.compose(pv.set(q.x, 12, (y0 + q.d) * K), qq, one)); });
      towels.instanceMatrix.needsUpdate = umbs.instanceMatrix.needsUpdate = poles.instanceMatrix.needsUpdate = true; };
    O.propsVisible = (v) => { towels.visible = umbs.visible = poles.visible = v; };
    // pier strollers (on the stub that runs out from the sand)
    for (let i = 0; i < 6; i++) { const p = person({ x: 0, d: 0, clip: "walk", kind: "pier", style: R0() < .5 ? "street" : "beach" }); p.pier = { u: R0(), sp: (.025 + R0() * .02) * (R0() < .5 ? 1 : -1), lane: (R0() - .5) * 10 }; beach.push(p); }
    // surfers in the lineup: paddling out and back, or sitting on their boards waiting for a set (they scroll with the sea)
    for (let i = 0; i < 6; i++) { const left = i % 2 === 0, p = person({ body: R0() < .5 ? "m" : "f", x: left ? 18 + R0() * 30 : 352 + R0() * 30, d: 0, clip: i % 3 ? "paddle" : "sit", kind: "surf", look: look(R0() < .5 ? "m" : "f", "beach", L => { if (R0() < .4) { L.top = [...C("#15161a"), 3]; } }) });
      p.yw0 = 300 + i * 260 + R0() * 120; p.wait = !(i % 3); const b = makeBoard ? makeBoard() : null; if (b) { b.scale.multiplyScalar(.9); scene.add(b); p.board = b; } water.push(p); }
  }
  hide.forEach(o => { if (o) o.visible = false; });
  // a big LED screen on the boardwalk by Nalu Vida playing Antidote's review (muted, inline, looping; poster if autoplay is blocked)
  const VB = BBM.makeVideoBoards(THREE, { src: new URL("img/review/billboard.mp4", location.href).href, poster: new URL("img/review/billboard.jpg", location.href).href });
  const board = VB.create({ w: 46, pole: 24, caption: "ANTIDOTE FOOD REVIEW · antidotethefoodie.com" }); board.scale.setScalar(1); scene.add(board);
  const _v = new THREE.Vector3();

  /* ---------------- per frame ---------------- */
  return {
    hidePrev: () => hide.forEach(o => { if (o) o.visible = false; }),
    frame(dt, f) { const t = G.t, s = Math.min(.05, dt); center.set(f.gx, 0, f.gy * K);
      if (skyPref() === "live") hours = (hours + s / 150) % 24;
      SKY.setTime(hours); WX.update(s, t, cam); const w = WX.v; SKY.update(s, w, t); const I = SKY.info, night = I.night;
      // light: keep the game's daylight look, steered by time of day + weather
      sun.color.copy(BASE_SUN).lerp(I.sunCol, .65); sun.intensity = BASE_SI * Math.max(.12, Math.min(1.1, I.sunI / 2.6)) * (1 - w.dark * .55) * (night > .5 ? .3 : 1);
      if (night > .5) sun.color.setRGB(.55, .65, 1);
      hemi.intensity = BASE_HI * (.42 + .58 * (1 - night)) * (1 - w.dark * .35); R.toneMappingExposure = (1 + night * .2) * (1 + WX.flash * 1.4);
      if (oceanMat) { const U = oceanMat.uniforms; U.uWxDark.value = w.dark * .9 + night * .25; U.uRain.value = w.rain; }
      // people
      if (crowd) { const y0 = f.y0, vis = f.shoreVisible;
        if (O.placeProps) { O.placeProps(y0); O.propsVisible(vis); }
        board.visible = vis; board.position.set(262, 0, (y0 + 112) * K); board.rotation.set(-.5, 0, 0); VB.update(t); patio.visible = vis; patio.position.set(342, 0, (y0 + 200) * K);
        const near = f.near, rain = w.rain > .35;
        for (const p of beach) {
          if (p.kind === "pier") { const L = f.pier; if (!L) { p.visible = false; continue; } p.visible = true; p.pier.u = (p.pier.u + p.pier.sp * s + 1) % 1; p.set(L.x + p.pier.lane, L.h, L.z0 - p.pier.u * L.len, p.pier.sp > 0 ? Math.PI : 0); p.play(rain ? "coverRun" : "walk"); continue; }
          p.visible = vis; if (!vis) continue;
          if (p.walk) { p.bx = ((p.walk.x0 + t * p.walk.sp * p.walk.dir) % 440 + 440) % 440 - 20; }
          let clip = p.clip0; if (p.kind === "guardF") clip = near ? "wave" : "idle"; if (p.kind === "staff" && p.clip0 === "walk") { p.bx = 300 + Math.sin(t * .4) * 40; p.byaw = Math.cos(t * .4) > 0 ? Math.PI / 2 : -Math.PI / 2; }
          // rain: beach-goers grab their things and run for the boardwalk, then wait it out under umbrellas
          if (p.kind === "walk" || p.kind === "sit" || p.kind === "sun" || p.kind === "kid") { if (p.home == null) p.home = p.bd;
            const target = rain ? 118 + (p.bx % 17) : p.home, dd = target - p.bd;
            if (Math.abs(dd) > 1.5) { p.bd += Math.sign(dd) * Math.min(Math.abs(dd), 38 * s); clip = rain ? "coverRun" : "walk"; p.byawR = dd > 0 ? 0 : Math.PI; }
            else if (rain) { clip = "idle"; p.byawR = Math.PI; } else p.byawR = null; }
          p.set(p.bx, p.bh * (p.byawR == null ? 1 : 0), (y0 + p.bd) * K, p.byawR != null ? p.byawR : p.byaw); p.play(clip); p.umbrella = rain && (p.kind === "staff" || (p.byawR != null && clip === "idle")); }
        const calm = G.phase === "ride" || G.phase === "popup";   // nothing extra in the water while you ride (Antidote, 2026-10-14)
        for (const p of water) { if (calm) { p.visible = false; if (p.board) p.board.visible = false; continue; } p.visible = true; if (p.board) p.board.visible = true; const yw = p.yw0 + (p.wait ? Math.sin(t * .3 + p.yw0) * 20 : ((t * 18 + p.yw0) % 900) - 300), z = A.sy(yw) * K, bob = Math.sin(t * 1.6 + p.yw0) * 1.2;
          p.set(p.bx, (p.wait ? -18 : -3) + bob, z, p.wait ? Math.PI : 0); p.play(p.wait ? "sit" : "paddle");
          if (p.board) { p.board.position.set(p.bx, 1 + bob, z + (p.wait ? 0 : -14)); p.board.rotation.set(0, Math.PI, 0); } }
        cam.updateMatrixWorld(); crowd.update(cam, t, s); }
      AMB.update(s, { ocean: 0, traffic: 0, crowd: f.shoreVisible ? .7 : .1, cheer: 0, rain: w.rain, wind: w.wind * w.overcast * .8, engine: 0 }); },
    render(dt) { const I = SKY.info, w = WX.v;
      POST.render(Math.min(.05, dt), G.t, { skip: true, keepBg: true, shadowK: 1.3, shadow: .32 * (1 - I.night) * (1 - w.dark * .5), cover: w.cover, density: w.density, base: 600, top: 1200,
        wind: _v.set(14 + 30 * w.wind, 0, -20), wet: w.wet, skyRef: I.horizon, sunVis: 1 - I.night, fogStart: 1e6, fogDen: 0, mistK: 0, bloom: .25 + .35 * I.night, bloomT: 1.6 + 1.6 * (1 - I.night) }); },
    sample(fps) { return QUAL.sample(fps); },
    get quality() { return QUAL; }, weather: WX, sky: SKY, crowd,
  };
}
