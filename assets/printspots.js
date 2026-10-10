/* Second Shift AI — "Where to print" guide for QR stickers + window posters (Los Angeles).
   Include on any page with <div id="printspots"></div> and <script src="…/assets/printspots.js"></script>.
   Shops researched Oct 2026 — always call ahead to confirm same-day on your size + material. */
(function () {
  "use strict";
  var box = document.getElementById("printspots"); if (!box) return;
  var maps = function (q) { return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q); };
  var TODAY = [
    ["Guru Printers", "Downtown LA · 700 Flower St #2750, Los Angeles 90017", "(213) 612-4451", "Posters + stickers, rush / same-day. Reviewers got a rush sticker order in under 12 hours.", "Guru Printers 700 Flower St Los Angeles"],
    ["Artiphics Printing", "Downtown LA · 1515 Maple Ave Ste 18, Los Angeles 90015", "(213) 749-9457", "Same-day stickers, banners and large posters. 4.8★ (22 reviews).", "Artiphics Printing 1515 Maple Ave Los Angeles"],
    ["FedEx Office", "Many LA stores, e.g. 2723 S Figueroa St · 11819 Wilshire Blvd · 1520 Westwood Blvd", null, "Walk-in same-day 24×36 posters and sticker labels. Good backup for a quick poster.", "FedEx Office Print & Ship Center near me"]];
  var ONLINE = [
    ["Jukebox Print", "jukeboxprint.com", "Die-cut vinyl stickers. Approve your proof by 11 AM PT and they ship the next business day.", "https://www.jukeboxprint.com/"],
    ["Sticker Mule", "stickermule.com", "Best-looking die-cut stickers, about a 4-day turnaround with free shipping. Order a week ahead.", "https://www.stickermule.com/custom-stickers"],
    ["Vistaprint", "vistaprint.com", "24×36 posters. Pick Rush at checkout for about 2 business days.", "https://www.vistaprint.com/signs-posters/posters"]];
  var e = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var css = "#printspots{margin:26px 0}#printspots h2{margin:0 0 6px}#printspots .ps-s{color:#9aa6c6;font-size:14px;margin:0 0 12px}" +
    "#printspots .ps-h{font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#9aa6c6;margin:18px 0 8px}" +
    "#printspots .ps-c{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:12px 14px;margin:8px 0}" +
    "#printspots .ps-c b{font-size:16px}#printspots .ps-c .w{color:#9aa6c6;font-size:13px;margin:2px 0 6px}#printspots .ps-c p{margin:0 0 8px;font-size:14px}" +
    "#printspots .ps-a{display:flex;gap:8px;flex-wrap:wrap}#printspots .ps-a a{min-height:40px;padding:0 14px;border-radius:99px;display:inline-flex;align-items:center;font-weight:700;font-size:14px;text-decoration:none;background:#1e6fe0;color:#fff}" +
    "#printspots .ps-a a.alt{background:transparent;border:1px solid rgba(255,255,255,.25);color:inherit}" +
    "#printspots ul{margin:6px 0 0;padding-left:18px;font-size:14px}#printspots li{margin:4px 0}";
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  box.innerHTML = '<h2>🖨️ Where to print</h2><p class="ps-s">Take the PDFs above to any of these. Shops checked Oct 2026; call ahead to confirm same-day for your size.</p>' +
    '<div class="ps-h">Need it today · Los Angeles walk-in</div>' +
    TODAY.map(function (s) { return '<div class="ps-c"><b>' + e(s[0]) + '</b><div class="w">' + e(s[1]) + '</div><p>' + e(s[3]) + '</p><div class="ps-a">' +
      (s[2] ? '<a href="tel:' + s[2].replace(/\D/g, "") + '">📞 Call</a>' : "") + '<a class="alt" href="' + maps(s[4]) + '">📍 Map</a></div></div>'; }).join("") +
    '<div class="ps-h">Next day or a few days · online, delivered</div>' +
    ONLINE.map(function (s) { return '<div class="ps-c"><b>' + e(s[0]) + '</b><div class="w">' + e(s[1]) + '</div><p>' + e(s[2]) + '</p><div class="ps-a"><a href="' + s[3] + '">Order online →</a></div></div>'; }).join("") +
    '<div class="ps-h">What to ask for</div><ul>' +
    '<li><b>Table stickers:</b> 3" round or square, <b>matte-laminated vinyl</b> (glossy glare can stop phones from scanning). 50–100 per restaurant.</li>' +
    '<li><b>Window poster:</b> 24×36 on poster paper or foam board, or a window cling taped inside the glass facing out.</li>' +
    '<li><b>Before ordering hundreds,</b> print one and scan it with an iPhone and an Android from a few feet away.</li></ul>';
})();
