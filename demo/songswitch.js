/* songswitch.js: a small two-song (or more) music switcher shared by the games.
   One <audio> per song, each through its own gain into the game's music bus, so a switch is a short crossfade.
   Nothing plays until the game calls attach()/sync() from a user tap (iOS audio unlock). The pick is saved per game.
     var MS = SongSwitch({ key: "melody-song", songs: [{ id, name, src }, ...], fade: .8, vol: .22 });   (vol = element volume if WebAudio routing fails)
     MS.attach(audioContext, musicBusGainNode)   // from the first tap; falls back to element volume if routing fails
     MS.sync(shouldPlay)                         // play the current song or pause everything
     MS.next()                                   // switch to the next song (crossfade)
     MS.button(hostEl, className, style)         // a HUD pill "🎵 <song name>" that switches on tap
   Also exposes window.GameMusic = { next, cur, songs, set } for the gamepad (B) and the pause menu. */
(function () {
  "use strict";
  var W = window;
  W.SongSwitch = function (O) {
    var songs = O.songs || [], key = O.key || "game-song", fade = O.fade || .8, i = 0, els = [], gains = [], ctx = null, bus = null, playing = false, btns = [], subs = [];
    try { var s = localStorage.getItem(key); for (var k = 0; k < songs.length; k++) if (songs[k].id === s) i = k; } catch (e) {}
    function el(n) { if (els[n]) return els[n]; var a = new Audio(); a.src = songs[n].src; a.loop = true; a.preload = n === i ? "auto" : "none"; a.setAttribute("playsinline", ""); try { a.volume = O.vol || 1; } catch (e) {} els[n] = a;
      if (ctx && bus) route(n); return a; }
    function route(n) { if (gains[n] !== undefined) return; try { var g = ctx.createGain(); g.gain.value = n === i ? 1 : 0; ctx.createMediaElementSource(els[n]).connect(g); g.connect(bus); gains[n] = g; els[n].volume = 1; } catch (e) { gains[n] = null; } }
    function level(n, v, now) { var g = gains[n]; if (g && ctx) { var t = ctx.currentTime; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); if (now) g.gain.setValueAtTime(v, t); else g.gain.linearRampToValueAtTime(v, t + fade); }
      else if (els[n]) { try { els[n].volume = v * (O.vol || 1); } catch (e) {} } }   /* not routed (old browsers): element volume */
    function play(a) { var p = a.play(); if (p && p.catch) p.catch(function () {}); }
    function label() { var nm = songs[i] ? songs[i].name : ""; btns.forEach(function (b) { b.innerHTML = '<span aria-hidden="true">🎵</span> ' + nm; b.setAttribute("aria-label", "Song: " + nm + ". Tap to switch song"); }); subs.forEach(function (f) { try { f(songs[i]); } catch (e) {} }); }
    function set(n) { n = ((n % songs.length) + songs.length) % songs.length; if (n === i) return; var old = i; i = n;
      try { localStorage.setItem(key, songs[i].id); } catch (e) {}
      var a = el(i); if (ctx && bus) route(i);
      if (playing) { try { a.currentTime = 0; } catch (e) {} level(i, 0, true); play(a); level(i, 1); level(old, 0);
        var oe = els[old]; setTimeout(function () { if (i !== old && oe) oe.pause(); }, fade * 1000 + 80); }
      else level(i, 1, true);
      label(); }
    var api = {
      attach: function (c, b) { if (ctx) return; ctx = c; bus = b; for (var n = 0; n < els.length; n++) if (els[n]) route(n); el(i); },
      sync: function (on) { playing = !!on; var a = el(i); if (on) { level(i, 1, true); play(a); } for (var n = 0; n < els.length; n++) if (els[n] && (n !== i || !on)) els[n].pause(); },
      next: function () { set(i + 1); }, set: function (id) { for (var n = 0; n < songs.length; n++) if (songs[n].id === id) set(n); },
      cur: function () { return songs[i]; }, routed: function () { return !!gains[i]; }, songs: songs, el: function () { return el(i); }, onChange: function (f) { subs.push(f); },
      button: function (host, cls, style) { if (!host) return null; var b = document.createElement("button"); b.type = "button"; b.className = cls || ""; if (style) b.setAttribute("style", style);
        b.addEventListener("click", function (e) { e.stopPropagation(); if (O.onTap) O.onTap(); api.next(); }); host.appendChild(b); btns.push(b); label(); return b; }
    };
    W.GameMusic = api;
    W.addEventListener("keydown", function (e) { if ((e.key === "m" || e.key === "M") && !e.repeat && !(e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName))) { if (O.onTap) O.onTap(); api.next(); } });
    return api;
  };
})();
