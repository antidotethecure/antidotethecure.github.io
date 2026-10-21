/* engine3d/audio.js — procedural ambience with WebAudio (no sound files): ocean surf, city traffic, crowd murmur + cheers,
   rain, thunder, wind, and a turbine whine layered on the game's own engine. Everything is synthesised from one noise buffer
   and a few oscillators, and plays into the page's sound-effects bus so the game's mute / "Sound effects" switch still rules.
     const amb = makeAmbience({ out: () => fxGainNode | null })     (lazy: builds on the first update() after audio is unlocked)
     amb.update(dt, { ocean, traffic, crowd, rain, wind, engine, cheer })   all 0..1
     amb.thunder(delaySeconds, strength 0..1)   amb.horn() */
export function makeAmbience(O) {
  let A = null; const L = {};
  function build(out) { const ctx = out.context, sr = ctx.sampleRate;
    const nb = ctx.createBuffer(1, sr * 3, sr), d = nb.getChannelData(0); let b = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; b = (b + .02 * w) / 1.02; d[i] = w * .5 + b * 3.5; }   // white + brown mix
    const bus = ctx.createGain(); bus.gain.value = .9; bus.connect(out);
    const src = (rate = 1) => { const s = ctx.createBufferSource(); s.buffer = nb; s.loop = true; s.playbackRate.value = rate; s.loopStart = Math.random() * 2; s.start(0, Math.random() * 2.5); return s; };
    const filt = (type, f, q) => { const x = ctx.createBiquadFilter(); x.type = type; x.frequency.value = f; x.Q.value = q || .7; return x; };
    const gain = (v) => { const g = ctx.createGain(); g.gain.value = v || 0; return g; };
    const chain = (...n) => { for (let i = 0; i < n.length - 1; i++) n[i].connect(n[i + 1]); return n[n.length - 1]; };
    const lfo = (f, depth, target) => { const o = ctx.createOscillator(), g = gain(depth); o.frequency.value = f; o.connect(g); g.connect(target); o.start(); return o; };
    // ocean: a deep lowpassed roar that swells with each wave + the hiss of the wash
    L.ocean = gain(0); chain(src(.6), filt("lowpass", 420, .5), (() => { const g = gain(.5); lfo(.13, .45, g.gain); return g; })(), L.ocean); chain(src(1), filt("bandpass", 2400, .5), (() => { const g = gain(.18); lfo(.13, .17, g.gain); return g; })(), L.ocean); L.ocean.connect(bus);
    // traffic: distant rumble + tyre roar
    L.traffic = gain(0); chain(src(.5), filt("lowpass", 160, .7), gain(.9), L.traffic); chain(src(.9), filt("bandpass", 900, .4), (() => { const g = gain(.12); lfo(.07, .08, g.gain); return g; })(), L.traffic); L.traffic.connect(bus);
    // crowd: three formant bands, each wobbling like many voices
    L.crowd = gain(0); [[500, 4, .5], [1500, 6, .35], [2600, 5, .2]].forEach(([f, q, v], i) => { const g = gain(v); lfo(2.3 + i * 1.7, v * .7, g.gain); lfo(.31 + i * .2, v * .4, g.gain); chain(src(1 + i * .03), filt("bandpass", f, q), g, L.crowd); }); L.crowd.connect(bus);
    L.cheer = gain(0); chain(src(1.2), filt("bandpass", 1300, 1.2), L.cheer); chain(src(1.1), filt("bandpass", 2900, 2), L.cheer); L.cheer.connect(bus);
    // rain: bright hiss + a lower patter
    L.rain = gain(0); chain(src(1), filt("highpass", 1800, .4), gain(.6), L.rain); chain(src(.8), filt("bandpass", 700, .9), (() => { const g = gain(.25); lfo(7, .1, g.gain); return g; })(), L.rain); L.rain.connect(bus);
    // wind (gusts, in-cloud whoosh)
    L.wind = gain(0); const wf = filt("bandpass", 500, .8); lfo(.09, 260, wf.frequency); chain(src(.7), wf, L.wind); L.wind.connect(bus);
    // turbine whine: two high sines riding on the game's own engine sound
    L.engine = gain(0); const t1 = ctx.createOscillator(), t2 = ctx.createOscillator(); t1.frequency.value = 2150; t2.frequency.value = 3220; t1.type = t2.type = "sine"; const tg = gain(.25); t1.connect(tg); t2.connect(tg); lfo(5.5, 8, t1.frequency); tg.connect(L.engine); t1.start(); t2.start(); chain(src(1.3), filt("bandpass", 5200, 2), gain(.12), L.engine); L.engine.connect(bus);
    A = { ctx, out, bus, nb, src, filt, gain, t1, t2 }; }
  const set = (g, v, tc) => { if (g) g.gain.setTargetAtTime(Math.max(0, v), A.ctx.currentTime, tc || .4); };
  const api = {
    update(dt, lv) { const out = O.out && O.out(); if (!out) return; if (!A || A.out !== out) { try { build(out); } catch (e) { return; } }
      set(L.ocean, (lv.ocean || 0) * .5); set(L.traffic, (lv.traffic || 0) * .32); set(L.crowd, (lv.crowd || 0) * .22); set(L.cheer, (lv.cheer || 0) * .35, .15);
      set(L.rain, (lv.rain || 0) * .42, .8); set(L.wind, (lv.wind || 0) * .3, .6); set(L.engine, (lv.engine || 0) * .05, .3);
      if (lv.rpm != null) { A.t1.frequency.setTargetAtTime(1900 + 600 * lv.rpm, A.ctx.currentTime, .3); A.t2.frequency.setTargetAtTime(2900 + 800 * lv.rpm, A.ctx.currentTime, .3); }
      if ((lv.traffic || 0) > .3 && Math.random() < dt * .05) api.horn(); },
    thunder(delay, k) { if (!A) return; const c = A.ctx, t0 = c.currentTime + delay, g = A.gain(0), f = A.filt("lowpass", 90 + 260 * k, .6), s = A.src(.35 + Math.random() * .15);
      s.connect(f); f.connect(g); g.connect(A.bus); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.9 * k, t0 + .08); g.gain.exponentialRampToValueAtTime(.35 * k, t0 + .9); g.gain.exponentialRampToValueAtTime(.001, t0 + 4.5 + 2 * k); s.stop(t0 + 7);
      const cr = A.gain(0), cf = A.filt("bandpass", 1800, .8), s2 = A.src(1.6); s2.connect(cf); cf.connect(cr); cr.connect(A.bus); cr.gain.setValueAtTime(0, t0); cr.gain.linearRampToValueAtTime(.25 * k, t0 + .03); cr.gain.exponentialRampToValueAtTime(.001, t0 + .7); s2.stop(t0 + 1); },
    horn() { if (!A) return; const c = A.ctx, t0 = c.currentTime, g = A.gain(0), f = A.filt("lowpass", 1400, .8); [350, 440].forEach(fr => { const o = c.createOscillator(); o.type = "square"; o.frequency.value = fr; o.connect(f); o.start(t0); o.stop(t0 + .5); }); f.connect(g); g.connect(A.bus);
      const dur = .18 + Math.random() * .25; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.03, t0 + .02); g.gain.setValueAtTime(.03, t0 + dur); g.gain.linearRampToValueAtTime(0, t0 + dur + .05); },
  };
  return api;
}
