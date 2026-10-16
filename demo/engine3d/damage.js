/* engine3d/damage.js — bullet damage on a 3D vehicle: raycast hits, decals at the real hit point, sparks + smoke + localized
   flames that trail in the airflow, damage that escalates in stages. Particles go through a makeFX / makeGPUFX style system.
     const dmg = makeHitDamage(THREE, { fx, target, engines: [local points], maxDecals: 40, scale: () => k })
     dmg.hit(originWorld, dirWorld)  → true when the ray struck the airframe (decal + sparks there), false when it missed
     dmg.hitNear(localPoint)         → wound at the surface point closest to a model-local point (collisions, no ray)
     dmg.level = 0..1 (overall damage, e.g. 1 - hp/100) → stage 1 holes + grey wisps · 2 darker smoke + flames at the worst
                 wounds · 3 black smoke, flames everywhere, engines on fire, embers
     dmg.update(dt, t, k, windWorld)  (k = world units per model unit, wind = air velocity relative to the plane)
     dmg.reset(), dmg.heal(), dmg.count(), dmg.stage() */
export function makeHitDamage(THREE, O) {
  const fx = O.fx, target = O.target, MAXD = O.maxDecals || 40;
  const mkc = (n) => { const c = document.createElement("canvas"); c.width = c.height = n; return c; };
  // decal textures, drawn once: a punched bullet hole with a torn bright-metal lip, and a soot scorch streaked back by the airflow
  const holeT = (() => { const c = mkc(128), x = c.getContext("2d"), R = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    let g = x.createRadialGradient(64, 64, 6, 64, 64, 60); g.addColorStop(0, "rgba(20,14,10,.85)"); g.addColorStop(.45, "rgba(40,30,24,.45)"); g.addColorStop(1, "rgba(40,30,24,0)"); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    x.fillStyle = "rgba(205,200,190,.95)"; x.beginPath(); for (let i = 0; i <= 18; i++) { const a = i / 18 * Math.PI * 2, r = 17 + R() * 7; x.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); } x.fill();   // bare metal lip
    x.fillStyle = "#050404"; x.beginPath(); for (let i = 0; i <= 14; i++) { const a = i / 14 * Math.PI * 2, r = 11 + R() * 5; x.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); } x.fill();   // the hole
    x.strokeStyle = "rgba(30,24,20,.6)"; x.lineWidth = 1.5; for (let i = 0; i < 9; i++) { const a = R() * 6.28; x.beginPath(); x.moveTo(64 + Math.cos(a) * 20, 64 + Math.sin(a) * 20); x.lineTo(64 + Math.cos(a) * (32 + R() * 18), 64 + Math.sin(a) * (32 + R() * 18)); x.stroke(); }   // stress cracks
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const scorchT = (() => { const c = mkc(128), x = c.getContext("2d"); for (let i = 0; i < 30; i++) { const cx = 64 + (Math.random() - .5) * 26, cy = 40 + Math.random() * 70, r = 10 + Math.random() * 26, g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, "rgba(14,10,8,.28)"); g.addColorStop(1, "rgba(14,10,8,0)"); x.fillStyle = g; x.fillRect(0, 0, 128, 128); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const dm = (map, off) => new THREE.MeshStandardMaterial({ map, transparent: true, depthWrite: false, roughness: .85, metalness: .2, polygonOffset: true, polygonOffsetFactor: -2 - off, polygonOffsetUnits: -4 - off * 2 });
  const holeM = dm(holeT, 1), scorchM = dm(scorchT, 0), quad = new THREE.PlaneGeometry(1, 1);
  const glowM = new THREE.MeshBasicMaterial({ color: 0xff6a20, transparent: true, opacity: .0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const W = [], rc = new THREE.Raycaster(), V = new THREE.Vector3(), P = new THREE.Vector3(), N = new THREE.Vector3(), Z = new THREE.Vector3(0, 0, 1), Qn = new THREE.Quaternion(), NM = new THREE.Matrix3();
  let decals = 0;
  const D = { level: 0,
    stage() { return D.level < .3 ? 1 : D.level < .62 ? 2 : 3; },
    count: () => W.length, wounds: () => W,
    hit(origin, dir) { target.updateMatrixWorld(true); rc.set(origin, V.copy(dir).normalize()); rc.far = 5000;
      const hits = rc.intersectObject(target, true).filter(h => h.object.isMesh && !h.object.userData.decal && h.object.visible && h.face);
      if (!hits.length) return false; const h = hits[0];
      NM.getNormalMatrix(h.object.matrixWorld); N.copy(h.face.normal).applyMatrix3(NM).normalize(); if (N.dot(rc.ray.direction) > 0) N.negate();
      wound(h.point, N); return true; },
    hitNear(local) { target.updateMatrixWorld(true); const c = new THREE.Box3().setFromObject(target).getCenter(new THREE.Vector3()), w = target.localToWorld(local.clone());
      const d = w.clone().sub(c); if (d.lengthSq() < 1e-6) d.set(0, 1, 0); return D.hit(w.clone().add(d.clone().normalize().multiplyScalar(60)), d.negate()); },
    reset() { W.forEach(w => { target.remove(w.g); }); W.length = 0; decals = 0; D.level = 0; },
    heal() { const w = W.pop(); if (w) target.remove(w.g); },
    update(dt, t, k, wind) { const s = Math.min(.05, dt), st = D.stage(); if (!W.length && D.level < .5) return; target.updateMatrixWorld(true);
      W.forEach((w, i) => { P.copy(w.p); target.localToWorld(P); N.copy(w.n).transformDirection(target.matrixWorld);
        const lv = Math.max(w.lv, st === 3 ? 2 : 1), fl = .6 + .4 * Math.sin(t * 23 + w.ph) * Math.sin(t * 7 + w.ph);
        w.glow.material.opacity = (lv >= 2 ? .5 : .12) * fl;   // the hole glows hot inside
        fx.glow(V.copy(P).addScaledVector(N, .3 * k), (1.6 + fl * (lv >= 2 ? 2.2 : 1)) * k, [1, .45, .12], lv >= 2 ? .9 : .5);
        // smoke streams off the wound and back along the airflow
        const rate = st === 1 ? 6 + 4 * w.lv : st === 2 ? 14 + 6 * w.lv : 26;
        if (Math.random() < s * rate) { const heavy = st >= 2 && (lv >= 2 || st === 3), c0 = st === 3 ? [.12, .11, .1] : heavy ? [.24, .22, .21] : [.62, .61, .6], c1 = st === 3 ? [.05, .05, .05] : heavy ? [.1, .1, .1] : [.4, .4, .4];
          fx.emit(V.copy(P).addScaledVector(N, .4 * k), N.clone().multiplyScalar(3 * k).add(wind).addScaledVector(wind, -.05), 1 + .45 * lv, 1.1 * k, (2.6 + 2.4 * lv) * k, c0, c1, st === 1 ? .32 : st === 2 ? .55 : .7, false, 0, .5, 2 * k); }
        // localized flames: anchored at the hole, licking back in the slipstream
        if (lv >= 2 && (st >= 2)) { const n = st === 3 ? 3 : 2; for (let j = 0; j < n; j++) if (Math.random() < s * 34) fx.emit(V.copy(P).addScaledVector(N, .5 * k), N.clone().multiplyScalar(5 * k).addScaledVector(wind, .82), .22 + Math.random() * .14, (2.4 + fl * 1.4) * k, .7 * k, [1, .85, .42], [1, .28, .05], 1, true, 0, .2, 6 * k); }
        if (st === 3 && Math.random() < s * 6) fx.emit(P, N.clone().multiplyScalar(14 * k).addScaledVector(wind, .6), .5, .5 * k, .2 * k, [1, .8, .4], [1, .3, .1], 1, true, 2, 1, -10 * k);   // embers
      });
      if (st === 3 && O.engines) O.engines.forEach(e => { P.copy(e); target.localToWorld(P);
        if (Math.random() < s * 30) fx.emit(P, V.copy(wind), 2.2, 2.5 * k, 14 * k, [.12, .11, .11], [.05, .05, .05], .85, false, 0, .35, 2 * k);
        if (Math.random() < s * 46) fx.emit(P, V.copy(wind).multiplyScalar(.95), .3, 4 * k, 1 * k, [1, .8, .3], [1, .3, .05], 1, true, 0); }); } };
  function wound(pw, nw) {
    const lp = target.worldToLocal(pw.clone()), ln = nw.clone().transformDirection(new THREE.Matrix4().copy(target.matrixWorld).invert());
    // a second hit right next to an old wound makes that wound worse instead of adding a new one
    const near = W.find(w => w.p.distanceTo(lp) < 1.6);
    if (near) { near.lv = Math.min(3, near.lv + 1); near.g.scale.multiplyScalar(1.18); if (fx.sparks) { fx.sparks(pw, nw, null, 1, 12); } return near; }
    const g = new THREE.Group(); g.position.copy(lp).addScaledVector(ln, .02); Qn.setFromUnitVectors(Z, ln); g.quaternion.copy(Qn);
    const sc = new THREE.Mesh(quad, scorchM); sc.scale.set(3.6, 4.6, 1); sc.rotation.z = Math.random() * 6.28; sc.userData.decal = 1; sc.renderOrder = 2;
    const ho = new THREE.Mesh(quad, holeM); ho.scale.setScalar(1.5 + Math.random() * .5); ho.rotation.z = Math.random() * 6.28; ho.userData.decal = 1; ho.renderOrder = 3;
    const gl = new THREE.Mesh(new THREE.CircleGeometry(.22, 10), glowM.clone()); gl.position.z = .02; gl.userData.decal = 1; gl.renderOrder = 4;
    g.add(sc, ho, gl); target.add(g);
    const w = { p: lp, n: ln, lv: 1, ph: Math.random() * 6, g, glow: gl }; W.push(w); decals++;
    while (W.length > MAXD) { const o = W.shift(); target.remove(o.g); }
    if (fx.sparks) fx.sparks(pw, nw, null, 1, 18);
    return w; }
  return D;
}
