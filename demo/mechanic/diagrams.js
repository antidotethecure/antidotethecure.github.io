/* SousShift AI — Mobile Mechanic demo: exploded-view diagrams.
   Data: diagrams/diagrams.json. Each entry is an AI illustration (never a factory diagram).
   Specs shown next to it come from the U.S. EPA / DOE fueleconomy.gov API, never from the picture.
   Exposes window.DIAG = { load, match, specs, GROUPS, groupFor, Viewer }. */
(function () {
  "use strict";
  var W = window, D = document;
  var BASE = "diagrams/", DATA = null, LOADING = null;

  function nrm(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]/g, ""); }

  function load() {
    if (DATA) return Promise.resolve(DATA);
    if (LOADING) return LOADING;
    LOADING = fetch(BASE + "diagrams.json?v=" + (W.DIAG_V || "1"), { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (j) { DATA = (j && j.diagrams) || []; return DATA; })
      .catch(function () { DATA = []; return DATA; });
    return LOADING;
  }

  /* make + model match (aliases allowed). Year outside the range still matches, flagged. */
  function match(car) {
    if (!DATA || !car || !car.make || !car.model) return null;
    var mk = nrm(car.make), md = nrm(car.model), y = +car.year || 0;
    var hits = DATA.filter(function (d) {
      if (nrm(d.make) !== mk) return false;
      return [d.model].concat(d.aliases || []).some(function (m) { return nrm(m) === md; });
    });
    if (!hits.length) return null;
    var inRange = hits.filter(function (d) { return !y || (y >= d.years[0] && y <= d.years[1]); });
    var d = inRange[0] || hits[0];
    return { d: d, yearOk: !y || (y >= d.years[0] && y <= d.years[1]) };
  }

  /* ---------- verified specs: fueleconomy.gov (CORS: *) ---------- */
  var FE = "https://www.fueleconomy.gov/ws/rest/vehicle/", cache = {};
  function feGet(path) {
    return fetch(FE + path, { headers: { Accept: "application/json" } }).then(function (r) { if (!r.ok) throw 0; return r.text(); })
      .then(function (s) { return s && s !== "null" ? JSON.parse(s) : null; });
  }
  function items(j) { var m = j && j.menuItem; return !m ? [] : Array.isArray(m) ? m : [m]; }
  function titleMake(m) { return String(m || "").toLowerCase().replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); }); }
  function feUrl(y, make, model) { return "https://www.fueleconomy.gov/feg/bymodel/" + y + "_" + encodeURIComponent(titleMake(make)).replace(/%20/g, "_") + "_" + encodeURIComponent(model).replace(/%20/g, "_") + ".shtml"; }
  function line(v, x) {
    var ev = x.atvType === "EV" || x.fuelType1 === "Electricity", bits = [];
    if (ev) {
      if (+x.range) bits.push({ k: "range", v: x.range });
      if (+x.comb08) bits.push({ k: "mpge", v: x.comb08 });
    } else {
      if (+x.displ) bits.push({ k: "eng", v: (+x.displ).toFixed(1) + "L" + (+x.cylinders ? " " + x.cylinders + "-cyl" : "") });
      if (x.atvType === "Hybrid") bits.push({ k: "hybrid" });
      if (+x.comb08) bits.push({ k: "mpg", v: x.comb08, c: x.city08, h: x.highway08 });
    }
    if (x.drive) bits.push({ k: "drive", v: x.drive });
    if (x.trany) bits.push({ k: "trans", v: x.trany.replace(/^Automatic/, "Auto").replace(/^Manual/, "Manual") });
    return { name: v, ev: ev, bits: bits };
  }
  /* Up to 4 variants of year+make+model, one representative config each. */
  function specs(year, make, model) {
    var y = +year, k = [y, nrm(make), nrm(model)].join("|");
    if (!y || !make || !model) return Promise.resolve(null);
    if (cache[k]) return cache[k];
    var mk = titleMake(make), want = nrm(model);
    cache[k] = feGet("menu/model?year=" + y + "&make=" + encodeURIComponent(mk)).then(function (j) {
      var vs = items(j).map(function (m) { return m.value; }).filter(function (v) {
        var n = nrm(v); if (n.indexOf(want) !== 0) return false;
        /* the next char after the model name must start a new word ("Model Y AWD" ok, "Model YZ" not) */
        var raw = String(v).toLowerCase(), i = 0, seen = 0;
        while (i < raw.length && seen < want.length) { if (/[a-z0-9]/.test(raw[i])) seen++; i++; }
        return i >= raw.length || !/[a-z0-9]/.test(raw[i]);
      });
      /* most common first: plain trims before AWD/4WD/hybrid/plug-in/performance variants, shorter names first */
      var odd = function (v) { return (/hybrid|plug-in|phev|awd|4wd|performance|ffv|cng/i.test(v) ? 1 : 0); };
      vs.sort(function (a, b) { return odd(a) - odd(b) || a.length - b.length || (a < b ? -1 : 1); });
      vs = vs.slice(0, 4);
      return Promise.all(vs.map(function (v) {
        return feGet("menu/options?year=" + y + "&make=" + encodeURIComponent(mk) + "&model=" + encodeURIComponent(v)).then(function (o) {
          var id = items(o)[0]; if (!id) return null;
          return feGet(id.value).then(function (x) { return x ? line(v, x) : null; });
        }).catch(function () { return null; });
      })).then(function (rows) {
        rows = rows.filter(Boolean);
        return { year: y, rows: rows, url: rows.length ? feUrl(y, make, model) : "https://www.fueleconomy.gov/feg/findacar.shtml" };
      });
    }).catch(function () { delete cache[k]; return { err: 1 }; });
    return cache[k];
  }

  /* ---------- part groups -> the app's existing services (config.js ids) ---------- */
  var GROUPS = {
    hood:     { svc: "body", opt: "hood", icon: "🚘", label: { en: "Hood", es: "Cofre" } },
    fenders:  { svc: "body", icon: "🚘", label: { en: "Fenders & body panels", es: "Salpicaderas y carrocería" } },
    bumperF:  { svc: "body", opt: "bumperF", icon: "🚘", label: { en: "Front bumper", es: "Defensa delantera" } },
    bumperR:  { svc: "body", opt: "bumperR", icon: "🚘", label: { en: "Rear bumper", es: "Defensa trasera" } },
    lights:   { svc: "lights", icon: "💡", label: { en: "Headlights", es: "Faros" } },
    tail:     { svc: "tail", icon: "🔴", label: { en: "Taillights", es: "Calaveras" } },
    motor:    { svc: "engine", icon: "⚙️", label: { en: "Engine", es: "Motor" },
                ev: { svc: "diag", opt: "deep", icon: "⚡", label: { en: "Electric motor", es: "Motor eléctrico" } } },
    trans:    { svc: "diag", opt: "scan", icon: "⚙️", label: { en: "Transmission", es: "Transmisión" } },
    battery:  { svc: "battery", icon: "🔋", label: { en: "Battery", es: "Batería" },
                ev: { svc: "diag", opt: "deep", icon: "🔋", label: { en: "High-voltage battery", es: "Batería de alto voltaje" } } },
    fuel:     { svc: "diag", opt: "evap", icon: "⛽", label: { en: "Fuel tank / EVAP", es: "Tanque / EVAP" } },
    exhaust:  { svc: "exhaust", icon: "💨", label: { en: "Exhaust", es: "Escape" } },
    suspF:    { svc: "susp", pos: "F", icon: "🧲", label: { en: "Front suspension", es: "Suspensión delantera" } },
    suspR:    { svc: "susp", pos: "R", icon: "🧲", label: { en: "Rear suspension", es: "Suspensión trasera" } },
    brakesF:  { svc: "brakes", pos: "F", icon: "🛑", label: { en: "Front brakes", es: "Frenos delanteros" } },
    brakesR:  { svc: "brakes", pos: "R", icon: "🛑", label: { en: "Rear brakes", es: "Frenos traseros" } },
    wheels:   { svc: "tires", icon: "🛞", label: { en: "Wheels & tires", es: "Rines y llantas" } },
    interior: { svc: "detail", opt: "int", icon: "💺", label: { en: "Interior & seats", es: "Interior y asientos" } },
    dash:     { svc: "diag", opt: "scan", icon: "🖥️", label: { en: "Dashboard & controls", es: "Tablero y controles" } },
    doors:    { svc: "doors", icon: "🚪", label: { en: "Doors & windows", es: "Puertas y ventanas" } },
    hatch:    { svc: "body", icon: "🚪", label: { en: "Rear hatch / trunk", es: "Cajuela / compuerta" } },
    roof:     { svc: "tint", icon: "🕶️", label: { en: "Roof & glass", es: "Techo y vidrios" } },
    ac:       { svc: "ac", icon: "❄️", label: { en: "A/C", es: "Aire acondicionado" } }
  };
  function groupFor(g, ev) { var b = GROUPS[g]; if (!b) return null; return ev && b.ev ? Object.assign({}, b, b.ev) : b; }

  /* ---------- full-screen viewer: pinch-zoom + pan + hotspots ---------- */
  function Viewer(opts) {
    var ov = D.createElement("div");
    ov.className = "dv"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-hidden", "true");
    ov.innerHTML = '<div class="dvbar"><b class="dvt"></b><button type="button" class="dvhs" aria-pressed="true"></button><button type="button" class="x dvx">✕</button></div>' +
      '<div class="dvstage"><div class="dvin"><img alt="" draggable="false"><div class="dvspots"></div></div></div>' +
      '<p class="dvfoot"></p>';
    D.body.appendChild(ov);
    var stage = ov.querySelector(".dvstage"), inner = ov.querySelector(".dvin"), img = inner.querySelector("img"), spots = ov.querySelector(".dvspots");
    var z = 1, tx = 0, ty = 0, fw = 0, fh = 0, ptrs = {}, start = null, moved = 0, aspect = 4 / 3, lastTap = 0, prevFocus = null;

    function layout() {
      var w = stage.clientWidth, h = stage.clientHeight;
      fw = Math.min(w, h * aspect); fh = fw / aspect;
      inner.style.width = fw + "px"; inner.style.height = fh + "px";
      inner.style.left = (w - fw) / 2 + "px"; inner.style.top = (h - fh) / 2 + "px";
      clamp(); apply();
    }
    function clamp() {
      z = Math.max(1, Math.min(6, z));
      var w = stage.clientWidth, h = stage.clientHeight, sw = fw * z, sh = fh * z, ox = (w - fw) / 2, oy = (h - fh) / 2;
      /* keep the picture covering the stage when zoomed past it; centered when smaller */
      var minX = sw > w ? w - sw - ox : (w - sw) / 2 - ox, maxX = sw > w ? -ox : minX;
      var minY = sh > h ? h - sh - oy : (h - sh) / 2 - oy, maxY = sh > h ? -oy : minY;
      tx = Math.max(minX, Math.min(maxX, tx)); ty = Math.max(minY, Math.min(maxY, ty));
    }
    function apply() { inner.style.transform = "translate(" + tx + "px," + ty + "px) scale(" + z + ")"; inner.style.setProperty("--z", z); inner.classList.toggle("lbl", fw * z >= 720); }
    function zoomAt(nz, cx, cy) {
      var r = stage.getBoundingClientRect(), ox = (stage.clientWidth - fw) / 2, oy = (stage.clientHeight - fh) / 2;
      var px = cx - r.left - ox, py = cy - r.top - oy;
      nz = Math.max(1, Math.min(6, nz));
      tx = px - (px - tx) * nz / z; ty = py - (py - ty) * nz / z; z = nz; clamp(); apply();
    }
    function pts() { return Object.keys(ptrs).map(function (k) { return ptrs[k]; }); }
    function snap() {
      var p = pts();
      if (p.length >= 2) { var a = p[0], b = p[1]; start = { two: 1, d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: z, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, tx: tx, ty: ty }; }
      else if (p.length === 1) start = { two: 0, x: p[0].x, y: p[0].y, tx: tx, ty: ty };
      else start = null;
    }
    stage.addEventListener("pointerdown", function (e) {
      ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (Object.keys(ptrs).length === 1) moved = 0;
      snap();
    });
    stage.addEventListener("pointermove", function (e) {
      if (!ptrs[e.pointerId] || !start) return;
      ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
      var p = pts();
      if (start.two && p.length >= 2) {
        var a = p[0], b = p[1], d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        tx = start.tx; ty = start.ty; z = start.z;
        zoomAt(start.z * d / start.d, start.mx, start.my);
        tx += mx - start.mx; ty += my - start.my; clamp(); apply(); moved = 99;
      } else if (!start.two) {
        var dx = e.clientX - start.x, dy = e.clientY - start.y;
        moved = Math.max(moved, Math.abs(dx) + Math.abs(dy));
        tx = start.tx + dx; ty = start.ty + dy; clamp(); apply();
      }
    });
    function up(e) {
      delete ptrs[e.pointerId]; snap();
      if (!Object.keys(ptrs).length && moved < 8 && e.type === "pointerup" && !e.target.closest(".dvspot")) {
        var now = Date.now();
        if (now - lastTap < 320) { zoomAt(z > 1.4 ? 1 : 2.6, e.clientX, e.clientY); lastTap = 0; } else lastTap = now;
      }
    }
    stage.addEventListener("pointerup", up); stage.addEventListener("pointercancel", up); stage.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") up(e); });
    stage.addEventListener("wheel", function (e) { e.preventDefault(); zoomAt(z * Math.exp(-e.deltaY * 0.0022), e.clientX, e.clientY); }, { passive: false });
    spots.addEventListener("click", function (e) {
      var b = e.target.closest(".dvspot"); if (!b || moved >= 8) return;
      var g = b.getAttribute("data-g"); close(); if (opts.onPick) opts.onPick(g);
    });
    ov.querySelector(".dvx").addEventListener("click", function () { close(); });
    var hsBtn = ov.querySelector(".dvhs");
    hsBtn.addEventListener("click", function () { var on = hsBtn.getAttribute("aria-pressed") !== "true"; hsBtn.setAttribute("aria-pressed", on ? "true" : "false"); ov.classList.toggle("nohs", !on); });
    D.addEventListener("keydown", function (e) {
      if (!ov.classList.contains("on")) return;
      if (e.key === "Escape") close();
      else if (e.key === "+" || e.key === "=") { var r = stage.getBoundingClientRect(); zoomAt(z * 1.4, r.left + r.width / 2, r.top + r.height / 2); }
      else if (e.key === "-") { var r2 = stage.getBoundingClientRect(); zoomAt(z / 1.4, r2.left + r2.width / 2, r2.top + r2.height / 2); }
    });
    W.addEventListener("resize", function () { if (ov.classList.contains("on")) layout(); });

    function open(d, o) {
      prevFocus = D.activeElement;
      aspect = (d.w && d.h) ? d.w / d.h : 4 / 3; z = 1; tx = 0; ty = 0;
      ov.querySelector(".dvt").textContent = o.title;
      hsBtn.textContent = o.hsLabel; hsBtn.hidden = !(d.hotspots && d.hotspots.length);
      ov.querySelector(".dvx").setAttribute("aria-label", o.closeLabel);
      ov.setAttribute("aria-label", o.title);
      ov.querySelector(".dvfoot").textContent = o.foot;
      img.alt = o.alt;
      img.src = BASE + d.file;
      spots.innerHTML = (d.hotspots || []).map(function (h) {
        var g = groupFor(h.g, o.ev); if (!g) return "";
        return '<button type="button" class="dvspot" data-g="' + h.g + '" style="left:' + h.x + "%;top:" + h.y + '%"><i></i><span>' + o.esc(o.p(g.label)) + "</span></button>";
      }).join("");
      ov.classList.add("on"); ov.setAttribute("aria-hidden", "false"); D.documentElement.classList.add("dvlock");
      layout();
      setTimeout(function () { ov.querySelector(".dvx").focus({ preventScroll: true }); }, 40);
    }
    function close() {
      ov.classList.remove("on"); ov.setAttribute("aria-hidden", "true"); D.documentElement.classList.remove("dvlock"); ptrs = {}; start = null;
      if (prevFocus && prevFocus.focus) try { prevFocus.focus({ preventScroll: true }); } catch (e) {}
    }
    return { open: open, close: close };
  }

  W.DIAG = { load: load, match: match, specs: specs, GROUPS: GROUPS, groupFor: groupFor, Viewer: Viewer, BASE: BASE };
})();
