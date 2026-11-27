/* Melody game, Hollywood stretch (2026-11-16, Antidote: "I don't want it to keep repeating the Hollywood sign"): the two Hollywood
   levels fly over the Walk of Fame boulevard the whole way and pass the sign ONCE, about halfway (end of level 1 / start of level 2).
   Flies ~100 s of game time in the 3D chase view (needs a real GPU: the Mac's, via ANGLE Metal).
     BASE=http://localhost:8000 node tests/melody-hollywood-once.mjs      (needs playwright-core; CHROME= overrides the browser path) */
import { chromium } from "playwright-core";
const BASE = process.env.BASE || "http://localhost:8000";
const b = await chromium.launch({ executablePath: process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 420, height: 800 } }); const errs = []; p.on("pageerror", e => errs.push(String(e).slice(0, 160)));
await p.goto(BASE + "/demo/melody-lax/index.html?season=off&god=1&q=low", { waitUntil: "domcontentloaded", timeout: 90000 });
await p.waitForSelector(".gm-ov [data-gm=play]", { state: "attached", timeout: 90000 }); await p.waitForTimeout(3000);
const r = await p.evaluate(() => new Promise(done => { const v = document.querySelector(".gm-ov [data-gm=vibe]"); if (v) v.click(); document.querySelector(".gm-ov [data-gm=play]").click(); MELODY_DEBUG.god(1);
  const seen = new Set(), kinds = [], under = []; let n = 0;
  const iv = setInterval(() => { const G = __MG.get(); G.hp = 100;
    G.ground.forEach(g => { if (!g.id) g.id = ++n; if (!seen.has(g.id) && g.k !== "runway") { seen.add(g.id); kinds.push(g.k); } if (g.k === "hollywood" && !g.passed && g.y + g.h / 2 > G.y) { g.passed = 1; under.push(G.lvl + "@" + Math.round(G.el / 1000)); } });
    if (__M3.zoneId() !== "hollywood" || !G.running) { clearInterval(iv); done({ kinds, under }); } }, 50); }));
const hw = r.kinds.slice(0, r.kinds.findIndex(k => !["hwdblvd", "hills", "hollywood"].includes(k)) >>> 0), signs = hw.filter(k => k === "hollywood").length, at = hw.indexOf("hollywood");
let fail = 0; const ok = (n, c, x) => { if (!c) fail++; console.log((c ? "ok   " : "FAIL ") + n + (c ? "" : " " + JSON.stringify(x))); };
ok("the 3D route ran (Hollywood strips were built)", hw.length > 20, r.kinds.slice(0, 10));
ok("the Hollywood sign is built exactly once", signs === 1, hw);
ok("the sign sits in the middle of the stretch, not at the start or end", at > hw.length * .25 && at < hw.length * .75, { at, of: hw.length });
ok("it passes under the plane around the level 1 → 2 change", r.under.length === 1 && /^(1|2)@/.test(r.under[0]), r.under);
ok("the rest is the Walk of Fame boulevard", hw.filter(k => k === "hwdblvd").length >= hw.length * .6, hw);
ok("no page errors", !errs.length, errs);
await b.close(); console.log(fail ? "FAILED: " + fail : "ALL OK"); process.exit(fail ? 1 : 0);
