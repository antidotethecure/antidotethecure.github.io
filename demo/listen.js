/* SousShift AI · "🔊 Listen": reads a section of the page out loud with the phone's / computer's OWN voice
   (Web Speech API, speechSynthesis). Free: no ElevenLabs, no account, no key, nothing sent anywhere.
   - Put a button anywhere:  SSAI_LISTEN.button("sectionId")  → <button data-listen="sectionId">🔊 Listen</button>
     (or write that button yourself). Tapping it reads that element's headings, paragraphs, list items and steps in order.
   - Play / Pause / Stop bar at the bottom; the paragraph being read is highlighted and kept on screen.
   - Voice: the most natural one the device has, matching the page language (<html lang="en|es">). Prefers names with
     Premium / Enhanced / Natural, then Ava, Samantha, Google US English (Spanish: Paulina, Mónica, Google español).
     Rate 1.05.
   - iPhone Safari: speech only starts from a tap, so every chunk is queued inside the tap itself; Pause = stop and remember
     the spot, Play = queue again from that paragraph (also inside the tap). Works the same on Android / desktop.
   - The page may re-render while reading: the highlight re-finds the paragraph by its position, so it keeps working.
   - Skip something: give it data-noread. Read something hidden (like a closed FAQ answer): it's read anyway if inside <details>.
   No customer data is involved. */
