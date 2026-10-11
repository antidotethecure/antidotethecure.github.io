/* Order Up! — Gritz N Wafflez (SousShift AI demo). You work the KITCHEN line; through the pass window you see the DINING
   ROOM (styled after the real Gritz room: geometric mural wall, dark wood ceiling band with can lights, navy banquette,
   white tables on gold legs, cognac chairs, glass entrance door, black plates).
   TWO STAGES, NO COOKING: everything on the line is already made.
     1) BUILD: tap food tiles (bases / proteins / sides / toppings / drinks) to build the plate, then 🛎️ Serve. The meal
        lands HOT and steaming on the pass (up to 4 plates wait there).
     2) DELIVER: tap the plate on the pass, then tap the guest's table. A server (or Jurni) walks it out.
   Plates cool on the pass: hot 🔥 → warm → cooling → cold ❄️. Colder plates pay less and tip less (cold = no tip).
   Speed (from the moment the party sits, to 0.1 s) is the biggest score driver; then heat (to 1%), accuracy (no undo),
   right table first try, tips, streaks, whole-table bonus and level bonus. $ earned is tracked in the HUD (sample
   prices, game only); the SCORE drives prizes.
   LEVELS: 90 s each, pass with fewer than 3 walk-outs. L1 = 1–2 item plates, slow cooling, no requests. L2–3 = bigger
   plates, faster cooling, "NO cheese"-style requests. L4 = STORY BEAT: "one of the cooks just clocked out" → the FRYER
   opens (catfish / tenderz / wingz / shrimp must be dropped in and pulled at the right doneness: raw → golden →
   perfect ✨ → brown → burnt), plus bigger parties and combos. L5+ = the whole kitchen: WAFFLE IRONS (pour, open on
   green) and SKILLET (eggs, bacon, sautéed shrimp) too, plus prep requests on the ticket (sautéed shrimp, sunny-side
   eggs, extra-crispy bacon, syrup on the side, "extra hot"). Everything else stays tap-ready. A pulled item goes straight
   onto the plate. Kid mode: L4 stays tap-only; L5 adds only the fryer, with slower cook times (×1.35).
   MODES (start menu "Who's playing?"): 🧑 Adult = ADULT pace; 🧒 Kid = KID_PACE (slower patience/arrivals, gentler
   cooling, fewer prep requests), kid-sized prizes, only through a signed-in parent account (crm.js).
   Jurni (the owner) walks the floor, delivers some plates, checks on tables, holds the door and thanks parties on the
   way out (big tippers get her $-eyes), and dances on level-up. Her mohawk color changes daily; seasonal themes by LA
   date layer over the room (?theme=halloween|thanksgiving|christmas|newyear|valentine|stpat|july4|none, ?hair=…).
   Antidote's food review is ONE framed poster on the top-left wall (tap: pause + Watch on YouTube). The first tap in a run
   is the hidden bonus (+250, ReviewEgg.collect() → the end screen's preview clip). Nothing else about the review pops up
   during play. Guests walk in through the glass door, line up at the host stand when every table is taken, and walk out
   after eating; Jurni's lines and flash messages show in the kitchen, never over the dining floor.
   Start menu attract mode: __OG.attract(true) runs the real engine as a silent demo behind the menu.
   Test/bot API: window.__OG (sim mode + step(ms) + tap/serve/pick/table actions). */
