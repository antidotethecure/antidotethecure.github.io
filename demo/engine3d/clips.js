/* engine3d/clips.js — the crowd's motion library, authored as poses (no mocap files to download).
   A pose is described in BODY space (the character faces +Z, its left is +X, up is +Y):
     hip:  [dx, dy, dz]   hips offset, in fractions of the character's height
     hipR: [x, y, z]      whole-body rotation (Euler XYZ, radians) — lying down, paddling, sideways surf stance
     spine:[x, y, z]      torso bend on top of hipR (spread over the three spine bones)
     head: [x, y, z]      head turn/nod relative to the chest
     armL/armR: [upper, fore]   unit directions of upper arm / forearm in CHEST space
     legL/legR: [thigh, shin]   unit directions of thigh / shin in HIPS space
   The rig solver (crowd.js) aims each bone at these directions, so the same clip drives any skeleton that uses the Nalu Vida
   bone names, whatever its rest pose (the surfer is in an A-pose, the beach lady was scanned waving).
   Clips from the surfer GLB (run, swim, fall, flip, balance) are sampled and converted into the same form ("retarget").
   Each clip: { fps, dur, loop, fn(u, t) } with u = 0..1 through the clip. Flags: phone (show the phone prop). */
const TAU = Math.PI * 2;
const n3 = (x, y, z) => { const l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; };
const S = (u, k = 1, p = 0) => Math.sin(TAU * (u * k + p));
const C = (u, k = 1, p = 0) => Math.cos(TAU * (u * k + p));
const mirror = (d) => [-d[0], d[1], d[2]];
const ARM_REST_L = [n3(.16, -1, -.02), n3(.1, -1, .16)], ARM_REST_R = ARM_REST_L.map(mirror);
const LEG_L = [n3(.05, -1, 0), n3(.03, -1, -.02)], LEG_R = LEG_L.map(mirror);
const base = () => ({ hip: [0, 0, 0], hipR: [0, 0, 0], spine: [0, 0, 0], head: [0, 0, 0], armL: ARM_REST_L.map(d => d.slice()), armR: ARM_REST_R.map(d => d.slice()), legL: LEG_L.map(d => d.slice()), legR: LEG_R.map(d => d.slice()) });
// a limb pointing with pitch (forward swing, + = forward) and roll-out (+ = away from the body), side = +1 left / -1 right
const limb = (pitch, out, side, down = -1) => n3(Math.sin(out) * side, down * Math.cos(pitch) * Math.cos(out), Math.sin(pitch) * Math.cos(out));
const legPair = (sw, bend, side) => { const th = limb(sw, .05, side); const sh = limb(sw - bend, .03, side); return [th, sh]; };

function walkLegs(P, u, amp = .42, knee = .75) {
  const a = S(u) * amp, b = -a;   // left forward when a > 0
  const kl = knee * Math.max(0, S(u, 1, .3)) + .08, kr = knee * Math.max(0, S(u, 1, .8)) + .08;
  P.legL = legPair(a, kl, 1); P.legR = legPair(b, kr, -1);
  P.hip[1] = -.012 + .012 * Math.abs(C(u, 2)) * 0 - .01 * C(u, 2);
}

