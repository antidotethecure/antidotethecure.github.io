/* Case Companion skeleton demo. Every row is a fictional placeholder (SAMPLE). No real client data. */
(function(){
  "use strict";
  var LANG = "en";
  try { var saved = localStorage.getItem("caseapp-lang"); if (saved === "es" || saved === "en") LANG = saved; } catch (e) {}
  if (LANG === "en" && /^es\b/i.test(navigator.language || "") ) LANG = "es";

  function d(days){
    var t = new Date(); t.setDate(t.getDate() + days);
    return t.toLocaleDateString(LANG === "es" ? "es-US" : "en-US", { weekday:"short", month:"short", day:"numeric" });
  }
  function L(o){ return typeof o === "string" ? o : (o[LANG] || o.en); }
  var CALL = {en:"Call",es:"Llamar"}, TEXT = {en:"Text",es:"Texto"}, MAIL = {en:"Email",es:"Correo"}, MAP = {en:"Map",es:"Mapa"};
  var SIGN = {en:"Sign",es:"Firmar"}, SEND = {en:"Send PDF",es:"Enviar PDF"}, SRC = {en:"Source",es:"Fuente"}, SELF = {en:"Search it yourself",es:"Búsquelo usted"};
  var CHECK = {en:"Check license",es:"Verificar licencia"}, ICS = {en:"Add to calendar",es:"Al calendario"};

  /* status helpers */
  var ST = {
    ok:{en:"Filed",es:"Presentada"}, no:{en:"Not filed",es:"No presentada"},
    wait:{en:"Pending",es:"Pendiente"}, dec:{en:"Decided against",es:"Descartada"}
  };

  function TABS(){ return [
    { id:"dates", t:{en:"📅 Dates",es:"📅 Fechas"},
      why:{en:"Every court date and appointment, with reminders the day before and the morning of.",es:"Cada fecha de corte y cita, con recordatorios el día antes y esa mañana."},
      rows:[
        { h:{en:"Court: pretrial hearing",es:"Corte: audiencia previa al juicio"}, m:d(4)+" · 8:30 AM · Dept. 00 · Sample County Superior Court", a:[ICS,MAP] },
        { h:{en:"Meeting with attorney",es:"Reunión con el abogado"}, m:d(2)+" · 1:00 PM · [Your firm]", a:[ICS,CALL] },
        { h:{en:"Court: preliminary hearing",es:"Corte: audiencia preliminar"}, m:d(11)+" · 9:00 AM · Dept. 00", a:[ICS,MAP] }
      ]},
    { id:"checkins", t:{en:"✅ Check-ins",es:"✅ Presentaciones"},
      why:{en:"Pretrial, probation and bond check-ins with a timestamped log. Missed ones are flagged.",es:"Presentaciones de libertad previa, probatoria y fianza, con registro de hora. Las perdidas se marcan."},
      rows:[
        { h:{en:"Weekly bond check-in",es:"Presentación semanal de fianza"}, st:"ok", m:{en:"Checked in "+d(-3)+" · 10:02 AM",es:"Presentado "+d(-3)+" · 10:02 AM"} },
        { h:{en:"Pretrial services meeting",es:"Reunión de servicios previos al juicio"}, st:"wait", m:d(1)+" · 10:30 AM" },
        { h:{en:"Monitor charging reminder",es:"Recordatorio de cargar el monitor"}, st:"wait", m:{en:"Daily · 9:00 PM",es:"Diario · 9:00 PM"} }
      ]},
    { id:"motions", t:{en:"📑 Motions",es:"📑 Mociones"},
      why:{en:"Per-stage checklist the attorney fills in: filed, not filed or decided against, with the reason and date.",es:"Lista por etapa que llena el abogado: presentada, no presentada o descartada, con motivo y fecha."},
      rows:[
        { h:{en:"Discovery motion",es:"Moción de descubrimiento"}, st:"ok", m:{en:"Filed "+d(-9)+" · docket entry #00",es:"Presentada "+d(-9)+" · entrada #00"} },
        { h:{en:"Motion to suppress",es:"Moción para suprimir pruebas"}, st:"wait", m:{en:"Deadline "+d(14)+" · reason: [attorney note]",es:"Plazo "+d(14)+" · motivo: [nota del abogado]"} },
        { h:{en:"Bail review motion",es:"Moción de revisión de fianza"}, st:"dec", m:{en:"Decided against "+d(-5)+" · reason: [attorney note]",es:"Descartada "+d(-5)+" · motivo: [nota del abogado]"} },
        { h:{en:"Motion to continue",es:"Moción de aplazamiento"}, st:"no", m:{en:"Not filed · reason: [attorney note]",es:"No presentada · motivo: [nota del abogado]"} }
      ]},
    { id:"evidence", t:{en:"🗂️ Evidence",es:"🗂️ Pruebas"},
      why:{en:"Evidence log: every receipt, record and photo with date, source and where the original is kept.",es:"Registro de pruebas: cada recibo, registro y foto con fecha, fuente y dónde está el original."},
      rows:[
        { h:{en:"Exhibit A: work records",es:"Prueba A: registros de trabajo"}, m:{en:"PDF · added "+d(-12)+" · original in [vault]",es:"PDF · agregado "+d(-12)+" · original en [archivo]"}, a:[SRC] },
        { h:{en:"Exhibit B: receipts",es:"Prueba B: recibos"}, m:{en:"3 photos · added "+d(-8),es:"3 fotos · agregado "+d(-8)}, a:[SRC] },
        { h:{en:"Exhibit C: call log",es:"Prueba C: registro de llamadas"}, m:{en:"Spreadsheet · added "+d(-2),es:"Hoja de cálculo · agregado "+d(-2)}, a:[SRC] }
      ]},
    { id:"discovery", t:{en:"📦 Discovery",es:"📦 Descubrimiento"},
      why:{en:"What was requested, what arrived and what is still missing.",es:"Lo que se pidió, lo que llegó y lo que aún falta."},
      rows:[
        { h:{en:"Police report",es:"Reporte policial"}, st:"ok", m:{en:"Received "+d(-10),es:"Recibido "+d(-10)} },
        { h:{en:"Video footage",es:"Video"}, st:"wait", m:{en:"Requested "+d(-10)+" · follow up "+d(3),es:"Pedido "+d(-10)+" · seguimiento "+d(3)} },
        { h:{en:"Lab results",es:"Resultados de laboratorio"}, st:"no", m:{en:"Not yet requested",es:"Aún no pedido"} }
      ]},
    { id:"witnesses", t:{en:"👥 Witnesses",es:"👥 Testigos"},
      why:{en:"Defense witness list for the attorney only. No-contact names are blocked: the app never creates reminders or messages for them.",es:"Lista de testigos de la defensa, solo para el abogado. Los nombres de no contacto se bloquean: la app nunca crea recordatorios ni mensajes para ellos."},
      rows:[
        { h:{en:"Witness A (defense)",es:"Testigo A (defensa)"}, m:{en:"Role: [character] · contact via attorney only",es:"Rol: [carácter] · contacto solo por el abogado"} },
        { h:{en:"Witness B (defense)",es:"Testigo B (defensa)"}, m:{en:"Role: [records custodian] · contact via attorney only",es:"Rol: [custodio de registros] · contacto solo por el abogado"} }
      ]},
    { id:"contacts", t:{en:"📞 Contacts",es:"📞 Contactos"},
      why:{en:"Every person and office with tap-to-call, text, email (case number in the subject) and map.",es:"Cada persona y oficina con llamar, texto, correo (número de caso en el asunto) y mapa."},
      rows:[
        { h:{en:"Attorney: [Your firm]",es:"Abogado: [Su bufete]"}, m:"(555) 555-0100 · attorney@example.com", a:[CALL,TEXT,MAIL] },
        { h:{en:"Court clerk: Sample County",es:"Secretaría: Condado de Muestra"}, m:"(555) 555-0101", a:[CALL,MAP] },
        { h:{en:"Bail agent: [Your agency]",es:"Agente de fianzas: [Su agencia]"}, m:"(555) 555-0102", a:[CALL,TEXT] },
        { h:{en:"Family contact: Casey Sample",es:"Contacto familiar: Casey Sample"}, m:"(555) 555-0103", a:[CALL,TEXT] }
      ]},
    { id:"bail", t:{en:"💵 Bail",es:"💵 Fianza"},
      why:{en:"Bond amount, premium, collateral, cosigner and conditions, plus a license check for the agent.",es:"Monto de fianza, prima, garantía, cofirmante y condiciones, y verificación de licencia del agente."},
      rows:[
        { h:{en:"Bond: $00,000 · posted",es:"Fianza: $00,000 · depositada"}, st:"ok", m:{en:"Agent: [Your agency] · license #0000000",es:"Agente: [Su agencia] · licencia #0000000"}, a:[CHECK] },
        { h:{en:"Premium plan",es:"Plan de prima"}, m:{en:"Next payment "+d(6)+" · $000",es:"Próximo pago "+d(6)+" · $000"} },
        { h:{en:"Forfeiture risk",es:"Riesgo de decomiso"}, st:"ok", m:{en:"Low: 0 missed dates · 0 missed check-ins",es:"Bajo: 0 fechas perdidas · 0 presentaciones perdidas"} }
      ]},
    { id:"docs", t:{en:"✍️ Documents",es:"✍️ Documentos"},
      why:{en:"Forms and releases to sign on screen, then sent as a PDF by email or text.",es:"Formularios y autorizaciones para firmar en pantalla y enviar como PDF por correo o texto."},
      rows:[
        { h:{en:"Records release",es:"Autorización de registros"}, st:"wait", m:{en:"Needs client signature",es:"Falta firma del cliente"}, a:[SIGN,SEND] },
        { h:{en:"Family contact authorization",es:"Autorización de contacto familiar"}, st:"ok", m:{en:"Signed "+d(-4),es:"Firmada "+d(-4)}, a:[SEND] },
        { h:{en:"Official court forms",es:"Formularios oficiales"}, m:{en:"Links to the court's own forms page",es:"Enlaces a la página oficial de formularios"}, a:[SRC] }
      ]},
    { id:"letters", t:{en:"💌 Letters",es:"💌 Cartas"},
      why:{en:"Character letters collected from family, employers and community, tracked until they reach the attorney.",es:"Cartas de carácter de familia, empleadores y comunidad, con seguimiento hasta que llegan al abogado."},
      rows:[
        { h:{en:"Letter from employer",es:"Carta del empleador"}, st:"ok", m:{en:"Received "+d(-6),es:"Recibida "+d(-6)} },
        { h:{en:"Letter from family member",es:"Carta de un familiar"}, st:"wait", m:{en:"Requested · template sent",es:"Pedida · plantilla enviada"} },
        { h:{en:"Letter from community program",es:"Carta de programa comunitario"}, st:"no", m:{en:"Not requested yet",es:"Aún no pedida"} }
      ]},
    { id:"research", t:{en:"🔎 Research",es:"🔎 Investigación"},
      why:{en:"Similar cases and rules, each linked to its source, with search-it-yourself buttons.",es:"Casos y normas similares, cada uno con su fuente y botones para buscar usted mismo."},
      rows:[
        { h:{en:"Similar case: People v. Example",es:"Caso similar: People v. Example"}, m:{en:"Summary: [placeholder] · verified "+d(-1),es:"Resumen: [ejemplo] · verificado "+d(-1)}, a:[SRC,SELF] },
        { h:{en:"Rule: [statute or court rule]",es:"Norma: [ley o regla de corte]"}, m:{en:"Plain-language note: [placeholder]",es:"Nota sencilla: [ejemplo]"}, a:[SRC] }
      ]},
    { id:"family", t:{en:"🏠 Family",es:"🏠 Familia"},
      why:{en:"Plain-language family guide: what happens next, how to help, and emergency steps if the client misses a check-in.",es:"Guía sencilla para la familia: qué sigue, cómo ayudar y pasos de emergencia si el cliente no se presenta."},
      rows:[
        { h:{en:"What happens at the next hearing",es:"Qué pasa en la próxima audiencia"}, m:{en:"2-minute read",es:"Lectura de 2 minutos"} },
        { h:{en:"Daily safety check-in",es:"Confirmación diaria de seguridad"}, st:"ok", m:{en:"Confirmed today · 12:30 PM",es:"Confirmada hoy · 12:30 PM"} },
        { h:{en:"If they can't be reached",es:"Si no se le puede localizar"}, m:{en:"Step-by-step: who to call first",es:"Paso a paso: a quién llamar primero"} }
      ]},
    { id:"appeal", t:{en:"⚖️ Appeal",es:"⚖️ Apelación"},
      why:{en:"If the result goes the wrong way: the post-trial path with deadlines cited to official sources.",es:"Si el resultado es desfavorable: el camino después del juicio con plazos citados de fuentes oficiales."},
      rows:[
        { h:{en:"Notice of appeal",es:"Aviso de apelación"}, m:{en:"Deadline: [days] after judgment · [rule]",es:"Plazo: [días] tras la sentencia · [regla]"}, a:[SRC] },
        { h:{en:"Preserve the record",es:"Preservar el expediente"}, st:"wait", m:{en:"Transcripts ordered: [placeholder]",es:"Transcripciones pedidas: [ejemplo]"} },
        { h:{en:"Record clearing",es:"Limpieza de antecedentes"}, m:{en:"Eligibility checklist",es:"Lista de requisitos"}, a:[SRC] }
      ]},
    { id:"probono", t:{en:"🤝 Pro bono",es:"🤝 Gratuito"},
      why:{en:"Legal aid, pro bono and referral services for the client's county.",es:"Ayuda legal, servicios gratuitos y referencias en el condado del cliente."},
      rows:[
        { h:{en:"Sample County Legal Aid",es:"Ayuda Legal del Condado de Muestra"}, m:"(555) 555-0104", a:[CALL,SRC] },
        { h:{en:"Lawyer referral service",es:"Servicio de referencia de abogados"}, m:"(555) 555-0105", a:[CALL,SRC] }
      ]}
  ];}

  var FOLDERS = [
    ["📅",{en:"Court calendar",es:"Calendario de corte"},{en:"Every hearing and appointment, with calendar export and reminders",es:"Cada audiencia y cita, con exportación al calendario y recordatorios"}],
    ["🔔",{en:"Reminders",es:"Recordatorios"},{en:"Court, check-ins, monitor charging, classes, fees",es:"Corte, presentaciones, cargar el monitor, clases, pagos"}],
    ["✅",{en:"Check-ins and conditions",es:"Presentaciones y condiciones"},{en:"Pretrial, probation and bond, with a timestamped log",es:"Previa al juicio, probatoria y fianza, con registro de hora"}],
    ["📑",{en:"Motions tracker",es:"Control de mociones"},{en:"Filed / not filed / decided against, with reasons and dates",es:"Presentada / no presentada / descartada, con motivos y fechas"}],
    ["🗂️",{en:"Evidence log",es:"Registro de pruebas"},{en:"Exhibits with dates, sources and where originals live",es:"Pruebas con fechas, fuentes y dónde están los originales"}],
    ["📦",{en:"Discovery",es:"Descubrimiento"},{en:"Requested, received and still missing",es:"Pedido, recibido y aún pendiente"}],
    ["👥",{en:"Witness list",es:"Lista de testigos"},{en:"Attorney-only, with no-contact guardrails",es:"Solo para el abogado, con bloqueo de no contacto"}],
    ["📞",{en:"Attorney and team contacts",es:"Contactos del abogado y equipo"},{en:"Tap to call, text, email or map",es:"Toque para llamar, texto, correo o mapa"}],
    ["💵",{en:"Bail and bond",es:"Fianza"},{en:"Amount, premium, cosigner, license check, forfeiture risk",es:"Monto, prima, cofirmante, licencia, riesgo de decomiso"}],
    ["✍️",{en:"Documents and sign-and-send",es:"Documentos para firmar y enviar"},{en:"Sign on screen, send a PDF by email or text",es:"Firme en pantalla, envíe el PDF por correo o texto"}],
    ["💌",{en:"Character letters",es:"Cartas de carácter"},{en:"Templates, requests and a received tracker",es:"Plantillas, solicitudes y control de recibidas"}],
    ["🧾",{en:"Mitigation packet",es:"Paquete de mitigación"},{en:"Work history, programs and community ties in one PDF",es:"Historial laboral, programas y lazos comunitarios en un PDF"}],
    ["🔎",{en:"Research and source links",es:"Investigación y fuentes"},{en:"Similar cases and rules, each linked to its source",es:"Casos y normas similares, cada uno con su fuente"}],
    ["📰",{en:"Daily case research",es:"Investigación diaria"},{en:"New rulings and docket changes checked every day",es:"Nuevas resoluciones y cambios en el expediente revisados a diario"}],
    ["🗒️",{en:"Meeting agendas",es:"Agendas de reuniones"},{en:"The client's own questions and requests, in their words",es:"Preguntas y pedidos del cliente, en sus palabras"}],
    ["📥",{en:"Encrypted document drop box",es:"Buzón cifrado de documentos"},{en:"Upload and download files; the server stores ciphertext only",es:"Suba y baje archivos; el servidor solo guarda datos cifrados"}],
    ["☎️",{en:"Process log",es:"Registro de trámites"},{en:"Calls, receipts and agreements with dates",es:"Llamadas, recibos y acuerdos con fechas"}],
    ["🏠",{en:"Family guide",es:"Guía para la familia"},{en:"Plain language, privileged material hidden",es:"Lenguaje sencillo, lo privilegiado oculto"}],
    ["🆘",{en:"Safety check-in",es:"Confirmación de seguridad"},{en:"Daily tap; missed check-ins alert chosen contacts",es:"Un toque diario; si falta, avisa a contactos elegidos"}],
    ["⚖️",{en:"Appeal and record clearing",es:"Apelación y limpieza de antecedentes"},{en:"Post-trial path with cited deadlines",es:"Camino después del juicio con plazos citados"}],
    ["🤝",{en:"Pro bono and legal aid",es:"Abogados gratuitos y ayuda legal"},{en:"County directory with tap-to-call",es:"Directorio del condado con llamada directa"}],
    ["🚨",{en:"Forfeiture risk board",es:"Panel de riesgo de decomiso"},{en:"Every bond, next date and missed check-in at a glance",es:"Cada fianza, próxima fecha y presentación perdida de un vistazo"}],
    ["🎨",{en:"Your brand",es:"Su marca"},{en:"Your name, colors, license number and phone on the app",es:"Su nombre, colores, número de licencia y teléfono en la app"}],
    ["🔊",{en:"Read-aloud and search",es:"Lectura en voz alta y búsqueda"},{en:"Any page read aloud on the device; search highlights matches",es:"Cualquier página leída en el teléfono; la búsqueda resalta coincidencias"}]
  ];

  var tabsEl = document.getElementById("tabs"), pane = document.getElementById("pane");
  var cur = "dates";

  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }

  function renderTabs(){
    var tabs = TABS();
    tabsEl.innerHTML = tabs.map(function(t){
      return '<button type="button" role="tab" data-id="'+t.id+'" aria-selected="'+(t.id===cur)+'">'+esc(L(t.t))+'</button>';
    }).join("");
    var tab = tabs.filter(function(t){ return t.id === cur; })[0];
    pane.innerHTML = '<h4>'+esc(L(tab.t).replace(/^\S+\s/,""))+'</h4><p class="why">'+esc(L(tab.why))+'</p>' +
      tab.rows.map(function(r){
        var st = r.st ? '<span class="st '+r.st+'">'+esc(L(ST[r.st]))+'</span>' : "";
        var acts = r.a ? '<div class="acts">'+r.a.map(function(a){ return '<button type="button" data-act>'+esc(L(a))+'</button>'; }).join("")+'</div>' : "";
        return '<div class="item"><div class="h"><b>'+esc(L(r.h))+'</b><span class="tag">SAMPLE</span></div><div class="m">'+st+esc(L(r.m))+'</div>'+acts+'</div>';
      }).join("");
    pane.scrollTop = 0;
  }
  tabsEl.addEventListener("click", function(e){
    var b = e.target.closest("button[data-id]"); if (!b) return;
    cur = b.getAttribute("data-id"); stopSpeak(); renderTabs();
    b = tabsEl.querySelector('[data-id="'+cur+'"]'); if (b && b.scrollIntoView) b.scrollIntoView({block:"nearest",inline:"center",behavior:"smooth"});
  });

  var toastEl = document.getElementById("toast"), tt;
  function toast(msg){ toastEl.textContent = msg; toastEl.classList.add("on"); clearTimeout(tt); tt = setTimeout(function(){ toastEl.classList.remove("on"); }, 2600); }
  pane.addEventListener("click", function(e){
    var b = e.target.closest("button[data-act]"); if (!b) return;
    toast(LANG === "es" ? "Muestra: en su versión, “"+b.textContent+"” funciona con los datos reales." : "Sample: in your build, “"+b.textContent+"” works with the real data.");
  });

  function renderFolders(){
    document.getElementById("folderList").innerHTML = FOLDERS.map(function(f){
      return '<div class="folder"><span class="fi" aria-hidden="true">'+f[0]+'</span><div><b>'+esc(L(f[1]))+'</b><span>'+esc(L(f[2]))+'</span></div></div>';
    }).join("");
  }

  /* lock screen (Face ID mock) */
  var lock = document.getElementById("lock");
  document.getElementById("unlock").addEventListener("click", function(){
    lock.classList.add("scan");
    setTimeout(function(){ lock.classList.add("gone"); lock.classList.remove("scan"); }, 700);
  });
  document.getElementById("relock").addEventListener("click", function(){ stopSpeak(); lock.classList.remove("gone"); });

  /* read-aloud, on-device only */
  var speakBtn = document.getElementById("speak");
  function stopSpeak(){ try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {} }
  if (!("speechSynthesis" in window)) speakBtn.style.display = "none";
  speakBtn.addEventListener("click", function(){
    try {
      if (speechSynthesis.speaking) { speechSynthesis.cancel(); return; }
      var u = new SpeechSynthesisUtterance(pane.innerText.replace(/SAMPLE/g, ""));
      u.lang = LANG === "es" ? "es-US" : "en-US"; u.rate = 1.0;
      speechSynthesis.speak(u);
    } catch (e) {}
  });

  /* language */
  var mail = document.getElementById("mailBtn"), sms = document.getElementById("textBtn");
  function setLang(l){
    LANG = l; document.documentElement.lang = l;
    try { localStorage.setItem("caseapp-lang", l); } catch (e) {}
    Array.prototype.forEach.call(document.querySelectorAll(".lt button"), function(b){ b.setAttribute("aria-pressed", String(b.getAttribute("data-lang") === l)); });
    var body = l === "es" ? "Hola, vi la demo de Case Companion y quiero una para mi oficina." : "Hi, I saw the Case Companion demo and want one for my office.";
    sms.href = "sms:+14243094068?&body=" + encodeURIComponent(body);
    mail.href = "mailto:secondshiftai@gmail.com?subject=" + encodeURIComponent("Case Companion demo") + "&body=" + encodeURIComponent(body);
    stopSpeak(); renderTabs(); renderFolders();
  }
  Array.prototype.forEach.call(document.querySelectorAll(".lt button"), function(b){
    b.addEventListener("click", function(){ setLang(b.getAttribute("data-lang")); });
  });
  setLang(LANG);
})();
