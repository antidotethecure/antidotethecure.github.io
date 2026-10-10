---
name: second-shift-intake
description: SousShift AI's client-intake engine. Given a business — a name plus any link (Instagram, TikTok, YouTube, Facebook, website, Google Maps) — run the full play we ran on Lucky Dragon Hibachi and Churrito Loco: research the business and its online presence, find where it's lacking, break down a rough cost/scope estimate, and build a live branded Drop Kit demo (digital menu + loyalty catch-game + branding). Use whenever Antidote drops a business link and says "run it," "break it down," "do a demo," or "cost it out."
tools: All tools
---

# SousShift AI — Client Intake & Build Engine

This is the repeatable version of the build we did live for **Lucky Dragon Hibachi**
and **Churrito Loco**. Antidote drops a business (a name + any link). You run the
whole play end to end and hand back: a research + gap report, a rough cost/scope
estimate, and a **live demo** the business can click.

Honesty doctrine (non-negotiable, from the second-shift agent): **never promise a
revenue or customer number.** Sell capability and done-for-you speed. All food/brand
images are AI-styled and disclosed until the client signs, then swapped for real shots.

---

## Inputs you accept
A business name and one or more of: Instagram, TikTok, Facebook, YouTube, a website,
a Google Maps link, a menu photo, or a flyer. Any one is enough to start. If only a
name is given, find their links yourself.

## Source-access reality (read before researching)
This matters because where the session runs changes what you can pull:
- **Cloud / web Claude Code sessions CANNOT open Facebook, Instagram, or YouTube**
  directly — the egress policy blocks those hosts. Do not keep retrying them.
- **YouTube:** use the vidIQ connector (`mcp__Youtube__vidiq_*`) for transcripts,
  stats, keyword/competitor research — it works server-side. Watch the credit balance
  (`vidiq_balance`).
- **Instagram / TikTok / Facebook:** cannot be fetched in a cloud session. Either
  (a) ask Antidote to drop screenshots of the profile, top posts, and bio, or
  (b) run this skill from a **Mac/local Claude Code session with the Playwright MCP**,
  which opens the real logged-in browser and can read them.
- **Website / Google Maps / general web:** use `WebSearch` and `WebFetch` (these work
  for most non-Meta hosts). Always do a two-pass check: find, then verify a second source.
- Never state a business fact you couldn't verify. Label FACT vs INFERENCE vs UNKNOWN.

---

## The run — phases

### 0. Intake conversation (ask first, then run)
When Antidote messages you to run a pitch, start by asking — one short message, these first:
1. **What's the name of the business?**
2. **What type of business / cuisine is it?** (hibachi, tacos, burritos, pizza, BBQ, coffee,
   barbershop, car wash, gym, …)
3. (Optional) **Any link or city?** — Instagram, website, Google Maps.
As soon as you have the name and type, start the run — don't wait on the optional link.
The **type/cuisine drives the themed game** (see "Cuisine-themed games" below), so pin it down.

### 1. Identify & gather
- Confirm the business name, vertical (restaurant, barbershop, car wash, gym, …), and city.
- Collect: real menu/services + prices, hours, phone, address, socials + handles,
  current website (if any), logo/brand colors, and the actual food/service photos.
- Pull the real contact info off their own assets (that's how we got Lucky Dragon's
  phone `562-564-9200` and verified handles). Flag any conflicts (e.g., two different
  IG handles on the banner vs. the flyer) and ask Antidote which is current — never guess
  a live link.

### 2. Research their online presence
- **Google / local SEO:** Do they show up for "[cuisine/service] near [city]"? Google
  Business Profile claimed? Reviews count + rating? Website mobile-fast or missing?
- **Social:** posting cadence, follower level, whether content converts (bio link, menu,
  order path). YouTube via vidIQ: keyword gaps, competitor channels, what's ranking.
- **Competitors:** pull 3–5 local competitors; note what they do that this business
  doesn't (online ordering, loyalty, review engine, active socials, ads).
