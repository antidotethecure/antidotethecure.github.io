/* Before / after carousel: one card per service, sample vector art until real photos are added.
   Real photos: put before/after image paths in beforeafter.json (keyed by card id). When both are set, the photos
   replace the art and the "Sample art" tag goes away. Prices come from config.js (the same numbers the quote uses).
   Self-contained: app.js only calls BA.render(el) and exposes MECH.openSvc for the "Book this" buttons. */
(function () {
  "use strict";
  var W = window, D = document, M = W.MECH, C = M.C, t = M.t, p = M.p, esc = M.esc;
  var RM = M.RM;
  var A = C.colors.accent, B = C.colors.accent2, GOLD = C.colors.gold || "#ffd166", GOOD = C.colors.good || "#34d399";

  /* id, svc + opt (price + preselected option in the booking sheet), legacy = existing art kind in core.js */
  var CARDS = [
    { id: "windshield", svc: "wipers", opt: "blades", wiper: true, title: { en: "Windshield clean + new wipers", es: "Parabrisas limpio + plumas nuevas" } },
    { id: "flat", svc: "tires", opt: "flat", title: { en: "Flat tire repair", es: "Reparar llanta ponchada" } },
    { id: "door", svc: "doors", opt: "reg", title: { en: "Door + window repair", es: "Reparar puerta y ventana" } },
    { id: "sound", svc: "sound", opt: "spk", title: { en: "Sound system upgrade", es: "Mejora de audio" } },
    { id: "brakes", svc: "brakes", opt: "padrot", legacy: "brakes", title: { en: "Pads + rotors", es: "Balatas + discos" } },
    { id: "oil", svc: "oil", opt: "conv", title: { en: "Oil change", es: "Cambio de aceite" } },
    { id: "battery", svc: "battery", opt: "replace", title: { en: "Battery replacement", es: "Cambio de batería" } },
    { id: "cel", svc: "diag", opt: "scan", title: { en: "Check engine light", es: "Luz de check engine" } },
    { id: "ac", svc: "ac", opt: "recharge", title: { en: "A/C blowing cold again", es: "A/C enfriando otra vez" } },
    { id: "plugs", svc: "engine", opt: "plugs", title: { en: "Tune-up (spark plugs)", es: "Afinación (bujías)" } },
    { id: "susp", svc: "susp", opt: "struts", title: { en: "Shocks / struts", es: "Amortiguadores" } },
    { id: "headlight", svc: "lights", opt: "restore", legacy: "headlight", title: { en: "Headlight restoration", es: "Pulido de faros" } },
    { id: "tail", svc: "tail", opt: "assy", title: { en: "Cracked taillight", es: "Calavera rota" } },
    { id: "tint", svc: "tint", opt: "full", legacy: "tint", title: { en: "Window tint", es: "Polarizado" } },
    { id: "exhaust", svc: "exhaust", opt: "muffler", title: { en: "Muffler / exhaust", es: "Mofle / escape" } },
    { id: "body", svc: "body", opt: "fenderL", title: { en: "Dented, scraped fender", es: "Salpicadera golpeada" } },
    { id: "paint", svc: "detail", opt: "ext", title: { en: "Wash + wax shine", es: "Lavado + cera" } },
    { id: "interior", svc: "detail", opt: "int", legacy: "detail", title: { en: "Interior detail", es: "Detallado interior" } }
  ];
  var TX = {
    book: { en: "Book this", es: "Reservar" },
    swipe: { en: "Swipe for more →", es: "Desliza para ver más →" },
    count: { en: "{n} services", es: "{n} servicios" },
    vt: { en: "{n}% after", es: "{n}% después" }
  };
  function tx(k, n) { return p(TX[k]).replace("{n}", n); }

  /* photo pairs from beforeafter.json (+ the older config.js beforeAfter[] list, matched by art kind) */
  var PH = {};
  (C.beforeAfter || []).forEach(function (b) {
    var c = CARDS.filter(function (x) { return x.legacy === b.art; })[0];
    if (c && b.before && b.after) PH[c.id] = { before: b.before, after: b.after };
  });

  /* ---------- art ---------- */
  function svg(inner, defs) {
    var bg = '<rect width="320" height="200" fill="#0b1324"/><g stroke="#ffffff0d">' + [1, 2, 3, 4, 5, 6, 7].map(function (i) { return '<path d="M' + i * 40 + ' 0V200"/>'; }).join("") + "</g>";
    return '<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid slice"><defs>' + (defs || "") + "</defs>" + bg + inner + "</svg>";
  }
  function lg(id, a, b, v) { return '<linearGradient id="' + id + '" x1="0" y1="0" x2="' + (v ? 0 : 1) + '" y2="' + (v ? 1 : 0) + '"><stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/></linearGradient>'; }
  function rg(id, a, b) { return '<radialGradient id="' + id + '"><stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/></radialGradient>'; }
  function spark(x, y, s, c) { return '<path d="M' + x + " " + (y - s) + " L" + (x + s * .28) + " " + (y - s * .28) + " L" + (x + s) + " " + y + " L" + (x + s * .28) + " " + (y + s * .28) + " L" + x + " " + (y + s) + " L" + (x - s * .28) + " " + (y + s * .28) + " L" + (x - s) + " " + y + " L" + (x - s * .28) + " " + (y - s * .28) + 'Z" fill="' + c + '"/>'; }
  function splat(x, y, r) {
    var s = '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#c3cf5a" opacity=".85"/>';
    for (var i = 0; i < 7; i++) { var a = i * 0.9 + r; s += '<path d="M' + x + " " + y + " L" + (x + Math.cos(a) * r * 2.4).toFixed(1) + " " + (y + Math.sin(a) * r * 2.4).toFixed(1) + '" stroke="#c3cf5a" stroke-width="1.6" stroke-linecap="round" opacity=".75"/>'; }
    return s;
  }
  function waves(x, y, r, c, dir) {
    var s = "";
    for (var i = 1; i <= 3; i++) { var R = r + i * 7; s += '<path d="M' + (x + dir * R * .5) + " " + (y - R * .85) + " A" + R + " " + R + " 0 0 " + (dir > 0 ? 1 : 0) + " " + (x + dir * R * .5) + " " + (y + R * .85) + '" fill="none" stroke="' + c + '" stroke-width="2.4" stroke-linecap="round" opacity="' + (1 - i * .22) + '"/>'; }
    return s;
  }
  function wheelRim(cx, cy, r, u) {
    var s = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="url(#' + u + 'rim)" stroke="#ffffff40" stroke-width="2"/>';
    for (var i = 0; i < 5; i++) { var a = (i * 72 - 90) * Math.PI / 180; s += '<path d="M' + cx + " " + cy + " L" + (cx + Math.cos(a) * r * .92).toFixed(1) + " " + (cy + Math.sin(a) * r * .92).toFixed(1) + '" stroke="#5b6475" stroke-width="7" stroke-linecap="round"/>'; }
    return s + '<circle cx="' + cx + '" cy="' + cy + '" r="' + r * .3 + '" fill="#1a2440" stroke="#ffffff30" stroke-width="2"/>';
  }

  var ART = {
    windshield: function (af, u) {
      var G = "M44 178 L84 44 Q88 32 102 32 L218 32 Q232 32 236 44 L276 178 Z";
      var scene = '<rect x="0" y="0" width="320" height="112" fill="url(#' + u + 'sky)"/><circle cx="238" cy="62" r="11" fill="' + GOLD + '" opacity=".9"/>' +
        '<path d="M40 112 L90 84 L120 98 L160 70 L200 96 L236 80 L290 112 Z" fill="#1b3a66"/><rect x="0" y="112" width="320" height="88" fill="#16243d"/>' +
        '<path d="M152 112 L168 112 L262 200 L58 200 Z" fill="#2a3346"/><path d="M160 116 L160 200" stroke="' + GOLD + '" stroke-width="3" stroke-dasharray="8 10" opacity=".8"/>';
      var grime = af ? '<path d="M98 64 L136 54 M104 80 L124 75" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".45"/>' + spark(214, 56, 7, B) + spark(120, 140, 5, "#ffffffcc") :
        '<rect width="320" height="200" fill="#d6cdb8" opacity=".55"/>' +
        '<g fill="#6b5a44" opacity=".6"><circle cx="92" cy="150" r="9"/><circle cx="120" cy="164" r="6"/><circle cx="246" cy="150" r="10"/><circle cx="210" cy="168" r="6"/><circle cx="150" cy="58" r="5"/><circle cx="190" cy="120" r="7"/><circle cx="76" cy="120" r="5"/></g>' +
        splat(120, 70, 4) + splat(198, 60, 3.5) + splat(232, 104, 4.5) + splat(142, 122, 3) + splat(98, 104, 3) + splat(176, 88, 2.6) +
        '<path d="M78 170 A92 92 0 0 1 242 170" fill="none" stroke="#8a7a5c" stroke-width="12" opacity=".35"/><path d="M60 178 A110 110 0 0 1 260 178" fill="none" stroke="#fff" stroke-width="3" opacity=".25"/>';
      return svg('<path d="M18 200 L64 30 Q70 12 96 12 L224 12 Q250 12 256 30 L302 200 Z" fill="#1a2440" stroke="#2b3a63" stroke-width="4"/>' +
        '<g clip-path="url(#' + u + 'g)">' + scene + grime + '</g><path d="' + G + '" fill="none" stroke="#0b1324" stroke-width="5"/>' +
        '<path d="M0 180 L320 180 L320 200 L0 200 Z" fill="#1a2440" stroke="#2b3a63" stroke-width="3"/>',
        lg(u + "sky", "#0e2a52", "#3a8cd0", true) + '<clipPath id="' + u + 'g"><path d="' + G + '"/></clipPath>');
    },
    flat: function (af, u) {
      var body = '<path d="M0 0 H320 V64 Q298 64 286 74 Q252 24 150 24 Q48 24 14 74 Q6 64 0 64 Z" fill="#1a2440" stroke="#2b3a63" stroke-width="4"/>';
      var tire, gauge, nail = "";
      if (af) {
        tire = '<circle cx="150" cy="110" r="73" fill="#15171c" stroke="#3a4560" stroke-width="2"/><circle cx="150" cy="110" r="68" fill="none" stroke="#2a2e36" stroke-width="7" stroke-dasharray="7 7"/><circle cx="150" cy="110" r="54" fill="#22252c"/>' + wheelRim(150, 110, 40, u) +
          '<circle cx="207" cy="156" r="4" fill="' + A + '"/>';
        gauge = '<path d="M248 62 L270 40" stroke="' + GOOD + '" stroke-width="3.5" stroke-linecap="round"/><text x="268" y="88" text-anchor="middle" font-family="Rajdhani,sans-serif" font-weight="700" font-size="12" fill="' + GOOD + '">35 PSI</text>' +
          '<path d="M282 22 l5 5 10 -11" fill="none" stroke="' + GOOD + '" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>';
      } else {
        body = '<g transform="translate(0 10) rotate(2 150 40)">' + body + "</g>";
        tire = '<path d="M150 50 C204 50 226 90 226 128 C226 160 226 176 240 185 L60 185 C74 176 74 160 74 128 C74 90 96 50 150 50 Z" fill="#15171c" stroke="#3a4560" stroke-width="2"/>' +
          '<path d="M150 70 C188 70 206 98 206 128 C206 156 200 170 214 178 L86 178 C100 170 94 156 94 128 C94 98 112 70 150 70 Z" fill="#22252c"/>' + wheelRim(150, 128, 40, u);
        nail = '<g transform="rotate(28 88 168)"><rect x="86" y="156" width="4" height="16" fill="#9aa3b2"/><rect x="82" y="153" width="12" height="4" rx="2" fill="#c7ced9"/></g>' +
          '<g fill="none" stroke="#ffffffaa" stroke-width="2" stroke-linecap="round"><path d="M58 150 q7 -7 14 0"/><path d="M46 140 q9 -9 18 0"/><path d="M34 130 q11 -11 22 0"/></g>';
        gauge = '<path d="M32 62 L20 70" stroke="#ff5c5c" stroke-width="3.5" stroke-linecap="round"/><text x="52" y="88" text-anchor="middle" font-family="Rajdhani,sans-serif" font-weight="700" font-size="12" fill="#ff5c5c">12 PSI</text>';
      }
      return svg(body + '<rect x="0" y="185" width="320" height="15" fill="#141c2e"/><path d="M0 185 H320" stroke="#2b3a63" stroke-width="2"/>' + tire + nail +
        (function (gx) { return '<circle cx="' + gx + '" cy="54" r="27" fill="#0b1324" stroke="#ffffff40" stroke-width="3"/><path d="M' + (gx - 21) + ' 66 A24 24 0 0 1 ' + (gx + 21) + ' 66" fill="none" stroke="#ffffff22" stroke-width="5"/><path d="M' + (gx + 8) + ' 34 A24 24 0 0 1 ' + (gx + 21) + ' 66" fill="none" stroke="' + GOOD + '" stroke-width="5" opacity=".6"/>'; })(af ? 268 : 52) +
        gauge + '<circle cx="' + (af ? 268 : 52) + '" cy="54" r="3.5" fill="#fff"/>', lg(u + "rim", "#eef2f7", "#7d8798"));
    },
    door: function (af, u) {
      var frame = '<path d="M50 94 L84 22 Q88 12 102 12 L264 12 Q280 12 280 28 L282 94 Z" fill="#0d1526" stroke="#2b3a63" stroke-width="6"/>';
      var panel = '<path d="M38 94 L284 94 L294 190 L30 190 Z" fill="url(#' + u + 'p)" stroke="#2b3a63" stroke-width="3"/><path d="M38 94 L284 94" stroke="#0b1324" stroke-width="5"/>';
      var s;
      if (af) {
        s = frame + '<path d="M64 90 L92 26 Q95 20 104 20 L258 20 Q270 20 270 32 L272 90 Z" fill="#8cc4ec" opacity=".5"/>' +
          '<path d="M110 26 L140 26 L112 86 L82 86 Z M150 26 L162 26 L134 86 L122 86 Z" fill="#fff" opacity=".2"/>' + panel +
          '<path d="M40 124 Q160 116 288 124" stroke="#fff" stroke-width="4" opacity=".22" fill="none"/><rect x="206" y="110" width="46" height="10" rx="5" fill="#c7ced9"/>' + spark(110, 150, 6, B);
      } else {
        s = frame + '<path d="M64 90 L88 50 Q92 44 102 44 L258 58 Q270 60 270 70 L272 90 Z" fill="#8cc4ec" opacity=".38"/>' +
          '<g stroke="#fff" stroke-width="1.6" opacity=".85" fill="none" stroke-linecap="round"><path d="M118 66 L92 56"/><path d="M118 66 L150 54"/><path d="M118 66 L160 84"/><path d="M118 66 L106 88"/><path d="M118 66 L76 80"/><path d="M118 66 L140 70"/><path d="M106 60 L112 74 L130 72 L128 60 Z"/><path d="M94 60 L98 80 L142 80 L146 60"/></g>' +
          panel + '<ellipse cx="122" cy="146" rx="38" ry="20" fill="url(#' + u + 'd)"/><path d="M92 140 Q122 128 152 142 M100 154 Q124 162 146 152" stroke="#0b1324" stroke-width="2" opacity=".6" fill="none"/>' +
          '<g stroke="#c9d3e6" stroke-width="1.5" opacity=".7"><path d="M50 172 L150 164"/><path d="M56 178 L140 172"/><path d="M70 184 L156 176"/></g>' +
          '<rect x="206" y="110" width="46" height="10" rx="5" fill="#8a93a3" transform="rotate(24 210 115)"/><circle cx="118" cy="66" r="3" fill="#fff"/>';
      }
      return svg(s, lg(u + "p", "#2d5aa0", "#16305e", true) + rg(u + "d", "#05080f", "#2d5aa000"));
    },
    sound: function (af, u) {
      var car = '<path d="M14 150 L22 122 Q30 106 62 102 L104 98 L140 64 Q150 56 170 56 L232 56 Q252 56 266 76 L284 98 Q306 102 308 120 L308 150 Z" fill="#0f1a30" stroke="' + B + '" stroke-width="2" opacity=".9"/>' +
        '<path d="M110 98 L144 66 Q150 62 162 62 L190 62 L190 98 Z M198 62 L232 62 Q246 62 256 76 L270 98 L198 98 Z" fill="#162746" stroke="' + B + '55" stroke-width="1.5"/>' +
        '<g fill="#0b1324" stroke="' + B + '" stroke-width="2"><circle cx="76" cy="152" r="22"/><circle cx="254" cy="152" r="22"/></g>' +
        '<path d="M152 140 L160 100 L172 102 L166 140 Z M214 140 L220 100 L232 102 L228 140 Z" fill="#24304c"/><path d="M146 140 H182 M208 140 H240" stroke="#24304c" stroke-width="6"/>';
      var s = car;
      if (af) {
        s += '<g fill="none" stroke="' + A + '" stroke-width="1.6" stroke-dasharray="3 3" opacity=".8"><path d="M106 100 Q120 120 128 128"/><path d="M106 100 Q190 116 270 128"/><path d="M270 128 Q260 100 246 86"/><path d="M270 128 Q220 150 186 158"/></g>' +
          waves(128, 128, 9, B, -1) + waves(246, 86, 8, B, 1) + waves(170, 160, 8, B, 1) +
          '<circle cx="128" cy="128" r="11" fill="#111827" stroke="' + A + '" stroke-width="3"/><circle cx="128" cy="128" r="4" fill="' + B + '"/>' +
          '<ellipse cx="246" cy="86" rx="11" ry="6" fill="#111827" stroke="' + A + '" stroke-width="3"/><ellipse cx="246" cy="86" rx="4" ry="2" fill="' + B + '"/>' +
          '<rect x="150" y="148" width="40" height="20" rx="4" fill="#111827" stroke="' + A + '" stroke-width="2"/><circle cx="170" cy="158" r="8" fill="#1f2937" stroke="' + B + '" stroke-width="2.5"/>' +
          '<rect x="258" y="120" width="28" height="15" rx="3" fill="#1f2937" stroke="' + A + '" stroke-width="2"/><circle cx="280" cy="127" r="2.5" fill="' + GOOD + '"/>' +
          '<rect x="96" y="92" width="20" height="10" rx="2" fill="' + B + '" opacity=".95"/>';
      } else {
        s += '<circle cx="128" cy="128" r="7" fill="#2a2f3a" stroke="#4b5363" stroke-width="2"/><path d="M124 124 L131 129 L126 133" stroke="#0b1324" stroke-width="1.6" fill="none"/>' +
          '<path d="M138 120 l4 -4 3 6 4 -6 3 6" stroke="#ff5c5c" stroke-width="2" fill="none" stroke-linejoin="round"/>' +
          '<ellipse cx="246" cy="86" rx="6" ry="3.5" fill="#2a2f3a" stroke="#4b5363" stroke-width="2"/>' +
          '<rect x="150" y="148" width="40" height="20" rx="4" fill="none" stroke="#4b5363" stroke-width="1.5" stroke-dasharray="4 4"/>' +
          '<rect x="96" y="92" width="20" height="10" rx="2" fill="#2a2f3a"/><g stroke="#ff5c5c" stroke-width="3" stroke-linecap="round"><path d="M276 30 l12 12 M288 30 l-12 12"/></g>';
      }
      return svg(s);
    },
    oil: function (af, u) {
      var drop = "M170 26 C170 26 116 92 116 126 A54 54 0 0 0 224 126 C224 92 170 26 170 26 Z";
      var s = '<path d="' + drop + '" fill="url(#' + u + 'o)" stroke="#ffffff22" stroke-width="2"/>';
      s += af ? '<ellipse cx="148" cy="118" rx="10" ry="20" fill="#fff" opacity=".45" transform="rotate(20 148 118)"/><circle cx="196" cy="150" r="4" fill="#fff" opacity=".35"/><circle cx="184" cy="162" r="2.5" fill="#fff" opacity=".3"/>' + spark(236, 50, 8, B)
        : '<g fill="#3b2c16"><circle cx="150" cy="130" r="8"/><circle cx="186" cy="146" r="11"/><circle cx="174" cy="104" r="6"/><circle cx="200" cy="120" r="5"/></g><path d="M134 150 Q160 160 190 170" stroke="#000" stroke-width="5" opacity=".4" fill="none"/>';
      var tip = af ? '<rect x="22" y="146" width="28" height="7" fill="#e8a83a"/>' : '<path d="M18 144 H64 Q70 150 64 156 H18 Z" fill="#140d05"/><circle cx="54" cy="160" r="3" fill="#140d05"/>';
      s += '<g transform="rotate(-24 70 150)"><rect x="18" y="146" width="122" height="7" rx="3" fill="#c7ced9"/>' + tip +
        '<path d="M30 142 V157 M46 142 V157" stroke="#0b1324" stroke-width="2"/><circle cx="146" cy="149.5" r="9" fill="none" stroke="' + A + '" stroke-width="4"/></g>';
      return svg(s, af ? lg(u + "o", "#ffd36b", "#c9760f", true) : lg(u + "o", "#2b2011", "#090603", true));
    },
    battery: function (af, u) {
      var s = '<rect x="64" y="76" width="192" height="106" rx="10" fill="#1b2233" stroke="#2b3a63" stroke-width="3"/><rect x="60" y="64" width="200" height="22" rx="6" fill="#232c42" stroke="#2b3a63" stroke-width="3"/>' +
        '<rect x="96" y="48" width="24" height="18" rx="3" fill="' + (af ? "#b8bec9" : "#6b6f78") + '"/><rect x="200" y="48" width="24" height="18" rx="3" fill="' + (af ? "#b8bec9" : "#6b6f78") + '"/>';
      if (af) {
        s += '<path d="M92 56 H124 V64 H92 Z" fill="#e2483d"/><path d="M196 56 H228 V64 H196 Z" fill="#111"/><circle cx="108" cy="52" r="3" fill="#eef2f7"/><circle cx="212" cy="52" r="3" fill="#eef2f7"/>' +
          '<rect x="64" y="104" width="192" height="12" fill="' + A + '"/><path d="M168 122 L150 150 H164 L156 172 L180 140 H166 L174 122 Z" fill="' + B + '"/>' +
          '<circle cx="232" cy="140" r="9" fill="' + GOOD + '"/><text x="92" y="160" font-family="Rajdhani,sans-serif" font-weight="700" font-size="20" fill="' + GOOD + '">12.7V</text>';
      } else {
        s += '<g fill="#d9e8c9"><circle cx="100" cy="50" r="9"/><circle cx="114" cy="44" r="8"/><circle cx="122" cy="56" r="7"/><circle cx="204" cy="46" r="7"/><circle cx="220" cy="52" r="9"/></g>' +
          '<g fill="#8fc9a1"><circle cx="108" cy="58" r="6"/><circle cx="94" cy="62" r="5"/><circle cx="214" cy="60" r="6"/><circle cx="226" cy="44" r="5"/></g>' +
          '<g fill="#f2f6ec"><circle cx="104" cy="44" r="3"/><circle cx="218" cy="48" r="3"/></g>' +
          '<rect x="64" y="104" width="192" height="12" fill="#4b5363"/><path d="M200 80 L212 120 L204 150" stroke="#0b1324" stroke-width="2.5" fill="none"/>' +
          '<circle cx="232" cy="140" r="9" fill="#3a3f4a"/><text x="92" y="160" font-family="Rajdhani,sans-serif" font-weight="700" font-size="20" fill="#ff5c5c">11.9V</text>';
      }
      return svg(s);
    },
    cel: function (af, u) {
      function gauge(cx, ang) {
        var a = ang * Math.PI / 180, g = '<circle cx="' + cx + '" cy="96" r="52" fill="#0a0f1c" stroke="#2b3a63" stroke-width="3"/>';
        for (var i = 0; i <= 8; i++) { var b = (135 + i * 33.75) * Math.PI / 180; g += '<path d="M' + (cx + Math.cos(b) * 42).toFixed(1) + " " + (96 + Math.sin(b) * 42).toFixed(1) + " L" + (cx + Math.cos(b) * 48).toFixed(1) + " " + (96 + Math.sin(b) * 48).toFixed(1) + '" stroke="#ffffff55" stroke-width="2"/>'; }
        return g + '<path d="M' + cx + ' 96 L' + (cx + Math.cos(a) * 38).toFixed(1) + " " + (96 + Math.sin(a) * 38).toFixed(1) + '" stroke="' + A + '" stroke-width="3" stroke-linecap="round"/><circle cx="' + cx + '" cy="96" r="4" fill="' + A + '"/>';
      }
      var eng = '<path d="M6 12 H14 V6 H32 V12 H38 L44 7 H48 V31 H44 L38 26 H34 V34 H12 L6 28 H2 V12 Z" fill="' + (af ? "#2a3346" : "#ffb000") + '"/>';
      var s = '<rect x="12" y="30" width="296" height="150" rx="40" fill="#060a14" stroke="#1d2b4a" stroke-width="3"/>' + gauge(80, af ? 200 : 210) + gauge(240, af ? 250 : 170);
      if (af) s += '<g transform="translate(136 128)">' + eng + '</g><rect x="122" y="168" width="76" height="18" rx="9" fill="' + GOOD + '22" stroke="' + GOOD + '"/><text x="160" y="181" text-anchor="middle" font-family="Rajdhani,sans-serif" font-weight="700" font-size="11" fill="' + GOOD + '">NO CODES ✓</text>';
      else s += '<circle cx="160" cy="146" r="34" fill="url(#' + u + 'gl)"/><g transform="translate(136 128)">' + eng + '</g><text x="160" y="181" text-anchor="middle" font-family="Rajdhani,sans-serif" font-weight="700" font-size="12" fill="#ffb000">P0301</text>';
      return svg(s, rg(u + "gl", "#ffb00088", "#ffb00000"));
    },
    ac: function (af, u) {
      var s = '<rect x="30" y="40" width="96" height="120" rx="16" fill="#121b2e" stroke="#2b3a63" stroke-width="3"/>' +
        [62, 82, 102, 122, 142].map(function (y) { return '<path d="M42 ' + y + ' H114" stroke="#2b3a63" stroke-width="6" stroke-linecap="round"/>'; }).join("");
      var ys = [64, 88, 112, 136];
      if (af) {
        s += ys.map(function (y) { return '<path d="M134 ' + y + ' C180 ' + (y - 6) + " 220 " + (y + 6) + " 270 " + y + '" stroke="' + B + '" stroke-width="4" fill="none" stroke-linecap="round" opacity=".85"/><path d="M262 ' + (y - 6) + " L272 " + y + " L262 " + (y + 6) + '" stroke="' + B + '" stroke-width="3" fill="none"/>'; }).join("") +
          [[200, 40], [240, 160], [176, 156], [292, 64]].map(function (q) { var x = q[0], y = q[1]; return '<g stroke="#dff7ff" stroke-width="2" stroke-linecap="round"><path d="M' + (x - 7) + " " + y + " H" + (x + 7) + '"/><path d="M' + (x - 4) + " " + (y - 6) + " L" + (x + 4) + " " + (y + 6) + '"/><path d="M' + (x + 4) + " " + (y - 6) + " L" + (x - 4) + " " + (y + 6) + '"/></g>'; }).join("") +
          '<text x="300" y="30" text-anchor="end" font-family="Orbitron,sans-serif" font-weight="800" font-size="20" fill="' + B + '">38°F</text>';
      } else {
        s += ys.map(function (y, i) { return '<path d="M134 ' + y + " q12 -10 24 0 t24 0 t24 0 t24 0 t24 0" + '" stroke="' + (i % 2 ? "#ff5c5c" : A) + '" stroke-width="4" fill="none" stroke-linecap="round" opacity=".75"/>'; }).join("") +
          '<circle cx="146" cy="176" r="8" fill="' + GOLD + '"/><g stroke="' + GOLD + '" stroke-width="2.5" stroke-linecap="round"><path d="M146 160 V163 M130 176 H133 M159 176 H162 M135 165 L137 167 M157 165 L155 167"/></g>' +
          '<text x="152" y="30" text-anchor="end" font-family="Orbitron,sans-serif" font-weight="800" font-size="20" fill="#ff7a5c">88°F</text>';
      }
      return svg(s);
    },
    plugs: function (af, u) {
      var cer = af ? "#f2f5fa" : "#b7aa92", met = af ? "url(#" + u + "m)" : "#6e5f4d";
      var s = '<rect x="26" y="90" width="30" height="20" rx="4" fill="' + met + '"/><rect x="54" y="82" width="98" height="36" rx="14" fill="' + cer + '"/>' +
        [72, 88, 104, 120].map(function (x) { return '<path d="M' + x + ' 83 V117" stroke="' + (af ? "#d7dde8" : "#9b8f78") + '" stroke-width="3"/>'; }).join("") +
        '<path d="M150 74 H192 V126 H150 Z" fill="' + met + '" stroke="#0b1324" stroke-width="2"/><path d="M164 74 V126 M178 74 V126" stroke="#0b1324" stroke-width="1.5" opacity=".5"/>' +
        '<rect x="192" y="86" width="56" height="28" fill="' + met + '"/>' + [198, 206, 214, 222, 230, 238].map(function (x) { return '<path d="M' + x + ' 86 L' + (x + 6) + ' 114" stroke="#0b1324" stroke-width="2" opacity=".55"/>'; }).join("") +
        '<rect x="248" y="96" width="14" height="8" fill="#c7ced9"/>';
      if (af) s += '<path d="M262 92 H284 V100" stroke="#c7ced9" stroke-width="6" fill="none"/><path d="M266 100 L272 94 L276 100 L282 94" stroke="' + B + '" stroke-width="2.5" fill="none"/><circle cx="274" cy="98" r="14" fill="url(#' + u + 'sp)"/>' + spark(60, 50, 7, B);
      else s += '<path d="M262 82 H290 V96" stroke="#6e5f4d" stroke-width="6" fill="none"/><ellipse cx="262" cy="100" rx="12" ry="9" fill="#141009"/><ellipse cx="288" cy="98" rx="7" ry="6" fill="#141009"/><g fill="#8a6a44" opacity=".7"><circle cx="90" cy="96" r="6"/><circle cx="128" cy="108" r="5"/></g>';
      return svg(s, lg(u + "m", "#eef2f7", "#7d8798", true) + rg(u + "sp", B + "aa", B + "00"));
    },
    susp: function (af, u) {
      var col = af ? A : "#7a5a3c", sh = af ? "url(#" + u + "m)" : "#2a2a30";
      var s = '<rect x="110" y="20" width="100" height="12" rx="4" fill="#4b5363"/><rect x="154" y="30" width="12" height="34" fill="' + (af ? "url(#" + u + "m)" : "#6e6a62") + '"/>' +
        '<rect x="146" y="62" width="28" height="104" rx="6" fill="' + sh + '"/><circle cx="160" cy="178" r="11" fill="none" stroke="#4b5363" stroke-width="7"/>';
      for (var i = 0; i < 7; i++) { if (!af && i === 4) continue; s += '<ellipse cx="160" cy="' + (46 + i * 15) + '" rx="36" ry="6" fill="none" stroke="' + col + '" stroke-width="7"/>'; }
      if (af) s += '<path d="M152 70 V150" stroke="#fff" stroke-width="3" opacity=".4"/>' +
        '<g transform="translate(232 150)"><path d="M0 14 L8 2 H48 L58 14 Z" fill="#24345c"/><circle cx="12" cy="16" r="5" fill="#0b1324" stroke="#fff"/><circle cx="46" cy="16" r="5" fill="#0b1324" stroke="#fff"/><path d="M-4 24 H64" stroke="' + GOOD + '" stroke-width="2"/></g><path d="M256 132 l5 5 10 -11" stroke="' + GOOD + '" stroke-width="3" fill="none"/>';
      else s += '<g fill="#c96b2c" opacity=".8"><circle cx="132" cy="62" r="3"/><circle cx="190" cy="92" r="3.5"/><circle cx="140" cy="122" r="2.5"/></g>' +
        '<path d="M170 96 Q172 130 168 160" stroke="#120d06" stroke-width="7" fill="none" opacity=".9"/><path d="M168 166 q-4 8 0 10 q4 -2 0 -10" fill="#120d06"/><path d="M162 186 q-3 6 0 8 q3 -2 0 -8" fill="#120d06"/>' +
        '<g transform="translate(232 150) rotate(-8 30 16)"><path d="M0 14 L8 2 H48 L58 14 Z" fill="#3a3f4a"/><circle cx="12" cy="16" r="5" fill="#0b1324" stroke="#9aa3b2"/><circle cx="46" cy="18" r="5" fill="#0b1324" stroke="#9aa3b2"/></g><path d="M236 128 q10 -8 20 0 q10 8 20 0" stroke="#ff5c5c" stroke-width="2.5" fill="none"/>';
      return svg(s, lg(u + "m", "#eef2f7", "#7d8798"));
    },
    tail: function (af, u) {
      var H = "M58 38 L252 38 Q282 38 282 68 L282 148 Q282 172 258 172 L58 172 Q38 172 38 150 L38 58 Q38 38 58 38 Z";
      var L = "M66 52 L248 52 Q268 52 268 72 L268 144 Q268 158 254 158 L66 158 Q52 158 52 144 L52 66 Q52 52 66 52 Z";
      var s = '<path d="' + H + '" fill="#1a2440" stroke="#2b3a63" stroke-width="4"/><path d="' + L + '" fill="' + (af ? "url(#" + u + "r)" : "#4a1218") + '"/>';
      if (af) s += [76, 98, 120].map(function (y) { return '<rect x="76" y="' + y + '" width="170" height="10" rx="5" fill="#ffd5d5" opacity=".9"/>'; }).join("") + '<path d="M66 60 L120 60 L88 150 L60 150 Z" fill="#fff" opacity=".12"/><rect x="40" y="30" width="240" height="150" fill="url(#' + u + 'gl)"/>';
      else s += '<rect x="52" y="52" width="216" height="106" fill="#fff" opacity=".07"/><path d="M210 52 L268 52 L268 100 L246 92 L236 104 L224 80 L214 86 Z" fill="#0b1324"/>' +
        '<g stroke="#ffb3b3" stroke-width="1.6" opacity=".75" fill="none" stroke-linecap="round"><path d="M150 100 L110 70"/><path d="M150 100 L196 76"/><path d="M150 100 L178 150"/><path d="M150 100 L96 136"/><path d="M150 100 L220 120"/></g><circle cx="100" cy="104" r="12" fill="#7a2a2a" opacity=".6"/>';
      return svg(s, lg(u + "r", "#ff4b4b", "#a3001a", true) + rg(u + "gl", "#ff3b3b33", "#ff3b3b00"));
    },
    exhaust: function (af, u) {
      var s;
      if (af) s = '<rect x="0" y="98" width="70" height="18" fill="url(#' + u + 'm)"/><rect x="62" y="70" width="170" height="72" rx="34" fill="url(#' + u + 'm)" stroke="#ffffff40" stroke-width="2"/>' +
        '<path d="M96 72 V140 M198 72 V140" stroke="#5b6475" stroke-width="2"/><rect x="230" y="96" width="56" height="20" fill="url(#' + u + 'm)"/><ellipse cx="290" cy="106" rx="8" ry="14" fill="#c7ced9" stroke="#5b6475" stroke-width="2"/><ellipse cx="290" cy="106" rx="4" ry="8" fill="#0b1324"/>' +
        '<rect x="56" y="94" width="10" height="26" rx="3" fill="' + A + '"/><rect x="236" y="92" width="10" height="28" rx="3" fill="' + A + '"/><path d="M80 82 Q150 74 214 82" stroke="#fff" stroke-width="4" opacity=".5" fill="none"/>' + spark(256, 70, 7, B);
      else s = '<g transform="rotate(5 150 106)"><rect x="0" y="98" width="70" height="18" fill="#5a3a22"/><rect x="62" y="70" width="170" height="72" rx="34" fill="url(#' + u + 'r)"/>' +
        '<g fill="#c96b2c" opacity=".85"><circle cx="96" cy="88" r="6"/><circle cx="178" cy="120" r="8"/><circle cx="208" cy="86" r="5"/><circle cx="120" cy="128" r="4"/></g>' +
        '<path d="M140 116 l8 -6 12 4 8 10 -10 6 -14 -2 Z" fill="#05080f"/><rect x="230" y="98" width="56" height="18" fill="#5a3a22"/></g>' +
        '<g fill="#9aa3b2"><circle cx="160" cy="160" r="10" opacity=".45"/><circle cx="176" cy="176" r="13" opacity=".35"/><circle cx="196" cy="186" r="16" opacity=".25"/><circle cx="296" cy="96" r="9" opacity=".4"/><circle cx="306" cy="80" r="12" opacity=".3"/></g>' +
        '<path d="M112 40 V64" stroke="#5b6475" stroke-width="4"/><path d="M212 40 V52" stroke="#5b6475" stroke-width="4"/>';
      return svg(s, lg(u + "m", "#f4f7fb", "#7d8798", true) + lg(u + "r", "#7a4a26", "#3a2414", true));
    },
    body: function (af, u) {
      var s = '<path d="M0 54 Q110 34 240 42 L320 48 V200 H0 Z" fill="url(#' + u + 'p)"/><circle cx="104" cy="206" r="60" fill="#0b1324" stroke="#2b3a63" stroke-width="5"/><circle cx="104" cy="206" r="50" fill="#15171c"/>' +
        '<path d="M0 104 Q160 92 320 100" stroke="#0b1324" stroke-width="2" opacity=".5" fill="none"/>';
      if (af) s += '<path d="M10 80 Q170 62 320 74" stroke="#fff" stroke-width="7" opacity=".3" fill="none"/><path d="M180 132 Q250 126 316 132" stroke="#fff" stroke-width="3" opacity=".18" fill="none"/>' + spark(232, 118, 8, "#fff") + spark(280, 64, 5, B);
      else s += '<ellipse cx="96" cy="84" rx="44" ry="22" fill="url(#' + u + 'd)"/><path d="M58 78 Q96 62 136 80 M66 96 Q98 106 128 94" stroke="#9fb6dd" stroke-width="1.6" opacity=".6" fill="none"/>' +
        '<g stroke="#d7deea" stroke-width="1.6" opacity=".8" stroke-linecap="round"><path d="M10 124 L150 116"/><path d="M18 132 L140 124"/><path d="M30 140 L156 130"/><path d="M168 126 L196 122"/></g>' +
        '<g fill="#c9d3e6"><path d="M60 128 l8 -3 4 5 -6 4 Z"/><path d="M118 120 l6 -2 3 4 -5 3 Z"/></g>';
      return svg(s, lg(u + "p", "#2f62b0", "#14305e", true) + rg(u + "d", "#05080fcc", "#2f62b000"));
    },
    paint: function (af, u) {
      var hood = "M10 196 L42 40 Q48 26 66 26 L254 26 Q272 26 278 40 L310 196 Z";
      var s = '<path d="' + hood + '" fill="url(#' + u + 'p)" stroke="#2b3a63" stroke-width="3"/>';
      if (af) s += '<g clip-path="url(#' + u + 'c)"><path d="M40 70 Q160 40 290 70" stroke="#fff" stroke-width="10" opacity=".28" fill="none"/><path d="M30 110 Q160 84 300 110" stroke="#fff" stroke-width="4" opacity=".18" fill="none"/>' +
        [[90, 140], [120, 156], [200, 150], [236, 132], [170, 170], [264, 168], [70, 168]].map(function (q) { return '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="4.5" fill="#ffffff30" stroke="#ffffff70" stroke-width="1"/><circle cx="' + (q[0] - 1.5) + '" cy="' + (q[1] - 1.5) + '" r="1.3" fill="#fff"/>'; }).join("") + "</g>" + spark(244, 56, 8, "#fff") + spark(104, 92, 5, B);
      else s += '<g clip-path="url(#' + u + 'c)"><rect width="320" height="200" fill="#a7a29a" opacity=".38"/>' +
        [[110, 90], [210, 120], [160, 160]].map(function (q) { return [14, 24, 34, 44].map(function (r) { return '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="' + r + '" fill="none" stroke="#fff" stroke-width="1" opacity=".16"/>'; }).join(""); }).join("") +
        '<g fill="none" stroke="#e8e2d6" stroke-width="1.2" opacity=".5"><circle cx="80" cy="140" r="4"/><circle cx="236" cy="70" r="5"/><circle cx="262" cy="160" r="3.5"/><circle cx="140" cy="60" r="3"/></g>' +
        '<g fill="#6b5a44" opacity=".4"><circle cx="190" cy="176" r="3"/><circle cx="60" cy="182" r="4"/><circle cx="286" cy="186" r="3"/></g></g>';
      return svg(s, lg(u + "p", af ? "#c22a3c" : "#7a3a40", af ? "#4d0a16" : "#3d2226", true) + '<clipPath id="' + u + 'c"><path d="' + hood + '"/></clipPath>');
    }
  };

  var uidN = 0;
  function artFor(c, af) {
    if (c.legacy) return M.art(c.legacy, af);
    return ART[c.id](af, "ba" + (++uidN) + (af ? "a" : "b"));
  }
  function wiperSvg() {
    return '<svg class="bax-wp" viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><g class="bax-arm">' +
      '<path d="M160 214 L160 120" stroke="#0b0f18" stroke-width="5" stroke-linecap="round"/><rect x="156.5" y="24" width="7" height="122" rx="3.5" fill="#0b0f18" stroke="#3a4560" stroke-width="1.5"/>' +
      '<circle cx="160" cy="100" r="14" fill="#fff"/><path d="M152 100 h16 M152 100 l4 -4 M152 100 l4 4 M168 100 l-4 -4 M168 100 l-4 4" stroke="#0b1324" stroke-width="2.2" stroke-linecap="round"/></g></svg>';
  }

  /* ---------- render ---------- */
  var root = null, io = null;
  function priceOf(c) { return M.price({ svc: c.svc, opt: c.opt }).lo; }
  function cardHTML(c, i) {
    var ph = PH[c.id], photo = ph && ph.before && ph.after, s = M.svc(c.svc), o = M.opt(c.svc, c.opt);
    if (!s || !o) return "";
    var name = p(c.title), bf = photo ? '<img src="' + esc(ph.before) + '" alt="' + esc(name + " – " + t("before")) + '" loading="lazy" draggable="false">' : artFor(c, false),
      af = photo ? '<img src="' + esc(ph.after) + '" alt="' + esc(name + " – " + t("after")) + '" loading="lazy" draggable="false">' : artFor(c, true),
      wp = !photo && c.wiper;
    return '<article class="bax" data-i="' + i + '"><div class="bax-cmp' + (wp ? " wipe" : "") + '" role="slider" tabindex="0" aria-label="' + esc(name + ": " + t("before") + " / " + t("after")) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50" aria-valuetext="' + esc(tx("vt", 50)) + '" style="--x:50%">' +
      '<div class="bax-l">' + bf + '</div><div class="bax-l bax-a">' + af + "</div>" + (wp ? wiperSvg() : '<span class="bax-hd"></span>') +
      '<span class="bax-lb l">' + t("before") + '</span><span class="bax-lb r">' + t("after") + "</span>" + (photo ? "" : '<span class="bax-tag">' + t("baDemo") + "</span>") + "</div>" +
      '<div class="bax-ft"><div class="bax-tt"><b>' + esc(name) + "</b><small>" + esc(p(o.name)) + '</small></div><div class="bax-go"><span class="bax-pr">' + t("from", { p: M.money(priceOf(c)) }) + "</span>" +
      '<button type="button" class="btn primary small" data-book="' + i + '">' + esc(tx("book")) + "</button></div></div></article>";
  }
  function render(el) {
    root = el || root; if (!root) return;
    loop.stop();
    root.innerHTML = CARDS.map(cardHTML).join("");
    var hint = root.parentNode && root.parentNode.querySelector(".bax-hint");
    if (root.parentNode && !hint) { hint = D.createElement("p"); hint.className = "bax-hint"; root.parentNode.insertBefore(hint, root); }
    if (hint) hint.textContent = tx("count", root.querySelectorAll(".bax").length) + " · " + tx("swipe");
    if (!root._baBound) { bind(root); root._baBound = true; }
    root.querySelectorAll(".bax-cmp.wipe").forEach(function (cmp) { setV(cmp, 50); loop.watch(cmp); });
  }

  /* ---------- slider ---------- */
  var MAXA = 88;
  function f(n) { return (Math.round(n * 100) / 100) + "%"; }
  function wipe(cmp, armV, clipV, op) {
    var th = (armV - 50) / 50 * MAXA * Math.PI / 180, ct = (clipV - 50) / 50 * MAXA * Math.PI / 180;
    var arm = cmp.querySelector(".bax-arm"); if (arm) arm.setAttribute("transform", "rotate(" + (th * 180 / Math.PI).toFixed(2) + " 160 214)");
    var P = [160, 214], L = 2000, d = [Math.sin(ct), -Math.cos(ct)], n = [Math.cos(ct), Math.sin(ct)];
    var pts = [[P[0] - L * d[0], P[1] - L * d[1]], [P[0] + L * d[0], P[1] + L * d[1]], [P[0] + L * d[0] + L * n[0], P[1] + L * d[1] + L * n[1]], [P[0] - L * d[0] + L * n[0], P[1] - L * d[1] + L * n[1]]];
    var a = cmp.querySelector(".bax-a");
    a.style.clipPath = "polygon(" + pts.map(function (q) { return f(q[0] / 3.2) + " " + f(q[1] / 2); }).join(",") + ")";
    a.style.opacity = op == null ? "" : op;
  }
  function setV(cmp, v) {
    v = Math.max(0, Math.min(100, v)); cmp._v = v;
    cmp.style.setProperty("--x", v + "%");
    var r = Math.round(v), shown = 100 - r;
    cmp.setAttribute("aria-valuenow", r); cmp.setAttribute("aria-valuetext", tx("vt", shown));
    if (cmp.classList.contains("wipe")) wipe(cmp, v, v, null);
  }
  function fromX(cmp, x) { var b = cmp.getBoundingClientRect(); setV(cmp, (x - b.left) / b.width * 100); }

  function bind(el) {
    var st = null, raf = 0, pendX = 0;
    function apply() { raf = 0; if (st) fromX(st.cmp, pendX); }
    function queue(x) { pendX = x; if (!raf) raf = requestAnimationFrame(apply); }
    el.addEventListener("pointerdown", function (e) {
      var cmp = e.target.closest(".bax-cmp"); if (!cmp || (e.pointerType === "mouse" && e.button !== 0)) return;
      loop.touch(cmp);
      st = { cmp: cmp, id: e.pointerId, x0: e.clientX, y0: e.clientY, drag: e.pointerType === "mouse", touch: e.pointerType !== "mouse" };
      if (st.drag) { e.preventDefault(); try { cmp.setPointerCapture(e.pointerId); } catch (er) {} queue(e.clientX); }
    });
    el.addEventListener("pointermove", function (e) {
      if (!st || e.pointerId !== st.id) return;
      var dx = e.clientX - st.x0, dy = e.clientY - st.y0;
      if (!st.drag) {
        if (Math.abs(dx) > 5 && Math.abs(dx) > Math.abs(dy)) { st.drag = true; try { st.cmp.setPointerCapture(e.pointerId); } catch (er) {} }
        else if (Math.abs(dy) > 8) { st = null; return; }
      }
      if (st.drag) { e.preventDefault(); queue(e.clientX); }
    });
    function end(e) {
      if (!st || (e && e.pointerId !== st.id)) return;
      if (e && e.type === "pointerup" && !st.drag && Math.abs(e.clientX - st.x0) < 6 && Math.abs(e.clientY - st.y0) < 6) fromX(st.cmp, e.clientX); // tap to jump
      st = null;
    }
    el.addEventListener("pointerup", end); el.addEventListener("pointercancel", end);
    /* older iOS: block the horizontal page/carousel pan once a drag owns the gesture; vertical swipes still scroll */
    el.addEventListener("touchmove", function (e) { if (st && st.drag && e.cancelable) e.preventDefault(); }, { passive: false });
    el.addEventListener("dragstart", function (e) { if (e.target.closest(".bax-cmp")) e.preventDefault(); });
    el.addEventListener("keydown", function (e) {
      var cmp = e.target.closest && e.target.closest(".bax-cmp"); if (!cmp || e.target !== cmp) return;
      var v = cmp._v == null ? 50 : cmp._v, k = e.key, nv = null;
      if (k === "ArrowLeft" || k === "ArrowDown") nv = v - 5; else if (k === "ArrowRight" || k === "ArrowUp") nv = v + 5;
      else if (k === "PageDown") nv = v - 20; else if (k === "PageUp") nv = v + 20; else if (k === "Home") nv = 0; else if (k === "End") nv = 100;
      if (nv == null) return;
      e.preventDefault(); loop.touch(cmp); setV(cmp, nv);
    });
    el.addEventListener("click", function (e) {
      var b = e.target.closest("[data-book]"); if (!b) return;
      var c = CARDS[+b.getAttribute("data-book")];
      if (M.openSvc) M.openSvc(c.svc, { opt: c.opt, label: c.title });
      else { var s = D.getElementById("services"); if (s) s.scrollIntoView(); }
    });
  }

  /* ---------- windshield wiper loop: sweeps right-to-left wiping the glass clean, then the grime fades back.
     Runs only while the card is on screen, stops for good once the person touches that slider, never with reduced motion. */
  var loop = (function () {
    var cmp = null, on = false, raf = 0, t0 = 0, touched = false, vis = false;
    var PER = 5200;
    function ease(x) { return x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
    function frame(now) {
      raf = 0; if (!on || !cmp || !cmp.isConnected) return;
      var ph = ((now - t0) % PER) / PER, arm, clip, op = 1;
      if (ph < .3) { arm = clip = 100 - ease(ph / .3) * 100; }            // wipe clean, right to left
      else if (ph < .5) { arm = clip = 0; }                                  // hold clean
      else if (ph < .75) { arm = ease((ph - .5) / .25) * 100; clip = 0; }    // arm parks back, glass stays clean
      else if (ph < .95) { arm = 100; clip = 0; op = 1 - (ph - .75) / .2; } // grime settles back
      else { arm = clip = 100; op = 1; }
      cmp._v = arm; wipe(cmp, arm, clip, op);
      raf = requestAnimationFrame(frame);
    }
    function start() { if (on || touched || RM || !cmp) return; on = true; t0 = performance.now() - PER * .0; raf = requestAnimationFrame(frame); }
    function stop() { on = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
    return {
      watch: function (c) {
        cmp = c; if (RM || touched) return;
        if (!("IntersectionObserver" in W)) { start(); return; }
        if (io) io.disconnect();
        io = new IntersectionObserver(function (en) { vis = en[0].isIntersecting && en[0].intersectionRatio > .5; if (vis) start(); else { stop(); if (cmp) setV(cmp, 50); } }, { threshold: [0, .5, 1] });
        io.observe(c);
      },
      touch: function (c) { if (c !== cmp || touched) return; touched = true; stop(); if (io) io.disconnect(); wipe(c, c._v == null ? 50 : c._v, c._v == null ? 50 : c._v, null); },
      stop: stop,
      start: function () { touched = false; start(); }
    };
  })();

  /* real photo pairs */
  try {
    fetch("beforeafter.json?v=20261013a", { cache: "no-cache" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (!j || !j.items) return;
      var any = false;
      Object.keys(j.items).forEach(function (k) { var it = j.items[k]; if (it && it.before && it.after) { PH[k] = { before: it.before, after: it.after }; any = true; } });
      if (any && root) render(root);
    }).catch(function () {});
  } catch (e) {}

  W.BA = { render: render, cards: CARDS, _loop: loop };
})();
