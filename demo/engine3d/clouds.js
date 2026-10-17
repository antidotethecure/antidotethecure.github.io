/* engine3d/clouds.js — raymarched volumetric clouds (real 3D, never sprites), rendered at low resolution and upsampled.
   - A tileable Perlin-Worley 3D noise volume is generated once ON THE GPU (64³, ~1 ms).
   - One low-res pass marches every pixel's view ray through the cloud layer (+ up to 8 "puffs": cloud banks at flight level that
     you can fly into). Each sample is lit by a short march toward the sun (Beer-Lambert + powder), a two-lobe phase function and
     a sky ambient; the result fades into the horizon haze with distance. Two outputs (MRT):
       full  = sky + clouds behind everything (used where the screen shows sky, and as scene.background on LOW)
       front = the part of the clouds that lies IN FRONT of the scene geometry (from the depth buffer), + its transmittance
   - composite(): scene·T + front, sky pixels = full, plus cloud SHADOWS on the ground (density looked up along the sun ray from
     each pixel's world position), WET surfaces in rain (darker + sky sheen on upward-facing pixels) and the in-cloud MIST.
     const cl = makeClouds(THREE, { renderer, sky, quality: { scale, steps, light } })
     cl.render(camera, depthTexture|null, t, dt, params)   params: { cover, density, base, top, wind: Vector3, puffs: [[x,y,z,r]...], sunCol, sunI, fogCol, fogFar, wet }
     cl.full / cl.front (textures) · cl.compositeShader (for postfx.js) · cl.mist (0..1, how deep the camera is inside a cloud) */
import { SKY_GLSL } from "./sky.js?v=e3h";

const NOISE_GLSL = `
  vec3 hash33(vec3 p){ p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6))); return -1.0 + 2.0 * fract(sin(p) * 43758.5453123); }
  float perlinT(vec3 p, float per){ vec3 i = floor(p), f = fract(p), u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
    #define G(o) dot(hash33(mod(i + o, per)), f - o)
    return mix(mix(mix(G(vec3(0,0,0)), G(vec3(1,0,0)), u.x), mix(G(vec3(0,1,0)), G(vec3(1,1,0)), u.x), u.y), mix(mix(G(vec3(0,0,1)), G(vec3(1,0,1)), u.x), mix(G(vec3(0,1,1)), G(vec3(1,1,1)), u.x), u.y), u.z); }
  float worleyT(vec3 p, float per){ vec3 id = floor(p), fd = fract(p); float m = 1.0;
    for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) { vec3 o = vec3(x, y, z); vec3 r = o + .5 + .5 * hash33(mod(id + o, per)) - fd; m = min(m, dot(r, r)); }
    return 1.0 - sqrt(m); }
  float pfbm(vec3 p, float per){ return perlinT(p, per) * .5 + perlinT(p * 2., per * 2.) * .25 + perlinT(p * 4., per * 4.) * .125; }
  float wfbm(vec3 p, float per){ return worleyT(p, per) * .625 + worleyT(p * 2., per * 2.) * .25 + worleyT(p * 4., per * 4.) * .125; }`;

