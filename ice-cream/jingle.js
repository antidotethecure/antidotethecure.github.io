/* SousShift AI — the ice-cream-truck "ringtone". An ORIGINAL melody (written for SousShift, not based on any existing
   song), synthesized live with WebAudio as a music-box / bell sound, so there is no audio file and nothing licensed.
   API: window.Jingle.play(times=2) -> Promise (resolves when done) · stop() · playing
   Browsers only allow sound after a tap, so call play() from a click handler. */
(function () {
  "use strict";
  var ctx = null, stopAt = 0, nodes = [], timer = null, playingNow = false;
  // MIDI note numbers; 0 = rest. Eighth notes at 152 bpm. Two 4-bar phrases (C major, question + answer).
  var MEL = [
    76, 79, 84, 79, 81, 79, 76, 72,   // E5 G5 C6 G5 A5 G5 E5 C5
    74, 76, 77, 81, 79, 0, 79, 0,     // D5 E5 F5 A5 G5 . G5 .
    76, 79, 84, 79, 81, 84, 83, 81,   // E5 G5 C6 G5 A5 C6 B5 A5
    79, 76, 74, 71, 72, 0, 84, 0      // G5 E5 D5 B4 C5 . C6 .
  ];
  var BASS = [48, 53, 55, 48]; // one per bar: C3 F3 G3 C3
  var STEP = 60 / 152 / 2;
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function ac() {
    var C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    if (!ctx) ctx = new C();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function bell(c, out, f, t, len, vol) {
    // bell = fundamental + bright inharmonic partials, fast attack, exponential decay
    [[1, 1], [2.0, .42], [3.01, .2], [4.2, .08]].forEach(function (p) {
      var o = c.createOscillator(), g = c.createGain();
      o.type = "sine"; o.frequency.value = f * p[0];
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol * p[1], t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len / (p[0] * .7 + .3));
      o.connect(g); g.connect(out); o.start(t); o.stop(t + len + .05); nodes.push(o);
    });
  }
  function soft(c, out, f, t, len, vol) {
    var o = c.createOscillator(), g = c.createGain();
    o.type = "triangle"; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + len + .05); nodes.push(o);
  }
  function play(times) {
    times = times || 2;
    var c = ac(); if (!c) return Promise.resolve(false);
    stop();
    var out = c.createGain(); out.gain.value = .55;
    // tiny echo so it sounds like a speaker on a truck
    var d = c.createDelay(); d.delayTime.value = .19; var fb = c.createGain(); fb.gain.value = .22;
    out.connect(c.destination); out.connect(d); d.connect(fb); fb.connect(d); d.connect(c.destination);
    var t0 = c.currentTime + .06, loopLen = MEL.length * STEP;
    for (var r = 0; r < times; r++) {
      var base = t0 + r * loopLen;
      MEL.forEach(function (m, i) { if (m) bell(c, out, hz(m), base + i * STEP, .9, .34); });
      BASS.forEach(function (m, i) { soft(c, out, hz(m), base + i * 8 * STEP, 8 * STEP * .95, .12); soft(c, out, hz(m + 7), base + (i * 8 + 4) * STEP, 4 * STEP * .9, .07); });
    }
    stopAt = t0 + times * loopLen + .9; playingNow = true;
    return new Promise(function (res) {
      timer = setTimeout(function () { playingNow = false; nodes = []; res(true); }, (stopAt - c.currentTime) * 1000);
    });
  }
  function stop() {
    clearTimeout(timer); playingNow = false;
    nodes.forEach(function (o) { try { o.stop(); } catch (e) {} }); nodes = [];
  }
  window.Jingle = { play: play, stop: stop, get playing() { return playingNow; } };
})();
