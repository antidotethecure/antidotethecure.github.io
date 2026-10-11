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
    rewardPerVisit: 0.20 // 10 pts per visit, 50 pts = $1 -> 20 cents per member visit if every point is cashed in
  };
  function run(p) {
    var o = {}, k; for (k in DEFAULTS) o[k] = DEFAULTS[k]; for (k in (p || {})) if (p[k] != null && !isNaN(p[k])) o[k] = +p[k];
    var hear = o.hear / 100, buy = o.buy / 100, join = o.join / 100, card = o.card / 100, lift = o.lift / 100, rep = o.rep / 100;
    var homesPassed = o.stops * o.homes;
    var todayCust = homesPassed * hear * buy;
    var todayRev = todayCust * o.ticket;
    var members = homesPassed * join;
    var rang = members * (1 - hear);          // members who would not have heard the music
    var alertCust = rang * buy;                // now come out at the same rate as people who hear it
    var repCust = members * buy * rep;         // members visit more often for points
    var allCust = todayCust + alertCust + repCust;
    var alertRev = alertCust * o.ticket, repRev = repCust * o.ticket;
    var cardRev = allCust * card * o.ticket * lift;
    var perStop = o.stops ? todayRev / o.stops : 0;
    var routeRev = o.min ? (o.save / o.min) * perStop : 0;
    var cost = members * buy * (1 + rep) * o.rewardPerVisit;
    var extraDay = alertRev + repRev + cardRev + routeRev - cost;
    var d = o.days;
    return {
      p: o, members: members, rang: rang, todayCustDay: todayCust,
      todayDay: todayRev, extraDay: extraDay,
      todayMo: todayRev * d, appMo: (todayRev + extraDay) * d, extraMo: extraDay * d,
      pct: todayRev ? extraDay / todayRev * 100 : 0,
      lines: { alert: alertRev * d, rep: repRev * d, card: cardRev * d, route: routeRev * d, cost: cost * d }
    };
  }
  function money(n, lang, cents) {
    return (n < 0 ? "−" : "") + "$" + Math.abs(n).toLocaleString(lang === "es" ? "es-US" : "en-US", { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 });
  }
  window.IceModel = { DEFAULTS: DEFAULTS, run: run, money: money };
})();
