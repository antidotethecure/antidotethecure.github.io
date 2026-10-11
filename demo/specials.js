/* SousShift AI — Holiday & seasonal specials, for every restaurant demo.
   Include near the end of the page (after crm.js so the owner's "Holiday blast" composer picks them up):
     <script>window.SPECIALS=[{id:"halloween",holiday:"halloween",title:"Spooky Mac Night",desc:"…",item:"House Mac",start:"10-20",end:"10-31"}];</script>
     <script src="../specials.js"></script>
   Each special: {id, holiday:"halloween"|"thanksgiving"|"christmas"|"newyear"|"valentines"|"stpatricks"|"cinco"|"july4"|"custom",
     title, desc, price?, item? (name of a real menu item: "See it" scrolls to it), start:"MM-DD", end:"MM-DD" (inclusive,
     may wrap the new year, e.g. 12-29 → 01-01), img?, code?}
   Optional window.SPECIALS_CFG = {before:"#drinks"} puts the Specials card before that element (default: before #chips,
   #menu or #menuhost, whichever the page has).
   - While today's date (Los Angeles time) is inside a special's window, a themed broadcast banner sits at the very top of the
     app. It leaves the top-right corner clear for the 🌐 language pill. "Hide today" hides it until tomorrow (this phone).
   - A "Specials" card (on now + coming up) goes into the menu.
   - Test any date with ?date=MM-DD (e.g. ?date=10-25 shows Halloween).
   - The demo specials are SAMPLES built from each restaurant's real menu. The owner changes or turns them off on their setup
     page (setup-kit, "Holiday specials"). Prices are only shown when the owner sets one. No free alcohol: drink specials are
     discounts only (California ABC).
   - window.SSAI_SPECIALS exposes today(), active(), upcoming(), theme(), link() for crm.js (owner "Holiday blast"). */
