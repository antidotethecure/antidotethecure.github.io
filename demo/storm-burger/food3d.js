/* Storm Run · StormBurger's menu as real 3D models (Antidote 2026-10-21: "I need the food to be 3D… everything 3D").
   Built from shapes + drawn textures, matched to StormBurger's own menu photos (no downloads, no paid models):
   brioche buns, double smash patties with melted cheese (no gap between layers), crinkle pickles, iceberg, tomato, onion,
   the fried chicken sandwich, strips + fries + onion rings in wire baskets with paper, their white/blue shake cup,
   a lemonade, plus the flying cow, the uprooted stop sign and the Antidote Drizzle coin.
   Every model is merged into one mesh per material, built once, and cloned per pickup (clones share geometry). */
export function makeProps(THREE, opt = {}) {
  const TAU = Math.PI * 2, V = new THREE.Vector3();
  const ctex = (w, h, draw, srgb = true) => { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = opt.aniso || 4; t.userData.redraw = () => { const x = c.getContext("2d"); x.clearRect(0, 0, w, h); draw(x, w, h); t.needsUpdate = true; }; return t; };
  let sd = 5; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const hash = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
  const sm = t => t * t * (3 - 2 * t);
  function noise(x, y, z) { const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z), u = sm(x - X), v = sm(y - Y), w = sm(z - Z);
    const L = (a, b, t) => a + (b - a) * t, h = (i, j, k) => hash(X + i, Y + j, Z + k);
    return L(L(L(h(0, 0, 0), h(1, 0, 0), u), L(h(0, 1, 0), h(1, 1, 0), u), v), L(L(h(0, 0, 1), h(1, 0, 1), u), L(h(0, 1, 1), h(1, 1, 1), u), v), w); }
  // move every vertex: fn(v, n) gets the position and a noise value in -.5….5 and edits v in place
  function warp(geo, freq, fn) { const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { V.fromBufferAttribute(p, i); fn(V, noise(V.x * freq + 9, V.y * freq + 3, V.z * freq + 1) - .5); p.setXYZ(i, V.x, V.y, V.z); }
    geo.computeVertexNormals(); return geo; }
  const radial = (amt, yAmt = 0) => (v, n) => { const r = Math.hypot(v.x, v.z) || 1, k = 1 + n * amt / r; v.x *= k; v.z *= k; v.y += n * yAmt; };

  /* ---------- textures ---------- */
  const speck = (x, w, h, n, cols, r0, r1) => { for (let i = 0; i < n; i++) { x.fillStyle = cols[(rnd() * cols.length) | 0]; x.beginPath(); x.arc(rnd() * w, rnd() * h, r0 + rnd() * (r1 - r0), 0, TAU); x.fill(); } };
  const bunTex = ctex(256, 256, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#6a2a08"); g.addColorStop(.45, "#9a4414"); g.addColorStop(.85, "#c97e3a"); g.addColorStop(1, "#e2ac68"); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.globalAlpha = .18; speck(x, w, h * .8, 500, ["#5a2306", "#c26a2a"], .6, 2.2); x.globalAlpha = 1; });
  const bunSide = ctex(256, 64, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#e9c286"); g.addColorStop(.5, "#d79a52"); g.addColorStop(1, "#a8581f"); x.fillStyle = g; x.fillRect(0, 0, w, h); });
  const crumb = ctex(128, 128, (x, w, h) => { x.fillStyle = "#efd29c"; x.fillRect(0, 0, w, h); speck(x, w, h, 400, ["#e2bf82", "#f7e3bb", "#d9b073"], .5, 2); });
  const crust = ctex(256, 256, (x, w, h) => { x.fillStyle = "#808080"; x.fillRect(0, 0, w, h); speck(x, w, h, 1600, ["#3a3a3a", "#b8b8b8", "#5c5c5c", "#d0d0d0"], .6, 3.2); }, false);
  const turkeyTex = ctex(256, 256, (x, w, h) => { x.fillStyle = "#a7845c"; x.fillRect(0, 0, w, h); speck(x, w, h, 1400, ["#7a5a38", "#c9a678", "#5e4228", "#b8946a"], .6, 3); });
  const seared = ctex(256, 256, (x, w, h) => { x.fillStyle = "#4a2a16"; x.fillRect(0, 0, w, h); speck(x, w, h, 1400, ["#2a150a", "#6a3c1e", "#7c4a24", "#1c0e06"], .6, 3); });
  const fried = ctex(256, 256, (x, w, h) => { x.fillStyle = "#c98632"; x.fillRect(0, 0, w, h); speck(x, w, h, 1500, ["#a8641e", "#e3a84c", "#8a4e14", "#f0c070"], .6, 3); });
  const tomTop = ctex(128, 128, (x, w, h) => { x.fillStyle = "#c8261c"; x.fillRect(0, 0, w, h); x.fillStyle = "#e8584a"; for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; x.beginPath(); x.ellipse(64 + Math.cos(a) * 30, 64 + Math.sin(a) * 30, 16, 10, a, 0, TAU); x.fill(); }
    x.fillStyle = "#f2d27a"; speck(x, w, h, 0, [], 0, 0); for (let i = 0; i < 30; i++) { const a = rnd() * TAU, r = 22 + rnd() * 16; x.beginPath(); x.arc(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, 1.6, 0, TAU); x.fill(); } });
  const pickTop = ctex(64, 64, (x, w, h) => { x.fillStyle = "#6f8f2c"; x.fillRect(0, 0, w, h); x.fillStyle = "#a9c25a"; x.beginPath(); x.arc(32, 32, 22, 0, TAU); x.fill(); x.fillStyle = "#e6e7a8"; for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; x.beginPath(); x.arc(32 + Math.cos(a) * 11, 32 + Math.sin(a) * 11, 2.4, 0, TAU); x.fill(); } });
  const wire = ctex(128, 128, (x, w, h) => { x.clearRect(0, 0, w, h); x.strokeStyle = "#111215"; x.lineWidth = 3; for (let i = 0; i <= 8; i++) { x.beginPath(); x.moveTo(i * 16, 0); x.lineTo(i * 16, h); x.stroke(); x.beginPath(); x.moveTo(0, i * 16); x.lineTo(w, i * 16); x.stroke(); } });
  wire.wrapS = wire.wrapT = THREE.RepeatWrapping; wire.repeat.set(3, 1);
  const paper = ctex(256, 256, (x, w, h) => { x.fillStyle = "#dcc59b"; x.fillRect(0, 0, w, h); x.globalAlpha = .25; x.fillStyle = "#7a5a32"; x.font = "900 22px Arial,sans-serif"; for (let y = 20; y < h; y += 40) for (let xx = (y % 80 ? -30 : 0); xx < w; xx += 120) x.fillText("STORMBURGER", xx, y); x.globalAlpha = 1; });
  // their shake cup: white paper with STORM / BURGER printed in tall blue letters, a little orange bolt (from their photo)
  const cupTex = ctex(512, 256, (x, w, h) => { x.fillStyle = "#f6f7fa"; x.fillRect(0, 0, w, h); x.fillStyle = "#1d3f9a"; x.font = "900 60px Arial Black,Arial,sans-serif"; x.textBaseline = "middle";
    for (let i = 0; i < 4; i++) { x.save(); x.translate(40 + i * 128, h / 2); x.rotate(-Math.PI / 2); x.textAlign = "center"; x.fillText(i % 2 ? "BURGER" : "STORM", 0, 0); x.restore(); }
    x.fillStyle = "#e8582a"; for (let i = 0; i < 4; i++) { const cx0 = 100 + i * 128; x.beginPath(); x.moveTo(cx0, 90); x.lineTo(cx0 - 12, 128); x.lineTo(cx0 - 2, 128); x.lineTo(cx0 - 8, 160); x.lineTo(cx0 + 12, 118); x.lineTo(cx0 + 2, 118); x.closePath(); x.fill(); } });
  cupTex.wrapS = THREE.RepeatWrapping;
  const lemonTop = ctex(128, 128, (x, w, h) => { x.fillStyle = "#f2d43a"; x.beginPath(); x.arc(64, 64, 63, 0, TAU); x.fill(); x.fillStyle = "#fbf3c8"; x.beginPath(); x.arc(64, 64, 54, 0, TAU); x.fill();
    x.fillStyle = "#f7df5a"; for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; x.beginPath(); x.moveTo(64, 64); x.arc(64, 64, 49, a + .06, a + TAU / 9 - .06); x.closePath(); x.fill(); } });
  const hide = ctex(256, 128, (x, w, h) => { x.fillStyle = "#f4f4f2"; x.fillRect(0, 0, w, h); x.fillStyle = "#141414"; sd = 11;
    for (let i = 0; i < 9; i++) { const cx0 = rnd() * w, cy0 = rnd() * h, r = 12 + rnd() * 22; x.beginPath(); for (let a = 0; a < TAU; a += .4) { const rr = r * (.7 + rnd() * .5); x.lineTo(cx0 + Math.cos(a) * rr * 1.3, cy0 + Math.sin(a) * rr); } x.closePath(); x.fill(); } });
  const stopTex = ctex(256, 256, (x, w, h) => { const oct = (r) => { x.beginPath(); for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * TAU / 8; x.lineTo(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r); } x.closePath(); };
    x.fillStyle = "#f2f2f2"; oct(128); x.fill(); x.fillStyle = "#c4161c"; oct(118); x.fill(); x.fillStyle = "#fff"; x.font = "900 84px Arial,Helvetica,sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("STOP", w / 2, h / 2 + 4);
    x.globalAlpha = .18; x.fillStyle = "#3a2a20"; speck(x, w, h, 60, ["#3a2a20"], 1, 6); x.globalAlpha = 1; });
  [seared, crust, turkeyTex].forEach(t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; });
  stopTex.repeat.set(1 / 40, 1 / 40); stopTex.offset.set(.5, .5);   // ShapeGeometry UVs are its x/y, so the texture is placed in world units

  /* ---------- materials ---------- */
  const std = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: .7, metalness: 0 }, o));
  const M = {
    bun: new THREE.MeshPhysicalMaterial({ map: bunTex, roughness: .42, clearcoat: .55, clearcoatRoughness: .35 }),
    bunSide: std({ map: bunSide, roughness: .6 }), crumb: std({ map: crumb, roughness: .95 }),
    patty: std({ map: seared, bumpMap: crust, bumpScale: 2.2, roughness: .78 }),
    turkey: std({ map: turkeyTex, bumpMap: crust, bumpScale: 1.8, roughness: .8 }),
    cheese: new THREE.MeshPhysicalMaterial({ color: 0xffae12, roughness: .32, sheen: .4, emissive: 0x3a1c00, side: THREE.DoubleSide }),
    lettuce: std({ color: 0x8fd052, roughness: .55, side: THREE.DoubleSide }), slaw: std({ color: 0xe4ecc8, roughness: .75, side: THREE.DoubleSide }), tomSide: std({ color: 0xb8201a, roughness: .4 }), tomTop: std({ map: tomTop, roughness: .35 }),
    onion: std({ color: 0xf4efe2, roughness: .5 }), pickle: std({ color: 0x5f7d24, roughness: .45 }), pickTop: std({ map: pickTop, roughness: .4 }),
    sauce: std({ color: 0xf0a560, roughness: .3 }), mayo: std({ color: 0xf5efd8, roughness: .3 }),
    fried: std({ map: fried, bumpMap: crust, bumpScale: 3, roughness: .7 }),
    fry: std({ color: 0xe9a83c, roughness: .55 }),
    wire: std({ map: wire, transparent: true, alphaTest: .4, side: THREE.DoubleSide, metalness: .6, roughness: .5 }),
    paper: std({ map: paper, side: THREE.DoubleSide, roughness: .9 }), steel: std({ color: 0xc8ccd2, metalness: .9, roughness: .3 }), dip: std({ color: 0xe8dcc0, roughness: .3 }),
    cup: std({ map: cupTex, roughness: .55 }), cupIn: std({ color: 0xffffff, roughness: .7 }), vanilla: new THREE.MeshPhysicalMaterial({ color: 0xfaf3df, roughness: .45, sheen: .5 }),
    plastic: new THREE.MeshPhysicalMaterial({ color: 0xf6fbff, roughness: .05, transparent: true, opacity: .28, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide }),
    lemonade: new THREE.MeshPhysicalMaterial({ color: 0xffe25a, roughness: .15, transparent: true, opacity: .88, emissive: 0x4a3a00, clearcoat: .6 }),
    ice: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .05, transparent: true, opacity: .5, clearcoat: 1 }),
    lemonRind: std({ color: 0xf2cf2a, roughness: .5 }), lemonTop: std({ map: lemonTop, roughness: .4 }),
    straw: std({ color: 0x1d43b5, roughness: .4 }), strawW: std({ color: 0xf5f6f8, roughness: .4 }),
    hide: std({ map: hide, roughness: .75 }), pink: std({ color: 0xe8a0a0, roughness: .6 }), hoof: std({ color: 0x1b1612, roughness: .6 }), horn: std({ color: 0xe9dcc0, roughness: .5 }), eye: std({ color: 0x0a0a0a, roughness: .2 }),
    stop: std({ map: stopTex, roughness: .45, side: THREE.FrontSide }), signBack: std({ color: 0x9aa0a8, metalness: .8, roughness: .35 }), signEdge: std({ color: 0xe9e9e9, roughness: .4 }),
    pole: std({ color: 0xa8adb4, metalness: .85, roughness: .35 }), concrete: std({ color: 0x8c877c, bumpMap: crust, bumpScale: 3, roughness: 1 }), dirt: std({ color: 0x4a3a2a, roughness: 1 }),
    gold: std({ color: 0xffc93a, metalness: 1, roughness: .25, emissive: 0x6a4200, emissiveIntensity: .6 }),
  };

  /* ---------- building blocks ---------- */
  const parts = [];   // [geometry, material] pairs of the model being built
  const put = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1) => { geo.rotateX(rx); geo.rotateY(ry); geo.rotateZ(rz); if (s !== 1) geo.scale(s, s, s); geo.translate(x, y, z); parts.push([geo, mat]); return geo; };
  const cyl = (rt, rb, h, seg = 40, hs = 1, open = false) => new THREE.CylinderGeometry(rt, rb, h, seg, hs, open);
  const layered = (geo, side, top, bot) => [geo, [side, top, bot || side]];   // a cylinder with its own side/top/bottom looks
  function topBun(y, r = 24, hgt = 14) { const g = new THREE.SphereGeometry(1, 44, 18, 0, TAU, 0, Math.PI / 2); g.scale(r, hgt, r); warp(g, .18, radial(1.2, .6)); put(g, M.bun, 0, y); put(cyl(r, r - .5, 2.6, 44), M.bunSide, 0, y - 1.2); return y + hgt; }
  function botBun(y, r = 23.5) { const g = cyl(r - .4, r - 1.4, 7, 44); warp(g, .2, radial(.8)); parts.push([g.translate(0, y + 3.5, 0), [M.bunSide, M.crumb, M.bun]]); return y + 7; }
  function patty(y, r = 26.5, h = 7.5, mat = M.patty) { const g = cyl(r, r - .6, h, 56, 3); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * 18);   /* tile the sear around the edge so it isn't stretched */ warp(g, .3, (v, n) => { const rr = Math.hypot(v.x, v.z) || 1, k = 1 + n * 3.4 / rr; v.x *= k; v.z *= k; v.y += n * 1.4; }); put(g, mat, 0, y + h / 2 - .4); return y + h - .8; }
  function cheese(y, s = 40, drape = .3) { const g = new THREE.PlaneGeometry(s, s, 16, 16); g.rotateX(-Math.PI / 2); g.rotateY(Math.PI / 4 + (rnd() - .5) * .4);
    warp(g, .2, (v, n) => { const rr = Math.hypot(v.x, v.z); if (rr > 15) v.y -= Math.min(6.5, Math.pow(rr - 15, 1.4) * drape); v.y += n * .6; }); put(g, M.cheese, 0, y + .4); return y + .8; }
  function lettuce(y, r = 29, mat = M.lettuce) { const g = cyl(r, r - 1, 2.2, 72, 1); warp(g, .35, (v, n) => { const a = Math.atan2(v.z, v.x), rr = Math.hypot(v.x, v.z), q = rr / r; v.y += (Math.sin(a * 11) * 1.8 + n * 2.4) * q; const k = 1 + (Math.sin(a * 7) * .06 + n * .1) * q; v.x *= k; v.z *= k; });
    put(g, mat, 0, y + 1); return y + 2.6; }
  function tomato(y, n = 1) { for (let i = 0; i < n; i++) { const g = cyl(19, 19, 3.2, 32); parts.push([g.translate(-6 + i * 12, y + 1.6, (i - .5) * 6), [M.tomSide, M.tomTop, M.tomTop]]); } return y + 3.2; }
  function onion(y) { [[-6, 3, 12], [7, -4, 10], [0, 8, 9]].forEach(([x, z, r]) => put(new THREE.TorusGeometry(r, 1.3, 6, 28), M.onion, x, y + 1, z, Math.PI / 2)); return y + 2.2; }
  function pickles(y, n = 5, r0 = 13) { for (let i = 0; i < n; i++) { const a = i / n * TAU + .3, g = cyl(6, 6, 1.4, 28); warp(g, .9, (v) => { const rr = Math.hypot(v.x, v.z); if (rr > 3) { const aa = Math.atan2(v.z, v.x), k = 1 + Math.sin(aa * 14) * .07; v.x *= k; v.z *= k; } });
    parts.push([g.translate(Math.cos(a) * r0, y + .8 + (i % 2) * .5, Math.sin(a) * r0), [M.pickle, M.pickTop, M.pickTop]]); } return y + 1.8; }
  const sauce = (y, r = 24, m = M.sauce) => { put(cyl(r, r, 1.2, 40), m, 0, y + .6); return y + 1; };
  function fillet(y) { const g = new THREE.IcosahedronGeometry(1, 5); g.scale(33, 8.5, 28); warp(g, .16, (v, n) => { v.multiplyScalar(1 + n * .32); v.y += noise(v.x * .5, 0, v.z * .5) * 2; }); put(g, M.fried, 0, y + 7.5); return y + 14; }
  function basket(w = 52, d = 40, h = 13) { const g = cyl(1, .78, 1, 4, 1, true); g.rotateY(Math.PI / 4); g.scale(w * .71, h, d * .71); put(g, M.wire, 0, h / 2);
    const b = new THREE.PlaneGeometry(w * .78, d * .78); put(b, M.wire, 0, .3, 0, -Math.PI / 2);
    const p = new THREE.PlaneGeometry(w * 1.2, d * 1.25, 14, 14); p.rotateX(-Math.PI / 2); warp(p, .14, (v, n) => { const q = Math.max(Math.abs(v.x) / (w * .55), Math.abs(v.z) / (d * .55)); v.y = 1.5 + Math.pow(q, 2.2) * h * 1.25 + n * 5 * q; v.x *= .92; v.z *= .92; }); put(p, M.paper);
    return h * .55; }
  function tender(x, y, z, ry, len = 30) { const g = new THREE.CapsuleGeometry(5.8, len, 6, 16); g.rotateZ(Math.PI / 2); g.scale(1, .78, 1); warp(g, .45, (v, n) => { v.y += n * 2.4; v.z += n * 1.6; }); put(g, M.fried, x, y, z, 0, ry); }

  /* ---------- the models (y = 0 is the bottom, built about 50 wide; fit() scales them to the game's size) ---------- */
  const BUILD = {
    burger() { let y = botBun(0); y = sauce(y); y = patty(y); y = cheese(y); y = patty(y); y = cheese(y, 42, .36); y = pickles(y); y = onion(y); y = tomato(y, 2); y = lettuce(y); topBun(y - .6); },   // double smash, cheese melted over both, no gaps
    turkey() { let y = botBun(0); y = sauce(y, 24, M.mayo); y = patty(y, 25, 11, M.turkey); y = cheese(y); y = tomato(y, 2); y = onion(y); y = lettuce(y, 28); topBun(y - .6); },
    sandwich() { let y = botBun(0); y = sauce(y, 19, M.mayo); y = fillet(y); y = lettuce(y - 1, 27, M.slaw); y = lettuce(y, 26, M.slaw); y = pickles(y - 1, 4, 11); y = lettuce(y, 29); topBun(y - .6); },   // chicken sandwich: kale slaw + lettuce (Antidote 10-21),
    chicken() { BUILD.sandwich(); },
    strips() { const b = basket(); tender(-4, b + 11, -8, .25, 34); tender(2, b + 14, 3, -.12, 36); tender(-5, b + 18, 10, .5, 30); put(cyl(8, 6.5, 7, 24), M.steel, 18, b + 9, 13); put(cyl(7.2, 7.2, .6, 24), M.dip, 18, b + 12.4, 13); },
    fries() { const b = basket(46, 40, 12); sd = 21; for (let i = 0; i < 30; i++) { const len = 20 + rnd() * 12, g = new THREE.BoxGeometry(3, len, 3); const a = rnd() * TAU, r = rnd() * 13;
      put(g, M.fry, Math.cos(a) * r, b + len * .38, Math.sin(a) * r * .8, (rnd() - .5) * 1.1, rnd() * 3, (rnd() - .5) * 1.4); } },
    rings() { const b = basket(48, 42, 12); [[-8, b + 10, -4, 1.2], [9, b + 11, 3, 1.05], [-2, b + 18, 6, .9], [2, b + 26, -2, 1.1]].forEach(([x, y, z, tilt], i) => {
      const g = new THREE.TorusGeometry(11, 4.4, 12, 30); warp(g, .55, (v, n) => { v.multiplyScalar(1 + n * .12); }); put(g, M.fried, x, y, z, tilt, i * .7); }); },
    shake() { const g = cyl(16, 12, 36, 40, 1, true); put(g, M.cup, 0, 18); put(cyl(12, 12, .8, 32), M.cupIn, 0, .4);
      put(cyl(15.6, 15.6, 1, 40), M.vanilla, 0, 35.2); const d = new THREE.SphereGeometry(1, 32, 12, 0, TAU, 0, Math.PI / 2); d.scale(15, 7, 15); warp(d, .25, radial(1, 1.2)); put(d, M.vanilla, 0, 35.4);
      put(new THREE.TorusGeometry(16, 1, 8, 40), M.cupIn, 0, 36, 0, Math.PI / 2); },
    lemonade() { const g = cyl(15, 11.5, 38, 40, 1, true); put(g, M.plastic, 0, 19); put(cyl(11.5, 11.5, .6, 32), M.plastic, 0, .3);
      put(cyl(14.2, 11, 31, 40), M.lemonade, 0, 16); sd = 33; for (let i = 0; i < 5; i++) { const s = 6 + rnd() * 2, c = new THREE.BoxGeometry(s, s, s); put(c, M.ice, (rnd() - .5) * 14, 26 + rnd() * 6, (rnd() - .5) * 14, rnd(), rnd(), rnd()); }
      parts.push([cyl(9, 9, 2.2, 32).rotateX(Math.PI / 2).rotateY(.3).translate(12, 37, 2), [M.lemonRind, M.lemonTop, M.lemonTop]]);
      for (let i = 0; i < 6; i++) put(cyl(1.3, 1.3, 9, 10), i % 2 ? M.strawW : M.straw, -4 + i * .55, 34 + i * 7.4, -3, 0, 0, -.28); },
    cow() { const body = new THREE.CapsuleGeometry(15, 34, 8, 20); body.rotateZ(Math.PI / 2); warp(body, .08, (v, n) => v.multiplyScalar(1 + n * .08)); put(body, M.hide, 0, 30);
      const head = new THREE.CapsuleGeometry(7.5, 10, 6, 14); head.rotateZ(Math.PI / 2 - .35); put(head, M.hide, 36, 40); put(new THREE.SphereGeometry(6.2, 16, 12).scale(1, .85, 1.1), M.pink, 45.5, 35.5);
      [-1, 1].forEach(s => { put(new THREE.ConeGeometry(1.6, 7, 8), M.horn, 34, 50, s * 5, s * .5); put(new THREE.SphereGeometry(3.2, 10, 8).scale(1.6, .5, 1), M.hide, 31, 46, s * 9, s * .6); put(new THREE.SphereGeometry(1.3, 10, 8), M.eye, 40.5, 43, s * 5.2); });
      [[-18, -8], [-18, 8], [18, -8], [18, 8]].forEach(([x, z]) => { put(cyl(3.4, 3, 20, 10), M.hide, x, 10, z); put(cyl(3.2, 3.4, 4, 10), M.hoof, x, 1.5, z); });
      put(new THREE.SphereGeometry(6, 14, 10).scale(1, .7, 1), M.pink, -10, 16, 0); put(cyl(1, .8, 22, 6), M.hide, -31, 30, 0, 0, 0, -.5); put(new THREE.SphereGeometry(2.6, 8, 6), M.hoof, -36.5, 20.5, 0); },
    stop() { const sh = new THREE.Shape(); for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * TAU / 8; sh[i ? "lineTo" : "moveTo"](Math.cos(a) * 20, Math.sin(a) * 20); }
      const e = new THREE.ExtrudeGeometry(sh, { depth: 1.4, bevelEnabled: false }); parts.push([e.translate(0, 62, -1.4), [M.signBack, M.signEdge]]); put(new THREE.ShapeGeometry(sh), M.stop, 0, 62, .06);
      put(cyl(1.7, 1.7, 66, 10), M.pole, 0, 31, -2.4); const c = new THREE.DodecahedronGeometry(9, 1); warp(c, .3, (v, n) => v.multiplyScalar(1 + n * .5)); put(c, M.concrete, 0, 0, -2, 0, 0, 0); put(new THREE.DodecahedronGeometry(6, 0).scale(1.2, .7, 1), M.dirt, 2, -5, -1); },
  };

  // merge a model's parts into one geometry per material (a mobile GPU then draws each pickup in a handful of calls)
  function bake() { const buckets = new Map();
    for (const [geo0, mat] of parts) { const g = geo0.index ? geo0.toNonIndexed() : geo0, mats = Array.isArray(mat) ? mat : [mat], groups = g.groups.length && Array.isArray(mat) ? g.groups : [{ start: 0, count: g.attributes.position.count, materialIndex: 0 }];
      for (const gr of groups) { const m = mats[gr.materialIndex] || mats[0]; let b = buckets.get(m); if (!b) buckets.set(m, b = { p: [], n: [], u: [] });
        const P = g.attributes.position.array, N = g.attributes.normal.array, Uv = g.attributes.uv ? g.attributes.uv.array : null;
        for (let i = gr.start; i < gr.start + gr.count; i++) { b.p.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); b.n.push(N[i * 3], N[i * 3 + 1], N[i * 3 + 2]); b.u.push(Uv ? Uv[i * 2] : 0, Uv ? Uv[i * 2 + 1] : 0); } } }
    const root = new THREE.Group();
    for (const [m, b] of buckets) { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(b.p, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(b.n, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(b.u, 2)); g.computeBoundingSphere();
      const mesh = new THREE.Mesh(g, m); if (m.transparent) mesh.renderOrder = 2; root.add(mesh); }
    parts.length = 0; return root; }
  const cache = {};
  function model(k) { if (!cache[k]) { if (!BUILD[k]) return null; sd = 5 + k.length; BUILD[k](); cache[k] = bake(); } return cache[k]; }
  // a clone scaled so its widest side is `w`, centred, sitting on y = 0
  function fit(k, w) { const src = model(k); if (!src) return null; const o = src.clone(), bb = new THREE.Box3().setFromObject(src), sz = bb.getSize(new THREE.Vector3()), s = w / Math.max(sz.x, sz.z);
    const inner = new THREE.Group(); inner.add(o); o.scale.setScalar(s); o.position.set(-(bb.min.x + bb.max.x) / 2 * s, -bb.min.y * s, -(bb.min.z + bb.max.z) / 2 * s); return inner; }

  // Antidote Drizzle coin: gold rim, his logo on both faces
  const DRIZ = new Image(); let drizTex = null;
  function driz(w = 46) { if (!drizTex) { drizTex = ctex(256, 256, (x, W2, H2) => { const g = x.createRadialGradient(128, 110, 10, 128, 128, 128); g.addColorStop(0, "#2b2f6e"); g.addColorStop(1, "#0c0e2a"); x.fillStyle = g; x.fillRect(0, 0, W2, H2);
        x.strokeStyle = "#ffd23f"; x.lineWidth = 14; x.beginPath(); x.arc(128, 128, 118, 0, TAU); x.stroke(); if (DRIZ.complete && DRIZ.naturalWidth) { const a = DRIZ.naturalHeight / DRIZ.naturalWidth, dw = 190; x.drawImage(DRIZ, 128 - dw / 2, 128 - dw * a / 2, dw, dw * a); } });
      DRIZ.onload = () => drizTex.userData.redraw(); DRIZ.src = opt.drizzle || "img/game/antidote-logo.webp"; }
    const face = new THREE.MeshStandardMaterial({ map: drizTex, roughness: .35, metalness: .3, emissive: 0xffffff, emissiveMap: drizTex, emissiveIntensity: .35 });
    const g = new THREE.CylinderGeometry(w / 2, w / 2, w * .09, 40); g.rotateX(Math.PI / 2); g.rotateZ(Math.PI / 2);   // faces toward ±z, logo upright
    const m = new THREE.Mesh(g, [M.gold, face, face]); const o = new THREE.Group(); o.add(m); return o; }

  return { fit, model, driz, M, kinds: Object.keys(BUILD), setModel: (k, o) => { cache[k] = o; } };
}
