/* faqbot.js - the "May I help you?" assistant at the bottom of every SousShift app (and the sales site).
   Answers on the phone, instantly, from the app's own faq.json (built from the app's real source by
   command-center/second-shift-ai/faqbot/build_kb.py and rebuilt whenever the app changes). No AI calls and no
   keys in the browser; nothing the guest types leaves the phone.
     <script src="../faqbot.js?v=f1" defer></script>                      (client app, reads ./faq.json)
     <script src="../demo/faqbot.js?v=f1" data-kb="../app/faq.json" data-mode="sales" defer></script>
   Hides itself while a game has the screen locked (gamelock.js), in fullscreen, or while the install sheet is up.
   Colors follow the app's own CSS variables. */
(function () {
  "use strict";
  if (window.__ssaiFaq) return; window.__ssaiFaq = 1;
  var me = document.currentScript || {};
  var ds = me.dataset || {};
  var KB_URL = ds.kb || "faq.json", MODE = ds.mode || "app";
  var T = function (s) { try { return window.__T ? window.__T(s) : s; } catch (e) { return s; } };
  var css = getComputedStyle(document.documentElement);
  var v = function (names, d) { for (var i = 0; i < names.length; i++) { var x = css.getPropertyValue(names[i]).trim(); if (x) return x; } return d; };
  var ACC = ds.accent || v(["--gold", "--sun2", "--bolt", "--accent", "--cyan", "--brand"], "#f5b324");
  var PANEL = ds.panel || v(["--panel", "--card", "--sky2", "--panel2"], "#141a2b");
  var INK = ds.ink || v(["--ink"], "#f4f6ff");
  var DIM = v(["--dim"], "#9aa3b5");
  var FONT = v(["--body"], "system-ui,-apple-system,sans-serif");
  var light = /^#(f|e)/i.test(PANEL);

  var st = document.createElement("style");
  st.textContent =
    ".fq-pill{position:fixed;right:calc(12px + env(safe-area-inset-right));bottom:calc(14px + env(safe-area-inset-bottom));z-index:2147482990;display:inline-flex;align-items:center;gap:8px;padding:11px 16px;border-radius:999px;border:1px solid " + ACC + ";background:" + PANEL + ";color:" + INK + ";font:700 14px/1 " + FONT + ";box-shadow:0 8px 24px rgba(0,0,0,.35),0 0 0 3px rgba(0,0,0,.08);cursor:pointer;-webkit-tap-highlight-color:transparent;transition:transform .2s,opacity .2s}" +
    ".fq-pill:active{transform:scale(.96)}.fq-pill i{font-style:normal;font-size:17px}.fq-pill.fq-hide{opacity:0;pointer-events:none;transform:translateY(20px)}" +
    ".fq-sheet{position:fixed;right:calc(10px + env(safe-area-inset-right));bottom:calc(10px + env(safe-area-inset-bottom));z-index:2147482995;width:min(380px,calc(100vw - 20px));max-height:min(74vh,620px);display:none;flex-direction:column;border-radius:20px;border:1px solid " + ACC + ";background:" + PANEL + ";color:" + INK + ";font:500 15px/1.4 " + FONT + ";box-shadow:0 18px 50px rgba(0,0,0,.5);overflow:hidden}" +
    ".fq-sheet.on{display:flex}.fq-hd{display:flex;align-items:center;gap:10px;padding:13px 14px;border-bottom:1px solid rgba(127,127,127,.25)}" +
    ".fq-hd b{flex:1;font-size:15px}.fq-hd small{display:block;font-weight:500;color:" + DIM + ";font-size:12px}.fq-x{border:0;background:none;color:" + INK + ";font-size:22px;cursor:pointer;padding:2px 6px}" +
    ".fq-av{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:" + ACC + ";color:#111;font-size:17px;flex:none}" +
    ".fq-body{flex:1;overflow:auto;padding:12px 14px;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}" +
    ".fq-m{margin:7px 0;padding:10px 12px;border-radius:14px;max-width:88%;background:" + (light ? "rgba(0,0,0,.05)" : "rgba(255,255,255,.07)") + ";white-space:pre-line}" +
    ".fq-m.me{margin-left:auto;background:" + ACC + ";color:#111;font-weight:600}" +
    ".fq-chips{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 4px}.fq-chips button{border:1px solid " + ACC + ";background:transparent;color:" + INK + ";border-radius:999px;padding:7px 11px;font:600 13px " + FONT + ";cursor:pointer;text-align:left}" +
    ".fq-act{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}.fq-act a{padding:8px 12px;border-radius:10px;background:" + ACC + ";color:#111;font-weight:700;text-decoration:none;font-size:13px}" +
    ".fq-in{display:flex;gap:8px;padding:10px 12px;border-top:1px solid rgba(127,127,127,.25)}.fq-in input{flex:1;min-width:0;padding:11px 12px;border-radius:12px;border:1px solid rgba(127,127,127,.35);background:" + (light ? "#fff" : "rgba(0,0,0,.25)") + ";color:" + INK + ";font:500 16px " + FONT + "}" +
    ".fq-in button{border:0;border-radius:12px;padding:0 14px;background:" + ACC + ";color:#111;font:800 14px " + FONT + ";cursor:pointer}";
  document.head.appendChild(st);

  var KB = null, loading = null;
  function load() {
    if (loading) return loading;
    loading = fetch(KB_URL, { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (j) { KB = j; index(); return j; })
      .catch(function () { KB = { qa: [], suggested: [] }; });
    return loading;
  }
  // ---------- matching ----------
  var SYN = [
    ["point", "points", "pts", "star", "stars"], ["reward", "rewards", "prize", "prizes", "free", "freebie", "perk"],
    ["hour", "hours", "open", "opens", "close", "closes", "closing", "time", "times", "when"],
    ["ratio", "per", "rate", "much"], ["redeem", "use", "claim", "cash"], ["join", "signup", "sign", "register", "account", "member", "membership"],
    ["game", "games", "play", "playing", "level", "score", "scores"], ["leaderboard", "champion", "weekly", "winner", "top", "rank", "contest"],
    ["birthday", "bday"], ["refer", "referral", "friend", "friends", "invite", "share"], ["order", "ordering", "food", "pay", "checkout"],
    ["menu", "dish", "dishes", "eat", "drinks", "drink"], ["price", "prices", "cost", "costs", "much", "dollar", "dollars", "plan", "plans", "pricing"],
    ["address", "location", "where", "located", "parking", "directions"], ["phone", "call", "number", "contact", "text", "email"],
    ["qr", "scan", "code", "table"], ["language", "spanish", "espanol", "thai", "translate"], ["trivia", "quiz", "question", "questions"],
    ["wave", "waves", "surf", "duck", "dive", "under"], ["deal", "deals", "discount", "special", "specials", "happy"],
    ["ai", "agent", "bot", "receptionist", "assistant", "voice", "phone"], ["setup", "start", "onboard", "onboarding", "launch", "timeline", "long"]
  ];
  var CANON = {};
  SYN.forEach(function (g) { g.forEach(function (w) { (CANON[w] = CANON[w] || []).push(g[0]); }); });
  var STOP = /^(a|an|the|is|are|do|does|did|i|you|your|my|me|we|to|of|in|on|for|and|or|it|can|how|what|whats|this|that|be|get|got|with|at|there|any|so|if|about|hey|hi|please|yo)$/;
  function stem(w) { return w.length > 4 ? w.replace(/(ings|ing|ies|es|s)$/, function (m) { return m === "ies" ? "y" : ""; }) : w; }
  var INTENT = [   // whole-question intents the word list alone misses
    [/(get|spend|use|buy|trade|redeem|cash)\b.{0,14}\bpoints?|points?\b.{0,10}\b(for|buy|get me)\b/, " reward rewards"],
    [/\b(what time|when).{0,12}\b(open|close)|\bhours?\b/, " hours open close"],
    [/\bhow (much|many).{0,10}(per|each|every) (dollar|\$1|visit)|\bratio\b/, " ratio per dollar"],
    [/\bwin\b|\bprize/, " prize leaderboard weekly"]
  ];
  function toks(s) {
    var out = [];
    s = String(s); var low = s.toLowerCase(); INTENT.forEach(function (r) { if (r[0].test(low)) s += r[1]; });
    String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9$ ]+/g, " ").split(/\s+/).forEach(function (w) {
      if (!w || STOP.test(w)) return; out.push(stem(w)); (CANON[w] || []).forEach(function (c) { out.push("~" + c); });
    });
    return out;
  }
  var IDX = [];
  function index() {
    IDX = (KB.qa || []).map(function (x) {
      var q = toks(x.q), t = toks((x.tags || []).join(" ")), a = toks(x.a);
      return { x: x, q: set(q), t: set(t), a: set(a), raw: set(raw(x.q)) };
    });
  }
  function raw(s) { return String(s).toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter(function (w) { return w.length > 1; }); }
  function set(a) { var o = {}; a.forEach(function (w) { o[w] = 1; }); return o; }
  function search(text) {
    var qt = toks(text); if (!qt.length) return [];
    var res = IDX.map(function (r) {
      var s = 0, hit = 0;
      qt.forEach(function (w) { var syn = w[0] === "~"; var k = (r.q[w] ? 3 : 0) + (r.t[w] ? 2.5 : 0) + (r.a[w] ? .6 : 0); if (k) hit++; s += syn ? k * .55 : k; });
      var rw = raw(text), same = 0; rw.forEach(function (w) { if (r.raw[w]) same++; });
      var phrase = rw.length ? same / Math.max(rw.length, Object.keys(r.raw).length) : 0;     // whole-question likeness
      var own = Object.keys(r.q).filter(function (w) { return w[0] !== "~"; }), mine = set(qt), cov = 0;
      own.forEach(function (w) { if (mine[w]) cov++; });
      var prec = own.length ? cov / own.length : 0;            // how much of the stored question the guest asked
      return { r: r, s: s * (0.5 + hit / qt.length) * (0.35 + prec) * (1 + phrase) };
    }).filter(function (x) { return x.s > 1.6; }).sort(function (a, b) { return b.s - a.s; });
    if (search.debug) return res.slice(0, 5).map(function (x) { return x.s.toFixed(2) + " " + x.r.x.q; });
    return res.map(function (x) { return x.r.x; });
  }
  // ---------- sales: budget + business type ----------
  function money(text) {
    var s = text.toLowerCase().replace(/,/g, "");
    var m = s.match(/\$\s?(\d+(?:\.\d+)?)\s?(k|grand)?/) || s.match(/(\d+(?:\.\d+)?)\s?(k|grand|dollars|bucks|usd)/) || (/(budget|only|have|got|afford|spend|max)/.test(s) && s.match(/\b(\d{2,6})\b/));
    if (!m) return null;
    var n = parseFloat(m[1]) * (m[2] === "k" || m[2] === "grand" ? 1000 : 1);
    return { n: n, monthly: /(a|per|each|every)\s?(month|mo)\b|\/\s?mo|monthly/.test(s) };
  }
  var usd = function (n) { return "$" + Number(n).toLocaleString(); };
  function budgetAnswer(b) {
    var P = (KB.plans || []).filter(function (p) { return p.setup != null; }).sort(function (a, c) { return a.setup - c.setup; });
    if (!P.length) return null;
    var key = b.monthly ? "monthly" : "setup";
    var fit = P.filter(function (p) { return (p[key] || 0) <= b.n; }).pop();
    var desc = function (p) { return p.name + " plan \u2014 " + usd(p.setup) + " setup + " + usd(p.monthly) + "/mo" + (p.includes && p.includes.length ? ":\n\u2022 " + p.includes.slice(0, 5).join("\n\u2022 ") : ""); };
    var flex = (KB.qa || []).filter(function (x) { return /flexible/i.test(x.q) && /down/i.test(x.a); })[0];
    if (fit) {
      var up = P[P.indexOf(fit) + 1];
      if (!b.monthly && flex && up) up.flex = flex.a;
      return "With " + usd(b.n) + (b.monthly ? " a month" : "") + ", the best fit is our " + desc(fit) +
        (up ? "\n\nWhen you're ready to grow, you can move up to " + up.name + " (" + usd(up.setup) + " + " + usd(up.monthly) + "/mo) anytime." : "") +
        (up && up.flex ? "\n\nWant a bigger plan now? Our flexible payment plan: " + up.flex : "") +
        ((KB.addons || []).length ? "\n\nOptional add-ons later: " + KB.addons.map(function (a) { return a.name + " " + usd(a.monthly) + "/mo"; }).join(", ") + "." : "");
    }
    return "Our starting plan is " + desc(P[0]) + "\n\nIf " + usd(b.n) + " is your budget right now, message us and we'll walk you through your options.";
  }
  function typeAnswer(text) {
    var s = " " + text.toLowerCase() + " ", best = null;
    (KB.types || []).forEach(function (t) { (t.keywords || [t.type]).forEach(function (k) { if (s.indexOf(String(k).toLowerCase()) >= 0 && (!best || k.length > best.k.length)) best = { t: t, k: k }; }); });
    return best && /(build|make|app|game|for my|i (own|have|run)|what would|do you|work for)/.test(s) ? best.t.a : (best && toks(text).length <= 3 ? best.t.a : null);
  }
  // ---------- UI ----------
  var pill = document.createElement("button");
  pill.type = "button"; pill.className = "fq-pill"; pill.setAttribute("aria-label", T("May I help you?"));
  pill.innerHTML = "<i>\ud83d\udcac</i><span>" + T("May I help you?") + "</span>";
  var sh = document.createElement("div"); sh.className = "fq-sheet"; sh.setAttribute("role", "dialog"); sh.setAttribute("data-scroll-ok", "");
  sh.innerHTML = "<div class='fq-hd'><span class='fq-av'>\ud83d\udcac</span><b><span class='fq-nm'></span><small>" + T("Answers right away") + "</small></b><button class='fq-x' aria-label='Close'>\u00d7</button></div>" +
    "<div class='fq-body' data-scroll-ok></div><form class='fq-in'><input placeholder='" + T("Ask me anything\u2026") + "' aria-label='Question' enterkeyhint='send'><button>" + T("Ask") + "</button></form>";
  var body = sh.querySelector(".fq-body"), inp = sh.querySelector("input");
  function add(html, me) { var m = document.createElement("div"); m.className = "fq-m" + (me ? " me" : ""); m[me ? "textContent" : "innerHTML"] = html; body.appendChild(m); body.scrollTop = 1e6; return m; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function chips(list) {
    if (!list || !list.length) return;
    var c = document.createElement("div"); c.className = "fq-chips";
    list.forEach(function (q) { var b = document.createElement("button"); b.type = "button"; b.textContent = q; b.onclick = function () { ask(q); }; c.appendChild(b); });
    body.appendChild(c); body.scrollTop = 1e6;
  }
  function contactHtml() {
    if (MODE === "sales") return "<div class='fq-act'><a href='mailto:secondshiftai@gmail.com'>\u2709\ufe0f Email us</a><a href='https://instagram.com/second.shiftai' target='_blank' rel='noopener'>\ud83d\udcf8 DM @second.shiftai</a></div>";
    var a = document.querySelector("a[href^='tel:']");
    var tel = String((KB && KB.phone) || (a ? a.getAttribute("href").slice(4) : "")).replace(/[^+\d]/g, "");
    return tel.length >= 10 ? "<div class='fq-act'><a href='tel:" + tel + "'>\ud83d\udcde " + T("Call") + "</a><a href='sms:" + tel + "'>\ud83d\udcac " + T("Text") + "</a></div>" : "";
  }
  function reply(q) {                           // -> {a, rel} or null; pure lookup on the phone
    var a = null, rel = [];
    if (MODE === "sales") {
      var b = money(q); if (b && /(only|have|got|budget|afford|spend|\$|grand|k\b|dollar|bucks)/i.test(q)) a = budgetAnswer(b);
      if (!a) a = typeAnswer(q);
    }
    var hits = search(q);
    if (!a && hits.length) { a = hits[0].a; rel = hits.slice(1, 3).map(function (x) { return x.q; }); }
    else if (a) rel = hits.slice(0, 2).map(function (x) { return x.q; });
    return a ? { a: a, rel: rel } : null;
  }
  function greet() {
    if (body.children.length) return;
    sh.querySelector(".fq-nm").textContent = (KB && KB.name) || document.title;
    add(esc(T("Hi! May I help you?")) + " " + esc(MODE === "sales" ? "Ask about plans, prices, what we'd build for your business, or how it all works." : T("Ask about points, rewards, the games, hours or the menu.")));
    chips((KB.suggested || []).slice(0, 6));
  }
  function ask(q) {
    q = String(q || "").trim(); if (!q) return;
    if (!body.children.length) return load().then(function () { greet(); ask(q); });
    add(q, true);
    load().then(function () {
      var r = reply(q);
      if (r) { add(esc(r.a)); chips(r.rel); }
      else { add(esc(T("I don't have that one yet.")) + " " + esc(MODE === "sales" ? "Send us a message and we'll answer right away." : T("Ask your server or reach out here:")) + contactHtml()); chips((KB.suggested || []).slice(0, 3)); }
    });
  }
  function open() {
    sh.classList.add("on"); pill.classList.add("fq-hide");
    load().then(greet);
    setTimeout(function () { if (matchMedia("(pointer:fine)").matches) inp.focus(); }, 50);
  }
  function close() { sh.classList.remove("on"); pill.classList.remove("fq-hide"); }
  pill.onclick = open; sh.querySelector(".fq-x").onclick = close;
  sh.querySelector("form").onsubmit = function (e) { e.preventDefault(); ask(inp.value); inp.value = ""; };
  // stay out of the way of games / fullscreen / install sheet
  function busy() {
    var h = document.documentElement;
    if (h.classList.contains("ssai-locked") || document.fullscreenElement || document.webkitFullscreenElement) return true;
    if (document.querySelector(".a2hs.on")) return true;
    if (document.querySelector(".ssai-lockpill.on:not(.free)")) return true;       // a game has the screen locked
    return false;
  }
  setInterval(function () { if (!sh.classList.contains("on")) pill.classList.toggle("fq-hide", busy()); }, 700);
  function mount() { document.body.appendChild(pill); document.body.appendChild(sh); if (window.requestIdleCallback) requestIdleCallback(load, { timeout: 3000 }); else setTimeout(load, 1500); }
  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount);
  window.ssaiFaq = { open: open, ask: function (q) { open(); ask(q); }, top: function (q) { return load().then(function () { search.debug = 1; var r = search(q); search.debug = 0; return r; }); }, reply: function (q) { return load().then(function () { return reply(q); }); } };
})();
