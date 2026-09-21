/* TaskRouter — words in, mission plan out.
   Picks the lead specialist by trigger vocabulary, then builds the
   delegation chain: ANTIDOTE → GOKU → specialist(s) → DENDE → done. */
"use strict";

var TRIGGERS = {
  gohan:    ["research","find out","facts","market intel","competitor","analyze","analysis","views","channel","youtube stats","why did my views"],
  trunks:   ["seo","keyword","rank","google business","local seo","backlink","marketing","campaign","promote","ads","launch","drop campaign"],
  krillin:  ["lead","leads","prospects","restaurant leads","find businesses","outreach","contact list","drop kit","client website","build for client"],
  hercule:  ["sales","pitch","close","objection","follow up","sell","shopify","store","merch","product listing","inventory"],
  goten:    ["write","copy","caption","hook","email copy","landing page copy","ad copy","social post","script for","bio","dm reply"],
  buu:      ["idea","brainstorm","viral concept","crazy","entertainment","creative concept","restaurant stack","loyalty","raffle","game idea"],
  bulma:    ["website","build a site","app","software","ui","ux","integration","architecture","llc","form a business","ein","register","business bank","funding","code"],
  android17:["automation","automate","api","scrape","scraper","trigger","schedule a","workflow between","data pipeline","sync"],
  android18:["operations","onboarding","crm","organize tasks","process","system optimization","tax intake","w-2","w2","1099","transcript","tax documents"],
  vegeta:   ["strategy","business plan","pricing","monetize","monetization","roi","growth plan","competitive strategy","tax rule","irs","deduct","write off"],
  dende:    ["review","proofread","check this","validate","quality","broken link","spiritual","meaning","life","deep talk"],
  tien:     ["budget","projection","calculate","numbers","financial model","pricing model","forecast"],
  yajirobe: ["notes","file this","schedule","cleanup","admin","organize files","supplier","wholesale","vendor","source a product","kiosk"],
  bardock:  ["trend","trending","monitor","alert","watch for","competitor watch","opportunity","gta","scout","what's hot","viral right now"],
  hit:      ["trade","trading","market today","stock","polymarket","swing","volume","futures","premarket","chart"],
  piccolo:  ["content strategy","video concept","creative direction","script the","movie","documentary","scene","screenplay","campaign structure"],
  goku:     ["coordinate","orchestrate","multiple agents","big mission","everything","whole team","plan the steps"],
  antidote: ["music","song","track","album","release","my instagram","the real antidote","premiere","trailer","brand decision","my page"]
};

/* score text against every agent's triggers; multiword phrases weigh more */
function routeCommand(text){
  var t = " " + text.toLowerCase() + " ";
  var scores = [];
  Object.keys(TRIGGERS).forEach(function(id){
    var s = 0;
    TRIGGERS[id].forEach(function(k){
      if (t.indexOf(k) !== -1) s += (k.indexOf(" ") !== -1 ? 3 : 2);
    });
    if (s > 0) scores.push({ id: id, s: s });
  });
  scores.sort(function(a, b){ return b.s - a.s; });
  return scores;
}

/* Build the mission chain. Lead specialist in the middle;
   TRUNKS joins lead-gen missions that smell like search/visibility;
   DENDE validates everything except pure conversation. */
function buildMission(text, leadId){
  var chain = ["antidote", "goku"];
  if (leadId !== "goku" && leadId !== "antidote") chain.push(leadId);
  var t = text.toLowerCase();
  if (leadId === "krillin" && (t.indexOf("google") !== -1 || t.indexOf("seo") !== -1 || t.indexOf("visib") !== -1)) chain.push("trunks");
  if (leadId !== "dende") chain.push("dende");
  return {
    text: text,
    lead: leadId,
    chain: chain,
    step: -1,
    startedAt: Date.now()
  };
}

/* '@NAME ...' forces a specific agent */
function parseForcedAgent(text, manager){
  var m = text.match(/^@([a-z0-9 ]+?)\s+(.+)$/i);
  if (!m) return null;
  var want = m[1].trim().toLowerCase().replace(/\s+/g, "");
  var hit = manager.all().find(function(a){
    return a.id === want || a.name.toLowerCase().replace(/\s+/g, "") === want;
  });
  if (!hit) return null;
  return { agent: hit, text: m[2] };
}
