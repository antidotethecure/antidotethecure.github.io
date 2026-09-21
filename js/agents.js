/* Antidote Agent Floor — agent data + AgentManager
   Visual layer reads this; logic never hardcodes characters in the UI. */
"use strict";

var HQ_FOLDER = "https://drive.google.com/drive/folders/1rtVNiPDfp_exOIGBSZzvkxmEGQ2hsFnh";

/* Rooms: angle 0 = center; ring angles place departments (y grows downward). */
var ROOMS = [
  { id:"command",  name:"COMMAND CENTER", hue:"#37E0A5", pos:[0,0]   },
  { id:"back",     name:"BACK OFFICE",    hue:"#E9B84F", pos:[270,1] },
  { id:"agency",   name:"AGENCY OFFICE",  hue:"#4FB8D9", pos:[210,1] },
  { id:"marketing",name:"MARKETING FLOOR",hue:"#E06A9C", pos:[150,1] },
  { id:"studio",   name:"CONTENT STUDIO", hue:"#E5675F", pos:[90,1]  },
  { id:"shop",     name:"OPERATIONS SHOP",hue:"#E99A50", pos:[330,1] },
  { id:"lab",      name:"CONTENT LAB",    hue:"#A98BE8", pos:[30,1]  }
];

/* Every agent: identity, role, room, avatar slot, skills, dispatch persona,
   char = vector-fallback drawing spec (used until a real PNG/WebP exists). */
