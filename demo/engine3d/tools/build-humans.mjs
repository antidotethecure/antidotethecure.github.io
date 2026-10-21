/* engine3d — build the crowd humans from the Nalu Vida cast (offline, run once; outputs are committed).
   node build-humans.mjs <nalu-vida/3d dir> <out dir>
   Inputs : surfer_m.glb (Meshy rig + run/swim/fall/flip/balance clips), beachlady.glb (static mesh, no rig).
   Outputs: human_m.glb     near LOD: the surfer, original topology, skinned, base-colour texture only (512 webp)
            human_f.glb     near LOD: the beach lady, auto-rigged here with the SAME bone names as the surfer
                            (capsule-distance skin weights), base-colour texture (512 webp)
            human_m_lo.glb / human_f_lo.glb    crowd LOD1: position-welded + simplified, texture baked to vertex colours
            human_m_lo2.glb / human_f_lo2.glb  crowd LOD2: the same, much coarser
   Every LOD mesh carries _ZONE (body zone of the strongest bone) and _REGION (0 skin, 1 clothing, 2 hair, 3 keep) so the
   crowd shader can dress, recolour and re-skin each instance. Needs: @gltf-transform/core|extensions, meshoptimizer, sharp. */
import { NodeIO, Document } from "@gltf-transform/core";
import { ALL_EXTENSIONS, EXTMeshoptCompression, EXTTextureWebP } from "@gltf-transform/extensions";
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";
import path from "path";

await MeshoptDecoder.ready; await MeshoptEncoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });
const [SRC, OUT] = process.argv.slice(2);

const JOINTS = ["Hips", "Spine02", "Spine01", "Spine", "neck", "Head", "head_end", "headfront", "LeftShoulder", "LeftArm", "LeftForeArm", "LeftHand", "RightShoulder", "RightArm", "RightForeArm", "RightHand", "LeftUpLeg", "LeftLeg", "LeftFoot", "LeftToeBase", "RightUpLeg", "RightLeg", "RightFoot", "RightToeBase"];
const PARENT = { Spine02: "Hips", Spine01: "Spine02", Spine: "Spine01", neck: "Spine", Head: "neck", head_end: "Head", headfront: "Head", LeftShoulder: "Spine", LeftArm: "LeftShoulder", LeftForeArm: "LeftArm", LeftHand: "LeftForeArm", RightShoulder: "Spine", RightArm: "RightShoulder", RightForeArm: "RightArm", RightHand: "RightForeArm", LeftUpLeg: "Hips", LeftLeg: "LeftUpLeg", LeftFoot: "LeftLeg", LeftToeBase: "LeftFoot", RightUpLeg: "Hips", RightLeg: "RightUpLeg", RightFoot: "RightLeg", RightToeBase: "RightFoot" };
// body zones: 0 head/neck · 1 chest/shoulders · 2 upper arm · 3 forearm · 4 hand · 5 hips · 6 thigh · 7 shin · 8 foot
const ZONE = n => /head|neck/i.test(n) ? 0 : /Spine|Shoulder/.test(n) ? (n === "Spine02" ? 5 : 1) : /ForeArm/.test(n) ? 3 : /Arm/.test(n) ? 2 : /Hand/.test(n) ? 4 : n === "Hips" ? 5 : /UpLeg/.test(n) ? 6 : /Leg/.test(n) ? 7 : 8;

const rgb2hsv = (r, g, b) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d > 1e-5) { h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; } return [h, mx ? d / mx : 0, mx]; };
const skinLike = (r, g, b) => { const [h, s, v] = rgb2hsv(r, g, b); return h >= 5 && h <= 48 && s > .18 && s < .75 && v > .22; };

