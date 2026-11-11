/* Harry's · Route 66: Tulsa to Lomita smoke test (2026-11-10).
   Plays the whole loop headless through the game's own hooks (__R66.step / hold / pull): drive -> pull up -> Slow & Low ->
   serve -> back on the road, and checks: no page errors, a perfect hold + perfect pull scores more than a sloppy one,
   a walk-out costs a heart, the gamepad.js profile is "route66", and the final card is painted when the run ends.
     npm i playwright-core && python3 -m http.server 8000     (from the repo root)
     BASE=http://localhost:8000 node tests/harrys-route66.mjs            CHROME= overrides the browser path */
import { chromium } from 'playwright-core';
const CH = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = (process.env.BASE || 'http://localhost:8000') + '/demo/harrys-bbq/?season=off';
const b = await chromium.launch({ executablePath: CH });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
const errs = []; p.on('pageerror', e => errs.push(String(e)));
await p.goto(URL, { waitUntil: 'load' }); await p.waitForTimeout(1500);
const r = await p.evaluate(() => {
  const R = __R66, out = {};
  out.profile = window.GamePad && GamePad.profile;
  out.photo = !!(R.SP.truck && R.SP.truck.naturalWidth);   // the Higgsfield art in img/r66/ replaced the vector sprites
  function cook(good) {   // one order at the first stop; good = hold the gold band and pull on the gold
    R.setMode('adult'); R.start(); R.jump(0, 'stop'); const s = R.get(); s.inv.logs = 9;
    const s0 = s.score;
    for (let i = 0; i < 60 * 30 && s.cook && s.cook.tk === s.tickets[0]; i++) {
      const c = s.cook;
      if (c.phase === 'smoke') R.hold(good ? c.temp < (c.plo + c.phi) / 2 : c.temp < 262);
      if (c.phase === 'pull' && (good ? Math.abs(c.pullM - c.win) < 0.012 : c.pullT > 1)) R.pull(false);
      R.step(1 / 60);
    }
    return s.score - s0;
  }
  out.good = cook(true); out.bad = cook(false);
  R.start(); R.jump(1, 'stop'); const s = R.get(); const h0 = s.hearts; s.tickets[s.tickets.length - 1].left = 0.01; R.step(1 / 60);
  out.walk = h0 - s.hearts;
  // a whole drive leg reaches the next stop
  R.start(); for (let i = 0; i < 60 * 40 && R.get().phase !== 'stop'; i++) { R.get().hearts = 5; R.step(1 / 60); }
  out.reachedStop = R.get().phase === 'stop';
  R.end(); out.over = R.get().over;
  return out;
});
let bad = 0;
const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) bad++; };
check(r.profile === 'route66', 'gamepad profile = ' + r.profile);
check(r.photo, 'photo-real sprites loaded (img/r66/)');
check(r.good > r.bad, `perfect cook (${r.good}) beats sloppy cook (${r.bad})`);
check(r.walk === 1, 'a walk-out costs one heart');
check(r.reachedStop, 'a drive leg ends at a stop');
check(r.over, 'run ends cleanly');
check(!errs.length, 'no page errors ' + errs.join(' | '));
await b.close();
process.exit(bad ? 1 : 0);
