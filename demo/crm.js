/* SousShift AI — "Join the club" signup + the owner's customer list, for every demo page.
   Include once (before nearby.js so it sits above the map):
     <script>window.CRM_CFG={name:"StormBurger", offer:"Free fries with your next burger", mount:"#optional-selector"};</script>
     <script src="../crm.js"></script>
   DEMO MODE: what a visitor types is saved only on their own phone (localStorage) and shown in the owner
   list next to sample customers, so the flow can be shown without collecting anyone's real data.
   Live, the same form writes to the business's own customer database, which they own and can export.
   Points work like the big chains' apps (McDonald's style): members earn points per $1 by showing a QR / 4-digit
   code to the cashier or bartender, or by typing the code from a receipt, then trade points for rewards.
   Referrals: every member gets a code; a friend who joins with it earns them points, and they keep earning
   every time that friend orders. Optional per-business config:
     CRM_CFG.tiers = [[250,"Free fries"],[500,"Free shake"],...]      (points → reward)
     CRM_CFG.perDollar = 10                                              (points per $1)
     CRM_CFG.referral = {join:50, first:100, every:20, goal:3, gift:"Free fries"}
   Ways to earn (CRM_CFG.earn, see the EARN block for every key): QR check-in bonus once a day, first-order bonus, in-app
   feedback bonus (any rating; never for Google/Yelp reviews), Instagram follow, birthday bonus, referral (friend joins →
   points, friend gets REF.friendGift, referrer earns on every order that friend places). A "How to earn" sheet opens once
   when a guest first reaches the rewards card (not on load) and once right after joining; "Ways to earn" reopens it.
   Contact info is asked only when it's needed: SSAI_GATE("order" | "prize" | "score", cb) wraps sending an order,
   saving a game prize and posting a score. Members go straight through; everyone else fills a short sheet first.
   Nothing pops up on load asking for contact info; the join card stays as an optional "join anytime".
   SPLIT WALLETS (opt-in, for spots with a bar + a kitchen): CRM_CFG.wallets = { split:true, bar:{label, icon, perDollar, tiers},
   food:{label, icon, perDollar, tiers}, bonusTo:"food" } gives every member TWO balances that never mix: bar points are earned
   only on drinks and buy only bar rewards; kitchen points are earned only on food and buy only food rewards. See the WALLETS
   block below. Without wallets.split everything works exactly as the single balance always has.
   TEXTING / CONSENT (TCPA): the sign-up has two separate boxes. "ok" (required) = send MY rewards (points, prize and birthday
   codes): transactional. "sms" (optional, UNCHECKED by default) = "📲 Text me deals": prior express written consent to get
   recurring MARKETING texts. Marketing texts (holiday blasts, "we miss you", promos) go ONLY to members with sms consent
   and a phone number, never to anyone who replied STOP (r.stop). Each member keeps r.smsAt (when) and r.smsSrc (where) as
   the consent record, and the CSV export carries them. Every marketing text names the restaurant and ends with
   "Reply STOP to opt out"; STOP/HELP replies are honored automatically by the text agent. Quiet hours: marketing texts only
   go out 8 AM–9 PM in the restaurant's local time (LA). Consent is never a condition of buying anything.
   HOLIDAY BLAST: with demo/specials.js on the page, the owner view gets a "Holiday blast" composer per active special
   (or the next one coming up): pre-written SMS, opted-in audience count, send date/time, preview, "Queue for approval".
   DEMO: nothing is ever sent; the queue lives on this phone. LIVE: a queued blast goes to the owner to approve and then
   out through the SousShift AI Text Assistant (Twilio), which enforces consent, STOP and quiet hours. Holiday blasts are part
   of the AI Text Assistant add-on ($75/mo; also in Voice + Text $150/mo, see /agents/). */
