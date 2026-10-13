# Sports Bar Package

A config-driven add-on for any restaurant or bar client: live local-team scores, a home-screen ticker, "My teams", the playoff picture, UFC cards, owner-edited Fight Night cards, and optional perks. Melody Bar & Grill (`demo/melody-lax/`) is the first install.

Info only: scores come from ESPN's public JSON. Nothing is scraped, and nothing is streamed.

## Files

| File | What it is |
|---|---|
| `sports.js` | The module. It reads `window.SPORTS_CFG` and exposes `window.SportsBar` (`open("teams"\|"fights")`, `close()`, `refresh()`). |
| `sports.css` | Styles. All colors and fonts are `--sp-*` variables, set from `SPORTS_CFG.theme`. |
| `teams.js` | Leagues (ESPN paths, trophy wording, playoff cutoffs) and **regions** (team lists by ESPN team ID). |
| `events.json` | Fight Night cards (BKFC and other promotions that ESPN doesn't cover). Edited by hand. |

## Add it to a client page

```html
<div id="sp-ticker"></div>   <!-- optional: the one-line live ticker, e.g. under the hero buttons -->
...
<link rel="stylesheet" href="../sports/sports.css?v=sb1">
<script>
window.SPORTS_CFG = {
  client: "storm-burger",            // slug: storage keys + events.json "clients" filter
  name: "Storm Burger",              // used in "Fight Night at …"
  title: "LA Scoreboard",            // sheet title + Games Pack tile title
  region: "la",                      // a key of SPORTS_REGIONS in teams.js
  // teams: [["nfl","14","LAR","Rams"]],   // optional: your own list instead of the region's
  leagues: ["mlb","nfl","nba","nhl","mls","wnba","cfb","cbb","ufc"],   // turn leagues on/off ("ufc" = Fights tab)
  ticker: "#sp-ticker",              // optional selector
  timeZone: "America/Los_Angeles", tzLabel: "PT",
  theme: { bg:"#0b1220", panel:"#141e34", edge:"#27324d", accent:"#d4af37", accent2:"#f0d375",
           ink:"#f6f1e4", dim:"#9aa3b5", onAccent:"#1a1405", display:"Georgia,serif", body:"system-ui", punch:"Impact" },
  fightNight: { url: "../sports/events.json" },   // or false to hide Fight Night cards
  perks: {
    watchParty: { text: "", note: "", when: "local" },   // banner while a local ("local") or followed ("followed") team is live.
                                                         // EMPTY TEXT = HIDDEN. Only real, owner-approved deals. {team} = team name.
    picks: { on: true, points: true, perPick: 2, dailyCap: 6 },   // "Who wins?" picks; points need the hook below
    rsvp: { label: "🎟️ Join Rewards for fight-night perks", href: "#rewards" }  // or action: function(event){…}; no label = hidden
  },
  points: {                          // optional rewards hook (omit = picks are just for fun)
    unit: "Rewards points",
    enabled: function () { return true; },          // e.g. the client's "rewards switched on" flag
    award: function (n, label) { return { pts: n, saved: true }; },   // credit n points; return what was credited
    offNote: "Pick points switch on soon."
  }
};
</script>
<script src="../sports/teams.js?v=sb1"></script>
<script src="../sports/sports.js?v=sb1"></script>
```

- **Games Pack:** if the page also runs a Games Pack (`window.MelodyGames`), the module adds a "Scoreboard" tile automatically. Set `gamesPackTile: false` to turn it off.
- **Melody's rewards hook:** `award(n)` calls `SSAI_GAMEPTS.award(n * perScore)` from `crm.js`. Pick points therefore count toward the shared 50-a-day game cap, and guests' points are held until they join. See the `SPORTS_CFG` block in `demo/melody-lax/index.html`.
- **Cache busters:** bump `?v=sb1` on every include when `sports.js`, `sports.css` or `teams.js` change (GitHub Pages caches for 10 minutes).
- **Add-to-Home-Screen:** `demo/a2hs.js` waits while `#sp-ov` is open, so the prompt never covers the scoreboard.

## Rules the module keeps

- Teams are matched by **ESPN team ID per league**, never by display name.
- A field the API doesn't send is hidden, never invented. "Games back" is arithmetic on the API's wins, losses and points against the team holding the last playoff seed (`LEAGUES[lg].cut`).
- Picks lock at the start time. Only a right pick made **before** the start earns points: at most `perPick` per game and `dailyCap` per day per phone, plus whatever cap the client's hook adds. Picks involve no money, no wagers and no odds.
- Refresh runs every 30 s while the sheet is open and every 60 s for the ticker. It pauses while the tab is hidden.
- If ESPN can't be reached, the sheet shows "Scores unavailable", the ticker hides, and the rest of the app is unaffected.

## ESPN endpoints (checked 2026-10-13)

| Use | URL | CORS |
|---|---|---|
| Scores | `site.api.espn.com/apis/site/v2/sports/{sport}/{league}/scoreboard?dates=YYYYMMDD` | `*` |
| Team facts | `…/teams/{id}/schedule` (`team.standingSummary`, `recordSummary`, events with notes, TV, results) | `*` |
| Standings | `site.api.espn.com/apis/v2/sports/{sport}/{league}/standings` (`playoffSeed`, `gamesBehind`, `clincher`, `magicNumberDivision`, MLS `note`) | `*` |
| UFC | `…/mma/ufc/scoreboard` (bouts in running order with the main event last; `records`, `winner`, `status.period`, `displayClock`, method in `details[].type.text`, e.g. "Unofficial Winner Kotko" = KO/TKO). League `calendar` lists upcoming cards. | `*` |
| (not usable) | `…/teams/{id}` sends **no** CORS header, so browsers can't read it. Use `/schedule`. | none |

ESPN's edge returns **403 to headless browsers**. Test with a headed browser; real phones are fine.

## Add a region

In `teams.js`, copy the `la` entry under a new key (e.g. `bay`). List each team as `[league, id, abbreviation, name]`, looking IDs up at `site.api.espn.com/apis/site/v2/sports/{sport}/{league}/teams`. Then set `SPORTS_CFG.region` to that key.

## Fight Night (`events.json`)

```json
{ "events": [ {
  "name": "BKFC 90: Example vs. Example",
  "promotion": "BKFC",
  "date": "2026-11-14T18:00:00-08:00",
  "venue": "Venue, City",
  "mainEvent": "Fighter A vs. Fighter B",
  "watchParty": "Main card on every screen, sound on. (The bar's own info.)",
  "clients": ["melody-lax"]
} ] }
```

`clients` is optional. Leave it out, or use `["all"]`, to show the card at every client. A card hides itself 8 hours after its start time. Only enter real, confirmed events.

## Perk: Football Squares (`squares.js`, server = Code.gs)

A **free promotional contest**: no paid entry, no purchase necessary, and no cash or money prizes in or out. Owner-set prizes are limited to:
- food
- merch
- % off the check
- a free **non-alcoholic** drink
- % off a drink (21+)

Never offer free alcohol (California ABC). The server refuses anything that reads like money (`$`, cash, gift card, credit…).

How it works:
- **Board:** one 10×10 board per NFL or college game, with up to `max` players (default 20) × `per` squares each (default 5).
- **Entry:** players must be Rewards members with a name (the existing sign-in), with one entry per member. They tap squares or use auto-pick.
- **Kickoff:** entries lock, and the row (home) and column (away) digits are drawn and revealed.
- **Winners:** at the end of Q1, halftime, Q3 and the final, the last digit of each score picks the winning square. Scores come from ESPN's `summary?event=` JSON on the server.
- **Unclaimed squares:** the prize rolls to the next quarter if the owner turns rollover on.

Client config:
```js
perks: { squares: { on: true, slug: "melody-bar-grill", owner: "Melody",
  api: function () { return "<Apps Script /exec URL>"; },             // POST squares_get / squares_claim
  member: function () { return { id: "...", name: "..." } || null; },  // the signed-in Rewards member
  join: function (cb) { /* open the client's existing sign-up, then cb() */ } } }
```
Include `<script src="../sports/squares.js?v=sq1"></script>` after `sports.js`. It adds a "🏈 Squares" tab to the scoreboard. The tab appears only when the server returns at least one board, so it stays hidden until the endpoints are deployed.

Owner controls are in the Christian HQ 🏈 Squares tab (`backoffice/christian/squares-hq.js`): create a board from upcoming games, set prizes per quarter, toggle rollover, lock and reveal, see entrants and winners, mark prizes redeemed, and delete. Destructive actions need two taps.

`?test=1` on either page uses `squares-mock.js`, an offline copy of the server logic with made-up data, kept in that browser's localStorage.

Server endpoints are in `command-center/clients/melody-lax/signup-sheet/Code.gs` (Squares tab): `squares_get`, `squares_claim` and `squares_admin` (bo token). Tests are in `tests/squares.test.mjs`.

## Follow-ups (not built)

- Push notifications for followed teams. This needs a push server, like the locbonus `push.vapid` plan.
- Server-side pick points. Picks are currently per phone, and points go through the client's rewards hook.
