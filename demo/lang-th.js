/* Language menu for the restaurant demos (file name kept for the existing includes).
   - 🌐 pill opens a list of the main languages spoken around the restaurant. Default = LA County's top
     languages; a page can set its own neighborhood list first: <script>window.DEMO_LANGS=["en","es","ko"]</script>
   - Page text: Google Translate. Restaurant, game and brand names stay in English.
   - Text drawn inside the games' canvas: window.__T() uses the hand-written dictionaries below.
   - Thai only: "≈ ฿" next to every $ price at today's rate (for visitors from Thailand).
   - Always-visible bar instead of the pill: <script>window.DEMO_LANG_BAR=true</script> (every language in a row on top).
   Choice is remembered per phone. */
(function () {
  var KEY = 'demo_lang';
  var NAMES = { en: 'English', es: 'Español', 'zh-CN': '简体中文', 'zh-TW': '繁體中文', ko: '한국어', tl: 'Tagalog', vi: 'Tiếng Việt',
    hy: 'Հայերեն', fa: 'فارسی', ja: '日本語', th: 'ไทย', ru: 'Русский', ar: 'العربية', hi: 'हिन्दी', pa: 'ਪੰਜਾਬੀ', km: 'ខ្មែរ', fr: 'Français', pt: 'Português' };
  var SHORT = { en: 'EN', es: 'ES', 'zh-CN': '中文', 'zh-TW': '繁中', ko: '한국어', tl: 'TL', vi: 'VI', hy: 'HY', fa: 'FA', ja: '日本語', th: 'ไทย', ru: 'RU', ar: 'AR', hi: 'HI', pa: 'PA', km: 'KM', fr: 'FR', pt: 'PT' };
  var LANGS = (window.DEMO_LANGS || ['en', 'es', 'zh-CN', 'zh-TW', 'ko', 'tl', 'vi', 'hy', 'fa', 'ja', 'th', 'ru']).filter(function (c) { return NAMES[c]; });
  if (LANGS.indexOf('en') < 0) LANGS.unshift('en');
  function get() {
    var m = document.cookie.match(/googtrans=\/en\/([A-Za-z-]+)/);
    try { var v = localStorage.getItem(KEY); if (v && NAMES[v]) return v; } catch (e) {}
    return m && NAMES[m[1]] ? m[1] : 'en';
  }
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
  // canvas text in the other languages (names stay English)
  var D = {
    es: { 'TAP TO PLAY': 'TOCA PARA JUGAR', 'STORM OVER': 'PASÓ LA TORMENTA', 'LIGHTNING!': '¡RAYO!', 'Fries': 'Papas fritas', 'Shake': 'Malteada', 'Spicy Chicken': 'Pollo picante',
      'THE DRAGON COOKED YOUR FOOD': '¡EL DRAGÓN QUEMÓ TU COMIDA!', 'Free appetizer': 'Entrada gratis', '25% off your food': '25% de descuento en tu comida', '10% off your drink': '10% de descuento en tu bebida',
      'Half off your whole meal': 'Mitad de precio en toda tu comida', 'Entire meal on the house': 'Toda la comida invita la casa' },
    'zh-CN': { 'TAP TO PLAY': '点击开始', 'STORM OVER': '风暴结束', 'LIGHTNING!': '闪电！', 'Fries': '薯条', 'Shake': '奶昔', 'Spicy Chicken': '香辣鸡',
      'THE DRAGON COOKED YOUR FOOD': '龙把你的食物烤焦了！', 'Free appetizer': '免费开胃菜', '25% off your food': '餐点八五折', '10% off your drink': '饮品九折',
      'Half off your whole meal': '整餐半价', 'Entire meal on the house': '整餐免费' },
    'zh-TW': { 'TAP TO PLAY': '點擊開始', 'STORM OVER': '風暴結束', 'LIGHTNING!': '閃電！', 'Fries': '薯條', 'Shake': '奶昔', 'Spicy Chicken': '香辣雞',
      'THE DRAGON COOKED YOUR FOOD': '龍把你的食物烤焦了！', 'Free appetizer': '免費開胃菜', '25% off your food': '餐點75折', '10% off your drink': '飲品9折',
      'Half off your whole meal': '整餐半價', 'Entire meal on the house': '整餐免費' },
    ko: { 'TAP TO PLAY': '탭해서 시작', 'STORM OVER': '폭풍 종료', 'LIGHTNING!': '번개!', 'Fries': '감자튀김', 'Shake': '쉐이크', 'Spicy Chicken': '매운 치킨',
      'THE DRAGON COOKED YOUR FOOD': '용이 음식을 태웠어요!', 'Free appetizer': '애피타이저 무료', '25% off your food': '음식 25% 할인', '10% off your drink': '음료 10% 할인',
      'Half off your whole meal': '전체 식사 반값', 'Entire meal on the house': '전체 식사 무료' },
    ja: { 'TAP TO PLAY': 'タップしてプレイ', 'STORM OVER': '嵐が去った', 'LIGHTNING!': '雷！', 'Fries': 'フライドポテト', 'Shake': 'シェイク', 'Spicy Chicken': 'スパイシーチキン',
      'THE DRAGON COOKED YOUR FOOD': 'ドラゴンが料理を焦がした！', 'Free appetizer': '前菜無料', '25% off your food': '料理25%オフ', '10% off your drink': 'ドリンク10%オフ',
      'Half off your whole meal': 'お食事全品半額', 'Entire meal on the house': 'お食事全部無料' },
    vi: { 'TAP TO PLAY': 'CHẠM ĐỂ CHƠI', 'STORM OVER': 'HẾT BÃO', 'LIGHTNING!': 'SÉT ĐÁNH!', 'Fries': 'Khoai tây chiên', 'Shake': 'Sữa lắc', 'Spicy Chicken': 'Gà cay',
      'THE DRAGON COOKED YOUR FOOD': 'RỒNG ĐÃ NƯỚNG CHÁY MÓN CỦA BẠN!', 'Free appetizer': 'Món khai vị miễn phí', '25% off your food': 'Giảm 25% đồ ăn', '10% off your drink': 'Giảm 10% đồ uống',
      'Half off your whole meal': 'Giảm nửa giá cả bữa', 'Entire meal on the house': 'Cả bữa miễn phí' },
    tl: { 'TAP TO PLAY': 'I-TAP PARA MAGLARO', 'LIGHTNING!': 'KIDLAT!', 'Spicy Chicken': 'Maanghang na Manok', 'Free appetizer': 'Libreng appetizer',
      'Half off your whole meal': 'Kalahating presyo sa buong kain', 'Entire meal on the house': 'Libre ang buong kain' }
  };
  window.__T = function (s) { if (lang === 'th') return TH[s] || s; var d = D[lang]; return d && d[s] ? d[s] : s; };

  // ---- the pill ----
  var css = '.goog-te-banner-frame,.skiptranslate>iframe,#goog-gt-tt,.goog-te-balloon-frame,.VIpgJd-ZVi9od-ORHb-OEVmcd,.VIpgJd-ZVi9od-aZ2wEe-wOHMyf{display:none!important}' +
    'body>.skiptranslate,#dl-gte{display:none!important;height:0!important}body{top:0!important;position:static!important}.goog-text-highlight{background:none!important;box-shadow:none!important}' +
    '#dl-pill{position:fixed;top:calc(10px + env(safe-area-inset-top,0px));right:10px;z-index:9998;display:flex;background:#0b1024e6;border:1px solid #ffffff33;border-radius:999px;padding:3px;font:700 13px/1 system-ui,-apple-system,sans-serif;box-shadow:0 6px 20px #0006;backdrop-filter:blur(8px)}' +
    '#dl-pill>button{border:0;background:transparent;color:#fff;padding:7px 12px;border-radius:999px;cursor:pointer;font:inherit}' +
    '#dl-menu{display:none;position:absolute;top:calc(100% + 6px);right:0;min-width:170px;max-height:62vh;overflow:auto;background:#0b1024f5;border:1px solid #ffffff33;border-radius:14px;padding:6px;box-shadow:0 12px 30px #0008}' +
    '#dl-pill.open #dl-menu{display:block}#dl-menu button{display:block;width:100%;text-align:left;border:0;background:transparent;color:#cfd6e6;padding:10px 12px;border-radius:10px;cursor:pointer;font:600 15px/1.2 system-ui,-apple-system,sans-serif}' +
    '#dl-menu button.on{background:#ffd23f;color:#111}' +
    '#dl-bar{position:fixed;top:0;left:0;right:0;z-index:9998;display:flex;gap:6px;overflow-x:auto;padding:calc(7px + env(safe-area-inset-top,0px)) 10px 7px;background:#070b1ef2;border-bottom:1px solid #25336a;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);scrollbar-width:none}' +
    '#dl-bar::-webkit-scrollbar{display:none}#dl-bar button{flex:none;border:1px solid #25336a;background:#121c40;color:#dfe6ff;padding:7px 12px;border-radius:999px;cursor:pointer;font:700 13px/1 system-ui,-apple-system,sans-serif;white-space:nowrap}' +
    '#dl-bar button.on{background:#ffd23f;border-color:#ffd23f;color:#111}#dl-bar .gl{flex:none;align-self:center;font-size:16px;margin-right:2px}' +
    'body.dl-has-bar{padding-top:calc(46px + env(safe-area-inset-top,0px))!important}' +
    '.dl-fx{opacity:.85;font-size:.8em;font-weight:600;margin-left:4px;white-space:nowrap}';
  var st = document.createElement('style'); st.textContent = css; (document.head || document.documentElement).appendChild(st);

  function setLang(code) {
    try { localStorage.setItem(KEY, code); } catch (e) {}
    var host = location.hostname, exp = code === 'en' ? '; expires=Thu, 01 Jan 1970 00:00:00 GMT' : '', val = code === 'en' ? '' : '/en/' + code;
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
  var TBL = { th: 'โต๊ะ', es: 'Mesa', 'zh-CN': '桌', 'zh-TW': '桌', ko: '테이블', ja: 'テーブル', vi: 'Bàn', tl: 'Mesa', ru: 'Стол', hy: 'Սեղան', fa: 'میز' };
  var FIX = lang === 'th'
    ? [[/^\s*Table\s+(\d+)\s*$/i, 'โต๊ะ $1'], [/^\s*Table\s+—\s*$/i, 'โต๊ะ —'], [/^\s*Start at table\s+(\d+)\s*$/i, 'เริ่มที่โต๊ะ $1'], [/^\s*Pick a table\s*$/i, 'เลือกโต๊ะ']]
    : TBL[lang] ? [[/^\s*Table\s+(\d+)\s*$/i, TBL[lang] + ' $1'], [/^\s*Table\s+—\s*$/i, TBL[lang] + ' —']] : [];
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
    if (window.DEMO_LANG_BAR) {
      var bar = document.createElement('nav'); bar.id = 'dl-bar'; bar.className = 'notranslate'; bar.setAttribute('translate', 'no'); bar.setAttribute('aria-label', 'Language');
      bar.innerHTML = '<span class="gl">🌐</span>' + LANGS.map(function (c) { return '<button type="button" data-l="' + c + '"' + (c === lang ? ' class="on"' : '') + '>' + NAMES[c] + '</button>'; }).join('');
      bar.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b && b.dataset.l !== lang) setLang(b.dataset.l); });
      document.body.appendChild(bar); document.body.classList.add('dl-has-bar');
      var on = bar.querySelector('.on'); if (on && on.scrollIntoView) setTimeout(function () { bar.scrollLeft = on.offsetLeft - 60; }, 50);
    }
    var p = document.createElement('div'); p.id = 'dl-pill'; if (window.DEMO_LANG_BAR) p.style.display = 'none'; p.className = 'notranslate'; p.setAttribute('translate', 'no');
    p.innerHTML = '<button type="button" class="dl-t" aria-haspopup="true" aria-label="Language">🌐 ' + SHORT[lang] + ' ▾</button><div id="dl-menu" role="menu">' +
      LANGS.map(function (c) { return '<button type="button" role="menuitem" data-l="' + c + '"' + (c === lang ? ' class="on"' : '') + '>' + NAMES[c] + '</button>'; }).join('') + '</div>';
    p.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.classList.contains('dl-t')) { p.classList.toggle('open'); return; }
      p.classList.remove('open'); if (b.dataset.l && b.dataset.l !== lang) setLang(b.dataset.l);
    });
    document.addEventListener('click', function (e) { if (!p.contains(e.target)) p.classList.remove('open'); });
    document.body.appendChild(p);
    if (lang === 'en') return;
    document.documentElement.lang = lang;
    fixPhrases(); protect(); setTimeout(protect, 1200);
    var ft; new MutationObserver(function () { clearTimeout(ft); ft = setTimeout(fixPhrases, 120); }).observe(document.body, { childList: true, subtree: true, characterData: true });
    if (lang === 'th') fetch('https://open.er-api.com/v6/latest/USD').then(function (r) { return r.json(); })
      .then(function (j) { if (j && j.rates && j.rates.THB) rate = j.rates.THB; }).catch(function () {})
      .finally(function () { baht(); var t; new MutationObserver(function () { clearTimeout(t); t = setTimeout(baht, 500); })
        .observe(document.body, { childList: true, subtree: true }); });
    var holder = document.createElement('div'); holder.id = 'dl-gte'; holder.style.display = 'none'; document.body.appendChild(holder);
    window.googleTranslateElementInit = function () {
      new google.translate.TranslateElement({ pageLanguage: 'en', includedLanguages: LANGS.filter(function (c) { return c !== 'en'; }).join(','), autoDisplay: false }, 'dl-gte');
    };
    var T0 = document.title; setInterval(function () { if (document.title !== T0) document.title = T0; }, 1000);
    var s = document.createElement('script'); s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'; document.body.appendChild(s);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