(function () {
  "use strict";
  var C = window.CRM_CFG || {};
  // ---- SIMPLE PROGRAM (opt-in: CRM_CFG.simple, used by Melody + Nalu Vida since Christian's 2026-10 feedback) ----
  // One plain Starbucks / McDonald's-style program: ONE points balance per restaurant, points per eligible $1 (staff ring-up),
  // plus a few capped bonuses, and one rewards ladder. Everything else in this file that stacks discounts is switched off:
  // no split wallets, no visit levels / multipliers, no tokens, no daily spin, no daily draw, no check-in / first-order /
  // feedback / Instagram bonuses, no welcome voucher, no friend gift, no 3-friend gift, no missed-call voucher (unless
  // CRM_CFG.missed is set explicitly). Shape (the page keeps it in ONE object, window.SSAI_REWARDS):
  //   { perDollar:10, join:100, birthday:250, referral:100, game:{perScore:100, dailyCap:50}, tiers:[[250,"…"],…] }
  //   join      points once, when a guest joins
  //   birthday  points once a year, on the birthday
  //   referral  points to the member per friend who joins with their code AND makes a first visit
  //   game      1 point per `perScore` game score, at most `dailyCap` game points a day (LA date). Guests can play first;
  //             their points are held on this phone for the day and credited when they join (window.SSAI_GAMEPTS).
  var SIMPLE = C.simple || null;
  if (SIMPLE) { SIMPLE.game = SIMPLE.game || {}; if (!SIMPLE.game.perScore) SIMPLE.game.perScore = 100; if (SIMPLE.game.dailyCap == null) SIMPLE.game.dailyCap = 50;
    if (SIMPLE.join == null) SIMPLE.join = 100; if (SIMPLE.birthday == null) SIMPLE.birthday = 250; if (SIMPLE.referral == null) SIMPLE.referral = 100;
    if (SIMPLE.perDollar) C.perDollar = SIMPLE.perDollar; if (SIMPLE.tiers) C.tiers = SIMPLE.tiers;
    C.wallets = null; C.tokens = null; C.spin = null; C.draw = null; C.levels = C.levels || [{ visits: 0, name: "Member", perk: "", mult: 1 }]; }
  // INTERIM MODE (SIMPLE.mode === "interim", Melody + Nalu until Toast approves the integration): staff never use their own
  // phones. Guests earn with "Add my visit" (receipt claim) and redeem with a live "show and tap" pass; both flows live in
  // demo/interim.js, which this file hands the member store to through window.SSAI_CRM. The QR / ring-up / receipt-code
  // demo controls are hidden and the ladder buttons read "Use reward".
  var INTERIM = !!(SIMPLE && SIMPLE.mode === "interim");
  // CUSTOMER-ONLY (opt-in: window.SSAI_CUSTOMER_ONLY or CRM_CFG.customerOnly; Melody since 2026-10-13): the page is a live
  // customer app, so the owner view (customer list, holiday blast, ring-up, app sales, performance share, top referrers,
  // and interim.js's manager log that mounts next to it) is never put on the page, and every "Demo:" button / note is hidden.
  // Owner tools live in the back office. Pitch/demo pages leave this unset and keep the full owner view.
  var CUST = !!(window.SSAI_CUSTOMER_ONLY || C.customerOnly);
  var NAME = C.name || (window.NEARBY && window.NEARBY.name) || document.title.split(" — ")[0];
  var OFFER = SIMPLE ? SIMPLE.join + " welcome points" : C.offer || "10% off your next visit";
  var SLUG = NAME.toLowerCase().replace(/[^a-z0-9]+/g, "-"), KEY = "ssai_crm_" + SLUG;
  // ---- BACK OFFICE SYNC (simple program, Christian's restaurants, 2026-10-12) ----
  // The owner's back office (/backoffice/christian/, "Christian HQ") reads members, points, game plays and app opens from
  // the Apps Script web app (command-center/clients/melody-lax/signup-sheet/Code.gs). Its /exec URL lives in
  // SSAI_REWARDS.interim.api (filled from demo/christian-live.js). EMPTY = nothing leaves the phone (today's state).
  // What is sent: a member snapshot whenever the member changes (name, phone, email, birthday, points balance / earned /
  // used, visits, referral code + who referred them, text consent), one "game" row per finished run, and one "open" per
  // app open (max 1 per 10 min: time, device summary, Home Screen or not, approximate location only if already allowed;
  // see logOpen below). Nothing is sent from staff practice mode.
  var API = C.sheet || (SIMPLE && SIMPLE.interim && SIMPLE.interim.api) || "";
  if (API && !C.sheet) C.sheet = API;
  // STAFF PRACTICE (?staff=1, opened from the staff app /staff/christian/): game runs go to the employee's practice tally
  // (this phone + the backend's StaffPractice tab), never to a member, real rewards or the customer leaderboard.
  var STAFF = null;
  try { if (SIMPLE && /[?&]staff=1(&|$)/.test(location.search)) STAFF = { name: String(localStorage.getItem("ssai_staff_name") || "Staff").slice(0, 24) }; } catch (x) { if (SIMPLE && /[?&]staff=1(&|$)/.test(location.search)) STAFF = { name: "Staff" }; }
  function boPost(o) {
    if (!API || STAFF && o.type !== "staff_practice") return;
    o.slug = SLUG; o.restaurant = NAME;
    try { fetch(API, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(o) }).catch(function () {}); } catch (x) {}
  }
  // SCOUT (Code.gs): every points event carries a unique event id (eid). The server rejects duplicates and over-cap awards
  // ("Already counted") and writes an adjustment for points this phone showed but the server refused; pullAdj() applies it once.
  function evId(p) { return p + Date.now().toString(36) + code4(6); }
  var syncT = 0, syncM = null;
  // like boPost, but the answer is readable (text/plain = a "simple" CORS request): the server hands back the card ID
  function memberPost(o) {
    o.slug = SLUG; o.restaurant = NAME;
    try { fetch(API, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(o) }).then(function (x) { return x.json(); }).then(function (j) {
      if (j && j.dup) {   // server: this phone number / email / phone already has a membership here (one per person, one per phone)
        var dl = mine(), dm = dl[0]; if (!dm || dm.id !== o.id) return;
        if (j.same && j.member) { rsApply(j); toast("✅ You're already a member here. We kept your original card and points."); }
        else { toast("📱 That number is already a member. Sign back in to use it on this phone."); openRestore(); }
        return;
      }
      if (!j || !j.card || !/^[A-Z]{2,4}-[A-Z0-9]{5}$/.test(j.card)) return;
      var l = mine(), m = l[0]; if (!m || m.id !== o.id || m.card === j.card) return;
      m.card = j.card; save(l); drawJoin(); if (window.SSAI_CARD && SSAI_CARD.refresh) SSAI_CARD.refresh();
    }).catch(function () {}); } catch (x) {}
  }
  function syncLater(m) {
    if (!API || STAFF || !SIMPLE || !m || !m.id || m.sample) return;
    syncM = m; clearTimeout(syncT);
    syncT = setTimeout(function () {
      var r = syncM; if (!r) return;
      // the reply carries the member's permanent card ID (assigned server-side, e.g. MLD-4K7Q2): keep it on the phone
      memberPost({ type: "member", id: r.id, name: r.name, phone: r.phone || "", email: r.email || "",
        bday: r.bday >= 0 ? (r.bday + 1) + "/" + (r.bdd || "") + "/" + (r.bdy || "") : "", joined: r.joined || 0, last: r.last || 0,
        stars: r.stars || 0, earned: r.earned != null ? r.earned : (r.stars || 0), spent: r.spent || 0, visits: r.visits || 0,
        ref: r.ref || "", refBy: r.refBy || "", friends: (r.friends || []).length, gameTotal: r.gtot || 0, redeems: r.nred || 0,
        sms: r.sms && !r.stop ? "yes" : "no", smsAt: r.smsAt ? new Date(r.smsAt).toISOString() : "", src: r.src || "", dev: devId() });
    }, 1200);
  }
  // contact gate: guests only give their info when they order or save a game prize / score (see gate() below).
  // Exposed right away so game and order code can call it: SSAI_GATE("order" | "prize" | "score", function (member) { ... })
  window.SSAI_GATE = gate;
  var e = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var PER = C.perDollar || 10;
  // ---- WALLETS: split bar points vs kitchen points (opt-in via CRM_CFG.wallets.split) ----
  //   bar:  {label:"Bar", icon:"🍸", perDollar, tiers:[[pts,"reward"],...]}   earned ONLY on drink $, spent ONLY on bar tiers
  //   food: {label:"Kitchen", icon:"🍔", perDollar, tiers:[...]}             earned ONLY on food $, spent ONLY on food tiers
  //   bonusTo: "food" | "bar"   where ways-to-earn bonus points land (welcome, check-in, first order, feedback, Instagram,
  //            birthday, referral join). Referral "earn when your friend spends" goes to the wallet matching what the friend
  //            bought (food → kitchen, drinks → bar). A purchase is entered as separate Food $ and Bar $ (register, receipt,
  //            ring-up) or carried by the app's order (SSAI_EARN(total, why, {food, bar})); the visit-level multiplier applies to both.
  // Members store m.w = {bar, food}; m.stars stays the sum so older code and exports keep working. Ledger lines carry w.
  // Redeemed codes are BAR-xxxx / FOOD-xxxx so staff can tell which side of the house the reward belongs to.
  // CALIFORNIA ABC: a bar reward must NEVER be a free alcoholic drink (Bus. & Prof. Code 25600: no alcohol as a free
  // premium, prize or gift). Bar tiers are drink DISCOUNTS ("$3 off any drink", "Half off any cocktail") or free
  // NON-alcoholic items (mocktail, soda). Keep every config's bar tiers that way.
  var WAL = C.wallets && C.wallets.split ? C.wallets : null, WK = ["bar", "food"], W = {};
  var TIERS0 = [[250, "Free side"], [500, "Free drink"], [800, "Free entrée"], [1200, "Free meal"]];
  if (WAL) WK.forEach(function (k) {
    var s = WAL[k] || {}, isBar = k === "bar";
    W[k] = { k: k, label: s.label || (isBar ? "Bar" : "Kitchen"), icon: s.icon || (isBar ? "🍸" : "🍔"), per: s.perDollar || PER,
      tiers: s.tiers || (isBar ? [[250, "$3 off any drink"], [500, "Half off any cocktail"], [800, "Free mocktail"]] : (C.tiers || TIERS0)) };
  });
  var BONUS = WAL && WAL.bonusTo === "bar" ? "bar" : "food";
  function wname(k) { return W[k].icon + " " + W[k].label; }
  // migration: a member saved before the split (single m.stars balance) gets those points in the KITCHEN wallet, so
  // nothing is lost, and old points can't turn into drink discounts they were never earned on. New members start at 0 / 0.
  function migrate(m) {
    if (!WAL || !m || m.w) return false;
    var old = m.stars || 0; m.w = { bar: 0, food: old };
    if (old) (m.ledger = m.ledger || []).unshift({ ts: Date.now(), pts: 0, t: "↪ Your " + old.toLocaleString() + " earlier points moved to your " + wname("food") + " balance", w: "food" });
    return true;
  }
  // ---- MAX REWARD VALUE (Christian, 2026-10-27) ----
  // No reward may be worth more than ONE FULL MEAL: maxValue is the priciest entree on that restaurant's own menu
  // (SSAI_REWARDS.maxValue, or CRM_CFG.maxValue on a page without the simple program). A guest can take that and
  // anything under it, one a day (see the redeem handler below). A tier over the cap is not put on the ladder and the
  // console names it, so whoever edited the config sees why. A tier with no declared dollar value can't be judged, so
  // it stays: toast.max is the priciest item the reward covers, toast.amount the $ off the check.
  function tierValue(t) { var b = (t && t[2]) || {}; return +(b.max != null ? b.max : b.amount) || 0; }
  function capTiers(tiers, cap) {
    if (!(cap > 0) || !tiers) return tiers;
    return tiers.filter(function (t) {
      var v = tierValue(t); if (v <= cap) return true;
      try { console.warn('[rewards] "' + t[1] + '" is worth $' + v.toFixed(2) + ', over the $' + cap.toFixed(2) + ' max reward (one full meal) - not offered'); } catch (x) {}
      return false;
    });
  }
  var MAXV = +((SIMPLE && SIMPLE.maxValue) || C.maxValue) || 0;
  var TIERS = capTiers(WAL ? W.food.tiers : (C.tiers || TIERS0), MAXV);
  // the page's "How to earn" sheet and the game end screens read SSAI_REWARDS.tiers, so they show the same capped ladder
  if (SIMPLE && SIMPLE.tiers && !WAL) SIMPLE.tiers = C.tiers = TIERS;
  var REF = { join: 50, first: 100, every: 20, goal: 3, gift: TIERS[0][1] };
  // visit levels: the more visits in a calendar month, the higher the level (bigger perk + points multiplier).
  // The numbers are samples; each restaurant sets its own in CRM_CFG.levels: [{visits, name, perk, mult}]
  var LEVELS = C.levels || [{ visits: 1, name: "Member", perk: "Member points", mult: 1 }, { visits: 3, name: "Regular", perk: "10% off one item", mult: 1.25 },
    { visits: 6, name: "VIP", perk: "20% off your order", mult: 1.5 }, { visits: 10, name: "Legend", perk: "40% off your order", mult: 2 }];
  function monthVisits(m) { var d = new Date(), k = d.getFullYear() * 12 + d.getMonth(); return (m.vlog || []).filter(function (t) { var x = new Date(t); return x.getFullYear() * 12 + x.getMonth() === k; }).length; }
  function levelOf(m) { var v = monthVisits(m), L = LEVELS[0]; LEVELS.forEach(function (l) { if (v >= l.visits) L = l; }); return L; }
  function nextLevel(m) { var v = monthVisits(m); return LEVELS.filter(function (l) { return l.visits > v; })[0] || null; }
  // one visit per day counts; points earned on that visit get the level's multiplier
  // a new day's visit also pays the check-in bonus, and the member's very first order pays the first-order bonus
  function visit(m, pts) {
    var now = Date.now(), last = (m.vlog || [])[0]; lastBonus = 0;
    if (!last || new Date(last).toDateString() !== new Date(now).toDateString()) { (m.vlog = m.vlog || []).unshift(now); if (EARN.checkin) { addPts(m, EARN.checkin, "📲 Showed your QR · visit bonus"); tag(m, "checkin_bonus"); lastBonus += EARN.checkin; } }
    lastBonus += earnOnce(m, "first_order", EARN.firstOrder, "🥇 First order bonus");
    m.vlog = m.vlog.slice(0, 60); return Math.round(pts * levelOf(m).mult);
  }
  for (var rk in (C.referral || {})) REF[rk] = C.referral[rk];
  // ---- ways to earn: every guest always has a next thing to do for points ----
  // CRM_CFG.earn overrides any of these per restaurant (sample defaults). The "How to earn" sheet puts each one next to
  // the first reward (TIERS[0]) so a guest reads "Fries = 1,000 pts · feedback = +250 · refer a friend = +150".
  // Bonuses land in the ledger with k: checkin_bonus, first_order_bonus, review_bonus, ig_bonus, birthday_bonus,
  // referral_join, referral_order, so the owner view and CSV can count them.
  //   checkin:    pts once per day when staff scan the member's QR / 4-digit code (rides visit() above)
  //   firstOrder: one-time bonus on the member's first order (QR/code at the register or an in-app order)
  //   review:     {pts, platform: "app" | "google" | "yelp", url}. Once per member. platform "app" (default) pays for
  //               honest in-app feedback at ANY star rating: the rating never changes the points. Afterwards a Google /
  //               Yelp link (url, or a Google Maps search for the business) is offered to EVERYONE with no points attached.
  //               COMPLIANCE: Google's review policy prohibits offering incentives for Google reviews (reviews get removed,
  //               the listing can be flagged); Yelp prohibits asking for or rewarding reviews; the FTC rule on reviews
  //               (16 CFR 465) bans rewards conditioned on positive sentiment. Showing the Google link only to happy raters
  //               is "review gating", which Google also bans, so the link shows the same for 1 star or 5.
  //               An owner who sets platform "google"/"yelp" anyway pays for the act of reviewing (honor system), still
  //               never tied to the rating, but that alone can get their reviews removed. Keep "app" unless told otherwise.
  //   instagram:  {pts, url}: follow once, honor system. Hidden when no url is set (never guess a handle).
  //   birthday:   pts on the birthday itself (on top of the birthday treat), once a year
  //   referral:   merged into REF: join = referrer's pts per friend who joins, friend = pts the friend gets for joining,
  //               friendGift = what the friend gets free with their first order, first = referrer's pts on that friend's
  //               first order, every = referrer's pts EVERY time that friend orders after that. friendGift is never alcohol
  //               (California ABC: no free alcoholic drinks as a promotion).
  var EARN = { checkin: 50, firstOrder: 100, birthday: 100, review: { pts: 250, platform: "app", url: "" }, instagram: { pts: 50, url: "" }, referral: {} };
  (function (x) { for (var k in x) { var a = EARN[k], b = x[k]; if (a && b && typeof a === "object" && typeof b === "object") { for (var j in b) a[j] = b[j]; } else EARN[k] = b; } })(C.earn || {});
  if (!(C.referral && C.referral.join)) REF.join = 150;
  if (REF.friend == null) REF.friend = 50;
  if (!REF.friendGift) REF.friendGift = "Free soft drink";
  for (rk in EARN.referral) REF[rk] = EARN.referral[rk];
  if (SIMPLE) {   // only the bonuses the owner chose: join, birthday, referral (on the friend's first visit), game (capped)
    EARN.checkin = 0; EARN.firstOrder = 0; EARN.review = { pts: 0, platform: "app", url: "" }; EARN.instagram = { pts: 0, url: "" }; EARN.birthday = SIMPLE.birthday;
    REF.join = 0; REF.friend = 0; REF.first = SIMPLE.referral; REF.every = 0; REF.goal = 0; REF.gift = ""; REF.friendGift = "";
  }
  function reviewUrl() { var N = window.NEARBY, sp = N && N.spots && N.spots[0]; return EARN.review.url || "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(NAME + (sp && sp.q ? " " + sp.q : "")); }
  var lastBonus = 0;   // bonus pts added by the last visit() call, for the toast
  // one-time bonus keys live in m.once (m.earned is the lifetime points NUMBER from addPts; older builds kept the keys in m.earned)
  function onceMap(m) { if (!m.once) m.once = (m.earned && typeof m.earned === "object") ? m.earned : {}; if (typeof m.earned === "object") m.earned = null; return m.once; }
  function earnOnce(m, key, pts, why) { var o = onceMap(m); if (o[key] || !pts) return 0; o[key] = Date.now(); addPts(m, pts, why); tag(m, key.replace(/_\d+$/, "") + "_bonus"); return pts; }
  function tag(m, k) { m.ledger[0].k = k; (m.ec = m.ec || {})[k] = (m.ec[k] || 0) + 1;
    // bonus points (join, birthday, referral, spin, check-in…) go to the server ledger; game points and interim claims have their own events
    if (SIMPLE && API && !STAFF && m.id && !m.sample && m.ledger[0].pts > 0 && k !== "game_bonus" && /_bonus$|^referral_/.test(k))
      boPost({ type: "award", source: k, pts: m.ledger[0].pts, member: m.id, dev: devId(), eid: evId("A") }); }
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var MONTHS_L = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  // birthday: full date so the treat lands on the real day; staff check a photo ID with the same date before giving it out
  function bdayStr(r) { return r.bday >= 0 ? MONTHS_L[r.bday] + (r.bdd ? " " + r.bdd : "") : ""; }
  function isBday(r) { var t = new Date(); return r.bday === t.getMonth() && (!r.bdd || r.bdd === t.getDate()); }

  var css = [
    ".crm-card{all:initial;display:block;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#EEF2FF;background:#121C40;border:1px solid #25336A;border-radius:20px;padding:18px 16px;margin:22px auto;max-width:640px;box-sizing:border-box;line-height:1.45;text-align:left}",
    ".crm-card *{box-sizing:border-box;font-family:inherit}",
    ".crm-card .k{font:800 11px ui-monospace,Menlo,monospace;letter-spacing:.16em;text-transform:uppercase;color:#FFD23F}",
    ".crm-card h3{font-size:21px;font-weight:900;margin:3px 0 4px;color:#EEF2FF}",
    ".crm-card p{margin:0 0 12px;color:#9AA6CC;font-size:14px}",
    ".crm-card label{display:block;font-size:12.5px;font-weight:700;color:#9AA6CC;margin:10px 0 4px}",
    ".crm-card input,.crm-card select{width:100%;font-size:16px;color:#EEF2FF;background:#070B1E;border:1px solid #25336A;border-radius:12px;padding:11px}",
    ".crm-card .two{display:grid;grid-template-columns:1fr 1fr;gap:8px}",
    ".crm-card .three{display:grid;grid-template-columns:1.3fr 1fr 1.1fr;gap:8px}",
    ".crm-idnote{font-size:12px;color:#9AA6CC;margin:6px 0 2px;line-height:1.4}",
    ".crm-bday{background:#b04af71f;border:1px solid #b04af766;border-radius:16px;padding:14px;margin-top:12px}.crm-bday h4{margin:0 0 4px;color:#D7A6FF}",
    ".crm-win.bd{border-color:#D7A6FF;margin-top:12px}",
    ".crm-card .crm-optin{display:flex;gap:9px;align-items:flex-start;font-size:12.5px;color:#C9D2EE;margin-top:12px;font-weight:500}",
    ".crm-card .crm-optin input{width:20px;height:20px;flex:none;accent-color:#E8582A;margin-top:1px;padding:0}",
    ".crm-card .go{display:block;width:100%;margin-top:12px;border:0;border-radius:14px;padding:14px;font-size:16px;font-weight:900;color:#fff;background:#E8582A;box-shadow:0 8px 24px #e8582a55;cursor:pointer}",
    ".crm-card .err{color:#FF6B5E;font-size:13px;min-height:1em;margin-top:8px}",
    ".crm-gift{display:flex;gap:12px;align-items:center;background:linear-gradient(135deg,#E8582A,#FFD23F);color:#1a0d00;border-radius:16px;padding:12px 14px;margin-bottom:12px;font-weight:800;font-size:15px}",
    ".crm-gift b{font-size:30px}",
    ".crm-win{text-align:center;background:#070B1E;border:2px dashed #FFD23F;border-radius:18px;padding:18px;animation:crmPop .45s cubic-bezier(.2,1.4,.4,1)}",
    ".crm-win .code{font:900 28px ui-monospace,Menlo,monospace;letter-spacing:.12em;color:#FFD23F;margin:6px 0}",
    ".crm-win small{display:block;color:#9AA6CC;margin-top:6px}",
    "@keyframes crmPop{from{transform:scale(.7);opacity:0}to{transform:none;opacity:1}}",
    ".crm-own{border-color:#3DDC97;background:#0d1733}",
    ".crm-own .badge{display:inline-block;font-size:11px;font-weight:800;letter-spacing:.06em;color:#0b2a1c;background:#3DDC97;border-radius:99px;padding:3px 9px;margin-bottom:6px}",
    ".crm-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:8px 0 12px}",
    ".crm-stats div{background:#070B1E;border:1px solid #25336A;border-radius:12px;padding:8px 4px;text-align:center;font-size:11px;color:#9AA6CC;line-height:1.25}",
    ".crm-stats b{display:block;font-size:20px;color:#EEF2FF}",
    ".crm-seg{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none}.crm-seg::-webkit-scrollbar{display:none}",
    ".crm-seg button{flex:none;border:1px solid #25336A;background:#070B1E;color:#9AA6CC;border-radius:99px;padding:7px 11px;font-size:12.5px;font-weight:700;cursor:pointer}",
    ".crm-seg button.on{background:#3DDC97;border-color:#3DDC97;color:#0b2a1c}",
    ".crm-list{margin-top:8px;max-height:430px;overflow:auto;border:1px solid #25336A;border-radius:14px}",
    ".crm-row{display:grid;grid-template-columns:38px 1fr auto;gap:2px 10px;padding:10px 12px;border-bottom:1px solid #25336A;font-size:13px;align-items:center}",
    ".crm-row:last-child{border-bottom:0}.crm-row.you{background:#ffd23f14;animation:crmPop .5s}",
    ".crm-av{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;font-weight:900;color:#070B1E;grid-row:span 2}",
    ".crm-row .nm{font-weight:800;font-size:14px;color:#EEF2FF}.crm-row .ct{color:#9AA6CC;font-size:12px;grid-column:2/4;overflow-wrap:anywhere}",
    ".crm-row .st{font-size:12px;color:#FFD23F;font-weight:800;text-align:right;white-space:nowrap}",
    ".crm-tag{display:inline-block;font-size:10.5px;font-weight:800;border-radius:99px;padding:2px 7px;margin-left:4px;vertical-align:1px}",
    ".t-vip{background:#ffd23f26;color:#FFD23F}.t-risk{background:#ff6b5e26;color:#FF8F85}.t-new{background:#3ddc9726;color:#3DDC97}.t-bday{background:#b04af733;color:#D7A6FF}.t-you{background:#E8582A;color:#fff}.t-sms{background:#7fb3ff26;color:#9CC4FF}",
    ".crm-acts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}",
    ".crm-acts button{border:1px solid #25336A;background:#1a2656;color:#EEF2FF;border-radius:12px;padding:11px;font-size:13.5px;font-weight:800;cursor:pointer}",
    ".crm-acts button.hot{background:#3DDC97;border-color:#3DDC97;color:#0b2a1c}",
    ".crm-compose{display:none;margin-top:10px;background:#070B1E;border:1px solid #3DDC97;border-radius:14px;padding:12px}",
    ".crm-compose textarea{width:100%;min-height:74px;font-size:15px;color:#EEF2FF;background:#121C40;border:1px solid #25336A;border-radius:10px;padding:10px;resize:vertical}",
    ".crm-bub{background:#1a2656;border-radius:14px 14px 14px 4px;padding:9px 12px;margin-top:8px;font-size:13.5px}",
    ".crm-fine{font-size:11.5px;color:#7F8AAA;margin-top:10px}",
    ".crm-box{background:#070B1E;border:1px solid #25336A;border-radius:16px;padding:14px;margin-top:12px}",
    ".crm-card .crm-sms{background:#7fb3ff14;border:1px solid #7fb3ff40;border-radius:12px;padding:10px}.crm-card .crm-sms b{color:#EEF2FF}",
    ".crm-blast h4{margin:0 0 4px}.crm-bl{border-radius:14px;padding:12px;margin-top:10px;border:1px solid #25336A;background:#0b1230}",
    ".crm-bl .hd{display:flex;gap:8px;align-items:center;font-weight:900;font-size:14.5px;color:#EEF2FF}.crm-bl .hd .em{font-size:22px}",
    ".crm-bl textarea{width:100%;min-height:84px;font-size:15px;color:#EEF2FF;background:#121C40;border:1px solid #25336A;border-radius:10px;padding:10px;resize:vertical;margin-top:8px}",
    ".crm-bl .two>*{min-width:0;max-width:100%}.crm-bl .two input{font-size:15px;padding:9px;min-width:0;-webkit-appearance:none;appearance:none}.crm-bl .go{margin-top:10px;padding:12px;font-size:15px;background:#2547B8;box-shadow:none}",
    ".crm-bl .aud{font-size:12.5px;color:#C9D2EE;margin:8px 0 0}.crm-bl .aud b{color:#3DDC97}",
    ".crm-bl .q{font-size:12.5px;color:#3DDC97;margin-top:8px}",
    ".crm-box h4{margin:2px 0 8px;font-size:16px;font-weight:900;color:#EEF2FF}",
    ".crm-pts{display:flex;align-items:center;justify-content:space-between;gap:10px}",
    ".crm-pts .n{font:900 40px/1 system-ui;color:#FFD23F}.crm-pts .n small{font-size:14px;color:#9AA6CC;font-weight:700;margin-left:4px}",
    ".crm-scan{border:0;border-radius:14px;padding:13px 16px;font-size:15px;font-weight:900;color:#070B1E;background:#FFD23F;cursor:pointer;white-space:nowrap}",
    ".crm-qr{display:none;text-align:center;margin-top:12px;background:#fff;color:#111;border-radius:16px;padding:14px;animation:crmPop .35s}",
    ".crm-qr .qr{width:176px;height:176px;margin:0 auto}.crm-qr .qr img,.crm-qr .qr svg{width:100%;height:100%}",
    ".crm-qr .d4{font:900 38px ui-monospace,Menlo,monospace;letter-spacing:.3em;margin:8px 0 0;color:#111}",
    ".crm-qr small{display:block;color:#555;font-size:12.5px;margin-top:4px}",
    ".crm-demo{display:block;width:100%;margin-top:8px;border:1px dashed #3DDC97;background:transparent;color:#3DDC97;border-radius:12px;padding:10px;font-size:13.5px;font-weight:800;cursor:pointer}",
    ".crm-demo:disabled{opacity:.4;cursor:default}",
    CUST ? ".crm-demo{display:none!important}" : "",
    ".crm-tier{display:grid;grid-template-columns:1fr auto;gap:4px 10px;align-items:center;padding:9px 0;border-top:1px solid #25336A;font-size:14px}",
    ".crm-tier:first-of-type{border-top:0}.crm-tier .bar{grid-column:1/3;height:6px;border-radius:9px;background:#1a2656;overflow:hidden}.crm-tier .bar i{display:block;height:100%;background:linear-gradient(90deg,#E8582A,#FFD23F)}",
    ".crm-tier button{border:0;border-radius:10px;padding:8px 12px;font-weight:900;font-size:13px;background:#E8582A;color:#fff;cursor:pointer}.crm-tier button:disabled{background:#1a2656;color:#7F8AAA;cursor:default}",
    ".crm-rcode{display:flex;gap:8px;margin-top:8px}.crm-rcode input{flex:1}.crm-rcode button{border:0;border-radius:12px;padding:0 14px;font-weight:900;background:#2547B8;color:#fff;cursor:pointer}",
    ".crm-refcode{font:900 26px ui-monospace,Menlo,monospace;letter-spacing:.08em;color:#FFD23F;text-align:center;background:#121C40;border:2px dashed #FFD23F;border-radius:14px;padding:10px;margin:6px 0 10px}",
    ".crm-rules{margin:0 0 10px;padding:0;list-style:none;font-size:13.5px;color:#C9D2EE}.crm-rules li{padding:5px 0;display:flex;gap:8px;justify-content:space-between}.crm-rules b{color:#3DDC97;white-space:nowrap}",
    ".crm-goal{height:10px;border-radius:9px;background:#1a2656;overflow:hidden;margin:4px 0 4px}.crm-goal i{display:block;height:100%;background:#3DDC97}",
    ".crm-feed{max-height:220px;overflow:auto;font-size:13px}.crm-feed div{display:flex;justify-content:space-between;gap:8px;padding:7px 0;border-top:1px solid #1a2656;color:#C9D2EE}.crm-feed b{white-space:nowrap}.crm-feed .plus{color:#3DDC97}.crm-feed .minus{color:#FF8F85}",
    ".crm-toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:99999;background:#3DDC97;color:#0b2a1c;font:900 15px system-ui;padding:12px 18px;border-radius:99px;box-shadow:0 10px 30px #0008;animation:crmPop .35s;max-width:92vw;text-align:center}",
    ".crm-invited{background:#3DDC9722;border:1px solid #3DDC97;color:#C9F5E3;border-radius:14px;padding:10px 12px;margin-bottom:10px;font-size:14px;font-weight:700}",
    ".crm-lead{margin-top:12px}.crm-lead div{display:grid;grid-template-columns:22px 1fr auto;gap:8px;padding:8px 0;border-top:1px solid #25336A;font-size:13px;align-items:center}.crm-lead .r{color:#FFD23F;font-weight:900}",
    // contact gate sheet (order / prize / score)
    ".crm-gate{position:fixed;left:0;right:0;top:0;bottom:0;z-index:2147483600;display:flex;padding:max(14px,env(safe-area-inset-top)) 14px max(14px,env(safe-area-inset-bottom));background:rgba(5,10,20,.72);-webkit-backdrop-filter:blur(5px);backdrop-filter:blur(5px);overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;box-sizing:border-box}",
    ".crm-gate .crm-card{margin:auto;width:100%;max-width:420px;box-shadow:0 24px 70px #000b;animation:crmPop .3s cubic-bezier(.2,1.2,.4,1)}",
    ".crm-gate .crm-card h3{font-size:22px}.crm-gate .crm-gift{font-size:14px;padding:10px 12px}.crm-gate .crm-gift b{font-size:24px}",
    ".crm-gbd{margin-top:12px;border:1px solid #25336A;border-radius:12px;padding:0 12px;background:#0b1430}",
    ".crm-gbd summary{cursor:pointer;padding:11px 0;font-size:14px;font-weight:700;color:#D7A6FF;list-style:none}.crm-gbd summary::-webkit-details-marker{display:none}",
    ".crm-gbd summary:after{content:'+';float:right;font-weight:900;color:#9AA6CC}.crm-gbd[open] summary:after{content:'–'}.crm-gbd[open]{padding-bottom:10px}",
    ".crm-gx{display:block;margin:10px auto 0;border:0;background:none;color:#9AA6CC;font-size:14px;font-weight:700;text-decoration:underline;cursor:pointer;padding:6px 12px}",
    // ways-to-earn sheet + link
    ".crm-elink{display:block;width:100%;margin-top:8px;border:0;background:none;color:#FFD23F;font-size:14px;font-weight:800;text-align:left;padding:6px 0;cursor:pointer;text-decoration:underline;text-underline-offset:3px}",
    ".crm-egoal{display:flex;justify-content:space-between;align-items:center;gap:10px;background:linear-gradient(135deg,#E8582A,#FFD23F);color:#1a0d00;border-radius:14px;padding:10px 14px;margin:6px 0 10px;font-weight:800;font-size:15px}.crm-egoal b{font-size:20px;white-space:nowrap}",
    ".crm-er{display:grid;grid-template-columns:30px 1fr auto;gap:2px 10px;align-items:start;padding:10px 0;border-top:1px solid #25336A}",
    ".crm-er .ic{font-size:22px;line-height:1.2}.crm-er .tx b{display:block;font-size:14.5px;color:#EEF2FF}.crm-er .tx small{display:block;font-size:12.5px;color:#9AA6CC;line-height:1.35;margin-top:2px}",
    ".crm-er .pp{font:900 15px system-ui;color:#3DDC97;white-space:nowrap}.crm-er.done .pp{color:#9AA6CC;font-size:12.5px}",
    ".crm-er .bt{grid-column:2/4}.crm-er .bt button{margin-top:6px;border:1px solid #25336A;background:#1a2656;color:#EEF2FF;border-radius:11px;padding:9px 12px;font-size:13.5px;font-weight:800;cursor:pointer}.crm-er .bt button.hot{background:#FFD23F;border-color:#FFD23F;color:#070B1E}",
    ".crm-fbk:not(:empty){background:#070B1E;border:1px solid #25336A;border-radius:14px;padding:12px;margin-top:10px}.crm-fbk h4{margin:0 0 8px;font-size:15px}",
    ".crm-fbk textarea{width:100%;min-height:70px;font-size:16px;color:#EEF2FF;background:#121C40;border:1px solid #25336A;border-radius:10px;padding:10px;margin-top:8px;resize:vertical}",
    ".crm-stars{display:flex;gap:6px}.crm-stars button{flex:1;border:1px solid #25336A;background:#121C40;color:#3A4675;border-radius:10px;font-size:24px;padding:4px 0;cursor:pointer}.crm-stars button.on{color:#FFD23F;border-color:#FFD23F}",
    // split wallets (bar vs kitchen)
    ".crm-wal{display:grid;grid-template-columns:1fr 1fr;gap:8px}",
    ".crm-wb{min-width:0;background:#121C40;border:1px solid #25336A;border-radius:14px;padding:10px}.crm-wb .n{font:900 28px/1.1 system-ui;color:#FFD23F;margin:2px 0 4px}.crm-wb .n small{font-size:12px;color:#9AA6CC;font-weight:700;margin-left:3px}",
    ".crm-wb .crm-wn{font-size:12px;color:#C9D2EE;line-height:1.3;overflow-wrap:anywhere}.crm-wb .bar{display:block;height:6px;border-radius:9px;background:#1a2656;overflow:hidden;margin-top:6px}.crm-wb .bar i{display:block;height:100%;background:linear-gradient(90deg,#E8582A,#FFD23F)}",
    ".crm-wb[data-w=bar] .bar i{background:linear-gradient(90deg,#7FB3FF,#D7A6FF)}",
    ".crm-wh{font-size:14.5px;font-weight:900;color:#EEF2FF;margin:12px 0 2px;padding-top:8px;border-top:1px solid #25336A}.crm-wh:first-of-type{border-top:0;padding-top:0;margin-top:0}.crm-wh small{display:block;font-size:12px;font-weight:600;color:#9AA6CC}",
    ".crm-wt{font-style:normal;font-size:10.5px;font-weight:800;border-radius:99px;padding:1px 6px;margin-right:5px;background:#1a2656;color:#C9D2EE;white-space:nowrap}",
    ".crm-own .crm-wsum{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:-4px 0 12px}.crm-own .crm-wsum div{background:#070B1E;border:1px solid #25336A;border-radius:12px;padding:8px;text-align:center;font-size:11.5px;color:#9AA6CC}.crm-own .crm-wsum b{display:block;font-size:17px;color:#EEF2FF}",
    "@media (max-width:400px){.crm-stats{grid-template-columns:repeat(2,1fr)}}"
  ].join("");
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  // ---- sample customers (made-up) so the owner list never looks empty ----
  var now = Date.now(), DAY = 864e5, mo = new Date().getMonth();
  var SAMPLE = [
    ["Maria G.", "(310) •••-4821", "maria•••@gmail.com", 14, 420, 3, 210, mo], ["Dre W.", "(323) •••-1187", "", 6, 180, 34, 160, 3],
    ["Kim T.", "", "kimt•••@yahoo.com", 3, 95, 12, 40, mo], ["Jordan P.", "(562) •••-9034", "jordan•••@icloud.com", 1, 25, 1, 1, 8],
    ["Luis R.", "(213) •••-5560", "", 11, 360, 6, 190, 1], ["Aisha K.", "(424) •••-7712", "aisha•••@gmail.com", 2, 60, 5, 5, 5],
    ["Tony N.", "(310) •••-3349", "", 8, 240, 41, 230, 11], ["Hye-jin L.", "", "hyejin•••@naver.com", 5, 150, 9, 70, 6],
    ["Arman S.", "(818) •••-2045", "arman•••@gmail.com", 9, 270, 15, 120, 0], ["Brianna C.", "(323) •••-6678", "", 4, 110, 2, 3, 2],
    ["Marcus J.", "(310) •••-8801", "mj•••@outlook.com", 17, 610, 4, 300, 10], ["Sofia M.", "(562) •••-4410", "sofia•••@gmail.com", 1, 25, 38, 38, 7]
  ].map(function (r) { return { name: r[0], phone: r[1], email: r[2], visits: r[3], stars: r[4] * 2, last: now - r[5] * DAY, joined: now - r[6] * DAY, bday: r[7], sample: true }; });
  // made-up referral history: who brought in whom
  var REFS = { "Marcus J.": ["MARCUS-88", 6, 19], "Maria G.": ["MARIA-21", 4, 11], "Luis R.": ["LUIS-60", 2, 5], "Tony N.": ["TONY-49", 1, 1] };
  var BY = { "Jordan P.": "Marcus J.", "Brianna C.": "Marcus J.", "Sofia M.": "Maria G.", "Aisha K.": "Luis R." };
  SAMPLE.forEach(function (r, i) { var x = REFS[r.name]; if (x) { r.ref = x[0]; r.nfr = x[1]; r.nfo = x[2]; } if (BY[r.name]) r.refByName = BY[r.name];
    if (WAL) { var b = Math.round(r.stars * [0.3, 0.45, 0.2, 0.55][i % 4] / 10) * 10; r.w = { bar: b, food: r.stars - b }; } });
  // made-up text consent: who tapped "Text me deals" (sms) and who later replied STOP (stop). Kim + Hye-jin have no phone.
  var SMSOK = { "Maria G.": 40, "Dre W.": 150, "Luis R.": 180, "Tony N.": 200, "Arman S.": 110, "Marcus J.": 290, "Sofia M.": 30 };
  SAMPLE.forEach(function (r) { if (SMSOK[r.name]) { r.sms = true; r.smsAt = now - SMSOK[r.name] * DAY; r.smsSrc = "sign-up form (sample)"; } if (r.name === "Sofia M.") r.stop = now - 9 * DAY; });
  function refOwner(code) { code = String(code || "").toUpperCase().trim(); for (var i = 0; i < SAMPLE.length; i++) if (SAMPLE[i].ref === code) return SAMPLE[i].name; return ""; }

  function mine() { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (x) { return []; } }
  function save(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (x) {} }
  function all() { return mine().map(function (r) { r.you = true; return r; }).concat(SAMPLE); }
  function tags(r) {
    var t = [];
    if (r.you) t.push(["t-you", "JUST JOINED"]);
    if (r.visits >= 10) t.push(["t-vip", "VIP"]);
    if (now - r.last >= 30 * DAY && !r.you) t.push(["t-risk", "Hasn't been back"]);
    if (now - r.joined <= 7 * DAY && !r.you) t.push(["t-new", "New"]);
    if (r.bday === mo) t.push(["t-bday", isBday(r) && r.bdd ? "🎂 Birthday today" : "🎂 Birthday month"]);
    if ((r.nfr || (r.friends && r.friends.length)) >= 2) t.push(["t-vip", "🤝 Top referrer"]);
    if (r.refByName) t.push(["t-new", "Referred by " + r.refByName]);
    if (r.stop) t.push(["t-risk", "Texted STOP"]); else if (r.sms) t.push(["t-sms", "📲 Deals by text"]);
    return t;
  }
  // ---- marketing-text consent (TCPA): separate, optional, unchecked by default. See TEXTING / CONSENT above. ----
  var SMS_TEXT = "Text me deals: I agree to get recurring marketing texts (holiday specials, offers) from " + NAME + " at the number above, sent by an automated system. Consent isn't required to buy anything. Up to 4 msgs/mo. Msg & data rates may apply. Reply STOP to opt out, HELP for help.";
  function smsBox() { return '<label class="crm-optin crm-sms"><input type="checkbox" name="sms"> <span><b>📲 Text me deals</b> (optional). ' + e(SMS_TEXT.replace(/^Text me deals: /, "")) + '</span></label>'; }
  function canText(r) { return !!(r && r.sms && !r.stop && /\d{7,}|•••/.test(String(r.phone || "").replace(/[^\d•]/g, ""))); }
  function ago(ts) { var d = Math.floor((now - ts) / DAY); return d <= 0 ? "today" : d === 1 ? "yesterday" : d + " days ago"; }
  function code() { var a = "ABCDEFGHJKMNPQRSTUVWXYZ23456789", s = ""; for (var i = 0; i < 4; i++) s += a[(Math.random() * a.length) | 0]; return (NAME.replace(/[^A-Za-z]/g, "").slice(0, 5).toUpperCase() || "CLUB") + "-" + s; }

  // ---- join card ----
  var join = document.createElement("section"); join.className = "crm-card"; join.id = "crm-join";
  // ---- owner card ----
  var own = document.createElement("section"); own.className = "crm-card crm-own"; own.id = "crm-owner";

  function code4(len) { var a = "ABCDEFGHJKMNPQRSTUVWXYZ23456789", x = ""; for (var i = 0; i < (len || 3); i++) x += a[(Math.random() * a.length) | 0]; return x; }
  function refCode(first) { return (first.replace(/[^A-Za-z]/g, "").slice(0, 6).toUpperCase() || "FRIEND") + "-" + code4(3); }
  // the 4-digit "give this to the cashier" code changes every 5 minutes, like the big chains' apps
  function regCode(m) { var w = Math.floor(Date.now() / 3e5), h = 7; String(m.id + ":" + w).split("").forEach(function (c) { h = (h * 31 + c.charCodeAt(0)) % 1000003; }); return String(h % 10000).padStart(4, "0"); }
  function put(m) { var l = mine(); l[0] = m; save(l); syncLater(m); }
  // wk ("bar" | "food") only matters with split wallets; anything without one (bonuses) goes to the bonusTo wallet
  function addPts(m, n, why, wk) {
    var l = { ts: Date.now(), pts: n, t: why };
    if (WAL) { migrate(m); wk = W[wk] ? wk : BONUS; m.w[wk] = Math.max(0, (m.w[wk] || 0) + n); m.stars = m.w.bar + m.w.food; l.w = wk; }
    else m.stars = Math.max(0, (m.stars || 0) + n);
    // lifetime counters for the back office (the ledger keeps only the last 40 lines)
    if (m.earned != null && typeof m.earned === "object") onceMap(m);
    if (m.earned == null) { m.earned = Math.max(0, (m.stars || 0) - (n > 0 ? n : 0)); m.spent = m.spent || 0; }
    if (n > 0) m.earned += n; else if (n < 0) { m.spent = (m.spent || 0) - n; m.nred = (m.nred || 0) + 1; }
    (m.ledger = m.ledger || []).unshift(l); m.ledger = m.ledger.slice(0, 40);
  }
  // split wallets: one purchase with separate food and bar dollars → kitchen points and bar points, each at its own rate.
  // Counts as the day's visit (check-in / first-order bonuses ride visit()), and the visit level's multiplier applies to both.
  function purchase(m, food, bar, why) {
    visit(m, 0); var x = levelOf(m).mult, r = { food: Math.round(food * W.food.per * x), bar: Math.round(bar * W.bar.per * x), split: true };
    if (food > 0) addPts(m, r.food, why + " · food $" + food.toFixed(2), "food");
    if (bar > 0) addPts(m, r.bar, why + " · drinks $" + bar.toFixed(2), "bar");
    r.pts = r.food + r.bar; m.visits = (m.visits || 0) + 1; m.last = Date.now(); return r;
  }
  function splitMsg(r) { return [r.bar ? "+" + r.bar.toLocaleString() + " " + wname("bar") : "", r.food ? "+" + r.food.toLocaleString() + " " + wname("food") : ""].filter(Boolean).join(" · ").replace(/^$/, "+0") + " pts"; }
  function walOf(m) { return m.w || { bar: 0, food: m.stars || 0 }; }
  function toast(t) { var d = document.createElement("div"); d.className = "crm-toast"; d.textContent = t; document.body.appendChild(d); setTimeout(function () { d.remove(); }, 2600); }
  var qs = new URLSearchParams(location.search), INVITE = (qs.get("ref") || "").toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 16);
  // missed-call text-back: the auto-text after an unanswered or after-hours call links here with ?missed=1
  var MISSED = (qs.get("missed") === "1" || qs.get("src") === "call") && (!SIMPLE || !!C.missed), MC = C.missed || { offer: "10% off your order", days: 7 };
  var FRIENDS = ["Jasmine", "Mateo", "Devon", "Mia", "Andre", "Lily", "Marco", "Keisha", "Tran", "Gabby"];
  function shareLink(m) { return location.origin + location.pathname + "?ref=" + encodeURIComponent(m.ref) + "#crm-join"; }

  // a game calls SSAI_WIN("Free fries") when a player wins: the prize lands in their wallet with a code to redeem in store
  var PEND = KEY + "_prize";
  // rules: a prize expires 3 days after it is won, a guest holds ONE unused prize at a time (no stacking), one reward per visit
  var WIN_TTL = 3 * 864e5;
  function liveWin(w) { return w && !w.used && Date.now() - w.ts < (w.ttl || WIN_TTL) ? w : null; }
  function activeWin(m) { return m ? (m.wins || []).filter(liveWin)[0] || null : liveWin(pending()); }
  function until(w) { return new Date(w.ts + (w.ttl || WIN_TTL)).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); }
  // SSAI_WIN(prize, {kid:true}) = a game's Kid-mode prize: KID-xxxx code, a "🧒 KID PRIZE" tag on the voucher and the rule
  // KID_RULE everywhere staff see it. Kid prizes are small kid items and are honored only with the young player there.
  var KID_RULE = "Kid prize — redeemable with the young player at the table, one per kid per visit.";
  window.SSAI_KID_RULE = KID_RULE;
  function kidTag(w) { return w && w.kid ? '<div style="display:inline-block;margin:4px 0 2px;background:#FFD23F;color:#1a0d00;font:900 12px system-ui;letter-spacing:.06em;border-radius:99px;padding:3px 10px">🧒 KID PRIZE</div>' : ''; }
  // ONE PRIZE PER DAY (2026-10-13, standard; McDonald's-style): a member wins / uses at most one prize per LA day: game win,
  // daily draw, spin, ladder reward or early-bird gift (m.pday = that day). A 2nd win the same day is "Come back tomorrow"
  // (the game still plays for fun and score). The real check is server-side (Code.gs prize_win / PrizeDay tab).
  function pdKey() { return new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" }); }
  function prizeUsedToday(m) { return !!(m && m.pday === pdKey()); }
  window.SSAI_WIN = function (prize, opt) {
    var w = { t: prize, c: "WIN-" + code4(4), ts: Date.now() }, m = mine()[0], held = activeWin(m);
    if (opt && opt.kid) { w.kid = 1; w.c = "KID-" + code4(4); }
    if (held) return { prize: held, saved: !!m, blocked: true, until: until(held) };
    if (prizeUsedToday(m)) { toast("🏆 One prize per day: come back tomorrow for your next prize. Your score still counts."); return { prize: { t: prize, c: "", ts: w.ts, until: "tomorrow" }, saved: false, blocked: true, tomorrow: true, until: "tomorrow" }; }
    w.until = until(w);
    if (m) { m.pday = pdKey(); boPost({ type: "prize_win", member: m.id, dev: devId(), source: "game", prize: prize, eid: "W" + w.ts.toString(36) + code4(4) }); (m.wins = m.wins || []).unshift(w); m.wins = m.wins.slice(0, 5); (m.ledger = m.ledger || []).unshift({ ts: w.ts, pts: 0, t: "🏆 Won " + prize + " in the game" }); put(m); }
    else { try { localStorage.setItem(PEND, JSON.stringify(w)); } catch (x) {} }
    drawJoin(); return { prize: w, saved: !!m };
  };
  // daily lucky draw: every signed-up member gets ONE draw a day (LA date) when they open the app.
  // CRM_CFG.draw = { odds: 15, prizes: ["Free Mac & Cheese", ...] } → about 1 in 15 draws wins; the prize is good for 3 days.
  // Same wallet rules as game prizes: no stacking (no draw while a prize is waiting), one reward per visit.
  function dailyDraw() {
    var D = C.draw; if (!D || !D.odds || !(D.prizes || []).length) return;
    var m = mine()[0]; if (!m || m.sample) return;
    var day = new Date().toLocaleDateString("en-US", { timeZone: "America/Los_Angeles" });
    if (m.drawDay === day || activeWin(m) || prizeUsedToday(m) || document.querySelector(".crm-draw")) return;
    var won = Math.random() < 1 / D.odds, prize = D.prizes[(Math.random() * D.prizes.length) | 0];
    var ov = document.createElement("div"); ov.className = "crm-draw";
    ov.innerHTML = '<div class="crm-draw-card"><div class="crm-draw-h">🎟️ Your daily lucky draw</div><div class="crm-draw-s">' + e(NAME) + ' picks a winner every day. Tap to scratch.</div>' +
      '<button type="button" class="crm-draw-t" aria-label="Scratch your ticket"><span>SCRATCH</span></button><div class="crm-draw-r"></div><button type="button" class="crm-draw-x">Close</button></div>';
    document.body.appendChild(ov);
    var t = ov.querySelector(".crm-draw-t"), r = ov.querySelector(".crm-draw-r");
    ov.querySelector(".crm-draw-x").onclick = function () { ov.remove(); };
    t.onclick = function () {
      if (t.disabled) return; t.disabled = true; t.classList.add("go");
      m = mine()[0]; m.drawDay = day;
      setTimeout(function () {
        if (won) {
          var w = { t: prize, c: "LUCKY-" + code4(4), ts: Date.now(), k: "draw" }; w.until = until(w); m.pday = pdKey();
          (m.wins = m.wins || []).unshift(w); m.wins = m.wins.slice(0, 5); (m.ledger = m.ledger || []).unshift({ ts: w.ts, pts: 0, t: "🎟️ Won the daily lucky draw: " + prize }); put(m);
          t.innerHTML = "<span>🎉 WINNER</span>"; t.classList.add("win");
          r.innerHTML = "You won <b>" + e(prize) + "</b>!<div class='crm-draw-c'>" + w.c + "</div>Show this code at " + e(NAME) + " · good until " + e(w.until) + " (3 days)";
          try { navigator.vibrate && navigator.vibrate([30, 40, 60]); } catch (x) {}
          drawJoin();
        } else {
          put(m); t.innerHTML = "<span>Not today</span>";
          r.innerHTML = "No win today, but you get a new draw every day you open the app. Come back tomorrow 🍀";
        }
      }, 900);
    };
  }
  (function () {
    var st = document.createElement("style");
    st.textContent = ".crm-draw{position:fixed;inset:0;z-index:2147482000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,10,20,.66);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)}" +
      ".crm-draw-card{width:100%;max-width:340px;padding:18px 16px 14px;border-radius:20px;background:linear-gradient(160deg,#151d33,#0b1220);border:1px solid rgba(255,210,63,.45);color:#fff;text-align:center;font:600 14px/1.45 system-ui,sans-serif;box-shadow:0 20px 60px rgba(0,0,0,.6)}" +
      ".crm-draw-h{font:900 20px/1.2 system-ui,sans-serif;margin-bottom:4px}.crm-draw-s{opacity:.85;font-size:13px;margin-bottom:12px}" +
      ".crm-draw-t{width:100%;height:110px;border:0;border-radius:14px;cursor:pointer;color:#3a2a00;font:900 26px system-ui;letter-spacing:.12em;background:repeating-linear-gradient(45deg,#d9b44a 0 10px,#e9c95e 10px 20px);box-shadow:inset 0 0 0 3px rgba(255,255,255,.25)}" +
      ".crm-draw-t.go{animation:crmshake .9s}.crm-draw-t.win{background:radial-gradient(circle,#ffe58a,#ffb02e);color:#3a1600}" +
      "@keyframes crmshake{0%,100%{transform:none}20%{transform:rotate(-3deg) scale(1.03)}40%{transform:rotate(3deg)}60%{transform:rotate(-2deg) scale(.98)}80%{transform:rotate(2deg)}}" +
      ".crm-draw-r{min-height:22px;margin:12px 0 8px}.crm-draw-c{margin:8px auto;font:900 22px ui-monospace,Menlo,monospace;letter-spacing:.12em;color:#ffd23f}" +
      ".crm-draw-x{border:0;background:none;color:#c9d2ee;font:700 14px system-ui;text-decoration:underline;cursor:pointer}";
    document.head.appendChild(st);
    setTimeout(dailyDraw, 1600);
  })();
  window.SSAI_DRAW = function () { try { var m = mine()[0]; if (m) { delete m.drawDay; put(m); } } catch (x) {} dailyDraw(); };   // test hook

  // an order placed in the app (builder.js) earns points like a register order
  // With split wallets pass split = {food: $, bar: $} (the page classifies its own menu items); without it the whole
  // amount counts as food. Returns {pts, saved} and, when split, {food, bar, split:true} too.
  window.SSAI_EARN = function (amount, why, split) {
    if (WAL) {
      var sm = mine()[0], f = split ? +split.food || 0 : +amount || 0, bb = split ? +split.bar || 0 : 0, r;
      if (sm) { var sb0 = seenBefore(sm); r = purchase(sm, f, bb, why); logAppOrder(sm, f, bb, why, sb0); r.tok = tokBuy(sm, f, why + " · food $" + f.toFixed(2)); /* tokens: food only, never on drinks / alcohol */ put(sm); drawJoin(); drawOwn(); }
      else { r = { food: Math.round(f * W.food.per), bar: Math.round(bb * W.bar.per), split: true }; logAppOrder(null, f, bb, why); }
      r.pts = r.food + r.bar; r.saved = !!sm; r.msg = splitMsg(r); return r;
    }
    var m = mine()[0], pts = Math.round(amount * PER), tk = 0;
    var af = split ? +split.food || 0 : +amount || 0, ab = split ? +split.bar || 0 : 0;   // bar side of an app order = alcohol (excluded)
    logAppOrder(m || null, af, ab, why, m ? seenBefore(m) : false);
    if (m) { pts = visit(m, amount * PER); addPts(m, pts, why + " · $" + amount.toFixed(2)); tk = tokBuy(m, af, why + " · $" + af.toFixed(2)); /* tokens: food & non-alc only */ m.visits = (m.visits || 0) + 1; m.last = Date.now(); put(m); drawJoin(); drawOwn(); }
    return { pts: pts, saved: !!m, tok: tk };
  };
  function pending() { try { return JSON.parse(localStorage.getItem(PEND) || "null"); } catch (x) { return null; } }

  // ---- GAME POINTS (simple program): 1 pt per SIMPLE.game.perScore score, at most SIMPLE.game.dailyCap a day (LA date) ----
  // Guests play first: award() holds their points on this phone for the day (GPKEY); joining (any sign-up path) credits
  // them through gpCredit(). Members get them straight away. The cap counts everything credited that day, held or not.
  var GPKEY = KEY + "_gamepts";
  function gpDay() { return new Date().toLocaleDateString("en-US", { timeZone: "America/Los_Angeles" }); }
  function gpHeld() { try { var h = JSON.parse(localStorage.getItem(GPKEY) || "null"); return h && h.day === gpDay() ? h : null; } catch (x) { return null; } }
  function gpUsed(m) { return m && m.gday === gpDay() ? m.gpts || 0 : 0; }
  function gpFor(score) { var g = SIMPLE.game; return Math.max(0, Math.min(g.dailyCap, Math.floor((+score || 0) / g.perScore))); }
  function gpAdd(m, n, why) { if (m.gday !== gpDay()) { m.gday = gpDay(); m.gpts = 0; } n = Math.max(0, Math.min(n, SIMPLE.game.dailyCap - m.gpts)); if (n) { addPts(m, n, why); tag(m, "game_bonus"); m.gpts += n; m.gtot = (m.gtot || 0) + n; } return n; }
  // staff practice: practice points only (no daily cap), kept apart from members and rewards
  function staffAward(score, label) {
    var sc = Math.max(0, Math.round(+score || 0)), p = Math.floor(sc / SIMPLE.game.perScore), k = "ssai_staff_practice", t = {};
    try { t = JSON.parse(localStorage.getItem(k) || "{}") || {}; } catch (x) {}
    t.runs = (t.runs || []); t.runs.unshift({ ts: Date.now(), slug: SLUG, game: C.game || "Game", score: sc, pts: p, name: STAFF.name }); t.runs = t.runs.slice(0, 300);
    try { localStorage.setItem(k, JSON.stringify(t)); } catch (x) {}
    boPost({ type: "staff_practice", name: STAFF.name, game: C.game || "Game", score: sc, pts: p, dev: devId() });
    toast("🧑‍🍳 +" + p + " practice points for " + STAFF.name + " (practice only, not Rewards)");
    return { pts: p, want: p, saved: true, capped: false, today: p, cap: SIMPLE.game.dailyCap, practice: true };
  }
  function gpCredit(m) { var h = gpHeld(); m.lastGame = 0; if (!h || !h.pts) return 0; try { localStorage.removeItem(GPKEY); } catch (x) {} m.lastGame = gpAdd(m, h.pts, "🎮 " + (C.game || "Game") + " points (played before joining)"); return m.lastGame; }
  // member store for demo/interim.js (interim mode only): read / change the member on this phone, then redraw
  if (INTERIM) window.SSAI_CRM = {
    name: NAME, slug: SLUG, key: KEY, cfg: SIMPLE, tiers: function () { return TIERS; }, sheet: C.sheet || "",
    member: function () { return mine()[0] || null; },
    add: function (m, n, why, k) { addPts(m, n, why); if (k) tag(m, k); },
    save: function (m) { put(m); drawJoin(); drawOwn(); },
    redraw: function () { drawJoin(); drawOwn(); },
    join: function (cb, opts) { GATE_TXT.interim = ["Join " + NAME + " Rewards first", "Free. Add your name and a phone or email, then add your visit.", "🎁 Join free"]; return gate("interim", cb, opts); },   // opts {title, sub, btn}: custom sheet wording (scorespecial.js)
    toast: toast, esc: e, code4: code4,
    dev: function () { return devId(); }, pday: pdKey, prizeUsedToday: function () { return prizeUsedToday(mine()[0]); },
    sync: function () { var m = mine()[0]; if (m) syncLater(m); }, api: API, perDollar: PER
  };
  if (SIMPLE) window.SSAI_GAMEPTS = {
    cfg: SIMPLE.game,
    forScore: gpFor,
    member: function () { return mine()[0] || null; },
    // call ONCE per finished run. Returns {pts, saved, capped, today, cap}: pts actually credited (member) or held (guest)
    award: function (score, label) {
      if (STAFF) return staffAward(score, label);
      var want = gpFor(score), cap = SIMPLE.game.dailyCap, m = mine()[0], got, today;
      if (m) { got = gpAdd(m, want, "🎮 " + (label || C.game || "Game") + " · score " + Math.round(+score || 0).toLocaleString()); today = gpUsed(m); put(m); drawJoin(); drawOwn(); }
      else { var h = gpHeld() || { day: gpDay(), pts: 0 }; got = Math.max(0, Math.min(want, cap - h.pts)); h.pts += got; today = h.pts; try { localStorage.setItem(GPKEY, JSON.stringify(h)); } catch (x) {} drawJoin(); }
      if (API) boPost({ type: "game", member: m ? m.id : "", dev: devId(), score: Math.max(0, Math.round(+score || 0)), pts: got, eid: evId("G") });   // pts = what this phone credited
      return { pts: got, want: want, saved: !!m, capped: got < want, today: today, cap: cap };
    },
    held: function () { var h = gpHeld(); return h ? h.pts : 0; },
    // opens the short sign-up sheet; on success the held points are credited, then cb({pts, member})
    join: function (cb) {
      var n = gpHeld() ? gpHeld().pts : 0;
      GATE_TXT.gamepts = [n ? "Join to save your " + n + " points" : "Join " + NAME + " Rewards", "Free. Add your name and a phone or email: your game points go to your " + NAME + " Rewards balance.", n ? "🎁 Save my " + n + " points" : "🎁 Join free"];
      return gate("gamepts", function (m) { if (cb) cb({ pts: m ? m.lastGame || 0 : 0, member: m }); });
    }
  };

  // ---- split-wallet pieces of the member card ----
  function nextTier(k, bal) { return W[k].tiers.filter(function (t) { return t[0] > bal; })[0] || null; }
  function walTiles(m) {
    var w = walOf(m);
    return '<div class="crm-wal">' + WK.map(function (k) {
      var bal = w[k] || 0, nx = nextTier(k, bal), t0 = W[k].tiers[0];
      return '<div class="crm-wb" data-w="' + k + '"><div class="k" style="font-size:10px">' + wname(k) + ' points</div><div class="n">' + bal.toLocaleString() + '<small>pts</small></div>' +
        '<div class="crm-wn">' + (nx ? '<b>' + (nx[0] - bal).toLocaleString() + '</b> to ' + e(nx[1]) : 'Top reward unlocked 🎉') + '</div>' +
        '<span class="bar"><i style="width:' + Math.min(100, nx ? bal / nx[0] * 100 : 100) + '%"></i></span>' + (bal >= t0[0] ? '<div class="crm-wn" style="color:#3DDC97;margin-top:4px">Reward ready ↓</div>' : '') + '</div>';
    }).join("") + '</div>';
  }
  function walEarnLine() {
    return 'Earn <b style="color:#FFD23F">' + W.bar.per + ' ' + wname("bar") + ' pts per $1 on drinks</b> and <b style="color:#FFD23F">' + W.food.per + ' ' + wname("food") + ' pts per $1 on food</b>, in store or in the app.';
  }
  function walTiers(m, k) {
    var bal = walOf(m)[k] || 0, rd = m.rdm && m.rdm[k];
    return '<div class="crm-wh" data-w="' + k + '">' + wname(k) + ' rewards <small>· uses ' + W[k].label.toLowerCase() + ' points only · you have ' + bal.toLocaleString() + '</small></div>' +
      W[k].tiers.map(function (t, i) {
        return '<div class="crm-tier"><span><b>' + t[0].toLocaleString() + '</b> pts · ' + e(t[1]) + '</span><button type="button" data-redeem="' + k + ':' + i + '"' + (bal >= t[0] ? '' : ' disabled') + '>' + (bal >= t[0] ? 'Redeem' : (t[0] - bal).toLocaleString() + ' to go') + '</button>' +
          '<span class="bar"><i style="width:' + Math.min(100, bal / t[0] * 100) + '%"></i></span></div>'; }).join("") +
      (rd ? '<div class="crm-win" style="margin-top:10px"><b>' + wname(k) + ': ' + e(rd.t) + '</b><div class="code">' + e(rd.c) + '</div><small>Show this code ' + (k === "bar" ? 'to your bartender or server. Bar reward: it comes off the drinks.' : 'when you order. Kitchen reward: it comes off the food.') + ' One reward per order.</small></div>' : '');
  }

  function drawJoin(keepQR) {
    var me = mine()[0];
    if (me) {
      if (!me.id) { me.id = code4(8); me.ref = me.ref || refCode(me.name); me.friends = me.friends || []; me.ledger = me.ledger || []; put(me); }
      if (migrate(me)) put(me);
      if (weekly(me)) put(me);
      if (me.bday >= 0 && isBday(me) && earnOnce(me, "birthday_" + new Date().getFullYear(), EARN.birthday, "🎂 Birthday bonus")) put(me);
      var pts = me.stars || 0, fr = me.friends || [], fo = fr.reduce(function (a, f) { return a + f.orders; }, 0);
      var refPts = (me.ledger || []).filter(function (l) { return l.ref; }).reduce(function (a, l) { return a + l.pts; }, 0);
      var first = e(me.name.split(" ")[0]);
      join.innerHTML = '<span class="k">' + e(NAME) + ' Rewards</span><h3>Hey ' + first + '! 👋</h3>' +
        (activeWin(me) ? '<div class="crm-win" style="border-color:#3DDC97"><div style="font-size:30px">' + (activeWin(me).k === "missed" ? '📞' : '🏆') + '</div><b>' + (activeWin(me).k === "missed" ? 'Sorry we missed your call! Here\'s ' + e(activeWin(me).t) : 'You won ' + e(activeWin(me).t) + '!') + '</b>' + kidTag(activeWin(me)) + '<div class="code">' + e(activeWin(me).c) + '</div><small>' + (activeWin(me).kid ? '<b>' + e(KID_RULE) + '</b> ' : '') + 'Show this code at ' + e(NAME) + ' to redeem it. Use by <b>' + e(until(activeWin(me))) + '</b>. One reward per visit; win again after you use this one.</small></div><div style="height:10px"></div>' : '') +
        (SIMPLE ? '' : '<div class="crm-win"><div style="font-size:30px">🎁</div><b>' + e(me.offer || OFFER) + '</b><div class="code">' + e(me.code) + '</div><small>Your welcome reward. Show this at the counter.</small></div>') +
        (me.fgift && !me.fgift.used ? '<div class="crm-win" style="margin-top:10px;border-color:#3DDC97"><div style="font-size:30px">🤝</div><b>Friend gift: ' + e(me.fgift.t) + '</b><div class="code">' + e(me.fgift.c) + '</div><small>Because a friend invited you. Show this code with your first order.</small></div>' : '') +
        (SIMPLE ? (me.bday >= 0 ? '<div class="crm-bday"><h4>🎂 Birthday bonus · ' + e(bdayStr(me)) + '</h4><div style="font-size:13px;color:#C9D2EE">' + ((isBday(me) || me.bdemo) ? 'Happy birthday, ' + first + '! Your <b>+' + EARN.birthday + ' birthday points</b> are in your balance.' : '<b>+' + EARN.birthday + ' points</b> land in your balance on your birthday, once a year.') + '</div>' + (isBday(me) || me.bdemo ? '' : '<button type="button" class="crm-demo" data-a="bday">▶ Demo: it\'s my birthday</button>') + '</div>' : '') :
        me.bday >= 0 ? (isBday(me) || me.bdemo ? '<div class="crm-win bd"><div style="font-size:30px">🎂</div><b>Happy birthday, ' + first + '! Your free birthday treat is unlocked</b><div class="code">' + e(me.bcode || "BDAY") + '</div><small>Show this code with a photo ID that says ' + e(bdayStr(me)) + '. Good for 7 days.</small></div>'
          : '<div class="crm-bday"><h4>🎂 Birthday treat · ' + e(bdayStr(me)) + '</h4><div style="font-size:13px;color:#C9D2EE">It unlocks on your birthday and we\'ll text you a reminder that morning. To claim it, bring a photo ID that matches this date.</div><button type="button" class="crm-demo" data-a="bday">▶ Demo: it\'s my birthday</button></div>') : '') +
        // visit level this month
        (SIMPLE ? '' : function () { var v = monthVisits(me), L = levelOf(me), N = nextLevel(me);
          return '<div class="crm-box"><h4>📅 Your level this month: <span style="color:#FFD23F">' + e(L.name) + '</span></h4>' +
            '<div style="display:flex;gap:6px;margin:6px 0 8px">' + LEVELS.map(function (l) { var on = v >= l.visits; return '<div style="flex:1;text-align:center;padding:7px 2px;border-radius:10px;border:1px solid ' + (on ? '#FFD23F' : '#2A303C') + ';background:' + (on ? '#FFD23F22' : 'transparent') + ';font-size:11.5px"><b style="display:block;font-size:13px">' + e(l.name) + '</b>' + l.visits + '+ visits<br><span style="color:#9AA6CC">' + e(l.perk) + (l.mult > 1 ? ' · ' + l.mult + '× pts' : '') + '</span></div>'; }).join("") + '</div>' +
            '<p style="margin:0;font-size:13px">' + v + ' visit' + (v === 1 ? '' : 's') + ' this month' + (N ? ' · <b>' + (N.visits - v) + ' more</b> to reach ' + e(N.name) + ' (' + e(N.perk) + ')' : ' · top level reached 🔥') + '. Resets on the 1st. One visit counts per day.</p>' +
            '<p class="crm-fine" style="margin-top:6px">Sample perks: ' + e(NAME) + ' sets the real ones.</p></div>'; }()) +
        // points + scan to earn
        (WAL ? '<div class="crm-box">' + walTiles(me) + '<button type="button" class="crm-scan" data-a="scan" style="width:100%;margin-top:10px">📲 Scan to earn</button>'
          : '<div class="crm-box"><div class="crm-pts"><div><div class="k" style="font-size:10px">Your points</div><div class="n">' + pts.toLocaleString() + '<small>pts</small></div></div>' +
          (INTERIM ? '<button type="button" class="crm-scan" data-a="visit">🧾 Add my visit</button></div>' : '<button type="button" class="crm-scan" data-a="scan">📲 Scan to earn</button></div>') +
          (window.SSAI_CARD ? SSAI_CARD.buttonHTML(me) : '')) +
          '<div class="crm-qr"><div class="qr"></div><div class="d4">' + regCode(me) + '</div><small>Show this to the cashier or bartender, or scan it at the register.<br>They ring you up and your points land here. Code refreshes every 5 min.</small></div>' +
          (WAL ? '<p style="margin:10px 0 0;font-size:13px">' + walEarnLine() + ' <b>They never mix:</b> bar points only buy bar rewards, kitchen points only buy food rewards.</p>'
            : SIMPLE ? '<p style="margin:10px 0 0;font-size:13px">Earn <b style="color:#FFD23F">' + PER + ' points per $1</b> on eligible purchases: ' + (INTERIM ? 'tap <b>Add my visit</b> after you pay and snap your receipt.' : 'show this code when staff ring you up.') + (window.SSAI_GAMEPTS ? ' 🎮 Game points today: <b>' + gpUsed(me) + ' of ' + SIMPLE.game.dailyCap + '</b>.' : '') + '</p>'
            : '<p style="margin:10px 0 0;font-size:13px">Earn <b style="color:#FFD23F">' + PER + ' points for every $1</b> you spend in store or in the app.</p>') +
          '<button type="button" class="crm-elink" data-a="earn">✨ Ways to earn points →</button>' +
          (INTERIM ? (window.SSAI_INTERIM ? SSAI_INTERIM.cardHTML(me) : '') + '</div>' :
          '<button type="button" class="crm-demo" data-a="ring">▶ Demo: the cashier rings you up</button>' +
          '<div class="crm-rcode"><input placeholder="Got a receipt? Type its code" maxlength="20"><button type="button" data-a="receipt">Add</button></div></div>') +
        // game access / tokens / free daily spin (CRM_CFG.tokens, CRM_CFG.spin)
        (TC || SPIN ? (function () {
          var g = e(C.game || "the game"), sp = SPIN ? '<button type="button" data-a="spin" style="position:relative"' + (spinReady(me) ? ' class="hot"' : '') + '>' + (spinReady(me) ? '🎡 Free daily spin<b style="position:absolute;right:-5px;top:-7px;min-width:18px;height:18px;border-radius:9px;background:#e3262f;color:#fff;font:900 11px/18px system-ui;padding:0 4px">1</b>' : '🎡 Spun today ✓') + '</button>' : '';
          if (!ON) return '<div class="crm-box" id="crm-tok"><h4>🎮 ' + g + (SPIN ? ' & daily spin' : '') + '</h4>' +
            (TC ? '<p style="margin:0;font-size:13.5px">' + g + ' is <b style="color:#3DDC97">free to play</b> for members' + (hasBoth(me) ? '. Your account is bound to this phone.' : ': add your phone + email once.') + ' Win points and prizes every shift.</p>' : '') +
            '<div class="crm-acts tok-btns">' + (TC ? '<button type="button" data-a="play">🎮 Play now</button>' : '') + sp + '</div>' +
            (SPIN ? '<p class="crm-fine">Daily spin: one free spin per member per day. No purchase necessary. <a href="' + e(rulesUrl()) + '" target="_blank" rel="noopener" style="color:#7FB3FF">Official rules</a></p>' : '') + '</div>';
          var b = me.tok || 0, fu = me.freeDay === laDay();
          return '<div class="crm-box" id="crm-tok"><h4>🪙 ' + g + ' tokens</h4><div class="tok-bal"><div><b>' + b + '</b> <small>tokens</small></div><div style="text-align:right"><small>One play</small><br><b style="font-size:22px">' + TOK.playCost + '</b></div></div>' +
            '<p style="margin:0;font-size:13px">+' + TOK.weeklyFree + ' free every week · +' + TOK.freeDaily + ' free on request once a day · ' + TOK.perDollar + ' per $1 with food you buy. Never sold on their own; no cash value.</p>' +
            '<div class="crm-acts tok-btns"><button type="button" data-a="play"' + (b >= TOK.playCost ? ' class="hot"' : '') + '>' + (b >= TOK.playCost ? '🎮 Play (' + TOK.playCost + ' 🪙)' : '🔒 Need ' + TOK.playCost + ' to play') + '</button>' +
            '<button type="button" data-a="tokfree"' + (fu ? ' disabled' : '') + '>' + (fu ? '🙋 Free tokens used today' : '🙋 ' + TOK.freeDaily + ' free tokens') + '</button>' + (sp ? sp.replace('<button', '<button style="grid-column:1/-1"') : '') + '</div>' +
            '<div class="crm-rcode"><input data-tk="code" placeholder="Token code from staff / receipt" maxlength="12" autocapitalize="characters"><button type="button" data-a="tokcode">Add</button></div>' +
            '<div class="crm-feed" style="max-height:150px;margin-top:8px">' + ((me.tl || []).slice(0, 8).map(function (l) { return '<div><span>' + e(l.t) + '</span><b class="' + (l.n >= 0 ? 'plus' : 'minus') + '">' + (l.n >= 0 ? '+' : '') + l.n + ' 🪙</b></div>'; }).join("") || '<div><span>No tokens yet.</span></div>') + '</div>' +
            '<p class="crm-fine">No purchase necessary: the weekly and daily free tokens always cover a play. Tokens only work in the account bound to this phone. <a href="' + e(rulesUrl()) + '" target="_blank" rel="noopener" style="color:#7FB3FF">Official rules</a></p></div>';
        })() : '') +
        // rewards
        (WAL ? '<div class="crm-box"><h4>🏆 Use your points</h4>' + walTiers(me, "bar") + walTiers(me, "food") + '</div>' :
        '<div class="crm-box"><h4>🏆 Use your points</h4>' + TIERS.map(function (t, i) {
          return '<div class="crm-tier"><span><b>' + t[0].toLocaleString() + '</b> pts · ' + e(t[1]) + '</span><button type="button" data-redeem="' + i + '"' + (pts >= t[0] ? '' : ' disabled') + '>' + (pts >= t[0] ? (INTERIM ? 'Use reward' : 'Redeem') : (t[0] - pts).toLocaleString() + ' to go') + '</button>' +
            '<span class="bar"><i style="width:' + Math.min(100, pts / t[0] * 100) + '%"></i></span></div>'; }).join("") +
          (me.redeem ? '<div class="crm-win" style="margin-top:10px"><b>' + e(me.redeem.t) + '</b><div class="code">' + e(me.redeem.c) + '</div><small>Show this code when you order. One reward a day.</small></div>' : '') + '</div>') +
        // referrals
        (SIMPLE ? '<div class="crm-box" id="crm-ref"><h4>🤝 Invite friends</h4><div class="crm-refcode">' + e(me.ref) + '</div>' +
          '<div class="crm-acts" style="margin-top:0"><button type="button" class="hot" data-a="text">💬 Text a friend</button><button type="button" data-a="copy">📋 Copy invite link</button></div>' +
          '<ul class="crm-rules" style="margin-top:12px"><li><span>👋 A friend joins with your code and makes their first visit</span><b>+' + REF.first + ' pts</b></li><li><span>🎁 Your friend gets the usual ' + SIMPLE.join + ' welcome points</span><b>✓</b></li></ul>' +
          '<div class="crm-stats" style="grid-template-columns:repeat(2,1fr);margin-bottom:4px"><div><b>' + fr.length + '</b>friends joined</div><div><b>' + refPts.toLocaleString() + '</b>pts earned</div></div>' +
          '<button type="button" class="crm-demo" data-a="friend">▶ Demo: a friend joins with your code</button>' +
          '<button type="button" class="crm-demo" data-a="forder"' + (fr.length ? '' : ' disabled') + '>▶ Demo: your friend makes their first visit</button></div>' :
        '<div class="crm-box" id="crm-ref"><h4>🤝 Invite friends, earn forever</h4><div class="crm-refcode">' + e(me.ref) + '</div>' +
          '<div class="crm-acts" style="margin-top:0"><button type="button" class="hot" data-a="text">💬 Text a friend</button><button type="button" data-a="copy">📋 Copy invite link</button></div>' +
          '<ul class="crm-rules" style="margin-top:12px"><li><span>👋 A friend joins with your code</span><b>+' + REF.join + ' pts</b></li><li><span>🎁 Your friend gets ' + e(REF.friendGift) + ' with their first order</span><b>+' + REF.friend + ' pts</b></li><li><span>🛒 Their first order</span><b>+' + REF.first + ' pts</b></li>' +
          '<li><span>🔁 You earn when they spend: every order they place after that, for as long as they\'re a customer</span><b>+' + REF.every + ' pts</b></li><li><span>🎁 ' + REF.goal + ' friends join</span><b>' + e(REF.gift) + '</b></li></ul>' +
          '<div style="font-size:13px;color:#9AA6CC">' + Math.min(fr.length, REF.goal) + ' of ' + REF.goal + ' friends toward ' + e(REF.gift) + (fr.length >= REF.goal ? ' ✅' : '') + '</div><div class="crm-goal"><i style="width:' + Math.min(100, fr.length / REF.goal * 100) + '%"></i></div>' +
          '<div class="crm-stats" style="grid-template-columns:repeat(3,1fr);margin-bottom:4px"><div><b>' + fr.length + '</b>friends</div><div><b>' + fo + '</b>their orders</div><div><b>' + refPts.toLocaleString() + '</b>pts earned</div></div>' +
          '<button type="button" class="crm-demo" data-a="friend">▶ Demo: a friend joins with your code</button>' +
          '<button type="button" class="crm-demo" data-a="forder"' + (fr.length ? '' : ' disabled') + '>▶ Demo: your friend places an order</button></div>') +
        // activity
        '<div class="crm-box"><h4>📜 Points activity</h4><div class="crm-feed">' + ((me.ledger || []).map(function (l) {
          return '<div><span>' + (WAL && W[l.w] ? '<i class="crm-wt">' + wname(l.w) + '</i>' : '') + e(l.t) + '</span><b class="' + (l.pts >= 0 ? 'plus' : 'minus') + '">' + (l.pts >= 0 ? '+' : '') + l.pts.toLocaleString() + '</b></div>'; }).join("") || '<div><span>Nothing yet. Scan at the register to start earning.</span></div>') + '</div></div>' +
        (CUST ? '' : '<button type="button" class="go" style="background:#1a2656;box-shadow:none" data-a="owner">👀 See what the owner sees ↓</button>') +
        (STAFF ? '' : '<button type="button" class="crm-gx" data-a="restore">📱 Not you? Sign back in to your account</button>') +
        (TC ? '<button type="button" class="crm-gx" data-a="signout">🚪 Sign out of this phone' + (me.guardian ? ' (parent check)' : '') + '</button>' : '') +
        (CUST ? '' : '<p class="crm-fine">Demo: points and friends here are saved on this phone only. Live, they\'re in the business\'s database, so they follow the customer to any phone.</p>');
      var qr = join.querySelector(".crm-qr");
      function showQR() {
        qr.style.display = "block";
        var box = qr.querySelector(".qr"), data = "SSAI:" + SLUG + ":" + me.id;
        function paint() { try { var q = window.qrcode(0, "M"); q.addData(data); q.make(); box.innerHTML = q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); } catch (x) { box.innerHTML = ""; } }
        if (window.qrcode) paint();
        else { var sc = document.createElement("script"); sc.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js"; sc.integrity = "sha384-mZT2gIty7ZDdOGkxfP6joZcYdMW1Jvj9dRlfpTmaJAKKXTqzygtB22k7FLe+KZC1"; sc.crossOrigin = "anonymous"; sc.onload = paint; document.head.appendChild(sc); }
      }
      if (keepQR) showQR();
      join.onclick = function (ev) {
        var b = ev.target.closest("button"); if (!b) return;
        var a = b.dataset.a, m = mine()[0];
        if (b.dataset.redeem != null && WAL) {
          // split wallets: a bar tier can only be paid from the bar balance, a food tier only from the kitchen balance
          var rp = String(b.dataset.redeem).split(":"), wk = rp[0], tw = W[wk] && W[wk].tiers[+rp[1]]; if (!tw) return;
          migrate(m); if ((m.w[wk] || 0) < tw[0]) { toast("Not enough " + wname(wk) + " points. " + W[wk].label + " rewards use " + W[wk].label.toLowerCase() + " points only."); return; }
          addPts(m, -tw[0], "🎟️ Redeemed: " + tw[1], wk); (m.rdm = m.rdm || {})[wk] = { t: tw[1], c: (wk === "bar" ? "BAR-" : "FOOD-") + code4(4), w: wk };
          put(m); drawJoin(); drawOwn(); toast("🎟️ " + W[wk].label + " reward ready: " + tw[1]); return;
        }
        if (b.dataset.redeem != null && INTERIM && window.SSAI_INTERIM) { SSAI_INTERIM.redeem(+b.dataset.redeem); return; }
        if (a === "visit" && window.SSAI_INTERIM) { SSAI_INTERIM.claim(); return; }
        if (b.dataset.redeem != null) {
          var t = TIERS[+b.dataset.redeem]; if (m.stars < t[0]) return;
          if (prizeUsedToday(m)) { toast("🎟️ One reward a day: come back tomorrow for your next one."); return; }
          addPts(m, -t[0], "🎟️ Redeemed: " + t[1]); m.redeem = { t: t[1], c: "R-" + code4(4) }; m.pday = pdKey(); put(m); drawJoin(); drawOwn(); toast("🎟️ " + t[1] + " is ready. Show your code."); return;
        }
        if (a === "bday") { m.bdemo = true; m.bcode = "BDAY-" + code4(4); m.ledger = m.ledger || []; m.ledger.unshift({ ts: Date.now(), pts: 0, t: "🎂 Birthday treat unlocked (text sent)" }); earnOnce(m, "birthday_" + new Date().getFullYear(), EARN.birthday, "🎂 Birthday bonus"); put(m); drawJoin(); toast("💬 Text sent: Happy birthday " + m.name.split(" ")[0] + "! Your treat is waiting 🎂"); return; }
        if (a === "scan") { if (qr.style.display === "block") qr.style.display = "none"; else showQR(); return; }
        if (a === "ring" && WAL) {   // the cashier rings up food and drinks separately
          var rf = Math.round((10 + Math.random() * 22) * 100) / 100, rb = Math.round((6 + Math.random() * 18) * 100) / 100, rr = purchase(m, rf, rb, "🧾 In-store order · code " + regCode(m)), rt = tokBuy(m, rf, "In-store order · food $" + rf.toFixed(2)); /* tokens: food only */
          put(m); drawJoin(true); drawOwn(); refreshMenu(); toast(splitMsg(rr) + (lastBonus ? " · +" + lastBonus + " bonus" : "") + tokMsg(rt)); return;
        }
        if (a === "ring") {
          var amt = Math.round((12 + Math.random() * 26) * 100) / 100, got = visit(m, amt * PER);
          addPts(m, got, "🧾 In-store order $" + amt.toFixed(2) + " · code " + regCode(m)); var gt = tokBuy(m, amt, "In-store order $" + amt.toFixed(2)); m.visits = (m.visits || 0) + 1; m.last = Date.now(); put(m);
          drawJoin(true); drawOwn(); refreshMenu(); toast("+" + got + " points · $" + amt.toFixed(2) + " order" + (lastBonus ? " · +" + lastBonus + " bonus" : "") + tokMsg(gt)); return;
        }
        if (a === "receipt") {
          var inp = join.querySelector(".crm-rcode input"), v = inp.value.trim().toUpperCase();
          if (v.length < 6) { inp.placeholder = "Receipt codes are 6+ characters"; inp.value = ""; return; }
          if ((m.receipts = m.receipts || []).indexOf(v) >= 0) { toast("That receipt was already added"); return; }
          m.receipts.push(v);
          if (WAL) {   // the receipt code carries the food and bar subtotals separately
            var xf = Math.round((8 + Math.random() * 18) * 100) / 100, xb = Math.random() < 0.6 ? Math.round((6 + Math.random() * 14) * 100) / 100 : 0, xr = { food: Math.round(xf * W.food.per), bar: Math.round(xb * W.bar.per) };
            addPts(m, xr.food, "🧾 Receipt " + v + " · food $" + xf.toFixed(2), "food"); if (xb) addPts(m, xr.bar, "🧾 Receipt " + v + " · drinks $" + xb.toFixed(2), "bar");
            var xt = tokBuy(m, xf, "Receipt " + v + " · food $" + xf.toFixed(2)); /* tokens: food only */
            m.visits = (m.visits || 0) + 1; m.last = Date.now(); put(m); drawJoin(); drawOwn(); refreshMenu(); toast(splitMsg(xr) + " from your receipt" + tokMsg(xt)); return;
          }
          var ra = Math.round((9 + Math.random() * 22) * 100) / 100, rg = Math.round(ra * PER);
          addPts(m, rg, "🧾 Receipt " + v + " · $" + ra.toFixed(2)); var rtk = tokBuy(m, ra, "Receipt " + v + " · $" + ra.toFixed(2)); m.visits = (m.visits || 0) + 1; m.last = Date.now(); put(m); drawJoin(); drawOwn(); refreshMenu(); toast("+" + rg + " points from your receipt" + tokMsg(rtk)); return;
        }
        if (a === "text") { location.href = "sms:?&body=" + encodeURIComponent(inviteMsg(m)); return; }
        if (a === "copy") { var L = shareLink(m); (navigator.clipboard ? navigator.clipboard.writeText(L) : Promise.reject()).then(function () { toast("Invite link copied"); }, function () { prompt("Copy your invite link:", L); }); return; }
        if (a === "friend") {
          var used = m.friends.map(function (f) { return f.name; }), pool = FRIENDS.filter(function (n) { return used.indexOf(n) < 0; }), nm = pool.length ? pool[(Math.random() * pool.length) | 0] : "Friend " + (used.length + 1);
          m.friends.unshift({ name: nm, ts: Date.now(), orders: 0 });
          addPts(m, REF.join, "👋 " + nm + " joined with your code"); m.ledger[0].ref = 1; tag(m, "referral_join");
          if (m.friends.length === REF.goal) { m.ledger.unshift({ ts: Date.now(), pts: 0, t: "🎁 " + REF.goal + " friends joined: " + REF.gift + " unlocked", ref: 1 }); toast("🎁 " + REF.gift + " unlocked!"); }
          else toast(SIMPLE ? nm + " joined · you get +" + REF.first + " after their first visit" : "+" + REF.join + " points · " + nm + " joined");
          put(m); drawJoin(); drawOwn(); return;
        }
        if (a === "forder") {
          if (!m.friends.length) return;
          if (SIMPLE && !m.friends.filter(function (x) { return !x.orders; }).length) { toast("Every friend has visited. Referral points pay once per friend."); return; }
          var f = SIMPLE ? m.friends.filter(function (x) { return !x.orders; })[0] : m.friends[(Math.random() * m.friends.length) | 0], firstOrder = f.orders === 0, p2 = firstOrder ? REF.first : REF.every; f.orders++;
          // split wallets: "earn when your friend spends" lands in the wallet matching what the friend bought
          var fw = WAL ? (Math.random() < 0.5 ? "bar" : "food") : null, fwt = fw ? (fw === "bar" ? " (drinks)" : " (food)") : "";
          addPts(m, p2, (firstOrder ? "🛒 " + f.name + "'s first order" : "🔁 " + f.name + " ordered again") + fwt, fw); m.ledger[0].ref = 1; tag(m, "referral_order"); put(m);
          drawJoin(); drawOwn(); toast("+" + p2 + (fw ? " " + wname(fw) : "") + " points · " + f.name + " ordered" + fwt); return;
        }
        if (a === "spin") { openSpin(); return; }
        if (a === "signout") { signOut(); return; }
        if (a === "tokfree") { if (freeReq(m)) { put(m); drawJoin(); drawOwn(); refreshMenu(); toast("+" + TOK.freeDaily + " free tokens"); } return; }
        if (a === "tokcode") { var tr = redeemCode(m, join.querySelector("[data-tk=code]").value); if (tr.err) { toast(tr.err); return; } drawJoin(); drawOwn(); refreshMenu(); toast("+" + tr.n + " tokens added"); return; }
        if (a === "play") {
          var gb = document.getElementById(C.gameAnchor || "og") || document.querySelector(".gamebox");
          if (gb) gb.scrollIntoView({ behavior: "smooth", block: "start" });
          if (window.GameMenu) setTimeout(function () { window.GameMenu.open(); }, 400); return;
        }
        if (a === "earn") { openEarn(); return; }
        if (a === "restore") { openRestore(); return; }
        if (a === "owner") own.scrollIntoView({ behavior: "smooth", block: "start" });
      };
      return;
    }
    var inviter = INVITE ? (refOwner(INVITE) || "A friend") : "", pw = pending();
    join.innerHTML = '<span class="k">' + e(NAME) + ' Rewards · free · join anytime</span>' +
      (pw ? '<div class="crm-invited" style="border-color:#FFD23F;background:#FFD23F22;color:#FFE9A3">🏆 You won <b>' + e(pw.t) + '</b> in the game! Join below to save it, then show it at ' + e(NAME) + ' to redeem.</div>' : '') +
      (MISSED ? '<div class="crm-invited" style="border-color:#7FB3FF;background:#7FB3FF22;color:#DCE8FF">📞 Sorry we missed your call! Join below with your name and phone or email and get <b>' + e(MC.offer) + '</b> on your next visit. Just show your code at the counter.</div>' : '') +
      (SIMPLE && window.SSAI_GAMEPTS && SSAI_GAMEPTS.held() ? '<div class="crm-invited" style="border-color:#FFD23F;background:#FFD23F22;color:#FFE9A3">🎮 You have <b>' + SSAI_GAMEPTS.held() + ' game points</b> waiting from today. Join below to save them.</div>' : '') +
      (INVITE && SIMPLE ? '<div class="crm-invited">🤝 ' + e(inviter) + ' invited you! Join with code <b>' + e(INVITE) + '</b>.</div>' : '') +
      (INVITE && !SIMPLE ? '<div class="crm-invited">🤝 ' + e(inviter) + ' invited you! Join with code <b>' + e(INVITE) + '</b> and you get <b>' + e(REF.friendGift) + '</b> with your first order + <b>' + REF.friend + ' bonus points</b>.</div>' : '') +
      '<div class="crm-gift"><b>🎁</b><span>Join now and get <u>' + e(OFFER) + '</u> instantly</span></div>' +
      (SIMPLE ? '<h3>One simple rewards program</h3><p>Earn ' + PER + ' points per $1 on eligible purchases, +' + EARN.birthday + ' on your birthday, +' + REF.first + ' for every friend who joins and visits, and up to ' + SIMPLE.game.dailyCap + ' a day from the game. Takes 10 seconds.</p>' :
      '<h3>Unlock your reward</h3><p>Plus ' + (WAL ? W.bar.per + ' ' + wname("bar") + ' pts per $1 on drinks, ' + W.food.per + ' ' + wname("food") + ' pts per $1 on food' : PER + ' points for every $1') + ', a birthday treat, and your own code to invite friends. Takes 10 seconds.</p>') +
      '<button type="button" class="crm-elink" data-a="restore" style="margin:-4px 0 0">📱 Already a member? Sign back in</button>' +
      '<button type="button" class="crm-elink" data-a="earn" style="margin:-4px 0 4px">✨ See every way to earn →</button>' +
      '<form autocomplete="on" novalidate><label>First name</label><input name="name" maxlength="40" autocomplete="given-name">' +
      '<div class="two"><div><label>Phone</label><input name="phone" type="tel" maxlength="20" autocomplete="tel" placeholder="(310) 555-0123"></div>' +
      '<div><label>or Email</label><input name="email" type="email" maxlength="120" autocomplete="email"></div></div>' +
      '<label>Birthday (' + (SIMPLE ? '+' + EARN.birthday + ' points on the day' : 'for your free birthday treat') + ')</label><div class="three"><select name="bday" aria-label="Birth month"><option value="">Month</option>' + MONTHS_L.map(function (m, i) { return '<option value="' + i + '">' + m + '</option>'; }).join("") + '</select>' +
        '<select name="bdd" aria-label="Birth day"><option value="">Day</option>' + Array.apply(null, Array(31)).map(function (x, i) { return '<option>' + (i + 1) + '</option>'; }).join("") + '</select>' +
        '<select name="bdy" aria-label="Birth year"><option value="">Year</option>' + Array.apply(null, Array(88)).map(function (x, i) { var y = new Date().getFullYear() - 13 - i; return '<option>' + y + '</option>'; }).join("") + '</select></div>' +
      (SIMPLE ? '' : '<div class="crm-idnote">🪪 Bring a photo ID that matches this birthday to claim your treat. We\'ll text you a reminder on the day.</div>') +
      '<label>Friend\'s referral code (optional)</label><input name="ref" maxlength="16" autocapitalize="characters" value="' + e(INVITE) + '" placeholder="e.g. MARIA-21">' +
      '<label class="crm-optin"><input type="checkbox" name="ok"> <span>Send my rewards (points, prize and birthday codes) from ' + e(NAME) + ' to me by text or email. Msg & data rates may apply. Reply STOP anytime.</span></label>' + smsBox() +
      '<button class="go" type="submit">🎁 Get my reward</button><div class="err"></div></form>' +
      '<p class="crm-fine">' + (C.sheet ? 'Your info goes only to ' + e(NAME) + ' for your rewards. Never sold.' : 'Demo: what you type stays on this phone only.') + ' <a href="' + e(privacyUrl()) + '" target="_blank" rel="noopener" style="color:#7FB3FF">Privacy</a>' + '</p>';
    join.onclick = function (ev) { var b = ev.target.closest("[data-a=earn],[data-a=restore]"); if (!b) return; if (b.dataset.a === "restore") openRestore(); else openEarn(); };
    join.querySelector("form").onsubmit = function (ev) {
      ev.preventDefault();
      var res = createMember(this);
      if (res.err) { this.querySelector(".err").textContent = res.err; return; }
      drawJoin(); drawOwn("all", true);
      if (earnSeen() !== "m") setTimeout(function () { openEarn(); }, 700);   // the member version, once, right after joining
    };
  }

  // ---- one sign-up path: the join card and the contact gate both create members here ----
  // f is a <form> with name, phone, email, ok (checkbox) and optional bday/bdd/bdy/ref fields.
  // Returns { err: "message" } or { member: r }. A form with no ref field uses the ?ref= invite code.
  function createMember(f, both) {
    var v = function (n) { var el = f.elements[n]; if (!el) return n === "ref" ? INVITE : ""; return el.type === "checkbox" ? (el.checked ? "1" : "") : el.value.trim(); };
    if (!v("name")) return { err: "Add your first name." };
    if (both && !(okPhone(v("phone")) && okEmail(v("email")))) return { err: "Add your phone number AND email: your free account is tied to them." };
    if (!/\d{7,}/.test(v("phone").replace(/\D/g, "")) && !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(v("email"))) return { err: "Add a phone number or an email so we can send your reward." };
    if ((v("bday") !== "" || v("bdd") || v("bdy")) && !(v("bday") !== "" && v("bdd") && v("bdy"))) return { err: "Add your full birthday (month, day and year) or leave it blank." };
    if (v("bday") !== "" && new Date(+v("bdy"), +v("bday"), +v("bdd")).getMonth() !== +v("bday")) return { err: "That birthday isn't a real date. Check the day." };
    if (!v("ok")) return { err: "Tick the box so we can send you your reward." };
    var rc = v("ref").toUpperCase(), byName = rc ? refOwner(rc) : "";
      var r = { id: code4(8), name: v("name"), phone: v("phone"), email: v("email"), bday: v("bday") === "" ? -1 : +v("bday"), bdd: +v("bdd") || 0, bdy: +v("bdy") || 0, visits: 1, stars: 0, last: Date.now(), joined: Date.now(), code: code(), offer: OFFER,
        ref: refCode(v("name")), refBy: rc, refByName: rc ? (byName || "code " + rc) : "", friends: [], ledger: [] };
      // marketing texts need their own consent + a phone number; keep when and where it was given (the consent record)
      if (v("sms") && /\d{7,}/.test(v("phone").replace(/\D/g, ""))) { r.sms = true; r.smsAt = Date.now(); r.smsSrc = "sign-up form: " + location.pathname; }
      addPts(r, SIMPLE ? SIMPLE.join : 100, "🎉 Welcome to " + NAME + " Rewards"); if (SIMPLE) tag(r, "join_bonus");
      if (rc && SIMPLE) r.ledger.unshift({ ts: Date.now(), pts: 0, t: "🤝 Joined with " + (byName ? byName.split(" ")[0] + "'s" : "a friend's") + " code: they earn " + REF.first + " pts after your first visit" });
      else if (rc) { addPts(r, REF.friend, "🤝 Joined with " + (byName ? byName.split(" ")[0] + "'s" : "a friend's") + " code"); tag(r, "referred_bonus");
        r.fgift = { t: REF.friendGift + " with your first order", c: "FRIEND-" + code4(4), ts: Date.now() }; r.ledger.unshift({ ts: Date.now(), pts: 0, t: "🎁 Friend gift: " + r.fgift.t }); }
      if (SIMPLE) gpCredit(r);   // game points this guest earned before joining (held on this phone, today only, within the daily cap)
      var pz = pending(); if (pz) { r.wins = [pz]; r.ledger.unshift({ ts: Date.now(), pts: 0, t: "🏆 Won " + pz.t + " in the game" }); try { localStorage.removeItem(PEND); } catch (x) {} }
      else if (MISSED) { r.wins = [{ t: MC.offer, c: "CALL-" + code4(4), ts: Date.now(), ttl: (MC.days || 7) * 864e5, k: "missed" }]; r.ledger.unshift({ ts: Date.now(), pts: 0, t: "📞 Sorry we missed your call: " + MC.offer }); r.src = "missed call"; }
      // game accounts (CRM_CFG.tokens): ONE member per device, bound to it (live: server-side + SMS verification)
      if (TC) { r.dev = devId(); r.bound = Date.now(); }
      var list = mine(); list.unshift(r); save(TC ? [r] : list.slice(0, 5)); syncLater(r);
      // live restaurants: send the sign-up to the owner's Google Sheet (Apps Script web app in CRM_CFG.sheet)
      if (C.sheet) try { fetch(C.sheet, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain" }, body: JSON.stringify({
        slug: SLUG, restaurant: NAME, memberId: r.id, name: r.name, phone: r.phone, email: r.email, bday: r.bday >= 0 ? (r.bday + 1) + "/" + r.bdd + "/" + r.bdy : "",
        src: r.src || qs.get("s") || qs.get("src") || (rc ? "referral " + rc : "app"), code: r.code, prize: (r.wins && r.wins[0] && r.wins[0].t) || "", prizeCode: (r.wins && r.wins[0] && r.wins[0].c) || "", ref: r.ref,
        smsConsent: r.sms ? "yes" : "no", smsConsentAt: r.sms ? new Date(r.smsAt).toISOString() : "", smsConsentText: r.sms ? SMS_TEXT : "" }) }); } catch (x) {}
    return { member: r };
  }

  // ---- contact gate ----
  // SSAI_GATE(reason, cb): reason "order" | "prize" | "score". A member on this phone → cb(member) right away.
  // Otherwise a short sign-up sheet opens (name, phone or email, opt-in, optional birthday); on submit the member is
  // created through createMember() (welcome points, referral, Google Sheet, any pending game prize), then cb(member).
  // "Not now" closes it without calling cb. Returns true when cb already ran.
  // opts (optional, used by demo/claimscore.js "claim your score after the game"): {title, sub, btn} override the sheet's
  // wording, lead = extra HTML under it (rank / prize), later = the "Not now" label, onLater() runs after "Not now",
  // onOpen(overlay) / onClose() hooks, noFocus = don't focus the first field (the glove pointer shows it instead), cls = extra
  // overlay class. The fields, consent boxes, createMember() and where the info goes are exactly the same as without opts.
  var GATE_TXT = {
    order: ["Finish your order", "Add your name and a phone or email so " + NAME + " can reach you about this order.", "Send my order"],
    prize: ["Save your prize & score", "Add your name and a phone or email to save your prize to your " + NAME + " Rewards. Your code shows right after.", "🎁 Save my prize"],
    score: ["Save your prize & score", "Add your name and a phone or email to put your score on the weekly board. If you win, that's how we reach you.", "🏆 Post my score"]
  };
  var gateEl = null;
  function gate(reason, cb, opts) {
    opts = opts || {};
    if (STAFF) { toast("🧑‍🍳 Staff practice: no sign-ups, orders or leaderboard posts here."); return; }
    // KIDS' PRIVACY (COPPA): Kid mode only unlocks through a PARENT/GUARDIAN account on this phone. Reasons "kidunlock" /
    // "kidprize" word the sheet for the parent, require the "I'm the parent/guardian (18+) and this is my own phone and
    // email" box, and mark the account m.guardian. The account and every contact detail belong to the parent; the child
    // never types anything (an optional nickname stays on the phone only, see orderup.js). Kid play, the kid best score
    // and kid prizes all go to the parent's account. No birthday is asked here. (Draft: attorney review before launch.)
    // LIVE: the server verifies the parent's phone with a text code before Kid mode unlocks (like the device binding).
    var kidg = reason === "kidunlock" || reason === "kidprize";
    var m = mine()[0], both = reason === "play" || reason === "spin" || kidg;   // game + spin accounts need phone AND email
    if (m && (!both || hasBoth(m)) && (!kidg || m.guardian)) { if (cb) cb(m); return true; }
    if (gateEl) gateEl.close();
    var T = GATE_TXT[reason] || GATE_TXT.order, rid = "crm-g" + code4(4), pre = function (k) { return m && m[k] ? ' value="' + e(m[k]) + '"' : ''; };
    if (opts.title) T = [opts.title, opts.sub || T[1], opts.btn || T[2]];
    if (m && !kidg) T = [T[0], "Add your " + (okPhone(m.phone) ? "email" : okEmail(m.email) ? "phone number" : "phone number and email") + " to finish your free account. It's tied to this phone.", T[2]];
    var ov = document.createElement("div"); ov.className = "crm-gate" + (opts.cls ? " " + opts.cls : ""); ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-labelledby", rid); ov.setAttribute("data-scroll-ok", "");
    ov.innerHTML = '<section class="crm-card"><span class="k">' + e(NAME) + ' Rewards · free</span><h3 id="' + rid + '">' + e(T[0]) + '</h3><p>' + e(T[1]) + '</p>' + (opts.lead || '') +
      (m ? '' : SIMPLE ? '<div class="crm-gift"><b>🎁</b><span>You also get <u>' + SIMPLE.join + ' welcome points</u> on joining</span></div>' : '<div class="crm-gift"><b>🎁</b><span>You also get <u>' + e(OFFER) + '</u> + 100 ' + (WAL ? W[BONUS].label.toLowerCase() + ' ' : '') + 'points' + (both && ON ? ' + ' + TOK.weeklyFree + ' free tokens a week' : '') + '</span></div>') +
      (INVITE && !m && SIMPLE ? '<div class="crm-invited">🤝 Joining with code <b>' + e(INVITE) + '</b>: your friend earns ' + REF.first + ' points after your first visit.</div>' : '') + (INVITE && !m && !SIMPLE ? '<div class="crm-invited">🤝 Joining with code <b>' + e(INVITE) + '</b>: ' + e(REF.friendGift) + ' with your first order + ' + REF.friend + ' bonus points.</div>' : '') +
      '<form autocomplete="on" novalidate>' + (kidg ? '<div class="crm-invited" style="border-color:#FFD23F;background:#FFD23F22;color:#FFE9A3">🧒 Kids: hand the phone to a parent or guardian for this part.</div>' : '') + '<label>' + (kidg ? "Parent or guardian's first name" : "First name") + '</label><input name="name" maxlength="40" autocomplete="given-name" enterkeyhint="next"' + pre("name") + '>' +
      '<div class="two"><div><label>Phone</label><input name="phone" type="tel" maxlength="20" autocomplete="tel" placeholder="(310) 555-0123"' + pre("phone") + '></div>' +
      '<div><label>' + (both ? 'Email' : 'or Email') + '</label><input name="email" type="email" maxlength="120" autocomplete="email" autocapitalize="none"' + pre("email") + '></div></div>' +
      (both ? '<div class="crm-idnote">📱 One account per phone. Live, we text you a code to confirm the number.</div>' : '') +
      (kidg ? '<label class="crm-optin"><input type="checkbox" name="guardian"> <span><b>I\'m the parent or guardian (18+)</b> and this is my own phone and email. My child\'s points and prizes are saved to my account.</span></label>' : '') +
      (m || kidg ? '' : '<details class="crm-gbd"><summary>🎂 Add birthday for ' + (SIMPLE ? '+' + EARN.birthday + ' points' : 'a free treat') + '</summary><div class="three"><select name="bday" aria-label="Birth month"><option value="">Month</option>' + MONTHS_L.map(function (x, i) { return '<option value="' + i + '">' + x + '</option>'; }).join("") + '</select>' +
        '<select name="bdd" aria-label="Birth day"><option value="">Day</option>' + Array.apply(null, Array(31)).map(function (x, i) { return '<option>' + (i + 1) + '</option>'; }).join("") + '</select>' +
        '<select name="bdy" aria-label="Birth year"><option value="">Year</option>' + Array.apply(null, Array(88)).map(function (x, i) { return '<option>' + (new Date().getFullYear() - 13 - i) + '</option>'; }).join("") + '</select></div>' +
        '<div class="crm-idnote">🪪 Bring a photo ID that matches this birthday to claim your treat.</div></details>') +
      '<label class="crm-optin"><input type="checkbox" name="ok"> <span>Send my rewards (points, prize and birthday codes) from ' + e(NAME) + ' to me by text or email. Msg & data rates may apply. Reply STOP anytime.</span></label>' + smsBox() +
      '<button class="go" type="submit">' + e(T[2]) + '</button><div class="err" role="alert"></div>' +
      (m ? '' : '<button type="button" class="crm-elink" data-a="restore" style="text-align:center">📱 Already a member? Sign back in</button>') +
      '<button type="button" class="crm-gx">' + e(opts.later || "Not now") + '</button></form>' +
      '<p class="crm-fine">' + (C.sheet ? 'Your info goes only to ' + e(NAME) + ' for your rewards. Never sold.' : 'Demo: what you type stays on this phone only.') + ' <a href="' + e(privacyUrl()) + '" target="_blank" rel="noopener" style="color:#7FB3FF">Privacy</a>' + '</p></section>';
    var html = document.documentElement, prevOv = html.style.overflow, vv = window.visualViewport;
    function fit() { if (vv) { ov.style.height = vv.height + "px"; ov.style.top = vv.offsetTop + "px"; } }
    function key(ev) { if (ev.key === "Escape") close(); }
    function close() {
      if (!ov.parentNode) return; ov.remove(); gateEl = null; html.style.overflow = prevOv;
      document.removeEventListener("keydown", key); if (vv) { vv.removeEventListener("resize", fit); vv.removeEventListener("scroll", fit); }
      if (opts.onClose) try { opts.onClose(); } catch (x) {}
    }
    ov.close = close; gateEl = ov;
    var f = ov.querySelector("form");
    ov.querySelector(".crm-gx").onclick = function () { close(); if (opts.onLater) try { opts.onLater(); } catch (x) {} };
    var rsb = ov.querySelector("[data-a=restore]"); if (rsb) rsb.onclick = function () { close(); openRestore(cb); };
    ov.addEventListener("click", function (ev) { if (ev.target === ov) close(); });
    f.onsubmit = function (ev) {
      ev.preventDefault();
      if (kidg && !(f.elements.guardian && f.elements.guardian.checked)) { f.querySelector(".err").textContent = "A parent or guardian (18+) needs to tick the box."; return; }
      if (m) {   // existing member finishing a game account: add the missing phone / email, bind to this phone
        var ph = f.elements.phone.value.trim(), em = f.elements.email.value.trim();
        if (!okPhone(ph) || !okEmail(em)) { f.querySelector(".err").textContent = "Add your phone number AND email."; return; }
        if (!f.elements.ok.checked) { f.querySelector(".err").textContent = "Tick the box so we can send you your rewards."; return; }
        m.phone = ph; m.email = em; if (f.elements.name.value.trim()) m.name = f.elements.name.value.trim(); if (kidg) m.guardian = Date.now(); bind(m); put(m);
        close(); drawJoin(); drawOwn(); if (cb) cb(m); return;
      }
      var res = createMember(f, both);
      if (res.err) { f.querySelector(".err").textContent = res.err; return; }
      if (kidg) { res.member.guardian = Date.now(); res.member.src = "kid mode (guardian)"; var gl = mine(); gl[0] = res.member; save(gl); }
      close(); drawJoin(); drawOwn("all");
      toast("🎉 You're in, " + res.member.name.split(" ")[0] + "! +100 points");
      if (cb) cb(res.member);
    };
    document.body.appendChild(ov); html.style.overflow = "hidden";
    document.addEventListener("keydown", key); if (vv) { vv.addEventListener("resize", fit); vv.addEventListener("scroll", fit); fit(); }
    if (opts.onOpen) try { opts.onOpen(ov); } catch (x) {}
    if (!opts.noFocus) setTimeout(function () { try { f.elements.name.focus({ preventScroll: true }); } catch (x) { f.elements.name.focus(); } }, 60);
    return false;
  }
  gate.member = function () { return mine()[0] || null; };
  gate.offer = OFFER;   // what joining gets you (CRM_CFG.offer, or "N welcome points" on the simple program): claimscore.js quotes it

  // ---- SIGN BACK IN: restore my account on a new phone (2026-10-13, standard for every restaurant) ----
  // A guest on a new phone (or after Safari cleared the site) types the phone OR email they joined with, gets a 6-digit code
  // (text via Twilio Verify, or email) and types it. Code.gs restore_start / restore_check never says whether a contact is
  // a member, sends the code, and on a match returns THAT member's server record and moves the member to this phone's
  // device id. The phone writes the server's numbers (points, card ID, ledger, today's prize + game points, unused wins,
  // best score, location bonus) into the usual member store and never sends its own points up first. One member per
  // phone: if this phone holds someone else, the guest confirms the switch and that member is signed out HERE only (their
  // account stays safe on the server). Staff can't do this for a guest and never see codes.
  // No API (demo): a friendly "works once the app is live" note. ?test=1 without an API = a mock (any contact, code 123456).
  var RS_TEST = !API && /[?&]test=1(&|$)/.test(location.search);
  var BESTK = C.bestKey || { "melody-bar-grill": "melody-best" }[SLUG] || "";
  function rsPost(o, cb) {
    o.slug = SLUG; o.dev = devId();
    if (RS_TEST) { setTimeout(function () { cb(rsMock(o)); }, 350); return; }
    var done = false, fin = function (j) { if (!done) { done = true; cb(j); } };
    try { fetch(API, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(o) }).then(function (x) { return x.json(); })
      .then(function (j) { if (j && !j.ok && j.reason === "unknown type") j = { ok: false, reason: "Signing back in isn't switched on yet. Your points are safe: try again in a day or two." }; fin(j || { ok: false }); }, function () { fin({ ok: false, reason: "No connection. Check your signal and try again." }); }); }
    catch (x) { fin({ ok: false, reason: "No connection. Check your signal and try again." }); }
  }
  function rsMock(o) {   // ?test=1 only: lets the flow be clicked through without a backend
    if (o.type === "restore_start") return /@/.test(o.contact) || /\d{10}/.test(String(o.contact).replace(/\D/g, "")) ? { ok: true, sent: true, masked: /@/.test(o.contact) ? String(o.contact).charAt(0) + "•••@" + String(o.contact).split("@")[1] : "•••" + String(o.contact).replace(/\D/g, "").slice(-4), msg: "Test mode: the code is 123456." } : { ok: false, reason: "Type the phone number or email you joined with." };
    if (String(o.code) !== "123456") return { ok: false, wrong: true, reason: "Wrong code. (Test mode: it's 123456.)" };
    var now = Date.now();
    return { ok: true, member: { id: "TESTRSTR", name: "Test Guest", phone: /@/.test(o.contact) ? "" : o.contact, email: /@/.test(o.contact) ? o.contact : "", bday: "", joined: now - 30 * 864e5, last: now - 2 * 864e5,
      stars: 1234, earned: 1500, spent: 266, visits: 5, ref: "TEST-R2D", refBy: "", friends: 0, gameTotal: 40, redeems: 1, sms: false, smsAt: "", src: "test", card: "" },
      ledger: [{ ts: now, pts: 0, t: "📱 Signed back in on a new phone" }, { ts: now - 2 * 864e5, pts: 40, t: "🎮 Game points · score 4,000" }, { ts: now - 30 * 864e5, pts: 100, t: "🎉 Welcome bonus" }],
      ec: {}, friendIds: {}, best: 4000, gameToday: 0, wins: [], prizeToday: false, adjDone: [], eb: { state: "none" }, locBonus: false };
  }
  // server record → the member object this file already uses (same fields createMember / syncLater use)
  function rsApply(j) {
    var s = j.member || {}, old = mine()[0], same = old && old.id === s.id, now = Date.now(), bd = String(s.bday || "").split("/");
    var refBy = String(s.refBy || "").replace(/^Referral code /i, "").trim();
    var r = { id: String(s.id), name: String(s.name || "Member"), phone: String(s.phone || ""), email: String(s.email || ""),
      bday: +bd[0] >= 1 && +bd[0] <= 12 ? +bd[0] - 1 : -1, bdd: +bd[1] || 0, bdy: +bd[2] || 0,
      visits: +s.visits || 0, stars: +s.stars || 0, earned: +s.earned || 0, spent: +s.spent || 0, nred: +s.redeems || 0, gtot: +s.gameTotal || 0,
      last: +s.last || now, joined: +s.joined || now, code: same && old.code || code(), offer: OFFER, ref: String(s.ref || "") || refCode(String(s.name || "")),
      refBy: refBy, refByName: refBy ? "code " + refBy : "", friends: [], card: /^[A-Z]{2,4}-[A-Z0-9]{5}$/.test(s.card || "") ? s.card : "",
      ledger: (j.ledger || []).slice(0, 40).map(function (l) { var x = { ts: +l.ts || now, pts: Math.round(+l.pts || 0), t: String(l.t || "") }; if (l.k) x.k = String(l.k); return x; }),
      ec: j.ec || {}, adjDone: (j.adjDone || []).map(String), dev: devId(), bound: now, restored: now, src: String(s.src || "") };
    var fid = j.friendIds || {}; Object.keys(fid).forEach(function (k) { r.friends.push({ name: "Friend", id: k, orders: fid[k] ? 1 : 0 }); });
    while (r.friends.length < (+s.friends || 0)) r.friends.push({ name: "Friend", orders: 0 });
    if (s.sms) { r.sms = true; r.smsAt = Date.parse(s.smsAt) || now; r.smsSrc = "restored with the account"; }
    if (j.prizeToday) r.pday = pdKey();
    if (SIMPLE && +j.gameToday) { r.gday = gpDay(); r.gpts = Math.min(+j.gameToday, SIMPLE.game.dailyCap); }
    r.wins = (j.wins || []).slice(0, 5).map(function (w) { var x = { t: String(w.t), c: "WIN-" + code4(4), ts: +w.ts || now, k: String(w.k || "game") }; x.until = until(x); return x; });
    if (j.locBonus) r.locBuddy = now;
    if (+j.best) { r.best = +j.best; if (BESTK) try { if ((+localStorage.getItem(BESTK) || 0) < r.best) localStorage.setItem(BESTK, String(r.best)); } catch (x) {} }
    if (!r.ledger.some(function (l) { return /Signed back in/.test(l.t); })) r.ledger.unshift({ ts: now, pts: 0, t: "📱 Signed back in on a new phone" });
    if (same && old.guardian) r.guardian = old.guardian;
    save([r]);   // one member per phone: anyone else on this phone is signed out here (their account stays on the server)
    if (!RS_TEST) syncLater(r);
    return r;
  }
  var rsEl = null;
  function openRestore(cb) {
    if (STAFF) { toast("🧑‍🍳 Staff practice: guests sign back in on their own phone."); return; }
    if (rsEl) rsEl.close();
    var m = mine()[0], rid = "crm-r" + code4(4), live = !!(API || RS_TEST), contact = "";
    var ov = document.createElement("div"); ov.className = "crm-gate"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-labelledby", rid); ov.setAttribute("data-scroll-ok", "");
    var html = document.documentElement, prevOv = html.style.overflow;
    function close() { if (!ov.parentNode) return; ov.remove(); rsEl = null; html.style.overflow = prevOv; document.removeEventListener("keydown", key); }
    function key(ev) { if (ev.key === "Escape") close(); }
    ov.close = close; rsEl = ov;
    function head(sub) { return '<section class="crm-card"><span class="k">' + e(NAME) + ' Rewards · sign back in</span><h3 id="' + rid + '">📱 Sign back in</h3><p>' + sub + '</p>'; }
    var foot = '<p class="crm-fine">Staff can\'t sign in for you and never see your code. Tip: add this app to your Home Screen so you stay signed in.</p></section>';
    function step1(err) {
      if (!live) { ov.innerHTML = head("Signing back in on a new phone works once " + e(NAME) + "'s app is live. Your points are safe: nothing is lost.") +
        '<button type="button" class="go" data-a="x">OK</button>' + foot; return; }
      ov.innerHTML = head("New phone? Type the <b>phone number or email you joined with</b>. We'll send you a 6-digit code.") +
        (m ? '<div class="crm-invited" style="border-color:#FFD23F;background:#FFD23F22;color:#FFE9A3">This phone has <b>' + e(m.name.split(" ")[0]) + '\'s</b> rewards. If you sign in to a different account, ' + e(m.name.split(" ")[0]) + ' is signed out on this phone only (their points stay on their account).</div>' : '') +
        '<form novalidate autocomplete="on"><label>Phone or email</label><input name="c" maxlength="120" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="(310) 555-0123 or you@email.com" value="' + e(contact) + '">' +
        (m ? '<label class="crm-optin"><input type="checkbox" name="sw"> <span>Yes, switch this phone to my account.</span></label>' : '') +
        '<button class="go" type="submit">Send my code</button><div class="err" role="alert">' + e(err || "") + '</div><button type="button" class="crm-gx" data-a="x">Not now</button></form>' + foot;
      var f = ov.querySelector("form");
      f.onsubmit = function (ev) {
        ev.preventDefault(); var v = f.elements.c.value.trim(), er = f.querySelector(".err");
        if (!okEmail(v) && String(v).replace(/\D/g, "").length < 10) { er.textContent = "Type the phone number (with area code) or email you joined with."; return; }
        if (m && f.elements.sw && !f.elements.sw.checked) { er.textContent = "Tick the box to switch this phone to your account."; return; }
        contact = v; var b = f.querySelector(".go"); b.disabled = true; b.textContent = "Sending…";
        rsPost({ type: "restore_start", contact: v }, function (j) { if (!ov.parentNode) return; if (!j.ok) { step1(j.reason || "Something went wrong. Try again."); return; } step2(j); });
      };
      setTimeout(function () { try { f.elements.c.focus({ preventScroll: true }); } catch (x) {} }, 60);
    }
    function step2(j, err) {
      ov.innerHTML = head(e(j.msg || "If that's a member, we sent a code.") + (j.masked ? ' Sent to <b>' + e(j.masked) + '</b>.' : '') + ' It works once and expires in ' + (j.mins || 10) + ' minutes.') +
        '<form novalidate><label>6-digit code</label><input name="code" inputmode="numeric" pattern="[0-9]*" autocomplete="one-time-code" maxlength="6" placeholder="123456" style="letter-spacing:.3em;font-size:22px;text-align:center">' +
        '<button class="go" type="submit">Sign me back in</button><div class="err" role="alert">' + e(err || "") + '</div>' +
        '<button type="button" class="crm-gx" data-a="again">Send a new code</button><button type="button" class="crm-gx" data-a="back">Use a different phone or email</button></form>' + foot;
      var f = ov.querySelector("form");
      f.onsubmit = function (ev) {
        ev.preventDefault(); var c = f.elements.code.value.replace(/\D/g, ""), er = f.querySelector(".err");
        if (c.length !== 6) { er.textContent = "Type the 6 digits from your text or email."; return; }
        var b = f.querySelector(".go"); b.disabled = true; b.textContent = "Checking…";
        rsPost({ type: "restore_check", contact: contact, code: c }, function (k) {
          if (!ov.parentNode) return;
          if (!k.ok || !k.member) { if (k.locked || k.expired) step1(k.reason); else step2(j, k.reason || "That didn't work. Try again."); return; }
          var r = rsApply(k); close(); drawJoin(); drawOwn();
          try { if (window.SSAI_CARD && SSAI_CARD.refresh) SSAI_CARD.refresh(); } catch (x) {}
          try { window.dispatchEvent(new CustomEvent("ssai:restored", { detail: { member: r } })); } catch (x) {}
          refreshMenu(); toast("👋 Welcome back, " + r.name.split(" ")[0] + "! " + (r.stars || 0).toLocaleString() + " points restored");
          if (cb) cb(r);
        });
      };
      setTimeout(function () { try { f.elements.code.focus({ preventScroll: true }); } catch (x) {} }, 60);
    }
    ov.addEventListener("click", function (ev) {
      if (ev.target === ov) { close(); return; }
      var b = ev.target.closest("[data-a]"); if (!b) return;
      if (b.dataset.a === "x") close();
      else if (b.dataset.a === "back") step1();
      else if (b.dataset.a === "again") { b.disabled = true; rsPost({ type: "restore_start", contact: contact }, function (j) { if (!ov.parentNode) return; if (!j.ok) { if (j.locked) step1(j.reason); else step2(j.msg ? j : { msg: "" }, j.reason); return; } step2(j); toast("New code sent"); }); }
    });
    step1(); document.body.appendChild(ov); html.style.overflow = "hidden"; document.addEventListener("keydown", key);
    return false;
  }
  window.SSAI_RESTORE = openRestore;

  // ======================= GAME ACCESS · TOKENS · FREE DAILY SPIN (opt-in: CRM_CFG.tokens / CRM_CFG.spin) =======================
  // LEGAL STRUCTURE (California). Draft for the restaurant's attorney to review before launch; this is not legal advice.
  // An illegal lottery (Penal Code 319) needs all three of PRIZE + CHANCE + CONSIDERATION (paying or buying to take part).
  // Take any one away and it is not a lottery. So:
  //  • The game (Order Up!) is a game of SKILL: the score comes only from how fast and accurately the player builds the
  //    orders, and prizes are fixed score thresholds / top score of the week. Nothing in the game is a random prize draw.
  //  • The DAILY SPIN is CHANCE + PRIZE, so it must NEVER have consideration: it is FREE, one spin per member per day,
  //    never costs tokens, never needs a purchase and can never be bought. (A spin "you can purchase in store" would be
  //    prize + chance + consideration = an illegal lottery, so it is deliberately not built.) Prizes are food discounts,
  //    points or tokens; never cash, never alcohol (Bus. & Prof. Code 25600: no alcohol as a free prize).
  //  • TOKENS (PHASE 2, off by default) are a loyalty bonus that comes WITH food purchases (staff ring-up, receipt / staff
  //    code, in-app order). They are never sold on their own, have no cash value and are never redeemable for cash or
  //    prizes. There is always an equally good FREE way to get them ("AMOE", alternative method of entry, the "no purchase
  //    necessary" route): weeklyFree tokens every week (default 10 = one free play) and freeDaily tokens on request once a
  //    day (default 10 = one free play a day), no purchase necessary.
  //  • PHASE 1 (live default, tokens.enabled:false): the game is FREE to play for members. Same account rules, same points
  //    and prizes, same free daily spin; no token lock. ?tokens=1 turns PHASE 2 on for demo testing (?tokens=0 forces off).
  //  • ACCOUNTS: playing needs a member account with phone AND email, one member per device, bound to that device.
  //    DEMO: a random device id in localStorage + one member stored per phone. LIVE this is enforced SERVER-SIDE: an SMS
  //    code verifies the phone, the server binds the account to a device token, refuses a second account for the same
  //    phone / email / device, and validates token codes (single use, credited only to the account they were redeemed
  //    into). Nothing here is trusted for real money or prizes until the server checks it.
  //  Official rules draft (eligibility, no purchase necessary, free tokens, prizes, spin odds, skill scoring, sponsor):
  //  CRM_CFG.spin.rules (default "rules.html" next to the page).
  // CRM_CFG.tokens = {enabled:false, perDollar:1, perOrder:0, playCost:10, weeklyFree:10, freeDaily:10}
  // CRM_CFG.spin   = {prizes:[{t:"+50 points", pts:50, w:30}, {t:"+5 tokens", tok:5, alt:{t:"+50 points",pts:50}, w:10},
  //                   {t:"$2 off any plate", code:true, w:10}, …], rules:"rules.html"}   w = weight (odds = w / total)
  var TC = C.tokens || null, TOK = null, ON = false;
  if (TC) {
    TOK = { enabled: false, perDollar: 1, perOrder: 0, playCost: 10, weeklyFree: 10, freeDaily: 10 };
    for (var tk in TC) TOK[tk] = TC[tk];
    var tq = qs.get("tokens"); if (tq === "1") TOK.enabled = true; else if (tq === "0") TOK.enabled = false;
    ON = !!TOK.enabled;
  }
  var SPIN = C.spin && (C.spin.prizes || []).length ? C.spin : null;
  function spinPrizes() { return SPIN.prizes.map(function (p) { return p.tok && !ON && p.alt ? Object.assign({ w: p.w }, p.alt) : p; }).filter(function (p) { return !p.tok || ON; }); }
  GATE_TXT.play = ["Play " + (C.game || "the game"), "Free member account: your name, phone AND email. It's tied to this phone so your points, prizes" + (ON ? " and tokens" : "") + " stay yours.", "🎮 Save & play"];
  GATE_TXT.kidunlock = ["Kid mode is for families", "A parent or guardian signs in first. Use YOUR name, phone and email: your child's points, kid best score and kid prizes are saved to your account, and your child never types anything.", "✅ Unlock Kid mode"];
  GATE_TXT.kidprize = ["Parent or guardian: save this kid prize", "Kid prizes are saved to the parent or guardian's account. Use YOUR name, phone and email.", "🎁 Save to my account"];
  GATE_TXT.spin = ["Your free daily spin", "Free member account: your name, phone AND email. One free spin per member per day. No purchase necessary.", "🎡 Save & spin"];
  function devId() { var k = KEY + "_dev", v = ""; try { v = localStorage.getItem(k); if (!v) { v = "D" + code4(10); localStorage.setItem(k, v); } } catch (x) { v = "D-nostore"; } return v; }
  function okPhone(p) { return /\d{7,}/.test(String(p || "").replace(/\D/g, "")); }
  function okEmail(s) { return /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(String(s || "")); }
  function hasBoth(m) { return !!m && okPhone(m.phone) && okEmail(m.email); }
  function bound(m) { return !!m && m.dev === devId(); }
  function bind(m) { if (m.dev) return; m.dev = devId(); m.bound = Date.now(); (m.ledger = m.ledger || []).unshift({ ts: Date.now(), pts: 0, t: "📱 Account bound to this phone" }); }
  function laDay(t) { return new Date(t || Date.now()).toLocaleDateString("en-US", { timeZone: "America/Los_Angeles" }); }
  function weekKey() { var d = new Date(laDay()); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d.toDateString(); }   // that week's Monday (LA)
  function tokAdd(m, n, why, k) {
    m.tok = Math.max(0, (m.tok || 0) + n); (m.tl = m.tl || []).unshift({ ts: Date.now(), n: n, t: why, k: k }); m.tl = m.tl.slice(0, 40);
    (m.tc = m.tc || {})[k] = (m.tc[k] || 0) + Math.abs(n);
  }
  // weekly free tokens: auto-credited the first time the member opens the app in a new week (Mon–Sun, LA time)
  function weekly(m) { if (!ON || !m || !bound(m)) return 0; var wk = weekKey(); if (m.tweek === wk) return 0; m.tweek = wk; tokAdd(m, TOK.weeklyFree, "🎁 Weekly free tokens", "weekly"); return TOK.weeklyFree; }
  // tokens that come WITH a food purchase (never sold on their own)
  function tokBuy(m, amount, why) { if (!ON || !m || !bound(m) || !(amount > 0)) return 0; var n = Math.floor(amount * TOK.perDollar) + (TOK.perOrder || 0); if (n > 0) tokAdd(m, n, "🧾 " + why, "purchase"); return n; }
  function tokMsg(n) { return n ? " · +" + n + " 🪙" : ""; }
  function freeReq(m) { if (!ON || !m) return 0; var d = laDay(); if (m.freeDay === d) return 0; m.freeDay = d; tokAdd(m, TOK.freeDaily, "🙋 Free tokens on request · no purchase necessary", "free"); return TOK.freeDaily; }
  function refreshMenu() { try { if (window.GameMenu && window.GameMenu.refresh) window.GameMenu.refresh(); } catch (x) {} }
  // staff / receipt token codes: the register prints one with the order (live: generated + checked by the server)
  var TCK = KEY + "_tcodes";
  function tcodes() { try { return JSON.parse(localStorage.getItem(TCK) || "[]"); } catch (x) { return []; } }
  function tcSave(l) { try { localStorage.setItem(TCK, JSON.stringify(l.slice(0, 60))); } catch (x) {} }
  function issueCode(amount) { var n = Math.max(1, Math.floor(amount * TOK.perDollar) + (TOK.perOrder || 0)), c = { c: "TOK-" + code4(5), n: n, amt: amount, ts: Date.now() }, l = tcodes(); l.unshift(c); tcSave(l); return c; }
  function redeemCode(m, raw) {
    var v = String(raw || "").toUpperCase().replace(/\s+/g, ""), l = tcodes(), hit = l.filter(function (x) { return x.c === v; })[0];
    if (!ON) return { err: "Tokens aren't switched on yet." };
    if (!hit) return { err: "No token code like that. Check the letters: codes come on your receipt or from staff." };
    if (hit.used) return { err: "That code was already used on " + new Date(hit.used).toLocaleString() + "." };
    if (!bound(m)) return { err: "Token codes only go into the account bound to this phone." };
    hit.used = Date.now(); hit.by = m.id; tcSave(l); tokAdd(m, hit.n, "🧾 Code " + v + " · $" + hit.amt.toFixed(2) + " order", "purchase"); put(m); return { n: hit.n };
  }
  // Phase 1 adult play: no gate. A member on this phone still gets the play counted on their account.
  function guestPlay(go) {
    var m = mine()[0];
    if (m && hasBoth(m) && bound(m)) { m.plays = (m.plays || 0) + 1; put(m); drawJoin(); drawOwn(); refreshMenu(); }
    go();
  }
  // the game's PLAY button calls this. Phase 1: everyone plays free (guestPlay; Kid mode still needs the parent). Phase 2: costs playCost tokens.
  function playGate(go, kid) {
    // Kid mode plays on the signed-in parent's account (gate "kidunlock" passes straight through once it exists)
    return gate(kid ? "kidunlock" : "play", function () {
      var m = mine()[0]; if (!m) return;
      bind(m); weekly(m);
      if (!bound(m)) { put(m); toast("This account is bound to another phone."); return; }
      if (ON) {
        if ((m.tok || 0) < TOK.playCost) { put(m); drawJoin(); drawOwn(); refreshMenu(); tokSheet(); return; }
        tokAdd(m, -TOK.playCost, "🎮 Played " + (C.game || "the game"), "spent");
      }
      m.plays = (m.plays || 0) + 1; put(m); drawJoin(); drawOwn(); refreshMenu();
      if (ON) toast("−" + TOK.playCost + " tokens · " + m.tok + " left");
      go();
    });
  }
  var tokCss = document.createElement("style");
  tokCss.textContent = ".tok-ov .crm-card{max-width:420px}.tok-bal{display:flex;align-items:center;justify-content:space-between;gap:10px;background:#070B1E;border:1px solid #25336A;border-radius:14px;padding:10px 14px;margin:8px 0}" +
    ".tok-bal b{font:900 34px/1 system-ui;color:#FFD23F}.tok-bal small{color:#9AA6CC;font-size:12.5px}.tok-lock{color:#FF8F85;font-weight:800;font-size:13.5px}" +
    ".crm-card .tok-btns{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.crm-card .tok-btns button{border:1px solid #25336A;background:#1a2656;color:#EEF2FF;border-radius:12px;padding:11px 8px;font-size:13.5px;font-weight:800;cursor:pointer}" +
    ".crm-card .tok-btns button.hot{background:#FFD23F;border-color:#FFD23F;color:#070B1E}.crm-card .tok-btns button:disabled{opacity:.45;cursor:default}" +
    ".spin-w{position:relative;width:min(270px,72vw);aspect-ratio:1;margin:12px auto 6px}.spin-w .wh{position:absolute;inset:0;border-radius:50%;border:6px solid #FFD23F;box-shadow:0 10px 30px #0008,inset 0 0 0 2px #0004;transition:transform 4.2s cubic-bezier(.12,.75,.12,1)}" +
    ".spin-w .wh span{position:absolute;left:50%;top:50%;width:47%;transform-origin:0 50%;text-align:right;padding-right:8px;padding-left:30px;margin-top:-.6em;font:900 11px/1.2 system-ui;color:#1a0d00;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
    ".spin-w .wh span.dk{color:#fff}.spin-w .pin{position:absolute;left:50%;top:-10px;transform:translateX(-50%);width:0;height:0;border-left:13px solid transparent;border-right:13px solid transparent;border-top:24px solid #E8582A;filter:drop-shadow(0 3px 3px #0008);z-index:2}" +
    ".spin-w .hub{position:absolute;left:50%;top:50%;width:54px;height:54px;margin:-27px;border-radius:50%;background:radial-gradient(#fff3c4,#FFD23F);border:3px solid #fff;display:grid;place-items:center;font-size:24px;z-index:2}" +
    ".spin-r{text-align:center;min-height:24px;font-weight:800;margin:6px 0}.spin-odds{font-size:12px;color:#9AA6CC;margin-top:8px}.spin-odds summary{cursor:pointer;font-weight:800;color:#C9D2EE}.spin-odds li{display:flex;justify-content:space-between;gap:8px;padding:2px 0}" +
    "@media (prefers-reduced-motion:reduce){.spin-w .wh{transition:none}}";
  document.head.appendChild(tokCss);
  function sheet(cls, html) {
    var ov = document.createElement("div"); ov.className = "crm-gate " + cls; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("data-scroll-ok", "");
    ov.innerHTML = '<section class="crm-card">' + html + '</section>';
    var html_ = document.documentElement, prev = html_.style.overflow;
    function key(ev) { if (ev.key === "Escape") close(); }
    function close() { if (!ov.parentNode) return; ov.remove(); html_.style.overflow = prev; document.removeEventListener("keydown", key); refreshMenu(); }
    ov.close = close; ov.addEventListener("click", function (ev) { if (ev.target === ov || (ev.target.closest && ev.target.closest("[data-t=x]"))) close(); });
    document.body.appendChild(ov); html_.style.overflow = "hidden"; document.addEventListener("keydown", key);
    return ov;
  }
  function rulesUrl() { return (SPIN && SPIN.rules) || (TC && TC.rules) || "rules.html"; }
  // Privacy policy for the guest apps. CCPA/CPRA wants it reachable AT collection, and the fine print below
  // makes a promise about the data, so the promise has to be readable. Shown in demo mode too: the policy
  // covers what the restaurant's own sheet stores either way. Override per app with CRM_CFG.privacy.
  function privacyUrl() { return C.privacy || "/legal/app-privacy.html"; }
  // "How to get tokens" sheet (Phase 2): balance, every free way, code box
  function tokSheet() {
    if (!ON || document.querySelector(".tok-ov")) return;
    var m = mine()[0]; if (m && weekly(m)) put(m);
    var bal = m ? m.tok || 0 : 0, cost = TOK.playCost, freeUsed = m && m.freeDay === laDay();
    var ov = sheet("tok-ov", '<span class="k">' + e(NAME) + ' · ' + e(C.game || "Game") + ' tokens</span><h3>🪙 Tokens to play</h3>' +
      '<div class="tok-bal"><div><b>' + bal + '</b> <small>tokens</small></div><div style="text-align:right"><small>One play costs</small><br><b style="font-size:22px">' + cost + '</b></div></div>' +
      (bal < cost ? '<div class="tok-lock">🔒 You need ' + (cost - bal) + ' more token' + (cost - bal === 1 ? '' : 's') + ' to play.</div>' : '<div style="color:#3DDC97;font-weight:800">✅ You have enough to play.</div>') +
      '<ul class="crm-rules" style="margin-top:10px">' +
      '<li><span>🎁 Every week, free (auto-added on your first visit each week)</span><b>+' + TOK.weeklyFree + '</b></li>' +
      '<li><span>🙋 Free tokens on request, once a day. No purchase necessary</span><b>+' + TOK.freeDaily + '</b></li>' +
      '<li><span>🧾 Comes with food you buy: ' + (TOK.perDollar ? TOK.perDollar + ' per $1' : '') + (TOK.perOrder ? (TOK.perDollar ? ' + ' : '') + TOK.perOrder + ' per order' : '') + ' (staff ring-up, receipt or staff code, app order)' + (TOK.noAlc ? '. Food and non-alcoholic drinks only, never alcohol' : '') + '</span><b>🧾</b></li>' +
      (SPIN ? '<li><span>🎡 Daily spin: always free, can win tokens</span><b>Free</b></li>' : '') + '</ul>' +
      '<div class="tok-btns"><button type="button" class="hot" data-t="free"' + (!m || freeUsed ? ' disabled' : '') + '>' + (freeUsed ? '🙋 Free tokens used today' : '🙋 Get ' + TOK.freeDaily + ' free tokens') + '</button>' +
      (SPIN ? '<button type="button" data-t="spin">🎡 Daily spin</button>' : '<button type="button" data-t="x">Close</button>') + '</div>' +
      '<div class="crm-rcode" style="margin-top:10px"><input data-t="code" placeholder="Token code (TOK-…)" maxlength="12" autocapitalize="characters"><button type="button" data-t="redeem">Add</button></div><div class="err" data-t="msg"></div>' +
      (m ? '' : '<button type="button" class="go" data-t="join">Create my free account</button>') +
      '<button type="button" class="crm-gx" data-t="x">Close</button>' +
      '<p class="crm-fine">Tokens have no cash value, are never sold on their own, and only work in the account bound to this phone. No purchase necessary: the free weekly tokens and the free daily request always cover a play. <a href="' + e(rulesUrl()) + '" target="_blank" rel="noopener" style="color:#7FB3FF">Official rules</a></p>');
    ov.addEventListener("click", function (ev) {
      var b = ev.target.closest && ev.target.closest("[data-t]"); if (!b) return; var a = b.getAttribute("data-t"), mm = mine()[0], msg = ov.querySelector("[data-t=msg]");
      if (a === "free") { if (mm && freeReq(mm)) { put(mm); drawJoin(); drawOwn(); toast("+" + TOK.freeDaily + " free tokens"); ov.close(); tokSheet(); } return; }
      if (a === "spin") { ov.close(); openSpin(); return; }
      if (a === "join") { ov.close(); gate("play", function () { tokSheet(); }); return; }
      if (a === "redeem") {
        if (!mm) { msg.textContent = "Create your free account first."; return; }
        var r = redeemCode(mm, ov.querySelector("[data-t=code]").value);
        if (r.err) { msg.style.color = "#FF6B5E"; msg.textContent = r.err; return; }
        drawJoin(); drawOwn(); toast("+" + r.n + " tokens added"); ov.close(); tokSheet(); return;
      }
    });
  }
  // ---- FREE DAILY SPIN: one per member per day (LA date). Never costs tokens, never needs a purchase, never for sale. ----
  function spinReady(m) { return !!(SPIN && m && m.spinDay !== laDay() && !prizeUsedToday(m)); }
  function darkHex(c) { var h = String(c).replace("#", ""); if (h.length === 3) h = h.replace(/./g, "$&$&"); var n = parseInt(h, 16); if (!(n >= 0)) return false; return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 < 140; }
  function pickSpin(P) { var tot = P.reduce(function (a, p) { return a + (p.w || 1); }, 0), r = Math.random() * tot; for (var i = 0; i < P.length; i++) { r -= P[i].w || 1; if (r < 0) return i; } return P.length - 1; }
  function openSpin() {
    if (!SPIN || document.querySelector(".spin-ov")) return;
    return gate("spin", function () {
      var m = mine()[0]; bind(m); weekly(m); put(m);
      var P = spinPrizes(), N = P.length, seg = 360 / N, tot = P.reduce(function (a, p) { return a + (p.w || 1); }, 0), COL = SPIN.colors || ["#FFD23F", "#3B1F5C", "#F2C14E", "#1E1B3A", "#FFE9A3", "#B8322A"];   // CRM_CFG.spin.colors / .hub = the restaurant's own wheel
      var grad = P.map(function (p, i) { return COL[i % COL.length] + " " + (i * seg) + "deg " + ((i + 1) * seg) + "deg"; }).join(",");
      var ready = spinReady(m);
      var ov = sheet("spin-ov", '<span class="k">' + e(NAME) + ' · free daily spin</span><h3>🎡 Spin the wheel</h3><p style="margin:0">One free spin per member per day. Every slice wins something.</p>' +
        '<div class="spin-w"><div class="pin"></div><div class="wh" style="background:conic-gradient(' + grad + ')">' + P.map(function (p, i) {
          var c = COL[i % COL.length], dk = darkHex(c);
          return '<span class="' + (dk ? 'dk' : '') + '" style="transform:rotate(' + ((i + 0.5) * seg - 90) + 'deg)">' + e(p.t) + '</span>'; }).join("") + '</div><div class="hub">' + e(SPIN.hub || "🧇") + '</div></div>' +
        '<div class="spin-r" aria-live="polite">' + (ready ? '' : 'One prize per day: today\'s is used. Come back tomorrow for another free spin!') + '</div>' +
        '<button type="button" class="go" data-t="go"' + (ready ? '' : ' disabled style="opacity:.5"') + '>' + (ready ? '🎡 Spin (free)' : 'Next free spin tomorrow') + '</button>' +
        '<button type="button" class="crm-gx" data-t="x">Close</button>' +
        '<details class="spin-odds"><summary>Odds & prizes</summary><ul style="list-style:none;padding:0;margin:6px 0 0">' + P.map(function (p) { return '<li><span>' + e(p.t) + '</span><b>' + Math.round((p.w || 1) / tot * 1000) / 10 + '%</b></li>'; }).join("") + '</ul></details>' +
        '<p class="crm-fine"><b>No purchase necessary.</b> Free: one spin per member per day; spins are never sold and never cost tokens. Prizes are food discounts, points' + (ON ? ' or tokens' : '') + '; no cash value, no alcohol. Discount codes are good for 3 days. <a href="' + e(rulesUrl()) + '" target="_blank" rel="noopener" style="color:#7FB3FF">Official rules</a></p>');
      var wh = ov.querySelector(".wh"), res = ov.querySelector(".spin-r"), btn = ov.querySelector("[data-t=go]");
      btn.onclick = function () {
        var mm = mine()[0]; if (!spinReady(mm) || btn.disabled) return; btn.disabled = true; btn.style.opacity = ".5";
        var i = pickSpin(P), p = P[i]; mm.spinDay = laDay(); mm.pday = pdKey(); mm.spins = (mm.spins || 0) + 1;
        // award first, then animate: closing the sheet mid-spin can't lose (or re-roll) the prize
        var line = "🎡 Daily spin: " + p.t, code = "";
        if (p.pts) { addPts(mm, p.pts, line); tag(mm, "spin_bonus"); }
        else if (p.tok && ON) tokAdd(mm, p.tok, line, "bonus");
        else if (p.code) { code = "SPIN-" + code4(4); var w = { t: p.t, c: code, ts: Date.now(), k: "spin" }; w.until = until(w); (mm.wins = mm.wins || []).unshift(w); mm.wins = mm.wins.slice(0, 5); mm.ledger.unshift({ ts: w.ts, pts: 0, t: line }); }
        put(mm);
        var rot = 360 * 6 - (i + 0.5) * seg + (Math.random() - 0.5) * seg * 0.6;
        wh.style.transform = "rotate(" + rot + "deg)";
        setTimeout(function () {
          res.innerHTML = '🎉 You won <b>' + e(p.t) + '</b>!' + (code ? '<div class="crm-win" style="margin-top:8px"><div class="code">' + code + '</div><small>Show this at ' + e(NAME) + '. Good for 3 days.</small></div>' : '') + '<div style="font-weight:600;font-size:13px;color:#9AA6CC;margin-top:4px">Next free spin tomorrow.</div>';
          btn.textContent = "Next free spin tomorrow"; drawJoin(); drawOwn(); refreshMenu();
          try { navigator.vibrate && navigator.vibrate([30, 40, 60]); } catch (x) {}
        }, matchMedia("(prefers-reduced-motion: reduce)").matches ? 50 : 4300);
      };
    });
  }
  // ---- parent / guardian helpers (Kid mode) ----
  function isParent(m) { return !!m && hasBoth(m) && !!m.guardian; }
  // Light parent check: the last 4 digits of the parent's phone, asked when leaving Kid mode, when switching Adult → Kid
  // and when signing out, so a kid can't change modes or the account alone. LIVE: a text code to the parent's phone
  // (server-verified) replaces this; the last-4 check only keeps honest kids honest.
  var pcFails = 0, pcLockUntil = 0;
  function parentCheck(why, cb, cancel) {
    var m = mine()[0]; if (!m || !okPhone(m.phone)) { cb(); return; }
    if (document.querySelector(".pc-ov")) return;
    var last4 = String(m.phone).replace(/\D/g, "").slice(-4);
    var ov = sheet("pc-ov", '<span class="k">Parent check</span><h3>🔒 ' + e(why) + '</h3><p>Grown-ups only: enter the <b>last 4 digits</b> of the parent\'s phone number.</p>' +
      '<input data-t="pin" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" aria-label="Last 4 digits of the parent\'s phone" style="font:900 28px ui-monospace,Menlo,monospace;letter-spacing:.4em;text-align:center">' +
      '<button type="button" class="go" data-t="ok">Confirm</button><div class="err" data-t="msg" role="alert"></div><button type="button" class="crm-gx" data-t="no">Cancel</button>' +
      '<p class="crm-fine">Live, the parent gets a text code instead.</p>');
    var inp = ov.querySelector("[data-t=pin]"), msg = ov.querySelector("[data-t=msg]");
    setTimeout(function () { try { inp.focus(); } catch (x) {} }, 60);
    ov.addEventListener("click", function (ev) {
      var b = ev.target.closest && ev.target.closest("[data-t]"); if (!b) return; var a = b.getAttribute("data-t");
      if (a === "no" || a === "x") { ov.close(); if (cancel) cancel(); return; }
      if (a !== "ok") return;
      if (Date.now() < pcLockUntil) { msg.textContent = "Too many tries. Wait a minute."; return; }
      if (inp.value.trim() === last4) { pcFails = 0; ov.close(); cb(); return; }
      if (++pcFails >= 5) { pcFails = 0; pcLockUntil = Date.now() + 60000; }
      msg.textContent = "That doesn't match the parent's phone."; inp.value = "";
    });
  }
  function signOut() {
    parentCheck("Sign out of this phone", function () {
      save([]); try { localStorage.removeItem(PEND); localStorage.removeItem("gnw-mode"); } catch (x) {}
      try { if (window.__OG && window.__OG.resetMode) window.__OG.resetMode(); } catch (x) {}
      drawJoin(); drawOwn(); refreshMenu(); toast("Signed out of this phone");
    });
  }
  function kidUnlock(cb, fromAdult) {
    var m = mine()[0];
    if (isParent(m)) { if (fromAdult) parentCheck("Switch to Kid mode", cb); else cb(); return; }
    gate("kidunlock", function () { var mm = mine()[0]; if (mm) { mm.guardian = mm.guardian || Date.now(); bind(mm); put(mm); } drawJoin(); refreshMenu(); cb(); });
  }
  function tokOf(r, i) {   // sample customers get made-up token history; real members their own counters
    if (!r.sample) { var c = r.tc || {}; return { tok: r.tok || 0, purchase: c.purchase || 0, weekly: c.weekly || 0, free: c.free || 0, bonus: c.bonus || 0, spent: c.spent || 0, plays: r.plays || 0, spins: r.spins || 0 }; }
    var wk = 10 * Math.max(1, Math.min(8, Math.ceil((now - r.joined) / (7 * DAY)))), pu = r.visits * 18, fr = (i % 3) * 10, bo = (i % 4) * 5, all_ = wk + pu + fr + bo, tok = all_ % 10 + (i % 2) * 10;
    if (tok > all_) tok = all_ % 10;
    return { tok: tok, purchase: pu, weekly: wk, free: fr, bonus: bo, spent: all_ - tok, plays: (all_ - tok) / 10, spins: r.visits * 2 + (i % 5) };
  }
  window.SSAI_TOKENS = TC || SPIN ? {
    on: ON, cfg: TOK, spin: !!SPIN, account: !!TC, rules: rulesUrl,
    member: function () { var m = mine()[0]; if (m && weekly(m)) put(m); return m || null; },
    balance: function () { var m = this.member(); return m ? m.tok || 0 : 0; },
    canPlay: function () { var m = this.member(); return !!m && hasBoth(m) && (!ON || (m.tok || 0) >= TOK.playCost); },
    spinReady: function () { return spinReady(mine()[0]) || (!!SPIN && !mine()[0]); },
    // ms until the next free spin (midnight, Los Angeles time)
    nextSpinMs: function () { var t = new Date().toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles", hour12: false }).split(":"); return Math.max(60000, (86400 - ((+t[0] % 24) * 3600 + +t[1] * 60 + +t[2])) * 1000); },
    // PLAY FIRST (2026-10-14, Antidote): guests start right away, no sign-up sheet before the game. They save their score and any
    // prize after the run (demo/claimscore.js -> SSAI_GATE, same fields, consent and destination). Still gated: Kid mode (a signed-in
    // parent/guardian account, 18+) and Phase 2 tokens (a play costs tokens, which live on an account).
    play: function (go, opt) { if (!TC) { go(); return; } var kid = !!(opt && opt.kid); if (kid || ON) { playGate(go, kid); return; } guestPlay(go); },
    isParent: function () { return isParent(mine()[0]); }, kidUnlock: kidUnlock, parentCheck: parentCheck, signOut: signOut,
    kidBest: function (score) { var m = mine()[0]; if (!isParent(m)) return 0; if (score > (m.kidBest || 0)) { m.kidBest = Math.round(score); (m.ledger = m.ledger || []).unshift({ ts: Date.now(), pts: 0, t: "🧒 New kid best in " + (C.game || "the game") + ": " + m.kidBest.toLocaleString() }); put(m); drawJoin(); } return m.kidBest || 0; },
    openSpin: openSpin, openTokens: function () { if (ON) tokSheet(); }, issueCode: function (a) { return ON ? issueCode(a) : null; },
    redeem: function (c) { var m = mine()[0]; var r = m ? redeemCode(m, c) : { err: "no member" }; if (!r.err) { drawJoin(); drawOwn(); refreshMenu(); } return r; },
    // start-menu pieces (gamemenu.js): status line, play label, panel rows
    playLabel: function () { return ON ? "PLAY · " + TOK.playCost + " 🪙" : "PLAY"; },
    locked: function () { var m = mine()[0]; return ON && !!m && (m.tok || 0) < TOK.playCost; },
    statusHTML: function (kid) {
      var m = this.member();
      if (kid) return isParent(m) ? "🧒 Kid mode · playing on " + e(String(m.name || "").split(" ")[0]) + "'s account" + (ON ? " · 🪙 " + (m.tok || 0) : "") : "🔒 Kid mode needs a parent or guardian signed in";
      if (!ON) return m && hasBoth(m) ? "✅ Free to play · your scores save to your account" : "🎮 Free to play · no sign-up · save your score after";
      if (!m) return "🪙 Free account → " + TOK.weeklyFree + " free tokens every week";
      var b = m.tok || 0; return "🪙 <b>" + b + "</b> token" + (b === 1 ? "" : "s") + (b < TOK.playCost ? " · 🔒 need " + TOK.playCost + " to play" : " · a play costs " + TOK.playCost);
    },
    menuHTML: function (row, p) {
      var h = "", G = function (t) { return '<p class="gm-g">' + e(t) + "</p>"; };
      if (p === "points") {
        if (ON) h += G("Tokens") + row({ icon: "🎮", name: "One play", note: "Tokens come with food you buy, and there's always a free way", pts: TOK.playCost + " 🪙", gold: true }) +
          row({ icon: "🎁", name: "Weekly free tokens", note: "Every member, every week, added automatically", pts: "+" + TOK.weeklyFree }) +
          row({ icon: "🙋", name: "Free tokens on request", note: "Once a day, no purchase necessary", pts: "+" + TOK.freeDaily }) +
          row({ icon: "🧾", name: "Buy food", note: (TOK.perDollar ? TOK.perDollar + " token per $1" : "") + (TOK.perOrder ? " + " + TOK.perOrder + " per order" : "") + ": staff ring-up, receipt / staff code or app order" + (TOK.noAlc ? ". Never on alcohol" : ""), pts: "+" + (TOK.perDollar || TOK.perOrder) + (TOK.perDollar ? "/$1" : "") });
        else if (TC) h += G("Free to play") + row({ icon: "🎮", name: (C.game || "The game") + " is free to play", note: "No sign-up to play. After a run, save your score and prizes to a free account (phone + email, tied to this phone)", pts: "Free", gold: true });
        if (SPIN) h += G("Daily spin") + row({ icon: "🎡", name: "Free daily spin", note: "One per member per day. Wins " + (ON ? "tokens, " : "") + "points or food discounts. No purchase necessary", pts: "Free", gold: true });
      } else if (p === "how") {
        if (TC) h += G(ON ? "Tokens" : "Who can play") + (ON ? row({ icon: "🪙", name: "Each play costs " + TOK.playCost + " tokens", note: "+" + TOK.weeklyFree + " free every week, +" + TOK.freeDaily + " free on request once a day, and more with food you buy" }) :
          row({ icon: "🎮", name: "Free to play, no sign-up", note: "Tap PLAY and go. To keep a score or prize, make a free account with your phone + email after the run. It stays bound to this phone" }));
        if (SPIN) h += row({ icon: "🎡", name: "Free daily spin", note: "Tap 🎡 on the start screen once a day. Always free" });
      }
      return h;
    },
    // test hooks
    simWeek: function () { var m = mine()[0]; if (!m) return 0; m.tweek = "old"; var n = weekly(m); put(m); drawJoin(); drawOwn(); refreshMenu(); return n; },
    simDay: function () { var m = mine()[0]; if (!m) return; delete m.spinDay; delete m.freeDay; put(m); drawJoin(); refreshMenu(); }
  } : null;

  // ---- owner: earn activity (bonus counts per kind; sample customers get made-up counts) ----
  var EK = [["checkin_bonus", "📲 QR check-ins"], ["first_order_bonus", "🥇 First-order bonuses"], ["review_bonus", "⭐ In-app feedback"], ["ig_bonus", "📸 Instagram follows"],
    ["birthday_bonus", "🎂 Birthday bonuses"], ["referral_join", "🤝 Friends referred"], ["referral_order", "🔁 Orders from referred friends"]];
  if (SIMPLE) EK = [["join_bonus", "👋 Join bonuses"], ["birthday_bonus", "🎂 Birthday bonuses"], ["referral_order", "🤝 Referred friends who visited"], ["game_bonus", "🎮 Game points (capped " + SIMPLE.game.dailyCap + "/day)"]];
  function earnCounts(r, i) {
    if (!r.sample) return r.ec || {};
    return { checkin_bonus: r.visits, first_order_bonus: 1, review_bonus: i % 3 === 2 ? 0 : 1, ig_bonus: i % 2, birthday_bonus: r.bday === mo && i % 2 ? 1 : 0, referral_join: r.nfr || 0, referral_order: r.nfo || 0 };
  }
  function earnBox(rows) {
    var tot = {}, pts = { checkin_bonus: EARN.checkin, first_order_bonus: EARN.firstOrder, review_bonus: EARN.review.pts, ig_bonus: EARN.instagram.pts, birthday_bonus: EARN.birthday, referral_join: REF.join, referral_order: SIMPLE ? REF.first : REF.every, join_bonus: SIMPLE ? SIMPLE.join : 0 };
    rows.forEach(function (r, i) { var c = earnCounts(r, i); for (var k in c) tot[k] = (tot[k] || 0) + c[k]; });
    var fbs = rows.filter(function (r) { return r.fb; });
    return '<div class="crm-box crm-lead"><h4>✨ Ways-to-earn activity</h4><p style="margin:0;font-size:13px">What your bonus points are buying you. Each one is in the customer\'s ledger and the CSV export.</p>' +
      EK.filter(function (k) { return k[0] !== "ig_bonus" || EARN.instagram.url; }).map(function (k) { return '<div><span class="r">' + (tot[k[0]] || 0) + '</span><span>' + k[1] + '</span><b style="color:#3DDC97">' + (pts[k[0]] ? '+' + pts[k[0]] + ' each' : '') + '</b></div>'; }).join("") +
      fbs.map(function (r) { return '<div><span class="r">' + r.fb.s + '★</span><span><b>' + e(r.name) + '</b> · in-app feedback<br><span style="color:#9AA6CC">' + e(r.fb.t || "(no comment)") + '</span></span><b style="color:#3DDC97">+' + EARN.review.pts + '</b></div>'; }).join("") +
      '<p class="crm-fine" style="margin:8px 0 0">Feedback points never depend on the rating, and no points are offered for Google or Yelp reviews (both platforms ban it).' + (WAL ? ' Bonus points go to ' + wname(BONUS) + ' points; a referred friend\'s orders pay into the side they bought from.' : '') + '</p></div>';
  }

  // ---- "How to earn" sheet ----
  // Opens by itself once: the first time a guest has the rewards card on screen after scrolling or tapping (never on page
  // load), and once more right after they join (the member version, with working buttons). "Ways to earn" reopens it.
  var EFLAG = KEY + "_earn_seen", earnEl = null;
  function earnSeen() { try { return localStorage.getItem(EFLAG) || ""; } catch (x) { return "m"; } }
  function earnMark(v) { try { localStorage.setItem(EFLAG, v); } catch (x) {} }
  function inviteMsg(m) { if (SIMPLE) return "Join " + NAME + " Rewards with my code " + m.ref + ": " + SIMPLE.join + " welcome points + " + PER + " pts per $1 🎁 " + shareLink(m); return "Join " + NAME + " Rewards with my code " + m.ref + ": you get " + REF.friendGift + " with your first order + " + REF.friend + " points 🎁 " + shareLink(m); }
  function copyRef(m) { var L = shareLink(m); (navigator.clipboard ? navigator.clipboard.writeText(L) : Promise.reject()).then(function () { toast("Referral link copied"); }, function () { prompt("Copy your referral link:", L); }); }
  function openEarn() {
    if (earnEl || document.querySelector(".crm-gate,.crm-draw")) return false;
    var m = mine()[0], T0 = TIERS[0], R = EARN.review, IG = EARN.instagram, app = (R.platform || "app") === "app", ed = m ? onceMap(m) : {}, yr = new Date().getFullYear();
    earnMark(m ? "m" : "g");
    function B(a, label, hot) { return '<button type="button" data-e="' + a + '"' + (hot ? ' class="hot"' : '') + '>' + label + '</button>'; }
    function row(ic, t, p, sub, btn, done) { return '<div class="crm-er' + (done ? ' done' : '') + '"><span class="ic">' + ic + '</span><span class="tx"><b>' + t + '</b><small>' + sub + '</small></span><span class="pp">' + (done ? '✓ Earned' : p) + '</span>' + (btn && !done ? '<span class="bt">' + btn + '</span>' : '') + '</div>'; }
    var gp = SIMPLE && SIMPLE.game, rows = SIMPLE ?
      (INTERIM ? row("🧾", "Add my visit", PER + "/$1", PER + " points for every $1 (before tip). After you pay, tap Add my visit and snap your receipt or type the check number.", m ? B("visit", "🧾 Add my visit", 1) : "")
        : row("🧾", "Eligible purchases", PER + "/$1", PER + " points for every $1 on eligible purchases. Show your code when staff ring you up.", m ? B("qr", "📲 Show my code", 1) : "")) +
      row("👋", "Join", "+" + SIMPLE.join, "Once, when you join. Free.", "", !!m) +
      row("🎂", "Your birthday", "+" + EARN.birthday, "Once a year, on your birthday.", m && !(m.bday >= 0) ? B("bday", "🎂 Add my birthday") : "", ed["birthday_" + yr]) +
      row("🤝", "Refer a friend", "+" + REF.first, "Per friend who joins with your code and makes their first visit.", m ? B("ref", "📋 Copy my referral link") : "") +
      (C.game ? row("🎮", "Play " + e(C.game), "≤" + gp.dailyCap + "/day", "1 point per " + gp.perScore.toLocaleString() + " score, up to " + gp.dailyCap + " points a day. You can play before you join; join to save them.", "") : "") +
      '<div class="crm-egoal" style="margin-top:10px"><span><b>Rewards</b></span><b></b></div>' + TIERS.map(function (t) { return '<div class="crm-egoal"><span>' + e(t[1]) + '</span><b>' + t[0].toLocaleString() + ' pts</b></div>'; }).join("")
      : row("📲", "Show your QR every visit", "+" + EARN.checkin, "+" + EARN.checkin + " once a day when staff scan your code, plus " + (WAL ? W.bar.per + " bar pts per $1 on drinks and " + W.food.per + " kitchen pts per $1 on food." : PER + " pts for every $1 you spend."), m ? B("qr", "📲 Show my QR", 1) : "") +
      (EARN.firstOrder ? row("🥇", "Your first order", "+" + EARN.firstOrder, "One-time bonus on top of your order points.", "", ed.first_order) : "") +
      (R.pts ? row("⭐", app ? "Tell us how we did" : "Leave a review", "+" + R.pts, app ? "Honest feedback in the app. Any star rating counts the same: your rating never changes your points. Once per member." : "Once per member, honor system. Your rating never changes your points.", m ? B("review", app ? "⭐ Leave feedback" : "⭐ Leave a review") : "", ed.review) : "") +
      row("🤝", "Refer a friend", "+" + REF.join, "Per friend who joins. They get " + e(REF.friendGift) + " with their first order + " + REF.friend + " pts. You get +" + REF.first + " on their first order, then +" + REF.every + " every time they order.", m ? B("ref", "📋 Copy my referral link") : "") +
      (IG.pts && IG.url ? row("📸", "Follow us on Instagram", "+" + IG.pts, "Once, honor system.", m ? B("ig", "📸 Follow") : "", ed.ig) : "") +
      (EARN.birthday ? row("🎂", "Your birthday", "+" + EARN.birthday, "Bonus points on your birthday, plus your birthday treat (bring a photo ID with the date).",m && !(m.bday >= 0) ? B("bday", "🎂 Add my birthday") : "", ed["birthday_" + yr]) : "") +
      (C.draw ? row("🎟️", "Daily lucky draw", "Free food", "Open the app once a day for a scratch ticket.", "") : "");
    var ov = document.createElement("div"); ov.className = "crm-gate crm-earn"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-label", "How to earn points"); ov.setAttribute("data-scroll-ok", "");
    ov.innerHTML = '<section class="crm-card"><span class="k">' + e(NAME) + ' Rewards</span><h3>How to earn points</h3>' +
      (WAL ? WK.map(function (k) { var t = W[k].tiers[0]; return '<div class="crm-egoal"><span>' + wname(k) + ': ' + e(t[1]) + '</span><b>' + t[0].toLocaleString() + ' pts</b></div>'; }).join("") +
        '<p style="margin:0 0 6px">' + (m ? 'You have <b style="color:#FFD23F">' + (walOf(m).bar || 0).toLocaleString() + ' ' + wname("bar") + '</b> and <b style="color:#FFD23F">' + (walOf(m).food || 0).toLocaleString() + ' ' + wname("food") + '</b> pts. ' : '') +
        'Bar points come from drinks, kitchen points from food, and they never mix. <b>Every bonus below goes to your ' + wname(BONUS) + ' points</b> (a friend\'s orders pay into the side they bought from).</p>' :
      '<div class="crm-egoal"><span>' + e(T0[1]) + '</span><b>' + T0[0].toLocaleString() + ' pts</b></div>' +
      '<p style="margin:0 0 6px">' + (m ? 'You have <b style="color:#FFD23F">' + (m.stars || 0).toLocaleString() + ' pts</b>. ' : '') + 'Here\'s every way to get there:</p>') + rows +
      (INTERIM && window.SSAI_INTERIM ? SSAI_INTERIM.explainerHTML() : '') +
      '<div class="crm-fbk"></div>' +
      (m ? '<button type="button" class="go" data-e="x">Got it</button>' : '<button type="button" class="go" data-e="join">🎁 Join free to start earning</button><button type="button" class="crm-gx" data-e="x">Not now</button>') +
      '<p class="crm-fine">' + (SIMPLE ? 'One points balance. Rewards: one per visit, no stacking. ' : '') + 'Sample numbers: ' + e(NAME) + ' sets the real ones.' + (m ? ' Reopen this anytime from "Ways to earn" in your rewards card.' : '') + '</p></section>';
    var html = document.documentElement, prevOv = html.style.overflow, fb = ov.querySelector(".crm-fbk");
    function key(ev) { if (ev.key === "Escape") close(); }
    function close() { if (!ov.parentNode) return; ov.remove(); earnEl = null; html.style.overflow = prevOv; document.removeEventListener("keydown", key); }
    function done(t) { m = mine()[0]; drawJoin(); drawOwn(); toast(t); }
    ov.addEventListener("click", function (ev) {
      if (ev.target === ov) return close();
      var b = ev.target.closest("[data-e],[data-s]"); if (!b) return;
      var a = b.getAttribute("data-e"); m = mine()[0];
      if (b.hasAttribute("data-s")) { fb.querySelectorAll("[data-s]").forEach(function (x) { x.classList.toggle("on", +x.getAttribute("data-s") <= +b.getAttribute("data-s")); }); fb.setAttribute("data-v", b.getAttribute("data-s")); return; }
      if (a === "x") return close();
      if (a === "join") { close(); var f = join.querySelector("form"); join.scrollIntoView({ behavior: "smooth", block: "start" }); if (f) setTimeout(function () { try { f.elements.name.focus({ preventScroll: true }); } catch (x) {} }, 500); return; }
      if (!m) return;
      if (a === "visit") { close(); if (window.SSAI_INTERIM) SSAI_INTERIM.claim(); return; }
      if (a === "qr") { close(); drawJoin(true); var q = join.querySelector(".crm-qr"); if (q) q.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
      if (a === "ref") return copyRef(m);
      if (a === "ig") { try { window.open(IG.url, "_blank", "noopener"); } catch (x) {} if (earnOnce(m, "ig", IG.pts, "📸 Followed on Instagram")) { put(m); done("+" + IG.pts + " points · thanks for the follow!"); b.closest(".crm-er").className = "crm-er done"; b.parentNode.remove(); } return; }
      if (a === "bday") {
        fb.innerHTML = '<h4>🎂 Your birthday</h4><div class="two"><select data-b="m" aria-label="Birth month"><option value="">Month</option>' + MONTHS_L.map(function (x, i) { return '<option value="' + i + '">' + x + '</option>'; }).join("") + '</select>' +
          '<select data-b="d" aria-label="Birth day"><option value="">Day</option>' + Array.apply(null, Array(31)).map(function (x, i) { return '<option>' + (i + 1) + '</option>'; }).join("") + '</select></div>' +
          '<div class="crm-idnote">🪪 Bring a photo ID that matches this date to claim your treat.</div><button type="button" class="go" data-e="bsave">Save birthday</button><div class="err"></div>';
        fb.scrollIntoView({ behavior: "smooth", block: "nearest" }); return;
      }
      if (a === "bsave") {
        var bm = fb.querySelector("[data-b=m]").value, bd = +fb.querySelector("[data-b=d]").value;
        if (bm === "" || !bd || new Date(2000, +bm, bd).getMonth() !== +bm) { fb.querySelector(".err").textContent = "Pick a real month and day."; return; }
        m.bday = +bm; m.bdd = bd; put(m); fb.innerHTML = '<p style="color:#3DDC97;margin:0">🎂 Saved: ' + e(bdayStr(m)) + '. Your bonus lands on the day.</p>'; done("🎂 Birthday saved"); return;
      }
      if (a === "review") {
        if (!app) {
          // owner chose platform "google"/"yelp": points for the act of reviewing, never for the rating. See the EARN comment:
          // Google and Yelp both prohibit incentivized reviews, so this can get the listing's reviews removed.
          try { window.open(reviewUrl(), "_blank", "noopener"); } catch (x) {}
          fb.innerHTML = '<p style="margin:0 0 8px">Thanks! Say whatever you honestly think. When you\'re done, tap below.</p><button type="button" class="go" data-e="rdone">I left my review</button>'; return;
        }
        fb.innerHTML = '<h4>⭐ How was ' + e(NAME) + '?</h4><div class="crm-stars">' + [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" data-s="' + n + '" aria-label="' + n + ' star' + (n > 1 ? 's' : '') + '">★</button>'; }).join("") + '</div>' +
          '<textarea maxlength="500" placeholder="What did you have? What should we fix or keep? (optional)"></textarea>' +
          '<div class="crm-idnote">Any rating earns the same +' + R.pts + ' pts. We read every one.</div><button type="button" class="go" data-e="rsend">Send feedback</button><div class="err"></div>';
        fb.scrollIntoView({ behavior: "smooth", block: "nearest" }); return;
      }
      if (a === "rsend" || a === "rdone") {
        var sv = +fb.getAttribute("data-v") || 0;
        if (a === "rsend" && !sv) { fb.querySelector(".err").textContent = "Tap a star rating (any rating earns the same points)."; return; }
        // points are granted BEFORE and REGARDLESS of the rating value: never branch on sv here
        var got = earnOnce(m, "review", R.pts, app ? "⭐ Left feedback in the app" : "⭐ Left a review");
        if (a === "rsend") m.fb = { s: sv, t: fb.querySelector("textarea").value.trim().slice(0, 500), ts: Date.now() };
        put(m);
        // the public-review link is shown to everyone, with no points attached and no matter the rating (no review gating)
        fb.innerHTML = '<p style="color:#3DDC97;margin:0 0 6px;font-weight:800">Thank you! ' + (got ? '+' + got + ' points added.' : '') + '</p>' +
          (app ? '<p style="margin:0;font-size:13px">If you liked it, you can also share it on Google. Totally optional, and there are no points for it. <a href="' + e(reviewUrl()) + '" target="_blank" rel="noopener" style="color:#7FB3FF;font-weight:800">Open Google →</a></p>' : '');
        var er = ov.querySelector('[data-e="review"]'); if (er) { er.closest(".crm-er").className = "crm-er done"; er.parentNode.remove(); }
        done(got ? "+" + got + " points · thanks for the feedback!" : "Thanks for the feedback!"); return;
      }
    });
    document.body.appendChild(ov); html.style.overflow = "hidden"; earnEl = ov; document.addEventListener("keydown", key);
    return true;
  }
  window.SSAI_EARN_MENU = openEarn;
  // auto-open once when the rewards card is on screen after the guest has scrolled or tapped (never on page load)
  (function () {
    var inView = false, moved = false, t = 0;
    function tryAuto() {
      if (!inView || !moved || document.documentElement.classList.contains("ssai-fs")) return; var s = earnSeen(), m = mine()[0];   // not while a game is full screen (fullscreen.js)
      if (s === "m" || (s === "g" && !m)) return;
      clearTimeout(t); t = setTimeout(function () { if (inView && !document.documentElement.classList.contains("ssai-fs")) openEarn(); }, 900);
    }
    function mv() { moved = true; tryAuto(); }
    window.addEventListener("scroll", mv, { passive: true }); window.addEventListener("pointerdown", mv, { passive: true });
    if ("IntersectionObserver" in window) new IntersectionObserver(function (en) { inView = en[0].isIntersecting; tryAuto(); }, { threshold: 0.25 }).observe(join);
  })();

  // ---- owner: Holiday blast (needs demo/specials.js). See TEXTING / CONSENT at the top for the rules it follows. ----
  // Marketing texts need prior express written consent ("Text me deals"), honor STOP, and only go out 8 AM–9 PM local.
  // Part of the AI Text Assistant add-on ($75/mo; also in Voice + Text $150/mo). DEMO: "Queue for approval" only saves to this phone; nothing is sent.
  // LIVE: the queued blast goes to the owner for approval, then the SousShift text agent sends it through Twilio.
  var BQ = "ssai_blastq_" + SLUG;
  function blastQ() { try { return JSON.parse(localStorage.getItem(BQ) || "[]"); } catch (x) { return []; } }
  function segs(t) { var uni = /[^\x00-\x7F]/.test(t), n = Array.from(t).length; return uni ? (n <= 70 ? 1 : Math.ceil(n / 67)) : (n <= 160 ? 1 : Math.ceil(n / 153)); }
  function drawBlast() {
    var box = own.querySelector("#crm-blast"), SP = window.SSAI_SPECIALS; if (!box) return;
    if (!SP || !SP.list.length) { box.style.display = "none"; return; }
    box.style.display = "";
    var on = SP.active(), list = on.length ? on : SP.upcoming(1), rows = all(), ok = rows.filter(canText);
    var noConsent = rows.filter(function (r) { return !r.sms; }).length, stopped = rows.filter(function (r) { return r.stop; }).length;
    var q = blastQ();
    box.innerHTML = '<h4>🎉 Holiday blast</h4><p style="margin:0;font-size:13px">' + (on.length ? 'Text your members about what\'s on now.' : 'No holiday special is running today. Get the next one ready.') +
      ' Only members who tapped <b>📲 Text me deals</b> get it. You approve every send.</p>' +
      list.map(function (sp) {
        var T = SP.theme(sp), isOn = on.indexOf(sp) >= 0, hol = sp.holiday === "custom" ? "Special" : T.n;
        var msg = T.e + " " + hol + " at " + NAME + ": " + sp.title + (sp.price ? " (" + sp.price + ")" : "") + (sp.code ? ", code " + sp.code : "") + " — " + SP.link(sp) + ". Reply STOP to opt out";
        var dt = isOn ? SP.todayISO() : SP.nextStart(sp), queued = q.filter(function (x) { return x.id === sp.id; })[0];
        return '<div class="crm-bl" data-id="' + e(sp.id) + '"><div class="hd"><span class="em">' + T.e + '</span><span>' + e(hol + " · " + sp.title) + '</span>' +
          '<span class="crm-tag ' + (isOn ? 't-new">ON NOW' : 't-vip">STARTS ' + e(SP.fmt(sp.start).toUpperCase())) + '</span></div>' +
          '<textarea aria-label="Text message">' + e(msg) + '</textarea><div class="crm-bub"></div>' +
          '<div class="two" style="margin-top:8px"><input type="date" data-b="date" aria-label="Send date" value="' + dt + '"><input type="time" data-b="time" aria-label="Send time" value="11:00" min="08:00" max="21:00"></div>' +
          '<p class="aud" data-b="aud" data-n="' + ok.length + '">Goes to <b>' + ok.length + '</b> member' + (ok.length === 1 ? '' : 's') + ' who opted in to texts. Skipped: ' + noConsent + ' without text consent' + (stopped ? ', ' + stopped + ' who replied STOP' : '') + '.</p>' +
          '<p class="crm-fine" data-b="seg" style="margin:4px 0 0"></p>' +
          '<button type="button" class="go" data-a="queue">' + (queued ? '✅ Queued · update' : '📨 Queue for approval') + '</button><div class="err" data-b="err"></div>' +
          (queued ? '<div class="q">Queued for ' + e(queued.when) + ' to ' + queued.n + ' opted-in members. Waiting for your approval. (Demo: nothing is sent.)</div>' : '') + '</div>';
      }).join("") +
      '<p class="crm-fine" style="margin-bottom:0">Rules built in: texts only go to people who gave written consent (the "Text me deals" box), every text says who it\'s from and how to opt out, STOP replies are removed automatically, and nothing sends outside 8 AM–9 PM. Demo: nothing is ever sent. Live: approved blasts go out through your SousShift AI Text Assistant (add-on, $75/mo, also in Voice + Text).</p>';
    box.querySelectorAll(".crm-bl").forEach(function (el) {
      var ta = el.querySelector("textarea"), bub = el.querySelector(".crm-bub"), sg = el.querySelector('[data-b="seg"]'), err = el.querySelector('[data-b="err"]');
      function pv() { bub.textContent = ta.value; var n = segs(ta.value); sg.textContent = Array.from(ta.value).length + " characters · " + n + " text segment" + (n === 1 ? "" : "s") + " per person" + (/[^\x00-\x7F]/.test(ta.value) ? " (emoji count as 70 characters a segment)" : "") + "."; }
      ta.oninput = pv; pv();
      el.querySelector('[data-a="queue"]').onclick = function () {
        var t = ta.value.trim(), d = el.querySelector('[data-b="date"]').value, tm = el.querySelector('[data-b="time"]').value, hh = +tm.slice(0, 2), mm = +tm.slice(3, 5);
        err.style.color = "#FF6B5E";
        if (!/reply stop/i.test(t)) { err.textContent = "Keep \"Reply STOP to opt out\" in the text. It's required for marketing texts."; return; }
        if (t.toLowerCase().indexOf(NAME.toLowerCase()) < 0) { err.textContent = "Keep " + NAME + "'s name in the text so people know who it's from."; return; }
        if (!d || !tm) { err.textContent = "Pick a send date and time."; return; }
        if (hh < 8 || hh > 21 || (hh === 21 && mm > 0)) { err.textContent = "Quiet hours: marketing texts only go out 8 AM–9 PM (restaurant time). Pick a time in that window."; return; }
        if (!ok.length) { err.textContent = "Nobody has opted in to texts yet."; return; }
        var when = new Date(d + "T" + tm).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
        var list2 = blastQ().filter(function (x) { return x.id !== el.dataset.id; });
        list2.push({ id: el.dataset.id, msg: t, when: when, date: d, time: tm, n: ok.length, ts: Date.now(), status: "awaiting owner approval" });
        try { localStorage.setItem(BQ, JSON.stringify(list2)); } catch (x) {}
        drawBlast(); toast("📨 Queued for your approval · demo: nothing is sent");
      };
    });
  }
  document.addEventListener("ssai-specials", function () { drawBlast(); });

  // ======================= APP-ATTRIBUTED SALES (the proof behind the performance share) =======================
  // WHAT COUNTS. A sale is "app-attributed" only when the app brought it in or identified the buyer at checkout:
  //   how "app"    an order placed through the app (SSAI_EARN from the in-app order flow)
  //   how "qr"     staff ring up a member who shows their member QR / 4-digit register code
  //   how "phone"  staff find the member by the phone number on their account
  //   how "code"   the guest redeems an app reward, promo, prize, referral or welcome code at checkout
  // Never the restaurant's overall sales. BASE = food + non-alcoholic sales only. Tax, tips and ALCOHOL are excluded
  // (California ABC: an unlicensed party must not share in alcohol revenue). Staff type the check subtotal before tax and
  // tip plus the alcohol on that check; food & non-alc = subtotal − alcohol. The receipt total is kept for reconciliation.
  // App orders: with split wallets everything on the bar side counts as alcohol (excluded), so the base is never overstated.
  // EACH SALE LOGS: ts, restaurant, member id + name, receipt #, food & non-alc $, alcohol $ (excluded), receipt total,
  // how identified, staff initials, and visit "first" | "return". A RETURN = the member had already been in on an earlier
  // day (an earlier attributed sale, an earlier app visit, or joined on an earlier day). Same-day repeats keep that day's type.
  // PERFORMANCE SHARE (CRM_CFG.perfShare = {threshold:3000, pct:10, returns:12}; billed ONLY when the signed agreement has it):
  // in a calendar month (LA time) where app-attributed food & non-alc sales EXCEED the threshold, the share is pct% of ONLY
  // the amount OVER the threshold (2026-10-13: $5,000 -> 10% of $2,000 = $200), on top of the monthly fee. Statement
  // by the 5th of the next month; the client may dispute within 10 days (reconciled against register reports); payment is
  // due 15 days after the statement. returns = the 90-day results check (tracked return visits a month).
  // STORAGE: localStorage on this device (KEY_sales) AND a POST of every sale to CRM_CFG.sheet when set (Apps Script web
  // app, "AppSales" tab; see ~/command-center/clients/melody-lax/signup-sheet/Code.gs). NOT LEGALLY PROVABLE YET:
  // localStorage is one device and can be cleared or edited. Numbers to bill on need the server-side log (the deployed
  // Sheet at minimum, ideally a server database) or a POS integration (Toast / Square / Clover) that ties each member to
  // the real check. Until then every statement is an estimate to reconcile against the register's own reports.
  var PS = { threshold: 3000, pct: 10, returns: 12 }; (function (x) { for (var k in x) PS[k] = x[k]; })(C.perfShare || {});
  var SK = KEY + "_sales", HOW = { app: "🛒 App order", qr: "📲 Member QR / code", phone: "📞 Member phone", code: "🎟️ App reward / promo code" };
  function sales() { try { return JSON.parse(localStorage.getItem(SK) || "[]"); } catch (x) { return []; } }
  function salesSave(l) { try { localStorage.setItem(SK, JSON.stringify(l)); } catch (x) {} }
  function laYMD(t) { return new Date(t).toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" }); }   // YYYY-MM-DD in LA
  function r2(x) { return Math.round((+x || 0) * 100) / 100; }
  function usd(x) { return "$" + (+x || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function ymLabel(ym) { return MONTHS_L[+ym.slice(5, 7) - 1] + " " + ym.slice(0, 4); }
  function midOf(r) { return r.sample ? "sample-" + r.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/, "") : r.id; }
  // first visit or return, decided BEFORE the sale is added (and before visit() writes today into the member's vlog)
  function seenBefore(r) {
    var today = laYMD(Date.now()), mid = midOf(r);
    if (sales().some(function (x) { return x.mid === mid && x.day < today; })) return true;
    if (r.sample) return (r.visits || 0) > 1;
    return (r.vlog || []).some(function (t) { return laYMD(t) < today; }) || (r.joined && laYMD(r.joined) < today);
  }
  function logSale(s) {
    var l = sales(), day = laYMD(s.ts || Date.now());
    var same = l.filter(function (x) { return x.mid === s.mid && x.day === day; })[0];
    var ev = { id: "AS-" + code4(6), ts: s.ts || Date.now(), day: day, ym: day.slice(0, 7), restaurant: NAME, mid: s.mid, member: s.member || "",
      receipt: s.receipt, food: r2(s.food), alcohol: r2(s.alcohol), total: r2(s.total), how: s.how, staff: s.staff || "", visit: same ? same.visit : (s.seen ? "return" : "first"), src: s.src || "staff" };
    l.unshift(ev); salesSave(l);
    if (C.sheet) try { fetch(C.sheet, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ type: "appsale",
      saleId: ev.id, ts: new Date(ev.ts).toISOString(), restaurant: ev.restaurant, memberId: ev.mid, member: ev.member, receipt: ev.receipt, foodNonAlc: ev.food,
      alcoholExcluded: ev.alcohol, receiptTotal: ev.total, how: ev.how, staff: ev.staff, visit: ev.visit, source: ev.src }) }); } catch (x) {}
    return ev;
  }
  function dupReceipt(rc) { rc = String(rc).trim().toUpperCase(); return sales().filter(function (x) { return String(x.receipt).toUpperCase() === rc; })[0] || null; }
  // in-app orders call this (from SSAI_EARN). Guests who order without joining are still app orders: mid "guest".
  function logAppOrder(m, food, bar, why, seen) {
    var mm = String(why || "").match(/#?[A-Z]{1,3}-\d{2,5}|#[A-Z]\d{3}/), rc = "APP " + (mm ? mm[0].replace(/^#/, "") : code4(5));
    if (dupReceipt(rc)) rc += "-" + code4(3);
    return logSale({ mid: m ? m.id : "guest", member: m ? m.name : "Guest (app order)", receipt: rc, food: food, alcohol: bar, total: food + bar, how: "app", src: "app", seen: !!seen });
  }
  // find the member behind what staff typed: a scanned QR (SSAI:slug:id), the 4-digit register code, a phone number,
  // or any app code (welcome, reward, prize, lucky draw, friend gift, birthday, referral). Demo: this phone's member +
  // the sample customers. LIVE: the lookup runs against the restaurant's member database.
  function findMember(raw) {
    var v = String(raw || "").trim(), up = v.toUpperCase().replace(/\s+/g, ""), d = v.replace(/\D/g, ""), m = mine()[0];
    if (!v) return { err: "Scan the member's QR or type their app code, phone or reward code." };
    if (/^SSAI:/i.test(v)) { var id = v.split(":").pop(); return m && m.id === id ? { r: m, how: "qr" } : { err: "That member QR isn't on this phone (live: every QR is looked up in your member list)." }; }
    if (/^\d{4}$/.test(v) && m && regCode(m) === v) return { r: m, how: "qr" };
    if (/^[\d\s()+.\-]+$/.test(v) && d.length >= 4) {
      var hits = all().filter(function (r) { var p = String(r.phone || "").replace(/\D/g, ""); return p.length >= 4 && p.slice(-4) === d.slice(-4) && (r.sample || d.length < 10 || p.slice(-10) === d.slice(-10)); });
      if (hits.length === 1) return { r: hits[0], how: "phone" };
      if (hits.length > 1) return { err: "More than one member has a phone ending in " + d.slice(-4) + ". Type the full number." };
      return { err: /^\d{4}$/.test(v) ? "No member has that 4-digit code right now (codes change every 5 minutes) or a phone ending in " + v + "." : "No member with that phone number." };
    }
    if (m) {
      var codes = [m.code, m.ref, m.bcode, m.redeem && m.redeem.c, m.fgift && m.fgift.c].concat((m.wins || []).map(function (w) { return w.c; }), m.rdm ? WK.map(function (k) { return m.rdm[k] && m.rdm[k].c; }) : []);
      if (codes.some(function (c) { return c && String(c).toUpperCase() === up; })) return { r: m, how: "code" };
    }
    var s = SAMPLE.filter(function (r) { return r.ref && r.ref === up; })[0];
    if (s) return { r: s, how: "code" };
    return { err: "No member or app code matches \"" + v + "\". Check the letters (live: looked up in your member list)." };
  }
  function moneyIn(k) { var el = own.querySelector('[data-r="' + k + '"]'); var x = parseFloat(String(el ? el.value : "").replace(/[^0-9.]/g, "")); return isFinite(x) ? x : NaN; }
  function ringCalc() {
    var sub = moneyIn("sub"), alc = moneyIn("alc"), el = own.querySelector('[data-r="calc"]'); if (!el) return;
    if (!(sub > 0)) { el.textContent = "Counted for the app: food & non-alc = subtotal − alcohol. Tax and tip never count."; return; }
    alc = alc > 0 ? alc : 0;
    el.innerHTML = alc > sub ? '<span style="color:#FF8F85">Alcohol can\'t be more than the subtotal.</span>' : 'Counted for the app: <b style="color:#3DDC97">' + usd(sub - alc) + ' food & non-alc</b>' + (alc ? ' · ' + usd(alc) + ' alcohol excluded' : '') + ' · tax & tip excluded';
  }
  function ringUp() {
    var msg = own.querySelector('[data-r="msg"]'), bad = function (t) { msg.style.color = "#FF6B5E"; msg.textContent = t; };
    var who = own.querySelector('[data-r="who"]').value, rc = own.querySelector('[data-r="rcpt"]').value.trim(), staff = own.querySelector('[data-r="staff"]').value.trim().toUpperCase();
    var sub = moneyIn("sub"), alc = moneyIn("alc"), tot = moneyIn("tot"); alc = alc > 0 ? alc : 0;
    var f = findMember(who); if (f.err) return bad(f.err);
    if (!rc) return bad("Type the check / receipt number from the register.");
    if (!/^[A-Z]{1,4}$/.test(staff)) return bad("Add your initials (1–4 letters).");
    if (!(sub > 0)) return bad("Type the check subtotal before tax and tip.");
    if (!(tot > 0)) return bad("Type the receipt total (with tax and tip).");
    if (alc > sub) return bad("Alcohol can't be more than the subtotal.");
    if (sub > tot + 0.005) return bad("The subtotal can't be more than the receipt total. Subtotal is before tax and tip.");
    var dup = dupReceipt(rc); if (dup) return bad("Check #" + rc + " is already logged (" + new Date(dup.ts).toLocaleString() + "). Each check counts once.");
    var r = f.r, food = r2(sub - alc), seen = seenBefore(r), pts = "";
    if (!r.sample) {   // this phone's member: points post like any register order (the alcohol $ earn bar points with split wallets)
      if (WAL) { var wr = purchase(r, food, alc, "🧾 Check #" + rc); pts = splitMsg(wr); }
      else { var got = visit(r, sub * PER); addPts(r, got, "🧾 Check #" + rc + " · $" + sub.toFixed(2)); r.visits = (r.visits || 0) + 1; r.last = Date.now(); pts = "+" + got + " pts"; }
      var tk = tokBuy(r, food, "Check #" + rc + " food & non-alc $" + food.toFixed(2)); /* tokens never on the alcohol $ */ pts += tokMsg(tk); put(r);
    }
    var ev = logSale({ mid: midOf(r), member: r.name, receipt: rc, food: food, alcohol: alc, total: tot, how: f.how, staff: staff, seen: seen });
    drawJoin(); drawOwn(); refreshMenu();
    var m2 = own.querySelector('[data-r="msg"]'); m2.style.color = "#3DDC97";
    m2.textContent = "✅ Check #" + rc + " logged for " + r.name + " · " + usd(food) + " food & non-alc" + (alc ? " (" + usd(alc) + " alcohol excluded)" : "") + " · " + (ev.visit === "return" ? "🔁 return visit" : "🆕 first visit") + (pts ? " · " + pts : "");
    toast("🧾 " + usd(food) + " app sale · " + r.name.split(" ")[0]);
  }
  function monthStats(ym) {
    var l = sales().filter(function (x) { return x.ym === ym; }), sum = function (a, k) { return r2(a.reduce(function (s, x) { return s + (+x[k] || 0); }, 0)); };
    var ret = l.filter(function (x) { return x.visit === "return"; }), fst = l.filter(function (x) { return x.visit !== "return"; });
    var vis = {}, rv = {}; l.forEach(function (x) { vis[x.mid + "|" + x.day] = 1; if (x.visit === "return") rv[x.mid + "|" + x.day] = 1; });
    var food = sum(l, "food"), over = food > PS.threshold;
    return { ym: ym, rows: l, n: l.length, food: food, alcohol: sum(l, "alcohol"), total: sum(l, "total"), retFood: sum(ret, "food"), fstFood: sum(fst, "food"), retN: ret.length, fstN: fst.length,
      visits: Object.keys(vis).length, retVisits: Object.keys(rv).length, members: Object.keys(l.reduce(function (o, x) { o[x.mid] = 1; return o; }, {})).length,
      appN: l.filter(function (x) { return x.how === "app"; }).length, over: over, excess: over ? r2(food - PS.threshold) : 0, share: over ? r2((food - PS.threshold) * PS.pct / 100) : 0 };
  }
  function salesBox() {
    var ym = laYMD(Date.now()).slice(0, 7), S = monthStats(ym), pct = Math.min(100, S.food / PS.threshold * 100);
    var yms = sales().map(function (x) { return x.ym; }).concat([ym]).filter(function (x, i, a) { return a.indexOf(x) === i; }).sort().reverse();
    return '<div class="crm-box crm-as" id="crm-appsales"><h4>📈 App sales · ' + ymLabel(ym) + '</h4>' +
      '<p style="margin:0 0 8px;font-size:13px">Sales the app brought in: app orders, plus checks where staff identified a member by QR, phone or an app code. Food & non-alc only: no tax, tips or alcohol. Never your overall sales.</p>' +
      '<div class="crm-as-big">' + usd(S.food) + '<small> of ' + usd(PS.threshold).replace(".00", "") + '</small></div>' +
      '<div class="crm-goal" style="height:12px"><i style="width:' + pct + '%;background:' + (S.over ? 'linear-gradient(90deg,#3DDC97,#FFD23F)' : '#3DDC97') + '"></i></div>' +
      '<p style="margin:2px 0 10px;font-size:12.5px">' + (S.over ? '✅ Past ' + usd(PS.threshold).replace(".00", "") + ' this month.' : usd(r2(PS.threshold - S.food)) + ' to go to ' + usd(PS.threshold).replace(".00", "") + '.') + '</p>' +
      '<div class="crm-stats" style="grid-template-columns:repeat(2,1fr)"><div><b>' + usd(S.retFood) + '</b>🔁 returning members (' + S.retN + ')</div><div><b>' + usd(S.fstFood) + '</b>🆕 first visits (' + S.fstN + ')</div>' +
      '<div><b>' + S.visits + '</b>member visits · ' + S.members + ' members</div><div><b>' + S.retVisits + '</b>return visits (' + PS.returns + '/mo check)</div></div>' +
      '<div class="crm-as-share"><span>Performance share estimate</span><b>' + (S.over ? usd(S.share) : '$0.00') + '</b></div>' +
      '<p class="crm-fine" style="margin:4px 0 0">Only if your agreement includes it: in a month where app sales pass ' + usd(PS.threshold).replace(".00", "") + ', it\'s ' + PS.pct + '% of only the amount over ' + usd(PS.threshold).replace(".00", "") + ' (' + PS.pct + '% × ' + usd(S.excess) + '), on top of the monthly fee. Alcohol excluded this month: ' + usd(S.alcohol) + '.</p>' +
      '<div class="crm-feed" style="max-height:170px;margin-top:8px">' + (S.rows.slice(0, 12).map(function (x) { return '<div><span>' + e(x.day.slice(5)) + ' · #' + e(x.receipt) + ' · ' + e(x.member) + '<br><span style="color:#9AA6CC">' + e(HOW[x.how] || x.how) + ' · ' + (x.visit === "return" ? "🔁 return" : "🆕 first") + (x.staff ? ' · ' + e(x.staff) : '') + '</span></span><b class="plus">' + usd(x.food) + '</b></div>'; }).join("") || '<div><span>No app sales yet this month. Ring up a member above.</span></div>') + '</div>' +
      '<div class="crm-acts"><button type="button" data-a="scsv">⬇️ Sales CSV</button><button type="button" class="hot" data-a="stmt">🧾 Statement</button></div>' +
      '<label style="margin-top:8px">Statement month</label><select data-r="sym">' + yms.map(function (x) { return '<option value="' + x + '">' + ymLabel(x) + (x === ym ? ' (so far)' : '') + '</option>'; }).join("") + '</select>' +
      '<p class="crm-fine" style="margin:8px 0 0">Demo: this log lives on this phone' + (C.sheet ? ' and is copied to your Google Sheet' : '') + '. To bill on it, the numbers need the server log or a register (POS) link, and every statement is checked against your register reports.</p></div>';
  }
  function salesCSV() {
    var q = function (v) { return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"'; };
    var head = "sale_id,timestamp,date,month,restaurant,member_id,member,receipt,how_identified,visit,food_nonalc,alcohol_excluded,receipt_total,staff,source";
    return [head].concat(sales().slice().reverse().map(function (x) { return [x.id, new Date(x.ts).toISOString(), x.day, x.ym, x.restaurant, x.mid, x.member, x.receipt, x.how, x.visit, x.food.toFixed(2), x.alcohol.toFixed(2), x.total.toFixed(2), x.staff, x.src].map(q).join(","); })).join("\n");
  }
  function addDays(ymd, n) { var p = ymd.split("-"), d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n)); return d.toISOString().slice(0, 10); }
  function longDate(ymd) { var p = ymd.split("-"); return MONTHS_L[+p[1] - 1] + " " + (+p[2]) + ", " + p[0]; }
  function statementHTML(ym) {
    var S = monthStats(ym), y = +ym.slice(0, 4), mo2 = +ym.slice(5, 7), nx = mo2 === 12 ? (y + 1) + "-01" : y + "-" + ("0" + (mo2 + 1)).slice(-2), sd = nx + "-05";
    var open = laYMD(Date.now()).slice(0, 7) <= ym;
    return '<div class="st-hd"><div><b>SousShift AI</b><br>Performance Share Statement</div><div style="text-align:right">' + e(NAME) + '<br>' + ymLabel(ym) + '</div></div>' +
      (open ? '<p class="st-warn">PREVIEW: ' + ymLabel(ym) + ' is not over yet. The final statement is issued by ' + longDate(sd) + '.</p>' : '') +
      '<table class="st-t"><tr><td>Statement date</td><td>' + longDate(sd) + '</td></tr><tr><td>Period</td><td>' + longDate(ym + "-01") + ' – ' + longDate(addDays(nx + "-01", -1)) + ' (Los Angeles time)</td></tr>' +
      '<tr><td>App-attributed sales (food & non-alcoholic)</td><td><b>' + usd(S.food) + '</b> · ' + S.n + ' sale' + (S.n === 1 ? '' : 's') + '</td></tr>' +
      '<tr><td>Returning members / first visits</td><td>' + usd(S.retFood) + ' / ' + usd(S.fstFood) + '</td></tr><tr><td>Member visits / return visits</td><td>' + S.visits + ' / ' + S.retVisits + '</td></tr>' +
      '<tr><td>Alcohol on those checks (excluded)</td><td>' + usd(S.alcohol) + '</td></tr>' +
      '<tr><td>Threshold check</td><td>' + (S.over ? 'Met: ' + usd(S.food) + ' is over ' + usd(PS.threshold) : 'Not met: ' + usd(S.food) + ' is not over ' + usd(PS.threshold) + '. No share is due.') + '</td></tr>' +
      '<tr class="st-tot"><td>Performance share (' + PS.pct + '% of ' + usd(S.excess) + ', the amount over ' + usd(PS.threshold) + ')</td><td>' + usd(S.share) + '</td></tr>' +
      '<tr><td>Dispute window</td><td>Until ' + longDate(addDays(sd, 10)) + ' (10 days). Reconciled against Client\'s register reports.</td></tr>' +
      '<tr><td>Payment due</td><td>' + (S.share ? longDate(addDays(sd, 15)) + ' (15 days after the statement)' : 'Nothing due') + '</td></tr></table>' +
      '<h4>Line items</h4><div class="st-sc"><table class="st-li"><tr><th>Date</th><th>Check #</th><th>Member</th><th>How identified</th><th>Visit</th><th>Food & non-alc</th><th>Alcohol (excl.)</th></tr>' +
      (S.rows.slice().reverse().map(function (x) { return '<tr><td>' + e(x.day) + '</td><td>' + e(x.receipt) + '</td><td>' + e(x.member) + '</td><td>' + e((HOW[x.how] || x.how).replace(/^\S+ /, "")) + '</td><td>' + (x.visit === "return" ? "Return" : "First") + '</td><td>' + usd(x.food) + '</td><td>' + usd(x.alcohol) + '</td></tr>'; }).join("") || '<tr><td colspan="7">No app-attributed sales this month.</td></tr>') +
      '<tr class="st-tot"><td colspan="5">Total</td><td>' + usd(S.food) + '</td><td>' + usd(S.alcohol) + '</td></tr></table></div>' +
      '<p class="st-fn">Base: food and non-alcoholic sales from app orders and from checks where the member was identified through the app (member QR or code, phone, or an app reward / promo code). Tax, tips and alcohol are excluded; the restaurant\'s overall sales never count. ' +
      'Source: the app\'s sales log. Figures are reconciled against Client\'s register reports before payment. Draft for attorney review; not legal advice.</p>';
  }
  function openStatement(ym) {
    var ov = document.createElement("div"); ov.className = "crm-stmt"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true");
    ov.innerHTML = '<div class="st-bar"><b>Statement · ' + ymLabel(ym) + '</b><button type="button" data-s="print">Save / Print PDF</button><button type="button" data-s="x">Close</button></div><div class="st-doc">' + statementHTML(ym) + '</div>';
    var html_ = document.documentElement, prev = html_.style.overflow;
    function close() { ov.remove(); html_.style.overflow = prev; html_.classList.remove("crm-printing"); }
    ov.querySelector('[data-s="x"]').onclick = close;
    ov.querySelector('[data-s="print"]').onclick = function () { var t = document.title; html_.classList.add("crm-printing"); document.title = NAME + " - Performance Share " + ym; window.print(); document.title = t; html_.classList.remove("crm-printing"); };
    document.body.appendChild(ov); html_.style.overflow = "hidden";
    return ov;
  }
  (function () {
    var s = document.createElement("style");
    s.textContent = ".crm-as-big{font:900 30px/1.1 system-ui;color:#EEF2FF;margin:4px 0}.crm-as-big small{font-size:14px;color:#9AA6CC;font-weight:700}" +
      ".crm-as-share{display:flex;justify-content:space-between;align-items:center;gap:10px;background:#070B1E;border:1px solid #3DDC97;border-radius:12px;padding:10px 12px;font-size:13.5px;color:#C9D2EE;font-weight:700}.crm-as-share b{font:900 20px system-ui;color:#3DDC97}" +
      ".crm-own .crm-as .crm-stats div{font-size:11.5px}.crm-own .crm-as .crm-stats b{font-size:17px}" +
      ".crm-stmt{position:fixed;inset:0;z-index:2147483000;background:#eef1f6;color:#111;overflow:auto;font:14px/1.45 Arial,Helvetica,sans-serif}" +
      ".crm-stmt .st-bar{position:sticky;top:0;display:flex;gap:8px;align-items:center;padding:10px 12px;background:#0B2A6F;color:#fff}.crm-stmt .st-bar b{flex:1;font-size:14px;min-width:0}" +
      ".crm-stmt .st-bar button{font:700 13px Arial;border:0;border-radius:9px;padding:9px 11px;cursor:pointer;background:#FFD60A;color:#111}.crm-stmt .st-bar button[data-s=x]{background:#ffffff22;color:#fff}" +
      ".crm-stmt .st-doc{background:#fff;max-width:820px;margin:14px auto;padding:24px 18px;border-radius:6px;box-sizing:border-box;width:calc(100% - 20px)}" +
      ".crm-stmt .st-hd{display:flex;justify-content:space-between;gap:10px;border-bottom:3px solid #0b1a4a;padding-bottom:10px;margin-bottom:12px;font-size:15px}.crm-stmt .st-hd b{font-size:18px}" +
      ".crm-stmt table{display:table;border-collapse:collapse;width:100%;font-size:13px}.crm-stmt tr{display:table-row}.crm-stmt td,.crm-stmt th{display:table-cell}.crm-stmt td,.crm-stmt th{border:1px solid #c3c9d6;padding:6px 7px;text-align:left;vertical-align:top}.crm-stmt th{background:#eef2f8}" +
      ".crm-stmt .st-t td:first-child{width:46%;color:#333}.crm-stmt tr.st-tot td{font-weight:800;background:#f6f8fc}.crm-stmt .st-sc{overflow-x:auto}.crm-stmt .st-li{min-width:600px}" +
      ".crm-stmt h4{margin:16px 0 6px}.crm-stmt .st-fn{font-size:11.5px;color:#444;margin-top:12px}.crm-stmt .st-warn{background:#fff6d6;border:1px solid #e5c95a;border-radius:8px;padding:8px 10px;font-size:13px}" +
      "@media print{html.crm-printing body>*:not(.crm-stmt){display:none!important}html.crm-printing .crm-stmt{position:static;overflow:visible;background:#fff}html.crm-printing .crm-stmt .st-bar{display:none}html.crm-printing .crm-stmt .st-doc{margin:0;max-width:none;width:auto}html.crm-printing .crm-stmt .st-li{min-width:0}}";
    document.head.appendChild(s);
  })();
  // test / demo hook: SSAI_SALES.list(), .stats("2026-10"), .statement("2026-10"), .csv()
  window.SSAI_SALES = { list: sales, stats: monthStats, statement: function (ym) { return openStatement(ym || laYMD(Date.now()).slice(0, 7)); }, csv: salesCSV, config: PS };

  var seg = "all";
  function drawOwn(s, flash) {
    seg = s || seg;
    var rows = all(), pick = rows.filter(function (r) {
      if (seg === "all") return true;
      if (seg === "vip") return r.visits >= 10;
      if (seg === "risk") return now - r.last >= 30 * DAY && !r.you;
      if (seg === "new") return now - r.joined <= 7 * DAY;
      if (seg === "bday") return r.bday === mo;
      return true;
    });
    var newWk = rows.filter(function (r) { return now - r.joined <= 7 * DAY; }).length;
    var COLORS = ["#FFD23F", "#3DDC97", "#E8582A", "#7FB3FF", "#D7A6FF", "#FF8F85"];
    own.innerHTML = '<span class="badge">OWNER VIEW · ONLY YOU SEE THIS</span><span class="k" style="display:block">Your customer list</span>' +
      '<h3>Every signup is yours to keep</h3><p>The moment someone joins, they land here with their contact info. It\'s your data: reach back out anytime, export it anytime, and it stays yours even if you ever leave.</p>' +
      '<div class="crm-stats"><div><b>' + rows.length + '</b>customers</div><div><b>' + newWk + '</b>new this week</div><div><b>' + rows.filter(function (r) { return r.visits >= 10; }).length + '</b>VIPs</div><div><b>' + rows.filter(function (r) { return now - r.last >= 30 * DAY && !r.you; }).length + '</b>to win back</div></div>' +
      (WAL ? '<div class="crm-wsum">' + WK.map(function (k) { var tot = rows.reduce(function (a, r) { return a + (walOf(r)[k] || 0); }, 0); return '<div><b>' + tot.toLocaleString() + '</b>' + wname(k) + ' pts held</div>'; }).join("") + '</div>' : '') +
      '<div class="crm-seg">' + [["all", "Everyone"], ["new", "New"], ["vip", "VIP"], ["risk", "Hasn't been back"], ["bday", "Birthdays"]].map(function (x) { return '<button type="button" data-s="' + x[0] + '"' + (x[0] === seg ? ' class="on"' : '') + '>' + x[1] + '</button>'; }).join("") + '</div>' +
      '<div class="crm-list">' + pick.map(function (r, i) {
        return '<div class="crm-row' + (r.you ? ' you' : '') + '"><span class="crm-av" style="background:' + COLORS[i % COLORS.length] + '">' + e(r.name.charAt(0)) + '</span>' +
          '<span class="nm">' + e(r.name) + tags(r).map(function (t) { return '<span class="crm-tag ' + t[0] + '">' + t[1] + '</span>'; }).join("") + '</span>' +
          '<span class="st">' + (WAL ? WK.map(function (k) { return W[k].icon + ' ' + (walOf(r)[k] || 0).toLocaleString(); }).join(' · ') : (r.stars || 0).toLocaleString()) + ' pts' + (ON ? '<br>🪙 ' + tokOf(r, i).tok : '') + '</span><span class="ct">' + e([r.phone, r.email].filter(Boolean).join(" · ") || "—") + ' · ' + r.visits + ' visit' + (r.visits === 1 ? '' : 's') + ' · last ' + ago(r.last) + '</span></div>';
      }).join("") + '</div>' +
      '<div class="crm-acts"><button type="button" class="hot" data-a="text">💬 Text this group</button><button type="button" data-a="csv">⬇️ Export list</button></div>' +
      '<div class="crm-compose"><textarea></textarea><div class="crm-bub"></div><p class="crm-fine" style="margin-bottom:0"></p></div>' +
      '<div class="crm-box crm-blast" id="crm-blast"></div>' +
      '<div class="crm-box" id="crm-ring"><h4>🧾 Ring up a member</h4><p style="margin:0 0 8px;font-size:13px">Your cashier or bartender finds the member, types the check numbers and taps Log. Points post to their phone, and the check is logged as an app sale.</p>' +
        '<label>Member: scanned QR, 4-digit app code, phone, or reward / promo code</label><input data-r="who" maxlength="40" autocapitalize="characters" placeholder="e.g. 4821 · (310) 555-0123 · WIN-7K3P">' +
        '<div class="two"><div><label>Check / receipt #</label><input data-r="rcpt" maxlength="24" autocapitalize="characters" placeholder="e.g. 1042"></div><div><label>Staff initials</label><input data-r="staff" maxlength="4" autocapitalize="characters" placeholder="e.g. JD"></div></div>' +
        '<div class="two"><div><label>Subtotal (before tax &amp; tip) $</label><input data-r="sub" inputmode="decimal" placeholder="0.00"></div><div><label>Alcohol on this check $</label><input data-r="alc" inputmode="decimal" placeholder="0.00"></div></div>' +
        '<label>Receipt total (with tax &amp; tip) $</label><input data-r="tot" inputmode="decimal" placeholder="0.00">' +
        '<p class="crm-fine" data-r="calc" style="margin:6px 0 0"></p>' +
        (WAL ? '<p class="crm-fine" style="margin:4px 0 0">Points: food &amp; non-alc $ earn ' + wname("food") + ' points, alcohol $ earn ' + wname("bar") + ' points. Two separate balances.</p>' : '') +
        '<button type="button" class="go" style="margin-top:8px;background:#2547B8;box-shadow:none" data-a="reg">Log sale + add points</button><div class="err" data-r="msg" style="color:#3DDC97"></div>' +
        '<h4 style="margin:16px 0 6px">🎟️ Redeem a reward code</h4><p style="margin:0 0 8px;font-size:13px">Guest shows a WIN-, KID- (🧒 kid prize: only with the young player at the table, one per kid per visit), ' + (WAL ? 'BAR- (drink reward), FOOD- (kitchen reward)' : 'R-') + ', FRIEND- or BDAY- code. Apply the matching discount in your POS (Toast, Square…), then mark it used here so it can never be used again. One reward per visit.</p>' +
        '<input data-r="rcode" placeholder="e.g. WIN-7K3P" maxlength="12" autocapitalize="characters" style="width:100%"><button type="button" class="go" style="margin-top:8px;background:#77242e;box-shadow:none" data-a="redeem">Mark used</button><div class="err" data-r="rmsg"></div>' +
        (mine()[0] ? '<p class="crm-fine" style="margin:4px 0 0">Demo tip: tap "Scan to earn" above to see your code, then enter it here.</p>' : '') + '</div>' +
      salesBox() +
      '<div class="crm-box crm-lead"><h4>🤝 Top referrers</h4><p style="margin:0;font-size:13px">Customers bringing you new customers. They earn +' + REF.join + ' when a friend joins and +' + REF.every + ' every time that friend orders.</p>' +
        rows.filter(function (r) { return r.nfr || (r.friends && r.friends.length); }).map(function (r) { return { n: r.name, f: r.nfr || r.friends.length, o: r.nfo != null ? r.nfo : r.friends.reduce(function (a, x) { return a + x.orders; }, 0), you: r.you }; })
          .sort(function (a, b) { return b.f - a.f || b.o - a.o; }).slice(0, 6).map(function (x, i) {
            return '<div><span class="r">' + (i + 1) + '</span><span><b>' + e(x.n) + '</b>' + (x.you ? ' <span class="crm-tag t-you">YOU</span>' : '') + '<br><span style="color:#9AA6CC">' + x.f + ' friend' + (x.f === 1 ? '' : 's') + ' joined · ' + x.o + ' orders from them</span></span><b style="color:#3DDC97">+' + (x.f * REF.join + Math.min(x.o, x.f) * REF.first + Math.max(0, x.o - x.f) * REF.every).toLocaleString() + '</b></div>'; }).join("") + '</div>' +
      (TC || SPIN ? (function () {
        var T_ = { tok: 0, purchase: 0, weekly: 0, free: 0, bonus: 0, spent: 0, plays: 0, spins: 0 };
        rows.forEach(function (r, i) { var t = tokOf(r, i); for (var k in T_) T_[k] += t[k] || 0; });
        var L = function (n, t, x) { return '<div><span class="r">' + n.toLocaleString() + '</span><span>' + t + '</span><b style="color:#3DDC97">' + (x || '') + '</b></div>'; };
        return '<div class="crm-box crm-lead" id="crm-otok"><h4>🎮 ' + e(C.game || "Game") + (ON ? ' tokens' : '') + (SPIN ? ' & daily spin' : '') + '</h4>' +
          '<p style="margin:0;font-size:13px">' + (ON ? 'Phase 2: a play costs ' + TOK.playCost + ' tokens. Tokens come with food purchases (' + TOK.perDollar + ' per $1), +' + TOK.weeklyFree + ' free weekly, +' + TOK.freeDaily + ' free on request daily. Never sold.' : 'Phase 1: free to play for members (phone + email, one account per phone). Tokens are built and switched off.') + '</p>' +
          L(T_.plays, '🎮 Plays') + (SPIN ? L(T_.spins, '🎡 Free daily spins') : '') +
          (ON ? L(T_.tok, '🪙 Tokens held now') + L(T_.purchase, '🧾 Tokens with purchases') + L(T_.weekly, '🎁 Weekly free tokens') + L(T_.free, '🙋 Free tokens on request') + L(T_.bonus, '🎡 Tokens won on the spin') + L(T_.spent, '🎮 Tokens spent on plays') +
            '<h4 style="margin:14px 0 6px">🧾 Give tokens with an order</h4><p style="margin:0 0 8px;font-size:13px">Type the food &amp; non-alcoholic total (no alcohol, tax or tip), hand the guest the code (or print it on the receipt). One use, into the account bound to their phone.</p>' +
            '<div class="crm-rcode"><input data-r="tamt" inputmode="decimal" placeholder="Food & non-alc $"><button type="button" data-a="tissue">Make code</button></div><div class="err" data-r="tmsg" style="color:#3DDC97"></div>' : '') +
          '<p class="crm-fine" style="margin:8px 0 0">Every play, spin' + (ON ? ' and token move (with purchases, weekly, free request, spin, spent)' : '') + ' is in the CSV export.</p></div>';
      })() : '') +
      earnBox(rows) +
      '<p class="crm-fine">Sample customers (made up) plus anyone who joins on this phone. Live, this list fills from real signups at your tables, and texts go only to people who opted in.</p>';
    own.querySelectorAll(".crm-seg button").forEach(function (b) { b.onclick = function () { drawOwn(b.dataset.s); }; });
    var ti = own.querySelector('[data-a="tissue"]');
    if (ti) ti.onclick = function () {
      var am = parseFloat(own.querySelector('[data-r="tamt"]').value.replace(/[^0-9.]/g, "")), tm = own.querySelector('[data-r="tmsg"]');
      if (!(am > 0)) { tm.style.color = "#FF6B5E"; tm.textContent = "Enter the food & non-alcoholic total."; return; }
      var c = issueCode(am); tm.style.color = "#3DDC97"; tm.innerHTML = 'Code <b style="font:900 18px ui-monospace,Menlo,monospace;letter-spacing:.08em;color:#FFD23F" data-r="tcode">' + c.c + '</b> = ' + c.n + ' tokens ($' + am.toFixed(2) + ' food & non-alc). Single use.';
    };
    var cmp = own.querySelector(".crm-compose"), ta = cmp.querySelector("textarea");
    own.querySelector('[data-a="reg"]').onclick = ringUp;
    ["sub", "alc"].forEach(function (k) { own.querySelector('[data-r="' + k + '"]').oninput = ringCalc; }); ringCalc();
    own.querySelector('[data-a="scsv"]').onclick = function () {
      var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([salesCSV()], { type: "text/csv" })); a.download = SLUG + "-app-sales.csv"; document.body.appendChild(a); a.click(); a.remove();
    };
    own.querySelector('[data-a="stmt"]').onclick = function () { openStatement(own.querySelector('[data-r="sym"]').value); };
    own.querySelector('[data-a="redeem"]').onclick = function () {
      var c = own.querySelector('[data-r="rcode"]').value.trim().toUpperCase(), msg = own.querySelector('[data-r="rmsg"]'), m = mine()[0], hit = null, kind = "";
      var bad = function (t) { msg.style.color = "#FF6B5E"; msg.textContent = t; };
      if (!c) return bad("Type the code from the guest's phone.");
      if (m) { (m.wins || []).forEach(function (w) { if (w.c === c) { hit = w; kind = "win"; } }); if (!hit && m.redeem && m.redeem.c === c) { hit = m.redeem; kind = "pts"; } if (!hit && m.rdm) WK.forEach(function (k) { if (!hit && m.rdm[k] && m.rdm[k].c === c) { hit = m.rdm[k]; kind = "pts"; } }); if (!hit && m.fgift && m.fgift.c === c) { hit = m.fgift; kind = "gift"; } if (!hit && m.bcode === c) { hit = { c: c, t: "Birthday treat", ts: Date.now() }; kind = "bday"; } }
      if (!hit) return bad("No reward with that code. Check the letters, or it may belong to another phone (live: every code is looked up in your database).");
      if (hit.used || (m.bused && kind === "bday")) return bad("Already used on " + new Date(hit.used || m.bused).toLocaleString() + ". Each code works once.");
      if (kind === "win" && Date.now() - hit.ts >= (hit.ttl || WIN_TTL)) return bad("Expired " + until(hit) + ".");
      // kid prizes follow their own rule (one per kid per visit, kid at the table), so a parent's reward doesn't block them
      if (!hit.kid && m.lastRedeem && Date.now() - m.lastRedeem < 4 * 36e5) return bad("This guest already used a reward this visit. One reward per visit.");
      if (kind === "bday") m.bused = Date.now(); else hit.used = Date.now();
      if (!hit.kid) m.lastRedeem = Date.now(); (m.ledger = m.ledger || []).unshift({ ts: Date.now(), pts: 0, t: "✅ Redeemed " + hit.t + " · " + c }); put(m);
      msg.style.color = "#3DDC97"; msg.textContent = "✅ " + (hit.kid ? "🧒 KID PRIZE: " : "") + (hit.w && W[hit.w] ? wname(hit.w) + " reward: " : "") + hit.t + " redeemed." + (hit.kid ? " " + KID_RULE : "") + " Apply the matching discount in your POS" + (hit.w === "bar" ? " on the drinks." : hit.w === "food" ? " on the food." : "."); drawJoin(); toast("✅ " + c + " used");
    };
    var DEF = { all: "Hey {first}! Double stars at " + NAME + " this week only 🔥", new: "Welcome to the club, {first}! Your next visit earns 2× stars.",
      vip: "{first}, you're one of our VIPs 👑 Next one's on us this week.", risk: "Hey {first}, we miss you! 👀 Come back this week for 2× stars.",
      bday: "Happy birthday {first}! 🎂 Your free treat is waiting. Show your code + a photo ID at the counter." };
    if (SIMPLE) DEF = { all: "Hey {first}! New on the menu at " + NAME + " this week. Your points are waiting 🔥", new: "Welcome to " + NAME + " Rewards, {first}! Show your code next visit to earn " + PER + " pts per $1.",
      vip: "{first}, thanks for being a regular 👑 Check your points: you might have a reward ready.", risk: "Hey {first}, we miss you! 👀 Your points are still here whenever you come back.",
      bday: "Happy birthday {first}! 🎂 " + EARN.birthday + " birthday points just landed in your " + NAME + " Rewards." };
    function preview() {
      var who = pick.filter(canText), first = who[0] ? who[0].name.split(" ")[0] : "there";
      cmp.querySelector(".crm-bub").textContent = ta.value.replace(/\{first\}/g, first);
      cmp.querySelector(".crm-fine").textContent = "Would go to " + who.length + " customer" + (who.length === 1 ? "" : "s") + " in this group who tapped \"Text me deals\" (" + (pick.length - who.length) + " without text consent are skipped). Demo: nothing is sent.";
    }
    ta.oninput = preview;
    own.querySelector('[data-a="text"]').onclick = function () { cmp.style.display = "block"; ta.value = DEF[seg] || DEF.all; preview(); ta.focus(); };
    own.querySelector('[data-a="csv"]').onclick = function () {
      var q = function (v) { return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"'; };
      var csv = ["name,phone,email,visits,points," + (WAL ? "bar_points,kitchen_points," : "") + "last_visit,joined,birthday,referral_code,referred_by,friends_referred," + EK.map(function (k) { return k[0]; }).join(",") + ",feedback_stars,feedback" + (TC || SPIN ? ",plays,daily_spins,tokens,tokens_with_purchases,tokens_weekly_free,tokens_free_request,tokens_spin_bonus,tokens_spent,device_bound" : "") + ",text_deals_consent,consent_at,consent_source,opted_out_stop"].concat(all().map(function (r, i) {
        var ec = earnCounts(r, i), tt = tokOf(r, i);
        return [r.name, r.phone, r.email, r.visits, r.stars].concat(WAL ? [walOf(r).bar || 0, walOf(r).food || 0] : [], [new Date(r.last).toISOString().slice(0, 10), new Date(r.joined).toISOString().slice(0, 10), r.bday >= 0 ? (r.bdy ? r.bdy + "-" + ("0" + (r.bday + 1)).slice(-2) + "-" + ("0" + r.bdd).slice(-2) : MONTHS[r.bday]) : "", r.ref || "", r.refByName || "", r.nfr || (r.friends ? r.friends.length : "")]).concat(EK.map(function (k) { return ec[k[0]] || 0; }), [r.fb ? r.fb.s : "", r.fb ? r.fb.t : ""], TC || SPIN ? [tt.plays, tt.spins, tt.tok, tt.purchase, tt.weekly, tt.free, tt.bonus, tt.spent, r.sample ? "" : (r.dev ? "yes" : "no")] : [], [r.sms ? "yes" : "no", r.smsAt ? new Date(r.smsAt).toISOString() : "", r.smsSrc || "", r.stop ? new Date(r.stop).toISOString().slice(0, 10) : ""]).map(q).join(",");
      })).join("\n");
      var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = SLUG + "-customers.csv"; document.body.appendChild(a); a.click(); a.remove();
    };
    drawBlast();
    if (flash) setTimeout(function () { var y = own.querySelector(".crm-row.you"); if (y) y.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, 80);
  }

  var mount = C.mount && document.querySelector(C.mount);
  if (mount) { mount.appendChild(join); if (!CUST) mount.appendChild(own); }
  else {
    var ref = document.querySelector("#ssai-n") || document.querySelector("#ssai-k") || document.querySelector("footer");
    if (ref && ref.parentNode) { ref.parentNode.insertBefore(join, ref); if (!CUST) ref.parentNode.insertBefore(own, ref); }
    else { document.body.appendChild(join); if (!CUST) document.body.appendChild(own); }
  }
  drawJoin(); drawOwn("all");
  // VISIT LOG for the back office (Christian HQ › Visits): one "open" each time the app is opened or brought back to the
  // screen (max 1 per 10 min per phone), with the phone's local time, a short device summary from the user agent
  // ("iPhone · iOS 18.6 · Safari") and Home Screen vs browser. Location: ONLY if this person ALREADY allowed location for
  // the app (Permissions API says "granted"); we never ask for it here. Then one coarse reading, rounded to 2 decimals
  // (about 1 km) + its accuracy. No tracking: nothing runs in the background. Disclosed in rules.html.
  function devSummary() {
    var ua = navigator.userAgent || "", m, kind, os = "", br;
    var iPad = /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    if (/iPhone|iPod/.test(ua) || iPad) { kind = iPad ? "iPad" : "iPhone"; m = ua.match(/OS (\d+)[_.](\d+)/); os = m ? "iOS " + m[1] + (m[2] !== "0" ? "." + m[2] : "") : "iOS"; }
    else if (/Android/.test(ua)) { m = ua.match(/Android (\d+)/); os = "Android" + (m ? " " + m[1] : "");
      kind = /SM-|Samsung/i.test(ua) ? "Samsung" : /Pixel/.test(ua) ? "Pixel" : /moto/i.test(ua) ? "Motorola" : /OnePlus/i.test(ua) ? "OnePlus" : /LG-|LM-/.test(ua) ? "LG" : /Redmi|Xiaomi|MI /.test(ua) ? "Xiaomi" : "Android phone";
      if (!/Mobile/.test(ua)) kind += " tablet"; }
    else { kind = "Desktop"; os = /Windows/.test(ua) ? "Windows" : /CrOS/.test(ua) ? "ChromeOS" : /Mac OS X|Macintosh/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "other"; }
    br = /Instagram/.test(ua) ? "Instagram app" : /FBAN|FBAV/.test(ua) ? "Facebook app" : /TikTok|musical_ly/i.test(ua) ? "TikTok app" : /SamsungBrowser/.test(ua) ? "Samsung Internet" :
      /EdgiOS|EdgA|Edg\//.test(ua) ? "Edge" : /OPR\/|OPiOS/.test(ua) ? "Opera" : /FxiOS|Firefox\//.test(ua) ? "Firefox" : /CriOS|Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "browser";
    return (kind + " · " + os + " · " + br).slice(0, 60);
  }
  function localIso() { var d = new Date(), p = function (n) { return (n < 10 ? "0" : "") + n; }, o = -d.getTimezoneOffset(), a = Math.abs(o);
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "T" + p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds()) + (o < 0 ? "-" : "+") + p(Math.floor(a / 60)) + ":" + p(a % 60); }
  function logOpen() {
    var ok = KEY + "_open", lk = KEY + "_openAt", td = new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
    try {
      if (Date.now() - (+localStorage.getItem(lk) || 0) < 6e5) return; localStorage.setItem(lk, String(Date.now()));
      if (localStorage.getItem(ok) !== td) { localStorage.setItem(ok, td); if (mine()[0]) syncLater(mine()[0]); }   // daily re-sync: members who joined before the backend existed get counted too
    } catch (x) {}
    var o = { type: "open", dev: devId(), member: (mine()[0] || {}).id || "", standalone: (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone ? 1 : 0, local: localIso(), device: devSummary() };
    var sent = false, send = function () { if (!sent) { sent = true; boPost(o); } };
    try {
      if (!navigator.permissions || !navigator.permissions.query || !navigator.geolocation) return send();
      navigator.permissions.query({ name: "geolocation" }).then(function (st) {
        if (!st || st.state !== "granted") return send();   // never prompt: only when location was already allowed
        setTimeout(send, 5000);   // no fix in 5 s → send without it
        navigator.geolocation.getCurrentPosition(function (p) { var c = p.coords;
          o.lat = Math.round(c.latitude * 100) / 100; o.lng = Math.round(c.longitude * 100) / 100; o.acc = Math.round(c.accuracy) || ""; send();
        }, send, { enableHighAccuracy: false, maximumAge: 6e5, timeout: 4500 });
      }, send);
    } catch (x) { send(); }
  }
  if (SIMPLE && API && !STAFF) {
    try { logOpen(); } catch (x) {}
    document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") try { logOpen(); } catch (x) {} });   // a Home Screen app brought back = another open
  }
  // Scout adjustments: points the server refused as duplicates / over a cap, or that Christian HQ reversed. Each applies once.
  function pullAdj() {
    var m = mine()[0]; if (!SIMPLE || !API || STAFF || !m || !m.id || m.sample) return;
    fetch(API + (API.indexOf("?") < 0 ? "?" : "&") + "adj=1&slug=" + encodeURIComponent(SLUG) + "&member=" + encodeURIComponent(m.id) + "&dev=" + encodeURIComponent(devId()) + "&t=" + Date.now(), { cache: "no-store" })
      .then(function (r) { return r.json(); }).then(function (j) {
        var mm = mine()[0]; if (!j || !j.ok || !j.adj || !j.adj.length || !mm || mm.id !== m.id) return;
        var done = mm.adjDone = mm.adjDone || [], tot = 0;
        j.adj.forEach(function (a) { var p = Math.round(+a.pts || 0); if (!a.id || !p || done.indexOf(a.id) >= 0) return; done.push(a.id); tot += p;
          if (WAL) addPts(mm, p, "🛡️ " + a.why); else { mm.stars = Math.max(0, (mm.stars || 0) + p); if (p < 0 && mm.earned != null) mm.earned = Math.max(0, mm.earned + p); (mm.ledger = mm.ledger || []).unshift({ ts: Date.now(), pts: p, t: "🛡️ " + (p < 0 ? "Already counted: " : "") + a.why, k: "scout_adj" }); mm.ledger = mm.ledger.slice(0, 40); } });
        if (tot) { put(mm); drawJoin(); drawOwn(); toast(tot < 0 ? "🛡️ " + tot + " points: those were already counted" : "🛡️ +" + tot + " points added by " + NAME); }
      }).catch(function () {});
  }
  try { pullAdj(); } catch (x) {}
  if (STAFF) {
    var sb = document.createElement("div"); sb.id = "ssai-staff-bar"; sb.setAttribute("role", "status");
    sb.style.cssText = "position:fixed;left:0;right:0;top:0;z-index:2147483600;background:#FFD23F;color:#1a1206;font:800 13px/1.3 system-ui,sans-serif;padding:7px 12px;padding-top:calc(7px + env(safe-area-inset-top));display:flex;gap:8px;align-items:center;justify-content:space-between;box-shadow:0 2px 10px #0006";
    sb.innerHTML = '<span>🧑‍🍳 STAFF PRACTICE · ' + e(STAFF.name) + ' · practice points only, never real Rewards</span><a href="../../staff/christian/#games" style="color:#1a1206;white-space:nowrap">‹ Staff app</a>';
    document.body.appendChild(sb);
  }
})();
