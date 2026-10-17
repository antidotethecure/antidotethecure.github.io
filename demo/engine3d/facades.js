/* engine3d/facades.js — realistic building facades for instanced box buildings, all procedural (no downloaded assets).
   One 2×2 atlas holds four facade types: 0 LA stucco (punched windows, sills), 1 glass curtain wall (mullions, spandrels),
   2 brick (framed windows, lintels), 3 concrete office (ribbon windows). Four maps share the atlas: albedo, window-light mask
   (emissive), normal (window recesses, mortar, plaster grain) and roughness/metalness (glass smooth + coated, plaster rough).
   The shader tiles the atlas in WORLD units (one tile = 8 × 8 window bays of 4 m), so a 20-floor tower gets 20 floors of
   real-size windows instead of one stretched texture, and every window can switch its light on/off on its own clock.
     const F = makeFacades(THREE, { size: 1024, pbr: true, time: { value: 0 } });
     instanced box geometry (unit box, base at y = 0) + geo.setAttribute("aVar", InstancedBufferAttribute(variant per building))
     mesh material = F.material (sides). F.pick(rng, h) → a variant for a building of height h; F.tint(rng, v) → instance colour.
   aDmg (optional per-instance attribute, 0..1) darkens a broken building and kills its window lights.
   pbr:false → Lambert (no normal/roughness: the cheap path for phones), same look otherwise. */
