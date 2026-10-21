/* Melody customer app layout (2026-10-13): sticky section tabs with the Melody plane transition, the "Today's games"
   sports carousel (matchup cards, Where to watch, team stats sheet, game detail sheet), all in Melody's own theme
   (CSS vars from index.html: --sky, --panel, --edge, --gold, --gold2, --wine, --ink, --dim, --display, --body, --punch).
   Data: ../sports/sports.js (window.SportsBar.api + the "sportsbar:update" event) and ESPN's public, CORS-open
   site.api.espn.com endpoints (summary, team, team schedule) plus site.web.api.espn.com teamleaders. Nothing is invented:
   a block only shows when ESPN sent the data. Watch links go only to each network's OFFICIAL site/app (WATCH map below).
   Reduced motion: no plane, instant jumps, no smooth scrolling. */
(function () {
  "use strict";
  var REDUCE = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };

  /* ---------------- styles (Melody theme only) ---------------- */
  var css = document.createElement("style");
  css.textContent =
    "#mtabs{position:sticky;top:0;z-index:25;margin:10px -16px 0;padding:8px 16px;padding-top:max(8px,env(safe-area-inset-top));background:color-mix(in srgb,var(--sky) 86%,transparent);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border-bottom:1px solid var(--edge)}#mtabs .mt-row{margin-right:84px}" +
    ".mt-row{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch}.mt-row::-webkit-scrollbar{display:none}" +
    ".mt-row a{flex:none;padding:8px 13px;border-radius:999px;border:1px solid var(--edge);background:var(--panel);color:var(--ink);font:800 14px/1 var(--body);text-decoration:none;white-space:nowrap;transition:background .2s,color .2s,border-color .2s}" +
    ".mt-row a.on{background:linear-gradient(180deg,var(--gold2),var(--gold));color:#1a1405;border-color:var(--gold)}" +
    ".msec{scroll-margin-top:62px}.msec>h2:first-child{margin-top:28px}" +
    /* plane transition */
    "#mplane{position:fixed;left:0;top:0;z-index:60;pointer-events:none;will-change:transform}#mplane img{display:block;width:132px;height:auto;filter:drop-shadow(0 8px 10px #0007)}" +
    ".mp-dot{position:fixed;left:-5px;top:-5px;z-index:59;width:10px;height:10px;border-radius:50%;pointer-events:none;background:radial-gradient(circle,#fff8e6 0,var(--gold2) 45%,transparent 72%);animation:mpfade .65s ease-out forwards}" +
    "@keyframes mpfade{from{opacity:.95;transform:var(--t) scale(1)}to{opacity:0;transform:var(--t) scale(2.8)}}" +
    /* carousel */
    "#spcar{margin-top:6px}.scx-bar{display:flex;gap:6px;align-items:center;margin:0 0 10px;flex-wrap:wrap}" +
    ".scx-chip{border:1px solid var(--edge);background:var(--panel);color:var(--ink);border-radius:999px;padding:7px 12px;font:800 13px var(--body);cursor:pointer}" +
    ".scx-chip.gold{border-color:var(--gold);color:var(--gold2)}.scx-sum{margin-left:auto;color:var(--dim);font:700 12.5px var(--body)}" +
    ".scx-track{display:flex;gap:10px;overflow-x:auto;scroll-snap-type:x mandatory;overscroll-behavior-x:contain;scrollbar-width:none;-webkit-overflow-scrolling:touch;padding:2px 2px 4px;margin:0 -2px}.scx-track::-webkit-scrollbar{display:none}" +
    ".sc-card{flex:0 0 86%;max-width:380px;scroll-snap-align:center;background:linear-gradient(160deg,#1b2440,var(--panel) 60%);border:1px solid var(--edge);border-radius:18px;padding:12px;box-shadow:0 10px 28px #0006;position:relative;cursor:pointer}" +
    ".sc-card.live{border-color:var(--wine2);box-shadow:0 0 0 1px #a3364555,0 10px 28px #0006}.sc-card.fol{border-color:var(--gold)}" +
    ".sc-top{display:flex;justify-content:space-between;gap:8px;font:800 12px var(--body);letter-spacing:.08em;text-transform:uppercase;color:var(--dim)}.sc-top .lv{color:#ff6b6b;display:flex;align-items:center;gap:6px}" +
    ".sc-dot{width:8px;height:8px;border-radius:50%;background:#ff4d4d;box-shadow:0 0 0 0 #ff4d4d88;animation:scpulse 1.4s infinite}@keyframes scpulse{70%{box-shadow:0 0 0 8px #ff4d4d00}100%{box-shadow:0 0 0 0 #ff4d4d00}}" +
    ".sc-mu{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:6px;margin:10px 0 6px}" +
    ".sc-tm{all:unset;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;min-width:0;text-align:center;border-radius:12px;padding:4px}.sc-tm:focus-visible{outline:2px solid var(--gold2)}" +
    ".sc-tm img{width:58px;height:58px;object-fit:contain;filter:drop-shadow(0 4px 8px #0008);transition:transform .2s}.sc-tm:active img{transform:scale(.92)}" +
    ".sc-tm b{font:400 18px/1 var(--punch);letter-spacing:.04em;color:var(--ink)}.sc-tm small{font:700 11.5px var(--body);color:var(--dim)}.sc-tm .tap{font:700 10.5px var(--body);color:var(--gold)}" +
    ".sc-mid{text-align:center;min-width:92px}.sc-sc{font:400 34px/1 var(--punch);color:var(--gold2);letter-spacing:.03em;white-space:nowrap}.sc-sc i{font-style:normal;color:var(--dim);margin:0 6px}" +
    ".sc-sc .w{color:var(--ink)}.sc-vs{font:900 italic 20px var(--display);color:var(--cream)}.sc-st{font:800 12.5px var(--body);color:var(--ink);margin-top:4px}.sc-st.lvst{color:#ff8a8a}" +
    ".sc-sub{font:600 12.5px var(--body);color:var(--dim);text-align:center;min-height:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
    ".sc-act{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}" +
    ".sc-btn{border:1px solid var(--edge);background:#0b1220;color:var(--ink);border-radius:12px;padding:10px 8px;font:800 13.5px var(--body);cursor:pointer}.sc-btn.hot{background:linear-gradient(180deg,var(--gold2),var(--gold));color:#1a1405;border-color:var(--gold)}" +
    ".sc-race b{display:block;font:900 18px var(--display);color:var(--cream)}.sc-race .hd{display:flex;gap:10px;align-items:center}.sc-race img{width:48px;height:48px;object-fit:contain}.sc-race ul{margin:8px 0 0;padding-left:18px;font:600 13.5px/1.45 var(--body);color:var(--ink)}" +
    ".sc-bdg{display:inline-block;margin:6px 6px 0 0;padding:2px 9px;border-radius:999px;font:800 11px var(--body);letter-spacing:.06em;text-transform:uppercase;background:#3fbf8f22;color:var(--go);border:1px solid #3fbf8f66}.sc-bdg.out{background:#a3364522;color:var(--pink);border-color:#a3364566}" +
    ".scx-dots{display:flex;justify-content:center;gap:6px;margin-top:10px}.scx-dots button{all:unset;cursor:pointer;width:7px;height:7px;border-radius:99px;background:var(--edge);transition:width .25s,background .25s}.scx-dots button.on{width:20px;background:var(--gold)}" +
    ".scx-empty{background:var(--panel);border:1px dashed var(--edge);border-radius:16px;padding:14px;color:var(--dim);font:600 14px var(--body);text-align:center}.scx-empty b{display:block;color:var(--ink);font:900 18px var(--display);margin-bottom:4px}" +
    ".scx-lbl{font:800 12px var(--body);letter-spacing:.18em;text-transform:uppercase;color:var(--gold);margin:12px 0 8px}" +
    /* sheet */
    "#msh{position:fixed;inset:0;z-index:80;display:flex;align-items:flex-end;justify-content:center;background:#0009;opacity:0;pointer-events:none;transition:opacity .22s}#msh.on{opacity:1;pointer-events:auto}" +
    "#msh .pn{width:100%;max-width:560px;max-height:88vh;display:flex;flex-direction:column;background:var(--sky2);border:1px solid var(--edge);border-bottom:0;border-radius:22px 22px 0 0;box-shadow:0 -20px 60px #000b;transform:translateY(100%);transition:transform .28s cubic-bezier(.2,.8,.2,1)}#msh.on .pn{transform:none}" +
    "#msh .hd{display:flex;align-items:center;gap:8px;padding:10px 12px 8px;border-bottom:1px solid var(--edge);touch-action:none}#msh .grab{position:absolute;left:50%;top:6px;width:42px;height:5px;margin-left:-21px;border-radius:9px;background:var(--edge)}" +
    "#msh .hd b{flex:1;min-width:0;font:900 19px var(--display);color:var(--cream);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center}" +
    "#msh .hd button{border:1px solid var(--edge);background:var(--panel);color:var(--ink);border-radius:999px;min-width:40px;height:36px;padding:0 12px;font:800 14px var(--body);cursor:pointer}#msh .hd button[hidden]{visibility:hidden;display:block}" +
    "#msh .bd{overflow-y:auto;overscroll-behavior:contain;padding:12px 14px calc(18px + env(safe-area-inset-bottom));font:500 14.5px/1.45 var(--body);color:var(--ink)}" +
    ".ms-sec{font:800 12px var(--body);letter-spacing:.16em;text-transform:uppercase;color:var(--gold);margin:16px 0 6px}.ms-card{background:var(--panel);border:1px solid var(--edge);border-radius:14px;padding:12px}" +
    ".ms-row{display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid #27324d88}.ms-row:last-child{border-bottom:0}.ms-row span{color:var(--dim)}.ms-row b{text-align:right}" +
    ".ms-tbl{width:100%;border-collapse:collapse;font:700 14px var(--body)}.ms-tbl th,.ms-tbl td{padding:6px 4px;text-align:center;border-bottom:1px solid #27324d88}.ms-tbl th{color:var(--dim);font-size:12px}.ms-tbl td:first-child,.ms-tbl th:first-child{text-align:left}.ms-tbl td.t{font:400 17px var(--punch);color:var(--gold2)}" +
    ".ms-wrap{overflow-x:auto;max-width:100%}.ms-l5{display:flex;gap:6px;flex-wrap:wrap}.ms-l5 i{font-style:normal;min-width:30px;padding:5px 8px;border-radius:9px;text-align:center;font:900 13px var(--body);background:#0b1220;border:1px solid var(--edge)}.ms-l5 i.W{color:var(--go);border-color:#3fbf8f66}.ms-l5 i.L{color:var(--pink);border-color:#a3364566}" +
    ".ms-w{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #27324d88}.ms-w:last-child{border-bottom:0}.ms-w b{flex:1}.ms-w a{flex:none;text-decoration:none;border-radius:10px;padding:8px 11px;font:800 13px var(--body);background:linear-gradient(180deg,var(--gold2),var(--gold));color:#1a1405}" +
    ".ms-sub{display:inline-block;margin-left:6px;padding:1px 7px;border-radius:99px;font:800 10.5px var(--body);letter-spacing:.06em;text-transform:uppercase;color:var(--gold2);border:1px solid #d4af3766}" +
    ".ms-mel{margin-top:12px;padding:12px;border-radius:14px;background:linear-gradient(120deg,#3a1520,#141e34);border:1px solid var(--wine);font:700 14px var(--body)}" +
    ".ms-hero{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center;text-align:center}.ms-hero img{width:64px;height:64px;object-fit:contain}.ms-hero b{display:block;font:400 18px var(--punch);letter-spacing:.04em}" +
    ".ms-pk{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.ms-pk button{flex:1;min-width:110px;border:1px solid var(--edge);background:#0b1220;color:var(--ink);border-radius:12px;padding:11px;font:800 14px var(--body);cursor:pointer}.ms-pk button[aria-pressed=true]{background:linear-gradient(180deg,var(--gold2),var(--gold));color:#1a1405;border-color:var(--gold)}" +
    ".ms-play{padding:7px 0;border-bottom:1px solid #27324d88;font-size:13.5px}.ms-play small{color:var(--dim);font-weight:800;margin-right:6px}.ms-fine{color:var(--dim);font-size:12px;margin-top:12px}.ms-load{color:var(--dim);text-align:center;padding:24px 0}" +
    "@media (prefers-reduced-motion:reduce){#msh,#msh .pn,.mt-row a,.scx-dots button{transition:none}.sc-dot{animation:none}}";
  document.head.appendChild(css);

  /* ---------------- sticky tabs + plane transition ---------------- */
  var nav = $("#mtabs"), row = nav && $(".mt-row", nav), tabs = nav ? $$("a[data-tab]", nav) : [];
  var lock = 0, cur = "";
  function navH() { return nav ? nav.getBoundingClientRect().height : 0; }
  function setActive(k, smooth) {
    if (!row || k === cur) return; cur = k;
    tabs.forEach(function (a) { var on = a.getAttribute("data-tab") === k; a.classList.toggle("on", on); if (on) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current"); });
    var a = tabs.filter(function (x) { return x.getAttribute("data-tab") === k; })[0];
    if (a) { var left = a.offsetLeft - (row.clientWidth - a.offsetWidth) / 2; try { row.scrollTo({ left: Math.max(0, left), behavior: smooth && !REDUCE ? "smooth" : "auto" }); } catch (e) { row.scrollLeft = left; } }
  }
  var PLANE = new Image(); PLANE.src = "img/game/flyover.webp";   // Melody's own flyover jet (art faces left)
  var planeBusy = 0;
  function planeFly() {
    if (REDUCE || planeBusy || !PLANE.complete || !PLANE.naturalWidth) return;
    planeBusy = 1;
    var box = document.createElement("div"); box.id = "mplane"; box.setAttribute("aria-hidden", "true");
    var im = PLANE.cloneNode(); box.appendChild(im); document.body.appendChild(box);
    var vw = innerWidth, w = 132, h = w * 320 / 900, y0 = navH() + 40 + Math.random() * 30, dur = 720, t0 = performance.now(), last = null;
    function puff(px, py) { var d = document.createElement("i"); d.className = "mp-dot"; var t = "translate(" + px.toFixed(1) + "px," + py.toFixed(1) + "px)";
      d.style.setProperty("--t", t); d.style.transform = t; document.body.appendChild(d); setTimeout(function () { d.remove(); }, 700); }
    window.__mplaneActive = true;
    (function step(now) {
      var p = Math.min(1, (now - t0) / dur), e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      var x = -w - 10 + (vw + w + 30) * e, y = y0 - 26 * Math.sin(Math.PI * p), rot = -6 * Math.cos(Math.PI * p);
      box.style.transform = "translate(" + x + "px," + y + "px) rotate(" + rot + "deg)";
      im.style.transform = "scaleX(-1)";   // fly left → right
      // contrail: soft puffs every ~8px along the tail's path since the last frame
      var tx = x + w * 0.04, ty = y + h * 0.42;
      if (last) { var dx = tx - last[0], dy = ty - last[1], n = Math.min(12, Math.max(1, Math.round(Math.hypot(dx, dy) / 8)));
        for (var k = 1; k <= n; k++) puff(last[0] + dx * k / n, last[1] + dy * k / n); }
      last = [tx, ty];
      if (p < 1) requestAnimationFrame(step); else { box.remove(); planeBusy = 0; window.__mplaneActive = false; }
    })(t0);
  }
  function goTo(k) {
    var target = k === "trivia" ? $("#sec-trivia") : $('.msec[data-tab="' + k + '"]');
    if (!target) return;
    var top = target.getBoundingClientRect().top + scrollY - navH() - 6;
    setActive(k, true); lock = Date.now() + (REDUCE ? 200 : 1100);
    planeFly();
    try { window.scrollTo({ top: top, behavior: REDUCE ? "auto" : "smooth" }); } catch (e) { window.scrollTo(0, top); }
  }
  tabs.forEach(function (a) { a.addEventListener("click", function (ev) { ev.preventDefault(); goTo(a.getAttribute("data-tab")); }); });
  window.MelodyNav = { go: goTo };
  // active tab follows the scroll: the topmost section crossing the band just under the tab bar wins
  var secs = $$(".msec[data-tab]"), vis = {};
  if (secs.length && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { vis[en.target.getAttribute("data-tab")] = en.isIntersecting; });
      if (Date.now() < lock) return;
      var k = secs.map(function (s) { return s.getAttribute("data-tab"); }).filter(function (t) { return vis[t]; })[0];
      if (k) setActive(k, true);
    }, { rootMargin: "-" + Math.round(navH() + 8) + "px 0px -58% 0px", threshold: 0 });
    secs.forEach(function (s) { io.observe(s); });
  }
  if (tabs[0]) setActive("sports", false);

  /* ---------------- bottom sheet with a back stack ---------------- */
  var sh = null, stack = [], prevOv = "";
  function sheetEl() {
    if (sh) return sh;
    sh = document.createElement("div"); sh.id = "msh"; sh.setAttribute("role", "dialog"); sh.setAttribute("aria-modal", "true");
    sh.innerHTML = '<div class="pn"><div class="hd" style="position:relative"><i class="grab"></i><button type="button" data-back aria-label="Back">‹ Back</button><b></b><button type="button" data-x aria-label="Close">✕</button></div><div class="bd"></div></div>';
    document.body.appendChild(sh);
    sh.addEventListener("click", function (e) { if (e.target === sh) closeSheet(); });
    $("[data-x]", sh).onclick = closeSheet;
    $("[data-back]", sh).onclick = back;
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && sh.classList.contains("on")) closeSheet(); });
    // swipe the header down to close
    var hd = $(".hd", sh), pn = $(".pn", sh), y0 = null, dy = 0;
    hd.addEventListener("touchstart", function (e) { y0 = e.touches[0].clientY; dy = 0; pn.style.transition = "none"; }, { passive: true });
    hd.addEventListener("touchmove", function (e) { if (y0 == null) return; dy = Math.max(0, e.touches[0].clientY - y0); pn.style.transform = "translateY(" + dy + "px)"; }, { passive: true });
    hd.addEventListener("touchend", function () { pn.style.transition = ""; pn.style.transform = ""; if (dy > 90) closeSheet(); y0 = null; });
    return sh;
  }
  function paint() {
    var top = stack[stack.length - 1]; if (!top) return;
    $(".hd b", sh).textContent = top.title; $("[data-back]", sh).hidden = stack.length < 2;
    var bd = $(".bd", sh); bd.innerHTML = top.html || '<div class="ms-load">Loading…</div>'; bd.scrollTop = 0; if (top.bind) top.bind(bd);
  }
  function openSheet(title, build) {
    sheetEl(); var ent = { title: title, html: "", bind: null };
    stack.push(ent);
    if (!sh.classList.contains("on")) { prevOv = document.documentElement.style.overflow; document.documentElement.style.overflow = "hidden"; requestAnimationFrame(function () { sh.classList.add("on"); }); }
    paint();
    build(function (html, bind) { ent.html = html; ent.bind = bind; if (stack[stack.length - 1] === ent) paint(); });
  }
  function back() { if (stack.length > 1) { stack.pop(); paint(); } else closeSheet(); }
  function closeSheet() { if (!sh) return; sh.classList.remove("on"); stack = []; document.documentElement.style.overflow = prevOv; }

  /* ---------------- where to watch: official sites/apps only ---------------- */
  // [regex on the ESPN broadcast name, label, official URL, subscription?]  First match wins; unknown names show without a link.
  var WATCH = [
    [/^espn\+$/i, "ESPN+", "https://plus.espn.com/", 1],
    [/^(espn|espn2|espnu|espnews|abc|sec network|secn|acc network|accn)$/i, null, "https://www.espn.com/watch/", 0],
    [/^(fox|fs1|fs2|big ten network|btn|fox deportes)$/i, null, "https://www.foxsports.com/live", 0],
    [/^(cbs|cbssn|cbs sports network)$/i, null, "https://www.cbssports.com/watch/", 0],
    [/paramount/i, "Paramount+", "https://www.paramountplus.com/", 1],
    [/peacock/i, "Peacock", "https://www.peacocktv.com/", 1],
    [/^(nbc|nbcsn|usa net|usa network)$/i, null, "https://www.peacocktv.com/", 0],
    [/prime/i, "Prime Video", "https://www.amazon.com/primevideo", 1],
    [/^nfl\+$/i, "NFL+", "https://www.nfl.com/plus/", 1],
    [/nfl net/i, "NFL Network", "https://www.nfl.com/network/watch/", 0],
    [/mls season pass/i, "MLS Season Pass", "https://tv.apple.com/channel/mls-season-pass", 1],
    [/apple/i, "Apple TV", "https://tv.apple.com/", 1],
    [/league pass/i, "NBA League Pass", "https://www.nba.com/watch/league-pass-stream", 1],
    [/^nba tv$/i, "NBA TV", "https://www.nba.com/watch/nba-tv", 0],
    [/mlb\.tv/i, "MLB.TV", "https://www.mlb.com/tv", 1],
    [/mlb net|mlbn/i, "MLB Network", "https://www.mlb.com/network", 0],
    [/nhl net/i, "NHL Network", "https://www.nhl.com/", 0],
    [/sportsnet la|snla/i, "Spectrum SportsNet LA", "https://www.spectrumsportsnetla.com/", 0],
    [/spectrum sportsnet|^spectrum sn$/i, "Spectrum SportsNet", "https://www.spectrumsportsnet.com/", 0],
    [/fanduel|bally|fdsn/i, null, "https://www.fanduelsportsnetwork.com/", 1],
    [/^(tnt|trutv|tbs|max|hbo max)$/i, null, "https://www.hbomax.com/sports", 1],
    [/netflix/i, "Netflix", "https://www.netflix.com/", 1],
    [/youtube/i, null, "https://tv.youtube.com/", 1],
    [/victory\+/i, "Victory+", "https://www.victoryplus.com/", 0],
    [/ufc fight pass/i, "UFC Fight Pass", "https://ufcfightpass.com/", 1]
  ];
  function nets(c) {
    var n = [];
    ((c && c.broadcasts) || []).forEach(function (b) { if (b.names) n = n.concat(b.names); else if (b.media && b.media.shortName) n.push(b.media.shortName); else if (b.name) n.push(b.name); });
    ((c && c.geoBroadcasts) || []).forEach(function (g) { if (g.media && g.media.shortName) n.push(g.media.shortName); });
    return n.filter(function (x, i) { return x && n.indexOf(x) === i; });
  }
  function watchHTML(c) {
    var list = nets(c);
    var rows = list.map(function (nm) {
      var hit = WATCH.filter(function (w) { return w[0].test(nm.trim()); })[0];
      return '<div class="ms-w"><b>' + esc(nm) + (hit && hit[3] ? '<span class="ms-sub">Subscription</span>' : '') + '</b>' +
        (hit ? '<a href="' + esc(hit[2]) + '" target="_blank" rel="noopener">Official site ↗</a>' : '') + '</div>';
    }).join("");
    return (rows ? '<div class="ms-card">' + rows + '</div>' : '<div class="ms-card">📺 Check local listings. No TV or streaming info from ESPN for this one yet.</div>') +
      '<div class="ms-mel">📺 <b>Watch it live at Melody.</b> Every game on the TVs, 5 minutes from LAX.</div>' +
      '<p class="ms-fine">Links open each network\'s official site or app. Availability depends on where you are and your TV or streaming plan.</p>';
  }
  function openWatch(c, title) { openSheet(title || "Where to watch", function (done) { done(watchHTML(c)); }); }

  /* ---------------- data helpers ---------------- */
  function SBapi() { return window.SportsBar && window.SportsBar.api; }
  var cache = {};
  function get(url, ms) {
    var c = cache[url]; if (c && Date.now() - c.t < (ms || 30000)) return c.p;
    var A = SBapi(), p = (A && A.getJSON ? A.getJSON(url) : fetch(url).then(function (r) { if (!r.ok) throw 0; return r.json(); }));
    p = p.catch(function () { delete cache[url]; return null; });
    cache[url] = { t: Date.now(), p: p }; return p;
  }
  function comp(e) { return e && e.competitions && e.competitions[0]; }
  function sides(c) {
    var cs = (c && c.competitors) || [];
    return { away: cs.filter(function (x) { return x.homeAway === "away"; })[0] || cs[1], home: cs.filter(function (x) { return x.homeAway === "home"; })[0] || cs[0] };
  }
  function scoreOf(x) { var s = x && x.score; if (s == null) return ""; return typeof s === "object" ? (s.displayValue || "") : String(s); }
  function recOf(x) { var r = x && (x.records || x.record); if (!r || !r.length) return ""; var t = r.filter(function (y) { return y.type === "total" || y.name === "overall"; })[0] || r[0]; return t.summary || t.displayValue || ""; }
  function logoOf(t) { if (!t) return ""; if (t.logo) return t.logo; var l = t.logos && t.logos[0]; return (l && l.href) || ""; }
  function abbr(t) { return (t && (t.abbreviation || t.shortDisplayName || t.displayName)) || ""; }
  function fmtTime(iso, withDay) { var A = SBapi(); return A ? A.fmtTime(iso, withDay) : new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); }
  function periodLbl(lg, i, n) {
    if (lg === "mlb") return String(i + 1);
    if (lg === "nhl") return i < 3 ? String(i + 1) : (i === 3 ? "OT" : "SO");
    if (lg === "mls") return i === 0 ? "1H" : i === 1 ? "2H" : "ET";
    if (lg === "cbb") return i < 2 ? (i + 1) + "H" : "OT";
    return i < 4 ? "Q" + (i + 1) : (n > 5 ? "OT" + (i - 3) : "OT");
  }

  /* ---------------- team stats sheet ---------------- */
  function openTeam(lg, id, name) {
    var A = SBapi(); if (!A || !A.L[lg]) return;
    var path = A.L[lg].path, key = lg + ":" + id, local = !!A.TK[key];
    openSheet(name || "Team", function (done) {
      var jobs = [get(A.BASE + path + "/teams/" + id, 6e5), get(A.BASE + path + "/teams/" + id + "/schedule", 6e5),
        get("https://site.web.api.espn.com/apis/site/v3/sports/" + path + "/teamleaders?team=" + id, 36e5)];
      if (local) { jobs.push(A.loadSched(key)); jobs.push(A.loadStand(lg)); }
      Promise.all(jobs).then(function (r) {
        var tj = r[0] && r[0].team, sj = r[1], lj = r[2] && r[2].teamLeaders, h = "";
        if (!tj && !sj) { done('<div class="ms-card">Team info is unavailable right now. Try again in a minute.</div>'); return; }
        var logo = logoOf(tj) || (local ? A.logoFor(A.TK[key]) : "");
        h += '<div class="ms-hero" style="grid-template-columns:auto 1fr;text-align:left">' + (logo ? '<img src="' + esc(logo) + '" alt="">' : '<span></span>') +
          '<div><b style="font:900 22px var(--display);letter-spacing:0">' + esc((tj && tj.displayName) || name) + '</b><span style="color:var(--dim);font-weight:700">' + esc([A.L[lg].name, tj && tj.standingSummary].filter(Boolean).join(" · ")) + '</span></div></div>';
        var recs = (tj && tj.record && tj.record.items) || [];
        if (recs.length) h += '<div class="ms-sec">Record</div><div class="ms-card">' + recs.map(function (it) { return '<div class="ms-row"><span>' + esc(it.description || (it.type === "total" ? "Overall" : it.type) || "Overall") + '</span><b>' + esc(it.summary) + '</b></div>'; }).join("") + '</div>';
        if (local) {
          var info = A.teamInfo(key);
          if (info && (info.lines.length || info.badges.length)) h += '<div class="ms-sec">Playoff picture</div><div class="ms-card">' + info.lines.map(function (l) { return '<div>' + esc(l) + '</div>'; }).join("") +
            info.badges.map(function (b) { return '<span class="sc-bdg ' + (b[1] === "out" ? "out" : "") + '">' + esc(b[0]) + '</span>'; }).join("") + '</div>';
        }
        var evs = (sj && sj.events) || [];
        var fin = evs.filter(function (e) { var c = comp(e); return c && c.status && c.status.type && c.status.type.completed; }).slice(-5);
        if (fin.length) h += '<div class="ms-sec">Last ' + fin.length + '</div><div class="ms-card"><div class="ms-l5">' + fin.map(function (e) {
          var c = comp(e), me = c.competitors.filter(function (x) { return String(x.id || x.team.id) === String(id); })[0], op = c.competitors.filter(function (x) { return String(x.id || x.team.id) !== String(id); })[0];
          if (!me || !op) return ""; var res = me.winner === true ? "W" : op.winner === true ? "L" : "T";
          return '<i class="' + res + '" title="' + esc(res + " " + scoreOf(me) + "-" + scoreOf(op)) + '">' + res + ' <small style="font-weight:700;color:var(--dim)">' + esc(scoreOf(me) + "-" + scoreOf(op) + " " + abbr(op.team)) + '</small></i>';
        }).join("") + '</div></div>';
        var nx = (tj && tj.nextEvent && tj.nextEvent[0]) || evs.filter(function (e) { var c = comp(e); return c && c.status && c.status.type && c.status.type.state === "pre"; })[0];
        if (nx && comp(nx)) {
          var nc = comp(nx), nt = nets(nc);
          h += '<div class="ms-sec">Next game</div><div class="ms-card"><b>' + esc(nx.shortName || nx.name) + '</b><div style="color:var(--dim)">' + esc(fmtTime(nx.date, true)) + (nt.length ? " · 📺 " + esc(nt.join(", ")) : "") + '</div>' +
            '<button type="button" class="sc-btn hot" data-nxw style="width:100%;margin-top:10px">📺 Where to watch</button></div>';
        }
        var cats = (lj && lj.categories) || [], stats = [];
        cats.forEach(function (ct) {
          var mine = (ct.leaders || []).filter(function (l) { return l.team && String(l.team.id) === String(id); })[0];
          if (mine && mine.displayValue != null && stats.length < 8 && !/^opponent/i.test(ct.name || "")) stats.push([ct.displayName || ct.name, mine.displayValue, mine.ranks]);
        });
        if (stats.length) h += '<div class="ms-sec">Key team stats</div><div class="ms-card">' + stats.map(function (s) { return '<div class="ms-row"><span>' + esc(s[0]) + '</span><b>' + esc(s[1]) + (s[2] ? ' <small style="color:var(--dim)">#' + esc(s[2]) + '</small>' : '') + '</b></div>'; }).join("") + '</div>';
        h += '<p class="ms-fine">Stats from ESPN. Only what ESPN publishes for this team is shown.</p>';
        done(h, function (bd) { var b = $("[data-nxw]", bd); if (b) b.onclick = function () { openWatch(comp(nx), "Where to watch"); }; });
      });
    });
  }

  /* ---------------- game detail sheet ---------------- */
  function openGame(r) {
    var A = SBapi(); if (!A) return;
    var e = r.e, lg = r.lg, c0 = comp(e), sd = sides(c0);
    openSheet(abbr(sd.away.team) + " at " + abbr(sd.home.team), function (done) {
      get(A.BASE + A.L[lg].path + "/summary?event=" + e.id, r.s === "in" ? 15000 : 120000).then(function (j) {
        var hc = j && j.header && comp(j.header), c = hc || c0, s2 = sides(c), st = (c.status && c.status.type) || (e.status && e.status.type) || {}, h = "";
        var stTxt = st.state === "in" ? '<span style="color:#ff8a8a;font-weight:800"><i class="sc-dot" style="display:inline-block;margin-right:6px"></i>LIVE · ' + esc(st.shortDetail || st.detail || "") + '</span>' : esc(st.state === "pre" ? fmtTime(e.date, true) : (st.shortDetail || "Final"));
        var tm = function (x) { return '<button type="button" class="sc-tm" data-tm="' + esc(x.team.id) + '"><img src="' + esc(logoOf(x.team)) + '" alt="" onerror="this.style.visibility=\'hidden\'"><b>' + esc(abbr(x.team)) + '</b><small>' + esc(recOf(x)) + '</small><span class="tap">Team stats ›</span></button>'; };
        h += '<div class="ms-hero">' + tm(s2.away) + '<div><div class="sc-sc">' + (st.state === "pre" ? '<span class="sc-vs">vs</span>' : esc(scoreOf(s2.away)) + '<i>–</i>' + esc(scoreOf(s2.home))) + '</div><div class="sc-st">' + stTxt + '</div></div>' + tm(s2.home) + '</div>';
        var la = s2.away.linescores || [], lh = s2.home.linescores || [], n = Math.max(la.length, lh.length);
        if (n) {
          var cell = function (l) { return l ? esc(l.displayValue != null ? l.displayValue : l.value) : ""; };
          h += '<div class="ms-sec">Box score</div><div class="ms-card ms-wrap"><table class="ms-tbl"><tr><th></th>' + Array.apply(null, Array(n)).map(function (_, i) { return '<th>' + periodLbl(lg, i, n) + '</th>'; }).join("") + '<th>T</th></tr>' +
            [s2.away, s2.home].map(function (x, k) { var ls = k ? lh : la; return '<tr><td>' + esc(abbr(x.team)) + '</td>' + Array.apply(null, Array(n)).map(function (_, i) { return '<td>' + cell(ls[i]) + '</td>'; }).join("") + '<td class="t">' + esc(scoreOf(x)) + '</td></tr>'; }).join("") + '</table></div>';
        }
        var sp = (j && j.scoringPlays) || [];
        if (sp.length) h += '<div class="ms-sec">Scoring plays</div><div class="ms-card">' + sp.slice(-10).reverse().map(function (p) {
          return '<div class="ms-play"><small>' + esc([p.period && periodLbl(lg, (p.period.number || 1) - 1, 9), p.clock && p.clock.displayValue, p.team && p.team.abbreviation].filter(Boolean).join(" · ")) + '</small>' + esc(p.text || "") +
            (p.awayScore != null ? ' <b style="color:var(--gold2)">' + esc(p.awayScore + "-" + p.homeScore) + '</b>' : '') + '</div>'; }).join("") + '</div>';
        var ld = (j && j.leaders) || [];
        var ldh = ld.map(function (t) {
          var cats = (t.leaders || []).slice(0, 3).map(function (ct) { var top = ct.leaders && ct.leaders[0]; if (!top || !top.athlete) return ""; return '<div class="ms-row"><span>' + esc(ct.displayName || ct.name) + '</span><b>' + esc(top.athlete.displayName) + ' <small style="color:var(--dim)">' + esc(top.displayValue || "") + '</small></b></div>'; }).join("");
          return cats ? '<div style="font:800 13px var(--body);color:var(--gold2);margin-top:6px">' + esc(abbr(t.team)) + '</div>' + cats : "";
        }).join("");
        if (ldh) h += '<div class="ms-sec">Leaders</div><div class="ms-card">' + ldh + '</div>';
        // pick the winner (today's LA games, same picks + points as the scoreboard)
        var picks = A.picks(), my = picks[e.id], isToday = A.collect().all.some(function (x) { return String(x.e.id) === String(e.id); });
        if (isToday) {
          if (st.state === "pre") h += '<div class="ms-sec">Pick the winner</div><div class="ms-card"><div class="ms-pk">' + [s2.away, s2.home].map(function (x) { return '<button type="button" data-pk="' + esc(x.team.id) + '" aria-pressed="' + (!!my && String(my.team) === String(x.team.id)) + '">' + esc(x.team.shortDisplayName || abbr(x.team)) + '</button>'; }).join("") + '</div><p class="ms-fine" style="margin:8px 0 0">One pick per game. Picks lock at the start.</p></div>';
          else { var ph = A.pickHTML(r); if (ph) h += '<div class="ms-sec">Your pick</div><div class="ms-card">' + ph + '</div>'; }
        }
        h += '<div class="ms-sec">Where to watch</div>' + watchHTML(c0);
        if (!j) h += '<p class="ms-fine">Live detail is unavailable right now; showing the scoreboard info.</p>';
        done(h, function (bd) {
          $$("[data-tm]", bd).forEach(function (b) { b.onclick = function () { var x = [s2.away, s2.home].filter(function (y) { return String(y.team.id) === b.getAttribute("data-tm"); })[0]; openTeam(lg, b.getAttribute("data-tm"), x && x.team.displayName); }; });
          $$("[data-pk]", bd).forEach(function (b) { b.onclick = function () { if (A.setPick(e.id, b.getAttribute("data-pk"))) { var p = A.picks()[e.id]; $$("[data-pk]", bd).forEach(function (y) { y.setAttribute("aria-pressed", String(!!p && String(p.team) === y.getAttribute("data-pk"))); }); } }; });
        });
      });
    });
  }

  /* ---------------- Today's games carousel ---------------- */
  var host = $("#spcar"), rowsNow = [], idxNow = 0, firstFull = false;
  function cardHTML(r, i) {
    var A = SBapi(), c = comp(r.e); if (!c) return "";
    var sd = sides(c), f = A.follows(), fol = r.keys.some(function (k) { return f.indexOf(k) >= 0; });
    var live = r.s === "in", pre = r.s === "pre", st = (c.status && c.status.type) || {};
    var top = live ? '<span class="lv"><i class="sc-dot"></i>Live</span>' : '<span>' + esc(pre ? "Today" : "Final") + '</span>';
    var win = function (x) { return r.s === "post" && x.winner === true ? ' class="w"' : ''; };
    var mid = pre ? '<div class="sc-vs">vs</div><div class="sc-st">' + esc(fmtTime(r.e.date)) + '</div>'
      : '<div class="sc-sc"><span' + win(sd.away) + '>' + esc(scoreOf(sd.away)) + '</span><i>–</i><span' + win(sd.home) + '>' + esc(scoreOf(sd.home)) + '</span></div><div class="sc-st' + (live ? ' lvst' : '') + '">' + esc(st.shortDetail || st.detail || (live ? "Live" : "Final")) + '</div>';
    var tm = function (x) { return '<button type="button" class="sc-tm" data-lg="' + r.lg + '" data-tm="' + esc(x.team.id) + '" data-nm="' + esc(x.team.displayName || "") + '" aria-label="' + esc((x.team.displayName || abbr(x.team)) + " team stats") + '"><img src="' + esc(logoOf(x.team)) + '" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'"><b>' + esc(abbr(x.team)) + '</b><small>' + esc(recOf(x) || " ") + '</small></button>'; };
    var hl = A.headline(c), sub = [hl, fol ? "★ My team" : ""].filter(Boolean).join(" · ");
    return '<article class="sc-card' + (live ? " live" : "") + (fol ? " fol" : "") + '" data-i="' + i + '" tabindex="0" aria-label="' + esc(abbr(sd.away.team) + " at " + abbr(sd.home.team) + ", game details") + '">' +
      '<div class="sc-top">' + top + '<span>' + esc(A.L[r.lg].name) + '</span></div>' +
      '<div class="sc-mu">' + tm(sd.away) + '<div class="sc-mid">' + mid + '</div>' + tm(sd.home) + '</div>' +
      '<div class="sc-sub">' + esc(sub) + '</div>' +
      '<div class="sc-act"><button type="button" class="sc-btn hot" data-watch="' + i + '">📺 Where to watch</button><button type="button" class="sc-btn" data-game="' + i + '">Game details ›</button></div></article>';
  }
  function raceHTML(key) {
    var A = SBapi(), t = A.TK[key], info = A.teamInfo(key); if (!info || !(info.lines.length || info.badges.length || info.rec)) return "";
    var sc = A.SCHED[key], td = sc && sc.team, logo = (td && td.logo) || A.logoFor(t);
    return '<article class="sc-card sc-race" data-team="' + esc(key) + '" tabindex="0"><div class="sc-top"><span>Playoff race</span><span>' + esc(A.L[t[0]].name) + '</span></div>' +
      '<div class="hd" style="margin-top:8px"><img src="' + esc(logo) + '" alt="" onerror="this.style.visibility=\'hidden\'"><div><b>' + esc((td && td.displayName) || t[3]) + '</b><span style="color:var(--dim);font:700 12.5px var(--body)">' + esc([info.rec, info.standing].filter(Boolean).join(" · ")) + '</span></div></div>' +
      (info.lines.length ? '<ul>' + info.lines.slice(0, 3).map(function (l) { return '<li>' + esc(l) + '</li>'; }).join("") + '</ul>' : '') +
      info.badges.map(function (b) { return '<span class="sc-bdg ' + (b[1] === "out" ? "out" : "") + '">' + esc(b[0]) + '</span>'; }).join("") +
      '<div class="sc-act" style="grid-template-columns:1fr"><button type="button" class="sc-btn">Team stats ›</button></div></article>';
  }
  function draw() {
    var A = SBapi(); if (!host || !A) return;
    var m = A.collect(), rows = m.live.concat(m.up, m.fin), f = A.follows(), extra = "", label = "";
    var sb = A.SCHED, loadedAny = rows.length || Object.keys(sb).length;
    if (!rows.length) {
      // no LA game today: next scheduled games (one per team, soonest first) + playoff race cards
      var seen = {}, nx = [];
      A.TK && Object.keys(A.TK).forEach(function (k) { var e = A.nextEv(k); if (e && !seen[e.id]) { seen[e.id] = 1; nx.push({ lg: A.TK[k][0], e: e, s: "pre", keys: [k], next: 1 }); } });
      nx.sort(function (a, b) { return new Date(a.e.date) - new Date(b.e.date); });
      rows = nx.slice(0, 8);
      label = rows.length ? "No LA games today · up next" : "";
    }
    rowsNow = rows;
    var cards = rows.map(function (r, i) {
      var h = cardHTML(r, i);
      if (r.next) h = h.replace('<span>Today</span>', '<span>' + esc(fmtTime(r.e.date, true)) + '</span>').replace(/<div class="sc-st">[^<]*<\/div>/, '<div class="sc-st">' + esc(new Date(r.e.date).toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", weekday: "short", month: "short", day: "numeric" })) + '</div>');
      return h;
    });
    if (!m.all.length) Object.keys(A.TK).forEach(function (k) { var h = raceHTML(k); if (h) cards.push(h); });
    var nLive = m.live.length, nUp = m.up.length, nFin = m.fin.length;
    var sum = m.all.length ? [nLive && nLive + " live", nUp && nUp + " later", nFin && nFin + " final"].filter(Boolean).join(" · ") : label;
    var bar = '<div class="scx-bar"><button type="button" class="scx-chip gold" data-my>★ My teams' + (f.length ? " (" + f.length + ")" : "") + '</button><button type="button" class="scx-chip" data-full>Full scoreboard ›</button><span class="scx-sum">' + esc(sum) + '</span></div>';
    if (!cards.length) {
      host.innerHTML = bar + '<div class="scx-empty">' + (A.allErr() ? '<b>Scores are taking a break</b>We can\'t reach the live scores right now. Try the full scoreboard in a minute.' : loadedAny ? '<b>No LA games today</b>Open the full scoreboard for standings and what\'s next.' : '<b>Loading today\'s games…</b>LA &amp; California teams, live.') + '</div>';
    } else {
      host.innerHTML = bar + '<div class="scx-track" role="list">' + cards.join("") + '</div><div class="scx-dots" role="tablist" aria-label="Games">' + cards.map(function (_, i) { return '<button type="button" role="tab" aria-label="Game ' + (i + 1) + '" data-dot="' + i + '"></button>'; }).join("") + '</div>';
    }
    bind();
  }
  function bind() {
    var A = SBapi(), SB = window.SportsBar;
    var my = $("[data-my]", host), full = $("[data-full]", host);
    if (my) my.onclick = function () { SB.picker(); };
    if (full) full.onclick = function () { SB.open("teams"); };
    var tr = $(".scx-track", host); if (!tr) return;
    var dots = $$("[data-dot]", host), cardsEl = $$(".sc-card", tr);
    function markDot() {
      var w = cardsEl[0] ? cardsEl[0].offsetWidth + 10 : 1, i = Math.max(0, Math.min(dots.length - 1, Math.round(tr.scrollLeft / w)));
      if (tr.scrollLeft + tr.clientWidth >= tr.scrollWidth - 4) i = dots.length - 1;
      idxNow = i; dots.forEach(function (d, k) { d.classList.toggle("on", k === i); d.setAttribute("aria-selected", String(k === i)); });
    }
    tr.addEventListener("scroll", function () { requestAnimationFrame(markDot); }, { passive: true });
    dots.forEach(function (d) { d.onclick = function () { var c = cardsEl[+d.getAttribute("data-dot")]; if (c) tr.scrollTo({ left: c.offsetLeft - (tr.clientWidth - c.offsetWidth) / 2, behavior: REDUCE ? "auto" : "smooth" }); }; });
    if (idxNow && cardsEl[idxNow]) tr.scrollLeft = cardsEl[idxNow].offsetLeft - (tr.clientWidth - cardsEl[idxNow].offsetWidth) / 2;
    markDot();
    tr.onclick = function (ev) {
      var t = ev.target, card = t.closest(".sc-card"); if (!card) return;
      if (card.hasAttribute("data-team")) { var k = card.getAttribute("data-team"), p = k.split(":"); openTeam(p[0], p[1], A.TK[k] && A.TK[k][3]); return; }
      var r = rowsNow[+card.getAttribute("data-i")]; if (!r) return;
      var tb = t.closest(".sc-tm"); if (tb) { openTeam(tb.getAttribute("data-lg"), tb.getAttribute("data-tm"), tb.getAttribute("data-nm")); return; }
      if (t.closest("[data-watch]")) { var sd = sides(comp(r.e)); openWatch(comp(r.e), abbr(sd.away.team) + " at " + abbr(sd.home.team) + " · watch"); return; }
      openGame(r);
    };
    tr.onkeydown = function (ev) { if ((ev.key === "Enter" || ev.key === " ") && ev.target.classList.contains("sc-card")) { ev.preventDefault(); ev.target.click(); } };
  }
  function start() {
    if (!host) return;
    if (!SBapi()) { host.innerHTML = '<div class="scx-empty"><b>Scores unavailable</b>Please refresh the page.</div>'; return; }
    draw();
    document.addEventListener("sportsbar:update", draw);
    // one full load right away (schedules + standings) so "no games today" can show what's next and the playoff race
    if (!firstFull) { firstFull = true; window.SportsBar.refresh(true); }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
