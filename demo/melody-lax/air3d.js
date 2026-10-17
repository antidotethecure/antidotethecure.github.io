/* Melody flight game: aircraft detail + damage for the chase view (2026-10-16, Antidote: "a little bit more detail and make
   sure when they get hit with bullets, the wounds actually have damage and smoke and fire coming out").
   buildAirliner(THREE, {livery})  the player's twin-jet (or a grey enemy airliner): panel lines, doors, windows, cockpit glass,
                                   gear doors, flap lines, engines with spinning fans, gold intake lips, Melody wine tail.
                                   Nose = +Z, wingspan ~34 model units; returns named points for lights, exhausts and wounds.
   makeFX(THREE, scene)            one pooled billboard particle system (2 draw calls: smoke + additive fire/glow) for smoke
                                   trails, flames, embers, explosions and one-frame light glows (nav lights, strobes).
   makeDamage(THREE, fx, obj, pts) wounds on an aircraft: each hit leaves a scorched hole at a spot on the airframe, then the
                                   spot keeps trailing smoke; deeper damage adds flickering fire, low health = engine fire with
                                   black smoke. Used by melody3d.js and 3d-looks/look2.js. */
export function buildAirliner(THREE, O = {}) {
  const TAU = Math.PI * 2, enemy = O.livery === "enemy";
  const mkc = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
  const canTex = (c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  const WINE = enemy ? "#3b4250" : "#a33645", GOLD = enemy ? "#9aa3b0" : "#d4af37";
  // fuselage skin: u = around (0 belly, .25 / .75 sides, .5 crown), v = tail (bottom of canvas) → nose (top)
  const c = mkc(1024, 512), x = c.getContext("2d");
  x.fillStyle = enemy ? "#c9ced6" : "#f7f7f4"; x.fillRect(0, 0, 1024, 512);
  x.fillStyle = enemy ? "#9ea4ad" : "#d7dbe1"; x.fillRect(0, 0, 90, 512); x.fillRect(934, 0, 90, 512);           // belly
  x.strokeStyle = "rgba(90,96,110,.28)"; x.lineWidth = 1.2;
  for (let v = 18; v < 512; v += 34) { x.beginPath(); x.moveTo(0, v); x.lineTo(1024, v); x.stroke(); }          // frame seams (rings)
  for (const u of [.1, .19, .31, .4, .6, .69, .81, .9]) { x.beginPath(); x.moveTo(u * 1024, 0); x.lineTo(u * 1024, 512); x.stroke(); }   // stringer seams
  x.strokeStyle = "rgba(70,74,86,.55)"; x.lineWidth = 2;
  [[40, 150, 66], [944, 150, 66], [30, 300, 50], [954, 300, 50]].forEach(([u, v, h]) => x.strokeRect(u, v, 50, h));   // main + nose gear doors
  [[.25, 1], [.75, -1]].forEach(([u, d]) => { const X = u * 1024;
    x.fillStyle = WINE; x.fillRect(X + d * 6 - 10, 0, 20, 512);                                                      // cheatline
    x.fillStyle = GOLD; x.fillRect(X - d * 12 - 3, 0, 6, 512);                                                       // gold pinstripe
    x.fillStyle = "#1a2232"; for (let v = 70; v < 448; v += 11) if (Math.abs(v - 256) > 9) { x.beginPath(); x.roundRect ? x.roundRect(X + d * 30 - 5, v, 10, 6.5, 3) : x.rect(X + d * 30 - 5, v, 10, 6.5); x.fill(); }
    x.strokeStyle = "rgba(60,64,76,.8)"; x.lineWidth = 2; [52, 246, 452].forEach(v => x.strokeRect(X + d * 30 - 9, v, 18, 22));   // doors
    if (!enemy) { x.save(); x.translate(X + d * 52, 120); x.rotate(-d * Math.PI / 2); x.fillStyle = GOLD; x.font = "italic 900 30px Georgia,serif"; x.textAlign = "center"; x.fillText("Melody", 0, 10); x.restore(); } });
  const skinT = canTex(c);
  const std = (col, o) => new THREE.MeshStandardMaterial(Object.assign({ color: col, roughness: .32, metalness: .15 }, o || {}));
  const mats = { skin: std(0xffffff, { map: skinT, roughness: .28 }), white: std(enemy ? 0xc9ced6 : 0xf3f3f0), wine: std(new THREE.Color(WINE).getHex(), { roughness: .4 }),
    gold: std(new THREE.Color(GOLD).getHex(), { roughness: .22, metalness: .85, emissive: enemy ? 0 : 0x3a2800, emissiveIntensity: .35 }), grey: std(0xb8bdc6, { roughness: .3, metalness: .55 }),
    dark: std(0x22262e, { roughness: .5, metalness: .4 }), glass: std(0x0d1420, { roughness: .05, metalness: .9 }), fan: std(0xd5d9de, { roughness: .2, metalness: .9 }), hot: new THREE.MeshBasicMaterial({ color: 0xff8a3a, toneMapped: false }) };
  const g = new THREE.Group();
  const add = (geo, mat, px, py, pz) => { const m = new THREE.Mesh(geo, mat); m.position.set(px || 0, py || 0, pz || 0); m.castShadow = true; g.add(m); return m; };
  const merge = (parts) => { const pos = [], nor = []; parts.forEach(([geo, m]) => { const q = geo.index ? geo.toNonIndexed() : geo.clone(); q.applyMatrix4(m);
      if (m.determinant() < 0) { const a = q.attributes.position.array; for (let i = 0; i < a.length; i += 9) for (let j = 0; j < 3; j++) { const t = a[i + 3 + j]; a[i + 3 + j] = a[i + 6 + j]; a[i + 6 + j] = t; } }
      q.computeVertexNormals(); pos.push(...q.attributes.position.array); nor.push(...q.attributes.normal.array); });
    const o = new THREE.BufferGeometry(); o.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); o.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); return o; };
  const M4 = (px, py, pz, sx, rx, ry, rz) => new THREE.Matrix4().compose(new THREE.Vector3(px, py, pz), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0)), new THREE.Vector3(sx || 1, 1, 1));
  const plan = (pts) => { const sh = new THREE.Shape(); sh.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) sh.lineTo(pts[i][0], pts[i][1]); sh.closePath(); return sh; };
  const slab = (sh, t, dih) => { const geo = new THREE.ExtrudeGeometry(sh, { depth: t, bevelEnabled: false }); geo.rotateX(Math.PI / 2); geo.translate(0, t / 2, 0); const a = geo.attributes.position; for (let i = 0; i < a.count; i++) a.setY(i, a.getY(i) + Math.abs(a.getX(i)) * (dih || 0)); return geo; };
  // fuselage, nose, tail cone, cockpit glass, wing-body fairing
  const fus = new THREE.CylinderGeometry(2, 2, 27, 32, 1, true); fus.rotateX(Math.PI / 2); add(fus, mats.skin);
  const nose = new THREE.SphereGeometry(2, 28, 14, 0, TAU, 0, Math.PI / 2); nose.rotateX(Math.PI / 2); nose.scale(1, 1, 1.9); add(nose, mats.white, 0, 0, 13.5);
  const tail = new THREE.CylinderGeometry(2, .42, 8, 28, 1, true); tail.rotateX(Math.PI / 2); add(tail, mats.white, 0, .25, -17.5);
  add(merge([[new THREE.BoxGeometry(1.15, .55, 1.4), M4(-.75, .95, 15.6, 1, -.55, -.32)], [new THREE.BoxGeometry(1.15, .55, 1.4), M4(.75, .95, 15.6, 1, -.55, .32)], [new THREE.BoxGeometry(.9, .5, 1.2), M4(-1.55, .55, 14.9, 1, -.3, -.9)], [new THREE.BoxGeometry(.9, .5, 1.2), M4(1.55, .55, 14.9, 1, -.3, .9)]]), mats.glass);
  const fair = new THREE.CapsuleGeometry(1.6, 9, 4, 12); fair.rotateX(Math.PI / 2); fair.scale(1.35, .7, 1); add(fair, mats.white, 0, -1.55, -.5);
  // wings (dihedral) with slats, flap lines and winglets; tailplanes
  const wing = slab(plan([[1.2, 4], [17, -6.6], [17, -8.4], [1.2, -3.4]]), .42, .075);
  add(merge([[wing, M4(0, -.9, 0)], [wing, M4(0, -.9, 0, -1)]]), mats.white);
  const flapLines = [], slats = [];
  for (const s of [-1, 1]) { for (const u of [.3, .55, .8]) { const xw = 1.2 + u * 15.8, zt = -3.4 - u * 5; flapLines.push([new THREE.BoxGeometry(.12, .5, 2.4), M4(s * xw, -.9 + xw * .075 + .02, zt + 1.1)]); }
    flapLines.push([new THREE.BoxGeometry(15.4, .46, .14), M4(s * 9.2, -.9 + 9.2 * .075 + .02, -4.75, 1, 0, s * .307, 0)]);
    slats.push([new THREE.BoxGeometry(15.6, .5, .55), M4(s * 9.1, -.9 + 9.1 * .075, -1.15, 1, 0, s * .59, 0)]); }
  add(merge(flapLines), mats.dark, 0, 0, 0).castShadow = false; add(merge(slats), mats.grey).castShadow = false;
  const stab = slab(plan([[.4, -15.2], [6.6, -19.6], [6.6, -21.2], [.4, -18.6]]), .3, .05);
  add(merge([[stab, M4(0, .7, 0)], [stab, M4(0, .7, 0, -1)]]), mats.white);
  const fin = new THREE.ExtrudeGeometry(plan([[-12.6, 1.4], [-21.6, 1.4], [-22.6, 9.6], [-19.4, 9.6]]), { depth: .4, bevelEnabled: false }); fin.rotateY(-Math.PI / 2); fin.translate(.2, 0, 0);
  const wl = new THREE.ExtrudeGeometry(plan([[-6.6, 0], [-8.4, 0], [-8.9, 2.6], [-7.8, 2.6]]), { depth: .22, bevelEnabled: false }); wl.rotateY(-Math.PI / 2);
  const tipY = -.9 + 17 * .075 + .2;
  add(merge([[fin, M4(0, 0, 0)], [wl, M4(17.05, tipY, 0)], [wl, M4(-16.83, tipY, 0)]]), mats.wine);
  const lz = 19.4 - 12.6, ly = 9.6 - 1.4, lead = new THREE.CylinderGeometry(.26, .26, 1, 8).applyMatrix4(new THREE.Matrix4().makeScale(1, Math.hypot(lz, ly), 1)).applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.atan2(lz, ly))).translate(0, (1.4 + 9.6) / 2, -(12.6 + 19.4) / 2);
  const ENG = [-6.4, 6.4], ey = -2.3, ez = 1.6, lip = new THREE.TorusGeometry(1.02, .17, 10, 26);
  add(merge([[lead, M4(0, 0, 0)]].concat(ENG.map(e => [lip, M4(e, ey, ez + 2.3)]))), mats.gold);
  if (!enemy) { const nc = mkc(128, 128), nx = nc.getContext("2d"); nx.fillStyle = "#e6c25a"; nx.font = "900 104px Georgia,serif"; nx.textAlign = "center"; nx.textBaseline = "middle"; nx.fillText("♪", 64, 70);
    const noteM = new THREE.MeshStandardMaterial({ map: canTex(nc), transparent: true, alphaTest: .3, roughness: .3, metalness: .5, emissive: 0x6a4800, emissiveIntensity: .6, side: THREE.DoubleSide });
    [-1, 1].forEach(s => { const ng = new THREE.PlaneGeometry(3.8, 3.8); ng.rotateY(s * Math.PI / 2); add(ng, noteM, s * .26, 5.3, -19.1).castShadow = false; }); }
  // engines: nacelles, pylons, dark intakes, spinning fans (blades + spinner), exhaust cones with a hot ring
  const nac = new THREE.LatheGeometry([new THREE.Vector2(.98, 2.3), new THREE.Vector2(1.12, 1.4), new THREE.Vector2(1.08, -1.2), new THREE.Vector2(.82, -2.3)], 28); nac.rotateX(Math.PI / 2);
  add(merge(ENG.map(e => [nac, M4(e, ey, ez)]).concat(ENG.map(e => [new THREE.BoxGeometry(.34, 1.3, 3.8), M4(e, ey + 1.05, ez - .4)]))), mats.white);
  const inner = new THREE.CylinderGeometry(.97, .97, .6, 24, 1, true); inner.rotateX(Math.PI / 2);
  add(merge(ENG.map(e => [inner, M4(e, ey, ez + 1.95)]).concat(ENG.map(e => [new THREE.ConeGeometry(.55, 1.6, 16).rotateX(-Math.PI / 2), M4(e, ey, ez - 3)]))), mats.dark).castShadow = false;
  add(merge(ENG.map(e => [new THREE.TorusGeometry(.62, .08, 6, 20), M4(e, ey, ez - 2.35)])), mats.hot).castShadow = false;
  const bladeG = merge(Array.from({ length: 16 }, (_, i) => [new THREE.BoxGeometry(.16, .9, .05).translate(0, .5, 0), M4(0, 0, 0, 1, 0, .35, i / 16 * TAU)]).concat([[new THREE.ConeGeometry(.3, .7, 14).rotateX(Math.PI / 2), M4(0, 0, .25)]]));
  const fans = ENG.map(e => { const f = new THREE.Mesh(bladeG, mats.fan); f.position.set(e, ey, ez + 1.85); g.add(f); return f; });
  // gear stays retracted; doors are drawn in the skin. Centre the airframe, report named points (model units, after centring)
  const box = new THREE.Box3().setFromObject(g), ctr = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
  g.position.sub(ctr); const node = new THREE.Group(); node.add(g); const off = g.position.clone(), P = (px, py, pz) => new THREE.Vector3(px, py, pz).add(off);
  const pts = { eng: ENG.map(e => P(e, ey, ez - 3.9)), tipL: P(17.25, tipY + .3, -7.6), tipR: P(-17.25, tipY + .3, -7.6), tail: P(0, .4, -21.7), beaconTop: P(0, 2.15, 1), beaconBot: P(0, -2.25, -2),
    land: [P(-2.4, -1.3, 3), P(2.4, -1.3, 3)], muzzle: [P(-7.6, -1.4, 3.2), P(7.6, -1.4, 3.2)],
    gearLow: P(0, -4.85, 0).y,
    wound: [P(9.5, -.1, -3.6), P(-9.5, -.1, -3.6), P(6.4, ey + .2, ez + .4), P(-6.4, ey + .2, ez + .4), P(1.9, .4, -6), P(-1.9, .4, -9), P(13.5, .2, -5.6), P(-13.5, .2, -5.6), P(0, 5, -18.4)] };
  // landing gear (added after the bbox so the model's size/scale doesn't change): nose leg + two 4-wheel main bogies on hinges.
  // gear(k): 1 = down and locked, 0 = retracted (mains swing inward into the belly, the nose leg folds forward); hidden when up
  const tire = new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: .85 }), strutM = new THREE.MeshStandardMaterial({ color: 0xc9cdd3, roughness: .35, metalness: .7 });
  const legs = [];
  const leg = (x, y, z, len, wr, bogie) => { const pv = new THREE.Group(); pv.position.set(x, y, z); g.add(pv);
    const st = new THREE.Mesh(new THREE.CylinderGeometry(.13, .16, len, 8).translate(0, -len / 2, 0), strutM); st.castShadow = true; pv.add(st);
    const wg = new THREE.CylinderGeometry(wr, wr, .3, 16).rotateZ(Math.PI / 2), hub = new THREE.CylinderGeometry(wr * .5, wr * .5, .32, 10).rotateZ(Math.PI / 2);
    const ws = bogie ? [[-.3, -.55], [.3, -.55], [-.3, .55], [.3, .55]] : [[-.24, 0], [.24, 0]];
    if (bogie) { const b = new THREE.Mesh(new THREE.BoxGeometry(.18, .18, 1.5), strutM); b.position.y = -len; pv.add(b); }
    ws.forEach(([wx, wz]) => { const w = new THREE.Mesh(wg, tire); w.position.set(wx, -len, wz); w.castShadow = true; pv.add(w); const h = new THREE.Mesh(hub, strutM); h.position.copy(w.position); pv.add(h); });
    legs.push(pv); return pv; };
  const mL = leg(2.7, -2.3, -1.4, 4.85 - 2.3 - .55, .55, true), mR = leg(-2.7, -2.3, -1.4, 4.85 - 2.3 - .55, .55, true), nz = leg(0, -1.7, 10.2, 4.85 - 1.7 - .42, .42, false);
  let gearK = 0; const gear = (k) => { k = Math.max(0, Math.min(1, k)); if (k === gearK) return; gearK = k; const r = (1 - k) * Math.PI / 2;
    mL.rotation.z = -r; mR.rotation.z = r; nz.rotation.x = -r; legs.forEach(l => { l.visible = k > .02; }); };
  legs.forEach(l => { l.visible = false; });
  node.traverse(n => { if (n.isMesh) n.material.userData.keep = 1; });
  return { node, size, pts, fans, mats, gear, spin(t) { fans.forEach((f, i) => { f.rotation.z = t * (i ? 41 : -43); }); } };
}

