/* Members-only shop + membership billing (sample).
   DEMO ONLY: no card is charged and no card number is ever asked for. The live version sends the cart
   (item ids + quantities only) to the gym's own Stripe account; the server looks up every price itself,
   so nothing typed or changed in the browser can set what a member pays. */
(function () {
  "use strict";
  var C = window.GYM_CFG, D = document, A = window.__AOG;
  var $ = function (s, r) { return (r || D).querySelector(s); };
  var esc = A.esc, money = function (n) { return "$" + n.toFixed(2).replace(/\.00$/, ""); };
  var items = {}; C.catalog.forEach(function (c) { c.items.forEach(function (i) { items[i.id] = i; }); });
  var planBy = function (k) { return C.plans.filter(function (p) { return p.key === k; })[0] || C.plans[1]; };
  var cart = {}, busy = false;

  function S() { return A.state(); }
  function addMonths(d, n) { d = new Date(d + "T12:00"); d.setMonth(d.getMonth() + n); return A.ymd(d); }
  function ensure() {
    var s = S(); if (!s || s.membership) return s;
    var joined = s.profile.joined, demo = s.profile.demo, m = { plan: demo ? "standard" : "standard", since: joined, autopay: true, payments: [], extras: {} };
    var due = joined; while (due <= A.ymd()) { if (demo) m.payments.push({ d: due, what: planBy(m.plan).name + " membership", amt: planBy(m.plan).price, ref: ref() }); due = addMonths(due, 1); }
    if (!demo) m.payments.push({ d: joined, what: "Enrollment fee (sample)", amt: 50, ref: ref(), demo: true });
    m.nextDue = due; s.membership = m; s.orders = s.orders || []; A.save(); return s;
  }
  function ref() { return "AOG-" + Math.random().toString(36).slice(2, 8).toUpperCase(); }

  /* ---------- the black card + billing ---------- */
  function renderClub() {
    var s = ensure(); if (!s) return;
    var m = s.membership, p = planBy(m.plan);
    $("#mcard").className = "mcard " + m.plan;
    $("#mcTier").textContent = p.tier; $("#mcName").textContent = s.profile.name; $("#mcNo").textContent = s.profile.id;
    $("#mcPlan").textContent = p.name; $("#mcSince").textContent = "Member since " + A.nice(m.since);
    $("#billAmt").textContent = money(p.price); $("#billDue").textContent = "Due " + A.nice(m.nextDue) + (m.autopay ? " · Autopay on" : " · Autopay off");
    $("#autopay").checked = !!m.autopay;
    $("#planList").innerHTML = C.plans.map(function (q) {
      var cur = q.key === m.plan;
      return '<li class="plan' + (cur ? " cur" : "") + '"><div><b>' + esc(q.name) + ' <small>' + esc(q.tier) + "</small></b><small>" + q.perks.map(esc).join(" · ") + '</small></div><div class="pr"><b>' + money(q.price) + "</b><small>/mo</small>" +
        (cur ? '<span class="cur-tag">Your plan</span>' : '<button class="btn sm ' + (q.price > p.price ? "primary" : "ghost") + '" type="button" data-plan="' + q.key + '">' + (q.price > p.price ? "Upgrade" : "Switch") + "</button>") + "</div></li>";
    }).join("");
    $("#extraList").innerHTML = C.extras.map(function (x) {
      var off = x.needs && x.needs !== m.plan, owned = x.key === "parking" && m.extras.parking;
      return '<li class="plan"><div><b>' + esc(x.name) + "</b><small>" + esc(x.note) + '</small></div><div class="pr"><b>' + money(x.price) + "</b>" +
        (owned ? '<span class="cur-tag">Owned</span>' : '<button class="btn sm ghost" type="button" data-extra="' + x.key + '"' + (off ? " disabled title='ALL ACCESS only'" : "") + ">" + (off ? "ALL ACCESS" : "Buy") + "</button>") + "</div></li>";
    }).join("");
    $("#vipNote").textContent = C.vip.note; $("#feeNote").textContent = C.fees;
    $("#payList").innerHTML = m.payments.slice().reverse().slice(0, 6).map(function (x) { return "<li><span>" + A.nice(x.d) + " · " + esc(x.what) + "</span><b>" + money(x.amt) + "</b></li>"; }).join("") || "<li class='empty'>No payments yet.</li>";
    $("#orderList").innerHTML = (s.orders || []).slice().reverse().slice(0, 5).map(function (o) { return '<li><span>' + A.nice(o.d) + " · " + o.lines.reduce(function (a, l) { return a + l.q; }, 0) + " items · " + (o.picked ? "Picked up" : "Ready at front desk") + "</span><b>" + money(o.total) + "</b></li>"; }).join("") || "<li class='empty'>Your shop orders show up here.</li>";
  }
  D.addEventListener("change", function (e) { if (e.target.id === "autopay") { var s = ensure(); s.membership.autopay = e.target.checked; A.save(); renderClub(); A.toast(e.target.checked ? "Autopay on." : "Autopay off. We'll remind you before it's due."); } });

  /* ---------- shop ---------- */
  function renderShop() {
    $("#shopCats").innerHTML = C.catalog.map(function (c) {
      return "<h3>" + esc(c.cat) + '</h3><div class="grid">' + c.items.map(function (i) {
        var q = cart[i.id] || 0;
        return '<div class="prod' + (i.soon ? " soon" : "") + '"><span class="pi">' + i.icon + "</span><b>" + esc(i.name) + "</b><small>" + (i.soon ? "Coming soon" : money(i.price)) + "</small>" +
          (i.soon ? '<button class="btn sm ghost" type="button" disabled>Notify me</button>' : q ? '<div class="qty"><button type="button" data-dec="' + i.id + '" aria-label="One less">−</button><b>' + q + '</b><button type="button" data-inc="' + i.id + '" aria-label="One more">+</button></div>' : '<button class="btn sm primary" type="button" data-inc="' + i.id + '">Add</button>') + "</div>";
      }).join("") + "</div>";
    }).join("");
    var n = 0, t = 0; Object.keys(cart).forEach(function (k) { n += cart[k]; t += cart[k] * items[k].price; });
    var bar = $("#cartBar"); bar.hidden = !n; $("#cartN").textContent = n + (n === 1 ? " item" : " items"); $("#cartT").textContent = money(t);
  }
  D.addEventListener("click", function (e) {
    var b = e.target.closest("[data-inc],[data-dec],[data-plan],[data-extra],#cartGo,#vipBtn,#payNow,[data-pay],#payCancel,#rcptClose");
    if (!b || busy) return;
    if (b.dataset.inc) { var i = items[b.dataset.inc]; if (i && !i.soon) cart[i.id] = Math.min(20, (cart[i.id] || 0) + 1); renderShop(); return; }
    if (b.dataset.dec) { if (cart[b.dataset.dec] > 1) cart[b.dataset.dec]--; else delete cart[b.dataset.dec]; renderShop(); return; }
    var s = ensure(), m = s.membership;
    if (b.dataset.plan) { var p = planBy(b.dataset.plan); return checkout({ kind: "plan", title: "Switch to " + p.name, lines: [{ name: p.name + " · first month at the new rate", q: 1, price: p.price }], note: "Your " + p.name + " rate starts today. Your old plan stops at the same time.", plan: p.key }); }
    if (b.dataset.extra) { var x = C.extras.filter(function (y) { return y.key === b.dataset.extra; })[0]; return checkout({ kind: "extra", title: x.name, lines: [{ name: x.name, q: 1, price: x.price }], extra: x.key }); }
    if (b.id === "payNow") { var pp = planBy(m.plan); return checkout({ kind: "bill", title: "Pay membership", lines: [{ name: pp.name + " · " + A.nice(m.nextDue), q: 1, price: pp.price }] }); }
    if (b.id === "cartGo") { var lines = Object.keys(cart).map(function (k) { return { id: k, name: items[k].name, q: cart[k], price: items[k].price }; }); return checkout({ kind: "shop", title: "Your order", lines: lines, note: "Pick up at the front desk. Show the QR on your receipt." }); }
    if (b.id === "vipBtn") { A.toast("Request sent to the front desk (demo). They'll reach out about VIP."); return; }
    if (b.id === "payCancel" || b.id === "rcptClose") { $("#pay").hidden = true; D.documentElement.classList.remove("lock"); return; }
    if (b.dataset.pay) pay(b.dataset.pay);
  });

  /* ---------- checkout sheet ---------- */
  var order = null;
  function checkout(o) {
    o.total = o.lines.reduce(function (a, l) { return a + l.q * l.price; }, 0); order = o;
    $("#payBody").innerHTML = "<h3>" + esc(o.title) + '</h3><ul class="list wl">' + o.lines.map(function (l) { return "<li><span>" + (l.q > 1 ? l.q + " × " : "") + esc(l.name) + "</span><b>" + money(l.q * l.price) + "</b></li>"; }).join("") +
      '</ul><div class="ptotal"><span>Total</span><b>' + money(o.total) + "</b></div>" + (o.note ? '<p class="note">' + esc(o.note) + "</p>" : "") +
      '<button class="btn applepay big" type="button" data-pay="apple">Pay with Apple Pay</button>' +
      '<button class="btn ghost big" type="button" data-pay="card">💳 Card on file •••• 4242</button>' +
      '<p class="fine">Demo checkout: no money moves. In the live app, payments go straight to ALL-ONE GYM through Stripe, tax is added at checkout, and you get an email receipt.</p>' +
      '<button class="btn ghost sm" type="button" id="payCancel">Cancel</button>';
    $("#pay").hidden = false; D.documentElement.classList.add("lock");
  }
  function pay(how) {
    if (!order || busy) return; busy = true; // one tap = one charge
    $("#payBody").innerHTML = '<div class="paying"><i></i><p>' + (how === "apple" ? "Double-click to pay…" : "Charging card •••• 4242…") + "</p></div>";
    setTimeout(function () {
      var s = ensure(), m = s.membership, today = A.ymd(), r = ref(), o = order;
      if (o.kind === "plan") { m.plan = o.plan; m.payments.push({ d: today, what: planBy(o.plan).name + " membership", amt: o.total, ref: r }); m.nextDue = addMonths(today, 1); }
      if (o.kind === "bill") { m.payments.push({ d: today, what: planBy(m.plan).name + " membership", amt: o.total, ref: r }); m.nextDue = addMonths(m.nextDue, 1); }
      if (o.kind === "extra") { m.payments.push({ d: today, what: o.title, amt: o.total, ref: r }); if (o.extra === "parking") m.extras.parking = true; }
      if (o.kind === "shop") { s.orders.push({ d: today, ref: r, lines: o.lines, total: o.total }); cart = {}; }
      A.save(); busy = false; order = null;
      $("#payBody").innerHTML = '<div class="rcpt"><span class="chk">✓</span><h3>Paid ' + money(o.total) + "</h3><code>" + r + "</code>" +
        (o.kind === "shop" ? '<p>Show this at the front desk to pick up.</p><div class="qr" id="rcptQr"></div>' : o.extra === "daypass" ? '<p>Send your friend this pass.</p><div class="qr" id="rcptQr"></div>' : "<p>" + (o.kind === "plan" ? "Welcome to " + esc(planBy(m.plan).name) + "." : "You're all set.") + "</p>") +
        '<button class="btn primary big" type="button" id="rcptClose">Done</button></div>';
      if ($("#rcptQr")) A.qr($("#rcptQr"), "AOG-ORDER|" + s.profile.id + "|" + r);
      A.burst(); renderShop(); renderClub();
    }, 1400);
  }

  D.addEventListener("aog:tab", function (e) { if (e.detail === "shop") renderShop(); if (e.detail === "club") renderClub(); });
  D.addEventListener("aog:member", function () { cart = {}; renderClub(); renderShop(); });
  if (S()) { renderClub(); renderShop(); }
})();
