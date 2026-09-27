# Drizzle Bowl test harness

Browser tests for the game, kept in the repo because a container restart once wiped
them and they had to be rebuilt from scratch.

## Running

    npm install three@0.160.0 cannon-es@0.20.0 playwright-core
    # serve the game directory (index.html plus assets/) on :8765
    python3 -m http.server 8765
    node pwpins2.js

`harness.js` holds the shared scaffolding: it launches headless Chromium, routes the
CDN module imports at local copies of three and cannon-es, blocks the live domains so a
test never depends on the network, and waits for the game to report itself ready.

Serve the real `assets/` alongside `index.html`. Without it the scan and the food sheet
404 silently and the game falls back to a stand-in bowler and emoji pins, so a test can
pass while exercising none of the real art.

## pwpins2.js — the scoring gate

Six throws through the real game flow. After each roll is scored it checks two things:

1. The pins the scoreboard believes are standing must be **the same pins** the physics
   module believes are standing — not merely the same *number* of them.
2. No pin counted standing may be off the pin deck.

Check 1 is worded that way for a reason. The gate used to compare counts only, and a
dead-wood bug walked straight through it: a pin driven forward off the deck and left
upright out on the lane was still counted as standing, so the two totals agreed
perfectly while the scoreboard pointed at the wrong pin. Comparing identities is what
catches a permutation or a mislabelled pin; comparing counts never will.

It prints `mismatches N`; anything but 0 is a failure.

Never pipe this through `tail` — that has truncated the failing line before.
