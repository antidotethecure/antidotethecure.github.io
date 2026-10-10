/* SousShift AI — "Build your meal" ordering. Tap or drag real food onto the burger / plate, watch the price tick
   up, fire it on the grill, place the order (and earn rewards points if the guest is a member).
     <script>window.BUILDER = { mode: "stack" | "plate", accent: "burger", img: "img/build/", fire: "img/game/flame.webp",
       base: 2.74, baseName: "Bun + Storm sauce", start: ["bun_bottom"], top: "bun_top", name: "StormBurger",
       parts: [{ id: "patty", name: "Beef patty", price: 2.5, max: 3, w: .78, h: 26, group: "Protein" }, ...],
       fireLabel: "Grill it", fireBusy: "Grilling at 400°", mount: "#menu" };</script>
     <script src="../builder.js"></script>
   stack: layers drop onto the bun from above (w = width as a fraction of the stage, h = how much the stack rises).
   plate: a top-down plate; parts with group "Base" are pick-one, the rest land in the next free spot (x, y, w as fractions). */
(function () {
  "use strict";
  var C0 = window.BUILDER; if (!C0) return;
  if (!window.STACKFX && !document.querySelector("script[data-sfx]")) { var fx = document.createElement("script"); fx.src = ((document.currentScript || {}).src || "").replace(/[^\/]*$/, "") + "stackfx.js"; fx.dataset.sfx = "1"; document.head.appendChild(fx); }
  var IMG = C0.img || "img/build/", EXT = C0.ext || ".webp";
  var e = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var money = function (n) { return "$" + n.toFixed(2); };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  var css = [
    ".bld{all:initial;display:block;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#EEF2FF;background:radial-gradient(120% 80% at 50% 0%,#1b2a5e 0%,#0b1230 60%,#070B1E 100%);border:1px solid #25336A;border-radius:24px;padding:18px 14px 16px;margin:22px auto;max-width:640px;box-sizing:border-box;line-height:1.4;text-align:left;position:relative;overflow:hidden}",
    ".bld *{box-sizing:border-box;font-family:inherit}",
    ".bld .hd{display:flex;align-items:center;justify-content:space-between;gap:8px}",
    ".bld h3{margin:0;font:800 26px/1.1 Georgia,'Times New Roman',serif;color:#fff}.bld h3 i{color:#FF7A3D;font-style:italic}",
    ".bld .k{font:800 11px ui-monospace,Menlo,monospace;letter-spacing:.16em;text-transform:uppercase;color:#FFD23F}",
    ".bld .stage{position:relative;height:340px;margin:8px 0 4px;touch-action:none}",
    ".bld .stage .glow{position:absolute;left:50%;bottom:14px;width:70%;height:34px;transform:translateX(-50%);background:radial-gradient(closest-side,#0008,#0000)}",
    ".bld .stack{position:absolute;left:0;right:0;bottom:0;top:0;transform-origin:50% 100%;transition:transform .35s}",
    ".bld .ly{position:absolute;left:50%;transform:translate(-50%,0);transition:transform .42s cubic-bezier(.55,0,1,.55),opacity .15s;pointer-events:none;filter:drop-shadow(0 6px 6px #0006)}.bld .ly>img{display:block;width:100%;height:100%}",
    ".bld .ly.in{transform:translate(-50%,-420px);opacity:0}",
    ".bld .plate{position:absolute;left:50%;top:50%;width:300px;height:300px;transform:translate(-50%,-50%)}",
    ".bld .plate>img.pl{position:absolute;inset:0;width:100%;height:100%;filter:drop-shadow(0 14px 18px #000a)}",
    ".bld .pc{position:absolute;transform:translate(-50%,-50%) rotate(var(--r,0deg));transition:transform .45s cubic-bezier(.34,1.56,.64,1),opacity .3s;filter:drop-shadow(0 4px 5px #0008)}",
    ".bld .pc.in{transform:translate(-50%,-50%) rotate(var(--r,0deg)) scale(1.9);opacity:0}",
    ".bld .hint{text-align:center;color:#C9D2EE;font-size:13.5px;min-height:1.4em;margin:2px 0 10px}",
    ".bld .grp{font:800 10.5px ui-monospace,Menlo,monospace;letter-spacing:.14em;text-transform:uppercase;color:#7F8AAA;margin:8px 2px 6px}",
    ".bld .chips{display:grid;grid-template-columns:repeat(4,1fr);gap:8px 6px}",
    ".bld .chip{position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;background:none;border:0;color:#EEF2FF;cursor:pointer;padding:0;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}",
    ".bld .chip .ph{width:62px;height:62px;border-radius:50%;background:#121C40;border:2px solid #25336A;display:grid;place-items:center;overflow:hidden;transition:transform .15s,border-color .15s}",
    ".bld .chip .ph img{width:86%;height:86%;object-fit:contain;pointer-events:none}",
    ".bld .chip.on .ph{border-color:#FF7A3D;box-shadow:0 0 0 3px #ff7a3d33}.bld .chip:active .ph{transform:scale(.92)}",
    ".bld .chip.off{opacity:.35}",
    ".bld .tabs{display:flex;gap:6px;margin:12px 0 0;background:#070B1E;border:1px solid #25336A;border-radius:999px;padding:4px}",
    ".bld .tabs button{flex:1;border:0;border-radius:999px;padding:9px 6px;font:800 13.5px system-ui;color:#C9D2EE;background:none;cursor:pointer;transition:background .2s,color .2s}",
    ".bld .tabs button.on{background:linear-gradient(90deg,#E8582A,#FF7A3D);color:#fff;box-shadow:0 4px 14px #e8582a55}",
    ".bld .chip b{font-size:11.5px;font-weight:700;text-align:center;line-height:1.15}.bld .chip small{font-size:10.5px;color:#9AA6CC}",
    ".bld .chip .n{position:absolute;top:-2px;right:6px;min-width:20px;height:20px;border-radius:10px;background:#FF7A3D;color:#fff;font:900 11px/20px system-ui;text-align:center;padding:0 5px}",
    ".bld .chip .m{position:absolute;top:40px;left:2px;width:22px;height:22px;border-radius:50%;background:#070B1E;border:1px solid #9AA6CC;color:#fff;font:900 14px/18px system-ui}",
    ".bld .bar{display:flex;align-items:center;gap:10px;margin-top:14px;position:relative}",
    ".bld .fire{flex:1;border:0;border-radius:16px;padding:15px;font:900 17px system-ui;color:#fff;background:linear-gradient(90deg,#E8582A,#FF7A3D);box-shadow:0 10px 26px #e8582a66;cursor:pointer}",
    ".bld .fire:disabled{opacity:.5;box-shadow:none}",
    ".bld .tot{font:900 24px system-ui;color:#fff;min-width:96px;text-align:right}",
    ".bld .dlt{position:absolute;right:4px;top:-18px;font:900 13px system-ui;color:#FFD23F;animation:bldUp .9s forwards}",
    "@keyframes bldUp{from{opacity:1;transform:translateY(8px)}to{opacity:0;transform:translateY(-18px)}}",
    ".bld .flames{position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .3s}",
    ".bld.firing .flames{opacity:1}",
    ".bld .flames img{position:absolute;bottom:0;width:70px;mix-blend-mode:screen;transform-origin:50% 100%;animation:bldFl .35s ease-in-out infinite alternate}",
    ".bld .flames .hot{position:absolute;left:0;right:0;bottom:0;height:60%;background:radial-gradient(60% 70% at 50% 100%,#ff8a1fcc,#ff3d0055 45%,#0000 70%)}",
    "@keyframes bldFl{from{transform:scaleY(.8) translateX(-2px)}to{transform:scaleY(1.15) translateX(2px)}}",
    ".bld .busy{position:absolute;left:0;right:0;top:44%;text-align:center;font:900 22px system-ui;color:#fff;text-shadow:0 2px 12px #000;display:none}",
    ".bld.firing .busy{display:block}",
    ".bld .done{display:none;background:#070B1E;border:2px solid #3DDC97;border-radius:18px;padding:14px;margin-top:12px;animation:bldPop .4s cubic-bezier(.2,1.4,.4,1)}",
    "@keyframes bldPop{from{transform:scale(.8);opacity:0}to{transform:none;opacity:1}}",
    ".bld .done h4{margin:0 0 6px;font:900 18px system-ui;color:#3DDC97}",
    ".bld .done .ln{display:flex;justify-content:space-between;font-size:13.5px;color:#C9D2EE;padding:3px 0}",
    ".bld .done .ln.t{border-top:1px solid #25336A;margin-top:6px;padding-top:8px;color:#fff;font-weight:900;font-size:15px}",
    ".bld .done .acts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}",
    ".bld .done button{border:0;border-radius:12px;padding:12px;font:900 14px system-ui;cursor:pointer;color:#fff;background:#1a2656}",
    ".bld .done button.go{background:#3DDC97;color:#0b2a1c}",
    ".bld .ghost{position:fixed;z-index:99999;width:84px;height:84px;pointer-events:none;transform:translate(-50%,-50%) scale(1.1);filter:drop-shadow(0 10px 14px #000a)}",
    ".bld .ghost img{width:100%;height:100%;object-fit:contain}",
    "@media (max-width:380px){.bld .chip .ph{width:54px;height:54px}.bld .stage{height:310px}.bld .plate{width:270px;height:270px}}"
  ].join("");
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  // variants: one builder, several items (burger / chicken sandwich); each variant overrides the base config
  var VARS = C0.variants, cur = null;
  function cfg(vi) { if (!VARS) return C0; var o = {}, k; for (k in C0) o[k] = C0[k]; for (k in VARS[vi]) o[k] = VARS[vi][k]; return o; }
  function build(vi) {
  var C = cfg(vi);

  var P = {}; C.parts.forEach(function (p) { P[p.id] = p; });
  var groups = []; C.parts.forEach(function (p) { var g = p.group || "Add"; if (groups.indexOf(g) < 0) groups.push(g); });
  var counts = {}, layers = [], fired = false;
  var el = document.createElement("section"); el.className = "bld"; el.id = "build";
  el.innerHTML = '<div class="hd"><div><span class="k">Order · build it yourself</span><h3>Build your <i>' + e(C.accent) + '</i></h3></div></div>' +
    (VARS ? '<div class="tabs" role="tablist">' + VARS.map(function (v, i) { return '<button type="button" role="tab" data-v="' + i + '"' + (i === vi ? ' class="on" aria-selected="true"' : '') + '>' + e(v.tab || v.accent) + '</button>'; }).join("") + '</div>' : '') +
    '<div class="stage"><div class="glow"></div>' + (C.mode === "plate" ? '<div class="plate"><img class="pl" src="' + IMG + 'plate' + EXT + '" alt=""></div>' : '<div class="stack"></div>') +
    '<div class="flames"><div class="hot"></div></div><div class="busy"></div></div>' +
    '<div class="hint"></div>' +
    groups.map(function (g) { return '<div class="grp">' + e(g) + '</div><div class="chips">' + C.parts.filter(function (p) { return (p.group || "Add") === g; }).map(function (p) {
      return '<button type="button" class="chip" data-id="' + p.id + '"><span class="ph"><img src="' + IMG + (p.thumb || p.id) + EXT + '" alt="" draggable="false"></span><b>' + e(p.name) + '</b><small>' + (p.price ? "+" + money(p.price) : "free") + '</small></button>'; }).join("") + '</div>'; }).join("") +
    '<div class="bar"><button type="button" class="fire">🔥 ' + e(C.fireLabel || "Fire it") + '</button><div class="tot"></div></div>' +
    '<div class="done"></div>';
  var stage = el.querySelector(".stage"), stack = el.querySelector(".stack"), plate = el.querySelector(".plate"), hint = el.querySelector(".hint"), tot = el.querySelector(".tot"), fireB = el.querySelector(".fire"), done = el.querySelector(".done");

  // flames along the bottom of the stage while it cooks
  var fl = el.querySelector(".flames"); for (var i = 0; i < 9; i++) { var f = document.createElement("img"); f.src = C.fire; f.alt = ""; f.style.left = (i * 11 - 2) + "%"; f.style.height = (90 + (i % 3) * 30) + "px"; f.style.width = "auto"; f.style.animationDelay = (i * 0.07) + "s"; fl.appendChild(f); }

  function price() { var t = C.base || 0; for (var k in counts) t += (P[k].price || 0) * counts[k]; return t; }
  function sw() { return stage.clientWidth || 320; }

  // ---- stack (burger) ----
  // each layer's image sits so its bottom edge lands on the top surface of the layer below:
  // ar = image height / width, top = how far up its own image the next layer rests (fraction of its height)
  function stackY() { var l = layers[layers.length - 1]; return l ? l.b + l.ih * l.top : 18; }
  // a new layer falls from above (delay = ms before it drops; null = placed still). On landing STACKFX
  // (stackfx.js) gives it the rag-doll settle, the layers underneath react, meat steams, cheese melts, veg gets water beads.
  function addLayer(id, isTop, delay) {
    var p = P[id] || (C.layers || {})[id] || {}, im = new Image(), W = Math.min(sw(), 380), w = (p.w || .8) * W, ih = w * (p.ar || .5), b = stackY() - (p.sink || 0) * ih;
    var still = delay == null || reduce, FX = window.STACKFX, box = FX ? FX.wrap(im) : im, ly = document.createElement("div");
    im.src = IMG + id + EXT; im.alt = ""; ly.className = "ly" + (still ? "" : " in"); ly.style.width = w + "px"; ly.style.height = ih + "px"; ly.style.bottom = b + "px"; ly.style.zIndex = layers.length + 1;
    ly.appendChild(box); stack.appendChild(ly);
    var below = layers.slice().reverse().map(function (l) { return l.box; }).filter(function (x) { return x && x.classList.contains("sfx"); });
    layers.push({ id: id, el: ly, box: box, b: b, ih: ih, top: p.top == null ? .5 : p.top });
    if (still) { if (FX && FX.settle) FX.settle(box, id); }
    else setTimeout(function () {
      requestAnimationFrame(function () { ly.classList.remove("in"); setTimeout(function () { if (window.STACKFX && box.classList.contains("sfx")) STACKFX.land(box, id, below); }, 400); });
    }, delay || 0);
    fitStack();
  }
  function fitStack() { var tb = (C.layers || {})[C.top] || {}, need = stackY() + (tb.ar || .6) * (tb.w || .8) * Math.min(sw(), 380) * .8, room = stage.clientHeight; stack.style.transform = need > room ? "scale(" + Math.max(.55, room / need) + ")" : ""; }
  function order() {
    var ids = (C.start || []).slice();
    (C.stackOrder ? C.stackOrder.map(function (id) { return P[id]; }).filter(Boolean) : C.parts).forEach(function (p) { for (var n = 0; n < (counts[p.id] || 0); n++) ids.push(p.id); });
    // every slice of cheese goes straight onto a patty / fillet so it melts on the meat (double = meat, cheese, meat, cheese)
    var isMeat = function (id) { return /patty|chicken|steak|turkey/.test(id); }, isCheese = function (id) { return /cheese|swiss|cheddar|pepperjack/.test(id); };
    var cheese = ids.filter(isCheese), rest = ids.filter(function (id) { return !isCheese(id); }), out = [], meats = rest.filter(isMeat).length, seenM = 0;
    if (!meats) return ids;
    rest.forEach(function (id) { out.push(id); if (isMeat(id)) { seenM++; var take = seenM === meats ? cheese.length : Math.min(1, cheese.length); out.push.apply(out, cheese.splice(0, take)); } });
    return out;
  }
  // rebuild in stackOrder (cheese always lands right on the meat, never on the lettuce). Layers from index
  // `from` up fall again in sequence so a new slice drops into its real spot and the top of the stack lands back on it.
  function rebuildStack(from) {
    stack.innerHTML = ""; layers = [];
    order().forEach(function (id, i) { addLayer(id, false, from == null || i < from ? null : (i - from) * 170); });
  }
  function placeNew(id) {
    var ids = order(), at = ids.lastIndexOf(id), same = layers.length === ids.length - 1 && layers.every(function (l, i) { return l.id === ids[i]; });
    if (same && at === ids.length - 1) addLayer(id, false, 0); else rebuildStack(at < 0 ? null : at);
  }

  // ---- plate (hibachi) ----
  var spots = C.spots || [[.0, -.2, .36], [.2, .12, .34], [-.2, .14, .34], [.06, .28, .32], [-.24, -.12, .3], [.25, -.16, .3], [-.02, .02, .3]];
  function drawPlate() {
    [].slice.call(plate.querySelectorAll(".pc")).forEach(function (n) { n.remove(); });
    var S = plate.clientWidth || 300, k = 0, base = C.parts.filter(function (p) { return p.group === "Base" && counts[p.id]; })[0];
    if (base) (base.layout || [[0, 0, .7, base.id]]).forEach(function (L) { put(L[3] || base.id, L[0], L[1], L[2], 0, base.id + L[3]); });
    C.parts.forEach(function (p) { if (p.group === "Base") return; for (var n = 0; n < (counts[p.id] || 0); n++) {
      var s = p.at || spots[k++ % spots.length]; put(p.id, s[0] + (p.at ? n * .1 : 0), s[1] + (p.at ? n * .06 : 0), p.w || s[2], (p.id.length * 37 + n * 50) % 40 - 20, p.id + n); } });
    function put(id, x, y, w, r, key) {
      var im = new Image(); im.src = IMG + id + EXT; im.className = "pc"; im.dataset.k = key;
      im.style.left = (50 + x * 100) + "%"; im.style.top = (50 + y * 100) + "%"; im.style.width = (w * S) + "px"; im.style.setProperty("--r", r + "deg");
      if (!seen[key] && !reduce) { im.classList.add("in"); requestAnimationFrame(function () { requestAnimationFrame(function () { im.classList.remove("in"); }); }); }
      seen[key] = 1; plate.appendChild(im);
    }
  }
  var seen = {};

  function add(id) {
    if (fired) return; var p = P[id];
    if (p.group === "Base" && C.mode === "plate") { C.parts.forEach(function (q) { if (q.group === "Base" && q.id !== id) { counts[q.id] = 0; } }); seen = {}; counts[id] = 1; }
    else { if ((counts[id] || 0) >= (p.max || 1)) { say("That's the max on " + p.name.toLowerCase() + "."); return; } counts[id] = (counts[id] || 0) + 1; }
    if (C.mode === "plate") drawPlate(); else placeNew(id);
    if (p.price) { var d = document.createElement("span"); d.className = "dlt"; d.textContent = "+" + money(p.price); el.querySelector(".bar").appendChild(d); setTimeout(function () { d.remove(); }, 900); }
    if (navigator.vibrate) try { navigator.vibrate(12); } catch (x) {}
    refresh(p);
  }
  function sub(id) {
    if (fired || !counts[id]) return; counts[id]--;
    if (C.mode === "plate") { seen = {}; drawPlate(); } else rebuildStack();
    refresh();
  }
  var LINES = C.lines || ["Looking good.", "Oh that's a stack.", "Now we're talking.", "Chef's kiss.", "Keep going or fire it."];
  function say(t) { hint.textContent = t; }
  function refresh(p) {
    tot.textContent = money(price());
    el.querySelectorAll(".chip").forEach(function (c) {
      var id = c.dataset.id, n = counts[id] || 0;
      c.classList.toggle("on", n > 0);
      var b = c.querySelector(".n"), m = c.querySelector(".m");
      if (n > 1 || (n && P[id].group !== "Base")) { if (!b) { b = document.createElement("span"); b.className = "n"; c.appendChild(b); } b.textContent = n; } else if (b) b.remove();
      if (n && P[id].group !== "Base") { if (!m) { m = document.createElement("span"); m.className = "m"; m.textContent = "−"; m.setAttribute("role", "button"); m.setAttribute("aria-label", "Remove one " + P[id].name); c.appendChild(m); } } else if (m) m.remove();
    });
    var any = Object.keys(counts).some(function (k) { return counts[k]; }), needBase = C.mode === "plate" && !C.parts.some(function (q) { return q.group === "Base" && counts[q.id]; }),
      needG = C.need && !C.parts.some(function (q) { return q.group === C.need && counts[q.id]; });
    fireB.disabled = !any || needBase || !!needG;
    if (p) say(p.group === "Base" ? (C.baseLine || "Base is down. Now the good stuff.") : needG ? (C.needLine || "Pick your " + C.need.toLowerCase() + " first.") : LINES[(Math.random() * LINES.length) | 0] + (fireB.disabled ? "" : " Fire it when it looks right."));
    else if (!any || needG) say(C.mode === "plate" ? "Tap or drag your base onto the plate first." : C.needLine || "Tap or drag anything onto your " + C.accent + ".");
  }

  // ---- tap + drag ----
  var drag = null;
  el.addEventListener("click", function (ev) { var t = ev.target.closest(".tabs button"); if (t && +t.dataset.v !== vi) build(+t.dataset.v); });
  el.addEventListener("pointerdown", function (ev) {
    var m = ev.target.closest(".m"); if (m) { ev.preventDefault(); sub(m.parentNode.dataset.id); return; }
    var c = ev.target.closest(".chip"); if (!c || fired) return;
    drag = { id: c.dataset.id, x: ev.clientX, y: ev.clientY, moved: false, g: null, pid: ev.pointerId }; try { c.setPointerCapture(ev.pointerId); } catch (x) {}
  });
  el.addEventListener("pointermove", function (ev) {
    if (!drag) return; var dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
    if (!drag.moved && dx * dx + dy * dy > 64) { drag.moved = true; drag.g = document.createElement("div"); drag.g.className = "ghost"; drag.g.innerHTML = '<img src="' + IMG + (P[drag.id].thumb || drag.id) + EXT + '" alt="">'; el.appendChild(drag.g); }
    if (drag.g) { drag.g.style.left = ev.clientX + "px"; drag.g.style.top = ev.clientY + "px"; }
  });
  function endDrag(ev) {
    if (!drag) return; var d = drag; drag = null;
    if (d.g) { d.g.remove(); var r = stage.getBoundingClientRect(); if (ev.clientX > r.left && ev.clientX < r.right && ev.clientY > r.top && ev.clientY < r.bottom + 40) add(d.id); }
    else if (ev.type === "pointerup") add(d.id);
  }
  el.addEventListener("pointerup", endDrag); el.addEventListener("pointercancel", endDrag);

  // ---- fire it -> order ----
  fireB.addEventListener("click", function () {
    if (fired) return; fired = true; el.classList.add("firing"); fireB.disabled = true;
    if (C.mode !== "plate" && C.top) setTimeout(function () { addLayer(C.top, true, 0); }, 350);
    var busy = el.querySelector(".busy"), t0 = Date.now(), msg = C.fireBusy || "Firing it up";
    (function tick() { var s = 3 - Math.floor((Date.now() - t0) / 800); busy.textContent = s > 0 ? msg + "… " + s : "Done 🔥"; if (s > 0) setTimeout(tick, 120); })();
    setTimeout(function () { el.classList.remove("firing"); showDone(); }, reduce ? 300 : 2600);
  });
  function lines() { var out = C.base ? [[C.baseName || "Base", C.base]] : []; C.parts.forEach(function (p) { if (counts[p.id]) out.push([p.name + (counts[p.id] > 1 ? " ×" + counts[p.id] : ""), (p.price || 0) * counts[p.id]]); }); return out; }
  function showDone() {
    var t = price();
    done.innerHTML = '<h4>✅ Your ' + e(C.accent) + ' is ready to order</h4>' + lines().map(function (l) { return '<div class="ln"><span>' + e(l[0]) + '</span><span>' + (l[1] ? money(l[1]) : "") + '</span></div>'; }).join("") +
      '<div class="ln t"><span>Total</span><span>' + money(t) + '</span></div><div class="acts"><button type="button" class="go" data-a="order">Place order</button><button type="button" data-a="again">Build another</button></div>';
    done.style.display = "block"; done.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
  }
  done.addEventListener("click", function (ev) {
    var b = ev.target.closest("button"); if (!b) return;
    if (b.dataset.a === "again") { counts = {}; fired = false; seen = {}; done.style.display = "none"; if (C.mode === "plate") drawPlate(); else rebuildStack(); refresh(); stage.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    if (b.dataset.a !== "order") return;
    // contact info is asked here, at the end of the order (members go straight through)
    (window.SSAI_GATE || function (r, cb) { cb(); })("order", function () {
    var t = price(), num = "#" + String.fromCharCode(65 + ((Math.random() * 26) | 0)) + (100 + ((Math.random() * 900) | 0)), earn = window.SSAI_EARN ? window.SSAI_EARN(t, "🍽️ Built " + C.accent + " order " + num) : null;
    done.innerHTML = '<h4>🎉 Order ' + num + ' placed</h4><div class="ln"><span>Pay at pickup</span><span>' + money(t) + '</span></div><div class="ln"><span>Ready in about</span><span>12 min</span></div>' +
      (earn ? '<div class="ln" style="color:#FFD23F"><span>' + (earn.saved ? "Rewards points earned" : "Join rewards to earn") + '</span><span>+' + earn.pts + ' pts</span></div>' : '') +
      '<div class="acts"><button type="button" data-a="again">Build another</button><button type="button" class="go" data-a="pts">See my rewards</button></div><p style="font-size:11.5px;color:#7F8AAA;margin:10px 0 0">Demo order: nothing is charged or sent. Live, it goes straight to ' + e(C.name || "the kitchen") + '.</p>';
    var pt = done.querySelector('[data-a="pts"]'); pt.onclick = function () { var j = document.getElementById("crm-join"); if (j) j.scrollIntoView({ behavior: "smooth" }); };
    });
  });

  var mount = C.mount && document.querySelector(C.mount);
  if (cur && cur.parentNode) cur.parentNode.replaceChild(el, cur);
  else if (mount && mount.parentNode) mount.parentNode.insertBefore(el, mount); else document.body.appendChild(el);
  cur = el;
  if (C.mode === "plate") drawPlate(); else rebuildStack();
  refresh();
  }
  var h = (location.hash || "").slice(1), v0 = 0;
  if (VARS) VARS.forEach(function (v, i) { if (v.hash && v.hash === h) v0 = i; });
  build(v0);
})();
