/* Christian HQ: caches only the app shell (page, icons, scripts) so it opens fast. Customer data is NEVER cached:
   it comes from the backend after login and lives only in memory while the app is open. */
var C = "christian-hq-v8", SHELL = ["./", "index.html", "mock.js", "squares-hq.js", "../../demo/christian-live.js", "../../demo/listen.js", "../../demo/melody-lax/menu-data.js", "icon-192.png", "icon-512.png", "manifest.webmanifest"];
self.addEventListener("install", function (e) { e.waitUntil(caches.open(C).then(function (c) { return c.addAll(SHELL); }).catch(function () {})); self.skipWaiting(); });
self.addEventListener("activate", function (e) { e.waitUntil(caches.keys().then(function (k) { return Promise.all(k.filter(function (x) { return x !== C; }).map(function (x) { return caches.delete(x); })); })); self.clients.claim(); });
self.addEventListener("fetch", function (e) {
  var u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;   // backend calls are never touched
  e.respondWith(fetch(e.request).then(function (r) { var cp = r.clone(); caches.open(C).then(function (c) { c.put(e.request, cp); }); return r; }).catch(function () { return caches.match(e.request); }));
});
