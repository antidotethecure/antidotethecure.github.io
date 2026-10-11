/* SousShift AI — START MENU for any restaurant mini game. Include after the game's script:
     <script>window.GAME_MENU={ ...config... };</script><script src="../gamemenu.js"></script>
   Before play a themed start screen covers the game: ▶ PLAY · 🎵 MUSIC (only if the game has music) · ⚙️ SETTINGS ·
   ❓ HOW TO PLAY · 🏆 POINTS & PRIZES. Panels open as a bottom sheet. During play a small 🎵 button (bottom corner,
   above gamepause.js's Pause) turns only the music off/on; sound effects keep going. The Pause screen gets the same
   Settings / How to play / Points buttons, so there is one pause, not two. Choices persist per game (localStorage).
   Config (all optional except start):
     id:"storm-burger"              localStorage key (defaults to the page path)
     name:"Storm Run", by:"StormBurger", tagline:"Drive through the storm", logo:"img/logo.png", hero:["img/a.webp",…]
     theme:{bg,bg2,card,edge,accent,accent2,ink,dim,display,body}   (CSS colors / font stacks)
     mount:"#game"                  element the start screen covers (default: the .gamebox around the first canvas)
     hide:"#startov"                the game's old start screen: hidden while the menu is up (it is replaced, not stacked)
     start:function(){…}            starts the game exactly like its own "tap to play" does
     how:{goal:"…", time:"45 seconds", steps:[["👆","Tap left/right to change lanes"],…]}
     points:[{group:"Grab these", items:[{img:"img/game/burger.webp"|function(){return dataURL}, icon:"🪙", name:"Burger", pts:"+60", note:"…", bad:true}]}]
     prizes:{tiers:[["1,000","Free burger","note"],…], champion:"Top score of the week wins …", note:"Sample prizes…"}
     vibrate:true                   the game buzzes the phone → a Vibration switch (wraps navigator.vibrate)
     difficulty:{options:[["easy","Easy"],["hard","Hard"]], get:function(){}, set:function(v){}}  only if the game has it
     music:false                    force "no music" even if GAME_AUDIO says otherwise
     switches:[{label:"Cartoon red",icon:"🩸",note:"…",get:function(){},set:function(on){}}]   extra on/off rows in Settings
     tokens:true                    game access through crm.js (CRM_CFG.tokens / CRM_CFG.spin, window.SSAI_TOKENS): PLAY goes
                                    through the member-account check (Phase 1: free for members) or costs tokens (Phase 2);
                                    the start screen shows the status / token balance, a 🎡 free daily spin button and, in
                                    Phase 2, 🪙 Get tokens; How to play / Points panels list the token + spin rules.
     modes:{title:"Who's playing?", options:[["kid","🧒","Kid","12 & under · slower timers"],["adult","🧑","Adult","Regular speed"]],
            get:function(){ return "kid"|"adult"|"" }, set:function(v){}}
                                    two big buttons above PLAY; PLAY waits until one is picked (the game remembers it).
                                    With tokens:true the pick is passed on (kid mode never asks the child for contact info).
   Audio convention (games that have sound expose it; the menu wires to it):
     window.GAME_AUDIO={ music:function(on){}, sfx:function(on){}, state:function(){ return {hasMusic:true,hasSfx:true,music:true,sfx:true}; } }
     music(false) must silence ONLY the music (gain 0 / pause the <audio>), never suspend the shared AudioContext.
   API: window.GameMenu.open() · .close() · .panel("points"|"how"|"settings") */
