/* SousShift AI — INTERIM MODE for the simple rewards program (Melody + Nalu Vida, Oct 2026).
   Until Toast approves the loyalty integration (~30 days) staff NEVER use their own phones:
     EARN   "Add my visit": the guest photographs the Toast receipt (optional proof) and types the check number, the total
            before tip and the date. 10 pts per $1 land right away, marked "pending review" for the owner to spot-check
            against Toast's daily sales report.
     REDEEM "Show and tap": the guest taps "Use reward" on the ladder, confirms, the points come off right away and a
            full-screen LIVE pass opens (logo, reward, date + ticking clock, 10:00 countdown, moving shimmer so a
            screenshot looks stale, a one-time code). The server taps the matching Toast discount button. When the
            countdown ends the pass turns USED / EXPIRED and can't be shown again.
   Include right after crm.js (needs window.SSAI_CRM, which crm.js only exposes when SSAI_REWARDS.mode === "interim").
   Settings: window.SSAI_REWARDS.interim = {passMinutes, codePrefix, logo, claimCap, claimsPerDay, claimDaysBack,
   redeemsPerDay, photoMaxPx, api}; ladder Toast buttons: SSAI_REWARDS.tiers[i][2] = {button, type, max|amount}.

   SINGLE-USE / ANTI-ABUSE — WHAT REALLY ENFORCES IT
   - interim.api EMPTY (today): everything is enforced on THIS PHONE only (localStorage). Points are deducted before the
     pass shows, a pass can't be reopened after it expires, one reward and one receipt claim per member per day, one
     claim per check number + date. Clearing the browser or using a second phone gets around it; the owner's spot-check
     of the claim log against Toast is the real control, and every redemption and claim is queued (log.queue) for upload.
   - interim.api SET (the Apps Script web app in command-center/clients/<client>/signup-sheet/Code.gs, deployed): every
     pass code, redemption and claim is checked and logged server-side under a script lock BEFORE points move, so a code,
     a check number + date, or a member's daily claim can never be used twice, on any device. If the server can't be
     reached the phone falls back to its own checks and keeps the item in the queue to upload later. */
