/* SousShift AI — Mobile Mechanic demo. THE ONE CONFIG: rebrand the whole app (customer page + /shop/) by editing this object.
   Everything below is a PLACEHOLDER. No real person or business. Prices are SAMPLE ranges, not a quote.
   To rebrand for a real mechanic, fill in:
     brand.name / short / tagline / city / area / phone / sms / email / logo / since
     colors.*            (accent = main brand color, accent2 = second color)
     hours               (per weekday, 24h "HH:MM"; null = closed) + slotMinutes + bookAheadDays
     laborRate / tripFee / freeTripMiles
     services[]          (turn off with on:false, rename, change options + parts/labor ranges)
     beforeAfter[]       (put his real photo URLs in before/after; empty = placeholder art)
     demoPin             (shop page; DEMO ONLY)
   Also swap (they can't read JS): manifest.webmanifest name/short_name + the icon PNGs in this folder.
   Text in { en, es } pairs shows in English / Spanish with the language switch. */
window.SHOP_CFG = {
  demo: true,
  brand: {
    name: "Your Garage",
    short: "Your Garage",
    tagline: { en: "Mobile Mechanic", es: "Mecánico a domicilio" },
    city: "Your City, CA",
    area: { en: "We come to you · 15-mile service area", es: "Vamos a ti · zona de 15 millas" },
    phone: "(555) 010-0000",          // 555-01xx = reserved fictional numbers
    sms: "+15550100000",
    email: "hello@example.com",        // example.com = reserved, never a real inbox
    logo: "icon-192.png",              // swap for his logo (square PNG)
    since: "20XX"
  },
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
     price = parts + hrs × laborRate. perWheel:true options are added per tire/axle tapped on the car. */
  services: [
    { id: "diag", icon: "🩺", on: true, name: { en: "Diagnostics", es: "Diagnóstico" },
      desc: { en: "Check-engine light, scan + road test", es: "Luz de motor, escaneo y prueba" },
      options: [
        { id: "scan", name: { en: "Code scan + inspection", es: "Escaneo + inspección" }, parts: [0, 0], hrs: [0.75, 1] },
        { id: "deep", name: { en: "Deep diagnosis (electrical / no-start)", es: "Diagnóstico a fondo (eléctrico / no arranca)" }, parts: [0, 0], hrs: [1.5, 2.5] }
      ] },
    { id: "oil", icon: "🛢️", on: true, name: { en: "Oil change", es: "Cambio de aceite" },
      desc: { en: "Oil, filter, fluid top-off", es: "Aceite, filtro y niveles" },
      options: [
        { id: "conv", name: { en: "Conventional", es: "Convencional" }, parts: [30, 45], hrs: [0.5, 0.5] },
        { id: "syn", name: { en: "Full synthetic", es: "Sintético" }, parts: [55, 85], hrs: [0.5, 0.75] }
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
        { id: "four", name: { en: "Replace all 4", es: "Cambiar las 4" }, parts: [360, 880], hrs: [1.5, 2] }
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
        { id: "coolant", name: { en: "Coolant flush", es: "Cambio de anticongelante" }, parts: [25, 50], hrs: [1, 1.25] }
      ] },
    { id: "susp", icon: "🧲", on: true, name: { en: "Suspension", es: "Suspensión" },
      desc: { en: "Shocks, struts, links", es: "Amortiguadores, bases, rótulas" },
      options: [
        { id: "inspect", name: { en: "Inspect clunks / noises", es: "Revisar ruidos" }, parts: [0, 0], hrs: [0.5, 0.75] },
        { id: "struts", name: { en: "Shocks / struts (pair)", es: "Amortiguadores (par)" }, parts: [200, 500], hrs: [2, 3.5], perAxle: true },
        { id: "links", name: { en: "Sway bar links (pair)", es: "Tornillos estabilizadores (par)" }, parts: [40, 120], hrs: [1, 1.5] }
      ] },
    { id: "ac", icon: "❄️", on: true, name: { en: "A/C", es: "Aire acondicionado" },
      desc: { en: "Recharge, leak check, filter", es: "Recarga, fugas, filtro" },
      options: [
        { id: "recharge", name: { en: "A/C recharge", es: "Recarga de A/C" }, parts: [40, 90], hrs: [0.75, 1] },
        { id: "leak", name: { en: "Leak check (UV dye)", es: "Revisión de fugas (tinte UV)" }, parts: [20, 40], hrs: [1, 1.5] },
        { id: "cabin", name: { en: "Cabin air filter", es: "Filtro de cabina" }, parts: [15, 35], hrs: [0.25, 0.25] }
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
    { id: "doors", icon: "🚪", on: true, name: { en: "Doors & windows", es: "Puertas y ventanas" },
      desc: { en: "Regulators, locks, handles", es: "Elevadores, chapas, manijas" },
      options: [
        { id: "reg", name: { en: "Window regulator / motor", es: "Elevador / motor de ventana" }, parts: [60, 180], hrs: [1.5, 2] },
        { id: "lock", name: { en: "Door lock actuator", es: "Actuador de chapa" }, parts: [40, 140], hrs: [1, 1.5] }
      ] },
    { id: "exhaust", icon: "💨", on: true, name: { en: "Exhaust", es: "Escape" },
      desc: { en: "Leaks, muffler, O2 sensor", es: "Fugas, mofle, sensor O2" },
      options: [
        { id: "inspect", name: { en: "Inspect leak / noise", es: "Revisar fuga / ruido" }, parts: [0, 0], hrs: [0.5, 0.75] },
        { id: "muffler", name: { en: "Muffler / pipe repair", es: "Reparar mofle / tubo" }, parts: [80, 250], hrs: [1, 2] },
        { id: "o2", name: { en: "O2 sensor", es: "Sensor de oxígeno" }, parts: [40, 150], hrs: [0.5, 1] }
      ] },
    { id: "detail", icon: "✨", on: true, addon: true, name: { en: "Detailing add-on", es: "Detallado (extra)" },
      desc: { en: "While it's here", es: "Ya que está aquí" },
      options: [
        { id: "int", name: { en: "Interior detail", es: "Detallado interior" }, parts: [20, 40], hrs: [1.5, 2] },
        { id: "ext", name: { en: "Wash + wax", es: "Lavado + cera" }, parts: [20, 40], hrs: [1.5, 2] },
        { id: "full", name: { en: "Full detail", es: "Detallado completo" }, parts: [40, 80], hrs: [3, 4] }
      ] }
  ],

  /* Before / after slider. before/after = photo URL; leave "" to show placeholder art (no stock photos, no people). */
  beforeAfter: [
    { art: "headlight", svc: "lights", title: { en: "Headlight restoration", es: "Pulido de faros" }, before: "", after: "" },
    { art: "brakes", svc: "brakes", title: { en: "Pads + rotors", es: "Balatas + discos" }, before: "", after: "" },
    { art: "tint", svc: "tint", title: { en: "Window tint", es: "Polarizado" }, before: "", after: "" },
    { art: "detail", svc: "detail", title: { en: "Interior detail", es: "Detallado interior" }, before: "", after: "" }
  ]
};