(function () {
  "use strict";
  if (window.GameMenu) return;
  var C = window.GAME_MENU; if (!C) return;
  var W = window, D = document;
  var T = function (s) { return (W.__T || String)(s); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]; }); };
  var th = C.theme || {};
  var KEY = "gm:" + (C.id || location.pathname.replace(/\/index\.html$/, "").replace(/\/$/, ""));
  var S = { music: true, sfx: true, vib: true, diff: null };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || "null"); if (sv) for (var k in sv) S[k] = sv[k]; } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  function TK() { return (C.tokens && W.SSAI_TOKENS) || null; }

  /* ---------- audio ---------- */
  function A() { return C.audio || W.GAME_AUDIO || null; }
  function ast() { var a = A(); try { return a && a.state ? a.state() || {} : {}; } catch (e) { return {}; } }
  function hasMusic() { var a = A(); return C.music !== false && !!(a && a.music) && ast().hasMusic !== false; }
  function hasSfx() { var a = A(); return !!(a && a.sfx) && ast().hasSfx !== false; }
  function applyAudio() { var a = A(); if (!a) return; try { if (hasMusic()) a.music(!!S.music); if (hasSfx()) a.sfx(!!S.sfx); } catch (e) {} }

  /* ---------- vibration: games call navigator.vibrate; the switch gates it ---------- */
  var canVib = !!(C.vibrate && navigator.vibrate);
  if (canVib) { var vb = navigator.vibrate; try { navigator.vibrate = function (p) { return S.vib ? vb.call(navigator, p) : false; }; } catch (e) {} }

  /* ---------- styles ---------- */
  var V = "--gm-bg:" + (th.bg || "#0e1120") + ";--gm-bg2:" + (th.bg2 || th.bg || "#1b2140") + ";--gm-card:" + (th.card || "rgba(255,255,255,.08)") +
    ";--gm-edge:" + (th.edge || "rgba(255,255,255,.18)") + ";--gm-acc:" + (th.accent || "#ffb020") + ";--gm-acc2:" + (th.accent2 || th.accent || "#ffd23f") +
    ";--gm-ink:" + (th.ink || "#fff") + ";--gm-dim:" + (th.dim || "rgba(255,255,255,.7)") + ";--gm-btnink:" + (th.btnInk || "#fff") +
    ";--gm-soft:" + (th.soft || "rgba(255,255,255,.08)") + ";--gm-track:" + (th.track || "rgba(255,255,255,.22)") + ";--gm-good:" + (th.good || "#43e08a") + ";--gm-bad:" + (th.bad || "#ff6b6b") + ";--gm-label:" + (th.label || th.accent2 || th.accent || "#ffd23f") +
    ";--gm-disp:" + (th.display || "inherit") + ";--gm-body:" + (th.body || "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif");
  var st = D.createElement("style");
  st.textContent =
    ".gm-ov,.gm-sheet,.gm-mbtn{" + V + "}" +
    ".gm-ov{position:absolute;z-index:40;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:14px;box-sizing:border-box;overflow:hidden;" +
    "border-radius:14px;color:var(--gm-ink);font-family:var(--gm-body);text-align:center;opacity:1;transition:opacity .25s,transform .25s;" +
    "background:radial-gradient(120% 80% at 50% 0,color-mix(in srgb,var(--gm-acc) 30%,transparent),transparent 60%),linear-gradient(180deg,var(--gm-bg2),var(--gm-bg));" +
    "-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);box-shadow:inset 0 0 0 1px var(--gm-edge)}" +
    ".gm-ov.off{opacity:0;transform:scale(.97);pointer-events:none}.gm-ov.gone{display:none}.gm-ov *{box-sizing:border-box}" +
    ".gm-hero{display:flex;justify-content:center;align-items:flex-end;gap:4px;height:58px}.gm-hero img{height:52px;width:auto;max-width:64px;object-fit:contain;filter:drop-shadow(0 6px 10px rgba(0,0,0,.45));animation:gmBob 2.4s ease-in-out infinite}" +
    ".gm-hero img:nth-child(2n){animation-delay:-1.2s;height:58px}.gm-hero img:nth-child(3n){animation-delay:-.6s}" +
    "@keyframes gmBob{0%,100%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-7px) rotate(4deg)}}" +
    ".gm-logo{max-width:62%;max-height:46px;width:auto;height:auto;background:#fff;border-radius:10px;padding:5px 9px}" +
    ".gm-by{font:800 11px/1 var(--gm-body);letter-spacing:.22em;text-transform:uppercase;color:var(--gm-label);margin:0}" +
    ".gm-t{margin:0;font-family:var(--gm-disp);font-weight:900;font-size:clamp(34px,11vw,52px);line-height:.95;letter-spacing:.02em;color:var(--gm-ink);text-shadow:0 3px 0 color-mix(in srgb,var(--gm-acc) 70%,#000),0 10px 26px rgba(0,0,0,.5)}" +
    ".gm-tag{margin:0;font-size:13.5px;color:var(--gm-dim);max-width:300px}" +
    ".gm-play{display:inline-flex;align-items:center;justify-content:center;gap:12px;min-height:58px;width:min(280px,100%);border:0;border-radius:999px;cursor:pointer;" +
    "font:900 24px/1 var(--gm-disp);letter-spacing:.08em;color:var(--gm-btnink);background:linear-gradient(180deg,var(--gm-acc2),var(--gm-acc));" +
    "box-shadow:0 6px 0 color-mix(in srgb,var(--gm-acc) 55%,#000),0 14px 30px color-mix(in srgb,var(--gm-acc) 45%,transparent);animation:gmPulse 1.8s ease-in-out infinite;-webkit-tap-highlight-color:transparent;touch-action:manipulation}" +
    ".gm-play:active{transform:translateY(3px);box-shadow:0 3px 0 color-mix(in srgb,var(--gm-acc) 55%,#000)}" +
    ".gm-play b{width:0;height:0;border-left:17px solid currentColor;border-top:11px solid transparent;border-bottom:11px solid transparent}" +
    "@keyframes gmPulse{0%,100%{scale:1}50%{scale:1.04}}" +
    ".gm-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;width:min(300px,100%)}.gm-grid .wide{grid-column:1/-1}" +
    ".gm-b{display:flex;align-items:center;justify-content:center;gap:7px;min-height:46px;padding:8px 10px;border-radius:14px;border:1px solid var(--gm-edge);background:var(--gm-card);" +
    "color:var(--gm-ink);font:800 14px/1.1 var(--gm-body);cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation}" +
    ".gm-b:active{transform:scale(.97)}.gm-b i{font-style:normal;font-size:18px}.gm-b.offm{opacity:.6}" +
    ".gm-ov.tight{gap:8px;padding:10px}.gm-ov.tight .gm-hero{height:40px}.gm-ov.tight .gm-hero img{height:36px}.gm-ov.tight .gm-tag{display:none}.gm-ov.tight .gm-play{min-height:50px;font-size:21px}.gm-ov.tight .gm-b{min-height:44px}" +
    /* bottom sheet */
    ".gm-sheet{position:fixed;inset:0;z-index:2147483005;display:flex;align-items:flex-end;justify-content:center;background:rgba(4,6,14,.6);opacity:0;pointer-events:none;transition:opacity .2s;font-family:var(--gm-body)}" +
    ".gm-sheet.on{opacity:1;pointer-events:auto}" +
    ".gm-card{width:100%;max-width:520px;max-height:88vh;max-height:88dvh;display:flex;flex-direction:column;border-radius:22px 22px 0 0;color:var(--gm-ink);" +
    "background:linear-gradient(180deg,var(--gm-bg2),var(--gm-bg));border:1px solid var(--gm-edge);border-bottom:0;box-shadow:0 -20px 60px rgba(0,0,0,.5);transform:translateY(30px);transition:transform .25s}" +
    ".gm-sheet.on .gm-card{transform:none}.gm-card *{box-sizing:border-box}" +
    ".gm-hd{display:flex;align-items:center;gap:10px;padding:14px 12px 10px 18px;border-bottom:1px solid var(--gm-edge)}" +
    ".gm-hd h3{margin:0;flex:1;font:900 24px/1.05 var(--gm-disp);letter-spacing:.03em;color:var(--gm-ink)}" +
    ".gm-x{width:44px;height:44px;flex:none;border-radius:50%;border:1px solid var(--gm-edge);background:var(--gm-card);color:var(--gm-ink);font:700 20px/1 var(--gm-body);cursor:pointer}" +
    ".gm-bd{overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding:12px 16px calc(18px + env(safe-area-inset-bottom))}" +
    ".gm-g{margin:14px 0 6px;font:800 11.5px/1 var(--gm-body);letter-spacing:.16em;text-transform:uppercase;color:var(--gm-label)}.gm-g:first-child{margin-top:2px}" +
    ".gm-r{display:flex;align-items:center;gap:12px;padding:8px 10px;margin:6px 0;border-radius:14px;background:var(--gm-card);border:1px solid var(--gm-edge);min-height:56px}" +
    ".gm-ic{flex:none;width:46px;height:46px;display:flex;align-items:center;justify-content:center;font-size:28px;line-height:1;border-radius:12px;background:var(--gm-soft)}" +
    ".gm-ic img{max-width:44px;max-height:44px;width:auto;height:auto;object-fit:contain;filter:drop-shadow(0 3px 5px rgba(0,0,0,.35))}" +
    ".gm-tx{flex:1;min-width:0;text-align:left}.gm-tx b{display:block;font-size:15px;line-height:1.2}.gm-tx small{display:block;color:var(--gm-dim);font-size:12.5px;line-height:1.3;margin-top:2px}" +
    ".gm-pt{flex:none;max-width:42%;text-align:right;font:900 17px/1.1 var(--gm-disp);letter-spacing:.02em;color:var(--gm-good);white-space:normal}.gm-pt.bad{color:var(--gm-bad)}.gm-pt.gold{color:var(--gm-label)}" +
    ".gm-goal{padding:12px 14px;border-radius:14px;border:1px dashed var(--gm-acc);background:color-mix(in srgb,var(--gm-acc) 14%,transparent);font-size:14.5px;line-height:1.4;text-align:left}" +
    ".gm-note{color:var(--gm-dim);font-size:12.5px;margin:12px 2px 0;text-align:left}" +
    ".gm-sw{display:flex;align-items:center;gap:12px;width:100%;min-height:56px;padding:8px 12px;margin:6px 0;border-radius:14px;background:var(--gm-card);border:1px solid var(--gm-edge);color:var(--gm-ink);font:700 15px var(--gm-body);text-align:left;cursor:pointer}" +
    ".gm-sw span{flex:1}.gm-sw u{flex:none;position:relative;width:52px;height:30px;border-radius:99px;background:var(--gm-track);transition:background .2s;text-decoration:none}" +
    ".gm-sw u::after{content:'';position:absolute;top:3px;left:3px;width:24px;height:24px;border-radius:50%;background:#fff;box-shadow:0 2px 6px rgba(0,0,0,.35);transition:transform .2s}" +
    ".gm-sw[aria-checked=true] u{background:var(--gm-acc)}.gm-sw[aria-checked=true] u::after{transform:translateX(22px)}" +
    ".gm-seg{display:flex;gap:6px;margin:6px 0}.gm-seg button{flex:1;min-height:46px;border-radius:12px;border:1px solid var(--gm-edge);background:var(--gm-card);color:var(--gm-ink);font:800 14px var(--gm-body);cursor:pointer}" +
    ".gm-seg button[aria-pressed=true]{background:var(--gm-acc);border-color:var(--gm-acc);color:var(--gm-btnink)}" +
    ".gm-none{display:flex;align-items:center;gap:12px;padding:10px 12px;margin:6px 0;border-radius:14px;border:1px dashed var(--gm-edge);color:var(--gm-dim);font-size:14px;min-height:52px}.gm-none i{font-style:normal;font-size:22px}" +
    /* in-play music button: bottom corner, stacked above the Pause pill */
    ".gm-mbtn{position:fixed;right:calc(10px + env(safe-area-inset-right));bottom:calc(60px + env(safe-area-inset-bottom));z-index:2147483001;width:44px;height:44px;border-radius:50%;" +
    "display:none;align-items:center;justify-content:center;font-size:19px;border:1px solid rgba(255,255,255,.22);background:rgba(14,17,30,.86);color:#fff;cursor:pointer;" +
    "box-shadow:0 6px 20px rgba(0,0,0,.35);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);-webkit-tap-highlight-color:transparent;touch-action:manipulation}" +
    ".gm-mbtn.on{display:inline-flex}.gm-mbtn.mute{opacity:.75}" +
    /* pause screen add-ons */
    ".gm-prow{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;max-width:340px;padding:0 12px}.gm-prow button{min-height:44px;padding:10px 14px!important;font:700 14px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif!important;" +
    "background:rgba(255,255,255,.14)!important;color:#fff!important;border:1px solid rgba(255,255,255,.25)!important;box-shadow:none!important;border-radius:999px}" +
    "html.gm-up .ssai-pausebtn{display:none!important}" +
    ".gm-tok{margin:0;font:700 13.5px/1.3 var(--gm-body);color:var(--gm-ink);background:var(--gm-soft);border:1px solid var(--gm-edge);border-radius:999px;padding:7px 14px;max-width:310px}.gm-tok b{color:var(--gm-label);font-size:16px}" +
    ".gm-play.lock{filter:grayscale(.55) brightness(.85);animation:none}" +
    ".gm-who{width:min(300px,100%)}.gm-who p{margin:0 0 5px;font:800 12px/1 var(--gm-body);letter-spacing:.14em;text-transform:uppercase;color:var(--gm-label)}" +
    ".gm-wb{display:grid;grid-template-columns:1fr 1fr;gap:8px}.gm-wb button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-height:62px;padding:6px;border-radius:16px;border:2px solid var(--gm-edge);background:var(--gm-card);color:var(--gm-ink);font:900 17px/1.1 var(--gm-body);cursor:pointer;touch-action:manipulation}" +
    ".gm-wb button i{font-style:normal;font-size:24px;line-height:1}.gm-wb button small{font:700 11px/1.2 var(--gm-body);color:var(--gm-dim)}.gm-wb button[aria-pressed=true]{border-color:var(--gm-acc2);background:color-mix(in srgb,var(--gm-acc) 30%,transparent);box-shadow:0 0 0 3px color-mix(in srgb,var(--gm-acc2) 40%,transparent)}" +
    ".gm-who.need{animation:gmShake .45s}@keyframes gmShake{25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}" +
    ".gm-ov.hasmodes .gm-tag{display:none}.gm-ov.hasmodes .gm-hero{height:46px}.gm-ov.hasmodes .gm-hero img{height:42px}" +
    "@media (prefers-reduced-motion:reduce){.gm-hero img,.gm-play{animation:none}}";
  D.head.appendChild(st);

  /* ---------- start screen ---------- */
  var ov, mount, box, sheet, mbtn, started = false, opened = false;
  function el(tag, cls, html) { var e = D.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function q(s) { return typeof s === "string" ? D.querySelector(s) : s; }
  function hideOld(on) { if (!C.hide) return; [].forEach.call(D.querySelectorAll(C.hide), function (h) { h.style.display = on ? "none" : ""; }); }

  function menuHTML() {
    var h = "";
    if (C.hero && C.hero.length) h += '<div class="gm-hero" aria-hidden="true">' + C.hero.map(function (s) { return '<img src="' + esc(imgOf({ img: s })) + '" alt="">'; }).join("") + "</div>";
    else if (C.logo) h += '<img class="gm-logo" src="' + esc(C.logo) + '" alt="">';
    if (C.by) h += '<p class="gm-by notranslate">' + esc(C.by) + "</p>";
    h += '<div class="gm-t notranslate" role="heading" aria-level="2">' + esc(C.name || "Play") + "</div>";
    if (C.tagline) h += '<p class="gm-tag">' + esc(T(C.tagline)) + "</p>";
    var tk = TK(), M = C.modes, cur = M ? (function () { try { return M.get() || ""; } catch (e) { return ""; } })() : "";
    if (M) h += '<div class="gm-who" role="group" aria-label="' + esc(T(M.title || "Who's playing?")) + '"><p>' + esc(T(M.title || "Who's playing?")) + '</p><div class="gm-wb">' +
      M.options.map(function (o) { return '<button type="button" data-gm="mode" data-v="' + esc(o[0]) + '" aria-pressed="' + (cur === o[0]) + '"><i>' + o[1] + "</i>" + esc(T(o[2])) + "<small>" + esc(T(o[3])) + "</small></button>"; }).join("") + "</div></div>";
    if (tk) { try { h += '<p class="gm-tok" aria-live="polite">' + tk.statusHTML(cur === "kid") + "</p>"; } catch (e) {} }
    h += '<button type="button" class="gm-play' + (tk && tk.locked() ? " lock" : "") + '" data-gm="play"><b></b>' + esc(T(tk ? tk.playLabel() : "PLAY")) + "</button>";
    var bs = [];
    if (tk && tk.spin) bs.push('<button type="button" class="gm-b" data-gm="spin"><i>🎡</i>' + esc(T(tk.spinReady() ? "Free daily spin" : "Spun today ✓")) + "</button>");
    if (tk && tk.on) bs.push('<button type="button" class="gm-b" data-gm="tokens"><i>🪙</i>' + esc(T("Get tokens")) + "</button>");
    if (hasMusic()) bs.push('<button type="button" class="gm-b" data-gm="music" aria-pressed="' + !!S.music + '"><i>' + (S.music ? "🎵" : "🔇") + "</i>" + esc(T(S.music ? "Music on" : "Music off")) + "</button>");
    bs.push('<button type="button" class="gm-b" data-gm="settings"><i>⚙️</i>' + esc(T("Settings")) + "</button>");
    bs.push('<button type="button" class="gm-b" data-gm="how"><i>❓</i>' + esc(T("How to play")) + "</button>");
    bs.push('<button type="button" class="gm-b" data-gm="points"><i>🏆</i>' + esc(T("Points & prizes")) + "</button>");
    if (bs.length % 2) bs[bs.length - 1] = bs[bs.length - 1].replace('class="gm-b"', 'class="gm-b wide"');
    return h + '<div class="gm-grid">' + bs.join("") + "</div>";
  }
  function place() {
    if (!ov || !mount || !box) return;
    var b = box.getBoundingClientRect(), m = mount.getBoundingClientRect();
    ov.style.left = (m.left - b.left - box.clientLeft) + "px"; ov.style.top = (m.top - b.top - box.clientTop) + "px";
    ov.style.width = m.width + "px"; ov.style.height = m.height + "px";
    ov.classList.toggle("tight", m.height < 400);
  }
  function build() {
    mount = q(C.mount) || D.querySelector(".gamebox canvas, canvas#game");
    if (!mount) return;
    box = q(C.box) || (mount.closest && mount.closest(".gamebox")) || mount.parentNode;
    if (getComputedStyle(box).position === "static") box.style.position = "relative";
    ov = el("div", "gm-ov"); ov.setAttribute("role", "dialog"); ov.setAttribute("aria-label", (C.name || "Game") + " start menu");
    ov.innerHTML = menuHTML(); if (C.modes) ov.classList.add("hasmodes"); box.appendChild(ov);
    ov.addEventListener("click", onBtn);
    place();
    if (W.ResizeObserver) new ResizeObserver(place).observe(box); W.addEventListener("resize", place);
    hideOld(true); opened = true; D.documentElement.classList.add("gm-up");
    // menu taps (except PLAY) must not lock the screen or show Pause: stop them before gamelock/gamepause see them
    ["touchstart", "pointerdown"].forEach(function (ev) {
      W.addEventListener(ev, function (e) { var t = e.target; if (ov.contains(t) && !(t.closest && t.closest("[data-gm=play]"))) e.stopPropagation(); }, { capture: true, passive: true });
    });
  }
  function onBtn(e) {
    var b = e.target.closest && e.target.closest("[data-gm]"); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    var a = b.getAttribute("data-gm");
    if (a === "play") play();
    else if (a === "music") setMusic(!S.music);
    else if (a === "pclose") closeSheet();
    else if (a === "mode") { try { C.modes.set(b.getAttribute("data-v")); } catch (x) {} if (ov && opened) ov.innerHTML = menuHTML(); }
    else if (a === "spin") { closeSheet(); if (TK()) TK().openSpin(); }
    else if (a === "tokens") { closeSheet(); if (TK()) TK().openTokens(); }
    else if (a === "sw") toggle(b.getAttribute("data-k"));
    else if (a === "xsw") { var xs = (C.switches || [])[+b.getAttribute("data-i")]; if (xs) { try { xs.set(!xs.get()); } catch (x) {} panel("settings"); } }
    else if (a === "diff") { S.diff = b.getAttribute("data-v"); save(); try { C.difficulty.set(S.diff); } catch (x) {} panel("settings"); }
    else panel(a);
  }
  function play() {
    closeSheet();
    var M = C.modes, cur = "";
    if (M) { try { cur = M.get() || ""; } catch (x) {} if (!cur) { var w = ov.querySelector(".gm-who"); if (w) { w.classList.remove("need"); void w.offsetWidth; w.classList.add("need"); } return; } }
    var tk = TK(); if (tk) { tk.play(go, { kid: cur === "kid" }); return; }   // account check (Phase 1) / token cost (Phase 2) first
    go();
  }
  function go() {
    ov.classList.add("off"); opened = false; D.documentElement.classList.remove("gm-up");
    setTimeout(function () { if (!opened) ov.classList.add("gone"); }, 260);
    started = true; applyAudio();
    try { C.start && C.start(); } catch (x) { if (W.console) console.error(x); }
    showM();
  }
  function open() { if (!ov) return; hideOld(true); ov.innerHTML = menuHTML(); ov.classList.remove("gone"); void ov.offsetWidth; ov.classList.remove("off"); opened = true; D.documentElement.classList.add("gm-up"); place(); showM(); }
  function close() { if (!ov) return; ov.classList.add("off", "gone"); opened = false; D.documentElement.classList.remove("gm-up"); }

  /* ---------- settings ---------- */
  function setMusic(on) {
    S.music = !!on; save(); applyAudio();
    if (ov && opened) ov.innerHTML = menuHTML();
    if (mbtn) { mbtn.textContent = S.music ? "🎵" : "🔇"; mbtn.classList.toggle("mute", !S.music); mbtn.setAttribute("aria-label", S.music ? "Music on. Tap to turn music off" : "Music off. Tap to turn music on"); }
    if (sheet && sheet.classList.contains("on") && sheet.getAttribute("data-p") === "settings") panel("settings");
  }
  function toggle(k) {
    if (k === "music") return setMusic(!S.music);
    S[k] = !S[k]; save(); applyAudio(); panel("settings");
  }
  function sw(k, label, icon, on) { return '<button type="button" class="gm-sw" role="switch" data-gm="sw" data-k="' + k + '" aria-checked="' + !!on + '"><i style="font-style:normal;font-size:22px">' + icon + "</i><span>" + esc(T(label)) + "</span><u></u></button>"; }
  function none(icon, txt) { return '<div class="gm-none"><i>' + icon + "</i><span>" + esc(T(txt)) + "</span></div>"; }

  /* ---------- panels ---------- */
  function imgOf(it) { var s = it.img; if (typeof s === "function") { try { s = s(); } catch (e) { s = ""; } } return s; }
  function row(it) {
    var s = imgOf(it), ic = s ? '<img src="' + esc(s) + '" alt="" loading="lazy">' : esc(it.icon || "•");
    var cls = it.bad ? "bad" : it.gold ? "gold" : "";
    return '<div class="gm-r"><span class="gm-ic">' + ic + '</span><span class="gm-tx"><b>' + esc(T(it.name)) + "</b>" + (it.note ? "<small>" + esc(T(it.note)) + "</small>" : "") +
      "</span>" + (it.pts != null ? '<span class="gm-pt ' + cls + '">' + esc(T(it.pts)) + "</span>" : "") + "</div>";
  }
  var TITLES = { points: "🏆 Points & prizes", how: "❓ How to play", settings: "⚙️ Settings" };
  function body(p) {
    var h = "";
    if (p === "points") {
      (C.points || []).forEach(function (g) { h += '<p class="gm-g">' + esc(T(g.group)) + "</p>" + (g.items || []).map(row).join(""); });
      if (W.ReviewEgg && W.ReviewEgg.menuHTML) { try { h += W.ReviewEgg.menuHTML(row); } catch (e) {} }
      if (TK()) { try { h += TK().menuHTML(row, "points"); } catch (e) {} }   // reviewegg.js: "📺 Antidote's review" secret + watch card
      var pr = C.prizes;
      if (pr) {
        h += '<p class="gm-g">' + esc(T("Prizes")) + "</p>";
        if (pr.champion) h += row({ icon: "👑", name: "Weekly champion", note: pr.champion, pts: "#1", gold: true });
        (pr.tiers || []).forEach(function (t) { var pic = /[\/.]/.test(t[3] || ""); h += row({ icon: !pic && t[3] || "🎁", img: pic ? t[3] : null, name: t[1], note: t[2], pts: t[0], gold: true }); });
        if (pr.note) h += '<p class="gm-note">' + esc(T(pr.note)) + "</p>";
      }
    } else if (p === "how") {
      var hw = C.how || {};
      if (hw.goal) h += '<div class="gm-goal">🎯 <b>' + esc(T("Goal")) + ":</b> " + esc(T(hw.goal)) + "</div>";
      if (hw.steps && hw.steps.length) h += '<p class="gm-g">' + esc(T("Controls & rules")) + "</p>" + hw.steps.map(function (s) { return row({ icon: s[0], img: s[2], name: s[1] }); }).join("");
      if (hw.time) h += row({ icon: "⏱️", name: hw.time });
      if (TK()) { try { h += TK().menuHTML(row, "how"); } catch (e) {} }
      h += '<p class="gm-note">' + esc(T("Pause anytime with the ⏸ Pause button in the corner.")) + "</p>";
    } else if (p === "settings") {
      h += '<p class="gm-g">' + esc(T("Sound")) + "</p>";
      h += hasMusic() ? sw("music", "Music", "🎵", S.music) : none("🎵", "No music in this game");
      h += hasSfx() ? sw("sfx", "Sound effects", "🔊", S.sfx) : (hasMusic() ? "" : none("🔇", "This game has no sound effects"));
      if (C.vibrate) { h += '<p class="gm-g">' + esc(T("Feel")) + "</p>" + (canVib ? sw("vib", "Vibration", "📳", S.vib) : none("📳", "Vibration isn't supported on this phone")); }
      if (C.difficulty && C.difficulty.options) {
        var cur = S.diff; try { cur = C.difficulty.get ? C.difficulty.get() : cur; } catch (e) {}
        h += '<p class="gm-g">' + esc(T("Difficulty")) + '</p><div class="gm-seg">' + C.difficulty.options.map(function (o) {
          return '<button type="button" data-gm="diff" data-v="' + esc(o[0]) + '" aria-pressed="' + (String(cur) === String(o[0])) + '">' + esc(T(o[1])) + "</button>"; }).join("") + "</div>";
      }
      if (C.switches && C.switches.length) {   // game-specific on/off switches (e.g. Nalu Vida's "Cartoon red")
        h += '<p class="gm-g">' + esc(T("Display")) + "</p>";
        C.switches.forEach(function (x, i) { var on = false; try { on = !!x.get(); } catch (e) {}
          h += sw("", x.label, x.icon || "⚙️", on).replace('data-gm="sw" data-k=""', 'data-gm="xsw" data-i="' + i + '"') + (x.note ? '<p class="gm-note">' + esc(T(x.note)) + "</p>" : ""); });
      }
      h += '<p class="gm-note">' + esc(T("Saved on this phone.")) + "</p>";
    }
    return h;
  }
  function panel(p) {
    if (!TITLES[p]) return;
    if (!sheet) {
      sheet = el("div", "gm-sheet"); sheet.setAttribute("role", "dialog"); sheet.setAttribute("aria-modal", "true");
      sheet.innerHTML = '<div class="gm-card"><div class="gm-hd"><h3></h3><button type="button" class="gm-x" data-gm="pclose" aria-label="Close">✕</button></div><div class="gm-bd" data-scroll-ok></div></div>';
      sheet.addEventListener("click", function (e) { if (e.target === sheet) { e.stopPropagation(); closeSheet(); } else onBtn(e); });
      ["pointerdown", "touchstart", "mousedown"].forEach(function (ev) { sheet.addEventListener(ev, function (e) { e.stopPropagation(); }, { passive: true }); });
      D.body.appendChild(sheet);
    }
    var keep = sheet.getAttribute("data-p") === p && sheet.classList.contains("on"), bd = sheet.querySelector(".gm-bd"), y = keep ? bd.scrollTop : 0;
    sheet.setAttribute("data-p", p); sheet.setAttribute("aria-label", T(TITLES[p]).replace(/^\S+\s/, ""));
    sheet.querySelector("h3").textContent = T(TITLES[p]);
    bd.innerHTML = body(p); bd.scrollTop = y;
    if (!keep) { void sheet.offsetWidth; sheet.classList.add("on"); try { sheet.querySelector(".gm-x").focus({ preventScroll: true }); } catch (e) {} }
  }
  function closeSheet() { if (sheet) sheet.classList.remove("on"); }
  W.addEventListener("keydown", function (e) { if (e.key === "Escape" && sheet && sheet.classList.contains("on")) { closeSheet(); e.stopPropagation(); } });

  /* ---------- in-play music button (only when the game really has music) ---------- */
  var vis = true;
  function showM() {
    if (!hasMusic()) return;
    if (!mbtn) {
      mbtn = el("button", "gm-mbtn"); mbtn.type = "button";
      mbtn.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); setMusic(!S.music); });
      D.body.appendChild(mbtn); setMusic(S.music);
      if (W.IntersectionObserver && box) new IntersectionObserver(function (es) { vis = es[0].isIntersecting; showM(); }, { threshold: 0.2 }).observe(box);
    }
    mbtn.classList.toggle("on", started && !opened && vis);
  }

  /* ---------- the Pause screen (gamepause.js) gets Settings / How / Points ---------- */
  function addToPause(pov) {
    if (pov.querySelector(".gm-prow")) return;
    var r = el("div", "gm-prow", (hasMusic() ? '<button type="button" data-p="music">🎵 ' + esc(T("Music")) + "</button>" : "") +
      '<button type="button" data-p="settings">⚙️ ' + esc(T("Settings")) + '</button><button type="button" data-p="how">❓ ' + esc(T("How to play")) +
      '</button><button type="button" data-p="points">🏆 ' + esc(T("Points")) + "</button>");
    r.addEventListener("click", function (e) {
      var b = e.target.closest("button"); e.stopPropagation(); e.preventDefault(); if (!b) return;
      var p = b.getAttribute("data-p"); if (p === "music") setMusic(!S.music); else panel(p);
    });
    var p = pov.querySelector("p"); pov.insertBefore(r, p || null);
  }
  function watchPause() {
    var f = D.querySelector(".ssai-pauseov"); if (f) return addToPause(f);
    if (!W.MutationObserver) return;
    var mo = new MutationObserver(function () { var g = D.querySelector(".ssai-pauseov"); if (g) { addToPause(g); mo.disconnect(); } });
    mo.observe(D.body, { childList: true });
  }

  function init() { applyAudio(); build(); watchPause(); }
  if (D.readyState === "loading") D.addEventListener("DOMContentLoaded", init); else init();
  function refresh() { if (ov && opened) ov.innerHTML = menuHTML(); if (sheet && sheet.classList.contains("on")) panel(sheet.getAttribute("data-p")); }
  W.GameMenu = { open: open, close: close, panel: panel, refresh: refresh, play: function () { if (ov) play(); }, get settings() { return S; } };
})();
