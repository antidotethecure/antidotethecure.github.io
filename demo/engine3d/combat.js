/* engine3d/combat.js — gunfire and real crashes for flying enemies.
   muzzle(pos, dir, rgb, k)   a muzzle flash at a gun point: a hot core + a 4-point star (additive sprites, ~60 ms), a brief point
                              light (pooled; none on LOW), forward sparks and (cheap) ejected shell casings.
   crash({ obj, kind: "heli"|"jet"|"ufo"|"airliner", k, vel, rotor, eject })
                              takes over a destroyed aircraft: it catches fire and falls with a smoke trail (helicopter: autorotates
                              in a spiral with the rotor still turning · jet: noses over and rolls · UFO: wobbles and arcs ·
                              airliner: a slow heavy dive), hits the ground (big explosion, debris, scorch mark), then the wreck burns
                              and smoulders for a few seconds before it sinks away. Jets eject first: the canopy pops, the seat fires
                              (rocket flash + smoke), the pilot separates, the parachute opens, he drifts down, lands and sits.
   update(dt, t, { scroll })  scroll = ground speed toward the camera (+Z units/s): wrecks, scorch and pilots move with the ground.
   Everything is visual: the game already counted the kill. Detail follows the quality tier (lights, shells, debris counts). */
export function makeCombat(THREE, O) {
  const scene = O.scene, fx = O.fx, Q = () => (O.quality ? O.quality() : { lights: 2, shells: true, debris: 1 });
  const mk = (w, h, draw) => { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const starT = mk(128, 128, (x, w) => { x.translate(64, 64); for (let i = 0; i < 4; i++) { x.rotate(Math.PI / 2); const g = x.createLinearGradient(0, 0, 60, 0); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.beginPath(); x.moveTo(0, -7); x.lineTo(62, 0); x.lineTo(0, 7); x.fill(); }
    const r = x.createRadialGradient(0, 0, 0, 0, 0, 30); r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = r; x.fillRect(-32, -32, 64, 64); });
  const scorchT = mk(128, 128, (x) => { for (let i = 0; i < 40; i++) { const cx = 64 + (Math.random() - .5) * 50, cy = 64 + (Math.random() - .5) * 50, r = 10 + Math.random() * 30, g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, "rgba(10,8,6,.35)"); g.addColorStop(1, "rgba(10,8,6,0)"); x.fillStyle = g; x.fillRect(0, 0, 128, 128); } });
  const chuteT = mk(256, 64, (x) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? "#f2efe8" : "#e8552f"; x.fillRect(i * 32, 0, 32, 64); } });
  /* ---- muzzle flashes ---- */
  const FL = []; for (let i = 0; i < 16; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: starT, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false })); s.visible = false; s.renderOrder = 160; scene.add(s); FL.push({ s, life: 0, max: 0 }); }
  const LT = []; for (let i = 0; i < (O.lights != null ? O.lights : 2); i++) { const l = new THREE.PointLight(0xffb060, 0, 160, 1.6); scene.add(l); LT.push({ l, life: 0 }); }
  let fi = 0, li = 0; const V = new THREE.Vector3(), V2 = new THREE.Vector3();
  function muzzle(p, dir, col, k = 1) { const q = Q();
    for (let j = 0; j < 2; j++) { const f = FL[fi = (fi + 1) % FL.length]; f.s.visible = true; f.s.position.copy(p).addScaledVector(dir, j * 3 * k); f.s.material.color.setRGB(j ? col[0] * 2 : 2.4, j ? col[1] * 2 : 2.2, j ? col[2] * 2 : 1.8);
      f.s.material.rotation = Math.random() * 6.28; f.s.scale.setScalar((j ? 15 : 9) * k * (.8 + Math.random() * .5)); f.life = f.max = .06 + Math.random() * .02; }
    if (q.lights > 0 && LT.length) { const L = LT[li = (li + 1) % Math.min(LT.length, q.lights)]; L.l.position.copy(p); L.l.color.setRGB(col[0] * .5 + .5, col[1] * .5 + .45, col[2] * .4 + .3); L.l.intensity = 900 * k; L.life = .07; }
    if (fx) { for (let i = 0; i < 4; i++) fx.emit(p, V.copy(dir).multiplyScalar(90 + Math.random() * 90).add(V2.set((Math.random() - .5) * 40, (Math.random() - .5) * 40, (Math.random() - .5) * 40)), .12 + Math.random() * .1, .7 * k, .2 * k, [1, .92, .6], [1, .5, .15], 1, true, 2, 2, 0);
      if (q.shells) fx.emit(V.copy(p).addScaledVector(dir, -4 * k), V2.set((Math.random() - .5) * 30 + 26, 30 + Math.random() * 20, (Math.random() - .5) * 20), .7, .5 * k, .5 * k, [.95, .72, .3], [.6, .45, .2], 1, false, 2, .3, -160); } }
  /* ---- crashes ---- */
  const crashes = [], scorches = [], pilots = [];
  const scorchM = new THREE.MeshBasicMaterial({ map: scorchT, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  function crash(o) { const c = Object.assign({ t: 0, phase: "fall", vel: new THREE.Vector3(0, 0, 30), spin: new THREE.Vector3(), k: 1, ground: 0, smoulder: 0 }, o);
    c.obj.traverse(n => { if (n.isMesh && n.material) { n.material = Array.isArray(n.material) ? n.material.map(m => m.clone()) : n.material.clone(); } });
    const r = Math.random() < .5 ? -1 : 1;
    if (c.kind === "heli") { c.spin.set(.25, 3.2 * r, .2); c.vel.y = -20; }
    else if (c.kind === "jet") { c.spin.set(-1.1, .2 * r, 2.6 * r); c.vel.y = 10; c.vel.z = 60; c.eject = c.eject !== false; }
    else if (c.kind === "ufo") { c.spin.set(0, 4 * r, 0); c.vel.x = 50 * r; c.vel.y = 30; c.wob = 0; }
    else if (c.kind === "apex") { c.spin.set(.5, 2.6 * r, 1.2 * r); c.vel.y = 20; c.vel.x = 40 * r; }
    else { c.spin.set(-.35, .1 * r, .7 * r); c.vel.y = 0; c.vel.z = 40; }
    c.r0 = c.obj.rotation.clone(); crashes.push(c); return c; }
  function burnTrail(c, s) { const p = c.obj.position, k = c.k, n = Math.max(1, Math.round(s * 70)), hot = Math.min(1, c.t * 3);
    for (let i = 0; i < n; i++) { fx.emit(V.copy(p).add(V2.set((Math.random() - .5) * 10 * k, (Math.random() - .5) * 6 * k, (Math.random() - .5) * 10 * k)), V2.set((Math.random() - .5) * 14, 16, 26), .45, 16 * k * hot, 5 * k, [1, .85, .42], [1, .3, .06], 1, true, 0, .6, 12);
      fx.emit(V.copy(p).add(V2.set((Math.random() - .5) * 6 * k, 0, (Math.random() - .5) * 6 * k)), V2.set((Math.random() - .5) * 8, 10, 30), 2.8, 10 * k, 46 * k, [.17, .16, .15], [.07, .07, .07], .85, false, 0, .35, 5); }
    fx.glow(p, 34 * k * hot, [1, .55, .2], .6); }
  function impact(c) { const p = c.obj.position, k = c.k, q = Q(); c.phase = "wreck"; c.t = 0;
    fx.boom(p, k * 1.6); fx.boom(V.copy(p).add(V2.set(6 * k, 2, -4 * k)), k); if (fx.sparks) fx.sparks(p, V2.set(0, 1, 0), null, k * 2, 30);
    if (O.debris) O.debris(p.clone(), Math.round(14 * (q.debris || 1)), c.kind === "ufo" ? "#9aa0a8" : null, 110);
    p.y = c.ground + (c.kind === "ufo" ? 2 : 3); c.obj.rotation.set(c.kind === "heli" ? .5 : .15, c.obj.rotation.y, (Math.random() - .5) * .8);
    c.obj.traverse(n => { if (n.isMesh && n.material) [].concat(n.material).forEach(m => { if (m.color) m.color.multiplyScalar(.28); if (m.emissive) { m.emissive.setRGB(.5, .12, .02); m.emissiveIntensity = .6; } }); });
    const sc = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), scorchM); sc.position.set(p.x, c.ground + .4, p.z); sc.scale.setScalar(60 * k); sc.rotation.y = Math.random() * 6; scene.add(sc); scorches.push({ m: sc, t: 0 });
    if (O.onImpact) O.onImpact(p.clone(), k); }
  /* ---- the ejection ---- */
  function eject(c) { const P0 = {}; const p = c.obj.position.clone(), k = c.k, up = new THREE.Vector3(0, 1, 0).applyQuaternion(c.obj.quaternion);
    const canopy = new THREE.Mesh(new THREE.SphereGeometry(1.6 * k, 10, 6, 0, 6.28, 0, 1.4), new THREE.MeshPhysicalMaterial({ color: 0x1a2a3a, roughness: .05, transparent: true, opacity: .7 })); canopy.scale.set(1, .6, 2); canopy.position.copy(p); scene.add(canopy);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.6, 1.8), new THREE.MeshStandardMaterial({ color: 0x2b2e33, roughness: .7 })); seat.position.copy(p); scene.add(seat);
    const CR = typeof O.crowd === "function" ? O.crowd() : O.crowd; let person = null; if (CR) { person = CR.add({ body: "m", style: "street", seed: (Math.random() * 1e9) | 0, look: CR.randomLook((Math.random() * 1e9) | 0, "m", "street") }); P0.cr = CR; const L = person.look; L.top = [.24, .27, .18, 3]; L.bot = [.24, .27, .18, 3]; L._pk = null; person.play("sitChair"); }
    const chute = new THREE.Mesh(new THREE.SphereGeometry(14, 18, 6, 0, 6.28, 0, 1.15), new THREE.MeshStandardMaterial({ map: chuteT, side: THREE.DoubleSide, roughness: .8 })); chute.visible = false; scene.add(chute);
    const lines = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(8 * 6), 3)), new THREE.LineBasicMaterial({ color: 0x333333 })); lines.visible = false; lines.frustumCulled = false; scene.add(lines);
    const P = Object.assign(P0, { t: 0, phase: "seat", pos: p.clone().addScaledVector(up, 3), vel: up.clone().multiplyScalar(80).add(new THREE.Vector3(0, 25, c.vel.z * .5)), canopy, cv: up.clone().multiplyScalar(90).add(new THREE.Vector3((Math.random() - .5) * 40, 30, 20)), seat, sv: null, person, chute, lines, open: 0, k: 1, ground: c.ground, yaw: Math.random() * 6 });
    fx.glow(P.pos, 26, [1, .8, .5], 1); pilots.push(P); }
  function updPilot(P, s, t, scroll) { P.t += s; const g = 140;
    // the canopy tumbles away
    if (P.canopy) { P.cv.y -= g * s; P.canopy.position.addScaledVector(P.cv, s); P.canopy.rotation.x += 6 * s; P.canopy.rotation.z += 4 * s; if (P.canopy.position.y < P.ground || P.t > 4) { scene.remove(P.canopy); P.canopy = null; } }
    if (P.phase === "seat") { P.vel.y -= g * .4 * s; P.pos.addScaledVector(P.vel, s); P.seat.position.copy(P.pos); P.seat.rotation.x += 2 * s;
      fx.emit(V.copy(P.pos).add(V2.set(0, -1.6, 0)), V2.set((Math.random() - .5) * 10, -90, 0), .25, 3, 1, [1, .85, .45], [1, .35, .1], 1, true, 0, 1, 0);   // the seat rocket
      fx.emit(P.pos, V2.set((Math.random() - .5) * 8, -12, 18), 1.6, 2.5, 10, [.75, .74, .72], [.45, .45, .45], .7, false, 0, .4, 2);
      if (P.t > .55) { P.phase = "chute"; P.sv = P.vel.clone().multiplyScalar(.4); P.vel.set(0, 6, P.vel.z * .2); P.chute.visible = P.lines.visible = true; } }
    else if (P.phase === "chute") { if (P.seat) { P.sv.y -= g * s; P.seat.position.addScaledVector(P.sv, s); P.seat.rotation.z += 5 * s; if (P.seat.position.y < P.ground) { scene.remove(P.seat); P.seat = null; } }
      P.open = Math.min(1, P.open + s * 2.2); const drag = P.open; P.vel.y += (-(1 - drag) * g * .6 - drag * 30 - P.vel.y) * Math.min(1, s * 3); P.vel.z += (scroll * .25 - P.vel.z) * s; P.pos.addScaledVector(P.vel, s);
      if (P.pos.y <= P.ground) { P.pos.y = P.ground; P.phase = "landed"; P.t = 0; } }
    else { P.pos.z += scroll * s; P.open = Math.max(0, P.open - s * .8); }
    const sway = Math.sin(t * 1.7 + P.yaw) * .18 * (P.phase === "chute" ? 1 : 0), chuteY = 24 * P.open;
    if (P.person) { P.person.set(P.pos.x, P.pos.y - (P.phase === "landed" ? 0 : 6.5), P.pos.z, P.yaw); P.person.play(P.phase === "seat" ? "sitChair" : P.phase === "chute" ? "set" : P.t < 2 ? "idle" : "sit"); }
    P.chute.position.set(P.pos.x + sway * 6, P.pos.y + (P.phase === "landed" ? 1 : chuteY), P.pos.z - (P.phase === "landed" ? 9 * (1 - P.open) : 0)); P.chute.scale.set(.2 + .8 * P.open, P.phase === "landed" ? .1 + .9 * P.open : .25 + .75 * P.open, .2 + .8 * P.open); P.chute.rotation.z = sway;
    const a = P.lines.geometry.attributes.position; for (let i = 0; i < 8; i++) { const ang = i / 8 * 6.28, r = 6.5 * P.chute.scale.x; a.setXYZ(i * 2, P.chute.position.x + Math.cos(ang) * r, P.chute.position.y + 2, P.chute.position.z + Math.sin(ang) * r); a.setXYZ(i * 2 + 1, P.pos.x, P.pos.y + 2, P.pos.z); } a.needsUpdate = true; P.lines.visible = P.phase !== "landed" && P.open > .1;
    if (P.phase === "landed" && P.t > 9) { [P.chute, P.lines].forEach(m => scene.remove(m)); if (P.person && P.cr) P.cr.remove(P.person); return false; }
    return true; }
  function update(dt, t, env = {}) { const s = Math.min(.05, dt), scroll = env.scroll || 0, q = Q();
    FL.forEach(f => { if (f.life <= 0) return; f.life -= s; const u = f.life / f.max; f.s.material.opacity = Math.max(0, u); if (f.life <= 0) f.s.visible = false; });
    LT.forEach(L => { if (L.life <= 0) { L.l.intensity = 0; return; } L.life -= s; L.l.intensity *= .55; });
    for (let i = crashes.length - 1; i >= 0; i--) { const c = crashes[i], o = c.obj; c.t += s;
      if (c.phase === "fall") { const p = o.position;
        if (c.kind === "heli") { c.vel.y = Math.max(-150, c.vel.y - 60 * s); c.spin.y = Math.min(5, c.spin.y * 1.0 + Math.sign(c.spin.y) * 1.2 * s); c.vel.x = Math.cos(c.t * 2.2) * 30; if (c.rotor) c.rotor.rotation.y += 22 * s; }
        else if (c.kind === "ufo") { c.vel.y = Math.max(-220, c.vel.y - 140 * s); c.wob += s; o.rotation.x = Math.sin(c.wob * 9) * (.15 + c.wob * .25); o.rotation.z = Math.cos(c.wob * 7) * (.15 + c.wob * .25); if (fx.sparks && Math.random() < s * 14) fx.sparks(p, V2.set(0, 1, 0), null, c.k, 6); }
        else c.vel.y = Math.max(c.kind === "jet" ? -280 : -170, c.vel.y - (c.kind === "jet" ? 170 : 90) * s);
        if (c.kind === "apex" && Math.random() < s * 10) { fx.glow(p, 40 * c.k, [1, .7, .3], 1); if (fx.sparks) fx.sparks(p, V2.set(0, -1, 0), null, c.k, 10); }   // thrusters sputter
        c.vel.z += (scroll - c.vel.z) * s * .5; p.addScaledVector(c.vel, s);
        if (c.kind !== "ufo") { o.rotation.x += c.spin.x * s; o.rotation.y += c.spin.y * s; o.rotation.z += c.spin.z * s; } else o.rotation.y += c.spin.y * s;
        burnTrail(c, s);
        if (c.eject && !c.ejected && c.t > .3) { c.ejected = true; eject(c); }
        if (p.y <= c.ground + 4 * c.k) { impact(c); if (c.kind === "apex") { fx.boom(p, c.k * 2.4); fx.boom(V.copy(p).add(V2.set(30, 5, -20)), c.k * 1.6); } } }
      else { o.position.z += scroll * s; c.t += 0;
        const life = q.debris >= 1 ? 7 : 4; if (Math.random() < s * 18 * Math.max(0, 1 - c.t / life)) fx.emit(V.copy(o.position).add(V2.set((Math.random() - .5) * 10 * c.k, 2, (Math.random() - .5) * 10 * c.k)), V2.set((Math.random() - .5) * 6, 18, scroll), 3, 6 * c.k, 26 * c.k, [.2, .19, .18], [.08, .08, .08], .7, false, 0, .3, 6);
        if (c.t < life * .5 && Math.random() < s * 30) fx.emit(V.copy(o.position).add(V2.set((Math.random() - .5) * 8 * c.k, 1, (Math.random() - .5) * 8 * c.k)), V2.set(0, 14, scroll), .5, 6 * c.k, 2 * c.k, [1, .8, .35], [1, .3, .05], 1, true, 0, 0, 12);
        o.traverse(n => { if (n.isMesh && n.material) [].concat(n.material).forEach(m => { if (m.emissive) m.emissiveIntensity = Math.max(0, .6 * (1 - c.t / life)) * (.7 + .3 * Math.sin(t * 9 + i)); }); });
        if (c.t > life) o.position.y -= s * 6 * c.k;
        if (c.t > life + 2.5 || o.position.z > (env.cullZ || 1e9)) { scene.remove(o); o.traverse(n => { if (n.isMesh) [].concat(n.material).forEach(m => m.dispose()); }); crashes.splice(i, 1); } } }
    for (let i = scorches.length - 1; i >= 0; i--) { const S = scorches[i]; S.t += s; S.m.position.z += scroll * s; if (S.t > 14 || S.m.position.z > (env.cullZ || 1e9)) { scene.remove(S.m); S.m.geometry.dispose(); scorches.splice(i, 1); } }
    for (let i = pilots.length - 1; i >= 0; i--) if (!updPilot(pilots[i], s, t, scroll)) pilots.splice(i, 1); }
  return { muzzle, crash, update, _c: crashes, stats: () => ({ crashes: crashes.length, pilots: pilots.length }) };
}
