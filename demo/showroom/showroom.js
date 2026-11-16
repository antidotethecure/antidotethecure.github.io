/* Clothing showroom sample: the floor of dressed mannequins, collection cards that light up, the mix-and-match fitting room (3D in fit.js).
   No storage, no network calls beyond this folder's own images/models. */
(function () {
  "use strict";
  var root = document.documentElement;
  var calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

  var CATS = [["all", "All"], ["crystal", "Crystal"], ["print", "Prints"], ["denim", "Denim"]];
  var ITEMS = [
    { id: "rh_white", cat: "crystal", name: "Crystal Key Shirt", tone: "White", desc: "A crystal and stud key pattern across the whole body, with a matching band at the collar and cuffs." },
    { id: "rh_black", cat: "crystal", name: "Crystal Key Shirt", tone: "Black", desc: "The same crystal key pattern on black, with the band repeated at the collar and cuffs." },
    { id: "pr_navy", cat: "print", name: "Painted Print Shirt", tone: "Midnight", desc: "A deep navy ground with rust and cream brushwork from edge to edge." },
    { id: "pr_cream", cat: "print", name: "Marble Print Shirt", tone: "Ivory", desc: "An ivory ground veined in navy, grey and gold, finished with dark gold-rimmed buttons." },
    { id: "pr_sage", cat: "print", name: "Painted Print Shirt", tone: "Sage", desc: "A soft sage ground with olive and cream brushwork." },
    { id: "pr_blue", cat: "print", name: "Painted Print Shirt", tone: "Sky", desc: "A pale blue ground with navy and grey brushwork." },
    { id: "vdm07", cat: "denim", name: "Classic Boot Cut", tone: "Dark Indigo", desc: "Dark indigo denim with chevron embroidery on both back pockets and a leather patch at the waist." },
    { id: "bc_blue", cat: "denim", name: "Stitched Boot Cut", tone: "Faded Blue", desc: "A mid-blue fade with heavy white contrast stitching and chevron embroidery on the back pockets." },
    { id: "bc_black", cat: "denim", name: "Stitched Boot Cut", tone: "Black", desc: "Black denim with the chevron pockets stitched in grey." },
    { id: "bc_ice", cat: "denim", name: "Stitched Boot Cut", tone: "Ice Wash", desc: "Ice wash denim with the chevron pockets stitched in dark thread." }
  ];
  /* shortcut: sample size run and no prices; put real sizes here and a price (a number, in dollars) on each item for a real store */
  var SIZES = {   // [label, how much wider the mannequin stands than at the middle size]
    top: [["S", 0.96], ["M", 1], ["L", 1.04], ["XL", 1.08], ["2XL", 1.12], ["3XL", 1.16]],
    bottom: [["28", 0.94], ["30", 0.97], ["32", 1], ["34", 1.03], ["36", 1.06], ["38", 1.09], ["40", 1.12], ["42", 1.15]]
  };
  var KIND = { top: "Shirt", bottom: "Denim" };
  /* one dressed mannequin per plinth of img/hall.webp: [shirt, jeans, feet x %, feet y %, height %] */
  var HALL = [
    ["rh_white", "vdm07", 17.2, 73.4, 43.6], ["pr_navy", "bc_blue", 28.7, 64.8, 23.4], ["pr_sage", "vdm07", 34.1, 60.7, 17.2], ["rh_black", "bc_blue", 37.9, 58.7, 12.2],
    ["rh_white", "bc_ice", 62.1, 58.7, 12.2], ["pr_blue", "bc_black", 65.9, 60.7, 17.2], ["pr_cream", "bc_black", 71.4, 64.8, 23.4], ["rh_black", "bc_ice", 82.7, 73.4, 43.6]
  ];
  /* shared with fit.js, the 3D fitting room, which is only fetched once somebody heads for it */
  var VZ = window.VZ = { calm: calm, look: { top: "rh_white", bottom: "vdm07" }, girth: 1 };

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; }
  function catName(c) { for (var i = 0; i < CATS.length; i++) if (CATS[i][0] === c) return CATS[i][1]; return ""; }
  function item(id) { for (var i = 0; i < ITEMS.length; i++) if (ITEMS[i].id === id) return ITEMS[i]; }
  function kind(it) { return it.cat === "denim" ? "bottom" : "top"; }
  function pic(it, cls) { var im = el("img", cls); im.src = "img/" + it.id + ".webp"; im.alt = ""; im.decoding = "async"; return im; }

  document.addEventListener("DOMContentLoaded", function () {
    var grid = $("grid"), cats = $("cats"), floor = $("floor"), hall = $("hall"), ui = {}, size = { top: "M", bottom: "32" }, booted = false;

    /* ---- fitting room: a shirt and a pair of jeans, each with its own picker, sizes and price ---- */
    function boot() {
      if (booted) return;
      booted = true;
      var s = el("script"); s.type = "module"; s.src = "fit.js?v=4"; document.head.appendChild(s);
    }
    function mark(box, attr, hit) {
      [].forEach.call(box.children, function (b) { if (hit(b)) b.setAttribute(attr, "true"); else if (attr === "aria-pressed") b.setAttribute(attr, "false"); else b.removeAttribute(attr); });
    }
    function paint() {
      var girth = 0, total = 0, priced = true, worn = [];
      ["top", "bottom"].forEach(function (k) {
        var it = item(VZ.look[k]), u = ui[k];
        u.name.textContent = it.name; u.tone.textContent = it.tone; u.desc.textContent = it.desc;
        u.price.textContent = it.price ? "$" + it.price.toFixed(2) : "Sample piece";
        priced = priced && !!it.price; total += it.price || 0;
        mark(u.rail, "aria-current", function (b) { return b.dataset.id === it.id; });
        mark(u.sizes, "aria-pressed", function (b) { return b.textContent === size[k]; });
        SIZES[k].forEach(function (s) { if (s[0] === size[k]) girth += s[1] / 2; });
        worn.push(it.name + " in " + it.tone);
      });
      VZ.girth = girth;                                                  // fit.js grows or slims the mannequin to match
      $("p-total").textContent = priced ? "Outfit total $" + total.toFixed(2) : "";
      $("p-fit").textContent = "Mannequin shown in shirt size " + size.top + " and waist " + size.bottom + ".";
      $("fit").setAttribute("aria-label", "3D mannequin wearing the " + worn.join(" with the ") + ". Drag to turn it.");
    }
    function wear(look, reset, go) {
      for (var k in look) VZ.look[k] = look[k];
      paint();
      if (VZ.fit) VZ.fit.show(reset); else boot();
      if (go) $("fitting-room").scrollIntoView({ behavior: calm ? "auto" : "smooth" });
    }
    function one(it) { var look = {}; look[kind(it)] = it.id; return look; }

    ["top", "bottom"].forEach(function (k) {
      var box = el("div", "piece"), head = el("p", "what"), u = ui[k] = { name: el("span", "name"), tone: el("span", "tone"), desc: el("p", "desc"), price: el("p", "price"), rail: el("div", "rail " + k), sizes: el("div", "sizes") };
      head.appendChild(u.name); head.appendChild(u.tone);
      u.rail.setAttribute("role", "group"); u.rail.setAttribute("aria-label", "Choose the " + KIND[k].toLowerCase());
      u.sizes.setAttribute("role", "group"); u.sizes.setAttribute("aria-label", KIND[k] + " size");
      SIZES[k].forEach(function (s) {
        var b = el("button", "", s[0]); b.type = "button";
        b.addEventListener("click", function () { size[k] = s[0]; paint(); });
        u.sizes.appendChild(b);
      });
      [el("p", "cat", KIND[k]), head, u.price, u.desc, u.rail, u.sizes].forEach(function (n) { box.appendChild(n); });
      $("pieces").appendChild(box);
    });

    /* ---- collection ---- */
    ITEMS.forEach(function (it) {
      var li = el("li"), b = el("button", "card"), n = el("span", "niche"), im = pic(it, "fig"), m = el("span", "meta");
      b.type = "button"; im.loading = "lazy";
      im.alt = it.name + " in " + it.tone + " on a display mannequin";
      n.appendChild(el("span", "beam")); n.appendChild(im);   // the light falls on the wall and plinth behind the mannequin
      m.appendChild(el("span", "cat", catName(it.cat))); m.appendChild(el("span", "name", it.name)); m.appendChild(el("span", "tone", it.tone));
      b.appendChild(n); b.appendChild(m); li.appendChild(b); li.dataset.cat = it.cat; grid.appendChild(li);
      b.addEventListener("click", function () { wear(one(it), true, true); });

      var t = el("button"); t.type = "button"; t.dataset.id = it.id; t.setAttribute("aria-label", it.name + ", " + it.tone); t.appendChild(pic(it));
      t.addEventListener("click", function () { wear(one(it), false, false); }); ui[kind(it)].rail.appendChild(t);
    });
    paint();

    CATS.forEach(function (c, i) {
      var b = el("button", "", c[1]); b.type = "button"; b.setAttribute("aria-pressed", i === 0 ? "true" : "false");
      b.addEventListener("click", function () {
        [].forEach.call(cats.children, function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        [].forEach.call(grid.children, function (li) { li.hidden = c[0] !== "all" && li.dataset.cat !== c[0]; });
      });
      cats.appendChild(b);
    });

    /* ---- the floor: a dressed mannequin on every plinth; picking one takes that outfit to the fitting room ---- */
    HALL.forEach(function (h) {
      var b = el("button", "man"), im = el("img"), t = item(h[0]), j = item(h[1]);
      b.type = "button"; b.style.left = h[2] + "%"; b.style.top = (h[3] - h[4]) + "%"; b.style.height = h[4] + "%";
      im.src = "img/on-" + h[0] + "-" + h[1] + ".webp"; im.decoding = "async";
      im.alt = t.name + " in " + t.tone + " with " + j.name + " in " + j.tone + ". Try this outfit on.";
      b.appendChild(im); hall.appendChild(b);
      b.addEventListener("click", function () { wear({ top: h[0], bottom: h[1] }, true, true); });
    });
    /* narrow screens walk the floor sideways */
    var strip = matchMedia("(max-aspect-ratio: 13/10)");
    if (strip.addEventListener) strip.addEventListener("change", function () { floor.scrollLeft = 0; });
    if (strip.matches) floor.scrollLeft = (floor.scrollWidth - floor.clientWidth) / 2;   // start in front of the doors, facing the sign   // back on a wide screen the floor is fixed again

    if ("IntersectionObserver" in window) {
      /* phones have no hover: the light comes up on whatever is in the middle of the screen */
      if (matchMedia("(hover: none)").matches) {
        var lamp = new IntersectionObserver(function (es) {
          es.forEach(function (e) { e.target.classList.toggle("lit", e.isIntersecting); });
        }, { rootMargin: "-36% 0px -36% 0px" });
        [].forEach.call(grid.querySelectorAll(".card"), function (c) { lamp.observe(c); });
        var spot = new IntersectionObserver(function (es) {
          es.forEach(function (e) { e.target.classList.toggle("lit", e.isIntersecting); });
        }, { root: floor, rootMargin: "0px -28% 0px -28%" });
        [].forEach.call(hall.querySelectorAll(".man"), function (m) { spot.observe(m); });
      }
      var near = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { boot(); near.disconnect(); } }, { rootMargin: "500px" });
      near.observe($("fitting-room"));
    } else boot();
  });
})();
