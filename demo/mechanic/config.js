/* SousShift AI — Auto shop demo (any vehicle repair / maintenance business). THE ONE CONFIG: rebrand the whole app
   (customer page + /shop/) by editing this object. Universal template: no real shop, no real person.
   Phone, email, prices and hours are PLACEHOLDERS, not a quote.
   Business type (mobile / repair / tire / lube / body / detail, see BIZ_TYPES below) picks which services show and the
   hero copy. Pick it with ?type=tire (remembered on this phone) or the switch on the page. ?shop=Joe%27s%20Tires sets the
   display name for a pitch. To rebrand for a real shop, fill in:
     brand.name / short / mechanic / tagline / city / area / phone / sms / email / logo / since  (+ type)
     colors.*            (accent = main brand color, accent2 = second color)
     hours               (per weekday, 24h "HH:MM"; null = closed) + slotMinutes + bookAheadDays
     laborRate / tripFee / freeTripMiles
     services[]          (turn off with on:false, rename, change options + parts/labor ranges)
     beforeAfter[]       (put the shop's real photo URLs in before/after; empty = placeholder art)
     suppliers[]         (parts stores the shop buys from; the first one is shown as "Check … first")
     tireStock[]         (sample tire inventory; the owner edits the live list on the shop page, saved on that device)
     pay                 (QR pay card: methods accepted + the demo link the QR opens)
     partStores[]        ("Find exact part" search links)
     demoPin             (shop page; DEMO ONLY)
   Also swap (they can't read JS): manifest.webmanifest name/short_name + the icon PNGs in this folder.
   Text in { en, es } pairs shows in English / Spanish with the language switch. */
