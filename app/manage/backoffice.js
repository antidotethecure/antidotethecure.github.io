/* Antidote's Management page (/app/manage/, PR #291): adds Christian's gated "Back office" to his card.
   Include once, right after the page's own inline <script>:   <script src="backoffice.js?v=bo1"></script>
   - Links: 🔒 Christian HQ (back office, password) + 🧑‍🍳 Staff app.
   - To-dos: "Toast discounts set up (Melody)" DONE (confirmed 2026-10-12), Nalu Vida TBD, plus the backend deploy step.
   - A small summary box on the card. It shows COUNTS ONLY and only after logging in to Christian HQ in this same tab
     (the HQ token lives in sessionStorage; this page holds no data). Without that it just shows the locked link. */
(function () {
  "use strict";
  if (!window.CL || typeof window.render !== "function") return;
  var c = CL.filter(function (x) { return x.id === "christian"; })[0]; if (!c) return;
  c.links.splice(1, 0, ["🔒 Back office · Christian HQ", "../../backoffice/christian/", 1], ["🧑‍🍳 Staff app (EN/ES)", "../../staff/christian/"]);
  var i = -1; c.todo.forEach(function (t, k) { if (/^Toast reward buttons set up/.test(t[0])) i = k; });
  var toast = [["Toast discounts set up (Melody)", "Done Oct 12, 2026: App Reward – Free Soft Drink or Melody Fries (250 pts), Free Starter (500), $10 Off (1,000), Free Entrée (1,500), App – Just Landed 10% Off", 1],
    ["Toast discounts set up (Nalu Vida)", "TBD, not confirmed: Free Mocktail/Soft Drink/Jungle Fries (250), Free Shareable (500), $10 Off (1,000), Free Entrée (1,500)"]];
  if (i >= 0) c.todo.splice.apply(c.todo, [i, 1].concat(toast)); else c.todo.push.apply(c.todo, toast);
  c.todo.push(["Deploy the Christian HQ backend (Apps Script, secondshiftai@gmail.com)", "Steps: command-center/clients/melody-lax/signup-sheet/DEPLOY.md · then paste the /exec URL in demo/christian-live.js"],
    ["Give Christian his HQ login + text staff the staff app link", "Login in ~/.config/sousshift/christian-hq.env (never in the repo)"]);
  c.upd.unshift(["Oct 13", "Christian HQ back office (members, points, games, discounts editor with emailed codes, early-bird gift, audit log) + staff training app EN/ES"]);
  var TK = "christian-hq-token", S = null, busy = false;
  function token() { try { return sessionStorage.getItem(TK); } catch (e) { return null; } }
  function box() {
    var card = document.getElementById("christian"); if (!card) return;
    var b = document.createElement("div"); b.className = "pane"; b.style.borderTop = "1px solid var(--edge)";
    var t = token();
    b.innerHTML = "<b>🔒 Back office</b> " + (S && S.ok ? "<div class='sum' style='margin:8px 0 4px'><div><b>" + S.members + "</b><span>members</span></div><div><b>" + S.joined7 + "</b><span>joined 7d</span></div><div><b>" + S.plays7 + "</b><span>game plays 7d</span></div><div><b>" + S.redeems7 + "</b><span>rewards 7d</span></div><div><b>" + S.pendingClaims + "</b><span>claims to check</span></div></div>"
      : "<p class='note' style='margin:4px 0'>" + (t ? "Loading counts…" : "Numbers stay behind the password. Log in to Christian HQ in this tab to see a summary here.") + "</p>") +
      "<div class='links'><a class='app' href='../../backoffice/christian/'>Open Christian HQ</a></div>";
    card.appendChild(b);
    if (t && !S && !busy) load(t);
  }
  function load(t) {
    busy = true;
    var go = function () { var api = window.SSAI_CHRISTIAN && SSAI_CHRISTIAN.api; if (!api) { busy = false; return; }
      fetch(api, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ type: "bo_summary", token: t }) }).then(function (r) { return r.json(); })
        .then(function (j) { S = j && j.ok ? j : null; if (!S) try { sessionStorage.removeItem(TK); } catch (e) {} render(); }).catch(function () { busy = false; }); };
    if (window.SSAI_CHRISTIAN) go(); else { var s = document.createElement("script"); s.src = "../../demo/christian-live.js?v=bo1"; s.onload = go; document.head.appendChild(s); }
  }
  var base = window.render;
  window.render = function () { base(); box(); };
  window.render();
})();
