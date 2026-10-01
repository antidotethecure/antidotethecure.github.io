// Passport & ticket wallet. Photos are stored ONLY in this device's browser storage
// (IndexedDB). Nothing is ever uploaded to the website or any server.
(function () {
  const SLOTS = [
    { id: 'passport', title: '🛂 Passport', hint: 'Photo page of your passport' },
    { id: 'idcard', title: '🪪 ID / Passport card', hint: 'Your passport card or driver\'s license (backup ID)' },
    { id: 'ticket', title: '🎫 Ticket / Boarding pass QR', hint: 'Screenshot of your e-ticket or boarding pass QR code' },
    { id: 'extra', title: '📄 Other (TDAC QR, visa…)', hint: 'Any other document you want handy' }
  ];

  // --- tiny IndexedDB wrapper ---
  let dbp = null;
  function db() {
    if (!dbp) dbp = new Promise((res, rej) => {
      const r = indexedDB.open('bkk-docs', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('docs');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  async function idb(mode, fn) {
    const d = await db();
    return new Promise((res, rej) => {
      const tx = d.transaction('docs', mode);
      const req = fn(tx.objectStore('docs'));
      tx.oncomplete = () => res(req && req.result);
      tx.onerror = () => rej(tx.error);
    });
  }
  const getDoc = id => idb('readonly', s => s.get(id)).catch(() => null);
  const putDoc = (id, v) => idb('readwrite', s => s.put(v, id));
  const delDoc = id => idb('readwrite', s => s.delete(id));

  // Downscale big phone photos so storage stays small but text stays sharp.
  function shrink(file) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => {
        const max = 2000, k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(img.src);
        res(c.toDataURL('image/jpeg', 0.9));
      };
      img.onerror = () => rej(new Error('Could not read that image'));
      img.src = URL.createObjectURL(file);
    });
  }

  // --- UI ---
  const fab = document.createElement('button');
  fab.className = 'fab';
  fab.type = 'button';
  fab.innerHTML = '🪪 Passport &amp; Ticket';
  document.body.appendChild(fab);

  const sheet = document.createElement('div');
  sheet.className = 'docs-sheet';
  sheet.hidden = true;
  sheet.innerHTML = `
    <div class="docs-top">
      <h2>Passport &amp; Ticket</h2>
      <button type="button" class="btn docs-close">Close</button>
    </div>
    <p class="muted small">🔒 Saved only on this phone. Never uploaded to the website. Add them from inside the home-screen app (it keeps its own storage, separate from Safari).</p>
    <div class="docs-list"></div>`;
  document.body.appendChild(sheet);

  const viewer = document.createElement('div');
  viewer.className = 'docs-viewer';
  viewer.hidden = true;
  viewer.innerHTML = '<img alt=""><p>Tap anywhere to close · turn brightness up for scanners</p>';
  viewer.addEventListener('click', () => { viewer.hidden = true; });
  document.body.appendChild(viewer);

  const list = sheet.querySelector('.docs-list');

  async function render() {
    list.innerHTML = '';
    for (const slot of SLOTS) {
      const data = await getDoc(slot.id);
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <h4>${slot.title}</h4>
        ${data
          ? `<img class="doc-thumb" src="${data}" alt="${slot.title}">`
          : `<div class="noimg">${slot.hint}</div>`}
        <div class="row">
          ${data ? '<button type="button" class="btn primary show">Show full screen</button>' : ''}
          <label class="btn ${data ? '' : 'primary'}">${data ? 'Replace' : '＋ Add photo'}<input type="file" accept="image/*" hidden></label>
          ${data ? '<button type="button" class="btn remove">Remove</button>' : ''}
        </div>`;
      const show = () => { viewer.querySelector('img').src = data; viewer.hidden = false; };
      card.querySelector('.show')?.addEventListener('click', show);
      card.querySelector('.doc-thumb')?.addEventListener('click', show);
      card.querySelector('.remove')?.addEventListener('click', async () => { await delDoc(slot.id); render(); });
      card.querySelector('input').addEventListener('change', async e => {
        const f = e.target.files[0];
        if (!f) return;
        try { await putDoc(slot.id, await shrink(f)); } catch (err) { alertBox(card, err.message); }
        render();
      });
      list.appendChild(card);
    }
  }
  function alertBox(card, msg) {
    const p = document.createElement('p'); p.className = 'flag'; p.textContent = msg; card.appendChild(p);
  }

  fab.addEventListener('click', () => { sheet.hidden = false; document.body.style.overflow = 'hidden'; render(); });
  sheet.querySelector('.docs-close').addEventListener('click', () => { sheet.hidden = true; document.body.style.overflow = ''; });

  // Ask the browser not to evict these files when storage is tight.
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
})();
