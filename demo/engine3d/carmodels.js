/* engine3d/carmodels.js — procedural street cars with real proportions (no downloaded models, no badges, logos or names):
   resemblance by shape + colour only. Each car is lofted from cross-sections along its length (rocker · widest side · beltline ·
   roof edge · roof centre) with flat-shaded facets, a glass greenhouse (windshield, side glass, backlight; glass roof on the EVs),
   real-size wheels (tyre + rim) under the fenders, head + tail lamps. ~350-600 triangles each.
   Output geometries use the same attributes as the Kenney pack in traffic.js: color (baked trim/glass colours) + _part
   (0 trim/tyre · 1 paint · 2 glass · 3 headlamp · 4 tail lamp · 5 bright metal), metres, nose = +Z, ground y = 0.
     buildCars(THREE) → [{ name, geo, w (spawn weight), pal: [hex…] (real factory-style colours), len }] */
export function buildCars(THREE) {
  const C = (h) => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };
  const TYRE = C("#101012"), TRIM = C("#16171a"), GLASS = C("#0a0d12"), WHITE = C("#ffffff"), CHROME = C("#c8ccd2"), RIMG = C("#3a3d44");
  function car(spec) {
    const P = [], COL = [], PART = [];
    const tri = (a, b, c, col, part) => { P.push(...a, ...b, ...c); for (let i = 0; i < 3; i++) { COL.push(...col); PART.push(part); } };
    const quad = (a, b, c, d, col, part) => { tri(a, b, c, col, part); tri(a, c, d, col, part); };
    // stations: [z, halfWidth, beltY, roofEdgeHalfW, roofEdgeY, topY, glassSide, glassTop]
    const S = spec.st, yb = spec.ground || .2;
    const sec = (s) => { const [z, w, belt, rw, ry, top] = s; return [[w * .86, yb, z], [w * .9, yb + (belt - yb) * .2, z], [w, belt, z], [rw, ry, z], [0, top, z]]; };   // widest at the beltline crease; tucked in below so the wheels stand proud
    const bandCol = (k, a) => { const s = S[a], t = S[a + 1]; if (k === 2) return s[6] && t[6] ? [GLASS, 2] : [WHITE, 1]; if (k === 3) return s[7] || t[7] ? [GLASS, 2] : [WHITE, 1]; if (k === 0) return [TRIM, 0]; return [WHITE, 1]; };   // side glass where both ends are glass (pillars stay paint), windshield / backlight where either is
    for (let a = 0; a < S.length - 1; a++) { const A = sec(S[a]), B = sec(S[a + 1]);
      for (let k = 0; k < 4; k++) { const [col, part] = bandCol(k, a);
        for (const sx of [1, -1]) { const m = (v) => [v[0] * sx, v[1], v[2]]; const a0 = m(A[k]), a1 = m(A[k + 1]), b0 = m(B[k]), b1 = m(B[k + 1]);
          if (sx > 0) quad(a0, b0, b1, a1, col, part); else quad(a0, a1, b1, b0, col, part); } } }
    // nose + tail caps (paint), bottom
    const cap = (s, dir) => { const pts = sec(s); const c = [0, (pts[0][1] + pts[4][1]) / 2, s[0]];
      for (const sx of [1, -1]) for (let i = 0; i < 4; i++) { const a = [pts[i][0] * sx, pts[i][1], s[0]], b = [pts[i + 1][0] * sx, pts[i + 1][1], s[0]]; if (sx * dir > 0) tri(a, b, c, WHITE, 1); else tri(b, a, c, WHITE, 1); } };
    cap(S[0], 1); cap(S[S.length - 1], -1);
    for (const [s, dir] of [[S[0], 1], [S[S.length - 1], -1]]) { const p = sec(s), c = [0, (p[0][1] + p[4][1]) / 2, s[0]], L = [-p[0][0], p[0][1], s[0]], Rr = [p[0][0], p[0][1], s[0]]; if (dir > 0) tri(L, Rr, c, WHITE, 1); else tri(Rr, L, c, WHITE, 1); }   // close the bottom of the end caps
    { const f = S[0], r = S[S.length - 1]; quad([-f[1] * .9, yb, f[0]], [f[1] * .9, yb, f[0]], [r[1] * .9, yb, r[0]], [-r[1] * .9, yb, r[0]], TRIM, 0); }
    // a box helper (lamps, grille, bed, trims)
    const box = (cx, cy, cz, sx, sy, sz, col, part, faces) => { const x0 = cx - sx / 2, x1 = cx + sx / 2, y0 = cy - sy / 2, y1 = cy + sy / 2, z0 = cz - sz / 2, z1 = cz + sz / 2;
      const F = { f: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], b: [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], t: [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]],
        l: [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], r: [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]] };
      for (const k of (faces || "fbtlr")) { const q = F[k]; quad(q[0], q[1], q[2], q[3], col, part); } };
    const fz = S[0][0], rz = S[S.length - 1][0];
    (spec.lamps || ["pair", "pair"]).forEach((kind, i) => { const front = i === 0, z = front ? fz + .005 : rz - .005, s = front ? S[0] : S[S.length - 1], w = s[1], y = s[2] - .06, part = front ? 3 : 4, col = front ? C("#fff6e0") : C("#ff2a22");
      if (kind === "bar") box(0, y, z, w * 1.75, .05, .02, col, part, front ? "f" : "b");
      else for (const sx of [-1, 1]) box(sx * w * .68, y, z, w * .42, front ? .08 : .1, .02, col, part, front ? "f" : "b"); });
    if (spec.grille) box(0, S[0][2] * .55, fz + .004, S[0][1] * 1.1, S[0][2] * .32, .02, TRIM, 0, "f");
    if (spec.bed) { const [z0, z1, h] = spec.bed; box(0, h, (z0 + z1) / 2, S[S.length - 1][1] * 1.7, .04, z0 - z1, TRIM, 0, "t"); }
    // wheels: tyre (10-sided) + rim face, set into the body; spec.wheel = [radius, frontZ, rearZ, halfTrack]
    const wr = spec.wheel[0] * 1.08, wf = spec.wheel[1], wrz = spec.wheel[2], tw = .24, wt = Math.max(...S.map(s => s[1])) * .9 - .02;
    for (const z of [wf, wrz]) for (const sx of [-1, 1]) { const x = sx * wt, n = 10;
      for (let i = 0; i < n; i++) { const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2, y0 = wr + Math.sin(a0) * wr, z0 = z + Math.cos(a0) * wr, y1 = wr + Math.sin(a1) * wr, z1 = z + Math.cos(a1) * wr;
        const xo = x + sx * tw / 2, xi = x - sx * tw / 2;
        if (sx > 0) quad([xi, y0, z0], [xi, y1, z1], [xo, y1, z1], [xo, y0, z0], TYRE, 0); else quad([xi, y0, z0], [xo, y0, z0], [xo, y1, z1], [xi, y1, z1], TYRE, 0);
        const rr = wr * .74, c = [xo + sx * .005, wr, z], p0 = [xo + sx * .005, wr + Math.sin(a0) * rr, z + Math.cos(a0) * rr], p1 = [xo + sx * .005, wr + Math.sin(a1) * rr, z + Math.cos(a1) * rr];
        const rc = spec.rim === "dark" ? RIMG : CHROME; if (sx > 0) tri(c, p1, p0, i % 2 ? rc : RIMG, spec.rim === "dark" ? 0 : 5); else tri(c, p0, p1, i % 2 ? rc : RIMG, spec.rim === "dark" ? 0 : 5); } }
    // mirrors
    for (const sx of [-1, 1]) { const s = S[spec.mirrorAt || 2]; box(sx * (s[1] + .08), s[2] + .06, s[0] - .1, .16, .08, .12, spec.bodyMirror ? WHITE : TRIM, spec.bodyMirror ? 1 : 0); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute("color", new THREE.Float32BufferAttribute(COL, 3));
    geo.setAttribute("_part", new THREE.Float32BufferAttribute(PART, 1)); geo.computeVertexNormals(); geo.computeBoundingBox(); return geo;
  }
  //           z      halfW  belt  roofW  roofY  top   glassSide glassTop
  const CARS = [
    { name: "ev-sedan", w: 3, len: 4.7, pal: ["#f2f2f0", "#141518", "#1f3f7a", "#9a1b22", "#8d9196", "#e8e8e6"], lamps: ["bar", "bar"], rim: "dark", bodyMirror: 1, mirrorAt: 3, wheel: [.34, 1.45, -1.42, .79],
      st: [[2.35, .78, .62, .6, .66, .66], [2.0, .9, .7, .78, .76, .78], [1.15, .92, .78, .82, .82, .84, 0, 0], [.75, .92, .8, .68, 1.18, 1.2, 1, 1], [-.3, .93, .82, .66, 1.42, 1.44, 1, 1], [-1.3, .93, .83, .62, 1.2, 1.24, 1, 1], [-2.0, .9, .86, .8, .92, .94, 0, 0], [-2.35, .84, .84, .74, .86, .86]] },
    { name: "ev-suv", w: 2.5, len: 4.75, pal: ["#f2f2f0", "#141518", "#2a4a8c", "#9a1b22", "#7a7f86"], lamps: ["bar", "bar"], rim: "dark", bodyMirror: 1, mirrorAt: 3, wheel: [.37, 1.45, -1.45, .82],
      st: [[2.37, .8, .66, .62, .72, .72], [2.0, .93, .78, .8, .84, .86], [1.1, .96, .86, .84, .9, .92, 0, 0], [.7, .96, .9, .7, 1.3, 1.33, 1, 1], [-.35, .97, .92, .7, 1.6, 1.62, 1, 1], [-1.45, .97, .94, .66, 1.42, 1.46, 1, 1], [-2.1, .94, .96, .78, 1.02, 1.04, 0, 0], [-2.37, .88, .94, .76, .96, .96]] },
    { name: "angular-pickup", w: 1, len: 5.7, pal: ["#b9bcbf"], keepMetal: 1, lamps: ["bar", "bar"], rim: "dark", wheel: [.43, 1.85, -1.85, .9],
      st: [[2.85, .96, .9, .9, 1.02, 1.03], [1.95, 1.0, 1.0, .92, 1.15, 1.16], [.95, 1.0, 1.08, .74, 1.42, 1.45, 1, 1], [.05, 1.0, 1.1, .7, 1.84, 1.86, 1, 0], [-1.05, 1.0, 1.12, .78, 1.58, 1.6, 1, 0], [-2.85, 1.0, 1.15, .94, 1.24, 1.25, 0, 0]] },
    { name: "muscle-coupe", w: 2, len: 5.0, pal: ["#e2581f", "#111214", "#a3121b", "#3b2a6b", "#f1c21b", "#b9bcc2", "#1f6b3c"], lamps: ["pair", "bar"], grille: 1, rim: "chrome", wheel: [.37, 1.62, -1.5, .84],
      st: [[2.5, .92, .78, .86, .84, .86], [2.3, .95, .84, .9, .9, .92], [.85, .96, .88, .9, .94, .97, 0, 0], [.35, .95, .9, .74, 1.2, 1.22, 1, 1], [-.65, .95, .92, .72, 1.38, 1.4, 1, 1], [-1.4, .96, .92, .76, 1.08, 1.1, 1, 1], [-2.5, .95, .9, .86, .98, 1.0, 0, 0]] },
    { name: "compact-sedan", w: 4, len: 4.65, pal: ["#f4f4f2", "#1a1b1e", "#9a9fa6", "#a3141c", "#1d3c6e", "#4b5258"], lamps: ["pair", "pair"], grille: 1, rim: "chrome", wheel: [.33, 1.38, -1.38, .77],
      st: [[2.32, .76, .6, .62, .64, .66], [1.95, .88, .7, .8, .74, .76], [1.05, .9, .76, .82, .8, .82, 0, 0], [.6, .9, .8, .68, 1.12, 1.15, 1, 1], [-.35, .9, .82, .66, 1.4, 1.42, 1, 1], [-1.45, .9, .84, .64, 1.1, 1.14, 1, 1], [-2.0, .89, .86, .8, .9, .92, 0, 0], [-2.32, .85, .84, .76, .86, .86]] },
    { name: "midsize-sedan", w: 4, len: 4.88, pal: ["#f1f1ef", "#1b1c1f", "#a7acb2", "#6a1c23", "#26344d", "#c9b99a", "#53585e"], lamps: ["pair", "pair"], grille: 1, rim: "chrome", wheel: [.34, 1.45, -1.42, .79],
      st: [[2.44, .78, .62, .62, .66, .68], [2.05, .9, .74, .8, .78, .8], [1.1, .92, .8, .84, .84, .86, 0, 0], [.6, .92, .82, .7, 1.16, 1.18, 1, 1], [-.4, .92, .84, .68, 1.43, 1.45, 1, 1], [-1.35, .92, .86, .66, 1.2, 1.24, 1, 1], [-1.75, .92, .88, .82, .98, 1.0, 0, 0], [-2.44, .88, .86, .8, .94, .94]] },
    { name: "suv", w: 3, len: 4.9, pal: ["#f1f1ef", "#121315", "#5c6168", "#2b3f2e", "#7c1b22", "#2b3a55"], lamps: ["pair", "pair"], grille: 1, rim: "chrome", wheel: [.4, 1.5, -1.5, .84],
      st: [[2.45, .86, .8, .8, .86, .88], [2.05, .97, .92, .88, .98, 1.0], [1.15, .98, .98, .9, 1.04, 1.06, 0, 0], [.75, .98, 1.02, .78, 1.55, 1.58, 1, 1], [-1.2, .98, 1.04, .78, 1.72, 1.75, 1, 1], [-2.3, .97, 1.04, .8, 1.62, 1.64, 1, 1], [-2.45, .95, 1.0, .8, 1.5, 1.5]] },
    { name: "pickup", w: 2, len: 5.8, pal: ["#f1f1ef", "#121315", "#7c1b22", "#5c6168", "#20375e", "#2f4a32"], lamps: ["pair", "pair"], grille: 1, rim: "chrome", bed: [-.65, -2.85, 1.08], wheel: [.42, 1.95, -1.9, .88],
      st: [[2.9, .92, .95, .86, 1.02, 1.04], [2.4, 1.0, 1.08, .92, 1.14, 1.16], [1.2, 1.0, 1.12, .94, 1.18, 1.2, 0, 0], [.85, 1.0, 1.16, .8, 1.68, 1.7, 1, 1], [-.45, 1.0, 1.18, .8, 1.9, 1.92, 1, 0], [-.6, 1.0, 1.18, .94, 1.2, 1.2, 0, 0], [-2.9, 1.0, 1.16, .96, 1.18, 1.18]] },
  ];
  return CARS.map(c => ({ name: c.name, geo: car(c), w: c.w, pal: c.pal, len: c.len, keepMetal: !!c.keepMetal }));
}
