/* Second Shift AI — Google reviews + "you're nearby" map for every demo page.
   Include after the page's CONFIG:
     <script>window.NEARBY={name:"…", spots:[{label:"…", lat:…, lng:…, q:"street address"}], placeId:"", mapsKey:"", offer:"…"};</script>
     <script src="../nearby.js"></script>
   - Review button: opens Google's own "write a review" box (needs placeId) or the Google Maps listing.
     No stars/prizes are ever given for reviewing: Google bans incentivized reviews and can strip the listing.
   - Latest reviews: live from Google Places once mapsKey + placeId are set (referrer-restricted key);
     until then the Google Maps card for the spot shows the rating.
   - Map: Leaflet + OpenStreetMap. Other players are DEMO dots, drawn as fuzzy circles (neighborhood level,
     nickname only) because the live version only ever shows customers who opted in, never an exact spot.
   - Nearby alert: fires while the page is open and the customer is within radiusMi of a spot.
     A website cannot watch location in the background; that needs the app or a texting backend. */
(function () {
  "use strict";
  var N = window.NEARBY; if (!N || !N.spots || !N.spots.length) return;
  var RADIUS = N.radiusMi || 2, OFFER = N.offer || "Show this at the counter for double stars today.";
  var e = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var q = function (s) { return encodeURIComponent(s).replace(/%20/g, "+"); };
  var main = N.spots[0];
  var listing = "https://www.google.com/maps/search/?api=1&query=" + q(N.name + " " + (main.q || "")) + (N.placeId ? "&query_place_id=" + N.placeId : "");
  var writeUrl = N.placeId ? "https://search.google.com/local/writereview?placeid=" + N.placeId : listing;

  var css = [
    "#ssai-n{all:initial;display:block;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#F2F4F8;background:#12151C;border:1px solid #2A303C;border-radius:20px;padding:18px 16px;margin:26px auto;max-width:640px;box-sizing:border-box;line-height:1.45;text-align:left}",
    "#ssai-n *{box-sizing:border-box;font-family:inherit}",
    "#ssai-n h3{font-size:20px;font-weight:900;margin:2px 0 4px;color:#F2F4F8;letter-spacing:-.01em}",
    "#ssai-n .k{font:700 11px ui-monospace,Menlo,monospace;letter-spacing:.16em;text-transform:uppercase;color:#F7C04A}",
    "#ssai-n p{margin:0 0 12px;color:#9AA6B6;font-size:14px}",
    "#ssai-n .b{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;border:0;border-radius:14px;padding:14px;font-size:15px;font-weight:800;cursor:pointer;text-decoration:none;margin-top:8px}",
    "#ssai-n .gold{background:#F7C04A;color:#1a1200}#ssai-n .ghost{background:#1B2030;color:#F2F4F8;border:1px solid #2A303C}",
    "#ssai-n .g{display:inline-flex;gap:2px;font-weight:900}#ssai-n .g i{font-style:normal}",
    "#ssai-n .stars{color:#F7C04A;letter-spacing:1px}",
    "#ssai-n .rv{background:#0B0D12;border:1px solid #2A303C;border-radius:14px;padding:12px;margin-top:8px;font-size:13.5px}",
    "#ssai-n .rv b{color:#F2F4F8}#ssai-n .rv small{color:#9AA6B6}#ssai-n .rv div{margin-top:4px;color:#D5DBE5}",
    "#ssai-n .sum{display:flex;align-items:center;gap:10px;margin:4px 0 6px;font-size:14px}#ssai-n .sum b{font-size:26px;color:#F2F4F8}",
    "#ssai-n iframe{width:100%;height:220px;border:0;border-radius:14px;margin-top:6px;background:#0B0D12}",
    "#ssai-n .sep{height:1px;background:#2A303C;margin:22px 0 18px}",
    "#ssai-n #ssai-map{height:300px;border-radius:14px;margin-top:8px;border:1px solid #2A303C;z-index:0}",
    "#ssai-n .row{display:flex;gap:8px;align-items:center;margin-top:10px;font-size:13.5px;color:#D5DBE5}",
    "#ssai-n .row input[type=checkbox]{width:20px;height:20px;accent-color:#F7C04A;flex:none}",
    "#ssai-n .row input[type=text]{flex:1;min-width:0;background:#0B0D12;border:1px solid #2A303C;border-radius:10px;color:#F2F4F8;padding:9px 10px;font-size:14px}",
    "#ssai-n .st{font-size:13.5px;color:#D5DBE5;margin-top:10px;min-height:1em}",
    "#ssai-n .fine{font-size:11.5px;color:#7F8A9A;margin-top:10px}",
    "#ssai-n .leg{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:#9AA6B6;margin-top:8px}#ssai-n .leg span::before{content:'';display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:5px;vertical-align:-1px;background:var(--c)}",
    "#ssai-toast{position:fixed;left:12px;right:12px;bottom:max(14px,env(safe-area-inset-bottom));z-index:99999;max-width:520px;margin:0 auto;background:#151922;color:#F2F4F8;border:1px solid #F7C04A;border-radius:18px;padding:14px 16px;box-shadow:0 12px 40px rgba(0,0,0,.55);font:14px/1.45 system-ui,-apple-system,sans-serif;transform:translateY(160%);transition:transform .35s}",
    "#ssai-toast.on{transform:none}#ssai-toast b{display:block;font-size:16px;margin-bottom:2px}",
    "#ssai-toast .acts{display:flex;gap:8px;margin-top:10px}#ssai-toast a,#ssai-toast button{flex:1;text-align:center;border-radius:12px;padding:10px;font:800 13px system-ui,sans-serif;text-decoration:none;cursor:pointer;border:0}",
    "#ssai-toast a{background:#F7C04A;color:#1a1200}#ssai-toast button{background:#2A303C;color:#F2F4F8}",
    ".ssai-you{width:16px;height:16px;border-radius:50%;background:#1E6BFF;border:3px solid #fff;box-shadow:0 0 0 6px rgba(30,107,255,.25)}",
    ".ssai-pin{font-size:30px;line-height:1;filter:drop-shadow(0 2px 3px rgba(0,0,0,.5))}"
  ].join("");
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  var box = document.createElement("section"); box.id = "ssai-n";
  box.innerHTML =
    '<span class="k">Google reviews</span><h3>Loving it? Tell Google ⭐</h3>' +
    '<p>Takes 30 seconds and helps ' + e(N.name) + ' get found by people nearby. Honest reviews only, good or bad.</p>' +
    '<a class="b gold" href="' + e(writeUrl) + '" target="_blank" rel="noopener">⭐ Write a Google review</a>' +
    '<div id="ssai-rv"></div>' +
    '<div class="sep"></div>' +
    '<span class="k">Who\'s nearby</span><h3>Find us and the crew 📍</h3>' +
    '<p>Turn on location to see how close you are. Players who opt in show up at neighborhood level, never their exact spot.</p>' +
    '<div id="ssai-map"></div>' +
    '<div class="leg"><span style="--c:#F7C04A">' + e(N.name) + '</span><span style="--c:#1E6BFF">You</span><span style="--c:#3DDC97">Players nearby (demo)</span></div>' +
    '<button class="b gold" type="button" id="ssai-loc">📍 Show me on the map</button>' +
    '<label class="row"><input type="checkbox" id="ssai-share"> Let other players see me (approximate, nickname only)</label>' +
    '<label class="row" id="ssai-nickrow" style="display:none"><input type="text" id="ssai-nick" maxlength="16" placeholder="Nickname, e.g. BigMike"></label>' +
    '<div class="st" id="ssai-st"></div>' +
    '<button class="b ghost" type="button" id="ssai-sim">👀 Preview the "you\'re nearby" alert</button>' +
    '<p class="fine">Demo: your location stays on this phone and the green players are samples. Live, alerts reach customers who opted in while they have the page open or through texts they signed up for.</p>';

  var mount = N.mount && document.querySelector(N.mount);
  if (mount) mount.appendChild(box);
  else {
    var ref = document.querySelector("#ssai-k") || document.querySelector("footer");
    ref && ref.parentNode ? ref.parentNode.insertBefore(box, ref) : document.body.appendChild(box);
  }

  /* ---------- reviews ---------- */
  var RV = box.querySelector("#ssai-rv");
  function stars(n) { n = Math.round(n || 0); return "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n); }
  function embedCard() {
    RV.innerHTML = '<iframe loading="lazy" title="' + e(N.name) + ' on Google Maps" referrerpolicy="no-referrer-when-downgrade" src="https://maps.google.com/maps?q=' +
      q(N.name + " " + (main.q || "")) + '&z=15&output=embed"></iframe>' +
      '<a class="b ghost" href="' + e(listing) + '" target="_blank" rel="noopener">Read all reviews on Google →</a>';
  }
  if (N.mapsKey && N.placeId) {
    window.__ssaiPlaces = function () {
      google.maps.importLibrary("places").then(function (lib) {
        var pl = new lib.Place({ id: N.placeId });
        return pl.fetchFields({ fields: ["rating", "userRatingCount", "reviews", "googleMapsURI"] }).then(function () {
          var list = (pl.reviews || []).slice(0, 3);
          RV.innerHTML = '<div class="sum"><b>' + (pl.rating || "–") + '</b><span class="stars">' + stars(pl.rating) + '</span><small style="color:#9AA6B6">' + (pl.userRatingCount || 0) + ' Google reviews</small></div>' +
            list.map(function (r) {
              return '<div class="rv"><b>' + e(r.authorAttribution && r.authorAttribution.displayName) + '</b> <span class="stars">' + stars(r.rating) + '</span><br><small>' +
                e(r.relativePublishTimeDescription) + '</small><div>' + e((r.text || "").slice(0, 260)) + ((r.text || "").length > 260 ? "…" : "") + '</div></div>';
            }).join("") +
            '<a class="b ghost" href="' + e(pl.googleMapsURI || listing) + '" target="_blank" rel="noopener">Read all reviews on Google →</a><p class="fine">Reviews from Google</p>';
        });
      }).catch(embedCard);
    };
    var gs = document.createElement("script"); gs.async = true; gs.onerror = embedCard;
    gs.src = "https://maps.googleapis.com/maps/api/js?key=" + encodeURIComponent(N.mapsKey) + "&v=weekly&loading=async&callback=__ssaiPlaces";
    document.head.appendChild(gs);
  } else embedCard();

  /* ---------- map ---------- */
  var map, youMark, meCircle, fired = false, watchId = null;
  var ST = box.querySelector("#ssai-st");
  function miles(a, b) {
    var R = 3958.8, r = Math.PI / 180, dl = (b.lat - a.lat) * r, dg = (b.lng - a.lng) * r;
    var h = Math.sin(dl / 2) * Math.sin(dl / 2) + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dg / 2) * Math.sin(dg / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function nearest(p) {
    var best = null; N.spots.forEach(function (s) { var d = miles(p, s); if (!best || d < best.d) best = { s: s, d: d }; }); return best;
  }
  function dirUrl(s) { return "https://www.google.com/maps/dir/?api=1&destination=" + s.lat + "," + s.lng; }
  function loadCss(h) { var l = document.createElement("link"); l.rel = "stylesheet"; l.href = h; document.head.appendChild(l); }
  loadCss("https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css");
  var ls = document.createElement("script"); ls.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"; ls.onload = initMap; document.head.appendChild(ls);

  // seeded so the demo players sit in the same places every load
  var seed = 7; function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  var NICKS = N.players || ["BigMike", "K.Ramirez", "J.Lee", "Tasha_B", "DreW", "Lilo", "CompTon10", "Nay Nay", "Smokey", "Jojo"];

  function initMap() {
    var L = window.L;
    map = L.map("ssai-map", { scrollWheelZoom: false, attributionControl: true }).setView([main.lat, main.lng], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(map);
    var pts = [];
    N.spots.forEach(function (s) {
      L.marker([s.lat, s.lng], { icon: L.divIcon({ className: "", html: '<div class="ssai-pin">' + (N.pin || "📍") + "</div>", iconSize: [30, 30], iconAnchor: [15, 28] }) })
        .addTo(map).bindPopup("<b>" + e(N.name) + "</b><br>" + e(s.label || "") + (N.approx ? "<br><i>pin approximate until launch</i>" : "") + '<br><a href="' + dirUrl(s) + '" target="_blank" rel="noopener">Directions</a>');
      pts.push([s.lat, s.lng]);
      for (var i = 0; i < Math.ceil(9 / N.spots.length); i++) {
        var ang = rnd() * Math.PI * 2, dist = 0.3 + rnd() * 2.6, dLat = dist / 69 * Math.cos(ang), dLng = dist / (69 * Math.cos(s.lat * Math.PI / 180)) * Math.sin(ang);
        L.circle([s.lat + dLat, s.lng + dLng], { radius: 420, color: "#3DDC97", weight: 1, fillColor: "#3DDC97", fillOpacity: .28 })
          .addTo(map).bindTooltip(NICKS[(i + pts.length * 3) % NICKS.length] + " · " + (Math.round(dist * 10) / 10) + " mi away");
      }
    });
    if (pts.length > 1) map.fitBounds(pts, { padding: [40, 40] });
  }

  function place(p, simulated) {
    if (!map) return;
    var L = window.L, n = nearest(p);
    if (!youMark) youMark = L.marker([p.lat, p.lng], { icon: L.divIcon({ className: "", html: '<div class="ssai-you"></div>', iconSize: [16, 16], iconAnchor: [8, 8] }) }).addTo(map);
    else youMark.setLatLng([p.lat, p.lng]);
    if (meCircle) { map.removeLayer(meCircle); meCircle = null; }
    if (box.querySelector("#ssai-share").checked) {
      meCircle = L.circle([p.lat, p.lng], { radius: 420, color: "#1E6BFF", weight: 1, fillOpacity: .15 }).addTo(map)
        .bindTooltip((box.querySelector("#ssai-nick").value.trim() || "You") + " (what others see)");
    }
    map.fitBounds([[p.lat, p.lng], [n.s.lat, n.s.lng]], { padding: [50, 50], maxZoom: 15 });
    var d = Math.round(n.d * 10) / 10;
    if (n.d <= 0.1) ST.innerHTML = "🎉 You're here! Scan the table QR to start earning stars.";
    else if (n.d <= RADIUS) { ST.innerHTML = "You're <b>" + d + " mi</b> from " + e(N.name) + (n.s.label ? " " + e(n.s.label) : "") + "."; nudge(n, simulated); }
    else ST.innerHTML = "You're <b>" + d + " mi</b> away. Within " + RADIUS + " miles we'll give you a heads-up. <a style='color:#F7C04A' href='" + dirUrl(n.s) + "' target='_blank' rel='noopener'>Directions →</a>";
  }

  function nudge(n, simulated) {
    if (fired && !simulated) return; fired = true;
    var d = Math.round(n.d * 10) / 10, title = "👋 You're " + d + " mi from " + N.name + "!", body = "Won't you stop by? " + OFFER;
    var t = document.getElementById("ssai-toast");
    if (!t) { t = document.createElement("div"); t.id = "ssai-toast"; document.body.appendChild(t); }
    t.innerHTML = "<b>" + e(title) + "</b>" + e(body) + '<div class="acts"><a href="' + dirUrl(n.s) + '" target="_blank" rel="noopener">Directions</a><button type="button">Later</button></div>';
    t.querySelector("button").onclick = function () { t.classList.remove("on"); };
    requestAnimationFrame(function () { t.classList.add("on"); });
    if (!simulated && "Notification" in window && Notification.permission === "granted") {
      try { new Notification(title, { body: body }); } catch (x) { /* Android Chrome needs a service worker; the toast covers it */ }
    }
  }

  box.querySelector("#ssai-loc").onclick = function () {
    if (!navigator.geolocation) { ST.textContent = "This browser can't share location."; return; }
    ST.textContent = "Finding you…";
    if ("Notification" in window && Notification.permission === "default") { try { Notification.requestPermission(); } catch (x) {} }
    var ok = function (pos) { place({ lat: pos.coords.latitude, lng: pos.coords.longitude }); };
    var bad = function () { ST.textContent = "Location is off. You can turn it on in your browser settings anytime."; };
    navigator.geolocation.getCurrentPosition(ok, bad, { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 });
    if (watchId === null) watchId = navigator.geolocation.watchPosition(ok, function () {}, { maximumAge: 120000 });
  };
  box.querySelector("#ssai-share").onchange = function () {
    box.querySelector("#ssai-nickrow").style.display = this.checked ? "flex" : "none";
    if (youMark) { var ll = youMark.getLatLng(); place({ lat: ll.lat, lng: ll.lng }); }
  };
  box.querySelector("#ssai-sim").onclick = function () {
    // drop "you" 1.3 mi north-east of the main spot, as if a customer opened the page nearby
    var p = { lat: main.lat + 1.3 / 69 * 0.7, lng: main.lng + 1.3 / (69 * Math.cos(main.lat * Math.PI / 180)) * 0.7 };
    place(p, true);
  };
})();
