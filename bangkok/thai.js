// Thai translator: type or speak English → Thai text + Thai voice; and their Thai reply → English.
// Live translation needs internet; the phrasebook below works offline.
(function () {
  const PHRASES = [
    ['Hello', 'สวัสดีครับ'],
    ['Thank you', 'ขอบคุณครับ'],
    ['I don\'t speak Thai', 'ผมพูดภาษาไทยไม่ได้ครับ'],
    ['Can you speak English?', 'พูดภาษาอังกฤษได้ไหมครับ'],
    ['Please take me to this address', 'ช่วยพาผมไปที่อยู่นี้ด้วยครับ'],
    ['Please use the meter', 'ช่วยเปิดมิเตอร์ด้วยครับ'],
    ['How much is this?', 'อันนี้ราคาเท่าไหร่ครับ'],
    ['Where is the bathroom?', 'ห้องน้ำอยู่ที่ไหนครับ'],
    ['Where can I buy a SIM card?', 'ซื้อซิมการ์ดได้ที่ไหนครับ'],
    ['Not spicy, please', 'ไม่เผ็ดครับ'],
    ['A little spicy', 'เผ็ดนิดหน่อยครับ'],
    ['Check, please', 'เช็คบิลด้วยครับ'],
    ['Can I see the room?', 'ขอดูห้องได้ไหมครับ'],
    ['How fast is the internet in the room?', 'อินเทอร์เน็ตในห้องเร็วแค่ไหนครับ'],
    ['How much is electricity per unit?', 'ค่าไฟหน่วยละเท่าไหร่ครับ'],
    ['Can I film a video here?', 'ขอถ่ายวิดีโอที่นี่ได้ไหมครับ'],
    ['Please help me', 'ช่วยผมด้วยครับ'],
    ['Please call an ambulance', 'ช่วยเรียกรถพยาบาลด้วยครับ']
  ];

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  async function translate(text, from, to) {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
    try {
      const j = await (await fetch(url)).json();
      return j[0].map(x => x[0]).join('');
    } catch (e) {
      const j = await (await fetch(`https://api.mymemory.translated.net/get?langpair=${from}|${to}&q=${encodeURIComponent(text)}`)).json();
      return j.responseData.translatedText;
    }
  }

  // Voice settings (saved on this phone): speed, deeper "man-style" pitch, and which voice.
  const prefs = {
    get(k, d) { try { const v = localStorage.getItem('voice-' + k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('voice-' + k, v); } catch (e) {} }
  };
  const voiceRate = () => parseFloat(prefs.get('rate', '1.1'));
  const voiceDeep = () => prefs.get('deep', '1') === '1';
  function thaiVoices() {
    return ('speechSynthesis' in window ? speechSynthesis.getVoices() : []).filter(v => v.lang.replace('_', '-').toLowerCase().startsWith('th'));
  }
  function speak(text, lang) {
    if (!('speechSynthesis' in window) || !text) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    const isThai = lang.startsWith('th');
    const chosen = isThai ? thaiVoices().find(v => v.name === prefs.get('name', '')) : null;
    const v = chosen || speechSynthesis.getVoices().find(v => v.lang.replace('_', '-').startsWith(lang.slice(0, 2)));
    if (v) u.voice = v;
    u.rate = voiceRate();
    // iPhone only ships female Thai voices, so "man-style" lowers the pitch.
    u.pitch = isThai && voiceDeep() ? 0.6 : 1;
    speechSynthesis.speak(u);
  }

  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  function listen(lang, onText, btn) {
    if (!Rec) return;
    const r = new Rec();
    r.lang = lang; r.interimResults = false; r.maxAlternatives = 1;
    btn.textContent = '🎙 Listening…';
    r.onresult = e => onText(e.results[0][0].transcript);
    r.onend = () => { btn.textContent = btn.dataset.label; };
    r.onerror = () => { btn.textContent = btn.dataset.label; };
    r.start();
  }

  // Full-screen card the other person can read
  const big = document.createElement('div');
  big.className = 'thai-big';
  big.hidden = true;
  big.innerHTML = '<div class="thai-big-text"></div><div class="thai-big-en"></div><div class="row"><button type="button" class="btn primary say">🔊 Speak Thai</button><button type="button" class="btn close">Close</button></div>';
  document.body.appendChild(big);
  big.querySelector('.close').addEventListener('click', () => { big.hidden = true; speechSynthesis.cancel(); });
  big.querySelector('.say').addEventListener('click', () => speak(big.dataset.th, 'th-TH'));
  function showBig(th, en) {
    big.dataset.th = th;
    big.querySelector('.thai-big-text').textContent = th;
    big.querySelector('.thai-big-en').textContent = en || '';
    big.hidden = false;
  }

  const sec = document.createElement('section');
  sec.id = 'thai';
  sec.innerHTML = `
    <div class="sec-head"><h2>🗣 Talk in Thai</h2><span class="checked">Voice: built into iPhone</span></div>
    <div class="card">
      <h4>You say (English)</h4>
      <textarea id="th-in" rows="3" placeholder="Type what you want to say…"></textarea>
      <div class="row">
        <button type="button" class="btn primary" id="th-go">Translate to Thai</button>
        ${Rec ? '<button type="button" class="btn" id="th-mic" data-label="🎤 Speak English">🎤 Speak English</button>' : ''}
      </div>
      <div id="th-out" class="thai-out" hidden>
        <div class="thai-text" id="th-text"></div>
        <div class="row">
          <button type="button" class="btn primary" id="th-say">🔊 Say it</button>
          <button type="button" class="btn" id="th-show">⛶ Show them</button>
        </div>
      </div>
    </div>
    <div class="card">
      <h4>They reply (Thai → English)</h4>
      <textarea id="en-in" rows="2" placeholder="They can type Thai here… / พิมพ์ภาษาไทยที่นี่"></textarea>
      <div class="row">
        <button type="button" class="btn primary" id="en-go">Translate to English</button>
        ${Rec ? '<button type="button" class="btn" id="en-mic" data-label="🎤 They speak Thai">🎤 They speak Thai</button>' : ''}
      </div>
      <div class="thai-out" id="en-out" hidden><div class="thai-text en" id="en-text"></div></div>
    </div>
    <h3>Quick phrases (work offline)</h3>
    <p class="muted small">Tap one: it shows big for them to read and says it out loud.</p>
    <div class="phrases">${PHRASES.map((p, i) => `<button type="button" class="phrase" data-i="${i}"><span>${esc(p[0])}</span><b>${esc(p[1])}</b></button>`).join('')}</div>
    <details class="card voice-set" open><summary>🔊 Voice settings</summary>
      <label class="muted small" for="v-rate">Speed: <b id="v-rate-label"></b></label>
      <input type="range" id="v-rate" min="0.5" max="2" step="0.1">
      <div class="range-ends muted small"><span>Slower</span><span>Faster</span></div>
      <label class="switch-row"><input type="checkbox" id="v-deep"> Deeper voice (man-style)</label>
      <label class="muted small" for="v-name">Thai voice on this phone</label>
      <select id="v-name" class="food-filter"></select>
      <div class="row"><button type="button" class="btn" id="v-test">▶ Test: สวัสดีครับ</button></div>
      <p class="muted small">iPhones only include female Thai voices, so "man-style" lowers the pitch to sound deeper. Settings are saved on this phone.</p>
    </details>
    <p class="muted small">Live translation uses Google Translate and needs data or Wi-Fi. Machine translation can be off, so keep sentences short and simple. Uses ครับ (the polite ending for men).</p>`;

  const app = document.getElementById('app');
  const visaSec = document.getElementById('visa');
  app.insertBefore(sec, visaSec || null);

  const $ = id => document.getElementById(id);
  function voiceUi() {
    $('v-rate').value = voiceRate();
    $('v-rate-label').textContent = voiceRate().toFixed(1) + '×';
    $('v-deep').checked = voiceDeep();
    const list = thaiVoices();
    const cur = prefs.get('name', '');
    $('v-name').innerHTML = '<option value="">Default Thai voice</option>' + list.map(v => `<option${v.name === cur ? ' selected' : ''}>${esc(v.name)}</option>`).join('');
  }
  voiceUi();
  if ('speechSynthesis' in window) speechSynthesis.addEventListener?.('voiceschanged', voiceUi);
  $('v-rate').addEventListener('input', e => { prefs.set('rate', e.target.value); $('v-rate-label').textContent = (+e.target.value).toFixed(1) + '×'; });
  $('v-rate').addEventListener('change', () => speak('สวัสดีครับ', 'th-TH'));
  $('v-deep').addEventListener('change', e => { prefs.set('deep', e.target.checked ? '1' : '0'); speak('สวัสดีครับ', 'th-TH'); });
  $('v-name').addEventListener('change', e => { prefs.set('name', e.target.value); speak('สวัสดีครับ', 'th-TH'); });
  $('v-test').addEventListener('click', () => speak('สวัสดีครับ ผมชื่อ Antidote', 'th-TH'));

  async function goThai() {
    const text = $('th-in').value.trim();
    if (!text) return;
    $('th-go').textContent = 'Translating…';
    try {
      const th = await translate(text, 'en', 'th');
      $('th-text').textContent = th;
      $('th-out').hidden = false;
      $('th-out').dataset.en = text;
      speak(th, 'th-TH');
    } catch (e) {
      $('th-text').textContent = 'No connection. Use a quick phrase below.';
      $('th-out').hidden = false;
    }
    $('th-go').textContent = 'Translate to Thai';
  }
  async function goEnglish() {
    const text = $('en-in').value.trim();
    if (!text) return;
    $('en-go').textContent = 'Translating…';
    try {
      const en = await translate(text, 'th', 'en');
      $('en-text').textContent = en;
      speak(en, 'en-US');
    } catch (e) {
      $('en-text').textContent = 'No connection right now.';
    }
    $('en-out').hidden = false;
    $('en-go').textContent = 'Translate to English';
  }
  $('th-go').addEventListener('click', goThai);
  $('en-go').addEventListener('click', goEnglish);
  $('th-say').addEventListener('click', () => speak($('th-text').textContent, 'th-TH'));
  $('th-show').addEventListener('click', () => showBig($('th-text').textContent, $('th-out').dataset.en));
  $('th-mic')?.addEventListener('click', e => listen('en-US', t => { $('th-in').value = t; goThai(); }, e.currentTarget));
  $('en-mic')?.addEventListener('click', e => listen('th-TH', t => { $('en-in').value = t; goEnglish(); }, e.currentTarget));
  sec.querySelectorAll('.phrase').forEach(b => b.addEventListener('click', () => {
    const p = PHRASES[+b.dataset.i];
    showBig(p[1], p[0]);
    speak(p[1], 'th-TH');
  }));

  // iOS loads voices lazily
  if ('speechSynthesis' in window) speechSynthesis.getVoices();

  // Floating shortcut
  const fab = document.createElement('a');
  fab.className = 'fab fab-left';
  fab.href = '#thai';
  fab.textContent = '🗣 Thai';
  document.body.appendChild(fab);
})();
