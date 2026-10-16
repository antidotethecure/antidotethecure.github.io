/* engine3d/weather.js — weather states with smooth transitions, GPU rain, lightning.
   States: sunny · partly · overcast · fog · rain (light) · storm (heavy rain + lightning). Every parameter eases toward the target
   state over `blend` seconds, so changes roll in instead of popping. The current values drive the sky (overcast, haze, darkness),
   the clouds (cover, density, base), the fog (visibility), wet surfaces, the rain streaks, wind, lightning and the ambient sound.
     const wx = makeWeather(THREE, { scene, camera, quality: { rain: 5000 }, fx })
     wx.set("storm"[, seconds])   wx.auto(true)   wx.update(dt, t)   wx.v → current values   wx.onThunder(fn(delaySec, strength))
   Rain is one instanced draw: streaks live in a box that travels with the camera and wraps in the vertex shader (no CPU per drop). */
export const WEATHER = {
  sunny:    { cover: .12, density: .8, overcast: 0, dark: 0, haze: .05, vis: 1, rain: 0, wind: .25, wet: 0, lightning: 0, base: 300 },
  partly:   { cover: .42, density: .95, overcast: .08, dark: .02, haze: .15, vis: .95, rain: 0, wind: .4, wet: 0, lightning: 0, base: 270 },
  overcast: { cover: .9, density: 1.1, overcast: .82, dark: .3, haze: .4, vis: .8, rain: 0, wind: .5, wet: 0, lightning: 0, base: 240 },
  fog:      { cover: .55, density: 1, overcast: .55, dark: .15, haze: 1, vis: .28, rain: 0, wind: .1, wet: .25, lightning: 0, base: 180 },
  rain:     { cover: .85, density: 1.15, overcast: .78, dark: .38, haze: .5, vis: .65, rain: .45, wind: .6, wet: .8, lightning: 0, base: 230 },
  storm:    { cover: 1, density: 1.35, overcast: .95, dark: .62, haze: .65, vis: .5, rain: 1, wind: 1, wet: 1, lightning: 1, base: 210 },
};
export const WEATHER_NAMES = Object.keys(WEATHER);

