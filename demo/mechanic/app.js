/* SousShift AI — Mobile Mechanic demo: customer page. Needs config.js, core.js, car.js.
   No owner tools on this page (house rule). The mechanic side lives at ./shop/. */
(function () {
  "use strict";
  var M = window.MECH, C = M.C, t = M.t, p = M.p, esc = M.esc, D = document, W = window;
  var $ = function (id) { return D.getElementById(id); };
  var JKEY = "ssai:mech:job", CKEY = "ssai:mech:car", SKEY = "ssai:mech:slot", MKEY = "ssai:mech:mine", SEEN = "ssai:mech:seen", READ = "ssai:mech:read";

  /* ---------- state (this phone only) ---------- */
  var job = M.lsGet(JKEY, []); if (!Array.isArray(job)) job = [];
  var car = M.lsGet(CKEY, {}) || {};
  var slot = M.lsGet(SKEY, null);
  var mine = M.lsGet(MKEY, []); if (!Array.isArray(mine)) mine = [];
  var prefs = M.lsGet(M.PKEY, { app: true, text: false, email: false, phone: "", email_: "" }) || {};
  var view = "side", dayIdx = 0, curReq = null;
  function saveJob() { M.lsSet(JKEY, job); renderJob(); renderHotspots(); renderSvcs(); }
  function key(it) { return it.svc + "|" + it.opt + "|" + (it.pos || ""); }

  /* ---------- brand ---------- */
  function brand() {
    $("bName").textContent = C.brand.name;
    $("logo").src = C.brand.logo + (C.brand.logo.indexOf("?") < 0 ? "?v=20261013a" : "");
    $("stCity").textContent = "📍 " + C.brand.city;
    $("callBtn").href = "sms:" + C.brand.sms;
    var now = new Date(), h = C.hours[now.getDay()], mins = now.getHours() * 60 + now.getMinutes(), ob = $("openbar");
    function hm(s) { var a = s.split(":"); return +a[0] * 60 + +a[1]; }
    if (h && mins >= hm(h[0]) && mins < hm(h[1])) { ob.classList.remove("closed"); $("openTxt").textContent = t("openNow", { t: M.fTime(new Date(2024, 0, 1, 0, hm(h[1]))) }); }
    else {
      ob.classList.add("closed");
      for (var i = 0; i < 8; i++) {
        var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i), hh = C.hours[d.getDay()];
        if (hh && (i > 0 || mins < hm(hh[0]))) { $("openTxt").textContent = t("openLater", { d: i === 0 ? t("today") : i === 1 ? t("tomorrow") : d.toLocaleDateString(M.lang() === "es" ? "es-MX" : "en-US", { weekday: "short" }), t: M.fTime(new Date(2024, 0, 1, 0, hm(hh[0]))) }); break; }
      }
    }
  }

  /* ---------- services ---------- */
  function minPrice(s) { return Math.min.apply(null, s.options.map(function (o) { return M.price({ svc: s.id, opt: o.id }).lo; })); }
  function renderSvcs() {
    $("svcList").innerHTML = M.services.map(function (s) {
      var n = job.filter(function (j) { return j.svc === s.id; }).length;
      return '<button type="button" class="sv' + (n ? " in" : "") + '" data-svc="' + s.id + '"><span class="ic" aria-hidden="true">' + s.icon + "</span>" +
        (s.addon ? '<span class="tagx">' + t("addon") + "</span>" : "") +
        '<span class="add" aria-hidden="true">' + (n ? "✓" : "+") + "</span><b>" + esc(p(s.name)) + "</b><small>" + esc(p(s.desc)) + '</small><span class="fr">' + t("from", { p: M.money(Math.max(minPrice(s), 0)) }) + "</span></button>";
    }).join("");
  }
  $("svcList").addEventListener("click", function (e) { var b = e.target.closest("[data-svc]"); if (b) openSheet(b.getAttribute("data-svc"), null); });

  /* before / after sliders */
  function renderBA() {
    $("baList").innerHTML = C.beforeAfter.map(function (b, i) {
      var bf = b.before ? '<img src="' + esc(b.before) + '" alt="">' : M.art(b.art, false), af = b.after ? '<img src="' + esc(b.after) + '" alt="">' : M.art(b.art, true);
      return '<div class="ba"><div class="cmp" style="--x:50%"><div>' + bf + '</div><div class="aft">' + af + '</div><span class="hd"></span><span class="lb l">' + t("before") + '</span><span class="lb r">' + t("after") + "</span>" +
        '<input type="range" min="0" max="100" value="50" aria-label="' + esc(p(b.title)) + ": " + t("before") + " / " + t("after") + '" data-ba="' + i + '"></div>' +
        "<p>" + esc(p(b.title)) + (b.before ? "" : " <small>· " + t("baDemo") + "</small>") + "</p></div>";
    }).join("");
  }
  $("baList").addEventListener("input", function (e) { if (e.target.matches("input[type=range]")) e.target.parentNode.style.setProperty("--x", e.target.value + "%"); });

  /* ---------- your car (NHTSA vPIC) ---------- */
  var MAKES = ["ACURA", "AUDI", "BMW", "BUICK", "CADILLAC", "CHEVROLET", "CHRYSLER", "DODGE", "FIAT", "FORD", "GENESIS", "GMC", "HONDA", "HYUNDAI", "INFINITI", "JEEP", "KIA", "LEXUS", "LINCOLN", "MAZDA", "MERCEDES-BENZ", "MINI", "MITSUBISHI", "NISSAN", "RAM", "SUBARU", "TESLA", "TOYOTA", "VOLKSWAGEN", "VOLVO"];
  var API = "https://vpic.nhtsa.dot.gov/api/vehicles/", cache = {};
  function title(s) { return String(s || "").toLowerCase().replace(/(^|[\s-])\w/g, function (m) { return m.toUpperCase(); }).replace(/\bBmw\b/, "BMW").replace(/\bGmc\b/, "GMC").replace(/\bRam\b/, "RAM").replace(/\bMini\b/, "MINI"); }
  function fillYearMake() {
    var y = new Date().getFullYear() + 1, yo = '<option value="">' + t("pickYear") + "</option>";
    for (var i = y; i >= 1981; i--) yo += '<option' + (String(i) === String(car.year) ? " selected" : "") + ">" + i + "</option>";
    $("year").innerHTML = yo;
    var mk = car.make && MAKES.indexOf(car.make) < 0 && car.make !== "__other" ? MAKES.concat([car.make]).sort() : MAKES;
    $("make").innerHTML = '<option value="">' + t("pickMake") + "</option>" + mk.map(function (m) { return '<option value="' + esc(m) + '"' + (m === car.make ? " selected" : "") + ">" + esc(title(m)) + "</option>"; }).join("") +
      '<option value="__other"' + (car.make === "__other" ? " selected" : "") + ">" + t("otherMake") + "</option>";
  }
  function setModelOptions(list, sel) {
    $("model").innerHTML = '<option value="">' + t("pickModel") + "</option>" + list.map(function (m) { return '<option' + (m === sel ? " selected" : "") + ">" + esc(m) + "</option>"; }).join("");
    $("model").disabled = !list.length;
  }
  function loadModels(keepSel) {
    var y = $("year").value, mk = $("make").value;
    $("modelTxtF").hidden = mk !== "__other";
    if (mk === "__other") { setModelOptions([], ""); $("modelMsg").textContent = ""; return Promise.resolve(); }
    if (!y || !mk) { setModelOptions([], ""); $("modelMsg").textContent = ""; return Promise.resolve(); }
    var k = mk + "|" + y;
    if (cache[k]) { done(cache[k]); return Promise.resolve(); }
    $("modelMsg").textContent = t("loadingModels"); $("model").disabled = true;
    var types = ["car", "truck", "mpv"];
    return Promise.all(types.map(function (ty) {
      return fetch(API + "GetModelsForMakeYear/make/" + encodeURIComponent(mk) + "/modelyear/" + y + "/vehicletype/" + ty + "?format=json")
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (d) { return d.Results || []; }).catch(function () { return null; });
    })).then(function (res) {
      if (res.every(function (r) { return r === null; })) { $("modelMsg").textContent = t("modelsErr"); $("modelTxtF").hidden = false; setModelOptions([], ""); return; }
      var names = {}; res.forEach(function (r) { (r || []).forEach(function (m) { names[String(m.Model_Name).trim()] = 1; }); });
      cache[k] = Object.keys(names).sort(function (a, b) { return a.localeCompare(b); });
      if ($("year").value + "" === y && $("make").value === mk) done(cache[k]);
    });
    function done(list) {
      setModelOptions(list, keepSel ? car.model : "");
      $("modelMsg").textContent = list.length ? t("modelsOk", { n: list.length, y: y, m: title(mk) }) : t("modelsNone");
      $("modelTxtF").hidden = list.length > 0 && mk !== "__other";
    }
  }
  function saveCar() {
    var mk = $("make").value;
    car.year = $("year").value; car.make = mk;
    car.model = mk === "__other" || !$("model").options.length || $("model").disabled ? $("modelTxt").value.trim() : $("model").value;
    if (mk !== "__other" && !$("model").value && $("modelTxt").value.trim() && !$("modelTxtF").hidden) car.model = $("modelTxt").value.trim();
    car.miles = $("miles").value.trim(); car.problem = $("problem").value.trim(); car.vin = $("vin").value.trim().toUpperCase();
    M.lsSet(CKEY, car); badge();
  }
  function carLabel(c) {
    c = c || car; var mk = c.make === "__other" ? "" : title(c.make);
    var s = [c.year, mk, c.model].filter(Boolean).join(" ");
    return s || "";
  }
  function badge() {
    var s = carLabel(); $("carBadge").hidden = !s;
    $("carName").textContent = s;
    $("carSub").textContent = [car.trim, car.engine, car.miles ? t("milesSub", { m: car.miles }) : ""].filter(Boolean).join(" · ");
  }
  $("year").addEventListener("change", function () { car.trim = car.engine = ""; loadModels(false).then(saveCar); });
  $("make").addEventListener("change", function () { car.trim = car.engine = ""; loadModels(false).then(saveCar); });
  ["model", "modelTxt", "miles", "problem"].forEach(function (id) { $(id).addEventListener(id === "model" ? "change" : "input", saveCar); });
  $("miles").addEventListener("blur", function () { var n = parseInt($("miles").value.replace(/\D/g, ""), 10); if (n) { $("miles").value = n.toLocaleString("en-US"); saveCar(); } });
  $("vinBtn").addEventListener("click", function () {
    var v = $("vin").value.trim().toUpperCase().replace(/\s/g, "");
    $("vin").value = v;
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(v)) { $("vinMsg").textContent = t("vinBad"); return; }
    $("vinMsg").textContent = t("vinLoading"); $("vinBtn").disabled = true;
    fetch(API + "DecodeVinValues/" + v + "?format=json").then(function (r) { return r.json(); }).then(function (d) {
      var r = (d.Results || [])[0] || {};
      if (!r.Make || !r.ModelYear) throw new Error("nodecode");
      car.year = r.ModelYear; car.make = String(r.Make).toUpperCase(); car.model = r.Model || "";
      car.trim = r.Trim || ""; car.engine = r.DisplacementL ? (Math.round(parseFloat(r.DisplacementL) * 10) / 10) + "L" + (r.EngineCylinders ? " " + r.EngineCylinders + "-cyl" : "") : "";
      car.vin = v; fillYearMake();
      return loadModels(true).then(function () {
        if (car.model && $("model").options.length && ![].some.call($("model").options, function (o) { return o.value === car.model; })) {
          var o = D.createElement("option"); o.textContent = car.model; $("model").appendChild(o); $("model").disabled = false;
        }
        $("model").value = car.model; M.lsSet(CKEY, car); badge();
        $("vinMsg").textContent = t("vinOk", { c: carLabel() + (car.trim ? " " + car.trim : "") });
      });
    }).catch(function () { $("vinMsg").textContent = t("vinErr"); }).then(function () { $("vinBtn").disabled = false; });
  });

  /* ---------- tap-the-car ---------- */
  function hsOn(h) {
    return job.some(function (j) {
      if (j.svc !== h.svc) return false;
      if (!h.pos || !j.pos) return true;
      if (j.pos === h.pos) return true;
      return j.pos.length === 1 && h.pos.length === 2 && h.pos[0] === j.pos;   // axle item lights its wheels
    });
  }
  function renderCar(animate) {
    var w = $("carwrap");
    function draw() {
      w.innerHTML = W.CAR.svg[view] + W.CAR.hs[view].map(function (h) {
        var s = M.svc(h.svc); if (!s) return "";
        return '<button type="button" class="hs" data-hs="' + h.id + '" style="left:' + (h.x / 4) + "%;top:" + (h.y / 2.1) + '%" aria-label="' + esc(p(h.label)) + '"><span aria-hidden="true">' + s.icon + '</span><span class="tip">' + esc(p(h.label)) + "</span></button>";
      }).join("");
      renderHotspots();
      w.classList.remove("swap");
    }
    if (animate && !M.RM) { w.classList.add("swap"); setTimeout(draw, 180); } else draw();
    $("viewLbl").textContent = t({ side: "vSideL", front: "vFrontL", back: "vBackL" }[view]);
    D.querySelectorAll("[data-view]").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-view") === view ? "true" : "false"); });
  }
  function renderHotspots() {
    var list = W.CAR.hs[view];
    D.querySelectorAll("#carwrap .hs").forEach(function (b) {
      var h = list.filter(function (x) { return x.id === b.getAttribute("data-hs"); })[0];
      var on = h && hsOn(h); b.classList.toggle("on", !!on); b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    $("hsCount").textContent = job.length;
  }
  D.querySelectorAll("[data-view]").forEach(function (b) { b.addEventListener("click", function () { if (view === b.getAttribute("data-view")) return; view = b.getAttribute("data-view"); renderCar(true); }); });
  $("carwrap").addEventListener("click", function (e) {
    var b = e.target.closest(".hs"); if (!b) return;
    var h = W.CAR.hs[view].filter(function (x) { return x.id === b.getAttribute("data-hs"); })[0];
    if (h) openSheet(h.svc, h);
  });

  /* ---------- option sheet ---------- */
  var sh = { svc: null, pos: null, sel: {} };
  function perOf(o) { return o.perWheel ? "wheel" : o.perAxle ? "axle" : null; }
  function posFor(o, pos) {
    var per = perOf(o); if (!per) return undefined;
    if (per === "wheel") return pos && pos.length === 2 ? pos : (pos === "R" ? "RL" : "FL");
    return pos ? pos[0] : "F";
  }
  function openSheet(svcId, h) {
    var s = M.svc(svcId); if (!s) return;
    sh.svc = svcId; sh.pos = h && h.pos ? h.pos : null; sh.sel = {};
    s.options.forEach(function (o) { var it = { svc: svcId, opt: o.id, pos: posFor(o, sh.pos) }; if (job.some(function (j) { return key(j) === key(it); })) sh.sel[o.id] = true; });
    $("shE").textContent = s.icon; $("shT").textContent = p(s.name);
    $("shS").textContent = h ? p(h.label) : t("shS");
    drawSheet(); open("sheet");
  }
  function drawSheet() {
    var s = M.svc(sh.svc), hasWheel = s.options.some(function (o) { return o.perWheel; }), hasAxle = s.options.some(function (o) { return o.perAxle; });
    var ph = "";
    if (hasWheel || hasAxle) {
      var opts = hasWheel ? ["FL", "FR", "RL", "RR"] : ["F", "R"], cur = sh.pos ? (hasWheel ? (sh.pos.length === 2 ? sh.pos : sh.pos + "L") : sh.pos[0]) : opts[0];
      sh.pos = cur;
      ph = '<p class="note" style="margin:6px 0 4px">' + t("posL") + '</p><div class="views" role="group">' + opts.map(function (o) { return '<button type="button" data-pos="' + o + '" aria-pressed="' + (o === cur) + '">' + esc(p(M.POS[o])) + "</button>"; }).join("") + "</div>";
    }
    $("shPos").innerHTML = ph;
    $("shOpts").innerHTML = s.options.map(function (o) {
      var pr = M.price({ svc: sh.svc, opt: o.id }), it = { svc: sh.svc, opt: o.id, pos: posFor(o, sh.pos) }, inj = job.some(function (j) { return key(j) === key(it); });
      return '<button type="button" class="op" data-op="' + o.id + '" aria-pressed="' + (!!sh.sel[o.id]) + '"><span class="r"></span><div><b>' + esc(p(o.name)) + "</b><small>" + t("parts") + " " + M.range(pr.pLo, pr.pHi) + " · " + M.hrs(pr.hLo, pr.hHi) + "</small>" +
        (inj ? '<span class="in">' + t("inJobTag") + "</span>" : "") + '</div><span class="pr">' + M.range(pr.lo, pr.hi) + "</span></button>";
    }).join("");
    var any = Object.keys(sh.sel).some(function (k) { return sh.sel[k]; });
    var had = job.some(function (j) { return j.svc === sh.svc; });
    $("shSave").textContent = any ? t("shSave") : t("shNone");
    $("shSave").disabled = !any && !had;
  }
  $("shPos").addEventListener("click", function (e) {
    var b = e.target.closest("[data-pos]"); if (!b) return;
    sh.pos = b.getAttribute("data-pos"); sh.sel = {};
    M.svc(sh.svc).options.forEach(function (o) { var it = { svc: sh.svc, opt: o.id, pos: posFor(o, sh.pos) }; if (job.some(function (j) { return key(j) === key(it); })) sh.sel[o.id] = true; });
    drawSheet();
  });
  $("shOpts").addEventListener("click", function (e) { var b = e.target.closest("[data-op]"); if (!b) return; var id = b.getAttribute("data-op"); sh.sel[id] = !sh.sel[id]; drawSheet(); });
  $("shSave").addEventListener("click", function () {
    var s = M.svc(sh.svc), before = job.length, addN = 0;
    s.options.forEach(function (o) {
      var it = { svc: sh.svc, opt: o.id }, ps = posFor(o, sh.pos); if (ps) it.pos = ps;
      var k = key(it), has = job.some(function (j) { return key(j) === k; });
      if (sh.sel[o.id] && !has) { job.push(it); addN++; }
      if (!sh.sel[o.id] && has) job = job.filter(function (j) { return key(j) !== k; });
    });
    // "replace all 4" / "rotate all" make single-tire items redundant
    if (job.some(function (j) { return j.svc === "tires" && j.opt === "four"; })) job = job.filter(function (j) { return !(j.svc === "tires" && j.opt === "one"); });
    saveJob(); close("sheet");
    M.toast(addN ? t("added") : job.length < before ? t("removed") : t("updated"));
  });

  /* ---------- quote ---------- */
  function chosenSlot() {
    if (slot) { var ok = M.days().some(function (d) { return d.slots.some(function (s) { return s.start === slot.start && !s.past && (!s.busy || s.mine); }); }); if (ok) return { s: slot, auto: false }; }
    var n = M.nextOpen(); return n ? { s: n, auto: true } : null;
  }
  function renderJob() {
    var L = $("jobList");
    if (!job.length) { L.innerHTML = '<div class="empty">' + t("emptyJob") + "</div>"; $("tot").hidden = true; pill(); return; }
    L.innerHTML = job.map(function (it, i) {
      var s = M.svc(it.svc), o = M.opt(it.svc, it.opt); if (!s || !o) return "";
      var pr = M.price(it);
      return '<div class="ji"><span class="e" aria-hidden="true">' + s.icon + "</span><b>" + esc(p(s.name)) + '</b><span class="pr">' + M.range(pr.lo, pr.hi) + "</span><small>" + esc(p(o.name)) + (it.pos ? " · " + esc(p(M.POS[it.pos])) : "") + " · " + M.hrs(pr.hLo, pr.hHi) +
        '</small><button class="x" type="button" data-rm="' + i + '">' + t("remove") + "</button></div>";
    }).join("");
    var tt = M.total(job), cs = chosenSlot();
    $("tot").hidden = false;
    $("totBig").textContent = M.range(tt.lo, tt.hi);
    $("tParts").textContent = M.range(tt.pLo, tt.pHi);
    $("tLabL").textContent = t("labor", { h: M.hrs(tt.hLo, tt.hHi), r: M.money(C.laborRate) });
    $("tLab").textContent = M.range(tt.lLo, tt.lHi);
    $("tTrip").textContent = C.tripFee ? M.money(C.tripFee) : t("free");
    $("tTime").textContent = M.hrs(tt.hLo, tt.hHi);
    $("tArr").textContent = cs ? (cs.auto ? t("nextOpen", { s: M.fWhen(cs.s.start) }) : M.fWhen(cs.s.start)) : "—";
    $("tReady").textContent = cs ? M.fWhen(M.readyBy(cs.s.start, tt.hHi)) : "—";
    pill();
  }
  $("jobList").addEventListener("click", function (e) { var b = e.target.closest("[data-rm]"); if (!b) return; job.splice(+b.getAttribute("data-rm"), 1); saveJob(); M.toast(t("removed")); });
  function pill() {
    var el = $("jobpill"), tt = M.total(job);
    $("pillTot").textContent = job.length ? M.range(tt.lo, tt.hi) : "";
    $("pillN").textContent = t("pillN", { n: job.length, h: M.hrs(tt.hLo, tt.hHi) });
    var q = $("quote").getBoundingClientRect(), inQuote = q.top < W.innerHeight && q.bottom > 0;
    el.classList.toggle("show", job.length > 0 && !inQuote);
  }
  W.addEventListener("scroll", function () { pill(); navSpy(); }, { passive: true });

  /* ---------- schedule ---------- */
  function renderDays() {
    var ds = M.days(), loc = M.lang() === "es" ? "es-MX" : "en-US";
    if (dayIdx >= ds.length) dayIdx = 0;
    $("days").innerHTML = ds.map(function (d, i) {
      var open = d.slots.filter(function (s) { return !s.past && !s.busy; }).length;
      return '<button type="button" data-day="' + i + '" aria-pressed="' + (i === dayIdx) + '" class="' + (!d.open ? "closed" : "") + '"><span>' + d.date.toLocaleDateString(loc, { weekday: "short" }) + "</span><b>" + d.date.getDate() + "</b><small>" + (d.open ? (open ? t("nOpen", { n: open }) : "—") : t("closed")) + "</small></button>";
    }).join("");
    var d = ds[dayIdx];
    if (!d.open) { $("slots").innerHTML = '<div class="empty" style="grid-column:1/-1">' + t("dayClosed") + "</div>"; return; }
    var any = d.slots.some(function (s) { return !s.past && !s.busy; });
    $("slots").innerHTML = d.slots.map(function (s) {
      var pick = slot && slot.start === s.start, dis = (s.past || s.busy) && !pick;
      return '<button type="button" class="slot" data-slot="' + s.start + '" data-end="' + s.end + '"' + (dis ? " disabled" : "") + ' aria-pressed="' + !!pick + '">' + M.fTime(s.start) + "–" + M.fTime(s.end) +
        "<small>" + (pick ? t("slotYours") : s.past ? t("slotPast") : s.busy ? t("slotBooked") : t("slotOpen")) + "</small></button>";
    }).join("") + (any ? "" : '<div class="empty" style="grid-column:1/-1">' + t("dayFull") + "</div>");
  }
  function firstOpenDay() { var ds = M.days(); for (var i = 0; i < ds.length; i++) if (ds[i].slots.some(function (s) { return !s.past && !s.busy; })) return i; return 0; }
  $("days").addEventListener("click", function (e) { var b = e.target.closest("[data-day]"); if (!b) return; dayIdx = +b.getAttribute("data-day"); renderDays(); });
  $("slots").addEventListener("click", function (e) {
    var b = e.target.closest("[data-slot]"); if (!b || b.disabled) return;
    slot = { start: b.getAttribute("data-slot"), end: b.getAttribute("data-end") }; M.lsSet(SKEY, slot);
    renderDays(); renderJob(); $("slotMsg").textContent = t("slotPicked", { s: M.fSlot(slot) });
  });
  function renderHours() { $("hours").innerHTML = M.hoursList().map(function (h) { return '<span class="' + (h.today ? "td" : "") + '">' + esc(h.day) + '</span><span class="' + (h.today ? "td " : "") + (h.closed ? "cl" : "") + '">' + esc(h.txt) + "</span>"; }).join(""); }

  /* ---------- request ---------- */
  function readAlerts() { return { app: $("aApp").checked, text: $("aText").checked, email: $("aEmail").checked, phone: $("aPhone").value.trim(), email_: $("aMail").value.trim() }; }
  $("reqBtn").addEventListener("click", function () {
    if (!job.length) { M.toast(t("noItems")); $("diagram").scrollIntoView({ behavior: M.RM ? "auto" : "smooth" }); return; }
    saveCar();
    var tt = M.total(job), cs = chosenSlot(), a = readAlerts();
    var ch = [t("chApp")]; if (a.text) ch.push(t("chText").replace(/ \(.*\)/, "")); if (a.email) ch.push(t("chEmail").replace(/ \(.*\)/, ""));
    $("cfBody").innerHTML = '<div class="tot" style="margin:8px 0 6px"><dl style="margin:0">' +
      "<dt>" + t("cfCar") + "</dt><dd>" + esc(carLabel() || t("carUnknown")) + "</dd>" +
      "<dt>" + t("cfItems") + "</dt><dd>" + job.length + " · " + M.hrs(tt.hLo, tt.hHi) + "</dd>" +
      "<dt>" + t("cfEst") + "</dt><dd>" + M.range(tt.lo, tt.hi) + "</dd>" +
      "<dt>" + t("cfSlot") + "</dt><dd>" + (cs ? esc(M.fSlot(cs.s)) : "—") + "</dd>" +
      "<dt>" + t("cfAlerts") + "</dt><dd>" + esc(ch.join(" + ")) + "</dd></dl></div>";
    open("confirm");
  });
  $("cfSend").addEventListener("click", function () {
    var b = $("cfSend"); if (b.disabled) return;
    var tt = M.total(job), cs = chosenSlot(), a = readAlerts();
    var r = { id: M.uid(), own: true, createdAt: new Date().toISOString(), name: $("cfName").value.trim().slice(0, 30),
      car: { year: car.year || "", make: car.make === "__other" ? "" : title(car.make), model: car.model || "", miles: car.miles || "", vin: car.vin ? car.vin.slice(0, 3) + "…" + car.vin.slice(-4) : "" },
      problem: car.problem || "", items: job.slice(), est: tt, slot: cs ? { start: cs.s.start, end: cs.s.end } : null,
      readyBy: cs ? M.readyBy(cs.s.start, tt.hHi).toISOString() : null, status: "requested", stage: -1, history: [], notifs: [],
      alerts: { app: a.app, text: a.text, email: a.email, phone: a.text ? a.phone : "", email_: a.email ? a.email_ : "" } };
    b.disabled = true; b.textContent = t("sending");
    M.api.send("/requests", { id: r.id, items: r.items.length, est: [tt.lo, tt.hi] }).then(function () {
      M.put(r); mine.unshift(r.id); M.lsSet(MKEY, mine); curReq = r.id;
      job = []; slot = null; M.lsSet(SKEY, null); saveJob(); renderDays();
      b.disabled = false; b.textContent = t("cfSend"); close("confirm");
      renderTrack(); M.toast(t("sent"));
      setTimeout(function () { $("track").scrollIntoView({ behavior: M.RM ? "auto" : "smooth" }); }, 120);
    });
  });

  /* ---------- tracker ---------- */
  function myReqs() { return M.all().filter(function (r) { return r.own && mine.indexOf(r.id) >= 0; }); }
  function statusPill(r) {
    if (r.status === "declined") return '<span class="st no">' + t("stNo") + "</span>";
    if (r.status === "requested") return '<span class="st req">' + t("stReq") + "</span>";
    if (r.stage >= 6) return '<span class="st done">' + t("stDone") + "</span>";
    return '<span class="st go">' + esc(M.stageName(r.stage)) + "</span>";
  }
  function gaugeSVG() {
    var ticks = "", i;
    for (i = 0; i <= 10; i++) {
      var a = Math.PI + i * Math.PI / 10, x1 = 150 + 112 * Math.cos(a), y1 = 150 + 112 * Math.sin(a), x2 = 150 + (i % 5 ? 100 : 94) * Math.cos(a), y2 = 150 + (i % 5 ? 100 : 94) * Math.sin(a);
      ticks += '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="' + (i >= 9 ? "var(--accent)" : "#8d99b3") + '" stroke-width="' + (i % 5 ? 2 : 3.5) + '"/>';
    }
    return '<svg viewBox="0 0 300 172" aria-hidden="true"><defs><linearGradient id="gg" x1="0" x2="1"><stop offset="0" stop-color="var(--accent2)"/><stop offset="1" stop-color="var(--accent)"/></linearGradient></defs>' +
      '<path d="M30 150 A120 120 0 0 1 270 150" fill="none" stroke="#0a0f1c" stroke-width="16" stroke-linecap="round"/>' +
      '<path id="garc" d="M30 150 A120 120 0 0 1 270 150" fill="none" stroke="url(#gg)" stroke-width="16" stroke-linecap="round" pathLength="100" stroke-dasharray="0 100" style="transition:stroke-dasharray 1.4s cubic-bezier(.3,.9,.3,1);filter:drop-shadow(0 0 6px var(--accent))"/>' +
      ticks + '<g class="needle" id="gneedle" style="transform:rotate(-90deg)"><path d="M150 150 L146 146 L150 52 L154 146 Z" fill="#fff"/><circle cx="150" cy="150" r="10" fill="#1a2440" stroke="var(--accent)" stroke-width="3"/></g></svg>';
  }
  var VROOM = '<svg viewBox="0 0 44 22" aria-hidden="true"><path d="M2 16 L2 11 Q3 8 7 8 L12 7 Q16 2 22 2 L29 2 Q33 3 36 7 L40 8 Q43 9 43 12 L43 16 Z" fill="var(--accent)"/><path d="M15 7 Q18 4 22 4 L24 4 L24 7 Z M26 4 L29 4 Q31 5 33 7 L26 7 Z" fill="#0b1730"/><circle cx="11" cy="16.5" r="4" fill="#0b0e15" stroke="#cfd8ea" stroke-width="1.5"/><circle cx="34" cy="16.5" r="4" fill="#0b0e15" stroke="#cfd8ea" stroke-width="1.5"/></svg>';
  function trackerHTML(r, sample) {
    var st = Math.max(0, r.stage), pct = M.STAGES[st].pct, hist = {}, notes = sample ? t("sampleNotes") : null;
    (r.history || []).forEach(function (h) { hist[h.stage] = h; });
    var dots = M.STAGES.map(function (s, i) { return '<span class="dot' + (i <= st ? " on" : "") + '" style="left:' + s.pct + '%"></span>'; }).join("");
    var tl = M.STAGES.map(function (s, i) {
      var h = hist[i], cls = i < st ? "done" : i === st ? "cur" : "", skipped = i < st && !h;
      var note = h && h.note ? h.note : "";
      return '<li class="' + cls + '"><span class="n" aria-hidden="true">' + (i < st ? (skipped ? "–" : "✓") : s.icon) + "</span><b>" + esc(p(s)) + "</b>" +
        (h ? "<small>" + esc(M.fWhen(h.at)) + "</small>" : skipped ? "<small>" + t("skipped") + "</small>" : "") +
        (note && i <= st ? '<div class="msg">' + esc(note) + "<em>— " + esc(C.brand.name) + "</em></div>" : "") +
        (h && h.photo && i <= st ? M.stageArt(i) : "") + "</li>";
    }).join("");
    return '<div class="gauge">' + gaugeSVG() + '<div class="read"><b id="gpct">' + pct + '%</b><span>' + esc(M.stageName(st)) + "</span></div></div>" +
      '<div class="track"><div class="road"></div><div class="fill" id="tfill"></div>' + dots + '<div class="vroom" id="vroom" style="left:0%">' + VROOM + '</div><span class="flag" id="tflag" aria-hidden="true">🏁</span></div>' +
      '<ol class="tl">' + tl + "</ol>";
  }
  function animateTo(pct) {
    var arc = D.getElementById("garc"), nd = D.getElementById("gneedle"), f = D.getElementById("tfill"), v = D.getElementById("vroom");
    if (!arc) return;
    var go = function () {
      arc.setAttribute("stroke-dasharray", pct + " 100"); nd.style.transform = "rotate(" + (-90 + pct * 1.8) + "deg)";
      f.style.width = pct + "%"; v.style.left = "calc(" + pct + "% - " + (pct / 100 * 8) + "px)";
      var fl = D.getElementById("tflag"); if (fl) fl.style.opacity = pct >= 100 ? "0" : "1";
      if (!M.RM) { v.classList.add("go"); setTimeout(function () { v.classList.remove("go"); }, 1400); }
    };
    if (M.RM) go(); else requestAnimationFrame(function () { requestAnimationFrame(go); });
  }
  var lastPct = {};
  function renderTrack() {
    var list = myReqs();
    if (curReq && !list.some(function (r) { return r.id === curReq; })) curReq = null;
    if (!curReq && list.length) curReq = list[0].id;
    $("reqs").innerHTML = list.length ? list.map(function (r) {
      return '<button type="button" class="rq" data-req="' + r.id + '" aria-pressed="' + (r.id === curReq) + '"><span aria-hidden="true" style="font-size:22px">🚗</span><div><b>' + esc(M.carName(r.car) || t("carUnknown")) + "</b><small>" + t("jobId", { id: r.id }) + " · " + esc(M.fWhen(r.createdAt)) + "</small></div>" + statusPill(r) + "</button>";
    }).join("") : '<p class="note" style="margin:0">' + t("noReq") + "</p>";
    var r = curReq ? M.get(curReq) : null, card = $("trackCard");
    if (!r) { sampleTrack(); return; }
    stopSample();
    var head = '<div class="jobhead"><div><b>' + esc(M.carName(r.car) || t("carUnknown")) + "</b><small>" + t("jobId", { id: r.id }) + (r.slot ? " · " + t("slotL") + " " + esc(M.fSlot(r.slot)) : "") + "</small></div>" + statusPill(r) + "</div>";
    var money = r.quote ? '<div class="chipline"><span class="pill ok">' + t("quote") + ": " + M.money(r.quote) + '</span><span class="pill">' + t("readyBy") + " " + esc(r.readyBy ? M.fWhen(r.readyBy) : "—") + "</span></div>"
      : '<div class="chipline"><span class="pill acc">' + t("estimate") + ": " + M.range(r.est.lo, r.est.hi) + "</span>" + (r.readyBy ? '<span class="pill">' + t("readyBy") + " " + esc(M.fWhen(r.readyBy)) + "</span>" : "") + "</div>";
    if (r.status === "requested") { card.innerHTML = head + money + '<div class="wait"><div class="spin"></div><b>' + t("waitH") + '</b><p class="note">' + t("waitP") + "</p></div>"; return; }
    if (r.status === "declined") { card.innerHTML = head + '<p class="note">' + t("declined") + "</p>"; return; }
    card.innerHTML = head + money + trackerHTML(r, false);
    var pct = M.STAGES[Math.max(0, r.stage)].pct, from = lastPct[r.id] != null ? lastPct[r.id] : 0;
    // start from where it was so a new stage visibly drives forward
    var arc = D.getElementById("garc"); arc.setAttribute("stroke-dasharray", from + " 100"); D.getElementById("gneedle").style.transform = "rotate(" + (-90 + from * 1.8) + "deg)";
    D.getElementById("tfill").style.width = from + "%"; D.getElementById("vroom").style.left = "calc(" + from + "% - " + (from / 100 * 8) + "px)";
    lastPct[r.id] = pct; animateTo(pct);
  }
  $("reqs").addEventListener("click", function (e) { var b = e.target.closest("[data-req]"); if (!b) return; curReq = b.getAttribute("data-req"); renderTrack(); });

  /* sample tracker (no request yet) */
  var sTimer = null, sStage = 2;
  function sampleJob(stage) {
    var now = Date.now(), notes = t("sampleNotes"), hist = [];
    for (var i = 0; i <= stage; i++) hist.push({ stage: i, at: new Date(now - (stage - i) * 40 * 6e4).toISOString(), note: notes[i], photo: i === 1 || i === 3 || i === 6 });
    return { id: "SAMPLE", stage: stage, history: hist };
  }
  function sampleTrack() {
    var card = $("trackCard");
    card.innerHTML = '<div class="jobhead"><div><b>' + t("sampleCar") + "</b><small>" + t("sample") + '</small></div><span class="st go">' + t("sample") + "</span></div>" +
      trackerHTML(sampleJob(sStage), true) + '<button class="btn cyan w100" id="playS" type="button" style="margin-top:6px">' + (sTimer ? t("replay") : t("playSample")) + "</button>";
    var from = lastPct.SAMPLE != null ? lastPct.SAMPLE : 0, pct = M.STAGES[sStage].pct;
    D.getElementById("garc").setAttribute("stroke-dasharray", from + " 100"); D.getElementById("gneedle").style.transform = "rotate(" + (-90 + from * 1.8) + "deg)";
    D.getElementById("tfill").style.width = from + "%"; D.getElementById("vroom").style.left = "calc(" + from + "% - " + (from / 100 * 8) + "px)";
    lastPct.SAMPLE = pct; animateTo(pct);
    $("playS").onclick = function () {
      stopSample(); sStage = 0; lastPct.SAMPLE = 0; sampleTrack();
      sTimer = setInterval(function () {
        if (sStage >= 6) { stopSample(); return; }
        sStage++; sampleTrack();
        if (sStage === 5) banner(prefs.text ? "text" : "app", t("sampleAlertT"), t("sampleAlertB", { c: t("sampleCar") }));
      }, M.RM ? 1200 : 2200);
      sampleTrack();
    };
  }
  function stopSample() { if (sTimer) { clearInterval(sTimer); sTimer = null; } }

  /* ---------- alerts ---------- */
  function syncAlertsUI() {
    $("aApp").checked = prefs.app !== false; $("aText").checked = !!prefs.text; $("aEmail").checked = !!prefs.email;
    $("aPhone").value = prefs.phone || ""; $("aMail").value = prefs.email_ || "";
    $("aPhoneF").hidden = !prefs.text; $("aMailF").hidden = !prefs.email;
  }
  function savePrefs() {
    prefs = readAlerts(); M.lsSet(M.PKEY, prefs);
    $("aPhoneF").hidden = !prefs.text; $("aMailF").hidden = !prefs.email;
    // apply to my open jobs too, so the mechanic's "almost done" update uses them
    var a = M.all(), ch = false;
    a.forEach(function (r) { if (r.own && mine.indexOf(r.id) >= 0 && r.stage < 6 && r.status !== "declined") { r.alerts = { app: prefs.app, text: prefs.text, email: prefs.email, phone: prefs.text ? prefs.phone : "", email_: prefs.email ? prefs.email_ : "" }; ch = true; } });
    if (ch) M.lsSet(M.KEY, a);
  }
  ["aApp", "aText", "aEmail"].forEach(function (id) { $(id).addEventListener("change", savePrefs); });
  ["aPhone", "aMail"].forEach(function (id) { $(id).addEventListener("input", savePrefs); });
  $("testAlert").addEventListener("click", function () {
    var c = (myReqs()[0] && M.carName(myReqs()[0].car)) || carLabel() || t("sampleCar");
    var chs = ["app"]; if (prefs.text) chs.push("text"); if (prefs.email) chs.push("email");
    playBanners(chs.map(function (ch) { return { ch: ch, title: t("sampleAlertT"), body: t("sampleAlertB", { c: c }) }; }));
  });

  var bq = [], bBusy = false, bT;
  function banner(ch, title, body) { playBanners([{ ch: ch, title: title, body: body }]); }
  function playBanners(list) {   // newest batch wins; older ones stay in the 🔔 inbox
    bq = list.slice(-3);
    if (!bBusy) { nextBanner(); return; }
    clearTimeout(bT); $("banner").classList.remove("show"); bT = setTimeout(nextBanner, M.RM ? 50 : 350);
  }
  function nextBanner() {
    var b = bq.shift(), el = $("banner");
    if (!b) { bBusy = false; return; }
    bBusy = true;
    var ic = $("bnIc");
    ic.className = "ic" + (b.ch === "app" ? " app" : b.ch === "email" ? " mail" : "");
    ic.innerHTML = b.ch === "app" ? '<img src="' + esc(C.brand.logo) + '" alt="">' : b.ch === "email" ? "✉️" : "💬";
    $("bnApp").textContent = b.ch === "text" ? t("bnText") : b.ch === "email" ? t("bnMail") : t("bnApp", { n: C.brand.name });
    $("bnT").textContent = (b.ch === "text" && b.title.indexOf(C.brand.name) < 0 ? C.brand.name + ": " : "") + b.title;
    $("bnB").textContent = b.body;
    $("bnD").textContent = b.ch === "app" ? "" : t("bnDemo");
    el.classList.add("show");
    $("bell").classList.remove("ring"); void $("bell").offsetWidth; $("bell").classList.add("ring");
    clearTimeout(bT);
    bT = setTimeout(function () { el.classList.remove("show"); setTimeout(nextBanner, M.RM ? 50 : 450); }, 3600);
  }
  $("banner").addEventListener("click", function () { clearTimeout(bT); $("banner").classList.remove("show"); setTimeout(nextBanner, 300); });

  function allNotifs() {
    var out = [];
    myReqs().forEach(function (r) { (r.notifs || []).forEach(function (n, i) { out.push({ r: r, n: n, k: r.id + ":" + i }); }); });
    return out.sort(function (a, b) { return a.n.at < b.n.at ? 1 : -1; });
  }
  function checkNew() {
    var seen = M.lsGet(SEEN, {}) || {}, fresh = [];
    myReqs().forEach(function (r) {
      var n = (r.notifs || []).length, s = seen[r.id] || 0;
      if (n > s) { var x = r.notifs[n - 1]; x.ch.forEach(function (ch) { if (ch !== "app" || r.alerts.app !== false) fresh.push({ ch: ch, title: x.title, body: x.body }); }); }
      seen[r.id] = n;
    });
    M.lsSet(SEEN, seen);
    if (fresh.length) playBanners(fresh);
    bell();
  }
  function bell() {
    var read = M.lsGet(READ, 0) || 0, n = allNotifs().length - read;
    $("bellN").hidden = n <= 0; $("bellN").textContent = n;
  }
  $("bell").addEventListener("click", function () {
    var list = allNotifs();
    $("ibList").innerHTML = list.length ? list.map(function (x) {
      return '<div class="nt"><b>' + esc(x.n.title) + "</b>" + esc(x.n.body) + "<small style=\"display:block\">" + esc(M.carName(x.r.car)) + " · " + esc(M.fWhen(x.n.at)) + '</small><div class="chs">' +
        x.n.ch.map(function (c) { return '<span class="pill' + (c === "app" ? "" : " acc") + '">' + t(c === "app" ? "chApp" : c === "text" ? "chText" : "chEmail") + "</span>"; }).join("") + "</div></div>";
    }).join("") : '<p class="note">' + t("ibEmpty") + "</p>";
    M.lsSet(READ, list.length); bell(); open("inbox");
  });

  /* ---------- sheets ---------- */
  var lastFocus = null;
  function open(id) { lastFocus = D.activeElement; var s = $(id); s.classList.add("on"); s.setAttribute("aria-hidden", "false"); setTimeout(function () { var f = s.querySelector(".x"); if (f) f.focus({ preventScroll: true }); }, 50); }
  function close(id) { var s = $(id); s.classList.remove("on"); s.setAttribute("aria-hidden", "true"); if (lastFocus && lastFocus.focus) try { lastFocus.focus({ preventScroll: true }); } catch (e) {} }
  D.querySelectorAll(".sheet").forEach(function (s) {
    s.setAttribute("aria-hidden", "true");
    s.addEventListener("click", function (e) { if (e.target === s || e.target.closest("[data-close]")) close(s.id); });
  });
  D.addEventListener("keydown", function (e) { if (e.key === "Escape") D.querySelectorAll(".sheet.on").forEach(function (s) { close(s.id); }); });

  /* ---------- section nav highlight ---------- */
  var navT = 0;
  function navSpy() {
    var now = Date.now(); if (now - navT < 120) return; navT = now;
    var ids = ["services", "car", "diagram", "quote", "book", "track", "alerts"], cur = ids[0];
    ids.forEach(function (id) { if ($(id).getBoundingClientRect().top < 140) cur = id; });
    D.querySelectorAll(".snav a").forEach(function (a) {
      var on = a.getAttribute("href") === "#" + cur;
      if (on && !a.classList.contains("on")) { a.classList.add("on"); try { a.scrollIntoView({ block: "nearest", inline: "center" }); } catch (e) {} }
      else if (!on) a.classList.remove("on");
    });
  }

  /* ---------- live sync with the shop page (same browser) ---------- */
  M.onChange(function () { renderTrack(); checkNew(); renderDays(); });
  W.addEventListener("focus", function () { M.fire(); });
  D.addEventListener("visibilitychange", function () { if (!D.hidden) M.fire(); });

  /* ---------- boot ---------- */
  function renderAll() {
    brand(); renderSvcs(); renderBA(); fillYearMake(); renderCar(false); renderJob(); renderDays(); renderHours(); renderTrack(); bell();
    var m = $("model").value; setModelOptionsKeep(m);
  }
  function setModelOptionsKeep() { /* model list re-labels itself on language change (only the placeholder is translated) */
    var o = $("model").options[0]; if (o && !o.value) o.textContent = t("pickModel");
  }
  M.onLang(function () { if (booted) renderAll(); });
  var booted = false;
  M.applyLang();
  dayIdx = firstOpenDay();
  if (slot) { var ds = M.days(); ds.forEach(function (d, i) { if (d.slots.some(function (s) { return s.start === slot.start; })) dayIdx = i; }); }
  $("miles").value = car.miles || ""; $("problem").value = car.problem || ""; $("vin").value = car.vin || ""; $("modelTxt").value = car.make === "__other" ? car.model || "" : "";
  syncAlertsUI();
  booted = true; renderAll(); badge();
  if (car.year && car.make) loadModels(true);
  // don't fire banners for alerts that arrived while the page was closed? We DO show them: that's the point of the tracker.
  checkNew();
  navSpy();
})();
