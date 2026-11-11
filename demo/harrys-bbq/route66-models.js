/* Harry's · Route 66 — the vehicles, built in code (nothing to download): pickup, smoker trailer, '57 sedan, woody wagon, cone.
   Real geometry so the sun, the sky reflection and the shadows work on them. Sizes in metres.
   Origin: on the ground under the rear bumper, nose toward -z. The trailer: under its hitch ball, body toward +z.
   Every part of one material is merged into one mesh, so a vehicle is about eight draw calls. */
export function makeModels(THREE, RoundedBoxGeometry, mergeGeometries) {
  const std = o => new THREE.MeshStandardMaterial(o), paints = new Map();
  const MAT = {
    tyre: std({ color: 0x141414, roughness: 0.92 }), dark: std({ color: 0x0f0f10, roughness: 0.8 }),
    chrome: std({ color: 0xe8e8e8, metalness: 1, roughness: 0.14 }), glass: std({ color: 0x0b1216, metalness: 0.9, roughness: 0.06 }),
    steel: std({ color: 0x1c1c1f, metalness: 0.7, roughness: 0.4 }), white: std({ color: 0xf0ece0, roughness: 0.5 }),
    wood: std({ color: 0x9a6532, roughness: 0.62 }), log: std({ color: 0x5a3a20, roughness: 0.95 }), cut: std({ color: 0xc79a62, roughness: 0.9 }),
    lamp: std({ color: 0x4a0606, emissive: 0xff2412, emissiveIntensity: 1.5, roughness: 0.3 }),
    head: std({ color: 0xfff4d6, emissive: 0xffe9b0, emissiveIntensity: 0.9, roughness: 0.3 }),
    ember: std({ color: 0x331000, emissive: 0xff6a14, emissiveIntensity: 2.4 }),
    cone: std({ color: 0xf2620f, roughness: 0.6 })
  };
  const paint = c => paints.get(c) || (paints.set(c, std({ color: c, metalness: 0.45, roughness: 0.3 })), paints.get(c));
  const E = new THREE.Euler(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), S = new THREE.Vector3(1, 1, 1), MX = new THREE.Matrix4();
  const rbox = (w, h, d, r) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r == null ? 0.03 : r, w / 2.01, h / 2.01, d / 2.01));
  function taper(g, h, sx, sz, sh) {   // narrows the top of a box: a cab with raked glass
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const t = p.getY(i) / h + 0.5; p.setX(i, p.getX(i) * (1 + (sx - 1) * t)); p.setZ(i, p.getZ(i) * (1 + (sz - 1) * t) + (sh || 0) * t); }
    return g;
  }
  function kit() {
    const bk = new Map();
    const put = (m, g, x, y, z, rx, ry, rz) => {
      g.deleteAttribute("uv"); if (g.index) g = g.toNonIndexed();
      g.applyMatrix4(MX.compose(P.set(x, y, z), Q.setFromEuler(E.set(rx || 0, ry || 0, rz || 0)), S)); (bk.get(m) || bk.set(m, []).get(m)).push(g);
    };
    const k = {
      put,
      box: (m, w, h, d, x, y, z, r, rx, ry, rz) => put(m, rbox(w, h, d, r), x, y, z, rx, ry, rz),
      tbox: (m, w, h, d, x, y, z, r, sx, sz, sh) => put(m, taper(rbox(w, h, d, r), h, sx, sz, sh), x, y, z),
      cyl: (m, r0, r1, len, x, y, z, ax, seg, rx) => { const g = new THREE.CylinderGeometry(r0, r1, len, seg || 20); if (ax === "x") g.rotateZ(Math.PI / 2); else if (ax === "z") g.rotateX(Math.PI / 2); put(m, g, x, y, z, rx); },
      wheel: (x, y, z, r, w, white) => { k.cyl(MAT.tyre, r, r, w, x, y, z, "x", 24); if (white) k.cyl(MAT.white, r * 0.8, r * 0.8, w + 0.012, x, y, z, "x", 24); k.cyl(MAT.chrome, r * 0.45, r * 0.45, w + 0.024, x, y, z, "x", 16); k.cyl(MAT.dark, r * 0.2, r * 0.2, w + 0.036, x, y, z, "x", 10); },
      // a cab: painted shell with the glass showing through as windows (same tapered shape, pushed 1 cm through each face)
      cab: (m, w, h, d, x, y, z, sx, sz, sh, side) => {
        k.tbox(m, w, h, d, x, y, z, 0.07, sx, sz, sh);
        k.tbox(MAT.glass, w * 0.86, h * 0.72, d + 0.024, x, y + h * 0.02, z, 0.03, sx, sz, sh);
        k.tbox(MAT.glass, w + 0.024, h * 0.7, d * (side || 0.8), x, y + h * 0.02, z, 0.03, sx, sz, sh);
      },
      done: () => { const grp = new THREE.Group(); bk.forEach((gs, m) => { const me = new THREE.Mesh(mergeGeometries(gs), m); me.castShadow = me.receiveShadow = true; grp.add(me); }); return grp; }
    };
    return k;
  }

  function pickup(color) {
    const k = kit(), p = paint(color);
    [-1.2, -4.3].forEach(z => { k.wheel(-0.83, 0.4, z, 0.4, 0.28); k.wheel(0.83, 0.4, z, 0.4, 0.28); k.box(p, 0.16, 0.3, 1.1, -0.935, 0.86, z, 0.1); k.box(p, 0.16, 0.3, 1.1, 0.935, 0.86, z, 0.1); });   // wheels and flares
    k.box(MAT.dark, 1.72, 0.3, 5.0, 0, 0.45, -2.65, 0.05);
    // the bed: skirt, floor, two walls, tailgate, black rail caps
    k.box(p, 1.92, 0.42, 2.34, 0, 0.69, -1.15, 0.06); k.box(MAT.dark, 1.68, 0.05, 2.16, 0, 0.92, -1.17, 0.01);
    [-1, 1].forEach(s => { k.box(p, 0.13, 0.48, 2.34, s * 0.895, 1.07, -1.15, 0.05); k.box(MAT.dark, 0.15, 0.03, 2.3, s * 0.895, 1.32, -1.15, 0.01); k.box(MAT.lamp, 0.11, 0.4, 0.05, s * 0.9, 1.06, 0.012, 0.02); });
    k.box(p, 1.7, 0.48, 0.1, 0, 1.07, -0.03, 0.04); k.box(p, 1.36, 0.26, 0.03, 0, 1.05, 0.022, 0.012); k.box(MAT.chrome, 0.24, 0.045, 0.03, 0, 1.24, 0.03, 0.01);
    k.box(MAT.chrome, 1.98, 0.15, 0.18, 0, 0.53, 0.04, 0.05); k.box(MAT.dark, 1.3, 0.02, 0.14, 0, 0.61, 0.05, 0.005); k.box(MAT.white, 0.32, 0.15, 0.012, 0, 0.72, 0.022, 0.005);
    k.box(MAT.steel, 0.08, 0.08, 0.34, 0, 0.42, 0.14, 0.01); k.put(MAT.chrome, new THREE.SphereGeometry(0.055, 12, 8), 0, 0.5, 0.27);
    // cab, hood, nose
    k.box(p, 1.92, 0.88, 1.95, 0, 0.92, -3.27, 0.09); k.cab(p, 1.84, 0.56, 1.62, 0, 1.6, -3.2, 0.84, 0.76, 0.1, 0.72);
    k.box(p, 1.9, 0.78, 1.2, 0, 0.87, -4.68, 0.14); k.box(p, 1.5, 0.05, 0.9, 0, 1.27, -4.62, 0.02);
    k.box(MAT.dark, 1.3, 0.34, 0.04, 0, 0.93, -5.28, 0.01); k.box(MAT.chrome, 1.38, 0.04, 0.05, 0, 1.11, -5.285, 0.01);
    [-1, 1].forEach(s => { k.box(MAT.head, 0.26, 0.15, 0.05, s * 0.76, 1.0, -5.275, 0.02); k.box(p, 0.12, 0.15, 0.08, s * 1.03, 1.47, -3.92, 0.03); });
    k.box(MAT.chrome, 1.98, 0.16, 0.18, 0, 0.53, -5.3, 0.05);
    return k.done();
  }

  // the smoker: a black barrel pit on a little trailer, firebox on the right, stack on the left, a stack of oak on the back
  function trailer() {
    const k = kit(), s = MAT.steel, BY = 1.24, BZ = 1.85, BR = 0.46;
    k.box(s, 0.07, 0.07, 1.1, 0, 0.46, 0.5, 0.01); k.box(s, 0.06, 0.06, 1.05, -0.33, 0.46, 0.62, 0.01, 0, 0.62, 0); k.box(s, 0.06, 0.06, 1.05, 0.33, 0.46, 0.62, 0.01, 0, -0.62, 0);
    k.box(s, 1.6, 0.08, 1.75, 0, 0.47, BZ, 0.02); k.box(MAT.dark, 1.5, 0.02, 1.65, 0, 0.515, BZ, 0.005);
    [-1, 1].forEach(x => { k.wheel(x * 0.93, 0.33, BZ + 0.05, 0.33, 0.2); k.box(s, 0.28, 0.035, 0.6, x * 0.93, 0.71, BZ + 0.05, 0.01); k.box(s, 0.28, 0.035, 0.3, x * 0.93, 0.63, BZ - 0.36, 0.01, 0.6); k.box(s, 0.28, 0.035, 0.3, x * 0.93, 0.63, BZ + 0.46, 0.01, -0.6); k.box(MAT.lamp, 0.09, 0.09, 0.03, x * 0.7, 0.47, BZ + 0.885, 0.01); });
    k.cyl(s, BR, BR, 1.36, -0.1, BY, BZ, "x", 28); [-0.52, 0.32].forEach(x => k.cyl(MAT.chrome, BR + 0.008, BR + 0.008, 0.035, -0.1 + x, BY, BZ, "x", 28));
    [[-0.58, -0.25], [-0.58, 0.25], [0.38, -0.25], [0.38, 0.25]].forEach(a => k.box(s, 0.05, 0.36, 0.05, a[0], 0.68, BZ + a[1], 0.01));
    // lid handle and thermometer on the side the camera sees
    k.box(MAT.chrome, 0.56, 0.03, 0.03, -0.1, BY + 0.4, BZ + 0.41, 0.012); [-0.26, 0.06].forEach(x => k.box(MAT.chrome, 0.03, 0.03, 0.1, x, BY + 0.36, BZ + 0.37, 0.01, -0.78));
    k.cyl(MAT.white, 0.07, 0.07, 0.02, -0.42, BY + 0.2, BZ + 0.425, "z", 16, -0.44); k.cyl(MAT.chrome, 0.08, 0.08, 0.012, -0.42, BY + 0.2, BZ + 0.42, "z", 16, -0.44);
    // stack with a rain cap
    k.cyl(s, 0.07, 0.07, 1.0, -0.64, BY + BR + 0.42, BZ, "y", 14); k.cyl(s, 0.03, 0.13, 0.06, -0.64, BY + BR + 1.0, BZ, "y", 14);
    // firebox with a glowing draft slot
    k.box(s, 0.5, 0.54, 0.6, 0.83, BY - 0.2, BZ, 0.03); k.box(MAT.ember, 0.3, 0.04, 0.012, 0.83, BY - 0.36, BZ + 0.302, 0.004); k.box(MAT.chrome, 0.03, 0.18, 0.03, 0.98, BY - 0.12, BZ + 0.315, 0.01);
    k.box(s, 0.05, 0.3, 0.05, 0.95, 0.66, BZ - 0.2, 0.01); k.box(s, 0.05, 0.3, 0.05, 0.95, 0.66, BZ + 0.2, 0.01);
    // oak
    [[-0.5, 0.6], [-0.33, 0.6], [-0.16, 0.6], [0.01, 0.6], [-0.42, 0.745], [-0.25, 0.745], [-0.08, 0.745]].forEach((a, i) => { k.cyl(MAT.log, 0.08, 0.08, 0.5, a[0], a[1], BZ + 0.6, "z", 9); k.cyl(MAT.cut, 0.068, 0.068, 0.504, a[0], a[1], BZ + 0.6, "z", 9); });
    const g = k.done(); g.userData.stack = new THREE.Vector3(-0.64, BY + BR + 1.05, BZ); g.userData.fire = new THREE.Vector3(0.83, BY - 0.36, BZ + 0.33); return g;
  }

  function sedan(color, roof) {   // late-'50s: fins, chrome, whitewalls, two-tone roof
    const k = kit(), p = paint(color), r = paint(roof == null ? 0xf0e6cc : roof);
    [-0.98, -3.98].forEach(z => { k.wheel(-0.82, 0.36, z, 0.36, 0.22, 1); k.wheel(0.82, 0.36, z, 0.36, 0.22, 1); });
    k.box(MAT.dark, 1.7, 0.2, 4.7, 0, 0.36, -2.5, 0.04);
    k.box(p, 1.92, 0.56, 5.0, 0, 0.68, -2.5, 0.16); k.box(p, 1.8, 0.1, 4.7, 0, 0.95, -2.5, 0.04);
    k.cab(r, 1.7, 0.46, 2.5, 0, 1.2, -2.42, 0.82, 0.62, 0.05, 0.84);
    [-1, 1].forEach(s => {
      k.box(p, 0.12, 0.24, 1.6, s * 0.9, 1.0, -0.78, 0.04, -0.1); k.cyl(MAT.lamp, 0.075, 0.075, 0.05, s * 0.9, 1.0, 0.01, "z", 14); k.cyl(MAT.chrome, 0.095, 0.095, 0.03, s * 0.9, 1.0, 0, "z", 14);
      k.box(MAT.chrome, 0.02, 0.045, 3.9, s * 0.965, 0.74, -2.5, 0.008); k.cyl(MAT.head, 0.11, 0.11, 0.05, s * 0.7, 0.8, -4.99, "z", 14); k.cyl(MAT.lamp, 0.05, 0.05, 0.04, s * 0.62, 0.58, 0.02, "z", 10);
    });
    k.box(MAT.chrome, 1.98, 0.15, 0.2, 0, 0.47, 0.03, 0.06); k.box(MAT.chrome, 1.98, 0.15, 0.2, 0, 0.47, -5.02, 0.06); k.box(MAT.chrome, 1.2, 0.2, 0.04, 0, 0.72, -5.0, 0.01);
    k.box(MAT.white, 0.32, 0.15, 0.012, 0, 0.66, 0.012, 0.005); k.box(MAT.chrome, 0.5, 0.03, 0.03, 0, 0.9, 0.0, 0.01);
    return k.done();
  }

  function wagon(color) {   // a woody: wood sides and tailgate, long roof with a rack
    const k = kit(), p = paint(color);
    [-1.0, -3.95].forEach(z => { k.wheel(-0.82, 0.36, z, 0.36, 0.22, 1); k.wheel(0.82, 0.36, z, 0.36, 0.22, 1); });
    k.box(MAT.dark, 1.7, 0.2, 4.7, 0, 0.36, -2.5, 0.04);
    k.box(p, 1.92, 0.62, 5.0, 0, 0.71, -2.5, 0.14); k.cab(p, 1.74, 0.5, 3.35, 0, 1.26, -1.85, 0.86, 0.84, -0.14, 0.86);
    [-1, 1].forEach(s => {
      k.box(MAT.wood, 0.025, 0.36, 3.5, s * 0.955, 0.73, -2.0, 0.01); [-0.3, -1.45, -2.6, -3.72].forEach(z => k.box(MAT.cut, 0.03, 0.4, 0.07, s * 0.958, 0.73, z, 0.01)); [0.55, 0.91].forEach(y => k.box(MAT.cut, 0.03, 0.045, 3.5, s * 0.958, y, -2.0, 0.01));
      k.box(MAT.lamp, 0.1, 0.22, 0.04, s * 0.84, 0.78, 0.012, 0.02); k.cyl(MAT.head, 0.11, 0.11, 0.05, s * 0.7, 0.82, -4.99, "z", 14); k.box(MAT.chrome, 0.03, 0.03, 2.5, s * 0.6, 1.57, -1.8, 0.01);
    });
    k.box(MAT.wood, 1.4, 0.3, 0.025, 0, 0.74, 0.008, 0.01); k.box(MAT.cut, 1.48, 0.045, 0.03, 0, 0.9, 0.01, 0.01); k.box(MAT.cut, 1.48, 0.045, 0.03, 0, 0.58, 0.01, 0.01);
    [-0.75, -1.8, -2.85].forEach(z => k.box(MAT.chrome, 1.24, 0.025, 0.03, 0, 1.585, z, 0.01));
    k.box(MAT.chrome, 1.98, 0.15, 0.2, 0, 0.45, 0.03, 0.06); k.box(MAT.chrome, 1.98, 0.15, 0.2, 0, 0.45, -5.02, 0.06); k.box(MAT.chrome, 1.3, 0.22, 0.04, 0, 0.74, -5.0, 0.01);
    return k.done();
  }

  function cone() {
    const k = kit();
    k.box(MAT.dark, 0.42, 0.035, 0.42, 0, 0.018, 0, 0.01); k.cyl(MAT.cone, 0.035, 0.17, 0.62, 0, 0.345, 0, "y", 18); k.cyl(MAT.white, 0.071, 0.099, 0.13, 0, 0.435, 0, "y", 18);
    return k.done();
  }
  return { pickup, trailer, sedan, wagon, cone, MAT };
}