async function decodeTex(tex) { const { data, info } = await sharp(Buffer.from(tex.getImage())).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { data, w: info.width, h: info.height }; }
const sampleTex = (T, u, v) => { const x = Math.min(T.w - 1, Math.max(0, Math.floor((u - Math.floor(u)) * T.w))), y = Math.min(T.h - 1, Math.max(0, Math.floor((v - Math.floor(v)) * T.h))), i = (y * T.w + x) * 4; return [T.data[i] / 255, T.data[i + 1] / 255, T.data[i + 2] / 255]; };
async function smallTex(tex, size) { return new Uint8Array(await sharp(Buffer.from(tex.getImage())).resize(size).webp({ quality: 84 }).toBuffer()); }

function readPrim(doc) {
  const node = doc.getRoot().listNodes().find(n => n.getMesh()), prim = node.getMesh().listPrimitives()[0];
  const P = prim.getAttribute("POSITION"), UV = prim.getAttribute("TEXCOORD_0"), J = prim.getAttribute("JOINTS_0"), Wt = prim.getAttribute("WEIGHTS_0"), I = prim.getIndices();
  const n = P.getCount(), pos = new Float32Array(n * 3), uv = new Float32Array(n * 2), t = [];
  const M = node.getWorldMatrix();
  for (let i = 0; i < n; i++) { P.getElement(i, t); const x = t[0], y = t[1], z = t[2];
    if (node.getSkin()) { pos.set([x, y, z], i * 3); } else { pos[i * 3] = M[0] * x + M[4] * y + M[8] * z + M[12]; pos[i * 3 + 1] = M[1] * x + M[5] * y + M[9] * z + M[13]; pos[i * 3 + 2] = M[2] * x + M[6] * y + M[10] * z + M[14]; }
    UV.getElement(i, t); uv[i * 2] = t[0]; uv[i * 2 + 1] = t[1]; }
  let joints = null, weights = null; if (J) { joints = new Uint16Array(n * 4); weights = new Float32Array(n * 4); for (let i = 0; i < n; i++) { J.getElement(i, t); joints.set(t.slice(0, 4), i * 4); Wt.getElement(i, t); weights.set(t.slice(0, 4), i * 4); } }
  const idx = I ? Uint32Array.from(I.getArray()) : Uint32Array.from({ length: n }, (_, i) => i);
  return { node, prim, pos, uv, joints, weights, idx, n, tex: prim.getMaterial().getBaseColorTexture() };
}

/* ---------- auto-rig the beach lady: joints placed on her (front-view measurements, height normalised to 1.8, feet at 0) ---------- */
const LADY_J = { Hips: [.11, .96], Spine02: [.12, 1.04], Spine01: [.12, 1.17], Spine: [.12, 1.28], neck: [.12, 1.41], Head: [.12, 1.47], head_end: [.12, 1.74], headfront: [.12, 1.55, .1],
  LeftShoulder: [.15, 1.37], LeftArm: [.27, 1.34], LeftForeArm: [.305, 1.10], LeftHand: [.34, .88],
  RightShoulder: [.08, 1.37], RightArm: [-.01, 1.34], RightForeArm: [-.17, 1.53], RightHand: [-.28, 1.66],
  LeftUpLeg: [.19, .90], LeftLeg: [.20, .49], LeftFoot: [.18, .10], LeftToeBase: [.18, .025, .13],
  RightUpLeg: [.035, .90], RightLeg: [.085, .49], RightFoot: [.10, .10], RightToeBase: [.10, .025, .13] };
const TIP = { LeftHand: [.352, .73], RightHand: [-.35, 1.77], head_end: null };
const RAD = { Hips: .13, Spine02: .13, Spine01: .135, Spine: .12, neck: .05, Head: .095, LeftShoulder: .05, RightShoulder: .05, LeftArm: .045, RightArm: .045, LeftForeArm: .035, RightForeArm: .035, LeftHand: .03, RightHand: .03,
  LeftUpLeg: .085, RightUpLeg: .085, LeftLeg: .055, RightLeg: .055, LeftFoot: .04, RightFoot: .04 };
