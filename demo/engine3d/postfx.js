/* engine3d/postfx.js — the frame pipeline: scene (HDR, with depth) → volumetric clouds + cloud shadows + wet + mist (clouds.js)
   → SSAO (GTAO, ultra) → bloom → ACES tone mapping + sRGB → colour grade (lift/gamma/gain, saturation, warm-cool split, vignette,
   fine grain) → SMAA or FXAA. LOW tier skips the composer: one direct render, clouds drawn as the scene background.
     const post = await makePost(THREE, { renderer, scene, camera, clouds, quality: tier.post, width, height, pixelRatio, addons })
     post.render(dt, t, { cloud params }) · post.setQuality(tier.post) · post.setSize(w, h, pr) · post.grade (uniforms)
   addons(path) must import a three.js example module (so the page decides which three build it comes from). */
export async function makePost(THREE, O) {
  const { renderer, scene, camera, clouds } = O, imp = O.addons || ((p) => import("three/addons/" + p));
  const [{ EffectComposer }, { RenderPass }, { ShaderPass }, { UnrealBloomPass }, { OutputPass }, { SMAAPass }, { FXAAShader }, { Pass, FullScreenQuad }] = await Promise.all([
    imp("postprocessing/EffectComposer.js"), imp("postprocessing/RenderPass.js"), imp("postprocessing/ShaderPass.js"), imp("postprocessing/UnrealBloomPass.js"),
    imp("postprocessing/OutputPass.js"), imp("postprocessing/SMAAPass.js"), imp("shaders/FXAAShader.js"), imp("postprocessing/Pass.js")]);
  let GTAOPass = null; try { ({ GTAOPass } = await imp("postprocessing/GTAOPass.js")); } catch (e) {}
  let Q = Object.assign({ on: true, bloom: true, ssao: false, aa: "fxaa", grade: true }, O.quality || {}), W = O.width, H = O.height, PR = O.pixelRatio || 1;
  const mkRT = () => { const rt = new THREE.WebGLRenderTarget(W * PR, H * PR, { type: O.rtType || THREE.HalfFloatType }); rt.depthTexture = new THREE.DepthTexture(W * PR, H * PR); rt.depthTexture.type = THREE.UnsignedIntType; return rt; };
  // the cloud composite as a Pass: it needs the depth of the scene the RenderPass just drew
  class CloudPass extends Pass {
    constructor() { super(); this.fsq = new FullScreenQuad(new THREE.ShaderMaterial(clouds.compositeShader)); this.needsSwap = true; this.P = {}; this.t = 0; this.dt = 0; }
    render(r, write) { // the scene itself, into our own HDR target with a depth texture, then the cloud composite into the chain
      if (!sceneRT || sceneRT.width !== W * PR || sceneRT.height !== H * PR) { if (sceneRT) sceneRT.dispose(); sceneRT = mkRT(); }
      const ca = r.getClearAlpha(); r.getClearColor(CC); r.setClearColor(0x000000, 0); r.setRenderTarget(sceneRT); r.clear(); r.render(scene, camera); r.setClearColor(CC, ca);   // alpha 0 where nothing was drawn, so particles over the sky survive the composite
      const depth = sceneRT.depthTexture; clouds.render(camera, depth, this.t, this.dt, this.P);
      const u = this.fsq.material.uniforms; u.tDiffuse.value = sceneRT.texture; u.tDepth.value = depth; u.tFull.value = clouds.full; u.tFront.value = clouds.front; u.uMist.value = Math.min(.86, clouds.mist * (this.P.mistK != null ? this.P.mistK : 1));
      if (this.P.mistCol) u.uMistCol.value.copy(this.P.mistCol); u.uWet.value = this.P.wet || 0; if (this.P.skyRef) u.uSkyRef.value.copy(this.P.skyRef); u.uSunVis.value = this.P.sunVis != null ? this.P.sunVis : 1; if (this.P.fogStart != null) u.uFogStart.value = this.P.fogStart; u.uKeepBg.value = this.P.keepBg ? 1 : 0; u.uShadowK.value = this.P.shadowK || 1; if (this.P.shadow != null) u.uShadow.value = this.P.shadow; if (this.P.fogDen != null) u.uFogDen.value = this.P.fogDen;
      r.setRenderTarget(this.renderToScreen ? null : write); this.fsq.render(r); } }
  const GRADE = { uniforms: { tDiffuse: { value: null }, uLift: { value: new THREE.Vector3(.01, .008, .02) }, uGamma: { value: new THREE.Vector3(1, 1, 1) }, uGain: { value: new THREE.Vector3(1.02, 1, .98) },
      uSat: { value: 1.08 }, uContrast: { value: 1.06 }, uVig: { value: .28 }, uGrain: { value: .025 }, uT: { value: 0 }, uWarm: { value: new THREE.Vector3(1.03, 1, .95) }, uCool: { value: new THREE.Vector3(.95, 1, 1.05) } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform sampler2D tDiffuse; uniform vec3 uLift; uniform vec3 uGamma; uniform vec3 uGain; uniform float uSat; uniform float uContrast; uniform float uVig; uniform float uGrain; uniform float uT; uniform vec3 uWarm; uniform vec3 uCool; varying vec2 vUv;
      void main(){ vec4 c = texture2D(tDiffuse, vUv); vec3 x = c.rgb;
        float l = dot(x, vec3(.2126, .7152, .0722)); x *= mix(uCool, uWarm, smoothstep(.15, .7, l));      // cool shadows, warm highlights
        x = pow(max(x * uGain + uLift * (1.0 - x), 0.0), 1.0 / uGamma); x = (x - .5) * uContrast + .5;
        l = dot(x, vec3(.2126, .7152, .0722)); x = mix(vec3(l), x, uSat);
        vec2 d = vUv - .5; x *= 1.0 - uVig * dot(d, d) * 1.6;
        float n = fract(sin(dot(vUv * 1000.0 + uT, vec2(12.9898, 78.233))) * 43758.5453) - .5; x += n * uGrain;
        gl_FragColor = vec4(clamp(x, 0.0, 1.0), c.a); }` };
  let composer = null, passes = {}, sceneRT = null; const CC = new THREE.Color();
  function build() {
    if (composer) { composer.renderTarget1.dispose(); composer.renderTarget2.dispose(); composer = null; }
    if (!Q.on) return;
    composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W * PR, H * PR, { type: O.rtType || THREE.HalfFloatType, depthBuffer: false })); composer.setPixelRatio(1); composer.setSize(W * PR, H * PR);
    passes.clouds = new CloudPass(); composer.addPass(passes.clouds);
    if (Q.ssao && GTAOPass) { passes.ao = new GTAOPass(scene, camera, W * PR, H * PR); passes.ao.output = GTAOPass.OUTPUT.Default; passes.ao.blendIntensity = .65; try { passes.ao.updateGtaoMaterial({ radius: 2.5, distanceExponent: 1, thickness: 1, scale: 1, distanceFallOff: 1 }); } catch (e) {} composer.addPass(passes.ao); } else passes.ao = null;
    if (Q.bloom) { passes.bloom = new UnrealBloomPass(new THREE.Vector2(W * PR / 2, H * PR / 2), .5, .45, .82); composer.addPass(passes.bloom); } else passes.bloom = null;
    composer.addPass(new OutputPass());
    if (Q.grade) { passes.grade = new ShaderPass(GRADE); composer.addPass(passes.grade); } else passes.grade = null;
    if (Q.aa === "smaa") composer.addPass(new SMAAPass(W * PR, H * PR));
    else if (Q.aa === "fxaa") { const f = new ShaderPass(FXAAShader); f.material.uniforms.resolution.value.set(1 / (W * PR), 1 / (H * PR)); composer.addPass(f); }
  }
  build();
  const api = { get composer() { return composer; }, get on() { return !!composer; }, grade: GRADE.uniforms,
    setQuality(q) { Q = Object.assign({}, Q, q); build(); },
    setSize(w, h, pr) { W = w; H = h; PR = pr || PR; build(); },
    render(dt, t, P) {
      if (composer) { passes.clouds.P = P; passes.clouds.t = t; passes.clouds.dt = dt; GRADE.uniforms.uT.value = t % 10; if (passes.bloom && P.bloom != null) passes.bloom.strength = P.bloom; if (passes.bloom && P.bloomT != null) passes.bloom.threshold = P.bloomT;
        const bg = scene.background; scene.background = null; composer.render(dt); scene.background = bg; return; }
      // LOW: clouds + sky rendered first (no depth) and shown as the background; the in-cloud mist goes into the fog
      P.soft = true; clouds.render(camera, null, t, dt, P); scene.background = clouds.fullSoft; renderer.setRenderTarget(null); renderer.render(scene, camera); },
  };
  return api;
}
