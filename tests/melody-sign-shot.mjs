/* Screenshot the Hollywood sign + check the help bubble and holiday theme are off during a flight (2026-11-27).
     BASE=http://localhost:8000 OUT=/tmp/x.png node tests/melody-sign-shot.mjs */
import { chromium } from "playwright-core";
const BASE = process.env.BASE || "http://localhost:8000", OUT = process.env.OUT || "sign.png";
const b = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 420, height: 800 } }); const errs = []; p.on("pageerror", e => errs.push(String(e).slice(0, 200)));
let fail = 0; const ok = (n, c, x) => { if (!c) fail++; console.log((c ? "ok   " : "FAIL ") + n + (c ? "" : " " + JSON.stringify(x))); };
await p.goto(BASE + "/demo/melody-lax/index.html?god=1&season=christmas&lmcam=hollywood" + (process.env.Q || ""), { waitUntil: "domcontentloaded", timeout: 90000 });
await p.waitForSelector(".gm-ov [data-gm=play]", { state: "attached", timeout: 90000 }); await p.waitForTimeout(3000);
await p.click(".gm-ov [data-gm=play]", { force: true }); await p.waitForTimeout(2500);
for (let i = 0; i < 6; i++) { await p.mouse.click(210, 500); await p.waitForTimeout(150); }   // taps mid-flight
const s = await p.evaluate(() => ({ on: window.SSAI_GAME_ON, pill: (() => { const e = document.querySelector(".fq-pill"); return e ? getComputedStyle(e).opacity : "none"; })(),
  blocked: window.SSAISeason && SSAISeason.status && SSAISeason.status.blocked }));
ok("game flag is on during a flight", s.on === true, s);
ok("May I help you bubble hidden during a flight", s.pill === "none" || +s.pill < .1, s);
ok("holiday theme hidden (so no bells) during a flight", s.blocked === "game", s);
await p.waitForFunction(() => { const G = __MG.get(); G.hp = 100; return (MELODY_3D.landmarks() || {}).sign; }, null, { timeout: 120000, polling: 500 }).catch(() => {});
await p.waitForTimeout(1200); await p.screenshot({ path: OUT });
ok("no page errors", !errs.length, errs);
await b.close(); process.exit(fail ? 1 : 0);
