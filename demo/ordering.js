/* SousShift AI · ONLINE ORDERING, PICKUP ONLY (Phase 1, 2026-10-18). Loaded by demo/melody-lax/index.html:
     <script src="../ordering.js" data-slug="melody-bar-grill" defer></script>   (after menu-data.js + christian-live.js)
   - "🛒 Order pickup" opens a cart drawer over the restaurant's real food menu (window.SSAI_MENU[slug].food, with Christian HQ
     price changes already laid over it by christian-live.js). Quantities, a note per item, name + phone, pickup ASAP / +15 / +30.
   - Pay = POST {type:"order_checkout"} to the Apps Script backend (SSAI_CHRISTIAN.api, Code.gs). The SERVER prices every item from
     its own menu and creates a Stripe Checkout Session; this page only sends item names + quantities, then goes to Stripe's page.
   - Stripe returns to ?order=ok&session_id=… → status view. It asks the backend {type:"order_confirm"} (the backend checks Stripe,
     marks the order paid) and again every 30 s until it's picked up: Paid → Ready → Picked up (set in Christian HQ › 🛒 Orders).
     When the backend says claim:true (once per order) the order's food total earns points via SSAI_EARN (crm.js), like any app order.
   - WHO SEES THE BUTTON: only when the backend reports ordering "on" for this restaurant (GET ?discounts=1 → ord), or with
     ?ordering=1 in the link (testing). Melody's guests don't see it until Christian says yes and ORDERING is set (Code.gs header).
   - Food only (no alcohol online). Guests pay menu price + sales tax, no service fee. Delivery is NOT built (DELIVERY HOOK below).
   - Nothing about the guest is sent anywhere except the order itself (first name + phone for the pickup). */
