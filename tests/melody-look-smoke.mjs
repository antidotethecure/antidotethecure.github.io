/* Melody Approach, 2026-11-16: the chase-view look changes (dimmer tracers, beams from the nose, brighter rim-lit aircraft,
   smoother building hits) are shader and draw code, so the check is that the real 3D view still runs with them: every aircraft
   shader compiles, guns and beams fire, buildings get shot and flown into, and the game never drops back to the 2D view.
   Run:  node tests/melody-look-smoke.mjs [baseUrl]            (default http://localhost:8841; needs a GPU-backed Chrome) */
import { chromium } from "playwright-core";
const BASE = process.argv[2] || process.env.BASE || "http://localhost:8841";
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log("ok   " + n); } else { fail++; console.log("FAIL " + n + (x ? " " + JSON.stringify(x) : "")); } };
const b = await chromium.launch({ channel: "chrome", args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 420, height: 800 } });
const errs = [], shader = []; p.on("pageerror", e => errs.push(String(e).slice(0, 160)));
p.on("console", m => { if (m.type() === "error" && /shader|WebGLProgram|GLSL/i.test(m.text())) shader.push(m.text().slice(0, 200)); });
await p.goto(BASE + "/demo/melody-lax/index.html?debug=1&season=off&god=1", { waitUntil: "domcontentloaded", timeout: 90000 });
await p.waitForSelector(".gm-ov [data-gm=vibe]", { state: "attached", timeout: 90000 }); await p.waitForTimeout(3000);
await p.evaluate(() => { document.querySelector(".gm-ov [data-gm=vibe]").click(); document.querySelector(".gm-ov [data-gm=play]").click(); MELODY_DEBUG.god(1); MELODY_DEBUG.level(4); });
await p.waitForTimeout(4000);
const st0 = await p.evaluate(() => ({ ...window.__M3STATUS }));
ok("the 3D chase view is running", st0.on && st0.view === "chase", st0);
// twin guns, then the blue beams, with jets and helicopters on screen; then dive into the rooftops
const shots = await p.evaluate(() => new Promise(done => { const G = MELODY_DEBUG.G(); let guns = 0, beams = 0, n = 0; MELODY_DEBUG.jets();
  const iv = setInterval(() => { n++; G.hp = 100; G.heat = 0; G.cool = 0; if (n === 40) { MELODY_DEBUG.ammo(3, 99); MELODY_DEBUG.weapon(3); MELODY_DEBUG.jets(); }
    for (const s of G.shots) { if (s.w === 0) guns++; if (s.w === 3) beams++; } if (n >= 90) { clearInterval(iv); done({ guns, beams }); } }, 100); }));
ok("the guns fired", shots.guns > 0, shots); ok("the blue beams fired", shots.beams > 0, shots);
// fly at rooftop height with the guns on: buildings get shot (bldShot) and flown into (bldHit); both are counted through the game's own hooks
const bld = await p.evaluate(() => new Promise(done => { const G = MELODY_DEBUG.G(), M = window.__M3, c = { shot: 0, hit: 0 }, s0 = M.bldShot, h0 = M.bldHit; let n = 0;
  M.bldShot = function () { c.shot++; return s0.apply(this, arguments); }; M.bldHit = function () { c.hit++; return h0.apply(this, arguments); }; MELODY_DEBUG.weapon(0);
  const iv = setInterval(() => { n++; G.hp = 100; G.heat = 0; G.cool = 0; G.ens.length = 0; G.alt3 = 70; G.ta = 70; if (n >= 300 || (c.hit >= 2 && c.shot >= 5 && n > 60)) { clearInterval(iv); M.bldShot = s0; M.bldHit = h0; done(c); } }, 50); }));
ok("shots hit buildings", bld.shot >= 5, bld); ok("the plane flew into buildings (the struck top sinks, nothing breaks)", bld.hit >= 1, bld);
await p.waitForTimeout(1500);
const st1 = await p.evaluate(() => ({ ...window.__M3STATUS }));
ok("still in the 3D view at the end (no fall-back to 2D)", st1.on && st1.view === "chase", st1);
ok("no shader failed to compile", shader.length === 0, shader); ok("no page errors", errs.length === 0, errs);
await b.close(); console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
