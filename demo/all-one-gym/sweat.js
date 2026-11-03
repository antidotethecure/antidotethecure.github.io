/* Idle "sweat + dumbbell drop" (same idea as the cheese pour on antidotethefoodie.com).
   8 s with no touch -> sweat beads run down the glass, then dumbbells drop in, bounce and stack.
   Any touch/scroll/key flicks the dumbbells off screen and dries the sweat.
   Skipped while a workout timer is running (window.AOG_BUSY) and for prefers-reduced-motion. */
(function () {
  "use strict";
  var IDLE_MS = 8000, MAX_BELLS = 9;
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

  function drop() {
    return { x: Math.random() * W, y: -10 - Math.random() * H * 0.5, r: 4 + Math.random() * 6, vy: 0, stick: 0.4 + Math.random() * 1.2, wob: Math.random() * 6 };
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
      cx.fillStyle = "rgba(200,225,255," + (0.16 * p.l) + ")"; cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 7); cx.fill();
    }
    drops.forEach(function (d) {
      d.wob += 0.05 * dt;
      if (d.stick > 0) d.stick -= 0.016 * dt; else d.vy = Math.min(d.vy + 0.05 * dt, 2.6 + d.r * 0.25);
      d.y += d.vy * dt; d.x += Math.sin(d.wob) * 0.25;
      if (d.vy > 0.3 && Math.random() < 0.5) trail.push({ x: d.x, y: d.y - d.r, r: d.r * 0.45, l: 1 });
      if (d.y > H + 20 && !leaving) Object.assign(d, drop(), { y: -10 });
      var g = cx.createRadialGradient(d.x - d.r * 0.35, d.y - d.r * 0.4, d.r * 0.1, d.x, d.y, d.r * 1.3);
      g.addColorStop(0, "rgba(255,255,255,.95)"); g.addColorStop(0.35, "rgba(190,220,255,.55)"); g.addColorStop(1, "rgba(120,170,230,.12)");
      cx.fillStyle = g; cx.beginPath(); cx.ellipse(d.x, d.y, d.r * 0.85, d.r * 1.15, 0, 0, 7); cx.fill();
    });
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
      drops = drops.filter(function (d) { return d.y < H + 20; });
      if (!bells.length && !drops.length) { stopNow(); return; }
    }
    raf = requestAnimationFrame(frame);
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
    drops = []; for (var i = 0; i < Math.round(W / 22); i++) drops.push(drop());
    bells = []; trail = []; t0 = 0; nextBell = performance.now() + 1600;
    cv.style.opacity = "1"; document.documentElement.classList.add("sweating");
    raf = requestAnimationFrame(frame);
  }
  function wake() {
    clearTimeout(timer); timer = setTimeout(go, IDLE_MS);
    if (!on || leaving) return;
    leaving = true; document.documentElement.classList.remove("sweating");
    bells.forEach(function (b) { b.vy = -8 - Math.random() * 6; b.vx = (b.x < W / 2 ? -1 : 1) * (6 + Math.random() * 6); b.va = (Math.random() - 0.5) * 0.6; b.rest = false; });
    drops.forEach(function (d) { d.stick = 0; d.vy = 9; });
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
