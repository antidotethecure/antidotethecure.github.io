/* In-app Instagram section for the restaurant demo apps.
   Diners see the restaurant's posts and reels inside the app (Instagram's OFFICIAL embed, videos play inline)
   without leaving for Instagram.

   USE (3 small additions, near the footer):
     <div id="instafeed"></div>
     <script>window.INSTA_FEED={handle:"gritznwafflez",posts:["https://www.instagram.com/p/XXXX/","https://www.instagram.com/reel/YYYY/"]};</script>
     <script src="../instafeed.js" defer></script>

   CONFIG (window.INSTA_FEED)
     handle  : Instagram username, no "@". Required.
     posts   : public post / reel permalinks, newest first. [] = just the "Follow" card.
     live    : optional auto-updating feed, e.g. {provider:"behold", id:"AbC123"}. When set it REPLACES the
               posts row, so new posts show up on their own.
     theme   : optional colors {card, ink, dim, accent, edge}. Default: inherit the page's text color.
     title   : optional section title (default "📸 From our Instagram").

   AUTO-UPDATING FEED (owner connects their own Instagram; leave `live` unset until they do)
     The pasted links above are a snapshot; they do not change on their own. To make new posts appear
     automatically, the owner connects their account to a free widget service and we paste the feed id:
       Behold (behold.so, free plan):
         1. Owner signs up at behold.so and connects their Instagram (Business/Creator account login via Meta).
         2. "Add feed" -> "Embed code" type. Copy the feed id from <behold-widget feed-id="...">.
         3. Set live:{provider:"behold", id:"<feed id>"}.
       LightWidget (lightwidget.com, free plan):
         1. Owner signs in with Instagram at lightwidget.com, builds a widget (grid or slider).
         2. Copy the id from the iframe src "//lightwidget.com/widgets/<id>.html".
         3. Set live:{provider:"lightwidget", id:"<id>"}.
       Any other widget that gives an iframe URL: live:{provider:"iframe", url:"https://...", height:520}.
     The owner logs in on THEIR side; we never hold their Instagram password or tokens.

   BEHAVIOR
     - Nothing loads from Instagram (or the widget service) until the section is near the viewport.
     - Horizontally swipeable row (scroll-snap); cards ~326px (Instagram's embed minimum) and the row scrolls
       inside itself, so the page never gets wider than the phone.
     - If embed.js is blocked / offline / never renders, the row turns into a simple branded card grid that
       links to each post.
     - The handle is marked notranslate so the 🌐 language pill (Google Translate) leaves it alone. */
