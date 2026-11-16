/* Storm Run · Inglewood landmark models (2026-11-15). The stadium, the round arena, the dome and the donut stand are real
   models (demo/storm-burger/img/3d/lm_*.glb). Guards: all four load, each shows on the road without a page error, and no new
   shader is compiled mid-run (program count stays flat = no freeze on phones). Prints the frame gaps of the run.
   shortcut: allows 1 new shader, because some runs on main compile one of their own (random event, seen 74 -> 75 before this change);
   tighten to 0 once that one is warmed up too.
     BASE=http://localhost:8000 node tests/storm-landmarks.mjs      (needs playwright-core; CHROME= overrides the browser path) */
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:8000', NAMES = ['stadium', 'forum', 'dome', 'donut'];
const b = await chromium.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(BASE + '/demo/storm-burger/index.html?render=3d', { waitUntil: 'load' });
await p.waitForFunction(() => window.__SB3 && (window.__SB3.booted || window.__SB3.reason), null, { timeout: 40000 });
await p.waitForTimeout(7500);   // both warm-up passes
const loaded = await p.evaluate(() => Object.keys(window.__SB3.lmod || {}).sort().join());
await p.evaluate(() => { [...document.querySelectorAll('button')].find(x => /^\s*▶?\s*PLAY\s*$/i.test(x.textContent)).click();
  let last = 0; window.__G = []; const f = t => { if (last) __G.push(t - last); last = t; requestAnimationFrame(f); }; requestAnimationFrame(f); });
const p0 = await p.evaluate(() => window.__SB3.mem().programs);
for (const n of NAMES) { await p.evaluate(n => window.__SB3.lmTest(n, n === 'stadium' || n === 'forum' ? 'L' : 'R'), n); await p.waitForTimeout(3500); }
const r = await p.evaluate(() => ({ programs: window.__SB3.mem().programs, frames: __G.length, worst: Math.round(Math.max(...__G)), over34: __G.slice(30).filter(g => g > 34).length }));
await b.close();
console.log(JSON.stringify({ loaded, programsBefore: p0, ...r, errs }));
const ok = loaded === NAMES.slice().sort().join() && r.programs - p0 <= 1 && !errs.length;
console.log(ok ? 'ALL OK: 4 landmark models on the road, at most 1 new shader in the run' : 'FAILED'); process.exit(ok ? 0 : 1);
