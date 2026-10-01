// 🗺 Map: apartments (Zillow-style cards + price filter), restaurants, chains and errand spots.
// Data comes from places.js (window.PLACES). Leaflet + CARTO dark tiles load from CDN.
(function () {
  const P = window.PLACES;
  if (!P) return;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const gmaps = (lat, lng, name) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name ? name : lat + ',' + lng)}`;

  const LAYERS = [
    { id: 'apt', label: '🏢 Apartments', color: '#ffd23f' },
    { id: 'food', label: '🍔 Food', color: '#ff4d5e' },
    { id: 'chain', label: '🇺🇸 US chains', color: '#ff8a3d' },
    { id: 'shop', label: '🛒 Groceries', color: '#3ddc97' },
    { id: 'tech', label: '💻 Electronics', color: '#4da3ff' },
    { id: 'health', label: '🏥 Health', color: '#c084fc' }
  ];

  const sec = document.createElement('section');
  sec.id = 'map';
  sec.innerHTML = `
    <div class="sec-head"><h2>🗺 Map</h2><span class="checked">Last checked ${esc(P.checked)}</span></div>
    <div class="card area-search">
      <label for="area-q" class="muted small">🔎 Find apartments in an area (neighborhood, BTS/MRT station, soi or road)</label>
      <div class="area-row">
        <input id="area-q" list="area-list" placeholder="e.g. Thong Lo, Ari, Asok, Sukhumvit 71" autocomplete="off" enterkeyhint="search">
        <select id="area-r" aria-label="Distance"><option value="1000">1 km</option><option value="2000" selected>2 km</option><option value="3000">3 km</option><option value="5000">5 km</option></select>
      </div>
      <datalist id="area-list"></datalist>
      <div class="row"><button type="button" class="btn primary" id="area-go">Show apartments there</button><button type="button" class="btn" id="area-clear" hidden>✕ Clear area</button></div>
      <p class="muted small" id="area-status"></p>
      <a class="btn" id="area-more" hidden target="_blank" rel="noopener">🏢 More rentals in this area (Google Maps)</a>
    </div>
    <div class="chips map-layers">${LAYERS.map(l => `<button type="button" class="layer on" data-l="${l.id}" style="--c:${l.color}">${l.label}</button>`).join('')}</div>
    <div id="leaflet" class="leaflet-box"><div class="muted small" style="padding:16px">Loading map… (needs internet)</div></div>
    <h3>Apartments by price</h3>
    <div class="card">
      <div class="range-head"><span class="muted small">Price range / month</span><b id="apt-range-label"></b></div>
      <div class="dual-range">
        <div class="dual-track"><div class="dual-fill" id="apt-fill"></div></div>
        <input type="range" id="apt-min" min="100" max="1000" step="25" value="250" aria-label="Minimum rent">
        <input type="range" id="apt-max" min="100" max="1000" step="25" value="600" aria-label="Maximum rent">
      </div>
      <div class="range-ends muted small"><span>$100</span><span id="apt-count"></span><span>$1,000</span></div>
      <div class="row" style="margin-top:6px">
        <button type="button" class="btn primary" id="apt-under350">🎯 Under $350/mo</button>
        <button type="button" class="btn" data-sort="price">Sort: cheapest</button>
        <button type="button" class="btn" data-sort="month">1-month OK first</button>
        <button type="button" class="btn" data-sort="net">📶 Best internet first</button>
      </div>
    </div>
    ${P.internetNotes && P.internetNotes.length ? `<details class="card"><summary>📶 Streaming internet in Bangkok: what to know</summary><ul>${P.internetNotes.map(n => `<li>${esc(n)}</li>`).join('')}</ul></details>` : ''}
    <div id="apt-list" class="apt-list"></div>
    ${P.aptUnverified && P.aptUnverified.length ? `<div class="note"><strong>Couldn't confirm:</strong><ul>${P.aptUnverified.map(u => `<li>${esc(u)}</li>`).join('')}</ul></div>` : ''}
    <p class="muted small">Prices as listed on ${esc(P.checked)} (1 USD ≈ ${esc(P.fx)} THB). Never pay before a viewing or live video walkthrough.</p>`;
  const app = document.getElementById('app');
  const stay = document.getElementById('stay');
  app.insertBefore(sec, stay || null);

  // ---------- Apartment cards ----------
  const apts = (P.apartments || []).filter(a => a.lat && a.lng);
  let sortBy = 'price';
  // Area search: { name, lat, lng } or null. Radius in meters.
  let area = null;
  const areaRadius = () => +document.getElementById('area-r').value;
  const usdMin = a => Math.round((a.price_thb_min || a.price_thb_max) / P.fx);
  const usdMax = a => Math.round((a.price_thb_max || a.price_thb_min) / P.fx);
  const monthOk = a => /1[\s-]*(mo|month)|monthly|1 month/i.test(a.min_contract || '');

  // Straight-line distance in meters; walking time assumes ~75 m per minute.
  function meters(a, b) {
    const R = 6371000, rad = x => x * Math.PI / 180;
    const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  const NEAR_ICON = { food: '🍔', chain: '🇺🇸', shop: '🛒', tech: '💻', health: '🏥' };
  function nearby(a) {
    return (P.points || [])
      .filter(p => p.lat && p.lng && NEAR_ICON[p.layer])
      .map(p => ({ p, d: meters(a, p) }))
      .filter(x => x.d <= 1500)
      .sort((x, y) => x.d - y.d)
      .slice(0, 8);
  }
  const NET_BADGE = {
    great: ['🟢 Great for streaming', 'best'],
    good: ['🟢 Good', 'best'],
    risky: ['🟠 Risky for streaming', 'warn'],
    unknown: ['⚪ Not stated, so ask', '']
  };
  function internet(a) {
    const [label, cls] = NET_BADGE[a.net_score] || NET_BADGE.unknown;
    const own = a.can_install_own === true ? 'Yes' : a.can_install_own === false ? 'No' : 'Ask';
    return `<div class="net-box">
      <div class="net-head"><b>📶 Internet</b><span class="tag ${cls}">${label}</span></div>
      <dl class="facts">
        <dt>Type</dt><dd>${esc(a.net_type || 'Unknown')}</dd>
        <dt>Provider</dt><dd>${esc(a.net_provider || 'Not stated')}</dd>
        <dt>Speed</dt><dd>${esc(a.net_speed || 'Not stated. Ask for a speed test showing upload.')}</dd>
        <dt>Cost</dt><dd>${esc(a.net_cost || 'Ask')}</dd>
        <dt>Own line?</dt><dd>${own}</dd>
      </dl>
      ${a.net_evidence ? `<p class="muted small">${esc(a.net_evidence)}</p>` : (a.internet ? `<p class="muted small">Listing says: ${esc(a.internet)}</p>` : '')}
    </div>`;
  }
  function nearbyBlock(a) {
    const list = nearby(a);
    const gm = `https://www.google.com/maps/search/restaurants/@${a.lat},${a.lng},16z`;
    return `<details class="near"><summary>🍔 What's nearby (${list.length} within 1.5 km)</summary>
      ${list.length ? `<ul class="near-list">${list.map(({ p, d }) => `<li><a href="${esc(p.maps || gmaps(p.lat, p.lng, p.name))}" target="_blank" rel="noopener">${NEAR_ICON[p.layer]} ${esc(p.name)}</a><span>${d < 1000 ? Math.round(d / 10) * 10 + ' m' : (d / 1000).toFixed(1) + ' km'} · ${Math.max(1, Math.round(d / 75))} min walk</span></li>`).join('')}</ul>` : '<p class="muted small">None of our saved spots are within 1.5 km.</p>'}
      <div class="row"><a class="btn" href="${gm}" target="_blank" rel="noopener">All restaurants nearby (Google Maps)</a></div>
    </details>`;
  }

  function card(a) {
    const photos = (a.photos || []).filter(Boolean);
    const lo = usdMin(a), hi = usdMax(a);
    return `<div class="card apt" data-id="${esc(a.id)}">
      <div class="apt-photos">${photos.length
        ? photos.map(u => `<img src="${esc(u)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">`).join('')
        : '<div class="noimg">No photo</div>'}</div>
      <div class="price">$${lo}${hi !== lo ? '–' + hi : ''} <small>/mo · ฿${(a.price_thb_min || 0).toLocaleString()}${a.price_thb_max && a.price_thb_max !== a.price_thb_min ? '–' + a.price_thb_max.toLocaleString() : ''}</small></div>
      <h4>${esc(a.name)}</h4>
      ${area ? `<p class="dist-tag">📍 ${(meters(area, a) / 1000).toFixed(1)} km from ${esc(area.name)}</p>` : ''}
      <p class="muted small">${esc(a.room || '')}${a.sqm ? ' · ' + esc(a.sqm) + ' m²' : ''} · ${esc(a.station || a.area || '')}</p>
      <dl class="facts">
        <dt>Contract</dt><dd>${esc(a.min_contract || 'Ask')}${monthOk(a) ? ' <span class="tag best">1-month OK</span>' : ''}</dd>
        <dt>Deposit</dt><dd>${esc(a.deposit || 'Ask')}</dd>
        <dt>Electric</dt><dd>${esc(a.electric || 'Ask')}</dd>
      </dl>
      ${internet(a)}
      ${nearbyBlock(a)}
      ${(a.flags || []).map(f => `<p class="flag">${esc(f)}</p>`).join('')}
      <div class="row">
        ${a.url ? `<a class="btn primary" href="${esc(a.url)}" target="_blank" rel="noopener">See listing</a>` : ''}
        <button type="button" class="btn show-on-map">📍 On map</button>
        ${a.phone ? `<a class="btn" href="tel:${esc(String(a.phone).replace(/[^\d+]/g, ''))}">📞 Call</a>` : ''}
      </div>
    </div>`;
  }
  function range() {
    const a = +document.getElementById('apt-min').value, b = +document.getElementById('apt-max').value;
    return [Math.min(a, b), Math.max(a, b)];
  }
  // Show a listing when its price range overlaps the chosen range.
  const inRange = (a, lo, hi) => usdMin(a) <= hi && usdMax(a) >= lo;
  function renderList() {
    const [lo, hi] = range();
    document.getElementById('apt-range-label').textContent = `$${lo} – $${hi}`;
    const pct = v => ((v - 100) / 900) * 100;
    const fill = document.getElementById('apt-fill');
    fill.style.left = pct(lo) + '%'; fill.style.width = (pct(hi) - pct(lo)) + '%';
    let list = apts.filter(a => inRange(a, lo, hi) && (!area || meters(area, a) <= areaRadius()));
    document.getElementById('apt-count').textContent = `${list.length} places${area ? ' near ' + area.name : ''}`;
    const NET_RANK = { great: 0, good: 1, unknown: 2, risky: 3 };
    const netRank = a => NET_RANK[a.net_score] ?? 2;
    list.sort((a, b) =>
      area && sortBy === 'price' ? meters(area, a) - meters(area, b) :
      sortBy === 'month' ? (monthOk(b) - monthOk(a)) || (usdMin(a) - usdMin(b)) :
      sortBy === 'net' ? (netRank(a) - netRank(b)) || (usdMin(a) - usdMin(b)) :
      usdMin(a) - usdMin(b));
    document.getElementById('apt-list').innerHTML = list.length ? list.map(card).join('') : (area ? `<p class="muted">No apartments within ${areaRadius() / 1000} km of ${esc(area.name)} in this price range. Try a bigger distance or widen the price.</p>` : '<p class="muted">Nothing in that range. Widen it.</p>');
    document.querySelectorAll('.apt .show-on-map').forEach(b => b.addEventListener('click', () => {
      const a = apts.find(x => x.id === b.closest('.apt').dataset.id);
      focus('apt', a);
    }));
    updateMarkers();
  }
  ['apt-min', 'apt-max'].forEach(id => document.getElementById(id).addEventListener('input', renderList));
  // One tap: every place whose cheapest room is $350/mo or less, all across the map.
  document.getElementById('apt-under350').addEventListener('click', () => {
    document.getElementById('apt-min').value = 100;
    document.getElementById('apt-max').value = 350;
    sortBy = 'price';
    renderList();
    document.getElementById('apt-list').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  sec.querySelectorAll('[data-sort]').forEach(b => b.addEventListener('click', () => { sortBy = b.dataset.sort; renderList(); }));

  // ---------- Area search ----------
  const COMMON = ['On Nut', 'Phra Khanong', 'Bang Chak', 'Punnawithi', 'Udom Suk', 'Bang Na', 'Ekkamai', 'Thong Lo', 'Phrom Phong',
    'Asok', 'Nana', 'Ploenchit', 'Chit Lom', 'Siam', 'Silom', 'Sathorn', 'Ari', 'Saphan Khwai', 'Victory Monument', 'Phaya Thai',
    'Ratchathewi', 'Ratchada', 'Huai Khwang', 'Sutthisan', 'Rama 9', 'Thailand Cultural Centre', 'Lat Phrao', 'Chatuchak',
    'Mo Chit', 'Ramkhamhaeng', 'Bang Kapi', 'Wutthakat', 'Talat Phlu', 'Wongwian Yai', 'Khlong Toei', 'Sukhumvit 71', 'Sukhumvit 77'];
  const known = new Set(COMMON);
  apts.forEach(a => [a.area, a.station].forEach(v => { if (v) known.add(String(v).split(/[·,(]/)[0].replace(/^(BTS|MRT|ARL)\s+/i, '').trim()); }));
  document.getElementById('area-list').innerHTML = [...known].filter(Boolean).sort().map(n => `<option value="${esc(n)}">`).join('');

  const status = t => { document.getElementById('area-status').textContent = t || ''; };
  const norm = t => String(t || '').toLowerCase().replace(/[^a-z0-9ก-๙]+/g, ' ').trim();
  async function geocode(q) {
    // Bangkok-only search on OpenStreetMap's free geocoder.
    const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=th&bounded=1' +
      '&viewbox=100.30,13.98,100.95,13.48&q=' + encodeURIComponent(q + ', Bangkok');
    const r = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    const j = await r.json();
    return j && j[0] ? { lat: +j[0].lat, lng: +j[0].lon } : null;
  }
  async function findArea() {
    const q = document.getElementById('area-q').value.trim();
    if (!q) return;
    document.getElementById('area-q').blur();
    status('Finding ' + q + '…');
    // Listings whose area/station/name mention it (works offline).
    const words = norm(q);
    const hits = apts.filter(a => norm([a.area, a.station, a.name].join(' ')).includes(words));
    let center = null;
    try { center = await geocode(q); } catch (e) { /* offline: fall back to the listing matches */ }
    if (!center && hits.length) {
      center = { lat: hits.reduce((s, a) => s + a.lat, 0) / hits.length, lng: hits.reduce((s, a) => s + a.lng, 0) / hits.length };
    }
    if (!center) { status(`Couldn't find "${q}" in Bangkok. Check the spelling or try the nearest BTS/MRT station.`); return; }
    area = { name: q, ...center };
    document.getElementById('area-clear').hidden = false;
    const more = document.getElementById('area-more');
    more.href = 'https://www.google.com/maps/search/' + encodeURIComponent('apartment for rent near ' + q + ' Bangkok') + '/@' + area.lat + ',' + area.lng + ',15z';
    more.hidden = false;
    sortBy = 'price';
    renderList();
    const n = document.querySelectorAll('#apt-list .apt').length;
    status(n ? `Showing ${n} apartment${n > 1 ? 's' : ''} within ${areaRadius() / 1000} km of ${q}, closest first.` : `No saved apartments within ${areaRadius() / 1000} km of ${q}. Try 3–5 km.`);
    showAreaOnMap();
    document.getElementById('leaflet').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  let areaCircle = null;
  function showAreaOnMap(tries = 0) {
    // Map may still be loading; start it and retry for up to ~15 s.
    if (!map) { initMap(); if (tries < 30) setTimeout(() => showAreaOnMap(tries + 1), 500); return; }
    if (areaCircle) { map.removeLayer(areaCircle); areaCircle = null; }
    if (!area) return;
    areaCircle = L.circle([area.lat, area.lng], { radius: areaRadius(), color: '#ffd23f', weight: 2, fillOpacity: 0.08 }).addTo(map);
    map.fitBounds(areaCircle.getBounds(), { padding: [10, 10] });
  }
  document.getElementById('area-go').addEventListener('click', findArea);
  document.getElementById('area-q').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); findArea(); } });
  document.getElementById('area-r').addEventListener('change', () => { if (area) { renderList(); showAreaOnMap(); } });
  document.getElementById('area-clear').addEventListener('click', () => {
    area = null; document.getElementById('area-q').value = ''; document.getElementById('area-clear').hidden = true; document.getElementById('area-more').hidden = true;
    status(''); renderList(); showAreaOnMap();
  });

  // ---------- Leaflet map ----------
  let map = null;
  const groups = {};
  const markerById = {};
  // Try jsDelivr, then cdnjs, in case one is slow or blocked on the network.
  const LEAFLET = [
    ['https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css', 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js'],
    ['https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css', 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js']
  ];
  function tryLoad([cssUrl, jsUrl]) {
    return new Promise((res, rej) => {
      const css = document.createElement('link');
      css.rel = 'stylesheet'; css.href = cssUrl;
      document.head.appendChild(css);
      const s = document.createElement('script');
      const timer = setTimeout(() => rej(new Error('timeout')), 12000);
      s.src = jsUrl;
      s.onload = () => { clearTimeout(timer); res(); };
      s.onerror = () => { clearTimeout(timer); rej(new Error('failed')); };
      document.head.appendChild(s);
    });
  }
  let leafletLoading = null;
  function loadLeaflet() {
    if (window.L) return Promise.resolve();
    if (!leafletLoading) {
      leafletLoading = tryLoad(LEAFLET[0]).catch(() => window.L ? null : tryLoad(LEAFLET[1]));
    }
    return leafletLoading;
  }
  function pin(color) {
    return L.divIcon({ className: '', html: `<span class="pin" style="background:${color}"></span>`, iconSize: [18, 18], iconAnchor: [9, 9] });
  }
  function popup(kind, x) {
    if (kind === 'apt') {
      const img = (x.photos || [])[0];
      return `${img ? `<img src="${esc(img)}" class="pop-img" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}
        <b>${esc(x.name)}</b><br>$${usdMin(x)}${usdMax(x) !== usdMin(x) ? '–' + usdMax(x) : ''}/mo · ${esc(x.station || '')}<br>
        📶 ${esc((NET_BADGE[x.net_score] || NET_BADGE.unknown)[0])}${x.net_speed ? ' · ' + esc(x.net_speed) : ''}<br>
        ${x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener">Listing</a> · ` : ''}<a href="${gmaps(x.lat, x.lng, x.name + ' Bangkok')}" target="_blank" rel="noopener">Google Maps</a>`;
    }
    return `${x.photo ? `<img src="${esc(x.photo)}" class="pop-img" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}
      <b>${esc(x.name)}</b>${x.sub ? `<br>${esc(x.sub)}` : ''}${x.hours ? `<br>🕒 ${esc(x.hours)}` : ''}<br>
      <a href="${esc(x.maps || gmaps(x.lat, x.lng, x.name))}" target="_blank" rel="noopener">Directions</a>`;
  }
  function updateMarkers() {
    if (!map) return;
    const [lo, hi] = range();
    apts.forEach(a => {
      const m = markerById['apt:' + a.id];
      if (!m) return;
      const show = inRange(a, lo, hi) && (!area || meters(area, a) <= areaRadius());
      if (show && !groups.apt.hasLayer(m)) groups.apt.addLayer(m);
      if (!show && groups.apt.hasLayer(m)) groups.apt.removeLayer(m);
    });
  }
  function focus(kind, x) {
    if (!map || !x) return;
    document.getElementById('leaflet').scrollIntoView({ behavior: 'smooth', block: 'center' });
    map.setView([x.lat, x.lng], 16);
    const m = markerById[kind + ':' + (x.id || x.name)];
    if (m) m.openPopup();
  }
  window.__mapFocus = (kind, x) => focus(kind, x);

  let started = false;
  async function initMap() {
    if (started) return;
    try { await loadLeaflet(); } catch (e) {
      document.getElementById('leaflet').innerHTML = '<div class="muted small" style="padding:16px">Map couldn\'t load. Check your connection and reopen the app.</div>';
      return;
    }
    if (started) return;
    started = true;
    document.getElementById('leaflet').innerHTML = '';
    map = L.map('leaflet', { zoomControl: true }).setView([13.7106, 100.5998], 13); // BTS On Nut
    // CARTO dark tiles: English/international labels (plain OSM tiles label Bangkok in Thai).
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO', subdomains: 'abcd', maxZoom: 19
    }).addTo(map);
    LAYERS.forEach(l => { groups[l.id] = L.layerGroup().addTo(map); });
    const color = id => LAYERS.find(l => l.id === id).color;
    apts.forEach(a => {
      markerById['apt:' + a.id] = L.marker([a.lat, a.lng], { icon: pin(color('apt')) }).bindPopup(popup('apt', a), { maxWidth: 240 }).addTo(groups.apt);
    });
    (P.points || []).forEach(p => {
      if (!p.lat || !p.lng || !groups[p.layer]) return;
      markerById[p.layer + ':' + (p.id || p.name)] = L.marker([p.lat, p.lng], { icon: pin(color(p.layer)) }).bindPopup(popup(p.layer, p), { maxWidth: 240 }).addTo(groups[p.layer]);
    });
    updateMarkers();
    // "You are here" when the phone allows it
    if (navigator.geolocation) navigator.geolocation.getCurrentPosition(pos => {
      L.circleMarker([pos.coords.latitude, pos.coords.longitude], { radius: 7, color: '#fff', fillColor: '#4da3ff', fillOpacity: 1 }).addTo(map).bindPopup('You');
    }, () => {}, { timeout: 8000 });
  }
  sec.querySelectorAll('.layer').forEach(b => b.addEventListener('click', () => {
    b.classList.toggle('on');
    const g = groups[b.dataset.l];
    if (!map || !g) return;
    b.classList.contains('on') ? g.addTo(map) : map.removeLayer(g);
  }));

  renderList();
  // Only load the map library when the section gets near the screen.
  const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); initMap(); } }, { rootMargin: '400px' });
  io.observe(sec);
  // Start downloading the map library shortly after the page opens so it's ready.
  setTimeout(() => loadLeaflet().catch(() => {}), 1500);
})();