export function makeFacades(THREE, O = {}) {
  const S = O.size || 1024, C = S / 2, B = C / 8;   // atlas size · cell · window bay (px)
  const mk = () => { const c = document.createElement("canvas"); c.width = c.height = S; return c; };
  const alb = mk(), emi = mk(), nor = mk(), orm = mk(), a = alb.getContext("2d"), e = emi.getContext("2d"), n = nor.getContext("2d"), r = orm.getContext("2d");
  let seed = 7; const R = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  e.fillStyle = "#000"; e.fillRect(0, 0, S, S); n.fillStyle = "rgb(128,128,255)"; n.fillRect(0, 0, S, S);
  const rect = (x, c, col, X, Y, W, H) => { x.fillStyle = col; x.fillRect(c[0] + X, c[1] + Y, W, H); };
  const recess = (c, X, Y, W, H, d) => {   // a window set into the wall: the reveal's 4 inner faces in the normal map
    d = d || 3; rect(n, c, "rgb(128,70,235)", X, Y, W, d); rect(n, c, "rgb(128,186,235)", X, Y + H - d, W, d);
    rect(n, c, "rgb(186,128,235)", X, Y, d, H); rect(n, c, "rgb(70,128,235)", X + W - d, Y, d, H); };
  const grain = (c, base, amt, nAmt, count) => {   // plaster / concrete speckle in albedo and the normal map
    for (let i = 0; i < count; i++) { const x = c[0] + R() * C, y = c[1] + R() * C, s = 1 + R() * 2.5, v = (R() - .5) * amt;
      a.fillStyle = `rgba(${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${Math.abs(v)})`; a.fillRect(x, y, s, s);
      const q = 128 + (R() - .5) * nAmt; n.fillStyle = `rgb(${q | 0},${(256 - q) | 0},250)`; n.fillRect(x, y, s, s); } };
  const light = (c, X, Y, W, H, cool) => { const u = R(); e.fillStyle = cool ? (u < .5 ? "#dfe9ff" : "#fff6e2") : (u < .6 ? "#ffcf8a" : u < .85 ? "#ffe6b8" : "#cfe3ff"); e.fillRect(c[0] + X, c[1] + Y, W, H); };
  const cells = [[0, 0], [C, 0], [0, C], [C, C]];

  // 0 · LA stucco: warm plaster, punched windows with a sill, a few awnings' shadows, a floor-line reveal
  { const c = cells[0]; rect(a, c, "#d9cfbf", 0, 0, C, C); grain(c, 0, .16, 34, 2600); rect(r, c, "rgb(0,235,0)", 0, 0, C, C);
    for (let fy = 0; fy < 8; fy++) { rect(a, c, "rgba(0,0,0,.07)", 0, fy * B, C, 2); rect(n, c, "rgb(128,96,240)", 0, fy * B, C, 2);
      for (let bx = 0; bx < 8; bx++) { const X = bx * B + B * .26, Y = fy * B + B * .2, W = B * .48, H = B * .52;
        rect(a, c, R() < .5 ? "#2c3440" : "#343c48", X, Y, W, H); rect(a, c, "rgba(255,255,255,.08)", X + 2, Y + 2, W * .45, H - 4);   // glass + a reflection
        rect(a, c, "#8a8378", X + W / 2 - 1, Y, 2, H); rect(a, c, "#efe8dc", X - 3, Y + H, W + 6, 4); rect(n, c, "rgb(128,200,240)", X - 3, Y + H, W + 6, 2);   // mullion, sill
        recess(c, X, Y, W, H, 3); light(c, X, Y, W, H); rect(r, c, "rgb(0,40,0)", X, Y, W, H); } } }
  // 1 · glass curtain wall: blue-green coated glass, aluminium mullions every bay, opaque spandrel band at each floor
  { const c = cells[1]; const g = a.createLinearGradient(c[0], c[1], c[0] + C, c[1] + C); g.addColorStop(0, "#3c5a6e"); g.addColorStop(.5, "#5e7f92"); g.addColorStop(1, "#2f4a5c"); a.fillStyle = g; a.fillRect(c[0], c[1], C, C);
    rect(r, c, "rgb(0,18,170)", 0, 0, C, C);
    for (let fy = 0; fy < 8; fy++) { const Y = fy * B; rect(a, c, "#26343f", 0, Y + B * .78, C, B * .22); rect(r, c, "rgb(0,120,90)", 0, Y + B * .78, C, B * .22);   // spandrel
      for (let bx = 0; bx < 8; bx++) { const X = bx * B; rect(a, c, `rgba(255,255,255,${.03 + R() * .07})`, X + 2, Y + 2, B - 4, B * .74); { const u = R(); e.fillStyle = u < .5 ? "#5d6676" : u < .8 ? "#7a7364" : "#9aa6b8"; e.fillRect(c[0] + X + B * .12, c[1] + Y + B * .1, B * .76, B * .55); } } }   // office floors behind tinted glass: dimmer
    for (let bx = 0; bx <= 8; bx++) { rect(a, c, "#b8c0c6", bx * B - 2, 0, 4, C); rect(r, c, "rgb(0,90,220)", bx * B - 2, 0, 4, C); rect(n, c, "rgb(170,128,250)", bx * B - 2, 0, 2, C); rect(n, c, "rgb(86,128,250)", bx * B, 0, 2, C); }
    for (let fy = 0; fy <= 8; fy++) { rect(a, c, "#a9b1b7", 0, fy * B - 1, C, 3); rect(n, c, "rgb(128,170,250)", 0, fy * B - 1, C, 2); } }
  // 2 · brick: running-bond brick with mortar grooves, tall white-framed windows, stone lintels
  { const c = cells[2]; rect(a, c, "#7a3b2c", 0, 0, C, C); rect(r, c, "rgb(0,215,0)", 0, 0, C, C);
    const bh = Math.max(3, B / 10), bw = bh * 2.6;
    for (let y = 0, row = 0; y < C; y += bh, row++) for (let x = -(row % 2) * bw / 2; x < C; x += bw) { const v = R();
      a.fillStyle = v < .33 ? "#86412f" : v < .66 ? "#6e3527" : "#7d4433"; a.fillRect(c[0] + x + 1, c[1] + y + 1, bw - 1.5, bh - 1.5);
      rect(n, c, "rgb(128,100,245)", x, y, bw, 1); rect(n, c, "rgb(108,128,245)", x, y, 1, bh); }
    for (let fy = 0; fy < 8; fy++) for (let bx = 0; bx < 8; bx++) { const X = bx * B + B * .3, Y = fy * B + B * .14, W = B * .4, H = B * .62;
      rect(a, c, "#d8d2c6", X - 3, Y - 3, W + 6, H + 6); rect(a, c, "#2a313b", X + 1, Y + 1, W - 2, H - 2); rect(a, c, "#d8d2c6", X + W / 2 - 1, Y, 2, H); rect(a, c, "#d8d2c6", X, Y + H * .45, W, 2);
      rect(a, c, "#bdb3a2", X - 5, Y - 9, W + 10, 6); rect(n, c, "rgb(128,200,240)", X - 5, Y - 9, W + 10, 2);   // lintel
      recess(c, X + 1, Y + 1, W - 2, H - 2, 3); light(c, X + 1, Y + 1, W - 2, H - 2); rect(r, c, "rgb(0,45,0)", X + 1, Y + 1, W - 2, H - 2); } }
  // 3 · concrete office: board-formed concrete, continuous ribbon windows with mullions
  { const c = cells[3]; rect(a, c, "#a7a59f", 0, 0, C, C); grain(c, 0, .12, 26, 1800); rect(r, c, "rgb(0,225,0)", 0, 0, C, C);
    for (let i = 0; i < 40; i++) { const y = R() * C; rect(a, c, "rgba(0,0,0,.035)", 0, y, C, 1 + R() * 2); }
    for (let fy = 0; fy < 8; fy++) { const Y = fy * B + B * .3, H = B * .46; rect(a, c, "#27303a", 0, Y, C, H); recess(c, 0, Y, C, H, 3); rect(r, c, "rgb(0,30,60)", 0, Y, C, H);
      for (let bx = 0; bx < 8; bx++) { rect(a, c, "#8d9196", bx * B, Y, 3, H); rect(a, c, `rgba(255,255,255,${.04 + R() * .06})`, bx * B + 5, Y + 2, B * .5, H - 4); light(c, bx * B + 3, Y + 1, B - 4, H - 2, R() < .5); }
      rect(a, c, "#c1beb7", 0, Y + H, C, 3); } }

  const T = (cv, srgb) => { const t = new THREE.CanvasTexture(cv); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 4; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; return t; };
  const maps = { map: T(alb, true), emissiveMap: T(emi, true), normalMap: T(nor, false), roughnessMap: T(orm, false) };
  const UT = O.time || { value: 0 };
  const mat = O.pbr ? new THREE.MeshStandardMaterial({ map: maps.map, emissiveMap: maps.emissiveMap, emissive: 0xffffff, emissiveIntensity: .95, normalMap: maps.normalMap, normalScale: new THREE.Vector2(.9, .9),
      roughnessMap: maps.roughnessMap, metalnessMap: maps.roughnessMap, roughness: 1, metalness: 1, envMapIntensity: .9 })
    : new THREE.MeshLambertMaterial({ map: maps.map, emissiveMap: maps.emissiveMap, emissive: 0xffffff, emissiveIntensity: .95 });
  // every atlas lookup goes through FAC_S: world-size tiles, the right cell for this building's type, mip level from the
  // un-wrapped coordinates (no seams at tile edges)
  const grad = (src) => src.replace(/texture2D\(\s*(\w+)\s*,\s*v\w*Uv\s*\)/g, "FAC_S($1)").replace(/vNormalMapUv/g, "vTile");
  mat.onBeforeCompile = (sh) => { sh.uniforms.uT = UT;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute float aVar; attribute float aDmg; varying float vVar; varying float vDmg; varying float vId; varying vec2 vTile;")
      .replace("#include <begin_vertex>", `#include <begin_vertex>
        vVar = aVar; vDmg = aDmg; vId = float(gl_InstanceID);
        { vec3 sc = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
          float u = abs(normal.x) > .5 ? (position.z + .5) * sc.z * sign(normal.x) : (position.x + .5) * sc.x * -sign(normal.z);
          vTile = vec2(u, position.y * sc.y) / 32.0 + vec2(vId * .37, 0.0); }`);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
        uniform float uT; varying float vVar; varying float vDmg; varying float vId; varying vec2 vTile; vec2 FAC_UV; vec2 FAC_DX; vec2 FAC_DY;
        #if __VERSION__ >= 300
          #define FAC_S(t) textureGrad(t, FAC_UV, FAC_DX, FAC_DY)
        #else
          #define FAC_S(t) texture2D(t, FAC_UV)
        #endif`)
      .replace("void main() {", `void main() {
        { vec2 cell = vec2(mod(vVar, 2.0), floor(vVar / 2.0)) * .5; FAC_UV = cell + (fract(vTile) * .996 + .002) * .5; FAC_UV.y = 1.0 - (cell.y + (1.0 - fract(vTile.y)) * .996 * .5 + .001);
          FAC_DX = dFdx(vTile) * .5; FAC_DY = dFdy(vTile) * .5; }`);
    for (const k of ["map_fragment", "roughnessmap_fragment", "metalnessmap_fragment", "normal_fragment_begin", "normal_fragment_maps"]) sh.fragmentShader = sh.fragmentShader.replace(`#include <${k}>`, grad(THREE.ShaderChunk[k]));
    sh.fragmentShader = sh.fragmentShader.replace("#include <emissivemap_fragment>", grad(THREE.ShaderChunk.emissivemap_fragment) + `
      { vec2 cell = floor(vTile * 8.0); float h = fract(sin(dot(cell + vec2(vId * 1.37, vId * .71), vec2(12.9898, 78.233))) * 43758.5453);
        float per = 4.0 + h * 18.0, ph = floor((uT + h * 97.0) / per); float on = step(.6, fract(sin(dot(cell + vec2(ph * 3.1, vId), vec2(39.35, 11.13))) * 24634.63));
        totalEmissiveRadiance *= on * (1.0 - vDmg); diffuseColor.rgb *= 1.0 - vDmg * .6; }`); };
  mat.customProgramCacheKey = () => "facades-v1-" + (O.pbr ? "pbr" : "lam");
  const TINT = [["#f2e6d6", "#e9dccb", "#f5efe4", "#e8d2c0", "#dcd6c8", "#f0e1c6", "#e6e0ee", "#d9e4e0"], ["#eef3f7", "#e2ecf2", "#f2f2ee", "#dfe8ee"], ["#f2e9e4", "#e8ddd6", "#d9cbc4"], ["#efefea", "#e2e2dc", "#d7d9da"]];
  return { material: mat, maps,
    pick(R2, h) { const u = R2(); return h > 80 ? (u < .6 ? 1 : 3) : h > 40 ? (u < .3 ? 1 : u < .65 ? 3 : u < .85 ? 2 : 0) : (u < .55 ? 0 : u < .85 ? 2 : 3); },
    tint(R2, v) { const L = TINT[v]; return L[(R2() * L.length) | 0]; },
    dispose() { Object.values(maps).forEach(t => t.dispose()); mat.dispose(); } };
}
