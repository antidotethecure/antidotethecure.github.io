/* SousShift AI — Ice Cream Trucks money model. Shared by the quick tour (/ice-cream/) and the details page.
   All inputs are ESTIMATES the owner can change; sources live on /ice-cream/details/#sources.
   IceModel.DEFAULTS · IceModel.run(params) -> per-day + per-month numbers. */
(function () {
  "use strict";
  var DEFAULTS = {
    stops: 25,    // stops per day
    homes: 40,    // homes on the block within earshot at each stop
    hear: 50,     // % who hear the music today (Antidote's estimate, no study)
    buy: 10,      // % of those who hear it who come out and buy (calibrates "today" to ~$250/day; sources say $200-$400)
    join: 10,     // % of homes on the route that join the app (estimate)
    ticket: 5,    // average sale per customer, $ (truck items are mostly $2-$5)
    days: 22,     // working days per month
    card: 40,     // % paying by card / in the app (estimate)
    lift: 15,     // % bigger sale by card (studies: +32% vending, +40-50% Costco; we use 15%)
    rep: 20,      // % more visits from members (Circana 2025: ~22%)
    save: 20,     // minutes saved per day skipping dead streets (estimate)
    min: 8,       // minutes per stop, driving + serving (estimate)
    rewardPerVisit: 0.43, // per member visit if every reward is cashed in: 10 pts (20¢) + alerts-on bonus 5 pts (10¢)
                          // + 5th-visit reward (10% off or extra scoop, ~65¢ cost / 5 visits = 13¢)
    nocash: 15,   // % of would-be buyers with no cash who walk away today (estimate; Fed 2025: 24% carried no cash, we use a careful 15%)
    routeHomes: 0 // if > 0: homes counted on the owner's real route (route counter) replace stops × homes
  };
  /* Processing fees the OWNER pays straight to Square / Venmo / Cash App (not to SousShift). Verified Oct 2026,
     sources on /ice-cream/details/#pay. mix = share of digital sales we assume goes through each (estimate). */
  var FEES = [
    { id: "square", name: "Square Tap to Pay (cards, Apple Pay, Google Pay)", pct: 2.6, fixed: 0.15, mix: 55 },
    { id: "venmo", name: "Venmo business profile (QR)", pct: 1.9, fixed: 0.10, mix: 20 },
    { id: "cashapp", name: "Cash App for Business", pct: 2.75, fixed: 0, mix: 15 },
    { id: "zelle", name: "Zelle (business bank account)", pct: 0, fixed: 0, mix: 10 }
  ];
  function feePerSale(amount) {
    var f = 0, m = 0; FEES.forEach(function (x) { f += x.mix * (x.pct / 100 * amount + x.fixed); m += x.mix; });
    return m ? f / m : 0;
  }
  /* SousShift price for ice cream trucks — change it here, every page reads it.
     PRICING = the main tier (Double Scoop). TIERS = all three, cheapest first. */
  var PRICING = {
    setup: 299,          // one-time setup
    founding: 199,       // "founding truck" setup price
    foundingSlots: 10,   // ...for the first 10 trucks
    monthly: 50          // maintenance per month, no contract
  };
  /* has: which money lines from run() the tier turns on (alert = phones ring, rep = points/visits,
     pay = take every payment, route = route house counter). trucks = trucks covered by one plan. */
  var TIERS = [
    { id: "single", emoji: "🍦", setup: 99, monthly: 29, trucks: 1, has: { alert: 1, rep: 1 } },
    { id: "double", emoji: "🍨", setup: PRICING.setup, founding: PRICING.founding, foundingSlots: PRICING.foundingSlots,
      monthly: PRICING.monthly, trucks: 1, best: true, has: { alert: 1, rep: 1, pay: 1, route: 1 } },
    { id: "sundae", emoji: "🍧", setup: 599, monthly: 129, trucks: 3, has: { alert: 1, rep: 1, pay: 1, route: 1, blast: 1 } }
  ];
  function run(p) {
    var o = {}, k; for (k in DEFAULTS) o[k] = DEFAULTS[k]; for (k in (p || {})) if (p[k] != null && !isNaN(p[k])) o[k] = +p[k];
    var hear = o.hear / 100, buy = o.buy / 100, join = o.join / 100, card = o.card / 100, lift = o.lift / 100, rep = o.rep / 100;
    var homesPassed = o.routeHomes > 0 ? o.routeHomes : o.stops * o.homes;
    var todayCust = homesPassed * hear * buy;
    var todayRev = todayCust * o.ticket;
    var members = homesPassed * join;
    var rang = members * (1 - hear);          // members who would not have heard the music
    var alertCust = rang * buy;                // now come out at the same rate as people who hear it
    var repCust = members * buy * rep;         // members visit more often for points
    var allCust = todayCust + alertCust + repCust;
    var alertRev = alertCust * o.ticket, repRev = repCust * o.ticket;
    // payments: people who come out with no cash walk away today; taking cards/apps wins them back
    var nocash = Math.min(o.nocash, 90) / 100;
    var recCust = todayCust * nocash / (1 - nocash);
    var digCust = allCust * card + recCust;      // pay by card / app (everyone recovered pays digitally)
    var recRev = recCust * o.ticket;
    var cardRev = digCust * o.ticket * lift;      // bigger tickets on card
    var feeRev = digCust * feePerSale(o.ticket * (1 + lift));
    var perStop = o.stops ? todayRev / o.stops : 0;
    var routeRev = o.min ? (o.save / o.min) * perStop : 0;
    var cost = members * buy * (1 + rep) * o.rewardPerVisit;
    var extraDay = alertRev + repRev + recRev + cardRev + routeRev - cost - feeRev;
    var payDay = recRev + cardRev - feeRev;      // what taking every payment adds on its own
    var d = o.days;
    return {
      p: o, members: members, rang: rang, todayCustDay: todayCust,
      todayDay: todayRev, extraDay: extraDay,
      todayMo: todayRev * d, appMo: (todayRev + extraDay) * d, extraMo: extraDay * d,
      pct: todayRev ? extraDay / todayRev * 100 : 0, homesPassed: homesPassed,
      payMo: payDay * d, feeRate: feePerSale(o.ticket * (1 + lift)) / (o.ticket * (1 + lift)),
      lines: { alert: alertRev * d, rep: repRev * d, rec: recRev * d, card: cardRev * d, fees: feeRev * d, route: routeRev * d, cost: cost * d }
    };
  }
  function money(n, lang, cents) {
    return (n < 0 ? "−" : "") + "$" + Math.abs(n).toLocaleString(lang === "es" ? "es-US" : "en-US", { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 });
  }
  function roiCount(ticket, monthly) { return Math.ceil((monthly || PRICING.monthly) / (ticket || DEFAULTS.ticket)); }
  /* Estimated extra per month a tier earns the owner (all its trucks), and what's left after the SousShift fee. */
  function tierRun(tier, p) {
    var r = run(p), L = r.lines, h = tier.has, one = 0;
    if (h.alert) one += L.alert;
    if (h.rep) one += L.rep - L.cost;
    if (h.pay) one += L.rec + L.card - L.fees;
    if (h.route) one += L.route;
    var extra = one * tier.trucks;
    return { extra: extra, keep: extra - tier.monthly, perTruck: tier.monthly / tier.trucks, roi: roiCount(r.p.ticket, tier.monthly) };
  }
  window.IceModel = { DEFAULTS: DEFAULTS, run: run, money: money, FEES: FEES, feePerSale: feePerSale, PRICING: PRICING, TIERS: TIERS, tierRun: tierRun, roiCount: roiCount };
})();