const SEGEND = { Hips: "Spine02", Spine02: "Spine01", Spine01: "Spine", Spine: "neck", neck: "Head", Head: "head_end", LeftShoulder: "LeftArm", LeftArm: "LeftForeArm", LeftForeArm: "LeftHand", RightShoulder: "RightArm", RightArm: "RightForeArm", RightForeArm: "RightHand",
  LeftUpLeg: "LeftLeg", LeftLeg: "LeftFoot", LeftFoot: "LeftToeBase", RightUpLeg: "RightLeg", RightLeg: "RightFoot", RightFoot: "RightToeBase" };

function rigLady(L) {
  // normalise into the measurement frame
  let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]; for (let i = 0; i < L.n; i++) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], L.pos[i * 3 + k]); mx[k] = Math.max(mx[k], L.pos[i * 3 + k]); }
  const k = 1.8 / (mx[1] - mn[1]), cx = (mn[0] + mx[0]) / 2, cz = (mn[2] + mx[2]) / 2;
  for (let i = 0; i < L.n; i++) { L.pos[i * 3] = (L.pos[i * 3] - cx) * k; L.pos[i * 3 + 1] = (L.pos[i * 3 + 1] - mn[1]) * k; L.pos[i * 3 + 2] = (L.pos[i * 3 + 2] - cz) * k; }
  // joint z = centroid of the body slice around the joint
  const J = {}; for (const n of JOINTS) { const j = LADY_J[n]; let sz = 0, c = 0; for (let i = 0; i < L.n; i++) { const dx = L.pos[i * 3] - j[0], dy = L.pos[i * 3 + 1] - j[1]; if (dx * dx + dy * dy < .05 * .05) { sz += L.pos[i * 3 + 2]; c++; } }
    J[n] = [j[0], j[1], (c ? sz / c : 0) + (j[2] || 0)]; }
  const seg = (n) => { const a = J[n], b = SEGEND[n] ? J[SEGEND[n]] : TIP[n] ? [TIP[n][0], TIP[n][1], a[2]] : null; return [a, b]; };
  const joints = new Uint16Array(L.n * 4), weights = new Float32Array(L.n * 4), bones = Object.keys(RAD);
  // legs that touch in the scan: below the crotch a vertex may only use the bones of its own leg (split at the midline between the legs)
  const chainX = (side, y) => { const pts = ["UpLeg", "Leg", "Foot"].map(n => J[side + n]); if (y >= pts[0][1]) return pts[0][0]; for (let k = 0; k < 2; k++) { const a = pts[k], b = pts[k + 1]; if (y <= a[1] && y >= b[1]) return a[0] + (b[0] - a[0]) * (a[1] - y) / (a[1] - b[1]); } return pts[2][0]; };
  const LEGB = /^(Left|Right)(UpLeg|Leg|Foot|ToeBase)$/;
  for (let i = 0; i < L.n; i++) { const p = [L.pos[i * 3], L.pos[i * 3 + 1], L.pos[i * 3 + 2]], sc = [];
    const below = p[1] < J.LeftUpLeg[1] - .02, mid = below ? (chainX("Left", p[1]) + chainX("Right", p[1])) / 2 : 0;
    for (const b of bones) { const lm = below && LEGB.exec(b); if (lm && ((lm[1] === "Left") !== (p[0] > mid))) continue; const [a, e] = seg(b); let d; if (e) { const ab = [e[0] - a[0], e[1] - a[1], e[2] - a[2]], ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]], l2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2; let t = (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / l2; t = Math.max(0, Math.min(1, t)); d = Math.hypot(ap[0] - ab[0] * t, ap[1] - ab[1] * t, ap[2] - ab[2] * t); } else d = Math.hypot(p[0] - a[0], p[1] - a[1], p[2] - a[2]);
      sc.push([b, Math.max(.004, d - RAD[b])]); }
    sc.sort((a, b) => a[1] - b[1]); const best = sc[0][1], top = sc.slice(0, 4).filter(s => s[1] < best + .035);
    let sum = 0; const w = top.map(s => { const v = 1 / Math.pow(s[1], 3); sum += v; return v; });
    top.forEach((s, q) => { joints[i * 4 + q] = JOINTS.indexOf(s[0]); weights[i * 4 + q] = w[q] / sum; }); }
  // the scan joins the legs with a web of triangles: cut every triangle below the crotch that spans both legs
  const side = new Int8Array(L.n); for (let i = 0; i < L.n; i++) { const y = L.pos[i * 3 + 1]; side[i] = y < J.LeftUpLeg[1] - .05 ? (L.pos[i * 3] > (chainX("Left", y) + chainX("Right", y)) / 2 ? 1 : -1) : 0; }
  const keep = []; for (let t = 0; t < L.idx.length; t += 3) { const a = side[L.idx[t]], b = side[L.idx[t + 1]], c = side[L.idx[t + 2]]; if ((a && b && a !== b) || (a && c && a !== c) || (b && c && b !== c)) continue; keep.push(L.idx[t], L.idx[t + 1], L.idx[t + 2]); }
  console.log("lady: cut", (L.idx.length - keep.length) / 3, "leg-web triangles"); L.idx = Uint32Array.from(keep);
  L.joints = joints; L.weights = weights; L.J = J; return L;
}

