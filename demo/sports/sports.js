/* SousShift AI · Sports Bar Package (2026-10). A config-driven add-on for any restaurant/bar client; Melody is install #1.
   Include on a client page (see demo/sports/README.md):
     <link rel="stylesheet" href="../sports/sports.css?v=sb1">
     <script>window.SPORTS_CFG = { ... }</script>
     <script src="../sports/teams.js?v=sb1"></script><script src="../sports/sports.js?v=sb1"></script>
   What it does: live scores for the client's region teams (ticker + full-screen scoreboard), My Teams (follow several),
   records / standings / playoff picture, UFC cards, owner-edited Fight Night cards (BKFC etc., events.json), and an
   optional perks layer (watch-party banner, pick-the-winner points, fight-night RSVP).
   DATA (no key; CORS "*" verified 2026-10-13; info only, never scraped, never streamed):
     scoreboard  https://site.api.espn.com/apis/site/v2/sports/{sport}/{league}/scoreboard?dates=YYYYMMDD (local date)
     schedule    https://site.api.espn.com/apis/site/v2/sports/{sport}/{league}/teams/{id}/schedule
                 (team.standingSummary / recordSummary, next game + TV, playoff round from notes, last 5 results)
     standings   https://site.api.espn.com/apis/v2/sports/{sport}/{league}/standings (seed, games back, clinch, magic number)
   NOTE: ESPN's team endpoint /teams/{id} sends NO Access-Control-Allow-Origin header, so the same facts come from
   /teams/{id}/schedule, which does. ESPN's edge also answers 403 to headless browsers (real phones are fine).
   Teams are matched by ESPN team ID per league, never by display name. Missing fields are hidden, never invented.
   Refresh: 30 s while the scoreboard is open, 60 s for the ticker, paused while the tab is hidden. */
