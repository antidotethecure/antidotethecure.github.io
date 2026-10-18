/* engine3d/blimp.js — a detailed airship: fabric envelope (lathe hull, 12 gores with seam lines and a bump map so the light
   catches the panels, satin sheen), four tail fins with hinged rudders/elevators, a gondola with lit windows, two engine pods
   with spinning props + motion-blur discs, an LED message band that scrolls along both sides, painted lettering, a logo on the
   lower flanks + belly, red/green/white nav lights and a red anti-collision beacon. Nose = +X, length ≈ 100 units.
     const b = buildBlimp(THREE, { top: "MELODY", led: ["ANTIDOTE FOOD REVIEW", "antidotethefoodie.com"], logo: texture|null, logoText: "NALU VIDA", colors })
     b.node (Group) · b.update(t, fx?) — props, LED scroll, lights · b.lights → named points for glow sprites */
export function buildBlimp(THREE, O = {}) {
  const C = Object.assign({ body: "#f4efe4", band: "#7a1f2c", gold: "#d4af37", fin: "#7a1f2c", gondola: "#1d1f26" }, O.colors || {});
  const L = 100, R = 18, g = new THREE.Group(), mkc = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
  const tex = (c, srgb = true) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  // envelope: u runs round the hull (12 gores), v along it
  const skin = mkc(1024, 512), sx = skin.getContext("2d"), bump = mkc(1024, 512), bx = bump.getContext("2d");
  sx.fillStyle = C.body; sx.fillRect(0, 0, 1024, 512); bx.fillStyle = "#808080"; bx.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 12; i++) { const u = i / 12 * 1024; sx.fillStyle = "rgba(120,104,84,.18)"; sx.fillRect(u - 1.5, 0, 3, 512); bx.fillStyle = "#3a3a3a"; bx.fillRect(u - 2, 0, 4, 512);
    const gr = sx.createLinearGradient(u, 0, u + 1024 / 12, 0); gr.addColorStop(0, "rgba(0,0,0,.05)"); gr.addColorStop(.5, "rgba(255,255,255,.05)"); gr.addColorStop(1, "rgba(0,0,0,.05)"); sx.fillStyle = gr; sx.fillRect(u, 0, 1024 / 12, 512); }
  for (let v = 0; v < 512; v += 42) { sx.fillStyle = "rgba(120,104,84,.10)"; sx.fillRect(0, v, 1024, 1.5); bx.fillStyle = "#5a5a5a"; bx.fillRect(0, v, 1024, 2); }
  // a wine band low on each side (u ≈ .25 / .75 are the sides once the hull is oriented: see rotation below)
  const band = (u0) => { sx.fillStyle = C.band; sx.fillRect(u0 * 1024 - 30, 0, 60, 512); sx.fillStyle = C.gold; sx.fillRect(u0 * 1024 - 34, 0, 4, 512); sx.fillRect(u0 * 1024 + 30, 0, 4, 512); };
  band(.17); band(.33);
  const prof = []; for (let i = 0; i <= 40; i++) { const t = i / 40, x = (t - .5) * L; let r = R * Math.pow(Math.sin(Math.PI * t), .5) * (t < .5 ? 1 - Math.pow((.5 - t) / .5, 2) * .5 : 1); prof.push(new THREE.Vector2(Math.max(.01, r), x)); }
  const hullG = new THREE.LatheGeometry(prof, 48); hullG.rotateZ(-Math.PI / 2);   // axis along X, nose +X
  const fabric = new THREE.MeshPhysicalMaterial({ map: tex(skin), bumpMap: tex(bump, false), bumpScale: 1.2, roughness: .62, metalness: 0, sheen: .5, sheenRoughness: .6, sheenColor: new THREE.Color(1, .97, .9), clearcoat: .15, clearcoatRoughness: .5 });
  const hull = new THREE.Mesh(hullG, fabric); hull.castShadow = true; hull.receiveShadow = true; g.add(hull);
  // nose cone battens + mooring cap
  const cap = new THREE.Mesh(new THREE.SphereGeometry(2.2, 12, 8), new THREE.MeshStandardMaterial({ color: 0x8a8f99, metalness: .8, roughness: .3 })); cap.position.set(L / 2 - 1, 0, 0); g.add(cap);
  // tail fins: 4 swept fins + control surfaces
  const finShape = new THREE.Shape(); finShape.moveTo(0, 0); finShape.lineTo(-20, 0); finShape.lineTo(-23, 15); finShape.lineTo(-12, 15); finShape.lineTo(0, 0);
  const finG = new THREE.ExtrudeGeometry(finShape, { depth: 1.1, bevelEnabled: true, bevelThickness: .3, bevelSize: .3, bevelSegments: 2 }); finG.translate(0, 0, -.55);
  const finM = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(C.fin), roughness: .5, clearcoat: .5 }), ctlM = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(C.gold), roughness: .35, metalness: .6 });
  const ctls = [];
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4, f = new THREE.Group(); f.rotation.x = a; f.position.set(-L * .3, 0, 0); g.add(f);
    const fin = new THREE.Mesh(finG, finM); fin.position.set(0, R * .42, 0); fin.castShadow = true; f.add(fin);
    const ctl = new THREE.Mesh(new THREE.BoxGeometry(4, 13, .9).translate(-2, 6.5, 0), ctlM); ctl.position.set(-22, R * .42 + 1.5, 0); f.add(ctl); ctls.push(ctl); }
  // gondola: a rounded cabin with a lit window strip, under the hull
  const gonG = new THREE.CapsuleGeometry(4.2, 18, 4, 12); gonG.rotateZ(Math.PI / 2); gonG.scale(1, .82, .95);
  const gon = new THREE.Mesh(gonG, new THREE.MeshPhysicalMaterial({ color: new THREE.Color(C.gondola), roughness: .4, metalness: .4, clearcoat: .8 })); gon.position.set(6, -R * .92 - 3.2, 0); gon.castShadow = true; g.add(gon);
  const winC = mkc(256, 32), wx = winC.getContext("2d"); wx.fillStyle = "#000"; wx.fillRect(0, 0, 256, 32); for (let i = 0; i < 9; i++) { wx.fillStyle = i === 0 ? "#bfe4ff" : "#ffd59a"; wx.fillRect(10 + i * 27, 7, 20, 18); }
  const winM = new THREE.MeshBasicMaterial({ map: tex(winC), toneMapped: false, transparent: true, blending: THREE.AdditiveBlending });
  [-1, 1].forEach(s => { const w = new THREE.Mesh(new THREE.PlaneGeometry(20, 2.6), winM); w.position.set(6.5, -R * .92 - 2.6, s * 4.05); if (s < 0) w.rotation.y = Math.PI; g.add(w); });
  { const rail = new THREE.Mesh(new THREE.BoxGeometry(14, 1, 1), ctlM); rail.position.set(6, -R * .92 + .4, 0); g.add(rail); }
  // engine pods with spinning 3-blade props + blur discs
  const podM = new THREE.MeshPhysicalMaterial({ color: 0x9aa0a8, metalness: .75, roughness: .3, clearcoat: .6 }), props = [], discs = [];
  const bladeG = new THREE.BoxGeometry(.5, 7, 1.2).translate(0, 3.5, 0), blurC = mkc(128, 128), bcx = blurC.getContext("2d"); bcx.translate(64, 64);
  for (let b = 0; b < 3; b++) for (let k = 0; k < 18; k++) { const a = b * 2.094 + k * .05; bcx.fillStyle = `rgba(40,42,48,${.06 * (1 - k / 18)})`; bcx.beginPath(); bcx.moveTo(0, 0); bcx.arc(0, 0, 62, a, a + .09); bcx.fill(); }
  const blurM = new THREE.MeshBasicMaterial({ map: tex(blurC), transparent: true, depthWrite: false, side: THREE.DoubleSide });
  [-1, 1].forEach(s => { const pod = new THREE.Mesh(new THREE.CapsuleGeometry(2.1, 6, 4, 10).rotateZ(Math.PI / 2), podM); pod.position.set(2, -R * .92 - 2.4, s * 9); pod.castShadow = true; g.add(pod);
    const strut = new THREE.Mesh(new THREE.BoxGeometry(2, .7, 5), podM); strut.position.set(2, -R * .92 - 2.4, s * 6.2); g.add(strut);
    const hub = new THREE.Group(); hub.position.set(-3.2, -R * .92 - 2.4, s * 9); g.add(hub); for (let b = 0; b < 3; b++) { const bl = new THREE.Mesh(bladeG, podM); bl.rotation.x = b * 2.094; hub.add(bl); } props.push(hub);
    const d = new THREE.Mesh(new THREE.CircleGeometry(7.2, 28), blurM); d.position.set(-3.4, -R * .92 - 2.4, s * 9); d.rotation.y = Math.PI / 2; d.renderOrder = 6; g.add(d); discs.push(d); });
  // LED message band along both sides (scrolls), painted lettering on top, logo low on the flanks + belly
  const led = (O.led || ["ANTIDOTE FOOD REVIEW", "antidotethefoodie.com"]).join("      •      ") + "      •      ";
  const ledC = mkc(2048, 96), lx = ledC.getContext("2d"), txC = mkc(2048, 96), tx = txC.getContext("2d");
  tx.font = "900 62px Arial, sans-serif"; tx.textBaseline = "middle"; tx.fillStyle = "#ffcf4a"; { let px = 20; const w = tx.measureText(led).width; while (px < 2048) { tx.fillText(led, px, 50); px += w; } }
  { const dot = mkc(4, 4), d2 = dot.getContext("2d"); d2.fillStyle = "#fff"; d2.fillRect(0, 0, 3, 3); tx.globalCompositeOperation = "destination-in"; tx.fillStyle = tx.createPattern(dot, "repeat"); tx.fillRect(0, 0, 2048, 96); }   // only the LED dots light
  lx.fillStyle = "#060608"; lx.fillRect(0, 0, 2048, 96); { const dot = mkc(4, 4), d2 = dot.getContext("2d"); d2.fillStyle = "#1a1408"; d2.fillRect(0, 0, 3, 3); lx.fillStyle = lx.createPattern(dot, "repeat"); lx.fillRect(0, 0, 2048, 96); }   // dark LEDs
  lx.drawImage(txC, 0, 0);
  const ledT = tex(ledC); ledT.wrapS = THREE.RepeatWrapping; ledT.repeat.set(.42, 1);
  const ledM = new THREE.MeshBasicMaterial({ map: ledT, toneMapped: false, side: THREE.DoubleSide, color: new THREE.Color(1.6, 1.6, 1.6) });
  // a strip that hugs the hull just below the equator on each side (a bent plane, text reading the right way from outside)
  const strip = (side) => { const g2 = new THREE.PlaneGeometry(L * .56, 9, 40, 4), p = g2.attributes.position, uv = g2.attributes.uv, th0 = side > 0 ? .3 : Math.PI - .3;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), yv = p.getY(i), xt = (x / L + .5); const r = R * 1.012 * Math.pow(Math.sin(Math.PI * Math.min(.99, Math.max(.01, xt))), .5) * (xt < .5 ? 1 - Math.pow((.5 - xt) / .5, 2) * .5 : 1);
      const a = th0 - side * yv / R; p.setXYZ(i, x, -r * Math.sin(a), r * Math.cos(a)); if (side < 0) uv.setX(i, 1 - uv.getX(i)); }
    g2.computeVertexNormals(); const m = new THREE.Mesh(g2, ledM); m.position.x = 2; m.renderOrder = 4; g.add(m); return m; };
  const strips = [strip(1), strip(-1)];
  const paint = (txt, w, h, font, fill, stroke) => { const c = mkc(w, h), x = c.getContext("2d"); x.clearRect(0, 0, w, h); x.font = font; x.textAlign = "center"; x.textBaseline = "middle"; if (stroke) { x.lineWidth = h * .08; x.strokeStyle = stroke; x.strokeText(txt, w / 2, h / 2); } x.fillStyle = fill; x.fillText(txt, w / 2, h / 2); return tex(c); };
  if (O.top) { const topM = new THREE.MeshBasicMaterial({ map: paint(O.top, 1024, 256, "400 190px Anton, Impact, sans-serif", C.gold, "rgba(60,30,10,.6)"), transparent: true, depthWrite: false });
    const tw = new THREE.Mesh(new THREE.PlaneGeometry(50, 12.5).rotateX(-Math.PI / 2), topM); tw.position.set(4, R * .99 + .3, 0); tw.renderOrder = 5; g.add(tw); g.userData.top = tw; }
  // logo: real texture if given, else lettering — on the lower flanks (both sides) and the belly
  const logoM = new THREE.MeshBasicMaterial({ map: O.logo || paint(O.logoText || "NALU VIDA", 1024, 256, "900 150px Georgia, serif", "#ff7a3a", "#0b3d4a"), transparent: true, depthWrite: false, toneMapped: true });
  const logoW = O.logo ? 13 : 30, logoH = O.logo ? 13 : 7.5;
  [1, -1].forEach(s => { const m = new THREE.Mesh(new THREE.PlaneGeometry(logoW, logoH), logoM); m.position.set(-22, -R * .5, s * R * .81); m.rotation.set(s > 0 ? .62 : -.62, s > 0 ? 0 : Math.PI, 0); m.renderOrder = 5; g.add(m); });
  const belly = new THREE.Mesh(new THREE.PlaneGeometry(logoW * 1.3, logoH * 1.3).rotateX(Math.PI / 2), logoM); belly.position.set(-20, -R * .99, 0); belly.rotation.y = Math.PI / 2; belly.renderOrder = 5; g.add(belly);
  // light points (for glow sprites) + emissive bulbs
  const P = (x, y, z) => new THREE.Vector3(x, y, z);
  const lights = { navL: P(6, -R * .92 - 3, 4.8), navR: P(6, -R * .92 - 3, -4.8), tail: P(-L / 2 - 4, 0, 0), beaconTop: P(8, R + .8, 0), beaconBot: P(6, -R * .92 - 7.2, 0) };
  const bulbM = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), bulbs = {};
  for (const k in lights) { const b = new THREE.Mesh(new THREE.SphereGeometry(.7, 8, 6), bulbM.clone()); b.position.copy(lights[k]); g.add(b); bulbs[k] = b; }
  bulbs.navL.material.color.setRGB(2, .1, .1); bulbs.navR.material.color.setRGB(.1, 2, .3);
  const box = new THREE.Box3().setFromObject(g), size = box.getSize(new THREE.Vector3());
  return { node: g, size, lights, props, strips, discs,
    update(t, fx) { props.forEach((p, i) => { p.rotation.x = (i ? -1 : 1) * t * 38; }); discs.forEach((d, i) => { d.rotation.z = (i ? -1 : 1) * t * 3; });
      ledT.offset.x = (t * .06) % 1; ctls.forEach((c, i) => { c.rotation.y = Math.sin(t * .7 + i) * .12; });
      const bl = (t % 1.1) < .08, st = (t % 1.5) < .06 || ((t % 1.5) > .14 && (t % 1.5) < .2);
      bulbs.beaconTop.material.color.setRGB(bl ? 3 : .3, bl ? .1 : .02, bl ? .1 : .02); bulbs.beaconBot.material.color.copy(bulbs.beaconTop.material.color); bulbs.tail.material.color.setScalar(st ? 3 : .4);
      if (fx) { g.updateMatrixWorld(true); const W = (v) => g.localToWorld(v.clone()), k = g.scale.x;
        fx.glow(W(lights.navL), 6 * k, [1, .15, .12], .9); fx.glow(W(lights.navR), 6 * k, [.15, 1, .35], .9);
        if (bl) { fx.glow(W(lights.beaconTop), 14 * k, [1, .1, .05], 1); fx.glow(W(lights.beaconBot), 14 * k, [1, .1, .05], 1); } if (st) fx.glow(W(lights.tail), 16 * k, [1, 1, 1], 1); } } };
}
