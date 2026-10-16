/* engine3d/sky.js — physical sky + time of day.
   The sky is the Preetham/Shirley analytic daylight model (Rayleigh + Mie scattering; the same maths as three.js's Sky),
   extended for the night: a dark blue night gradient, a twinkling star field and a moon. Time of day (0..24) places the sun,
   and the module derives everything that should follow it: sun light colour + intensity (atmospheric extinction), sky/ground
   ambient, fog colour, exposure, the moon light, and a re-generated PMREM environment map so paint and glass reflect the real sky.
     const sky = makeSky(THREE, { renderer, scene, sun, hemi, latitude })
     sky.setTime(hours) · sky.update(dt, weather) · sky.glsl (the shader functions, shared with clouds.js) · sky.uniforms
     sky.info → { sunDir, elev, night 0..1, horizon (Color), zenith (Color) } */
export const SKY_GLSL = `
  const float PI_S = 3.141592653589793;
  uniform vec3 uSunDir; uniform float uTurbidity; uniform float uRayleigh; uniform float uMieK; uniform float uMieG; uniform float uNight; uniform float uOvercast; uniform vec3 uMoonDir; uniform float uStarT; uniform float uSkyGain;
  const vec3 TOTAL_RAYLEIGH = vec3(5.804542996261093E-6, 1.3562911419845635E-5, 3.0265902468824876E-5);
  const vec3 MIE_CONST = vec3(1.8399918514433978E14, 2.7798023919660528E14, 4.0790479543861094E14);
  float sunIntensityS(float zc){ zc = clamp(zc, -1.0, 1.0); return 1000.0 * max(0.0, 1.0 - pow(2.718281828, -((1.6110731556870734 - acos(zc)) / 1.5))); }
  float hashS(vec3 p){ p = fract(p * 0.3183099 + .1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  vec3 skyColor(vec3 dir, bool disc){
    vec3 up = vec3(0., 1., 0.); vec3 sd = normalize(uSunDir);
    float sunE = sunIntensityS(dot(sd, up)), sunfade = 1.0 - clamp(1.0 - exp(sd.y), 0.0, 1.0);
    float rayleighC = uRayleigh - (1.0 - sunfade);
    vec3 betaR = TOTAL_RAYLEIGH * rayleighC, betaM = 0.434 * (0.2 * uTurbidity) * 10E-18 * MIE_CONST * uMieK;
    float zen = acos(max(0.0, dot(up, dir))), inv = 1.0 / (cos(zen) + 0.15 * pow(93.885 - zen * 180.0 / PI_S, -1.253));
    vec3 Fex = exp(-(betaR * 8.4E3 * inv + betaM * 1.25E3 * inv));
    float ct = dot(dir, sd), rP = 0.05968310365946075 * (1.0 + pow(ct * .5 + .5, 2.0));
    float g2 = uMieG * uMieG, mP = 0.07957747154594767 * ((1.0 - g2) / pow(1.0 - 2.0 * uMieG * ct + g2, 1.5));
    vec3 bT = (betaR * rP + betaM * mP) / (betaR + betaM);
    vec3 Lin = pow(sunE * bT * (1.0 - Fex), vec3(1.5)); Lin *= mix(vec3(1.0), pow(sunE * bT * Fex, vec3(.5)), clamp(pow(1.0 - dot(up, sd), 5.0), 0.0, 1.0));
    vec3 L0 = vec3(0.1) * Fex; if (disc) L0 += sunE * 19000.0 * Fex * smoothstep(0.99995, 0.99997, ct) * (1.0 - uOvercast);
    vec3 c = (Lin + L0) * 0.04 + vec3(0.0, 0.0003, 0.00075);
    c = pow(max(c, 0.0), vec3(1.0 / (1.2 + 1.2 * sunfade))) * uSkyGain;
    { float l = dot(c, vec3(.3, .59, .11)); c = max(mix(vec3(l), c, 1.45), 0.0);   // a touch more saturation (the analytic model is milky near the horizon)
      float dayK = smoothstep(.05, .5, sd.y); c *= mix(vec3(1.0), vec3(.78, .92, 1.22), dayK * smoothstep(-.05, .45, dir.y)); }
    // night: deep blue gradient, stars, moon (fades in as the sun goes down)
    float h = max(dir.y, 0.0);
    vec3 night = mix(vec3(.018, .026, .06), vec3(.003, .006, .02), pow(h, .5));
    if (disc) { vec3 sp = floor(dir * 900.0); float st = hashS(sp); float tw = .6 + .4 * sin(uStarT * (2.0 + st * 5.0) + st * 40.0);
      night += vec3(.85, .9, 1.0) * step(.9935, st) * tw * smoothstep(.0, .25, h) * 1.4 * (1.0 - uOvercast) * smoothstep(.35, .9, uNight);
      float mc = dot(dir, normalize(uMoonDir)); night += vec3(.9, .92, 1.0) * smoothstep(.9994, .99955, mc) * 2.2 * (1.0 - uOvercast) + vec3(.06, .07, .1) * pow(max(mc, 0.0), 60.0) * (1.0 - uOvercast); }
    // twilight: a deep blue-violet overhead while the sun is just below / on the horizon
    float tw = smoothstep(.14, -.02, sd.y) * (1.0 - uNight); c = mix(c, vec3(.05, .06, .17) * (1.0 + .6 * smoothstep(.0, .15, sd.y + .05)), tw * smoothstep(.06, .55, dir.y) * .75);
    c = mix(c, night, uNight);
    // overcast: the sky turns into a flat grey dome, brightest around the sun
    float lum = dot(c, vec3(.3, .59, .11));
    vec3 grey = vec3(lum * .9 + .02) * mix(vec3(.92, .95, 1.0), vec3(1.0), uNight);
    return mix(c, grey, uOvercast * .85);
  }`;