(function () {
  "use strict";
  var LIST = (window.SPECIALS || []).filter(function (s) { return s && s.start && s.end; });
  var CFG = window.SPECIALS_CFG || {};
  var NAME = CFG.name || (window.CRM_CFG && window.CRM_CFG.name) || (window.NEARBY && window.NEARBY.name) || document.title.split(/ [—·|-] /)[0];
  var SLUG = NAME.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  var THEMES = {
    halloween: { n: "Halloween", e: "🎃", deco: "🦇 👻 🕸️", bg: "linear-gradient(120deg,#1a0b2e 0%,#3b1405 55%,#c75400 100%)", acc: "#FF9A1F", ink: "#1a0b2e" },
    thanksgiving: { n: "Thanksgiving", e: "🦃", deco: "🍂 🥧 🍁", bg: "linear-gradient(120deg,#2e1606 0%,#7a3f0e 55%,#c9801c 100%)", acc: "#FFC861", ink: "#2e1606" },
    christmas: { n: "Christmas", e: "🎄", deco: "❄️ 🎁 ✨", bg: "linear-gradient(120deg,#0b3a1d 0%,#13592c 55%,#a3101c 100%)", acc: "#FFD54A", ink: "#0b3a1d" },
    newyear: { n: "New Year's", e: "🎆", deco: "🥳 ✨ 🎉", bg: "linear-gradient(120deg,#070b26 0%,#1c1f5a 55%,#8a6a10 100%)", acc: "#FFD54A", ink: "#070b26" },
    valentines: { n: "Valentine's Day", e: "💘", deco: "💕 🌹 💌", bg: "linear-gradient(120deg,#4a0824 0%,#a8124c 55%,#ff5f86 100%)", acc: "#FFD1DC", ink: "#4a0824" },
    stpatricks: { n: "St. Patrick's Day", e: "☘️", deco: "🍀 🌈 🪙", bg: "linear-gradient(120deg,#062e14 0%,#0f6a2c 55%,#2fa84f 100%)", acc: "#FFD54A", ink: "#062e14" },
    cinco: { n: "Cinco de Mayo", e: "🪅", deco: "🌮 🌶️ 🎉", bg: "linear-gradient(120deg,#004d34 0%,#0a7a52 50%,#b30f22 100%)", acc: "#FFD54A", ink: "#003322" },
    july4: { n: "Fourth of July", e: "🇺🇸", deco: "🎆 ⭐ 🎇", bg: "linear-gradient(120deg,#0a2160 0%,#1b3f9c 55%,#a81d2e 100%)", acc: "#FFFFFF", ink: "#0a2160" },
    custom: { n: "Special", e: "⭐", deco: "✨ ⭐ ✨", bg: "linear-gradient(120deg,#121C40 0%,#1d3290 60%,#2547B8 100%)", acc: "#FFD23F", ink: "#121C40" }
  };
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function theme(sp) { return THEMES[sp && sp.holiday] || THEMES.custom; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  // ---- today in Los Angeles (the restaurants' local time), or ?date=MM-DD for testing ----
  function laParts() {
    try {
      var p = {}; new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" })
        .formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
      return { y: +p.year, md: p.month + "-" + p.day };
    } catch (x) { var d = new Date(); return { y: d.getFullYear(), md: ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2) }; }
  }
  var LA = laParts(), TEST = null;
  try { TEST = new URLSearchParams(location.search).get("date"); } catch (x) {}
  var TODAY = TEST && /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(TEST) ? TEST : LA.md;
  function inWin(md, s, e) { return s <= e ? md >= s && md <= e : md >= s || md <= e; }   // MM-DD strings compare in date order
  function dayNum(md, y) { return Date.UTC(y, +md.slice(0, 2) - 1, +md.slice(3)) / 864e5; }
  function untilStart(sp) { var t = dayNum(TODAY, LA.y), s = dayNum(sp.start, LA.y); if (s < t) s = dayNum(sp.start, LA.y + 1); return s - t; }
  function active() { return LIST.filter(function (sp) { return inWin(TODAY, sp.start, sp.end); }); }
  function upcoming(n) { return LIST.filter(function (sp) { return !inWin(TODAY, sp.start, sp.end); }).sort(function (a, b) { return untilStart(a) - untilStart(b); }).slice(0, n || 99); }
  function fmt(md) { return MON[+md.slice(0, 2) - 1] + " " + (+md.slice(3)); }
  function link(sp) { return location.host + location.pathname.replace(/index\.html$/, "") + "#sp-" + sp.id; }
  function nextStart(sp) { var y = LA.y; if (dayNum(sp.start, y) < dayNum(TODAY, y)) y++; return y + "-" + sp.start; }   // YYYY-MM-DD
  function todayISO() { return LA.y + "-" + TODAY; }
  window.SSAI_SPECIALS = { list: LIST, today: function () { return TODAY; }, year: LA.y, active: active, upcoming: upcoming, theme: theme, link: link, fmt: fmt, nextStart: nextStart, todayISO: todayISO, name: NAME };

  var css = [
    "#ssai-sp-banner{all:initial;display:block;position:relative;z-index:50;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;width:100%;box-sizing:border-box}",
    "#ssai-sp-banner *{box-sizing:border-box;font-family:inherit}",
    ".spb{position:relative;overflow:hidden;color:#fff;padding:calc(10px + env(safe-area-inset-top,0px)) 12px 10px;border-bottom:2px solid var(--acc)}",
    ".spb+.spb{padding-top:10px}",
    ".spb::after{content:'';position:absolute;inset:0;background:linear-gradient(100deg,transparent 30%,#ffffff1f 45%,transparent 60%);background-size:250% 100%;animation:spbShine 5s ease-in-out infinite;pointer-events:none}",
    "@keyframes spbShine{0%{background-position:120% 0}60%,100%{background-position:-120% 0}}",
    "@media (prefers-reduced-motion:reduce){.spb::after{animation:none;display:none}}",
    // the 🌐 language pill is fixed at top:10px right:10px — keep the first lines clear of it
    ".spb-top{display:flex;gap:10px;align-items:flex-start;padding-right:104px;min-height:40px}",
    ".spb+.spb .spb-top{padding-right:0}",
    ".spb-e{flex:none;font-size:30px;line-height:1;filter:drop-shadow(0 2px 4px #0006);animation:spbBob 2.4s ease-in-out infinite}",
    "@keyframes spbBob{0%,100%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-3px) rotate(4deg)}}",
    "@media (prefers-reduced-motion:reduce){.spb-e{animation:none}}",
    ".spb-tx{min-width:0}.spb-tx small{display:block;font:800 10.5px/1.3 ui-monospace,Menlo,monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--acc)}",
    ".spb-tx b{display:block;font-size:16.5px;font-weight:900;line-height:1.2;margin:2px 0 2px;text-shadow:0 1px 2px #0005}",
    ".spb-tx span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:13px;line-height:1.35;color:#ffffffd9}",
    ".spb-act{display:flex;gap:8px;align-items:center;margin-top:8px;position:relative;z-index:1}",
    ".spb-act .deco{flex:1;font-size:13px;opacity:.85;letter-spacing:.1em;white-space:nowrap;overflow:hidden}",
    ".spb-go{border:0;border-radius:999px;background:var(--acc);color:var(--ink);font:800 14px/1 system-ui,-apple-system,sans-serif;padding:10px 16px;min-height:40px;cursor:pointer;box-shadow:0 4px 14px #0005}",
    ".spb-x{border:1px solid #ffffff55;border-radius:999px;background:#0003;color:#fff;font:700 12.5px/1 system-ui,-apple-system,sans-serif;padding:9px 12px;min-height:40px;cursor:pointer}",
    // specials card in the menu
    ".ssai-sp{all:initial;display:block;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#EEF2FF;background:#121C40;border:1px solid #25336A;border-radius:20px;padding:16px 14px;margin:18px auto;max-width:640px;box-sizing:border-box;line-height:1.45;text-align:left;scroll-margin-top:70px}",
    ".ssai-sp *{box-sizing:border-box;font-family:inherit}",
    ".ssai-sp .k{font:800 11px ui-monospace,Menlo,monospace;letter-spacing:.16em;text-transform:uppercase;color:#FFD23F}",
    ".ssai-sp h3{font-size:20px;font-weight:900;margin:3px 0 10px;color:#EEF2FF}",
    ".sp-c{position:relative;border-radius:16px;padding:12px;margin:10px 0 0;color:#fff;overflow:hidden;scroll-margin-top:90px;transition:box-shadow .3s}",
    ".sp-c.dim{background:#0b1230!important;border:1px solid #25336A;color:#C9D2EE}",
    ".sp-c.flash{box-shadow:0 0 0 3px var(--acc),0 0 24px var(--acc)}",
    ".sp-c .hd{display:flex;gap:10px;align-items:flex-start}.sp-c .em{font-size:28px;line-height:1;flex:none}",
    ".sp-c small{display:block;font:800 10.5px/1.3 ui-monospace,Menlo,monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--acc)}",
    ".sp-c.dim small{color:#9AA6CC}",
    ".sp-c b{display:block;font-size:16px;font-weight:900;line-height:1.25}",
    ".sp-c p{margin:4px 0 0;font-size:13.5px;color:inherit;opacity:.92}",
    ".sp-c img{display:block;width:100%;max-height:180px;object-fit:cover;border-radius:12px;margin-top:10px}",
    ".sp-c .meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;font-size:12px}",
    ".sp-c .meta span{background:#0004;border:1px solid #ffffff2e;border-radius:999px;padding:3px 9px}",
    ".sp-c .meta .cd{font:800 12px ui-monospace,Menlo,monospace;letter-spacing:.06em;border-style:dashed;border-color:var(--acc)}",
    ".sp-c button{margin-top:10px;border:0;border-radius:999px;background:var(--acc);color:var(--ink);font:800 13.5px/1 system-ui,-apple-system,sans-serif;padding:10px 14px;min-height:40px;cursor:pointer}",
    ".sp-c.dim button{background:#1a2656;color:#EEF2FF}",
    ".ssai-sp .fine{font-size:11.5px;color:#9AA6CC;margin:10px 0 0}",
    ".ssai-sp-hit{outline:3px solid #FFD23F!important;outline-offset:3px;border-radius:10px;transition:outline-color .6s}"
  ].join("");
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (x) { return null; } }
  var XKEY = "ssai_sp_hide_" + SLUG;
  function hiddenToday(sp) { return store(XKEY + "_" + sp.id) === TODAY; }

  // ---- find a real menu item on the page (menus render differently on every app, so match by visible text) ----
  function norm(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim().toLowerCase(); }
  function visible(el) { if (!el || !el.getClientRects().length) return false; for (var p = el; p && p !== document.body; p = p.parentElement) { var cs = getComputedStyle(p); if (cs.display === "none" || cs.visibility === "hidden") return false; } return true; }
  function findItem(name) {
    var want = norm(name); if (!want) return null;
    var skip = document.querySelectorAll("#ssai-sp-banner,#ssai-specials,#crm-owner,#crm-join,script,style,datalist,option");
    function bad(n) { for (var i = 0; i < skip.length; i++) if (skip[i].contains(n)) return true; return false; }
    var exact = null, part = null, w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null), t;
    while ((t = w.nextNode())) {
      var v = norm(t.nodeValue); if (!v || v.length > want.length + 40) continue;
      var el = t.parentElement; if (!el || bad(el) || !visible(el)) continue;
      if (v === want) { exact = el; break; }
      if (!part && v.indexOf(want) === 0) part = el;
    }
    return exact || part;
  }
  function flashEl(el) {
    var box = el; for (var i = 0; i < 4 && box.parentElement; i++) { if (box.offsetHeight >= 36) break; box = box.parentElement; }
    box.classList.add("ssai-sp-hit"); setTimeout(function () { box.classList.remove("ssai-sp-hit"); }, 2200);
  }
  function seeIt(sp) {
    var el = sp.item ? findItem(sp.item) : null;
    if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); flashEl(el); return; }
    var c = document.getElementById("sp-" + sp.id) || document.getElementById("ssai-specials");
    if (c) { c.scrollIntoView({ behavior: "smooth", block: "start" }); c.classList.add("flash"); setTimeout(function () { c.classList.remove("flash"); }, 2200); }
  }
  window.SSAI_SPECIALS.seeIt = seeIt;

  function meta(sp, on) {
    var m = [];
    if (sp.item) m.push('<span>🍽️ ' + esc(sp.item) + '</span>');
    if (sp.price) m.push('<span>💲 ' + esc(sp.price) + '</span>');
    if (sp.code) m.push('<span class="cd">CODE ' + esc(sp.code) + '</span>');
    m.push('<span>📅 ' + fmt(sp.start) + ' – ' + fmt(sp.end) + '</span>');
    return '<div class="meta">' + m.join("") + '</div>';
  }

  // ---- 1) broadcast banner at the top of the app ----
  function drawBanner() {
    var old = document.getElementById("ssai-sp-banner"); if (old) old.remove();
    var on = active().filter(function (sp) { return !hiddenToday(sp); });
    if (!on.length) return;
    var b = document.createElement("div"); b.id = "ssai-sp-banner"; b.setAttribute("role", "region"); b.setAttribute("aria-label", "Holiday special");
    b.innerHTML = on.map(function (sp) {
      var T = theme(sp), label = (sp.holiday === "custom" ? "Special" : T.n + " special") + " · on now";
      return '<div class="spb" data-id="' + esc(sp.id) + '" style="background:' + T.bg + ';--acc:' + T.acc + ';--ink:' + T.ink + '">' +
        '<div class="spb-top"><span class="spb-e" aria-hidden="true">' + T.e + '</span><div class="spb-tx"><small>' + esc(label) + '</small><b>' + esc(sp.title) + '</b><span>' + esc(sp.desc || "") + '</span></div></div>' +
        '<div class="spb-act"><button type="button" class="spb-go">See it →</button><span class="deco" aria-hidden="true">' + T.deco + '</span><button type="button" class="spb-x" aria-label="Hide this banner for today">✕ Hide today</button></div></div>';
    }).join("");
    b.addEventListener("click", function (ev) {
      var row = ev.target.closest(".spb"); if (!row) return; var sp = LIST.filter(function (s) { return s.id === row.dataset.id; })[0]; if (!sp) return;
      if (ev.target.closest(".spb-go")) seeIt(sp);
      if (ev.target.closest(".spb-x")) { store(XKEY + "_" + sp.id, TODAY); row.remove(); if (!b.querySelector(".spb")) b.remove(); }
    });
    document.body.insertBefore(b, document.body.firstChild);
  }

  // ---- 2) "Specials" card in the menu: on now + coming up ----
  function drawCard() {
    if (!LIST.length) return;
    var old = document.getElementById("ssai-specials"); if (old) old.remove();
    var on = active(), next = upcoming(on.length ? 2 : 3);
    var sec = document.createElement("section"); sec.className = "ssai-sp"; sec.id = "ssai-specials"; sec.setAttribute("aria-label", "Holiday specials");
    function card(sp, isOn) {
      var T = theme(sp), d = untilStart(sp);
      var when = isOn ? (T.n + " · on now") : (T.n + " · starts " + fmt(sp.start) + (d <= 14 ? " (in " + d + " day" + (d === 1 ? "" : "s") + ")" : ""));
      return '<div class="sp-c' + (isOn ? '' : ' dim') + '" id="sp-' + esc(sp.id) + '" style="' + (isOn ? 'background:' + T.bg + ';' : '') + '--acc:' + T.acc + ';--ink:' + T.ink + '">' +
        '<div class="hd"><span class="em" aria-hidden="true">' + T.e + '</span><div><small>' + esc(when) + '</small><b>' + esc(sp.title) + '</b><p>' + esc(sp.desc || "") + '</p></div></div>' +
        (sp.img ? '<img src="' + esc(sp.img) + '" alt="' + esc(sp.title) + '" loading="lazy">' : '') + meta(sp, isOn) +
        (sp.item ? '<button type="button" data-sp="' + esc(sp.id) + '">Find it on the menu →</button>' : '') + '</div>';
    }
    sec.innerHTML = '<span class="k">Specials</span><h3>' + (on.length ? "On now at " + esc(NAME) : "Holiday specials coming up") + '</h3>' +
      on.map(function (sp) { return card(sp, true); }).join("") + next.map(function (sp) { return card(sp, false); }).join("") +
      '<p class="fine">' + (on.length ? "" : "Nothing running today. ") + 'Sample specials made from the real menu. The owner sets the final deal and price before launch.</p>';
    sec.addEventListener("click", function (ev) { var bt = ev.target.closest("[data-sp]"); if (!bt) return; var sp = LIST.filter(function (s) { return s.id === bt.dataset.sp; })[0]; if (sp) { var el = findItem(sp.item); if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); flashEl(el); } else bt.textContent = "On the menu: " + sp.item; } });
    var at = null, sels = CFG.before ? [CFG.before] : ["#chips", "#menu", "#menuhost"];
    for (var i = 0; i < sels.length && !at; i++) at = document.querySelector(sels[i]);
    if (at && at.parentNode) at.parentNode.insertBefore(sec, at);
  }

  function boot() {
    drawBanner(); drawCard();
    var h = (location.hash || "").match(/^#sp-([\w-]+)$/);
    if (h) { var sp = LIST.filter(function (s) { return s.id === h[1]; })[0]; if (sp) setTimeout(function () { seeIt(sp); }, 600); }
    try { document.dispatchEvent(new Event("ssai-specials")); } catch (x) {}   // crm.js redraws its Holiday blast composer
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