export const CLIPS = {
  idle: { fps: 10, dur: 3.6, loop: true, fn: (u) => { const P = base(); P.spine[0] = .03 * S(u); P.hip[0] = .006 * S(u, 1, .25); P.head[1] = .22 * S(u, 1, .1); P.head[0] = .04 * S(u, 2);
    P.armL[1] = n3(.1, -1, .16 + .04 * S(u)); P.armR[1] = n3(-.1, -1, .16 - .04 * S(u)); P.legL[0] = n3(.06 + .02 * S(u, 1, .25), -1, 0); return P; } },
  idle2: { fps: 8, dur: 4, loop: true, fn: (u) => { const P = base(); // arms crossed, weight on one leg
    P.armL = [n3(-.05, -.85, .55), n3(-1, .12, .12)]; P.armR = [n3(.05, -.82, .58), n3(1, .2, .18)]; P.hip[0] = .012; P.hipR[2] = .03; P.legR = [n3(-.12, -1, .05), n3(-.08, -1, -.04)];
    P.head[1] = .3 * S(u); P.spine[0] = .02 * S(u, 2); return P; } },
  talk: { fps: 10, dur: 2.4, loop: true, fn: (u) => { const P = base(); const g = S(u, 2), h = S(u, 1, .3);
    P.armR = [n3(-.25, -.85, .35), n3(-.15 + .25 * g, -.1 + .45 * Math.max(0, g), 1)]; P.armL = [n3(.2, -.9, .25), n3(.25 * h, -.25, 1)];
    P.head = [.12 * S(u, 3), .25 * h, .05 * g]; P.spine = [.04, .12 * h, 0]; return P; } },
  phone: { fps: 8, dur: 4, loop: true, phone: true, fn: (u) => { const P = base();
    P.armR = [n3(-.42, -.55, .55), n3(.25, .92, -.12)]; P.armL = [n3(.28, -.85, .25), n3(-.75, -.1, .5)];   // left hand on the hip
    P.head = [.06, .15 * S(u), -.14]; P.spine = [.02, .1 * S(u), 0]; P.hip[0] = .008 * S(u); return P; } },
  text: { fps: 8, dur: 3, loop: true, phone: true, fn: (u) => { const P = base();
    P.armR = [n3(-.12, -.85, .45), n3(.3, .25, 1)]; P.armL = [n3(.12, -.85, .45), n3(-.35, .22, 1)]; P.head = [.5 + .05 * S(u), .05 * S(u, 2), 0]; P.spine = [.12, 0, 0]; return P; } },
  laugh: { fps: 12, dur: 1.6, loop: true, fn: (u) => { const P = base(); const k = Math.abs(S(u, 3));
    P.spine = [.18 * k - .05, .1 * S(u), 0]; P.head = [-.35 + .2 * k, 0, .05]; P.armL = [n3(.25, -.85, .45), n3(-.6, .1, .7)]; P.armR = [n3(-.3, -.6, .55), n3(.4, .55, .6)]; P.hip[1] = -.006 * k; return P; } },
  wave: { fps: 12, dur: 1.2, loop: true, fn: (u) => { const P = base(); const w = S(u, 2);
    P.armR = [n3(-.55, .78, .2), n3(-.25 + .55 * w, 1, .15)]; P.head = [-.45, -.15, 0]; P.spine = [-.06, -.1, 0]; return P; } },
  cheer: { fps: 12, dur: .9, loop: true, fn: (u) => { const P = base(); const k = Math.max(0, S(u));
    P.armL = [n3(.35, .9, .12), n3(.15, 1, .05)]; P.armR = [n3(-.35, .9, .12), n3(-.15, 1, .05)]; P.hip[1] = .05 * k; P.head = [-.5, 0, 0];
    P.legL = legPair(.1 * k, .25 * (1 - k), 1); P.legR = legPair(.1 * k, .25 * (1 - k), -1); return P; } },
  point: { fps: 8, dur: 3, loop: true, fn: (u) => { const P = base(); P.armR = [n3(-.2, .7, .65), n3(-.18, .75, .65)]; P.head = [-.55, -.12, 0]; P.spine = [-.08, -.15, 0]; P.armL[1] = n3(.2, -.6, .7); return P; } },
  walk: { fps: 16, dur: 1.05, loop: true, fn: (u) => { const P = base(); walkLegs(P, u);
    const a = S(u) * .38; P.armL = [limb(-a, .12, 1), limb(-a + .22, .08, 1)]; P.armR = [limb(a, .12, -1), limb(a + .22, .08, -1)]; P.spine = [.05, .07 * S(u), 0]; P.head[1] = -.05 * S(u); return P; } },
  stroll: { fps: 14, dur: 1.3, loop: true, fn: (u) => { const P = base(); walkLegs(P, u, .3, .6); const a = S(u) * .2; P.armL = [limb(-a, .12, 1), limb(-a + .15, .08, 1)]; P.armR = [limb(a, .12, -1), limb(a + .15, .08, -1)]; P.head[1] = .25 * S(u, .5); return P; } },
  duck: { fps: 12, dur: 1, loop: true, fn: (u) => { const P = base(); const s = .01 * S(u, 3);
    P.hip[1] = -.24 + s; P.spine = [.75, 0, 0]; P.head = [.5, 0, 0]; P.armL = [n3(-.1, .55, .82), n3(-.9, .15, -.2)]; P.armR = [n3(.1, .55, .82), n3(.9, .15, -.2)];
    P.legL = [n3(.18, -.45, .88), n3(.05, -.95, -.32)]; P.legR = [n3(-.18, -.45, .88), n3(-.05, -.95, -.32)]; return P; } },
  coverRun: { fps: 16, dur: .62, loop: true, fn: (u) => { const P = base(); walkLegs(P, u, .5, .95); P.hip[1] = -.03; P.spine = [.35, 0, 0]; P.head = [.25, 0, 0];
    P.armL = [n3(-.1, .55, .82), n3(-.9, .2, -.1)]; P.armR = [n3(.1, .55, .82), n3(.9, .2, -.1)]; return P; } },
  sit: { fps: 6, dur: 4, loop: true, fn: (u) => { const P = base();   // on the sand, knees up, leaning back on the hands
    P.hip[1] = -.44; P.spine = [-.32, 0, 0]; P.head = [.18, .3 * S(u), 0]; P.legL = [n3(.12, .42, .9), n3(.02, -1, .22)]; P.legR = [n3(-.12, .42, .9), n3(-.02, -1, .22)];
    P.armL = [n3(.25, -.82, -.52), n3(.1, -.95, -.3)]; P.armR = [n3(-.25, -.82, -.52), n3(-.1, -.95, -.3)]; return P; } },
  sitChair: { fps: 6, dur: 4, loop: true, fn: (u) => { const P = base(); P.hip[1] = -.27; P.hip[2] = -.03; P.spine = [.06, 0, 0]; P.head = [.1, .35 * S(u), 0];
    P.legL = [n3(.1, -.05, 1), n3(.02, -1, .05)]; P.legR = [n3(-.1, -.05, 1), n3(-.02, -1, .05)]; P.armL = [n3(.12, -.75, .55), n3(-.1, -.15, 1)]; P.armR = [n3(-.12, -.75, .55), n3(.25 + .2 * S(u, 2), .1, 1)]; return P; } },
  lieBack: { fps: 5, dur: 5, loop: true, fn: (u) => { const P = base(); P.hipR = [-Math.PI / 2, 0, 0]; P.hip = [0, -.47, -.02]; P.spine = [.012 * S(u), 0, 0]; P.head = [.12, .2 * S(u, .5), 0];
    P.armL = [n3(.55, -.84, .05), n3(.5, -.86, .1)]; P.armR = [n3(-.55, -.84, .05), n3(-.6, -.6, -.5)]; P.legL = [n3(.08, -1, 0), n3(.08, -1, 0)]; P.legR = [n3(-.06, -1, 0), n3(-.04, -1, 0)]; return P; } },
  lieFront: { fps: 5, dur: 5, loop: true, fn: (u) => { const P = base(); P.hipR = [Math.PI / 2, 0, 0]; P.hip = [0, -.47, .02]; P.spine = [-.01 * S(u), 0, 0]; P.head = [-.25, .9, 0];
    P.armL = [n3(.7, .7, -.1), n3(-.6, .2, -.6)]; P.armR = [n3(-.7, .7, -.1), n3(.6, .2, -.6)]; P.legL = [n3(.08, -1, 0), n3(.06, -1, -.1 - .12 * Math.max(0, S(u)))]; P.legR = [n3(-.06, -1, 0), n3(-.04, -1, 0)]; return P; } },
  lieWave: { fps: 12, dur: 1.2, loop: true, fn: (u) => { const P = CLIPS.lieBack.fn(0); P.armR = [n3(-.2, .25, 1), n3(-.2 + .5 * S(u, 2), .2, 1)]; P.head = [.35, 0, 0]; return P; } },
  kneel: { fps: 10, dur: 1.6, loop: true, fn: (u) => { const P = base(); P.hip[1] = -.36; P.spine = [.55, 0, 0]; P.head = [.35, 0, 0];
    P.legL = [n3(.15, -.68, .72), n3(.02, -.08, -1)]; P.legR = [n3(-.15, -.68, .72), n3(-.02, -.08, -1)];
    const a = S(u); P.armL = [n3(.15, -.55 - .2 * a, .8), n3(0, -.85 + .2 * a, .5)]; P.armR = [n3(-.15, -.55 + .2 * a, .8), n3(0, -.85 - .2 * a, .5)]; return P; } },
  binos: { fps: 6, dur: 6, loop: true, fn: (u) => { const P = base(); const y = .5 * S(u);
    P.armL = [n3(.3, -.42, .85), n3(-.6, .72, .35)]; P.armR = [n3(-.3, -.42, .85), n3(.6, .72, .35)]; P.spine = [0, y * .6, 0]; P.head = [0, y * .4, 0]; return P; } },
  paddle: { fps: 14, dur: 1.4, loop: true, fn: (u) => { const P = base(); P.hipR = [Math.PI / 2 * .97, 0, 0]; P.hip = [0, -.5, .04]; P.head = [-.85, 0, 0];
    const a = TAU * u; P.armL = [n3(.22, Math.cos(a), -Math.max(0, Math.sin(a)) - .15), n3(.18, Math.cos(a - .3), -Math.max(0, Math.sin(a - .3)) - .2)];
    const b = a + Math.PI; P.armR = [n3(-.22, Math.cos(b), -Math.max(0, Math.sin(b)) - .15), n3(-.18, Math.cos(b - .3), -Math.max(0, Math.sin(b - .3)) - .2)];
    P.legL = [n3(.1, -1, -.05), n3(.1, -1, -.1)]; P.legR = [n3(-.1, -1, -.05), n3(-.1, -1, -.1)]; return P; } },
  wade: { fps: 8, dur: 3, loop: true, fn: (u) => { const P = base(); P.armL = [n3(.55, -.8, .15), n3(.6, -.7, .4)]; P.armR = [n3(-.55, -.8, .15), n3(-.6, -.7, .4)]; P.head[1] = .3 * S(u); P.spine[1] = .1 * S(u); return P; } },
  volley: { fps: 8, dur: 2, loop: true, fn: (u) => { const P = base(); P.hip[1] = -.08; P.spine = [.3, 0, 0]; P.head = [-.2, 0, 0];
    P.legL = [n3(.25, -.85, .45), n3(.12, -.95, -.25)]; P.legR = [n3(-.25, -.85, .45), n3(-.12, -.95, -.25)]; P.armL = [n3(.08, -.6, .8), n3(-.12, -.5, .86)]; P.armR = [n3(-.08, -.6, .8), n3(.12, -.5, .86)]; P.hip[0] = .01 * S(u); return P; } },
  set: { fps: 12, dur: 1, loop: true, fn: (u) => { const P = base(); P.armL = [n3(.25, .9, .3), n3(-.15, .95, .2)]; P.armR = [n3(-.25, .9, .3), n3(.15, .95, .2)]; P.head = [-.6, 0, 0]; return P; } },
  serve: { fps: 10, dur: 2, loop: true, fn: (u) => { const P = base(); const k = Math.max(0, S(u));
    P.armR = [n3(-.3, .8 - .9 * k, .4 + .4 * k), n3(-.1, .9 - 1.2 * k, .6)]; P.armL = [n3(.25, -.2, .9), n3(.1, .3, .95)]; P.head = [-.4, 0, 0]; P.spine = [.15 * k, -.2 * k, 0]; return P; } },
  stance: { fps: 8, dur: 2.5, loop: true, fn: (u) => { const P = base(); // surf stance (sideways is the instance yaw): low, knees bent, arms out
    P.hip[1] = -.12 + .015 * S(u); P.hipR = [0, 0, 0]; P.spine = [.32, -.45, .1 * S(u)]; P.head = [-.15, -.9, 0];
    P.legL = [n3(.35, -.85, .35), n3(.25, -.95, -.2)]; P.legR = [n3(-.35, -.85, -.25), n3(-.2, -.95, .25)];
    P.armL = [n3(.95, -.15 + .15 * S(u), .2), n3(.9, -.3, .3)]; P.armR = [n3(-.95, -.25 - .15 * S(u), -.1), n3(-.9, -.4, .1)]; return P; } },
  stand: { alias: "idle" },
};
// clips sampled from the surfer GLB's own animations (see crowd.js retarget). key = our name, value = [glb clip, fps, loop]
export const GLB_CLIPS = { run: ["run", 16, true], swim: ["swim", 8, true], tumble: ["fall", 10, false], flip: ["flip", 12, false], balance: ["balance", 10, true] };
export const ALIAS = { stand: "idle", surf: "balance", lie: "lieBack", knocked: "tumble" };
