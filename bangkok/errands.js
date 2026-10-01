// 📱 Apps & Errands: rides, delivery, groceries, electronics, shopping, money, health.
(function () {
  const P = window.PLACES;
  if (!P || !P.directory) return;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const btn = (url, label, cls = '') => url ? `<a class="btn ${cls}" href="${esc(url)}" target="_blank" rel="noopener">${label}</a>` : '';

  const cats = P.directory.categories || [];
  const sec = document.createElement('section');
  sec.id = 'errands';
  sec.innerHTML = `
    <div class="sec-head"><h2>📱 Apps &amp; Errands</h2><span class="checked">Last checked ${esc(P.checked)}</span></div>
    <div class="chips cat-chips">${cats.map(c => `<a href="#cat-${esc(c.id)}">${esc(c.emoji || '')} ${esc(c.title)}</a>`).join('')}</div>
    ${cats.map(c => `
      <h3 id="cat-${esc(c.id)}">${esc(c.emoji || '')} ${esc(c.title)}</h3>
      ${(c.tips || []).length ? `<div class="note"><ul>${c.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>` : ''}
      ${(c.apps || []).length ? `<div class="grid2">${c.apps.map(a => `
        <div class="card">
          ${a.status && !/^(ok|active|operating|live)$/i.test(a.status) ? `<span class="tag warn">${esc(a.status)}</span>` : ''}
          <h4>${esc(a.name)}</h4>
          <p class="muted">${esc(a.for || '')}</p>
          ${a.tip ? `<p class="small">${esc(a.tip)}</p>` : ''}
          <div class="row">${btn(a.ios, ' App Store', 'primary')}${btn(a.android, '▶ Play')}${btn(a.web, '🌐 Web')}</div>
        </div>`).join('')}</div>` : ''}
      ${(c.places || []).length ? c.places.map(p => `
        <div class="card place">
          <h4>${esc(p.name)}</h4>
          <p class="muted small">${esc(p.kind || '')}${p.hours ? ' · 🕒 ' + esc(p.hours) : ''}</p>
          ${p.address ? `<p class="small">${esc(p.address)}</p>` : ''}
          ${p.note ? `<p class="muted small">${esc(p.note)}</p>` : ''}
          <div class="row">${btn(p.maps_url, '📍 Directions', 'primary')}${p.phone ? `<a class="btn" href="tel:${esc(String(p.phone).replace(/[^\d+]/g, ''))}">📞 Call</a>` : ''}</div>
        </div>`).join('') : ''}
    `).join('')}
    ${P.directory.unverified && P.directory.unverified.length ? `<div class="note"><strong>Couldn't confirm:</strong><ul>${P.directory.unverified.map(u => `<li>${esc(u)}</li>`).join('')}</ul></div>` : ''}`;
  const app = document.getElementById('app');
  app.insertBefore(sec, document.getElementById('vpn') || null);
})();
