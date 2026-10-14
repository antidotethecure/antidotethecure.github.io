/* Ride the Nalu — the 3D renderer (Three.js r160, pinned). Loaded by game.js only for ?render=3d (or when 3D is the default).
   It never changes the game: every frame it mirrors game.js's state (window G, read through the API object game.js passes
   in) and draws the world on its own canvas, under the 2D canvas that keeps all the labels, rings, banners and the HUD.

   Camera: an orthographic camera tilted 35° from straight down, looking out to sea. Ground positions are stretched by
   1/cos(35°) along the shore-to-sea axis, so every point on the water / sand lands on exactly the same screen pixel as in
   the 2D game (same composition, same zoom, the 2D overlay lines up). Things with height (the surfer, the pier deck, the
   heli, the wave) rise up the screen by h·sin(35°), which is what makes it read as 3D.
   World units = the 2D game's pixels (before the camera zoom). 1 m ≈ 36.7 units (a 2.3 m board ≈ 84).

   Models (3d/*.glb, meshopt + WebP): surfer_m (Meshy rig + balance/run/swim/fall/flip clips), shark (Big Manō and Manō
   Nui are scaled/tinted copies), jelly, boat, beachlady, oysters. Everything else (board, pier, eel, ray, heli, buoy,
   rafts, rocks, beer bottle, palms) is built here. */
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.1/+esm";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/loaders/GLTFLoader.js/+esm";
import { MeshoptDecoder } from "https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/libs/meshopt_decoder.module.js/+esm";

const TILT = 35 * Math.PI / 180, COS = Math.cos(TILT), SIN = Math.sin(TILT), K = 1 / COS, UM = 36.7;
const LIGHT = new THREE.Vector3(-0.62, 1, 0.22).normalize();   // sun from the left, a little behind the camera (shadows fall right, like the 2D art)
const VIEW = new THREE.Vector3(0, COS, SIN);                    // toward the camera
const lin = (h) => new THREE.Color(h);                           // THREE.Color parses hex as sRGB → linear

