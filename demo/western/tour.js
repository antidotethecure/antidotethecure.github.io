/* Immersive hotspot-tour engine. A whole site is tour.json: scenes (one still each, optional living loop),
   hotspots (fly to another scene through a start/end-frame clip, or open an info card) and cards.
   No libraries. ?theme=name previews a theme · ?edit shows the x/y of every click (for placing hotspots). */
(async function () {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const qs = new URLSearchParams(location.search);
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lite = calm || !!(navigator.connection && navigator.connection.saveData);   // no video at all
  const THEMES = ["saloon", "desert", "outlaw", "ranch"];

  /* links in cards may only go to https, phone, email, text or this site */
  function safe(h) {
    try { const u = new URL(h, location.href); return ["https:", "tel:", "mailto:", "sms:"].includes(u.protocol) || u.origin === location.origin; }
    catch (e) { return false; }
  }

  /* self-check: a typo in tour.json shows up as a red bar, not as a dead button */
  function check(T) {
    const bad = [], cards = T.cards || {};
    if (!T.scenes || !T.scenes[T.start]) bad.push("start scene '" + T.start + "' is missing");
    for (const [id, s] of Object.entries(T.scenes || {})) {
      if (!s.still || !s.title) bad.push(id + ": needs still + title");
      for (const h of s.hotspots || []) {
        const n = id + " > " + h.label;
        if (!h.label) bad.push(id + ": hotspot without a label");
        if (!(h.x >= 0 && h.x <= 1 && h.y >= 0 && h.y <= 1)) bad.push(n + ": x and y must be 0-1");
        if (h.to ? !T.scenes[h.to] : !cards[h.card]) bad.push(n + ": points to nothing ('" + (h.to || h.card) + "')");
      }
    }
    for (const [id, c] of Object.entries(cards)) {
      if (!c.title) bad.push("card " + id + ": needs a title");
      for (const a of c.actions || []) if (!a.label || !safe(a.href)) bad.push("card " + id + ": link not allowed (" + a.href + ")");
    }
    if (bad.length) throw new Error(bad.join(" · "));
  }

  let T;
  try { T = await (await fetch("tour.json", { cache: "no-cache" })).json(); check(T); }
  catch (e) { $("#err").textContent = "tour.json: " + e.message; $("#err").hidden = false; return; }

  /* ---------- theme ---------- */
  let theme = [qs.get("theme"), T.theme, THEMES[0]].find((t) => THEMES.includes(t)), dust = "";
  function setTheme(t) {
    theme = t; document.documentElement.dataset.theme = t;
    dust = "rgb(" + getComputedStyle(document.documentElement).getPropertyValue("--dust") + ")";
    $("#style").textContent = "Style: " + t;
  }
  setTheme(theme);
  $("#style").hidden = !T.themePicker;
  $("#style").onclick = () => setTheme(THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]);
  document.title = T.title || T.brand;
  $("#brand").textContent = $("#intro-title").textContent = T.brand;
  $("#tagline").textContent = T.tagline || "";

  /* ---------- the picture: always covers the screen, a bit oversized so there is room to look around ---------- */
  const stage = $("#stage"), AR = (T.aspect || [16, 9])[0] / (T.aspect || [16, 9])[1];
  let W = 0, H = 0, ox = 0, oy = 0;
  function place(x, y, ms) {
    ox = Math.min(0, Math.max(innerWidth - W, x)); oy = Math.min(0, Math.max(innerHeight - H, y));
    stage.style.transitionDuration = (calm ? 0 : ms || 0) + "ms";
    stage.style.transform = "translate3d(" + ox + "px," + oy + "px,0)";
  }
  const lookAt = (fx, fy, ms) => place(innerWidth / 2 - fx * W, innerHeight / 2 - fy * H, ms);
  const focus = (id, ms) => { const f = T.scenes[id].focus || [0.5, 0.5]; lookAt(f[0], f[1], ms); };
  function layout() {
    W = Math.max(innerWidth, innerHeight * AR) * 1.06; H = W / AR;
    stage.style.width = W + "px"; stage.style.height = H + "px";
    if (cur) focus(cur);
  }
  addEventListener("resize", layout);

  /* touch: drag to look around. mouse: the view follows the pointer. */
  let drag = null, moved = false;
  stage.addEventListener("pointerdown", (e) => { moved = false; if (e.pointerType !== "mouse") drag = { x: e.clientX - ox, y: e.clientY - oy, sx: e.clientX, sy: e.clientY }; });
  addEventListener("pointermove", (e) => {
    if (drag) { moved = moved || Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6; if (moved) place(e.clientX - drag.x, e.clientY - drag.y); }
    else if (e.pointerType === "mouse" && !busy) place((innerWidth - W) * e.clientX / innerWidth, (innerHeight - H) * e.clientY / innerHeight, 250);
  });
  for (const ev of ["pointerup", "pointercancel"]) addEventListener(ev, () => { drag = null; });
  stage.addEventListener("click", (e) => { if (moved) { e.stopPropagation(); moved = false; } }, true);   // a drag is not a tap
  if (qs.has("edit")) stage.addEventListener("click", (e) => {
    const r = stage.getBoundingClientRect(), t = '"x": ' + ((e.clientX - r.left) / r.width).toFixed(3) + ', "y": ' + ((e.clientY - r.top) / r.height).toFixed(3);
    console.log(t); $("#place").textContent = t;
  });

  /* ---------- scenes ---------- */
  const still = $("#still"), loopV = $("#loop"), fx = $("#fx"), spots = $("#spots"), chips = $("#chips"), curtain = $("#curtain");
  const trail = [], blobs = {};
  let cur = null, busy = false;
  /* shortcut: clips of the current scene are held in memory as blobs so a fly-in starts at once; fine for a few dozen
     ~1.5 MB clips, switch to on-demand loading if a site ever has hundreds. */
  const warm = (src) => blobs[src] = blobs[src] || fetch(src).then((r) => r.ok ? r.blob() : Promise.reject()).then((b) => URL.createObjectURL(b)).catch(() => src);
  loopV.addEventListener("playing", () => loopV.classList.add("on"));

  function show(id) {                       // put a scene on screen: still, signs, chips, living loop
    cur = id; const s = T.scenes[id];
    still.src = s.still; still.alt = s.alt || s.title;
    $("#place").textContent = s.title;
    $("#back").hidden = !trail.length;
    history.replaceState(null, "", "#" + id);
    spots.replaceChildren(); chips.replaceChildren();
    for (const h of s.hotspots || []) {
      const act = () => h.to ? go(h.to, h.via, h.back) : card(h.card);
      const b = el("button", "spot"); b.type = "button"; b.tabIndex = -1;   // the chips below are the keyboard / screen-reader way in
      b.style.left = h.x * 100 + "%"; b.style.top = h.y * 100 + "%";
      b.append(el("span", "ring"), el("span", "sign", h.label)); b.onclick = act;
      const c = el("button", "chip", h.label); c.type = "button";
      c.onclick = () => { lookAt(h.x, h.y, 500); setTimeout(act, calm ? 0 : 520); };
      spots.append(b); chips.append(c);
      if (h.to) { new Image().src = T.scenes[h.to].still; if (h.via && !lite) warm(h.via); }
    }
    loopV.classList.remove("on"); loopV.removeAttribute("src"); loopV.load();
    if (s.loop && !lite) { loopV.src = s.loop; loopV.play().catch(() => {}); }
  }

  const played = (v) => new Promise((ok, no) => {     // resolves when the clip has finished; rejects if it will not start in 4 s
    let t = setTimeout(no, 4000);
    v.onplaying = () => { clearTimeout(t); t = setTimeout(ok, ((v.duration || 6) + 2.5) * 1000); v.classList.add("on"); };
    v.onended = () => { clearTimeout(t); ok(); }; v.onerror = no;
    v.play().catch(no);
  });

  async function go(id, via, back, isBack) {
    if (busy || id === cur || !T.scenes[id]) return;
    busy = true; document.body.classList.add("moving");
    const pre = new Image(); pre.src = T.scenes[id].still;
    const ready = pre.decode().catch(() => {});
    if (!isBack) trail.push({ id: cur, via: back });
    let flew = false;
    if (via && !lite) {
      try { fx.src = await warm(via); focus(id, 1500); await played(fx); flew = true; }
      catch (e) { fx.pause(); fx.classList.remove("on"); }
    }
    if (!flew) { curtain.classList.add("on"); await wait(360); }     // no clip (or it failed): dip to dark instead
    await ready; show(id); focus(id);
    await wait(80);                                                   // let the new still paint under the clip's last frame
    fx.classList.remove("on"); curtain.classList.remove("on");
    busy = false; document.body.classList.remove("moving");
  }
  $("#back").onclick = () => { const p = trail.pop(); if (p) go(p.id, p.via, null, true); };

  /* ---------- info cards ---------- */
  const dlg = $("#card");
  function card(id) {
    const c = T.cards[id], body = $("#card-body"), acts = $("#card-acts");
    $("#card-kicker").textContent = c.kicker || ""; $("#card-title").textContent = c.title;
    body.replaceChildren(); acts.replaceChildren();
    if (c.image) { const i = el("img"); i.src = c.image; i.alt = c.imageAlt || ""; i.loading = "lazy"; body.append(i); }
    for (const p of [].concat(c.body || [])) body.append(el("p", "", p));
    if (c.items) { const ul = el("ul", "items"); for (const [name, note] of c.items) { const li = el("li"); li.append(el("span", "", name), el("b", "", note || "")); ul.append(li); } body.append(ul); }
    for (const a of c.actions || []) {
      const l = el("a", "btn", a.label); l.href = a.href;
      if (/^https:/i.test(a.href)) { l.target = "_blank"; l.rel = "noopener noreferrer"; }
      acts.append(l);
    }
    dlg.showModal();
  }
  $("#card-x").onclick = () => dlg.close();
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });   // tap outside the poster

  /* ---------- drifting dust ---------- */
  if (!calm) {
    const cv = $("#dust"), g = cv.getContext("2d"); let P = [];
    const size = () => {
      cv.width = innerWidth; cv.height = innerHeight;
      P = Array.from({ length: Math.min(70, innerWidth / 14 | 0) }, () => ({ x: Math.random() * cv.width, y: Math.random() * cv.height, r: Math.random() * 1.6 + 0.4, v: Math.random() * 0.35 + 0.08, a: Math.random() * 0.5 + 0.15 }));
    };
    size(); addEventListener("resize", size);
    (function tick() {
      g.clearRect(0, 0, cv.width, cv.height); g.fillStyle = dust;
      for (const p of P) {
        p.x += p.v; p.y += Math.sin((p.x + p.r * 90) / 60) * 0.15 - 0.03;
        if (p.x > cv.width + 4) p.x = -4; if (p.y < -4) p.y = cv.height + 4;
        g.globalAlpha = p.a; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.3); g.fill();
      }
      requestAnimationFrame(tick);
    })();
  }

  /* ---------- wind (made in the browser, no audio file; off until asked for) ---------- */
  let ac, wind;
  $("#snd").onclick = () => {
    if (!ac) {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      const buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = ac.createBufferSource(), f = ac.createBiquadFilter(), lfo = ac.createOscillator(), depth = ac.createGain();
      src.buffer = buf; src.loop = true; f.type = "bandpass"; f.frequency.value = 420; f.Q.value = 0.6;
      lfo.frequency.value = 0.09; depth.gain.value = 260; lfo.connect(depth).connect(f.frequency);   // slow gusts
      wind = ac.createGain(); wind.gain.value = 0;
      src.connect(f).connect(wind).connect(ac.destination); src.start(); lfo.start();
    }
    const on = $("#snd").getAttribute("aria-pressed") !== "true";
    $("#snd").setAttribute("aria-pressed", on); ac.resume();
    wind.gain.setTargetAtTime(on ? 0.16 : 0, ac.currentTime, 0.4);
  };

  /* ---------- start ---------- */
  const first = T.scenes[location.hash.slice(1)] ? location.hash.slice(1) : T.start;
  if (first !== T.start) trail.push({ id: T.start });       // deep link: Back still leads to the start
  layout(); show(first); focus(first);
  $("#enter").onclick = () => {
    document.body.classList.add("in");
    $("#hint").classList.add("on"); setTimeout(() => $("#hint").classList.remove("on"), 4500);
  };
})();