/* ---------- one billboard particle system: smoke (normal blend) + fire/glow (additive) ---------- */
export function makeFX(THREE, scene, O = {}) {
  const MAX = O.max || 1400;
  const c = document.createElement("canvas"); c.width = 256; c.height = 128; const x = c.getContext("2d");
  // slot 0: a lumpy smoke puff · slot 1: a soft round glow
  let s = 3; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < 22; i++) { const cx = 64 + (r() - .5) * 60, cy = 64 + (r() - .5) * 60, rr = 16 + r() * 26, gr = x.createRadialGradient(cx, cy, 0, cx, cy, rr); gr.addColorStop(0, "rgba(255,255,255,.55)"); gr.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = gr; x.beginPath(); x.arc(cx, cy, rr, 0, Math.PI * 2); x.fill(); }
  x.globalCompositeOperation = "destination-in"; let gr = x.createRadialGradient(64, 64, 20, 64, 64, 63); gr.addColorStop(0, "#fff"); gr.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); x.globalCompositeOperation = "source-over";
  gr = x.createRadialGradient(192, 64, 0, 192, 64, 63); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(.3, "rgba(255,255,255,.55)"); gr.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = gr; x.fillRect(128, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  const VS = `attribute vec4 iP; attribute vec4 iC; attribute float iSlot; varying vec2 vUv; varying vec4 vC;
    void main(){ vec3 R=vec3(viewMatrix[0][0],viewMatrix[1][0],viewMatrix[2][0]), U=vec3(viewMatrix[0][1],viewMatrix[1][1],viewMatrix[2][1]);
      float a=iP.w*6.2831; float sz=length(position.xy)>0.0?1.0:1.0; vec2 q=position.xy*iC.w; q=vec2(q.x*cos(a)-q.y*sin(a), q.x*sin(a)+q.y*cos(a));
      vec3 p=iP.xyz+R*q.x+U*q.y; vUv=vec2((uv.x+iSlot)*0.5, uv.y); vC=iC; gl_Position=projectionMatrix*viewMatrix*vec4(p,1.0); }`;
  // iC = rgb + size; alpha lives in a separate attribute
  const mk = (blending) => { const base = new THREE.PlaneGeometry(1, 1), g = new THREE.InstancedBufferGeometry(); g.index = base.index; g.setAttribute("position", base.getAttribute("position")); g.setAttribute("uv", base.getAttribute("uv"));
    const P = new Float32Array(MAX * 4), C = new Float32Array(MAX * 4), A = new Float32Array(MAX), S = new Float32Array(MAX);
    const aP = new THREE.InstancedBufferAttribute(P, 4), aC = new THREE.InstancedBufferAttribute(C, 4), aA = new THREE.InstancedBufferAttribute(A, 1), aS = new THREE.InstancedBufferAttribute(S, 1);
    [aP, aC, aA, aS].forEach(a => a.setUsage(THREE.DynamicDrawUsage)); g.setAttribute("iP", aP); g.setAttribute("iC", aC); g.setAttribute("iA", aA); g.setAttribute("iSlot", aS);
    const m = new THREE.ShaderMaterial({ uniforms: { map: { value: tex } }, vertexShader: VS.replace("varying vec4 vC;", "attribute float iA; varying vec4 vC; varying float vA;").replace("vC=iC;", "vC=iC; vA=iA;"),
      fragmentShader: "uniform sampler2D map; varying vec2 vUv; varying vec4 vC; varying float vA; void main(){ vec4 t=texture2D(map,vUv); gl_FragColor=vec4(t.rgb*vC.rgb, t.a*vA); if(gl_FragColor.a<.004) discard; }",
      transparent: true, depthWrite: false, blending });
    const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = blending === THREE.AdditiveBlending ? 140 : 130; scene.add(mesh); return { g, P, C, A, S, aP, aC, aA, aS, n: 0, mesh }; };
  const SM = mk(THREE.NormalBlending), AD = mk(THREE.AdditiveBlending);
  const parts = []; const free = [];
  const lerp = (a, b, u) => a + (b - a) * u;
  // emit: pos (V3), vel (V3, units/s), life s, size0 → size1, colour0 → colour1 ([r,g,b]), alpha, additive, slot (0 puff, 1 glow), drag, rise
  function emit(p, v, life, s0, s1, c0, c1, a, add, slot, drag, rise) { if (parts.length >= MAX * 1.6) return; const o = free.pop() || {};
    o.x = p.x; o.y = p.y; o.z = p.z; o.vx = v.x; o.vy = v.y; o.vz = v.z; o.age = 0; o.life = life; o.s0 = s0; o.s1 = s1; o.c0 = c0; o.c1 = c1 || c0; o.a = a; o.add = add; o.slot = slot || 0; o.drag = drag || 0; o.rise = rise || 0; o.rot = Math.random(); o.vr = (Math.random() - .5) * .25;
    parts.push(o); }
  const glows = [];
  function glow(p, size, col, a) { glows.push(p.x, p.y, p.z, size, col[0], col[1], col[2], a); }
  const darks = []; function dark(p, size, a) { darks.push(p.x, p.y, p.z, size, a); }   // a one-frame scorch spot (normal blend)
  function put(B, x, y, z, rot, r, g, b, size, a, slot) { if (B.n >= MAX) return; const i = B.n++; B.P[i * 4] = x; B.P[i * 4 + 1] = y; B.P[i * 4 + 2] = z; B.P[i * 4 + 3] = rot; B.C[i * 4] = r; B.C[i * 4 + 1] = g; B.C[i * 4 + 2] = b; B.C[i * 4 + 3] = size; B.A[i] = a; B.S[i] = slot; }
  function update(dt) { const s = Math.min(.05, dt); SM.n = AD.n = 0;
    for (let i = parts.length - 1; i >= 0; i--) { const o = parts[i]; o.age += s; if (o.age >= o.life) { free.push(o); parts[i] = parts[parts.length - 1]; parts.pop(); continue; }
      const k = Math.exp(-o.drag * s); o.vx *= k; o.vz *= k; o.vy = o.vy * k + o.rise * s; o.x += o.vx * s; o.y += o.vy * s; o.z += o.vz * s; o.rot += o.vr * s;
      const u = o.age / o.life, fade = Math.min(1, u * 8) * (1 - u) * (1 - u) * 1.3;
      put(o.add ? AD : SM, o.x, o.y, o.z, o.rot, lerp(o.c0[0], o.c1[0], u), lerp(o.c0[1], o.c1[1], u), lerp(o.c0[2], o.c1[2], u), lerp(o.s0, o.s1, u), o.a * fade, o.slot); }
    for (let i = 0; i < glows.length; i += 8) put(AD, glows[i], glows[i + 1], glows[i + 2], 0, glows[i + 4], glows[i + 5], glows[i + 6], glows[i + 3], glows[i + 7], 1);
    glows.length = 0; for (let i = 0; i < darks.length; i += 5) put(SM, darks[i], darks[i + 1], darks[i + 2], 0, .07, .05, .045, darks[i + 3], darks[i + 4], 1); darks.length = 0;
    [SM, AD].forEach(B => { B.g.instanceCount = B.n; [B.aP, B.aC, B.aA, B.aS].forEach(a => { a.needsUpdate = true; a.clearUpdateRanges && a.clearUpdateRanges(); }); }); }
  function clear() { parts.length = 0; glows.length = 0; }
  // a full explosion at p (world units scale k): flash, fireballs, smoke column, embers
  const V = new THREE.Vector3(), P2 = new THREE.Vector3();
  function boom(p, k, wind) { const w = wind || V.set(0, 0, 0), wx = w.x, wy = w.y, wz = w.z;
    glow(p, 120 * k, [1, .9, .7], 1);
    emit(p, V.set(wx, wy, wz), .35, 30 * k, 110 * k, [1, .95, .8], [1, .6, .2], 1, true, 1);
    for (let i = 0; i < 18; i++) { const a = Math.random() * 6.283, e = (Math.random() - .3) * 1.4, sp = (8 + Math.random() * 26) * k;
      emit(P2.copy(p).add(V.set(Math.cos(a) * 3 * k, Math.random() * 3 * k, Math.sin(a) * 3 * k)), V.set(wx + Math.cos(a) * sp, wy + e * sp, wz + Math.sin(a) * sp), .7 + Math.random() * .6, 14 * k, 40 * k, [1, .78, .35], [.9, .25, .05], 1, true, 0, 2.2, 6 * k);
      emit(P2, V.set(wx + Math.cos(a) * sp * .6, wy + e * sp * .5, wz + Math.sin(a) * sp * .6), 2.2 + Math.random() * 1.6, 12 * k, 46 * k, [.32, .29, .28], [.12, .11, .11], .6, false, 0, 1.3, 9 * k); }
    for (let i = 0; i < 26; i++) { const a = Math.random() * 6.283, sp = (30 + Math.random() * 60) * k; emit(p, V.set(wx + Math.cos(a) * sp, wy + (Math.random() * 1.4 - .2) * sp, wz + Math.sin(a) * sp), .6 + Math.random() * .8, 2.4 * k, .8 * k, [1, .85, .4], [1, .35, .1], 1, true, 1, .8, -40 * k); } }
  return { emit, glow, dark, update, clear, boom, meshes: [SM.mesh, AD.mesh] };
}

