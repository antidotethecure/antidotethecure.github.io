// 📷 Scanner: take a photo, then
//  - "Read Thai": free on-device text reading (Tesseract) + Google translate to English
//  - "Price tag → $": finds baht amounts in the photo and converts to dollars
//  - "What is this? (AI)": item + usual Bangkok price via /api/scan (needs the passcode)
(function () {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  // Use the live rate app.js fetched if it has one, else the saved one.
  const rate = () => (window.__fxRate || (window.DATA && window.DATA.fx.rate) || 33.5);
  const usd = thb => '$' + (thb / rate()).toFixed(2);

  const sec = document.createElement('section');
  sec.id = 'scan';
  sec.innerHTML = `
    <div class="sec-head"><h2>📷 Scan anything</h2><span class="checked">Photos stay on your phone except AI scans</span></div>
    <div class="card">
      <label class="btn primary scan-take">📷 Take or pick a photo<input id="scan-file" type="file" accept="image/*" capture="environment" hidden></label>
      <img id="scan-preview" class="scan-preview" alt="" hidden>
      <div class="row" id="scan-actions" hidden>
        <button type="button" class="btn" id="scan-thai">🔤 Read Thai → English</button>
        <button type="button" class="btn" id="scan-price">🏷 Price tag → $</button>
        <button type="button" class="btn primary" id="scan-ai">✨ What is this? + price</button>
      </div>
      <div id="scan-status" class="muted small"></div>
      <div id="scan-result"></div>
    </div>
    <details class="card"><summary>⚙️ AI scanner passcode</summary>
      <p class="muted small">The "What is this?" button uses an AI model on a private server. Enter the passcode once on this phone.</p>
      <div class="row"><input id="scan-pass" class="scan-pass" type="password" placeholder="Passcode" autocomplete="off"><button type="button" class="btn" id="scan-pass-save">Save</button></div>
    </details>
    <p class="muted small">Backup: the Google app's <b>Lens</b> button and iPhone's own camera (long-press text → Translate) do this too.</p>`;
  const app = document.getElementById('app');
  app.insertBefore(sec, document.getElementById('visa') || null);

  const $ = id => document.getElementById(id);
  let photo = null; // { dataUrl, b64 }

  function status(t) { $('scan-status').textContent = t || ''; }
  function result(html) { $('scan-result').innerHTML = html; }

  function shrink(file, max = 1600) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(img.src);
        const dataUrl = c.toDataURL('image/jpeg', 0.85);
        res({ dataUrl, b64: dataUrl.split(',')[1] });
      };
      img.onerror = () => rej(new Error('Could not read that photo'));
      img.src = URL.createObjectURL(file);
    });
  }

  $('scan-file').addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) return;
    result(''); status('Loading photo…');
    try {
      photo = await shrink(f);
      $('scan-preview').src = photo.dataUrl;
      $('scan-preview').hidden = false;
      $('scan-actions').hidden = false;
      status('Pick what you want to know.');
    } catch (err) { status(err.message); }
  });

  // --- Free on-device text reading ---
  let tesseract = null;
  function loadTesseract() {
    if (window.Tesseract) return Promise.resolve();
    if (tesseract) return tesseract;
    tesseract = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      s.onload = res; s.onerror = () => rej(new Error('Needs internet the first time'));
      document.head.appendChild(s);
    });
    return tesseract;
  }
  async function readText(langs) {
    await loadTesseract();
    const { data } = await window.Tesseract.recognize(photo.dataUrl, langs, {
      logger: m => { if (m.status === 'recognizing text') status(`Reading… ${Math.round(m.progress * 100)}%`); }
    });
    return data.text.trim();
  }
  async function translateTh(text) {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=th&tl=en&dt=t&q=${encodeURIComponent(text)}`;
    const j = await (await fetch(url)).json();
    return j[0].map(x => x[0]).join('');
  }

  $('scan-thai').addEventListener('click', async () => {
    if (!photo) return;
    result(''); status('Loading the Thai reader (first time takes ~10s)…');
    try {
      const text = await readText('tha+eng');
      if (!text) { status(''); result('<p class="flag">No readable text found. Try closer and straighter, or use ✨ AI.</p>'); return; }
      status('Translating…');
      const en = await translateTh(text);
      status('');
      result(`<div class="thai-text en">${esc(en)}</div><details><summary>Thai text it read</summary><p>${esc(text)}</p></details>`);
    } catch (err) { status(''); result(`<p class="flag">${esc(err.message)}</p>`); }
  });

  // --- Price tags: pull baht amounts out of the text ---
  function findPrices(text) {
    const out = new Set();
    const re = /(?:฿|THB|บาท)?\s*(\d{1,3}(?:,\d{3})+|\d{1,6})(?:\.(\d{1,2}))?\s*(?:฿|THB|บาท|\.-|-)?/gi;
    let m;
    while ((m = re.exec(text))) {
      const whole = m[0];
      const n = parseFloat(m[1].replace(/,/g, '') + (m[2] ? '.' + m[2] : ''));
      const marked = /฿|THB|บาท|\.-/i.test(whole);
      if (n >= 1 && n <= 500000 && (marked || n >= 5)) out.add(n);
    }
    return [...out].slice(0, 8);
  }
  $('scan-price').addEventListener('click', async () => {
    if (!photo) return;
    result(''); status('Reading the price tag…');
    try {
      const text = await readText('eng+tha');
      const prices = findPrices(text);
      status('');
      result(prices.length
        ? `<div class="price-list">${prices.map(p => `<div class="price-row"><span>฿${p.toLocaleString()}</span><b>${usd(p)}</b></div>`).join('')}</div><p class="muted small">1 USD = ${rate()} THB. Check the one that matches the item.</p>`
        : '<p class="flag">No price found. Try a closer photo of the tag, or type it into the converter in 🆘 Quick.</p>');
    } catch (err) { status(''); result(`<p class="flag">${esc(err.message)}</p>`); }
  });

  // --- AI identify + usual price ---
  $('scan-pass').value = store.get('scan-pass') || '';
  $('scan-pass-save').addEventListener('click', () => { store.set('scan-pass', $('scan-pass').value.trim()); status('Passcode saved on this phone.'); });

  $('scan-ai').addEventListener('click', async () => {
    if (!photo) return;
    const pass = store.get('scan-pass');
    if (!pass) { status('Add the passcode under ⚙️ first.'); return; }
    result(''); status('Asking the AI…');
    try {
      const r = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-scan-passcode': pass },
        body: JSON.stringify({ image: photo.b64, mediaType: 'image/jpeg' })
      });
      const j = await r.json().catch(() => ({ error: 'No answer from the scanner.' }));
      status('');
      if (!r.ok) { result(`<p class="flag">${esc(j.error || 'Scanner error')}</p>`); return; }
      const range = (j.typical_price_thb_low != null && j.typical_price_thb_high != null)
        ? `฿${j.typical_price_thb_low.toLocaleString()}–${j.typical_price_thb_high.toLocaleString()} <small>≈ ${usd(j.typical_price_thb_low)}–${usd(j.typical_price_thb_high)}</small>` : 'Unknown';
      result(`
        <h4 style="margin-top:12px">${esc(j.item)}</h4>
        <p>${esc(j.details)}</p>
        ${j.price_seen_thb != null ? `<p>Tag says <b>฿${j.price_seen_thb.toLocaleString()}</b> ≈ <b>${usd(j.price_seen_thb)}</b></p>` : ''}
        <div class="price">${range}</div>
        <p class="muted small">Usual Bangkok price · ${esc(j.price_note)}</p>
        ${j.thai_text ? `<div class="thai-text en">${esc(j.english_translation)}</div><p class="muted small">Thai: ${esc(j.thai_text)}</p>` : ''}
        <p class="muted small">Confidence: ${esc(j.confidence)}. AI estimates can be wrong.</p>`);
    } catch (err) { status(''); result(`<p class="flag">No connection. ${esc(err.message)}</p>`); }
  });
})();
