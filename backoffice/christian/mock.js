/* Christian HQ TEST MODE (?test=1 only). A fake backend that behaves like Code.gs, with made-up guests
   ("Test Guest 01", guest01@example.com, 555 numbers). Nothing here is real and nothing is ever sent:
   the "emailed" one-time code is shown on screen instead. Test logins: user christian or antidote,
   password "test-mode-only" (works ONLY against this fake backend, never the real one). */
(function () {
  "use strict";
  var seed = 7; function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function pick(a) { return a[Math.floor(rnd() * a.length)]; }
  var DAY = 864e5, now = Date.now(), slugs = ["melody-bar-grill", "nalu-vida"], members = [], games = [], opens = [], redeems = [], claims = [], staff = [], trained = [], audit = [], disc = {};
  for (var i = 1; i <= 46; i++) {
    var n = ("0" + i).slice(-2), slug = i % 3 === 0 ? "nalu-vida" : "melody-bar-grill", joined = now - Math.floor(rnd() * 34) * DAY - Math.floor(rnd() * DAY);
    var earned = 100 + Math.floor(rnd() * 26) * 60, spent = rnd() < 0.35 ? pick([250, 500, 750]) : 0; spent = Math.min(spent, earned);
    members.push({ slug: slug, id: "TEST" + n + "XY", name: "Test Guest " + n, phone: "(555) 010-00" + n, email: "guest" + n + "@example.com", bday: rnd() < 0.5 ? (1 + (i % 12)) + "/" + (1 + (i % 27)) + "/1990" : "",
      joined: joined, last: Math.min(now, joined + Math.floor(rnd() * 10) * DAY), stars: earned - spent, earned: earned, spent: spent, visits: 1 + Math.floor(rnd() * 6), ref: "GUEST" + n + "-K9",
      refBy: i > 6 && rnd() < 0.25 ? "GUEST0" + (1 + (i % 6)) + "-K9" : "", friends: 0, gamePts: Math.floor(rnd() * 200), redeems: spent ? 1 : 0, sms: rnd() < 0.4 ? "yes" : "no", smsAt: "", src: pick(["table QR", "window poster", "app", "referral"]) });
  }
  members.forEach(function (m) { if (m.refBy) members.forEach(function (x) { if (x.ref === m.refBy) x.friends++; }); });
  function ymd(t) { return new Date(t).toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" }); }
  for (var g = 0; g < 380; g++) { var t = now - Math.floor(rnd() * 30) * DAY, m = rnd() < 0.6 ? pick(members) : null, sc = Math.floor(rnd() * 9000);
    games.push([m ? m.slug : pick(slugs), ymd(t), m ? m.id : "", "DEV" + Math.floor(rnd() * 90), sc, Math.min(50, Math.floor(sc / 100))]); }
  for (var o = 0; o < 520; o++) { var t2 = now - Math.floor(rnd() * 30) * DAY; opens.push([pick(slugs), ymd(t2), "DEV" + Math.floor(rnd() * 120), rnd() < 0.3 ? 1 : 0]); }
  members.filter(function (m) { return m.spent; }).forEach(function (m, k) { var t3 = now - Math.floor(rnd() * 20) * DAY;
    redeems.push({ ts: t3, code: (m.slug === "nalu-vida" ? "NV-" : "MEL-") + "T" + ("00" + k).slice(-3), slug: m.slug, day: ymd(t3), member: m.id, name: m.name, reward: m.spent >= 500 ? "Free starter (test)" : "Free soft drink (test)", button: "App Reward – Test", pts: m.spent }); });
  for (var c = 0; c < 24; c++) { var mm = pick(members), t4 = now - Math.floor(rnd() * 14) * DAY;
    claims.push({ ts: t4, id: "CTEST" + c, slug: mm.slug, check: String(100 + c), date: ymd(t4), total: Math.round(rnd() * 9000) / 100 + 12, pts: 0, member: mm.id, name: mm.name, status: pick(["pending", "approved", "approved", "flagged"]), photo: rnd() < 0.6 ? 1 : 0 }); }
  claims.forEach(function (x) { x.pts = Math.floor(Math.min(x.total, 150) * 10); });
  ["Ana", "Luis", "Kai", "Mo"].forEach(function (nm, k) { for (var r = 0; r < 4 + k; r++) staff.push([pick(slugs), ymd(now - r * DAY), nm, pick(["Melody Approach", "Ride the Nalu"]), Math.floor(rnd() * 8000), Math.floor(rnd() * 80)]); });
  trained.push([ymd(now - 2 * DAY), "Ana", 92, "yes"], [ymd(now - DAY), "Luis", 75, "no"]);
  var USERS = { christian: { name: "Christian", email: "christian@example.com" }, antidote: { name: "Antidote", email: "antidote@example.com" } }, TOK = {}, PEND = {}, fails = 0;
  function label(f) { return { pts: "Points cost", amount: "$ off", percent: "% off", label: "Reward name" }[f] || f; }
  var EB = { "melody-bar-grill": {}, "nalu-vida": {} };
  function ebValid(f, v) {
    v = String(v == null ? "" : v).trim();
    if (f === "on") return v === "on" || v === "off" ? v : null;
    if (f === "golive" || f === "drawDate") return /^20\d\d-[01]\d-[0-3]\d$/.test(v) ? v : null;
    if (f === "mode") return /^(fixed|wheel|raffle)$/.test(v) ? v : null;
    if (f === "gift") return v.length >= 3 && v.length <= 60 ? v : null;
    if (f === "draw") return v === "now" ? v : null;
    var a; try { a = JSON.parse(v); } catch (x) { return null; } if (!Array.isArray(a) || !a.length || a.length > 8) return null;
    if (!a.every(function (r) { return r[0] && String(r[0]).length >= 3 && +r[1] >= 1 && Math.round(+r[1]) === +r[1]; })) return null;
    if (f === "slices") return a.length >= 2 && a.reduce(function (x, r) { return x + r[1]; }, 0) === 100 ? v : null;
    if (f === "items") return v;
    return null;
  }
  function ebStats() { var o = {}; Object.keys(EB).forEach(function (s) { var q = members.filter(function (m) { return m.slug === s; }).length, c = EB[s];
    o[s] = { cfg: c, qualify: c.golive ? q : 0, activated: c.on === "on" ? Math.floor(q / 3) : 0, redeemed: c.on === "on" ? Math.floor(q / 5) : 0, won: c.drawn ? c.won || 0 : 0, items: {} }; }); return o; }
  function valid(key, field, v) {
    if (key === "eb") return ebValid(field, v);
    if (!/^(t[0-9]|jl)$/.test(key)) return null;
    if (key === "jl") { v = Math.round(+v); return field === "percent" && v >= 1 && v <= 50 ? v : null; }
    if (field === "pts") { v = Math.round(+v); return v >= 50 && v <= 10000 ? v : null; }
    if (field === "amount") { v = Math.round(+v * 100) / 100; return v >= 1 && v <= 100 ? v : null; }
    if (field === "label") { v = String(v || "").replace(/[<>]/g, "").trim(); return v.length >= 3 && v.length <= 80 ? v : null; }
    return null;
  }
  function handle(d) {
    if (d.type === "bo_login") {
      if (fails >= 10) return { ok: false, reason: "Too many wrong tries. Wait 15 minutes, then try again." };
      if (!USERS[d.user] || d.pw !== "test-mode-only") { fails++; return { ok: false, reason: "Wrong name or password." }; }
      var tk = "TEST" + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + "x".repeat(20); TOK[tk] = d.user; return { ok: true, token: tk, name: USERS[d.user].name };
    }
    var u = TOK[d.token]; if (!u) return { ok: false, auth: false, reason: "Signed out. Log in again." };
    if (d.type === "bo_logout") { delete TOK[d.token]; return { ok: true }; }
    if (d.type === "bo_summary") return { ok: true, members: members.length, joined7: members.filter(function (m) { return m.joined > now - 7 * DAY; }).length, plays7: games.length, redeems7: redeems.length, pendingClaims: claims.filter(function (x) { return x.status === "pending"; }).length };
    if (d.type === "bo_data") return { ok: true, test: true, eb: ebStats(), me: USERS[u].name, now: Date.now(), members: members, games: games, opens: opens, redeems: redeems, claims: claims, staff: staff, trained: trained, audit: audit, disc: disc };
    if (d.type === "disc_propose") {
      var v = valid(d.key, d.field, d.value); if (v == null) return { ok: false, reason: "That value isn't allowed. Points 50–10,000 · $ off 1–100 · percent 1–50 · names 3–80 characters." };
      var cur = d.key === "eb" ? (EB[d.slug][d.field] != null ? EB[d.slug][d.field] : d.field === "on" ? "off" : d.field === "draw" ? "not drawn" : "(not set)") : disc[d.slug] && disc[d.slug][d.key] && disc[d.slug][d.key][d.field], id = "P" + Math.random().toString(36).slice(2, 10), code = String(100000 + Math.floor(Math.random() * 900000));
      PEND[id] = { user: u, slug: d.slug, key: d.key, field: d.field, value: v, before: cur != null ? cur : d.before, reward: d.reward, code: code, tries: 0, exp: Date.now() + 6e5 };
      return { ok: true, id: id, sentTo: USERS[u].email.replace(/^(.).*(@.*)$/, "$1•••$2"), before: PEND[id].before, after: v, testCode: code };
    }
    if (d.type === "disc_confirm") {
      var p = PEND[d.id]; if (!p || p.exp < Date.now()) return { ok: false, reason: "That code expired. Press Save again to get a new one." };
      if (p.user !== u) return { ok: false, reason: "This change was started by someone else." };
      if (String(d.code) !== p.code) { if (++p.tries >= 5) { delete PEND[d.id]; return { ok: false, reason: "5 wrong codes. Start again." }; } return { ok: false, reason: "Wrong code. " + (5 - p.tries) + " tries left." }; }
      delete PEND[d.id];
      if (p.key === "eb") {
        var E = EB[p.slug];
        if (p.field === "draw") { if (E.mode !== "raffle" || E.drawn) return { ok: false, reason: E.drawn ? "Winners were already drawn." : "The gift isn't in raffle mode." };
          var items = JSON.parse(E.items || "[]"), w = Math.min(members.filter(function (m) { return m.slug === p.slug; }).length, items.reduce(function (x, r) { return x + r[1]; }, 0));
          E.drawn = new Date().toLocaleDateString("en-CA"); E.won = w; p.before = "not drawn"; p.value = "drawn: " + w + " winner(s)"; }
        else E[p.field] = p.value;
        audit.push({ ts: Date.now(), who: USERS[u].name, slug: p.slug === "nalu-vida" ? "Nalu Vida" : "Melody Bar & Grill", reward: "Early-bird gift", field: p.field, before: p.before, after: p.value, status: "applied" });
        return { ok: true, slug: p.slug, key: "eb", field: p.field, before: p.before, after: p.value, disc: disc, testNotice: "TEST MODE: no email sent. Live, the other login holder would be emailed about this change." };
      }
      ((disc[p.slug] = disc[p.slug] || {})[p.key] = disc[p.slug][p.key] || {})[p.field] = p.value;
      var other = Object.keys(USERS).filter(function (k) { return k !== u; })[0];
      audit.push({ ts: Date.now(), who: USERS[u].name, slug: p.slug === "nalu-vida" ? "Nalu Vida" : "Melody Bar & Grill", reward: p.reward, field: label(p.field), before: p.before, after: p.value, status: "applied" });
      return { ok: true, slug: p.slug, key: p.key, field: p.field, before: p.before, after: p.value, disc: disc,
        testNotice: "TEST MODE: no email sent. Live, " + USERS[other].name + " would get: “" + USERS[u].name + " changed " + (p.slug === "nalu-vida" ? "Nalu Vida" : "Melody") + " '" + p.reward + "' " + label(p.field).toLowerCase() + " from " + p.before + " to " + p.value + " at " + new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) + "”" };
    }
    return { ok: false };
  }
  window.HQ_MOCK = function (body) { return new Promise(function (res) { setTimeout(function () { res(JSON.parse(JSON.stringify(handle(JSON.parse(JSON.stringify(body)))))); }, 120); }); };
})();
