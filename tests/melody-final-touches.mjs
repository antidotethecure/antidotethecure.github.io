/* Melody game final touches (2026-11-27, Antidote): music starts on the PLAY tap and shuffles, review billboards from take-off,
   no landmark repeating through Hollywood (record tower, diner, premiere theatre, sign: once each a visit), a paint job per run.
   Flies the whole Hollywood stretch (~95 s) in the 3D chase view with Chrome's strict autoplay rule (a real click is the only unlock).
     BASE=http://localhost:8000 node tests/melody-final-touches.mjs     (needs playwright-core + a GPU) */
import { chromium } from "playwright-core";
const BASE = process.env.BASE || "http://localhost:8000";
const b = await chromium.launch({ executablePath: process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--autoplay-policy=user-gesture-required"] });
const p = await b.newPage({ viewport: { width: 420, height: 800 } }); const errs = []; p.on("pageerror", e => errs.push(String(e).slice(0, 200)));
let fail = 0; const ok = (n, c, x) => { if (!c) fail++; console.log((c ? "ok   " : "FAIL ") + n + (c ? "" : " " + JSON.stringify(x))); };
await p.goto(BASE + "/demo/melody-lax/index.html?season=off&god=1", { waitUntil: "domcontentloaded", timeout: 90000 });
await p.waitForSelector(".gm-ov [data-gm=play]", { state: "attached", timeout: 90000 }); await p.waitForTimeout(3000);
await p.click(".gm-ov [data-gm=play]", { force: true });
await p.waitForTimeout(1500);
const m0 = await p.evaluate(() => { const a = GameMusic.el(); return { playing: !a.paused, src: a.src.split("/").pop(), liv: __M3STATUS.livery }; });
ok("music is playing right after the PLAY tap", m0.playing, m0);
ok("the plane got a paint job for this run", !!m0.liv, m0);
// shuffle: jump to the end of the song; the same element goes on to another song
const m1 = await p.evaluate(() => new Promise(done => { const a = GameMusic.el(), s0 = a.src; a.dispatchEvent(new Event("ended"));   // (a plain test server can't seek to a song's end, so fire its end)
  setTimeout(() => done({ same: GameMusic.el() === a, s0: s0.split("/").pop(), s1: a.src.split("/").pop(), playing: !a.paused, label: GameMusic.cur().src.split("/").pop() }), 2500); }));
ok("when a song ends another song starts (same <audio>, so iPhone allows it)", m1.same && m1.s1 !== m1.s0 && m1.playing, m1);
const r = await p.evaluate(() => new Promise(done => { const tot = {}, prev = {}; let firstBoard = null, n = 0; const t0 = performance.now();
  const iv = setInterval(() => { const G = __MG.get(); G.hp = 100; n++;
    const lm = MELODY_3D.landmarks() || {}; for (const k in prev) if ((lm[k] || 0) < prev[k]) tot[k] = (tot[k] || 0) + prev[k];   // a level change resets the census
    for (const k in prev) delete prev[k]; Object.assign(prev, lm);
    if (firstBoard == null && (window.__BBRAW || 0) > 0) firstBoard = Math.round((performance.now() - t0) / 1000);
    if (__M3.zoneId() !== "hollywood" || !G.running || n > 2400) { clearInterval(iv); for (const k in prev) tot[k] = (tot[k] || 0) + prev[k]; done({ tot, firstBoard, el: Math.round(G.el / 1000) }); } }, 50); }));
ok("a review billboard is on screen within 15 s of take-off", r.firstBoard != null && r.firstBoard <= 15, r);
ok("the Boulevard ran the whole stretch", (r.tot.walkOfFame || 0) >= 12, r.tot);
ok("record tower once in Hollywood", r.tot.records === 1, r.tot);
ok("diner once in Hollywood", r.tot.diner === 1, r.tot);
ok("no page errors", !errs.length, errs);
await b.close(); console.log(fail ? "FAILED: " + fail : "ALL OK"); process.exit(fail ? 1 : 0);
