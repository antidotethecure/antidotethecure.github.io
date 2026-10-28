/* SousShift AI — VENUE VERSUS: live head-to-head games for people at the same bar (2026-10-15, Melody Bar & Grill LAX = pilot).
   One shared file for every client app. Include once, after the game script and crm.js:
     <script>window.VERSUS={slug:"melody", name:"Melody Bar & Grill", api:"https://drizzle-bowl-scores.higgsfield.app",
       mount:"#versushost", ticker:".cvwrap", games:["battle","picks","duel","race"], venue:{lat:33.95418,lng:-118.39602,radiusM:150},
       theme:{bg,panel,edge,accent,accent2,ink,dim,display,body,wine},
       play:{battle:fn(o), score:fn(), pos:fn(), take:fn(id), stop:fn(), focus:fn()},   // adapter to the venue's own game
       member:fn() → {id,name,adult}|null, join:fn(cb), kid:fn() → bool, raceUrl:"../versus/race.html", tvUrl:"../versus/tv.html"};</script>
     <script src="../versus.js?v=vv1"></script>
   What a guest gets: a "⚔️ Venue Versus" card on the page and a full-screen lobby (#vv-ov) with
     · who's here (count), the next scheduled battle + live countdown, Join / Leave (join window = last 10 min), "Ready for a quick
       battle" (2+ ready → a 2-minute pickup battle starts 12 s later), the live leaderboard ticker on the game while it runs, results;
     · "Who wins?" picks for tonight's local games, held on the server, with the venue leaderboard;
     · Sky Duel (2 players, same seed, the rival's ghost plane, shared power-ups) and the Menu Dash race (2–4 players, race.html).
   THE SERVER OWNS EVERYTHING: clock, seed, start, end and results (Cloudflare Durable Object "Rooms" behind /api/versus/*). This file
   only shows it and reports this phone's score. WebSocket first; if it can't connect it falls back to polling every 2.5 s.
   PRESENCE (any one): the QR on the bar TV / a printed table QR (?vv=<signed code> in the URL), the 4-digit code on the bar TV, or
   this phone's location within ~150 m when you join. Not proven = PRACTICE: you play and rank, marked 🧪, no prizes.
   RULES (house + legal): free to enter, no buy-in, no wagers between players, no cash or cash equivalents. Prizes are bragging
   rights, or an owner-set menu perk; members only to claim, alcohol perks 21+ only (staff check ID), one Versus prize per day.
   Kids (VERSUS.kid() true): matched only with kids, a generated nickname (they never type a name), no prizes. Chat = preset emoji only.
   Test hooks: ?vvapi=<base url> points at a local Worker (wrangler dev). */
