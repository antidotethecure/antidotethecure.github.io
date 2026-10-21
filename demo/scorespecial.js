/* SousShift AI · SCORE SPECIAL ("when the home team scores, a same-day deal unlocks"). Melody = install #1 (LA Rams).
   Include AFTER crm.js + interim.js (+ specials.js, so the card can sit inside its Specials section):
     <script>window.SCORE_SPECIAL = { on:false, league:"nfl", team:"LAR", label:"Rams", phrase:"The Rams", phraseEs:"los Rams",
       offer:"side", button:"App – Rams Score Special" };</script>
     <script src="../scorespecial.js?v=rs1"></script>

   HOW IT WORKS (stateless: nothing to switch on during the game)
   - Reads ESPN's public scoreboard for TODAY in Los Angeles (same data as the app's live scores):
       https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=YYYYMMDD
     If the team (ESPN abbreviation, e.g. LAR) plays today and has more than 0 points (touchdown, field goal, safety,
     anything), the special is ACTIVE until 11:59 PM LA time that day. Anyone who opens the app later that day sees it,
     even if they weren't watching. The "active today" answer is cached on the phone, so it isn't fetched again.
   - Polling: one fetch on open. Before kickoff it waits until the start time; while the game is live and the team hasn't
     scored yet it re-checks every pollSec (90 s) while the tab is visible. No game today / game over at 0 = no more
     fetches. ESPN unreachable = nothing shows, no errors.
   - Active: a hype banner at the very top (live countdown to 11:59 PM, leaves the 🌐 language pill corner clear), a card
     in Specials, and a one-time football + confetti pop the first time this phone sees it that day (no motion when the
     phone asks for reduced motion). English + hand-written Spanish (🌐 Español); other languages go through the page
     translator.
   - Redeem: members only (non-members get the join sheet first). One Score Special per member per day however many
     times the team scores. It uses the live reward pass (demo/interim.js specialPass: moving pass, 10:00 countdown,
     one-time code, logged like other rewards) and counts as that visit's ONE reward, so it never stacks with another
     reward on the same check (Melody rule: one reward per visit, one prize per day). The pass names the Toast button.

   OFFER (exactly one): offer:"half" | "25off" | "side" | "drink" | "custom"
     half  = Half off one entrée                 Toast: % Off · 50%  · Item (select the entrée)
     25off = 25% off your meal                   Toast: % Off · 25%  · Entire check
     side  = Free side with any entrée (default) Toast: % Off · 100% · Item (select the side)
     drink = Free soft drink with any entrée     Toast: % Off · 100% · Item (select the soft drink). Non-alcoholic only.
     custom: offer:"custom", text:"…", textEs:"…", toast:{type:"% Off · 20%", applies:"Entire check", whole:true}
   NO FREE ALCOHOL (California ABC): a custom text that gives away beer / wine / cocktails / shots is refused and the
   default (side) is used instead. Drink DISCOUNTS are fine.

   TRADEMARK: team name in plain text only. No NFL / team logos, helmets, team colors or official artwork. To switch the
   wording to the safer "when LA scores", set label:"LA", phrase:"LA", phraseEs:"LA" (nothing else changes).

   SWITCH: on:false = nothing at all for real guests (no fetch, no banner, no card). Ships OFF until Christian or Sami OK it.
   TEST / DEMO (works while on:false; simulates "the team scored today"; test passes stay on this phone, never uploaded):
     ?scoretest=1                      default offer        ?scoretest=1&offer=half | 25off | side | drink
     ?scoretest=1&pop=1                replay the confetti  ?scoretest=1&lang=es  Spanish copy without the translator
   window.SSAI_SCORE = { active(), cfg, offer(), toast(), open() } for interim.js (Toast button list) and debugging. */