export function makeClouds(THREE, O) {
  const renderer = O.renderer, sky = O.sky, Q = Object.assign({ scale: .3, steps: 32, light: 5 }, O.quality || {});
  const N = 64, noiseRT = new THREE.WebGL3DRenderTarget(N, N, N, { type: THREE.UnsignedByteType, format: THREE.RGBAFormat });
  noiseRT.texture.wrapS = noiseRT.texture.wrapT = noiseRT.texture.wrapR = THREE.RepeatWrapping; noiseRT.texture.minFilter = noiseRT.texture.magFilter = THREE.LinearFilter; noiseRT.texture.generateMipmaps = false;
  { const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), sc = new THREE.Scene();
    const m = new THREE.ShaderMaterial({ uniforms: { uZ: { value: 0 } }, vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }",
      fragmentShader: NOISE_GLSL + `uniform float uZ; varying vec2 vUv; void main(){ vec3 p = vec3(vUv, uZ);
        float pw = pfbm(p * 4.0, 4.0) * .5 + .5; float w1 = wfbm(p * 4.0, 4.0), w2 = wfbm(p * 8.0, 8.0), w3 = wfbm(p * 16.0, 16.0);
        float pwor = clamp(pw - (1.0 - w1) * .55, 0.0, 1.0) * 1.35;   // Perlin-Worley: billowy cumulus shapes
        gl_FragColor = vec4(clamp(pwor, 0., 1.), w1, w2, w3); }` });
    sc.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m)); const prev = renderer.getRenderTarget();
    for (let z = 0; z < N; z++) { m.uniforms.uZ.value = (z + .5) / N; renderer.setRenderTarget(noiseRT, z); renderer.render(sc, cam); }
    renderer.setRenderTarget(prev); m.dispose(); }

  const U = Object.assign({}, sky.uniforms, {
    uNoise: { value: noiseRT.texture }, uDepth: { value: null }, uHasDepth: { value: 0 }, uInvProj: { value: new THREE.Matrix4() }, uCamW: { value: new THREE.Matrix4() }, uCamPos: { value: new THREE.Vector3() },
    uNear: { value: 1 }, uFar: { value: 3000 }, uBase: { value: 230 }, uTop: { value: 820 }, uCover: { value: .35 }, uDens: { value: 1 }, uOff: { value: new THREE.Vector3() }, uT: { value: 0 },
    uPuffs: { value: Array.from({ length: 8 }, () => new THREE.Vector4(0, -1e5, 0, 1)) }, uNP: { value: 0 }, uSteps: { value: Q.steps }, uLSteps: { value: Q.light },
    uSunCol: { value: new THREE.Color(1, .9, .8) }, uSunI: { value: 1 }, uAmbTop: { value: new THREE.Color(.5, .6, .8) }, uAmbBot: { value: new THREE.Color(.3, .3, .35) }, uFogCol: { value: new THREE.Color(.8, .6, .5) }, uFogFar: { value: 3000 },
    uDark: { value: 0 }, uSkip: { value: 0 }, uJit: { value: Q.jitter != null ? Q.jitter : 1 }, uRes: { value: new THREE.Vector2(1, 1) }, uDepthRes: { value: new THREE.Vector2(1, 1) }, uFlash: { value: 0 } });
  const FRAG = SKY_GLSL + `
    precision highp sampler3D;
    uniform sampler3D uNoise; uniform sampler2D uDepth; uniform float uHasDepth; uniform mat4 uInvProj; uniform mat4 uCamW; uniform vec3 uCamPos; uniform float uNear; uniform float uFar;
    uniform float uBase; uniform float uTop; uniform float uCover; uniform float uDens; uniform vec3 uOff; uniform float uT; uniform vec4 uPuffs[8]; uniform int uNP; uniform float uSteps; uniform float uLSteps;
    uniform vec3 uSunCol; uniform float uSunI; uniform vec3 uAmbTop; uniform vec3 uAmbBot; uniform vec3 uFogCol; uniform float uFogFar; uniform float uDark; uniform vec2 uRes; uniform vec2 uDepthRes; uniform float uFlash; uniform float uJit; uniform float uSkip;
    in vec2 vUv; layout(location = 0) out vec4 oFull; layout(location = 1) out vec4 oFront;
    float remap(float v, float a, float b, float c, float d){ return c + (v - a) * (d - c) / max(b - a, 1e-4); }
    float density(vec3 p, bool fine){
      vec3 q = p + uOff; float d = 0.0, h = (p.y - uBase) / (uTop - uBase);
      if (h > 0.0 && h < 1.0) {
        vec4 n = texture(uNoise, q * 0.0008);
        float cov = texture(uNoise, vec3(q.xz * 0.00013, .37)).r;
        float prof = smoothstep(0.0, .1, h) * smoothstep(1.0, .45, h) * (1.0 - .35 * h);
        float shape = smoothstep(.12, .78, n.r * .62 + n.g * .38);
        float c = clamp(uCover + (cov - .34) * .9, 0.0, 1.0);
        d = remap(shape * prof, 1.0 - c, 1.0, 0.0, 1.0) * 1.6;
        if (fine && d > 0.0) { vec4 dn = texture(uNoise, q * .0045 + vec3(0.0, uT * .004, 0.0)); float det = dn.a * .6 + dn.b * .4; d = remap(d, det * .45 * (1.0 - h * .4), 1.0, 0.0, 1.0); } }
      for (int i = 0; i < 8; i++) { if (i >= uNP) break; vec4 P = uPuffs[i]; vec3 o = (p - P.xyz) / vec3(P.w * 1.6, P.w * .7, P.w);
        float r = length(o); if (r < 1.0) { float n2 = texture(uNoise, (p + uOff * .2) * .004).g; float pd = smoothstep(1.0, .25, r + (1.0 - n2) * .45); d = max(d, pd * 1.1); } }
      return max(d, 0.0) * uDens; }
    float lightMarch(vec3 p){ float od = 0.0, st = (uTop - uBase) * .09; for (int i = 0; i < 8; i++) { if (float(i) >= uLSteps) break; p += uSunDir * st; od += density(p, false) * st; st *= 1.35; } return od; }
    float hg(float c, float g){ float g2 = g * g; return (1.0 - g2) / (4.0 * PI_S * pow(1.0 + g2 - 2.0 * g * c, 1.5)); }
    float sceneDist(vec2 uv, vec3 dirV){ if (uHasDepth < .5) return 1e9;
      // the NEAREST depth under this low-res pixel (so clouds never bleed onto silhouettes)
      vec2 px = uv * uDepthRes, s = uDepthRes / uRes; float dmin = 1.0;
      for (int x = 0; x < 2; x++) for (int y = 0; y < 2; y++) dmin = min(dmin, texelFetch(uDepth, ivec2(px + (vec2(x, y) - .5) * s * .5), 0).x);
      if (dmin >= .99999) return 1e9; vec4 v = uInvProj * vec4(uv * 2.0 - 1.0, dmin * 2.0 - 1.0, 1.0); v /= v.w; return length(v.xyz); }
    void main(){
      if (uSkip > .5) { oFull = vec4(0.0, 0.0, 0.0, 1.0); oFront = vec4(0.0, 0.0, 0.0, 1.0); return; }   // shadows-only mode (top-down games)
      vec4 vd = uInvProj * vec4(vUv * 2.0 - 1.0, 1.0, 1.0); vd /= vd.w; vec3 dv = normalize(vd.xyz), dir = normalize((uCamW * vec4(dv, 0.0)).xyz);
      vec3 skyc = skyColor(dir, true) * (1.0 - uDark * .6) + uFlash * vec3(.6, .65, .8);
      // slab of the cloud layer (+ the puffs, which may sit below it)
      float lo = uBase, hi = uTop; for (int i = 0; i < 8; i++) { if (i >= uNP) break; lo = min(lo, uPuffs[i].y - uPuffs[i].w); hi = max(hi, uPuffs[i].y + uPuffs[i].w); }
      float t0, t1; if (abs(dir.y) < 1e-4) { t0 = (uCamPos.y > lo && uCamPos.y < hi) ? 0.0 : 1e9; t1 = 9000.0; }
      else { float a = (lo - uCamPos.y) / dir.y, b = (hi - uCamPos.y) / dir.y; t0 = max(0.0, min(a, b)); t1 = min(max(a, b), 9000.0); }
      float sd = sceneDist(vUv, dv);
      vec3 col = vec3(0.0), fcol = vec3(0.0); float T = 1.0, fT = 1.0; bool snap = sd < t0;
      if (t1 > t0) {
        float n = uSteps * (1.0 + clamp((t1 - t0) / 4000.0, 0.0, 1.0)), dt = (t1 - t0) / n;
        float j = fract(sin(dot(gl_FragCoord.xy + fract(uT * 7.13) * 91.0, vec2(12.9898, 78.233))) * 43758.5453);
        float t = t0 + dt * mix(.5, j, uJit * .7); float cs = dot(dir, uSunDir), phase = mix(hg(cs, .6), hg(cs, -.25), .3) * 4.0 * PI_S;
        vec3 sunL = uSunCol * uSunI * (1.0 - uDark * .75);
        for (int i = 0; i < 160; i++) { if (float(i) >= n || T < .02) break;
          if (!snap && t > sd) { fcol = col; fT = T; snap = true; }
          vec3 p = uCamPos + dir * t; float d = density(p, true);
          if (d > .003) { float od = lightMarch(p), h = clamp((p.y - uBase) / (uTop - uBase), 0.0, 1.0);
            float beer = exp(-od * .022), powder = 1.0 - exp(-od * .044); vec3 amb = mix(uAmbBot, uAmbTop, h) * (.55 + .45 * h);
            vec3 S = (sunL * beer * mix(1.0, powder * 2.0, .5) * phase * .9 + amb + uFlash * vec3(2.2, 2.3, 2.6)) * d;
            float sig = d * .045, tr = exp(-sig * dt); vec3 Sint = (S - S * tr) / max(sig, 1e-5) * .045;
            float fog = smoothstep(uFogFar * .5, uFogFar * 2.6, t); Sint = mix(Sint, uFogCol * (1.0 - tr), fog);
            col += T * Sint; T *= mix(tr, 1.0, fog * .85); }
          t += dt; }
      }
      if (!snap) { fcol = col; fT = T; }
      oFull = vec4(skyc * T + col, T); oFront = vec4(fcol, fT);
    }`;
  const mat = new THREE.ShaderMaterial({ uniforms: U, glslVersion: THREE.GLSL3, depthTest: false, depthWrite: false,
    vertexShader: "out vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }", fragmentShader: FRAG });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); quad.frustumCulled = false; const qs = new THREE.Scene(); qs.add(quad); const qc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  let rt = null, rtSoft = null; const size = new THREE.Vector2();
  // a small 9-tap blur of the "full" layer, for tiers that show it directly as the background (hides step / jitter noise)
  const blurM = new THREE.ShaderMaterial({ uniforms: { t: { value: null }, px: { value: new THREE.Vector2() } }, depthTest: false, depthWrite: false,
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader: "uniform sampler2D t; uniform vec2 px; varying vec2 vUv; void main(){ vec4 c = texture2D(t, vUv) * .25; c += (texture2D(t, vUv + vec2(px.x, 0.)) + texture2D(t, vUv - vec2(px.x, 0.)) + texture2D(t, vUv + vec2(0., px.y)) + texture2D(t, vUv - vec2(0., px.y))) * .125; c += (texture2D(t, vUv + px) + texture2D(t, vUv - px) + texture2D(t, vUv + vec2(px.x, -px.y)) + texture2D(t, vUv + vec2(-px.x, px.y))) * .0625; gl_FragColor = c; }" });
  const bq = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blurM); bq.frustumCulled = false; const bs = new THREE.Scene(); bs.add(bq);
  function ensure(w, h) { const W = Math.max(32, Math.round(w * Q.scale)), H2 = Math.max(32, Math.round(h * Q.scale)); if (rt && rt.width === W && rt.height === H2) return;
    if (rt) rt.dispose(); rt = new THREE.WebGLMultipleRenderTargets(W, H2, 2, { type: O.rtType || THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
    rt.texture.forEach(t => { t.minFilter = t.magFilter = THREE.LinearFilter; t.generateMipmaps = false; }); U.uRes.value.set(W, H2); }
  const api = { mist: 0, uniforms: U,
    get full() { return rt && rt.texture[0]; }, get fullSoft() { return rtSoft ? rtSoft.texture : rt && rt.texture[0]; }, get front() { return rt && rt.texture[1]; },
    setQuality(q) { Object.assign(Q, q); U.uSteps.value = Q.steps; U.uLSteps.value = Q.light; U.uJit.value = Q.jitter != null ? Q.jitter : 1; if (rt) { const w = rt.width / (api._s || Q.scale); rt.dispose(); rt = null; } },
    render(camera, depthTex, t, dt, P) {
      renderer.getDrawingBufferSize(size); ensure(size.x, size.y); api._s = Q.scale;
      U.uInvProj.value.copy(camera.projectionMatrixInverse); U.uCamW.value.copy(camera.matrixWorld); U.uCamPos.value.setFromMatrixPosition(camera.matrixWorld);
      U.uDepth.value = depthTex; U.uHasDepth.value = depthTex ? 1 : 0; if (depthTex) U.uDepthRes.value.set(depthTex.image.width, depthTex.image.height);
      U.uSkip.value = P.skip ? 1 : 0; U.uT.value = t; if (P.wind) U.uOff.value.addScaledVector(P.wind, dt);
      if (P.cover != null) U.uCover.value = P.cover; if (P.density != null) U.uDens.value = P.density; if (P.base != null) U.uBase.value = P.base; if (P.top != null) U.uTop.value = P.top; if (P.dark != null) U.uDark.value = P.dark;
      if (P.sunCol) U.uSunCol.value.copy(P.sunCol); if (P.sunI != null) U.uSunI.value = P.sunI; if (P.ambTop) U.uAmbTop.value.copy(P.ambTop); if (P.ambBot) U.uAmbBot.value.copy(P.ambBot);
      if (P.fogCol) U.uFogCol.value.copy(P.fogCol); if (P.fogFar) U.uFogFar.value = P.fogFar; U.uFlash.value = P.flash || 0;
      const pf = P.puffs || []; U.uNP.value = Math.min(8, pf.length); for (let i = 0; i < U.uNP.value; i++) U.uPuffs.value[i].set(pf[i][0], pf[i][1], pf[i][2], pf[i][3]);
      // how deep the camera sits in a cloud (for the mist + the sound): a cheap CPU estimate from the puffs + layer
      const cp = U.uCamPos.value; let m = 0; for (let i = 0; i < U.uNP.value; i++) { const p = pf[i], dx = (cp.x - p[0]) / (p[3] * 1.6), dy = (cp.y - p[1]) / (p[3] * .7), dz = (cp.z - p[2]) / p[3]; m = Math.max(m, 1 - Math.sqrt(dx * dx + dy * dy + dz * dz)); }
      if (cp.y > U.uBase.value + 20) m = Math.max(m, Math.min(1, U.uCover.value * 1.3) * Math.min(1, (cp.y - U.uBase.value) / 120));
      api.mist += (Math.max(0, Math.min(1, m * 1.8)) - api.mist) * Math.min(1, dt * 2.5);
      const prev = renderer.getRenderTarget(); renderer.setRenderTarget(rt); renderer.render(qs, qc);
      if (P.soft) { if (!rtSoft || rtSoft.width !== rt.width || rtSoft.height !== rt.height) { if (rtSoft) rtSoft.dispose(); rtSoft = new THREE.WebGLRenderTarget(rt.width, rt.height, { type: O.rtType || THREE.HalfFloatType, depthBuffer: false }); }
        blurM.uniforms.t.value = rt.texture[0]; blurM.uniforms.px.value.set(1.2 / rt.width, 1.2 / rt.height); renderer.setRenderTarget(rtSoft); renderer.render(bs, qc); }
      renderer.setRenderTarget(prev); },
  };
  // full-screen composite (used by postfx.js): scene × cloud transmittance + clouds in front, sky = full, + shadows, wet, mist
  api.compositeShader = {
    uniforms: { tDiffuse: { value: null }, tDepth: { value: null }, tFull: { value: null }, tFront: { value: null }, uInvProj: U.uInvProj, uCamW: U.uCamW, uCamPos: U.uCamPos, uSunDir: sky.uniforms.uSunDir,
      uNoise: U.uNoise, uOff: U.uOff, uCover: U.uCover, uBase: U.uBase, uTop: U.uTop, uShadow: { value: .55 }, uWet: { value: 0 }, uMist: { value: 0 }, uMistCol: { value: new THREE.Color(.8, .82, .86) }, uSkyRef: { value: new THREE.Color(.5, .6, .7) }, uSunVis: { value: 1 }, uFogStart: { value: 600 }, uFogDen: { value: .0006 }, uCRes: U.uRes, uKeepBg: { value: 0 }, uShadowK: { value: 1 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `precision highp sampler3D;
      uniform sampler2D tDiffuse; uniform sampler2D tDepth; uniform sampler2D tFull; uniform sampler2D tFront; uniform mat4 uInvProj; uniform mat4 uCamW; uniform vec3 uCamPos; uniform vec3 uSunDir;
      uniform sampler3D uNoise; uniform vec3 uOff; uniform float uCover; uniform float uBase; uniform float uTop; uniform float uShadow; uniform float uWet; uniform float uMist; uniform vec3 uMistCol; uniform vec3 uSkyRef; uniform float uSunVis; uniform float uFogStart; uniform float uFogDen; uniform float uKeepBg; uniform float uShadowK; varying vec2 vUv;
      vec3 wpos(vec2 uv, float d){ vec4 v = uInvProj * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); v /= v.w; return (uCamW * vec4(v.xyz, 1.0)).xyz; }
      uniform vec2 uCRes;
      vec4 soft(sampler2D t, vec2 uv){ vec2 o = 1.0 / uCRes; return (texture2D(t, uv + vec2(-.6, -.6) * o) + texture2D(t, uv + vec2(.6, -.6) * o) + texture2D(t, uv + vec2(-.6, .6) * o) + texture2D(t, uv + vec2(.6, .6) * o)) * .25; }
      void main(){ vec4 sc = texture2D(tDiffuse, vUv); float d = texture2D(tDepth, vUv).x; vec4 F = soft(tFull, vUv), Fr = soft(tFront, vUv); vec3 col;
        if (d >= .99999) col = uKeepBg > .5 ? sc.rgb : F.rgb * (1.0 - clamp(sc.a, 0.0, 1.0)) + sc.rgb;   // sky: clouds + whatever transparent effects (smoke, fire, rain) were drawn over it
        else { vec3 c = sc.rgb, P = wpos(vUv, d);
          // cloud shadow: the coverage straight up the sun ray from this point, at mid-cloud height
          float k = ((uBase + uTop) * .5 - P.y) / max(uSunDir.y, .12); vec3 q = P + uSunDir * k + uOff;
          vec4 n = texture(uNoise, q * 0.0008 * uShadowK); float cov = texture(uNoise, vec3(q.xz * 0.00013 * uShadowK, .37)).r, c2 = clamp(uCover + (cov - .34) * .9, 0.0, 1.0);
          float dens = smoothstep(1.0 - c2, 1.0, smoothstep(.12, .78, n.r * .62 + n.g * .38)) * step(0.02, uSunDir.y);
          c *= 1.0 - uShadow * clamp(dens * 2.2, 0.0, 1.0) * uSunVis;
          // wet: up-facing surfaces darken and pick up a sheen of the sky
          if (uWet > 0.0) { vec3 N = normalize(cross(dFdx(P), dFdy(P))); if (N.y < 0.0) N = -N; float up = smoothstep(.75, .95, N.y); vec3 V = normalize(uCamPos - P); float fr = pow(1.0 - max(dot(N, V), 0.0), 4.0);
            float puddle = smoothstep(.45, .75, texture(uNoise, vec3(P.xz * .004, .71)).g);
            c = mix(c, c * .62 + uSkyRef * fr * (.35 + .65 * puddle), uWet * up); }
          // aerial perspective: distance haze toward the REAL sky colour behind (no seam at the horizon)
          float dist = length(P - uCamPos), fh = exp(-max(P.y, 0.0) * .0025); c = mix(c, F.rgb, clamp((1.0 - exp(-max(dist - uFogStart, 0.0) * uFogDen)) * (.55 + .45 * fh), 0.0, 1.0));
          col = c * Fr.a + Fr.rgb; }
        col = mix(col, uMistCol, uMist);
        gl_FragColor = vec4(col, sc.a); }`,
  };
  api.dispose = () => { noiseRT.dispose(); rt && rt.dispose(); mat.dispose(); };
  return api;
}
