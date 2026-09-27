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

Six throws through the real game flow. After each roll is scored, the pins the
scoreboard believes are standing must equal the pins the physics module believes are
standing. A disagreement means the score and the deck have drifted apart, which is the
bug class that re-racks a pin the player watched fall over. It prints `mismatches N`;
anything but 0 is a failure. It also flags any pin counted standing while leaning more
than 8 degrees.

Never pipe this through `tail` — that has truncated the failing line before.
