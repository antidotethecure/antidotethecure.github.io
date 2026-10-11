/* SousShift AI — "floating food": ambient, tappable menu items drifting around a restaurant demo page.
   Opt-in per restaurant (pages that still use flyby.js are unchanged):
     <script>window.FLOATFOOD={first:8, every:3, max:4, busy:function(){ return gameIsRunning; }, items:[
       {img:"img/fly/fly-collard-dip.webp", name:"Original Collard Green Dip", to:"img/collard-dip.jpg", hot:1},
       {img:"img/game/kiki.webp", name:"Kiki Palmer", to:"#cat-drinks", drink:1, color:"#e8a33a"}, …]};</script>
     <script src="../floatfood.js"></script>
   - Waits `first` s after load, then brings out a new item every `every` s (max `max` on screen at once). Each one
     drifts across, bobs in from a side, or drops and settles, with a little rotation (and steam when hot:1).
   - Tap food: a bite comes out of it (CSS mask), crumbs fall, "nom!". Second bite → it shrinks away.
   - Tap a drink: it tips over and spills a puddle in its `color`, then fades.
   - "See it on the menu": a tiny link appears after the reaction, or long-press an item. `to` is the menu photo's src
     or any CSS selector. Swipes that start on an item still scroll the page (touch-action:pan-y).
   - Never shows while busy() is true, a sheet / form / the locked game screen / halftime ad is open, a field has focus, the tab is
     hidden (in-flight items pause), or for prefers-reduced-motion. Items in the air fade when one of those starts.
   - Only the items themselves take pointer events; they keep clear of the top pill and the bottom bars, sit
     semi-transparent, and live in a fixed overflow-hidden layer (no horizontal scroll). transform/opacity only.
   Test hooks: window.FLOATFOOD_NOW("food"|"drink") spawns one now; window.__ffCount() = items on screen;
   window.FLOATFOOD_CLEAR() removes them all; window.FLOATFOOD_STOP() stops the timer.
   avoid: CSS selector (e.g. ".gamebox"): no new items while it fills most of the screen, and items crossing it are
   tap-through so its buttons keep working. */
