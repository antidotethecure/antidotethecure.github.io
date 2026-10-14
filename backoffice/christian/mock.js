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
    var ABC = "ABCDEFGHJKMNPQRSTUVWXYZ23456789", cid = ""; for (var q = 0; q < 5; q++) cid += ABC[Math.floor(rnd() * ABC.length)];
    members.push({ card: (slug === "nalu-vida" ? "NLV-" : "MLD-") + cid, slug: slug, id: "TEST" + n + "XY", name: "Test Guest " + n, phone: "(555) 010-00" + n, email: "guest" + n + "@example.com", bday: rnd() < 0.5 ? (1 + (i % 12)) + "/" + (1 + (i % 27)) + "/1990" : "",
      joined: joined, last: Math.min(now, joined + Math.floor(rnd() * 10) * DAY), stars: earned - spent, earned: earned, spent: spent, visits: 1 + Math.floor(rnd() * 6), ref: "GUEST" + n + "-K9",
      refBy: i > 6 && rnd() < 0.25 ? "GUEST0" + (1 + (i % 6)) + "-K9" : "", friends: 0, gamePts: Math.floor(rnd() * 200), redeems: spent ? 1 : 0, sms: rnd() < 0.4 ? "yes" : "no", smsAt: "", src: pick(["table QR", "window poster", "app", "referral"]) });
  }
  members.forEach(function (m) { if (m.refBy) members.forEach(function (x) { if (x.ref === m.refBy) x.friends++; }); });
  function ymd(t) { return new Date(t).toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" }); }
  for (var g = 0; g < 380; g++) { var t = now - Math.floor(rnd() * 30) * DAY, m = rnd() < 0.6 ? pick(members) : null, sc = Math.floor(rnd() * 9000);
    games.push([m ? m.slug : pick(slugs), ymd(t), m ? m.id : "", "DEV" + Math.floor(rnd() * 90), sc, Math.min(50, Math.floor(sc / 100))]); }
  // 📍 visit log (made-up): [slug, day, device, home screen, server ms, member, local time, device summary, lat, lng, accuracy m]
  // like Code.gs data(). 120 phones; every 2nd member is linked to one; DEV7 is a heavy opener (dozens of opens a day,
  // linked to Test Guest 04) and DEV9 a heavy opener who never joined. ~30% of phones have location on.
  var DEVS = ["iPhone · iOS 18.6 · Safari", "iPhone · iOS 18.6 · Instagram app", "iPhone · iOS 17.5 · Safari", "iPhone · iOS 18.6 · Chrome", "Samsung · Android 14 · Chrome", "Samsung · Android 15 · Samsung Internet", "Pixel · Android 15 · Chrome", "Motorola · Android 13 · Chrome", "Desktop · Mac · Chrome", "Desktop · Windows · Edge"],
    SPOT = { "melody-bar-grill": [33.95, -118.40], "nalu-vida": [33.99, -118.47] }, dv = [];
  members.forEach(function (m, k) { if (k % 2 === 1) m.dev = "DEV" + (k * 2 + 1); });
  for (var d = 0; d < 120; d++) dv.push({ id: "DEV" + d, ua: d === 7 ? DEVS[1] : d === 9 ? DEVS[4] : pick(DEVS), pwa: rnd() < 0.35, loc: d === 7 || d === 9 || rnd() < 0.3, far: rnd() < 0.15, slug: pick(slugs) });
  members.forEach(function (m) { if (m.dev) dv[+m.dev.slice(3)].slug = m.slug; });
  function hourPick() { var r = rnd(); return r < 0.4 ? 11 + rnd() * 3 : r < 0.85 ? 17 + rnd() * 5 : 8 + rnd() * 15; }   // lunch + dinner rush
  function addOpen(v, t) { if (t > now) t = now - Math.floor(rnd() * 36e5); var mm = members.filter(function (x) { return x.dev === v.id; })[0], sp = SPOT[v.slug], ll = null;
    if (v.loc) ll = v.far ? [34.05 + Math.round(rnd() * 8) / 100, -118.25 - Math.round(rnd() * 8) / 100] : [sp[0] + (rnd() < 0.7 ? 0 : 0.01), sp[1] + (rnd() < 0.7 ? 0 : -0.01)];
    opens.push([v.slug, ymd(t), v.id, v.pwa ? 1 : 0, t, mm ? mm.id : "", new Date(t).toLocaleString("sv-SE", { timeZone: "America/Los_Angeles" }).replace(" ", "T") + "-07:00", v.ua,
      ll ? Math.round(ll[0] * 100) / 100 : null, ll ? Math.round(ll[1] * 100) / 100 : null, ll ? 12 + Math.floor(rnd() * 60) : null]); }
  function dayStart(k) { var x = now - k * DAY; return x - ((+new Date(x).toLocaleString("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", hour12: false }) % 24) * 36e5) - (new Date(x).getMinutes() * 6e4); }
  for (var o = 0; o < 520; o++) addOpen(dv[Math.floor(rnd() * 120)], dayStart(Math.floor(rnd() * 30)) + Math.floor(hourPick() * 36e5));
  for (var k7 = 0; k7 < 14; k7++) { var nn = 3 + Math.floor(rnd() * (k7 < 3 ? 9 : 5)); for (var z = 0; z < nn; z++) addOpen(dv[7], dayStart(k7) + Math.floor((9 + rnd() * 14) * 36e5)); }
  for (var k9 = 0; k9 < 6; k9++) for (var z9 = 0; z9 < 4; z9++) addOpen(dv[9], dayStart(k9) + Math.floor((10 + rnd() * 12) * 36e5));
  opens.sort(function (a, b) { return a[4] - b[4]; });
  members.filter(function (m) { return m.spent; }).forEach(function (m, k) { var t3 = now - Math.floor(rnd() * 20) * DAY;
    redeems.push({ ts: t3, code: (m.slug === "nalu-vida" ? "NV-" : "MEL-") + "T" + ("00" + k).slice(-3), slug: m.slug, day: ymd(t3), member: m.id, name: m.name, reward: m.spent >= 500 ? "Free starter (test)" : "Free soft drink (test)", button: "App Reward – Test", pts: m.spent }); });
  for (var c = 0; c < 24; c++) { var mm = pick(members), t4 = now - Math.floor(rnd() * 14) * DAY;
    claims.push({ ts: t4, id: "CTEST" + c, slug: mm.slug, check: String(100 + c), date: ymd(t4), total: Math.round(rnd() * 9000) / 100 + 12, pts: 0, member: mm.id, name: mm.name, status: pick(["pending", "approved", "approved", "flagged"]), photo: rnd() < 0.6 ? 1 : 0 }); }
  claims.forEach(function (x) { x.pts = Math.floor(Math.min(x.total, 150) * 10); });
  ["Ana", "Luis", "Kai", "Mo"].forEach(function (nm, k) { for (var r = 0; r < 4 + k; r++) staff.push([pick(slugs), ymd(now - r * DAY), nm, pick(["Melody Approach", "Ride the Nalu"]), Math.floor(rnd() * 8000), Math.floor(rnd() * 80)]); });
  trained.push([ymd(now - 2 * DAY), "Ana", 92, "yes"], [ymd(now - DAY), "Luis", 75, "no"]);
  // 🛡️ Scout (made-up): duplicates the fake server rejected + open flags, same shapes as Code.gs scoutData()
  var M = function (n) { return members[n - 1]; }, H = 36e5;
  var scout = { adjustments: [], rejected: [
    { ts: now - 2 * H, slug: M(1).slug, member: M(1).id, name: M(1).name, dev: "DEV12", kind: "receipt claim", what: "Check #142 · " + ymd(now) + " · $48.50", why: "Same check # + date at this restaurant" },
    { ts: now - 3 * H, slug: M(2).slug, member: M(2).id, name: M(2).name, dev: "DEV40", kind: "redemption", what: "Free soft drink (test)", why: "Pass code MEL-T001 was already used" },
    { ts: now - 5 * H, slug: M(4).slug, member: M(4).id, name: M(4).name, dev: "DEV17", kind: "game points", what: "Game · score 4200 · 42 pts", why: "Daily game cap (50 pts) already reached by this member or phone" },
    { ts: now - 9 * H, slug: M(5).slug, member: M(5).id, name: M(5).name, dev: "DEV17", kind: "receipt claim", what: "Check #155 · " + ymd(now - DAY) + " · $61.20", why: "Same total $61.20 claimed by another member (Test G.) 4 min earlier" },
    { ts: now - 26 * H, slug: M(7).slug, member: M(7).id, name: M(7).name, dev: "DEV55", kind: "points award", what: "join bonus · 100 pts", why: "Already credited 1x (once ever)" },
    { ts: now - 30 * H, slug: M(3).slug, member: M(3).id, name: M(3).name, dev: "DEV60", kind: "receipt claim", what: "Check #88 · " + ymd(now - DAY) + " · $33.00", why: "Same receipt photo as an earlier claim" },
    { ts: now - 50 * H, slug: M(8).slug, member: M(8).id, name: M(8).name, dev: "DEV61", kind: "redemption", what: "Free starter (test)", why: "Double tap: same member + reward within 30 s" } ], flags: [
    { id: "device:a1b2c3d4e5f60718", kind: "device", slug: "melody-bar-grill", sev: "high", title: "5 members on one phone", reason: "One phone (DEV17) used 5 different member accounts. Real guests have one account each.",
      members: [1, 2, 4, 5, 7].map(function (n) { return M(n).id; }), evidence: [1, 2, 4, 5, 7].map(function (n) { return M(n).name + " (" + M(n).id + ")"; }), pts: 0, claims: [], status: "open" },
    { id: "referral_ring:b2c3d4e5f6071829", kind: "referral_ring", slug: "melody-bar-grill", sev: "high", title: "Referral loop of 2 members", reason: "These members referred each other in a loop, so each collects referral points from the others.",
      members: [M(10).id, M(11).id], evidence: [M(10).name + " used code " + M(11).ref, M(11).name + " used code " + M(10).ref], pts: 200, claims: [], status: "open" },
    { id: "under_cap:c3d4e5f60718293a", kind: "under_cap", slug: "melody-bar-grill", sev: "medium", title: "2 receipts just under the $150 cap", reason: M(13).name + " claimed 2 checks between $135 and $150 in 30 days. Compare with Toast.",
      members: [M(13).id], evidence: ["#171 · " + ymd(now - 3 * DAY) + " · $148.75 · 1487 pts", "#190 · " + ymd(now - DAY) + " · $149.50 · 1495 pts"], pts: 2982, claims: ["CTEST3", "CTEST4"], status: "open" },
    { id: "fast_redeem:d4e5f60718293a4b", kind: "fast_redeem", slug: "nalu-vida", sev: "medium", title: "Reward used 40 min after joining", reason: M(6).name + " joined and used Free shareable (test) (500 pts) 40 minutes later.",
      members: [M(6).id], evidence: ["Pass NV-T009 · Free shareable (test)"], pts: 500, claims: [], status: "open" },
    { id: "phone_pattern:e5f60718293a4b5c", kind: "phone_pattern", slug: "nalu-vida", sev: "medium", title: "3 sign-ups with look-alike phone numbers", reason: "3 members joined this week with phone numbers that differ only in the last 2 digits (555-010-00xx).",
      members: [M(9).id, M(12).id, M(15).id], evidence: [M(9).name + " · …0009", M(12).name + " · …0012", M(15).name + " · …0015"], pts: 0, claims: [], status: "open" },
    { id: "velocity:f60718293a4b5c6d", kind: "velocity", slug: "melody-bar-grill", sev: "medium", title: "1,280 points in 24 hours", reason: M(14).name + " earned 1280 points in the last 24 hours (4 events). A normal visit is a few hundred.",
      members: [M(14).id], evidence: ["24 h total: 1280 pts"], pts: 1280, claims: [], status: "open" } ] };
  scout.flags.push({ id: "dup_tries:0718293a4b5c6d7e", kind: "dup_tries", slug: "melody-bar-grill", sev: "low", title: "3 duplicate tries in 7 days", reason: M(4).name + " sent 3 things that were already counted this week.", members: [M(4).id], evidence: ["game points · Daily game cap reached", "receipt claim · Same check # + date", "redemption · Double tap"], pts: 0, claims: [], status: "open" });
  var USERS = { christian: { name: "Christian", email: "christian@example.com" }, antidote: { name: "Antidote", email: "antidote@example.com" } }, TOK = {}, PEND = {}, fails = 0;
  function label(f, k) { if (k === "lb") return f === "on" ? "Location bonus on/off" : "Location bonus points"; return { pts: "Points cost", amount: "$ off", percent: "% off", label: "Reward name" }[f] || f; }
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
    if (key === "lb") { if (field === "on") return v === "on" || v === "off" ? v : null; if (field === "pts") { v = Math.round(+v); return v >= 10 && v <= 1000 ? v : null; } return null; }
    if (key === "scout") { v = String(v || ""); var fid = /^[a-z_]{3,20}:[0-9a-f]{16}$/, sp = v.split("|");
      if (field === "ok") return fid.test(v) ? v : null;
      if (field === "reverse") return sp.length === 3 && fid.test(sp[0]) && /^[A-Z0-9]{4,16}$/.test(sp[1]) && +sp[2] >= 1 && +sp[2] <= 20000 ? sp[0] + "|" + sp[1] + "|" + Math.round(+sp[2]) : null;
      return null; }
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
    if (d.type === "squares_admin") return window.SQUARES_MOCK ? window.SQUARES_MOCK(Object.assign({}, d, { by: USERS[u].name })) : { ok: false, reason: "Test squares backend missing" };   // demo/sports/squares-mock.js
    if (d.type === "bo_dedupe") return { ok: true, removed: 0 };
    if (d.type === "bo_logout") { delete TOK[d.token]; return { ok: true }; }
    if (d.type === "bo_summary") return { ok: true, members: members.length, joined7: members.filter(function (m) { return m.joined > now - 7 * DAY; }).length, plays7: games.length, redeems7: redeems.length, pendingClaims: claims.filter(function (x) { return x.status === "pending"; }).length };
    if (d.type === "bo_data") return { ok: true, test: true, scout: scout, restores7: { "melody-bar-grill": 2, "nalu-vida": 1 }, oneprize: { "melody-bar-grill": { codes: 7, used: 5, expired: 2, refused: 3, mins: 10 }, "nalu-vida": { codes: 4, used: 4, expired: 0, refused: 1, mins: 10 } }, eb: ebStats(), me: USERS[u].name, now: Date.now(), members: members, games: games, opens: opens, redeems: redeems, claims: claims, staff: staff, trained: trained, audit: audit, disc: disc, lb: { "melody-bar-grill": { credited: 3, devices: 11 } } };
    if (d.type === "disc_propose") {
      var v = valid(d.key, d.field, d.value); if (v == null) return { ok: false, reason: "That value isn't allowed. Points 50–10,000 · $ off 1–100 · percent 1–50 · names 3–80 characters · location bonus 10–1,000." };
      var cur = d.key === "scout" ? "open" : d.key === "eb" ? (EB[d.slug][d.field] != null ? EB[d.slug][d.field] : d.field === "on" ? "off" : d.field === "draw" ? "not drawn" : "(not set)") : disc[d.slug] && disc[d.slug][d.key] && disc[d.slug][d.key][d.field], id = "P" + Math.random().toString(36).slice(2, 10), code = String(100000 + Math.floor(Math.random() * 900000));
      PEND[id] = { user: u, slug: d.slug, key: d.key, field: d.field, value: v, before: cur != null ? cur : d.before, reward: d.reward, code: code, tries: 0, exp: Date.now() + 6e5 };
      return { ok: true, id: id, sentTo: USERS[u].email.replace(/^(.).*(@.*)$/, "$1•••$2"), before: PEND[id].before, after: v, testCode: code };
    }
    if (d.type === "disc_confirm") {
      var p = PEND[d.id]; if (!p || p.exp < Date.now()) return { ok: false, reason: "That code expired. Press Save again to get a new one." };
      if (p.user !== u) return { ok: false, reason: "This change was started by someone else." };
      if (String(d.code) !== p.code) { if (++p.tries >= 5) { delete PEND[d.id]; return { ok: false, reason: "5 wrong codes. Start again." }; } return { ok: false, reason: "Wrong code. " + (5 - p.tries) + " tries left." }; }
      delete PEND[d.id];
      if (p.key === "scout") {
        var sp = String(p.value).split("|"), fl = scout.flags.filter(function (f) { return f.id === sp[0]; })[0], msg = "flag marked OK", nm2 = USERS[u].name;
        if (p.field === "reverse") { var who = members.filter(function (m) { return m.id === sp[1]; })[0];
          scout.adjustments.unshift({ ts: Date.now(), slug: p.slug, member: sp[1], name: who ? who.name : sp[1], pts: -(+sp[2]), why: "Points reversed by " + nm2 + " (Scout)", by: nm2 });
          if (who) { who.stars = Math.max(0, who.stars - sp[2]); who.earned = Math.max(0, who.earned - sp[2]); }
          if (fl && fl.claims.length) claims.forEach(function (c) { if (fl.claims.indexOf(c.id) >= 0 && c.member === sp[1]) c.status = "void"; });
          msg = sp[2] + " points reversed for member " + sp[1]; }
        if (fl) { fl.status = p.field === "reverse" ? "reversed" : "ok"; fl.reviewedBy = nm2; fl.reviewedAt = Date.now(); }
        audit.push({ ts: Date.now(), who: nm2, slug: p.slug === "nalu-vida" ? "Nalu Vida" : "Melody Bar & Grill", reward: p.reward, field: p.field === "reverse" ? "Scout: reverse points" : "Scout: mark OK", before: "open", after: p.value, status: "applied: " + msg });
        return { ok: true, slug: p.slug, key: "scout", field: p.field, before: "open", after: msg, scout: scout, testNotice: "TEST MODE: no email sent. Live, the other login holder is emailed and the member's app takes the points back the next time it opens." };
      }
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
      audit.push({ ts: Date.now(), who: USERS[u].name, slug: p.slug === "nalu-vida" ? "Nalu Vida" : "Melody Bar & Grill", reward: p.reward, field: label(p.field, p.key), before: p.before, after: p.value, status: "applied" });
      return { ok: true, slug: p.slug, key: p.key, field: p.field, before: p.before, after: p.value, disc: disc,
        testNotice: "TEST MODE: no email sent. Live, " + USERS[other].name + " would get: “" + USERS[u].name + " changed " + (p.slug === "nalu-vida" ? "Nalu Vida" : "Melody") + " '" + p.reward + "' " + label(p.field, p.key).toLowerCase() + " from " + p.before + " to " + p.value + " at " + new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) + "”" };
    }
    return { ok: false };
  }
  window.HQ_MOCK = function (body) { return new Promise(function (res) { setTimeout(function () { Promise.resolve(handle(JSON.parse(JSON.stringify(body)))).then(function (r) { res(JSON.parse(JSON.stringify(r))); }); }, 120); }); };
  // Football Squares test backend (shared with the guest app's ?test=1 through this browser's localStorage)
  if (!window.SQUARES_MOCK) { var sqs = document.createElement("script"); sqs.src = "../../demo/sports/squares-mock.js?v=sq2"; document.head.appendChild(sqs); }
})();
