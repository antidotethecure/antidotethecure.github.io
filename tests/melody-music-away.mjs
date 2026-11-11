/* Melody, 2026-11-11: the game's sound stops when you scroll away from the game and comes back when you return, the round
   music button beside the game turns the music off/on, and the refer-a-friend card sits between the L.A. Times clip and the section tabs.
   Counts play()/pause() calls on the song, so it does not need the browser to decode the m4a.
   Run:  node tests/melody-music-away.mjs [baseUrl]      (default http://localhost:8843; PW=<path to playwright> if not installed here) */
const { chromium } = await import(process.env.PW || "playwright-core");
const BASE = process.argv[2] || "http://localhost:8843";
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log("ok   " + n); } else { fail++; console.log("FAIL " + n + (x ? " " + JSON.stringify(x) : "")); } };
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
const errs = []; p.on("pageerror", e => errs.push(String(e).slice(0, 160)));
await p.addInitScript(() => { window.__ops = []; for (const k of ["play", "pause"]) { const f = HTMLMediaElement.prototype[k];
  HTMLMediaElement.prototype[k] = function () { if (this.tagName === "AUDIO") window.__ops.push(k); return f.apply(this, arguments); }; } });
await p.goto(BASE + "/demo/melody-lax/index.html?render=2d&season=off", { waitUntil: "load" });
const last = () => p.evaluate(() => window.__ops[window.__ops.length - 1]);
const settle = () => p.waitForTimeout(400);

/* refer-a-friend card */
const card = await p.evaluate(() => { const c = document.getElementById("refcard"), R = window.SSAI_REWARDS;
  return c && { afterPress: c.previousElementSibling.id, txt: c.textContent, ref: R.referral, join: R.join, href: c.querySelector("a").getAttribute("href"), w: c.scrollWidth <= c.clientWidth + 1 }; });
ok("referral card sits right after the L.A. Times clip", card && card.afterPress === "press", card);
ok("referral card shows the program's own numbers", card && card.txt.includes("get " + card.ref + " points") && card.txt.includes(card.join + " welcome points"));
ok("referral card button goes to the join form", card && card.href === "#crm-join" && await p.evaluate(() => !!document.getElementById("crm-join")));
ok("referral card fits a phone", card && card.w && await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));

/* music button + scroll away */
await p.evaluate(() => document.querySelector(".cvwrap").scrollIntoView({ block: "center" })); await settle();
await p.click(".gm-ov [data-gm=play]", { force: true }); await p.waitForTimeout(900);   // the start menu covers the game's buttons until Play (the button pulses, so force)
const mb = () => p.evaluate(() => { const b = document.querySelector(".gm-mbtn"); return { on: b.classList.contains("on"), mute: b.classList.contains("mute"), bg: getComputedStyle(b).backgroundImage }; });
let m = await mb();
ok("music is on to start and its button is showing, lit gold", await p.evaluate(() => GAME_AUDIO.state().music) && m.on && !m.mute && m.bg.includes("gradient"), m);
await p.click(".gm-mbtn"); await settle(); m = await mb();
ok("the music button turns the music off and goes dark", !(await p.evaluate(() => GAME_AUDIO.state().music)) && m.mute && !m.bg.includes("gradient") && await last() !== "play", m);
await p.click(".gm-mbtn"); await settle();
ok("it turns the music back on and the song plays", await p.evaluate(() => GAME_AUDIO.state().music) && await last() === "play", await p.evaluate(() => window.__ops));
await p.evaluate(() => scrollTo(0, 0)); await settle();
ok("scrolled away from the game: the song is paused", await last() === "pause", await p.evaluate(() => window.__ops.slice(-4)));
ok("the saved music setting is untouched", await p.evaluate(() => GAME_AUDIO.state().music));
await p.evaluate(() => document.querySelector(".cvwrap").scrollIntoView({ block: "center" })); await settle();
ok("back at the game: the song plays again", await last() === "play", await p.evaluate(() => window.__ops.slice(-4)));
await p.click(".gm-mbtn"); await settle(); await p.evaluate(() => scrollTo(0, 0)); await settle();
await p.evaluate(() => document.querySelector(".cvwrap").scrollIntoView({ block: "center" })); await settle();
ok("music switched off stays off after scrolling away and back", await last() === "pause");
ok("no page errors", !errs.length, errs);
await b.close();
console.log(pass + " passed, " + fail + " failed"); process.exit(fail ? 1 : 0);