(function () {
  "use strict";
  if (window.SSAI_LISTEN) return;
  var SS = window.speechSynthesis, OK = !!(SS && typeof SpeechSynthesisUtterance !== "undefined");
  var RATE = 1.05, MAXC = 200;
  var T = {
    listen: { en: "🔊 Listen", es: "🔊 Escuchar" }, play: { en: "▶ Play", es: "▶ Reproducir" }, pause: { en: "⏸ Pause", es: "⏸ Pausa" },
    stop: { en: "⏹ Stop", es: "⏹ Detener" }, reading: { en: "Reading out loud", es: "Leyendo en voz alta" },
    none: { en: "This browser can't read out loud. Try Safari or Chrome.", es: "Este navegador no puede leer en voz alta. Prueba Safari o Chrome." }
  };
  function lang() { return /^es/i.test(document.documentElement.lang || "") ? "es" : "en"; }
  function L(x) { return x[lang()] || x.en; }
  var st = { id: "", paras: [], chunks: [], at: 0, playing: false, seq: 0, title: "" }, bar = null, voices = [];
  function loadVoices() { try { voices = SS.getVoices() || []; } catch (e) { voices = []; } }
  if (OK) { loadVoices(); try { SS.addEventListener ? SS.addEventListener("voiceschanged", loadVoices) : (SS.onvoiceschanged = loadVoices); } catch (e) {} }
  // most natural voice for the page language
  function pick(l) {
    if (!voices.length) loadVoices();
    var mine = voices.filter(function (v) { return new RegExp("^" + l, "i").test(v.lang || ""); }); if (!mine.length) return null;
    var region = l === "es" ? /^es[-_](US|MX|419)/i : /^en[-_]US/i;
    var names = l === "es" ? [/premium|enhanced|natural|neural/i, /paulina|m[oó]nica|marisol/i, /google espa/i] : [/premium|enhanced|natural|neural/i, /\bava\b/i, /samantha/i, /google us english/i];
    function score(v) { var s = 0, n = v.name || "";
      names.forEach(function (re, i) { if (re.test(n)) s += 100 - i * 10; });
      if (region.test(v.lang || "")) s += 15; if (v.localService) s += 3; if (/compact|eloquence|novelty|whisper|zarvox|bells|bad news|jester|organ|bubbles|cellos|trinoids|albert|fred|junior|ralph|kathy|superstar|grandma|grandpa|rocko|shelley|flo|reed|sandy|eddy/i.test(n)) s -= 80;
      return s; }
    return mine.slice().sort(function (a, b) { return score(b) - score(a); })[0];
  }
  function clean(t) {
    return String(t || "").replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{20E3}]/gu, " ")
      .replace(/→/g, lang() === "es" ? " a " : " to ").replace(/\s*[·•|]\s*/g, ", ").replace(/×/g, " x ").replace(/[“”"]/g, "").replace(/\s+/g, " ").trim();
  }
  var SEL = "h2,h3,h4,p,li,.say,.stp,summary,figcaption,[data-read]";
  function paras(id) {
    var root = document.getElementById(id); if (!root) return [];
    var all = Array.prototype.slice.call(root.querySelectorAll(SEL));
    if (root.matches && root.matches(SEL)) all.unshift(root);
    return all.filter(function (el) {
      if (el.closest("[data-noread],button,select,input,textarea,.ls-bar,script,style")) return false;
      for (var p = el.parentElement; p && p !== root.parentElement; p = p.parentElement) if (p !== el && all.indexOf(p) >= 0) return false;   // outermost only
      var hidden = !el.getClientRects().length; if (hidden && !el.closest("details")) return false;
      return clean(el.textContent).length > 1;
    });
  }
  function chunk(text) {   // short pieces: Chrome stops long utterances after ~15 s
    var out = [], s = text.match(/[^.!?¿¡;:]+[.!?;:]*\s*/g) || [text], cur = "";
    s.forEach(function (x) { if ((cur + x).length > MAXC && cur) { out.push(cur.trim()); cur = ""; } while (x.length > MAXC) { var cut = x.lastIndexOf(",", MAXC); cut = cut > 40 ? cut + 1 : MAXC; out.push(x.slice(0, cut).trim()); x = x.slice(cut); } cur += x; });
    if (cur.trim()) out.push(cur.trim()); return out;
  }
  function css() {
    if (document.getElementById("ls-css")) return;
    var s = document.createElement("style"); s.id = "ls-css";
    s.textContent = ".ls-btn{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:10px 16px;border-radius:999px;border:1px solid #f5c40088;background:#f5c4001f;color:inherit;font:800 15px -apple-system,system-ui,sans-serif;cursor:pointer;vertical-align:middle;-webkit-tap-highlight-color:transparent}" +
      ".ls-btn[aria-pressed=true]{background:#f5c400;color:#1a1400}.ls-on{background:#f5c40029!important;outline:2px solid #f5c400;outline-offset:3px;border-radius:8px;transition:background .2s}" +
      ".ls-bar{position:fixed;left:0;right:0;bottom:0;z-index:48;display:flex;gap:8px;align-items:center;background:#0b1428f7;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border-top:2px solid #f5c400;padding:10px 16px calc(10px + env(safe-area-inset-bottom));color:#f3f6ff;font:15px/1.3 -apple-system,system-ui,sans-serif}" +
      ".ls-bar .t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ls-bar .t small{display:block;color:#a9b6d6;font-size:12px}.ls-bar button{min-height:48px;min-width:48px;padding:10px 14px;border-radius:14px;border:0;font:800 15px -apple-system,system-ui,sans-serif;cursor:pointer}" +
      ".ls-bar .pp{background:#f5c400;color:#1a1400}.ls-bar .sp{background:#ffffff1a;color:#f3f6ff;border:1px solid #ffffff33}body.ls-open .sv-fab{display:none!important}body.ls-open{padding-bottom:84px}";
    document.head.appendChild(s);
  }
  function drawBar() {
    css();
    if (!bar) { bar = document.createElement("div"); bar.className = "ls-bar"; bar.setAttribute("role", "region"); bar.setAttribute("aria-label", "Read aloud"); document.body.appendChild(bar);
      bar.addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; if (b.className === "pp") { st.playing ? pause() : play(); } else stop(); }); }
    bar.hidden = !st.id; document.body.classList.toggle("ls-open", !!st.id);
    bar.innerHTML = "<div class='t' aria-live='polite'><small>" + L(T.reading) + "</small>" + esc(st.title || "") + "</div><button type='button' class='pp'>" + L(st.playing ? T.pause : T.play) + "</button><button type='button' class='sp'>" + L(T.stop) + "</button>";
    document.querySelectorAll("[data-listen]").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-listen") === st.id && st.playing ? "true" : "false"); });
  }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]; }); }
  function mark(pi) {
    document.querySelectorAll(".ls-on").forEach(function (x) { x.classList.remove("ls-on"); });
    if (pi == null) return; var el = paras(st.id)[pi]; if (!el) return;
    var d = el.closest("details"); if (d && !d.open) d.open = true;
    el.classList.add("ls-on");
    var r = el.getBoundingClientRect(); if (r.top < 70 || r.bottom > innerHeight - 100) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  // queue every remaining chunk NOW (inside the tap: required by iPhone Safari)
  function queue() {
    var my = ++st.seq, l = lang(), v = pick(l);
    try { SS.cancel(); } catch (e) {}
    st.playing = true; drawBar();
    st.chunks.slice(st.at).forEach(function (c, k) {
      var idx = st.at + k, u = new SpeechSynthesisUtterance(c.text);
      if (v) u.voice = v; u.lang = v ? v.lang : (l === "es" ? "es-US" : "en-US"); u.rate = RATE; u.pitch = 1;
      u.onstart = function () { if (my !== st.seq) return; st.at = idx; mark(c.p); };
      u.onend = function () { if (my !== st.seq) return; if (idx === st.chunks.length - 1) { st.at = 0; st.playing = false; mark(null); drawBar(); } };
      u.onerror = function (e) { if (my !== st.seq || (e && /interrupt|cancel/.test(e.error || ""))) return; };
      try { SS.speak(u); } catch (e) {}
    });
    try { if (SS.paused) SS.resume(); } catch (e) {}   // Safari can start in a paused state
  }
  function start(id, btn) {
    if (!OK) { alert(L(T.none)); return; }
    if (window.StaffVoice && StaffVoice.stop) try { StaffVoice.stop(); } catch (e) {}
    var ps = paras(id); if (!ps.length) return;
    st.id = id; st.at = 0; st.chunks = [];
    var h = document.getElementById(id), hd = h && (h.matches("h2,h3") ? h : h.querySelector("h2,h3"));
    st.title = clean((btn && btn.getAttribute("data-title")) || (hd && hd.textContent) || "").replace(/^\d+\s*,\s*/, "");
    ps.forEach(function (el, pi) { chunk(clean(el.textContent)).forEach(function (t) { st.chunks.push({ p: pi, text: t }); }); });
    queue();
  }
  function play() { if (!st.id) return; if (st.at >= st.chunks.length) st.at = 0;
    var p = st.chunks[st.at] ? st.chunks[st.at].p : 0; while (st.at > 0 && st.chunks[st.at - 1].p === p) st.at--;   // resume from the start of that paragraph
    queue(); }
  function pause() { st.seq++; st.playing = false; try { SS.cancel(); } catch (e) {} drawBar(); }
  function stop() { st.seq++; st.playing = false; st.id = ""; st.at = 0; try { if (OK) SS.cancel(); } catch (e) {} mark(null); drawBar(); }
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-listen]");
    if (b) { e.preventDefault(); var id = b.getAttribute("data-listen"); if (st.id === id && st.playing) pause(); else if (st.id === id) play(); else start(id, b); return; }
    if (e.target.closest && e.target.closest(".sv-fab,[data-sv]") && st.id) stop();   // the staff guide's other voice player takes over
  });
  window.addEventListener("pagehide", function () { if (st.id) stop(); });
  window.SSAI_LISTEN = {
    ok: OK, start: start, play: play, pause: pause, stop: stop, voice: function () { return pick(lang()); },
    button: function (id, label, title) { css(); return "<button type='button' class='ls-btn' data-listen='" + esc(id) + "'" + (title ? " data-title='" + esc(title) + "'" : "") + " aria-pressed='false'>" + esc(label || L(T.listen)) + "</button>"; },
    state: function () { return { id: st.id, playing: st.playing, at: st.at, total: st.chunks.length }; }
  };
  css();
})();
