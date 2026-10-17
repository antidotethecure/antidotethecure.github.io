/* engine3d/traffic.js — city traffic on a street grid: lanes, traffic signals, stops, turns, car-following, parked cars,
   headlights / brake lights / turn signals, and pedestrians who cross at the crosswalks on their walk phase.
   Cars: Kenney "Car Kit" (CC0) packed by tools/build-cars.mjs into assets/cars/cars.glb (11 vehicles, one merged mesh each,
   palette baked to vertex colours + a _PART mask: paint / glass / headlamp / tail lamp). One InstancedMesh per vehicle type for
   every car in every network; each car gets its own paint colour; lamps glow through the material.
     const tr = await makeTraffic(THREE, { loader, base, parent: scene, fx, quality: { density } })
     const net = tr.network(group, { avenues: [x…], streets: [z…], len, width, road: 36, lane: 8, cars: 24, parked: 20, crowd, rng })
     tr.update(camera, t, dt, { night, rain })   (simulates every live network, then fills the instances)
     net.dispose()
   Model: IDM car-following (accelerate to a desired speed, keep a time gap, brake smoothly for the car ahead or a red light),
   a fixed-cycle signal per intersection (avenues green → yellow → all-red → streets green → yellow → all-red), right/left turns
   along quadratic Bézier arcs, wrap-around at the network ends. */
