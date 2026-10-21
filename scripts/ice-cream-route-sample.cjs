#!/usr/bin/env node
/* Builds ice-cream/route/sample.json: the "Try a sample route" loop for the route house counter, with its
   street geometry (OSRM) and every home lot within 150 m (Overpass), so the pitch never waits on Overpass.
   Run once, commit the JSON:  node scripts/ice-cream-route-sample.cjs
   Uses the same counting code as the page (ice-cream/route/route-core.js). Needs Node 18+ (fetch). */
"use strict";
const fs = require("fs"), path = require("path");
const Core = require("../ice-cream/route/route-core.js");

const UA = "SousShift-ice-cream-route-build/1.0 (secondshiftai@gmail.com)";
const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter"];
const MAX_BUF = 150;
// West Compton (east of Wilmington Ave): Spruce St -> Oleander Ave -> Poplar St -> Arbutus St -> Oleander -> School St
const SAMPLE = {
  name: { en: "Sample – West Compton loop", es: "Ejemplo – vuelta en West Compton" },
  waypoints: [[33.9026, -118.2360], [33.9026, -118.2308], [33.9000, -118.2306], [33.9000, -118.2360], [33.8992, -118.2360],
    [33.8992, -118.2306], [33.8975, -118.2306], [33.8975, -118.2360]]
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function osrm(pts) {
  const u = "https://router.project-osrm.org/route/v1/driving/" + pts.map((p) => p[1] + "," + p[0]).join(";") + "?overview=full&geometries=geojson";
  const r = await fetch(u, { headers: { "User-Agent": UA } });
  const j = await r.json();
  if (j.code !== "Ok") throw new Error("OSRM " + j.code);
  return { line: j.routes[0].geometry.coordinates.map((c) => [+c[1].toFixed(6), +c[0].toFixed(6)]), meters: j.routes[0].distance };
}

async function overpass(q) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const url = attempt % 2 === 0 ? OVERPASS[0] : OVERPASS[1 + ((attempt - 1) / 2) % (OVERPASS.length - 1)];
    try {
      const r = await fetch(url, { method: "POST", headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded" }, body: "data=" + encodeURIComponent(q) });
      const txt = await r.text();
      if (r.ok && txt.trim().startsWith("{")) {
        const j = JSON.parse(txt);
        if (j.remark && /runtime error/i.test(j.remark)) throw new Error(j.remark);
        return j.elements;
      }
      throw new Error("HTTP " + r.status);
    } catch (e) {
      console.warn("  overpass retry", attempt + 1, url, String(e.message).slice(0, 80));
      await sleep(Math.min(5000 * (attempt + 1), 30000));
    }
  }
  throw new Error("Overpass failed");
}

(async () => {
  const { line, meters } = await osrm(SAMPLE.waypoints);
  console.log("route", (meters / 1609.344).toFixed(2), "mi,", line.length, "points");
  const boxes0 = Core.chunkBoxes(line, MAX_BUF + 20), boxes = [];
  for (let g = 0; g < boxes0.length; g += 2) boxes.push(boxes0.slice(g, g + 2));
  const els = [];
  for (let i = 0; i < boxes.length; i++) {
    console.log("box", i + 1, "/", boxes.length);
    els.push(...(await overpass(Core.overpassQuery(boxes[i]))));
    await sleep(1500);
  }
  const lots = Core.lots(els, Core.makeDist(line), MAX_BUF);
  const at45 = Core.count(lots, 45);
  console.log("buildings fetched", els.length, "lots within", MAX_BUF, "m:", lots.length);
  console.log("count @45 m:", JSON.stringify(at45));
  const out = {
    _about: "Cached sample for /ice-cream/route/. Built by scripts/ice-cream-route-sample.cjs from OSRM + OpenStreetMap (Overpass). Lots within " + MAX_BUF + " m; the page recounts for any buffer. Data © OpenStreetMap contributors, ODbL.",
    built: new Date().toISOString().slice(0, 10),
    name: SAMPLE.name, waypoints: SAMPLE.waypoints, line, meters: Math.round(meters), maxBuf: MAX_BUF,
    countAt45: at45,
    lots: lots.map((l) => (l.e ? [l.c[0], l.c[1], l.k, l.u, l.d, 1] : [l.c[0], l.c[1], l.k, l.u, l.d]))
  };
  const file = path.join(__dirname, "../ice-cream/route/sample.json");
  fs.writeFileSync(file, JSON.stringify(out));
  console.log("wrote", file, fs.statSync(file).size, "bytes");
})().catch((e) => { console.error(e); process.exit(1); });
