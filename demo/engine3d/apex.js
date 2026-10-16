/* engine3d/apex.js — "APEX", the unbranded flying wedge supercar (final boss). White clear-coat body (a wedge profile extruded
   across the car, pinched in toward the roof for tumblehome), dark glass canopy, front + rear LED light bars, black aero wheels that
   fold flat for flight, and a glowing thruster nozzle under each wheel well. No badges, logos or names on the car.
   Nose = +Z, length ≈ 4.6 units, wheels fold with fold(0..1).
     const ap = buildApex(THREE)  → { node, size, pts: { thrusters[4], nose, lightF[], lightR[] }, mats, fold(f), update(t, { dmg, flicker }) } */
export function buildApex(THREE) {
  const g = new THREE.Group(), L = 4.6, Wd = 2.0;
  // side profile (z along the car, y up), front at +z
  const prof = [[2.3, .22], [2.38, .42], [2.3, .56], [1.55, .74], [.75, .88], [-.15, 1.13], [-1.0, 1.1], [-1.85, .98], [-2.3, .92], [-2.32, .62], [-2.25, .3], [-1.9, .22], [1.9, .2]];
  const sh = new THREE.Shape(); sh.moveTo(prof[0][0], prof[0][1]); for (let i = 1; i < prof.length; i++) sh.lineTo(prof[i][0], prof[i][1]); sh.closePath();
  const body = new THREE.ExtrudeGeometry(sh, { depth: Wd, bevelEnabled: true, bevelThickness: .08, bevelSize: .06, bevelSegments: 3, curveSegments: 1, steps: 6 });
  body.translate(0, 0, -Wd / 2); body.rotateY(-Math.PI / 2);   // shape x → world z, extrude depth → world x
  { const p = body.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i), x = p.getX(i), z = p.getZ(i); const pinch = 1 - .3 * Math.max(0, (y - .5) / .65) - .06 * Math.max(0, Math.abs(z) - 1.6); p.setX(i, x * pinch); } body.computeVertexNormals(); }
  const paint = new THREE.MeshPhysicalMaterial({ color: 0xf2f2ef, roughness: .28, metalness: .05, clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: 1.3 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x0b0e13, roughness: .03, metalness: .2, clearcoat: 1, envMapIntensity: 1.8 });
  const black = new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: .45, metalness: .5 });
  const ledF = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.4, 2.6), toneMapped: false }), ledR = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, .12, .12), toneMapped: false });
  const hot = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, .9, .5), toneMapped: false });
  const bodyM = new THREE.Mesh(body, paint); bodyM.castShadow = true; g.add(bodyM);
  // canopy: the glass from the windshield base over the roof to the rear deck, sitting just proud of the body
  const cs = new THREE.Shape(), cp = [[1.5, .76], [.75, .9], [-.15, 1.15], [-1.0, 1.12], [-1.8, 1.0], [-1.7, .9], [-.2, .96], [1.4, .7]];
  cs.moveTo(cp[0][0], cp[0][1]); for (let i = 1; i < cp.length; i++) cs.lineTo(cp[i][0], cp[i][1]); cs.closePath();
  const can = new THREE.ExtrudeGeometry(cs, { depth: 2.02, bevelEnabled: true, bevelThickness: .03, bevelSize: .03, bevelSegments: 2 }); can.translate(0, .02, -1.01); can.rotateY(-Math.PI / 2);
  { const p = can.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) * (1.005 - .3 * Math.max(0, (y - .5) / .65))); } can.computeVertexNormals(); }
  g.add(new THREE.Mesh(can, glass));
  // lower black aero: front splitter, side skirts, rear diffuser
  const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
  add(new THREE.BoxGeometry(1.95, .08, .35), black, 0, .2, 2.2); add(new THREE.BoxGeometry(.06, .14, 3.2), black, .98, .26, 0); add(new THREE.BoxGeometry(.06, .14, 3.2), black, -.98, .26, 0);
  add(new THREE.BoxGeometry(1.7, .22, .2), black, 0, .34, -2.25);
  add(new THREE.BoxGeometry(1.85, .22, .1), black, 0, .33, 2.42); add(new THREE.BoxGeometry(1.75, .1, .08), black, 0, .5, 2.44);   // black front fascia behind the light bar
  // light bars
  add(new THREE.BoxGeometry(1.7, .06, .06), ledF, 0, .5, 2.5); [-1, 1].forEach(s => { const b = add(new THREE.BoxGeometry(.4, .05, .04), ledF, s * .8, .5, 2.4); b.rotation.y = s * .35; });
  add(new THREE.BoxGeometry(1.8, .08, .06), ledR, 0, .8, -2.43);
  // wheels (fold flat for flight) + thruster nozzles under each wheel well
  const wheelG = new THREE.CylinderGeometry(.36, .36, .26, 24); wheelG.rotateZ(Math.PI / 2);
  const discG = new THREE.CylinderGeometry(.27, .27, .27, 6); discG.rotateZ(Math.PI / 2);
  const rimM = new THREE.MeshStandardMaterial({ color: 0x23252b, roughness: .3, metalness: .85 });
  const wheels = [], thrusters = [], nozzles = [];
  [[.9, 1.45], [-.9, 1.45], [.9, -1.45], [-.9, -1.45]].forEach(([x, z]) => {
    const w = new THREE.Group(); w.position.set(x, .36, z); g.add(w); const t = new THREE.Mesh(wheelG, black); t.castShadow = true; w.add(t); w.add(new THREE.Mesh(discG, rimM)); wheels.push({ w, x });
    const n = new THREE.Mesh(new THREE.CylinderGeometry(.2, .26, .14, 16, 1, true), rimM); n.position.set(x * .92, .12, z); g.add(n);
    const ring = new THREE.Mesh(new THREE.CircleGeometry(.19, 16).rotateX(Math.PI / 2), hot); ring.position.set(x * .92, .05, z); g.add(ring); nozzles.push(ring);
    thrusters.push(new THREE.Vector3(x * .92, .02, z)); });
  const box = new THREE.Box3().setFromObject(g), size = box.getSize(new THREE.Vector3());
  return { node: g, size, mats: { paint, glass, ledF, ledR, hot }, pts: { thrusters, nose: new THREE.Vector3(0, .5, 2.4), lightF: [new THREE.Vector3(.7, .55, 2.36), new THREE.Vector3(-.7, .55, 2.36)], lightR: [new THREE.Vector3(.8, .78, -2.36), new THREE.Vector3(-.8, .78, -2.36)] },
    fold(f) { wheels.forEach(({ w, x }) => { w.rotation.z = Math.sign(x) * f * Math.PI / 2; w.position.y = .36 + f * .12; w.position.x = x * (1 - .12 * f); }); },
    update(t, o = {}) { const fl = o.flicker ? (Math.sin(t * 47) * Math.sin(t * 13) > .2 ? .15 : 1) : 1, d = o.dmg || 0;
      ledF.color.setRGB(2.4 * fl, 2.4 * fl, 2.6 * fl); ledR.color.setRGB(2.6 * fl, .12, .12); const th = o.thrust != null ? o.thrust : 1; hot.color.setRGB(1.2 + 1.4 * th, .6 + .7 * th, .35 + .5 * th);
      paint.color.setRGB(.95 - .45 * d, .95 - .48 * d, .94 - .5 * d); } };
}