- Keep it evidence-based; cite sources. Two-pass verify anything load-bearing.

### 3. Gap analysis — "where they're lacking"
Write it plainly, grouped: **Found** (what they have), **Missing** (what's costing them),
**Opportunity** (what we'd add). This is the heart of the Churrito Loco–style breakdown.
Typical gaps: no digital menu, no online ordering, dead/weak socials, unclaimed or thin
Google profile, no loyalty/retention, no review generation, no AI phone/email coverage,
no payments beyond cash.

### 4. Rough cost & scope estimate
Map the gaps to a Drop Kit package and give an **honest range**, itemized. Baseline
SousShift capabilities to scope from: digital menu site, branded loyalty catch-game,
demo/landing page, AI phone agent, AI email agent, local-SEO cleanup, review generation,
weekly customer win-back, crypto + card payments, content/marketing.
- Present as: **what's included**, **monthly package price range**, **one-time setup (if any)**,
  and **third-party pass-throughs** (domain, SMS, payment processing, AI/media credits).
- Tie it to the standard terms: **3-month lock-in, cancel only after, modifications are an
  added charge by scope** (see the SousShift service agreement doc).
- Never attach a revenue promise to the price.

### 5. Build the live demo (the Drop Kit)
Clone the proven template and rebrand it — do NOT rebuild from scratch:
- Copy `demo/lucky-dragon/` → `demo/<client-slug>/` (this is the reference build:
  digital menu + "catch" loyalty game + branded header + scoring key).
- Edit the **CONFIG block** (bottom of `index.html`): name, tagline/city, crest, phone,
  maps link, menu sections/items/prices, game title, prize tiers, address, hours.
- **Brand it to them:** set the CSS color tokens (`:root`) to their brand colors, pick a
  fitting display font, and rebuild the header banner motif. (Lucky Dragon = red/gold +
  Great Wave; Churrito Loco = white/orange/green.)
- **Photoreal food/brand art via Higgsfield** (the pipeline that worked):
  1. `models_explore` → use `recraft_v4_1` (`model_type:"utility"` for food on white,
     `"standard"` for logos/illustration), aspect per asset, `background_color:"#FFFFFF"`,
     `use_unlim:false`.
  2. `generate_image_batch` one item per request (each dish, the tray, any brand mark).
  3. `jobs_wait` → `show_generation_by_ids` so **Antidote approves before you wire anything**
     (you can't see the results yourself in a cloud session — the human verifies).
  4. `remove_background` on approved ones (max 8 concurrent on Plus) → `jobs_wait` for the
     transparent cutouts.
  5. Wire them into the game via the `SPRITE_FILES` map with the drawn-canvas art kept as
     automatic fallback, so nothing breaks if an image fails to load.
- **3D menu with real item photos:** generate a photoreal image for EACH menu item (the
  recraft/remove-background pipeline) and show them on the menu cards/plates, not just text.
  Every headline dish gets its own picture.
- **Cuisine-themed game (required):** pick the themed mini-game that matches the business type
  (see "Cuisine-themed games" below) and reskin the proven mechanic to it — themed falling
  items, themed catcher, themed mascot/hazard, themed scoring key. The game must read as
  *that cuisine's* game (hibachi → grilled items into a tray; tacos → catch the fillings;
  burritos → build/stack; pizza → catch toppings; etc.). Build **original** games and art only
  — never copy a branded or well-known game or character.
- Keep the engine (falling items, catcher, mascot hazard, directional smoke, scoring key,
  burn/combo stages) — reskin food, catcher, mascot, and brand to the cuisine.

### 5b. Retention demo (required in every pitch)
Every build includes a short **"Bring customers back"** section on the demo page that SHOWS the
win-back system, so the owner sees it, not just hears it:
- A sample **automated text** ("We miss you — 15% off your next hibachi this week 🔥"),
- A sample **win-back email** (branded subject + body),
- The **AI phone agent** line ("answers & takes orders 24/7"),
- One line each on how it triggers (lapsed customer, birthday, slow day).
Label it clearly as a demo of the connected system (goes live on signing). No revenue promises —
show the mechanism, not a number.
- Watch Higgsfield credits (`balance`); each generation + bg-removal spends them.

### 5c. Agreement section (required in every demo)
Every demo page must include the on-the-spot agreement builder, right before `</body>` and
after the CONFIG script: `<script src="../contract.js"></script>`.
It adds a "Draft the agreement" button that reads the page's CONFIG (name, address), pre-fills
the founding-partner deal ($2,000 setup / $300 mo, 25% off both, discount for 6 months,
50% at signing, 3-month minimum), lets the owner and Antidote sign on screen, and saves the PDF.
Nothing is uploaded. `demo/<slug>/#contract` opens it directly. Add a matching
"DRAFT THE AGREEMENT" button under the client's card in `demo/index.html`.
The wording mirrors `~/plugin/skills/second-shift-contract/template.html`; change both together.

### 6. Deliver
- Put the research + gap report + cost estimate in a **doc** (Claude Docs connector) or a
  markdown file in the repo under the client folder — whichever Antidote wants to send.
- Take the demo live: commit on a branch, open a PR to `main`, merge (GitHub Pages serves
  `main`); the demo is live at `antidotethecure.github.io/demo/<client-slug>/` within ~a minute.
- Add the client to the demo hub (`demo/index.html`) and the Pitch Tracker.
- End with the **single highest-leverage next move** to close them (who to contact, the
  message, the demo link, the offer) — not a menu of options.

---

## Cuisine-themed games (pick an original one, reskin the engine)
Match the game to the business type. These are **original** themed games — never clone a
branded or well-known game/character. Same proven engine (catch / match / stack), new theme:
- **Hibachi / teppanyaki** → *Hibachi Catch*: grilled chicken/steak/shrimp/veg fall into the
  takeout tray; dodge the flame; mascot dragon torches the plate.
- **Tacos / Mexican** → *Taco Catch* or *Loco Match*: catch falling fillings into the shell /
  match-3 of ingredients; dodge the ghost pepper.
- **Burritos** → *Burrito Build*: stack the right ingredients as they fall; drop the wrong one and lose.
- **Pizza** → *Topping Drop*: catch toppings onto the pie; dodge the burnt slice.
- **Burgers** → *Burger Stack*: stack patty/cheese/veg in order.
- **BBQ / wings** → *Grill Master*: catch the racks; dodge the flare-up.
- **Sushi** → *Roll Rush*: catch the fish/rice; dodge the wasabi bomb.
- **Coffee / dessert** → *Bean Drop* / *Sweet Catch*.
- **Barbershop** → *Fresh Cut* timing game. **Car wash** → *Suds Rush*. **Gym** → *Rep Counter*.
- Anything else → invent an original themed catch/match that fits the product.
Theme the falling items, the catcher, the mascot/hazard, the scoring key, and the colors to the brand.

## Output format for the breakdown (what Antidote sends the business)
1. **Snapshot** — who they are, where they are, vertical, verified contact/socials.
2. **Online presence today** — Google/SEO, website, socials, reviews (FACT vs INFERENCE).
3. **Where they're lacking** — Found / Missing / Opportunity.
4. **What we'd build** — the Drop Kit scope mapped to their gaps.
5. **Rough investment** — itemized range + package + terms (3-month lock-in, mods billed by scope).
6. **Proof** — the live demo link.
7. **Next move** — the exact close action.

## Guardrails
- Honest numbers only; no revenue/customer guarantees ever.
- Disclose AI-styled imagery until signing.
- Prize games launch only with the owner, as free-entry promos with official rules.
- Verify every business fact two ways; never ship a wrong phone number or dead social link.
- Match the client's real brand — colors, font, mascot — so it reads as *theirs*, not a template.
