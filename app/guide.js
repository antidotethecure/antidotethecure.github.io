/* SousShift AI guide: a chat panel that answers owners' questions and jumps to the right section.
   100% client-side, no API key in the page: a keyword/intent matcher over the FAQ + a section index (INTENTS below).
   Each intent has phrases (weighted 2 when the whole phrase appears) and single words (weight 1); the best score wins.
   Below the threshold it falls back to "I'll have Antidote answer that" with email/text hand-off buttons.

   UPGRADE PATH (when Antidote wants real AI answers):
   1. ElevenLabs text agent: create a text-only Conversational AI agent with data.js + the FAQ as its knowledge base,
      then replace reply() with the ElevenLabs widget/websocket (agent id is public; no secret in the page).
   2. Server endpoint: a small worker (e.g. the shared Cloudflare API worker) that calls the Anthropic Messages API with
      data.js as the system context and returns { text, section }. The page POSTs the question; the key stays on the server.
   Either way keep go() navigation: ask the model to return one of the section ids below so the page can scroll there. */
(function () {
  "use strict";
  var A = window.APP, S = window.SSAPP, $ = function (id) { return document.getElementById(id); };
  var faq = function (id) { return A.faq.filter(function (f) { return f.id === id; })[0]; };
  var usd = function (x) { return "$" + Math.round(x).toLocaleString("en-US"); };
  var plan = function (k) { return A.plans.filter(function (p) { return p.key === k; })[0]; };
  function tier(k) { var p = plan(k); return p.name + " is " + usd(p.setup) + " setup + " + usd(p.monthly) + "/mo per restaurant. It includes: " + p.includes.join("; ") + ". " + p.who; }

  // [section id or "plan:<key>", label for the link, phrases[], words[], answer()]
  var INTENTS = [
    { id: "basic", go: "plan:basic", label: "Open Basic", phrases: ["basic plan", "in basic", "cheapest", "basic cost", "basic include"], words: ["basic", "cheapest", "starter", "entry"], a: function () { return tier("basic"); } },
    { id: "growth", go: "plan:growth", label: "Open Growth", phrases: ["growth plan", "in growth", "growth include", "middle plan"], words: ["growth"], a: function () { return tier("growth"); } },
    { id: "dfy", go: "plan:dfy", label: "Open Done-for-you", phrases: ["done for you", "done-for-you", "top plan", "sit back", "run it for me", "you run"], words: ["dfy", "premium", "top", "everything"], a: function () { return tier("dfy") + " Add Social & SEO Growth for the \"" + A.bundle.name + "\" bundle and save " + usd(A.bundle.discountMonthly) + "/mo."; } },
    { id: "price", go: "plans", label: "See plans & prices", phrases: ["how much", "what does it cost", "price list", "monthly fee", "setup fee", "the plans", "compare plans"], words: ["price", "prices", "pricing", "cost", "plans", "fee", "fees", "monthly", "setup"], a: function () { return faq("f-price").a; } },
    { id: "builder", go: "builder", label: "Build my plan", phrases: ["build my plan", "total for", "two restaurants", "2 restaurants", "multiple locations", "more than one", "locations"], words: ["total", "locations", "calculator", "restaurants", "multiple"], a: function () { return faq("f-multi").a; } },
    { id: "which", go: "plans", label: "Compare the plans", phrases: ["which plan", "what plan", "best plan", "should i pick", "should i choose", "recommend"], words: ["which", "recommend", "choose"], a: function () { return faq("f-which").a; } },
    { id: "footwork", go: "plans", label: "See who does what", phrases: ["who does what", "what do i have to do", "do i have to", "my part", "footwork", "do the work"], words: ["footwork", "work", "effort"], a: function () { return faq("f-footwork").a; } },
    { id: "market", go: "market", label: "See the comparison", phrases: ["cost elsewhere", "other companies", "compare to", "worth it", "market price", "buy separately", "how much would", "save"], words: ["elsewhere", "compare", "comparison", "competitors", "savings", "value", "owner.com", "chownow"], a: function () { var b = S.market("basic"), d = S.market("dfy"); return "Bought separately, the Basic tools run ~" + usd(b.monthly) + "/mo, Growth ~" + usd(S.market("growth").monthly) + "/mo and Done-for-you ~" + usd(d.monthly) + "/mo, plus ~" + usd(Math.round(b.once / 100) * 100) + " of one-time builds (photos, game, translations, video). Average published prices, Oct 2026."; } },
    { id: "run", go: "run", label: "See our running costs", phrases: ["cost you to run", "you to run", "your costs", "cost to run", "why so expensive", "what do you pay", "markup"], words: ["run", "running", "claude", "twilio", "elevenlabs", "docusign", "higgsfield", "markup", "expensive"], a: function () { return "The lowest plans of the tools behind it (Claude $250, DocuSign $15, Higgsfield from $9, ChatGPT from $8, ElevenLabs from $6, Twilio $1.15 + texts, domains ~$1) come to " + A.runTotal + "/mo before credits and usage. They're shared across SousShift's restaurants."; } },
    { id: "returns", go: "returns", label: "Open the calculator", phrases: ["pay for itself", "break even", "break-even", "get back", "how many visits", "return on", "extra sales", "payback"], words: ["roi", "breakeven", "payback", "return", "returns", "calculator", "profit", "worth"], a: function () { var r = S.impact(); return "At typical numbers (" + usd(A.impact.spend) + " average spend), Basic breaks even at " + r.breakEven + " extra visits a month and earns back setup in about " + (r.payback || "12+") + " months. Move the sliders to your own numbers. Estimates, not a promise of sales."; } },
    { id: "promise", go: "promise", label: "See the results promise", phrases: ["results promise", "what if it doesn't work", "doesn't work", "does not work", "no results", "guarantee", "money back", "results check", "free months", "not working"], words: ["guarantee", "guaranteed", "promise", "refund", "risk", "results"], a: function () { return faq("f-results").a; } },
    { id: "perf", go: "contract", label: "See clause 2A", phrases: ["10%", "10 percent", "performance share", "percentage", "cut of sales", "take a cut", "commission"], words: ["percent", "commission", "performance", "share", "cut", "rev"], a: function () { return faq("f-perf").a; } },
    { id: "contract", go: "contract", label: "Open contracts", phrases: ["sample agreement", "see the contract", "the contract", "sign up", "how do i sign", "draft my agreement", "agreement"], words: ["contract", "agreement", "sign", "docusign", "terms", "legal", "clause"], a: function () { return faq("f-contract").a + " Tap \"See a sample agreement\" for the PDF, or \"Draft my agreement\" to fill one in on this phone."; } },
    { id: "discount", go: "contract", label: "See the discount terms", phrases: ["discount expire", "discount deadline", "3 business days", "pay late", "late fee", "founding discount"], words: ["discount", "expire", "expires", "deadline", "late"], a: function () { return faq("f-discount").a; } },
    { id: "pay", go: "contract", label: "See fees", phrases: ["when do i pay", "payment plan", "pay up front", "how do i pay", "deposit"], words: ["deposit", "payment", "pay", "upfront", "installments"], a: function () { return faq("f-pay").a; } },
    { id: "data", go: "contract", label: "See clause 5A", phrases: ["customer list", "customer data", "who owns", "my data", "export"], words: ["data", "list", "own", "owns", "export", "privacy", "csv"], a: function () { return faq("f-data").a; } },
    { id: "cancel", go: "contract", label: "See term & cancelling", phrases: ["can i cancel", "cancel", "get out", "minimum term", "how long is the contract", "lock in", "locked in"], words: ["cancel", "cancellation", "quit", "stop", "minimum", "term", "commitment"], a: function () { return faq("f-cancel").a; } },
    { id: "print", go: "print", label: "Open stickers & printing", phrases: ["how much are stickers", "sticker cost", "print cost", "who prints", "window poster", "table cards", "where to print"], words: ["sticker", "stickers", "print", "printing", "poster", "posters", "qr", "cards", "tents", "fedex", "vistaprint"], a: function () { return faq("f-print").a; } },
    { id: "pos", go: "f-pos", label: "See the POS answer", phrases: ["my register", "my pos", "point of sale", "work with toast", "work with square", "install anything", "install"], words: ["pos", "register", "toast", "square", "clover", "install", "integrate", "integration"], a: function () { return faq("f-pos").a; } },
    { id: "ai", go: "plans", label: "See the add-ons", phrases: ["ai agent", "ai voice", "voice host", "answer the phone", "answer my phone", "text assistant", "ai text", "missed call"], words: ["ai", "voice", "phone", "calls", "texting", "agent", "agents", "bot", "chatbot", "receptionist"], a: function () { return faq("f-ai").a; } },
    { id: "social", go: "social", label: "Open Social & SEO", phrases: ["social media", "social and seo", "social & seo", "more followers", "tiktok", "instagram posting", "google business", "local seo"], words: ["social", "seo", "followers", "views", "instagram", "tiktok", "youtube", "content", "posting", "marketing", "google"], a: function () { return faq("f-social").a; } },
    { id: "time", go: "f-time", label: "See timeline", phrases: ["how long", "how fast", "go live", "when can i start", "timeline"], words: ["timeline", "fast", "quick", "weeks", "launch", "live"], a: function () { return faq("f-time").a; } },
    { id: "existing", go: "plans", label: "See plans", phrases: ["already a client", "existing client", "my deal", "price change", "prices change"], words: ["existing", "already"], a: function () { return faq("f-existing").a; } },
    { id: "human", go: "talk", label: "Contact Antidote", phrases: ["talk to", "speak to", "real person", "call you", "contact", "phone number", "email you"], words: ["human", "person", "antidote", "contact", "email", "call"], a: function () { return "Sure. Email Antidote at " + A.contact.email + " or tap Text Antidote below, and he'll get back to you."; } }
  ];
  var STOP = /\b(the|a|an|is|are|do|does|i|my|me|you|your|it|of|to|for|in|on|and|what|whats|how|much|can|with|be|we|there)\b/g;
  function norm(s) { return (" " + String(s).toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9%.&\- ]+/g, " ") + " ").replace(/\s+/g, " "); }
  function match(q) {
    var t = norm(q), words = t.replace(STOP, " ").split(" ").filter(Boolean), best = null, bs = 0;
    INTENTS.forEach(function (it, i) {
      var s = 0;
      it.phrases.forEach(function (p) { p = norm(p).trim(); if (t.indexOf(" " + p + " ") >= 0 || t.indexOf(p) >= 0 && p.length > 5) s += 3; });
      words.forEach(function (w) { if (it.words.indexOf(w) >= 0 || it.words.indexOf(w.replace(/s$/, "")) >= 0) s += 1; });
      if (s > bs) { bs = s; best = it; }   // ties: the earlier (more specific) intent wins
    });
    return bs >= 1 ? best : null;
  }
  function go(target) {
    if (target.indexOf("plan:") === 0) return S.openPlan(target.slice(5));
    var el = $(target); if (!el) return;
    if (el.tagName === "DETAILS") el.open = true;
    S.go(el);
  }
  var log = $("log"), box = $("guide");
  function add(text, who, it) {
    var m = document.createElement("div"); m.className = "m " + who; m.textContent = text;
    if (it) { var a = document.createElement("a"); a.href = "#"; a.className = "go"; a.textContent = it.label + " →"; a.onclick = function (e) { e.preventDefault(); close(); go(it.go); }; m.appendChild(document.createElement("br")); m.appendChild(a); }
    log.appendChild(m); log.scrollTop = log.scrollHeight; return m;
  }
  function handoff(q) {
    var body = encodeURIComponent("Hi Antidote, a question from the SousShift app: " + q);
    var m = add("Good question. I'll have Antidote answer that one personally.", "bot");
    m.insertAdjacentHTML("beforeend", '<br><a class="go" href="mailto:' + A.contact.email + '?subject=SousShift%20question&body=' + body + '">✉️ Email ' + A.contact.email + '</a><br><a class="go" href="sms:' + (A.contact.sms || "") + '&body=' + body + '">💬 Text Antidote</a>');
  }
  function reply(q) {   // returns the matched intent id (or null) so tests can check routing
    q = String(q || "").trim(); if (!q) return null;
    add(q, "me"); var it = match(q);
    if (!it) { handoff(q); return null; }
    add(it.a(), "bot", it);
    window.GUIDE.last = it; return it.id;
  }
  function open(q) { box.classList.add("on"); document.body.style.overflow = "hidden"; if (!log.children.length) add("Hi! I'm the SousShift guide. Ask me about plans, prices, the contract, printing or what you get back, and I'll take you there.", "bot"); if (q) reply(q); setTimeout(function () { $("q").focus({ preventScroll: true }); }, 50); }
  function close() { box.classList.remove("on"); document.body.style.overflow = ""; }
  var CHIPS = ["What's in Growth?", "How much are stickers?", "What's the 10% share?", "What if it doesn't work?", "Can I cancel?", "Social & SEO?", "Talk to Antidote"];
  $("chips").innerHTML = CHIPS.map(function (c) { return '<button type="button" class="chip">' + c + '</button>'; }).join("");
  $("chips").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) reply(b.textContent); });
  $("ask").addEventListener("submit", function (e) { e.preventDefault(); var q = $("q").value; $("q").value = ""; reply(q); });
  $("gClose").onclick = close;
  box.addEventListener("click", function (e) { if (e.target === box) close(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && box.classList.contains("on")) close(); });
  document.querySelectorAll("[data-ask]").forEach(function (b) { b.addEventListener("click", function (e) { e.preventDefault(); open(); }); });
  $("topask").onclick = function () { open(); };
  window.GUIDE = { open: open, close: close, reply: reply, match: function (q) { var it = match(q); return it ? it.id : null; }, go: go, intents: INTENTS };
})();
