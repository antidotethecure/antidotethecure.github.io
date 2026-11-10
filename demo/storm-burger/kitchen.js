/* Storm Run · Jordan High kitchen stop (Antidote 2026-10-21). Pull into the Jordan High pit bay and the run pauses: you get
   20 seconds to build as many StormBurger orders as you can for the Panthers. Tap the ingredients in the order the ticket
   shows; the burger stacks up tight (no gaps between layers). Every finished burger feeds a kid (+75) and the kids repair
   the truck (+1 life, up to 5). Then you're back on the road into the storm.
   Works over both renderers (2D canvas and the 3D chase view): a DOM overlay on the game box. index.html pitStart() calls
   SB_KITCHEN.open(done); done() fires when the time is up or the player taps "Back on the road". */
(function () {
  "use strict";
  var game = document.getElementById("game"); if (!game || !window.__S) return;
  var T = function (s) { return (window.__T || String)(s); };
  var IMG = "img/build/", TIME = 20000;
  var ING = { bun_bottom: "Bottom bun", bun_top: "Top bun", patty: "Patty", cheese: "Cheese", lettuce: "Lettuce", tomato: "Tomato", onion: "Onion",
    pickles: "Pickles", pickles_crinkle: "Crinkle pickles", bacon: "Bacon", onion_straws: "Onion straws", chicken: "Chicken", slaw: "Coleslaw" };
  var ORDERS = [
    ["Classic StormBurger", ["bun_bottom", "patty", "cheese", "pickles", "onion", "tomato", "lettuce", "bun_top"]],
    ["Kids Burger", ["bun_bottom", "patty", "cheese", "bun_top"]],
    ["Bacon BBQ Burger", ["bun_bottom", "patty", "cheese", "bacon", "onion_straws", "bun_top"]],
    ["Chicken Sandwich", ["bun_bottom", "pickles_crinkle", "chicken", "slaw", "lettuce", "bun_top"]],
    ["Turkey Burger", ["bun_bottom", "onion", "patty", "cheese", "tomato", "lettuce", "bun_top"]],
    ["Double Classic", ["bun_bottom", "patty", "cheese", "patty", "cheese", "bun_top"]]];
  var KIDS = ["🧑🏾", "👦🏽", "👧🏿", "🧒🏻", "👩🏾", "👦🏿"];
  var css = document.createElement("style");
  css.textContent = ".sbk{position:absolute;inset:0;z-index:8;display:none;flex-direction:column;border-radius:12px;overflow:hidden;background:transparent;color:#EEF2FF;font:600 13px Archivo,system-ui,sans-serif;touch-action:manipulation;user-select:none}" +
    ".sbk.on{display:flex}.sbk .hd{display:flex;align-items:center;justify-content:space-between;padding:6px 10px;background:#1f46b8;font-weight:900}.sbk .hd b{font:400 20px 'Bebas Neue',Impact,sans-serif;letter-spacing:.04em}" +
    ".sbk .row{background:rgba(6,10,32,.9);padding-bottom:6px}.sbk .ft{background:rgba(6,10,32,.92);padding-top:2px}.sbk .tm{font:900 18px ui-monospace,Menlo,monospace;color:#FFD23F}.sbk .row{display:flex;gap:8px;padding:6px 10px 0}.sbk .tk{flex:1;background:#fff;color:#141a33;border-radius:10px;padding:5px 9px}" +
    ".sbk .tk h4{margin:0 0 2px;font:900 13px Archivo,system-ui}.sbk .tk ol{display:flex;flex-wrap:wrap;gap:0 14px;margin:0;padding-left:18px;font-size:11px;line-height:1.35}.sbk .tk li.ok{color:#1e9a52;text-decoration:line-through}.sbk .tk li.nx{font-weight:900;color:#d9262f}" +
    ".sbk .st{position:relative;width:100%;flex:1;min-height:120px;overflow:hidden;background:radial-gradient(ellipse 46% 52% at 50% 58%,rgba(4,6,20,.55),rgba(4,6,20,.12) 70%,rgba(4,6,20,0))}.sbk .pl{position:absolute;inset:0;transform-origin:50% 100%}.sbk .st img{position:absolute;left:50%;transform:translateX(-50%);filter:drop-shadow(0 3px 3px rgba(0,0,0,.45));transition:bottom .12s}" +
    ".sbk .sc{display:flex;justify-content:space-around;padding:4px 10px;font-size:11.5px;font-weight:800}.sbk .sc span b{color:#FFD23F}" +
    ".sbk .gr{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;padding:4px 10px 6px;flex:0 1 auto;min-height:0;align-content:start}" +
    ".sbk .gr button{min-width:0;overflow:hidden;background:#1a2656;border:1px solid #33437f;border-radius:10px;color:#EEF2FF;padding:3px 2px 4px;font:700 9.5px Archivo,system-ui;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px}" +
    ".sbk .gr button img{width:100%;height:26px;object-fit:contain}.sbk .gr button.bad{animation:sbkx .3s}.sbk .gr button.hit{background:#1e6b3e}" +
    "@keyframes sbkx{25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}" +
    ".sbk .go{display:block;width:calc(100% - 20px);margin:0 10px 8px;padding:9px;border:0;border-radius:12px;background:#E8582A;color:#fff;font:900 14px Archivo,system-ui;cursor:pointer}" +
    ".sbk .pip{position:absolute;right:8px;top:8px;height:min(34%,144px);aspect-ratio:16/10;border-radius:10px;overflow:hidden;border:2px solid #fff;box-shadow:0 4px 14px rgba(0,0,0,.55);background:#0b1638;container-type:size;z-index:2;pointer-events:none}" +
    ".sbk .pip .tr{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:0 0}" +
    ".sbk .pip .win{position:absolute;left:3%;top:24%;width:24%;height:40%;border:3px solid #c9ced8;border-radius:4px;background:linear-gradient(180deg,#ffe7a6,#f2a53a);box-shadow:inset 0 -6px 0 #8a8f99}" +
    ".sbk .pip .win:after{content:'ORDER HERE';position:absolute;left:0;right:0;top:-34%;text-align:center;font:900 9cqh Archivo,system-ui;color:#fff;text-shadow:0 1px 2px #000}" +
    ".sbk .pip .kd{position:absolute;bottom:2%;font-size:36cqh;line-height:1;transform:translateX(-50%);transition:left 1s ease-in-out}.sbk .pip .kd i{display:block;font-style:normal;animation:sbkw .32s ease-in-out infinite alternate}.sbk .pip .kd.at i{animation:none}" +
    ".sbk .pip .bub{position:absolute;bottom:100%;left:-10%;white-space:nowrap;background:#fff;color:#141a33;border-radius:8px;padding:2px 6px;font:800 8.5cqh Archivo,system-ui;opacity:0;transition:opacity .25s .9s}.sbk .pip .kd.at .bub{opacity:1}" +
    ".sbk .pip .tag{position:absolute;right:5px;bottom:4px;font:900 7.5cqh Archivo,system-ui;color:#fff;background:rgba(217,38,47,.9);border-radius:4px;padding:1px 5px}" +
    "@keyframes sbkw{to{transform:translateY(-6%)}}" +
    ".sbk .pop{position:absolute;left:0;right:0;top:24%;text-align:center;font:400 34px 'Bebas Neue',Impact,sans-serif;color:#7CFF9B;text-shadow:0 2px 0 #000;pointer-events:none;opacity:0;transition:opacity .2s}";
  document.head.appendChild(css);
  var el = document.createElement("div"); el.className = "sbk"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Jordan High kitchen");
  el.innerHTML = '<div class="hd"><b>🔧 ' + T("JORDAN HIGH KITCHEN") + '</b><span class="tm">20.0</span></div>' +
    '<div class="row"><div class="tk"><h4></h4><ol></ol></div></div><div class="st"><div class="pip" aria-hidden="true"><img class="tr" alt="" src="img/truck/side-l.webp"><div class="win"></div><span class="tag">● LIVE · ' + T("ORDER WINDOW") + '</span></div></div>' +
    '<div class="ft"><div class="sc"><span>🍔 ' + T("Served") + ' <b class="n">0</b></span><span>⚡ ' + T("Truck") + ' <b class="lv"></b></span><span>+<b class="pt">0</b></span></div>' +
    '<div class="gr"></div><button class="go" type="button">' + T("Back on the road") + ' ▶</button></div><div class="pop"></div>';
  (game.parentNode || document.body).appendChild(el);
  var $ = function (s) { return el.querySelector(s); }, grid = $(".gr"), stack = $(".st"), tk = $(".tk"), pip = $(".pip");
  Object.keys(ING).forEach(function (k) { var b = document.createElement("button"); b.type = "button"; b.dataset.k = k;
    b.innerHTML = '<img alt="" src="' + IMG + k + '.webp">' + T(ING[k]); grid.appendChild(b); });
  var pile = null, pileH = 0, on = false, t0 = 0, order = null, step = 0, served = 0, pts = 0, done = null, raf = 0, kid = "";
  function newOrder() { order = ORDERS[(Math.random() * ORDERS.length) | 0]; step = 0; kid = KIDS[(Math.random() * KIDS.length) | 0]; if (pile) pile.remove(); pile = document.createElement("div"); pile.className = "pl"; stack.appendChild(pile); pileH = 0; walkUp(); draw(); }
  // PIP: the kid whose order you're building walks up to the window and asks for it; served kids walk off with their burger
  function walkUp() { var old = pip.querySelectorAll(".kd"); old.forEach(function (k) { k.classList.remove("at"); k.querySelector(".bub").textContent = "🍔"; k.style.left = "115%"; setTimeout(function () { k.remove(); }, 1100); });
    var k = document.createElement("div"); k.className = "kd"; k.style.left = "-15%"; k.innerHTML = '<span class="bub"></span><i>' + kid + "</i>"; k.querySelector(".bub").textContent = T(order[0]) + ", " + T("please!"); pip.appendChild(k);
    void k.offsetWidth; k.style.left = "16%"; setTimeout(function () { k.classList.add("at"); }, 1000); }
  // the game box can be taller than the window on a laptop: keep the panel on the part you can actually see
  function fitView() { var box = el.parentNode.getBoundingClientRect(), top = Math.max(0, -box.top), bot = Math.min(box.height, innerHeight - box.top);
    if (bot - top < 380) { top = 0; bot = box.height; }
    el.style.top = top + "px"; el.style.bottom = (box.height - bot) + "px"; }
  function draw() {
    tk.querySelector("h4").textContent = kid + " " + T(order[0]);
    tk.querySelector("ol").innerHTML = order[1].map(function (k, i) { return '<li class="' + (i < step ? "ok" : i === step ? "nx" : "") + '">' + T(ING[k]) + "</li>"; }).join("");
    var s = window.__S.get(); $(".lv").textContent = window.SB_LIVES ? SB_LIVES.str(s.lives) : s.lives; $(".n").textContent = served; $(".pt").textContent = pts;
  }
  // tight stack: every layer sits down into the one under it, so there's never a gap between patties
  function addLayer(k) { var W = Math.min(stack.clientWidth || 150, 340), im = new Image(), wide = /bun|patty|chicken|lettuce|cheese/.test(k) ? .92 : .82;
    im.src = IMG + k + ".webp"; im.style.width = (W * wide) + "px";
    var prev = pile.lastChild, base = prev ? parseFloat(prev.dataset.top) : 4;
    im.style.bottom = base + "px"; im.style.zIndex = pile.children.length + 1; pile.appendChild(im);
    // intrinsic ratio, not the measured box: the pile is scaled, so a measured height would feed back into the scale
    var fit = function () { var h = im.naturalWidth ? W * wide * im.naturalHeight / im.naturalWidth : W * .3, sink = /cheese|pickles|onion|tomato|lettuce|slaw/.test(k) ? .62 : /patty|chicken|bacon/.test(k) ? .5 : .45;
      im.dataset.top = base + h * (1 - sink);
      pileH = Math.max(pileH, base + h);   // whole order scaled down together, then centred, so it always sits in the middle of the box
      // never behind the PIP: centred in the room under it, or beside it (short screens), whichever gives the bigger burger
      var H = stack.clientHeight, SW = stack.clientWidth, room = H - (pip.offsetTop + pip.offsetHeight + 4), side = pip.offsetLeft - 6,
        scA = Math.min(1, (room - 8) / pileH), scB = Math.min(1, (H - 8) / pileH, side / (W * .92)), sc = Math.max(scA, scB), dx = scB > scA ? (side - SW) / 2 : 0, rh = scB > scA ? H : room;
      pile.style.transform = "translate(" + dx + "px," + (-(rh - pileH * sc) / 2) + "px) scale(" + sc + ")"; };
    if (im.complete) fit(); else im.onload = fit; im.dataset.top = base + W * .12; }
  function pop(txt) { var p = $(".pop"); p.textContent = txt; p.style.opacity = 1; setTimeout(function () { p.style.opacity = 0; }, 650); }
  grid.addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b || !on) return;
    var k = b.dataset.k;
    if (k !== order[1][step]) { b.classList.remove("bad"); void b.offsetWidth; b.classList.add("bad"); t0 -= 600; return; }   // wrong one costs 0.6 s
    b.classList.add("hit"); setTimeout(function () { b.classList.remove("hit"); }, 150);
    addLayer(k); step++;
    if (step >= order[1].length) { var s = window.__S.get(); served++; pts += 75; s.score += 75;
      var L = window.SB_LIVES, mx = L ? L.max() : 5, fixed = s.lives < mx; if (fixed) { s.lives = Math.min(mx, s.lives + 1); s.dmg = L ? L.dmg(s.lives) : 0; if (s.dmg < 2) s.cracks = []; if (!s.dmg) s.flames = []; }
      pop(fixed ? T("🔧 Truck repaired! +1 life") : "+75 " + T("Fed a Panther")); draw(); setTimeout(function () { if (on) newOrder(); }, 420); }
    else draw(); });
  function tick() { if (!on) return; fitView(); var left = Math.max(0, TIME - (performance.now() - t0)); $(".tm").textContent = (left / 1000).toFixed(1);
    if (left <= 0) return close(); raf = requestAnimationFrame(tick); }
  function close() { if (!on) return; on = false; cancelAnimationFrame(raf); el.classList.remove("on"); var d = done; done = null; if (d) d(served); }
  $(".go").addEventListener("click", close);
  window.SB_KITCHEN = { open: function (cb, ms) { if (on) return; on = true; done = cb; TIME = ms || 20000; served = 0; pts = 0; t0 = performance.now(); el.classList.add("on"); var bx = el.parentNode.getBoundingClientRect(); if (Math.min(bx.bottom, innerHeight) - Math.max(bx.top, 0) < 380) el.parentNode.scrollIntoView({ block: "start" }); fitView(); pip.querySelectorAll(".kd").forEach(function (k) { k.remove(); }); newOrder(); tick(); },
    get on() { return on; }, close: close };
})();
