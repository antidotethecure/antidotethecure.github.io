/* Activity feed + mission-control stats. Honest by design:
   simulated choreography is labeled SIM; real work happens in Claude. */
"use strict";

var Feed = {
  el: null,
  init: function(){ this.el = document.getElementById("feedlist"); },
  log: function(msg, hue){
    if (!this.el) return;
    var li = document.createElement("li");
    var d = new Date();
    var hh = d.getHours() % 12 || 12, mm = ("0" + d.getMinutes()).slice(-2);
    var ap = d.getHours() >= 12 ? "PM" : "AM";
    li.innerHTML = '<span class="ft">' + hh + ":" + mm + " " + ap + '</span> ' + msg;
    if (hue) li.style.borderLeftColor = hue;
    this.el.insertBefore(li, this.el.firstChild);
    while (this.el.children.length > 40) this.el.removeChild(this.el.lastChild);
  }
};

var Stats = {
  data: { date: "", missions: 0, routed: 0 },
  running: 0,
  init: function(){
    var today = new Date().toDateString();
    try {
      var saved = JSON.parse(localStorage.getItem("afl-stats") || "{}");
      if (saved.date === today) this.data = saved;
      else this.data = { date: today, missions: 0, routed: 0 };
    } catch(e){ this.data = { date: today, missions: 0, routed: 0 }; }
    this.render();
  },
  bump: function(key){
    this.data[key] = (this.data[key] || 0) + 1;
    try { localStorage.setItem("afl-stats", JSON.stringify(this.data)); } catch(e){}
    this.render();
  },
  setRunning: function(n){ this.running = n; this.render(); },
  render: function(){
    var active = (window.manager ? manager.all().filter(function(a){ return a.status !== "idle"; }).length : 0);
    var put = function(id, v){ var el = document.getElementById(id); if (el) el.textContent = v; };
    put("st-active", active);
    put("st-running", this.running);
    put("st-missions", this.data.missions);
    put("st-routed", this.data.routed);
    put("st-autos", "3 LIVE");
  }
};
