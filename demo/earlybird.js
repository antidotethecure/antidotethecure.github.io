/* SousShift AI · EARLY-BIRD / FOUNDING-MEMBER GIFT (Melody + Nalu Vida, opt-in from Christian HQ, OFF by default).
   Include after interim.js:  <script src="../earlybird.js?v=bo1"></script>
   Everything is decided by the backend (Apps Script, Code.gs "EARLY-BIRD"): who qualifies (members the server first saw
   before the go-live date), the wheel result, the raffle draw, the 3-day window and single use. This file only shows the
   member's state and asks the server to act. With no backend URL (today) it does nothing at all.
   Modes: fixed (one gift for every early member) · wheel (one server-side spin, every spin wins) · raffle (auto-entered;
   winners drawn in Christian HQ). Redeeming = the same live show-and-tap pass (demo/interim.js), Toast button
   "App Reward – Early Bird Gift". Test hook for screenshots only: window.SSAI_EB_FAKE(body) → Promise (never set live). */
(function () {
  "use strict";
  var CRM = window.SSAI_CRM, R = window.SSAI_REWARDS || {}, API = (R.interim && R.interim.api) || "", FAKE = window.SSAI_EB_FAKE;
  if (!CRM || (!API && !FAKE)) return;
  var e = CRM.esc, NAME = CRM.name, DEVK = CRM.key + "_dev", S = null, el = null;
  function dev() { try { return localStorage.getItem(DEVK) || ""; } catch (x) { return ""; } }
  function call(body) {
    body.slug = CRM.slug; var m = CRM.member(); body.member = m ? m.id : ""; body.dev = dev();
    if (FAKE) return FAKE(body);
    if (body.type === "status") return fetch(API + (API.indexOf("?") < 0 ? "?" : "&") + "eb=1&slug=" + encodeURIComponent(body.slug) + "&member=" + encodeURIComponent(body.member) + "&dev=" + encodeURIComponent(body.dev) + "&t=" + Date.now())
      .then(function (r) { return r.json(); }).catch(function () { return null; });
    return fetch(API, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(body) }).then(function (r) { return r.json(); }).catch(function () { return null; });
  }
  function dstr(ymd) { var d = new Date(ymd + "T12:00:00"); return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }); }
  function until(t) { return new Date(t).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) + ", " + new Date(t).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); }
  var css = document.createElement("style");
  css.textContent = ".eb-card{all:initial;display:block;box-sizing:border-box;max-width:640px;margin:16px auto;padding:16px;border-radius:20px;font:600 15px/1.45 system-ui,-apple-system,sans-serif;color:#1a1206;" +
    "background:linear-gradient(135deg,#FFE27A,#FFC83D 55%,#FF9F43);box-shadow:0 10px 30px #0006;position:relative;overflow:hidden}" +
    ".eb-card h3{margin:2px 0 6px;font:900 21px/1.2 system-ui}.eb-card .k{font:900 11px system-ui;letter-spacing:.14em;text-transform:uppercase;opacity:.75}" +
    ".eb-card p{margin:6px 0}.eb-card small{display:block;font-size:12px;opacity:.8;margin-top:6px}.eb-card ul{margin:6px 0;padding-left:20px}" +
    ".eb-go{display:block;width:100%;margin-top:10px;padding:13px;border:0;border-radius:14px;background:#1a1206;color:#FFE27A;font:900 17px system-ui;cursor:pointer}" +
    ".eb-st{display:inline-block;margin-top:6px;padding:3px 12px;border-radius:99px;background:#1a1206;color:#fff;font:900 13px system-ui;letter-spacing:.08em}" +
    ".eb-wheel{width:220px;height:220px;margin:10px auto;border-radius:50%;border:6px solid #1a1206;position:relative;transition:transform 3.6s cubic-bezier(.17,.67,.2,1)}" +
    ".eb-ptr{width:0;height:0;margin:0 auto -14px;border-left:14px solid transparent;border-right:14px solid transparent;border-top:24px solid #1a1206;position:relative;z-index:2}" +
    ".eb-lab{position:absolute;left:50%;top:50%;width:96px;margin-left:0;transform-origin:0 0;font:800 11px/1.1 system-ui;color:#1a1206}";
  document.head.appendChild(css);
  var COLORS = ["#ffffff", "#ffd1dc", "#c9f0ff", "#d9ffc9", "#ffe9b0", "#e5d4ff", "#ffcfb0", "#c9fff1"];
  function wheelHTML(sl) {
    var acc = 0, stops = sl.map(function (s, i) { var a = acc; acc += s[1]; return COLORS[i % 8] + " " + (a * 3.6) + "deg " + (acc * 3.6) + "deg"; }).join(","), a2 = 0;
    return '<div class="eb-ptr"></div><div class="eb-wheel" data-eb="wheel" style="background:conic-gradient(' + stops + ')">' + sl.map(function (s) { var mid = (a2 + s[1] / 2) * 3.6 - 90; a2 += s[1];
      return '<span class="eb-lab" style="transform:rotate(' + mid + 'deg) translate(14px,-6px)">' + e(s[0]) + '</span>'; }).join("") + '</div>';
  }
  function rules(c) {
    if (c.mode === "wheel") return '<small>🎡 Every spin wins one of: ' + c.slices.map(function (s) { return e(s[0]) + ' (' + s[1] + '%)'; }).join(", ") + '. One spin per early member. No purchase necessary.</small>';
    if (c.mode === "raffle") return '<small>🎟️ Founding-member raffle: every member who joined before ' + e(dstr(c.golive)) + ' is entered automatically. Prizes: ' + c.items.map(function (x) { return x[1] + ' × ' + e(x[0]); }).join(", ") + '. Draw on ' + e(dstr(c.drawDate || c.golive)) + '. Winners chosen at random by ' + e(NAME) + '. No purchase necessary.</small>';
    return '<small>One per early member. Use it within ' + c.days + ' days of tapping “Use my gift”.</small>';
  }
  function draw() {
    if (!S || !S.on || !S.state || S.state === "none") { if (el) el.remove(); el = null; return; }
    var c = S.cfg, st = S.state, h = '<span class="k">' + e(NAME) + ' · founding member</span>';
    var what = c.mode === "wheel" ? "a free spin: every spin wins" : c.mode === "raffle" ? "an entry in the founding-member raffle" : "free " + e(c.gift.replace(/^free\s+/i, ""));
    if (st === "early") h += '<h3>🎁 You joined early: ' + what + '</h3><p>It starts on <b>' + e(dstr(c.golive)) + '</b>. ' + (c.mode === "raffle" ? 'You\'re already entered.' : 'Come in any time after that, then tap <b>Use my gift</b> at the table.') + '</p>';
    else if (st === "ready" && c.mode === "wheel") h += '<h3>🎡 You joined early: spin the wheel!</h3>' + wheelHTML(c.slices) + '<button type="button" class="eb-go" data-eb="act">🎡 Spin now</button>';
    else if (st === "ready") h += '<h3>🎁 You joined early: ' + what + '</h3><p>Tap when you\'re at ' + e(NAME) + ' (or planning to come in): you then have <b>' + c.days + ' days</b> to use it.</p><button type="button" class="eb-go" data-eb="act">🎁 Use my gift · I\'m here</button>';
    else if (st === "entered") h += '<h3>🎟️ You\'re in the founding-member raffle</h3><p>Draw on <b>' + e(dstr(c.drawDate || c.golive)) + '</b>. Winners see their prize right here.</p>';
    else if (st === "won") h += '<h3>🏆 You won ' + e(S.item) + '!</h3><p>Tap when you\'re coming in: you then have <b>' + c.days + ' days</b> to use it.</p><button type="button" class="eb-go" data-eb="act">🎁 Use my gift · I\'m here</button>';
    else if (st === "lost") h += '<h3>💛 Thanks for joining early!</h3><p>The raffle winners have been drawn. Keep earning points: your rewards are below.</p>';
    else if (st === "active") h += '<h3>🎁 Your free ' + e(S.item.replace(/^free\s+/i, "")) + '</h3><p>Use by <b>' + e(until(S.until)) + '</b>. Show the live pass to your server at the table.</p><button type="button" class="eb-go" data-eb="pass">🎟️ Show my pass now</button>';
    else if (st === "used") h += '<h3>🎁 ' + e(S.item) + '</h3><span class="eb-st">USED</span><p>Thanks for being a founding member!</p>';
    else if (st === "expired") h += '<h3>🎁 ' + e(S.item) + '</h3><span class="eb-st">EXPIRED</span><p>The ' + c.days + '-day window ran out.</p>';
    else return;
    h += rules(c) + '<div data-eb="err" style="color:#7a0010;font-weight:800;margin-top:6px" role="alert"></div>';
    if (!el) { el = document.createElement("section"); el.className = "eb-card"; el.id = "eb-card"; el.addEventListener("click", click); }
    el.innerHTML = h;
    var j = document.getElementById("crm-join"); if (j && j.parentNode && el.parentNode !== j.parentNode) j.parentNode.insertBefore(el, j);
  }
  function err(t) { var x = el && el.querySelector("[data-eb=err]"); if (x) x.textContent = t || ""; }
  function click(ev) {
    var b = ev.target.closest("[data-eb=act],[data-eb=pass]"); if (!b) return;
    b.disabled = true; err("");
    if (b.getAttribute("data-eb") === "act") {
      call({ type: "eb_activate" }).then(function (r) {
        b.disabled = false; if (r && r.prizeDay && SSAI_INTERIM.tomorrow) { SSAI_INTERIM.tomorrow(r.had || "", "", "Your early-bird gift waits for you."); return; }   // one prize per day (server rule)
        if (!r || !r.ok) { err((r && r.reason) || "Can't reach " + NAME + " right now. Try again."); return; }
        var finish = function () { S.state = "active"; S.item = r.item; S.until = r.until; draw(); CRM.toast("🎁 " + r.item + " · use it within " + S.cfg.days + " days"); };
        if (S.cfg.mode === "wheel" && S.state === "ready" && r.slice >= 0) {   // animate to the slice the SERVER picked
          var w = el.querySelector("[data-eb=wheel]"), acc = 0; S.cfg.slices.forEach(function (s, i) { if (i < r.slice) acc += s[1]; });
          var mid = (acc + S.cfg.slices[r.slice][1] / 2) * 3.6; w.style.transform = "rotate(" + (5 * 360 + 360 - mid) + "deg)"; setTimeout(finish, 3800);
        } else finish();
      });
      return;
    }
    if (window.SSAI_INTERIM && SSAI_INTERIM.usedToday()) { b.disabled = false; SSAI_INTERIM.giftPass(S.item, S.cfg.button, ""); return; }   // shows "one reward per visit"
    var code = SSAI_INTERIM.newCode();
    call({ type: "eb_redeem", code: code, eid: code }).then(function (r) {   // eid: Scout rejects a re-sent pass ("Already counted")
      b.disabled = false; if (r && r.prizeDay && SSAI_INTERIM.tomorrow) { SSAI_INTERIM.tomorrow(r.had || "", "", "Use your gift on your next visit, before it expires."); return; }   // one prize per day (server rule)
      if (!r || !r.ok) { err(r && r.dup ? "Already counted ✓ This gift was already used, so nothing changed." : (r && r.reason) || "Can't reach " + NAME + " right now. Try again at the table."); if (r && r.state) { S.state = r.state; draw(); } return; }
      SSAI_INTERIM.giftPass(S.item, S.cfg.button, r.code || code, function () { S.state = "used"; draw(); });
    });
  }
  function load() { if (!CRM.member()) { S = null; draw(); return; } call({ type: "status" }).then(function (r) { if (r && r.ok) { S = r; draw(); } }); }
  window.SSAI_EB = { reload: load, state: function () { return S; } };
  load();
})();
