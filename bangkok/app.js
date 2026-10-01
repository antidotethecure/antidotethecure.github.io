(function () {
  const D = window.DATA;
  const $app = document.getElementById('app');

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const tel = n => 'tel:' + String(n).replace(/[^\d+]/g, '');
  const mapsBtn = url => url ? `<a class="btn" href="${esc(url)}" target="_blank" rel="noopener">📍 Map</a>` : '';
  const callBtn = n => n ? `<a class="btn" href="${tel(n)}">📞 ${esc(n)}</a>` : '';
  const linkBtn = (url, label, cls = '') => url ? `<a class="btn ${cls}" href="${esc(url)}" target="_blank" rel="noopener">${label}</a>` : '';
  const flags = arr => (arr || []).filter(Boolean).map(f => `<p class="flag">${esc(f)}</p>`).join('');
  const tag = t => t ? `<span class="tag ${t.cls || ''}">${esc(t.text || t)}</span>` : '';
  const head = (id, title, checked) =>
    `<div class="sec-head"><h2>${title}</h2><span class="checked">Last checked ${esc(checked)}</span></div>`;
  const sources = list => list && list.length
    ? `<details><summary>Sources (${list.length})</summary><div class="sources">${list.map(u => `<div><a href="${esc(u)}" target="_blank" rel="noopener">${esc(u)}</a></div>`).join('')}</div></details>`
    : '';
  const unverified = list => list && list.length
    ? `<div class="note"><strong>Couldn't confirm:</strong><ul>${list.map(u => `<li>${esc(u)}</li>`).join('')}</ul></div>`
    : '';
  const itemCard = i => `
    <div class="card">
      ${tag(i.tag)}
      <h4>${esc(i.title)}</h4>
      ${i.cost ? `<div class="price">${esc(i.cost)}</div>` : ''}
      ${i.body ? `<p>${i.body}</p>` : ''}
      ${flags([i.flag])}
      ${i.link ? `<div class="row">${linkBtn(i.link, i.linkLabel || 'Open')}</div>` : ''}
    </div>`;

  // Checklist state is a per-device convenience only.
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  // ---------- 1. Flight ----------
  function flight() {
    const f = D.flight;
    const legs = f.legs.map((l, idx) => `
      <div class="card">
        <span class="tag best">${esc(l.flight)}</span><span class="tag">${esc(l.date)}</span>
        <div class="leg" style="margin-top:10px">
          <div><div class="code">${esc(l.from)}</div><div class="time">${esc(l.dep)}</div><div class="muted small">${esc(l.fromCity)}</div></div>
          <div class="mid">✈️<br>${esc(l.duration || '')}</div>
          <div class="end"><div class="code">${esc(l.to)}</div><div class="time">${esc(l.arr)}</div><div class="muted small">${esc(l.toCity)}</div></div>
        </div>
      </div>
      ${idx === 0 ? `<p class="layover">⏱ ${esc(f.layover)}</p>` : ''}`).join('');
    return `<section id="flight">
      ${head('flight', '✈️ My Flight', f.checked)}
      <div class="card">
        <p class="muted" id="cd-label" style="margin-top:0">Be at LAX in</p>
        <div class="countdown" id="countdown">
          <div><b id="cd-d">–</b><span>days</span></div>
          <div><b id="cd-h">–</b><span>hrs</span></div>
          <div><b id="cd-m">–</b><span>min</span></div>
          <div><b id="cd-s">–</b><span>sec</span></div>
        </div>
        <p style="margin:0 0 6px">${f.airportPlan}</p>
        <p class="muted small" style="margin:0">${esc(f.airline)}</p>
      </div>
      ${legs}
      ${f.notes.map(n => `<div class="note">${n}</div>`).join('')}
      <div class="row">${linkBtn(f.manageUrl, 'Manage booking')}${linkBtn(f.statusUrl, 'Flight status')}</div>
    </section>`;
  }

  function startCountdown() {
    const F = D.flight;
    // Phases: get to LAX → check-in closes → departure → landing → landed.
    const phases = [
      { at: Date.parse(F.beAtLaxISO), label: 'Be at LAX Terminal B (9:25 AM) in' },
      { at: Date.parse(F.checkinClosesISO), label: '⚠ PAL check-in closes (11:25 AM) in' },
      { at: Date.parse(F.departISO), label: 'PR113 departs (12:25 PM) in' },
      { at: Date.parse(F.arriveISO), label: 'In the air. Landing at BKK in' }
    ];
    const set = (id, v) => { document.getElementById(id).textContent = v; };
    function tick() {
      const now = Date.now();
      const label = document.getElementById('cd-label');
      const next = phases.find(p => now < p.at);
      if (!next) { label.textContent = '🇹🇭 You\'ve landed. Welcome to Bangkok.'; document.getElementById('countdown').style.display = 'none'; return; }
      label.textContent = next.label;
      let s = Math.max(0, Math.floor((next.at - now) / 1000));
      set('cd-d', Math.floor(s / 86400)); s %= 86400;
      set('cd-h', String(Math.floor(s / 3600)).padStart(2, '0')); s %= 3600;
      set('cd-m', String(Math.floor(s / 60)).padStart(2, '0'));
      set('cd-s', String(s % 60).padStart(2, '0'));
    }
    tick(); setInterval(tick, 1000);
  }

  // ---------- Visa ----------
  // Paperwork tracker: tap the status chip to cycle To do → Submitted → Done. Saved on this phone.
  const PW_STATES = { todo: ['⬜ To do', ''], submitted: ['🟡 Submitted', 'warn'], done: ['✅ Done', 'best'] };
  const pwState = p => store.get('pw-' + p.id) || p.status || 'todo';
  function paperwork() {
    const items = (D.visa.paperwork || []).map(p => {
      const s = pwState(p);
      const [label, cls] = PW_STATES[s] || PW_STATES.todo;
      return `<li class="pw" data-id="${esc(p.id)}">
        <button type="button" class="tag ${cls} pw-chip">${label}</button>
        <div><b>${esc(p.title)}</b> <span class="muted small">· ${esc(p.due || '')}</span>
        ${p.note ? `<p class="muted small" style="margin:2px 0 0">${p.note}</p>` : ''}
        ${p.link ? `<a class="muted small" href="${esc(p.link)}" target="_blank" rel="noopener">${esc(p.link.replace('https://', ''))}</a>` : ''}</div>
      </li>`;
    }).join('');
    return items ? `<div class="card"><h4>📋 Paperwork tracker — tap the chip when you file one</h4>
      <ul class="checks" style="list-style:none;padding:0;margin:0;display:grid;gap:10px">${items}</ul></div>` : '';
  }
  function wirePaperwork() {
    const order = ['todo', 'submitted', 'done'];
    document.querySelectorAll('.pw .pw-chip').forEach(btn => btn.addEventListener('click', () => {
      const li = btn.closest('.pw');
      const p = (D.visa.paperwork || []).find(x => x.id === li.dataset.id);
      const next = order[(order.indexOf(pwState(p)) + 1) % order.length];
      store.set('pw-' + p.id, next);
      const [label, cls] = PW_STATES[next];
      btn.textContent = label;
      btn.className = 'tag ' + cls + ' pw-chip';
    }));
  }
  function visa() {
    const V = D.visa;
    const checklist = V.checklist.map((c, i) => {
      const key = 'visa-chk-' + i;
      return `<li><input type="checkbox" id="${key}" ${store.get(key) === '1' ? 'checked' : ''}><label for="${key}">${c}</label></li>`;
    }).join('');
    const steps = V.timeline.map(t => `
      <div class="step"><div class="when">${esc(t.date)}</div><div><h4>${esc(t.title)}</h4><p>${t.body}</p></div></div>`).join('');
    return `<section id="visa">
      ${head('visa', '🛂 Visa', V.checked)}
      <div class="alert">${V.alert}</div>
      ${paperwork()}
      <div class="card" id="stay-clock"></div>
      <div class="note">${V.decision}</div>
      <div class="card"><h4>Before you fly (by Oct 4)</h4><ul class="checks">${checklist}</ul></div>
      <h3>Timeline</h3>
      <div class="card timeline">${steps}</div>
      <h3>Your options</h3>
      ${V.options.map(itemCard).join('')}
      <h3>Watch out</h3>
      ${V.warnings.map(w => `<div class="note">${w}</div>`).join('')}
      ${unverified(V.unverified)}
      ${sources(V.sources)}
    </section>`;
  }

  function stayClock() {
    const V = D.visa, el = document.getElementById('stay-clock');
    const day = 86400000, now = Date.now();
    const ends = Date.parse(V.exemptEnds + 'T23:59:00+07:00'), ext = Date.parse(V.extendedEnds + 'T23:59:00+07:00');
    const fmt = t => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'Asia/Bangkok' });
    if (now < Date.parse(V.arriveISO)) {
      el.innerHTML = `<h4>Your visa-free clock</h4><p>Starts when you land Oct 5. Must leave or extend by <b class="price" style="font-size:18px">${fmt(ends)}</b>. With the extension: <b>${fmt(ext)}</b>.</p>`;
    } else {
      const left = Math.ceil((ends - now) / day), leftExt = Math.ceil((ext - now) / day);
      el.innerHTML = left > 0
        ? `<h4>Days left visa-free</h4><div class="price">${left} days <small>until ${fmt(ends)}</small></div><p class="muted">With the 30-day extension: ${leftExt} days (until ${fmt(ext)}). Extend before ${fmt(ends)}.</p>`
        : `<h4>Visa-free period ended ${fmt(ends)}</h4><p class="muted">If you got the extension: ${Math.max(0, leftExt)} days left (until ${fmt(ext)}).</p>`;
    }
  }

  // ---------- 2. Landing night ----------
  function landing() {
    const L = D.landing;
    const checklist = L.checklist.map((c, i) => {
      const key = 'chk-' + i;
      return `<li><input type="checkbox" id="${key}" ${store.get(key) === '1' ? 'checked' : ''}><label for="${key}">${c}</label></li>`;
    }).join('');
    const dl = L.downloads.map(d => `
      <div class="card">
        <h4>${esc(d.name)}</h4><p class="muted">${esc(d.why)}</p>
        <div class="row">${linkBtn(d.ios, ' App Store')}${linkBtn(d.android, '▶ Google Play')}</div>
      </div>`).join('');
    return `<section id="landing">
      ${head('landing', '🌙 Landing Night', L.checked)}
      ${L.alert ? `<div class="alert">${L.alert}</div>` : ''}
      <div class="card"><h4>Tonight's checklist</h4><ul class="checks">${checklist}</ul></div>
      <h3>Airport → Sukhumvit after 10:30 pm</h3>
      ${L.transport.map(itemCard).join('')}
      <h3>SIM / eSIM at the airport</h3>
      ${L.sims.map(itemCard).join('')}
      <h3>Cash</h3>
      ${L.cash.map(itemCard).join('')}
      <h3>Download before you fly</h3>
      <div class="grid2">${dl}</div>
      ${unverified(L.unverified)}
      ${sources(L.sources)}
    </section>`;
  }

  // ---------- 3. Stay ----------
  function stay() {
    const S = D.stay;
    const cards = S.items.map(s => `
      <div class="card stay">
        ${s.photo ? `<img src="${esc(s.photo)}" alt="${esc(s.name)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.outerHTML='<div class=&quot;noimg&quot;>Photo unavailable</div>'">` : '<div class="noimg">No photo</div>'}
        ${tag(s.tag)}
        <h4>${esc(s.name)}</h4>
        <div class="price">฿${esc(s.thb)} <small>≈ $${esc(s.usd)} / month</small></div>
        <p class="muted small">${esc(s.basis)}</p>
        <dl class="facts">
          <dt>BTS</dt><dd>${esc(s.bts)}</dd>
          <dt>Wi-Fi</dt><dd>${esc(s.wifi)}</dd>
          <dt>Address</dt><dd><a href="${esc(s.maps)}" target="_blank" rel="noopener">${esc(s.address)}</a></dd>
        </dl>
        ${flags(s.flags)}
        <div class="row">${linkBtn(s.book, 'Book / rates', 'primary')}${mapsBtn(s.maps)}${callBtn(s.phone)}</div>
      </div>`).join('');
    const hoods = S.neighborhoods.map(n => `
      <div class="card"><h4>${esc(n.name)}</h4><div class="price" style="font-size:18px">${esc(n.rent)}</div><p class="muted">${esc(n.vibe)}</p></div>`).join('');
    const st = S.starter;
    const starter = st ? `
      <h3>Month 1: rent for 30 days, then decide</h3>
      <div class="note">${st.intro}</div>
      ${st.items.map(r => `
        <div class="card">
          ${tag(r.tag)}
          <h4>${esc(r.name)}</h4>
          <div class="price">฿${esc(r.thb)} <small>≈ $${esc(r.usd)} / month</small></div>
          <dl class="facts">
            <dt>Where</dt><dd><a href="${esc(r.maps)}" target="_blank" rel="noopener">${esc(r.area)}</a></dd>
            <dt>Room</dt><dd>${esc(r.room)}</dd>
            <dt>Bills</dt><dd>${esc(r.util)}</dd>
            <dt>Internet</dt><dd>${esc(r.net)}</dd>
            <dt>Terms</dt><dd>${esc(r.terms)}</dd>
          </dl>
          ${r.note ? `<p class="muted small">${esc(r.note)}</p>` : ''}
          <div class="row">${linkBtn(r.url, 'See listing', 'primary')}${callBtn(r.phone)}${mapsBtn(r.maps)}</div>
        </div>`).join('')}
      <h3>Rental sites for monthly places</h3>
      <div class="grid2">${st.sites.map(x => `
        <div class="card"><h4>${esc(x.name)}</h4><p class="muted">${esc(x.why)}</p><div class="row">${linkBtn(x.url, 'Open ' + esc(x.name))}</div></div>`).join('')}</div>
      <h3>Serviced apartments you asked about</h3>` : '';
    return `<section id="stay">
      ${head('stay', '🏢 Where to Stay', S.checked)}
      ${starter}
      ${S.alert ? `<div class="alert">${S.alert}</div>` : ''}
      ${cards}
      <h3>Neighborhoods for a long-term lease</h3>
      <div class="grid2">${hoods}</div>
      ${S.tip ? `<div class="note">${S.tip}</div>` : ''}
      ${unverified(S.unverified)}
      ${sources(S.sources)}
    </section>`;
  }

  // ---------- 4. VPN ----------
  function vpn() {
    const V = D.vpn;
    const prov = V.providers.map(p => `
      <div class="card">
        ${tag(p.tag)}
        <h4>${esc(p.name)}</h4>
        <dl class="facts">
          ${p.prices.map(x => `<dt>${esc(x.plan)}</dt><dd><b>${esc(x.price)}</b> <span class="muted small">${esc(x.note || '')}</span></dd>`).join('')}
          <dt>Near TH</dt><dd>${esc(p.servers)}</dd>
          <dt>Speed</dt><dd>${esc(p.perf)}</dd>
          <dt>Split tunnel</dt><dd>${esc(p.split)}</dd>
        </dl>
        <details><summary>📱 iPhone setup</summary><ol class="steps">${p.phone.map(s => `<li>${esc(s)}</li>`).join('')}</ol></details>
        <details><summary>💻 Laptop setup</summary><ol class="steps">${p.laptop.map(s => `<li>${esc(s)}</li>`).join('')}</ol></details>
        <div class="row">${linkBtn(p.url, 'Pricing page', 'primary')}</div>
      </div>`).join('');
    return `<section id="vpn">
      ${head('vpn', '🔒 VPN for Streaming', V.checked)}
      <div class="alert"><strong>Do this before you leave the US:</strong> ${V.reminder}</div>
      <div class="note">${V.streamingNote}</div>
      <div class="grid2">${prov}</div>
      <div class="card"><h4>My pick</h4><p>${V.recommendation}</p><p class="muted small">${V.legality}</p></div>
      ${unverified(V.unverified)}
      ${sources(V.sources)}
    </section>`;
  }

  // ---------- 5. Cannabis ----------
  function cannabis() {
    const C = D.cannabis;
    const clinics = C.clinics.map(c => `
      <div class="card">
        ${tag(c.confidence === 'confirmed' ? { text: 'Confirmed current', cls: 'best' } : { text: 'Call ahead to confirm', cls: 'warn' })}
        <h4>${esc(c.name)}</h4>
        ${c.price ? `<div class="price" style="font-size:18px">${esc(c.price)}</div>` : ''}
        <dl class="facts">
          <dt>Address</dt><dd><a href="${esc(c.maps)}" target="_blank" rel="noopener">${esc(c.address)}</a></dd>
          <dt>Hours</dt><dd>${esc(c.hours || 'Not listed')}</dd>
          ${c.note ? `<dt>Note</dt><dd>${esc(c.note)}</dd>` : ''}
        </dl>
        <div class="row">${mapsBtn(c.maps)}${callBtn(c.phone)}${linkBtn(c.url, 'Website')}</div>
      </div>`).join('');
    return `<section id="cannabis">
      ${head('cannabis', '🌿 Medical Cannabis (PT-33)', C.checked)}
      ${C.alert ? `<div class="alert">${C.alert}</div>` : ''}
      <div class="card"><h4>The rules</h4><ul>${C.rules.map(r => `<li>${r}</li>`).join('')}</ul></div>
      <div class="note"><strong>Renewal:</strong> ${C.renewal}</div>
      <h3>Clinics in Sukhumvit that issue prescriptions</h3>
      ${clinics}
      ${unverified(C.unverified)}
      ${sources(C.sources)}
    </section>`;
  }

  // ---------- 6. Quick info ----------
  function quick() {
    const Q = D.quick, E = Q.embassy;
    const nums = Q.emergency.map(e => `<a class="btn ${e.primary ? 'danger' : ''}" href="${tel(e.number)}">📞 ${esc(e.label)} · ${esc(e.number)}</a>`).join('');
    return `<section id="quick">
      ${head('quick', '🆘 Quick Info', Q.checked)}
      <div class="row" style="margin-top:0">${nums}</div>
      <h3>${esc(E.name)}</h3>
      <div class="card">
        <p><a href="${esc(E.maps)}" target="_blank" rel="noopener">${esc(E.address)}</a></p>
        <dl class="facts">
          <dt>Main</dt><dd><a href="${tel(E.phone)}">${esc(E.phone)}</a></dd>
          ${E.afterHours ? `<dt>After hours</dt><dd><a href="${tel(E.afterHours)}">${esc(E.afterHours)}</a></dd>` : ''}
          ${E.email ? `<dt>Email</dt><dd><a href="mailto:${esc(E.email)}">${esc(E.email)}</a></dd>` : ''}
          ${E.hours ? `<dt>Hours</dt><dd>${esc(E.hours)}</dd>` : ''}
        </dl>
        <div class="row">${mapsBtn(E.maps)}${callBtn(E.phone)}${linkBtn(E.web, 'Website')}</div>
      </div>
      <h3>Baht ⇄ Dollars</h3>
      <div class="card">
        <div class="conv">
          <div><label for="thb">Thai baht ฿</label><input id="thb" inputmode="decimal" value="1000"></div>
          <div style="padding-top:18px">⇄</div>
          <div><label for="usd">US dollars $</label><input id="usd" inputmode="decimal"></div>
        </div>
        <p class="muted small" id="fx-line"></p>
      </div>
      ${unverified(Q.unverified)}
      ${sources(Q.sources)}
    </section>`;
  }

  // ---------- Live FX with saved fallback ----------
  let rate = D.fx.rate;
  function fxLine(text) { document.getElementById('fx-line').textContent = text; }
  function wireConverter() {
    const thb = document.getElementById('thb'), usd = document.getElementById('usd');
    const num = v => parseFloat(String(v).replace(/,/g, '')) || 0;
    const fromThb = () => { usd.value = (num(thb.value) / rate).toFixed(2); };
    const fromUsd = () => { thb.value = Math.round(num(usd.value) * rate); };
    thb.addEventListener('input', fromThb);
    usd.addEventListener('input', fromUsd);
    fromThb();
    fxLine(`1 USD = ${rate} THB · checked ${D.fx.date} (${D.fx.source}). Trying live rate…`);
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(r => r.json())
      .then(j => {
        if (j && j.rates && j.rates.THB) {
          rate = +j.rates.THB.toFixed(2);
          window.__fxRate = rate;
          fromThb();
          const when = new Date(j.time_last_update_unix * 1000).toLocaleDateString();
          fxLine(`Live: 1 USD = ${rate} THB (updated ${when}, open.er-api.com). Cash counters give a bit less.`);
          document.getElementById('status-line').textContent = statusText();
        }
      })
      .catch(() => fxLine(`Offline: 1 USD = ${D.fx.rate} THB · checked ${D.fx.date} (${D.fx.source}).`));
  }

  function statusText() {
    return `PR113 → PR732 · lands BKK Mon Oct 5, 22:40 · ฿${rate}/$`;
  }

  $app.innerHTML = flight() + visa() + landing() + stay() + vpn() + cannabis() + quick();
  document.getElementById('status-line').textContent = statusText();
  startCountdown();
  // stayClock() replaced by visatimer.js
  wireConverter();
  document.querySelectorAll('ul.checks input').forEach(el =>
    el.addEventListener('change', () => store.set(el.id, el.checked ? '1' : '0')));
  wirePaperwork();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
