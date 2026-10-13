/* SousShift AI · Christian's restaurants (Melody Bar & Grill + Nalu Vida): ONE place for the backend URL and the live
   reward / discount values.
   - API: the Apps Script web app /exec URL (command-center/clients/melody-lax/signup-sheet/Code.gs, deployed under
     secondshiftai@gmail.com). EMPTY = not deployed yet: every app falls back to the values written below / in the page.
   - DEFAULTS: the reward ladder + Just Landed deal exactly as hard-coded in demo/melody-lax and demo/nalu-vida
     (window.SSAI_REWARDS). tests/christian-backoffice.mjs checks they match.
   - Live values: the back office ("Christian HQ") Discounts editor saves changes to the backend (passcode + emailed
     one-time code). Every app reads GET <API>?discounts=1 (no customer data in it) and applies the changes over the
     defaults; the last good answer is cached on the phone, so a failed fetch keeps the previous / hard-coded values.
   Include on a restaurant page right AFTER its window.SSAI_REWARDS block and BEFORE crm.js / interim.js:
     <script src="../christian-live.js" data-slug="melody-bar-grill"></script>
   The staff app and Christian HQ include it too and use window.SSAI_CHRISTIAN (read only on the staff side). */
(function () {
  "use strict";
  var API = "";   // ← paste the Apps Script /exec URL here (one deployment serves both restaurants)
  var DEFAULTS = {
    "melody-bar-grill": { name: "Melody Bar & Grill", short: "Melody", prefix: "MEL", page: "demo/melody-lax/", game: "Melody Approach",
      perDollar: 10, join: 100, birthday: 250, referral: 100, game_: { perScore: 100, dailyCap: 50 },
      tiers: [[250, "Free soft drink or Melody Fries", { button: "App Reward – Free Soft Drink or Melody Fries", type: "item", max: 5.75 }],
        [500, "Free starter: Fried Green Beans, Avocado Toast or Chicken Pot Stickers", { button: "App Reward – Free Starter", type: "item", max: 15.00 }],
        [1000, "$10 off your check", { button: "App Reward – $10 Off", type: "fixed", amount: 10 }],
        [1500, "Free entrée: any Mac & Cheese or burrito", { button: "App Reward – Free Entrée", type: "item", max: 21.50 }]],
      justLanded: { offer: "10% off your first order today", toast: { button: "App – Just Landed 10% Off", type: "percent", percent: 10 }, note: "Landed at LAX in the last 24 hours? Show your boarding pass to your server. One per guest, can't be combined with other offers." },
      toastStatus: { state: "done", when: "2026-10-12", note: "All 5 buttons set up in Toast (confirmed by Antidote, Oct 12, 2026)" } },
    "nalu-vida": { name: "Nalu Vida", short: "Nalu Vida", prefix: "NV", page: "demo/nalu-vida/", game: "Ride the Nalu",
      perDollar: 10, join: 100, birthday: 250, referral: 100, game_: { perScore: 100, dailyCap: 50 },
      tiers: [[250, "Free mocktail, soft drink or Jungle Fries", { button: "App Reward – Free Mocktail/Soft Drink/Jungle Fries", type: "item", max: 15.00 }],
        [500, "Free shareable: Chips, Salsa & Guac, Calamari or Wings", { button: "App Reward – Free Shareable", type: "item", max: 17.00 }],
        [1000, "$10 off your check", { button: "App Reward – $10 Off", type: "fixed", amount: 10 }],
        [1500, "Free entrée: any Signature Island Tacos or the Poke Bowl", { button: "App Reward – Free Entrée", type: "item", max: 24.00 }]],
      justLanded: null,
      toastStatus: { state: "tbd", when: "", note: "TBD: not confirmed yet that the 4 buttons are set up in Nalu Vida's Toast" } }
  };
  var CKEY = "ssai_christian_disc_v1";
  function cached() { try { var c = JSON.parse(localStorage.getItem(CKEY) || "null"); return c && c.d ? c : null; } catch (x) { return null; } }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function int(v, lo, hi) { v = Math.round(+v); return isFinite(v) && v >= lo && v <= hi ? v : null; }
  function num(v, lo, hi) { v = Math.round(+v * 100) / 100; return isFinite(v) && v >= lo && v <= hi ? v : null; }
  function txt(v) { v = String(v == null ? "" : v).replace(/[<>]/g, "").trim(); return v.length >= 3 && v.length <= 80 ? v : null; }
  // apply the backend's overrides ({t0:{pts,label,amount}, …, jl:{percent}}) onto a rewards object IN PLACE
  // (crm.js holds the same tiers array, so a later redraw shows the new values)
  function apply(R, o) {
    if (!R || !o) return R;
    (R.tiers || []).forEach(function (t, i) {
      var x = o["t" + i]; if (!x) return;
      var p = int(x.pts, 10, 100000), l = txt(x.label), a = num(x.amount, 0.5, 500);
      if (p != null) t[0] = p;
      if (t[2] && t[2].type === "fixed" && a != null) { t[2].amount = a; if (l == null) t[1] = t[1].replace(/\$\d+(\.\d+)?/, function () { return "$" + (a % 1 ? a.toFixed(2) : a); }); }
      if (l != null) t[1] = l;
    });
    var j = o.jl, jl = R.justLanded;
    if (j && jl && jl.toast) { var pc = int(j.percent, 1, 90); if (pc != null) { jl.toast.percent = pc; jl.offer = jl.offer.replace(/\d+%/, function () { return pc + "%"; }); } }
    return R;
  }
  function slugOf(el) { var s = el && el.getAttribute && el.getAttribute("data-slug"); if (s) return s; return /nalu/.test(location.pathname) ? "nalu-vida" : /melody/.test(location.pathname) ? "melody-bar-grill" : ""; }
  var me = document.currentScript, SLUG = slugOf(me), listeners = [];
  function fetchLive(cb) {
    if (!API) { if (cb) cb(null); return; }
    fetch(API + (API.indexOf("?") < 0 ? "?" : "&") + "discounts=1&t=" + Math.floor(Date.now() / 6e4), { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (!j || !j.ok || !j.d) throw 0; var c = { ts: Date.now(), rev: j.rev || 0, d: j.d }; try { localStorage.setItem(CKEY, JSON.stringify(c)); } catch (x) {} if (cb) cb(c); listeners.forEach(function (f) { try { f(c); } catch (x) {} }); })
      .catch(function () { if (cb) cb(null); });
  }
  // live values for one restaurant: defaults + cached overrides (sync), then fresh ones via onChange
  function rewards(slug) { var c = cached(), R = clone(DEFAULTS[slug] || {}); return c ? apply(R, c.d[slug]) : R; }
  window.SSAI_CHRISTIAN = { api: API, defaults: DEFAULTS, rewards: rewards, apply: apply, fetch: fetchLive, cached: cached,
    onChange: function (f) { listeners.push(f); }, slugs: ["melody-bar-grill", "nalu-vida"] };
  // on a restaurant page: the backend URL goes to interim.js / crm.js, and the live values onto SSAI_REWARDS
  var R = window.SSAI_REWARDS;
  if (R && SLUG && DEFAULTS[SLUG]) {
    if (R.interim && !R.interim.api && API) R.interim.api = API;
    var c = cached(); if (c) apply(R, c.d[SLUG]);
    fetchLive(function (fresh) {
      if (!fresh) return;
      var before = JSON.stringify([R.tiers, R.justLanded]); apply(R, fresh.d[SLUG]);
      if (JSON.stringify([R.tiers, R.justLanded]) === before) return;
      if (window.SSAI_CRM && SSAI_CRM.redraw) SSAI_CRM.redraw();
      var lo = document.getElementById("landoffer"); if (lo && R.justLanded) lo.textContent = "Just Landed: " + R.justLanded.offer;
    });
  }
})();