(function () {
  "use strict";
  var D = document, W = window, $ = function (i) { return D.getElementById(i); };
  var T = function (s) { return (W.__T || String)(s); };
  var RM = W.matchMedia && W.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var GI = "img/game/", QS = new URLSearchParams(location.search);
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]; }); };
  var rnd = function (a, b) { return a + Math.random() * (b - a); }, pick = function (a) { return a[(Math.random() * a.length) | 0]; };
  var clamp = function (x, a, b) { return Math.max(a, Math.min(b, x)); };

  /* ================= THEME + JURNI'S HAIR ================= */
  function laDate() { var s = new Date().toLocaleDateString("en-US", { timeZone: "America/Los_Angeles" }).split("/"); return { m: +s[0], d: +s[1], y: +s[2], wd: new Date(+s[2], +s[0] - 1, +s[1]).getDay() }; }
  var THEMES = {
    halloween: { hair: "halloween", fx: ["👻", "👻", "🦇", "👻", "🍬"], kind: "float", decor: ["🎃", "🕯️", "🎃", "🕯️"], music: "spooky", banner: "🎃 Happy Halloween from Gritz N Wafflez" },
    thanksgiving: { hair: "thanksgiving", fx: ["🍂", "🍁", "🍂", "🍁"], kind: "fall", decor: ["🌽", "🥧", "🍂"], music: "default", banner: "🍂 Happy Thanksgiving from Gritz N Wafflez" },
    christmas: { hair: "christmas", fx: ["❄", "❅", "❆", "❄", "❅"], kind: "snow", decor: ["🎄", "🎁", "🎄"], music: "jingle", hat: true, lights: true, banner: "🎄 Merry Christmas from Gritz N Wafflez" },
    newyear: { hair: "newyear", fx: ["✨", "🎊", "✨", "🎉"], kind: "fall", decor: ["🎉", "✨", "🎊"], music: "default", banner: "🎉 Happy New Year from Gritz N Wafflez" },
    valentine: { hair: "valentine", fx: ["💕", "❤️", "💗", "💕"], kind: "float", decor: ["🌹", "💝", "🌹"], music: "default", banner: "💝 Happy Valentine's Day from Gritz N Wafflez" },
    stpat: { hair: "stpat", fx: ["☘️", "🍀", "☘️"], kind: "fall", decor: ["🍀", "🌈", "🍀"], music: "default", banner: "🍀 Happy St. Patrick's Day" },
    july4: { hair: "july4", fx: ["🎆", "🎇", "🎆"], kind: "burst", decor: ["🇺🇸", "🎆", "🇺🇸"], music: "default", banner: "🎆 Happy 4th of July from Gritz N Wafflez" }
  };
  function themeId() {
    var q = (QS.get("theme") || "").toLowerCase(); if (q) return THEMES[q] ? q : "";
    var t = laDate(), m = t.m, d = t.d;
    if (m === 10) return "halloween"; if (m === 11 && d >= 15) return "thanksgiving"; if (m === 12 && d <= 26) return "christmas";
    if ((m === 12 && d >= 27) || (m === 1 && d <= 3)) return "newyear"; if (m === 2 && d >= 7 && d <= 14) return "valentine";
    if (m === 3 && d >= 14 && d <= 17) return "stpat"; if (m === 7 && d <= 5) return "july4"; return "";
  }
  var TH_ID = themeId(), TH = THEMES[TH_ID] || {};
  var HAIRS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun", "halloween", "thanksgiving", "christmas", "newyear", "valentine", "stpat", "july4"];
  var HAIRQ = { blue: "mon", lime: "tue", green: "tue", purple: "wed", turquoise: "thu", teal: "thu", pink: "fri", rainbow: "sat", gold: "sun" };
  var HAIR = (function () { var q = (QS.get("hair") || "").toLowerCase(); q = HAIRQ[q] || q; if (HAIRS.indexOf(q) >= 0) return q; return TH.hair || ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][laDate().wd]; })();
  function jimg(pose) { return GI + "jurni/" + pose + "-" + HAIR + ".webp"; }
  var HAT = { a: [34, -4, 30], impatient: [25, -5, 40], tip: [23, -5, 42] };   // Santa hat: left %, top %, width % of the sprite
  function jurniHTML(pose, cls) {
    var h = HAT[pose] || HAT.a;
    return '<span class="jw ' + (cls || "") + '"><img src="' + jimg(pose) + '" alt="Jurni">' + (TH.hat ? '<svg class="hat" style="left:' + h[0] + '%;top:' + h[1] + '%;width:' + h[2] + '%" viewBox="0 0 100 70" aria-hidden="true"><path d="M8 52 Q40 -8 88 18 L80 30 Q52 14 24 52Z" fill="#d42a2a"/><path d="M84 14 a9 9 0 1 0 0.1 0" fill="#fff"/><rect x="2" y="46" width="62" height="16" rx="8" fill="#fff" transform="rotate(-8 30 54)"/></svg>' : "") + "</span>";
  }

  /* ================= AUDIO (WebAudio, no files; music respects the menu's music switch) ================= */
  var AU = { ctx: null, music: true, sfx: true, mg: null, sg: null, loop: null }, NB = null;
  function ac() {
    if (!AU.ctx) { try { var C = W.AudioContext || W.webkitAudioContext; AU.ctx = new C(); AU.mg = AU.ctx.createGain(); AU.mg.gain.value = AU.music ? 0.14 : 0; AU.mg.connect(AU.ctx.destination); AU.sg = AU.ctx.createGain(); AU.sg.gain.value = AU.sfx ? 0.5 : 0; AU.sg.connect(AU.ctx.destination); } catch (e) { return null; } }
    if (AU.ctx.state === "suspended") { try { AU.ctx.resume(); } catch (e) {} }
    return AU.ctx;
  }
  function tone(f, dur, type, vol, when, slide) {
    var c = AU.ctx; if (!c) return; var t = c.currentTime + (when || 0), o = c.createOscillator(), g = c.createGain();
    o.type = type || "sine"; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(AU.sg); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, freq, vol) {
    var c = AU.ctx; if (!c) return;
    if (!NB) { NB = c.createBuffer(1, c.sampleRate, c.sampleRate); var d = NB.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    var s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime; s.buffer = NB; f.type = "bandpass"; f.frequency.value = freq || 3000; f.Q.value = 0.8;
    g.gain.setValueAtTime(vol || 0.2, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f); f.connect(g); g.connect(AU.sg); s.start(t); s.stop(t + dur);
  }
  var SFX = {
    sizzle: function () { noise(0.55, 4200, 0.22); }, drop: function () { tone(180, 0.12, "sine", 0.3, 0, 90); noise(0.4, 3800, 0.18); },
    beep: function () { tone(1320, 0.08, "square", 0.1); tone(1320, 0.08, "square", 0.1, 0.13); }, bell: function () { tone(1568, 0.9, "sine", 0.3); tone(2093, 0.7, "sine", 0.14); tone(3136, 0.4, "sine", 0.05); },
    ding: function () { tone(1760, 0.12, "triangle", 0.2); tone(2637, 0.25, "triangle", 0.2, 0.09); }, bad: function () { tone(220, 0.25, "sawtooth", 0.1, 0, 140); },
    pour: function () { noise(0.6, 900, 0.12); }, pop: function () { tone(660, 0.07, "triangle", 0.18, 0, 990); }, boo: function () { tone(300, 0.5, "sine", 0.16, 0, 620); },
    level: function () { [523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(f, 0.25, "triangle", 0.2, i * 0.11); }); }, smoke: function () { noise(0.8, 700, 0.14); },
    stir: function () { noise(0.25, 1400, 0.08); }, flash: function () { tone(2400, 0.05, "square", 0.05); }
  };
  function sfx(n) { if (!AU.sfx || og.sim) return; if (!ac()) return; try { SFX[n] && SFX[n](); } catch (e) {} }
  var MUS = {
    spooky: { bpm: 132, wave: "triangle", vib: true, lead: [69, 72, 76, 74, 72, 71, 68, 64, 69, 72, 76, 79, 77, 76, 74, 72], bass: [45, 45, 52, 52, 41, 41, 40, 40] },
    jingle: { bpm: 150, wave: "triangle", bell: true, lead: [76, 76, 76, 0, 76, 76, 76, 0, 76, 79, 72, 74, 76, 0, 0, 0, 77, 77, 77, 77, 77, 76, 76, 76, 76, 74, 74, 76, 74, 0, 79, 0], bass: [48, 55, 48, 55, 53, 60, 55, 55] },
    "default": { bpm: 112, wave: "sine", lead: [67, 0, 70, 72, 0, 74, 72, 0, 67, 0, 70, 72, 75, 74, 72, 70], bass: [43, 43, 46, 46, 48, 48, 46, 46] }
  };
  function mtof(n) { return 440 * Math.pow(2, (n - 69) / 12); }
  function mnote(f, dur, type, vol, t, vib) {
    var c = AU.ctx, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (vib) { var l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 6; lg.gain.value = f * 0.02; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.05); }
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(AU.mg); o.start(t); o.stop(t + dur + 0.05);
  }
  function startMusic() {
    stopMusic(); if (og.sim || !ac()) return; var P = MUS[TH.music || "default"], step = 0, spb = 60 / P.bpm / 2, next = AU.ctx.currentTime + 0.1;
    AU.loop = setInterval(function () {
      var c = AU.ctx; if (!c || c.state !== "running") return;
      if (next < c.currentTime) next = c.currentTime + 0.05;
      while (next < c.currentTime + 0.3) {
        var n = P.lead[step % P.lead.length]; if (n) mnote(mtof(n), spb * 0.9, P.wave, 0.2, next, P.vib);
        if (step % 2 === 0) mnote(mtof(P.bass[(step / 2 | 0) % P.bass.length]), spb * 1.8, P.vib ? "square" : "triangle", P.vib ? 0.07 : 0.14, next, false);
        if (P.bell && step % 2 === 0) mnote(mtof(96 + (step % 4 ? 0 : 3)), 0.1, "sine", 0.04, next);
        next += spb; step++;
      }
    }, 100);
  }
  function stopMusic() { if (AU.loop) { clearInterval(AU.loop); AU.loop = null; } }
  W.GAME_AUDIO = {
    music: function (on) { AU.music = !!on; if (AU.mg) AU.mg.gain.value = on ? 0.14 : 0; },
    sfx: function (on) { AU.sfx = !!on; if (AU.sg) AU.sg.gain.value = on ? 0.5 : 0; },
    state: function () { return { hasMusic: true, hasSfx: true, music: AU.music, sfx: AU.sfx }; }
  };

  /* ================= MENU DATA (real Gritz N Wafflez items from gritznwafflez.com/menu; $ are SAMPLE game prices) ================= */
  var IG = GI + "items/";
  // row = grid row; kind = where it sits on the plate; lv = level the tile unlocks; usd = sample game price
  var ITEMS = {
    waffle: { n: "Waffle", img: GI + "waffle_plain.webp", row: "base", kind: "base", lv: 1, usd: 6 },
    gritz: { n: "Gritz", img: GI + "grits.webp", row: "base", kind: "side", lv: 1, usd: 4 },
    ftoast: { n: "French toast", img: GI + "ftoast.webp", row: "base", kind: "base", lv: 2, usd: 6 },
    ttoast: { n: "Texas toast", img: GI + "ttoast.webp", row: "base", kind: "base", lv: 3, usd: 3 },
    cinna: { n: "Cinnamon toast", img: IG + "cinna.webp", row: "base", kind: "base", lv: 3, usd: 6 },
    chicken: { n: "Wingz", img: GI + "chicken.webp", row: "protein", kind: "protein", lv: 1, usd: 8 },
    tenderz: { n: "Tenderz", img: GI + "tenderz.webp", row: "protein", kind: "protein", lv: 1, usd: 8 },
    catfish: { n: "Catfish", img: GI + "catfish.webp", row: "protein", kind: "protein", lv: 1, usd: 9 },
    shrimp: { n: "Fried shrimp", img: GI + "shrimp.webp", row: "protein", kind: "protein", lv: 2, usd: 9 },
    bacon: { n: "Bacon", img: GI + "bacon.webp", row: "protein", kind: "protein", lv: 3, usd: 4 },
    egg: { n: "Scrambled eggs", img: GI + "egg.webp", row: "protein", kind: "protein", lv: 3, usd: 3 },
    friez: { n: "French Friez", img: IG + "friez.webp", row: "side", kind: "side", lv: 2, usd: 4 },
    mac: { n: "Smackin' Mac", img: GI + "mac.webp", row: "side", kind: "side", lv: 3, usd: 4 },
    collards: { n: "Collard Greens", img: IG + "collards.webp", row: "side", kind: "side", lv: 3, usd: 4 },
    potatoes: { n: "Homestyle Potatoes", img: IG + "potatoes.webp", row: "side", kind: "side", lv: 4, usd: 4 },
    fgritz: { n: "Fried Cheese Gritz", img: GI + "fgritz.webp", row: "side", kind: "side", lv: 4, usd: 7 },
    dip: { n: "Collard Dip", img: GI + "dip.webp", row: "side", kind: "side", lv: 4, usd: 9 },
    tomatoes: { n: "Fried Green Tomatoes", img: IG + "tomatoes.webp", row: "side", kind: "side", lv: 4, usd: 8 },
    pickles: { n: "Spicy Fried Pickles", img: IG + "pickles.webp", row: "side", kind: "side", lv: 4, usd: 7 },
    celestial: { n: "Celestial Eggs", img: IG + "celestial.webp", row: "side", kind: "side", lv: 4, usd: 8 },
    syrup: { n: "Syrup", img: GI + "drizzle.webp", row: "top", kind: "top", lv: 2, usd: 0.5 },
    butter: { n: "Butter", img: GI + "butter.webp", row: "top", kind: "top", lv: 2, usd: 0.5 },
    peach: { n: "Peach cobbler", img: GI + "peach.webp", row: "top", kind: "top", lv: 2, usd: 2 },
    cheese: { n: "Cheese", img: GI + "cheese.webp", row: "top", kind: "top", lv: 2, usd: 1 },
    sauce: { n: "Signature Sauce", img: GI + "sauce.webp", row: "top", kind: "cup", lv: 2, usd: 0.5 },
    hot: { n: "Hot sauce", img: GI + "hotsauce.webp", row: "top", kind: "cup", lv: 2, usd: 0.5 },
    berriez: { n: "Berriez", img: GI + "berriez.webp", row: "top", kind: "top", lv: 3, usd: 2 },
    whip: { n: "Whipped cream", img: GI + "whip.webp", row: "top", kind: "top", lv: 3, usd: 1 },
    kiki: { n: "Kiki Palmer", img: GI + "kiki.webp", row: "drink", kind: "drink", lv: 2, usd: 4 },
    oj: { n: "Fresh OJ", img: GI + "oj.webp", row: "drink", kind: "drink", lv: 2, usd: 5 },
    lemonade: { n: "Lemonade", img: IG + "lemonade.webp", row: "drink", kind: "drink", lv: 3, usd: 4 },
    tea: { n: "Iced Tea", img: IG + "tea.webp", row: "drink", kind: "drink", lv: 3, usd: 3 },
    coffee: { n: "Hot Coffee", img: IG + "coffee.webp", row: "drink", kind: "drink", lv: 4, usd: 3 },
    // L5+ prep variants: the ticket asks, you tap the variant tile INSTEAD of the regular one (no cooking involved)
    shrimp_s: { n: "Sautéed shrimp", img: IG + "shrimp_s.webp", row: "protein", kind: "protein", lv: 5, usd: 9, of: "shrimp", prep: "Sautéed, not fried" },
    egg_sun: { n: "Sunny-side eggs", img: IG + "egg_sun.webp", row: "protein", kind: "protein", lv: 5, usd: 3, of: "egg", prep: "Eggs sunny-side up" },
    bacon_x: { n: "Extra-crispy bacon", img: GI + "bacon.webp", fx: "crisp", row: "protein", kind: "protein", lv: 5, usd: 4, of: "bacon", prep: "Bacon extra crispy" },
    syrup_side: { n: "Syrup on the side", img: IG + "syrup_side.webp", row: "top", kind: "cup", lv: 5, usd: 0.5, of: "syrup", prep: "Syrup on the side" }
  };
  var ROWS = [["base", "Bases", "🧇"], ["protein", "Proteins", "🍗"], ["side", "Sides & starters", "🥗"], ["top", "Toppings & sauces", "🍯"], ["drink", "Drinks", "🥤"]];
  // real Gritz combos (gritznwafflez.com/menu); ph = the menu photo when there is one
  var DISHES = [
    { n: "Just Wafflez", r: ["waffle"], lv: 1 }, { n: "Just Gritz", r: ["gritz"], lv: 1 },
    { n: "Catfish N' Wafflez", r: ["waffle", "catfish"], ph: "catfish-wafflez", lv: 1 }, { n: "Tenderz N' Wafflez", r: ["waffle", "tenderz"], ph: "tenderz-wafflez", lv: 1 },
    { n: "Wingz N' Gritz", r: ["gritz", "chicken"], ph: "wingz-gritz", lv: 1 }, { n: "Catfish N' Gritz", r: ["gritz", "catfish"], ph: "catfish-gritz", lv: 1 },
    { n: "Tenderz N' Gritz", r: ["gritz", "tenderz"], ph: "tenderz-gritz", lv: 1 },
    { n: "Wingz N' Wafflez", r: ["waffle", "chicken", "syrup"], ph: "wingz-wafflez", lv: 2 }, { n: "Shrimp N' Gritz", r: ["gritz", "shrimp"], ph: "shrimp-gritz", lv: 2 },
    { n: "Shrimp N' Wafflez", r: ["waffle", "shrimp"], ph: "shrimp-wafflez", lv: 2 }, { n: "Peach Cobbler Waffle", r: ["waffle", "peach", "butter"], ph: "peach-waffle", lv: 2 },
    { n: "Classic French Toast", r: ["ftoast", "butter", "syrup"], ph: "classic-ftoast", lv: 2 }, { n: "Tender Basket", r: ["tenderz", "friez"], lv: 2 },
    { n: "Wing Basket", r: ["chicken", "friez"], lv: 2 }, { n: "Catfish Basket", r: ["catfish", "friez"], lv: 2 },
    { n: "Waffle Plate", r: ["waffle", "egg", "bacon"], ph: "waffle-plate", lv: 3 }, { n: "BET Breakfast Plate", r: ["bacon", "egg", "ttoast"], ph: "bet-plate", lv: 3 },
    { n: "French Toast Plate", r: ["ftoast", "bacon", "egg"], ph: "french-toast", lv: 3 }, { n: "Crunchy Cinnamon Toast", r: ["cinna", "syrup"], ph: "cinna-toast", lv: 3 },
    { n: "Mixed Berry Waffle", r: ["waffle", "berriez"], lv: 3 }, { n: "Wing Plate", r: ["chicken", "mac", "collards"], lv: 3 }, { n: "Tender Plate", r: ["tenderz", "mac", "friez"], lv: 3 },
    { n: "Loaded French Toast", r: ["ftoast", "berriez", "whip", "syrup"], ph: "loaded-ftoast", lv: 4 }, { n: "BET+ Breakfast Plate", r: ["bacon", "egg", "ttoast", "gritz"], ph: "bet-plate", lv: 4 },
    { n: "Da Baddest Chick Sandwich", r: ["ttoast", "tenderz", "bacon", "egg", "cheese"], ph: "baddest-chick", lv: 4 }, { n: "Breakfast Scramble", r: ["egg", "cheese", "potatoes", "collards"], lv: 4 },
    { n: "Catfish Plate", r: ["catfish", "mac", "collards"], lv: 4 }, { n: "Shrimp Plate", r: ["shrimp", "potatoes", "friez"], lv: 4 },
    { n: "Fried Green Tomatoes", r: ["tomatoes", "sauce"], ph: "green-tomatoes", lv: 4 }, { n: "Spicy Fried Pickles", r: ["pickles"], ph: "fried-pickles", lv: 4 },
    { n: "Celestial Eggs", r: ["celestial"], ph: "celestial-eggs", lv: 4 }, { n: "Original Collard Green Dip", r: ["dip"], ph: "collard-dip", lv: 4 },
    { n: "Fried Cheese Gritz", r: ["fgritz"], ph: "cheese-gritz-bites", lv: 4 }, { n: "Cinnatoast + Peach Cobbler", r: ["cinna", "peach", "syrup"], ph: "cinna-toast", lv: 4 }
  ];
  function dishImg(d) { if (d.ph) return "img/" + d.ph + ".jpg"; var p = d.r.filter(function (k) { return ITEMS[k].row === "protein"; })[0] || d.r[0]; return ITEMS[p].img; }
  function unlocked(L) { return Object.keys(ITEMS).filter(function (k) { return ITEMS[k].lv <= L; }); }
  // Per-level pacing: relaxed L1–2, tightening to L5. pat = base patience (s) per table (+extra s per extra guest);
  // arrive = s between parties (±1.5 s); cool = s for a plate on the pass to go from 🔥 to ❄️ (the 🔥 "hot" band is the
  // first quarter: ~22 s at adult L1, ~27 s at kid L1). Adult can be quicker than Kid, but its L1 never feels rushed.
  // cook (L4+ adult, L5 kid) = cook-time multiplier for the stations (kids ×1.35).
  var ADULT_PACE = {
    1: { pat: 75, arrive: 14, cool: 88 }, 2: { pat: 62, arrive: 12, cool: 72 }, 3: { pat: 50, arrive: 10, cool: 56 }, 4: { pat: 46, arrive: 9, cool: 48 }, 5: { pat: 40, arrive: 8, cool: 40 }
  };
  var KID_PACE = {
    1: { pat: 120, arrive: 18, cool: 110 }, 2: { pat: 95, arrive: 14, cool: 90 }, 3: { pat: 75, arrive: 11, cool: 70 }, 4: { pat: 55, arrive: 8, cool: 56 }, 5: { pat: 50, arrive: 8, cool: 50 }
  };
  function lvParams(L) {
    var kid = MODE === "kid", p = (kid ? KID_PACE : ADULT_PACE)[Math.min(5, L)], over = Math.max(0, L - 5);   // past L5: a little tighter each level
    var pat = Math.max(kid ? 30 : 24, p.pat - 3 * over);
    return { pat: pat, arrive: Math.max(kid ? 5 : 4.5, p.arrive - 0.3 * over), extra: 10, win: pat * 0.6, cool: Math.max(kid ? 30 : 24, p.cool - 2 * over), cook: kid ? 1.35 : 1 };
  }
  // who's playing: "kid" | "adult" | "" (not picked yet). Stored on this phone only; no age is ever asked or stored.
  var MODE = (function () { try { return localStorage.getItem("gnw-mode") || ""; } catch (e) { return ""; } })();
  function setMode(m) { MODE = m === "kid" ? "kid" : "adult"; try { localStorage.setItem("gnw-mode", MODE); } catch (e) {} hud(); best(); }
  function menuRefresh() { try { if (W.GameMenu && W.GameMenu.refresh) W.GameMenu.refresh(); } catch (e) {} }
  // the start menu's picker calls this: Kid needs a signed-in parent; leaving Kid (and Adult → Kid) needs the parent check
  function requestMode(v) {
    var TK = W.SSAI_TOKENS; v = v === "kid" ? "kid" : "adult";
    if (v === MODE) return;
    if (!TK || !TK.kidUnlock) { setMode(v); menuRefresh(); return; }
    if (v === "kid") { TK.kidUnlock(function () { setMode("kid"); menuRefresh(); }, MODE === "adult"); return; }
    if (MODE === "kid") { TK.parentCheck("Leave Kid mode", function () { setMode("adult"); menuRefresh(); }); return; }
    setMode("adult"); menuRefresh();
  }
  if (MODE === "kid") setTimeout(function () { var TK = W.SSAI_TOKENS; if (TK && TK.isParent && !TK.isParent()) { MODE = ""; try { localStorage.removeItem("gnw-mode"); } catch (e) {} hud(); menuRefresh(); } }, 0);
  function kidNick() { try { return (localStorage.getItem("gnw-kid-nick") || "").slice(0, 16); } catch (e) { return ""; } }
  function modeBadge() { return MODE === "kid" ? "🧒 Kid" : "🧑 Adult"; }
  var LEVEL_MS = 90000, MAX_WALK = 3, PASS_CAP = 4;

  /* ================= GUESTS (60 sprites, img/game/guests/<id>.webp) ================= */
  var GU = {};
  function gdef(ids, tags) { ids.split(" ").forEach(function (id) { GU[id] = { id: id, tags: tags.split(" ") }; }); }
  gdef("g000 g001 g002 g008", "kid"); gdef("g006 g011 g310 g411", "teen");
  gdef("g005 g105 g107 g304 g308 g406", "elder"); gdef("g300 g301", "elder church"); gdef("g302 g303", "elder church");
  gdef("g003 g007 g010", "adult mom"); gdef("g004 g009 g409", "adult dad"); gdef("g109 g111 g103", "adult glam");
  gdef("g205 g206", "adult office"); gdef("g305", "adult bf"); gdef("g306", "adult gf");
  gdef("g100 g101 g102 g104 g106 g108 g110 g200 g201 g202 g203 g204 g207 g208 g209 g210 g211 g307 g309 g311 g400 g401 g402 g403 g404 g405 g407 g408 g410", "adult");
  var FAMILIES = [["g004", "g003", "g006", "g005"], ["g009", "g010", "g011"], ["g007", "g008", "g001"], ["g409", "g404", "g000", "g002"], ["g400", "g111", "g008"]];
  function has(id, t) { return GU[id] && GU[id].tags.indexOf(t) >= 0; }
  function inUse() {
    var u = {}; og.tables.forEach(function (tb) { (tb.guests || []).forEach(function (g) { u[g.id] = 1; }); (tb.comingIds || []).forEach(function (id) { u[id] = 1; }); });
    (og.queue || []).forEach(function (q) { q.party.ids.forEach(function (id) { u[id] = 1; }); }); return u;
  }
  function grab(filter, used) { var pool = Object.keys(GU).filter(function (id) { return !used[id] && filter(id); }); if (!pool.length) pool = Object.keys(GU).filter(function (id) { return !used[id] && has(id, "adult"); }); var id = pick(pool); used[id] = 1; return id; }
  var grown = function (id) { return !has(id, "kid"); }, adult = function (id) { return has(id, "adult") || has(id, "elder"); };
  function wkind(L) {
    var w = L === 1 ? [["solo", 55], ["couple", 45]] : L === 2 ? [["solo", 20], ["couple", 25], ["friends", 30], ["momkid", 25]] :
      L === 3 ? [["couple", 25], ["friends", 15], ["momkid", 15], ["family", 45]] : L === 4 ? [["church", 25], ["family", 30], ["mixed", 25], ["couple", 10], ["momkid", 10]] :
      [["church", 15], ["family", 25], ["mixed", 30], ["couple", 10], ["vip", 20]];
    var tot = w.reduce(function (a, x) { return a + x[1]; }, 0), r = Math.random() * tot;
    for (var i = 0; i < w.length; i++) { r -= w[i][1]; if (r < 0) return w[i][0]; } return "solo";
  }
  function makeParty(L, maxCap) {
    var used = inUse(), k = wkind(L), ids = [], vip = false;
    if (maxCap < 3 && ["family", "church", "mixed"].indexOf(k) >= 0) k = Math.random() < 0.5 ? "couple" : "solo";
    if (k === "solo") ids = [grab(grown, used)];
    else if (k === "vip") { ids = [grab(function (id) { return has(id, "glam"); }, used)]; vip = true; }
    else if (k === "couple") { if (!used.g305 && !used.g306 && Math.random() < 0.3) { ids = ["g305", "g306"]; } else ids = [grab(adult, used), grab(adult, used)]; }
    else if (k === "friends") ids = [grab(grown, used), grab(grown, used)];
    else if (k === "momkid") ids = [grab(function (id) { return has(id, "mom"); }, used), grab(function (id) { return has(id, "kid"); }, used)];
    else if (k === "family") { var f = FAMILIES.filter(function (fm) { return fm.every(function (id) { return !used[id]; }); }); if (f.length) { ids = pick(f).slice(); ids.forEach(function (id) { used[id] = 1; }); } else ids = [grab(adult, used), grab(adult, used), grab(grown, used)]; }
    else if (k === "church") { if (["g300", "g301", "g302", "g303"].every(function (id) { return !used[id]; })) ids = ["g300", "g301", "g302", "g303"]; else ids = [grab(function (id) { return has(id, "elder"); }, used), grab(function (id) { return has(id, "elder"); }, used), grab(adult, used)]; }
    else if (k === "mixed") { ids = [grab(adult, used), grab(adult, used), grab(grown, used), grab(adult, used)]; vip = L >= 5; }
    ids = ids.filter(Boolean).slice(0, maxCap);
    return { kind: k, vip: vip, ids: ids };
  }
  function personality(id, vip) {
    if (vip || has(id, "glam")) return "picky"; if (has(id, "church")) return "generous"; if (has(id, "office")) return "hurry";
    var r = Math.random(); return r < 0.5 ? "chill" : r < 0.7 ? "generous" : r < 0.85 ? "picky" : "hurry";
  }
  var PER = { chill: ["😌", "Easygoing"], generous: ["💛", "Big tipper"], picky: ["🧐", "Picky: wants it perfect"], hurry: ["⏱️", "In a hurry"] };
  function makeOrder(L, kid) {
    var pool = DISHES.filter(function (d) { return d.lv <= Math.min(4, L); });
    if (kid) pool = pool.filter(function (d) { return d.lv <= 2; });
    var d = pick(pool), o = { dish: d, r: d.r.slice(), add: [], no: [], prep: [], hot: false };
    var noP = L <= 1 ? 0 : L === 2 ? 0.25 : L === 3 ? 0.35 : 0.4, addP = L >= 4 ? 0.35 : 0, prepP = L >= 5 ? (MODE === "kid" ? 0.15 : 0.45) : 0;
    if (kid || MODE === "kid") { noP *= 0.5; addP *= 0.5; }
    // + extras (L4+): sauce on fried food, cheese on gritz
    var fried = o.r.some(function (k) { return ["chicken", "tenderz", "catfish", "shrimp"].indexOf(k) >= 0; });
    if (fried && Math.random() < addP) { var x = Math.random() < 0.6 ? "sauce" : "hot"; if (o.r.indexOf(x) < 0) { o.r.push(x); o.add.push(x); } }
    else if (o.r.indexOf("gritz") >= 0 && o.r.indexOf("cheese") < 0 && Math.random() < addP) { o.r.push("cheese"); o.add.push("cheese"); }
    // NO requests (L2+): leave off a topping that normally comes on the dish
    var opt = o.r.filter(function (k) { return ["syrup", "butter", "cheese", "whip", "berriez"].indexOf(k) >= 0 && o.add.indexOf(k) < 0; });
    if (opt.length && Math.random() < noP) { var nk = pick(opt); o.r.splice(o.r.indexOf(nk), 1); o.no.push(nk); }
    else if (L >= 3 && o.r.indexOf("gritz") >= 0 && o.r.indexOf("cheese") < 0 && Math.random() < noP * 0.5) o.no.push("cheese");
    // prep requests (L5+): tap the variant tile instead of the regular one, or "extra hot" (must arrive 🔥)
    if (Math.random() < prepP) {
      var sw = Object.keys(ITEMS).filter(function (k) { return ITEMS[k].of && o.r.indexOf(ITEMS[k].of) >= 0; });
      if (sw.length && Math.random() < 0.75) { var v = pick(sw), base = ITEMS[v].of; o.r[o.r.indexOf(base)] = v; o.prep.push(ITEMS[v].prep); }
      else { o.hot = true; o.prep.push("Extra hot · fresh off the line 🔥"); }
    }
    var dp = L <= 1 ? 0 : kid ? 0.5 : 0.3, drinks = unlocked(L).filter(function (k) { return ITEMS[k].row === "drink" && !(kid && k === "coffee"); });
    if (drinks.length && o.r.length < 6 && Math.random() < dp) { var dk = pick(drinks); o.r.push(dk); o.drink = dk; }
    o.usd = o.r.reduce(function (a, k) { return a + ITEMS[k].usd; }, 0);
    return o;
  }

  /* ================= SERVERS (data-driven; "jurni" is the owner slot) ================= */
  var SERVERS = [
    { id: "jurni", name: "Jurni (owner)", owner: true },
    { id: "dee", name: "Dee", look: { skin: "#8d5524", hair: "#1d120c", style: "bun", shirt: "#3B1F5C" } },
    { id: "marco", name: "Marco", look: { skin: "#c68642", hair: "#2b1a10", style: "short", shirt: "#1E1B3A" } },
    { id: "kim", name: "Kim", look: { skin: "#f1c27d", hair: "#111", style: "bob", shirt: "#B8322A" } },
    { id: "tay", name: "Tay", look: { skin: "#5c3a21", hair: "#0d0805", style: "curly", shirt: "#D9A21B" } }
  ];
  function serverSVG(L) {
    var hair = { bun: '<circle cx="20" cy="5" r="5" fill="' + L.hair + '"/><path d="M10 13 Q20 2 30 13 L30 10 Q20 0 10 10Z" fill="' + L.hair + '"/>',
      short: '<path d="M10 13 Q20 1 30 13 Q30 6 20 5 Q10 6 10 13Z" fill="' + L.hair + '"/>',
      bob: '<path d="M8 20 Q8 3 20 4 Q32 3 32 20 L28 20 Q28 9 20 9 Q12 9 12 20Z" fill="' + L.hair + '"/>',
      curly: '<g fill="' + L.hair + '"><circle cx="12" cy="9" r="5"/><circle cx="20" cy="6" r="6"/><circle cx="28" cy="9" r="5"/></g>' }[L.style] || "";
    return '<svg viewBox="0 0 40 64" class="sv" aria-hidden="true"><rect x="13" y="44" width="5" height="17" rx="2" fill="#2a1e36" class="lg1"/><rect x="22" y="44" width="5" height="17" rx="2" fill="#2a1e36" class="lg2"/>' +
      '<path d="M10 26 Q20 20 30 26 L31 47 L9 47Z" fill="' + L.shirt + '"/><path d="M13 32 L27 32 L28 48 L12 48Z" fill="#fff" opacity=".92"/>' +
      '<rect x="4" y="27" width="5" height="14" rx="2.5" fill="' + L.skin + '" transform="rotate(-35 6 28)"/><rect x="31" y="26" width="5" height="13" rx="2.5" fill="' + L.skin + '" transform="rotate(20 33 27)"/>' +
      '<circle cx="20" cy="15" r="9.5" fill="' + L.skin + '"/>' + hair + '<circle cx="16.5" cy="15" r="1.2" fill="#222"/><circle cx="23.5" cy="15" r="1.2" fill="#222"/><path d="M16 19 Q20 23 24 19" stroke="#6a1c1c" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>';
  }

  /* ================= CSS ================= */
  var css = [
    ".ou2{position:relative;border-radius:14px;overflow:hidden;background:#cfd3d8;padding:0;user-select:none;-webkit-user-select:none;touch-action:manipulation;color:var(--ink)}",
    ".ou2 *{box-sizing:border-box}",
    // ---- dining room (seen through the pass window) ----
    ".din{position:relative;height:164px;overflow:hidden;background:#38393c;contain:layout paint}",
    // 3D-ish room: everything below is static (gradients + one pre-rendered texture), nothing is filtered per frame
    ".din .ceil{position:absolute;left:0;right:0;top:0;height:13px;background:repeating-linear-gradient(90deg,#ffffff06 0 1px,#0000 1px 9px),linear-gradient(180deg,#22170f,#4a3324 70%,#3a281c);box-shadow:0 3px 6px #000a;z-index:3}",
    ".din .soffit{position:absolute;left:0;right:0;top:13px;height:12px;background:linear-gradient(180deg,#d9d6cf,#f6f4ef 60%,#e4e1da);clip-path:polygon(0 0,100% 0,100% 58%,0 100%);z-index:2}",
    ".din .soffit:after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,#0005,#0000 5px)}",
    ".din .can{position:absolute;top:15px;width:8px;height:3px;border-radius:50%;background:#fffef6;box-shadow:0 0 6px 2px #fff8d8,0 0 14px 5px #ffe9a833;z-index:3}",
    ".din .wallb{position:absolute;left:0;right:0;top:22px;height:64px;background:#e8e4da;z-index:0}",
    ".din .mural{position:absolute;left:0;right:0;top:22px;height:64px;z-index:0;transform:perspective(420px) rotateY(-10deg) scale(1.04);transform-origin:100% 50%}",
    // wall shading: soffit shadow at the top, the far (left) end a touch darker, warm can-light scallops, AO above the banquette
    ".din .wl{position:absolute;left:0;right:0;top:22px;height:64px;z-index:1;pointer-events:none;background:" +
      "radial-gradient(ellipse 26px 34px at 13% 0,#fff4d466,#0000),radial-gradient(ellipse 26px 34px at 35% 0,#fff4d466,#0000),radial-gradient(ellipse 26px 34px at 57% 0,#fff4d466,#0000),radial-gradient(ellipse 26px 34px at 79% 0,#fff4d455,#0000)," +
      "linear-gradient(180deg,#0006,#0000 9px,#0000 70%,#0005),linear-gradient(90deg,#0004,#0000 35%)}",
    ".din .banq{position:absolute;left:32px;right:58px;top:79px;height:27px;border-radius:10px 10px 3px 3px;z-index:1;" +
      "background:radial-gradient(circle,#0b183a 0.9px,#0000 1.6px) 0 1px/12px 9px,radial-gradient(ellipse 5px 4px,#ffffff1c,#0000) 6px 5.5px/12px 9px,linear-gradient(180deg,#5a78bc,#34508f 16%,#26396d 58%,#1a2a55);" +
      "box-shadow:inset 0 2px 1px #a9c0f066,inset 0 -6px 5px #0007,0 4px 6px #000c}",
    ".din .banq:after{content:'';position:absolute;left:0;right:0;bottom:0;height:7px;border-radius:0 0 3px 3px;background:linear-gradient(180deg,#34508f,#1b2b58);border-top:1px dashed #ffffff2a;box-shadow:inset 0 1px 0 #ffffff22}",
    ".din .floor{position:absolute;left:0;right:0;top:104px;bottom:0;overflow:hidden;z-index:0;background:" +
      "radial-gradient(ellipse 46px 16px at 13% 46%,#ffdfa260,#0000),radial-gradient(ellipse 46px 16px at 35% 46%,#ffdfa260,#0000),radial-gradient(ellipse 46px 16px at 57% 46%,#ffdfa260,#0000),radial-gradient(ellipse 46px 16px at 79% 46%,#ffdfa233,#0000)," +
      "var(--ftex,none),linear-gradient(180deg,#232427,#3a3b40 40%,#55565c)}",
    ".din .floor:before{content:'';position:absolute;left:-60%;right:-60%;top:0;height:220%;transform:perspective(70px) rotateX(58deg);transform-origin:50% 0;background:repeating-linear-gradient(90deg,#ffffff1a 0 1px,#0000 1px 34px),repeating-linear-gradient(0deg,#ffffff14 0 1px,#0000 1px 30px)}",
    ".din .floor:after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,#000b,#0000 12px),linear-gradient(90deg,#0006,#0000 18%,#0000 80%,#0005)}",
    ".din .vig{position:absolute;inset:0;z-index:9;pointer-events:none;box-shadow:inset 0 0 26px 4px #0008;background:radial-gradient(ellipse 75% 85% at 50% 60%,#0000 60%,#0003)}",
    ".din .bar{position:absolute;right:0;top:22px;bottom:0;width:58px;background:linear-gradient(90deg,#c8962c,#e8b941 30%,#e3b23c 70%,#c99a30);z-index:1;box-shadow:inset 3px 0 0 #2d3f73,inset 6px 0 6px #0004}",
    ".din .bar .sh{position:absolute;left:6px;right:5px;height:3px;background:#c99b62;box-shadow:0 1px 0 #8a6436}",
    ".din .bar .gl{position:absolute;left:8px;right:8px;top:10px;height:42px;border:2px solid #c99b62;background:linear-gradient(135deg,#ffffff55,#ffffff11);border-radius:2px}",
    ".din .bar .cnt{position:absolute;left:0;right:0;bottom:0;height:46px;background:#24315c;border-top:5px solid #d9b98a}",
    ".din .bar .dome{position:absolute;left:14px;bottom:47px;width:26px;height:16px;border-radius:13px 13px 2px 2px;background:radial-gradient(circle at 30% 30%,#ffffffcc,#ffffff33 60%);border:1px solid #ffffff99}",
    ".din .bar .dome i{position:absolute;left:5px;right:5px;bottom:1px;height:7px;border-radius:3px;background:#6b3b25}",
    // glass entrance door (left), like the real Wilshire storefront: slim dark aluminium frame, glass with a sheen, the sheer
    // white curtain behind it, a push bar and navy GRITZ N WAFFLEZ lettering. Opening it shows the sunny sidewalk + spills light in.
    ".din .door2{position:absolute;left:0;top:24px;width:31px;bottom:0;z-index:4;background:linear-gradient(180deg,#bfe0f6,#eaf3f8 38%,#f4ead2 62%,#b9b2a2);box-shadow:inset -2px 0 0 #2b2e33,inset 0 2px 0 #2b2e33,3px 0 5px #0006}",
    ".din .door2:before{content:'';position:absolute;left:0;right:2px;bottom:0;height:34%;background:linear-gradient(180deg,#d8d2c2,#a9a293);clip-path:polygon(0 30%,100% 0,100% 100%,0 100%)}",
    ".din .door2 .gls{position:absolute;inset:2px 2px 0 0;transform-origin:0 50%;transition:transform .45s cubic-bezier(.3,.7,.4,1);border:2px solid #34373d;border-bottom-width:5px;border-radius:1px;" +
      "background:linear-gradient(112deg,#fff0 16%,#ffffffc0 25%,#fff0 33%,#fff0 56%,#ffffff8a 62%,#fff0 68%),linear-gradient(180deg,#9cc3dd66,#dfeaf055 50%,#a9bfcc77),repeating-linear-gradient(90deg,#fdfeff 0 1.6px,#cfd7dc 2.6px 3.6px,#f3f6f8 4.6px 5.5px);box-shadow:inset 0 0 0 1px #8b929a,2px 0 3px #0005}",
    ".din .door2 .gls b{position:absolute;left:0;right:0;top:24%;font:900 4.4px/4.9px var(--serif);color:#1f2f6b;text-align:center;letter-spacing:.02em;white-space:nowrap;text-shadow:0 0 1px #fff}",
    ".din .door2 .gls i{position:absolute;left:3px;right:2px;top:52%;height:3px;border-radius:2px;background:linear-gradient(180deg,#fdfdfd,#9aa1a8 60%,#6d737a);box-shadow:0 1px 1px #0007}",
    ".din .door2 .gls i:before,.din .door2 .gls i:after{content:'';position:absolute;top:-1px;width:2px;height:5px;background:#7d838a}.din .door2 .gls i:before{left:1px}.din .door2 .gls i:after{right:1px}",
    ".din .door2.open .gls{transform:perspective(150px) rotateY(72deg)}",
    ".din .spill{position:absolute;left:18px;bottom:0;width:120px;height:62px;z-index:1;pointer-events:none;opacity:0;transition:opacity .35s;background:radial-gradient(ellipse at 0 100%,#fff6dcdd,#fff1c855 42%,#0000 72%)}.din.dopen .spill{opacity:1}",
    // host stand + "Please wait to be seated" sign by the door
    ".din .host{position:absolute;left:32px;bottom:1px;width:15px;height:21px;z-index:5;pointer-events:none;border-radius:2px 2px 1px 1px;background:linear-gradient(90deg,#3a2414,#6d4527 45%,#4a2e1a);box-shadow:inset 0 2px 0 #d9a21b,2px 3px 4px #0007}",
    ".din .host:after{content:'';position:absolute;left:-2px;right:-2px;bottom:-3px;height:5px;background:radial-gradient(closest-side,#0009,#0000)}",
    ".din .host b{position:absolute;left:50%;bottom:22px;width:22px;margin-left:-11px;padding:1px 0;background:#fffdf6;border:1px solid #c9a44c;border-radius:1px;font:900 3.3px/3.6px var(--body);color:#1f2f58;text-align:center;box-shadow:0 1px 2px #0006}",
    ".din .host b:after{content:'';position:absolute;left:50%;top:100%;width:1px;height:3px;background:#c9a44c}",
    // wall branding: wordmark, menu board, Antidote's review banner
    ".din .wm{position:absolute;left:46%;top:24px;transform:translateX(-50%);z-index:2;background:#ffffffee;border-radius:3px;padding:2px 7px;font:900 9px/1.1 var(--serif);color:#1f2f58;letter-spacing:.04em;box-shadow:0 2px 4px #0004;white-space:nowrap}",
    ".din .wm i{font-style:italic;color:#c9a44c}",
    ".din .mb{position:absolute;right:61px;top:23px;width:74px;z-index:2;background:#1c1c1e;border:2px solid #c99b62;border-radius:3px;padding:3px 4px;font:800 5.6px/1.25 var(--body);color:#f4efe2;box-shadow:0 3px 6px #0006;padding:2px 4px}",
    ".din .mb b{display:inline;color:#F2C14E;font-size:6px;letter-spacing:.06em;margin-right:2px}",
    // Antidote's review poster, plastered on the wall: thin black frame + gold line, white mat, the WHOLE 2:3 poster photo (img/review/poster.webp, uncropped)
    // (sized exactly, object-fit contain: never cropped), caption on a strip BELOW the picture, a small ▶ badge in the corner,
    // a soft drop shadow onto the mural, a glossy sheen and the room's light, tilted with the receding wall
    ".din .poster{position:absolute;left:30px;top:10px;width:46px;z-index:4;border:0;padding:0;background:none;cursor:pointer;transform:perspective(320px) rotateY(-8deg);transform-origin:100% 50%;touch-action:manipulation;-webkit-tap-highlight-color:transparent}",
    ".din .poster .fr{display:block;padding:1.5px;background:linear-gradient(135deg,#2a2a2e,#0b0b0d 45%,#26262a);border-radius:1.5px;box-shadow:3px 4px 5px #0008,6px 9px 12px #0004,inset 0 0 0 .5px #c9a44c}",
    ".din .poster .mt{position:relative;display:block;padding:2.5px 2.5px 0;background:linear-gradient(180deg,#fbf8f1,#ece6d8);box-shadow:inset 0 0 0 .5px #c9a44c}",
    ".din .poster img{display:block;width:40px;height:auto;aspect-ratio:2/3;object-fit:contain;background:#05122e;box-shadow:0 0 0 .5px #0006}",
    ".din .poster .cap{display:block;margin:1px -2.5px 0;padding:1.2px 0 1.3px;background:#0b2a6b;text-align:center;white-space:nowrap;font:900 3.3px/1 var(--body);letter-spacing:-.02em;color:#FFD23F;overflow:hidden}",
    ".din .poster .cap>span{display:inline-block;transform:scaleX(.8);transform-origin:50% 50%;margin:0 -12%}",
    ".din .poster .cap em{font-style:normal;color:#dbe6ff;font-weight:700}",
    ".din .poster .pl{position:absolute;right:3.5px;top:55px;width:7px;height:5px;border-radius:1.5px;background:#e3262f;box-shadow:0 .5px 1px #0008}",
    ".din .poster .pl:after{content:'';position:absolute;left:2.6px;top:1.2px;border-left:2.4px solid #fff;border-top:1.3px solid transparent;border-bottom:1.3px solid transparent}",
    ".din .poster .gl{position:absolute;inset:0;pointer-events:none;background:linear-gradient(118deg,#ffffff00 20%,#ffffff40 34%,#ffffff00 46%),linear-gradient(180deg,#fff3d61f,#0000 40%,#00000022)}",
    ".din .poster.glint:before{content:'';position:absolute;inset:0;background:linear-gradient(110deg,#0000 30%,#fff9 50%,#0000 70%) -100% 0/250% 100%;animation:glint 1.2s ease-in-out 2;pointer-events:none}@keyframes glint{to{background-position:150% 0}}",
    // tables: white top on gold legs; guests SEATED (lower body hidden behind the table edge)
    ".tb{position:absolute;transform:translate(-50%,-100%);width:var(--w);height:58px;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}",
    ".tb .gs{position:absolute;left:0;right:0;bottom:3px;height:40px;display:flex;justify-content:center;gap:0;pointer-events:none}",
    ".tb .gq{position:relative;width:24px;height:40px;overflow:visible;transition:transform .5s cubic-bezier(.34,1.4,.64,1),opacity .4s;transform:translateY(10px);opacity:0}",
    ".tb .gq.in{transform:none;opacity:1}.tb .gq.out{transform:translateX(-90px);opacity:0;transition:transform 1.1s ease-in,opacity 1.1s}",
    ".tb .gq .im{position:absolute;left:-5px;right:-5px;top:0;height:40px;overflow:hidden}.tb .gq img.p{width:100%;height:auto;display:block}",
    ".tb .gq .ch{position:absolute;left:-2px;right:-2px;top:12px;height:30px;border-radius:9px 9px 3px 3px;z-index:-1;background:radial-gradient(ellipse 70% 45% at 38% 22%,#e3a466,#0000),linear-gradient(90deg,#6e3b1b,#a8642f 22%,#b9743b 50%,#8e5126 80%,#5f3216);box-shadow:inset 0 1px 1px #f6c99288,inset 0 -5px 5px #0006,0 2px 3px #0007}",
    ".tb .gq.full .im{animation:pat .45s ease-in-out 3}@keyframes pat{50%{transform:translateY(-2px) scale(1.04,.97)}}",
    ".tb .gq.imp .im{animation:gTap .5s ease-in-out infinite}.tb .gq.mad .im{animation:gTap .25s ease-in-out infinite;filter:drop-shadow(0 0 4px #e0473a)}",
    "@keyframes gTap{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg)}}",
    ".tb .gq .md{position:absolute;right:-7px;top:-3px;font-size:13px;line-height:1;filter:drop-shadow(0 1px 1px #0006);z-index:3}.tb .gq .md.ph{font-size:8px;right:-3px;top:8px;opacity:.9}",
    ".tb .gq.mad .md{animation:steam .8s ease-out infinite}@keyframes steam{0%{transform:translateY(0);opacity:1}100%{transform:translateY(-8px);opacity:.3}}",
    ".tb .gq .ok{position:absolute;left:-4px;top:-3px;width:13px;height:13px;border-radius:50%;background:#3fbf6f;color:#fff;font:900 8px/13px var(--body);text-align:center;z-index:3;display:none}.tb .gq.got .ok{display:block}",
    // white marble top with real thickness (front edge), a sheen + edge highlight, gold metallic legs, soft contact shadow
    ".tb .tt{position:absolute;left:50%;bottom:6px;transform:translateX(-50%);height:16px;border-radius:2px 2px 1px 1px;z-index:2;display:flex;align-items:center;justify-content:center;gap:3px;" +
      "background:linear-gradient(104deg,#fff0 25%,#ffffffb0 40%,#fff0 52%),var(--mtex,none),linear-gradient(180deg,#fdfcfa,#ebe8e2 72%,#d9d4cb 73%,#c7c0b4);background-size:auto,64px 16px,auto;" +
      "box-shadow:inset 0 1px 0 #fff,inset 1px 0 0 #ffffffaa,inset -1px 0 0 #0000001a,0 1px 0 #a99f90,0 7px 6px -3px #0008}",
    ".tb .tt:before,.tb .tt:after{content:'';position:absolute;top:16px;width:2.5px;height:8px;border-radius:0 0 1px 1px;background:linear-gradient(90deg,#6e5018,#f6e3a1 45%,#c19a45 70%,#7a5a1c)}.tb .tt:before{left:5px}.tb .tt:after{right:5px}",
    ".tb .cs{position:absolute;left:4%;right:4%;bottom:-3px;height:9px;border-radius:50%;background:radial-gradient(closest-side,#000b,#0000);z-index:0;pointer-events:none}",
    ".tb .gq:after{content:'';position:absolute;left:-2px;right:-2px;bottom:-4px;height:6px;border-radius:50%;background:radial-gradient(closest-side,#0008,#0000);z-index:-2}",
    ".tb.c2 .tt{width:50px}.tb.c4 .tt{width:98px}",
    ".tb .tt img{width:14px;height:14px;border-radius:50%;object-fit:cover;border:2px solid #111;box-shadow:0 1px 2px #0006;margin-top:-6px}",
    ".tb .tn{position:absolute;left:-4px;bottom:16px;font:900 8px var(--body);color:#fff;background:#3B1F5C;border-radius:99px;padding:1px 5px;z-index:4}",
    ".tb .pb{position:absolute;left:50%;bottom:0;transform:translateX(-50%);width:40px;height:3px;border-radius:3px;background:#0005;overflow:hidden;z-index:3;display:none}.tb.wait .pb{display:block}.tb .pb i{display:block;height:100%;background:#3fbf6f}",
    ".tb .dirt{position:absolute;left:50%;bottom:12px;transform:translateX(-50%);font-size:13px;z-index:3;display:none}.tb.dirty .dirt{display:block}",
    ".tb .flash{position:absolute;inset:-6px;border-radius:50%;background:radial-gradient(#fff,#fff0 70%);opacity:0;z-index:4;pointer-events:none}.tb .flash.on{animation:camf .6s ease-out}",
    "@keyframes camf{0%{opacity:1;transform:scale(.4)}100%{opacity:0;transform:scale(1.4)}}",
    ".din.aim .tb.wait{outline:2px dashed #FFD23F;outline-offset:2px;border-radius:8px;animation:aim 1s ease-in-out infinite}@keyframes aim{50%{outline-color:#fff}}",
    ".tb.r1{z-index:3}.tb.r2{z-index:6}",
    // servers + Jurni on the floor
    ".srv{position:absolute;left:0;top:0;width:26px;height:42px;z-index:5;pointer-events:none;will-change:transform;transform-origin:13px 42px}",
    ".srv .sv{width:100%;height:100%;animation:bob .32s ease-in-out infinite alternate}",
    "@keyframes bob{from{transform:translateY(0) rotate(-3deg)}to{transform:translateY(-3px) rotate(3deg)}}",
    ".srv .cp{position:absolute;left:-7px;top:6px;width:20px;height:20px;border-radius:50%;object-fit:cover;border:2px solid #111;box-shadow:0 2px 4px #0006}",
    ".jfl{position:absolute;left:0;top:0;width:40px;height:68px;z-index:5;pointer-events:none;will-change:transform;transform-origin:20px 68px;transition:opacity .3s}.jfl.ink{opacity:0}",
    ".jfl.dz .jw{animation:jdz .55s ease-in-out 4;transform-origin:50% 100%}@keyframes jdz{0%,100%{transform:none}25%{transform:translateY(-5px) rotate(-7deg)}50%{transform:rotateY(180deg) translateY(0)}75%{transform:rotateY(180deg) translateY(-5px) rotate(7deg)}}",
    ".jfl .jw{display:block;width:100%;height:100%}.jfl.walk .jw{animation:jsway .36s ease-in-out infinite alternate}@keyframes jsway{from{transform:translateY(0) rotate(-1.5deg)}to{transform:translateY(-2px) rotate(1.5deg)}}",
    // soft floor shadows so people stand IN the room (static radial gradients, no filters)
    ".srv:before,.jfl:before,.wk:before{content:'';position:absolute;left:12%;right:12%;bottom:-3px;height:7px;border-radius:50%;background:radial-gradient(closest-side,#000a,#0000)}",
    ".jfl:before{left:18%;right:18%;bottom:-2px}",
    // guests on foot (walking in, waiting in line, walking out): pointer-events none, transform-only movement
    ".wk{position:absolute;left:0;top:0;width:19px;height:41px;z-index:5;pointer-events:none;will-change:transform;transform-origin:9.5px 41px}",
    ".wk img{display:block;width:100%;height:100%;object-fit:contain;object-position:bottom}",
    ".wk.mv img{animation:wkb .3s ease-in-out infinite alternate}@keyframes wkb{from{transform:translateY(0) rotate(-2.5deg)}to{transform:translateY(-2px) rotate(2.5deg)}}",
    ".wk.q img{animation:wkq 2.4s ease-in-out infinite}@keyframes wkq{50%{transform:translateY(-.6px) rotate(-1deg)}}",
    ".wk.fd{transition:opacity .35s}.wk.fd.hid{opacity:0}",
    ".wk .tg{position:absolute;left:50%;top:-9px;transform:translateX(-50%);white-space:nowrap;font:900 6.5px/1 var(--body);color:#1E1B3A;background:#ffffffe6;border-radius:99px;padding:1.5px 3px;box-shadow:0 1px 2px #0006}",
    ".wk .tg.mad{background:#ffd9d4;color:#8a1c12}",
    ".wk .ph2{position:absolute;right:-2px;top:13px;font-size:7px;line-height:1}",
    ".wk .tgo{position:absolute;left:-5px;top:20px;font-size:9px;line-height:1}",
    ".wk .rx{position:absolute;left:50%;top:-15px;transform:translateX(-50%);font-size:10px;line-height:1;background:#fff;border-radius:99px;padding:1.5px 3px;box-shadow:0 1px 3px #0006}",
    ".wk .pu{position:absolute;left:-4px;top:2px;font-size:9px;line-height:1;transform:rotate(-20deg)}",
    ".wk.clap img{animation:clp .22s ease-in-out 6 alternate}@keyframes clp{to{transform:translateY(-2px) scale(1.03,.97)}}",
    // kitchen message slot (over the plate-name column, never over the dining floor): flash messages + Jurni's lines
    ".line{position:relative}",
    ".kmsg{position:absolute;left:78px;right:102px;top:6px;min-height:58px;display:grid;place-items:center;text-align:center;pointer-events:none;z-index:11;border-radius:12px;padding:4px 7px;opacity:0}",
    ".kmsg.fl2{background:#1E1B3Aee;box-shadow:0 4px 12px #0005;font:900 12.5px/1.2 var(--body);color:#fff}.kmsg.fl2.on{animation:fl 1.1s ease-out}",
    ".kmsg.js{background:#fff;border:2px solid #F2C14E;box-shadow:0 4px 10px #0004;font:900 11.5px/1.2 var(--body);color:#3B1F5C;transition:opacity .2s;grid-template-columns:auto 1fr;gap:5px;text-align:left;z-index:10}.kmsg.js.on{opacity:1}",
    ".kmsg.js img{width:24px;height:30px;object-fit:cover;object-position:50% 6%;border-radius:8px;background:#f6efe0}",
    ".jfl .sp{position:absolute;left:50%;top:-14px;transform:translateX(-50%);white-space:nowrap;font:900 8px var(--body);color:#3B1F5C;background:#F2C14E;border-radius:99px;padding:2px 5px}",
    ".jfl .crisp{filter:sepia(.4) brightness(.8)}",
    ".jw{position:relative;display:inline-block}.jw img{display:block;width:100%;height:100%;object-fit:contain;object-position:bottom}.jw .hat{position:absolute;height:auto;pointer-events:none}",
    // level up / banner
    ".lvb{position:absolute;inset:0;z-index:20;display:none;align-items:flex-start;justify-content:center;background:radial-gradient(#3b1f5c99,#1e1b3acc);pointer-events:none}.lvb.on{display:flex}",
    ".lvb h3{margin:14px 0 0;font:900 italic 34px var(--serif);color:#F2C14E;text-shadow:0 3px 0 #000a;animation:lvIn .6s cubic-bezier(.34,1.6,.64,1)}",
    ".lvb p{position:absolute;top:54px;padding:0 10px;left:0;right:0;text-align:center;margin:0;font:800 12px var(--body);color:#fff}",
    "@keyframes lvIn{from{transform:scale(.3);opacity:0}to{transform:none;opacity:1}}",
    ".dance{position:absolute;left:50%;top:72%;width:54px;height:92px;transform:translate(-50%,-50%);z-index:13}",
    ".dance .jw{width:100%;height:100%}.dance.go .jw{animation:spin 1.1s cubic-bezier(.4,1.5,.6,1) 2}",
    "@keyframes spin{0%{transform:rotateY(0) translateY(0)}25%{transform:rotateY(180deg) translateY(-14px) scale(1.05,.95)}50%{transform:rotateY(360deg) translateY(0) scale(.95,1.05)}75%{transform:rotateY(360deg) translateY(-10px)}100%{transform:rotateY(360deg) translateY(0)}}",
    ".dance .tray{position:absolute;left:-26px;top:38%;display:flex;gap:2px}.dance .tray img{width:20px;height:auto}",
    ".spk{position:absolute;font-size:16px;z-index:14;pointer-events:none;animation:spk 1.2s ease-out forwards}@keyframes spk{0%{transform:scale(.2);opacity:1}100%{transform:translate(var(--dx),var(--dy)) scale(1.2);opacity:0}}",
    // theme effects (layer over the real room)
    ".fxl{position:absolute;left:0;right:0;top:0;height:86px;pointer-events:none;z-index:2;overflow:hidden}",   // theme fx stay on the wall, never over the floor
    "",
    ".fxl i{position:absolute;font-style:normal;opacity:.75;animation-iteration-count:infinite;animation-timing-function:linear}",
    ".fxl.float i{animation-name:fxFloat}.fxl.fall i,.fxl.snow i{animation-name:fxFall}.fxl.snow i{color:#fff;text-shadow:0 0 4px #9cf}.fxl.burst i{animation-name:fxBurst;animation-timing-function:ease-out}",
    "@keyframes fxFloat{0%{transform:translate(-30px,0)}50%{transform:translate(20px,-14px)}100%{transform:translate(380px,6px)}}",
    "@keyframes fxFall{0%{transform:translate(0,-30px) rotate(0)}100%{transform:translate(30px,240px) rotate(300deg)}}",
    "@keyframes fxBurst{0%{transform:scale(.2);opacity:0}20%{opacity:1}100%{transform:scale(1.6);opacity:0}}",
    ".decor{position:absolute;right:62px;top:66px;z-index:2;font-size:12px;letter-spacing:1px;pointer-events:none}",
    ".lights{position:absolute;left:0;right:0;top:12px;height:10px;z-index:3;background:radial-gradient(circle,#ff4d4d 2.5px,transparent 3px) 0 2px/18px 10px,radial-gradient(circle,#3fd16f 2.5px,transparent 3px) 9px 4px/18px 10px;animation:tw 1s steps(2) infinite;pointer-events:none}@keyframes tw{50%{filter:brightness(1.6)}}",
    ".ou2.th-halloween .din .wl{background:linear-gradient(180deg,#ff8a2a22,#5a2a7a55)}.ou2.th-christmas .din .wl{background:linear-gradient(180deg,#ffffff22,#2f8f4e22)}.ou2.th-thanksgiving .din .wl{background:linear-gradient(180deg,#ff8c3a22,#7a3a1a33)}",
    // ---- kitchen (player side): stainless pass shelf, ticket rail, line + tile floor ----
    ".pass{position:relative;height:46px;background:radial-gradient(ellipse 60% 70% at 50% 0,#fff3d244,#0000),repeating-linear-gradient(90deg,#ffffff1c 0 1px,#0000 1px 2px,#00000009 2px 3px),linear-gradient(180deg,#f4f6f8,#c9ced3 45%,#a5acb3 80%,#8d949c);border-top:3px solid #5d646c;box-shadow:inset 0 1px 0 #fff,inset 0 -3px 2px #0003,0 -3px 6px #0005;display:flex;align-items:center;gap:4px;padding:3px 6px 4px}",
    ".pass .lbl{position:absolute;left:6px;top:1px;font:900 7.5px var(--body);letter-spacing:.14em;color:#4a5058}",
    ".ps{position:relative;flex:1;height:44px;border:0;border-radius:10px;background:#0000;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;padding:0}",
    ".ps .bp{position:absolute;left:50%;top:4px;width:36px;height:36px;margin-left:-18px;border-radius:50%;background:radial-gradient(circle at 38% 30%,#4a4a4a,#151515 62%,#050505 72%,#2a2a2a 78%,#0d0d0d);box-shadow:0 5px 5px -1px #000a,0 9px 9px -4px #0006,inset 0 1px 1px #ffffff40;overflow:hidden}",
    ".ps .bp img{position:absolute;inset:4px;width:28px;height:28px;border-radius:50%;object-fit:cover}",
    ".ps .stm{position:absolute;left:50%;top:-6px;width:20px;height:24px;margin-left:-10px;border-radius:50%;background:radial-gradient(closest-side,#ffffffd8,#ffffff80 35%,#ffffff26 65%,#fff0);animation:stm2 1.3s ease-out infinite;pointer-events:none}.ps .stm.b{margin-left:-2px;animation-delay:.6s;width:14px}",
    "@keyframes stm2{0%{transform:translateY(10px) scale(.5);opacity:0}30%{opacity:var(--so,.9)}100%{transform:translateY(-14px) scale(1.4);opacity:0}}",
    ".ps .ht{position:absolute;left:8px;right:8px;bottom:0;height:4px;border-radius:3px;background:#0003;overflow:hidden}.ps .ht i{display:block;height:100%}",
    ".ps .hi{position:absolute;right:2px;top:0;font-size:11px}",
    ".ps.sel{background:#FFD23F55;box-shadow:0 0 0 3px #FFD23F}",
    ".ps.cold .bp{filter:saturate(.6) hue-rotate(10deg) brightness(.9);box-shadow:0 0 0 2px #8fd0ff,0 3px 5px #0007}",
    ".ps:empty:after{content:'';position:absolute;left:50%;top:6px;width:32px;height:32px;margin-left:-16px;border-radius:50%;border:2px dashed #8a9199}",
    ".rail{display:flex;gap:4px;overflow-x:auto;padding:8px 5px 3px;margin:0;min-height:60px;max-height:86px;align-items:flex-start;background:repeating-linear-gradient(90deg,#ffffff14 0 1px,#0000 1px 3px),linear-gradient(180deg,#7f868e,#c8ccd1 40%,#b3b8be);border-top:2px solid #6e757d;scrollbar-width:none;-webkit-overflow-scrolling:touch}.rail::-webkit-scrollbar{display:none}",
    ".rail .none{color:#2a2f36;font:700 11.5px var(--body);padding:14px 6px}",
    ".tk{flex:none;width:104px;background:#fffdf7;border:2px solid #3fbf6f;border-radius:4px 4px 10px 10px;padding:4px 5px 5px;box-shadow:0 3px 6px #0003;position:relative}",
    ".tk:before{content:'';position:absolute;left:44%;top:-7px;width:12px;height:6px;border-radius:2px;background:#5b6168}",
    ".tk.warn{border-color:#f0b429}.tk.bad{border-color:#e0473a;animation:wob2 .5s infinite}@keyframes wob2{0%,100%{transform:rotate(-1.5deg)}50%{transform:rotate(1.5deg)}}",
    ".tk .h{display:flex;align-items:center;gap:4px}.tk .h img{width:22px;height:22px;border-radius:50%;object-fit:cover;flex:none;border:2px solid #111}",
    ".tk .h b{font:800 9px/1.1 var(--body);color:#3B1F5C;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.tk .t{position:absolute;right:4px;top:-8px;background:#3B1F5C;color:#fff;font:900 9px var(--body);border-radius:99px;padding:1px 6px}",
    ".tk .its{display:flex;flex-wrap:nowrap;gap:1px;margin-top:2px;overflow:hidden}.tk .its img{width:15px;height:15px;flex:none;object-fit:contain}.tk .its img.crisp{filter:sepia(.4) brightness(.8)}",
    ".tk .mods{display:flex;flex-wrap:nowrap;overflow:hidden;gap:2px;margin-top:1px}.tk .mods span{font:900 8px var(--body);border-radius:5px;padding:1px 3px}.tk .mods .ad{background:#3fbf6f22;color:#1d7a44}.tk .mods .no{background:#e0473a22;color:#b8322a}",
    ".tk .prep{margin-top:2px;font:900 7.5px/1.15 var(--body);color:#1a0d00;background:#FFD23F;border-radius:4px;padding:1px 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    ".tk .pr{font-size:10px;position:absolute;left:4px;top:-8px}",
    ".line{background:repeating-linear-gradient(0deg,#0000 0 21px,#9aa0a733 21px 22px),repeating-linear-gradient(90deg,#d8dbde 0 21px,#9aa0a733 21px 22px);padding:5px 6px 6px}",
    ".bld{display:grid;grid-template-columns:66px minmax(0,1fr) 92px;gap:6px;align-items:center}",
    ".plt{position:relative;width:66px;height:66px;cursor:pointer;border-radius:50%;background:radial-gradient(circle at 40% 35%,#3c3c3c,#101010 68%,#000 71%,#0000 72%)}",
    ".plt .st img{position:absolute;height:auto;object-fit:contain;filter:drop-shadow(0 3px 4px #0006);transition:transform .3s cubic-bezier(.34,1.56,.64,1)}",
    ".plt .cupz{position:absolute;right:-8px;top:-4px;display:flex;flex-direction:column;gap:2px;z-index:15}.plt .cupz img{width:20px;height:auto;max-height:40px;object-fit:contain}",
    ".bld .nm{font:800 10px/1.2 var(--body);color:#2a2f36}.bld .nm b{display:block;font-size:11.5px;color:#3B1F5C}",
    ".bld .acts{display:grid;gap:4px}.bld .acts button{border:0;border-radius:12px;padding:5px 4px;font:900 13px/1.1 var(--body);cursor:pointer;touch-action:manipulation;min-height:30px}",
    ".bld .sv2{background:linear-gradient(180deg,var(--gold2),var(--gold));color:#2a1e36;box-shadow:0 4px 0 #a27512;min-height:38px!important;font-size:14px!important}.bld .sv2:active{transform:translateY(3px);box-shadow:0 1px 0 #a27512}",
    ".bld .ud{display:grid;grid-template-columns:1fr 1fr;gap:4px}.bld .ud button{background:#fff;color:#3B1F5C;border:2px solid #c3c8ce;font-size:10px!important;padding:4px 2px!important;min-width:0}",
    ".grid{margin-top:4px}.grow{display:flex;gap:3px;align-items:center;margin-top:3px}.grow>span{flex:none;width:16px;font-size:13px;text-align:center;line-height:1}",
    ".grow .cells{flex:1;display:flex;gap:3px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;min-width:0}.grow .cells::-webkit-scrollbar{display:none}",
    ".grow .cells>button{flex:0 0 calc((100% - 21px)/8)}.grow .cells>.gsep{flex:none;align-self:center;font-style:normal;font-size:11px;padding:0 1px;opacity:.8}",
    ".grow button{position:relative;background:#fff;border:2px solid #c3c8ce;border-radius:10px;padding:1px 1px 2px;cursor:pointer;display:flex;flex-direction:column;align-items:center;font:800 7px/1.05 var(--body);color:#3B1F5C;text-align:center;height:42px;-webkit-tap-highlight-color:transparent;touch-action:manipulation;overflow:hidden}",
    ".grow button span.l{display:block;margin-top:-1px;width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.grow button img{width:25px;height:24px;flex:none;object-fit:contain;pointer-events:none}.grow button img.crisp{filter:sepia(.4) brightness(.8)}.grow button.on{border-color:var(--gold);background:#fff4d2}.grow button:active{transform:scale(.92)}",
    ".grow button.pv{border-color:#FFD23F;background:#fffbe6}.grow button .nw{position:absolute;right:1px;top:1px;background:#e3262f;color:#fff;font:900 6.5px/1 var(--body);border-radius:4px;padding:2px 3px}",
    ".pop2{position:absolute;font:900 13px var(--body);color:#f2c14e;text-shadow:0 2px 6px #000b;pointer-events:none;animation:up 1.4s ease-out forwards;z-index:15;white-space:nowrap}",
    ".startov2{position:absolute;inset:0;background:#2b1a40e6;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:#fff;cursor:pointer;text-align:center;z-index:30;padding:20px}",
    ".startov2 b{font:900 italic 40px var(--serif);color:var(--gold2)}.startov2 span{font:800 18px var(--body)}.startov2.off{display:none}",
    // cooking stations (L4+ adult / L5 kid)
    ".stn{display:none;gap:3px;margin-top:4px;padding:3px;border-radius:12px;background:linear-gradient(180deg,#4b4f55,#2e3136);box-shadow:inset 0 1px 0 #ffffff33}.stn.on{display:flex;flex-wrap:nowrap;justify-content:center}",
    ".stn .sg{position:relative;display:flex;align-items:center;gap:3px;padding:11px 3px 4px;border-radius:9px;background:#00000033}",
    ".stn .sg>b{position:absolute;left:4px;top:1px;font:900 7.5px var(--body);letter-spacing:.08em;color:#F2C14E;text-transform:uppercase;white-space:nowrap}",
    ".stn .sg.tut{box-shadow:0 0 0 3px #FFD23F;animation:aim 1s ease-in-out infinite}",
    ".sl{position:relative;width:38px;height:38px;border-radius:50%;border:0;padding:0;cursor:pointer;background:conic-gradient(var(--c,#999) calc(var(--p,0)*1turn),#ffffff22 0);-webkit-tap-highlight-color:transparent;touch-action:manipulation}",
    ".sl:active{transform:scale(.93)}.sl .in{position:absolute;inset:4px;border-radius:50%;background:#1a1028;display:grid;place-items:center;overflow:visible}",
    ".sl.fry .in{background:radial-gradient(#c98a1e,#7a4a0c)}.sl.fry .in:after{content:'';position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle,#fff6 1.5px,transparent 2px) 0 0/8px 8px;animation:oil .5s linear infinite;opacity:0}.sl.fry.on .in:after{opacity:1}",
    "@keyframes oil{to{background-position:0 -8px}}",
    ".sl.iron{border-radius:10px}.sl.iron .in{border-radius:8px;background:repeating-linear-gradient(0deg,#3a3a44 0 5px,#2a2a33 5px 7px),#333}",
    ".sl.skil .in{background:radial-gradient(#444,#111)}",
    ".sl img{width:24px;height:24px;object-fit:contain}.sl .lb{position:absolute;left:50%;bottom:-6px;transform:translateX(-50%);font:900 7px var(--body);background:#000b;color:#fff;border-radius:99px;padding:1px 4px;white-space:nowrap;z-index:2}",
    ".sl .lt{position:absolute;right:1px;top:1px;width:8px;height:8px;border-radius:50%;background:#e0473a;box-shadow:0 0 6px #e0473a;z-index:2}.sl .lt.g{background:#3fe07a;box-shadow:0 0 8px #3fe07a}",
    ".sl .stm{position:absolute;left:50%;top:-8px;width:18px;height:18px;margin-left:-9px;border-radius:50%;background:radial-gradient(#fffd,#fff0 70%);animation:stm2 1.4s ease-out infinite;pointer-events:none;z-index:2}",
    ".sl .smk{position:absolute;inset:-6px;border-radius:50%;background:radial-gradient(#555c,#5550 70%);animation:stm2 1s ease-out infinite;pointer-events:none}",
    ".grow button .ck{position:absolute;left:1px;top:1px;font-size:9px;line-height:1}",
    ".plt .dn{position:absolute;left:-6px;right:-6px;bottom:-6px;display:flex;flex-wrap:wrap;justify-content:center;gap:2px;z-index:20}.plt .dn span{font:900 7.5px var(--body);border-radius:99px;padding:1px 4px;color:#fff;box-shadow:0 1px 3px #0005}",
    ".shortp{display:none;position:absolute;left:50%;top:1px;transform:translateX(-50%);z-index:9;font:900 9px/1 var(--body);color:#1E1B3A;background:#F2C14E;border-radius:99px;padding:2px 8px;white-space:nowrap;box-shadow:0 2px 6px #0006;pointer-events:none}",
    ".cut{position:absolute;inset:0;z-index:22;display:none;background:#0b1020aa}.cut.on{display:block}",
    ".cut .jj{position:absolute;left:8px;bottom:4px;width:62px;height:104px}.cut .bb{position:absolute;left:72px;top:14px;right:10px;background:#fff;color:#3B1F5C;border-radius:14px 14px 14px 4px;padding:8px 10px;font:900 13px/1.25 var(--body);box-shadow:0 6px 16px #0007}",
    ".cut .ck2{position:absolute;bottom:8px;width:30px;height:48px;transition:transform 2.4s linear}.cut .ck2 .sv{width:100%;height:100%;animation:bob .3s ease-in-out infinite alternate}",
    ".cut .ck2 i{position:absolute;left:-14px;top:-14px;font-style:normal;font-size:16px}",
    ".cut .hatc{position:absolute;left:8px;top:-9px;width:14px;height:10px;border-radius:6px 6px 2px 2px;background:#fff;box-shadow:0 0 0 1px #ccc}",
    // "How to cook 🍳" screens (before the first fryer level and before L5's irons + skillet); game paused until 👍
    ".howc{position:absolute;inset:0;z-index:45;display:none;overflow-y:auto;background:linear-gradient(180deg,#1E1B3A,#3B1F5C);color:#fff;padding:10px 12px 14px}.howc.on{display:block}",
    ".howc h3{margin:0 0 2px;font:900 21px/1.1 var(--serif);color:#F2C14E}.howc .sub{margin:0 0 8px;color:#E8DCF5;font-size:13px}",
    ".howc ol{list-style:none;margin:0;padding:0}.howc li{display:flex;gap:8px;align-items:center;background:#ffffff12;border:1px solid #ffffff22;border-radius:12px;padding:5px 8px;margin:5px 0;font:700 12.5px/1.25 var(--body)}",
    ".howc li .ill{flex:none;width:58px;height:46px;display:flex;align-items:center;justify-content:center;gap:2px}.howc li .n{flex:none;width:20px;height:20px;border-radius:50%;background:#F2C14E;color:#1E1B3A;font:900 12px/20px var(--body);text-align:center}",
    ".howc .mini{position:relative;width:38px;height:38px;border-radius:50%;background:conic-gradient(var(--c) calc(var(--p)*1turn),#ffffff22 0)}.howc .mini span{position:absolute;inset:4px;border-radius:50%;background:radial-gradient(#c98a1e,#7a4a0c);display:grid;place-items:center}.howc .mini img{width:24px;height:24px;object-fit:contain}",
    ".howc .mini.iron,.howc .mini.iron span{border-radius:9px}.howc .mini.iron span{background:#2a2a33}.howc .mini.skil span{background:radial-gradient(#444,#111)}",
    ".howc .leg{margin:10px 0 4px;height:14px;border-radius:8px;background:linear-gradient(90deg,#9aa0a8 0 22%,#f3d58a 22% 36%,#f2b84a 36% 46%,#3fbf6f 46% 60%,#b5651d 60% 80%,#3a2a20 80%)}",
    ".howc .legl{display:flex;justify-content:space-between;font:800 10px var(--body);color:#E8DCF5}",
    ".howc .warn{margin:10px 0 0;font:800 13px var(--body);color:#FFD23F;text-align:center}",
    ".howc .ok{display:block;width:100%;margin-top:8px;position:sticky;bottom:0;border:0;border-radius:16px;padding:15px;font:900 18px var(--body);color:#1E1B3A;background:linear-gradient(180deg,var(--gold2),var(--gold));box-shadow:0 5px 0 #a27512;cursor:pointer}",
    "#walk.wfs{display:inline-flex;gap:1px;align-items:center;vertical-align:-3px}#walk .wf{display:block;width:12.5px;height:12.5px}#walk .wf svg{display:block;width:100%;height:100%}",
    "#walk .wf:not(.mad){opacity:.55}#walk .wf.flip{animation:wfPop .5s cubic-bezier(.34,1.6,.64,1)}@keyframes wfPop{0%{transform:scale(.4) rotate(0)}35%{transform:scale(1.35) rotate(-14deg)}55%{transform:scale(1.1) rotate(12deg)}75%{transform:rotate(-6deg)}100%{transform:none}}",
    "#walk .wf.mad .pf{animation:wfPuff 1.4s ease-out infinite}@keyframes wfPuff{0%{transform:translateY(1px);opacity:0}30%{opacity:.95}100%{transform:translateY(-2px);opacity:0}}",
    "#walk .wf.warn{opacity:1;animation:wfWarn .8s ease-in-out infinite}@keyframes wfWarn{50%{transform:scale(1.25)}}",
    "@media (prefers-reduced-motion:reduce){#walk .wf{animation:none!important}#walk .wf.mad .pf{animation:none}}",
    ".pcard{position:absolute;inset:0;z-index:40;display:none;align-items:center;justify-content:center;background:#0b1020cc;padding:16px}.pcard.on{display:flex}",
    ".pcard .c{width:100%;max-width:300px;background:#0f1a3d;border:4px solid #1d4ed8;border-radius:16px;padding:12px;color:#fff;text-align:center;box-shadow:0 18px 40px #000a}",
    ".pcard img{width:100%;border-radius:8px;display:block}.pcard h4{margin:8px 0 2px;font:900 20px var(--body);color:#FFD23F}.pcard p{margin:0 0 10px;font:700 13px var(--body);color:#dbe6ff}",
    ".pcard a,.pcard button{display:block;width:100%;margin-top:6px;border:0;border-radius:12px;padding:12px;font:900 15px var(--body);text-decoration:none;cursor:pointer}",
    ".pcard .pf{margin:-4px 0 8px;font:900 12.5px/1.3 var(--body);color:#7dffb5}",
    ".pcard a{background:#e3262f;color:#fff}.pcard button{background:#fff;color:#0f1a3d}",
    ".brk{display:grid;grid-template-columns:1fr auto;gap:2px 12px;max-width:290px;margin:8px auto 4px;font:700 13.5px var(--body);color:#E8DCF5;text-align:left}.brk b{color:#F2C14E;text-align:right}.brk .neg{color:#ff8a7a}",
    "html.th-halloween .mark{box-shadow:0 0 0 6px var(--cream),0 0 0 7px #e0782a,0 18px 40px #6a2c9a33}html.th-christmas .mark{box-shadow:0 0 0 6px var(--cream),0 0 0 7px #2f8f4e,0 18px 40px #b8322a33}",
    ".thb{display:inline-block;margin:8px 0 0!important;font:800 13px var(--body);color:#2A1E36!important;background:#fff;border:1px dashed var(--gold);border-radius:999px;padding:5px 12px}",
    "@media (prefers-reduced-motion:reduce){.fxl,.lights{display:none}.srv .sv,.jfl .jw,.tb .gq .im,.dance .jw,.ps .stm,.din.aim .tb.wait{animation:none!important}.din .door2 .gls{transition:none}}"
  ].join("");
  var stEl = D.createElement("style"); stEl.textContent = css; D.head.appendChild(stEl);

  /* ================= SCENE ================= */
  // the geometric mural (inline SVG, drawn once): squares with half-circles in mustard / slate / navy / gold foil
  function muralSVG() {
    var C = { m: "#e3b23c", s: "#6c706b", n: "#3e5a8f", g: "url(#gf)" }, bg = ["#f3efe6", "#d6d8d6", "#e9e5dc"], sq = 32, cols = 12, rows = 2, h = "";
    var pat = "gsnmgsnmmgsngnsmgmsnmgns";   // fixed, so the wall looks the same every visit
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      var x = c * sq, y = r * sq, k = pat[(r * cols + c) % pat.length], up = (r + c) % 2 === 0;
      h += '<rect x="' + x + '" y="' + y + '" width="' + sq + '" height="' + sq + '" fill="' + bg[(r * 5 + c) % 3] + '"/>';
      h += up ? '<path d="M' + x + ' ' + y + ' h' + sq + ' v' + (sq * 0.35) + ' a' + sq / 2 + ' ' + sq * 0.65 + ' 0 0 1 -' + sq + ' 0z" fill="' + C[k] + '"/>'
        : '<path d="M' + x + ' ' + (y + sq) + ' h' + sq + ' v-' + (sq * 0.35) + ' a' + sq / 2 + ' ' + sq * 0.65 + ' 0 0 0 -' + sq + ' 0z" fill="' + C[k] + '"/>';
    }
    var streaks = ""; for (var i = 0; i < 16; i++) streaks += '<rect x="' + (i * 2.5) + '" y="0" width="' + (0.6 + (i * 7) % 3 * 0.5) + '" height="40" fill="' + (i % 3 ? "#f1d98f" : "#9c7a33") + '" opacity="' + (0.35 + (i * 13) % 5 * 0.1) + '"/>';
    return '<svg class="mural" viewBox="0 0 384 64" preserveAspectRatio="xMinYMid slice" aria-hidden="true"><defs><pattern id="gf" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="#c9a44c"/>' + streaks + '</pattern></defs>' + h + '</svg>';
  }
  var TABLES = [
    { id: 1, cap: 2, x: 0.29, y: 0.68, row: 1 }, { id: 2, cap: 4, x: 0.5, y: 0.68, row: 1 }, { id: 3, cap: 2, x: 0.74, y: 0.68, row: 1 },
    { id: 4, cap: 4, x: 0.385, y: 0.985, row: 2 }, { id: 5, cap: 2, x: 0.7, y: 0.985, row: 2 }
  ];
  var ou = $("ou"); ou.className = "ou2" + (TH_ID ? " th-" + TH_ID : "");
  var REVIEW = W.REVIEW_EGG || {}, RVURL = (W.ReviewEgg && W.ReviewEgg.url) || (REVIEW.vid ? "https://www.youtube.com/watch?v=" + REVIEW.vid : "https://www.youtube.com/@therealantidote");
  ou.innerHTML = '<div class="din" id="din"><div class="floor"></div><div class="wallb"></div>' + muralSVG() + '<div class="wl"></div><div class="ceil"></div><div class="soffit"></div>' +
    [0.12, 0.34, 0.56, 0.78].map(function (x) { return '<i class="can" style="left:' + x * 100 + '%"></i>'; }).join("") +
    '<div class="banq"></div>' +
    '<div class="bar"><span class="sh" style="top:8px"></span><span class="gl"></span><span class="sh" style="top:56px"></span><span class="dome"><i></i></span><span class="cnt"></span></div>' +
    '<div class="door2" id="door"><span class="gls"><b>GRITZ N<br>WAFFLEZ</b><i></i></span></div><div class="spill"></div>' +
    '<div class="host" aria-hidden="true"><b>PLEASE WAIT<br>TO BE SEATED</b></div>' +
    '<div class="wm">Gritz <i>N</i> Wafflez</div>' +
    '<div class="mb"><b>TODAY</b>Peach Cobbler Waffle<br>🎤 GNW Karaoke Wed 6–10</div>' +
    '<button type="button" class="poster" id="poster" aria-label="Antidote\'s food review: watch on YouTube"><span class="fr"><span class="mt"><img src="img/review/poster.webp" alt="Antidote eating at Gritz N Wafflez"><i class="pl"></i><span class="cap"><span>@therealantidote <em>· my review</em></span></span></span></span><i class="gl"></i></button>' +
    (TH.fx ? '<div class="fxl ' + TH.kind + '">' + TH.fx.concat(TH.fx).map(function (f, i) {
      var s = TH.kind === "float" ? "top:" + (8 + (i * 23) % 70) + "%;left:-20px;animation-duration:" + (14 + (i * 5) % 9) + "s;animation-delay:-" + (i * 2.7) + "s;font-size:" + (12 + (i * 3) % 7) + "px"
        : TH.kind === "burst" ? "top:" + (6 + (i * 29) % 40) + "%;left:" + (8 + (i * 37) % 84) + "%;animation-duration:2.4s;animation-delay:-" + (i * 0.6) + "s;font-size:20px"
          : "left:" + ((i * 41) % 100) + "%;top:-20px;animation-duration:" + (7 + (i * 3) % 6) + "s;animation-delay:-" + (i * 1.3) + "s;font-size:" + (9 + (i * 3) % 7) + "px";
      return '<i style="' + s + '">' + f + "</i>"; }).join("") + "</div>" : "") +
    (TH.lights ? '<div class="lights"></div>' : "") + (TH.decor ? '<div class="decor">' + TH.decor.join("") + "</div>" : "") +
    TABLES.map(function (t) { return '<div class="tb c' + t.cap + ' r' + t.row + '" id="tb' + t.id + '" data-tb="' + t.id + '" style="left:' + t.x * 100 + '%;top:' + t.y * 100 + '%;--w:' + (t.cap === 4 ? 112 : 60) + 'px" role="button" aria-label="Table ' + t.id + '"><i class="cs"></i><div class="gs"></div><div class="tt"></div><div class="pb"><i></i></div><div class="dirt">🍽️</div><span class="tn">' + t.id + '</span><div class="flash"></div></div>'; }).join("") +
    '<div class="jfl" id="jfl"></div><div class="vig"></div><div class="lvb" id="lvb"><h3></h3><p></p></div><div class="cut" id="cut"></div><div class="shortp" id="shortp">🔥 Kitchen\'s short-staffed</div></div>' + '<div class="howc" id="howc" role="dialog" aria-label="How to cook"></div>' +
    '<div class="pass" id="pass"><span class="lbl">PASS</span></div>' +
    '<div class="rail" id="rail"></div>' +
    '<div class="line"><div class="bld"><div class="plt" id="plate" title="Tap an item on the plate to take it off"><div class="st" id="stack"></div><div class="cupz" id="cupz"></div><div class="dn" id="dn"></div></div>' +
    '<div class="nm" id="pname"></div><div class="acts"><button type="button" class="sv2" id="serve">🛎️ Serve</button><div class="ud"><button type="button" id="undo">↩️ Undo</button><button type="button" id="trash">🗑️ Clear</button></div></div></div>' +
    '<div class="stn" id="stn"></div><div class="grid" id="grid"></div><div class="kmsg fl2" id="oflash" role="status" aria-live="polite"></div><div class="kmsg js" id="jsay" aria-live="polite"></div></div>' +
    '<div class="pcard" id="pcard" role="dialog" aria-label="Antidote\'s review"><div class="c"><img src="img/review/poster.webp" style="aspect-ratio:2/3;object-fit:contain;max-height:46vh;width:auto;margin:0 auto;display:block" alt="Antidote\'s Gritz N Wafflez review"><h4>@therealantidote</h4><p>My Gritz N Wafflez food review</p><p id="pfound" class="pf" hidden></p><a href="' + esc(RVURL) + '" target="_blank" rel="noopener">▶ Watch on YouTube</a><button type="button" id="pback">Back to the game</button></div></div>' +
    '<div class="startov2" id="startov"><b>Order Up!</b><span>Tap to open the kitchen</span><small>Build it · serve it hot · deliver it fast</small></div>';
  if (TH.banner) { var wo = D.querySelector(".hero .wo"); if (wo) { var bn = D.createElement("p"); bn.className = "thb"; bn.textContent = TH.banner; wo.parentNode.insertBefore(bn, wo.nextSibling); } D.documentElement.classList.add("th-" + TH_ID); }
  var din = $("din");
  // pre-rendered textures, drawn ONCE at load (no per-frame cost): marble veins for the table tops, polished-concrete speckle for the floor
  (function textures() {
    try {
      var mk = function (w, h, draw) { var c = D.createElement("canvas"); c.width = w; c.height = h; var x = c.getContext("2d"); if (!x) return ""; draw(x, w, h); return "url(" + c.toDataURL("image/png") + ")"; };
      var seed = 7, R = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };   // fixed: same marble every visit
      var m = mk(128, 32, function (x, w, h) {
        x.lineCap = "round";
        for (var i = 0; i < 7; i++) {
          var y0 = R() * h, y1 = R() * h; x.strokeStyle = "rgba(120,118,112," + (0.10 + R() * 0.16) + ")"; x.lineWidth = 0.4 + R() * 0.9;
          x.beginPath(); x.moveTo(-4, y0); x.bezierCurveTo(w * 0.3, y0 + (R() - 0.5) * 30, w * 0.65, y1 + (R() - 0.5) * 30, w + 4, y1); x.stroke();
        }
        for (var j = 0; j < 90; j++) { x.fillStyle = "rgba(160,150,140," + R() * 0.12 + ")"; x.fillRect(R() * w, R() * h, 1, 1); }
      });
      var f = mk(96, 96, function (x, w, h) {
        for (var i = 0; i < 900; i++) { var v = R() < 0.5 ? 255 : 0; x.fillStyle = "rgba(" + v + "," + v + "," + v + "," + (R() * 0.06) + ")"; x.fillRect(R() * w, R() * h, 1 + (R() < 0.2 ? 1 : 0), 1); }
      });
      if (m) ou.style.setProperty("--mtex", m); if (f) ou.style.setProperty("--ftex", f);
    } catch (e) {}
  })();
  function dsz() { return { w: din.clientWidth || 322, h: din.clientHeight || 196 }; }

  /* ================= STATE ================= */
  var og = { running: false, sim: false, tables: [], level: 1, bk: {}, pass: [], plate: [], trips: [], timers: [], now: 0 };
  function newBk() { return { speed: 0, heat: 0, quality: 0, orders: 0, accuracy: 0, money: 0, tips: 0, streak: 0, group: 0, level: 0, bonus: 0, penalty: 0 }; }
  function addPts(cat, n) { if (og.demo) return; og.bk[cat] = (og.bk[cat] || 0) + n; og.score = Math.max(0, og.score + n); }
  function later(ms, fn) { og.timers.push({ at: og.now + ms, fn: fn }); }
  function resetLevelState() {
    og.pace = lvParams(og.level);
    var prev = og.level > 1 ? unlocked(og.level - 1) : [];
    og.fresh = unlocked(og.level).filter(function (k) { return prev.indexOf(k) < 0 && og.level > 1; });   // NEW badges
    og.pass = []; og.sel = -1; og.plate = []; og.clean = true; og.pq = {}; initStations();
    og.tables = TABLES.map(function (t) { return { def: t, id: t.id, cap: t.cap, state: "free", guests: [] }; });
    og.trips.forEach(function (tr) { if (tr.el !== J.el) tr.el.remove(); }); og.trips = []; [].forEach.call(din.querySelectorAll(".srv"), function (e) { e.remove(); });   // a restart mid-trip left servers behind
    og.lt = LEVEL_MS; og.walk = 0; og.nextArr = 1500; og.timers = []; og.popAt = -99999; og.warned = {}; wkClear();
    TABLES.forEach(function (t) { var el = $("tb" + t.id); el.className = "tb c" + t.cap + " r" + t.row; el.querySelector(".gs").innerHTML = ""; el.querySelector(".tt").innerHTML = ""; });
    jReset(); buildGrid(); drawPass(); drawPlate(); drawRail(); hud();
  }
  function start() {
    var demo = !!og.demoNext;
    og = { running: true, sim: og.sim, demo: demo, level: demo ? 2 : 1, score: 0, usd: 0, now: 0, streak: 0, best: 0, served: 0, tipsUsd: 0, perfect: 0, hotDeliv: 0, walkTotal: 0, trips: [], timers: [], tables: [], pass: [], plate: [], bk: newBk(), tvT: 0 };
    resetLevelState();
    $("startov").classList.add("off"); $("over").classList.remove("on"); closePoster(true);
    if (!demo) { if (W.ReviewEgg) W.ReviewEgg.reset(20, 40); if (W.Halftime) W.Halftime.reset(); flash("Level 1 · 90 seconds", "#F2C14E"); startMusic(); }
    hud();
  }

  /* ================= FOOD GRID + PLATE (stage 1) ================= */
  function tileHTML(k) {
    var it = ITEMS[k], nw = (og.fresh || []).indexOf(k) >= 0, ck = cookAt(k);
    return '<button type="button" data-k="' + k + '"' + (it.prep ? ' class="pv" title="' + esc(it.prep) + '"' : "") + '><img src="' + it.img + '" alt=""' + (it.fx === "crisp" ? ' class="crisp"' : "") + ">" + '<span class="l">' + esc(T(it.n)) + "</span>" + (nw ? '<i class="nw">NEW</i>' : "") + (ck ? '<i class="ck">' + STN[ck].ic + "</i>" : "") + "</button>";
  }
  function buildGrid() {
    var ks = unlocked(og.level || 1), R = {}; ROWS.forEach(function (r) { R[r[0]] = r; });
    // up to L3 one row per group; from L4 (more items + the stations) groups share 3 sideways-scrolling rows
    var layout = (og.level || 1) >= 4 ? [["base", "protein"], ["side"], ["top", "drink"]] : ROWS.map(function (r) { return [r[0]]; });
    $("grid").innerHTML = layout.map(function (groups) {
      var cells = "", label = [];
      groups.forEach(function (gk, gi) { var row = ks.filter(function (k) { return ITEMS[k].row === gk; }); if (!row.length) return; label.push(R[gk]);
        if (gi && cells) cells += '<i class="gsep" aria-hidden="true">' + R[gk][2] + "</i>"; cells += row.map(tileHTML).join(""); });
      return cells ? '<div class="grow"><span title="' + esc(label.map(function (r) { return T(r[1]); }).join(" · ")) + '" aria-label="' + esc(label.map(function (r) { return T(r[1]); }).join(" · ")) + '">' + label[0][2] + '</span><div class="cells">' + cells + "</div></div>" : "";
    }).join("");
    drawPlate();
  }
  function tap(k) {
    if (!og.running || og.pause || og.hold || !ITEMS[k]) return false;
    tutDone();
    var i = og.plate.indexOf(k);
    if (i >= 0) { og.plate.splice(i, 1); delete og.pq[k]; og.clean = false; drawPlate(); buzz(8); return true; }   // tap again = take it off
    if (cookAt(k)) return drop(k);   // L4+: this one has to be cooked first
    if (og.plate.length >= 6) { flash("Plate's full!"); return false; }
    og.plate.push(k); sfx("pop"); buzz(10);
    var nb = $("grid").querySelector('[data-k="' + k + '"] .nw'); if (nb) { nb.remove(); og.fresh = og.fresh.filter(function (x) { return x !== k; }); }
    drawPlate(k); return true;
  }
  function undo() { if (!og.running || !og.plate.length) return; var k = og.plate.pop(); delete og.pq[k]; og.clean = false; drawPlate(); buzz(8); }
  function clearPlate() { if (!og.running) return; if (og.plate.length) og.clean = false; og.plate = []; og.pq = {}; drawPlate(); }
  function drawPlate(newKey) {
    var st = $("stack"), cups = $("cupz"); st.innerHTML = ""; cups.innerHTML = "";
    var keys = og.plate, of = function (kind) { return keys.filter(function (k) { return ITEMS[k].kind === kind; }); }, bases = of("base"), prots = of("protein"), sides = of("side"), tops = of("top");
    var S = 190, BASE2 = [[12, 62, 96], [96, 40, 96]], PROT = bases.length ? [[70, 30, 90], [20, 62, 82], [60, 78, 78]] : [[46, 40, 100], [16, 72, 84], [84, 82, 80]], SIDE = [[118, 108, 70], [2, 108, 70], [64, 124, 64]];
    var TOP = { butter: [66, 62, 40], cheese: [52, 46, 80], syrup: [38, 40, 112], berriez: [60, 30, 70], peach: [40, 56, 74], whip: [78, 48, 52] };
    keys.forEach(function (k) {
      var it = ITEMS[k], im = D.createElement("img"); im.src = it.img; im.alt = ""; im.dataset.k = k; if (it.fx === "crisp") im.className = "crisp"; if (og.pq[k]) im.style.filter = dfil(og.pq[k].d);
      if (it.kind === "drink") { cups.appendChild(im); return; }
      var pos, z = 3;
      if (it.kind === "base") { pos = bases.length > 1 ? BASE2[Math.min(1, bases.indexOf(k))] : [30, 36, 130]; z = 1; }
      else if (it.kind === "protein") { pos = PROT[Math.min(2, prots.indexOf(k))]; z = 3 + prots.indexOf(k); }
      else if (it.kind === "side") { pos = SIDE[Math.min(2, sides.indexOf(k))]; z = 2; }
      else if (it.kind === "cup") { pos = k === "hot" ? [0, 26, 30] : [142, 30, 46]; z = 10; }
      else { pos = TOP[k] || [60, 60, 60]; z = k === "syrup" ? 9 : 6 + tops.indexOf(k); }
      im.style.left = pos[0] / S * 100 + "%"; im.style.top = pos[1] / S * 100 + "%"; im.style.width = pos[2] / S * 100 + "%"; im.style.zIndex = z;
      if (k === newKey && !RM) { im.style.transform = "translateY(-40px) scale(1.15)"; requestAnimationFrame(function () { requestAnimationFrame(function () { im.style.transform = ""; }); }); }
      st.appendChild(im);
    });
    $("dn").innerHTML = keys.filter(function (k) { return og.pq[k]; }).map(function (k) { return '<span style="background:' + dcol(og.pq[k].d) + '">' + esc(ITEMS[k].n) + " · " + dlab(og.pq[k].d) + "</span>"; }).join("");
    var m = matchOpen(keys);
    $("pname").innerHTML = keys.length ? (m ? "<b>" + esc(T(m.g.order.dish.n)) + "</b>for table " + m.tb.id + (og.clean ? " ✨" : "") : "<b>" + keys.length + " item" + (keys.length > 1 ? "s" : "") + "</b>keep building…") : "<b>Tap food to build</b>then 🛎️ Serve";
    D.querySelectorAll("#grid button").forEach(function (b) { b.classList.toggle("on", keys.indexOf(b.dataset.k) >= 0); });
  }

  /* ================= COOKING (L4+ adult: fryer; L5+ adult: + waffle irons + skillet; kid L5+: fryer only) ================= */
  var STN = { fry: { n: "Fryer", ic: "🍗", cls: "fry" }, iron: { n: "Waffle irons", ic: "🧇", cls: "iron" }, skil: { n: "Skillet", ic: "🍳", cls: "skil" } };
  var COOK = { chicken: ["fry", 8000], tenderz: ["fry", 6000], catfish: ["fry", 7000], shrimp: ["fry", 4500], waffle: ["iron", 6000],
    egg: ["skil", 3500], bacon: ["skil", 5000], shrimp_s: ["skil", 4000], egg_sun: ["skil", 3500], bacon_x: ["skil", 6500] };
  function stationsFor(L) { return MODE === "kid" ? (L >= 5 ? ["fry"] : []) : (L >= 5 ? ["fry", "iron", "skil"] : L >= 4 ? ["fry"] : []); }
  function cookAt(k) { var c = COOK[k]; return c && og.act && og.act.indexOf(c[0]) >= 0 ? c[0] : ""; }
  function initStations() {
    og.act = stationsFor(og.level); og.st = {};
    og.act.forEach(function (s) { og.st[s] = []; var n = s === "fry" ? (og.level >= 5 && MODE !== "kid" ? 3 : 2) : 2; for (var i = 0; i < n; i++) og.st[s].push(null); });
    var el = $("stn"); el.classList.toggle("on", og.act.length > 0);
    el.innerHTML = og.act.map(function (s) { return '<div class="sg" data-sg="' + s + '"><b>' + STN[s].ic + " " + T(STN[s].n) + "</b>" + og.st[s].map(function (x, i) { return '<button type="button" class="sl ' + STN[s].cls + '" data-st="' + s + '" data-i="' + i + '" aria-label="' + STN[s].n + " " + (i + 1) + '"><span class="in"></span></button>'; }).join("") + "</div>"; }).join("");
    var sh = $("short"); if (sh) sh.hidden = !og.act.length || og.demo; var sp = $("shortp"); if (sp) sp.style.display = og.act.length && !og.demo ? "block" : "none";
    drawStations(true);
  }
  function dcol(d) { return d < 0.7 ? "#9aa0a8" : d < 0.88 ? "#f3d58a" : d < 0.96 ? "#f2b84a" : d <= 1.12 ? "#3fbf6f" : d < 1.45 ? "#b5651d" : "#3a2a20"; }
  function dlab(d) { return d < 0.7 ? "raw" : d < 0.88 ? "pale" : d < 0.96 ? "golden" : d <= 1.12 ? "perfect ✨" : d < 1.45 ? "brown" : "burnt"; }
  function dfil(d) {
    if (d < 0.7) return "saturate(.35) brightness(1.3)";
    if (d < 0.96) { var f = (d - 0.7) / 0.26; return "saturate(" + (0.5 + 0.5 * f).toFixed(2) + ") brightness(" + (1.25 - 0.25 * f).toFixed(2) + ")"; }
    if (d <= 1.12) return "none";
    return "brightness(" + Math.max(0.3, 1 - (d - 1.12) * 0.85).toFixed(2) + ") sepia(" + Math.min(0.7, (d - 1.12) * 0.9).toFixed(2) + ")";
  }
  function quality(d) { return clamp(1 - Math.pow(Math.abs(d - 1.04) / 0.55, 1.6), 0, 1); }
  function drop(k) {
    var s = cookAt(k), i = og.st[s].indexOf(null);
    if (i < 0) { flash(STN[s].n + " is full!"); return false; }
    og.st[s][i] = { k: k, el: 0, T: COOK[k][1] * (og.pace.cook || 1) }; sfx(s === "iron" ? "pour" : "drop"); if (s === "fry") setTimeout(function () { sfx("sizzle"); }, 120);
    drawStations(); return true;
  }
  function pull(s, i) {
    if (!og.running || og.pause || og.hold) return false;
    tutDone();
    var c = og.st[s] && og.st[s][i]; if (!c) return false;
    var d = c.el / c.T, el = $("stn").querySelector('[data-st="' + s + '"][data-i="' + i + '"]');
    if (d < 0.7) { og.st[s][i] = null; addPts("penalty", -30); popAt(el, "Undercooked! −30", "#ff8a7a"); flash("❌ Too early: undercooked", "#ff8a7a"); sfx("bad"); drawStations(true); hud(); return "raw"; }
    if (og.plate.indexOf(c.k) >= 0) { flash("The plate already has " + ITEMS[c.k].n.toLowerCase() + ": serve it first"); return false; }
    if (og.plate.length >= 6) { flash("Plate's full!"); return false; }
    og.st[s][i] = null; og.plate.push(c.k); og.pq[c.k] = { d: d, q: quality(d), perfect: d >= 0.96 && d <= 1.12 };
    popAt(el, og.pq[c.k].perfect ? "Perfect ✨" : dlab(d), og.pq[c.k].perfect ? "#7dffb5" : d > 1.12 ? "#ffb27a" : "#fff");
    sfx(og.pq[c.k].perfect ? "ding" : "pop"); drawStations(true); drawPlate(c.k); return og.pq[c.k];
  }
  function cookStep(dt) {
    if (!og.act || !og.act.length) return;
    og.act.forEach(function (s) { og.st[s].forEach(function (c, i) { if (!c) return; var d0 = c.el / c.T; c.el += dt; var d = c.el / c.T;
      if (s === "iron" && d0 < 0.96 && d >= 0.96) sfx("beep");
      if (d >= 2) { og.st[s][i] = null; addPts("penalty", -15); popAt($("stn").querySelector('[data-st="' + s + '"][data-i="' + i + '"]'), "Charred! −15", "#ff8a7a"); sfx("smoke"); drawStations(true); } }); });
  }
  function drawStations(all) {
    if (!og.act || !og.act.length || og.sim) return;
    og.act.forEach(function (s) {
      og.st[s].forEach(function (c, i) {
        var b = $("stn").querySelector('[data-st="' + s + '"][data-i="' + i + '"]'); if (!b) return; var inn = b.firstChild, d = c ? c.el / c.T : 0;
        b.style.setProperty("--p", c ? Math.min(1, d / 1.6).toFixed(3) : 0); b.style.setProperty("--c", c ? dcol(d) : "#999"); b.classList.toggle("on", !!c);
        var sig = c ? c.k + ":" + dlab(d) : "";
        if (all || b.dataset.sig !== sig) {
          b.dataset.sig = sig;
          if (!c) inn.innerHTML = '<span style="font:800 8px var(--body);color:#ffffff88">' + (s === "iron" ? "pour" : "empty") + "</span>";
          else if (s === "iron") inn.innerHTML = '<img src="' + ITEMS.waffle.img + '" alt="" style="filter:' + dfil(d) + ";opacity:" + (d < 0.96 ? 0.35 : 1) + '"><span class="lt' + (d >= 0.96 && d < 1.45 ? " g" : "") + '"></span><span class="stm"></span><span class="lb">' + (d < 0.96 ? "cooking" : dlab(d)) + "</span>";
          else inn.innerHTML = '<img src="' + ITEMS[c.k].img + '" alt="" style="filter:' + dfil(d) + '">' + (d >= 2 ? '<span class="smk"></span>' : '<span class="stm"></span>') + '<span class="lb">' + dlab(d) + "</span>";
        } else if (c) { var im = inn.querySelector("img"); if (im && s !== "iron") im.style.filter = dfil(d); }
      });
    });
  }
  // one-tap tutorial highlight the first time a station shows up (fryer at L4; irons + skillet at L5)
  function tutStart() {
    if (og.sim || og.demo || !og.act || !og.act.length) return;
    var key = "gnw-tut-" + (og.act.length > 1 ? "full" : "fry"); try { if (localStorage.getItem(key)) return; localStorage.setItem(key, "1"); } catch (e) {}
    var sgs = $("stn").querySelectorAll(og.act.length > 1 ? '.sg[data-sg="iron"],.sg[data-sg="skil"]' : '.sg[data-sg="fry"]');
    sgs.forEach(function (x) { x.classList.add("tut"); }); og.tut = true;
    flash(og.act.length > 1 ? "🧇 Tap Waffle to pour · 🍳 eggs & bacon on the skillet · pull on ✨ green" : "🍗 Tap Catfish / Wingz / Tenderz to drop them in the fryer · pull on ✨ green", "#FFD23F");
  }
  function tutDone() { if (!og.tut) return; og.tut = false; $("stn").querySelectorAll(".tut").forEach(function (x) { x.classList.remove("tut"); }); }
  // "How to cook 🍳": required before the first fryer level (adult L4 / kid L5) and before adult L5 (irons + skillet).
  // Shown every run (quick to tap through); re-openable from How to play. The game waits until 👍.
  function howCook(kind, done) {
    var c = $("howc"), mini = function (cls, img, col, pr) { return '<span class="mini ' + cls + '" style="--c:' + col + ';--p:' + pr + '"><span><img src="' + img + '" alt=""></span></span>'; };
    var fish = ITEMS.catfish.img, waf = ITEMS.waffle.img, egg = ITEMS.egg.img, bac = ITEMS.bacon.img;
    var steps = kind === "full" ? [
      [mini("iron", waf, "#9aa0a8", 0.3), "Tap <b>Waffle</b>: batter pours into a waffle iron."],
      [mini("iron", waf, "#3fbf6f", 0.7) + '<span style="width:9px;height:9px;border-radius:50%;background:#3fe07a;box-shadow:0 0 8px #3fe07a"></span>', "Tap the iron to <b>open it when the light turns 🟢</b>."],
      [mini("skil", egg, "#f2b84a", 0.55) + mini("skil", bac, "#3fbf6f", 0.7), "<b>Eggs, bacon & sautéed shrimp</b> go on the skillet: tap the item, then tap the pan on ✨ perfect."],
      ['<span style="font-size:28px">🍽️🛎️</span>', "Everything you pull lands on the plate. Add the rest from the grid, then <b>Serve</b> as usual."]]
      : [
      [mini("", fish, "#9aa0a8", 0.15), "Tap <b>Catfish, Wingz, Tenderz or Shrimp</b> on the grid: it drops into a fryer basket."],
      [mini("", fish, "#f2b84a", 0.5) + mini("", fish, "#3fbf6f", 0.68), "Watch the color & ring: <b>raw → golden → ✨ perfect (green) → burnt</b>."],
      [mini("", fish, "#3fbf6f", 0.68) + '<span style="font-size:20px">👆</span>', "Tap the basket on <b>✨ perfect</b> to pull it: it goes <b>straight onto your plate</b>."],
      ['<span style="font-size:28px">🍽️🛎️</span>', "Add the rest from the grid, then <b>Serve</b> and deliver as usual."]];
    c.innerHTML = '<h3>' + (kind === "full" ? "How to cook 🍳 · irons & skillet" : "How to cook 🍳 · the fryer") + '</h3><p class="sub">' + (kind === "full" ? "Level 5: the whole kitchen." : "A cook left: you're on the fryer now.") + "</p><ol>" +
      steps.map(function (st, i) { return '<li><span class="n">' + (i + 1) + '</span><span class="ill">' + st[0] + "</span><span>" + st[1] + "</span></li>"; }).join("") + "</ol>" +
      '<div class="leg"></div><div class="legl"><span>raw</span><span>pale</span><span>golden</span><span>✨ perfect</span><span>brown</span><span>burnt</span></div>' +
      '<p class="warn">Pull too early = undercooked, too late = burnt — both cost you.</p><button type="button" class="ok" id="howok">👍 Okay, I understand</button>';
    c.classList.add("on"); if (og.running) og.hold = true; c.scrollTop = 0;
    $("howok").onclick = function () { c.classList.remove("on"); c.innerHTML = ""; og.hold = false; last = 0; if (done) done(); };
    try { $("howok").focus({ preventScroll: true }); } catch (e) {}
  }
  // the story beat before the first cooking level
  function cookLeft(done) {
    var c = $("cut"), s = dsz();
    c.innerHTML = '<span class="jj">' + jurniHTML("impatient") + '</span><div class="bb">One of the cooks just clocked out and left! 😩 You gotta help in the back!</div>' +
      '<div class="ck2" style="transform:translate(' + (s.w * 0.55) + 'px,0)">' + serverSVG({ skin: "#a0673d", hair: "#1d120c", style: "short", shirt: "#f2f2f2" }) + '<span class="hatc"></span><i>👋</i></div>';
    c.classList.add("on"); sfx("boo");
    var ck = c.querySelector(".ck2");
    requestAnimationFrame(function () { requestAnimationFrame(function () { ck.style.transform = "translate(10px,0) scaleX(-1)"; }); });
    setTimeout(function () { doorOpen(900); }, 1700);
    setTimeout(function () { c.classList.remove("on"); c.innerHTML = ""; done(); }, 3400);
  }

  /* ================= DINING ROOM ================= */
  function seat(tb, party) {
    var L = og.level, p = lvParams(L);
    tb.state = "wait"; tb.seatedAt = og.now; tb.first = 0; tb.delivered = 0; tb.vip = party.vip; tb.kind = party.kind;
    tb.guests = party.ids.map(function (id) { var kid = has(id, "kid"), per = personality(id, party.vip); return { id: id, kid: kid, per: per, order: makeOrder(L, kid), done: false, arrived: false }; });
    var phones = 0; og.tables.forEach(function (t) { (t.guests || []).forEach(function (x) { if (x.phone && !x.done) phones++; }); });
    tb.guests.forEach(function (x) { if (phones < 2 && !x.kid && Math.random() < 0.3) { x.phone = 1; phones++; } });   // at most 2 phones in the room
    var hurry = tb.guests.some(function (g) { return g.per === "hurry"; }), elder = tb.guests.every(function (g) { return has(g.id, "elder"); });
    tb.patMax = (p.pat + p.extra * (tb.guests.length - 1)) * (hurry ? 0.85 : 1) * (elder ? 1.1 : 1) * 1000; tb.pat = tb.patMax;
    var el = $("tb" + tb.id), chairs = tb.def.row === 2;
    el.className = "tb c" + tb.cap + " r" + tb.def.row + " wait";
    el.querySelector(".gs").innerHTML = tb.guests.map(function (g, i) { return '<div class="gq" data-g="' + i + '">' + (chairs ? '<span class="ch"></span>' : "") + '<div class="im"><img class="p" src="' + GI + "guests/" + g.id + '.webp" alt=""></div><span class="md"></span><span class="ok">✓</span></div>'; }).join("");
    el.querySelector(".tt").innerHTML = "";
    if (!og.sim) requestAnimationFrame(function () { requestAnimationFrame(function () { el.querySelectorAll(".gq").forEach(function (q, i) { setTimeout(function () { q.classList.add("in"); }, i * 120); }); }); });
    else el.querySelectorAll(".gq").forEach(function (q) { q.classList.add("in"); });
    drawRail();
  }
  // Same cadence as before: a party is only seated when the arrival timer is due and a table fits (retry every 1.5 s).
  // On screen (not sim) they walk in through the door first, and when every table is taken they wait in line by the
  // host stand; the first party in line that fits takes the next free table. Patience starts when they SIT.
  function arrivals() {
    var free = og.tables.filter(function (t) { return t.state === "free"; }), p = lvParams(og.level);
    if (!free.length) { og.nextArr = 1500; if (!og.sim) joinLine(); return; }
    var bySize = function (n) { return free.filter(function (t) { return t.cap >= n; }).sort(function (a, b) { return a.cap - b.cap || Math.random() - 0.5; }); };
    if (!og.sim) for (var qi = 0; qi < (og.queue || []).length; qi++) {
      var q = og.queue[qi], qf = bySize(q.party.ids.length);
      if (qf.length) { og.queue.splice(qi, 1); walkIn(q.party, qf[0], q); layoutLine(); og.nextArr = (p.arrive + rnd(-1.5, 1.5)) * 1000; return; }
    }
    var maxCap = Math.max.apply(null, free.map(function (t) { return t.cap; })), party = makeParty(og.level, maxCap), n = party.ids.length;
    var fit = bySize(n);
    if (!fit.length) { og.nextArr = 1500; return; }
    if (og.sim) seat(fit[0], party); else walkIn(party, fit[0], null);
    og.nextArr = (p.arrive + rnd(-1.5, 1.5)) * 1000;
  }

  /* ================= GUESTS ON FOOT (visual only: pointer-events none, transform-only, never blocks a tap) ================= */
  var WK = [], QMAX = 3;
  function wkEl(id, cls) { var el = D.createElement("div"); el.className = "wk " + (cls || ""); el.innerHTML = '<img src="' + GI + "guests/" + id + '.webp" alt="">'; din.appendChild(el); return el; }
  function wkPlace(w) { var k = depth(w.y); w.el.style.transform = "translate(" + (w.x - 9.5).toFixed(1) + "px," + (w.y - 41).toFixed(1) + "px) scale(" + (w.face < 0 ? -k : k).toFixed(3) + "," + k.toFixed(3) + ")"; w.el.style.zIndex = zAt(w.y); }
  // walker: {x,y,pts:[{x,y}],v px/s,delay ms,cb}
  function walker(id, x, y, pts, o) {
    o = o || {}; var w = { id: id, el: wkEl(id, o.cls), x: x, y: y, pts: pts.slice(), v: o.v || 95, delay: o.delay || 0, cb: o.cb, face: 1, z: o.z };
    if (o.tag) w.el.insertAdjacentHTML("beforeend", '<span class="tg' + (o.mad ? " mad" : "") + '">' + esc(o.tag) + "</span>");
    if (o.togo) w.el.insertAdjacentHTML("beforeend", '<span class="tgo">🥡</span>');
    if (o.phone) w.el.insertAdjacentHTML("beforeend", '<span class="ph2">📱</span>');
    if (RM && pts.length) {   // reduced motion: a short fade at the destination instead of walking
      var e = pts[pts.length - 1]; w.x = e.x; w.y = e.y; w.pts = []; w.fade = 380 + w.delay; w.el.classList.add("fd", "hid");
      requestAnimationFrame(function () { requestAnimationFrame(function () { w.el.classList.remove("hid"); }); });
    } else if (pts.length) w.el.classList.add("mv");
    WK.push(w); wkPlace(w); return w;
  }
  function wkGone(w) { w.dead = true; if (w.el) w.el.remove(); }
  function wkMove(w, pts, o) {   // send an existing walker somewhere new
    o = o || {}; w.pts = pts; w.delay = o.delay || 0; if (o.v) w.v = o.v; w.cb = o.cb || null; w.el.classList.remove("q");
    if (RM) { var e = pts[pts.length - 1]; w.x = e.x; w.y = e.y; w.pts = []; w.fade = 300; wkPlace(w); } else w.el.classList.add("mv");
  }
  function wkStep(dt) {
    if (!WK.length) return;
    WK.slice().forEach(function (w) {
      if (w.dead) return;
      if (w.fade != null) { w.fade -= dt; if (w.fade <= 0) { w.fade = null; var c = w.cb; w.cb = null; if (c) c(w); } return; }
      if (!w.pts.length) return;
      if (w.delay > 0) { w.delay -= dt; return; }
      var t = w.pts[0], dx = t.x - w.x, dy = t.y - w.y, d = Math.sqrt(dx * dx + dy * dy), v = w.v * dt / 1000;
      if (Math.abs(dx) > 0.5) w.face = dx > 0 ? 1 : -1;
      if (d <= v) { w.x = t.x; w.y = t.y; w.pts.shift(); } else { w.x += dx / d * v; w.y += dy / d * v; }
      if (!w.pts.length) { w.el.classList.remove("mv"); var cb = w.cb; w.cb = null; if (cb) cb(w); }
      if (!w.dead) wkPlace(w);
    });
    WK = WK.filter(function (w) { return !w.dead; });
  }
  function wkClear() { WK.forEach(function (w) { if (w.el) w.el.remove(); }); WK = []; og.queue = []; (og.tables || []).forEach(function (t) { t.comingIds = null; }); }
  function doorPt() { return { x: 15, y: dsz().h - 5 }; }
  function aisleY() { return Math.round(dsz().h * 0.75); }
  function seatPt(tb, i, n) { var s = dsz(); return { x: tb.def.x * s.w + (i - (n - 1) / 2) * 24, y: tb.def.y * s.h - (tb.def.row === 2 ? 9 : 5) }; }
  function pathTo(tb, i, n, from) { return route(from || doorPt(), aislePt(seatPt(tb, i, n).x)); }   // door/line → around the furniture → the aisle by their seat, then they sit
  function walkTime(pts, x, y, v) { var t = 0; pts.forEach(function (q) { t += Math.sqrt((q.x - x) * (q.x - x) + (q.y - y) * (q.y - y)); x = q.x; y = q.y; }); return t / v * 1000; }
  // a party walks to its table (from the door, or from its spot in line), then sits: seat() starts the patience clock
  function walkIn(party, tb, q) {
    tb.state = "coming"; tb.comingIds = party.ids.slice();
    var n = party.ids.length, left = n, lvl = og.level, d = doorPt();
    if (!q) { doorOpen(1600); if (!J.task && J.mode === "door" && !J.inK) { J.face = 1; jPose("door", 1300, pick(["Welcome to Gritz! 💛", "Hey hey, come on in! 💛", "Welcome in! 💛"])); } }
    party.ids.forEach(function (id, i) {
      var qw = q && q.wk[i] && !q.wk[i].dead ? q.wk[i] : null, st = qw ? { x: qw.x, y: qw.y } : (q ? { x: lineSpot(0).x, y: lineSpot(0).y } : d);
      if (qw) wkGone(qw);
      walker(id, st.x, st.y, pathTo(tb, i, n, st), { delay: i * 300, cb: function (w) {
        wkGone(w); if (--left === 0 && og.level === lvl && tb.state === "coming") { tb.comingIds = null; tb.state = "free"; seat(tb, party); } } });
    });
    if (q) q.wk.forEach(function (w) { if (!w.dead) wkGone(w); });
  }
  function lineSpot(k) { var h = dsz().h; return { x: 63 - (k % 2) * 12, y: h - 3 - k * 15 }; }
  function joinLine() {   // every table is taken: a new party lines up by the host stand (max 3 parties, one per arrival interval)
    og.queue = og.queue || []; if (og.queue.length >= QMAX || og.now < (og.qNextAt || 0) || og.lt <= 6000) return;
    var p = lvParams(og.level), party = makeParty(og.level, 4); if (!party.ids.length) return;
    og.qNextAt = og.now + p.arrive * 1000;
    var q = { party: party, wk: [], until: og.now + (MODE === "kid" ? 40000 : 30000) }, sp = lineSpot(og.queue.length), d = doorPt();
    og.queue.push(q); doorOpen(1400);
    party.ids.slice(0, 2).forEach(function (id, j) {
      q.wk.push(walker(id, d.x, d.y, route(d, { x: sp.x + j * 7, y: sp.y - j * 2 }), { delay: j * 250, tag: j === 0 ? "⏳ " + party.ids.length : "", phone: j === 1 || Math.random() < 0.5, z: 4,
        cb: function (w) { w.el.classList.add("q"); } }));
    });
  }
  function layoutLine() {   // everyone in line shuffles up a spot (a poster-watcher comes back to the new spot when done)
    (og.queue || []).forEach(function (q, k) { var sp = lineSpot(k); q.wk.forEach(function (w, j) { if (w.dead || w.watching) return; wkMove(w, route(w, { x: sp.x + j * 7, y: sp.y - j * 2 }), { cb: function (x) { x.el.classList.add("q"); } }); }); });
  }
  // Every 15–25 s while people wait, ONE guest in line steps out, walks the floor to the aisle end right under Antidote's
  // poster, points up + laughs 😂, claps 👏, then walks back to their spot. They keep their place in the queue; if their table
  // frees up meanwhile, walkIn() starts them from wherever they are. Reduced motion: just a 👏 bubble in place.
  function posterSpot() { var N = navNodes(); return { x: N.LA.x + 20, y: NAV_AY }; }   // right under the poster, clear of the line spots
  function rxSet(w, emo, hand) { if (!w || w.dead) return; var o = w.el.querySelector(".rx"), h = w.el.querySelector(".pu"); if (o) o.remove(); if (h) h.remove(); if (emo) w.el.insertAdjacentHTML("beforeend", '<span class="rx">' + emo + "</span>"); if (hand) w.el.insertAdjacentHTML("beforeend", '<span class="pu">👆</span>'); }
  function posterWatch() {
    var cand = []; (og.queue || []).forEach(function (q) { q.wk.forEach(function (w) { if (!w.dead && !w.pts.length && w.fade == null) cand.push({ q: q, w: w }); }); });
    if (!cand.length) return false;
    var c = pick(cand), w = c.w, q = c.q; og.pw = w; w.watching = true;
    var back = function () {
      rxSet(w, "", false); w.el.classList.remove("clap"); if (w.dead) { og.pw = null; return; }
      var k = og.queue.indexOf(q), j = q.wk.indexOf(w); if (k < 0 || j < 0) { w.watching = false; og.pw = null; return; }
      var sp = lineSpot(k); wkMove(w, route(w, { x: sp.x + j * 7, y: sp.y - j * 2 }), { cb: function (x) { x.watching = false; x.el.classList.add("q"); og.pw = null; } });
    };
    if (RM) { rxSet(w, "👏", false); later(1600, function () { rxSet(w, "", false); w.watching = false; og.pw = null; }); return true; }
    wkMove(w, route(w, posterSpot()), { cb: function () {
      if (w.dead) { og.pw = null; return; } w.face = -1; wkPlace(w); rxSet(w, "😂", true);
      later(1500, function () { if (w.dead || !w.watching) { og.pw = null; return; } rxSet(w, "👏", false); w.el.classList.add("clap"); });
      later(2900, function () { if (w.dead || !w.watching) { og.pw = null; return; } back(); });
    } });
    return true;
  }
  function lineStep() {   // a party that waits too long gives up and leaves (flavor only: NOT a walk-out, no penalty, no pacing change)
    if (!og.queue || !og.queue.length) { og.pwNext = 0; return; }
    if (!og.pwNext) og.pwNext = og.now + 15000 + Math.random() * 10000;
    if ((!og.pw || og.pw.dead) && og.now >= og.pwNext) { og.pw = null; if (posterWatch()) og.pwNext = og.now + 15000 + Math.random() * 10000; else og.pwNext = og.now + 2000; }
    var gone = [];
    og.queue.forEach(function (q) {
      var left = q.until - og.now, tg = q.wk[0] && q.wk[0].el.querySelector(".tg");
      if (tg && left < 9000 && !tg.classList.contains("mad")) { tg.classList.add("mad"); tg.textContent = "😤 " + q.party.ids.length; }
      if (left <= 0) gone.push(q);
    });
    gone.forEach(function (q) {
      og.queue.splice(og.queue.indexOf(q), 1); og.lost = (og.lost || 0) + 1;
      q.wk.forEach(function (w, j) { if (!w.dead) { if (w.watching) { w.watching = false; og.pw = null; rxSet(w, "", false); w.el.classList.remove("clap"); } wkMove(w, route(w, doorPt()), { v: 120, delay: j * 200, cb: wkGone }); } });
      doorOpen(1700);
    });
    if (gone.length) layoutLine();
  }
  // a finished party stands up and walks out the door (happy: 😋 + to-go boxes), or storms out (walk-out)
  function walkOut(tb, mad) {
    var el = $("tb" + tb.id), n = tb.guests.length, longest = 0;
    tb.guests.forEach(function (g, i) {
      var st = aislePt(seatPt(tb, i, n).x), pts = route(st, doorPt()), v = mad ? 125 : 90, delay = i * (mad ? 120 : 260);   // they stand up into the aisle
      longest = Math.max(longest, delay + walkTime(pts, st.x, st.y, v));
      walker(g.id, st.x, st.y, pts, { v: v, delay: delay, tag: i === 0 ? (mad ? "😤" : "😋") : "", mad: mad, togo: !mad && Math.random() < 0.45, cb: wkGone });
    });
    el.querySelector(".gs").innerHTML = "";
    if (RM) doorOpen(900); else later(Math.max(0, longest - 1100), function () { doorOpen(1500); });
  }
  function moodOf(tb, g) {
    if (g.photo && og.now < g.photo) return "📸";
    if (g.done) return g.arrived ? (g.cold ? "🥶" : "😋") : "🍽️";
    var f = tb.pat / tb.patMax; return f > 0.6 ? (g.phone ? "📱" : "") : f > 0.35 ? (g.per === "hurry" ? "⏱️" : "😐") : "💢";
  }
  function drawTables() {
    og.tables.forEach(function (tb) {
      if (tb.state !== "wait" && tb.state !== "eat") return;
      var el = $("tb" + tb.id), f = tb.pat / tb.patMax, b = el.querySelector(".pb i");
      if (b) { b.style.width = (f * 100) + "%"; b.style.background = f > 0.6 ? "#3fbf6f" : f > 0.35 ? "#f0b429" : "#e0473a"; }
      el.querySelectorAll(".gq").forEach(function (q, i) {
        var g = tb.guests[i]; if (!g) return; var m = moodOf(tb, g), md = q.querySelector(".md");
        if (md.textContent !== m) { md.textContent = m; md.classList.toggle("ph", m === "📱"); }
        var waiting = tb.state === "wait" && !g.done;
        q.classList.toggle("imp", waiting && f <= 0.6 && f > 0.35); q.classList.toggle("mad", waiting && f <= 0.35); q.classList.toggle("got", g.done);
      });
    });
  }
  function needs() {   // open orders that still need a plate (not delivered, and no matching plate already waiting on the pass)
    var out = [], onPass = og.pass.map(function (p) { return p.keys.slice().sort().join(); });
    og.tables.forEach(function (tb) { if (tb.state !== "wait") return; tb.guests.forEach(function (g, gi) { if (g.done) return;
      var k = g.order.r.slice().sort().join(), j = onPass.indexOf(k); if (j >= 0) { onPass.splice(j, 1); return; } out.push({ tb: tb, g: g, gi: gi, f: tb.pat / tb.patMax }); }); });
    return out.sort(function (a, b) { return a.f - b.f; });
  }
  function drawRail() {
    var cards = [];
    og.tables.forEach(function (tb) { if (tb.state !== "wait") return; tb.guests.forEach(function (g, gi) { if (!g.done) cards.push({ tb: tb, g: g, gi: gi, f: tb.pat / tb.patMax }); }); });
    cards.sort(function (a, b) { return a.f - b.f; });
    $("rail").innerHTML = cards.length ? cards.map(function (c) {
      var o = c.g.order;
      return '<div class="tk' + (c.f < 0.35 ? " bad" : c.f < 0.6 ? " warn" : "") + '" data-t="' + c.tb.id + '"><span class="pr" title="' + PER[c.g.per][1] + '">' + PER[c.g.per][0] + '</span><span class="t">T' + c.tb.id + '</span><div class="h"><img src="' + dishImg(o.dish) + '" alt=""><b>' + esc(T(o.dish.n)) + (o.drink ? ' <span style="color:#B8322A">+ ' + esc(T(ITEMS[o.drink].n)) + "</span>" : "") + "</b></div>" +
        '<div class="its">' + o.r.map(function (k) { return '<img src="' + ITEMS[k].img + '" alt="' + esc(ITEMS[k].n) + '" title="' + esc(ITEMS[k].n) + '"' + (ITEMS[k].fx === "crisp" ? ' class="crisp"' : "") + ">"; }).join("") + "</div>" +
        ((o.add.length || o.no.length) ? '<div class="mods">' + o.add.map(function (k) { return '<span class="ad">+ ' + esc(T(ITEMS[k].n)) + "</span>"; }).join("") + o.no.map(function (k) { return '<span class="no">NO ' + esc(T(ITEMS[k].n)) + "</span>"; }).join("") + "</div>" : "") +
        o.prep.map(function (t) { return '<div class="prep">⚠️ ' + esc(T(t)) + "</div>"; }).join("") + "</div>";
    }).join("") : '<div class="none">' + (og.running ? "No open tickets right now. Guests are on their way!" : "Tickets clip on here") + "</div>";
  }
  function railPatience() { $("rail").querySelectorAll(".tk").forEach(function (el) { var tb = og.tables[+el.dataset.t - 1]; if (!tb || tb.state !== "wait") return; var f = tb.pat / tb.patMax; el.classList.toggle("bad", f < 0.35); el.classList.toggle("warn", f >= 0.35 && f < 0.6); }); }
  function walkout(tb) {
    og.walk++; og.walkTotal++; og.streak = 0; addPts("penalty", -50);
    var el = $("tb" + tb.id);
    if (og.sim) el.querySelectorAll(".gq").forEach(function (q) { q.querySelector(".md").textContent = "😤"; q.classList.add("out"); });
    else walkOut(tb, true);   // they storm out through the door
    popAt(el, "Walked out! −50", "#ff8a7a"); flash("😤 Table " + tb.id + " walked out! (" + og.walk + " of " + MAX_WALK + ")", "#ff8a7a"); sfx("bad"); buzz(120);
    jPose("impatient", 1500);   // they leave through the door; Jurni is NOT happy about it (no thank-you)
    tb.state = "gone"; later(1100, function () { clearTable(tb); });
    og.pass.forEach(function (p) { if (p.for === tb.id) p.for = 0; });
    drawRail(); hud();
    if (og.walk >= MAX_WALK && !og.demo) later(1000, function () { end("walk"); });
  }
  function clearTable(tb) { var el = $("tb" + tb.id); el.className = "tb c" + tb.cap + " r" + tb.def.row; el.querySelector(".gs").innerHTML = ""; el.querySelector(".tt").innerHTML = ""; tb.state = "free"; tb.guests = []; }

  /* ================= SERVE (stage 1 → pass) + DELIVER (stage 2) ================= */
  function same(a, b) { return a.length === b.length && a.slice().sort().join() === b.slice().sort().join(); }
  function matchOpen(keys) { if (!keys.length) return null; var n = needs(); for (var i = 0; i < n.length; i++) if (same(n[i].g.order.r, keys)) return n[i]; return null; }
  function serve() {
    if (!og.running || og.pause || og.hold) return false;
    if (!og.plate.length) { flash("Build a plate first"); return false; }
    if (og.pass.length >= PASS_CAP) { flash("The pass is full: deliver a plate first!"); sfx("bad"); return false; }
    var keys = og.plate.slice(), m = matchOpen(keys);
    if (!m) {
      var said = null;
      og.tables.forEach(function (tb) { if (tb.state !== "wait" || said) return; tb.guests.forEach(function (g) { if (g.done || said) return; g.order.no.forEach(function (nk) { if (keys.indexOf(nk) >= 0 && same(g.order.r, keys.filter(function (k) { return k !== nk; }))) said = { tb: tb, nk: nk }; }); }); });
      og.streak = 0;
      if (said) { addPts("penalty", -60); flash("❌ They said NO " + ITEMS[said.nk].n.toLowerCase() + "! −60", "#ff8a7a"); }
      else {
        var near = needs().filter(function (x) { return x.g.order.prep.length && same(x.g.order.r.map(function (k) { return ITEMS[k].of || k; }), keys.map(function (k) { return ITEMS[k].of || k; })); })[0];
        addPts("penalty", -20); flash(near ? "❌ Check the ticket: " + near.g.order.prep[0] + " −20" : "❌ Nobody ordered that −20", "#ff8a7a");
      }
      sfx("bad"); buzz([40, 40, 40]); hud(); return false;
    }
    og.pass.push({ keys: keys, dish: m.g.order.dish, heat: 1, clean: og.clean, tries: 0, born: og.now, pq: og.pq, id: ++og.pid || (og.pid = 1) });
    og.plate = []; og.clean = true; og.pq = {}; drawPlate(); drawPass(); drawRail(); sfx("bell"); buzz([15, 30, 15]);
    if (og.sel < 0) pickPass(og.pass.length - 1);
    return true;
  }
  function heatInfo(h) { return h >= 0.75 ? ["🔥", "hot", "#ff7a1a"] : h >= 0.5 ? ["♨️", "warm", "#f2b84a"] : h >= 0.25 ? ["🌡️", "cooling", "#9cc7e8"] : ["❄️", "cold", "#5aa9e6"]; }
  function drawPass() {
    var h = '<span class="lbl">PASS</span>';
    for (var i = 0; i < PASS_CAP; i++) {
      var p = og.pass[i];
      h += '<button type="button" class="ps' + (p && i === og.sel ? " sel" : "") + (p && p.heat < 0.25 ? " cold" : "") + '" data-ps="' + i + '"' + (p ? ' aria-label="' + esc(p.dish.n) + ", " + heatInfo(p.heat)[1] + '"' : ' aria-label="Empty spot on the pass"') + ">" +
        (p ? '<span class="stm" style="--so:' + p.heat.toFixed(2) + '"></span><span class="stm b" style="--so:' + p.heat.toFixed(2) + '"></span><span class="bp"><img src="' + dishImg(p.dish) + '" alt=""></span><span class="hi">' + heatInfo(p.heat)[0] + '</span><span class="ht"><i style="width:' + (p.heat * 100) + "%;background:" + heatInfo(p.heat)[2] + '"></i></span>' : "") + "</button>";
    }
    $("pass").innerHTML = h;
    din.classList.toggle("aim", og.sel >= 0 && !!og.pass[og.sel]);
  }
  function passHeat() {
    $("pass").querySelectorAll(".ps").forEach(function (b, i) { var p = og.pass[i]; if (!p) return; var hi = heatInfo(p.heat), bar = b.querySelector(".ht i");
      if (bar) { bar.style.width = (p.heat * 100) + "%"; bar.style.background = hi[2]; }
      b.querySelectorAll(".stm").forEach(function (s) { s.style.setProperty("--so", p.heat.toFixed(2)); });
      var ic = b.querySelector(".hi"); if (ic && ic.textContent !== hi[0]) ic.textContent = hi[0]; b.classList.toggle("cold", p.heat < 0.25); });
  }
  function pickPass(i) { if (!og.running || og.hold) return false; if (!og.pass[i]) return false; og.sel = og.sel === i ? -1 : i; sfx("pop"); drawPass(); return true; }
  function tapTable(id) {
    if (!og.running || og.pause || og.hold) return false;
    if (og.sel < 0 || !og.pass[og.sel]) { flash("Tap a plate on the pass first, then its table"); return false; }
    var p = og.pass[og.sel], tb = og.tables[id - 1]; if (!tb) return false;
    var gi = -1; if (tb.state === "wait") tb.guests.forEach(function (g, i) { if (gi < 0 && !g.done && same(g.order.r, p.keys)) gi = i; });
    if (gi < 0) {   // wrong table: the plate comes back colder, small penalty
      p.tries++; p.heat = Math.max(0, p.heat - 0.15); og.streak = 0; addPts("penalty", -15);
      popAt($("tb" + id), "Wrong table! −15", "#ff8a7a"); flash("❌ Not their order: table " + id, "#ff8a7a"); sfx("bad"); buzz([40, 40]);
      og.sel = -1; drawPass(); hud(); return false;
    }
    og.pass.splice(og.sel, 1); og.sel = -1; drawPass();
    var r = deliver(tb, gi, p); hud(); return r;
  }
  function deliver(tb, gi, p) {
    var g = tb.guests[gi], o = g.order, t = Math.round((og.now - tb.seatedAt) / 100) / 10, h = Math.round(p.heat * 100) / 100, w = og.pace.win;
    var items = 30 * o.r.length + 20 * (o.add.length + o.no.length) + 25 * o.prep.length;
    // SPEED is the main score driver: continuous to 0.1 s from seating, plus a tier bonus
    var speed = Math.round(210 * Math.pow(Math.max(0, 1 - t / w), 1.3)) + (t <= w / 6 ? 90 : t <= w / 4 ? 60 : t <= w / 3 ? 35 : t <= w / 2 ? 12 : 0);
    var heatPts = Math.round(80 * h), acc = p.clean ? 40 : 0, rightFirst = p.tries === 0, hotOK = !o.hot || h >= 0.75;
    var qp = 0, cookOK = true, burnt = false, perfCooks = 0;   // only items that went through a station (L4+ adult / L5 kid)
    Object.keys(p.pq || {}).forEach(function (k) { var c = p.pq[k]; qp += Math.round(40 * c.q) + (c.perfect ? 15 : 0); if (c.q < 0.8) cookOK = false; if (c.d >= 1.45) burnt = true; if (c.perfect) perfCooks++; });
    if (qp) addPts("quality", qp);
    var perfect = p.clean && rightFirst && h >= 0.75 && hotOK && cookOK;
    if (perfect && t <= w / 3) og.streak++; else og.streak = 0;
    og.best = Math.max(og.best, og.streak); if (perfect) og.perfect++; if (h >= 0.75) og.hotDeliv++;
    var mult = 1 + Math.min(og.streak, 5) * 0.2, base = items + speed + heatPts + acc, stk = Math.round(base * (mult - 1));
    // money: the order pays less the colder it lands; tips by speed, mood, heat and personality (cold = no tip)
    var pay = Math.round(o.usd * (0.55 + 0.45 * h) * 100) / 100, sF = Math.max(0, 1 - t / (w * 0.75)), mood = tb.pat / tb.patMax, tip = 0;
    if (h >= 0.25 && hotOK) {
      var pct = 0.06 + 0.12 * sF + 0.06 * mood + 0.06 * h, pw = { chill: 1, generous: 1.5, picky: p.clean ? 1.15 : 0.4, hurry: sF > 0.5 ? 1.3 : 0.6 }[g.per] || 1;
      tip = o.usd * pct * pw + (perfect ? 3 : 0) + 0.75 * perfCooks; if (burnt) tip *= g.per === "picky" ? 0 : 0.35;
      tip *= 0.92 + Math.random() * 0.16; tip = Math.round(tip * 4) / 4;
    }
    var moneyPts = Math.round(pay * 4), tipPts = Math.round(tip * 10);
    addPts("orders", items); addPts("speed", speed); addPts("heat", heatPts); if (acc) addPts("accuracy", acc); addPts("money", moneyPts); if (tipPts) addPts("tips", tipPts); if (stk) addPts("streak", stk);
    if (!og.demo) { og.usd += pay + tip; og.tipsUsd += tip; }
    g.done = true; g.t = t; g.cold = h < 0.25 || burnt; g.tip = tip; g.mood = mood; og.served++;
    tb.delivered++; if (!tb.first) tb.first = og.now; tb.pat = Math.min(tb.patMax, tb.pat + (h < 0.25 ? 2000 : 6000));
    var el = $("tb" + tb.id), hi = heatInfo(h);
    popAt(el, "$" + pay.toFixed(2) + (tip ? " + $" + tip.toFixed(2) + " tip " + hi[0] : " · no tip " + hi[0]), tip ? "#7dffb5" : "#9cd3ff");
    setTimeout(function () { popAt(el, "+" + (base + stk + moneyPts + tipPts) + " · " + t.toFixed(1) + "s", "#f2c14e"); }, 350);
    if (og.streak >= 2) setTimeout(function () { popAt(el, "🔥 Streak ×" + mult.toFixed(1), "#ffb27a"); }, 700);
    flash(perfect ? "✨ Perfect: hot + right + fast!" : h < 0.25 ? "❄️ Cold plate: no tip" : (!hotOK ? "🥵 They wanted it extra hot!" : t <= w / 4 ? "🔥 Lightning fast!" : "✅ Order up!"), perfect ? "#F2C14E" : h < 0.25 ? "#9cd3ff" : "#fff");
    if (tb.guests.every(function (x) { return x.done; })) {
      tb.state = "eat";
      if (tb.guests.length >= 2 && og.now - tb.first <= 10000) { var gb = 30 * tb.guests.length; addPts("group", gb); setTimeout(function () { popAt(el, "👥 Whole table! +" + gb, "#7dffb5"); }, 900); }
    }
    var owner = !J.task && !og.sim && !RM && (tb.guests.length >= 3 || tb.vip || og.streak >= 3 || Math.random() < 0.35);
    if (owner) jDeliver(tb, gi, p.dish); else sendServer(tb, gi, p.dish);
    drawRail();
    return { t: t, heat: h, pay: pay, tip: tip, items: items, speed: speed, quality: qp, perfect: perfect };
  }
  var srvI = 0;
  function sendServer(tb, gi, dish) {
    var srv = SERVERS[1 + (srvI++ % (SERVERS.length - 1))], el = D.createElement("div"); el.className = "srv";
    el.innerHTML = serverSVG(srv.look) + '<img class="cp" src="' + dishImg(dish) + '" alt="">'; din.appendChild(el);
    var trip = { el: el, srv: srv, path: tripPath(edgeSpot(tb, seatPt(tb, gi, tb.guests.length).x)), t: 0, dur: 1100, back: false, onArrive: function () { arrive(tb, gi, dish); } };
    og.trips.push(trip); placeTrip(trip);
  }
  function busTable(tb) {
    var srv = SERVERS[1 + (srvI++ % (SERVERS.length - 1))], el = D.createElement("div"); el.className = "srv"; el.innerHTML = serverSVG(srv.look); din.appendChild(el);
    var s = dsz(), trip = { el: el, srv: srv, path: tripPath(edgeSpot(tb, tb.def.x * s.w)), t: 0, dur: 1000, back: false, onArrive: function () { clearTable(tb); } };
    og.trips.push(trip); placeTrip(trip);
  }
  // trip path: from below the pass, up through the kitchen door (gap 1), then around the furniture to the table edge.
  // Same fixed durations as before (the food lands on a timer), only the drawn route changed.
  function tripPath(to) { var k = navNodes().K, pts = [{ x: k.x, y: k.y + 40 }, k].concat(route(k, to)), L = 0; pts.forEach(function (q, i) { q.d = i ? L += Math.hypot(q.x - pts[i - 1].x, q.y - pts[i - 1].y) : 0; }); pts.L = L || 1; return pts; }
  function placeTrip(tr) {
    if (og.sim) return; var P = tr.path, f = Math.min(1, tr.t / tr.dur), d = (tr.back ? 1 - f : f) * P.L, i = 1;
    while (i < P.length - 1 && P[i].d < d) i++;
    var a = P[i - 1], b = P[i], u = b.d > a.d ? Math.min(1, Math.max(0, (d - a.d) / (b.d - a.d))) : 1, x = a.x + (b.x - a.x) * u, y = a.y + (b.y - a.y) * u, face = (tr.back ? a.x - b.x : b.x - a.x) < 0 ? -1 : 1, k = depth(y);
    tr.x = x; tr.y = y; tr.el.style.transform = "translate(" + (x - 13).toFixed(1) + "px," + (y - 42).toFixed(1) + "px) scale(" + (face * k).toFixed(3) + "," + k.toFixed(3) + ")"; tr.el.style.zIndex = zAt(y);
  }
  function arrive(tb, gi, dish) {
    var g = tb.guests[gi]; if (!g || tb.state === "free" || tb.state === "gone") return;
    g.arrived = true; tb.fedAt = og.now; var el = $("tb" + tb.id);
    el.querySelector(".tt").insertAdjacentHTML("beforeend", '<img src="' + dishImg(dish) + '" alt="">');
    if (!g.cold && Math.random() < 0.4) { var fl = el.querySelector(".flash"); fl.classList.remove("on"); void fl.offsetWidth; fl.classList.add("on"); g.photo = og.now + 1200; sfx("flash"); }
    if (tb.state === "eat" && tb.guests.every(function (x) { return x.arrived; })) later(3200, function () { leave(tb); });
  }
  function leave(tb) {
    if (tb.state !== "eat") return;
    var el = $("tb" + tb.id), tips = tb.guests.reduce(function (a, g) { return a + (g.tip || 0); }, 0);
    if (og.sim) el.querySelectorAll(".gq").forEach(function (q) { q.querySelector(".md").textContent = "👋"; q.classList.add("out"); });
    else {   // full and happy: a pat on the belly, then they get up and walk out the door
      el.querySelectorAll(".gq").forEach(function (q) { q.querySelector(".md").textContent = "😋"; q.classList.add("full"); });
      var guests = tb.guests.slice(); later(700, function () { if (tb.state === "dirty" || tb.state === "free") walkOut({ id: tb.id, def: tb.def, guests: guests }, false); });
    }
    jGoodbye(tips);
    tb.state = "dirty"; el.className = "tb c" + tb.cap + " r" + tb.def.row + " dirty";
    later(1100, function () { el.querySelector(".gs").innerHTML = ""; });
    later(1500, function () { busTable(tb); });
    hud();
  }

  /* ================= JURNI ON THE FLOOR (pointer-events: none; never blocks taps) ================= */
  var J = { el: $("jfl"), x: 150, y: 160, task: null, pose: "walkA", face: 1, until: 0, over: null, overUntil: 0, frameT: 0, idleAt: 0 };
  var JPOSES = { a: 1, impatient: 1, tip: 1, walkA: 1, walkB: 1, carry: 1, door: 1 };
  HAT.walkA = [27, -5, 30]; HAT.walkB = [31, -5, 28]; HAT.carry = [20, -5, 32]; HAT.door = [18, -5, 32];
  function jSet(pose, bubble) {
    if (og.sim || !J.el) return;
    if (pose !== J.pose) { J.pose = pose; J.el.innerHTML = jurniHTML(pose); }
    if (bubble !== J.bubble) { J.bubble = bubble; if (bubble) jSay(bubble, pose); }
  }
  function jPlace() {
    if (og.sim || !J.el) return; var k = depth(J.y);
    J.el.style.transform = "translate(" + (J.x - 20).toFixed(1) + "px," + (J.y - 68).toFixed(1) + "px) scale(" + (J.face < 0 ? -k : k).toFixed(3) + "," + k.toFixed(3) + ")"; J.el.style.zIndex = zAt(J.y);
  }
  function jReset() { var d = doorSpots()[0]; J.x = d.x; J.y = d.y; J.task = null; J.over = null; J.face = 1; J.inK = false; J.mode = "door"; J.idleAt = og.now + 2500; if (J.el) J.el.classList.remove("ink", "dz"); jSet("walkA"); jPlace(); }
  function jOutOfKitchen() { if (J.inK) { J.inK = false; if (J.el) J.el.classList.remove("ink"); } }
  // RM: she stays near the door and only swaps poses (no walking); sim: no visuals at all
  function jGo(x, y, mode, cb) {
    jOutOfKitchen(); if (J.el) J.el.classList.remove("dz");
    if (RM || og.sim) { J.task = null; if (cb) cb(); return; }
    J.task = { pts: route({ x: J.x, y: J.y }, { x: x, y: y }), mode: mode || "walk", cb: cb };
  }
  function jPose(p, ms, bubble) { J.over = p; J.overB = bubble || ""; J.overUntil = og.now + ms; jSet(p, J.overB); }
  function jDeliver(tb, gi, dish) {   // Jurni carries this one: logic arrives on a fixed timer so the score never waits on animation
    var sp = edgeSpot(tb, seatPt(tb, gi, tb.guests.length).x), k = navNodes().K;
    if (!RM) { J.x = k.x; J.y = k.y; }   // she comes out of the kitchen door with the plate
    J.carrying = true; J.mode = "deliver"; jGo(sp.x, sp.y, "carry", function () { J.carrying = false; J.face = faceTo(tb); jPose("tip", 900, pick(["Enjoy! 💛", "Hot & fresh!", "Owner's special ✨"])); jRest(2500); });
    later(1300, function () { arrive(tb, gi, dish); });
  }
  function jGoodbye(tips) {   // she always walks the finished party out and holds the door
    var big = tips >= 6, d = doorSpots()[0];
    doorOpen(2200);
    if (J.task && J.carrying) return;
    J.mode = "door"; jGo(d.x, d.y, "walk", function () { J.face = 1; jPose(big ? "tip" : "door", 1800, tips > 0 ? pick(["Thank you! Come back soon 💛", "Appreciate y'all! 💛", "Thanks for coming! 💛"]) : "Have a good one!"); jRest(3000); });
  }
  var doorT = 0;
  function doorOpen(ms) { var d = $("door"); if (!d || og.sim) return; d.classList.add("open"); din.classList.add("dopen"); clearTimeout(doorT); doorT = setTimeout(function () { d.classList.remove("open"); din.classList.remove("dopen"); }, ms || 1500); }
  function jRest(ms) { J.idleAt = og.now + ms + Math.random() * 1500; }
  function faceTo(tb) { return tb.def.x * dsz().w >= J.x ? 1 : -1; }
  // her routine (state machine): check on tables (favoring just-fed / getting-impatient ones), dance when it's calm,
  // pop into the kitchen and back, otherwise hang by the door + host stand greeting people
  function jNext() {
    var cand = og.tables.filter(function (tb) { return tb.state === "wait" || tb.state === "eat"; });
    if (RM) { jPose(pick(["door", "a", "tip"]), 1400); jRest(3500); return; }
    var hot = cand.filter(function (tb) { return (tb.fedAt && og.now - tb.fedAt < 7000 && tb.state === "eat") || (tb.state === "wait" && tb.pat / tb.patMax < 0.6); });
    var calm = !og.tables.some(function (tb) { return tb.state === "wait" && tb.pat / tb.patMax < 0.5; }), r = Math.random();
    if ((hot.length && r < 0.55) || (cand.length && r < 0.3)) return jCheck(pick(hot.length ? hot : cand));
    if (calm && r < 0.48 && og.now - (J.dancedAt || -99999) > 12000) return jDance();
    if (r < 0.66) return jKitchen();
    jDoorIdle();
  }
  function jCheck(tb) {
    var sp = checkSpot(tb), happy = tb.state === "eat" || tb.pat / tb.patMax > 0.6; J.mode = "check";
    jGo(sp.x, sp.y, "walk", function () { J.face = faceTo(tb); jPose(happy ? "door" : "impatient", 1300, happy ? pick(["Everything good? 💛", "Y'all good? 💛", "Enjoy! 💛", "👋"]) : pick(["Food's coming! 👀", "Almost ready! 🔥"])); jRest(2600); });
  }
  function jDance() {
    var sp = danceSpot(); J.mode = "dance"; J.dancedAt = og.now;
    jGo(sp.x, sp.y, "walk", function () { J.face = 1; ["door", "walkA", "door", "walkB", "door", "walkA", "door", "walkB"].forEach(function (f, i) { later(i * 280, function () { if (J.mode === "dance" && !J.task) jPose(f, 320); }); }); if (J.el) { J.el.classList.remove("dz"); void J.el.offsetWidth; J.el.classList.add("dz"); } later(2300, function () { if (J.el) J.el.classList.remove("dz"); }); jRest(2600); });
  }
  function jKitchen() {   // steps through the kitchen door at the pass, then comes back out
    var k = navNodes().K; J.mode = "kitchen";
    jGo(k.x, k.y, "walk", function () { J.inK = true; if (J.el) J.el.classList.add("ink"); var back = 1800 + Math.random() * 1800; J.idleAt = og.now + back + 99999;
      later(back, function () { if (!J.inK) return; jOutOfKitchen(); jRest(300); }); });
  }
  function jDoorIdle() {
    var sp = pick(doorSpots()); J.mode = "door";
    jGo(sp.x, sp.y, "walk", function () { J.face = 1; jPose("door", 1200); jRest(3500); });
  }
  function jStep(dt) {
    if (og.sim) return;
    if (J.over && og.now > J.overUntil) { J.over = null; }
    if (J.task) {
      var t = J.task.pts[0];
      if (!t) { var c = J.task; J.task = null; if (c.cb) c.cb(); }
      else {
        var dx = t.x - J.x, dy = t.y - J.y, d = Math.sqrt(dx * dx + dy * dy), v = (J.task.mode === "carry" ? 150 : 75) * dt / 1000;
        if (Math.abs(dx) > 1) J.face = dx > 0 ? 1 : -1;
        if (d <= v) { J.x = t.x; J.y = t.y; J.task.pts.shift(); if (!J.task.pts.length) { var tk = J.task; J.task = null; J.idleAt = og.now + 3000 + Math.random() * 3000; if (tk.cb) tk.cb(); } }
        else { J.x += dx / d * v; J.y += dy / d * v; J.frameT += dt; }
      }
      if (J.task && !J.over) jSet(J.task.mode === "carry" ? "carry" : (Math.floor(J.frameT / 190) % 2 ? "walkB" : "walkA"));
      if (J.el) J.el.classList.toggle("walk", !!J.task);
    } else {
      if (J.el) J.el.classList.remove("walk");
      if (!J.over) jSet("walkA");
      if (og.now > J.idleAt && og.running && !J.inK) jNext();
    }
    if (J.over) jSet(J.over, J.overB);
    jPlace();
  }

  /* ================= FLOOR NAVMESH: feet stay on the floor plane; routes go AROUND furniture =================
     Walkable floor: the aisle between the back row and the front row, the door + host-stand strip on the left, the
     gaps between the front-row tables (gap 1 = the kitchen door at the pass edge), never on a table, the banquette or
     the bar. Waypoint graph + line-of-sight edges + Dijkstra, computed only when someone starts a walk. */
  var NAV_AY = 131;   // aisle feet line: in front of the back row, just behind the front-row guests (they hide her legs)
  function tRect(t) { var s = dsz(), hw = (t.cap === 4 ? 112 : 60) / 2, cx = t.x * s.w, by = t.y * s.h; return { l: cx - hw, r: cx + hw, t: by - 23, b: by + 3 }; }
  function furniture() {   // feet must never be inside these (also the test's rects)
    var s = dsz(), out = TABLES.map(function (t) { var r = tRect(t); r.k = "table" + t.id; return r; });
    out.push({ l: 32, r: s.w - 58, t: 79, b: 107, k: "banquette" }, { l: s.w - 58, r: s.w, t: 22, b: s.h + 50, k: "bar" });
    return out;
  }
  function obstacles() { var s = dsz(), o = furniture(); o.push({ l: 30, r: 49, t: s.h - 24, b: s.h + 50, k: "host" }); return o; }
  function navNodes() {
    var s = dsz(), R = TABLES.map(tRect), g1 = (R[3].r + R[4].l) / 2, g2 = Math.min((R[4].r + s.w - 58) / 2, s.w - 63), gy = Math.round((R[3].t + R[3].b) / 2);
    return { DOOR: { x: 20, y: s.h - 8 }, DUP: { x: 22, y: 129 }, LA: { x: 57, y: NAV_AY }, LB: { x: Math.min(61, R[3].l - 9), y: gy }, A1: { x: g1, y: NAV_AY }, A2: { x: g2, y: NAV_AY }, G1: { x: g1, y: gy }, K: { x: g1, y: s.h - 1 }, G2: { x: g2, y: gy } };
  }
  function blocked(x, y, O) { for (var i = 0; i < O.length; i++) { var r = O[i]; if (x > r.l - 2 && x < r.r + 2 && y > r.t - 2 && y < r.b + 2) return true; } return false; }
  function los(a, b, O) { var d = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.ceil(d / 2)); for (var i = 1; i < n; i++) { var u = i / n; if (blocked(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, O)) return false; } return true; }
  function route(from, to) {
    from = { x: from.x, y: from.y }; to = { x: to.x, y: to.y }; var O = obstacles();
    if (los(from, to, O)) return [to];
    var N = navNodes(), P = [from, to], i, j; Object.keys(N).forEach(function (k) { P.push(N[k]); });
    var n = P.length, dist = [], prev = [], done = [];
    for (i = 0; i < n; i++) { dist[i] = Infinity; prev[i] = -1; } dist[0] = 0;
    for (var it = 0; it < n; it++) {
      var u = -1; for (i = 0; i < n; i++) if (!done[i] && (u < 0 || dist[i] < dist[u])) u = i;
      if (u < 0 || dist[u] === Infinity) break; done[u] = 1; if (u === 1) break;
      for (j = 0; j < n; j++) if (!done[j] && j !== u) { var w = Math.hypot(P[j].x - P[u].x, P[j].y - P[u].y); if (dist[u] + w < dist[j] && los(P[u], P[j], O)) { dist[j] = dist[u] + w; prev[j] = u; } }
    }
    if (prev[1] < 0) return [to];   // (never on a valid floor spot) fall back to a direct walk
    var out = []; for (i = 1; i > 0; i = prev[i]) out.unshift({ x: P[i].x, y: P[i].y }); return out;
  }
  // depth: further back = a little smaller; z-order by feet (aisle = between the rows; door strip, gaps + pass edge = in front)
  function depth(y) { var h = dsz().h; return 0.82 + 0.18 * clamp((y - (NAV_AY - 6)) / (h - NAV_AY + 6), 0, 1); }
  function zAt(y) { return y < NAV_AY + 10 ? 5 : 7; }
  function aislePt(x) { var N = navNodes(); return { x: clamp(x, N.LA.x, N.A2.x), y: NAV_AY }; }
  function sideSpots(tb) { var N = navNodes(); return tb.id === 4 ? [N.LB, N.G1] : tb.id === 5 ? [N.G1, N.G2] : null; }
  function nearest(list, x) { return list.slice().sort(function (a, b) { return Math.abs(a.x - x) - Math.abs(b.x - x); })[0]; }
  function edgeSpot(tb, x) { var sd = sideSpots(tb); return sd ? nearest(sd, x) : aislePt(x); }   // where a plate is handed over, from the floor side
  function checkSpot(tb) { var sd = sideSpots(tb), s = dsz(), hw = (tb.cap === 4 ? 112 : 60) / 2; return sd ? pick(sd) : aislePt(tb.def.x * s.w + (Math.random() < 0.5 ? -1 : 1) * hw * 0.55); }
  function danceSpot() { var N = navNodes(); return Math.random() < 0.7 ? aislePt(N.LA.x + 30 + Math.random() * (N.A2.x - N.LA.x - 50)) : N.G1; }
  function doorSpots() { var N = navNodes(); return [{ x: 22, y: dsz().h - 10 }, N.DUP, { x: 24, y: 142 }, N.LA, N.LB]; }

  /* ================= LEVELS ================= */
  function levelUp() {
    var L = og.level, bonus = 150 * L + 75 * (MAX_WALK - og.walk);
    addPts("level", bonus); og.pause = true; stopMusic(); sfx("level");
    var b = $("lvb"); b.querySelector("h3").textContent = "LEVEL " + (L + 1);
    b.querySelector("p").textContent = "Level " + L + " cleared! +" + bonus + " · next: " + nextTease(L + 1);
    b.classList.add("on");
    var dn = D.createElement("div"); dn.className = "dance"; dn.innerHTML = jurniHTML("a") + '<span class="tray"><img src="' + GI + 'kiki.webp" alt=""><img src="' + GI + 'kiki.webp" alt=""></span>'; b.appendChild(dn);
    setTimeout(function () { var tr = dn.querySelector(".tray"); if (tr) { tr.style.transition = "transform .4s"; tr.style.transform = "translate(-20px,46px)"; } }, 700);
    setTimeout(function () { dn.innerHTML = jurniHTML("tip") + '<span class="tray" style="transform:translate(-20px,46px)"><img src="' + GI + 'kiki.webp" alt=""><img src="' + GI + 'kiki.webp" alt=""></span>'; dn.classList.add("go"); sparkles(dn, 12); }, 1100);
    var go = function () { dn.remove(); b.classList.remove("on"); og.level = L + 1; og.pause = false; resetLevelState(); flash("Level " + og.level + " · 90 seconds", "#F2C14E"); startMusic(); tutStart(); };
    var firstCook = !stationsFor(L).length && stationsFor(L + 1).length;   // the story beat: a cook clocks out
    var moreCook = stationsFor(L).length === 1 && stationsFor(L + 1).length > 1;   // L5 adult: irons + skillet join
    var next = function () {   // after the (optional) halftime: the L4 story beat + instructions, then the level
      if (firstCook) { b.classList.remove("on"); og.pause = true; cookLeft(function () { howCook("fry", go); }); }
      else if (moreCook) { b.classList.remove("on"); og.pause = true; howCook("full", go); }
      else go();
    };
    // halftime.js (Antidote's review reel) takes over at most once per run (L2→5 after ~90–120 s); og.pause stays true until go()
    if (og.sim) go(); else setTimeout(function () { if (!(W.Halftime && W.Halftime.levelUp(L + 1, next))) next(); }, 3600);
    hud();
  }
  function nextTease(L) { return (L === 2 ? "toppings, drinks, baskets and NO-requests · plates cool faster" : L === 3 ? "breakfast plates, sides, families" : L === 4 ? "starters, loaded combos, the church group" : "prep requests: sautéed shrimp, sunny-side eggs, extra crispy, extra hot") + " · guests come in faster"; }
  function sparkles(host, n) { for (var i = 0; i < n; i++) { var s = D.createElement("span"); s.className = "spk"; s.textContent = pick(["✨", "⭐", "💛", "✨"]); s.style.left = "50%"; s.style.top = "40%"; s.style.setProperty("--dx", rnd(-80, 80) + "px"); s.style.setProperty("--dy", rnd(-70, 50) + "px"); s.style.animationDelay = (i * 0.06) + "s"; host.appendChild(s); setTimeout(function (x) { return function () { x.remove(); }; }(s), 1800); } }

  /* ================= LOOP ================= */
  function step(dt) {
    if (!og.running || og.hold) return;
    og.trips = og.trips.filter(function (tr) {
      tr.t += dt;
      if (!tr.back && tr.t >= tr.dur) { tr.back = true; tr.t = 0; try { tr.onArrive(); } catch (e) {} var cp = tr.el.querySelector(".cp"); if (cp) cp.remove(); }
      if (tr.back && tr.t >= tr.dur) { tr.el.remove(); return false; }
      placeTrip(tr); return true;
    });
    var due = og.timers.filter(function (x) { return x.at <= og.now + dt; }); og.timers = og.timers.filter(function (x) { return x.at > og.now + dt; });
    og.now += dt;
    due.forEach(function (x) { try { x.fn(); } catch (e) { if (W.console) console.error(e); } });
    jStep(dt); wkStep(dt); if (!og.sim && !og.pause) lineStep();
    if (og.pause || !og.running) return;
    og.lt -= dt;
    var cool = og.pace.cool * 1000; og.pass.forEach(function (p) { p.heat = Math.max(0, p.heat - dt / cool); });
    cookStep(dt);
    og.nextArr -= dt; if (og.nextArr <= 0 && og.lt > 6000) arrivals();
    og.tables.forEach(function (tb) {
      if (tb.state !== "wait") return;
      tb.pat -= dt;
      if (og.demo && tb.pat < 3000) tb.pat = tb.patMax * 0.5;   // attract mode never ends
      if (tb.pat / tb.patMax < 0.3 && !og.warned[tb.id + ":" + tb.seatedAt]) { og.warned[tb.id + ":" + tb.seatedAt] = 1; jWarn(tb); }
      if (tb.pat <= 0) walkout(tb);
    });
    if (og.demo) { demoBot(dt); if (og.lt < 8000) og.lt = LEVEL_MS; }
    else if (og.running && og.lt <= 0 && og.walk < MAX_WALK) levelUp();
  }
  function jWarn(tb) {   // a table is getting impatient: Jurni heads over with her impatient face (rate-limited)
    if (og.sim || og.now - og.popAt < 9000 || J.carrying) return; og.popAt = og.now;
    var sp = checkSpot(tb); J.mode = "check"; jGo(sp.x, sp.y, "walk", function () { J.face = faceTo(tb); jPose("impatient", 1500, pick(["Table " + tb.id + " is waiting! 😤", "Let's GO, kitchen! 👀"])); jRest(2500); });
    if (TH_ID === "halloween") sfx("boo");
  }
  var last = 0, frame = 0;
  function tick(now) {
    requestAnimationFrame(tick);
    var dt = last ? Math.min(100, now - last) : 16; last = now;
    if (!og.running || og.sim || D.hidden) return;
    step(dt); render();
  }
  function render() { frame++; drawTables(); if (og.act && og.act.length) drawStations(); if (frame % 4 === 0) passHeat(); if (frame % 6 === 0) railPatience(); hud(); }
  requestAnimationFrame(tick);

  /* ================= ATTRACT MODE (silent demo behind the start menu) ================= */
  var demoT = 0;
  function demoBot(dt) {   // plays like a calm human: build → serve → deliver
    demoT -= dt; if (demoT > 0) return; demoT = 650 + Math.random() * 400;
    if (og.pass.length && (og.sel >= 0 || Math.random() < 0.7)) {
      if (og.sel < 0) { pickPass(0); return; }
      var p = og.pass[og.sel], t = null; og.tables.forEach(function (tb) { if (!t && tb.state === "wait" && tb.guests.some(function (g) { return !g.done && same(g.order.r, p.keys); })) t = tb; });
      if (t) tapTable(t.id); else { og.pass.splice(og.sel, 1); og.sel = -1; drawPass(); } return;
    }
    var n = needs()[0]; if (!n) return;
    var need = n.g.order.r, miss = need.filter(function (k) { return og.plate.indexOf(k) < 0; });
    if (og.plate.some(function (k) { return need.indexOf(k) < 0; })) { og.plate = []; drawPlate(); return; }
    if (miss.length) tap(miss[0]); else serve();
  }
  function attract(on) {
    if (on) {
      if (og.running && !og.demo) return;
      og.demoNext = true; start(); og.demoNext = false;
      if (RM) {   // reduced motion: a still frame, not a running demo
        og.tables.forEach(function (tb, i) { if (i < 4) seat(tb, makeParty(2, tb.cap)); });
        og.pass = [{ keys: ["waffle", "chicken"], dish: DISHES[2], heat: 1, clean: true, tries: 0 }, { keys: ["gritz", "catfish"], dish: DISHES[5], heat: 0.8, clean: true, tries: 0 }];
        drawPass(); render(); og.running = false;
      } else { og.tables.slice(0, 3).forEach(function (tb) { seat(tb, makeParty(2, tb.cap)); }); }
    } else if (og.demo) {
      og.running = false; og.demo = false;
      og.trips.forEach(function (tr) { tr.el.remove(); }); og.trips = []; wkClear();
      TABLES.forEach(function (t) { var el = $("tb" + t.id); el.className = "tb c" + t.cap + " r" + t.row; el.querySelector(".gs").innerHTML = ""; el.querySelector(".tt").innerHTML = ""; });
      og.pass = []; og.plate = []; drawPass(); drawPlate(); drawRail(); hud();
    }
  }

  /* ================= HUD / FX ================= */
  function buzz(p) { if (navigator.vibrate && !og.sim && !og.demo) try { navigator.vibrate(p); } catch (e) {} }
  function mult() { return 1 + Math.min(og.streak || 0, 5) * 0.2; }
  function hud() {
    var dm = og.demo;
    $("score").textContent = dm ? "0" : Math.round(og.score || 0).toLocaleString(); var us = $("usd"); if (us) us.textContent = "$" + (dm ? 0 : og.usd || 0).toFixed(2);
    var s = Math.ceil(Math.max(0, og.lt == null || dm ? LEVEL_MS : og.lt) / 1000); $("time").textContent = Math.floor(s / 60) + ":" + ("0" + s % 60).slice(-2);
    $("lvl").textContent = "Level " + (dm ? 1 : og.level || 1); var mb = $("mode"); if (mb) mb.textContent = MODE ? modeBadge() : "";
    var w = dm ? 0 : og.walk || 0; if (w !== walkShown) drawWalk(w);
    $("combo").textContent = "×" + (dm ? "1" : mult().toFixed(1).replace(/\.0$/, ""));
  }
  function sfxOK() { return !og.demo; }
  // walk-out counter: three little faces. Unused = dim, calm face; each walk-out flips one to a red angry face with a steam
  // puff (shake + pop); at 2 of 3 the last calm face pulses as a warning. Same footprint as the old ⭕⭕⭕.
  var walkShown = -1;
  function faceSVG(mad) {
    return mad ? '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="11" r="8" fill="#e0473a" stroke="#8a1c12" stroke-width="1.2"/><path d="M5 8.2 L8.6 9.6 M15 8.2 L11.4 9.6" stroke="#3a0904" stroke-width="1.6" stroke-linecap="round"/><circle cx="7.4" cy="11.2" r="1.1" fill="#3a0904"/><circle cx="12.6" cy="11.2" r="1.1" fill="#3a0904"/><path d="M6.8 15.6 Q10 13.2 13.2 15.6" stroke="#3a0904" stroke-width="1.5" fill="none" stroke-linecap="round"/><path class="pf" d="M15.6 3.4 q1.6-1.4 3 0 q1 1.3-.4 2.2" stroke="#fff" stroke-width="1.3" fill="none" stroke-linecap="round" opacity=".9"/></svg>'
      : '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="11" r="7.6" fill="#fff3c4" stroke="#c9a44c" stroke-width="1.2"/><circle cx="7.5" cy="10.2" r="1" fill="#6b4a12"/><circle cx="12.5" cy="10.2" r="1" fill="#6b4a12"/><path d="M7 13.4 Q10 15.6 13 13.4" stroke="#6b4a12" stroke-width="1.3" fill="none" stroke-linecap="round"/></svg>';
  }
  function drawWalk(w) {
    var el = $("walk"); if (!el) return; var prev = walkShown; walkShown = w;
    if (!el.children.length || el.children.length !== MAX_WALK) { var h = ""; for (var i = 0; i < MAX_WALK; i++) h += '<i class="wf"></i>'; el.innerHTML = h; el.classList.add("wfs"); }
    [].forEach.call(el.children, function (f, i) {
      var mad = i < w, was = f.classList.contains("mad");
      if (mad !== was || !f.firstChild) { f.innerHTML = faceSVG(mad); f.classList.toggle("mad", mad); if (mad && prev >= 0 && i >= prev) { f.classList.remove("flip"); void f.offsetWidth; f.classList.add("flip"); } }
      f.classList.toggle("warn", !mad && w === MAX_WALK - 1 && i === MAX_WALK - 1);
    });
    var lab = "Walk-outs " + w + " of " + MAX_WALK; el.setAttribute("aria-label", lab); el.setAttribute("role", "img"); el.title = lab;
  }
  // flash messages + Jurni's lines live in the KITCHEN (over the plate-name column), never over the dining floor
  var flashAt = 0, jsT = 0;
  function flash(t, col) { if (og.sim || og.demo) return; var f = $("oflash"); f.textContent = t; f.style.color = col || "#fff"; f.style.fontSize = t.length > 44 ? "11px" : ""; f.classList.remove("on"); void f.offsetWidth; f.classList.add("on"); flashAt = Date.now(); var j = $("jsay"); if (j) j.classList.remove("on"); }
  function jSay(t, pose) {
    if (og.sim || og.demo || !t) return; var j = $("jsay"); if (!j) return;
    var show = function () { j.innerHTML = '<img src="' + jimg(pose === "impatient" ? "impatient" : "tip") + '" alt=""><span><b style="display:block;font-size:8.5px;letter-spacing:.06em;color:#B8322A">JURNI</b>' + esc(T(t)) + "</span>"; j.classList.add("on"); clearTimeout(jsT); jsT = setTimeout(function () { j.classList.remove("on"); }, 1900); };
    var wait = 1100 - (Date.now() - flashAt); if (wait > 0) { clearTimeout(jsT); jsT = setTimeout(show, wait); } else show();
  }
  function popAt(el, t, col) {
    if (og.sim || og.demo || !el) return; var r = el.getBoundingClientRect(), o = ou.getBoundingClientRect(), p = D.createElement("div"); p.className = "pop2"; p.textContent = t; p.style.color = col || "#f2c14e";
    p.style.left = Math.max(2, Math.min(o.width - 150, r.left - o.left + r.width / 2 - 60)) + "px"; p.style.top = (r.top - o.top) + "px"; ou.appendChild(p); setTimeout(function () { p.remove(); }, 1400);
  }

  /* ---- Antidote's review: ONE ad only, the framed poster on the top-left wall. Tapping it pauses the game and opens the
     Watch-on-YouTube card; the first tap in a run is the hidden bonus (+250, ReviewEgg.collect() → unlocks the end-screen preview). ---- */
  function openPoster() {
    if (og.demo) return;
    var c = $("pcard"), fd = $("pfound"), RE = W.ReviewEgg;
    if (og.running && !og.sim && RE && !RE.found) { var b = RE.collect(); if (b) { addPts("bonus", b); hud(); buzz([20, 40, 20]); if (fd) { fd.textContent = "📺 You found it! +" + b + " · the preview unlocks at the end of your run"; fd.hidden = false; } } }
    else if (fd) fd.hidden = true;
    c.classList.add("on"); if (og.running) og.hold = true;   // freezes the game (step + taps) until Back
    try { c.querySelector("#pback").focus({ preventScroll: true }); } catch (e) {}
  }
  function closePoster(quiet) { var c = $("pcard"); if (!c) return; c.classList.remove("on"); og.hold = false; last = 0; }

  /* ================= END ================= */
  function bestKey(m) { return (m || MODE) === "kid" ? "gnw-best-kid" : "gnw-best2"; }
  function best() {
    try {
      var a = +localStorage.getItem("gnw-best2") || 0, k = +localStorage.getItem("gnw-best-kid") || 0, el = $("best");
      if (el) el.textContent = "Your best: 🧑 " + (a ? a.toLocaleString() : "—") + " · 🧒 " + (k ? k.toLocaleString() : "—");
      return MODE === "kid" ? k : a;
    } catch (e) { return 0; }
  }
  best();
  function end(why) {
    if (!og.running || og.demo) return;
    og.running = false; stopMusic(); wkClear(); hud();
    var b = best(); if (og.score > b) { try { localStorage.setItem(bestKey(), Math.round(og.score)); } catch (e) {} } best();
    if (MODE === "kid" && W.SSAI_TOKENS && W.SSAI_TOKENS.kidBest) W.SSAI_TOKENS.kidBest(og.score);   // kid best lives on the parent's account
    var B = og.bk, rows = [["⚡ Speed", B.speed], ["🔥 Heat", B.heat], ["🍳 Cooking", B.quality], ["🧾 Orders", B.orders], ["✨ Accuracy", B.accuracy], ["💵 Pay", B.money], ["💸 Tips", B.tips], ["🔥 Streaks", B.streak], ["👥 Whole tables", B.group], ["🏆 Level bonus", B.level], ["📺 Bonus", B.bonus], ["❌ Mistakes", B.penalty]];
    $("final").textContent = Math.round(og.score).toLocaleString() + " pts";
    $("stats").textContent = modeBadge() + " mode · reached level " + og.level + " · " + og.served + " plates · $" + og.usd.toFixed(2) + " earned ($" + og.tipsUsd.toFixed(2) + " tips) · " + og.hotDeliv + " served 🔥 hot · " + og.perfect + " perfect · best streak " + og.best;
    $("brk").innerHTML = rows.filter(function (r) { return r[1]; }).map(function (r) { return "<span>" + r[0] + "</span><b" + (r[1] < 0 ? ' class="neg"' : "") + ">" + (r[1] > 0 ? "+" : "") + r[1].toLocaleString() + "</b>"; }).join("");
    var s = og.score, P = (MODE === "kid" && W.GNW_PRIZES_KID) || W.GNW_PRIZES || [], prize = "";
    for (var i = 0; i < P.length; i++) if (s >= P[i][0]) { prize = P[i][1]; break; }
    var nk = MODE === "kid" ? kidNick() : "";
    $("rank").textContent = (nk ? "Great job, " + nk + "! " : "") + (prize ? "🏆 You won " + prize : (why === "walk" ? "3 walk-outs: kitchen's closed!" : "Kitchen's closed!") + " Try again while you wait");
    ["nickbox", "nicknote"].forEach(function (id) { var x = $(id); if (x) x.remove(); });
    if (MODE === "kid") $("brk").insertAdjacentHTML("afterend", '<div id="nickbox" style="max-width:290px;margin:4px auto;display:flex;gap:6px"><input id="nick" maxlength="16" placeholder="Nickname (optional)" value="' + esc(nk) + '" aria-label="Nickname for the score screen, saved on this phone only" style="flex:1;min-width:0;font:700 15px var(--body);padding:9px 10px;border-radius:10px;border:1px solid #ffffff44;background:#ffffff14;color:#fff"><button type="button" class="btn" id="nicksave" style="padding:9px 12px">Save</button></div><p id="nicknote" style="margin:0 auto 6px;max-width:290px;font-size:11.5px;color:#E8DCF5">Nickname stays on this phone only. Never sent anywhere.</p>');
    var nb = $("nicksave"); if (nb) nb.onclick = function () { try { localStorage.setItem("gnw-kid-nick", $("nick").value.trim().slice(0, 16)); } catch (e) {} nb.textContent = "Saved ✓"; };
    var won = $("won"); won.style.display = "none";
    if (prize && W.SSAI_WIN) {
      var kidP = MODE === "kid", KR = W.SSAI_KID_RULE || "Kid prize — redeemable with the young player at the table, one per kid per visit.";
      var kidH = kidP ? "<br><span style=\"display:inline-block;margin:6px 0 2px;background:#F2C14E;color:#1E1B3A;font:900 12px var(--body);border-radius:99px;padding:3px 10px\">🧒 KID PRIZE</span><br><span style=\"font-weight:700;font-size:12.5px;color:#FFE9A3\">" + KR + "</span>" : "";
      var w = W.SSAI_WIN(prize.replace(/^an? /, ""), kidP ? { kid: true } : null);
      var showWin = function () {
        if (w.blocked) won.innerHTML = "🏆 You'd win " + prize + ", but you already have <b>" + w.prize.t + "</b> waiting (code " + w.prize.c + ").<br><span style=\"font-weight:600;font-size:13px;color:#e8dcf5\">Use it by " + w.until + ", then your next win saves. One reward at a time.</span>";
        else won.innerHTML = "🏆 You won " + prize + "!" + kidH + "<br><span style=\"font:900 22px ui-monospace,Menlo,monospace;color:#F2C14E;letter-spacing:.1em\">" + w.prize.c + "</span><br><span style=\"font-weight:600;font-size:13px;color:#e8dcf5\">" + (w.saved || W.SSAI_GATE ? (kidP ? "Saved to the parent's rewards account. Show your server with the young player at the table. Good for 3 days." : "Saved to your rewards. Show your server to redeem. Good for 3 days.") : "Join Gritz N Wafflez Rewards below to save it.") + "</span>";
        won.style.display = "block";
      };
      if (w.saved || !W.SSAI_GATE) showWin();
      else { won.innerHTML = (w.blocked ? "🏆 You'd win " + prize + ", but you already have <b>" + w.prize.t + "</b> waiting." : "🏆 You won " + prize + "!") + kidH + "<br><span style=\"font-weight:600;font-size:13px;color:#e8dcf5\">" + (kidP ? "A parent or guardian saves it to their Gritz N Wafflez Rewards." : "Save it to your Gritz N Wafflez Rewards to get your code.") + "</span><button class=\"btn hot\" type=\"button\" id=\"wsave\" style=\"width:100%;justify-content:center;margin-top:8px\">🎁 Save my prize</button>"; won.style.display = "block";
        $("wsave").onclick = function () { W.SSAI_GATE(kidP ? "kidprize" : "prize", showWin); }; }
    }
    if (W.ReviewEgg && !og.sim) W.ReviewEgg.endCard($("over"), $("over").querySelector(".btns"));
    $("over").classList.add("on");
    if (!og.sim) $("og").scrollIntoView({ block: "end", behavior: RM ? "auto" : "smooth" });
  }

  /* ================= INPUT ================= */
  ou.addEventListener("click", function (e) {
    var t = e.target; if (!t.closest) return;
    if (t.closest("#poster")) { e.preventDefault(); return openPoster(); }
    if (t.closest("#pback")) { return closePoster(); }
    if (og.demo) return;
    var b = t.closest("button,[data-tb],.plt img,.cupz img"); if (!b || !ou.contains(b)) return;
    if (b.dataset.ps != null) return pickPass(+b.dataset.ps);
    if (b.dataset.st) return pull(b.dataset.st, +b.dataset.i);
    if (b.dataset.tb) return tapTable(+b.dataset.tb);
    if (b.closest("#grid") && b.dataset.k) return tap(b.dataset.k);
    if (b.tagName === "IMG" && b.dataset.k) return tap(b.dataset.k);
    if (b.id === "undo") return undo(); if (b.id === "trash") return clearPlate(); if (b.id === "serve") return serve();
  });

  /* ================= API (start menu, tests, bot) ================= */
  W.__OG = {
    get: function () { return og; }, start: function () { attract(false); start(); }, attract: attract, mode: function () { return MODE; }, setMode: setMode, requestMode: requestMode,
    resetMode: function () { MODE = ""; try { localStorage.removeItem("gnw-mode"); } catch (e) {} hud(); best(); menuRefresh(); }, lvParams: lvParams, ITEMS: ITEMS, DISHES: DISHES, SERVERS: SERVERS, GUESTS: GU, theme: TH_ID, hair: HAIR,
    sim: function (on) { og.sim = !!on; }, step: function (ms) { var n = Math.ceil(ms / 50); for (var i = 0; i < n && og.running; i++) step(50); },
    render: render, tap: tap, undo: undo, clear: clearPlate, serve: serve, pick: pickPass, table: tapTable, needs: needs, unlocked: unlocked, pull: pull, cookAt: cookAt, stationsFor: stationsFor, COOK: COOK, quality: quality, cookLeft: cookLeft, howCook: function (k, cb) { howCook(k === "full" ? "full" : "fry", cb); },
    levelUp: function () { og.lt = 1; }, jPose: function (p, ms, b) { jPose(p, ms || 1500, b); }, jGoodbye: jGoodbye, jDeliverTest: function (id) { var tb = og.tables[id - 1]; jDeliver(tb, 0, DISHES[2]); }, end: end, openPoster: openPoster,
    jurni: function () { return { x: J.x, y: J.y, inK: !!J.inK, mode: J.mode, task: !!J.task }; }, furniture: furniture, route: route, navNodes: navNodes,
    people: function () { return [{ k: "jurni", x: J.x, y: J.y, hid: !!J.inK }].concat(og.trips.filter(function (t) { return t.x != null && t.y <= dsz().h; }).map(function (t) { return { k: "server", x: t.x, y: t.y }; }), WK.filter(function (w) { return !w.dead; }).map(function (w) { return { k: "guest", x: w.x, y: w.y }; })); },
    jCheck: function (id) { jCheck(og.tables[id - 1]); }, posterWatchNow: function () { og.pwNext = og.now; og.pw = null; }, pw: function () { return og.pw ? { x: og.pw.x, y: og.pw.y, rx: (og.pw.el.querySelector(".rx") || {}).textContent || "" } : null; }, jDance: function () { jDance(); }, jKitchen: function () { jKitchen(); }, jDoor: function () { jDoorIdle(); },
    seatTest: function (ids, tableId) { var tb = og.tables[tableId - 1]; seat(tb, { ids: ids, kind: "test" }); }
  };
  $("startov").addEventListener("click", function () { if (W.GameMenu) W.GameMenu.open(); else start(); });
  drawPass(); drawRail(); buildGrid(); hud(); jReset();
})();
