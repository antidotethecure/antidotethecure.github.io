/* engine3d/crowd.js — realistic animated crowds for the browser (three.js r160, WebGL2).
   People are the Nalu Vida cast: the surfer (rigged Meshy GLB) and the beach lady (auto-rigged by tools/build-humans.mjs with the
   same bone names). Three levels of detail:
     NEAR  real THREE.SkinnedMesh clones with their texture, AnimationMixer + cross-fades (the closest few people)
     LOD1  ~1300-vertex versions, one InstancedMesh per body, animated by a VERTEX ANIMATION TEXTURE (VAT) baked at load time
     LOD2  ~350-vertex versions, same VAT technique (far crowd); beyond that, distance culling
   Every clip (clips.js) is solved onto each skeleton once at load (aim-constraint rig solver), giving both the AnimationClips for
   the NEAR meshes and the baked VAT frames for the instanced ones, so all three LODs move identically.
   Per-person variation without extra downloads: skin tone (luminance-preserving), recoloured native clothing (the surfer's
   floral boardshorts / the lady's swimsuit keep their print), hair colour, optional shirt (tank / tee / long sleeve), shorts or
   long pants, shoes, girth, height. Wind sway on loose clothing is a small vertex wobble driven by uWind.

   API
     const crowd = await createCrowd(THREE, { base, loader, scene, quality, height })
     const p = crowd.add({ body: "m"|"f", look: {...}|undefined (random), seed, scale })   → person handle
     p.set(x, y, z, yaw)    p.play("walk"|"idle"|...)   p.visible = false
     crowd.update(camera, timeSeconds)    (once per frame, after the people moved)
     crowd.clipNames, crowd.dispose(), crowd.stats()
   quality: { near: 0..12, lod1: true|false, maxDist, lod1Dist, nearDist, shadows } */
import { CLIPS, GLB_CLIPS, ALIAS } from "./clips.js?v=e3h";

