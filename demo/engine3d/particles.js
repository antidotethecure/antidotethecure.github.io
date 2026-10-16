/* engine3d/particles.js — pooled GPU particles (smoke, fire, sparks, embers, spray), drop-in for air3d's makeFX.
   Each emit() writes ONE slot of a ring buffer (birth time, start position/velocity, sizes, colours, drag, rise); the vertex
   shader integrates the motion in closed form (drag + buoyancy/gravity), fades, grows, rotates and colours it. No per-particle
   CPU work after the emit, no allocations, one draw call per blend mode. Sparks (slot 2) stretch along their screen velocity.
   glow()/dark() are one-frame sprites (nav lights, strobes, hole embers) kept on a tiny CPU batch.
   API (same as makeFX): emit(p, v, life, s0, s1, c0, c1, a, additive, slot 0 puff|1 glow|2 spark, drag, rise), glow(p, size, rgb, a),
   dark(p, size, a), boom(p, k, wind), update(dt), clear(), meshes, stats() */
export function makeGPUFX(THREE, scene, O = {}) {
  const MAX = O.max || 4096, TRANS = O.transient || 1200;
  // atlas: 0 lumpy smoke puff · 1 soft round glow · 2 spark streak (thin bright core)
  const c = document.createElement("canvas"); c.width = 384; c.height = 128; const x = c.getContext("2d");
  let s = 3; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < 26; i++) { const cx = 64 + (r() - .5) * 60, cy = 64 + (r() - .5) * 60, rr = 14 + r() * 28, gr = x.createRadialGradient(cx, cy, 0, cx, cy, rr); gr.addColorStop(0, "rgba(255,255,255,.5)"); gr.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = gr; x.beginPath(); x.arc(cx, cy, rr, 0, Math.PI * 2); x.fill(); }
  x.globalCompositeOperation = "destination-in"; let gr = x.createRadialGradient(64, 64, 18, 64, 64, 63); gr.addColorStop(0, "#fff"); gr.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); x.globalCompositeOperation = "source-over";
  gr = x.createRadialGradient(192, 64, 0, 192, 64, 63); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(.3, "rgba(255,255,255,.55)"); gr.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = gr; x.fillRect(128, 0, 128, 128);
  gr = x.createLinearGradient(256, 0, 384, 0); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(.42, "rgba(255,255,255,.5)"); gr.addColorStop(.5, "#fff"); gr.addColorStop(.58, "rgba(255,255,255,.5)"); gr.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = gr; x.fillRect(256, 8, 128, 112);
  const tex = new THREE.CanvasTexture(c);
  const UT = { value: 0 };
  const VS = `#include <common>
    #include <fog_pars_vertex>
    uniform float uT; attribute vec4 aP; attribute vec4 aV; attribute vec4 aS; attribute vec4 aC0; attribute vec4 aC1; attribute float aSlot;
    varying vec2 vUv; varying vec4 vC; varying float vSlot;
    float hash(float n){ return fract(sin(n) * 43758.5453); }
    void main(){
      float age = uT - aP.w, life = aV.w; if (age < 0.0 || age >= life || life <= 0.0) { gl_Position = vec4(0., 0., -2., 1.); return; }
      float u = age / life, k = aS.z, rise = aS.w, e = exp(-k * age), f = k > 1e-4 ? (1.0 - e) / k : age;
      vec3 p = aP.xyz + aV.xyz * f; p.y += k > 1e-4 ? rise * (age - f) / k : 0.5 * rise * age * age;
      vec3 vel = aV.xyz * e + vec3(0., k > 1e-4 ? rise * (1.0 - e) / k : rise * age, 0.);
      float size = mix(aS.x, aS.y, u), fade = min(1.0, u * 8.0) * (1.0 - u) * (1.0 - u) * 1.3;
      vC = vec4(mix(aC0.rgb, aC1.rgb, u), aC0.a * fade); vSlot = aSlot;
      vec3 R = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), U = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
      vec2 q = position.xy * size;
      if (aSlot > 1.5) { vec3 vv = (viewMatrix * vec4(vel, 0.)).xyz; vec2 d = normalize(vv.xy + vec2(1e-5)); float len = size * 1.0 + length(vel) * 0.045;
        vec2 ax = d * position.y * len * 2.0 + vec2(-d.y, d.x) * position.x * size * .35; vec4 mv = viewMatrix * vec4(p, 1.); mv.xy += ax; vec4 mvPosition = mv; gl_Position = projectionMatrix * mv;
        vUv = vec2((uv.y + 2.0) / 3.0, uv.x);
        #include <fog_vertex>
        return; }
      float a = (hash(float(gl_InstanceID) + aP.w) + (hash(aP.w * 7.0 + float(gl_InstanceID)) - .5) * .25 * age) * 6.2831;
      q = vec2(q.x * cos(a) - q.y * sin(a), q.x * sin(a) + q.y * cos(a));
      vec4 mvPosition = viewMatrix * vec4(p + R * q.x + U * q.y, 1.0); gl_Position = projectionMatrix * mvPosition; vUv = vec2((uv.x + aSlot) / 3.0, uv.y);
      #include <fog_vertex>
    }`;
  const FS = (add) => `#include <common>
    #include <fog_pars_fragment>
    uniform sampler2D map; varying vec2 vUv; varying vec4 vC; varying float vSlot;
    void main(){ vec4 t = texture2D(map, vUv); gl_FragColor = vec4(t.rgb * vC.rgb, t.a * vC.a); if (gl_FragColor.a < .004) discard;
      #ifdef USE_FOG
        float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
        ${add ? "gl_FragColor.a *= 1.0 - fogFactor;" : "gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor);"}
      #endif
    }`;
  const mk = (blending, order) => { const base = new THREE.PlaneGeometry(1, 1), g = new THREE.InstancedBufferGeometry(); g.index = base.index; g.setAttribute("position", base.getAttribute("position")); g.setAttribute("uv", base.getAttribute("uv"));
    const A = {}; [["aP", 4], ["aV", 4], ["aS", 4], ["aC0", 4], ["aC1", 4], ["aSlot", 1]].forEach(([k, n]) => { A[k] = new THREE.InstancedBufferAttribute(new Float32Array(MAX * n), n); A[k].setUsage(THREE.DynamicDrawUsage); g.setAttribute(k, A[k]); });
    g.instanceCount = MAX;
    const m = new THREE.ShaderMaterial({ uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { map: { value: tex } }]), vertexShader: VS, fragmentShader: FS(blending === THREE.AdditiveBlending), transparent: true, depthWrite: false, blending, fog: !!scene.fog });
    m.uniforms.uT = UT; m.uniforms.map.value = tex;
    const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = order; scene.add(mesh);
    return { g, A, mesh, head: 0, d0: -1, d1: -1, wrap: false }; };
  const SM = mk(THREE.NormalBlending, 130), AD = mk(THREE.AdditiveBlending, 140);
  let T = 1, emitted = 0;
  function emit(p, v, life, s0, s1, c0, c1, a, add, slot, drag, rise) {
    const B = add ? AD : SM, i = B.head; B.head = (B.head + 1) % MAX; if (B.head === 0) B.wrap = true; emitted++;
    if (B.d0 < 0) B.d0 = i; B.d1 = i;
    const A = B.A; c1 = c1 || c0;
    A.aP.array.set([p.x, p.y, p.z, T], i * 4); A.aV.array.set([v.x, v.y, v.z, life], i * 4); A.aS.array.set([s0, s1, drag || 0, rise || 0], i * 4);
    A.aC0.array.set([c0[0], c0[1], c0[2], a], i * 4); A.aC1.array.set([c1[0], c1[1], c1[2], 0], i * 4); A.aSlot.array[i] = slot || 0; }
  function flush(B) { if (B.d0 < 0) return; const A = B.A;
    for (const k in A) { const a = A[k], n = a.itemSize;
      if (B.d1 >= B.d0) a.addUpdateRange(B.d0 * n, (B.d1 - B.d0 + 1) * n); else { a.addUpdateRange(B.d0 * n, (MAX - B.d0) * n); a.addUpdateRange(0, (B.d1 + 1) * n); } a.needsUpdate = true; }
    B.d0 = B.d1 = -1; }
  // one-frame sprites (lights, strobes, hole embers) — CPU batch, a few hundred at most
  const tg = new THREE.InstancedBufferGeometry(), tb = new THREE.PlaneGeometry(1, 1); tg.index = tb.index; tg.setAttribute("position", tb.getAttribute("position")); tg.setAttribute("uv", tb.getAttribute("uv"));
  const TP = new THREE.InstancedBufferAttribute(new Float32Array(TRANS * 4), 4), TC = new THREE.InstancedBufferAttribute(new Float32Array(TRANS * 4), 4); TP.setUsage(THREE.DynamicDrawUsage); TC.setUsage(THREE.DynamicDrawUsage); tg.setAttribute("tP", TP); tg.setAttribute("tC", TC);
  const tVS = `#include <common>
    #include <fog_pars_vertex>
    attribute vec4 tP; attribute vec4 tC; varying vec2 vUv; varying vec4 vC;
    void main(){ vec3 R = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), U = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
      vec4 mvPosition = viewMatrix * vec4(tP.xyz + (R * position.x + U * position.y) * tP.w, 1.0); gl_Position = projectionMatrix * mvPosition;
      vUv = vec2((uv.x + 1.0) / 3.0, uv.y); vC = tC;
      #include <fog_vertex>
    }`;
  const mkT = (blending, order, dark) => { const g = tg.clone(); const P2 = new THREE.InstancedBufferAttribute(new Float32Array(TRANS * 4), 4), C2 = new THREE.InstancedBufferAttribute(new Float32Array(TRANS * 4), 4); P2.setUsage(THREE.DynamicDrawUsage); C2.setUsage(THREE.DynamicDrawUsage); g.setAttribute("tP", P2); g.setAttribute("tC", C2); g.instanceCount = 0;
    const m = new THREE.ShaderMaterial({ uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { map: { value: null } }]), vertexShader: tVS,
      fragmentShader: `#include <common>
        #include <fog_pars_fragment>
        uniform sampler2D map; varying vec2 vUv; varying vec4 vC; void main(){ vec4 t = texture2D(map, vUv); gl_FragColor = vec4(${dark ? "vC.rgb" : "t.rgb * vC.rgb"}, t.a * vC.a); if (gl_FragColor.a < .004) discard;
        #ifdef USE_FOG
          float fogFactor = smoothstep(fogNear, fogFar, vFogDepth); gl_FragColor.a *= 1.0 - fogFactor;
        #endif
        }`, transparent: true, depthWrite: false, blending, fog: !!scene.fog });
    m.uniforms.map.value = tex; const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = order; scene.add(mesh); return { g, P: P2, C: C2, mesh, n: 0 }; };
  const GL = mkT(THREE.AdditiveBlending, 141, false), DK = mkT(THREE.NormalBlending, 131, true);
  const putT = (B, x, y, z, size, r, g, b, a) => { if (B.n >= TRANS) return; const i = B.n++; B.P.array.set([x, y, z, size], i * 4); B.C.array.set([r, g, b, a], i * 4); };
  function glow(p, size, col, a) { putT(GL, p.x, p.y, p.z, size, col[0], col[1], col[2], a); }
  function dark(p, size, a) { putT(DK, p.x, p.y, p.z, size, .07, .05, .045, a); }
  function update(dt) { T += Math.min(.05, dt); UT.value = T; flush(SM); flush(AD);
    for (const B of [GL, DK]) { B.g.instanceCount = B.n; B.P.needsUpdate = B.C.needsUpdate = true; B.P.clearUpdateRanges && (B.P.clearUpdateRanges(), B.C.clearUpdateRanges(), B.P.addUpdateRange(0, B.n * 4), B.C.addUpdateRange(0, B.n * 4)); B.n = 0; } }
  function clear() { for (const B of [SM, AD]) { B.A.aV.array.fill(0); B.A.aV.needsUpdate = true; B.A.aV.clearUpdateRanges && B.A.aV.clearUpdateRanges(); } GL.n = DK.n = 0; }
  const V = new THREE.Vector3(), P2 = new THREE.Vector3();
  function boom(p, k, wind) { const w = wind || V.set(0, 0, 0), wx = w.x, wy = w.y, wz = w.z;
    glow(p, 120 * k, [1, .9, .7], 1);
    emit(p, V.set(wx, wy, wz), .35, 30 * k, 110 * k, [1, .95, .8], [1, .6, .2], 1, true, 1);
    for (let i = 0; i < 18; i++) { const a = Math.random() * 6.283, e = (Math.random() - .3) * 1.4, sp = (8 + Math.random() * 26) * k;
      emit(P2.copy(p).add(V.set(Math.cos(a) * 3 * k, Math.random() * 3 * k, Math.sin(a) * 3 * k)), V.set(wx + Math.cos(a) * sp, wy + e * sp, wz + Math.sin(a) * sp), .7 + Math.random() * .6, 14 * k, 40 * k, [1, .78, .35], [.9, .25, .05], 1, true, 0, 2.2, 6 * k);
      emit(P2, V.set(wx + Math.cos(a) * sp * .6, wy + e * sp * .5, wz + Math.sin(a) * sp * .6), 2.2 + Math.random() * 1.6, 12 * k, 46 * k, [.32, .29, .28], [.12, .11, .11], .6, false, 0, 1.3, 9 * k); }
    for (let i = 0; i < 26; i++) { const a = Math.random() * 6.283, sp = (30 + Math.random() * 60) * k; emit(p, V.set(wx + Math.cos(a) * sp, wy + (Math.random() * 1.4 - .2) * sp, wz + Math.sin(a) * sp), .6 + Math.random() * .8, 2.4 * k, .8 * k, [1, .85, .4], [1, .35, .1], 1, true, 2, .8, -40 * k); } }
  // a shower of sparks from a bullet strike at p along normal n (world), in the airflow w
  function sparks(p, n, w, k = 1, count = 14) { for (let i = 0; i < count; i++) { const sp = (30 + Math.random() * 70) * k;
      V.set(n.x + (Math.random() - .5) * 1.4, n.y + (Math.random() - .5) * 1.4, n.z + (Math.random() - .5) * 1.4).normalize().multiplyScalar(sp); if (w) V.add(w);
      emit(p, V, .18 + Math.random() * .35, (.5 + Math.random() * .6) * k, .15 * k, [1, .92, .6], [1, .45, .12], 1, true, 2, 1.5, -60 * k); }
    glow(p, 9 * k, [1, .8, .5], 1); }
  return { emit, glow, dark, update, clear, boom, sparks, meshes: [SM.mesh, AD.mesh, GL.mesh, DK.mesh], stats: () => ({ emitted, max: MAX }), gpu: true };
}
