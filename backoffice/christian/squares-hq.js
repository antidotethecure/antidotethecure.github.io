/* Christian HQ · 🏈 Squares tab (Football Squares owner controls, 2026-10). Christian HQ passes its api() + bo token in html({api, token, draw}) and the
   backend squares_admin endpoint in Code.gs (list · create · prizes · rollover · lock · randomize · redeem · void · ticket).
   ENTRY: every Rewards member gets 1 FREE square per board (no purchase necessary, California Penal Code 319). Each purchase
   can add one more: staff scan / type the guest's Rewards card ID here and tap "+1 Squares ticket" (1 ticket = 1 square),
   up to the per-person cap ("Squares each") set on the board.
   ?test=1: answered by demo/sports/squares-mock.js through mock.js (made-up data, this browser only).
   Destructive actions (lock + reveal, delete, mark redeemed) need two taps within 5 seconds.
   LEGAL: promotional contest with a free way in. No entry fee, no cash, no money prizes. Prize types are food, merch, % off the
   check, a free NON-alcoholic drink, or % off a drink (21+). Never free alcohol (California ABC). */
(function () {
  "use strict";
  var X = null;   // {api, token, draw} handed in by Christian HQ on every draw
  var BOARDS = null, GAMES = null, MSG = "", TMSG = "", TOK = false, ARM = {}, BUSY = false, SLUG = "melody-bar-grill";
  var Q = ["q1", "q2", "q3", "final"], QN = { q1: "Q1", q2: "Halftime", q3: "Q3", final: "Final" };
  var KINDS = [["", "No prize"], ["food", "🍔 Food item"], ["percent", "🏷️ % off the check"], ["drink", "🥤 Free non-alcoholic drink"], ["drinkdeal", "🍹 % off a drink (21+)"], ["merch", "🧢 Merch"]];
  // NFL + college teams Melody runs boards for (ESPN team IDs)
  var TEAMS = [["nfl", "football/nfl", "14"], ["nfl", "football/nfl", "24"], ["nfl", "football/nfl", "25"],
    ["cfb", "football/college-football", "30"], ["cfb", "football/college-football", "26"], ["cfb", "football/college-football", "25"], ["cfb", "football/college-football", "24"]];
  function E(t) { return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function when(t) { return new Date(t).toLocaleString("en-US", { timeZone: "America/Los_Angeles", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) + " PT"; }
  function redraw() { if (X && X.draw) X.draw(); }
  function call(o) { return X ? X.api(Object.assign({ type: "squares_admin", token: X.token, slug: SLUG }, o)) : Promise.resolve({ ok: false, reason: "Not ready." }); }
  function refresh() { return call({ op: "list" }).then(function (r) { if (r && r.ok) BOARDS = r.boards; else { BOARDS = BOARDS || []; MSG = (r && r.reason) || "Couldn't load boards."; } redraw(); }); }
  function loadGames() {
    var seen = {}, out = [], now = Date.now();
    return Promise.all(TEAMS.map(function (t) {
      return fetch("https://site.api.espn.com/apis/site/v2/sports/" + t[1] + "/teams/" + t[2] + "/schedule").then(function (r) { return r.json(); }).then(function (j) {
        (j.events || []).forEach(function (e) {
          var c = e.competitions && e.competitions[0]; if (!c || seen[e.id]) return;
          var st = c.status && c.status.type && c.status.type.state, ko = new Date(e.date).getTime();
          if (st !== "pre" || ko < now || ko > now + 21 * 864e5) return;
          var h = c.competitors.filter(function (x) { return x.homeAway === "home"; })[0], a = c.competitors.filter(function (x) { return x.homeAway === "away"; })[0];
          if (!h || !a) return; seen[e.id] = 1;
          out.push({ league: t[0], event: e.id, kickoff: ko, home: h.team.abbreviation, away: a.team.abbreviation, title: (a.team.shortDisplayName || a.team.displayName) + " at " + (h.team.shortDisplayName || h.team.displayName) });
        });
      }).catch(function () {});
    })).then(function () { GAMES = out.sort(function (a, b) { return a.kickoff - b.kickoff; }); redraw(); });
  }
  function prizeFields(id, cur) {
    return '<div class="sqp">' + Q.map(function (q) {
      var p = (cur || {})[q] || {}, k = p.kind || "";
      return '<div class="dc" style="padding:8px"><label>' + QN[q] + ' prize</label><select data-pk="' + id + ':' + q + '">' + KINDS.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === k ? " selected" : "") + '>' + x[1] + '</option>'; }).join("") + '</select>' +
        '<input data-pt="' + id + ':' + q + '" maxlength="60" placeholder="e.g. Melody Fries" value="' + E(p.kind === "percent" || p.kind === "drinkdeal" ? (p.text || "").replace(/^\d+% off\s*/, "") : p.text || "") + '">' +
        '<input data-pp="' + id + ':' + q + '" type="number" min="5" max="50" placeholder="% (5–50)" value="' + E(p.percent || "") + '"></div>';
    }).join("") + '</div>';
  }
  function readPrizes(root, id) {
    var o = {}; Q.forEach(function (q) { var k = root.querySelector('[data-pk="' + id + ':' + q + '"]').value; if (!k) return;
      o[q] = { kind: k, text: root.querySelector('[data-pt="' + id + ':' + q + '"]').value.trim(), percent: +root.querySelector('[data-pp="' + id + ':' + q + '"]').value || 0 }; });
    return o;
  }
  function armBtn(key, label, armed, cls) { return '<button class="btn sm ' + (cls || "alt") + '" data-arm="' + key + '">' + (ARM[key] > Date.now() ? "⚠️ Tap again to confirm" : label) + '</button>'; }
  function boardHTML(b) {
    var tag = { open: "<span class='tag ok'>Open</span>", locked: "<span class='tag p'>Locked</span>", live: "<span class='tag f'>LIVE</span>", final: "<span class='tag'>Final</span>" }[b.status] || "";
    var ent = (b.entrantsList || []).slice().sort(function (x, y) { return y.squares.length - x.squares.length; });
    var win = Q.filter(function (q) { return b.results[q]; }).map(function (q) {
      var r = b.results[q], pz = (r.prizes || []).map(function (k) { return b.prizes[k] ? b.prizes[k].text : ""; }).filter(Boolean).join(" + ");
      var who = r.status === "won" ? "🏆 <b>" + E(r.name) + "</b>" + (pz ? " · " + E(pz) : "") : r.status === "rolled" ? "Nobody on the box: prize rolled to the next quarter" : "Nobody on the box: unclaimed";
      var act = r.status === "won" && (r.prizes || []).length ? (b.redeemed[q] ? "<span class='tag ok'>✓ Redeemed by " + E(b.redeemed[q].by) + "</span>" : armBtn("redeem:" + b.id + ":" + q, "Mark redeemed")) : "";
      return "<tr><td><b>" + QN[q] + "</b></td><td>" + E(b.away) + " " + r.away + " – " + r.home + " " + E(b.home) + "<br><span class='note'>box " + (r.home % 10) + "-" + (r.away % 10) + "</span></td><td style='white-space:normal'>" + who + "</td><td>" + act + "</td></tr>";
    }).join("");
    return '<div class="dc" style="margin-top:10px"><div class="row" style="justify-content:space-between"><b>' + E(b.game) + '</b>' + tag + '</div>' +
      '<div class="note">' + (b.league === "cfb" ? "College" : "NFL") + ' · kickoff ' + when(b.kickoff) + ' · ' + b.entrants + ' of ' + b.max + ' players × ' + b.per + ' squares · ' + Object.keys(b.claims).length + '/100 squares taken · created by ' + E(b.by || "") + '</div>' +
      (b.rows ? '<div class="note" style="margin-top:4px">Numbers: rows (' + E(b.home) + ') <code>' + b.rows.join(" ") + '</code> · columns (' + E(b.away) + ') <code>' + b.cols.join(" ") + '</code></div>' : '<div class="note" style="margin-top:4px">Numbers are drawn and shown at kickoff (or when you lock the board).</div>') +
      (win ? '<h3>Winners</h3><div class="tw"><table><tbody>' + win + '</tbody></table></div>' : '') +
      (b.status !== "final" ? '<h3>Prizes</h3>' + prizeFields(b.id, b.prizes) + '<div class="row" style="margin-top:6px"><button class="btn sm" data-prz="' + b.id + '">💾 Save prizes</button>' +
        '<label class="note"><input type="checkbox" data-roll="' + b.id + '"' + (b.rollover ? " checked" : "") + '> Unclaimed prize rolls to the next quarter</label></div>' : '') +
      '<h3>Entrants (' + ent.length + ')</h3>' + (ent.length ? '<div class="tw"><table><thead><tr><th>Name</th><th class="n">Squares</th><th class="n">Purchase tickets</th><th>Member</th></tr></thead><tbody>' +
        ent.map(function (x) { return "<tr><td>" + E(x.name) + "</td><td class='n'>" + x.squares.length + " of " + (x.allowed || 1) + "</td><td class='n'>" + (x.tickets || 0) + "</td><td><code>" + E(x.member) + "</code></td></tr>"; }).join("") + '</tbody></table></div>' : '<p class="note">No one yet.</p>') +
      ((b.ticketsOut || []).filter(function (t) { return !ent.some(function (x) { return x.member === t.member; }); }).length ? '<p class="note">Tickets not used yet: ' + b.ticketsOut.filter(function (t) { return !ent.some(function (x) { return x.member === t.member; }); }).map(function (t) { return E(t.name) + " (" + t.n + ")"; }).join(", ") + '</p>' : '') +
      '<div class="row" style="margin-top:10px">' + (b.status === "open" ? armBtn("lock:" + b.id, "🔒 Lock now + reveal numbers") + ' <button class="btn sm alt" data-rnd="' + b.id + '">🎲 Draw numbers now (hidden)</button>' : '') +
      armBtn("void:" + b.id, "🗑️ Delete board", false, "alt") + '</div></div>';
  }
  function html(ctx) {
    if (ctx) X = ctx;
    if (BOARDS === null && !BUSY) { BUSY = true; refresh().then(function () { BUSY = false; }); }
    if (GAMES === null) { GAMES = []; loadGames(); }
    var g = GAMES || [];
    return '<div class="card"><h2 style="margin-top:0">🏈 Football Squares</h2>' +
      '<div class="test" style="background:#2fbf7122;border-color:#2fbf7166;color:#c9f5dc">⚖️ <b>No purchase necessary.</b> Every Rewards member gets <b>1 free square per game</b> (California law: a purchase-only entry would be an illegal lottery, so the free square must always be offered). Each purchase can add 1 more square, up to the per-person cap. No entry fee, no cash or money prizes in or out. Prizes: food, merch, % off, a free non-alcoholic drink, or % off a drink (21+). Never free alcohol (California ABC).</div>' +
      '<h3>🎟️ +1 Squares ticket (after a purchase)</h3><div class="dc"><p class="note" style="margin-top:0">Scan the guest\'s Rewards card QR, or type the card ID on it (like MLD-4K7Q2). 1 ticket = 1 more square on the next open board. Their free square never needs a ticket.</p>' +
      '<div class="row"><div style="flex:2"><label>Card ID</label><input id="sqCard" autocapitalize="characters" placeholder="MLD-4K7Q2" maxlength="40"></div><div style="flex:1"><label>Receipt # (optional)</label><input id="sqRcpt" maxlength="24" placeholder="1042"></div></div>' +
      '<button class="btn" id="sqTix" style="margin-top:8px">🎟️ +1 Squares ticket</button><div class="err" id="sqTMsg" style="margin-top:6px' + (TOK ? ";color:#8ff0bd" : "") + '">' + E(TMSG) + '</div></div>' +
      '<p class="note">How it works: 10×10 board, up to 20 players × 5 squares each (1 free + up to 4 with purchase). Entries lock at kickoff and the row/column numbers are drawn then. At the end of Q1, halftime, Q3 and the final, the last digit of each team\'s score picks the winning square. Scores come from ESPN automatically.</p>' +
      '<h3>New board</h3><div class="dc"><label>Game (next 3 weeks: Rams, Chargers, 49ers, USC, UCLA, Cal, Stanford)</label><select id="sqGame" style="width:100%;padding:9px;border-radius:10px;border:1px solid var(--edge);background:#081022;color:var(--ink)">' +
      (g.length ? g.map(function (x, i) { return '<option value="' + i + '">' + E(x.title + " · " + when(x.kickoff)) + '</option>'; }).join("") : '<option value="">Loading games…</option>') + '</select>' +
      '<div class="row" style="margin-top:8px"><div style="flex:1"><label>Players (max)</label><input id="sqMax" type="number" min="2" max="100" value="20"></div><div style="flex:1"><label>Max squares per person (1 free + purchases)</label><input id="sqPer" type="number" min="1" max="50" value="5"></div></div>' +
      prizeFields("new", { q1: { kind: "food", text: "Melody Fries" }, q2: { kind: "percent", percent: 10 }, final: { kind: "food", text: "Free Mac & Cheese entrée" } }) +
      '<label class="note" style="display:block;margin-top:6px"><input type="checkbox" id="sqRoll" checked> Unclaimed winning square: prize rolls to the next quarter</label>' +
      '<button class="btn" id="sqCreate" style="margin-top:8px">➕ Create board</button></div>' +
      '<div class="err" id="sqMsg">' + E(MSG) + '</div>' +
      '<h3>Boards</h3>' + (BOARDS === null ? '<p class="note">Loading…</p>' : BOARDS.length ? BOARDS.map(boardHTML).join("") : '<p class="note">No boards yet.</p>') + '</div>' +
      '<style>.sqp{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:6px;margin-top:8px}.sqp select,.sqp input,#sqMax,#sqPer{width:100%;padding:8px;border-radius:10px;border:1px solid var(--edge);background:#081022;color:var(--ink);font-size:15px;margin-top:4px}</style>';
  }
  function done(r, ok) { MSG = r && r.ok ? (ok || "") : (r && r.reason) || "Didn't work. Try again."; if (r && r.ok) return refresh(); redraw(); }
  function bind(p) {
    var tb = p.querySelector("#sqTix");
    if (tb) tb.onclick = function () {
      var card = p.querySelector("#sqCard").value.trim(), rc = p.querySelector("#sqRcpt").value.trim();
      if (!card) { TOK = false; TMSG = "Scan or type the guest's Rewards card ID."; redraw(); return; }
      tb.disabled = true; tb.textContent = "Adding…";
      call({ op: "ticket", card: card, rcpt: rc }).then(function (r) {
        TOK = !!(r && r.ok); TMSG = TOK ? "✅ +1 ticket for " + r.member.name + ": " + r.member.tickets + " purchase ticket" + (r.member.tickets === 1 ? "" : "s") + ", up to " + r.member.allowed + " squares on " + r.board.game + ". They pick it in the app (🏈 Squares)." : (r && r.reason) || "Didn't work. Try again.";
        if (TOK) refresh(); else redraw();
      });
    };
    var c = p.querySelector("#sqCreate");
    if (c) c.onclick = function () {
      var gi = p.querySelector("#sqGame").value, gm = (GAMES || [])[+gi]; if (!gm) { MSG = "Pick a game."; redraw(); return; }
      c.disabled = true; c.textContent = "Creating…";
      call({ op: "create", game: gm, max: +p.querySelector("#sqMax").value, per: +p.querySelector("#sqPer").value, prizes: readPrizes(p, "new"), rollover: p.querySelector("#sqRoll").checked })
        .then(function (r) { done(r, "✅ Board created. Guests see it in the app's scoreboard (🏈 Squares)."); });
    };
    p.querySelectorAll("[data-prz]").forEach(function (b) { b.onclick = function () { var id = b.dataset.prz; call({ op: "prizes", board: id, prizes: readPrizes(p, id) }).then(function (r) { done(r, "✅ Prizes saved."); }); }; });
    p.querySelectorAll("[data-roll]").forEach(function (b) { b.onchange = function () { call({ op: "rollover", board: b.dataset.roll, on: b.checked }).then(function (r) { done(r, "✅ Rollover " + (b.checked ? "on" : "off") + "."); }); }; });
    p.querySelectorAll("[data-rnd]").forEach(function (b) { b.onclick = function () { call({ op: "randomize", board: b.dataset.rnd }).then(function (r) { done(r, "✅ Numbers drawn. Guests see them at kickoff."); }); }; });
    p.querySelectorAll("[data-arm]").forEach(function (b) {
      b.onclick = function () {
        var key = b.dataset.arm;
        if (!(ARM[key] > Date.now())) { ARM[key] = Date.now() + 5000; redraw(); setTimeout(function () { if (ARM[key] && ARM[key] <= Date.now()) { delete ARM[key]; redraw(); } }, 5100); return; }
        delete ARM[key]; var k = key.split(":");
        b.disabled = true;
        call(k[0] === "redeem" ? { op: "redeem", board: k[1], q: k[2] } : { op: k[0], board: k[1] })
          .then(function (r) { done(r, { lock: "🔒 Locked. Numbers are revealed.", void: "🗑️ Board deleted.", redeem: "✓ Marked redeemed." }[k[0]]); });
      };
    });
  }
  window.SquaresHQ = { html: html, bind: bind, refresh: refresh };
})();
