/* engine3d/apex.js — "APEX · THE ROADSTER", the unbranded flying hypercar (final boss), modelled on the owner's reference reel:
   a long, low, faceted wedge (flat panels, sharp creases — lofted cross-sections with flat shading), satin pearl-white paint with a
   clearcoat, one-piece dark tinted glass canopy from the windshield to the rear deck, black lower sills, a narrow raised cabin on a
   wide squat body, black multi-blade turbine aero wheels, a thin white LED bar across the nose, a full-width thin red LED bar on a
   black tail panel with a black diffuser, black side aero flaps behind the front wheels, and an active rear wing on swan-neck struts
   (wing(1) = High-Downforce: raised + tilted; wing(0) = Low-Drag: flush on the deck). Wheels fold flat for flight with a glowing
   thruster nozzle under each wheel well. A fresnel rim light (mats.rim) keeps the silhouette readable against any sky.
   No badges, logos or names on the car. Nose = +Z, length ≈ 4.65 units.
     const ap = buildApex(THREE) → { node, size, pts: { thrusters[4], nose, lightF[], lightR[] }, mats, fold(f), wing(k), update(t, { dmg, flicker, thrust, wing }) } */
export function buildApex(THREE, O = {}) {
  const g = new THREE.Group();
  const rim = { value: new THREE.Color(O.rim || 0xffe2c8) }, rimK = { value: O.rimK != null ? O.rimK : .55 };
  const rimmed = (m) => { m.fog = O.fog === true; m.onBeforeCompile = (sh) => { sh.uniforms.uRim = rim; sh.uniforms.uRimK = rimK;
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform vec3 uRim; uniform float uRimK;")
        .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n{ float fr = pow(1.0 - clamp(abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0), 3.4); totalEmissiveRadiance += uRim * fr * uRimK; }"); };
    m.customProgramCacheKey = () => "apex-rim-" + m.type; return m; };
  const paint = rimmed(new THREE.MeshPhysicalMaterial({ color: 0xe8e8e4, roughness: .35, metalness: .08, clearcoat: .7, clearcoatRoughness: .22, sheen: .25, sheenColor: new THREE.Color(0xf4f0ff), envMapIntensity: 1.2, flatShading: true }));
  const glass = (new THREE.MeshPhysicalMaterial({ fog: false, color: 0x020203, roughness: .1, metalness: 0, clearcoat: 1, clearcoatRoughness: .04, envMapIntensity: .4, flatShading: false }));   // dark tint, soft reflections
  const black = rimmed(new THREE.MeshStandardMaterial({ color: 0x111215, roughness: .5, metalness: .35, flatShading: true }));
  const satinBlk = rimmed(new THREE.MeshStandardMaterial({ color: 0x0b0c0e, roughness: .32, metalness: .55 }));
  const ledF = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.6, 2.8), toneMapped: false, fog: false }), ledR = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.8, .1, .1), toneMapped: false, fog: false });
  const hot = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, .9, .5), toneMapped: false, fog: false });
  const add = (geo, m, x, y, z, p) => { const o = new THREE.Mesh(geo, m); o.position.set(x || 0, y || 0, z || 0); o.castShadow = true; (p || g).add(o); return o; };

  /* ---- body: lofted cross-sections. Each station: z, then half-section points (x, y) from the bottom centre round one side to the
     roof centre: bottom edge · sill top · beltline crease (widest) · shoulder · roof edge · roof centre. Lower 2 points = black sill. */
  const ST = [
    // z      bottom      sill        belt         shoulder     roof-edge    top
    [2.33, [.52, .27], [.60, .32], [.84, .46], [.78, .52], [.48, .53], [0, .53]],
    [2.10, [.70, .21], [.78, .30], [1.00, .62], [.93, .74], [.58, .77], [0, .78]],
    [1.45, [.74, .20], [.80, .31], [1.04, .70], [.96, .88], [.64, .91], [0, .93]],
    [1.15, [.75, .20], [.81, .31], [1.04, .70], [.95, .88], [.66, .92], [0, .94]],
    [.20,  [.77, .20], [.83, .33], [1.03, .69], [.93, .86], [.62, 1.18], [0, 1.24]],
    [-.80, [.77, .20], [.83, .33], [1.04, .70], [.94, .88], [.58, 1.16], [0, 1.21]],
    [-1.45,[.75, .21], [.81, .32], [1.07, .70], [.98, .88], [.50, 1.06], [0, 1.09]],
    [-2.05,[.73, .25], [.79, .33], [1.02, .73], [.93, .90], [.36, .94], [0, .94]],
    [-2.32,[.69, .31], [.73, .35], [.97, .75], [.87, .90], [.33, .92], [0, .92]],
  ];
  const loft = (stations, i0, i1, lift) => {   // band of section points i0..i1 (inclusive) along the stations, both sides, flat facets
    const pos = []; const P = (s, i, sx) => { const q = s[1 + i]; return [sx * (q[0] + (lift || 0)), q[1] + (lift || 0) * .6, s[0]]; };
    for (let a = 0; a < stations.length - 1; a++) { const A = stations[a], B = stations[a + 1];
      for (let i = i0; i < i1; i++) for (const sx of [-1, 1]) { const a0 = P(A, i, sx), a1 = P(A, i + 1, sx), b0 = P(B, i, sx), b1 = P(B, i + 1, sx);
        if (sx > 0) pos.push(...a0, ...b0, ...a1, ...a1, ...b0, ...b1); else pos.push(...a0, ...a1, ...b0, ...a1, ...b1, ...b0); } }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.computeVertexNormals(); return geo; };
  add(loft(ST, 1, 5), paint);                          // pearl-white upper body
  add(loft(ST, 0, 1, .004), black);                    // black lower sills
  { const pos = []; ST.slice(0, -1).forEach((A, a) => { const B = ST[a + 1]; pos.push(-A[1][0], A[1][1], A[0], B[1][0], B[1][1], B[0], A[1][0], A[1][1], A[0], -A[1][0], A[1][1], A[0], -B[1][0], B[1][1], B[0], B[1][0], B[1][1], B[0]); });
    const fl = new THREE.BufferGeometry(); fl.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); fl.computeVertexNormals(); add(fl, black); }   // floor
  // nose cap (white) and tail panel (black): fans over the end sections
  const cap = (s, dir, m) => { const pts = []; for (let i = 0; i < 6; i++) pts.push([s[1 + i][0], s[1 + i][1]]); const pos = [], z = s[0];
    for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) { const a = pts[i], b = pts[i + 1], c = [0, (pts[0][1] + pts[5][1]) / 2];
      const tri = [[sx * a[0], a[1], z], [sx * b[0], b[1], z], [c[0], c[1], z]]; if ((sx * dir) < 0) tri.reverse(); tri.forEach(v => pos.push(...v)); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.computeVertexNormals(); return add(geo, m); };
  cap(ST[0], 1, paint); cap(ST[ST.length - 1], -1, black);
  // canopy: one piece of dark glass from the windshield over the narrow cabin to the rear deck (shoulder → roof centre), just proud of the body
  const CAN = ST.slice(3, 8).map((s, i) => { const c = s.map(v => Array.isArray(v) ? v.slice() : v); if (i === 4) { c[4] = [c[5][0] * .98, c[5][1]]; } return c; });
  add(loft(CAN, 3, 5, .006), glass);
  // white "flying buttress" fins either side of the rear glass (the reel's rear view), the hood crease line, door shut lines
  for (const sx of [-1, 1]) { const f = add(new THREE.BoxGeometry(.05, .07, 1.0), paint, sx * .46, .93, -1.72); f.rotation.x = .08; f.rotation.z = sx * .35;
    add(new THREE.BoxGeometry(.012, .3, .012), black, sx * 1.0, .47, .55); add(new THREE.BoxGeometry(.012, .26, .012), black, sx * 1.0, .49, -.75); }
  // front: thin white LED bar right across the nose + small LED corners, black intake below
  add(new THREE.BoxGeometry(1.36, .028, .03), ledF, 0, .455, 2.345);
  for (const sx of [-1, 1]) { const b = add(new THREE.BoxGeometry(.28, .022, .03), ledF, sx * .76, .43, 2.27); b.rotation.y = sx * .45; }
  add(new THREE.BoxGeometry(1.15, .1, .05), satinBlk, 0, .32, 2.35); add(new THREE.BoxGeometry(1.7, .05, .32), black, 0, .2, 2.18);   // intake + splitter
  // rear: full-width thin red LED bar on the black tail panel, black diffuser with fins, two exhaust rings
  add(new THREE.BoxGeometry(1.86, .032, .03), ledR, 0, .79, -2.34);
  add(new THREE.BoxGeometry(1.6, .16, .3), satinBlk, 0, .27, -2.2);
  for (let i = -3; i <= 3; i++) add(new THREE.BoxGeometry(.025, .14, .34), black, i * .2, .26, -2.22);
  for (const sx of [-1, 1]) add(new THREE.TorusGeometry(.07, .018, 8, 16), satinBlk, sx * .55, .4, -2.34);
  // side aero flaps + vents behind the front wheels (they open with the wing)
  const flaps = [-1, 1].map(sx => { const pv = new THREE.Group(); pv.position.set(sx * .93, .47, .95); g.add(pv);
    add(new THREE.BoxGeometry(.03, .26, .46), black, 0, 0, -.23, pv); add(new THREE.BoxGeometry(.01, .2, .4), satinBlk, -sx * .03, 0, -.23); return { pv, sx }; });
  // active rear wing on swan-neck struts
  const wingG = new THREE.Group(); g.add(wingG);
  const blade = add(new THREE.BoxGeometry(2.0, .035, .42), satinBlk, 0, 0, 0, wingG); blade.castShadow = true;
  for (const sx of [-1, 1]) add(new THREE.BoxGeometry(.03, .16, .44), satinBlk, sx * 1.0, -.05, 0, wingG);   // end plates
  const struts = [-1, 1].map(sx => { const s = add(new THREE.BoxGeometry(.035, 1, .08).translate(0, .5, 0), satinBlk, sx * .42, .9, -1.95); return s; });
  let wingK = 0; const wing = (k) => { wingK = Math.max(0, Math.min(1, k)); const lift = .55 * wingK;
    wingG.position.set(0, .925 + lift, -2.08 - .06 * wingK); wingG.scale.set(1, 1, .55 + .45 * wingK);   // flush in the deck (Low-Drag) → raised + tilted (High-Downforce) wingG.rotation.x = -.22 * wingK;
    struts.forEach(s => { s.scale.y = Math.max(.02, lift); s.position.y = .92; s.rotation.x = .25 * wingK; s.visible = wingK > .05; });
    flaps.forEach(({ pv, sx }) => { pv.rotation.y = -sx * .6 * wingK; pv.visible = wingK > .08; }); };
  wing(0);
  // wheels: black multi-blade turbine aero discs (6 sharp blades) in black tyres; fold flat for flight; thruster nozzles in the wells
  const tyreG = new THREE.CylinderGeometry(.41, .41, .26, 28); tyreG.rotateZ(Math.PI / 2);
  const discG = new THREE.CylinderGeometry(.33, .33, .27, 6); discG.rotateZ(Math.PI / 2);
  const bladeG = new THREE.BoxGeometry(.035, .31, .08).translate(0, .155, 0);
  const tyre = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: .85, fog: false }); const rimM = rimmed(new THREE.MeshStandardMaterial({ color: 0x5a5e66, roughness: .22, metalness: .9 }));
  const wheels = [], thrusters = [];
  [[.88, 1.45], [-.88, 1.45], [.88, -1.45], [-.88, -1.45]].forEach(([x, z]) => {
    const w = new THREE.Group(); w.position.set(x, .41, z); g.add(w); add(tyreG, tyre, 0, 0, 0, w); add(discG, satinBlk, 0, 0, 0, w);
    for (let b = 0; b < 6; b++) { const bl = add(bladeG, rimM, Math.sign(x) * .145, 0, 0, w); bl.rotation.x = b / 6 * Math.PI * 2; bl.rotation.y = .5; }   // turbine blades
    add(new THREE.CylinderGeometry(.06, .06, .3, 10).rotateZ(Math.PI / 2), rimM, 0, 0, 0, w); wheels.push({ w, x });
    add(new THREE.CylinderGeometry(.2, .26, .14, 16, 1, true), rimM, x * .92, .12, z);
    add(new THREE.CircleGeometry(.19, 16).rotateX(Math.PI / 2), hot, x * .92, .05, z); thrusters.push(new THREE.Vector3(x * .92, .02, z)); });
  g.traverse(n => { if (n.isMesh) n.receiveShadow = false; });
  const box = new THREE.Box3().setFromObject(g), size = box.getSize(new THREE.Vector3());
  return { node: g, size, mats: { paint, glass, ledF, ledR, hot, black, rim, rimK }, pts: { thrusters, nose: new THREE.Vector3(0, .46, 2.36), lightF: [new THREE.Vector3(.6, .46, 2.35), new THREE.Vector3(-.6, .46, 2.35)], lightR: [new THREE.Vector3(.85, .79, -2.36), new THREE.Vector3(-.85, .79, -2.36)] },
    fold(f) { wheels.forEach(({ w, x }) => { w.rotation.z = Math.sign(x) * f * Math.PI / 2; w.position.y = .41 + f * .08; w.position.x = x * (1 - .12 * f); }); },
    wing, get wingK() { return wingK; },
    update(t, o = {}) { const fl = o.flicker ? (Math.sin(t * 47) * Math.sin(t * 13) > .2 ? .15 : 1) : 1, d = o.dmg || 0;
      if (o.wing != null) wing(wingK + (o.wing - wingK) * Math.min(1, (o.dt || .016) * 5));
      ledF.color.setRGB(2.6 * fl, 2.6 * fl, 2.8 * fl); ledR.color.setRGB(2.8 * fl, .1, .1); const th = o.thrust != null ? o.thrust : 1; hot.color.setRGB(1.2 + 1.4 * th, .6 + .7 * th, .35 + .5 * th);
      paint.color.setRGB(.91 - .45 * d, .91 - .48 * d, .9 - .5 * d); } };
}