/* ---------- region labels (what the crowd shader may recolour) ---------- */
function regionOf(kind, zone, col, p, H) {
  const [r, g, b] = col, [h, s, v] = rgb2hsv(r, g, b);
  if (kind === "m") { if (zone === 0) return skinLike(r, g, b) && v > .3 ? 0 : 2; if (zone === 5 || zone === 6) return skinLike(r, g, b) && p[1] < H * .44 ? 0 : (skinLike(r, g, b) && p[1] > H * .5 ? 0 : 1); return 0; }
  // lady: red swimsuit (+ black straps, whistle) is clothing; head above the hairline / behind the face is hair
  if (zone === 0) { const face = p[2] > .015 && p[1] < 1.655; return face ? 0 : 2; }
  if ((h < 18 || h > 330) && s > .45 && v > .25 && (zone === 1 || zone === 5 || (zone === 6 && p[1] > .84))) return 1;
  if (v < .18 && (zone === 1 || zone === 5)) return 1;
  return zone === 4 && v > .75 && s < .15 ? 3 : 0;
}

/* ---------- welded + simplified vertex-colour LOD ---------- */
function buildLO(src, kind, target, err, H) {
  const key = new Map(), remap = new Uint32Array(src.n), first = [], col = [], cnt = [];
  for (let i = 0; i < src.n; i++) { const k = Math.round(src.pos[i * 3] * 1e4) + "," + Math.round(src.pos[i * 3 + 1] * 1e4) + "," + Math.round(src.pos[i * 3 + 2] * 1e4);
    let j = key.get(k); if (j === undefined) { j = first.length; key.set(k, j); first.push(i); col.push([0, 0, 0]); cnt.push(0); } remap[i] = j;
    const c = sampleTex(src.T, src.uv[i * 2], src.uv[i * 2 + 1]); col[j][0] += c[0]; col[j][1] += c[1]; col[j][2] += c[2]; cnt[j]++; }
  const n = first.length, pos = new Float32Array(n * 3), idx = new Uint32Array(src.idx.length);
  for (let j = 0; j < n; j++) { pos.set(src.pos.subarray(first[j] * 3, first[j] * 3 + 3), j * 3); col[j] = col[j].map(v => v / cnt[j]); }
  for (let i = 0; i < src.idx.length; i++) idx[i] = remap[src.idx[i]];
  const [sidx] = MeshoptSimplifier.simplify(idx, pos, 3, target * 3, err, ["LockBorder"].slice(0, 0));
  // compact
  const used = new Map(), order = []; for (const v of sidx) if (!used.has(v)) { used.set(v, order.length); order.push(v); }
  const m = order.length, P = new Float32Array(m * 3), C = new Float32Array(m * 3), Jn = new Uint16Array(m * 4), Wn = new Float32Array(m * 4), Z = new Float32Array(m), Rg = new Float32Array(m), I = new Uint32Array(sidx.length);
  order.forEach((v, q) => { P.set(pos.subarray(v * 3, v * 3 + 3), q * 3); C.set(col[v], q * 3); const s = first[v]; Jn.set(src.joints.subarray(s * 4, s * 4 + 4), q * 4); Wn.set(src.weights.subarray(s * 4, s * 4 + 4), q * 4);
    let bi = 0; for (let k = 1; k < 4; k++) if (src.weights[s * 4 + k] > src.weights[s * 4 + bi]) bi = k; const zone = ZONE(JOINTS_OF(src)[src.joints[s * 4 + bi]]); Z[q] = zone;
    Rg[q] = regionOf(kind, zone, col[v], src.bindPos ? src.bindPos.subarray(s * 3, s * 3 + 3) : P.subarray(q * 3, q * 3 + 3), H); });
  for (let i = 0; i < sidx.length; i++) I[i] = used.get(sidx[i]);
  return { P, C, Jn, Wn, Z, Rg, I, m };
}
const JOINTS_OF = (src) => src.jointNames;