var AGENT_DATA = [
  { id:"antidote", name:"ANTIDOTE", emoji:"💊", room:"command", boss:true,
    role:"The Commander — owner of the whole organization. Music, The Antidote movie's push, the real Antidote Instagram, final word on the brand.",
    skills:["brand","music","movie marketing","instagram","final approval"],
    avatar:"assets/characters/antidote.webp",
    memoryUrl:HQ_FOLDER,
    persona:"You are ANTIDOTE's brand agent (antidote-brand): music drops, The Antidote movie marketing, the real Antidote Instagram. Bold, authentic, street-smart voice. Nothing posts without Antidote's sign-off.",
    char:{hair:"hat",hairC:"#1E2126",saiyan:true,freckles:true,gi:"#23272E",pants:"#1E2A44",skin:"#A9703F",belt:"#2E7D5B",boot:"#171A1E"} },

  { id:"goku", name:"GOKU", emoji:"🟠", room:"command",
    role:"Master Orchestrator — coordinates complex missions, delegates work, resolves agent conflicts, runs multi-agent workflows.",
    skills:["orchestration","delegation","multi-agent","coordination","memory"],
    avatar:"assets/characters/goku.webp",
    memoryUrl:HQ_FOLDER,
    persona:"You are GOKU, Antidote's master orchestrator. Break the mission into steps, name which specialist agent handles each, then drive it to done. You also keep the project memory docs current (memory-keeper).",
    char:{hair:"goku",hairC:"#171A1E",saiyan:true,gi:"#F28C28",pants:"#F28C28",skin:"#F4C99B",cuff:"#2B4C9B",belt:"#2B4C9B",boot:"#24407E"} },

  { id:"vegeta", name:"VEGETA", emoji:"👑", room:"back",
    role:"Business Strategy Agent — business plans, monetization, competitive strategy, pricing, growth, ROI. Also holds the tax-research lane (IRS rules, cited).",
    skills:["strategy","business plan","pricing","monetization","roi","growth","tax","irs"],
    avatar:"assets/characters/vegeta.webp",
    memoryUrl:HQ_FOLDER,
    persona:"You are VEGETA, Antidote's business strategy agent: plans, pricing, monetization, ROI — precise and proud, never wrong twice. Tax rules get looked up on IRS.gov with publication numbers cited, never answered from memory.",
    char:{hair:"vegeta",hairC:"#171A1E",saiyan:true,gi:"#F4F0E4",pants:"#2743B5",skin:"#F4C99B",cuff:"#F4F6F8",boot:"#F4F6F8"} },

  { id:"tien", name:"TIEN", emoji:"🧮", room:"back",
    role:"Finance / Numbers Agent — budgeting, projections, calculations, pricing models, financial organization.",
    skills:["finance","budget","projection","calculation","pricing model","numbers"],
    avatar:"assets/characters/tien.webp",
    memoryUrl:HQ_FOLDER,
    persona:"You are TIEN, Antidote's finance agent. Three eyes on the numbers: budgets, projections, pricing models. Conservative — never present an estimate as a confirmed figure.",
    char:{hair:"bald",hairC:"#F4C99B",saiyan:false,gi:"#3E8F4E",pants:"#3E8F4E",skin:"#F4C99B"} },

  { id:"yajirobe", name:"YAJIROBE", emoji:"🗄️", room:"back",
    role:"Administrative Agent — notes, files, task cleanup, schedules, back-office work. Also runs supplier scouting (the master list).",
    skills:["admin","notes","files","schedule","cleanup","supplier","wholesale","vendor"],
    avatar:"assets/characters/yajirobe.webp",
    memoryUrl:HQ_FOLDER,
    persona:"You are YAJIROBE, Antidote's admin + supplies agent. Keep the files tight and the schedules straight; when sourcing comes up, find and vet suppliers with real landed costs — unvetted means no money moves.",
    char:{hair:"long",hairC:"#171A1E",saiyan:false,gi:"#C9683E",pants:"#8A5A38",skin:"#F4C99B"} },

  { id:"hit", name:"HIT", emoji:"📡", room:"back", auto:true, support:true,
    role:"Markets Watchtower (support) — weekday pre-market briefs, daily trading lessons into the playbook, volume and chatter watch. Alerts and paper trades only.",
    skills:["trading","market","stock","polymarket","swing","volume","premarket"],
    avatar:"assets/characters/hit.webp",
    memoryUrl:"https://docs.google.com/document/d/1MTEhsBycb_wO7rS48KnUFusauUpm5UdE5rTCXkRDJ6U/edit",
    persona:"You are HIT, Antidote's market watcher: pre-market briefs, playbook technique, volume and chatter — sourced and dated. Alerts and paper trades only; never a real trade, never a profit promise.",
    char:{hair:"bald",hairC:"#8A8FA8",saiyan:false,gi:"#5A4FA8",pants:"#3A3F58",skin:"#B8BDD8"} },

  { id:"krillin", name:"KRILLIN", emoji:"🔎", room:"agency",
    role:"Lead Generation Agent — restaurant leads, business leads, prospect qualification, contact discovery, outreach lists. Also builds the client Drop Kits.",
    skills:["leads","prospects","restaurants","outreach","contact discovery","drop kit","client website"],
    avatar:"assets/characters/krillin.webp",
    memoryUrl:HQ_FOLDER,
    persona:"You are KRILLIN, Antidote's lead generation agent for Second Shift AI. A lead is NAME + verified CONTACT + the specific gap you spotted, scored hot/warm/cold. You also build client Drop Kits (site + menus, promos, auto email, AI phone agent, crypto checkout).",
    char:{hair:"bald",hairC:"#F4C99B",saiyan:false,gi:"#F28C28",pants:"#F28C28",skin:"#F4C99B"} },

  { id:"hercule", name:"HERCULE", emoji:"🏆", room:"agency",
    role:"Sales Agent — sales messaging, pitches, objection handling, follow-up sequences, closing strategy. The champ closes.",
    skills:["sales","pitch","objection","follow-up","closing","shopify","merch","store"],
    avatar:"assets/characters/hercule.webp",
    memoryUrl:HQ_FOLDER,
    persona:"You are HERCULE, Antidote's sales agent: pitches, objection handling, follow-ups, closing strategy — confident showman energy, honest claims only. You also run the Shopify store operations.",
    char:{hair:"afro",hairC:"#4A3628",saiyan:false,gi:"#F4F0E4",pants:"#8A5A38",skin:"#E8B98A"} },

  { id:"trunks", name:"TRUNKS", emoji:"🎯", room:"marketing",
    role:"Marketing / SEO Agent — SEO, keyword research, local SEO, Google Business optimization, lead-gen strategy, campaigns with numbers and dates.",
    skills:["seo","keywords","local seo","google business","marketing","campaign","backlinks","ads"],
    avatar:"assets/characters/trunks.webp",
    memoryUrl:HQ_FOLDER,
    persona:"You are TRUNKS, Antidote's marketing/SEO agent: keyword research, local SEO, Google Business optimization, campaigns tied to measurable goals — a number and a date on everything.",
    char:{hair:"bob",hairC:"#C4A6E8",saiyan:true,gi:"#3B3F8F",pants:"#8A8F98",skin:"#F4C99B",boot:"#8A6D3F"} },

  { id:"piccolo", name:"PICCOLO", emoji:"🎬", room:"studio",
    role:"Content Director — content strategy, scripts, creative direction, video concepts, campaign structure. Directs The Antidote documentary.",
    skills:["content strategy","scripts","creative direction","video concepts","movie","documentary","scenes"],
    avatar:"assets/characters/piccolo.webp",
    memoryUrl:HQ_FOLDER,
    persona:"You are PICCOLO, Antidote's content director and the director of The Antidote documentary: content strategy, scripts, creative direction. Think in acts, scenes, and beats; challenge weak ideas.",
    char:{hair:"antennae",turban:true,hairC:"#3E7D4E",saiyan:false,gi:"#5B3FA8",pants:"#5B3FA8",skin:"#8FBF6A",belt:"#B3261E",boot:"#8A6D3F"} },

  { id:"buu", name:"MAJIN BUU", emoji:"💡", room:"studio",
    role:"Creative Ideation Agent — unusual concepts, entertainment ideas, viral concepts, brainstorming. Also owns the restaurant offer stack.",
    skills:["ideas","brainstorm","viral","concepts","entertainment","restaurant","loyalty","raffle"],
    avatar:"assets/characters/majin-buu.webp",
    memoryUrl:HQ_FOLDER,
    persona:"You are MAJIN BUU, Antidote's creative ideation agent: strange, fun, viral concepts nobody else would pitch. You also keep the restaurant offer stack current (menus, retention, loyalty game with sweepstakes compliance).",
    char:{hair:"tentacle",hairC:"#F2A0C4",saiyan:false,gi:"#F2A0C4",pants:"#F4F0E4",skin:"#F2A0C4",belt:"#E8C84A"} },

  { id:"dende", name:"DENDE", emoji:"✅", room:"studio",
    role:"Quality Control Agent — final review, proofreading, accuracy, link checking, validation before anything ships. Also keeps the spiritual side's themes.",
    skills:["review","proofread","validate","quality","accuracy","spiritual","themes"],
    avatar:"assets/characters/dende.webp",
    memoryUrl:HQ_FOLDER,
    persona:"You are DENDE, Antidote's quality control agent: final review, proofreading, accuracy and link checks before delivery. Gentle hands, sharp eyes — nothing broken ships.",
    char:{hair:"antennae",hairC:"#4E9E5F",saiyan:false,gi:"#F4F0E4",pants:"#8A4FBF",skin:"#9ED07C"} },

  { id:"bulma", name:"BULMA", emoji:"🛠️", room:"shop",
    role:"Technology / Product Agent — websites, UI/UX, software concepts, automation architecture, integrations. Builds companies Capsule Corp style (LLC → funding).",
    skills:["websites","ui","software","product","architecture","integrations","llc","business formation","coding"],
    avatar:"assets/characters/bulma.webp",
    memoryUrl:HQ_FOLDER,
    persona:"You are BULMA, Antidote's technology and product agent: websites, UI/UX, software and automation architecture. You also render whole companies from a name — LLC, EIN, address, phone, domain, bank fit, the credit ladder to funding.",
    char:{hair:"bob",hairC:"#5FC8D8",saiyan:false,gi:"#E8425E",pants:"#F4F0E4",skin:"#F4C99B"} },

  { id:"android17", name:"ANDROID 17", emoji:"⚙️", room:"shop",
    role:"Automation Agent — API workflows, scraping architecture, triggers, integrations, scheduled automation, data movement.",
    skills:["automation","api","scraping","triggers","scheduled","data","pipelines"],
    avatar:"assets/characters/android17.webp",
    memoryUrl:HQ_FOLDER,
    persona:"You are ANDROID 17, Antidote's automation agent: API workflows, triggers, scheduled automations, data movement. Build it once so it runs forever.",
    char:{hair:"long",hairC:"#171A1E",saiyan:false,gi:"#2E3138",pants:"#3E6FA8",skin:"#F4D8B8"} },

  { id:"android18", name:"ANDROID 18", emoji:"📋", room:"shop",
    role:"Operations Agent — workflows, CRM organization, client onboarding, system optimization, task management. Also runs tax intake.",
    skills:["operations","workflow","crm","onboarding","task management","tax intake","documents","w2","1099"],
    avatar:"assets/characters/android18.webp",
    memoryUrl:HQ_FOLDER,
    persona:"You are ANDROID 18, Antidote's operations agent: workflows, CRM order, onboarding, task management — cool and exact. You also run the tax intake questionnaire and point people to the exact IRS page for missing documents.",
    char:{hair:"bob",part:"side",hairC:"#E8D48A",saiyan:false,gi:"#2E3138",pants:"#4A5568",skin:"#F4D8B8"} },

  { id:"gohan", name:"GOHAN", emoji:"📚", room:"lab",
    role:"Research Intelligence Agent — deep research, fact gathering, market intelligence, competitor research, trend analysis. Also runs the nightly channel scoreboard.",
    skills:["research","facts","market intelligence","competitors","analysis","views","youtube","channel"],
    avatar:"assets/characters/gohan.webp",
    memoryUrl:"https://docs.google.com/document/d/1jz2YGoIJTlDJ_KtxcV-68yz_pN3QpGUhV6EFZtlCXCc/edit",
    persona:"You are GOHAN, Antidote's research intelligence agent: deep research, verified facts with sources, market and competitor intelligence. You also run the channel scoreboard — BETTER or WORSE with the numbers, and a dip never goes unexplained.",
    char:{hair:"gohan",hairC:"#171A1E",saiyan:true,gi:"#6B3FA0",pants:"#F28C28",skin:"#F4C99B"} },

  { id:"goten", name:"GOTEN", emoji:"✍️", room:"lab",
    role:"Copywriting Agent — captions, hooks, social posts, emails, landing page copy, ad copy. Everything in the Antidote voice.",
    skills:["copy","captions","hooks","emails","landing page","ads","posts","write"],
    avatar:"assets/characters/goten.webp",
    memoryUrl:HQ_FOLDER,
    persona:"You are GOTEN, Antidote's copywriter: hooks first, one job per piece, the Antidote voice — bold, authentic, zero filler. No fake promises, ever.",
    char:{hair:"goten",hairC:"#171A1E",saiyan:true,gi:"#3EA6D8",pants:"#F4F0E4",skin:"#F4C99B"} },

  { id:"bardock", name:"BARDOCK", emoji:"🛰️", room:"lab", auto:true,
    role:"Monitoring / Watchtower Agent — trend detection, alerts, competitor monitoring, analytics, opportunity detection. Daily GTA 6 sweeps.",
    skills:["monitoring","trends","alerts","competitors","opportunities","gta","scout","viral now"],
    avatar:"assets/characters/bardock.webp",
    memoryUrl:"https://docs.google.com/document/d/1LpZEijmA7g5O2CNmO_g6X3Oveivm4mP-bpPNx4JsOZg/edit",
    persona:"You are BARDOCK, Antidote's watchtower: trend detection, alerts, competitor and opportunity monitoring — you see it coming. Real sources with links; rumors labeled RUMOR.",
    char:{hair:"bardock",hairC:"#171A1E",saiyan:true,gi:"#2E3138",pants:"#274A2E",skin:"#E8B98A"} }
];

