/* engine3d/aircraft.js — make a procedural airframe read as a real aircraft.
   upgradeAircraft(THREE, AIR, opts) swaps its materials for physically based ones (clear-coated paint that mirrors the sky,
   brushed metal, dark tinted glass), puts a motion-blur disc on every fan / propeller (the blades fade as it spins up), and
   returns a smoothed attitude helper so bank and pitch ease in like a heavy airframe instead of snapping.
     const up = upgradeAircraft(THREE, AIR, { envIntensity: 1.2 })
     up.spin(t, rpm01)                       fans + blur discs
     up.attitude(dt, targetBank, targetPitch) → { bank, pitch }   (critically damped springs)
   propDisc(THREE, radius, blades) → a Mesh for small piston props (call disc.userData.spin(t)). */
function blurTex(THREE, blades, hub) {
  const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d");
  x.translate(128, 128);
  for (let b = 0; b < blades; b++) for (let k = 0; k < 26; k++) { const a = (b / blades) * Math.PI * 2 + k * .045; x.rotate(0); x.fillStyle = `rgba(30,32,38,${.055 * (1 - k / 26)})`; x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, 124, a, a + .09); x.closePath(); x.fill(); }
  const g = x.createRadialGradient(0, 0, 10, 0, 0, 126); g.addColorStop(0, "rgba(40,42,48,.35)"); g.addColorStop(.85, "rgba(40,42,48,.12)"); g.addColorStop(1, "rgba(200,205,215,.18)"); x.fillStyle = g; x.beginPath(); x.arc(0, 0, 126, 0, Math.PI * 2); x.fill();
  if (hub) { x.fillStyle = "rgba(20,20,24,.9)"; x.beginPath(); x.arc(0, 0, 18, 0, Math.PI * 2); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function propDisc(THREE, r, blades = 2) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 32), new THREE.MeshBasicMaterial({ map: blurTex(THREE, blades, true), transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  m.userData.spin = (t) => { m.rotation.z = -t * 9.7; }; m.renderOrder = 5; return m;
}
export function upgradeAircraft(THREE, AIR, O = {}) {
  const env = O.envIntensity || 1.2, M = AIR.mats, phys = (src, o) => { const m = new THREE.MeshPhysicalMaterial(Object.assign({ color: src.color.clone(), map: src.map || null, roughness: src.roughness, metalness: src.metalness, emissive: src.emissive ? src.emissive.clone() : new THREE.Color(0), emissiveIntensity: src.emissiveIntensity || 1, envMapIntensity: env, side: src.side, transparent: src.transparent, opacity: src.opacity }, o)); m.userData = src.userData; return m; };
  const NEW = {
    skin: phys(M.skin, { roughness: .34, metalness: .08, clearcoat: 1, clearcoatRoughness: .06 }),
    white: phys(M.white, { roughness: .34, metalness: .08, clearcoat: 1, clearcoatRoughness: .07 }),
    wine: phys(M.wine, { roughness: .38, metalness: .1, clearcoat: 1, clearcoatRoughness: .05, sheen: .2 }),
    gold: phys(M.gold, { roughness: .2, metalness: .95, clearcoat: .6, clearcoatRoughness: .1 }),
    grey: phys(M.grey, { roughness: .28, metalness: .8 }),
    dark: phys(M.dark, { roughness: .45, metalness: .5 }),
    glass: phys(M.glass, { color: new THREE.Color(0x0a1220), roughness: .02, metalness: .1, clearcoat: 1, clearcoatRoughness: 0, ior: 1.5, reflectivity: .9, envMapIntensity: env * 1.6 }),
    fan: phys(M.fan, { roughness: .22, metalness: .95, transparent: true, opacity: .55 }),
  };
  const swap = new Map(); for (const k in NEW) swap.set(M[k], NEW[k]);
  AIR.node.traverse(n => { if (n.isMesh && swap.has(n.material)) n.material = swap.get(n.material); });
  Object.assign(AIR.mats, NEW);
  // motion-blur discs over the fans (the fan blades stay faintly visible through them)
  const tex = blurTex(THREE, 8, false), discs = AIR.fans.map(f => { const d = new THREE.Mesh(new THREE.CircleGeometry(.98, 32), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: .9 })); d.position.copy(f.position); d.position.z += .06; d.renderOrder = 5; f.parent.add(d); return d; });
  const S = { bank: 0, pitch: 0, vb: 0, vp: 0 };
  return {
    mats: NEW, discs,
    spin(t, rpm = 1) { AIR.spin(t); discs.forEach((d, i) => { d.rotation.z = (i ? 1 : -1) * t * 3.1; d.material.opacity = .45 + .45 * rpm; }); NEW.fan.opacity = .9 - .55 * rpm; },
    // critically damped spring toward the target bank / pitch (w = stiffness): smooth, no overshoot, no snapping
    attitude(dt, tb, tp, w = 6) { const s = Math.min(.05, dt || .016);
      const step = (x, v, tgt) => { const a = w * w * (tgt - x) - 2 * w * v; v += a * s; x += v * s; return [x, v]; };
      [S.bank, S.vb] = step(S.bank, S.vb, tb); [S.pitch, S.vp] = step(S.pitch, S.vp, tp); return S; },
  };
}
