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
    pickles: "Pickles", pickles_crinkle: "Crinkle pickles", bacon: "Bacon", onion_straws: "Onion straws", chicken: "Chicken" };
  var ORDERS = [
    ["Classic StormBurger", ["bun_bottom", "patty", "cheese", "pickles", "onion", "tomato", "lettuce", "bun_top"]],
    ["Kids Burger", ["bun_bottom", "patty", "cheese", "bun_top"]],
    ["Bacon BBQ Burger", ["bun_bottom", "patty", "cheese", "bacon", "onion_straws", "bun_top"]],
    ["Chicken Sandwich", ["bun_bottom", "pickles_crinkle", "chicken", "bun_top"]],
    ["Turkey Burger", ["bun_bottom", "onion", "patty", "cheese", "tomato", "lettuce", "bun_top"]],
    ["Double Classic", ["bun_bottom", "patty", "cheese", "patty", "cheese", "bun_top"]]];
  var KIDS = ["🧑🏾", "👦🏽", "👧🏿", "🧒🏻", "👩🏾", "👦🏿"];
  var css = document.createElement("style");
  css.textContent = ".sbk{position:absolute;inset:0;z-index:8;display:none;flex-direction:column;border-radius:12px;overflow:hidden;background:linear-gradient(180deg,rgba(10,18,52,.94),rgba(5,8,26,.97));color:#EEF2FF;font:600 13px Archivo,system-ui,sans-serif;touch-action:manipulation;user-select:none}" +
    ".sbk.on{display:flex}.sbk .hd{display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:#1f46b8;font-weight:900}.sbk .hd b{font:400 20px 'Bebas Neue',Impact,sans-serif;letter-spacing:.04em}" +
    ".sbk .tm{font:900 18px ui-monospace,Menlo,monospace;color:#FFD23F}.sbk .row{display:flex;gap:8px;padding:8px 10px 0}.sbk .tk{flex:1;background:#fff;color:#141a33;border-radius:10px;padding:7px 9px}" +
    ".sbk .tk h4{margin:0 0 4px;font:900 14px Archivo,system-ui}.sbk .tk ol{margin:0;padding-left:18px;font-size:11.5px;line-height:1.45}.sbk .tk li.ok{color:#1e9a52;text-decoration:line-through}.sbk .tk li.nx{font-weight:900;color:#d9262f}" +
    ".sbk .st{position:relative;width:46%;min-height:150px}.sbk .st img{position:absolute;left:50%;transform:translateX(-50%);filter:drop-shadow(0 3px 3px rgba(0,0,0,.45));transition:bottom .12s}" +
    ".sbk .sc{display:flex;justify-content:space-around;padding:6px 10px;font-weight:800}.sbk .sc span b{color:#FFD23F}" +
    ".sbk .gr{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding:4px 10px 6px;flex:1;align-content:start}" +
    ".sbk .gr button{background:#1a2656;border:1px solid #33437f;border-radius:10px;color:#EEF2FF;padding:3px 2px 4px;font:700 10px Archivo,system-ui;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px}" +
    ".sbk .gr button img{width:100%;height:34px;object-fit:contain}.sbk .gr button.bad{animation:sbkx .3s}.sbk .gr button.hit{background:#1e6b3e}" +
    "@keyframes sbkx{25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}" +
    ".sbk .go{margin:0 10px 10px;padding:11px;border:0;border-radius:12px;background:#E8582A;color:#fff;font:900 15px Archivo,system-ui;cursor:pointer}" +
    ".sbk .pop{position:absolute;left:0;right:0;top:42%;text-align:center;font:400 34px 'Bebas Neue',Impact,sans-serif;color:#7CFF9B;text-shadow:0 2px 0 #000;pointer-events:none;opacity:0;transition:opacity .2s}";
  document.head.appendChild(css);
  var el = document.createElement("div"); el.className = "sbk"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Jordan High kitchen");
  el.innerHTML = '<div class="hd"><b>🔧 ' + T("JORDAN HIGH KITCHEN") + '</b><span class="tm">20.0</span></div>' +
    '<div class="row"><div class="tk"><h4></h4><ol></ol></div><div class="st"></div></div>' +
    '<div class="sc"><span>🍔 ' + T("Served") + ' <b class="n">0</b></span><span>⚡ ' + T("Truck") + ' <b class="lv"></b></span><span>+<b class="pt">0</b></span></div>' +
    '<div class="gr"></div><button class="go" type="button">' + T("Back on the road") + ' ▶</button><div class="pop"></div>';
  (game.parentNode || document.body).appendChild(el);
  var $ = function (s) { return el.querySelector(s); }, grid = $(".gr"), stack = $(".st"), tk = $(".tk");
  Object.keys(ING).forEach(function (k) { var b = document.createElement("button"); b.type = "button"; b.dataset.k = k;
    b.innerHTML = '<img alt="" src="' + IMG + k + '.webp">' + T(ING[k]); grid.appendChild(b); });
  var on = false, t0 = 0, order = null, step = 0, served = 0, pts = 0, done = null, raf = 0, kid = "";
  function newOrder() { order = ORDERS[(Math.random() * ORDERS.length) | 0]; step = 0; kid = KIDS[(Math.random() * KIDS.length) | 0]; stack.innerHTML = ""; draw(); }
  function draw() {
    tk.querySelector("h4").textContent = kid + " " + T(order[0]);
    tk.querySelector("ol").innerHTML = order[1].map(function (k, i) { return '<li class="' + (i < step ? "ok" : i === step ? "nx" : "") + '">' + T(ING[k]) + "</li>"; }).join("");
    var s = window.__S.get(); $(".lv").textContent = window.SB_LIVES ? SB_LIVES.str(s.lives) : s.lives; $(".n").textContent = served; $(".pt").textContent = pts;
  }
  // tight stack: every layer sits down into the one under it, so there's never a gap between patties
  function addLayer(k) { var W = stack.clientWidth || 150, im = new Image(), wide = /bun|patty|chicken|lettuce|cheese/.test(k) ? .92 : .82;
    im.src = IMG + k + ".webp"; im.style.width = (W * wide) + "px";
    var prev = stack.lastChild, base = prev ? parseFloat(prev.dataset.top) : 4;
    im.style.bottom = base + "px"; im.style.zIndex = stack.children.length + 1; stack.appendChild(im);
    var fit = function () { var h = im.getBoundingClientRect().height || W * .3, sink = /cheese|pickles|onion|tomato|lettuce/.test(k) ? .62 : /patty|chicken|bacon/.test(k) ? .5 : .45;
      im.dataset.top = base + h * (1 - sink); };
    if (im.complete) fit(); else im.onload = fit; im.dataset.top = base + W * .12; }
  function pop(txt) { var p = $(".pop"); p.textContent = txt; p.style.opacity = 1; setTimeout(function () { p.style.opacity = 0; }, 650); }
  grid.addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b || !on) return;
    var k = b.dataset.k;
    if (k !== order[1][step]) { b.classList.remove("bad"); void b.offsetWidth; b.classList.add("bad"); t0 -= 600; if (navigator.vibrate) try { navigator.vibrate(30); } catch (x) {} return; }   // wrong one costs 0.6 s
    b.classList.add("hit"); setTimeout(function () { b.classList.remove("hit"); }, 150);
    addLayer(k); step++;
    if (step >= order[1].length) { var s = window.__S.get(); served++; pts += 75; s.score += 75;
      var L = window.SB_LIVES, mx = L ? L.max() : 5, fixed = s.lives < mx; if (fixed) { s.lives = Math.min(mx, s.lives + 1); s.dmg = L ? L.dmg(s.lives) : 0; if (s.dmg < 2) s.cracks = []; if (!s.dmg) s.flames = []; }
      pop(fixed ? T("🔧 Truck repaired! +1 life") : "+75 " + T("Fed a Panther")); draw(); setTimeout(function () { if (on) newOrder(); }, 420); }
    else draw(); });
  function tick() { if (!on) return; var left = Math.max(0, TIME - (performance.now() - t0)); $(".tm").textContent = (left / 1000).toFixed(1);
    if (left <= 0) return close(); raf = requestAnimationFrame(tick); }
  function close() { if (!on) return; on = false; cancelAnimationFrame(raf); el.classList.remove("on"); var d = done; done = null; if (d) d(served); }
  $(".go").addEventListener("click", close);
  window.SB_KITCHEN = { open: function (cb) { if (on) return; on = true; done = cb; served = 0; pts = 0; t0 = performance.now(); newOrder(); el.classList.add("on"); tick(); },
    get on() { return on; }, close: close };
})();
