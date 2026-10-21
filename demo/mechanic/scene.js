/* SousShift AI — Mobile Mechanic demo: a GENERIC home-garage scene, hand-drawn in SVG (no photos in the repo). Exposes window.SCENE.
   Loose vibe only (an LA-style bungalow with a long side driveway, gates, and a work area out back). It is deliberately
   NOT any real house: invented colors (sand + the app's navy/orange), hip roof, arched windows, a palm, a carport +
   roll-up garage in back. No house number, street name, plates or mailbox.
   The customer's car is a body-style silhouette (car.js shapes) in a color they pick, and it moves through the scene
   with the job stage. CSS lives in app.css (.scn). Reduced motion = static frame per stage (no transitions). */
(function () {
  "use strict";
  var W = window, n = 0;
  /* car shells, same outlines as the tap-the-car diagram (wheels at x 95 / 305, ground y 180) */
  var SHELL = {
    sedan: "M24 154 L24 128 Q26 112 46 108 L108 98 Q132 92 150 72 Q166 56 196 54 L262 54 Q292 56 318 90 L360 96 Q378 100 378 118 L378 154 Z",
    hatch: "M24 154 L24 128 Q26 112 46 108 L108 98 Q132 92 150 72 Q166 56 196 56 L300 56 Q318 58 336 80 L366 100 Q378 104 378 120 L378 154 Z",
    coupe: "M24 154 L24 130 Q26 116 46 112 L118 100 Q148 90 170 66 Q186 56 212 56 L250 58 Q284 62 330 96 L364 100 Q378 104 378 120 L378 154 Z",
    suv: "M24 154 L24 124 Q26 108 46 104 L104 96 Q126 86 140 58 Q146 44 170 42 L330 42 Q350 42 356 60 L372 96 Q380 100 380 118 L380 154 Z",
    van: "M20 154 L20 124 Q22 108 40 104 L84 96 Q110 78 132 52 Q144 40 168 40 L350 40 Q370 40 374 60 L380 104 L380 154 Z",
    truck: "M24 154 L24 122 Q26 106 46 104 L120 98 Q132 90 140 62 Q144 48 160 48 L222 48 Q232 48 234 58 L238 104 L380 104 L380 154 Z"
  };
  var GLASS = {
    sedan: "M150 90 L166 68 Q176 61 196 61 L224 61 L224 90 Z M230 61 L262 61 Q284 63 304 90 L230 90 Z",
    hatch: "M150 90 L166 68 Q176 62 196 62 L238 62 L238 90 Z M244 62 L298 62 Q312 64 326 84 L328 90 L244 90 Z",
    coupe: "M164 94 L182 70 Q190 63 210 63 L240 64 L240 94 Z M246 64 Q272 68 296 94 L246 94 Z",
    suv: "M142 90 L156 60 Q160 50 174 50 L226 50 L226 90 Z M232 50 L290 50 L290 90 L232 90 Z M296 50 L326 50 Q338 50 342 62 L352 90 L296 90 Z",
    van: "M134 88 L152 58 Q158 48 172 48 L214 48 L214 88 Z M220 48 L276 48 L276 88 L220 88 Z M282 48 L348 48 Q362 48 364 62 L368 88 L282 88 Z",
    truck: "M146 92 L154 62 Q157 55 166 55 L190 55 L190 92 Z M196 55 L224 55 Q228 56 229 62 L231 92 L196 92 Z"
  };
  function car(id, body, color) {
    body = SHELL[body] ? body : "sedan";
    var w = function (x) { return '<g class="whl"><circle cx="' + x + '" cy="156" r="25" fill="#111"/><circle cx="' + x + '" cy="156" r="13" fill="#9aa3b5"/><circle cx="' + x + '" cy="156" r="4" fill="#333"/></g>'; };
    /* local coords: origin at the car's bottom-center; the art faces LEFT, so it's mirrored to face right */
    return '<g class="car"><g class="carin" transform="scale(-1 1) translate(-200 -182)">' +
      '<ellipse cx="200" cy="182" rx="190" ry="9" fill="#000" opacity=".28"/>' +
      '<path class="paint" d="' + SHELL[body] + '" fill="' + (color || "#e2483d") + '"/>' +
      '<path d="' + SHELL[body] + '" fill="url(#' + id + 'shine)"/>' +
      '<path d="' + GLASS[body] + '" fill="#13233d" opacity=".9"/>' +
      '<path class="hood" d="M30 108 L110 96" stroke="' + (color || "#e2483d") + '" stroke-width="7" stroke-linecap="round"/>' +
      '<path d="M26 116 Q30 110 46 108 L52 114 Q40 120 26 121 Z" fill="#fff8d0"/>' +
      w(95) + w(305) + "</g></g>";
  }
  /* the scene. o = { body, color, hero } */
  function html(o) {
    o = o || {}; var id = "sc" + (++n) + "_";
    var i, seams = ""; for (i = 1; i < 4; i++) { var yy = 250 - i * 25, l = 238 + (250 - yy) * 0.24, r = 330 - (250 - yy) * 0.3; seams += '<path d="M' + l.toFixed(1) + " " + yy + " L" + r.toFixed(1) + " " + yy + '"/>'; }
    var barsL = "", barsR = ""; for (i = 0; i < 6; i++) { barsL += "M" + (260 + i * 4) + " 172 V148 "; barsR += "M" + (284 + i * 4) + " 172 V148 "; }
    var tiles = ""; for (i = 0; i < 13; i++) tiles += '<path d="M' + (20 + i * 16) + ' 103 q8 -4 16 0" />';
    return '<svg class="scn-svg" viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Home garage: house, driveway, gates and the carport work area in back">' +
      "<defs>" +
      '<linearGradient id="' + id + 'sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a63c9"/><stop offset=".7" stop-color="#5b92e6"/><stop offset="1" stop-color="#ffd9a8"/></linearGradient>' +
      '<linearGradient id="' + id + 'wall" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f1e3c8"/><stop offset="1" stop-color="#d9c3a0"/></linearGradient>' +
      '<linearGradient id="' + id + 'side" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#c4ab86"/><stop offset="1" stop-color="#b19673"/></linearGradient>' +
      '<linearGradient id="' + id + 'drive" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#e2ddd2"/><stop offset="1" stop-color="#c9c3b7"/></linearGradient>' +
      '<linearGradient id="' + id + 'lawn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7d9a4a"/><stop offset="1" stop-color="#5d7a34"/></linearGradient>' +
      '<linearGradient id="' + id + 'hedge" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4f7a34"/><stop offset="1" stop-color="#2f5222"/></linearGradient>' +
      '<linearGradient id="' + id + 'gate" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7a5232"/><stop offset=".5" stop-color="#946642"/><stop offset="1" stop-color="#6b462a"/></linearGradient>' +
      '<linearGradient id="' + id + 'shine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient>' +
      '<radialGradient id="' + id + 'sun" cx=".88" cy=".08" r=".5"><stop offset="0" stop-color="#fff6d6" stop-opacity=".9"/><stop offset="1" stop-color="#fff6d6" stop-opacity="0"/></radialGradient>' +
      '<pattern id="' + id + 'stucco" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="1" cy="2" r=".5" fill="#000" opacity=".06"/><circle cx="4" cy="5" r=".45" fill="#fff" opacity=".12"/></pattern>' +
      "</defs>" +
      /* sky + far layer */
      '<g class="lyr l0"><rect width="400" height="250" fill="url(#' + id + 'sky)"/><rect width="400" height="250" fill="url(#' + id + 'sun)"/>' +
      '<g fill="#fff" opacity=".75"><ellipse class="cl c1" cx="250" cy="44" rx="16" ry="4"/><ellipse class="cl c2" cx="196" cy="64" rx="11" ry="3"/><ellipse class="cl c1" cx="70" cy="30" rx="13" ry="3.5"/></g>' +
      '<g fill="#2e5a2a"><circle cx="232" cy="112" r="20"/><circle cx="252" cy="104" r="16"/><circle cx="318" cy="112" r="18"/><circle cx="350" cy="102" r="22"/><circle cx="378" cy="110" r="18"/></g></g>' +
      /* back: carport + roll-up garage */
      '<g class="lyr l1">' +
      '<path d="M306 112 L352 104 L398 112 L398 160 L306 160 Z" fill="#c7b79e"/><path d="M300 114 L352 100 L404 114 L398 116 L352 104 L306 116 Z" fill="#26324d"/>' +
      '<rect x="318" y="124" width="54" height="36" fill="#56617a"/><g stroke="#47526a" stroke-width="1"><path d="M318 130 h54 M318 136 h54 M318 142 h54 M318 148 h54 M318 154 h54"/></g>' +
      '<path d="M306 118 h92" stroke="var(--accent,#ff7a1a)" stroke-width="2"/>' +
      '<g class="tents"><rect x="250" y="148" width="58" height="9" fill="#000" opacity=".18"/>' +
      '<path d="M246 128 L312 124 L312 130 L246 134 Z" fill="#33405e"/><path d="M246 134 L312 130" stroke="var(--accent,#ff7a1a)" stroke-width="1.4"/>' +
      '<g stroke="#8d97ab" stroke-width="1.6"><path d="M250 134 V156 M308 131 V156"/></g><path d="M280 150 h10 v-6 h-10z" fill="#ffd166" opacity=".55"/></g>' +
      '<g class="bgcar" transform="translate(340 160) scale(.07)">' + car(id + "b", "suv", "#3b4048").replace('class="car"', 'class="parked"') + "</g>" +
      "</g>" +
      /* driveway + low block wall */
      '<g class="lyr l2">' +
      '<path d="M296 150 L400 150 L400 238 L326 238 Z" fill="url(#' + id + 'lawn)"/><path d="M296 150 L400 150 L400 158 L298 158 Z" fill="#0002"/>' +
      '<path d="M238 250 L262 150 L300 150 L330 250 Z" fill="url(#' + id + 'drive)"/>' +
      '<g stroke="#b3ad9f" stroke-width=".8" fill="none">' + seams + '<path d="M281 150 L284 250"/></g>' +
      '<path d="M300 150 L330 250 L344 250 L307 150 Z" fill="#0002"/>' +
      '<path d="M306 160 L338 250 L350 250 L314 160 Z" fill="#b9a98f"/><path d="M306 160 L338 250" stroke="#d8cbb4" stroke-width="2"/>' +
      /* gates (partway back): plain navy metal, swing open */
      '<g class="gates" stroke="#1b2438" stroke-width="1.2" fill="none"><g class="gateL"><path d="M257 172 V148 H281 V172" fill="#26324d" fill-opacity=".25"/><path d="M257 156 H281 ' + barsL + '"/></g>' +
      '<g class="gateR"><path d="M281 172 V148 H306 V172" fill="#26324d" fill-opacity=".25"/><path d="M281 156 H306 ' + barsR + '"/></g></g>' +
      "</g>" +
      /* the house: sand stucco, navy hip roof, arched windows */
      '<g class="lyr l3">' +
      '<path d="M226 120 L252 126 L254 198 L226 198 Z" fill="url(#' + id + 'side)"/>' +
      '<rect x="20" y="104" width="206" height="94" fill="url(#' + id + 'wall)"/><rect x="20" y="104" width="206" height="94" fill="url(#' + id + 'stucco)"/>' +
      '<path d="M8 106 L60 74 L190 74 L240 106 Z" fill="#26324d"/><g fill="none" stroke="#3a4a6e" stroke-width="1.2">' + tiles + '</g><path d="M8 106 H240" stroke="var(--accent,#ff7a1a)" stroke-width="2.5"/>' +
      '<path d="M40 162 V134 a14 14 0 0 1 28 0 V162 Z" fill="#fff8ec"/><path d="M44 160 V135 a10 10 0 0 1 20 0 V160 Z" fill="#6f8fb3"/><path d="M54 125 V160 M44 145 H64" stroke="#fff8ec" stroke-width="1.5"/>' +
      '<path d="M84 162 V134 a14 14 0 0 1 28 0 V162 Z" fill="#fff8ec"/><path d="M88 160 V135 a10 10 0 0 1 20 0 V160 Z" fill="#6f8fb3"/><path d="M98 125 V160 M88 145 H108" stroke="#fff8ec" stroke-width="1.5"/>' +
      '<path d="M150 198 V146 a16 16 0 0 1 32 0 V198 Z" fill="#7a4b2e"/><circle cx="175" cy="172" r="1.8" fill="#ffd166"/>' +
      '<path d="M144 198 V144 a22 22 0 0 1 44 0 V198" fill="none" stroke="#fff8ec" stroke-width="2"/>' +
      '<rect x="196" y="122" width="8" height="5" rx="1.5" fill="#ffd166" opacity=".9"/>' +
      "</g>" +
      /* front: lawn, round shrubs + planters, palm, sidewalk, street */
      '<g class="lyr l4">' +
      '<path d="M0 198 L238 198 L232 230 L0 230 Z" fill="url(#' + id + 'lawn)"/>' +
      '<g fill="url(#' + id + 'hedge)"><circle cx="122" cy="196" r="10"/><circle cx="206" cy="196" r="9"/><circle cx="222" cy="198" r="7"/></g>' +
      '<g><rect x="30" y="190" width="18" height="10" rx="2" fill="#c0663c"/><circle cx="34" cy="187" r="3" fill="#e2483d"/><circle cx="40" cy="185" r="3" fill="#ffd166"/><circle cx="45" cy="188" r="3" fill="#e2483d"/></g>' +
      '<g class="tree"><ellipse cx="14" cy="222" rx="16" ry="3" fill="#0003"/><path d="M14 222 C16 196 10 170 16 140" stroke="#8b6a48" stroke-width="4" fill="none" stroke-linecap="round"/>' +
      '<g fill="#3f7d3a"><path d="M16 140 q-22 -2 -30 12 q14 -8 30 -12z"/><path d="M16 140 q22 -4 32 8 q-16 -6 -32 -8z"/><path d="M16 140 q-8 -16 -24 -18 q14 6 24 18z"/><path d="M16 140 q10 -18 26 -18 q-16 6 -26 18z"/><path d="M16 140 q2 -14 -4 -24 q8 10 4 24z"/></g></g>' +
      '<path d="M0 230 L232 230 L230 238 L0 238 Z M330 230 L400 230 L400 238 L333 238 Z" fill="#d6d0c4"/><path d="M0 238 H400 V250 H0 Z" fill="#545b66"/><path d="M0 238 H400" stroke="#b9b3a7" stroke-width="1.5"/>' +
      "</g>" +
      /* the customer's car + stage effects */
      '<g class="actor">' + car(id, o.body, o.color) + "</g>" +
      '<g class="fx">' +
      '<g class="fx-diag"><circle class="ping" cx="0" cy="0" r="8" fill="none" stroke="#2de2ff" stroke-width="2"/><text x="0" y="4" text-anchor="middle" font-size="11">🩺</text></g>' +
      '<g class="fx-truck"><text x="0" y="0" font-size="16">🚚</text><text class="tl" x="20" y="-4" font-size="6.5" font-weight="700" fill="#fff">' + esc(o.partsFrom || "") + "</text></g>" +
      '<g class="fx-work"><text class="wr" x="0" y="0" font-size="10">🔧</text><g class="spk" fill="#ffd166"><circle cx="8" cy="6" r="1.2"/><circle cx="12" cy="2" r="1"/><circle cx="4" cy="1" r="1"/><circle cx="10" cy="9" r=".9"/></g></g>' +
      '<g class="fx-shine"><circle class="bub b1" cx="-14" cy="0" r="3" fill="#fff" opacity=".7"/><circle class="bub b2" cx="-4" cy="2" r="2.2" fill="#fff" opacity=".7"/><circle class="bub b3" cx="8" cy="-1" r="2.6" fill="#fff" opacity=".7"/><text class="sp1" x="10" y="-12" font-size="9">✨</text><text class="sp2" x="-20" y="-14" font-size="7">✨</text></g>' +
      '<g class="fx-ready"><rect x="-26" y="-18" width="52" height="14" rx="4" fill="#ffd166"/><text x="0" y="-8" text-anchor="middle" font-size="8" font-weight="900" fill="#1d0b00">' + esc(o.readyTxt || "Ready! 🎉") + "</text>" +
      '<g class="conf"><rect x="-30" y="-30" width="2" height="4" fill="#ff7a1a"/><rect x="-12" y="-36" width="2" height="4" fill="#2de2ff"/><rect x="6" y="-32" width="2" height="4" fill="#34d399"/><rect x="22" y="-38" width="2" height="4" fill="#ff5d6c"/><rect x="32" y="-28" width="2" height="4" fill="#ffd166"/><rect x="-24" y="-40" width="2" height="4" fill="#a78bfa"/></g></g>' +
      "</g></svg>";
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]; }); }
  function stageKey(st) { return st < 0 ? "req" : st === 0 ? "rec" : st === 1 ? "diag" : st === 2 ? "parts" : st <= 4 ? "work" : st === 5 ? "almost" : "ready"; }
  /* mount into el; returns { go(stage), color(c) } — stage -1..6 */
  function mount(el, o) {
    o = o || {};
    el.classList.add("scn"); el.innerHTML = html(o);
    var cur = null;
    function go(st, instant) {
      var k = typeof st === "string" ? st : stageKey(st);
      if (instant || W.MECH && W.MECH.RM) el.classList.add("still"); else el.classList.remove("still");
      el.setAttribute("data-st", k); el.setAttribute("data-n", st); cur = st;
    }
    if (o.from != null) { go(o.from, true); void el.offsetWidth; }
    return { go: go, el: el };
  }
  /* gentle parallax: scroll + pointer (+ device tilt where the browser allows it without a prompt) */
  var tracked = [];
  function parallax(el) { if (W.MECH && W.MECH.RM) return; tracked.push(el); }
  var px = 0, py = 0, raf = 0;
  function apply() {
    raf = 0;
    tracked.forEach(function (el) {
      if (!el.isConnected) return;
      var r = el.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
      var s = Math.max(-1, Math.min(1, (r.top + r.height / 2 - innerHeight / 2) / innerHeight));
      el.querySelectorAll(".lyr").forEach(function (g, i) {
        var d = (i - 2) * 1.6;
        g.style.transform = "translate(" + (px * d).toFixed(2) + "px," + (s * d * 2 + py * d * 0.6).toFixed(2) + "px)";
      });
    });
  }
  function kick() { if (!raf) raf = requestAnimationFrame(apply); }
  W.addEventListener("scroll", kick, { passive: true });
  W.addEventListener("pointermove", function (e) { if (e.pointerType !== "mouse") return; px = e.clientX / innerWidth * 2 - 1; py = e.clientY / innerHeight * 2 - 1; kick(); }, { passive: true });
  W.addEventListener("deviceorientation", function (e) { if (e.gamma == null) return; px = Math.max(-1, Math.min(1, e.gamma / 30)); py = Math.max(-1, Math.min(1, ((e.beta || 45) - 45) / 30)); kick(); }, { passive: true });
  W.SCENE = { html: html, mount: mount, parallax: parallax, stageKey: stageKey, kick: kick };
})();
