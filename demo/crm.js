/* Second Shift AI — "Join the club" signup + the owner's customer list, for every demo page.
   Include once (before nearby.js so it sits above the map):
     <script>window.CRM_CFG={name:"StormBurger", offer:"Free fries with your next burger", mount:"#optional-selector"};</script>
     <script src="../crm.js"></script>
   DEMO MODE: what a visitor types is saved only on their own phone (localStorage) and shown in the owner
   list next to sample customers, so the flow can be shown without collecting anyone's real data.
   Live, the same form writes to the business's own customer database, which they own and can export. */
(function () {
  "use strict";
  var C = window.CRM_CFG || {};
  var NAME = C.name || (window.NEARBY && window.NEARBY.name) || document.title.split(" — ")[0];
  var OFFER = C.offer || "10% off your next visit";
  var SLUG = NAME.toLowerCase().replace(/[^a-z0-9]+/g, "-"), KEY = "ssai_crm_" + SLUG;
  var e = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  var css = [
    ".crm-card{all:initial;display:block;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#EEF2FF;background:#121C40;border:1px solid #25336A;border-radius:20px;padding:18px 16px;margin:22px auto;max-width:640px;box-sizing:border-box;line-height:1.45;text-align:left}",
    ".crm-card *{box-sizing:border-box;font-family:inherit}",
    ".crm-card .k{font:800 11px ui-monospace,Menlo,monospace;letter-spacing:.16em;text-transform:uppercase;color:#FFD23F}",
    ".crm-card h3{font-size:21px;font-weight:900;margin:3px 0 4px;color:#EEF2FF}",
    ".crm-card p{margin:0 0 12px;color:#9AA6CC;font-size:14px}",
    ".crm-card label{display:block;font-size:12.5px;font-weight:700;color:#9AA6CC;margin:10px 0 4px}",
    ".crm-card input,.crm-card select{width:100%;font-size:16px;color:#EEF2FF;background:#070B1E;border:1px solid #25336A;border-radius:12px;padding:11px}",
    ".crm-card .two{display:grid;grid-template-columns:1fr 1fr;gap:8px}",
    ".crm-card .ok{display:flex;gap:9px;align-items:flex-start;font-size:12.5px;color:#C9D2EE;margin-top:12px;font-weight:500}",
    ".crm-card .ok input{width:20px;height:20px;flex:none;accent-color:#E8582A;margin-top:1px;padding:0}",
    ".crm-card .go{display:block;width:100%;margin-top:12px;border:0;border-radius:14px;padding:14px;font-size:16px;font-weight:900;color:#fff;background:#E8582A;box-shadow:0 8px 24px #e8582a55;cursor:pointer}",
    ".crm-card .err{color:#FF6B5E;font-size:13px;min-height:1em;margin-top:8px}",
    ".crm-gift{display:flex;gap:12px;align-items:center;background:linear-gradient(135deg,#E8582A,#FFD23F);color:#1a0d00;border-radius:16px;padding:12px 14px;margin-bottom:12px;font-weight:800;font-size:15px}",
    ".crm-gift b{font-size:30px}",
    ".crm-win{text-align:center;background:#070B1E;border:2px dashed #FFD23F;border-radius:18px;padding:18px;animation:crmPop .45s cubic-bezier(.2,1.4,.4,1)}",
    ".crm-win .code{font:900 28px ui-monospace,Menlo,monospace;letter-spacing:.12em;color:#FFD23F;margin:6px 0}",
    ".crm-win small{display:block;color:#9AA6CC;margin-top:6px}",
    "@keyframes crmPop{from{transform:scale(.7);opacity:0}to{transform:none;opacity:1}}",
    ".crm-own{border-color:#3DDC97;background:#0d1733}",
    ".crm-own .badge{display:inline-block;font-size:11px;font-weight:800;letter-spacing:.06em;color:#0b2a1c;background:#3DDC97;border-radius:99px;padding:3px 9px;margin-bottom:6px}",
    ".crm-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:8px 0 12px}",
    ".crm-stats div{background:#070B1E;border:1px solid #25336A;border-radius:12px;padding:8px 4px;text-align:center;font-size:11px;color:#9AA6CC;line-height:1.25}",
    ".crm-stats b{display:block;font-size:20px;color:#EEF2FF}",
    ".crm-seg{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none}.crm-seg::-webkit-scrollbar{display:none}",
    ".crm-seg button{flex:none;border:1px solid #25336A;background:#070B1E;color:#9AA6CC;border-radius:99px;padding:7px 11px;font-size:12.5px;font-weight:700;cursor:pointer}",
    ".crm-seg button.on{background:#3DDC97;border-color:#3DDC97;color:#0b2a1c}",
    ".crm-list{margin-top:8px;max-height:430px;overflow:auto;border:1px solid #25336A;border-radius:14px}",
    ".crm-row{display:grid;grid-template-columns:38px 1fr auto;gap:2px 10px;padding:10px 12px;border-bottom:1px solid #25336A;font-size:13px;align-items:center}",
    ".crm-row:last-child{border-bottom:0}.crm-row.you{background:#ffd23f14;animation:crmPop .5s}",
    ".crm-av{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;font-weight:900;color:#070B1E;grid-row:span 2}",
    ".crm-row .nm{font-weight:800;font-size:14px;color:#EEF2FF}.crm-row .ct{color:#9AA6CC;font-size:12px;grid-column:2/4;overflow-wrap:anywhere}",
    ".crm-row .st{font-size:12px;color:#FFD23F;font-weight:800;text-align:right;white-space:nowrap}",
    ".crm-tag{display:inline-block;font-size:10.5px;font-weight:800;border-radius:99px;padding:2px 7px;margin-left:4px;vertical-align:1px}",
    ".t-vip{background:#ffd23f26;color:#FFD23F}.t-risk{background:#ff6b5e26;color:#FF8F85}.t-new{background:#3ddc9726;color:#3DDC97}.t-bday{background:#b04af733;color:#D7A6FF}.t-you{background:#E8582A;color:#fff}",
    ".crm-acts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}",
    ".crm-acts button{border:1px solid #25336A;background:#1a2656;color:#EEF2FF;border-radius:12px;padding:11px;font-size:13.5px;font-weight:800;cursor:pointer}",
    ".crm-acts button.hot{background:#3DDC97;border-color:#3DDC97;color:#0b2a1c}",
    ".crm-compose{display:none;margin-top:10px;background:#070B1E;border:1px solid #3DDC97;border-radius:14px;padding:12px}",
    ".crm-compose textarea{width:100%;min-height:74px;font-size:15px;color:#EEF2FF;background:#121C40;border:1px solid #25336A;border-radius:10px;padding:10px;resize:vertical}",
    ".crm-bub{background:#1a2656;border-radius:14px 14px 14px 4px;padding:9px 12px;margin-top:8px;font-size:13.5px}",
    ".crm-fine{font-size:11.5px;color:#7F8AAA;margin-top:10px}",
    "@media (max-width:400px){.crm-stats{grid-template-columns:repeat(2,1fr)}}"
  ].join("");
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  // ---- sample customers (made-up) so the owner list never looks empty ----
  var now = Date.now(), DAY = 864e5, mo = new Date().getMonth();
  var SAMPLE = [
    ["Maria G.", "(310) •••-4821", "maria•••@gmail.com", 14, 420, 3, 210, mo], ["Dre W.", "(323) •••-1187", "", 6, 180, 34, 160, 3],
    ["Kim T.", "", "kimt•••@yahoo.com", 3, 95, 12, 40, mo], ["Jordan P.", "(562) •••-9034", "jordan•••@icloud.com", 1, 25, 1, 1, 8],
    ["Luis R.", "(213) •••-5560", "", 11, 360, 6, 190, 1], ["Aisha K.", "(424) •••-7712", "aisha•••@gmail.com", 2, 60, 5, 5, 5],
    ["Tony N.", "(310) •••-3349", "", 8, 240, 41, 230, 11], ["Hye-jin L.", "", "hyejin•••@naver.com", 5, 150, 9, 70, 6],
    ["Arman S.", "(818) •••-2045", "arman•••@gmail.com", 9, 270, 15, 120, 0], ["Brianna C.", "(323) •••-6678", "", 4, 110, 2, 3, 2],
    ["Marcus J.", "(310) •••-8801", "mj•••@outlook.com", 17, 610, 4, 300, 10], ["Sofia M.", "(562) •••-4410", "sofia•••@gmail.com", 1, 25, 38, 38, 7]
  ].map(function (r) { return { name: r[0], phone: r[1], email: r[2], visits: r[3], stars: r[4], last: now - r[5] * DAY, joined: now - r[6] * DAY, bday: r[7], sample: true }; });

  function mine() { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (x) { return []; } }
  function save(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (x) {} }
  function all() { return mine().map(function (r) { r.you = true; return r; }).concat(SAMPLE); }
  function tags(r) {
    var t = [];
    if (r.you) t.push(["t-you", "JUST JOINED"]);
    if (r.visits >= 10) t.push(["t-vip", "VIP"]);
    if (now - r.last >= 30 * DAY && !r.you) t.push(["t-risk", "Hasn't been back"]);
    if (now - r.joined <= 7 * DAY && !r.you) t.push(["t-new", "New"]);
    if (r.bday === mo) t.push(["t-bday", "🎂 Birthday month"]);
    return t;
  }
  function ago(ts) { var d = Math.floor((now - ts) / DAY); return d <= 0 ? "today" : d === 1 ? "yesterday" : d + " days ago"; }
  function code() { var a = "ABCDEFGHJKMNPQRSTUVWXYZ23456789", s = ""; for (var i = 0; i < 4; i++) s += a[(Math.random() * a.length) | 0]; return (NAME.replace(/[^A-Za-z]/g, "").slice(0, 5).toUpperCase() || "CLUB") + "-" + s; }

  // ---- join card ----
  var join = document.createElement("section"); join.className = "crm-card"; join.id = "crm-join";
  // ---- owner card ----
  var own = document.createElement("section"); own.className = "crm-card crm-own"; own.id = "crm-owner";

  function drawJoin() {
    var me = mine()[0];
    if (me) {
      join.innerHTML = '<span class="k">' + e(NAME) + ' Club</span><h3>You\'re in, ' + e(me.name.split(" ")[0]) + '! 🎉</h3>' +
        '<div class="crm-win"><div style="font-size:34px">🎁</div><b>' + e(me.offer || OFFER) + '</b><div class="code">' + e(me.code) + '</div>' +
        '<small>Show this at the counter. It\'s saved on this phone.</small></div>' +
        '<p style="margin-top:12px">You\'ll also earn stars every visit and get a treat in your birthday month.</p>' +
        '<button type="button" class="go" style="background:#1a2656;box-shadow:none" id="crm-see">👀 See what the owner sees ↓</button>';
      join.querySelector("#crm-see").onclick = function () { own.scrollIntoView({ behavior: "smooth", block: "start" }); };
      return;
    }
    join.innerHTML = '<span class="k">' + e(NAME) + ' Club · free</span>' +
      '<div class="crm-gift"><b>🎁</b><span>Join now and get <u>' + e(OFFER) + '</u> instantly</span></div>' +
      '<h3>Unlock your reward</h3><p>Plus stars every visit and a birthday treat. Takes 10 seconds.</p>' +
      '<form autocomplete="on" novalidate><label>First name</label><input name="name" maxlength="40" autocomplete="given-name">' +
      '<div class="two"><div><label>Phone</label><input name="phone" type="tel" maxlength="20" autocomplete="tel" placeholder="(310) 555-0123"></div>' +
      '<div><label>or Email</label><input name="email" type="email" maxlength="120" autocomplete="email"></div></div>' +
      '<label>Birthday month (for your birthday treat)</label><select name="bday"><option value="">Choose…</option>' + MONTHS.map(function (m, i) { return '<option value="' + i + '">' + m + '</option>'; }).join("") + '</select>' +
      '<label class="ok"><input type="checkbox" name="ok"> <span>Text / email me rewards and specials from ' + e(NAME) + '. Msg & data rates may apply. Reply STOP anytime.</span></label>' +
      '<button class="go" type="submit">🎁 Get my reward</button><div class="err"></div></form>' +
      '<p class="crm-fine">Demo: what you type stays on this phone only.</p>';
    join.querySelector("form").onsubmit = function (ev) {
      ev.preventDefault();
      var f = this, er = f.querySelector(".err"), v = function (n) { return f[n].value.trim(); };
      if (!v("name")) { er.textContent = "Add your first name."; return; }
      if (!/\d{7,}/.test(v("phone").replace(/\D/g, "")) && !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(v("email"))) { er.textContent = "Add a phone number or an email so we can send your reward."; return; }
      if (!f.ok.checked) { er.textContent = "Tick the box so we can send you your reward."; return; }
      var r = { name: v("name"), phone: v("phone"), email: v("email"), bday: v("bday") === "" ? -1 : +v("bday"), visits: 1, stars: 25, last: Date.now(), joined: Date.now(), code: code(), offer: OFFER };
      var list = mine(); list.unshift(r); save(list.slice(0, 5));
      drawJoin(); drawOwn("all", true);
    };
  }

  var seg = "all";
  function drawOwn(s, flash) {
    seg = s || seg;
    var rows = all(), pick = rows.filter(function (r) {
      if (seg === "all") return true;
      if (seg === "vip") return r.visits >= 10;
      if (seg === "risk") return now - r.last >= 30 * DAY && !r.you;
      if (seg === "new") return now - r.joined <= 7 * DAY;
      if (seg === "bday") return r.bday === mo;
      return true;
    });
    var newWk = rows.filter(function (r) { return now - r.joined <= 7 * DAY; }).length;
    var COLORS = ["#FFD23F", "#3DDC97", "#E8582A", "#7FB3FF", "#D7A6FF", "#FF8F85"];
    own.innerHTML = '<span class="badge">OWNER VIEW · ONLY YOU SEE THIS</span><span class="k" style="display:block">Your customer list</span>' +
      '<h3>Every signup is yours to keep</h3><p>The moment someone joins, they land here with their contact info. It\'s your data: reach back out anytime, export it anytime, and it stays yours even if you ever leave.</p>' +
      '<div class="crm-stats"><div><b>' + rows.length + '</b>customers</div><div><b>' + newWk + '</b>new this week</div><div><b>' + rows.filter(function (r) { return r.visits >= 10; }).length + '</b>VIPs</div><div><b>' + rows.filter(function (r) { return now - r.last >= 30 * DAY && !r.you; }).length + '</b>to win back</div></div>' +
      '<div class="crm-seg">' + [["all", "Everyone"], ["new", "New"], ["vip", "VIP"], ["risk", "Hasn't been back"], ["bday", "Birthdays"]].map(function (x) { return '<button type="button" data-s="' + x[0] + '"' + (x[0] === seg ? ' class="on"' : '') + '>' + x[1] + '</button>'; }).join("") + '</div>' +
      '<div class="crm-list">' + pick.map(function (r, i) {
        return '<div class="crm-row' + (r.you ? ' you' : '') + '"><span class="crm-av" style="background:' + COLORS[i % COLORS.length] + '">' + e(r.name.charAt(0)) + '</span>' +
          '<span class="nm">' + e(r.name) + tags(r).map(function (t) { return '<span class="crm-tag ' + t[0] + '">' + t[1] + '</span>'; }).join("") + '</span>' +
          '<span class="st">' + r.stars + ' ⭐</span><span class="ct">' + e([r.phone, r.email].filter(Boolean).join(" · ") || "—") + ' · ' + r.visits + ' visit' + (r.visits === 1 ? '' : 's') + ' · last ' + ago(r.last) + '</span></div>';
      }).join("") + '</div>' +
      '<div class="crm-acts"><button type="button" class="hot" data-a="text">💬 Text this group</button><button type="button" data-a="csv">⬇️ Export list</button></div>' +
      '<div class="crm-compose"><textarea></textarea><div class="crm-bub"></div><p class="crm-fine" style="margin-bottom:0"></p></div>' +
      '<p class="crm-fine">Sample customers (made up) plus anyone who joins on this phone. Live, this list fills from real signups at your tables, and texts go only to people who opted in.</p>';
    own.querySelectorAll(".crm-seg button").forEach(function (b) { b.onclick = function () { drawOwn(b.dataset.s); }; });
    var cmp = own.querySelector(".crm-compose"), ta = cmp.querySelector("textarea");
    var DEF = { all: "Hey {first}! Double stars at " + NAME + " this week only 🔥", new: "Welcome to the club, {first}! Your next visit earns 2× stars.",
      vip: "{first}, you're one of our VIPs 👑 Next one's on us this week.", risk: "Hey {first}, we miss you! 👀 Come back this week for 2× stars.",
      bday: "Happy birthday {first}! 🎂 Your free treat is waiting all month." };
    function preview() {
      var who = pick.filter(function (r) { return r.phone || r.email; }), first = who[0] ? who[0].name.split(" ")[0] : "there";
      cmp.querySelector(".crm-bub").textContent = ta.value.replace(/\{first\}/g, first);
      cmp.querySelector(".crm-fine").textContent = "Would go to " + who.length + " customer" + (who.length === 1 ? "" : "s") + " in this group. Demo: nothing is sent.";
    }
    ta.oninput = preview;
    own.querySelector('[data-a="text"]').onclick = function () { cmp.style.display = "block"; ta.value = DEF[seg] || DEF.all; preview(); ta.focus(); };
    own.querySelector('[data-a="csv"]').onclick = function () {
      var q = function (v) { return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"'; };
      var csv = ["name,phone,email,visits,stars,last_visit,joined,birthday_month"].concat(all().map(function (r) {
        return [r.name, r.phone, r.email, r.visits, r.stars, new Date(r.last).toISOString().slice(0, 10), new Date(r.joined).toISOString().slice(0, 10), r.bday >= 0 ? MONTHS[r.bday] : ""].map(q).join(",");
      })).join("\n");
      var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = SLUG + "-customers.csv"; document.body.appendChild(a); a.click(); a.remove();
    };
    if (flash) setTimeout(function () { var y = own.querySelector(".crm-row.you"); if (y) y.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, 80);
  }

  var mount = C.mount && document.querySelector(C.mount);
  if (mount) { mount.appendChild(join); mount.appendChild(own); }
  else {
    var ref = document.querySelector("#ssai-n") || document.querySelector("#ssai-k") || document.querySelector("footer");
    if (ref && ref.parentNode) { ref.parentNode.insertBefore(join, ref); ref.parentNode.insertBefore(own, ref); }
    else { document.body.appendChild(join); document.body.appendChild(own); }
  }
  drawJoin(); drawOwn("all");
})();