function writeLO(doc, nodeName, lo, skinFrom) {
  const buf = doc.getRoot().listBuffers()[0] || doc.createBuffer();
  const acc = (arr, type) => doc.createAccessor().setArray(arr).setType(type).setBuffer(buf);
  const prim = doc.createPrimitive().setAttribute("POSITION", acc(lo.P, "VEC3")).setAttribute("COLOR_0", acc(lo.C, "VEC3")).setAttribute("JOINTS_0", acc(lo.Jn, "VEC4")).setAttribute("WEIGHTS_0", acc(lo.Wn, "VEC4"))
    .setAttribute("_ZONE", acc(lo.Z, "SCALAR")).setAttribute("_REGION", acc(lo.Rg, "SCALAR")).setIndices(acc(lo.I, "SCALAR"))
    .setMaterial(doc.createMaterial("crowd").setBaseColorFactor([1, 1, 1, 1]).setRoughnessFactor(.75).setMetallicFactor(0));
  return prim;
}

async function finish(doc, file) {
  doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
  const { quantize, reorder, prune, dedup } = await import("@gltf-transform/functions");
  const { resample } = await import("@gltf-transform/functions");
  await doc.transform(resample({ tolerance: 2e-4 }), prune(), dedup(), reorder({ encoder: MeshoptEncoder }), quantize({ pattern: /^(POSITION|NORMAL|TEXCOORD_0|COLOR_0)$/ }));
  await io.write(file, doc); }

