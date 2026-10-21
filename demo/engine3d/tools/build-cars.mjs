/* engine3d — pack Kenney's Car Kit (CC0, www.kenney.nl) into one small GLB for instanced traffic. Run once; output is committed.
   node build-cars.mjs "<kenney car kit>/Models/GLB format" <out dir>
   Each car → one merged mesh (body + 4 wheels, node transforms applied), the palette texture baked into vertex colours, and a
   _PART attribute: 0 trim · 1 body paint (recoloured per car) · 2 glass · 3 headlamp · 4 tail/brake lamp, so traffic.js can paint
   every car differently and light the lamps (headlights at night, brake lights when stopping). */
import { NodeIO, Document } from "@gltf-transform/core";
import { ALL_EXTENSIONS, EXTMeshoptCompression } from "@gltf-transform/extensions";
import { MeshoptEncoder } from "meshoptimizer";
import sharp from "sharp";
import path from "path";
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.encoder": MeshoptEncoder });
const [SRC, OUT] = process.argv.slice(2);
const CARS = ["sedan", "sedan-sports", "hatchback-sports", "suv", "suv-luxury", "taxi", "van", "delivery", "truck", "police", "ambulance"];
const pal = await sharp(path.join(SRC, "Textures", "colormap.png")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const tex = (u, v) => { const x = Math.min(pal.info.width - 1, Math.max(0, Math.floor(u * pal.info.width))), y = Math.min(pal.info.height - 1, Math.max(0, Math.floor(v * pal.info.height))), i = (y * pal.info.width + x) * 4; return [pal.data[i] / 255, pal.data[i + 1] / 255, pal.data[i + 2] / 255]; };
const hsv = (r, g, b) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d > 1e-5) { h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; } return [h, mx ? d / mx : 0, mx]; };
const out = new Document(), buf = out.createBuffer(), scene = out.createScene("cars");
for (const name of CARS) {
  const doc = await io.read(path.join(SRC, name + ".glb")); const P = [], C = [], N = [], I = [], body = [];
  for (const node of doc.getRoot().listNodes()) { const mesh = node.getMesh(); if (!mesh) continue; const M = node.getWorldMatrix(), isBody = /body/i.test(node.getName());
    for (const prim of mesh.listPrimitives()) { const pa = prim.getAttribute("POSITION"), na = prim.getAttribute("NORMAL"), ua = prim.getAttribute("TEXCOORD_0"), ix = prim.getIndices(), base = P.length / 3, t = [];
      for (let i = 0; i < pa.getCount(); i++) { pa.getElement(i, t); const x = t[0], y = t[1], z = t[2]; P.push(M[0] * x + M[4] * y + M[8] * z + M[12], M[1] * x + M[5] * y + M[9] * z + M[13], M[2] * x + M[6] * y + M[10] * z + M[14]);
        na.getElement(i, t); const nx = M[0] * t[0] + M[4] * t[1] + M[8] * t[2], ny = M[1] * t[0] + M[5] * t[1] + M[9] * t[2], nz = M[2] * t[0] + M[6] * t[1] + M[10] * t[2], l = Math.hypot(nx, ny, nz) || 1; N.push(nx / l, ny / l, nz / l);
        ua.getElement(i, t); C.push(...tex(t[0], t[1])); body.push(isBody); }
      const arr = ix.getArray(); for (let k = 0; k < arr.length; k++) I.push(arr[k] + base); } }
  // the paint: the dominant hue family among the colourful body vertices (Kenney's palette has 2-3 shades per colour);
  // white cars (police, ambulance) → the bright white family. Lamps: small bright patches at the very front / back.
  const n = P.length / 3; let zmin = 1e9, zmax = -1e9, ymax = -1e9; for (let i = 0; i < n; i++) { zmin = Math.min(zmin, P[i * 3 + 2]); zmax = Math.max(zmax, P[i * 3 + 2]); ymax = Math.max(ymax, P[i * 3 + 1]); }
  const HSV = []; for (let i = 0; i < n; i++) HSV.push(hsv(C[i * 3], C[i * 3 + 1], C[i * 3 + 2]));
  const bins = new Array(12).fill(0); let colorful = 0, bodyN = 0; for (let i = 0; i < n; i++) { if (!body[i]) continue; bodyN++; const [h, s2, v] = HSV[i]; if (s2 > .3 && v > .45) { bins[Math.floor(h / 30) % 12]++; colorful++; } }
  const hb = bins.indexOf(Math.max(...bins)), whiteCar = colorful < bodyN * .12;
  const isLampF = (i) => P[i * 3 + 2] > zmax - .1 && N[i * 3 + 2] > .5 && HSV[i][2] > .8 && P[i * 3 + 1] < ymax * .7;
  const isLampR = (i) => P[i * 3 + 2] < zmin + .1 && N[i * 3 + 2] < -.5 && (HSV[i][0] < 25 || HSV[i][0] > 335) && HSV[i][1] > .35;
  const PART = new Float32Array(n);
  for (let i = 0; i < n; i++) { const [h, s2, v] = HSV[i]; if (!body[i]) { PART[i] = 0; continue; }
    if (isLampF(i)) PART[i] = 3; else if (isLampR(i)) PART[i] = 4;
    else if (!whiteCar && s2 > .3 && v > .45 && Math.abs(((h - (hb * 30 + 15) + 540) % 360) - 180) < 24) PART[i] = 1;
    else if (whiteCar && v > .78 && s2 < .14) PART[i] = 1;
    else if (!whiteCar && v > .78 && s2 < .16 && P[i * 3 + 1] > ymax * .45) PART[i] = 2;
    else PART[i] = 0; }
  const acc = (a, type) => out.createAccessor().setArray(a).setType(type).setBuffer(buf);
  const prim = out.createPrimitive().setAttribute("POSITION", acc(new Float32Array(P), "VEC3")).setAttribute("NORMAL", acc(new Float32Array(N), "VEC3")).setAttribute("COLOR_0", acc(new Float32Array(C), "VEC3"))
    .setAttribute("_PART", acc(PART, "SCALAR")).setIndices(acc(new Uint32Array(I), "SCALAR")).setMaterial(out.createMaterial("car").setRoughnessFactor(.4).setMetallicFactor(.2));
  scene.addChild(out.createNode(name).setMesh(out.createMesh(name).addPrimitive(prim)));
  const cnt = [0, 0, 0, 0, 0]; PART.forEach(p => cnt[p]++); console.log(name, n, "verts, parts", cnt.join("/"), whiteCar ? "white" : "hue " + hb * 30);
}
out.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
const { quantize, reorder, dedup, weld } = await import("@gltf-transform/functions");
await out.transform(weld(), dedup(), reorder({ encoder: MeshoptEncoder }), quantize({ pattern: /^(POSITION|NORMAL|COLOR_0)$/ }));
await io.write(path.join(OUT, "cars.glb"), out);
