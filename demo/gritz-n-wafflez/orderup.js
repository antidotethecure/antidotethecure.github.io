/* Order Up! — Gritz N Wafflez kitchen + dining room game (SousShift AI demo).
   KITCHEN: real cooking stations. Fryer (catfish, tenderz, wingz, shrimp), waffle irons, skillet (eggs, bacon), gritz pot.
   Every cooked item tracks DONENESS d = time cooking / its cook time: 0 raw → 1 perfect → 2 charred. Pull it out and it
   lands in the warming tray with its doneness frozen; the tray keeps it fresh for a while, then it goes cold.
   DINING ROOM: 5 tables (2-tops and 4-tops). Parties of 1–4 sit down, every guest orders their own plate, the table shares
   one patience bar. Build a plate from tray items + toppings, ring Serve, and a server walks it to the table.
   LEVELS: 90 s each. Survive with fewer than 3 walk-outs to pass; each level adds stations, dishes, special requests,
   bigger parties, faster arrivals and less patience.
   SCORING (fine-grained so ties are rare): Orders (30 per item, 20 per special request) + Speed (continuous, from the
   moment the party sits, to 0.1 s, plus a tier bonus) + Quality (continuous per cooked item, max at perfect doneness)
   + Streak multiplier (consecutive perfect, fast plates) + Group bonus (whole table served within 10 s) + Tips (speed,
   quality, mood and the guest's personality) + Level bonus − penalties. The end screen shows the breakdown.
   Jurni (the owner) delivers big orders ("Owner's special!"), pops up when a table gets impatient or a big tip lands,
   and dances when you clear a level. Her mohawk color changes daily; seasonal themes by LA date
   (?theme=halloween|thanksgiving|christmas|newyear|valentine|stpat|july4|none, ?hair=blue|lime|purple|turquoise|pink|rainbow|gold).
   Test/bot API: window.__OG (sim mode + step(ms) + action functions). */
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

  /* ================= MENU DATA ================= */
  // st: cooking station · T: ms to perfect · fresh: ms it stays good in the warming tray
  var ITEMS = {
    waffle: { n: "Waffle", img: "waffle_plain", kind: "base", st: "iron", T: 6000, fresh: 22000 },
    gritz: { n: "Gritz", img: "grits", kind: "side", st: "pot" },
    catfish: { n: "Catfish", img: "catfish", kind: "protein", st: "fry", T: 7000, fresh: 28000 },
    tenderz: { n: "Tenderz", img: "tenderz", kind: "protein", st: "fry", T: 6000, fresh: 28000 },
    chicken: { n: "Wingz", img: "chicken", kind: "protein", st: "fry", T: 8000, fresh: 30000 },
    shrimp: { n: "Shrimp", img: "shrimp", kind: "protein", st: "fry", T: 4500, fresh: 24000 },
    egg: { n: "Eggs", img: "egg", kind: "protein", st: "skil", T: 3500, fresh: 18000 },
    bacon: { n: "Bacon", img: "bacon", kind: "protein", st: "skil", T: 5000, fresh: 30000 },
    ftoast: { n: "French toast", img: "ftoast", kind: "base" }, ttoast: { n: "Texas toast", img: "ttoast", kind: "base" },
    fgritz: { n: "Fried Cheese Gritz", img: "fgritz", kind: "side" }, mac: { n: "Smackin' Mac", img: "mac", kind: "side" }, dip: { n: "Collard Dip", img: "dip", kind: "side" },
    cheese: { n: "Cheese", img: "cheese", kind: "top" }, butter: { n: "Butter", img: "butter", kind: "top" }, syrup: { n: "Syrup", img: "drizzle", kind: "top" },
    berriez: { n: "Berriez", img: "berriez", kind: "top" }, peach: { n: "Peach cobbler", img: "peach", kind: "top" }, whip: { n: "Whipped cream", img: "whip", kind: "top" },
    sauce: { n: "Signature Sauce", img: "sauce", kind: "cup" }, hot: { n: "Hot sauce", img: "hotsauce", kind: "cup" },
    kiki: { n: "Kiki Palmer", img: "kiki", kind: "drink" }, oj: { n: "Fresh OJ", img: "oj", kind: "drink" }
  };
  var DISHES = [
    { n: "Wingz N' Wafflez", r: ["waffle", "chicken", "syrup"], ph: "wingz-wafflez", lv: 1 },
    { n: "Tenderz N' Wafflez", r: ["waffle", "tenderz", "syrup"], ph: "tenderz-wafflez", lv: 1 },
    { n: "Catfish N' Wafflez", r: ["waffle", "catfish"], ph: "catfish-wafflez", lv: 1 },
    { n: "Catfish N' Gritz", r: ["gritz", "catfish"], ph: "catfish-gritz", lv: 1 },
    { n: "Tenderz N' Gritz", r: ["gritz", "tenderz"], ph: "tenderz-gritz", lv: 1 },
    { n: "Shrimp N' Gritz", r: ["gritz", "shrimp"], ph: "shrimp-gritz", lv: 2 },
    { n: "Shrimp N' Wafflez", r: ["waffle", "shrimp"], ph: "shrimp-wafflez", lv: 2 },
    { n: "Wingz N' Gritz", r: ["gritz", "chicken"], ph: "wingz-gritz", lv: 2 },
    { n: "Peach Cobbler Waffle", r: ["waffle", "peach", "butter"], ph: "peach-waffle", lv: 2 },
    { n: "Waffle Plate", r: ["waffle", "egg", "bacon"], ph: "waffle-plate", lv: 3 },
    { n: "BET Breakfast Plate", r: ["bacon", "egg", "ttoast"], ph: "bet-plate", lv: 3 },
    { n: "French Toast Plate", r: ["ftoast", "bacon", "egg"], ph: "french-toast", lv: 3 },
    { n: "Classic French Toast", r: ["ftoast", "butter", "syrup"], ph: "classic-ftoast", lv: 3 },
    { n: "Loaded French Toast", r: ["ftoast", "berriez", "whip", "syrup"], ph: "loaded-ftoast", lv: 4 },
    { n: "BET+ Breakfast Plate", r: ["bacon", "egg", "ttoast", "gritz"], ph: "bet-plate", lv: 4 },
    { n: "Da Baddest Chick Sandwich", r: ["ttoast", "tenderz", "bacon", "egg", "cheese"], ph: "baddest-chick", lv: 4 },
    { n: "Fried Cheese Gritz", r: ["fgritz"], ph: "cheese-gritz-bites", lv: 4 },
    { n: "Original Collard Green Dip", r: ["dip"], ph: "collard-dip", lv: 4 }
  ];
  // what each level unlocks (cumulative)
  var UNLOCK = {
    1: { fry: ["catfish", "tenderz", "chicken"], baskets: 2, irons: 1, skil: [], bins: ["syrup", "butter", "kiki"], mods: 0, drink: 0.12 },
    2: { fry: ["catfish", "tenderz", "chicken", "shrimp"], baskets: 2, irons: 2, skil: [], bins: ["syrup", "butter", "peach", "cheese", "sauce", "hot", "kiki", "oj"], mods: 0.3, drink: 0.25 },
    3: { fry: ["catfish", "tenderz", "chicken", "shrimp"], baskets: 3, irons: 2, skil: ["egg", "bacon"], bins: ["syrup", "butter", "peach", "cheese", "sauce", "hot", "ttoast", "ftoast", "kiki", "oj"], mods: 0.35, drink: 0.3 },
    4: { fry: ["catfish", "tenderz", "chicken", "shrimp"], baskets: 3, irons: 2, skil: ["egg", "bacon"], bins: ["syrup", "butter", "peach", "cheese", "berriez", "whip", "sauce", "hot", "ttoast", "ftoast", "fgritz", "dip", "kiki", "oj"], mods: 0.45, drink: 0.35 }
  };
  function U(L) { return UNLOCK[Math.min(4, L)]; }
  function lvParams(L) {   // difficulty ramp
    return { arrive: Math.max(4, 12 - 1.9 * (L - 1)), pat: Math.max(20, 58 - 8 * (L - 1)), extra: 10 };
  }
  var LEVEL_MS = 90000, MAX_WALK = 3;

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
  function inUse() { var u = {}; og.tables.forEach(function (tb) { (tb.guests || []).forEach(function (g) { u[g.id] = 1; }); }); return u; }
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
    var u = U(L), pool = DISHES.filter(function (d) { return d.lv <= Math.min(4, L); });
    if (kid) pool = pool.filter(function (d) { return d.r.length <= 3 && d.lv <= 2; });
    var d = pick(pool), o = { dish: d, r: d.r.slice(), add: [], no: [] };
    var prot = o.r.some(function (k) { return ITEMS[k].st === "fry"; });
    if (!kid && prot && u.bins.indexOf("sauce") >= 0 && Math.random() < u.mods) { var x = Math.random() < 0.6 ? "sauce" : "hot"; o.r.push(x); o.add.push(x); }
    if (!kid && o.r.indexOf("gritz") >= 0 && o.r.indexOf("cheese") < 0 && u.bins.indexOf("cheese") >= 0 && Math.random() < u.mods * 0.7) { o.r.push("cheese"); o.add.push("cheese"); }
    var opt = o.r.filter(function (k) { return ["syrup", "butter", "cheese", "whip", "berriez"].indexOf(k) >= 0 && o.add.indexOf(k) < 0; });
    if (!kid && opt.length && Math.random() < u.mods) { var nk = pick(opt); o.r.splice(o.r.indexOf(nk), 1); o.no.push(nk); }
    if (!kid && !o.no.length && o.r.indexOf("gritz") >= 0 && o.r.indexOf("cheese") < 0 && Math.random() < u.mods * 0.4) o.no.push("cheese");
    if (o.r.length < 6 && Math.random() < (kid ? 0.5 : u.drink)) { var dk = kid || u.bins.indexOf("oj") < 0 ? "kiki" : pick(["kiki", "oj"]); o.r.push(dk); o.drink = dk; }
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
    ".ou2{position:relative;border-radius:14px;overflow:hidden;background:#f6efe0;padding:6px;user-select:none;-webkit-user-select:none;touch-action:manipulation;color:var(--ink)}",
    ".ou2 *{box-sizing:border-box}",
    // dining room
    ".din{position:relative;height:152px;border-radius:12px;overflow:hidden;background:repeating-linear-gradient(90deg,#c8955c 0 22px,#bd8a52 22px 44px);box-shadow:inset 0 0 0 2px #8a5a2c55}",
    ".din:before{content:'';position:absolute;inset:0;background:radial-gradient(120% 70% at 50% 0,#fff3d688,transparent 70%);pointer-events:none}",
    ".din .door{position:absolute;left:0;top:44%;width:16px;height:46px;border-radius:0 6px 6px 0;background:#5a3a26;box-shadow:inset -3px 0 0 #3b2414}",
    ".din .passw{position:absolute;left:53%;bottom:0;transform:translateX(-50%);width:58px;height:12px;border-radius:8px 8px 0 0;background:#3B1F5C;color:#F2C14E;font:900 8px/12px var(--body);text-align:center;letter-spacing:.12em}",
    ".tb{position:absolute;transform:translate(-50%,-62%);width:var(--w);height:74px;pointer-events:none}",
    ".tb .gs{position:absolute;left:0;right:0;bottom:24px;height:40px;display:flex;justify-content:center;gap:0}",
    ".tb .gq{position:relative;width:26px;height:40px;overflow:visible;transition:transform .5s cubic-bezier(.34,1.4,.64,1),opacity .4s;transform:translateY(14px);opacity:0}",
    ".tb .gq.in{transform:none;opacity:1}.tb .gq.out{transform:translateX(-70px);opacity:0;transition:transform .9s ease-in,opacity .9s}",
    ".tb .gq .im{position:absolute;left:-4px;right:-4px;top:0;height:40px;overflow:hidden}.tb .gq img.p{width:100%;height:auto;display:block}",
    ".tb .gq.imp .im{animation:gTap .5s ease-in-out infinite}.tb .gq.mad .im{animation:gTap .25s ease-in-out infinite;filter:drop-shadow(0 0 4px #e0473a)}",
    "@keyframes gTap{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg)}}",
    ".tb .gq .md{position:absolute;right:-6px;top:-4px;font-size:14px;line-height:1;filter:drop-shadow(0 1px 1px #0006);z-index:3}",
    ".tb .gq.mad .md{animation:steam .8s ease-out infinite}@keyframes steam{0%{transform:translateY(0);opacity:1}100%{transform:translateY(-8px);opacity:.3}}",
    ".tb .gq .ok{position:absolute;left:-3px;top:-3px;width:14px;height:14px;border-radius:50%;background:#3fbf6f;color:#fff;font:900 9px/14px var(--body);text-align:center;z-index:3;display:none}.tb .gq.got .ok{display:block}",
    ".tb .tt{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);height:20px;border-radius:12px;background:linear-gradient(180deg,#fffdf7,#e9dcc0);box-shadow:0 4px 0 #8a5a2c,0 8px 10px #0003;z-index:2;display:flex;align-items:center;justify-content:center;gap:2px}",
    ".tb.c2 .tt{width:48px}.tb.c4 .tt{width:96px}",
    ".tb .tt img{width:15px;height:15px;border-radius:50%;object-fit:cover;border:1.5px solid #fff;box-shadow:0 1px 2px #0005}",
    ".tb .tn{position:absolute;left:50%;bottom:-2px;transform:translateX(-50%);font:900 9px var(--body);color:#fff;background:#3B1F5C;border-radius:99px;padding:1px 6px;z-index:3}",
    ".tb .pb{position:absolute;left:50%;bottom:3px;transform:translateX(-50%);width:44px;height:4px;border-radius:3px;background:#0003;overflow:hidden;z-index:3;display:none}.tb.wait .pb{display:block}.tb .pb i{display:block;height:100%;background:#3fbf6f}",
    ".tb .dirt{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);font-size:16px;z-index:3;display:none}.tb.dirty .dirt{display:block}",
    ".tb .flash{position:absolute;inset:-6px;border-radius:50%;background:radial-gradient(#fff,#fff0 70%);opacity:0;z-index:4;pointer-events:none}.tb .flash.on{animation:camf .6s ease-out}",
    "@keyframes camf{0%{opacity:1;transform:scale(.4)}100%{opacity:0;transform:scale(1.4)}}",
    ".srv{position:absolute;left:0;top:0;width:30px;height:48px;z-index:6;pointer-events:none;will-change:transform}",
    ".srv .sv{width:100%;height:100%;animation:bob .32s ease-in-out infinite alternate}.srv.idle .sv{animation:none}",
    "@keyframes bob{from{transform:translateY(0) rotate(-3deg)}to{transform:translateY(-3px) rotate(3deg)}}",
    ".srv .cp{position:absolute;left:-6px;top:6px;width:24px;height:24px;border-radius:50%;object-fit:cover;border:2px solid #fff;box-shadow:0 2px 4px #0006}",
    ".srv.j{width:46px;height:78px}.srv.j .jw{display:block;width:100%;height:100%;animation:bob .34s ease-in-out infinite alternate}",
    ".srv .sp{position:absolute;left:50%;top:-14px;transform:translateX(-50%);white-space:nowrap;font:900 9px var(--body);color:#3B1F5C;background:#F2C14E;border-radius:99px;padding:2px 6px;box-shadow:0 2px 6px #0004}",
    ".jw{position:relative;display:inline-block}.jw img{display:block;width:100%;height:100%;object-fit:contain;object-position:bottom}.jw .hat{position:absolute;height:auto;pointer-events:none}",
    // Jurni pop-up (stays in the dining room: never over the kitchen stations)
    ".jpop{position:absolute;right:-130px;bottom:2px;width:80px;height:140px;z-index:9;pointer-events:none;transition:right .45s cubic-bezier(.34,1.4,.64,1)}",
    ".jpop.on{right:2px;animation:jb .5s .4s}.jpop:not(.on) .bb{display:none}.jpop .jw{width:100%;height:100%}@keyframes jb{0%,100%{transform:none}40%{transform:translateY(-8px)}}",
    ".jpop .bb{position:absolute;right:84px;top:10px;width:116px;background:#fff;color:#3B1F5C;border-radius:14px 14px 4px 14px;padding:6px 8px;font:900 11px/1.2 var(--body);box-shadow:0 4px 12px #0004}",
    // level up / banner
    ".lvb{position:absolute;inset:0;z-index:20;display:none;align-items:flex-start;justify-content:center;background:radial-gradient(#3b1f5c99,#1e1b3acc);pointer-events:none}.lvb.on{display:flex}",
    ".lvb h3{margin:14px 0 0;font:900 italic 34px var(--serif);color:#F2C14E;text-shadow:0 3px 0 #000a;animation:lvIn .6s cubic-bezier(.34,1.6,.64,1)}",
    ".lvb p{position:absolute;top:54px;padding:0 10px;left:0;right:0;text-align:center;margin:0;font:800 12px var(--body);color:#fff}",
    "@keyframes lvIn{from{transform:scale(.3);opacity:0}to{transform:none;opacity:1}}",
    ".dance{position:absolute;left:50%;top:70%;width:58px;height:96px;transform:translate(-50%,-50%);z-index:13}",
    ".dance .jw{width:100%;height:100%}.dance.go .jw{animation:spin 1.1s cubic-bezier(.4,1.5,.6,1) 2}",
    "@keyframes spin{0%{transform:rotateY(0) translateY(0)}25%{transform:rotateY(180deg) translateY(-14px) scale(1.05,.95)}50%{transform:rotateY(360deg) translateY(0) scale(.95,1.05)}75%{transform:rotateY(360deg) translateY(-10px)}100%{transform:rotateY(360deg) translateY(0)}}",
    ".dance .tray{position:absolute;left:-26px;top:38%;display:flex;gap:2px}.dance .tray img{width:20px;height:auto}",
    ".spk{position:absolute;font-size:16px;z-index:14;pointer-events:none;animation:spk 1.2s ease-out forwards}@keyframes spk{0%{transform:scale(.2);opacity:1}100%{transform:translate(var(--dx),var(--dy)) scale(1.2);opacity:0}}",
    // theme effects
    ".fxl{position:absolute;inset:0;pointer-events:none;z-index:1;overflow:hidden}",
    ".fxl i{position:absolute;font-style:normal;opacity:.75;animation-iteration-count:infinite;animation-timing-function:linear}",
    ".fxl.float i{animation-name:fxFloat}.fxl.fall i,.fxl.snow i{animation-name:fxFall}.fxl.snow i{color:#fff;text-shadow:0 0 4px #9cf}.fxl.burst i{animation-name:fxBurst;animation-timing-function:ease-out}",
    "@keyframes fxFloat{0%{transform:translate(-30px,0)}50%{transform:translate(20px,-14px)}100%{transform:translate(380px,6px)}}",
    "@keyframes fxFall{0%{transform:translate(0,-30px) rotate(0)}100%{transform:translate(30px,240px) rotate(300deg)}}",
    "@keyframes fxBurst{0%{transform:scale(.2);opacity:0}20%{opacity:1}100%{transform:scale(1.6);opacity:0}}",
    ".decor{position:absolute;right:6px;top:4px;z-index:2;font-size:15px;letter-spacing:2px;pointer-events:none}",
    ".lights{position:absolute;left:0;right:0;top:0;height:10px;z-index:2;background:radial-gradient(circle,#ff4d4d 2.5px,transparent 3px) 0 2px/18px 10px,radial-gradient(circle,#3fd16f 2.5px,transparent 3px) 9px 4px/18px 10px;animation:tw 1s steps(2) infinite;pointer-events:none}@keyframes tw{50%{filter:brightness(1.6)}}",
    ".ou2.th-halloween .din{background:repeating-linear-gradient(90deg,#7a4a8c 0 22px,#6d3f80 22px 44px)}.ou2.th-halloween .din:before{background:radial-gradient(120% 70% at 50% 0,#ff9a3c55,transparent 70%)}",
    ".ou2.th-christmas .din{background:repeating-linear-gradient(90deg,#c8955c 0 22px,#bd8a52 22px 44px)}.ou2.th-christmas .din:before{background:linear-gradient(#ffffff55,transparent 40%)}",
    ".ou2.th-thanksgiving .din:before{background:radial-gradient(120% 70% at 50% 0,#ff8c3a55,transparent 70%)}",
    // rail (tickets)
    ".rail{display:flex;gap:5px;overflow-x:auto;padding:7px 2px 3px;margin:0;min-height:66px;scrollbar-width:none;-webkit-overflow-scrolling:touch}.rail::-webkit-scrollbar{display:none}",
    ".rail .none{color:#6E5F72;font:700 12px var(--body);padding:16px 8px}",
    ".tk{flex:none;width:104px;background:#fff;border:2px solid #3fbf6f;border-radius:12px;padding:4px 5px 5px;box-shadow:0 3px 8px #1e1b3a22;position:relative}",
    ".tk.warn{border-color:#f0b429}.tk.bad{border-color:#e0473a;animation:wob2 .5s infinite}@keyframes wob2{0%,100%{transform:rotate(-1.5deg)}50%{transform:rotate(1.5deg)}}",
    ".tk .h{display:flex;align-items:center;gap:4px}.tk .h img{width:22px;height:22px;border-radius:50%;object-fit:cover;flex:none;border:2px solid #F2C14E}",
    ".tk .h b{font:800 9.5px/1.1 var(--body);color:#3B1F5C}.tk .t{position:absolute;right:4px;top:-8px;background:#3B1F5C;color:#fff;font:900 9px var(--body);border-radius:99px;padding:1px 6px}",
    ".tk .its{display:flex;flex-wrap:wrap;gap:1px;margin-top:2px}.tk .its img{width:17px;height:17px;object-fit:contain}",
    ".tk .mods{display:flex;flex-wrap:wrap;gap:2px;margin-top:1px}.tk .mods span{font:900 8px var(--body);border-radius:5px;padding:1px 3px}.tk .mods .ad{background:#3fbf6f22;color:#1d7a44}.tk .mods .no{background:#e0473a22;color:#b8322a}",
    ".tk .pr{font-size:10px;position:absolute;left:4px;top:-8px}",
    // kitchen
    ".kit{display:grid;grid-template-columns:1fr 1fr;gap:5px}",
    ".pn{position:relative;background:#2b1a40;border-radius:12px;padding:3px 4px 4px;color:#fff;min-width:0}",
    ".pn .ph{font:900 9px/11px var(--body);letter-spacing:.08em;color:#F2C14E;text-transform:uppercase;display:flex;justify-content:space-between}",
    ".pn .lk{position:absolute;inset:0;border-radius:12px;background:#1e1b3ad9;display:grid;place-items:center;font:900 12px var(--body);color:#F2C14E;text-align:center;z-index:3}",
    ".slots{display:flex;justify-content:center;gap:5px;margin-top:2px}",
    ".sl{position:relative;width:46px;height:46px;border-radius:50%;border:0;padding:0;cursor:pointer;background:conic-gradient(var(--c,#999) calc(var(--p,0)*1turn),#ffffff22 0);-webkit-tap-highlight-color:transparent;touch-action:manipulation}",
    ".sl:active{transform:scale(.93)}.sl .in{position:absolute;inset:4px;border-radius:50%;background:#1a1028;display:grid;place-items:center;overflow:visible}",
    ".sl.fry .in{background:radial-gradient(#c98a1e,#7a4a0c)}.sl.fry .in:after{content:'';position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle,#fff6 1.5px,transparent 2px) 0 0/9px 9px;animation:oil .5s linear infinite;opacity:0}.sl.fry.on .in:after{opacity:1}",
    "@keyframes oil{to{background-position:0 -9px}}",
    ".sl.iron{border-radius:12px}.sl.iron .in{border-radius:9px;background:repeating-linear-gradient(0deg,#3a3a44 0 6px,#2a2a33 6px 8px),#333}",
    ".sl.skil .in{background:radial-gradient(#444,#111)}",
    ".sl img{width:32px;height:32px;object-fit:contain;transition:filter .3s}.sl .lb{position:absolute;left:50%;bottom:-7px;transform:translateX(-50%);font:900 8px var(--body);background:#000a;color:#fff;border-radius:99px;padding:1px 5px;white-space:nowrap;z-index:2}",
    ".sl .lt{position:absolute;right:2px;top:2px;width:9px;height:9px;border-radius:50%;background:#e0473a;box-shadow:0 0 6px #e0473a;z-index:2}.sl .lt.g{background:#3fe07a;box-shadow:0 0 8px #3fe07a}",
    ".sl .stm{position:absolute;left:50%;top:-8px;width:20px;height:20px;margin-left:-10px;border-radius:50%;background:radial-gradient(#fffd,#fff0 70%);animation:stm 1.4s ease-out infinite;pointer-events:none;z-index:2}",
    "@keyframes stm{0%{transform:translateY(8px) scale(.5);opacity:0}30%{opacity:.9}100%{transform:translateY(-18px) scale(1.5);opacity:0}}",
    ".sl .smk{position:absolute;inset:-6px;border-radius:50%;background:radial-gradient(#555c,#5550 70%);animation:stm 1s ease-out infinite;pointer-events:none}",
    ".drops{display:flex;justify-content:center;gap:3px;margin-top:4px}.drops button{width:35px;height:32px;border-radius:10px;border:1px solid #ffffff33;background:#ffffff14;padding:1px;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation}",
    ".drops button img{width:22px;height:22px;object-fit:contain;display:block;margin:0 auto}.drops button span{display:block;font:800 7px/1 var(--body);color:#E8DCF5}.drops button:active{transform:scale(.92)}",
    ".pot{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:2px}",
    ".pot .sl{background:conic-gradient(var(--c,#3fbf6f) calc(var(--p,1)*1turn),#ffffff22 0)}.pot .sl .in{background:radial-gradient(#fff8e0,#e8d79a)}",
    ".pot .st{width:46px;height:46px;border-radius:12px;border:1px solid #ffffff33;background:#ffffff14;color:#fff;font:900 11px/1.1 var(--body);cursor:pointer;touch-action:manipulation}",
    // pass: plate + warming tray
    ".pass2{display:grid;grid-template-columns:98px 1fr 82px;gap:5px;margin-top:5px;align-items:stretch}",
    ".plt{position:relative;width:98px;height:98px;cursor:pointer}.plt .pl{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 6px 8px #0004)}",
    ".plt .st img{position:absolute;height:auto;object-fit:contain;filter:drop-shadow(0 3px 4px #0004);transition:transform .3s cubic-bezier(.34,1.56,.64,1)}",
    ".plt .dn{position:absolute;left:0;right:0;bottom:-4px;display:flex;flex-wrap:wrap;justify-content:center;gap:2px;z-index:20}.plt .dn span{font:900 8px var(--body);border-radius:99px;padding:1px 5px;color:#fff;box-shadow:0 1px 3px #0005}",
    ".plt .cupz{position:absolute;right:-6px;top:-2px;display:flex;flex-direction:column;gap:2px;z-index:15}.plt .cupz img{width:22px;height:auto;max-height:44px;object-fit:contain}",
    ".tray{background:linear-gradient(180deg,#9aa0a8,#6d737c);border-radius:12px;padding:5px;box-shadow:inset 0 2px 0 #fff5}",
    ".tray .ph{font:900 9px var(--body);letter-spacing:.08em;color:#fff;text-transform:uppercase;display:flex;justify-content:space-between}",
    ".tray .ts{display:grid;grid-template-columns:repeat(3,1fr);gap:3px;margin-top:2px}",
    ".ti{position:relative;height:38px;border-radius:9px;border:0;background:#ffffff33;padding:0;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}",
    ".ti img{width:30px;height:30px;object-fit:contain;display:block;margin:1px auto 0}.ti .fr{position:absolute;left:3px;right:3px;bottom:2px;height:3px;border-radius:2px;background:#0003;overflow:hidden}.ti .fr i{display:block;height:100%;background:#3fbf6f}",
    ".ti .dl{position:absolute;right:1px;top:1px;width:9px;height:9px;border-radius:50%;border:1px solid #fff}.ti:empty{background:#ffffff1a}.ti.cold{animation:wob2 .4s infinite}",
    ".bins2{display:grid;grid-template-columns:repeat(8,1fr);gap:3px;margin-top:5px}",
    ".bins2 button{position:relative;background:#fff;border:2px solid #e6d6ae;border-radius:10px;padding:2px 1px 3px;cursor:pointer;display:flex;flex-direction:column;align-items:center;font:800 7.5px/1.05 var(--body);color:var(--purple);text-align:center;min-height:42px;-webkit-tap-highlight-color:transparent;touch-action:manipulation;overflow:hidden}",
    ".bins2 button img{width:26px;height:26px;object-fit:contain;pointer-events:none}.bins2 button.on{border-color:var(--gold);background:#fff4d2}.bins2 button:active{transform:scale(.92)}",
    ".acts2{display:grid;grid-template-rows:1fr auto;gap:5px}.acts2 button{border:0;border-radius:14px;padding:6px 4px;font:900 15px/1.1 var(--body);cursor:pointer;touch-action:manipulation}.acts2 .tr{font-size:11px}",
    ".acts2 .tr{background:#fff;color:var(--purple);border:2px solid #e6d6ae}.acts2 .sv2{background:linear-gradient(180deg,var(--gold2),var(--gold));color:#2a1e36;box-shadow:0 5px 0 #a27512}.acts2 .sv2:active{transform:translateY(3px);box-shadow:0 2px 0 #a27512}",
    ".fl2{position:absolute;left:0;right:0;top:60px;display:grid;place-items:center;font:900 20px var(--body);color:#fff;text-shadow:0 2px 10px #000c;pointer-events:none;opacity:0;text-align:center;z-index:11}.fl2.on{animation:fl 1.1s ease-out}",
    ".pop2{position:absolute;font:900 14px var(--body);color:#f2c14e;text-shadow:0 2px 6px #000b;pointer-events:none;animation:up 1.2s ease-out forwards;z-index:15;white-space:nowrap}",
    ".startov2{position:absolute;inset:0;background:#2b1a40e6;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:#fff;cursor:pointer;text-align:center;z-index:30;padding:20px}",
    ".startov2 b{font:900 italic 40px var(--serif);color:var(--gold2)}.startov2 span{font:800 18px var(--body)}.startov2.off{display:none}",
    ".brk{display:grid;grid-template-columns:1fr auto;gap:2px 12px;max-width:290px;margin:8px auto 4px;font:700 13.5px var(--body);color:#E8DCF5;text-align:left}.brk b{color:#F2C14E;text-align:right}.brk .neg{color:#ff8a7a}",
    "html.th-halloween .mark{box-shadow:0 0 0 6px var(--cream),0 0 0 7px #e0782a,0 18px 40px #6a2c9a33}html.th-christmas .mark{box-shadow:0 0 0 6px var(--cream),0 0 0 7px #2f8f4e,0 18px 40px #b8322a33}",
    ".thb{display:inline-block;margin:8px 0 0!important;font:800 13px var(--body);color:#2A1E36!important;background:#fff;border:1px dashed var(--gold);border-radius:999px;padding:5px 12px}",
    "@media (prefers-reduced-motion:reduce){.fxl,.lights{display:none}.srv .sv,.srv.j .jw,.tb .gq .im,.dance .jw{animation:none!important}}"
  ].join("");
  var stEl = D.createElement("style"); stEl.textContent = css; D.head.appendChild(stEl);

  /* ================= DOM ================= */
  var TABLES = [{ id: 1, cap: 2, x: 0.17, y: 0.36 }, { id: 2, cap: 4, x: 0.5, y: 0.34 }, { id: 3, cap: 2, x: 0.84, y: 0.36 }, { id: 4, cap: 4, x: 0.27, y: 0.8 }, { id: 5, cap: 2, x: 0.79, y: 0.8 }];
  var ou = $("ou"); ou.className = "ou2" + (TH_ID ? " th-" + TH_ID : "");
  ou.innerHTML = '<div class="din" id="din"><div class="door"></div><div class="passw">PASS</div>' +
    (TH.fx ? '<div class="fxl ' + TH.kind + '">' + TH.fx.concat(TH.fx).map(function (f, i) {
      var s = TH.kind === "float" ? "top:" + (8 + (i * 23) % 70) + "%;left:-20px;animation-duration:" + (14 + (i * 5) % 9) + "s;animation-delay:-" + (i * 2.7) + "s;font-size:" + (14 + (i * 3) % 8) + "px"
        : TH.kind === "burst" ? "top:" + (6 + (i * 29) % 40) + "%;left:" + (8 + (i * 37) % 84) + "%;animation-duration:2.4s;animation-delay:-" + (i * 0.6) + "s;font-size:22px"
          : "left:" + ((i * 41) % 100) + "%;top:-20px;animation-duration:" + (7 + (i * 3) % 6) + "s;animation-delay:-" + (i * 1.3) + "s;font-size:" + (10 + (i * 3) % 8) + "px";
      return '<i style="' + s + '">' + f + "</i>"; }).join("") + "</div>" : "") +
    (TH.lights ? '<div class="lights"></div>' : "") + (TH.decor ? '<div class="decor">' + TH.decor.join("") + "</div>" : "") +
    TABLES.map(function (t) { return '<div class="tb c' + t.cap + '" id="tb' + t.id + '" style="left:' + t.x * 100 + '%;top:' + t.y * 100 + '%;--w:' + (t.cap === 4 ? 120 : 64) + 'px"><div class="gs"></div><div class="tt"></div><div class="pb"><i></i></div><div class="dirt">🍽️</div><span class="tn">' + t.id + '</span><div class="flash"></div></div>'; }).join("") +
    '<div class="jpop" id="jpop"></div><div class="lvb" id="lvb"><h3></h3><p></p></div></div>' +
    '<div class="rail" id="rail"></div>' +
    '<div class="kit">' +
    '<div class="pn" id="pfry"><div class="ph"><span>🍗 Fryer</span><span id="fryh"></span></div><div class="slots" id="fry"></div><div class="drops" id="fryd"></div></div>' +
    '<div class="pn" id="piron"><div class="ph"><span>🧇 Waffle irons</span></div><div class="slots" id="iron"></div><div class="drops" style="font:700 9px/1.2 var(--body);color:#E8DCF5;align-items:center;height:32px;text-align:center">Tap to pour · open on 🟢</div></div>' +
    '<div class="pn" id="pskil"><div class="ph"><span>🍳 Skillet</span></div><div class="slots" id="skil"></div><div class="drops" id="skild"></div></div>' +
    '<div class="pn" id="ppot"><div class="ph"><span>🥣 Gritz pot</span></div><div class="pot"><button type="button" class="sl" id="scoop" aria-label="Scoop gritz"><span class="in"><img src="' + GI + 'grits.webp" alt=""></span><span class="lb">Scoop</span></button><button type="button" class="st" id="stir">🥄<br>Stir</button></div></div>' +
    '</div>' +
    '<div class="pass2"><div class="plt" id="plate" title="Tap an item on the plate to take it off"><img class="pl" src="' + GI + 'plate.webp" alt=""><div class="st" id="stack"></div><div class="cupz" id="cupz"></div><div class="dn" id="dn"></div></div>' +
    '<div class="tray"><div class="ph"><span>🔥 Warming tray</span><span id="trh"></span></div><div class="ts" id="tray"></div></div>' +
    '<div class="acts2"><button type="button" class="sv2" id="serve">🛎️<br>Serve it</button><button type="button" class="tr" id="trash">🗑️ Clear plate</button></div></div>' +
    '<div class="bins2" id="bins"></div>' +
    '<div class="fl2" id="oflash"></div>' +
    '<div class="startov2" id="startov"><b>Order Up!</b><span>Tap to open the kitchen</span><small>90-second levels · cook it right · serve every table</small></div>';
  if (TH.banner) { var wo = D.querySelector(".hero .wo"); if (wo) { var bn = D.createElement("p"); bn.className = "thb"; bn.textContent = TH.banner; wo.parentNode.insertBefore(bn, wo.nextSibling); } D.documentElement.classList.add("th-" + TH_ID); }
  var din = $("din");

  /* ================= STATE ================= */
  var og = { running: false, sim: false, tables: [], level: 1, bk: {} };
  function newBk() { return { orders: 0, speed: 0, quality: 0, tips: 0, streak: 0, group: 0, level: 0, bonus: 0, penalty: 0 }; }
  function addPts(cat, n) { og.bk[cat] = (og.bk[cat] || 0) + n; og.score = Math.max(0, og.score + n); }
  function later(ms, fn) { og.timers.push({ at: og.now + ms, fn: fn }); }

  function resetLevelState() {
    var u = U(og.level);
    og.fry = []; for (var i = 0; i < u.baskets; i++) og.fry.push(null);
    og.iron = []; for (i = 0; i < u.irons; i++) og.iron.push(null);
    og.skil = [null, null]; og.pot = { stir: 1 };
    og.tray = []; og.plate = [];
    og.tables = TABLES.map(function (t) { return { def: t, id: t.id, cap: t.cap, state: "free", guests: [] }; });
    og.trips.forEach(function (tr) { tr.el.remove(); }); og.trips = [];
    og.lt = LEVEL_MS; og.walk = 0; og.nextArr = 1500; og.timers = []; og.popAt = -99999; og.warned = {};
    TABLES.forEach(function (t) { var el = $("tb" + t.id); el.className = "tb c" + t.cap; el.querySelector(".gs").innerHTML = ""; el.querySelector(".tt").innerHTML = ""; });
    buildStations(); drawTray(); drawPlate(); drawRail(); hud();
  }
  function start() {
    og = { running: true, sim: og.sim, level: 1, score: 0, now: 0, streak: 0, best: 0, served: 0, tipsUsd: 0, perfect: 0, burnt: 0, walkTotal: 0, trips: [], timers: [], tables: [], bk: newBk(), run: 0, tvT: 0 };
    resetLevelState();
    $("startov").classList.add("off"); $("over").classList.remove("on"); tvOff(true);
    if (W.ReviewEgg) W.ReviewEgg.reset(20, 40);
    flash("Level 1 · 90 seconds", "#F2C14E"); startMusic(); hud();
  }

  /* ================= STATIONS ================= */
  function dcol(d) { return d < 0.7 ? "#9aa0a8" : d < 0.88 ? "#f3d58a" : d < 0.96 ? "#f2b84a" : d <= 1.12 ? "#3fbf6f" : d < 1.45 ? "#b5651d" : "#3a2a20"; }
  function dlab(d) { return d < 0.7 ? "raw" : d < 0.88 ? "pale" : d < 0.96 ? "golden" : d <= 1.12 ? "perfect ✨" : d < 1.45 ? "brown" : "burnt"; }
  function dfil(d) {
    if (d < 0.7) return "saturate(.35) brightness(1.3)";
    if (d < 0.96) { var f = (d - 0.7) / 0.26; return "saturate(" + (0.5 + 0.5 * f).toFixed(2) + ") brightness(" + (1.25 - 0.25 * f).toFixed(2) + ")"; }
    if (d <= 1.12) return "none";
    return "brightness(" + Math.max(0.3, 1 - (d - 1.12) * 0.85).toFixed(2) + ") sepia(" + Math.min(0.7, (d - 1.12) * 0.9).toFixed(2) + ")";
  }
  function quality(d) { return clamp(1 - Math.pow(Math.abs(d - 1.04) / 0.55, 1.6), 0, 1); }
  function perfectD(d) { return d >= 0.96 && d <= 1.12; }
  function buildStations() {
    var u = U(og.level);
    $("fry").innerHTML = og.fry.map(function (x, i) { return '<button type="button" class="sl fry" data-st="fry" data-i="' + i + '" aria-label="Fry basket ' + (i + 1) + '"><span class="in"></span></button>'; }).join("");
    $("fryd").innerHTML = u.fry.map(function (k) { return '<button type="button" data-drop="fry" data-k="' + k + '"><img src="' + GI + ITEMS[k].img + '.webp" alt=""><span>' + T(ITEMS[k].n) + "</span></button>"; }).join("");
    $("iron").innerHTML = og.iron.map(function (x, i) { return '<button type="button" class="sl iron" data-st="iron" data-i="' + i + '" aria-label="Waffle iron ' + (i + 1) + '"><span class="in"></span></button>'; }).join("");
    $("skil").innerHTML = og.skil.map(function (x, i) { return '<button type="button" class="sl skil" data-st="skil" data-i="' + i + '" aria-label="Skillet ' + (i + 1) + '"><span class="in"></span></button>'; }).join("");
    $("skild").innerHTML = u.skil.map(function (k) { return '<button type="button" data-drop="skil" data-k="' + k + '"><img src="' + GI + ITEMS[k].img + '.webp" alt=""><span>' + T(ITEMS[k].n) + "</span></button>"; }).join("");
    var lk = $("pskil").querySelector(".lk"); if (lk) lk.remove();
    if (!u.skil.length) { var l = D.createElement("div"); l.className = "lk"; l.textContent = "🔒 Level 3"; $("pskil").appendChild(l); }
    $("bins").innerHTML = u.bins.map(function (k) { return '<button type="button" data-k="' + k + '"><img src="' + GI + ITEMS[k].img + '.webp" alt="">' + T(ITEMS[k].n) + "</button>"; }).join("");
    $("fryh").textContent = og.fry.length + " baskets";
    drawStations(true);
  }
  function slotHTML(s) { // s: {k, el(ms), T}
    if (!s) return "";
    var d = s.el / s.T, it = ITEMS[s.k];
    return '<img src="' + GI + it.img + '.webp" alt="" style="filter:' + dfil(d) + '">' + (d >= 2 ? '<span class="smk"></span>' : '<span class="stm"></span>') + '<span class="lb">' + dlab(d) + "</span>";
  }
  function drawStations(all) {
    ["fry", "iron", "skil"].forEach(function (st) {
      var els = $(st).children;
      og[st].forEach(function (s, i) {
        var b = els[i]; if (!b) return; var inn = b.firstChild, d = s ? s.el / s.T : 0;
        b.style.setProperty("--p", s ? Math.min(1, d / 1.6).toFixed(3) : 0); b.style.setProperty("--c", s ? dcol(d) : "#999");
        b.classList.toggle("on", !!s);
        var sig = s ? s.k + ":" + dlab(d) : "";
        if (all || b.dataset.sig !== sig) {
          b.dataset.sig = sig;
          if (st === "iron") inn.innerHTML = s ? '<img src="' + GI + 'waffle_plain.webp" alt="" style="filter:' + dfil(d) + ';opacity:' + (d < 0.96 ? 0.35 : 1) + '"><span class="lt' + (d >= 0.96 && d < 1.45 ? " g" : "") + '"></span><span class="stm"></span><span class="lb">' + (d < 0.96 ? "cooking" : dlab(d)) + "</span>" : '<span style="font:800 9px var(--body);color:#ccc">pour</span>';
          else inn.innerHTML = s ? slotHTML(s) : '<span style="font:800 9px var(--body);color:#ffffff88">empty</span>';
        } else if (s) { var im = inn.querySelector("img"); if (im) im.style.filter = dfil(d); }
      });
    });
    var sc = $("scoop"); sc.style.setProperty("--p", og.pot ? og.pot.stir.toFixed(3) : 1); sc.style.setProperty("--c", og.pot && og.pot.stir < 0.3 ? "#e0473a" : og.pot && og.pot.stir < 0.6 ? "#f0b429" : "#3fbf6f");
  }
  function drop(st, k) {
    if (!og.running || og.pause) return false;
    var u = U(og.level); if (st === "fry" && u.fry.indexOf(k) < 0) return false; if (st === "skil" && u.skil.indexOf(k) < 0) return false;
    var i = og[st].indexOf(null); if (i < 0) { flash(st === "fry" ? "Fryer's full!" : "Skillet's full!"); return false; }
    og[st][i] = { k: k, el: 0, T: ITEMS[k].T }; sfx("drop"); setTimeout(function () { sfx("sizzle"); }, 120); drawStations(); return true;
  }
  function pour(i) { if (og.iron[i]) return false; og.iron[i] = { k: "waffle", el: 0, T: ITEMS.waffle.T }; sfx("pour"); drawStations(); return true; }
  function pull(st, i) {
    if (!og.running || og.pause) return false;
    var s = og[st][i]; if (!s) { if (st === "iron") return pour(i); return false; }
    var d = s.el / s.T, el = $(st).children[i];
    if (d < 0.7) { og[st][i] = null; addPts("penalty", -30); popAt(el, "Undercooked! −30", "#ff8a7a"); flash("❌ Too early: undercooked", "#ff8a7a"); sfx("bad"); drawStations(); hud(); return "raw"; }
    if (og.tray.length >= 6) { flash("Warming tray is full!"); return false; }
    og[st][i] = null;
    var q = quality(d), it = { k: s.k, d: d, q: q, perfect: perfectD(d), fresh: ITEMS[s.k].fresh, max: ITEMS[s.k].fresh };
    og.tray.push(it); if (it.perfect) { og.perfect++; popAt(el, "Perfect ✨", "#7dffb5"); } else popAt(el, dlab(d), d > 1.12 ? "#ffb27a" : "#fff");
    if (d >= 1.45) og.burnt++;
    sfx(it.perfect ? "ding" : "pop"); drawStations(); drawTray(); return it;
  }
  function stir() { if (!og.running || og.pause) return; og.pot.stir = 1; sfx("stir"); drawStations(); }
  function scoop() {
    if (!og.running || og.pause) return false;
    if (og.pot.stir < 0.15) { flash("Stir the gritz first! 🥄"); sfx("bad"); return false; }
    if (has2("gritz")) { flash("Already has gritz"); return false; }
    if (og.plate.length >= 7) { flash("Plate's full!"); return false; }
    og.plate.push({ k: "gritz", q: 0.55 + 0.45 * og.pot.stir, pot: true }); sfx("pop"); drawPlate("gritz"); return true;
  }
  function has2(k) { return og.plate.some(function (p) { return p.k === k; }); }

  /* ================= TRAY + PLATE ================= */
  function drawTray() {
    var h = ""; for (var i = 0; i < 6; i++) { var it = og.tray[i];
      h += '<button type="button" class="ti' + (it && it.fresh < 5000 ? " cold" : "") + '" data-ti="' + i + '"' + (it ? ' aria-label="' + ITEMS[it.k].n + " " + dlab(it.d) + '"' : "") + ">" +
        (it ? '<img src="' + GI + ITEMS[it.k].img + '.webp" alt="" style="filter:' + dfil(it.d) + '"><span class="dl" style="background:' + dcol(it.d) + '"></span><span class="fr"><i style="width:' + (it.fresh / it.max * 100) + '%;background:' + (it.fresh / it.max > 0.4 ? "#3fbf6f" : it.fresh / it.max > 0.2 ? "#f0b429" : "#e0473a") + '"></i></span>' : "") + "</button>"; }
    $("tray").innerHTML = h; $("trh").textContent = og.tray.length + "/6";
  }
  function trayFresh() { var bars = $("tray").querySelectorAll(".fr i"); og.tray.forEach(function (it, i) { var b = bars[i]; if (!b) return; var f = it.fresh / it.max; b.style.width = (f * 100) + "%"; b.style.background = f > 0.4 ? "#3fbf6f" : f > 0.2 ? "#f0b429" : "#e0473a"; }); }
  function fromTray(i) {
    if (!og.running || og.pause) return false; var it = og.tray[i]; if (!it) return false;
    if (has2(it.k)) { flash("Already on the plate"); return false; }
    if (og.plate.length >= 7) { flash("Plate's full!"); return false; }
    og.tray.splice(i, 1); og.plate.push({ k: it.k, d: it.d, q: it.q, perfect: it.perfect, fresh: it.fresh, max: it.max, cooked: true }); sfx("pop"); drawTray(); drawPlate(it.k); return true;
  }
  function toggleBin(k) {
    if (!og.running || og.pause) return false;
    var i = -1; og.plate.forEach(function (p, j) { if (p.k === k) i = j; });
    if (i >= 0) { og.plate.splice(i, 1); drawPlate(); return true; }
    if (og.plate.length >= 7) { flash("Plate's full!"); return false; }
    og.plate.push({ k: k }); sfx("pop"); drawPlate(k); return true;
  }
  function takeOff(k) {   // tap an item on the plate: cooked items go back to the tray
    var i = -1; og.plate.forEach(function (p, j) { if (p.k === k) i = j; }); if (i < 0) return;
    var p = og.plate.splice(i, 1)[0];
    if (p.cooked && og.tray.length < 6) og.tray.push({ k: p.k, d: p.d, q: p.q, perfect: p.perfect, fresh: p.fresh, max: p.max });
    drawTray(); drawPlate();
  }
  function clearPlate() { if (!og.running) return; og.plate.slice().forEach(function (p) { if (p.cooked) takeOff(p.k); }); og.plate = []; drawPlate(); }
  function drawPlate(newKey) {
    var st = $("stack"), cups = $("cupz"); st.innerHTML = ""; cups.innerHTML = "";
    var keys = og.plate.map(function (p) { return p.k; });
    var of = function (kind) { return keys.filter(function (k) { return ITEMS[k].kind === kind; }); }, bases = of("base"), prots = of("protein"), sides = of("side"), tops = of("top");
    var S = 190, BASE2 = [[12, 62, 96], [96, 40, 96]], PROT = bases.length ? [[70, 30, 90], [20, 62, 82], [60, 78, 78]] : [[46, 40, 100], [16, 72, 84], [84, 82, 80]], SIDE = [[118, 108, 70], [2, 108, 70], [64, 124, 64]];
    var TOP = { butter: [66, 62, 40], cheese: [52, 46, 80], syrup: [38, 40, 112], berriez: [60, 30, 70], peach: [40, 56, 74], whip: [78, 48, 52] };
    og.plate.forEach(function (p) {
      var k = p.k, it = ITEMS[k], im = D.createElement("img"); im.src = GI + it.img + ".webp"; im.alt = ""; im.dataset.k = k;
      if (p.d != null) im.style.filter = dfil(p.d);
      if (it.kind === "drink") { cups.appendChild(im); return; }
      var pos, z = 3;
      if (it.kind === "base") { pos = bases.length > 1 ? BASE2[Math.min(1, bases.indexOf(k))] : [30, 36, 130]; z = 1; }
      else if (it.kind === "protein") { pos = PROT[Math.min(2, prots.indexOf(k))]; z = 3 + prots.indexOf(k); }
      else if (it.kind === "side") { pos = SIDE[Math.min(2, sides.indexOf(k))]; z = 2; }
      else if (it.kind === "cup") { pos = k === "sauce" ? [142, 30, 46] : [0, 26, 30]; z = 10; }
      else { pos = TOP[k] || [60, 60, 60]; z = k === "syrup" ? 9 : 6 + tops.indexOf(k); }
      im.style.left = pos[0] / S * 100 + "%"; im.style.top = pos[1] / S * 100 + "%"; im.style.width = pos[2] / S * 100 + "%"; im.style.zIndex = z;
      if (k === newKey && !RM) { im.style.transform = "translateY(-50px) scale(1.15)"; requestAnimationFrame(function () { requestAnimationFrame(function () { im.style.transform = ""; }); }); }
      st.appendChild(im);
    });
    $("dn").innerHTML = og.plate.filter(function (p) { return p.cooked; }).map(function (p) { return '<span style="background:' + dcol(p.d) + '">' + esc(ITEMS[p.k].n) + " · " + dlab(p.d) + "</span>"; }).join("");
    D.querySelectorAll("#bins button").forEach(function (b) { b.classList.toggle("on", keys.indexOf(b.dataset.k) >= 0); });
  }

  /* ================= DINING ROOM ================= */
  function seat(tb, party) {
    var L = og.level, p = lvParams(L);
    tb.state = "wait"; tb.seatedAt = og.now; tb.first = 0; tb.delivered = 0; tb.vip = party.vip; tb.kind = party.kind;
    tb.guests = party.ids.map(function (id) {
      var kid = has(id, "kid"), per = personality(id, party.vip);
      return { id: id, kid: kid, per: per, order: makeOrder(L, kid), done: false, arrived: false };
    });
    var hurry = tb.guests.some(function (g) { return g.per === "hurry"; }), elder = tb.guests.every(function (g) { return has(g.id, "elder"); });
    tb.patMax = (p.pat + p.extra * (tb.guests.length - 1)) * (hurry ? 0.85 : 1) * (elder ? 1.1 : 1) * 1000; tb.pat = tb.patMax;
    var el = $("tb" + tb.id);
    el.className = "tb c" + tb.cap + " wait";
    el.querySelector(".gs").innerHTML = tb.guests.map(function (g, i) {
      return '<div class="gq" data-g="' + i + '"><div class="im"><img class="p" src="' + GI + "guests/" + g.id + '.webp" alt=""></div><span class="md">📱</span><span class="ok">✓</span></div>'; }).join("");
    el.querySelector(".tt").innerHTML = "";
    if (!og.sim) requestAnimationFrame(function () { requestAnimationFrame(function () { el.querySelectorAll(".gq").forEach(function (q, i) { setTimeout(function () { q.classList.add("in"); }, i * 120); }); }); });
    else el.querySelectorAll(".gq").forEach(function (q) { q.classList.add("in"); });
    drawRail();
  }
  function arrivals() {
    var free = og.tables.filter(function (t) { return t.state === "free"; }); if (!free.length) { og.nextArr = 1500; return; }
    var maxCap = Math.max.apply(null, free.map(function (t) { return t.cap; }));
    var party = makeParty(og.level, maxCap), n = party.ids.length;
    var fit = free.filter(function (t) { return t.cap >= n; }).sort(function (a, b) { return a.cap - b.cap || Math.random() - 0.5; });
    if (!fit.length) { og.nextArr = 1500; return; }
    seat(fit[0], party);
    var p = lvParams(og.level); og.nextArr = (p.arrive + rnd(-1.5, 1.5)) * 1000;
  }
  function moodOf(tb, g) {
    if (g.photo && og.now < g.photo) return "📸";
    if (g.done) return tb.state === "eat" ? "😋" : g.arrived ? (g.burnt ? "😖" : "😋") : "🍽️";
    var f = tb.pat / tb.patMax; return f > 0.6 ? "📱" : f > 0.35 ? (g.per === "hurry" ? "⏱️" : "😐") : "💢";
  }
  function drawTables() {
    og.tables.forEach(function (tb) {
      if (tb.state !== "wait" && tb.state !== "eat") return;
      var el = $("tb" + tb.id), f = tb.pat / tb.patMax, b = el.querySelector(".pb i");
      if (b) { b.style.width = (f * 100) + "%"; b.style.background = f > 0.6 ? "#3fbf6f" : f > 0.35 ? "#f0b429" : "#e0473a"; }
      el.querySelectorAll(".gq").forEach(function (q, i) {
        var g = tb.guests[i]; if (!g) return; var m = moodOf(tb, g), md = q.querySelector(".md");
        if (md.textContent !== m) md.textContent = m;
        var waiting = tb.state === "wait" && !g.done;
        q.classList.toggle("imp", waiting && f <= 0.6 && f > 0.35); q.classList.toggle("mad", waiting && f <= 0.35); q.classList.toggle("got", g.done);
      });
    });
  }
  function drawRail() {
    var cards = [];
    og.tables.forEach(function (tb) { if (tb.state !== "wait") return; tb.guests.forEach(function (g, gi) { if (!g.done) cards.push({ tb: tb, g: g, gi: gi, f: tb.pat / tb.patMax }); }); });
    cards.sort(function (a, b) { return a.f - b.f; });
    $("rail").innerHTML = cards.length ? cards.map(function (c) {
      var o = c.g.order;
      return '<div class="tk' + (c.f < 0.35 ? " bad" : c.f < 0.6 ? " warn" : "") + '" data-t="' + c.tb.id + '"><span class="pr" title="' + PER[c.g.per][1] + '">' + PER[c.g.per][0] + '</span><span class="t">T' + c.tb.id + '</span><div class="h"><img src="img/' + o.dish.ph + '.jpg" alt=""><b>' + esc(T(o.dish.n)) + (o.drink ? ' <span style="color:#B8322A">+ ' + esc(T(ITEMS[o.drink].n)) + "</span>" : "") + "</b></div>" +
        '<div class="its">' + o.r.map(function (k) { return '<img src="' + GI + ITEMS[k].img + '.webp" alt="' + esc(ITEMS[k].n) + '" title="' + esc(ITEMS[k].n) + '">'; }).join("") + "</div>" +
        ((o.add.length || o.no.length) ? '<div class="mods">' + o.add.map(function (k) { return '<span class="ad">+ ' + esc(T(ITEMS[k].n)) + "</span>"; }).join("") + o.no.map(function (k) { return '<span class="no">NO ' + esc(T(ITEMS[k].n)) + "</span>"; }).join("") + "</div>" : "") + "</div>";
    }).join("") : '<div class="none">' + (og.running ? "No open tickets. Cook ahead: keep a waffle and some fish going 🔥" : "Tickets show up here") + "</div>";
  }
  function railPatience() { var els = $("rail").querySelectorAll(".tk"); els.forEach(function (el) { var tb = og.tables[+el.dataset.t - 1]; if (!tb || tb.state !== "wait") return; var f = tb.pat / tb.patMax; el.classList.toggle("bad", f < 0.35); el.classList.toggle("warn", f >= 0.35 && f < 0.6); }); }
  function walkout(tb) {
    og.walk++; og.walkTotal++; og.streak = 0; addPts("penalty", -50);
    var el = $("tb" + tb.id); el.querySelectorAll(".gq").forEach(function (q) { q.querySelector(".md").textContent = "😤"; q.classList.add("out"); });
    popAt(el, "Walked out! −50", "#ff8a7a"); flash("😤 Table " + tb.id + " walked out! (" + og.walk + " of " + MAX_WALK + ")", "#ff8a7a"); sfx("bad"); buzz(120);
    tb.state = "gone"; later(900, function () { clearTable(tb); });
    drawRail(); hud();
    if (og.walk >= MAX_WALK) later(1000, function () { end("walk"); });
  }
  function clearTable(tb) { var el = $("tb" + tb.id); el.className = "tb c" + tb.cap; el.querySelector(".gs").innerHTML = ""; el.querySelector(".tt").innerHTML = ""; tb.state = "free"; tb.guests = []; }

  /* ================= SERVING + SCORE ================= */
  function same(a, b) { return a.length === b.length && a.slice().sort().join() === b.slice().sort().join(); }
  function serve() {
    if (!og.running || og.pause) return false;
    if (!og.plate.length) { flash("Build a plate first"); return false; }
    var keys = og.plate.map(function (p) { return p.k; }), hit = null;
    og.tables.forEach(function (tb) { if (tb.state !== "wait") return; tb.guests.forEach(function (g, gi) { if (!g.done && same(g.order.r, keys) && (!hit || tb.pat / tb.patMax < hit.tb.pat / hit.tb.patMax)) hit = { tb: tb, g: g, gi: gi }; }); });
    if (!hit) {
      var said = null;
      og.tables.forEach(function (tb) { if (tb.state !== "wait" || said) return; tb.guests.forEach(function (g) { if (g.done || said) return; g.order.no.forEach(function (nk) { if (keys.indexOf(nk) >= 0 && same(g.order.r, keys.filter(function (k) { return k !== nk; }))) said = { tb: tb, nk: nk }; }); }); });
      og.streak = 0;
      if (said) { addPts("penalty", -60); said.tb.pat = Math.max(500, said.tb.pat - said.tb.patMax * 0.15); flash("❌ They said NO " + ITEMS[said.nk].n.toLowerCase() + "! −60", "#ff8a7a"); popAt($("tb" + said.tb.id), "−60", "#ff8a7a"); }
      else { addPts("penalty", -20); flash("❌ Nobody ordered that −20", "#ff8a7a"); }
      sfx("bad"); buzz([40, 40, 40]); hud(); return false;
    }
    var r = deliver(hit.tb, hit.gi); og.plate = []; drawPlate(); sfx("bell"); buzz([15, 30, 15]); hud(); return r;
  }
  function deliver(tb, gi) {
    var g = tb.guests[gi], o = g.order, t = Math.round((og.now - tb.seatedAt) / 100) / 10;
    var items = 30 * o.r.length + 20 * (o.add.length + o.no.length);
    var speed = Math.round(100 * Math.pow(Math.max(0, 1 - t / 60), 1.3)) + (t <= 10 ? 50 : t <= 15 ? 35 : t <= 20 ? 20 : t <= 30 ? 8 : 0);
    var qp = 0, qs = [], allPerf = true;
    og.plate.forEach(function (p) {
      if (p.pot) { qp += Math.round(20 * p.q); qs.push(p.q); return; }
      if (!p.cooked) return;
      var qf = p.q * (0.75 + 0.25 * (p.fresh / p.max)); qs.push(qf);
      qp += Math.round(40 * qf) + (p.perfect ? 15 : 0); if (qf < 0.8) allPerf = false; if (p.d >= 1.45) g.burnt = true;
    });
    g.q = qs.length ? qs.reduce(function (a, b) { return a + b; }, 0) / qs.length : 1;
    if (allPerf && t <= 20) og.streak++; else og.streak = 0;
    og.best = Math.max(og.best, og.streak);
    var mult = 1 + Math.min(og.streak, 5) * 0.2, stk = Math.round((items + speed + qp) * (mult - 1));
    addPts("orders", items); addPts("speed", speed); addPts("quality", qp); if (stk) addPts("streak", stk);
    g.done = true; g.t = t; g.mood = tb.pat / tb.patMax; og.served++;
    tb.delivered++; if (!tb.first) tb.first = og.now;
    tb.pat = Math.min(tb.patMax, tb.pat + 6000);
    var el = $("tb" + tb.id), total = items + speed + qp + stk;
    popAt(el, "+" + total + " · " + t.toFixed(1) + "s", "#f2c14e");
    if (og.streak >= 2) setTimeout(function () { popAt(el, "🔥 Streak ×" + mult.toFixed(1), "#ffb27a"); }, 300);
    flash(allPerf && qs.length ? "✨ Cooked perfect!" : g.burnt ? "😖 A little burnt…" : t <= 15 ? "🔥 Lightning fast!" : "✅ Order up!", g.burnt ? "#ffb27a" : "#F2C14E");
    var allDone = tb.guests.every(function (x) { return x.done; });
    var owner = (tb.guests.length >= 3 || og.streak >= 3 || tb.vip) && !og.trips.some(function (tr) { return tr.srv.owner; });
    sendServer(tb, gi, o.dish.ph, owner);
    if (allDone) {
      tb.state = "eat";
      if (tb.guests.length >= 2 && og.now - tb.first <= 10000) { var gb = 30 * tb.guests.length; addPts("group", gb); setTimeout(function () { popAt(el, "👥 Whole table! +" + gb, "#7dffb5"); }, 500); }
    }
    drawRail(); return { t: t, items: items, speed: speed, quality: qp, streak: stk };
  }
  var srvI = 0;
  function sendServer(tb, gi, ph, owner) {
    var srv = owner ? SERVERS[0] : SERVERS[1 + (srvI++ % (SERVERS.length - 1))];
    var el = D.createElement("div"); el.className = "srv" + (srv.owner ? " j" : "");
    el.innerHTML = (srv.owner ? jurniHTML("a") + '<span class="sp">Owner\'s special! ✨</span>' : serverSVG(srv.look) + '<img class="cp" src="img/' + ph + '.jpg" alt="">');
    din.appendChild(el);
    var w = din.clientWidth || 334, h = din.clientHeight || 214, from = { x: w / 2, y: h - 10 }, to = { x: tb.def.x * w + (gi - (tb.guests.length - 1) / 2) * 26, y: tb.def.y * h + 30 };
    var trip = { el: el, srv: srv, from: from, to: to, t: 0, dur: 1100, back: false, onArrive: function () { arrive(tb, gi, ph); } };
    og.trips.push(trip); placeTrip(trip);
  }
  function busTable(tb) {
    var srv = SERVERS[1 + (srvI++ % (SERVERS.length - 1))], el = D.createElement("div"); el.className = "srv"; el.innerHTML = serverSVG(srv.look); din.appendChild(el);
    var w = din.clientWidth || 334, h = din.clientHeight || 214;
    var trip = { el: el, srv: srv, from: { x: w / 2, y: h - 10 }, to: { x: tb.def.x * w, y: tb.def.y * h + 30 }, t: 0, dur: 1000, back: false, onArrive: function () { el.innerHTML = serverSVG(srv.look) + '<span class="cp" style="display:grid;place-items:center;background:#fff;font-size:13px">🍽️</span>'; clearTable(tb); } };
    og.trips.push(trip); placeTrip(trip);
  }
  function placeTrip(tr) { var f = Math.min(1, tr.t / tr.dur), a = tr.back ? tr.to : tr.from, b = tr.back ? tr.from : tr.to; var x = a.x + (b.x - a.x) * f, y = a.y + (b.y - a.y) * f; var ww = tr.el.offsetWidth || 30, hh = tr.el.offsetHeight || 48; tr.el.style.transform = "translate(" + (x - ww / 2) + "px," + (y - hh) + "px)" + ((b.x < a.x) ? " scaleX(-1)" : ""); }
  function arrive(tb, gi, ph) {
    var g = tb.guests[gi]; if (!g || tb.state === "free" || tb.state === "gone") return;
    g.arrived = true; var el = $("tb" + tb.id);
    var tt = el.querySelector(".tt"); tt.insertAdjacentHTML("beforeend", '<img src="img/' + ph + '.jpg" alt="">');
    if (!g.burnt && Math.random() < 0.4) { var fl = el.querySelector(".flash"); fl.classList.remove("on"); void fl.offsetWidth; fl.classList.add("on"); var q = el.querySelectorAll(".gq")[gi]; if (q) { var md = q.querySelector(".md"); md.textContent = "📸"; g.photo = og.now + 1200; } sfx("flash"); }
    if (tb.state === "eat" && tb.guests.every(function (x) { return x.arrived; })) later(3500, function () { leave(tb); });
  }
  function tipFor(g) {
    var sF = Math.max(0, 1 - g.t / 45), qF = g.q, mF = g.mood || 0;
    var w = { chill: [4, 4, 2, 1], generous: [5, 5, 3, 1.5], picky: [2, 7, 2, 0.9], hurry: [7, 2, 2, 1] }[g.per] || [4, 4, 2, 1];
    var tip = (2 + w[0] * sF + w[1] * qF + w[2] * mF) * w[3];
    if (g.burnt) tip *= g.per === "picky" ? 0 : 0.35;
    tip *= 0.9 + Math.random() * 0.2; return Math.round(tip * 4) / 4;
  }
  function leave(tb) {
    if (tb.state !== "eat") return;
    var el = $("tb" + tb.id), sum = 0;
    tb.guests.forEach(function (g) { sum += tipFor(g); });
    sum = Math.round(sum * 100) / 100; var pts = Math.round(sum * 10);
    addPts("tips", pts); og.tipsUsd += sum;
    el.querySelectorAll(".gq").forEach(function (q) { q.querySelector(".md").textContent = "👋"; q.classList.add("out"); });
    if (sum > 0) { popAt(el, "💵 $" + sum.toFixed(2) + " tip +" + pts, "#7dffb5"); sfx("ding"); if (sum >= 4) jurniPop("tip"); }
    else popAt(el, "No tip 😕", "#ffb27a");
    tb.state = "dirty"; el.className = "tb c" + tb.cap + " dirty";
    later(900, function () { el.querySelector(".gs").innerHTML = ""; });
    later(1400, function () { busTable(tb); });
    hud();
  }

  /* ================= JURNI POP-UPS (rate-limited; dining room only) ================= */
  var BUBBLES = ["Thank you! 💛", "Appreciate you! 💛", "Thanks for coming! 💛"];
  function jurniPop(kind, force) {
    if (og.sim) return false;
    var now = og.now || 0; if (!force && now - og.popAt < 12000) return false; og.popAt = now;
    var jp = $("jpop"), pose = kind === "tip" ? "tip" : "impatient";
    jp.innerHTML = jurniHTML(pose) + (kind === "tip" ? '<div class="bb">' + pick(BUBBLES) + "</div>" : '<div class="bb">' + pick(["You're taking too long! 😤", "Table's waiting, baby!", "Let's GO, kitchen! 👀"]) + "</div>");
    jp.classList.remove("on"); void jp.offsetWidth; jp.classList.add("on");
    clearTimeout(jp._t); jp._t = setTimeout(function () { jp.classList.remove("on"); }, 2400);
    if (kind === "tip") sfx("ding"); else if (TH_ID === "halloween") sfx("boo");
    return true;
  }

  /* ================= LEVELS ================= */
  function levelUp() {
    tvOff(true); $("jpop").classList.remove("on");
    var L = og.level, bonus = 150 * L + 75 * (MAX_WALK - og.walk);
    addPts("level", bonus); og.pause = true; stopMusic(); sfx("level");
    var b = $("lvb"); b.querySelector("h3").textContent = "LEVEL " + (L + 1);
    b.querySelector("p").textContent = "Level " + L + " cleared! +" + bonus + " · next: " + nextTease(L + 1);
    b.classList.add("on");
    // Jurni brings out a tray of Kiki Palmers, sets them down, then spins + happy dance
    var dn = D.createElement("div"); dn.className = "dance"; dn.innerHTML = jurniHTML("a") + '<span class="tray"><img src="' + GI + 'kiki.webp" alt=""><img src="' + GI + 'kiki.webp" alt=""></span>'; b.appendChild(dn);
    setTimeout(function () { var tr = dn.querySelector(".tray"); if (tr) { tr.style.transition = "transform .4s"; tr.style.transform = "translate(-20px,46px)"; } }, 700);
    setTimeout(function () { dn.innerHTML = jurniHTML("tip") + '<span class="tray" style="transform:translate(-20px,46px)"><img src="' + GI + 'kiki.webp" alt=""><img src="' + GI + 'kiki.webp" alt=""></span>'; dn.classList.add("go"); sparkles(dn, 12); }, 1100);
    var go = function () { dn.remove(); b.classList.remove("on"); og.level = L + 1; og.pause = false; resetLevelState(); flash("Level " + og.level + " · 90 seconds", "#F2C14E"); startMusic(); };
    if (og.sim) go(); else setTimeout(go, 3600);
    hud();
  }
  function nextTease(L) { return L === 2 ? "shrimp, 2nd waffle iron, special requests, friends & moms with kids" : L === 3 ? "the skillet (eggs + bacon), 3rd fry basket, families" : L === 4 ? "loaded plates, the church group, bigger parties" : "faster guests, less patience, VIP picky eaters"; }
  function sparkles(host, n) { for (var i = 0; i < n; i++) { var s = D.createElement("span"); s.className = "spk"; s.textContent = pick(["✨", "⭐", "💛", "✨"]); s.style.left = "50%"; s.style.top = "40%"; s.style.setProperty("--dx", rnd(-80, 80) + "px"); s.style.setProperty("--dy", rnd(-70, 50) + "px"); s.style.animationDelay = (i * 0.06) + "s"; host.appendChild(s); setTimeout(function (x) { return function () { x.remove(); }; }(s), 1800); } }

  /* ================= LOOP ================= */
  function step(dt) {
    if (!og.running) return;
    // server walks
    og.trips = og.trips.filter(function (tr) {
      tr.t += dt;
      if (!tr.back && tr.t >= tr.dur) { tr.back = true; tr.t = 0; try { tr.onArrive(); } catch (e) {} if (!tr.srv.owner) { var cp = tr.el.querySelector(".cp"); if (cp && cp.tagName === "IMG") cp.remove(); } }
      if (tr.back && tr.t >= tr.dur) { tr.el.remove(); return false; }
      placeTrip(tr); return true;
    });
    var due = og.timers.filter(function (x) { return x.at <= og.now + dt; }); og.timers = og.timers.filter(function (x) { return x.at > og.now + dt; });
    og.now += dt;
    due.forEach(function (x) { try { x.fn(); } catch (e) { if (W.console) console.error(e); } });
    if (og.pause || !og.running) return;
    og.lt -= dt;
    // cooking
    ["fry", "iron", "skil"].forEach(function (st) { og[st].forEach(function (s, i) { if (!s) return; var d0 = s.el / s.T; s.el += dt; var d = s.el / s.T;
      if (st === "iron" && d0 < 0.96 && d >= 0.96) sfx("beep");
      if (d >= 2) { og[st][i] = null; addPts("penalty", -15); og.burnt++; popAt($(st).children[i], "Charred! −15", "#ff8a7a"); sfx("smoke"); } }); });
    og.pot.stir = Math.max(0, og.pot.stir - dt / 24000);
    // tray freshness
    var cold = 0; og.tray = og.tray.filter(function (it) { it.fresh -= dt; if (it.fresh <= 0) { cold++; return false; } return true; });
    og.plate.forEach(function (p) { if (p.cooked) p.fresh = Math.max(0, p.fresh - dt * 0.5); });
    if (cold) { addPts("penalty", -10 * cold); flash("🥶 Went cold in the tray −" + 10 * cold, "#9cd3ff"); drawTray(); }
    // guests
    og.nextArr -= dt; if (og.nextArr <= 0 && og.lt > 6000) arrivals();
    og.tables.forEach(function (tb) {
      if (tb.state !== "wait") return;
      tb.pat -= dt;
      if (tb.pat / tb.patMax < 0.3 && !og.warned[tb.id + ":" + tb.seatedAt]) { og.warned[tb.id + ":" + tb.seatedAt] = 1; jurniPop("impatient"); }
      if (tb.pat <= 0) walkout(tb);
    });
    if (W.ReviewEgg && W.ReviewEgg.due && W.ReviewEgg.due(LEVEL_MS - og.lt)) tvOn();
    if (tv && (og.tvT -= dt) <= 0) tvOff();
    if (og.running && og.lt <= 0 && og.walk < MAX_WALK) levelUp();
  }
  var last = 0, frame = 0;
  function tick(now) {
    requestAnimationFrame(tick);
    var dt = last ? Math.min(100, now - last) : 16; last = now;
    if (!og.running || og.sim) return;
    step(dt); render();
  }
  function render() {
    frame++;
    drawStations(); drawTables(); if (frame % 6 === 0) { trayFresh(); railPatience(); } hud();
  }
  requestAnimationFrame(tick);

  /* ================= HUD / FX ================= */
  function buzz(p) { if (navigator.vibrate && !og.sim) try { navigator.vibrate(p); } catch (e) {} }
  function mult() { return 1 + Math.min(og.streak || 0, 5) * 0.2; }
  function hud() {
    $("score").textContent = Math.round(og.score || 0).toLocaleString();
    var s = Math.ceil(Math.max(0, og.lt == null ? LEVEL_MS : og.lt) / 1000); $("time").textContent = Math.floor(s / 60) + ":" + ("0" + s % 60).slice(-2);
    $("lvl").textContent = "Level " + (og.level || 1);
    var w = og.walk || 0, wx = ""; for (var i = 0; i < MAX_WALK; i++) wx += i < w ? "❌" : "⭕"; $("walk").textContent = wx; $("walk").setAttribute("aria-label", w + " of " + MAX_WALK + " walk-outs");
    $("combo").textContent = "×" + mult().toFixed(1).replace(/\.0$/, "");
  }
  function flash(t, col) { if (og.sim) return; var f = $("oflash"); f.textContent = t; f.style.color = col || "#fff"; f.classList.remove("on"); void f.offsetWidth; f.classList.add("on"); }
  function popAt(el, t, col) {
    if (og.sim || !el) return; var r = el.getBoundingClientRect(), o = ou.getBoundingClientRect(), p = D.createElement("div"); p.className = "pop2"; p.textContent = t; p.style.color = col || "#f2c14e";
    p.style.left = Math.max(2, Math.min(o.width - 120, r.left - o.left + r.width / 2 - 50)) + "px"; p.style.top = (r.top - o.top) + "px"; ou.appendChild(p); setTimeout(function () { p.remove(); }, 1200);
  }

  /* ---- Antidote's review on the kitchen TV (reviewegg.js): once a shift, in the dining room ---- */
  var tv = null;
  function tvOn() {
    if (!W.ReviewEgg || tv || og.sim) return;
    tv = D.createElement("button"); tv.type = "button"; tv.className = "re-tv"; tv.style.left = "20px"; tv.style.top = "6px"; tv.setAttribute("aria-label", "Kitchen TV: Antidote's review. Tap for a bonus");
    tv.innerHTML = '<span class="scr"><img src="' + W.ReviewEgg.cover.src + '" alt=""><i></i></span><b>📺 ANTIDOTE</b>';
    tv.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); if (!og.running || !tv) return;
      var b = W.ReviewEgg.collect(); addPts("bonus", b); og.tipsUsd += 5; popAt(tv, "+" + b + " 📺", "#f2c14e"); flash("📺 Antidote reviewed us! +" + b, "#f2c14e"); buzz([20, 40, 20]); hud(); tvOff(); });
    din.appendChild(tv); og.tvT = 12000;
  }
  function tvOff(now) { if (!tv) return; var t = tv; tv = null; if (now) { t.remove(); return; } t.classList.add("off"); setTimeout(function () { t.remove(); }, 450); }

  /* ================= END ================= */
  function best() { try { var b = +localStorage.getItem("gnw-best2") || 0; var el = $("best"); if (el) el.textContent = "Your best: " + (b ? b.toLocaleString() + " pts" : "—"); return b; } catch (e) { return 0; } }
  best();
  function end(why) {
    if (!og.running) return;
    og.running = false; stopMusic(); tvOff(true); hud();
    var b = best(); if (og.score > b) { try { localStorage.setItem("gnw-best2", Math.round(og.score)); } catch (e) {} } best();
    var B = og.bk, rows = [["⚡ Speed", B.speed], ["✨ Quality", B.quality], ["🧾 Orders", B.orders], ["💵 Tips", B.tips], ["🔥 Streaks", B.streak], ["👥 Whole tables", B.group], ["🏆 Level bonus", B.level], ["📺 Bonus", B.bonus], ["❌ Mistakes", B.penalty]];
    $("final").textContent = Math.round(og.score).toLocaleString() + " pts";
    $("stats").textContent = "Reached level " + og.level + " · " + og.served + " plates · $" + og.tipsUsd.toFixed(2) + " in tips · " + og.perfect + " perfect cooks · best streak " + og.best;
    $("brk").innerHTML = rows.filter(function (r) { return r[1]; }).map(function (r) { return "<span>" + r[0] + "</span><b" + (r[1] < 0 ? ' class="neg"' : "") + ">" + (r[1] > 0 ? "+" : "") + r[1].toLocaleString() + "</b>"; }).join("");
    var s = og.score, P = W.GNW_PRIZES || [[15000, "a Free Original Collard Green Dip"], [10000, "Free Fried Cheese Gritz"], [6500, "a Free side of Smackin' Mac"], [3500, "a Free Kiki Palmer"]], prize = "";
    for (var i = 0; i < P.length; i++) if (s >= P[i][0]) { prize = P[i][1]; break; }
    $("rank").textContent = prize ? "🏆 You won " + prize : (why === "walk" ? "3 walk-outs: kitchen's closed!" : "Kitchen's closed!") + " Try again while you wait";
    var won = $("won"); won.style.display = "none";
    if (prize && W.SSAI_WIN) {
      var w = W.SSAI_WIN(prize.replace(/^a /, ""));
      var showWin = function () {
        if (w.blocked) won.innerHTML = "🏆 You'd win " + prize + ", but you already have <b>" + w.prize.t + "</b> waiting (code " + w.prize.c + ").<br><span style=\"font-weight:600;font-size:13px;color:#e8dcf5\">Use it by " + w.until + ", then your next win saves. One reward at a time.</span>";
        else won.innerHTML = "🏆 You won " + prize + "!<br><span style=\"font:900 22px ui-monospace,Menlo,monospace;color:#F2C14E;letter-spacing:.1em\">" + w.prize.c + "</span><br><span style=\"font-weight:600;font-size:13px;color:#e8dcf5\">" + (w.saved || W.SSAI_GATE ? "Saved to your rewards. Show your server to redeem. Good for 3 days." : "Join Gritz N Wafflez Rewards below to save it.") + "</span>";
        won.style.display = "block";
      };
      if (w.saved || !W.SSAI_GATE) showWin();
      else { won.innerHTML = (w.blocked ? "🏆 You'd win " + prize + ", but you already have <b>" + w.prize.t + "</b> waiting." : "🏆 You won " + prize + "!") + "<br><span style=\"font-weight:600;font-size:13px;color:#e8dcf5\">Save it to your Gritz N Wafflez Rewards to get your code.</span><button class=\"btn hot\" type=\"button\" id=\"wsave\" style=\"width:100%;justify-content:center;margin-top:8px\">🎁 Save my prize</button>"; won.style.display = "block";
        $("wsave").onclick = function () { W.SSAI_GATE("prize", showWin); }; }
    }
    if (W.ReviewEgg && !og.sim) W.ReviewEgg.endCard($("over"), $("over").querySelector(".btns"));
    $("over").classList.add("on");
    if (!og.sim) $("og").scrollIntoView({ block: "end", behavior: RM ? "auto" : "smooth" });
  }

  /* ================= INPUT ================= */
  ou.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("button,[data-k],.plt img"); if (!b || !ou.contains(b)) return;
    if (b.dataset.drop) return drop(b.dataset.drop, b.dataset.k);
    if (b.dataset.st) return pull(b.dataset.st, +b.dataset.i);
    if (b.dataset.ti != null) return fromTray(+b.dataset.ti);
    if (b.closest("#bins")) return toggleBin(b.dataset.k);
    if (b.tagName === "IMG" && b.dataset.k) return takeOff(b.dataset.k);
    if (b.id === "stir") return stir(); if (b.id === "scoop") return scoop();
    if (b.id === "trash") return clearPlate(); if (b.id === "serve") return serve();
  });
  $("cupz").addEventListener("click", function (e) { var im = e.target.closest("img"); if (im && im.dataset.k) takeOff(im.dataset.k); });

  /* ================= API (start menu, tests, bot) ================= */
  W.__OG = {
    get: function () { return og; }, start: start, ITEMS: ITEMS, DISHES: DISHES, SERVERS: SERVERS, GUESTS: GU, theme: TH_ID, hair: HAIR,
    sim: function (on) { og.sim = !!on; }, step: function (ms) { var n = Math.ceil(ms / 50); for (var i = 0; i < n && og.running; i++) step(50); },
    render: render, drop: drop, pull: pull, pour: pour, stir: stir, scoop: scoop, fromTray: fromTray, bin: toggleBin, serve: serve, clear: clearPlate,
    levelUp: function () { og.lt = 1; }, jurniPop: function (k) { return jurniPop(k, true); }, end: end, quality: quality, U: U,
    seatTest: function (ids, tableId) { var tb = og.tables[tableId - 1]; seat(tb, { ids: ids, kind: "test" }); }
  };
  $("startov").addEventListener("click", function () { if (W.GameMenu) W.GameMenu.open(); else start(); });
  drawRail(); hud();
})();
