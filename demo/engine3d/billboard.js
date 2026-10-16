/* engine3d/billboard.js — a digital LED billboard that plays a looping video (Antidote's food review) on a VideoTexture.
   One <video> element is shared by every board on the page (muted, inline, looping: the iPhone autoplay rules). If autoplay
   is blocked the screen shows the poster image and retries on the next tap / key. The screen gets an LED pixel-grid look,
   an emissive glow onto the surroundings, a black bezel, a brand strip and a steel pole.
     const vb = makeVideoBoards(THREE, { src: "img/review/billboard.mp4", poster: "img/review/billboard.jpg" })
     const board = vb.create({ w: 64, h: 114, pole: 46, caption: "ANTIDOTE FOOD REVIEW · antidotethefoodie.com" })   // Group, screen faces +Z
     vb.update(t)   (once per frame: LED shimmer; texture refresh is automatic)   vb.playing → true once frames flow */
export function makeVideoBoards(THREE, O) {
  const video = document.createElement("video");
  Object.assign(video, { src: O.src, muted: true, loop: true, playsInline: true, autoplay: true, preload: "auto", crossOrigin: "anonymous" });
  video.setAttribute("muted", ""); video.setAttribute("playsinline", ""); video.setAttribute("webkit-playsinline", ""); video.defaultMuted = true;
  video.style.cssText = "position:absolute;width:1px;height:1px;opacity:0;pointer-events:none";
  const vtex = new THREE.VideoTexture(video); vtex.colorSpace = THREE.SRGBColorSpace; vtex.minFilter = THREE.LinearFilter; vtex.generateMipmaps = false;
  const ptex = new THREE.TextureLoader().load(O.poster); ptex.colorSpace = THREE.SRGBColorSpace;
  const U = { uVid: { value: vtex }, uPoster: { value: ptex }, uLive: { value: 0 }, uT: { value: 0 }, uGrid: { value: new THREE.Vector2(O.cols || 90, O.rows || 160) }, uBright: { value: O.bright || 1.6 } };
  let tried = 0; const tryPlay = () => { tried++; const p = video.play(); if (p && p.catch) p.catch(() => {}); };
  video.addEventListener("playing", () => { U.uLive.value = 1; api.playing = true; });
  ["pointerdown", "touchstart", "keydown"].forEach(ev => window.addEventListener(ev, () => { if (video.paused) tryPlay(); }, { passive: true }));
  document.addEventListener("visibilitychange", () => { if (!document.hidden && video.paused) tryPlay(); });
  (document.body || document.documentElement).appendChild(video); tryPlay();
  const screenMat = new THREE.ShaderMaterial({ uniforms: U, toneMapped: false, fog: false,
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform sampler2D uVid; uniform sampler2D uPoster; uniform float uLive; uniform float uT; uniform vec2 uGrid; uniform float uBright; varying vec2 vUv;
      void main(){ vec3 c = mix(texture2D(uPoster, vUv).rgb, texture2D(uVid, vUv).rgb, uLive);
        c = pow(c, vec3(2.2));                                            // video is sRGB; the bright LED value lives in linear space
        vec2 g = fract(vUv * uGrid) - .5; float led = smoothstep(.5, .28, max(abs(g.x), abs(g.y)));   // the LED pixel grid
        float scan = .96 + .04 * sin(uT * 40.0 + vUv.y * 600.0);
        gl_FragColor = vec4(c * (.35 + .65 * led) * uBright * scan + c * .08, 1.0); }` });
  const bezel = new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: .5, metalness: .6 }), steel = new THREE.MeshStandardMaterial({ color: 0x5d636c, roughness: .45, metalness: .8 });
  const glowTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d"), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, "rgba(255,255,255,.9)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const capTex = (txt) => { const c = document.createElement("canvas"); c.width = 1024; c.height = 64; const x = c.getContext("2d"); x.fillStyle = "#0b0b0e"; x.fillRect(0, 0, 1024, 64); x.font = "800 34px Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillStyle = "#f0d375"; x.shadowColor = "#f0d375"; x.shadowBlur = 10; x.fillText(txt, 512, 34); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const api = { video, texture: vtex, playing: false,
    create(o = {}) { const w = o.w || 64, h = o.h || w * 16 / 9, pole = o.pole || 40, g = new THREE.Group();
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(w, h), screenMat); scr.position.set(0, pole + h / 2, 1.3); g.add(scr);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 5, h + 5, 2.4), bezel); frame.position.set(0, pole + h / 2, 0); frame.castShadow = true; g.add(frame);
      const back = new THREE.Mesh(new THREE.BoxGeometry(w * .8, h * .8, 5), steel); back.position.set(0, pole + h / 2, -3.5); g.add(back);
      if (o.caption) { const cap = new THREE.Mesh(new THREE.PlaneGeometry(w + 5, 6), new THREE.MeshBasicMaterial({ map: capTex(o.caption), toneMapped: false })); cap.position.set(0, pole - 3.4, 1.3); g.add(cap);
        const cb = new THREE.Mesh(new THREE.BoxGeometry(w + 5, 6.4, 2), bezel); cb.position.set(0, pole - 3.4, 0); g.add(cb); }
      const p = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.4, pole, 8).translate(0, pole / 2 - 6.6, 0), steel); p.castShadow = true; g.add(p);
      [-1, 1].forEach(s => { const br = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 6), steel); br.position.set(s * w * .3, pole + h * .2, -5); g.add(br); });
      // the screen's light spill: a soft additive halo behind + a pool on the ground in front
      const halo = new THREE.Mesh(new THREE.PlaneGeometry(w * 2.2, h * 1.7), new THREE.MeshBasicMaterial({ map: glowTex, color: 0x9fb8ff, transparent: true, opacity: .22, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); halo.position.set(0, pole + h / 2, -.8); g.add(halo);
      const pool = new THREE.Mesh(new THREE.PlaneGeometry(w * 2, w * 1.6).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: glowTex, color: 0xb0c4ff, transparent: true, opacity: .28, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); pool.position.set(0, .6, w * .6); g.add(pool);
      g.userData.halo = halo; g.userData.pool = pool; return g; },
    update(t) { U.uT.value = t; if (!api.playing && video.readyState >= 2 && !video.paused) { U.uLive.value = 1; api.playing = true; } } };
  return api;
}
