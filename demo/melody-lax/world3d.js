/* Melody flight game: the 3D GROUND for the chase view (2026-10-16, Antidote: "make sure you can see everything on the floor
   3D, the cars. You can see Melody Bar and Grill with the security outside with people in line ... you can even pass by my
   food review ... and see me in a Tesla or something, like something sneaky like an Easter egg").
   Low-altitude LA at golden hour/dusk, built from primitives in the game's own units (1 unit = 1 game px; your wingspan is
   ~86, you fly at 150): street grid with moving cars (headlights, taillights), lit buildings, palm trees, the LAX runway
   approach, a generic stadium, the hills, the beach and a pier, and Melody Bar & Grill itself (gold sign from the real logo,
   patio string lights, a security guard and a line of guests). The Easter egg: a roadside screen playing Antidote's Melody
   review and a white electric sedan with an ANTIDOTE plate cruising nearby. No real brands or logos except Melody.
   Cheap on phones: everything is instanced or merged per segment (~7 draw calls for a city block strip), nothing casts shadows.
   Used by melody3d.js (the game) and 3d-looks/look.js (the preview clip). makeWorld(THREE, {base}) → { segment(kind, len, seed, o) }. */
export function makeWorld(THREE, O = {}) {
  const TAU = Math.PI * 2, BASE = O.base || "";
  const rng = (seed) => { let s = (seed * 2654435761) | 0; return () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  const mkc = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
  const tex = (c, rep) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
  const img = (src) => { const t = new THREE.Texture(); t.colorSpace = THREE.SRGBColorSpace; const i = new Image(); i.onload = () => { t.image = i; t.needsUpdate = true; if (t.onReady) t.onReady(i); }; i.src = BASE + src; return t; };
  const XW = O.width || 2000, CX = 320, CZ = 230, ROAD = 36, SIDE = 9;   // ground width · street grid cell · road + sidewalk widths
  const AVE = [-800, -480, -160, 160, 480, 800];                          // avenues run along the flight (z); cross streets every CZ

  /* ---------- shared textures ---------- */
  const groundTex = (() => { const c = mkc(512, 368), x = c.getContext("2d"), sx = 512 / CX, sz = 368 / CZ, rw = ROAD * sx, rz = ROAD * sz, sw = SIDE * sx, swz = SIDE * sz;
    x.fillStyle = "#56544f"; x.fillRect(0, 0, 512, 368);                                                   // lots
    const R = rng(5); for (let i = 0; i < 90; i++) { x.fillStyle = R() < .5 ? "rgba(60,82,52,.55)" : "rgba(40,40,44,.35)"; x.fillRect(R() * 512, R() * 368, 8 + R() * 50, 8 + R() * 40); }
    x.fillStyle = "#8d8a84"; x.fillRect(0, 0, rw / 2 + sw, 368); x.fillRect(512 - rw / 2 - sw, 0, rw / 2 + sw, 368); x.fillRect(0, 0, 512, rz / 2 + swz); x.fillRect(0, 368 - rz / 2 - swz, 512, rz / 2 + swz);   // sidewalks
    x.fillStyle = "#2b2c31"; x.fillRect(0, 0, rw / 2, 368); x.fillRect(512 - rw / 2, 0, rw / 2, 368); x.fillRect(0, 0, 512, rz / 2); x.fillRect(0, 368 - rz / 2, 512, rz / 2);   // asphalt
    x.fillStyle = "#e3b93a"; x.fillRect(0, 0, 2, 368); x.fillRect(510, 0, 2, 368);                                                       // yellow centre lines
    x.fillStyle = "rgba(240,240,240,.8)"; for (let z = 30; z < 340; z += 26) { x.fillRect(rw * .25 - 1, z, 2, 12); x.fillRect(512 - rw * .25 - 1, z, 2, 12); }
    for (let i = 0; i < 6; i++) { x.fillRect(rw / 2 + 4 + i * 7, rz / 2 + 2, 4, swz + 6); x.fillRect(rw / 2 + 4 + i * 7, 368 - rz / 2 - swz - 8, 4, swz + 6); }   // crosswalks
    return tex(c, true); })();
  const winTex = (() => { const c = mkc(256, 256), x = c.getContext("2d"), e = mkc(256, 256), ex = e.getContext("2d"), R = rng(9);
    x.fillStyle = "#c9c2b6"; x.fillRect(0, 0, 256, 256); ex.fillStyle = "#000"; ex.fillRect(0, 0, 256, 256);
    for (let r = 0; r < 32; r++) for (let q = 0; q < 24; q++) { const px = 3 + q * 10.6, py = 3 + r * 8, lit = R() < .3;
      x.fillStyle = "#39404c"; x.fillRect(px, py, 6, 4.6); if (lit) { ex.fillStyle = R() < .7 ? "#ffcf8a" : "#cfe3ff"; ex.fillRect(px, py, 6, 4.6); } }
    for (let r = 0; r < 4; r++) { x.fillStyle = "rgba(0,0,0,.12)"; x.fillRect(0, r * 64, 256, 2); }
    return [tex(c, false), tex(e, false)]; })();
  const roofTex = (() => { const c = mkc(64, 64), x = c.getContext("2d"); x.fillStyle = "#77736c"; x.fillRect(0, 0, 64, 64); x.fillStyle = "#5f5b55"; x.fillRect(8, 8, 18, 12); x.fillRect(38, 30, 16, 18); x.strokeStyle = "#8b877f"; x.lineWidth = 3; x.strokeRect(1.5, 1.5, 61, 61); return tex(c, false); })();
  const glowTex = (() => { const c = mkc(64, 64), x = c.getContext("2d"), g = x.createRadialGradient(32, 32, 0, 32, 32, 31); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(.35, "rgba(255,255,255,.5)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); return t; })();
  const coneTex = (() => { const c = mkc(32, 64), x = c.getContext("2d"), g = x.createLinearGradient(0, 64, 0, 0); g.addColorStop(0, "rgba(255,255,255,.9)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 32, 64); return new THREE.CanvasTexture(c); })();

  /* ---------- shared materials ---------- */
  const M = {
    ground: new THREE.MeshLambertMaterial({ map: groundTex }),
    facade: new THREE.MeshLambertMaterial({ map: winTex[0], emissiveMap: winTex[1], emissive: 0xffffff, emissiveIntensity: .95 }),
    roof: new THREE.MeshLambertMaterial({ map: roofTex }),
    trunk: new THREE.MeshLambertMaterial({ color: 0x7a5a3c }), leaf: new THREE.MeshLambertMaterial({ color: 0x3f7a35, side: THREE.DoubleSide }),
    car: new THREE.MeshStandardMaterial({ roughness: .35, metalness: .55 }), glass: new THREE.MeshStandardMaterial({ color: 0x141a24, roughness: .1, metalness: .6 }),
    lamp: new THREE.MeshBasicMaterial({ toneMapped: false }), pool: new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xfff1c8, opacity: .55, toneMapped: false }),
    person: new THREE.MeshLambertMaterial(), sand: new THREE.MeshLambertMaterial({ color: 0xd9b98a }), grass: new THREE.MeshLambertMaterial({ color: 0x4f7a3a }),
    wood: new THREE.MeshLambertMaterial({ color: 0x8a6342 }), white: new THREE.MeshLambertMaterial({ color: 0xf2efe8 }), dark: new THREE.MeshLambertMaterial({ color: 0x2a2c33 }),
    wine: new THREE.MeshStandardMaterial({ color: 0x77242e, roughness: .6 }), brick: new THREE.MeshStandardMaterial({ color: 0x5a2a2c, roughness: .8 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: .25, metalness: .8, emissive: 0x5a3e00, emissiveIntensity: .7 }),
    beam: new THREE.MeshBasicMaterial({ map: coneTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xfff0c8, opacity: .22, side: THREE.DoubleSide, toneMapped: false }),
  };
  M.car.vertexColors = false;
  const ocean = new THREE.ShaderMaterial({ uniforms: { t: { value: 0 }, fogColor: { value: new THREE.Color(0x2a2d4e) }, fogNear: { value: 1 }, fogFar: { value: 2 } }, fog: true,
    vertexShader: "#include <fog_pars_vertex>\nvarying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; vec4 mvPosition=viewMatrix*w; gl_Position=projectionMatrix*mvPosition;\n#include <fog_vertex>\n}",
    fragmentShader: "#include <fog_pars_fragment>\nuniform float t; varying vec3 vW; void main(){ float w=sin(vW.x*.05+t*1.3)*sin(vW.z*.043-t*.9)+.5*sin(vW.x*.13-vW.z*.07+t*2.1); vec3 c=mix(vec3(.05,.2,.27),vec3(.13,.38,.44),.5+.35*w); float foam=smoothstep(.85,1.2,w); c+=vec3(1.,.75,.5)*.25*smoothstep(.2,1.,sin(vW.z*.02+t*.5)*.5+.5)*.35; c=mix(c,vec3(.95,.9,.85),foam*.35); gl_FragColor=vec4(c,1.0);\n#include <fog_fragment>\n}" });

  /* ---------- shared geometry ---------- */
  const box = new THREE.BoxGeometry(1, 1, 1).translate(0, .5, 0);
  const merge = (parts) => { const pos = [], nor = [], uv = []; parts.forEach(([g, m]) => { const q = (g.index ? g.toNonIndexed() : g.clone()).applyMatrix4(m); q.computeVertexNormals(); pos.push(...q.attributes.position.array); nor.push(...q.attributes.normal.array); if (q.attributes.uv) uv.push(...q.attributes.uv.array); });
    const o = new THREE.BufferGeometry(); o.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); o.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); if (uv.length === pos.length / 3 * 2) o.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); return o; };
  const T4 = (x, y, z, rx, ry, rz, sx, sy, sz) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0)), new THREE.Vector3(sx || 1, sy || 1, sz || 1));
  const trunkG = new THREE.CylinderGeometry(.9, 1.5, 34, 6).translate(0, 17, 0);
  const crownG = merge(Array.from({ length: 8 }, (_, i) => [new THREE.BoxGeometry(2.8, .3, 15).translate(0, 0, 7.5), T4(0, 34, 0, .45 + (i % 2) * .2, i / 8 * TAU, 0)]));
  const carG = merge([[new THREE.BoxGeometry(7, 2.6, 15.5), T4(0, 2.1, 0)], [new THREE.BoxGeometry(6.2, 2.2, 7.5), T4(0, 4.4, -1)]]);
  const lampG = new THREE.BoxGeometry(1.5, 1, .5);
  const poolG = new THREE.PlaneGeometry(9, 26).rotateX(-Math.PI / 2).translate(0, .35, 20);
  const bodyG = new THREE.CapsuleGeometry(1.5, 3.4, 3, 8).translate(0, 3.2, 0), headG = new THREE.SphereGeometry(1.25, 8, 6).translate(0, 7.5, 0);
  const Q = new THREE.Matrix4(), QP = new THREE.Vector3(), QQ = new THREE.Quaternion(), QS = new THREE.Vector3(), QE = new THREE.Euler(), QC = new THREE.Color();
  const set = (im, i, x, y, z, ry, sx, sy, sz) => { QP.set(x, y, z); QQ.setFromEuler(QE.set(0, ry || 0, 0)); QS.set(sx || 1, sy || 1, sz || 1); im.setMatrixAt(i, Q.compose(QP, QQ, QS)); };
  const inst = (g, m, n, col) => { const im = new THREE.InstancedMesh(g, m, Math.max(1, n)); im.count = n; if (col) im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, n) * 3), 3); im.frustumCulled = false; return im; };
  const mesh = (g, m, x, y, z) => { const o = new THREE.Mesh(g, m); o.position.set(x || 0, y || 0, z || 0); return o; };
  const CAR_COLS = ["#e9e9ea", "#1d1f24", "#9aa1ab", "#7b1f2a", "#25467a", "#c9b48a", "#3e4148", "#f2f2ee", "#a8322f", "#5c6b54"];
  const SKIN = ["#4a2e22", "#5e3a28", "#7a4a32", "#8d5a3b", "#a46c48", "#6b4430", "#3a241b", "#b07a52"];
  const CLOTH = ["#111318", "#d4af37", "#77242e", "#f2efe8", "#2c4a7a", "#e46b83", "#3e6b4a", "#a33645", "#f0d375", "#5a5f6b"];

  /* ---------- the Melody logo (real artwork) in gold, and the review cover ---------- */
  const logoTex = (() => { const c = mkc(600, 300), x = c.getContext("2d"), t = tex(c, false); const i = new Image();
    i.onload = () => { x.clearRect(0, 0, 600, 300); x.drawImage(i, 10, 10, 580, 280 * Math.min(1, (580 * i.naturalHeight / i.naturalWidth) / 280)); x.globalCompositeOperation = "source-in"; const g = x.createLinearGradient(0, 0, 0, 300); g.addColorStop(0, "#fff1b8"); g.addColorStop(.5, "#f0c24a"); g.addColorStop(1, "#c8901c"); x.fillStyle = g; x.fillRect(0, 0, 600, 300); t.needsUpdate = true; };
    i.src = BASE + "img/logo.png"; return t; })();
  const coverTex = img("img/review/cover.webp");
  const plateTex = (() => { const c = mkc(256, 128), x = c.getContext("2d"); x.fillStyle = "#f4f4f0"; x.fillRect(0, 0, 256, 128); x.strokeStyle = "#1b2a6b"; x.lineWidth = 8; x.strokeRect(4, 4, 248, 120);
    x.fillStyle = "#b3262e"; x.font = "italic 700 26px Georgia,serif"; x.textAlign = "center"; x.fillText("California", 128, 34); x.fillStyle = "#1b2a6b"; x.font = "900 54px Arial,sans-serif"; x.fillText("ANTIDOTE", 128, 98); return tex(c, false); })();
  const tagTex = (() => { const c = mkc(512, 96), x = c.getContext("2d"); x.font = "800 52px Arial,sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.lineWidth = 8; x.strokeStyle = "rgba(10,12,20,.9)"; x.strokeText("@therealantidote", 256, 50); x.fillStyle = "#f0d375"; x.fillText("@therealantidote", 256, 50); return tex(c, false); })();
  const textTex = (txt, col, w, h, font) => { const c = mkc(w || 512, h || 128), x = c.getContext("2d"); x.font = font || "900 80px Arial,sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillStyle = col; x.fillText(txt, c.width / 2, c.height / 2 + 4); return tex(c, false); };

  /* ---------- pieces ---------- */
  function cars(seg, R, n, len, lanes) {   // n cars on the given lanes; each lane: [axis "z"|"x", coord, dir]
    const body = inst(carG, M.car, n, true), lamps = inst(lampG, M.lamp, n * 4, true), pools = inst(poolG, M.pool, n), list = [];
    for (let i = 0; i < n; i++) { const L = lanes[(R() * lanes.length) | 0], sp = 38 + R() * 46; list.push({ L, sp, ph: R() * 5000 });
      body.instanceColor.setXYZ(i, ...QC.set(CAR_COLS[(R() * CAR_COLS.length) | 0]).toArray());
      for (let j = 0; j < 4; j++) lamps.instanceColor.setXYZ(i * 4 + j, ...(j < 2 ? [1.6, 1.45, 1.1] : [1.6, .12, .1])); }
    seg.group.add(body, lamps, pools);
    seg.tick.push((t) => { for (let i = 0; i < n; i++) { const c = list[i], L = c.L, span = L[0] === "z" ? len : XW * .9, s = ((c.ph + t * c.sp) % span) - span / 2, d = L[2], ry = L[0] === "z" ? (d > 0 ? 0 : Math.PI) : (d > 0 ? Math.PI / 2 : -Math.PI / 2);
      const x = L[0] === "z" ? L[1] : s * d, z = L[0] === "z" ? s * d : L[1]; set(body, i, x, 0, z, ry); set(pools, i, x, 0, z, ry);
      const fx = Math.sin(ry), fz = Math.cos(ry); for (let j = 0; j < 4; j++) { const f = j < 2 ? 7.9 : -7.9, sd = (j % 2 ? 1 : -1) * 2.3; set(lamps, i * 4 + j, x + fx * f + fz * sd, 2.4, z + fz * f - fx * sd, ry); } }
      body.instanceMatrix.needsUpdate = lamps.instanceMatrix.needsUpdate = pools.instanceMatrix.needsUpdate = true; });
  }
  function palms(seg, R, spots) { const tr = inst(trunkG, M.trunk, spots.length), cr = inst(crownG, M.leaf, spots.length);
    spots.forEach((p, i) => { const s = .8 + R() * .5, ry = R() * TAU; set(tr, i, p[0], 0, p[1], ry, s, s, s); set(cr, i, p[0], 0, p[1], ry, s, s, s); }); seg.group.add(tr, cr); }
  function buildings(seg, R, lots) { const im = new THREE.InstancedMesh(box, [M.facade, M.facade, M.roof, M.roof, M.facade, M.facade], Math.max(1, lots.length)); im.count = lots.length; im.frustumCulled = false;
    im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, lots.length) * 3), 3);
    const TINT = ["#efe6d8", "#b9b0a4", "#9fa9b4", "#d8c4ac", "#8e949b", "#e9e0d4", "#c4a986", "#a08f7c", "#7d8691", "#cfd6dc"];
    lots.forEach((b, i) => { set(im, i, b[0], 0, b[1], 0, b[2], b[4], b[3]); im.instanceColor.setXYZ(i, ...QC.set(TINT[(R() * TINT.length) | 0]).toArray()); }); seg.group.add(im); }
  function people(seg, R, spots, anim) {   // spots: [x, z, ry, outfit|-1]
    const n = spots.length, b = inst(bodyG, M.person, n, true), h = inst(headG, M.person, n, true);
    spots.forEach((p, i) => { b.instanceColor.setXYZ(i, ...QC.set(p[3] != null && p[3] >= 0 ? CLOTH[p[3]] : CLOTH[(R() * CLOTH.length) | 0]).toArray()); h.instanceColor.setXYZ(i, ...QC.set(SKIN[(R() * SKIN.length) | 0]).toArray()); p.push(R() * 6, .9 + R() * .25); });
    const place = (t) => { spots.forEach((p, i) => { const bob = anim ? Math.abs(Math.sin(t * 2.2 + p[4])) * .5 : 0, sw = anim ? Math.sin(t * 1.3 + p[4]) * .12 : 0; set(b, i, p[0], bob, p[1], p[2] + sw, p[5], p[5], p[5]); set(h, i, p[0], bob, p[1], p[2] + sw, p[5], p[5], p[5]); }); b.instanceMatrix.needsUpdate = h.instanceMatrix.needsUpdate = true; };
    place(0); if (anim) seg.tick.push(place); seg.group.add(b, h); }
  function streetLamps(seg, spots) { const g = merge([[new THREE.CylinderGeometry(.5, .7, 26, 5), T4(0, 13, 0)], [new THREE.BoxGeometry(6, .6, 1.2), T4(-3, 26, 0)]]), p = inst(g, M.dark, spots.length), bulbs = inst(new THREE.SphereGeometry(1.2, 6, 4), M.lamp, spots.length, true), pl = inst(new THREE.PlaneGeometry(26, 26).rotateX(-Math.PI / 2), M.pool, spots.length);
    spots.forEach((s, i) => { set(p, i, s[0], 0, s[1], s[2]); const ox = -Math.cos(s[2]) * 6, oz = Math.sin(s[2]) * 6; set(bulbs, i, s[0] + ox, 25.4, s[1] + oz, 0); bulbs.instanceColor.setXYZ(i, 1.7, 1.4, .9); set(pl, i, s[0] + ox, .4, s[1] + oz, 0); }); seg.group.add(p, bulbs, pl); }

  /* ---------- the city block strip (base for most segments) ---------- */
  function city(seg, R, len, o) {
    const g = new THREE.PlaneGeometry(XW, len).rotateX(-Math.PI / 2), uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * XW - XW / 2 + 160) / CX, (uv.getY(i) * len) / CZ);
    seg.group.add(mesh(g, M.ground));
    const lots = [], tall = o.tall || 0, clear = o.clear || [], palmSpots = [], lampSpots = [];
    const free = (x, z, w, d) => !clear.some(c => Math.abs(x - c[0]) < (w + c[2]) / 2 && Math.abs(z - c[1]) < (d + c[3]) / 2);
    for (let ax = 0; ax < AVE.length - 1; ax++) { const x0 = AVE[ax] + ROAD / 2 + SIDE + 4, x1 = AVE[ax + 1] - ROAD / 2 - SIDE - 4;
      for (let z0 = -len / 2 + ROAD / 2 + SIDE + 4; z0 < len / 2 - 40; z0 += CZ) { const z1 = Math.min(len / 2 - 6, z0 + CZ - ROAD - 2 * SIDE - 8);
        const nx = 2 + (R() * 2 | 0), nz = 1 + (R() * 2 | 0), bw = (x1 - x0) / nx, bd = (z1 - z0) / nz;
        for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { if (R() < .14) continue; const w = bw * (.62 + R() * .3), d = bd * (.6 + R() * .32), x = x0 + bw * (i + .5), z = z0 + bd * (j + .5);
          if (!free(x, z, w, d)) continue; const inField = Math.abs(x) < 240, hmax = tall ? (inField ? 110 : 280) : (inField ? 46 : 100);
          lots.push([x, z, w, d, 14 + Math.pow(R(), 1.7) * hmax]); } } }
    buildings(seg, R, lots);
    for (const ax of AVE) for (let z = -len / 2 + 30; z < len / 2; z += 52) { for (const sd of [-1, 1]) { const x = ax + sd * (ROAD / 2 + 4); if (free(x, z, 6, 6) && R() < .8) palmSpots.push([x, z]); } }
    palms(seg, R, palmSpots);
    for (const ax of [-160, 160]) for (let z = -len / 2 + 60; z < len / 2; z += 115) lampSpots.push([ax + ROAD / 2 + 2, z, 0], [ax - ROAD / 2 - 2, z + 57, Math.PI]);
    streetLamps(seg, lampSpots.filter(s => Math.abs(s[1]) < len / 2 - 4));
    const lanes = []; for (const ax of AVE) lanes.push(["z", ax - 8, 1], ["z", ax + 8, -1]);
    for (let z = -len / 2; z < len / 2; z += CZ) if (Math.abs(z) < len / 2 - 20) lanes.push(["x", z + 8, 1], ["x", z - 8, -1]);
    cars(seg, R, o.cars || 30, len, lanes);
  }

  /* ---------- landmarks ---------- */
  function melody(seg, R, len, side) {   // Melody Bar & Grill: wine brick building, gold sign (real logo), patio with string lights, guard + line, searchlights
    const cx = side * 64, cz = -10, BW = 150, BD = 96, BH = 34, gp = new THREE.Group(); gp.position.set(cx, 0, cz); seg.group.add(gp);
    gp.add(mesh(new THREE.BoxGeometry(BW, BH, BD).translate(0, BH / 2, 0), M.brick));
    gp.add(mesh(new THREE.BoxGeometry(BW + 4, 3, BD + 4).translate(0, BH + 1.5, 0), M.gold));                                     // gold cornice
    const roofSign = mesh(new THREE.PlaneGeometry(128, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: logoTex, transparent: true, depthWrite: false, toneMapped: false }), 0, BH + 3.2, 0); gp.add(roofSign);
    const front = new THREE.Group(); front.position.set(0, 0, BD / 2); gp.add(front);
    front.add(mesh(new THREE.BoxGeometry(96, 34, 3).translate(0, 50, 1.5), M.dark)); front.add(mesh(new THREE.BoxGeometry(100, 38, 1.5).translate(0, 50, 0), M.gold));   // raised sign board + gold frame
    const fs = mesh(new THREE.PlaneGeometry(90, 30), new THREE.MeshBasicMaterial({ map: logoTex, transparent: true, toneMapped: false }), 0, 50, 3.2); front.add(fs);
    front.add(mesh(new THREE.BoxGeometry(50, 3, 14).translate(0, 18, 7), M.wine));                                                       // awning over the door
    front.add(mesh(new THREE.BoxGeometry(12, 16, 1).translate(side * 20, 8, .6), new THREE.MeshBasicMaterial({ color: 0xffd38a, toneMapped: false })));   // lit doorway
    // the line: gold stanchions + 12 guests along the front sidewalk, the guard at the door
    const dx = side * 20, n = 12, sp = [];
    for (let i = 0; i < n; i++) sp.push([cx + dx - side * (14 + i * 8.2), cz + BD / 2 + 12 + (i % 2) * 1.5, side > 0 ? -Math.PI / 2 : Math.PI / 2, -1]);
    sp.push([cx + dx + side * 8, cz + BD / 2 + 8, Math.PI, 0]);                                                                          // security (black)
    people(seg, R, sp, true);
    const st = inst(new THREE.CylinderGeometry(.5, .5, 6, 5).translate(0, 3, 0), M.gold, n + 1); for (let i = 0; i <= n; i++) set(st, i, cx + dx - side * (10 + i * 8.2), 0, cz + BD / 2 + 18, 0); seg.group.add(st);
    const rope = mesh(new THREE.BoxGeometry(n * 8.2, .6, .6).translate(0, 5, 0), M.wine, cx + dx - side * (10 + n * 4.1), 0, cz + BD / 2 + 18); seg.group.add(rope);
    // back patio on the field side: deck, umbrellas, tables, string lights in swags
    const px = cx - side * (BW / 2 + 48), pg = new THREE.Group(); pg.position.set(px, 0, cz); seg.group.add(pg);
    pg.add(mesh(new THREE.BoxGeometry(92, 1.4, 92).translate(0, .7, 0), M.wood));
    const fence = merge([[new THREE.BoxGeometry(92, 6, 1), T4(0, 3, 46)], [new THREE.BoxGeometry(92, 6, 1), T4(0, 3, -46)], [new THREE.BoxGeometry(1, 6, 92), T4(-side * 46, 3, 0)]]); pg.add(mesh(fence, M.wine));
    const umb = inst(new THREE.ConeGeometry(9, 4, 8).translate(0, 12, 0), M.gold, 6), pole = inst(new THREE.CylinderGeometry(.4, .4, 12, 4).translate(0, 6, 0), M.dark, 6), tb = inst(new THREE.CylinderGeometry(4, 4, 1, 10).translate(0, 5, 0), M.white, 6);
    for (let i = 0; i < 6; i++) { const x = ((i % 3) - 1) * 28, z = ((i / 3 | 0) - .5) * 40; [umb, pole, tb].forEach(m => set(m, i, x, 0, z, 0)); } pg.add(umb, pole, tb);
    const bulbs = [], posts = [[-40, -40], [40, -40], [40, 40], [-40, 40]];
    pg.add(mesh(merge(posts.map(p => [new THREE.CylinderGeometry(.6, .6, 22, 5), T4(p[0], 11, p[1])])), M.dark));
    const swag = (a, b) => { for (let k = 1; k < 14; k++) { const u = k / 14; bulbs.push([a[0] + (b[0] - a[0]) * u, 22 - Math.sin(u * Math.PI) * 6, a[1] + (b[1] - a[1]) * u]); } };
    swag(posts[0], posts[2]); swag(posts[1], posts[3]); swag(posts[0], posts[1]); swag(posts[2], posts[3]);
    const bl = inst(new THREE.SphereGeometry(.9, 6, 4), M.lamp, bulbs.length, true); bulbs.forEach((b, i) => { set(bl, i, b[0], b[1], b[2], 0); bl.instanceColor.setXYZ(i, 1.8, 1.35, .7); }); pg.add(bl);
    const glow = mesh(new THREE.PlaneGeometry(110, 110).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffb860, opacity: .5, toneMapped: false }), 0, 1.6, 0); pg.add(glow);
    const guests = []; for (let i = 0; i < 10; i++) guests.push([px + ((i % 5) - 2) * 15 + (R() - .5) * 5, cz + ((i / 5 | 0) - .5) * 40 + (R() - .5) * 10, R() * TAU, -1]); people(seg, R, guests, true);
    // two searchlights sweeping the sky over the roof
    const beams = [-1, 1].map(s => { const b = mesh(new THREE.CylinderGeometry(9, 1.5, 260, 12, 1, true).translate(0, 130, 0), M.beam, cx + s * 50, BH, cz - 30); seg.group.add(b); return b; });
    seg.tick.push((t) => { beams.forEach((b, i) => { b.rotation.set(.35 * Math.sin(t * .7 + i * 2), 0, .4 * Math.cos(t * .5 + i)); }); glow.material.opacity = .42 + .08 * Math.sin(t * 3); });
    seg.melody = { x: cx, z: cz };
  }
  function egg(seg, R, len, side) {   // Antidote's Easter egg: a roadside screen with his Melody review + a white electric sedan with his plate
    const ax = side * 160, sx = ax + side * (ROAD / 2 + 26), gp = new THREE.Group(); gp.position.set(sx, 0, -len * .12); seg.group.add(gp);
    gp.add(mesh(merge([[new THREE.CylinderGeometry(1.2, 1.4, 44, 6), T4(-26, 22, 0)], [new THREE.CylinderGeometry(1.2, 1.4, 44, 6), T4(26, 22, 0)]]), M.dark));
    const scr = new THREE.Group(); scr.position.set(0, 62, 0); scr.rotation.x = -.32; gp.add(scr);
    scr.add(mesh(new THREE.BoxGeometry(76, 46, 3), M.dark)); scr.add(mesh(new THREE.BoxGeometry(78, 1.6, 3.4).translate(0, 23.5, 0), M.gold)); scr.add(mesh(new THREE.BoxGeometry(78, 1.6, 3.4).translate(0, -23.5, 0), M.gold));
    const screen = mesh(new THREE.PlaneGeometry(72, 40.5), new THREE.MeshBasicMaterial({ map: coverTex, toneMapped: false }), 0, 0, 1.6); scr.add(screen);
    const halo = mesh(new THREE.PlaneGeometry(130, 90), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffd7a0, opacity: .35, toneMapped: false }), 0, 0, -.5); scr.add(halo);
    // the sedan: smooth white body, black glass roof, ANTIDOTE plate, a tiny @therealantidote on the roof (only readable from above)
    const car = new THREE.Group(), body = new THREE.MeshStandardMaterial({ color: 0xf7f7f5, roughness: .22, metalness: .35 });
    const shell = new THREE.CapsuleGeometry(3.6, 10, 4, 12).rotateX(Math.PI / 2); shell.scale(1, .42, 1); car.add(mesh(shell, body, 0, 2.6, 0));
    const cabin = new THREE.SphereGeometry(3.2, 14, 8, 0, TAU, 0, Math.PI / 2); cabin.scale(1, .62, 2); car.add(mesh(cabin, M.glass, 0, 3.6, -.6));
    const plate = mesh(new THREE.PlaneGeometry(3.4, 1.7), new THREE.MeshBasicMaterial({ map: plateTex, toneMapped: false }), 0, 2.4, -8.62); plate.rotation.y = Math.PI; car.add(plate);
    const plate2 = plate.clone(); plate2.position.z = 8.62; plate2.rotation.y = 0; car.add(plate2);
    const tag = mesh(new THREE.PlaneGeometry(8.5, 1.6).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tagTex, transparent: true, toneMapped: false }), 0, 5.65, -.6); car.add(tag);
    const lights = inst(lampG, M.lamp, 4, true); [[-2.4, 8.3, 0], [2.4, 8.3, 0], [-2.4, -8.3, 1], [2.4, -8.3, 1]].forEach((l, i) => { set(lights, i, l[0], 2.6, l[1], 0); lights.instanceColor.setXYZ(i, ...(l[2] ? [1.7, .1, .1] : [1.7, 1.6, 1.4])); }); car.add(lights);
    const pool = mesh(poolG, M.pool); car.add(pool);
    const wh = inst(new THREE.CylinderGeometry(1.5, 1.5, 1, 10).rotateZ(Math.PI / 2), M.dark, 4); [[-3.4, 5], [3.4, 5], [-3.4, -5], [3.4, -5]].forEach((p, i) => set(wh, i, p[0], 1.5, p[1], 0)); car.add(wh);
    const ring = mesh(new THREE.RingGeometry(9, 12, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xf0d375, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), 0, .5, 0); car.add(ring);   // a faint gold ring: findable, not loud
    car.scale.setScalar(1.6); seg.group.add(car);
    const lane = ax - 8, dir = 1;   // drives toward you (the +z lane of that avenue), right past the screen
    seg.egg = { x: lane, z: 0, car };
    seg.tick.push((t) => { const s = ((t * 34) % (len * .9)) - len * .45; car.position.set(lane, 0, s * dir); car.rotation.y = dir > 0 ? 0 : Math.PI; seg.egg.z = car.position.z; ring.material.opacity = .35 + .25 * Math.sin(t * 4); });
  }
  function runway(seg, R, len, o) {   // LAX-style runway with approach lights; the game draws its own animated runway texture on top when it has one
    seg.group.add(mesh(new THREE.PlaneGeometry(XW, len).rotateX(-Math.PI / 2), M.grass));
    if (!o.noStrip) { seg.group.add(mesh(new THREE.PlaneGeometry(240, len).rotateX(-Math.PI / 2).translate(0, .2, 0), new THREE.MeshLambertMaterial({ color: 0x33363c })));
      const marks = []; for (let z = -len / 2 + 30; z < len / 2 - 30; z += 44) marks.push([new THREE.PlaneGeometry(4, 24).rotateX(-Math.PI / 2), T4(0, .3, z)]); seg.group.add(mesh(merge(marks), M.white)); }
    const L = []; for (let z = -len / 2; z < len / 2; z += 26) for (const sx of [-124, 124]) L.push([sx, z, 0]); for (let z = -len / 2; z < len / 2; z += 34) for (const sx of [-250, 250]) L.push([sx, z, 2]);
    const im = inst(new THREE.SphereGeometry(1.6, 5, 4), M.lamp, L.length, true); L.forEach((p, i) => { set(im, i, p[0], 1, p[1], 0); im.instanceColor.setXYZ(i, ...(p[2] ? [.3, .6, 2] : [1.8, 1.7, 1.4])); }); seg.group.add(im);
    // terminals and hangars along both sides, parked jets as simple shapes
    const lots = []; for (const sd of [-1, 1]) for (let z = -len / 2 + 60; z < len / 2; z += 150) lots.push([sd * (380 + R() * 80), z, 120 + R() * 60, 90, 18 + R() * 14]); buildings(seg, R, lots);
    const lanes = [["z", -300, 1], ["z", 300, -1]]; cars(seg, R, 8, len, lanes);
  }
  function stadium(seg, R, len, side) { city(seg, R, len, { clear: [[side * 40, 0, 330, 300]], cars: 22 });
    const g = new THREE.Group(); g.position.set(side * 40, 0, 0); seg.group.add(g);
    const bowl = new THREE.LatheGeometry([new THREE.Vector2(100, 0), new THREE.Vector2(150, 0), new THREE.Vector2(150, 30), new THREE.Vector2(118, 34), new THREE.Vector2(100, 6)], 40); bowl.scale(1, 1, .75);
    g.add(mesh(bowl, new THREE.MeshLambertMaterial({ color: 0xc9ccd2, side: THREE.DoubleSide })));
    const pitch = new THREE.CircleGeometry(100, 32).rotateX(-Math.PI / 2); pitch.scale(1, 1, .75); g.add(mesh(pitch, new THREE.MeshLambertMaterial({ color: 0x3f8a3a }), 0, 1, 0));
    const lines = []; for (let i = -4; i <= 4; i++) lines.push([new THREE.PlaneGeometry(1.2, 110).rotateX(-Math.PI / 2), T4(i * 18, 1.3, 0, 0, Math.PI / 2, 0)]); g.add(mesh(merge(lines), M.white));
    const roof = new THREE.TorusGeometry(140, 4, 6, 40).rotateX(Math.PI / 2); roof.scale(1, .75, 1); g.add(mesh(roof, M.gold, 0, 40, 0));
    const tw = inst(new THREE.CylinderGeometry(1, 1.4, 70, 5).translate(0, 35, 0), M.dark, 4), lt = inst(new THREE.BoxGeometry(12, 6, 2).translate(0, 70, 0), M.lamp, 4, true);
    [[-150, -112], [150, -112], [-150, 112], [150, 112]].forEach((p, i) => { set(tw, i, p[0], 0, p[1], 0); set(lt, i, p[0], 0, p[1], Math.atan2(p[0], p[1])); lt.instanceColor.setXYZ(i, 2, 2, 1.8); }); g.add(tw, lt); }
  function hills(seg, R, len) {
    const g = new THREE.PlaneGeometry(XW, len, 40, 16).rotateX(-Math.PI / 2), p = g.attributes.position, col = [];
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), h = Math.max(0, (Math.sin(x * .007 + seg.seed) * .5 + .5) * (Math.sin(z * .011 + x * .003) * .5 + .5)) * (Math.abs(x) > 200 ? 110 : 55); p.setY(i, h); const u = h / 110; col.push(.3 + u * .25, .36 + u * .12, .2 + u * .05); }
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); seg.group.add(mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true })));
    const hs = [], pl = []; for (let i = 0; i < 46; i++) { const x = (R() - .5) * XW * .8, z = (R() - .5) * len * .9, h = hAt(g, x, z); hs.push([x, z, 14 + R() * 10, 12 + R() * 8, 8 + R() * 8, h]); if (R() < .7) pl.push([x + 14, z + 8, h]); }
    const im = new THREE.InstancedMesh(box, [M.white, M.white, M.wine, M.wine, M.white, M.white], hs.length); im.frustumCulled = false; hs.forEach((b, i) => set(im, i, b[0], b[5] - 2, b[1], R() * 3, b[2], b[4], b[3])); seg.group.add(im);
    const tr = inst(trunkG, M.trunk, pl.length), cr = inst(crownG, M.leaf, pl.length); pl.forEach((q, i) => { set(tr, i, q[0], q[2] - 1, q[1], R() * 6); set(cr, i, q[0], q[2] - 1, q[1], R() * 6); }); seg.group.add(tr, cr);
    const mast = mesh(new THREE.CylinderGeometry(.8, 2.2, 140, 4).translate(0, 70, 0), M.white, 420, hAt(g, 420, 0), 0); seg.group.add(mast);
    const red = mesh(new THREE.SphereGeometry(2.6, 6, 4), M.lamp.clone(), 420, hAt(g, 420, 0) + 141, 0); red.material.color.setRGB(2, .1, .1); seg.group.add(red);
    seg.tick.push((t) => { red.visible = (t % 1.4) < .7; });
    cars(seg, R, 6, len, [["z", -160, 1], ["z", 160, -1]]);
  }
  function hAt(g, x, z) { const p = g.attributes.position; let best = 0, bd = 1e9; for (let i = 0; i < p.count; i++) { const d = (p.getX(i) - x) ** 2 + (p.getZ(i) - z) ** 2; if (d < bd) { bd = d; best = p.getY(i); } } return best; }
  function coast(seg, R, len, kind) {   // ocean on the left, beach, a bike path, then the beach town; a pier for "pier", Nalu Vida's glow for "venice"
    const sea = mesh(new THREE.PlaneGeometry(XW, len).rotateX(-Math.PI / 2), ocean, -XW / 2 - 60, -.5, 0); seg.group.add(sea);
    seg.group.add(mesh(new THREE.PlaneGeometry(260, len).rotateX(-Math.PI / 2), M.sand, 10, 0, 0));
    seg.group.add(mesh(new THREE.PlaneGeometry(12, len).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x6d6a66 }), 120, .2, 0));
    const g = new THREE.Group(); g.position.x = 1150; seg.group.add(g); const sub = { group: g, tick: seg.tick }; city(sub, R, len, { cars: 16 });
    const pl = []; for (let z = -len / 2 + 20; z < len / 2; z += 40) pl.push([132, z], [104, z + 20]); palms(seg, R, pl);
    const ppl = []; for (let i = 0; i < 26; i++) ppl.push([-90 + R() * 180, (R() - .5) * len * .9, R() * TAU, -1]); people(seg, R, ppl, true);
    const tw = inst(new THREE.ConeGeometry(7, 5, 6).translate(0, 9, 0), M.wine, 10), tp = inst(new THREE.CylinderGeometry(.35, .35, 9, 4).translate(0, 4.5, 0), M.dark, 10); for (let i = 0; i < 10; i++) { const x = -70 + R() * 140, z = (R() - .5) * len * .9; set(tw, i, x, 0, z, 0); set(tp, i, x, 0, z, 0); } seg.group.add(tw, tp);
    if (kind === "pier") { const pg = new THREE.Group(); pg.position.set(-180, 0, 0); seg.group.add(pg);
      pg.add(mesh(new THREE.BoxGeometry(520, 3, 40).translate(-120, 10, 0), M.wood)); const posts = []; for (let x = -370; x < 140; x += 30) for (const z of [-18, 18]) posts.push([new THREE.CylinderGeometry(1, 1, 12, 4), T4(x, 4, z)]); pg.add(mesh(merge(posts), M.wood));
      const wheel = new THREE.Group(); wheel.position.set(-200, 60, -36); pg.add(wheel); wheel.add(mesh(new THREE.TorusGeometry(46, 1.4, 6, 40), M.white)); const sp = []; for (let i = 0; i < 12; i++) sp.push([new THREE.BoxGeometry(.8, 92, .8), T4(0, 0, 0, 0, 0, i / 12 * Math.PI)]); wheel.add(mesh(merge(sp), M.white));
      const cabs = inst(new THREE.BoxGeometry(6, 6, 6), M.lamp, 12, true); wheel.add(cabs); pg.add(mesh(new THREE.CylinderGeometry(2, 3, 60, 5).translate(0, 30, 0), M.white, -200, 0, -36));
      const lamps = inst(new THREE.SphereGeometry(1.4, 6, 4), M.lamp, 18, true); for (let i = 0; i < 18; i++) { set(lamps, i, -370 + i * 28, 16, i % 2 ? 19 : -19, 0); lamps.instanceColor.setXYZ(i, 1.8, 1.5, 1); } pg.add(lamps);
      seg.tick.push((t) => { wheel.rotation.z = t * .25; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU - t * .25; set(cabs, i, Math.cos(a) * 46, Math.sin(a) * 46 - 4, 0, 0); cabs.instanceColor.setXYZ(i, ...[[1.8, .4, .5], [1.8, 1.5, .4], [.4, 1.2, 1.8]][i % 3]); } cabs.instanceMatrix.needsUpdate = true; cabs.instanceColor.needsUpdate = true; }); }
    if (kind === "venice") { const b = mesh(new THREE.BoxGeometry(110, 26, 70).translate(0, 13, 0), new THREE.MeshStandardMaterial({ color: 0xf0ebe0, roughness: .6 }), 330, 0, -20); seg.group.add(b);
      const s = mesh(new THREE.PlaneGeometry(100, 25).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: textTex("NALU VIDA", "#f0d375", 512, 128, "900 72px Georgia,serif"), transparent: true, toneMapped: false }), 330, 26.4, -20); seg.group.add(s);
      const led = mesh(new THREE.PlaneGeometry(220, 200).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0x6ab8ff, opacity: .45, toneMapped: false }), 330, 1, -20); seg.group.add(led);
      seg.tick.push((t) => { led.material.color.setHSL(.55 + .08 * Math.sin(t * .8), .8, .6); }); }
    seg.tick.push((t) => { ocean.uniforms.t.value = t; });
  }

  /* ---------- a ground segment: kind ∈ city|towers|melody|stadium|hills|coast|venice|pier|runway ---------- */
  function segment(kind, len, seed, o = {}) {
    const R = rng(seed || 1), seg = { kind, len, seed: seed || 1, group: new THREE.Group(), tick: [], egg: null, melody: null };
    const side = o.side || 1;
    if (kind === "runway") runway(seg, R, len, o);
    else if (kind === "hills") hills(seg, R, len);
    else if (kind === "coast" || kind === "venice" || kind === "pier") coast(seg, R, len, kind);
    else if (kind === "stadium") stadium(seg, R, len, side);
    else if (kind === "melody") { city(seg, R, len, { clear: [[side * 64 - side * 50, -10, 300, 150]], cars: 24 }); melody(seg, R, len, side); }
    else { city(seg, R, len, { tall: kind === "towers", clear: o.egg ? [[(o.eggSide || 1) * 210, -len * .12, 70, 40]] : [], cars: 30 }); if (o.egg) egg(seg, R, len, o.eggSide || 1); }
    seg.update = (t) => { for (let i = 0; i < seg.tick.length; i++) seg.tick[i](t); };
    seg.dispose = () => { seg.group.traverse(n => { if (n.isInstancedMesh) n.dispose(); if (n.isMesh && n.geometry && !SHARED.has(n.geometry)) n.geometry.dispose(); }); };
    seg.update(0); return seg;
  }
  const SHARED = new Set([box, trunkG, crownG, carG, lampG, poolG, bodyG, headG]);
  return { segment, M, ocean, coverTex, logoTex };
}