/* ---------- wounds on one aircraft ---------- */
export function makeDamage(THREE, fx, obj, spots, O = {}) {
  const scorchM = new THREE.MeshStandardMaterial({ color: 0x15110f, roughness: .9, emissive: 0x2a0a00, emissiveIntensity: .6 }), scorchG = new THREE.SphereGeometry(1, 10, 6);
  const W = [], V = new THREE.Vector3(), P = new THREE.Vector3(), used = new Set();
  let acc = 0;
  const D = {
    level: 0,   // 0..1 overall damage (drives engine fire + black smoke)
    hit(at) {   // a new wound at the nearest free spot to `at` (model-local) or a random free one
      let best = -1, bd = 1e9; spots.forEach((s, i) => { if (used.has(i)) return; const d = at ? s.distanceToSquared(at) : Math.random(); if (d < bd) { bd = d; best = i; } });
      if (best < 0) { const w = W[(Math.random() * W.length) | 0]; if (w) w.lv = Math.min(3, w.lv + 1); return; }
      used.add(best); const s = spots[best], m = new THREE.Mesh(scorchG, scorchM); m.position.copy(s); m.scale.set(1.25, .5, 1.25).multiplyScalar(O.hole || 1); m.rotation.set(Math.random(), Math.random() * 6, 0); obj.add(m);
      W.push({ p: s.clone(), lv: 1, m, ph: Math.random() * 6 }); },
    heal() { if (!W.length) return; const w = W.pop(); obj.remove(w.m); used.delete(spots.findIndex(s => s.equals(w.p))); },
    reset() { W.forEach(w => obj.remove(w.m)); W.length = 0; used.clear(); D.level = 0; },
    count: () => W.length,
    // per frame: k = world units per model unit, wind = world velocity of the air around the aircraft (units/s)
    update(dt, t, k, wind, engines) { const s = Math.min(.05, dt); acc += s; if (!W.length && D.level < .5) return;
      obj.updateMatrixWorld(true);
      W.forEach((w, i) => { P.copy(w.p); obj.localToWorld(P); const heavy = w.lv >= 2 || D.level > .55, fl = .6 + .4 * Math.sin(t * 23 + w.ph) * Math.sin(t * 7 + w.ph);
        // ember glow in the hole
        fx.glow(P, (2.2 + fl) * k, [1, .45, .12], .9);
        const smokeN = Math.random() < s * (14 + 10 * w.lv) ? 1 : 0;
        if (smokeN) fx.emit(P, V.set(wind.x + (Math.random() - .5) * 4 * k, wind.y + 2 * k, wind.z + (Math.random() - .5) * 4 * k), 1.4 + w.lv * .5, 1.6 * k, (7 + 4 * w.lv) * k, heavy ? [.2, .18, .17] : [.55, .53, .52], heavy ? [.08, .07, .07] : [.3, .3, .3], .75, false, 0, .4, 3 * k);
        if (heavy && Math.random() < s * 40) fx.emit(P, V.set(wind.x * .9, wind.y + 4 * k, wind.z * .9), .28, 3.2 * k * fl, .8 * k, [1, .82, .35], [1, .25, .05], 1, true, 0, 0, 8 * k);
      });
      // badly hurt: the engines burn and pour black smoke
      if (D.level > .6 && engines) engines.forEach((e, i) => { P.copy(e); obj.localToWorld(P); if (Math.random() < s * 32) { fx.emit(P, V.set(wind.x, wind.y + 3 * k, wind.z), 2.2, 2.5 * k, 14 * k, [.12, .11, .11], [.05, .05, .05], .85, false, 0, .35, 2 * k); }
        if (Math.random() < s * 50) fx.emit(P, V.set(wind.x * .95, wind.y, wind.z * .95), .3, 4 * k, 1 * k, [1, .8, .3], [1, .3, .05], 1, true, 0); });
    } };
  return D;
}
