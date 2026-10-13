/* Melody Approach: GAME-OVER SCORE SHEET + THE BILLBOARD (2026-10-13, owner request).
   "People keep accidentally tapping the screen and it deletes their last score." So when a flight ends:
     1. A sheet covers the screen. For ~1.2 s nothing on it can be tapped (a stray tap can't skip it), and taps on the game
        canvas never restart the game while it is open (index.html asks MelBoard.blocking() before replay()).
     2. First: the final score + "Add your name to the billboard" (optional): name, optional @instagram, Post my score / Skip.
     3. Only after Post or Skip does "Re-fly ✈️" light up.
   The score is never lost: the last unposted flight is kept in localStorage ("melody-unposted") and the start screen offers
   "You have an unposted score: 12,340 · Post it" after a reload. A record only posts once (ids in "melody-bb-sent").

   WHO GOES WHERE (the owner's rewards rule: the weekly PRIZE board needs a member, because winners are contacted):
     · Member on this phone (crm.js SSAI_GAMEPTS.member())  → posts straight to the weekly board (the existing score service,
       boards "melody" = Campaign score, "melody-survival" = Survival seconds) and shows on the billboard.
     · Not a member → the name goes on this phone's billboard (shown with a 📱 "this phone" tag next to the weekly rows) and
       the sheet offers "Join free to enter the weekly prize board": the existing crm.js join gate (SSAI_GATE "score"), then
       the same post. Points/one-prize-a-day rules are untouched (they live in crm.js / the server).
   Billboard text is name + optional @handle only (3-16 chars, HTML stripped, small profanity filter, no emails/phone numbers).
   The billboard scene (Melody's building at night with the bouncer + the line out front, ported from the in-game lot drawing,
   next to a lit roadside billboard: Campaign / Survival tabs, NEW glow) shows on this sheet and on the start screen
   (index.html showcase). Posting a name plays a ~2.4 s fly-by: the game's plane tows a banner with the name + score past the
   billboard and the new row flips on as it passes; Re-fly unlocks after it lands. Config comes from index.html: window.MELODY_BB. */
