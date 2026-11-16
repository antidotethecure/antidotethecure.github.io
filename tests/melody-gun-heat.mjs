/* Melody Approach, 2026-11-15: the bullet guns overheat. They fire for GUN_HOT (5 s), smoke for GUN_COOL (2.5 s) with no
   rounds, then start back up. Watches one full cycle in the 2D view (the logic is the same in 3D).
   Run:  node tests/melody-gun-heat.mjs [baseUrl]            (default http://localhost:8841) */
import { chromium } from "playwright-core";
const BASE = process.argv[2] || "http://localhost:8841";
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log("ok   " + n); } else { fail++; console.log("FAIL " + n + (x ? " " + JSON.stringify(x) : "")); } };
const b = await chromium.launch({ args: ["--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 420, height: 800 } });
const errs = []; p.on("pageerror", e => errs.push(String(e).slice(0, 140)));
await p.goto(BASE + "/demo/melody-lax/index.html?render=2d&debug=1&season=off&god=1", { waitUntil: "load" });
await p.waitForTimeout(1500);
await p.evaluate(() => { document.querySelector(".gm-ov [data-gm=vibe]").click(); [...document.querySelectorAll("button")].find(x => /PLAY/.test(x.textContent)).click(); MELODY_DEBUG.god(); MELODY_DEBUG.level(1); });
// sample heat / cool-down / rounds fired every 100 ms until one full cycle has been seen (30 s at most). Heat and cool-down
// count GAME milliseconds, so the numbers are checked in game time: a slow headless browser stretches the wall clock.
const log = await p.evaluate(() => new Promise(done => { const G = MELODY_DEBUG.G(), out = []; let shots = 0, last = G.shotT, cooled = 0, back = 0;
  const iv = setInterval(() => { if (G.shotT > last) shots++; last = G.shotT; if (G.cool > 0) cooled = 1; else if (cooled && G.heat > 0) back++;
    out.push([G.heat, G.cool, shots, document.getElementById("wbtn").textContent]); if (back >= 12 || out.length >= 300) { clearInterval(iv); done(out); } }, 100); }));
const i0 = log.findIndex(s => s[0] > 0), c0 = log.findIndex(s => s[1] > 0), c1 = log.findIndex((s, i) => i > c0 && s[1] === 0), end = log[log.length - 1];
ok("guns start firing", i0 >= 0 && c0 > i0, { i0, c0 });
if (c0 > 0 && c1 > c0) {
  ok("they overheat at 5 s of fire, not before", log[c0][0] >= 5000 && log[c0][0] < 5150 && log[c0 - 1][0] < 5000, { heat: log[c0][0] });
  ok("the cool-down starts at 2.5 s", log[c0][1] > 2200 && log[c0][1] <= 2500, { cool: log[c0][1] });
  ok("rounds were fired before the cool-down", log[c0][2] > 5, { shots: log[c0][2] });
  ok("no rounds while cooling", log[c1 - 1][2] === log[c0][2], { a: log[c0][2], b: log[c1 - 1][2] });
  ok("the gun button says COOLING", /COOLING/i.test(log[c0 + 1][3]), log[c0 + 1][3]);
  ok("they start back up from cold", end[2] > log[c1 - 1][2] && end[0] > 0 && end[0] < 3000 && !/COOLING/i.test(end[3]), end);
} else ok("a full fire, cool, fire cycle was seen", false, { c0, c1, end });
ok("no page errors", !errs.length, errs);
await b.close();
console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
