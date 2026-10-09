/* Second Shift AI — "Join the club" signup + the owner's customer list, for every demo page.
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
     CRM_CFG.referral = {join:50, first:100, every:20, goal:3, gift:"Free fries"} */
(function () {
  "use strict";
  var C = window.CRM_CFG || {};
  var NAME = C.name || (window.NEARBY && window.NEARBY.name) || document.title.split(" — ")[0];
  var OFFER = C.offer || "10% off your next visit";
  var SLUG = NAME.toLowerCase().replace(/[^a-z0-9]+/g, "-"), KEY = "ssai_crm_" + SLUG;
  var e = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var PER = C.perDollar || 10;
  var TIERS = C.tiers || [[250, "Free side"], [500, "Free drink"], [800, "Free entrée"], [1200, "Free meal"]];
  var REF = { join: 50, first: 100, every: 20, goal: 3, gift: TIERS[0][1] };
  // visit levels: the more visits in a calendar month, the higher the level (bigger perk + points multiplier).
  // The numbers are samples; each restaurant sets its own in CRM_CFG.levels: [{visits, name, perk, mult}]
  var LEVELS = C.levels || [{ visits: 1, name: "Member", perk: "Member points", mult: 1 }, { visits: 3, name: "Regular", perk: "10% off one item", mult: 1.25 },
    { visits: 6, name: "VIP", perk: "20% off your order", mult: 1.5 }, { visits: 10, name: "Legend", perk: "40% off your order", mult: 2 }];
  function monthVisits(m) { var d = new Date(), k = d.getFullYear() * 12 + d.getMonth(); return (m.vlog || []).filter(function (t) { var x = new Date(t); return x.getFullYear() * 12 + x.getMonth() === k; }).length; }
  function levelOf(m) { var v = monthVisits(m), L = LEVELS[0]; LEVELS.forEach(function (l) { if (v >= l.visits) L = l; }); return L; }
  function nextLevel(m) { var v = monthVisits(m); return LEVELS.filter(function (l) { return l.visits > v; })[0] || null; }
  // one visit per day counts; points earned on that visit get the level's multiplier
  function visit(m, pts) { var now = Date.now(), last = (m.vlog || [])[0]; if (!last || new Date(last).toDateString() !== new Date(now).toDateString()) (m.vlog = m.vlog || []).unshift(now); m.vlog = m.vlog.slice(0, 60); return Math.round(pts * levelOf(m).mult); }
  for (var rk in (C.referral || {})) REF[rk] = C.referral[rk];
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
    ".crm-card .ok{display:flex;gap:9px;align-items:flex-start;font-size:12.5px;color:#C9D2EE;margin-top:12px;font-weight:500}",
    ".crm-card .ok input{width:20px;height:20px;flex:none;accent-color:#E8582A;margin-top:1px;padding:0}",
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
    ".t-vip{background:#ffd23f26;color:#FFD23F}.t-risk{background:#ff6b5e26;color:#FF8F85}.t-new{background:#3ddc9726;color:#3DDC97}.t-bday{background:#b04af733;color:#D7A6FF}.t-you{background:#E8582A;color:#fff}",
    ".crm-acts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}",
    ".crm-acts button{border:1px solid #25336A;background:#1a2656;color:#EEF2FF;border-radius:12px;padding:11px;font-size:13.5px;font-weight:800;cursor:pointer}",
    ".crm-acts button.hot{background:#3DDC97;border-color:#3DDC97;color:#0b2a1c}",
    ".crm-compose{display:none;margin-top:10px;background:#070B1E;border:1px solid #3DDC97;border-radius:14px;padding:12px}",
    ".crm-compose textarea{width:100%;min-height:74px;font-size:15px;color:#EEF2FF;background:#121C40;border:1px solid #25336A;border-radius:10px;padding:10px;resize:vertical}",
    ".crm-bub{background:#1a2656;border-radius:14px 14px 14px 4px;padding:9px 12px;margin-top:8px;font-size:13.5px}",
    ".crm-fine{font-size:11.5px;color:#7F8AAA;margin-top:10px}",
    ".crm-box{background:#070B1E;border:1px solid #25336A;border-radius:16px;padding:14px;margin-top:12px}",
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
  SAMPLE.forEach(function (r) { var x = REFS[r.name]; if (x) { r.ref = x[0]; r.nfr = x[1]; r.nfo = x[2]; } if (BY[r.name]) r.refByName = BY[r.name]; });
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
    return t;
  }
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
  function put(m) { var l = mine(); l[0] = m; save(l); }
  function addPts(m, n, why) { m.stars = Math.max(0, (m.stars || 0) + n); (m.ledger = m.ledger || []).unshift({ ts: Date.now(), pts: n, t: why }); m.ledger = m.ledger.slice(0, 40); }
  function toast(t) { var d = document.createElement("div"); d.className = "crm-toast"; d.textContent = t; document.body.appendChild(d); setTimeout(function () { d.remove(); }, 2600); }
  var qs = new URLSearchParams(location.search), INVITE = (qs.get("ref") || "").toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 16);
  // missed-call text-back: the auto-text after an unanswered or after-hours call links here with ?missed=1
  var MISSED = qs.get("missed") === "1" || qs.get("src") === "call", MC = C.missed || { offer: "10% off your order", days: 7 };
  var FRIENDS = ["Jasmine", "Carlos", "Devon", "Mia", "Andre", "Lily", "Marco", "Keisha", "Tran", "Gabby"];
  function shareLink(m) { return location.origin + location.pathname + "?ref=" + encodeURIComponent(m.ref) + "#crm-join"; }

  // a game calls SSAI_WIN("Free fries") when a player wins: the prize lands in their wallet with a code to redeem in store
  var PEND = KEY + "_prize";
  // rules: a prize expires 3 days after it is won, a guest holds ONE unused prize at a time (no stacking), one reward per visit
  var WIN_TTL = 3 * 864e5;
  function liveWin(w) { return w && !w.used && Date.now() - w.ts < (w.ttl || WIN_TTL) ? w : null; }
  function activeWin(m) { return m ? (m.wins || []).filter(liveWin)[0] || null : liveWin(pending()); }
  function until(w) { return new Date(w.ts + (w.ttl || WIN_TTL)).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); }
  window.SSAI_WIN = function (prize) {
    var w = { t: prize, c: "WIN-" + code4(4), ts: Date.now() }, m = mine()[0], held = activeWin(m);
    if (held) return { prize: held, saved: !!m, blocked: true, until: until(held) };
    w.until = until(w);
    if (m) { (m.wins = m.wins || []).unshift(w); m.wins = m.wins.slice(0, 5); (m.ledger = m.ledger || []).unshift({ ts: w.ts, pts: 0, t: "🏆 Won " + prize + " in the game" }); put(m); }
    else { try { localStorage.setItem(PEND, JSON.stringify(w)); } catch (x) {} }
    drawJoin(); return { prize: w, saved: !!m };
  };
  // an order placed in the app (builder.js) earns points like a register order
  window.SSAI_EARN = function (amount, why) {
    var m = mine()[0], pts = Math.round(amount * PER);
    if (m) { pts = visit(m, amount * PER); addPts(m, pts, why + " · $" + amount.toFixed(2)); m.visits = (m.visits || 0) + 1; m.last = Date.now(); put(m); drawJoin(); drawOwn(); }
    return { pts: pts, saved: !!m };
  };
  function pending() { try { return JSON.parse(localStorage.getItem(PEND) || "null"); } catch (x) { return null; } }

  function drawJoin(keepQR) {
    var me = mine()[0];
    if (me) {
      if (!me.id) { me.id = code4(8); me.ref = me.ref || refCode(me.name); me.friends = me.friends || []; me.ledger = me.ledger || []; put(me); }
      var pts = me.stars || 0, fr = me.friends || [], fo = fr.reduce(function (a, f) { return a + f.orders; }, 0);
      var refPts = (me.ledger || []).filter(function (l) { return l.ref; }).reduce(function (a, l) { return a + l.pts; }, 0);
      var first = e(me.name.split(" ")[0]);
      join.innerHTML = '<span class="k">' + e(NAME) + ' Rewards</span><h3>Hey ' + first + '! 👋</h3>' +
        (activeWin(me) ? '<div class="crm-win" style="border-color:#3DDC97"><div style="font-size:30px">' + (activeWin(me).k === "missed" ? '📞' : '🏆') + '</div><b>' + (activeWin(me).k === "missed" ? 'Sorry we missed your call! Here\'s ' + e(activeWin(me).t) : 'You won ' + e(activeWin(me).t) + '!') + '</b><div class="code">' + e(activeWin(me).c) + '</div><small>Show this code at ' + e(NAME) + ' to redeem it. Use by <b>' + e(until(activeWin(me))) + '</b>. One reward per visit; win again after you use this one.</small></div><div style="height:10px"></div>' : '') +
        '<div class="crm-win"><div style="font-size:30px">🎁</div><b>' + e(me.offer || OFFER) + '</b><div class="code">' + e(me.code) + '</div><small>Your welcome reward. Show this at the counter.</small></div>' +
        (me.bday >= 0 ? (isBday(me) || me.bdemo ? '<div class="crm-win bd"><div style="font-size:30px">🎂</div><b>Happy birthday, ' + first + '! Your free birthday treat is unlocked</b><div class="code">' + e(me.bcode || "BDAY") + '</div><small>Show this code with a photo ID that says ' + e(bdayStr(me)) + '. Good for 7 days.</small></div>'
          : '<div class="crm-bday"><h4>🎂 Birthday treat · ' + e(bdayStr(me)) + '</h4><div style="font-size:13px;color:#C9D2EE">It unlocks on your birthday and we\'ll text you a reminder that morning. To claim it, bring a photo ID that matches this date.</div><button type="button" class="crm-demo" data-a="bday">▶ Demo: it\'s my birthday</button></div>') : '') +
        // visit level this month
        (function () { var v = monthVisits(me), L = levelOf(me), N = nextLevel(me);
          return '<div class="crm-box"><h4>📅 Your level this month: <span style="color:#FFD23F">' + e(L.name) + '</span></h4>' +
            '<div style="display:flex;gap:6px;margin:6px 0 8px">' + LEVELS.map(function (l) { var on = v >= l.visits; return '<div style="flex:1;text-align:center;padding:7px 2px;border-radius:10px;border:1px solid ' + (on ? '#FFD23F' : '#2A303C') + ';background:' + (on ? '#FFD23F22' : 'transparent') + ';font-size:11.5px"><b style="display:block;font-size:13px">' + e(l.name) + '</b>' + l.visits + '+ visits<br><span style="color:#9AA6CC">' + e(l.perk) + (l.mult > 1 ? ' · ' + l.mult + '× pts' : '') + '</span></div>'; }).join("") + '</div>' +
            '<p style="margin:0;font-size:13px">' + v + ' visit' + (v === 1 ? '' : 's') + ' this month' + (N ? ' · <b>' + (N.visits - v) + ' more</b> to reach ' + e(N.name) + ' (' + e(N.perk) + ')' : ' · top level reached 🔥') + '. Resets on the 1st. One visit counts per day.</p>' +
            '<p class="crm-fine" style="margin-top:6px">Sample perks: ' + e(NAME) + ' sets the real ones.</p></div>'; })() +
        // points + scan to earn
        '<div class="crm-box"><div class="crm-pts"><div><div class="k" style="font-size:10px">Your points</div><div class="n">' + pts.toLocaleString() + '<small>pts</small></div></div>' +
          '<button type="button" class="crm-scan" data-a="scan">📲 Scan to earn</button></div>' +
          '<div class="crm-qr"><div class="qr"></div><div class="d4">' + regCode(me) + '</div><small>Show this to the cashier or bartender, or scan it at the register.<br>They ring you up and your points land here. Code refreshes every 5 min.</small></div>' +
          '<p style="margin:10px 0 0;font-size:13px">Earn <b style="color:#FFD23F">' + PER + ' points for every $1</b> you spend in store or in the app.</p>' +
          '<button type="button" class="crm-demo" data-a="ring">▶ Demo: the cashier rings you up</button>' +
          '<div class="crm-rcode"><input placeholder="Got a receipt? Type its code" maxlength="20"><button type="button" data-a="receipt">Add</button></div></div>' +
        // rewards
        '<div class="crm-box"><h4>🏆 Use your points</h4>' + TIERS.map(function (t, i) {
          return '<div class="crm-tier"><span><b>' + t[0].toLocaleString() + '</b> pts · ' + e(t[1]) + '</span><button type="button" data-redeem="' + i + '"' + (pts >= t[0] ? '' : ' disabled') + '>' + (pts >= t[0] ? 'Redeem' : (t[0] - pts).toLocaleString() + ' to go') + '</button>' +
            '<span class="bar"><i style="width:' + Math.min(100, pts / t[0] * 100) + '%"></i></span></div>'; }).join("") +
          (me.redeem ? '<div class="crm-win" style="margin-top:10px"><b>' + e(me.redeem.t) + '</b><div class="code">' + e(me.redeem.c) + '</div><small>Show this code when you order. One reward per order.</small></div>' : '') + '</div>' +
        // referrals
        '<div class="crm-box" id="crm-ref"><h4>🤝 Invite friends, earn forever</h4><div class="crm-refcode">' + e(me.ref) + '</div>' +
          '<div class="crm-acts" style="margin-top:0"><button type="button" class="hot" data-a="text">💬 Text a friend</button><button type="button" data-a="copy">📋 Copy invite link</button></div>' +
          '<ul class="crm-rules" style="margin-top:12px"><li><span>👋 A friend joins with your code</span><b>+' + REF.join + ' pts</b></li><li><span>🛒 Their first order</span><b>+' + REF.first + ' pts</b></li>' +
          '<li><span>🔁 Every order after that, for as long as they\'re a customer</span><b>+' + REF.every + ' pts</b></li><li><span>🎁 ' + REF.goal + ' friends join</span><b>' + e(REF.gift) + '</b></li></ul>' +
          '<div style="font-size:13px;color:#9AA6CC">' + Math.min(fr.length, REF.goal) + ' of ' + REF.goal + ' friends toward ' + e(REF.gift) + (fr.length >= REF.goal ? ' ✅' : '') + '</div><div class="crm-goal"><i style="width:' + Math.min(100, fr.length / REF.goal * 100) + '%"></i></div>' +
          '<div class="crm-stats" style="grid-template-columns:repeat(3,1fr);margin-bottom:4px"><div><b>' + fr.length + '</b>friends</div><div><b>' + fo + '</b>their orders</div><div><b>' + refPts.toLocaleString() + '</b>pts earned</div></div>' +
          '<button type="button" class="crm-demo" data-a="friend">▶ Demo: a friend joins with your code</button>' +
          '<button type="button" class="crm-demo" data-a="forder"' + (fr.length ? '' : ' disabled') + '>▶ Demo: your friend places an order</button></div>' +
        // activity
        '<div class="crm-box"><h4>📜 Points activity</h4><div class="crm-feed">' + ((me.ledger || []).map(function (l) {
          return '<div><span>' + e(l.t) + '</span><b class="' + (l.pts >= 0 ? 'plus' : 'minus') + '">' + (l.pts >= 0 ? '+' : '') + l.pts.toLocaleString() + '</b></div>'; }).join("") || '<div><span>Nothing yet. Scan at the register to start earning.</span></div>') + '</div></div>' +
        '<button type="button" class="go" style="background:#1a2656;box-shadow:none" data-a="owner">👀 See what the owner sees ↓</button>' +
        '<p class="crm-fine">Demo: points and friends here are saved on this phone only. Live, they\'re in the business\'s database, so they follow the customer to any phone.</p>';
      var qr = join.querySelector(".crm-qr");
      function showQR() {
        qr.style.display = "block";
        var box = qr.querySelector(".qr"), data = "SSAI:" + SLUG + ":" + me.id;
        function paint() { try { var q = window.qrcode(0, "M"); q.addData(data); q.make(); box.innerHTML = q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); } catch (x) { box.innerHTML = ""; } }
        if (window.qrcode) paint();
        else { var sc = document.createElement("script"); sc.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js"; sc.onload = paint; document.head.appendChild(sc); }
      }
      if (keepQR) showQR();
      join.onclick = function (ev) {
        var b = ev.target.closest("button"); if (!b) return;
        var a = b.dataset.a, m = mine()[0];
        if (b.dataset.redeem != null) {
          var t = TIERS[+b.dataset.redeem]; if (m.stars < t[0]) return;
          addPts(m, -t[0], "🎟️ Redeemed: " + t[1]); m.redeem = { t: t[1], c: "R-" + code4(4) }; put(m); drawJoin(); drawOwn(); toast("🎟️ " + t[1] + " is ready. Show your code."); return;
        }
        if (a === "bday") { m.bdemo = true; m.bcode = "BDAY-" + code4(4); m.ledger = m.ledger || []; m.ledger.unshift({ ts: Date.now(), pts: 0, t: "🎂 Birthday treat unlocked (text sent)" }); put(m); drawJoin(); toast("💬 Text sent: Happy birthday " + m.name.split(" ")[0] + "! Your treat is waiting 🎂"); return; }
        if (a === "scan") { if (qr.style.display === "block") qr.style.display = "none"; else showQR(); return; }
        if (a === "ring") {
          var amt = Math.round((12 + Math.random() * 26) * 100) / 100, got = visit(m, amt * PER);
          addPts(m, got, "🧾 In-store order $" + amt.toFixed(2) + " · code " + regCode(m)); m.visits = (m.visits || 0) + 1; m.last = Date.now(); put(m);
          drawJoin(true); drawOwn(); toast("+" + got + " points · $" + amt.toFixed(2) + " order"); return;
        }
        if (a === "receipt") {
          var inp = join.querySelector(".crm-rcode input"), v = inp.value.trim().toUpperCase();
          if (v.length < 6) { inp.placeholder = "Receipt codes are 6+ characters"; inp.value = ""; return; }
          if ((m.receipts = m.receipts || []).indexOf(v) >= 0) { toast("That receipt was already added"); return; }
          m.receipts.push(v); var ra = Math.round((9 + Math.random() * 22) * 100) / 100, rg = Math.round(ra * PER);
          addPts(m, rg, "🧾 Receipt " + v + " · $" + ra.toFixed(2)); m.visits = (m.visits || 0) + 1; m.last = Date.now(); put(m); drawJoin(); drawOwn(); toast("+" + rg + " points from your receipt"); return;
        }
        if (a === "text") { location.href = "sms:?&body=" + encodeURIComponent("Join " + NAME + " Rewards with my code " + m.ref + " and we both get " + REF.join + " points 🎁 " + shareLink(m)); return; }
        if (a === "copy") { var L = shareLink(m); (navigator.clipboard ? navigator.clipboard.writeText(L) : Promise.reject()).then(function () { toast("Invite link copied"); }, function () { prompt("Copy your invite link:", L); }); return; }
        if (a === "friend") {
          var used = m.friends.map(function (f) { return f.name; }), pool = FRIENDS.filter(function (n) { return used.indexOf(n) < 0; }), nm = pool.length ? pool[(Math.random() * pool.length) | 0] : "Friend " + (used.length + 1);
          m.friends.unshift({ name: nm, ts: Date.now(), orders: 0 });
          addPts(m, REF.join, "👋 " + nm + " joined with your code"); m.ledger[0].ref = 1;
          if (m.friends.length === REF.goal) { m.ledger.unshift({ ts: Date.now(), pts: 0, t: "🎁 " + REF.goal + " friends joined: " + REF.gift + " unlocked", ref: 1 }); toast("🎁 " + REF.gift + " unlocked!"); }
          else toast("+" + REF.join + " points · " + nm + " joined");
          put(m); drawJoin(); drawOwn(); return;
        }
        if (a === "forder") {
          if (!m.friends.length) return;
          var f = m.friends[(Math.random() * m.friends.length) | 0], firstOrder = f.orders === 0, p2 = firstOrder ? REF.first : REF.every; f.orders++;
          addPts(m, p2, (firstOrder ? "🛒 " + f.name + "'s first order" : "🔁 " + f.name + " ordered again")); m.ledger[0].ref = 1; put(m);
          drawJoin(); drawOwn(); toast("+" + p2 + " points · " + f.name + " ordered"); return;
        }
        if (a === "owner") own.scrollIntoView({ behavior: "smooth", block: "start" });
      };
      return;
    }
    var inviter = INVITE ? (refOwner(INVITE) || "A friend") : "", pw = pending();
    join.innerHTML = '<span class="k">' + e(NAME) + ' Rewards · free</span>' +
      (pw ? '<div class="crm-invited" style="border-color:#FFD23F;background:#FFD23F22;color:#FFE9A3">🏆 You won <b>' + e(pw.t) + '</b> in the game! Join below to save it, then show it at ' + e(NAME) + ' to redeem.</div>' : '') +
      (MISSED ? '<div class="crm-invited" style="border-color:#7FB3FF;background:#7FB3FF22;color:#DCE8FF">📞 Sorry we missed your call! Join below with your name and phone or email and get <b>' + e(MC.offer) + '</b> on your next visit. Just show your code at the counter.</div>' : '') +
      (INVITE ? '<div class="crm-invited">🤝 ' + e(inviter) + ' invited you! Join with code <b>' + e(INVITE) + '</b> and you get <b>+' + REF.join + ' bonus points</b>.</div>' : '') +
      '<div class="crm-gift"><b>🎁</b><span>Join now and get <u>' + e(OFFER) + '</u> instantly</span></div>' +
      '<h3>Unlock your reward</h3><p>Plus ' + PER + ' points for every $1, a birthday treat, and your own code to invite friends. Takes 10 seconds.</p>' +
      '<form autocomplete="on" novalidate><label>First name</label><input name="name" maxlength="40" autocomplete="given-name">' +
      '<div class="two"><div><label>Phone</label><input name="phone" type="tel" maxlength="20" autocomplete="tel" placeholder="(310) 555-0123"></div>' +
      '<div><label>or Email</label><input name="email" type="email" maxlength="120" autocomplete="email"></div></div>' +
      '<label>Birthday (for your free birthday treat)</label><div class="three"><select name="bday" aria-label="Birth month"><option value="">Month</option>' + MONTHS_L.map(function (m, i) { return '<option value="' + i + '">' + m + '</option>'; }).join("") + '</select>' +
        '<select name="bdd" aria-label="Birth day"><option value="">Day</option>' + Array.apply(null, Array(31)).map(function (x, i) { return '<option>' + (i + 1) + '</option>'; }).join("") + '</select>' +
        '<select name="bdy" aria-label="Birth year"><option value="">Year</option>' + Array.apply(null, Array(88)).map(function (x, i) { var y = new Date().getFullYear() - 13 - i; return '<option>' + y + '</option>'; }).join("") + '</select></div>' +
      '<div class="crm-idnote">🪪 Bring a photo ID that matches this birthday to claim your treat. We\'ll text you a reminder on the day.</div>' +
      '<label>Friend\'s referral code (optional)</label><input name="ref" maxlength="16" autocapitalize="characters" value="' + e(INVITE) + '" placeholder="e.g. MARIA-21">' +
      '<label class="ok"><input type="checkbox" name="ok"> <span>Text / email me rewards and specials from ' + e(NAME) + '. Msg & data rates may apply. Reply STOP anytime.</span></label>' +
      '<button class="go" type="submit">🎁 Get my reward</button><div class="err"></div></form>' +
      '<p class="crm-fine">Demo: what you type stays on this phone only.</p>';
    join.onclick = null;
    join.querySelector("form").onsubmit = function (ev) {
      ev.preventDefault();
      var f = this, er = f.querySelector(".err"), v = function (n) { return f[n].value.trim(); };
      if (!v("name")) { er.textContent = "Add your first name."; return; }
      if (!/\d{7,}/.test(v("phone").replace(/\D/g, "")) && !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(v("email"))) { er.textContent = "Add a phone number or an email so we can send your reward."; return; }
      if ((v("bday") !== "" || v("bdd") || v("bdy")) && !(v("bday") !== "" && v("bdd") && v("bdy"))) { er.textContent = "Add your full birthday (month, day and year) or leave it blank."; return; }
      if (v("bday") !== "" && new Date(+v("bdy"), +v("bday"), +v("bdd")).getMonth() !== +v("bday")) { er.textContent = "That birthday isn't a real date. Check the day."; return; }
      if (!f.ok.checked) { er.textContent = "Tick the box so we can send you your reward."; return; }
      var rc = v("ref").toUpperCase(), byName = rc ? refOwner(rc) : "";
      var r = { id: code4(8), name: v("name"), phone: v("phone"), email: v("email"), bday: v("bday") === "" ? -1 : +v("bday"), bdd: +v("bdd") || 0, bdy: +v("bdy") || 0, visits: 1, stars: 0, last: Date.now(), joined: Date.now(), code: code(), offer: OFFER,
        ref: refCode(v("name")), refBy: rc, refByName: rc ? (byName || "code " + rc) : "", friends: [], ledger: [] };
      addPts(r, 100, "🎉 Welcome to " + NAME + " Rewards");
      if (rc) addPts(r, REF.join, "🤝 Joined with " + (byName ? byName.split(" ")[0] + "'s" : "a friend's") + " code");
      var pz = pending(); if (pz) { r.wins = [pz]; r.ledger.unshift({ ts: Date.now(), pts: 0, t: "🏆 Won " + pz.t + " in the game" }); try { localStorage.removeItem(PEND); } catch (x) {} }
      else if (MISSED) { r.wins = [{ t: MC.offer, c: "CALL-" + code4(4), ts: Date.now(), ttl: (MC.days || 7) * 864e5, k: "missed" }]; r.ledger.unshift({ ts: Date.now(), pts: 0, t: "📞 Sorry we missed your call: " + MC.offer }); r.src = "missed call"; }
      var list = mine(); list.unshift(r); save(list.slice(0, 5));
      drawJoin(); drawOwn("all", true);
    };
  }

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
      '<div class="crm-seg">' + [["all", "Everyone"], ["new", "New"], ["vip", "VIP"], ["risk", "Hasn't been back"], ["bday", "Birthdays"]].map(function (x) { return '<button type="button" data-s="' + x[0] + '"' + (x[0] === seg ? ' class="on"' : '') + '>' + x[1] + '</button>'; }).join("") + '</div>' +
      '<div class="crm-list">' + pick.map(function (r, i) {
        return '<div class="crm-row' + (r.you ? ' you' : '') + '"><span class="crm-av" style="background:' + COLORS[i % COLORS.length] + '">' + e(r.name.charAt(0)) + '</span>' +
          '<span class="nm">' + e(r.name) + tags(r).map(function (t) { return '<span class="crm-tag ' + t[0] + '">' + t[1] + '</span>'; }).join("") + '</span>' +
          '<span class="st">' + (r.stars || 0).toLocaleString() + ' pts</span><span class="ct">' + e([r.phone, r.email].filter(Boolean).join(" · ") || "—") + ' · ' + r.visits + ' visit' + (r.visits === 1 ? '' : 's') + ' · last ' + ago(r.last) + '</span></div>';
      }).join("") + '</div>' +
      '<div class="crm-acts"><button type="button" class="hot" data-a="text">💬 Text this group</button><button type="button" data-a="csv">⬇️ Export list</button></div>' +
      '<div class="crm-compose"><textarea></textarea><div class="crm-bub"></div><p class="crm-fine" style="margin-bottom:0"></p></div>' +
      '<div class="crm-box"><h4>🧾 Register: add points by code</h4><p style="margin:0 0 8px;font-size:13px">Your cashier or bartender types the customer\'s 4-digit code and the total. Points post to their phone instantly.</p>' +
        '<div class="two"><input data-r="code" inputmode="numeric" maxlength="4" placeholder="4-digit code"><input data-r="amt" inputmode="decimal" placeholder="Total $"></div>' +
        '<button type="button" class="go" style="margin-top:8px;background:#2547B8;box-shadow:none" data-a="reg">Add points</button><div class="err" data-r="msg" style="color:#3DDC97"></div>' +
        '<h4 style="margin:16px 0 6px">🎟️ Redeem a reward code</h4><p style="margin:0 0 8px;font-size:13px">Guest shows a WIN-, R- or BDAY- code. Apply the matching discount in your POS (Toast, Square…), then mark it used here so it can never be used again. One reward per visit.</p>' +
        '<input data-r="rcode" placeholder="e.g. WIN-7K3P" maxlength="12" autocapitalize="characters" style="width:100%"><button type="button" class="go" style="margin-top:8px;background:#77242e;box-shadow:none" data-a="redeem">Mark used</button><div class="err" data-r="rmsg"></div>' +
        (mine()[0] ? '<p class="crm-fine" style="margin:4px 0 0">Demo tip: tap "Scan to earn" above to see your code, then enter it here.</p>' : '') + '</div>' +
      '<div class="crm-box crm-lead"><h4>🤝 Top referrers</h4><p style="margin:0;font-size:13px">Customers bringing you new customers. They earn +' + REF.join + ' when a friend joins and +' + REF.every + ' every time that friend orders.</p>' +
        rows.filter(function (r) { return r.nfr || (r.friends && r.friends.length); }).map(function (r) { return { n: r.name, f: r.nfr || r.friends.length, o: r.nfo != null ? r.nfo : r.friends.reduce(function (a, x) { return a + x.orders; }, 0), you: r.you }; })
          .sort(function (a, b) { return b.f - a.f || b.o - a.o; }).slice(0, 6).map(function (x, i) {
            return '<div><span class="r">' + (i + 1) + '</span><span><b>' + e(x.n) + '</b>' + (x.you ? ' <span class="crm-tag t-you">YOU</span>' : '') + '<br><span style="color:#9AA6CC">' + x.f + ' friend' + (x.f === 1 ? '' : 's') + ' joined · ' + x.o + ' orders from them</span></span><b style="color:#3DDC97">+' + (x.f * REF.join + Math.min(x.o, x.f) * REF.first + Math.max(0, x.o - x.f) * REF.every).toLocaleString() + '</b></div>'; }).join("") + '</div>' +
      '<p class="crm-fine">Sample customers (made up) plus anyone who joins on this phone. Live, this list fills from real signups at your tables, and texts go only to people who opted in.</p>';
    own.querySelectorAll(".crm-seg button").forEach(function (b) { b.onclick = function () { drawOwn(b.dataset.s); }; });
    var cmp = own.querySelector(".crm-compose"), ta = cmp.querySelector("textarea");
    own.querySelector('[data-a="reg"]').onclick = function () {
      var c4 = own.querySelector('[data-r="code"]').value.trim(), amt = parseFloat(own.querySelector('[data-r="amt"]').value.replace(/[^0-9.]/g, "")), msg = own.querySelector('[data-r="msg"]'), m = mine()[0];
      if (!/^\d{4}$/.test(c4) || !(amt > 0)) { msg.style.color = "#FF6B5E"; msg.textContent = "Enter the 4-digit code and the order total."; return; }
      if (!m || regCode(m) !== c4) { msg.style.color = "#FF6B5E"; msg.textContent = "No customer has that code right now. Codes change every 5 minutes."; return; }
      var got = visit(m, amt * PER); addPts(m, got, "🧾 Register order $" + amt.toFixed(2) + " · code " + c4); m.visits = (m.visits || 0) + 1; m.last = Date.now(); put(m);
      drawJoin(); drawOwn(); toast("+" + got + " points added to " + m.name.split(" ")[0]);
    };
    own.querySelector('[data-a="redeem"]').onclick = function () {
      var c = own.querySelector('[data-r="rcode"]').value.trim().toUpperCase(), msg = own.querySelector('[data-r="rmsg"]'), m = mine()[0], hit = null, kind = "";
      var bad = function (t) { msg.style.color = "#FF6B5E"; msg.textContent = t; };
      if (!c) return bad("Type the code from the guest's phone.");
      if (m) { (m.wins || []).forEach(function (w) { if (w.c === c) { hit = w; kind = "win"; } }); if (!hit && m.redeem && m.redeem.c === c) { hit = m.redeem; kind = "pts"; } if (!hit && m.bcode === c) { hit = { c: c, t: "Birthday treat", ts: Date.now() }; kind = "bday"; } }
      if (!hit) return bad("No reward with that code. Check the letters, or it may belong to another phone (live: every code is looked up in your database).");
      if (hit.used || (m.bused && kind === "bday")) return bad("Already used on " + new Date(hit.used || m.bused).toLocaleString() + ". Each code works once.");
      if (kind === "win" && Date.now() - hit.ts >= (hit.ttl || WIN_TTL)) return bad("Expired " + until(hit) + ".");
      if (m.lastRedeem && Date.now() - m.lastRedeem < 4 * 36e5) return bad("This guest already used a reward this visit. One reward per visit.");
      if (kind === "bday") m.bused = Date.now(); else hit.used = Date.now();
      m.lastRedeem = Date.now(); (m.ledger = m.ledger || []).unshift({ ts: Date.now(), pts: 0, t: "✅ Redeemed " + hit.t + " · " + c }); put(m);
      msg.style.color = "#3DDC97"; msg.textContent = "✅ " + hit.t + " redeemed. Apply the matching discount in your POS."; drawJoin(); toast("✅ " + c + " used");
    };
    var DEF = { all: "Hey {first}! Double stars at " + NAME + " this week only 🔥", new: "Welcome to the club, {first}! Your next visit earns 2× stars.",
      vip: "{first}, you're one of our VIPs 👑 Next one's on us this week.", risk: "Hey {first}, we miss you! 👀 Come back this week for 2× stars.",
      bday: "Happy birthday {first}! 🎂 Your free treat is waiting. Show your code + a photo ID at the counter." };
    function preview() {
      var who = pick.filter(function (r) { return r.phone || r.email; }), first = who[0] ? who[0].name.split(" ")[0] : "there";
      cmp.querySelector(".crm-bub").textContent = ta.value.replace(/\{first\}/g, first);
      cmp.querySelector(".crm-fine").textContent = "Would go to " + who.length + " customer" + (who.length === 1 ? "" : "s") + " in this group. Demo: nothing is sent.";
    }
    ta.oninput = preview;
    own.querySelector('[data-a="text"]').onclick = function () { cmp.style.display = "block"; ta.value = DEF[seg] || DEF.all; preview(); ta.focus(); };
    own.querySelector('[data-a="csv"]').onclick = function () {
      var q = function (v) { return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"'; };
      var csv = ["name,phone,email,visits,points,last_visit,joined,birthday,referral_code,referred_by,friends_referred"].concat(all().map(function (r) {
        return [r.name, r.phone, r.email, r.visits, r.stars, new Date(r.last).toISOString().slice(0, 10), new Date(r.joined).toISOString().slice(0, 10), r.bday >= 0 ? (r.bdy ? r.bdy + "-" + ("0" + (r.bday + 1)).slice(-2) + "-" + ("0" + r.bdd).slice(-2) : MONTHS[r.bday]) : "", r.ref || "", r.refByName || "", r.nfr || (r.friends ? r.friends.length : "")].map(q).join(",");
      })).join("\n");
      var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = SLUG + "-customers.csv"; document.body.appendChild(a); a.click(); a.remove();
    };
    if (flash) setTimeout(function () { var y = own.querySelector(".crm-row.you"); if (y) y.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, 80);
  }

  var mount = C.mount && document.querySelector(C.mount);
  if (mount) { mount.appendChild(join); mount.appendChild(own); }
  else {
    var ref = document.querySelector("#ssai-n") || document.querySelector("#ssai-k") || document.querySelector("footer");
    if (ref && ref.parentNode) { ref.parentNode.insertBefore(join, ref); ref.parentNode.insertBefore(own, ref); }
    else { document.body.appendChild(join); document.body.appendChild(own); }
  }
  drawJoin(); drawOwn("all");
})();