export function makeWeather(THREE, O) {
  const scene = O.scene, Q = Object.assign({ rain: 4000 }, O.quality || {});
  const v = Object.assign({}, WEATHER[O.state || "partly"]); let target = WEATHER[O.state || "partly"], state = O.state || "partly", blend = 10, autoOn = !!O.auto, nextAuto = 60;
  const thunder = []; let flash = 0, boltT = 0;
  /* ---- rain: streaks in a camera-centred box ---- */
  const BOX = O.box || new THREE.Vector3(700, 420, 900), NMAX = 12000;
  const g = new THREE.InstancedBufferGeometry(); const base = new THREE.PlaneGeometry(1, 1).translate(0, .5, 0); g.index = base.index; g.setAttribute("position", base.attributes.position); g.setAttribute("uv", base.attributes.uv);
  const seeds = new Float32Array(NMAX * 4); for (let i = 0; i < NMAX; i++) { seeds[i * 4] = Math.random(); seeds[i * 4 + 1] = Math.random(); seeds[i * 4 + 2] = Math.random(); seeds[i * 4 + 3] = Math.random(); }
  g.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 4)); g.instanceCount = 0;
  const RU = { uT: { value: 0 }, uCam: { value: new THREE.Vector3() }, uBox: { value: BOX }, uWind: { value: new THREE.Vector3() }, uSpeed: { value: 620 }, uLen: { value: 16 }, uAlpha: { value: .35 }, uCol: { value: new THREE.Color(.75, .8, .88) }, uFlash: { value: 0 } };
  const rainMat = new THREE.ShaderMaterial({ uniforms: RU, transparent: true, depthWrite: false, blending: THREE.NormalBlending,
    vertexShader: `uniform float uT; uniform vec3 uCam; uniform vec3 uBox; uniform vec3 uWind; uniform float uSpeed; uniform float uLen; attribute vec4 aSeed; varying float vA; varying vec2 vUv;
      void main(){ vec3 vel = vec3(uWind.x, -uSpeed * (.85 + .3 * aSeed.w), uWind.z);
        vec3 p = aSeed.xyz * uBox + vel * uT; p = mod(p - uCam + uBox * .5, uBox) + uCam - uBox * .5;   // wrap around the camera
        vec3 dir = normalize(vel), side = normalize(cross(dir, normalize(cameraPosition - p)));
        vec3 w = p + side * (position.x * .45) + dir * (position.y * uLen * (.7 + .6 * aSeed.w));
        float dist = length(p - cameraPosition); vA = smoothstep(12.0, 60.0, dist) * (1.0 - smoothstep(uBox.z * .35, uBox.z * .5, dist)); vUv = uv;
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0); }`,
    fragmentShader: `uniform float uAlpha; uniform vec3 uCol; uniform float uFlash; varying float vA; varying vec2 vUv; void main(){ float e = 1.0 - abs(vUv.x - .5) * 2.0; gl_FragColor = vec4(uCol + uFlash, uAlpha * vA * e * smoothstep(0.0, .3, vUv.y)); }` });
  const rain = new THREE.Mesh(g, rainMat); rain.frustumCulled = false; rain.renderOrder = 150; scene.add(rain);
  /* ---- lightning bolt: a jagged branching line strip, additive, lit for a few frames ---- */
  const boltMat = new THREE.LineBasicMaterial({ color: 0xdfe8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const boltGeo = new THREE.BufferGeometry(); boltGeo.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(600 * 3), 3));
  const bolt = new THREE.LineSegments(boltGeo, boltMat); bolt.frustumCulled = false; bolt.renderOrder = 160; scene.add(bolt);
  const glowM = new THREE.MeshBasicMaterial({ color: 0xbfd0ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false });
  const boltGlow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glowM); boltGlow.frustumCulled = false; scene.add(boltGlow);
  function strike(cam) { const pos = boltGeo.attributes.position.array; let n = 0;
    const x0 = cam.position.x + (Math.random() - .5) * 1600, z0 = cam.position.z - 700 - Math.random() * 1500, top = (v.base || 230) + 80;
    const seg = (ax, ay, az, depth, len) => { let x = ax, y = ay, z = az; const steps = depth ? 6 : 14;
      for (let i = 0; i < steps && n < 598; i++) { const nx = x + (Math.random() - .5) * len * .7, ny = y - len * (.6 + Math.random() * .5), nz = z + (Math.random() - .5) * len * .5;
        pos.set([x, y, z, nx, Math.max(0, ny), nz], n * 3); n += 2; if (!depth && Math.random() < .3) seg(nx, ny, nz, 1, len * .7); x = nx; y = ny; z = nz; if (y <= 0) break; } };
    seg(x0, top, z0, 0, top / 9); for (let i = n; i < 600; i++) pos[i * 3 + 1] = -1e5; boltGeo.attributes.position.needsUpdate = true; boltGeo.computeBoundingSphere();
    boltGlow.position.set(x0, top * .5, z0); boltGlow.scale.set(top * .9, top * 1.4, 1); boltGlow.lookAt(cam.position);
    boltT = .32; flash = 1; const dist = Math.hypot(x0 - cam.position.x, z0 - cam.position.z); thunder.forEach(f => f(dist / 1700 * 2.2 + .25, Math.max(.3, 1 - dist / 3500))); }
  const api = { v, get state() { return state; }, flash: 0,
    set(name, secs) { if (!WEATHER[name]) return; state = name; target = WEATHER[name]; blend = secs != null ? secs : 12; },
    auto(on) { autoOn = on; }, onThunder(fn) { thunder.push(fn); },
    setQuality(q) { Object.assign(Q, q); },
    update(dt, t, cam) { const s = Math.min(.1, dt), k = blend <= 0 ? 1 : 1 - Math.exp(-s * 3 / blend);
      for (const key in target) v[key] += (target[key] - v[key]) * k;
      if (autoOn && (nextAuto -= s) < 0) { const order = ["sunny", "partly", "partly", "overcast", "rain", "storm", "rain", "fog", "partly", "sunny"]; api.set(order[(Math.random() * order.length) | 0], 18); nextAuto = 70 + Math.random() * 80; }
      // rain
      const n = Math.round(Q.rain * Math.min(1, v.rain * 1.1)); g.instanceCount = n; rain.visible = n > 20;
      RU.uT.value = t; if (cam) RU.uCam.value.copy(cam.position); RU.uWind.value.set(-60 * v.wind, 0, 120 * v.wind + (O.airflow ? O.airflow() : 0)); RU.uLen.value = 10 + 16 * v.rain; RU.uAlpha.value = .16 + .22 * v.rain;
      // lightning
      if (v.lightning > .5 && cam && Math.random() < s * .22 * v.lightning) strike(cam);
      if (boltT > 0) { boltT -= s; const fl = boltT > .2 ? 1 : boltT > .14 ? .25 : boltT > .08 ? .9 : Math.max(0, boltT / .08) * .4; boltMat.opacity = fl; glowM.opacity = fl * .35; } else { boltMat.opacity = 0; glowM.opacity = 0; }
      flash = Math.max(0, flash - s * 4.5); api.flash = boltT > 0 ? Math.max(flash, boltMat.opacity * .8) : flash; RU.uFlash.value = api.flash * .5; },
    dispose() { scene.remove(rain, bolt, boltGlow); g.dispose(); rainMat.dispose(); boltGeo.dispose(); } };
  return api;
}
