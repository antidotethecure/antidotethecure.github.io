# Antidote Drizzle Bowl — global weekly leaderboard

The leaderboard is LIVE. No setup needed — it's already wired into the game.

- **Standings page:** https://drizzle-bowl-scores.higgsfield.app
  (shows This Week's top 10 and the All-Time Clamps, with a PLAY button
  linking back to the game — share this link anywhere)
- **Score API:** https://drizzle-bowl-scores.higgsfield.app/api/scores
  (the game reads and writes here; it's set in `index.html` as `LEADERBOARD_URL`)

## How it works
- When a player finishes a game, they type their name on the in-game keyboard
  and their score posts to the global board.
- The in-game WEEKLY LEADERS list shows the real site-wide top 10.
- Boards reset every Monday; each player's best score per week counts once.
- Past weeks stay stored, so you can announce a weekly winner anytime.

## Anti-junk protections (built into the server)
- Names are stripped to letters/numbers/spaces, max 12 characters.
- Scores are capped at 450 (the game's theoretical max range).
- Malformed submissions are rejected.

## Managing scores
The score database lives with the leaderboard service. To remove a bad entry
or pull a week's results, just ask Claude in a session — it can read the
database directly and ship a cleanup.

## Note
If a player somehow can't reach the leaderboard (offline, blocked network),
the game quietly falls back to a device-local board so their score still shows.
