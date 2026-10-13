/* Staff guide "Explain it to me": a coworker talks you through each step.
   - Floating 🎧 button opens a topic list; each tutorial heading also gets a small ▶.
   - Plays a pre-recorded natural voice clip (voice/<lang>-<id>.mp3, lazy-loaded, only once you tap).
     Clips are listed in window.STAFF_VOICE_CLIPS (lines.js) so we never request a file that isn't there.
   - If a clip is missing or fails to load, the phone's own voice reads the same words (best voice it has).
   - Play/pause, a progress bar you can tap to jump, and captions of the words while it plays.
   - The page re-renders on EN/ES or restaurant change; call StaffVoice.decorate(lang) after each render.
   No customer data is involved. Words: voice/lines.js. */
(function () {
  "use strict";
  var LINES = window.STAFF_VOICE || { en: {}, es: {} }, CLIPS = window.STAFF_VOICE_CLIPS || {};
  var BASE = (function () { var s = document.currentScript && document.currentScript.src; return s ? s.replace(/[^/]*$/, "") : "voice/"; })();
  var V = "?v=1";
  var TOPICS = [
    ["start", "", { en: "Start here: how it works + where the rewards are", es: "Empieza aquí: cómo funciona y dónde están las recompensas" }],
    ["join", "t-join", { en: "Help a guest join", es: "Ayudar a un cliente a unirse" }],
    ["redeem", "t-redeem", { en: "Use a reward", es: "Usar una recompensa" }],
    ["pass", "t-pass", { en: "Check a live pass", es: "Revisar un pase en vivo" }],
    ["toast", "t-toast", { en: "Ring it in Toast", es: "Marcarlo en Toast" }],
    ["visit", "t-visit", { en: "Receipt points (Add my visit)", es: "Puntos con el recibo (Add my visit)" }],
    ["problems", "t-problems", { en: "Common problems", es: "Problemas comunes" }],
    ["early", "t-early", { en: "Early-bird gift", es: "Regalo early bird" }],
    ["nearby", "t-nearby", { en: "Nearby alerts + location bonus", es: "Alertas cercanas + bono de ubicación" }],
    ["oneprize", "t-oneprize", { en: "One code per visit, one prize per day", es: "Un código por visita, un premio al día" }],
    ["card", "t-card", { en: "Look up a rewards card + Sign back in", es: "Buscar una tarjeta + Sign back in" }],
    ["say", "say", { en: "What to say to guests", es: "Qué decirle a los clientes" }]
  ];
  var T = {
    fab: { en: "🎧 Explain it to me", es: "🎧 Explícamelo" },
    pick: { en: "What do you need help with?", es: "¿Con qué necesitas ayuda?" },
    sub: { en: "Tap one and I'll walk you through it.", es: "Toca uno y te lo explico." },
    play: { en: "Play", es: "Reproducir" }, pause: { en: "Pause", es: "Pausa" }, close: { en: "Close", es: "Cerrar" },
    listen: { en: "Listen to this step", es: "Escuchar este paso" }, seek: { en: "Progress", es: "Progreso" },
    phone: { en: "Phone voice (recording not available)", es: "Voz del teléfono (grabación no disponible)" }
  };
  var lang = "en", cur = null, audio = null, tts = false, ttsQ = [], ttsI = 0, ttsSeq = 0, ttsPaused = false, sents = [], cum = [];
  var el = {};
  function L(x) { return x[lang] || x.en; }
  function topic(id) { for (var i = 0; i < TOPICS.length; i++) if (TOPICS[i][0] === id) return TOPICS[i]; return null; }
  function text(id, l) { return ((LINES[l || lang] || {})[id]) || ((LINES.en || {})[id]) || ""; }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]; }); }
  function split(t) { return (t.match(/[^.!?¿¡]+[.!?]+["”]?\s*|[¿¡][^.!?]*[.!?]*\s*|[^.!?]+$/g) || [t]).map(function (s) { return s.trim(); }).filter(Boolean); }

  function css() {
    if (document.getElementById("sv-css")) return;
    var s = document.createElement("style"); s.id = "sv-css";
    s.textContent =
      ".sv-fab{position:fixed;right:max(16px,env(safe-area-inset-right));bottom:calc(16px + env(safe-area-inset-bottom));z-index:40;border:0;border-radius:999px;padding:13px 18px;font:800 16px -apple-system,system-ui,sans-serif;background:var(--gold,#f5c400);color:#1a1400;box-shadow:0 8px 24px #0009;cursor:pointer}" +
      ".sv-fab[hidden]{display:none}" +
      ".sv-sheet{position:fixed;inset:auto 0 0 0;z-index:45;max-height:78vh;overflow:auto;background:#0f1830;border-top:1px solid var(--edge,#24345c);border-radius:20px 20px 0 0;padding:16px 16px calc(16px + env(safe-area-inset-bottom));box-shadow:0 -12px 40px #000a}" +
      ".sv-sheet h3{margin:0 0 2px;font-size:18px}.sv-sheet p{margin:0 0 10px;color:var(--dim,#a9b6d6);font-size:14px}" +
      ".sv-sheet .sv-t{display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:#ffffff0d;border:1px solid var(--edge,#24345c);color:var(--ink,#f3f6ff);border-radius:12px;padding:12px;margin:6px 0;font:600 15px -apple-system,system-ui,sans-serif;cursor:pointer}" +
      ".sv-sheet .sv-t b{display:grid;place-items:center;flex:none;width:30px;height:30px;border-radius:15px;background:var(--gold,#f5c400);color:#1a1400;font-size:13px}" +
      ".sv-x{position:absolute;right:12px;top:10px;background:none;border:0;color:var(--ink,#f3f6ff);font-size:24px;line-height:1;cursor:pointer;padding:6px}" +
      ".sv-scrim{position:fixed;inset:0;z-index:44;background:#0008}" +
      ".sv-bar{position:fixed;left:0;right:0;bottom:0;z-index:46;background:#0b1428f7;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border-top:2px solid var(--gold,#f5c400);padding:10px 16px calc(10px + env(safe-area-inset-bottom))}" +
      ".sv-row{display:flex;align-items:center;gap:10px;max-width:720px;margin:0 auto}" +
      ".sv-pp{flex:none;width:46px;height:46px;border-radius:23px;border:0;background:var(--gold,#f5c400);color:#1a1400;font-size:20px;cursor:pointer}" +
      ".sv-mid{flex:1;min-width:0}.sv-ttl{font-weight:800;font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
      ".sv-prog{position:relative;height:16px;margin-top:4px;cursor:pointer;touch-action:none}.sv-prog:before{content:'';position:absolute;left:0;right:0;top:6px;height:4px;border-radius:2px;background:#ffffff26}" +
      ".sv-fill{position:absolute;left:0;top:6px;height:4px;border-radius:2px;background:var(--gold,#f5c400);width:0}" +
      ".sv-time{font:600 12px ui-monospace,Menlo,monospace;color:var(--dim,#a9b6d6);flex:none}" +
      ".sv-close{flex:none;background:none;border:1px solid var(--edge,#24345c);color:var(--ink,#f3f6ff);border-radius:12px;width:40px;height:40px;font-size:18px;cursor:pointer}" +
      ".sv-cap{max-width:720px;margin:8px auto 0;font-size:15.5px;line-height:1.45;max-height:4.4em;overflow:hidden;color:var(--dim,#a9b6d6)}.sv-cap .on{color:var(--ink,#fff);background:#f5c40026;border-radius:4px}" +
      ".sv-note{max-width:720px;margin:4px auto 0;font-size:11.5px;color:var(--dim,#a9b6d6)}" +
      ".sv-mini{display:inline-grid;place-items:center;width:34px;height:34px;margin-left:8px;border-radius:17px;border:1px solid var(--gold,#f5c400);background:#f5c4001a;color:var(--gold,#f5c400);font-size:14px;vertical-align:middle;cursor:pointer}" +
      ".sv-mini[aria-pressed=true]{background:var(--gold,#f5c400);color:#1a1400}" +
      "body.sv-open main{padding-bottom:200px}";
    document.head.appendChild(s);
  }

  function build() {
    if (el.fab) return;
    css();
    el.fab = document.createElement("button"); el.fab.type = "button"; el.fab.className = "sv-fab"; el.fab.id = "svFab";
    el.fab.addEventListener("click", openSheet);
    el.bar = document.createElement("div"); el.bar.className = "sv-bar"; el.bar.hidden = true; el.bar.setAttribute("role", "region");
    el.bar.innerHTML = "<div class='sv-row'><button type='button' class='sv-pp' id='svPP'>▶</button><div class='sv-mid'><div class='sv-ttl' id='svTtl'></div>" +
      "<div class='sv-prog' id='svProg' role='slider' aria-valuemin='0' aria-valuemax='100' aria-valuenow='0' tabindex='0'><div class='sv-fill' id='svFill'></div></div></div>" +
      "<span class='sv-time' id='svTime'>0:00</span><button type='button' class='sv-close' id='svClose'>✕</button></div><div class='sv-cap' id='svCap' aria-live='off'></div><div class='sv-note' id='svNote' hidden></div>";
    document.body.appendChild(el.fab); document.body.appendChild(el.bar);
    el.pp = el.bar.querySelector("#svPP"); el.ttl = el.bar.querySelector("#svTtl"); el.prog = el.bar.querySelector("#svProg");
    el.fill = el.bar.querySelector("#svFill"); el.time = el.bar.querySelector("#svTime"); el.cap = el.bar.querySelector("#svCap"); el.note = el.bar.querySelector("#svNote");
    el.pp.addEventListener("click", toggle);
    el.bar.querySelector("#svClose").addEventListener("click", stop);
    el.prog.addEventListener("click", function (e) { var r = el.prog.getBoundingClientRect(); seek((e.clientX - r.left) / r.width); });
    el.prog.addEventListener("keydown", function (e) { if (e.key === "ArrowRight") seek(frac() + 0.1); else if (e.key === "ArrowLeft") seek(frac() - 0.1); });
    document.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest("[data-sv]"); if (b) { e.preventDefault(); var id = b.getAttribute("data-sv"); if (cur === id && playing()) pause(); else if (cur === id && el.bar && !el.bar.hidden) resume(); else play(id); } });
    window.addEventListener("pagehide", stop);
  }

  function openSheet() {
    closeSheet();
    el.scrim = document.createElement("div"); el.scrim.className = "sv-scrim"; el.scrim.addEventListener("click", closeSheet);
    el.sheet = document.createElement("div"); el.sheet.className = "sv-sheet"; el.sheet.setAttribute("role", "dialog"); el.sheet.setAttribute("aria-label", L(T.pick));
    el.sheet.innerHTML = "<button type='button' class='sv-x' aria-label='" + esc(L(T.close)) + "'>✕</button><h3>" + esc(L(T.pick)) + "</h3><p>" + esc(L(T.sub)) + "</p>" +
      TOPICS.filter(available).map(function (t) { var k = TOPICS.indexOf(t); return "<button type='button' class='sv-t' data-svt='" + t[0] + "'><b>" + (t[0] === "start" ? "▶" : t[0] === "say" ? "💬" : k) + "</b><span>" + esc(L(t[2])) + "</span></button>"; }).join("");
    el.sheet.querySelector(".sv-x").addEventListener("click", closeSheet);
    el.sheet.addEventListener("click", function (e) { var b = e.target.closest("[data-svt]"); if (!b) return; var id = b.getAttribute("data-svt"); closeSheet(); go(id); play(id); });
    document.body.appendChild(el.scrim); document.body.appendChild(el.sheet);
    var f = el.sheet.querySelector(".sv-t"); if (f) f.focus();
  }
  function closeSheet() { if (el.sheet) { el.sheet.remove(); el.scrim.remove(); el.sheet = el.scrim = null; } }
  function available(t) { return !t[1] || !!document.getElementById(t[1]); }
  function go(id) { var t = topic(id), n = t && t[1] && document.getElementById(t[1]); if (n) n.scrollIntoView({ behavior: "smooth", block: "start" }); }

  /* ---------- playback ---------- */
  function playing() { return tts ? (ttsQ.length && !ttsPaused) : !!(audio && !audio.paused && !audio.ended); }
  function frac() {
    if (tts) return ttsQ.length ? (cum[ttsI] || 0) : 0;
    return audio && audio.duration ? audio.currentTime / audio.duration : 0;
  }
  function play(id) {
    build(); stopSound();
    cur = id; var words = text(id);
    sents = split(words); var tot = 0, c = 0; cum = sents.map(function (s) { var a = c; c += s.length; return a; }); tot = c || 1; cum = cum.map(function (x) { return x / tot; });
    el.cap.innerHTML = sents.map(function (s, i) { return "<span data-i='" + i + "'>" + esc(s) + "</span>"; }).join(" ");
    el.ttl.textContent = L(topic(id)[2]); el.bar.hidden = false; document.body.classList.add("sv-open");
    el.note.hidden = true;
    var key = lang + "-" + id;
    if (CLIPS[key]) {
      tts = false;
      audio = new Audio(); audio.preload = "auto";
      audio.addEventListener("timeupdate", tick); audio.addEventListener("play", ui); audio.addEventListener("pause", ui);
      audio.addEventListener("ended", function () { ui(); tick(); });
      audio.addEventListener("error", function () { if (cur === id && !tts) speak(words); });
      audio.src = BASE + key + ".mp3" + V;
      var p = audio.play(); if (p && p.catch) p.catch(function () { ui(); });
    } else speak(words);
    ui(); tick();
  }
  function stopSound() {
    if (audio) { try { audio.pause(); audio.removeAttribute("src"); audio.load(); } catch (e) {} audio = null; }
    if (tts) { ttsSeq++; try { speechSynthesis.cancel(); } catch (e) {} }
    tts = false; ttsQ = []; ttsI = 0; ttsPaused = false;
  }
  function stop() { stopSound(); cur = null; if (el.bar) el.bar.hidden = true; document.body.classList.remove("sv-open"); ui(); }
  function pause() { if (tts) { ttsPaused = true; ttsSeq++; try { speechSynthesis.cancel(); } catch (e) {} } else if (audio) audio.pause(); ui(); }
  function resume() {
    if (tts) { if (!ttsQ.length) return play(cur); if (ttsI >= ttsQ.length) ttsI = 0; ttsPaused = false; ttsSeq++; next(ttsSeq); }
    else if (audio) { if (audio.ended) audio.currentTime = 0; var p = audio.play(); if (p && p.catch) p.catch(function () {}); }
    else if (cur) play(cur);
    ui();
  }
  function toggle() { if (playing()) pause(); else resume(); }
  function seek(f) {
    f = Math.max(0, Math.min(0.999, f));
    if (tts) { var i = 0; while (i + 1 < cum.length && cum[i + 1] <= f) i++; ttsI = i; ttsPaused = false; ttsSeq++; try { speechSynthesis.cancel(); } catch (e) {} next(ttsSeq); }
    else if (audio && audio.duration) audio.currentTime = f * audio.duration;
    tick(); ui();
  }
  function mmss(s) { s = Math.max(0, Math.round(s || 0)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }
  function tick() {
    if (!el.bar) return;
    var f = frac(); if (tts && ttsQ.length && ttsI >= ttsQ.length) f = 1;
    el.fill.style.width = (f * 100).toFixed(1) + "%"; el.prog.setAttribute("aria-valuenow", Math.round(f * 100));
    el.time.textContent = tts ? (Math.min(ttsI + 1, ttsQ.length) + "/" + ttsQ.length) : mmss(audio ? (audio.duration && !isFinite(audio.duration) ? audio.currentTime : (audio.duration ? audio.duration - audio.currentTime : 0)) : 0);
    var on = 0; for (var i = 0; i < cum.length; i++) if (cum[i] <= f + 0.0001) on = i;
    if (tts) on = Math.min(ttsI, sents.length - 1);
    var spans = el.cap.querySelectorAll("span"), hit = null;
    for (var k = 0; k < spans.length; k++) { var y = k === on; spans[k].className = y ? "on" : ""; if (y) hit = spans[k]; }
    if (hit) el.cap.scrollTop = Math.max(0, hit.offsetTop - el.cap.offsetTop - 2);
  }

  /* ---------- phone voice fallback ---------- */
  function voice(l) {
    var all = []; try { all = speechSynthesis.getVoices() || []; } catch (e) {}
    var pre = l === "es" ? /^es[-_](US|MX|419)/i : /^en[-_]US/i, any = l === "es" ? /^es/i : /^en/i;
    var list = all.filter(function (v) { return pre.test(v.lang); }); if (!list.length) list = all.filter(function (v) { return any.test(v.lang); });
    var good = /premium|enhanced|natural|neural|siri/i, named = l === "es" ? /paulina|m[oó]nica|marisol|google/i : /ava|samantha|allison|zoe|google us/i;
    return list.find(function (v) { return good.test(v.name); }) || list.find(function (v) { return named.test(v.name); }) || list.find(function (v) { return v.localService; }) || list[0] || null;
  }
  function speak(words) {
    if (audio) { try { audio.pause(); } catch (e) {} audio = null; }
    tts = true; ttsQ = sents.slice(); ttsI = 0; ttsPaused = false;
    if (!window.speechSynthesis || typeof SpeechSynthesisUtterance === "undefined") { ttsPaused = true; el.note.hidden = false; el.note.textContent = L(T.phone); ui(); return; }
    el.note.hidden = false; el.note.textContent = L(T.phone);
    try { speechSynthesis.cancel(); } catch (e) {}
    ttsSeq++; next(ttsSeq);
  }
  function next(my) {
    if (my !== ttsSeq || ttsPaused) return;
    if (ttsI >= ttsQ.length) { ttsPaused = true; ui(); tick(); return; }
    var u = new SpeechSynthesisUtterance(ttsQ[ttsI]), v = voice(lang);
    if (v) u.voice = v; u.lang = v ? v.lang : (lang === "es" ? "es-US" : "en-US"); u.rate = 1; u.pitch = 1;
    u.onend = function () { if (my !== ttsSeq) return; ttsI++; tick(); next(my); };
    u.onerror = function () { if (my !== ttsSeq) return; ttsI++; next(my); };
    tick();
    try { speechSynthesis.speak(u); } catch (e) { ttsPaused = true; ui(); }
  }

  /* ---------- buttons on the page ---------- */
  function ui() {
    if (!el.fab) return;
    var on = playing();
    el.fab.textContent = L(T.fab); el.fab.setAttribute("aria-haspopup", "dialog");
    if (el.pp) { el.pp.textContent = on ? "❚❚" : "▶"; el.pp.setAttribute("aria-label", L(on ? T.pause : T.play)); }
    el.bar.querySelector("#svClose").setAttribute("aria-label", L(T.close)); el.prog.setAttribute("aria-label", L(T.seek));
    var minis = document.querySelectorAll(".sv-mini");
    for (var i = 0; i < minis.length; i++) { var me = minis[i].getAttribute("data-sv") === cur && on; minis[i].textContent = me ? "❚❚" : "▶"; minis[i].setAttribute("aria-pressed", me ? "true" : "false"); }
  }
  function decorate(l) {
    build();
    var was = lang; lang = l === "es" ? "es" : "en";
    TOPICS.forEach(function (t) {
      var id = t[0], sec = t[1] ? document.getElementById(t[1]) : document.getElementById("deals");
      if (!sec) return;
      var h = sec.tagName === "H2" ? sec : sec.querySelector("h3,h2"); if (!h || h.querySelector(".sv-mini")) return;
      var b = document.createElement("button"); b.type = "button"; b.className = "sv-mini"; b.setAttribute("data-sv", id);
      b.setAttribute("aria-label", L(T.listen) + ": " + L(t[2])); b.title = L(T.listen); b.textContent = "▶";
      h.appendChild(b);
    });
    if (was !== lang && cur && el.bar && !el.bar.hidden) play(cur); /* EN/ES switched mid-play: same topic, new language */
    ui();
  }
  window.StaffVoice = { decorate: decorate, play: play, pause: pause, resume: resume, stop: stop, open: function () { build(); openSheet(); },
    get current() { return cur; }, get playing() { return playing(); }, get usingPhoneVoice() { return tts; } };
})();
