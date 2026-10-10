/* Second Shift AI — food physics for stacked dishes. Loaded automatically by builder.js and menu3d.js.
   STACKFX.wrap(img)                → a .sfx box around the layer image (effects live inside it)
   STACKFX.land(box, id, below)     → call when a layer lands. box = its .sfx, below = the .sfx boxes under it, nearest first.
   - every layer lands like a rag doll: it squashes, tips and settles, and the layers underneath give and jiggle
     (heavy meat pushes harder than lettuce)
   - meat keeps steaming; cheese slowly melts and drips down over whatever it sits on
   - lettuce, tomato, pickles, onion and slaw throw a little splash and keep fresh water beads that glint */
window.STACKFX = window.STACKFX || (function () {
  "use strict";
  var RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var css = [
    ".sfx{position:relative;width:100%;height:100%;transform-origin:50% 92%}",
    ".sfx>img{display:block;width:100%;height:100%;transform-origin:50% 30%}",
    ".sfx-steam{position:absolute;left:0;right:0;top:0;height:0;pointer-events:none}",
    ".sfx-steam i{position:absolute;bottom:0;width:14%;height:120%;min-height:46px;border-radius:50%;background:linear-gradient(to top,rgba(255,255,255,.5),rgba(255,255,255,0));filter:blur(7px);opacity:0;animation:sfx-st 2.6s ease-in infinite}",
    ".sfx-drip{position:absolute;top:58%;width:7%;border-radius:0 0 50% 50%/0 0 70% 70%;background:linear-gradient(90deg,var(--c1),var(--c2) 45%,var(--c1));box-shadow:inset 2px 0 2px rgba(255,255,255,.45);height:0;transform-origin:50% 0;pointer-events:none}",
    ".sfx-dew{position:absolute;inset:0;pointer-events:none}",
    ".sfx-dew i{position:absolute;width:5px;height:5px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff 0 22%,rgba(255,255,255,.55) 35%,rgba(210,240,255,.25) 60%,transparent 72%);box-shadow:0 1px 1px rgba(0,0,0,.25);animation:sfx-tw 2.2s ease-in-out infinite}",
    ".sfx-sp{position:absolute;width:5px;height:7px;border-radius:50% 50% 50% 50%/60% 60% 40% 40%;background:radial-gradient(circle at 35% 30%,#fff,rgba(190,230,255,.7) 45%,rgba(160,210,240,.2));pointer-events:none}",
    "@keyframes sfx-st{0%{opacity:0;transform:translateY(10px) scaleX(.6)}25%{opacity:.85}100%{opacity:0;transform:translateY(-80px) scaleX(1.7) rotate(8deg)}}",
    "@keyframes sfx-tw{0%,100%{opacity:.55;transform:scale(.85)}50%{opacity:1;transform:scale(1.15)}}"
  ].join("");
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  function kind(id) {
    if (/patty|beef|turkey|chicken|steak|bacon/.test(id)) return "meat";
    if (/cheese|swiss|cheddar|pepperjack/.test(id)) return "cheese";
    if (/lettuce|tomato|pickle|onion(?!_straw)|slaw|jalapeno|avocado|cucumber/.test(id)) return "fresh";
    return "other";
  }
  var WEIGHT = { meat: 1, cheese: .55, fresh: .45, other: .7 };
  function wrap(img) { var b = document.createElement("div"); b.className = "sfx"; b.appendChild(img); return b; }
  function rnd(a, b) { return a + Math.random() * (b - a); }

  function land(box, id, below) {
    if (!box) return;
    var k = kind(id), wt = WEIGHT[k], dir = Math.random() < .5 ? -1 : 1, rot = (k === "fresh" ? 7 : k === "meat" ? 3.5 : 5) * dir;
    if (!RM && box.animate) {
      // rag-doll landing: squash on impact, tip one way, rock back, settle
      box.animate([
        { transform: "rotate(" + rot + "deg) scale(.96,1.06)" },
        { transform: "rotate(" + (-rot * .45) + "deg) scale(" + (1 + .1 * wt) + "," + (1 - .16 * wt) + ")", offset: .22 },
        { transform: "rotate(" + (rot * .25) + "deg) scale(.98,1.04)", offset: .48 },
        { transform: "rotate(" + (-rot * .1) + "deg) scale(1.01,.99)", offset: .74 },
        { transform: "none" }], { duration: 760, easing: "ease-out" });
      // the layers underneath take the hit and jiggle
      (below || []).slice(0, 3).forEach(function (u, j) {
        var f = wt * (1 - j * .38);
        u.animate([{ transform: "none" }, { transform: "translateY(" + 3 * f + "px) scale(" + (1 + .06 * f) + "," + (1 - .1 * f) + ")", offset: .2 },
          { transform: "translateY(" + (-1 * f) + "px) scale(" + (1 - .025 * f) + "," + (1 + .04 * f) + ")", offset: .45 },
          { transform: "scale(" + (1 + .01 * f) + "," + (1 - .015 * f) + ")", offset: .7 }, { transform: "none" }], { duration: 620, delay: 40 + j * 50, easing: "ease-out" });
      });
    }
    if (k === "meat" && !/bacon/.test(id)) steam(box);
    if (k === "cheese") melt(box, id);
    if (k === "fresh") { splash(box, id); dew(box, id); }
  }

  function steam(box) {
    if (box.querySelector(".sfx-steam")) return;
    var s = document.createElement("div"); s.className = "sfx-steam";
    [12, 30, 50, 68, 84].forEach(function (x, i) { var w = document.createElement("i"); w.style.left = x + "%"; w.style.animationDelay = (i * .5 + rnd(0, .4)) + "s"; s.appendChild(w); });
    box.appendChild(s);
  }

  function melt(box, id) {
    var img = box.querySelector("img"), swiss = /swiss/.test(id), c1 = swiss ? "#EAD58C" : "#F0A21C", c2 = swiss ? "#FFF3C4" : "#FFC94A";
    if (!RM && img.animate) img.animate([{ transform: "none" }, { transform: "scale(1.03,1.16) translateY(2%)" }], { duration: 2600, delay: 350, easing: "cubic-bezier(.3,.1,.3,1)", fill: "forwards" });
    [[14, 9], [33, 6], [70, 11], [86, 7]].forEach(function (d, i) {
      var e = document.createElement("div"); e.className = "sfx-drip"; e.style.left = d[0] + "%"; e.style.setProperty("--c1", c1); e.style.setProperty("--c2", c2); box.appendChild(e);
      var h = d[1] + rnd(0, 6);
      if (RM || !e.animate) { e.style.height = h + "%"; return; }
      e.animate([{ height: "0%" }, { height: h * .6 + "%", offset: .5 }, { height: h + "%" }], { duration: 2400 + i * 500, delay: 600 + i * 260, easing: "ease-in", fill: "forwards" });
    });
  }

  function splash(box, id) {
    if (RM || !box.animate) return;
    var tom = /tomato/.test(id);
    for (var i = 0; i < 9; i++) {
      var d = document.createElement("i"); d.className = "sfx-sp"; d.style.left = rnd(25, 75) + "%"; d.style.top = rnd(25, 50) + "%";
      if (tom) d.style.background = "radial-gradient(circle at 35% 30%,#fff,rgba(255,120,110,.75) 45%,rgba(220,40,30,.25))";
      box.appendChild(d);
      var dx = rnd(-70, 70), up = rnd(18, 46);
      d.animate([{ transform: "translate(0,0) scale(.6)", opacity: 1 }, { transform: "translate(" + dx * .55 + "px," + -up + "px) scale(1)", opacity: 1, offset: .45 },
        { transform: "translate(" + dx + "px," + up * .5 + "px) scale(.7)", opacity: 0 }], { duration: rnd(520, 760), easing: "cubic-bezier(.2,.6,.5,1)" }).onfinish = (function (n) { return function () { n.remove(); }; })(d);
    }
  }

  function dew(box, id) {
    if (box.querySelector(".sfx-dew")) return;
    var w = document.createElement("div"), n = /lettuce|slaw/.test(id) ? 12 : /tomato/.test(id) ? 9 : 6; w.className = "sfx-dew";
    for (var i = 0; i < n; i++) {
      var d = document.createElement("i"), s = rnd(3, 7); d.style.left = rnd(12, 86) + "%"; d.style.top = rnd(10, 58) + "%"; d.style.width = s + "px"; d.style.height = s * rnd(1, 1.25) + "px";
      d.style.animationDelay = rnd(0, 2.2) + "s"; w.appendChild(d);
    }
    box.appendChild(w);
  }

  // a layer placed without a drop (page load, removing a topping): just the lasting effects, already settled
  function settle(box, id) {
    if (!box || !box.classList || !box.classList.contains("sfx")) return; var k = kind(id);
    if (k === "meat" && !/bacon/.test(id)) steam(box);
    if (k === "fresh") dew(box, id);
    if (k === "cheese") { var keep = RM; RM = true; melt(box, id); RM = keep; box.querySelector("img").style.transform = "scale(1.03,1.16) translateY(2%)"; }
  }

  return { wrap: wrap, land: land, settle: settle, kind: kind };
})();
