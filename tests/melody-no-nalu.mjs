// Melody and Nalu Vida stay separate for customers (Antidote, 2026-11-11): nothing a Melody guest sees or
// taps may name or link the other restaurant. Code comments and internal keys (tile "nalu") are fine.
// One exception (Antidote, 2026-11-15): the airplane game flies over Venice Beach again and the Nalu Vida building there
// carries its sign and logo. Only the exact scenery strings in GAME are allowed: no links, cards, banners or promos.
// run: node tests/melody-no-nalu.mjs
import { readFileSync } from "node:fs";
const dir = new URL("../demo/melody-lax/", import.meta.url);
const read = f => readFileSync(new URL(f, dir), "utf8");
const code = s => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/<!--[\s\S]*?-->/g, "").replace(/(^|\s)\/\/[^\n]*/g, "$1");
const GAME = ["out to Venice Beach and Nalu Vida", '"Venice Beach and Nalu Vida"', '"Nalu Vida · Venice Beach"', '"★ NALU VIDA ★"', '"nalu vida"', 'img("../nalu-vida/img/logo.png")'];
const scenery = s => GAME.reduce((t, g) => t.split(g).join(""), s);
let bad = 0;
for (const f of ["index.html", "world3d.js", "melody3d.js", "menu-data.js"]) {
  const hits = scenery(code(read(f))).match(/.{0,40}nalu[\s_-]+vida.{0,40}/gi) || [];
  if (hits.length) { bad++; console.error("FAIL " + f + ":\n  " + hits.join("\n  ")); }
}
const faq = read("faq.json").match(/.{0,40}nalu.{0,40}/gi) || [];
if (faq.length) { bad++; console.error("FAIL faq.json:\n  " + faq.join("\n  ")); }
if (bad) process.exit(1);
console.log("ALL OK: no Nalu Vida in the Melody guest app (game scenery only)");