(function () {
  "use strict";
  var CRM = window.SSAI_CRM, R = window.SSAI_REWARDS || {};
  if (!CRM || R.mode !== "interim") return;
  var I = { passMinutes: 10, codePrefix: "APP", logo: "img/logo.png", claimCap: 150, claimsPerDay: 1, claimDaysBack: 1, redeemsPerDay: 1, photoMaxPx: 900, api: "" };
  for (var k in (R.interim || {})) I[k] = R.interim[k];
  var e = CRM.esc, NAME = CRM.name, PER = R.perDollar || 10, LKEY = CRM.key + "_interim";
  var TZ = "America/Los_Angeles";
  function day(t) { return new Date(t || Date.now()).toLocaleDateString("en-CA", { timeZone: TZ }); }   // YYYY-MM-DD, LA
  function dayBack(n) { return day(Date.now() - n * 864e5); }
  function load() { try { var l = JSON.parse(localStorage.getItem(LKEY) || "null"); if (l && l.redeems) return l; } catch (x) {} return { redeems: [], claims: [], queue: [] }; }
  function store(l) {
    l.redeems = l.redeems.slice(0, 200); l.claims = l.claims.slice(0, 200); l.queue = l.queue.slice(-200);
    l.claims.forEach(function (c, i) { if (i >= 20) delete c.photo; });            // keep only the 20 newest photos on the phone
    for (var tries = 0; tries < 25; tries++) {
      try { localStorage.setItem(LKEY, JSON.stringify(l)); return true; }
      catch (x) { var c = l.claims.filter(function (c) { return c.photo; }).pop(); if (!c) return false; delete c.photo; }   // out of space: drop the oldest photo
    }
    return false;
  }
  function tier(i) { var t = CRM.tiers()[i]; if (!t) return null; var tb = t[2] || {}; return { i: i, pts: t[0], name: t[1], button: tb.button || "App Reward", type: tb.type || "item", max: tb.max, amount: tb.amount }; }
  function code() { return (I.codePrefix || "APP") + "-" + CRM.code4(4); }
  function mmss(ms) { ms = Math.max(0, ms); var s = Math.ceil(ms / 1000); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }

  // ---- backend (Apps Script). POST text/plain = a "simple" request, so the JSON answer is readable cross-origin. ----
  function api(body) {
    if (!I.api) return Promise.resolve(null);
    body.restaurant = NAME; body.slug = CRM.slug;
    return fetch(I.api, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); }).catch(function () { return null; });
  }
  function queue(l, item) { l.queue.push(item); }
  function flush() {   // upload anything that didn't reach the server yet
    if (!I.api) return; var l = load(), left = [];
    var p = Promise.resolve();
    l.queue.forEach(function (q) { p = p.then(function () { return api(JSON.parse(JSON.stringify(q))).then(function (r) { if (!r) left.push(q); }); }); });
    p.then(function () { var l2 = load(); l2.queue = left; store(l2); });
  }

  // ---- styles ----
  var css = document.createElement("style");
  css.textContent =
    ".ir-ov{position:fixed;inset:0;z-index:2147482500;display:flex;align-items:flex-end;justify-content:center;background:rgba(5,10,20,.66);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);font:600 15px/1.45 system-ui,-apple-system,sans-serif;color:#EEF2FF}" +
    ".ir-sh{width:100%;max-width:520px;max-height:92vh;overflow:auto;background:#121C40;border:1px solid #25336A;border-radius:22px 22px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom));box-sizing:border-box}" +
    ".ir-sh h3{margin:0 0 6px;font:900 21px/1.2 system-ui}.ir-sh p{margin:6px 0}.ir-sh label{display:block;margin:10px 0 4px;font-size:13px;color:#C9D2EE}" +
    ".ir-sh input,.ir-sh select{width:100%;box-sizing:border-box;padding:12px;border-radius:12px;border:1px solid #25336A;background:#0B1330;color:#fff;font:600 16px system-ui}" +
    ".ir-two{display:grid;grid-template-columns:1fr 1fr;gap:8px}" +
    ".ir-go{width:100%;margin-top:14px;padding:14px;border:0;border-radius:14px;background:#FFD23F;color:#1a1206;font:900 17px system-ui;cursor:pointer}.ir-go:disabled{opacity:.5}" +
    ".ir-x{width:100%;margin-top:8px;padding:10px;border:0;background:none;color:#C9D2EE;font:700 14px system-ui;text-decoration:underline;cursor:pointer}" +
    ".ir-err{color:#FF8A80;min-height:18px;margin-top:8px;font-size:14px}.ir-fine{font-size:12px;color:#9AA6CC}" +
    ".ir-photo{display:flex;gap:10px;align-items:center}.ir-photo img{width:64px;height:64px;object-fit:cover;border-radius:10px;border:1px solid #25336A}" +
    ".ir-photo .ir-pick{flex:1;padding:12px;border-radius:12px;border:1px dashed #5B6BA8;background:#0B1330;color:#fff;font:800 15px system-ui;text-align:center;cursor:pointer}" +
    ".ir-card{margin:10px 0 0;padding:10px 12px;border-radius:14px;border:1px solid #25336A;background:#0B1330;font-size:13.5px}" +
    ".ir-card b{color:#FFD23F}.ir-card ol{margin:6px 0 4px;padding-left:20px}.ir-card li{margin:3px 0}" +
    ".ir-live{display:block;width:100%;margin-top:10px;padding:12px;border:0;border-radius:14px;background:linear-gradient(90deg,#3DDC97,#2ec4e6);color:#04211a;font:900 16px system-ui;cursor:pointer}" +
    /* the live pass */
    ".ir-pass{position:fixed;inset:0;z-index:2147483200;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:20px 18px calc(20px + env(safe-area-inset-bottom));box-sizing:border-box;color:#fff;text-align:center;overflow:hidden;font-family:system-ui,-apple-system,sans-serif;" +
    "background:linear-gradient(120deg,#1b2a6b,#6b1b5e,#0f6b5c,#7a4a0b,#1b2a6b);background-size:400% 400%;animation:irbg 6s linear infinite}" +
    ".ir-pass:before{content:'';position:absolute;inset:-50%;background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,.28) 50%,transparent 60%);animation:irshine 2.2s linear infinite;pointer-events:none}" +
    ".ir-pass:after{content:'';position:absolute;inset:0;background:repeating-linear-gradient(45deg,rgba(255,255,255,.05) 0 14px,transparent 14px 28px);background-size:40px 40px;animation:irstripe 1.4s linear infinite;pointer-events:none}" +
    "@keyframes irbg{0%{background-position:0% 50%}100%{background-position:400% 50%}}@keyframes irshine{0%{transform:translateX(-40%)}100%{transform:translateX(40%)}}@keyframes irstripe{to{background-position:40px 0}}" +
    ".ir-pass>*{position:relative;z-index:1}.ir-pass img{width:92px;height:92px;object-fit:contain;filter:drop-shadow(0 4px 12px rgba(0,0,0,.5))}" +
    ".ir-pass .ir-k{font:800 12px system-ui;letter-spacing:.18em;text-transform:uppercase;opacity:.9}" +
    ".ir-pass .ir-rw{font:900 clamp(26px,8vw,40px)/1.1 system-ui;max-width:460px;text-shadow:0 3px 14px rgba(0,0,0,.45)}" +
    ".ir-pass .ir-clock{font:800 17px ui-monospace,Menlo,monospace}.ir-pass .ir-cd{font:900 64px/1 ui-monospace,Menlo,monospace;letter-spacing:.04em;text-shadow:0 4px 18px rgba(0,0,0,.5)}" +
    ".ir-pass .ir-code{font:900 30px ui-monospace,Menlo,monospace;letter-spacing:.14em;background:rgba(0,0,0,.35);padding:6px 16px;border-radius:12px;border:2px solid rgba(255,255,255,.6)}" +
    ".ir-pass .ir-srv{max-width:440px;background:#fff;color:#111;border-radius:14px;padding:10px 14px;font:700 15px/1.35 system-ui}.ir-pass .ir-srv b{color:#b3261e}" +
    ".ir-pass .ir-hide{margin-top:6px;border:0;background:rgba(0,0,0,.35);color:#fff;border-radius:999px;padding:10px 18px;font:800 14px system-ui;cursor:pointer}" +
    ".ir-pass.dead{animation:none;background:#2a2d36}.ir-pass.dead:before,.ir-pass.dead:after{display:none}" +
    ".ir-pass .ir-stamp{display:none;font:900 54px system-ui;color:#ff5a4f;border:6px solid #ff5a4f;border-radius:14px;padding:4px 18px;transform:rotate(-10deg);letter-spacing:.06em}.ir-pass.dead .ir-stamp{display:block}" +
    ".ir-pass.dead .ir-cd,.ir-pass.dead .ir-code{opacity:.35;text-decoration:line-through}" +
    /* owner log */
    ".ir-log{all:initial;display:block;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#EEF2FF;background:#121C40;border:1px solid #25336A;border-radius:20px;padding:16px;margin:22px auto;max-width:640px;box-sizing:border-box;line-height:1.45;font-size:14px}" +
    ".ir-log h4{margin:12px 0 6px;font:900 16px system-ui}.ir-log .badge{display:inline-block;background:#FFD23F;color:#1a1206;border-radius:99px;padding:2px 10px;font:900 11px system-ui;letter-spacing:.06em}" +
    ".ir-row{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;padding:8px 0;border-bottom:1px dashed #25336A}" +
    ".ir-row img{width:44px;height:44px;object-fit:cover;border-radius:8px;cursor:zoom-in}.ir-row .ir-ph{width:44px;height:44px;border-radius:8px;background:#0B1330;display:flex;align-items:center;justify-content:center}" +
    ".ir-row small{display:block;color:#9AA6CC}.ir-acts button{border:0;border-radius:10px;padding:7px 10px;margin-left:4px;font:900 12px system-ui;cursor:pointer}" +
    ".ir-ok{background:#3DDC97;color:#04211a}.ir-flag{background:#FF8A80;color:#3a0a06}.ir-st{font:900 11px system-ui;padding:2px 8px;border-radius:99px;background:#25336A}" +
    ".ir-st.pending{background:#FFD23F;color:#1a1206}.ir-st.approved{background:#3DDC97;color:#04211a}.ir-st.flagged{background:#FF8A80;color:#3a0a06}";
  document.head.appendChild(css);

  // ---- generic bottom sheet ----
  function sheet(html) {
    var ov = document.createElement("div"); ov.className = "ir-ov"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("data-scroll-ok", "");
    ov.innerHTML = '<section class="ir-sh">' + html + '</section>';
    ov.addEventListener("click", function (ev) { if (ev.target === ov || ev.target.closest("[data-ir=x]")) ov.remove(); });
    document.body.appendChild(ov); return ov;
  }

  // ================= REDEEM: show and tap =================
  function memberRedeems(m, d) { return load().redeems.filter(function (r) { return r.member === m.id && day(r.ts) === d && r.status !== "void"; }); }
  function activePass() { var now = Date.now(), m = CRM.member(); return load().redeems.filter(function (r) { return m && r.member === m.id && r.status === "live" && r.exp > now; })[0] || null; }
  function sweep() {   // a pass past its 10 minutes is USED / EXPIRED for good
    var l = load(), now = Date.now(), ch = false;
    l.redeems.forEach(function (r) { if (r.status === "live" && r.exp <= now) { r.status = "used"; ch = true; } });
    if (ch) store(l); return ch;
  }
  function redeem(i) {
    var m = CRM.member(), t = tier(i); if (!m || !t) return;
    sweep();
    var live = activePass(); if (live) { openPass(live.code); return; }
    if ((m.stars || 0) < t.pts) { CRM.toast("You need " + (t.pts - (m.stars || 0)).toLocaleString() + " more points"); return; }
    var used = memberRedeems(m, day());
    if (used.length >= I.redeemsPerDay) {
      sheet('<h3>One reward per visit</h3><p>You already used <b>' + e(used[0].reward) + '</b> today (' + e(used[0].code) + '). Your next reward can be used tomorrow.</p><button type="button" class="ir-go" data-ir="x">OK</button>');
      return;
    }
    var ov = sheet('<h3>Use ' + e(t.name) + '?</h3>' +
      '<p style="font-size:17px"><b>Show this to your server. It can only be used once and expires in ' + I.passMinutes + ' minutes.</b></p>' +
      '<p class="ir-fine">' + t.pts.toLocaleString() + ' points come off your balance now. Open it when you\'re ready to order or pay, with your server at the table.</p>' +
      '<button type="button" class="ir-go" data-ir="go">🎟️ Show my pass now</button><div class="ir-err"></div><button type="button" class="ir-x" data-ir="x">Not yet</button>');
    ov.querySelector("[data-ir=go]").onclick = function () {
      var btn = this; btn.disabled = true; btn.textContent = "One moment…";
      var c = code(), now = Date.now(), rec = { type: "interim_redeem", code: c, tier: t.i, reward: t.name, button: t.button, pts: t.pts, ts: now, exp: now + I.passMinutes * 60000,
        member: m.id, memberName: m.name, phone: m.phone || "", status: "live", day: day(now) };
      api(JSON.parse(JSON.stringify(rec))).then(function (r) {
        if (r && !r.ok) { btn.disabled = false; btn.textContent = "🎟️ Show my pass now"; ov.querySelector(".ir-err").textContent = r.reason || "That reward can't be used right now."; return; }
        var l = load(); rec.synced = !!r; if (!r) queue(l, { type: "interim_redeem", code: c, tier: t.i, reward: t.name, button: t.button, pts: t.pts, ts: now, member: m.id, memberName: m.name, day: rec.day });
        l.redeems.unshift(rec); store(l);
        m = CRM.member(); CRM.add(m, -t.pts, "🎟️ Used: " + t.name + " · " + c, "interim_redeem"); CRM.save(m);
        ov.remove(); openPass(c);
      });
    };
  }
  var passEl = null, passTimer = 0;
  function openPass(c) {
    var rec = load().redeems.filter(function (r) { return r.code === c; })[0]; if (!rec) return;
    if (passEl) closePass();
    var el = document.createElement("div"); el.className = "ir-pass"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Live reward pass");
    el.innerHTML = '<img src="' + e(I.logo) + '" alt="' + e(NAME) + '" onerror="this.style.display=\'none\'"><div class="ir-k">' + e(NAME) + ' · live reward</div>' +
      '<div class="ir-rw">' + e(rec.reward) + '</div><div class="ir-clock" data-ir="clock"></div><div class="ir-cd" data-ir="cd"></div><div class="ir-stamp">USED / EXPIRED</div>' +
      '<div class="ir-code">' + e(rec.code) + '</div>' +
      '<div class="ir-srv">Server: ring the Toast button <b>‘' + e(rec.button) + '’</b>' + (rec.button.indexOf("$") < 0 ? ' on the item' : '') + ' and type code <b>' + e(rec.code) + '</b> as the reason.</div>' +
      '<button type="button" class="ir-hide">Hide pass</button>';
    document.body.appendChild(el); passEl = el;
    el.querySelector(".ir-hide").onclick = closePass;
    function tick() {
      var cur = load().redeems.filter(function (r) { return r.code === rec.code; })[0]; if (cur) { rec.exp = cur.exp; rec.status = cur.status === "live" || rec.status !== "live" ? rec.status : cur.status; }   // the stored pass is the truth
      var now = Date.now(), left = rec.exp - now, d = new Date(now);
      el.querySelector("[data-ir=clock]").textContent = d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) + " · " + d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" });
      if (left <= 0 || rec.status !== "live") {
        el.classList.add("dead"); el.querySelector("[data-ir=cd]").textContent = "0:00";
        if (rec.status === "live") { var l = load(); l.redeems.forEach(function (r) { if (r.code === rec.code) r.status = "used"; }); store(l); rec.status = "used"; CRM.redraw(); }
        return;
      }
      el.querySelector("[data-ir=cd]").textContent = mmss(left);
    }
    tick(); passTimer = setInterval(tick, 250);
  }
  function closePass() { clearInterval(passTimer); if (passEl) passEl.remove(); passEl = null; CRM.redraw(); }

  // ================= EARN: Add my visit (receipt claim) =================
  function downscale(file, cb) {
    var url = URL.createObjectURL(file), im = new Image();
    im.onload = function () { var s = Math.min(1, I.photoMaxPx / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement("canvas");
      c.width = Math.round(im.naturalWidth * s); c.height = Math.round(im.naturalHeight * s); c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); cb(c.toDataURL("image/jpeg", 0.6)); };
    im.onerror = function () { URL.revokeObjectURL(url); cb(""); };
    im.src = url;
  }
  function claim() {
    var m = CRM.member();
    if (!m) { CRM.join(function () { setTimeout(claim, 300); }); return; }
    var mine = load().claims.filter(function (c) { return c.member === m.id && day(c.ts) === day() && c.status !== "void"; });
    if (mine.length >= I.claimsPerDay) {
      sheet('<h3>Visit already added today</h3><p>You added check <b>#' + e(mine[0].check) + '</b> today (+' + mine[0].pts + ' pts). One receipt per day: come back tomorrow.</p><button type="button" class="ir-go" data-ir="x">OK</button>');
      return;
    }
    var opts = ""; for (var b = 0; b <= I.claimDaysBack; b++) opts += '<option value="' + dayBack(b) + '">' + (b === 0 ? "Today" : b === 1 ? "Yesterday" : b + " days ago") + ' (' + new Date(dayBack(b) + "T12:00").toLocaleDateString([], { month: "short", day: "numeric" }) + ')</option>';
    var photo = "", ov = sheet('<h3>🧾 Add my visit</h3><p>' + PER + ' points for every $1 before tip. Use the receipt from ' + e(NAME) + '.</p>' +
      '<label>Receipt photo (optional, helps us confirm it)</label><div class="ir-photo"><label class="ir-pick" style="margin:0">📷 Snap the receipt<input type="file" accept="image/*" capture="environment" data-ir="file" style="display:none"></label><img data-ir="thumb" alt="" style="display:none"></div>' +
      '<label>Check number (top of the Toast receipt)</label><input data-ir="check" inputmode="numeric" maxlength="12" autocomplete="off" placeholder="e.g. 142">' +
      '<div class="ir-two"><div><label>Total before tip ($)</label><input data-ir="total" inputmode="decimal" maxlength="8" placeholder="48.50"></div><div><label>Date</label><select data-ir="date">' + opts + '</select></div></div>' +
      '<button type="button" class="ir-go" data-ir="go">Add my points</button><div class="ir-err" role="alert"></div>' +
      '<p class="ir-fine">One receipt per day. Each check can only be added once. Up to $' + I.claimCap + ' per check. Claims are checked against ' + e(NAME) + '\'s sales report; made-up checks lose their points.</p>' +
      '<button type="button" class="ir-x" data-ir="x">Cancel</button>');
    var q = function (k) { return ov.querySelector("[data-ir=" + k + "]"); }, err = ov.querySelector(".ir-err");
    q("file").onchange = function () { var f = this.files && this.files[0]; if (!f) return; downscale(f, function (d) { photo = d; if (d) { q("thumb").src = d; q("thumb").style.display = "block"; } }); };
    q("go").onclick = function () {
      var btn = this, chk = q("check").value.trim().replace(/^#/, "").toUpperCase(), tot = Math.round(parseFloat(q("total").value.replace(/[$,\s]/g, "")) * 100) / 100, dt = q("date").value;
      err.textContent = "";
      if (!/^[A-Z0-9-]{1,12}$/.test(chk)) { err.textContent = "Type the check number from your receipt."; return; }
      if (!(tot > 0)) { err.textContent = "Type the total before tip, like 48.50."; return; }
      var ok = []; for (var b = 0; b <= I.claimDaysBack; b++) ok.push(dayBack(b)); if (ok.indexOf(dt) < 0) { err.textContent = "Only today's or yesterday's checks can be added."; return; }
      var l = load();
      if (l.claims.some(function (c) { return c.check === chk && c.date === dt && c.status !== "void"; })) { err.textContent = "Check #" + chk + " from that day was already added."; return; }
      m = CRM.member();
      if (l.claims.some(function (c) { return c.member === m.id && day(c.ts) === day() && c.status !== "void"; })) { err.textContent = "You already added a visit today."; return; }
      var capped = tot > I.claimCap, base = Math.min(tot, I.claimCap), pts = Math.floor(base * PER), now = Date.now();
      var rec = { type: "interim_claim", id: "C" + now.toString(36) + CRM.code4(3), check: chk, date: dt, total: tot, credited: base, pts: pts, ts: now, member: m.id, memberName: m.name, phone: m.phone || "",
        status: "pending", capped: capped };
      btn.disabled = true; btn.textContent = "Checking…";
      api({ type: "interim_claim", id: rec.id, check: chk, date: dt, total: tot, pts: pts, ts: now, member: m.id, memberName: m.name, photo: photo }).then(function (r) {
        if (r && !r.ok) { btn.disabled = false; btn.textContent = "Add my points"; err.textContent = r.reason || "That check can't be added."; return; }
        var l2 = load(); rec.synced = !!r; rec.photo = photo;
        if (!r) queue(l2, { type: "interim_claim", id: rec.id, check: chk, date: dt, total: tot, pts: pts, ts: now, member: m.id, memberName: m.name });   // photo stays on the phone
        l2.claims.unshift(rec); store(l2);
        m = CRM.member(); CRM.add(m, pts, "🧾 Visit · check #" + chk + " · $" + base.toFixed(2) + (capped ? " (capped)" : "") + " · pending review", "interim_claim");
        m.visits = (m.visits || 0) + 1; m.last = now; CRM.save(m);
        ov.remove(); CRM.toast("+" + pts.toLocaleString() + " points added · check #" + chk); drawLog();
      });
    };
  }

  // ================= guest copy: "Until Toast is connected" (rewards card, How-to-earn sheet, game end screens) =================
  function explainerHTML(dark) {
    return '<div class="ir-card"' + (dark ? ' style="text-align:left;margin:10px auto 0;max-width:420px"' : '') + '><b>⏳ Until Toast is connected</b><ol>' +
      '<li><b>Earn:</b> tap <b>\u201cAdd my visit\u201d</b> and snap your receipt. ' + PER + ' points per $1 before tip.</li>' +
      '<li><b>Redeem:</b> tap <b>\u201cUse reward\u201d</b> and show the live pass; your server taps the reward button in Toast. Works once, lasts ' + I.passMinutes + ' minutes.</li>' +
      '<li>One reward and one receipt per visit.</li></ol>' +
      '<span class="ir-fine">Automatic once Toast is switched on. Your points carry over.</span></div>';
  }
  // the Toast discount buttons the owner creates (ladder + Melody's Just Landed), same names as kit/toast-interim.html
  function toastButtons() {
    var out = CRM.tiers().map(function (t) { var b = t[2] || {}; return { pts: t[0], reward: t[1], button: b.button || "App Reward", how: b.type === "fixed" ? "$" + Number(b.amount || 0).toFixed(2) + " off the check" : "100% off one item" + (b.max ? " (up to $" + Number(b.max).toFixed(2) + ")" : "") }; });
    var jl = R.justLanded && R.justLanded.toast; if (jl) out.push({ pts: 0, reward: "Just Landed: " + R.justLanded.offer, button: jl.button, how: (jl.percent || 10) + "% off the check" });
    return out;
  }
  // ================= live-pass button on the rewards card =================
  function cardHTML(m) {
    sweep(); var live = activePass();
    return (live ? '<button type="button" class="ir-live" onclick="SSAI_INTERIM.openPass(\'' + e(live.code) + '\')">🎟️ Show my live pass · ' + mmss(live.exp - Date.now()) + ' left</button>' : '') +
      explainerHTML();
  }

  // ================= manager: Interim log =================
  var logEl = document.createElement("section"); logEl.className = "ir-log"; logEl.id = "interim-log";
  var server = null;   // rows from the Apps Script log (any device), when interim.api is set
  function fetchServer() {
    if (!I.api) return; fetch(I.api + (I.api.indexOf("?") < 0 ? "?" : "&") + "list=interim&slug=" + encodeURIComponent(CRM.slug) + "&day=" + day())
      .then(function (r) { return r.json(); }).then(function (j) { server = j; drawLog(); }).catch(function () {});
  }
  function drawLog() {
    sweep(); var l = load(), td = day(), t2 = function (ts) { return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); };
    var rd = l.redeems.filter(function (r) { return day(r.ts) === td; }), cl = l.claims.filter(function (c) { return day(c.ts) === td || c.status === "pending"; });
    if (server && server.redeems) server.redeems.forEach(function (r) { if (!rd.some(function (x) { return x.code === r.code; })) rd.push(r); });
    if (server && server.claims) server.claims.forEach(function (c) { if (!cl.some(function (x) { return x.id === c.id; })) cl.push(c); });
    logEl.innerHTML = '<span class="badge">MANAGER · INTERIM LOG</span><h4 style="margin-top:8px">📋 Today at ' + e(NAME) + ' · ' + e(td) + '</h4>' +
      '<p style="margin:0;color:#C9D2EE">Spot-check receipt claims against Toast\'s daily sales report (check # + total). Servers never need this page.</p>' +
      '<h4>🔘 Toast buttons to create (' + toastButtons().length + ')</h4>' + toastButtons().map(function (b) { return '<div class="ir-row"><div class="ir-ph">🔘</div><div><b>' + e(b.button) + '</b><small>' + (b.pts ? b.pts.toLocaleString() + ' pts · ' : '') + e(b.reward) + ' · ' + e(b.how) + '</small></div><span></span></div>'; }).join("") +
      '<p class="ir-fine">About 10 minutes to add in Toast Web, done together with Antidote. Step-by-step sheet: <a href="' + e(I.kit || "") + '" target="_blank" rel="noopener" style="color:#7FB3FF">Toast setup: interim reward buttons</a>.</p>' +
      '<h4>🎟️ Rewards used (' + rd.length + ')</h4>' +
      (rd.map(function (r) { return '<div class="ir-row"><div class="ir-ph">🎟️</div><div><b>' + e(r.code) + '</b> · ' + e(r.reward) + '<small>' + t2(r.ts) + ' · ' + e(r.memberName || "") + ' · Toast: ' + e(r.button) + '</small></div><span class="ir-st ' + (r.status === "live" ? "pending" : "approved") + '">' + (r.status === "live" ? "LIVE" : "USED") + '</span></div>'; }).join("") || '<p class="ir-fine">None yet today.</p>') +
      '<h4>🧾 Receipt claims (' + cl.length + ')</h4>' +
      (cl.map(function (c) { return '<div class="ir-row">' + (c.photo ? '<img src="' + c.photo + '" alt="receipt" data-ir-zoom>' : c.photoUrl ? '<a class="ir-ph" href="' + e(c.photoUrl) + '" target="_blank" rel="noopener">📷</a>' : '<div class="ir-ph">🧾</div>') +
        '<div><b>#' + e(c.check) + '</b> · $' + Number(c.total).toFixed(2) + ' → +' + c.pts + ' pts<small>' + e(c.date) + ' · ' + t2(c.ts) + ' · ' + e(c.memberName || "") + (c.capped ? ' · over $' + I.claimCap + ', capped' : '') + (c.photo || c.photoUrl ? '' : ' · no photo') + '</small></div>' +
        '<div class="ir-acts">' + (c.status === "pending" ? '<button type="button" class="ir-ok" data-ir-ok="' + e(c.id) + '">Approve</button><button type="button" class="ir-flag" data-ir-flag="' + e(c.id) + '">Flag</button>' : '<span class="ir-st ' + c.status + '">' + c.status.toUpperCase() + '</span>') + '</div></div>'; }).join("") || '<p class="ir-fine">None yet today.</p>') +
      '<p class="ir-fine" style="margin-top:10px">' + (I.api ? 'Synced with the Google Sheet log, so it shows every phone.' + (l.queue.length ? ' ' + l.queue.length + ' item(s) waiting to upload.' : '') :
        'Demo / not connected yet: this log lives on this phone only, and single use is enforced per phone. Connect the Google Sheet (interim.api) to log every phone and block reuse across devices.') +
      ' Flagged claims: take the points back from the customer list above.</p>';
  }
  logEl.addEventListener("click", function (ev) {
    var z = ev.target.closest("[data-ir-zoom]"); if (z) { var w = window.open(); if (w) w.document.write('<img src="' + z.src + '" style="max-width:100%">'); return; }
    var b = ev.target.closest("[data-ir-ok],[data-ir-flag]"); if (!b) return;
    var id = b.getAttribute("data-ir-ok") || b.getAttribute("data-ir-flag"), st = b.hasAttribute("data-ir-ok") ? "approved" : "flagged", l = load();
    l.claims.forEach(function (c) { if (c.id === id) c.status = st; });
    if (server && server.claims) server.claims.forEach(function (c) { if (c.id === id) c.status = st; });
    if (!api({ type: "interim_review", id: id, status: st })) queue(l, { type: "interim_review", id: id, status: st });
    store(l); drawLog();
  });
  function mountLog() { var own = document.getElementById("crm-owner"); if (own && own.parentNode && logEl.parentNode !== own.parentNode) own.parentNode.insertBefore(logEl, own.nextSibling); drawLog(); }

  window.SSAI_INTERIM = { redeem: redeem, claim: claim, openPass: openPass, closePass: closePass, cardHTML: cardHTML, explainerHTML: explainerHTML, toastButtons: toastButtons, log: drawLog,
    data: load, cfg: I,
    // test hooks
    expireNow: function () { var l = load(); l.redeems.forEach(function (r) { if (r.status === "live") r.exp = Date.now(); }); store(l); } };
  sweep(); CRM.redraw(); mountLog(); fetchServer(); flush();
  setInterval(function () { if (sweep()) { CRM.redraw(); drawLog(); } }, 5000);
})();