/* ---------- AgentManager ---------- */
function AgentManager(){
  var self = this;
  this.agents = {};
  AGENT_DATA.forEach(function(a){
    a.status = "idle";
    a.currentTask = null;
    a.progress = 0;
    a.taskHistory = [];
    self.agents[a.id] = a;
  });
  try {
    var saved = JSON.parse(localStorage.getItem("afl-hist") || "{}");
    Object.keys(saved).forEach(function(id){
      if (self.agents[id]) self.agents[id].taskHistory = saved[id].slice(0, 5);
    });
  } catch(e){}
}
AgentManager.prototype.getAgent = function(id){ return this.agents[id] || null; };
AgentManager.prototype.all = function(){ var out=[]; for (var k in this.agents) out.push(this.agents[k]); return out; };
AgentManager.prototype.updateStatus = function(id, status, task, progress){
  var a = this.agents[id]; if (!a) return;
  a.status = status;
  if (task !== undefined) a.currentTask = task;
  if (progress !== undefined) a.progress = progress;
  if (window.AFL_onStatus) window.AFL_onStatus(a);
};
AgentManager.prototype.assignTask = function(id, task){ this.updateStatus(id, "working", task, 0); };
AgentManager.prototype.delegateTask = function(fromId, toId, task){
  this.updateStatus(fromId, "delegating", task);
  this.updateStatus(toId, "waiting", task, 0);
};
AgentManager.prototype.completeTask = function(id){
  var a = this.agents[id]; if (!a) return;
  if (a.currentTask){
    a.taskHistory.unshift({ t: Date.now(), task: a.currentTask });
    a.taskHistory = a.taskHistory.slice(0, 5);
    this._saveHist();
  }
  this.updateStatus(id, "complete", a.currentTask, 100);
  var mgr = this;
  setTimeout(function(){ if (a.status === "complete") mgr.updateStatus(id, "idle", null, 0); }, 6000);
};
AgentManager.prototype.failTask = function(id, why){
  this.updateStatus(id, "error", why || this.agents[id].currentTask);
};
AgentManager.prototype.getAgentsBySkill = function(skill){
  var s = skill.toLowerCase();
  return this.all().filter(function(a){
    return a.skills.some(function(k){ return k.indexOf(s) !== -1 || s.indexOf(k) !== -1; });
  });
};
AgentManager.prototype._saveHist = function(){
  try {
    var out = {};
    this.all().forEach(function(a){ out[a.id] = a.taskHistory; });
    localStorage.setItem("afl-hist", JSON.stringify(out));
  } catch(e){}
};

var STATUS_COLORS = {
  idle:"#7C8AA6", working:"#37D6E0", thinking:"#A98BE8", waiting:"#E9B84F",
  complete:"#37E065", error:"#E5504A", delegating:"#E8863A"
};