(function () {
  "use strict";
  if (window.MelBoard) return;
  var D = document, W = window;
  var PEND = "melody-unposted", LOC = "melody-billboard-local", NAMEK = "melody-board", SENT = "melody-bb-sent";
  var LOCK_MS = 1200;
  function C() { return W.MELODY_BB || {}; }
  function T(s) { return (W.__T || String)(s); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function num(n) { return Number(n || 0).toLocaleString("en-US"); }
  function mmss(s) { s = Math.max(0, Math.floor(+s || 0)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }
  function fmt(v, tab) { return tab === "s" ? mmss(v) : num(v); }
  function get(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? d : v; } catch (e) { return d; } }
  function put(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function wk() { var f = C().wkey; if (f) return f(); var d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function member() { try { var g = W.SSAI_GAMEPTS; return g && g.member ? g.member() : null; } catch (e) { return null; } }
  function tabOf(rec) { return rec && rec.mode === "survival" ? "s" : "c"; }
  function val(rec) { return rec.mode === "survival" ? rec.secs : rec.score; }

  /* ---------- names: 3-16 chars, no HTML, no contact info, small profanity list ---------- */
  var BAD = ["fuck", "fuk", "shit", "bitch", "cunt", "nigg", "nigga", "fag", "dick", "pussy", "whore", "slut", "rape", "nazi", "hitler", "cock", "asshole", "retard", "porn", "penis", "vagina", "kkk", "twat", "wank", "spic", "chink", "kike", "tranny", "jizz", "cum"];
  function squash(s) { return String(s).toLowerCase().replace(/[0@4$5317!|]/g, function (c) { return { "0": "o", "@": "a", "4": "a", "$": "s", "5": "s", "3": "e", "1": "i", "7": "t", "!": "i", "|": "i" }[c]; }).replace(/[^a-z]/g, ""); }
  function rude(s) { var q = squash(s); return BAD.some(function (b) { return b === "cum" ? /(^|[^a-z])cum([^a-z]|$)/.test(String(s).toLowerCase()) : q.indexOf(b) >= 0; }); }
  function cleanName(raw) {
    var s = String(raw || "").replace(/<[^>]*>?/g, "").replace(/[^\w .'\-]/g, "").replace(/\s+/g, " ").trim().slice(0, 16).trim();
    if (s.length < 3) return { err: T("Use 3 to 16 letters or numbers.") };
    if (/\d{5,}/.test(s.replace(/[ .\-]/g, ""))) return { err: T("No phone numbers on the billboard: just a first name or nickname.") };
    if (rude(s) || rude(String(raw))) return { err: T("Pick a different name.") };
    return { v: s };
  }
  function cleanIg(raw) {
    var s = String(raw || "").replace(/<[^>]*>?/g, "").trim().replace(/^@+/, "").replace(/[^A-Za-z0-9._]/g, "").slice(0, 30);
    if (!s) return { v: "" };
    if (rude(s) || rude(String(raw))) return { err: T("Pick a different Instagram handle.") };
    return { v: s };
  }

  /* ---------- board data: weekly rows (score service) + this phone's billboard entries ---------- */
  var rows = { c: null, s: null }, loading = { c: 0, s: 0 }, lastNew = null, pasteId = null, animUntil = 0, animT = 0;   // lastNew = id of the entry to glow
  function fetchTab(tab, cb) {
    var c = C(); if (!c.api) { rows[tab] = []; if (cb) cb(); return; }
    if (loading[tab]) return; loading[tab] = 1;
    fetch(c.api + "?game=" + (tab === "s" ? c.gameS : c.game) + "&week=" + wk()).then(function (r) { return r.json(); }).then(function (j) {
      rows[tab] = Array.isArray(j) ? j : []; loading[tab] = 0; paintAll(); if (cb) cb();
    }).catch(function () { loading[tab] = 0; if (!rows[tab]) rows[tab] = []; paintAll(); if (cb) cb(); });
  }
  function refresh(cb) { var n = 2, d = function () { if (--n === 0 && cb) cb(); }; fetchTab("c", d); fetchTab("s", d); }
  function locals(tab) { var w = wk(); return get(LOC, []).filter(function (e) { return e.week === w && e.tab === tab; }); }
  function merged(tab) {
    var out = (rows[tab] || []).map(function (r) { return { n: r.name, ig: r.ig || "", v: +r.score || 0, wkly: 1 }; });
    locals(tab).forEach(function (e) {
      var hit = null; out.forEach(function (o) { if (!hit && o.wkly && o.n === e.n && o.v === e.v) hit = o; });
      if (hit) hit.id = e.id; else out.push({ n: e.n, ig: e.ig || "", v: e.v, id: e.id, phone: !e.sent });
    });
    out.sort(function (a, b) { return b.v - a.v; });
    out.forEach(function (o, i) { o.rank = i + 1; });
    return out;
  }

  /* ---------- Melody's lot at night: the bouncer + the line out front ----------
     PORTED, not new art: the figures, the fixed-seed line, the velvet rope, the string lights and the lit windows are the
     in-game LOT drawing from PR #278 ("Melody lot: bouncer + line", branch melody-fire-traffic, index.html var LOT), same code
     and same sprite coordinates (melody.webp drawn 250 px wide, sprite top-left = 0,0). Drawn once into an image. */
  var LOTART = null, lotWait = [];
  function lotArt(cb) {
    if (LOTART !== null) { cb(LOTART); return; }
    lotWait.push(cb); if (lotWait.length > 1) return;
    var im = new Image();
    im.onload = function () { try { LOTART = drawLot(im); } catch (e) { LOTART = ""; try { console.warn("[billboard] lot art:", e && e.message); } catch (x) {} } var w = lotWait; lotWait = []; w.forEach(function (f) { f(LOTART); }); };
    im.onerror = function () { LOTART = ""; var w = lotWait; lotWait = []; w.forEach(function (f) { f(""); }); };
    im.src = "img/game/melody.webp";
  }
  function drawLot(im) {
    var BULBS=[], PEOPLE=[];
    for(var i=0;i<=22;i++){ var t=i/22; BULBS.push([38+t*206, 150+12*Math.sin(Math.PI*t)+(t>.5?(t-.5)*8:0), ["#ffd27a","#ff6f91","#7fe0ff","#ffe066"][i%4]]); }
    function walk(x){ return 219-.155*(x-130); }   // the sidewalk between the patio rail and the curb, in sprite px (it runs uphill to the right)
    (function(){ var seed=11; function r(){ seed=(seed*16807)%2147483647; return seed/2147483647; }   // fixed seed: the same line every run
      function pick(a){ return a[(r()*a.length)|0]; }
      var SKIN=["#3e271b","#5a3a26","#7a4f33","#9c6a45","#c48c63","#e0b08a","#f1c9a5"], HAIR=["#120d0b","#120d0b","#2a1a12","#5a3a22","#c99a5b","#7a2a1a"],
        DARK=["#14161c","#1e2230","#2b2f3a","#3a2a22"], DEN=["#2c4a78","#3b5f94","#1f2d4a"], POP=["#e0527a","#c8203e","#f2c230","#e9ecf1","#8e5ad8","#22c3c3","#f07a3a","#ffffff","#d9b48a","#3fbf8f"];
      var LOOK=[   // who's in line: [build, hair, top, bottom, pose]
        ["f","long","dress","dress","phone"],["m","fade","jacket","jeans","pocket"],["f","bun","top","skirt","drink"],["m","cap","tee","jeans","side"],
        ["f","afro","dress","dress","hip"],["m","braids","jacket","pants","phone"],["f","pony","top","jeans","side"],["f","long","jacket","skirt","phone"],
        ["m","fade","tee","pants","drink"],["f","long","dress","dress","side"],["m","cap","jacket","jeans","phone"],["f","afro","top","skirt","hip"],["m","fade","tee","jeans","pocket"]];
      var x=118; LOOK.forEach(function(L,i){ var f=L[0]==="f", top=L[2]==="jacket"?pick(DARK):pick(POP), bot=L[3]==="jeans"?pick(DEN):L[3]==="pants"?pick(DARK):top;
        if(L[3]==="skirt") bot=pick(["#14161c","#e9ecf1","#c8203e","#d9b48a"]);
        PEOPLE.push({x:x, y:walk(x)+(r()-.5)*3, h:(f?24:26.5)+r()*2.5, d:(i===3||i===9)?1:-1, f:f, skin:pick(SKIN), hair:L[1], hc:L[1]==="long"||L[1]==="pony"?pick(HAIR):"#120d0b",
          top:L[2], tc:top, under:pick(POP), bot:L[3], bc:bot, shoe:pick(["#0d0d10","#0d0d10","#f2f2f2","#7a1020"]), pose:L[4], stride:(r()-.3)*5, bag:f&&r()<.5?pick(["#0d0d10","#c8203e","#d9b48a"]):0});
        x+=8.6+r()*2.6+(i===3||i===9?-2:0); }); })();
    /* ---- the people: drawn like little figures under the club lights, not icons. Local units: feet at 0,0, 100 = their height, facing +x;
       d flips them to face the door. Light comes from the doorway (screen left), so the lit side is -d in local x. ---- */
    function shade(c,f){ var n=parseInt(c.slice(1),16), R=n>>16, Gn=n>>8&255, B=n&255, t=f<0?0:255, a=Math.abs(f);
      return "rgb("+Math.round(R+(t-R)*a)+","+Math.round(Gn+(t-Gn)*a)+","+Math.round(B+(t-B)*a)+")"; }
    function sg(x,c,d,w){ w=w||12; var g=x.createLinearGradient(-d*w,0,d*w,0); g.addColorStop(0,shade(c,.28)); g.addColorStop(.5,c); g.addColorStop(1,shade(c,-.5)); return g; }
    function ell(x,a,b,rx,ry){ x.beginPath(); x.ellipse(a,b,rx,ry,0,0,6.283); }
    function limb(x,c,w,pts){ x.strokeStyle=c; x.lineWidth=w; x.lineCap="round"; x.lineJoin="round"; x.beginPath(); x.moveTo(pts[0],pts[1]); for(var i=2;i<pts.length;i+=2) x.lineTo(pts[i],pts[i+1]); x.stroke(); }
    function shadow(x,w){ var g=x.createRadialGradient(4,0,0,4,0,w); g.addColorStop(0,"rgba(0,0,0,.42)"); g.addColorStop(1,"rgba(0,0,0,0)"); x.fillStyle=g; x.save(); x.scale(1,.28); x.beginPath(); x.arc(4,0,w,0,6.283); x.fill(); x.restore(); }
    function head(x,P,d,cx0,cy0,rx,ry){ var sk=P.skin;
      if(P.hair==="afro"){ x.fillStyle=sg(x,P.hc,d,8); ell(x,cx0-1.5,cy0-2,rx+3.6,ry+2.6); x.fill(); }
      if(P.hair==="long"){ x.fillStyle=sg(x,P.hc,d,8); x.beginPath(); x.moveTo(cx0+3,cy0-ry-.5); x.quadraticCurveTo(cx0-rx-3,cy0-ry,cx0-rx-2.4,cy0+2); x.lineTo(cx0-rx-2.8,cy0+19); x.quadraticCurveTo(cx0-2,cy0+21,cx0+.5,cy0+9); x.closePath(); x.fill(); }
      if(P.hair==="braids") for(var b=0;b<4;b++) limb(x,shade(P.hc,b%2?.12:0),1.3,[cx0-2-b*1.1,cy0-3,cx0-3.5-b*1.3,cy0+10+b,cx0-4-b*1.2,cy0+17]);
      if(P.hair==="pony") limb(x,P.hc,3.2,[cx0-rx+1,cy0-4,cx0-rx-3.5,cy0+1,cx0-rx-3,cy0+9]);
      x.fillStyle=sk; x.fillRect(cx0-2.8,cy0+ry-2,5.2,6);                                                       // neck
      x.fillStyle=sg(x,sk,d,7); ell(x,cx0,cy0,rx,ry); x.fill();                                                   // head
      x.beginPath(); x.moveTo(cx0+rx-.6,cy0-1); x.lineTo(cx0+rx+1.6,cy0+2.2); x.lineTo(cx0+rx-.4,cy0+3); x.fill();   // nose
      x.fillStyle=shade(sk,-.3); ell(x,cx0-1.2,cy0+.5,1.2,1.7); x.fill();                                         // ear
      x.fillStyle="rgba(20,10,8,.85)"; x.fillRect(cx0+rx-2.6,cy0-1.6,1.4,1);                                      // eye
      x.save(); ell(x,cx0,cy0,rx,ry); x.clip(); x.fillStyle=sg(x,P.hc,d,8);                                      // hairline, clipped to the head
      if(P.hair==="fade"||P.hair==="cap"){ x.globalAlpha=.85; x.fillRect(cx0-rx-1,cy0-ry-1,rx*2+2,ry*.7); x.fillRect(cx0-rx-1,cy0-ry,rx*.9,ry*1.3); x.globalAlpha=1; }
      else { x.fillRect(cx0-rx-1,cy0-ry-1,rx*2+2,ry*.85); x.fillRect(cx0-rx-1,cy0-ry,rx*1.1,ry*1.6); }
      if(P.beard){ x.fillStyle=P.hc; x.globalAlpha=.8; x.fillRect(cx0-2,cy0+ry*.35,rx+3,ry); x.globalAlpha=1; }
      x.restore();
      if(P.hair==="bun"){ x.fillStyle=sg(x,P.hc,d,6); ell(x,cx0-2.5,cy0-ry-1.8,3,2.6); x.fill(); }
      if(P.hair==="cap"){ x.fillStyle=sg(x,P.capc||"#c8203e",d,8); x.beginPath(); x.ellipse(cx0,cy0-2.2,rx+.5,ry-1.2,0,Math.PI,6.283); x.fill(); x.fillRect(cx0+1,cy0-3,rx+4,1.7); } }
    function person(x,P){ var d=P.d, u=P.h/100, sk=P.skin, top=P.tc, bot=P.bc, f=P.f, st=P.stride, ld=-d;   // ld: the lit side, in local x
      x.save(); x.translate(P.x,P.y); x.scale(d*u*1.12,u);
      shadow(x,16);
      var dress=P.bot==="dress"||P.bot==="skirt", hem=P.bot==="dress"?-36:-40;
      // legs: back leg first, a little stride on the front one
      var legC=dress?shade(sk,-.08):bot, lw=dress?4.6:7, cw=dress?4:6;
      limb(x,shade(legC,-.3),lw,[-2.5,-47,-3+st*.3,-24]); limb(x,shade(legC,-.3),cw,[-3+st*.3,-24,-3.5,-3]);
      limb(x,legC,lw,[2.5,-47,3+st*.6,-24]); limb(x,legC,cw,[3+st*.6,-24,3+st,-3]);
      x.fillStyle=P.shoe; ell(x,-2,-1.6,4.4,2.2); x.fill(); ell(x,4.5+st,-1.6,4.6,2.3); x.fill();
      if(f&&dress){ x.fillStyle=shade(P.shoe,.2); x.fillRect(-4,-5,1.2,4); x.fillRect(2.5+st,-5,1.2,4); }      // heels
      if(!dress){ x.fillStyle=sg(x,bot,ld); x.beginPath(); x.moveTo(-8.5,-56); x.lineTo(8.5,-56); x.lineTo(9.5,-44); x.lineTo(-9.5,-44); x.closePath(); x.fill(); }   // hips
      // back arm, behind the body
      var sl=P.top==="jacket"||P.top==="dress"&&!f?top:P.top==="tee"?top:null, armB=P.top==="jacket"?shade(top,-.35):shade(sk,-.3);
      limb(x,armB,4.4,[-3,-80,-5,-64,-4,-50]);
      // torso (+ skirt / dress)
      x.fillStyle=sg(x,top,ld); x.beginPath(); x.moveTo(-5,-87); x.quadraticCurveTo(-10,-86,-10,-80);
      if(f){ x.quadraticCurveTo(-9,-66,-7.5,-58); x.quadraticCurveTo(-9.5,-52,-9.5,-48); x.lineTo(9.5,-48); x.quadraticCurveTo(9.5,-53,7.5,-58); x.quadraticCurveTo(11.5,-70,9,-80); }
      else { x.lineTo(-8.5,-56); x.lineTo(-9,-49); x.lineTo(9,-49); x.lineTo(8.5,-56); x.quadraticCurveTo(10,-72,9,-80); }
      x.quadraticCurveTo(8.5,-86,4,-87); x.closePath(); x.fill();
      if(P.top==="jacket"){ x.fillStyle=sg(x,P.under,ld,8); x.beginPath(); x.moveTo(4,-87); x.lineTo(8,-80); x.lineTo(8.5,-56); x.lineTo(5,-54); x.lineTo(3,-80); x.closePath(); x.fill(); }   // shirt under the open jacket
      if(f&&P.top==="dress"){ x.fillStyle=sk; x.beginPath(); x.moveTo(-5,-87); x.lineTo(4,-87); x.lineTo(5.5,-81); x.lineTo(-6,-81); x.closePath(); x.fill(); }   // bare shoulders
      if(dress){ x.fillStyle=sg(x,P.bot==="dress"?top:bot,ld,14); x.beginPath(); x.moveTo(-8.5,-58); x.lineTo(8.5,-58); x.quadraticCurveTo(13,-48,12.5,hem); x.quadraticCurveTo(0,hem+2.5,-12,hem); x.quadraticCurveTo(-12,-48,-8.5,-58); x.closePath(); x.fill(); }
      if(P.top==="tee"||P.top==="top"){ x.fillStyle="rgba(0,0,0,.18)"; x.fillRect(-9,-58,18,1.4); }           // belt line / hem
      if(P.bag){ limb(x,shade(P.bag,-.2),1,[-4,-86,6,-56]); x.fillStyle=sg(x,P.bag,ld,5); x.beginPath(); x.roundRect?x.roundRect(4,-60,6.5,6,1.5):x.rect(4,-60,6.5,6); x.fill(); }
      // front arm: the pose
      var sleeve=P.top==="jacket"||P.top==="tee"?top:null, armF=P.top==="jacket"?top:sk, A=P.pose==="phone"||P.pose==="drink"?[2,-80,5,-64,12,-71]:P.pose==="hip"?[2,-80,9,-66,5,-53]:P.pose==="pocket"?[2,-80,3,-64,6,-52]:[2,-80,2,-64,4,-50];
      limb(x,shade(sk,.05),4.2,[A[2],A[3],A[4],A[5]]);
      limb(x,sleeve?sg(x,sleeve,ld,6):sk,P.top==="jacket"?5:4.4,P.top==="jacket"?A:[A[0],A[1],A[2],A[3]]);
      if(sleeve&&P.top==="tee"){ limb(x,top,5,[A[0],A[1],(A[0]+A[2])/2,(A[1]+A[3])/2]); }
      x.fillStyle=sk; ell(x,A[4],A[5],2.1,2.1); x.fill();
      if(P.pose==="phone"){ x.fillStyle="#0c0e12"; x.fillRect(A[4]-.5,A[5]-7,3,6); x.fillStyle="#bfe3ff"; x.fillRect(A[4]+1.8,A[5]-6.4,.7,4.8); P.ph=[P.x+d*u*1.12*(A[4]+1),P.y+u*(A[5]-4)]; }
      if(P.pose==="drink"){ x.fillStyle="rgba(255,255,255,.55)"; x.beginPath(); x.moveTo(A[4]-1.5,A[5]-7); x.lineTo(A[4]+3.5,A[5]-7); x.lineTo(A[4]+2.4,A[5]); x.lineTo(A[4]-.4,A[5]); x.closePath(); x.fill();
        x.fillStyle="#ff4d7a"; x.fillRect(A[4]-.6,A[5]-5,3,3.4); }
      head(x,P,ld,1,-94,5.4,6.6);
      x.restore(); }
    function bouncer(x,bx,by,h){ var u=h/100, sk="#5a3a26", blk="#0b0c0f";   // faces the street, arms crossed, black tee, earpiece
      x.save(); x.translate(bx,by); x.scale(u,u); shadow(x,22);
      limb(x,"#0a0b0d",9.5,[-5.5,-50,-6,-24,-6.5,-4]); limb(x,"#121317",9.5,[5.5,-50,6,-24,6.5,-4]);
      x.fillStyle="#08090b"; ell(x,-7.5,-2,5.6,2.6); x.fill(); ell(x,7.5,-2,5.6,2.6); x.fill();
      x.fillStyle="#101114"; x.fillRect(-11,-56,22,8);
      x.fillStyle=sg(x,blk,1,16); x.beginPath(); x.moveTo(-6,-89); x.quadraticCurveTo(-17,-88,-17,-79); x.quadraticCurveTo(-14,-64,-11.5,-52); x.lineTo(11.5,-52); x.quadraticCurveTo(14,-64,17,-79); x.quadraticCurveTo(17,-88,6,-89); x.closePath(); x.fill();
      limb(x,shade(blk,.25),7.5,[-15,-82,-17,-64]); limb(x,shade(blk,-.2),7.5,[15,-82,17,-64]);              // sleeves
      limb(x,shade(sk,-.15),6.4,[16.5,-63,-7,-69]); limb(x,sk,6.6,[-16.5,-64,8,-71]);                       // forearms, crossed
      x.fillStyle=sk; ell(x,9,-71.5,2.8,2.6); x.fill(); x.fillStyle=shade(sk,-.15); ell(x,-8,-69.5,2.7,2.5); x.fill();
      x.fillStyle="#e9e9e9"; x.font="900 5.6px Barlow,Arial,sans-serif"; x.textAlign="center"; x.fillText("SECURITY",0,-77);
      x.fillStyle=sk; x.fillRect(-4.5,-93,9,6);
      x.fillStyle=sg(x,sk,1,8); ell(x,0,-97,6.6,7.6); x.fill();                                                  // bald head, lit from the door
      x.fillStyle="rgba(255,230,200,.45)"; ell(x,-2.5,-101.5,2.2,1.4); x.fill();
      x.fillStyle="#0d0a09"; x.fillRect(-4.6,-98.6,9.2,2.2);                                                     // shades
      x.save(); ell(x,0,-97,6.6,7.6); x.clip(); x.fillStyle="rgba(14,10,9,.85)"; x.beginPath(); x.moveTo(-7,-95); x.quadraticCurveTo(0,-87,7,-95); x.lineTo(7,-88); x.lineTo(-7,-88); x.closePath(); x.fill(); x.restore();   // beard
      limb(x,"#cfd6e4",.7,[6.4,-96,7.6,-92,6.8,-89,8.2,-86,8.6,-82]);                                            // earpiece cord
      x.restore(); }
    function rope(x){ var P=[], i;   // brass stanchions + red velvet rope along the street side of the line
      for(i=0;i<7;i++){ var px=110+i*22.5; P.push([px,walk(px)+6.5]); }
      function post(p){ var g=x.createLinearGradient(p[0]-1,0,p[0]+1,0); g.addColorStop(0,"#fff0b0"); g.addColorStop(1,"#8a6a20");
        x.fillStyle="rgba(0,0,0,.35)"; ell(x,p[0]+1.5,p[1]+.4,3.4,1); x.fill(); x.fillStyle="#b48a2c"; ell(x,p[0],p[1],2.6,.9); x.fill();
        x.fillStyle=g; x.fillRect(p[0]-.7,p[1]-12.5,1.4,12.5); x.fillStyle="#f3d27a"; ell(x,p[0],p[1]-13,1.4,1.4); x.fill(); }
      for(i=0;i<P.length-1;i++){ var a=P[i], b=P[i+1], mx=(a[0]+b[0])/2, my=(a[1]+b[1])/2-11+4;
        x.lineCap="round"; x.strokeStyle="#6e0c1c"; x.lineWidth=1.6; x.beginPath(); x.moveTo(a[0],a[1]-11.5); x.quadraticCurveTo(mx,my+3,b[0],b[1]-11.5); x.stroke();
        x.strokeStyle="rgba(255,90,120,.55)"; x.lineWidth=.5; x.beginPath(); x.moveTo(a[0],a[1]-12); x.quadraticCurveTo(mx,my+2.4,b[0],b[1]-12); x.stroke(); }
      P.forEach(post); }
    var X0 = 0, Y0 = 58, CW = 262, CH = 204, k = 2, c = D.createElement("canvas"); c.width = CW * k; c.height = CH * k;
    var x = c.getContext("2d"); x.setTransform(k, 0, 0, k, -X0 * k, -Y0 * k);
    x.drawImage(im, 0, 0, 250, 250 * 539 / 520);
    x.save(); x.globalCompositeOperation = "source-atop"; x.fillStyle = "rgba(10,16,46,.58)"; x.fillRect(X0, Y0, CW, CH); x.restore();   // night grade, building only
    // lotCanvas(): string lights, the bouncer at the door, the line back to front, the rope
    x.strokeStyle = "rgba(20,14,10,.75)"; x.lineWidth = .7; x.beginPath(); BULBS.forEach(function (b, i) { i ? x.lineTo(b[0], b[1]) : x.moveTo(b[0], b[1]); }); x.stroke();
    BULBS.forEach(function (b) { x.fillStyle = b[2]; x.beginPath(); x.arc(b[0], b[1] + 1.6, 1.5, 0, 6.283); x.fill(); });
    bouncer(x, 104, 211, 31);
    PEOPLE.slice().sort(function (a, b) { return a.y - b.y; }).forEach(function (P) { person(x, P); });
    rope(x);
    // litCanvas(): windows on, doorway spill, party wash, bulbs and phone screens glowing (added light, like the game)
    x.save(); x.globalCompositeOperation = "lighter"; x.globalAlpha = .55;   // the game ramps this layer in; at rest it sits ~.86 over a darker map
      function glow(gx,gy,r,a,rgb){ var g=x.createRadialGradient(gx,gy,0,gx,gy,r); g.addColorStop(0,"rgba("+rgb+","+a+")"); g.addColorStop(1,"rgba("+rgb+",0)"); x.fillStyle=g; x.beginPath(); x.arc(gx,gy,r,0,6.283); x.fill(); }
      glow(146,162,50,.5,"255,190,110"); x.fillStyle="rgba(255,206,132,.92)"; x.fillRect(122,155,46,14);      // front window, lit
      x.fillStyle="rgba(60,30,14,.55)"; [131,144,157].forEach(function(px){ x.beginPath(); x.arc(px,159,2,0,6.283); x.fill(); x.fillRect(px-2.2,161,4.4,6); });   // people inside
      x.fillStyle="rgba(255,206,132,.95)"; x.fillRect(29,99,6,14); x.fillRect(29,121,6,14); glow(32,112,24,.45,"255,190,110");   // side windows
      glow(86,176,32,.5,"255,170,90");                 // doorway spill (kept off the bouncer so his blacks stay black)
      glow(150,186,80,.22,"255,110,190");              // party wash over the patio
      glow(120,236,110,.16,"120,200,255");             // cool wash on the sidewalk line
      BULBS.forEach(function(b){ glow(b[0],b[1]+1.6,9,.85,"255,220,150"); });
      PEOPLE.forEach(function(P){ if(P.ph) glow(P.ph[0],P.ph[1],5,.9,"200,230,255"); });   // phone screens in the line
      glow(122,206,26,.22,"255,200,140");              // the door light on the bouncer and the front of the line
    x.restore();
    return c.toDataURL("image/png");
  }

  /* ---------- the billboard scene (Melody's + the lit roadside billboard) ---------- */
  var sceneTab = {};   // per scene key: "c" | "s"
  function rowsHTML(tab, key) {
    if (!rows[tab]) return '<li class="bb-empty">' + esc(T("Loading the board…")) + "</li>";
    var all = merged(tab), max = key === "start" ? 3 : 5, top = all.slice(0, max), mine = null;
    all.forEach(function (o) { if (o.id && o.id === lastNew) mine = o; });
    if (mine && mine.rank > max) top.push(mine);
    if (!top.length) return '<li class="bb-empty">' + esc(T(tab === "s" ? "No times yet this week. Last the longest and you're on top." : "No scores yet this week. First one up is winning.")) + "</li>";
    return top.map(function (o, i) {
      var isNew = o.id && o.id === lastNew;
      return (i && o.rank > top[i - 1].rank + 1 ? '<li class="bb-gap" aria-hidden="true">⋯</li>' : "") +
        '<li class="' + (isNew ? "bb-new" + (pasteId === o.id ? " bb-paste" : "") : "") + (o.rank === 1 ? " bb-1" : "") + '"><b>' + o.rank + "</b><span>" + esc(o.n) +
        (o.ig ? " <i>@" + esc(o.ig) + "</i>" : "") + (o.phone ? ' <small title="' + esc(T("On this phone's billboard. Join free to go on the weekly prize board.")) + '">📱</small>' : "") +
        "</span><em>" + esc(fmt(o.v, tab)) + "</em>" + (isNew ? "<u>" + esc(T("NEW")) + "</u>" : "") + "</li>";
    }).join("");
  }
  function sceneInner(key) {
    var tab = sceneTab[key] || "c";
    if (LOTART === null) lotArt(function () { paintAll(); });
    return '<div class="bb-melody" aria-hidden="true"><img class="bb-logo" src="img/logo.png" alt="">' + (LOTART ? '<img class="bb-lot" src="' + LOTART + '" alt="">' : '<img class="bb-bldg" src="img/game/melody.webp" alt="">') + "</div>" +
      '<div class="bb-bb"><div class="bb-lamps" aria-hidden="true"><i></i><i></i><i></i></div><div class="bb-panel">' +
      '<div class="bb-hd">' + esc(T("Top flyers")) + "<small>" + esc(T("this week")) + "</small>" + "</div>" +
      '<div class="bb-tabs" role="group" aria-label="' + esc(T("Which board")) + '"><button type="button" data-bbt="c" data-bbk="' + key + '" aria-pressed="' + (tab === "c") + '">' + esc(T("Campaign")) + '</button><button type="button" data-bbt="s" data-bbk="' + key + '" aria-pressed="' + (tab === "s") + '">' + esc(T("Survival")) + "</button></div>" +
      '<ol class="bb-rows">' + rowsHTML(tab, key) + "</ol></div>" +
      '<div class="bb-legs" aria-hidden="true"><i></i><i></i></div></div>';
  }
  function sceneHTML(key, tab) {
    key = key || "start"; if (tab) sceneTab[key] = tab; else if (!sceneTab[key]) sceneTab[key] = (W.MELODY_MODE && MELODY_MODE() === "survival") ? "s" : "c";
    css(); if (!rows.c && !loading.c) refresh();
    return '<div class="bb-scene" data-bb="' + key + '">' + sceneInner(key) + "</div>";
  }
  function paintAll() {
    if (Date.now() < animUntil) { clearTimeout(animT); animT = setTimeout(function () { pasteId = null; paintAll(); }, animUntil - Date.now() + 30); return; }   // never repaint under the flight
    [].forEach.call(D.querySelectorAll(".bb-scene[data-bb]"), function (el) { el.innerHTML = sceneInner(el.getAttribute("data-bb")); }); }
  D.addEventListener("click", function (e) {
    var b = e.target && e.target.closest && e.target.closest("[data-bbt]"); if (!b) return;
    e.preventDefault(); e.stopPropagation(); sceneTab[b.getAttribute("data-bbk")] = b.getAttribute("data-bbt"); paintAll();
  }, true);

  /* ---------- the unposted flight (survives a reload) ---------- */
  function pending() { var p = get(PEND, null); if (!p || p.week !== wk() || isSent(p.id)) return null; return p; }
  function isSent(id) { return get(SENT, []).indexOf(id) >= 0; }
  function markSent(id) { var s = get(SENT, []); if (s.indexOf(id) < 0) s.unshift(id); put(SENT, s.slice(0, 50)); }
  function bannerHTML() {
    var p = pending(); if (!p) return "";
    css();
    return '<button type="button" class="bb-pend" data-bb-pend>🏆 ' + esc(T("You have an unposted score:")) + " <b>" + esc(p.mode === "survival" ? mmss(p.secs) : num(p.score)) + "</b> · <u>" + esc(T("Post it")) + "</u></button>";
  }
  D.addEventListener("click", function (e) {
    var b = e.target && e.target.closest && e.target.closest("[data-bb-pend]"); if (!b) return;
    e.preventDefault(); e.stopPropagation(); var p = pending(); if (p) open(p, { fromStart: true });
  }, true);

  /* ---------- the sheet ---------- */
  var sh = null, cur = null, resolved = false, lockT = 0, wonHome = null;
  function blocking() { return !!sh; }
  function over(info) {   // called by index.html end()
    var rec = { id: "f" + Date.now().toString(36) + Math.floor(Math.random() * 1e4), run: info.run, mode: info.mode, score: Math.max(0, Math.round(+info.score || 0)),
      secs: Math.max(0, Math.floor((+info.survMs || 0) / 1000)), lvl: info.lvl, week: wk(), ts: Date.now(), debug: !!info.debug, won: !!info.won,
      rank: info.rankText || "", best: info.best || "" };
    var postable = !rec.debug && val(rec) > 0;
    if (postable) put(PEND, rec);
    open(rec, { postable: postable });
  }
  function open(rec, o) {
    o = o || {}; css(); close(true);
    cur = rec; resolved = false; lastNew = null;
    var postable = o.postable != null ? o.postable : (!rec.debug && val(rec) > 0 && !isSent(rec.id));
    var tab = tabOf(rec), sv = tab === "s", saved = get(NAMEK, {}) || {}, m = member();
    var big = sv ? "⏱ " + mmss(rec.secs) : num(rec.score);
    sh = D.createElement("div"); sh.className = "bb-sheet locked"; sh.setAttribute("role", "dialog"); sh.setAttribute("aria-modal", "true"); sh.setAttribute("aria-labelledby", "bb-h");
    sh.setAttribute("data-scroll-ok", "");
    sh.innerHTML = '<div class="bb-card">' +
      '<div class="bb-k">' + esc(T(rec.won ? "✈️ Landed at LAX!" : o.fromStart ? "Your last flight" : sv ? "Survival · flight over" : "Flight over")) + "</div>" +
      '<div class="bb-final" id="bb-h">' + esc(big) + (sv ? "" : " <small>" + esc(T("score")) + "</small>") + "</div>" +
      '<div class="bb-sub">' + esc(rec.rank || (sv ? T("Survival · reached level") + " " + rec.lvl + " · " + T("score") + " " + num(rec.score) : T("Level") + " " + rec.lvl)) + "</div>" +
      '<div class="bb-lockbar" aria-hidden="true"><i></i></div>' +
      (postable ?
        '<section class="bb-add"><h3>🏆 ' + esc(T("Add your name to the billboard")) + " <small>" + esc(T("optional")) + "</small></h3>" +
        '<div class="bb-ins"><input class="bb-in" id="bb-n" maxlength="16" autocomplete="nickname" enterkeyhint="done" placeholder="' + esc(T("First name or nickname")) + '" value="' + esc(saved.n || (m && m.name ? String(m.name).split(" ")[0].slice(0, 16) : "")) + '">' +
        '<input class="bb-in" id="bb-ig" maxlength="31" autocapitalize="none" autocomplete="off" enterkeyhint="done" placeholder="' + esc(T("@instagram (optional)")) + '" value="' + esc(saved.ig ? "@" + saved.ig : "") + '"></div>' +
        '<div class="bb-row"><button type="button" class="bb-post">' + esc(T(sv ? "Post my time" : "Post my score")) + '</button><button type="button" class="bb-skip">' + esc(T("Skip")) + "</button></div>" +
        '<div class="bb-msg" role="status" aria-live="polite">' + esc(T(m ? "You're a member: this also goes on the weekly prize board." : "Members also go on the weekly prize board.")) + "</div>" +
        '<div class="bb-join" hidden></div></section>'
        : '<section class="bb-add bb-none"><div class="bb-msg">' + esc(T(rec.debug ? "Practice flight (test mode): no board." : sv ? "Last a little longer to get on the billboard." : "Catch some food to get on the billboard.")) + "</div></section>") +
      sceneHTML("sheet", tab) +
      '<div class="bb-wonslot"></div>' +
      '<div class="bb-foot"><button type="button" class="bb-refly" disabled>' + esc(T("Re-fly")) + ' ✈️</button>' +
      '<div class="bb-hint">' + esc(T(postable ? "Post or skip to unlock Re-fly" : "")) + '</div><button type="button" class="bb-close" hidden>' + esc(T("Close")) + "</button></div></div>";
    var host = D.body; host.appendChild(sh);
    // nothing behind the sheet ever gets these taps (the canvas used to restart on any tap)
    ["pointerdown", "pointerup", "touchstart", "touchend", "mousedown", "mouseup", "click"].forEach(function (t) { sh.addEventListener(t, function (e) { e.stopPropagation(); }, { passive: true }); });
    sh.addEventListener("touchmove", function (e) { e.stopPropagation(); }, { passive: true });
    // the rewards line (⭐ points / Join to save) rides along on the sheet while it is open
    var won = D.getElementById("won"); if (won && !o.fromStart && won.style.display !== "none" && won.innerHTML) { wonHome = { el: won, parent: won.parentNode, next: won.nextSibling }; sh.querySelector(".bb-wonslot").appendChild(won); }
    var post = sh.querySelector(".bb-post"), skip = sh.querySelector(".bb-skip");
    if (post) post.onclick = function () { doPost(); };
    if (skip) skip.onclick = function () { resolve(T("Skipped. Your score is saved on this phone: post it later from the start screen.")); };
    [].forEach.call(sh.querySelectorAll(".bb-in"), function (inp) { inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); doPost(); } }); });
    sh.querySelector(".bb-refly").onclick = function () { if (!resolved) return; var cb = C().refly; close(); if (o.fromStart && W.GameMenu && D.documentElement.classList.contains("gm-up")) GameMenu.play(); else if (cb) cb(); };
    sh.querySelector(".bb-close").onclick = function () { close(); };
    if (!postable) resolved = true;
    clearTimeout(lockT); lockT = setTimeout(function () { if (!sh) return; sh.classList.remove("locked"); if (!postable) unlockRefly(); }, o.fromStart ? 0 : LOCK_MS);
    if (o.fromStart) sh.classList.remove("locked");
    refresh();
  }
  /* The name reveal: Melody's plane (the game's own sprite, img/game/plane.webp) flies past the billboard towing a banner with the
     name + score; as it passes, the new row flips onto the board. ~2.4 s, CSS only (one transform animation), Re-fly waits for it. */
  var FLY_MS = 2400;
  function flyBy(name, score) {
    var sc = sh && sh.querySelector(".bb-scene"); if (!sc) { pasteId = null; return; }
    if (W.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) { pasteId = null; return; }
    animUntil = Date.now() + FLY_MS;
    var f = D.createElement("div"); f.className = "bb-fly"; f.setAttribute("aria-hidden", "true");
    f.innerHTML = '<div class="bb-flyer"><span class="bb-tow">' + esc(name) + " · " + esc(score) + '</span><i class="bb-rope"></i><img src="img/game/plane.webp" alt=""></div>';
    sc.appendChild(f);
    setTimeout(function () { if (f.parentNode) f.remove(); pasteId = null; }, FLY_MS + 100);
  }
  function unlockRefly() { if (!sh) return;
    if (Date.now() < animUntil) { var w = animUntil - Date.now() + 40; setTimeout(unlockRefly, w); return; } var r = sh.querySelector(".bb-refly"); r.disabled = false; r.classList.add("go"); sh.querySelector(".bb-close").hidden = false; sh.querySelector(".bb-hint").textContent = ""; }
  function resolve(msg) {
    resolved = true; if (!sh) return;
    var m = sh.querySelector(".bb-msg"); if (msg != null && m) m.textContent = msg;
    var row = sh.querySelector(".bb-row"); if (row) row.hidden = true;
    var ins = sh.querySelector(".bb-ins"); if (ins) ins.hidden = true;
    [].forEach.call(sh.querySelectorAll(".bb-in"), function (i) { i.disabled = true; });
    if (Date.now() < animUntil) sh.querySelector(".bb-hint").textContent = "✈️ " + T("Pasting your name on the billboard…");
    unlockRefly(); try { sh.querySelector(".bb-refly").focus({ preventScroll: true }); } catch (e) {}
  }
  function say(t) { var m = sh && sh.querySelector(".bb-msg"); if (m) { m.textContent = t; m.classList.add("bb-err"); setTimeout(function () { if (m) m.classList.remove("bb-err"); }, 1600); } }
  function doPost() {
    if (!sh || !cur || resolved || sh.classList.contains("locked")) return;
    var n = cleanName(sh.querySelector("#bb-n").value); if (n.err) { say(n.err); return; }
    var ig = cleanIg(sh.querySelector("#bb-ig").value); if (ig.err) { say(ig.err); return; }
    var rec = cur, tab = tabOf(rec);
    put(NAMEK, { n: n.v, ig: ig.v }); sh.querySelector("#bb-n").value = n.v; sh.querySelector("#bb-ig").value = ig.v ? "@" + ig.v : "";
    // 1) always: this phone's billboard (shows right away with NEW)
    var L = get(LOC, []).filter(function (e) { return e.id !== rec.id; });
    L.unshift({ id: rec.id, n: n.v, ig: ig.v, v: val(rec), tab: tab, week: rec.week, ts: Date.now(), sent: 0 }); put(LOC, L.slice(0, 40));
    lastNew = rec.id; sceneTab.sheet = tab; sceneTab.start = tab; put(PEND, null);
    animUntil = 0; pasteId = rec.id; paintAll(); flyBy(n.v, fmt(val(rec), tab));
    // 2) members: the weekly prize board. Guests: offer the free join (the existing crm.js gate) to get on it.
    var m = member();
    if (m) { sendWeekly(rec, n.v, ig.v); return; }
    resolve(T("✅ You're on the billboard (on this phone)."));
    var j = sh.querySelector(".bb-join");
    if (j && W.SSAI_GATE) {
      j.hidden = false;
      j.innerHTML = '<button type="button" class="bb-joinb">🎁 ' + esc(T("Join free to enter the weekly prize board")) + "</button><small>" + esc(T("Winners are contacted, so the prize board needs a phone or email. It's never shown on the board.")) + "</small>";
      j.querySelector(".bb-joinb").onclick = function () {
        W.SSAI_GATE("score", function (mm) { if (sh && cur === rec) { j.hidden = true; sendWeekly(rec, n.v, ig.v); } });
      };
    }
  }
  function sendWeekly(rec, n, ig) {
    var c = C(), tab = tabOf(rec), sv = tab === "s", msg = sh && sh.querySelector(".bb-msg");
    if (isSent(rec.id)) { resolve(T("This flight is already on the weekly board.")); return; }
    if (!c.api) { resolve(""); return; }
    if (msg) msg.textContent = T("Posting…");
    fetch(c.api, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ game: sv ? c.gameS : c.game, name: n, ig: ig, score: val(rec), week: rec.week }) })
      .then(function (r) { return r.json(); }).then(function (j) {
        if (!j || !j.ok) {
          if (j && j.error === "name not allowed") { if (sh && cur === rec && !resolved) { say(T("Pick a different name.")); return; } }
          resolve(T("Couldn't reach the weekly board. You're on the billboard on this phone; try again later from the start screen."));
          put(PEND, rec); return;
        }
        markSent(rec.id); put(PEND, null);
        var L = get(LOC, []); L.forEach(function (e) { if (e.id === rec.id) e.sent = 1; }); put(LOC, L);
        if (c.posted) try { c.posted(rec, tab); } catch (e) {}
        resolve("✅ " + T(sv ? "You're on this week's Survival prize board!" : "You're on this week's Campaign prize board!") + (ig ? " @" + ig : ""));
        rows[tab] = rows[tab] || []; fetchTab(tab);
        try { navigator.vibrate && navigator.vibrate(20); } catch (e) {}
      }).catch(function () { put(PEND, rec); resolve(T("No connection. You're on the billboard on this phone; post to the weekly board later from the start screen.")); });
  }
  function close(silent) {
    clearTimeout(lockT);
    if (wonHome && wonHome.el) { try { if (wonHome.next && wonHome.next.parentNode === wonHome.parent) wonHome.parent.insertBefore(wonHome.el, wonHome.next); else wonHome.parent.appendChild(wonHome.el); } catch (e) {} wonHome = null; }
    if (sh) { sh.remove(); sh = null; }
    if (!silent && W.GameMenu && D.documentElement.classList.contains("gm-up")) try { GameMenu.refresh(); } catch (e) {}
  }

  /* ---------- styles: night LA, neon, gold ---------- */
  function css() {
    if (D.getElementById("bb-css")) return;
    var s = D.createElement("style"); s.id = "bb-css";
    s.textContent =
      ".bb-sheet{position:fixed;inset:0;z-index:2147483100;display:flex;align-items:flex-end;justify-content:center;background:rgba(4,8,18,.78);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;touch-action:pan-y;padding:max(10px,env(safe-area-inset-top)) 0 0;box-sizing:border-box;font-family:Barlow,system-ui,-apple-system,sans-serif}" +
      ".bb-sheet *{box-sizing:border-box}" +
      ".bb-card{width:100%;max-width:480px;margin-top:auto;padding:14px 16px calc(14px + env(safe-area-inset-bottom,0px));border-radius:22px 22px 0 0;color:#f6f1e4;background:radial-gradient(120% 50% at 80% 0,rgba(212,175,55,.22),transparent 60%),linear-gradient(180deg,#1c2547,#0b1220 75%);border:1px solid #d4af37;border-bottom:0;box-shadow:0 -12px 40px rgba(0,0,0,.6);animation:bbUp .28s ease-out}" +
      "@keyframes bbUp{from{transform:translateY(40px);opacity:0}}" +
      ".bb-sheet.locked .bb-card{pointer-events:none}" +
      ".bb-k{font:800 11px/1.2 Barlow,system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#f0d375;text-align:center}" +
      ".bb-final{margin:2px 0 0;text-align:center;font:400 40px/1 Anton,Impact,sans-serif;color:#fff;text-shadow:0 3px 0 #8a6d12,0 10px 26px rgba(0,0,0,.6)}.bb-final small{font:800 14px Barlow,system-ui,sans-serif;color:#f0d375;text-shadow:none;letter-spacing:.06em;text-transform:uppercase}" +
      ".bb-sub{text-align:center;font:600 12.5px/1.3 Barlow,system-ui,sans-serif;color:#c9d2ee;margin-top:3px}" +
      ".bb-lockbar{height:3px;margin:8px auto 0;max-width:180px;border-radius:3px;background:rgba(255,255,255,.1);overflow:hidden}.bb-lockbar i{display:block;height:100%;width:100%;background:#f0d375;transform-origin:0 50%;animation:bbLock " + LOCK_MS + "ms linear forwards}" +
      "@keyframes bbLock{from{transform:scaleX(0)}to{transform:scaleX(1)}}.bb-sheet:not(.locked) .bb-lockbar{visibility:hidden}" +
      ".bb-add{margin-top:10px;padding:12px;border-radius:16px;background:rgba(240,211,117,.1);border:1px solid rgba(240,211,117,.55)}" +
      ".bb-add h3{margin:0 0 8px;font:900 16px/1.15 Barlow,system-ui,sans-serif;color:#fff}.bb-add h3 small{font-weight:700;font-size:11px;color:#9aa3b5;letter-spacing:.08em;text-transform:uppercase}" +
      ".bb-ins{display:grid;grid-template-columns:1.1fr 1fr;gap:6px;margin:0 0 7px}.bb-in{display:block;width:100%;min-width:0;margin:0;padding:11px 12px;border-radius:11px;border:1px solid #27324d;background:#0b1220;color:#f6f1e4;font:600 16px Barlow,system-ui,sans-serif}.bb-in:focus{outline:2px solid #f0d375;outline-offset:0}.bb-in:disabled{opacity:.6}" +
      ".bb-ins[hidden]{display:none}.bb-row{display:flex;gap:8px;align-items:stretch}.bb-row[hidden]{display:none}" +
      ".bb-post{flex:1;min-height:48px;border:0;border-radius:13px;background:linear-gradient(180deg,#f0d375,#d4af37);color:#1a1206;font:900 16px Barlow,system-ui,sans-serif;cursor:pointer;touch-action:manipulation}" +
      ".bb-skip{flex:none;min-height:48px;padding:0 16px;border-radius:13px;border:1px solid #3a4565;background:transparent;color:#c9d2ee;font:700 14px Barlow,system-ui,sans-serif;cursor:pointer;touch-action:manipulation}" +
      ".bb-msg{margin-top:7px;font:600 12.5px/1.35 Barlow,system-ui,sans-serif;color:#c9d2ee}.bb-msg.bb-err{color:#ff9d7a}.bb-none .bb-msg{margin:0;text-align:center}" +
      ".bb-join{margin-top:8px}.bb-join[hidden]{display:none}.bb-joinb{width:100%;min-height:46px;border-radius:13px;border:2px solid #f0d375;background:rgba(240,211,117,.14);color:#ffe9a8;font:900 15px Barlow,system-ui,sans-serif;cursor:pointer}.bb-join small{display:block;margin-top:5px;font:600 11.5px/1.3 Barlow,system-ui,sans-serif;color:#9aa3b5}" +
      ".bb-wonslot #won{margin:10px 0 0;padding:8px 10px;text-align:center}.bb-wonslot #won,.bb-wonslot #won *{font-size:12px!important;line-height:1.3!important}.bb-wonslot:empty{display:none}" +
      ".bb-foot{position:sticky;bottom:calc(-14px - env(safe-area-inset-bottom,0px));z-index:4;margin:12px -16px calc(-14px - env(safe-area-inset-bottom,0px));padding:10px 16px calc(12px + env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;align-items:center;gap:6px;background:linear-gradient(180deg,rgba(11,18,32,0),#0b1220 22%)}" +
      ".bb-refly{width:100%;min-height:54px;border-radius:16px;border:0;font:400 24px/1 Anton,Impact,sans-serif;letter-spacing:.04em;color:#6c7590;background:#1a2340;cursor:not-allowed;touch-action:manipulation;transition:background .2s,color .2s}" +
      ".bb-refly.go{color:#1a1206;background:linear-gradient(180deg,#f0d375,#d4af37);box-shadow:0 0 0 3px rgba(240,211,117,.25),0 10px 24px rgba(0,0,0,.45);cursor:pointer}" +
      ".bb-hint{font:600 11.5px Barlow,system-ui,sans-serif;color:#9aa3b5;min-height:0}.bb-hint:empty{display:none}" +
      ".bb-close{border:0;background:none;color:#9aa3b5;font:700 13px Barlow,system-ui,sans-serif;text-decoration:underline;cursor:pointer;padding:4px 10px}.bb-close[hidden]{display:none}" +
      /* the scene */
      ".bb-scene{position:relative;display:grid;grid-template-columns:37% 1fr;gap:6px;align-items:end;margin-top:10px;padding:12px 8px 14px;border-radius:16px;overflow:hidden;" +
      "background:radial-gradient(1.5px 1.5px at 12% 18%,#fff9,transparent),radial-gradient(1px 1px at 38% 8%,#fff8,transparent),radial-gradient(1.5px 1.5px at 66% 14%,#fff7,transparent),radial-gradient(1px 1px at 88% 6%,#fff9,transparent),radial-gradient(1px 1px at 24% 40%,#fff6,transparent)," +
      "radial-gradient(80% 60% at 15% 100%,rgba(255,92,138,.22),transparent 70%),linear-gradient(180deg,#0a1028 0%,#1b1840 55%,#3a1f3d 100%);border:1px solid #27324d}" +
      ".bb-scene:after{content:'';position:absolute;left:0;right:0;bottom:0;height:12px;background:linear-gradient(180deg,#1a1d2b,#0d0f18);border-top:1px solid #2c3146;box-shadow:inset 0 3px 0 -1px rgba(240,211,117,.35)}" +
      ".bb-melody{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:2px}" +
      ".bb-logo{width:78%;height:auto;filter:drop-shadow(0 0 4px #ff8fb0) drop-shadow(0 0 10px #ff4f86);animation:bbNeon 4s infinite}" +
      "@keyframes bbNeon{0%,92%,100%{opacity:1}93%{opacity:.55}95%{opacity:1}97%{opacity:.7}}" +
      ".bb-bldg{width:100%;height:auto;filter:brightness(.62) saturate(1.15) hue-rotate(-8deg) drop-shadow(0 0 14px rgba(255,120,160,.35))}" +
      ".bb-bb{position:relative;z-index:1;display:flex;flex-direction:column;align-items:stretch;min-width:0}" +
      ".bb-lamps{display:flex;justify-content:space-around;padding:0 12%;height:8px}.bb-lamps i{width:16px;height:6px;border-radius:3px 3px 0 0;background:#3a4565;position:relative}" +
      ".bb-lamps i:after{content:'';position:absolute;left:50%;top:5px;width:70px;height:60px;transform:translateX(-50%);background:radial-gradient(50% 100% at 50% 0,rgba(255,236,170,.35),transparent 75%);pointer-events:none}" +
      ".bb-panel{position:relative;padding:7px 6px 7px;border-radius:8px;background:linear-gradient(180deg,#121a33,#0b1220);border:3px solid #d4af37;box-shadow:0 0 0 2px #0b1220,0 0 18px rgba(240,211,117,.35),inset 0 0 22px rgba(240,211,117,.12)}" +
      ".bb-hd{white-space:nowrap;overflow:hidden;font:400 15px/1.05 Anton,Impact,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#f0d375;text-align:center;text-shadow:0 0 8px rgba(240,211,117,.6)}.bb-hd small{display:block;font:800 9px/1.3 Barlow,system-ui,sans-serif;letter-spacing:.16em;color:#c9d2ee;text-shadow:none}" +
      ".bb-tabs{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin:6px 0 5px}.bb-tabs button{min-height:30px;padding:3px 2px;border-radius:8px;border:1px solid #27324d;background:rgba(255,255,255,.04);color:#c9d2ee;font:800 11px/1 Barlow,system-ui,sans-serif;cursor:pointer;touch-action:manipulation;white-space:nowrap;min-width:0;overflow:hidden;text-overflow:clip;letter-spacing:-.01em}" +
      ".bb-tabs button[aria-pressed=true]{border-color:#f0d375;background:rgba(212,175,55,.22);color:#fff}" +
      ".bb-rows{list-style:none;margin:0;padding:0;display:grid;gap:3px}" +
      ".bb-rows li{position:relative;display:flex;align-items:center;gap:6px;min-width:0;padding:4px 6px;border-radius:7px;background:rgba(255,255,255,.04);font:700 12.5px/1.2 Barlow,system-ui,sans-serif}" +
      ".bb-rows li b{flex:none;width:16px;text-align:center;font:400 14px/1 Anton,Impact,sans-serif;color:#9aa3b5}.bb-rows li.bb-1 b{color:#f0d375}" +
      ".bb-rows li span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#fff}.bb-rows li span i{font-style:normal;font-weight:600;font-size:11px;color:#f0d375;opacity:.85}.bb-rows li span small{font-size:10px}" +
      "@media (max-width:420px){.bb-rows li span i{display:none}}" +
      ".bb-rows li em{flex:none;font:400 13.5px/1 Anton,Impact,sans-serif;font-style:normal;color:#f0d375;letter-spacing:.02em}" +
      ".bb-rows li u{position:absolute;right:-4px;top:-7px;text-decoration:none;font:900 9px/1 Barlow,system-ui,sans-serif;letter-spacing:.08em;color:#1a1206;background:#7ef7c8;border-radius:4px;padding:2px 4px;box-shadow:0 0 8px #7ef7c8}" +
      ".bb-rows li.bb-new{background:rgba(126,247,200,.16);box-shadow:0 0 0 1px #7ef7c8,0 0 14px rgba(126,247,200,.55);animation:bbGlow 1.6s ease-in-out infinite}" +
      "@keyframes bbGlow{50%{box-shadow:0 0 0 1px #7ef7c8,0 0 22px rgba(126,247,200,.85)}}" +
      ".bb-rows li.bb-gap{background:none;justify-content:center;padding:0;color:#9aa3b5}" +
      ".bb-rows li.bb-empty{display:block;white-space:normal;color:#9aa3b5;font-weight:600;font-size:12px;background:none}" +
      ".bb-legs{display:flex;justify-content:space-around;padding:0 22%;height:14px}.bb-legs i{width:6px;height:100%;background:linear-gradient(90deg,#2c3146,#4a5270,#2c3146)}" +
      ".bb-lot{width:100%;height:auto;display:block;filter:drop-shadow(0 0 12px rgba(255,120,160,.28))}" +
      ".bb-fly{position:absolute;inset:0;z-index:3;pointer-events:none;overflow:hidden}" +
      ".bb-flyer{position:absolute;left:0;top:26%;width:100%;display:flex;align-items:center;justify-content:flex-start;animation:bbFly " + FLY_MS + "ms cubic-bezier(.35,.1,.55,.95) forwards;will-change:transform}" +
      ".bb-flyer img{width:58px;height:auto;transform:rotate(90deg);filter:drop-shadow(0 6px 8px rgba(0,0,0,.6)) drop-shadow(0 0 6px rgba(255,255,255,.25))}" +
      ".bb-rope{flex:none;width:18px;height:1px;background:rgba(255,255,255,.7)}" +
      ".bb-tow{flex:none;max-width:62%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:4px 10px;border-radius:3px;background:linear-gradient(180deg,#fff7d6,#f0d375);color:#1a1206;font:400 14px/1 Anton,Impact,sans-serif;letter-spacing:.03em;box-shadow:0 4px 10px rgba(0,0,0,.5);animation:bbFlap .25s ease-in-out infinite alternate}" +
      "@keyframes bbFly{from{transform:translateX(-75%)}to{transform:translateX(105%)}}" +
      "@keyframes bbFlap{to{transform:skewY(-3deg) scaleY(.94)}}" +
      ".bb-rows li.bb-paste{animation:bbPaste .5s cubic-bezier(.2,1.4,.4,1) 1.05s both,bbGlow 1.6s ease-in-out 1.6s infinite}" +
      "@keyframes bbPaste{from{transform:perspective(320px) rotateX(-95deg) scale(.9);opacity:0}60%{opacity:1}to{transform:none;opacity:1}}" +
      ".bb-pend{display:block;width:100%;margin:0 0 2px;padding:10px 12px;border-radius:14px;border:1px solid #7ef7c8;background:rgba(126,247,200,.12);color:#e9fff6;font:700 13.5px/1.3 Barlow,system-ui,sans-serif;text-align:left;cursor:pointer;touch-action:manipulation}.bb-pend b{color:#fff;font-weight:900}.bb-pend u{color:#7ef7c8}" +
      ".ms .bb-scene{margin-top:2px;grid-template-columns:33% 1fr}@media (max-width:380px){.bb-tabs button{font-size:10px}}" +
      "@media (max-height:700px){.bb-final{font-size:34px}.bb-card{padding-top:10px}.bb-add{margin-top:8px}.bb-scene{padding:10px 6px 13px}.bb-add{padding:10px}.bb-in{padding:9px 11px}}" +
      "@media (prefers-reduced-motion:reduce){.bb-card,.bb-logo,.bb-rows li.bb-new,.bb-tow{animation:none}.bb-fly{display:none}.bb-lockbar i{animation-duration:1ms}}";
    D.head.appendChild(s);
  }

  setInterval(function () { if (D.querySelector(".bb-scene[data-bb]")) refresh(); }, 60000);
  W.MelBoard = { over: over, open: open, close: close, blocking: blocking, pending: pending, sceneHTML: sceneHTML, bannerHTML: bannerHTML, refresh: refresh,
    _clean: cleanName, _test: { rows: rows, merged: merged } };
})();