export async function createCrowd(THREE, O) {
  const base = O.base, loader = O.loader, Q = Object.assign({ near: 6, lod1: true, maxDist: 2600, lod1Dist: 900, nearDist: 260, shadows: false, max: 600 }, O.quality || {});
  const H = O.height || 8.6;   // world height of an average adult
  const isGL2 = O.renderer ? O.renderer.capabilities.isWebGL2 : true;
  if (!isGL2) throw new Error("crowd needs WebGL2");
  const load = (f) => loader.loadAsync(base + f);
  const [gm, gf, gm2, gf2] = await Promise.all(["human_m_lo.glb", "human_f_lo.glb", "human_m_lo2.glb", "human_f_lo2.glb"].map(load));
  const BODIES = { m: { lo: gm, lo2: gm2, near: "human_m.glb" }, f: { lo: gf, lo2: gf2, near: "human_f.glb" } };

  /* ---------------- rig + solver ---------------- */
  const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _e = new THREE.Euler(), _m = new THREE.Matrix4(), _s = new THREE.Vector3();
  function makeRig(root) {
    root.updateMatrixWorld(true);
    let skinned = null; root.traverse(o => { if (o.isSkinnedMesh && !skinned) skinned = o; });
    if (!skinned.geometry.attributes.normal) skinned.geometry.computeVertexNormals();
    const bones = {}; skinned.skeleton.bones.forEach(b => bones[b.name] = b);
    const order = []; (function walk(b) { order.push(b); b.children.forEach(c => { if (c.isBone) walk(c); }); })(bones.Hips);
    const rest = new Map(); order.forEach(b => rest.set(b, { q: b.quaternion.clone(), p: b.position.clone() }));
    const restW = new Map(); order.forEach(b => { b.matrixWorld.decompose(_v, _q, _s); restW.set(b, { q: _q.clone(), p: _v.clone() }); });
    // model height (bind pose skinned bbox) → normalisation to height 1, feet at 0, hips over the origin
    const box = new THREE.Box3().setFromObject(skinned, true), Hm = box.max.y - box.min.y, hp = restW.get(bones.Hips).p;
    const norm = { s: 1 / Hm, x: hp.x, y: box.min.y, z: hp.z };
    return { root, skinned, bones, order, rest, restW, Hm, norm };
  }
  function parentWorldQ(b, out) { b.parent.matrixWorld.decompose(_v2, out, _s); return out; }
  function setWorldQ(b, wq) { parentWorldQ(b, _q2).invert(); b.quaternion.copy(_q2.multiply(wq)); b.updateMatrixWorld(true); }
  function aim(rig, b, child, dir) {   // rotate b (in world) so that b→child points along dir (unit, world)
    b.updateMatrixWorld(true); const bp = _v.setFromMatrixPosition(b.matrixWorld), cp = _v2.setFromMatrixPosition(child.matrixWorld);
    const d = cp.sub(bp).normalize(); const delta = new THREE.Quaternion().setFromUnitVectors(d, _tmpDir.set(dir[0], dir[1], dir[2]).normalize());
    b.matrixWorld.decompose(_tv, _tq, _s); setWorldQ(b, delta.multiply(_tq)); }
  const _tmpDir = new THREE.Vector3(), _tv = new THREE.Vector3(), _tq = new THREE.Quaternion();
  const eulerQ = (a, out) => out.setFromEuler(_e.set(a[0], a[1], a[2], "YXZ"));
  const Rb = new THREE.Quaternion(), Rs = new THREE.Quaternion(), Rc = new THREE.Quaternion(), Rh = new THREE.Quaternion(), Rt = new THREE.Quaternion(), Vd = new THREE.Vector3();
  const rotD = (R, d) => { Vd.set(d[0], d[1], d[2]).applyQuaternion(R); return [Vd.x, Vd.y, Vd.z]; };
  function resetRig(rig) { rig.order.forEach(b => { const r = rig.rest.get(b); b.quaternion.copy(r.q); b.position.copy(r.p); }); rig.root.updateMatrixWorld(true); }
  function solve(rig, P) {
    resetRig(rig); const B = rig.bones, W = rig.restW;
    const hipsWorld = (dx, dy, dz) => { const p = W.get(B.Hips).p, t = _v.set(p.x + dx * rig.Hm, p.y + dy * rig.Hm, p.z + dz * rig.Hm); B.Hips.parent.worldToLocal(t); B.Hips.position.copy(t); };
    const worldRot = (b, R) => { if (!b) return; setWorldQ(b, _q.copy(R).multiply(W.get(b).q)); };
    if (P.raw) {   // retargeted frame: world deltas for the torso chain, world directions for the limbs
      hipsWorld(P.raw.hip[0], P.raw.hip[1], P.raw.hip[2]); B.Hips.updateMatrixWorld(true);
      for (const b of rig.order) { const n = b.name; if (P.raw.rots[n]) worldRot(b, P.raw.rots[n]); else if (P.raw.dirs[n]) { const c = AIM[n] && B[AIM[n]]; if (c) aim(rig, b, c, P.raw.dirs[n]); } }
      return;
    }
    eulerQ(P.hipR, Rb); hipsWorld(P.hip[0], P.hip[1], P.hip[2]); worldRot(B.Hips, Rb);
    const sp = (f) => eulerQ([P.spine[0] * f, P.spine[1] * f, P.spine[2] * f], Rs);
    worldRot(B.Spine02, Rt.copy(Rb).multiply(sp(.35))); worldRot(B.Spine01, Rt.copy(Rb).multiply(sp(.7))); Rc.copy(Rb).multiply(sp(1)); worldRot(B.Spine, Rc);
    const hd = (f) => eulerQ([P.head[0] * f, P.head[1] * f, P.head[2] * f], Rh);
    worldRot(B.neck, Rt.copy(Rc).multiply(hd(.4))); worldRot(B.Head, Rt.copy(Rc).multiply(hd(1)));
    for (const [side, A] of [["Left", P.armL], ["Right", P.armR]]) { aim(rig, B[side + "Arm"], B[side + "ForeArm"], rotD(Rc, A[0])); aim(rig, B[side + "ForeArm"], B[side + "Hand"], rotD(Rc, A[1])); }
    for (const [side, L] of [["Left", P.legL], ["Right", P.legR]]) { aim(rig, B[side + "UpLeg"], B[side + "Leg"], rotD(Rb, L[0])); aim(rig, B[side + "Leg"], B[side + "Foot"], rotD(Rb, L[1])); }
  }
  const AIM = { LeftArm: "LeftForeArm", LeftForeArm: "LeftHand", RightArm: "RightForeArm", RightForeArm: "RightHand", LeftUpLeg: "LeftLeg", LeftLeg: "LeftFoot", RightUpLeg: "RightLeg", RightLeg: "RightFoot", LeftFoot: "LeftToeBase", RightFoot: "RightToeBase" };
  const ROT = ["Hips", "Spine02", "Spine01", "Spine", "neck", "Head"];
  // read a retarget frame off a posed source rig
  function capture(rig) { rig.root.updateMatrixWorld(true); const B = rig.bones, raw = { hip: [0, 0, 0], rots: {}, dirs: {} };
    const hp = _v.setFromMatrixPosition(B.Hips.matrixWorld), r = rig.restW.get(B.Hips).p; raw.hip = [(hp.x - r.x) / rig.Hm, (hp.y - r.y) / rig.Hm, (hp.z - r.z) / rig.Hm];
    for (const n of ROT) { B[n].matrixWorld.decompose(_tv, _tq, _s); raw.rots[n] = _tq.clone().multiply(rig.restW.get(B[n]).q.clone().invert()); }
    for (const n in AIM) { const a = _v.setFromMatrixPosition(B[n].matrixWorld), c = _v2.setFromMatrixPosition(B[AIM[n]].matrixWorld); const d = c.sub(a).normalize(); raw.dirs[n] = [d.x, d.y, d.z]; }
    return { raw }; }

  /* ---------------- clip table ---------------- */
  const names = Object.keys(CLIPS).filter(k => !CLIPS[k].alias).concat(Object.keys(GLB_CLIPS));
  const srcRig = makeRig(gm.scene), mixer = new THREE.AnimationMixer(gm.scene);
  const FRAMES = {};   // name → [pose per frame]
  for (const n of names) {
    if (CLIPS[n]) { const c = CLIPS[n], nf = Math.max(2, Math.round(c.dur * c.fps)); FRAMES[n] = { fps: nf / c.dur, loop: c.loop, phone: !!c.phone, poses: Array.from({ length: nf }, (_, f) => c.fn(f / nf, f / nf * c.dur)) }; }
    else { const [src, fps, loop] = GLB_CLIPS[n], clip = gm.animations.find(a => a.name === src); if (!clip) continue;
      const act = mixer.clipAction(clip); act.play(); const nf = Math.max(2, Math.round(clip.duration * fps)), poses = [];
      for (let f = 0; f < nf; f++) { mixer.setTime(f / nf * clip.duration * (loop ? 1 : nf / (nf - 1) * .999)); poses.push(capture(srcRig)); }
      act.stop(); FRAMES[n] = { fps: nf / clip.duration, loop, poses }; }
  }
  // the surfer GLB clips move the hips forward (run) / around; keep people on their spot: remove the average horizontal drift
  for (const n in FRAMES) { const F = FRAMES[n]; if (!F.poses[0].raw) continue; let ax = 0, az = 0; F.poses.forEach(p => { ax += p.raw.hip[0]; az += p.raw.hip[2]; }); ax /= F.poses.length; az /= F.poses.length; F.poses.forEach(p => { p.raw.hip[0] -= ax; p.raw.hip[2] -= az; }); }
  resetRig(srcRig);

  /* ---------------- per body: VAT bake for LOD1/LOD2 + AnimationClips for NEAR ---------------- */
  const LAYOUT = []; let totalFrames = 0; for (const n of names) { if (!FRAMES[n]) continue; LAYOUT.push(n); FRAMES[n].start = totalFrames; FRAMES[n].count = FRAMES[n].poses.length; totalFrames += FRAMES[n].count; }
  const toHalf = THREE.DataUtils.toHalfFloat;
  function bakeBody(key) {
    const Bd = BODIES[key], rig = makeRig(Bd.lo.scene), rig2 = makeRig(Bd.lo2.scene), out = { rig };
    const meshes = [[rig, "lo"], [rig2, "lo2"]].map(([R]) => { const g = R.skinned.geometry; return { R, g, n: g.attributes.position.count, P: new Uint16Array(g.attributes.position.count * totalFrames * 4), N: new Uint16Array(g.attributes.position.count * totalFrames * 4) }; });
    const tracks = {}; rig.order.forEach(b => tracks[b.name] = []); const hipT = [];
    const bm = new THREE.Matrix4(), v = new THREE.Vector3(), nv = new THREE.Vector3(), acc = new THREE.Vector3(), nacc = new THREE.Vector3(), nm = new THREE.Matrix3();
    let row = 0;
    for (const n of LAYOUT) { const F = FRAMES[n];
      F.poses.forEach((pose, fi) => {
        for (const M of meshes) { const R = M.R; solve(R, pose); R.root.updateMatrixWorld(true); const sk = R.skinned, S = sk.skeleton; S.update();
          const g = M.g, pos = g.attributes.position, nor = g.attributes.normal, si = g.attributes.skinIndex, sw = g.attributes.skinWeight, BMs = S.boneMatrices, nz = R.norm;
          const W = sk.matrixWorld, BI = sk.bindMatrixInverse, BM = sk.bindMatrix;
          const fin = new THREE.Matrix4().multiplyMatrices(W, BI);
          for (let i = 0; i < M.n; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(BM); nv.fromBufferAttribute(nor, i).transformDirection(BM); acc.set(0, 0, 0); nacc.set(0, 0, 0);
            for (let k = 0; k < 4; k++) { const w = sw.getComponent(i, k); if (!w) continue; bm.fromArray(BMs, si.getComponent(i, k) * 16); acc.addScaledVector(_v.copy(v).applyMatrix4(bm), w); nm.setFromMatrix4(bm); nacc.addScaledVector(_v2.copy(nv).applyMatrix3(nm), w); }
            acc.applyMatrix4(fin); nacc.transformDirection(fin);
            const o = ((row * M.n) + i) * 4; M.P[o] = toHalf((acc.x - nz.x) * nz.s); M.P[o + 1] = toHalf((acc.y - nz.y) * nz.s); M.P[o + 2] = toHalf((acc.z - nz.z) * nz.s); M.P[o + 3] = toHalf(1);
            M.N[o] = toHalf(nacc.x); M.N[o + 1] = toHalf(nacc.y); M.N[o + 2] = toHalf(nacc.z); M.N[o + 3] = toHalf(0); } }
        // NEAR clip keys (local quaternions of the LOD1 rig — same skeleton as the near GLB)
        solve(rig, pose); rig.order.forEach(b => tracks[b.name].push(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w)); hipT.push(rig.bones.Hips.position.x, rig.bones.Hips.position.y, rig.bones.Hips.position.z);
        row++; });
    }
    out.clips = {}; let r0 = 0;
    for (const n of LAYOUT) { const F = FRAMES[n], times = Array.from({ length: F.count + (F.loop ? 1 : 0) }, (_, i) => i / F.fps), T = [];
      const pick = (arr, w) => { const s = arr.slice(r0 * w, (r0 + F.count) * w); return F.loop ? s.concat(arr.slice(r0 * w, r0 * w + w)) : s; };
      for (const b of rig.order) T.push(new THREE.QuaternionKeyframeTrack(b.name + ".quaternion", times, pick(tracks[b.name], 4)));
      T.push(new THREE.VectorKeyframeTrack("Hips.position", times, pick(hipT, 3))); out.clips[n] = new THREE.AnimationClip(n, F.count / F.fps, T); r0 += F.count; }
    out.vat = meshes.map(M => { const mk = (arr) => { const t = new THREE.DataTexture(arr, M.n, totalFrames, THREE.RGBAFormat, THREE.HalfFloatType); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; };
      return { n: M.n, tP: mk(M.P), tN: mk(M.N), geo: M.g }; });
    resetRig(rig); resetRig(rig2); return out;
  }
  const t0 = performance.now();
  const BAKED = { m: bakeBody("m"), f: bakeBody("f") };
  const bakeMs = performance.now() - t0;

  /* ---------------- instanced VAT material ---------------- */
  const UT = { value: 0 }, UW = { value: new THREE.Vector3(0, 0, 0) };
  const NAT = { m: { skin: [0.62, 0.38, 0.27], cloth: [0.16, 0.42, 0.66], hair: [0.18, 0.12, 0.08] }, f: { skin: [0.66, 0.44, 0.3], cloth: [0.72, 0.1, 0.1], hair: [0.62, 0.46, 0.28] } };
  const lum = (c) => c[0] * .299 + c[1] * .587 + c[2] * .114;
  const GLSL_COMMON = `
    attribute vec4 iClipA; attribute vec4 iClipB; attribute vec4 iLookA; attribute vec4 iLookB; attribute vec2 _zr;
    vec3 unpackC(float f){ float r = floor(f / 65536.0), g = floor((f - r * 65536.0) / 256.0), b = f - r * 65536.0 - g * 256.0; return vec3(r, g, b) / 255.0; }
    uniform sampler2D uVatP; uniform sampler2D uVatN; uniform float uT; uniform vec3 uWind;
    flat varying vec3 vSkin; flat varying vec4 vCloth; flat varying vec4 vTop; flat varying vec4 vBot; flat varying vec4 vHair; flat varying float vZone; varying vec4 vRW;
    float vatFrame(vec4 c, out float f1, out float fr){ float t = max(0.0, uT - c.w) * c.z, n = abs(c.y), f;
      if (c.y > 0.0) f = mod(t, n); else f = min(t, n - 1.001);
      float f0 = floor(f); fr = f - f0; f1 = c.y > 0.0 ? mod(f0 + 1.0, n) : min(f0 + 1.0, n - 1.0); return c.x + f0; }
    vec3 vatGet(sampler2D s, vec4 c){ float f1, fr; float f0 = vatFrame(c, f1, fr); int id = gl_VertexID;
      vec3 a = texelFetch(s, ivec2(id, int(f0)), 0).xyz, b = texelFetch(s, ivec2(id, int(c.x + f1)), 0).xyz; return mix(a, b, fr); }`;
  const VERT_POSE = `
    float _zone = _zr.x, _region = _zr.y;
    float bl = clamp((uT - iLookB.w) / 0.28, 0.0, 1.0);
    vec3 vp = vatGet(uVatP, iClipA), vn = vatGet(uVatN, iClipA);
    if (bl < 1.0 && iClipB.z > 0.0) { vec3 bp = vatGet(uVatP, iClipB), bn = vatGet(uVatN, iClipB); vp = mix(bp, vp, bl); vn = mix(bn, vn, bl); }
    vp.x *= 1.0 + iLookB.z;
    float flut = (_region > 0.5 && _region < 2.5) ? 1.0 : 0.0; vp += uWind * flut * 0.004 * sin(uT * 9.0 + vp.y * 30.0 + float(gl_InstanceID));
  `;
  // the recolouring rules, shared by the VAT crowd and the NEAR textured meshes. rw = region weights (skin, clothing, hair, keep)
  const DRESS_GLSL = `
    float lm(vec3 c){ return max(1e-4, dot(c, vec3(.299,.587,.114))); }
    vec3 dressC(vec3 c, float zone, vec4 rw, vec3 skin, vec4 cloth, vec4 topC, vec4 botC, vec4 hair, vec3 nSkin, vec3 nCloth, vec3 nHair){
      float L = lm(c);
      vec3 sk = skin * clamp(L / lm(nSkin), .55, 1.45), cl = cloth.rgb * clamp(L / lm(nCloth), .35, 2.2), hr = hair.rgb * clamp(L / lm(nHair), .6, 1.6);
      vec3 o = sk * rw.x + cl * rw.y + hr * rw.z + c * rw.w;
      float z = floor(zone + .5), top = topC.w, bot = botC.w, shade = .82 + .18 * clamp(L / lm(nSkin), .6, 1.3);
      float body = rw.x + rw.y;
      float shirt = (top > .5 && (z == 1.0 || (z == 5.0) || (top > 1.5 && z == 2.0) || (top > 2.5 && z == 3.0))) ? body : 0.0;
      if (z == 5.0 && top > .5) shirt *= rw.x;   // over the waist only where there is skin (the shorts stay)
      o = mix(o, topC.rgb * shade, shirt);
      float pants = ((bot > 1.5 && (z == 6.0 || z == 7.0 || z == 5.0)) || (bot > .5 && bot < 1.5 && z == 6.0)) ? body : 0.0;
      if (z == 5.0 && bot > 1.5) pants *= rw.y + (top < .5 ? 0.0 : 0.0);
      o = mix(o, botC.rgb * (.85 + .15 * clamp(L / lm(nSkin), .6, 1.3)), pants);
      if (bot > 2.5 && z == 8.0) o = vec3(.06) + botC.rgb * .12;
      return o; }`;
  function vatMaterial(vat, depth) {
    const m = depth ? new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }) : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .72, metalness: 0 });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uVatP = { value: vat.tP }; sh.uniforms.uVatN = { value: vat.tN }; sh.uniforms.uT = UT; sh.uniforms.uWind = UW;
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\n" + GLSL_COMMON);
      if (depth) { sh.vertexShader = sh.vertexShader.replace("#include <begin_vertex>", "vec3 transformed; {" + VERT_POSE + " transformed = vp; }"); return; }
      sh.vertexShader = sh.vertexShader.replace("#include <beginnormal_vertex>", "vec3 objectNormal; vec3 _vp;\n{" + VERT_POSE + " objectNormal = normalize(vn); _vp = vp; }\n#ifdef USE_TANGENT\nvec3 objectTangent = vec3( tangent.xyz );\n#endif")
        .replace("#include <begin_vertex>", "vec3 transformed = _vp;\n float st = floor(iLookB.y / 4.0 + .01); vSkin = unpackC(iLookA.x); vCloth = vec4(unpackC(iLookA.y), 0.); vHair = vec4(unpackC(iLookA.z), 0.); vTop = vec4(unpackC(iLookA.w), st); vBot = vec4(unpackC(iLookB.x), iLookB.y - st * 4.0); vZone = _zr.x; vRW = vec4(_zr.y < .5, abs(_zr.y - 1.) < .5, abs(_zr.y - 2.) < .5, _zr.y > 2.5);");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
        flat varying vec3 vSkin; flat varying vec4 vCloth; flat varying vec4 vTop; flat varying vec4 vBot; flat varying vec4 vHair; flat varying float vZone; varying vec4 vRW;
        uniform vec3 uNatSkin; uniform vec3 uNatCloth; uniform vec3 uNatHair;
        ` + DRESS_GLSL + `
        vec3 dress(vec3 c, float zone, vec4 rw){ return dressC(c, zone, rw, vSkin, vCloth, vTop, vBot, vHair, uNatSkin, uNatCloth, uNatHair); }`)
        .replace("#include <color_fragment>", "#include <color_fragment>\n diffuseColor.rgb = dress(vColor.rgb, vZone, vRW);");
    };
    m.customProgramCacheKey = () => "vat-crowd-" + (depth ? "d" : "c");
    return m;
  }
  function natUniforms(mat, key) { const prev = mat.onBeforeCompile; mat.onBeforeCompile = (sh, r) => { prev(sh, r); const N = NAT[key]; sh.uniforms.uNatSkin = { value: new THREE.Vector3(...N.skin) }; sh.uniforms.uNatCloth = { value: new THREE.Vector3(...N.cloth) }; sh.uniforms.uNatHair = { value: new THREE.Vector3(...N.hair) }; }; mat.customProgramCacheKey = () => "vat-crowd-" + key; }

  // native colours of each body (mean linear colour per region), the reference the recolouring is relative to
  for (const key of ["m", "f"]) { const g = BAKED[key].vat[0].geo, c = g.attributes.color, r = g.attributes._region, acc = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    for (let i = 0; i < c.count; i++) { const k = r.getX(i) | 0; if (k > 2) continue; const cc = new THREE.Color().setRGB(c.getX(i), c.getY(i), c.getZ(i), THREE.SRGBColorSpace); acc[k][0] += cc.r; acc[k][1] += cc.g; acc[k][2] += cc.b; acc[k][3]++; }
    const mean = (a) => a[3] ? [a[0] / a[3], a[1] / a[3], a[2] / a[3]] : [.3, .3, .3]; NAT[key] = { skin: mean(acc[0]), cloth: mean(acc[1]), hair: mean(acc[2]) }; }
  const IN = ["iClipA", "iClipB", "iLookA", "iLookB"];
  const pk = (c) => (Math.round(Math.min(1, Math.max(0, c[0])) * 255) * 65536 + Math.round(Math.min(1, Math.max(0, c[1])) * 255) * 256 + Math.round(Math.min(1, Math.max(0, c[2])) * 255));
  function makeInst(vat, key) {
    const src = vat.geo, g = new THREE.InstancedBufferGeometry(); g.index = src.index;
    g.setAttribute("position", src.attributes.position); g.setAttribute("normal", src.attributes.normal);
    // vertex colours: glTF stores them linear; our build stored texture (sRGB) values → convert once
    const col = src.attributes.color; if (!col.userData) col.userData = {}; if (!col.userData.lin) { for (let i = 0; i < col.count; i++) { const c = new THREE.Color().setRGB(col.getX(i), col.getY(i), col.getZ(i), THREE.SRGBColorSpace); col.setXYZ(i, c.r, c.g, c.b); } col.userData.lin = 1; }
    g.setAttribute("color", col); const zr = new Float32Array(col.count * 2); for (let i = 0; i < col.count; i++) { zr[i * 2] = src.attributes._zone.getX(i); zr[i * 2 + 1] = src.attributes._region.getX(i); } g.setAttribute("_zr", new THREE.BufferAttribute(zr, 2));
    const max = Q.max, A = {}; IN.forEach(k => { A[k] = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4); A[k].setUsage(THREE.DynamicDrawUsage); g.setAttribute(k, A[k]); });
    const im = new THREE.InstancedMesh(g, vatMaterial(vat, false), max); natUniforms(im.material, key); im.count = 0; im.frustumCulled = false; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    im.customDepthMaterial = vatMaterial(vat, true); im.castShadow = !!Q.shadows; im.receiveShadow = !!Q.shadows;
    im.userData.A = A; return im;
  }
  const root = new THREE.Group(); root.name = "crowd"; (O.scene || O.parent) && (O.scene || O.parent).add(root);
  const INST = {}; for (const key of ["m", "f"]) { INST[key] = [makeInst(BAKED[key].vat[0], key), makeInst(BAKED[key].vat[1], key)]; root.add(INST[key][0], INST[key][1]); }

  /* ---------------- umbrellas (rain): one instanced canopy + pole, opened over anyone with p.umbrella ---------------- */
  const UMAX = 400, umbG = (() => { const c = new THREE.ConeGeometry(.62, .2, 10, 1, true).translate(0, 1.18, 0), pl = new THREE.CylinderGeometry(.012, .012, .62, 4).translate(0, .87, 0);
    const g = new THREE.BufferGeometry(), a = c.toNonIndexed(), b = pl.toNonIndexed(); g.setAttribute("position", new THREE.Float32BufferAttribute([...a.attributes.position.array, ...b.attributes.position.array], 3)); g.computeVertexNormals(); return g; })();
  const umb = new THREE.InstancedMesh(umbG, new THREE.MeshStandardMaterial({ roughness: .55, side: THREE.DoubleSide }), UMAX); umb.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(UMAX * 3), 3); umb.count = 0; umb.frustumCulled = false; root.add(umb);
  const UMC = ["#1b1d22", "#a33645", "#2c4a7a", "#e8c070", "#3e6b4a", "#f2efe8", "#d42a2a", "#5a4ad8"].map(h => new THREE.Color(h));

  /* ---------------- looks ---------------- */
  const SKINS = ["#3b2219", "#4a2c1f", "#5b3826", "#6b4430", "#7c4f34", "#8d5a3b", "#9c6844", "#a9744d", "#b98559", "#c99a6e", "#d8ad84", "#e5c09c", "#f0cfae"];
  const HAIRS = ["#1a120e", "#231711", "#2e1e14", "#4a2e1c", "#5c3a22", "#0f0d0c", "#7a4e2c", "#b88a52", "#c9a063", "#8a8a8a", "#d9d4cc", "#3b2416"];
  const SWIM = ["#e4566b", "#f0d375", "#3aa8ff", "#1b1d22", "#ff7a3a", "#2fb38a", "#f2f2f2", "#8a5cd8", "#1d6f8a", "#d42a2a", "#ff9fb5", "#2c4a7a", "#3e6b4a"];
  const SHIRT = ["#f2efe8", "#111318", "#2c4a7a", "#a33645", "#e8c070", "#5a5f6b", "#3e6b4a", "#e46b83", "#7ec8e3", "#d9d2c3", "#8b5a2b", "#ffffff"];
  const PANTS = ["#1f2a44", "#2b2f36", "#111318", "#5a4a36", "#3b4b6b", "#7a6a52", "#c9bfa8", "#2a3550", "#4a4f57"];
  const col = (h) => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };
  function randomLook(R, body, style) { const pick = (a) => a[(R() * a.length) | 0];
    const L = { skin: col(pick(SKINS)), cloth: col(pick(SWIM)), hair: col(R() < .08 ? "#9a9a9a" : pick(HAIRS)), top: [0, 0, 0, 0], bot: [0, 0, 0, 0], girth: (R() - .4) * .22 };
    if (style === "street") { const t = pick(SHIRT); L.top = [...col(t), R() < .2 ? 1 : R() < .7 ? 2 : 3]; L.bot = [...col(pick(PANTS)), R() < .25 ? 1 : 3]; if (L.bot[3] === 1) L.bot[3] = 1; if (R() < .9) L.bot[3] = L.bot[3] === 1 ? 1 : 3; }
    else if (style === "beach") { if (body === "m" && R() < .25) L.top = [...col(pick(SHIRT)), R() < .5 ? 1 : 2]; }
    return L; }

  /* ---------------- people ---------------- */
  const people = [], NEAR = Q.near > 0 ? { m: null, f: null, slots: [] } : null;
  let seedC = 1; const rnd = (s) => { let x = (s * 2654435761) | 0; return () => { x = x + 0x6D2B79F5 | 0; let t = Math.imul(x ^ x >>> 15, 1 | x); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  function clipInfo(name) { name = ALIAS[name] || name; const F = FRAMES[name] || FRAMES.idle; return F; }
  function add(o = {}) { const R = rnd(o.seed || seedC++), body = o.body || (R() < .5 ? "m" : "f");
    const p = { body, look: o.look || randomLook(R, body, o.style || "beach"), x: 0, y: 0, z: 0, yaw: 0, s: (o.scale || (.94 + R() * .14)) * H, visible: true,
      clip: "idle", uc: (R() * 64) | 0, t0: -R() * 10, prev: null, pt0: 0, bt: -10, speed: 1, near: null, d: 0,
      set(x, y, z, yaw) { this.x = x; this.y = y; this.z = z; if (yaw != null) this.yaw = yaw; return this; },
      play(name, opt) { name = ALIAS[name] || name; if (!FRAMES[name]) name = "idle"; if (name === this.clip && !(opt && opt.restart)) return this; this.prev = this.clip; this.pt0 = this.t0; this.clip = name; this.t0 = NOW - ((opt && opt.offset) || (FRAMES[name].loop ? Math.random() * 3 : 0)); this.bt = NOW; return this; } };
    if (o.body === undefined && o.look) p.body = body; people.push(p); return p; }
  function remove(p) { const i = people.indexOf(p); if (i >= 0) people.splice(i, 1); if (p.near) { p.near.p = null; p.near = null; } }
  let NOW = 0;

  /* ---------------- near LOD: real SkinnedMesh clones ---------------- */
  let nearReady = false;
  async function loadNear() { if (!NEAR) return; const { clone } = await (O.addons ? O.addons("utils/SkeletonUtils.js") : import("three/addons/utils/SkeletonUtils.js"));
    const [m, f] = await Promise.all([load(BODIES.m.near), load(BODIES.f.near)]); const src = { m: m.scene, f: f.scene };
    for (const key of ["m", "f"]) for (let i = 0; i < Q.near; i++) { const o = clone(src[key]); let sk = null; o.traverse(n => { if (n.isSkinnedMesh) sk = n; });
      sk.frustumCulled = false; sk.castShadow = !!Q.shadows; sk.receiveShadow = !!Q.shadows; const mat = sk.material.clone(); sk.material = mat;
      const U = { skin: { value: new THREE.Vector3() }, cloth: { value: new THREE.Vector4() }, top: { value: new THREE.Vector4() }, bot: { value: new THREE.Vector4() }, hair: { value: new THREE.Vector4() } };
      mat.onBeforeCompile = (sh) => { const N = NAT[key]; Object.assign(sh.uniforms, { nSkin: U.skin, nCloth: U.cloth, nTop: U.top, nBot: U.bot, nHair: U.hair, uNatSkin: { value: new THREE.Vector3(...N.skin) }, uNatCloth: { value: new THREE.Vector3(...N.cloth) }, uNatHair: { value: new THREE.Vector3(...N.hair) } });
        sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute float _zone; attribute float _region; flat varying float vZone; varying vec4 vRW;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvZone = _zone; vRW = vec4(_region < .5, abs(_region - 1.) < .5, abs(_region - 2.) < .5, _region > 2.5);");
        sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
          uniform vec3 nSkin; uniform vec4 nCloth; uniform vec4 nTop; uniform vec4 nBot; uniform vec4 nHair; uniform vec3 uNatSkin; uniform vec3 uNatCloth; uniform vec3 uNatHair; flat varying float vZone; varying vec4 vRW;
          ` + DRESS_GLSL)
          .replace("#include <map_fragment>", "#include <map_fragment>\n diffuseColor.rgb = dressC(diffuseColor.rgb, vZone, vRW, nSkin, nCloth, nTop, nBot, nHair, uNatSkin, uNatCloth, uNatHair);"); };
      mat.customProgramCacheKey = () => "near-crowd-" + key;
      const mx = new THREE.AnimationMixer(o), acts = {}; for (const n in BAKED[key].clips) { acts[n] = mx.clipAction(BAKED[key].clips[n]); if (!FRAMES[n].loop) { acts[n].setLoop(THREE.LoopOnce); acts[n].clampWhenFinished = true; } }
      // the near GLB is in its own units: normalise to height 1 like the VAT, then the person's height
      const rig = BAKED[key].rig, holder = new THREE.Group(), inner = new THREE.Group(); inner.add(o); inner.scale.setScalar(rig.norm.s); inner.position.set(-rig.norm.x * rig.norm.s, -rig.norm.y * rig.norm.s, -rig.norm.z * rig.norm.s); holder.add(inner); holder.visible = false; root.add(holder);
      NEAR.slots.push({ key, holder, mx, acts, U, p: null, cur: null }); }
    nearReady = true; }

  /* ---------------- per-frame ---------------- */
  const frustum = new THREE.Frustum(), PM = new THREE.Matrix4(), SPH = new THREE.Sphere(), M4 = new THREE.Matrix4(), QY = new THREE.Quaternion(), YA = new THREE.Vector3(0, 1, 0), PV = new THREE.Vector3(), SV = new THREE.Vector3();
  let FRAME = 0; let stats = { total: 0, near: 0, lod1: 0, lod2: 0, culled: 0 };
  function update(camera, t, dt) {
    NOW = t; UT.value = t; PM.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(PM);
    const cx = camera.position.x, cy = camera.position.y, cz = camera.position.z, vis = []; FRAME++;
    for (const p of people) { if (!p.visible) continue;
      if (p.parent) { const g = p.parent; if (g._e3f !== FRAME) { g.updateWorldMatrix(true, false); g._e3f = FRAME; } PV.set(p.x, p.y, p.z).applyMatrix4(g.matrixWorld); p.wx = PV.x; p.wy = PV.y; p.wz = PV.z; } else { p.wx = p.x; p.wy = p.y; p.wz = p.z; }
      SPH.center.set(p.wx, p.wy + p.s * .5, p.wz); SPH.radius = p.s * .9; if (!frustum.intersectsSphere(SPH)) continue;
      const dx = p.wx - cx, dy = p.wy - cy, dz = p.wz - cz; p.d = Math.sqrt(dx * dx + dy * dy + dz * dz) / (p.s / H); if (p.d > Q.maxDist) continue; vis.push(p); }
    // NEAR slots: the closest people within nearDist
    const wantNear = new Set(); if (nearReady) { const cand = vis.filter(p => p.d < Q.nearDist).sort((a, b) => a.d - b.d); const per = { m: 0, f: 0 }; for (const p of cand) { if (per[p.body] >= Q.near) continue; per[p.body]++; wantNear.add(p); } }
    if (nearReady) { for (const s of NEAR.slots) if (s.p && !wantNear.has(s.p)) { s.p.near = null; s.p = null; s.holder.visible = false; s.cur = null; }
      for (const p of wantNear) { if (p.near) continue; const s = NEAR.slots.find(q => !q.p && q.key === p.body); if (!s) { wantNear.delete(p); continue; } s.p = p; p.near = s; s.cur = null; } }
    const cnt = { m: [0, 0], f: [0, 0] }; let un = 0;
    for (const p of vis) {
      if (p.umbrella && un < UMAX) { const k = p.s, sw = Math.sin(t * 1.3 + p.s) * .06; QY.setFromEuler(_e.set(sw, p.yaw, sw * .5)); M4.compose(PV.set(p.wx, p.wy, p.wz), QY, SV.set(k, k, k)); umb.setMatrixAt(un, M4); umb.setColorAt(un, UMC[p.uc % UMC.length]); un++; }
      if (p.near) { const s = p.near, L = p.look; s.holder.visible = true; s.holder.position.set(p.wx, p.wy, p.wz); s.holder.rotation.set(0, p.yaw, 0); s.holder.scale.set(p.s * (1 + (L.girth || 0)), p.s, p.s);
        s.U.skin.value.set(...L.skin); s.U.cloth.value.set(...L.cloth, 0); s.U.top.value.set(...L.top); s.U.bot.value.set(...L.bot); s.U.hair.value.set(...L.hair, 0);
        const F = FRAMES[p.clip], a = s.acts[p.clip], dur = F.count / F.fps; if (s.cur !== p.clip) { s.mx.stopAllAction(); a.reset().play(); s.cur = p.clip; }
        let tt = Math.max(0, t - p.t0); a.time = F.loop ? tt % dur : Math.min(tt, dur - 1e-3); s.mx.update(0); continue; }
      const lod = (!Q.lod1 || p.d > Q.lod1Dist) ? 1 : 0, im = INST[p.body][lod], i = cnt[p.body][lod]++; if (i >= Q.max) continue; const A = im.userData.A, L = p.look;
      const F = FRAMES[p.clip], PF = p.prev && FRAMES[p.prev];
      A.iClipA.setXYZW(i, F.start, F.loop ? F.count : -F.count, F.fps * p.speed, p.t0);
      if (PF && t - p.bt < .3) A.iClipB.setXYZW(i, PF.start, PF.loop ? PF.count : -PF.count, PF.fps * p.speed, p.pt0); else A.iClipB.setXYZW(i, 0, 1, 0, -100);
      if (!L._pk) L._pk = [pk(L.skin), pk(L.cloth), pk(L.hair), pk(L.top), pk(L.bot), (L.top[3] | 0) * 4 + (L.bot[3] | 0)];
      A.iLookA.setXYZW(i, L._pk[0], L._pk[1], L._pk[2], L._pk[3]); A.iLookB.setXYZW(i, L._pk[4], L._pk[5], L.girth || 0, p.bt);
      QY.setFromAxisAngle(YA, p.yaw); M4.compose(PV.set(p.wx, p.wy, p.wz), QY, SV.set(p.s, p.s, p.s)); im.setMatrixAt(i, M4); }
    umb.count = un; if (un) { umb.instanceMatrix.needsUpdate = true; umb.instanceColor.needsUpdate = true; }
    for (const key of ["m", "f"]) for (let l = 0; l < 2; l++) { const im = INST[key][l], n = Math.min(Q.max, cnt[key][l]); im.count = n; if (!n) continue; im.instanceMatrix.needsUpdate = true; const A = im.userData.A; for (const k of IN) { A[k].needsUpdate = true; if (A[k].addUpdateRange) { A[k].clearUpdateRanges(); A[k].addUpdateRange(0, n * 4); } } if (im.instanceMatrix.addUpdateRange) { im.instanceMatrix.clearUpdateRanges(); im.instanceMatrix.addUpdateRange(0, n * 16); } }
    stats = { total: people.length, visible: vis.length, near: wantNear.size, lod1: cnt.m[0] + cnt.f[0], lod2: cnt.m[1] + cnt.f[1], bakeMs: Math.round(bakeMs), frames: totalFrames };
  }
  function setQuality(q) { Object.assign(Q, q); for (const k in INST) INST[k].forEach(im => { im.castShadow = im.receiveShadow = !!Q.shadows; }); if (Q.near > 0 && NEAR && !nearReady && !nearLoading) { nearLoading = loadNear().catch(e => console.warn("[crowd] near LOD", e)); } }
  let nearLoading = null; if (Q.near > 0) nearLoading = loadNear().catch(e => console.warn("[crowd] near LOD", e));
  const _debug = { solve, FRAMES, BAKED, THREE };
  return { _debug, root, add, remove, update, people, setQuality, stats: () => stats, wind: UW.value, clipNames: LAYOUT.slice(), randomLook: (seed, body, style) => randomLook(rnd(seed), body, style), col,
    dispose() { root.parent && root.parent.remove(root); for (const k in INST) INST[k].forEach(im => { im.geometry.dispose(); im.material.dispose(); }); for (const k in BAKED) BAKED[k].vat.forEach(v => { v.tP.dispose(); v.tN.dispose(); }); } };
}
