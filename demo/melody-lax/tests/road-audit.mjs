/* Melody flight game — ROAD AUDIT (hard rule: cars only ever drive in street lanes; never on grass, sidewalks or buildings).
   Flies every district of the route (index.html ZONES, ?zone=<id>) invulnerable and samples window.MELODY_3D.roadAudit() every
   0.5 s: every car on every live ground strip (moving traffic + parked cars) must sit on a drawn road of that strip and outside
   every landmark footprint (world3d.js seg.audit). Exits 1 on any violation.
     python3 -m http.server 8773   (from the repo root)
     node demo/melody-lax/tests/road-audit.mjs http://localhost:8773/demo/melody-lax/index.html [secondsPerZone=20]
   Needs playwright-core and Google Chrome (CHROME=<path> to override). ZONES=compton,dtla limits the districts. */
// every car (moving + parked, every ground strip in range) must be on a drawn street lane and outside every landmark footprint.
import { chromium } from 'playwright-core';
const [base, secs = '20'] = process.argv.slice(2);
const zones = (process.env.ZONES || 'melody,lax105,venice,compton,longbeach,hollywood').split(',');
const b = await chromium.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
let total = 0, totalBad = 0; const out = {}, errs = [];
for (const z of zones) {
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  p.on('pageerror', e => errs.push(z + ': ' + e.message));
  await p.goto(`${base}?zone=${z}&tod=18&v=${Date.now()}`); await p.waitForTimeout(7000);
  await p.evaluate(() => { const b0 = document.querySelector('[data-gm="play"]'); if (b0) b0.click(); setTimeout(() => document.querySelectorAll('.gm-sheet,.gm-ov').forEach(e => e.remove()), 600); setInterval(() => { const G = __MG.get(); G.inv = 999; G.hp = 100; }, 200); });
  await p.waitForTimeout(2000);
  const r = await p.evaluate((secs) => new Promise(res => { let n = 0, samples = 0; const bad = [], kinds = {}; const t0 = performance.now();
    const iv = setInterval(() => { const a = window.MELODY_3D && MELODY_3D.roadAudit(); if (a) { samples++; n += a.n; for (const k in a.kinds) kinds[k] = (kinds[k] || 0) + a.kinds[k]; if (bad.length < 30) bad.push(...a.bad.slice(0, 30 - bad.length)); bad.total = (bad.total || 0) + a.bad.length; }
      if (performance.now() - t0 > secs * 1000) { clearInterval(iv); res({ samples, n, badN: bad.total || 0, bad: bad.slice(0, 8), kinds }); } }, 500); }), +secs);
  out[z] = r; total += r.n; totalBad += r.badN; console.log(z.padEnd(12), 'samples', r.samples, 'car-checks', r.n, 'violations', r.badN, JSON.stringify(r.kinds), r.bad.length ? JSON.stringify(r.bad) : '');
  await p.close(); }
console.log(`TOTAL car-position checks ${total}, violations ${totalBad}` + (errs.length ? '\nERRORS ' + errs.join(' | ') : '\nno page errors'));
await b.close(); process.exit(totalBad ? 1 : 0);
