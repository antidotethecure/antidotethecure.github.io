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
  function saveJob() { stampTier(); M.lsSet(JKEY, job); renderJob(); renderHotspots(); renderSvcs(); }
  /* parts price tier (performance trim / luxury make, config.partsTiers) rides on each job item as mult, so the shop page prices it the same */
  function curTier() { return W.SYMPTOMS ? W.SYMPTOMS.tier(car, [car.problem, $("fdIn") ? $("fdIn").value : ""].join(" ")) : null; }
  function stampTier() { var tr = curTier(); job.forEach(function (it) { if (tr) { it.mult = tr.mult; it.tier = tr.id; } else { delete it.mult; delete it.tier; } }); }
  function withTier(it) { var tr = curTier(); if (tr) { it.mult = tr.mult; it.tier = tr.id; } return it; }
  function key(it) { return it.svc + "|" + it.opt + "|" + (it.pos || ""); }

  /* ---------- brand ---------- */
  var heroSc = null;
  function heroScene() {
    if (!W.SCENE) return;
    heroSc = W.SCENE.mount($("heroScene"), { body: car.body || "suv", color: carColor(), partsFrom: "", readyTxt: t("readyTxt"), from: "work" });
    heroSc.go("work", true); W.SCENE.parallax($("heroScene"));
  }
  function brand() {
    $("bName").textContent = C.brand.name;
    $("logo").src = C.brand.logo + (C.brand.logo.indexOf("?") < 0 ? "?v=20261013b" : "");
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

  /* before / after carousel lives in beforeafter.js (+ .css); "Book this" opens the service sheet with the option preselected */
  M.openSvc = function (svcId, h) { openSheet(svcId, h || null); };
  function renderBA() { if (W.BA) W.BA.render($("baList")); }

  /* ---------- your car: Year -> Make -> Model (+ optional engine / drivetrain / trim), or a VIN ----------
     Data: NHTSA vPIC via vehicle.js (cached in localStorage). vPIC model lists have no trims, so trim / engine / drivetrain
     come from a VIN decode or the optional "More details" pickers. */
  var V = W.VEH, PT = W.PARTS;
  var FALLBACK_MAKES = ["ACURA", "AUDI", "BMW", "BUICK", "CADILLAC", "CHEVROLET", "CHRYSLER", "DODGE", "FIAT", "FORD", "GENESIS", "GMC", "HONDA", "HYUNDAI", "INFINITI", "JEEP", "KIA", "LAND ROVER", "LEXUS", "LINCOLN", "MAZDA", "MERCEDES-BENZ", "MINI", "MITSUBISHI", "NISSAN", "PORSCHE", "RAM", "RIVIAN", "SUBARU", "TESLA", "TOYOTA", "VOLKSWAGEN", "VOLVO"];
  function title(s) { return V.title(s); }

  /* searchable list (type-to-filter combobox). items: [{ v, label, group? }] */
  function Combo(root, onPick) {
    var inp = root.querySelector("input"), ul = root.querySelector("ul"), items = [], act = -1, shown = [], cur = { v: "", label: "" }, MAX = 150;
    var lid = ul.id;
    function nrm(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]/g, ""); }
    function render() {
      var q = inp.value === cur.label ? "" : nrm(inp.value), html = "", n = 0, more = 0, groups = {};
      shown = [];
      items.forEach(function (it) {
        if (q) { var k = nrm(it.label); if (k.indexOf(q) < 0 || groups["_" + it.v]) return; groups["_" + it.v] = 1; }
        if (n >= MAX) { more++; return; }
        if (!q && it.group && !groups[it.group]) { groups[it.group] = 1; html += '<li class="cbg" role="presentation">' + esc(it.group) + "</li>"; }
        shown.push(it);
        html += '<li role="option" id="' + lid + "-" + n + '" data-i="' + n + '" aria-selected="' + (it.v === cur.v) + '">' + esc(it.label) + "</li>";
        n++;
      });
      if (more) html += '<li class="cbg" role="presentation">' + esc(t("keepTyping", { n: more })) + "</li>";
      if (!n) html = '<li class="cbg" role="presentation">' + esc(t("noMatch")) + "</li>";
      ul.innerHTML = html; act = q && shown.length ? 0 : -1; mark();
    }
    function mark() {
      ul.querySelectorAll("[role=option]").forEach(function (li) { li.classList.toggle("act", +li.getAttribute("data-i") === act); });
      if (act >= 0) { inp.setAttribute("aria-activedescendant", lid + "-" + act); var el = D.getElementById(lid + "-" + act); if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest" }); }
      else inp.removeAttribute("aria-activedescendant");
    }
    function openL() { if (inp.disabled) return; ul.hidden = false; inp.setAttribute("aria-expanded", "true"); root.classList.add("open"); render(); }
    function closeL() { ul.hidden = true; inp.setAttribute("aria-expanded", "false"); root.classList.remove("open"); }
    function pick(it) { cur = { v: it.v, label: it.label }; inp.value = it.label; closeL(); onPick(it); }
    inp.addEventListener("focus", function () { openL(); try { inp.select(); } catch (e) {} });
    inp.addEventListener("click", openL);
    inp.addEventListener("input", function () { if (ul.hidden) openL(); else render(); });
    inp.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); if (ul.hidden) openL(); act = Math.min(shown.length - 1, act + 1); mark(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); act = Math.max(0, act - 1); mark(); }
      else if (e.key === "Enter") { if (!ul.hidden && shown[act]) { e.preventDefault(); pick(shown[act]); } }
      else if (e.key === "Escape") { closeL(); inp.value = cur.label; }
    });
    inp.addEventListener("blur", function () { setTimeout(function () { closeL(); if (inp.value !== cur.label) inp.value = cur.label; }, 150); });
    ul.addEventListener("mousedown", function (e) { e.preventDefault(); });
    ul.addEventListener("click", function (e) { var li = e.target.closest("[data-i]"); if (li) pick(shown[+li.getAttribute("data-i")]); });
    root.querySelector(".cbt").addEventListener("click", function () { if (ul.hidden) inp.focus(); else closeL(); });
    return {
      set: function (list, v) { items = list; this.val(v); },
      val: function (v) { var it = items.filter(function (x) { return x.v === v; })[0]; cur = it ? { v: it.v, label: it.label } : { v: "", label: "" }; inp.value = cur.label; },
      get: function () { return cur.v; },
      disable: function (d) { inp.disabled = !!d; root.classList.toggle("dis", !!d); if (d) closeL(); },
      placeholder: function (s) { inp.placeholder = s; }
    };
  }
  var yearC = Combo($("yearC"), function (it) { if (car.year !== it.v) { car.year = it.v; car.model = ""; resetSpecs(); } carChanged(true); loadModels(); });
  var makeC = Combo($("makeC"), function (it) { if (car.make !== it.v) { car.make = it.v; car.model = ""; resetSpecs(); } carChanged(true); loadModels(); });
  var modelC = Combo($("modelC"), function (it) {
    if (car.model !== it.v) { var keepVin = car.vinModel === it.v; car.model = it.v; if (!keepVin) resetSpecs(); }
    car.vtype = it.type || "";
    if (!car.bodyManual) car.body = V.bodyFrom("", it.type, it.v);
    if (!car.engine && V.isEV(car.make, it.v)) { car.engine = "EV"; car.fuel = "electric"; }
    carChanged(true);
  });
  var makeList = null;
  function fillYearMake() {
    var y = new Date().getFullYear() + 1, ys = [];
    for (var i = y; i >= 1981; i--) ys.push({ v: String(i), label: String(i) });
    yearC.set(ys, String(car.year || "")); yearC.placeholder(t("pickYear"));
    var src = makeList || FALLBACK_MAKES, have = {}, items = [];
    src.forEach(function (m) { have[m] = 1; });
    V.POPULAR.forEach(function (m) { if (have[m]) items.push({ v: m, label: title(m), group: t("popular") }); });
    src.forEach(function (m) { items.push({ v: m, label: title(m), group: t("allMakes") }); });
    if (car.make && car.make !== "__other" && !have[car.make]) items.push({ v: car.make, label: title(car.make), group: t("allMakes") });
    items.push({ v: "__other", label: t("otherMake"), group: t("allMakes") });
    makeC.set(items, car.make || ""); makeC.placeholder(makeList ? t("pickMakeN", { n: src.length }) : t("pickMake"));
  }
  function loadMakes() {
    return V.makes().then(function (list) { makeList = list; fillYearMake(); }, function () { $("modelMsg").textContent = t("makesErr"); });
  }
  var modelReq = 0, modelMsg = null;
  function loadModels() {
    var y = car.year, mk = car.make, my = ++modelReq;
    $("modelTxtF").hidden = mk !== "__other";
    if (mk === "__other" || !y || !mk) { modelC.set([], ""); modelC.disable(true); $("modelMsg").textContent = ""; return Promise.resolve(); }
    $("modelMsg").textContent = t("loadingModels"); modelC.disable(true);
    return V.models(mk, y).then(function (list) {
      if (my !== modelReq) return;
      if (car.model && !list.some(function (m) { return m.name === car.model; })) list = list.concat([{ name: car.model, type: car.vtype || "" }]);
      modelC.set(list.map(function (m) { return { v: m.name, label: m.name, type: m.type }; }), car.model || "");
      modelC.disable(!list.length); modelC.placeholder(t("pickModel"));
      modelMsg = list.length ? ["modelsOk", { n: list.length, y: y, m: title(mk) }] : ["modelsNone"]; $("modelMsg").textContent = t(modelMsg[0], modelMsg[1]);
      $("modelTxtF").hidden = list.length > 0;
    }, function () {
      if (my !== modelReq) return;
      $("modelMsg").textContent = t("modelsErr"); $("modelTxtF").hidden = false; modelC.set([], ""); modelC.disable(true);
    });
  }
  /* optional details */
  var ENGINES = ["1.0", "1.2", "1.3", "1.4", "1.5", "1.6", "1.8", "2.0", "2.2", "2.3", "2.4", "2.5", "2.7", "3.0", "3.2", "3.3", "3.5", "3.6", "3.7", "3.8", "4.0", "4.2", "4.3", "4.6", "4.7", "4.8", "5.0", "5.3", "5.4", "5.7", "6.0", "6.2", "6.4", "6.6", "6.7", "7.3"];
  function fillDetails() {
    var e = car.engine || "";
    var list = ENGINES.indexOf(e) < 0 && e && e !== "EV" ? ENGINES.concat([e]).sort(function (a, b) { return a - b; }) : ENGINES;
    $("eng").innerHTML = '<option value="">' + t("notSure") + '</option><option value="EV"' + (e === "EV" ? " selected" : "") + ">" + t("engEV") + "</option>" +
      list.map(function (x) { return '<option value="' + x + '"' + (x === e ? " selected" : "") + ">" + x + "L</option>"; }).join("");
    $("fuel").value = car.fuel && car.fuel !== "electric" ? car.fuel : ""; $("fuelF").hidden = e === "EV";
    $("drive").value = car.drive || ""; $("trim").value = car.trim || ""; $("lights").value = car.lights || ""; $("abs").value = car.abs || "";
    D.querySelectorAll("#bodyPick [data-body]").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-body") === (car.body || "") ? "true" : "false"); });
  }
  function readDetails() {
    car.engine = $("eng").value; car.fuel = car.engine === "EV" ? "electric" : $("fuel").value; car.drive = $("drive").value;
    car.trim = $("trim").value.trim(); car.lights = $("lights").value; car.abs = $("abs").value; $("fuelF").hidden = car.engine === "EV";
    carChanged(false);
  }
  ["eng", "fuel", "drive", "lights", "abs"].forEach(function (id) { $(id).addEventListener("change", readDetails); });
  $("trim").addEventListener("input", readDetails);
  $("bodyPick").addEventListener("click", function (e) {
    var b = e.target.closest("[data-body]"); if (!b) return;
    car.body = b.getAttribute("data-body"); car.bodyManual = true; fillDetails(); carChanged(false);
  });
  function saveCar() {
    if (typeof syncGarage === "function") syncGarage();
    if (car.make === "__other") car.model = $("modelTxt").value.trim();
    else if (!$("modelTxtF").hidden && $("modelTxt").value.trim() && !modelC.get()) car.model = $("modelTxt").value.trim();
    car.miles = $("miles").value.trim(); car.problem = $("problem").value.trim();
    M.lsSet(CKEY, car); badge(); syncGarage();
  }
  var issuesKey = "";
  function carChanged(identity, fromGarage) {
    if (identity && !fromGarage && car.gid) { var g = gFind(car.gid); if (g && (g.year !== car.year || g.make !== car.make || g.model !== car.model)) { car.gid = ""; car.scans = []; delete car.pid; car.nick = ""; renderPhoto(); } }
    saveCar(); fillDetails(); renderCar(false); renderTesla(); renderDiagram(); saveJob(); renderFinder();
    if (identity) loadIssues();
  }
  function resetSpecs() { ["trim", "engine", "cyl", "fuel", "drive", "lights", "abs", "vin", "vinModel", "paint"].forEach(function (k) { car[k] = ""; }); car.bodyManual = false; $("vin").value = ""; $("vinMsg").textContent = ""; }
  function carLabel(c) { return PT.label(c || car); }
  function badge() {
    var s = carLabel(); $("carBadge").hidden = !s; $("saveGarage").hidden = !s || !!car.gid;
    $("carName").textContent = s;
    $("carMini").innerHTML = W.CAR.mini(car.body, car.color);
    $("carSub").textContent = [car.body && PT.BODY[car.body] ? p(PT.BODY[car.body]) : "", car.miles ? t("milesSub", { m: car.miles }) : "", car.vin ? "VIN …" + car.vin.slice(-8) : ""].filter(Boolean).join(" · ");
  }
  ["modelTxt", "miles", "problem"].forEach(function (id) { $(id).addEventListener("input", saveCar); });
  $("modelTxt").addEventListener("change", function () { saveCar(); loadIssues(); });
  $("miles").addEventListener("blur", function () { var n = parseInt($("miles").value.replace(/\D/g, ""), 10); if (n) { $("miles").value = n.toLocaleString("en-US"); saveCar(); } });
  $("vinBtn").addEventListener("click", function () {
    var v = $("vin").value.trim().toUpperCase().replace(/\s/g, "");
    $("vin").value = v;
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(v)) { $("vinMsg").textContent = t("vinBad"); return; }
    $("vinMsg").textContent = t("vinLoading"); $("vinBtn").disabled = true;
    V.decodeVin(v).then(function (r) {
      car.year = r.year; car.make = r.make; car.model = r.model; car.vinModel = r.model; car.trim = r.trim; car.engine = r.engine; car.cyl = r.cyl;
      car.fuel = r.fuel; car.drive = r.drive; car.body = r.body; car.bodyManual = false; if (r.abs) car.abs = r.abs; car.vin = v;
      fillYearMake(); fillDetails(); $("moreD").open = true;
      return loadModels().then(function () {
        carChanged(true);
        $("vinMsg").textContent = t("vinOk", { c: carLabel() });
      });
    }).catch(function () { $("vinMsg").textContent = t("vinErr"); }).then(function () { $("vinBtn").disabled = false; });
  });
  $("vin").addEventListener("change", function () { if (!$("vin").value.trim()) { car.vin = ""; saveCar(); } });

  /* ---------- known issues for your car (NHTSA recalls + complaints) ---------- */
  function loadIssues() {
    var mk = car.make, md = car.model, y = car.year, box = $("issues");
    if (!y || !mk || mk === "__other" || !md) { box.hidden = true; issuesKey = ""; issuesData = null; return; }
    var k = [y, mk, md].join("|"); if (k === issuesKey) return; issuesKey = k; issuesData = null;
    box.hidden = false;
    $("issuesCar").textContent = [y, title(mk), md].join(" ");
    $("recalls").innerHTML = '<p class="note">' + t("loadingIssues") + "</p>"; $("complaints").innerHTML = "";
    $("issuesSrc").innerHTML = t("issuesSrc", { r: esc(V.recallsUrl(mk, md, y)), c: esc(V.complaintsUrl(mk, md, y)) });
    var R = V.recalls(mk, md, y).then(function (x) { return { ok: x }; }, function () { return { err: 1 }; });
    var Cp = V.complaints(mk, md, y).then(function (x) { return { ok: x }; }, function () { return { err: 1 }; });
    Promise.all([R, Cp]).then(function (res) {
      if (k !== issuesKey) return;
      issuesData = { r: res[0], c: res[1] }; renderIssues(); renderTesla();
    });
  }
  var issuesData = null, showAllRecalls = false;
  function renderIssues() {
    if (!issuesData) return;
    var r = issuesData.r, c = issuesData.c, h = "";
    if (r.err) h = '<p class="note">' + t("recallsErr") + "</p>";
    else if (!r.ok.length) h = '<p class="okline">✅ ' + t("noRecalls") + "</p>";
    else {
      var list = showAllRecalls ? r.ok : r.ok.slice(0, 3);
      h = '<p class="free">🛠️ ' + t("recallFree", { n: r.ok.length }) + "</p>" + list.map(function (x) {
        var flag = x.parkIt ? '<span class="pill bad">' + t("parkIt") + "</span>" : x.parkOutSide ? '<span class="pill bad">' + t("parkOut") + "</span>" : x.ota ? '<span class="pill">' + t("otaFix") + "</span>" : "";
        return '<details class="rc"><summary><b>' + esc(title(x.comp.split(":")[0])) + "</b>" + flag + "<small>" + esc(x.id) + " · " + esc(nDate(x.date)) + "</small></summary>" +
          "<p>" + esc(x.summary) + "</p>" + (x.remedy ? '<p class="note"><b>' + t("remedy") + "</b> " + esc(x.remedy) + "</p>" : "") +
          '<a href="https://www.nhtsa.gov/recalls?nhtsaId=' + encodeURIComponent(x.id) + '" target="_blank" rel="noopener">' + t("onNhtsa") + " ↗</a></details>";
      }).join("") + (r.ok.length > 3 ? '<button class="linkbtn" type="button" id="moreRecalls">' + (showAllRecalls ? t("showLess") : t("showAll", { n: r.ok.length })) + "</button>" : "") +
        '<p class="note">' + t("recallCheck") + "</p>";
    }
    $("recalls").innerHTML = h;
    var ch = "";
    if (c.err) ch = '<p class="note">' + t("complaintsErr") + "</p>";
    else if (!c.ok.total) ch = '<p class="note">' + t("noComplaints") + "</p>";
    else {
      var max = c.ok.top[0] ? c.ok.top[0][1] : 1;
      ch = '<p class="most">' + t("mostReported") + " " + c.ok.top.slice(0, 3).map(function (x) { return esc(x[0]) + " (" + x[1] + ")"; }).join(", ") + "…</p>" +
        '<ul class="bars">' + c.ok.top.slice(0, 6).map(function (x) {
          var s = V.compSvc(x[0]), sv = s && M.svc(s);
          return '<li><span class="bl">' + esc(title(x[0])) + '</span><span class="bt"><i style="width:' + Math.max(4, Math.round(x[1] / max * 100)) + '%"></i></span><b>' + x[1] + "</b>" +
            (sv ? '<button type="button" class="chk" data-svc="' + s + '">' + sv.icon + " " + t("checkIt") + "</button>" : "<span></span>") + "</li>";
        }).join("") + "</ul>" + '<p class="note">' + t("complaintsOf", { n: c.ok.total }) + "</p>";
    }
    $("complaints").innerHTML = ch;
  }
  $("issues").addEventListener("click", function (e) {
    if (e.target.id === "moreRecalls") { showAllRecalls = !showAllRecalls; renderIssues(); return; }
    var b = e.target.closest(".chk[data-svc]"); if (b) openSheet(b.getAttribute("data-svc"), null);
  });

  /* ---------- tap-the-car ---------- */
  function hsOn(h) {
    return job.some(function (j) {
      if (j.svc !== h.svc) return false;
      if (h.opt && j.opt !== h.opt) return false;
      if (!h.pos || !j.pos) return true;
      if (j.pos === h.pos) return true;
      return j.pos.length === 1 && h.pos.length === 2 && h.pos[0] === j.pos;   // axle item lights its wheels
    });
  }
  function renderCar(animate) {
    var w = $("carwrap");
    function draw() {
      w.innerHTML = W.CAR.svg(view, car.body, car.color) + W.CAR.hs(view, car.body).map(function (h) {
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
    var list = W.CAR.hs(view, car.body);
    D.querySelectorAll("#carwrap .hs").forEach(function (b) {
      var h = list.filter(function (x) { return x.id === b.getAttribute("data-hs"); })[0];
      var on = h && hsOn(h); b.classList.toggle("on", !!on); b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    $("hsCount").textContent = job.length;
  }
  D.querySelectorAll("[data-view]").forEach(function (b) { b.addEventListener("click", function () { if (view === b.getAttribute("data-view")) return; view = b.getAttribute("data-view"); renderCar(true); }); });
  $("carwrap").addEventListener("click", function (e) {
    var b = e.target.closest(".hs"); if (!b) return;
    var h = W.CAR.hs(view, car.body).filter(function (x) { return x.id === b.getAttribute("data-hs"); })[0];
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
    if (h && h.opt && !Object.keys(sh.sel).length) sh.sel[h.opt] = true;
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
      var pr = M.price(withTier({ svc: sh.svc, opt: o.id })), it = { svc: sh.svc, opt: o.id, pos: posFor(o, sh.pos) }, inj = job.some(function (j) { return key(j) === key(it); });
      return '<button type="button" class="op" data-op="' + o.id + '" aria-pressed="' + (!!sh.sel[o.id]) + '"><span class="r"></span><div><b>' + esc(p(o.name)) + "</b><small>" + t("parts") + " " + M.range(pr.pLo, pr.pHi) + " · " + M.hrs(pr.hLo, pr.hHi) + "</small>" +
        (inj ? '<span class="in">' + t("inJobTag") + "</span>" : "") + '</div><span class="pr">' + M.range(pr.lo, pr.hi) + "</span></button>";
    }).join("");
    var any = Object.keys(sh.sel).some(function (k) { return sh.sel[k]; });
    var had = job.some(function (j) { return j.svc === sh.svc; });
    var picked = s.options.filter(function (o) { return sh.sel[o.id]; });
    $("shParts").innerHTML = picked.length ? '<p class="note" style="margin:10px 0 4px">' + t("partsFor") + '</p><div class="chipline">' + picked.map(function (o) {
      return '<button type="button" class="pill acc pbtn" data-parts="' + o.id + '">🔩 ' + esc(p(o.name)) + "</button>"; }).join("") + "</div>" : "";
    $("shSave").textContent = any ? t("shSave") : t("shNone");
    $("shSave").disabled = !any && !had;
  }
  $("shPos").addEventListener("click", function (e) {
    var b = e.target.closest("[data-pos]"); if (!b) return;
    sh.pos = b.getAttribute("data-pos"); sh.sel = {};
    M.svc(sh.svc).options.forEach(function (o) { var it = { svc: sh.svc, opt: o.id, pos: posFor(o, sh.pos) }; if (job.some(function (j) { return key(j) === key(it); })) sh.sel[o.id] = true; });
    drawSheet();
  });
  $("shParts").addEventListener("click", function (e) {
    var b = e.target.closest("[data-parts]"); if (!b) return;
    var o = M.opt(sh.svc, b.getAttribute("data-parts")), it = { svc: sh.svc, opt: o.id }, ps = posFor(o, sh.pos); if (ps) it.pos = ps;
    openParts(it);
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
    $("qShare").hidden = !job.length;
    if (!job.length) { L.innerHTML = '<div class="empty">' + t("emptyJob") + "</div>"; $("tot").hidden = true; pill(); return; }
    L.innerHTML = job.map(function (it, i) {
      var s = M.svc(it.svc), o = M.opt(it.svc, it.opt); if (!s || !o) return "";
      var pr = M.price(it);
      return '<div class="ji"><span class="e" aria-hidden="true">' + s.icon + "</span><b>" + esc(p(s.name)) + '</b><span class="pr">' + M.range(pr.lo, pr.hi) + "</span><small>" + esc(p(o.name)) + (it.pos ? " · " + esc(p(M.POS[it.pos])) : "") + " · " + M.hrs(pr.hLo, pr.hHi) +
        (it.codes && it.codes.length ? '<span class="codes">' + t("fromCode", { c: it.codes.map(esc).join(", ") }) + "</span>" : "") +
        (it.tier ? '<span class="codes">' + esc(t("tierTag", { t: tierName(it.tier) })) + "</span>" : "") +
        '</small><span class="jact"><button class="pbtn2" type="button" data-pi="' + i + '">🔩 ' + t("partsBtn") + '</button><button class="x" type="button" data-rm="' + i + '">' + t("remove") + "</button></span></div>";
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
    $("qText").href = "sms:" + (C.brand.sms || "") + (/iPhone|iPad|iPod/.test(navigator.userAgent) ? "&" : "?") + "body=" + encodeURIComponent(quoteText());
    pill();
  }
  function tierName(id) { var x = (C.partsTiers || []).filter(function (y) { return y.id === id; })[0]; return x ? p(x.name) : ""; }
  /* plain-text quote to copy or text (same numbers as the screen) */
  function quoteText() {
    var tt = M.total(job), L = [t("qTxtHead", { b: p(C.brand.name) })];
    if (carLabel()) L.push(t("qTxtCar", { c: carLabel() }));
    var pr0 = car.problem || ($("fdIn") ? $("fdIn").value.trim() : ""); if (pr0) L.push(t("qTxtProb", { p: pr0 }));
    L.push("");
    job.forEach(function (it) { var x = M.price(it); L.push("• " + M.itemName(it) + ": " + M.range(x.lo, x.hi)); });
    L.push("", t("qTxtTot", { t: M.range(tt.lo, tt.hi) }), t("qTxtSplit", { p: M.range(tt.pLo, tt.pHi), l: M.range(tt.lLo, tt.lHi), h: M.hrs(tt.hLo, tt.hHi), r: M.money(C.laborRate) }));
    var tr = job[0] && job[0].tier ? tierName(job[0].tier) : ""; if (tr) L.push(t("tierTag", { t: tr }));
    L.push(t("qTxtFoot"));
    return L.join("\n");
  }
  $("qCopy").addEventListener("click", function () { copyText(quoteText()).then(function (ok) { M.toast(ok ? t("copied") : t("copyFail")); }); });

  /* ---------- type what's wrong (symptoms.js) ---------- */
  var fd = { groups: [], sel: {}, text: "" };
  function fdKey(f) { return f.svc + "." + f.opt; }
  function fdItem(f) { var o = M.opt(f.svc, f.opt), it = { svc: f.svc, opt: f.opt }, ps = o ? posFor(o, null) : undefined; if (ps) it.pos = ps; return withTier(it); }
  function runFinder() {
    fd.text = $("fdIn").value.trim(); fd.groups = W.SYMPTOMS ? W.SYMPTOMS.match(fd.text) : []; fd.sel = {};
    fd.groups.forEach(function (g) { g.fix.forEach(function (f) { if (f.sel) fd.sel[fdKey(f)] = true; }); });
    if (fd.text && !fd.groups.length) fd.sel["diag.scan"] = true;
    stampTier(); renderJob(); renderFinder();
  }
  function fdRow(f) {
    var s = M.svc(f.svc), o = M.opt(f.svc, f.opt); if (!s || !o) return "";
    var it = fdItem(f), pr = M.price(it), k = fdKey(f), inj = job.some(function (j) { return j.svc === f.svc && j.opt === f.opt; });
    return '<button type="button" class="op" data-fd="' + k + '" aria-pressed="' + (!!fd.sel[k]) + '"><span class="r"></span><div><b>' + esc(p(o.name)) + "</b><small>" + s.icon + " " + esc(p(s.name)) + " · " + t("parts") + " " + M.range(pr.pLo, pr.pHi) + " · " + M.hrs(pr.hLo, pr.hHi) + "</small>" +
      (inj ? '<span class="in">' + t("inJobTag") + "</span>" : "") + '</div><span class="pr">' + M.range(pr.lo, pr.hi) + "</span></button>";
  }
  function renderFinder() {
    if (!$("fdOut")) return;
    var lbl = carLabel(), tr = curTier();
    $("fdFor").innerHTML = (lbl ? esc(t("fdFor", { c: lbl })) : esc(t("fdForNone"))) + (tr ? '<br><span class="pill acc" style="margin-top:6px">' + esc(t("fdTier", { t: p(tr.name), p: Math.round((tr.mult - 1) * 100) })) + "</span>" : "");
    if (!fd.text) { $("fdOut").innerHTML = ""; return; }
    var h = "";
    if (!fd.groups.length) h = '<p class="note">' + t("fdNone") + '</p><div class="fdlist">' + fdRow({ svc: "diag", opt: "scan" }) + "</div>";
    else h = '<p class="kick" style="margin:12px 0 4px">' + t("fdSome") + "</p>" + fd.groups.map(function (g) {
      return '<div class="fdg"><h4><span aria-hidden="true">' + g.icon + "</span> " + esc(p(g.title)) + '</h4><p class="note">' + esc(p(g.why)) + '</p><div class="fdlist">' + g.fix.map(fdRow).join("") + "</div></div>";
    }).join("");
    var n = Object.keys(fd.sel).filter(function (k) { return fd.sel[k]; }).length, tot = { lo: 0, hi: 0 };
    Object.keys(fd.sel).forEach(function (k) { if (!fd.sel[k]) return; var a = k.split("."), x = M.price(fdItem({ svc: a[0], opt: a[1] })); tot.lo += x.lo; tot.hi += x.hi; });
    h += '<button class="btn primary w100" id="fdAdd" type="button" style="margin-top:12px"' + (n ? "" : " disabled") + ">" + (n ? t("fdAdd", { n: n }) + " · " + M.range(tot.lo, tot.hi) : t("fdAddNone")) + "</button>" +
      '<p class="disc" style="margin-top:8px">' + t("fdNote") + "</p>";
    $("fdOut").innerHTML = h;
  }
  $("fdForm").addEventListener("submit", function (e) { e.preventDefault(); if (!$("fdIn").value.trim()) { M.toast(t("fdEmpty")); return; } runFinder(); });
  var fdT = null;
  $("fdIn").addEventListener("input", function () { clearTimeout(fdT); fdT = setTimeout(runFinder, 450); });
  $("fdOut").addEventListener("click", function (e) {
    var b = e.target.closest("[data-fd]");
    if (b) { var k = b.getAttribute("data-fd"); fd.sel[k] = !fd.sel[k]; renderFinder(); return; }
    if (!e.target.closest("#fdAdd")) return;
    var addN = 0;
    Object.keys(fd.sel).forEach(function (k) {
      if (!fd.sel[k]) return; var a = k.split("."), it = fdItem({ svc: a[0], opt: a[1] });
      if (!job.some(function (j) { return key(j) === key(it); })) { job.push(it); addN++; }
    });
    if (!car.problem && fd.text) { car.problem = fd.text; $("problem").value = fd.text; saveCar(); }
    saveJob(); renderFinder();
    M.toast(addN ? t("fdAdded", { n: addN }) : t("updated"));
    setTimeout(function () { $("quote").scrollIntoView({ behavior: M.RM ? "auto" : "smooth" }); }, 150);
  });
  $("jobList").addEventListener("click", function (e) { var pb = e.target.closest("[data-pi]"); if (pb) { openParts(job[+pb.getAttribute("data-pi")]); return; } var b = e.target.closest("[data-rm]"); if (!b) return; job.splice(+b.getAttribute("data-rm"), 1); saveJob(); M.toast(t("removed")); });
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
      car: { year: car.year || "", make: car.make === "__other" ? "" : title(car.make), model: car.model || "", miles: car.miles || "", vin: car.vin ? car.vin.slice(0, 3) + "…" + car.vin.slice(-4) : "",
        vin8: car.vin ? car.vin.slice(-8) : "", trim: car.trim || "", engine: car.engine || "", cyl: car.cyl || "", fuel: car.fuel || "", drive: car.drive || "", body: car.body || "", lights: car.lights || "", abs: car.abs || "", color: car.color || "" },
      problem: car.problem || "", items: job.slice(), est: tt, garageId: car.gid || "", slot: cs ? { start: cs.s.start, end: cs.s.end } : null,
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
  /* ---------- the animated scene: the customer's car moves through Carlos' place with the stage ---------- */
  var GK = ["g_rec", "g_diag", "g_parts", "g_work", "g_half", "g_almost", "g_ready"], lastSt = {};
  function mech() { return C.brand.mechanic || C.brand.short || C.brand.name; }
  function suppName() { var s = PT.supplier(); return s ? s.short || s.name : ""; }
  function greet(st) { return t(st < 0 ? "g_req" : GK[st], { m: esc(mech()), s: esc(suppName()) }); }
  function carColor(r) { return car.color || (r && r.car && r.car.color) || "#c8242b"; }
  function sceneBlock(st) {
    return '<p class="greet">' + greet(st) + '</p><div class="trackscn" id="tscn"></div>' +
      '<div class="swatches" role="group" aria-label="' + esc(t("colorL")) + '"><span>' + t("colorL") + "</span>" + swatches(car.color || "") + "</div>";
  }
  function mountScene(id, body, st) {
    var el = D.getElementById("tscn"); if (!el || !W.SCENE) return;
    var from = lastSt[id];
    var sc = W.SCENE.mount(el, { body: body || car.body || "sedan", color: carColor(M.get(id)), partsFrom: t("partsFrom", { s: suppName() }), readyTxt: t("readyTxt"), from: from == null ? "off" : from });
    W.SCENE.parallax(el);
    lastSt[id] = st;
    if (from === st) sc.go(st, true); else requestAnimationFrame(function () { requestAnimationFrame(function () { sc.go(st); }); });
  }
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
    return sceneBlock(st) + '<div class="gauge">' + gaugeSVG() + '<div class="read"><b id="gpct">' + pct + '%</b><span>' + esc(M.stageName(st)) + "</span></div></div>" +
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
    if (r.status === "requested") { card.innerHTML = head + money + sceneBlock(-1) + '<div class="wait"><div class="spin"></div><b>' + t("waitH") + '</b><p class="note">' + t("waitP") + "</p></div>"; mountScene(r.id, r.car && r.car.body, -1); return; }
    if (r.status === "declined") { card.innerHTML = head + '<p class="note">' + t("declined") + "</p>"; return; }
    card.innerHTML = head + money + trackerHTML(r, false);
    mountScene(r.id, r.car && r.car.body, Math.max(0, r.stage));
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
    mountScene("SAMPLE", car.body || "sedan", sStage);
    var from = lastPct.SAMPLE != null ? lastPct.SAMPLE : 0, pct = M.STAGES[sStage].pct;
    D.getElementById("garc").setAttribute("stroke-dasharray", from + " 100"); D.getElementById("gneedle").style.transform = "rotate(" + (-90 + from * 1.8) + "deg)";
    D.getElementById("tfill").style.width = from + "%"; D.getElementById("vroom").style.left = "calc(" + from + "% - " + (from / 100 * 8) + "px)";
    lastPct.SAMPLE = pct; animateTo(pct);
    $("playS").onclick = function () {
      stopSample(); sStage = 0; lastPct.SAMPLE = 0; delete lastSt.SAMPLE; sampleTrack();
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

  /* ---------- parts sheet: typical parts, what to ask the counter, where to look ---------- */
  var partsIt = null, scriptLang = null, sayText = [];
  function openParts(it) { if (!it) return; partsIt = it; scriptLang = M.lang(); drawParts(); open("partsSh"); }
  function supplierCard(sup) {
    return '<div class="supp"><div class="sh"><span class="badge">⭐ ' + t("prefSupp") + "</span><b>" + t("checkFirst", { n: esc(sup.short || sup.name) }) + "</b><small>" + esc(sup.name) + " · " + esc(sup.area || "") + "</small></div>" +
      '<p class="note">' + esc(p(sup.note)) + "</p>" + (sup.hours ? '<p class="note">🕗 ' + esc(p(sup.hours)) + "</p>" : "") +
      '<div class="row sb">' + (sup.tel ? '<a class="btn primary small" href="tel:' + esc(sup.tel) + '">📞 ' + t("callN", { n: esc(sup.short || sup.name) }) + "</a>" : "") +
      (sup.mapsUrl ? '<a class="btn ghost small" href="' + esc(sup.mapsUrl) + '" target="_blank" rel="noopener">🧭 ' + t("directions") + "</a>" : "") +
      (sup.website ? '<a class="btn ghost small" href="' + esc(sup.website) + '" target="_blank" rel="noopener">🌐 ' + t("website") + "</a>" : "") + "</div>" +
      '<p class="fine">' + t("suppHonest") + "</p></div>";
  }
  function drawParts() {
    var it = partsIt, s = M.svc(it.svc), o = M.opt(it.svc, it.opt); if (!s || !o) return;
    $("psE").textContent = s.icon; $("psT").textContent = p(o.name) + (it.pos ? " · " + p(M.POS[it.pos]) : "");
    $("psS").textContent = carLabel() || t("carUnknown");
    var r = PT.forItem(it, car), sup = PT.supplier(), h = "";
    sayText = [];
    if (!car.year || !car.make) h += '<p class="note warnline">🚗 ' + t("pickCarFirst") + ' <a href="#car" data-close>' + t("pickCarGo") + "</a></p>";
    if (r.na || !r.parts.length) h += '<div class="empty">' + esc(p(r.none)) + "</div>";
    else {
      var unk = {}; r.parts.forEach(function (pp) { PT.unknowns(pp, car, it).forEach(function (k) { unk[k] = 1; }); });
      var q = "";
      if (unk.lights) q += '<div class="qrow"><span>' + t("qLights") + "</span>" + ["halogen", "hid", "led"].map(function (v) { return '<button type="button" class="pill" data-q="lights" data-v="' + v + '">' + t("l_" + v) + "</button>"; }).join("") + "</div>";
      if (unk.abs) q += '<div class="qrow"><span>' + t("qAbs") + '</span><button type="button" class="pill" data-q="abs" data-v="yes">' + t("yes") + '</button><button type="button" class="pill" data-q="abs" data-v="no">' + t("no") + "</button></div>";
      if (unk.body) q += '<div class="qrow"><span>' + t("qBody") + "</span>" + W.CAR.bodies.map(function (v) { return '<button type="button" class="pill" data-q="body" data-v="' + v + '">' + esc(p(PT.BODY[v])) + "</button>"; }).join("") + "</div>";
      if (unk.engine || unk.drive || unk.trim) q += '<div class="qrow"><span>' + t("qMore", { w: ["engine", "drive", "trim"].filter(function (k) { return unk[k]; }).map(function (k) { return t("w_" + k); }).join(", ") }) + '</span><a class="pill acc" href="#car" data-close data-moreopen>' + t("addIt") + "</a></div>";
      if (q) h += '<div class="qbox"><p class="kick" style="margin:0 0 4px">' + t("counterAsks") + "</p>" + q + "</div>";
      if (sup) h += supplierCard(sup);
      h += '<div class="sayhead"><p class="kick" style="margin:0">' + t("whatToAsk", { n: esc(sup ? sup.short || sup.name : t("theStore")) }) + '</p><div class="lt mini" role="group" aria-label="Script language"><button type="button" data-sl="en" aria-pressed="' + (scriptLang === "en") + '">EN</button><button type="button" data-sl="es" aria-pressed="' + (scriptLang === "es") + '">ES</button></div></div>';
      r.parts.forEach(function (pp, i) {
        var sc = PT.script(pp, car, scriptLang, it); sayText[i] = sc;
        var links = pp.find ? PT.storeLinks(car, pp.find) : [];
        h += '<div class="part"><b>' + esc(p(pp.name)) + "</b>" + (pp.detail ? '<p class="note">' + esc(p(pp.detail)) + "</p>" : "") +
          (sc ? '<div class="say"><p lang="' + scriptLang + '">' + esc(sc) + '</p><div class="sayb"><button type="button" class="btn ghost small" data-copy="' + i + '">📋 ' + t("copy") + "</button>" +
            (sup && sup.tel ? '<a class="btn primary small" href="tel:' + esc(sup.tel) + '">📞 ' + t("callN", { n: esc(sup.short || sup.name) }) + "</a>" : "") +
            (sup && sup.sms ? '<a class="btn ghost small" href="sms:' + esc(sup.sms) + "?&body=" + encodeURIComponent(sc) + '">💬 ' + t("text") + "</a>" : "") + "</div></div>" : "") +
          (links.length ? '<div class="find"><span>' + t("findExact") + "</span>" + links.map(function (l) { return '<a href="' + esc(l.url) + '" target="_blank" rel="noopener">' + esc(l.name) + " ↗</a>"; }).join("") + "</div>" : "") + "</div>";
      });
    }
    if (r.note) h += '<p class="note">ℹ️ ' + esc(p(r.note)) + "</p>";
    h += '<p class="disc">' + t("partsHonest") + "</p>";
    $("psBody").innerHTML = h;
  }
  function copyText(s) {
    function fb() { var ta = D.createElement("textarea"); ta.value = s; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0"; D.body.appendChild(ta); ta.select(); var ok = false; try { ok = D.execCommand("copy"); } catch (e) {} D.body.removeChild(ta); return ok; }
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(s).then(function () { return true; }, function () { return fb(); });
    return Promise.resolve(fb());
  }
  $("psBody").addEventListener("click", function (e) {
    var c = e.target.closest("[data-copy]");
    if (c) { copyText(sayText[+c.getAttribute("data-copy")] || "").then(function (ok) { M.toast(ok ? t("copied") : t("copyFail")); }); return; }
    var sl = e.target.closest("[data-sl]"); if (sl) { scriptLang = sl.getAttribute("data-sl"); drawParts(); return; }
    var qb = e.target.closest("[data-q]");
    if (qb) { var k = qb.getAttribute("data-q"); car[k] = qb.getAttribute("data-v"); if (k === "body") car.bodyManual = true; carChanged(false); drawParts(); return; }
    if (e.target.closest("[data-moreopen]")) $("moreD").open = true;
  });

  /* ---------- scan my car (OBD-II) ---------- */
  var scan = { res: null, manual: [], busy: false, elm: null };
  function ensureDB() {
    if (W.OBD_CODES) return Promise.resolve();
    return new Promise(function (res) { var s = D.createElement("script"); s.src = "obd-codes.js?v=20261013b"; s.onload = res; s.onerror = res; D.head.appendChild(s); });
  }
  function renderSupport() {
    var sup = W.OBD.support();
    $("btSupport").innerHTML = sup.ok ? t("btOk") : sup.ios ? t("btIos") : t("btNo");
    $("btSupport").className = "note " + (sup.ok ? "okline" : "warnline");
    $("btGo").disabled = !sup.ok || scan.busy;
  }
  function codeCard(code, kind) {
    var i = W.OBD.info(code); if (!i) return "";
    var inJob = job.some(function (j) { return (j.codes || []).indexOf(i.code) >= 0; });
    var meaning = i.mfr ? t("mfrCode") : i.desc ? esc(i.desc) : t("unlisted", { s: esc(p(i.sys)) });
    var jobs = i.jobs.map(function (x) { var sv = M.svc(x[0]), op = M.opt(x[0], x[1]); return sv && op ? sv.icon + " " + esc(p(sv.name)) + " · " + esc(p(op.name)) : ""; }).filter(Boolean);
    return '<article class="dtc sev-' + i.sev + '"><div class="dh"><b class="code">' + i.code + "</b>" + (kind === "pending" ? '<span class="pill">' + t("pendingTag") + "</span>" : kind === "manual" ? '<span class="pill">' + t("typedTag") + "</span>" : "") +
      '<span class="sev">' + (i.sev === "stop" ? "🛑 " : i.sev === "soon" ? "⚠️ " : "✅ ") + esc(p(W.OBD.SEV[i.sev])) + "</span></div>" +
      '<p class="mean">' + meaning + "</p>" +
      "<dl><dt>" + t("system") + "</dt><dd>" + esc(p(i.sys)) + "</dd>" + (i.causes ? "<dt>" + t("causes") + "</dt><dd>" + esc(p(i.causes)) + "</dd>" : "") +
      "<dt>" + t("likelyJob") + "</dt><dd>" + jobs.join("<br>") + "</dd></dl>" + (i.warn ? '<p class="warnline">' + esc(p(i.warn)) + "</p>" : "") +
      (inJob ? '<button class="btn ghost small w100" type="button" disabled>✓ ' + t("inYourJob") + "</button>" : '<button class="btn primary small w100" type="button" data-addcode="' + i.code + '">➕ ' + t("addToJob") + "</button>") + "</article>";
  }
  function addCodeJobs(code) {
    var i = W.OBD.info(code); if (!i) return;
    i.jobs.forEach(function (x) {
      if (!M.opt(x[0], x[1])) return;
      var it = { svc: x[0], opt: x[1] }, ex = job.filter(function (j) { return key(j) === key(it); })[0];
      if (ex) { ex.codes = (ex.codes || []).concat(ex.codes && ex.codes.indexOf(code) >= 0 ? [] : [code]); }
      else { it.codes = [code]; job.push(it); }
    });
  }
  function renderScan() {
    renderSupport();
    var r = scan.res, h = "";
    if (r) {
      var live = [];
      if (r.status) live.push(r.status.mil ? "🔴 " + t("milOn") : "⚪ " + t("milOff"));
      if (r.rpm != null) live.push(Math.round(r.rpm) + " rpm");
      if (r.coolant != null) live.push(t("coolantT", { c: r.coolant, f: Math.round(r.coolant * 9 / 5 + 32) }));
      if (r.volts != null) live.push(r.volts.toFixed(1) + " V");
      h += '<div class="scanhead"><b>' + (r.simulated ? t("simTitle") : t("scanTitle")) + "</b>" + (live.length ? "<small>" + live.join(" · ") + "</small>" : "") + "</div>";
      if (!r.stored.length && !r.pending.length) h += '<p class="okline">✅ ' + t("noCodes") + "</p>";
      h += r.stored.map(function (c) { return codeCard(c, "stored"); }).join("") + r.pending.map(function (c) { return codeCard(c, "pending"); }).join("");
    }
    h += scan.manual.map(function (c) { return codeCard(c, "manual"); }).join("");
    $("scanOut").innerHTML = h;
  }
  $("scanOut").addEventListener("click", function (e) {
    var b = e.target.closest("[data-addcode]"); if (!b) return;
    var code = b.getAttribute("data-addcode");
    addCodeJobs(code); saveJob(); renderScan(); renderGarage(); M.toast(t("codeAdded", { c: code }));
  });
  function logResult(src, r) {
    logScan(src, r.stored.map(function (c) { return { c: c, k: "stored" }; }).concat(r.pending.map(function (c) { return { c: c, k: "pending" }; })),
      { mil: r.status ? r.status.mil : null, volts: r.volts != null ? r.volts : null });
  }
  $("codeForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var c = W.OBD.norm($("codeIn").value);
    if (!c) { $("codeMsg").textContent = t("codeBad"); return; }
    $("codeMsg").textContent = "";
    ensureDB().then(function () { scan.manual = [c].concat(scan.manual.filter(function (x) { return x !== c; })).slice(0, 6); $("codeIn").value = ""; logScan("typed", [{ c: c, k: "typed" }]); renderScan(); });
  });
  $("simBtn").addEventListener("click", function () {
    $("btMsg").textContent = t("simRunning");
    ensureDB().then(function () { setTimeout(function () { scan.res = W.OBD.simulate(); $("btMsg").textContent = t("simDone"); logResult("demo", scan.res); renderScan(); $("scanOut").scrollIntoView({ behavior: M.RM ? "auto" : "smooth", block: "nearest" }); }, M.RM ? 50 : 700); });
  });
  $("btGo").addEventListener("click", function () {
    if (scan.busy) return;
    scan.busy = true; renderSupport();
    var elm = new W.OBD.Elm(), step = 0;
    $("btMsg").textContent = t("btPick");
    ensureDB().then(function () {
      return elm.connect(function (k, v) { if (k === "pair") $("btMsg").textContent = t("btPaired", { n: v }); });
    }).then(function () {
      return elm.scan(function () { step++; $("btMsg").textContent = t("btReading", { n: step }); });
    }).then(function (r) { scan.res = r; $("btMsg").textContent = t("btDone"); logResult("bt", r); renderScan(); })
      .catch(function (err) {
        var m = String(err && (err.name || err.message) || "");
        $("btMsg").textContent = /NotFound|cancel/i.test(m) ? t("btCancel") : /nouart/.test(m) ? t("btNoUart") : /Security|NotAllowed/i.test(m) ? t("btDenied") : t("btFail");
      })
      .then(function () { elm.close(); scan.busy = false; renderSupport(); });
  });

  /* ---------- paint color (+ custom) ---------- */
  function colorName(hex) { var c = (C.carColors || []).filter(function (x) { return x.hex === hex; })[0]; return c ? p(c) : t("customColor"); }
  function swatches(sel) {
    return (C.carColors || []).map(function (c) {
      return '<button type="button" data-color="' + c.hex + '" style="background:' + c.hex + '" title="' + esc(p(c)) + '" aria-label="' + esc(p(c)) + '" aria-pressed="' + (c.hex === sel) + '"></button>';
    }).join("") + '<label class="swc" title="' + esc(t("customColor")) + '"><input type="color" data-colorc value="' + (sel && /^#[0-9a-f]{6}$/i.test(sel) ? sel : "#888888") + '" aria-label="' + esc(t("customColor")) + '"><span>' + t("customShort") + "</span></label>";
  }
  function setColor(hex) {
    car.color = hex; saveCar(); renderCar(false); renderPaint();
    D.querySelectorAll(".scn .actor .paint").forEach(function (pth) { pth.setAttribute("fill", hex); });
    D.querySelectorAll(".scn .actor .hood").forEach(function (pth) { pth.setAttribute("stroke", hex); });
    D.querySelectorAll(".swatches [data-color]").forEach(function (x) { x.setAttribute("aria-pressed", x.getAttribute("data-color") === hex ? "true" : "false"); });
  }
  function renderPaint() { $("paintPick").innerHTML = swatches(car.color || ""); $("paintCode").value = car.paint || ""; }
  D.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest("[data-color]"); if (b) setColor(b.getAttribute("data-color")); });
  D.addEventListener("change", function (e) { if (e.target.matches && e.target.matches("[data-colorc]")) setColor(e.target.value); });
  $("paintCode").addEventListener("input", function () { car.paint = $("paintCode").value.trim().toUpperCase().slice(0, 14); saveCar(); });

  /* ---------- car photo: on this phone only (IndexedDB, falls back to localStorage) ---------- */
  var PH = (function () {
    var dbp = null;
    function db() {
      if (dbp) return dbp;
      dbp = new Promise(function (res, rej) {
        try { var r = indexedDB.open("ssai-mech", 1); r.onupgradeneeded = function () { r.result.createObjectStore("photos"); }; r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; }
        catch (e) { rej(e); }
      });
      return dbp;
    }
    function tx(mode, fn) { return db().then(function (d) { return new Promise(function (res, rej) { var x = d.transaction("photos", mode), st = x.objectStore("photos"), q = fn(st); x.oncomplete = function () { res(q && q.result); }; x.onerror = function () { rej(x.error); }; }); }); }
    return {
      put: function (id, url) { return tx("readwrite", function (s) { return s.put(url, id); }).catch(function () { try { localStorage.setItem("ssai:mech:photo:" + id, url); } catch (e) {} }); },
      get: function (id) { return tx("readonly", function (s) { return s.get(id); }).then(function (v) { return v || null; }, function () { try { return localStorage.getItem("ssai:mech:photo:" + id); } catch (e) { return null; } }); },
      del: function (id) { return tx("readwrite", function (s) { return s.delete(id); }).catch(function () { try { localStorage.removeItem("ssai:mech:photo:" + id); } catch (e) {} }); }
    };
  })();
  var photoCache = {};
  function photoUrl(pid) { if (!pid) return Promise.resolve(null); if (photoCache[pid] !== undefined) return Promise.resolve(photoCache[pid]); return PH.get(pid).then(function (u) { photoCache[pid] = u; return u; }); }
  /* resize to max 640px, JPEG; then sample the middle of the frame (where the car usually is) against the paint swatches */
  function processPhoto(file) {
    return new Promise(function (res, rej) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var k = Math.min(1, 640 / Math.max(img.width, img.height)), w = Math.round(img.width * k), h = Math.round(img.height * k);
        var cv = D.createElement("canvas"); cv.width = w; cv.height = h; var cx = cv.getContext("2d"); cx.drawImage(img, 0, 0, w, h);
        var data = cv.toDataURL("image/jpeg", 0.8);
        var sm = D.createElement("canvas"); sm.width = 24; sm.height = 24; var sx = sm.getContext("2d");
        sx.drawImage(img, img.width * 0.15, img.height * 0.35, img.width * 0.7, img.height * 0.45, 0, 0, 24, 24);
        var px = sx.getImageData(0, 0, 24, 24).data, votes = {};
        var sw = (C.carColors || []).map(function (c) { var n = parseInt(c.hex.slice(1), 16); return { hex: c.hex, r: n >> 16, g: (n >> 8) & 255, b: n & 255 }; });
        for (var i = 0; i < px.length; i += 4) {
          var best = null, bd = 1e9;
          sw.forEach(function (c) { var d = (px[i] - c.r) * (px[i] - c.r) * 0.3 + (px[i + 1] - c.g) * (px[i + 1] - c.g) * 0.59 + (px[i + 2] - c.b) * (px[i + 2] - c.b) * 0.11; if (d < bd) { bd = d; best = c.hex; } });
          votes[best] = (votes[best] || 0) + 1;
        }
        var top = Object.keys(votes).sort(function (a, b) { return votes[b] - votes[a]; })[0];
        URL.revokeObjectURL(url); res({ data: data, suggest: top });
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error("img")); };
      img.src = url;
    });
  }
  var photoFor = null;   // garage id when the photo button on a garage card was used
  $("photoBtn").addEventListener("click", function () { photoFor = null; $("photoIn").click(); });
  $("photoIn").addEventListener("change", function () {
    var f = $("photoIn").files && $("photoIn").files[0]; $("photoIn").value = ""; if (!f) return;
    $("photoMsg").textContent = t("photoWorking");
    processPhoto(f).then(function (r) {
      var target = photoFor && photoFor !== car.gid ? gFind(photoFor) : car;
      if (!target) return;
      if (!target.pid) target.pid = "p" + Date.now().toString(36);
      photoCache[target.pid] = r.data;
      return PH.put(target.pid, r.data).then(function () {
        if (target !== car) gSave(); else saveCar();
        renderPhoto(); renderGarage();
        photoSuggest = { hex: r.suggest, gid: photoFor };
        $("photoMsg").innerHTML = t("photoSaved") + (r.suggest ? ' <button type="button" class="pill acc" id="useSuggest"><i class="dot" style="background:' + r.suggest + '"></i>' + esc(t("photoLooks", { c: colorName(r.suggest) })) + "</button>" : "");
        if (photoFor) $("garage").scrollIntoView({ behavior: M.RM ? "auto" : "smooth" });
      });
    }).catch(function () { $("photoMsg").textContent = t("photoFail"); });
  });
  var photoSuggest = null;
  $("photoMsg").addEventListener("click", function (e) {
    if (!e.target.closest("#useSuggest") || !photoSuggest) return;
    if (photoSuggest.gid) { var g = gFind(photoSuggest.gid); if (g) { g.color = photoSuggest.hex; gSave(); renderGarage(); } if (car.gid === photoSuggest.gid) setColor(photoSuggest.hex); }
    else setColor(photoSuggest.hex);
    $("photoMsg").textContent = t("photoColorSet", { c: colorName(photoSuggest.hex) });
  });
  function renderPhoto() {
    photoUrl(car.pid).then(function (u) { $("photoPrev").innerHTML = u ? '<img src="' + u + '" alt="' + esc(t("photoAlt")) + '">' : ""; });
  }

  /* ---------- My Garage (this phone only) ---------- */
  var GKEY = "ssai:mech:garage", garage = M.lsGet(GKEY, []); if (!Array.isArray(garage)) garage = [];
  var FIELDS = ["year", "make", "model", "vtype", "vinModel", "trim", "engine", "cyl", "fuel", "drive", "body", "bodyManual", "lights", "abs", "color", "paint", "vin", "miles", "pid", "nick", "scans"];
  function gFind(id) { return garage.filter(function (g) { return g.id === id; })[0] || null; }
  function gSave() { if (!M.lsSet(GKEY, garage)) M.toast(t("storageFull")); }
  function snapshot(src, dst) { FIELDS.forEach(function (k) { if (src[k] !== undefined) dst[k] = src[k]; }); return dst; }
  function syncGarage() { if (!car.gid) return; var g = gFind(car.gid); if (!g) { car.gid = ""; return; } snapshot(car, g); gSave(); }
  function saveToGarage() {
    if (!car.year || !car.make) { M.toast(t("pickCarFirst")); return; }
    var g = car.gid && gFind(car.gid);
    if (!g) { g = { id: "G" + Date.now().toString(36), added: new Date().toISOString() }; garage.unshift(g); car.gid = g.id; }
    if (!car.nick) car.nick = car.model || title(car.make);
    snapshot(car, g); gSave(); M.lsSet(CKEY, car); renderGarage(); badge();
    M.toast(t("savedGarage", { n: g.nick }));
  }
  $("saveGarage").addEventListener("click", saveToGarage);
  function useCar(id) {
    var g = gFind(id); if (!g) return Promise.resolve();
    car = snapshot(g, {}); car.gid = g.id; car.problem = ""; M.lsSet(CKEY, car);
    issuesKey = ""; fillYearMake(); fillDetails(); renderPaint(); renderPhoto();
    $("miles").value = car.miles || ""; $("vin").value = car.vin || ""; $("problem").value = "";
    return loadModels().then(function () { carChanged(true, true); });
  }
  /* code status across this car's jobs: fixed > in a job > in your quote > open */
  function codeStatus(gid, code) {
    var reqs = M.all().filter(function (r) { return r.own && r.garageId === gid && r.status !== "declined"; });
    var inReq = reqs.filter(function (r) { return (r.items || []).some(function (it) { return (it.codes || []).indexOf(code) >= 0; }); });
    if (inReq.some(function (r) { return r.stage >= 6; })) return "fixed";
    if (inReq.length) return "job";
    if (car.gid === gid && job.some(function (it) { return (it.codes || []).indexOf(code) >= 0; })) return "quote";
    return "open";
  }
  function services(gid) { return M.all().filter(function (r) { return r.own && r.garageId === gid && r.status === "accepted" && r.stage >= 6; }).sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; }); }
  function miles(s) { var n = parseInt(String(s || "").replace(/\D/g, ""), 10); return isFinite(n) ? n : 0; }
  function fDate(d) { return new Date(d).toLocaleDateString(M.lang() === "es" ? "es-MX" : "en-US", { month: "short", day: "numeric", year: "numeric" }); }
  /* NHTSA dates come as dd/mm/yyyy */
  function nDate(s) { var m = String(s || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return m ? fDate(new Date(+m[3], +m[2] - 1, +m[1])) : s; }
  function reminders(g) {
    var mt = C.maintenance || {}, out = [], hist = services(g.id), now = Date.now(), ev = PT.isEV(g), cur = miles(g.miles);
    function last(svcIds) { var r = hist.filter(function (h) { return h.items.some(function (it) { return svcIds.indexOf(it.svc + (it.opt ? "." + it.opt : "")) >= 0 || svcIds.indexOf(it.svc) >= 0; }); })[0]; return r ? { at: new Date(r.history && r.history.length ? r.history[r.history.length - 1].at : r.createdAt), mi: miles(r.car && r.car.miles) } : null; }
    function rule(key, svcIds, everyMi, everyMo) {
      var l = last(svcIds), st = "unknown", txt;
      if (l) {
        var dueAt = everyMo ? new Date(l.at.getFullYear(), l.at.getMonth() + everyMo, l.at.getDate()) : null, leftMi = everyMi && l.mi && cur ? l.mi + everyMi - cur : null;
        var over = (dueAt && dueAt.getTime() < now) || (leftMi != null && leftMi <= 0), soon = (dueAt && dueAt.getTime() - now < 30 * 864e5) || (leftMi != null && leftMi < 500);
        st = over ? "due" : soon ? "soon" : "ok";
        txt = t("remLast", { d: fDate(l.at) }) + (leftMi != null ? " · " + (leftMi <= 0 ? t("remOverMi", { n: Math.abs(leftMi).toLocaleString("en-US") }) : t("remInMi", { n: leftMi.toLocaleString("en-US") })) : "") + (dueAt ? " · " + t("remBy", { d: fDate(dueAt) }) : "");
      } else txt = t("remNone", { e: [everyMi ? everyMi.toLocaleString("en-US") + " mi" : "", everyMo ? t("remMo", { n: everyMo }) : ""].filter(Boolean).join(t("remOr")) });
      out.push({ k: key, st: st, txt: txt });
    }
    if (!ev) rule("oil", ["oil"], mt.oilMiles, mt.oilMonths);
    rule("rotate", ["tires.rotate", "tires.four"], ev ? mt.evRotateMiles || mt.rotateMiles : mt.rotateMiles, ev ? 0 : mt.rotateMonths);
    rule("brake", ["brakes"], 0, mt.brakeMonths);
    return out;
  }
  var gIssues = {};
  function gIssuesHTML(g) {
    var k = [g.year, g.make, g.model].join("|"), d = gIssues[k];
    if (!d) return '<p class="note">' + t("loadingIssues") + "</p>";
    var h = "";
    h += d.r ? (d.r.length ? '<p class="free">🛠️ ' + t("recallFree", { n: d.r.length }) + "</p>" + d.r.slice(0, 3).map(function (x) { return '<p class="note">• <b>' + esc(title(x.comp.split(":")[0])) + "</b> · " + esc(x.id) + (x.ota ? " · " + t("otaFix") : "") + "</p>"; }).join("") : '<p class="okline">✅ ' + t("noRecalls") + "</p>") : '<p class="note">' + t("recallsErr") + "</p>";
    h += d.c ? (d.c.total ? '<p class="most">' + t("mostReported") + " " + d.c.top.slice(0, 3).map(function (x) { return esc(x[0]) + " (" + x[1] + ")"; }).join(", ") + "</p>" : "") : "";
    return h;
  }
  function loadGIssues(g) {
    var k = [g.year, g.make, g.model].join("|"); if (gIssues[k] || !g.model || g.make === "__other") return;
    Promise.all([V.recalls(g.make, g.model, g.year).catch(function () { return null; }), V.complaints(g.make, g.model, g.year).catch(function () { return null; })])
      .then(function (res) { gIssues[k] = { r: res[0], c: res[1] }; D.querySelectorAll('[data-giss="' + g.id + '"]').forEach(function (el) { el.innerHTML = gIssuesHTML(g); }); });
  }
  var SRC = { demo: "srcDemo", bt: "srcBt", typed: "srcTyped" }, STAT = { fixed: "stFixed", job: "stInJob", quote: "stInQuote", open: "stOpen" };
  function renderGarage() {
    var L = $("garageList");
    if (!garage.length) { L.innerHTML = '<div class="empty">' + t("gEmpty") + "</div>"; return; }
    L.innerHTML = garage.map(function (g) {
      var lbl = PT.label(g), scans = (g.scans || []).slice().reverse(), hist = services(g.id), act = car.gid === g.id;
      var sc = scans.length ? scans.map(function (s) {
        return '<li><div class="sl"><b>' + esc(M.fWhen(s.at)) + "</b><small>" + t(SRC[s.src] || "srcTyped") + (s.mil != null ? " · " + (s.mil ? "🔴 " + t("milOn") : "⚪ " + t("milOff")) : "") + (s.volts ? " · 🔋 " + s.volts.toFixed(1) + " V" : "") + "</small></div>" +
          '<div class="chipline">' + (s.codes.length ? s.codes.map(function (c) { var st = codeStatus(g.id, c.c); return '<span class="pill st-' + st + '">' + esc(c.c) + (c.k === "pending" ? "*" : "") + " · " + t(STAT[st]) + "</span>"; }).join("") : '<span class="pill ok">' + t("noCodesShort") + "</span>") + "</div></li>";
      }).join("") : '<li class="note">' + t("noScans") + "</li>";
      var sv = hist.length ? hist.map(function (r) { return "<li><b>" + esc(M.fDay(r.createdAt)) + "</b> · " + esc(r.items.map(M.itemName).join(", ")) + (r.car && r.car.miles ? " · " + esc(r.car.miles) + " mi" : "") + "</li>"; }).join("") : '<li class="note">' + t("noService") + "</li>";
      var rem = reminders(g).map(function (x) { return '<li class="rm-' + x.st + '"><b>' + t("rem_" + x.k) + "</b><small>" + esc(x.txt) + "</small></li>"; }).join("");
      return '<article class="gcar' + (act ? " act" : "") + '" data-gid="' + g.id + '"><div class="gtop"><div class="gph" data-ph="' + esc(g.pid || "") + '">' + W.CAR.mini(g.body, g.color) + "</div>" +
        '<div class="gtx"><input class="gnick" data-nick="' + g.id + '" value="' + esc(g.nick || "") + '" maxlength="24" aria-label="' + esc(t("nickL")) + '"><small>' + esc(lbl) + "</small><small>" +
        esc([g.color ? colorName(g.color) + (g.paint ? " (" + g.paint + ")" : "") : "", g.miles ? g.miles + " mi" : "", g.vin ? "VIN …" + g.vin.slice(-8) : ""].filter(Boolean).join(" · ")) + "</small></div>" +
        (act ? '<span class="pill ok">' + t("gActive") + "</span>" : "") + "</div>" +
        '<div class="gbtns"><button class="btn primary small" type="button" data-gfix="' + g.id + '">🔧 ' + t("getFixed") + "</button>" +
        (act ? "" : '<button class="btn ghost small" type="button" data-guse="' + g.id + '">' + t("useCar") + "</button>") +
        '<button class="btn ghost small" type="button" data-gphoto="' + g.id + '">📷 ' + t("photoShort") + '</button><button class="btn ghost small" type="button" data-gdel="' + g.id + '" aria-label="' + esc(t("gDelete")) + '">🗑</button></div>' +
        '<details class="more"><summary>' + t("gIssuesH") + '</summary><div data-giss="' + g.id + '">' + gIssuesHTML(g) + "</div></details>" +
        '<details class="more"' + (scans.length ? " open" : "") + "><summary>" + t("gScansH", { n: scans.length }) + '</summary><ul class="glist">' + sc + "</ul></details>" +
        '<details class="more"><summary>' + t("gSvcH", { n: hist.length }) + '</summary><ul class="glist">' + sv + "</ul></details>" +
        '<div class="rems"><p class="kick" style="margin:8px 0 4px">' + t("remH") + '</p><ul class="glist">' + rem + "</ul></div></article>";
    }).join("") + '<p class="note">' + t("gPrivacy") + "</p>";
    garage.forEach(function (g) {
      loadGIssues(g);
      if (g.pid) photoUrl(g.pid).then(function (u) { if (!u) return; D.querySelectorAll('.gph[data-ph="' + g.pid + '"]').forEach(function (el) { el.innerHTML = '<img src="' + u + '" alt="' + esc(t("photoAlt")) + '">'; }); });
    });
  }
  $("garageList").addEventListener("change", function (e) {
    var n = e.target.closest("[data-nick]"); if (!n) return;
    var g = gFind(n.getAttribute("data-nick")); if (!g) return; g.nick = n.value.trim().slice(0, 24) || g.model; gSave(); if (car.gid === g.id) { car.nick = g.nick; M.lsSet(CKEY, car); }
  });
  $("garageList").addEventListener("click", function (e) {
    var b;
    if ((b = e.target.closest("[data-guse]"))) { useCar(b.getAttribute("data-guse")).then(function () { renderGarage(); M.toast(t("usingCar", { n: gFind(car.gid).nick })); $("car").scrollIntoView({ behavior: M.RM ? "auto" : "smooth" }); }); return; }
    if ((b = e.target.closest("[data-gphoto]"))) { photoFor = b.getAttribute("data-gphoto"); $("photoIn").click(); return; }
    if ((b = e.target.closest("[data-gdel]"))) {
      var g = gFind(b.getAttribute("data-gdel")); if (!g || !confirm(t("gDelConfirm", { n: g.nick }))) return;
      if (g.pid) PH.del(g.pid);
      garage = garage.filter(function (x) { return x !== g; }); gSave(); if (car.gid === g.id) { car.gid = ""; M.lsSet(CKEY, car); } renderGarage(); badge(); return;
    }
    if ((b = e.target.closest("[data-gfix]"))) getFixed(b.getAttribute("data-gfix"));
  });
  /* "Get it fixed": load the car + pre-fill the job with every open code from its scan history (or a basic scan) */
  function getFixed(id) {
    useCar(id).then(function () {
      var g = gFind(id), open = {};
      (g.scans || []).forEach(function (s) { s.codes.forEach(function (c) { if (codeStatus(id, c.c) === "open") open[c.c] = 1; }); });
      var codes = Object.keys(open);
      codes.forEach(function (code) { addCodeJobs(code); });
      if (!job.length) job.push({ svc: "diag", opt: "scan" });
      saveJob();
      var last = (g.scans || [])[g.scans ? g.scans.length - 1 : 0];
      $("problem").value = codes.length ? t("fixProblem", { c: codes.join(", "), d: last ? M.fDay(last.at) : "" }) : "";
      saveCar(); renderGarage();
      M.toast(codes.length ? t("fixFilled", { n: codes.length }) : t("fixBasic"));
      $("quote").scrollIntoView({ behavior: M.RM ? "auto" : "smooth" });
    });
  }
  /* scan history: every scan / typed code goes on the current car (and its garage card) */
  function logScan(src, codes, extra) {
    car.scans = (car.scans || []).concat([Object.assign({ at: new Date().toISOString(), src: src, codes: codes }, extra || {})]).slice(-30);
    saveCar(); renderGarage();
  }

  /* ---------- Tesla card + EV scan note ---------- */
  function renderTesla() {
    var tes = String(car.make || "").toUpperCase() === "TESLA", ev = PT.isEV(car);
    $("teslaCard").hidden = !tes;
    if (tes) {
      var r = issuesData && issuesData.r && issuesData.r.ok, ota = r ? r.filter(function (x) { return x.ota; }).length : 0;
      $("tsOta").innerHTML = r ? t("tsOta", { n: r.length, o: ota }) : t("tsOtaWait");
    }
    $("evNote").hidden = !ev; $("btCard").hidden = tes;
    $("evNoteTxt").innerHTML = tes ? t("evTesla") : t("evOther");
    $("scanFor").textContent = carLabel() ? t("scanFor", { c: carLabel() }) + (car.gid ? "" : " " + t("scanSaveHint")) : "";
  }

  /* ---------- exploded-view diagram (diagrams.js) + verified specs (fueleconomy.gov) ---------- */
  var dgCur = null, dgView = null, dgSpecKey = "";
  var DG_DEFAULT = ["hood", "bumperF", "lights", "motor", "battery", "suspF", "brakesF", "wheels", "interior", "hatch"];
  function dgEV(m) { return PT.isEV(car) || !!(m && m.d.ev); }
  function dgName() { return [title(car.make), car.model].filter(Boolean).join(" "); }
  function renderDiagram() {
    var card = $("dgmCard"), soon = $("dgSoon");
    if (!W.DIAG || !car.make || car.make === "__other" || !car.model) { card.hidden = true; soon.hidden = true; dgCur = null; return; }
    W.DIAG.load().then(function () {
      var m = W.DIAG.match(car), ev = dgEV(m);
      dgCur = m; card.hidden = !m; soon.hidden = !!m;
      if (!m) return;
      var d = m.d, src = W.DIAG.BASE + (d.small || d.file);
      $("dgH").textContent = t("dgH", { c: dgName() });
      if ($("dgImg").getAttribute("src") !== src) $("dgImg").src = src;
      $("dgImg").style.aspectRatio = d.w && d.h ? d.w + " / " + d.h : "";
      $("dgImg").alt = t("dgAlt", { c: dgName() });
      $("dgTable").hidden = !d.imageHasSpecTable;
      $("dgYear").hidden = m.yearOk; if (!m.yearOk) $("dgYear").textContent = t("dgYear", { d: d.drawn || d.years.join("–"), y: car.year });
      var gs = (d.hotspots && d.hotspots.length ? d.hotspots.map(function (h) { return h.g; }) : DG_DEFAULT).filter(function (g, i, a) { return a.indexOf(g) === i && W.DIAG.groupFor(g, ev); });
      $("dgChips").innerHTML = gs.map(function (g) { var G = W.DIAG.groupFor(g, ev); return '<button type="button" class="pill dgchip" data-g="' + g + '">' + G.icon + " " + esc(p(G.label)) + "</button>"; }).join("");
      renderSpecs();
    });
  }
  function renderSpecs() {
    var box = $("dgSpec");
    if (!car.year) { dgSpecKey = ""; box.innerHTML = '<p class="note">' + t("dgSpecPick") + "</p>"; return; }
    var k = [car.year, car.make, car.model].join("|"); dgSpecKey = k;
    box.innerHTML = '<p class="note">' + t("dgSpecLoad") + "</p>";
    W.DIAG.specs(car.year, car.make, car.model).then(function (r) {
      if (k !== dgSpecKey) return;
      if (!r || r.err) { box.innerHTML = '<p class="note">' + t("dgSpecErr") + "</p>"; return; }
      if (!r.rows.length) { box.innerHTML = '<p class="note">' + t("dgSpecNone") + "</p>"; return; }
      box.innerHTML = r.rows.map(function (row) {
        return '<div class="dgrow"><b>' + esc(r.year + " " + row.name) + "</b><span>" + row.bits.map(function (b) {
          if (b.k === "range") return t("sp_range", { v: b.v });
          if (b.k === "mpge") return t("sp_mpge", { v: b.v });
          if (b.k === "mpg") return t("sp_mpg", { v: b.v, c: b.c, h: b.h });
          if (b.k === "hybrid") return t("sp_hybrid");
          return esc(b.v);
        }).join(" · ") + "</span></div>";
      }).join("") + '<p class="src">✓ <a href="' + esc(r.url) + '" target="_blank" rel="noopener">' + t("dgSrc") + " ↗</a></p>";
    });
  }
  function dgPick(g) {
    var G = W.DIAG.groupFor(g, dgEV(dgCur)); if (!G) return;
    openSheet(G.svc, { svc: G.svc, opt: G.opt, pos: G.pos, label: G.label });
  }
  $("dgChips").addEventListener("click", function (e) { var b = e.target.closest("[data-g]"); if (b) dgPick(b.getAttribute("data-g")); });
  $("dgOpen").addEventListener("click", function () {
    if (!dgCur) return;
    if (!dgView) dgView = W.DIAG.Viewer({ onPick: dgPick });
    dgView.open(dgCur.d, { title: t("dgTitle", { c: dgName() }), hsLabel: t("dgParts"), closeLabel: t("dgClose"), foot: t("dgFoot"), alt: t("dgAlt", { c: dgName() }), ev: dgEV(dgCur), esc: esc, p: p });
  });

  /* ---------- sheets ---------- */
  var lastFocus = null;
  function open(id) { lastFocus = D.activeElement; var s = $(id); s.classList.add("on"); s.setAttribute("aria-hidden", "false"); setTimeout(function () { var f = s.querySelector(".x"); if (f) f.focus({ preventScroll: true }); }, 50); }
  function close(id) { var s = $(id); s.classList.remove("on"); s.setAttribute("aria-hidden", "true"); // never hand focus back to a text field: on phones that pops the keyboard (number pad) open over the page
    if (lastFocus && lastFocus.focus && !/^(INPUT|TEXTAREA|SELECT)$/.test(lastFocus.tagName) && !lastFocus.isContentEditable) try { lastFocus.focus({ preventScroll: true }); } catch (e) {} }
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
  M.onChange(function () { renderTrack(); checkNew(); renderDays(); renderGarage(); });
  W.addEventListener("focus", function () { M.fire(); });
  D.addEventListener("visibilitychange", function () { if (!D.hidden) M.fire(); });

  /* ---------- boot ---------- */
  function renderAll() {
    brand(); heroScene(); renderSvcs(); renderBA(); fillYearMake(); fillDetails(); badge(); renderCar(false); renderJob(); renderDays(); renderHours(); renderTrack(); bell();
    renderFinder(); modelC.placeholder(t("pickModel")); if (modelMsg) $("modelMsg").textContent = t(modelMsg[0], modelMsg[1]); renderIssues(); renderScan(); renderPaint(); renderGarage(); renderTesla(); renderDiagram(); if (partsIt && $("partsSh").classList.contains("on")) drawParts();
  }
  M.onLang(function () { if (booted) renderAll(); });
  var booted = false;
  M.applyLang();
  dayIdx = firstOpenDay();
  if (slot) { var ds = M.days(); ds.forEach(function (d, i) { if (d.slots.some(function (s) { return s.start === slot.start; })) dayIdx = i; }); }
  $("miles").value = car.miles || ""; $("problem").value = car.problem || ""; $("vin").value = car.vin || ""; $("modelTxt").value = car.make === "__other" ? car.model || "" : "";
  if (car.body && !W.CAR.bodies.includes(car.body)) car.body = "";
  renderPhoto();
  syncAlertsUI();
  booted = true; renderAll(); badge();
  loadMakes();
  if (car.year && car.make) loadModels().then(function () { loadIssues(); });
  // don't fire banners for alerts that arrived while the page was closed? We DO show them: that's the point of the tracker.
  checkNew();
  navSpy();
})();
