// Christian HQ + the staff app read their reward ladder from demo/christian-live.js DEFAULTS, while the guest apps
// read their own window.SSAI_REWARDS. Nothing keeps the two in step, so on 2026-10-27 the guest apps shipped a new
// ladder and Christian's back office kept showing him the old one for a while. This is the check that catches it.
//   node tests/christian-backoffice.mjs
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const ROOT = path.resolve(import.meta.dirname, "..");
const APPS = { "melody-bar-grill": "demo/melody-lax/index.html", "nalu-vida": "demo/nalu-vida/index.html" };

let pass = 0, fail = 0;
const t = (name, ok, got) => { if (ok) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name, got === undefined ? "" : JSON.stringify(got)); } };

// christian-live.js is a browser IIFE: give it just enough of a window to run and hand back SSAI_CHRISTIAN.
function loadDefaults() {
  const ctx = {
    window: {}, document: { currentScript: null },
    location: { pathname: "/backoffice/christian/" },
    localStorage: { getItem: () => null, setItem: () => {} },
    fetch: () => new Promise(() => {}), JSON, Date, Math, isFinite, String, Number,
  };
  ctx.window = ctx; ctx.self = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "demo/christian-live.js"), "utf8"), ctx);
  return ctx.SSAI_CHRISTIAN && ctx.SSAI_CHRISTIAN.defaults;
}

// the guest page's own config, read out of the HTML the way the browser would see it
function pageRewards(file) {
  const s = fs.readFileSync(path.join(ROOT, file), "utf8");
  const i = s.indexOf("window.SSAI_REWARDS");
  if (i < 0) return null;
  const mv = /maxValue:\s*([\d.]+)/.exec(s.slice(i));
  const j = s.indexOf("tiers:[[", i);
  const k = s.indexOf("]],", j);
  if (j < 0 || k < 0) return null;
  // one object per tier: [points, "label", {button:"…", type:"…", max|amount:n}]
  const tiers = [...s.slice(j, k + 2).matchAll(/\[(\d+),\s*"((?:[^"\\]|\\.)*)",\s*\{button:\s*"((?:[^"\\]|\\.)*)",\s*type:\s*"(\w+)",\s*(max|amount):\s*([\d.]+)\s*\}\]/g)]
    .map((m) => ({ pts: +m[1], label: m[2].replace(/\\(.)/g, "$1"), button: m[3].replace(/\\(.)/g, "$1"), type: m[4], key: m[5], val: +m[6] }));
  return { maxValue: mv ? +mv[1] : 0, tiers };
}

const D = loadDefaults();
t("christian-live.js exposes window.SSAI_CHRISTIAN.defaults", !!D);
if (!D) { console.log(`\n${pass} passed, ${fail} failed`); process.exit(1); }

for (const [slug, file] of Object.entries(APPS)) {
  const P = pageRewards(file), d = D[slug];
  t(`${slug}: the guest page's ladder parsed`, !!(P && P.tiers.length), P && P.tiers.length);
  t(`${slug}: christian-live.js has an entry`, !!(d && d.tiers));
  if (!P || !P.tiers.length || !d || !d.tiers) continue;

  t(`${slug}: same number of rewards in HQ and in the app`, d.tiers.length === P.tiers.length, { hq: d.tiers.length, app: P.tiers.length });
  t(`${slug}: HQ knows the $${P.maxValue.toFixed(2)} max reward`, +d.maxValue === P.maxValue, { hq: d.maxValue, app: P.maxValue });

  P.tiers.forEach((a, i) => {
    const b = d.tiers[i], o = (b && b[2]) || {};
    const same = b && b[0] === a.pts && b[1] === a.label && o.button === a.button && o.type === a.type && +o[a.key] === a.val;
    t(`${slug} reward ${i + 1} (${a.pts} pts): HQ matches the app`, same,
      same ? undefined : { app: [a.pts, a.label, a.button, a.type, a.key, a.val], hq: b });
  });

  // the two rules Christian was promised: nothing over one full meal, and the top rung IS the ceiling
  const vals = P.tiers.map((x) => x.val);
  t(`${slug}: no reward is worth more than the $${P.maxValue.toFixed(2)} max`, vals.every((v) => v <= P.maxValue), vals.filter((v) => v > P.maxValue));
  t(`${slug}: the top reward is the max itself`, vals[vals.length - 1] === P.maxValue, { top: vals[vals.length - 1], max: P.maxValue });
  // a rung worth less than a cheaper rung is a dead rung: nobody saves for it, they take the cheaper one twice
  const dead = vals.map((v, i) => (i && v <= vals[i - 1] ? `#${i + 1} $${v} <= #${i} $${vals[i - 1]}` : null)).filter(Boolean);
  t(`${slug}: every reward is worth more than the one below it`, dead.length === 0, dead);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
