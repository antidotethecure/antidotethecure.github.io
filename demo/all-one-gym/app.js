/* All One Gym member app (sample). Everything is saved on this phone only (localStorage).
   The real version keeps members, check-ins and reward claims on a server with real sign-in,
   so rewards can't be double-claimed and the front desk sees real scans. */
(function () {
  "use strict";
  var C = window.GYM_CFG, D = document, KEY = "aog-member-v1";
  var $ = function (s, r) { return (r || D).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || D).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var num = function (v) { var n = parseFloat(v); return isFinite(n) ? n : null; };
  var r1 = function (n) { return Math.round(n * 10) / 10; };

  /* ---------- dates: weeks run Monday to Sunday ---------- */
  function ymd(d) { d = d || new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function weekStart(d) { d = new Date(d || Date.now()); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; }
  function weekKey(d) { return ymd(weekStart(d)); }
  function daysAgo(n) { var d = new Date(); d.setDate(d.getDate() - n); return d; }
  function nice(d) { return new Date(d + (d.length === 10 ? "T12:00" : "")).toLocaleDateString(undefined, { month: "short", day: "numeric" }); }

  /* ---------- state ---------- */
  var S = load();
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function prog() { return C.programs.filter(function (p) { return p.key === (S && S.program); })[0] || C.programs[0]; }
  function weekSessions(wk) { return S.sessions.filter(function (s) { return s.wk === (wk || weekKey()); }); }
  function doneKeys(wk) { var o = {}; weekSessions(wk).forEach(function (s) { o[s.key] = 1; }); return o; }
  function doneCount(wk) { return Object.keys(doneKeys(wk)).length; }
  function lastWeight() { var w = S.weighins; return w.length ? w[w.length - 1].lb : S.profile.startWeight; }

  function memberId() { return "AOG-" + Math.random().toString(36).slice(2, 6).toUpperCase() + Math.floor(1000 + Math.random() * 9000); }
  function newMember(p) {
    return { v: 1, profile: p, program: p.goal === "build" ? "build" : p.goal === "strong" ? "strong" : "burn", sessions: [], weighins: [{ d: ymd(), lb: p.startWeight }], checkins: [], claims: {}, measures: [] };
  }
  // demo member: 6 weeks of believable history so the sample looks lived-in
  function demoMember() {
    var m = newMember({ name: "Jordan", phone: "", email: "", id: "AOG-DEMO1234", goal: "lose", startWeight: 214, goalWeight: 190, heightIn: 70, joined: ymd(daysAgo(42)), demo: true });
    m.weighins = []; var w = 214;
    for (var i = 42; i >= 0; i -= 3) { m.weighins.push({ d: ymd(daysAgo(i)), lb: r1(w) }); w -= 0.55 + Math.random() * 0.5 - (i % 9 === 0 ? -0.6 : 0); }
    var P = C.programs[0];
    for (var wk = 5; wk >= 0; wk--) {
      var base = weekStart(daysAgo(wk * 7)), n = wk === 0 ? Math.min(7, ((new Date().getDay() + 6) % 7) + 3) : wk === 2 ? 8 : 10;
      for (var k = 0; k < n; k++) {
        var d = new Date(base); d.setDate(d.getDate() + Math.floor(k * 0.7)); if (d > new Date()) d = new Date();
        var s = P.sessions[k]; m.sessions.push({ d: ymd(d), wk: ymd(base), key: s.key, name: s.name, mins: s.mins + Math.round(Math.random() * 8 - 4), cal: Math.round(s.mins * (7 + Math.random() * 3)), hrAvg: 118 + Math.round(Math.random() * 22), hrMax: 152 + Math.round(Math.random() * 22), sets: [] });
      }
      if (n === 10 && wk > 0) m.claims[ymd(base)] = { reward: C.rewards[wk % C.rewards.length].key, code: "AOG-" + (4000 + wk * 17) };
    }
    for (var c = 40; c >= 0; c -= 2) if (c % 7 !== 6) m.checkins.push(ymd(daysAgo(c)) + "T0" + (6 + (c % 4)) + ":1" + (c % 6) + ":00");
    m.measures = [{ d: ymd(daysAgo(42)), waist: 40, chest: 44, arm: 15 }, { d: ymd(daysAgo(14)), waist: 38.5, chest: 43.5, arm: 15.25 }, { d: ymd(daysAgo(1)), waist: 37.75, chest: 43, arm: 15.5 }];
    return m;
  }

  /* ---------- toast ---------- */
  var tt = 0;
  function toast(msg) { var t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(tt); tt = setTimeout(function () { t.classList.remove("on"); }, 2600); }

  /* ---------- sign in ---------- */
  function showAuth() {
    D.documentElement.classList.add("signed-out");
    $("#auth").hidden = false; $("#app").hidden = true;
  }
  function showApp() {
    D.documentElement.classList.remove("signed-out");
    $("#auth").hidden = true; $("#app").hidden = false; renderAll(); D.dispatchEvent(new Event("aog:member"));
  }
  $("#joinForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var f = e.target, sw = num(f.startWeight.value), gw = num(f.goalWeight.value), name = f.name.value.trim().slice(0, 40);
    if (!name) { f.name.focus(); return; }
    if (sw === null || sw < 70 || sw > 700) { toast("Enter your starting weight in pounds."); f.startWeight.focus(); return; }
    S = newMember({ name: name, phone: f.phone.value.replace(/[^\d+]/g, "").slice(0, 16), email: f.email.value.trim().slice(0, 80), id: memberId(), goal: f.goal.value, startWeight: sw, goalWeight: gw && gw > 70 && gw < 700 ? gw : null, heightIn: null, joined: ymd() });
    save(); showApp(); toast("Welcome to " + C.name + ", " + name + "!");
  });
  $("#demoBtn").addEventListener("click", function () { S = demoMember(); save(); showApp(); toast("Demo member loaded. Look around!"); });
  $("#signOut").addEventListener("click", function () {
    if (S && !S.profile.demo && !confirmInline(this)) return;
    try { localStorage.removeItem(KEY); } catch (e) {} S = null; showAuth(); go("home");
  });
  // two-tap confirm instead of a browser dialog
  function confirmInline(btn) {
    if (btn.dataset.sure) return true;
    btn.dataset.sure = 1; var t = btn.textContent; btn.textContent = "Tap again to erase this phone's data";
    setTimeout(function () { delete btn.dataset.sure; btn.textContent = t; }, 3500); return false;
  }

  /* ---------- tabs ---------- */
  function go(tab) {
    $$(".tab").forEach(function (s) { s.hidden = s.id !== "t-" + tab; });
    $$(".tbar [data-go]").forEach(function (b) { b.setAttribute("aria-current", b.dataset.go === tab ? "page" : "false"); });
    scrollTo(0, 0); if (tab === "progress") renderProgress();
    D.dispatchEvent(new CustomEvent("aog:tab", { detail: tab }));
  }
  D.addEventListener("click", function (e) { var b = e.target.closest("[data-go]"); if (b) { e.preventDefault(); go(b.dataset.go); } });

  /* ---------- render ---------- */
  function renderAll() { renderHome(); renderTrain(); renderProgress(); renderRewards(); renderPass(); }

  function ring(done, total, size) {
    var r = size / 2 - 9, c = 2 * Math.PI * r, f = Math.min(1, done / total);
    return '<svg viewBox="0 0 ' + size + " " + size + '" width="' + size + '" height="' + size + '" class="ring" aria-hidden="true"><circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" class="rbg"/><circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" class="rfg" stroke-dasharray="' + c + '" stroke-dashoffset="' + c * (1 - f) + '" transform="rotate(-90 ' + size / 2 + " " + size / 2 + ')"/></svg>';
  }
  function nextSession() { var dk = doneKeys(), P = prog(); return P.sessions.filter(function (s) { return !dk[s.key]; })[0] || null; }
  function streak() {
    var days = {}; S.checkins.forEach(function (c) { days[c.slice(0, 10)] = 1; }); S.sessions.forEach(function (s) { days[s.d] = 1; });
    var n = 0, miss = 0;
    for (var i = 0; i < 400 && miss < 2; i++) { if (days[ymd(daysAgo(i))]) { n++; miss = 0; } else if (i > 0) miss++; } // one rest day doesn't break it
    return n;
  }

  function renderHome() {
    var p = S.profile, dn = doneCount(), nx = nextSession(), lw = lastWeight(), lost = r1(p.startWeight - lw), wkLost = weekLost();
    $("#hiName").textContent = p.name;
    $("#hiDate").textContent = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
    $("#homeRing").innerHTML = ring(dn, 10, 132) + '<div class="rtxt"><b>' + dn + '</b><small>of 10</small></div>';
    $("#homeChal").innerHTML = dn >= 10
      ? (S.claims[weekKey()] ? "Week crushed. Your reward is in <a href='#' data-go='rewards'>Rewards</a>." : "<b>10 for 10!</b> Claim your reward in <a href='#' data-go='rewards'>Rewards</a>.")
      : "<b>" + (10 - dn) + " to go</b> this week to win " + esc(C.rewards.map(function (r) { return r.short; }).join(", ")) + ". Week ends Sunday night.";
    $("#todayCard").innerHTML = nx
      ? '<small class="k">Up next · ' + esc(prog().name) + "</small><h3>" + esc(nx.name) + "</h3><p>" + esc(nx.focus) + " · about " + nx.mins + " min · " + nx.ex.length + ' moves</p><button class="btn primary" data-start="' + esc(nx.key) + '">▶ Start workout</button>'
      : "<small class='k'>All 10 done</small><h3>Rest, eat, recover.</h3><p>New week starts Monday. Free session below if you still want to move.</p><button class='btn ghost' data-start='" + esc(prog().sessions[0].key) + "'>▶ Bonus workout</button>";
    $("#statLost").textContent = (lost > 0 ? "−" : lost < 0 ? "+" : "") + Math.abs(lost) + " lb";
    $("#statWeek").textContent = wkLost === null ? "—" : (wkLost > 0 ? "−" : wkLost < 0 ? "+" : "") + Math.abs(wkLost) + " lb";
    var sk = streak(); $("#statStreak").textContent = sk + (sk === 1 ? " day" : " days");
    $("#statVisits").textContent = S.checkins.filter(function (c) { return c.slice(0, 7) === ymd().slice(0, 7); }).length;
    $("#demoTag").hidden = !p.demo;
  }
  function weekLost() {
    var w = S.weighins; if (w.length < 2) return null;
    var cut = ymd(daysAgo(7)), before = w.filter(function (x) { return x.d <= cut; });
    var ref = before.length ? before[before.length - 1].lb : w[0].lb;
    return r1(ref - w[w.length - 1].lb);
  }

  function renderTrain() {
    var P = prog(), dk = doneKeys();
    $("#progPick").innerHTML = C.programs.map(function (p) { return '<button type="button" class="pill" aria-pressed="' + (p.key === P.key) + '" data-prog="' + p.key + '">' + p.icon + " " + esc(p.name) + "</button>"; }).join("");
    $("#progAbout").textContent = P.about;
    $("#weekList").innerHTML = P.sessions.map(function (s, i) {
      var done = dk[s.key];
      return '<li class="ses' + (done ? " done" : "") + '"><span class="n">' + (done ? "✓" : i + 1) + '</span><div><b>' + esc(s.name) + "</b><small>" + esc(s.focus) + " · " + s.mins + " min</small></div>" +
        '<button class="btn sm ' + (done ? "ghost" : "primary") + '" data-start="' + esc(s.key) + '">' + (done ? "Again" : "Start") + "</button></li>";
    }).join("");
    $("#trainCount").textContent = doneCount() + " / 10 this week";
    var h = S.sessions.slice(-6).reverse();
    $("#history").innerHTML = h.length ? h.map(function (s) { return "<li><b>" + esc(s.name) + "</b><small>" + nice(s.d) + " · " + s.mins + " min · " + s.cal + " cal" + (s.hrAvg ? " · ❤️ avg " + s.hrAvg : "") + "</small></li>"; }).join("") : "<li class='empty'>Your finished workouts show up here.</li>";
  }
  D.addEventListener("click", function (e) {
    var b = e.target.closest("[data-prog]"); if (!b) return;
    S.program = b.dataset.prog; save(); renderTrain(); renderHome(); toast(prog().name + " plan selected.");
  });

  /* ---------- progress ---------- */
  function renderProgress() {
    if (!S) return;
    var p = S.profile, w = S.weighins, lw = lastWeight(), lost = r1(p.startWeight - lw);
    $("#pStart").textContent = p.startWeight + " lb"; $("#pNow").textContent = lw + " lb";
    $("#pLost").textContent = (lost >= 0 ? "−" : "+") + Math.abs(lost) + " lb";
    $("#pGoal").textContent = p.goalWeight ? p.goalWeight + " lb" : "Set a goal";
    var gp = p.goalWeight && p.startWeight !== p.goalWeight ? Math.max(0, Math.min(1, (p.startWeight - lw) / (p.startWeight - p.goalWeight))) : 0;
    $("#goalBar").style.width = Math.round(gp * 100) + "%"; $("#goalPct").textContent = p.goalWeight ? Math.round(gp * 100) + "% of the way to " + p.goalWeight + " lb" : "";
    $("#chart").innerHTML = chart(w);
    $("#wlog").innerHTML = w.slice(-8).reverse().map(function (x, i, a) {
      var prev = a[i + 1], d = prev ? r1(x.lb - prev.lb) : 0;
      return "<li><span>" + nice(x.d) + "</span><b>" + x.lb + " lb</b><em class='" + (d < 0 ? "down" : d > 0 ? "up" : "") + "'>" + (prev ? (d > 0 ? "+" : d < 0 ? "−" : "±") + Math.abs(d) : "start") + "</em></li>";
    }).join("");
    var m = S.measures, a = m[0], z = m[m.length - 1];
    $("#measures").innerHTML = m.length ? ["waist", "chest", "arm"].map(function (k) {
      var d = r1(z[k] - a[k]); return "<div><small>" + k + "</small><b>" + z[k] + '"</b><em class="' + (k === "waist" ? (d < 0 ? "down" : "up") : (d > 0 ? "down" : "")) + '">' + (m.length > 1 ? (d > 0 ? "+" : d < 0 ? "−" : "") + Math.abs(d) + '"' : "") + "</em></div>";
    }).join("") : "<p class='note'>Add your waist, chest and arm to watch your shape change, not just the scale.</p>";
    var pr = {}; S.sessions.forEach(function (s) { (s.sets || []).forEach(function (x) { if (x.lb && (!pr[x.ex] || x.lb > pr[x.ex])) pr[x.ex] = x.lb; }); });
    var prs = Object.keys(pr);
    $("#prs").innerHTML = prs.length ? prs.slice(0, 8).map(function (k) { return "<li><span>" + esc(k) + "</span><b>" + pr[k] + " lb</b></li>"; }).join("") : "<li class='empty'>Log weights in a workout and your best lifts land here.</li>";
    var tot = S.sessions.reduce(function (a, s) { a.m += s.mins || 0; a.c += s.cal || 0; return a; }, { m: 0, c: 0 });
    $("#lifetime").textContent = S.sessions.length + " workouts · " + Math.round(tot.m / 60) + " hours · " + tot.c.toLocaleString() + " calories since " + nice(S.profile.joined);
  }
  function chart(w) {
    if (w.length < 2) return "<p class='note'>Log a couple of weigh-ins to see your line.</p>";
    var W = 340, H = 150, pd = 26, lbs = w.map(function (x) { return x.lb; }), mn = Math.min.apply(0, lbs) - 2, mx = Math.max.apply(0, lbs) + 2;
    if (S.profile.goalWeight) mn = Math.min(mn, S.profile.goalWeight - 1);
    var t0 = +new Date(w[0].d), t1 = +new Date(w[w.length - 1].d) || t0 + 1;
    var X = function (d) { return pd + (W - pd * 1.4) * ((+new Date(d) - t0) / Math.max(1, t1 - t0)); }, Y = function (v) { return 10 + (H - 34) * (1 - (v - mn) / (mx - mn)); };
    var pts = w.map(function (x) { return X(x.d).toFixed(1) + "," + Y(x.lb).toFixed(1); });
    var g = S.profile.goalWeight ? '<line x1="' + pd + '" x2="' + (W - 6) + '" y1="' + Y(S.profile.goalWeight) + '" y2="' + Y(S.profile.goalWeight) + '" class="goal"/><text x="' + (W - 6) + '" y="' + (Y(S.profile.goalWeight) - 4) + '" text-anchor="end" class="gl">goal ' + S.profile.goalWeight + "</text>" : "";
    return '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Weight from ' + lbs[0] + " to " + lbs[lbs.length - 1] + ' pounds">' +
      '<defs><linearGradient id="cg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".45"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>' + g +
      '<polygon points="' + pts.join(" ") + " " + X(w[w.length - 1].d) + "," + (H - 24) + " " + pd + "," + (H - 24) + '" fill="url(#cg)"/>' +
      '<polyline points="' + pts.join(" ") + '" class="line"/>' +
      w.map(function (x, i) { return i === w.length - 1 || i === 0 ? '<circle cx="' + X(x.d) + '" cy="' + Y(x.lb) + '" r="4.5" class="dot"/><text x="' + X(x.d) + '" y="' + (Y(x.lb) - 9) + '" text-anchor="' + (i ? "end" : "start") + '" class="vl">' + x.lb + "</text>" : ""; }).join("") +
      '<text x="' + pd + '" y="' + (H - 6) + '" class="ax">' + nice(w[0].d) + '</text><text x="' + (W - 6) + '" y="' + (H - 6) + '" text-anchor="end" class="ax">' + nice(w[w.length - 1].d) + "</text></svg>";
  }
  $("#weighForm").addEventListener("submit", function (e) {
    e.preventDefault(); var v = num(e.target.lb.value);
    if (v === null || v < 70 || v > 700) { toast("Enter your weight in pounds."); return; }
    var t = ymd(), w = S.weighins; if (w.length && w[w.length - 1].d === t) w[w.length - 1].lb = r1(v); else w.push({ d: t, lb: r1(v) });
    save(); e.target.reset(); renderProgress(); renderHome();
    var wl = weekLost(); toast(wl > 0 ? "Down " + wl + " lb this week. Keep going!" : "Logged. Consistency wins.");
  });
  $("#measForm").addEventListener("submit", function (e) {
    e.preventDefault(); var f = e.target, o = { d: ymd() }, ok = true;
    ["waist", "chest", "arm"].forEach(function (k) { var v = num(f[k].value); if (v === null || v < 5 || v > 90) ok = false; o[k] = v; });
    if (!ok) { toast("Fill in all three, in inches."); return; }
    S.measures.push(o); save(); f.reset(); renderProgress(); toast("Measurements saved.");
  });
  $("#goalForm").addEventListener("submit", function (e) {
    e.preventDefault(); var v = num(e.target.goal.value); if (v === null || v < 70 || v > 700) { toast("Enter a goal in pounds."); return; }
    S.profile.goalWeight = v; save(); e.target.reset(); renderProgress(); toast("Goal set: " + v + " lb.");
  });

  /* ---------- rewards: 10 for 10 ---------- */
  function renderRewards() {
    var dn = doneCount(), wk = weekKey(), cl = S.claims[wk];
    $("#rwRing").innerHTML = ring(dn, 10, 160) + '<div class="rtxt"><b>' + dn + '</b><small>of 10</small></div>';
    var end = weekStart(); end.setDate(end.getDate() + 6);
    $("#rwHead").textContent = dn >= 10 ? (cl ? "You won this week." : "10 for 10. You did it!") : (10 - dn) + " workouts left to win";
    $("#rwSub").textContent = "This week: " + nice(ymd(weekStart())) + " – " + nice(ymd(end)) + ". Finish all 10 of your plan's workouts to unlock a prize.";
    $("#rwPrizes").innerHTML = C.rewards.map(function (r) { return "<li><span>" + r.icon + "</span><div><b>" + esc(r.name) + "</b><small>" + esc(r.note) + "</small></div></li>"; }).join("");
    var box = $("#rwClaim");
    if (cl) {
      var rw = C.rewards.filter(function (r) { return r.key === cl.reward; })[0] || C.rewards[0];
      box.innerHTML = '<div class="won"><span class="big">' + rw.icon + "</span><h3>" + esc(rw.name) + '</h3><p>Show this at the front desk.</p><div class="qr" id="rwQr"></div><code>' + esc(cl.code) + "</code></div>";
      qr($("#rwQr"), "AOG-REWARD|" + S.profile.id + "|" + wk + "|" + cl.code);
    } else if (dn >= 10) {
      box.innerHTML = '<button class="btn primary big" id="spin">🎰 Spin for my prize</button><div class="wheel" id="wheel" aria-hidden="true">' + C.rewards.map(function (r) { return "<span>" + r.icon + "</span>"; }).join("") + "</div>";
      $("#spin").addEventListener("click", spin, { once: true });
    } else {
      box.innerHTML = '<p class="note">Keep going. The spin button lights up at 10 of 10.</p><button class="btn primary" data-go="train">💪 See my workouts</button>';
    }
    var past = Object.keys(S.claims).filter(function (k) { return k !== wk; }).sort().reverse();
    $("#rwPast").innerHTML = past.length ? past.map(function (k) { var rw = C.rewards.filter(function (r) { return r.key === S.claims[k].reward; })[0]; return "<li><span>" + (rw ? rw.icon : "🏆") + "</span><div><b>" + esc(rw ? rw.name : "Reward") + "</b><small>Week of " + nice(k) + "</small></div></li>"; }).join("") : "<li class='empty'>Every week you go 10 for 10 lands here.</li>";
  }
  function spin() {
    var wk = weekKey(); if (S.claims[wk] || doneCount() < 10) return; // one prize per week
    var pool = []; C.rewards.forEach(function (r) { for (var i = 0; i < r.weight; i++) pool.push(r); });
    var rw = pool[Math.floor(Math.random() * pool.length)], wh = $("#wheel"), i = 0, n = 26 + Math.floor(Math.random() * 6);
    var code = "AOG-" + Math.random().toString(36).slice(2, 7).toUpperCase();
    S.claims[wk] = { reward: rw.key, code: code, at: new Date().toISOString() }; save();
    (function tick() {
      var kids = wh.children; for (var k = 0; k < kids.length; k++) kids[k].classList.toggle("hot", k === i % kids.length);
      if (i++ < n || C.rewards[(i - 1) % kids.length].key !== rw.key) setTimeout(tick, 60 + i * i * 0.35); else setTimeout(function () { burst(); renderRewards(); renderHome(); toast("You won: " + rw.name + "!"); }, 450);
    })();
  }

  /* ---------- check-in pass ---------- */
  function renderPass() {
    var p = S.profile;
    $("#passName").textContent = p.name; $("#passId").textContent = p.id;
    $("#passSince").textContent = "Member since " + nice(p.joined);
    var today = S.checkins.filter(function (c) { return c.slice(0, 10) === ymd(); });
    $("#passToday").textContent = today.length ? "✅ Checked in today at " + new Date(today[0]).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "Not checked in yet today";
    qr($("#passQr"), "AOG-CHECKIN|" + p.id + "|" + ymd());
    $("#passVisits").innerHTML = S.checkins.slice(-5).reverse().map(function (c) { return "<li>" + nice(c.slice(0, 10)) + " · " + new Date(c).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) + "</li>"; }).join("") || "<li class='empty'>No visits yet.</li>";
  }
  $("#simScan").addEventListener("click", function () {
    if (S.checkins.some(function (c) { return c.slice(0, 10) === ymd(); })) { toast("Already checked in today."); return; }
    S.checkins.push(new Date().toISOString()); save(); renderPass(); renderHome(); burst(); toast("Checked in. Have a great workout!");
  });
  $("#passBtn").addEventListener("click", function () { renderPass(); $("#pass").hidden = false; $("#pass").focus(); });
  $("#passClose").addEventListener("click", function () { $("#pass").hidden = true; });

  var qrQ = [];
  function qr(box, data) {
    function paint() { try { var q = window.qrcode(0, "M"); q.addData(data); q.make(); box.innerHTML = q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); } catch (e) { box.textContent = data; } }
    if (window.qrcode) return paint();
    qrQ.push(paint); if (qrQ.length > 1) return;
    var sc = D.createElement("script"); sc.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js";
    sc.integrity = "sha384-mZT2gIty7ZDdOGkxfP6joZcYdMW1Jvj9dRlfpTmaJAKKXTqzygtB22k7FLe+KZC1"; sc.crossOrigin = "anonymous";
    sc.onload = function () { qrQ.splice(0).forEach(function (f) { f(); }); };
    sc.onerror = function () { qrQ.splice(0); box.textContent = data; };
    D.head.appendChild(sc);
  }

  /* ---------- heart rate: real Bluetooth strap where the browser allows, demo otherwise ---------- */
  var HR = { bpm: 0, src: "", dev: null, sim: 0, target: 78, samples: [] };
  var hasBT = !!(navigator.bluetooth && navigator.bluetooth.requestDevice);
  function hrSet(v) { HR.bpm = Math.round(v); HR.samples.push(HR.bpm); $$(".hrv").forEach(function (el) { el.textContent = HR.bpm || "--"; }); $$(".hrz").forEach(function (el) { var z = zone(HR.bpm); el.textContent = z.n; el.style.color = z.c; }); }
  function zone(b) {
    var max = 220 - (S && S.profile.age ? S.profile.age : 35), pc = b / max;
    return pc < 0.5 ? { n: "Warm-up", c: "#7dd3fc" } : pc < 0.6 ? { n: "Zone 1 · easy", c: "#86efac" } : pc < 0.7 ? { n: "Zone 2 · fat burn", c: "#facc15" } : pc < 0.8 ? { n: "Zone 3 · cardio", c: "#fb923c" } : pc < 0.9 ? { n: "Zone 4 · hard", c: "#f87171" } : { n: "Zone 5 · max", c: "#ef4444" };
  }
  function startSim() {
    stopHR(); HR.src = "demo"; HR.bpm = 74;
    HR.sim = setInterval(function () { hrSet(HR.bpm + (HR.target - HR.bpm) * 0.18 + (Math.random() - 0.5) * 3); }, 1000);
    hrStatus();
  }
  function stopHR() { clearInterval(HR.sim); HR.sim = 0; if (HR.dev && HR.dev.gatt.connected) HR.dev.gatt.disconnect(); HR.dev = null; HR.src = ""; }
  function connectBT() {
    navigator.bluetooth.requestDevice({ filters: [{ services: ["heart_rate"] }] }).then(function (dev) {
      stopHR(); HR.dev = dev; dev.addEventListener("gattserverdisconnected", function () { if (HR.dev === dev) { HR.src = ""; hrStatus(); toast("Heart-rate monitor disconnected."); } });
      return dev.gatt.connect();
    }).then(function (g) { return g.getPrimaryService("heart_rate"); })
      .then(function (s) { return s.getCharacteristic("heart_rate_measurement"); })
      .then(function (ch) {
        ch.addEventListener("characteristicvaluechanged", function (e) { var v = e.target.value, f = v.getUint8(0); hrSet(f & 1 ? v.getUint16(1, true) : v.getUint8(1)); });
        return ch.startNotifications();
      }).then(function () { HR.src = "bt"; hrStatus(); toast("Connected to " + (HR.dev.name || "heart-rate monitor") + "."); })
      .catch(function (e) { if (e && e.name !== "NotFoundError") toast("Couldn't connect. Using demo heart rate."); if (!HR.src) startSim(); });
  }
  function hrStatus() {
    $$(".hrsrc").forEach(function (el) { el.textContent = HR.src === "bt" ? "Live · " + (HR.dev && HR.dev.name || "Bluetooth monitor") : HR.src === "demo" ? "Demo heart rate" : "Not connected"; });
  }
  $$(".hrConnect").forEach(function (b) { b.addEventListener("click", function () { if (hasBT) connectBT(); else { $("#watchInfo").hidden = false; startSim(); } }); });
  $("#watchClose").addEventListener("click", function () { $("#watchInfo").hidden = true; });
  if (!hasBT) $$(".bt-only").forEach(function (el) { el.hidden = true; });

  /* ---------- workout player ---------- */
  var W = null, tick = 0;
  function startWorkout(key) {
    var s = prog().sessions.filter(function (x) { return x.key === key; })[0]; if (!s) return;
    W = { s: s, ex: 0, set: 1, t0: Date.now(), rest: 0, restEnd: 0, sets: [], cal: 0 };
    window.AOG_BUSY = true; if (window.AOG_SWEAT) window.AOG_SWEAT.wake();
    HR.samples = []; if (!HR.src) startSim(); HR.target = 105;
    $("#player").hidden = false; D.documentElement.classList.add("lock");
    clearInterval(tick); tick = setInterval(ptick, 250); drawPlayer();
  }
  D.addEventListener("click", function (e) { var b = e.target.closest("[data-start]"); if (b) startWorkout(b.dataset.start); });
  function lastFor(name) { for (var i = S.sessions.length - 1; i >= 0; i--) { var x = (S.sessions[i].sets || []).filter(function (y) { return y.ex === name; }); if (x.length) return x[x.length - 1]; } return null; }
  function drawPlayer() {
    var s = W.s, e = s.ex[W.ex], last = lastFor(e.n), timed = !!e.sec;
    $("#plTitle").textContent = s.name; $("#plStep").textContent = "Move " + (W.ex + 1) + " of " + s.ex.length;
    $("#plBar").style.width = Math.round((W.ex / s.ex.length) * 100) + "%";
    $("#plEx").innerHTML = '<span class="exi">' + e.i + "</span><h2>" + esc(e.n) + "</h2><p>" + (timed ? e.sets + " × " + e.sec + " sec" : e.sets + " sets × " + esc(e.reps) + " reps") + (e.tip ? " · " + esc(e.tip) : "") + "</p>" +
      (last && last.lb ? "<small class='last'>Last time: " + last.lb + " lb × " + last.reps + "</small>" : "");
    $("#plSet").textContent = "Set " + W.set + " of " + e.sets + (timed ? " · go " + (e.sec >= 60 ? Math.round(e.sec / 60) + " min" : e.sec + " sec") : "");
    var f = $("#plLog"); f.hidden = W.rest > 0; f.lb.value = e.bw || timed ? "" : last && last.lb ? last.lb : ""; f.reps.value = timed ? e.sec : String(e.reps).split("-").pop();
    f.lb.parentNode.hidden = !!(e.bw || timed); f.reps.previousElementSibling.textContent = timed ? "Seconds" : "Reps";
    $("#plRest").hidden = !(W.rest > 0);
  }
  function ptick() {
    if (!W) return;
    var el = Math.floor((Date.now() - W.t0) / 1000);
    $("#plTime").textContent = Math.floor(el / 60) + ":" + ("0" + (el % 60)).slice(-2);
    // calories from heart rate (Keytel formula, average adult), only counted while in a workout
    var bpm = HR.bpm || 100, wkg = lastWeight() * 0.4536;
    W.cal += Math.max(0, (-55.0969 + 0.6309 * bpm + 0.1988 * wkg + 0.2017 * 35) / 4.184) / 240;
    $("#plCal").textContent = Math.round(W.cal);
    if (W.rest > 0) {
      var left = Math.max(0, Math.ceil((W.restEnd - Date.now()) / 1000)), c = 2 * Math.PI * 54;
      $("#restN").textContent = left; $("#restArc").setAttribute("stroke-dashoffset", c * (1 - left / W.rest));
      if (left <= 0) { W.rest = 0; buzz(); drawPlayer(); }
    }
  }
  function buzz() { try { navigator.vibrate && navigator.vibrate([120, 60, 120]); } catch (e) {} }
  $("#plLog").addEventListener("submit", function (ev) {
    ev.preventDefault(); var e = W.s.ex[W.ex], f = ev.target;
    W.sets.push({ ex: e.n, set: W.set, lb: e.bw || e.sec ? null : num(f.lb.value), reps: num(f.reps.value) });
    HR.target = 150 + Math.random() * 15; setTimeout(function () { HR.target = 112; }, 4000);
    if (W.set < e.sets) { W.set++; restFor(e.rest || C.restSec); }
    else if (W.ex < W.s.ex.length - 1) { W.ex++; W.set = 1; restFor(e.rest || C.restSec); }
    else return finish();
    drawPlayer();
  });
  function restFor(sec) { W.rest = sec; W.restEnd = Date.now() + sec * 1000; $("#restN").textContent = sec; $("#restArc").setAttribute("stroke-dashoffset", 0); }
  $("#restSkip").addEventListener("click", function () { W.restEnd = Date.now(); });
  $("#restAdd").addEventListener("click", function () { W.restEnd += 15000; W.rest += 15; });
  $("#plSkip").addEventListener("click", function () { if (W.ex < W.s.ex.length - 1) { W.ex++; W.set = 1; W.rest = 0; drawPlayer(); } else finish(); });
  $("#plQuit").addEventListener("click", function () { if (!confirmInline(this)) return; closePlayer(); toast("Workout not saved."); });
  function finish() {
    var s = W.s, mins = Math.max(1, Math.round((Date.now() - W.t0) / 60000)), hs = HR.samples.filter(Boolean);
    var rec = { d: ymd(), wk: weekKey(), key: s.key, name: s.name, mins: mins, cal: Math.round(W.cal), hrAvg: hs.length ? Math.round(hs.reduce(function (a, b) { return a + b; }, 0) / hs.length) : null, hrMax: hs.length ? Math.max.apply(0, hs) : null, sets: W.sets };
    var before = doneCount(), nsets = W.sets.length; S.sessions.push(rec); save(); closePlayer(); renderAll();
    var after = doneCount();
    $("#doneBox").innerHTML = "<span class='big'>🏁</span><h2>" + esc(s.name) + " done!</h2><div class='dstats'><div><b>" + mins + "</b><small>min</small></div><div><b>" + rec.cal + "</b><small>cal</small></div><div><b>" + (rec.hrAvg || "--") + "</b><small>avg ❤️</small></div><div><b>" + nsets + "</b><small>sets</small></div></div>" +
      "<p>" + (after >= 10 && before < 10 ? "<b>That's 10 for 10!</b> Go spin for your prize." : after > before ? after + " of 10 this week. " + (10 - after) + " to go." : "Bonus workout. Respect.") + "</p>" +
      (after >= 10 && before < 10 ? "<button class='btn primary' data-go='rewards' data-closedone>🎰 Spin for my prize</button>" : "<button class='btn primary' data-closedone>Nice</button>");
    $("#done").hidden = false; burst();
  }
  D.addEventListener("click", function (e) { if (e.target.closest("[data-closedone]")) $("#done").hidden = true; });
  function closePlayer() { clearInterval(tick); W = null; window.AOG_BUSY = false; HR.target = 78; $("#player").hidden = true; D.documentElement.classList.remove("lock"); }

  /* ---------- confetti-sweat burst for wins ---------- */
  function burst() {
    var box = D.createElement("div"); box.className = "burst"; box.setAttribute("aria-hidden", "true");
    for (var i = 0; i < 28; i++) { var s = D.createElement("i"); s.textContent = ["💪", "🔥", "💦", "🏋️", "⭐"][i % 5]; s.style.setProperty("--x", (Math.random() * 2 - 1) * 46 + "vw"); s.style.setProperty("--y", -(30 + Math.random() * 55) + "vh"); s.style.setProperty("--r", Math.random() * 720 - 360 + "deg"); s.style.animationDelay = Math.random() * 0.15 + "s"; box.appendChild(s); }
    D.body.appendChild(box); setTimeout(function () { box.remove(); }, 1900);
  }

  /* ---------- gym info ---------- */
  function renderGym() {
    var g = C;
    $("#gymAbout").textContent = g.about;
    $("#gymHours").innerHTML = g.hours.map(function (h) { return "<li><span>" + esc(h[0]) + "</span><b>" + esc(h[1]) + "</b></li>"; }).join("");
    $("#gymAddr").textContent = g.address || "Address on Instagram";
    $("#gymCall").href = g.phone ? "tel:" + g.phone.replace(/[^\d+]/g, "") : g.instagram; $("#gymCall").textContent = g.phone ? "📞 Call " + g.phone : "💬 Message on Instagram";
    $("#gymText").href = g.phone ? "sms:" + g.phone.replace(/[^\d+]/g, "") : g.instagram; $("#gymText").hidden = !g.phone;
    $("#gymMap").href = g.address ? "https://maps.apple.com/?q=" + encodeURIComponent(g.name + " " + g.address) : g.instagram;
    $("#gymIg").href = g.instagram;
    $("#gymPerks").innerHTML = g.perks.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("");
    $("#gymShop").innerHTML = g.shop.map(function (p) { return "<li><span>" + p.icon + "</span><div><b>" + esc(p.name) + "</b><small>" + esc(p.note) + "</small></div></li>"; }).join("");
    $("#gymQa").innerHTML = g.qa.map(function (q) { return "<details><summary>" + esc(q[0]) + "</summary><p>" + esc(q[1]) + "</p></details>"; }).join("");
  }

  /* ---------- boot ---------- */
  D.title = C.name + " · Member App";
  $$("[data-name]").forEach(function (el) { el.textContent = C.name; });
  renderGym();
  if (S && S.profile) showApp(); else showAuth();
  if (/[?&]demo=1/.test(location.search) && !S) $("#demoBtn").click();
  window.__AOG = { state: function () { return S; }, save: save, go: go, toast: toast, burst: burst, qr: qr, esc: esc, ymd: ymd, nice: nice };
  D.dispatchEvent(new Event("aog:ready"));
})();
