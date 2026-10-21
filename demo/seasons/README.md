# Seasonal themes (SousShift AI customer apps)

One loader, one calendar, one folder per theme. Customer pages include the loader **once** and never change again:

```html
<script src="../seasons/seasons.js?v=20261013a" defer></script>          <!-- demo/<client>/index.html -->
<script src="../../demo/seasons/seasons.js?v=20261013a" defer></script>  <!-- ice-cream/demo/index.html -->
```

Pages that have it today: `demo/melody-lax`, `demo/nalu-vida`, `demo/gritz-n-wafflez`, `demo/storm-burger`,
`demo/churrito-loco`, `demo/lucky-dragon`, `demo/mechanic`, `ice-cream/demo`.

**Never** add it to back offices, staff apps, owner, setup or kit pages. The loader also refuses to run on any path containing
`/shop/ /setup /owner /staff /back-office /admin /kit /hq`, as a second guard.

```
demo/seasons/
  seasons.js        loader + shared helpers (canvas overlay, frame loop, game/overlay pause, idle/scroll/shake bus,
                    reduced-motion + low-end fallbacks, 👻-style toggle, audio unlock)
  calendar.json     which theme runs when (America/Los_Angeles dates)
  halloween/        halloween.js  (3D jack-o'-lanterns + sheet ghosts, three.js, all procedural)
  <next theme>/     <id>.js
```

## Calendar

`calendar.json` → `themes: [{ id, start:"MM-DD", end:"MM-DD", script:"<id>/<id>.js", ready? }]`

* Dates are **Los Angeles** dates, both ends inclusive. `end < start` wraps the new year (`12-31`..`01-02`).
* The **first** matching entry wins, so put a short theme above a long one it overlaps (new-year sits above christmas).
* `"ready": false` = not built yet; the loader skips it. Flip it (or delete the key) when the theme ships.
* **Easter moves every year.** Update its dates each spring (2027: Sun 03-28; 2028: Sun 04-16).

## Switches

| What | How |
|---|---|
| Force a theme (even `ready:false`) | `?season=halloween` |
| Turn themes off for this visit | `?season=off` (legacy: `?halloween=0`, `?halloween=1`) |
| Force the light CSS fallback / skip the low-end check | `?seasonfx=2d` / `?seasonfx=3d` |
| Opt one client out | `<script>window.SSAI_SEASONS_OFF=true</script>` before the loader |
| Extra game areas / overlays to avoid | `window.SSAI_SEASONS_AVOID = "#my-game"`, `window.SSAI_SEASONS_BLOCK = "#my-modal.open"` |
| Guest turns it off / mutes it | the round theme button (bottom-left). Saved per theme id in `localStorage["ssai-season-<id>"]` |

## Adding a theme

1. Make `demo/seasons/<id>/<id>.js`. It must call `SSAISeason.define({...})` exactly once:

```js
SSAISeason.define({
  id: "thanksgiving", label: "Thanksgiving", icon: "🦃",
  three: true,          // true: the loader imports three.js (0.160.1, shared with the page's copy) and passes ctx.THREE
  shake: false,         // true: shows "Shake to scare"-style menu item (DeviceMotion, iOS permission asked from that tap)
  setup(ctx) {          // 3D path. ctx.canvas is the overlay canvas.
    // build renderer/scene with ctx.THREE; listen with ctx.on("idle"|"wake"|"block"|"shake", fn)
    return {
      frame(dt, t, still) {},   // called at <= 30 fps only while visible; still=true for one-off redraws
      resize(w, h, dpr) {},     // dpr is already capped at 1.5
      dispose() {},
      static: ctx.reduced       // true: the loader draws one frame and never animates (prefers-reduced-motion)
    };
  },
  fallback(ctx) {       // no WebGL / low-end / too slow: light DOM/CSS version (or return null for nothing)
    return { setVisible(v) {} };
  }
});
```

2. Useful `ctx` fields: `reduced`, `lowEnd`, `pointer` ({x,y} 0..1, last finger), `isIdle()`, `audio()` (an unlocked
   AudioContext after the first tap, or `null` when muted/off/hidden: always check), `size()`, `store(key[, value])`.
3. Model everything procedurally (geometry + canvas textures). No paid credits, no big downloads. Any sound is synthesized
   with WebAudio, or a tiny CC0 file whose license is noted in the theme's header comment.
4. Add/flip its `calendar.json` entry. **No page edits.** Bump `?v=` on the loader tag only if `seasons.js` itself changed
   (theme scripts and the calendar are fetched with the loader's `?v=`).

## Quality bar

* **Looks real.** Ultra-realistic 3D: proper shapes (ribs, folds, stems, drape), lighting, emissive glow, gentle life
  (bob, sway, flicker). No flat clip-art, no emoji in the 3D path.
* **Interactive and fun.** Reacts to the guest: idle → something happens (5 s), touch/scroll/shake → it reacts. Follows the finger.
* **Never blocks anything.** The overlay is `pointer-events:none`; every tap reaches buttons and games. It sits at z-index 35:
  under the apps' sheets, modals and order bars. It hides itself while a game is on screen (≥30% of the viewport), while a
  Games Pack sheet / game menu sheet / full screen / screen lock is on, and while a theme is turned off.
* **Never hurts legibility.** Decorations live in the corners and edges, half off-screen and translucent; anything that
  crosses text gets *more* transparent the closer/bigger it gets. The app's own colours stay in charge.
* **Performance limits.** ≤ 30 fps, pixel ratio ≤ 1.5, low-poly (Halloween peaks around 25k triangles and ~50 draw calls with 9 ghosts crowding),
  no shadows, ≤ 4 point lights, stops when the tab is hidden or the layer is hidden, loads after the page's `load` event.
  Falls back to the CSS version if WebGL is missing, the device is low-end (≤ 2 cores, ≤ 2 GB, Save-Data) or it runs
  under ~14 fps for ~4 s.
* **Respects the guest.** `prefers-reduced-motion` → static scene only. Sound only after the first tap, quiet, mutable.
  Theme can be turned off and stays off (per theme).

## Testing checklist (before any theme PR)

Headless Chrome at **390×844**, mobile + touch, WebGL via SwiftShader
(`--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`), on Melody and the ice cream demo at least:

- [ ] `SSAISeason.status` shows `{mode:"3d"}` and the `.ssai-season-cv` canvas is on, `pointer-events:none`
- [ ] idle 5 s → the idle behaviour starts; scroll/swipe/tap → it reacts (screenshots: idle-before, idle, mid-reaction)
- [ ] a real tap on a button under the canvas still fires its click
- [ ] opening the Games Pack sheet (`#mg-ov.on`) / scrolling the game into view hides the layer; closing brings it back
- [ ] `?season=off`, `?seasonfx=2d`, reduced motion (`reducedMotion:"reduce"`) and the toggle's "turn off" (+ reload) all behave
- [ ] zero new console errors / warnings (incl. no "Multiple instances of Three.js"), no 404s, `scrollWidth === 390`
- [ ] not loaded on `demo/mechanic/shop/` or any owner/staff/setup page
- [ ] a short MP4 of the behaviour (one encode at a time)
