/* UI layer: inspector panel, results, command board, voice, sound, Claude hooks. */
"use strict";

var UI = (function(){
  var backdrop, panel, cmdinput, cmdresult, openedAgent = null;
  var samplePromise = (window.claude && window.claude.use) ? window.claude.use("sample") : Promise.resolve(null);

  /* ---- charge-up sound (synthesized) ---- */
  var actx = null, soundOn = false, lastCharge = 0;
  function chargeSound(){
    if (!soundOn || !actx) return;
    var now = performance.now();
    if (now - lastCharge < 1800) return;
    lastCharge = now;
    var t0 = actx.currentTime;
    var o = actx.createOscillator(), g = actx.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(70, t0);
    o.frequency.exponentialRampToValueAtTime(340, t0 + 0.9);
    var lfo = actx.createOscillator(), lg = actx.createGain();
    lfo.frequency.value = 26; lg.gain.value = 16;
    lfo.connect(lg); lg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.1, t0 + 0.18);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.15);
    o.connect(g); g.connect(actx.destination);
    o.start(t0); o.stop(t0 + 1.2); lfo.start(t0); lfo.stop(t0 + 1.2);
  }

  function init(){
    backdrop = document.getElementById("backdrop");
    panel = document.getElementById("panel");
    cmdinput = document.getElementById("cmdinput");
    cmdresult = document.getElementById("cmdresult");

    backdrop.addEventListener("click", function(e){ if (e.target === backdrop) closePanel(); });
    document.addEventListener("keydown", function(e){ if (e.key === "Escape") closePanel(); });

    var soundbtn = document.getElementById("soundbtn");
    soundbtn.addEventListener("click", function(){
      soundOn = !soundOn;
      soundbtn.textContent = soundOn ? "🔊" : "🔇";
      if (soundOn){
        try {
          if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
          if (actx.state === "suspended") actx.resume();
          lastCharge = 0; chargeSound();
        } catch(e){ soundOn = false; soundbtn.textContent = "🔇"; }
      }
    });

    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    var micbtn = document.getElementById("micbtn");
    var micstatus = document.getElementById("micstatus");
    function micSay(msg){ if (micstatus){ micstatus.hidden = false; micstatus.textContent = msg; } }
    if (SR){
      micbtn.hidden = false;
      var listening = false;
      micbtn.addEventListener("click", function(){
        if (listening) return;
        try {
          var rec = new SR();
          rec.lang = "en-US"; rec.interimResults = false; rec.maxAlternatives = 1;
          listening = true; micbtn.textContent = "👂";
          micSay("Listening… say your command.");
          rec.onresult = function(e){
            cmdinput.value = e.results[0][0].transcript;
            listening = false; micbtn.textContent = "🎤";
            if (micstatus) micstatus.hidden = true;
            document.getElementById("cmdform").requestSubmit();
          };
          rec.onerror = function(ev){
            listening = false; micbtn.textContent = "🎤";
            var why = ev && ev.error;
            if (why === "not-allowed" || why === "service-not-allowed"){
              micSay("Mic is blocked inside this viewer. It works on the website version (agents.html in Chrome/Safari, allow the mic when asked) — here, type your command instead.");
            } else if (why === "no-speech"){
              micSay("Didn't catch anything — tap 🎤 and try again.");
            } else {
              micSay("Mic unavailable here (" + (why || "error") + ") — type your command instead.");
            }
          };
          rec.onend = function(){ listening = false; if (micbtn.textContent === "👂") micbtn.textContent = "🎤"; };
          rec.start();
        } catch(e){
          listening = false; micbtn.textContent = "🎤";
          micSay("Mic unavailable here — type your command instead.");
        }
      });
    } else {
      micbtn.hidden = false;
      micbtn.addEventListener("click", function(){
        micSay("This browser doesn't support voice input — it works in Chrome and Safari on the website version. Type your command instead.");
      });
    }

    // roster chips
    var roster = document.getElementById("roster");
    manager.all().forEach(function(a){
      var b = document.createElement("button");
      b.className = "chip";
      b.style.setProperty("--chue", roomHue(a.room));
      b.textContent = a.emoji + " " + a.name + (a.auto ? " ⏰" : "");
      b.setAttribute("aria-label", "Open " + a.name + ", " + a.role.split("—")[0]);
      b.addEventListener("click", function(){ openAgent(a); });
      roster.appendChild(b);
    });
  }

  function roomHue(roomId){
    var r = ROOMS.find(function(x){ return x.id === roomId; });
    return r ? r.hue : "#37E0A5";
  }
  function roomName(roomId){
    var r = ROOMS.find(function(x){ return x.id === roomId; });
    return r ? r.name : roomId;
  }

  /* ---- RPG dialogue portrait: the little face square ---- */
  function portraitHTML(a, size){
    size = size || 56;
    if (a.face){
      return '<span class="dlgport" style="width:' + size + 'px;height:' + size + 'px">' +
        '<img src="' + a.face + '" alt="" style="width:100%;height:100%;object-fit:cover"></span>';
    }
    if (a.img){
      // sprite head: show the top of the sprite, pixel-crisp
      return '<span class="dlgport" style="width:' + size + 'px;height:' + size + 'px">' +
        '<img src="' + a.avatar + '" alt="" style="width:100%;image-rendering:pixelated;display:block;margin-top:-2px"></span>';
    }
    return '<span class="dlgport emo" style="width:' + size + 'px;height:' + size + 'px;font-size:' + Math.round(size * 0.52) + 'px">' + a.emoji + '</span>';
  }

  /* ---- next real scheduled window (shown so the stillness reads as honest) ---- */
  function nextWindowText(a){
    if (!a.sched || !a.sched.length) return "";
    var now = new Date(), best = null, bestLabel = "";
    a.sched.forEach(function(s){
      for (var dOff = 0; dOff < 8; dOff++){
        var t = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + dOff, s.h, s.m));
        if (t <= now) continue;
        if (s.days && s.days.indexOf(t.getUTCDay()) < 0) continue;
        if (!best || t < best){ best = t; bestLabel = s.label; }
        break;
      }
    });
    if (!best) return "";
    var when = best.toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" });
    return '<h3>⏰ Next scheduled run</h3><p>' + esc(bestLabel) + ' — ' + when +
      ' (your time). This fighter only moves when the window is actually live or you dispatch a mission.</p>';
  }

  /* ---- inspector ---- */
  function openAgent(a){
    openedAgent = a; a.panelOpen = true;
    panel.style.setProperty("--phue", roomHue(a.room));
    var hist = (a.taskHistory || []).map(function(h){
      return "<li>" + new Date(h.t).toLocaleString() + " — " + esc(h.task) + "</li>";
    }).join("") || "<li>No missions logged yet.</li>";
    var prog = a.status === "working" || a.status === "thinking"
      ? '<div class="prog"><div class="progbar" style="width:' + (a.progress || 8) + '%"></div></div>' : "";
    panel.innerHTML =
      '<h2>' + portraitHTML(a, 48) + a.name +
      ' <small>' + a.id + (a.auto ? " · ⏰ auto-runs on schedule" : "") + '</small></h2>' +
      '<p class="where">' + roomName(a.room) + ' · <span class="stx" style="color:' + (STATUS_COLORS[a.status] || "#7C8AA6") + '">' + a.status.toUpperCase() + '</span></p>' +
      '<p>' + esc(a.role) + '</p>' +
      nextWindowText(a) +
      (a.currentTask ? '<h3>Current task</h3><p>' + esc(a.currentTask) + '</p>' + prog : "") +
      '<h3>Skills</h3><p class="skills">' + a.skills.map(function(s){ return '<span>' + esc(s) + '</span>'; }).join("") + '</p>' +
      '<h3>Recent activity</h3><ul class="hist">' + hist + '</ul>' +
      '<div class="btnrow">' +
      '<button class="btn primary" id="btn-assign">Assign task</button>' +
      '<button class="btn" id="btn-msg">Message agent</button>' +
      '<a class="btn" target="_blank" rel="noopener" href="' + a.memoryUrl + '">View memory</a>' +
      '<a class="btn" target="_blank" rel="noopener" href="https://claude.ai/new?q=' +
        encodeURIComponent(a.persona + " TASK: [describe it]") + '">Full session →</a>' +
      '<button class="btn" id="btn-close">Close</button></div>' +
      '<div id="agentreply" hidden></div>';
    backdrop.classList.add("open");
    document.getElementById("btn-close").addEventListener("click", closePanel);
    document.getElementById("btn-assign").addEventListener("click", function(){
      closePanel();
      cmdinput.value = "@" + a.name.replace(/\s+/g, "") + " ";
      cmdinput.focus();
    });
    document.getElementById("btn-msg").addEventListener("click", function(){
      var q = prompt("Message for " + a.name + ":");
      if (q) askAgent(a, q, document.getElementById("agentreply"));
    });
  }
  function closePanel(){
    backdrop.classList.remove("open");
    if (openedAgent){ openedAgent.panelOpen = false; openedAgent = null; }
  }

  /* ---- in-page Claude answer (sample capability, claude.ai artifact only) ---- */
  function askAgent(a, text, mount){
    mount = mount || document.getElementById("cmdreply");
    mount.hidden = false;
    mount.innerHTML =
      '<div class="dlg">' + portraitHTML(a, 60) +
      '<div class="dlgbody"><b>' + a.name + '</b><div class="replytext">…powering up…</div></div></div>';
    a.powerUntil = performance.now() + 25000;
    samplePromise.then(function(s){
      var el = mount.querySelector(".replytext");
      if (!el) return;
      if (!s){
        el.textContent = "In-page answers run on the claude.ai version of this board. Here, use the full-session button instead.";
        return;
      }
      var promptText = a.persona +
        " Answer Antidote's request below — in character but genuinely useful, specific, concise (under 250 words). " +
        "You have no live tools in this quick reply: if it needs real data or builds, give your best take then say to open the full session. Never invent numbers. REQUEST: " + text;
      s(promptText, { onText: function(ev){ if (el) el.textContent = ev.text; } })
        .then(function(res){ if (el) el.textContent = res.text; })
        .catch(function(err){
          if (el) el.textContent = (err && err.text) ? err.text + "\n\n[cut off — open the full session to finish]"
            : "Couldn't answer here (" + ((err && err.code) || "error") + "). Use the full-session button.";
        });
    });
  }

  /* ---- mission result card ---- */
  function addResult(mission, leadAgent){
    var box = document.getElementById("results");
    var card = document.createElement("div");
    card.className = "rescard";
    var full = leadAgent.persona + " TASK: " + mission.text;
    card.innerHTML =
      '<div class="reshead">🔥 <b>' + leadAgent.name + '</b> has the mission <span class="simtag">route simulated — run it for real:</span></div>' +
      '<div class="restext">' + esc(mission.text) + '</div>' +
      '<div class="btnrow">' +
      '<button class="btn primary resask">⚡ Answer right here</button>' +
      '<a class="btn" target="_blank" rel="noopener" href="https://claude.ai/new?q=' + encodeURIComponent(full) + '">Open full session →</a></div>' +
      '<div class="cardreply" hidden></div>';
    box.insertBefore(card, box.firstChild);
    card.querySelector(".resask").addEventListener("click", function(){
      askAgent(leadAgent, mission.text, card.querySelector(".cardreply"));
    });
    while (box.children.length > 6) box.removeChild(box.lastChild);
  }

  function esc(s){
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  return { init: init, openAgent: openAgent, askAgent: askAgent, addResult: addResult,
           chargeSound: chargeSound, roomHue: roomHue };
})();
