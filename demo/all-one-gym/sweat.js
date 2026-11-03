/* Idle "sweat + dumbbell drop" (same idea as the cheese pour on antidotethefoodie.com).
   10 s with no touch -> sweat beads swell up out of "pores" all over the screen (staggered, glistening);
   the heavy ones sometimes creep a short way and stop. Then dumbbells drop in, bounce and stack.
   Any touch/scroll/key flicks the dumbbells off screen and dries the sweat.
   Skipped while a workout timer is running (window.AOG_BUSY) and for prefers-reduced-motion. */
(function () {
  "use strict";
  var IDLE_MS = 10000, MAX_BELLS = 9;
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var cv = document.createElement("canvas"), cx = cv.getContext("2d");
  cv.id = "sweatfx"; cv.setAttribute("aria-hidden", "true");
  cv.style.cssText = "position:fixed;inset:0;width:100%;height:100%;z-index:70;pointer-events:none;opacity:0;transition:opacity .4s";
  document.body.appendChild(cv);

  var W = 0, H = 0, dpr = 1, drops = [], bells = [], trail = [], t0 = 0, raf = 0, on = false, leaving = false, timer = 0, nextBell = 0;
  var accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#e11d2e";

  function size() {
    dpr = Math.min(2, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // a pore: fixed spot where a bead swells out of the screen, after a staggered delay.
  // Sweat comes in patches: most pores sit near a few "hot spots", the rest are scattered.
  var spots = [];
  function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5; }
  function drop(delay) {
    var x, y, k = Math.random();
    if (spots.length && Math.random() < 0.7) { var c = spots[(Math.random() * spots.length) | 0]; x = c.x + gauss() * c.s; y = c.y + gauss() * c.s * 1.3; }
    else { x = Math.random() * W; y = Math.random() * H; }
    var max = k < 0.55 ? 0.5 + Math.random() * 1.1 : k < 0.88 ? 2.4 + Math.random() * 3.4 : 6.5 + Math.random() * 6; // mist / beads / heavy
    return { x: x, y: y, r: 0, max: max, wait: delay == null ? Math.random() * 300 : delay, vy: 0, run: 0, wob: Math.random() * 6,
      spr: (Math.random() * SPR.length) | 0, rot: (Math.random() - 0.5) * 0.5, flip: Math.random() < 0.5 ? -1 : 1 };
  }
  function bell() {
    var s = 1.35 + Math.random() * 0.6;
    return { x: 70 + Math.random() * (W - 140), y: -80, vx: (Math.random() - 0.5) * 2, vy: 2, a: Math.random() * 6, va: (Math.random() - 0.5) * 0.2, w: 92 * s, h: 34 * s, rest: false };
  }

  // a hex dumbbell: chrome knurled handle + two rubber hex heads with a rim highlight
  function drawBell(b) {
    cx.save(); cx.translate(b.x, b.y); cx.rotate(b.a);
    var w = b.w, h = b.h, hw = w * 0.2;
    var g = cx.createLinearGradient(0, -h * 0.12, 0, h * 0.12);
    g.addColorStop(0, "#f2f4f7"); g.addColorStop(0.45, "#9aa1aa"); g.addColorStop(1, "#4b5058");
    cx.fillStyle = g; cx.fillRect(-w * 0.32, -h * 0.11, w * 0.64, h * 0.22);
    cx.fillStyle = "rgba(0,0,0,.25)"; for (var k = -w * 0.18; k < w * 0.18; k += 4) cx.fillRect(k, -h * 0.11, 1.5, h * 0.22);
    [-1, 1].forEach(function (sd) {
      var x0 = sd > 0 ? w * 0.3 : -w * 0.3 - hw;
      var pg = cx.createLinearGradient(0, -h / 2, 0, h / 2);
      pg.addColorStop(0, "#4a4e55"); pg.addColorStop(0.5, "#1b1d21"); pg.addColorStop(1, "#0b0c0e");
      cx.fillStyle = pg; hex(x0, -h / 2, hw, h);
      cx.strokeStyle = "rgba(255,255,255,.35)"; cx.lineWidth = 1.5; cx.stroke();
      cx.fillStyle = accent; cx.fillRect(sd > 0 ? x0 - 4 : x0 + hw, -h * 0.2, 4, h * 0.4);
    });
    cx.restore();
  }
  function hex(x, y, w, h) { var c = h * 0.25; cx.beginPath(); cx.moveTo(x, y + c); cx.lineTo(x + w * 0.15, y); cx.lineTo(x + w * 0.85, y); cx.lineTo(x + w, y + c); cx.lineTo(x + w, y + h - c); cx.lineTo(x + w * 0.85, y + h); cx.lineTo(x + w * 0.15, y + h); cx.lineTo(x, y + h - c); cx.closePath(); cx.fill(); }
  function rr(x, y, w, h, r) { cx.beginPath(); cx.moveTo(x + r, y); cx.arcTo(x + w, y, x + w, y + h, r); cx.arcTo(x + w, y + h, x, y + h, r); cx.arcTo(x, y + h, x, y, r); cx.arcTo(x, y, x + w, y, r); cx.closePath(); cx.fill(); }

  function frame(t) {
    var dt = Math.min(2, (t - (t0 || t)) / 16.7); t0 = t;
    cx.clearRect(0, 0, W, H);
    // sweat trails fade slowly, like streaks on glass
    for (var i = trail.length - 1; i >= 0; i--) {
      var p = trail[i]; p.l -= 0.004 * dt;
      if (p.l <= 0) { trail.splice(i, 1); continue; }
      cx.fillStyle = "rgba(225,235,245," + (0.06 * p.l) + ")"; cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 7); cx.fill();
    }
    if (!leaving) spots.forEach(function (c) {
      var g = cx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.s * 1.6);
      g.addColorStop(0, "rgba(255,255,255,.035)"); g.addColorStop(1, "rgba(255,255,255,0)");
      cx.fillStyle = g; cx.fillRect(c.x - c.s * 1.6, c.y - c.s * 1.6, c.s * 3.2, c.s * 3.2);
    });
    for (var n = drops.length - 1; n >= 0; n--) {
      var d = drops[n];
      if (leaving) { d.r *= Math.pow(0.86, dt); if (d.r < 0.3) { drops.splice(n, 1); continue; } }
      else if (d.wait > 0) { d.wait -= dt; continue; }
      else if (d.r < d.max) d.r = Math.min(d.max, d.r + (0.03 + (d.max - d.r) * 0.012) * dt); // swell out of the pore
      else if (d.max > 8 && !d.run && Math.random() < 0.0012 * dt) { d.run = 8 + Math.random() * 20; d.vy = 0.25 + Math.random() * 0.3; drops.push(drop(60 + Math.random() * 120)); }
      if (d.run > 0 && !leaving) { // heavy bead creeps a short way, then sticks
        d.wob += 0.08 * dt; d.y += d.vy * dt; d.x += Math.sin(d.wob) * 0.05; d.run -= d.vy * dt;
        if (Math.random() < 0.35) trail.push({ x: d.x, y: d.y - d.r * 0.6, r: d.r * 0.35, l: 1 });
        if (d.run <= 0) { d.run = -1; d.max *= 0.8; }
      }
      if (d.r > 0.2) bead(d);
    }
    if (!leaving && bells.length < MAX_BELLS && t > nextBell) { bells.push(bell()); nextBell = t + 900 + Math.random() * 900; }
    bells.forEach(function (b, i) {
      b.vy += 0.45 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.va * dt;
      var bar = document.querySelector(".tbar"), base = bar && bar.offsetParent ? bar.getBoundingClientRect().top : H;
      var floor = base - b.h / 2 - 2;
      bells.forEach(function (o, j) { // rough stacking: land on any bell below you
        if (j === i || !o.rest || leaving) return;
        if (Math.abs(o.x - b.x) < (o.w + b.w) * 0.42 && b.y < o.y) floor = Math.min(floor, o.y - (o.h + b.h) * 0.48);
      });
      if (!leaving && b.y > floor) {
        b.y = floor;
        if (b.vy > 3) { b.vy *= -0.32; b.va *= 0.5; thud(Math.min(1, b.vy / -6)); } else { b.vy = 0; b.va = 0; b.vx *= 0.8; b.a += (Math.round(b.a / Math.PI) * Math.PI - b.a) * 0.2; b.rest = true; }
      }
      drawBell(b);
    });
    if (leaving) {
      bells = bells.filter(function (b) { return b.y < H + 120 && b.x > -120 && b.x < W + 120; });
      if (!bells.length && !drops.length) { stopNow(); return; }
    }
    raf = requestAnimationFrame(frame);
  }

  // Realistic bead sprites, pre-rendered once: irregular blob that sags at the bottom, clear body,
  // dark meniscus edge on top, bright refracted crescent at the bottom, sharp specular glint top-left.
  var S = 96, R = 34, SPR = [];
  for (var n = 0; n < 8; n++) SPR.push(sprite());
  function blob(c, rad, wob) {
    c.beginPath();
    for (var i = 0; i <= 14; i++) {
      var a = i / 14 * Math.PI * 2, rr = rad * (1 + wob[i % 14]) * (Math.sin(a) > 0 ? 1 + 0.2 * Math.sin(a) : 1); // y-down: sin>0 = bottom sag
      var px = S / 2 + Math.cos(a) * rr, py = S / 2 + Math.sin(a) * rr;
      if (!i) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.closePath();
  }
  function sprite() {
    var cv2 = document.createElement("canvas"); cv2.width = cv2.height = S; var c = cv2.getContext("2d");
    var wob = []; for (var i = 0; i < 14; i++) wob.push((Math.random() - 0.5) * 0.3);
    for (i = 1; i < 14; i++) wob[i] = (wob[i] + wob[i - 1]) / 2; // smooth the outline
    // soft contact shadow on the glass
    c.save(); c.shadowColor = "rgba(0,0,0,.55)"; c.shadowBlur = 5; c.shadowOffsetY = 3; c.fillStyle = "rgba(0,0,0,.25)"; blob(c, R, wob); c.fill(); c.restore();
    c.save(); blob(c, R, wob); c.clip();
    // clear body: nearly transparent centre, brighter lensing toward the rim
    var g = c.createRadialGradient(S / 2, S / 2 + R * 0.15, R * 0.1, S / 2, S / 2, R * 1.05);
    g.addColorStop(0, "rgba(255,255,255,.03)"); g.addColorStop(0.7, "rgba(220,232,245,.08)"); g.addColorStop(1, "rgba(235,242,250,.32)");
    c.fillStyle = g; c.fillRect(0, 0, S, S);
    // dark meniscus on the upper half (the bead refracts the dark screen)
    var d = c.createLinearGradient(0, S / 2 - R, 0, S / 2 + R * 0.2);
    d.addColorStop(0, "rgba(0,0,0,.55)"); d.addColorStop(0.35, "rgba(0,0,0,.18)"); d.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = d; c.fillRect(0, 0, S, S);
    // refracted light pooling at the bottom: soft bright crescent
    c.filter = "blur(2.5px)"; c.fillStyle = "rgba(255,255,255,.6)";
    c.beginPath(); c.ellipse(S / 2 + R * 0.05, S / 2 + R * 0.78, R * 0.62, R * 0.2, 0, 0, 7); c.fill();
    c.filter = "none"; c.restore();
    // crisp rim line
    c.strokeStyle = "rgba(255,255,255,.22)"; c.lineWidth = 1.2; blob(c, R - 0.6, wob); c.stroke();
    // specular glint + tiny secondary
    c.fillStyle = "#fff"; c.beginPath(); c.ellipse(S / 2 - R * 0.36, S / 2 - R * 0.42, R * 0.2, R * 0.11, -0.7, 0, 7); c.fill();
    c.fillStyle = "rgba(255,255,255,.7)"; c.beginPath(); c.arc(S / 2 - R * 0.08, S / 2 - R * 0.55, R * 0.05, 0, 7); c.fill();
    return cv2;
  }
  function bead(d) {
    var x = d.x, y = d.y, r = d.r;
    if (r < 1.7) { // micro mist: a glint and a dark dot
      cx.fillStyle = "rgba(0,0,0,.35)"; cx.beginPath(); cx.arc(x, y + r * 0.3, r, 0, 7); cx.fill();
      cx.fillStyle = "rgba(255,255,255," + (0.35 + r * 0.25) + ")"; cx.beginPath(); cx.arc(x - r * 0.3, y - r * 0.3, r * 0.45, 0, 7); cx.fill();
      return;
    }
    var k = r * S / (2 * R);
    cx.save(); cx.translate(x, y); cx.rotate(d.rot); cx.scale(d.flip, 1);
    cx.drawImage(SPR[d.spr], -k, -k, 2 * k, 2 * k); cx.restore();
  }

  var ac = null;
  function thud(v) { // soft rubber-floor thump, only after the user has interacted once (autoplay rules)
    try {
      if (!ac || ac.state !== "running") return;
      var o = ac.createOscillator(), g = ac.createGain(); o.type = "sine"; o.frequency.setValueAtTime(110, ac.currentTime); o.frequency.exponentialRampToValueAtTime(45, ac.currentTime + 0.18);
      g.gain.setValueAtTime(0.18 * v, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.22); o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.25);
    } catch (e) {}
  }

  function go() {
    if (on || window.AOG_BUSY || document.hidden) return;
    on = true; leaving = false; size();
    spots = []; for (var j = 0; j < 4 + Math.round(W * H / 120000); j++) spots.push({ x: Math.random() * W, y: Math.random() * H, s: 50 + Math.random() * 90 });
    drops = []; for (var i = 0; i < Math.round(W * H / 1700); i++) drops.push(drop());
    bells = []; trail = []; t0 = 0; nextBell = performance.now() + 1600;
    cv.style.opacity = "1"; document.documentElement.classList.add("sweating");
    raf = requestAnimationFrame(frame);
  }
  function wake() {
    clearTimeout(timer); timer = setTimeout(go, IDLE_MS);
    if (!on || leaving) return;
    leaving = true; document.documentElement.classList.remove("sweating");
    bells.forEach(function (b) { b.vy = -8 - Math.random() * 6; b.vx = (b.x < W / 2 ? -1 : 1) * (6 + Math.random() * 6); b.va = (Math.random() - 0.5) * 0.6; b.rest = false; });
    setTimeout(function () { cv.style.opacity = "0"; }, 350);
  }
  function stopNow() { cancelAnimationFrame(raf); on = false; leaving = false; cx.clearRect(0, 0, W, H); trail = []; }

  ["pointerdown", "pointermove", "scroll", "keydown", "touchstart", "wheel"].forEach(function (ev) {
    addEventListener(ev, function () {
      if (!ac && ev !== "pointermove" && ev !== "scroll") { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
      else if (ac && ac.state === "suspended" && ev === "pointerdown") ac.resume();
      wake();
    }, { passive: true, capture: true });
  });
  document.addEventListener("visibilitychange", function () { if (document.hidden) { wake(); } });
  addEventListener("resize", function () { if (on) size(); });
  window.AOG_SWEAT = { go: go, wake: wake };
  timer = setTimeout(go, IDLE_MS);
})();