(function () {
  "use strict";
  var me = document.currentScript, SLUG = (me && me.getAttribute("data-slug")) || "melody-bar-grill";
  var LIVE = window.SSAI_CHRISTIAN || null, API = (LIVE && LIVE.api) || "";
  var MENU = window.SSAI_MENU && window.SSAI_MENU[SLUG]; if (!MENU || !MENU.food) return;
  var NAME = (LIVE && LIVE.defaults && LIVE.defaults[SLUG] && LIVE.defaults[SLUG].name) || (window.CONFIG && CONFIG.name) || "the restaurant";
  var ADDR = (window.CONFIG && CONFIG.address) || "";
  var TAX = 9.75;   // display estimate only; the server adds the real tax line (Script Property ORDER_TAX)
  var CK = "ssai-order-cart-" + SLUG, DK = "ssai-order-me", LK = "ssai-order-last-" + SLUG, AK = "ssai-order-pts";
  var Q = new URLSearchParams(location.search);
  function get(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? d : v; } catch (x) { return d; } }
  function put(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (x) {} }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]; }); }
  function money(n) { return "$" + (Math.round(n * 100) / 100).toFixed(2); }
  function prices() { var o = {}; MENU.food.forEach(function (c) { c.items.forEach(function (it) { o[it[0]] = +it[1]; }); }); return o; }
  var cart = get(CK, []); if (!Array.isArray(cart)) cart = [];   // [{item, qty, note}]
  function saveCart() { put(CK, cart); badge(); }
  function sub() { var P = prices(), s = 0; cart.forEach(function (l) { if (P[l.item] != null) s += P[l.item] * l.qty; }); return Math.round(s * 100) / 100; }
  function count() { return cart.reduce(function (a, l) { return a + l.qty; }, 0); }
  function qtyOf(item) { return cart.filter(function (l) { return l.item === item; }).reduce(function (a, l) { return a + l.qty; }, 0); }
  function add(item, d) { var l = cart.filter(function (x) { return x.item === item; })[0];
    if (!l && d > 0) cart.push({ item: item, qty: 1, note: "" }); else if (l) { l.qty = Math.max(0, Math.min(20, l.qty + d)); if (!l.qty) cart.splice(cart.indexOf(l), 1); } saveCart(); }
  function api(body) {
    if (!API) return Promise.resolve({ ok: false, reason: "Online ordering isn't connected yet." });
    return fetch(API, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); }).catch(function () { return { ok: false, reason: "Can't reach the restaurant right now. Check your connection." }; });
  }
  function dev() { var d = get("ssai-order-dev", ""); if (!/^[A-Za-z0-9_-]{4,40}$/.test(d)) { d = "O" + Math.random().toString(36).slice(2, 12).toUpperCase(); put("ssai-order-dev", d); } return d; }

  // ---------- styles (own prefix, page colors with fallbacks) ----------
  var css = document.createElement("style");
  css.textContent =
    ".sso-fab{position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom));z-index:900;border:0;border-radius:999px;padding:13px 18px;font:800 15px/1 var(--body,system-ui,sans-serif);" +
    "background:var(--gold,#d4af37);color:#1a1400;box-shadow:0 10px 28px #000a;cursor:pointer;display:flex;align-items:center;gap:8px}.sso-fab b{background:#1a1400;color:var(--gold2,#f0d375);border-radius:99px;min-width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;font-size:12.5px;padding:0 6px}" +
    ".sso-inline{display:flex;gap:10px;align-items:center;justify-content:space-between;margin:8px 0 12px;padding:12px 14px;border-radius:14px;border:1px solid var(--gold,#d4af37);background:#d4af3714;color:var(--ink,#f6f1e4);font:600 14px/1.35 var(--body,system-ui)}.sso-inline button{flex:none;border:0;border-radius:12px;padding:10px 14px;font-weight:800;background:var(--gold,#d4af37);color:#1a1400;cursor:pointer}" +
    ".sso-ov{position:fixed;inset:0;z-index:1000;background:#000b;display:flex;align-items:flex-end;justify-content:center}.sso-ov[hidden]{display:none}" +
    ".sso-sh{width:100%;max-width:520px;max-height:94vh;display:flex;flex-direction:column;background:var(--panel,#141e34);color:var(--ink,#f6f1e4);border:1px solid var(--edge,#27324d);border-radius:20px 20px 0 0;font:15px/1.4 var(--body,system-ui,sans-serif)}" +
    ".sso-hd{display:flex;align-items:center;gap:10px;padding:14px 16px 10px;border-bottom:1px solid #ffffff14}.sso-hd h3{margin:0;flex:1;font:700 21px/1.15 var(--display,Georgia,serif)}.sso-hd small{display:block;font:500 12.5px var(--body,system-ui);color:var(--dim,#9aa3b5)}" +
    ".sso-x{border:1px solid var(--edge,#27324d);background:#ffffff10;color:inherit;border-radius:12px;min-width:44px;min-height:44px;font-size:18px;cursor:pointer}" +
    ".sso-bd{overflow:auto;padding:4px 16px 16px;-webkit-overflow-scrolling:touch;flex:1}.sso-ft{padding:12px 16px calc(12px + env(safe-area-inset-bottom));border-top:1px solid #ffffff14}" +
    ".sso-chips{display:flex;gap:6px;overflow-x:auto;padding:10px 0 6px;scrollbar-width:none}.sso-chips::-webkit-scrollbar{display:none}.sso-chips a{flex:none;padding:7px 12px;border-radius:99px;border:1px solid var(--edge,#27324d);color:inherit;text-decoration:none;font-size:13px;font-weight:700}" +
    ".sso-cat{margin:14px 0 4px;font:700 13px var(--body,system-ui);letter-spacing:.14em;text-transform:uppercase;color:var(--gold,#d4af37)}" +
    ".sso-it{display:flex;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid #ffffff10}.sso-it>div{flex:1;min-width:0}.sso-it b{display:block;font-size:15px}.sso-it small{display:block;color:var(--dim,#9aa3b5);font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
    ".sso-pr{font-weight:800;color:var(--gold2,#f0d375);white-space:nowrap}.sso-q{display:flex;align-items:center;gap:6px}.sso-q button{width:40px;height:40px;border-radius:12px;border:1px solid var(--edge,#27324d);background:#ffffff12;color:inherit;font:800 20px/1 system-ui;cursor:pointer}.sso-q span{min-width:20px;text-align:center;font-weight:800}" +
    ".sso-add{min-width:64px;height:40px;border-radius:12px;border:0;background:var(--gold,#d4af37);color:#1a1400;font-weight:800;cursor:pointer}" +
    ".sso-go{width:100%;min-height:52px;border:0;border-radius:14px;background:var(--gold,#d4af37);color:#1a1400;font:800 16px var(--body,system-ui);cursor:pointer;display:flex;justify-content:space-between;align-items:center;padding:0 16px}.sso-go:disabled{opacity:.5;cursor:default}" +
    ".sso-alt{width:100%;min-height:44px;margin-top:8px;border-radius:14px;border:1px solid var(--edge,#27324d);background:transparent;color:inherit;font-weight:700;cursor:pointer}" +
    ".sso-f label{display:block;font-size:13px;color:var(--dim,#9aa3b5);margin:12px 0 4px}.sso-f input{width:100%;box-sizing:border-box;padding:12px;border-radius:12px;border:1px solid var(--edge,#27324d);background:#0b1220;color:inherit;font-size:16px}" +
    ".sso-note{width:100%;box-sizing:border-box;margin-top:6px;padding:9px 10px;border-radius:10px;border:1px solid var(--edge,#27324d);background:#0b1220;color:inherit;font-size:16px}" +
    ".sso-pk{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.sso-pk button{min-height:46px;border-radius:12px;border:1px solid var(--edge,#27324d);background:#ffffff0d;color:inherit;font-weight:800;cursor:pointer}.sso-pk button[aria-pressed=true]{background:var(--gold,#d4af37);color:#1a1400;border-color:var(--gold,#d4af37)}" +
    ".sso-tot{display:flex;justify-content:space-between;padding:3px 0;color:var(--dim,#9aa3b5)}.sso-tot.big{color:var(--ink,#f6f1e4);font-weight:800;font-size:17px}" +
    ".sso-err{color:#ff8a8a;font-weight:700;min-height:20px;margin:8px 0 0}.sso-sm{font-size:12.5px;color:var(--dim,#9aa3b5);margin:8px 0 0}" +
    ".sso-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:12px 0}.sso-steps div{text-align:center;padding:10px 4px;border-radius:12px;border:1px solid var(--edge,#27324d);font-weight:800;font-size:13px;color:var(--dim,#9aa3b5)}.sso-steps div.on{background:#3fbf8f22;border-color:var(--go,#3fbf8f);color:#9ff0cd}" +
    ".sso-code{font:800 26px/1.1 var(--punch,Impact,sans-serif);letter-spacing:.06em;color:var(--gold2,#f0d375)}" +
    "@media (prefers-reduced-motion:no-preference){.sso-ov:not([hidden]) .sso-sh{animation:ssoUp .22s ease-out}}@keyframes ssoUp{from{transform:translateY(30px);opacity:.6}to{transform:none;opacity:1}}";
  document.head.appendChild(css);

  // ---------- shell ----------
  var ov = document.createElement("div"); ov.className = "sso-ov"; ov.hidden = true; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-label", "Order pickup");
  ov.innerHTML = "<div class='sso-sh'><div class='sso-hd'><h3 id='ssoT'></h3><button class='sso-x' type='button' data-sso-x aria-label='Close'>✕</button></div><div class='sso-bd' id='ssoB'></div><div class='sso-ft' id='ssoF'></div></div>";
  document.body.appendChild(ov);
  var fab = document.createElement("button"); fab.type = "button"; fab.className = "sso-fab"; fab.hidden = true; fab.setAttribute("aria-label", "Order pickup");
  document.body.appendChild(fab);
  var VIEW = "menu", PICK = get(DK, {}).pickup || "asap", BUSY = false, POLL = null, LAST = null;
  function $(id) { return document.getElementById(id); }
  function badge() { var n = count(); fab.innerHTML = "🛒 " + (LAST && !n ? "My order" : "Order pickup") + (n ? " <b>" + n + "</b>" : ""); }
  function open(v) { VIEW = v || VIEW; ov.hidden = false; document.documentElement.style.overflow = "hidden"; draw(); }
  function close() { ov.hidden = true; document.documentElement.style.overflow = ""; if (POLL) { clearInterval(POLL); POLL = null; } }
  fab.onclick = function () { open(LAST && !count() ? "status" : "menu"); };

  function drawMenu() {
    $("ssoT").innerHTML = "Order pickup<small>" + esc(NAME) + " · pay now, skip the line</small>";
    var h = "<nav class='sso-chips' aria-label='Menu sections'>" + MENU.food.map(function (c) { return "<a href='#sso-" + esc(c.id) + "'>" + esc(c.name) + "</a>"; }).join("") + "</nav>";
    MENU.food.forEach(function (c) {
      h += "<div class='sso-cat' id='sso-" + esc(c.id) + "'>" + esc(c.name) + "</div>";
      c.items.forEach(function (it) { var q = qtyOf(it[0]);
        h += "<div class='sso-it'><div><b>" + esc(it[0]) + "</b><small>" + esc(it[2]) + "</small></div><span class='sso-pr'>" + money(+it[1]) + "</span>" +
          (q ? "<span class='sso-q'><button type='button' data-sso-m='" + esc(it[0]) + "' aria-label='One less " + esc(it[0]) + "'>−</button><span>" + q + "</span><button type='button' data-sso-a='" + esc(it[0]) + "' aria-label='One more " + esc(it[0]) + "'>+</button></span>"
            : "<button type='button' class='sso-add' data-sso-a='" + esc(it[0]) + "' aria-label='Add " + esc(it[0]) + "'>Add</button>") + "</div>"; }); });
    h += "<p class='sso-sm'>Food only for pickup. Drinks are ordered at the bar. Prices are the menu prices; sales tax is added at checkout.</p>";
    $("ssoB").innerHTML = h;
    var n = count();
    $("ssoF").innerHTML = "<button class='sso-go' type='button' data-sso-v='cart'" + (n ? "" : " disabled") + "><span>" + (n ? "Review order (" + n + ")" : "Add something to start") + "</span><span>" + (n ? money(sub()) : "") + "</span></button>";
  }
  function drawCart() {
    var D = get(DK, {}), P = prices(), s = sub(), tx = Math.round(s * TAX) / 100;
    $("ssoT").innerHTML = "Your pickup order<small>" + esc(NAME) + (ADDR ? " · " + esc(ADDR) : "") + "</small>";
    var h = cart.map(function (l, i) { return "<div class='sso-it' style='flex-wrap:wrap'><div><b>" + esc(l.item) + "</b><small>" + money(P[l.item] || 0) + " each</small></div>" +
      "<span class='sso-q'><button type='button' data-sso-m='" + esc(l.item) + "' aria-label='One less'>−</button><span>" + l.qty + "</span><button type='button' data-sso-a='" + esc(l.item) + "' aria-label='One more'>+</button></span>" +
      "<input class='sso-note' data-sso-n='" + i + "' maxlength='140' placeholder='Note for the kitchen (optional)' value='" + esc(l.note || "") + "' aria-label='Note for " + esc(l.item) + "'></div>"; }).join("");
    if (!cart.length) h = "<p style='margin:16px 0'>Your cart is empty.</p>";
    h += "<div class='sso-f'><label for='ssoN'>Name for the pickup</label><input id='ssoN' autocomplete='given-name' maxlength='40' value='" + esc(D.name || "") + "'>" +
      "<label for='ssoP'>Phone (in case the kitchen needs you)</label><input id='ssoP' type='tel' inputmode='tel' autocomplete='tel' maxlength='20' value='" + esc(D.phone || "") + "'>" +
      "<label>Pickup time</label><div class='sso-pk' role='group' aria-label='Pickup time'>" + [["asap", "ASAP"], ["15", "In 15 min"], ["30", "In 30 min"]].map(function (p) {
        return "<button type='button' data-sso-p='" + p[0] + "' aria-pressed='" + (PICK === p[0]) + "'>" + p[1] + "</button>"; }).join("") + "</div></div>" +
      // DELIVERY HOOK (Phase 2, not built): a "Delivery" choice would go here once DoorDash Drive is approved (Code.gs orderDeliveryHook_).
      "<div style='margin-top:14px'><div class='sso-tot'><span>Food</span><span>" + money(s) + "</span></div><div class='sso-tot'><span>Sales tax (about " + TAX + "%)</span><span>" + money(tx) + "</span></div>" +
      "<div class='sso-tot big'><span>Total</span><span>" + money(s + tx) + "</span></div></div>" +
      "<p class='sso-sm'>No extra fees. You pay on Stripe's secure page; " + esc(NAME) + " gets your order the moment it's paid.</p><div class='sso-err' id='ssoE' role='alert'></div>";
    $("ssoB").innerHTML = h;
    $("ssoF").innerHTML = "<button class='sso-go' type='button' id='ssoPay'" + (cart.length ? "" : " disabled") + "><span>🔒 Pay with card</span><span>" + money(s + tx) + "</span></button><button class='sso-alt' type='button' data-sso-v='menu'>← Add more</button>";
  }
  function drawStatus() {
    var o = LAST && LAST.order;
    $("ssoT").innerHTML = "Your order<small>" + esc(NAME) + "</small>";
    if (!o) { $("ssoB").innerHTML = "<p style='margin:18px 0'>" + esc((LAST && LAST.msg) || "Checking your payment…") + "</p>"; $("ssoF").innerHTML = "<button class='sso-alt' type='button' data-sso-x>Close</button>"; return; }
    var st = o.status, paid = st === "paid" || st === "ready" || st === "picked_up";
    var head = st === "pending" ? "⏳ Waiting for the payment to go through" : st === "expired" ? "This checkout expired. Nothing was charged." : st === "ready" ? "✅ Ready for pickup!" : st === "picked_up" ? "🎉 Picked up. Enjoy!" : "👩‍🍳 Paid. The kitchen has it.";
    var h = "<p style='margin:14px 0 4px;font-size:18px;font-weight:800'>" + head + "</p><div class='sso-code'>" + esc(o.id) + "</div><p class='sso-sm' style='margin-top:2px'>Show this at the counter · " + esc(o.name || "") + " · " + esc(o.pickup || "") +
      (o.pickupAt ? " (" + new Date(o.pickupAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) + ")" : "") + "</p>";
    if (paid) h += "<div class='sso-steps'><div class='on'>Paid</div><div class='" + (st !== "paid" ? "on" : "") + "'>Ready</div><div class='" + (st === "picked_up" ? "on" : "") + "'>Picked up</div></div>";
    h += (o.items || []).map(function (l) { return "<div class='sso-tot' style='color:inherit'><span>" + l.qty + "× " + esc(l.item) + (l.note ? "<br><small style='color:var(--dim,#9aa3b5)'>" + esc(l.note) + "</small>" : "") + "</span></div>"; }).join("");
    h += "<div style='margin-top:8px'><div class='sso-tot'><span>Food</span><span>" + money(o.subtotal) + "</span></div><div class='sso-tot'><span>Tax</span><span>" + money(o.tax) + "</span></div><div class='sso-tot big'><span>" + (paid ? "Paid" : "Total") + "</span><span>" + money(o.total) + "</span></div></div>";
    if (LAST.pts) h += "<p style='margin:10px 0 0;color:var(--gold2,#f0d375);font-weight:800'>" + esc(LAST.pts) + "</p>";
    if (paid && st !== "picked_up") h += "<p class='sso-sm'>This page checks every 30 seconds. " + (ADDR ? "Pick up at " + esc(ADDR) + "." : "") + "</p>";
    $("ssoB").innerHTML = h;
    $("ssoF").innerHTML = st === "expired" || st === "picked_up" ? "<button class='sso-go' type='button' data-sso-new><span>Start a new order</span><span>→</span></button>" : "<button class='sso-alt' type='button' data-sso-x>Close</button>";
  }
  function draw() { if (VIEW === "cart") drawCart(); else if (VIEW === "status") drawStatus(); else drawMenu(); }

  ov.addEventListener("click", function (e) {
    var t = e.target;
    if (t === ov || t.closest("[data-sso-x]")) return close();
    var a = t.closest("[data-sso-a]"), m = t.closest("[data-sso-m]"), v = t.closest("[data-sso-v]"), p = t.closest("[data-sso-p]");
    if (a) { add(a.getAttribute("data-sso-a"), 1); if (navigator.vibrate) try { navigator.vibrate(10); } catch (x) {} return keep(); }
    if (m) { add(m.getAttribute("data-sso-m"), -1); return keep(); }
    if (v) { VIEW = v.getAttribute("data-sso-v"); draw(); $("ssoB").scrollTop = 0; return; }
    if (p) { PICK = p.getAttribute("data-sso-p"); ov.querySelectorAll("[data-sso-p]").forEach(function (b) { b.setAttribute("aria-pressed", b === p ? "true" : "false"); }); return; }
    if (t.closest("[data-sso-new]")) { LAST = null; put(LK, null); VIEW = "menu"; badge(); draw(); return; }
    if (t.closest("#ssoPay")) return pay();
  });
  ov.addEventListener("input", function (e) { var n = e.target.getAttribute && e.target.getAttribute("data-sso-n"); if (n != null && cart[+n]) { cart[+n].note = e.target.value.slice(0, 140); put(CK, cart); } });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !ov.hidden) close(); });
  function keep() { var b = $("ssoB"), y = b.scrollTop; if (VIEW === "cart") { saveDetails(); } draw(); $("ssoB").scrollTop = y; }
  function saveDetails() { var n = $("ssoN"), p = $("ssoP"); if (n && p) put(DK, { name: n.value.trim().slice(0, 40), phone: p.value.trim().slice(0, 20), pickup: PICK }); }

  function pay() {
    if (BUSY) return; saveDetails();
    var D = get(DK, {}), e = $("ssoE"), digits = String(D.phone || "").replace(/\D/g, "");
    if (!cart.length) return;
    if ((D.name || "").length < 2) { e.textContent = "Type your name for the pickup."; $("ssoN").focus(); return; }
    if (!(digits.length === 10 || (digits.length === 11 && digits[0] === "1"))) { e.textContent = "Type a 10-digit phone number."; $("ssoP").focus(); return; }
    BUSY = true; var b = $("ssoPay"); b.disabled = true; b.firstChild.textContent = "Opening secure checkout…"; e.textContent = "";
    api({ type: "order_checkout", slug: SLUG, items: cart.map(function (l) { return { item: l.item, qty: l.qty, note: l.note || "" }; }), name: D.name, phone: D.phone, pickup: PICK, dev: dev() })
      .then(function (r) {
        if (r && r.ok && /^https:\/\/checkout\.stripe\.com\//.test(String(r.url || ""))) { put(LK, { oid: r.id, ts: Date.now() }); location.href = r.url; return; }
        BUSY = false; b.disabled = false; b.firstChild.textContent = "🔒 Pay with card"; e.textContent = (r && r.reason) || "That didn't work. Try again.";
      });
  }

  // ---------- back from Stripe ----------
  function confirmNow(sid) {
    return api({ type: "order_confirm", session_id: sid }).then(function (r) {
      if (!r || !r.ok) { LAST = { sid: sid, msg: (r && r.reason) || "Couldn't check the order. Pull to refresh." }; if (VIEW === "status" && !ov.hidden) draw(); return; }
      var o = r.order, pts = LAST && LAST.pts;
      if (r.claim && window.SSAI_EARN) {   // once per order (the server says so): food total earns points like any app order
        var done = get(AK, {}); if (!done[o.id]) { var er = null; try { er = window.SSAI_EARN(o.subtotal, "🛒 Pickup order " + o.id, { food: o.subtotal, bar: 0 }); } catch (x) {}
          done[o.id] = 1; put(AK, done); if (er) pts = er.saved ? (er.msg || "+" + er.pts + " rewards points added") : "Join Rewards to earn points on orders like this one."; } }
      LAST = { sid: sid, order: o, pts: pts }; put(LK, { oid: o.id, sid: sid, ts: Date.now(), st: o.status });
      if (r.claim) { cart = []; saveCart(); }   // first time the server saw it paid: the cart that was paid for is done
      if (o.status === "picked_up" || o.status === "expired") { if (POLL) { clearInterval(POLL); POLL = null; } }
      badge(); if (VIEW === "status" && !ov.hidden) draw();
    });
  }
  function watch(sid) { VIEW = "status"; open("status"); confirmNow(sid); if (POLL) clearInterval(POLL); POLL = setInterval(function () { if (!document.hidden) confirmNow(sid); }, 30000); }
  var sidQ = Q.get("session_id") || "", ret = Q.get("order");
  if (ret === "ok" && /^cs_(test|live)_[A-Za-z0-9]{10,250}$/.test(sidQ)) { show(true); watch(sidQ); }
  else if (ret === "cancel") { show(true); open("cart"); setTimeout(function () { var e = $("ssoE"); if (e) e.textContent = "Payment canceled. Nothing was charged; your cart is saved."; }, 0); }
  else { var L0 = get(LK, null); if (L0 && L0.sid && Date.now() - L0.ts < 12 * 36e5 && L0.st !== "picked_up" && L0.st !== "expired") { LAST = { sid: L0.sid, msg: "Checking your order…" }; fab.onclick = function () { if (count()) return open("menu"); watch(L0.sid); }; } }
  if (ret) try { history.replaceState(null, "", location.pathname + location.hash); } catch (x) {}

  // ---------- who sees the button ----------
  function onFor() { if (Q.get("ordering") === "1") { try { sessionStorage.setItem("ssai-ordering", "1"); } catch (x) {} return true; }
    try { if (sessionStorage.getItem("ssai-ordering") === "1") return true; } catch (x) {}
    var c = LIVE && LIVE.cached && LIVE.cached(); return !!(c && c.o && c.o[SLUG]); }
  var inl = null;
  function show(on) {
    fab.hidden = !on; badge();
    if (on && !inl) { var host = document.getElementById("food"); if (host && host.parentNode) { inl = document.createElement("div"); inl.className = "sso-inline";
      inl.innerHTML = "<span>🛒 <b>Order ahead for pickup.</b> Pay on your phone, skip the line.</span><button type='button'>Order pickup</button>"; inl.querySelector("button").onclick = function () { open("menu"); };
      host.parentNode.insertBefore(inl, host.nextSibling); } }
    if (inl) inl.hidden = !on;
  }
  if (onFor() || LAST) show(true);
  if (LIVE && LIVE.onChange) LIVE.onChange(function (c) { if (c && c.o && c.o[SLUG]) show(true); });
  window.SSAI_MENU_REDRAW_ORDER = function () { if (!ov.hidden) draw(); badge(); };   // prices changed (christian-live.js)
  window.SSAI_ORDERING = { open: open, show: show, cart: function () { return cart.slice(); } };
})();