(function () {
  "use strict";
  var C = window.SCORE_SPECIAL || {};
  var Q; try { Q = new URLSearchParams(location.search); } catch (x) { Q = { get: function () { return null; } }; }
  var TEST = Q.get("scoretest") === "1";
  if (!C.on && !TEST) return;

  var TZ = "America/Los_Angeles";
  var LEAGUE = C.league || "nfl", PATH = { nfl: "football/nfl", cfb: "football/college-football", nba: "basketball/nba", mlb: "baseball/mlb", nhl: "hockey/nhl", mls: "soccer/usa.1" }[LEAGUE] || "football/nfl";
  var TEAM = String(C.team || "LAR").toUpperCase(), LABEL = C.label || "Rams", PHRASE = C.phrase || ("The " + LABEL), PHRASE_ES = C.phraseEs || ("los " + LABEL);
  var NAME = C.name || (window.CRM_CFG && window.CRM_CFG.name) || document.title.split(/ [—·|-] /)[0];
  var SHORT = C.short || NAME.split(/\s+(bar|&|grill|restaurant)\b/i)[0];
  var SLUG = NAME.toLowerCase().replace(/[^a-z0-9]+/g, "-") + (TEST ? "-test" : "");
  var POLL = Math.max(45, +C.pollSec || 90) * 1000;
  var BUTTON = C.button || ("App – " + LABEL + " Score Special");

  var PRESETS = {
    half: { en: "Half off one entrée", es: "Mitad de precio en un plato fuerte", type: "% Off · 50%", applies: "Item: select the entrée first", whole: false },
    "25off": { en: "25% off your meal", es: "25% de descuento en tu comida", type: "% Off · 25%", applies: "Entire check", whole: true },
    side: { en: "Free side with any entrée", es: "Guarnición gratis con cualquier plato fuerte", type: "% Off · 100%", applies: "Item: select the side first (fries up to $" + (C.sideMax || "7.75") + ")", whole: false },
    drink: { en: "Free soft drink with any entrée", es: "Refresco gratis con cualquier plato fuerte", type: "% Off · 100%", applies: "Item: select the soft drink first (non-alcoholic only)", whole: false }
  };
  var BOOZE = /\b(beer|beers|wine|cocktail|cocktails|margarita|margaritas|shot|shots|alcohol|liquor|tequila|vodka|whiskey|whisky|rum|mimosa|mimosas|sangria|michelada|draft|pitcher|cerveza|vino|trago)\b/i;
  function offer() {
    var k = (TEST && Q.get("offer")) || C.offer || "side";
    if (k === "custom" || (TEST && Q.get("text"))) {
      var t = String((TEST && Q.get("text")) || C.text || "").slice(0, 80), te = String(C.textEs || t).slice(0, 80), ct = C.toast || {};
      if (t && !(/free|gratis|on the house/i.test(t) && BOOZE.test(t))) return { key: "custom", en: t, es: te, type: ct.type || "Set by the owner", applies: ct.applies || "As written on the pass", whole: !!ct.whole };
      try { console.warn("Score Special: custom offer refused (no free alcohol, California ABC). Using the default."); } catch (x) {}
      k = "side";
    }
    var p = PRESETS[k] || PRESETS.side; p.key = PRESETS[k] ? k : "side"; return p;
  }
  var OFFER = offer();

  // ---- language: hand-written Spanish, everything else through the page translator ----
  function lang() { var l = TEST && Q.get("lang"); if (l) return l; try { return localStorage.getItem("demo_lang") || "en"; } catch (x) { return "en"; } }
  var ES = lang() === "es";
  var T = ES ? {
    k: "Score Special · solo hoy", head: "🏈 ¡Anotación de " + PHRASE_ES + "!", body: "Solo hoy en " + SHORT + ": ", ends: "Termina a medianoche.",
    left: "Termina en", use: "🎟️ Usar ahora", join: "🎁 Únete y desbloquéalo", hide: "✕ Ocultar", see: "Ver el especial →",
    card: LABEL + " Score Special", cardSub: "Desbloqueado hoy: anotaron " + PHRASE_ES + ".",
    fine: "Solo para miembros de " + NAME + " Rewards (gratis). Uno por miembro por día, sin importar cuántas veces anoten. Cuenta como tu única recompensa de la visita: no se combina con otra recompensa en la misma cuenta. En " + SHORT + ", hoy hasta las 11:59 PM.",
    drink: "Solo bebidas sin alcohol.", used: "✅ Ya usaste el Score Special de hoy. ¡Vuelve en el próximo partido!",
    jt: "Únete para desbloquear el Score Special", js: "Es gratis. Agrega tu nombre y un teléfono o correo y el especial de hoy es tuyo.", jb: "🎁 Unirme y desbloquear",
    test: "🧪 PRUEBA: anotación simulada (solo para la demo).", score: "Marcador", final: "Final", live: "En vivo"
  } : {
    k: "Score Special · today only", head: "🏈 " + PHRASE + " scored!", body: "Today only at " + SHORT + ": ", ends: "Ends at midnight.",
    left: "Ends in", use: "🎟️ Use it now", join: "🎁 Join free & unlock", hide: "✕ Hide", see: "See the special →",
    card: LABEL + " Score Special", cardSub: "Unlocked today: " + PHRASE.replace(/^The /, "the ") + " scored.",
    fine: "For " + NAME + " Rewards members (free to join). One per member per day, no matter how many times they score. Counts as your one reward this visit: can't be combined with another reward on the same check. At " + SHORT + ", today until 11:59 PM.",
    drink: "Non-alcoholic drinks only.", used: "✅ You used today's Score Special. Catch the next game!",
    jt: "Join to unlock the Score Special", js: "It's free. Add your name and a phone or email and today's special is yours.", jb: "🎁 Join & unlock",
    test: "🧪 TEST: simulated score (demo only).", score: "Score", final: "Final", live: "Live"
  };
  var OTXT = ES ? OFFER.es : OFFER.en;

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (x) { return null; } }
  function day(t) { try { return new Date(t || Date.now()).toLocaleDateString("en-CA", { timeZone: TZ }); } catch (x) { return new Date().toISOString().slice(0, 10); } }
  // 11:59:59 PM in Los Angeles today, as a timestamp
  function endOfDay() {
    var now = new Date(), p = {};
    try { new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(now).forEach(function (x) { p[x.type] = +x.value; }); }
    catch (x) { var d = new Date(); d.setHours(23, 59, 59, 0); return d.getTime(); }
    var off = Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second) - Math.floor(now.getTime() / 1000) * 1000;   // LA wall clock − UTC
    return Date.UTC(p.year, p.month - 1, p.day, 23, 59, 59) - off;
  }
  function hms(ms) { ms = Math.max(0, ms); var s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60; return h + ":" + String(m).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0"); }
  var reduce = false; try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (x) {}

  // ---- state: {day, active, line, state, start} ----
  var KEY = "ssai_score_" + SLUG, TODAY = day(), S = null;
  try { S = JSON.parse(ls(KEY) || "null"); } catch (x) {}
  if (!S || S.day !== TODAY) S = { day: TODAY, active: false };
  function saveS() { ls(KEY, JSON.stringify(S)); }
  if (TEST) { S.active = true; S.line = TEAM + " 7 · OPP 3"; S.state = "in"; }

  // ---- ESPN check (polls only while a game is on and the team hasn't scored) ----
  var timer = 0;
  function getJSON(url) {
    var A = window.SportsBar && window.SportsBar.api;
    if (A && A.getJSON) return A.getJSON(url);
    var c = window.AbortController ? new AbortController() : null, t = setTimeout(function () { if (c) c.abort(); }, 9000);
    return fetch(url, c ? { signal: c.signal } : {}).then(function (r) { clearTimeout(t); if (!r.ok) throw 0; return r.json(); });
  }
  function check() {
    clearTimeout(timer);
    if (S.active || day() !== TODAY) return;
    if (document.hidden) { timer = -1; return; }   // resumes on visibilitychange
    getJSON("https://site.api.espn.com/apis/site/v2/sports/" + PATH + "/scoreboard?dates=" + TODAY.replace(/-/g, "") + "&limit=300").then(function (j) {
      var ev = ((j && j.events) || []).filter(function (e) {
        var c = e.competitions && e.competitions[0];
        return c && day(e.date) === TODAY && (c.competitors || []).some(function (x) { return x.team && String(x.team.abbreviation).toUpperCase() === TEAM; });
      })[0];
      if (!ev) { S.state = "none"; saveS(); return; }   // no game today: stop
      var c = ev.competitions[0], cs = c.competitors || [], me = cs.filter(function (x) { return String(x.team.abbreviation).toUpperCase() === TEAM; })[0], op = cs.filter(function (x) { return x !== me; })[0];
      var st = (ev.status && ev.status.type) || {}, pts = parseInt(me.score, 10) || 0;
      S.state = st.state || ""; S.start = Date.parse(ev.date) || 0;
      S.line = TEAM + " " + pts + " · " + (op && op.team ? op.team.abbreviation + " " + (parseInt(op.score, 10) || 0) : "") + (st.state === "post" ? " · " + T.final : st.state === "in" ? " · " + (st.shortDetail || T.live) : "");
      if (pts > 0) { S.active = true; saveS(); show(); return; }
      saveS();
      if (st.state === "pre") timer = setTimeout(check, Math.min(Math.max(S.start - Date.now(), POLL), 36e5));
      else if (st.state === "in") timer = setTimeout(check, POLL);
      // post with 0 points: nothing today
    }).catch(function () { timer = setTimeout(check, POLL * 3); });   // ESPN unreachable: quiet retry, nothing shown
  }
  document.addEventListener("visibilitychange", function () { if (!document.hidden && timer === -1) check(); });

  // ---- styles (Melody's own wine + gold + turf; no team colors) ----
  var css = [
    "#ssai-score-banner{all:initial;display:block;position:relative;z-index:51;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;width:100%;box-sizing:border-box}",
    "#ssai-score-banner *{box-sizing:border-box;font-family:inherit}",
    ".scb{position:relative;overflow:hidden;color:#fff;padding:calc(10px + env(safe-area-inset-top,0px)) 12px 10px;border-bottom:2px solid #f0d375;",
    "background:repeating-linear-gradient(90deg,#ffffff0d 0 2px,transparent 2px 46px),linear-gradient(120deg,#2a0a10 0%,#77242e 55%,#1f4a2a 100%)}",
    ".scb::after{content:'';position:absolute;inset:0;background:linear-gradient(100deg,transparent 30%,#ffffff26 45%,transparent 60%);background-size:250% 100%;animation:scbShine 3.6s ease-in-out infinite;pointer-events:none}",
    "@keyframes scbShine{0%{background-position:120% 0}60%,100%{background-position:-120% 0}}",
    ".scb-top{display:flex;gap:10px;align-items:flex-start;padding-right:104px;min-height:40px}",   // 🌐 pill corner stays clear
    ".scb-e{flex:none;font-size:32px;line-height:1;filter:drop-shadow(0 2px 4px #0006);animation:scbSpin 1.8s ease-in-out infinite}",
    "@keyframes scbSpin{0%,100%{transform:rotate(-18deg) scale(1)}50%{transform:rotate(18deg) scale(1.12)}}",
    ".scb-tx{min-width:0}.scb-tx small{display:block;font:800 10.5px/1.3 ui-monospace,Menlo,monospace;letter-spacing:.14em;text-transform:uppercase;color:#f0d375}",
    ".scb-tx b{display:block;font-size:18px;font-weight:900;line-height:1.2;margin:2px 0;text-shadow:0 1px 2px #0005}",
    ".scb-tx span{display:block;font-size:13.5px;line-height:1.35;color:#fffffff0}.scb-tx span u{text-decoration:none;font-weight:900;color:#f0d375}",
    ".scb-act{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px;position:relative;z-index:1}",
    ".scb-cd{flex:1 1 100%;font:800 13px ui-monospace,Menlo,monospace;color:#fff}.scb-cd b{font-size:15px;color:#f0d375;letter-spacing:.04em}",
    ".scb-go{flex:1;border:0;border-radius:999px;background:#f0d375;color:#2a0a10;font:900 14px/1 system-ui,-apple-system,sans-serif;padding:10px 16px;min-height:40px;cursor:pointer;box-shadow:0 4px 14px #0005}",
    ".scb-x{border:1px solid #ffffff55;border-radius:999px;background:#0003;color:#fff;font:700 12.5px/1 system-ui,-apple-system,sans-serif;padding:9px 12px;min-height:40px;cursor:pointer}",
    ".scb-test{display:block;margin-top:6px;font:700 11.5px system-ui;color:#ffe9a3;opacity:.9}",
    // card in Specials
    ".scc{all:initial;display:block;position:relative;overflow:hidden;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#fff;border-radius:16px;padding:14px 12px;margin:10px 0 0;box-sizing:border-box;line-height:1.45;scroll-margin-top:90px;",
    "background:repeating-linear-gradient(90deg,#ffffff0d 0 2px,transparent 2px 46px),linear-gradient(135deg,#2a0a10,#77242e 60%,#1f4a2a);border:1px solid #f0d37599;transition:box-shadow .3s}",
    ".scc *{box-sizing:border-box;font-family:inherit}.scc.flash{box-shadow:0 0 0 3px #f0d375,0 0 24px #f0d375}",
    ".scc-wrap{all:initial;display:block;font-family:system-ui,-apple-system,sans-serif;max-width:640px;margin:18px auto;box-sizing:border-box}",
    ".scc small{display:block;font:800 10.5px/1.3 ui-monospace,Menlo,monospace;letter-spacing:.12em;text-transform:uppercase;color:#f0d375}",
    ".scc h4{margin:3px 0 2px;font:900 20px/1.2 system-ui}.scc .of{margin:6px 0;font:900 17px/1.3 system-ui;color:#f0d375}",
    ".scc p{margin:4px 0;font-size:13.5px;opacity:.95}.scc .fine{font-size:11.5px;opacity:.82}",
    ".scc .meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;font-size:12px}.scc .meta span{background:#0004;border:1px solid #ffffff2e;border-radius:999px;padding:3px 9px}",
    ".scc .meta .cd{font:800 12px ui-monospace,Menlo,monospace;border-style:dashed;border-color:#f0d375}",
    ".scc button{display:block;width:100%;margin-top:10px;border:0;border-radius:14px;background:#f0d375;color:#2a0a10;font:900 16px/1 system-ui;padding:13px;min-height:44px;cursor:pointer}",
    ".scc .done{margin-top:10px;padding:10px 12px;border-radius:12px;background:#0005;border:1px solid #ffffff33;font:800 14px system-ui}",
    // pop
    ".scp{position:fixed;inset:0;z-index:2147482000;pointer-events:none}",
    ".scp-msg{position:fixed;left:50%;top:38%;z-index:2147482001;transform:translate(-50%,-50%) scale(.6);opacity:0;pointer-events:none;text-align:center;color:#fff;font:900 clamp(30px,9vw,46px)/1.05 system-ui;text-shadow:0 4px 18px #000a;animation:scpIn 2.6s ease-out forwards;width:92vw}",
    ".scp-msg small{display:block;margin-top:8px;font:800 16px/1.3 system-ui;color:#f0d375}",
    "@keyframes scpIn{0%{opacity:0;transform:translate(-50%,-50%) scale(.6)}15%{opacity:1;transform:translate(-50%,-50%) scale(1.08)}25%{transform:translate(-50%,-50%) scale(1)}80%{opacity:1}100%{opacity:0;transform:translate(-50%,-60%) scale(1)}}",
    "@media (prefers-reduced-motion:reduce){.scb::after{display:none}.scb-e{animation:none}.scp-msg{animation:none;opacity:1;transform:translate(-50%,-50%)}}"
  ].join("");

  // ---- the pieces ----
  var END = 0, cdTimer = 0, banner = null;
  function memberUsedKey(m) { return "ssai_score_used_" + SLUG + "_" + (m && m.id || "x"); }
  function usedToday() { var m = window.SSAI_CRM && window.SSAI_CRM.member(); return !!m && ls(memberUsedKey(m)) === TODAY; }
  function memberId() { var m = window.SSAI_CRM && window.SSAI_CRM.member(); return m ? m.id || "?" : ""; }
  function isMember() { return !!(window.SSAI_CRM && window.SSAI_CRM.member()); }
  function actLabel() { return isMember() ? T.use : T.join; }

  function drawBanner() {
    if (banner) banner.remove(); banner = null;
    if (ls("ssai_score_hide_" + SLUG) === TODAY) return;
    var b = document.createElement("div"); b.id = "ssai-score-banner"; b.setAttribute("role", "region"); b.setAttribute("aria-label", T.card);
    if (ES) b.className = "notranslate";
    b.innerHTML = '<div class="scb"><div class="scb-top"><span class="scb-e" aria-hidden="true">🏈</span><div class="scb-tx"><small>' + esc(T.k) + '</small><b>' + esc(T.head.replace(/^🏈\s*/, "")) + '</b>' +
      '<span>' + esc(T.body) + '<u>' + esc(OTXT) + '</u>. ' + esc(T.ends) + '</span></div></div>' +
      '<div class="scb-act"><span class="scb-cd" aria-live="off">' + esc(T.left) + ' <b data-sc="cd">' + hms(END - Date.now()) + '</b></span><button type="button" class="scb-go" data-sc="go">' + esc(actLabel()) + '</button><button type="button" class="scb-x" data-sc="x" aria-label="Hide this banner for today">' + esc(T.hide) + '</button></div>' +
      (TEST ? '<span class="scb-test">' + esc(T.test) + '</span>' : '') + '</div>';
    b.addEventListener("click", function (ev) {
      if (ev.target.closest("[data-sc=go]")) use();
      if (ev.target.closest("[data-sc=x]")) { ls("ssai_score_hide_" + SLUG, TODAY); b.remove(); banner = null; }
    });
    document.body.insertBefore(b, document.body.firstChild); banner = b;
  }

  var cardEl = null;
  function cardHTML() {
    var done = usedToday();
    return '<small>' + esc(T.k) + '</small><h4>🏈 ' + esc(T.card) + '</h4><p>' + esc(T.cardSub) + '</p><div class="of">' + esc(OTXT) + '</div>' +
      '<div class="meta"><span class="cd">⏱️ ' + esc(T.left) + ' <b data-sc="cd">' + hms(END - Date.now()) + '</b></span>' + (S.line ? '<span>🏟️ ' + esc(T.score) + ': ' + esc(S.line) + '</span>' : '') + '</div>' +
      (done ? '<div class="done">' + esc(T.used) + '</div>' : '<button type="button" data-sc="go">' + esc(actLabel()) + '</button>') +
      '<p class="fine">' + esc(T.fine) + (OFFER.key === "drink" ? ' ' + esc(T.drink) : '') + '</p>' + (TEST ? '<p class="fine">' + esc(T.test) + '</p>' : '');
  }
  function drawCard() {
    if (!cardEl) {
      cardEl = document.createElement("div"); cardEl.className = "scc" + (ES ? " notranslate" : ""); cardEl.id = "sp-score";
      cardEl.addEventListener("click", function (ev) { if (ev.target.closest("[data-sc=go]")) use(); });
    }
    cardEl.innerHTML = cardHTML();
    var sp = document.getElementById("ssai-specials");
    if (sp) { var h = sp.querySelector("h3"); if (h && /coming up/i.test(h.textContent)) h.textContent = ES ? "Hoy en " + SHORT : "On now at " + NAME; if (cardEl.parentNode !== sp) sp.insertBefore(cardEl, h ? h.nextSibling : sp.firstChild); return; }
    // no Specials section on this page: our own, before the menu (same spot specials.js uses)
    if (cardEl.parentNode) return;
    var w = document.createElement("section"); w.className = "scc-wrap"; w.id = "ssai-score-wrap"; w.setAttribute("aria-label", T.card); w.appendChild(cardEl);
    var at = null, sels = C.before ? [C.before] : ["#chips", "#menu", "#menuhost"];
    for (var i = 0; i < sels.length && !at; i++) at = document.querySelector(sels[i]);
    if (at && at.parentNode) at.parentNode.insertBefore(w, at); else document.body.appendChild(w);
  }
  function refresh() { if (S.active) { if (banner) { var g = banner.querySelector("[data-sc=go]"); if (g) g.textContent = actLabel(); } drawCard(); } }

  function tickCD() {
    var left = END - Date.now();
    if (left <= 0) { clearInterval(cdTimer); if (banner) banner.remove(); if (cardEl && cardEl.parentNode) cardEl.parentNode.removeChild(cardEl); S.active = false; return; }
    document.querySelectorAll("[data-sc=cd]").forEach(function (n) { n.textContent = hms(left); });
  }

  // one-time pop per phone per day
  function pop() {
    var k = "ssai_score_pop_" + SLUG;
    if (ls(k) === TODAY && !(TEST && Q.get("pop") === "1")) return;
    ls(k, TODAY);
    var msg = document.createElement("div"); msg.className = "scp-msg" + (ES ? " notranslate" : ""); msg.setAttribute("role", "status");
    msg.innerHTML = esc(T.head) + '<small>' + esc(OTXT) + '</small>';
    document.body.appendChild(msg); setTimeout(function () { msg.remove(); }, reduce ? 3200 : 2700);
    if (reduce) return;   // no flying confetti for reduced motion
    var cv = document.createElement("canvas"), g = cv.getContext && cv.getContext("2d"); if (!g) return;
    cv.className = "scp"; cv.setAttribute("aria-hidden", "true"); document.body.appendChild(cv);
    var W = cv.width = innerWidth * (devicePixelRatio || 1), H = cv.height = innerHeight * (devicePixelRatio || 1), D = devicePixelRatio || 1;
    var cols = ["#f0d375", "#ffffff", "#77242e", "#3DDC97", "#ffb347"], P = [];
    for (var i = 0; i < 140; i++) P.push({ x: W / 2 + (Math.random() - .5) * W * .2, y: H * .62, vx: (Math.random() - .5) * 16 * D, vy: -(8 + Math.random() * 14) * D, r: Math.random() * 6.28, vr: (Math.random() - .5) * .4, s: (5 + Math.random() * 6) * D, c: cols[i % cols.length], ball: i % 9 === 0 });
    var t0 = performance.now();
    (function f(now) {
      var el = now - t0; g.clearRect(0, 0, W, H);
      P.forEach(function (p) {
        p.vy += .38 * D; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.globalAlpha = Math.max(0, 1 - el / 2600);
        if (p.ball) { g.font = (p.s * 3) + "px system-ui"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("🏈", 0, 0); }
        else { g.fillStyle = p.c; g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); }
        g.restore();
      });
      if (el < 2600) requestAnimationFrame(f); else cv.remove();
    })(t0);
  }

  // ---- redeem ----
  function use() {
    var CRM = window.SSAI_CRM, IR = window.SSAI_INTERIM;
    if (!CRM) { var c = document.getElementById("sp-score"); if (c) c.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    var m = CRM.member();
    if (!m) { CRM.join(function () { refresh(); setTimeout(use, 300); }, { title: T.jt, sub: T.js, btn: T.jb }); return; }
    if (usedToday()) { CRM.toast(T.used); refresh(); return; }
    if (!IR || !IR.specialPass) { CRM.toast(OFFER.en + " · show this screen to your server"); return; }
    IR.specialPass({ reward: (TEST ? "TEST · " : "") + LABEL + " Score Special: " + OFFER.en, button: BUTTON, kind: "score", whole: OFFER.whole, test: TEST,
      fine: "Today only, members only, one per day. Counts as today's one reward, so it can't be combined with another reward on the same check." + (OFFER.key === "drink" ? " Non-alcoholic drinks only." : "") },
      function () { ls(memberUsedKey(CRM.member()), TODAY); refresh(); });
  }

  function show() {
    if (!document.getElementById("ssai-score-css")) { var st = document.createElement("style"); st.id = "ssai-score-css"; st.textContent = css; document.head.appendChild(st); }
    END = endOfDay(); if (END <= Date.now()) return;
    drawBanner(); drawCard(); pop();
    clearInterval(cdTimer); cdTimer = setInterval(tickCD, 1000);
  }

  window.SSAI_SCORE = {
    cfg: C, test: TEST, active: function () { return !!S.active; }, offer: function () { return OFFER; }, open: use,
    toast: function () { return { reward: LABEL + " Score Special: " + OFFER.en + " (same day, after a score)", button: BUTTON, how: OFFER.type + " · " + OFFER.applies }; }
  };

  function boot() {
    if (S.active) show(); else check();
    document.addEventListener("ssai-specials", function () { if (S.active) { cardEl && cardEl.parentNode && cardEl.parentNode.removeChild(cardEl); drawCard(); } });
    // a member who joins / signs in elsewhere on the page: relabel the buttons
    var who = memberId();
    function changed() { var w = memberId(); if (w !== who) { who = w; refresh(); } }
    window.addEventListener("storage", changed); document.addEventListener("click", function () { setTimeout(changed, 800); }, true);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
