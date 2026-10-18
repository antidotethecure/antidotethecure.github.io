/* Melody: "🔄 Spin in 3D" on the digital menu (Antidote, 2026-10-13: "I want a 3D rendering to where you can click it in 3D,
   go around it"). A real three.js viewer: the dish's GLB sits on a ceramic plate (drinks: a coaster), soft studio light from
   an environment map, a key-light shadow plus a contact shadow, OrbitControls (drag all the way around, pinch/scroll zoom with
   limits, double-tap resets), slow auto-spin until the guest touches it.
   · Lazy: three.js (the page's import map, r160) and the GLB load only when the viewer opens. Spinner while loading.
   · No WebGL / load error: the viewer shows the menu photo instead.
   · Close: ✕, Esc, or swipe down on the title bar / caption.
   · Only dishes ON Melody's menu (FOOD + DRINKS in index.html) and only models that look real enough up close (checked from
     4 angles 2026-10-13). Mac & cheese keeps its real slow-mo clips, no 3D here.
   · Screen lock / pause (../gamelock.js, ../gamepause.js): the viewer is a body-level overlay, never inside a game area, its
     canvas is not canvas#cv/#game/[data-game] (so the lock never grabs or neuters its touches) and it has touch-action:none.
     It runs on the browser's own requestAnimationFrame captured before gamepause.js wraps it, so a paused game never freezes
     the viewer. Load this file BEFORE gamelock.js.
   To add a dish: one row in DISH below (name = the exact menu name, glb in 3d/, base plate|board|coaster). */
