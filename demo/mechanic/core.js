/* SousShift AI — Mobile Mechanic demo: shared engine for the customer page (/demo/mechanic/) and the shop page (/shop/).
   Reads window.SHOP_CFG (config.js). Exposes window.MECH.
   DEMO MODE (same idea as demo/crm.js): every request lives ONLY in this browser's localStorage, next to a few
   clearly-labelled sample requests. Nothing is sent anywhere. MECH.api is a mock that resolves after a short delay and
   logs what a live backend would receive (window.MOCK_LOG). The shop page and the customer tracker stay in sync through
   the same localStorage key (the "storage" event fires in the other tab of the same browser).
   LIVE later: MECH.api → the business's own backend (Apps Script / Railway), texts via Twilio once A2P 10DLC is approved,
   email through the existing Apps Script mail pattern. */
(function () {
  "use strict";
  var C = window.SHOP_CFG, W = window, D = document;
  var KEY = "ssai:mech:v1:requests", LKEY = "ssai:mech:lang", PKEY = "ssai:mech:prefs";
  var RM = false; try { RM = W.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  /* ---------- storage ---------- */
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function all() { var a = lsGet(KEY, []); return Array.isArray(a) ? a : []; }
  function saveAll(a) { lsSet(KEY, a); fire(); }
  function get(id) { return all().filter(function (r) { return r.id === id; })[0] || null; }
  function put(r) { var a = all(), i = a.findIndex(function (x) { return x.id === r.id; }); if (i < 0) a.unshift(r); else a[i] = r; saveAll(a); return r; }
  function uid() { return "J" + Date.now().toString(36).slice(-5).toUpperCase() + Math.random().toString(36).slice(2, 4).toUpperCase(); }
  var subs = [];
  function onChange(fn) { subs.push(fn); }
  function fire() { subs.forEach(function (f) { try { f(); } catch (e) { console.error(e); } }); }
  W.addEventListener("storage", function (e) { if (e.key === KEY) fire(); });

  /* ---------- language (EN / ES), same data-t conventions as ice-cream/lang.js ---------- */
  var BASE = {
    en: { today: "Today", tomorrow: "Tomorrow", closed: "Closed", yourCar: "Your car", photoPh: "Mechanic photo goes here",
      sampleA: "Sample customer A", sampleB: "Sample customer B", sampleAP: "Grinding noise when braking, front end.",
      sampleBP: "A/C blows warm air.", sampleN0: "Got it. I'll come by this afternoon.", sampleN1: "Low on refrigerant. Checking for leaks." },
    es: { today: "Hoy", tomorrow: "Mañana", closed: "Cerrado", yourCar: "Tu carro", photoPh: "Aquí va la foto del mecánico",
      sampleA: "Cliente de muestra A", sampleB: "Cliente de muestra B", sampleAP: "Rechina al frenar, parte delantera.",
      sampleBP: "El A/C echa aire caliente.", sampleN0: "Listo. Paso esta tarde.", sampleN1: "Le falta gas. Revisando fugas." }
  };
  var PT = W.T || { en: {}, es: {} }, T = { en: Object.assign({}, BASE.en, PT.en), es: Object.assign({}, BASE.es, PT.es) }, lsubs = [];
  var q = (location.search.match(/[?&]lang=(en|es)\b/) || [])[1];
  var nav = (navigator.language || "en").slice(0, 2).toLowerCase();
  var lang = q || lsGet(LKEY, null) || (nav === "es" ? "es" : "en");
  function t(k, v) {
    var d = T[lang] || T.en, s = d[k] != null ? d[k] : (T.en[k] != null ? T.en[k] : k);
    if (v) s = s.replace(/\{(\w+)\}/g, function (m, n) { return v[n] != null ? v[n] : m; });
    return s;
  }
  function p(o) { return o == null ? "" : typeof o === "string" ? o : (o[lang] || o.en || ""); }
  function applyLang() {
    D.documentElement.lang = lang;
    D.querySelectorAll("[data-t]").forEach(function (el) { el.innerHTML = t(el.getAttribute("data-t")); });
    D.querySelectorAll("[data-t-ph]").forEach(function (el) { el.placeholder = t(el.getAttribute("data-t-ph")); });
    D.querySelectorAll("[data-t-aria]").forEach(function (el) { el.setAttribute("aria-label", t(el.getAttribute("data-t-aria"))); });
    D.querySelectorAll("[data-lang]").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-lang") === lang ? "true" : "false"); });
    D.querySelectorAll("[data-brand]").forEach(function (el) { var k = el.getAttribute("data-brand"); el.textContent = p(C.brand[k]); });
    if (T[lang] && T[lang]._title) D.title = t("_title", { name: C.brand.name });
    lsubs.forEach(function (fn) { try { fn(lang); } catch (e) { console.error(e); } });
  }
  function setLang(l) { if (l !== "en" && l !== "es") return; lang = l; lsSet(LKEY, l); applyLang(); }
  D.addEventListener("click", function (ev) {
    var b = ev.target.closest && ev.target.closest("[data-lang]");
    if (b) { ev.preventDefault(); setLang(b.getAttribute("data-lang")); }
  });
  W.__T = function (s) { return s; };

  /* ---------- theme from config ---------- */
  (function theme() {
    var c = C.colors, r = D.documentElement.style;
    Object.keys(c).forEach(function (k) { r.setProperty("--" + k, c[k]); });
    var m = D.querySelector('meta[name="theme-color"]'); if (m) m.content = c.bg;
    var a = D.querySelector('meta[name="apple-mobile-web-app-title"]'); if (a) a.content = C.brand.short;
  })();

  /* ---------- services + pricing ---------- */
  var SV = {}; C.services.forEach(function (s) { if (s.on !== false) SV[s.id] = s; });
  function svc(id) { return SV[id]; }
  function opt(sid, oid) { var s = SV[sid]; return s && s.options.filter(function (o) { return o.id === oid; })[0]; }
  function r5(n) { return Math.round(n / 5) * 5; }
  function price(it) {
    var o = opt(it.svc, it.opt); if (!o) return { lo: 0, hi: 0, hLo: 0, hHi: 0, pLo: 0, pHi: 0, lLo: 0, lHi: 0 };
    var lLo = o.hrs[0] * C.laborRate, lHi = o.hrs[1] * C.laborRate;
    var m = +it.mult > 0 ? +it.mult : 1, pLo = m === 1 ? o.parts[0] : r5(o.parts[0] * m), pHi = m === 1 ? o.parts[1] : r5(o.parts[1] * m);   // mult = parts price tier (config.partsTiers)
    return { pLo: pLo, pHi: pHi, lLo: r5(lLo), lHi: r5(lHi), lo: r5(pLo + lLo), hi: r5(pHi + lHi), hLo: o.hrs[0], hHi: o.hrs[1] };
  }
  function total(items) {
    var s = { lo: 0, hi: 0, hLo: 0, hHi: 0, pLo: 0, pHi: 0, lLo: 0, lHi: 0 };
    items.forEach(function (it) { var x = price(it); Object.keys(s).forEach(function (k) { s[k] += x[k]; }); });
    s.lo += C.tripFee; s.hi += C.tripFee; return s;
  }
  function money(n) { return C.currency + Math.round(n).toLocaleString("en-US"); }
  function range(a, b) { return a === b ? money(a) : money(a) + "–" + money(b); }
  function hrs(a, b) {
    function f(h) { if (h < 1) return Math.round(h * 60) + " min"; var v = Math.round(h * 4) / 4; return (v % 1 ? v.toFixed(2).replace(/0$/, "") : v) + " h"; }
    return a === b ? f(a) : (a < 1 && b < 1 ? Math.round(a * 60) + "–" + Math.round(b * 60) + " min" : f(a) + "–" + f(b));
  }
  var POS = { FL: { en: "front-left", es: "delantera izq." }, FR: { en: "front-right", es: "delantera der." }, RL: { en: "rear-left", es: "trasera izq." }, RR: { en: "rear-right", es: "trasera der." }, F: { en: "front axle", es: "eje delantero" }, R: { en: "rear axle", es: "eje trasero" } };
  function itemName(it) { var s = SV[it.svc], o = opt(it.svc, it.opt); if (!s || !o) return "?"; return p(s.name) + " · " + p(o.name) + (it.pos && POS[it.pos] ? " (" + p(POS[it.pos]) + ")" : ""); }

  /* ---------- hours + slots ---------- */
  function hm(s) { var a = s.split(":"); return +a[0] * 60 + +a[1]; }
  function dayKey(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function takenSet() {
    var set = {};
    all().forEach(function (r) { if (r.slot && r.status !== "declined") set[r.slot.start] = true; });
    return set;
  }
  function days() {
    var out = [], now = new Date(), taken = takenSet();
    for (var i = 0; i < C.bookAheadDays; i++) {
      var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i), h = C.hours[d.getDay()], slots = [];
      if (h) {
        for (var m = hm(h[0]); m + C.slotMinutes <= hm(h[1]); m += C.slotMinutes) {
          var s = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, m), e = new Date(s.getTime() + C.slotMinutes * 6e4);
          var past = s.getTime() < now.getTime() + 45 * 6e4;
          var busy = !past && (hash(dayKey(d) + ":" + m) % 10 < 3);   // sample "already booked" so the week looks real
          slots.push({ start: s.toISOString(), end: e.toISOString(), past: past, busy: busy || !!taken[s.toISOString()], mine: !!taken[s.toISOString()] && !busy });
        }
      }
      out.push({ date: d, key: dayKey(d), open: h, slots: slots });
    }
    return out;
  }
  function nextOpen() {
    var ds = days();
    for (var i = 0; i < ds.length; i++) for (var j = 0; j < ds[i].slots.length; j++) { var s = ds[i].slots[j]; if (!s.past && !s.busy) return s; }
    return null;
  }
  /* walk the shop's open hours from the slot start until the job's labor hours are used up */
  function readyBy(startIso, hours) {
    var t0 = new Date(startIso), left = Math.max(0.5, hours) * 60, d = new Date(t0), guard = 0;
    while (left > 0 && guard++ < 30) {
      var h = C.hours[d.getDay()];
      if (h) {
        var open = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, hm(h[0])), close = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, hm(h[1]));
        var from = d > open ? d : open;
        if (from < close) { var avail = (close - from) / 6e4; if (avail >= left) return new Date(from.getTime() + left * 6e4); left -= avail; }
      }
      d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    }
    return d;
  }
  var LOC = function () { return lang === "es" ? "es-MX" : "en-US"; };
  function fDay(d) { d = new Date(d); return d.toLocaleDateString(LOC(), { weekday: "short", month: "short", day: "numeric" }); }
  function fTime(d) { d = new Date(d); return d.toLocaleTimeString(LOC(), { hour: "numeric", minute: "2-digit" }); }
  function fWhen(d) {
    d = new Date(d); var now = new Date(), td = dayKey(now), tm = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
    var dk = dayKey(d), day = dk === td ? t("today") : dk === tm ? t("tomorrow") : d.toLocaleDateString(LOC(), { weekday: "short", month: "short", day: "numeric" });
    return day + " " + fTime(d);
  }
  function fSlot(s) { return fDay(s.start) + " · " + fTime(s.start) + "–" + fTime(s.end); }
  function hoursList() {
    var names = [0, 1, 2, 3, 4, 5, 6].map(function (i) { return new Date(2024, 0, 7 + i).toLocaleDateString(LOC(), { weekday: "short" }); });
    return [1, 2, 3, 4, 5, 6, 0].map(function (i) {
      var h = C.hours[i];
      return { day: names[i], txt: h ? fTime(new Date(2024, 0, 7, 0, hm(h[0]))) + " – " + fTime(new Date(2024, 0, 7, 0, hm(h[1]))) : t("closed"), today: i === new Date().getDay(), closed: !h };
    });
  }

  /* ---------- job stages ---------- */
  var STAGES = [
    { id: "received", icon: "📥", pct: 8, en: "Received", es: "Recibido" },
    { id: "diag", icon: "🩺", pct: 22, en: "Diagnosing", es: "Diagnosticando" },
    { id: "parts", icon: "📦", pct: 36, en: "Waiting on parts", es: "Esperando piezas" },
    { id: "work", icon: "🔧", pct: 52, en: "Being worked on", es: "En reparación" },
    { id: "half", icon: "🌓", pct: 66, en: "Halfway", es: "A la mitad" },
    { id: "almost", icon: "⏳", pct: 84, en: "Almost done", es: "Casi listo" },
    { id: "ready", icon: "🏁", pct: 100, en: "Ready for pickup", es: "Listo para recoger" }
  ];
  function stageName(i) { return STAGES[i] ? p(STAGES[i]) : ""; }
  function carName(c) { if (!c) return ""; return [c.year, c.make, c.model].filter(Boolean).join(" ") || t("yourCar"); }

  /* ---------- alerts (simulated; never sent) ---------- */
  function notify(r, title, body, kind) {
    var a = r.alerts || {}, ch = ["app"];
    if (kind === "almost" || kind === "ready" || kind === "manual") { if (a.text) ch.push("text"); if (a.email) ch.push("email"); }
    r.notifs = r.notifs || [];
    r.notifs.push({ at: new Date().toISOString(), title: title, body: body, ch: ch, kind: kind || "update" });
    MOCK("POST /notify (" + ch.join("+") + ") — NOT SENT in demo", { job: r.id, title: title, ch: ch });
    return ch;
  }

  /* ---------- mock backend ---------- */
  W.MOCK_LOG = W.MOCK_LOG || [];
  function MOCK(what, body) { W.MOCK_LOG.push({ at: new Date().toISOString(), what: what, body: body }); }
  var api = {
    send: function (path, body) {
      MOCK("POST " + path + " (mock, nothing leaves this phone)", body);
      return new Promise(function (res) { setTimeout(function () { res({ ok: true, mock: true }); }, RM ? 60 : 550); });
    }
  };

  /* ---------- sample requests (mechanic side; no real people) ---------- */
  function seedSamples() {
    var a = all(); if (a.some(function (r) { return r.sample; })) return;
    var now = Date.now(), ns = nextOpen(), h = 36e5;
    var s1 = { id: "S-1001", sample: true, createdAt: new Date(now - 3 * h).toISOString(), name: t("sampleA"),
      car: { year: "2014", make: "Toyota", model: "Camry", miles: "128,400" }, problem: t("sampleAP"),
      items: [{ svc: "brakes", opt: "padrot", pos: "F" }], status: "requested", stage: -1, history: [], notifs: [], alerts: { app: true, text: true } };
    var s2 = { id: "S-1002", sample: true, createdAt: new Date(now - 26 * h).toISOString(), name: t("sampleB"),
      car: { year: "2019", make: "Ford", model: "F-150", miles: "64,900" }, problem: t("sampleBP"),
      items: [{ svc: "ac", opt: "recharge" }, { svc: "ac", opt: "cabin" }], status: "accepted", stage: 3, quote: 165,
      history: [{ stage: 0, at: new Date(now - 25 * h).toISOString(), note: t("sampleN0") }, { stage: 1, at: new Date(now - 6 * h).toISOString(), note: t("sampleN1") }, { stage: 3, at: new Date(now - 1 * h).toISOString(), note: "" }],
      notifs: [], alerts: { app: true, email: true } };
    [s1, s2].forEach(function (r) {
      var e = total(r.items); r.est = e;
      if (ns) { r.slot = { start: ns.start, end: ns.end }; r.readyBy = readyBy(ns.start, e.hHi).toISOString(); }
    });
    s2.slot = null; s2.readyBy = new Date(now + 3 * h).toISOString();
    a.push(s1, s2); lsSet(KEY, a);
  }

  /* ---------- small helpers ---------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]; }); }
  var toastT;
  function toast(msg) {
    var el = D.getElementById("toast"); if (!el) return;
    el.innerHTML = msg; el.classList.add("show"); clearTimeout(toastT);
    toastT = setTimeout(function () { el.classList.remove("show"); }, 2600);
  }
  /* placeholder before/after art (SVG, no photos, no people) */
  function art(kind, after) {
    var A = C.colors.accent, B = C.colors.accent2;
    var bg = '<rect width="320" height="200" fill="#0b1324"/><g stroke="#ffffff10">' + Array.from({ length: 9 }, function (_, i) { return '<path d="M' + (i * 40) + ' 0V200"/>'; }).join("") + '</g>';
    var s = "";
    if (kind === "headlight") {
      s = '<path d="M30 150 Q40 60 170 52 L290 60 Q300 120 260 160 Z" fill="#1a2440" stroke="#2b3a63" stroke-width="4"/>' +
        '<path d="M70 132 Q80 82 170 76 L262 82 Q268 118 240 140 Z" fill="' + (after ? "url(#lensA)" : "url(#lensB)") + '" stroke="#ffffff30" stroke-width="3"/>' +
        '<circle cx="200" cy="108" r="22" fill="' + (after ? "#e8fbff" : "#c9a75a") + '" opacity="' + (after ? ".95" : ".55") + '"/>' +
        (after ? '<path d="M96 96 L150 90" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".7"/><g stroke="' + B + '" stroke-width="3" opacity=".8"><path d="M268 96 L312 84"/><path d="M268 108 L316 108"/><path d="M268 120 L312 132"/></g>' : '<g fill="#fff" opacity=".18"><circle cx="110" cy="110" r="14"/><circle cx="150" cy="96" r="18"/><circle cx="230" cy="128" r="12"/></g>');
    } else if (kind === "brakes") {
      s = '<circle cx="160" cy="100" r="78" fill="' + (after ? "#c7ced9" : "#7a5a3c") + '" stroke="#ffffff22" stroke-width="4"/>' +
        '<circle cx="160" cy="100" r="30" fill="#1a2440" stroke="#ffffff30" stroke-width="4"/>' +
        Array.from({ length: 5 }, function (_, i) { var a = i * 72 * Math.PI / 180; return '<circle cx="' + (160 + 16 * Math.cos(a)).toFixed(1) + '" cy="' + (100 + 16 * Math.sin(a)).toFixed(1) + '" r="4" fill="#0b1324"/>'; }).join("") +
        (after ? '<g stroke="#ffffff55" stroke-width="2" fill="none"><circle cx="160" cy="100" r="50"/><circle cx="160" cy="100" r="64"/></g>' : '<g stroke="#3d2a1a" stroke-width="3" fill="none"><circle cx="160" cy="100" r="46"/><circle cx="160" cy="100" r="55"/><circle cx="160" cy="100" r="68"/></g>') +
        '<rect x="214" y="48" width="44" height="104" rx="14" fill="' + A + '"/><rect x="222" y="62" width="10" height="76" rx="4" fill="#0b1324" opacity=".4"/>';
    } else if (kind === "tint") {
      s = '<path d="M40 160 L80 60 Q90 44 120 44 L260 44 Q285 44 290 70 L290 160 Z" fill="#1a2440" stroke="#2b3a63" stroke-width="4"/>' +
        '<path d="M70 150 L100 70 Q106 60 122 60 L262 60 Q274 60 276 74 L276 150 Z" fill="' + (after ? "#05080f" : "#7fb4e0") + '" opacity="' + (after ? ".92" : ".45") + '"/>' +
        (after ? '<path d="M110 76 L150 76 L120 140 L90 140 Z" fill="#ffffff12"/>' : '<g fill="#fff" opacity=".35"><circle cx="230" cy="90" r="24"/></g><path d="M230 60 L230 40 M262 70 L276 56 M198 70 L184 56" stroke="#ffd166" stroke-width="4" stroke-linecap="round"/>');
    } else {
      s = '<rect x="40" y="70" width="240" height="90" rx="22" fill="#1a2440" stroke="#2b3a63" stroke-width="4"/>' +
        '<rect x="70" y="30" width="80" height="70" rx="18" fill="' + (after ? "#24345c" : "#2a2a30") + '"/><rect x="170" y="30" width="80" height="70" rx="18" fill="' + (after ? "#24345c" : "#2a2a30") + '"/>' +
        (after ? '<g fill="' + B + '" opacity=".9"><path d="M100 50 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4z"/><path d="M220 120 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3z"/></g>' : '<g fill="#6b5a44" opacity=".8"><circle cx="90" cy="120" r="7"/><circle cx="130" cy="140" r="5"/><circle cx="200" cy="128" r="9"/><circle cx="240" cy="146" r="5"/><circle cx="110" cy="60" r="5"/><circle cx="215" cy="66" r="6"/></g>');
    }
    return '<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="lensB" x1="0" x2="1"><stop offset="0" stop-color="#b59654"/><stop offset="1" stop-color="#7c6a45"/></linearGradient><linearGradient id="lensA" x1="0" x2="1"><stop offset="0" stop-color="#bfefff"/><stop offset="1" stop-color="#5fb8de"/></linearGradient></defs>' + bg + s + "</svg>";
  }
  /* stage "photo" placeholder (mechanic would attach a real one) */
  function stageArt(i) {
    var ic = STAGES[i] ? STAGES[i].icon : "🔧";
    return '<div class="sart" aria-hidden="true"><span>' + ic + '</span><small>' + esc(t("photoPh")) + "</small></div>";
  }

  W.MECH = {
    C: C, RM: RM, t: t, p: p, lang: function () { return lang; }, setLang: setLang, applyLang: applyLang, onLang: function (f) { lsubs.push(f); },
    all: all, get: get, put: put, uid: uid, onChange: onChange, fire: fire, lsGet: lsGet, lsSet: lsSet, PKEY: PKEY, KEY: KEY,
    svc: svc, opt: opt, services: C.services.filter(function (s) { return s.on !== false; }), price: price, total: total, money: money, range: range, hrs: hrs, itemName: itemName, POS: POS,
    days: days, nextOpen: nextOpen, readyBy: readyBy, fDay: fDay, fTime: fTime, fWhen: fWhen, fSlot: fSlot, hoursList: hoursList,
    STAGES: STAGES, stageName: stageName, carName: carName, notify: notify, api: api, seedSamples: seedSamples,
    esc: esc, toast: toast, art: art, stageArt: stageArt
  };
})();