(function () {
  "use strict";
  if (window.SportsBar) return;
  var CFG = window.SPORTS_CFG || {}, L = window.SPORTS_LEAGUES, REG = window.SPORTS_REGIONS;
  if (!L || !REG) return;
  var region = REG[CFG.region || "la"] || REG.la;
  var TZ = CFG.timeZone || "America/Los_Angeles", TZS = CFG.tzLabel || "PT";
  var BASE = "https://site.api.espn.com/apis/site/v2/sports/", SBASE = "https://site.api.espn.com/apis/v2/sports/";
  var LORDER = (CFG.leagues || ["mlb", "nfl", "nba", "nhl", "mls", "wnba", "cfb", "cbb", "ufc"]).filter(function (k) { return L[k]; });
  var TEAMLG = LORDER.filter(function (k) { return !L[k].fights; });
  var TEAMS = (CFG.teams || region.teams).filter(function (t) { return TEAMLG.indexOf(t[0]) >= 0; });
  var TK = {}; TEAMS.forEach(function (t) { TK[t[0] + ":" + t[1]] = t; });
  var PERKS = CFG.perks || {}, NAME = CFG.name || "the bar", SLUG = CFG.client || "client";
  var RNAME = CFG.regionLabel || region.short || region.name;

  /* ---------- small helpers ---------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function day(d) { try { return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d || new Date()); } catch (e) { return (d || new Date()).toISOString().slice(0, 10); } }
  var K = function (k) { return "sp:" + SLUG + ":" + k; };   // per-client storage keys
  function isLocal(lg, id) { return !!TK[lg + ":" + id]; }
  function logoFor(t) {
    var lg = t[0];
    if (lg === "mls") return "https://a.espncdn.com/i/teamlogos/soccer/500/" + t[1] + ".png";
    if (L[lg].college) return "https://a.espncdn.com/i/teamlogos/ncaa/500/" + t[1] + ".png";
    return "https://a.espncdn.com/i/teamlogos/" + lg + "/500/" + t[2].toLowerCase() + ".png";
  }
  function toast(msg, ms) { var t = document.createElement("div"); t.className = "sp-toast"; t.setAttribute("role", "status"); t.innerHTML = msg; document.body.appendChild(t); setTimeout(function () { t.remove(); }, ms || 4200); }

  /* ---------- theme ---------- */
  (function () {
    var th = CFG.theme || {}, map = { bg: "--sp-bg", panel: "--sp-panel", edge: "--sp-edge", accent: "--sp-accent", accent2: "--sp-accent2", ink: "--sp-ink", dim: "--sp-dim", onAccent: "--sp-on-accent", live: "--sp-live", good: "--sp-good", bad: "--sp-bad", display: "--sp-display", body: "--sp-body", punch: "--sp-punch" };
    Object.keys(map).forEach(function (k) { if (th[k]) document.documentElement.style.setProperty(map[k], th[k]); });
  })();

  /* ---------- state ---------- */
  var SB = {}, SBerr = {}, LEAGUE = {}, STAND = {}, SCHED = {}, FN = null, lastOk = 0;
  function follows() { var f = lsGet(K("follow"), []); return Array.isArray(f) ? f.filter(function (k) { return TK[k]; }) : []; }
  function picks() { var p = lsGet(K("picks"), {}); return p && typeof p === "object" ? p : {}; }

  /* ---------- fetch ---------- */
  function getJSON(url) {
    var c = window.AbortController ? new AbortController() : null, t = setTimeout(function () { if (c) c.abort(); }, 9000);
    return fetch(url, c ? { signal: c.signal } : {}).then(function (r) { clearTimeout(t); if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); }, function (e) { clearTimeout(t); throw e; });
  }
  function fresh(c, ms) { return c && Date.now() - c.ts < ms; }
  function loadScoreboards() {
    var d = day().replace(/-/g, "");
    return Promise.all(LORDER.map(function (lg) {
      var u = BASE + L[lg].path + "/scoreboard" + (L[lg].fights ? "" : "?dates=" + d + "&limit=300" + (L[lg].q || ""));
      return getJSON(u).then(function (j) { SB[lg] = (j && j.events) || []; SBerr[lg] = 0; if (j && j.leagues && j.leagues[0]) LEAGUE[lg] = j.leagues[0]; lastOk = Date.now(); }, function () { SBerr[lg] = 1; });
    }));
  }
  function cached(store, key, ms, make) {
    if (fresh(store[key], ms) || (store[key] && store[key].p)) return store[key].p || Promise.resolve();
    var old = store[key] || {}, p = make().then(function (v) { store[key] = Object.assign({ ts: Date.now() }, v); }, function () { store[key] = { ts: Date.now(), d: null }; });
    store[key] = Object.assign({}, old, { ts: 0, p: p }); return p;
  }
  function loadStand(lg) {
    if (L[lg].college || L[lg].fights || lg === "wnba") return Promise.resolve();
    return cached(STAND, lg, 6e5, function () { return getJSON(SBASE + L[lg].path + "/standings").then(function (j) { return { d: j }; }); });
  }
  function loadSched(key) {
    var t = TK[key], u = BASE + L[t[0]].path + "/teams/" + t[1] + "/schedule";
    return cached(SCHED, key, 6e5, function () {
      return getJSON(u).then(function (j) {
        var team = (j && j.team) || null, cur = (j && j.events) || [];
        var pack = function (ev) { return { d: ev, team: team, cur: cur }; };
        if (cur.filter(done).length >= 5) return pack(cur);
        return getJSON(u + "?seasontype=2").then(function (k) { var ids = {}; cur.forEach(function (e) { ids[e.id] = 1; }); return pack(((k && k.events) || []).filter(function (e) { return !ids[e.id]; }).concat(cur)); }, function () { return pack(cur); });
      });
    });
  }
  function loadFightNight() {
    var f = CFG.fightNight; if (!f) return Promise.resolve();
    if (FN && Date.now() - FN.ts < 3e5) return Promise.resolve();
    return getJSON((f.url || "../sports/events.json") + "?t=" + Math.floor(Date.now() / 3e5)).then(function (j) {
      var list = (j && Array.isArray(j.events) ? j.events : []).filter(function (e) {
        return e && e.name && e.date && (!e.clients || e.clients.indexOf(SLUG) >= 0 || e.clients.indexOf("all") >= 0) && new Date(e.date) > Date.now() - 8 * 36e5;
      }).sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
      FN = { ts: Date.now(), d: list };
    }, function () { FN = { ts: Date.now(), d: [] }; });
  }

  /* ---------- event helpers ---------- */
  function comp(e) { return e && e.competitions && e.competitions[0]; }
  function done(e) { return state(e) === "post"; }
  function state(e) { var c = comp(e); return (c && c.status && c.status.type && c.status.type.state) || (e && e.status && e.status.type && e.status.type.state) || "pre"; }
  function statusText(e) { var c = comp(e), s = (c && c.status) || e.status || {}; return (s.type && (s.type.shortDetail || s.type.detail)) || ""; }
  function locals(lg, e) { var c = comp(e); return c ? c.competitors.filter(function (x) { return x.team && isLocal(lg, String(x.team.id)); }).map(function (x) { return lg + ":" + x.team.id; }) : []; }
  function fmtTime(iso, withDay) { try { var o = { timeZone: TZ, hour: "numeric", minute: "2-digit" }; if (withDay) { o.weekday = "short"; o.month = "short"; o.day = "numeric"; } return new Date(iso).toLocaleString("en-US", o) + " " + TZS; } catch (x) { return ""; } }
  function tv(c) {
    var n = [];
    ((c && c.broadcasts) || []).forEach(function (b) { if (b.names) n = n.concat(b.names); else if (b.media && b.media.shortName) n.push(b.media.shortName); });
    return n.filter(function (x, i) { return x && n.indexOf(x) === i; }).slice(0, 3).join(" · ");
  }
  function headline(c) { var n = c && c.notes && c.notes[0]; return (n && n.headline) || ""; }
  function score(x) { var s = x && x.score; if (s == null) return ""; return typeof s === "object" ? (s.displayValue || "") : String(s); }
  function recOf(x) { var r = x && (x.records || x.record); if (!r || !r.length) return ""; var t = r.filter(function (y) { return y.type === "total" || y.name === "overall"; })[0] || r[0]; return t.summary || t.displayValue || ""; }
  function nm(x) { return x.team.abbreviation || x.team.shortDisplayName || ""; }

  /* ---------- standings + playoff picture ---------- */
  function standEntry(lg, id) {
    var s = STAND[lg] && STAND[lg].d; if (!s) return null;
    var groups = [], walk = function (n) { if (n.standings && n.standings.entries) groups.push(n); (n.children || []).forEach(walk); };
    walk(s);
    for (var i = 0; i < groups.length; i++) { var en = groups[i].standings.entries; for (var j = 0; j < en.length; j++) if (String(en[j].team.id) === String(id)) return { e: en[j], group: groups[i], type: groups[i].standings.seasonType }; }
    return null;
  }
  function stats(en) { var o = {}; (en.stats || []).forEach(function (x) { o[x.name] = x; }); return o; }
  function num(st, k) { var v = st[k]; if (!v) return null; var n = v.value != null ? +v.value : parseFloat(v.displayValue); return isFinite(n) ? n : null; }
  // 1 preseason · 2 regular season · 3 postseason · 4 offseason (MLS sends its own type ids, e.g. 13846 = regular season)
  function seasonType(lg) {
    var s = LEAGUE[lg] && LEAGUE[lg].season, ty = s && s.type; if (!ty) return 0;
    var ab = String(ty.abbreviation || "").toLowerCase(), n = +ty.type;
    if (ab === "post") return 3; if (ab === "pre") return 1; if (ab === "off") return 4;
    return n >= 1 && n <= 4 ? n : 2;
  }
  function roundsLeft(lg, h) {
    h = (h || "").toLowerCase(); if (!h) return 0;
    var R = {
      mlb: [[/world series/, 1], [/alcs|nlcs|championship series/, 2], [/alds|nlds|division series/, 3], [/wild ?card/, 4]],
      nfl: [[/super bowl/, 1], [/championship/, 2], [/divisional/, 3], [/wild ?card/, 4]],
      nba: [[/nba finals/, 1], [/conference finals|east finals|west finals/, 2], [/semifinal|second round|2nd round/, 3], [/first round|1st round/, 4]],
      nhl: [[/stanley cup final/, 1], [/conference final/, 2], [/second round|2nd round/, 3], [/first round|1st round/, 4]],
      mls: [[/mls cup/, 1], [/conference final/, 2], [/semifinal/, 3], [/round one/, 4], [/wild ?card/, 5]],
      wnba: [[/finals/, 1], [/semifinal/, 2], [/first round/, 3]]
    }[lg] || [];
    for (var i = 0; i < R.length; i++) if (R[i][0].test(h)) return R[i][1];
    return 0;
  }
  function stripGame(h) { return (h || "").replace(/\s*-\s*Game \d+$/i, ""); }
  function postInfo(key, ev) {
    var t = TK[key], lg = t[0], id = String(t[1]), sc = SCHED[key];
    var evs = ((sc && sc.cur) || []).filter(function (e) { return e.seasonType && +e.seasonType.type === 3; }).sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
    if (ev && comp(ev) && comp(ev).series && evs.every(function (e) { return e.id !== ev.id; })) evs.push(ev);
    if (!evs.length) return null;
    var nxt = evs.filter(function (e) { return state(e) !== "post"; })[0], last = nxt || evs[evs.length - 1];
    var c = comp(last), h = headline(c), round = stripGame(h);
    var oppC = c && c.competitors.filter(function (x) { return String(x.team.id) !== id; })[0], oppId = oppC && String(oppC.team.id);
    var oppName = oppC ? (oppC.team.shortDisplayName || oppC.team.abbreviation || "") : "";
    var w = 0, l = 0;
    evs.filter(function (e) { var cc = comp(e); return done(e) && stripGame(headline(cc)) === round && cc.competitors.some(function (x) { return String(x.team.id) === oppId; }); })
      .forEach(function (e) { comp(e).competitors.forEach(function (x) { if (String(x.team.id) === id && x.winner === true) w++; if (String(x.team.id) === oppId && x.winner === true) l++; }); });
    var ser = (ev && comp(ev) && comp(ev).series) || null, out = { round: round, rl: roundsLeft(lg, h) };
    var lead = function (n2) { return /s$/.test(n2) ? " lead " : " leads "; };
    out.summary = ser && ser.summary ? ser.summary : (L[lg].single || !(w + l)) ? "" : (w === l ? "Series tied " + w + "-" + l : (w > l ? t[3] + lead(t[3]) + w + "-" + l : oppName + lead(oppName) + l + "-" + w));
    if (ser && ser.totalCompetitions && !ser.completed) { var mine = (ser.competitors || []).filter(function (x) { return String(x.id) === id; })[0]; if (mine) out.need = Math.ceil(ser.totalCompetitions / 2) - (mine.wins || 0); }
    if (!nxt) out.result = L[lg].single ? (c.competitors.some(function (x) { return String(x.team.id) === id && x.winner === true; }) ? "won" : "lost") : (w > l ? "won" : w < l ? "lost" : "");
    return out;
  }
  // {rec, standing, lines, badges}: numbers come from the API; games back = arithmetic on API wins/losses/points
  // against the team holding the last playoff seed.
  function teamInfo(key, ev) {
    var t = TK[key], lg = t[0], id = t[1], out = { rec: "", standing: "", lines: [], badges: [] };
    var sc = SCHED[key], tm = sc && sc.team, st = seasonType(lg), se = standEntry(lg, id), S = se ? stats(se.e) : null;
    if (S && lg === "mls" && num(S, "wins") != null) out.rec = num(S, "wins") + "W-" + num(S, "ties") + "D-" + num(S, "losses") + "L" + (num(S, "points") != null ? " · " + num(S, "points") + " pts" : "");
    else if (S && S.overall && S.overall.displayValue) out.rec = S.overall.displayValue;
    else if (tm && tm.recordSummary) out.rec = tm.recordSummary;
    if (tm && tm.standingSummary && st !== 1) out.standing = tm.standingSummary;
    if (st === 1) out.lines.push("Preseason");
    var pi = st === 3 || (ev && comp(ev) && comp(ev).series) ? postInfo(key, ev) : null;
    if (pi) {
      var title = L[lg].title || "title", unit = L[lg].single ? " win" : " series win";
      if (pi.result === "lost") { out.lines.push((pi.round ? pi.round + " · " : "") + "Season over"); out.badges.push(["Eliminated", "out"]); }
      else {
        out.lines.push([pi.round, pi.summary].filter(Boolean).join(" · "));
        if (pi.need > 0) out.lines.push(t[3] + (/s$/.test(t[3]) ? " need " : " needs ") + pi.need + " more win" + (pi.need > 1 ? "s" : "") + " to take the series");
        var rl = pi.result === "won" ? pi.rl - 1 : pi.rl;
        if (pi.result === "won" && pi.rl === 1) { out.lines.push("Won the " + title + "!"); out.badges.push(["Champions", "in"]); }
        else {
          if (pi.result === "won" && pi.round) out.lines.push("Won the " + pi.round + ", waiting on the next round");
          if (rl > 0) out.lines.push(rl === 1 && pi.result !== "won" ? "Playing for the " + title : rl + unit + (rl > 1 ? "s" : "") + " from the " + title);
          out.badges.push(["Playoffs", "in"]);
        }
      }
    } else if ((st === 3 || st === 4) && !L[lg].college) {
      out.lines.push((st === 4 ? "Offseason" : "Season over") + (out.standing ? " · finished " + out.standing : ""));
      var cal = LEAGUE[lg] && LEAGUE[lg].calendar, reg = Array.isArray(cal) ? cal.filter(function (x) { return x && typeof x === "object" && /regular/i.test(x.label || "") && x.startDate; })[0] : null;
      if (st === 4 && reg && new Date(reg.startDate) > Date.now()) out.lines.push("Next season starts " + new Date(reg.startDate).toLocaleDateString("en-US", { timeZone: TZ, month: "short", day: "numeric", year: "numeric" }));
    }
    if (S && st === 2 && (se.type === 2 || lg === "mls") && !pi) {
      var cl = S.clincher && S.clincher.displayValue;
      if (cl) { if (/^e$/i.test(cl)) out.badges.push(["Eliminated", "out"]); else out.badges.push(["Clinched", "in"]); }
      if (se.e.note && se.e.note.description) out.lines.push(se.e.note.description);
      var seed = num(S, "playoffSeed") || (lg === "mls" ? num(S, "rank") : null), cut = L[lg].cut;
      if (seed && cut && !/^e$/i.test(cl || "")) {
        var en = se.group.standings.entries, by = function (n) { return en.filter(function (x) { return num(stats(x), "playoffSeed") === n || (lg === "mls" && num(stats(x), "rank") === n); })[0]; };
        var other = seed <= cut ? by(cut + 1) : by(cut), d = null, pts = L[lg].gb === "points";
        if (other) {
          var o = stats(other);
          if (pts) { var p1 = num(S, "points"), p2 = num(o, "points"); if (p1 != null && p2 != null) d = p1 - p2; }
          else { var w1 = num(S, "wins"), l1 = num(S, "losses"), w2 = num(o, "wins"), l2 = num(o, "losses"); if ([w1, l1, w2, l2].every(function (v) { return v != null; })) d = ((w1 - w2) + (l2 - l1)) / 2; }
        }
        var gap = function (x) { x = Math.abs(x); return pts ? x + " pt" + (x === 1 ? "" : "s") : x + " game" + (x === 1 ? "" : "s"); };
        if (seed <= cut) out.lines.push("In playoff position (seed " + seed + ")" + (d > 0 ? ", +" + gap(d) + " on the first team out" : ""));
        else out.lines.push("Seed " + seed + (d == null ? "" : d === 0 ? " · level with the last playoff spot" : " · " + gap(d) + " back of a playoff spot"));
      }
      var mn = num(S, "magicNumberDivision"); if (lg === "mlb" && mn != null && mn > 0 && !cl) out.lines.push("Magic number (division): " + mn);
    }
    out.lines = out.lines.filter(Boolean);
    return out;
  }

  /* ---------- model ---------- */
  function collect() {
    var today = day(), rows = [];
    TEAMLG.forEach(function (lg) {
      (SB[lg] || []).forEach(function (e) {
        var lk = locals(lg, e); if (!lk.length) return;
        var s = state(e); if (s !== "in" && day(new Date(e.date)) !== today) return;
        rows.push({ lg: lg, e: e, s: s, keys: lk });
      });
    });
    var f = follows(), fol = function (r) { return r.keys.some(function (k) { return f.indexOf(k) >= 0; }) ? 0 : 1; };
    var by = function (s) { return rows.filter(function (r) { return r.s === s; }).sort(function (a, b) { return fol(a) - fol(b) || new Date(a.e.date) - new Date(b.e.date); }); };
    return { live: by("in"), up: by("pre"), fin: by("post"), all: rows };
  }
  // every game today (or live now) in the enabled leagues, not only the region's teams: the "All games" tab + carousel mode
  function collectAll() {
    var today = day(), rows = [];
    TEAMLG.forEach(function (lg) {
      (SB[lg] || []).forEach(function (e) {
        var s = state(e); if (s !== "in" && day(new Date(e.date)) !== today) return;
        rows.push({ lg: lg, e: e, s: s, keys: locals(lg, e) });
      });
    });
    var by = function (s) { return rows.filter(function (r) { return r.s === s; }).sort(function (a, b) { return (b.keys.length ? 1 : 0) - (a.keys.length ? 1 : 0) || new Date(a.e.date) - new Date(b.e.date); }); };
    return { live: by("in"), up: by("pre"), fin: by("post"), all: rows };
  }
  function allErr() { return TEAMLG.every(function (lg) { return SBerr[lg]; }); }

  /* ---------- where to watch: the client's own spots (CFG.watchAt) + each network's OFFICIAL site/app ---------- */
  // [match, label (null = keep ESPN's name), official URL, 1 = needs a subscription/sign-in]. Never a pirate/unofficial stream.
  var WATCH = [
    [/^espn\+$/i, "ESPN+", "https://plus.espn.com/", 1],
    [/^(espn|espn2|espnu|espnews|abc|sec network|secn|acc network|accn)$/i, null, "https://www.espn.com/watch/", 1],
    [/^(fox|fs1|fs2|big ten network|btn|fox deportes)$/i, null, "https://www.foxsports.com/live", 1],
    [/^(cbs|cbssn|cbs sports network)$/i, null, "https://www.cbssports.com/watch/", 1],
    [/paramount/i, "Paramount+", "https://www.paramountplus.com/", 1],
    [/peacock/i, "Peacock", "https://www.peacocktv.com/", 1],
    [/^(nbc|nbcsn|usa net|usa network)$/i, null, "https://www.peacocktv.com/", 1],
    [/prime/i, "Prime Video", "https://www.amazon.com/primevideo", 1],
    [/^nfl\+$/i, "NFL+", "https://www.nfl.com/plus/", 1],
    [/nfl net/i, "NFL Network", "https://www.nfl.com/network/watch/", 1],
    [/mls season pass/i, "MLS Season Pass", "https://tv.apple.com/channel/mls-season-pass", 1],
    [/apple/i, "Apple TV", "https://tv.apple.com/", 1],
    [/league pass/i, "NBA League Pass", "https://www.nba.com/watch/league-pass-stream", 1],
    [/^nba tv$/i, "NBA TV", "https://www.nba.com/watch/nba-tv", 1],
    [/mlb\.tv/i, "MLB.TV", "https://www.mlb.com/tv", 1],
    [/mlb net|mlbn/i, "MLB Network", "https://www.mlb.com/network", 1],
    [/nhl net/i, "NHL Network", "https://www.nhl.com/", 1],
    [/sportsnet la|snla/i, "Spectrum SportsNet LA", "https://www.spectrumsportsnetla.com/", 1],
    [/spectrum sportsnet|^spectrum sn$/i, "Spectrum SportsNet", "https://www.spectrumsportsnet.com/", 1],
    [/fanduel|bally|fdsn/i, null, "https://www.fanduelsportsnetwork.com/", 1],
    [/^(tnt|trutv|tbs|max|hbo max)$/i, null, "https://www.hbomax.com/sports", 1],
    [/netflix/i, "Netflix", "https://www.netflix.com/", 1],
    [/youtube/i, null, "https://tv.youtube.com/", 1],
    [/victory\+/i, "Victory+", "https://www.victoryplus.com/", 0],
    [/ufc fight pass/i, "UFC Fight Pass", "https://ufcfightpass.com/", 1]
  ];
  function nets(c) {
    var n = [];
    ((c && c.broadcasts) || []).forEach(function (b) { if (b.names) n = n.concat(b.names); else if (b.media && b.media.shortName) n.push(b.media.shortName); else if (b.name) n.push(b.name); });
    ((c && c.geoBroadcasts) || []).forEach(function (g) { if (g.media && g.media.shortName) n.push(g.media.shortName); });
    return n.filter(function (x, i) { return x && n.indexOf(x) === i; });
  }
  function netLinks(c) {
    return nets(c).map(function (nm) { var hit = WATCH.filter(function (w) { return w[0].test(String(nm).trim()); })[0]; return { name: (hit && hit[1]) || nm, url: hit ? hit[2] : "", sub: !!(hit && hit[3]) }; });
  }
  // CFG.watchAt: [{name, note, address, tel, maps, app}] — the client's own place first, sister spots after. Notes = the owner's real info only.
  function venuesHTML(live) {
    var v = Array.isArray(CFG.watchAt) ? CFG.watchAt : []; if (!v.length) return "";
    return '<div class="sp-sec">' + (live ? '<i class="sp-dot"></i>Watch it live with us' : '📍 Watch it with us') + '</div>' + v.map(function (p, i) {
      var maps = p.maps || (p.address ? "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(p.address) : "");
      return '<div class="sp-venue' + (i ? '' : ' me') + '"><b>' + esc(p.name) + '</b>' + (p.note ? '<small>' + esc(p.note) + '</small>' : '') + (p.address ? '<small>' + esc(p.address) + '</small>' : '') +
        '<div class="sp-vact">' + (maps ? '<a href="' + esc(maps) + '" target="_blank" rel="noopener">📍 Directions</a>' : '') + (p.tel ? '<a href="tel:' + esc(p.tel) + '">📞 Call</a>' : '') +
        (p.app ? '<a href="' + esc(p.app) + '">' + esc(p.appLabel || "Open their app") + '</a>' : '') + (p.book ? '<a href="' + esc(p.book) + '" target="_blank" rel="noopener">📅 Book a table</a>' : '') + '</div></div>';
    }).join("");
  }
  function watchHTML(c, live) {
    var rows = netLinks(c).map(function (n) {
      return '<div class="sp-w"><b>' + esc(n.name) + (n.sub ? '<span class="sp-wsub">Your subscription</span>' : '') + '</b>' + (n.url ? '<a href="' + esc(n.url) + '" target="_blank" rel="noopener">Watch ↗</a>' : '<span class="sp-wsub">On TV</span>') + '</div>';
    }).join("");
    return venuesHTML(live) + '<div class="sp-sec">📺 Stream or watch on TV</div>' +
      (rows ? '<div class="sp-g">' + rows + '</div>' : '<div class="sp-empty"><b>No TV info yet</b>ESPN hasn\'t listed the channel for this one. Check your local listings.</div>') +
      '<p class="sp-cred">Watch links open each network\'s official site or app, where you sign in with your own TV or streaming plan. What you can watch depends on your plan and where you are.</p>';
  }

  /* ---------- perks ---------- */
  // Watch-party banner: only when the client configured real text (no made-up deals) and a local/followed team is live.
  function watchPartyHTML(m) {
    var wp = PERKS.watchParty; if (!wp || !wp.text) return "";
    var f = follows(), live = m.live.filter(function (r) { return wp.when === "followed" ? r.keys.some(function (k) { return f.indexOf(k) >= 0; }) : true; });
    if (!live.length) return "";
    var r = live[0], k = r.keys[0];
    return '<div class="sp-wp" role="note"><span class="i">📺</span><div><b>' + esc(String(wp.text).replace(/\{team\}/g, TK[k][3])) + '</b>' + (wp.note ? '<small>' + esc(wp.note) + '</small>' : '') + '</div></div>';
  }
  // Pick-the-winner points: picks lock at start time; a correct pick made BEFORE the start earns PERKS.picks.perPick points,
  // at most PERKS.picks.dailyCap a day per phone, through the client's points hook (CFG.points). No money, no betting.
  function pickPoints() { var p = PERKS.picks; return p && p.points && CFG.points && typeof CFG.points.award === "function" ? p : null; }
  function pointsOn() { try { return !CFG.points || typeof CFG.points.enabled !== "function" || !!CFG.points.enabled(); } catch (e) { return false; } }
  function settlePicks(rows) {
    var pp = pickPoints(); if (!pp) return;
    var pk = picks(), paid = lsGet(K("paid"), {}) || {}, cap = lsGet(K("pts"), null), today = day();
    if (!cap || cap.day !== today) cap = { day: today, pts: 0 };
    rows.forEach(function (r) {
      var p = pk[r.e.id]; if (!p || paid[r.e.id]) return;
      var w = comp(r.e).competitors.filter(function (x) { return x.winner === true; })[0];
      if (!w) return;
      paid[r.e.id] = 1;
      if (String(w.team.id) !== String(p.team) || !(p.ts < new Date(r.e.date).getTime())) return;
      if (!pointsOn()) return;
      var n = Math.min(pp.perPick || 1, (pp.dailyCap || 5) - cap.pts); if (n <= 0) return;
      var res = null; try { res = CFG.points.award(n, "Pick the winner · " + nm(w)); } catch (e) {}
      var got = res && res.pts != null ? res.pts : n; cap.pts += got;
      if (got) toast("✅ You called it: " + esc(nm(w)) + " won! +" + got + " " + esc(CFG.points.unit || "points") + (res && res.saved === false ? " (join to save them)" : ""));
    });
    lsSet(K("paid"), paid); lsSet(K("pts"), cap);
  }

  /* ---------- render: team games ---------- */
  function teamRow(lg, x, st) {
    var t = x.team || {}, logo = t.logo || (t.logos && t.logos[0] && t.logos[0].href) || "", key = lg + ":" + t.id;
    var cls = st === "post" && x.winner === true ? " w" : st === "post" && x.winner === false ? " l" : "";
    return '<div class="sp-tm' + cls + '">' + (logo ? '<img src="' + esc(logo) + '" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'">' : '<span style="width:30px"></span>') +
      '<span class="n"><b>' + esc(t.shortDisplayName || t.displayName || t.abbreviation || "") + (follows().indexOf(key) >= 0 ? '<span class="sp-bdg fol">★ Following</span>' : '') + '</b><small>' + esc([t.abbreviation, recOf(x)].filter(Boolean).join(" · ")) + (x.homeAway === "home" ? " · home" : "") + '</small></span>' +
      (st !== "pre" ? '<span class="s">' + esc(score(x)) + '</span>' : '') + '</div>';
  }
  function infoHTML(key, ev) {
    var t = TK[key], i = teamInfo(key, ev);
    if (!i.standing && !i.badges.length && !i.lines.length) return "";
    return '<div><b>' + esc(t[3]) + '</b>' + (i.standing ? ' · ' + esc(i.standing) : '') + i.badges.map(function (b) { return '<span class="sp-bdg ' + b[1] + '">' + esc(b[0]) + '</span>'; }).join("") +
      i.lines.map(function (l) { return '<div>' + esc(l) + '</div>'; }).join("") + '</div>';
  }
  function pickHTML(r) {
    if (!PERKS.picks || !PERKS.picks.on) return "";
    var c = comp(r.e); if (!c || r.e.id == null) return "";
    var p = picks()[r.e.id], cs = c.competitors, pp = pickPoints();
    if (r.s === "post") {
      if (!p) return "";
      var w = cs.filter(function (x) { return x.winner === true; })[0]; if (!w) return "";
      return '<div class="sp-pk">' + (String(w.team.id) === String(p.team) ? "✅ You called it!" : "❌ Not this time") + '</div>';
    }
    if (r.s === "in") { if (!p) return ""; var mine = cs.filter(function (x) { return String(x.team.id) === String(p.team); })[0]; return mine ? '<div class="sp-pk">Your pick: <b>' + esc(nm(mine)) + '</b> (locked at start)</div>' : ""; }
    var lbl = pp && pointsOn() ? "Who wins? Right pick = +" + (pp.perPick || 1) + " " + esc(CFG.points.unit || "points") : "Who wins? (just for fun)";
    return '<div class="sp-pk"><span>' + lbl + '</span>' + cs.map(function (x) { return '<button type="button" data-pk="' + esc(r.e.id) + '" data-tm="' + esc(x.team.id) + '" aria-pressed="' + (!!p && String(p.team) === String(x.team.id)) + '">' + esc(nm(x)) + '</button>'; }).join("") + '</div>';
  }
  function gameHTML(r) {
    var c = comp(r.e); if (!c) return "";
    var f = follows(), fol = r.keys.some(function (k) { return f.indexOf(k) >= 0; });
    var away = c.competitors.filter(function (x) { return x.homeAway === "away"; })[0] || c.competitors[1], home = c.competitors.filter(function (x) { return x.homeAway === "home"; })[0] || c.competitors[0];
    var stl = r.s === "in" ? '<span class="lv"><i class="sp-dot"></i>LIVE · ' + esc(statusText(r.e)) + '</span>' : r.s === "pre" ? '<span>' + esc(fmtTime(r.e.date)) + '</span>' : '<span>' + esc(statusText(r.e) || "Final") + '</span>';
    var sub = [L[r.lg].name, headline(c)].filter(Boolean).join(" · "), tvs = tv(c);
    return '<div class="sp-g' + (fol ? " fol" : "") + (r.s === "in" ? " live" : "") + '">' +
      '<div class="sp-tp">' + stl + '<span>' + esc(sub) + '</span></div>' + teamRow(r.lg, away, r.s) + teamRow(r.lg, home, r.s) +
      '<div class="sp-info">' + r.keys.map(function (k) { return infoHTML(k, r.e); }).join("") + (tvs && r.s !== "post" ? '<div>📺 ' + esc(tvs) + '</div>' : '') + '</div>' + (r.keys.length ? pickHTML(r) : '') +
      (r.s !== "post" && r.e.id != null ? '<button type="button" class="sp-wt' + (r.s === "in" ? ' lv' : '') + '" data-wt="' + esc(r.lg + ":" + r.e.id) + '">' + (r.s === "in" ? '<i class="sp-dot"></i>▶ Watch live' : '📺 Where to watch') + '</button>' : '') + '</div>';
  }
  function nextEv(key) {
    var ev = SCHED[key] && SCHED[key].d; if (!ev) return null;
    return ev.filter(function (e) { return state(e) === "pre" && new Date(e.date) > Date.now() - 6 * 36e5; }).sort(function (a, b) { return new Date(a.date) - new Date(b.date); })[0] || null;
  }
  function nextGameText(key) {
    var ne = nextEv(key), t = TK[key], c = comp(ne); if (!c) return "";
    var me = c.competitors.filter(function (x) { return String(x.team.id) === t[1]; })[0], op = c.competitors.filter(function (x) { return String(x.team.id) !== t[1]; })[0];
    if (!op) return "";
    var tvs = tv(c), h = headline(c);
    return (me && me.homeAway === "home" ? "vs " : "at ") + (op.team.shortDisplayName || op.team.displayName || op.team.abbreviation) + " · " + fmtTime(ne.date, true) + (tvs ? " · 📺 " + tvs : "") + (h ? " · " + h : "");
  }
  function last5(key) {
    var ev = SCHED[key] && SCHED[key].d; if (!ev) return "";
    var t = TK[key], fin = ev.filter(done).sort(function (a, b) { return new Date(b.date) - new Date(a.date); }).slice(0, 5).reverse();
    if (!fin.length) return "";
    return '<div class="sp-l5" aria-label="Last ' + fin.length + ' results"><small>Last ' + fin.length + '</small>' + fin.map(function (e) {
      var c = comp(e), me = c.competitors.filter(function (x) { return String(x.team.id) === t[1]; })[0], op = c.competitors.filter(function (x) { return String(x.team.id) !== t[1]; })[0];
      if (!me || !op) return "";
      var r = me.winner === true ? "W" : op.winner === true ? "L" : (t[0] === "mls" ? "D" : "T");
      return '<i class="' + r + '" title="' + esc(r + " " + score(me) + "-" + score(op) + " " + (op.team.abbreviation || "")) + '">' + r + '</i>';
    }).join("") + '</div>';
  }
  function myCardHTML(key, rows) {
    var t = TK[key], sc = SCHED[key], td = sc && sc.team, logo = (td && td.logo) || logoFor(t);
    var r = rows.filter(function (x) { return x.keys.indexOf(key) >= 0 && x.s !== "post"; })[0] || rows.filter(function (x) { return x.keys.indexOf(key) >= 0; })[0];
    var i = teamInfo(key, r && r.e), nx = !r || r.s === "post" ? nextGameText(key) : "";
    var body = r ? gameHTML(r) : (nx ? '<div class="sp-info" style="border:0;padding-top:4px"><div>Next: <b>' + esc(nx) + '</b></div></div>' : (sc && sc.d === null ? '<div class="sp-info" style="border:0">Team info unavailable right now.</div>' : ''));
    if (r && r.s === "post" && nx) body += '<div class="sp-info"><div>Next: <b>' + esc(nx) + '</b></div></div>';
    return '<div class="sp-my"><div class="hd"><img src="' + esc(logo) + '" alt="" onerror="this.style.visibility=\'hidden\'"><div style="min-width:0"><b>' + esc((td && td.displayName) || t[3]) + '</b><small>' + esc([L[t[0]].name, i.rec, i.standing].filter(Boolean).join(" · ")) + '</small></div><span class="sp-bdg fol" style="margin-left:auto">★ Following</span></div>' +
      (!r && (i.lines.length || i.badges.length) ? '<div class="sp-info">' + i.lines.map(function (l) { return '<div>' + esc(l) + '</div>'; }).join("") + i.badges.map(function (b) { return '<span class="sp-bdg ' + b[1] + '" style="margin:4px 4px 0 0">' + esc(b[0]) + '</span>'; }).join("") + '</div>' : '') +
      body + last5(key) + '</div>';
  }
  function nextScheduled() {
    var best = null;
    TEAMS.forEach(function (t) { var k = t[0] + ":" + t[1], ne = nextEv(k); if (ne && (!best || new Date(ne.date) < new Date(best.e.date))) best = { k: k, e: ne }; });
    if (!best) return "";
    var c = comp(best.e); return (best.e.shortName || best.e.name || TK[best.k][3]) + " · " + fmtTime(best.e.date, true) + (tv(c) ? " · 📺 " + tv(c) : "");
  }

  /* ---------- render: fights (UFC from ESPN + owner-edited Fight Night cards) ---------- */
  var METHOD = { kotko: "KO/TKO", decision: "Decision", submission: "Submission", dq: "DQ" };
  function boutMethod(c) {
    var d = ((c && c.details) || []).map(function (x) { return x.type && x.type.text; }).filter(function (x) { return /winner/i.test(x || ""); })[0];
    if (!d) return "";
    var m = d.replace(/^unofficial\s+winner\s*/i, "").trim(); return METHOD[m.toLowerCase()] || m;
  }
  function fighter(x, cls) {
    var a = x.athlete || {}, rec = recOf(x), fl = a.flag && a.flag.alt;
    return '<div class="f' + cls + '"><b>' + esc(a.displayName || a.shortName || "TBA") + '</b><small>' + esc([rec, fl].filter(Boolean).join(" · ")) + '</small></div>';
  }
  function boutHTML(c, main) {
    var cs = (c.competitors || []).slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); }); if (cs.length < 2) return "";
    var st = (c.status && c.status.type && c.status.type.state) || "pre", fin = st === "post";
    var cl = function (x) { return fin ? (x.winner === true ? " win" : x.winner === false ? " lose" : "") : ""; };
    var res = "";
    if (fin) { var m = boutMethod(c), s = c.status || {}; res = ["Final", m, s.period ? "R" + s.period : "", s.displayClock && s.displayClock !== "0:00" ? s.displayClock : ""].filter(Boolean).join(" · "); }
    else if (st === "in") res = '<span style="color:#ff8a8a">● LIVE' + (c.status && c.status.period ? " · R" + c.status.period : "") + '</span>';
    return '<div class="sp-bout' + (main ? " main" : "") + '">' + (main || (c.type && c.type.abbreviation) ? '<div class="wc">' + (main ? "Main event · " : "") + esc((c.type && c.type.abbreviation) || "") + '</div>' : '') +
      fighter(cs[0], cl(cs[0])) + '<div class="vs">VS</div>' + fighter(cs[1], cl(cs[1]) + " r") + (res ? '<div class="res">' + (st === "in" ? res : esc(res)) + '</div>' : '') + '</div>';
  }
  function ufcHTML() {
    if (LORDER.indexOf("ufc") < 0) return "";
    if (SBerr.ufc && !SB.ufc) return '<div class="sp-empty"><b>UFC unavailable</b>Couldn\'t reach the fight data right now.</div>';
    var evs = (SB.ufc || []).slice().sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
    var h = "";
    evs.forEach(function (e) {
      var cs = e.competitions || [], s = state(e), venue = (cs[0] && cs[0].venue && cs[0].venue.fullName) || (e.venues && e.venues[0] && e.venues[0].fullName) || "";
      var n = cs.length, topN = cs.slice(Math.max(0, n - 5)).reverse();   // ESPN lists bouts in running order: the last bout is the main event
      var tvs = tv(cs[n - 1]);
      h += '<div class="sp-fx"><div class="sp-tp">' + (s === "in" ? '<span class="lv"><i class="sp-dot"></i>LIVE NOW</span>' : '<span>' + esc(s === "post" ? "Final results" : fmtTime(e.date, true)) + '</span>') + '<span>UFC</span></div>' +
        '<div class="ev">' + esc(e.name || "") + '</div><div class="meta">' + esc([venue, n ? n + " bouts" : "", tvs ? "📺 " + tvs : ""].filter(Boolean).join(" · ")) + '</div>' +
        topN.map(function (c, i) { return boutHTML(c, i === 0); }).join("") + (n > 5 ? '<div class="sp-cred" style="margin-top:6px">Top ' + topN.length + ' bouts shown, main event first</div>' : '') + '</div>';
    });
    var cal = LEAGUE.ufc && LEAGUE.ufc.calendar, now = Date.now(), seen = {};
    evs.forEach(function (e) { seen[e.name] = 1; });
    var next = Array.isArray(cal) ? cal.filter(function (x) { return x && x.label && x.startDate && new Date(x.startDate) > now && !seen[x.label]; }).slice(0, 3) : [];
    if (next.length) h += '<div class="sp-lbl">Coming up in the UFC</div><div class="sp-g">' + next.map(function (x) { return '<div class="sp-tm"><span class="n"><b>' + esc(x.label) + '</b><small>' + esc(fmtTime(x.startDate, true)) + '</small></span></div>'; }).join("") + '</div>';
    return h || '<div class="sp-empty"><b>No UFC card right now</b>Check back on fight week.</div>';
  }
  function fightNightHTML() {
    if (!CFG.fightNight) return "";
    var list = FN && FN.d; if (!list || !list.length) return "";
    var rs = PERKS.rsvp;
    return '<div class="sp-sec">🥊 Fight Night at ' + esc(NAME) + '</div>' + list.map(function (e, i) {
      return '<div class="sp-fx sp-fn"><span class="tag">' + esc(e.promotion || "Fight Night") + '</span><div class="ev" style="margin-top:6px">' + esc(e.name) + '</div>' +
        '<div class="meta">' + esc([fmtTime(e.date, true), e.venue].filter(Boolean).join(" · ")) + '</div>' +
        (e.mainEvent ? '<div class="me">' + esc(e.mainEvent) + '</div>' : '') +
        (e.watchParty ? '<div class="sp-info"><div>📺 <b>Watch party:</b> ' + esc(e.watchParty) + '</div></div>' : '') +
        (rs && rs.label && (rs.href || typeof rs.action === "function") ? '<a class="sp-btn" href="' + esc(rs.href || "#") + '" data-rsvp="' + i + '">' + esc(rs.label) + '</a>' : '') + '</div>';
    }).join("");
  }

  /* ---------- the sheet ---------- */
  var EXTRA = [];   // perk modules add their own tabs: SportsBar.addTab({id, label, render(box, helpers), visible?()})
  function extraTabs() { return EXTRA.filter(function (t) { try { return !t.visible || t.visible(); } catch (e) { return false; } }); }
  var ov = null, box = null, tab = "teams", busy = false, again = 0, poll = null, prevOverflow = "";
  function sheet() {
    if (ov) return ov;
    ov = document.createElement("div"); ov.id = "sp-ov"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-label", "Scoreboard");
    ov.innerHTML = '<div class="sp-top"><button type="button" class="x" aria-label="Close scoreboard">✕</button><div class="t"></div></div><div class="sp-body" data-scroll-ok><div class="sp-in"></div></div>';
    document.body.appendChild(ov);
    ov.querySelector(".x").onclick = close;
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && ov.classList.contains("on")) close(); });
    return ov;
  }
  function screen(title, html) { sheet(); ov.querySelector(".t").textContent = title; var i = ov.querySelector(".sp-in"); i.innerHTML = html; ov.querySelector(".sp-body").scrollTop = 0; return i; }
  function open(which) {
    sheet(); if (!ov.classList.contains("on")) { prevOverflow = document.documentElement.style.overflow; document.documentElement.style.overflow = "hidden"; ov.classList.add("on"); }
    if (which === "fights" || which === "teams" || (which === "all" && ALL) || EXTRA.some(function (t) { return t.id === which; })) tab = which;
    board();
    if (!poll) poll = setInterval(function () { if (!document.hidden && ov.classList.contains("on")) refresh(true); }, 30000);
  }
  function close() { if (!ov) return; ov.classList.remove("on"); document.documentElement.style.overflow = prevOverflow; box = null; if (poll) { clearInterval(poll); poll = null; } }
  function isOpen() { return !!(ov && ov.classList.contains("on")); }
  function hasFights() { return LORDER.indexOf("ufc") >= 0 || !!CFG.fightNight; }
  var ALL = CFG.allGames !== false, allLg = "";   // "📅 All games" tab (every game in the enabled leagues); allLg = league filter
  function allHTML() {
    var m = collectAll(), lgs = TEAMLG.filter(function (lg) { return m.all.some(function (r) { return r.lg === lg; }); });
    if (allLg && lgs.indexOf(allLg) < 0) allLg = "";
    var f = function (rs) { return allLg ? rs.filter(function (r) { return r.lg === allLg; }) : rs; };
    var h = lgs.length > 1 ? '<div class="sp-chips" role="group" aria-label="League"><button type="button" data-alg="" aria-pressed="' + (!allLg) + '">All</button>' + lgs.map(function (lg) { return '<button type="button" data-alg="' + lg + '" aria-pressed="' + (allLg === lg) + '">' + esc(L[lg].name) + '</button>'; }).join("") + '</div>' : '';
    if (allErr() && !m.all.length) return h + '<div class="sp-empty"><b>Scores unavailable</b>We couldn\'t reach the scores right now. We\'ll try again in a moment.</div>';
    if (!lastOk && !m.all.length) return h + '<div class="sp-empty"><b>Loading scores…</b></div>';
    var lv = f(m.live), up = f(m.up), fin = f(m.fin);
    if (lv.length) h += '<div class="sp-sec"><i class="sp-dot"></i>Live now</div>' + lv.map(gameHTML).join("");
    if (up.length) h += '<div class="sp-sec">Later today</div>' + up.map(gameHTML).join("");
    if (fin.length) h += '<div class="sp-sec">Final</div>' + fin.map(gameHTML).join("");
    if (!lv.length && !up.length && !fin.length) h += '<div class="sp-empty"><b>No games today</b>Check back on game day.</div>';
    return h;
  }
  function findRow(id) { var lg = id.split(":")[0], eid = id.split(":")[1]; return collectAll().all.filter(function (r) { return r.lg === lg && String(r.e.id) === eid; })[0] || null; }
  function watch(id) {
    var r = findRow(String(id)); if (!r) return;
    var c = comp(r.e), cs = c.competitors, a = cs.filter(function (x) { return x.homeAway === "away"; })[0] || cs[1], h = cs.filter(function (x) { return x.homeAway === "home"; })[0] || cs[0];
    box = null;
    var w = screen(nm(a) + " at " + nm(h), '<div class="sp-h"><small>' + esc(L[r.lg].name + " · " + (r.s === "in" ? "LIVE · " + statusText(r.e) : fmtTime(r.e.date, true))) + '</small>' + esc((a.team.shortDisplayName || nm(a)) + (r.s === "in" ? " " + score(a) + " – " + score(h) + " " : " at ") + (h.team.shortDisplayName || nm(h))) + '</div>' +
      watchHTML(c, r.s === "in") + '<button type="button" class="sp-btn" id="sp-back" style="margin-top:14px">‹ Back to scores</button>');
    w.querySelector("#sp-back").onclick = board;
  }
  function board() {
    var w = screen(CFG.title || "Scoreboard", '<div class="sp-h"><small>' + esc(RNAME) + ' teams' + (hasFights() ? ' · fights' : '') + '</small>' + esc(CFG.title || "Scoreboard") + '</div>' +
      (hasFights() || ALL || extraTabs().length ? '<div class="sp-tabs" role="group" aria-label="Section"><button type="button" data-tab="teams" aria-pressed="' + (tab === "teams") + '">🏟️ ' + esc(CFG.teamsTab || "Teams") + '</button>' +
        (ALL ? '<button type="button" data-tab="all" aria-pressed="' + (tab === "all") + '">📅 All games</button>' : '') +
        (hasFights() ? '<button type="button" data-tab="fights" aria-pressed="' + (tab === "fights") + '">🥊 Fights</button>' : '') +
        extraTabs().map(function (t) { return '<button type="button" data-tab="' + esc(t.id) + '" aria-pressed="' + (tab === t.id) + '">' + esc(t.label) + '</button>'; }).join("") + '</div>' : '') +
      '<div class="sp-bar"><button type="button" id="sp-pickbtn">★ My teams' + (follows().length ? " (" + follows().length + ")" : "") + '</button><button type="button" id="sp-rf">↻ Refresh</button></div><div id="sp-box"></div>');
    box = w.querySelector("#sp-box");
    [].forEach.call(w.querySelectorAll("[data-tab]"), function (b) { b.onclick = function () { tab = b.getAttribute("data-tab"); board(); }; });
    w.querySelector("#sp-pickbtn").onclick = picker;
    w.querySelector("#sp-rf").onclick = function () { refresh(true); };
    render(); refresh(true);
  }
  function render() {
    if (!box || !document.body.contains(box)) return;
    var m = collect(), f = follows(), h = "", ex = extraTabs().filter(function (t) { return t.id === tab; })[0];
    if (ex) { try { ex.render(box, { esc: esc, toast: toast, close: close, open: open, rerender: render, fmtTime: fmtTime, day: day }); } catch (e) { box.innerHTML = '<div class="sp-empty"><b>Unavailable right now</b></div>'; } return; }
    if (tab === "all" && ALL) h = allHTML();
    else if (tab === "fights" && hasFights()) h = fightNightHTML() + (LORDER.indexOf("ufc") >= 0 ? '<div class="sp-sec">UFC</div>' + (lastOk || SBerr.ufc ? ufcHTML() : '<div class="sp-empty"><b>Loading…</b></div>') : "");
    else {
      h += watchPartyHTML(m);
      if (f.length) h += '<div class="sp-sec">★ My teams</div>' + f.map(function (k) { return myCardHTML(k, m.all); }).join("");
      if (allErr() && !m.all.length) h += '<div class="sp-empty"><b>Scores unavailable</b>We couldn\'t reach the scores right now. We\'ll try again in a moment.</div>';
      else if (!lastOk && !m.all.length) h += '<div class="sp-empty"><b>Loading scores…</b></div>';
      else {
        if (m.live.length) h += '<div class="sp-sec"><i class="sp-dot"></i>Live now</div>' + m.live.map(gameHTML).join("");
        if (m.up.length) h += '<div class="sp-sec">Later today</div>' + m.up.map(gameHTML).join("");
        if (m.fin.length) h += '<div class="sp-sec">Final</div>' + m.fin.map(gameHTML).join("");
        if (!m.all.length) { var nxt = nextScheduled(); h += '<div class="sp-empty"><b>No ' + esc(RNAME) + ' games right now</b>' + (nxt ? "Next up: " + esc(nxt) : "Check back on game day.") + '</div>'; }
      }
      var pk = picks(), tot = 0, hit = 0;
      m.fin.forEach(function (r) { var p = pk[r.e.id], w = comp(r.e).competitors.filter(function (x) { return x.winner === true; })[0]; if (p && w) { tot++; if (String(w.team.id) === String(p.team)) hit++; } });
      if (tot) h += '<p class="sp-cred">Your picks today: ' + hit + ' of ' + tot + ' right</p>';
      if (pickPoints()) h += '<p class="sp-cred">' + (pointsOn() ? "Pick before the start: a right pick earns +" + (PERKS.picks.perPick || 1) + " " + esc(CFG.points.unit || "points") + ", up to " + (PERKS.picks.dailyCap || 5) + " a day. Just for fun, no money involved." : esc(CFG.points.offNote || "Pick points switch on soon. Picks are just for fun.")) + '</p>';
    }
    h += '<p class="sp-cred">Scores via ESPN · updates every 30 s' + (lastOk ? ' · ' + new Date(lastOk).toLocaleTimeString("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" }) + ' ' + TZS : '') + '</p>';
    var y = box.closest(".sp-body"), sc = y ? y.scrollTop : 0;
    box.innerHTML = h; if (y) y.scrollTop = sc;
    [].forEach.call(box.querySelectorAll("[data-pk]"), function (b) {
      b.onclick = function () { setPick(b.getAttribute("data-pk"), b.getAttribute("data-tm")); };
    });
    [].forEach.call(box.querySelectorAll("[data-wt]"), function (b) { b.onclick = function () { watch(b.getAttribute("data-wt")); }; });
    [].forEach.call(box.querySelectorAll("[data-alg]"), function (b) { b.onclick = function () { allLg = b.getAttribute("data-alg"); render(); }; });
    [].forEach.call(box.querySelectorAll("[data-rsvp]"), function (a) {
      a.onclick = function (e) { var rs = PERKS.rsvp; if (rs && typeof rs.action === "function") { e.preventDefault(); close(); try { rs.action(FN.d[+a.getAttribute("data-rsvp")]); } catch (x) {} } else close(); };
    });
  }
  // one pick per game, only before it starts (same store + points as the scoreboard sheet); returns false when locked
  function setPick(id, tm) {
    id = String(id); tm = String(tm);
    var p = picks(), ev = collect().all.filter(function (r) { return String(r.e.id) === id; })[0];
    if (!ev || state(ev.e) !== "pre" || new Date(ev.e.date) <= Date.now()) { toast("Picks lock when the game starts."); return false; }
    if (p[id] && String(p[id].team) === tm) delete p[id]; else p[id] = { team: tm, ts: Date.now() };
    var ks = Object.keys(p); if (ks.length > 200) delete p[ks[0]]; lsSet(K("picks"), p); render(); notify(); return true;
  }
  // page widgets (e.g. Melody's sports carousel) listen for this after every data refresh; read data via SportsBar.api
  function notify() { try { document.dispatchEvent(new CustomEvent("sportsbar:update")); } catch (e) {} }
  function refresh(full) {
    if (busy) { again = Math.max(again, full ? 2 : 1); return Promise.resolve(); } busy = true;
    var after = function () { busy = false; if (again) { var a = again; again = 0; refresh(a === 2); } };
    return Promise.all([loadScoreboards(), full ? loadFightNight() : null]).then(function () {
      var m = collect(); settlePicks(m.fin); render(); drawTicker(); notify(); after();
      if (!full) return;
      var keys = {}, lgs = {};
      m.all.forEach(function (r) { r.keys.forEach(function (k) { keys[k] = 1; lgs[r.lg] = 1; }); });
      follows().forEach(function (k) { keys[k] = 1; lgs[TK[k][0]] = 1; });
      if (!m.all.length) TEAMS.forEach(function (t) { keys[t[0] + ":" + t[1]] = 1; });   // to find the next scheduled game
      return Promise.all(Object.keys(keys).map(loadSched).concat(Object.keys(lgs).map(loadStand))).then(function () { render(); notify(); });
    }, function () { after(); render(); notify(); });
  }
  function picker() {
    box = null;
    var f = follows();
    var groups = TEAMLG.map(function (lg) {
      var ts = TEAMS.filter(function (t) { return t[0] === lg; }); if (!ts.length) return "";
      return '<div class="sp-lbl">' + esc(L[lg].name) + '</div><div class="sp-pick">' + ts.map(function (t) { var k = lg + ":" + t[1]; return '<button type="button" data-k="' + k + '" aria-pressed="' + (f.indexOf(k) >= 0) + '"><img src="' + esc(logoFor(t)) + '" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'">' + esc(t[3]) + '</button>'; }).join("") + '</div>';
    }).join("");
    var w = screen("My teams", '<div class="sp-h"><small>Pick as many as you like</small>Follow your teams</div><p class="sp-p">Followed teams are pinned to the top of the scoreboard with their record, playoff picture, next game and last 5 results. Saved on this phone.</p>' + groups +
      '<button type="button" class="sp-btn" id="sp-done" style="position:sticky;bottom:10px">✓ Done</button>');
    [].forEach.call(w.querySelectorAll("[data-k]"), function (b) {
      b.onclick = function () { var k = b.getAttribute("data-k"), cur = follows(), i = cur.indexOf(k); if (i >= 0) cur.splice(i, 1); else cur.push(k); lsSet(K("follow"), cur); b.setAttribute("aria-pressed", i < 0 ? "true" : "false"); };
    });
    w.querySelector("#sp-done").onclick = board;
  }

  /* ---------- ticker ---------- */
  var tick = CFG.ticker ? document.querySelector(CFG.ticker) : null, tIdx = 0, tItems = [];
  function drawTicker() {
    if (!tick) return;
    var m = collect(), list = m.live.concat(m.up), f = follows();
    tItems = list.map(function (r) {
      var cs = comp(r.e).competitors, a = cs.filter(function (x) { return x.homeAway === "away"; })[0] || cs[1], h = cs.filter(function (x) { return x.homeAway === "home"; })[0] || cs[0];
      var loc = cs.filter(function (x) { return TK[r.lg + ":" + x.team.id]; })[0] || h;
      return { live: r.s === "in", fol: r.keys.some(function (k) { return f.indexOf(k) >= 0; }), logo: loc.team.logo || "", txt: r.s === "in" ? nm(a) + " " + score(a) + " – " + score(h) + " " + nm(h) + " · " + statusText(r.e) : nm(a) + " at " + nm(h) + " · " + fmtTime(r.e.date) };
    });
    (SB.ufc || []).forEach(function (e) { if (state(e) === "in") tItems.unshift({ live: true, logo: "", txt: "UFC · " + e.name }); });
    if (!tItems.length) { tick.classList.remove("on"); return; }
    paintTick();
  }
  function paintTick() {
    if (!tItems.length) return;
    var it = tItems[tIdx % tItems.length];
    tick.innerHTML = (it.live ? '<i class="sp-dot"></i>' : '<span>📺</span>') + (it.logo ? '<img src="' + esc(it.logo) + '" alt="">' : '') + '<span class="tx">' + (it.live ? "<b>LIVE</b> · " : "Today · ") + esc(it.txt) + (it.fol ? " ★" : "") + '</span><span class="go">Scores ›</span>';
    tick.classList.add("on");
  }
  if (tick) {
    tick.classList.add("sp-ticker"); tick.setAttribute("role", "button"); tick.tabIndex = 0; tick.setAttribute("aria-label", "Open the scoreboard");
    tick.onclick = function () { open("teams"); };
    tick.onkeydown = function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open("teams"); } };
    setInterval(function () { if (tItems.length > 1 && !document.hidden) { tIdx++; paintTick(); } }, 4500);
  }
  var lastTick = 0;
  function tickerPoll() { if (document.hidden || isOpen()) return; if (Date.now() - lastTick < 55000) return; lastTick = Date.now(); refresh(false); }
  setTimeout(tickerPoll, 1500); setInterval(tickerPoll, 5000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) { if (isOpen()) refresh(false); else tickerPoll(); } });

  /* ---------- Games Pack tile (when the client page has one) ---------- */
  if (CFG.gamesPackTile !== false && window.MelodyGames) {
    window.MelodyGames.register({ id: "scores", order: 10, wide: true, icon: "📺", title: CFG.title || "Scoreboard", sub: CFG.tileSub || "Live scores for every " + RNAME + " team. Follow your teams" + (hasFights() ? ", plus fight nights." : "."), tag: "Live",
      start: function () { window.MelodyGames.close(); open("teams"); } });
  }
  function addTab(def) { if (def && def.id && def.render && !EXTRA.some(function (t) { return t.id === def.id; })) { EXTRA.push(def); if (isOpen()) board(); } }
  window.SportsBar = { watch: function (id) { open(tab); watch(id); }, open: open, close: close, refresh: refresh, config: CFG, teams: TEAMS, leagues: L, render: render, addTab: addTab, isOpen: isOpen, toast: toast, esc: esc, picker: function () { open("teams"); picker(); },
    api: { collectAll: collectAll, nets: nets, netLinks: netLinks, WATCH: WATCH, watchAt: function () { return Array.isArray(CFG.watchAt) ? CFG.watchAt : []; }, collect: collect, allErr: allErr, follows: follows, teamInfo: teamInfo, nextEv: nextEv, comp: comp, state: state, statusText: statusText, score: score, nm: nm, fmtTime: fmtTime, headline: headline, tv: tv, logoFor: logoFor, TK: TK, esc: esc, L: L, BASE: BASE, getJSON: getJSON, loadSched: loadSched, loadStand: loadStand, SCHED: SCHED,
      pickHTML: pickHTML, setPick: setPick, picks: picks, toast: toast },
    _state: { SB: SB, SBerr: SBerr, SCHED: SCHED, STAND: STAND, LEAGUE: LEAGUE } };
})();
