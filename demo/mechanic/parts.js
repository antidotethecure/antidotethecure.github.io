/* SousShift AI — Mobile Mechanic demo: what parts a job usually takes + where to look for them. Exposes window.PARTS.
   HONEST BY DESIGN: there is no free parts-catalog API, so this is a built-in "typical parts for this job" map, tailored
   only where real data allows (engine size from the VIN or the customer, model year for A/C refrigerant, make for the
   factory coolant type, EV / diesel for jobs that don't apply). It NEVER shows OEM part numbers. Exact fitment needs a
   paid catalog feed (e.g. PartsTech, or an ACES/PIES catalog) which can be wired in later.
   "Find exact part" = plain prefilled searches on public sites (config.partStores), opened in a new tab. No scraping.
   Shared by the customer page and the shop page. Needs config.js (+ core.js for the language). */
(function () {
  "use strict";
  var W = window, C = W.SHOP_CFG;
  function L(en, es) { return { en: en, es: es }; }
  function lang() { return W.MECH && W.MECH.lang ? W.MECH.lang() : "en"; }
  function pk(o, lg) { return o == null ? "" : typeof o === "string" ? o : (o[lg || lang()] || o.en || ""); }

  /* ---------- the car, as the parts counter wants to hear it ---------- */
  var BODY = { sedan: L("sedan", "sedán"), hatch: L("hatchback", "hatchback"), coupe: L("coupe", "coupé"), suv: L("SUV", "SUV"), van: L("van", "van"), truck: L("pickup", "pickup") };
  function makeName(c) { return W.VEH ? W.VEH.title(c.make) : String(c.make || ""); }
  function isEV(c) { return c && (c.fuel === "electric" || c.engine === "EV"); }
  function engineTxt(c, lg) {
    if (isEV(c)) return lg === "es" ? "Eléctrico" : "Electric";
    var s = c.engine ? c.engine + "L" : "";
    if (c.fuel === "hybrid") s += (s ? " " : "") + (lg === "es" ? "híbrido" : "hybrid");
    if (c.fuel === "diesel") s += (s ? " " : "") + "diesel";
    return s;
  }
  /* "2016 Honda Civic EX 2.0L FWD" (badge) */
  function label(c, lg) {
    if (!c || !c.make || c.make === "__other") return c && c.model ? [c.year, c.model].filter(Boolean).join(" ") : "";
    return [c.year, makeName(c), c.model, c.trim, engineTxt(c, lg || lang()), c.drive].filter(Boolean).join(" ");
  }
  /* "2016 Honda Civic EX, 2.0L, FWD, sedan" (script) */
  function desc(c, lg, withBody) {
    var head = [c.year, c.make && c.make !== "__other" ? makeName(c) : "", c.model, c.trim].filter(Boolean).join(" ");
    var bits = [head, engineTxt(c, lg), c.drive];
    if (withBody && c.body && BODY[c.body]) bits.push(pk(BODY[c.body], lg));
    return bits.filter(Boolean).join(", ");
  }

  /* ---------- tailoring helpers (only where data allows) ---------- */
  function liters(c) { var n = parseFloat(c && c.engine); return isFinite(n) ? n : 0; }
  function oilQty(c) {
    var l = liters(c);
    if (c.fuel === "diesel") return L("Diesel engines often take 10–15 qt of diesel-rated oil. Exact amount is in the owner's manual.", "Los motores diésel suelen llevar 10–15 cuartos de aceite para diésel. La cantidad exacta está en el manual.");
    if (!l) return L("Typical: 4–6 qt. Add the engine size above for a closer range. Exact amount + grade are on the oil cap / owner's manual.", "Típico: 4–6 cuartos. Agrega el tamaño del motor arriba para un rango más cercano. La cantidad y el grado exactos están en el tapón / manual.");
    var r = l <= 1.6 ? "3.5–4.4" : l <= 2.5 ? "4.4–5.1" : l <= 3.0 ? "4.5–6" : l <= 4.0 ? "5–6.5" : l <= 5.7 ? "5.5–8" : "6–8+";
    return L("Typical for a " + l.toFixed(1) + "L engine: about " + r + " qt. Exact amount + grade (0W-20, 5W-30…) are on the oil cap / owner's manual.",
      "Típico para un motor " + l.toFixed(1) + "L: unos " + r + " cuartos. La cantidad y el grado exactos (0W-20, 5W-30…) están en el tapón / manual.");
  }
  function refrigerant(c) {
    var y = +c.year || 0;
    if (y && y < 2013) return L("Most " + y + " cars use R-134a. Check the label under the hood.", "La mayoría de los carros " + y + " usan R-134a. Revisa la etiqueta bajo el cofre.");
    if (y >= 2018) return L("Most " + y + "+ cars use R-1234yf (pricier). Check the label under the hood.", "La mayoría de los carros " + y + "+ usan R-1234yf (más caro). Revisa la etiqueta bajo el cofre.");
    return L("R-134a or R-1234yf depending on the model (changeover years). The label under the hood says which.", "R-134a o R-1234yf según el modelo (años de cambio). La etiqueta bajo el cofre dice cuál.");
  }
  function coolant(c) {
    var m = String(c.make || "").toUpperCase();
    var brand = /HONDA|ACURA/.test(m) ? "Honda Type 2 (blue)" : /TOYOTA|LEXUS|SCION/.test(m) ? "Toyota Super Long Life (pink)" : /CHEVROLET|GMC|BUICK|CADILLAC/.test(m) ? "Dex-Cool (orange)" : "";
    if (isEV(c)) return L("EVs use coolant to keep the battery at temperature. Exact type is in the owner's manual.", "Los eléctricos usan anticongelante para la batería. El tipo exacto está en el manual.");
    return brand ? L("Factory type for " + makeName(c) + ": " + brand + ". About 1–2 gal of 50/50 for a flush.", "Tipo de fábrica para " + makeName(c) + ": " + brand + ". Aprox. 1–2 galones de 50/50 para un cambio completo.")
      : L("Match the type in the overflow tank / owner's manual. About 1–2 gal of 50/50 for a flush.", "Usa el mismo tipo del depósito / manual. Aprox. 1–2 galones de 50/50 para un cambio completo.");
  }
  function plugs(c) {
    var n = parseInt(c.cyl, 10);
    return n ? L(n + " plugs (one per cylinder). Some engines use iridium plugs that last 100k miles.", n + " bujías (una por cilindro). Algunos motores usan bujías de iridio que duran 100 mil millas.")
      : L("One per cylinder (4, 6 or 8). Add the engine size or VIN to narrow it down.", "Una por cilindro (4, 6 u 8). Agrega el motor o el VIN para saber cuántas.");
  }
  function headlight(c) {
    if (c.lights === "led") return L("Factory LED headlights usually aren't a bulb: the whole headlight assembly gets replaced (costs more).", "Los faros LED de fábrica casi nunca son foco: se cambia la unidad completa (cuesta más).");
    if (c.lights === "hid") return L("HID (xenon) bulbs: D-series bulb, sometimes the ballast too.", "Focos HID (xenón): foco serie D, a veces también el balastro.");
    if (c.lights === "halogen") return L("Halogen bulb: the size (H11, 9005, H4…) is in the owner's manual or the store's lookup.", "Foco de halógeno: la medida (H11, 9005, H4…) está en el manual o en el buscador de la tienda.");
    return L("Bulb size depends on the trim. Tap halogen / HID / LED below if you know it.", "La medida del foco depende de la versión. Toca halógeno / HID / LED abajo si lo sabes.");
  }

  /* ---------- position words ---------- */
  function ax(pos) { return pos === "R" ? L("rear", "traseras") : L("front", "delanteras"); }
  function axM(pos) { return pos === "R" ? L("rear", "traseros") : L("front", "delanteros"); }
  var DOOR = { FL: L("front driver-side", "delantera del lado del conductor"), FR: L("front passenger-side", "delantera del lado del pasajero"),
    RL: L("rear driver-side", "trasera del lado del conductor"), RR: L("rear passenger-side", "trasera del lado del pasajero") };

  /* ---------- the job -> parts map ----------
     each part: n = list name, say = what to ask the counter for (with article), find = search words,
     q = what the counter will ask (engine / drive / trim / body / lights / abs), d = detail (fn(car) or {en,es}) */
  var PAINT = L("Body parts arrive primed (unpainted). Paint matching is quoted separately after he sees the car.", "Las piezas de carrocería llegan con primer (sin pintar). La pintura se cotiza aparte cuando vea el carro.");
  function P(n, say, find, q, d) { return { n: n, say: say || n, find: find, q: q || [], d: d || null }; }
  var NA_EV = L("Electric cars don't have this part. Nothing to buy here.", "Los carros eléctricos no tienen esta pieza. No hay nada que comprar.");
  var MAP = {
    "diag.scan": { none: L("No parts: scan + inspection labor only.", "Sin piezas: solo escaneo e inspección.") },
    "diag.deep": { none: L("No parts until the problem is found. The mechanic quotes parts after diagnosis.", "Sin piezas hasta encontrar la falla. El mecánico cotiza piezas después del diagnóstico.") },
    "diag.evap": { ev: true, parts: function () { return [P(L("Gas cap (only if it fails the test)", "Tapón de gasolina (solo si falla la prueba)"), L("a gas cap", "un tapón de gasolina"), "gas cap", ["engine"])]; } },
    "oil.conv": { ev: true, parts: oil }, "oil.syn": { ev: true, parts: oil },
    "brakes.pads": { parts: function (c, it) {
      return [P(L("Brake pad set (" + ax(it.pos).en + " axle)", "Juego de balatas (" + ax(it.pos).es + ")"), L("a " + ax(it.pos).en + " brake pad set", "un juego de balatas " + ax(it.pos).es), ax(it.pos).en + " brake pads", ["trim", "drive"]),
        P(L("Brake hardware / clip kit", "Kit de herrajes / clips de freno"), L("a " + ax(it.pos).en + " brake hardware kit", "un kit de herrajes de freno " + axM(it.pos).es), "brake hardware kit"),
        P(L("Brake caliper grease", "Grasa para calipers"), L("a packet of brake caliper grease", "un sobre de grasa para calipers"), "brake caliper grease")];
    }, note: function (c, it) { return it.pos === "R" ? L("Some rear axles use drum brakes (shoes instead of pads). The mechanic confirms.", "Algunos ejes traseros usan tambor (zapatas en vez de balatas). El mecánico confirma.") : null; } },
    "brakes.padrot": { parts: function (c, it) {
      return [P(L("Brake pad set (" + ax(it.pos).en + " axle)", "Juego de balatas (" + ax(it.pos).es + ")"), L("a " + ax(it.pos).en + " brake pad set", "un juego de balatas " + ax(it.pos).es), ax(it.pos).en + " brake pads", ["trim", "drive"]),
        P(L("Brake rotors (pair, " + ax(it.pos).en + ")", "Discos de freno (par, " + axM(it.pos).es + ")"), L("a pair of " + ax(it.pos).en + " brake rotors", "un par de discos de freno " + axM(it.pos).es), ax(it.pos).en + " brake rotors", ["trim", "drive", "abs"]),
        P(L("Brake hardware / clip kit", "Kit de herrajes / clips de freno"), L("a " + ax(it.pos).en + " brake hardware kit", "un kit de herrajes de freno " + axM(it.pos).es), "brake hardware kit"),
        P(L("Brake fluid (top-off)", "Líquido de frenos (rellenar)"), L("a bottle of brake fluid", "una botella de líquido de frenos"), "brake fluid", [], L("DOT 3 or DOT 4: it's printed on the reservoir cap.", "DOT 3 o DOT 4: viene impreso en el tapón del depósito."))];
    } },
    "brakes.flush": { parts: function () { return [P(L("Brake fluid (about 1 qt)", "Líquido de frenos (aprox. 1 cuarto)"), L("a quart of brake fluid", "un cuarto de líquido de frenos"), "brake fluid", [], L("DOT 3 or DOT 4: it's printed on the reservoir cap. Don't mix with DOT 5 (silicone).", "DOT 3 o DOT 4: viene impreso en el tapón. No mezclar con DOT 5 (silicón)."))]; } },
    "tires.rotate": { none: L("No parts: labor only.", "Sin piezas: solo mano de obra.") },
    "tires.flat": { parts: function () { return [P(L("Plug-patch repair kit", "Parche-tapón para llanta"), L("a tire plug-patch", "un parche-tapón para llanta"), "tire plug patch"), P(L("Valve stem (if leaking)", "Válvula (si fuga)"), L("a tire valve stem", "una válvula de llanta"), "tire valve stem")]; },
      note: L("Sidewall damage can't be patched safely: that tire gets replaced.", "Un daño en el costado no se puede parchar con seguridad: esa llanta se cambia.") },
    "tires.one": { parts: tire(1) }, "tires.four": { parts: tire(4) },
    "lights.bulb": { parts: function (c) {
      var led = c.lights === "led";
      return [led ? P(L("Headlight assembly (factory LED)", "Unidad de faro (LED de fábrica)"), L("a driver-side headlight assembly", "una unidad de faro del lado del conductor"), "headlight assembly", ["trim", "lights"], headlight)
        : P(L("Headlight bulb(s)", "Foco(s) de faro"), L("a pair of low-beam headlight bulbs", "un par de focos de luz baja"), "headlight bulb", ["trim", "lights"], headlight)];
    } },
    "lights.led": { parts: function () { return [P(L("LED headlight bulbs (pair, same base size)", "Focos LED de faro (par, misma base)"), L("a pair of LED headlight bulbs", "un par de focos LED para faro"), "LED headlight bulbs", ["trim", "lights"], L("Must match the bulb size (H11, 9005…). Projector housings aim LEDs best.", "Deben ser de la misma medida (H11, 9005…). Las micas tipo proyector apuntan mejor los LED."))]; } },
    "lights.restore": { parts: function () { return [P(L("Headlight restoration kit (sandpaper, compound, UV clear coat)", "Kit para pulir faros (lija, pulidor, barniz UV)"), L("a headlight restoration kit", "un kit para pulir faros"), "headlight restoration kit")]; } },
    "tail.bulb": { parts: function () { return [P(L("Taillight / brake light bulb", "Foco de calavera / freno"), L("a pair of brake light bulbs", "un par de focos de freno"), "brake light bulb", ["body"], L("Common sizes: 7443, 3157, 7440. The owner's manual lists it.", "Medidas comunes: 7443, 3157, 7440. Viene en el manual."))]; } },
    "tail.assy": { parts: function () { return [P(L("Taillight assembly (one side)", "Calavera completa (un lado)"), L("a driver-side taillight assembly", "una calavera del lado del conductor"), "tail light assembly", ["trim", "body"])]; } },
    "battery.test": { none: L("No parts: test only.", "Sin piezas: solo prueba.") },
    "battery.replace": { parts: function (c) {
      return [P(isEV(c) ? L("12-volt battery (EVs still have one)", "Batería de 12 voltios (los eléctricos también tienen)") : L("12-volt car battery", "Batería de 12 voltios"),
        L("a 12-volt battery", "una batería de 12 voltios"), "battery", ["engine"], L("The group size (24F, 35, H6/48…) is on the label of your current battery. Cars with auto start-stop need an AGM battery.", "El tamaño de grupo (24F, 35, H6/48…) está en la etiqueta de tu batería actual. Los carros con auto start-stop necesitan batería AGM.")),
        P(L("Terminal protector spray", "Protector de terminales"), L("a can of battery terminal protector", "un protector de terminales de batería"), "battery terminal protector")];
    } },
    "battery.terminals": { parts: function () { return [P(L("Terminal cleaner + protector", "Limpiador y protector de terminales"), L("battery terminal cleaner and protector", "limpiador y protector de terminales"), "battery terminal cleaner"), P(L("Terminal ends (only if corroded through)", "Terminales (solo si están muy sulfatadas)"), L("a pair of battery terminal ends", "un par de terminales de batería"), "battery terminal end")]; } },
    "engine.plugs": { ev: true, diesel: L("Diesel engines don't use spark plugs (they have glow plugs). Ask the mechanic.", "Los motores diésel no usan bujías (usan bujías de precalentamiento). Pregunta al mecánico."),
      parts: function (c) { return [P(L("Spark plugs", "Bujías"), L(c.cyl ? c.cyl + " spark plugs" : "a set of spark plugs", c.cyl ? c.cyl + " bujías" : "un juego de bujías"), "spark plugs", ["engine"], plugs),
        P(L("Coil boots / dielectric grease (if needed)", "Capuchones de bobina / grasa dieléctrica (si hace falta)"), L("a tube of dielectric grease", "un tubo de grasa dieléctrica"), "dielectric grease")]; } },
    "engine.belt": { ev: true, parts: function () { return [P(L("Serpentine belt", "Banda de accesorios"), L("a serpentine belt", "una banda de accesorios"), "serpentine belt", ["engine", "trim"], L("Length depends on the engine and whether it has A/C.", "El largo depende del motor y si tiene A/C.")),
      P(L("Belt tensioner (only if worn)", "Tensor de banda (solo si está gastado)"), L("a serpentine belt tensioner", "un tensor de banda"), "belt tensioner", ["engine"])]; } },
    "engine.coolant": { parts: function (c) { return [P(L("Coolant / antifreeze", "Anticongelante"), L("2 gallons of 50/50 coolant", "2 galones de anticongelante 50/50"), "coolant antifreeze", ["engine"], coolant)]; } },
    "engine.coil": { ev: true, diesel: L("Diesel engines don't have ignition coils.", "Los motores diésel no tienen bobinas."),
      parts: function () { return [P(L("Ignition coil (one)", "Bobina de encendido (una)"), L("an ignition coil", "una bobina de encendido"), "ignition coil", ["engine"]), P(L("Spark plug for that cylinder", "Bujía de ese cilindro"), L("a spark plug", "una bujía"), "spark plug", ["engine"])]; } },
    "engine.thermo": { ev: true, parts: function (c) { return [P(L("Thermostat + gasket / housing", "Termostato + empaque / carcasa"), L("a thermostat with gasket", "un termostato con empaque"), "thermostat", ["engine"]), P(L("Coolant (top-off)", "Anticongelante (rellenar)"), L("a gallon of 50/50 coolant", "un galón de anticongelante 50/50"), "coolant", ["engine"], coolant)]; } },
    "susp.inspect": { none: L("No parts: inspection only.", "Sin piezas: solo revisión.") },
    "susp.struts": { parts: function (c, it) {
      return [P(L("Strut / shock assemblies (pair, " + axM(it.pos).en + ")", "Amortiguadores (par, " + axM(it.pos).es + ")"), L("a pair of " + axM(it.pos).en + " complete strut assemblies", "un par de amortiguadores " + axM(it.pos).es + " completos"), axM(it.pos).en + " strut assembly", ["drive", "trim"], L("\"Complete\" (quick) struts come with the spring + mount: faster and safer to install.", "Los amortiguadores \"completos\" traen resorte y base: más rápidos y seguros de instalar.")),
        P(L("Wheel alignment afterwards (recommended)", "Alineación después (recomendado)"), L("", ""), "", [])];
    } },
    "susp.links": { parts: function () { return [P(L("Sway bar end links (pair)", "Tornillos estabilizadores (par)"), L("a pair of front sway bar end links", "un par de tornillos estabilizadores delanteros"), "sway bar link", ["drive", "trim"])]; } },
    "ac.recharge": { parts: function (c) { return [P(L("A/C refrigerant", "Gas refrigerante de A/C"), L("A/C refrigerant", "gas refrigerante para A/C"), "AC refrigerant", [], refrigerant), P(L("UV dye (optional)", "Tinte UV (opcional)"), L("A/C UV leak dye", "tinte UV para fugas de A/C"), "AC UV dye")]; } },
    "ac.leak": { parts: function (c) { return [P(L("UV dye + O-ring kit", "Tinte UV + kit de o-rings"), L("A/C UV dye and an O-ring kit", "tinte UV y un kit de o-rings para A/C"), "AC o-ring kit", [], refrigerant)]; } },
    "ac.cabin": { parts: function () { return [P(L("Cabin air filter", "Filtro de cabina"), L("a cabin air filter", "un filtro de cabina"), "cabin air filter", ["trim"])]; } },
    "sound.head": { parts: function () { return [P(L("Head unit (CarPlay / Android Auto)", "Estéreo (CarPlay / Android Auto)"), L("", ""), "", []),
      P(L("Dash kit for this car", "Base de tablero para este carro"), L("a stereo dash kit", "una base de tablero para estéreo"), "stereo dash kit", ["trim"]),
      P(L("Wiring harness adapter", "Arnés adaptador"), L("a stereo wiring harness adapter", "un arnés adaptador para estéreo"), "radio wiring harness", ["trim"]),
      P(L("Antenna adapter + steering-wheel control module", "Adaptador de antena + módulo de controles del volante"), L("an antenna adapter and steering-wheel control interface", "un adaptador de antena y un módulo de controles del volante"), "steering wheel control interface", ["trim"])]; },
      note: L("Car audio parts usually come from an audio shop, not a parts counter.", "Las piezas de audio normalmente vienen de una tienda de audio, no del mostrador de autopartes.") },
    "sound.spk": { parts: function () { return [P(L("Speakers (pair, size depends on the door)", "Bocinas (par, la medida depende de la puerta)"), L("", ""), "", ["trim"]), P(L("Speaker adapters + harness", "Adaptadores y arnés de bocinas"), L("speaker mounting adapters and harness", "adaptadores y arnés para bocinas"), "speaker adapter", ["trim"])]; } },
    "sound.sub": { parts: function () { return [P(L("Subwoofer + enclosure", "Subwoofer + cajón"), L("", ""), "", []), P(L("Amplifier", "Amplificador"), L("", ""), "", []), P(L("Amp wiring kit (power, ground, RCA, fuse)", "Kit de cables para amplificador"), L("an amplifier wiring kit", "un kit de cables para amplificador"), "amplifier wiring kit")]; } },
    "tint.front2": { parts: tint }, "tint.full": { parts: tint }, "tint.strip": { parts: tint },
    "wipers.blades": { parts: function (c) {
      var rear = c.body === "suv" || c.body === "hatch" || c.body === "van";
      return [P(L("Wiper blades (driver + passenger sizes differ)", "Plumas (la del conductor y la del pasajero son de distinto largo)"), L("a pair of front wiper blades", "un par de plumas delanteras"), "wiper blades", ["body"])]
        .concat(rear ? [P(L("Rear wiper blade", "Pluma trasera"), L("a rear wiper blade", "una pluma trasera"), "rear wiper blade", ["body"])] : []);
    } },
    "wipers.pump": { parts: function () { return [P(L("Washer pump + grommet", "Bomba del limpiador + hule"), L("a windshield washer pump", "una bomba de limpiaparabrisas"), "washer pump", ["trim"])]; } },
    "doors.reg": { parts: function (c, it) { var d = DOOR[it.pos] || DOOR.FL; return [P(L("Window regulator, " + d.en + " door (with or without motor)", "Elevador de ventana, puerta " + d.es + " (con o sin motor)"), L("a " + d.en + " window regulator with motor", "un elevador de ventana con motor para la puerta " + d.es), d.en + " window regulator", ["body", "trim"], L("Many cars sell the regulator and motor together. Power or manual windows matters.", "Muchos carros venden el elevador junto con el motor. Importa si las ventanas son eléctricas o manuales."))]; } },
    "doors.lock": { parts: function (c, it) { var d = DOOR[it.pos] || DOOR.FL; return [P(L("Door lock actuator, " + d.en + " door", "Actuador de chapa, puerta " + d.es), L("a " + d.en + " door lock actuator", "un actuador de chapa para la puerta " + d.es), d.en + " door lock actuator", ["body", "trim"])]; } },
    "exhaust.inspect": { ev: true, none: L("No parts: inspection only.", "Sin piezas: solo revisión.") },
    "exhaust.muffler": { ev: true, parts: function () { return [P(L("Muffler / pipe section", "Mofle / tramo de tubo"), L("a muffler", "un mofle"), "muffler", ["engine", "drive"]), P(L("Clamps, hangers, gaskets", "Abrazaderas, soportes, empaques"), L("exhaust clamps, hangers and gaskets", "abrazaderas, soportes y empaques de escape"), "exhaust gasket", ["engine"])]; } },
    "exhaust.o2": { ev: true, parts: function () { return [P(L("Oxygen (O2) sensor", "Sensor de oxígeno (O2)"), L("an upstream oxygen sensor", "un sensor de oxígeno de antes del catalizador"), "oxygen sensor", ["engine", "drive"], L("Upstream (before the converter) or downstream (after). A trouble code says which: Sensor 1 = upstream.", "Antes del catalizador o después. El código dice cuál: Sensor 1 = antes."))]; } },
    "exhaust.cat": { ev: true, parts: function () { return [P(L("Catalytic converter", "Convertidor catalítico"), L("a catalytic converter", "un convertidor catalítico"), "catalytic converter", ["engine", "drive"], L("In California it must be a CARB-approved converter (it has an EO number). Federal-only converters aren't legal here.", "En California debe ser un convertidor aprobado por CARB (con número EO). Los de solo uso federal no son legales aquí.")),
      P(L("Exhaust gaskets + hardware", "Empaques y tornillería de escape"), L("exhaust gaskets and hardware", "empaques y tornillería de escape"), "exhaust gasket", ["engine"])]; } },
    "detail.int": { none: L("Supplies only, nothing to order.", "Solo productos de limpieza, nada que pedir.") }, "detail.ext": { none: L("Supplies only, nothing to order.", "Solo productos de limpieza, nada que pedir.") }, "detail.full": { none: L("Supplies only, nothing to order.", "Solo productos de limpieza, nada que pedir.") },
    "body.fenderL": { parts: fender("L") }, "body.fenderR": { parts: fender("R") },
    "body.bumperF": { parts: bumper("F") }, "body.bumperR": { parts: bumper("R") },
    "body.mirrorL": { parts: mirror("L") }, "body.mirrorR": { parts: mirror("R") },
    "body.hood": { parts: function () { return [P(L("Hood panel (primed, unpainted)", "Cofre (con primer, sin pintar)"), L("a hood panel", "un cofre"), "hood panel", ["trim"]), P(L("Hood insulation pad + clips (if torn)", "Aislante del cofre + clips (si está roto)"), L("a hood insulation pad", "un aislante de cofre"), "hood insulation")]; }, note: PAINT },
    "body.grille": { parts: function () { return [P(L("Front grille", "Parrilla delantera"), L("a front grille", "una parrilla delantera"), "grille", ["trim"], L("Grilles change by trim (chrome, black, sport). The trim name matters here.", "La parrilla cambia según la versión (cromo, negra, deportiva). Aquí importa la versión."))]; } },
    "body.handle": { parts: function (c, it) { var d = DOOR[it.pos] || DOOR.FL; return [P(L("Outside door handle (" + d.en + ")", "Manija exterior (" + d.es + ")"), L("a " + d.en + " outside door handle", "una manija exterior de la puerta " + d.es), d.en + " exterior door handle", ["body", "trim"], L("Some come with a keyhole (driver door) or smart-key sensor. Paint-to-match is separate.", "Algunas traen chapa (puerta del conductor) o sensor de llave inteligente. La pintura va aparte."))]; } }
  };
  MAP["body.fenderL"].note = MAP["body.fenderR"].note = MAP["body.bumperF"].note = MAP["body.bumperR"].note = PAINT;
  function oil(c) { return [P(L("Engine oil", "Aceite de motor"), L("engine oil", "aceite de motor"), "engine oil", ["engine"], oilQty), P(L("Oil filter", "Filtro de aceite"), L("an oil filter", "un filtro de aceite"), "oil filter", ["engine"]), P(L("Drain plug washer", "Rondana del tapón"), L("a drain plug washer", "una rondana para el tapón de aceite"), "oil drain plug gasket", ["engine"])]; }
  function tire(n) { return function () { return [P(L(n === 1 ? "Tire" : "Tires (set of 4)", n === 1 ? "Llanta" : "Llantas (juego de 4)"), L(n === 1 ? "one tire" : "a set of 4 tires", n === 1 ? "una llanta" : "un juego de 4 llantas"), "tires", ["trim"], L("The size (like 215/55R16) is on the sticker inside the driver's door and on the tire sidewall.", "La medida (como 215/55R16) está en la etiqueta de la puerta del conductor y en el costado de la llanta.")),
    P(L("Valve stem / TPMS service kit", "Válvula / kit de servicio TPMS"), L(n === 1 ? "a TPMS service kit" : "4 TPMS service kits", n === 1 ? "un kit de servicio TPMS" : "4 kits de servicio TPMS"), "TPMS service kit")]; }; }
  function tint() { return [P(L("Window film (legal shade for your state)", "Película polarizada (tono legal en tu estado)"), L("", ""), "", [], L("In California the front side windows must let in at least 70% of light (or use a medical exemption). Usually from a tint supplier, not a parts counter.", "En California las ventanas delanteras laterales deben dejar pasar al menos 70% de luz (o tener exención médica). Normalmente viene de un proveedor de polarizado."))]; }
  function sideTxt(s) { return s === "L" ? L("driver-side", "del lado del conductor") : L("passenger-side", "del lado del pasajero"); }
  function fender(s) { return function () { var d = sideTxt(s); return [P(L("Front fender, " + d.en + " (primed)", "Salpicadera delantera " + d.es + " (con primer)"), L("a front " + d.en + " fender", "una salpicadera delantera " + d.es), "front fender " + (s === "L" ? "left" : "right"), ["body", "trim"]), P(L("Fender liner clips / screws", "Clips / tornillos del loderas"), L("fender liner clips", "clips para loderas"), "fender liner clips")]; }; }
  function bumper(f) { return function () { var e = f === "F" ? L("front", "delantera") : L("rear", "trasera"); return [P(L("Bumper cover, " + e.en + " (primed)", "Fascia de defensa " + e.es + " (con primer)"), L("a " + e.en + " bumper cover", "una fascia de defensa " + e.es), e.en + " bumper cover", ["body", "trim"], L("Ask if it needs holes for parking sensors or fog lights.", "Pregunta si necesita hoyos para sensores de estacionamiento o faros de niebla.")), P(L("Bumper clips + retainers", "Clips y retenes de defensa"), L("a bumper clip kit", "un kit de clips de defensa"), "bumper clips")]; }; }
  function mirror(s) { return function () { var d = sideTxt(s); return [P(L("Side mirror, " + d.en, "Espejo lateral " + d.es), L("a " + d.en + " side mirror", "un espejo lateral " + d.es), "side mirror " + (s === "L" ? "left" : "right"), ["trim", "body"], L("The counter will ask: power or manual? Heated? Turn signal? Blind-spot light? Check the old one before you call.", "En el mostrador te preguntan: ¿eléctrico o manual? ¿Térmico? ¿Con direccional? ¿Con luz de punto ciego? Revisa el viejo antes de llamar."))]; }; }

  /* ---------- public: parts for one job item ---------- */
  function forItem(it, car) {
    car = car || {};
    var k = it.svc + "." + it.opt, m = MAP[k], lg = lang();
    if (!m) return { na: false, none: L("Parts depend on what the mechanic finds.", "Las piezas dependen de lo que encuentre el mecánico."), parts: [] };
    if (m.ev && isEV(car)) return { na: true, none: NA_EV, parts: [] };
    if (m.diesel && car.fuel === "diesel") return { na: true, none: m.diesel, parts: [] };
    if (m.none) return { na: false, none: m.none, parts: [] };
    var parts = m.parts(car, it).map(function (p) {
      var d = typeof p.d === "function" ? p.d(car) : p.d;
      return { name: p.n, say: p.say, find: p.find, q: p.q, detail: d };
    });
    var note = typeof m.note === "function" ? m.note(car, it) : m.note || null;
    return { na: false, parts: parts, note: note };
  }

  /* what the counter will ask that we don't know yet (only qualifiers that matter for this part) */
  function unknowns(p, car, it) {
    var out = [];
    (p.q || []).forEach(function (q) {
      if (q === "engine" && !car.engine && !isEV(car)) out.push("engine");
      else if (q === "drive" && !car.drive) out.push("drive");
      else if (q === "trim" && !car.trim) out.push("trim");
      else if (q === "body" && !car.body) out.push("body");
      else if (q === "lights" && !car.lights) out.push("lights");
      else if (q === "abs" && !car.abs && (+car.year || 0) < 2012) out.push("abs");
    });
    return out;
  }
  var ASK = {
    engine: L("I'm not sure of the engine size, can you look it up?", "No sé el tamaño del motor, ¿lo pueden buscar?"),
    drive: L("I'm not sure if it's 2-wheel drive or AWD/4WD.", "No sé si es de tracción sencilla o AWD/4x4."),
    trim: L("I'm not sure of the trim level.", "No sé la versión exacta."),
    body: L("I'm not sure of the body style.", "No sé el tipo de carrocería."),
    lights: L("I'm not sure if it has halogen or LED headlights.", "No sé si tiene faros de halógeno o LED."),
    abs: L("I'm not sure if it has ABS.", "No sé si tiene frenos ABS.")
  };
  /* "Hi, I'm looking for a front brake pad set for a 2006 Honda Civic EX, 1.8L, FWD. The VIN ends in 12345678. Do you have it in stock, and what's the price?" */
  function script(p, car, lg, it) {
    lg = lg || lang(); car = car || {};
    var say = pk(p.say, lg); if (!say) return "";
    var withBody = (p.q || []).indexOf("body") >= 0;
    var vin = car.vin8 || (car.vin && car.vin.length >= 8 ? car.vin.slice(-8) : "");
    var asks = unknowns(p, car, it).map(function (k) { return pk(ASK[k], lg); }).filter(Boolean).join(" ");
    var d = desc(car, lg, withBody) || (lg === "es" ? "mi carro" : "my car");
    if (lg === "es") return "Hola, busco " + say + " para un " + d + "." + (vin ? " El VIN termina en " + vin + "." : "") + (asks ? " " + asks : "") + " ¿Lo tienen en existencia y cuánto cuesta?";
    return "Hi, I'm looking for " + say + " for a " + d + "." + (vin ? " The VIN ends in " + vin + "." : "") + (asks ? " " + asks : "") + " Do you have it in stock, and what's the price?";
  }
  /* one list for the whole job (shop page "Copy all parts") */
  function jobList(items, car, lg) {
    lg = lg || lang();
    var lines = [], d = desc(car || {}, lg, true);
    items.forEach(function (it) {
      var r = forItem(it, car); if (r.na || !r.parts.length) return;
      r.parts.forEach(function (p) { if (pk(p.say, lg)) lines.push("• " + pk(p.name, lg)); });
    });
    if (!lines.length) return "";
    var vin = car && (car.vin8 || (car.vin && car.vin.length >= 8 ? car.vin.slice(-8) : ""));
    return (lg === "es" ? "Piezas para un " : "Parts for a ") + d + (vin ? (lg === "es" ? " (VIN termina en " : " (VIN ends in ") + vin + ")" : "") + ":\n" + lines.join("\n") +
      (lg === "es" ? "\n¿Las tienen en existencia y cuánto cuestan?" : "\nDo you have these in stock, and what's the price?");
  }

  /* ---------- links ---------- */
  function storeLinks(car, find) {
    var mk = makeName(car), q = [car.year, mk, car.model, find].filter(Boolean).join(" ");
    function low(s) { return encodeURIComponent(String(s || "").toLowerCase()).replace(/%20/g, "+"); }
    return (C.partStores || []).map(function (s) {
      var needsCar = s.url.indexOf("{makeL}") >= 0;
      if (needsCar && !(car.year && car.make && car.model && car.make !== "__other")) return null;
      return { name: s.name, url: s.url.replace("{q}", encodeURIComponent(q).replace(/%20/g, "+")).replace("{year}", encodeURIComponent(car.year || "")).replace("{makeL}", low(car.make)).replace("{modelL}", low(car.model)) };
    }).filter(Boolean);
  }
  function supplier() { return (C.suppliers || []).filter(function (s) { return s.preferred; })[0] || (C.suppliers || [])[0] || null; }

  W.PARTS = { forItem: forItem, script: script, jobList: jobList, unknowns: unknowns, storeLinks: storeLinks, supplier: supplier, label: label, desc: desc, isEV: isEV, pk: pk, BODY: BODY };
})();
