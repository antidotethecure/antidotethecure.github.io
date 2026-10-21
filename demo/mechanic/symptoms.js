/* SousShift AI — Auto shop demo (any vehicle business): "Type what's wrong" finder. Exposes window.SYMPTOMS.
   Plain keyword rules (English + Spanish, common misspellings): what the customer types -> the repairs a mechanic
   would usually check or quote for it. A starting point, not a diagnosis: the real fix is confirmed after inspection.
   Repairs point at services in config.js (svc + opt). sel:true = pre-ticked in the results.
   Also picks the parts price tier (config.partsTiers): performance trims / luxury makes cost more for parts. */
(function () {
  "use strict";
  var W = window, C = W.SHOP_CFG;
  function L(en, es) { return { en: en, es: es }; }
  function R(svc, opt, sel) { return { svc: svc, opt: opt, sel: !!sel }; }

  var RULES = [
    { id: "elec", icon: "⚡", title: L("Electrical problem", "Falla eléctrica"),
      k: /electr|ele?ct?ical|eletric|wir(e|es|ing)|short(ed| out)?|fuses?\b|relay|flicker|dash(board)? (lights?|goes|went|cuts|turns)|everything (shuts|cuts|turns) off|(radio|screen|uconnect) (cuts|turns|goes|keeps)|corto|fusible|cableado/,
      why: L("Electrical issues start with a proper diagnosis (battery, charging, grounds, fuses), then the fix.", "Las fallas eléctricas empiezan con un buen diagnóstico (batería, carga, tierras, fusibles) y luego la reparación."),
      fix: [R("diag", "deep", 1), R("battery", "test", 1), R("elec", "fuse"), R("elec", "ground"), R("elec", "wiring"), R("elec", "alt"), R("elec", "starter"), R("elec", "drain")] },
    { id: "charge", icon: "🔋", title: L("Battery light / charging", "Luz de batería / carga"),
      k: /battery (light|warning)|charging|alternat|dies (while|when) driving|(lights?|headlights?) (dim|dimming)|voltage|alternador/,
      why: L("A battery light or dimming lights usually means the alternator isn't charging.", "La luz de batería o luces que bajan casi siempre es el alternador que no carga."),
      fix: [R("battery", "test", 1), R("elec", "alt", 1), R("engine", "belt")] },
    { id: "nostart", icon: "🔑", title: L("Won't start", "No arranca"),
      k: /won'?t (start|crank|turn over)|wont (start|crank)|doesn'?t (start|crank)|no (start|crank)|click(s|ing)? (when|but)|just clicks|starter|no arranca|no prende|marcha/,
      why: L("Clicking or no crank is most often the battery, then the starter.", "Si solo hace clic o no da marcha, casi siempre es la batería y luego la marcha."),
      fix: [R("battery", "test", 1), R("battery", "replace"), R("elec", "starter"), R("battery", "terminals")] },
    { id: "drain", icon: "🪫", title: L("Battery keeps dying", "La batería se descarga"),
      k: /dead battery|battery (keeps )?(dies|dying|dead|drain)|drain|need(s)? (a )?jump|jump ?start|bater[ií]a (muerta|descargada)|se descarga/,
      why: L("A battery that dies overnight needs a parasitic-drain test to find what's pulling power.", "Si se descarga de noche, hay que hacer prueba de consumo para encontrar qué jala corriente."),
      fix: [R("elec", "drain", 1), R("battery", "test", 1), R("battery", "replace")] },
    { id: "steer", icon: "🎯", title: L("Steering", "Dirección"),
      k: /\bste+r|\bstearing|wheel (shakes?|shaking|wobbl|vibrat)|loose (steering|wheel)|pulls? (to )?(the )?(left|right)|drifts?|wander|alignment|off.?cent(er|re)|tie ?rods?|direcci[oó]n|volante|terminal(es)? de direcci/,
      why: L("Loose, shaky or pulling steering is usually tie rods or alignment. Worn front-end parts get checked first.", "La dirección floja, que vibra o se jala casi siempre es terminales o alineación. Primero se revisa el tren delantero."),
      fix: [R("steer", "inspect", 1), R("steer", "tieOuter"), R("steer", "tieInner"), R("steer", "align")] },
    { id: "psteer", icon: "🌀", title: L("Hard steering / power steering", "Dirección dura / hidráulica"),
      k: /power steering|hard to (turn|steer)|heavy steering|steering (is |feels )?(hard|heavy|stiff|tight)|whin(e|es|ing) when (i )?turn|service (power )?steering|\beps\b|direcci[oó]n (esta |muy )*(dura|hidr|pesada)/,
      why: L("Heavy steering or a power-steering warning points at the pump (hydraulic) or the electric steering rack.", "Si la dirección está dura o sale el aviso, puede ser la bomba (hidráulica) o la cremallera eléctrica."),
      fix: [R("steer", "inspect", 1), R("steer", "pump"), R("steer", "rack")] },
    { id: "arm", icon: "🦾", title: L("Control arms / ball joints", "Horquillas / rótulas"),
      k: /contr?o?l ?arms?|contol|lower arm|upper arm|\ba-?arms?\b|bushings?|ball ?joints?|horquillas?|brazo de control|r[oó]tulas?|bujes?/,
      why: L("Worn control arms or bushings cause clunks, wandering and uneven tire wear. Get an alignment after.", "Las horquillas o bujes gastados dan golpes, la dirección se va y gastan las llantas. Después va alineación."),
      fix: [R("susp", "lowerArm", 1), R("susp", "upperArm"), R("susp", "ball"), R("susp", "bush"), R("steer", "align", 1)] },
    { id: "clunk", icon: "🧲", title: L("Clunks over bumps", "Golpes en los baches"),
      k: /clunk|knock(s|ing)? (over|on|when|going)|over (bumps|potholes|speed ?bumps)|rattl(e|es|ing) (over|on)|bouncy|bounc(es|ing)|nose ?dives?|golpe|truena|rechina en los/,
      why: L("Noise over bumps is usually sway bar links, ball joints or struts. An inspection pins it down.", "El ruido en baches casi siempre es tornillos estabilizadores, rótulas o amortiguadores. Con la revisión se confirma."),
      fix: [R("susp", "inspect", 1), R("susp", "links"), R("susp", "ball"), R("susp", "struts")] },
    { id: "brake", icon: "🛑", title: L("Brakes", "Frenos"),
      k: /brak|grind|squeal(s|ing)? when|pedal (is )?(soft|spongy|to the floor)|frenos?|balatas?/,
      why: L("Grinding or squealing when you brake means pads, and sometimes rotors.", "Si rechina o raspa al frenar son balatas, y a veces discos."),
      fix: [R("brakes", "pads", 1), R("brakes", "padrot"), R("brakes", "flush")] },
    { id: "cel", icon: "🩺", title: L("Check-engine light", "Luz de motor"),
      k: /check engine|engine light|\bcel\b|\bcodes?\b|luz (del|de) motor|c[oó]digo/,
      why: L("Start with a code scan. The code points to the fix (you can also scan it yourself below).", "Primero un escaneo. El código dice la reparación (también lo puedes escanear abajo)."),
      fix: [R("diag", "scan", 1)] },
    { id: "misfire", icon: "⚙️", title: L("Misfire / rough running", "Falla el motor / tironea"),
      k: /misfire|rough (idle|running)|shak(es|ing) (at|when) (idle|stopp)|stutter|hesitat|sputter|loss of power|no power|bog(s|ging)?|tironea|falla el motor|se jalonea/,
      why: L("A shaking engine is usually a coil or spark plugs. A scan shows which cylinder.", "Si el motor tiembla casi siempre es una bobina o bujías. El escaneo dice qué cilindro."),
      fix: [R("diag", "scan", 1), R("engine", "coil"), R("engine", "plugs")] },
    { id: "heat", icon: "🌡️", title: L("Overheating", "Se calienta"),
      k: /overheat|running hot|temp(erature)? (gauge|high|light|is high)|coolant|antifreeze|steam|smok(e|ing) (from|out)|se calienta|anticongelante/,
      why: L("Overheating is most often the thermostat or low coolant. Stop driving it hot.", "Si se calienta casi siempre es el termostato o falta anticongelante. No lo manejes caliente."),
      fix: [R("engine", "thermo", 1), R("engine", "coolant"), R("diag", "scan")] },
    { id: "ac", icon: "❄️", title: L("A/C not cold", "El A/C no enfría"),
      k: /\ba\/?c\b|air ?con|not (blowing )?cold|blow(s|ing) (hot|warm)|aire (acondicionado|no enf|caliente)|clima/,
      why: L("Warm A/C is usually low refrigerant from a small leak.", "Si el A/C echa aire caliente casi siempre le falta gas por una fuga pequeña."),
      fix: [R("ac", "recharge", 1), R("ac", "leak"), R("ac", "cabin")] },
    { id: "oil", icon: "🛢️", title: L("Oil", "Aceite"),
      k: /oil (change|light|leak|is low)|burning oil|aceite/,
      why: L("Oil change, and a look for leaks.", "Cambio de aceite y revisión de fugas."),
      fix: [R("oil", "syn", 1), R("diag", "scan")] },
    { id: "exhaust", icon: "💨", title: L("Exhaust / loud", "Escape / ruidoso"),
      k: /exhaust|muffler|loud(er)? (exhaust|engine|car)|rattl(e|ing) under|rotten egg|catalytic|cat converter|mofle|escape/,
      why: L("A loud exhaust or rattle underneath is a leak, a loose heat shield or the muffler.", "Un escape ruidoso o algo que suena abajo es una fuga, un protector suelto o el mofle."),
      fix: [R("exhaust", "inspect", 1), R("exhaust", "muffler"), R("exhaust", "o2"), R("exhaust", "cat")] },
    { id: "tire", icon: "🛞", title: L("Tires / vibration", "Llantas / vibración"),
      k: /tires?\b|flat|nail|bald|vibrat(es|ion|ing) (at|on) (high|the )?(speed|freeway|highway)|llantas?|ponchad/,
      why: L("Flats get repaired or replaced. A shake at freeway speed is often tires or alignment.", "Las ponchadas se reparan o cambian. La vibración en la autopista suele ser llantas o alineación."),
      fix: [R("tires", "flat", 1), R("tires", "one"), R("tires", "rotate"), R("steer", "align")] },
    { id: "lights", icon: "💡", title: L("Headlights", "Faros"),
      k: /head ?lights?|bulbs?|light (is )?out|faros?|focos?/,
      why: L("A bulb out is a quick fix. Factory LED lights may need the whole assembly.", "Un foco fundido se cambia rápido. Los faros LED de fábrica a veces requieren la unidad completa."),
      fix: [R("lights", "bulb", 1), R("lights", "restore")] },
    { id: "tail", icon: "🔴", title: L("Taillights / brake lights", "Calaveras / luz de freno"),
      k: /tail ?lights?|brake lights?|calaveras?|luz de freno/,
      why: L("Usually a bulb, sometimes the housing.", "Casi siempre es el foco, a veces la calavera."),
      fix: [R("tail", "bulb", 1), R("tail", "assy")] },
    { id: "door", icon: "🚪", title: L("Windows / door locks", "Ventanas / chapas"),
      k: /window (won'?t|doesn'?t|is stuck|stuck|fell|off track)|power windows?|door locks?|locks? (won'?t|doesn'?t|don'?t)|ventanas?|chapas?|seguros?/,
      why: L("A window that won't move is the regulator or motor. Check the fuse first.", "Si la ventana no se mueve es el elevador o el motor. Primero se revisa el fusible."),
      fix: [R("doors", "reg", 1), R("doors", "lock"), R("elec", "fuse")] },
    { id: "wiper", icon: "🌧️", title: L("Wipers", "Limpiadores"),
      k: /wipers?|washer|limpia|plumas/,
      why: L("Blades streak with age. No spray is the washer pump.", "Las plumas se gastan. Si no echa agua es la bomba."),
      fix: [R("wipers", "blades", 1), R("wipers", "pump")] },
    { id: "trans", icon: "🕹️", title: L("Transmission", "Transmisión"),
      k: /transmission|tranny|slip(s|ping)?|hard shift|shifts? (hard|late|rough)|won'?t (go into|shift)|clutch|gear(s)? (grind|slip)|transmisi[oó]n|se patina|clutch|embrague/,
      why: L("Slipping or hard shifts start with a transmission check: fluid level and condition, codes, then the fix.", "Si se patina o mete duro los cambios, primero se revisa la transmisión: nivel y estado del aceite, códigos y luego la reparación."),
      fix: [R("trans", "diag", 1), R("trans", "service"), R("trans", "clutch"), R("trans", "leak"), R("diag", "scan")] },
    { id: "heater", icon: "🔥", title: L("Heater / blower", "Calefacción / ventilador"),
      k: /heat(er|ing)? (not|doesn'?t|won'?t|isn'?t)|no heat|blows? cold (air )?(when|in)|blower|fan (not|doesn'?t|won'?t)|no air (coming|comes)|calefacci[oó]n|no calienta|ventilador/,
      why: L("No heat is often low coolant or a thermostat. No air at all is usually the blower motor or its resistor.", "Si no calienta casi siempre es anticongelante o termostato. Si no sale aire es el motor del ventilador."),
      fix: [R("ac", "heat", 1), R("ac", "blower"), R("engine", "thermo")] },
    { id: "tsize", icon: "🛞", title: L("New tires / tire pressure", "Llantas nuevas / presión"),
      k: /new tires?|tire size|\d{3}\s*\/?\s*\d{2}\s*z?r?\s*\d{2}|tpms|tire pressure|pressure light|low pressure|balanc|wobble at|llantas nuevas|presi[oó]n de (las )?llantas|balanceo/,
      why: L("Use the tire size checker below to see what's in stock. A pressure light is a slow leak or a TPMS sensor.", "Usa el buscador de medida abajo para ver qué hay. La luz de presión es una fuga lenta o un sensor TPMS."),
      fix: [R("tires", "four", 1), R("tires", "balance"), R("tires", "tpms"), R("tires", "align"), R("tires", "flat")] },
    { id: "align", icon: "📐", title: L("Alignment", "Alineación"),
      k: /alignment|alineaci[oó]n|crooked steering|uneven (tire )?wear|wears? (on )?the (inside|outside)/,
      why: L("Pulling or uneven tire wear calls for an alignment. Worn front-end parts are checked first.", "Si se jala o gasta las llantas disparejo necesita alineación. Primero se revisa el tren delantero."),
      fix: [R("tires", "align", 1), R("steer", "align", 1), R("steer", "inspect")] },
    { id: "glass", icon: "🪟", title: L("Glass / windshield", "Cristales / parabrisas"),
      k: /windshield (chip|crack|broke)|chip(ped)? (in|on) (the|my) windshield|crack(ed)? (windshield|glass|window)|broken (glass|window)|back glass|parabrisas|estrell[oó]n|vidrio (roto|quebrado)|cuarteado/,
      why: L("Small chips can often be repaired. Long cracks usually mean a new windshield (and a camera recalibration on newer cars).", "Los estrellones chicos se pueden reparar. Las cuarteaduras largas casi siempre piden parabrisas nuevo (y recalibrar la cámara en carros nuevos)."),
      fix: [R("glass", "chip", 1), R("glass", "wind"), R("glass", "adas"), R("glass", "side")] },
    { id: "body", icon: "🎨", title: L("Dents, scratches, collision", "Golpes, rayones, choque"),
      k: /dent|scratch|scuff|ding|hail|collision|accident|crash|fender ?bender|got hit|rear.?ended|rust|paint (is )?(peel|chip|fad)|golpe en|rayon|rayado|choque|chocaron|abolladura|pintura|oxido/,
      why: L("Small dents can often come out without paint. Scratches and collision damage get a written estimate (insurance OK).", "Los golpes chicos a veces salen sin pintar. Rayones y choques llevan presupuesto por escrito (aceptamos seguro)."),
      fix: [R("paint", "collision", 1), R("paint", "pdr"), R("paint", "scratch"), R("paint", "bumper"), R("paint", "panel"), R("body", "bumperF")] },
    { id: "clean", icon: "✨", title: L("Detailing", "Detallado"),
      k: /detail|clean(ing)? (inside|interior|my car|the car)|dirty|stain|smell|odor|pet hair|wax|polish|ceramic|swirl|shine|lavado|limpieza|detallado|olor|manchas|cer[aá]mico|pulido/,
      why: L("Pick a package: interior, exterior or the full detail. Coatings and paint correction are quoted after a look.", "Escoge un paquete: interior, exterior o completo. El cerámico y el pulido se cotizan después de verlo."),
      fix: [R("detail", "full", 1), R("detail", "int"), R("detail", "ext"), R("detail", "correct"), R("detail", "ceramic"), R("detail", "odor")] },
    { id: "smog", icon: "📋", title: L("Smog / inspection", "Smog / inspección"),
      k: /smog|emission|inspection|inspect (it|my car)|buying (a|this) (used )?car|pre.?purchase|registration|dmv|road trip|verificaci[oó]n|inspecci[oó]n|revisi[oó]n general/,
      why: L("Smog and safety checks depend on your state. Buying used? A pre-purchase inspection catches problems first.", "El smog y la inspección dependen de tu estado. ¿Vas a comprar usado? Una inspección antes de comprar encuentra problemas."),
      fix: [R("inspect", "smog", 1), R("inspect", "multi"), R("inspect", "prebuy"), R("inspect", "safety")] },
    { id: "quicklube", icon: "🛢️", title: L("Oil change + filters", "Cambio de aceite + filtros"),
      k: /oil change|due for (an )?oil|maintenance (light|due|required)|service (light|due)|filters?|fluids?|cambio de aceite|servicio|mantenimiento|filtro/,
      why: L("Pick your oil, then add the filters and fluids that are due.", "Escoge tu aceite y agrega los filtros y líquidos que te tocan."),
      fix: [R("oil", "syn", 1), R("oil", "conv"), R("oil", "blend"), R("oil", "airf"), R("ac", "cabin"), R("oil", "transfl")] },
    { id: "roadside", icon: "🚐", title: L("Stuck somewhere / come to me", "Me quedé tirado / vengan a mí"),
      k: /stranded|stuck (on|at|in)|roadside|come to (me|my)|at (my )?(home|work|house)|can'?t drive it|tow|me qued[eé]|vengan|a domicilio|en el camino/,
      why: L("A mobile visit comes to you for jump starts, spare tires and most repairs that don't need a lift.", "El servicio a domicilio va a ti para pasar corriente, poner la refacción y casi todo lo que no requiere elevador."),
      fix: [R("callout", "visit", 1), R("callout", "jump"), R("callout", "spare")] },
    { id: "belt", icon: "〰️", title: L("Squeal on start-up", "Rechina al arrancar"),
      k: /squeal(s|ing)? (on|at|when) (start|startup|cold)|belt|chirp|banda/,
      why: L("A squeal on start-up is usually the serpentine belt.", "El rechinido al arrancar casi siempre es la banda."),
      fix: [R("engine", "belt", 1)] }
  ];

  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’`]/g, "'"); }
  function okItem(r) { var s = (C.services || []).filter(function (x) { return x.id === r.svc && x.on !== false; })[0]; return !!(s && s.options.some(function (o) { return o.id === r.opt; })); }

  /* text -> groups in the order the customer mentioned them; each repair appears once */
  function match(text) {
    var t = norm(text), seen = {}, out = [];
    if (t.trim().length < 3) return out;
    RULES.forEach(function (r) {
      var m = t.match(r.k); if (!m) return;
      var fix = r.fix.filter(function (f) { var k = f.svc + "." + f.opt; if (seen[k]) { if (f.sel) seen[k].sel = true; return false; } if (!okItem(f)) return false; seen[k] = f = { svc: f.svc, opt: f.opt, sel: f.sel }; return true; })
        .map(function (f) { return seen[f.svc + "." + f.opt]; });
      if (fix.length) out.push({ id: r.id, at: m.index, icon: r.icon, title: r.title, why: r.why, fix: fix });
    });
    return out.sort(function (a, b) { return a.at - b.at; });
  }

  /* parts price tier for this car (+ anything typed, e.g. "my Charger Scat Pack") */
  function tier(car, text) {
    car = car || {};
    var hay = norm([car.trim, car.model, car.vinModel, text].filter(Boolean).join(" ")), make = String(car.make || "").toUpperCase();
    var list = C.partsTiers || [];
    for (var i = 0; i < list.length; i++) {
      var x = list[i];
      if (x.match && new RegExp(x.match, "i").test(hay)) return x;
      if (x.makes && x.makes.indexOf(make) >= 0) return x;
    }
    return null;
  }

  W.SYMPTOMS = { match: match, tier: tier, rules: RULES, norm: norm };
})();
