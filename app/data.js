/* SousShift app — every price, number and source the app shows. app.js only renders this file.
   Pricing v5 approved by Antidote 2026-10-11 (Basic / Growth / Done-for-you), per restaurant, for NEW clients.
   Existing clients keep their signed deals (Christian $1,500 + $300 for both restaurants, Jurni $2,000 + $300).

   KEEP IN SYNC:
   - value/value-data.js .......... market prices + sources (the "What it costs elsewhere" rows reuse its numbers: mid = (low + typ) / 2)
   - ~/plugin/skills/second-shift-contract/SKILL.md + make_contract.py (setup_list / monthly_list defaults, clauses 2A/3A/5A, discount_expiry)
   - demo/contract.js ............. on-the-spot agreement builder (presets + the 3A results-promise wording)
   - setup-kit/build_launch.py AGENTS + agents/index.html (AI add-on prices $75 / $150)
   - ~/command-center/clients/concierge/kb/13-pricing-playbook.md (what the onboarding concierge quotes) */
window.APP = {
  updated: "2026-10-19",
  contact: { email: "secondshiftai@gmail.com", sms: "", name: "Antidote" },

  /* ---------------- 1 · Plans ---------------- */
  plans: [
    { key: "basic", name: "Basic", setup: 3000, monthly: 350, tag: "Start here",
      pitch: "Your own app, game and rewards. You run the promotions.",
      includes: [
        "Branded app + ordering + a QR at every table",
        "4K photo menu + 3D dishes",
        "Menu in 12 languages",
        "Points, rewards and visit levels",
        "Invite-a-friend referrals",
        "Custom game + free daily spin + weekly leaderboard + giveaway",
        "Your customer list + owner view (export anytime)",
        "Email to your list",
        "Your Instagram feed inside the app",
        "QR print-kit design (stickers, poster, table cards)",
        "Promo video",
        "Exposure on Antidote's food-review audience",
        "Hosting, updates and support"],
      who: "You do some footwork: you send your own texts and promotions, print and place the stickers (we give you the files), and keep your deals updated on your setup page.",
      footwork: "some" },
    { key: "growth", name: "Growth", setup: 3500, monthly: 650, tag: "Most popular", flag: true,
      pitch: "Everything in Basic, plus the tools that bring guests back on their own.",
      includes: [
        "Everything in Basic",
        "Google review prompts",
        "Nearby / GPS alerts",
        "AI Text Assistant (24/7 texting)",
        "Automatic bring-back texts: birthday, \"we miss you\", holidays",
        "Missed-call text-back",
        "We place your print order (print cost billed at cost)"],
      who: "Less footwork: the bring-back texts run on their own and we order your printing. You still send any one-off promotions you want.",
      footwork: "less" },
    { key: "dfy", name: "Done-for-you", setup: 4000, monthly: 950, tag: "Sit back",
      pitch: "Everything in Growth, plus a voice host and we run your marketing.",
      includes: [
        "Everything in Growth",
        "AI Voice Host (answers your phone 24/7 or after hours)",
        "We run your texting and marketing for you",
        "We place your print order (print cost billed at cost)"],
      who: "Sit back. Antidote runs and grows it: texts, promotions, specials and the print order. You approve; we do the work.",
      footwork: "none" }
  ],
  addons: [
    { key: "text", name: "AI Text Assistant", monthly: 75, setup: 0, includedIn: ["growth", "dfy"],
      one: "Guests text your number and an AI texts back 24/7: hours, menu, specials, reservation requests, catering. 1,000 texts a month included." },
    { key: "voice", name: "AI Voice Host + Text", monthly: 150, setup: 0, includedIn: ["dfy"], replaces: "text",
      one: "A natural AI voice answers your phone, takes reservation requests, transfers to staff and texts links. Includes the Text Assistant. 750 minutes + 1,000 texts a month." },
    { key: "ordering", name: "Online Ordering + Delivery", monthly: 300, setup: 0, includedIn: [], soon: true,
      one: "Guests order and pay by card right in your app (pickup first), with points on every order and live orders in your back office. Delivery by DoorDash drivers, with no marketplace commission, once DoorDash approves our access (applied, under review). $300/mo flat with no per-order fee, or $200/mo + 5% of the food on each order (never on delivery fees, tips or tax). Example: a $40 order = $2. No fee added to your guests' checks. Flat is cheaper once you do over $2,000 a month in app orders. Coming soon: pickup ordering first." },
    { key: "sports", name: "Sports Bar Package", monthly: 0, setup: 0, includedIn: [], quote: true,
      one: "Live local scores up top, follow-your-team alerts, the Fan Test, Football Squares (1 free square per member, prizes you set), fight nights and pick-the-winner points. Score specials: when the home team scores, a same-day deal unlocks. Built for game days." },
    { key: "games", name: "Games Pack", monthly: 0, setup: 0, includedIn: [], quote: true,
      one: "Trivia, sports trivia, the daily word game, a word scramble and bar-safe Truth or Dare. Guests earn points for playing while they wait." },
    { key: "menu3d", name: "3D Digital Menu", monthly: 0, setup: 0, includedIn: [], quote: true,
      one: "Guests spin a real 3D model of your signature dishes, plus slow-motion food clips and a real-photo mode. Optional: dishes that rise off the menu in a short cinematic video." },
    { key: "social", name: "Social & SEO Growth", monthly: 1000, setup: 0, includedIn: [],
      one: "Content plan, short-form video edits from your food, posting on Instagram / TikTok / YouTube, Google Business Profile + local SEO, and a monthly report." }
  ],
  /* "Everything" bundle = Done-for-you + Social & SEO Growth, minus this discount. Change the numbers here only. */
  bundle: { name: "Everything", plan: "dfy", addon: "social", discountMonthly: 150, discountSetup: 0,
    one: "Done-for-you + Social & SEO Growth in one plan, with a bundle discount." },

  /* Contract terms on every NEW agreement (already in the contract generator) */
  terms: {
    perf: { pct: 10, threshold: 3000 },   // 2026-10-13: pct% of the amount OVER threshold only ($5,000 in app sales -> $200)
    results: { returns: 30, day: 30, windowMonths: 3, freeMonths: 2 },
    discount: { graceBusinessDays: 3, perDay: 100 },
    minimumMonths: 3,
    /* How the owner can pay the setup (Antidote, 2026-10-12). Same numbers in demo/contract.js + make_contract.py.
       split: % of setup at signing, the rest at Go-Live (app delivered).
       flex:  pay at least minDown (per restaurant) at signing; the unpaid setup balance is spread over `months` equal
              installments added to the monthly fee, then the monthly drops back to normal. Exact cents: each installment
              is the balance / months rounded to the cent and the last one absorbs the rounding.
              feePct = OPTIONAL flexible-plan fee as a % of the unpaid balance. 0 = plain math, nothing extra (default).
              Only change it if Antidote approves a fee; never call it interest, a loan or financing. */
    payment: { split: 50, flex: { minDown: 750, months: 12, feePct: 0 } }
  },

  /* ---------------- 2 · What it costs elsewhere ----------------
     mid = average of the low and typical published prices in value/value-data.js (same sources).
     tiers = which of our plans includes it. Three rows are new here (GPS alerts, done-for-you texting, AI voice). */
  market: [
    { name: "Branded app, ordering + table QR", tool: "Owner.com / ChowNow", unit: "mo", low: 119, typ: 249, tiers: ["basic"], src: ["owner", "chownow"] },
    { name: "Points, rewards and visit levels", tool: "Square Loyalty / Toast Loyalty", unit: "mo", low: 45, typ: 75, tiers: ["basic"], src: ["sqloy", "toast"] },
    { name: "Invite-a-friend referrals", tool: "ReferralCandy", unit: "mo", low: 9, typ: 79, tiers: ["basic"], src: ["refc"] },
    { name: "Leaderboard, daily spin, giveaway", tool: "spin-to-win + leaderboard widgets", unit: "mo", low: 34, typ: 68, tiers: ["basic"], src: ["spin", "lbd"] },
    { name: "Email to your list", tool: "Mailchimp", unit: "mo", low: 13, typ: 20, tiers: ["basic"], src: ["mc"] },
    { name: "Instagram feed in the app", tool: "Elfsight / Behold", unit: "mo", low: 5, typ: 10, tiers: ["basic"], src: ["elf", "behold"] },
    { name: "Hosting, updates and support", tool: "web maintenance plan", unit: "mo", low: 50, typ: 100, tiers: ["basic"], src: ["maint"] },
    { name: "Google review prompts", tool: "Birdeye / Podium", unit: "mo", low: 299, typ: 399, tiers: ["growth"], src: ["birdeye", "podium"] },
    { name: "Nearby / GPS alerts", tool: "geofencing campaign", unit: "mo", low: 275, typ: 275, est: true, tiers: ["growth"], src: ["geo1", "geo2"] },
    { name: "AI Text Assistant", tool: "Dialzara SMS agent + Quo", unit: "mo", low: 84, typ: 88, tiers: ["growth"], src: ["dialz", "quo"] },
    { name: "Bring-back texts (birthday, win-back, holidays)", tool: "SlickText", unit: "mo", low: 29, typ: 49, tiers: ["growth"], src: ["slick"] },
    { name: "Missed-call text-back", tool: "Quo (OpenPhone)", unit: "mo", low: 15, typ: 19, tiers: ["growth"], src: ["quo"] },
    { name: "AI Voice Host", tool: "Loman / Slang.ai phone AI", unit: "mo", low: 299, typ: 299, est: true, tiers: ["dfy"], src: ["loman", "slang"] },
    { name: "Done-for-you texting & marketing", tool: "managed SMS marketing service", unit: "mo", low: 334, typ: 334, est: true, tiers: ["dfy"], src: ["sysco", "redefine"] },
    /* one-time builds, in every plan */
    { name: "4K photo menu + 3D dishes", tool: "food photographer + 3D models", unit: "once", low: 1150, typ: 2500, est: true, tiers: ["basic"], src: ["photo", "ar"] },
    { name: "Menu in 12 languages", tool: "human translation", unit: "once", low: 330, typ: 770, est: true, tiers: ["basic"], src: ["trans"] },
    { name: "Custom arcade game", tool: "game studio build", unit: "once", low: 3000, typ: 8000, est: true, tiers: ["basic"], src: ["game", "game2"] },
    { name: "QR print-kit design", tool: "freelance designer", unit: "once", low: 225, typ: 400, est: true, tiers: ["basic"], src: ["design"] },
    { name: "Promo video", tool: "freelance videographer", unit: "once", low: 500, typ: 1250, est: true, tiers: ["basic"], src: ["video"] },
    { name: "Exposure on a food-review audience", tool: "one sponsored Reel, mid-size food creator", unit: "once", low: 1000, typ: 2500, est: true, tiers: ["basic"], src: ["infl"] }
  ],
  /* sources not already in value/value-data.js (the rest are read from window.VALUE.sources) */
  extraSources: {
    geo1: { label: "Geofencing advertising costs for small businesses, Stackmatix", url: "https://www.stackmatix.com/blog/geofencing-advertising", checked: "2026-10-11" },
    geo2: { label: "Geofencing marketing for small businesses, The Small Business Expo", url: "https://thesmallbusinessexpo.com/blog/geofencing-marketing-5-steps-to-profitable-growth", checked: "2026-10-11" },
    sysco: { label: "Sysco CMSText managed restaurant texting (flyer)", url: "https://foodie.sysco.com/wp-content/uploads/2022/09/CMS-Text-9.2022.pdf", checked: "2026-10-11" },
    redefine: { label: "Food-service marketing agencies and what they charge, Redefine Web", url: "https://redefineweb.com/blog/food-service-marketing-agencies/", checked: "2026-10-11" }
  },
  marketNote: "Typical published pricing as of Oct 2026; your costs may vary. Each row is the average of the low and typical price we found. \"est.\" = the vendor quotes on request, so the number comes from the cited guide.",

  /* ---------------- 3 · What it costs Antidote to run ---------------- */
  runCosts: [
    ["🤖", "Claude", "builds and updates every app, game and page", "$250"],
    ["✍️", "DocuSign", "contracts", "$15"],
    ["🎨", "Higgsfield", "characters, 3D models, food art", "from $9"],
    ["💬", "ChatGPT", "", "from $8"],
    ["🎙️", "ElevenLabs", "AI voices for the phone hosts", "from $6"],
    ["📱", "Twilio", "phone numbers & texting", "$1.15 + per text"],
    ["🌐", "Domains", "", "~$1"]],
  runTotal: "≈ $290+",

  /* ---------------- 4 · What you get back (same model as setup-kit/template.html CFG.impact) ---------------- */
  impact: { crowd: 150, nights: 4, daily: 80, days: 22, join: 25, back: 20, spend: 25 },

  /* ---------------- 5 · Printing ---------------- */
  print: {
    checked: "2026-10-11",
    items: [
      { name: "3\" QR table stickers (matte vinyl)", qty: "50–100", price: "$60 for 50 · $73 for 100", low: 60, high: 73, where: "Sticker Mule (3×3 die cut)", src: "smule" },
      { name: "3\" QR stickers, promo deal", qty: "50", price: "$25 for 50", low: 25, high: 25, where: "Jukebox Print (up to 3×3, waterproof vinyl)", src: "jbox" },
      { name: "24×36 window poster", qty: "1", price: "from $17.25 print · ~$41 mounted", low: 17, high: 41, where: "FedEx Office (walk-in, same day)", src: "fedex" },
      { name: "4×6 table cards on card stock", qty: "50", price: "$33.95 one-sided · $48.95 two-sided", low: 34, high: 49, where: "MustHaveMenus table tents", src: "mhm" }],
    typical: "About $100–$165 per restaurant for 50–100 stickers, one poster and 50 table cards.",
    sources: {
      smule: { label: "Sticker Mule 3×3 die-cut prices (50 = $60, 100 = $73), Bootstrapping Ecommerce review, Dec 18 2025", url: "https://bootstrappingecommerce.com/sticker-mule-review/" },
      jbox: { label: "Jukebox Print stickers: 50 custom die-cut stickers up to 3×3 for $25 (promo, checked Oct 11 2026)", url: "https://www.jukeboxprint.com/stickers" },
      fedex: { label: "FedEx Office poster prices: standard prints from $17.25, mounted $40.99 (Architeg Prints, checked Oct 3 2026)", url: "https://www.architeg-prints.com/blog/fedex-poster-printing-fast-turnaround-or-overpriced" },
      mhm: { label: "MustHaveMenus table tent printing: 50 for $33.95 single / $48.95 double-sided (checked Oct 11 2026)", url: "https://musthavemenus.com/feature/table-tent-printing.html" }
    },
    who: { basic: "You order and place them, using our print-ready files.", growth: "We place the order for you; print cost is billed at cost, no markup.", dfy: "We place the order for you; print cost is billed at cost, no markup." },
    kits: [
      { img: "../melody/kit/Melody_QR_Sticker_Round.png", cap: "Melody · round QR sticker" },
      { img: "../melody/kit/poster_thumb.jpg", cap: "Melody · 24×36 window poster" },
      { img: "../melody/kit/table_card_thumb.jpg", cap: "Melody · numbered table card" },
      { img: "../nalu-vida/kit/NaluVida_QR_Surfboard_Sticker.png", cap: "Nalu Vida · surfboard QR sticker" },
      { img: "../nalu-vida/kit/poster_thumb.jpg", cap: "Nalu Vida · window poster" },
      { img: "../nalu-vida/kit/table_card_thumb.jpg", cap: "Nalu Vida · numbered table card" }]
  },

  /* ---------------- 7 · Social & SEO Growth: price research ----------------
     Market average = average of the midpoints below (social) + average of the midpoints below (local SEO).
     Our price = about half of the combined market average, rounded to a clean number (addons.social.monthly). */
  social: {
    checked: "2026-10-11",
    socialPoints: [
      { label: "Restaurant social media, freelancer", low: 500, high: 1500, src: "srails" },
      { label: "Restaurant social media, small agency", low: 1500, high: 3500, src: "srails" },
      { label: "Small-business social media management", low: 500, high: 2000, src: "eclin" }],
    seoPoints: [
      { label: "Google Business Profile management, basic ongoing", low: 300, high: 600, src: "cwi" },
      { label: "Bundled local SEO (GBP + citations + reporting)", low: 300, high: 800, src: "slash" }],
    sources: {
      srails: { label: "SocialRails, Social media marketing for restaurants (published Jan 15 2026, updated Aug 7 2026)", url: "https://socialrails.com/blog/social-media-marketing-for-restaurants" },
      eclin: { label: "eClincher, Social media management pricing: rates and costs for 2026 (Jan 6 2026)", url: "https://eclincher.com/articles/social-media-management-pricing-rates-and-costs-for-2026" },
      cwi: { label: "Colorado Web Impressions, How much does Google Business Profile management cost? (updated Apr 30 2026)", url: "https://coloradowebimpressions.com/answers/how-much-does-google-business-profile-management-cost" },
      slash: { label: "Slashpost, Google Business Profile optimization cost, 2026 pricing breakdown (Sep 7 2026)", url: "https://slashpost.ai/blogs/google-business-profile/google-business-profile-optimization-cost" }
    },
    does: [
      "A monthly content plan built around your menu, specials and events",
      "Short-form video edits from your food (we film or use your clips)",
      "A posting schedule for Instagram, TikTok and YouTube",
      "Google Business Profile + local SEO: photos, posts, hours, review replies, local listings",
      "A monthly report: what posted, views, followers, calls and direction requests"],
    target: "Typical goal: grow toward 10,000+ followers and 100,000+ views on top videos over time.",
    honest: "Results vary. We don't guarantee follower or view counts. Growth comes from real content, ads you approve, and consistency. We never buy followers or fake engagement."
  }
};
