/* Weekly champion card for any restaurant game demo.
   <div id="champs" data-game="melody"></div><script src="../champs.js"></script>
   Reads /champions.json (written every Sunday 11 PM LA by the weekly champions job) and shows last week's
   top 3 + a live countdown to this week's close. Colors come from the page: --gold/--accent, --ink, --dim, --edge.
   Optional data-me="<localStorage key>" ({n:name} as saved by the page's board form): if this phone was #2 or #3,
   their prize is dropped into the app once through window.SSAI_WIN (the page itself handles #1). */
(function () {
  "use strict";
  var me = document.currentScript, base = me && me.src ? me.src : location.href;
  var URL_JSON = new URL("../champions.json", base).href;   // demo/champs.js -> /champions.json

  function css() {
    if (document.getElementById("champs-css")) return;
    var s = document.createElement("style"); s.id = "champs-css";
    s.textContent =
      ".champs{--c-acc:var(--gold,var(--accent,currentColor));--c-ink:var(--ink,currentColor);--c-dim:var(--dim,currentColor);--c-edge:var(--edge,color-mix(in srgb,currentColor 25%,transparent));" +
      "position:relative;overflow:hidden;margin:12px 0;padding:14px 14px 12px;border-radius:16px;border:1px solid var(--c-acc);color:var(--c-ink);" +
      "background:linear-gradient(135deg,color-mix(in srgb,var(--c-acc) 16%,transparent),color-mix(in srgb,var(--c-acc) 4%,transparent));" +
      "box-shadow:0 6px 22px color-mix(in srgb,var(--c-acc) 18%,transparent);font-size:15px;line-height:1.4;max-width:100%;box-sizing:border-box}" +
      ".champs *{box-sizing:border-box}" +
      ".champs .ch-k{font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--c-acc);margin:0 0 6px}" +
      ".champs .ch-1{display:flex;gap:12px;align-items:center}" +
      ".champs .ch-who{min-width:0;flex:1}" +
      ".champs .ch-name{font-weight:900;font-size:19px;line-height:1.15;overflow-wrap:anywhere}" +
      ".champs .ch-name a,.champs .ch-row a{color:inherit;text-decoration:none;font-weight:700;opacity:.8}" +
      ".champs .ch-sc{font:800 15px ui-monospace,Menlo,monospace;color:var(--c-acc)}" +
      ".champs .ch-won{display:inline-block;margin-top:4px;font-size:12.5px;font-weight:800;padding:3px 10px;border-radius:999px;background:var(--c-acc);color:var(--sky,var(--bg,#111))}" +
      ".champs .ch-rest{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:5px}" +
      ".champs .ch-row{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;font-size:13.5px;padding:6px 10px;border-radius:10px;border:1px solid var(--c-edge);background:color-mix(in srgb,var(--c-ink) 4%,transparent)}" +
      ".champs .ch-row b{min-width:0;overflow-wrap:anywhere}.champs .ch-row .ch-sc{margin-left:auto;font-size:13px}" +
      ".champs .ch-row small{width:100%;color:var(--c-dim);font-size:12px}" +
      ".champs .ch-empty{font-weight:800;font-size:16px}" +
      ".champs .ch-cd{margin-top:12px;padding-top:10px;border-top:1px dashed var(--c-edge);display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}" +
      ".champs .ch-cd span{color:var(--c-dim);font-size:13px}" +
      ".champs .ch-t{display:flex;gap:5px}" +
      ".champs .ch-t i{font-style:normal;min-width:44px;text-align:center;padding:4px 6px;border-radius:9px;background:color-mix(in srgb,var(--c-acc) 18%,transparent);font:800 16px ui-monospace,Menlo,monospace;color:var(--c-ink)}" +
      ".champs .ch-t i small{display:block;font:700 9.5px system-ui,sans-serif;letter-spacing:.08em;color:var(--c-dim);text-transform:uppercase}";
    document.head.appendChild(s);
  }
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function ig(h) { return h ? ' <a href="https://instagram.com/' + encodeURIComponent(h) + '" target="_blank" rel="noopener">@' + esc(h) + "</a>" : ""; }
  function num(n) { return Number(n || 0).toLocaleString("en-US"); }

  // ---- countdown to Sunday 23:00 America/Los_Angeles, whatever the viewer's own time zone ----
  var TZ = "America/Los_Angeles";
  function laParts(ms) {
    var p = {}; new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric", weekday: "short" })
      .formatToParts(new Date(ms)).forEach(function (x) { p[x.type] = x.value; });
    return p;
  }
  function laOffset(ms) { var p = laParts(ms); return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - Math.floor(ms / 1000) * 1000; }
  function nextClose(now) {
    var p = laParts(now), dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday);
    var wall = Date.UTC(+p.year, +p.month - 1, +p.day, 23, 0, 0) + ((7 - dow) % 7) * 864e5;   // this/next Sunday 23:00 wall time
    var t = wall - laOffset(wall); t = wall - laOffset(t);                                    // wall -> real instant (DST-safe)
    if (t <= now) { wall += 7 * 864e5; t = wall - laOffset(wall); t = wall - laOffset(t); }
    return t;
  }

  function render(el, data) {
    var g = data && data.games && data.games[el.getAttribute("data-game")], top = g && g.top3 || [], html = "";
    if (data === undefined) {
      html += '<p class="ch-k">Weekly champion</p>';
    } else if (top.length) {
      var c = top[0];
      html += '<div class="ch-1"><div class="ch-who">' +
        '<div class="ch-name">👑 Last week\'s champion: ' + esc(c.name) + ig(c.ig) + '</div>' +
        '<div><span class="ch-sc">' + num(c.score) + '</span> pts · <span class="ch-won">won ' + esc(c.prize) + "</span></div></div></div>";
      if (top.length > 1) html += '<ol class="ch-rest">' + top.slice(1).map(function (r) {
        return '<li class="ch-row"><b>#' + r.rank + " " + esc(r.name) + "</b>" + ig(r.ig) + '<span class="ch-sc">' + num(r.score) + "</span><small>won " + esc(r.prize) + "</small></li>";
      }).join("") + "</ol>";
    } else {
      html += '<p class="ch-k">Weekly champion</p><div class="ch-empty">👑 Be the first champion — board closes Sunday 11 PM</div>';
    }
    html += '<div class="ch-cd"><span>This week\'s board closes Sunday 11:00 PM</span><div class="ch-t" aria-live="off"><i data-u="d">–<small>days</small></i><i data-u="h">–<small>hrs</small></i><i data-u="m">–<small>min</small></i></div></div>';
    el.innerHTML = html;
    tick(el);
  }
  function tick(el) {
    var left = Math.max(0, nextClose(Date.now()) - Date.now()), m = Math.floor(left / 6e4);
    var v = { d: Math.floor(m / 1440), h: Math.floor(m % 1440 / 60), m: m % 60 };
    [].forEach.call(el.querySelectorAll(".ch-t i"), function (i) { var u = i.getAttribute("data-u"); i.firstChild.nodeValue = String(v[u]); });
    var t = el.querySelector(".ch-t"); if (t) t.setAttribute("aria-label", v.d + " days " + v.h + " hours " + v.m + " minutes left");
  }
  function runnerUpPrize(el, data) {
    var key = el.getAttribute("data-me"), g = data && data.games && data.games[el.getAttribute("data-game")];
    if (!key || !g || !window.SSAI_WIN) return;
    var sv = {}; try { sv = JSON.parse(localStorage.getItem(key) || "{}"); } catch (e) { return; }
    if (!sv.n) return;
    (g.top3 || []).slice(1).forEach(function (r) {
      if (r.name !== sv.n) return;
      var k = "champs-" + g.game + "-" + g.week + "-" + r.rank; try { if (localStorage.getItem(k)) return; localStorage.setItem(k, "1"); } catch (e) { return; }
      window.SSAI_WIN("Weekly #" + r.rank + ": " + r.prize.charAt(0).toLowerCase() + r.prize.slice(1));
    });
  }

  function init() {
    css();
    var els = document.querySelectorAll("#champs,[data-champs]");
    if (!els.length) return;
    [].forEach.call(els, function (el) { el.classList.add("champs"); render(el, undefined); });
    setInterval(function () { [].forEach.call(els, tick); }, 30000);
    fetch(URL_JSON + "?t=" + Math.floor(Date.now() / 3e5), { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { [].forEach.call(els, function (el) { render(el, d || null); if (d) runnerUpPrize(el, d); }); })
      .catch(function () { [].forEach.call(els, function (el) { render(el, null); }); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
