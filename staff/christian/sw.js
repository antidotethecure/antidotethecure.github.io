/* Staff app: works offline after the first visit (training pages + pictures). No customer data exists in this app. */
var C = "christian-staff-v3", SHELL = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "../../demo/christian-live.js?v=lb2",
  "../../demo/melody-lax/img/logo.png", "../../demo/nalu-vida/img/logo.png"].concat(["join", "card", "visit", "ladder", "confirm", "pass", "expired", "onereward", "eb-fixed", "eb-active", "eb-pass", "eb-wheel", "eb-raffle"].reduce(function (a, s) { return a.concat(["img/m-" + s + ".jpg", "img/n-" + s + ".jpg"]); }, []));
self.addEventListener("install", function (e) { e.waitUntil(caches.open(C).then(function (c) { return c.addAll(SHELL); }).catch(function () {})); self.skipWaiting(); });
self.addEventListener("activate", function (e) { e.waitUntil(caches.keys().then(function (k) { return Promise.all(k.filter(function (x) { return x !== C; }).map(function (x) { return caches.delete(x); })); })); self.clients.claim(); });
self.addEventListener("fetch", function (e) {
  var u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(function (r) { var cp = r.clone(); caches.open(C).then(function (c) { c.put(e.request, cp); }); return r; }).catch(function () { return caches.match(e.request); }));
});
