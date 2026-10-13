/* SousShift AI — Mobile Mechanic demo: "Scan my car" (OBD-II). Exposes window.OBD (also works under Node for the unit test).
   - ELM327 response parser (pure functions, unit-tested in test/obd-parser.test.js)
   - plain-language info per code: meaning (obd-codes.js), a CONSERVATIVE "can I drive?" rule set, common causes, likely job
   - Web Bluetooth client for ELM327-compatible Bluetooth LE adapters (Chrome on Android / desktop, Bluefy on iPhone)
   - a simulated scan for demos
   READ-ONLY ON PURPOSE: it sends AT setup commands and modes 01 / 03 / 07 only. It never sends mode 04 (clear codes):
   clearing hides the problem and wipes the readiness monitors a smog check needs. */
(function (G) {
  "use strict";
  function L(en, es) { return { en: en, es: es }; }

  /* ---------- parser ---------- */
  var JUNK = /^(SEARCHING\.*|BUS INIT:?.*|OK|NO DATA|STOPPED|\?|ELM327.*|CAN ERROR|UNABLE TO CONNECT|BUFFER FULL|ERROR|>)$/i;
  /* raw adapter text -> array of messages, each an array of byte values. Handles echo, "SEARCHING...", spaces on/off,
     several ECUs answering (one line each) and ISO-TP multi-frame CAN replies ("00A" length line + "0: .." "1: .." frames). */
  function messages(raw) {
    var lines = String(raw || "").replace(/>/g, "\n").split(/[\r\n]+/).map(function (s) { return s.trim(); }).filter(function (s) { return s && !JUNK.test(s); });
    var out = [], frames = null;
    lines.forEach(function (ln) {
      if (/^[0-9A-F]{3}$/i.test(ln)) { frames = []; out.push(frames); return; }          // multi-frame length header
      var m = ln.match(/^([0-9A-F]):\s*(.*)$/i);
      if (m) { if (!frames) { frames = []; out.push(frames); } push(frames, m[2]); return; }
      frames = null; var b = []; push(b, ln); if (b.length) out.push(b);
    });
    return out.filter(function (b) { return b.length; });
    function push(arr, s) {
      var hex = s.replace(/[^0-9A-F]/gi, "");
      if (hex.length % 2) return;   // not a data line (e.g. an echoed command we couldn't strip)
      for (var i = 0; i < hex.length; i += 2) arr.push(parseInt(hex.substr(i, 2), 16));
    }
  }
  /* two bytes -> "P0133" (SAE J2012: top 2 bits = P/C/B/U, next 2 bits = first digit) */
  function decodeDTC(a, b) {
    return "PCBU"[a >> 6] + ((a >> 4) & 3) + (a & 15).toString(16).toUpperCase() + ("0" + b.toString(16).toUpperCase()).slice(-2);
  }
  /* mode "03" (stored), "07" (pending), "0A" (permanent) -> ["P0133", ...]
     Legacy protocols: 43 + always 3 code slots (6 bytes, zero-padded). CAN: 43 + a count byte + 2 bytes per code,
     so the data after 43 has an ODD length on CAN and an EVEN length on legacy. isCan (from ATDPN) overrides the guess. */
  function parseDTCs(raw, mode, isCan) {
    var hdr = parseInt(mode || "03", 16) + 0x40, seen = {}, codes = [];
    messages(raw).forEach(function (b) {
      var i = b.indexOf(hdr); if (i < 0) return;
      var d = b.slice(i + 1);
      var can = isCan != null ? isCan : d.length % 2 === 1;
      if (can) { var n = d[0]; d = d.slice(1, 1 + 2 * n); }
      for (var j = 0; j + 1 < d.length; j += 2) {
        if (d[j] === 0 && d[j + 1] === 0) continue;
        var c = decodeDTC(d[j], d[j + 1]); if (!seen[c]) { seen[c] = 1; codes.push(c); }
      }
    });
    return codes;
  }
  /* mode 01 PID -> number. pid as "0C" etc. */
  function parsePID(raw, pid) {
    var p = parseInt(pid, 16), r = null;
    messages(raw).some(function (b) {
      var i = b.indexOf(0x41); if (i < 0 || b[i + 1] !== p) return false;
      var A = b[i + 2], B = b[i + 3]; if (A == null) return false;
      if (p === 0x0C) r = B == null ? null : (A * 256 + B) / 4;          // RPM
      else if (p === 0x05) r = A - 40;                                    // coolant °C
      else if (p === 0x0D) r = A;                                         // speed km/h
      else if (p === 0x42) r = B == null ? null : (A * 256 + B) / 1000;   // control module voltage
      else if (p === 0x01) r = { mil: !!(A & 0x80), count: A & 0x7f };   // check-engine light + stored code count
      else r = A;
      return r != null;
    });
    return r;
  }
  function parseVolts(raw) { var m = String(raw || "").match(/(\d{1,2}(?:\.\d+)?)\s*V/i); return m ? parseFloat(m[1]) : null; }
  /* ATDPN -> protocol number ("A6" = auto, CAN 11-bit 500k). 6-9 (and A/B/C user CAN) are CAN. */
  function isCanProto(raw) { var m = String(raw || "").replace(/>/g, "").trim().match(/A?([0-9A-C])\s*$/i); return m ? /[6-9A-C]/i.test(m[1]) : null; }

  /* ---------- what a code means for the customer ---------- */
  var SEV = {
    stop: L("Stop driving", "No lo manejes"), soon: L("Get it checked soon", "Revísalo pronto"), ok: L("OK to drive, fix when you can", "Puedes manejar, arréglalo cuando puedas")
  };
  /* rules: first match wins. r = [from, to] on the 4-digit hex after the letter, or a test fn. sev = stop|soon|ok.
     jobs = [svc, opt] pairs that go in the quote ("Add to my job"). Conservative: when unsure, "soon". */
  function R(letter, from, to, sev, sys, causes, jobs, warn) { return { l: letter, a: parseInt(from, 16), b: parseInt(to, 16), sev: sev, sys: sys, causes: causes, jobs: jobs, warn: warn || null }; }
  var MIS = L("If the check-engine light is FLASHING, stop driving: a bad misfire can ruin the catalytic converter.", "Si la luz del motor PARPADEA, no manejes: una falla de encendido fuerte puede arruinar el catalizador.");
  var RULES = [
    R("P", "0520", "0524", "stop", L("Engine oil pressure", "Presión de aceite"), L("Low oil level, oil pressure sensor or wiring, worn oil pump or engine bearings", "Aceite bajo, sensor de presión o cableado, bomba de aceite o metales gastados"), [["oil", "conv"], ["diag", "deep"]], L("Check the oil level now. Low oil pressure can destroy the engine in minutes.", "Revisa el nivel de aceite ya. Sin presión de aceite el motor se puede dañar en minutos.")),
    R("P", "0217", "0217", "stop", L("Engine overheating", "Sobrecalentamiento"), L("Low coolant, stuck thermostat, cooling fan, water pump, leaking hose or radiator", "Anticongelante bajo, termostato pegado, ventilador, bomba de agua, manguera o radiador con fuga"), [["engine", "coolant"], ["engine", "thermo"], ["diag", "deep"]], L("Driving hot can warp the head. Let it cool, don't open a hot radiator cap.", "Manejarlo caliente puede torcer la cabeza. Déjalo enfriar, no abras el radiador caliente.")),
    R("P", "0218", "0218", "stop", L("Transmission over temperature", "Transmisión sobrecalentada"), L("Low or burnt transmission fluid, towing heavy, cooler blocked", "Aceite de transmisión bajo o quemado, mucha carga, enfriador tapado"), [["diag", "deep"]]),
    R("P", "0300", "0312", "soon", L("Engine misfire", "Falla de encendido"), L("Worn spark plugs, bad ignition coil, clogged fuel injector, vacuum leak, low compression", "Bujías gastadas, bobina dañada, inyector tapado, fuga de vacío, baja compresión"), [["engine", "plugs"], ["engine", "coil"]], MIS),
    R("P", "0016", "0019", "soon", L("Crank / cam timing", "Sincronización cigüeñal / árbol de levas"), L("Stretched timing chain or belt, cam/crank sensor, VVT problem", "Cadena o banda de tiempo estirada, sensor de cigüeñal o árbol, problema VVT"), [["diag", "deep"]]),
    R("P", "0010", "0025", "soon", L("Variable valve timing", "Tiempo variable de válvulas"), L("Low or dirty oil, VVT solenoid, stretched timing chain", "Aceite bajo o sucio, solenoide VVT, cadena de tiempo estirada"), [["oil", "syn"], ["diag", "deep"]]),
    R("P", "0030", "0064", "ok", L("Oxygen sensor heater", "Calentador del sensor de oxígeno"), L("Failed O2 sensor heater, blown fuse, wiring", "Calentador del sensor O2 dañado, fusible, cableado"), [["exhaust", "o2"]]),
    R("P", "0100", "0104", "soon", L("Mass airflow (MAF) sensor", "Sensor de flujo de aire (MAF)"), L("Dirty MAF sensor, air leak after the filter, wiring", "Sensor MAF sucio, fuga de aire después del filtro, cableado"), [["diag", "scan"]]),
    R("P", "0105", "0119", "soon", L("Engine sensor (MAP / air temp / coolant temp)", "Sensor del motor (MAP / temp. de aire / temp. de anticongelante)"), L("Sensor, connector or wiring", "Sensor, conector o cableado"), [["diag", "scan"]]),
    R("P", "0120", "0124", "soon", L("Throttle position sensor", "Sensor de posición del acelerador"), L("Throttle position sensor, dirty throttle body, wiring", "Sensor TPS, cuerpo de aceleración sucio, cableado"), [["diag", "deep"]]),
    R("P", "0125", "0128", "ok", L("Thermostat / warm-up", "Termostato / calentamiento"), L("Thermostat stuck open, coolant temp sensor, low coolant", "Termostato pegado abierto, sensor de temperatura, anticongelante bajo"), [["engine", "thermo"]], L("Watch the temperature gauge. If it climbs into the red, pull over.", "Vigila el medidor de temperatura. Si sube a rojo, oríllate.")),
    R("P", "0130", "0167", "ok", L("Oxygen (O2) sensor", "Sensor de oxígeno (O2)"), L("Worn O2 sensor, exhaust leak near the sensor, wiring", "Sensor O2 gastado, fuga de escape cerca del sensor, cableado"), [["exhaust", "o2"]]),
    R("P", "0170", "0175", "soon", L("Fuel mixture (too lean / too rich)", "Mezcla de combustible (pobre / rica)"), L("Vacuum leak, dirty MAF sensor, weak fuel pump or clogged filter, leaking injector", "Fuga de vacío, sensor MAF sucio, bomba de gasolina débil o filtro tapado, inyector con fuga"), [["diag", "deep"]]),
    R("P", "0200", "0299", "soon", L("Fuel injectors / fuel delivery", "Inyectores / suministro de combustible"), L("Injector or its wiring, fuel pump, fuel pressure", "Inyector o su cableado, bomba de gasolina, presión de combustible"), [["diag", "deep"]]),
    R("P", "0325", "0334", "soon", L("Knock sensor", "Sensor de detonación"), L("Knock sensor or wiring, low-octane fuel", "Sensor de detonación o cableado, gasolina de bajo octanaje"), [["diag", "deep"]]),
    R("P", "0335", "0349", "soon", L("Crankshaft / camshaft position sensor", "Sensor de posición de cigüeñal / árbol de levas"), L("Sensor, wiring, damaged reluctor ring", "Sensor, cableado, rueda reluctora dañada"), [["diag", "deep"]], L("A failing crank sensor can make the engine stall while driving.", "Un sensor de cigüeñal fallando puede apagar el motor mientras manejas.")),
    R("P", "0350", "0362", "soon", L("Ignition coil circuit", "Circuito de bobina de encendido"), L("Ignition coil, connector or wiring", "Bobina de encendido, conector o cableado"), [["engine", "coil"]], MIS),
    R("P", "0400", "0419", "ok", L("EGR / secondary air (emissions)", "EGR / aire secundario (emisiones)"), L("Clogged EGR passages or valve, secondary air pump or valve", "Conductos o válvula EGR tapados, bomba o válvula de aire secundario"), [["diag", "deep"]]),
    R("P", "0420", "0439", "ok", L("Catalytic converter efficiency", "Eficiencia del catalizador"), L("Worn catalytic converter, faulty downstream O2 sensor, exhaust leak, past misfires", "Catalizador gastado, sensor O2 de después dañado, fuga de escape, fallas de encendido anteriores"), [["diag", "scan"], ["exhaust", "o2"]], L("It won't pass smog until fixed. Test the O2 sensors before buying a converter.", "No pasará el smog hasta arreglarlo. Revisa los sensores O2 antes de comprar un catalizador.")),
    R("P", "0440", "0457", "ok", L("EVAP system (fuel vapor leak)", "Sistema EVAP (fuga de vapores)"), L("Loose or worn gas cap, purge or vent valve, cracked EVAP hose", "Tapón de gasolina flojo o gastado, válvula de purga o ventilación, manguera EVAP rota"), [["diag", "evap"]], L("Tighten the gas cap until it clicks first. The light can take a few days to go off.", "Primero aprieta el tapón de gasolina hasta que truene. La luz puede tardar unos días en apagarse.")),
    R("P", "0460", "0464", "ok", L("Fuel level sensor", "Sensor de nivel de gasolina"), L("Fuel level sender in the tank, wiring", "Flotador del tanque, cableado"), [["diag", "deep"]]),
    R("P", "0480", "0485", "soon", L("Cooling fan", "Ventilador del radiador"), L("Cooling fan motor, relay, fuse, wiring", "Motor del ventilador, relevador, fusible, cableado"), [["diag", "deep"]], L("Watch the temperature gauge in traffic.", "Vigila la temperatura en el tráfico.")),
    R("P", "0500", "0503", "soon", L("Vehicle speed sensor", "Sensor de velocidad"), L("Speed sensor, wiring, ABS wheel sensor (some cars)", "Sensor de velocidad, cableado, sensor ABS de rueda (en algunos carros)"), [["diag", "deep"]]),
    R("P", "0505", "0509", "ok", L("Idle control", "Control de marcha mínima"), L("Dirty throttle body or idle air valve, vacuum leak", "Cuerpo de aceleración sucio o válvula IAC, fuga de vacío"), [["diag", "scan"]]),
    R("P", "0530", "0534", "ok", L("A/C refrigerant pressure", "Presión del gas del A/C"), L("Low refrigerant (leak), pressure sensor", "Gas bajo (fuga), sensor de presión"), [["ac", "leak"]]),
    R("P", "0560", "0563", "soon", L("Charging system voltage", "Voltaje del sistema de carga"), L("Weak battery, failing alternator, loose or corroded battery cables", "Batería débil, alternador fallando, cables flojos o sulfatados"), [["battery", "test"]], L("It could leave you stranded. Avoid long trips until it's tested.", "Te puede dejar tirado. Evita viajes largos hasta probarlo.")),
    R("P", "0600", "0699", "soon", L("Engine computer / control circuits", "Computadora / circuitos de control"), L("Module, power or ground, wiring, low battery voltage", "Módulo, alimentación o tierra, cableado, voltaje bajo"), [["diag", "deep"]]),
    R("P", "0700", "0999", "soon", L("Transmission", "Transmisión"), L("Low or old transmission fluid, shift solenoid, sensor, wiring, internal wear", "Aceite de transmisión bajo o viejo, solenoide, sensor, cableado, desgaste interno"), [["diag", "deep"]], L("If it slips, bangs into gear or won't shift, stop driving it.", "Si patina, mete los cambios con golpe o no cambia, no lo manejes.")),
    R("P", "0A00", "0AFF", "soon", L("Hybrid / EV high-voltage system", "Sistema de alto voltaje híbrido / eléctrico"), L("Hybrid battery, inverter, cooling fan, high-voltage wiring", "Batería híbrida, inversor, ventilador, cableado de alto voltaje"), [["diag", "deep"]], L("High-voltage work needs a hybrid/EV-trained tech. Don't touch orange cables.", "El alto voltaje necesita un técnico de híbridos. No toques los cables naranjas.")),
    R("P", "2096", "2099", "ok", L("Fuel trim after the converter", "Ajuste de combustible después del catalizador"), L("Exhaust leak, downstream O2 sensor, worn converter", "Fuga de escape, sensor O2 de después, catalizador gastado"), [["diag", "scan"], ["exhaust", "o2"]]),
    R("P", "2100", "2119", "soon", L("Electronic throttle (limp mode)", "Acelerador electrónico (modo de emergencia)"), L("Throttle body motor, dirty throttle, wiring, pedal sensor", "Motor del cuerpo de aceleración, acelerador sucio, cableado, sensor del pedal"), [["diag", "deep"]], L("The car may go into reduced power. Drive carefully.", "El carro puede entrar en potencia reducida. Maneja con cuidado.")),
    R("P", "2120", "2139", "soon", L("Accelerator pedal / throttle sensors", "Sensores del pedal / acelerador"), L("Pedal position sensor, throttle sensor, wiring", "Sensor del pedal, sensor del acelerador, cableado"), [["diag", "deep"]]),
    R("P", "2187", "2191", "soon", L("Fuel mixture lean at idle", "Mezcla pobre en mínima"), L("Vacuum leak (hose, intake gasket, PCV), MAF sensor", "Fuga de vacío (manguera, empaque de admisión, PCV), sensor MAF"), [["diag", "deep"]]),
    R("P", "2195", "2199", "ok", L("Oxygen (O2) sensor signal", "Señal del sensor de oxígeno"), L("O2 / air-fuel sensor, exhaust leak, fuel mixture", "Sensor O2 / aire-combustible, fuga de escape, mezcla"), [["exhaust", "o2"]]),
    R("P", "2270", "2273", "ok", L("Oxygen (O2) sensor signal", "Señal del sensor de oxígeno"), L("Downstream O2 sensor, exhaust leak", "Sensor O2 de después, fuga de escape"), [["exhaust", "o2"]]),
    R("P", "2400", "2459", "ok", L("EVAP / emissions", "EVAP / emisiones"), L("EVAP leak-check pump, vent valve, hoses", "Bomba de prueba EVAP, válvula de ventilación, mangueras"), [["diag", "evap"]]),
    R("C", "0000", "3FFF", "soon", L("Brakes / ABS / traction (chassis)", "Frenos / ABS / tracción (chasis)"), L("Wheel speed sensor or its wiring, dirty tone ring, ABS module, brake switch", "Sensor de velocidad de rueda o cableado, anillo sucio, módulo ABS, switch de freno"), [["diag", "deep"]], L("With the ABS light on, normal brakes usually still work but ABS and traction control may be off. Leave extra room to stop.", "Con la luz de ABS, los frenos normales casi siempre funcionan pero el ABS y el control de tracción pueden estar apagados. Deja más distancia para frenar.")),
    R("B", "0000", "00FF", "soon", L("Airbag / restraint system", "Bolsas de aire / sistema de retención"), L("Airbag connector under a seat, clock spring, seat-belt sensor, airbag module", "Conector de bolsa bajo el asiento, resorte de reloj, sensor del cinturón, módulo de bolsas"), [["diag", "deep"]], L("The airbags may not go off in a crash until it's fixed. Airbag repairs are often a dealer/recall job.", "Las bolsas de aire podrían no abrir en un choque hasta arreglarlo. Muchas veces es trabajo de la agencia o recall.")),
    R("B", "0100", "3FFF", "ok", L("Body electronics", "Electrónica de carrocería"), L("Switch, sensor, module or wiring for lights, locks, windows, seats or climate", "Switch, sensor, módulo o cableado de luces, chapas, ventanas, asientos o clima"), [["diag", "deep"]]),
    R("U", "0000", "3FFF", "soon", L("Module communication (network)", "Comunicación entre módulos (red)"), L("Weak battery or bad ground, damaged wiring or connector, a failed module", "Batería débil o mala tierra, cableado o conector dañado, módulo dañado"), [["battery", "test"], ["diag", "deep"]], L("Low battery voltage alone can set these. Test the battery first.", "El voltaje bajo de la batería por sí solo puede causar estos códigos. Prueba la batería primero."))
  ];
  var FALLBACK = { P: L("Engine / transmission", "Motor / transmisión"), C: L("Chassis (brakes, steering, suspension)", "Chasis (frenos, dirección, suspensión)"), B: L("Body (airbags, lights, locks, climate)", "Carrocería (bolsas, luces, chapas, clima)"), U: L("Module network", "Red de módulos") };
  /* manufacturer-specific ranges per SAE J2012: P1xxx, P30xx-P33xx, B1/B2, C1/C2, U1/U2 */
  function mfr(code) {
    var l = code[0], d = code[1], h = parseInt(code.slice(1), 16);
    if (l === "P") return d === "1" || (d === "3" && h < 0x3400);
    return d === "1" || d === "2";
  }
  function norm(code) { var c = String(code || "").toUpperCase().replace(/[^0-9A-Z]/g, ""); return /^[PCBU][0-3][0-9A-F]{3}$/.test(c) ? c : null; }
  function info(code) {
    var c = norm(code); if (!c) return null;
    var db = G.OBD_CODES || {}, h = parseInt(c.slice(1), 16), m = mfr(c);
    var rule = null;
    if (!m) RULES.some(function (r) { if (r.l === c[0] && h >= r.a && h <= r.b) { rule = r; return true; } return false; });
    return {
      code: c, mfr: m, desc: db[c] || null, known: !!db[c],
      sev: rule ? rule.sev : "soon", sys: rule ? rule.sys : FALLBACK[c[0]],
      causes: rule ? rule.causes : null, warn: rule ? rule.warn : null,
      jobs: rule ? rule.jobs : [["diag", "scan"]]
    };
  }

  /* ---------- Web Bluetooth (ELM327 over BLE) ---------- */
  /* Cheap BLE OBD adapters expose a UART-style service. Seen in the wild: 0xFFF0 (FFF1 notify / FFF2 write: Veepeak BLE+, many clones),
     0xFFE0 (FFE1 notify+write: HM-10-based), 0x18F0 (2AF0 / 2AF1), and the Vgate/vLinker 128-bit service E7810A71-…. The page has to
     list every service it may touch in optionalServices, then picks whichever notify + write characteristics it finds. */
  var SERVICES = [0xfff0, 0xffe0, 0x18f0, "e7810a71-73ae-499d-8c15-faa9aef0c3f2", 0xfee7, 0xae30];
  function support() {
    var nav = G.navigator || {}, ua = nav.userAgent || "";
    var ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && nav.maxTouchPoints > 1);
    if (nav.bluetooth && typeof nav.bluetooth.requestDevice === "function") return { ok: true, ios: ios };
    return { ok: false, ios: ios, reason: ios ? "ios" : "browser" };
  }
  function Elm() { this.dev = null; this.rx = null; this.tx = null; this.buf = ""; this.wait = null; this.isCan = null; }
  Elm.prototype.connect = function (log) {
    var self = this; log = log || function () {};
    return G.navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: SERVICES }).then(function (dev) {
      self.dev = dev; log("pair", dev.name || "OBD adapter");
      dev.addEventListener("gattserverdisconnected", function () { if (self.wait) { self.wait.rej(new Error("disconnected")); self.wait = null; } });
      return dev.gatt.connect();
    }).then(function (srv) {
      return srv.getPrimaryServices().then(function (list) {
        return Promise.all(list.map(function (s) { return s.getCharacteristics().catch(function () { return []; }); }));
      });
    }).then(function (groups) {
      var all = [].concat.apply([], groups);
      var rx = all.filter(function (c) { return c.properties.notify || c.properties.indicate; });
      var tx = all.filter(function (c) { return c.properties.write || c.properties.writeWithoutResponse; });
      var pref = function (arr, ids) { return arr.filter(function (c) { return ids.some(function (i) { return c.uuid.indexOf(i) === 4 || c.uuid.indexOf(i) === 0; }); })[0] || arr[0]; };
      self.rx = pref(rx, ["fff1", "ffe1", "2af0", "bef8d6c9"]); self.tx = pref(tx, ["fff2", "ffe1", "2af1", "bef8d6c9"]);
      if (!self.rx || !self.tx) throw new Error("nouart");
      self.rx.addEventListener("characteristicvaluechanged", function (e) {
        self.buf += new TextDecoder().decode(e.target.value);
        if (self.wait && self.buf.indexOf(">") >= 0) { var w = self.wait, out = self.buf; self.wait = null; self.buf = ""; clearTimeout(w.t); w.res(out); }
      });
      return self.rx.startNotifications();
    });
  };
  Elm.prototype.cmd = function (s, ms) {
    var self = this;
    if (/^\s*04\s*$/.test(s)) return Promise.reject(new Error("mode 04 (clear codes) is disabled"));
    return new Promise(function (res, rej) {
      self.buf = "";
      self.wait = { res: res, rej: rej, t: setTimeout(function () { var out = self.buf; self.wait = null; self.buf = ""; out ? res(out) : rej(new Error("timeout " + s)); }, ms || 4000) };
      var bytes = new TextEncoder().encode(s + "\r"), chain = Promise.resolve();
      for (var i = 0; i < bytes.length; i += 20) (function (chunk) {
        chain = chain.then(function () { return self.tx.writeValueWithoutResponse && self.tx.properties.writeWithoutResponse ? self.tx.writeValueWithoutResponse(chunk) : self.tx.writeValue(chunk); });
      })(bytes.slice(i, i + 20));
      chain.catch(function (e) { if (self.wait) { clearTimeout(self.wait.t); self.wait = null; } rej(e); });
    });
  };
  /* full read-only scan */
  Elm.prototype.scan = function (log) {
    var self = this, r = {}; log = log || function () {};
    var seq = [["ATZ", 5000], ["ATE0"], ["ATL0"], ["ATS1"], ["ATH0"], ["ATSP0"]];
    var p = Promise.resolve();
    seq.forEach(function (c) { p = p.then(function () { log("cmd", c[0]); return self.cmd(c[0], c[1]); }); });
    return p.then(function () { log("cmd", "0101"); return self.cmd("0101", 15000); })            // first request triggers the protocol search
      .then(function (x) { r.status = parsePID(x, "01"); return self.cmd("ATDPN"); })
      .then(function (x) { self.isCan = isCanProto(x); log("cmd", "03"); return self.cmd("03", 8000); })
      .then(function (x) { r.stored = parseDTCs(x, "03", self.isCan); log("cmd", "07"); return self.cmd("07", 8000); })
      .then(function (x) { r.pending = parseDTCs(x, "07", self.isCan); return self.cmd("010C").catch(function () { return ""; }); })
      .then(function (x) { r.rpm = parsePID(x, "0C"); return self.cmd("0105").catch(function () { return ""; }); })
      .then(function (x) { r.coolant = parsePID(x, "05"); return self.cmd("ATRV").catch(function () { return ""; }); })
      .then(function (x) { r.volts = parseVolts(x); return r; });
  };
  Elm.prototype.close = function () { try { if (this.dev && this.dev.gatt.connected) this.dev.gatt.disconnect(); } catch (e) {} };

  /* ---------- simulated scan (demo button) ---------- */
  function simulate() {
    var raw = { status: "41 01 82 07 65 00\r\r>", s03: "43 02 04 20 01 71\r\r>", s07: "47 01 03 02\r\r>", rpm: "41 0C 0B B8\r>", ect: "41 05 7B\r>", rv: "12.4V\r>" };
    return {
      status: parsePID(raw.status, "01"), stored: parseDTCs(raw.s03, "03"), pending: parseDTCs(raw.s07, "07"),
      rpm: parsePID(raw.rpm, "0C"), coolant: parsePID(raw.ect, "05"), volts: parseVolts(raw.rv), simulated: true
    };
  }

  var API = { messages: messages, decodeDTC: decodeDTC, parseDTCs: parseDTCs, parsePID: parsePID, parseVolts: parseVolts, isCanProto: isCanProto,
    info: info, norm: norm, mfr: mfr, SEV: SEV, support: support, Elm: Elm, simulate: simulate, SERVICES: SERVICES };
  G.OBD = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;
})(typeof window !== "undefined" ? window : globalThis);