export function makeSky(THREE, O) {
  const { renderer, scene } = O;
  const U = { uSunDir: { value: new THREE.Vector3(0, .1, -1) }, uTurbidity: { value: 6 }, uRayleigh: { value: 2.2 }, uMieK: { value: .005 }, uMieG: { value: .8 },
    uNight: { value: 0 }, uOvercast: { value: 0 }, uMoonDir: { value: new THREE.Vector3(.3, .5, -.8).normalize() }, uStarT: { value: 0 }, uSkyGain: { value: .42 } };
  // a sky dome (used for the environment map, and drawn as background on tiers without the cloud pass)
  const mat = new THREE.ShaderMaterial({ uniforms: U, side: THREE.BackSide, depthWrite: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize((modelMatrix * vec4(position, 1.0)).xyz - cameraPosition); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
    fragmentShader: SKY_GLSL + `varying vec3 vDir; uniform float uDisc; void main(){ vec3 d = normalize(vDir); gl_FragColor = vec4(skyColor(d, uDisc > .5), 1.0); }` });
  mat.uniforms.uDisc = { value: 1 };
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), mat); dome.frustumCulled = false; dome.renderOrder = -10;
  const envScene = new THREE.Scene(), envDome = new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), mat); envScene.add(envDome);
  const pm = new THREE.PMREMGenerator(renderer); let envRT = null, envT = -1e9, envSun = new THREE.Vector3();
  const info = { sunDir: new THREE.Vector3(), elev: 0, night: 0, horizon: new THREE.Color(), zenith: new THREE.Color(), sunCol: new THREE.Color(), sunI: 1, exposure: 1 };
  let hours = O.hours != null ? O.hours : 18.7, az0 = O.azimuth != null ? O.azimuth : -.35;   // the sun sets ahead and to the left (as the old art)
  const C = new THREE.Color(), tmp = new THREE.Vector3();
  // CPU copies of the sky model, for the light colours (cheap approximations of the shader at a few directions)
  const lerpC = (a, b, t) => new THREE.Color().copy(a).lerp(b, t);
  function lighting(weather) {
    const e = info.elev, ov = (weather && weather.overcast) || 0, dark = (weather && weather.dark) || 0;
    // direct sun: extinction through more air near the horizon → orange/red; zero below the horizon
    const el = Math.max(0, e), k = Math.min(1, el / .35);
    info.sunCol.setRGB(1, .45 + .5 * k, .2 + .72 * k);
    info.sunI = Math.max(0, Math.min(1, (e + .02) / .1)) * (1.2 + 2.2 * k) * (1 - ov * .8) * (1 - dark * .5);
    info.night = Math.max(0, Math.min(1, (-e + .02) / .16));
    const day = lerpC(new THREE.Color(0x6f9ad8), new THREE.Color(0xf0a070), Math.max(0, 1 - e / .22) * (1 - info.night));
    info.zenith.copy(lerpC(lerpC(new THREE.Color(0x2c5aa8), new THREE.Color(0x3a3a70), Math.max(0, 1 - e / .25)), new THREE.Color(0x070b1c), info.night));
    info.horizon.copy(lerpC(day, new THREE.Color(0x141a32), info.night)).lerp(new THREE.Color(.55, .57, .6), ov * .75 * (1 - info.night * .7)).multiplyScalar(1 - dark * .55);
    info.exposure = 1 + info.night * .25 - ov * .05;
  }
  function setTime(h) { hours = ((h % 24) + 24) % 24; }
  function sunFrom(h) { // simple solar arc: rises 6:00 east, sets 18:30 west, peaks ~62° at 12:15
    const day = (h - 6) / 12.5, elev = Math.sin(Math.PI * day) * 1.08 - .02, az = az0 + (day - .5) * 2.6;
    return new THREE.Vector3(Math.sin(az) * Math.cos(elev), Math.sin(elev), -Math.cos(az) * Math.cos(elev)).normalize(); }
  function update(dt, weather, t) {
    const sd = sunFrom(hours); info.sunDir.copy(sd); info.elev = Math.asin(sd.y);
    U.uSunDir.value.copy(sd); U.uStarT.value = t || 0;
    const md = sunFrom(hours + 12.4); md.y = Math.abs(md.y) * .8 + .15; U.uMoonDir.value.copy(md.normalize());
    lighting(weather); U.uNight.value = info.night; U.uOvercast.value = weather ? Math.min(1, weather.overcast) : 0;
    U.uTurbidity.value = 1.8 + 6 * (weather ? weather.haze || 0 : 0) + 2.5 * Math.max(0, 1 - info.elev / .3); U.uRayleigh.value = 3.4 + .6 * Math.max(0, 1 - info.elev / .4); U.uMieK.value = .0035 + .004 * (weather ? weather.haze || 0 : 0);
    if (O.sun) { O.sun.color.copy(info.sunCol); O.sun.intensity = info.sunI; const L = info.night > .5 ? U.uMoonDir.value : sd; O.sun.position.copy(O.sunTarget || new THREE.Vector3()).addScaledVector(L, 900); if (info.night > .5) { O.sun.color.setRGB(.55, .65, 1); O.sun.intensity = .35 * (1 - (weather ? weather.overcast : 0) * .8); } }
    if (O.hemi) { O.hemi.color.copy(info.zenith).lerp(new THREE.Color(1, 1, 1), .35).multiplyScalar(info.night > .5 ? .55 : 1); O.hemi.groundColor.copy(info.horizon).multiplyScalar(.45); O.hemi.intensity = Math.max(.12, .22 + 1.1 * (1 - info.night) - (weather ? weather.dark * .4 : 0)); }
    // environment map: re-render the sky into a PMREM when the sun has moved or the weather changed
    const now = performance.now(); if (O.env !== false && (envSun.distanceTo(sd) > .03 || Math.abs((weather ? weather.overcast : 0) - (envSun.ov || 0)) > .08) && now - envT > (O.envEvery || 1500)) {
      envT = now; envSun.copy(sd); envSun.ov = weather ? weather.overcast : 0; mat.uniforms.uDisc.value = 0;
      const rt = pm.fromScene(envScene, 0, .1, 1000); if (envRT) envRT.dispose(); envRT = rt; scene.environment = rt.texture; mat.uniforms.uDisc.value = 1; }
  }
  return { uniforms: U, glsl: SKY_GLSL, dome, info, setTime, get hours() { return hours; }, update, sunFrom, dispose() { pm.dispose(); envRT && envRT.dispose(); } };
}
