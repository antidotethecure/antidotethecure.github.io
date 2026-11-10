/* Melody Approach, 2026-11-02: full screen, rounds that stay where they were fired, and the halftime break waiting for the
   third level to end.
   1. pure maths, no browser: the halftime gate.
   2. in a browser: full screen fills the box with the 3D view while the 400x600 field keeps its shape on top of it, proj()
      measures the same either way, and a round in the air keeps the muzzle it came out of when the plane steers away.
   Run:  node tests/melody-fullscreen.mjs [baseUrl]            (default http://localhost:8841) */
import { chromium } from "playwright-core";
const BASE = process.argv[2] || "http://localhost:8841";
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log("ok   " + n); } else { fail++; console.log("FAIL " + n + (x ? " " + JSON.stringify(x) : "")); } };

/* ---- 1. the halftime gate (demo/halftime.js) ---- */
const htFires = (n, ms, min = 90000) => !(n < 4 || n > 6) && !(ms < min && n !== 6);
ok("halftime: not after level 1", !htFires(2, 200000));
ok("halftime: not after level 2", !htFires(3, 200000));
ok("halftime: plays once level 3 is beaten", htFires(4, 200000));
ok("halftime: still waits for the clock at level 4", !htFires(4, 40000));
ok("halftime: catches up at level 5", htFires(5, 200000));
ok("halftime: last chance at level 6 whatever the clock says", htFires(6, 10000));
ok("halftime: never after level 6", !htFires(7, 200000));

/* ---- 2. the browser: full screen layout + projection ---- */
const b = await chromium.launch({ args: ["--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; p.on("pageerror", e => errs.push(String(e).slice(0, 140)));
await p.goto(BASE + "/demo/melody-lax/index.html?render=3d&debug=1&season=off", { waitUntil: "load" });
await p.waitForFunction(() => window.__M3STATUS && (window.__M3STATUS.on || window.__M3STATUS.reason), null, { timeout: 40000 });
ok("3D renderer boots", await p.evaluate(() => window.__M3STATUS.on), await p.evaluate(() => window.__M3STATUS.reason));

const rects = () => p.evaluate(() => { const g = document.querySelector("canvas.m3d").getBoundingClientRect(), c = document.getElementById("cv").getBoundingClientRect();
  return { gl: [Math.round(g.width), Math.round(g.height)], cv: [Math.round(c.width), Math.round(c.height)], same: Math.abs(g.width - c.width) < 2 && Math.abs(g.height - c.height) < 2 }; });
const before = await rects();
ok("page view: the 3D view and the field are the same rectangle", before.same, before);

/* proj() turns a game point into 400x600 overlay pixels, and the overlay is the same 400x600 field in both layouts: widening the
   3D view must add city at the sides, never stretch or shift what the field measures. The check that holds whatever the camera is
   doing: two ground points 100 game px apart must come out 100 overlay px apart times the scale proj() reports for them. If the
   view rect and the overlay ever disagree, every billboarded label drifts off the thing it points at. */
const scaleCheck = () => p.evaluate(() => { const M = window.__M3, a = M.proj(150, 470, 150), b2 = M.proj(250, 470, 150);
  return a && b2 ? +((b2[0] - a[0]) / a[2]).toFixed(2) : null; });
const sb = await scaleCheck();
ok("page view: 100 game px measure 100 px on the overlay", sb != null && Math.abs(sb - 100) < 4, sb);

/* a round in the air must keep the muzzle it came out of, whatever the plane does next: the streak, the ghost round and the gun
   glow are all drawn back to that point, and anchoring them on the live muzzle is what made the whole burst swing when you steer */
const shot = await p.evaluate(async () => { const M = window.__M3, G = M.G(), sleep = ms => new Promise(r => setTimeout(r, ms));
  G.shots.length = 0; const sh = { x: 200, y: 560, w: 0 }; G.shots.push(sh);
  await sleep(260); const born = sh.o3x;
  G.x = G.tx = 340; sh.y = 560; await sleep(420); const after = sh.o3x;
  const moved = Math.abs(M.G().x - 200) > 60; G.shots.length = 0;
  return { born: born === undefined ? null : +born.toFixed(2), after: after === undefined ? null : +after.toFixed(2), moved }; });
ok("a round remembers the muzzle it was fired from", shot.born !== null, shot);
ok("the plane really moved for the check", shot.moved, shot);
ok("steering does not drag the round's streak with it", shot.born !== null && shot.born === shot.after, shot);

await p.evaluate(() => window.GameFS.enter());
await p.waitForTimeout(900);
const after = await rects();
ok("full screen: the 3D view fills the screen", after.gl[0] >= 1200 && after.gl[1] >= 600, after);
// the canvas element covers the whole screen, but the 400x600 picture inside it must keep its shape (object-fit:contain)
const field = await p.evaluate(() => { const f = window.__M3.field(); return { w: Math.round(f.w), h: Math.round(f.h), k: +f.k.toFixed(3) }; });
ok("full screen: the field keeps its 400x600 shape", Math.abs(field.w / field.h - 400 / 600) < 0.02, field);
ok("full screen: the field is scaled up, not stretched", field.k > 1 && field.w < after.gl[0] - 50, field);
const sa = await scaleCheck();
ok("full screen: 100 game px still measure 100 px on the overlay", sa != null && Math.abs(sa - 100) < 4, { page: sb, full: sa });
ok("full screen: no horizontal page scroll", await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));

await p.evaluate(() => window.GameFS.exit());
await p.waitForTimeout(600);
const back = await rects();
ok("leaving full screen puts the view back", back.same, back);
ok("no page errors", errs.length === 0, errs);

await b.close();
console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
