/* SousShift AI — Auto shop demo: the owner's side (/demo/mechanic/shop/). Needs ../config.js + ../core.js.
   DEMO ONLY gate: the PIN is printed on the page. Writes go to the same localStorage key the customer page reads,
   so advancing a stage here moves the customer's tracker in another tab of the same browser. Nothing is sent. */
(function () {
  "use strict";
  var M = window.MECH, C = M.C, t = M.t, esc = M.esc, D = document;
  var $ = function (id) { return D.getElementById(id); };
  var UKEY = "ssai:mech:shop:unlocked", tab = "new", cur = null, photo = false;
  function unlocked() { try { return sessionStorage.getItem(UKEY) === "1"; } catch (e) { return false; } }
  function setUnlocked(v) { try { if (v) sessionStorage.setItem(UKEY, "1"); else sessionStorage.removeItem(UKEY); } catch (e) {} }

  $("bName").textContent = C.brand.name;
  $("logo").src = (/^(https?:)?\//.test(C.brand.logo) ? "" : "../") + C.brand.logo;
  $("demoPin").textContent = C.demoPin;
  D.title = t("_title", { name: C.brand.name });
  $("qrLink").href = "../" + (location.search ? location.search + "&" : "?") + "print=qr#pay";

  function gate() { var u = unlocked(); $("gate").hidden = u; $("app").hidden = !u; if (u) { M.seedSamples(); render(); sources(); tires(); } }
  /* tire inventory editor (DEMO: localStorage via MECH.tires / saveTires) */
  function tires() {
    D.querySelectorAll("#taType option").forEach(function (o) { o.textContent = M.tireType(o.value); });
    var list = M.tires();
    $("tiRows").innerHTML = list.map(function (x, i) {
      return '<div class="trow' + (x.qty > 0 ? "" : " out") + '"><div><b>' + esc(x.size) + '</b> <span class="pill">' + esc(M.tireType(x.type)) + "</span><small>" + esc(x.brand + (x.line ? " · " + x.line : "")) + "</small></div>" +
        '<label class="tiq"><span class="sr">' + t("tiQtyL") + '</span><input data-tq="' + i + '" inputmode="numeric" maxlength="3" value="' + (+x.qty || 0) + '"></label>' +
        '<label class="tiq"><span class="sr">' + t("taPrice") + '</span><input data-tp="' + i + '" inputmode="decimal" maxlength="7" placeholder="' + esc(t("askQ")) + '" value="' + (x.price > 0 ? x.price : "") + '"></label>' +
        '<button class="x" type="button" data-td="' + i + '" aria-label="' + esc(t("tiDel")) + '">✕</button></div>';
    }).join("");
  }
  $("tiRows").addEventListener("change", function (e) {
    var el = e.target, list = M.tires(), i;
    if (el.hasAttribute("data-tq")) { i = +el.getAttribute("data-tq"); list[i].qty = Math.max(0, parseInt(el.value, 10) || 0); }
    else if (el.hasAttribute("data-tp")) { i = +el.getAttribute("data-tp"); var v = parseFloat(String(el.value).replace(/[^\d.]/g, "")); list[i].price = v > 0 ? v : null; }
    else return;
    M.saveTires(list); M.toast(t("taOk", { s: esc(list[i].size) })); tires();
  });
  $("tiRows").addEventListener("click", function (e) { var b = e.target.closest("[data-td]"); if (!b) return; var list = M.tires(); list.splice(+b.getAttribute("data-td"), 1); M.saveTires(list); tires(); });
  $("tiAdd").addEventListener("submit", function (e) {
    e.preventDefault();
    var n = M.normSize($("taSize").value); if (!n) { $("taMsg").textContent = t("taBad"); return; }
    var bl = $("taBrand").value.trim().split("·"), pr = parseFloat(String($("taPrice").value).replace(/[^\d.]/g, ""));
    var list = M.tires(), x = { id: "u" + Date.now().toString(36), brand: (bl[0] || "").trim() || "—", line: (bl[1] || "").trim(), size: n.size, type: $("taType").value, qty: Math.max(0, parseInt($("taQty").value, 10) || 0), price: pr > 0 ? pr : null };
    list.unshift(x); M.saveTires(list);
    $("taMsg").textContent = t("taOk", { s: n.size }); ["taSize", "taBrand", "taQty", "taPrice"].forEach(function (id) { $(id).value = ""; }); tires();
  });
  $("tiReset").addEventListener("click", function () { if (confirm(t("tiResetQ"))) { M.resetTires(); tires(); } });
  /* parts sources (config.suppliers): business info only, call for price & availability */
  function sources() {
    var list = C.suppliers || []; $("srcCard").hidden = !list.length;
    $("srcList").innerHTML = list.map(function (s) {
      return '<div class="supp"><div class="sh">' + (s.preferred ? '<span class="badge">⭐ ' + t("prefSupp") + "</span>" : "") + "<b>" + esc(s.name) + "</b><small>" + esc(s.address || s.area || "") + "</small></div>" +
        '<p class="note">' + esc(M.p(s.note)) + "</p>" + (s.hours ? '<p class="note">🕗 ' + esc(M.p(s.hours)) + "</p>" : "") +
        '<div class="row sb">' + (s.tel ? '<a class="btn primary small" href="tel:' + esc(s.tel) + '">📞 ' + esc(s.phone || t("call")) + "</a>" : "") +
        (s.mapsUrl ? '<a class="btn ghost small" href="' + esc(s.mapsUrl) + '" target="_blank" rel="noopener">🧭 ' + t("directions") + "</a>" : "") +
        (s.website ? '<a class="btn ghost small" href="' + esc(s.website) + '" target="_blank" rel="noopener">🌐 ' + t("website") + "</a>" : "") + "</div></div>";
    }).join("") + '<p class="fine">' + t("srcHonest") + "</p>";
  }
  $("pinForm").addEventListener("submit", function (e) {
    e.preventDefault();
    if ($("pin").value.trim() === String(C.demoPin)) { setUnlocked(true); $("pin").value = ""; $("pinMsg").textContent = ""; gate(); }
    else $("pinMsg").textContent = t("gBad");
  });
  $("lock").addEventListener("click", function () { setUnlocked(false); gate(); });

  function bucket(r) { return r.status === "declined" ? "done" : r.status === "requested" ? "new" : r.stage >= 6 ? "done" : "act"; }
  function chs(r) { var a = r.alerts || {}, o = [t("aApp")]; if (a.text) o.push(t("aText")); if (a.email) o.push(t("aEmail")); return o; }
  function carOf(r) { return M.carName(r.car) || "—"; }

  function render() {
    var all = M.all();
    $("kNew").textContent = all.filter(function (r) { return bucket(r) === "new"; }).length;
    $("kAct").textContent = all.filter(function (r) { return bucket(r) === "act"; }).length;
    $("kDone").textContent = all.filter(function (r) { return r.stage >= 6 && r.status !== "declined"; }).length;
    D.querySelectorAll("[data-tab]").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-tab") === tab ? "true" : "false"); });
    var list = all.filter(function (r) { return tab === "all" || bucket(r) === tab; });
    $("list").innerHTML = list.length ? list.map(card).join("") : '<div class="empty" style="margin-top:8px">' + t("empty") + "</div>";
  }
  function card(r) {
    var st = r.status === "declined" ? '<span class="st no">' + esc(t("decline")) + "</span>" : r.status === "requested" ? '<span class="st req">' + t("tNew") + "</span>" : r.stage >= 6 ? '<span class="st done">' + esc(M.stageName(6)) + "</span>" : '<span class="st go">' + esc(M.stageName(r.stage)) + "</span>";
    var PT = window.PARTS, sup = PT && PT.supplier(), anyParts = false;
    var items = (r.items || []).map(function (it, ix) {
      var pr = M.price(it), pl = PT ? PT.forItem(it, r.car || {}) : null, say = "";
      if (pl && !pl.na && pl.parts.length) {
        say = pl.parts.map(function (pp, j) {
          var sc = PT.script(pp, r.car || {}, M.lang(), it); if (!sc) return "";
          anyParts = true;
          return '<div class="say"><b style="font-size:14px">' + esc(M.p(pp.name)) + "</b><p>" + esc(sc) + '</p><div class="sayb"><button type="button" class="btn ghost small" data-copy="' + r.id + "|" + ix + "|" + j + '">📋 ' + t("copy") + "</button>" +
            (sup && sup.tel ? '<a class="btn primary small" href="tel:' + esc(sup.tel) + '">📞 ' + esc(t("callN", { n: sup.short || sup.name })) + "</a>" : "") + "</div></div>";
        }).join("");
      }
      return "<li>" + esc(M.itemName(it)) + ' <small style="color:var(--dim)">' + esc(M.prTxt(pr)) + "</small>" + (it.codes && it.codes.length ? ' <span class="pill acc">' + esc(it.codes.join(", ")) + "</span>" : "") +
        (say ? '<details class="more" style="margin:6px 0"><summary>🔩 ' + esc(t("whatToAsk", { n: sup ? sup.short || sup.name : t("theStore") })) + "</summary>" + say + "</details>" : "") + "</li>";
    }).join("");
    var pct = r.stage >= 0 ? M.STAGES[r.stage].pct : 0;
    var acts = "";
    if (r.status === "requested") acts = '<button class="btn primary" type="button" data-act="accept" data-id="' + r.id + '">' + t("accept") + '</button><button class="btn ghost" type="button" data-act="decline" data-id="' + r.id + '">' + t("decline") + "</button>";
    else if (r.status === "accepted" && r.stage < 6) acts = '<button class="btn primary" type="button" data-act="advance" data-id="' + r.id + '">' + esc(t("advance", { s: M.stageName(r.stage + 1) })) + '</button><button class="btn cyan" type="button" data-act="notify" data-id="' + r.id + '">' + t("notify") + "</button>";
    else if (r.status === "accepted") acts = '<button class="btn cyan" type="button" data-act="notify" data-id="' + r.id + '">' + t("notify") + "</button>";
    return '<article class="card oc"><div class="top2"><div><b>🚗 ' + esc(carOf(r)) + "</b><small>" + esc(r.name || t("customer")) + " · " + esc(r.id) + " · " + esc(M.fWhen(r.createdAt)) + "</small></div>" + st + "</div>" +
      '<div class="meta">' + (r.sample ? '<span class="pill">' + t("sampleTag") + "</span>" : '<span class="pill acc">' + t("fromPage") + "</span>") +
      (r.car && r.car.miles ? '<span class="pill">' + esc(r.car.miles) + " mi</span>" : "") + '<span class="pill">' + t("alertsL") + " " + esc(chs(r).join(" + ")) + "</span></div>" +
      (r.problem ? '<div class="prob">“' + esc(r.problem) + "”</div>" : "") + "<ul>" + items + "</ul>" +
      (anyParts ? '<button type="button" class="btn ghost small w100" style="margin:6px 0" data-copyall="' + r.id + '">📋 ' + t("copyAll") + "</button>" : "") +
      '<div class="meta"><span class="pill acc">' + t("est") + " " + esc(M.totTxt(r.est)) + "</span>" + (r.quote ? '<span class="pill ok">' + t("quote") + " " + M.money(r.quote) + "</span>" : "") +
      '<span class="pill">' + t("arrival") + " " + esc(r.slot ? M.fSlot(r.slot) : t("noSlot")) + "</span>" + (r.readyBy ? '<span class="pill">' + t("ready") + " " + esc(M.fWhen(r.readyBy)) + "</span>" : "") + "</div>" +
      (r.status === "accepted" ? '<div class="mini"><i style="width:' + pct + '%"></i></div><small style="color:var(--dim)">' + pct + "% · " + esc(M.stageName(r.stage)) + "</small>" : "") +
      (acts ? '<div class="acts">' + acts + "</div>" : "") + "</article>";
  }
  D.querySelectorAll("[data-tab]").forEach(function (b) { b.addEventListener("click", function () { tab = b.getAttribute("data-tab"); render(); }); });

  function copyText(s) {
    function fb() { var ta = D.createElement("textarea"); ta.value = s; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0"; D.body.appendChild(ta); ta.select(); var ok = false; try { ok = D.execCommand("copy"); } catch (e) {} D.body.removeChild(ta); return ok; }
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(s).then(function () { return true; }, function () { return fb(); });
    return Promise.resolve(fb());
  }
  $("list").addEventListener("click", function (e) {
    var cp = e.target.closest("[data-copy]"), ca = e.target.closest("[data-copyall]");
    if (cp) {
      var k = cp.getAttribute("data-copy").split("|"), rq = M.get(k[0]), it = rq && rq.items[+k[1]], pl = it && window.PARTS.forItem(it, rq.car || {});
      if (pl && pl.parts[+k[2]]) copyText(window.PARTS.script(pl.parts[+k[2]], rq.car || {}, M.lang(), it)).then(function (ok) { M.toast(ok ? t("copied") : t("copyFail")); });
      return;
    }
    if (ca) { var rr = M.get(ca.getAttribute("data-copyall")); if (rr) copyText(window.PARTS.jobList(rr.items || [], rr.car || {}, M.lang())).then(function (ok) { M.toast(ok ? t("copiedAll") : t("copyFail")); }); return; }
    var b = e.target.closest("[data-act]"); if (!b) return;
    var r = M.get(b.getAttribute("data-id")); if (!r) return; cur = r.id;
    var a = b.getAttribute("data-act");
    if (a === "accept") {
      $("accS").textContent = carOf(r) + " · " + M.totTxt(r.est);
      $("accQ").value = Math.round((r.est.lo + r.est.hi) / 2 / 5) * 5;
      $("accN").value = t("accNote", { w: r.slot ? M.fWhen(r.slot.start) : "soon" });
      open("acc");
    } else if (a === "decline") {
      r.status = "declined"; M.notify(r, t("declinedT"), t("declinedB"), "update"); M.put(r); render();
    } else if (a === "advance") {
      $("advS").textContent = carOf(r) + " · " + M.stageName(r.stage);
      $("advTo").innerHTML = M.STAGES.map(function (s, i) { return i > r.stage ? '<option value="' + i + '"' + (i === r.stage + 1 ? " selected" : "") + ">" + s.icon + " " + esc(M.p(s)) + "</option>" : ""; }).join("");
      $("advN").value = ""; photo = false; drawPhoto(); $("advNotify").checked = true; open("adv");
    } else if (a === "notify") {
      $("ntfS").textContent = carOf(r);
      $("ntfTpl").innerHTML = t("tpl").map(function (x, i) { return '<button type="button" class="op" data-tpl="' + i + '" aria-pressed="false"><span class="r"></span><div><b style="font-size:15px">' + esc(x) + "</b></div></button>"; }).join("");
      $("ntfM").value = ""; $("ntfCh").textContent = t("ntfCh", { c: chs(r).join(" + ") }); open("ntf");
    }
  });
  $("accGo").addEventListener("click", function () {
    var r = M.get(cur); if (!r) return;
    var q = parseFloat(String($("accQ").value).replace(/[^\d.]/g, "")) || Math.round((r.est.lo + r.est.hi) / 2);
    r.status = "accepted"; r.quote = Math.round(q); r.stage = 0;
    r.history = [{ stage: 0, at: new Date().toISOString(), note: $("accN").value.trim(), photo: false }];
    M.notify(r, t("accepted"), t("acceptedB", { c: carOf(r), q: M.money(r.quote) }), "update");
    M.api.send("/requests/" + r.id + "/accept", { quote: r.quote });
    M.put(r); close("acc"); M.toast(t("toastAcc")); render();
  });
  function drawPhoto() { D.querySelectorAll("#advP [data-ph]").forEach(function (b) { b.setAttribute("aria-pressed", (b.getAttribute("data-ph") === "1") === photo ? "true" : "false"); }); }
  $("advP").addEventListener("click", function (e) { var b = e.target.closest("[data-ph]"); if (!b) return; photo = b.getAttribute("data-ph") === "1"; drawPhoto(); });
  $("advGo").addEventListener("click", function () {
    var r = M.get(cur); if (!r) return;
    var to = +$("advTo").value; if (!(to > r.stage)) return;
    r.stage = to; r.history = r.history || [];
    r.history.push({ stage: to, at: new Date().toISOString(), note: $("advN").value.trim(), photo: photo });
    if (to >= 5 && !r.readyBy) r.readyBy = new Date(Date.now() + 30 * 6e4).toISOString();
    if (to === 6) r.readyBy = new Date().toISOString();
    var chans = null;
    if ($("advNotify").checked) {
      var s = M.STAGES[to], c = carOf(r);
      var body = to === 5 ? t("almostB", { c: c }) : to === 6 ? t("readyB", { c: c, q: M.money(r.quote || r.est.hi) }) : ($("advN").value.trim() || t("stageB", { c: c }));
      chans = M.notify(r, s.icon + " " + M.p(s), body, to === 5 ? "almost" : to === 6 ? "ready" : "update");
    }
    M.api.send("/requests/" + r.id + "/stage", { stage: to });
    M.put(r); close("adv"); M.toast(t("toastAdv", { s: M.stageName(to) }) + (chans && chans.length > 1 ? " · " + chans.join(" + ") : "")); render();
  });
  $("ntfTpl").addEventListener("click", function (e) {
    var b = e.target.closest("[data-tpl]"); if (!b) return;
    D.querySelectorAll("#ntfTpl [data-tpl]").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
    $("ntfM").value = t("tpl")[+b.getAttribute("data-tpl")];
  });
  $("ntfGo").addEventListener("click", function () {
    var r = M.get(cur), m = $("ntfM").value.trim(); if (!r || !m) { $("ntfM").focus(); return; }
    var c = M.notify(r, t("msgT", { n: C.brand.name }), m, "manual"); M.put(r); close("ntf");
    M.toast(t("toastNtf", { c: c.map(function (x) { return t(x === "app" ? "aApp" : x === "text" ? "aText" : "aEmail"); }).join(" + ") })); render();
  });
  $("reset").addEventListener("click", function () { M.lsSet(M.KEY, []); M.seedSamples(); M.fire(); M.toast(t("toastReset")); });

  /* sheets */
  function open(id) { var s = $(id); s.classList.add("on"); s.setAttribute("aria-hidden", "false"); }
  function close(id) { var s = $(id); s.classList.remove("on"); s.setAttribute("aria-hidden", "true"); }
  D.querySelectorAll(".sheet").forEach(function (s) { s.setAttribute("aria-hidden", "true"); s.addEventListener("click", function (e) { if (e.target === s || e.target.closest("[data-close]")) close(s.id); }); });
  D.addEventListener("keydown", function (e) { if (e.key === "Escape") D.querySelectorAll(".sheet.on").forEach(function (s) { close(s.id); }); });

  M.onChange(function () { if (unlocked()) render(); });
  M.onLang(function () { if (unlocked()) { render(); sources(); tires(); } });
  M.applyLang();
  gate();
})();
