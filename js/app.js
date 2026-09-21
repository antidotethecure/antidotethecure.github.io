/* App bootstrap + mission simulation engine.
   The simulation choreographs the floor (statuses, trails, feed);
   the REAL work runs through the Claude buttons on each result card. */
"use strict";

var manager = new AgentManager();
window.manager = manager;
window.AFL_onStatus = function(){ Stats.render(); };

var missionQueue = [];

function runMission(mission){
  Stats.setRunning(Stats.running + 1);
  Stats.bump("routed");
  var chars = manager;
  var hue = UI.roomHue(chars.getAgent(mission.lead).room);
  var lead = chars.getAgent(mission.lead);

  Feed.log("<b>ANTIDOTE</b> assigned: " + escFeed(mission.text), "#37E0A5");
  chars.updateStatus("antidote", "delegating", mission.text);

  var steps = [];
  var chain = mission.chain;
  for (var i = 0; i < chain.length; i++){
    (function(i){
      var id = chain[i], next = chain[i + 1];
      steps.push(function(done){
        var a = chars.getAgent(id);
        if (id === "antidote"){
          setTimeout(function(){
            if (next){
              World.trail(a.room, chars.getAgent(next).room, hue);
              Feed.log("<b>ANTIDOTE</b> → routed to <b>" + chars.getAgent(next).name + "</b>", "#E8863A");
              chars.updateStatus("antidote", "idle", null);
            }
            done();
          }, 700);
          return;
        }
        if (id === "goku"){
          chars.updateStatus("goku", "thinking", "Planning: " + mission.text);
          setTimeout(function(){
            if (next){
              chars.delegateTask("goku", next, mission.text);
              World.trail("command", chars.getAgent(next).room, hue);
              Feed.log("<b>GOKU</b> routed the mission to <b>" + chars.getAgent(next).name + "</b>", "#FFC93C");
            }
            setTimeout(function(){ chars.updateStatus("goku", "idle", null); done(); }, 700);
          }, 1400);
          return;
        }
        // specialist / validator working phase
        chars.assignTask(id, mission.text);
        Feed.log("<b>" + a.name + "</b> working: " + escFeed(shortText(mission.text)), UI.roomHue(a.room));
        var pct = 0;
        var iv = setInterval(function(){
          pct = Math.min(96, pct + 9 + Math.random() * 10);
          chars.updateStatus(id, "working", mission.text, pct);
        }, 320);
        setTimeout(function(){
          clearInterval(iv);
          chars.completeTask(id);
          Feed.log("<b>" + a.name + "</b> " + (id === "dende" ? "validated the plan ✔" : "finished the prep ✔"), "#37E065");
          if (next){ World.trail(a.room, chars.getAgent(next).room, hue); }
          done();
        }, id === "dende" ? 1600 : 2600 + Math.random() * 1200);
      });
    })(i);
  }
  steps.push(function(done){
    World.trail(chars.getAgent(chain[chain.length - 1]).room, "command", "#37E065");
    Feed.log("<b>MISSION READY</b> — handed back to ANTIDOTE. Run it for real below.", "#37E065");
    chars.updateStatus("antidote", "complete", mission.text);
    setTimeout(function(){ chars.updateStatus("antidote", "idle", null); }, 4000);
    Stats.bump("missions");
    Stats.setRunning(Math.max(0, Stats.running - 1));
    UI.addResult(mission, lead);
    done();
  });

  (function next(i){ if (i < steps.length) steps[i](function(){ next(i + 1); }); })(0);
}

function handleCommand(text){
  var forced = parseForcedAgent(text, manager);
  var leadId, cleanText;
  if (forced){ leadId = forced.agent.id; cleanText = forced.text; }
  else {
    var scores = routeCommand(text);
    leadId = scores.length ? scores[0].id : "goku";
    cleanText = text;
  }
  var mission = buildMission(cleanText, leadId);
  var cmdresult = document.getElementById("cmdresult");
  cmdresult.hidden = false;
  var chainNames = mission.chain.map(function(id){ return manager.getAgent(id).name; }).join(" → ");
  cmdresult.innerHTML = '🔥 Route: <span class="picked">' + chainNames + '</span>' +
    '<div class="alts">Wrong lead? <span id="altrow"></span></div>';
  var altrow = document.getElementById("altrow");
  manager.all().forEach(function(o){
    if (o.id === leadId || o.id === "antidote" || o.id === "goku") return;
    var b = document.createElement("button");
    b.type = "button"; b.className = "alt"; b.textContent = o.name;
    b.addEventListener("click", function(){ handleCommandForced(o.id, cleanText); });
    altrow.appendChild(b);
  });
  runMission(mission);
}
function handleCommandForced(id, text){ runMission(buildMission(text, id)); }

function shortText(t){ return t.length > 60 ? t.slice(0, 57) + "…" : t; }
function escFeed(s){ return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

document.addEventListener("DOMContentLoaded", function(){
  Feed.init();
  Stats.init();
  UI.init();
  World.init(document.getElementById("stage"), manager, {
    onAgentClick: UI.openAgent,
    chargeSound: UI.chargeSound
  });
  document.getElementById("cmdform").addEventListener("submit", function(e){
    e.preventDefault();
    var text = document.getElementById("cmdinput").value.trim();
    if (!text) return;
    handleCommand(text);
  });
  Feed.log("Headquarters online. " + manager.all().length + " agents on station.", "#37E0A5");
});
