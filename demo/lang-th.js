/* EN / ไทย switch for the restaurant demos.
   - Page text: Google Translate (Thai), restaurant + brand names kept in English.
   - Text drawn inside the games' canvas: window.__T() uses the hand-written dictionary below.
   - Prices: "≈ ฿" next to every $ price at today's rate when Thai is on.
   Choice is remembered per phone. Add a demo: <script src="../lang-th.js"></script> */
(function () {
  var KEY = 'demo_lang';
  function get() { try { return localStorage.getItem(KEY) || (/googtrans=\/en\/th/.test(document.cookie) ? 'th' : 'en'); } catch (e) { return 'en'; } }
  var lang = get();

  var TH = {
    'TAP TO PLAY': 'แตะเพื่อเล่น',
    'STORM RUN': 'ฝ่าพายุ', 'STORM OVER': 'พายุสงบแล้ว', 'LIGHTNING!': 'ฟ้าผ่า!',
    'Classic StormBurger': 'StormBurger คลาสสิก', 'Fries': 'เฟรนช์ฟรายส์', 'Shake': 'มิลค์เชค', 'Spicy Chicken': 'ไก่เผ็ด',
    'THE DRAGON COOKED YOUR FOOD': 'มังกรเผาอาหารของคุณแล้ว!',
    'Free Melody Fries': 'เฟรนช์ฟรายส์ Melody ฟรี',
    '$5 off any Mac & Cheese': 'ลด $5 แมคแอนด์ชีสทุกเมนู',
    '10% off your drink': 'ลด 10% เครื่องดื่ม',
    'Free Gilroy Garlic Fries': 'เฟรนช์ฟรายส์กระเทียม Gilroy ฟรี',
    '$8 off Baby Back Ribs': 'ลด $8 ซี่โครงหมูอบ',
    'Free appetizer': 'อาหารเรียกน้ำย่อยฟรี',
    '25% off your food': 'ลด 25% ค่าอาหาร',
    'Half off your whole meal': 'ลดครึ่งราคาทั้งมื้อ',
    'Entire meal on the house': 'ทั้งมื้อทางร้านเลี้ยง'
  };
  window.__T = function (s) { return lang === 'th' && TH[s] ? TH[s] : s; };

  // ---- the pill ----
  var css = '.goog-te-banner-frame,.skiptranslate>iframe,#goog-gt-tt,.goog-te-balloon-frame,.VIpgJd-ZVi9od-ORHb-OEVmcd,.VIpgJd-ZVi9od-aZ2wEe-wOHMyf{display:none!important}' +
    'body>.skiptranslate,#dl-gte{display:none!important;height:0!important}body{top:0!important;position:static!important}.goog-text-highlight{background:none!important;box-shadow:none!important}' +
    '#dl-pill{position:fixed;top:calc(10px + env(safe-area-inset-top,0px));right:10px;z-index:9998;display:flex;background:#0b1024e6;border:1px solid #ffffff33;border-radius:999px;padding:3px;font:700 13px/1 system-ui,-apple-system,sans-serif;box-shadow:0 6px 20px #0006;backdrop-filter:blur(8px)}' +
    '#dl-pill button{border:0;background:transparent;color:#cfd6e6;padding:7px 11px;border-radius:999px;cursor:pointer;font:inherit}' +
    '#dl-pill button.on{background:#ffd23f;color:#111}' +
    '.dl-fx{opacity:.85;font-size:.8em;font-weight:600;margin-left:4px;white-space:nowrap}';
  var st = document.createElement('style'); st.textContent = css; (document.head || document.documentElement).appendChild(st);

  function setLang(code) {
    try { localStorage.setItem(KEY, code); } catch (e) {}
    var host = location.hostname, exp = code === 'en' ? '; expires=Thu, 01 Jan 1970 00:00:00 GMT' : '', val = code === 'en' ? '' : '/en/th';
    document.cookie = 'googtrans=' + val + '; path=/' + exp;
    document.cookie = 'googtrans=' + val + '; path=/; domain=' + host + exp;
    location.reload();
  }

  var KEEP = /(Lucky\s+Dragon(?:\s+Hibachi)?|Churrito\s+Loco|Melody(?:\s+Bar\s*&\s*Grill)?|Melody\s+Table|Hibachi\s+Catch|Loco\s+Match|Second\s+Shift\s+AI|Storm\s?Burger|Thunder|Toast|Antidote(?:\s*The\s*Foodie)?|Gilroy)/g;
  function protect() {
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: function (n) {
      var p = n.parentElement; if (!p || p.closest('script,style,title,textarea,input,.notranslate,#dl-pill')) return NodeFilter.FILTER_REJECT;
      KEEP.lastIndex = 0; return KEEP.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; } });
    var list = []; while (w.nextNode()) list.push(w.currentNode);
    list.forEach(function (n) { KEEP.lastIndex = 0; var f = document.createDocumentFragment(), t = n.nodeValue, last = 0, m;
      while ((m = KEEP.exec(t))) { if (m.index > last) f.appendChild(document.createTextNode(t.slice(last, m.index)));
        var sp = document.createElement('span'); sp.className = 'notranslate'; sp.setAttribute('translate', 'no'); sp.textContent = m[0]; f.appendChild(sp); last = m.index + m[0].length; }
      if (last < t.length) f.appendChild(document.createTextNode(t.slice(last))); n.parentNode.replaceChild(f, n); });
  }

  // ≈ baht next to $ prices (Thai only)
  var rate = 33.5, RE = /\$\s?(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)/g, TEST = /\$\s?\d/;
  function baht() {
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: function (n) {
      var p = n.parentElement; if (!p || p.closest('script,style,title,textarea,input,.dl-px,#dl-pill')) return NodeFilter.FILTER_REJECT;
      return TEST.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; } });
    var list = []; while (w.nextNode()) list.push(w.currentNode);
    list.forEach(function (n) {
      var html = n.nodeValue.replace(/[&<>]/g, function (x) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[x]; })
        .replace(RE, function (all, num) { var v = parseFloat(num.replace(/,/g, '')) * rate;
          return '<span class="dl-px notranslate" translate="no">' + all + '<span class="dl-fx">≈ ฿' + Math.round(v).toLocaleString('en-US') + '</span></span>'; });
      var s = document.createElement('span'); s.innerHTML = html; n.parentNode.replaceChild(s, n);
    });
  }

  // Phrases Google gets wrong in a restaurant ("Table" = spreadsheet). Swap them first and lock them.
  var FIX = [[/^\s*Table\s+(\d+)\s*$/i, 'โต๊ะ $1'], [/^\s*Table\s+—\s*$/i, 'โต๊ะ —'], [/^\s*Start at table\s+(\d+)\s*$/i, 'เริ่มที่โต๊ะ $1'], [/^\s*Pick a table\s*$/i, 'เลือกโต๊ะ']];
  function fixPhrases() {
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null), list = [];
    while (w.nextNode()) list.push(w.currentNode);
    list.forEach(function (n) {
      var p = n.parentElement; if (!p || p.closest('script,style,title,#dl-pill')) return;
      for (var i = 0; i < FIX.length; i++) if (FIX[i][0].test(n.nodeValue)) {
        p.setAttribute('translate', 'no'); p.classList.add('notranslate'); n.nodeValue = n.nodeValue.replace(FIX[i][0], FIX[i][1]); break; }
    });
  }
  function build() {
    var p = document.createElement('div'); p.id = 'dl-pill'; p.className = 'notranslate'; p.setAttribute('translate', 'no');
    p.innerHTML = '<button type="button" data-l="en">EN</button><button type="button" data-l="th">ไทย</button>';
    p.querySelector('[data-l="' + lang + '"]').classList.add('on');
    p.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b && b.dataset.l !== lang) setLang(b.dataset.l); });
    document.body.appendChild(p);
    if (lang !== 'th') return;
    document.documentElement.lang = 'th';
    fixPhrases(); protect(); setTimeout(protect, 1200);
    var ft; new MutationObserver(function () { clearTimeout(ft); ft = setTimeout(fixPhrases, 120); }).observe(document.body, { childList: true, subtree: true, characterData: true });
    fetch('https://open.er-api.com/v6/latest/USD').then(function (r) { return r.json(); })
      .then(function (j) { if (j && j.rates && j.rates.THB) rate = j.rates.THB; }).catch(function () {})
      .finally(function () { baht(); var t; new MutationObserver(function () { clearTimeout(t); t = setTimeout(baht, 500); })
        .observe(document.body, { childList: true, subtree: true }); });
    var holder = document.createElement('div'); holder.id = 'dl-gte'; holder.style.display = 'none'; document.body.appendChild(holder);
    window.googleTranslateElementInit = function () {
      new google.translate.TranslateElement({ pageLanguage: 'en', includedLanguages: 'th', autoDisplay: false }, 'dl-gte');
    };
    var T0 = document.title; setInterval(function () { if (document.title !== T0) document.title = T0; }, 1000);
    var s = document.createElement('script'); s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'; document.body.appendChild(s);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
