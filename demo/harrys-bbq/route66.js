/* Route 66: Tulsa to Lomita — Harry's Oklahoma Style Smokehouse BBQ (SousShift AI demo, 2026-11-10).
   Harry's own story as a game: drive the smoker rig down Route 66 from Tulsa to Lomita.
   Loop per leg:  DRIVE (grab hickory logs, dry rub, Harry's sauce and meat; dodge tumbleweeds, cones, potholes, slow cars)
             ->   PULL UP at the next town (orders come in on tickets, each with a patience timer)
             ->   SLOW & LOW: hold to feed hickory and keep the needle in the 225-250°F band until the smoke bar fills,
                  then PULL IT at the perfect bark -> SERVE (points for perfection + speed + rub/sauce you brought)
             ->   BACK ON THE ROAD.  6 legs: Tulsa -> OKC -> Amarillo -> Albuquerque -> Flagstaff -> Barstow -> Lomita.
   2D canvas (pseudo-3D road), no libraries. Controls: swipe / tap a side / arrow keys to change lanes; hold the screen,
   Space or Up to stoke the fire; tap / Space to pull. Game controllers via ../gamepad.js (profile "route66", API __R66).
   Kid mode (parent account, see crm.js kidUnlock): slower road, wider zone, more patience, kid-size prizes. */
