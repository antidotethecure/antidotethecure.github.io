/* Christian HQ TEST MODE (?test=1 only). A fake backend that behaves like Code.gs, with made-up guests
   ("Test Guest 01", guest01@example.com, 555 numbers). Nothing here is real and nothing is ever sent:
   the "emailed" one-time code is shown on screen instead. Test logins: user christian, antidote or melody-manager
   (the shared MANAGER login "Melody Management": Melody only, like Code.gs), password "test-mode-only" (works ONLY
   against this fake backend, never the real one). Also fakes the 💲 menu overrides and the ✅ to-do list (bo_todo).
   🔐 Team access (2026-10-14): fake "sammy" (Melody manager, NO email, so her saves stop at "No email on file" like the
   real backend), a fake approved Melody cook (kitchen@example.com) and a fake PENDING Nalu Vida bartender
   (nalu-bartender@example.com), all with password "test-mode-only". New sign-ups (team_signup) keep their own password
   in this page's memory only. Switches, job presets and every check mirror Code.gs (JOBS / permCut / needPerm).
   📲 Shift deal texts (2026-10-19): 4 fake staff sign-ups (555 numbers): one waiting for an OK, one ON (Spanish, with email),
   one OFF and one STOP. bo_shift ops mirror Code.gs shiftAct; "Send test now" and the 15-minute sends never send anything here. */
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
  var USERS = { christian: { name: "Christian", email: "christian@example.com" }, antidote: { name: "Antidote", email: "antidote@example.com" },
    "melody-manager": { name: "Melody Management", email: "melody-team@example.com", role: "manager", slugs: ["melody-bar-grill"] },
    sammy: { name: "Sami", email: "", role: "manager", slugs: ["melody-bar-grill"], job: "manager" } }, TOK = {}, PEND = {}, fails = 0;
  // 🔐 same presets as Code.gs JOBS
  var PERM_KEYS = ["stats", "members", "rewards", "prices", "specials", "photos", "earlybird", "squares", "todo", "staff", "audit", "shifttexts"];
  var PERM_LABEL = { stats: "See sales & visit charts", members: "See guest list & contacts", rewards: "Discounts, rewards & points", prices: "Raise / lower menu prices", photos: "Menu photos go live", specials: "Specials & happy hour", earlybird: "Early-bird gift", squares: "Football Squares", todo: "To-do list", staff: "Staff practice & quiz", audit: "See the Audit log", shifttexts: "Shift deal texts (staff sign-ups)" };
  var JOBS = { kitchen: ["Kitchen", "prices specials photos todo"], marketing: ["Marketing / management", "stats rewards specials photos earlybird squares todo audit"], bar_manager: ["Bar manager", "stats prices specials photos squares todo staff"],
    bartender: ["Bartender", "todo staff"], server: ["Server / floor", "todo staff"], manager: ["Manager (general)", PERM_KEYS.join(" ")], other: ["Other employee", "todo"] };
  function presetOf(j) { var on = {}, o = {}; (JOBS[j] || JOBS.other)[1].split(" ").forEach(function (k) { on[k] = 1; }); PERM_KEYS.forEach(function (k) { o[k] = !!on[k]; }); return o; }
  function effPerms(j, over) { var o = presetOf(j); Object.keys(over || {}).forEach(function (k) { if (PERM_KEYS.indexOf(k) >= 0) o[k] = over[k] === true; }); return o; }
  var PERMS = {}, TEAM = [   // TEAM = the "Team" sheet tab; PERMS = Script Property PERMS (approved / switched people)
    { id: "kitchen@example.com", name: "Test Cook", email: "kitchen@example.com", sl: ["melody-bar-grill"], job: "kitchen", status: "active", pw: "test-mode-only", asked: now - 3 * DAY },
    { id: "nalu-bartender@example.com", name: "Test Bartender", email: "nalu-bartender@example.com", sl: ["nalu-vida"], job: "bartender", status: "pending", pw: "test-mode-only", asked: now - 2 * 36e5 } ];
  PERMS["kitchen@example.com"] = { src: "team", st: "active", job: "kitchen", sl: ["melody-bar-grill"], nm: "Test Cook", em: "kitchen@example.com" };
  function teamRow(id) { return TEAM.filter(function (t) { return t.id === id; })[0] || null; }
  function rec(u) { var B = USERS[u], o = PERMS[u] || null;
    if (B) { if (B.role !== "manager") return { id: u, name: B.name, email: B.email, role: "owner", slugs: slugs.slice(), job: "owner", perms: effPerms("manager"), st: "active", src: "owner", over: [] };
      var j = (o && o.job) || B.job || "manager"; return { id: u, name: B.name, email: B.email, role: "manager", slugs: o && o.sl ? o.sl : B.slugs, job: j, perms: effPerms(j, o && o.p), st: o && o.st === "off" ? "off" : "active", src: "bo", over: o && o.p ? Object.keys(o.p) : [] }; }
    if (!o || o.src !== "team") return null;
    return { id: u, name: o.nm, email: o.em, role: "manager", slugs: o.sl, job: o.job, perms: effPerms(o.job, o.p), st: o.st === "active" ? "active" : "off", src: "team", over: o.p ? Object.keys(o.p) : [] }; }
  function person(u) { var r = rec(u); return r && r.st === "active" ? r : null; }
  function may(u, k) { var r = person(u); return !!(r && (r.role === "owner" || (k !== "owner" && r.perms[k]))); }
  function needPerm(key, field) { return key === "menu" ? (field === "price" ? "prices" : "specials") : key === "eb" ? "earlybird" : key === "scout" ? "owner" : "rewards"; }
  function jobName(j) { return (JOBS[j] || ["?"])[0]; }
  function restNames(sl) { return sl.length > 1 ? "Melody + Nalu Vida" : sl[0] === "nalu-vida" ? "Nalu Vida" : "Melody Bar & Grill"; }
  function teamList() { var list = [], seen = {}, pub = function (r) { return { id: r.id, name: r.name, email: r.email, job: r.job, jobName: jobName(r.job), slugs: r.slugs, status: r.st, perms: r.perms, over: r.over, src: r.src }; };
    Object.keys(USERS).forEach(function (k) { var r = rec(k); if (r && r.src === "bo") { list.push(pub(r)); seen[k] = 1; } });
    Object.keys(PERMS).forEach(function (k) { if (seen[k]) return; var r = rec(k); if (r && r.src === "team") { list.push(pub(r)); seen[k] = 1; } });
    TEAM.forEach(function (t) { if (seen[t.id] || t.status === "declined") return; list.push({ id: t.id, name: t.name, email: t.email, job: t.job, jobName: jobName(t.job), slugs: t.sl, status: "pending", perms: presetOf(t.job), over: [], src: "team", asked: t.asked }); });
    return list; }
  function permCut(r, o) { var p = r.perms;
    if (!p.members) { o.members = p.stats || p.rewards ? o.members.map(function (m) { var c = {}; Object.keys(m).forEach(function (k) { if (!{ phone: 1, email: 1, bday: 1, sms: 1, smsAt: 1 }[k]) c[k] = m[k]; }); return c; }) : []; o.scout = { flags: [], rejected: [], adjustments: [] }; }
    if (!p.stats) { o.games = []; o.opens = []; o.oneprize = {}; o.restores7 = {}; }
    if (!p.rewards) { o.redeems = []; o.claims = []; o.disc = {}; o.lb = {}; }
    if (!p.earlybird) o.eb = {}; if (!p.staff) { o.staff = []; o.trained = []; } if (!p.audit) o.audit = []; if (!p.todo) { o.todos = []; o.todoDone = []; }
    if (!p.shifttexts) { o.shift = []; o.shiftCfg = {}; }
    return o; }
  function teamAct(d, u) {
    if (rec(u).role !== "owner") return { ok: false, reason: "Your login can't do that. Ask Christian." };
    var id = String(d.id || "").toLowerCase(), op = d.op, r = rec(id), row = USERS[id] ? null : teamRow(id), msg, sl = [], name;
    if (USERS[id] && USERS[id].role !== "manager") return { ok: false, reason: "Owners always have full access." };
    if (op === "approve" || op === "decline") { if (!row) return { ok: false, reason: "That request is gone. Refresh." }; if (r) return { ok: false, reason: "Already approved. Use the On / Off switch instead." }; name = row.name;
      if (op === "decline") { row.status = "declined"; sl = row.sl; msg = { field: "Access declined", before: "pending", value: "declined" }; }
      else { var j = JOBS[d.job] ? d.job : row.job; sl = d.slugs || row.sl; PERMS[id] = { src: "team", st: "active", job: j, sl: sl, nm: row.name, em: row.email }; row.status = "active"; row.job = j; msg = { field: "Access approved", before: "pending", value: jobName(j) + " · " + restNames(sl) }; } }
    else { if (!r) return { ok: false, reason: "That person isn't on the team list. Refresh." }; name = r.name; sl = r.slugs;
      var o = PERMS[id] = PERMS[id] || (r.src === "team" ? { src: "team", st: r.st, job: r.job, sl: r.slugs, nm: r.name, em: r.email } : {});
      if (op === "status") { var on = d.on === true; o.st = on ? "active" : "off"; if (row) row.status = o.st; msg = { field: "Access " + (on ? "turned on" : "turned off"), before: r.st === "active" ? "on" : "off", value: on ? "on" : "off" }; }
      else if (op === "job") { if (!JOBS[d.job]) return { ok: false, reason: "Pick a job from the list." }; o.job = d.job; delete o.p; msg = { field: "Job (switches reset to its preset)", before: jobName(r.job), value: jobName(d.job) }; }
      else if (op === "perm") { if (PERM_KEYS.indexOf(d.key) < 0) return { ok: false, reason: "Unknown switch." }; var v = d.on === true; o.p = o.p || {}; if (presetOf(r.job)[d.key] === v) delete o.p[d.key]; else o.p[d.key] = v; if (!Object.keys(o.p).length) delete o.p; msg = { field: PERM_LABEL[d.key], before: r.perms[d.key] ? "on" : "off", value: v ? "on" : "off" }; }
      else if (op === "slugs") { var ns = (d.slugs || []).filter(function (x) { return slugs.indexOf(x) >= 0; }); if (!ns.length) return { ok: false, reason: "Pick at least one restaurant." }; o.sl = ns; sl = ns; msg = { field: "Restaurants", before: restNames(r.slugs), value: restNames(ns) }; }
      else return { ok: false, reason: "Unknown action." }; }
    audit.push({ ts: Date.now(), who: rec(u).name, slug: sl.length === 1 ? (sl[0] === "nalu-vida" ? "Nalu Vida" : "Melody Bar & Grill") : "Both", reward: "Team · " + name, field: msg.field, before: msg.before, after: msg.value, status: "applied" });
    var em = r ? r.email : row ? row.email : "";
    return { ok: true, team: teamList(), testNotice: em ? "TEST MODE: no email sent. Live, " + name + " (" + em + ") would get an email about this change." : "TEST MODE: " + name + " has no email on file, so no email would be sent." }; }
  function signup(d) { var nm = String(d.name || "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim(), em = String(d.email || "").trim().toLowerCase(), pw = String(d.pw || ""), r = String(d.restaurant || "");
    var sl = r === "both" ? slugs.slice() : r === "nalu" ? ["nalu-vida"] : r === "melody" ? ["melody-bar-grill"] : [];
    if (nm.length < 2 || nm.length > 40 || /@|https?:/i.test(nm)) return { ok: false, reason: "Type your name (2 to 40 letters)." };
    if (!/^[^@\s'"<>]+@[^@\s'"<>]+\.[^@\s'"<>]{2,}$/.test(em)) return { ok: false, reason: "Type your email address (you log in with it)." };
    if (!sl.length) return { ok: false, reason: "Pick Melody, Nalu Vida or both." }; if (!JOBS[d.job]) return { ok: false, reason: "Pick the part of the job you work." };
    if (pw.length < 10) return { ok: false, reason: "Password: at least 10 characters." };
    if (Object.keys(USERS).some(function (k) { return USERS[k].name.toLowerCase() === nm.toLowerCase(); })) return { ok: false, reason: "That name is already used by another login. Add your last name or initial." };
    var ex = teamRow(em); if (ex && ex.status !== "declined") return { ok: true, sent: true };
    if (ex) TEAM.splice(TEAM.indexOf(ex), 1);
    TEAM.push({ id: em, name: nm, email: em, sl: sl, job: d.job, status: "pending", pw: pw, asked: Date.now() });
    audit.push({ ts: Date.now(), who: nm + " (sign-up)", slug: sl.length > 1 ? "Both" : restNames(sl), reward: "Team access", field: "Access requested", before: "", after: jobName(d.job) + " · " + em, status: "pending" });
    return { ok: true, sent: true }; }
  var PHOTOS = [], MENU = {}, TODOS = [{ id: "TTEST1", ts: now - 5 * 36e5, slug: "melody-bar-grill", text: "Put new QR table tents on the patio", go: "", by: "Christian", status: "open" }], TODO_DONE = [];
  function scopeOf(u) { var r = rec(u); return { role: r.role, slugs: r.slugs.slice() }; }
  function can(u, s) { return scopeOf(u).slugs.indexOf(s) >= 0; }
  function sm(u, o) { var sc = scopeOf(u); if (sc.role === "owner") return o; var y = {}; Object.keys(o || {}).forEach(function (k) { if (sc.slugs.indexOf(k) >= 0) y[k] = o[k]; }); return y; }
  function todoOut(u) { var sc = scopeOf(u); return { ok: true, todos: TODOS.filter(function (t) { return t.status === "open" && (sc.role === "owner" || sc.slugs.indexOf(t.slug) >= 0); }), todoDone: TODO_DONE.filter(function (k) { return sc.role === "owner" || sc.slugs.indexOf(k.split(":")[1]) >= 0; }) }; }
  var MLABEL = { price: "Menu price", sp_on: "Special on/off", sp_title: "Special name", sp_desc: "Special description", sp_price: "Special price", hh: "Happy hour & weekly specials" };
  function mPrice(v) { v = String(v == null ? "" : v).replace(/[$,\s]/g, ""); if (v === "") return ""; var x = Math.round(+v * 100) / 100; return isFinite(x) && x >= 0.5 && x <= 500 ? x.toFixed(2) : null; }
  function mValid(f, v, item) { if (!MLABEL[f]) return null; var t = function (x, lo, hi) { x = String(x == null ? "" : x).replace(/[<>]/g, "").replace(/\s+/g, " ").trim(); return x.length >= lo && x.length <= hi ? x : null; };
    if (f === "hh") { var ls = String(v || "").split(/\n/).map(function (l) { return l.replace(/[<>]/g, "").trim(); }).filter(Boolean); return ls.length && ls.length <= 8 && ls.every(function (l) { return l.length <= 70; }) ? { item: "weekly", value: ls.join("\n") } : null; }
    if (f === "price") { var nm = t(item, 2, 80), pr = mPrice(v); return nm && pr != null ? { item: nm, value: pr } : null; }
    if (!/^[a-z0-9_-]{2,24}$/.test(String(item || ""))) return null;
    var val = f === "sp_on" ? (v === "on" || v === "off" ? v : null) : f === "sp_title" ? t(v, 3, 60) : f === "sp_desc" ? t(v, 3, 200) : mPrice(v); return val == null ? null : { item: item, value: val }; }
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
  function scopeData(u, o) { var sc = scopeOf(u); if (sc.role === "owner") return o; var ok = function (s) { return sc.slugs.indexOf(s) >= 0; };
    var c = JSON.parse(JSON.stringify(o)); c.members = c.members.filter(function (m) { return ok(m.slug); }); c.games = c.games.filter(function (g) { return ok(g[0]); }); c.opens = c.opens.filter(function (x) { return ok(x[0]); });
    c.redeems = c.redeems.filter(function (x) { return ok(x.slug); }); c.claims = c.claims.filter(function (x) { return ok(x.slug); }); c.staff = c.staff.filter(function (x) { return ok(x[0]); });
    var nm = {}; sc.slugs.forEach(function (x) { nm[x === "nalu-vida" ? "Nalu Vida" : "Melody Bar & Grill"] = 1; }); c.audit = c.audit.filter(function (a) { return nm[a.slug]; }); ["eb", "lb", "oneprize", "restores7", "disc", "menu"].forEach(function (k) { c[k] = sm(u, c[k]); });
    c.scout = { flags: c.scout.flags.filter(function (f) { return ok(f.slug); }), rejected: c.scout.rejected.filter(function (x) { return ok(x.slug); }), adjustments: c.scout.adjustments.filter(function (x) { return ok(x.slug); }) };
    c.shift = (c.shift || []).filter(function (x) { return ok(x.slug); });
    c.team = []; return permCut(rec(u), c); }
  // ---- 📲 shift deal texts (fake): same fields + rules as Code.gs (shiftList / shiftAct / shMessage), numbers are 555
  var SHIFT_CFG = { sms: false, installed: now - 2 * DAY, lastRun: now - 6 * 60000 };
  var SHIFT = [
    { id: "STESTPEND01", slug: "melody-bar-grill", name: "Test Server Maya", phone: "+13105550141", email: "", job: "server", lang: "en", shifts: { mon: "16:00", tue: "16:00", fri: "17:00", sat: "17:00" }, status: "pending", ts: now - 3 * 36e5, lastAt: 0, last: "" },
    { id: "STESTON0002", slug: "nalu-vida", name: "Test Bartender Luis", phone: "+13105550142", email: "luis.test@example.com", job: "bartender", lang: "es", shifts: { wed: "11:30", thu: "11:30", sun: "09:30" }, status: "on", ts: now - 4 * DAY, lastAt: now - DAY + 36e5, last: "email: emailed (texting not on yet)" },
    { id: "STESTOFF003", slug: "melody-bar-grill", name: "Test Cook Andre", phone: "+13105550143", email: "", job: "kitchen", lang: "en", shifts: { mon: "10:00", wed: "10:00" }, status: "off", ts: now - 6 * DAY, lastAt: 0, last: "" },
    { id: "STESTSTOP04", slug: "melody-bar-grill", name: "Test Host Jade", phone: "+13105550144", email: "", job: "other", lang: "en", shifts: { sat: "18:00" }, status: "stop", ts: now - 8 * DAY, lastAt: now - 5 * DAY, last: "text: STOP: they're on Twilio's opt-out list, switched to STOP" }];
  var SH_DN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], SH_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  function shMask(p) { return "•••" + String(p).slice(-4); }
  function shPub(x) { return { id: x.id, slug: x.slug, name: x.name, phone: shMask(x.phone), email: x.email ? x.email.charAt(0) + "•••@" + x.email.split("@")[1] : "", job: x.job, jobName: jobName(x.job), lang: x.lang, shifts: x.shifts, status: x.status, ts: x.ts, lastAt: x.lastAt, last: x.last }; }
  function shiftList(u) { return may(u, "shifttexts") ? SHIFT.filter(function (x) { return x.status !== "deleted" && can(u, x.slug); }).map(shPub) : []; }
  function shClock(t) { var p = t.split(":"), h = +p[0]; return (h % 12 || 12) + ":" + p[1] + " " + (h < 12 ? "AM" : "PM"); }
  function shDays(s) { return SH_KEYS.filter(function (k) { return s[k]; }).map(function (k) { return SH_DN[SH_KEYS.indexOf(k)] + " " + shClock(s[k]); }).join(", "); }
  function shText(slug, es) {   // a sample in the same shape as Code.gs shMessage (today's weekday lines; no specials / game day in test mode)
    var dow = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" })).getDay(), mel = slug === "melody-bar-grill", dn = SH_DN[dow];
    var W = mel ? { all: ["Happy hour 3-6 daily"], 1: ["half off burgers 11-3"], 2: ["$3 tacos & $6 margaritas"], 4: ["half off sandwiches 11-3"], 5: ["$3 sliders 11-3"] }
      : { all: (dow >= 1 && dow <= 5 ? ["Happy hour Mon-Fri 3-6 PM and 10 PM-close"] : []).concat(["Brunch daily until 4 PM, $24 bottomless mimosas (60 min)"]), 1: ["$9 burgers + $5 draft beer, 5 PM-close"], 2: ["50% off signature tacos, $10 house margaritas"], 3: ["$2 oysters (min 6)"], 0: ["NFL on every TV + bottomless mimosas"] };
    var lines = W.all.concat(W[dow] || []).map(function (l) { return "- " + l; });
    if (mel) lines.push(es ? "- Just Landed: 10% con pase de abordar de LAX (24 h)" : "- Just Landed: 10% off with a LAX boarding pass (24h)");
    var tiers = mel ? "250 Free soft drink or Melody Fries; 500 Free starter; 1,000 $10 off; 1,500 Free entree" : "250 Free mocktail, soft drink or Jungle Fries; 500 Free shareable; 1,000 $10 off; 1,500 Free entree";
    var nm = mel ? "Melody" : "Nalu Vida", d = new Date(), mo = d.toLocaleString("en-US", { timeZone: "America/Los_Angeles", month: "short" }), dd = d.toLocaleString("en-US", { timeZone: "America/Los_Angeles", day: "numeric" });
    return (es ? "Ofertas de hoy en " + nm + " (" + ["dom", "lun", "mar", "mie", "jue", "vie", "sab"][dow] + " " + dd + " " + mo.toLowerCase() + "):" : nm + " deals today (" + dn + " " + mo + " " + dd + "):") + "\n" + lines.join("\n") + "\n" +
      (es ? "Recompensas (puntos): " : "Rewards (points): ") + tiers + "\n" + (es ? "Responde STOP para no recibir mas. Guia: " : "Reply STOP to stop. Guide: ") + "https://antidotethecure.github.io/staff/christian/"; }
  function segs(t) { return t.length <= 160 ? 1 : Math.ceil(t.length / 153); }
  function shiftAct(d, u) { var NOPE = { ok: false, reason: "Your login can't do that. Ask Christian." }, own = rec(u).role === "owner";
    if (!may(u, "shifttexts")) return NOPE;
    var res = function (x) { var o = { ok: true, shift: shiftList(u), shiftCfg: SHIFT_CFG }; Object.keys(x || {}).forEach(function (k) { o[k] = x[k]; }); return o; };
    if (d.op === "preview") { if (!can(u, d.slug)) return NOPE; var en = shText(d.slug, false), es = shText(d.slug, true); return { ok: true, slug: d.slug, text: en, segs: segs(en), textEs: es, segsEs: segs(es) }; }
    var x = SHIFT.filter(function (r) { return r.id === d.id && r.status !== "deleted"; })[0]; if (!x) return { ok: false, reason: "That sign-up is gone. Refresh." }; if (!can(u, x.slug)) return NOPE;
    var st = x.status, msg = null, extra = null;
    if (d.op === "get") return own ? { ok: true, id: x.id, phone: x.phone, email: x.email } : NOPE;
    if (d.op === "approve" || d.op === "on") { if (st === "stop") return { ok: false, reason: x.name + " said STOP. Only they can restart it: they sign up again in the staff guide (and text START if Twilio blocked them)." }; if (st === "on") return res(); x.status = "on"; msg = [st === "pending" ? "Deal texts approved" : "Deal texts turned on", st, "on"]; }
    else if (d.op === "off") { if (st === "stop") return { ok: false, reason: "Already STOP." }; x.status = "off"; msg = ["Deal texts turned off", st, "off"]; }
    else if (d.op === "stop") { x.status = "stop"; msg = ["Marked STOP (asked not to get texts)", st, "stop"]; }
    else if (d.op === "shifts") { var ns = {}, bad = false; Object.keys(d.shifts || {}).forEach(function (k) { if (SH_KEYS.indexOf(k) < 0 || !/^([01]\d|2[0-3]):[0-5]\d$/.test(d.shifts[k])) bad = true; else ns[k] = d.shifts[k]; });
      if (bad || !Object.keys(ns).length) return { ok: false, reason: "Add at least one start time (blank = day off)." }; msg = ["Shift times", shDays(x.shifts), shDays(ns)]; x.shifts = ns; }
    else if (d.op === "lang") { var lg = d.lang === "es" ? "es" : "en"; if (lg === x.lang) return res(); msg = ["Text language", x.lang === "es" ? "Español" : "English", lg === "es" ? "Español" : "English"]; x.lang = lg; }
    else if (d.op === "contact") { if (!own) return NOPE; var ph = String(d.phone || "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, ""); if (!/^[2-9]\d{9}$/.test(ph)) return { ok: false, reason: "Type a 10-digit mobile number." };
      msg = ["Contact changed", shMask(x.phone), shMask(ph)]; x.phone = "+1" + ph; x.email = String(d.email || "").trim().toLowerCase(); }
    else if (d.op === "delete") { msg = ["Deal texts sign-up deleted (phone + email wiped)", st, "deleted"]; x.status = "deleted"; x.phone = ""; x.email = ""; }
    else if (d.op === "test") { if (!own) return NOPE; if (st !== "on") return { ok: false, reason: "Turn them on first." }; msg = ["Test deal text sent", "", x.email ? "email: TEST MODE, nothing sent" : "none: TEST MODE, nothing sent"]; extra = { sentVia: msg[2] }; x.lastAt = Date.now(); x.last = msg[2]; }
    else return { ok: false, reason: "Unknown action." };
    audit.push({ ts: Date.now(), who: rec(u).name, slug: x.slug === "nalu-vida" ? "Nalu Vida" : "Melody Bar & Grill", reward: "Shift texts · " + x.name, field: msg[0], before: msg[1], after: msg[2], status: "applied" });
    var o = res(extra); if (d.op === "approve" || d.op === "on") o.testNotice = "TEST MODE: nothing is texted or emailed. Live, " + x.name + " gets one text with the day's deals 15-30 minutes before each shift."; return o; }
  function handle(d) {
    if (d.type === "team_signup") return signup(d);
    if (d.type === "bo_login") {
      if (fails >= 10) return { ok: false, reason: "Too many wrong tries. Wait 15 minutes, then try again." };
      var uid = String(d.user || "").trim().toLowerCase(), tr = USERS[uid] ? null : teamRow(uid);
      if (!(USERS[uid] ? d.pw === "test-mode-only" : tr && d.pw === tr.pw)) { fails++; return { ok: false, reason: "Wrong name or password." }; }
      var pp = person(uid); if (!pp) return { ok: false, reason: "Your access isn't turned on (yet). Christian turns it on in Christian HQ › Team access. Ask him." };
      var tk = "TEST" + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + "x".repeat(20); TOK[tk] = uid; return { ok: true, token: tk, name: pp.name, role: pp.role, slugs: pp.slugs, job: pp.job, perms: pp.perms };
    }
    var u = TOK[d.token]; if (!u || !person(u)) return { ok: false, auth: false, reason: "Signed out. Log in again." };   // turned off = signed out at once
    var SC = scopeOf(u), NOPE = { ok: false, reason: "Your login can't do that. Ask Christian." };
    if (d.type === "squares_admin" && (!may(u, "squares") || (SC.role !== "owner" && d.slug && !can(u, d.slug)))) return NOPE;
    if (d.type === "bo_team") return teamAct(d, u);
    if (d.type === "bo_shift") return shiftAct(d, u);
    if (d.type === "bo_todo" && !may(u, "todo")) return NOPE;
    if (d.type === "squares_admin") return window.SQUARES_MOCK ? window.SQUARES_MOCK(Object.assign({}, d, { by: rec(u).name })) : { ok: false, reason: "Test squares backend missing" };   // demo/sports/squares-mock.js
    if (d.type === "bo_dedupe") return SC.role === "owner" ? { ok: true, removed: 0 } : NOPE;
    if (d.type === "bo_todo") {
      if (d.op === "add") { var tx = String(d.text || "").replace(/[<>]/g, "").trim(); if (tx.length < 3 || tx.length > 140) return { ok: false, reason: "Type the to-do (3 to 140 characters)." };
        var ts = d.slug === "all" ? "all" : d.slug || (SC.role === "owner" ? "all" : SC.slugs[0]); if (ts === "all" ? SC.role !== "owner" : !can(u, ts)) return NOPE;
        TODOS.push({ id: "T" + Math.random().toString(36).slice(2, 10), ts: Date.now(), slug: ts, text: tx, go: d.go || "", by: rec(u).name, status: "open" });
        audit.push({ ts: Date.now(), who: rec(u).name, slug: ts === "all" ? "Both" : ts === "nalu-vida" ? "Nalu Vida" : "Melody Bar & Grill", reward: "To-do", field: "To-do added", before: "", after: tx, status: "applied" }); return todoOut(u); }
      if (d.op === "done") { var title = "", tsl = "";
        if (d.key) { tsl = String(d.key).split(":")[1]; if (tsl === "all" ? SC.role !== "owner" : !can(u, tsl)) return NOPE; if (TODO_DONE.indexOf(d.key) < 0) TODO_DONE.push(d.key); title = d.text || d.key; }
        else { var it = TODOS.filter(function (t) { return t.id === d.id; })[0]; if (!it) return { ok: false, reason: "That to-do is gone. Refresh." }; tsl = it.slug; if (tsl === "all" ? SC.role !== "owner" : !can(u, tsl)) return NOPE; it.status = "done"; title = it.text; }
        audit.push({ ts: Date.now(), who: rec(u).name, slug: tsl === "all" ? "Both" : tsl === "nalu-vida" ? "Nalu Vida" : "Melody Bar & Grill", reward: "To-do", field: "To-do done", before: title, after: "done", status: "applied" }); return todoOut(u); }
      return { ok: false, reason: "Unknown action." }; }
    if (d.type === "bo_photo") {   // 📸 same rules as Code.gs photoAct; the "file" is the picture itself (data URL), nothing is uploaded
      var own = SC.role === "owner", golive = own || rec(u).perms.photos === true, phOut = function () { return { ok: true, photos: PHOTOS.filter(function (x) { return (x.status === "pending" || x.status === "live") && (own || can(u, x.slug)); }), menu: MENU }; },
        phSet = function (sl, it, f) { var M = MENU[sl] = MENU[sl] || {}; M.ph = M.ph || {}; if (f) M.ph[it] = f; else delete M.ph[it]; },
        logp = function (sl, it, v) { audit.push({ ts: Date.now(), who: rec(u).name, slug: sl === "nalu-vida" ? "Nalu Vida" : "Melody Bar & Grill", reward: it, field: "Menu photo", before: "", after: v, status: "applied" }); };
      if (d.op === "add") { var it2 = String(d.item || "").replace(/[<>]/g, "").trim(); if (!can(u, d.slug) || !it2) return NOPE; if (!/^data:image\/jpeg;base64,/.test(String(d.photo || ""))) return { ok: false, reason: "That picture didn't come through. Try another photo." };
        PHOTOS.forEach(function (x) { if (x.slug === d.slug && x.item === it2 && (x.status === "pending" || (golive && x.status === "live"))) x.status = "replaced"; }); if (golive) phSet(d.slug, it2, d.photo);
        PHOTOS.push({ ts: Date.now(), id: "P" + Math.random().toString(36).slice(2, 12), slug: d.slug, item: it2, file: d.photo, by: rec(u).name, status: golive ? "live" : "pending" }); logp(d.slug, it2, golive ? "added (live)" : "added (waiting for Christian's OK)");
        var out = phOut(); out.testNotice = golive ? "" : "TEST MODE: no email sent. Live, Christian would get an email to OK it."; return out; }
      if (!own) return { ok: false, reason: "Christian OKs the photos. Tell him it's there." };
      if (d.op === "remove") { PHOTOS.forEach(function (x) { if (x.slug === d.slug && x.item === d.item && x.status === "live") x.status = "removed"; }); phSet(d.slug, d.item, ""); logp(d.slug, d.item, "standard picture"); return phOut(); }
      var px = PHOTOS.filter(function (x) { return x.id === d.id && x.status === "pending"; })[0]; if (!px) return { ok: false, reason: "That photo was already handled. Tap Refresh." };
      if (d.op === "ok") { PHOTOS.forEach(function (x) { if (x.slug === px.slug && x.item === px.item && x.status === "live") x.status = "replaced"; }); phSet(px.slug, px.item, px.file); px.status = "live"; }
      else px.status = "declined"; logp(px.slug, px.item, px.status); return phOut(); }
    if (d.type === "bo_logout") { delete TOK[d.token]; return { ok: true }; }
    if (d.type === "bo_summary" && SC.role !== "owner") return NOPE;
    if (d.type === "bo_summary") return { ok: true, members: members.length, joined7: members.filter(function (m) { return m.joined > now - 7 * DAY; }).length, plays7: games.length, redeems7: redeems.length, pendingClaims: claims.filter(function (x) { return x.status === "pending"; }).length };
    if (d.type === "bo_data") return scopeData(u, { ok: true, test: true, role: SC.role, slugs: SC.slugs, job: rec(u).job, perms: rec(u).perms, team: SC.role === "owner" ? teamList() : [], menu: MENU, photos: PHOTOS.filter(function (x) { return (x.status === "pending" || x.status === "live") && (SC.role === "owner" || can(u, x.slug)); }), todos: todoOut(u).todos, todoDone: todoOut(u).todoDone,
      mgr: SC.role === "owner" ? Object.keys(USERS).filter(function (k) { return USERS[k].role === "manager"; }).map(function (k) { return USERS[k].name; }) : [], scout: scout, restores7: { "melody-bar-grill": 2, "nalu-vida": 1 }, oneprize: { "melody-bar-grill": { codes: 7, used: 5, expired: 2, refused: 3, mins: 10 }, "nalu-vida": { codes: 4, used: 4, expired: 0, refused: 1, mins: 10 } }, eb: ebStats(), shift: shiftList(u), shiftCfg: SHIFT_CFG, me: rec(u).name, now: Date.now(), members: members, games: games, opens: opens, redeems: redeems, claims: claims, staff: staff, trained: trained, audit: audit, disc: disc, lb: { "melody-bar-grill": { credited: 3, devices: 11 } } });
    if (d.type === "disc_propose") {
      if (!can(u, d.slug)) return NOPE;
      if (d.key === "scout" && SC.role !== "owner") return { ok: false, reason: "Scout actions are for Christian. Tell him what you saw." };
      if (!may(u, needPerm(d.key, d.field))) return NOPE;
      if (!rec(u).email) return { ok: false, reason: "No email on file for " + rec(u).name + " (Script Property BO_USERS)." };
      if (d.key === "menu") { var mv = mValid(d.field, d.value, d.item); if (!mv) return { ok: false, reason: "That value isn't allowed. Prices $0.50–$500 (blank = back to the menu price) · special names 3–60 characters · descriptions 3–200 · up to 8 lines of 70 for happy hour." };
        var MM = MENU[d.slug] || {}, mb = d.field === "price" ? (MM.p || {})[mv.item] : d.field === "hh" ? MM.hh : ((MM.s || {})[mv.item] || {})[d.field.slice(3)];
        var mid = "P" + Math.random().toString(36).slice(2, 10), mcode = String(100000 + Math.floor(Math.random() * 900000));
        PEND[mid] = { user: u, slug: d.slug, key: "menu", field: d.field, item: mv.item, value: mv.value, before: mb != null && mb !== "" ? (typeof mb === "number" ? mb.toFixed(2) : mb) : (d.before || "(not set)"), reward: d.reward || mv.item, code: mcode, tries: 0, exp: Date.now() + 6e5 };
        return { ok: true, id: mid, sentTo: rec(u).email.replace(/^(.).*(@.*)$/, "$1•••$2"), before: PEND[mid].before, after: mv.value === "" ? "(menu default)" : mv.value, testCode: mcode }; }
      var v = valid(d.key, d.field, d.value); if (v == null) return { ok: false, reason: "That value isn't allowed. Points 50–10,000 · $ off 1–100 · percent 1–50 · names 3–80 characters · location bonus 10–1,000." };
      var cur = d.key === "scout" ? "open" : d.key === "eb" ? (EB[d.slug][d.field] != null ? EB[d.slug][d.field] : d.field === "on" ? "off" : d.field === "draw" ? "not drawn" : "(not set)") : disc[d.slug] && disc[d.slug][d.key] && disc[d.slug][d.key][d.field], id = "P" + Math.random().toString(36).slice(2, 10), code = String(100000 + Math.floor(Math.random() * 900000));
      PEND[id] = { user: u, slug: d.slug, key: d.key, field: d.field, value: v, before: cur != null ? cur : d.before, reward: d.reward, code: code, tries: 0, exp: Date.now() + 6e5 };
      return { ok: true, id: id, sentTo: rec(u).email.replace(/^(.).*(@.*)$/, "$1•••$2"), before: PEND[id].before, after: v, testCode: code };
    }
    if (d.type === "disc_confirm") {
      var p = PEND[d.id]; if (!p || p.exp < Date.now()) return { ok: false, reason: "That code expired. Press Save again to get a new one." };
      if (p.user !== u) return { ok: false, reason: "This change was started by someone else." };
      if (String(d.code) !== p.code) { if (++p.tries >= 5) { delete PEND[d.id]; return { ok: false, reason: "5 wrong codes. Start again." }; } return { ok: false, reason: "Wrong code. " + (5 - p.tries) + " tries left." }; }
      delete PEND[d.id];
      if (!can(u, p.slug) || !may(u, needPerm(p.key, p.field))) return NOPE;
      if (p.key === "menu") { var M2 = MENU[p.slug] = MENU[p.slug] || {};
        if (p.field === "price") { M2.p = M2.p || {}; if (p.value === "") delete M2.p[p.item]; else M2.p[p.item] = +p.value; }
        else if (p.field === "hh") M2.hh = p.value;
        else { M2.s = M2.s || {}; var sp2 = M2.s[p.item] = M2.s[p.item] || {}; if (p.value === "") delete sp2[p.field.slice(3)]; else sp2[p.field.slice(3)] = p.value; }
        var aft = p.value === "" ? "(menu default)" : p.value;
        audit.push({ ts: Date.now(), who: rec(u).name, slug: p.slug === "nalu-vida" ? "Nalu Vida" : "Melody Bar & Grill", reward: p.reward, field: MLABEL[p.field], before: String(p.before).replace(/\n/g, " / "), after: String(aft).replace(/\n/g, " / "), status: "applied" });
        return { ok: true, slug: p.slug, key: "menu", field: p.field, item: p.item, before: p.before, after: aft, menu: sm(u, MENU),
          testNotice: "TEST MODE: no email sent. Live, " + (SC.role === "owner" ? "the other owner" : "Christian and Antidote") + " would get: “" + rec(u).name + " changed the Melody Bar & Grill menu: " + p.reward + " " + MLABEL[p.field].toLowerCase() + " " + p.before + " → " + aft + "”" }; }
      if (p.key === "scout") {
        var sp = String(p.value).split("|"), fl = scout.flags.filter(function (f) { return f.id === sp[0]; })[0], msg = "flag marked OK", nm2 = rec(u).name;
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
        audit.push({ ts: Date.now(), who: rec(u).name, slug: p.slug === "nalu-vida" ? "Nalu Vida" : "Melody Bar & Grill", reward: "Early-bird gift", field: p.field, before: p.before, after: p.value, status: "applied" });
        return { ok: true, slug: p.slug, key: "eb", field: p.field, before: p.before, after: p.value, disc: disc, testNotice: "TEST MODE: no email sent. Live, the other login holder would be emailed about this change." };
      }
      ((disc[p.slug] = disc[p.slug] || {})[p.key] = disc[p.slug][p.key] || {})[p.field] = p.value;
      var other = u === "christian" ? "antidote" : "christian";
      audit.push({ ts: Date.now(), who: rec(u).name, slug: p.slug === "nalu-vida" ? "Nalu Vida" : "Melody Bar & Grill", reward: p.reward, field: label(p.field, p.key), before: p.before, after: p.value, status: "applied" });
      return { ok: true, slug: p.slug, key: p.key, field: p.field, before: p.before, after: p.value, disc: sm(u, disc),
        testNotice: "TEST MODE: no email sent. Live, " + USERS[other].name + " would get: “" + rec(u).name + " changed " + (p.slug === "nalu-vida" ? "Nalu Vida" : "Melody") + " '" + p.reward + "' " + label(p.field, p.key).toLowerCase() + " from " + p.before + " to " + p.value + " at " + new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) + "”" };
    }
    return { ok: false };
  }
  window.HQ_MOCK = function (body) { return new Promise(function (res) { setTimeout(function () { Promise.resolve(handle(JSON.parse(JSON.stringify(body)))).then(function (r) { res(JSON.parse(JSON.stringify(r))); }); }, 120); }); };
  // Football Squares test backend (shared with the guest app's ?test=1 through this browser's localStorage)
  if (!window.SQUARES_MOCK) { var sqs = document.createElement("script"); sqs.src = "../../demo/sports/squares-mock.js?v=sq2"; document.head.appendChild(sqs); }
})();
