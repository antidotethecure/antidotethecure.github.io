/* SousShift AI — Auto shop demo: business-type switch, tire stock checker and QR pay (customer page).
   Needs config.js, core.js, app.js. DEMO: sample tire stock, no payments are processed, no real accounts.
   The shop name from ?shop= only ever goes into textContent / esc(), never raw HTML. */
(function () {
  "use strict";
  var M = window.MECH, C = M.C, t = M.t, p = M.p, esc = M.esc, D = document, W = window;
  var $ = function (id) { return D.getElementById(id); };
  var B = W.BIZ_TYPES || {};

  /* ---------- business type switch (state lives in the URL: ?type=…&shop=…) ---------- */
  function urlFor(type) {
    var u = new URL(location.href); u.searchParams.set("type", type); u.hash = ""; return u.pathname + u.search;
  }
  function renderBiz() {
    $("bizSw").innerHTML = Object.keys(B).map(function (k) {
      return '<a href="' + esc(urlFor(k)) + '" aria-current="' + (k === C.type ? "true" : "false") + '"><span aria-hidden="true">' + B[k].icon + "</span>" + esc(p(B[k].label)) + "</a>";
    }).join("");
  }
  /* tire shop: tire checker + pay right under the hero; everyone else keeps them after Services */
  (function order() {
    var hero = D.querySelector(".hero"), tires = $("tires"), pay = $("pay"), svcs = $("services");
    if (C.biz && C.biz.tiresFirst) { hero.after(tires); tires.after(pay); }
    else { svcs.after(tires); }
    /* quick actions up top, right under the business switch, so customers see everything first */
    var bz = D.querySelector(".bizsw"); bz.after($("quick"));
    if (/[?&]shop=/.test(location.search) || C.client) bz.hidden = true;   // personalized pitch link / client app: no demo switch
    if (C.type === "tire") { var q = $("quick"), a = $("qkTires"), pl = q.querySelector('a[href="#pay"]'); q.prepend(pl); q.prepend(a); }
    D.body.setAttribute("data-biz", C.type);
  })();

  /* ---------- tire stock checker ---------- */
  var tiFilter = "all", last = null;
  function stock() { return M.tires(); }
  function priceLine(x) { return x.price > 0 ? t("tiPrice", { p: M.money(x.price) }) : t("askQ"); }
  function renderFil() {
    var types = ["all"].concat(["allseason", "perf", "truck", "winter"].filter(function (k) { return stock().some(function (x) { return x.type === k; }); }));
    $("tiFil").innerHTML = types.map(function (k, i) {
      var lbl = i === 0 ? t("tiAll") : M.tireType(k), id = i === 0 ? "" : k;
      return '<button type="button" data-tf="' + id + '" aria-pressed="' + ((tiFilter === "all" && !id) || tiFilter === id ? "true" : "false") + '">' + esc(lbl) + "</button>";
    }).join("");
  }
  function row(x, hold) {
    return '<div class="trow' + (x.qty > 0 ? "" : " out") + '"><div><b>' + esc(x.size) + "</b> <span class=\"pill\">" + esc(M.tireType(x.type)) + "</span><small>" + esc(x.brand + " · " + x.line) + " · " + esc(priceLine(x)) + "</small></div>" +
      '<span class="tq">' + esc(t("tiQ", { q: x.qty })) + "</span>" + (hold ? '<button class="btn primary small" type="button" data-hold="' + esc(x.id) + '">' + esc(t("tiHold", { q: Math.min(hold, x.qty) })) + "</button>" : "") +
      (x.pay && x.qty > 0 && /^https:\/\/buy\.stripe\.com\//.test(x.pay) ? '<a class="btn cyan small" href="' + esc(x.pay) + '" target="_blank" rel="noopener">' + esc(t("tiPayOn")) + "</a>" : "") + "</div>";
  }
  function renderList() {
    renderFil();
    var list = stock().filter(function (x) { return x.qty > 0 && (tiFilter === "all" || x.type === tiFilter); });
    $("tiList").innerHTML = list.length ? list.map(function (x) { return row(x, 0); }).join("") : '<div class="empty">' + t("tiNone") + "</div>";
  }
  function check() {
    var v = $("tiIn").value.trim(), out = $("tiOut");
    if (!v) { out.innerHTML = '<p class="note">' + t("tiEmpty") + "</p>"; return; }
    var n = M.normSize(v);
    if (!n) { out.innerHTML = '<p class="note warnline">' + t("tiBad") + "</p>"; last = null; return; }
    var want = +$("tiQty").value || 4, hits = stock().filter(function (x) { return x.size === n.size && x.qty > 0; }), tot = hits.reduce(function (a, x) { return a + x.qty; }, 0);
    last = { size: n.size, want: want };
    if (hits.length) {
      out.innerHTML = '<div class="tires-res ok"><p class="big">' + esc(t("tiIn", { n: tot })) + '</p><p class="note">' + esc(t("tiInSub", { s: n.size, k: hits.length })) + "</p>" +
        hits.map(function (x) { return row(x, want); }).join("") + (tot < want ? '<p class="note">' + esc(t("tiLow", { n: tot })) + "</p>" : "") + "</div>";
    } else {
      out.innerHTML = '<div class="tires-res no"><p class="big">' + esc(t("tiOut")) + '</p><p class="note">' + esc(t("tiOutSub", { s: n.size, d: t("tiOrderBy", { n: C.tireOrderDays || "2–3" }) })) + "</p>" +
        '<button class="btn primary w100" type="button" data-order="1">' + esc(t("tiReq", { q: want, s: n.size })) + "</button>" +
        (C.orderLink ? '<a class="btn cyan w100" style="margin-top:8px" href="' + esc(C.orderLink) + '" target="_blank" rel="noopener">' + esc(t("tiDep")) + "</a>" : "") + "</div>";
    }
  }
  $("tiForm").addEventListener("submit", function (e) { e.preventDefault(); check(); });
  $("tiQty").addEventListener("change", function () { if (last) check(); });
  $("tiFil").addEventListener("click", function (e) { var b = e.target.closest("[data-tf]"); if (!b) return; tiFilter = b.getAttribute("data-tf") || "all"; renderList(); });
  function hold(x, q) {
    var it = { svc: "tires", opt: "hold", tid: "S" + x.id, note: t("tiNoteHold", { q: q, s: x.size, b: x.brand, l: x.line }) };
    if (x.price > 0) it.fixed = x.price * q;
    M.addItem(it); M.toast(esc(t("tiHeld", { n: q + " × " + x.size })));
  }
  D.addEventListener("click", function (e) {
    var h = e.target.closest("[data-hold]");
    if (h) { var x = stock().filter(function (y) { return y.id === h.getAttribute("data-hold"); })[0]; if (x) hold(x, Math.min(last ? last.want : 4, x.qty) || 1); return; }
    var o = e.target.closest("[data-order]");
    if (o && last) { M.addItem({ svc: "tires", opt: "hold", tid: "O" + last.size, note: t("tiNoteOrder", { q: last.want, s: last.size }) }); M.toast(esc(t("tiHeld", { n: last.want + " × " + last.size }))); }
  });

  /* ---------- factory tire size for the customer's car (tiresizes.js) ---------- */
  function sizesFor(c) {
    var TS = W.TIRE_SIZES || {}, mk = (c.make || "").toLowerCase().trim(), md = (c.model || "").toLowerCase().trim(), y = +c.year || 0;
    if (!mk || !md) return null;
    var rows = TS[mk + "|" + md] || TS[mk + "|" + md.split(/[\s-]/)[0]];
    if (!rows) return [];
    return rows.filter(function (r) { return !y || (y >= r.y[0] && y <= r.y[1]); });
  }
  function renderCarSize() {
    var c = M.curCar ? M.curCar() : {}, rows = sizesFor(c), html = "";
    if (rows) {
      var nm = [c.year, c.make, c.model].filter(Boolean).join(" ");
      html = '<div class="card tisz"><p class="kick">' + esc(t("tzK")) + "</p><b>" + esc(nm) + "</b>" +
        (rows.length ? '<div class="chipline">' + rows.map(function (r) {
          var lbl = r.s + (r.r ? " / " + r.r : "");
          return '<button type="button" class="chip" data-tz="' + esc(r.s) + '">' + esc(lbl) + (r.t ? " <small>" + esc(r.t) + "</small>" : "") + "</button>";
        }).join("") + '</div><p class="note">' + esc(t("tzNote")) + "</p>"
        : '<p class="note">' + esc(t("tzNone")) + "</p>") + "</div>";
    }
    ["tiCar", "carTires"].forEach(function (id) { var el = $(id); if (el) el.innerHTML = html; });
  }
  D.addEventListener("mech:car", renderCarSize);
  D.addEventListener("click", function (e) {
    var b = e.target.closest("[data-tz]"); if (!b) return;
    $("tiIn").value = b.getAttribute("data-tz"); check();
    $("tires").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  /* back from Stripe checkout */
  (function paid() {
    var m = location.search.match(/[?&]paid=([a-z0-9]+)/i); if (!m) return;
    var x = stock().filter(function (y) { return y.id === m[1]; })[0];
    setTimeout(function () { M.toast(esc(t("tiPaid", { n: x ? x.size : t("tiOrderW") }))); }, 600);
  })();

  /* ---------- QR pay ---------- */
  var PAY = C.pay || { url: "https://pay.example.com/yourshop?demo=1", handle: "yourshop", methods: [] };
  function qr(box, data, cell) {
    function paint() { try { var q = W.qrcode(0, "M"); q.addData(data); q.make(); box.innerHTML = q.createSvgTag({ cellSize: cell || 4, margin: 2, scalable: true }); } catch (x) { box.textContent = "QR"; } }
    if (W.qrcode) paint();
    else {
      var pend = W.__qrPend = W.__qrPend || [];
      pend.push(paint);
      if (pend.length === 1) { var sc = D.createElement("script"); sc.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js"; sc.onload = function () { pend.splice(0).forEach(function (f) { f(); }); }; sc.onerror = function () { pend.splice(0); D.querySelectorAll(".qrbox,.qpc-qr").forEach(function (b) { b.textContent = PAY.url; }); }; D.head.appendChild(sc); }
    }
  }
  function chips() { return (PAY.methods || []).map(function (m) { return '<span class="pm"><i aria-hidden="true">' + esc(m.icon) + "</i>" + esc(p(m)) + "</span>"; }).join(""); }
  function amount() { var job = M.curJob ? M.curJob() : [], tt = M.total(job); return tt.n ? M.totTxt(tt) : ""; }
  function renderPay() {
    $("payName").textContent = C.brand.name;
    var a = amount(); $("payAmt").textContent = a ? t("payAmtQ", { t: a }) : t("payAmtNone");
    $("payMethods").innerHTML = chips();
    $("qpcName").textContent = C.brand.name;
    $("qpcM").innerHTML = chips();
    $("qpcLogo").src = C.brand.logo;
  }
  qr($("payQr"), PAY.url, 4); qr($("qpcQr"), PAY.url, 6);
  function openSh(id) { var s = $(id); s.classList.add("on"); s.setAttribute("aria-hidden", "false"); }
  $("payTry").addEventListener("click", function () {
    $("pyS").textContent = C.brand.name;
    $("pyAmt").textContent = amount() || t("pyInv");
    $("pyMethods").innerHTML = (PAY.methods || []).map(function (m) { return '<button type="button" class="pm big" data-pm="' + esc(m.id) + '"><i aria-hidden="true">' + esc(m.icon) + "</i>" + esc(p(m)) + "</button>"; }).join("");
    $("pyMsg").textContent = ""; openSh("paySh");
  });
  $("pyMethods").addEventListener("click", function (e) {
    var b = e.target.closest("[data-pm]"); if (!b) return;
    var m = (PAY.methods || []).filter(function (x) { return x.id === b.getAttribute("data-pm"); })[0]; if (!m) return;
    D.querySelectorAll("#pyMethods [data-pm]").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
    var h = { cashapp: "$" + PAY.handle, venmo: "@" + PAY.handle, paypal: "paypal.me/" + PAY.handle, zelle: "pay@example.com" }[m.id];
    $("pyMsg").textContent = PAY.stripe ? t("pyStripe", { m: p(m) }) : t("pyWould", { m: p(m), b: C.brand.name }) + (h ? " " + t("pyHandle", { h: h }) : "");
  });
  $("payPrint").addEventListener("click", function () { renderPay(); openSh("qrSh"); });
  $("qcBayIn").addEventListener("input", function () { var v = $("qcBayIn").value.trim(); $("qpcBay").textContent = v; $("qpcBay").hidden = !v; });
  $("qcPrint").addEventListener("click", function () { D.body.classList.add("printqr"); W.print(); setTimeout(function () { D.body.classList.remove("printqr"); }, 500); });
  W.addEventListener("afterprint", function () { D.body.classList.remove("printqr"); });

  function notes() {   // a client's app: their stock note + the Stripe test-card hint while it's in test mode
    var n = D.querySelector('[data-t="tiSample"]'); if (!n || !C.client) return;
    n.textContent = t("tiSampleC") + (C.stripeTest ? " " + t("tiTest") : "");
  }
  function all() { renderBiz(); renderList(); renderPay(); renderCarSize(); notes(); if (last) check(); }
  M.onLang(all);
  M.onChange(function () { renderList(); renderPay(); });
  W.addEventListener("storage", function (e) { if (e.key === M.TKEY) renderList(); });
  /* the quote changes the pay amount */
  var jl = $("jobList"); if (jl && W.MutationObserver) new MutationObserver(renderPay).observe(jl, { childList: true });
  all();
  if (/[?&]print=qr\b/.test(location.search)) { renderPay(); openSh("qrSh"); }
})();
