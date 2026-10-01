// Cache the app shell so the page opens at the airport before a SIM is working.
const CACHE = 'bkk-landing-v23';
const SHELL = ['./', 'index.html', 'styles.css', 'app.js', 'data.js', 'docs.js', 'thai.js', 'scan.js', 'map.js', 'food.js', 'errands.js', 'money.js', 'visatimer.js', 'places.js', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network first for our own files (so updates show), cache fallback when offline.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('index.html')))
  );
});
