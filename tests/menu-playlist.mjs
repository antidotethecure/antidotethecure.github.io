/* Start menu: "Boy or girl?" + playlists (demo/gamemenu.js, 2026-11-15).
   Guards: every game (but Melody, which opted out with vibe:false on 2026-11-21) asks first and shows PLAY only after the answer; his own songs (Cheat Code + Energy) are in both
   playlists in every game; the 20 outside songs are never hosted, a tap loads Spotify's player for that one song and
   nothing from Spotify loads before the tap; the game music waits while it is open; Kid mode shows his songs only.
     BASE=http://localhost:8000 node tests/menu-playlist.mjs     (needs playwright-core; CHROME= overrides the browser path)
     LIVE=1 also opens each of the 20 Spotify pages and checks the song title (needs internet). */
import { chromium } from "playwright-core";
const BASE = process.env.BASE || "http://localhost:8000", LIVE = !!process.env.LIVE;
const GAMES = ["churrito-loco", "storm-burger", "gritz-n-wafflez", "harrys-bbq", "lucky-dragon", "melody-lax", "nalu-vida"];
let fail = 0; const ok = (n, c, x) => { if (!c) fail++; console.log((c ? "ok   " : "FAIL ") + n + (c || x === undefined ? "" : " " + JSON.stringify(x))); };
const b = await chromium.launch({ executablePath: process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const c = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const sp = []; let stub = true;
await c.route(/spotify\.com|scdn\.co/, r => { sp.push(r.request().url()); return stub ? r.fulfill({ contentType: "text/html", body: "<p>player</p>" }) : r.continue(); });
const open = async g => { const p = await c.newPage(); p.errs = []; p.on("pageerror", e => p.errs.push(e.message.slice(0, 140)));
  await p.goto(BASE + "/demo/" + g + "/index.html" + (g === "melody-lax" ? "?render=2d&season=off" : ""), { waitUntil: "load" });
  await p.waitForSelector(".gm-ov", { state: "attached" }); return p; };
const q = (p, sel) => p.evaluate(s => document.querySelectorAll(s).length, sel);
const tap = (p, sel) => p.evaluate(s => document.querySelector(s).click(), sel);   // the menu pulses and sits under page chrome: click in the page
const panel = async p => { await p.evaluate(() => GameMenu.panel("playlist")); await p.waitForFunction(() => window.GameMusic && document.querySelectorAll(".gm-sheet [data-gm=song]").length > 1); };
const rows = p => p.evaluate(() => [...document.querySelectorAll(".gm-sheet [data-gm=sp]")].map(r => [r.getAttribute("data-v"), r.querySelector("span").firstChild.textContent]));

/* 1. every game asks; PLAY comes after the answer; his two songs are in the list */
let first = true, girl = [], boy = [];
for (const g of GAMES) {
  const p = await open(g);
  const ask = { vibe: await q(p, ".gm-ov [data-gm=vibe]"), play: await q(p, ".gm-ov [data-gm=play]"), lit: await q(p, ".gm-ov [data-gm=vibe][aria-pressed=true]") };
  if (g === "melody-lax") {   // opted out: PLAY right away, plain Playlist button
    ok(g + ": does not ask Boy or girl, PLAY is there", ask.vibe === 0 && ask.play === 1 && !/Boy|Girl/.test(await p.textContent(".gm-ov")) && /Playlist/.test(await p.textContent(".gm-ov [data-gm=playlist]")), ask);
  } else {
  ok(g + ": asks Boy or girl first, no PLAY yet" + (first ? "" : ", last answer lit"), ask.vibe === 2 && ask.play === 0 && ask.lit === (first ? 0 : 1), ask);
  await p.evaluate(() => GameMenu.play());
  ok(g + ": PLAY cannot start before the answer", await q(p, ".gm-ov .gm-vibe.need") === 1);
  await tap(p, ".gm-ov [data-gm=vibe][data-v=girl]");
  ok(g + ": after the answer the menu shows PLAY and the Girl playlist button", await q(p, ".gm-ov [data-gm=play]") === 1 && /Girl playlist/.test(await p.textContent(".gm-ov [data-gm=playlist]")));
  }
  await panel(p);
  const songs = await p.evaluate(() => GameMusic.songs.map(s => s.id));
  ok(g + ": Cheat Code + Energy are in the playlist", songs.includes("cheat") && songs.includes("energy") && await q(p, ".gm-sheet [data-gm=song]") === songs.length, songs);
  const src = await p.evaluate(() => Promise.all(GameMusic.songs.map(s => fetch(s.src, { method: "HEAD" }).then(r => r.status))));
  ok(g + ": every song file is there", src.every(s => s === 200), src);
  if (g === "melody-lax") { const all = await rows(p);
    ok(g + ": one list of all 20 outside songs, no Boy / Girl switch", all.length === 20 && new Set(all.map(r => r[0])).size === 20 && await q(p, ".gm-sheet [data-gm=vibe]") === 0 && !/Boy|Girl/.test(await p.textContent(".gm-sheet")), all.length); }
  if (first) {
    girl = await rows(p); ok("girl playlist: 10 Spotify songs", girl.length === 10 && girl[0][1] === "CPR", girl.map(r => r[1]));
    ok("nothing from Spotify loaded before a tap", sp.length === 0 && await q(p, "iframe.gm-sp") === 0, sp);
    await tap(p, ".gm-sheet [data-gm=song][data-v=energy]");
    ok("his song plays from the playlist (game without its own songs)", await p.evaluate(() => GameMusic.cur().id === "energy" && !GameMusic.el().paused));
    await tap(p, ".gm-sheet [data-gm=sp][data-v='" + girl[2][0] + "']"); await p.waitForTimeout(300);
    const fr = await p.evaluate(() => { const f = document.querySelector("iframe.gm-sp"); return f && { src: f.src, sandbox: f.getAttribute("sandbox"), n: document.querySelectorAll("iframe.gm-sp").length }; });
    ok("a tap loads Spotify's player for that one song", fr && fr.n === 1 && fr.src === "https://open.spotify.com/embed/track/" + girl[2][0] && sp.length >= 1, fr);
    ok("his song stops while the Spotify song is open", await p.evaluate(() => GameMusic.el().paused));
    await tap(p, ".gm-sheet [data-gm=vibe][data-v=boy]");
    boy = await rows(p); ok("boy playlist: 10 other songs, Spotify player closed", boy.length === 10 && boy[0][1] === "Get To You" && !boy.some(r => girl.some(x => x[0] === r[0])) && await q(p, "iframe.gm-sp") === 0, boy.map(r => r[1]));
    await tap(p, ".gm-sheet [data-gm=vibe][data-v=girl]");
  }
  if (g === "storm-burger") {   // a game with its own music: it waits while Spotify is open and comes back after
    await p.evaluate(() => { window.__mus = []; const f = GAME_AUDIO.music; GAME_AUDIO.music = v => { __mus.push(v); return f(v); }; });
    await tap(p, ".gm-sheet [data-gm=sp]"); const off = await p.evaluate(() => __mus[__mus.length - 1]);
    await tap(p, ".gm-sheet [data-gm=spoff]"); const on = await p.evaluate(() => __mus[__mus.length - 1]);
    ok(g + ": game music waits while Spotify is open, then comes back", off === false && on === true && await q(p, "iframe.gm-sp") === 0, { off, on });
  }
  if (g === "gritz-n-wafflez") {   // Kid mode: his songs only
    await tap(p, ".gm-sheet [data-gm=sp]"); await p.evaluate(() => { GAME_MENU.modes.get = () => "kid"; GameMenu.refresh(); });
    ok(g + ": Kid mode lists his songs only, no Spotify", await q(p, ".gm-sheet [data-gm=sp]") === 0 && await q(p, "iframe.gm-sp") === 0 && await q(p, ".gm-sheet [data-gm=song]") === 2);
  }
  ok(g + ": no page errors", p.errs.length === 0, p.errs);
  await p.close(); first = false;
}

/* 2. the ids really are those songs (Spotify's own embed pages) */
if (LIVE) { stub = false; const p = await c.newPage();
  for (const [id, title] of girl.concat(boy)) { const t = await (await p.request.get("https://open.spotify.com/embed/track/" + id)).text();
    ok("spotify " + id + " = " + title, t.toLowerCase().replace(/[^a-z0-9]/g, "").includes(title.toLowerCase().replace(/\*/g, "").replace(/[^a-z0-9]/g, "").slice(0, 12)) || /F\*/.test(title) && /the world/i.test(t)); } }
await b.close();
console.log(fail ? "FAILED: " + fail : "ALL OK"); process.exit(fail ? 1 : 0);
