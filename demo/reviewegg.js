/* SousShift AI — "Antidote reviewed this spot" Easter egg, shared by every restaurant demo game.
   Antidote The Foodie (YouTube @TheRealAntidote) reviewed the restaurant; each game hides one rare pickup per run
   (a blimp banner, a billboard buoy, a kitchen TV, a golden tile…) that shows the review's cover. Finding it pays a
   bonus, pops a toast, and the end screen + the start menu's Points panel get a small "watch the review" card.
   Include BEFORE the game script that uses it:
     <script>window.REVIEW_EGG={vid:"<YouTube id>",restaurant:"Melody Bar & Grill",short:"MELODY",bonus:500,
       find:"Fly through the blimp banner",img:"img/review/cover.webp",kind:"review"|"clip"};</script>
     <script src="../reviewegg.js"></script>
   Game side: ReviewEgg.reset() at the start of a run · ReviewEgg.due(elapsedMs) → true once when it's time to spawn ·
   ReviewEgg.collect() → bonus points (once per run) · ReviewEgg.drawSign(ctx,x,y,w) draws the billboard on a canvas ·
   ReviewEgg.endCard(host, beforeEl) puts the card on the end screen. Test: add ?egg=1 to spawn it ~2.5 s into a run. */
(function () {
  "use strict";
  if (window.ReviewEgg) return;
  var C = window.REVIEW_EGG; if (!C || !C.vid) return;
  var W = window, D = document;
  var T = function (s) { return (W.__T || String)(s); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]; }); };
  var TEST = /[?&]egg=1(?:&|$)/.test(location.search);
  var URL_ = "https://www.youtube.com/watch?v=" + encodeURIComponent(C.vid);
  var BONUS = C.bonus || 500, SHORT = C.short || C.restaurant.toUpperCase(), CLIP = C.kind === "clip";
  var me = D.currentScript, base = me && me.src ? me.src.replace(/reviewegg\.js(\?.*)?$/, "") : "../";
  var LOGO_SRC = base + "review/antidote-foodie.webp";
  function img(src) { var i = new Image(); i.decoding = "async"; i.src = src; return i; }
  var cover = img(C.img || "img/review/cover.webp"), logo = img(LOGO_SRC);
  function ready(i) { return i && i.complete && i.naturalWidth > 0; }
  var S = { found: false, spawned: false, at: 0 };
  var KEY = "re-found:" + C.vid;
  function ever() { try { return localStorage.getItem(KEY) === "1"; } catch (e) { return false; } }

  /* ---------- styles: his brand (blue base, bold yellow, red play button) ---------- */
  var st = D.createElement("style");
  st.textContent =
    ".re-card{display:flex;align-items:center;gap:10px;width:100%;max-width:340px;margin:10px auto 4px;padding:8px 10px 8px 8px;box-sizing:border-box;border-radius:14px;" +
    "background:linear-gradient(135deg,#0b2a6b,#08183f);border:1px solid rgba(255,210,63,.55);box-shadow:0 6px 18px rgba(0,0,0,.28);color:#fff;text-decoration:none;text-align:left;" +
    "font:600 12.5px/1.3 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-tap-highlight-color:transparent}" +
    ".re-card *{box-sizing:border-box}.re-card:active{transform:scale(.98)}" +
    ".re-th{position:relative;flex:none;width:92px;aspect-ratio:16/9;border-radius:9px;overflow:hidden;background:#000;box-shadow:0 0 0 2px #ffd23f}" +
    ".re-th img{display:block;width:100%;height:100%;object-fit:cover}" +
    ".re-th i{position:absolute;left:50%;top:50%;width:26px;height:18px;margin:-9px 0 0 -13px;border-radius:5px;background:#e3262f;box-shadow:0 2px 6px rgba(0,0,0,.45)}" +
    ".re-th i::after{content:'';position:absolute;left:10px;top:4.5px;border-left:8px solid #fff;border-top:4.5px solid transparent;border-bottom:4.5px solid transparent}" +
    ".re-tx{flex:1;min-width:0}.re-tx b{display:block;color:#ffd23f;font-weight:900;font-size:13px;line-height:1.2}.re-tx small{display:block;margin-top:2px;color:#dbe4ff;font-size:12px}" +
    ".re-tx em{display:block;font-style:normal;font-weight:900;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#7dffb5;margin-bottom:2px}" +
    ".re-logo{flex:none;width:30px;height:auto;filter:drop-shadow(0 2px 4px rgba(0,0,0,.4))}" +
    ".re-toast{position:fixed;left:50%;top:calc(12px + env(safe-area-inset-top));z-index:2147483004;display:flex;align-items:center;gap:9px;max-width:min(360px,calc(100vw - 32px));" +
    "padding:7px 12px 7px 7px;border-radius:14px;background:rgba(8,24,63,.94);border:1px solid #ffd23f;color:#fff;box-shadow:0 10px 30px rgba(0,0,0,.4);pointer-events:none;" +
    "font:800 13.5px/1.25 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;opacity:0;transform:translate(-50%,-140%);transition:opacity .3s,transform .35s cubic-bezier(.34,1.4,.64,1)}" +
    ".re-toast.on{opacity:1;transform:translate(-50%,0)}.re-toast img{flex:none;width:64px;aspect-ratio:16/9;object-fit:cover;border-radius:7px;box-shadow:0 0 0 2px #ffd23f}" +
    ".re-toast b{color:#ffd23f}.re-toast small{display:block;font-weight:600;color:#dbe4ff;font-size:12px}" +
    ".gm-r.re-row .gm-ic img{max-width:46px;border-radius:6px}" +
    "@media (prefers-reduced-motion:reduce){.re-toast{transition:opacity .2s}}";
  D.head.appendChild(st);

  /* ---------- toast (never blocks: pointer-events none, auto-hides) ---------- */
  var toastEl, tt = 0;
  function toast(title, sub) {
    if (!toastEl) { toastEl = D.createElement("div"); toastEl.className = "re-toast"; toastEl.setAttribute("role", "status"); toastEl.setAttribute("aria-live", "polite"); D.body.appendChild(toastEl); }
    toastEl.innerHTML = '<img src="' + esc(cover.src) + '" alt=""><span><b>' + esc(title) + "</b>" + (sub ? "<small>" + esc(sub) + "</small>" : "") + "</span>";
    void toastEl.offsetWidth; toastEl.classList.add("on");
    clearTimeout(tt); tt = setTimeout(function () { toastEl.classList.remove("on"); }, 3200);
  }

  /* ---------- the card (end screen + Points panel) ---------- */
  function cardHTML(found) {
    var head = CLIP ? "Antidote The Foodie pulled up to " + C.restaurant : "Antidote The Foodie reviewed " + C.restaurant;
    var sub = CLIP ? "Watch the clip on YouTube ↗" : "Watch the review on YouTube ↗";
    return '<a class="re-card" href="' + URL_ + '" target="_blank" rel="noopener" aria-label="' + esc(head + ". " + sub) + '">' +
      '<span class="re-th"><img src="' + esc(cover.src) + '" alt="" loading="lazy"><i></i></span>' +
      '<span class="re-tx">' + (found ? "<em>📺 " + esc(T("You found it")) + " · +" + BONUS + "</em>" : "") + "<b>" + esc(T(head)) + "</b><small>" + esc(T(sub)) + "</small></span>" +
      '<img class="re-logo" src="' + esc(LOGO_SRC) + '" alt="Antidote The Foodie"></a>';
  }
  function endCard(host, before) {
    if (!host) return null;
    var old = host.querySelector(".re-card"); if (old) old.remove();
    var w = D.createElement("div"); w.innerHTML = cardHTML(S.found); var a = w.firstChild;
    // taps on the card must open the video, not restart the game underneath
    ["pointerdown", "touchstart", "mousedown", "click"].forEach(function (ev) { a.addEventListener(ev, function (e) { e.stopPropagation(); }, { passive: true }); });
    if (before && before.parentNode === host) host.insertBefore(a, before); else host.appendChild(a);
    return a;
  }
  // the start menu's 🏆 Points panel (gamemenu.js calls this with its own row renderer)
  function menuHTML(row) {
    var it = { img: cover.src, name: "📺 Antidote's " + (CLIP ? "clip" : "review") + " — find it for +" + BONUS, note: (C.find || "Hidden somewhere in every run") + (ever() ? " · you've found it before" : ""), pts: "+" + BONUS, gold: true };
    var r = row ? row(it).replace('class="gm-r"', 'class="gm-r re-row"') : "";
    return '<p class="gm-g">' + esc(T("Secret")) + "</p>" + r + cardHTML(false);
  }

  /* ---------- canvas billboard: the cover in a gold frame with a label strip ---------- */
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  // centered on (x,y); w = frame width. opts: {label:false, glow:0..1, alpha}
  function drawSign(c, x, y, w, o) {
    o = o || {};
    var ih = w * 9 / 16, lh = o.label === false ? 0 : Math.max(11, w * 0.15), pad = Math.max(2, w * 0.035), fw = w + pad * 2, fh = ih + lh + pad * 2, x0 = x - fw / 2, y0 = y - fh / 2;
    c.save(); if (o.alpha != null) c.globalAlpha = o.alpha;
    if (o.glow) { var g = c.createRadialGradient(x, y, 4, x, y, fw * 0.85); g.addColorStop(0, "rgba(255,210,63," + (0.55 * o.glow) + ")"); g.addColorStop(1, "rgba(255,210,63,0)"); c.fillStyle = g; c.beginPath(); c.arc(x, y, fw * 0.85, 0, 6.283); c.fill(); }
    c.fillStyle = "rgba(0,0,0,.35)"; rr(c, x0 + 3, y0 + 4, fw, fh, 6); c.fill();
    var fg = c.createLinearGradient(x0, y0, x0, y0 + fh); fg.addColorStop(0, "#ffe27a"); fg.addColorStop(.5, "#d9a21b"); fg.addColorStop(1, "#ffd23f");
    c.fillStyle = fg; rr(c, x0, y0, fw, fh, 6); c.fill();
    c.fillStyle = "#08183f"; c.fillRect(x0 + pad, y0 + pad, w, ih + lh);
    if (ready(cover)) c.drawImage(cover, x0 + pad, y0 + pad, w, ih); else { c.fillStyle = "#0b2a6b"; c.fillRect(x0 + pad, y0 + pad, w, ih); }
    // red play button
    var bw = w * 0.2, bh = bw * 0.7, bx = x - bw / 2, by = y0 + pad + ih / 2 - bh / 2;
    c.fillStyle = "rgba(227,38,47,.92)"; rr(c, bx, by, bw, bh, bh * 0.25); c.fill();
    c.fillStyle = "#fff"; c.beginPath(); c.moveTo(x - bw * 0.14, by + bh * 0.24); c.lineTo(x + bw * 0.2, by + bh / 2); c.lineTo(x - bw * 0.14, by + bh * 0.76); c.closePath(); c.fill();
    if (lh) {
      var ly = y0 + pad + ih; c.fillStyle = "#0b2a6b"; c.fillRect(x0 + pad, ly, w, lh);
      var txt = (CLIP ? "ANTIDOTE ATE AT " : "ANTIDOTE REVIEWED ") + SHORT, fs = lh * 0.62;
      c.font = "900 " + fs.toFixed(1) + "px Impact,'Arial Narrow',system-ui,sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
      var tw = c.measureText(txt).width, sc = Math.min(1, (w - lh * 1.2) / tw);
      c.save(); c.translate(x + lh * 0.3, ly + lh / 2 + 0.5); c.scale(sc, 1); c.fillStyle = "#ffd23f"; c.fillText(txt, 0, 0); c.restore();
      if (ready(logo)) { var lw = lh * 0.95 * logo.naturalWidth / logo.naturalHeight; c.drawImage(logo, x0 + pad + 2, ly + lh * 0.03, lw, lh * 0.95); }
    }
    c.restore();
    return { w: fw, h: fh };
  }

  /* ---------- per-run timing ---------- */
  // min/max seconds (defaults 20–40 s; ?egg=1 → ~2.5 s)
  function reset(minS, maxS) { S.found = false; S.spawned = false; var a = minS == null ? 20 : minS, b = maxS == null ? 40 : maxS; S.at = TEST ? 2500 : (a + Math.random() * (b - a)) * 1000; }
  function due(elapsedMs) { if (S.spawned || S.found || !S.at) return false; if (elapsedMs >= S.at) { S.spawned = true; return true; } return false; }
  function missed() { S.spawned = true; }   // it scrolled away: no second chance this run
  function collect() {
    if (S.found) return 0; S.found = true;
    try { localStorage.setItem(KEY, "1"); } catch (e) {}
    try { navigator.vibrate && navigator.vibrate([20, 40, 20, 40, 60]); } catch (e) {}
    toast("📺 " + T(CLIP ? "Antidote's clip!" : "Antidote's review!") + " +" + BONUS, T("Watch it after your run"));
    return BONUS;
  }

  W.ReviewEgg = { cfg: C, url: URL_, bonus: BONUS, test: TEST, cover: cover, logo: logo, ready: ready,
    reset: reset, due: due, missed: missed, collect: collect, toast: toast, drawSign: drawSign, cardHTML: cardHTML, endCard: endCard, menuHTML: menuHTML,
    get found() { return S.found; }, get spawned() { return S.spawned; } };
})();
