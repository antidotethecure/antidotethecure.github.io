/* SousShift AI — Mobile Mechanic demo: the tap-the-car diagram (side / front / back SVG + hotspots).
   viewBox 400×210. Side view shows the DRIVER side (front of the car on the left), so its wheels are FL + RL.
   Front view: the car's left (driver) side is on the viewer's right. Back view: the car's left is on the viewer's left.
   Hotspot: { id, svc, x, y, pos?, label:{en,es} }  pos = FL/FR/RL/RR (wheel) or F/R (axle). */
(function () {
  "use strict";
  var DEF = '<defs>' +
    '<linearGradient id="cb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a5878"/><stop offset=".45" stop-color="#232d45"/><stop offset="1" stop-color="#0f1524"/></linearGradient>' +
    '<linearGradient id="cg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9fe9ff" stop-opacity=".55"/><stop offset=".5" stop-color="#1d3b5c" stop-opacity=".85"/><stop offset="1" stop-color="#0b1730"/></linearGradient>' +
    '<radialGradient id="cs" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".6"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>' +
    '<linearGradient id="cl" x1="0" x2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#bfefff"/></linearGradient>' +
    '<linearGradient id="csh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".38"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></linearGradient>' +
    '<linearGradient id="ct" x1="0" x2="1"><stop offset="0" stop-color="#ff3b4e"/><stop offset="1" stop-color="#a3121f"/></linearGradient>' +
    '</defs>';
  function wheel(cx, cy) {
    var sp = ""; for (var i = 0; i < 5; i++) { var a = (i * 72 - 90) * Math.PI / 180; sp += '<path d="M' + cx + " " + cy + " L" + (cx + 14 * Math.cos(a)).toFixed(1) + " " + (cy + 14 * Math.sin(a)).toFixed(1) + '" stroke="#8d99b3" stroke-width="3.5" stroke-linecap="round"/>'; }
    return '<g><circle cx="' + cx + '" cy="' + cy + '" r="26" fill="#0b0e15" stroke="#2a3350" stroke-width="2"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="17" fill="#1b2235" stroke="#b9c4da" stroke-width="2"/>' +
      '<path d="M' + (cx - 11) + " " + (cy - 9) + " A14 14 0 0 1 " + (cx + 6) + " " + (cy - 13) + '" stroke="var(--accent)" stroke-width="5" fill="none" stroke-linecap="round"/>' +
      sp + '<circle cx="' + cx + '" cy="' + cy + '" r="4" fill="#d6deee"/></g>';
  }
  /* Generic body-style silhouettes (no real model is drawn). Every style keeps the wheels at x=95 / x=305 so the
     hotspots line up. body = sedan | suv | truck | coupe | van | hatch (picked from the vPIC body class). */
  var BODY = {
    sedan: { shell: "M24 154 L24 128 Q26 112 46 108 L108 98 Q132 92 150 72 Q166 56 196 54 L262 54 Q292 56 318 90 L360 96 Q378 100 378 118 L378 154 L333 154 A28 28 0 0 0 277 154 L123 154 A28 28 0 0 0 67 154 Z",
      glass: ["M150 90 L166 68 Q176 61 196 61 L224 61 L224 90 Z", "M230 61 L262 61 Q284 63 304 90 L230 90 Z"], belt: "M46 108 L108 98 L360 98", pillars: "M136 98 L132 150 M227 92 L227 150 M290 96 L284 132", tail: "M370 103 L378 106 L378 121 L364 119 Z" },
    hatch: { shell: "M24 154 L24 128 Q26 112 46 108 L108 98 Q132 92 150 72 Q166 56 196 56 L300 56 Q318 58 336 80 L366 100 Q378 104 378 120 L378 154 L333 154 A28 28 0 0 0 277 154 L123 154 A28 28 0 0 0 67 154 Z",
      glass: ["M150 90 L166 68 Q176 62 196 62 L238 62 L238 90 Z", "M244 62 L298 62 Q312 64 326 84 L328 90 L244 90 Z"], belt: "M46 108 L108 98 L340 98", pillars: "M136 98 L132 150 M241 92 L241 150", tail: "M364 100 L376 104 L377 120 L362 118 Z" },
    coupe: { shell: "M24 154 L24 130 Q26 116 46 112 L118 100 Q148 90 170 66 Q186 56 212 56 L250 58 Q284 62 330 96 L364 100 Q378 104 378 120 L378 154 L333 154 A28 28 0 0 0 277 154 L123 154 A28 28 0 0 0 67 154 Z",
      glass: ["M164 94 L182 70 Q190 63 210 63 L240 64 L240 94 Z", "M246 64 Q272 68 296 94 L246 94 Z"], belt: "M46 112 L118 100 L360 100", pillars: "M243 96 L243 150", tail: "M368 104 L378 108 L378 122 L364 120 Z" },
    suv: { shell: "M24 154 L24 124 Q26 108 46 104 L104 96 Q126 86 140 58 Q146 44 170 42 L330 42 Q350 42 356 60 L372 96 Q380 100 380 118 L380 154 L333 154 A28 28 0 0 0 277 154 L123 154 A28 28 0 0 0 67 154 Z",
      glass: ["M142 90 L156 60 Q160 50 174 50 L226 50 L226 90 Z", "M232 50 L290 50 L290 90 L232 90 Z", "M296 50 L326 50 Q338 50 342 62 L352 90 L296 90 Z"], belt: "M46 104 L104 96 L372 96", pillars: "M130 98 L128 150 M229 92 L229 150 M293 92 L291 150", tail: "M370 98 L380 100 L380 122 L366 120 Z" },
    van: { shell: "M20 154 L20 124 Q22 108 40 104 L84 96 Q110 78 132 52 Q144 40 168 40 L350 40 Q370 40 374 60 L380 104 L380 154 L333 154 A28 28 0 0 0 277 154 L123 154 A28 28 0 0 0 67 154 Z",
      glass: ["M134 88 L152 58 Q158 48 172 48 L214 48 L214 88 Z", "M220 48 L276 48 L276 88 L220 88 Z", "M282 48 L348 48 Q362 48 364 62 L368 88 L282 88 Z"], belt: "M40 104 L84 96 L376 96", pillars: "M126 96 L124 150 M217 90 L217 150 M279 90 L279 150", tail: "M372 92 L380 94 L380 124 L370 122 Z" },
    truck: { shell: "M24 154 L24 122 Q26 106 46 104 L120 98 Q132 90 140 62 Q144 48 160 48 L222 48 Q232 48 234 58 L238 104 L380 104 L380 154 L333 154 A28 28 0 0 0 277 154 L123 154 A28 28 0 0 0 67 154 Z",
      glass: ["M146 92 L154 62 Q157 55 166 55 L190 55 L190 92 Z", "M196 55 L224 55 Q228 56 229 62 L231 92 L196 92 Z"], belt: "M46 104 L120 98 L236 98", pillars: "M193 92 L193 150 M238 104 L238 154", tail: "M372 108 L380 108 L380 126 L372 126 Z", bed: "M244 110 L374 110" }
  };
  /* paint: the picked color with a shading overlay, or the default chrome-blue gradient */
  function paint(d, color) {
    return '<path d="' + d + '" fill="' + (color || "url(#cb)") + '" stroke="color-mix(in srgb,var(--accent2) 55%,transparent)" stroke-width="1.5"/>' + (color ? '<path d="' + d + '" fill="url(#csh)"/>' : "");
  }
  function side(body, color) {
    var b = BODY[body] || BODY.sedan;
    return '<svg class="car" viewBox="0 0 400 210" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + (body || "sedan") + ', side view">' + DEF +
      '<ellipse cx="200" cy="181" rx="190" ry="10" fill="url(#cs)"/>' +
      paint(b.shell, color) +
      b.glass.map(function (g) { return '<path d="' + g + '" fill="url(#cg)"/>'; }).join("") +
      '<path d="' + b.belt + '" stroke="#ffffff22" stroke-width="1.5" fill="none"/>' +
      '<path d="M60 120 L370 120" stroke="color-mix(in srgb,var(--accent2) 40%,transparent)" stroke-width="1" fill="none"/>' +
      '<path d="' + b.pillars + '" stroke="#00000066" stroke-width="2" fill="none"/>' +
      (b.bed ? '<path d="' + b.bed + '" stroke="#0009" stroke-width="3" fill="none"/>' : '<rect x="196" y="105" width="18" height="4" rx="2" fill="#aab6cf"/><rect x="258" y="105" width="18" height="4" rx="2" fill="#aab6cf"/>') +
      '<path d="M152 88 l-12 -2 l-5 8 l14 3 z" fill="#2c3753"/>' +
      '<path d="M26 116 Q30 110 48 108 L56 114 Q40 121 26 122 Z" fill="url(#cl)"/>' +
      '<path d="' + b.tail + '" fill="url(#ct)"/>' +
      '<path d="M24 140 L60 140" stroke="#0007" stroke-width="3"/>' +
      '<rect x="356" y="155" width="22" height="7" rx="3.5" fill="#5d6680"/>' +
      wheel(95, 152) + wheel(305, 152) + "</svg>";
  }

  function endView(back, body, color) {
    var tall = body === "suv" || body === "van" || body === "truck", low = body === "coupe";
    var top = tall ? 30 : low ? 52 : 44;   // roof height
    var lights = back
      ? '<path d="M70 106 L126 110 L122 124 L74 122 Z" fill="url(#ct)"/><path d="M330 106 L274 110 L278 124 L326 122 Z" fill="url(#ct)"/>'
      : '<path d="M72 106 L128 112 L124 126 L76 122 Z" fill="url(#cl)"/><path d="M328 106 L272 112 L276 126 L324 122 Z" fill="url(#cl)"/>';
    var mid = back
      ? '<rect x="168" y="124" width="64" height="20" rx="4" fill="#d9dfeb"/><text x="200" y="139" text-anchor="middle" font-family="Orbitron,sans-serif" font-size="11" font-weight="800" fill="#1a2236">DEMO</text>' +
        '<path d="M100 104 L300 104" stroke="#ffffff22" stroke-width="1.5"/><rect x="118" y="160" width="20" height="8" rx="4" fill="#5d6680"/>'
      : '<rect x="146" y="114" width="108" height="30" rx="9" fill="#0b0f18" stroke="color-mix(in srgb,var(--accent2) 45%,transparent)" stroke-width="1.5"/>' +
        '<path d="M154 124 H246 M154 134 H246" stroke="#2a3350" stroke-width="3"/>';
    return '<svg class="car" viewBox="0 0 400 210" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + (body || "sedan") + ", " + (back ? "back" : "front") + ' view">' + DEF +
      '<ellipse cx="200" cy="184" rx="170" ry="10" fill="url(#cs)"/>' +
      '<rect x="74" y="146" width="38" height="36" rx="9" fill="#0b0e15" stroke="#2a3350" stroke-width="2"/><rect x="288" y="146" width="38" height="36" rx="9" fill="#0b0e15" stroke="#2a3350" stroke-width="2"/>' +
      paint("M104 96 L128 " + (top + 8) + " Q132 " + top + " 144 " + top + " L256 " + top + " Q268 " + top + " 272 " + (top + 8) + " L296 96 Z", color) +
      '<path d="M114 92 L134 ' + (top + 12) + " Q137 " + (top + 7) + " 146 " + (top + 7) + " L254 " + (top + 7) + " Q263 " + (top + 7) + " 266 " + (top + 12) + ' L286 92 Z" fill="url(#cg)"/>' +
      (back ? "" : '<path d="M140 90 L196 80 M206 90 L262 80" stroke="#0b0e15" stroke-width="3" stroke-linecap="round"/>') +
      paint("M60 152 L60 118 Q62 98 92 96 L308 96 Q338 98 340 118 L340 152 Q340 162 328 162 L72 162 Q60 162 60 152 Z", color) +
      '<path d="M88 92 l-16 -4 l-4 10 l18 2 z" fill="#2c3753"/><path d="M312 92 l16 -4 l4 10 l-18 2 z" fill="#2c3753"/>' +
      lights + mid +
      '<path d="M66 148 H334" stroke="#0007" stroke-width="3"/></svg>';
  }

  function L(en, es) { return { en: en, es: es }; }
  var HS = {
    side: [
      { id: "s-light", svc: "lights", x: 36, y: 115, label: L("Headlight", "Faro") },
      { id: "s-hood", svc: "engine", x: 80, y: 88, label: L("Hood / engine", "Cofre / motor") },
      { id: "s-fender", svc: "body", opt: "fenderL", x: 66, y: 124, label: L("Front fender", "Salpicadera delantera") },
      { id: "s-mirror", svc: "body", opt: "mirrorL", x: 146, y: 96, label: L("Side mirror", "Espejo lateral") },
      { id: "s-handle", svc: "body", opt: "handle", pos: "RL", x: 266, y: 112, label: L("Door handle", "Manija de puerta") },
      { id: "s-wind", svc: "wipers", x: 134, y: 70, label: L("Windshield / wipers", "Parabrisas / limpiadores") },
      { id: "s-dash", svc: "sound", x: 186, y: 76, label: L("Interior / dash", "Interior / tablero") },
      { id: "s-tint", svc: "tint", x: 264, y: 76, label: L("Windows (tint)", "Ventanas (polarizado)") },
      { id: "s-door", svc: "doors", x: 206, y: 128, label: L("Doors / windows", "Puertas / ventanas") },
      { id: "s-tail", svc: "tail", x: 368, y: 110, label: L("Taillight", "Calavera") },
      { id: "s-exh", svc: "exhaust", x: 368, y: 176, label: L("Exhaust", "Escape") },
      { id: "s-tFL", svc: "tires", x: 95, y: 152, pos: "FL", label: L("Front-left tire", "Llanta del. izq.") },
      { id: "s-bF", svc: "brakes", x: 130, y: 176, pos: "F", label: L("Front brakes", "Frenos delanteros") },
      { id: "s-sF", svc: "susp", x: 128, y: 128, pos: "F", label: L("Front suspension", "Suspensión delantera") },
      { id: "s-tRL", svc: "tires", x: 305, y: 152, pos: "RL", label: L("Rear-left tire", "Llanta tras. izq.") },
      { id: "s-bR", svc: "brakes", x: 270, y: 176, pos: "R", label: L("Rear brakes", "Frenos traseros") },
      { id: "s-sR", svc: "susp", x: 272, y: 128, pos: "R", label: L("Rear suspension", "Suspensión trasera") }
    ],
    front: [
      { id: "f-lR", svc: "lights", x: 100, y: 117, label: L("Headlights", "Faros") },
      { id: "f-lL", svc: "lights", x: 300, y: 117, label: L("Headlights", "Faros") },
      { id: "f-eng", svc: "engine", x: 150, y: 104, label: L("Hood / engine", "Cofre / motor") },
      { id: "f-bat", svc: "battery", x: 250, y: 104, label: L("Battery", "Batería") },
      { id: "f-ac", svc: "ac", x: 232, y: 129, label: L("A/C condenser", "Condensador A/C") },
      { id: "f-grille", svc: "body", opt: "grille", x: 168, y: 129, label: L("Grille", "Parrilla") },
      { id: "f-bump", svc: "body", opt: "bumperF", x: 140, y: 154, label: L("Front bumper", "Defensa delantera") },
      { id: "f-hood", svc: "body", opt: "hood", x: 200, y: 99, label: L("Hood", "Cofre") },
      { id: "f-mR", svc: "body", opt: "mirrorR", x: 66, y: 90, label: L("Passenger mirror", "Espejo del pasajero") },
      { id: "f-mL", svc: "body", opt: "mirrorL", x: 334, y: 90, label: L("Driver mirror", "Espejo del conductor") },
      { id: "f-wip", svc: "wipers", x: 200, y: 70, label: L("Windshield / wipers", "Parabrisas / limpiadores") },
      { id: "f-tFR", svc: "tires", x: 93, y: 168, pos: "FR", label: L("Front-right tire", "Llanta del. der.") },
      { id: "f-tFL", svc: "tires", x: 307, y: 168, pos: "FL", label: L("Front-left tire", "Llanta del. izq.") },
      { id: "f-sus", svc: "susp", x: 200, y: 168, pos: "F", label: L("Front suspension", "Suspensión delantera") }
    ],
    back: [
      { id: "b-lL", svc: "tail", x: 98, y: 116, label: L("Taillights", "Calaveras") },
      { id: "b-lR", svc: "tail", x: 302, y: 116, label: L("Taillights", "Calaveras") },
      { id: "b-tint", svc: "tint", x: 200, y: 70, label: L("Rear window (tint)", "Medallón (polarizado)") },
      { id: "b-sub", svc: "sound", x: 200, y: 108, label: L("Trunk (sub + amp)", "Cajuela (subwoofer)") },
      { id: "b-exh", svc: "exhaust", x: 146, y: 168, label: L("Exhaust", "Escape") },
      { id: "b-bump", svc: "body", opt: "bumperR", x: 200, y: 154, label: L("Rear bumper", "Defensa trasera") },
      { id: "b-tRL", svc: "tires", x: 93, y: 168, pos: "RL", label: L("Rear-left tire", "Llanta tras. izq.") },
      { id: "b-tRR", svc: "tires", x: 307, y: 168, pos: "RR", label: L("Rear-right tire", "Llanta tras. der.") },
      { id: "b-sus", svc: "susp", x: 254, y: 168, pos: "R", label: L("Rear suspension", "Suspensión trasera") }
    ]
  };
  /* small per-body nudges so a hotspot never floats off the drawing */
  var NUDGE = {
    truck: { "s-tint": { x: 212, y: 74 }, "s-dash": { x: 170, y: 76 }, "s-handle": { x: 214, y: 112 }, "b-tint": { x: 200, y: 60 } },
    suv: { "s-wind": { x: 130, y: 66 } }, van: { "s-wind": { x: 122, y: 70 } },
    coupe: { "s-wind": { x: 150, y: 80 }, "s-tint": { x: 268, y: 82 } }
  };
  function hsFor(view, body) {
    var nd = NUDGE[body] || {};
    return HS[view].map(function (h) { var n = nd[h.id]; return n ? Object.assign({}, h, n) : h; });
  }
  var cache = {};
  function svg(view, body, color) {
    body = BODY[body] ? body : "sedan"; color = /^#[0-9a-f]{3,8}$/i.test(color || "") ? color : "";
    var k = view + ":" + body + ":" + color;
    if (!cache[k]) cache[k] = view === "side" ? side(body, color) : endView(view === "back", body, color);
    return cache[k];
  }
  /* tiny badge icon for the picked car */
  function mini(body, color) { return svg("side", body, color).replace('class="car"', 'class="mini" aria-hidden="true"').replace(/role="img" aria-label="[^"]*"/, ""); }
  window.CAR = { svg: svg, hs: hsFor, mini: mini, bodies: Object.keys(BODY) };
})();
