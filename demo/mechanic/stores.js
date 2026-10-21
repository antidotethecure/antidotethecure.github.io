/* SousShift AI — Mobile Mechanic demo: "Where to get it for less". Exposes window.STORES.
   Shown inside the parts sheet (app.js drawParts -> STORES.mount) for whatever part the customer picked, from the
   job list, the service sheet or the exploded-view hotspots. Store list = stores.json (verified business info with a
   source URL per store, lat/lng geocoded at build time, never at runtime). Distance = haversine from the customer's
   location if they allow it, otherwise from Wilmington 90744. Nothing here talks to the stores: Call / Directions /
   inventory links only. No prices, no stock claims. Needs core.js (window.MECH) + parts.js (window.PARTS). */
(function () {
  "use strict";
  var W = window, D = document, M = W.MECH, PT = W.PARTS, C = W.SHOP_CFG || {};
  var DATA = null, loading = null, state = { filter: "all", origin: null, sel: 0, key: "", geoBusy: false, geoMsg: "" };

  function lg() { return M && M.lang ? M.lang() : "en"; }
  function esc(s) { return M && M.esc ? M.esc(s) : String(s == null ? "" : s); }
  function pk(o, l) { return o == null ? "" : typeof o === "string" ? o : (o[l || lg()] || o.en || ""); }
  function mech() { var b = C.brand || {}; return b.mechanic || b.short || b.name || "the mechanic"; }

  /* ---------- UI strings ---------- */
  var S = {
    en: {
      h: "Where to get it for less", sub: "Parts stores + used yards near you, closest first.",
      from: "Distances from {o}", fromMe: "your location", useMe: "📍 Use my location", geoNo: "Location is off, so distances are from Wilmington 90744.", geoWait: "Finding you…",
      fAll: "All", fNew: "New", fUsed: "Used",
      t_new: "New · discount", t_chain: "New · chain", t_self: "Self-serve · you pull it", t_full: "Full-service · they pull it",
      usedBadge: "Used yard", call: "📞 Call", dir: "🗺️ Directions", inv: "🔎 Check the yard's online inventory", prices: "💲 Yard price list", site: "🌐 Website",
      mi: "{d} mi", say: "What to say when you call", forPart: "Part:", copy: "📋 Copy", read: "🔊 Read it to me", stop: "⏹ Stop", copied: "Copied. Paste it or read it off your screen.", copyFail: "Couldn't copy. Long-press the text instead.",
      noVoice: "This browser can't read out loud.",
      bring: "What to bring (self-serve yard)", whereOnCar: "Where it is on the car:", howTo: "▶️ Watch a removal video first",
      tools: ["Socket set + ratchet (metric, 8–19 mm) and extensions", "Screwdrivers, pliers, Torx bits and a trim-clip tool", "Breaker bar + penetrating oil for rusty bolts", "Work gloves, safety glasses, closed-toe shoes (required)", "Water, and a photo of your old part / its part number"],
      carlos: "🔧 Or have {m} get it and install it", carlosSub: "He finds the part for you and puts it in. Adds it to your job, then pick a time.",
      ahead: "Call ahead — prices and stock change.", honest: "Business info only (checked {d}). No partnership with these stores and no prices pulled from them.",
      none: "No stores match this filter.", src: "source", load: "Loading stores…", loadErr: "Couldn't load the store list. Check your connection and reopen this part."
    },
    es: {
      h: "Dónde conseguirla más barata", sub: "Tiendas de autopartes y yonkes cerca de ti, la más cercana primero.",
      from: "Distancias desde {o}", fromMe: "tu ubicación", useMe: "📍 Usar mi ubicación", geoNo: "La ubicación está apagada; las distancias son desde Wilmington 90744.", geoWait: "Buscando tu ubicación…",
      fAll: "Todas", fNew: "Nuevas", fUsed: "Usadas",
      t_new: "Nueva · descuento", t_chain: "Nueva · cadena", t_self: "Autoservicio · tú la quitas", t_full: "Servicio completo · ellos la quitan",
      usedBadge: "Yonke", call: "📞 Llamar", dir: "🗺️ Cómo llegar", inv: "🔎 Ver el inventario del yonke en línea", prices: "💲 Lista de precios", site: "🌐 Sitio web",
      mi: "{d} mi", say: "Qué decir cuando llames", forPart: "Pieza:", copy: "📋 Copiar", read: "🔊 Léemelo", stop: "⏹ Parar", copied: "Copiado. Pégalo o léelo de tu pantalla.", copyFail: "No se pudo copiar. Mantén presionado el texto.",
      noVoice: "Este navegador no puede leer en voz alta.",
      bring: "Qué llevar (yonke de autoservicio)", whereOnCar: "Dónde va en el carro:", howTo: "▶️ Mira un video de cómo quitarla",
      tools: ["Juego de dados + matraca (métricos, 8–19 mm) y extensiones", "Desarmadores, pinzas, puntas Torx y una herramienta para clips", "Barra de fuerza + aceite penetrante para tornillos oxidados", "Guantes, lentes de seguridad y zapato cerrado (obligatorio)", "Agua, y una foto de tu pieza vieja / su número de parte"],
      carlos: "🔧 O que {m} la consiga y la instale", carlosSub: "Él consigue la pieza por ti y la pone. Se agrega a tu trabajo y luego escoges la hora.",
      ahead: "Llama antes de ir: los precios y las existencias cambian.", honest: "Solo información del negocio (revisada {d}). Sin asociación con estas tiendas y sin precios tomados de ellas.",
      none: "Ninguna tienda coincide con este filtro.", src: "fuente", load: "Cargando tiendas…", loadErr: "No se pudo cargar la lista de tiendas. Revisa tu conexión y vuelve a abrir esta pieza."
    }
  };
  function T(k, v) { var s = (S[lg()] || S.en)[k]; if (s == null) s = S.en[k]; if (typeof s !== "string") return s; return s.replace(/\{(\w+)\}/g, function (_, x) { return v && v[x] != null ? v[x] : ""; }); }

  /* ---------- data ---------- */
  function load() {
    if (DATA) return Promise.resolve(DATA);
    if (loading) return loading;
    loading = fetch("stores.json?v=20261013s", { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) { DATA = j; return j; }, function (e) { loading = null; throw e; });
    return loading;
  }
  /* great-circle distance in miles */
  function haversine(a, b) {
    var R = 3958.8, rad = Math.PI / 180, dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  function origin() { return state.origin || (DATA && DATA.fallback) || { lat: 33.78002, lng: -118.26251, label: "Wilmington 90744" }; }
  function isUsed(s) { return s.type === "self" || s.type === "full"; }
  function sorted() {
    var o = origin();
    return DATA.stores.filter(function (s) { return state.filter === "all" || (state.filter === "used" ? isUsed(s) : !isUsed(s)); })
      .map(function (s) { return { s: s, d: haversine(o, s) }; }).sort(function (a, b) { return a.d - b.d; });
  }

  /* ---------- the call script ---------- */
  function vinBit(car, l) {
    var v = String(car.vin || "").toUpperCase();
    if (v.length === 17) return l === "es" ? " El VIN es " + v + "." : " The VIN is " + v + ".";
    var v8 = car.vin8 || (v.length >= 8 ? v.slice(-8) : "");
    return v8 ? (l === "es" ? " El VIN termina en " + v8 + "." : " The VIN ends in " + v8 + ".") : "";
  }
  function unsure(part, car, l) {
    var q = part.q || [], out = [];
    if (q.indexOf("engine") >= 0 && !car.engine && !(PT.isEV && PT.isEV(car))) out.push(l === "es" ? "el motor" : "the engine size");
    if (q.indexOf("trim") >= 0 && !car.trim) out.push(l === "es" ? "la versión" : "the trim");
    if (q.indexOf("drive") >= 0 && !car.drive) out.push(l === "es" ? "la tracción" : "2WD or AWD");
    if (!out.length) return "";
    return l === "es" ? " No estoy seguro de " + out.join(", ") + "; ¿lo pueden buscar con el VIN?" : " I'm not sure of " + out.join(", ") + ", can you look it up by the VIN?";
  }
  /* kind = "all" | "new" | "used" (follows the filter) */
  function script(part, car, l, kind) {
    car = car || {};
    var say = pk(part.say, l); if (!say) return "";
    var withBody = (part.q || []).indexOf("body") >= 0;
    var d = PT.desc(car, l, withBody) || (l === "es" ? "mi carro" : "my car");
    var extra = vinBit(car, l) + unsure(part, car, l);
    if (l === "es") {
      if (kind === "used") return "Hola, ¿tienen " + say + " de un " + d + "?" + extra + " ¿Cuánto cuesta, de cuántas millas o en qué condición está, y tiene garantía? Si es de autoservicio: ¿tienen ese modelo en el yonke ahorita y en qué fila?";
      if (kind === "new") return "Hola, ¿tienen " + say + " para un " + d + "?" + extra + " ¿Cuánto cuesta, es original (OEM) o genérica, tiene garantía, y hay cargo por casco (core)?";
      return "Hola, ¿tienen " + say + " para un " + d + "?" + extra + " ¿Cuánto cuesta, es nueva, usada o genérica (OEM o aftermarket), y tiene garantía o cargo por casco (core)?";
    }
    if (kind === "used") return "Hi, do you have " + say + " off a " + d + "?" + extra + " What's the price, what's the mileage or condition, and is there a warranty? If it's self-serve: do you have that model in the yard right now, and which row?";
    if (kind === "new") return "Hi, do you have " + say + " for a " + d + "?" + extra + " What's the price, is it OEM or aftermarket, is there a warranty, and is there a core charge?";
    return "Hi, do you have " + say + " for a " + d + "?" + extra + " What's the price, is it new, used or aftermarket (OEM or aftermarket), and is there a warranty or core charge?";
  }

  /* where the part sits on the car (self-serve yards: you pull it yourself) */
  var WHERE = {
    body: { en: "Body panels bolt on under the hood edge, inside the wheel well and in the door jamb. Bumper covers use plastic clips + a few 10 mm bolts.", es: "Las láminas van atornilladas bajo la orilla del cofre, dentro del guardafango y en el marco de la puerta. Las fascias usan clips de plástico y unos tornillos de 10 mm." },
    brakes: { en: "Behind the wheel: lug wrench, caliper bolts (often 12–17 mm) and a C-clamp to push the piston back.", es: "Detrás de la llanta: llave de birlos, tornillos del caliper (casi siempre 12–17 mm) y una prensa en C para regresar el pistón." },
    lights: { en: "Headlights bolt in at the top behind the grille; many need the bumper cover loosened. Taillights come out from inside the trunk or tailgate.", es: "Los faros van atornillados arriba, detrás de la parrilla; muchos piden aflojar la fascia. Las calaveras se quitan desde adentro de la cajuela." },
    tail: { en: "Taillights come out from inside the trunk / hatch: a few nuts and one connector.", es: "Las calaveras se quitan desde adentro de la cajuela: unas tuercas y un conector." },
    doors: { en: "Inside the door: pop the door panel off (trim-clip tool, Phillips + Torx), then the part bolts to the inner door.", es: "Dentro de la puerta: quita el tapiz (herramienta para clips, desarmador de cruz y Torx); la pieza va atornillada por dentro." },
    susp: { en: "Behind the wheel: take the complete strut (spring + mount) so you don't need a spring compressor. Breaker bar + penetrating oil.", es: "Detrás de la llanta: llévate el amortiguador completo (con resorte y base) para no necesitar compresor de resortes. Barra de fuerza y aceite penetrante." },
    engine: { en: "Under the hood: bring socket extensions + a swivel; take a photo before you unplug anything.", es: "Bajo el cofre: lleva extensiones y una junta universal; toma foto antes de desconectar algo." },
    exhaust: { en: "Under the car: penetrating oil + breaker bar. Yard cars usually sit on wheel stands.", es: "Debajo del carro: aceite penetrante y barra de fuerza. En el yonke los carros suelen estar sobre bases." },
    ac: { en: "Under the dash or under the hood depending on the part. A/C lines must be emptied by a shop first: don't open them.", es: "Bajo el tablero o el cofre según la pieza. Las líneas de A/C las debe vaciar un taller primero: no las abras." },
    wipers: { en: "Under the hood near the washer tank, or at the base of the windshield.", es: "Bajo el cofre junto al depósito del limpiador, o en la base del parabrisas." }
  };

  /* ---------- render ---------- */
  function typeTxt(t) { return T("t_" + t); }
  function mapsLink(s) { return "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(s.name + ", " + s.address); }
  function card(x) {
    var s = x.s, used = isUsed(s);
    return '<article class="st-card st-' + s.type + '"><div class="st-top"><div><b>' + esc(s.name) + "</b><small>" + esc(s.address) + "</small><small>📞 " + esc(s.phone) + "</small></div>" +
      '<span class="st-dist">' + T("mi", { d: x.d < 10 ? x.d.toFixed(1) : Math.round(x.d) }) + "</span></div>" +
      '<div class="st-tags">' + (used ? '<span class="st-used">♻️ ' + T("usedBadge") + "</span>" : "") + '<span class="st-type">' + esc(typeTxt(s.type)) + "</span></div>" +
      '<p class="st-good">' + esc(pk(s.good)) + "</p>" +
      '<p class="st-hrs">🕗 ' + esc(pk(s.hours)) + "</p>" +
      '<div class="st-btns"><a class="btn primary small" href="tel:' + esc(s.tel) + '">' + T("call") + '</a><a class="btn ghost small" href="' + esc(mapsLink(s)) + '" target="_blank" rel="noopener">' + T("dir") + "</a></div>" +
      (s.inventory ? '<a class="st-inv" href="' + esc(s.inventory) + '" target="_blank" rel="noopener">' + T("inv") + " ↗</a>" : "") +
      (s.prices ? '<a class="st-inv" href="' + esc(s.prices) + '" target="_blank" rel="noopener">' + T("prices") + " ↗</a>" : "") +
      '<small class="st-src">✓ <a href="' + esc(s.source) + '" target="_blank" rel="noopener">' + T("src") + "</a></small></article>";
  }
  function bring(ctx, part) {
    var car = ctx.car || {}, where = WHERE[ctx.it.svc] || null, l = lg();
    var q = [car.year, car.make && car.make !== "__other" ? (W.VEH ? W.VEH.title(car.make) : car.make) : "", car.model, part.find || pk(part.name, "en"), "removal"].filter(Boolean).join(" ");
    return '<details class="st-bring"><summary>🧰 ' + T("bring") + "</summary><ul>" + T("tools").map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" +
      (where ? '<p class="note"><b>' + T("whereOnCar") + "</b> " + esc(pk(where, l)) + "</p>" : "") +
      '<a class="st-inv" href="https://www.youtube.com/results?search_query=' + encodeURIComponent(q) + '" target="_blank" rel="noopener">' + T("howTo") + " ↗</a></details>";
  }
  function draw(box, ctx) {
    var parts = (ctx.parts || []).filter(function (p) { return pk(p.say, "en"); });
    if (!parts.length) { box.innerHTML = ""; box.hidden = true; return; }
    box.hidden = false;
    if (state.sel >= parts.length) state.sel = 0;
    var part = parts[state.sel], kind = state.filter, l = ctx.lang || lg();
    var sc = script(part, ctx.car, l, kind), list = sorted(), o = origin(), anySelf = list.some(function (x) { return x.s.type === "self"; });
    box._script = sc; box._lang = l;
    var h = '<div class="st-head"><p class="kick" style="margin:0">💸 ' + T("h") + "</p><small>" + T("sub") + "</small></div>" +
      '<div class="st-bar"><div class="lt st-filter" role="group" aria-label="' + esc(T("h")) + '">' +
      ["all", "new", "used"].map(function (f) { return '<button type="button" data-stf="' + f + '" aria-pressed="' + (state.filter === f) + '">' + T(f === "all" ? "fAll" : f === "new" ? "fNew" : "fUsed") + "</button>"; }).join("") + "</div>" +
      (state.origin ? "" : '<button type="button" class="pill acc st-geo" data-stgeo' + (state.geoBusy ? " disabled" : "") + ">" + (state.geoBusy ? T("geoWait") : T("useMe")) + "</button>") + "</div>" +
      '<p class="note st-from">' + T("from", { o: state.origin ? T("fromMe") : esc(o.label) }) + (state.geoMsg ? " · " + esc(state.geoMsg) : "") + "</p>";
    /* the script */
    h += '<div class="st-say"><p class="kick" style="margin:0 0 4px">🗣️ ' + T("say") + "</p>" +
      (parts.length > 1 ? '<div class="st-parts"><span>' + T("forPart") + "</span>" + parts.map(function (p, i) { return '<button type="button" class="pill' + (i === state.sel ? " acc" : "") + '" data-stp="' + i + '" aria-pressed="' + (i === state.sel) + '">' + esc(pk(p.name)) + "</button>"; }).join("") + "</div>" : "") +
      '<div class="say"><p lang="' + l + '" class="st-script">' + esc(sc) + '</p><div class="sayb"><button type="button" class="btn ghost small" data-stcopy>' + T("copy") + '</button><button type="button" class="btn ghost small" data-stread>' + T("read") + "</button></div></div></div>";
    if (anySelf && state.filter !== "new") h += bring(ctx, part);
    h += list.length ? list.map(card).join("") : '<div class="empty">' + T("none") + "</div>";
    h += '<div class="st-carlos"><a class="btn primary w100" href="#book" data-close data-stbook>' + T("carlos", { m: esc(mech()) }) + "</a><small>" + T("carlosSub") + "</small></div>";
    h += '<p class="disc">📞 ' + T("ahead") + '</p><p class="fine">' + T("honest", { d: esc(DATA.checked || "") }) + "</p>";
    box.innerHTML = h;
  }
  function copyText(s) {
    function fb() { var ta = D.createElement("textarea"); ta.value = s; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0"; D.body.appendChild(ta); ta.select(); var ok = false; try { ok = D.execCommand("copy"); } catch (e) {} D.body.removeChild(ta); return ok; }
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(s).then(function () { return true; }, function () { return fb(); });
    return Promise.resolve(fb());
  }
  function speak(btn, text, l) {
    var ss = W.speechSynthesis;
    if (!ss || !W.SpeechSynthesisUtterance) { M.toast(T("noVoice")); return; }
    if (ss.speaking) { ss.cancel(); btn.textContent = T("read"); return; }
    /* read a VIN one character at a time */
    text = text.replace(/\b[A-HJ-NPR-Z0-9]{17}\b/g, function (v) { return v.split("").join(" "); });
    var u = new SpeechSynthesisUtterance(text), want = l === "es" ? "es" : "en";
    u.lang = l === "es" ? "es-MX" : "en-US"; u.rate = 0.95;
    var v = (ss.getVoices() || []).filter(function (x) { return String(x.lang || "").toLowerCase().indexOf(want) === 0; })[0]; if (v) u.voice = v;
    u.onend = u.onerror = function () { btn.textContent = T("read"); };
    btn.textContent = T("stop");
    ss.cancel(); ss.speak(u);
  }
  function locate(box, ctx, quiet) {
    if (!navigator.geolocation) { state.geoMsg = quiet ? "" : T("geoNo"); draw(box, ctx); return; }
    state.geoBusy = true; if (!quiet) draw(box, ctx);
    navigator.geolocation.getCurrentPosition(function (p) {
      state.geoBusy = false; state.geoMsg = ""; state.origin = { lat: p.coords.latitude, lng: p.coords.longitude, mine: true };
      if (box.isConnected) draw(box, ctx);
    }, function () { state.geoBusy = false; state.geoMsg = quiet ? "" : T("geoNo"); if (box.isConnected) draw(box, ctx); }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 });
  }

  /* ---------- public: called by app.js after it draws the parts sheet ---------- */
  function mount(container, ctx) {
    if (!container || !ctx || !ctx.it || !PT) return;
    stop();
    var key = ctx.it.svc + "|" + ctx.it.opt + "|" + (ctx.it.pos || "");
    if (key !== state.key) { state.key = key; state.sel = 0; }
    var box = D.createElement("section");
    box.className = "st-wrap"; box.setAttribute("aria-label", T("h"));
    var disc = container.querySelector(":scope > .disc");
    if (disc) container.insertBefore(box, disc); else container.appendChild(box);
    if (!(ctx.parts || []).some(function (p) { return pk(p.say, "en"); })) { box.hidden = true; return; }
    box.innerHTML = '<p class="note">' + T("load") + "</p>";
    box.addEventListener("click", function (e) {
      var b;
      if ((b = e.target.closest("[data-stf]"))) { state.filter = b.getAttribute("data-stf"); draw(box, ctx); return; }
      if ((b = e.target.closest("[data-stp]"))) { state.sel = +b.getAttribute("data-stp"); draw(box, ctx); return; }
      if (e.target.closest("[data-stgeo]")) { locate(box, ctx, false); return; }
      if (e.target.closest("[data-stcopy]")) { copyText(box._script || "").then(function (ok) { M.toast(ok ? T("copied") : T("copyFail")); }); return; }
      if ((b = e.target.closest("[data-stread]"))) { speak(b, box._script || "", box._lang); return; }
      if (e.target.closest("[data-stbook]") && typeof ctx.book === "function") ctx.book();
    });
    load().then(function () {
      if (!box.isConnected) return;
      draw(box, ctx);
      /* only use the location silently if the customer already allowed it; otherwise wait for the button */
      if (!state.origin && navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: "geolocation" }).then(function (r) { if (r.state === "granted" && !state.origin) locate(box, ctx, true); }, function () {});
      }
    }, function () { if (box.isConnected) box.innerHTML = '<p class="note warnline">' + T("loadErr") + "</p>"; });
  }
  /* stop any reading when the sheet closes / redraws */
  function stop() { try { if (W.speechSynthesis) W.speechSynthesis.cancel(); } catch (e) {} }

  W.STORES = { mount: mount, stop: stop, script: script, haversine: haversine, load: load };
})();