(function () {
  var C = window.INSTA_FEED;
  var host = document.getElementById('instafeed');
  if (!C || !host || !C.handle) return;
  var handle = String(C.handle).replace(/^@/, '').replace(/[^A-Za-z0-9_.]/g, '');
  var posts = (C.posts || []).filter(function (u) { return /^https:\/\/(www\.)?instagram\.com\/(p|reel|tv)\/[A-Za-z0-9_-]+/.test(u); });
  var T = C.theme || {};
  var profile = 'https://www.instagram.com/' + handle + '/';

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clean(u) { var m = u.match(/^https:\/\/(?:www\.)?instagram\.com\/(p|reel|tv)\/([A-Za-z0-9_-]+)/); return { kind: m[1], code: m[2], url: 'https://www.instagram.com/' + m[1] + '/' + m[2] + '/' }; }

  var css = '' +
    '#instafeed{--if-card:' + (T.card || 'rgba(127,127,127,.10)') + ';--if-ink:' + (T.ink || 'inherit') + ';--if-dim:' + (T.dim || 'inherit') +
    ';--if-accent:' + (T.accent || '#d62976') + ';--if-edge:' + (T.edge || 'rgba(127,127,127,.28)') + ';margin:30px 0 8px;max-width:100%;min-width:0;color:var(--if-ink);' +
    /* contain: offscreen IG iframes inside the scroller otherwise widen the mobile layout viewport (seen 1001px) */
    'contain:layout paint;overflow:hidden}' +
    '#instafeed .if-h{flex-wrap:wrap;row-gap:2px}' +
    '#instafeed .if-handle{font-size:.6em;white-space:nowrap;opacity:.85}' +
    '#instafeed .if-sub{margin:0 0 10px;font-size:14px;opacity:.75}' +
    '#instafeed .if-row{display:flex;gap:12px;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;' +
    'overscroll-behavior-x:contain;padding:2px 2px 12px;max-width:100%;scrollbar-width:thin}' +
    '#instafeed .if-card{flex:0 0 326px;scroll-snap-align:start;min-height:200px;border-radius:14px;overflow:hidden;background:#fff}' +
    '#instafeed .if-card blockquote.instagram-media{margin:0!important;min-width:0!important;width:100%!important;max-width:100%!important;border:0!important;border-radius:14px!important;background:#fff}' +
    '#instafeed .if-card iframe{min-width:0!important;max-width:100%!important;border-radius:14px!important}' +
    '#instafeed .if-ph{display:flex;align-items:center;justify-content:center;height:420px;color:#8e8e8e;font:600 14px system-ui;text-decoration:none}' +
    '#instafeed .if-follow{flex:0 0 220px;scroll-snap-align:start;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;' +
    'padding:22px 16px;border-radius:14px;background:var(--if-card);border:1px solid var(--if-edge);color:var(--if-ink);text-decoration:none;min-height:200px}' +
    '#instafeed .if-logo{width:64px;height:64px;border-radius:18px;display:grid;place-items:center;font-size:32px;color:#fff;' +
    'background:radial-gradient(circle at 30% 107%,#fdf497 0%,#fdf497 5%,#fd5949 45%,#d6249f 60%,#285AEB 90%)}' +
    '#instafeed .if-btn{display:inline-block;padding:9px 16px;border-radius:999px;background:var(--if-accent);color:#fff;font:800 14px system-ui;text-decoration:none}' +
    '#instafeed .if-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px}' +
    '#instafeed .if-tile{display:flex;flex-direction:column;justify-content:space-between;aspect-ratio:1;padding:12px;border-radius:14px;text-decoration:none;color:#fff;' +
    'background:linear-gradient(135deg,#285AEB,#d6249f 55%,#fd5949);font:700 14px/1.25 system-ui;box-shadow:inset 0 0 0 1px rgba(255,255,255,.15)}' +
    '#instafeed .if-tile .if-ico{font-size:28px}' +
    '#instafeed .if-tile.follow{background:var(--if-card);color:var(--if-ink);border:1px solid var(--if-edge)}' +
    '#instafeed .if-live{border-radius:14px;overflow:hidden;max-width:100%}' +
    '#instafeed .if-live iframe{width:100%;border:0;overflow:hidden;display:block}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var hName = '<span class="notranslate" translate="no">@' + esc(handle) + '</span>';
  host.innerHTML = '<h2 class="if-h"><span>' + esc(C.title || '📸 From our Instagram') + ' · <span class="if-handle notranslate" translate="no">@' + esc(handle) + '</span></span></h2>' +
    '<p class="if-sub">' + (C.live ? 'Fresh from ' + hName + '. New posts show up here on their own.' : !posts.length ? 'Our latest posts, reels and specials live on Instagram.' : 'Swipe for our latest posts and reels. Tap a reel to play it right here.') + '</p>' +
    '<div class="if-body"></div>';
  var body = host.querySelector('.if-body');

  function followCard(cls) {
    return '<a class="' + cls + '" href="' + profile + '" target="_blank" rel="noopener">' +
      '<span class="if-logo">📸</span><b>Follow ' + hName + '<br>on Instagram</b><span class="if-btn">Follow</span></a>';
  }

  // ---------- fallback: simple branded grid linking to each post ----------
  var fellBack = false;
  function fallback() {
    if (fellBack) return; fellBack = true;
    var sub = host.querySelector('.if-sub'); if (sub) sub.textContent = 'Tap any post to open it on Instagram.';
    var tiles = posts.map(function (u, i) {
      var p = clean(u), vid = p.kind !== 'p';
      return '<a class="if-tile" href="' + p.url + '" target="_blank" rel="noopener"><span class="if-ico">' + (vid ? '🎬' : '📷') + '</span>' +
        (vid ? 'Watch reel ' : 'See post ') + (i + 1) + '<small style="font-weight:500;opacity:.85">on Instagram ↗</small></a>';
    }).join('');
    body.innerHTML = '<div class="if-grid">' + tiles +
      '<a class="if-tile follow" href="' + profile + '" target="_blank" rel="noopener"><span class="if-ico">📸</span>Follow ' + hName + '<span class="if-btn" style="font-size:12px;align-self:flex-start">Follow</span></a></div>';
  }

  // ---------- auto-updating widget ----------
  function loadScript(src, mod, ok, bad) {
    var s = document.createElement('script'); if (mod) s.type = 'module'; s.src = src; s.async = true;
    s.onload = ok || null; s.onerror = bad || null; document.body.appendChild(s); return s;
  }
  function renderLive(L) {
    var id = String(L.id || '').replace(/[^A-Za-z0-9_-]/g, '');
    if (L.provider === 'behold' && id) {
      body.innerHTML = '<div class="if-live"><behold-widget feed-id="' + id + '"></behold-widget></div>';
      loadScript('https://w.behold.so/widget.js', true, null, fallback);
    } else if (L.provider === 'lightwidget' && id) {
      body.innerHTML = '<div class="if-live"><iframe src="https://cdn.lightwidget.com/widgets/' + id + '.html" scrolling="no" allowtransparency="true" class="lightwidget-widget" loading="lazy" title="Instagram feed"></iframe></div>';
      loadScript('https://cdn.lightwidget.com/widgets/lightwidget.js', false, null, null);
    } else if (L.provider === 'iframe' && /^https:\/\//.test(L.url || '')) {
      body.innerHTML = '<div class="if-live"><iframe src="' + esc(L.url) + '" style="height:' + (+L.height || 520) + 'px" loading="lazy" title="Instagram feed"></iframe></div>';
    } else { renderEmbeds(); }
  }

  // ---------- official embeds in a swipeable row ----------
  function renderEmbeds() {
    var cards = posts.map(function (u) {
      var p = clean(u);
      return '<div class="if-card"><blockquote class="instagram-media" data-instgrm-permalink="' + p.url + '?utm_source=ig_embed&amp;utm_campaign=loading" data-instgrm-version="14">' +
        '<a class="if-ph" href="' + p.url + '" target="_blank" rel="noopener">Loading ' + (p.kind === 'p' ? 'post' : 'reel') + '…</a></blockquote></div>';
    }).join('');
    body.innerHTML = '<div class="if-row" role="region" aria-label="Instagram posts">' + cards + followCard('if-follow') + '</div>';
    if (!posts.length) return;
    var done = function () { if (window.instgrm && window.instgrm.Embeds) window.instgrm.Embeds.process(); };
    if (window.instgrm) done(); else loadScript('https://www.instagram.com/embed.js', false, done, fallback);
    // embed.js may load but the posts never render (blocked iframes, offline, removed post): fall back.
    setTimeout(function () {
      if (fellBack) return;
      if (!body.querySelector('iframe.instagram-media-rendered')) fallback();
    }, 15000);
  }

  function start() {
    if (C.live && C.live.provider) renderLive(C.live); else renderEmbeds();
  }
  // placeholder shown until the section is close to the screen (no network before then)
  body.innerHTML = '<div class="if-row">' + followCard('if-follow') + '</div>';
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); start(); }
    }, { rootMargin: '400px 0px' });
    io.observe(host);
  } else { start(); }
})();