(function () {
  "use strict";
  if (window.Versus) return;
  var C = window.VERSUS;
  if (!C || !C.slug) return;
  var W = window, D = document;
  var q0 = new URLSearchParams(location.search);
  var BASE = (q0.get("vvapi") || C.api || "https://drizzle-bowl-scores.higgsfield.app").replace(/\/+$/, "");
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$|^https:\/\/drizzle-bowl-scores\.higgsfield\.app$/.test(BASE)) BASE = "https://drizzle-bowl-scores.higgsfield.app";   // ?vvapi= = local testing only: never a stranger's server
  var API = BASE + "/api/versus", SLUG = C.slug, NAME = C.name || "the bar", GAMES = C.games || ["battle", "picks"];
  var TH = C.theme || {};
  var PLAY = C.play || {};
  // the bar TV / owner pages and holiday themes: keep seasonal overlays off while the lobby is open
  W.SSAI_SEASONS_BLOCK = (W.SSAI_SEASONS_BLOCK ? W.SSAI_SEASONS_BLOCK + ", " : "") + "#vv-ov.on, #vv-cd.on";

  /* ---------------- helpers ---------------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function lsSet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function el(html) { var d = D.createElement("div"); d.innerHTML = html.trim(); return d.firstChild; }
  function $(s, r) { return (r || D).querySelector(s); }
  function buzz(p) { if (navigator.vibrate) try { navigator.vibrate(p); } catch (e) {} }
  function fmt(n) { return Number(n || 0).toLocaleString(); }
  function mmss(ms) { var s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }
  function until(ms) {
    if (ms <= 0) return "now";
    var s = Math.ceil(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    if (h >= 1) return h + "h " + m + "m";
    if (m >= 1) return m + "m " + String(s % 60).padStart(2, "0") + "s";
    return s + "s";
  }
  function clock(t) { try { return new Date(t).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); } catch (e) { return ""; } }
  function rid() { var a = new Uint8Array(8); (W.crypto || W.msCrypto).getRandomValues(a); return Array.prototype.map.call(a, function (b) { return "abcdefghjkmnpqrstuvwxyz23456789"[b % 31]; }).join(""); }

  /* ---------------- identity ---------------- */
  function devId() {
    try { if (W.SSAI_CRM && W.SSAI_CRM.dev) { var d = W.SSAI_CRM.dev(); if (/^[A-Za-z0-9_-]{4,40}$/.test(d)) return d; } } catch (e) {}
    var v = lsGet("vv-dev", ""); if (!v) { v = "V" + rid(); lsSet("vv-dev", v); } return v;
  }
  var DEV = devId();
  function isKid() {
    try { if (q0.get("kid") === "1") return true; var k = C.kid || W.SSAI_KID_MODE; return typeof k === "function" ? !!k() : !!k; } catch (e) { return false; }
  }
  function member() { try { return C.member ? C.member() : null; } catch (e) { return null; } }
  function nick() {
    var n = lsGet("vv-nick", "");
    if (!n) { var m = member(); if (m && m.name) n = String(m.name).split(" ")[0]; }
    return String(n || "").replace(/[^\w .'-]/g, "").slice(0, 16);
  }
  var PK = "vv-pass:" + SLUG;
  function pass() { var p = lsGet(PK, null); if (!p || !p.pass || p.exp < Date.now() + 60000 || p.dev !== DEV) return null; return p; }

  /* ---------------- styles ---------------- */
  var V = function (k, d) { return TH[k] || d; };
  var css = D.createElement("style");
  css.textContent =
    ":root{--vv-bg:" + V("bg", "#0b1220") + ";--vv-panel:" + V("panel", "#141e34") + ";--vv-edge:" + V("edge", "#27324d") + ";--vv-acc:" + V("accent", "#d4af37") +
    ";--vv-acc2:" + V("accent2", "#f0d375") + ";--vv-ink:" + V("ink", "#f6f1e4") + ";--vv-dim:" + V("dim", "#9aa3b5") + ";--vv-wine:" + V("wine", "#a33645") +
    ";--vv-go:" + V("go", "#3fbf8f") + ";--vv-disp:" + V("display", "Georgia,serif") + ";--vv-body:" + V("body", "system-ui,-apple-system,sans-serif") + "}" +
    ".vv-card{margin:14px 0;padding:16px;border-radius:18px;background:linear-gradient(135deg,var(--vv-panel),#0000),var(--vv-panel);border:1px solid var(--vv-edge);color:var(--vv-ink);font-family:var(--vv-body);position:relative;overflow:hidden}" +
    ".vv-card:before{content:'';position:absolute;inset:-40% -20% auto auto;width:240px;height:240px;background:radial-gradient(circle,color-mix(in srgb,var(--vv-wine) 45%,transparent),transparent 70%);pointer-events:none}" +
    ".vv-k{font:800 11px var(--vv-body);letter-spacing:.14em;text-transform:uppercase;color:var(--vv-acc2)}" +
    ".vv-card h3{margin:4px 0 6px;font:900 26px/1.1 var(--vv-disp)}.vv-card p{margin:0 0 10px;color:var(--vv-dim);font-size:14px;line-height:1.45}" +
    ".vv-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}" +
    ".vv-chip{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:99px;background:#0006;border:1px solid var(--vv-edge);font:700 12px var(--vv-body);color:var(--vv-ink)}" +
    ".vv-dot{width:8px;height:8px;border-radius:50%;background:var(--vv-go);box-shadow:0 0 0 0 var(--vv-go);animation:vvp 1.6s infinite}.vv-dot.off{background:#777;animation:none}" +
    "@keyframes vvp{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--vv-go) 70%,transparent)}70%{box-shadow:0 0 0 8px transparent}100%{box-shadow:0 0 0 0 transparent}}" +
    ".vv-btn{appearance:none;border:0;border-radius:12px;padding:12px 16px;font:800 15px var(--vv-body);background:var(--vv-acc);color:#1a1405;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:44px;text-decoration:none}" +
    ".vv-btn.alt{background:#0000;color:var(--vv-ink);border:1px solid var(--vv-edge)}.vv-btn.wine{background:var(--vv-wine);color:#fff}.vv-btn.go{background:var(--vv-go);color:#04150d}" +
    ".vv-btn:disabled{opacity:.5;cursor:default}.vv-btn.wide{width:100%}" +
    ".vv-btn:focus-visible,.vv-tab:focus-visible,.vv-pk button:focus-visible{outline:3px solid var(--vv-acc2);outline-offset:2px}" +
    "#vv-ov{position:fixed;inset:0;z-index:2147480000;background:var(--vv-bg);color:var(--vv-ink);font-family:var(--vv-body);display:none;flex-direction:column;overscroll-behavior:contain}" +
    "#vv-ov.on{display:flex}" +
    ".vv-top{display:flex;align-items:center;gap:10px;padding:max(12px,env(safe-area-inset-top)) 16px 10px;border-bottom:1px solid var(--vv-edge)}" +
    ".vv-top h2{margin:0;font:900 20px var(--vv-disp);flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
    ".vv-x{appearance:none;border:1px solid var(--vv-edge);background:#0000;color:var(--vv-ink);border-radius:12px;width:44px;height:44px;font-size:20px;cursor:pointer}" +
    ".vv-tabs{display:flex;gap:6px;padding:10px 16px 0;overflow-x:auto;scrollbar-width:none}.vv-tabs::-webkit-scrollbar{display:none}" +
    ".vv-tab{appearance:none;border:1px solid var(--vv-edge);background:#0000;color:var(--vv-dim);border-radius:99px;padding:9px 14px;font:800 13px var(--vv-body);white-space:nowrap;cursor:pointer;min-height:40px}" +
    ".vv-tab[aria-selected=true]{background:var(--vv-acc);color:#1a1405;border-color:var(--vv-acc)}" +
    ".vv-body{flex:1;overflow-y:auto;padding:12px 16px calc(24px + env(safe-area-inset-bottom));-webkit-overflow-scrolling:touch}" +
    ".vv-box{background:var(--vv-panel);border:1px solid var(--vv-edge);border-radius:16px;padding:14px;margin:0 0 12px}" +
    ".vv-box h4{margin:0 0 4px;font:900 18px var(--vv-disp)}.vv-box .s{color:var(--vv-dim);font-size:13px;line-height:1.45;margin:0 0 10px}" +
    ".vv-cdn{font:900 40px/1 var(--vv-body);font-variant-numeric:tabular-nums;color:var(--vv-acc2);margin:6px 0}" +
    ".vv-prac{background:#f0d37514;border:1px dashed var(--vv-acc);border-radius:14px;padding:12px;margin:0 0 12px;font-size:13px;line-height:1.45}" +
    ".vv-prac b{color:var(--vv-acc2)}.vv-ok{background:#3fbf8f1a;border:1px solid #3fbf8f66;border-radius:14px;padding:10px 12px;margin:0 0 12px;font-size:13px}" +
    ".vv-codein{display:flex;gap:8px;margin-top:8px}.vv-codein input{flex:1;min-width:0;font:900 22px var(--vv-body);letter-spacing:.3em;text-align:center;padding:9px;border-radius:12px;border:1px solid var(--vv-edge);background:var(--vv-bg);color:var(--vv-ink)}" +
    ".vv-nick{display:flex;gap:8px;align-items:center;margin:0 0 12px}.vv-nick input{flex:1;min-width:0;padding:11px;border-radius:12px;border:1px solid var(--vv-edge);background:var(--vv-bg);color:var(--vv-ink);font:700 15px var(--vv-body)}" +
    ".vv-board{list-style:none;margin:8px 0 0;padding:0}.vv-board li{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;font-weight:700}" +
    ".vv-board li:nth-child(odd){background:#ffffff08}.vv-board li.me{background:color-mix(in srgb,var(--vv-acc) 22%,transparent);outline:1px solid var(--vv-acc)}" +
    ".vv-board .r{width:26px;text-align:center;color:var(--vv-dim);font-variant-numeric:tabular-nums}.vv-board .n{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
    ".vv-board .v{font-variant-numeric:tabular-nums;color:var(--vv-acc2)}" +
    ".vv-react{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.vv-react button{appearance:none;border:1px solid var(--vv-edge);background:#0000;border-radius:12px;font-size:22px;width:46px;height:46px;cursor:pointer}" +
    ".vv-float{position:fixed;z-index:2147480600;font-size:34px;pointer-events:none;animation:vvf 2.4s ease-out forwards}" +
    "@keyframes vvf{0%{transform:translateY(0) scale(.6);opacity:0}15%{opacity:1;transform:translateY(-20px) scale(1.1)}100%{transform:translateY(-220px) scale(1);opacity:0}}" +
    ".vv-float small{display:block;font:800 11px var(--vv-body);color:#fff;text-shadow:0 1px 3px #000;text-align:center}" +
    ".vv-tick{position:absolute;left:8px;top:44px;z-index:6;max-width:62%;background:rgba(6,10,22,.78);border:1px solid var(--vv-edge);border-radius:12px;padding:6px 9px;font:800 12px/1.35 var(--vv-body);color:var(--vv-ink);pointer-events:none;backdrop-filter:blur(4px)}" +
    ".vv-tick .t{color:var(--vv-acc2);font-variant-numeric:tabular-nums}.vv-tick ol{margin:3px 0 0;padding:0;list-style:none}.vv-tick li{display:flex;gap:6px;justify-content:space-between;white-space:nowrap}" +
    ".vv-tick li.me{color:var(--vv-acc2)}.vv-tick li span:first-child{overflow:hidden;text-overflow:ellipsis;max-width:120px}" +
    "#vv-cd{position:fixed;inset:0;z-index:2147480500;display:none;align-items:center;justify-content:center;flex-direction:column;background:rgba(5,8,20,.55);color:#fff;font-family:var(--vv-body);text-align:center;pointer-events:none}" +
    "#vv-cd.on{display:flex}#vv-cd b{font:900 120px/1 var(--vv-body);color:var(--vv-acc2);text-shadow:0 6px 30px #000}#vv-cd span{font:800 18px var(--vv-body);margin-top:10px;text-shadow:0 2px 8px #000}" +
    ".vv-games{display:grid;gap:10px}.vv-g{display:flex;gap:12px;align-items:center}.vv-g .i{font-size:34px;width:48px;text-align:center}" +
    ".vv-pk{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}.vv-pk button{appearance:none;border:1px solid var(--vv-edge);background:var(--vv-bg);color:var(--vv-ink);border-radius:12px;padding:10px 8px;font:800 14px var(--vv-body);cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px;min-height:44px}" +
    ".vv-pk button[aria-pressed=true]{border-color:var(--vv-acc);background:color-mix(in srgb,var(--vv-acc) 20%,transparent)}.vv-pk button:disabled{cursor:default;opacity:.8}" +
    ".vv-pk img{width:34px;height:34px;object-fit:contain}.vv-pk .pc{font:700 11px var(--vv-body);color:var(--vv-dim)}.vv-pk .w{color:var(--vv-go)}" +
    ".vv-claim{text-align:center;border:2px dashed var(--vv-acc);border-radius:14px;padding:12px;margin-top:10px}.vv-claim .code{font:900 30px ui-monospace,monospace;letter-spacing:.08em;color:var(--vv-acc2);margin:6px 0}" +
    ".vv-fine{color:var(--vv-dim);font-size:12px;line-height:1.45;margin:8px 0 0}" +
    ".vv-msg{min-height:18px;font-size:13px;color:var(--vv-acc2);margin-top:8px}" +
    "@media (prefers-reduced-motion:reduce){.vv-dot{animation:none}.vv-float{animation-duration:.01s}}";
  D.head.appendChild(css);

  /* ---------------- clock + network ---------------- */
  var off = 0, offOk = false;   // server time = Date.now() + off
  function now() { return Date.now() + off; }
  var S = null, ws = null, wsOk = false, wsTries = 0, pollT = null, acks = {}, ackN = 0, wantLive = false, lastMsg = 0, pingT = null;
  var listeners = [];

  function wsUrl() {
    var p = pass(), u = API.replace(/^http/, "ws") + "/ws?slug=" + encodeURIComponent(SLUG) + "&dev=" + encodeURIComponent(DEV) + "&nick=" + encodeURIComponent(nick());
    if (p) u += "&pass=" + encodeURIComponent(p.pass);
    if (isKid()) u += "&kid=1";
    return u;
  }
  function connect() {
    wantLive = true;
    if (ws && (ws.readyState === 0 || ws.readyState === 1)) return;
    if (!("WebSocket" in W) || wsTries >= 3) { startPoll(); return; }
    wsTries++;
    var sock;
    try { sock = new WebSocket(wsUrl()); } catch (e) { startPoll(); return; }
    ws = sock;
    var opened = false, giveUp = setTimeout(function () { if (!opened) { try { sock.close(); } catch (e) {} startPoll(); } }, 6000);
    sock.onopen = function () { opened = true; clearTimeout(giveUp); wsOk = true; wsTries = 0; stopPoll(); ping(); };
    sock.onmessage = function (ev) { lastMsg = Date.now(); var m; try { m = JSON.parse(ev.data); } catch (e) { return; } onMsg(m); };
    sock.onclose = function () {
      clearTimeout(giveUp); if (ws === sock) { ws = null; wsOk = false; }
      if (!wantLive) return;
      startPoll();   // keep the lobby alive by polling while we try the socket again
      setTimeout(function () { if (wantLive && !ws && wsTries < 3) connect(); }, 1500 * wsTries + 500);
    };
    sock.onerror = function () {};
  }
  function ping() {
    if (!wsOk) return;
    clearTimeout(pingT);
    var t0 = Date.now();
    send({ t: "ping", c: "p" + t0 });
    pingT = setTimeout(ping, 20000);
    if (Date.now() - lastMsg > 45000 && lastMsg) { try { ws.close(); } catch (e) {} }
  }
  function startPoll() {
    if (pollT || !wantLive) return;
    var go = function () {
      if (!wantLive || wsOk) { pollT = null; return; }
      poll(null).then(function () { pollT = setTimeout(go, 2500); }, function () { pollT = setTimeout(go, 5000); });
    };
    pollT = setTimeout(go, 50);
  }
  function stopPoll() { clearTimeout(pollT); pollT = null; }
  function post(path, body) {
    return fetch(API + path + "?slug=" + encodeURIComponent(SLUG), { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(body), cache: "no-store" })
      .then(function (r) { return r.json(); });
  }
  function ident() { var p = pass(); return { dev: DEV, nick: nick(), kid: isKid(), pass: p ? p.pass : "" }; }
  function poll(a) {
    var b = ident(); if (a) b.a = a;
    var t0 = Date.now();
    return post("/poll", b).then(function (j) {
      if (j && j.t === "state") { setOff(j.now, t0, Date.now()); onMsg(j); }
      return j ? j.r : null;
    });
  }
  function setOff(server, t0, t1) {
    var est = server - (t0 + t1) / 2;
    if (!offOk || Math.abs(est - off) > 250 || t1 - t0 < 400) { off = offOk ? off * 0.5 + est * 0.5 : est; offOk = true; }
  }
  function send(m) {
    if (ws && wsOk) { try { ws.send(JSON.stringify(m)); return true; } catch (e) {} }
    return false;
  }
  // an action with a reply: over the socket (ack) or POST /act
  function act(a) {
    return new Promise(function (res) {
      if (ws && wsOk) {
        var c = "a" + (++ackN); acks[c] = res; a.c = c;
        send(a);
        setTimeout(function () { if (acks[c]) { delete acks[c]; res({ ok: false, error: "No answer from the server. Try again." }); } }, 8000);
        return;
      }
      var b = ident(); b.a = a;
      post("/act", b).then(function (r) { res(r || { ok: false }); if (wantLive) poll(null).catch(function () {}); }, function () { res({ ok: false, error: "No connection. Try again." }); });
    });
  }
  function onMsg(m) {
    if (m.t === "pong") { var t0 = +String(m.c || "").slice(1); if (t0) setOff(m.now, t0, Date.now()); return; }
    if (m.t === "ack") { var f = acks[m.c]; if (f) { delete acks[m.c]; f(m.r || { ok: false }); } return; }
    if (m.t === "react") { floatReact(m.e, m.n); return; }
    if (m.t === "match") { gotMatch(m.m); return; }
    if (m.t === "state") {
      if (!offOk && m.now) { off = m.now - Date.now(); }
      S = m;
      if (m.match) gotMatch(m.match);
      listeners.forEach(function (f) { try { f(m); } catch (e) {} });
      render();
    }
  }
  // the page-level card only needs a light read until someone opens the lobby
  function peek() {
    if (wantLive) return;
    var t0 = Date.now();
    fetch(API + "/state?slug=" + encodeURIComponent(SLUG) + "&dev=" + encodeURIComponent(DEV), { cache: "no-store" }).then(function (r) { return r.json(); })
      .then(function (j) { if (j && j.t === "state" && !wantLive) { setOff(j.now, t0, Date.now()); S = j; renderCard(); } }).catch(function () { renderCard(true); });
  }

  /* ---------------- presence ---------------- */
  function savePass(j) {
    lsSet(PK, { pass: j.pass, exp: j.exp, method: j.method, dev: DEV });
    if (!send({ t: "pass", pass: j.pass })) poll(null).catch(function () {});
  }
  function prove(proof) {
    return post("/presence", { dev: DEV, proof: proof }).then(function (j) {
      if (j && j.ok) { savePass(j); buzz(30); }
      return j || { ok: false, error: "No answer." };
    }, function () { return { ok: false, error: "No connection." }; });
  }
  function proveGeo() {
    return new Promise(function (res) {
      if (!navigator.geolocation) { res({ ok: false, error: "This phone can't share location. Use the TV code." }); return; }
      navigator.geolocation.getCurrentPosition(function (p) {
        prove({ type: "geo", lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }).then(res);
      }, function (e) { res({ ok: false, error: e && e.code === 1 ? "Location is blocked for this site. Use the 4-digit code on the bar TV instead." : "Couldn't get your location. Try the TV code." }); },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
    });
  }
  // a QR on the bar TV or a printed table card opens the app with ?vv=<signed code>: prove with it, then take it out of the URL
  (function () {
    var tok = q0.get("vv");
    if (!tok) return;
    try { var u = new URL(location.href); u.searchParams.delete("vv"); history.replaceState(history.state, "", u.pathname + u.search + u.hash); } catch (e) {}
    prove({ type: "qr", token: tok }).then(function (j) {
      toast(j.ok ? "✅ You're checked in at " + NAME + ". Battles count for real." : "🧪 " + (j.error || "That code expired.") + " You can still play in practice mode.");
      if (j.ok) open("battle");
    });
  })();

  /* ---------------- UI: page card ---------------- */
  var card = null;
  function mountCard() {
    var host = C.mount ? $(C.mount) : null;
    if (!host) return;
    card = el('<section class="vv-card" id="versus" aria-label="Venue Versus"><div class="vv-k">⚔️ Venue Versus · live at ' + esc(NAME) + '</div><h3>Play everyone at the bar</h3>' +
      '<p>Live battles against the people here right now: same sky, same food, same enemies. Free to play, bragging rights on the line.</p>' +
      '<div class="vv-row" id="vv-cardrow"><span class="vv-chip"><i class="vv-dot off"></i> Connecting…</span></div>' +
      '<div class="vv-row" style="margin-top:12px"><button type="button" class="vv-btn" id="vv-open">⚔️ Open the lobby</button>' +
      (C.tvUrl ? '' : '') + '</div></section>');
    host.appendChild(card);
    $("#vv-open", card).onclick = function () { open(); };
  }
  function nextEvent() {
    if (!S || !S.events) return null;
    return S.events.filter(function (e) { return e.status !== "done"; })[0] || null;
  }
  function renderCard(offline) {
    if (!card) return;
    var row = $("#vv-cardrow", card);
    if (offline && !S) { row.innerHTML = '<span class="vv-chip"><i class="vv-dot off"></i> Lobby offline right now</span>'; return; }
    if (!S) return;
    var e = nextEvent(), h = '<span class="vv-chip"><i class="vv-dot"></i> ' + fmt(S.here) + ' here now</span>';
    if (S.live) h += '<span class="vv-chip">🔴 LIVE: ' + esc(S.live.title) + ' · ' + mmss(S.live.endsAt - now()) + '</span>';
    else if (e) h += '<span class="vv-chip">⏱️ ' + esc(e.title) + ' · ' + (e.status === "open" ? 'join now · starts in ' : 'in ') + until(e.startsAt - now()) + '</span>';
    row.innerHTML = h;
  }

  /* ---------------- UI: lobby sheet ---------------- */
  var ov = null, tab = "battle", picks = null, picksAt = 0, msg = "";
  var TABS = [["battle", "⚔️ Battle"], ["picks", "🏟️ Who wins?"], ["live", "✈️ Duel & race"]].filter(function (t) {
    return t[0] === "battle" || (t[0] === "picks" && GAMES.indexOf("picks") >= 0) || (t[0] === "live" && (GAMES.indexOf("duel") >= 0 || GAMES.indexOf("race") >= 0));
  });
  function buildOv() {
    ov = el('<div id="vv-ov" role="dialog" aria-modal="true" aria-labelledby="vv-h" data-scroll-ok>' +
      '<div class="vv-top"><h2 id="vv-h">⚔️ Venue Versus</h2><span class="vv-chip" id="vv-here"><i class="vv-dot off"></i> …</span><button type="button" class="vv-x" aria-label="Close the lobby">✕</button></div>' +
      '<div class="vv-tabs" role="tablist">' + TABS.map(function (t) { return '<button type="button" class="vv-tab" role="tab" data-t="' + t[0] + '" aria-selected="false">' + t[1] + '</button>'; }).join("") + '</div>' +
      '<div class="vv-body" id="vv-body" aria-live="polite"></div></div>');
    D.body.appendChild(ov);
    $(".vv-x", ov).onclick = close;
    ov.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
    [].forEach.call(ov.querySelectorAll(".vv-tab"), function (b) { b.onclick = function () { tab = b.getAttribute("data-t"); msg = ""; render(); if (tab === "picks") loadPicks(true); }; });
    ov.addEventListener("click", onClick);
    ov.addEventListener("submit", function (e) { e.preventDefault(); });
  }
  var prevOverflow = "";
  function open(t) {
    if (!ov) buildOv();
    if (t) tab = t;
    connect();
    ov.classList.add("on");
    prevOverflow = D.documentElement.style.overflow; D.documentElement.style.overflow = "hidden";
    render();
    if (tab === "picks") loadPicks(true);
    setTimeout(function () { var x = $(".vv-x", ov); if (x) x.focus(); }, 30);
  }
  function close() {
    if (!ov) return;
    ov.classList.remove("on");
    D.documentElement.style.overflow = prevOverflow;
    renderCard();
  }
  function isOpen() { return !!(ov && ov.classList.contains("on")); }

  function boardHTML(rows, opt) {
    opt = opt || {};
    if (!rows || !rows.length) return '<p class="s" style="margin:6px 0 0">' + esc(opt.empty || "Nobody yet.") + '</p>';
    return '<ol class="vv-board">' + rows.map(function (r, i) {
      return '<li class="' + (r.me ? "me" : "") + '"><span class="r">' + (i === 0 ? "👑" : i + 1) + '</span><span class="n">' + esc(r.n) + (r.p ? ' <span title="practice: not proven at the bar">🧪</span>' : '') + (r.me ? ' (you)' : '') + '</span><span class="v">' + (opt.unit ? opt.unit(r) : fmt(r.s)) + '</span></li>';
    }).join("") + '</ol>';
  }
  function presenceHTML() {
    var me = S && S.me, p = pass();
    if (me && me.verified || p) {
      var how = (me && me.method) || (p && p.method) || "";
      return '<div class="vv-ok">✅ <b>Checked in at ' + esc(NAME) + '</b>' + (how ? ' · ' + esc({ "tv-qr": "TV QR", "table-qr": "table QR", "tv-code": "TV code", location: "location" }[how] || how) : '') + '. Your battles count for prizes.</div>';
    }
    return '<div class="vv-prac">🧪 <b>Practice mode.</b> You can play and rank, but prizes need proof you\'re at ' + esc(NAME) + ' (any one):' +
      '<div class="vv-row" style="margin-top:8px"><button type="button" class="vv-btn alt" data-a="geo">📍 Use my location</button></div>' +
      '<form class="vv-codein" data-f="code"><input inputmode="numeric" pattern="[0-9]*" maxlength="4" placeholder="0000" aria-label="4-digit code from the bar TV" autocomplete="off"><button type="submit" class="vv-btn alt" data-a="code">Enter TV code</button></form>' +
      '<p class="vv-fine">📷 Or scan the QR on the bar TV or your table with your camera. Location is checked once, when you tap, and isn\'t stored.</p></div>';
  }
  function nickHTML() {
    if (isKid()) return '<div class="vv-ok">🧒 Kid mode: you play other kids only, as <b>' + esc((S && S.me && S.me.nick) || "a fun nickname") + '</b>. No names, no chat.</div>';
    return '<form class="vv-nick" data-f="nick"><label for="vv-nickin" style="font:800 13px var(--vv-body);white-space:nowrap">Name on the board</label><input id="vv-nickin" maxlength="16" value="' + esc(nick()) + '" placeholder="First name or nickname" autocomplete="nickname"><button type="submit" class="vv-btn alt" data-a="nick">Save</button></form>';
  }
  function reactHTML() {
    var R = (S && S.reactions) || ["🔥", "👏", "😂", "😮"];
    return '<div class="vv-react" role="group" aria-label="Send a reaction to everyone in the lobby">' + R.map(function (e) { return '<button type="button" data-a="react" data-e="' + esc(e) + '" aria-label="Send ' + esc(e) + '">' + esc(e) + '</button>'; }).join("") + '</div>';
  }
  function prizeLine(e) {
    if (!e.prize) return '🏅 Bragging rights';
    return '🎁 ' + esc(e.prize.text) + (e.prize.adult ? ' <b>(21+, ID checked)</b>' : '') + ' · members claim';
  }
  function evHTML(e) {
    var t = now(), h = '<div class="vv-box"><div class="vv-k">' + (e.kind === "pickup" ? "Quick battle" : e.kind === "nightly" ? "Tonight · every night" : "Special event") + '</div>' +
      '<h4>' + esc(e.title) + '</h4><p class="s">' + clock(e.startsAt) + ' · ' + Math.round((e.endsAt - e.startsAt) / 60000) + '-minute high-score battle in Melody Survival · ' + prizeLine(e) + ' · ' + fmt(e.joined) + (e.max ? '/' + e.max : '') + ' in</p>';
    if (e.status === "live" || e.status === "finishing") {
      h += '<div class="vv-cdn">' + mmss(e.endsAt - t) + '</div><p class="s">🔴 Live now' + (e.mine ? ' · you\'re #' + (e.mine.rank || "–") + ' with ' + fmt(e.mine.score) : '') + '</p>';
      if (e.mine && running && running.id === e.id && !running.done) h += '<button type="button" class="vv-btn wide" data-a="rejoin">✈️ Back to the game</button>';
    } else {
      h += '<div class="vv-cdn" data-cd="' + e.startsAt + '">' + until(e.startsAt - t) + '</div>';
      if (e.mine) h += '<p class="s">✅ You\'re in. Keep this page open: the game starts by itself at ' + clock(e.startsAt) + '.</p>' + (e.status === "open" ? '<button type="button" class="vv-btn alt" data-a="leave" data-ev="' + esc(e.id) + '">Leave</button>' : '');
      else if (e.status === "open") h += '<button type="button" class="vv-btn wide" data-a="join" data-ev="' + esc(e.id) + '">⚔️ Join · free</button>';
      else if (e.status === "scheduled") h += '<p class="s">Joining opens 10 minutes before the start (' + clock(e.startsAt - 600000) + ').</p>';
      else h += '<p class="s">Entries are locked.</p>';
    }
    return h + '</div>';
  }
  function renderBattle() {
    var t = now(), h = presenceHTML() + nickHTML();
    if (!S) return h + '<div class="vv-box"><p class="s">Connecting to the lobby…</p></div>';
    if (S.live) {
      h += '<div class="vv-box"><div class="vv-k">🔴 Live leaderboard</div><h4>' + esc(S.live.title) + ' · ' + mmss(S.live.endsAt - t) + '</h4>' +
        boardHTML(S.live.board, { empty: "Scores land here as soon as the planes take off." }) + (S.live.kids && S.live.kids.length ? '<div class="vv-k" style="margin-top:10px">🧒 Kids</div>' + boardHTML(S.live.kids) : '') + '</div>';
    }
    if (S.last) h += resultsHTML(S.last);
    // tonight first: anything more than 20 h out (tomorrow's nightly) stays off the list until it's the next one
    (S.events || []).forEach(function (e, i) { if (!(S.live && S.live.id === e.id && !e.mine) && (i === 0 || e.startsAt - t < 20 * 3600000)) h += evHTML(e); });
    var busy = (S.events || []).some(function (e) { return ["open", "locked", "live", "finishing"].indexOf(e.status) >= 0; });
    if (!busy) {
      h += '<div class="vv-box"><div class="vv-k">Quick battle</div><h4>Ready for a quick one?</h4><p class="s">When 2 people here tap Ready, a ' + '2-minute battle starts 12 seconds later. Bragging rights only.</p>' +
        '<div class="vv-row"><button type="button" class="vv-btn ' + (S.ready.mine ? "go" : "") + '" data-a="ready">' + (S.ready.mine ? "✅ Ready · tap to cancel" : "🙋 I'm ready") + '</button><span class="vv-chip">' + S.ready.n + ' / ' + S.ready.need + ' ready</span></div></div>';
    }
    h += '<div class="vv-box"><div class="vv-k">Lobby</div><h4>Say something</h4><p class="s">Reactions only, everyone in the lobby and on the bar TV sees them.</p>' + reactHTML() + '</div>';
    h += '<p class="vv-fine">Free to play, no purchase or buy-in, no betting between players. Prizes are menu perks set by ' + esc(NAME) + ', for Rewards members, one Versus prize per person per day; drink perks are 21+ with ID. Scores are checked by the server.</p>';
    return h + '<div class="vv-msg" role="status">' + esc(msg) + '</div>';
  }
  function resultsHTML(L) {
    var h = '<div class="vv-box"><div class="vv-k">🏁 Final · ' + esc(L.title) + '</div><h4>' + (L.winner ? '👑 ' + esc(L.winner.n) + (L.winner.me ? ' (you!)' : '') + ' wins with ' + fmt(L.winner.s) : 'No winner') + '</h4>' +
      (L.me ? '<p class="s">You finished #' + L.me.rank + ' of ' + fmt(L.total) + ' with ' + fmt(L.me.score) + '.</p>' : '') + boardHTML(L.board) +
      (L.kids && L.kids.length ? '<div class="vv-k" style="margin-top:10px">🧒 Kids</div>' + boardHTML(L.kids) : '');
    if (L.claim) h += '<div class="vv-claim"><div class="vv-k">Your prize</div><div>' + esc(L.claim.prize) + '</div><div class="code">' + esc(L.claim.code) + '</div><p class="vv-fine">Show this to your server tonight (until ' + clock(L.claim.until) + ').' + (L.claim.adult ? ' 21+: staff check your ID.' : '') + ' One Versus prize per person per day.</p></div>';
    else if (L.canClaim) h += '<button type="button" class="vv-btn wide" style="margin-top:10px" data-a="claim" data-ev="' + esc(L.id) + '">🎁 Claim: ' + esc(L.prize.text) + '</button>';
    return h + '</div>';
  }
  function renderPicks() {
    var h = '';
    if (!picks) return '<div class="vv-box"><p class="s">Loading tonight\'s games…</p></div>';
    if (!picks.on) return '<div class="vv-box"><p class="s">Picks are off at ' + esc(NAME) + ' right now.</p></div>';
    h += '<div class="vv-box"><div class="vv-k">Tonight at ' + esc(NAME) + '</div><h4>Who wins?</h4><p class="s">Pick before each game starts. The bar keeps score: most right picks tonight tops the board. Just for fun: no money, no betting.</p></div>';
    if (picks.err) h += '<div class="vv-box"><p class="s">' + esc(picks.err) + '</p></div>';
    if (!picks.games.length && !picks.err) h += '<div class="vv-box"><p class="s">No local games on tonight. Check back on game night.</p></div>';
    picks.games.forEach(function (g) {
      var tot = 0; for (var k in g.counts) tot += g.counts[k];
      var side = function (t) {
        var n = g.counts[t.id] || 0, pc = tot ? Math.round(100 * n / tot) : 0, win = g.winner && g.winner === t.id;
        return '<button type="button" data-a="pick" data-g="' + esc(g.id) + '" data-team="' + esc(t.id) + '" aria-pressed="' + (g.mine === t.id) + '"' + (g.locked ? ' disabled' : '') + '>' +
          (t.logo ? '<img src="' + esc(t.logo) + '" alt="" loading="lazy" onerror="this.remove()">' : '') + '<span>' + esc(t.abbr || t.name) + (t.score !== "" && g.state !== "pre" ? ' · ' + esc(t.score) : '') + (win ? ' <span class="w">✔</span>' : '') + '</span>' +
          '<span class="pc">' + (tot ? pc + '% of ' + esc(NAME.split(" ")[0]) : 'no picks yet') + '</span></button>';
      };
      h += '<div class="vv-box"><div class="vv-k">' + esc(g.lg.toUpperCase()) + ' · ' + (g.state === "pre" ? clock(g.startsAt) : esc(g.detail)) + (g.locked && g.state === "pre" ? ' · locked' : '') + '</div><h4>' + esc(g.away.name) + ' @ ' + esc(g.home.name) + '</h4>' +
        '<div class="vv-pk">' + side(g.away) + side(g.home) + '</div>' + (g.mine && g.winner ? '<p class="s" style="margin:8px 0 0">' + (g.mine === g.winner ? '✅ You called it.' : '❌ Not this time.') + '</p>' : '') + '</div>';
    });
    h += '<div class="vv-box"><div class="vv-k">Venue board</div><h4>Tonight\'s best pickers</h4>' + boardHTML(picks.board.map(function (r) { return { n: r.n, s: r.right, me: r.me }; }), { empty: "No picks yet tonight. Be the first.", unit: function (r) { return r.s + " right"; } }) + '</div>';
    return h + '<div class="vv-msg" role="status">' + esc(msg) + '</div>';
  }
  function renderLive() {
    var h = presenceHTML() + nickHTML() + '<div class="vv-games">';
    var q = (S && S.queue) || { duel: { n: 0, mine: 0 }, race: { n: 0, mine: 0 } };
    if (GAMES.indexOf("duel") >= 0) h += '<div class="vv-box"><div class="vv-g"><div class="i">🛩️</div><div><div class="vv-k">2 players · 2 minutes</div><h4>Sky Duel</h4></div></div>' +
      '<p class="s">Same sky, same food, same enemies. You see your rival\'s ghost plane, and power-ups are shared: grab the slow-mo before they do. Highest score wins.</p>' +
      '<div class="vv-row"><button type="button" class="vv-btn ' + (q.duel.mine ? "go" : "") + '" data-a="queue" data-g="duel">' + (q.duel.mine ? "🔎 Finding a rival… tap to stop" : "🛩️ Find a rival") + '</button>' + (q.duel.n ? '<span class="vv-chip">' + q.duel.n + ' waiting</span>' : '') + '</div></div>';
    if (GAMES.indexOf("race") >= 0) h += '<div class="vv-box"><div class="vv-g"><div class="i">🏃</div><div><div class="vv-k">2–4 players · about 90 seconds</div><h4>Menu Dash</h4></div></div>' +
      '<p class="s">A one-thumb race across the kitchen: tap to jump, tap again to double-jump, swipe down to slide. Dodge the dishes, grab menu power-ups, first to the finish wins.</p>' +
      '<div class="vv-row"><button type="button" class="vv-btn ' + (q.race.mine ? "go" : "") + '" data-a="queue" data-g="race">' + (q.race.mine ? "🔎 Finding racers… tap to stop" : "🏃 Find racers") + '</button>' + (q.race.n ? '<span class="vv-chip">' + q.race.n + ' waiting</span>' : '') +
      (C.raceUrl ? '<a class="vv-btn alt" href="' + esc(C.raceUrl) + '?slug=' + encodeURIComponent(SLUG) + '&practice=1">Practice solo</a>' : '') + '</div><p class="vv-fine">Starts with 4 racers, or with 2–3 after 15 seconds of waiting.</p></div>';
    h += '</div>' + reactHTML();
    return h + '<div class="vv-msg" role="status">' + esc(msg) + '</div>';
  }
  function render() {
    renderCard();
    if (!ov) return;
    var here = $("#vv-here", ov);
    if (S) here.innerHTML = '<i class="vv-dot' + (wsOk || pollT ? "" : " off") + '"></i> ' + fmt(S.here) + ' here';
    [].forEach.call(ov.querySelectorAll(".vv-tab"), function (b) { b.setAttribute("aria-selected", String(b.getAttribute("data-t") === tab)); });
    if (!isOpen()) return;
    var body = $("#vv-body", ov), ae = D.activeElement, keepId = ae && ae.id, sel = ae && ae.selectionStart, typing = ae && ae.tagName === "INPUT" && body.contains(ae);
    if (typing) { var typed = ae.value; }
    var st = body.scrollTop;
    body.innerHTML = tab === "picks" ? renderPicks() : tab === "live" ? renderLive() : renderBattle();
    body.scrollTop = st;
    if (typing) {
      var again = keepId ? D.getElementById(keepId) : body.querySelector(ae.closest("form.vv-codein") ? ".vv-codein input" : "input");
      if (again) { again.value = typed; again.focus(); try { again.setSelectionRange(sel, sel); } catch (e) {} }
    }
  }
  // the countdowns tick without a re-render
  setInterval(function () {
    if (ov && isOpen()) [].forEach.call(ov.querySelectorAll("[data-cd]"), function (x) { x.textContent = until(+x.getAttribute("data-cd") - now()); });
    renderCard();
  }, 1000);

  function loadPicks(force) {
    if (!force && Date.now() - picksAt < 30000) return;
    picksAt = Date.now();
    fetch(API + "/picks?slug=" + encodeURIComponent(SLUG) + "&dev=" + encodeURIComponent(DEV), { cache: "no-store" }).then(function (r) { return r.json(); })
      .then(function (j) { if (j && j.ok) { picks = j; render(); } }).catch(function () { picks = picks || { on: true, games: [], board: [], err: "Can't reach the scoreboard right now." }; render(); });
  }
  setInterval(function () { if (isOpen() && tab === "picks") loadPicks(false); }, 31000);

  function say(t) { msg = t || ""; render(); }
  function onClick(ev) {
    var b = ev.target.closest("[data-a]");
    if (!b || !ov.contains(b)) return;
    var a = b.getAttribute("data-a");
    if (a === "geo") { b.disabled = true; b.textContent = "Checking…"; proveGeo().then(function (j) { say(j.ok ? "✅ Checked in." : (j.error || "Couldn't check you in.")); }); return; }
    if (a === "code") {
      ev.preventDefault();
      var inp = $(".vv-codein input", ov), c = (inp && inp.value || "").replace(/\D/g, "");
      if (c.length !== 4) { say("Type the 4 digits shown on the bar TV."); return; }
      prove({ type: "code", code: c }).then(function (j) { say(j.ok ? "✅ Checked in." : (j.error || "That code didn't work.")); });
      return;
    }
    if (a === "nick") {
      ev.preventDefault();
      var v = ($("#vv-nickin", ov).value || "").replace(/[^\w .'-]/g, "").trim().slice(0, 16);
      lsSet("vv-nick", v); if (!send({ t: "nick", nick: v })) poll(null).catch(function () {});
      say(v ? "Saved. You're " + v + " on the board." : "Cleared.");
      return;
    }
    if (a === "join") { if (!ensureNick()) return; unlockAudio(); var m = member(); act({ t: "join", ev: b.getAttribute("data-ev"), member: m && m.id || "" }).then(function (r) { say(r.ok ? "✅ You're in. Stay on this page: the game starts by itself." : r.error); if (r.ok) buzz(25); }); return; }
    if (a === "leave") { act({ t: "leave", ev: b.getAttribute("data-ev") }).then(function (r) { say(r.ok ? "You left this one." : r.error); }); return; }
    if (a === "ready") { if (!ensureNick()) return; unlockAudio(); act({ t: "ready", on: !(S && S.ready.mine) }).then(function (r) { if (!r.ok) say(r.error); }); return; }
    if (a === "react") { act({ t: "react", e: b.getAttribute("data-e") }); floatReact(b.getAttribute("data-e"), "you"); return; }
    if (a === "pick") {
      if (!ensureNick()) return;
      var gid = b.getAttribute("data-g"), team = b.getAttribute("data-team");
      act({ t: "pick", game: gid, team: team }).then(function (r) { if (r.ok) { buzz(15); loadPicks(true); say(""); } else say(r.error); });
      return;
    }
    if (a === "queue") { if (!ensureNick()) return; unlockAudio(); var g = b.getAttribute("data-g"); act({ t: "queue", game: g, on: !(S && S.queue && S.queue[g] && S.queue[g].mine) }).then(function (r) { if (!r.ok) say(r.error); }); return; }
    if (a === "claim") { claim(b.getAttribute("data-ev")); return; }
    if (a === "rejoin") { close(); focusGame(); return; }
  }
  function ensureNick() {
    if (isKid() || nick()) return true;
    say("Add a name for the board first (top of this screen).");
    var i = $("#vv-nickin", ov); if (i) i.focus();
    return false;
  }
  function claim(id) {
    var go = function () {
      var m = member();
      if (!m || !m.id) { say("Join Rewards (free) to claim your prize."); return; }
      act({ t: "claim", ev: id, member: m.id, adult: !!m.adult }).then(function (r) {
        if (r.ok) { buzz([30, 40, 30]); say("🎁 Show the code to your server."); poll(null).catch(function () {}); }
        else say(r.error || "Couldn't claim it.");
      });
    };
    if (member()) go();
    else if (C.join) C.join(function () { go(); });
    else say("Join Rewards (free) to claim your prize.");
  }

  /* ---------------- reactions ---------------- */
  function floatReact(e, n) {
    if (!e) return;
    var f = D.createElement("div"); f.className = "vv-float"; f.innerHTML = esc(e) + (n ? "<small>" + esc(n) + "</small>" : "");
    var box = isOpen() ? null : gameBox(), r = box ? box.getBoundingClientRect() : { left: 0, width: innerWidth, bottom: innerHeight - 60 };
    f.style.left = Math.round(r.left + 20 + Math.random() * Math.max(40, r.width - 80)) + "px";
    f.style.top = Math.round(Math.min(innerHeight - 80, r.bottom - 90)) + "px";
    D.body.appendChild(f);
    setTimeout(function () { f.remove(); }, 2600);
  }
  function toast(t) {
    var d = el('<div role="status" style="position:fixed;left:12px;right:12px;top:max(12px,env(safe-area-inset-top));z-index:2147480700;max-width:520px;margin:0 auto;padding:12px 14px;border-radius:14px;background:var(--vv-panel);border:1px solid var(--vv-acc);color:var(--vv-ink);font:700 14px var(--vv-body);box-shadow:0 10px 40px #000a"></div>');
    d.textContent = t; D.body.appendChild(d); setTimeout(function () { d.remove(); }, 6000);
  }

  /* ---------------- the game: battle runner ---------------- */
  var running = null;   // {kind:"battle"|"duel", id, endsAt, ...}
  var tick = null, cd = null, startedKey = "vv-started:" + SLUG;
  function gameBox() { return (C.ticker && $(C.ticker)) || $(".gamebox") || null; }
  function focusGame() { try { if (PLAY.focus) PLAY.focus(); else { var g = gameBox(); if (g) g.scrollIntoView({ block: "center", behavior: "smooth" }); } } catch (e) {} }
  function unlockAudio() { try { if (PLAY.unlock) PLAY.unlock(); } catch (e) {} }
  function started(id) { var s = lsGet(startedKey, {}); return !!s[id]; }
  function markStarted(id) { var s = lsGet(startedKey, {}); s[id] = Date.now(); var ks = Object.keys(s); if (ks.length > 30) delete s[ks[0]]; lsSet(startedKey, s); }
  function countdown(show, title, t) {
    if (!cd) { cd = el('<div id="vv-cd" aria-live="assertive"><b></b><span></span></div>'); D.body.appendChild(cd); }
    if (!show) { cd.classList.remove("on"); return; }
    cd.classList.add("on");
    var n = Math.ceil(t / 1000);
    $("b", cd).textContent = n > 0 ? String(n) : "GO!";
    $("span", cd).textContent = title;
  }
  function tickerShow(on) {
    if (!on) { if (tick) { tick.remove(); tick = null; } return; }
    var host = gameBox(); if (!host) return;
    if (!tick || tick.parentNode !== host) { if (tick) tick.remove(); tick = el('<div class="vv-tick" aria-live="off"></div>'); if (getComputedStyle(host).position === "static") host.style.position = "relative"; host.appendChild(tick); }
  }
  function tickerPaint() {
    if (!tick || !running) return;
    var t = now(), h = '<div>⚔️ ' + esc(running.title) + ' · <span class="t">' + mmss(running.endsAt - t) + '</span></div>';
    if (running.kind === "battle" && S && S.live && S.live.id === running.id) {
      var me = S.live.myRank, board = S.live.board, kidb = S.live.kids;
      var rows = (isKid() ? kidb : board).slice(0, 3);
      h += (me ? '<div>You: <span class="t">#' + me + '</span> of ' + S.live.total + '</div>' : '') + '<ol>' + rows.map(function (r, i) { return '<li class="' + (r.me ? "me" : "") + '"><span>' + (i ? i + 1 + ". " : "👑 ") + esc(r.n) + '</span><span>' + fmt(r.s) + '</span></li>'; }).join("") + '</ol>';
    } else if (running.kind === "duel" && duel) {
      var rv = duel.rival;
      h += '<ol><li class="me"><span>You</span><span>' + fmt(PLAY.score ? PLAY.score() : 0) + '</span></li><li><span>' + esc(rv ? rv.n : "Rival") + (rv && rv.done ? " 💥" : "") + '</span><span>' + fmt(rv ? rv.score : 0) + '</span></li></ol>';
    }
    if (running.done) h += '<div style="color:var(--vv-dim)">Waiting for the horn…</div>';
    tick.innerHTML = h;
  }
  // every 250 ms: start / stop my battle on the server's clock, report my score once a second
  var lastScoreAt = 0;
  setInterval(function () {
    var t = now();
    if (!running && S && S.events) {
      var e = S.events.filter(function (x) { return x.mine && x.seed && ["open", "locked", "live", "finishing"].indexOf(x.status) >= 0 && x.endsAt - t > 8000; })[0];
      if (e && !started(e.id)) {
        var left = e.startsAt - t;
        if (left <= 10500 && left > 0) {
          if (isOpen()) close();
          if (W.GameMenu && W.GameMenu.close) try { W.GameMenu.close(); } catch (x) {}
          focusGame();
          countdown(true, e.title + " · " + mmss(e.endsAt - e.startsAt) + " · highest score wins", left);
        } else if (left <= 0) {
          countdown(true, e.title, 0);
          setTimeout(function () { countdown(false); }, 700);
          startBattle(e);
        }
      }
    }
    if (running && !running.done) {
      if (t >= running.endsAt) { try { if (PLAY.stop) PLAY.stop(); } catch (x) {} }
      else if (running.kind === "battle" && t - lastScoreAt >= 1000 && PLAY.score) {
        lastScoreAt = t;
        var sc = PLAY.score();
        if (sc !== running.sent) { running.sent = sc; reportScore(running.id, sc, false); }
      }
    }
    if (running && running.done && t > running.endsAt + 9000 && running.kind === "battle") {
      var id = running.id; running = null; tickerShow(false);
      if (S && S.last && S.last.id === id) { open("battle"); }
      else setTimeout(function () { if (S && S.last && S.last.id === id) open("battle"); }, 3000);
    }
    tickerPaint();
  }, 250);
  function reportScore(id, sc, fin) {
    var m = { t: "score", ev: id, score: Math.max(0, Math.round(sc || 0)), final: !!fin };
    if (!send(m)) act(m);
  }
  function startBattle(e) {
    if (!PLAY.battle) { toast("This game can't join live battles yet."); return; }
    markStarted(e.id);
    running = { kind: "battle", id: e.id, title: e.title, endsAt: e.endsAt, sent: -1, done: false };
    tickerShow(true);
    buzz([40, 60, 40]);
    PLAY.battle({
      seed: e.seed, ms: Math.max(5000, e.endsAt - now()), label: e.title,
      onEnd: function (res) {
        if (!running || running.id !== e.id) return;
        running.done = true;
        reportScore(e.id, res.score, true);
        tickerPaint();
      }
    });
  }

  /* ---------------- Sky Duel + race (match rooms) ---------------- */
  var duel = null;   // {m, ws, buf:[], rival, me}
  var seenMatch = {};
  function gotMatch(m) {
    if (!m || seenMatch[m.id] || m.until < now()) return;
    seenMatch[m.id] = 1;
    buzz([30, 30, 30]);
    if (m.game === "race") {
      var u = (C.raceUrl || "../versus/race.html") + "?slug=" + encodeURIComponent(SLUG) + (q0.get("autopilot") ? "&autopilot=1" : "") + "#m=" + encodeURIComponent(JSON.stringify({ api: BASE, id: m.id, tok: m.tok, dev: DEV, seed: m.seed, startsAt: m.startsAt, durMs: m.durMs, players: m.players, off: Math.round(off), back: location.href.split("#")[0] + "#versus" }));
      toast("🏃 Racers found! Heading to the start line…");
      setTimeout(function () { location.href = u; }, 900);
      return;
    }
    if (m.game === "duel") startDuel(m);
  }
  function startDuel(m) {
    if (duel) return;
    duel = { m: m, ws: null, buf: [], rival: null, polling: false, done: false, posT: 0 };
    var rivals = m.players.filter(function (p) { return p.n !== nick(); });
    duel.rival = { n: (rivals[0] || m.players[0]).n, score: 0, done: false };
    toast("🛩️ Rival found: " + duel.rival.n + "! Sky Duel starts in a few seconds.");
    if (isOpen()) close();
    if (W.GameMenu && W.GameMenu.close) try { W.GameMenu.close(); } catch (x) {}
    focusGame();
    var base = API.replace(/^http/, "ws") + "/match/ws?slug=" + encodeURIComponent(SLUG) + "&game=duel&id=" + m.id + "&dev=" + encodeURIComponent(DEV) + "&tok=" + m.tok;
    try {
      var s = new WebSocket(base);
      duel.ws = s;
      s.onmessage = function (ev) { var x; try { x = JSON.parse(ev.data); } catch (e) { return; } duelMsg(x); };
      s.onclose = function () { if (duel && duel.ws === s) { duel.ws = null; duelPoll(); } };
      s.onerror = function () {};
    } catch (e) { duelPoll(); }
    var cdT = setInterval(function () {
      var left = m.startsAt - now();
      if (left > 0) { countdown(true, "Sky Duel vs " + duel.rival.n, left); return; }
      clearInterval(cdT); countdown(true, "Sky Duel vs " + duel.rival.n, 0); setTimeout(function () { countdown(false); }, 700);
      running = { kind: "duel", id: m.id, title: "Sky Duel", endsAt: m.startsAt + m.durMs, done: false };
      tickerShow(true);
      PLAY.battle({
        seed: m.seed, ms: m.durMs, label: "Sky Duel vs " + duel.rival.n,
        ghost: function () { return ghostAt(now() - 120); },
        pu: function (id) { duelSend({ t: "pu", id: id }); },
        onEnd: function (res) { if (!duel) return; duel.done = true; running.done = true; duelSend({ t: "done", sc: res.score }); }
      });
      duel.posT = setInterval(function () {
        if (!duel || duel.done) return;
        var p = PLAY.pos ? PLAY.pos() : null;
        if (p) duelSend({ t: "pos", x: p.x, y: p.y, a: p.a || 0, sc: PLAY.score ? PLAY.score() : 0 });
        if (now() > m.startsAt + m.durMs + 1000 && PLAY.stop) PLAY.stop();
      }, 100);
    }, 200);
  }
  function duelSend(o) {
    if (!duel) return;
    if (duel.ws && duel.ws.readyState === 1) { try { duel.ws.send(JSON.stringify(o)); return; } catch (e) {} }
    (duel.q = duel.q || []).push(o); if (duel.q.length > 8) duel.q.shift();
  }
  function duelPoll() {
    if (!duel || duel.polling) return;
    duel.polling = true;
    var go = function () {
      if (!duel) return;
      var acts = (duel.q || []).splice(0);
      mpost({ dev: DEV, tok: duel.m.tok, acts: acts }).then(function (j) { if (j && j.t === "mstate") duelState(j); }).catch(function () {})
        .then(function () { if (duel && !(duel.result)) setTimeout(go, 1000); });
    };
    go();
  }
  // match polls carry the match routing params
  function mpost(body) {
    return fetch(API + "/match/poll?slug=" + encodeURIComponent(SLUG) + "&game=duel&id=" + duel.m.id, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(body), cache: "no-store" }).then(function (r) { return r.json(); });
  }
  function duelState(j) {
    var me = j.you >= 0 ? j.you : duel.me;
    if (me == null) return;
    (j.players || []).forEach(function (p) {
      if (p.i === me) return;
      duel.rival.n = p.n; duel.rival.score = p.score; duel.rival.done = p.done;
      if (p.pos) duel.buf.push({ t: j.now - Math.max(0, p.age), x: p.pos.x, y: p.pos.y, a: p.pos.a || 0 });
    });
    for (var k in j.pu || {}) if (j.pu[k] !== me && !(duel.took || {})[k]) { (duel.took = duel.took || {})[k] = 1; if (PLAY.take) PLAY.take(k); }
    if (j.result) duelResult(j.result, me);
  }
  function duelMsg(x) {
    if (!duel) return;
    if (x.t === "mstate") { if (x.you >= 0) duel.me = x.you; duelState(x); return; }
    if (x.t === "pos") { duel.buf.push({ t: x.at, x: x.p.x, y: x.p.y, a: x.p.a || 0 }); if (x.p.sc != null) duel.rival.score = x.p.sc; if (duel.buf.length > 60) duel.buf.splice(0, 20); return; }
    if (x.t === "pu") { if (x.by !== duel.me && PLAY.take) PLAY.take(x.id); return; }
    if (x.t === "react") { floatReact(x.e, duel.rival.n); return; }
    if (x.t === "result") { duelResult(x.result, duel.me); return; }
  }
  function ghostAt(t) {
    if (!duel || !duel.buf.length) return null;
    var b = duel.buf, a = b[0], c = b[b.length - 1];
    for (var i = b.length - 1; i > 0; i--) if (b[i - 1].t <= t) { a = b[i - 1]; c = b[i]; break; }
    var k = c.t > a.t ? Math.max(0, Math.min(1.2, (t - a.t) / (c.t - a.t))) : 1;
    return { x: a.x + (c.x - a.x) * k, y: a.y + (c.y - a.y) * k, a: a.a + (c.a - a.a) * k, n: duel.rival.n, down: duel.rival.done };
  }
  function duelResult(r, me) {
    if (!duel || duel.result) return;
    duel.result = r;
    clearInterval(duel.posT);
    var b = r.board || [], win = b[0], mine = b.filter(function (x) { return x.i === me; })[0];
    setTimeout(function () {
      running = null; tickerShow(false);
      toast(win && win.i === me ? "🏆 You won the Sky Duel, " + fmt(mine.score) + " to " + fmt((b[1] || {}).score) + "!" : "🛩️ " + (win ? win.n : "Rival") + " won the Sky Duel, " + fmt(win ? win.score : 0) + " to " + fmt(mine ? mine.score : 0) + ". Rematch?");
      try { if (duel.ws) duel.ws.close(); } catch (e) {}
      duel = null;
      open("live");
    }, 1200);
  }

  /* ---------------- boot ---------------- */
  mountCard();
  peek();
  setInterval(peek, 60000);
  // already entered a battle that hasn't happened yet, or checked in: keep the live connection up
  if (pass() || /#versus/.test(location.hash)) connect();
  // #versus opens the lobby; #versus=picks / #versus=live opens that tab (links from the TV, table cards, other pages)
  function hashTab() { var m = location.hash.match(/#versus(?:=(battle|picks|live))?/); return m ? (m[1] || "battle") : ""; }
  if (hashTab()) setTimeout(function () { open(hashTab()); }, 400);
  W.addEventListener("hashchange", function () { if (hashTab()) open(hashTab()); });
  D.addEventListener("visibilitychange", function () { if (!D.hidden && wantLive && !wsOk && wsTries >= 3) { wsTries = 0; connect(); } });

  W.Versus = {
    open: open, close: close, state: function () { return S; }, now: now, dev: DEV, api: API,
    onState: function (f) { listeners.push(f); }, prove: prove, connect: connect,
    _test: { off: function () { return off; }, ws: function () { return wsOk; }, poll: function () { return !!pollT; } }
  };
})();