(function () {
  "use strict";
  var W = window, D = document, $ = function (i) { return D.getElementById(i); };
  var T = function (s) { return (W.__T || String)(s); };
  var cv = $("game"); if (!cv) return;
  var cx = cv.getContext("2d"), VW = 400, VH = 640, DPR = Math.min(2, W.devicePixelRatio || 1);
  cv.width = VW * DPR; cv.height = VH * DPR; cx.setTransform(DPR, 0, 0, DPR, 0, 0);
  var RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var HZ = 236, PY = 566, ZC = 100, ZMAX = 1150, LW = 150, RW = LW * 1.65;   // lanes are wider than the rig (136) so a car or pothole one lane over clears it
  var RED = "#c8232c", RED_D = "#823e2d", GOLD = "#d1902a", CREAM = "#f3e6c8", INK = "#1e140c";
  var DISP = "'Rye','Bebas Neue',Georgia,serif", NUM = "'Bebas Neue',Impact,sans-serif", BODY = "Archivo,system-ui,sans-serif";
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[(Math.random() * a.length) | 0]; }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function mk(w, h, f) { var c = D.createElement("canvas"); c.width = w * 2; c.height = h * 2; var g = c.getContext("2d"); g.scale(2, 2); f(g, w, h); c.w = w; c.h = h; return c; }

  /* ---------------- the route ---------------- */
  var LEGS = [
    { from: "Tulsa, OK", to: "Oklahoma City", st: "OK", stop: "OKC", sky: ["#5d8fd0", "#f4c58a"], sun: "#ffe7a8", far: "#6d7f5a", near: "#4f6b3c", g1: "#5b8a3a", g2: "#55823a", sh: "#a2472c", props: ["derrick", "silo", "fence", "fence"], hills: "rolling", orders: 2 },
    { from: "Oklahoma City", to: "Amarillo", st: "TX", stop: "AMARILLO", sky: ["#4a86d4", "#f7d79a"], sun: "#fff1bf", far: "#a99a6a", near: "#8c7c4c", g1: "#b8a35a", g2: "#ae9a53", sh: "#9a6b3a", props: ["windmill", "silo", "fence", "fence"], hills: "flat", orders: 2 },
    { from: "Amarillo", to: "Albuquerque", st: "NM", stop: "ALBUQUERQUE", sky: ["#3f6fc0", "#f3a86a"], sun: "#ffd28a", far: "#b0583a", near: "#8e3f2a", g1: "#c48f58", g2: "#bb8752", sh: "#8e3f2a", props: ["yucca", "yucca", "fence"], hills: "mesa", orders: 3 },
    { from: "Albuquerque", to: "Flagstaff", st: "AZ", stop: "FLAGSTAFF", sky: ["#5a5fb8", "#f59a6a"], sun: "#ffc27a", far: "#9a4b3b", near: "#6f3a30", g1: "#cfa166", g2: "#c6995f", sh: "#7a3d2a", props: ["saguaro", "saguaro", "pine"], hills: "butte", orders: 3 },
    { from: "Flagstaff", to: "Barstow", st: "CA", stop: "BARSTOW", sky: ["#4d8ad8", "#fbe0a6"], sun: "#fff4c8", far: "#b9a07a", near: "#9b845e", g1: "#d8bf8b", g2: "#d0b783", sh: "#a07a4a", props: ["joshua", "joshua", "yucca"], hills: "desert", orders: 3 },
    { from: "Barstow", to: "Lomita", st: "CA", stop: "LOMITA", sky: ["#6a5bb0", "#ff9d6e"], sun: "#ffd08a", far: "#5a4a78", near: "#3e3558", g1: "#6f8f4e", g2: "#688a48", sh: "#9a5a3a", props: ["palm", "palm"], hills: "city", orders: 4, final: true }
  ];
  var CITIES = ["TULSA", "OKC", "AMARILLO", "ABQ", "FLAG", "BARSTOW", "LOMITA"];

  /* ---------------- Harry's real menu, for the tickets (names from menu-data.js) ---------------- */
  var ORDERS = [
    { n: "Brisket", spr: "brisket", ph: "brisket", sv: "h-brisket", ck: 5.5, base: 120 }, { n: "Baby Back Ribs", spr: "ribs", ph: "ribs", sv: "h-ribs", ck: 5, base: 115 },
    { n: "Beef Ribs", spr: "ribs", ph: "beefribs", sv: "h-beef-ribs", ck: 5.5, base: 125 }, { n: "Brisket Burnt Ends", spr: "brisket", ph: "burnt", ck: 4.5, base: 110 },
    { n: "Tri-Tip", spr: "brisket", ph: "tritip", sv: "h-tri-tip", ck: 4.5, base: 120 }, { n: "Pulled Pork", spr: "brisket", ph: "pork", sv: "h-pulled-pork-or-pulled-chicken", ck: 4.5, base: 100 },
    { n: "Hot Links", spr: "link", ph: "link", ck: 3.5, base: 80 }, { n: "Chicken Wings", spr: "wing", ph: "wing", ck: 3.5, base: 85 },
    { n: "Mac & Cheese", spr: "brisket", ph: "mac", sv: "h-mac-cheese", ck: 4, base: 90 }, { n: "Mashed Potatoes", spr: "brisket", ph: "mashed", sv: "h-mashed-potatoes", ck: 3.5, base: 85 },
    { n: "Peach Cobbler", spr: "brisket", ph: "cobbler", sv: "h-cobbler", ck: 4.5, base: 105 }];
  var SIDES = ["Mac & Cheese", "Mashed Potatoes", "Molasses Baked Beans", "Waffle Fries", "Sassy Slaw", "Fried Okra", "Cornbread w/ Honey Butter", "Red Dirt Wedges"];

  /* ---------------- sprites (vector, drawn once) ---------------- */
  var SP = {};
  SP.log = mk(96, 70, function (g) {
    [[10, 36], [46, 36], [28, 10]].forEach(function (p) {
      g.fillStyle = "#6b3e1f"; rr(g, p[0], p[1], 48, 26, 13); g.fill();
      g.fillStyle = "#4d2b14"; g.fillRect(p[0] + 12, p[1] + 6, 26, 2); g.fillRect(p[0] + 8, p[1] + 16, 30, 2);
      g.fillStyle = "#d6a96c"; g.beginPath(); g.ellipse(p[0] + 44, p[1] + 13, 8, 12, 0, 0, 7); g.fill();
      g.strokeStyle = "#9a6a3a"; g.lineWidth = 1.5; g.beginPath(); g.ellipse(p[0] + 44, p[1] + 13, 4, 7, 0, 0, 7); g.stroke(); });
  });
  SP.rub = mk(60, 84, function (g) {
    g.fillStyle = "#1e140c"; rr(g, 12, 4, 36, 14, 4); g.fill();
    g.fillStyle = "#b9531f"; rr(g, 8, 16, 44, 64, 10); g.fill();
    g.fillStyle = "#e07a3a"; rr(g, 12, 20, 8, 54, 4); g.fill();
    g.fillStyle = CREAM; rr(g, 12, 36, 36, 26, 4); g.fill();
    g.fillStyle = RED; g.font = "900 11px Archivo,sans-serif"; g.textAlign = "center"; g.fillText("HARRY'S", 30, 48); g.fillStyle = INK; g.fillText("DRY RUB", 30, 59);
  });
  SP.sauce = mk(56, 96, function (g) {
    g.fillStyle = "#1e140c"; rr(g, 21, 2, 14, 10, 3); g.fill();
    g.fillStyle = "#9a1b22"; rr(g, 22, 10, 12, 22, 3); g.fill();
    g.fillStyle = RED; rr(g, 8, 28, 40, 64, 12); g.fill();
    g.fillStyle = "#e8505a"; rr(g, 12, 34, 7, 50, 4); g.fill();
    g.fillStyle = CREAM; rr(g, 12, 46, 32, 30, 5); g.fill();
    g.fillStyle = RED_D; g.font = "900 18px Georgia,serif"; g.textAlign = "center"; g.fillText("H", 28, 66); g.font = "800 7px Archivo"; g.fillText("ORIGINAL", 28, 73);
  });
  SP.brisket = mk(104, 64, function (g) {
    g.fillStyle = "#2a140b"; rr(g, 4, 12, 96, 46, 18); g.fill();
    g.fillStyle = "#c8574a"; rr(g, 8, 36, 88, 18, 8); g.fill();
    g.fillStyle = "#e7a08a"; rr(g, 12, 40, 80, 10, 5); g.fill();
    g.fillStyle = "#4a2414"; for (var i = 0; i < 9; i++) { g.beginPath(); g.arc(14 + i * 10, 22 + (i % 2) * 5, 3, 0, 7); g.fill(); }
    g.fillStyle = "rgba(255,255,255,.18)"; rr(g, 16, 15, 60, 5, 3); g.fill();
  });
  SP.ribs = mk(110, 62, function (g) {
    g.fillStyle = "#5a2210"; rr(g, 6, 14, 98, 38, 16); g.fill();
    g.fillStyle = "#8f3517"; rr(g, 10, 18, 90, 22, 11); g.fill();
    g.fillStyle = "rgba(200,35,44,.55)"; rr(g, 14, 20, 82, 12, 6); g.fill();
    for (var i = 0; i < 6; i++) { g.fillStyle = "#f1e4c8"; g.beginPath(); g.ellipse(18 + i * 15, 50, 4, 7, 0, 0, 7); g.fill(); g.strokeStyle = "#3a160a"; g.lineWidth = 2; g.beginPath(); g.moveTo(18 + i * 15, 20); g.lineTo(18 + i * 15, 44); g.stroke(); }
  });
  SP.link = mk(100, 56, function (g) {
    [[6, 8], [10, 24], [4, 38]].forEach(function (p, i) {
      g.save(); g.translate(p[0] + 44, p[1] + 8); g.rotate((i - 1) * 0.08);
      g.fillStyle = "#7a1f14"; rr(g, -42, -8, 86, 17, 8.5); g.fill();
      g.fillStyle = "#a8382a"; rr(g, -38, -6, 76, 6, 3); g.fill();
      g.strokeStyle = "#3a0d08"; g.lineWidth = 1.4; for (var k = -28; k < 34; k += 14) { g.beginPath(); g.moveTo(k, -7); g.lineTo(k + 5, 8); g.stroke(); }
      g.restore(); });
  });
  SP.wing = mk(96, 60, function (g) {
    [[22, 30, -.4], [50, 34, .2], [74, 28, .6]].forEach(function (p) {
      g.save(); g.translate(p[0], p[1]); g.rotate(p[2]);
      g.fillStyle = "#8a3a14"; g.beginPath(); g.ellipse(0, 0, 18, 13, 0, 0, 7); g.fill();
      g.fillStyle = "#b4551f"; g.beginPath(); g.ellipse(-4, -4, 9, 5, 0, 0, 7); g.fill();
      g.fillStyle = "#f1e4c8"; rr(g, 14, -3, 12, 6, 3); g.fill(); g.restore(); });
  });
  SP.shield = mk(64, 70, function (g) {
    g.fillStyle = "#1e140c"; g.beginPath(); g.moveTo(4, 8); g.quadraticCurveTo(32, -2, 60, 8); g.lineTo(58, 40); g.quadraticCurveTo(52, 60, 32, 68); g.quadraticCurveTo(12, 60, 6, 40); g.closePath(); g.fill();
    g.fillStyle = CREAM; g.beginPath(); g.moveTo(9, 12); g.quadraticCurveTo(32, 4, 55, 12); g.lineTo(53, 40); g.quadraticCurveTo(48, 56, 32, 63); g.quadraticCurveTo(16, 56, 11, 40); g.closePath(); g.fill();
    g.fillStyle = INK; g.font = "900 9px Archivo"; g.textAlign = "center"; g.fillText("US", 32, 22); g.fillRect(12, 25, 40, 2);
    g.font = "400 30px 'Bebas Neue',Impact,sans-serif"; g.fillText("66", 32, 54);
  });
  SP.cone = mk(54, 70, function (g) {
    g.fillStyle = "#222"; rr(g, 2, 58, 50, 10, 3); g.fill();
    g.fillStyle = "#ff6a14"; g.beginPath(); g.moveTo(27, 2); g.lineTo(46, 60); g.lineTo(8, 60); g.closePath(); g.fill();
    g.fillStyle = "#fff"; g.beginPath(); g.moveTo(20, 24); g.lineTo(34, 24); g.lineTo(37, 34); g.lineTo(17, 34); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(14, 44); g.lineTo(40, 44); g.lineTo(42, 50); g.lineTo(12, 50); g.closePath(); g.fill();
  });
  SP.hole = mk(110, 40, function (g) {
    g.fillStyle = "#1a1714"; g.beginPath(); g.ellipse(55, 20, 50, 16, 0, 0, 7); g.fill();
    g.fillStyle = "#3a332c"; g.beginPath(); g.ellipse(55, 17, 42, 10, 0, 0, 7); g.fill();
    g.strokeStyle = "#141210"; g.lineWidth = 2; g.beginPath(); g.moveTo(8, 20); g.lineTo(0, 14); g.moveTo(100, 22); g.lineTo(110, 28); g.stroke();
  });
  SP.weed = mk(80, 80, function (g) {
    g.strokeStyle = "#8a6a3a"; g.lineWidth = 2.2;
    for (var i = 0; i < 26; i++) { var a = i * 2.4, r1 = 10 + (i * 7) % 26, r2 = 18 + (i * 11) % 18; g.beginPath(); g.arc(40, 40, r1, a, a + 2.2); g.stroke(); g.beginPath(); g.arc(40 + Math.cos(a) * 6, 40 + Math.sin(a) * 6, r2, a + 1, a + 2.6); g.stroke(); }
    g.strokeStyle = "#5e4422"; g.lineWidth = 1.4; for (i = 0; i < 14; i++) { var b = i * 0.9; g.beginPath(); g.arc(40, 40, 30, b, b + 1.2); g.stroke(); }
  });
  function carSprite(body, trim) { return mk(120, 74, function (g) {
    g.fillStyle = "rgba(0,0,0,.35)"; g.beginPath(); g.ellipse(60, 68, 58, 6, 0, 0, 7); g.fill();
    g.fillStyle = "#151515"; rr(g, 10, 52, 20, 16, 4); g.fill(); rr(g, 90, 52, 20, 16, 4); g.fill();
    g.fillStyle = body; rr(g, 4, 30, 112, 32, 10); g.fill();
    g.beginPath(); g.moveTo(26, 32); g.quadraticCurveTo(32, 6, 60, 6); g.quadraticCurveTo(88, 6, 94, 32); g.closePath(); g.fill();
    g.fillStyle = "#24323a"; g.beginPath(); g.moveTo(32, 30); g.quadraticCurveTo(37, 11, 60, 11); g.quadraticCurveTo(83, 11, 88, 30); g.closePath(); g.fill();
    g.fillStyle = "rgba(255,255,255,.25)"; g.fillRect(40, 14, 10, 14);
    g.fillStyle = trim; rr(g, 4, 46, 112, 6, 3); g.fill();
    g.fillStyle = "#ff3030"; rr(g, 8, 36, 16, 8, 3); g.fill(); rr(g, 96, 36, 16, 8, 3); g.fill();
    g.fillStyle = "#f6d34a"; rr(g, 46, 50, 28, 9, 2); g.fill(); g.fillStyle = INK; g.font = "800 7px Archivo"; g.textAlign = "center"; g.fillText("RT 66", 60, 57);
  }); }
  SP.car1 = carSprite("#3fb7b0", "#e8e2d0"); SP.car2 = carSprite("#e8d9b0", "#c8232c"); SP.car3 = carSprite("#6a8fd8", "#f0f0f0");
  // roadside props
  SP.saguaro = mk(70, 130, function (g) { g.fillStyle = "#3f7a3a"; rr(g, 26, 8, 18, 122, 9); g.fill(); rr(g, 4, 40, 14, 44, 7); g.fill(); rr(g, 4, 76, 30, 12, 6); g.fill(); rr(g, 52, 24, 14, 44, 7); g.fill(); rr(g, 36, 62, 30, 12, 6); g.fill(); g.fillStyle = "#57974e"; g.fillRect(31, 12, 3, 112); });
  SP.joshua = mk(100, 120, function (g) { g.strokeStyle = "#5a4630"; g.lineCap = "round"; g.lineWidth = 9; g.beginPath(); g.moveTo(50, 120); g.lineTo(50, 60); g.lineTo(26, 34); g.moveTo(50, 64); g.lineTo(76, 30); g.moveTo(50, 80); g.lineTo(84, 66); g.stroke(); g.fillStyle = "#6e8a3a"; [[26, 30], [76, 26], [86, 62]].forEach(function (p) { g.beginPath(); g.arc(p[0], p[1], 13, 0, 7); g.fill(); }); });
  SP.palm = mk(110, 170, function (g) { g.strokeStyle = "#7a5a3a"; g.lineWidth = 9; g.beginPath(); g.moveTo(56, 170); g.quadraticCurveTo(48, 90, 58, 30); g.stroke(); g.strokeStyle = "#2f6b3a"; g.lineWidth = 7; g.lineCap = "round"; for (var i = 0; i < 7; i++) { var a = -Math.PI + i * Math.PI / 6; g.beginPath(); g.moveTo(58, 30); g.quadraticCurveTo(58 + Math.cos(a) * 34, 30 + Math.sin(a) * 28 - 14, 58 + Math.cos(a) * 52, 30 + Math.sin(a) * 18 + 22); g.stroke(); } });
  SP.pine = mk(80, 140, function (g) { g.fillStyle = "#4a3020"; g.fillRect(36, 110, 8, 30); g.fillStyle = "#24502e"; for (var i = 0; i < 4; i++) { g.beginPath(); g.moveTo(40, 4 + i * 24); g.lineTo(72 - i * 2, 56 + i * 20); g.lineTo(8 + i * 2, 56 + i * 20); g.closePath(); g.fill(); } });
  SP.yucca = mk(70, 70, function (g) { g.strokeStyle = "#6f8a3a"; g.lineWidth = 3; for (var i = 0; i < 16; i++) { var a = -Math.PI * (0.1 + i / 18); g.beginPath(); g.moveTo(35, 66); g.lineTo(35 + Math.cos(a) * 32, 66 + Math.sin(a) * 40); g.stroke(); } });
  SP.derrick = mk(70, 140, function (g) { g.strokeStyle = "#2a2018"; g.lineWidth = 3; g.beginPath(); g.moveTo(10, 140); g.lineTo(35, 6); g.lineTo(60, 140); for (var y = 30; y < 140; y += 24) { var k = (y - 6) / 134 * 25; g.moveTo(35 - k, y); g.lineTo(35 + k, y + 24); g.moveTo(35 + k, y); g.lineTo(35 - k, y + 24); } g.stroke(); });
  SP.silo = mk(80, 120, function (g) { g.fillStyle = "#c9c2b2"; rr(g, 8, 30, 30, 90, 4); g.fill(); rr(g, 42, 18, 30, 102, 4); g.fill(); g.fillStyle = "#a59e90"; g.beginPath(); g.arc(23, 30, 15, Math.PI, 0); g.fill(); g.beginPath(); g.arc(57, 18, 15, Math.PI, 0); g.fill(); });
  SP.windmill = mk(80, 150, function (g) { g.strokeStyle = "#3a3530"; g.lineWidth = 3; g.beginPath(); g.moveTo(20, 150); g.lineTo(40, 30); g.lineTo(60, 150); g.moveTo(28, 100); g.lineTo(52, 100); g.stroke(); g.fillStyle = "#6a6560"; for (var i = 0; i < 12; i++) { g.save(); g.translate(40, 30); g.rotate(i * Math.PI / 6); g.fillRect(2, -2, 24, 4); g.restore(); } });
  SP.caddy = mk(90, 110, function (g) { g.save(); g.translate(45, 60); g.rotate(-0.5); g.fillStyle = pick(["#d23a6a", "#3a9ad2", "#e8c23a", "#5ad28a"]); rr(g, -18, -50, 36, 96, 8); g.fill(); g.fillStyle = "#24323a"; rr(g, -13, -18, 26, 22, 4); g.fill(); g.fillStyle = "#e33"; g.fillRect(-18, -46, 6, 14); g.fillRect(12, -46, 6, 14); g.restore(); });
  SP.mesa = mk(160, 70, function (g) { g.fillStyle = "#9c4a30"; g.beginPath(); g.moveTo(0, 70); g.lineTo(26, 14); g.lineTo(130, 10); g.lineTo(160, 70); g.closePath(); g.fill(); g.fillStyle = "#b85d3a"; g.fillRect(28, 20, 100, 6); });
  SP.fence = mk(120, 40, function (g) { g.strokeStyle = "#6a4a2a"; g.lineWidth = 4; for (var x = 6; x < 120; x += 36) { g.beginPath(); g.moveTo(x, 40); g.lineTo(x, 6); g.stroke(); } g.lineWidth = 2; g.beginPath(); g.moveTo(0, 14); g.lineTo(120, 12); g.moveTo(0, 26); g.lineTo(120, 25); g.stroke(); });
  function signSprite(txt) { return mk(120, 120, function (g) { g.fillStyle = "#4a4a4a"; g.fillRect(56, 50, 6, 70); g.fillStyle = "#1f6b3a"; rr(g, 4, 6, 112, 48, 6); g.fill(); g.strokeStyle = "#fff"; g.lineWidth = 2; rr(g, 8, 10, 104, 40, 4); g.stroke(); g.fillStyle = "#fff"; g.font = "800 13px Archivo"; g.textAlign = "center"; g.fillText(txt, 60, 36); }); }
  SP.shieldpost = mk(64, 130, function (g) { g.fillStyle = "#4a4a4a"; g.fillRect(29, 60, 6, 70); g.drawImage(SP.shield, 0, 0, 64, 70); });
  // Antidote's review poster: his review of Harry's isn't shot yet, so this is the placeholder slot (blue frame, yellow, red ▶)
  SP.review = mk(200, 120, function (g) {
    g.fillStyle = "#1d4ed8"; rr(g, 0, 0, 200, 120, 10); g.fill();
    var gr = g.createLinearGradient(0, 8, 0, 112); gr.addColorStop(0, "#0b1430"); gr.addColorStop(1, "#1a1030"); g.fillStyle = gr; rr(g, 7, 7, 186, 106, 6); g.fill();
    g.fillStyle = "#e11d2a"; g.beginPath(); g.arc(34, 46, 20, 0, 7); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.moveTo(28, 35); g.lineTo(44, 46); g.lineTo(28, 57); g.closePath(); g.fill();
    g.fillStyle = "#ffd23f"; g.textAlign = "left"; g.font = "900 15px Archivo,sans-serif"; g.fillText("ANTIDOTE", 62, 36); g.fillText("REVIEWS HARRY'S", 62, 54);
    g.fillStyle = "#fff"; g.font = "800 11px Archivo"; g.fillText("Food review coming soon", 62, 70);
    g.fillStyle = "#ffd23f"; g.textAlign = "center"; g.font = "900 13px Archivo"; g.fillText("@therealantidote", 100, 100);
  });
  SP.billboard = mk(220, 190, function (g) { g.fillStyle = "#3a2a1a"; g.fillRect(40, 120, 10, 70); g.fillRect(170, 120, 10, 70); g.fillStyle = "#2a1e14"; g.fillRect(4, 116, 212, 8); g.drawImage(SP.review, 10, 0, 200, 120); });
  // guests at the stops: photo cut-outs (img/r66/guest*.webp). Never code-drawn people.
  var GUESTS = [1, 2, 3, 4, 5].map(function (i) { var im = new Image(); im.src = "img/r66/guest" + i + ".webp"; return im; });
  var LOGO = new Image(); LOGO.src = "img/logo.webp";
  /* photo-real art (Higgsfield, img/r66/): each one replaces its vector sprite above once it loads; the vector stays the fallback */
  ["truck", "truckbody", "smoker", "fire", "log", "rub", "sauce", "brisket", "ribs", "link", "wing", "cone", "weed", "hole", "deer", "car1", "car2", "car3", "saguaro", "joshua", "palm", "pine", "yucca", "derrick", "silo", "windmill", "fence"].forEach(function (n) {
    var im = new Image(); im.onload = function () { im.w = im.naturalWidth; im.h = im.naturalHeight; SP[n] = im; }; im.src = "img/r66/" + n + ".webp";
  });
  var BGI = [], STOPI = new Image(); STOPI.src = "img/r66/stop.webp";
  function bgLoad(i) { if (i < 6 && !BGI[i]) { BGI[i] = new Image(); BGI[i].src = "img/r66/bg" + i + ".webp"; } }
  function ready(im) { return im && im.complete && im.naturalWidth > 0; }
  var SMK = [1, 2, 3].map(function (i) { var im = new Image(); im.src = "img/r66/smoke" + i + ".webp"; return im; });
  var CK = {};   // cook photos, loaded per order: raw + done on the smoker, plus Harry's own menu photo for the serve shot
  function cookImg(src) { if (!CK[src]) { CK[src] = new Image(); CK[src].src = src; } return CK[src]; }
  function cookLoad(o) { cookImg("img/r66/cook/" + o.ph + "-raw.webp"); cookImg("img/r66/cook/" + o.ph + "-done.webp"); if (o.sv) cookImg("img/" + o.sv + ".webp"); }
  var R3 = { on: false, render: null };   // the 3D drive view (route66-3d.js) hooks in here; it outlives restarts, unlike st
  // on-screen width per road object (photo sprites keep their own aspect; height follows)
  var OW = { car: 104, deer: 104, hole: 92, cone: 44, weed: 50, log: 68, rub: 36, sauce: 32, brisket: 72, ribs: 68, link: 66, wing: 62, shield: 46 };
  // the render's touch: a glowing gold ring under every pickup
  SP.ring = mk(120, 40, function (g) {
    g.save(); g.translate(60, 20); g.scale(1, 0.33); var r = g.createRadialGradient(0, 0, 8, 0, 0, 60); r.addColorStop(0, "rgba(255,215,130,.55)"); r.addColorStop(1, "rgba(255,190,80,0)"); g.fillStyle = r; g.fillRect(-60, -60, 120, 120); g.restore();
    g.strokeStyle = "rgba(255,220,120,.95)"; g.lineWidth = 3; g.beginPath(); g.ellipse(60, 20, 50, 13, 0, 0, 7); g.stroke();
    g.strokeStyle = "rgba(255,245,200,.7)"; g.lineWidth = 1; g.beginPath(); g.ellipse(60, 20, 42, 10, 0, 0, 7); g.stroke();
  });
  // asphalt / dirt grain: one noise strip row per scanline, built once
  var NOISE = (function () { var c = D.createElement("canvas"); c.width = 512; c.height = 256; var g = c.getContext("2d"), id = g.createImageData(512, 256), d = id.data; for (var i = 0; i < d.length; i += 4) { var v = (90 + Math.random() * 110) | 0; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 58; } g.putImageData(id, 0, 0); return c; })();
  var GND = cx.createLinearGradient(0, HZ, 0, VH); GND.addColorStop(0, "rgba(255,215,160,.5)"); GND.addColorStop(0.22, "rgba(255,200,140,0)"); GND.addColorStop(1, "rgba(30,12,0,.38)");
  // golden-hour grade + vignette, one drawImage per frame
  var GRADE = mk(VW, VH, function (g) { g.fillStyle = "rgba(255,170,60,.09)"; g.fillRect(0, 0, VW, VH); var v = g.createRadialGradient(VW / 2, VH * 0.55, VW * 0.45, VW / 2, VH * 0.55, VW * 1.05); v.addColorStop(0, "rgba(40,15,0,0)"); v.addColorStop(1, "rgba(40,15,0,.5)"); g.fillStyle = v; g.fillRect(0, 0, VW, VH); });

  /* ---------------- per-leg sky + far hills (prerendered, scrolls with the bends) ---------------- */
  var BG = [];
  function skyFor(L) {
    return mk(800, HZ + 4, function (g, w, h) {
      var gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, L.sky[0]); gr.addColorStop(1, L.sky[1]); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      var sx = 560, sy = h - 70, sg = g.createRadialGradient(sx, sy, 0, sx, sy, 120); sg.addColorStop(0, L.sun); sg.addColorStop(0.25, L.sun + "cc"); sg.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = sg; g.fillRect(0, 0, w, h);
      g.fillStyle = L.sun; g.beginPath(); g.arc(sx, sy, 26, 0, 7); g.fill();
      g.fillStyle = "rgba(255,255,255,.55)"; for (var c = 0; c < 6; c++) { var x = c * 140 + 20, y = 30 + (c * 37) % 60; g.beginPath(); g.ellipse(x, y, 46, 9, 0, 0, 7); g.ellipse(x + 26, y - 6, 30, 9, 0, 0, 7); g.fill(); }
      function ridge(col, base, amp, f, kind) {
        g.fillStyle = col; g.beginPath(); g.moveTo(0, h);
        for (var x = 0; x <= w; x += 4) {
          var y = base;
          if (kind === "rolling" || kind === "desert") y -= amp * (0.5 + 0.5 * Math.sin(x * f * 6.283 / w)) * (0.6 + 0.4 * Math.sin(x * 0.031));
          else if (kind === "flat") y -= amp * 0.25 * (1 + Math.sin(x * 0.05));
          else if (kind === "mesa" || kind === "butte") { var m = (x % 260) / 260; y -= (m > 0.15 && m < (kind === "mesa" ? 0.7 : 0.4)) ? amp : amp * 0.15 + Math.max(0, amp * (1 - Math.abs(m - 0.5) * 3)) * 0.2; }
          else if (kind === "city") { var b = ((x / 18) | 0) * 7919 % 13; y -= (x > 120 && x < 520) ? 10 + b * 4.2 : amp * 0.35 * (1 + Math.sin(x * 0.02)); }
          g.lineTo(x, y);
        }
        g.lineTo(w, h); g.closePath(); g.fill();
      }
      ridge(L.far, h - 6, L.hills === "flat" ? 14 : 46, 3, L.hills);
      ridge(L.near, h, L.hills === "flat" ? 8 : 22, 5, L.hills === "city" ? "rolling" : L.hills);
    });
  }

  /* ---------------- state ---------------- */
  var MODE = (function () { try { return localStorage.getItem("r66-mode") || ""; } catch (e) { return ""; } })();
  function kid() { return MODE === "kid"; }
  function fresh() {
    return { running: false, over: false, phase: "menu", leg: 0, t: 0, legT: 0, dist: 0, speed: 0, px: 0, pv: 0, lane: 1, tilt: 0, camX: 0, bend: 0, bgX: 0,
      score: 0, hearts: 5, inv: { logs: 3, rub: 0, sauce: 0 }, objs: [], props: [], pops: [], smoke: [], dmg: 0, flat: 0, sway: 0, swayV: 0, shake: 0, flash: 0, spawnD: 0, propD: 0, bbDone: false,
      tickets: [], cook: null, banner: null, served: 0, perfect: 0, walked: 0, hold: false, played: 0, finished: false, paused: false, bbRect: null, posterRect: null, fx: [] };
  }
  var st = fresh();
  var LEG_MS = function () { return kid() ? 30000 : 27000; };
  function baseSpeed() { return (kid() ? 390 : 465) + st.leg * (kid() ? 16 : 30); }

  /* ---------------- sound (WebAudio, made here; music = Antidote's songs via songswitch.js) ---------------- */
  var AC = null, master, sfxBus, musBus, sizzle = null, sizG, engG, MS = null, fxOn = true, musOn = true, sndOn = true;
  try { sndOn = localStorage.getItem("r66-sound") !== "0"; } catch (e) {}
  function audio() {
    if (AC) { if (AC.state === "suspended") AC.resume(); return; }
    try { AC = new (W.AudioContext || W.webkitAudioContext)(); } catch (e) { return; }
    master = AC.createGain(); master.gain.value = sndOn ? 1 : 0; master.connect(AC.destination);
    sfxBus = AC.createGain(); sfxBus.gain.value = fxOn ? 0.6 : 0; sfxBus.connect(master);
    musBus = AC.createGain(); musBus.gain.value = musOn ? 0.5 : 0; musBus.connect(master);
    var len = AC.sampleRate * 2, buf = AC.createBuffer(1, len, AC.sampleRate), d = buf.getChannelData(0); for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    sizzle = AC.createBufferSource(); sizzle.buffer = buf; sizzle.loop = true; var bp = AC.createBiquadFilter(); bp.type = "highpass"; bp.frequency.value = 2400;
    sizG = AC.createGain(); sizG.gain.value = 0; sizzle.connect(bp); bp.connect(sizG); sizG.connect(sfxBus); sizzle.start();
    var eng = AC.createOscillator(); eng.type = "sawtooth"; eng.frequency.value = 52; var lp = AC.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 180;
    engG = AC.createGain(); engG.gain.value = 0; eng.connect(lp); lp.connect(engG); engG.connect(sfxBus); eng.start(); st._eng = eng;
    W.__R66NB = buf;
    if (W.SongSwitch && !MS) { MS = W.SongSwitch({ key: "r66-song", songs: [{ id: "energy", name: "Energy", src: "../storm-burger/audio/energy.m4a" }, { id: "cheat", name: "Cheat Code", src: "../storm-burger/audio/cheat-code.m4a" }], vol: 0.2, playlist: true }); }
    if (MS) MS.attach(AC, musBus);
  }
  function tone(f, dur, type, vol, slide) {
    if (!AC || !fxOn) return; var t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
    o.type = type || "sine"; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(vol || 0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, freq) {
    if (!AC || !fxOn || !W.__R66NB) return; var t = AC.currentTime, s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
    s.buffer = W.__R66NB; f.type = "lowpass"; f.frequency.value = freq || 600; g.gain.setValueAtTime(vol || 0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(sfxBus); s.start(t); s.stop(t + dur + 0.05);
  }
  var SFX = {
    pick: function () { tone(660, 0.09, "square", 0.12, 990); tone(990, 0.12, "sine", 0.12); },
    log: function () { tone(220, 0.12, "triangle", 0.25, 160); noise(0.08, 0.2, 900); },
    hit: function () { noise(0.35, 0.8, 380); tone(110, 0.3, "sawtooth", 0.2, 55); },
    ding: function () { tone(1320, 0.5, "sine", 0.22); setTimeout(function () { tone(1760, 0.6, "sine", 0.2); }, 110); },
    perfect: function () { [784, 988, 1175, 1568].forEach(function (f, i) { setTimeout(function () { tone(f, 0.25, "triangle", 0.18); }, i * 70); }); },
    pull: function () { noise(0.25, 0.35, 1800); },
    walk: function () { tone(196, 0.35, "square", 0.12, 98); },
    horn: function () { tone(330, 0.25, "square", 0.08); tone(415, 0.25, "square", 0.08); },
    gust: function () { noise(0.6, 0.25, 500); }
  };
  function syncAudio() {
    if (!AC) return; var t = AC.currentTime;
    master.gain.setTargetAtTime(sndOn ? 1 : 0, t, 0.05); sfxBus.gain.setTargetAtTime(fxOn ? 0.6 : 0, t, 0.05); musBus.gain.setTargetAtTime(musOn ? 0.5 : 0, t, 0.05);
    var drive = st.running && !st.paused && (st.phase === "drive" || st.phase === "arrive" || st.phase === "depart");
    engG.gain.setTargetAtTime(drive ? 0.05 : 0, t, 0.2); if (st._eng) st._eng.frequency.setTargetAtTime(40 + st.speed / 14, t, 0.2);
    var cook = st.running && !st.paused && st.phase === "stop" && st.cook; sizG.gain.setTargetAtTime(cook ? 0.04 + (st.cook.fire || 0) * 0.08 : 0, t, 0.1);
    if (MS) MS.sync(st.running && !st.paused && musOn && sndOn);
  }
  W.GAME_AUDIO = { music: function (v) { musOn = v !== false; syncAudio(); }, sfx: function (v) { fxOn = v !== false; syncAudio(); },
    state: function () { return { hasMusic: true, hasSfx: true, music: musOn, sfx: fxOn }; } };
  function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }

  /* ---------------- projection ---------------- */
  function sAt(z) { return ZC / (Math.max(z, -ZC * 0.55) + ZC); }
  function off(z) { return st.bend * z * z / 2200; }
  function sx(wx, z, s) { return VW / 2 + (wx + off(z) - st.camX) * s; }
  function sy(s) { return HZ + (PY - HZ) * s; }

  /* ---------------- spawning ---------------- */
  var GOOD = [["log", 10, "Hickory", 30], ["rub", 15, "Dry rub", 16], ["sauce", 15, "Harry's sauce", 16], ["brisket", 30, "Brisket", 9], ["ribs", 30, "Ribs", 9], ["link", 25, "Hot links", 8], ["shield", 10, "Route 66", 22]];
  function goodPick() { var tot = 0, i; for (i = 0; i < GOOD.length; i++) tot += GOOD[i][3]; var r = Math.random() * tot; for (i = 0; i < GOOD.length; i++) { r -= GOOD[i][3]; if (r < 0) return GOOD[i]; } return GOOD[0]; }
  function spawnRow() {
    var lanes = [0, 1, 2].sort(function () { return Math.random() - 0.5; });
    var z = ZMAX;
    var calm = st.legT < 2500;   // first moments of each leg: just goodies
    // hazards on their own clock: adult one every ~2.4 s on leg 1 down to ~1.4 s on leg 6; kid ~3.4 s down to ~2.6 s
    if (!calm && st.hzD <= 0) {
      st.hzD = baseSpeed() * ((kid() ? 3.4 - st.leg * 0.16 : 2.4 - st.leg * 0.2) + rnd(-0.3, 0.4));
      var hl = lanes.shift(), r = Math.random(), k = r < 0.24 ? "cone" : r < 0.45 ? "hole" : r < 0.74 ? "car" : r < 0.87 || !SP.deer ? "weed" : "deer";
      var o = { kind: k, bad: true, lane: hl, wx: (hl - 1) * LW, z: z, w: k === "car" ? 78 : k === "hole" ? 70 : 44 };
      if (k === "car") { o.spr = pick([SP.car1, SP.car2, SP.car3]); o.vz = baseSpeed() * 0.45;
        // some drivers are trouble: "weave" swings across the lanes the whole way, "swerve" drives straight then cuts at the truck
        var cr = Math.random() / (kid() ? 0.45 : 1); if (cr < 0.22) { o.weave = rnd(0, 6.28); o.cx0 = o.wx * 0.5; } else if (cr < 0.44) o.swz = rnd(260, 420); }
      // a deer bolts out of the brush and across the road; it is somewhere in the lanes when it reaches the truck
      if (k === "deer") { var ds = Math.random() < 0.5 ? -1 : 1; o.wx = ds * rnd(300, 390); o.vx = (rnd(-165, 165) - o.wx) / (ZMAX / Math.max(st.speed, 200)); o.w = 60; }
      if (k === "weed") { o.vx = (hl === 0 ? 1 : hl === 2 ? -1 : (Math.random() < 0.5 ? -1 : 1)) * rnd(68, 105) * (kid() ? 0.7 : 1); o.rot = 0; o.w = 38; }
      st.objs.push(o);
      if (!kid() && st.leg >= 3 && Math.random() < 0.18 && lanes.length > 1) { var h2 = lanes.shift(); st.objs.push({ kind: "cone", bad: true, lane: h2, wx: (h2 - 1) * LW, z: z + 40, w: 44 }); }
    }
    var n = Math.random() < 0.35 ? 2 : 1;
    for (var i = 0; i < n && lanes.length; i++) { var l = lanes.shift(), gd = goodPick(); st.objs.push({ kind: gd[0], good: gd, lane: l, wx: (l - 1) * LW, z: z + i * 60, w: 46, bob: Math.random() * 6 }); }
  }
  function spawnProp() {
    var L = LEGS[st.leg], side = Math.random() < 0.5 ? -1 : 1, k = pick(L.props), spr;
    if (k === "shield") spr = SP.shieldpost; else if (k === "sign") spr = null; else spr = SP[k];
    if (k === "sign") spr = signSprite(Math.random() < 0.5 ? (LEGS[st.leg].to.toUpperCase() + " " + (((1 - st.legT / LEG_MS()) * 90 + 8) | 0) + " MI") : "HISTORIC RT 66");
    var size = { saguaro: 120, joshua: 120, palm: 190, pine: 150, derrick: 150, silo: 120, windmill: 160, caddy: 90, mesa: 130, fence: 60, yucca: 60, shield: 110, sign: 110 }[k] || 100;
    st.props.push({ spr: spr, wx: side * rnd(330, 420), z: ZMAX, h: size, k: k });
  }

  /* ---------------- flow ---------------- */
  function banner(big, small, ms, col) { st.banner = { big: big, small: small, t: ms || 2400, max: ms || 2400, col: col || GOLD }; }
  function legStart() {
    st.phase = "drive"; st.legT = 0; st.objs = []; st.bbDone = false; st.speed = st.speed || 0; st.spawnD = 200; st.propD = 0;
    st.dmg = Math.max(0, (st.dmg || 0) - 1); st.flat = 0;   // every stop patches the rig up one notch
    if (!BG[st.leg]) BG[st.leg] = skyFor(LEGS[st.leg]);
    bgLoad(st.leg); bgLoad(st.leg + 1);
    var L = LEGS[st.leg]; banner(L.from.split(",")[0].toUpperCase() + " → " + L.to.toUpperCase(), T("Leg") + " " + (st.leg + 1) + " / 6 · " + T("grab hickory, rub, sauce + meat"), 2600);
  }
  function start() {
    if (R3.wait) { R3.go = start; audio(); return; }   // the 3D models are still loading: route66-3d.js starts the run the moment they are in (the tap still unlocks sound)
    var keep = st.mute; st = fresh(); st.running = true; st.phase = "drive"; st.speed = baseSpeed() * 0.6; legStart();
    W.SSAI_GAME_ON = true; $("r66over").classList.remove("on"); audio(); syncAudio(); last = performance.now();
  }
  function arrive() {
    st.phase = "arrive"; st.arriveT = 0; st.objs = st.objs.filter(function (o) { return !o.bad && o.z < 400; });
    var L = LEGS[st.leg]; banner(T("PULL UP"), L.to + (L.final ? " · " + T("Harry's!") : ""), 1800, RED); SFX.horn();
  }
  function stopStart() {
    st.phase = "stop"; st.stopT = 0; st.hold = false; st.tickets = []; var L = LEGS[st.leg], n = L.orders, used = {}, g0 = (Math.random() * GUESTS.length) | 0;
    for (var i = 0; i < n; i++) {
      var o; do { o = pick(ORDERS); } while (used[o.n] && Object.keys(used).length < ORDERS.length); used[o.n] = 1;
      var pat = ((kid() ? 52 : 34) + i * (kid() ? 13 : 9) - st.leg * (kid() ? 1 : 1.8));
      var sd; do { sd = pick(SIDES); } while (sd === o.n); cookLoad(o);
      st.tickets.push({ o: o, side: sd, pat: pat, left: pat, guest: (g0 + i) % GUESTS.length, mood: 1, done: false, out: false });
    }
    nextCook();
    banner(L.final ? T("LOMITA RUSH!") : T("ORDERS UP!"), T("Hold to stoke the hickory · keep it Slow & Low"), 2000, GOLD);
  }
  function nextCook() {
    var tk = null; for (var i = 0; i < st.tickets.length; i++) if (!st.tickets[i].done && !st.tickets[i].out) { tk = st.tickets[i]; break; }
    if (!tk) { st.cook = null; departOrFinish(); return; }
    var k = kid();
    st.cook = { tk: tk, temp: 175 + rnd(0, 25), fire: 0.25, prog: 0, q: 0, qt: 0, char: 0, phase: "smoke", gustT: rnd(2.5, 4.5), pullM: 0, pullDir: 1,
      win: rnd(0.55, 0.78), ww: k ? 0.24 : 0.15, pw: k ? 0.09 : 0.05, pullT: 0, lo: k ? 215 : 225, hi: k ? 260 : 250, plo: k ? 228 : 232, phi: k ? 248 : 243, need: tk.o.ck * (k ? 0.8 : 1), serveT: 0 };
  }
  function departOrFinish() {
    if (st.phase === "dead") return;
    var L = LEGS[st.leg], allOk = st.tickets.every(function (t) { return t.done; });
    var bonus = 100 * (st.leg + 1); st.score += bonus; pop(VW / 2, 300, "+" + bonus + " " + T("stop bonus"), "#9be37a");
    if (allOk && st.hearts < 5) { st.hearts++; pop(VW / 2, 330, "+1 ❤ " + T("happy town"), "#ff8a8a"); }
    if (L.final) { st.finished = true; st.score += 500; banner(T("YOU MADE IT!"), T("Harry's Smokehouse · Lomita, CA · +500"), 2600, GOLD); st.phase = "finish"; st.finT = 0; SFX.perfect(); return; }
    st.phase = "depart"; st.depT = 0; banner(T("BACK ON THE ROAD"), T("Next stop") + ": " + LEGS[st.leg + 1].to, 1600, GOLD);
  }
  function end() {
    if (!st.running) return; st.running = false; st.over = true; W.SSAI_GAME_ON = false; st.hold = false; syncAudio();
    st.banner = null; st.pops = []; draw();
    cx.fillStyle = "rgba(20,10,6,.72)"; cx.fillRect(0, 0, VW, VH); cx.textAlign = "center";
    if (LOGO.complete && LOGO.naturalWidth) cx.drawImage(LOGO, VW / 2 - 70, 120, 140, 140);
    cx.fillStyle = "#ffe3a0"; cx.font = "400 30px " + DISP; cx.fillText(st.finished ? T("WELCOME TO LOMITA!") : T("RIG PARKED"), VW / 2, 310);
    cx.fillStyle = "#ffd27a"; cx.font = "400 64px " + NUM; cx.fillText(st.score.toLocaleString(), VW / 2, 380);
    cx.fillStyle = CREAM; cx.font = "700 14px " + BODY; cx.fillText(st.served + " " + T(st.served === 1 ? "plate served" : "plates served") + " · " + st.perfect + " " + T("perfect"), VW / 2, 410);
    cx.fillText(T("Tap Drive again below to play"), VW / 2, 440);
    if (W.R66_END) W.R66_END({ score: st.score, leg: st.leg + 1, finished: st.finished, served: st.served, perfect: st.perfect, kid: kid() });
  }
  function pop(x, y, txt, col, big) { st.pops.push({ x: x, y: y, txt: txt, col: col || "#fff", t: 0, big: !!big }); }
  function hurt(why) {
    if (st.phase === "dead" || !st.running) return;
    st.hearts--; st.shake = 0.35; st.flash = 0.25; SFX.hit(); buzz(60);
    if (why) pop(VW / 2, PY - 120, why, "#ff8a8a");
    if (st.hearts <= 0) { banner(T("RIG'S DONE"), T("Out of hearts"), 1400, RED); st.deadAtStop = st.phase === "stop"; st.phase = "dead"; st.deadT = 0; st.hold = false; st.dmg = 3; }
  }

  /* ---------------- update ---------------- */
  function update(dt) {
    var ms = dt * 1000; st.t += ms; if (st.banner) { st.banner.t -= ms; if (st.banner.t <= 0) st.banner = null; }
    st.shake = Math.max(0, st.shake - dt); st.flash = Math.max(0, st.flash - dt);
    for (var i = st.pops.length - 1; i >= 0; i--) { st.pops[i].t += dt; st.pops[i].y -= dt * 34; if (st.pops[i].t > 1.3) st.pops.splice(i, 1); }
    if (st.phase === "dead") { st.deadT += dt; st.speed *= Math.pow(0.2, dt); if (st.deadT > 1.4) end(); }
    if (st.phase === "drive" || st.phase === "arrive" || st.phase === "depart" || (st.phase === "dead" && !st.deadAtStop)) road(dt);
    if (st.phase === "stop") { st.stopT += dt; stop(dt); }
    if (st.phase === "finish") { st.finT += dt; if (st.finT > 2.8) end(); }
    // chimney smoke (always)
    var heavy = st.phase === "stop" && st.cook ? 0.5 + st.cook.fire : 0.6;
    if (!RM && Math.random() < dt * 18 * heavy) st.smoke.push({ x: 0, y: 0, vx: rnd(-6, 6), vy: rnd(-34, -22), r: rnd(5, 8), t: 0, m: rnd(1.4, 2.2), s: (Math.random() * 3) | 0, a: rnd(0, 6.28), va: rnd(-0.8, 0.8) });
    for (i = st.smoke.length - 1; i >= 0; i--) { var p = st.smoke[i]; p.t += dt; p.x += p.vx * dt + (st.phase === "drive" ? -st.tilt * 40 * dt : 0); p.y += p.vy * dt; p.r += dt * 9; if (p.t > p.m) st.smoke.splice(i, 1); }
  }
  function road(dt) {
    var L = LEGS[st.leg], target = st.phase === "arrive" ? 0 : st.phase === "dead" ? st.speed : baseSpeed();
    if (st.phase === "arrive") { st.arriveT += dt; st.speed = Math.max(0, st.speed - st.speed * dt * 1.6 - 60 * dt); if (st.arriveT > 1.8) stopStart(); }
    else if (st.phase === "depart") { st.depT += dt; st.speed += (target - st.speed) * dt * 1.2; if (st.depT > 1.4) { st.leg++; legStart(); } }
    else if (st.phase === "drive") { st.speed += (target - st.speed) * dt * 1.5; st.legT += dt * 1000; if (st.legT >= LEG_MS()) arrive(); }
    var dz = st.speed * dt; st.dist += dz;
    st.bend = Math.sin(st.dist / 2900 + st.leg) * 0.7 + Math.sin(st.dist / 1150) * 0.25;
    st.bgX = (st.bgX - st.bend * dz * 0.05 + 800 * 100) % 800;
    var px0 = st.px, tx = (st.lane - 1) * LW + (st.flat > 0 ? Math.sin(st.flat * 9) * 42 * Math.min(1, st.flat / 0.8) : 0), dx = tx - st.px;   // a popped tyre swerves the rig inside its own lane
    st.flat = Math.max(0, st.flat - dt); // a lane change is a damped spring, not a slide: the rig eases out of its lane, carries speed across and settles (implicit step, steady at any frame rate)
    st.pv = (st.pv + 144 * dx * dt) / (1 + 24 * dt + 144 * dt * dt); st.px += st.pv * dt; st.tilt = clamp(st.pv / 2200, -0.3, 0.3);
    // the smoker trailer is a spring on the hitch: it lags a lane change, swings past and settles
    var tgt = clamp(-(st.px - px0) / (dt || 1) * 0.03, -12, 12) + Math.sin(st.dist / 31) * Math.min(1, st.speed / 300) * 0.6;
    st.swayV += ((tgt - st.sway) * 90 - st.swayV * 5) * dt; st.sway += st.swayV * dt;
    st.camX = st.px * 0.55 + st.bend * 30;
    if (st.phase === "drive") {
      st.hzD = (st.hzD || 0) - dz; st.spawnD -= dz; if (st.spawnD <= 0) { spawnRow(); st.spawnD = (kid() ? 300 : 270) - st.leg * 6 + rnd(-30, 40); }
      if (!st.bbDone && st.legT > 9000) { st.bbDone = true; st.props.push({ spr: SP.billboard, wx: 345, z: ZMAX, h: 160, k: "billboard" }); }
    }
    if (st.phase !== "dead" && st.phase !== "arrive") { st.propD -= dz; if (st.propD <= 0) { spawnProp(); st.propD = rnd(120, 260); } }
    for (var i = st.props.length - 1; i >= 0; i--) { st.props[i].z -= dz; if (st.props[i].z < -60) st.props.splice(i, 1); }
    for (i = st.objs.length - 1; i >= 0; i--) {
      var o = st.objs[i]; o.z -= dz - (o.vz ? o.vz * dt : 0);
      if (o.kx) { o.wx += (o.kx - o.wx) * Math.min(1, dt * 3); o.vz *= Math.pow(0.35, dt); o.rotz = clamp((o.rotz || 0) + (o.kx > 0 ? 1 : -1) * dt * 1.4, -0.35, 0.35); }   // a car that got hit is shoved to the shoulder and drops behind
      else if (o.kind === "weed") { o.wx += o.vx * dt; o.rot += o.vx * dt * 0.05; if (o.wx > 195 || o.wx < -195) o.vx = -o.vx; }
      else if (o.kind === "deer") o.wx += o.vx * dt;
      else if (o.weave !== undefined) { o.weave += dt * (kid() ? 2.6 : 3.9); var wx0 = o.wx; o.wx = o.cx0 + Math.sin(o.weave) * (kid() ? 57 : 90); o.lean = (o.wx - wx0) / (dt || 1); }
      else if (o.swz) {   // locks on to where the truck is at that moment, so a quick lane change still gets clear
        if (o.tx === undefined && o.z < o.swz && st.phase === "drive") { o.tx = st.px; SFX.horn(); }
        if (o.tx !== undefined) { var dx = clamp(o.tx - o.wx, -1, 1) * (kid() ? 135 : 225) * dt; o.wx += Math.abs(o.tx - o.wx) < Math.abs(dx) ? o.tx - o.wx : dx; o.lean = dx / (dt || 1); } }
      if (!o.hit && o.z < 34 && o.z > -18 && Math.abs(o.wx - st.px) < (o.bad ? o.w * 0.5 + 26 : 52) && st.phase === "drive") {
        o.hit = true;
        if (o.kind === "deer") { st.score = Math.max(0, st.score - 75); st.shake = 0.35; st.flash = 0.25; SFX.hit(); buzz(60); pop(VW / 2, PY - 120, T("Hit a deer!") + " −75", "#ff8a8a"); o.z = -999;
          st.flat = kid() ? 1.6 : 2.6; st.swayV += (Math.random() < 0.5 ? -70 : 70); pop(VW / 2, PY - 150, T("Tire popped!"), "#ffb36b"); }   // points only, no heart
        else if (o.bad) { st.score = Math.max(0, st.score - 50); st.inv.logs = Math.max(0, st.inv.logs - 1); hurt(o.tx !== undefined ? "Sideswiped! −50" : o.weave !== undefined ? "Reckless driver! −50" : { car: "Rear-ended a slowpoke! −50", cone: "Cone! −50", hole: "Pothole! −50", weed: "Tumbleweed! −50" }[o.kind]);
          if (o.kind === "car") { var side = o.wx >= st.px ? 1 : -1; o.kx = side * 300; o.vz = st.speed * 1.25; st.swayV -= side * 90; st.dmg = Math.min(3, st.dmg + 1); pop(VW / 2, PY - 150, T(["Engine's smoking!", "Engine's smoking bad!", "Engine's on fire!"][st.dmg - 1]), "#ffb36b"); }
          else o.z = -999; }
        else { var g = o.good; st.score += g[1]; if (g[0] === "log") { st.inv.logs = Math.min(9, st.inv.logs + 1); SFX.log(); } else { SFX.pick(); }
          if (g[0] === "rub") st.inv.rub = Math.min(9, st.inv.rub + 1); if (g[0] === "sauce") st.inv.sauce = Math.min(9, st.inv.sauce + 1);
          pop(sx(o.wx, o.z, sAt(o.z)), PY - 90, "+" + g[1] + " " + T(g[2]), g[0] === "shield" ? CREAM : "#ffd27a"); o.z = -999; }
      }
      if (o.z < (R3.on ? -180 : -80)) st.objs.splice(i, 1);   // 3D cars are long: let them pass the camera
    }
  }
  function stop(dt) {
    var c = st.cook;
    st.tickets.forEach(function (tk) {
      if (tk.done || tk.out) return; tk.left -= dt; tk.mood = tk.left / tk.pat;
      if (tk.left <= 0) { tk.out = true; st.walked++; SFX.walk(); hurt(T("Walked out! The") + " " + T(tk.o.n) + " " + T("took too long")); if (c && c.tk === tk) { nextCook(); c = st.cook; } }
    });
    if (st.phase !== "stop" || !c) return;
    if (c.phase === "serve") { c.serveT += dt; if (c.serveT > 1.1) nextCook(); return; }
    var fuel = st.inv.logs > 0, k = kid();
    if (c.phase === "smoke") {
      if (st.hold) { c.fire = Math.min(1, c.fire + dt * (fuel ? 0.6 : 0.25)); if (fuel) st.inv.logs = Math.max(0, st.inv.logs - dt * (k ? 0.12 : 0.18)); }
      else c.fire = Math.max(0, c.fire - dt * (k ? 0.22 : 0.3));
      var tgt = 150 + c.fire * 215; c.temp += (tgt - c.temp) * dt * 1.8;
      c.gustT -= dt; if (c.gustT <= 0) { var gu = rnd(10, 22) * (k ? 0.6 : 1) * (Math.random() < 0.65 ? -1 : 1); c.temp += gu; c.gustT = rnd(3, 5.5) + (k ? 2 : 0); if (gu < 0) { pop(VW / 2, 470, T("Wind gust!") + " " + Math.round(gu) + "°", "#9ad0ff"); SFX.gust(); } else pop(VW / 2, 470, T("Flare-up!") + " +" + Math.round(gu) + "°", "#ffb36b"); }
      c.temp = clamp(c.temp, 120, 360);
      var inZ = c.temp >= c.lo && c.temp <= c.hi, perf = c.temp >= c.plo && c.temp <= c.phi, near = c.temp >= c.lo - 15 && c.temp <= c.hi + 15;
      c.prog += dt / c.need * (perf ? 1.25 : inZ ? 1 : near ? 0.35 : 0);
      if (c.prog > 0 || near) { c.qt += dt; c.q += dt * (perf ? 1 : inZ ? 0.7 : near ? 0.25 : 0); }   // the warm-up doesn't count against you
      if (c.temp > 275) c.char += dt;
      if (c.prog >= 1) { c.prog = 1; c.phase = "pull"; c.pullT = 0; c.pullM = 0; c.pullDir = 1; st.hold = false; st.pullArm = false; banner(T("PULL IT!"), T("Tap when the marker hits the gold"), 1300, GOLD); }
    } else if (c.phase === "pull") {
      c.fire = Math.max(0, c.fire - dt * 0.5); c.pullT += dt;
      c.pullM += c.pullDir * dt * (k ? 0.8 : 1.25); if (c.pullM > 1) { c.pullM = 1; c.pullDir = -1; } if (c.pullM < 0) { c.pullM = 0; c.pullDir = 1; }
      if (c.pullT > 3.6) doPull(true);
    }
  }
  function doPull(auto) {
    var c = st.cook; if (!c || c.phase !== "pull") return;
    var d = Math.abs(c.pullM - c.win), pull = auto ? 0 : d <= c.pw / 2 ? 2 : d <= c.ww / 2 ? 1 : 0;
    var qual = clamp(c.q / Math.max(0.1, c.qt) - c.char * 0.12, 0, 1);
    var tk = c.tk, speed = clamp(tk.left / tk.pat, 0, 1);
    var pts = Math.round(tk.o.base * (0.5 + qual)) + [0, 35, 70][pull] + Math.round(speed * 80);
    var extra = [];
    if (st.inv.rub >= 1) { st.inv.rub--; pts += 25; extra.push(T("rub bark") + " +25"); }
    if (st.inv.sauce >= 1) { st.inv.sauce--; pts += 20; extra.push(T("Harry's glaze") + " +20"); }
    var grade = qual > 0.8 && pull === 2 ? "PERFECT!" : qual > 0.7 && pull >= 1 ? "GREAT!" : qual > 0.45 ? "GOOD" : "OK";
    if (grade === "PERFECT!") { st.perfect++; SFX.perfect(); buzz([20, 40, 20]); } else SFX.ding();
    if (auto) SFX.pull();
    st.score += pts; st.served++; tk.done = true; c.phase = "serve"; c.serveT = 0; c.grade = grade; c.pts = pts;
    pop(VW / 2, 300, T(grade) + " +" + pts, grade === "PERFECT!" ? "#ffd23f" : "#fff", true);
    if (extra.length) pop(VW / 2, 330, extra.join(" · "), "#ffd27a");
    if (auto) pop(VW / 2, 356, T("Pulled late: a little dry"), "#ffb36b");
  }

  /* ---------------- draw ---------------- */
  function draw() {
    cx.save();
    if (st.shake > 0 && !RM) cx.translate(rnd(-1, 1) * st.shake * 16, rnd(-1, 1) * st.shake * 10);
    if (st.phase === "stop" || st.phase === "finish" || (st.phase === "dead" && st.deadAtStop)) { drawStop(); if (R3.on && st.phase === "stop" && st.stopT < 0.45) fadeOut(1 - st.stopT / 0.45); }
    else { drawRoad(); if (R3.on && st.phase === "depart" && st.depT < 0.45) { drawStop(); fadeOut(st.depT / 0.45); } }
    drawHud();
    if (st.flash > 0) { cx.fillStyle = "rgba(255,40,40," + st.flash * 1.4 + ")"; cx.fillRect(0, 0, VW, VH); }
    drawPops(); drawBanner();
    cx.restore();
  }
  function drawSky() {
    var ph = BGI[st.leg];
    if (ready(ph)) {   // photo backdrop, cover-fit to the sky band, horizon on HZ; the bends pan it back and forth (no seam)
      var ih = HZ + 4, iw = ih * ph.naturalWidth / ph.naturalHeight, k = st.bgX < 400 ? st.bgX / 400 : (800 - st.bgX) / 400;
      cx.drawImage(ph, -k * (iw - VW), 0, iw, ih); return;
    }
    var bg = BG[st.leg] || (BG[st.leg] = skyFor(LEGS[st.leg])), x = -st.bgX;
    cx.drawImage(bg, x, 0, 800, HZ + 4); cx.drawImage(bg, x + 800, 0, 800, HZ + 4);
  }
  function drawRoad() {
    if (R3.on) { cx.clearRect(-40, -40, VW + 80, VH + 80); roadHints(); return; }   // the 3D view draws the road under this canvas; only labels go here
    var L = LEGS[st.leg]; drawSky();
    for (var y = HZ; y < VH; y += 2) {
      var s = (y - HZ + 1) / (PY - HZ), z = ZC / s - ZC, c = VW / 2 + (off(z) - st.camX) * s, hw = RW * s, str = (((st.dist + z) / 52) | 0) & 1, ny = ((st.dist + z) / 7 + (y >> 1)) & 255;
      cx.fillStyle = str ? L.g1 : L.g2; cx.fillRect(0, y, VW, 2);
      cx.drawImage(NOISE, 0, ny, 512, 1, 0, y, VW, 2);
      cx.fillStyle = L.sh; cx.fillRect(c - hw - 14 * s, y, hw * 2 + 28 * s, 2);   // dirt shoulder
      cx.fillStyle = str ? "#2f2d2b" : "#2b2927"; cx.fillRect(c - hw, y, hw * 2, 2);   // asphalt + grain
      cx.drawImage(NOISE, 0, 255 - ny, 512, 1, c - hw, y, hw * 2, 2);
      cx.fillStyle = "rgba(230,222,205,.8)"; cx.fillRect(c - hw + 6 * s, y, 3 * s + 0.5, 2); cx.fillRect(c + hw - 9 * s, y, 3 * s + 0.5, 2);
      if (!((((st.dist + z) / 70) | 0) & 1)) { cx.fillStyle = "rgba(222,186,80,.85)"; cx.fillRect(c - LW / 2 * s - 2 * s, y, 4 * s + 0.4, 2); cx.fillRect(c + LW / 2 * s - 2 * s, y, 4 * s + 0.4, 2); }
    }
    cx.fillStyle = GND; cx.fillRect(0, HZ, VW, VH - HZ);   // haze at the horizon, darker ground up close
    var hz = cx.createLinearGradient(0, HZ - 6, 0, HZ + 40); hz.addColorStop(0, L.sky[1]); hz.addColorStop(1, "rgba(0,0,0,0)"); cx.fillStyle = hz; cx.globalAlpha = 0.55; cx.fillRect(0, HZ - 6, VW, 46); cx.globalAlpha = 1;
    // props + objects back to front
    var list = st.props.map(function (p) { return { z: p.z, p: p }; }).concat(st.objs.map(function (o) { return { z: o.z, o: o }; }));
    list.sort(function (a, b) { return b.z - a.z; });
    var truckDrawn = false; st.bbRect = null;
    for (var i = 0; i < list.length; i++) {
      var it = list[i]; if (!truckDrawn && it.z < -8) { drawTruck(); truckDrawn = true; }
      var s2 = sAt(it.z), y2 = sy(s2), a = clamp((ZMAX - it.z) / 220, 0, 1); if (y2 < HZ - 2) continue;
      cx.globalAlpha = a;
      if (it.p) { var p = it.p, h = p.h * s2, w = h * p.spr.w / p.spr.h, x2 = sx(p.wx, it.z, s2);
        cx.drawImage(p.spr, x2 - w / 2, y2 - h, w, h);
        if (p.k === "billboard" && h > 30) st.bbRect = [x2 - w / 2, y2 - h, w, h * 0.66]; }
      else { var o = it.o; if (o.z < -900) { cx.globalAlpha = 1; continue; } var spr = o.bad ? (o.kind === "car" ? o.spr : SP[o.kind]) : SP[o.kind];
        var ow = (OW[o.kind] || 60) * s2 * 1.15, oh = ow * spr.h / spr.w, ox = sx(o.wx, it.z, s2);
        if (!o.bad) { var rw = Math.max(ow, 56 * s2 * 1.15) * 1.7; cx.drawImage(SP.ring, ox - rw / 2, y2 - rw / 6, rw, rw / 3);
          var bob = Math.sin(st.t / 220 + o.bob) * 6 * s2; cx.save(); cx.translate(ox, y2 - oh * 0.6 - 10 * s2 + bob);
          cx.drawImage(spr, -ow / 2, -oh / 2, ow, oh);
          if (!RM) { cx.fillStyle = "#fff0b0"; for (var sp = 0; sp < 3; sp++) { var sa = st.t / 260 + sp * 2.1 + o.bob, sr = (0.6 + 0.4 * Math.sin(sa * 1.7)) * 1.8 * s2 + 0.3; cx.beginPath(); cx.arc(Math.cos(sa) * rw * 0.33, Math.sin(sa * 1.3) * oh * 0.5, sr, 0, 7); cx.fill(); } }
          cx.restore(); }
        else if (o.kind === "weed") { cx.save(); cx.translate(ox, y2 - ow / 2); cx.rotate(o.rot); cx.drawImage(spr, -ow / 2, -ow / 2, ow, ow); cx.restore(); }
        else if (o.kind === "hole") cx.drawImage(spr, ox - ow / 2, y2 - oh * 0.7, ow, oh);
        else if (o.kind === "deer") { var du = Math.abs(o.wx + 4000) / 75 % 1; cx.save(); cx.translate(ox, y2 - oh / 2 - 4 * du * (1 - du) * 20 * s2); if (o.vx > 0) cx.scale(-1, 1); cx.rotate((0.5 - du) * 0.5); cx.drawImage(spr, -ow / 2, -oh / 2, ow, oh); cx.restore(); }   // the photo faces left; it bounds across in leaps, nose up then down
        else cx.drawImage(spr, ox - ow / 2, y2 - oh, ow, oh); }
      cx.globalAlpha = 1;
    }
    if (!truckDrawn) drawTruck();
    cx.drawImage(GRADE, 0, 0, VW, VH);
    // tap hint for the billboard
    roadHints();
  function roadHints() {
    if (st.bbRect && st.bbRect[3] > 50) { cx.fillStyle = "rgba(0,0,0,.6)"; rr(cx, st.bbRect[0] + st.bbRect[2] / 2 - 34, st.bbRect[1] + st.bbRect[3] + 4, 68, 16, 8); cx.fill(); cx.fillStyle = "#ffd23f"; cx.font = "800 10px " + BODY; cx.textAlign = "center"; cx.fillText("TAP ▶", st.bbRect[0] + st.bbRect[2] / 2, st.bbRect[1] + st.bbRect[3] + 16); }
    if (st.phase === "drive" && st.legT < 5000 && st.leg === 0) hint(T("Swipe or tap a side to change lanes"));
  }
  }
  function hint(t) { cx.font = "800 14px " + BODY; var w = cx.measureText(t).width + 28; cx.fillStyle = "rgba(20,10,6,.7)"; rr(cx, VW / 2 - w / 2, VH - 44, w, 30, 15); cx.fill(); cx.fillStyle = CREAM; cx.textAlign = "center"; cx.fillText(t, VW / 2, VH - 24); }
  function drawTruck() {
    var x = sx(st.px, 0, 1), y = PY, smx = 35, smy = -38; cx.save(); cx.translate(x, y); cx.rotate(st.tilt * 0.35);
    cx.fillStyle = "rgba(0,0,0,.35)"; cx.beginPath(); cx.ellipse(0, 46, 82, 12, 0, 0, 7); cx.fill();
    if (SP.truck) {   // the photo rig: chimney smoke comes off the stack near the top centre
      var tw = 136, th = tw * SP.truck.h / SP.truck.w, two = SP.truckbody && SP.smoker; smx = -1; smy = 48 - th * 0.93;
      if (st.dmg > 1 && SP.fire && !RM) {   // engine fire: the flame photo, added as light, behind the cab
        cx.globalCompositeOperation = "lighter";
        for (var f = 0; f < (st.dmg > 2 ? 4 : 2); f++) { var fh = (st.dmg > 2 ? 104 : 62) * (0.8 + 0.2 * Math.sin(st.t / 53 + f * 2.3)), fw = fh * SP.fire.w / SP.fire.h; cx.drawImage(SP.fire, (f - (st.dmg > 2 ? 1.5 : 0.5)) * 24 - fw / 2, 48 - th * 0.72 - fh, fw, fh); }
        cx.globalCompositeOperation = "source-over";
      }
      if (st.dmg > 0) puffs(0, 48 - th * 0.84, 1.2 + st.dmg * 0.3, 3.4, 0.4 + st.dmg * 0.12, 1);   // engine smoke over the cab
      if (two) {   // the smoker is its own layer so it can sway on the hitch
        cx.drawImage(SP.truckbody, -tw / 2, 48 - th, tw, th);
        cx.save(); cx.translate(st.sway, 48); cx.rotate(st.sway * 0.007); cx.drawImage(SP.smoker, -tw / 2, -th, tw, th); cx.restore(); smx = -1 + st.sway * 2;
      } else cx.drawImage(SP.truck, -tw / 2, 48 - th, tw, th);
    } else {
    // pickup (ahead of the trailer)
    cx.fillStyle = "#1a1a1a"; rr(cx, -64, -20, 18, 26, 5); cx.fill(); rr(cx, 46, -20, 18, 26, 5); cx.fill();
    cx.fillStyle = "#a81c24"; rr(cx, -60, -62, 120, 52, 10); cx.fill();
    cx.fillStyle = RED; rr(cx, -46, -92, 92, 36, 12); cx.fill();
    cx.fillStyle = "#26333b"; rr(cx, -38, -86, 76, 22, 6); cx.fill(); cx.fillStyle = "rgba(255,255,255,.25)"; cx.fillRect(-28, -84, 12, 18);
    cx.fillStyle = "#ff3b3b"; rr(cx, -58, -52, 10, 16, 3); cx.fill(); rr(cx, 48, -52, 10, 16, 3); cx.fill();
    cx.fillStyle = "#7a1218"; cx.fillRect(-60, -30, 120, 6);
    // the smoker trailer (closest to the camera)
    cx.fillStyle = "#151515"; rr(cx, -58, 22, 20, 26, 6); cx.fill(); rr(cx, 38, 22, 20, 26, 6); cx.fill();
    cx.fillStyle = "#2a2a2a"; cx.fillRect(-4, -14, 8, 22);
    var g = cx.createLinearGradient(0, -10, 0, 40); g.addColorStop(0, "#4a4a4a"); g.addColorStop(0.45, "#1d1d1d"); g.addColorStop(1, "#0b0b0b");
    cx.fillStyle = g; rr(cx, -54, -6, 108, 46, 22); cx.fill();
    cx.strokeStyle = "#666"; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(-50, 14); cx.lineTo(50, 14); cx.stroke();
    cx.fillStyle = GOLD; rr(cx, -14, 20, 28, 8, 3); cx.fill(); cx.fillStyle = INK; cx.font = "900 6px " + BODY; cx.textAlign = "center"; cx.fillText("HARRY'S", 0, 26.5);
    var glow = 0.35 + Math.sin(st.t / 90) * 0.15; cx.fillStyle = "rgba(255,120,30," + glow + ")"; rr(cx, -46, 30, 20, 7, 3); cx.fill();
    cx.fillStyle = "#3a3a3a"; rr(cx, 30, -34, 10, 32, 3); cx.fill(); cx.fillStyle = "#555"; cx.fillRect(28, -36, 14, 4);
    cx.fillStyle = "#ff3b3b"; cx.fillRect(-54, 36, 8, 5); cx.fillRect(46, 36, 8, 5);
    }
    // chimney smoke
    puffs(smx, smy, 1, 3.4, 0.62, 1);
    cx.restore();
  }
  function drawStop() {
    var L = LEGS[st.leg], c = st.cook, bx = 30, by = 128, bw = 340, bh = 170;
    if (ready(STOPI)) {   // photo stand: cover-fit so its blank sign board sits at (200..368, 124..196); name / logo go on the board
      var sh = VW * STOPI.naturalHeight / STOPI.naturalWidth; cx.drawImage(STOPI, 0, -72, VW, sh);
      if (L.final && LOGO.complete && LOGO.naturalWidth) cx.drawImage(LOGO, 284 - 34, 126, 68, 68);
      else { cx.fillStyle = "#ffe3a0"; cx.shadowColor = GOLD; cx.shadowBlur = 10; cx.font = "400 16px " + DISP; cx.textAlign = "center"; cx.fillText(L.stop + " BBQ STOP", 284, 156); cx.shadowBlur = 0;
        cx.fillStyle = CREAM; cx.font = "800 9px " + BODY; cx.fillText("HISTORIC ROUTE 66 · " + L.st, 284, 172); }
      cx.fillStyle = "rgba(0,0,0,.28)"; cx.fillRect(0, 296, VW, 10);
    } else {
    drawSky(); cx.fillStyle = L.g2; cx.fillRect(0, HZ, VW, VH - HZ);
    cx.fillStyle = "#3b3836"; cx.fillRect(0, 300, VW, 26);
    // the roadside stand
    cx.fillStyle = "#6b3e1f"; cx.fillRect(bx, by, bw, bh);
    cx.fillStyle = "#5a3418"; for (var x = bx; x < bx + bw; x += 17) cx.fillRect(x, by, 2, bh);
    cx.fillStyle = RED_D; cx.beginPath(); cx.moveTo(bx - 14, by + 4); cx.lineTo(bx + bw / 2, by - 30); cx.lineTo(bx + bw + 14, by + 4); cx.closePath(); cx.fill();
    // awning stripes
    for (var i = 0; i < 10; i++) { cx.fillStyle = i % 2 ? CREAM : RED; cx.beginPath(); var ax = bx + i * bw / 10; cx.moveTo(ax, by + 64); cx.lineTo(ax + bw / 10, by + 64); cx.lineTo(ax + bw / 10, by + 84); cx.quadraticCurveTo(ax + bw / 20, by + 92, ax, by + 84); cx.closePath(); cx.fill(); }
    // sign: the final stop is Harry's itself
    if (L.final && LOGO.complete && LOGO.naturalWidth) { cx.drawImage(LOGO, bx + bw / 2 - 40, by - 46, 80, 80); }
    else { cx.fillStyle = "#1e140c"; rr(cx, bx + 70, by + 10, 200, 46, 8); cx.fill(); cx.strokeStyle = GOLD; cx.lineWidth = 2; rr(cx, bx + 73, by + 13, 194, 40, 6); cx.stroke();
      cx.fillStyle = "#ffe3a0"; cx.shadowColor = GOLD; cx.shadowBlur = 10; cx.font = "400 17px " + DISP; cx.textAlign = "center"; cx.fillText(L.stop + " BBQ STOP", bx + bw / 2, by + 34); cx.shadowBlur = 0;
      cx.fillStyle = CREAM; cx.font = "800 9px " + BODY; cx.fillText("HISTORIC ROUTE 66 · " + L.st, bx + bw / 2, by + 48); }
    }
    // Antidote's review poster on the wall (always visible here; tap = review card)
    var pw = 92, ph = 56, ppx = bx + bw - pw - 10, ppy = by + 98; cx.drawImage(SP.review, ppx, ppy, pw, ph); st.posterRect = [ppx, ppy, pw, ph];
    cx.drawImage(SP.shield, bx + 12, by + 100, 36, 40);
    // counter + guests
    var open = st.tickets.filter(function (t) { return !t.done && !t.out; });
    st.tickets.forEach(function (tk, i) {   // photo guests at the counter: a tick when served, a red badge when their patience is nearly gone
      var im = GUESTS[tk.guest]; if (tk.out || !ready(im)) return;
      var gw = 60, gh = gw * im.naturalHeight / im.naturalWidth, gx = bx + 84 + i * 56, gy = by + 176 - gh;
      cx.drawImage(im, gx - gw / 2, gy, gw, gh);
      if (tk.done || tk.mood < 0.3) { cx.fillStyle = tk.done ? "#2f9e44" : RED; cx.beginPath(); cx.arc(gx + 20, gy + 10, 9, 0, 7); cx.fill(); cx.fillStyle = "#fff"; cx.font = "900 12px " + BODY; cx.textAlign = "center"; cx.fillText(tk.done ? "\u2713" : "!", gx + 20, gy + 14); }
    });
    if (!ready(STOPI)) { cx.fillStyle = "#3a2010"; cx.fillRect(bx, by + 150, bw, 20); cx.fillStyle = "#8a5a2a"; cx.fillRect(bx, by + 148, bw, 5); }
    // tickets
    var tw = Math.min(92, (VW - 20) / Math.max(1, st.tickets.length) - 6);
    st.tickets.forEach(function (tk, i) {
      var x0 = 10 + i * (tw + 6), y0 = 46, act = c && c.tk === tk;
      cx.save(); cx.globalAlpha = tk.out ? 0.35 : tk.done ? 0.55 : 1;
      cx.fillStyle = "#fff8e8"; rr(cx, x0, y0, tw, 74, 8); cx.fill();
      cx.fillStyle = tk.out ? "#555" : tk.done ? "#2f855a" : act ? RED : GOLD; rr(cx, x0, y0, tw, 7, 4); cx.fill();
      cx.fillStyle = INK; cx.textAlign = "left"; cx.font = "800 11px " + BODY; wrap(T(tk.o.n), x0 + 7, y0 + 22, tw - 12, 12);
      cx.font = "600 9px " + BODY; cx.fillStyle = "#6b4a2a"; cx.fillText("+ " + T(tk.side), x0 + 7, y0 + 52, tw - 12);
      if (!tk.done && !tk.out) { var f = clamp(tk.left / tk.pat, 0, 1); cx.fillStyle = "#e3d6b5"; rr(cx, x0 + 6, y0 + 60, tw - 12, 6, 3); cx.fill(); cx.fillStyle = f > 0.5 ? "#2f855a" : f > 0.25 ? GOLD : RED; rr(cx, x0 + 6, y0 + 60, (tw - 12) * f, 6, 3); cx.fill(); }
      else { cx.font = "900 10px " + BODY; cx.fillStyle = tk.out ? RED : "#2f855a"; cx.fillText(tk.out ? T("WALKED") : T("SERVED ✓"), x0 + 7, y0 + 68); }
      if (act) { cx.strokeStyle = RED; cx.lineWidth = 2.5; rr(cx, x0 - 1, y0 - 1, tw + 2, 76, 9); cx.stroke(); }
      cx.restore();
    });
    // the smoker + gauge
    drawCook(c); cx.drawImage(GRADE, 0, 0, VW, VH); cx.save(); cx.translate(209, 121); cx.scale(0.62, 0.62); drawGauge(c); cx.restore();
    if (c && c.phase === "pull") drawPull(c);
    if (c && c.phase === "smoke") hint(st.inv.logs <= 0 ? T("Out of hickory! Grab logs on the road") : st.hold ? T("Feeding hickory… let go to cool") : T("HOLD to feed the fire · let go to cool"));
    if (st.phase === "finish") { cx.fillStyle = "rgba(20,10,6," + Math.min(0.7, st.finT * 0.4) + ")"; cx.fillRect(0, 0, VW, VH); }
  }
  function wrap(t, x, y, mw, lh) { var w = t.split(" "), line = "", n = 0; for (var i = 0; i < w.length; i++) { var tt = line ? line + " " + w[i] : w[i]; if (cx.measureText(tt).width > mw && line) { cx.fillText(line, x, y + n * lh); line = w[i]; n++; } else line = tt; } cx.fillText(line, x, y + n * lh); }
  function drawGauge(c) {
    var gx = VW / 2, gy = 404, R = 80, t = c ? c.temp : 150;
    cx.fillStyle = "rgba(20,10,6,.82)"; rr(cx, gx - R - 18, gy - R - 16, (R + 18) * 2, R + 76, 16); cx.fill();
    function arc(a, b, col, w) { cx.strokeStyle = col; cx.lineWidth = w; cx.beginPath(); cx.arc(gx, gy, R - 8, Math.PI + (a - 150) / 200 * Math.PI, Math.PI + (b - 150) / 200 * Math.PI); cx.stroke(); }
    var lo = c ? c.lo : 225, hi = c ? c.hi : 250, plo = c ? c.plo : 232, phi = c ? c.phi : 243;
    arc(150, lo - 15, "#3b6ef5", 12); arc(lo - 15, lo, "#2a6a5a", 12); arc(lo, hi, "#1f9a55", 14); arc(plo, phi, "#ffd23f", 16); arc(hi, hi + 25, "#d1702a", 12); arc(hi + 25, 350, RED, 12);
    cx.fillStyle = CREAM; cx.font = "700 9px " + BODY; cx.textAlign = "center";
    [150, 200, 250, 300, 350].forEach(function (v) { var a = Math.PI + (v - 150) / 200 * Math.PI; cx.fillText(v + "", gx + Math.cos(a) * (R + 7), gy + Math.sin(a) * (R + 7) + 3); });
    var a = Math.PI + (clamp(t, 150, 350) - 150) / 200 * Math.PI;
    cx.strokeStyle = "#fff"; cx.lineWidth = 4; cx.lineCap = "round"; cx.shadowColor = "#fff"; cx.shadowBlur = 8; cx.beginPath(); cx.moveTo(gx, gy); cx.lineTo(gx + Math.cos(a) * (R - 14), gy + Math.sin(a) * (R - 14)); cx.stroke(); cx.shadowBlur = 0; cx.lineCap = "butt";
    cx.fillStyle = RED; cx.beginPath(); cx.arc(gx, gy, 8, 0, 7); cx.fill();
    var inZ = c && t >= lo && t <= hi, perf = c && t >= plo && t <= phi;
    cx.fillStyle = perf ? "#ffd23f" : inZ ? "#7be3a0" : t > hi ? "#ff8a6a" : "#9ad0ff"; cx.font = "400 26px " + NUM; cx.textAlign = "right"; cx.fillText(Math.round(t) + "°F", gx - 8, gy + 30);
    cx.textAlign = "left"; cx.font = "900 11px " + BODY; cx.fillText(perf ? T("PERFECT") : inZ ? T("SLOW & LOW") : t > hi ? T("TOO HOT") : T("TOO COOL"), gx + 8, gy + 26); cx.textAlign = "center";
    // smoke bar
    var bw = 2 * R + 20, by = gy + 40; cx.fillStyle = "#3a2a20"; rr(cx, gx - bw / 2, by, bw, 12, 6); cx.fill();
    if (c) { var gr = cx.createLinearGradient(gx - bw / 2, 0, gx + bw / 2, 0); gr.addColorStop(0, "#7a4a26"); gr.addColorStop(1, GOLD); cx.fillStyle = gr; rr(cx, gx - bw / 2, by, Math.max(12, bw * c.prog), 12, 6); cx.fill();
      cx.fillStyle = CREAM; cx.font = "800 9px " + BODY; cx.fillText(T("SMOKE") + " · " + T(c.tk.o.n).toUpperCase(), gx, by + 9.5); }
  }
  // photo smoke puffs (img/r66/smoke*.webp): each one turns, swells and thins out. k = spread, sz = size, al = strength, step = draw every n-th
  function puffs(ox, oy, k, sz, al, step) {
    for (var i = 0; i < st.smoke.length; i += step) {
      var p = st.smoke[i], u = p.t / p.m, im = SMK[p.s || 0], a = Math.min(1, u * 5) * (1 - u) * (1 - u) * al, w = p.r * sz * k;
      if (!ready(im)) { cx.fillStyle = "rgba(200,195,188," + a * 0.7 + ")"; cx.beginPath(); cx.arc(ox + p.x * k, oy + p.y * k, w / 3, 0, 7); cx.fill(); continue; }
      cx.save(); cx.translate(ox + p.x * k, oy + p.y * k); cx.rotate((p.a || 0) + (p.va || 0) * p.t); cx.globalAlpha = a; cx.drawImage(im, -w / 2, -w / 2, w, w * im.naturalHeight / im.naturalWidth); cx.restore();
    }
  }
  function cover(im, x, y, w, h, z) { var iw = im.naturalWidth, ih = im.naturalHeight, k = Math.max(w / iw, h / ih) * (z || 1), sw = w / k, sh = h / k; cx.drawImage(im, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x, y, w, h); }
  function fadeOut(a) { cx.save(); cx.globalCompositeOperation = "destination-out"; cx.fillStyle = "rgba(0,0,0," + clamp(a, 0, 1) + ")"; cx.fillRect(-40, -40, VW + 80, VH + 80); cx.restore(); }
  /* the grate cam: the real dish on the smoker. The raw photo cross-fades to the finished one as the smoke bar fills,
     the coals glow with the fire, smoke rolls off, too much heat chars it. Serve = Harry's own photo of the dish. */
  var LASTC = null;
  function drawCook(c) {
    if (c) LASTC = c; else c = LASTC;
    var y0 = 306, h = VH - y0; cx.fillStyle = "#0d0906"; cx.fillRect(0, y0, VW, h); if (!c) return;
    var o = c.tk.o, raw = cookImg("img/r66/cook/" + o.ph + "-raw.webp"), done = cookImg("img/r66/cook/" + o.ph + "-done.webp");
    var k = c.phase === "smoke" ? clamp((c.prog - 0.1) / 0.82, 0, 1) : 1, z = 1.02 + 0.1 * c.prog + (RM ? 0 : Math.sin(st.t / 2400) * 0.012); k = k * k * (3 - 2 * k);
    if (ready(raw)) cover(raw, 0, y0, VW, h, z);
    if (ready(done)) { cx.globalAlpha = ready(raw) ? k : 1; cover(done, 0, y0, VW, h, z); cx.globalAlpha = 1; }
    if (c.char > 0.02) { cx.fillStyle = "rgba(14,6,2," + Math.min(0.5, c.char * 0.55) + ")"; cx.fillRect(0, y0, VW, h); }
    var fl = RM ? 1 : 0.82 + 0.18 * Math.sin(st.t / 83) * Math.sin(st.t / 31), g = cx.createRadialGradient(VW / 2, VH + 30, 10, VW / 2, VH + 30, 300);
    g.addColorStop(0, "rgba(255,140,40," + (0.14 + 0.5 * c.fire) * fl + ")"); g.addColorStop(1, "rgba(255,90,10,0)");
    cx.globalCompositeOperation = "lighter"; cx.fillStyle = g; cx.fillRect(0, y0, VW, h); cx.globalCompositeOperation = "source-over";
    puffs(VW / 2, y0 + h * 0.62, 5, 2, 0.28, 3);
    var top = cx.createLinearGradient(0, y0, 0, y0 + 26); top.addColorStop(0, "rgba(0,0,0,.6)"); top.addColorStop(1, "rgba(0,0,0,0)"); cx.fillStyle = top; cx.fillRect(0, y0, VW, 26);
    if (c.phase === "serve") {
      var sv = o.sv && cookImg("img/" + o.sv + ".webp"), im = ready(sv) ? sv : done, a = clamp(c.serveT / 0.25, 0, 1); if (!ready(im)) return;
      var w = 150 * (0.75 + 0.25 * a), hh = w * 1.2, x = VW / 2 - w / 2, y = 486 - hh / 2;
      cx.save(); cx.globalAlpha = a; cx.fillStyle = "rgba(0,0,0,.5)"; cx.fillRect(0, y0, VW, h);
      cx.shadowColor = "rgba(0,0,0,.6)"; cx.shadowBlur = 18; cx.fillStyle = CREAM; rr(cx, x - 6, y - 6, w + 12, hh + 34, 10); cx.fill(); cx.shadowBlur = 0;
      cx.save(); rr(cx, x, y, w, hh, 6); cx.clip(); cover(im, x, y, w, hh); cx.restore();
      cx.fillStyle = INK; cx.font = "800 12px " + BODY; cx.textAlign = "center"; cx.fillText(T(o.n).toUpperCase(), VW / 2, y + hh + 19); cx.restore();
    }
  }
  function drawPull(c) {
    var x0 = 40, w = VW - 80, y0 = 490; cx.fillStyle = "rgba(20,10,6,.9)"; rr(cx, x0 - 10, y0 - 26, w + 20, 52, 12); cx.fill();
    cx.fillStyle = "#3a2a20"; rr(cx, x0, y0, w, 16, 8); cx.fill();
    cx.fillStyle = "#1f9a55"; rr(cx, x0 + w * (c.win - c.ww / 2), y0, w * c.ww, 16, 6); cx.fill();
    cx.fillStyle = "#ffd23f"; rr(cx, x0 + w * (c.win - c.pw / 2), y0 - 2, w * c.pw, 20, 5); cx.fill();
    var mx = x0 + w * c.pullM; cx.fillStyle = "#fff"; cx.shadowColor = "#fff"; cx.shadowBlur = 10; rr(cx, mx - 3, y0 - 8, 6, 32, 3); cx.fill(); cx.shadowBlur = 0;
    cx.fillStyle = CREAM; cx.font = "800 11px " + BODY; cx.textAlign = "center"; cx.fillText(T("TAP TO PULL · gold = perfect bark"), VW / 2, y0 - 10);
  }
  function drawHud() {
    cx.fillStyle = "rgba(20,10,6,.78)"; cx.fillRect(0, 0, VW, 40);
    cx.textAlign = "left"; cx.fillStyle = "#ffd27a"; cx.font = "400 26px " + NUM; cx.fillText(st.score.toLocaleString(), 10, 29);
    cx.textAlign = "right"; cx.font = "14px system-ui"; var hs = ""; for (var i = 0; i < 5; i++) hs += i < st.hearts ? "❤" : "♡"; cx.fillStyle = "#ff5a5a"; cx.fillText(hs, VW - 10, 26);
    // route strip
    var x0 = 112, x1 = VW - 104, y = 20; cx.strokeStyle = "#5a3a22"; cx.lineWidth = 4; cx.beginPath(); cx.moveTo(x0, y); cx.lineTo(x1, y); cx.stroke();
    var prog = (st.leg + (st.phase === "drive" ? clamp(st.legT / LEG_MS(), 0, 1) : st.phase === "depart" ? 0 : 1)) / 6;
    var gr = cx.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, RED); gr.addColorStop(1, GOLD); cx.strokeStyle = gr; cx.beginPath(); cx.moveTo(x0, y); cx.lineTo(x0 + (x1 - x0) * prog, y); cx.stroke();
    for (i = 0; i < 7; i++) { var px = x0 + (x1 - x0) * i / 6; cx.fillStyle = i <= st.leg ? GOLD : "#5a3a22"; cx.beginPath(); cx.arc(px, y, 4, 0, 7); cx.fill(); }
    cx.fillStyle = CREAM; cx.font = "800 7.5px " + BODY; cx.textAlign = "center"; cx.fillText(CITIES[st.leg] + " → " + CITIES[Math.min(6, st.leg + 1)], (x0 + x1) / 2, 36);
    cx.fillStyle = "#fff"; cx.font = "11px system-ui"; cx.fillText("🛻", x0 + (x1 - x0) * prog, y + 4);
    // pantry
    var stopV = st.phase === "stop" || st.phase === "finish" || (st.phase === "dead" && st.deadAtStop), iy = stopV ? 302 : 48, ix = 8;
    cx.fillStyle = "rgba(20,10,6,.62)"; rr(cx, ix, iy, 132, 26, 13); cx.fill();
    [["log", Math.ceil(st.inv.logs - 0.001)], ["rub", st.inv.rub], ["sauce", st.inv.sauce]].forEach(function (p, j) {
      var s = SP[p[0]], h = 20, w = h * s.w / s.h; if (w > 26) { w = 26; h = w * s.h / s.w; }
      cx.drawImage(s, ix + 8 + j * 42, iy + 13 - h / 2, w, h); cx.fillStyle = p[1] ? CREAM : "#8a7a6a"; cx.font = "800 12px " + BODY; cx.textAlign = "left"; cx.fillText("×" + p[1], ix + 8 + j * 42 + w + 2, iy + 18);
    });
    // says so on screen when the road is not the full 3D one, so a phone that falls back can be reported
    var s3 = W.__R663, why = s3 ? (!R3.on ? s3.reason : s3.models && s3.models.length < 6 ? s3.models.length + "/6 3D models loaded" : "") : (performance.now() > 8000 && !/[?&]render=2d/i.test(location.search) ? "3D script did not load" : "");
    if (why) { cx.textAlign = "left"; cx.font = "700 10px " + BODY; cx.fillStyle = "rgba(255,255,255,.6)"; cx.fillText((R3.on ? "" : "2D road · ") + why, 8, VH - 8); }
    if (kid()) { cx.fillStyle = "#ffd23f"; rr(cx, VW - 74, iy, 66, 22, 11); cx.fill(); cx.fillStyle = INK; cx.font = "900 11px " + BODY; cx.textAlign = "center"; cx.fillText("🧒 KID", VW - 41, iy + 15); }
  }
  function drawPops() {
    st.pops.forEach(function (p) { var a = clamp(1.3 - p.t, 0, 1); cx.globalAlpha = a; cx.textAlign = "center"; cx.font = (p.big ? "400 34px " + NUM : "800 15px " + BODY); cx.lineWidth = p.big ? 5 : 4; cx.strokeStyle = "rgba(20,10,6,.85)"; cx.strokeText(p.txt, p.x, p.y); cx.fillStyle = p.col; cx.fillText(p.txt, p.x, p.y); });
    cx.globalAlpha = 1;
  }
  function drawBanner() {
    var b = st.banner; if (!b) return; var a = Math.min(1, b.t / 400, (b.max - b.t) / 220);
    cx.save(); cx.globalAlpha = clamp(a, 0, 1); var y = 236;
    cx.fillStyle = "rgba(20,10,6,.72)"; cx.fillRect(0, y - 44, VW, 80);
    cx.fillStyle = b.col; cx.fillRect(0, y - 44, VW, 3); cx.fillRect(0, y + 33, VW, 3);
    cx.textAlign = "center"; cx.font = "400 " + (b.big.length > 18 ? 22 : 30) + "px " + DISP; cx.lineWidth = 5; cx.strokeStyle = INK; cx.strokeText(b.big, VW / 2, y); cx.fillStyle = "#ffe3a0"; cx.fillText(b.big, VW / 2, y);
    cx.font = "700 13px " + BODY; cx.fillStyle = CREAM; cx.fillText(b.small, VW / 2, y + 22);
    cx.restore();
  }
  function drawAttract() {
    // behind the start menu: the rig cruising Route 66
    st.speed = 300; road(1 / 60); st.objs = []; drawRoad();
  }

  /* ---------------- loop ---------------- */
  var last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (st.running && !st.paused) { update(dt); st.played += dt * 1000; if (st.running) draw(); }   // end() paints the final card itself
    else if (!st.running && !st.over) { st.t += dt * 1000; drawAttract(); drawHud();
      if (R3.go) { cx.fillStyle = "rgba(20,10,6,.82)"; rr(cx, VW / 2 - 118, VH / 2 - 22, 236, 44, 22); cx.fill(); cx.fillStyle = CREAM; cx.font = "800 15px " + BODY; cx.textAlign = "center"; cx.fillText(T("Loading the 3D road…"), VW / 2, VH / 2 + 5); } }
    else if (st.over) { /* keep the last frame */ }
    if (R3.render) R3.render(now, dt * 1000);   // catches its own errors and falls back to this canvas
    if (AC) syncAudio();
  }
  BG[0] = skyFor(LEGS[0]); bgLoad(0);
  requestAnimationFrame(frame);

  /* ---------------- input ---------------- */
  function canvasXY(e) { var r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * VW / r.width, (e.clientY - r.top) * VH / r.height]; }
  function inRect(p, r) { return r && p[0] >= r[0] && p[0] <= r[0] + r[2] && p[1] >= r[1] && p[1] <= r[1] + r[3]; }
  function setLane(n) { if (st.phase !== "drive" && st.phase !== "depart") return; st.lane = clamp(n, 0, 2); }
  var drag = null;
  cv.addEventListener("pointerdown", function (e) {
    if (!st.running) return;   // the start menu (gamemenu.js) starts runs
    e.preventDefault(); audio();
    var p = canvasXY(e);
    if ((st.phase === "drive" && inRect(p, st.bbRect)) || (st.phase === "stop" && inRect(p, st.posterRect))) { reviewCard(); return; }
    if (st.phase === "stop") { if (st.cook && st.cook.phase === "pull") doPull(false); else st.hold = true; try { cv.setPointerCapture(e.pointerId); } catch (x) {} return; }
    drag = { id: e.pointerId, x: e.clientX, lane: st.lane, moved: false }; try { cv.setPointerCapture(e.pointerId); } catch (x) {}
  });
  cv.addEventListener("pointermove", function (e) { if (!drag || e.pointerId !== drag.id) return; e.preventDefault();
    var r = cv.getBoundingClientRect(), d = (e.clientX - drag.x) * VW / r.width / 100; if (Math.abs(d) > 0.18) drag.moved = true; if (drag.moved) setLane(drag.lane + Math.round(d * 1.4)); });
  function up(e) { st.hold = false; if (!drag || e.pointerId !== drag.id) return; var d = drag; drag = null;
    if (!d.moved && e.type === "pointerup") { var p = canvasXY(e); setLane(st.lane + (p[0] < VW / 2 ? -1 : 1)); } }
  ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (t) { cv.addEventListener(t, up); });
  var HOLDK = { " ": 1, ArrowUp: 1, Enter: 1, w: 1, W: 1 };
  addEventListener("keydown", function (e) {
    if (!st.running || st.paused) return;
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") { setLane(st.lane - 1); e.preventDefault(); }
    else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") { setLane(st.lane + 1); e.preventDefault(); }
    else if (HOLDK[e.key]) { e.preventDefault(); audio(); if (st.phase === "stop") { if (st.cook && st.cook.phase === "pull") { if (!e.repeat) doPull(false); } else st.hold = true; } }
  });
  addEventListener("keyup", function (e) { if (HOLDK[e.key]) st.hold = false; });
  addEventListener("blur", function () { st.hold = false; });

  /* ---------------- Antidote's review card (poster + billboard). Review not shot yet: placeholder, links to his channel ---------------- */
  function reviewCard() {
    if (D.querySelector(".r66-card")) return; st.paused = true; st.hold = false; syncAudio();
    var d = D.createElement("div"); d.className = "r66-card"; d.setAttribute("role", "dialog"); d.setAttribute("aria-label", "Antidote's food review");
    d.innerHTML = '<div class="r66-cin"><div class="r66-cp"><span>▶</span></div><b>' + T("Antidote reviews Harry's") + '</b><p>' + T("His food review of Harry's Smokehouse is coming soon. Until then, catch his other reviews on YouTube.") + '</p>' +
      '<a class="r66-cb" href="https://www.youtube.com/@therealantidote" target="_blank" rel="noopener">▶ ' + T("Watch @therealantidote") + '</a><button type="button" class="r66-cx">' + T("Back to the game") + '</button></div>';
    (cv.closest(".gamebox") || D.body).appendChild(d);
    var close = function () { d.remove(); st.paused = false; last = performance.now(); syncAudio(); };
    d.querySelector(".r66-cx").onclick = close; d.addEventListener("click", function (e) { if (e.target === d) close(); });
    var b = d.querySelector(".r66-cx"); try { b.focus(); } catch (e) {}
  }

  /* ---------------- modes (Kid needs a signed-in parent: crm.js SSAI_TOKENS.kidUnlock) ---------------- */
  function setMode(m) { MODE = m === "kid" ? "kid" : "adult"; try { localStorage.setItem("r66-mode", MODE); } catch (e) {} if (W.R66_MODE) W.R66_MODE(MODE); }
  function menuRefresh() { try { if (W.GameMenu && W.GameMenu.refresh) W.GameMenu.refresh(); } catch (e) {} }
  function requestMode(v) {
    var TK = W.SSAI_TOKENS; v = v === "kid" ? "kid" : "adult"; if (v === MODE) return;
    if (!TK || !TK.kidUnlock) { setMode(v); menuRefresh(); return; }
    if (v === "kid") { TK.kidUnlock(function () { setMode("kid"); menuRefresh(); }, MODE === "adult"); return; }
    if (MODE === "kid") { TK.parentCheck("Leave Kid mode", function () { setMode("adult"); menuRefresh(); }); return; }
    setMode("adult"); menuRefresh();
  }
  if (MODE === "kid") setTimeout(function () { var TK = W.SSAI_TOKENS; if (TK && TK.isParent && !TK.isParent()) { MODE = ""; try { localStorage.removeItem("r66-mode"); } catch (e) {} menuRefresh(); } }, 0);

  W.__R66 = { get: function () { return st; }, r3d: R3, off: off, OW: OW, BGI: BGI, SMK: SMK, K: { VW: VW, VH: VH, ZMAX: ZMAX }, start: start, end: end, mode: function () { return MODE; }, requestMode: requestMode, setMode: setMode,
    sound: function (v) { sndOn = v !== false; try { localStorage.setItem("r66-sound", sndOn ? "1" : "0"); } catch (e) {} syncAudio(); return sndOn; }, isSound: function () { return sndOn; },
    // test hooks
    jump: function (leg, phase) { st.leg = clamp(leg, 0, 5); BG[st.leg] = BG[st.leg] || skyFor(LEGS[st.leg]); bgLoad(st.leg); if (phase === "stop") stopStart(); else legStart(); },
    pull: doPull, review: reviewCard, LEGS: LEGS, SP: SP, step: function (dt) { update(dt); }, hold: function (v) { st.hold = !!v; }, lane: function (n) { setLane(n); } };
})();
