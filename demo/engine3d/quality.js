/* engine3d/quality.js — graphics quality tiers with auto-detect and adaptive downgrade.
   Tiers: low · med · high · ultra. The page asks once (detectTier) and then calls q.sample(fps) every second; if the frame
   rate stays under target the tier steps down one notch (never up on its own, so it cannot oscillate). The player can pick a
   tier in the game menu (q.set("high")) or "auto"; the choice is saved per game (localStorage). ?q=low|med|high|ultra forces one.
   Only after LOW also fails does the page fall back to its 2D renderer (that decision stays with the game).
   The tier table is the single place that says what each system does at each level.
   "smooth" (default on phones + the Tesla) = LOW with a hard budget (SMOOTH below) and a 30 fps lock when 60 isn't held;
   q.lock30 tells the game loop to draw every other display frame. Auto step-downs wait 12 s between changes and for O.calm(). */
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
  if (tesla || phone) return "low";   // phones + cars start on LOW (Smooth): a steady frame rate beats effects that make it stutter
  if (tablet) return "med";
  if (/SwiftShader|llvmpipe|Software/i.test(gpu)) return "low";
  if (/NVIDIA|GeForce|RTX|Radeon RX|Apple M\d (Pro|Max|Ultra)/i.test(gpu)) return "ultra";
  if (/Apple M\d|Apple GPU|Radeon/i.test(gpu)) return "high";
  if (/Intel/i.test(gpu)) return cores >= 8 && mem >= 8 ? "med" : "low";
  return "med";
}

// Smooth (the default on phones and the Tesla): LOW plus a hard budget — low pixel ratio, no post, no volumetric clouds, no
// shadows, smaller crowds/traffic/particles — and a frame-rate lock: when 60 isn't held it locks to a steady 30 instead of swinging.
export const isCar = () => /Tesla|QtCarBrowser/i.test(navigator.userAgent || "");
export const isHandheld = () => { const ua = navigator.userAgent || ""; return /iPhone|iPod|iPad|Android|Mobile/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1); };
export const SMOOTH = Object.assign({}, TIERS.low, { pr: 1.25, shadows: 0, crowd: Object.assign({}, TIERS.low.crowd, { max: 140, density: .4, maxDist: 700 }), clouds: null,
  post: { on: false, bloom: false, ssao: false, aa: "none", grade: false }, water: { reflect: false }, rain: 900, particles: 600, traffic: .4, decals: 8 });
export function makeQuality(O = {}) {
  const key = "e3-quality:" + (O.id || location.pathname), q = new URLSearchParams(location.search).get("q");
  let pref = "auto"; try { pref = localStorage.getItem(key) || "auto"; } catch (e) {}
  if (q && (TIERS[q] || q === "smooth")) pref = q;
  const auto = () => pref === "auto";
  if (pref === "auto" && (isCar() || isHandheld())) pref = "smooth";   // first visit on a phone / car: Smooth (recommended)
  let tier = pref === "smooth" ? "low" : TIERS[pref] ? pref : detectTier(O.renderer);
  const smooth = () => pref === "smooth";
  let lastChange = performance.now(), lock30 = false, under60 = 0;
  const subs = [];
  let low = 0, lowLow = 0;
  const Q = {
    get tier() { return tier; }, get pref() { return pref; }, get auto() { return auto(); }, get smooth() { return smooth(); }, get lock30() { return lock30; },
    get cfg() { return smooth() ? Object.assign({}, SMOOTH, { pr: isCar() ? 1 : SMOOTH.pr }) : TIERS[tier]; },
    onChange(fn) { subs.push(fn); },
    set(name, save = true) { if (name === "smooth") { pref = "smooth"; if (save) try { localStorage.setItem(key, "smooth"); } catch (e) {} lock30 = false; under60 = 0; lastChange = performance.now(); tier = "low"; subs.forEach(f => f(tier, Q.cfg)); return; }
      if (name === "auto") { pref = "auto"; if (save) try { localStorage.setItem(key, "auto"); } catch (e) {} const t = detectTier(O.renderer); if (t !== tier) { tier = t; subs.forEach(f => f(tier, TIERS[tier])); } return; }
      if (!TIERS[name]) return; const was = smooth(); if (save) { pref = name; try { localStorage.setItem(key, name); } catch (e) {} } low = 0; lock30 = false; lastChange = performance.now(); if (name !== tier || was) { tier = name; subs.forEach(f => f(tier, Q.cfg)); } },
    /* call once a second with the measured fps. Returns "down" when it stepped down, "fail" when even LOW cannot hold minFps */
    sample(fps, target = O.target || 50, minFps = O.minFps || 38) {
      if (document.hidden) return "";
      if (smooth()) {   // Smooth: never changes tier; under ~55 fps for 3 s → lock to a steady 30 for the rest of the visit
        if (!lock30) { under60 = fps < 55 ? under60 + 1 : 0; if (under60 >= 3) { lock30 = true; return "lock30"; } }
        target = lock30 ? 27 : target; }
      if (fps < target) low++; else low = 0;
      // auto: step DOWN only (never up, so it can't oscillate), at most once per 12 s, and only at a calm moment (O.calm: no fight
      // on screen) — a tier change rebuilds render targets/shaders, which is a visible hitch mid-battle
      if (auto() && low >= 3 && tier !== "low") { if (performance.now() - lastChange < 12000 || (O.calm && !O.calm())) return ""; const i = TIER_NAMES.indexOf(tier); Q.set(TIER_NAMES[i - 1], false); low = 0; return "down"; }
      if (tier === "low") { lowLow = fps < minFps ? lowLow + 1 : 0; if (lowLow >= (O.failSecs || 5)) return "fail"; } else lowLow = 0;
      return ""; },
  };
  return Q;
}
