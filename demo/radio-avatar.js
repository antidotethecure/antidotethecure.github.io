/* Talking owner avatar for the restaurant mini-games ("📻 TOWER" in Melody, "🛟 LIFEGUARD" in Nalu Vida).
   A round badge pops into a top corner of the game, a speech bubble types the line out while the mouth flaps
   (closed/talk frames), then it slides away. Never blocks taps (pointer-events:none).

   Setup (once, after the game area exists):
     RadioAvatar.mount({ host: el, base: "img/game/", who: "captain"|"guard", top: "28px", left: "6px", right: "48px",
                         sound: function(){ return audioNodeOrNull; },
                         avoid: function(){ return { x, y, r } or null; } });
       avoid() (optional) gives the player's position in host CSS pixels; while it is under the avatar, the avatar fades
       to see-through so it never hides the player.
       base + who + "-closed.webp" / "-talk.webp" are the two frames.
       sound() returns a WebAudio node to play the radio blip into, or null when the game's sound/sfx is off.
   Talk:
     RadioAvatar.say(text, { who, tone: "info"|"warn"|"win", ms: 2800 });
     RadioAvatar.clear();   // new run: drop anything queued or showing
   Lines queue so they never overlap; with more than 2 waiting, the lowest-priority (info) ones are dropped.
   prefers-reduced-motion: no mouth flapping or sliding, the closed frame and the full line show at once. */