/* ================= the surfer ================= */
{
  const doc = await io.read(path.join(SRC, "surfer_m.glb")), R = doc.getRoot(), S = readPrim(doc);
  S.jointNames = S.node.getSkin().listJoints().map(j => j.getName()); S.T = await decodeTex(S.tex);
  // bind-pose positions (to judge height-based regions): mesh space → world via the inverse bind matrices of the strongest joint
  const skin = S.node.getSkin(), ibm = skin.getInverseBindMatrices(), JN = skin.listJoints(), inv = (m) => { const a = m, o = new Array(16);
    const [a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, a30, a31, a32, a33] = a; const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12, b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
    const det = 1 / (b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06);
    o[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det; o[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det; o[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det; o[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det; o[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det; o[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det; o[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det; o[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det; o[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det; o[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det; o[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det; o[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det; o[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det; o[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det; o[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det; o[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det; return o; };
  const jw = JN.map(j => j.getWorldMatrix()), t = [];
  S.bindPos = new Float32Array(S.n * 3);
  for (let i = 0; i < S.n; i++) { const jj = S.joints[i * 4]; ibm.getElement(jj, t); const B = t.slice(); const W = jw[jj];
    const x = S.pos[i * 3], y = S.pos[i * 3 + 1], z = S.pos[i * 3 + 2], bx = B[0] * x + B[4] * y + B[8] * z + B[12], by = B[1] * x + B[5] * y + B[9] * z + B[13], bz = B[2] * x + B[6] * y + B[10] * z + B[14];
    S.bindPos[i * 3] = W[0] * bx + W[4] * by + W[8] * bz + W[12]; S.bindPos[i * 3 + 1] = W[1] * bx + W[5] * by + W[9] * bz + W[13]; S.bindPos[i * 3 + 2] = W[2] * bx + W[6] * by + W[10] * bz + W[14]; }
  let ymn = 1e9, ymx = -1e9; for (let i = 0; i < S.n; i++) { ymn = Math.min(ymn, S.bindPos[i * 3 + 1]); ymx = Math.max(ymx, S.bindPos[i * 3 + 1]); }
  for (let i = 0; i < S.n; i++) S.bindPos[i * 3 + 1] -= ymn; const H = ymx - ymn; console.log("surfer height (world)", H.toFixed(3));
  // LOD0: same mesh, base colour only (512) + zone attribute
  const mat = S.prim.getMaterial(); mat.setNormalTexture(null).setMetallicRoughnessTexture(null).setEmissiveTexture(null).setEmissiveFactor([0, 0, 0]).setMetallicFactor(0).setRoughnessFactor(.62);
  const tex = mat.getBaseColorTexture(); tex.setImage(await smallTex(tex, 512)).setMimeType("image/webp");
  const zone = new Float32Array(S.n); for (let i = 0; i < S.n; i++) { let bi = 0; for (let k = 1; k < 4; k++) if (S.weights[i * 4 + k] > S.weights[i * 4 + bi]) bi = k; zone[i] = ZONE(S.jointNames[S.joints[i * 4 + bi]]); }
  S.prim.setAttribute("_ZONE", doc.createAccessor().setArray(zone).setType("SCALAR").setBuffer(R.listBuffers()[0]));
  const reg = new Float32Array(S.n); for (let i = 0; i < S.n; i++) reg[i] = regionOf("m", zone[i], sampleTex(S.T, S.uv[i * 2], S.uv[i * 2 + 1]), S.bindPos.subarray(i * 3, i * 3 + 3), H);
  S.prim.setAttribute("_REGION", doc.createAccessor().setArray(reg).setType("SCALAR").setBuffer(R.listBuffers()[0]));
  S.prim.setAttribute("TANGENT", null);
  await finish(doc, path.join(OUT, "human_m.glb")); console.log("human_m.glb", S.n, "verts");
  for (const [file, tgt, err] of [["human_m_lo.glb", 2600, .05], ["human_m_lo2.glb", 700, .2]]) {
    const lo = buildLO(S, "m", tgt, err, H), d = new Document(); d.createBuffer();
    const src = S.node.getSkin(), map = new Map(), copy = (n) => { const o = d.createNode(n.getName()).setTranslation(n.getTranslation()).setRotation(n.getRotation()).setScale(n.getScale()); map.set(n, o); n.listChildren().forEach(c => { if (c.getMesh()) return; o.addChild(copy(c)); }); return o; };
    const arm = R.listScenes()[0].listChildren().find(n => n.getName() === "Armature") || R.listNodes().find(n => n.getName() === "Armature"); const armN = copy(arm);
    const ib = []; for (let j = 0; j < JN.length; j++) { ibm.getElement(j, t); ib.push(...t); }
    const skin2 = d.createSkin("surfer").setSkeleton(map.get(JN[0])).setInverseBindMatrices(d.createAccessor().setArray(new Float32Array(ib)).setType("MAT4").setBuffer(d.getRoot().listBuffers()[0]));
    JN.forEach(j => skin2.addJoint(map.get(j)));
    const body = d.createNode("char1").setMesh(d.createMesh("crowd").addPrimitive(writeLO(d, "crowd", lo))).setSkin(skin2); armN.addChild(body); d.createScene("s").addChild(armN);
    if (file === "human_m_lo.glb") for (const a of R.listAnimations()) { const na = d.createAnimation(a.getName()), b0 = d.getRoot().listBuffers()[0];
      for (const ch of a.listChannels()) { const sm = ch.getSampler(), tgt = map.get(ch.getTargetNode()); if (!tgt) continue;
        const ns = d.createAnimationSampler().setInterpolation(sm.getInterpolation()).setInput(d.createAccessor().setArray(sm.getInput().getArray().slice()).setType("SCALAR").setBuffer(b0)).setOutput(d.createAccessor().setArray(sm.getOutput().getArray().slice()).setType(sm.getOutput().getType()).setBuffer(b0));
        na.addSampler(ns).addChannel(d.createAnimationChannel().setTargetNode(tgt).setTargetPath(ch.getTargetPath()).setSampler(ns)); } }
    await finish(d, path.join(OUT, file)); console.log(file, lo.m, "verts", lo.I.length / 3, "tris"); }
}

/* ================= the beach lady (auto-rig) ================= */
{
  const doc = await io.read(path.join(SRC, "beachlady.glb")), L = readPrim(doc); L.T = await decodeTex(L.tex); rigLady(L); L.jointNames = JOINTS;
  const make = async (lo, file, textured) => {
    const d = new Document(), buf = d.createBuffer(), acc = (arr, type) => d.createAccessor().setArray(arr).setType(type).setBuffer(buf);
    // skeleton: rest rotations = identity, translations = joint offsets from the parent
    const nodes = {}; for (const n of JOINTS) { const p = L.J[n], q = PARENT[n] ? L.J[PARENT[n]] : [0, 0, 0]; nodes[n] = d.createNode(n).setTranslation([p[0] - q[0], p[1] - q[1], p[2] - q[2]]); }
    for (const n of JOINTS) if (PARENT[n]) nodes[PARENT[n]].addChild(nodes[n]);
    const ibm = new Float32Array(JOINTS.length * 16); JOINTS.forEach((n, i) => { const p = L.J[n]; ibm.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -p[0], -p[1], -p[2], 1], i * 16); });
    const skin = d.createSkin("lady").setSkeleton(nodes.Hips).setInverseBindMatrices(acc(ibm, "MAT4")); JOINTS.forEach(n => skin.addJoint(nodes[n]));
    let prim;
    if (textured) { const t = d.createTexture("base").setImage(await smallTex(L.tex, 512)).setMimeType("image/webp"); d.createExtension(EXTTextureWebP).setRequired(true);
      const zone = new Float32Array(L.n), reg = new Float32Array(L.n); for (let i = 0; i < L.n; i++) { zone[i] = ZONE(JOINTS[L.joints[i * 4]]); reg[i] = regionOf("f", zone[i], sampleTex(L.T, L.uv[i * 2], L.uv[i * 2 + 1]), L.pos.subarray(i * 3, i * 3 + 3), 1.8); }
      prim = d.createPrimitive().setAttribute("POSITION", acc(L.pos, "VEC3")).setAttribute("TEXCOORD_0", acc(L.uv, "VEC2")).setAttribute("JOINTS_0", acc(L.joints, "VEC4")).setAttribute("WEIGHTS_0", acc(L.weights, "VEC4"))
        .setAttribute("_ZONE", acc(zone, "SCALAR")).setAttribute("_REGION", acc(reg, "SCALAR")).setIndices(acc(L.idx, "SCALAR")).setMaterial(d.createMaterial("lady").setBaseColorTexture(t).setRoughnessFactor(.62).setMetallicFactor(0).setDoubleSided(true)); }
    else prim = writeLO(d, "crowd", lo);
    const mesh = d.createMesh("lady").addPrimitive(prim), body = d.createNode("char1").setMesh(mesh).setSkin(skin);
    d.createScene("s").addChild(nodes.Hips).addChild(body);
    await finish(d, path.join(OUT, file)); console.log(file, textured ? L.n : lo.m, "verts"); };
  await make(null, "human_f.glb", true);
  await make(buildLO(L, "f", 2600, .05, 1.8), "human_f_lo.glb", false);
  await make(buildLO(L, "f", 700, .2, 1.8), "human_f_lo2.glb", false);
}
