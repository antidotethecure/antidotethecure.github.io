# Venue Versus: deploy + go-live

Live head-to-head games for people at the same bar. Shared by every SousShift AI client app; Melody Bar & Grill LAX is the pilot.

## What is where

| Piece | Where | Status |
|---|---|---|
| Server (Durable Object `Rooms` + `/api/versus/*`) | scores site `drizzle-bowl-scores.higgsfield.app` (Higgsfield website `72d17fab-2a98-4d50-90ac-aa5f93745a6e`) | **staged, not published** (local branch `venue-versus` in `~/dev/hf-sites/scores-versus`, patch `~/dev/hf-sites/venue-versus-worker.patch`) |
| Guest lobby, battle runner, picks, Sky Duel client | `demo/versus.js` | this PR |
| Melody hooks (seeded RNG path, `__MG.versus`, ghost plane, shared power-ups) | `demo/melody-lax/index.html` | this PR |
| Bar TV | `demo/versus/tv.html?slug=melody&tv=<TV key>` | this PR |
| Menu Dash race | `demo/versus/race.html` | this PR |
| Owner page (nightly battle, events, prize claims, TV link, table QR) | `demo/versus/admin.html?slug=melody` | this PR |
| Printable table cards | `demo/versus/print.html` (opened from the owner page) | this PR |
| Per-venue look | `demo/versus/venues.js` (pages) + `app/src/versus/venues.ts` (server) | both |

Until the server is published, the Melody page shows the Versus card as "Lobby offline right now" and everything else on the page works exactly as before (the router answers 503 without the `Rooms` binding).

## Publish the server (exact steps)

The worker change is 7 files on top of the live tree (`afc6fa8…`, last live commit "Add /api/case-drop…"):

```
app/app.manifest.json          "durableObject": null  ->  "Rooms"
app/src/server.ts              export { Rooms }; /api/versus/* goes to the DO before SSR
app/src/versus/rooms.ts        the Durable Object (lobby + match rooms)
app/src/versus/router.ts       routing + 503 when the binding is missing
app/src/versus/util.ts         signed tokens, geo, names, venue-local time
app/src/versus/venues.ts       Melody config, anti-cheat ceilings, admin key hash
app/scripts/versus-api-test.mjs  57-check API test for LOCAL wrangler dev (not part of the build)
```

1. Get a checkout of the live repo: Higgsfield connector `website_repo_access` (operation `checkout`, website id above). In that sandbox checkout:
   `git checkout -b venue-versus` is optional; the platform deploys `main`.
2. Apply the patch (copy `~/dev/hf-sites/venue-versus-worker.patch` into the sandbox, then `git am venue-versus-worker.patch`), or copy the 7 files. Check `git show --stat HEAD` lists only those files (`git apply --check` against the live tree `afc6fa8` was verified clean on 2026-10-15).
3. In the sandbox: `cd app && bun install --frozen-lockfile && bun run typecheck && bun run build`. Confirm `grep -n "Rooms" dist/server/server.js` shows `export { Rooms, …`.
4. `website_repo_access` operation `push`, then `deploy_website` (preview), check `website_status`.
5. Smoke test the preview URL: `GET /api/versus` → `{"ok":true,"service":"venue-versus","rooms":true}`; `GET /api/versus/state?slug=melody` → tonight's 9:00 PM event. Existing routes (`/api/game-scores?game=melody`, `/api/scores`) unchanged.
6. `publish_website` to production. The Durable Object is created on first use; there is no migration to run (D1 is untouched).

If `rooms` comes back `false`, the platform didn't bind the Durable Object: check `app.manifest.json` has `"durableObject": "Rooms"` and that `server.ts` exports `Rooms`.

## Go live at Melody (owner steps)

1. **Admin key.** It is in `~/.config/sousshift/versus.env` (`VERSUS_ADMIN_KEY_MELODY`, chmod 600). Give it to Christian privately (or keep it and run the owner page yourself). Never post it. To rotate: make a new key, put its SHA-256 in `venues.ts` (`adminHash`), redeploy.
2. **Owner page:** open `https://antidotethefoodie.com/demo/versus/admin.html?slug=melody`, paste the key, Unlock.
   - Nightly battle: on at 9:00 PM by default, bragging rights. Add a menu perk if Christian wants one (e.g. "Free Melody Fries"). Drink perks get the 21+ flag automatically.
   - "Who wins?" picks are on.
3. **Bar TV:** on the owner page tap **Make the bar-TV link**, open it on the TV browser, full screen. It shows who's here, the countdown, the live board, the winner, picks, the 4-digit code and the QR (both rotate). Keep that link private: it shows the check-in code.
4. **Table QR (optional):** owner page → **Print table QR cards** → pick how long they're good for → print. Cards carry "Powered by SousShift AI".
5. Tell staff: a winner shows a `VV-XXXXX` code; check it on the owner page (Tonight's prize claims), give the perk, tap Used. Drink perks: check ID.

## Rules the server enforces

- Free to enter: there is no buy-in field anywhere. No wagers between players. Prizes are menu perks; text with cash / gift card / Venmo / bet / raffle is refused.
- Members only to claim (Melody Rewards account), alcohol perks only to 21+ members (birthday on the account; staff check ID), one Versus prize per person (member or device) per day, same night only.
- One entry per device and per member per event. Scores above the game's real maximum (700/s + 16,000 for a 2-minute Melody Survival flight) are rejected; race distance can't grow faster than top speed; race finish times must match the server clock (±4 s) and be ≥ 52 s.
- Presence: TV QR (15-minute signed link), printed table QR (signed, expires), TV 4-digit code (rotates every 10 min), or location within 150 m at the moment you tap. Not proven = practice (🧪): you play and rank, no prizes.
- Kids (`SSAI_KID_MODE`): separate ready pool, separate duel/race queues, separate board in battles, generated nickname, no prizes.
- Chat: preset emoji reactions only.

## Local testing

```
# worker (from ~/dev/hf-sites/scores-versus/app): bun run build, then wrangler dev with a local config that binds
#   durable_objects ROOMS -> Rooms (new_sqlite_classes) and HF_ENV "dev"
# site: python3 -m http.server 8000 in the repo root
# pages: http://127.0.0.1:8000/demo/melody-lax/?vvapi=http://127.0.0.1:8787#versus
#        a second "player" on http://localhost:8000/... (different origin = different device id)
```

Local-only test hooks (they need `HF_ENV=dev` AND a localhost request, so they never work on the deployed site): admin key `vv-dev-local-only`, `POST /api/versus/dev/mock-games` (fake ESPN games for picks), `?autopilot=1` on race.html (your runner plays itself).

## Phase 3 (design notes only, not built)

- **8-player knockout:** a bracket object per event (`venue:<slug>:ko:<id>`), seeded by the nightly battle's top 8 (verified only). Rounds are 60-second Sky Duels on one shared seed per round, all four pairs at once; ties go to the higher seed. The TV shows the bracket; byes when fewer than 8.
- **Venue-vs-venue cups:** a league object (`league:<id>`) that every venue lobby reports its nightly top-5 average to (signed server-to-server, never from phones). Weekly table on each venue's TV; venues are only ranked against venues with ≥ 5 verified players that night. Prizes stay per venue (each owner's own menu perk); nothing crosses venues except bragging rights.
- Both reuse the existing anti-cheat ceilings and presence rules; no new client code beyond a bracket/league view in `versus.js` and `tv.html`.
