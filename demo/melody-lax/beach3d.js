/* Melody flight game: VENICE BEACH for the chase view (2026-10-16, 4th pass, Antidote: "I need the water to be more realistic and
   clear and like reflections of the sun ... the people ... like the characters from the Nalu Vida game ... actual bodies, depth,
   hair ... people laying down on the beach on towels, umbrellas ... body movement ... falling in the waves or waving ... immersive").
   - Water: one shader plane. Clear shallows over a sand seabed (you see the bottom near shore), turquoise → deep blue with depth,
     big swells + small normal-mapped ripples, a Fresnel sky reflection and a sun glitter path toward the low sunset sun, foam on
     the breaking crests and the shoreline wash, and a wet-sand sheen where the wash runs back.
   - People: the Nalu Vida game's cast as jointed 3D figures (pelvis, shaped torso, head + hair, upper/lower arms and legs on pivots):
     the curly-haired surfer in blue floral boardshorts, the ponytail surfer in a black long-sleeve wetsuit top, the lifeguards
     (white tee + red shorts; red one-piece with the rescue can), the Nalu Vida server in his floral shirt and apron, and a mixed
     beach crowd in family-friendly swimwear, every skin tone. One InstancedMesh per body part for the whole beach (~14 draw calls),
     posed on the CPU each frame (forward kinematics) only while the beach is near the camera.
   - Behaviour: surfers paddle, pop up, ride and carve, then WIPE OUT (tumble into the wave with a splash, board flipping) and paddle
     back; paddlers stroke and bob; waders jump the waves and some get knocked over and get back up; sunbathers on towels (some roll
     over), people under umbrellas sitting, walkers, volleyball with a real ball, a lifeguard scanning with binoculars, kids building
     a sand castle with their parents beside them, swimmers past the break. When you fly low overhead they wave and cheer, and the
     surfers look up. Nothing on the beach can be hurt: your beams and crashes never touch people.
   Used by world3d.js (coast/venice/pier segments). */