async function init(A) {
  const G = A.G, W = A.W, H = A.H, IM = A.IM;
  let R;
  try { R = new THREE.WebGLRenderer({ canvas: A.canvas, antialias: true, powerPreference: "high-performance" }); }
  catch (e) { throw new Error("WebGL unavailable"); }
  const DBG = new URLSearchParams(location.search);
  R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.0; R.outputColorSpace = THREE.SRGBColorSpace;
  R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFShadowMap;
  function resize() { const w = A.wrap.clientWidth || 390; R.setPixelRatio(+DBG.get("pr") || Math.min(window.devicePixelRatio || 1, 1.5)); R.setSize(w, w * H / W, false); }
  resize(); const ro = window.ResizeObserver ? new ResizeObserver(resize) : null; if (ro) ro.observe(A.wrap); else window.addEventListener("resize", resize);

  const scene = new THREE.Scene(); scene.background = lin("#0b4f63");
  const cam = new THREE.OrthographicCamera(-200, 200, 320, -320, 1, 6000);
  const hemi = new THREE.HemisphereLight(lin("#d9efff"), lin("#9a7a50"), 1.25); scene.add(hemi);
  const sun = new THREE.DirectionalLight(lin("#fff1dc"), 2.4); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.6; sun.shadow.radius = 3;
  scene.add(sun); scene.add(sun.target);
  const T = { now: 0 };
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  const texL = new THREE.TextureLoader();
  const base = new URL("3d/", location.href).href;
  const gl = async (f) => { try { return await loader.loadAsync(base + f); } catch (e) { console.warn("[nv3d] missing " + f); return null; } };
  const [gSurf, gShark, gJelly, gBoat, gLady, gOys] = await Promise.all(["surfer_m.glb", "shark.glb", "jelly.glb", "boat.glb", "beachlady.glb", "oysters.glb"].map(gl));
  [gSurf, gShark, gJelly, gBoat, gLady, gOys].forEach(g => g && g.scene.traverse(o => { if (o.isMesh && o.material) { o.material.metalness = 0; if (o.material.roughness < .4) o.material.roughness = .6; } }));   // glTF defaults to metal; no env map here
  const imgTex = (k) => { const i = IM[k]; if (!i || !i.complete || !i.naturalWidth) return null; const t = new THREE.Texture(i); t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; return t; };
  const disposables = [];

  /* ------------------------------------------------------------ foam / shadow-shape canvas ----------
     A small 2D canvas over the visible area: red = foam (wake, spray, collars, splash rings), green = dark shapes under the
     surface (fish, a diving shark). The ocean shader samples it. */
  const FC = document.createElement("canvas"); FC.width = 160; FC.height = 256; const fx = FC.getContext("2d");
  const foamTex = new THREE.CanvasTexture(FC); foamTex.minFilter = THREE.LinearFilter; foamTex.generateMipmaps = false;
  const rect = new THREE.Vector4(0, 0, W, H);
  function fRect() { const Z = A.zoom(), C = A.CAM; rect.set(C.x - C.x / Z - A.SHK.x - 20, C.y - C.y / Z - A.SHK.y - 30, W / Z + 40, H / Z + 60); }
  function fPos(x, y) { return [(x - rect.x) / rect.z * FC.width, (y - rect.y) / rect.w * FC.height]; }
  const fs = () => FC.width / rect.z;
  function foamDot(x, y, r, a, dark) { const p = fPos(x, y), rr = Math.max(.6, r * fs()); const g = fx.createRadialGradient(p[0], p[1], 0, p[0], p[1], rr);
    const c = dark ? "0,255,0" : "255,0,0"; g.addColorStop(0, "rgba(" + c + "," + a + ")"); g.addColorStop(1, "rgba(" + c + ",0)"); fx.fillStyle = g; fx.beginPath(); fx.arc(p[0], p[1], rr, 0, 7); fx.fill(); }
  function foamRing(x, y, rx, ry, a, w) { const p = fPos(x, y), k = fs(); fx.strokeStyle = "rgba(255,0,0," + a + ")"; fx.lineWidth = Math.max(1, (w || 3) * k); fx.beginPath(); fx.ellipse(p[0], p[1], Math.max(.5, rx * k), Math.max(.5, ry * k), 0, 0, 7); fx.stroke(); }
  function foamLine(x1, y1, x2, y2, a, w) { const p = fPos(x1, y1), q = fPos(x2, y2); fx.strokeStyle = "rgba(255,0,0," + a + ")"; fx.lineWidth = Math.max(1, w * fs()); fx.lineCap = "round"; fx.beginPath(); fx.moveTo(p[0], p[1]); fx.lineTo(q[0], q[1]); fx.stroke(); }

  /* ------------------------------------------------------------ reactive water ----------
     A 72×112 wave-equation height field (6.5 game px a cell) riding on top of the Gerstner swell, kept centred on the
     surfer in water coordinates (it scrolls with the sea, not the camera). The board, paddling, landings, sharks, boats
     and splashes poke it; the result is a wake, rings and ripples that displace the surface and bend its normals.
     CPU-side and tiny (one R8 texture upload a frame), so it costs next to nothing on a phone. */
  const RX = 72, RY = 112, RC = 6.5, RX0 = -34;
  let rA = new Float32Array(RX * RY), rB = new Float32Array(RX * RY), rQ0 = null;
  const rData = new Uint8Array(RX * RY).fill(128), rTex = new THREE.DataTexture(rData, RX, RY, THREE.RedFormat, THREE.UnsignedByteType);
  rTex.magFilter = rTex.minFilter = THREE.LinearFilter; rTex.needsUpdate = true;
  const rO = new THREE.Vector4(RX0, 0, RX * RC, RY * RC);
  function rFollow(q) { const want = Math.round((q - RY * RC * .6) / RC) * RC; if (rQ0 === null || Math.abs(want - rQ0) > RY * RC) { rQ0 = want; rA.fill(0); rB.fill(0); return; }
    const sh = Math.round((want - rQ0) / RC); if (!sh) return; const n = sh * RX;
    if (sh > 0) { rA.copyWithin(0, n); rA.fill(0, rA.length - n); rB.copyWithin(0, n); rB.fill(0, rB.length - n); } else { rA.copyWithin(-n, 0, rA.length + n); rA.fill(0, 0, -n); rB.copyWithin(-n, 0, rB.length + n); rB.fill(0, 0, -n); }
    rQ0 += sh * RC; }
  function poke(x, sy, amt, rad) {   // push the water at a screen point (pre-zoom), radius in px
    if (rQ0 === null) return; const q = sy + G.cam - G.wo, ci = (x - RX0) / RC, cj = (q - rQ0) / RC, r = Math.max(1, (rad || 8) / RC);
    for (let j = Math.max(1, Math.floor(cj - r)); j <= Math.min(RY - 2, Math.ceil(cj + r)); j++) for (let i = Math.max(1, Math.floor(ci - r)); i <= Math.min(RX - 2, Math.ceil(ci + r)); i++) {
      const d2 = ((i - ci) ** 2 + (j - cj) ** 2) / (r * r); if (d2 < 1) rA[j * RX + i] += amt * (1 - d2); } }
  function rStep() {
    for (let it = 0; it < 2; it++) { for (let j = 1; j < RY - 1; j++) for (let i = 1, k = j * RX + 1; i < RX - 1; i++, k++) rB[k] = ((rA[k - 1] + rA[k + 1] + rA[k - RX] + rA[k + RX]) * .5 - rB[k]) * .982; const t = rA; rA = rB; rB = t; }
    for (let k = 0; k < rData.length; k++) { const v = 128 + rA[k] * 22; rData[k] = v < 0 ? 0 : v > 255 ? 255 : v; } rTex.needsUpdate = true; }
  // drifting foam patches: born where the lip crashes, behind the curl and at splashes; they spread, drift and fade
  const foams = []; function foamPatch(x, sy, r, life, vx) { if (foams.length > 70) foams.shift(); foams.push({ x: x, q: sy + G.cam - G.wo, r: r, r0: r, t: 0, life: life, vx: vx || 0 }); }

  /* ------------------------------------------------------------ ocean ---------- */
  // one 256² tiling texture baked at load: rg = detail normal, b = fbm noise (foam breakup), a = caustics. Cheap to sample.
  const NZ = (function () {
    const N = 256, hgt = new Float32Array(N * N), fb = new Float32Array(N * N), data = new Uint8Array(N * N * 4);
    const hash = (x, y, s) => { const h = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return h - Math.floor(h); };
    const vn = (x, y, P, s) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), m = (a) => ((a % P) + P) % P;
      const a = hash(m(xi), m(yi), s), b = hash(m(xi + 1), m(yi), s), c = hash(m(xi), m(yi + 1), s), d = hash(m(xi + 1), m(yi + 1), s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
    const fbmP = (x, y, s) => { let t = 0, a = .5, P = 8; for (let o = 0; o < 5; o++) { t += a * vn(x * P, y * P, P, s + o); a *= .5; P *= 2; } return t; };
    const caus = (u, v) => { const px = u * 6.28318 - 250, py = v * 6.28318 - 250; let ix = px, iy = py, c = 1; const inten = .005;
      for (let n = 0; n < 4; n++) { const t = 1.7 * (1 - 3.5 / (n + 1)), nx = px + Math.cos(t - ix) + Math.sin(t + iy), ny = py + Math.sin(t - iy) + Math.cos(t + ix); ix = nx; iy = ny; c += 1 / Math.hypot(px / (Math.sin(ix + t) / inten), py / (Math.cos(iy + t) / inten)); }
      c /= 4; c = 1.17 - Math.pow(Math.abs(c), 1.4); return Math.pow(Math.abs(c), 8); };
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { hgt[y * N + x] = fbmP(x / N, y / N, 1); fb[y * N + x] = fbmP(x / N, y / N, 9); }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = y * N + x, l = hgt[y * N + (x + N - 1) % N], r = hgt[y * N + (x + 1) % N], u = hgt[((y + N - 1) % N) * N + x], d = hgt[((y + 1) % N) * N + x];
      data[i * 4] = Math.max(0, Math.min(255, 128 + (l - r) * 1400)); data[i * 4 + 1] = Math.max(0, Math.min(255, 128 + (u - d) * 1400)); data[i * 4 + 2] = fb[i] * 255; data[i * 4 + 3] = Math.min(255, caus(x / N, y / N) * 255); }
    const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true; return t;
  })();
  const GLSL_NOISE = `
    float h1(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h1(i),h1(i+vec2(1,0)),f.x),mix(h1(i+vec2(0,1)),h1(i+1.),f.x),f.y);}
    float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*n2(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}`;
  const WAVES = [[0.08, 1, 300, 7.5, 34], [-0.38, 1, 170, 4.2, 28], [0.55, 0.85, 96, 2.0, 22], [-0.8, 0.6, 61, 1.1, 18], [0.3, 1, 39, 0.55, 15]];
  const waveGLSL = WAVES.map((w, i) => { const l = Math.hypot(w[0], w[1]); return `gw(q,vec2(${(w[0] / l).toFixed(4)},${(w[1] / l).toFixed(4)}),${w[2].toFixed(1)},${w[3].toFixed(2)}*amp,${w[4].toFixed(1)},P,Nn);`; }).join("\n");
  const oceanMat = new THREE.ShaderMaterial({
    lights: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.lights, { uT: { value: 0 }, uScroll: { value: 0 }, uShore: { value: 0 }, uK: { value: K }, uHurt: { value: 0 },
      uFoam: { value: null }, uRect: { value: new THREE.Vector4() }, uSun: { value: LIGHT.clone() }, uView: { value: VIEW.clone() } }]),
    vertexShader: `
      #include <common>
      #include <shadowmap_pars_vertex>
      uniform float uT,uScroll,uShore,uK;uniform sampler2D uRip;uniform vec4 uRipO; varying float vR; varying vec3 vW; varying vec3 vN; varying float vH; varying vec2 vQ; varying float vD;
      void gw(vec2 q,vec2 d,float L,float A,float spd,inout vec3 P,inout vec3 Nn){float k=6.2831853/L,f=k*(dot(d,q)-spd*uT),Q=.55;
        P.x+=Q*A*d.x*cos(f);P.z+=Q*A*d.y*cos(f);P.y+=A*sin(f);Nn.x-=d.x*k*A*cos(f);Nn.z-=d.y*k*A*cos(f);Nn.y-=Q*k*A*sin(f);}
      void main(){
        vec4 wp0=modelMatrix*vec4(position,1.);float sy=wp0.z/uK;vec2 q=vec2(wp0.x,sy+uScroll);
        float d=uShore-sy;float amp=smoothstep(-20.,170.,d);
        vec3 P=vec3(0.),Nn=vec3(0.,1.,0.);
        ${waveGLSL}
        vec2 ru=vec2((wp0.x-uRipO.x)/uRipO.z,(q.y-uRipO.y)/uRipO.w);float rp=0.;
        if(ru.x>0.&&ru.x<1.&&ru.y>0.&&ru.y<1.){rp=(texture2D(uRip,ru).r-.5)*2.*smoothstep(0.,.08,min(min(ru.x,1.-ru.x),min(ru.y,1.-ru.y)));}
        P.y+=rp*7.;vR=rp;
        vec4 worldPosition=vec4(wp0.x+P.x,P.y,wp0.z+P.z*uK,1.);
        vW=worldPosition.xyz;vN=normalize(vec3(Nn.x,Nn.y,Nn.z/uK));vH=P.y;vQ=q;vD=d;
        vec3 transformedNormal=normalMatrix*vN;
        #include <shadowmap_vertex>
        gl_Position=projectionMatrix*viewMatrix*worldPosition;}`,
    fragmentShader: `
      #include <common>
      #include <packing>
      #include <lights_pars_begin>
      #include <shadowmap_pars_fragment>
      #include <shadowmask_pars_fragment>
      uniform float uT,uHurt,uK;uniform sampler2D uFoam,uNz,uRip;uniform vec4 uRect,uRipO;uniform vec3 uSun,uView;varying float vR;
      varying vec3 vW;varying vec3 vN;varying float vH;varying vec2 vQ;varying float vD;
      vec3 s2l(vec3 c){return pow(c,vec3(2.2));}
      void main(){
        vec2 q=vQ/400.;float d=vD;
        // detail normal: two drifting noise layers on top of the swell
        vec4 t1=texture2D(uNz,q*1.6+vec2(uT*.010,-uT*.028)),t2=texture2D(uNz,q*5.3+vec2(-uT*.04,-uT*.06)+.37);
        vec2 ru=vec2((vW.x-uRipO.x)/uRipO.z,(vQ.y-uRipO.y)/uRipO.w),re=vec2(1./72.,1./112.);vec2 rg=vec2(0.);
        if(ru.x>.02&&ru.x<.98&&ru.y>.02&&ru.y<.98)rg=vec2(texture2D(uRip,ru+vec2(re.x,0.)).r-texture2D(uRip,ru-vec2(re.x,0.)).r,texture2D(uRip,ru+vec2(0.,re.y)).r-texture2D(uRip,ru-vec2(0.,re.y)).r)*2.2;
        vec3 N=normalize(vN+vec3((t1.r-.5)*.55+(t2.r-.5)*.3-rg.x,0.,(t1.g-.5)*.55+(t2.g-.5)*.3-rg.y));
        float dep=clamp(d/340.,0.,1.);float m=dep*dep*14.+.15;
        vec3 sand=s2l(vec3(.86,.77,.58));float cz=dep<.75?min(texture2D(uNz,q*1.9+N.xz*.03+vec2(uT*.017,0.)).a,texture2D(uNz,q*2.15+N.xz*.03+vec2(.5,.5-uT*.021)).a)*2.2:0.;vec3 bed=sand*(.75+cz*1.5*(1.-dep));
        vec3 tr=exp(-vec3(.42,.085,.055)*m);vec3 scat=s2l(vec3(.03,.36,.50));vec3 body=bed*tr+scat*(1.-tr);
        float F=.02+.98*pow(1.-clamp(dot(N,uView),0.,1.),5.);vec3 R=reflect(-uView,N);
        vec3 sky=mix(s2l(vec3(.70,.86,.97)),s2l(vec3(.30,.55,.88)),clamp(R.y,0.,1.));
        float sh=getShadowMask();
        vec3 c=mix(body*(.55+.45*sh),sky,clamp(F*1.6+.04,0.,.6));
        vec3 Hh=normalize(uSun+uView);float nh=clamp(dot(N,Hh),0.,1.);
        c+=s2l(vec3(1.,.93,.78))*(pow(nh,260.)*1.6+pow(nh,1600.)*10.*step(.78,t2.b))*sh;
        c+=s2l(vec3(.06,.40,.33))*smoothstep(2.,9.,vH)*(.35+.4*dep);             // light through the crests
        // foam: whitecaps, the swash on the sand, and the foam canvas (wake, spray, collars)
        vec2 fu=vec2((vW.x-uRect.x)/uRect.z,1.-(vW.z/uK-uRect.y)/uRect.w);vec4 ft=texture2D(uFoam,fu);
        float brk=t1.b;
        float wc=smoothstep(12.5,16.,vH+(t2.b-.5)*6.)*smoothstep(.45,.7,t2.b)*dep*.6;
        float sw=smoothstep(14.,0.,abs(d-6.-5.*sin(uT*.9)))*.9+smoothstep(60.,0.,d)*step(0.,d)*smoothstep(.55,.75,texture2D(uNz,vQ*.0021+vec2(0.,-uT*.013)).b)*.7;
        float fo=clamp(wc+sw+ft.r*(.55+.6*brk)+smoothstep(.35,.8,abs(vR))*.35*brk,0.,1.);
        c*=1.-ft.g*.55;                                                               // dark shapes under the surface
        c=mix(c,s2l(vec3(.95,.98,1.))*(.75+.25*sh),fo);
        if(d<0.){c=mix(s2l(vec3(.72,.62,.45)),sand,clamp(-d/30.,0.,1.))*(.6+.4*sh);}
        c*=1.+uHurt*.15;
        gl_FragColor=vec4(c,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  oceanMat.uniforms.uFoam.value = foamTex; oceanMat.uniforms.uNz = { value: NZ }; oceanMat.uniforms.uRip = { value: rTex }; oceanMat.uniforms.uRipO = { value: rO };
  const oceanGeo = new THREE.PlaneGeometry(1, 1, 150, 190); oceanGeo.rotateX(-Math.PI / 2);
  const ocean = new THREE.Mesh(oceanGeo, oceanMat); ocean.receiveShadow = true; ocean.frustumCulled = false; scene.add(ocean);

  /* ------------------------------------------------------------ the rideable wave + the incoming whitewater walls ----------
     One grid (x across the screen, s along the cross-section) bent into a wave in the vertex shader. uPx/uPd = the curl and
     the way it peels (from game.js G.wv), so the open face, the curl, the whitewater behind it and the closeout all line up
     with the 2D pocket logic. Mode 1 = an all-whitewater wall rolling in (the paddle-out sets). */
  function makeWaveMat() {
    return new THREE.ShaderMaterial({ side: THREE.DoubleSide,
      uniforms: { uT: { value: 0 }, uPx: { value: 200 }, uPd: { value: 1 }, uCz: { value: 0 }, uH: { value: 58 }, uFz: { value: 62 }, uBack: { value: 118 }, uClose: { value: 0 }, uMode: { value: 0 }, uSun: { value: LIGHT.clone() }, uView: { value: VIEW.clone() }, uFade: { value: 1 }, uNz: { value: NZ } },
      vertexShader: `
        uniform float uT,uPx,uPd,uCz,uH,uFz,uClose,uMode,uBack;varying float vS;varying float vBr;varying float vY;varying vec3 vN;varying vec3 vW;varying float vLip;varying float vHh;
        ${GLSL_NOISE}
        vec3 prof(float x,float s){
          float u=(x-uPx)*uPd;
          float br=max(max(smoothstep(12.,-46.,u),uClose),uMode);
          float curl=(1.-br)*smoothstep(-24.,10.,u)*(1.-smoothstep(70.,300.,u));
          float H=uH*mix(1.,.42,smoothstep(70.,460.,u)*(1.-uMode))*mix(1.,mix(.5,1.,uMode),br);
          H+=br*(sin(x*.07+uT*3.)*2.6+sin(x*.19-uT*4.3)*1.6+(n2(vec2(x*.05,uT*1.5))-.5)*5.);
          float r=H*.34*curl+.01,ph=3.1416*1.12*curl;
          vec2 p;
          if(s<.42){float a=s/.42;p=vec2(-uBack*(1.-a)-6.*br,H*(1.-(1.-a)*(1.-a)));}
          else if(s<.66){float a=(s-.42)/.24;float f=a*ph;p=vec2(r*sin(f)+8.*curl*a,H-r*(1.-cos(f)));}
          else{float a=(s-.66)/.34;vec2 st=vec2(r*sin(ph)+8.*curl,H-r*(1.-cos(ph)));float fz=uFz*mix(1.,.8,br);
            float yy=st.y*pow(1.-a,1.5+br);p=vec2(mix(st.x,fz,a)+br*8.*sin(a*3.1416),yy);}
          return vec3(x,p.y,uCz+p.x);}
        void main(){
          float x=position.x,s=position.y;vec3 P=prof(x,s),Px=prof(x+3.,s),Ps=prof(x,min(1.,s+.01));
          vec3 n=normalize(cross(Ps-P,Px-P));if(n.y<0.)n=-n;
          float u=(x-uPx)*uPd;vBr=max(max(smoothstep(12.,-46.,u),uClose),uMode);vS=s;vY=P.y;vN=n;vLip=smoothstep(.5,.66,s)*(1.-smoothstep(.66,.74,s));vHh=uH;
          vec4 w=modelMatrix*vec4(P,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
      fragmentShader: `
        uniform float uT,uFade;uniform vec3 uSun,uView;uniform sampler2D uNz;varying float vS;varying float vBr;varying float vY;varying vec3 vN;varying vec3 vW;varying float vLip;varying float vHh;
        ${GLSL_NOISE}
        vec3 s2l(vec3 c){return pow(c,vec3(2.2));}
        void main(){
          vec3 N=normalize(vN);float t=clamp(vY/max(vHh,1.),0.,1.2);
          vec3 deep=s2l(vec3(.02,.26,.40)),lit=s2l(vec3(.30,.90,.80));
          vec3 c=vS>.42?mix(deep,lit,smoothstep(.05,.9,t)):mix(s2l(vec3(.06,.42,.52)),s2l(vec3(.14,.62,.66)),t);
          float dif=clamp(dot(N,uSun),0.,1.);c*=.72+.45*dif;
          c+=s2l(vec3(.5,.9,.8))*smoothstep(.55,.95,t)*step(.42,vS)*.25*(1.-vBr);   // light through the thin top of the face
          vec3 Hh=normalize(uSun+uView);c+=s2l(vec3(1.,.95,.8))*pow(clamp(dot(N,Hh),0.,1.),120.)*.9;
          float F=.02+.98*pow(1.-clamp(dot(N,uView),0.,1.),5.);c=mix(c,s2l(vec3(.75,.88,.98)),F*.5);
          float nz=texture2D(uNz,vW.xz*vec2(.0045,.009)+vec2(uT*.03,-uT*.12)).b;
          float streak=smoothstep(.55,.8,texture2D(uNz,vec2(vW.x*.004,vS*.7-uT*.07)).b)*smoothstep(.62,.68,vS)*(1.-smoothstep(.7,.8,vS))*.9;
          float base=smoothstep(.95,1.,vS)*.45;
          float foam=clamp(vBr*(.3+smoothstep(.3,.7,nz)*.55+smoothstep(.2,.9,t)*.25)+vLip*.85+streak+base*(.5+nz),0.,1.);
          float nz2=texture2D(uNz,vW.xz*vec2(.013,.02)+vec2(uT*.05,-uT*.3)).b;
          vec3 fc=s2l(vec3(.96,.99,1.))*(.55+.35*dif)*(.62+.6*nz2)+s2l(vec3(.1,.25,.3))*(1.-nz)*.15;
          c=mix(c,fc,foam);
          gl_FragColor=vec4(c,uFade*smoothstep(0.,.14,vS));
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`, transparent: true });
  }
  function makeWaveGeo() {
    const nx = 130, ns = 52, pos = [], idx = [];
    for (let j = 0; j <= ns; j++) for (let i = 0; i <= nx; i++) pos.push(-520 + i / nx * 1440, j / ns, 0);
    for (let j = 0; j < ns; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); return g;
  }
  const waveGeo = makeWaveGeo();
  const rideWave = new THREE.Mesh(waveGeo, makeWaveMat()); rideWave.frustumCulled = false; rideWave.visible = false; rideWave.renderOrder = 1; scene.add(rideWave);
  const wallPool = [0, 1, 2, 3].map(() => { const m = new THREE.Mesh(waveGeo, makeWaveMat()); m.material.uniforms.uMode.value = 1; m.material.uniforms.uH.value = 21; m.material.uniforms.uFz.value = 34; m.material.uniforms.uBack.value = 40; m.frustumCulled = false; m.visible = false; m.renderOrder = 1; scene.add(m); return m; });

  /* ------------------------------------------------------------ the beach: the same aerial, lit, with mirrored edges ---------- */
  const shoreTex = imgTex("shore");
  const shoreMat = new THREE.MeshStandardMaterial({ map: shoreTex, transparent: true, roughness: .95, metalness: 0, depthWrite: false });
  if (shoreTex) { shoreTex.wrapS = shoreTex.wrapT = THREE.MirroredRepeatWrapping; shoreTex.anisotropy = 4; }
  const shoreGeo = new THREE.BufferGeometry(); const shore = new THREE.Mesh(shoreGeo, shoreMat); shore.receiveShadow = true; shore.renderOrder = 2; scene.add(shore);
  let shoreKey = "";
  function shoreBuild(h) {   // x: -W..2W (u -1..2 mirrored), rows: the cropped aerial, then mirrored below it
    const c0 = .16, hh = h * (1 - c0), xs = [-W, 0, W, 2 * W], rows = [[0, 1 - c0], [hh, 0], [2 * hh, 1 - c0]], pos = [], uv = [], idx = [];
    rows.forEach(r => xs.forEach(x => { pos.push(x, 0, r[0]); uv.push(x / W, r[1]); }));
    for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) { const a = j * 4 + i, b = a + 1, c = a + 4, d = c + 1; idx.push(a, c, b, b, c, d); }
    shoreGeo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); shoreGeo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    shoreGeo.setAttribute("normal", new THREE.Float32BufferAttribute(pos.map((v, i) => i % 3 === 1 ? 1 : 0), 3)); shoreGeo.setIndex(idx); shoreGeo.computeBoundingSphere();
  }
  // palms: a trunk and the crown sprite lifted off the sand (they cast real shadows), swaying, bending in the heli downwash
  const PALMS = [[.27, .49], [.24, .535], [.35, .55], [.69, .49], [.715, .53], [.20, .77], [.33, .68], [.64, .705], [.67, .86], [.40, .82], [.91, .95], [.08, .66]];
  const palmTex = imgTex("palm"), palms = new THREE.Group(); scene.add(palms);
  const trunkGeo = new THREE.CylinderGeometry(1.1, 1.8, 1, 6); trunkGeo.translate(0, .5, 0);
  const trunkMat = new THREE.MeshStandardMaterial({ color: lin("#7a5a3a"), roughness: 1 });
  const crownGeo = new THREE.PlaneGeometry(1, 1); crownGeo.rotateX(-Math.PI / 2);
  const crownMat = new THREE.MeshStandardMaterial({ map: palmTex, transparent: true, alphaTest: .35, roughness: .9, side: THREE.DoubleSide });
  PALMS.forEach((p, i) => { const g = new THREE.Group(), tr = new THREE.Mesh(trunkGeo, trunkMat), cr = new THREE.Mesh(crownGeo, crownMat);
    tr.scale.set(1, 20, 1); tr.castShadow = true; cr.position.y = 20; const s = 40; cr.scale.set(s, 1, s * (palmTex ? palmTex.image.naturalHeight / palmTex.image.naturalWidth : 1)); cr.castShadow = true;
    g.add(tr, cr); g.userData = { p: p, i: i, cr: cr }; palms.add(g); });
  // people on the sand: the waving lifeguard (3D model), the other lifeguard + the Nalu Vida staff as upright cut-outs
  const lady = new THREE.Group(); scene.add(lady);
  if (gLady) { const m = gLady.scene; fitHeight(m, 82); m.traverse(o => { if (o.isMesh) { o.castShadow = true; o.material.roughness = .8; } }); lady.add(m); }
  const card = (k, h) => { const t = imgTex(k); if (!t) return null; const m = new THREE.Mesh(new THREE.PlaneGeometry(h * t.image.naturalWidth / t.image.naturalHeight, h), new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: .3, side: THREE.DoubleSide, roughness: .9 }));
    m.geometry.translate(0, h / 2, 0); m.rotation.x = -(Math.PI / 2 - TILT) * 0; m.castShadow = true; scene.add(m); return m; };
  const guardM = card("lifeguard_m", 40), staff1 = card("staff", 44), staff2 = card("staff", 42);
  // Nalu Vida glows on the aerial
  const naluLight = new THREE.PointLight(lin("#ffb35c"), 0, 260, 1.4); scene.add(naluLight);
  const glowTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d"), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); return t; })();
  const naluGlow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: glowTex, color: lin("#ffc070"), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); naluGlow.renderOrder = 3; scene.add(naluGlow);

  /* ------------------------------------------------------------ the pier: deck, pilings, rails, a lit end platform ---------- */
  const pierTex = imgTex("pier"); if (pierTex) { pierTex.wrapS = pierTex.wrapT = THREE.RepeatWrapping; }
  const deckH = 15, PW = A.PIER_W * 1.15;
  const mDeckTop = new THREE.MeshStandardMaterial({ map: pierTex, color: pierTex ? 0xffffff : lin("#cfc9bd"), roughness: .9 });
  const mWood = new THREE.MeshStandardMaterial({ color: lin("#8a8378"), roughness: .95 });
  const mPile = new THREE.MeshStandardMaterial({ color: lin("#4b463f"), roughness: 1 });
  const mLamp = new THREE.MeshStandardMaterial({ color: lin("#fff3c4"), emissive: lin("#ffd98a"), emissiveIntensity: 1.6 });
  const pileGeo = new THREE.CylinderGeometry(1.7, 1.9, 1, 6); pileGeo.translate(0, .5, 0);
  function makePier(len) {   // local: runs along +z from 0 to len, deck centred on x = 0
    const g = new THREE.Group();
    const deck = new THREE.Mesh(new THREE.BoxGeometry(PW, 3.5, len), [mWood, mWood, mDeckTop, mWood, mWood, mWood]); deck.position.set(0, deckH, len / 2); deck.castShadow = deck.receiveShadow = true;
    if (pierTex) { const t = pierTex.clone(); t.needsUpdate = true; t.repeat.set(1, len / (PW * pierTex.image.naturalHeight / pierTex.image.naturalWidth)); deck.material = [mWood, mWood, new THREE.MeshStandardMaterial({ map: t, roughness: .9 }), mWood, mWood, mWood]; disposables.push(t, deck.material[2]); }
    g.add(deck);
    const n = Math.max(1, Math.floor(len / 64)), piles = new THREE.InstancedMesh(pileGeo, mPile, (n + 1) * 2), mt = new THREE.Matrix4();
    for (let i = 0; i <= n; i++) for (let s = 0; s < 2; s++) { mt.compose(new THREE.Vector3((s ? 1 : -1) * (PW / 2 - 1.5), -26, 30 + i * 64 > len ? len - 4 : 30 + i * 64), new THREE.Quaternion(), new THREE.Vector3(1, deckH + 26, 1)); piles.setMatrixAt(i * 2 + s, mt); }
    piles.castShadow = true; g.add(piles);
    for (const s of [-1, 1]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(1, 1, len), mWood); rail.position.set(s * (PW / 2 - .5), deckH + 6, len / 2); rail.castShadow = true; g.add(rail);
      const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 6, 1), mWood, Math.ceil(len / 22)); for (let i = 0; i < posts.count; i++) { mt.makeTranslation(s * (PW / 2 - .5), deckH + 3, i * 22 + 4); posts.setMatrixAt(i, mt); } g.add(posts); }
    const cap = new THREE.Mesh(new THREE.BoxGeometry(PW * 2, 4, 30), mWood); cap.position.set(0, deckH - .2, len); cap.castShadow = cap.receiveShadow = true; g.add(cap);
    for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.SphereGeometry(2.2, 8, 6), mLamp); l.position.set(s * (PW - 4), deckH + 10, len - 8); g.add(l); const p = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, 9), mPile); p.position.set(s * (PW - 4), deckH + 5, len - 8); g.add(p); }
    g.userData.len = len; return g;
  }
  const stubLen = (A.STUB + 60) * K, stub = makePier(stubLen); scene.add(stub);
  const pierSecs = new Map();

  /* ------------------------------------------------------------ the surfer (rigged, animated) + board ---------- */
  const rig = new THREE.Group(); scene.add(rig);          // ground point, yaw
  const lift = new THREE.Group(); rig.add(lift);          // air height + trick rotations + lean
  const body = new THREE.Group(); lift.add(body);
  const boardG = new THREE.Group(); scene.add(boardG);
  const board = makeBoard(); boardG.add(board);
  // the board always draws under the rider: it renders first and is pushed back in depth, so his feet never sink into the deck
  board.traverse(o => { if (o.isMesh) { o.renderOrder = -1; const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(m => { m.polygonOffset = true; m.polygonOffsetFactor = 2; m.polygonOffsetUnits = 2; }); } });
  let mixer = null, act = {}, skinMats = [], bones = {}, marks = [];
  if (gSurf) {
    const m = gSurf.scene; fitHeight(m, 66); body.add(m);
    m.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; o.material = o.material.clone(); skinMats.push(o.material); o.material.userData.c0 = o.material.color.clone(); } if (o.isBone) bones[o.name] = o; });
    mixer = new THREE.AnimationMixer(m);
    gSurf.animations.forEach(c => { const a = mixer.clipAction(c); a.play(); a.setEffectiveWeight(0); act[c.name] = a; });
    if (act.flip) { act.flip.timeScale = 0; }
    // cartoon damage on the 3D body: bruise patches and bandage wraps parented to bones (purple / beige, never blood)
    const wsc = new THREE.Vector3(); m.updateMatrixWorld(true);
    const bm = new THREE.MeshStandardMaterial({ color: lin("#6a3c8f"), transparent: true, opacity: .55, roughness: .8, depthWrite: false });
    const wm = new THREE.MeshStandardMaterial({ color: lin("#f3d7a8"), roughness: .9 });
    [["Spine02", "b", 5.2, [0, 0, 0]], ["LeftArm", "b", 2.1, [0, 0, 0]], ["RightUpLeg", "b", 3.0, [0, 0, 0]], ["Spine01", "b", 4.6, [0, 0, 0]], ["RightArm", "b", 2.1, [0, 0, 0]],
      ["LeftForeArm", "w", 1.6], ["RightUpLeg", "w", 3.1], ["Spine02", "w", 5.0], ["LeftUpLeg", "w", 3.1]].forEach((d, i) => {
      const bn = bones[d[0]]; if (!bn) return; bn.getWorldScale(wsc); const s = 1 / (wsc.x || 1);
      let mk; if (d[1] === "b") { mk = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), bm); mk.scale.set(d[2] * 1.12 * s, d[2] * .55 * s, d[2] * 1.12 * s); }
      else { mk = new THREE.Mesh(new THREE.CylinderGeometry(d[2] * 1.12, d[2] * 1.12, d[2] * .9, 12, 1, true), wm); mk.scale.setScalar(s); }
      mk.visible = false; mk.userData.kind = d[1]; mk.position.y = (d[1] === "w" ? 4 : 2) * s; bn.add(mk); marks.push(mk); });
  }
  let yawV = Math.PI, lastP = null, carry = 0, swimW = 0, runW = 0, balW = 0, fallW = 0, airW = 0, wipeT = 0;

  /* ------------------------------------------------------------ sea life, boats, props ---------- */
  const ents = new Map();
  const sharkProto = gShark ? gShark.scene : null;
  const sharkUniforms = { uT: { value: 0 } };
  function sharkMat(src, tint) { const m = src.clone(); m.color = (src.color ? src.color.clone() : new THREE.Color(1, 1, 1)).multiply(tint); m.roughness = .55; m.side = THREE.DoubleSide; m.emissive = new THREE.Color(.045, .06, .075);   // (the lifted mesh has mixed winding; a little lift so the dark back reads)
    m.onBeforeCompile = (sh) => { sh.uniforms.uT = sharkUniforms.uT; sh.uniforms.uSw = m.userData.uSw = { value: 1 };
      sh.vertexShader = "uniform float uT,uSw;\n" + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n float tl=smoothstep(.25,-.5,position.z);transformed.x+=sin(position.z*5.5-uT*9.*uSw)*.07*uSw*(.25+tl);"); };
    m.userData.uSw = { value: 1 }; return m; }
  const sharkBaseMat = sharkProto ? (() => { let mm = null; sharkProto.traverse(o => { if (o.isMesh && !mm) mm = o.material; }); if (sharkProto) sharkProto.traverse(o => { if (o.isMesh) o.geometry.computeVertexNormals(); }); return mm; })() : null;
  function makeShark(size, tint) {
    const g = new THREE.Group(); if (!sharkProto) { const m = new THREE.Mesh(new THREE.CapsuleGeometry(.12, .7, 4, 8).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: lin("#5d6b77") })); g.add(m); }
    else { const m = sharkProto.clone(true); const mat = sharkMat(sharkBaseMat, tint); m.traverse(o => { if (o.isMesh) { o.material = mat; o.castShadow = true; } }); g.userData.mat = mat; g.add(m); }
    g.scale.setScalar(size); return g;
  }
  const jellyProto = gJelly ? gJelly.scene : null; if (jellyProto) jellyProto.traverse(o => { if (o.isMesh) { o.material.transparent = true; o.material.opacity = .88; o.material.emissive = lin("#c14fd8"); o.material.emissiveIntensity = .35; } });
  const boatProto = gBoat ? gBoat.scene : null; if (boatProto) boatProto.traverse(o => { if (o.isMesh) { o.castShadow = true; o.material.roughness = .45; } });
  const oysProto = gOys ? gOys.scene : null;
  const foodTex = {};
  function foodPlateTex(k) {   // the food off the raft sprite, cropped round onto a plate
    if (foodTex[k] !== undefined) return foodTex[k]; const i = IM[k]; if (!i || !i.naturalWidth) return null;
    const c = document.createElement("canvas"); c.width = c.height = 128; const x = c.getContext("2d"), s = Math.min(i.naturalWidth, i.naturalHeight) * .56;
    x.beginPath(); x.arc(64, 64, 62, 0, 7); x.clip(); x.drawImage(i, i.naturalWidth / 2 - s / 2, i.naturalHeight / 2 - s / 2, s, s, 0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return (foodTex[k] = t);
  }
  const bambooMat = new THREE.MeshStandardMaterial({ color: lin("#c99a55"), roughness: .75 }), ropeMat = new THREE.MeshStandardMaterial({ color: lin("#8a6a3a"), roughness: 1 });
  const logGeo = new THREE.CylinderGeometry(3.3, 3.3, 50, 8).rotateX(Math.PI / 2), barGeo = new THREE.CylinderGeometry(1.6, 1.6, 50, 6).rotateZ(Math.PI / 2);
  function makeRaft(k, gold) {
    const g = new THREE.Group();
    for (let i = 0; i < 7; i++) { const l = new THREE.Mesh(logGeo, bambooMat); l.position.set(-21 + i * 7, 2, 0); l.castShadow = true; g.add(l); }
    for (const z of [-17, 17]) { const b = new THREE.Mesh(barGeo, ropeMat); b.position.set(0, 5.5, z); g.add(b); }
    if (k === "raft_oysters" && oysProto) { const o = oysProto.clone(true); fitWidth(o, 34); o.position.y = 7; g.add(o); }
    else { const plate = new THREE.Mesh(new THREE.CylinderGeometry(17, 15, 2.4, 28), [new THREE.MeshStandardMaterial({ color: lin("#e9f3f2"), roughness: .4 }), new THREE.MeshStandardMaterial({ map: foodPlateTex(k), roughness: .7 }), new THREE.MeshStandardMaterial({ color: lin("#e9f3f2") })]);
      plate.position.y = 7.6; plate.castShadow = true; g.add(plate);
      const ft = foodPlateTex(k); if (ft) { const heap = new THREE.Mesh(new THREE.SphereGeometry(12, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ map: ft, roughness: .65 })); heap.scale.y = .45; heap.position.y = 8.6; heap.castShadow = true; g.add(heap); } }
    if (gold) g.traverse(o => { if (o.isMesh && o.material && !Array.isArray(o.material)) { o.material = o.material.clone(); o.material.emissive = lin("#ffb300"); o.material.emissiveIntensity = .55; } });
    return g;
  }
  function makeEel() {
    const pts = []; for (let i = 0; i <= 24; i++) pts.push(new THREE.Vector3(-46 + i * 92 / 24, 0, 0));
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 5.6, 8, false);
    const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), f = .35 + .65 * Math.sin(Math.min(1, (x + 46) / 92) * Math.PI) ** .5; p.setY(i, p.getY(i) * f); p.setZ(i, p.getZ(i) * f); } geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ color: lin("#1d2b33"), roughness: .35, metalness: .1, emissive: lin("#4fd9ff"), emissiveIntensity: 0 });
    mat.onBeforeCompile = (sh) => { sh.uniforms.uT = sharkUniforms.uT; sh.vertexShader = "uniform float uT;\n" + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n transformed.z+=sin(position.x*.12+uT*8.)*7.;"); };
    const m = new THREE.Mesh(geo, mat); m.castShadow = true; const g = new THREE.Group(); g.add(m); g.userData.mat = mat; return g;
  }
  function makeRay() {
    const sh = new THREE.Shape(); sh.moveTo(0, -20); sh.quadraticCurveTo(18, -12, 26, 2); sh.quadraticCurveTo(13, 12, 0, 15); sh.quadraticCurveTo(-13, 12, -26, 2); sh.quadraticCurveTo(-18, -12, 0, -20);
    const geo = new THREE.ShapeGeometry(sh, 10); geo.rotateX(-Math.PI / 2);   // nose toward -z
    const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d"); const gr = x.createRadialGradient(32, 30, 2, 32, 32, 34); gr.addColorStop(0, "#a88a68"); gr.addColorStop(1, "#6e5641"); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    x.fillStyle = "rgba(240,220,180,.6)"; [[20, 30], [42, 32], [30, 40], [36, 22], [48, 40], [16, 40]].forEach(p => { x.beginPath(); x.arc(p[0], p[1], 2.2, 0, 7); x.fill(); });
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const uv = geo.attributes.uv, p = geo.attributes.position; for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + 26) / 52, (p.getZ(i) + 20) / 35);
    const mat = new THREE.MeshStandardMaterial({ map: t, roughness: .7, side: THREE.DoubleSide });
    mat.onBeforeCompile = (s) => { s.uniforms.uT = sharkUniforms.uT; s.vertexShader = "uniform float uT;\n" + s.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n transformed.y+=sin(uT*7.)*abs(position.x)*.16;"); };
    const g = new THREE.Group(), m = new THREE.Mesh(geo, mat); m.castShadow = true; g.add(m);
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(.5, 1.1, 32, 5).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: lin("#5b4636") })); tail.position.z = -30; g.add(tail); g.userData.tail = tail; return g;
  }
  function makeHeli() {
    const g = new THREE.Group(), white = new THREE.MeshStandardMaterial({ color: lin("#eef2f5"), roughness: .35, metalness: .2 }), orange = new THREE.MeshStandardMaterial({ color: lin("#ff6a2b"), roughness: .4 }), dark = new THREE.MeshStandardMaterial({ color: lin("#2a2e35"), roughness: .5 }), glass = new THREE.MeshStandardMaterial({ color: lin("#1b3d57"), roughness: .1, metalness: .4 });
    const hull = new THREE.Mesh(new THREE.CapsuleGeometry(8, 18, 6, 12).rotateX(Math.PI / 2), white); hull.castShadow = true; g.add(hull);
    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(8.2, 8.2, 5, 12, 1, true).rotateX(Math.PI / 2), orange); stripe.position.z = -2; g.add(stripe);
    const win = new THREE.Mesh(new THREE.SphereGeometry(7.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2), glass); win.position.set(0, 1.5, 12); g.add(win);
    const boom = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.8, 32, 8).rotateX(Math.PI / 2), white); boom.position.z = -30; boom.castShadow = true; g.add(boom);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(1, 10, 6), orange); fin.position.set(0, 4, -45); g.add(fin);
    const tr = new THREE.Mesh(new THREE.BoxGeometry(.6, 12, 1.4), dark); tr.position.set(1.6, 4, -45); g.add(tr); g.userData.tr = tr;
    for (const s of [-1, 1]) { const sk = new THREE.Mesh(new THREE.CylinderGeometry(.7, .7, 30, 6).rotateX(Math.PI / 2), dark); sk.position.set(s * 7, -10, 2); g.add(sk); }
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 5), dark); mast.position.y = 9; g.add(mast);
    const rotor = new THREE.Group(); rotor.position.y = 11.5; g.add(rotor); g.userData.rotor = rotor;
    for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(2.4, .5, 32), dark); b.position.z = 16; const h = new THREE.Group(); h.rotation.y = i * Math.PI / 2; h.add(b); rotor.add(h); b.castShadow = true; }
    const disc = new THREE.Mesh(new THREE.CircleGeometry(33, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x222830, transparent: true, opacity: .16, depthWrite: false })); rotor.add(disc);
    return g;
  }
  function makeBuoy() {
    const g = new THREE.Group(), can = new THREE.Mesh(new THREE.CapsuleGeometry(6.5, 26, 6, 12).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: lin("#e5262e"), roughness: .45 }));
    can.castShadow = true; g.add(can); for (const x of [-7, 7]) { const r = new THREE.Mesh(new THREE.TorusGeometry(6.7, .9, 6, 16).rotateY(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xffffff })); r.position.x = x; g.add(r); } return g;
  }
  const rockMat = new THREE.MeshStandardMaterial({ color: lin("#77716a"), roughness: .9, flatShading: true });
  function makeRock(e) {
    const g = new THREE.Group();
    e.bs.forEach((b, i) => { const geo = new THREE.IcosahedronGeometry(1, 1), p = geo.attributes.position; for (let k = 0; k < p.count; k++) { const j = .8 + .3 * Math.abs(Math.sin(k * 12.9898 + i * 78.233 + b.r)); p.setXYZ(k, p.getX(k) * j, p.getY(k) * j * .75, p.getZ(k) * j); } geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, rockMat); m.scale.setScalar(b.r); m.position.set(b.dx, b.r * .25, b.dy * K); m.castShadow = m.receiveShadow = true; g.add(m); });
    return g;
  }
  function makeSign() {
    const g = new THREE.Group(), fl = new THREE.Mesh(new THREE.CylinderGeometry(20, 22, 7, 20), new THREE.MeshStandardMaterial({ color: lin("#e3262f"), roughness: .5 })); fl.position.y = 2; g.add(fl);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(20.3, 22.3, 2.4, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0xffffff })); band.position.y = 2; g.add(band);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 92), new THREE.MeshStandardMaterial({ color: lin("#c9d0e2"), metalness: .5, roughness: .4 })); pole.position.y = 48; pole.castShadow = true; g.add(pole);
    const c = document.createElement("canvas"); c.width = 256; c.height = 200; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Mesh(new THREE.PlaneGeometry(96, 75), new THREE.MeshBasicMaterial({ map: t, transparent: true, side: THREE.DoubleSide })); sp.position.y = 104; sp.rotation.x = -(Math.PI / 2 - TILT) + Math.PI / 2 - Math.PI / 2; sp.castShadow = true; g.add(sp);
    g.userData = { c: c, t: t, sp: sp, last: -1 }; return g;
  }
  function drawSign(g) { const u = g.userData; if (!window.ReviewEgg || T.now - u.last < .1) return; u.last = T.now; const x = u.c.getContext("2d"); x.clearRect(0, 0, 256, 200);
    try { window.ReviewEgg.drawSign(x, 128, 100, 230, { glow: .55 + .3 * Math.sin(T.now * 6) }); } catch (e) {} u.t.needsUpdate = true; }

  // the beer: an amber bottle with a gold cap, a NALU label and an upright green ➕ badge
  const beer = new THREE.Group(); beer.visible = false; scene.add(beer); const beerY0 = new WeakMap();
  (function () {
    const pts = [[0, 0], [8.5, 0], [9, 2], [9, 21], [8, 26], [4.2, 32], [3.8, 41], [4.4, 43], [0, 43]].map(p => new THREE.Vector2(p[0], p[1]));
    const glass = new THREE.Mesh(new THREE.LatheGeometry(pts, 20), new THREE.MeshStandardMaterial({ color: lin("#c76a12"), roughness: .18, metalness: .1, transparent: true, opacity: .93 })); glass.castShadow = true;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.6, 3, 14), new THREE.MeshStandardMaterial({ color: lin("#e9c046"), metalness: .7, roughness: .3 })); cap.position.y = 44;
    const lc = document.createElement("canvas"); lc.width = 128; lc.height = 48; const lx = lc.getContext("2d"); lx.fillStyle = "#fdf8ef"; lx.fillRect(0, 0, 128, 48); lx.fillStyle = "#0b2e52"; lx.font = "900 26px system-ui,sans-serif"; lx.textAlign = "center"; lx.fillText("NALU", 64, 34);
    const lt = new THREE.CanvasTexture(lc); lt.colorSpace = THREE.SRGBColorSpace;
    const label = new THREE.Mesh(new THREE.CylinderGeometry(9.15, 9.15, 11, 20, 1, true), new THREE.MeshStandardMaterial({ map: lt, roughness: .8 })); label.position.y = 9;
    const bottle = new THREE.Group(); bottle.add(glass, cap, label); bottle.position.y = -22; const spin = new THREE.Group(); spin.add(bottle); spin.scale.setScalar(.9); beer.add(spin); beer.userData.spin = spin;
    const bc = document.createElement("canvas"); bc.width = bc.height = 64; const bx = bc.getContext("2d"); bx.fillStyle = "#18b45b"; bx.strokeStyle = "#fff"; bx.lineWidth = 6; bx.beginPath(); bx.arc(32, 32, 27, 0, 7); bx.fill(); bx.stroke(); bx.fillStyle = "#fff"; bx.fillRect(15, 26, 34, 12); bx.fillRect(26, 15, 12, 34);
    const bt = new THREE.CanvasTexture(bc); bt.colorSpace = THREE.SRGBColorSpace; const badge = new THREE.Sprite(new THREE.SpriteMaterial({ map: bt, depthTest: false })); badge.scale.set(20, 20, 1); badge.position.set(15, 18, 0); badge.renderOrder = 9; beer.add(badge);
  })();

  /* ------------------------------------------------------------ particles (splash, spray, bubbles, debris) + the red cloud ---------- */
  const NP = 1600, pPos = new Float32Array(NP * 3), pVel = new Float32Array(NP * 3), pLife = new Float32Array(NP), pMax = new Float32Array(NP), pSize = new Float32Array(NP), pCol = new Float32Array(NP * 3), pA = new Float32Array(NP); let pHead = 0;
  const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3)); pGeo.setAttribute("size", new THREE.BufferAttribute(pSize, 1)); pGeo.setAttribute("col", new THREE.BufferAttribute(pCol, 3)); pGeo.setAttribute("alpha", new THREE.BufferAttribute(pA, 1));
  const pMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uPx: { value: 1 } },
    vertexShader: "attribute float size,alpha;attribute vec3 col;uniform float uPx;varying float vA;varying vec3 vC;void main(){vA=alpha;vC=col;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=size*uPx;}",
    fragmentShader: "varying float vA;varying vec3 vC;void main(){vec2 d=gl_PointCoord-.5;float r=length(d);if(r>.5)discard;float a=smoothstep(.5,.25,r)*vA;gl_FragColor=vec4(vC*(.85+.3*(.5-d.y)),a);\n#include <colorspace_fragment>\n}" });
  const points = new THREE.Points(pGeo, pMat); points.frustumCulled = false; points.renderOrder = 6; scene.add(points);
  function emit(x, sy, h, vx, vy, vz, life, size, col) { const i = pHead; pHead = (pHead + 1) % NP; pPos[i * 3] = x; pPos[i * 3 + 1] = h; pPos[i * 3 + 2] = sy * K; pVel[i * 3] = vx; pVel[i * 3 + 1] = vy; pVel[i * 3 + 2] = vz; pLife[i] = life; pMax[i] = life; pSize[i] = size; pCol[i * 3] = col[0]; pCol[i * 3 + 1] = col[1]; pCol[i * 3 + 2] = col[2]; }
  const WHITE = [1, 1, 1], FOAMC = [.9, .97, 1], GRAY = [.45, .42, .4];
  const rnd = (a, b) => a + Math.random() * (b - a);
  function burst(kind, x, y) {
    if (kind === "splash") { for (let k = 0; k < 26; k++) { const a = k / 26 * 6.283, s = rnd(50, 120); emit(x, y, 2, Math.cos(a) * s, rnd(70, 170), Math.sin(a) * s * .7, rnd(.5, .8), rnd(3, 6), WHITE); } }
    else if (kind === "wsplash") { for (let k = 0; k < 46; k++) { const a = rnd(0, 6.283), s = rnd(20, 150); emit(x + rnd(-10, 10), y, 3, Math.cos(a) * s, rnd(120, 280), Math.sin(a) * s * .6, rnd(.5, .95), rnd(4, 9), FOAMC); } }
    else if (kind === "spray") { for (let k = 0; k < 14; k++) { const a = rnd(0, 6.283), s = rnd(40, 110); emit(x, y, 3, Math.cos(a) * s, rnd(60, 150), Math.sin(a) * s * .6, rnd(.35, .6), rnd(2.5, 4.5), WHITE); } }
    else if (kind === "bubble") emit(x, y, 1, 0, rnd(6, 14), 0, .6, rnd(2.5, 4), [.85, .95, 1]);
    else if (kind === "debris") { for (let k = 0; k < 14; k++) { const a = rnd(0, 6.283), s = rnd(60, 170); emit(x, y, 6, Math.cos(a) * s, rnd(90, 200), Math.sin(a) * s * .7, rnd(.5, .8), rnd(3, 7), GRAY); } burst("spray", x, y); }
    else if (kind === "washover") { for (let k = 0; k < 50; k++) emit(x + rnd(-60, 60), y - rnd(40, 110), rnd(10, 40), rnd(-20, 20), rnd(-10, 30), rnd(120, 220), rnd(.4, .7), rnd(5, 10), FOAMC); }
  }
  function stepParticles(dt) {
    for (let i = 0; i < NP; i++) { if (pLife[i] <= 0) { pA[i] = 0; continue; } pLife[i] -= dt; pVel[i * 3 + 1] -= 520 * dt;
      pPos[i * 3] += pVel[i * 3] * dt; pPos[i * 3 + 1] += pVel[i * 3 + 1] * dt; pPos[i * 3 + 2] += pVel[i * 3 + 2] * dt;
      if (pPos[i * 3 + 1] < 0 && pVel[i * 3 + 1] < 0) { pPos[i * 3 + 1] = 0; pVel[i * 3] *= .5; pVel[i * 3 + 2] *= .5; pVel[i * 3 + 1] = 0; }
      pA[i] = Math.min(1, pLife[i] / pMax[i] * 1.6) * .9; }
    pGeo.attributes.position.needsUpdate = pGeo.attributes.alpha.needsUpdate = pGeo.attributes.size.needsUpdate = pGeo.attributes.col.needsUpdate = true;
  }
  const seenFx = new WeakSet();
  // the cartoon red cloud (Settings → Cartoon red on): soft discs of red dye spreading on the water, never gore
  const cloud = new THREE.Group(); scene.add(cloud);
  const cloudMat = new THREE.MeshBasicMaterial({ map: glowTex, color: lin("#e23a4e"), transparent: true, depthWrite: false, opacity: 0 });
  for (let k = 0; k < 9; k++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), cloudMat); m.renderOrder = 4; cloud.add(m); }
  cloud.visible = false;
  // blob shadows on the water for things the sun shadow can't reach nicely (surfer in the air keeps a real shadow too)
  const blobMat = new THREE.MeshBasicMaterial({ map: glowTex, color: 0x001018, transparent: true, opacity: .32, depthWrite: false });

  /* ------------------------------------------------------------ helpers ---------- */
  function fitHeight(o, h) { o.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(o, true), s = h / Math.max(1e-6, b.max.y - b.min.y); o.scale.multiplyScalar(s); o.updateMatrixWorld(true); const b2 = new THREE.Box3().setFromObject(o, true); o.position.y -= b2.min.y; }
  function fitWidth(o, w) { o.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(o), s = w / Math.max(1e-6, b.max.x - b.min.x); o.scale.multiplyScalar(s); }
  function makeBoard() {   // a shortboard: rounded outline, thickness, rocker; deck colours like the 2D board
    const L = 84, Wd = 21, sh = new THREE.Shape();
    sh.moveTo(0, -L / 2); sh.bezierCurveTo(Wd * .55, -L * .42, Wd * .55, L * .1, Wd * .42, L * .38); sh.quadraticCurveTo(Wd * .3, L * .5, 0, L * .5); sh.quadraticCurveTo(-Wd * .3, L * .5, -Wd * .42, L * .38); sh.bezierCurveTo(-Wd * .55, L * .1, -Wd * .55, -L * .42, 0, -L / 2);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 1.6, bevelEnabled: true, bevelThickness: .9, bevelSize: 1.2, bevelSegments: 3, curveSegments: 24 });
    geo.rotateX(-Math.PI / 2); geo.translate(0, 1.2, 0);   // flat in xz, nose toward −z (shape y → −z)
    const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const z = p.getZ(i) / (L / 2); p.setY(i, p.getY(i) + Math.pow(Math.abs(z), 2.6) * (z < 0 ? 5.5 : 2.5)); }
    geo.computeVertexNormals();
    const c = document.createElement("canvas"); c.width = 64; c.height = 256; const x = c.getContext("2d"), g = x.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "#ff8a2a"); g.addColorStop(.48, "#ffd23f"); g.addColorStop(.52, "#38a7e0"); g.addColorStop(1, "#1a4f9c"); x.fillStyle = g; x.fillRect(0, 0, 64, 256); x.fillStyle = "rgba(255,255,255,.9)"; x.fillRect(31, 0, 2, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const uv = geo.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + Wd / 2) / Wd, 1 - (p.getZ(i) + L / 2) / L);
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: t, roughness: .3, metalness: 0 })); m.castShadow = true; m.receiveShadow = true;
    const fin = new THREE.Mesh(new THREE.BoxGeometry(.8, 6, 7), new THREE.MeshStandardMaterial({ color: lin("#1a2a40") })); fin.position.set(0, -2.5, L / 2 - 8); m.add(fin);
    return m;
  }
  const v3 = new THREE.Vector3();
  const P = (o, x, sy, h) => o.position.set(x, h || 0, sy * K);
  // the swell height at a point (the same Gerstner sum as the ocean shader, minus the sideways sway): floating things ride it
  const WJS = WAVES.map(w => { const l = Math.hypot(w[0], w[1]); return [w[0] / l, w[1] / l, 2 * Math.PI / w[2], w[3], w[4]]; });
  function swellH(x, sy) { const d = A.sy(0) - sy, a = Math.max(0, Math.min(1, (d + 20) / 190)), amp = a * a * (3 - 2 * a); if (amp <= 0) return 0;
    const qy = sy + G.cam - G.wo; let h = 0; for (const w of WJS) h += w[3] * Math.sin(w[2] * (w[0] * x + w[1] * qy - w[4] * G.t)); return h * amp; }
  const PS = (o, x, sy, h) => P(o, x, sy, (h || 0) + swellH(x, sy));
  const angDiff = (a, b) => ((a - b + Math.PI * 3) % (Math.PI * 2)) - Math.PI;

  /* ------------------------------------------------------------ per-frame sync ---------- */
  let lastNow = performance.now();
  function render() {
    const now = performance.now(), dt = Math.min(.05, (now - lastNow) / 1000); lastNow = now; T.now = G.t;
    const Z = A.zoom(), C = A.CAM, S = A.SHK, sy = A.sy, y0 = sy(0);
    // camera: the ground point under the screen centre, then back along the view
    const gx = C.x + (W / 2 - C.x) / Z - S.x, gy = C.y + (H / 2 - C.y) / Z - S.y, tgt = v3.set(gx, 0, gy * K);
    cam.left = -W / 2 / Z; cam.right = W / 2 / Z; cam.top = H / 2 / Z; cam.bottom = -H / 2 / Z; cam.updateProjectionMatrix();
    cam.position.copy(tgt).addScaledVector(VIEW, 2400); cam.up.set(0, SIN, -COS); cam.lookAt(tgt);
    const span = Math.max(W, H * K) / Z;
    sun.position.copy(tgt).addScaledVector(LIGHT, 1200); sun.target.position.copy(tgt);
    const sc = sun.shadow.camera; sc.left = -span * .75; sc.right = span * .75; sc.top = span * .75; sc.bottom = -span * .75; sc.near = 200; sc.far = 2600; sc.updateProjectionMatrix();
    pMat.uniforms.uPx.value = R.getPixelRatio() * (A.wrap.clientWidth || W) / W * Z;
    // ocean follows the view
    ocean.position.set(gx, 0, gy * K); ocean.scale.set(W / Z + 420, 1, H * K / Z + 520);
    const ou = oceanMat.uniforms; ou.uT.value = G.t; ou.uScroll.value = G.cam - G.wo; ou.uShore.value = y0; ou.uHurt.value = G.hurt > 0 ? 1 : 0; ou.uRect.value.copy(rect);
    sharkUniforms.uT.value = G.t;
    fRect(); fx.globalCompositeOperation = "source-over"; fx.fillStyle = "#000"; fx.fillRect(0, 0, FC.width, FC.height); fx.globalCompositeOperation = "lighter";
    ou.uRect.value.copy(rect);
    rFollow(A.sy(G.yw) + G.cam - G.wo); rO.y = rQ0 === null ? 0 : rQ0;

    // ---- shore ----
    const shoreImg = IM.shore, sh = shoreImg && shoreImg.naturalWidth ? W * shoreImg.naturalHeight / shoreImg.naturalWidth : 600, top = y0 - sh * .255;
    if (shoreKey !== sh) { shoreBuild(sh); shoreKey = sh; }
    shore.visible = y0 > -sh * 1.6; shore.position.set(0, .6, (top + sh * .16) * K); shore.scale.set(1, 1, K);
    palms.visible = shore.visible;
    const heli = G.ents.find(e => e.t === "heli");
    palms.children.forEach(g => { const p = g.userData.p, i = g.userData.i, x = p[0] * W, y = top + p[1] * sh; let gust = 0;
      if (heli) { const d = Math.hypot(heli.x + 48 - x, (sy(heli.yw) + 88) - y); gust = Math.max(0, 1 - d / 190); }
      P(g, x, y, 0); const sway = Math.sin(G.t * 1.3 + i) * .05 + gust * Math.sin(G.t * 9 + i) * .45; g.rotation.set(sway * .4, sway, sway * .3); });
    const near = G.phase === "sand" || G.phase === "beach" || G.phase === "ridein" || ((G.phase === "swim" || G.phase === "popup") && G.yw < 420);
    P(lady, 140, y0 + 74, 1); lady.rotation.set(0, Math.sin(G.t * (near ? 5 : 1)) * (near ? .12 : .03), A.reduce ? 0 : Math.sin(G.t * 5) * (near ? .03 : 0)); lady.visible = shore.visible;
    if (guardM) { P(guardM, 330, y0 + 54, 1); guardM.visible = shore.visible; guardM.lookAt(guardM.position.x, guardM.position.y + 1e-3 + 0, guardM.position.z + 1); guardM.rotation.set(-0.25, 0, 0); }
    const st = G.phase === "beach" || G.phase === "sand";
    if (staff1) { P(staff1, 300, y0 + 150 + Math.sin(G.t * 6) * 2, 1); staff1.visible = st && shore.visible; staff1.rotation.set(-.25, 0, 0); }
    if (staff2) { P(staff2, 372, y0 + 160, 1); staff2.visible = st && shore.visible; staff2.rotation.set(-.25, 0, 0); }
    P(naluLight, 342, y0 + 200, 40); naluLight.intensity = shore.visible ? 2600 * (1 + .3 * Math.sin(G.t * 3)) : 0;
    P(naluGlow, 342, y0 + 200, 2); naluGlow.scale.set(190, 1, 190 * K); naluGlow.material.opacity = .32 + .1 * Math.sin(G.t * 3); naluGlow.visible = shore.visible;

    // ---- pier: the stub off the sand + the sections that drift across ----
    stub.visible = sy(A.STUB) < H / Z + C.y + 200 && sy(-60) > -400; P(stub, A.PIER_X, sy(-60), 0); stub.rotation.y = Math.PI;
    const live = new Set();
    G.ents.forEach(e => { if (e.t !== "pier") return; live.add(e); let g = pierSecs.get(e);
      const ax = e.xa - (e.xb - e.xa) * .6, ay = e.yw - (e.yb - e.yw) * .6, x1 = ax, z1 = sy(ay) * K, x2 = e.xb, z2 = sy(e.yb) * K;
      if (!g) { g = makePier(Math.hypot(x2 - x1, z2 - z1)); pierSecs.set(e, g); scene.add(g); }
      g.position.set(x1, 0, z1); g.rotation.y = Math.atan2(x2 - x1, z2 - z1); });
    pierSecs.forEach((g, e) => { if (!live.has(e)) { scene.remove(g); pierSecs.delete(e); } });

    // ---- waves ----
    const wv = G.wv, ry = sy(G.yw);
    if (wv && (G.phase === "ride")) { const u = rideWave.material.uniforms, close = wv.st === "close" ? Math.min(1, wv.t / 1.4) : 0;
      rideWave.visible = true; u.uT.value = G.t; u.uPx.value = wv.px; u.uPd.value = wv.pd; u.uClose.value = close; const pr = wv.x0 == null ? 1 : Math.max(0, Math.min(1, (wv.px - wv.x0) * wv.pd / (W - 70 - Math.min(wv.x0, W - wv.x0)))); u.uH.value = 60 + 32 * pr; u.uFz.value = 74;   // the wave grows as it peels
      u.uCz.value = (ry + 12) * K - 74 + Math.sin(G.t * 1.6) * 2;
      for (let k = 0; k < 6; k++) foamDot(wv.pd > 0 ? wv.px - 30 - k * 40 : wv.px + 30 + k * 40, ry + 8 + Math.sin(G.t * 3 + k) * 4, 26, .5);   // foam rolling off the whitewater
      // the lip: thrown from the crest, arcing forward and down onto the landing spot → a burst of spray and foam
      const crestSy = ry + 12 - 74 / K, landX = wv.px + wv.pd * 2, H0 = u.uH.value;
      for (let k = 0; k < 6; k++) emit(wv.px - wv.pd * rnd(0, 14), crestSy, H0 * rnd(.85, 1.05), wv.pd * rnd(-10, 40), rnd(0, 80), rnd(90, 170), rnd(.35, .6), rnd(3, 7), FOAMC);
      if (Math.random() < .85) for (let k = 0; k < 7; k++) { const a = rnd(0, 6.28), sp = rnd(30, 130); emit(landX + rnd(-10, 10), ry + rnd(-4, 6), 4, Math.cos(a) * sp - wv.pd * 30, rnd(130, 300), Math.sin(a) * sp * .5, rnd(.45, .85), rnd(4, 9), WHITE); }
      // every ~0.7 s the lip comes down hard: an explosion of spray, a ring of foam and a dent in the water
      crashT -= 1 / 60; if (crashT <= 0) { crashT = rnd(.55, .85); for (let k = 0; k < 16; k++) { const a = rnd(0, 6.28), sp = rnd(60, 190); emit(landX + rnd(-12, 12), ry + rnd(-4, 8), 6, Math.cos(a) * sp - wv.pd * 40, rnd(200, 380), Math.sin(a) * sp * .6, rnd(.5, .95), rnd(5, 10), WHITE); } foamRing(landX, ry + 4, 34, 12, .8, 4); foamPatch(landX, ry + 6, rnd(22, 34), rnd(2.2, 3.2), -wv.pd * 10); poke(landX, ry, -5, 26); }
      if (Math.random() < .25) foamPatch(landX - wv.pd * rnd(0, 30), ry + rnd(-6, 10), rnd(14, 26), rnd(1.6, 2.6), -wv.pd * rnd(4, 14));
      poke(landX, ry, -3, 16);
      if (!close) foamDot(wv.px - wv.pd * 6, ry, 20, .45); }
    else rideWave.visible = false;
    let wi = 0;
    G.ents.forEach(e => { if (e.t !== "brk" || wi >= wallPool.length) return; const m = wallPool[wi++], y = sy(e.yw); m.visible = true; const u = m.material.uniforms;
      u.uT.value = G.t + e.ph; u.uCz.value = (y + 22) * K - 34;
      for (let k = 0; k < 2; k++) emit(rnd(-20, W + 20), y + 10, 18, rnd(-20, 20), rnd(60, 170), rnd(60, 160), rnd(.35, .6), rnd(3, 7), FOAMC); if (Math.random() < .2) { const cx0 = rnd(0, W); for (let k = 0; k < 8; k++) emit(cx0 + rnd(-10, 10), y + 14, 10, rnd(-80, 80), rnd(160, 300), rnd(-20, 60), rnd(.45, .8), rnd(4, 8), WHITE); poke(cx0, y + 20, -3, 18); }
      if (Math.random() < .12) foamPatch(rnd(0, W), y + 30, rnd(14, 24), rnd(1.2, 2), 0); u.uPx.value = -9999; u.uFade.value = 1; fx.fillStyle = "rgba(255,0,0,.3)"; const a = fPos(-40, y + 18), b = fPos(W + 40, y + 44); fx.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]); });
    if (G.phase === "death" && G.deathCause === "wave" && wi < wallPool.length) { const m = wallPool[wi++], f = Math.min(1, G.deathT / 1.2), y = sy(G.deathYw); m.visible = true; const u = m.material.uniforms; u.uT.value = G.t; u.uCz.value = (y - 160 + f * 190) * K - 34; u.uFade.value = Math.min(1, 1.6 - G.deathT * .5); }
    for (; wi < wallPool.length; wi++) wallPool[wi].visible = false;

    // ---- wake + foam around things ----
    G.wake.forEach(w => foamDot(w.x, sy(w.yw), w.s * (1 + w.t * .6) * 1.5, (1 - w.t / 1.1) * .38));

    // ---- entities ----
    const seen = new Set();
    G.ents.forEach(e => {
      if (e.t === "pier" || e.t === "brk" || e.t === "plane" || e.t === "toss" || e.t === "fish" || e.t === "drop" || e.t === "harpoon" || e.t === "ski" || e.t === "sub" || e.t === "sharp" || e.t === "qfin" || e.t === "hkit") {   // (drawn on the 2D overlay)
        if (e.t === "hkit") { foamRing(e.x, sy(e.yw) + 3, 28, 14, .45, 2); poke(e.x, sy(e.yw), -.4, 8); }
        if (e.t === "qfin") { foamDot(e.x, sy(e.yw), 16, .5); poke(e.x, sy(e.yw), -.4, 6); }
        if (e.t === "sub" && e.st !== "peri") { foamDot(e.x, sy(e.yw), 40, .45); poke(e.x, sy(e.yw), -1.2, 22); }
        if (e.t === "sharp") foamDot(e.x, sy(e.yw) + 10, 5, .5);
        if (e.t === "fish" && !e.air) foamDot(e.x, sy(e.yw), 12, .5, 1);
        if (e.t === "ski") { const d = e.vx > 0 ? 1 : -1; for (let k = 1; k < 6; k++) foamDot(e.x - d * (20 + k * 14), sy(e.yw), 6 + k * 2, .5); }
        return; }
      seen.add(e); let o = ents.get(e); const x = e.x, y = sy(e.yw);
      if (e.t === "boat") poke(x - Math.sign(e.vx) * 30, y, -1.4, 14); else if (e.t === "shark" && e.st === "lunge") poke(x, y, -1.1, 10); else if (e.t === "shark" && (e.st === "fin" || e.st === "warn")) poke(x, y, -.4, 6); else if (e.t === "eel" || e.t === "ray") poke(x, y, -.25, 6);
      if (!o) { o = makeEnt(e); if (!o) return; ents.set(e, o); scene.add(o); }
      syncEnt(e, o, x, y);
    });
    ents.forEach((o, e) => { if (!seen.has(e)) { scene.remove(o); ents.delete(e); } });
    syncBoss();

    // ---- the surfer ----
    syncSurfer(dt);

    // ---- the beer rescue ----
    const b = G.beer; if (b && b.st === "wind") beerY0.delete(b); beer.visible = !!b && (G.phase === "swim" || G.phase === "ride" || G.phase === "ridein");
    if (beer.visible) { if (b.st !== "wind" && !beerY0.has(b)) beerY0.set(b, b.y); const top0 = beerY0.get(b) || b.y, ty = sy(G.yw);
      if (b.st === "wind") { P(beer, b.x, b.y + 30, 34); beer.scale.setScalar(A.reduce ? 1 : 1 + .08 * Math.sin(G.t * 14)); beer.userData.spin.rotation.set(0, 0, 0); }
      else { const p = Math.max(0, Math.min(1, (b.y - top0) / Math.max(1, ty - top0))); P(beer, b.x, b.y, 8 + Math.sin(p * Math.PI) * 70); beer.scale.setScalar(1.15); beer.userData.spin.rotation.set(b.rot, 0, b.rot * .4); } }

    // ---- fx: the 2D game's splash events → 3D particles; rings on the water ----
    G.fx.forEach(f => { if (!seenFx.has(f)) { seenFx.add(f); if (f.k !== "txt" && f.k !== "ring") { burst(f.k, f.x, f.y);
        const pk = { splash: -6, wsplash: -9, spray: -3, washover: -8, debris: -5 }[f.k]; if (pk) { poke(f.x, f.y, pk, 16); foamPatch(f.x, f.y, 18, 1.6, 0); } } }
      if (f.k === "splash") foamRing(f.x, f.y, f.t * 90, f.t * 54, (1 - f.t / .6) * .9, 4);
      else if (f.k === "wsplash") foamDot(f.x, f.y, 40 + f.t * 90, (1 - f.t / .6) * .9);
      else if (f.k === "washover") foamDot(f.x, f.y - 30 + f.t * 120, 70, (1 - f.t / .6)); });
    // death in the water
    cloud.visible = false;
    if (G.phase === "death") { const x = G.deathX, y = sy(G.deathYw), t = G.deathT;
      if (G.deathCause === "shark" && A.gore()) { cloud.visible = true; const g = Math.min(1, t / 1.8), fade = t > 2.4 ? Math.max(0, 1 - (t - 2.4) / .7) : 1; cloudMat.opacity = .5 * fade;
        cloud.children.forEach((m, k) => { const an = k * 2.399, d = (6 + k * 6) * g, r = (16 + (k % 3) * 9) * (.35 + g * 1.25) * 2.2; P(m, x + Math.cos(an) * d, y + Math.sin(an) * d * .8, 1 + k * .05); m.scale.set(r, 1, r * K); }); }
      else if (G.deathCause === "shark" || G.deathCause === "ray") { for (let j = 0; j < 3; j++) { const rr = ((t * .8 + j / 3) % 1); foamRing(x, y, 14 + rr * 70, 9 + rr * 44, .7 * (1 - rr), 3); } if (Math.random() < .5) burst("bubble", x + rnd(-24, 24), y + rnd(-18, 18)); }
      else if (G.deathCause === "eel") foamDot(x, y, 60 + t * 60, .3 * Math.max(0, 1 - t / 2.8));
    }
    if (G.eng > .05 && G.phase === "ride") foamDot(G.x, ry, 30 + G.eng * 40, .4 + G.eng * .5);
    for (let i = foams.length - 1; i >= 0; i--) { const f = foams[i]; f.t += dt; if (f.t > f.life) { foams.splice(i, 1); continue; } f.x += f.vx * dt; f.r = f.r0 * (1 + f.t * .9);
      foamDot(f.x, f.q - G.cam + G.wo, f.r, .55 * (1 - f.t / f.life)); }
    rStep(); stepParticles(dt); foamTex.needsUpdate = true;
    R.render(scene, cam);
  }

  function makeEnt(e) {
    let o = null;
    if (e.t === "shark") o = makeShark(86, new THREE.Color(7, 7.3, 7.8));
    else if (e.t === "jelly") { o = new THREE.Group(); if (jellyProto) { const j = jellyProto.clone(true); fitWidth(j, 46); o.add(j); } else o.add(new THREE.Mesh(new THREE.SphereGeometry(16, 16, 8, 0, 6.3, 0, 1.6), new THREE.MeshStandardMaterial({ color: lin("#ff78c8"), transparent: true, opacity: .7 }))); }
    else if (e.t === "boat") { o = new THREE.Group(); if (boatProto) { const b = boatProto.clone(true); b.scale.setScalar(110); o.add(b); } else o.add(new THREE.Mesh(new THREE.BoxGeometry(30, 14, 100), new THREE.MeshStandardMaterial({ color: 0xffffff }))); }
    else if (e.t === "food") o = makeRaft(e.k, e.gold);
    else if (e.t === "eel") o = makeEel();
    else if (e.t === "ray") o = makeRay();
    else if (e.t === "heli") o = makeHeli();
    else if (e.t === "buoy") o = makeBuoy();
    else if (e.t === "rock") o = makeRock(e);
    else if (e.t === "rsign") o = makeSign();
    if (o) o.traverse(m => { if (m.isMesh) m.castShadow = true; });
    return o;
  }
  function syncEnt(e, o, x, y) {
    if (e.t === "food") { PS(o, x, y, Math.sin(G.t * 3 + e.bob) * 1.5 - 1); o.rotation.set(Math.sin(G.t * 2 + e.bob) * .05, e.bob, Math.cos(G.t * 2.3 + e.bob) * .05); foamRing(x, y, 30, 26, .35, 3); }
    else if (e.t === "shark") {
      const mat = o.userData.mat; if (mat) { mat.emissive = mat.emissive || new THREE.Color(); if (e.fl > 0) mat.emissive.setRGB(.9, .9, .9); else mat.emissive.setRGB(.045, .06, .075); }
      if (e.st === "fin" || e.st === "warn") { PS(o, x, y, -9); o.rotation.set(0, G.dir > 0 ? 0 : Math.PI, 0);
        foamLine(x - 22, y - G.dir * 26, x, y + 4, .6, 3); foamLine(x + 22, y - G.dir * 26, x, y + 4, .6, 3); foamDot(x, y, 22, .55, 1); }
      else { const a = Math.atan2(e.vx, e.vy) + Math.PI, fa = e.st === "flee" ? Math.max(0, 1 - e.ft / 1.3) : 1;
        PS(o, x, y, e.st === "flee" ? -4 - (1 - fa) * 30 : -3); o.rotation.set(0, -a, 0); if (e.fl > 0) o.position.x += rnd(-3, 3);
        foamDot(x, y, 34, .45); foamDot(x, y, 30, .4, 1); }
    }
    else if (e.t === "jelly") { const pul = 1 + Math.sin(e.ph * 3) * .08; PS(o, x, y, 2); o.scale.set(pul * 1.15, 1.4 / pul, pul * 1.15); o.rotation.y = e.ph * .3; foamDot(x, y, 22, .25); }
    else if (e.t === "boat") { PS(o, x, y, 1 + Math.sin(G.t * 3) * 1.2); o.rotation.set(Math.sin(G.t * 2.2) * .03, e.vx > 0 ? Math.PI / 2 : -Math.PI / 2, Math.sin(G.t * 1.7) * .05);
      const d = Math.sign(e.vx); for (let k = 1; k < 8; k++) foamDot(x - d * (40 + k * 18), y + Math.sin(k) * 3, 8 + k * 3, .55); foamDot(x, y, 40, .3); }
    else if (e.t === "eel") { PS(o, x, y, 3); o.rotation.y = e.sp > 0 ? 0 : Math.PI; o.userData.mat.emissiveIntensity = e.zap ? .35 + Math.random() * .4 : 0; foamDot(x, y, 34, e.zap ? .5 : .2); }
    else if (e.t === "ray") { const d = e.vx > 0 ? 1 : -1; PS(o, x, y, 5 - e.sub * 1.5); o.scale.setScalar(1.35); o.rotation.y = d > 0 ? Math.PI / 2 : -Math.PI / 2; o.userData.tail.rotation.y = Math.sin(e.ph * 4) * .3; foamDot(x, y, 26, .3, 1); if (e.sub < .5) foamRing(x, y, 32, 22, .3, 2); }
    else if (e.t === "heli") { PS(o, x, y + 88, 150); o.rotation.y = e.vx > 0 ? Math.PI / 2 : -Math.PI / 2; o.userData.rotor.rotation.y = G.t * 38; o.userData.tr.rotation.x = G.t * 50;
      for (let dw = 0; dw < 3; dw++) { const rr = ((G.t * 1.6 + dw / 3) % 1); foamRing(x + 48, y + 88, 20 + rr * 70, 12 + rr * 40, .45 * (1 - rr), 2.5); } }
    else if (e.t === "buoy") { PS(o, x, y + Math.sin(G.t * 3) * 2, 2); o.rotation.set(0, .4, Math.sin(G.t * 2) * .1); foamRing(x, y, 22, 12, .35, 2); }
    else if (e.t === "rock") { PS(o, x, y, 0); const fo = .5 + .25 * Math.sin(G.t * 2.4 + e.ph); foamDot(x, y + 3, e.r * 1.6 + fo * 6, .6); }
    else if (e.t === "rsign") { PS(o, x, y + Math.sin(G.t * 2.4 + e.bob) * 2.5, 0); o.rotation.set(0, 0, Math.sin(G.t * 1.7 + e.bob) * .05); drawSign(o); foamRing(x, y + 2, 30, 11, .4, 2); }
  }
  // ---- boss sharks: the same shark, scaled to the 2D size; Manō Nui darker. Dives under, breaches, flashes on hits ----
  let bossO = null, bossKind = 0;
  function syncBoss() {
    const b = G.boss; if (!b) { if (bossO) { scene.remove(bossO); bossO = null; } return; }
    if (!bossO || bossKind !== b.kind) { if (bossO) scene.remove(bossO); bossKind = b.kind; bossO = makeShark(b.size * .95, b.kind === 5 ? new THREE.Color(3.6, 4.2, 5.4) : new THREE.Color(7, 7.3, 7.8)); scene.add(bossO); }
    const x = b.x, y = A.sy(A.bossYw(b)); let rot = b.ang, sc = 1; if (b.sub < .6) poke(x, y, b.st === "charge" ? -2.4 : -.8, 18);
    if (b.st === "crash" || b.st === "ko") rot += Math.sin(G.t * 9) * .18; if (b.st === "tail") rot += Math.sin(b.t * 16) * .5 * Math.min(1, b.t / .3);
    if (b.st === "ko") { rot = b.ang + b.t * 1.4; sc = 1 - b.sub * .3; } if (b.br > 0) sc *= 1 + b.br * .5;
    const h = b.br > 0 ? 6 + b.br * 70 : -3 - b.sub * 40;
    PS(bossO, x, y, h); bossO.rotation.set(b.br > 0 ? -.5 * b.br : 0, -rot, b.st === "ko" ? Math.min(Math.PI, b.t * 2) : 0); bossO.scale.setScalar(b.size * .95 * sc);
    const mat = bossO.userData.mat; if (mat) { mat.emissive = mat.emissive || new THREE.Color(); const f = b.fl > 0 ? Math.min(.85, b.fl / .32 * .85) : b.st === "ko" ? .25 : 0; mat.emissive.setRGB(f + .045, f + .06, f + .075); }
    foamDot(x, y, b.size * .45, b.sub > .5 ? .2 : .45); foamDot(x, y, b.size * .4, .25 + b.sub * .5, 1);
  }

  // ---- the surfer: clip weights from the game phase; board under the feet, under the arm, or under the chest ----
  const boardQ = new THREE.Quaternion(), tmpE = new THREE.Euler();
  function wset(a, w) { if (a) a.setEffectiveWeight(w); }
  // duck-diving: the surfer and board show through the water, tinted blue, drawn before the whitewater passing over
  let uwOn = false, uwTint = new THREE.Color(.45, .75, 1), crashT = .5, duckPrev = 0, duckPeak = 0; const uwMats = () => { const l = skinMats.slice(); boardG.traverse(o => { if (o.isMesh) l.push(o.material); }); return l; };
  function underwater(on) {
    if (on === uwOn) return; uwOn = on;
    uwMats().forEach(m => { m.depthTest = !on; m.transparent = on; m.opacity = on ? .55 : 1; if (!m.userData.cU) m.userData.cU = m.color.clone(); if (on) m.color.copy(m.userData.cU).multiply(uwTint); else m.color.copy(m.userData.cU); m.needsUpdate = true; });
    rig.traverse(o => { if (o.isMesh) o.renderOrder = on ? .5 : 0; }); boardG.traverse(o => { if (o.isMesh) o.renderOrder = on ? .4 : -1; });   // (the board still draws just before the rider)
  }
  function syncSurfer(dt) {
    const ph = G.phase, x = G.x, y = A.sy(G.yw), m = G.surfer === "m";
    const show = m && ph !== "cut" && ph !== "cut0";
    rig.visible = boardG.visible = show; if (!show) { underwater(false); return; }
    let run = 0, swim = 0, bal = 0, fall = 0, air = 0, h = 0, yaw = Math.PI - G.ang, prone = 0, carried = 0, sink = 0, boardYaw = yaw, boardH = 0, boardRoll = 0, boardPitch = 0;
    const blink = G.inv > 0 && !(G.wipe > 0) && Math.floor(G.t * 12) % 2 && ph !== "death" && ph !== "sand" && ph !== "beach" && !(ph === "swim" && G.yw < 70);   // same rule as the 2D sprite
    // facing on foot: always the way he is actually moving (screen-space velocity), never moonwalking
    const p = [x, -G.yw]; if (lastP && Math.hypot(p[0] - lastP[0], p[1] - lastP[1]) < 60) { const vx = (p[0] - lastP[0]) / Math.max(dt, 1e-3), vz = (p[1] - lastP[1]) / Math.max(dt, 1e-3); if (Math.hypot(vx, vz) > 8) { const want = Math.atan2(vx, vz); yawV += angDiff(want, yawV) * Math.min(1, dt * 10); } } lastP = p;
    if (ph === "sand" || ph === "beach") { run = 1; carried = 1; yaw = yawV; if (ph === "beach" && G.beachT >= 2.3) { rig.visible = boardG.visible = false; return; } }
    else if (ph === "swim" || (ph === "popup" && G.popT < .5) || (ph === "death" && G.deathPaddle)) {
      if (ph === "swim" && G.yw < 70 && G.duck <= 0) { run = 1; carried = 1; yaw = yawV; sink = Math.min(1, Math.max(0, G.yw) / 70) * 14; }   // wading in: the water climbs his legs
      else { swim = 1; prone = 1; } }
    else if (ph === "popup") { const f = Math.min(1, (G.popT - .5) / .5); swim = 1 - f; bal = f; prone = 1 - f; }
    else { bal = 1; }
    const airF = G.jump > 0 ? Math.sin(Math.PI * (1 - G.jump / G.jumpDur)) * (G.airAmp || (G.jumpDur > .9 ? 1 : .6)) : 0;   // G.airAmp: launch height off the lip (game.js launch())
    if (ph === "ride" && airF > 0) { air = 1; bal = 0; h = airF * 34 / SIN; }
    if (ph === "ride") h += (G.lipRise || 0) * 18;   // up at the top of the face in the lip window
    if (G.wipe > 0) { const w = 1 - G.wipe / .9; fall = Math.sin(w * Math.PI); bal *= 1 - fall; }
    if (ph === "death") { const t = G.deathT; if ((G.deathCause === "shark" || G.deathCause === "ray") && t > .45) { rig.visible = boardG.visible = false; return; }
      if (G.deathCause === "wave" && t > 1.1) { rig.visible = boardG.visible = false; return; }
      if (!G.deathPaddle) { fall = 1; bal = 0; } sink = Math.min(1, t * 1.5) * 20; }
    const duck = ph === "swim" && G.duck > 0 ? Math.sin(Math.min(1, (.8 - G.duck) / .8) * Math.PI) : 0;
    if (duck) { sink = duck * 48;   // deeper dive: he goes well under the surface
      for (let k = 0; k < 2; k++) emit(x + rnd(-14, 14), y + rnd(-22, 22), 1, rnd(-8, 8), rnd(40, 90), rnd(-8, 8), rnd(.5, .9), rnd(2, 4), [.85, .97, 1]);   // bubble trail rising
      // the deeper he is, the darker and bluer he looks and the more the water hides him
      uwTint.setRGB(.75 - .45 * duck, .9 - .35 * duck, 1); uwMats().forEach(m => { if (uwOn && m.userData.cU) { m.color.copy(m.userData.cU).multiply(uwTint); m.opacity = .7 - .35 * duck; } }); }
    // splash going in, and again popping back up
    if (duck > 0 && duckPrev === 0) { for (let k = 0; k < 18; k++) { const a = rnd(0, 6.28), sp = rnd(40, 140); emit(x + rnd(-8, 8), y + rnd(-6, 6), 4, Math.cos(a) * sp, rnd(150, 290), Math.sin(a) * sp * .6, rnd(.45, .8), rnd(4, 8), WHITE); } foamRing(x, y, 30, 12, .85, 4); poke(x, y, -5, 22); }
    if (duck > duckPeak) duckPeak = duck;
    if (duckPeak > .9 && duck < .3 && duck > 0) { duckPeak = 0; for (let k = 0; k < 12; k++) { const a = rnd(0, 6.28), sp = rnd(30, 110); emit(x + rnd(-8, 8), y - 30 + rnd(-6, 6), 4, Math.cos(a) * sp, rnd(120, 240), Math.sin(a) * sp * .6, rnd(.4, .7), rnd(3, 7), WHITE); } foamRing(x, y - 30, 22, 9, .7, 3); poke(x, y - 30, -3, 18); }
    if (!duck) duckPeak = 0; duckPrev = duck;
    // washed: tumbling in the foam, pushed under, then he pops back up
    if (G.wipe > 0 && ph === "ride") { const w = 1 - G.wipe / .9; sink = Math.max(sink, Math.sin(w * Math.PI) * 16); foamDot(x, y, 46, .8); if (Math.random() < .5) emit(x + rnd(-20, 20), y + rnd(-10, 10), 4, rnd(-60, 60), rnd(60, 160), rnd(-30, 30), rnd(.4, .7), rnd(4, 8), FOAMC); }
    underwater(duck > .25);
    // blend toward the targets (crossfades)
    const k = Math.min(1, dt * 9); runW += (run - runW) * k; swimW += (swim - swimW) * k; balW += (bal - balW) * k; fallW += (fall - fallW) * k; airW += (air - airW) * Math.min(1, dt * 14); carry += (carried - carry) * k;
    const tot = runW + swimW + balW + fallW + airW || 1;
    wset(act.run, runW / tot); wset(act.swim, swimW / tot); wset(act.balance, balW / tot); wset(act.fall, fallW / tot); wset(act.flip, airW / tot);
    if (act.run) act.run.timeScale = ph === "swim" ? .6 : 1; if (act.flip) act.flip.time = .54;   // a crouched, grabbed air pose
    if (mixer) mixer.update(dt);
    // lean into turns (weight shift), pocket bob
    const lean = Math.max(-.55, Math.min(.55, G.vx / 380)), bob = ph === "ride" ? Math.sin(G.t * 2.3 + G.yw * .018) * 1.2 : 0;
    const sw = swellH(x, y), sinkB = sink * (prone ? 1 : .6);
    P(rig, x, y, h - Math.min(sink, sinkB) + bob + sw + 1.2); rig.rotation.set(0, yaw, 0);   // feet on the deck (+1.2 = deck thickness), never under it
    let spin = 0, flip = 0, grab = 0; const tk = G.trick; if (tk) { const f = tk.t / tk.dur; if (tk.k === "spin") spin = f * Math.PI * 2; else if (tk.k === "grab") { grab = Math.sin(f * Math.PI); spin = grab * .5; } else flip = f * Math.PI * 2; }
    let wipeSpin = 0; if (G.wipe > 0) wipeSpin = (1 - G.wipe / .9) * Math.PI * 2.4;
    if (ph === "death" && G.deathCause === "wave") wipeSpin = G.deathT * 6;
    lift.rotation.set(flip + grab * .35, spin + wipeSpin, lean * (ph === "ride" ? 1.05 : 0) + grab * .9);   // grab: tweaked out sideways, nose tipped up   // riding: rolls well onto the rail, carving the face
    body.position.set(0, 3.4 - 9.5 * prone, 9 * (1 - prone) * (1 - carry) - 4 * prone); body.rotation.set(0, 0, 0);
    // the board: under the chest (paddling), under the feet (riding), under the arm (running), tumbling away (wipeout)
    if (carry > .5) {   // tucked under the right arm, nose forward, deck against the body
      boardG.position.set(0, 0, 0); rig.updateMatrixWorld(true);
      const lp = new THREE.Vector3(-13, 30, 4); rig.localToWorld(lp); boardG.position.copy(lp);
      boardG.quaternion.copy(rig.quaternion).multiply(boardQ.setFromEuler(tmpE.set(0, Math.PI, Math.PI / 2 - .12)));
      boardG.position.y += Math.abs(Math.sin(G.t * 14)) * (ph === "swim" ? 0 : 1.2);
    } else {
      rig.updateMatrixWorld(true); lift.updateMatrixWorld(true);
      boardG.position.set(x, h - sinkB + bob + sw, y * K); boardG.quaternion.copy(lift.getWorldQuaternion(boardQ));
      boardG.rotateY(Math.PI);
      if (fallW > .3 && ph !== "death") { boardG.position.x += Math.sin(wipeSpin) * 30; boardG.rotateZ(wipeSpin * 1.3); boardG.position.y += Math.abs(Math.sin(wipeSpin)) * 20; }
    }
    // damage: redder skin, bruise patches, bandage wraps (stepped back by the beer catch)
    const dk = Math.min(1, G.dmg / 5) * .8;
    skinMats.forEach(mt => { mt.color.copy(mt.userData.c0).lerp(new THREE.Color(1, .55, .5), dk); if (uwOn) mt.color.multiply(uwTint); mt.emissive = mt.emissive || new THREE.Color(); const e = G.hurt > 0 ? G.hurt * 1.4 : 0, z = ph === "death" && G.deathCause === "eel" && Math.floor(G.deathT * 16) % 2 ? .9 : 0; mt.emissive.setRGB(e + z * .4, z, z); });
    let nb = 0, nw = 0; marks.forEach(mk => { if (mk.userData.kind === "b") mk.visible = nb++ < G.dmg; else mk.visible = nw++ < G.dmg - 1; });
    rig.visible = boardG.visible = !blink;
    if (ph === "death" && G.deathCause === "eel" && G.deathT > 2.2) rig.visible = false;
    // the board in the water: a pressure dip that leaves a wake; paddle strokes and landings make rings
    if (ph === "ride" || ph === "ridein" || ph === "victory" || ph === "popup") { if (!air) poke(x, y, -1.5 - Math.min(1.5, Math.abs(G.vx) / 260), 9); if (G.jump > 0 && G.jump < .06) poke(x, y, -9, 18); }
    else if (ph === "swim") { poke(x, y - 10, duck ? -3 : -.9, 8); if (!duck && Math.random() < dt * 4.5) poke(x + (Math.random() < .5 ? -14 : 14), y - 30, -2.5, 6); }
    else if (ph === "death") poke(G.deathX, A.sy(G.deathYw), -1.5, 14);
    // foam: around the board, rail spray when carving, a bow wave paddling, a ring while wading
    if (ph === "ride" || ph === "ridein" || ph === "victory") { if (!air) { foamDot(x, y, 22, .55); foamDot(x - Math.sin(G.ang) * 0, y - 34, 14, .4); }
      if (!air && Math.abs(G.vx) > 140 && Math.random() < .7) emit(x - Math.sign(G.vx) * 10, y, 3, -Math.sign(G.vx) * rnd(60, 140), rnd(60, 150), rnd(-20, 20), rnd(.3, .5), rnd(2.5, 5), WHITE); }
    else if (ph === "swim") { if (G.yw < 70 && G.duck <= 0) foamRing(x, y + 14, 16, 6, .7, 2.5); else foamDot(x, y - 40, 14, .5); }
  }

  function dispose() { try { if (ro) ro.disconnect(); R.dispose(); scene.traverse(o => { if (o.geometry) o.geometry.dispose(); }); disposables.forEach(d => d.dispose && d.dispose()); } catch (e) {} }
  // warm-up: compile every shader now so the first frame of play doesn't hitch
  render(); try { R.compile(scene, cam); } catch (e) {}
  window.__NV3dbg = () => ({ rig: rig.position.toArray().map(Math.round), board: boardG.position.toArray().map(Math.round), lift: lift.rotation.toArray().slice(0, 3).map(v => +v.toFixed(2)), w: [runW, swimW, balW, fallW, airW].map(v => +v.toFixed(2)), jump: G.jump, trick: G.trick && G.trick.k, wipe: G.wipe, carry: carry, body: body.position.toArray() });
  return { render: render, dispose: dispose, rig: function (s) { return s === "m" && !!gSurf; } };
}

window.NV3D = { init: init };
if (window.__NV3boot) window.__NV3boot(window.NV3D);