window.SHOP_CFG = {
  demo: true,
  brand: {
    name: "",                          // "" = the business type's default ("Your Auto Shop", "Your Tire Shop"…); set a real name here
    short: "Your Shop",
    mechanic: "",                      // optional first name for the friendly tracker copy; "" = the shop name is used
    tagline: null,                     // null = the business type's tagline
    city: "Your city",                 // PRIVACY: area only. The exact address goes out after a booking is confirmed.
    area: null,                        // null = the business type's line ("We come to you…" / "Drop it off…")
    phone: "(555) 010-0000",          // 555-01xx = reserved fictional numbers (placeholder until he approves his real one)
    sms: "+15550100000",
    email: "hello@example.com",        // example.com = reserved, never a real inbox
    logo: "icon-192.png",              // swap for the shop's logo (square PNG)
    since: "20XX"
  },
  /* paint swatches (common factory-style colors) for the diagram + animated tracker; customers can also pick a custom color */
  carColors: [
    { hex: "#f4f5f7", en: "White", es: "Blanco" }, { hex: "#16181d", en: "Black", es: "Negro" }, { hex: "#b9bec7", en: "Silver", es: "Plata" },
    { hex: "#6b717c", en: "Gray", es: "Gris" }, { hex: "#c8242b", en: "Red", es: "Rojo" }, { hex: "#1f4fa8", en: "Blue", es: "Azul" },
    { hex: "#7a8fa6", en: "Light blue", es: "Azul claro" }, { hex: "#1f5a3a", en: "Green", es: "Verde" }, { hex: "#c9b48f", en: "Beige / tan", es: "Beige / arena" },
    { hex: "#6b4a33", en: "Brown", es: "Café" }, { hex: "#e8731c", en: "Orange", es: "Naranja" }, { hex: "#f2c230", en: "Yellow", es: "Amarillo" }
  ],
  /* My Garage maintenance reminders (simple rules of thumb; the owner's manual wins) */
  maintenance: { oilMiles: 5000, oilMonths: 6, rotateMiles: 6000, rotateMonths: 6, brakeMonths: 12, evRotateMiles: 6250 },
  colors: {
    bg: "#04060c", panel: "#0b1120", panel2: "#101a30", edge: "#1d2b4a",
    ink: "#eef3ff", dim: "#9eadcc",
    accent: "#ff7a1a",   // brand orange
    accent2: "#2de2ff",  // cyan glow
    gold: "#ffd166", good: "#34d399", warn: "#ffb86b"
  },
  /* Weekly hours. 0 = Sunday … 6 = Saturday. [open, close] in 24h, or null when closed. */
  hours: { 0: null, 1: ["08:00", "18:00"], 2: ["08:00", "18:00"], 3: ["08:00", "18:00"], 4: ["08:00", "18:00"], 5: ["08:00", "18:00"], 6: ["09:00", "15:00"] },
  slotMinutes: 120,       // arrival windows (8–10, 10–12 …)
  bookAheadDays: 7,
  laborRate: 95,          // $/hr SAMPLE
  tripFee: 0,             // $ added to every job (0 = free inside the area)
  freeTripMiles: 15,
  currency: "$",
  demoPin: "2468",        // DEMO ONLY: shown on the shop page

  /* Services. icon = emoji. Each option: parts [low, high] $ and hrs [low, high] labor hours.
     price = parts + hrs × laborRate. perWheel:true = per tire / door (FL FR RL RR), perAxle:true = per axle (front / rear).
     quote:true = NO price in the app ("Ask for a quote"): the shop prices it after a look. Every service added for the
     universal template (2026-10-17) is quote-only on purpose: mechanic pricing is set per shop, never invented here.
     hidden:true = not listed in the service sheet (used by the tire stock checker). */
  services: [
    { id: "diag", icon: "🩺", on: true, name: { en: "Diagnostics", es: "Diagnóstico" },
      desc: { en: "Check-engine light, scan + road test", es: "Luz de motor, escaneo y prueba" },
      options: [
        { id: "scan", name: { en: "Code scan + inspection", es: "Escaneo + inspección" }, parts: [0, 0], hrs: [0.75, 1] },
        { id: "deep", name: { en: "Deep diagnosis (electrical / no-start)", es: "Diagnóstico a fondo (eléctrico / no arranca)" }, parts: [0, 0], hrs: [1.5, 2.5] },
        { id: "evap", name: { en: "EVAP leak (smoke) test", es: "Prueba de fugas EVAP (humo)" }, parts: [0, 25], hrs: [0.75, 1.25] },
        { id: "general", name: { en: "General repair (tell us what's wrong)", es: "Reparación general (dinos qué tiene)" }, quote: true }
      ] },
    { id: "callout", icon: "🚐", on: true, name: { en: "Mobile service call-out", es: "Servicio a domicilio" },
      desc: { en: "We come to your home, work or roadside", es: "Vamos a tu casa, trabajo o en el camino" },
      options: [
        { id: "visit", name: { en: "Come to my home / work", es: "Vengan a mi casa / trabajo" }, quote: true },
        { id: "jump", name: { en: "Roadside jump start", es: "Paso de corriente en el camino" }, quote: true },
        { id: "spare", name: { en: "Flat tire: put on my spare", es: "Ponchada: poner la de refacción" }, quote: true },
        { id: "fleet", name: { en: "Fleet / multiple vehicles", es: "Flotilla / varios vehículos" }, quote: true }
      ] },
    { id: "inspect", icon: "📋", on: true, name: { en: "Inspections", es: "Inspecciones" },
      desc: { en: "Multi-point, pre-purchase, smog where required", es: "Multipunto, antes de comprar, smog donde aplique" },
      options: [
        { id: "multi", name: { en: "Multi-point inspection", es: "Inspección multipunto" }, quote: true },
        { id: "prebuy", name: { en: "Pre-purchase inspection", es: "Inspección antes de comprar" }, quote: true },
        { id: "smog", name: { en: "Smog / emissions check (where required)", es: "Smog / emisiones (donde aplique)" }, quote: true },
        { id: "safety", name: { en: "State safety inspection (where required)", es: "Inspección de seguridad estatal (donde aplique)" }, quote: true },
        { id: "trip", name: { en: "Road-trip check", es: "Revisión para viaje" }, quote: true }
      ] },
    { id: "oil", icon: "🛢️", on: true, name: { en: "Oil change", es: "Cambio de aceite" },
      desc: { en: "Oil, filter, fluid top-off", es: "Aceite, filtro y niveles" },
      options: [
        { id: "conv", name: { en: "Conventional", es: "Convencional" }, parts: [30, 45], hrs: [0.5, 0.5] },
        { id: "syn", name: { en: "Full synthetic", es: "Sintético" }, parts: [55, 85], hrs: [0.5, 0.75] },
        { id: "blend", name: { en: "Synthetic blend", es: "Semi-sintético" }, quote: true },
        { id: "hm", name: { en: "High-mileage oil", es: "Aceite para alto kilometraje" }, quote: true },
        { id: "diesel", name: { en: "Diesel oil change", es: "Cambio de aceite diésel" }, quote: true },
        { id: "airf", name: { en: "Engine air filter", es: "Filtro de aire del motor" }, quote: true },
        { id: "transfl", name: { en: "Transmission fluid service", es: "Cambio de aceite de transmisión" }, quote: true },
        { id: "diff", name: { en: "Differential / transfer case fluid", es: "Aceite de diferencial / caja de transferencia" }, quote: true },
        { id: "psfl", name: { en: "Power steering fluid", es: "Líquido de dirección" }, quote: true },
        { id: "fuel", name: { en: "Fuel system cleaning", es: "Limpieza del sistema de combustible" }, quote: true }
      ] },
    { id: "brakes", icon: "🛑", on: true, name: { en: "Brakes", es: "Frenos" },
      desc: { en: "Pads, rotors, fluid", es: "Balatas, discos, líquido" },
      options: [
        { id: "pads", name: { en: "Brake pads", es: "Balatas" }, parts: [50, 120], hrs: [1, 1.5], perAxle: true },
        { id: "padrot", name: { en: "Pads + rotors", es: "Balatas + discos" }, parts: [150, 300], hrs: [1.5, 2], perAxle: true },
        { id: "flush", name: { en: "Brake fluid flush", es: "Cambio de líquido de frenos" }, parts: [15, 25], hrs: [0.75, 1] }
      ] },
    { id: "tires", icon: "🛞", on: true, name: { en: "Tires", es: "Llantas" },
      desc: { en: "Rotate, repair, replace", es: "Rotar, reparar, cambiar" },
      options: [
        { id: "rotate", name: { en: "Rotate all 4", es: "Rotar las 4" }, parts: [0, 0], hrs: [0.5, 0.75] },
        { id: "flat", name: { en: "Flat repair (this tire)", es: "Reparar ponchada (esta llanta)" }, parts: [10, 20], hrs: [0.5, 0.5], perWheel: true },
        { id: "one", name: { en: "Replace this tire", es: "Cambiar esta llanta" }, parts: [90, 220], hrs: [0.5, 0.75], perWheel: true },
        { id: "four", name: { en: "Replace all 4", es: "Cambiar las 4" }, parts: [360, 880], hrs: [1.5, 2] },
        { id: "balance", name: { en: "Wheel balance (all 4)", es: "Balanceo (las 4)" }, quote: true },
        { id: "mount", name: { en: "Mount + balance my tires", es: "Montar y balancear mis llantas" }, quote: true },
        { id: "tpms", name: { en: "TPMS sensor / tire-pressure light", es: "Sensor TPMS / luz de presión" }, quote: true },
        { id: "align", name: { en: "Wheel alignment", es: "Alineación" }, quote: true },
        { id: "season", name: { en: "Seasonal tire swap", es: "Cambio de llantas por temporada" }, quote: true },
        { id: "hold", name: { en: "Tires from stock", es: "Llantas en existencia" }, quote: true, hidden: true }
      ] },
    { id: "lights", icon: "💡", on: true, name: { en: "Headlights & bulbs", es: "Faros y focos" },
      desc: { en: "Bulbs, LED upgrade, lens restore", es: "Focos, LED, pulir faros" },
      options: [
        { id: "bulb", name: { en: "Bulb replacement", es: "Cambio de foco" }, parts: [10, 30], hrs: [0.25, 0.5] },
        { id: "led", name: { en: "LED upgrade (pair)", es: "Cambio a LED (par)" }, parts: [60, 160], hrs: [0.5, 1] },
        { id: "restore", name: { en: "Headlight restoration (pair)", es: "Pulido de faros (par)" }, parts: [15, 30], hrs: [1, 1.5] }
      ] },
    { id: "tail", icon: "🔴", on: true, name: { en: "Taillights", es: "Calaveras" },
      desc: { en: "Bulbs + housings", es: "Focos y calaveras" },
      options: [
        { id: "bulb", name: { en: "Bulb replacement", es: "Cambio de foco" }, parts: [8, 25], hrs: [0.25, 0.5] },
        { id: "assy", name: { en: "Replace taillight housing", es: "Cambiar calavera" }, parts: [60, 250], hrs: [0.5, 1] }
      ] },
    { id: "battery", icon: "🔋", on: true, name: { en: "Battery", es: "Batería" },
      desc: { en: "Test, jump, replace", es: "Prueba, paso de corriente, cambio" },
      options: [
        { id: "test", name: { en: "Battery + charging test", es: "Prueba de batería y carga" }, parts: [0, 0], hrs: [0.25, 0.5] },
        { id: "replace", name: { en: "Replace battery", es: "Cambiar batería" }, parts: [150, 260], hrs: [0.5, 0.75] },
        { id: "terminals", name: { en: "Clean terminals", es: "Limpiar terminales" }, parts: [5, 15], hrs: [0.25, 0.25] }
      ] },
    { id: "engine", icon: "⚙️", on: true, name: { en: "Engine & tune-up", es: "Motor y afinación" },
      desc: { en: "Plugs, belts, coolant", es: "Bujías, bandas, anticongelante" },
      options: [
        { id: "plugs", name: { en: "Spark plugs (tune-up)", es: "Bujías (afinación)" }, parts: [40, 120], hrs: [1, 2] },
        { id: "belt", name: { en: "Serpentine belt", es: "Banda de accesorios" }, parts: [30, 80], hrs: [0.75, 1.5] },
        { id: "coolant", name: { en: "Coolant flush", es: "Cambio de anticongelante" }, parts: [25, 50], hrs: [1, 1.25] },
        { id: "coil", name: { en: "Ignition coil (one cylinder)", es: "Bobina de encendido (un cilindro)" }, parts: [35, 120], hrs: [0.25, 0.75] },
        { id: "thermo", name: { en: "Thermostat", es: "Termostato" }, parts: [20, 80], hrs: [1, 2] }
      ] },
    { id: "trans", icon: "🕹️", on: true, name: { en: "Transmission", es: "Transmisión" },
      desc: { en: "Slipping, hard shifts, clutch, leaks", es: "Se patina, cambios duros, clutch, fugas" },
      options: [
        { id: "diag", name: { en: "Transmission diagnosis", es: "Diagnóstico de transmisión" }, quote: true },
        { id: "service", name: { en: "Fluid + filter service", es: "Cambio de aceite y filtro" }, quote: true },
        { id: "clutch", name: { en: "Clutch replacement", es: "Cambio de clutch" }, quote: true },
        { id: "leak", name: { en: "Leak / seal repair", es: "Reparar fuga / retén" }, quote: true },
        { id: "rebuild", name: { en: "Rebuild or replace", es: "Reconstruir o cambiar" }, quote: true }
      ] },
    { id: "susp", icon: "🧲", on: true, name: { en: "Suspension", es: "Suspensión" },
      desc: { en: "Shocks, struts, control arms, links", es: "Amortiguadores, horquillas, rótulas, tornillos" },
      options: [
        { id: "inspect", name: { en: "Inspect clunks / noises", es: "Revisar ruidos" }, parts: [0, 0], hrs: [0.5, 0.75] },
        { id: "struts", name: { en: "Shocks / struts (pair)", es: "Amortiguadores (par)" }, parts: [200, 500], hrs: [2, 3.5], perAxle: true },
        { id: "links", name: { en: "Sway bar links (pair)", es: "Tornillos estabilizadores (par)" }, parts: [40, 120], hrs: [1, 1.5] },
        { id: "lowerArm", name: { en: "Lower control arm (this corner)", es: "Horquilla inferior (esta esquina)" }, parts: [70, 260], hrs: [1, 2], perWheel: true },
        { id: "upperArm", name: { en: "Upper control arm (this corner)", es: "Horquilla superior (esta esquina)" }, parts: [60, 220], hrs: [1, 1.75], perWheel: true },
        { id: "ball", name: { en: "Ball joint (this corner)", es: "Rótula (esta esquina)" }, parts: [35, 140], hrs: [1, 2], perWheel: true },
        { id: "bush", name: { en: "Control arm bushings (pair)", es: "Bujes de horquilla (par)" }, parts: [40, 140], hrs: [2, 3] }
      ] },
    { id: "steer", icon: "🎯", on: true, name: { en: "Steering", es: "Dirección" },
      desc: { en: "Tie rods, rack, pump, alignment", es: "Terminales, cremallera, bomba, alineación" },
      options: [
        { id: "inspect", name: { en: "Steering + front-end inspection", es: "Revisión de dirección y tren delantero" }, parts: [0, 0], hrs: [0.5, 0.75] },
        { id: "tieOuter", name: { en: "Outer tie rod ends (pair)", es: "Terminales exteriores (par)" }, parts: [60, 160], hrs: [1, 1.5] },
        { id: "tieInner", name: { en: "Inner + outer tie rods (pair)", es: "Terminales interiores y exteriores (par)" }, parts: [120, 300], hrs: [1.5, 2.5] },
        { id: "pump", name: { en: "Power steering pump", es: "Bomba de dirección hidráulica" }, parts: [150, 450], hrs: [1.5, 3] },
        { id: "rack", name: { en: "Steering rack (incl. electric racks)", es: "Cremallera de dirección (incluye eléctricas)" }, parts: [450, 1300], hrs: [3, 5.5] },
        { id: "align", name: { en: "Wheel alignment (partner shop)", es: "Alineación (taller asociado)" }, parts: [100, 160], hrs: [0, 0] }
      ] },
    { id: "elec", icon: "⚡", on: true, name: { en: "Electrical", es: "Sistema eléctrico" },
      desc: { en: "Alternator, starter, shorts, drains", es: "Alternador, marcha, cortos, consumo" },
      options: [
        { id: "alt", name: { en: "Alternator", es: "Alternador" }, parts: [180, 480], hrs: [1, 2.5] },
        { id: "starter", name: { en: "Starter", es: "Marcha" }, parts: [150, 420], hrs: [1, 2.5] },
        { id: "drain", name: { en: "Battery drain (parasitic draw) test", es: "Prueba de consumo de batería" }, parts: [0, 0], hrs: [1, 2] },
        { id: "wiring", name: { en: "Wiring / short repair", es: "Reparación de cableado / corto" }, parts: [10, 60], hrs: [1, 3] },
        { id: "fuse", name: { en: "Fuse / relay", es: "Fusible / relevador" }, parts: [5, 40], hrs: [0.25, 0.75] },
        { id: "ground", name: { en: "Ground strap / battery cable", es: "Tierra / cable de batería" }, parts: [15, 60], hrs: [0.5, 1] }
      ] },
    { id: "ac", icon: "❄️", on: true, name: { en: "A/C & heating", es: "A/C y calefacción" },
      desc: { en: "Recharge, leaks, heater, blower", es: "Recarga, fugas, calefacción, ventilador" },
      options: [
        { id: "recharge", name: { en: "A/C recharge", es: "Recarga de A/C" }, parts: [40, 90], hrs: [0.75, 1] },
        { id: "leak", name: { en: "Leak check (UV dye)", es: "Revisión de fugas (tinte UV)" }, parts: [20, 40], hrs: [1, 1.5] },
        { id: "cabin", name: { en: "Cabin air filter", es: "Filtro de cabina" }, parts: [15, 35], hrs: [0.25, 0.25] },
        { id: "heat", name: { en: "Heater not getting warm", es: "La calefacción no calienta" }, quote: true },
        { id: "blower", name: { en: "Blower fan not working", es: "No sale aire (ventilador)" }, quote: true },
        { id: "comp", name: { en: "A/C compressor", es: "Compresor de A/C" }, quote: true }
      ] },
    { id: "sound", icon: "🔊", on: true, name: { en: "Sound system install", es: "Instalación de audio" },
      desc: { en: "Head units, speakers, subs", es: "Estéreos, bocinas, subwoofers" },
      options: [
        { id: "head", name: { en: "Head unit (CarPlay / Android Auto)", es: "Estéreo (CarPlay / Android Auto)" }, parts: [120, 400], hrs: [1, 2] },
        { id: "spk", name: { en: "Speakers (pair)", es: "Bocinas (par)" }, parts: [60, 250], hrs: [1, 1.5] },
        { id: "sub", name: { en: "Sub + amp", es: "Subwoofer + amplificador" }, parts: [250, 700], hrs: [2.5, 4] }
      ] },
    { id: "tint", icon: "🕶️", on: true, name: { en: "Window tint", es: "Polarizado" },
      desc: { en: "Legal-shade film", es: "Película en tono legal" },
      options: [
        { id: "front2", name: { en: "Front 2 windows", es: "2 ventanas delanteras" }, parts: [25, 45], hrs: [0.75, 1] },
        { id: "full", name: { en: "Full car (sides + back)", es: "Carro completo (lados + atrás)" }, parts: [60, 140], hrs: [2, 3] },
        { id: "strip", name: { en: "Windshield sun strip", es: "Franja del parabrisas" }, parts: [10, 20], hrs: [0.25, 0.5] }
      ] },
    { id: "wipers", icon: "🌧️", on: true, name: { en: "Windshield & wipers", es: "Parabrisas y limpiadores" },
      desc: { en: "Blades, washer pump", es: "Plumas, bomba de agua" },
      options: [
        { id: "blades", name: { en: "Wiper blades (pair)", es: "Plumas (par)" }, parts: [20, 45], hrs: [0.25, 0.25] },
        { id: "pump", name: { en: "Washer pump", es: "Bomba del limpiador" }, parts: [25, 70], hrs: [0.75, 1.25] }
      ] },
    { id: "glass", icon: "🪟", on: true, name: { en: "Auto glass", es: "Cristales" },
      desc: { en: "Chips, cracks, windshield, side + back glass", es: "Estrellones, cuarteaduras, parabrisas, laterales" },
      options: [
        { id: "chip", name: { en: "Windshield chip repair", es: "Reparar estrellón del parabrisas" }, quote: true },
        { id: "wind", name: { en: "Windshield replacement", es: "Cambio de parabrisas" }, quote: true },
        { id: "side", name: { en: "Side window glass", es: "Vidrio lateral" }, quote: true },
        { id: "back", name: { en: "Back glass", es: "Medallón (vidrio trasero)" }, quote: true },
        { id: "adas", name: { en: "Camera recalibration (ADAS)", es: "Recalibrar cámara (ADAS)" }, quote: true }
      ] },
    { id: "doors", icon: "🚪", on: true, name: { en: "Doors & windows", es: "Puertas y ventanas" },
      desc: { en: "Regulators, locks, handles", es: "Elevadores, chapas, manijas" },
      options: [
        { id: "reg", name: { en: "Window regulator / motor", es: "Elevador / motor de ventana" }, parts: [60, 180], hrs: [1.5, 2], perWheel: true },
        { id: "lock", name: { en: "Door lock actuator", es: "Actuador de chapa" }, parts: [40, 140], hrs: [1, 1.5], perWheel: true }
      ] },
    { id: "exhaust", icon: "💨", on: true, name: { en: "Exhaust", es: "Escape" },
      desc: { en: "Leaks, muffler, O2 sensor", es: "Fugas, mofle, sensor O2" },
      options: [
        { id: "inspect", name: { en: "Inspect leak / noise", es: "Revisar fuga / ruido" }, parts: [0, 0], hrs: [0.5, 0.75] },
        { id: "muffler", name: { en: "Muffler / pipe repair", es: "Reparar mofle / tubo" }, parts: [80, 250], hrs: [1, 2] },
        { id: "o2", name: { en: "O2 sensor", es: "Sensor de oxígeno" }, parts: [40, 150], hrs: [0.5, 1] },
        { id: "cat", name: { en: "Catalytic converter", es: "Convertidor catalítico" }, parts: [250, 1200], hrs: [1, 2.5] },
        { id: "manifold", name: { en: "Exhaust manifold / gasket", es: "Múltiple de escape / empaque" }, quote: true },
        { id: "custom", name: { en: "Custom exhaust / performance muffler", es: "Escape a la medida / mofle deportivo" }, quote: true }
      ] },
    /* Body panels. Parts arrive primed/unpainted: paint matching is quoted separately after the shop sees the car. */
    { id: "body", icon: "🚘", on: true, name: { en: "Body parts", es: "Carrocería" },
      desc: { en: "Fenders, bumpers, mirrors, hood", es: "Salpicaderas, defensas, espejos, cofre" },
      options: [
        { id: "fenderL", name: { en: "Front fender (driver side)", es: "Salpicadera delantera (lado del conductor)" }, parts: [80, 300], hrs: [1.5, 3] },
        { id: "fenderR", name: { en: "Front fender (passenger side)", es: "Salpicadera delantera (lado del pasajero)" }, parts: [80, 300], hrs: [1.5, 3] },
        { id: "bumperF", name: { en: "Front bumper cover", es: "Fascia de defensa delantera" }, parts: [120, 450], hrs: [1.5, 2.5] },
        { id: "bumperR", name: { en: "Rear bumper cover", es: "Fascia de defensa trasera" }, parts: [120, 450], hrs: [1.5, 2.5] },
        { id: "mirrorL", name: { en: "Side mirror (driver side)", es: "Espejo lateral (lado del conductor)" }, parts: [40, 250], hrs: [0.5, 1] },
        { id: "mirrorR", name: { en: "Side mirror (passenger side)", es: "Espejo lateral (lado del pasajero)" }, parts: [40, 250], hrs: [0.5, 1] },
        { id: "hood", name: { en: "Hood", es: "Cofre" }, parts: [150, 500], hrs: [1, 1.5] },
        { id: "grille", name: { en: "Grille", es: "Parrilla" }, parts: [50, 250], hrs: [0.5, 1] },
        { id: "handle", name: { en: "Outside door handle", es: "Manija exterior de puerta" }, parts: [20, 90], hrs: [0.75, 1.5], perWheel: true }
      ] },
    { id: "paint", icon: "🎨", on: true, name: { en: "Body & paint", es: "Hojalatería y pintura" },
      desc: { en: "Dents, scratches, collision, refinish", es: "Golpes, rayones, choques, pintura" },
      options: [
        { id: "pdr", name: { en: "Paintless dent repair", es: "Sacar golpe sin pintar" }, quote: true },
        { id: "scratch", name: { en: "Scratch / scuff repair", es: "Reparar rayones" }, quote: true },
        { id: "bumper", name: { en: "Bumper repair + refinish", es: "Reparar y pintar defensa" }, quote: true },
        { id: "panel", name: { en: "Paint a panel (color matched)", es: "Pintar una pieza (color igualado)" }, quote: true },
        { id: "collision", name: { en: "Collision estimate (insurance OK)", es: "Presupuesto de choque (aceptamos seguro)" }, quote: true },
        { id: "rust", name: { en: "Rust repair", es: "Reparar óxido" }, quote: true }
      ] },
    { id: "detail", icon: "✨", on: true, addon: true, name: { en: "Detailing add-on", es: "Detallado (extra)" },
      desc: { en: "While it's here", es: "Ya que está aquí" },
      options: [
        { id: "int", name: { en: "Interior detail", es: "Detallado interior" }, parts: [20, 40], hrs: [1.5, 2] },
        { id: "ext", name: { en: "Wash + wax", es: "Lavado + cera" }, parts: [20, 40], hrs: [1.5, 2] },
        { id: "full", name: { en: "Full detail", es: "Detallado completo" }, parts: [40, 80], hrs: [3, 4] },
        { id: "correct", name: { en: "Paint correction / polish", es: "Corrección de pintura / pulido" }, quote: true },
        { id: "ceramic", name: { en: "Ceramic coating", es: "Recubrimiento cerámico" }, quote: true },
        { id: "engbay", name: { en: "Engine bay cleaning", es: "Lavado de motor" }, quote: true },
        { id: "odor", name: { en: "Odor / pet hair removal", es: "Quitar olores / pelo de mascota" }, quote: true },
        { id: "fleetd", name: { en: "Fleet / dealer detail", es: "Detallado de flotilla / agencia" }, quote: true }
      ] }
  ],

  /* Parts price tiers (SAMPLE): performance trims and luxury makes usually cost more for parts (bigger brakes, heavier
     suspension, pricier electrics). Multiplies the parts part of each estimate only, never labor. First match wins.
     match = regex on trim / model / what the customer typed; makes = vPIC make names (upper case). */
  partsTiers: [
    { id: "perf", mult: 1.35, name: { en: "Performance trim", es: "Versión deportiva" },
      match: "scat ?pack|\\bsrt\\b|hellcat|demon|redeye|jailbreak|trackhawk|shelby|gt500|mach 1|raptor|\\btrx\\b|\\bzl1\\b|\\bz06\\b|\\bss\\b|1le|amg|\\bm[2-8]\\b|\\brs ?[3-7]\\b|type ?r|\\bsti\\b|nismo|trd pro|392|6\\.4" },
    { id: "lux", mult: 1.4, name: { en: "Luxury make", es: "Marca de lujo" },
      makes: ["BMW", "MERCEDES-BENZ", "AUDI", "PORSCHE", "LAND ROVER", "JAGUAR", "LEXUS", "VOLVO", "GENESIS", "MASERATI", "ALFA ROMEO", "CADILLAC", "LINCOLN", "ACURA", "INFINITI", "TESLA"] }
  ],

  /* Parts suppliers. The first one shows as "Check <short> first" on every parts list and in the shop page's Parts sources card.
     Universal template: a placeholder. For a real shop, copy the store's business info from its own public website
     (name, address, phone, tel, website, mapsUrl, hours). NO partnership, discount or inventory claim.
     sms: only fill in a number the business says takes texts. */
  suppliers: [
    { id: "store", preferred: true, name: "Your parts store", short: "the parts store", area: "",
      address: "", phone: "", tel: "", sms: "", website: "", mapsUrl: "",
      note: { en: "Placeholder: the shop's go-to parts supplier goes here. Call for price & availability.",
              es: "De muestra: aquí va el proveedor de piezas del taller. Llama para precio y existencia." } }
  ],
  /* "Find exact part" buttons: plain prefilled searches on public sites (no scraping, no prices pulled).
     {year} {make} {model} {q} are filled in; {makeL}/{modelL} = lowercase with "+" for spaces (RockAuto catalog path). */
  partStores: [
    { name: "RockAuto", url: "https://www.rockauto.com/en/catalog/{makeL},{year},{modelL}" },
    { name: "AutoZone", url: "https://www.autozone.com/searchresult?searchText={q}" },
    { name: "O'Reilly", url: "https://www.oreillyauto.com/search?q={q}" }
  ],

  /* Before / after slider. before/after = photo URL; leave "" to show placeholder art (no stock photos, no people). */
  beforeAfter: [
    { art: "headlight", svc: "lights", title: { en: "Headlight restoration", es: "Pulido de faros" }, before: "", after: "" },
    { art: "brakes", svc: "brakes", title: { en: "Pads + rotors", es: "Balatas + discos" }, before: "", after: "" },
    { art: "tint", svc: "tint", title: { en: "Window tint", es: "Polarizado" }, before: "", after: "" },
    { art: "detail", svc: "detail", title: { en: "Interior detail", es: "Detallado interior" }, before: "", after: "" }
  ],

  /* Tire stock checker (customer page) + tire inventory editor (shop page). SAMPLE inventory: made-up "sample brand"
     names, no real stock. price: null = "Ask for a quote"; the owner can type a price on the shop page (saved on that device). */
  tireStock: [
    { id: "t1", brand: "Sample brand A", line: "Touring A/S", size: "225/45R17", type: "allseason", qty: 8, price: null },
    { id: "t2", brand: "Sample brand B", line: "Sport", size: "225/45R17", type: "perf", qty: 4, price: null },
    { id: "t3", brand: "Sample brand A", line: "Touring A/S", size: "205/55R16", type: "allseason", qty: 12, price: null },
    { id: "t4", brand: "Sample brand C", line: "Highway", size: "235/65R17", type: "allseason", qty: 6, price: null },
    { id: "t5", brand: "Sample brand B", line: "Sport", size: "245/40R18", type: "perf", qty: 4, price: null },
    { id: "t6", brand: "Sample brand C", line: "All-Terrain", size: "265/70R17", type: "truck", qty: 8, price: null },
    { id: "t7", brand: "Sample brand C", line: "All-Terrain", size: "275/55R20", type: "truck", qty: 4, price: null },
    { id: "t8", brand: "Sample brand D", line: "Winter", size: "215/60R16", type: "winter", qty: 4, price: null },
    { id: "t9", brand: "Sample brand A", line: "Touring A/S", size: "215/55R17", type: "allseason", qty: 0, price: null }
  ],
  tireOrderDays: "2–3",   // PLACEHOLDER "usually by" for sizes not in stock (the shop sets its real supplier timing)

  /* QR pay (customer page "Pay with QR" + printable counter / bay card). DEMO: no payment is processed, no real accounts.
     url = what the sample QR opens (example.com is reserved, never a real site). handle = clearly fake placeholder. */
  pay: {
    url: "https://pay.example.com/yourshop?demo=1",
    handle: "yourshop",
    methods: [
      { id: "apple", icon: "A", en: "Apple Pay", es: "Apple Pay" },
      { id: "google", icon: "G", en: "Google Pay", es: "Google Pay" },
      { id: "card", icon: "💳", en: "Card (tap or chip)", es: "Tarjeta (tap o chip)" },
      { id: "cashapp", icon: "$", en: "Cash App", es: "Cash App" },
      { id: "zelle", icon: "Z", en: "Zelle", es: "Zelle" },
      { id: "venmo", icon: "V", en: "Venmo", es: "Venmo" },
      { id: "paypal", icon: "P", en: "PayPal", es: "PayPal" },
      { id: "fin", icon: "📆", en: "Pay over time (Affirm / Klarna)", es: "Paga a plazos (Affirm / Klarna)" }
    ]
  }
};