export function makeBeachKit(THREE, K) {
  const { FX, wind, UT, rng } = K, TAU = Math.PI * 2;
  const SUN = new THREE.Vector3(-.12, .2, -1).normalize();

  /* ---------------- water ---------------- */
  const water = new THREE.ShaderMaterial({ fog: true, transparent: true, depthWrite: false,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { t: { value: 0 }, shore: { value: -110 }, sunDir: { value: SUN }, uLight: { value: new THREE.Vector3(1, 1, 1) }, uSkyH: { value: new THREE.Color(1, .72, .48) }, uSkyZ: { value: new THREE.Color(.16, .17, .4) }, uSunAmt: { value: 1 },
      uRefl: { value: null }, uReflOn: { value: 0 }, uReflMat: { value: new THREE.Matrix4() } }]),
    vertexShader: `#include <fog_pars_vertex>
      uniform float t; uniform float shore; varying vec3 vW; varying vec3 vL; varying vec3 vN;
      float sw(vec2 p){ float d = shore - p.x; float calm = .3 + .7 * smoothstep(0., 160., d);
        float a = 1.5 * sin(p.x * .05 + t * 1.2) + .9 * sin(p.x * .031 - p.y * .022 + t * .9) + .45 * sin(p.x * .13 + p.y * .07 + t * 2.1) + .3 * sin(p.y * .17 - t * 1.6);
        float swell = pow(.5 + .5 * sin((p.x - t * 26.) * .045), 3.) * 3.4 * (1. - smoothstep(30., 320., d) * .5);
        return a * calm + swell * smoothstep(3., 40., d); }
      void main(){ vec3 p = position; float h = sw(p.xz), e = 1.5; vN = normalize(vec3(-(sw(p.xz + vec2(e, 0.)) - h) / e, 1., -(sw(p.xz + vec2(0., e)) - h) / e));
        p.y += h; vL = p; vec4 w = modelMatrix * vec4(p, 1.); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `#include <fog_pars_fragment>
      uniform float t; uniform float shore; uniform vec3 sunDir; uniform vec3 uLight; uniform vec3 uSkyH; uniform vec3 uSkyZ; uniform float uSunAmt; uniform sampler2D uRefl; uniform float uReflOn; uniform mat4 uReflMat; varying vec3 vW; varying vec3 vL; varying vec3 vN;
      vec3 sky(vec3 r){ float y = clamp(r.y, 0., 1.); vec3 hor = uSkyH, mid = mix(uSkyH, uSkyZ, .45), top = uSkyZ;
        vec3 c = mix(hor, mid, smoothstep(.02, .18, y)); c = mix(c, top, smoothstep(.18, .6, y)); float s = max(dot(r, sunDir), 0.); return c + vec3(1., .75, .45) * pow(s, 24.) * 1.2 * uSunAmt; }
      void main(){ float d = shore - vL.x;
        float wash = 7. + 5. * sin(t * .8 + vL.z * .015) + 3. * sin(vL.z * .05 - t * 1.1);
        // small ripples: a few travelling sine normals on top of the swell normal
        vec2 q = vL.xz; vec3 rip = vec3(.0);
        rip.x = .32 * cos(q.x * .41 + q.y * .23 + t * 2.7) + .22 * cos(q.x * .87 - q.y * .51 - t * 3.3) + .14 * cos(-q.x * 1.6 + q.y * 1.3 + t * 4.1);
        rip.z = .32 * cos(q.y * .37 - q.x * .19 + t * 2.4) + .22 * cos(q.y * .93 + q.x * .44 - t * 3.6) + .14 * cos(q.y * 1.7 - q.x * 1.1 + t * 4.4);
        float far = smoothstep(250., 1100., length(cameraPosition - vW)); vec3 N = normalize(vN + vec3(rip.x, 0., rip.z) * mix(.14, .03, far));   // ripples fade with distance (no sparkle noise far out)
        vec3 V = normalize(cameraPosition - vW), Rf = reflect(-V, N);
        float fr = .02 + .98 * pow(1. - max(dot(N, V), 0.), 5.);
        vec3 shal = vec3(.36, .8, .74), turq = vec3(.07, .55, .6), deep = vec3(.02, .14, .26);
        vec3 body = mix(shal, turq, smoothstep(2., 60., d)); body = mix(body, deep, smoothstep(60., 420., d)); body *= uLight;
        vec3 rc = sky(Rf) * .85;
        if (uReflOn > .5) { vec4 ru = uReflMat * vec4(vW, 1.0); vec2 uvR = ru.xy / ru.w + N.xz * .035; vec4 rr = texture2D(uRefl, clamp(uvR, .001, .999)); rc = mix(rc, rr.rgb, rr.a * .9); }   // planar reflection (engine3d/water.js)
        vec3 c = mix(body, rc, clamp(fr * .7, 0., .8));
        float s = max(dot(Rf, sunDir), 0.); c += vec3(1., .82, .55) * (pow(s, 40.) * 1.1 + pow(s, 500.) * 3.5) * uSunAmt;          // the sun's glitter path
        float n = .55 + .45 * sin(vL.z * .09 + sin(vL.z * .021 + t * .3) * 3.) * sin(vL.z * .035 - t * .4);
        float crest = pow(.5 + .5 * sin((vL.x - t * 26.) * .045), 14.);
        float foam = crest * smoothstep(150., 35., d) * smoothstep(0., 12., d) * (.55 + .6 * n);
        foam += pow(.5 + .5 * sin((vL.x - t * 26.) * .045 - .5), 30.) * smoothstep(110., 20., d) * .5 * n;
        foam += smoothstep(wash + 3., wash - 1., d) * smoothstep(wash - 7., wash - 2., d) * 1.2;                          // the wash's leading edge
        foam += smoothstep(.8, .99, sin(vL.x * .21 + t * 1.7) * sin(vL.z * .17 - t * 1.3)) * .3 * smoothstep(60., 300., d);
        c = mix(c, vec3(.97, .95, .91) * uLight, clamp(foam, 0., 1.));
        // clear water: the sand bottom shows through in the shallows (alpha), the receding wash leaves a wet sheen on the sand
        float a = mix(.35, .97, smoothstep(0., 80., d)); a = max(a, clamp(foam, 0., 1.));
        if (d < wash - 1.) { float wet = smoothstep(wash - 22., wash - 2., d); c = sky(Rf) * .55 + vec3(1., .8, .55) * pow(s, 40.) * 1.5 * uSunAmt; a = .28 * wet; if (a < .01) discard; }
        gl_FragColor = vec4(c, a);
        #include <fog_fragment>
      }` });
  // seabed: wet sand under the clear shallows, darkening with depth
  const bedMat = new THREE.MeshLambertMaterial({ vertexColors: true });

  /* ---------------- the cast: jointed figures, one instanced mesh per part ---------------- */
  const T4 = (x, y, z, rx, ry, rz, sx, sy, sz) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0)), new THREE.Vector3(sx || 1, sy || 1, sz || 1));
  const merge = (parts) => { const pos = [], nor = []; parts.forEach(([g, m]) => { const q = (g.index ? g.toNonIndexed() : g.clone()).applyMatrix4(m); q.computeVertexNormals(); pos.push(...q.attributes.position.array); nor.push(...q.attributes.normal.array); });
    const o = new THREE.BufferGeometry(); o.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); o.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); return o; };
  const cap = (r, l, y) => [new THREE.CapsuleGeometry(r, l, 4, 10), T4(0, y, 0)];
  const torsoG = (() => { const pts = [[.0, -.05], [.92, 0], [.98, .45], [.86, 1.1], [.95, 1.75], [1.12, 2.3], [1.08, 2.62], [.62, 2.9], [.28, 3.0], [.0, 3.02]].map(p => new THREE.Vector2(p[0], p[1]));
    const g = new THREE.LatheGeometry(pts, 16); g.scale(1, 1, .66); return g; })();
  // part list: [name, parent, pivot (in the parent's frame), geometry (relative to its own pivot), colour slot]
  // slots: 0 skin · 1 top · 2 bottom · 3 hair · 4 upper arm · 5 lower arm · 6 shin · 7 prop
  const PARTS = [
    ["pelvis", -1, [0, 0, 0], merge([[new THREE.SphereGeometry(1, 14, 10), T4(0, -.12, 0, 0, 0, 0, 1.0, .72, .7)]]), 2],
    ["torso", 0, [0, .2, 0], torsoG, 1],
    ["head", 1, [0, 2.92, 0], merge([[new THREE.CylinderGeometry(.3, .36, .6, 10), T4(0, .25, 0)], [new THREE.SphereGeometry(.74, 16, 12), T4(0, 1.02, .04, 0, 0, 0, .9, 1.08, .98)], [new THREE.SphereGeometry(.16, 8, 6), T4(0, .98, .72)]]), 0],
    ["hairCurly", 2, [0, 0, 0], merge([[new THREE.SphereGeometry(.8, 14, 10, 0, TAU, 0, Math.PI * .55), T4(0, 1.1, -.04)]].concat(Array.from({ length: 9 }, (_, i) => [new THREE.SphereGeometry(.33, 8, 6), T4(Math.cos(i * 2.4) * .5, 1.55 + (i % 3) * .08, Math.sin(i * 2.4) * .45 - .12)]))), 3],
    ["hairPony", 2, [0, 0, 0], merge([[new THREE.SphereGeometry(.8, 14, 10, 0, TAU, 0, Math.PI * .58), T4(0, 1.08, -.05)], [new THREE.CapsuleGeometry(.24, 1.3, 4, 8), T4(0, .7, -.85, -.35, 0, 0)], [new THREE.SphereGeometry(.2, 8, 6), T4(0, 1.38, -.72)]]), 3],
    ["hairBun", 2, [0, 0, 0], merge([[new THREE.SphereGeometry(.79, 14, 10, 0, TAU, 0, Math.PI * .56), T4(0, 1.08, -.03)], [new THREE.SphereGeometry(.42, 10, 8), T4(0, 1.9, -.35)]]), 3],
    ["hairShort", 2, [0, 0, 0], merge([[new THREE.SphereGeometry(.77, 14, 10, 0, TAU, 0, Math.PI * .5), T4(0, 1.12, -.04)]]), 3],
    ["uArmL", 1, [1.12, 2.5, 0], merge([cap(.29, 1.05, -.68)]), 4],
    ["lArmL", 7, [0, -1.42, 0], merge([cap(.25, 1.0, -.62), [new THREE.SphereGeometry(.27, 8, 6), T4(0, -1.36, .05)]]), 5],
    ["uArmR", 1, [-1.12, 2.5, 0], merge([cap(.29, 1.05, -.68)]), 4],
    ["lArmR", 9, [0, -1.42, 0], merge([cap(.25, 1.0, -.62), [new THREE.SphereGeometry(.27, 8, 6), T4(0, -1.36, .05)]]), 5],
    ["thighL", 0, [.52, -.25, 0], merge([cap(.42, 1.35, -.9)]), 2],
    ["shinL", 11, [0, -1.82, 0], merge([cap(.31, 1.35, -.86), [new THREE.BoxGeometry(.42, .26, .95), T4(0, -1.72, .26)]]), 6],
    ["thighR", 0, [-.52, -.25, 0], merge([cap(.42, 1.35, -.9)]), 2],
    ["shinR", 13, [0, -1.82, 0], merge([cap(.31, 1.35, -.86), [new THREE.BoxGeometry(.42, .26, .95), T4(0, -1.72, .26)]]), 6],
    ["can", 10, [0, -1.45, .2], merge([[new THREE.CapsuleGeometry(.36, 1.6, 4, 8), T4(0, -.6, .1, 0, 0, Math.PI / 2)]]), 7],      // lifeguard's rescue can (in the right hand)
    ["binos", 8, [0, -1.42, .35], merge([[new THREE.CylinderGeometry(.16, .16, .55, 8), T4(-.18, 0, 0, Math.PI / 2, 0, 0)], [new THREE.CylinderGeometry(.16, .16, .55, 8), T4(.18, 0, 0, Math.PI / 2, 0, 0)]]), 7],
  ];
  const IDX = {}; PARTS.forEach((p, i) => IDX[p[0]] = i);
  const HAIRS = ["hairCurly", "hairPony", "hairBun", "hairShort"];
  const partMat = new THREE.MeshStandardMaterial({ roughness: .62, metalness: 0 });
  const SKINS = ["#3b2219", "#4a2c1f", "#5b3826", "#6b4430", "#7c4f34", "#8d5a3b", "#9c6844", "#a9744d", "#b98559", "#c99a6e", "#d8ad84", "#e5c09c"];
  const HAIRC = ["#1a120e", "#231711", "#2e1e14", "#4a2e1c", "#5c3a22", "#0f0d0c", "#7a4e2c", "#b88a52", "#c9a063"];
  const SWIM = ["#e4566b", "#f0d375", "#3aa8ff", "#1b1d22", "#ff7a3a", "#2fb38a", "#ffffff", "#8a5cd8", "#1d6f8a", "#d42a2a", "#ff9fb5"];
  // the Nalu Vida game cast (img/game/*): outfits + hair
  const CAST = {
    surferM: (R, pick) => ({ hair: "hairCurly", hairC: pick(["#4a2e1c", "#2e1e14", "#1a120e"]), top: "skin", bottom: pick(["#2f6fb5", "#3b82c4", "#1f5a9e"]), uArm: "skin", lArm: "skin", shin: "skin" }),
    surferF: (R, pick) => ({ hair: "hairPony", hairC: pick(["#4a2e1c", "#2e1e14", "#5c3a22", "#1a120e"]), top: "#15161a", bottom: "#15161a", uArm: "#15161a", lArm: "#15161a", shin: "skin" }),
    guardM: (R, pick) => ({ hair: "hairShort", hairC: pick(HAIRC), top: "#f4f4f2", bottom: "#d9473f", uArm: "#f4f4f2", lArm: "skin", shin: "skin", prop: "#e2362c" }),
    guardF: (R, pick) => ({ hair: pick(["hairBun", "hairCurly"]), hairC: pick(["#c9a063", "#7a4e2c", "#2e1e14"]), top: "#d42a2a", bottom: "#d42a2a", uArm: "skin", lArm: "skin", shin: "skin", prop: "#e2362c" }),
    staff: (R, pick) => ({ hair: "hairShort", hairC: "#1a120e", top: "#e88b8b", bottom: "#f2efe8", uArm: "#e88b8b", lArm: "skin", shin: "#f2efe8" }),
    beachM: (R, pick) => ({ hair: pick(["hairShort", "hairCurly", "hairShort"]), hairC: pick(HAIRC), top: R() < .7 ? "skin" : pick(["#f4f4f2", "#2c4a7a", "#e8c070"]), bottom: pick(SWIM), uArm: "skin", lArm: "skin", shin: "skin" }),
    beachF: (R, pick) => { const sw = pick(SWIM); return { hair: pick(["hairPony", "hairBun", "hairCurly"]), hairC: pick(HAIRC), top: sw, bottom: R() < .6 ? sw : pick(SWIM), uArm: "skin", lArm: "skin", shin: "skin" }; },
    kid: (R, pick) => { const sw = pick(SWIM); return { hair: pick(["hairCurly", "hairPony", "hairShort"]), hairC: pick(HAIRC), top: R() < .5 ? sw : "#f4f4f2", bottom: sw, uArm: "skin", lArm: "skin", shin: "skin" }; },
  };
  const QC = new THREE.Color();

  // one crowd = one instanced mesh per part (all figures of a beach segment)
  function makeCrowd(group, N) {
    const meshes = PARTS.map(p => { const m = new THREE.InstancedMesh(p[3], partMat, N); m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3); m.frustumCulled = false; m.count = 0; m.castShadow = false; group.add(m); return m; });
    const list = [];
    const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
    function add(kind, R, extra) { const pick = (a) => a[(R() * a.length) | 0], look = CAST[kind](R, pick), skin = extra && extra.skin || pick(SKINS), i = list.length;
      const col = (c) => c === "skin" ? skin : c;
      const slot = [skin, col(look.top), col(look.bottom), look.hairC, col(look.uArm), col(look.lArm), col(look.shin), look.prop || "#222"];
      PARTS.forEach((p, k) => meshes[k].instanceColor.setXYZ(i, ...QC.set(slot[p[4]]).toArray()));
      const c = Object.assign({ i, kind, hair: IDX[look.hair], prop: !!look.prop, s: (kind === "kid" ? .62 : .93 + R() * .16), ph: R() * TAU, x: 0, y: 0, z: 0, ry: 0, pose: "stand", t0: 0, wave: 0 }, extra || {});
      list.push(c); meshes.forEach(m => { m.count = list.length; m.instanceColor.needsUpdate = true; }); return c; }
    // ---- forward kinematics ----
    const J = PARTS.map(() => new THREE.Matrix4()), Wm = PARTS.map(() => new THREE.Matrix4()), E = new THREE.Euler(), Qt = new THREE.Quaternion(), Pv = new THREE.Vector3(), One = new THREE.Vector3(1, 1, 1), Sc = new THREE.Vector3();
    const A = {};   // joint angles, reused
    function reset() { A.root = [0, 0, 0]; A.torso = [0, 0, 0]; A.head = [0, 0, 0]; A.uArmL = [0, 0, .12]; A.lArmL = [-.15, 0, 0]; A.uArmR = [0, 0, -.12]; A.lArmR = [-.15, 0, 0]; A.thighL = [0, 0, 0]; A.shinL = [0, 0, 0]; A.thighR = [0, 0, 0]; A.shinR = [0, 0, 0]; A.lift = 0; }
    function place(c) {
      E.set(A.root[0], c.ry + A.root[1], A.root[2], "YXZ"); Qt.setFromEuler(E); Pv.set(c.x, c.y + A.lift + 3.95 * c.s, c.z); Sc.set(c.s, c.s, c.s);
      Wm[0].compose(Pv, Qt, Sc);
      for (let k = 0; k < PARTS.length; k++) { const p = PARTS[k];
        if (k > 0) { const a = A[p[0]] || (p[0].startsWith("hair") || p[0] === "can" || p[0] === "binos" ? null : null); E.set(a ? a[0] : 0, a ? a[1] : 0, a ? a[2] : 0, "XYZ"); Qt.setFromEuler(E); Pv.set(p[2][0], p[2][1], p[2][2]); J[k].compose(Pv, Qt, One); Wm[k].multiplyMatrices(Wm[p[1]], J[k]); }
        let vis = true; if (p[0].startsWith("hair")) vis = k === c.hair; else if (p[0] === "can") vis = c.prop && c.pose !== "binos"; else if (p[0] === "binos") vis = c.pose === "binos";
        meshes[k].setMatrixAt(c.i, vis ? Wm[k] : ZERO); } }
    A.head = [0, 0, 0];
    // ---- poses ----
    function pose(c, t) { reset(); const ph = c.ph, s1 = Math.sin(t * 6.4 + ph), idle = Math.sin(t * 1.3 + ph);
      switch (c.pose) {
        case "walk": A.thighL = [s1 * .55, 0, 0]; A.thighR = [-s1 * .55, 0, 0]; A.shinL = [Math.max(0, -s1) * .9, 0, 0]; A.shinR = [Math.max(0, s1) * .9, 0, 0];
          A.uArmL = [-s1 * .45, 0, .12]; A.uArmR = [s1 * .45, 0, -.12]; A.lift = Math.abs(s1) * .18; A.torso = [.05, s1 * .08, 0]; break;
        case "lie": { const roll = c.roll ? Math.max(0, Math.min(1, ((t + ph) % 14 - 12) / 1.2)) : 0; A.root = [-Math.PI / 2, 0, roll * Math.PI * (c.sup ? -1 : 1)]; A.lift = -3.95 * c.s + .75 * c.s;
          if (c.sup) A.root[0] = Math.PI / 2; A.uArmL = [0, 0, .5]; A.uArmR = [0, 0, -.5]; A.head = [c.sup ? -.2 : .5, 0, 0]; break; }
        case "sit": A.thighL = [-1.45, 0, .15]; A.thighR = [-1.45, 0, -.15]; A.shinL = [1.3, 0, 0]; A.shinR = [1.3, 0, 0]; A.lift = -2.05 * c.s; A.torso = [-.15, 0, 0]; A.uArmL = [.25, 0, .35]; A.uArmR = [.25, 0, -.35]; A.head = [.1, idle * .4, 0]; break;
        case "kneel": A.thighL = [-.25, 0, .2]; A.thighR = [-.25, 0, -.2]; A.shinL = [1.75, 0, 0]; A.shinR = [1.75, 0, 0]; A.lift = -1.9 * c.s; A.torso = [.45, 0, 0];
          A.uArmL = [-1 + Math.sin(t * 4 + ph) * .35, 0, .2]; A.uArmR = [-1 - Math.sin(t * 4 + ph) * .35, 0, -.2]; A.lArmL = [-.6, 0, 0]; A.lArmR = [-.6, 0, 0]; A.head = [.4, 0, 0]; break;
        case "binos": A.uArmL = [-1.35, 0, -.35]; A.uArmR = [-1.35, 0, .35]; A.lArmL = [-1.75, 0, 0]; A.lArmR = [-1.75, 0, 0]; A.head = [-.05, Math.sin(t * .5 + ph) * .55, 0]; A.torso = [0, Math.sin(t * .5 + ph) * .3, 0]; break;
        case "paddle": { A.root = [Math.PI / 2 * .98, 0, 0]; A.lift = -3.95 * c.s + 1.4; const a = t * 3.6 + ph; A.uArmL = [a % TAU, 0, .25]; A.uArmR = [(a + Math.PI) % TAU, 0, -.25]; A.lArmL = [-.3, 0, 0]; A.lArmR = [-.3, 0, 0]; A.head = [-.9, 0, 0]; A.thighL = [.05, 0, .08]; A.thighR = [.05, 0, -.08]; break; }
        case "swim": { A.root = [1.2, 0, Math.sin(t * 3 + ph) * .15]; A.lift = -3.95 * c.s - 2.6; const a = t * 3 + ph; A.uArmL = [a % TAU, 0, .2]; A.uArmR = [(a + Math.PI) % TAU, 0, -.2]; A.head = [-1.1, 0, 0]; A.thighL = [Math.sin(t * 6 + ph) * .3, 0, 0]; A.thighR = [-Math.sin(t * 6 + ph) * .3, 0, 0]; break; }
        case "surf": { A.root = [0, Math.PI / 2, 0]; A.thighL = [-.35, 0, .38]; A.thighR = [-.1, 0, -.38]; A.shinL = [.75, 0, 0]; A.shinR = [.55, 0, 0]; A.lift = -.75 * c.s; A.torso = [.32, -.25 + Math.sin(t * 1.3 + ph) * .2, Math.sin(t * 1.3 + ph) * .12];
          A.uArmL = [-.2, 0, 1.15 + Math.sin(t * 2.1 + ph) * .2]; A.uArmR = [-.2, 0, -1.15 - Math.sin(t * 2.1 + ph) * .2]; A.lArmL = [-.25, 0, 0]; A.lArmR = [-.25, 0, 0]; A.head = [c.look ? -.8 : 0, -1.1, 0]; break; }
        case "tumble": { const u = c.u || 0; A.root = [u * 7.5, 0, u * 3]; A.lift = -3.95 * c.s + 2 - u * 5; A.uArmL = [Math.sin(t * 14) * 1.5, 0, 1.4]; A.uArmR = [-Math.sin(t * 14) * 1.5, 0, -1.4]; A.thighL = [-.8, 0, .4]; A.thighR = [.4, 0, -.4]; A.shinL = [1, 0, 0]; break; }
        case "wade": { const jump = c.jump || 0, down = c.down || 0; A.lift = -2.3 * c.s + jump * 2.6; A.thighL = [-.3 * jump, 0, .1]; A.thighR = [-.3 * jump, 0, -.1]; A.shinL = [.5 * jump, 0, 0]; A.shinR = [.5 * jump, 0, 0];
          A.uArmL = [-.4 - jump * 1.6, 0, .5]; A.uArmR = [-.4 - jump * 1.6, 0, -.5]; if (down > 0) { A.root = [-down * 1.5, 0, 0]; A.lift -= down * 2.4; A.uArmL = [-2.6 * down, 0, .9]; A.uArmR = [-2.6 * down, 0, -.9]; } break; }
        case "volley": { const j = c.jump || 0; A.lift = j * 3; A.uArmL = [-2.6 * Math.max(j, .3), 0, .25]; A.uArmR = [-2.6 * Math.max(j, .3), 0, -.25]; A.thighL = [-.3 + j * .3, 0, .15]; A.thighR = [-.3 + j * .3, 0, -.15]; A.shinL = [.6 - j * .5, 0, 0]; A.shinR = [.6 - j * .5, 0, 0]; break; }
        case "serve": { A.uArmR = [-2.4, 0, -.3]; A.lArmR = [-.6, 0, 0]; A.uArmL = [-.7, 0, .3]; A.head = [-.35, 0, 0]; break; }
        default: A.uArmL = [idle * .05, 0, .12]; A.uArmR = [-idle * .05, 0, -.12]; A.head = [0, idle * .3, 0]; A.torso = [0, idle * .06, 0];
      }
      // the reaction: a low pass overhead → they wave (right arm up, hand waving), some cheer with both arms and a hop
      if (c.wave > 0 && c.pose !== "lie" && c.pose !== "tumble" && c.pose !== "paddle" && c.pose !== "swim") { const w = Math.min(1, c.wave * 2), wv = Math.sin(t * 13 + ph);
        A.uArmR = [-.35 * w, 0, -2.75 * w - .12 * (1 - w)]; A.lArmR = [0, 0, -.5 * wv * w]; A.head = [-.65 * w, A.head[1] * (1 - w), 0];
        if (c.cheer) { A.uArmL = [-.3 * w, 0, 2.75 * w]; A.lArmL = [0, 0, .5 * wv * w]; if (c.pose === "stand" || c.pose === "walk") A.lift += Math.max(0, Math.sin(t * 9 + ph)) * 1.6 * w; } }
      if (c.wave > 0 && c.pose === "lie") A.uArmR = [0, 0, -2.6 + Math.sin(t * 13 + ph) * .3];   // lying down: one arm up, waving
      place(c); }
    function update(t, dt, near) { if (!near) return; for (const c of list) { if (c.tick) c.tick(c, t, dt); if (c.wave > 0) c.wave = Math.max(0, c.wave - dt * .45); pose(c, t); } meshes.forEach(m => m.instanceMatrix.needsUpdate = true); }
    function frozen() { for (const c of list) pose(c, 0); meshes.forEach(m => m.instanceMatrix.needsUpdate = true); }
    return { add, update, frozen, list, meshes };
  }

  /* ---------------- engine3d crowd (real rigged Nalu Vida humans, demo/engine3d/crowd.js) ----------------
     Same agent API as makeCrowd above (add(kind, R, extra) → agent with x/y/z/ry/pose/wave…, update, frozen, list), but every
     agent is a person in the shared engine crowd: VAT-instanced at distance, real SkinnedMesh close up. Behaviour code is unchanged;
     the pose is mapped to an animation clip. Reactions on top: wave/cheer on a low pass, duck when you buzz them really low,
     scatter (run away) from explosions, umbrellas or a run for cover in the rain. */
  const BLUES = ["#2f6fb5", "#3b82c4", "#1f5a9e", "#2a7f9e", "#334f8a"];
  function lookFor(E, kind, R, pick) { const c = E.col, rnd = Math.floor(R() * 1e9);
    const L = (body, style) => E.randomLook(rnd, body, style);
    switch (kind) {
      case "surferM": { const l = L("m", "beach"); l.top = [0, 0, 0, 0]; l.cloth = c(pick(BLUES)); return { body: "m", look: l }; }
      case "surferF": { const l = L("f", "beach"); l.cloth = c("#15161a"); l.top = [...c("#15161a"), 3]; l.bot = [...c("#15161a"), 1]; return { body: "f", look: l }; }
      case "guardM": { const l = L("m", "beach"); l.top = [...c("#f4f4f2"), 2]; l.cloth = c("#d9473f"); return { body: "m", look: l }; }
      case "guardF": { const l = L("f", "beach"); l.cloth = c("#d42a2a"); l.top = [0, 0, 0, 0]; return { body: "f", look: l }; }
      case "staff": { const l = L("m", "beach"); l.top = [...c("#e88b8b"), 2]; l.bot = [...c("#f2efe8"), 3]; l.hair = c("#1a120e"); return { body: "m", look: l }; }
      case "kid": { const b = R() < .5 ? "m" : "f"; return { body: b, look: L(b, "beach"), scale: .56 + R() * .1 }; }
      case "street": { const b = R() < .5 ? "m" : "f"; return { body: b, look: L(b, "street") }; }
      default: { const b = kind === "beachF" ? "f" : "m"; return { body: b, look: L(b, "beach") }; }
    } }
  function makeCrowdE(E, group) {
    const list = [];
    function add(kind, R, extra) { const pick = (a) => a[(R() * a.length) | 0], spec = lookFor(E, kind, R, pick);
      const c = Object.assign({ kind, ph: R() * TAU, x: 0, y: 0, z: 0, ry: 0, pose: "stand", wave: 0, ox: 0, oz: 0, duck: 0, flee: 0, fvx: 0, fvz: 0,
        idle: pick(["idle", "idle", "idle2", "talk", "phone", "text", "idle"]), umb: R() < .45 }, extra || {});
      c.p = E.add({ body: spec.body, look: spec.look, scale: spec.scale, seed: (R() * 1e9) | 0 }); c.p.parent = group; list.push(c); return c; }
    function clipOf(c, t) {
      if (c.flee > 0) return ["run", 0];
      const p = c.pose;
      if (p === "lie") return [c.wave > 0 ? "lieWave" : c.sup ? "lieBack" : "lieFront", 0];
      if (p === "paddle") return ["paddle", -1.1];
      if (p === "swim") return ["swim", -1.6];
      if (p === "tumble") return ["tumble", -1.2];
      if (p === "surf") return ["stance", 0];
      if (c.duck > 0 && p !== "sit" && p !== "kneel") return ["duck", 0];
      if (c.wave > 0 && p !== "binos") return [c.cheer ? "cheer" : "wave", 0];
      if (RAIN.v > .35 && (p === "stand" || p === "walk")) return [p === "walk" ? (c.umb ? "walk" : "coverRun") : c.umb ? "idle" : "coverRun", 0];
      switch (p) {
        case "walk": return ["walk", 0];
        case "sit": return ["sit", 0];
        case "kneel": return ["kneel", 0];
        case "binos": return ["binos", 0];
        case "wade": return [(c.down || 0) > .3 ? "tumble" : "wade", -2.6 + (c.jump || 0) * 2.4];
        case "volley": return [(c.jump || 0) > .2 ? "set" : "volley", (c.jump || 0) * 3];
        case "serve": return ["serve", 0];
        case "sitChair": return ["sitChair", 0];
        default: return [c.idle, 0];
      } }
    function update(t, dt, near) {
      for (const c of list) { c.p.visible = near; if (!near) continue;
        if (c.tick) c.tick(c, t, dt); if (c.wave > 0) c.wave = Math.max(0, c.wave - dt * .45); if (c.duck > 0) c.duck -= dt;
        if (c.flee > 0) { c.flee -= dt; c.ox += c.fvx * dt; c.oz += c.fvz * dt; }
        const [clip, dy] = clipOf(c, t), moving = c.flee > 0;
        const yaw = moving ? Math.atan2(c.fvx, c.fvz) : c.ry;
        c.p.set(c.x + c.ox, c.y + dy, c.z + c.oz, yaw); c.p.play(clip);
        c.p.umbrella = RAIN.v > .35 && c.umb && (c.pose === "stand" || c.pose === "walk") && !moving; } }
    function frozen() {}
    function dispose() { list.forEach(c => E.remove(c.p)); list.length = 0; }
    // explosions: everyone within r runs directly away for a few seconds
    function scatter(lx, lz, r) { for (const c of list) { if (c.pose === "swim" || c.pose === "paddle" || c.pose === "surf" || c.pose === "tumble") continue; const dx = c.x + c.ox - lx, dz = c.z + c.oz - lz, d = Math.hypot(dx, dz);
      if (d < r) { const k = 34 + Math.random() * 14; c.flee = 2.2 + Math.random() * 1.6; c.fvx = dx / (d || 1) * k; c.fvz = dz / (d || 1) * k; if (c.pose === "lie" || c.pose === "sit") c.pose = "stand"; } } }
    function buzz(lx, lz, low) { for (const c of list) { const dx = c.x + c.ox - lx, dz = c.z + c.oz - lz; if (dx * dx + dz * dz < 110 * 110) { if (low) c.duck = 1.4; } } }
    const WV = new THREE.Vector3();
    function scatterW(wx, wz, r) { group.updateWorldMatrix(true, false); WV.set(wx, 0, wz); group.worldToLocal(WV); scatter(WV.x, WV.z, r); }
    return { add, update, frozen, list, meshes: [], dispose, scatter, scatterW, buzz, engine: true };
  }
  const RAIN = K.rain || { v: 0 };

  /* ---------------- the beach itself ---------------- */
  function populate(seg, R, len, SHORE, H) {   // H: helpers from world3d (mesh, inst, set, setE, merge, T4, palms, TOWEL, SMP, SMV, glowTex)
    const g = seg.group, pick = (a) => a[(R() * a.length) | 0];
    // seabed under the clear water (wet sand → darker with depth)
    const bed = new THREE.PlaneGeometry(520, len, 26, 1).rotateX(-Math.PI / 2).translate(SHORE - 260 + 14, -2.2, 0), bp = bed.attributes.position, bc = [];
    for (let i = 0; i < bp.count; i++) { const d = SHORE - bp.getX(i); bp.setY(i, -1.2 - Math.max(0, d) * .055); const k = Math.max(0, Math.min(1, d / 220)); bc.push(.62 - .5 * k, .55 - .38 * k, .42 - .2 * k); }
    bed.setAttribute("color", new THREE.Float32BufferAttribute(bc, 3)); bed.computeVertexNormals(); g.add(H.mesh(bed, bedMat));
    const og = new THREE.PlaneGeometry(1900, len, 110, 48).rotateX(-Math.PI / 2).translate(SHORE - 950 + 26, 0, 0); const wm = H.mesh(og, water); wm.renderOrder = 5; g.add(wm);
    const E = K.E && K.E(), crowd = E ? makeCrowdE(E, g) : makeCrowd(g, 150); seg.crowd = crowd; if (E) (seg.crowds = seg.crowds || []).push(crowd);
    // towels + umbrellas, with people lying on most towels and sitting under the umbrellas
    const tw = [], um = []; for (let i = 0; i < 40; i++) tw.push([SHORE + 40 + R() * 160, (R() - .5) * len * .9, (R() - .5) * .5]); for (let i = 0; i < 16; i++) um.push([SHORE + 48 + R() * 150, (R() - .5) * len * .88]);
    const twM = H.inst(new THREE.BoxGeometry(7, .25, 13).translate(0, .15, 0), new THREE.MeshLambertMaterial(), tw.length, true); tw.forEach((p, i) => { H.set(twM, i, p[0], 0, p[1], p[2]); twM.instanceColor.setXYZ(i, ...QC.set(pick(H.TOWEL)).toArray()); }); g.add(twM);
    const umC = H.inst(new THREE.ConeGeometry(8.5, 3.4, 12).translate(0, 13.6, 0), new THREE.MeshLambertMaterial(), um.length, true), umP = H.inst(new THREE.CylinderGeometry(.3, .3, 14, 4).translate(0, 7, 0), H.white, um.length);
    um.forEach((p, i) => { H.set(umC, i, p[0], 0, p[1], 0); H.set(umP, i, p[0], 0, p[1], 0); umC.instanceColor.setXYZ(i, ...QC.set(pick(H.TOWEL)).toArray()); }); g.add(umC, umP);
    tw.forEach((p, i) => { if (i % 5 === 4) return; crowd.add(R() < .5 ? "beachF" : "beachM", R, { pose: "lie", x: p[0], z: p[1] + 1, ry: p[2] + (R() < .5 ? 0 : Math.PI), sup: R() < .5, roll: R() < .3 }); });
    um.forEach(p => { crowd.add(R() < .5 ? "beachF" : "beachM", R, { pose: "sit", x: p[0] + 3, z: p[1] + 2, ry: -Math.PI / 2 + (R() - .5) }); if (R() < .5) crowd.add(R() < .5 ? "beachF" : "beachM", R, { pose: "sit", x: p[0] - 3, z: p[1] - 3, ry: -Math.PI / 2 + (R() - .5) }); });
    // walkers along the wet sand and the boardwalk
    for (let i = 0; i < 18; i++) { const lane = R() < .55 ? SHORE + 14 + R() * 12 : 126 + R() * 12, dir = R() < .5 ? 1 : -1, sp = 9 + R() * 8, z0 = (R() - .5) * len;
      crowd.add(R() < .5 ? "beachF" : "beachM", R, { pose: "walk", x: lane, ry: dir > 0 ? 0 : Math.PI, tick: (c, t) => { c.z = ((z0 + t * sp * dir + len * 50) % len) - len / 2; } }); }
    // volleyball: two nets, four players each, a real ball
    for (let n = 0; n < 2; n++) { const nx = SHORE + 115 + n * 55, nz = (R() - .5) * len * .55;
      g.add(H.mesh(H.merge([[new THREE.CylinderGeometry(.4, .4, 13, 5), H.T4(nx, 6.5, nz - 15)], [new THREE.CylinderGeometry(.4, .4, 13, 5), H.T4(nx, 6.5, nz + 15)], [new THREE.BoxGeometry(.2, 3.6, 30), H.T4(nx, 10.2, nz)]]), H.white));
      const ball = H.mesh(new THREE.SphereGeometry(1.1, 12, 8), new THREE.MeshLambertMaterial({ color: 0xfff3d0 })); g.add(ball);
      const P = [[-12, -6], [-12, 6], [12, -6], [12, 6]].map((o, k) => crowd.add(R() < .5 ? "beachF" : "beachM", R, { pose: "volley", x: nx + o[0], z: nz + o[1], ry: o[0] < 0 ? Math.PI / 2 : -Math.PI / 2 }));
      seg.tick.push((t, dt, near) => { if (!near) return; const per = 1.6, k = Math.floor((t + n) / per), u = ((t + n) / per) % 1, a = P[k % 4], b = P[(k + 2 + (k >> 2) % 2) % 4];
        ball.position.set(a.x + (b.x - a.x) * u, 9 + Math.sin(u * Math.PI) * 26, a.z + (b.z - a.z) * u); P.forEach(p => p.jump = (p === b && u > .82) || (p === a && u < .15) ? Math.sin(Math.min(1, (p === a ? u / .15 : (u - .82) / .18)) * Math.PI) : 0); }); }
    // the lifeguard tower: one lifeguard scanning with binoculars, one standing with the rescue can
    const lx = SHORE + 72, lz = (R() - .5) * len * .45, lg = new THREE.Group(); lg.position.set(lx, 0, lz); g.add(lg);
    lg.add(H.mesh(H.merge([[new THREE.CylinderGeometry(.5, .5, 9, 4), H.T4(-6, 4.5, -5)], [new THREE.CylinderGeometry(.5, .5, 9, 4), H.T4(6, 4.5, -5)], [new THREE.CylinderGeometry(.5, .5, 9, 4), H.T4(-6, 4.5, 5)], [new THREE.CylinderGeometry(.5, .5, 9, 4), H.T4(6, 4.5, 5)], [new THREE.BoxGeometry(5, .5, 16), H.T4(12, 4.5, 0, 0, 0, -.5)]]), H.white));
    lg.add(H.mesh(new THREE.BoxGeometry(14, 9, 12).translate(0, 13.5, 0), new THREE.MeshLambertMaterial({ color: 0x5fa8d8 }))); lg.add(H.mesh(new THREE.BoxGeometry(16, 1, 14).translate(0, 18.5, 0), H.white));
    lg.add(H.mesh(new THREE.BoxGeometry(16, .6, 3).translate(0, 9.1, -8), H.white));
    crowd.add(R() < .5 ? "guardF" : "guardM", R, { pose: "binos", x: lx, y: 9.4, z: lz - 8.2, ry: Math.PI });
    crowd.add(R() < .5 ? "guardM" : "guardF", R, { pose: "stand", x: lx - 16, z: lz - 6, ry: Math.PI - .4 });
    // kids building a sand castle, with their parents right there
    for (let k = 0; k < 2; k++) { const kx = SHORE + 30 + R() * 30, kz = (R() - .5) * len * .7;
      g.add(H.mesh(H.merge([[new THREE.CylinderGeometry(3.4, 4, 2.4, 10), H.T4(0, 1.2, 0)], [new THREE.CylinderGeometry(1.2, 1.4, 3, 8), H.T4(-2, 3.8, -1.5)], [new THREE.ConeGeometry(1.3, 1.8, 8), H.T4(-2, 6.2, -1.5)], [new THREE.CylinderGeometry(1, 1.2, 2.4, 8), H.T4(2, 3.4, 1)], [new THREE.ConeGeometry(1.1, 1.6, 8), H.T4(2, 5.4, 1)]]), new THREE.MeshLambertMaterial({ color: 0xd6b98c })).translateX(kx).translateZ(kz));
      crowd.add("kid", R, { pose: "kneel", x: kx + 6, z: kz, ry: -Math.PI / 2 }); crowd.add("kid", R, { pose: "kneel", x: kx - 2, z: kz + 6, ry: Math.PI });
      crowd.add(R() < .5 ? "beachF" : "beachM", R, { pose: "sit", x: kx + 12, z: kz + 8, ry: -Math.PI / 2 - .6 }); crowd.add(R() < .5 ? "beachF" : "beachM", R, { pose: "stand", x: kx - 8, z: kz - 9, ry: .4 }); }
    // the Nalu Vida server bringing drinks down the beach
    crowd.add("staff", R, { pose: "walk", x: SHORE + 160, ry: Math.PI, tick: (c, t) => { c.z = ((t * 10 + len * 40) % len) - len / 2; c.ry = Math.PI; } });
    // waders in the shallows: they jump the waves; now and then one gets knocked over and gets back up
    const crestAt = (x, t) => Math.pow(.5 + .5 * Math.sin((x - t * 26) * .045), 14);
    for (let i = 0; i < 14; i++) { const wx = SHORE - 8 - R() * 34, wz = (R() - .5) * len * .9, unlucky = R() < .35;
      crowd.add(R() < .5 ? "beachF" : "beachM", R, { pose: "wade", x: wx, z: wz, ry: Math.PI / 2 + (R() - .5) * .8, tick: (c, t, dt) => { const cr = crestAt(c.x - 18, t); c.jump = Math.max(0, cr * 1.3 - .2);
        if (unlucky) { const cyc = (t + c.ph * 3) % 11; c.down = cyc < 2.4 ? Math.sin(Math.min(1, cyc / 2.4) * Math.PI) : 0; if (cyc < .05 && FX) splash(seg, c.x, c.z, 1); } } }); }
    // swimmers past the break (heads + crawl strokes)
    for (let i = 0; i < 10; i++) { const sx = SHORE - 70 - R() * 160, sz = (R() - .5) * len * .9; crowd.add(R() < .5 ? "beachF" : "beachM", R, { pose: "swim", x: sx, z: sz, ry: Math.PI / 2 + (R() - .5) * 2, tick: (c, t) => { c.y = Math.sin(t * 1.4 + c.ph) * .5; } }); }
    // surfers: paddle out → pop up → ride and carve → wipe out (tumble + splash, board flips) → paddle back. Paddlers waiting past the break.
    const boards = H.inst(H.boardG, new THREE.MeshStandardMaterial({ roughness: .3, metalness: .1 }), 16, true), SURFC = ["#f2f2ee", "#f0d375", "#ff7a3a", "#3aa8ff", "#e4566b", "#7ee0b0", "#ffffff", "#ff9a2e"]; g.add(boards);
    for (let i = 0; i < 16; i++) boards.instanceColor.setXYZ(i, ...QC.set(SURFC[i % SURFC.length]).toArray());
    const surfers = [];
    for (let i = 0; i < 9; i++) { const c = crowd.add(R() < .5 ? "surferM" : "surferF", R, { pose: "paddle", x: SHORE - 140, z: (R() - .5) * len, ry: 0 }); surfers.push({ c, b: i, z0: (R() - .5) * len, v: (R() < .5 ? -1 : 1) * (20 + R() * 14), ph: R() * 12, wiped: -1 }); }
    for (let i = 0; i < 6; i++) { const c = crowd.add(R() < .5 ? "surferM" : "surferF", R, { pose: "paddle", x: SHORE - 170 - R() * 110, z: (R() - .5) * len * .9, ry: Math.PI / 2 * (R() < .5 ? 1 : -1) }); surfers.push({ c, b: 9 + i, wait: true, ph: R() * 6 }); }
    const CYC = 12;
    seg.tick.push((t, dt, near) => { if (!near) return;
      surfers.forEach(S => { const c = S.c;
        if (S.wait) { const y = Math.sin(t * 1.3 + S.ph) * .7; c.y = y; H.setE(boards, S.b, c.x + Math.sin(c.ry) * 3, y + .5, c.z + Math.cos(c.ry) * 3, Math.sin(t * 1.1 + S.ph) * .05, c.ry, 0, 1); return; }
        const u = ((t + S.ph) % CYC) / CYC, z = ((S.z0 + t * S.v + len * 60) % len) - len / 2, dirY = S.v > 0 ? 0 : Math.PI;
        if (u < .3) { const k = u / .3; c.pose = "paddle"; c.x = SHORE - 220 + k * 90; c.z = z; c.ry = -Math.PI / 2; c.y = Math.sin(t * 2 + S.ph) * .4; H.setE(boards, S.b, c.x + 2.5, .5 + c.y, c.z, 0, -Math.PI / 2, 0, 1); }
        else if (u < .78) { const k = (u - .3) / .48, d = 125 - k * 80; c.pose = "surf"; c.x = SHORE - d; c.z = z; c.ry = dirY + (S.v > 0 ? -.35 : .35) + Math.sin(t * 1.6 + S.ph) * .35; c.y = 3.2; c.look = (c.wave || 0) > 0;
          H.setE(boards, S.b, c.x, 3.2, c.z, 0, c.ry, Math.sin(t * 1.6 + S.ph) * .3, 1);
          if (FX && Math.random() < dt * 16) FX.emit(H.SMP.set(seg.group.position.x + c.x, 2.5, seg.group.position.z + c.z - Math.sign(S.v) * 8), H.SMV.set(wind.x - 8, 8 + Math.random() * 6, wind.z - Math.sign(S.v) * 12), .8, 2, 8, [.97, .97, .97], [.86, .9, .92], .75, false, 0, .5, -10); }
        else { const k = (u - .78) / .22; if (S.wiped !== Math.floor((t + S.ph) / CYC)) { S.wiped = Math.floor((t + S.ph) / CYC); splash(seg, c.x, c.z, 2.2); }   // WIPE OUT
          c.pose = k < .45 ? "tumble" : "swim"; c.u = Math.min(1, k / .45); c.y = k < .45 ? 3 - k * 6 : Math.sin(t * 1.4) * .3; H.setE(boards, S.b, c.x + k * 14, 2 + Math.sin(k * 9) * 3, c.z + k * 10, k * 9, c.ry + k * 4, k * 6, 1); } });
      boards.instanceMatrix.needsUpdate = true; });
    function splash(sg, x, z, k) { if (!FX) return; const gp = sg.group.position; for (let i = 0; i < 14 * k; i++) FX.emit(H.SMP.set(gp.x + x + (Math.random() - .5) * 6, 2, gp.z + z + (Math.random() - .5) * 6), H.SMV.set((Math.random() - .5) * 30, 20 + Math.random() * 30, wind.z + (Math.random() - .5) * 30), 1.1, 3, 10 * k, [.98, .98, .98], [.86, .9, .93], .85, false, 0, .6, -45); }
    crowd.frozen();
    seg.tick.push((t, dt, near) => { water.uniforms.t.value = t; crowd.update(t, dt, near); });
    // the reaction: the 3D layer calls seg.flyby(world x, height, world z) every frame you are over this beach
    seg.flyby = (px, py, pz) => { if (py > 120) return 0; const gp = seg.group.position; let n = 0; if (crowd.buzz && py < 42) crowd.buzz(px - gp.x, pz - gp.z, true); for (const c of crowd.list) { const dx = gp.x + c.x - px, dz = gp.z + c.z - pz; if (dx * dx + dz * dz < 150 * 150) { if (!c.wave) c.cheer = R() < .45; c.wave = Math.max(c.wave || 0, 2); n++; } } return n; };
  }
  return { populate, water, SUN, makeCrowdE, lookFor };
}
