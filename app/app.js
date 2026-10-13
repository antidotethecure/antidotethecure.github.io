/* SousShift app: renders every section from window.APP (data.js) + window.VALUE.sources (value/value-data.js).
   No framework. Exposes window.SSAPP = { totals, market, impact, openPlan } so the AI guide and tests can use them. */
(function () {
  "use strict";
  var A = window.APP, V = window.VALUE || { sources: {} };
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var n = function (x) { return Math.round(x).toLocaleString("en-US"); };
  var usd = function (x) { return "$" + n(x); };
  var plan = function (k) { return A.plans.filter(function (p) { return p.key === k; })[0]; };
  var addon = function (k) { return A.addons.filter(function (a) { return a.key === k; })[0]; };
  var ORDER = ["basic", "growth", "dfy"];
  var T = A.terms, R = T.results;
  var PROMISE = "If during the first " + R.windowMonths + " months after Go-Live there's no " + R.day + "-day period where the app brought back at least " +
    R.returns + " tracked return visits, you get " + R.freeMonths + " months of service free (your next " + R.freeMonths + " monthly payments are waived).";
  var PROMISE_FINE = "It's a results promise, not a promise of sales or revenue. The free months are the only remedy under that clause, and fees already paid (including setup) aren't refunded.";
  A.promise = PROMISE; A.promiseFine = PROMISE_FINE;

  /* ---------- 1 · plans ---------- */
  $("planCards").innerHTML = A.plans.map(function (p) {
    return '<article class="card plan' + (p.flag ? " flag" : "") + '" id="plan-' + p.key + '"><span class="tag">' + esc(p.tag) + '</span><h3>' + esc(p.name) + '</h3>' +
      '<div class="price"><div><b>' + usd(p.setup) + '</b>setup, once</div><div><b>' + usd(p.monthly) + '</b>per month</div></div>' +
      '<p class="note" style="margin:0">' + esc(p.pitch) + '</p>' +
      '<details open><summary>What\'s included</summary><ul>' + p.includes.map(function (i) { return "<li>" + esc(i) + "</li>"; }).join("") + '</ul></details>' +
      '<div class="who"><b>Who does what:</b> ' + esc(p.who) + '</div>' +
      '<p class="note" style="margin:10px 0 0">Results promise: ' + R.returns + ' tracked return visits in a ' + R.day + '-day period within your first ' + R.windowMonths + ' months, or ' + R.freeMonths + ' months free.</p></article>';
  }).join("");
  $("addonList").innerHTML = A.addons.map(function (a) {
    var inc = a.includedIn.map(function (k) { return plan(k).name; });
    return '<div class="addon"><div><b>' + esc(a.name) + '</b><div class="note">' + esc(a.one) + (inc.length ? " <b>Included in " + esc(inc.join(" and ")) + ".</b>" : "") +
      (a.key === "social" ? ' <a href="#social">Details →</a>' : a.key !== "social" ? ' <a href="../agents/">Demos →</a>' : "") + '</div></div><b class="p">' + usd(a.monthly) + '/mo</b></div>';
  }).join("") + '<div class="addon"><div><b>' + esc(A.bundle.name) + ' bundle</b><div class="note">' + esc(A.bundle.one) + '</div></div><b class="p">' + usd(bundleMonthly()) + '/mo</b></div>';

  function bundleMonthly() { return plan(A.bundle.plan).monthly + addon(A.bundle.addon).monthly - A.bundle.discountMonthly; }

  /* builder: totals = (plan + add-ons not already included) × restaurants. Voice replaces Text; on a plan that already
     includes Text, Voice is charged as the difference (an upgrade). Bundle = Done-for-you + Social with the discount. */
  var B = { plan: "basic", add: {}, n: 1, bundle: false };
  function totals(st) {
    st = st || B; var p = plan(st.plan), lines = [], m = p.monthly, s = p.setup;
    lines.push(p.name + " " + usd(p.setup) + " + " + usd(p.monthly) + "/mo");
    var add = Object.assign({}, st.add);
    if (add.voice) add.text = false;
    A.addons.forEach(function (a) {
      if (!add[a.key] || a.includedIn.indexOf(st.plan) >= 0) return;
      var price = a.monthly;
      if (a.replaces && addon(a.replaces).includedIn.indexOf(st.plan) >= 0) price = a.monthly - addon(a.replaces).monthly;
      m += price; s += a.setup || 0; lines.push(a.name + " +" + usd(price) + "/mo");
    });
    var bundled = st.plan === A.bundle.plan && add[A.bundle.addon];
    if (bundled) { m -= A.bundle.discountMonthly; s -= A.bundle.discountSetup; lines.push(A.bundle.name + " bundle −" + usd(A.bundle.discountMonthly) + "/mo"); }
    var N = Math.max(1, st.n | 0);
    return { setup: s * N, monthly: m * N, year: (s + 12 * m) * N, perSetup: s, perMonthly: m, n: N, lines: lines, bundled: !!bundled };
  }
  $("bPlan").innerHTML = A.plans.map(function (p) { return '<button type="button" data-k="' + p.key + '" aria-pressed="false">' + esc(p.name) + '</button>'; }).join("");
  $("bAdd").innerHTML = A.addons.map(function (a) { return '<div class="ck"><input type="checkbox" id="ba-' + a.key + '" data-k="' + a.key + '"><label for="ba-' + a.key + '"><b>' + esc(a.name) + '</b> <span class="note">' + usd(a.monthly) + '/mo</span><small id="bn-' + a.key + '"></small></label></div>'; }).join("");
  $("bBundleNote").textContent = plan(A.bundle.plan).name + " + " + addon(A.bundle.addon).name + ": " + usd(plan(A.bundle.plan).setup) + " setup + " + usd(bundleMonthly()) + "/mo (saves " + usd(A.bundle.discountMonthly) + " a month).";
  function draw() {
    [].forEach.call($("bPlan").children, function (b) { b.setAttribute("aria-pressed", String(b.dataset.k === B.plan)); });
    A.addons.forEach(function (a) {
      var box = $("ba-" + a.key), inc = a.includedIn.indexOf(B.plan) >= 0, note = $("bn-" + a.key);
      box.disabled = inc; box.checked = inc || !!B.add[a.key];
      note.textContent = inc ? "Included in " + plan(B.plan).name : (a.replaces && addon(a.replaces).includedIn.indexOf(B.plan) >= 0 ? "Upgrade from the included Text Assistant: +" + usd(a.monthly - addon(a.replaces).monthly) + "/mo" : a.replaces ? "Includes the Text Assistant" : "");
    });
    $("bBundle").checked = B.plan === A.bundle.plan && !!B.add[A.bundle.addon];
    var t = totals(); $("bN").textContent = t.n;
    $("tSetup").textContent = usd(t.setup); $("tMonthly").textContent = usd(t.monthly); $("tYear").textContent = usd(t.year);
    $("bLines").textContent = (t.n > 1 ? "Per restaurant: " : "") + t.lines.join(" · ") + (t.n > 1 ? " · × " + t.n + " restaurants" : "") + ".";
  }
  $("bPlan").addEventListener("click", function (e) { var k = e.target.closest("button"); if (k) { B.plan = k.dataset.k; draw(); } });
  $("bAdd").addEventListener("change", function (e) { var k = e.target.dataset.k; if (!k) return; B.add[k] = e.target.checked; if (k === "voice" && e.target.checked) B.add.text = false; if (k === "text" && e.target.checked) B.add.voice = false; draw(); });
  $("bBundle").addEventListener("change", function (e) { if (e.target.checked) { B.plan = A.bundle.plan; B.add[A.bundle.addon] = true; } else B.add[A.bundle.addon] = false; draw(); });
  $("bMinus").onclick = function () { B.n = Math.max(1, B.n - 1); draw(); };
  $("bPlus").onclick = function () { B.n = Math.min(20, B.n + 1); draw(); };
  draw();

  /* ---------- 2 · market ---------- */
  var SRC = Object.assign({}, V.sources, A.extraSources);
  var mid = function (r) { return (r.low + r.typ) / 2; };
  function market(k) {   // cumulative: Growth includes Basic rows, Done-for-you includes Growth rows
    var lvl = ORDER.indexOf(k), mo = 0, once = 0;
    A.market.forEach(function (r) { if (ORDER.indexOf(r.tiers[0]) <= lvl) { if (r.unit === "mo") mo += mid(r); else once += mid(r); } });
    return { monthly: mo, once: once };
  }
  $("saveBox").innerHTML = A.plans.map(function (p) {
    var mk = market(p.key), yrM = mk.once + 12 * mk.monthly, yrU = p.setup + 12 * p.monthly;
    return '<div><b>' + esc(p.name) + '</b>~' + usd(mk.monthly) + '/mo elsewhere<br>vs ' + usd(p.monthly) + '/mo<em>save ~' + usd(mk.monthly - p.monthly) + '/mo</em>~' + usd(yrM - yrU) + ' in year one</div>';
  }).join("");
  var rows = '<tr><th>Tool</th><th class="n">Elsewhere</th><th class="n">Plan</th></tr>', lastUnit = "";
  A.market.forEach(function (r) {
    if (r.unit !== lastUnit) { rows += '<tr><td colspan="3" style="color:var(--volt);font-weight:800;padding-top:12px">' + (r.unit === "mo" ? "Monthly tools" : "One-time builds") + '</td></tr>'; lastUnit = r.unit; }
    rows += '<tr><td>' + esc(r.name) + '<small>' + esc(r.tool) + (r.est ? " · est." : "") + ' · <a href="#src-' + r.src[0] + '">source</a></small></td><td class="n">' + usd(mid(r)) + (r.unit === "mo" ? "/mo" : "") + '</td><td class="n">' + esc(plan(r.tiers[0]).name) + (r.tiers[0] === "basic" ? "" : "") + '</td></tr>';
  });
  var mb = market("basic"), mg = market("growth"), md = market("dfy");
  rows += '<tr class="sum"><td>Basic tools, bought separately</td><td class="n">' + usd(mb.monthly) + '/mo</td><td class="n">' + usd(plan("basic").monthly) + '</td></tr>' +
    '<tr class="sum"><td>Growth tools</td><td class="n">' + usd(mg.monthly) + '/mo</td><td class="n">' + usd(plan("growth").monthly) + '</td></tr>' +
    '<tr class="sum"><td>Done-for-you tools</td><td class="n">' + usd(md.monthly) + '/mo</td><td class="n">' + usd(plan("dfy").monthly) + '</td></tr>' +
    '<tr class="sum"><td>One-time builds (every plan)</td><td class="n">~' + usd(Math.round(mb.once / 100) * 100) + '</td><td class="n">' + usd(plan("basic").setup) + '+</td></tr>';
  $("mkt").innerHTML = rows;
  $("mktNote").textContent = A.marketNote;
  var used = []; A.market.forEach(function (r) { r.src.forEach(function (s) { if (used.indexOf(s) < 0) used.push(s); }); });
  $("mktSrc").innerHTML = used.map(function (k) { var s = SRC[k]; return s ? '<li id="src-' + k + '"><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.label) + '</a> (checked ' + esc(s.checked || "2026-10") + ')</li>' : ""; }).join("");

  /* ---------- 3 · run costs ---------- */
  $("runT").innerHTML = A.runCosts.map(function (r) { return '<tr><td>' + r[0] + ' <b>' + esc(r[1]) + '</b>' + (r[2] ? ' · ' + esc(r[2]) : "") + '</td><td class="n">' + esc(r[3]) + '</td></tr>'; }).join("") +
    '<tr class="sum"><td>Minimum every month</td><td class="n" style="color:var(--gold)">' + esc(A.runTotal) + '</td></tr>';

  /* ---------- 4 · impact (same model as setup-kit/template.html CFG.impact) ---------- */
  var I = Object.assign({ plan: "basic" }, A.impact);
  var F = [["crowd", "Guests on a busy night", 20, 800, 10, "", ""], ["nights", "Busy nights a month", 0, 16, 1, "", ""], ["daily", "Guests on a regular day", 0, 600, 10, "", ""],
    ["days", "Other days open a month", 0, 30, 1, "", ""], ["join", "Guests who scan and join", 5, 60, 1, "", "%"], ["back", "Members who come back one extra time a month", 5, 50, 1, "", "%"],
    ["spend", "Average spend per guest", 5, 150, 1, "$", ""]];
  $("iPlan").innerHTML = A.plans.map(function (p) { return '<button type="button" data-k="' + p.key + '" aria-pressed="false">' + esc(p.name) + '</button>'; }).join("");
  $("impIn").innerHTML = F.map(function (f) { return '<div class="imp-f"><label for="im-' + f[0] + '"><span>' + f[1] + '</span><b id="iv-' + f[0] + '"></b></label><input type="range" id="im-' + f[0] + '" min="' + f[2] + '" max="' + f[3] + '" step="' + f[4] + '" value="' + I[f[0]] + '"></div>'; }).join("");
  function impact(x) {
    x = Object.assign({}, I, x || {}); var p = plan(x.plan), fee = p.monthly, setup = p.setup;
    var guests = x.crowd * x.nights + x.daily * x.days, newM = guests * x.join / 100 * 0.7, back = x.back / 100, months = [], list = 0;
    for (var m = 1; m <= 12; m++) { list += newM; var recent = Math.min(m, 3) * newM; months.push({ list: list, visits: recent * back, sales: recent * back * x.spend }); }
    var need = x.spend ? Math.ceil(fee / x.spend) : 0, cum = 0, pay = 0;
    for (var q = 0; q < 12; q++) { cum += months[q].sales - fee; if (!pay && cum >= setup) pay = q + 1; }
    return { guests: guests, newMembers: newM, visits3: months[2].visits, sales3: months[2].sales, year: months.reduce(function (a, o) { return a + o.sales; }, 0),
      breakEven: need, payback: pay, fee: fee, setup: setup, list6: months[5].list };
  }
  function drawImp() {
    [].forEach.call($("iPlan").children, function (b) { b.setAttribute("aria-pressed", String(b.dataset.k === I.plan)); });
    F.forEach(function (f) { $("iv-" + f[0]).textContent = f[5] + n(I[f[0]]) + f[6]; });
    var r = impact();
    $("impOut").innerHTML =
      '<div class="big"><b>' + usd(r.sales3) + '/mo</b>extra sales once it\'s rolling (month 3 on) · ' + (r.sales3 / r.fee).toFixed(1) + '× your ' + usd(r.fee) + ' plan</div>' +
      '<div><b>' + n(r.breakEven) + ' visits/mo</b>break-even: extra visits a month that cover your ' + usd(r.fee) + ' fee</div>' +
      '<div><b>' + (r.payback ? r.payback + " mo" : "12+ mo") + '</b>to earn back the ' + usd(r.setup) + ' setup</div>' +
      '<div><b>' + n(r.visits3) + '</b>extra visits a month (month 3 on)</div>' +
      '<div><b>' + usd(r.year) + '</b>extra sales in the first year</div>' +
      '<div><b>' + n(r.newMembers) + '</b>new members a month</div>' +
      '<div><b>' + n(r.list6) + '</b>people you can text by month 6</div>';
  }
  $("iPlan").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) { I.plan = b.dataset.k; drawImp(); } });
  F.forEach(function (f) { $("im-" + f[0]).addEventListener("input", function (e) { I[f[0]] = +e.target.value; drawImp(); }); });
  drawImp();
  $("promise").innerHTML = '<h3>🛡️ Our results promise</h3><p>' + esc(PROMISE) + '</p><p class="note">' + esc(PROMISE_FINE) +
    ' A “tracked return visit” is a guest identified through the app (an app order, their member QR or code, their phone number, or an app reward) coming back on a later day. You see the count in your owner view.</p>' +
    '<p class="note"><b>Not the same as break-even.</b> Break-even (above) is how many extra visits a month cover your monthly fee. The promise is our ' + R.returns + '-visit target for the app itself.</p>';

  /* ---------- 5 · print ---------- */
  var P = A.print;
  $("kits").innerHTML = P.kits.map(function (k) { return '<figure><img src="' + esc(k.img) + '" alt="' + esc(k.cap) + '" loading="lazy"><figcaption>' + esc(k.cap) + '</figcaption></figure>'; }).join("");
  $("printT").innerHTML = '<tr><th>Item</th><th class="n">Typical price</th></tr>' + P.items.map(function (i) { return '<tr><td>' + esc(i.name) + '<small>' + esc(i.where) + ' · qty ' + esc(i.qty) + ' · <a href="#psrc-' + i.src + '">source</a></small></td><td class="n">' + esc(i.price).replace(" · ", "<br>") + '</td></tr>'; }).join("");
  $("printTyp").textContent = P.typical + " Prices checked " + P.checked + "; shipping and tax extra.";
  $("printWho").innerHTML = A.plans.map(function (p) { return '<tr><td><b>' + esc(p.name) + '</b></td><td>' + esc(P.who[p.key]) + '</td></tr>'; }).join("");
  $("printSrc").innerHTML = Object.keys(P.sources).map(function (k) { var s = P.sources[k]; return '<li id="psrc-' + k + '"><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.label) + '</a></li>'; }).join("");

  /* ---------- 6 · contract clauses ---------- */
  var DX = T.discount;
  var CL = [
    ["What we build", "Your branded app, menu, game, rewards and print-kit designs for the plan you pick, plus hosting, updates and support while you're on the plan."],
    ["Fees", "A one-time setup fee and a monthly fee per restaurant. Setup is split 50% when you sign and 50% at Go-Live. The monthly starts the day you sign. Basic " + usd(plan("basic").setup) + " + " + usd(plan("basic").monthly) + ", Growth " + usd(plan("growth").setup) + " + " + usd(plan("growth").monthly) + ", Done-for-you " + usd(plan("dfy").setup) + " + " + usd(plan("dfy").monthly) + "."],
    ["Founding discount (if you got one)", "A discount holds for " + DX.graceBusinessDays + " business days after signing. If the setup payment isn't in by then, the discount shrinks by " + usd(DX.perDay) + " a day until it's back at the regular price. It never goes above the regular price, and money already paid is credited."],
    ["2A · Performance share", "On top of the monthly: in any month your app customers spend more than " + usd(T.perf.threshold) + " on food and non-alcoholic drinks, we get " + T.perf.pct + "% of that month's app-attributed sales. Never alcohol, tax or tips, never your overall sales. Under " + usd(T.perf.threshold) + " that month, nothing is owed. You get a statement by the 5th and 10 days to dispute it against your register reports."],
    ["3A · Results promise", PROMISE + " " + PROMISE_FINE],
    ["Term and cancelling", "A " + T.minimumMonths + "-month minimum, then month to month. Either side can cancel with 30 days' written notice (email counts)."],
    ["5A · Your customer data", "Your customer list is yours. Full access and CSV export while you're paying. If you stop, you get a complete export within 10 days. We never sell it or use it for another business, and we delete it after the hand-off unless the law says to keep it."],
    ["Your part", "Give us your menu, photos, logo and deals, and keep the setup page current. Use your list the way guests agreed to (texts only to people who opted in; STOP means stop)."],
    ["AI add-ons", "The AI Text Assistant and AI Voice Host are month to month. You can switch tiers or turn them off anytime."]];
  $("clauses").innerHTML = CL.map(function (c, i) { return '<details id="cl-' + i + '"' + (i === 4 ? " open" : "") + '><summary>' + esc(c[0]) + '</summary><p>' + esc(c[1]) + '</p></details>'; }).join("");

  /* ---------- 7 · social ---------- */
  var S = A.social, avg = function (pts) { return pts.reduce(function (a, p) { return a + (p.low + p.high) / 2; }, 0) / pts.length; };
  var sAvg = avg(S.socialPoints), seoAvg = avg(S.seoPoints), mAvg = sAvg + seoAvg, ours = addon("social").monthly;
  S.marketAvg = mAvg;
  $("socialCard").innerHTML = '<div class="price"><div><b>' + usd(ours) + '</b>per month, ours</div><div><b>~' + usd(mAvg) + '</b>market average</div></div>' +
    '<p class="note" style="margin-top:0">About half the market average. Social media management averages ~' + usd(sAvg) + '/mo and local SEO / Google Business Profile ~' + usd(seoAvg) + '/mo for one location.</p>' +
    '<h3 style="margin-top:12px">What it does</h3><ul>' + S.does.map(function (d) { return "<li>" + esc(d) + "</li>"; }).join("") + '</ul>' +
    '<div class="who"><b>Target, not a promise.</b> ' + esc(S.target) + '</div><p class="note">' + esc(S.honest) + '</p>' +
    '<p class="note">Pair it with Done-for-you as the <b>' + esc(A.bundle.name) + '</b> bundle: ' + usd(plan("dfy").setup) + ' setup + ' + usd(bundleMonthly()) + '/mo (saves ' + usd(A.bundle.discountMonthly) + ' a month).</p>' +
    '<details><summary><b>How we priced it</b></summary><table class="t">' + S.socialPoints.concat(S.seoPoints).map(function (p) { return '<tr><td>' + esc(p.label) + '<small><a href="' + esc(S.sources[p.src].url) + '" target="_blank" rel="noopener">' + esc(S.sources[p.src].label) + '</a></small></td><td class="n">' + usd(p.low) + '–' + usd(p.high) + '</td></tr>'; }).join("") +
    '</table><p class="note">Average of the midpoints: social ~' + usd(sAvg) + ' + local SEO ~' + usd(seoAvg) + ' = ~' + usd(mAvg) + '/mo. Ours is set at about half, rounded. Checked ' + esc(S.checked) + '.</p></details>';

  /* ---------- 8 · FAQ (also the AI guide's knowledge) ---------- */
  A.faq = [
    { id: "f-price", q: "How much does it cost?", a: "Per restaurant: Basic " + usd(plan("basic").setup) + " setup + " + usd(plan("basic").monthly) + "/mo, Growth " + usd(plan("growth").setup) + " + " + usd(plan("growth").monthly) + "/mo, Done-for-you " + usd(plan("dfy").setup) + " + " + usd(plan("dfy").monthly) + "/mo. Add-ons: AI Text Assistant $75/mo, AI Voice Host + Text $150/mo, Social & SEO Growth " + usd(ours) + "/mo.", go: "plans" },
    { id: "f-which", q: "Which plan should I pick?", a: "Basic if you're happy to send your own texts and print your own stickers. Growth if you want guests brought back automatically (birthday and \"we miss you\" texts, review prompts, nearby alerts, AI texting). Done-for-you if you want to sit back while we run the marketing and answer the phone with an AI voice host.", go: "plans" },
    { id: "f-footwork", q: "What do I have to do on each plan?", a: "Basic: you send your own texts and promotions, print and place the stickers, and keep deals updated on your setup page. Growth: the bring-back texts run themselves and we order your printing; you send any extra promotions. Done-for-you: we run the texting and marketing, you approve.", go: "plans" },
    { id: "f-results", q: "What if it doesn't bring customers back?", a: PROMISE + " " + PROMISE_FINE, go: "returns" },
    { id: "f-perf", q: "What is the 10% performance share?", a: "Only in a month your app customers spend more than " + usd(T.perf.threshold) + " on food and non-alcoholic drinks, we get " + T.perf.pct + "% of that month's app sales. Never alcohol, tax or tips, never your overall sales. Under " + usd(T.perf.threshold) + ", nothing extra is owed.", go: "contract" },
    { id: "f-data", q: "Who owns the customer list?", a: "You do. Full access and CSV export anytime while you're on the plan, and a complete export within 10 days if you ever stop. We never sell it or use it for another business.", go: "contract" },
    { id: "f-cancel", q: "Can I cancel?", a: "There's a " + T.minimumMonths + "-month minimum, then it's month to month with 30 days' written notice (email counts). AI add-ons are month to month from day one. Your customer list goes with you.", go: "contract" },
    { id: "f-contract", q: "What's in the contract?", a: "Fees, a " + T.minimumMonths + "-month minimum, the 10% performance share (only over " + usd(T.perf.threshold) + " a month), the results promise, your customer-data rights, and the expiring founding discount. Open the plain-English summary or the sample agreement.", go: "contract" },
    { id: "f-discount", q: "How does the discount deadline work?", a: "If you got a discount on setup, it holds for " + DX.graceBusinessDays + " business days after you sign. If the setup payment isn't in by then, it drops by " + usd(DX.perDay) + " a day until it's back at the regular price. Never above the regular price.", go: "contract" },
    { id: "f-pay", q: "When do I pay?", a: "Setup is 50% when you sign and 50% at Go-Live. The monthly starts the day you sign.", go: "contract" },
    { id: "f-print", q: "How much do stickers and printing cost?", a: P.typical + " Basic: you order with our files. Growth and Done-for-you: we place the order and bill the print cost at cost.", go: "print" },
    { id: "f-pos", q: "Does it work with my register / POS?", a: "Yes. It works with any register (Toast, Square, Clover, anything). Nothing to install. Staff look up a member by phone or scan their code, and app orders show up for your team.", go: "faq" },
    { id: "f-ai", q: "What are the AI agents?", a: "The AI Text Assistant ($75/mo, included in Growth and Done-for-you) texts guests back 24/7. The AI Voice Host + Text ($150/mo, included in Done-for-you) answers your phone, takes reservation requests and transfers to staff. Anything it can't answer goes to you.", go: "plans" },
    { id: "f-social", q: "What is Social & SEO Growth?", a: "An optional " + usd(ours) + "/mo add-on: content plan, short videos from your food, posting on Instagram, TikTok and YouTube, Google Business Profile + local SEO, and a monthly report. Market average is ~" + usd(mAvg) + "/mo. " + S.honest, go: "social" },
    { id: "f-time", q: "How long does setup take?", a: "Most restaurants go live within a couple of weeks of getting us the menu, photos and logo. Your onboarding page tracks every step.", go: "faq" },
    { id: "f-multi", q: "I have more than one restaurant.", a: "Prices are per restaurant. Use \"Build my plan\" to total it for any number of locations, and the $3,000 performance-share test is counted per restaurant.", go: "plans" },
    { id: "f-existing", q: "I'm already a client. Do my prices change?", a: "No. Signed deals keep their terms. These prices are for new restaurants.", go: "plans" }];
  $("faqList").innerHTML = A.faq.map(function (f) { return '<details id="' + f.id + '"><summary>' + esc(f.q) + '</summary><p>' + esc(f.a) + '</p></details>'; }).join("");

  /* ---------- contact ---------- */
  var body = encodeURIComponent("Hi Antidote, I'm looking at the SousShift app and have a question: ");
  $("mailBtn").href = "mailto:" + A.contact.email + "?subject=" + encodeURIComponent("SousShift question") + "&body=" + body;
  $("smsBtn").href = "sms:" + (A.contact.sms || "") + "&body=" + body;

  /* ---------- tabs highlight ---------- */
  var tabs = document.querySelectorAll("nav.tabs [data-tab]");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) tabs.forEach(function (t) { t.classList.toggle("on", t.dataset.tab === e.target.id); }); }); }, { rootMargin: "-40% 0px -55% 0px" });
    ["plans", "market", "returns", "contract"].forEach(function (id) { io.observe($(id)); });
  }

  function openPlan(k) { var el = $("plan-" + k); if (!el) return; var d = el.querySelector("details"); if (d) d.open = true; go(el); }
  function go(el) { if (typeof el === "string") el = $(el); if (!el) return; el.scrollIntoView({ behavior: "smooth", block: "start" }); el.classList.remove("hl"); void el.offsetWidth; el.classList.add("hl"); }
  window.SSAPP = { totals: totals, market: market, impact: impact, openPlan: openPlan, go: go, state: B, draw: draw };

  window.addEventListener("load", function () { var k = document.querySelector("#ssai-k button.go"); if (k) k.textContent = "📝 Draft my agreement"; });
})();
