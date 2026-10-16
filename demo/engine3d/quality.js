/* engine3d/quality.js — graphics quality tiers with auto-detect and adaptive downgrade.
   Tiers: low · med · high · ultra. The page asks once (detectTier) and then calls q.sample(fps) every second; if the frame
   rate stays under target the tier steps down one notch (never up on its own, so it cannot oscillate). The player can pick a
   tier in the game menu (q.set("high")) or "auto"; the choice is saved per game (localStorage). ?q=low|med|high|ultra forces one.
   Only after LOW also fails does the page fall back to its 2D renderer (that decision stays with the game).
   The tier table is the single place that says what each system does at each level. */
export const TIER_NAMES = ["low", "med", "high", "ultra"];
export const TIERS = {
  low: { pr: 1, shadows: 0, shadowSize: 512, crowd: { near: 0, lod1: false, maxDist: 900, lod1Dist: 0, nearDist: 0, max: 220, shadows: false, density: .55 },
    clouds: { scale: .3, steps: 20, light: 3, jitter: .45 }, post: { on: false, bloom: false, ssao: false, aa: "none", grade: false }, water: { reflect: false }, rain: 1500, particles: 900, traffic: .55, decals: 12 },
  med: { pr: 1.5, shadows: 1, shadowSize: 1024, crowd: { near: 0, lod1: true, maxDist: 1300, lod1Dist: 380, nearDist: 0, max: 360, shadows: false, density: .8 },
    clouds: { scale: .3, steps: 26, light: 4, jitter: .5 }, post: { on: true, bloom: true, ssao: false, aa: "fxaa", grade: true }, water: { reflect: false }, rain: 3000, particles: 1500, traffic: .8, decals: 24 },
  high: { pr: 2, shadows: 2, shadowSize: 2048, crowd: { near: 4, lod1: true, maxDist: 1800, lod1Dist: 650, nearDist: 140, max: 520, shadows: false, density: 1 },
    clouds: { scale: .4, steps: 36, light: 5, jitter: .6 }, post: { on: true, bloom: true, ssao: false, aa: "smaa", grade: true }, water: { reflect: true }, rain: 5000, particles: 2200, traffic: 1, decals: 40 },
  ultra: { pr: 2, shadows: 2, shadowSize: 4096, crowd: { near: 8, lod1: true, maxDist: 2400, lod1Dist: 900, nearDist: 200, max: 700, shadows: true, density: 1 },
    clouds: { scale: .5, steps: 56, light: 6, jitter: .6 }, post: { on: true, bloom: true, ssao: true, aa: "smaa", grade: true }, water: { reflect: true }, rain: 8000, particles: 3200, traffic: 1, decals: 64 },
};

export function gpuInfo(renderer) {
  try { const gl = renderer.getContext(), ext = gl.getExtension("WEBGL_debug_renderer_info"); return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER)); } catch (e) { return ""; }
}
// a first guess from the device + GPU; the adaptive step-down corrects it within a few seconds of play
export function detectTier(renderer) {
  const ua = navigator.userAgent || "", gpu = gpuInfo(renderer), mem = navigator.deviceMemory || 4, cores = navigator.hardwareConcurrency || 4;
  const tesla = /Tesla|QtCarBrowser/i.test(ua), phone = /iPhone|iPod|Android.+Mobile/i.test(ua), tablet = /iPad|Android(?!.*Mobile)/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (tesla) return "low";
  if (phone) return /Apple GPU/i.test(gpu) || /Adreno \(TM\) [7-9]\d\d|Mali-G7[1-9]|Mali-G[7-9]\d\d|Immortalis/i.test(gpu) ? "med" : "low";
  if (tablet) return "med";
  if (/SwiftShader|llvmpipe|Software/i.test(gpu)) return "low";
  if (/NVIDIA|GeForce|RTX|Radeon RX|Apple M\d (Pro|Max|Ultra)/i.test(gpu)) return "ultra";
  if (/Apple M\d|Apple GPU|Radeon/i.test(gpu)) return "high";
  if (/Intel/i.test(gpu)) return cores >= 8 && mem >= 8 ? "med" : "low";
  return "med";
}

export function makeQuality(O = {}) {
  const key = "e3-quality:" + (O.id || location.pathname), q = new URLSearchParams(location.search).get("q");
  let pref = "auto"; try { pref = localStorage.getItem(key) || "auto"; } catch (e) {}
  if (q && TIERS[q]) pref = q;
  const auto = () => pref === "auto";
  let tier = TIERS[pref] ? pref : detectTier(O.renderer);
  const subs = [];
  let low = 0, lowLow = 0;
  const Q = {
    get tier() { return tier; }, get cfg() { return TIERS[tier]; }, get pref() { return pref; }, get auto() { return auto(); },
    onChange(fn) { subs.push(fn); },
    set(name, save = true) { if (name === "auto") { pref = "auto"; if (save) try { localStorage.setItem(key, "auto"); } catch (e) {} const t = detectTier(O.renderer); if (t !== tier) { tier = t; subs.forEach(f => f(tier, TIERS[tier])); } return; }
      if (!TIERS[name]) return; if (save) { pref = name; try { localStorage.setItem(key, name); } catch (e) {} } low = 0; if (name !== tier) { tier = name; subs.forEach(f => f(tier, TIERS[tier])); } },
    /* call once a second with the measured fps. Returns "down" when it stepped down, "fail" when even LOW cannot hold minFps */
    sample(fps, target = O.target || 50, minFps = O.minFps || 38) {
      if (document.hidden) return "";
      if (fps < target) low++; else low = 0;
      if (auto() && low >= 3 && tier !== "low") { const i = TIER_NAMES.indexOf(tier); Q.set(TIER_NAMES[i - 1], false); low = 0; return "down"; }
      if (tier === "low") { lowLow = fps < minFps ? lowLow + 1 : 0; if (lowLow >= (O.failSecs || 5)) return "fail"; } else lowLow = 0;
      return ""; },
  };
  return Q;
}
