# engine3d — asset and code credits

Every file under `demo/engine3d/` is either made here or has a licence that allows redistribution on this site.
Never add ripped game assets, or any model or texture whose licence is unclear.

| What | Where | Source | Licence |
|---|---|---|---|
| Crowd humans (surfer, beach lady) | `assets/humans/human_*.glb` | Built by `tools/build-humans.mjs` from the Nalu Vida game's own characters (`demo/nalu-vida/3d/surfer_m.glb`, `beachlady.glb`). Those were generated for SousShift AI's client Nalu Vida. The lady was auto-rigged by the build script; the LODs, vertex colours and region masks were also made there. | Our own project assets (SousShift AI / Nalu Vida). Not for reuse outside SousShift client apps. |
| Cars (11 vehicles) | `assets/cars/cars.glb` | Kenney "Car Kit" 3.1, www.kenney.nl. Packed by `tools/build-cars.mjs`: merged meshes, palette baked to vertex colours, paint/glass/lamp masks. | CC0 1.0 (public domain). Credit is appreciated but not required. |
| Review billboard loops | `melody-lax/img/review/billboard.mp4`, `nalu-vida/img/review/billboard.mp4` | Cut from Antidote's own review halftime clips already in the repo (muted, 400 px, 16 s) | Antidote's own content |
| Blimp, APEX supercar, muzzle flashes, crashes, parachute | procedural (`blimp.js`, `apex.js`, `combat.js`) | made here; APEX is an unbranded design (no badges, logos or names) | part of this repo |
| three.js r160 + examples (GLTFLoader, Meshopt decoder, EffectComposer, UnrealBloom, SMAA, FXAA, GTAO, SkeletonUtils) | loaded from cdn.jsdelivr.net | three.js authors | MIT |
| Sky model | `sky.js` | Preetham et al. analytic daylight model, as ported in three.js `Sky.js`. The night sky, stars, moon and twilight were added here. | MIT (three.js) |
| Cloud noise, rain, lightning, particles, decals, sand, palms, storefront textures, sounds | procedural (in code) | made here | part of this repo |

Optional paid upgrades (NOT used, listed for the record) are in `SKILL.md` under "Paid upgrades".
