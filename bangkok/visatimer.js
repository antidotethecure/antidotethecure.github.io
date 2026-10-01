// ⏳ Visa timer: live countdown to the stay deadline, what to do next, every renew/upgrade
// option with costs, calendar reminders, and progress toward the DTV bank requirement.
// Everything the user enters is saved on this phone only.
(function () {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem('visa-' + k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('visa-' + k, v); } catch (e) {} }
  };
  const rate = () => window.__fxRate || (window.DATA && window.DATA.fx.rate) || 33.5;
  const usd = thb => '$' + Math.round(thb / rate()).toLocaleString();

  // Days allowed counting the entry day as day 1 (how Thai immigration stamps it).
  const STATUSES = {
    exempt:     { label: 'Visa-free (30 days)', days: 30 },
    exempt_ext: { label: 'Visa-free + 30-day extension', days: 60 },
    tr:         { label: 'Tourist Visa (60 days)', days: 60 },
    tr_ext:     { label: 'Tourist Visa + 30-day extension', days: 90 },
    dtv:        { label: 'DTV entry (180 days)', days: 180 },
    dtv_ext:    { label: 'DTV + 180-day extension', days: 360 }
  };

  const DAY = 86400000;
  const bkkDate = iso => new Date(iso + 'T12:00:00+07:00');
  const toIso = d => new Date(d.getTime() + 7 * 3600000).toISOString().slice(0, 10);
  const addDays = (iso, n) => toIso(new Date(bkkDate(iso).getTime() + n * DAY));
  const fmt = iso => bkkDate(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'Asia/Bangkok' });

  function deadline() {
    const override = store.get('stamp', '');
    if (override) return override;
    const s = STATUSES[store.get('status', 'exempt')] || STATUSES.exempt;
    return addDays(store.get('entry', '2026-10-05'), s.days - 1);
  }

  function nextSteps(status, dl) {
    const go = addDays(dl, -10), last = addDays(dl, -3);
    const ext = `Get the <b>30-day extension</b> at Bangkok Immigration (฿1,900). Go between <b>${fmt(go)}</b> and <b>${fmt(last)}</b>, never on the last day. Bring your passport, one 4×6 cm photo, form TM7, a copy of your passport photo page + entry stamp, and your landlord's <b>TM30 receipt</b>.`;
    const leave = `Leave Thailand <b>before ${fmt(dl)}</b>. About 2 weeks before, file a <b>Tourist e-Visa</b> (≈ ฿1,340 / $40) at thaievisa.go.th so you come back on a real visa. Or file the <b>DTV</b> if ฿500,000 has sat in your bank ~3 months.`;
    return {
      exempt: [ext, `Plan ahead: after the extension your next deadline is <b>${fmt(addDays(dl, 30))}</b>, and you'll need to leave by then.`],
      exempt_ext: [leave, 'Don\'t count on a second visa-free entry right after. Back-to-back visa-free entries are where people get turned away.'],
      tr: [ext.replace('30-day extension', '30-day Tourist Visa extension'), `After that your deadline becomes <b>${fmt(addDays(dl, 30))}</b>.`],
      tr_ext: [leave],
      dtv: [`Extend <b>180 days</b> at immigration (฿1,900, officer's choice, often refused), or do a quick trip out and back in for a fresh 180 days. Decide by <b>${fmt(go)}</b>.`, 'File your <b>90-day report</b> (TM47) online every 90 days of continuous stay: tm47.immigration.go.th.'],
      dtv_ext: [`Leave before <b>${fmt(dl)}</b> and re-enter on your DTV for a new 180 days (it's valid 5 years).`, 'Keep filing the 90-day report every 90 days.']
    }[status] || [];
  }

  const OPTIONS = [
    { name: '30-day extension', tag: 'Re-up in Thailand', cost: '฿1,900', time: 'Same day (arrive early)',
      body: 'Once per visa-free or tourist entry. At Bangkok Immigration, Chaeng Watthana Government Complex, Building B. Passport, 4×6 cm photo, TM7 form, passport copies, TM30 receipt. Officers can refuse.',
      link: 'https://www.google.com/maps/search/?api=1&query=Immigration+Division+1+Chaeng+Watthana+Government+Complex+Bangkok' , linkLabel: '📍 Immigration office' },
    { name: 'Tourist Visa (TR)', tag: 'Reissue from outside', cost: '≈ ฿1,340 ($40)', time: 'File online ~2 weeks ahead',
      body: '60 days + one 30-day extension = 90 days. File at thaievisa.go.th while outside Thailand (e.g., a cheap trip to Kuala Lumpur), then fly back in on it.',
      link: 'https://www.thaievisa.go.th', linkLabel: 'Official e-Visa site' },
    { name: 'Visa-free re-entry', tag: 'Risky', warn: true, cost: 'Free', time: '—',
      body: 'Leaving and coming straight back visa-free is allowed on paper, but repeat entries get questioned or refused, and land-border visa-free entries are capped at 2 per year. Use a real visa instead.' },
    { name: 'DTV (Destination Thailand Visa)', tag: 'The upgrade', best: true, cost: '≈ ฿13,400 ($400) + ฿500,000 in the bank', time: '5–15 days, filed from outside Thailand',
      body: '5 years, 180 days per entry, remote work for US platforms allowed. Needs ฿500,000 in a checking/savings account in your name (held ~3 months to be safe; crypto doesn\'t count), FBI check under 3 months old, US driver\'s license, portfolio. File online to the LA consulate.',
      link: 'https://thaiconsulatela.thaiembassy.org/en/publicservice/dtv-visa', linkLabel: 'LA consulate DTV page' },
    { name: 'Thailand Privilege (ex-Elite)', tag: 'Pay to stay', cost: 'From ฿650,000 (non-refundable)', time: 'Weeks',
      body: '5–20 years with no income test, but no work rights and the fee is gone for good. The DTV\'s ฿500,000 stays your money.',
      link: 'https://www.thailandprivilege.co.th/', linkLabel: 'Official site' },
    { name: 'Education (ED) visa', tag: 'Only if you really go to class', cost: '฿25,000–35,000 / year school fees', time: '2–4 weeks',
      body: 'Thai language school, up to about a year. Attendance is tracked (~80%) and thousands were revoked in the 2026 crackdown.' }
  ];

  // ---------- UI ----------
  const target = document.getElementById('stay-clock');
  if (!target) return;
  const box = document.createElement('div');
  box.className = 'card visa-timer';
  box.innerHTML = `
    <div class="vt-head"><h4>⏳ Visa countdown</h4><span class="tag" id="vt-status-tag"></span></div>
    <p class="muted small" id="vt-label"></p>
    <div class="countdown" id="vt-count">
      <div><b id="vt-d">–</b><span>days</span></div>
      <div><b id="vt-h">–</b><span>hrs</span></div>
      <div><b id="vt-m">–</b><span>min</span></div>
      <div><b id="vt-s">–</b><span>sec</span></div>
    </div>
    <div class="vt-bar"><div id="vt-fill"></div></div>
    <p class="vt-deadline" id="vt-deadline"></p>
    <h4 style="margin-top:14px">👉 What to do next</h4>
    <ul class="vt-steps" id="vt-steps"></ul>
    <div class="row">
      <button type="button" class="btn primary" id="vt-ics">📅 Add reminders to my calendar</button>
    </div>
    <details class="vt-settings"><summary>⚙️ My visa details (set these when you land)</summary>
      <label class="muted small" for="vt-status">What are you on right now?</label>
      <select id="vt-status" class="food-filter">${Object.entries(STATUSES).map(([k, v]) => `<option value="${k}">${esc(v.label)}</option>`).join('')}</select>
      <label class="muted small" for="vt-entry">Entry date (the date on your arrival stamp)</label>
      <input type="date" id="vt-entry" class="vt-date">
      <label class="muted small" for="vt-stamp">Or type the exact "admitted until" date from your passport stamp (most accurate)</label>
      <input type="date" id="vt-stamp" class="vt-date">
      <p class="muted small">Saved on this phone only.</p>
    </details>`;
  target.replaceWith(box);

  const extra = document.createElement('div');
  extra.innerHTML = `
    <h3>Re-up & upgrade options</h3>
    ${OPTIONS.map(o => `<div class="card">
      <span class="tag ${o.best ? 'best' : o.warn ? 'warn' : ''}">${esc(o.tag)}</span>
      <h4>${esc(o.name)}</h4>
      <div class="price" style="font-size:18px">${esc(o.cost)}</div>
      <p class="muted small">⏱ ${esc(o.time)}</p>
      <p>${esc(o.body)}</p>
      ${o.link ? `<div class="row"><a class="btn" href="${esc(o.link)}" target="_blank" rel="noopener">${esc(o.linkLabel)}</a></div>` : ''}
    </div>`).join('')}
    <div class="card">
      <h4>💰 DTV money tracker</h4>
      <p class="muted small">The DTV needs ฿500,000 in a regular bank account in your name. Type what's in your bank now (in dollars).</p>
      <input id="vt-bank" class="money-in usd" inputmode="decimal" placeholder="$0">
      <div class="vt-bar big"><div id="vt-bank-fill"></div></div>
      <p id="vt-bank-note"></p>
    </div>
    <div class="alert"><strong>Never overstay:</strong> the fine is ฿500 a day (up to ฿20,000), and overstaying 90+ days gets you banned from Thailand for at least a year (up to 10). If a deadline is close, go to immigration or leave, even a day early.</div>`;
  box.after(extra);

  const $ = id => document.getElementById(id);
  $('vt-status').value = store.get('status', 'exempt');
  $('vt-entry').value = store.get('entry', '2026-10-05');
  $('vt-stamp').value = store.get('stamp', '');
  $('vt-bank').value = store.get('bank', '');

  function render() {
    const status = store.get('status', 'exempt');
    const dl = deadline();
    const entry = store.get('entry', '2026-10-05');
    $('vt-status-tag').textContent = STATUSES[status].label;
    $('vt-deadline').innerHTML = `Deadline: <b>${fmt(dl)}</b> by 11:59 pm Bangkok time`;
    $('vt-steps').innerHTML = nextSteps(status, dl).map(t => `<li>${t}</li>`).join('');
    const end = Date.parse(dl + 'T23:59:59+07:00'), start = Date.parse(entry + 'T00:00:00+07:00');
    box.dataset.end = end; box.dataset.start = start;
    tick();
  }
  function tick() {
    const end = +box.dataset.end, start = +box.dataset.start, now = Date.now();
    const notYet = now < start;
    $('vt-label').textContent = notYet ? `Starts when you land (${fmt(store.get('entry', '2026-10-05'))}). Time you'll have:` : 'Time left on your stay:';
    let s = Math.max(0, Math.floor(((notYet ? end - start : end - now)) / 1000));
    const days = Math.floor(s / 86400);
    $('vt-d').textContent = days; s %= 86400;
    $('vt-h').textContent = String(Math.floor(s / 3600)).padStart(2, '0'); s %= 3600;
    $('vt-m').textContent = String(Math.floor(s / 60)).padStart(2, '0');
    $('vt-s').textContent = String(s % 60).padStart(2, '0');
    const total = Math.max(1, end - start), used = notYet ? 0 : Math.min(1, (now - start) / total);
    $('vt-fill').style.width = (used * 100).toFixed(1) + '%';
    box.classList.toggle('urgent', !notYet && days <= 7);
    box.classList.toggle('soon', !notYet && days > 7 && days <= 14);
    if (!notYet && now > end) $('vt-label').textContent = '⚠️ Your deadline has passed. Go to immigration or leave today.';
  }
  function bank() {
    const v = parseFloat(String($('vt-bank').value).replace(/[^\d.]/g, '')) || 0;
    store.set('bank', $('vt-bank').value);
    const needUsd = 500000 / rate();
    const pct = Math.min(100, (v / needUsd) * 100);
    $('vt-bank-fill').style.width = pct.toFixed(1) + '%';
    $('vt-bank-note').innerHTML = v >= needUsd
      ? `✅ You're at the ฿500,000 line (≈ $${Math.round(needUsd).toLocaleString()}). Keep it in the account ~3 months, then file.`
      : `<b>${pct.toFixed(0)}%</b> of the way. You need about <b>$${Math.round(needUsd - v).toLocaleString()}</b> more (target ≈ $${Math.round(needUsd).toLocaleString()} at today's rate; add ~5% for rate swings).`;
  }

  // Calendar file with three reminders before the deadline.
  function ics() {
    const dl = deadline();
    const ev = (iso, title, desc) => {
      const d = iso.replace(/-/g, '');
      const next = addDays(iso, 1).replace(/-/g, '');
      return ['BEGIN:VEVENT', `UID:${d}-${title.replace(/\W/g, '')}@bangkok-landing`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
        `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${next}`, `SUMMARY:${title}`, `DESCRIPTION:${desc}`,
        'BEGIN:VALARM', 'TRIGGER:-PT15H', 'ACTION:DISPLAY', `DESCRIPTION:${title}`, 'END:VALARM', 'END:VEVENT'].join('\r\n');
    };
    const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Bangkok Landing//Visa//EN',
      ev(addDays(dl, -10), '🛂 Visa: start your extension / exit plan', 'Go to immigration for the extension, or book your trip out + file the e-Visa. Deadline ' + dl),
      ev(addDays(dl, -3), '🛂 Visa: 3 days left', 'Last safe days to extend or leave. Deadline ' + dl),
      ev(dl, '🚨 Visa deadline TODAY', 'You must have extended or left Thailand by 11:59 pm.'),
      'END:VCALENDAR'].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([body], { type: 'text/calendar' }));
    a.download = 'visa-reminders.ics';
    document.body.appendChild(a); a.click(); a.remove();
  }

  $('vt-status').addEventListener('change', e => { store.set('status', e.target.value); render(); });
  $('vt-entry').addEventListener('change', e => { store.set('entry', e.target.value); render(); });
  $('vt-stamp').addEventListener('change', e => { store.set('stamp', e.target.value); render(); });
  $('vt-bank').addEventListener('input', bank);
  $('vt-ics').addEventListener('click', ics);
  render(); bank();
  setInterval(tick, 1000);
  // Refresh dollar figures once the live rate arrives.
  setTimeout(bank, 5000);
})();
