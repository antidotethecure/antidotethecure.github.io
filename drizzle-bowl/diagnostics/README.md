# Nightly diagnostics

`nightly.js` loads both live copies of the game in a headless browser and checks:
the 3D lane starts, a full throw completes and scores, the halftime ad reel is four
reachable clips from different reviews, the ball colour / crowd / reel change between
loads, the leaderboard button opens with data, and the score API answers with CORS.

It prints one `REPORT {...}` JSON line. `ok:false` lists the problems found.

Run (needs Playwright with Chromium):

    NODE_PATH=$(npm root -g) node nightly.js