(function () {
  "use strict";
  if (window.DISH3D) return;
  var W = window, D = document;
  var raf = W.requestAnimationFrame.bind(W), caf = W.cancelAnimationFrame.bind(W);   // real ones, before gamepause.js wraps them
  var T = function (s) { return (W.__T || String)(s); };
  // name: [game model in 3d/ (or null), base, upgraded model in 3d/menu/ (or null), { az: max degrees either side of the front,
  //   minPolar/maxPolar: tilt limits in radians, fill: width on the plate (plate radius 1, default 1.62), rotY: degrees }]
  // An upgraded model (real-photo scan) loads first and falls back to the game model if it fails. A dish with neither is hidden.
  // Single-photo scans invent their hidden back: if it looks bad, set az (e.g. 60) to keep the spin to the photographed side.
  var DISH = {
    // a Tripo scan of the real review frame (125.5 s) was tried 2026-10-13 and NOT used: smooth glazed drumsticks with no lemon-
    // pepper crust, burnt-black blobs and a sauce cup floating off the tray; the game model reads better. To try it again:
    // ["p_wings.glb?v=st3", "plate", "menu/wings.glb?v=…", { az: 70 }]
    "Lemon Pepper Wings": ["p_wings.glb?v=st3", "plate"],
    "Buttermilk Chicken Strips & Fries": ["p_strips.glb?v=st3", "plate"],
    "Baby Back Ribs & Fries": ["p_ribs.glb?v=st3", "plate"],
    "Shrimp Tacos": ["p_tacos.glb?v=st3", "plate"],
    "Nachos": ["p_nachos.glb?v=fv2", "board"],          // the model brings its own plate: it goes on a wood board
    "Mango Margarita": ["p_marg.glb?v=ag1", "coaster"],  // mango + chili rim: NOT used for the House Margarita (lime/salt)
    "Mimosa": ["p_mimosa.glb?v=fv2", "coaster"],
    "Espresso Martini": ["p_espresso.glb?v=fv2", "coaster"],
    // REAL FOOTAGE, not a model (2026-10-17, Antidote: the 3D burger looked fake): an orbit video made from his real burger photo,
    // built as a seamless ping-pong (5 s forward + 5 s back, keyframe every 0.5 s so dragging can scrub it). Dragging turns the burger.
    "Melody Burger": [null, "plate", null, { video: "3d/menu/melody-burger-real.mp4?v=rv1", poster: "3d/menu/melody-burger-real.jpg?v=rv1", half: 5 }]
    // Michelada: there is no michelada model (p_mic.glb is the karaoke microphone).
  };
  var HERE = ((D.currentScript || {}).src || "").replace(/[^\/]*$/, "");

  var css =
    ".d3d-btn{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;margin:0 0 7px;padding:7px 8px;border-radius:10px;border:1px solid #3a4a72;background:linear-gradient(180deg,#1d2a4a,#141e34);color:#f6f1e4;font:800 13px var(--body,system-ui);cursor:pointer;-webkit-tap-highlight-color:transparent}" +
    ".d3d-btn:active{background:#27324d}" +
    "#d3d-o{position:fixed;inset:0;z-index:2147483600;display:none;flex-direction:column;background:radial-gradient(ellipse 120% 80% at 50% 42%,#2a3350 0%,#121a2e 55%,#070a12 100%);color:#f6f1e4;font-family:var(--body,system-ui,-apple-system,sans-serif);overscroll-behavior:none;touch-action:none;transition:transform .22s ease,opacity .22s ease}" +
    "#d3d-o.on{display:flex}#d3d-o.drag{transition:none}" +
    "#d3d-o .d3d-top{position:relative;z-index:2;flex:none;padding:calc(8px + env(safe-area-inset-top)) 66px 6px 16px;min-height:58px;touch-action:none;cursor:grab}" +
    "#d3d-o .d3d-grab{display:block;width:40px;height:5px;border-radius:3px;background:#ffffff40;margin:0 auto 8px;position:relative;left:25px}" +
    "#d3d-o h3{margin:0;font-family:var(--display,Georgia,serif);font-weight:900;font-size:22px;line-height:1.15;color:#efe4c9}" +
    "#d3d-o .d3d-x{position:absolute;top:calc(10px + env(safe-area-inset-top));right:12px;width:44px;height:44px;border-radius:50%;border:1px solid #ffffff38;background:#0b1220cc;color:#fff;font:700 20px/1 system-ui;cursor:pointer;display:grid;place-items:center}" +
    "#d3d-o .d3d-st{position:relative;flex:1;min-height:0}" +
    "#d3d-o canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;outline:none;cursor:grab}" +
    "#d3d-o .d3d-ph{position:absolute;inset:8% 6%;display:none;align-items:center;justify-content:center}#d3d-o.fb .d3d-ph{display:flex}#d3d-o.fb canvas{display:none}" +
    "#d3d-o .d3d-ph img{max-width:100%;max-height:100%;border-radius:18px;box-shadow:0 24px 50px #000a}" +
    "#d3d-o .d3d-ld{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:#9aa3b5;font-size:13px;font-weight:700;letter-spacing:.08em}#d3d-o.ld .d3d-ld{display:flex}" +
    "#d3d-o .d3d-ld i{width:42px;height:42px;border-radius:50%;border:4px solid #ffffff22;border-top-color:#f0d375;animation:d3dspin .8s linear infinite}" +
    "html #d3d-o .d3d-ld i{animation-play-state:running!important}" +
    "#d3d-o .d3d-vid{position:absolute;inset:0;display:none;align-items:center;justify-content:center;touch-action:none;cursor:grab}#d3d-o.vid .d3d-vid{display:flex}#d3d-o.vid canvas{display:none}" +
    "#d3d-o .d3d-vid video{width:min(calc(100% - 32px),82vh);aspect-ratio:1;object-fit:cover;border-radius:22px;box-shadow:0 26px 60px #000b;pointer-events:none;background:#0b1220}" +
    "#d3d-o .d3d-cap{flex:none;padding:10px 16px calc(14px + env(safe-area-inset-bottom));text-align:center;touch-action:none}" +
    "#d3d-o .d3d-hint{display:inline-block;padding:7px 13px;border-radius:99px;background:#0b1220b3;border:1px solid #ffffff22;color:#cfd6e4;font-size:12.5px;font-weight:700;letter-spacing:.03em}" +
    "#d3d-o .d3d-cap p{margin:8px auto 0;max-width:420px;color:#9aa3b5;font-size:13px;line-height:1.35}" +
    "@keyframes d3dspin{to{transform:rotate(360deg)}}";
  var st = D.createElement("style"); st.textContent = css; D.head.appendChild(st);

  /* ---------------- menu buttons ---------------- */
  function cardFor(name) { return D.querySelector('article.item[data-name="' + name.replace(/"/g, '\\"') + '"]'); }
  function live(name) { var d = DISH[name]; return !!(d && (d[0] || d[2] || (d[3] && d[3].video))); }
  function addButtons() {
    Object.keys(DISH).filter(live).forEach(function (name) {
      var c = cardFor(name); if (!c || c.querySelector(".d3d-btn")) return;
      var tx = c.querySelector(".tx"), p = tx && tx.querySelector("p"); if (!tx) return;
      var b = D.createElement("button"); b.type = "button"; b.className = "d3d-btn"; b.dataset.d3d = name;
      var real = DISH[name][3] && DISH[name][3].video, lab = real ? T("See it spin") : T("Spin in 3D"); b.textContent = "🔄 " + lab; b.setAttribute("aria-label", lab + ": " + T(name));   /* real footage is not "3D" */
      if (p) p.insertAdjacentElement("afterend", b); else tx.appendChild(b);
    });
  }
  D.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest(".d3d-btn"); if (b) { e.preventDefault(); e.stopPropagation(); open(b.dataset.d3d); return; }
    // the photo's own "◉ 3D" badge (../menu3d.js) on these cards opens the real 3D view too, instead of the flat plate
    var m = e.target.closest && e.target.closest(".m3d-b"), c = m && m.closest("article.item");
    if (c && live(c.dataset.name)) { e.preventDefault(); e.stopImmediatePropagation(); open(c.dataset.name); }
  }, true);
  addButtons();
  new MutationObserver(addButtons).observe(D.body, { childList: true, subtree: true });

  /* ---------------- overlay ---------------- */
  var O = D.createElement("div"); O.id = "d3d-o"; O.setAttribute("role", "dialog"); O.setAttribute("aria-modal", "true");
  O.innerHTML = '<div class="d3d-top"><span class="d3d-grab" aria-hidden="true"></span><h3></h3><button type="button" class="d3d-x" aria-label="' + T("Close") + '">✕</button></div>' +
    '<div class="d3d-st"><div class="d3d-vid"><video muted playsinline autoplay loop preload="metadata" disablepictureinpicture></video></div><div class="d3d-ph"><img alt=""></div><div class="d3d-ld" aria-live="polite"><i></i><span>' + T("Plating it…") + '</span></div></div>' +
    '<div class="d3d-cap"><span class="d3d-hint"></span><p></p></div>';
  D.body.appendChild(O);
  var stage = O.querySelector(".d3d-st"), hint = O.querySelector(".d3d-hint");
  O.querySelector(".d3d-x").onclick = close;
  D.addEventListener("keydown", function (e) { if (e.key === "Escape" && O.classList.contains("on")) close(); });

  // swipe down on the title bar or the caption closes it (the 3D area itself belongs to the spin)
  var sw = null;
  [O.querySelector(".d3d-top"), O.querySelector(".d3d-cap")].forEach(function (z) {
    z.addEventListener("pointerdown", function (e) { if (e.target.closest(".d3d-x")) return; sw = { y: e.clientY, id: e.pointerId, t: e.timeStamp }; O.classList.add("drag"); try { z.setPointerCapture(e.pointerId); } catch (x) {} });
    z.addEventListener("pointermove", function (e) { if (!sw || e.pointerId !== sw.id) return; var dy = Math.max(0, e.clientY - sw.y); O.style.transform = "translateY(" + dy + "px)"; O.style.opacity = String(1 - Math.min(.6, dy / 600)); });
    var end = function (e) { if (!sw || e.pointerId !== sw.id) return; var dy = e.clientY - sw.y, fast = dy > 40 && e.timeStamp - sw.t < 250; sw = null; O.classList.remove("drag");
      if (dy > 110 || fast) close(); else { O.style.transform = ""; O.style.opacity = ""; } };
    z.addEventListener("pointerup", end); z.addEventListener("pointercancel", end);
  });

  var prevOverflow = "", cur = null, last = "", token = 0;
  function photoOf(name) { var c = cardFor(name), im = c && (c.querySelector(".media img.full") || c.querySelector(".media img")); return im ? (im.currentSrc || im.src) : ""; }
  function open(name) {
    var c = cardFor(name), desc = c && c.querySelector(".tx p");
    O.querySelector("h3").textContent = T(name);
    O.querySelector(".d3d-cap p").textContent = desc ? desc.textContent : "";
    O.querySelector(".d3d-ph img").src = photoOf(name);
    O.querySelector(".d3d-ph img").alt = T(name);
    O.setAttribute("aria-label", T(name) + " · 3D");
    hint.textContent = T("Drag to spin · pinch to zoom · double-tap to reset");
    O.style.transform = ""; O.style.opacity = "";
    O.classList.remove("fb"); O.classList.add("on", "ld");
    prevOverflow = D.documentElement.style.overflow; D.documentElement.style.overflow = "hidden";
    cur = last = name; var my = ++token;
    var vd = DISH[name] && DISH[name][3] && DISH[name][3].video ? DISH[name][3] : null; O.classList.toggle("vid", !!vd);
    if (vd) { if (V3) V3.stop(); hint.textContent = T("Drag to turn it"); playVideo(vd, my); O.querySelector(".d3d-x").focus({ preventScroll: true }); return; }
    stopVideo();
    if (!webgl()) return fallback("no WebGL");
    boot().then(function (V3) { if (my !== token) return; return V3.show(name, DISH[name]); })
      .then(function () { if (my !== token) return; O.classList.remove("ld"); })
      .catch(function (err) { if (my !== token) return; console.warn("[dish3d] showing the photo instead:", err && err.message || err); fallback(); });
    O.querySelector(".d3d-x").focus({ preventScroll: true });
  }
  function fallback() { O.classList.remove("ld", "vid"); O.classList.add("fb"); hint.textContent = T("Photo view"); if (V3) V3.stop(); stopVideo(); }
  /* ---------------- real-footage dishes: a looping video (muted, inline, autoplay), drag scrubs it so the dish turns under your finger ---------------- */
  var vbox = O.querySelector(".d3d-vid"), vid = vbox.querySelector("video"), VS = { half: 5, drag: null };
  function playVideo(vd, my) { VS.half = vd.half || 5; var src = HERE + vd.video;
    if (vid.getAttribute("data-src") !== src) { vid.setAttribute("data-src", src); vid.poster = HERE + vd.poster; vid.src = src; }
    var ok = function () { if (my !== token) return; O.classList.remove("ld"); }; vid.addEventListener("loadeddata", ok, { once: true }); if (vid.readyState >= 2) ok();
    vid.onerror = function () { if (my !== token) return; console.warn("[dish3d] video failed, showing the photo"); fallback(); };
    var p = vid.play(); if (p && p.catch) p.catch(function () { O.classList.remove("ld"); });   /* autoplay refused (low power mode): the poster shows, a drag still turns it */ }
  function stopVideo() { try { vid.pause(); } catch (e) {} }
  // the file is forward-then-back; dragging works on the forward half: angle = time within [0, half]
  vbox.addEventListener("pointerdown", function (e) { if (!O.classList.contains("vid")) return; var t = vid.currentTime || 0; VS.drag = { x: e.clientX, id: e.pointerId, a: t > VS.half ? 2 * VS.half - t : t }; vid.pause(); vbox.style.cursor = "grabbing"; try { vbox.setPointerCapture(e.pointerId); } catch (x) {} });
  vbox.addEventListener("pointermove", function (e) { var d = VS.drag; if (!d || e.pointerId !== d.id) return; var a = Math.max(0, Math.min(VS.half - .04, d.a - (e.clientX - d.x) / Math.max(200, vbox.clientWidth) * VS.half * 1.4));
    if (Math.abs(a - (vid.currentTime || 0)) > .02 && !vid.seeking) vid.currentTime = a; d.cur = a; });
  var vEnd = function (e) { var d = VS.drag; if (!d || e.pointerId !== d.id) return; VS.drag = null; vbox.style.cursor = ""; var p = vid.play(); if (p && p.catch) p.catch(function () {}); };
  vbox.addEventListener("pointerup", vEnd); vbox.addEventListener("pointercancel", vEnd);
  vbox.addEventListener("dblclick", function () { vid.currentTime = 0; var p = vid.play(); if (p && p.catch) p.catch(function () {}); });
  function close() {
    if (!O.classList.contains("on")) return;
    token++; O.classList.remove("on", "ld", "fb", "drag"); O.style.transform = ""; O.style.opacity = "";
    D.documentElement.style.overflow = prevOverflow; cur = null;
    if (V3) V3.stop(); stopVideo(); O.classList.remove("vid");
    var c = last && cardFor(last), b = c && c.querySelector(".d3d-btn"); if (b) b.focus({ preventScroll: true });
  }
  var hasGL = null;
  function webgl() { if (hasGL === null) { try { var c = D.createElement("canvas"); hasGL = !!(W.WebGL2RenderingContext && c.getContext("webgl2")) || !!c.getContext("webgl"); } catch (e) { hasGL = false; } } return hasGL; }

  /* ---------------- three.js viewer (built once, on first open) ---------------- */
  var V3 = null, booting = null;
  function boot() {
    if (V3) return Promise.resolve(V3);
    if (booting) return booting;
    booting = Promise.all([
      import("three"), import("three/addons/loaders/GLTFLoader.js"), import("three/addons/libs/meshopt_decoder.module.js"),
      import("three/addons/controls/OrbitControls.js"), import("three/addons/environments/RoomEnvironment.js")
    ]).then(function (m) { V3 = build(m[0], m[1].GLTFLoader, m[2].MeshoptDecoder, m[3].OrbitControls, m[4].RoomEnvironment); return V3; });
    booting.catch(function () { booting = null; });
    return booting;
  }

  function build(THREE, GLTFLoader, MeshoptDecoder, OrbitControls, RoomEnvironment) {
    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(2, W.devicePixelRatio || 1));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);
    var cv = renderer.domElement; cv.className = "d3d-cv"; cv.setAttribute("aria-label", T("3D view: drag to spin"));
    stage.insertBefore(cv, stage.firstChild);
    cv.addEventListener("webglcontextlost", function (e) { e.preventDefault(); fallback(); });

    var scene = new THREE.Scene();
    var pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(new RoomEnvironment(renderer), 0.04).texture;   // soft studio light
    var key = new THREE.DirectionalLight(0xfff1dc, 1.6); key.position.set(-2.2, 4.2, 2.4);
    key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 6; key.shadow.bias = -0.0008; key.shadow.normalBias = 0.02;
    Object.assign(key.shadow.camera, { left: -2, right: 2, top: 2, bottom: -2, near: 0.5, far: 12 });
    var rim = new THREE.DirectionalLight(0xbfd0ff, 0.7); rim.position.set(2.5, 2.2, -3);
    scene.add(key, rim, new THREE.HemisphereLight(0xfff6e8, 0x20242e, 0.35));

    var cam = new THREE.PerspectiveCamera(34, 1, 0.05, 60);
    var ctl = new OrbitControls(cam, cv);
    ctl.enableDamping = true; ctl.dampingFactor = 0.08; ctl.enablePan = false;
    ctl.rotateSpeed = 0.9; ctl.zoomSpeed = 0.8;
    ctl.minPolarAngle = 0.12; ctl.maxPolarAngle = 1.42;   // never under the table
    ctl.autoRotateSpeed = 1.6;
    ctl.addEventListener("start", function () { ctl.autoRotate = false; });

    // double-tap / double-click resets the view (and the slow spin)
    var lastTap = 0, lastX = 0, lastY = 0, downAt = 0, downX = 0, downY = 0;
    cv.addEventListener("pointerdown", function (e) { downAt = e.timeStamp; downX = e.clientX; downY = e.clientY; });
    cv.addEventListener("pointerup", function (e) {
      if (e.timeStamp - downAt > 300 || Math.hypot(e.clientX - downX, e.clientY - downY) > 10) return;
      if (e.timeStamp - lastTap < 330 && Math.hypot(e.clientX - lastX, e.clientY - lastY) < 40) { lastTap = 0; reset(); return; }
      lastTap = e.timeStamp; lastX = e.clientX; lastY = e.clientY;
    });
    cv.addEventListener("dblclick", function (e) { e.preventDefault(); reset(); });

    /* ---- props: plate, board, coaster, floor shadow ---- */
    var tex = function (w, h, draw, srgb) { var c = D.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); var t = new THREE.CanvasTexture(c); if (srgb !== false) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
    // plate: lathe profile (foot, underside, rim with a rolled lip, slope into the well, flat well)
    var P = [[0, 0], [0.5, 0], [0.53, 0.004], [0.55, 0.014], [0.6, 0.016], [0.95, 0.07], [1.0, 0.083], [1.012, 0.093], [1.0, 0.1], [0.96, 0.098], [0.66, 0.04], [0.62, 0.032], [0.3, 0.03], [0, 0.03]]
      .map(function (p) { return new THREE.Vector2(p[0], p[1]); });
    var plateGeo = new THREE.LatheGeometry(P, 128);
    var plateMat = new THREE.MeshPhysicalMaterial({ color: 0xf5f2ec, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 0.8 });
    var plate = new THREE.Mesh(plateGeo, plateMat); plate.castShadow = true; plate.receiveShadow = true;
    // wood board (nachos)
    var woodTex = tex(1024, 512, function (g, w, h) {
      g.fillStyle = "#7a4a26"; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 260; i++) { var y = Math.random() * h; g.strokeStyle = "rgba(" + (Math.random() < .5 ? "40,20,8," : "160,105,60,") + (0.05 + Math.random() * 0.12) + ")"; g.lineWidth = 1 + Math.random() * 3; g.beginPath(); g.moveTo(0, y); for (var x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x / 90 + i) * 4); g.stroke(); }
    });
    var boardGeo = new THREE.CylinderGeometry(1.18, 1.18, 0.08, 96); boardGeo.translate(0, 0.04, 0);   // round wood serving board
    var woodTop = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.6 }), woodSide = new THREE.MeshStandardMaterial({ color: 0x5e3819, roughness: 0.7 });
    var board = new THREE.Mesh(boardGeo, [woodSide, woodTop, woodSide]); board.castShadow = true; board.receiveShadow = true;
    // coaster: round cork-ish with the Melody mark
    var coasterTex = tex(512, 512, function (g, w, h) {
      g.fillStyle = "#c79a64"; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 9000; i++) { g.fillStyle = "rgba(" + (Math.random() < .5 ? "90,55,25," : "235,200,150,") + (0.08 + Math.random() * 0.2) + ")"; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2.5, 1 + Math.random() * 2.5); }
      g.strokeStyle = "rgba(119,36,46,.75)"; g.lineWidth = 10; g.beginPath(); g.arc(w / 2, h / 2, w * 0.43, 0, Math.PI * 2); g.stroke();
      g.fillStyle = "rgba(119,36,46,.8)"; g.font = "900 54px Georgia,serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("MELODY", w / 2, h * 0.78);
    });
    var coaster = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.05, 96),
      [new THREE.MeshStandardMaterial({ color: 0x9a7346, roughness: 0.9 }), new THREE.MeshStandardMaterial({ map: coasterTex, roughness: 0.88 }), new THREE.MeshStandardMaterial({ color: 0x8a6440, roughness: 0.9 })]);
    coaster.position.y = 0.025; coaster.castShadow = true; coaster.receiveShadow = true;
    // floor: key-light shadow (ShadowMaterial) + a soft contact shadow right under the base
    var floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.ShadowMaterial({ opacity: 0.32 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
    var blobTex = tex(256, 256, function (g, w, h) { var gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, "rgba(0,0,0,.75)"); gr.addColorStop(.55, "rgba(0,0,0,.4)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    var blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false })); blob.rotation.x = -Math.PI / 2; blob.position.y = 0.002; blob.renderOrder = -1;
    scene.add(floor, blob);

    var loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
    var cache = {}, group = new THREE.Group(); scene.add(group);
    function load(url) {
      if (!cache[url]) cache[url] = loader.loadAsync(HERE + "3d/" + url).then(function (g) {
        g.scene.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; [].concat(o.material).forEach(function (m) { if (m.map) m.map.anisotropy = 4; m.envMapIntensity = 0.8;
          // real-photo scans (3d/menu/) already carry the photo's light in their colour: tone them down a touch and give the
          // glaze back a little shine so they don't wash out under the studio key light
          if (/^menu\//.test(url)) { m.color.multiplyScalar(0.8); m.roughness = 0.72; m.envMapIntensity = 0.65; } }); } });
        return g.scene;
      });
      cache[url].catch(function () { delete cache[url]; });
      return cache[url];
    }

    var home = { pos: new THREE.Vector3(), tgt: new THREE.Vector3() }, frame = 0, running = false, size = [0, 0];
    function fit() {
      var w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
      if (w !== size[0] || h !== size[1]) { size = [w, h]; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); return true; }
    }
    function reset() { cam.position.copy(home.pos); ctl.target.copy(home.tgt); ctl.autoRotate = true; ctl.update(); }
    var azLim = Infinity;
    function loop() {
      if (!running) return; fit();
      if (ctl.autoRotate && azLim < Math.PI) {   // limited dish: the slow spin swings back and forth inside the limit
        var a = ctl.getAzimuthalAngle(), sp = Math.abs(ctl.autoRotateSpeed);
        if (a >= azLim - 0.03) ctl.autoRotateSpeed = sp; else if (a <= -azLim + 0.03) ctl.autoRotateSpeed = -sp;
      }
      ctl.update(); renderer.render(scene, cam); frame = raf(loop); }
    W.addEventListener("resize", function () { if (running && fit()) frame3(); });
    function frame3() { var r = group.userData.r; if (r) aim(r); }

    function aim(r) {   // frame the whole setting: base radius r, top at group.userData.top
      var top = group.userData.top, vfov = cam.fov * Math.PI / 180, hfov = 2 * Math.atan(Math.tan(vfov / 2) * cam.aspect);
      var need = group.userData.drink ? Math.max(r * 1.15, top * 0.56) : Math.max(r, top * 0.75) * 1.08, dist = Math.max(need / Math.sin(Math.min(vfov, hfov) / 2), 1.5);
      var el = group.userData.drink ? 0.32 : 0.62, tgt = new THREE.Vector3(0, group.userData.drink ? top * 0.42 : top * 0.3, 0);
      home.tgt.copy(tgt); home.pos.set(0, tgt.y + dist * Math.sin(el), dist * Math.cos(el));
      ctl.minDistance = dist * 0.45; ctl.maxDistance = dist * 1.8;
      reset();
    }

    function show(name, cfg) {
      var src0 = cfg[2] ? load(cfg[2]).catch(function (e) { if (!cfg[0]) throw e; console.warn("[dish3d] upgraded model failed, using the game model", e && e.message); return load(cfg[0]); }) : load(cfg[0]);
      var o = cfg[3] || {}, lim = o.az ? o.az * Math.PI / 180 : Infinity;
      azLim = lim; ctl.minAzimuthAngle = -lim; ctl.maxAzimuthAngle = lim;
      ctl.minPolarAngle = o.minPolar || 0.12; ctl.maxPolarAngle = o.maxPolar || 1.42;
      return src0.then(function (src) {
        if (cur !== name) return;
        group.clear();
        var m = src.clone(true), base = cfg[1], drink = base === "coaster";
        if (cfg[3] && cfg[3].rotY) m.rotation.y = cfg[3].rotY * Math.PI / 180;
        m.updateMatrixWorld(true);
        var bb = new THREE.Box3().setFromObject(m), sz = bb.getSize(new THREE.Vector3()), foot = Math.max(sz.x, sz.z);
        var s, surface, baseR;
        if (drink) {   // glass ~1.55 tall, coaster a bit wider than the glass
          s = 1.55 / sz.y; surface = 0.05; baseR = Math.min(0.62, foot * s * 0.5 + 0.14);
          coaster.scale.set(baseR, 1, baseR); group.add(coaster);
        } else if (base === "board") {
          s = 1.95 / foot; surface = 0.08; baseR = 1.18; group.add(board);
        } else {       // plate: the food fills ~78% of the well-to-rim width
          s = ((cfg[3] && cfg[3].fill) || 1.62) / foot; surface = 0.03; baseR = 1.02; group.add(plate);
        }
        m.scale.setScalar(s); m.updateMatrixWorld(true);
        bb.setFromObject(m); var c = footCenter(m, bb);
        m.position.set(-c.x, surface - bb.min.y, -c.z);   // centered on what it stands on, sitting on the surface
        group.add(m);
        group.userData = { r: baseR, top: surface + bb.max.y - bb.min.y, drink: drink };
        blob.scale.set(baseR * 2.5, baseR * 2.5, 1);
        size = [0, 0]; fit(); aim(baseR);
        start();
      });
    }
    // center of the bottom 12% (plate, basket, glass foot), so a garnish or a stray chip sticking out never pushes it off-center
    function footCenter(m, bb) {
      var lim = bb.min.y + (bb.max.y - bb.min.y) * 0.12, fb = new THREE.Box3(), v = new THREE.Vector3();
      m.traverse(function (o) { if (!o.isMesh) return; var pos = o.geometry.attributes.position; for (var i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld); if (v.y <= lim) fb.expandByPoint(v); } });
      return fb.isEmpty() ? bb.getCenter(new THREE.Vector3()) : fb.getCenter(new THREE.Vector3());
    }
    function start() { if (running) return; running = true; frame = raf(loop); }
    function stop() { running = false; caf(frame); }
    return { show: show, stop: stop, reset: reset, renderer: renderer, camera: cam, controls: ctl, scene: scene };
  }

  W.DISH3D = { open: open, close: close, list: function () { return Object.keys(DISH).filter(live); }, get viewer() { return V3; } };
})();
