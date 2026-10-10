# Owner setup kit

One tap-first owner setup form, branded per restaurant. Every page asks the same
questions with the same logic. Only the config changes.

```
python3 setup-kit/build.py              # rebuild every page
python3 setup-kit/build.py nalu-vida    # rebuild one
```

Each `configs/<slug>.json` writes `/<out>/index.html`. `out` defaults to `<slug>/setup`;
Melody sets `"out": "melody/setup"` to keep its live URL. Generated pages say so in a
comment at the top. Edit the config or `template.html`, never the output.

## Files
- `template.html`: the page and all of its logic. Placeholders `{{...}}` are filled by build.py, and the config goes in as `var CFG`.
- `build.py`: reads the config, pulls the menu (and Nalu's prizes) from the demo files, then writes the page.
- `configs/*.json`: one per restaurant.

## Config keys
| key | what |
|---|---|
| `slug`, `name`, `short`, `owner` | `owner` is used in the greeting "Hi {owner}!". Use `"there"` when the owner is unknown. |
| `ownerNames` | Options for "Who gets the phone host's messages?". "Manager on duty" and "Everyone" are added automatically. |
| `badge` | Optional pill under the title. Gritz N Wafflez uses `"Woman-owned business"`, which is the only identity label allowed for them. |
| `storageKey` | localStorage key. Melody keeps `melody-setup-v2` so taps Christian already made are kept. |
| `brand` | CSS tokens: `bg page card edge ink dim accent accentBg accentInk chip tgOff ok h1 h2 noteBg noteEdge noteInk barBg badgeBg badgeInk`, `display`/`body` font stacks, `fonts` (Google Fonts URL), `extraCss`. |
| `logo` | One of `{"img": "demo/<slug>/img/logo.png", "boxStyle": "..."}` (path from the repo root, made relative at build time), `{"svgFrom": "demo/<slug>/index.html"}` (copies its `<svg class="logo">`), or `{"html": "..."}`. |
| `alcohol` | `true` shows the California "no free alcohol as a reward, drink discounts OK" note. |
| `avgCheck` | Average check used by the giveaway estimate card. |
| `giveawayDefault` | `"$50"`, `"$100"`, `"$200"` and so on. |
| `happyHour` | Text such as `"3–6 PM"`. Leave it out and the double-points question asks about slow hours instead. |
| `drawDays` | Choices for the giveaway draw day. The first one is the default. |
| `rewards` | Restaurant-item choices: `welcome, points[4], t1..t4, stars, referIn, referFriend, bday, missed, winback, playwin`. **The first option is the pre-selected default.** |
| `drawPrizes` | Signature-item choices for the daily lucky draw (members). The first 3 are pre-selected; "Free soft drink / mocktail" and "$5 off" are added automatically. Without it, free items from `t1`, `playwin` and `stars` are used. |
| `game` | `name`, `prizes: [[score, [options]]]` (or `prizesFrom: {file, var}` plus `alts` to read live thresholds such as `window.NALU_PRIZES`), `champ`, optional `second`. |
| `special` | Optional deal block: `{title, qs: [[key, label, [options]]]}`. Examples are Melody's "Just Landed" deal and the Nalu ↔ Melody sister perk. |
| `specials`, `specialsTitle` | `[[key, label]]`. Each one is answered Yes / Changed / Stopped. |
| `phone` | `[[key, question, [options]]]`. These have no default, and "Not sure" is added. Leave it out to get the generic quick-serve set. |
| `menu` | `{"type": "inline", sections}`, `{"type": "rows-json", file}` (Nalu's `menu.json`: `[category, slug, name, price, desc]`), or `{"type": "js", file, var, key?}` (a JS literal inside a demo page, evaluated with node). `drinkSections` lists which sections count as drinks. |
| `menuNote`, `drinksTitle` | Optional text above the menu. |

Prices: a number gets the ± stepper. `"MP"` shows "Market price" with no stepper. A
missing price shows "Price not on file yet" with no stepper (all of Gritz's prices are missing).

## The same questions for everyone
Weekly giveaway (with the estimate card and the California free-entry line), welcome gift, points or
stars, points per $1, 10-star reward, 4-tier ladder, referral (inviter and friend), happy-hour double points,
3 monthly visit levels, birthday treat and window, missed-call offer and days, win-back text, game
prizes and weekly #1, optional special deal, rules (expiry, one per visit, stacking), weekly specials,
phone-host questions, daily lucky draw (odds, prizes; 3-day redeem window), promo codes (WELCOME{n}, FRIEND{n}, BDAY, PLAYWIN; each has a toggle and value chips),
your register (POS) with a link to the `/pos/` step-by-step guide, menu on/off and prices, and go live. "Send to Antidote" shares a plain-text summary through
`navigator.share`, or falls back to `sms:`.

## Fill-in answers (discounts, prizes, numbers)
Every discount or prize question is a fill-in, not a chip list: the config's first option shows as
"Suggested: …" with a ✓ Keep suggested button, and the owner can type his own number instead.
Any question whose options look like rewards (`N% off`, `$N off`, `Half off`, `Free …`, `bonus points`)
becomes one automatically, including `special.qs`. Reward questions get a "% off · $ off · Free item"
toggle (plus "Bonus pts" when an option has bonus points, and "Nothing"/"Don't send"/"No perk" when one is
listed). Fixed fill-ins: giveaway ($), points per $1, visit levels (%), WELCOME (%) and FRIEND ($) codes.
Points-tier costs and game score lines are editable too (`pts:t1`, `score:g1` in storage). Answers are
still saved as plain strings ("25% off one drink"), so old chip answers keep working. A typed free item
that looks alcoholic shows the California note (it doesn't block).

## Adding a restaurant
1. Copy the config closest to it into `configs/<slug>.json`.
2. Point `menu` at its demo page or data file, and fill in `rewards` and `game` with its real items and score lines.
3. Run `python3 setup-kit/build.py <slug>`, then open `/<slug>/setup/` on a phone-sized screen.
