/* Second Shift AI — real 3D burger build (WebGL, three.js r128). Used by menu3d.js for MENU3D.stack dishes.
   BURGER3D.mount(el, ids, imgBase, models) → { destroy(), replay(), drag(dx) } or null when WebGL isn't available.
   models (optional) = { bun_top: "img/3d/bun_top.glb", ... }: real scanned meshes (photo-textured GLB) used instead of the
   built-in shapes; each is scaled to the bun's width and sat on the stack. Needs THREE.GLTFLoader (menu3d.js loads it).
   The burger turns 360° the whole time while each ingredient falls out of the air onto it:
   - layers land like rag dolls (squash, tip, rock, settle) and everything underneath gives and springs back
   - patties and chicken steam, cheese melts and drapes over the meat, lettuce flaps, tomato and veg carry water beads
   Textures are cropped from the restaurant's own ingredient photos (img/build/<id>.webp), so it costs nothing to add. */
window.BURGER3D = window.BURGER3D || (function () {
  "use strict";
  var T;
  // where to crop each photo for its texture: [x0, y0, x1, y1] as fractions of the image
  var CROP = { bun_bottom: [.15, .1, .85, .4], bun_side: [.1, .6, .9, .85], patty: [.15, .2, .85, .75], lettuce: [.2, .25, .8, .75],
    tomato: [.1, .15, .5, .55], bun_top: [.15, .1, .85, .6], pickles: [.55, .3, .85, .7], pickles_crinkle: [.3, .2, .7, .8], bacon: [.1, .2, .9, .5],
    chicken: [.15, .2, .85, .7], chicken_spicy: [.15, .2, .85, .7], slaw: [.15, .2, .85, .8], onion_straws: [.1, .15, .9, .85] };
  // how tall each layer sits in the stack (bun radius = 1)
  var H = { bun_bottom: .42, patty: .24, cheese: .03, swiss: .03, lettuce: .11, tomato: .09, onion: .05, pickles: .045, pickles_crinkle: .045,
    bacon: .07, jalapeno: .05, tray: .05, fries: .22, strip: .12, onion_straws: .14, chicken: .3, chicken_spicy: .3, slaw: .14, bun_top: 0,
    turkey: .17, onion_grilled: .06, sauce_storm: .015, sauce_bbq: .015, sauce_crema: .015, sauce_mayo: .015, sauce_spicy_mayo: .015, sauce_thunder: .015 };
  // sauces: colour + how glossy/thick
  var SAUCE = { sauce_storm: [0xd9653a, .9], sauce_bbq: [0x4a160a, 1], sauce_crema: [0x7fa64a, .8], sauce_mayo: [0xe8dcb8, .8], sauce_spicy_mayo: [0xd8582e, .85], sauce_thunder: [0xc8460e, 1] };
  var WT = { patty: 1, chicken: 1, chicken_spicy: 1, bun_top: .8, bun_bottom: .8, cheese: .35, swiss: .35, lettuce: .3, tomato: .5, onion: .3, pickles: .3, pickles_crinkle: .3, bacon: .45, jalapeno: .3, onion_straws: .3, slaw: .45, turkey: .9, onion_grilled: .3 };

  function webgl() { try { var c = document.createElement("canvas"); return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl"))); } catch (e) { return false; } }
  function n2(a, b) { return Math.sin(a * 12.9898 + b * 78.233) * .5 + Math.sin(a * 5.1 + b * 3.7) * .5; }

  var GLB = {}; // url → loaded scene (shared between opens)
  function preload(models, cb) {
    var urls = Object.keys(models || {}).map(function (k) { return models[k]; }).filter(function (u) { return !GLB[u]; }), left = urls.length;
    if (!left || !window.THREE || !THREE.GLTFLoader) return cb();
    var L = new THREE.GLTFLoader();
    urls.forEach(function (u) { L.load(u, function (g) { GLB[u] = g.scene; if (!--left) cb(); }, null, function () { GLB[u] = null; if (!--left) cb(); }); });
  }
  function mount(el, ids, base, models) {
    T = window.THREE; if (!T || !webgl()) return null;
    var W = el.clientWidth || 320, HH = el.clientHeight || W, RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
    var R = new T.WebGLRenderer({ antialias: true, alpha: true });
    R.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); R.setSize(W, HH); R.outputEncoding = T.sRGBEncoding;
    R.toneMapping = T.ACESFilmicToneMapping; R.toneMappingExposure = .92;
    R.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;touch-action:none"; el.appendChild(R.domElement);
    var scene = new T.Scene(), cam = new T.PerspectiveCamera(32, W / HH, .1, 60);
    scene.add(new T.HemisphereLight(0xfff1dc, 0x1a1c28, .9));
    var key = new T.DirectionalLight(0xfff0d8, 1.7); key.position.set(3, 6, 4); scene.add(key);
    var rim = new T.DirectionalLight(0x9fc0ff, .9); rim.position.set(-4, 2.5, -4); scene.add(rim);
    var warm = new T.PointLight(0xffc890, .35, 12); warm.position.set(2.5, 1, 3); scene.add(warm);
    var G = new T.Group(); scene.add(G);
    // soft-box studio reflections: what makes glaze, grease and melted cheese read as wet and real
    try {
      var es = new T.Scene(), pm = new T.PMREMGenerator(R), box = function (c, w, h, x, y, z) { var q = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: c, side: T.DoubleSide })); q.position.set(x, y, z); q.lookAt(0, 0, 0); es.add(q); };
      es.background = new T.Color(0x14161c);
      box(0xffffff, 6, 3, 0, 6, 3); box(0xfff0dc, 3, 5, 6, 2, 2); box(0xb8ccff, 3, 4, -6, 1.5, -3); box(0xffd2a0, 8, 1.2, 0, -1, 6);
      scene.environment = pm.fromScene(es, .02).texture; pm.dispose();
    } catch (e) {}

    // soft contact shadow
    var sc = document.createElement("canvas"); sc.width = sc.height = 128; var sx = sc.getContext("2d"), gr = sx.createRadialGradient(64, 64, 4, 64, 64, 64);
    gr.addColorStop(0, "rgba(0,0,0,.75)"); gr.addColorStop(1, "rgba(0,0,0,0)"); sx.fillStyle = gr; sx.fillRect(0, 0, 128, 128);
    var shadow = new T.Mesh(new T.PlaneGeometry(3.2, 3.2), new T.MeshBasicMaterial({ map: new T.CanvasTexture(sc), transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = -.01; scene.add(shadow);

    var texCache = {}, imgs = {}, pending = 0, layers = [], steam = [], t0 = 0, raf = 0, spin = .65, spinV = 0, last = 0, built = false;
    function tex(id, crop) {
      var k = id + (crop || ""); if (texCache[k]) return texCache[k];
      var c = document.createElement("canvas"); c.width = c.height = 256; var t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4; texCache[k] = t;
      var draw = function (im) { var f = CROP[crop || id] || [.25, .25, .75, .75], x = c.getContext("2d");
        x.drawImage(im, f[0] * im.naturalWidth, f[1] * im.naturalHeight, (f[2] - f[0]) * im.naturalWidth, (f[3] - f[1]) * im.naturalHeight, 0, 0, 256, 256); t.needsUpdate = true; };
      if (imgs[id] && imgs[id].complete) draw(imgs[id]);
      else { var im = imgs[id] || (imgs[id] = new Image()); pending++; im.addEventListener("load", function () { draw(im); pending--; }); if (!im.src) im.src = base + id + ".webp"; }
      return t;
    }
    // hex colours are written in sRGB; convert so they don't wash out under tone mapping
    function lin(o) { if (o.color != null) o.color = new T.Color(o.color).convertSRGBToLinear(); return o; }
    function std(o) { return new T.MeshStandardMaterial(lin(o)); }
    function phys(o) { return new T.MeshPhysicalMaterial(lin(o)); }
    function wrapT(t) { t.wrapS = T.MirroredRepeatWrapping; t.repeat.x = 2; return t; } // seamless around a lathe
    // glazed brioche crown, painted (the photo's own highlight would show up as a pale patch once it spins)
    function brioche() {
      if (texCache.brioche) return texCache.brioche;
      var c = document.createElement("canvas"); c.width = 256; c.height = 256; var x = c.getContext("2d"), g = x.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, "#7a3a10"); g.addColorStop(.35, "#94481a"); g.addColorStop(.6, "#b0621f"); g.addColorStop(.74, "#c98236"); g.addColorStop(.82, "#e6bb78"); g.addColorStop(.9, "#f3d9a6"); g.addColorStop(1, "#e9c88c");
      x.fillStyle = g; x.fillRect(0, 0, 256, 256);
      for (var i = 0; i < 1400; i++) { var yy = Math.random() * 230; x.fillStyle = "rgba(" + (Math.random() < .5 ? "60,25,5," : "255,210,150,") + (Math.random() * .07) + ")"; x.fillRect(Math.random() * 256, yy, 1 + Math.random() * 3, 1 + Math.random() * 2); }
      var t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return (texCache.brioche = t);
    }
    // melted cheese: glossy orange with blistered bubbles and toasted spots, also used as its own bump map
    function cheeseTex(swiss) {
      var k = swiss ? "cheeseS" : "cheeseA"; if (texCache[k]) return texCache[k];
      var c = document.createElement("canvas"); c.width = c.height = 512; var x = c.getContext("2d");
      x.fillStyle = swiss ? "#efdc98" : "#f5a51c"; x.fillRect(0, 0, 512, 512);
      for (var i = 0; i < 60; i++) { var g = x.createRadialGradient(0, 0, 0, 0, 0, 1), cx = Math.random() * 512, cy = Math.random() * 512, r = 20 + Math.random() * 70;
        g.addColorStop(0, swiss ? "rgba(255,244,200,.35)" : "rgba(255,200,70,.35)"); g.addColorStop(1, "rgba(0,0,0,0)");
        x.save(); x.translate(cx, cy); x.scale(r, r * (.6 + Math.random() * .6)); x.fillStyle = g; x.beginPath(); x.arc(0, 0, 1, 0, 6.283); x.fill(); x.restore(); }
      for (var j = 0; j < 220; j++) { var bx = Math.random() * 512, by = Math.random() * 512, br = 2 + Math.random() * (Math.random() < .15 ? 14 : 6);
        var bg = x.createRadialGradient(bx - br * .3, by - br * .35, br * .1, bx, by, br);
        bg.addColorStop(0, "rgba(255,255,235,.85)"); bg.addColorStop(.45, swiss ? "rgba(250,230,160,.5)" : "rgba(255,190,60,.5)"); bg.addColorStop(1, swiss ? "rgba(170,140,60,.35)" : "rgba(170,80,0,.35)");
        x.fillStyle = bg; x.beginPath(); x.arc(bx, by, br, 0, 6.283); x.fill(); }
      for (var q = 0; q < 26; q++) { x.fillStyle = "rgba(150,70,10," + (.08 + Math.random() * .15) + ")"; x.beginPath(); x.ellipse(Math.random() * 512, Math.random() * 512, 4 + Math.random() * 14, 3 + Math.random() * 8, Math.random() * 3, 0, 6.283); x.fill(); }
      var t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return (texCache[k] = t);
    }
    function dripMesh(mat, w) { // a hanging drip: tapered strand with a heavy bead at the end; scale.y = length
      var d = new T.Group(), body = new T.Mesh(new T.CylinderGeometry(w, w * .75, 1, 12, 1, true), mat); body.position.y = -.5; d.add(body);
      var bead = new T.Mesh(new T.SphereGeometry(w * 1.05, 14, 10), mat); d.add(bead); d.scale.x = .55; /* flattened against the patty side (local x points outward) */ d.userData = { body: body, bead: bead }; return d;
    }
    function setDrip(d, len) { d.userData.body.scale.y = Math.max(.001, len); d.userData.body.position.y = -len / 2; d.userData.bead.position.y = -len; d.userData.bead.scale.y = 1 + len * 2.2; d.visible = len > .005; }
    function crumb() { // fine dough pores + baked blisters for the bun's bump map
      if (texCache.crumb) return texCache.crumb;
      var c = document.createElement("canvas"); c.width = c.height = 256; var x = c.getContext("2d"); x.fillStyle = "#808080"; x.fillRect(0, 0, 256, 256);
      for (var i = 0; i < 2600; i++) { x.fillStyle = Math.random() < .5 ? "rgba(0,0,0,.18)" : "rgba(255,255,255,.18)"; x.beginPath(); x.arc(Math.random() * 256, Math.random() * 256, .5 + Math.random() * 1.6, 0, 6.283); x.fill(); }
      var t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(6, 3); return (texCache.crumb = t);
    }
    function lathe(pts, mat) { return new T.Mesh(new T.LatheGeometry(pts.map(function (p) { return new T.Vector2(p[0], p[1]); }), 72), mat); }
    function bumpy(geo, amt, freq) { // deterministic noise so shared edges don't crack
      var p = geo.attributes.position, v = new T.Vector3();
      for (var i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); var a = Math.atan2(v.z, v.x), r = Math.hypot(v.x, v.z), k = 1 + amt * (Math.sin(a * (freq || 5)) * .5 + Math.sin(a * 11 + 1.3) * .35 + n2(a, v.y) * .25);
        p.setXYZ(i, v.x * k, v.y + (r > .2 ? amt * .25 * n2(a * 3, r) : 0), v.z * k); }
      geo.computeVertexNormals(); return geo;
    }
    function drops(grp, n, rmax, y, rmin) { // water beads that glint as the burger turns
      var m = phys({ color: 0xffffff, roughness: .02, metalness: 0, transparent: true, opacity: .55, clearcoat: 1, clearcoatRoughness: 0 });
      for (var i = 0; i < n; i++) { var s = .018 + Math.random() * .03, d = new T.Mesh(new T.SphereGeometry(s, 10, 8), m), a = Math.random() * 6.283, r = (rmin || 0) + Math.random() * (rmax - (rmin || 0));
        d.scale.y = .7; d.position.set(Math.cos(a) * r, y + s * .5, Math.sin(a) * r); grp.add(d); }
    }

    function fromModel(id) {
      var mid = models && (models[id] ? id : id === "chicken_spicy" || id === "strip" ? "chicken" : null), src = mid && GLB[models[mid]]; if (!src) return null;
      // scanned pieces: scale to how wide that ingredient sits on a 4" bun, cap how tall a slice/topping can stand
      var WD = { bun_top: 2.06, bun_bottom: 2.06, patty: 2.0, turkey: 1.95, chicken: 2.3, chicken_spicy: 2.3, lettuce: 2.25, tomato: 1.9, bacon: 2.15, onion_straws: 1.95,
        pickles: 1.6, pickles_crinkle: 1.6, onion: 1.7, jalapeno: 1.6, slaw: 2.05, strips: 2.6, fries: 2.4 };
      var CAP = { patty: .32, turkey: .28, chicken: .42, chicken_spicy: .42, lettuce: .32, tomato: .2, bacon: .16, onion_straws: .32, pickles: .12, pickles_crinkle: .12, onion: .12, jalapeno: .12, slaw: .3 };
      var g = new T.Group(), m = src.clone(true), box = new T.Box3().setFromObject(m), sz = box.getSize(new T.Vector3()), k = (WD[id] || 2) / Math.max(sz.x, sz.z), ky = k;
      if (CAP[id] && sz.y * k > CAP[id]) ky = CAP[id] / sz.y;
      var MINH = { chicken: .3, chicken_spicy: .3, bacon: .07 }; if (MINH[id] && sz.y * ky < MINH[id]) ky = MINH[id] / sz.y; // flat scans get real thickness
      m.scale.set(k, ky, k); m.position.set(-(box.min.x + sz.x / 2) * k, -box.min.y * ky, -(box.min.z + sz.z / 2) * k);
      m.traverse(function (o) { if (o.isMesh) { o.material = [].concat(o.material).map(function (mt) { return mt.clone(); }); if (o.material.length === 1) o.material = o.material[0]; } });
      m.traverse(function (o) { if (o.material) { [].concat(o.material).forEach(function (mt) { if (mt.map) mt.map.encoding = T.sRGBEncoding; if (mt.emissiveMap) mt.emissiveMap.encoding = T.sRGBEncoding;
        mt.metalness = 0; if (mt.emissive) { mt.emissive.setRGB(0, 0, 0); mt.emissiveMap = null; } if (id === "bun_top") { mt.roughness = .55; mt.envMapIntensity = 1.2; } if (/patty|turkey/.test(id)) mt.roughness = .7; mt.needsUpdate = true; }); } });
      if (id === "chicken_spicy") m.traverse(function (o) { if (o.isMesh) [].concat(o.material).forEach(function (mt) { mt.color = new T.Color(0xff8a6a).convertSRGBToLinear(); }); });
      if (id === "strip") { var s2 = 1.15 / Math.max(sz.x, sz.z); m.scale.set(s2 * 1.25, s2 * .9, s2 * .42); m.position.set(-(box.min.x + sz.x / 2) * s2 * 1.25, -box.min.y * s2 * .9, -(box.min.z + sz.z / 2) * s2 * .42); ky = s2 * .9; }
      g.add(m); g.userData.h = sz.y * ky; g.userData.scanned = true; return g;
    }
    function make(id) {
      var g = fromModel(id), m; if (g) return g; g = new T.Group();
      if (id === "bun_bottom") {
        g.add(lathe([[0, 0], [.86, 0], [.97, .05], [1.02, .15], [1.03, .28], [1, .37], [.95, .42], [0, .42]], phys({ map: wrapT(tex(id, "bun_side")), color: 0xffffff, roughness: .55, clearcoat: .3 })));
        m = new T.Mesh(new T.CircleGeometry(.95, 64), std({ map: tex(id), roughness: .55 })); m.rotation.x = -Math.PI / 2; m.position.y = .422; g.add(m);
      } else if (id === "bun_top") {
        g.add(lathe([[.001, .66], [.3, .655], [.55, .62], [.75, .55], [.89, .45], [.98, .33], [1.03, .2], [1.04, .1], [1.02, .03], [.96, 0], [0, 0]].reverse(), phys({ map: brioche(), bumpMap: crumb(), bumpScale: .006, color: 0xffffff, roughness: .45, clearcoat: .6, clearcoatRoughness: .35 })));
        m = new T.Mesh(new T.CircleGeometry(.95, 64), std({ color: 0xf2dcae, roughness: .9 })); m.rotation.x = Math.PI / 2; m.position.y = .002; g.add(m);
      } else if (id === "patty") {
        // smash patty: real seared-crust photo on top, darker crispy lace on the edge, a wet juicy sheen
        var top = phys({ map: tex(id), bumpMap: tex(id), bumpScale: .05, color: 0xffffff, roughness: .55, clearcoat: .45, clearcoatRoughness: .35, envMapIntensity: .6 });
        var side = phys({ map: wrapT(tex(id)), bumpMap: wrapT(tex(id)), bumpScale: .06, color: 0x8a6658, roughness: .6, clearcoat: .3 });
        m = new T.Mesh(bumpy(new T.CylinderGeometry(1.02, 1.04, .24, 96, 4), .07, 7), [side, top, top]); m.position.y = .12; g.add(m);
      } else if (id === "turkey") {
        var tm = std({ map: wrapT(tex("patty")), color: 0xffe2cc, roughness: .8 }); tm.bumpMap = tm.map; tm.bumpScale = .03;
        m = new T.Mesh(bumpy(new T.CylinderGeometry(.98, .98, .17, 72, 3), .05, 7), tm); m.position.y = .085; g.add(m);
      } else if (SAUCE[id]) {
        var sc3 = SAUCE[id], sgeo = new T.CircleGeometry(.78, 72); sgeo.rotateX(-Math.PI / 2); var spp = sgeo.attributes.position;
        for (var si2 = 0; si2 < spp.count; si2++) { var vx = spp.getX(si2), vz = spp.getZ(si2), aa = Math.atan2(vz, vx), q2 = 1 + .1 * Math.sin(aa * 6) + .05 * Math.sin(aa * 13); spp.setX(si2, vx * q2); spp.setZ(si2, vz * q2); spp.setY(si2, .006 * Math.sin(vx * 9) * Math.cos(vz * 7)); }
        sgeo.computeVertexNormals();
        var smat = phys({ color: sc3[0], roughness: .15, clearcoat: sc3[1], clearcoatRoughness: .06, envMapIntensity: .5 });
        m = new T.Mesh(sgeo, smat); m.position.y = .008; g.add(m);
        for (var sd = 0; sd < 4; sd++) { var d3 = dripMesh(smat, .03), a3 = Math.random() * 6.283; d3.position.set(Math.cos(a3) * .86, .005, Math.sin(a3) * .86); setDrip(d3, .06 + Math.random() * .1); g.add(d3); }
      } else if (id === "chicken" || id === "chicken_spicy") {
        m = new T.Mesh(bumpy(new T.CylinderGeometry(1.02, .98, .3, 72, 4), .09, 4), std({ map: tex(id), color: id === "chicken_spicy" ? 0xffb0a0 : 0xffe0c0, roughness: .78 }));
        m.scale.set(1.12, 1, .95); m.position.y = .15; g.add(m);
      } else if (id === "cheese" || id === "swiss") {
        var sw = id === "swiss", ct = cheeseTex(sw), geo = new T.PlaneGeometry(1.8, 1.8, 48, 48); geo.rotateX(-Math.PI / 2);
        var cm = phys({ map: ct, bumpMap: ct, bumpScale: .012, color: sw ? 0xf2d27a : 0xffb84a, roughness: .32, clearcoat: .6, clearcoatRoughness: .18, envMapIntensity: .3, side: T.DoubleSide });
        m = new T.Mesh(geo, cm); m.rotation.y = Math.random() * .6; m.position.y = .022; g.add(m);
        var under = new T.Mesh(geo, phys({ color: sw ? 0xd9c27a : 0xd98410, roughness: .3, clearcoat: .8, side: T.DoubleSide })); under.rotation.y = m.rotation.y; under.position.y = .006; g.add(under);
        var dm = phys({ color: sw ? 0xf1dc96 : 0xf6a41e, roughness: .18, clearcoat: 1, clearcoatRoughness: .1 }), dr = [];
        for (var di = 0; di < 4; di++) { var dd = dripMesh(dm, .018 + Math.random() * .014), da = di / 9 * 6.283 + Math.random() * .4; dd.position.set(Math.cos(da) * 1.08, .01, Math.sin(da) * 1.08);
          dd.rotation.y = -da; dd.userData.max = .12 + Math.random() * .3; dd.userData.lag = Math.random() * .5; setDrip(dd, 0); g.add(dd); dr.push(dd); }
        g.userData.cheese = { mesh: m, base: geo.attributes.position.array.slice(), melt: 0, drips: dr, seed: Math.random() * 6 };
      } else if (id === "tray") { // red-and-white checkered paper boat
        var tc = document.createElement("canvas"); tc.width = tc.height = 128; var tx = tc.getContext("2d");
        for (var cy = 0; cy < 8; cy++) for (var cx = 0; cx < 8; cx++) { tx.fillStyle = (cx + cy) % 2 ? "#c8202a" : "#f6f1e6"; tx.fillRect(cx * 16, cy * 16, 16, 16); }
        var tt = new T.CanvasTexture(tc); tt.encoding = T.sRGBEncoding; tt.wrapS = tt.wrapT = T.RepeatWrapping; tt.repeat.set(3, 1);
        var tm2 = std({ map: tt, roughness: .85, side: T.DoubleSide });
        m = new T.Mesh(new T.BoxGeometry(2.6, .05, 1.7), tm2); m.position.y = .025; g.add(m);
        [[0, .2, .85, 2.6, .4, .05], [0, .2, -.85, 2.6, .4, .05], [1.3, .2, 0, .05, .4, 1.7], [-1.3, .2, 0, .05, .4, 1.7]].forEach(function (w) { var wm = new T.Mesh(new T.BoxGeometry(w[3], w[4], w[5]), tm2); wm.position.set(w[0], w[1], w[2]); wm.rotation.z = w[0] ? (w[0] > 0 ? -.25 : .25) : 0; wm.rotation.x = w[2] ? (w[2] > 0 ? .25 : -.25) : 0; g.add(wm); });
      } else if (id === "fries") {
        var fm2 = phys({ color: 0xe39a2c, roughness: .5, clearcoat: .35, envMapIntensity: .5 }), fe = std({ color: 0xa8641c, roughness: .6 });
        for (var fi = 0; fi < 46; fi++) { var fl2 = .7 + Math.random() * .7, f3 = new T.Mesh(new T.BoxGeometry(.085, .085, fl2), [fm2, fm2, fm2, fm2, fe, fe]);
          f3.position.set((Math.random() - .5) * 1.7, .06 + Math.random() * .22, (Math.random() - .5) * .95); f3.rotation.set((Math.random() - .5) * .5, Math.random() * 3.14, (Math.random() - .5) * .4); g.add(f3); }
        var salt = std({ color: 0xffffff, roughness: .3 }); for (var sl = 0; sl < 60; sl++) { var sm = new T.Mesh(new T.BoxGeometry(.012, .012, .012), salt); sm.position.set((Math.random() - .5) * 2, .2 + Math.random() * .15, (Math.random() - .5) * 1.2); g.add(sm); }
      } else if (id === "lettuce" || id === "slaw") {
        for (var k = 0; k < 2; k++) {
          var lg = new T.RingGeometry(.02, id === "slaw" ? 1.0 : 1.16, 96, 8); lg.rotateX(-Math.PI / 2);
          var lp = lg.attributes.position, v = new T.Vector3();
          for (var i = 0; i < lp.count; i++) { v.fromBufferAttribute(lp, i); var a = Math.atan2(v.z, v.x) + k, r = Math.hypot(v.x, v.z), q = 1 + .07 * Math.sin(a * 7 + k);
            lp.setXYZ(i, v.x * q, .05 * Math.sin(a * 9 + r * 6) * r + .03 * Math.sin(a * 17) * r * r + (id === "slaw" ? .1 * (1 - r) : 0), v.z * q); }
          lg.computeVertexNormals();
          m = new T.Mesh(lg, std({ map: tex(id), color: id === "slaw" ? 0xffffff : 0xe8ffd0, roughness: .5, side: T.DoubleSide }));
          m.position.y = .03 + k * .04; m.rotation.y = k * 1.1; g.add(m);
        }
        g.userData.flap = { meshes: g.children.slice(), amp: 0 };
        drops(g, id === "slaw" ? 8 : 16, 1.05, .1, .2);
      } else if (id === "tomato") {
        [[-.36, .1, .2], [.4, -.16, 1.4]].forEach(function (s) {
          m = new T.Mesh(new T.CylinderGeometry(.56, .56, .09, 56), [std({ color: 0xc8261a, roughness: .35 }), phys({ map: tex(id), roughness: .18, clearcoat: .9 }), std({ color: 0xb02016 })]);
          m.position.set(s[0], .045, s[1]); m.rotation.y = s[2]; g.add(m);
          drops(g, 7, .45, .095); g.children.slice(-7).forEach(function (d) { d.position.x += s[0]; d.position.z += s[1]; });
        });
      } else if (id === "onion" || id === "onion_grilled") {
        var om = id === "onion" ? phys({ color: 0xf5efe3, roughness: .25, clearcoat: .8, transparent: true, opacity: .92 }) : phys({ color: 0xa8622a, roughness: .3, clearcoat: .9 });
        [[.55, 0, 0], [.42, .25, .1], [.3, -.2, -.15], [.48, -.15, .2], [.24, .3, -.3]].forEach(function (o, i) {
          m = new T.Mesh(new T.TorusGeometry(o[0], .04, 10, 48), om); m.rotation.x = Math.PI / 2 + (Math.random() - .5) * .15; m.position.set(o[1], .03 + i * .005, o[2]); g.add(m); });
        drops(g, 5, .6, .07);
      } else if (id === "pickles" || id === "pickles_crinkle" || id === "jalapeno") {
        var jm = id === "jalapeno" ? std({ color: 0x3f8f2c, roughness: .3 }) : std({ color: 0x7c8a2c, roughness: .4 });
        var fm = id === "jalapeno" ? std({ color: 0x9ccf6a, roughness: .5 }) : phys({ map: tex(id), roughness: .3, clearcoat: .6 });
        [[0, 0], [.5, .2], [-.48, .25], [.15, -.5], [-.3, -.42], [.42, -.35], [-.2, .55]].forEach(function (p) {
          m = new T.Mesh(new T.CylinderGeometry(.22, .22, .04, 28), [jm, fm, fm]); m.position.set(p[0], .022, p[1]); m.rotation.set((Math.random() - .5) * .2, 0, (Math.random() - .5) * .2); g.add(m); });
        drops(g, 5, .7, .05);
      } else if (id === "bacon") {
        for (var b = 0; b < 2; b++) {
          var bg = new T.PlaneGeometry(2.1, .34, 48, 2); bg.rotateX(-Math.PI / 2); var bp = bg.attributes.position;
          for (var j = 0; j < bp.count; j++) bp.setY(j, .045 * Math.sin(bp.getX(j) * 6 + b) + .02 * Math.sin(bp.getX(j) * 13));
          bg.computeVertexNormals(); m = new T.Mesh(bg, std({ map: tex(id), color: 0xffd8c8, roughness: .55, side: T.DoubleSide })); m.position.set(0, .04 + b * .02, (b - .5) * .4); m.rotation.y = b ? .5 : -.3; g.add(m);
        }
      } else if (id === "onion_straws") {
        var sm = std({ color: 0xb8742e, roughness: .6 });
        for (var s2 = 0; s2 < 70; s2++) { m = new T.Mesh(new T.CylinderGeometry(.018, .018, .32 + Math.random() * .25, 6), sm); var a2 = Math.random() * 6.283, r2 = Math.sqrt(Math.random()) * .85;
          m.position.set(Math.cos(a2) * r2, .03 + Math.random() * .09, Math.sin(a2) * r2); m.rotation.set(Math.PI / 2 + (Math.random() - .5) * .6, 0, Math.random() * 6.283); g.add(m); }
      } else {
        m = new T.Mesh(new T.CylinderGeometry(.9, .9, H[id] || .08, 48), std({ map: tex(id), roughness: .6 })); m.position.y = (H[id] || .08) / 2; g.add(m);
      }
      return g;
    }

    // steam puffs
    var stc = document.createElement("canvas"); stc.width = stc.height = 64; var stx = stc.getContext("2d"), sg = stx.createRadialGradient(32, 32, 2, 32, 32, 32);
    sg.addColorStop(0, "rgba(255,255,255,.35)"); sg.addColorStop(.5, "rgba(255,255,255,.12)"); sg.addColorStop(1, "rgba(255,255,255,0)"); stx.fillStyle = sg; stx.fillRect(0, 0, 64, 64);
    var stMat = new T.SpriteMaterial({ map: new T.CanvasTexture(stc), transparent: true, depthWrite: false, opacity: 0 });
    for (var si = 0; si < 18; si++) { var sp = new T.Sprite(stMat.clone()); sp.userData.t = Math.random() * 2.6; sp.visible = false; G.add(sp); steam.push(sp); }

    var STEP = .62, FALLH = 4.2, GRAV = 22;
    function build(list) {
      layers.forEach(function (l) { G.remove(l.g); }); layers = []; built = false;
      var y = 0;
      list.forEach(function (id, i) {
        var g = make(id); if (id === "strip") { var si3 = list.slice(0, i).filter(function (q) { return q === "strip"; }).length; g.position.set((si3 - 1) * .55, 0, si3 % 2 ? .18 : -.15); g.rotation.y = (si3 - 1) * .35; y += si3 ? .05 : 0; }
        var L = { id: id, g: g, rest: y, h: g.userData.h ? g.userData.h * (id === "bun_bottom" ? .93 : /patty|turkey|chicken/.test(id) ? .85 : .6) : H[id] == null ? .08 : H[id], y: y + FALLH, v: 0, t: i * STEP + .25, on: false, sq: 0, sqv: 0, rx: 0, rz: 0, rxv: 0, rzv: 0 };
        if (id === "strip") L.h = 0; // strips lie side by side on the fries, not stacked
        g.visible = false; G.add(g); layers.push(L); y += L.h;
      });
      var top = y + .75; cam.position.set(0, top * .5 + 2.1, 4.6 + top * 1.05); cam.lookAt(0, top * .42, 0);
      t0 = performance.now() / 1000; last = t0;
      if (RM) layers.forEach(function (L) { L.on = true; L.y = L.rest; L.g.visible = true; if (L.g.userData.cheese) L.g.userData.cheese.melt = 1; });
    }
    function land(i) {
      var L = layers[i], w = WT[L.id] || .4;
      L.sqv += 4.6 * w; L.rxv += (Math.random() - .5) * 5 * (1.2 - w * .5); L.rzv += (Math.random() - .5) * 5 * (1.2 - w * .5);
      for (var j = i - 1, f = 1; j >= 0 && f > .1; j--, f *= .55) { layers[j].sqv += 2.6 * w * f; layers[j].rxv += (Math.random() - .5) * 1.2 * f; layers[j].rzv += (Math.random() - .5) * 1.2 * f; }
      if (L.g.userData.flap) L.g.userData.flap.amp = 1;
    }
    function step(dt, t) {
      var lift = 0; // how much the layers underneath are squashed right now
      layers.forEach(function (L, i) {
        if (t < L.t) { L.g.visible = false; return; }
        L.g.visible = true;
        if (!L.on) { L.v -= GRAV * dt; L.y += L.v * dt; var floor = L.rest - lift;
          if (L.y <= floor) { L.y = floor; if (L.v < -3) { L.v = -L.v * .16; land(i); if (L.v < 1) { L.on = true; } } else L.on = true; } }
        else L.y = L.rest - lift;
        // springs: squash + rag-doll tilt
        L.sqv += (-260 * L.sq - 11 * L.sqv) * dt; L.sq += L.sqv * dt;
        L.rxv += (-140 * L.rx - 7 * L.rxv) * dt; L.rx += L.rxv * dt;
        L.rzv += (-140 * L.rz - 7 * L.rzv) * dt; L.rz += L.rzv * dt;
        var s = Math.max(-.25, Math.min(.3, L.sq));
        L.g.position.y = L.y; L.g.scale.set(1 + s * .45, 1 - s, 1 + s * .45); L.g.rotation.x = L.rx; L.g.rotation.z = L.rz;
        lift += L.h * s;
        var ch = L.g.userData.cheese;
        if (ch && L.on) { ch.sit = (ch.sit || 0) + dt; if (ch.sit > .6) ch.melt = Math.min(1, ch.melt + dt / 6); var p = ch.mesh.geometry.attributes.position, bs = ch.base, e = ch.melt * ch.melt * (3 - 2 * ch.melt);
          for (var k = 0; k < p.count; k++) { var x = bs[k * 3], z = bs[k * 3 + 2], r = Math.hypot(x, z), an = Math.atan2(z, x);
            // the square softens into a puddle: corners pull in and slump over the patty edge, the middle sags into the meat
            var edge = 1.02 + .08 * Math.sin(an * 5 + ch.seed) + .05 * Math.sin(an * 11 + ch.seed * 2), rr = r * (1 - e * .1 * Math.max(0, r - .8)), o = Math.max(0, rr - edge);
            var tongue = Math.pow(Math.max(0, Math.sin(an * 3 + ch.seed)), 8) + .7 * Math.pow(Math.max(0, Math.sin(an * 5 + ch.seed * 1.7)), 10);
            var sag = Math.min(.2 + tongue * .26, o * (1.3 + tongue * 2.2) + o * o * 2) * (1 + .2 * Math.sin(an * 7 + ch.seed)), f2 = r > 0 ? rr / r : 1;
            if (o > 0) f2 *= 1 - e * Math.min(.06, o * .25) * (1 + tongue); // hanging cheese hugs the meat
            p.setXYZ(k, x * f2, -e * sag + e * .006 * Math.sin(x * 14 + t * 2) * Math.cos(z * 12) - (rr < edge ? e * .01 * (1 - rr) : 0), z * f2); }
          p.needsUpdate = true; ch.mesh.geometry.computeVertexNormals();
          ch.drips.forEach(function (d) { var u = Math.max(0, (ch.melt - .25 - d.userData.lag * .4) / .75); setDrip(d, d.userData.max * u * u * (1 + .04 * Math.sin(t * 3 + d.userData.max * 20))); }); }
        var fl = L.g.userData.flap;
        if (fl && fl.amp > .01) { fl.amp *= Math.pow(.04, dt); fl.meshes.forEach(function (m, k) { m.rotation.x = Math.sin(t * 22 + k) * .05 * fl.amp; m.rotation.z = Math.cos(t * 19 + k) * .05 * fl.amp; }); }
      });
      // steam from the hot meat once it's down
      var hot = layers.filter(function (L) { return L.on && /patty|chicken|turkey|cheese|swiss/.test(L.id); });
      steam.forEach(function (sp, k) {
        if (!hot.length || RM) { sp.visible = false; return; }
        sp.userData.t += dt; var life = 2.6, u = sp.userData.t % life / life, src = hot[k % hot.length];
        if (u < dt / life * 1.5 || !sp.userData.a) { sp.userData.a = Math.random() * 6.283; sp.userData.r = .55 + Math.random() * .5; sp.userData.y0 = src.g.position.y + src.h; }
        var topY = layers[layers.length - 1].g.position.y;
        sp.visible = true; sp.position.set(Math.cos(sp.userData.a) * sp.userData.r * (1 + u * .3), sp.userData.y0 + u * (1.6 + Math.max(0, topY - sp.userData.y0) * .6), Math.sin(sp.userData.a) * sp.userData.r * (1 + u * .3));
        var sc2 = .18 + u * .55; sp.scale.set(sc2 * .7, sc2 * 1.4, 1); sp.material.opacity = Math.sin(u * Math.PI) * .32;
      });
      if (!built && layers.length && layers.every(function (L) { return L.on; })) built = true;
    }
    function frame() {
      var now = performance.now() / 1000, dt = Math.min(.05, now - last); last = now;
      spinV *= Math.pow(.15, dt); G.rotation.y += (spin + spinV) * dt * (RM ? 0 : 1);
      step(dt, now - t0); R.render(scene, cam); raf = requestAnimationFrame(frame);
    }
    build(ids); raf = requestAnimationFrame(frame);
    var ro = window.ResizeObserver ? new ResizeObserver(function () { var w = el.clientWidth, h = el.clientHeight; if (w && h) { R.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix(); } }) : null;
    if (ro) ro.observe(el);
    return {
      replay: function () { build(ids); },
      drag: function (dx) { spinV += dx * .06; G.rotation.y += dx * .012; },
      destroy: function () { cancelAnimationFrame(raf); if (ro) ro.disconnect(); scene.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach(function (m) { if (m.map) m.map.dispose(); m.dispose(); }); });
        R.dispose(); if (R.domElement.parentNode) R.domElement.parentNode.removeChild(R.domElement); }
    };
  }
  return { mount: mount, preload: preload, H: H };
})();