(function () {
  "use strict";
  var C = window.FLOATFOOD; if (!C || !(C.items || []).length || window.__floatfood) return;
  window.__floatfood = 1;
  var D = document, W = window;
  var RM = W.matchMedia && W.matchMedia("(prefers-reduced-motion: reduce)");
  var FIRST = (C.first != null ? C.first : 8) * 1000, EVERY = (C.every || 3) * 1000, MAX = C.max || 4;
  var TOP = 64, BOTTOM = 104;   // keep clear of the language pill and the bottom bars
  var css = ".ff-l{position:fixed;inset:0;z-index:60;pointer-events:none;overflow:hidden;contain:strict}" +
    ".ff-i{position:absolute;left:0;top:0;pointer-events:auto;cursor:pointer;touch-action:pan-y;-webkit-tap-highlight-color:transparent;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none;will-change:transform,opacity}" +
    ".ff-w{position:relative;transform-origin:50% 90%;animation:ffWob var(--wd,3.2s) ease-in-out infinite alternate}" +
    ".ff-m{position:relative;opacity:.86}" +
    ".ff-sh{filter:drop-shadow(0 8px 10px rgba(60,30,0,.3))}" +   // shadow outside the mask so it follows the bites
    ".ff-m img{display:block;width:100%;height:auto;pointer-events:none;-webkit-user-drag:none}" +
    ".ff-st{position:absolute;left:50%;bottom:60%;width:70%;height:80%;transform:translateX(-50%);pointer-events:none}" +
    ".ff-st i{position:absolute;bottom:0;width:22%;height:70%;border-radius:50%;background:radial-gradient(closest-side,rgba(255,255,255,.9),rgba(236,228,218,.5) 55%,rgba(200,190,180,0));filter:blur(4px);opacity:0;animation:ffSteam 2.4s ease-out infinite}" +
    ".ff-st i:nth-child(1){left:14%}.ff-st i:nth-child(2){left:42%;animation-delay:.8s}.ff-st i:nth-child(3){left:66%;animation-delay:1.6s}" +
    ".ff-cr,.ff-dp{position:absolute;left:0;top:0;pointer-events:none;will-change:transform,opacity}" +
    ".ff-cr{width:7px;height:6px;border-radius:40% 60% 50% 45%;background:#c98a3c;box-shadow:inset -1px -1px 0 rgba(90,50,10,.35)}" +
    ".ff-dp{border-radius:50%}" +
    ".ff-nom{position:absolute;left:0;top:0;pointer-events:none;font:900 18px/1 system-ui,-apple-system,sans-serif;color:#fff;-webkit-text-stroke:1px rgba(80,30,0,.6);text-shadow:0 2px 0 #c0392b,0 4px 10px rgba(0,0,0,.3);white-space:nowrap;will-change:transform,opacity}" +
    ".ff-pud{position:absolute;left:0;top:0;pointer-events:none;border-radius:50%;will-change:transform,opacity}" +
    ".ff-go{position:absolute;left:0;top:0;pointer-events:auto;border:0;margin:0;cursor:pointer;font:800 11px/1 system-ui,-apple-system,sans-serif;color:#fff;background:rgba(42,30,54,.86);border-radius:99px;padding:6px 10px;box-shadow:0 4px 10px rgba(0,0,0,.25);white-space:nowrap;touch-action:manipulation;will-change:transform,opacity}" +
    "@keyframes ffWob{from{transform:rotate(calc(var(--r,6deg) * -1)) translateY(0)}to{transform:rotate(var(--r,6deg)) translateY(-4px)}}" +
    "@keyframes ffSteam{0%{opacity:0;transform:translateY(8px) scale(.6)}25%{opacity:.8}100%{opacity:0;transform:translateY(-56px) translateX(6px) scale(1.5)}}" +
    ".ff-hit{animation:ffHit 1.4s ease-out 2}@keyframes ffHit{0%{box-shadow:0 0 0 0 rgba(242,193,78,.9)}100%{box-shadow:0 0 0 16px rgba(242,193,78,0)}}" +
    "@media (prefers-reduced-motion:reduce){.ff-l{display:none}}";
  var st = D.createElement("style"); st.textContent = css; D.head.appendChild(st);

  var foods = C.items.filter(function (i) { return !i.drink; }), drinks = C.items.filter(function (i) { return i.drink; });
  var bagF = [], bagD = [], layer = null, live = [], timer = 0, started = false;
  // preload every cut-out so nothing pops in half-drawn
  C.items.forEach(function (it) { var im = new Image(); im.decoding = "async"; im.onload = function () { it._ar = im.naturalHeight / im.naturalWidth; }; im.src = it.img; });

  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pick(kind, name) {
    if (name) { var hit = C.items.filter(function (i) { return i.name === name; })[0]; if (hit) return hit; }
    var wantDrink = kind ? kind === "drink" : (drinks.length && Math.random() < 0.34);
    if (wantDrink && drinks.length) { if (!bagD.length) bagD = shuffle(drinks); return bagD.pop(); }
    if (!bagF.length) bagF = shuffle(foods.length ? foods : drinks); return bagF.pop();
  }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function blocked() {
    if (RM && RM.matches) return true;
    if (D.hidden) return true;
    try { if (C.busy && C.busy()) return true; } catch (e) {}
    if (D.fullscreenElement || D.webkitFullscreenElement) return true;
    if (D.documentElement.classList.contains("ssai-locked")) return true;   // game has the screen locked
    if (D.querySelector(".crm-gate,.crm-draw,.gm-sheet.on,.tok-ov,.ht.on,#m3d-o[style*='grid'],.ssai-pauseov:not([hidden]),dialog[open]")) return true;
    var a = D.activeElement; if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return true;
    return false;
  }
  function target(it) {
    var t = it.to || "";
    var el = /[\/.]/.test(t) && !/^[#.\[]/.test(t) ? D.querySelector('img[src="' + t + '"]') : D.querySelector(t);
    return el ? (el.closest(".item,.dish,article") || el) : null;
  }
  function goMenu(it) {
    var el = target(it); if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.remove("ff-hit"); void el.offsetWidth; el.classList.add("ff-hit");
    setTimeout(function () { el.classList.remove("ff-hit"); }, 3000);
  }
  function ensureLayer() {
    if (!layer) { layer = D.createElement("div"); layer.className = "ff-l"; D.body.appendChild(layer); }
    return layer;
  }
  function fx(cls, x, y, extra) {   // a throwaway effect element at layer coords
    var e = D.createElement(cls === "ff-go" ? "button" : "span"); e.className = cls;
    if (extra) extra(e);
    e.style.transform = "translate(" + x + "px," + y + "px)";
    layer.appendChild(e); return e;
  }
  function kill(rec, fast) {
    var i = live.indexOf(rec); if (i < 0) return; live.splice(i, 1);
    clearTimeout(rec.auto);
    if (rec.anim) rec.anim.pause();
    if (!fast) { rec.el.remove(); return; }
    rec.el.style.pointerEvents = "none";
    rec.el.animate([{ opacity: getComputedStyle(rec.el).opacity }, { opacity: 0 }], { duration: 300, fill: "forwards" }).onfinish = function () { rec.el.remove(); };
  }

  /* ---------- motion paths (layer coords, px) ---------- */
  function path(kind, w, h, vw, vh) {
    var yMin = TOP, yMax = Math.max(TOP + 10, vh - BOTTOM - h), kf = [], N, i, f, x, y, r;
    var ltr = Math.random() < 0.5, A = 0.9;
    if (kind === "drift") {   // slow drift across with a lazy wave
      var y0 = rnd(yMin, yMax), y1 = Math.min(yMax, Math.max(yMin, y0 + rnd(-0.15, 0.15) * vh)), x0 = ltr ? -w - 10 : vw + 10, x1 = ltr ? vw + 10 : -w - 10, amp = rnd(10, 22);
      N = 8; for (i = 0; i <= N; i++) { f = i / N; x = x0 + (x1 - x0) * f; y = y0 + (y1 - y0) * f + Math.sin(f * Math.PI * 2) * amp; r = Math.sin(f * Math.PI * 2 + 1) * 5;
        kf.push({ transform: "translate(" + x + "px," + y + "px) rotate(" + r + "deg)", opacity: i === 0 || i === N ? 0 : A }); }
      return { kf: kf, dur: rnd(11000, 14000), easing: "linear" };
    }
    if (kind === "bob") {   // floats in from a side, lingers in the margin bobbing, floats back out
      var edge = ltr ? 0 : 1, ex = edge ? vw + 10 : -w - 10, inX = edge ? vw - w * rnd(0.62, 0.85) : -w * rnd(0.15, 0.38), by = rnd(yMin, yMax);
      var pts = [[ex, by + 30, 0], [inX, by, 0.9], [inX + (edge ? -14 : 14), by - 18, 0.9], [inX + (edge ? -4 : 4), by + 14, 0.9], [inX + (edge ? -16 : 16), by - 8, 0.9], [inX, by + 6, 0.9], [ex, by - 40, 0]];
      pts.forEach(function (p, k) { kf.push({ transform: "translate(" + p[0] + "px," + p[1] + "px) rotate(" + ((k % 2 ? 1 : -1) * rnd(2, 7)) + "deg)", opacity: p[2] * A / 0.9 }); });
      return { kf: kf, dur: rnd(9000, 11500), easing: "ease-in-out" };
    }
    // drop: falls in from the top, settles with a soft bounce, then fades where it landed
    var dx = rnd(0, vw - w), rest = rnd(yMin + 0.25 * (yMax - yMin), yMax), rr = rnd(-10, 10);
    kf = [
      { offset: 0, transform: "translate(" + dx + "px," + (-h - 20) + "px) rotate(" + (rr * 2) + "deg)", opacity: 0 },
      { offset: 0.08, opacity: A },
      { offset: 0.34, transform: "translate(" + dx + "px," + (rest + 10) + "px) rotate(" + (-rr * 0.5) + "deg)", easing: "ease-out" },
      { offset: 0.42, transform: "translate(" + dx + "px," + (rest - 9) + "px) rotate(" + (rr * 0.3) + "deg)", easing: "ease-in-out" },
      { offset: 0.5, transform: "translate(" + dx + "px," + rest + "px) rotate(0deg)" },
      { offset: 0.82, transform: "translate(" + dx + "px," + rest + "px) rotate(0deg) scale(1)", opacity: A },
      { offset: 1, transform: "translate(" + dx + "px," + (rest + 6) + "px) rotate(0deg) scale(.9)", opacity: 0 }];
    return { kf: kf, dur: rnd(6500, 7500), easing: "ease-in" };
  }

  /* ---------- spawn ---------- */
  function avoidRect() { var a = C.avoid && D.querySelector(C.avoid); return a ? a.getBoundingClientRect() : null; }
  function spawn(kind, motion, name) {
    if (live.length >= MAX || blocked()) return false;
    // the visitor is looking at the game: leave it alone (no new items while it fills most of the screen)
    var ar = avoidRect(), vh0 = W.innerHeight;
    if (ar && !motion && Math.min(ar.bottom, vh0) - Math.max(ar.top, 0) > vh0 * 0.45) return false;
    ensureLayer();
    var it = pick(kind, name); if (!it) return false;
    var vw = layer.clientWidth, vh = layer.clientHeight;
    var w = it.drink ? Math.round(rnd(52, 64) * (it.wide || 1)) : Math.round(rnd(88, 116));
    var el = D.createElement("div"); el.className = "ff-i"; el.style.width = w + "px";
    if (it._ar) el.style.height = Math.round(w * it._ar) + "px";
    el.setAttribute("role", "button"); el.setAttribute("tabindex", "-1");
    el.setAttribute("aria-label", (it.name || "Menu item") + (it.drink ? ": tap to spill, hold to see it on the menu" : ": tap to take a bite, hold to see it on the menu"));
    el.innerHTML = '<div class="ff-w" style="--r:' + rnd(3, 7).toFixed(1) + 'deg;--wd:' + rnd(2.6, 3.8).toFixed(2) + 's">' +
      (it.hot ? '<span class="ff-st"><i></i><i></i><i></i></span>' : "") +
      '<div class="ff-sh"><div class="ff-m"><img src="' + it.img + '" alt="" draggable="false"' + (it._ar ? ' width="' + w + '" height="' + Math.round(w * it._ar) + '"' : "") + '></div></div></div>';
    layer.appendChild(el);
    var h = el.offsetHeight || w;
    var kinds = ["drift", "bob", "drop"], mk = motion || kinds[Math.floor(Math.random() * 3)];
    var p = path(mk, w, h, vw, vh);
    var rec = { el: el, it: it, w: w, h: h, bites: 0, busy: false, motion: mk };
    rec.anim = el.animate(p.kf, { duration: p.dur, easing: p.easing, fill: "forwards" });
    rec.anim.onfinish = function () { if (!rec.busy) kill(rec, false); };
    live.push(rec);
    wire(rec);
    return true;
  }

  /* ---------- input: tap = reaction, long-press = menu, swipe = page scroll ---------- */
  function wire(rec) {
    var el = rec.el, t0 = 0, x0 = 0, y0 = 0, lp = 0, moved = false, longed = false;
    el.addEventListener("pointerdown", function (e) {
      t0 = Date.now(); x0 = e.clientX; y0 = e.clientY; moved = false; longed = false;
      clearTimeout(lp); lp = setTimeout(function () { if (!moved) { longed = true; goMenu(rec.it); kill(rec, true); } }, 550);
    });
    el.addEventListener("pointermove", function (e) { if (Math.abs(e.clientX - x0) > 10 || Math.abs(e.clientY - y0) > 10) { moved = true; clearTimeout(lp); } });
    el.addEventListener("pointercancel", function () { moved = true; clearTimeout(lp); });
    el.addEventListener("pointerup", function () { clearTimeout(lp); });
    el.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    el.addEventListener("click", function (e) {
      e.preventDefault(); e.stopPropagation();
      if (longed || moved) return;
      if (rec.it.drink) spill(rec); else bite(rec);
    });
  }
  function freeze(rec) {   // stop travelling so the reaction plays in place
    if (rec.anim && rec.anim.playState !== "finished") { rec.anim.commitStyles && rec.anim.commitStyles(); rec.anim.cancel(); rec.anim = null; }
    rec.el.style.opacity = "1";
    var wob = rec.el.querySelector(".ff-w"); if (wob) wob.style.animationPlayState = "paused";
  }
  function boxOf(rec) { var r = rec.el.getBoundingClientRect(), l = layer.getBoundingClientRect(); return { x: r.left - l.left, y: r.top - l.top, w: r.width, h: r.height }; }
  function menuLink(rec, x, y) {
    if (!target(rec.it)) return;
    var vw = layer.clientWidth;
    var b = fx("ff-go", 0, 0, function (e) { e.type = "button"; e.textContent = "See it on the menu ›"; e.setAttribute("aria-label", "See " + (rec.it.name || "it") + " on the menu"); });
    var bw = b.offsetWidth || 130; x = Math.max(8, Math.min(vw - bw - 8, x - bw / 2));
    var pos = "translate(" + x + "px," + y + "px)";
    b.style.transform = pos;
    b.animate([{ opacity: 0, transform: pos + " scale(.8)" }, { opacity: 1, transform: pos }], { duration: 220, fill: "forwards" });
    b.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); goMenu(rec.it); b.remove(); });
    setTimeout(function () { b.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: "forwards" }).onfinish = function () { b.remove(); }; }, 3200);
  }

  /* ---------- food: bites ---------- */
  function bite(rec) {
    if (rec.done) return;
    if (!rec.busy) { rec.busy = true; freeze(rec); var sm = rec.el.querySelector(".ff-st"); if (sm) sm.style.display = "none"; }
    rec.bites++;
    var m = rec.el.querySelector(".ff-m"), w = m.offsetWidth, h = m.offsetHeight;
    // bite #1 from the upper-right edge, #2 from the left; each is a scalloped arc of 3 circles (teeth marks)
    var spots = [[0.86, 0.22, -1], [0.1, 0.48, 1], [0.6, 0.06, 0]], s = spots[(rec.bites - 1) % 3], R = Math.min(w, h) * 0.2;
    var cx = s[0] * w, cy = s[1] * h, layers = rec.masks || [];
    [[0, 0, 1], [-0.85, 0.55, 0.66], [0.85, -0.55, 0.66]].forEach(function (c) {
      var ox = c[0] * R * (s[2] ? 0.6 : 1), oy = c[1] * R * (s[2] || 1), rr = R * c[2];
      layers.push("radial-gradient(circle " + rr.toFixed(1) + "px at " + (cx + ox).toFixed(1) + "px " + (cy + oy).toFixed(1) + "px, transparent 96%, #000 100%)");
    });
    rec.masks = layers;
    var img = layers.join(",");
    m.style.webkitMaskImage = img; m.style.webkitMaskComposite = "source-in";
    m.style.maskImage = img; m.style.maskComposite = "intersect";
    m.style.webkitMaskRepeat = m.style.maskRepeat = "no-repeat";
    rec.el.animate([{ transform: getComputedStyle(rec.el).transform }, { transform: getComputedStyle(rec.el).transform + " scale(.93)" }, { transform: getComputedStyle(rec.el).transform }], { duration: 220 });
    var b = boxOf(rec), mx = b.x + (cx / w) * b.w, my = b.y + (cy / h) * b.h;
    // crumbs
    for (var i = 0; i < 7; i++) {
      var c = fx("ff-cr", mx, my, function (e) { var sz = rnd(4, 8); e.style.width = sz + "px"; e.style.height = (sz * rnd(0.7, 1)) + "px"; e.style.background = ["#c98a3c", "#e0b061", "#a8692b", "#f1cf86"][i % 4]; });
      var dx = rnd(-30, 30), dy = rnd(70, 140), rot = rnd(-200, 200);
      c.animate([{ transform: "translate(" + mx + "px," + my + "px) rotate(0)", opacity: 1 },
        { transform: "translate(" + (mx + dx * 0.6) + "px," + (my - rnd(6, 16)) + "px) rotate(" + rot * 0.3 + "deg)", opacity: 1, offset: 0.2 },
        { transform: "translate(" + (mx + dx) + "px," + (my + dy) + "px) rotate(" + rot + "deg)", opacity: 0 }],
        { duration: rnd(800, 1200), easing: "cubic-bezier(.3,.1,.7,1)", fill: "forwards" }).onfinish = (function (n) { return function () { n.remove(); }; })(c);
    }
    // "nom!"
    var words = ["nom!", "NOM!", "mmm!", "nom nom!"], nm = fx("ff-nom", mx, my, function (e) { e.textContent = words[(rec.bites - 1) % words.length]; });
    var nx = Math.max(4, Math.min(layer.clientWidth - 70, mx - 18));
    nm.animate([{ transform: "translate(" + nx + "px," + (my - 10) + "px) scale(.4) rotate(-8deg)", opacity: 0 },
      { transform: "translate(" + nx + "px," + (my - 30) + "px) scale(1.15) rotate(4deg)", opacity: 1, offset: 0.3 },
      { transform: "translate(" + nx + "px," + (my - 46) + "px) scale(1) rotate(0)", opacity: 0 }], { duration: 900, easing: "ease-out", fill: "forwards" }).onfinish = function () { nm.remove(); };
    clearTimeout(rec.auto);
    if (rec.bites === 1) {
      menuLink(rec, b.x + b.w / 2, Math.min(layer.clientHeight - BOTTOM, b.y + b.h + 6));
      rec.auto = setTimeout(function () { finishFood(rec); }, 3600);   // not tapped again: it fades away on its own
    } else rec.auto = setTimeout(function () { finishFood(rec); }, 520);
  }
  function finishFood(rec) {
    if (rec.done) return; rec.done = true;
    var t = getComputedStyle(rec.el).transform; t = t === "none" ? "" : t;
    rec.el.style.pointerEvents = "none";
    rec.el.animate([{ transform: t + " scale(1)", opacity: 1 }, { transform: t + " scale(.35) rotate(12deg)", opacity: 0 }], { duration: 900, easing: "ease-in", fill: "forwards" }).onfinish = function () { kill(rec, false); };
  }

  /* ---------- drinks: tip over + spill ---------- */
  function spill(rec) {
    if (rec.busy) return; rec.busy = true; freeze(rec); rec.done = true;
    rec.el.style.pointerEvents = "none";
    var wob = rec.el.querySelector(".ff-w"), b = boxOf(rec), dir = b.x + b.w / 2 < layer.clientWidth / 2 ? 1 : -1;
    var col = rec.it.color || "#f2c14e";
    wob.style.animation = "none"; wob.style.transformOrigin = dir > 0 ? "85% 95%" : "15% 95%";
    wob.animate([{ transform: "rotate(0)" }, { transform: "rotate(" + (dir * -8) + "deg)", offset: 0.18 },
      { transform: "rotate(" + (dir * 96) + "deg) translateY(-4px)", offset: 0.62 }, { transform: "rotate(" + (dir * 88) + "deg)" }],
      { duration: 700, easing: "cubic-bezier(.45,0,.6,1.3)", fill: "forwards" });
    // the puddle spreads out where the rim lands
    var floorY = b.y + b.h - 4, rimX = dir > 0 ? b.x + b.w + b.h * 0.55 : b.x - b.h * 0.55, pw = Math.min(170, b.h * 1.5), ph = pw * 0.32;
    var px = Math.max(-pw * 0.3, Math.min(layer.clientWidth - pw * 0.7, rimX - pw / 2)), py = floorY - ph / 2;
    setTimeout(function () {
      var pud = fx("ff-pud", px, py, function (e) {
        e.style.width = pw + "px"; e.style.height = ph + "px";
        e.style.background = "radial-gradient(60% 70% at 45% 45%, rgba(255,255,255,.45) 0 12%, transparent 30%), radial-gradient(closest-side, " + col + " 70%, " + col + "cc 88%, transparent 100%)";
        e.style.boxShadow = "inset 0 -3px 6px rgba(0,0,0,.15)";
      });
      var base = "translate(" + px + "px," + py + "px)";
      pud.animate([{ transform: base + " scale(.1,.2)", opacity: 0.95 }, { transform: base + " scale(1.08,1.04)", opacity: 0.95, offset: 0.35 },
        { transform: base + " scale(1,1)", opacity: 0.9, offset: 0.7 }, { transform: base + " scale(1.04,1)", opacity: 0 }],
        { duration: 2600, easing: "ease-out", fill: "forwards" }).onfinish = function () { pud.remove(); };
      // splash droplets
      for (var i = 0; i < 9; i++) {
        var sz = rnd(5, 11), sx = px + pw / 2 + rnd(-pw * 0.3, pw * 0.3), sy = py + ph / 2;
        var d = fx("ff-dp", sx, sy, function (e) { e.style.width = e.style.height = sz + "px"; e.style.background = col; e.style.boxShadow = "inset -1px -2px 0 rgba(0,0,0,.12)"; });
        var dx = rnd(-55, 55), up = rnd(22, 60);
        d.animate([{ transform: "translate(" + sx + "px," + sy + "px) scale(.6)", opacity: 1 },
          { transform: "translate(" + (sx + dx * 0.6) + "px," + (sy - up) + "px) scale(1)", opacity: 1, offset: 0.45 },
          { transform: "translate(" + (sx + dx) + "px," + (sy + 6) + "px) scale(.7)", opacity: 0 }],
          { duration: rnd(650, 900), easing: "cubic-bezier(.2,.6,.5,1)", fill: "forwards" }).onfinish = (function (n) { return function () { n.remove(); }; })(d);
      }
      menuLink(rec, px + pw / 2, Math.min(layer.clientHeight - BOTTOM, py + ph + 4));
    }, 380);
    setTimeout(function () {
      rec.el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 800, fill: "forwards" }).onfinish = function () { kill(rec, false); };
    }, 1700);
  }

  /* ---------- scheduler ---------- */
  function tick() {
    if (blocked()) {
      // the game / a sheet / the ad started (or the tab hid): clear the air
      if (!D.hidden) live.slice().forEach(function (r) { kill(r, true); });
      return;
    }
    spawn();
  }
  function start() { if (started) return; started = true; timer = setTimeout(function loop() { tick(); timer = setTimeout(loop, EVERY); }, FIRST); }
  // a sheet or the game opening between ticks fades items right away
  // and items drifting over the game box (C.avoid) let taps fall through to the game's buttons
  setInterval(function () {
    if (!live.length || D.hidden) return;
    if (blocked()) { live.slice().forEach(function (r) { kill(r, true); }); return; }
    var ar = avoidRect(); if (!ar) return;
    live.forEach(function (r) { if (r.busy) return; var b = r.el.getBoundingClientRect(), o = b.right > ar.left && b.left < ar.right && b.bottom > ar.top && b.top < ar.bottom;
      r.el.style.pointerEvents = o ? "none" : ""; });
  }, 400);
  D.addEventListener("visibilitychange", function () {
    live.forEach(function (r) { if (r.anim) { if (D.hidden) r.anim.pause(); else r.anim.play(); } });
  });
  W.FLOATFOOD_NOW = function (kind, motion, name) { ensureLayer(); return spawn(kind, motion || null, name); };
  W.FLOATFOOD_STOP = function () { clearTimeout(timer); started = true; };
  W.__ffCount = function () { return live.length; };
  W.FLOATFOOD_CLEAR = function () { live.slice().forEach(function (r) { kill(r, false); }); };
  if (D.readyState === "loading") D.addEventListener("DOMContentLoaded", start); else start();
})();
