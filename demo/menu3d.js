/* SousShift AI — 3D menu for every demo page. Include once: <script src="../menu3d.js"></script>
   - Every menu photo tilts in 3D as you move over it (finger or mouse), with a light sheen.
   - The "3D" badge opens Plate View: the dish drops onto a spinning plate with steam, a 3-second loop.
     Drag to spin it yourself.
   - Optional real clips: window.MENU3D = { clips: { "Hibachi Chicken": "img/chicken.mp4" } } plays that
     short video in Plate View instead of the animated plate.
   - Optional build-up view for stacked dishes (burgers, sandwiches): window.MENU3D = { stack: { img: "img/build/",
     recipes: { "Classic StormBurger": ["bun_bottom", "patty", "lettuce", ...] } } } — the 3D view drops each real cut-out
     layer onto the last one (rag-doll landing, steam, melting cheese, water beads — stackfx.js), then turns it in 3D.
     Layer sizes come from MENU3D.stack.geo or window.BUILDER (w = width fraction, ar = height/width, top, sink). */
(function () {
  "use strict";
  var CLIPS = (window.MENU3D && window.MENU3D.clips) || {};
  var SK = (window.MENU3D && window.MENU3D.stack) || null;
  if (SK && !window.STACKFX && !document.querySelector("script[data-sfx]")) { var fx = document.createElement("script"); fx.src = ((document.currentScript || {}).src || "").replace(/[^\/]*$/, "") + "stackfx.js"; fx.dataset.sfx = "1"; document.head.appendChild(fx); }
  var SEL = ".menu img, .items img, .dish img";
  var css = [
    ".m3d-w{position:relative;display:block;perspective:700px;-webkit-tap-highlight-color:transparent}",
    // pages whose photo box positions the <img> absolutely (Melody .media) need the wrapper to fill that box too
    ".media>.m3d-w{position:absolute;inset:0;height:100%}",
    ".m3d-w>img{transition:transform .25s ease-out,box-shadow .25s;transform-style:preserve-3d;will-change:transform}",
    ".m3d-w.m3d-on>img{transition:transform .06s linear,box-shadow .25s;box-shadow:0 18px 30px rgba(0,0,0,.35)}",
    ".m3d-w .m3d-sh{position:absolute;inset:0;pointer-events:none;border-radius:inherit;background:radial-gradient(circle at var(--x,50%) var(--y,30%),rgba(255,255,255,.35),transparent 55%);opacity:0;transition:opacity .25s;mix-blend-mode:soft-light}",
    ".m3d-w.m3d-on .m3d-sh{opacity:1}",
    ".m3d-b{position:absolute;right:8px;bottom:8px;z-index:3;border:0;border-radius:99px;padding:5px 10px;font:800 11px/1 system-ui,-apple-system,sans-serif;letter-spacing:.06em;color:#fff;background:rgba(10,12,18,.72);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);cursor:pointer;box-shadow:0 0 0 1px rgba(255,255,255,.25),0 0 14px rgba(247,192,74,.55)}",
    "#m3d-o{position:fixed;inset:0;z-index:100000;display:none;place-items:center;background:radial-gradient(ellipse at 50% 40%,#232836,#07080c 70%);color:#F2F4F8;font-family:system-ui,-apple-system,sans-serif;touch-action:none}",
    "#m3d-o.on{display:grid}",
    "#m3d-o .stage{position:relative;width:min(78vw,380px);aspect-ratio:1;perspective:900px;margin:0 auto}",
    "#m3d-o .plate{position:absolute;inset:0;border-radius:50%;transform-style:preserve-3d;animation:m3d-in 3s cubic-bezier(.2,.7,.2,1) infinite}",
    "#m3d-o .plate::before{content:'';position:absolute;inset:-7%;border-radius:50%;background:radial-gradient(circle,#fdfdfd 58%,#e6e8ec 66%,#c9cdd4 70%,#f4f5f7 72%);box-shadow:0 30px 60px rgba(0,0,0,.6);transform:translateZ(-2px)}",
    "#m3d-o .food{position:absolute;inset:4%;border-radius:50%;background-size:cover;background-position:center;box-shadow:inset 0 0 30px rgba(0,0,0,.35);transform:translateZ(10px)}",
    "#m3d-o .shadow{position:absolute;left:10%;right:10%;bottom:-16%;height:16%;border-radius:50%;background:radial-gradient(rgba(0,0,0,.6),transparent 70%);animation:m3d-sh 3s ease infinite}",
    "#m3d-o .steam{position:absolute;left:50%;top:-6%;width:0;height:0}",
    "#m3d-o .steam i{position:absolute;bottom:0;width:18px;height:70px;border-radius:50%;background:linear-gradient(to top,rgba(255,255,255,.35),transparent);filter:blur(6px);animation:m3d-st 3s ease-in infinite;opacity:0}",
    "#m3d-o .steam i:nth-child(1){left:-40px;animation-delay:.9s}#m3d-o .steam i:nth-child(2){left:-8px;animation-delay:1.3s}#m3d-o .steam i:nth-child(3){left:26px;animation-delay:1.7s}",
    "#m3d-o video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:24px;box-shadow:0 30px 60px rgba(0,0,0,.6)}",
    "#m3d-o .cap{text-align:center;margin-top:46px;padding:0 20px}#m3d-o .cap b{display:block;font-size:24px;font-weight:900}#m3d-o .cap span{color:#F7C04A;font-weight:800;font-size:18px}",
    "#m3d-o .hint{color:#9AA6B6;font-size:12px;margin-top:8px;letter-spacing:.06em}",
    "#m3d-o .x{position:absolute;top:max(14px,env(safe-area-inset-top));right:14px;width:44px;height:44px;border-radius:50%;border:1px solid #2A303C;background:#151922;color:#F2F4F8;font-size:20px;cursor:pointer}",
    "#m3d-o .bstk{position:absolute;inset:0;transform-style:preserve-3d;display:none}#m3d-o.stk .bstk{display:block}#m3d-o.stk .plate,#m3d-o.stk .shadow{display:none}",
    "#m3d-o .bl{position:absolute;left:50%;top:0;will-change:transform,opacity;transform-origin:50% 100%}#m3d-o .bl img{display:block;width:100%;height:100%;filter:drop-shadow(0 6px 6px rgba(0,0,0,.45))}",
    "#m3d-o .bsh{position:absolute;left:50%;width:84%;height:12%;margin-left:-42%;border-radius:50%;background:radial-gradient(rgba(0,0,0,.75),transparent 70%)}",
    "#m3d-o .bgl{position:absolute;inset:0;pointer-events:none;mix-blend-mode:screen;-webkit-mask:var(--m) center/100% 100% no-repeat;mask:var(--m) center/100% 100% no-repeat}",
    "#m3d-o .rb{display:none;margin:10px auto 0;border:1px solid #2A303C;background:#151922;color:#F2F4F8;border-radius:99px;padding:8px 16px;font:800 13px system-ui,sans-serif;cursor:pointer}#m3d-o.stk .rb{display:block}",
    "#m3d-o.drag .plate{animation:none}",
    "@keyframes m3d-in{0%{transform:translateY(-55%) rotateX(68deg) rotateZ(-40deg) scale(.7);opacity:0}18%{opacity:1}38%{transform:translateY(0) rotateX(52deg) rotateZ(0) scale(1)}100%{transform:translateY(0) rotateX(52deg) rotateZ(220deg) scale(1)}}",
    "@keyframes m3d-sh{0%{opacity:0;transform:scale(.5)}38%,100%{opacity:1;transform:scale(1)}}",
    "@keyframes m3d-st{0%{opacity:0;transform:translateY(0) scaleX(.6)}30%{opacity:.9}100%{opacity:0;transform:translateY(-90px) scaleX(1.6)}}",
    "@media (prefers-reduced-motion:reduce){#m3d-o .plate{animation:none;transform:rotateX(40deg)}#m3d-o .steam i{animation:none}.m3d-w>img{transition:none}}"
  ].join("");
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  var O = document.createElement("div"); O.id = "m3d-o"; O.setAttribute("role", "dialog"); O.setAttribute("aria-label", "Plate view");
  O.innerHTML = '<button class="x" type="button" aria-label="Close">✕</button><div><div class="stage"><div class="shadow"></div><div class="plate"><div class="food"></div></div><div class="bstk"></div><div class="steam"><i></i><i></i><i></i></div></div>' +
    '<div class="cap"><b></b><span></span><div class="hint">DRAG TO SPIN · TAP ✕ TO CLOSE</div><button class="rb" type="button">↻ Build it again</button></div></div>';
  document.body.appendChild(O);
  var plate = O.querySelector(".plate"), food = O.querySelector(".food"), stage = O.querySelector(".stage");
  O.querySelector(".x").onclick = close;
  O.addEventListener("click", function (ev) { if (ev.target === O) close(); });
  document.addEventListener("keydown", function (ev) { if (ev.key === "Escape") close(); });
  function close() { stopStack(); O.classList.remove("on", "drag", "stk"); var v = O.querySelector("video"); if (v) v.remove(); plate.style.transform = ""; }

  // drag to spin
  var dragging = false, sx = 0, rz = 0, base = 0;
  stage.addEventListener("pointerdown", function (ev) { dragging = true; sx = ev.clientX; base = rz; O.classList.add("drag"); stage.setPointerCapture(ev.pointerId); });
  stage.addEventListener("pointermove", function (ev) { if (!dragging) return; if (B3) { B3.drag(ev.clientX - (SB.lx == null ? sx : SB.lx)); SB.lx = ev.clientX; return; } if (SB) { SB.turn = Math.max(-1, Math.min(1, (ev.clientX - sx) / 120)); return; } rz = base + (ev.clientX - sx) * .8; plate.style.transform = "rotateX(52deg) rotateZ(" + rz + "deg)"; });
  stage.addEventListener("pointerup", function () { dragging = false; if (SB) { SB.turn = null; SB.lx = null; } });

  // Build-up view: real cut-out layers fall onto each other in recipe order, then the burger turns in 3D
  var SB = null, bstk = O.querySelector(".bstk"), RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  O.querySelector(".rb").onclick = function () { if (B3) B3.replay(); else if (SB) startStack(SB.ids); };
  function recipe(name) { if (!SK || !SK.recipes) return null; return SK.recipes[name] || SK.recipes[name.replace(/\s+combo$/i, "")] || null; }
  function geo(id) {
    if (SK.geo && SK.geo[id]) return SK.geo[id];
    var B = window.BUILDER || {}, g = (B.layers || {})[id];
    (B.variants || [B]).forEach(function (v) { (v.parts || []).forEach(function (p) { if (!g && p.id === id) g = p; }); });
    return g || { w: .8, ar: .5, top: .5 };
  }
  // real 3D (WebGL) build: three.js + burger3d.js load on first use; the flat cut-out stack below is the fallback
  var HERE = ((document.currentScript || {}).src || "").replace(/[^\/]*$/, ""), B3 = null, b3wait = null;
  function need3d(cb) {
    if (window.THREE && window.BURGER3D) return cb();
    if (b3wait) return b3wait.push(cb); b3wait = [cb];
    var go = function () { var q = b3wait; b3wait = null; q.forEach(function (f) { f(); }); };
    var add = function (src, next) { var sc = document.createElement("script"); sc.src = src; sc.onload = next; sc.onerror = go; document.head.appendChild(sc); };
    add("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js", function () {
      var rest = function () { add(HERE + "burger3d.js", go); };
      if (SK.models) add("https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js", rest); else rest();
    });
    setTimeout(function () { if (b3wait) go(); }, 12000);
  }
  function stopStack() { if (SB) cancelAnimationFrame(SB.raf); SB = null; if (B3) { B3.destroy(); B3 = null; } bstk.style.display = ""; }
  function startStack(ids) {
    var token = {}; startStack.tok = token; stopStack(); bstk.innerHTML = "";
    if (SK.real3d !== false) {
      bstk.style.display = "none";
      return need3d(function () {
        if (startStack.tok !== token || !O.classList.contains("on")) return;
        // only fetch the scanned pieces this dish actually uses (chicken also covers spicy chicken + strips)
        var need = {}; ids.forEach(function (id) { var k = SK.models && (SK.models[id] ? id : /chicken_spicy|strip/.test(id) && SK.models.chicken ? "chicken" : null); if (k) need[k] = SK.models[k]; });
        var mount = function () {
          if (startStack.tok !== token || !O.classList.contains("on")) return;
          B3 = window.BURGER3D && window.BURGER3D.mount(stage, ids, SK.img || "", SK.models);
          if (B3) { SB = { ids: ids, b3: true, raf: 0 }; O.querySelector(".steam").style.opacity = 0; } else { SK.real3d = false; startStack(ids); }
        };
        if (window.BURGER3D && window.BURGER3D.preload) window.BURGER3D.preload(need, mount); else mount();
      });
    }
    var S = stage.clientWidth, W = S * 1.02, L = [], y = 0, sh = document.createElement("div"); sh.className = "bsh"; bstk.appendChild(sh);
    ids.forEach(function (id, i) {
      var g = geo(id), w = (g.w || .8) * W, ih = w * (g.ar || .5), prev = L[i - 1], b = prev ? prev.b + prev.ih * (prev.top == null ? .5 : prev.top) - (g.sink || 0) * ih : 0;
      var d = document.createElement("div"); d.className = "bl"; d.style.width = w + "px"; d.style.height = ih + "px"; d.style.marginLeft = -w / 2 + "px"; d.style.zIndex = i + 1;
      var src = (SK.img || "") + id + ".webp", im = new Image(); im.src = src; im.alt = ""; var box = window.STACKFX ? STACKFX.wrap(im) : im; d.appendChild(box);
      if (id === "bun_top") { var gl = document.createElement("div"); gl.className = "bgl"; gl.style.setProperty("--m", 'url("' + src + '")'); d.appendChild(gl); d.gl = gl; }
      bstk.appendChild(d); L.push({ el: d, box: box, b: b, ih: ih, top: g.top, id: id, hit: false });
    });
    var topY = L.length ? L[L.length - 1].b + L[L.length - 1].ih : 1, k = Math.min(1, S * .86 / topY), floor = S * .5 + topY * k / 2;
    bstk.style.transform = "scale(" + k + ")"; bstk.style.transformOrigin = "50% " + floor + "px";
    L.forEach(function (l) { l.y = floor - l.b - l.ih; });
    sh.style.top = floor - S * .06 / k + "px";
    SB = { ids: ids, L: L, sh: sh, S: S, t0: performance.now(), turn: null, ang: 0, gap: 0 };
    var STEP = 520, FALL = 420, done = 300 + L.length * STEP + FALL;
    function frame(now) {
      if (!SB) return; var t = RM ? done + 1 : now - SB.t0, landed = 0;
      var want = SB.turn != null ? SB.turn * 28 : (t > done ? Math.sin((t - done) / 1500) * 22 : 0);
      SB.ang += (want - SB.ang) * .08;
      bstk.style.transform = "scale(" + k + ") rotateX(-8deg) rotateY(" + SB.ang.toFixed(2) + "deg)";
      L.forEach(function (l, i) {
        // falls out of the air (gravity), then STACKFX does the rag-doll landing and the layers below react
        var f = (t - (300 + i * STEP)) / FALL, y = 0, op = 1;
        if (f < 0) { op = 0; y = -S * 1.3; } else if (f < 1) y = -S * 1.3 * (1 - f * f);
        else if (!l.hit) { l.hit = true; if (window.STACKFX && !RM) STACKFX.land(l.box, l.id, L.slice(0, i).reverse().map(function (u) { return u.box; })); else if (window.STACKFX) STACKFX.settle(l.box, l.id); }
        if (f >= 1) landed++;
        l.el.style.opacity = op;
        l.el.style.transform = "translate3d(0," + (l.y + y).toFixed(1) + "px," + ((i - L.length / 2) * 3) + "px)";
        if (l.el.gl) l.el.gl.style.background = "linear-gradient(105deg,transparent " + (30 + SB.ang * 1.6) + "%,rgba(255,255,255,.55) " + (42 + SB.ang * 1.6) + "%,transparent " + (54 + SB.ang * 1.6) + "%)";
      });
      SB.sh.style.opacity = Math.min(1, .2 + landed / L.length);
      SB.sh.style.transform = "translateX(" + (-SB.ang * 1.2) + "px)";
      O.querySelector(".steam").style.opacity = t > done ? 1 : 0;
      SB.raf = requestAnimationFrame(frame);
    }
    SB.raf = requestAnimationFrame(frame);
  }

  function itemInfo(img) {
    var card = img.closest(".item,.dish,li,article,.card") || img.parentNode;
    var name = img.alt || "";
    var price = "";
    if (card) {
      var m = (card.textContent || "").match(/\$\s?\d+(?:\.\d{2})?|\bMP\b/);
      if (m) price = m[0];
    }
    return { name: name, price: price };
  }
  function open(img) {
    var info = itemInfo(img);
    O.querySelector(".cap b").textContent = info.name;
    O.querySelector(".cap span").textContent = info.price;
    var clip = CLIPS[info.name], rec = !clip && recipe(info.name);
    stopStack(); O.classList.toggle("stk", !!rec); O.querySelector(".steam").style.opacity = "";
    O.querySelector(".hint").textContent = rec ? "WATCH IT BUILD · SWIPE TO SPIN IT" : "DRAG TO SPIN · TAP ✕ TO CLOSE";
    var old = O.querySelector("video"); if (old) old.remove();
    plate.style.display = clip ? "none" : ""; O.querySelector(".shadow").style.display = clip ? "none" : "";
    O.querySelector(".steam").style.display = clip ? "none" : "";
    if (clip) {
      var v = document.createElement("video"); v.src = clip; v.autoplay = true; v.loop = true; v.muted = true; v.playsInline = true; v.setAttribute("playsinline", "");
      stage.appendChild(v);
    } else {
      food.style.backgroundImage = 'url("' + (img.currentSrc || img.src) + '")';
      plate.style.animation = "none"; void plate.offsetWidth; plate.style.animation = "";
    }
    rz = 0; O.classList.remove("drag"); O.classList.add("on");
    if (rec) startStack(rec);
  }

  function tilt(w, img, x, y) {
    var r = w.getBoundingClientRect(), px = (x - r.left) / r.width, py = (y - r.top) / r.height;
    if (px < 0 || px > 1 || py < 0 || py > 1) return reset(w, img);
    w.classList.add("m3d-on");
    img.style.transform = "rotateY(" + ((px - .5) * 18) + "deg) rotateX(" + ((.5 - py) * 18) + "deg) scale(1.04)";
    w.style.setProperty("--x", px * 100 + "%"); w.style.setProperty("--y", py * 100 + "%");
  }
  function reset(w, img) { w.classList.remove("m3d-on"); img.style.transform = ""; }

  function enhance(img) {
    if (img.dataset.m3d || /logo/i.test(img.className + " " + img.id + " " + (/^data:/.test(img.src) ? "" : img.src))) return;
    img.dataset.m3d = "1";
    var w = document.createElement("span"); w.className = "m3d-w";
    var cs = getComputedStyle(img); w.style.borderRadius = cs.borderRadius;
    if (cs.display === "block" || cs.width === "100%") w.style.width = "100%";
    img.parentNode.insertBefore(w, img); w.appendChild(img);
    var sh = document.createElement("span"); sh.className = "m3d-sh"; w.appendChild(sh);
    var b = document.createElement("button"); b.type = "button"; b.className = "m3d-b"; b.textContent = CLIPS[img.alt] ? "▶ CLIP" : recipe(img.alt || "") ? "🍔 3D" : "◉ 3D";
    b.setAttribute("aria-label", "Open 3D plate view of " + (img.alt || "this dish"));
    b.addEventListener("click", function (ev) { ev.preventDefault(); ev.stopPropagation(); open(img); });
    w.appendChild(b);
    w.addEventListener("pointermove", function (ev) { tilt(w, img, ev.clientX, ev.clientY); });
    w.addEventListener("pointerleave", function () { reset(w, img); });
    w.addEventListener("touchmove", function (ev) { var t = ev.touches[0]; tilt(w, img, t.clientX, t.clientY); }, { passive: true });
    w.addEventListener("touchend", function () { reset(w, img); }, { passive: true });
  }
  function scan() { document.querySelectorAll(SEL).forEach(enhance); }
  scan();
  new MutationObserver(function () { scan(); }).observe(document.body, { childList: true, subtree: true });
})();