(function () {
  "use strict";
  if (window.RadioAvatar) return;
  var D = document;
  var WHO = { captain: { label: "📻 TOWER", tag: "#f0d375" }, guard: { label: "🛟 LIFEGUARD", tag: "#ff5a4a" } };
  var RING = { info: "#4fb8ff", warn: "#ff4d3a", win: "#3ddc97" };
  var PRI = { info: 0, warn: 1, win: 2 };
  var reduce = false;
  try { reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  var css = D.createElement("style");
  css.textContent =
    ".ra{position:absolute;z-index:4;display:flex;align-items:flex-start;gap:9px;pointer-events:none;opacity:0;visibility:hidden;transform:translate(-120%,0) scale(.8);transform-origin:left top;" +
    "transition:transform .34s cubic-bezier(.2,1.5,.45,1),opacity .2s,visibility 0s .34s;-webkit-user-select:none;user-select:none}" +
    ".ra.on{opacity:1;visibility:visible;transform:none;transition:transform .34s cubic-bezier(.2,1.5,.45,1),opacity .2s,visibility 0s}" +
    ".ra.out{transition:transform .28s ease-in,opacity .28s,visibility 0s .28s}.ra.on.dim{opacity:.45}" +
    ".ra-badge{position:relative;flex:none;width:84px;height:84px;border-radius:50%;background:radial-gradient(circle at 50% 30%,#2d4170,#0a1226 72%);" +
    "box-shadow:0 0 0 3px var(--ra-ring,#4fb8ff),0 0 14px 2px var(--ra-ring,#4fb8ff),0 6px 16px rgba(0,0,0,.5);transition:box-shadow .25s}" +
    ".ra-badge img{position:absolute;inset:0;width:100%;height:100%;border-radius:50%;object-fit:cover;object-position:50% 12%}" +
    ".ra-badge .t{visibility:hidden}.ra.talk .ra-badge .t{visibility:visible}.ra.talk .ra-badge .c{visibility:hidden}" +
    ".ra-lbl{position:absolute;left:50%;bottom:-9px;transform:translateX(-50%);white-space:nowrap;font:900 9.5px/1 system-ui,-apple-system,sans-serif;letter-spacing:.06em;" +
    "padding:4px 7px 3px;border-radius:999px;background:#0b1224;color:var(--ra-tag,#f0d375);border:1.5px solid var(--ra-ring,#4fb8ff);box-shadow:0 2px 6px rgba(0,0,0,.4)}" +
    ".ra-bub{position:relative;min-width:0;margin-top:12px;padding:8px 11px;border-radius:14px;background:#fff;color:#10162a;" +
    "font:800 13.5px/1.28 system-ui,-apple-system,sans-serif;border:2px solid var(--ra-ring,#4fb8ff);box-shadow:0 6px 18px rgba(0,0,0,.4);overflow-wrap:break-word}" +
    ".ra-bub:before{content:'';position:absolute;left:-9px;top:14px;border:7px solid transparent;border-right:9px solid var(--ra-ring,#4fb8ff);border-left:0}" +
    ".ra-bub .g{visibility:hidden}.ra-bub .x{position:absolute;left:11px;right:11px;top:8px}" +
    "@media (min-width:600px){.ra-badge{width:92px;height:92px}.ra-bub{font-size:14.5px}}" +
    "@media (prefers-reduced-motion:reduce){.ra,.ra.on,.ra.out{transform:none!important;transition:opacity .2s,visibility 0s .2s}.ra.on{transition:opacity .2s}}";
  D.head.appendChild(css);

  var C = null, el, badge, imC, imT, lbl, ghost, typed, Q = [], cur = null, timers = [], flapT = 0, seq = 0;
  function later(fn, ms) { var id = setTimeout(fn, ms); timers.push(id); return id; }
  function src(who, f) { return (C.base || "") + who + "-" + f + ".webp"; }
  function preload(who) { ["closed", "talk"].forEach(function (f) { var i = new Image(); i.decoding = "async"; i.src = src(who, f); }); }

  function mount(cfg) {
    C = cfg || {};
    var host = typeof C.host === "string" ? D.querySelector(C.host) : C.host;
    if (!host) return;
    if (getComputedStyle(host).position === "static") host.style.position = "relative";
    el = D.createElement("div"); el.className = "ra notranslate"; el.setAttribute("translate", "no");
    el.setAttribute("aria-live", "polite"); el.setAttribute("role", "status");
    el.style.top = C.top || "8px"; el.style.left = C.left || "8px";
    el.style.maxWidth = "calc(100% - " + (C.left || "8px") + " - " + (C.right || "8px") + ")";
    el.innerHTML = '<div class="ra-badge"><img class="c" alt=""><img class="t" alt=""><span class="ra-lbl"></span></div><div class="ra-bub"><span class="g"></span><span class="x"></span></div>';
    host.appendChild(el);
    badge = el.firstChild; imC = badge.children[0]; imT = badge.children[1]; lbl = badge.children[2];
    ghost = el.querySelector(".g"); typed = el.querySelector(".x");
    setWho(C.who || "captain");
    preload(C.who || "captain");
  }
  function setWho(who) {
    var w = WHO[who] || WHO.captain;
    if (imC.getAttribute("data-w") !== who) { imC.src = src(who, "closed"); imT.src = src(who, "talk"); imC.setAttribute("data-w", who); preload(who); }
    lbl.textContent = w.label; el.style.setProperty("--ra-tag", w.tag);
  }

  // short radio squelch: band-passed noise burst + a click, through the game's own sfx bus (so its mute applies)
  function blip(end) {
    var out = null; try { out = C.sound && C.sound(); } catch (e) {}
    if (!out || !out.context) return;
    try {
      var ac = out.context, t = ac.currentTime, len = Math.floor(ac.sampleRate * (end ? .09 : .16)), b = ac.createBuffer(1, len, ac.sampleRate), d = b.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len * .4);
      var n = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      n.buffer = b; f.type = "bandpass"; f.frequency.setValueAtTime(end ? 2600 : 1700, t); f.Q.value = 1.4;
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(end ? .05 : .07, t + .012); g.gain.exponentialRampToValueAtTime(.0005, t + len / ac.sampleRate);
      n.connect(f); f.connect(g); g.connect(out); n.start(t); n.stop(t + len / ac.sampleRate + .02);
      var o = ac.createOscillator(), og = ac.createGain(); o.type = "square"; o.frequency.value = end ? 1400 : 950;
      og.gain.setValueAtTime(.025, t); og.gain.exponentialRampToValueAtTime(.0005, t + .03); o.connect(og); og.connect(out); o.start(t); o.stop(t + .04);
    } catch (e) {}
  }

  // fade out of the way while the player is underneath
  var avoidT = 0;
  function watch(on) {
    clearInterval(avoidT); if (el) el.classList.remove("dim");
    if (!on || !C.avoid) return;
    avoidT = setInterval(function () {
      var p = null; try { p = C.avoid(); } catch (e) {}
      if (!p) { el.classList.remove("dim"); return; }
      var r = p.r || 30, L = el.offsetLeft, T = el.offsetTop, R = L + el.offsetWidth, B = T + el.offsetHeight;
      el.classList.toggle("dim", p.x + r > L && p.x - r < R && p.y + r > T && p.y - r < B);
    }, 120);
  }

  function flap(on) {
    clearTimeout(flapT);
    if (!on || reduce) { el.classList.remove("talk"); return; }
    (function step() { el.classList.toggle("talk"); flapT = setTimeout(step, 110 + Math.random() * 30); })();
  }

  function next() {
    if (cur || !Q.length || !el) return;
    cur = Q.shift(); var my = ++seq, txt = cur.text;
    setWho(cur.who);
    el.style.setProperty("--ra-ring", RING[cur.tone] || RING.info);
    ghost.textContent = txt; typed.textContent = "";
    el.classList.remove("out"); el.classList.add("on"); watch(true);
    blip(false);
    var chars = Array.from ? Array.from(txt) : txt.split(""), i = 0;
    function done() {
      if (my !== seq) return;
      flap(false); typed.textContent = txt;
      later(function () {
        if (my !== seq) return;
        blip(true); el.classList.add("out"); el.classList.remove("on");
        later(function () { if (my !== seq) return; cur = null; watch(false); next(); }, Q.length ? 320 : 300);
      }, cur.ms);
    }
    if (reduce) { done(); return; }
    later(function () {
      if (my !== seq) return;
      flap(true);
      (function type() {
        if (my !== seq) return;
        i = Math.min(chars.length, i + 1); typed.textContent = chars.slice(0, i).join("");
        if (i >= chars.length) { done(); return; }
        var ch = chars[i - 1]; later(type, /[.,!?…—]/.test(ch) ? 110 : 26 + Math.random() * 14);
      })();
    }, 180);
  }

  function say(text, o) {
    if (!el || !text) return;
    o = o || {};
    var tone = RING[o.tone] ? o.tone : "info";
    var item = { text: String((window.__T || String)(text)), who: WHO[o.who] ? o.who : (C.who || "captain"), tone: tone, ms: o.ms || 2800, pri: o.pri != null ? o.pri : PRI[tone] };
    Q.push(item);
    while (Q.length > 2) {   // too much waiting: drop the lowest-priority, oldest line
      var lo = 0; for (var k = 1; k < Q.length; k++) if (Q[k].pri < Q[lo].pri) lo = k;
      Q.splice(lo, 1);
    }
    // a warning cuts off a chatty info line that is still on screen (it never waits behind small talk)
    if (cur && cur.pri < 1 && item.pri >= 1 && Q[0] === item) { seq++; timers.forEach(clearTimeout); timers = []; flap(false); cur = null; }
    next();
  }

  function clear() {
    Q = []; cur = null; seq++; timers.forEach(clearTimeout); timers = []; flap(false); watch(false);
    if (el) { el.classList.remove("on"); el.classList.add("out"); }
  }

  window.RadioAvatar = { mount: mount, say: say, clear: clear, busy: function () { return !!cur || Q.length > 0; } };
})();
