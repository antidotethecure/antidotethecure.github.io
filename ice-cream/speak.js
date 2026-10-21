/* SousShift AI — Ice Cream Trucks: read-aloud ("it talks to them"). Shared by the tour, details, demo and route pages.
   Uses the phone's built-in voice (window.speechSynthesis): no app, no internet, no cost.
   - Spanish voice (es-US, then es-MX, then any es-*) when ES is on; English (en-US) when EN is on.
   - Text is split into short pieces because iPhone Safari stops reading after a long chunk.
   - A small bar (Pause / Stop / speed) shows while it talks. Speed is remembered on this phone.
   - Safe where there are no voices (headless browsers, old phones): buttons just do nothing harmful.
   API: Speak.say(text, lang?) · Speak.stop() · Speak.pause() · Speak.speaking · Speak.supported
        Speak.on(fn(speaking)) · Speak.words(n, lang) · Speak.dollars(n, lang) */
(function () {
  "use strict";
  var TTS = window.speechSynthesis || null, RATE_KEY = "ssai:ice:ttsRate";
  var queue = [], speaking = false, subs = [], curLang = "en", bar = null, seq = 0;
  var rate = 1; try { rate = +(localStorage.getItem(RATE_KEY) || 1) || 1; } catch (e) {}

  function lang() { return (window.ICE && window.ICE.lang) || curLang; }
  function voices() { try { return TTS ? TTS.getVoices() || [] : []; } catch (e) { return []; } }
  function bestVoice(l) {
    var all = voices();
    if (l === "es") {
      var es = all.filter(function (v) { return /^es([-_]|$)/i.test(v.lang); });
      var pick = function (list) {
        return list.find(function (v) { return /premium|enhanced|natural/i.test(v.name); }) ||
          list.find(function (v) { return /paulina|m[oó]nica|juan|google/i.test(v.name); }) || list.find(function (v) { return v.localService; }) || list[0];
      };
      return pick(es.filter(function (v) { return /^es[-_]US/i.test(v.lang); })) || pick(es.filter(function (v) { return /^es[-_]MX/i.test(v.lang); })) || pick(es) || null;
    }
    var en = all.filter(function (v) { return /^en[-_]US/i.test(v.lang); });
    return en.find(function (v) { return /premium|enhanced|natural/i.test(v.name); }) ||
      en.find(function (v) { return /samantha|ava|allison|google us/i.test(v.name); }) || en.find(function (v) { return v.localService; }) || en[0] || null;
  }
  function chunks(t) {
    t = String(t || "").replace(/<[^>]+>/g, " ").replace(/[🔊↺⏩→←▶■✕↶🍦🏠🏢📍💳🔔🪙💵🌶️🎶📲🔲🚚✉️💬⌨️💾🔗]/gu, " ").replace(/\s+/g, " ").trim();
    var out = [];
    (t.match(/[^.!?¿¡]+[.!?]*\s*|[¿¡][^.!?]*[.!?]*\s*/g) || [t]).forEach(function (p) {
      while (p.length > 200) {
        var k = p.lastIndexOf(",", 200); if (k < 80) k = p.lastIndexOf(" ", 200); if (k < 1) k = 200;
        out.push(p.slice(0, k + 1)); p = p.slice(k + 1);
      }
      if (p.trim()) out.push(p);
    });
    return out;
  }
  function next(my) {
    if (my !== seq) return;
    if (!queue.length) { speaking = false; ui(); return; }
    var l = curLang, u = new SpeechSynthesisUtterance(queue.shift()), v = bestVoice(l);
    if (v) u.voice = v;
    u.lang = v ? v.lang : (l === "es" ? "es-US" : "en-US"); u.rate = rate; u.volume = 1;
    u.onend = function () { next(my); }; u.onerror = function () { next(my); };
    try { TTS.speak(u); } catch (e) { speaking = false; ui(); }
  }
  function say(text, l) {
    if (!TTS || typeof SpeechSynthesisUtterance === "undefined") return false;
    try { TTS.cancel(); } catch (e) {}
    curLang = l || lang(); queue = chunks(text); seq++;
    if (!queue.length) return false;
    speaking = true; ui(); next(seq);
    return true;
  }
  function stop() { queue = []; seq++; var was = speaking; speaking = false; try { if (TTS) TTS.cancel(); } catch (e) {} if (was) ui(); }
  function pause() { if (!TTS) return; try { if (TTS.paused) TTS.resume(); else TTS.pause(); } catch (e) {} ui(); }

  /* the Pause / Stop / speed bar */
  var L = {
    en: { pause: "⏸ Pause", resume: "▶ Resume", stop: "⏹ Stop", speed: "Reading speed", sp: [["0.8", "Slower"], ["1", "Normal"], ["1.2", "Faster"]] },
    es: { pause: "⏸ Pausa", resume: "▶ Seguir", stop: "⏹ Parar", speed: "Velocidad", sp: [["0.8", "Más lento"], ["1", "Normal"], ["1.2", "Más rápido"]] }
  };
  function css() {
    if (document.getElementById("spk-css")) return;
    var s = document.createElement("style"); s.id = "spk-css";
    s.textContent = ".spk-bar{position:fixed;left:50%;top:calc(64px + env(safe-area-inset-top));transform:translateX(-50%);z-index:60;display:flex;gap:6px;align-items:center;" +
      "background:rgba(7,17,42,.96);border:1px solid var(--gold,#ffd166);border-radius:14px;padding:6px;box-shadow:0 10px 30px rgba(0,0,0,.5);max-width:calc(100vw - 24px)}" +
      ".spk-bar[hidden]{display:none}.spk-bar button,.spk-bar select{background:none;border:1px solid var(--edge,#1c2f57);color:var(--ink,#eef3ff);border-radius:10px;min-height:40px;padding:0 10px;font:700 14px Rajdhani,system-ui,sans-serif;cursor:pointer}" +
      ".spk-bar select{background:#0a1631}.spk-bar .w{font-size:18px;padding:0 4px}" +
      ".spk-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:48px;padding:0 18px;border-radius:14px;border:1px solid rgba(255,209,102,.6);background:rgba(255,209,102,.1);color:var(--gold,#ffd166);font:800 16px Rajdhani,system-ui,sans-serif;cursor:pointer}" +
      ".spk-btn[aria-pressed=true]{background:var(--gold,#ffd166);color:#2a1a00}" +
      ".spk-mini{display:inline-grid;place-items:center;width:40px;height:40px;border-radius:12px;border:1px solid var(--edge,#1c2f57);background:rgba(255,255,255,.04);font-size:18px;cursor:pointer;vertical-align:middle;margin-left:8px;color:inherit}";
    document.head.appendChild(s);
  }
  function ui() {
    if (!document.body) return;
    if (!bar) {
      css();
      bar = document.createElement("div"); bar.className = "spk-bar"; bar.hidden = true; bar.setAttribute("role", "group");
      bar.innerHTML = '<span class="w" aria-hidden="true">🔊</span><button type="button" data-a="p"></button><button type="button" data-a="s"></button><select></select>';
      bar.querySelector('[data-a="p"]').addEventListener("click", pause);
      bar.querySelector('[data-a="s"]').addEventListener("click", stop);
      bar.querySelector("select").addEventListener("change", function () {
        rate = +this.value || 1; try { localStorage.setItem(RATE_KEY, String(rate)); } catch (e) {}
      });
      document.body.appendChild(bar);
    }
    var t = L[lang()] || L.en, sel = bar.querySelector("select");
    bar.querySelector('[data-a="p"]').textContent = TTS && TTS.paused ? t.resume : t.pause;
    bar.querySelector('[data-a="s"]').textContent = t.stop;
    sel.setAttribute("aria-label", t.speed);
    sel.innerHTML = t.sp.map(function (o) { return '<option value="' + o[0] + '"' + (+o[0] === rate ? " selected" : "") + ">" + o[1] + "</option>"; }).join("");
    bar.hidden = !speaking;
    subs.forEach(function (fn) { try { fn(speaking); } catch (e) {} });
  }

  /* numbers as words, so the voice says "five thousand five hundred dollars" */
  var EN1 = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split(" ");
  var EN10 = ",,twenty,thirty,forty,fifty,sixty,seventy,eighty,ninety".split(",");
  function en(n) {
    if (n < 20) return EN1[n];
    if (n < 100) return EN10[Math.floor(n / 10)] + (n % 10 ? "-" + EN1[n % 10] : "");
    if (n < 1000) return EN1[Math.floor(n / 100)] + " hundred" + (n % 100 ? " " + en(n % 100) : "");
    if (n < 1e6) return en(Math.floor(n / 1000)) + " thousand" + (n % 1000 ? " " + en(n % 1000) : "");
    return en(Math.floor(n / 1e6)) + " million" + (n % 1e6 ? " " + en(n % 1e6) : "");
  }
  var ES1 = "cero uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece catorce quince dieciséis diecisiete dieciocho diecinueve veinte veintiuno veintidós veintitrés veinticuatro veinticinco veintiséis veintisiete veintiocho veintinueve".split(" ");
  var ES10 = ",,,treinta,cuarenta,cincuenta,sesenta,setenta,ochenta,noventa".split(",");
  var ES100 = ",ciento,doscientos,trescientos,cuatrocientos,quinientos,seiscientos,setecientos,ochocientos,novecientos".split(",");
  function es(n) {
    if (n < 30) return ES1[n];
    if (n < 100) return ES10[Math.floor(n / 10)] + (n % 10 ? " y " + ES1[n % 10] : "");
    if (n === 100) return "cien";
    if (n < 1000) return ES100[Math.floor(n / 100)] + (n % 100 ? " " + es(n % 100) : "");
    if (n < 1e6) { var k = Math.floor(n / 1000); return (k === 1 ? "mil" : es(k).replace(/uno$/, "ún") + " mil") + (n % 1000 ? " " + es(n % 1000) : ""); }
    var m = Math.floor(n / 1e6); return (m === 1 ? "un millón" : es(m).replace(/uno$/, "ún") + " millones") + (n % 1e6 ? " " + es(n % 1e6) : "");
  }
  function words(n, l) { n = Math.max(0, Math.round(+n || 0)); return (l || lang()) === "es" ? es(n) : en(n); }
  /* "about five thousand five hundred dollars" — rounded so it sounds natural */
  function dollars(n, l) {
    l = l || lang(); n = Math.abs(+n || 0);
    var r = n >= 1000 ? Math.round(n / 100) * 100 : n >= 100 ? Math.round(n / 10) * 10 : Math.round(n);
    var w = words(r, l);
    if (l === "es") return w.replace(/veintiuno$/, "veintiún").replace(/uno$/, "un") + (r === 1 ? " dólar" : " dólares");
    return w + (r === 1 ? " dollar" : " dollars");
  }

  if (TTS && "onvoiceschanged" in TTS) { try { TTS.onvoiceschanged = function () {}; } catch (e) {} }
  window.addEventListener("pagehide", stop);
  if (window.ICE && window.ICE.on) window.ICE.on(function () { if (speaking) stop(); else if (bar) ui(); });

  window.Speak = {
    say: say, stop: stop, pause: pause, words: words, dollars: dollars,
    get speaking() { return speaking; }, get supported() { return !!(TTS && typeof SpeechSynthesisUtterance !== "undefined"); },
    on: function (fn) { subs.push(fn); }, ui: ui, css: css, _chunks: chunks
  };
})();
