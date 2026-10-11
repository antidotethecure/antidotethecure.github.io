/* SousShift AI — on-the-spot agreement builder for every demo page.
   Include once per demo: <script src="../contract.js"></script> (after the CONFIG script).
   Reads the page's CONFIG (name, address) and drafts the services agreement live in the
   browser. Signing pads + Save as PDF. Nothing is uploaded or stored anywhere; the draft
   only lives on this device until the page is closed.
   Wording mirrors ~/plugin/skills/second-shift-contract/template.html. Change both together.
   Three clauses are ON by default for every new agreement (2026-10-10), each with its own switch in the form:
     2A Performance share: pct% (10) of ALL App-Attributed Sales in a calendar month they exceed threshold ($3,000);
        food + non-alcoholic only, no tax, tips or alcohol. Tracked by demo/crm.js ("Ring up a member" + "App sales").
     3A 90-day results check: cancel with 30 days' notice if under N (12) tracked return visits a month by day 90.
     5A Customer data: full access while paying, complete export within 10 days of termination, no collection after.
   CONFIG.locations = ["Melody Bar and Grill", "Nalu Vida"] (2+ names) makes the threshold apply per restaurant.
   Draft wording: not legal advice; have a California business attorney review it. */
(function () {
  "use strict";
  var CFG = window.CONFIG || {};
  var BIZ = CFG.name || document.title.split(" — ")[0] || "Client";
  var ADDR = (CFG.address && !/drops in|exact address/i.test(CFG.address)) ? CFG.address : "";
  var PROVIDER = { name: "Anthony Louis Suggs Jr.", email: "antidotethecure@gmail.com",
                   co: "Antidote Enterprises LLC, doing business as SousShift AI" };
  var PRESETS = {
    // Pricing v4 (2026-10-09). Full package: car-style plans, less down = higher monthly for 12 months, then $400.
    full:     { label: "Full · $2,500 down", plan: "Full", setup_list: 2500, monthly_list: 400, sd: 0, md: 0, months: 0, minimum: 0, upfront: 100, intro: 0, intro_months: 0 },
    half:     { label: "Full · half down $1,250", plan: "Full, half down", setup_list: 1250, monthly_list: 400, sd: 0, md: 0, months: 0, minimum: 12, upfront: 100, intro: 525, intro_months: 12 },
    starter:  { label: "Full · starter $500", plan: "Full, starter", setup_list: 500, monthly_list: 400, sd: 0, md: 0, months: 0, minimum: 12, upfront: 100, intro: 600, intro_months: 12 },
    core:     { label: "Core · $2,000 + $300", plan: "Core", setup_list: 2000, monthly_list: 300, sd: 0, md: 0, months: 0, minimum: 0, upfront: 100, intro: 0, intro_months: 0 },
    founding: { label: "Founding · Full at Core price", plan: "Full (founding)", setup_list: 2500, monthly_list: 400, sd: 20, md: 25, months: 0, minimum: 3, upfront: 50, intro: 0, intro_months: 0 }
  };
  var SCOPE = [
    "A mobile menu page with Client's real menu, prices, hours, call and directions buttons",
    "A custom reward game themed to Client's food, reachable from a QR code on every table",
    "A weekly prize board with Client-chosen prizes, reset every week",
    "QR table tents for Client's tables (one print run included)",
    "Hosting, security updates, menu and price updates on request, and support",
    "Full package only: customer referral program, scan-to-earn points at the register, nearby-customer alerts, and text campaigns to opted-in customers (up to 2,000 texts per month)"
  ];

  var css = [
    "#ssai-o *,#ssai-o *::before,#ssai-o *::after,#ssai-k *,#ssai-k *::before,#ssai-k *::after{all:revert}",
    "#ssai-doc h1,#ssai-doc h2{color:#111;background:none;-webkit-text-fill-color:#111;text-shadow:none;filter:none}",
    "#ssai-k{margin:28px auto 8px;max-width:560px;text-align:center}",
    "#ssai-k button.go{font:800 16px/1 Arial,Helvetica,sans-serif;background:#1E6BFF;color:#fff;border:0;border-radius:14px;padding:16px 22px;width:100%;cursor:pointer;box-shadow:0 6px 18px rgba(30,107,255,.35)}",
    "#ssai-k small{display:block;margin-top:6px;opacity:.7;font:12px Arial,sans-serif}",
    "#ssai-o{position:fixed;inset:0;z-index:9999;background:#eef1f6;color:#111;overflow:auto;display:none;font:14px/1.45 Arial,Helvetica,sans-serif}",
    "#ssai-o.on{display:block}",
    "#ssai-o .bar{position:sticky;top:0;z-index:2;display:flex;gap:8px;align-items:center;padding:10px 14px;background:#0B2A6F;color:#fff}",
    "#ssai-o .bar b{flex:1;font-size:15px}",
    "#ssai-o .bar button{font:700 13px Arial;border:0;border-radius:9px;padding:9px 12px;cursor:pointer}",
    "#ssai-o .pdf{background:#FFD60A;color:#111}#ssai-o .x{background:#ffffff22;color:#fff}",
    "#ssai-o .wrap{display:grid;grid-template-columns:minmax(0,340px) minmax(0,1fr);gap:16px;padding:16px;max-width:1150px;margin:0 auto}",
    "@media(max-width:820px){#ssai-o .wrap{grid-template-columns:1fr}}",
    "#ssai-o form{background:#fff;border-radius:14px;padding:14px;align-self:start}",
    "#ssai-o label{display:block;font:700 11px Arial;letter-spacing:.05em;text-transform:uppercase;color:#445;margin:10px 0 3px}",
    "#ssai-o input,#ssai-o textarea,#ssai-o select{width:100%;box-sizing:border-box;font:15px Arial;padding:9px 10px;border:1px solid #c7cfdc;border-radius:9px;background:#fff;color:#111}",
    "#ssai-o .row{display:grid;grid-template-columns:1fr 1fr;gap:8px}",
    "#ssai-o label.ck{display:flex;gap:8px;align-items:center;text-transform:none;letter-spacing:0;font:700 14px Arial;color:#111}#ssai-o label.ck input{width:18px;height:18px;flex:none;margin:0}",
    "#ssai-o .presets{display:flex;gap:6px;flex-wrap:wrap}#ssai-o .presets button{flex:1;font:700 12px Arial;border:1px solid #1E6BFF;background:#fff;color:#1E6BFF;border-radius:9px;padding:8px;cursor:pointer}",
    "#ssai-o .presets button.on{background:#1E6BFF;color:#fff}",
    "#ssai-o .sum{margin-top:12px;background:#0B2A6F;color:#fff;border-radius:10px;padding:10px 12px;font-size:13px}",
    "#ssai-o .sum b{color:#FFD60A}",
    "#ssai-doc{background:#fff;border-radius:6px;padding:40px 44px;font:11pt/1.45 Georgia,'Times New Roman',serif;color:#111;box-shadow:0 2px 14px rgba(0,0,0,.08)}",
    "@media(max-width:600px){#ssai-doc{padding:22px 18px;font-size:10.5pt}}",
    "#ssai-doc h1{font:800 17pt Arial,Helvetica,sans-serif;margin:0 0 2px}#ssai-doc .s{font:9.5pt Arial;color:#555;margin:0 0 14px}",
    "#ssai-doc h2{font:800 10.5pt Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:.04em;margin:14px 0 4px}",
    "#ssai-doc table.f{border-collapse:collapse;width:100%;font-size:10.5pt}#ssai-doc table.f td,#ssai-doc table.f th{border:1px solid #999;padding:5px 7px;text-align:left}#ssai-doc table.f th{background:#eef2f8}",
    "#ssai-doc ul{margin:4px 0 4px 18px;padding:0}",
    "#ssai-doc .sigs{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:20px}@media(max-width:600px){#ssai-doc .sigs{grid-template-columns:1fr}}",
    "#ssai-doc canvas{width:100%;height:110px;border:1px dashed #8a96aa;border-radius:8px;touch-action:none;background:#fbfcff;display:block}",
    "#ssai-doc .clr{font:700 11px Arial;border:0;background:none;color:#1E6BFF;cursor:pointer;padding:3px 0}",
    "#ssai-doc .sm{font-size:9pt;color:#444}",
    "@media print{html:not(.crm-printing) body>*:not(#ssai-o){display:none!important}html:not(.crm-printing) #ssai-o{position:static;display:block!important;background:#fff;overflow:visible}#ssai-o .bar,#ssai-o form,#ssai-doc .clr{display:none!important}#ssai-o .wrap{display:block;padding:0}#ssai-doc{box-shadow:none;padding:0}#ssai-doc canvas{border:0;border-bottom:1px solid #111;border-radius:0;background:none}}"
  ].join("\n");
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  var e = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var money = function (x) { x = Math.round(x * 100) / 100; return "$" + x.toLocaleString("en-US", { minimumFractionDigits: x % 1 ? 2 : 0, maximumFractionDigits: 2 }); };
  var slug = BIZ.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  /* ---------- launcher on the demo page ---------- */
  var k = document.createElement("div"); k.id = "ssai-k";
  k.innerHTML = '<button class="go" type="button">📄 Ready to go live? Draft the agreement</button><small>SousShift AI · drafted on this device, nothing is sent until you choose</small>';
  var foot = document.querySelector("footer");
  (foot && foot.parentNode ? foot.parentNode.insertBefore(k, foot) : document.body.appendChild(k));

  /* ---------- the builder ---------- */
  var o = document.createElement("div"); o.id = "ssai-o";
  o.innerHTML =
    '<div class="bar"><b>Agreement · ' + e(BIZ) + '</b><button class="pdf" type="button">Save / Print PDF</button><button class="x" type="button">Close</button></div>' +
    '<div class="wrap"><form autocomplete="off">' +
    '<label>Deal</label><div class="presets">' + Object.keys(PRESETS).map(function (p, i) { return '<button type="button" data-p="' + p + '"' + (i ? '' : ' class="on"') + '>' + PRESETS[p].label + '</button>'; }).join("") + '</div>' +
    '<label>Owner name</label><input name="owner_name" placeholder="Full name">' +
    '<div class="row"><div><label>Title</label><input name="owner_title" value="Owner"></div><div><label>Owner email</label><input name="owner_email" type="email" placeholder="name@email.com"></div></div>' +
    '<label>Legal business name (if different)</label><input name="legal" placeholder="e.g. Lucky Dragon LLC">' +
    '<label>Business address</label><input name="address" value="' + e(ADDR) + '" placeholder="Street, city">' +
    '<div class="row"><div><label>Setup, regular $</label><input name="setup_list" type="number" min="0"></div><div><label>Setup discount %</label><input name="sd" type="number" min="0" max="100"></div></div>' +
    '<div class="row"><div><label>Monthly, regular $</label><input name="monthly_list" type="number" min="0"></div><div><label>Monthly discount %</label><input name="md" type="number" min="0" max="100"></div></div>' +
    '<div class="row"><div><label>Discount months</label><input name="months" type="number" min="0" title="0 = for as long as the agreement runs"></div><div><label>Minimum term (months)</label><input name="minimum" type="number" min="0" value="3"></div></div>' +
    '<div class="row"><div><label>Plan monthly $ (first months)</label><input name="intro" type="number" min="0" title="0 = no plan rate; regular monthly from day one"></div><div><label>Plan months</label><input name="intro_months" type="number" min="0"></div></div>' +
    '<label>Setup paid at signing %</label><input name="upfront" type="number" min="0" max="100" value="50">' +
    '<label>Clauses (on by default)</label>' +
    '<label class="ck"><input type="checkbox" name="ps" checked> 2A Performance share</label>' +
    '<div class="row"><div><label>Share %</label><input name="ps_pct" type="number" min="0" max="100" value="10"></div><div><label>Over $ / month</label><input name="ps_th" type="number" min="0" value="3000"></div></div>' +
    '<label class="ck"><input type="checkbox" name="rc" checked> 3A 90-day results check</label>' +
    '<label>Return visits a month needed</label><input name="rc_n" type="number" min="0" value="12">' +
    '<label class="ck"><input type="checkbox" name="cd" checked> 5A Customer data</label>' +
    '<label>Special terms</label><textarea name="special" rows="3" placeholder="Anything you agreed that is not above"></textarea>' +
    '<div class="sum" id="ssai-sum"></div>' +
    '</form><div id="ssai-doc"></div></div>';
  document.body.appendChild(o);
  var F = o.querySelector("form"), D = o.querySelector("#ssai-doc"), S = o.querySelector("#ssai-sum");
  var sigs = { client: null, provider: null }, planName = "";

  function preset(name) {
    var p = PRESETS[name];
    F.setup_list.value = p.setup_list; F.monthly_list.value = p.monthly_list;
    F.sd.value = p.sd; F.md.value = p.md; F.months.value = p.months; F.minimum.value = p.minimum; F.upfront.value = p.upfront;
    F.intro.value = p.intro; F.intro_months.value = p.intro_months; planName = p.plan || "";
    o.querySelectorAll(".presets button").forEach(function (b) { b.classList.toggle("on", b.dataset.p === name); });
    render();
  }
  function v(n) { return F[n].value.trim(); }
  function num(n) { var x = parseFloat(F[n].value); return isFinite(x) ? x : 0; }

  function andList(xs) { return xs.length === 1 ? xs[0] : xs.slice(0, -1).join(", ") + " and " + xs[xs.length - 1]; }
  // Sections 2A / 3A / 5A + the fee-table row. Same wording as clauses() in make_contract.py.
  function clauses() {
    var ps = F.ps.checked, rc = F.rc.checked, cd = F.cd.checked, th = money(num("ps_th")), pct = num("ps_pct") + "%", n = Math.round(num("rc_n"));
    var locs = (CFG.locations || []).filter(Boolean), many = locs.length > 1, c = { row: "", s2a: "", s3a: "", s5a: "",
      cancel: "If Client cancels, Provider will hand over Client's customer and player data in a standard file format." };
    if (ps) {
      c.row = '<tr><td>Performance share</td><td>None</td><td><b>' + pct + ' of App-Attributed Sales</b><br><span class="sm">only in a month they exceed ' + th + (many ? ' at a restaurant' : '') + '; food and non-alcoholic only; see Section 2A</span></td></tr>';
      c.s2a = '<h2>2A. Performance share</h2><p>In addition to the monthly fee, in any calendar month in which App-Attributed Sales exceed ' + th + ', Client will pay Provider ' + pct + ' of that month\'s App-Attributed Sales. The ' + pct + ' applies to all of that month\'s App-Attributed Sales, not only the amount above ' + th + '. In a month where App-Attributed Sales are ' + th + ' or less, no performance share is owed.' +
        (many ? ' The ' + th + ' threshold applies separately to each restaurant covered by this Agreement (' + e(andList(locs)) + '). Each restaurant\'s App-Attributed Sales are measured and tested on their own, the performance share is owed only for a restaurant whose own App-Attributed Sales exceed ' + th + ' that month, and sales from different restaurants are never combined.' : '') + '</p>' +
        '<p>"App-Attributed Sales" means sales to customers who join, engage with or come back through the App: (a) orders placed through the App, and (b) purchases at Client\'s register where the customer is identified through the App, because the customer shows their member QR code or code, staff enter the member\'s phone number, or the customer redeems an App reward, promo code or points. App-Attributed Sales count food and non-alcoholic beverage sales only. They exclude sales tax, tips and gratuities, and all alcoholic beverages. Client\'s other sales are never included.</p>' +
        '<p>Provider will send Client a statement by the 5th day of each month for the month before, listing each App-Attributed sale (date, receipt number, member, how the member was identified, and the amount counted). Client may dispute a statement in writing within 10 days of receiving it, and the parties will reconcile the disputed items against Client\'s register (POS) reports in good faith. Payment is due within 15 days of the statement date; a disputed amount is due within 15 days after it is resolved.</p>';
    }
    if (rc) c.s3a = '<h2>3A. 90-day results check</h2><p>If, by day 90 after Go-Live, the App is not bringing back at least ' + n + ' tracked return visits a month' + (ps && many ? ' across the restaurants covered by this Agreement' : '') + ', Client may cancel the monthly plan by giving 30 days\' written notice (email counts), even during a minimum term. A "tracked return visit" is a visit by a customer identified through the App (an App order, the member\'s QR code or code, the member\'s phone number, or an App reward or promo code) on a later day than that customer\'s first visit. The count comes from the App\'s records for the most recent full calendar month, which Client can see in its owner view. Fees already paid, including the setup fee, are not refunded.</p>';
    if (cd) {
      c.cancel = "If Client cancels, Client's customer data is handled as described in Section 5A.";
      c.s5a = '<h2>5A. Customer data</h2><p><b>While Client is paying.</b> While Client is paying for the service, Client has full access to all customer information collected through the App, including names, phone numbers, email addresses, visit and points history, and the export (CSV) of that list.</p>' +
        '<p><b>If the service ends.</b> If Client stops paying or cancels, Client keeps a complete export of every customer collected through the App up to the date the service ends (the "Termination Date"). Provider will deliver that export to Client within 10 days after the Termination Date.</p>' +
        '<p><b>After the Termination Date.</b> From the Termination Date on, the App stops collecting customers for Client, and Provider has no obligation to collect, store or provide customer information for Client after that date.</p>' +
        '<p><b>Provider\'s use.</b> Provider will not sell Client\'s customer list or use it for any other business. After delivering the export, Provider will delete the data, or archive it only where the law requires.</p>' +
        '<p><b>Privacy.</b> Client is responsible for using the customer list in line with the consent each customer gave, including text and email opt-ins and opt-outs (for example, a customer who replies STOP).</p>';
    }
    return c;
  }
  function render() {
    var sl = num("setup_list"), ml = num("monthly_list"), sd = num("sd"), md = num("md"), months = Math.round(num("months"));
    var minimum = Math.round(num("minimum")), up = Math.min(100, Math.max(0, num("upfront")));
    var sn = sl * (1 - sd / 100), mn = ml * (1 - md / 100);
    var intro = num("intro"), introM = Math.round(num("intro_months"));
    if (!(intro > 0 && introM > 0)) { intro = 0; introM = 0; }
    var full = PRESETS.full;
    var today = new Date(), ymd = "" + today.getFullYear() + String(today.getMonth() + 1).padStart(2, "0") + String(today.getDate()).padStart(2, "0");
    var party = v("legal") && v("legal") !== BIZ ? e(v("legal")) + ", doing business as " + e(BIZ) : e(BIZ);
    var pay = up >= 100 ? "The full setup fee (" + money(sn) + ") is due when this Agreement is signed."
      : up + "% (" + money(sn * up / 100) + ") is due when this Agreement is signed, and the remaining " + (100 - up) + "% (" + money(sn * (100 - up) / 100) + ") is due at Go-Live.";
    var mNote = md ? (months ? md + "% off for the first " + months + " months" : md + "% off for as long as this Agreement is active") : "";
    var mAfter = intro ? "Under the plan Client chose, the monthly fee is " + money(intro) + " for the first " + introM + " monthly payments. From month " + (introM + 1) + " on, it drops to " + money(mn) + "." : md ? (months ? "The discounted rate of " + money(mn) + " applies to the first " + months + " monthly payments. From month " + (months + 1) + " on, the monthly fee is the regular " + money(ml) + "." : "The discounted rate applies for as long as this Agreement is active.") : "";
    var term = minimum > 0
      ? "This Agreement has a minimum term of " + minimum + " months from the Effective Date. After that it continues month to month, and either party may cancel by giving 30 days' written notice; email counts."
      : "This Agreement continues month to month with no minimum term. Either party may cancel by giving 30 days' written notice; email counts.";
    if (intro) term += " Client chose the " + (planName ? planName + " " : "") + "payment plan, which takes a smaller setup payment in exchange for a higher monthly fee during the first " + introM + " months; the minimum term is a condition of that plan. Client was also offered the Pay-in-full plan: " + money(full.setup_list) + " setup paid at signing and " + money(full.monthly_list) + " per month, month to month, with no minimum term.";
    else if (minimum > 0 && (sd || md)) term += " The minimum term is a condition of the founding-partner discount only. Client was offered the regular plan instead: " + money(sl) + " setup paid in full up front and " + money(ml) + " per month, month to month, with no minimum term.";
    var CL = clauses();
    var sigBlock = function (who, title, name, tt, email) {
      return '<div><b>' + title + '</b><canvas data-sig="' + who + '"></canvas><button type="button" class="clr" data-clear="' + who + '">Clear signature</button><br>' +
        'Name: ' + name + '<br>Title: ' + tt + '<br>Email: ' + email + '<br>Date: <span data-date="' + who + '"></span></div>';
    };
    D.innerHTML =
      '<h1>SERVICES AGREEMENT</h1><p class="s">SousShift AI · Agreement no. SSAI-' + ymd + '-' + e(slug.slice(0, 12).toUpperCase()) + '</p>' +
      '<p>This Services Agreement (the "Agreement") is between <b>' + PROVIDER.co + '</b> ("Provider"), and <b>' + party + '</b> ("Client"), located at ' + (e(v("address")) || "the address on file") + '. It takes effect on the date of the last signature below (the "Effective Date").</p>' +
      '<h2>1. Services</h2><p>Provider will build, host and maintain the following for Client:</p><ul>' + SCOPE.filter(function (s) { return planName !== "Core" || s.indexOf("Full package only: ") !== 0; }).map(function (s) { return "<li>" + s.replace("Full package only: ", "") + "</li>"; }).join("") + '</ul>' +
      '<p>"Go-Live" means the day the Client\'s page and game are published and the table QR codes point to them. Provider will ask Client to approve the build before Go-Live. Changes outside this list are quoted and billed separately.</p>' +
      '<h2>2. Fees</h2><table class="f"><tr><th>Item</th><th>Regular price</th><th>Client\'s price</th></tr>' +
      '<tr><td>Setup (one time)</td><td>' + money(intro ? full.setup_list : sl) + '</td><td><b>' + money(sn) + '</b>' + (intro ? '<br><span class="sm">smaller setup under the ' + e(planName || "payment") + ' plan; offset by the plan monthly fee</span>' : "") + (sd ? '<br><span class="sm">' + sd + '% founding-partner discount</span>' : "") + '</td></tr>' +
      '<tr><td>Monthly service</td><td>' + money(ml) + ' / month</td><td><b>' + (intro ? money(intro) + ' / month</b><br><span class="sm">months 1–' + introM + ', then <b>' + money(mn) + ' / month</b></span>' : money(mn) + ' / month</b>') + (mNote ? '<br><span class="sm">' + mNote + '</span>' : "") + '</td></tr>' + CL.row + '</table>' +
      '<p><b>Setup payment:</b> ' + pay + '</p>' +
      '<p><b>Monthly payment:</b> The monthly fee starts on the Effective Date (the day this Agreement is signed) and is billed each month in advance on that date. ' + mAfter + '</p>' +
      '<p>If a payment is more than 15 days late, Provider may pause the service until it is paid. Prices do not include any third-party costs Client chooses to add (for example printing beyond the included QR table tents, paid advertising, or prizes).</p>' + CL.s2a +
      '<h2>3. Term and cancellation</h2><p>' + term + ' The setup fee is non-refundable once Provider has delivered the build for Client\'s review. ' + CL.cancel + '</p>' + CL.s3a +
      '<h2>4. Client responsibilities</h2><ul><li>Provide accurate menu items, prices, hours and photos, and tell Provider about changes.</li><li>Choose, fund and honor any prizes, discounts or rewards published in the game. Provider does not pay for prizes.</li><li>Run any prize promotion as a free-to-enter promotion with official rules, and follow the laws that apply to Client\'s business and promotions. Provider will supply standard official-rules text for Client to approve.</li></ul>' +
      '<h2>5. Ownership and data</h2><p>Client owns its business name, logo, menu content, photos it provides, and its customer data. Provider owns the software, game code and design system, and gives Client the right to use them for as long as this Agreement is active. Provider will not sell Client\'s customer data.</p>' + CL.s5a +
      '<h2>6. No guaranteed results</h2><p>Provider builds and runs the system but does not promise any specific number of customers, visits or sales.</p>' +
      '<h2>7. Limits on liability</h2><p>Neither party is liable for indirect or lost-profit damages. Provider\'s total liability under this Agreement is limited to the fees Client paid in the three months before the claim.</p>' +
      '<h2>8. Confidentiality</h2><p>Each party will keep the other\'s non-public business information confidential and use it only for this Agreement.</p>' +
      '<h2>9. Special terms</h2><p>' + (e(v("special")) || "None.") + '</p>' +
      '<h2>10. General</h2><p>California law governs this Agreement. It is the whole agreement between the parties on this subject, and any change must be in writing signed by both. Electronic signatures are valid and binding.</p>' +
      '<div class="sigs">' + sigBlock("client", "CLIENT: " + e(BIZ), e(v("owner_name")) || "&nbsp;", e(v("owner_title")) || "Owner", e(v("owner_email")) || "&nbsp;") +
      sigBlock("provider", "PROVIDER: Antidote Enterprises LLC dba SousShift AI", PROVIDER.name, "Owner", PROVIDER.email) + '</div>' +
      '<p class="sm">Prepared ' + today.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) + '.</p>';
    S.innerHTML = "Setup <b>" + money(sn) + "</b>" + (sd ? " (was " + money(sl) + ")" : "") + " · " + up + "% today = <b>" + money(sn * up / 100) + "</b><br>" +
      "Monthly <b>" + (intro ? money(intro) + "</b> × " + introM + ", then <b>" + money(mn) + "</b>" : money(mn) + "</b>") + (md && months ? " × " + months + ", then " + money(ml) : "") + (minimum ? " · " + minimum + "-month minimum" : "") +
      (F.ps.checked ? "<br>Performance share <b>" + num("ps_pct") + "%</b> of app sales in a month over <b>" + money(num("ps_th")) + "</b>" : "") +
      (F.rc.checked ? " · 90-day check (" + Math.round(num("rc_n")) + " returns/mo)" : "") + (F.cd.checked ? " · customer-data clause" : "");
    D.querySelectorAll("canvas[data-sig]").forEach(pad);
  }

  /* ---------- signature pads (redrawn from saved strokes on every re-render) ---------- */
  function pad(c) {
    var who = c.dataset.sig, r = c.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    c.width = Math.max(1, r.width * dpr); c.height = 110 * dpr;
    var x = c.getContext("2d"); x.scale(dpr, dpr); x.lineWidth = 2.2; x.lineCap = "round"; x.lineJoin = "round"; x.strokeStyle = "#0B2A6F";
    var data = sigs[who] || { strokes: [], when: "" }; sigs[who] = data;
    var paint = function () {
      x.clearRect(0, 0, c.width, c.height);
      data.strokes.forEach(function (s) { x.beginPath(); s.forEach(function (p, i) { (i ? x.lineTo : x.moveTo).call(x, p[0] * r.width, p[1] * 110); }); x.stroke(); });
      var d = D.querySelector('[data-date="' + who + '"]'); if (d) d.textContent = data.when;
    };
    paint();
    var cur = null;
    var pt = function (ev) { var b = c.getBoundingClientRect(); return [(ev.clientX - b.left) / b.width, (ev.clientY - b.top) / 110]; };
    c.onpointerdown = function (ev) { c.setPointerCapture(ev.pointerId); cur = [pt(ev)]; data.strokes.push(cur); };
    c.onpointermove = function (ev) { if (!cur) return; cur.push(pt(ev)); paint(); };
    c.onpointerup = function () { if (!cur) return; cur = null; data.when = new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }); paint(); };
  }

  /* ---------- wiring ---------- */
  F.addEventListener("input", render);
  o.querySelectorAll(".presets button").forEach(function (b) { b.onclick = function () { preset(b.dataset.p); }; });
  D.addEventListener("click", function (ev) { var w = ev.target.dataset && ev.target.dataset.clear; if (w) { sigs[w] = { strokes: [], when: "" }; render(); } });
  o.querySelector(".x").onclick = function () { o.classList.remove("on"); document.body.style.overflow = ""; if (location.hash === "#contract") history.replaceState(null, "", location.pathname + location.search); };
  o.querySelector(".pdf").onclick = function () {
    if (!v("owner_email")) { alert("Add the owner's email first."); return; }
    var t = document.title; document.title = BIZ + " - SousShift AI Agreement";
    window.print(); document.title = t;
  };
  function open() { o.classList.add("on"); document.body.style.overflow = "hidden"; render(); }
  k.querySelector("button").onclick = open;
  preset("full");
  if (location.hash === "#contract") open();
})();
