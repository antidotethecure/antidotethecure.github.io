// 💵 Money: instant baht ⇄ dollar calculator, plus "≈ $X" added after every baht
// amount anywhere on the site (re-runs when lists re-render, updates on live rate).
(function () {
  const rate = () => window.__fxRate || (window.DATA && window.DATA.fx.rate) || 33.5;
  const fmtUsd = v => v >= 100 ? '$' + Math.round(v).toLocaleString() : '$' + v.toFixed(2);

  // ---------- Calculator section ----------
  const QUICK = [20, 50, 100, 200, 500, 1000, 5000, 15000];
  const sec = document.createElement('section');
  sec.id = 'money';
  sec.innerHTML = `
    <div class="sec-head"><h2>💵 Money</h2><span class="checked" id="money-rate"></span></div>
    <div class="card money-card">
      <label class="money-label" for="m-thb">Thai baht ฿</label>
      <input id="m-thb" class="money-in" inputmode="decimal" autocomplete="off" placeholder="0">
      <div class="money-eq">=</div>
      <label class="money-label" for="m-usd">US dollars $</label>
      <input id="m-usd" class="money-in usd" inputmode="decimal" autocomplete="off" placeholder="0">
      <div class="quick-amts">${QUICK.map(q => `<button type="button" data-thb="${q}">฿${q.toLocaleString()}</button>`).join('')}</div>
      <p class="muted small" id="money-note"></p>
    </div>
    <div class="card"><h4>Rough rules of thumb</h4><p class="muted" id="money-rules"></p></div>`;
  const app = document.getElementById('app');
  app.insertBefore(sec, document.getElementById('thai') || app.children[1] || null);

  const $ = id => document.getElementById(id);
  const num = v => parseFloat(String(v).replace(/[^\d.]/g, '')) || 0;
  function fromThb() { const t = num($('m-thb').value); $('m-usd').value = t ? (t / rate()).toFixed(2) : ''; }
  function fromUsd() { const u = num($('m-usd').value); $('m-thb').value = u ? Math.round(u * rate()).toLocaleString() : ''; }
  $('m-thb').addEventListener('input', fromThb);
  $('m-usd').addEventListener('input', fromUsd);
  sec.querySelectorAll('[data-thb]').forEach(b => b.addEventListener('click', () => { $('m-thb').value = (+b.dataset.thb).toLocaleString(); fromThb(); }));
  function showRate() {
    const r = rate();
    $('money-rate').textContent = `1 USD = ฿${r}`;
    $('money-note').textContent = window.__fxRate ? 'Live rate. Exchange counters and ATMs give a bit less.' : `Saved rate from ${window.DATA.fx.date}. Updates when online.`;
    $('money-rules').textContent = `฿100 ≈ ${fmtUsd(100 / r)} · ฿1,000 ≈ ${fmtUsd(1000 / r)} · $10 ≈ ฿${Math.round(10 * r)} · $100 ≈ ฿${Math.round(100 * r).toLocaleString()}. Quick math: divide baht by ~${Math.round(r)}.`;
  }
  showRate();

  // ---------- "≈ $X" after every baht amount ----------
  // Matches ฿1,200 · ฿14,000–17,000 · 1,900 THB · 500 baht · 15,500 บาท
  const N = String.raw`\d[\d,]*(?:\.\d+)?(?:\s?[kKM](?![a-zA-Z]))?`;
  const RE = new RegExp(`(฿\\s?${N}(?:\\s?[–-]\\s?${N})?)|(${N}(?:\\s?[–-]\\s?${N})?\\s?(?:THB|baht|บาท))`, 'gi');
  const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'BUTTON', 'CODE']);
  const done = new WeakSet();

  function usdFor(match) {
    const nums = match.replace(/THB|baht|บาท|฿/gi, '').split(/[–-]/).map(part => {
      const m = part.replace(/[,\s]/g, '').match(/^(\d+(?:\.\d+)?)([kKM])?$/);
      if (!m) return NaN;
      return parseFloat(m[1]) * (m[2] ? (m[2] === 'M' ? 1e6 : 1e3) : 1);
    }).filter(n => !isNaN(n));
    if (!nums.length || nums[0] <= 0) return null;
    return nums;
  }
  function label(nums) {
    const r = rate();
    return '≈ ' + nums.map(n => fmtUsd(n / r)).join('–');
  }
  function skipNode(node) {
    for (let el = node.parentElement; el; el = el.parentElement) {
      if (SKIP.has(el.tagName) || el.classList.contains('usd-auto') || el.classList.contains('no-usd') ||
          el.id === 'money' || el.classList.contains('thai-big') || el.classList.contains('docs-sheet')) return true;
      if (el.id === 'app') return false;
    }
    return true;
  }
  function annotate(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!done.has(n) && /\d/.test(n.nodeValue) && /฿|THB|baht|บาท/i.test(n.nodeValue) && !skipNode(n)) nodes.push(n);
    }
    nodes.forEach(n => {
      done.add(n);
      const text = n.nodeValue;
      RE.lastIndex = 0;
      if (!RE.test(text)) return;
      RE.lastIndex = 0;
      const frag = document.createDocumentFragment();
      let last = 0, m, changed = false;
      while ((m = RE.exec(text))) {
        const end = m.index + m[0].length;
        // Skip if a dollar figure already follows (in this text or the next element).
        const after = text.slice(end, end + 18);
        const nextText = (n.nextSibling && n.nextSibling.textContent || '').slice(0, 18);
        if (/\$/.test(after) || (end >= text.trimEnd().length && /\$/.test(nextText))) continue;
        const nums = usdFor(m[0]);
        if (!nums) continue;
        frag.appendChild(document.createTextNode(text.slice(last, end)));
        const span = document.createElement('span');
        span.className = 'usd-auto';
        span.dataset.thb = nums.join('|');
        span.textContent = ' ' + label(nums);
        frag.appendChild(span);
        last = end;
        changed = true;
      }
      if (!changed) return;
      frag.appendChild(document.createTextNode(text.slice(last)));
      const parent = n.parentNode;
      if (!parent) return;
      frag.childNodes.forEach(c => { if (c.nodeType === 3) done.add(c); });
      parent.replaceChild(frag, n);
    });
  }
  function refreshLabels() {
    document.querySelectorAll('.usd-auto').forEach(s => { s.textContent = ' ' + label(s.dataset.thb.split('|').map(Number)); });
    showRate();
    fromThb();
  }

  let pending = null;
  const schedule = () => { if (!pending) pending = setTimeout(() => { pending = null; annotate(app); }, 60); };
  new MutationObserver(schedule).observe(app, { childList: true, subtree: true });
  schedule();

  // Pick up the live rate once app.js has fetched it.
  let tries = 0;
  const wait = setInterval(() => {
    if (window.__fxRate || ++tries > 30) { clearInterval(wait); if (window.__fxRate) refreshLabels(); }
  }, 1000);
})();