/* ---------- business types: one demo, pitched to any vehicle business ----------
   services = which service ids show (in this order). t = copy overrides (keys from the page's window.T). */
window.BIZ_TYPES = {
  repair: { icon: "🔧", label: { en: "Auto repair shop", es: "Taller mecánico" }, name: "Your Auto Shop",
    tagline: { en: "Auto Repair", es: "Taller mecánico" }, area: { en: "Drop it off, we'll text you updates", es: "Déjalo y te mandamos avisos" },
    services: ["diag", "inspect", "brakes", "oil", "tires", "engine", "trans", "elec", "battery", "ac", "susp", "steer", "exhaust", "lights", "tail", "wipers", "doors", "glass", "detail"],
    t: { en: { heroH: "Fixed right. <em>Priced up front.</em>", heroP: "Pick your car, say what's wrong or tap it on the car, see a price range or ask for a quote, book a drop-off and track the repair from your phone.", arrive: "Drop-off" },
         es: { heroH: "Bien reparado. <em>Precio por adelantado.</em>", heroP: "Escoge tu carro, dinos qué tiene o tócalo en el carro, ve un rango de precio o pide cotización, agenda y sigue la reparación desde tu teléfono.", arrive: "Entrega" } } },
  mobile: { icon: "🚐", label: { en: "Mobile mechanic", es: "Mecánico a domicilio" }, name: "Your Mobile Mechanic", mobile: true,
    tagline: { en: "Mobile Mechanic", es: "Mecánico a domicilio" }, area: { en: "We come to you: home, work or roadside", es: "Vamos a ti: casa, trabajo o camino" },
    services: ["callout", "diag", "oil", "brakes", "battery", "elec", "engine", "tires", "susp", "steer", "ac", "lights", "tail", "wipers", "doors", "exhaust", "inspect", "body", "sound", "tint", "detail"],
    t: { en: { heroH: "We come to you. <em>Home, work or roadside.</em>", heroP: "Pick your car, say what's wrong or tap it, get a price range or a quote in seconds, pick a time and watch the job move along from your phone." },
         es: { heroH: "Vamos a ti. <em>Casa, trabajo o en el camino.</em>", heroP: "Escoge tu carro, dinos qué tiene o tócalo, ve un precio o cotización en segundos, escoge la hora y sigue el trabajo desde tu teléfono." } } },
  tire: { icon: "🛞", label: { en: "Tire shop", es: "Llantera" }, name: "Your Tire Shop",
    tagline: { en: "Tires · Wheels · Alignment", es: "Llantas · Rines · Alineación" }, area: { en: "Check your size, we'll have them ready", es: "Revisa tu medida y te las tenemos listas" },
    services: ["tires", "steer", "brakes", "susp", "oil", "battery", "inspect", "diag"], tiresFirst: true,
    t: { en: { heroH: "The right tires. <em>In stock, on today.</em>", heroP: "Type your tire size to see what's in stock, hold a set, add rotation, balance or alignment, and book a time from your phone.", arrive: "Drop-off" },
         es: { heroH: "La llanta correcta. <em>En existencia, puesta hoy.</em>", heroP: "Escribe tu medida para ver qué hay en existencia, aparta un juego, agrega rotación, balanceo o alineación y agenda desde tu teléfono.", arrive: "Entrega" } } },
  lube: { icon: "🛢️", label: { en: "Quick lube / oil change", es: "Cambio de aceite rápido" }, name: "Your Quick Lube",
    tagline: { en: "Oil Change · Fluids · Filters", es: "Aceite · Líquidos · Filtros" }, area: { en: "Pull in, we'll handle the rest", es: "Llega y nosotros nos encargamos" },
    services: ["oil", "inspect", "battery", "wipers", "lights", "tail", "ac", "tires", "engine", "detail"],
    t: { en: { heroH: "In and out. <em>Back on the road fast.</em>", heroP: "Pick your car, choose your oil and fluids, see what's due next and book a time, or just pull in. Track it on your phone.", arrive: "Drop-off" },
         es: { heroH: "Entras y sales. <em>De vuelta al camino rápido.</em>", heroP: "Escoge tu carro, tu aceite y líquidos, ve qué te toca y agenda, o solo llega. Síguelo desde tu teléfono.", arrive: "Entrega" } } },
  body: { icon: "🎨", label: { en: "Body shop", es: "Hojalatería y pintura" }, name: "Your Body Shop",
    tagline: { en: "Collision · Paint · Glass", es: "Choques · Pintura · Cristales" }, area: { en: "Send photos, get an estimate", es: "Manda fotos y recibe un presupuesto" },
    services: ["paint", "body", "glass", "lights", "tail", "doors", "tint", "detail", "inspect"],
    t: { en: { heroH: "Dents, scratches, collisions. <em>Looking new again.</em>", heroP: "Pick your car, tap the damage, add photos and your paint code, ask for an estimate and track the repair from your phone.", arrive: "Drop-off" },
         es: { heroH: "Golpes, rayones, choques. <em>Como nuevo otra vez.</em>", heroP: "Escoge tu carro, toca el daño, agrega fotos y tu código de pintura, pide presupuesto y sigue la reparación desde tu teléfono.", arrive: "Entrega" } } },
  detail: { icon: "✨", label: { en: "Detailing", es: "Detallado" }, name: "Your Detail Shop",
    tagline: { en: "Detailing · Coatings · Tint", es: "Detallado · Cerámico · Polarizado" }, area: { en: "At our shop or at your place", es: "En nuestro local o en tu casa" },
    services: ["detail", "tint", "lights", "glass", "paint", "wipers"],
    t: { en: { heroH: "Showroom clean. <em>Inside and out.</em>", heroP: "Pick your car and package, see a price range or ask for a quote, book a time and get a text when it's ready." },
         es: { heroH: "Limpio de agencia. <em>Por dentro y por fuera.</em>", heroP: "Escoge tu carro y paquete, ve un rango de precio o pide cotización, agenda y recibe un texto cuando esté listo." } } }
};
(function applyBizType() {
  /* State lives in the URL only (nothing remembered), so a bare /demo/mechanic/ is always the universal default.
     ?type=tire|mobile|repair|lube|body|detail   ?shop=Alex%27s%20Tire%20Shop (display name, plain text, max 40 chars) */
  var C = window.SHOP_CFG, B = window.BIZ_TYPES, qs = location.search;
  var ALIAS = { mobile: "mobile", mechanic: "mobile", repair: "repair", auto: "repair", shop: "repair", tire: "tire", tires: "tire", lube: "lube", oil: "lube", body: "body", collision: "body", detail: "detail", detailing: "detail" };
  var q = (qs.match(/[?&]type=([a-z]+)/i) || [])[1];
  var type = (q && ALIAS[q.toLowerCase()]) || "repair";
  var nm = qs.match(/[?&]shop=([^&#]*)/), custom = "";
  if (nm) { try { custom = decodeURIComponent(nm[1].replace(/\+/g, " ")); } catch (e) { custom = ""; } custom = custom.replace(/[\u0000-\u001f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 40); }
  var bt = B[type];
  C.type = type; C.biz = bt; C.mobile = !!bt.mobile;
  C.brand.name = custom || C.brand.name || bt.name;
  if (!C.brand.tagline) C.brand.tagline = bt.tagline;
  if (!C.brand.area) C.brand.area = bt.area;
  if (!C.mobile) C.tripFee = 0;
  var order = {}; bt.services.forEach(function (id, i) { order[id] = i; });
  C.services.forEach(function (s) { s.on = s.on !== false && order[s.id] != null; });
  C.services.sort(function (a, b) { return (order[a.id] == null ? 99 : order[a.id]) - (order[b.id] == null ? 99 : order[b.id]); });
  C.beforeAfter = (C.beforeAfter || []).filter(function (x) { return order[x.svc] != null; });
  /* copy overrides go into the page's strings before core.js reads them */
  var T = window.T = window.T || { en: {}, es: {} };
  ["en", "es"].forEach(function (l) { T[l] = T[l] || {}; Object.assign(T[l], (bt.t && bt.t[l]) || {}); });
})();