export async function makeTraffic(THREE, O) {
  // O.procedural: the realistic procedural cars (engine3d/carmodels.js) instead of the Kenney toy pack
  const PROC = O.procedural ? (await import("./carmodels.js?v=e3n")).buildCars(THREE) : null;
  const g = PROC ? { scene: { traverse(fn) { PROC.forEach(c => { const geo = c.geo.clone(); geo.applyMatrix4(new THREE.Matrix4().makeScale(3.3 / SCK, 3.3 / SCK, 3.3 / SCK)); fn({ isMesh: true, name: c.name, geometry: geo, proc: c }); }); } } } : await O.loader.loadAsync(O.base + "cars.glb"), Q = Object.assign({ density: 1 }, O.quality || {});
  const TYPES = [], LEN = 15.5, SC = LEN / 2.55, SCK = SC;   // (procedural cars are in metres: 3.3 world units per metre)
  const keepPaint = new Set(["taxi", "police", "ambulance", "delivery"]);
  const WEIGHT = { sedan: 5, "sedan-sports": 2, "hatchback-sports": 3, suv: 4, "suv-luxury": 2, taxi: 1.2, van: 1.5, delivery: .8, truck: 1.4, police: .35, ambulance: .2 };
  const fx = O.fx, parent = O.parent;
  const paintCols = ["#e9e9ea", "#1d1f24", "#9aa1ab", "#7b1f2a", "#25467a", "#c9b48a", "#3e4148", "#f2f2ee", "#a8322f", "#5c6b54", "#2a6f9e", "#d9d2c3", "#0f3d2e", "#6e1a1a", "#bfc4cc"].map(h => new THREE.Color(h));
  g.scene.traverse(o => { if (!o.isMesh) return;
    const geo = o.geometry; geo.applyMatrix4(new THREE.Matrix4().makeScale(SC, SC, SC));
    const col = geo.attributes.color; if (!o.proc) for (let i = 0; i < col.count; i++) { const c = new THREE.Color().setRGB(col.getX(i), col.getY(i), col.getZ(i), THREE.SRGBColorSpace); col.setXYZ(i, c.r, c.g, c.b); }
    const MAX = 160; const ig = new THREE.InstancedBufferGeometry(); ig.index = geo.index; for (const k in geo.attributes) ig.setAttribute(k, geo.attributes[k]);
    const iP = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4), iL = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4); iP.setUsage(THREE.DynamicDrawUsage); iL.setUsage(THREE.DynamicDrawUsage); ig.setAttribute("iPaint", iP); ig.setAttribute("iLamp", iL);
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .38, metalness: .25, envMapIntensity: 1.3 });
    m.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute float _part; attribute vec4 iPaint; attribute vec4 iLamp; varying float vPart; varying vec4 vPaint; varying vec4 vLamp;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvPart = _part; vPaint = iPaint; vLamp = iLamp;");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying float vPart; varying vec4 vPaint; varying vec4 vLamp;")
        .replace("#include <color_fragment>", `#include <color_fragment>
          float pp = floor(vPart + .5);
          if (pp == 1.0 && (vPaint.a < .5 || vPaint.a > 1.5)) diffuseColor.rgb = vPaint.rgb * (.75 + .5 * dot(vColor.rgb, vec3(.33)));
          if (pp == 2.0) diffuseColor.rgb = vec3(.04, .06, .09);`)
        .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
          if (pp == 3.0) totalEmissiveRadiance += vec3(1.0, .93, .78) * vLamp.x * 3.0;
          if (pp == 4.0) totalEmissiveRadiance += vec3(1.0, .08, .05) * (.6 * vLamp.x + 3.2 * vLamp.y);`)
        .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nif (floor(vPart + .5) == 2.0) roughnessFactor = .05; if (floor(vPart + .5) == 5.0) roughnessFactor = .18; if (floor(vPart + .5) == 1.0 && vPaint.a > 1.5) roughnessFactor = .34; if (floor(vPart + .5) == 0.0) roughnessFactor = .7;")
        .replace("#include <metalnessmap_fragment>", "#include <metalnessmap_fragment>\nif (floor(vPart + .5) == 5.0) metalnessFactor = .95; if (floor(vPart + .5) == 1.0 && vPaint.a > 1.5) metalnessFactor = .85; if (floor(vPart + .5) == 2.0) metalnessFactor = .1; if (floor(vPart + .5) == 0.0) metalnessFactor = .05;"); };
    m.customProgramCacheKey = () => "e3-car2";
    const im = new THREE.InstancedMesh(ig, m, MAX); im.count = 0; im.frustumCulled = false; im.castShadow = true; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); parent.add(im);
    TYPES.push({ name: o.name, im, iP, iL, max: MAX, w: o.proc ? o.proc.w : WEIGHT[o.name] || 1, keep: o.proc ? (o.proc.keepMetal ? 2 : 0) : keepPaint.has(o.name) ? 1 : 0, pal: o.proc ? o.proc.pal.map(h => new THREE.Color(h)) : null, n: 0 }); });
  const totalW = TYPES.reduce((a, t) => a + t.w, 0); let TT = 0;
  const paintFor = (ti, R) => { const P = TYPES[ti].pal || paintCols; return P[(R() * P.length) | 0]; };
  const pickType = (R) => { let r = R() * totalW; for (let i = 0; i < TYPES.length; i++) { r -= TYPES[i].w; if (r <= 0) return i; } return 0; };
  // headlight pools on the road (additive, one draw)
  const poolTex = (() => { const c = document.createElement("canvas"); c.width = 32; c.height = 64; const x = c.getContext("2d"), gr = x.createLinearGradient(0, 64, 0, 0); gr.addColorStop(0, "rgba(255,255,255,.9)"); gr.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = gr; x.beginPath(); x.moveTo(12, 64); x.lineTo(20, 64); x.lineTo(32, 0); x.lineTo(0, 0); x.fill(); return new THREE.CanvasTexture(c); })();
  const POOLN = 400, pools = new THREE.InstancedMesh(new THREE.PlaneGeometry(10, 30).rotateX(-Math.PI / 2).translate(0, .35, 22), new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xfff1c8, opacity: .45, toneMapped: false }), POOLN);
  pools.count = 0; pools.frustumCulled = false; parent.add(pools);
  // signal heads: a pole + a lamp box per corner, the lamp colour changes with the phase
  const SIGN = 600, sigPole = new THREE.InstancedMesh(new THREE.CylinderGeometry(.35, .45, 16, 5).translate(0, 8, 0), new THREE.MeshStandardMaterial({ color: 0x2a2c33, roughness: .6 }), SIGN);
  const sigLamp = new THREE.InstancedMesh(new THREE.BoxGeometry(1.6, 4.2, 1.6).translate(0, 17.5, 0), new THREE.MeshBasicMaterial({ toneMapped: false }), SIGN); sigLamp.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(SIGN * 3), 3);
  [sigPole, sigLamp].forEach(m => { m.count = 0; m.frustumCulled = false; parent.add(m); });
  const nets = new Set(); const M4 = new THREE.Matrix4(), QY = new THREE.Quaternion(), YA = new THREE.Vector3(0, 1, 0), PV = new THREE.Vector3(), SV = new THREE.Vector3(1, 1, 1), WP = new THREE.Vector3(), FW = new THREE.Vector3(), RT = new THREE.Vector3();

  function network(group, S) {
    const R = S.rng || Math.random, road = S.road || 36, lw = S.lane || 8, len = S.len, width = S.width || 1800, AVE = S.avenues, STR = S.streets;
    const CYCLE = [["A", 9], ["Ay", 2.4], ["r", 1.2], ["S", 8], ["Sy", 2.4], ["r", 1.2]], CT = CYCLE.reduce((a, c) => a + c[1], 0), off = R() * CT;
    const phaseAt = (t, k) => { let u = ((t + off + k * 1.7) % CT + CT) % CT; for (const c of CYCLE) { if (u < c[1]) return c[0]; u -= c[1]; } return "r"; };
    // lanes: axis "z" (along an avenue at x = c) or "x" (along a street at z = c); dir ±1; right-hand traffic
    const lanes = []; AVE.forEach((x, i) => { lanes.push({ ax: "z", c: x - lw, d: 1, cross: STR, ext: len / 2, k: i }, { ax: "z", c: x + lw, d: -1, cross: STR, ext: len / 2, k: i }); });
    STR.forEach((z, i) => { lanes.push({ ax: "x", c: z + lw, d: 1, cross: AVE, ext: width / 2, k: i }, { ax: "x", c: z - lw, d: -1, cross: AVE, ext: width / 2, k: i }); });
    const laneFor = (ax, c, d) => lanes.find(l => l.ax === ax && l.d === d && Math.abs(l.c - (c + (ax === "z" ? -lw * d : lw * d))) < 1e-3);
    const cars = [], N = Math.round((S.cars || 24) * Q.density);
    for (let i = 0; i < N; i++) { const L = lanes[(R() * lanes.length) | 0]; cars.push({ L, s: (R() * 2 - 1) * L.ext * .95, v: 20 + R() * 20, v0: 40 + R() * 26, type: (TT = pickType(R)), paint: paintFor(TT, R), turn: null, plan: null, brake: 0, acc: 0, blink: 0 }); }
    // parked cars along the curbs (never in an intersection)
    const parked = []; for (let i = 0; i < Math.round((S.parked || 0) * Q.density); i++) { const x = AVE[(R() * AVE.length) | 0], sd = R() < .5 ? 1 : -1, z = (R() * 2 - 1) * len * .46;
      if (STR.some(sz => Math.abs(sz - z) < road * .5 + 14)) continue; parked.push({ x: x + sd * (road / 2 - 3.5), z, yaw: sd > 0 ? Math.PI : 0, type: (TT = pickType(R)), paint: paintFor(TT, R) }); }
    (S.parkedAt || []).forEach(p => parked.push({ x: p[0], z: p[1], yaw: p[2], type: (TT = pickType(R)), paint: paintFor(TT, R) }));
    // signal state per intersection (avenue i × street j)
    const sigState = (t, i, j) => phaseAt(t, i * 3 + j);
    const greenFor = (L, st) => (L.ax === "z" ? st === "A" : st === "S"), yellowFor = (L, st) => (L.ax === "z" ? st === "Ay" : st === "Sy");
    const pos = (L, s) => (L.ax === "z" ? [L.c, s] : [s, L.c]);
    const yawOf = (L) => (L.ax === "z" ? (L.d > 0 ? 0 : Math.PI) : (L.d > 0 ? Math.PI / 2 : -Math.PI / 2));
    function laneAhead(car) { let best = null, bd = 1e9; for (const o of cars) { if (o === car || o.turn || o.L !== car.L) continue; const d = (o.s - car.s) * car.L.d; if (d > 0 && d < bd) { bd = d; best = o; } } return [best, bd]; }
    // pedestrians who cross at the corners (engine3d crowd), waiting for the walk phase
    const peds = []; if (S.crowd) { const nP = Math.round((S.pedestrians || 10) * Q.density);
      for (let k = 0; k < nP; k++) { const i = (R() * AVE.length) | 0, j = (R() * STR.length) | 0, sx = R() < .5 ? -1 : 1, sz = R() < .5 ? -1 : 1, crossAve = R() < .5;
        const p = S.crowd.add({ style: "street", seed: (R() * 1e9) | 0 }); p.parent = group;
        peds.push({ p, i, j, sx, sz, crossAve, st: "wait", u: 0, sp: 9 + R() * 4, idle: ["idle", "phone", "text", "idle2", "talk"][(R() * 5) | 0], jit: (R() - .5) * 6 }); } }
    const edge = road / 2 + 5;
    function updPeds(t, dt) { for (const P of peds) { const ax = AVE[P.i], sz = STR[P.j];
        // corner position and the far corner across the road being crossed
        const x0 = ax + P.sx * edge, z0 = sz + P.sz * edge + P.jit * .3;
        const x1 = P.crossAve ? ax - P.sx * edge : x0, z1 = P.crossAve ? z0 : sz - P.sz * edge;
        const st = sigState(t, P.i, P.j), walk = P.crossAve ? (st === "S") : (st === "A");   // cross the avenue while the avenue has red
        if (P.st === "wait") { P.p.set(x0 + (P.crossAve ? 0 : P.jit * .2), 0, z0, P.crossAve ? (P.sx > 0 ? -Math.PI / 2 : Math.PI / 2) : (P.sz > 0 ? Math.PI : 0)); P.p.play(P.idle); if (walk) { P.st = "go"; P.u = 0; } }
        else { P.u += dt * P.sp / Math.hypot(x1 - x0, z1 - z0); const u = Math.min(1, P.u); P.p.set(x0 + (x1 - x0) * u, 0, z0 + (z1 - z0) * u, Math.atan2(x1 - x0, z1 - z0)); P.p.play(walk || u > .15 ? "walk" : "coverRun");
          if (u >= 1) { P.sx = P.crossAve ? -P.sx : P.sx; P.sz = P.crossAve ? P.sz : -P.sz; P.crossAve = Math.random() < .5; P.st = "wait"; P.idle = ["idle", "phone", "text", "idle2", "talk"][(Math.random() * 5) | 0]; } } } }
    function sim(t, dt) {
      for (const car of cars) {
        if (car.turn) { const T = car.turn; T.u += Math.max(4, car.v) * dt / T.len; car.v = Math.min(car.v + 20 * dt, 30); car.brake = 0;
          if (T.u >= 1) { car.L = T.to; car.s = T.s2; car.turn = null; car.blink = 0; } continue; }
        const L = car.L; let gap = 1e9, vLead = car.v;
        const [lead, d] = laneAhead(car); if (lead) { gap = d - LEN - 3; vLead = lead.v; }
        // next intersection on this lane
        let nc = null, nIdx = -1; for (let k = 0; k < L.cross.length; k++) { const c = L.cross[k], dd = (c - car.s) * L.d; if (dd > -road * .5 && (nc === null || dd < (nc - car.s) * L.d)) { nc = c; nIdx = k; } }
        if (nc !== null) { const stopS = nc - L.d * (road / 2 + 4), toStop = (stopS - car.s) * L.d, i = L.ax === "z" ? L.k : nIdx, j = L.ax === "z" ? nIdx : L.k, st = sigState(t, i, j);
          const stopNeeded = !greenFor(L, st) && !(yellowFor(L, st) && toStop < car.v * car.v / 90 + 2);
          if (toStop > 0 && stopNeeded && toStop < gap + 2) { gap = Math.max(0, toStop - 1); vLead = 0; }
          // decide a turn on the approach; start it at the stop line when the light allows
          if (!car.plan && toStop < 70 && toStop > 0) { const r = R(); car.plan = r < .2 ? "R" : r < .3 ? "L" : "S"; if (car.plan !== "S") car.blink = car.plan === "R" ? 1 : -1; }
          if (car.plan && car.plan !== "S" && toStop <= .5 && toStop > -3 && !stopNeeded) { const right = car.plan === "R";
            // target lane on the crossing road: right turn → the direction to the right of travel; left → to the left
            const dirX = L.ax === "z" ? (right ? -L.d : L.d) : 0, dirZ = L.ax === "x" ? (right ? L.d : -L.d) : 0, ax2 = L.ax === "z" ? "x" : "z", d2 = ax2 === "x" ? dirX : dirZ, c2 = nc;
            const to = laneFor(ax2, c2, d2) || lanes.find(l => l.ax === ax2 && l.d === d2 && Math.abs(l.c - c2) < lw * 1.5);
            if (to) { const [x0, z0] = pos(L, car.s), s2 = (L.ax === "z" ? L.c : L.c) + d2 * (road / 2 + 5) * 1, ex = ax2 === "x" ? [L.c + d2 * (road / 2 + 5), to.c] : [to.c, L.c + d2 * (road / 2 + 5)];
              const ctrl = ax2 === "x" ? [L.c, to.c] : [to.c, L.c]; const P0 = [x0, z0], P2 = ex; const len2 = Math.hypot(ctrl[0] - P0[0], ctrl[1] - P0[1]) + Math.hypot(P2[0] - ctrl[0], P2[1] - ctrl[1]);
              car.turn = { P0, P1: ctrl, P2, u: 0, len: len2 * .85, to, s2: ax2 === "x" ? P2[0] : P2[1] }; car.plan = null; continue; } car.plan = "S"; }
          if (toStop < -road) car.plan = null; }
        // IDM
        const A = 32, B = 46, s0 = 4, Tg = 1.1, dv = car.v - vLead, sStar = s0 + car.v * Tg + car.v * dv / (2 * Math.sqrt(A * B));
        let a = A * (1 - Math.pow(car.v / car.v0, 4)) - A * Math.pow(sStar / Math.max(gap, .5), 2); a = Math.max(-120, Math.min(A, a));
        car.acc = a; car.v = Math.max(0, car.v + a * dt); car.s += car.v * dt * L.d; car.brake = a < -6 || car.v < 1.5 ? 1 : 0;
        if (car.s * L.d > L.ext) car.s -= 2 * L.ext * L.d; }
      updPeds(t, dt); }
    const net = { group, cars, parked, lanes, peds, sim, AVE, STR, sigState, road, disposed: false,
      dispose() { net.disposed = true; nets.delete(net); peds.forEach(P => S.crowd && S.crowd.remove(P.p)); } };
    nets.add(net); return net;
  }

  let blinkT = 0;
  function update(camera, t, dt, env) {
    const night = env && env.night || 0, rain = env && env.rain || 0, heads = night > .25 || rain > .35;
    TYPES.forEach(T => T.n = 0); let pn = 0, sn = 0; blinkT = t;
    const put = (car, wx, wy, wz, yaw, lampH, lampB) => { const T = TYPES[car.type]; if (T.n >= T.max) return; const i = T.n++;
      QY.setFromAxisAngle(YA, yaw); T.im.setMatrixAt(i, M4.compose(PV.set(wx, wy, wz), QY, SV)); T.iP.setXYZW(i, car.paint.r, car.paint.g, car.paint.b, T.keep); T.iL.setXYZW(i, lampH, lampB, 0, 0); };
    for (const net of nets) { if (net.disposed) continue; const gpos = net.group.getWorldPosition(WP);
      if (Math.abs(gpos.z - camera.position.z) > 2600) continue;
      net.sim(t, Math.min(.05, dt));
      for (const car of net.cars) { let x, z, yaw;
        if (car.turn) { const T = car.turn, u = Math.min(1, T.u), a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u; x = a * T.P0[0] + b * T.P1[0] + c * T.P2[0]; z = a * T.P0[1] + b * T.P1[1] + c * T.P2[1];
          const dx = 2 * (1 - u) * (T.P1[0] - T.P0[0]) + 2 * u * (T.P2[0] - T.P1[0]), dz = 2 * (1 - u) * (T.P1[1] - T.P0[1]) + 2 * u * (T.P2[1] - T.P1[1]); yaw = Math.atan2(dx, dz); }
        else { const L = car.L; x = L.ax === "z" ? L.c : car.s; z = L.ax === "z" ? car.s : L.c; yaw = L.ax === "z" ? (L.d > 0 ? 0 : Math.PI) : (L.d > 0 ? Math.PI / 2 : -Math.PI / 2); }
        const wx = gpos.x + x, wz = gpos.z + z; put(car, wx, gpos.y, wz, yaw, heads ? 1 : 0, car.brake);
        FW.set(Math.sin(yaw), 0, Math.cos(yaw)); RT.set(FW.z, 0, -FW.x);
        if (heads && pn < POOLN) { QY.setFromAxisAngle(YA, yaw); pools.setMatrixAt(pn++, M4.compose(PV.set(wx, gpos.y, wz), QY, SV)); }
        if (fx) { const dist = Math.hypot(wx - camera.position.x, wz - camera.position.z); if (dist < 1500) {
          if (heads) for (const sd of [-1, 1]) fx.glow(PV.set(wx + FW.x * 7.8 + RT.x * 2.2 * sd, gpos.y + 2.6, wz + FW.z * 7.8 + RT.z * 2.2 * sd), 5.5, [1, .95, .82], .85);
          const br = car.brake ? 1 : heads ? .35 : 0; if (br) for (const sd of [-1, 1]) fx.glow(PV.set(wx - FW.x * 7.9 + RT.x * 2.3 * sd, gpos.y + 3, wz - FW.z * 7.9 + RT.z * 2.3 * sd), car.brake ? 5.5 : 3.5, [1, .1, .06], br);
          if (car.blink && ((t * 2.2) % 1) < .5) { const sd = car.blink; for (const f of [1, -1]) fx.glow(PV.set(wx + FW.x * 7.8 * f - RT.x * 3 * sd, gpos.y + 2.8, wz + FW.z * 7.8 * f - RT.z * 3 * sd), 4.5, [1, .6, .1], .95); } } } }
      for (const p of net.parked) put(p, gpos.x + p.x, gpos.y, gpos.z + p.z, p.yaw, 0, 0);
      // signal heads at the four corners of every intersection
      net.AVE.forEach((ax, i) => net.STR.forEach((sz, j) => { const st = net.sigState(t, i, j); for (const [cx, cz, along] of [[1, 1, 0], [-1, -1, 0], [1, -1, 1], [-1, 1, 1]]) { if (sn >= SIGN) return;
        const c = along ? (st === "S" ? [.1, 1.6, .4] : st === "Sy" ? [1.7, 1.1, .1] : [1.8, .08, .05]) : (st === "A" ? [.1, 1.6, .4] : st === "Ay" ? [1.7, 1.1, .1] : [1.8, .08, .05]);
        M4.makeTranslation(gpos.x + ax + cx * (net.road / 2 + 2), gpos.y, gpos.z + sz + cz * (net.road / 2 + 2)); sigPole.setMatrixAt(sn, M4); sigLamp.setMatrixAt(sn, M4); sigLamp.instanceColor.setXYZ(sn, c[0], c[1], c[2]); sn++; } })); }
    TYPES.forEach(T => { T.im.count = T.n; if (T.n) { T.im.instanceMatrix.needsUpdate = true; T.iP.needsUpdate = true; T.iL.needsUpdate = true; } });
    pools.count = pn; pools.instanceMatrix.needsUpdate = true; pools.material.opacity = .45 * Math.max(night, rain * .7);
    sigPole.count = sigLamp.count = sn; sigPole.instanceMatrix.needsUpdate = sigLamp.instanceMatrix.needsUpdate = true; sigLamp.instanceColor.needsUpdate = true;
  }
  return { network, update, nets, setQuality(q) { Object.assign(Q, q); }, stats: () => ({ nets: nets.size, cars: TYPES.reduce((a, T) => a + T.n, 0) }) };
}
