// 🍔 Food Reviews: American chains + review-worthy local spots, a pitch in English/Thai,
// and a per-restaurant outreach tracker saved on this phone.
(function () {
  const P = window.PLACES;
  if (!P || !P.food) return;
  const F = P.food;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const tel = n => 'tel:' + String(n).replace(/[^\d+]/g, '');
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  const STATUSES = ['Not contacted', 'Pitched', 'Replied', 'Booked', 'Filmed', 'Posted'];

  const pitchEn = name => `Hi ${name}! I'm Antidote (@therealantidote), a US food reviewer who just moved to Bangkok. I make cinematic food review videos for YouTube, TikTok and Instagram, and I'd love to feature ${name}. I'd come in, order your signature dishes and film a short cinematic review. Would you be open to a collab? Just let me know a good day and time. Thank you!`;
  const pitchTh = name => `สวัสดีครับ ${name}! ผมชื่อ Antidote (@therealantidote) เป็นนักรีวิวอาหารจากอเมริกา เพิ่งย้ายมาอยู่กรุงเทพฯ ผมทำวิดีโอรีวิวอาหารแบบภาพยนตร์ลง YouTube, TikTok และ Instagram และอยากมารีวิวร้าน ${name} ครับ ผมจะมาสั่งเมนูเด่นของร้านและถ่ายวิดีโอรีวิวสั้นๆ ไม่ทราบว่าร้านสนใจร่วมงานกันไหมครับ รบกวนแจ้งวันและเวลาที่สะดวกด้วยครับ ขอบคุณมากครับ`;

  function igUrl(h) {
    if (!h) return '';
    const handle = String(h).replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/.*$/, '');
    return handle ? `https://www.instagram.com/${handle}/` : '';
  }

  function restCard(r, i) {
    const key = 'food-status-' + r.name;
    const st = store.get(key) || STATUSES[0];
    const ig = igUrl(r.instagram);
    return `<div class="card rest" data-i="${i}">
      ${r.photo ? `<img class="rest-img" src="${esc(r.photo)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}
      <span class="tag">${esc(r.cuisine || '')}</span>${r.price ? `<span class="tag">${esc(r.price)}</span>` : ''}
      <h4>${esc(r.name)}</h4>
      <p class="muted small">${esc(r.area || '')}${r.hours ? ' · 🕒 ' + esc(r.hours) : ''}</p>
      ${r.order && r.order.length ? `<p><b>✅ Order:</b> ${r.order.map(esc).join(', ')}</p>` : ''}
      ${r.avoid && r.avoid.length ? `<p class="muted small"><b>❌ Skip:</b> ${r.avoid.map(esc).join(', ')}</p>` : ''}
      ${r.collab ? `<p class="muted small">🤝 ${esc(r.collab)}</p>` : ''}
      ${(r.flags || []).map(f => `<p class="flag">${esc(f)}</p>`).join('')}
      <div class="row">
        ${ig ? `<a class="btn primary" href="${esc(ig)}" target="_blank" rel="noopener">📸 Instagram</a>` : ''}
        ${r.phone ? `<a class="btn" href="${tel(r.phone)}">📞 Call</a>` : ''}
        ${r.line ? `<a class="btn" href="https://line.me/R/ti/p/${encodeURIComponent(r.line)}" target="_blank" rel="noopener">💬 LINE</a>` : ''}
        ${r.maps ? `<a class="btn" href="${esc(r.maps)}" target="_blank" rel="noopener">📍 Map</a>` : ''}
        ${r.website ? `<a class="btn" href="${esc(r.website)}" target="_blank" rel="noopener">🌐 Site</a>` : ''}
      </div>
      <div class="row">
        <button type="button" class="btn copy-en">📋 Copy pitch (English)</button>
        <button type="button" class="btn copy-th">📋 Copy pitch (Thai)</button>
      </div>
      <label class="muted small status-label">Status
        <select class="status">${STATUSES.map(s => `<option${s === st ? ' selected' : ''}>${s}</option>`).join('')}</select>
      </label>
    </div>`;
  }

  function chainCard(c) {
    const b = (c.branches || []).map(x => `<li><a href="${esc(x.maps)}" target="_blank" rel="noopener">${esc(x.name)}</a>${x.hours ? ` <span class="muted small">· ${esc(x.hours)}</span>` : ''}</li>`).join('');
    return `<div class="card">
      <h4>${esc(c.brand)}</h4>
      ${c.note ? `<p class="muted small">${esc(c.note)}</p>` : ''}
      ${c.thai_only ? `<p><b>🇹🇭 Thailand-only to review:</b> ${esc(c.thai_only)}</p>` : ''}
      ${b ? `<ul class="branches">${b}</ul>` : ''}
    </div>`;
  }

  const inTh = (F.chains || []).filter(c => c.in_thailand);
  const notTh = (F.chains || []).filter(c => !c.in_thailand);
  const rest = F.restaurants || [];

  const sec = document.createElement('section');
  sec.id = 'food';
  sec.innerHTML = `
    <div class="sec-head"><h2>🍔 Food Reviews</h2><span class="checked">Last checked ${esc(P.checked)}</span></div>
    <div class="note">Filtered to your taste: <b>no raw food, no duck, no organ meats or weird parts</b>. Chicken, beef, steak, lamb, burgers, noodles and eggs only. Each card says what to order and what to skip.</div>
    <div class="alert"><strong>Keep it a collab, not a paid gig:</strong> taking money from Thai restaurants or brands counts as work and needs a Thai work permit, even on a DTV. Pitch free features and film your own content. Keep paid deals with US businesses.</div>
    <h3>Local spots to review (${rest.length})</h3>
    <div class="row" style="margin-top:0;margin-bottom:10px">
      <select id="food-filter" class="food-filter"><option value="">All statuses</option>${STATUSES.map(s => `<option>${s}</option>`).join('')}</select>
    </div>
    <div id="rest-list">${rest.map(restCard).join('')}</div>
    <h3>🇺🇸 American chains in Bangkok (${inTh.length})</h3>
    <div class="grid2">${inTh.map(chainCard).join('')}</div>
    ${notTh.length ? `<p class="muted small"><b>Not in Thailand:</b> ${notTh.map(c => esc(c.brand) + (c.note ? ` (${esc(c.note)})` : '')).join(' · ')}</p>` : ''}
    ${F.unverified && F.unverified.length ? `<div class="note"><strong>Couldn't confirm:</strong><ul>${F.unverified.map(u => `<li>${esc(u)}</li>`).join('')}</ul></div>` : ''}
    <p class="muted small">Pitches are for you to send yourself from your own Instagram or LINE.</p>`;
  const app = document.getElementById('app');
  app.insertBefore(sec, document.getElementById('stay') || null);

  function flash(btn, text) { const t = btn.textContent; btn.textContent = text; setTimeout(() => { btn.textContent = t; }, 1500); }
  async function copy(text, btn) {
    try { await navigator.clipboard.writeText(text); flash(btn, '✅ Copied'); }
    catch (e) { window.prompt('Copy this:', text); }
  }
  sec.querySelectorAll('.rest').forEach(el => {
    const r = rest[+el.dataset.i];
    el.querySelector('.copy-en').addEventListener('click', e => copy(pitchEn(r.name), e.currentTarget));
    el.querySelector('.copy-th').addEventListener('click', e => copy(pitchTh(r.name), e.currentTarget));
    el.querySelector('.status').addEventListener('change', e => store.set('food-status-' + r.name, e.target.value));
  });
  document.getElementById('food-filter').addEventListener('change', e => {
    const want = e.target.value;
    sec.querySelectorAll('.rest').forEach(el => {
      const st = el.querySelector('.status').value;
      el.hidden = !!want && st !== want;
    });
  });
})();
