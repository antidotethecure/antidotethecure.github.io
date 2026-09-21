/* World renderer: isometric campus, DBZ fighters (vector fallback),
   sprite support (assets/characters/*.webp replaces a fighter automatically),
   status auras, delegation trails, pan/zoom. */
"use strict";

var World = (function(){
  var W = 1180, H = 760, HEX = 132, K = 0.55, RING = 300, FS = 1.32;
  var CX = W / 2, CY = H / 2 + 10;
  var canvas, ctx, DPR, manager, opts = {};
  var REDUCED = false;
  try { REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch(e){}

  var view = { x: 0, y: 0, s: 1 };
  var rooms = [], agents = [], roomById = {};
  var trails = [];   // {x1,y1,x2,y2,t0,dur,hue}
  var flyBusy = false;

  /* ---------- geometry ---------- */
  function hexPts(cx, cy, s){
    var p = [];
    for (var i = 0; i < 6; i++){
      var a = Math.PI / 180 * (60 * i);
      p.push([cx + s * Math.cos(a), cy + s * Math.sin(a) * K]);
    }
    return p;
  }
  function tracePoly(p){
    ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]);
    for (var i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]);
    ctx.closePath();
  }
  function shade(hex, f){
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    return "rgb(" + Math.round(r * f) + "," + Math.round(g * f) + "," + Math.round(b * f) + ")";
  }

  /* ---------- setup ---------- */
  function init(canvasEl, mgr, options){
    canvas = canvasEl; manager = mgr; opts = options || {};
    ctx = canvas.getContext("2d");
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.aspectRatio = W + "/" + H;

    rooms = ROOMS.map(function(r){
      var ang = r.pos[0] * Math.PI / 180, ring = r.pos[1];
      var o = Object.assign({}, r);
      o.wx = CX + RING * ring * Math.cos(ang);
      o.wy = CY + RING * ring * Math.sin(ang) * K;
      roomById[o.id] = o;
      return o;
    });

    agents = manager.all();
    var byRoom = {};
    agents.forEach(function(a){ (byRoom[a.room] = byRoom[a.room] || []).push(a); });
    Object.keys(byRoom).forEach(function(rid){
      var list = byRoom[rid], r = roomById[rid];
      list.forEach(function(a, i){
        a.li = i % 2;
        a.hx = r.wx + (i - (list.length - 1) / 2) * 74;
        a.hy = r.wy + 32;
        a.x = a.hx; a.y = a.hy; a.tx = a.hx; a.ty = a.hy;
        a.phase = Math.random() * 6.28;
        a.power = 0; a.prevPower = 0; a.powerUntil = 0; a.panelOpen = false; a.fly = null;
        a.sx = 0; a.sy = 0; a.roomRef = r;
        // sprite slot: drop a transparent PNG/WebP at a.avatar and it replaces the vector
        var img = new Image();
        img.onload = function(){ a.img = img; };
        img.onerror = function(){ a.img = null; };
        img.src = a.avatar;
        // optional Super Saiyan form: <name>-ssj.webp swaps in while powered up
        var simg = new Image();
        simg.onload = function(){ a.imgSSJ = simg; };
        simg.onerror = function(){ a.imgSSJ = null; };
        simg.src = a.avatar.replace(/\.webp$/, "-ssj.webp");
        if (a.face){
          var fimg = new Image();
          fimg.onload = function(){ a.faceImg = fimg; };
          fimg.onerror = function(){ a.faceImg = null; };
          fimg.src = a.face;
        }
      });
    });

    bindInput();
    requestAnimationFrame(frame);
  }

  /* ---------- pan / zoom ---------- */
  function bindInput(){
    var pointers = {}, panStart = null, moved = 0, pinchD = 0;
    canvas.addEventListener("pointerdown", function(e){
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      canvas.setPointerCapture(e.pointerId);
      if (Object.keys(pointers).length === 1){
        panStart = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
        moved = 0;
      } else if (Object.keys(pointers).length === 2){
        var ids = Object.keys(pointers);
        pinchD = dist(pointers[ids[0]], pointers[ids[1]]);
      }
    });
    canvas.addEventListener("pointermove", function(e){
      if (!pointers[e.pointerId]) return;
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(pointers);
      if (ids.length === 1 && panStart){
        var scale = worldScale();
        view.x = panStart.vx + (e.clientX - panStart.x) / scale;
        view.y = panStart.vy + (e.clientY - panStart.y) / scale;
        moved += Math.abs(e.clientX - panStart.x) + Math.abs(e.clientY - panStart.y);
      } else if (ids.length === 2){
        var d = dist(pointers[ids[0]], pointers[ids[1]]);
        if (pinchD > 0){ zoomBy(d / pinchD); pinchD = d; }
      }
    });
    function up(e){
      var wasTap = moved < 8 && Object.keys(pointers).length === 1;
      delete pointers[e.pointerId];
      if (Object.keys(pointers).length === 0) panStart = null;
      if (wasTap) tap(e);
    }
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", function(e){ delete pointers[e.pointerId]; panStart = null; });
    canvas.addEventListener("wheel", function(e){
      e.preventDefault();
      zoomBy(e.deltaY < 0 ? 1.1 : 0.9);
    }, { passive: false });
    document.getElementById("zin").addEventListener("click", function(){ zoomBy(1.25); });
    document.getElementById("zout").addEventListener("click", function(){ zoomBy(0.8); });
    document.getElementById("zreset").addEventListener("click", function(){ view = { x: 0, y: 0, s: 1 }; });
    function dist(a, b){ return Math.hypot(a.x - b.x, a.y - b.y); }
  }
  function zoomBy(f){ view.s = Math.min(2.6, Math.max(0.6, view.s * f)); }
  function worldScale(){
    var rect = canvas.getBoundingClientRect();
    return (rect.width / W) * view.s;
  }
  function tap(e){
    var rect = canvas.getBoundingClientRect();
    var mx = ((e.clientX - rect.left) / rect.width) * W;
    var my = ((e.clientY - rect.top) / rect.height) * H;
    // undo view transform (applied around canvas center)
    var wx = (mx - W / 2) / view.s + W / 2 - view.x;
    var wy = (my - H / 2) / view.s + H / 2 - view.y;
    var best = null, bd = 1e9;
    agents.forEach(function(a){
      var d = Math.hypot(wx - a.sx, wy - a.sy);
      if (d < bd){ bd = d; best = a; }
    });
    if (best && bd < 46 && opts.onAgentClick) opts.onAgentClick(best);
  }

  /* ---------- trails (delegation energy) ---------- */
  function trail(fromRoomId, toRoomId, hue){
    var f = roomById[fromRoomId], t = roomById[toRoomId];
    if (!f || !t) return;
    trails.push({ x1: f.wx, y1: f.wy, x2: t.wx, y2: t.wy, t0: performance.now(), dur: 900, hue: hue || "#FFC93C" });
  }

  /* ---------- environment ---------- */
  function drawCorridors(t){
    rooms.forEach(function(r){
      if (r.id === "command") return;
      var c = roomById.command;
      ctx.strokeStyle = "rgba(90,110,170,.16)"; ctx.lineWidth = 12;
      ctx.beginPath(); ctx.moveTo(c.wx, c.wy); ctx.lineTo(r.wx, r.wy); ctx.stroke();
      ctx.strokeStyle = "rgba(120,200,255,.22)"; ctx.lineWidth = 1.6;
      ctx.setLineDash([6, 10]);
      ctx.lineDashOffset = REDUCED ? 0 : -(t / 40) % 16;
      ctx.beginPath(); ctx.moveTo(c.wx, c.wy); ctx.lineTo(r.wx, r.wy); ctx.stroke();
      ctx.setLineDash([]);
    });
  }
  function drawPlatform(r, t){
    var top = hexPts(r.wx, r.wy, HEX), d = 24;
    for (var i = 0; i < 6; i++){
      var a = top[i], b = top[(i + 1) % 6];
      if ((a[1] + b[1]) / 2 >= r.wy){
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
        ctx.lineTo(b[0], b[1] + d); ctx.lineTo(a[0], a[1] + d);
        ctx.closePath(); ctx.fillStyle = "#252E4E"; ctx.fill();
      }
    }
    tracePoly(top); ctx.fillStyle = "#343E64"; ctx.fill();
    ctx.strokeStyle = r.hue; ctx.lineWidth = 3; ctx.stroke();
    tracePoly(hexPts(r.wx, r.wy, HEX - 10));
    ctx.strokeStyle = "rgba(255,255,255,.12)"; ctx.lineWidth = 1; ctx.stroke();
    if (r.island){
      // THE INTERNET island: globe with latitude lines + satellite dish
      var gx = r.wx, gy = r.wy - 12;
      ctx.beginPath(); ctx.arc(gx, gy, 17, 0, 6.29);
      ctx.fillStyle = "#123B52"; ctx.fill();
      ctx.strokeStyle = "#37D6E0"; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.strokeStyle = "rgba(55,214,224,.6)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(gx, gy, 17, 6.5, 0, 0, 6.29); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(gx, gy, 8, 16.5, 0, 0, 6.29); ctx.stroke();
      var blink = REDUCED ? 0.7 : 0.4 + 0.4 * Math.abs(Math.sin(t / 500));
      ctx.beginPath(); ctx.arc(gx, gy - 24, 3, 0, 6.29);
      ctx.fillStyle = "rgba(55,224,165," + blink + ")"; ctx.fill();
      ctx.strokeStyle = "#4A5C8F";
      ctx.beginPath(); ctx.moveTo(gx, gy - 17); ctx.lineTo(gx, gy - 22); ctx.stroke();
      ctx.font = "700 9px 'IBM Plex Mono', monospace";
      ctx.fillStyle = "rgba(55,214,224,.8)";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("RESEARCH ZONE", r.wx, r.wy + HEX * K * 0.45);
      return;
    }
    // consoles at the back of the room, glowing screens flickering
    [-1, 1].forEach(function(side){
      var dx = r.wx + side * HEX * 0.52, dy = r.wy - HEX * K * 0.42;
      ctx.fillStyle = "#1C2340";
      ctx.beginPath(); ctx.roundRect(dx - 13, dy - 4, 26, 10, 3); ctx.fill();
      var flick = REDUCED ? 0.5 : 0.42 + 0.2 * Math.abs(Math.sin(t / 700 + side + r.wx));
      ctx.fillStyle = "rgba(110,220,255," + flick + ")";
      ctx.beginPath(); ctx.roundRect(dx - 10, dy - 14, 20, 10, 2); ctx.fill();
      ctx.strokeStyle = "#4A5C8F"; ctx.lineWidth = 1;
      ctx.strokeRect(dx - 10, dy - 14, 20, 10);
    });
  }
  function drawRoomLabel(r){
    ctx.font = "700 12px 'IBM Plex Mono', monospace";
    var tw = ctx.measureText(r.name).width;
    var ly = r.wy - HEX * K * 0.62;
    ctx.fillStyle = "rgba(16,21,42,.92)";
    ctx.beginPath(); ctx.roundRect(r.wx - tw / 2 - 8, ly - 10, tw + 16, 20, 10); ctx.fill();
    ctx.strokeStyle = r.hue; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = r.hue; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(r.name, r.wx, ly);
  }

  /* ---------- fighters (vector fallback) ---------- */
  // character emblems — the classic identifiers, like the old sprite games
  var EMBLEMS = {
    "GOKU":      { glyph:"悟", bg:"#E8681A" },
    "GOHAN":     { glyph:"飯", bg:"#6B3FA0" },
    "GOTEN":     { glyph:"悟", bg:"#3EA6D8" },
    "VEGETA":    { glyph:"V",  bg:"#2743B5" },
    "TRUNKS":    { glyph:"CC", bg:"#F4F0E4", fg:"#B3261E", small:true },
    "BULMA":     { glyph:"CC", bg:"#F4F0E4", fg:"#B3261E", small:true },
    "PICCOLO":   { glyph:"魔", bg:"#3E7D4E" },
    "DENDE":     { glyph:"神", bg:"#4E9E5F" },
    "KRILLIN":   { glyph:"亀", bg:"#E8681A" },
    "TIEN":      { glyph:"天", bg:"#3E8F4E" },
    "MAJIN BUU": { glyph:"M",  bg:"#F2A0C4", fg:"#5B3FA8" },
    "HERCULE":   { glyph:"★",  bg:"#C9A227" },
    "ANDROID 17":{ glyph:"RR", bg:"#B3261E", small:true },
    "ANDROID 18":{ glyph:"RR", bg:"#B3261E", small:true },
    "BARDOCK":   { glyph:"S",  bg:"#274A2E" },
    "HIT":       { glyph:"時", bg:"#5A4FA8" },
    "YAJIROBE":  { glyph:"刀", bg:"#8A5A38" },
    "ANTIDOTE":  { glyph:"A",  bg:"#2E7D5B" }
  };
  var HR = 6.2;
  var HAIRSPECS = {
    goku:   [[152,6],[128,9.5],[104,12.5],[86,10.5],[62,9],[38,6]],
    goten:  [[150,7],[120,10.5],[92,11.5],[62,8.5],[34,5.5]],
    gohan:  [[142,7],[114,10.5],[90,12.5],[64,8.5],[40,5.5]],
    bardock:[[156,6],[132,10],[102,12.5],[76,9.5],[50,8.5],[26,5]],
    vegeta: [[118,10],[104,14.5],[90,16.5],[76,14.5],[62,10]]
  };
  function spikeFan(x, hy, spec, col, powered){
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(x, hy, HR + 0.8, Math.PI * 1.03, -0.03); ctx.closePath(); ctx.fill();
    spec.forEach(function(s){
      var A = s[0] * Math.PI / 180, L = s[1] * (powered ? 1.55 : 1);
      var b1x = x + Math.cos(A + 0.34) * HR, b1y = hy - Math.sin(A + 0.34) * HR;
      var b2x = x + Math.cos(A - 0.34) * HR, b2y = hy - Math.sin(A - 0.34) * HR;
      var tx = x + Math.cos(A) * (HR + L), ty = hy - Math.sin(A) * (HR + L) - (powered ? 1.5 : 0);
      ctx.beginPath(); ctx.moveTo(b1x, b1y); ctx.lineTo(tx, ty); ctx.lineTo(b2x, b2y); ctx.closePath(); ctx.fill();
    });
  }
  function drawHair(a, x, hy, p){
    var c = a.char, powered = p > 0.5 && c.saiyan;
    var col = powered ? "#FFD84A" : c.hairC;
    if (c.hair === "bald") return;
    if (HAIRSPECS[c.hair]){
      spikeFan(x, hy, HAIRSPECS[c.hair], col, powered);
      if (c.hair === "goku" || c.hair === "goten"){
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.moveTo(x-4.6,hy-4.4); ctx.lineTo(x-2.6,hy-0.6); ctx.lineTo(x-0.8,hy-4.8); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x-0.6,hy-4.8); ctx.lineTo(x+1.6,hy-1.2); ctx.lineTo(x+3.6,hy-4.6); ctx.closePath(); ctx.fill();
      }
      if (c.hair === "vegeta"){
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.moveTo(x-2.6,hy-4.6); ctx.lineTo(x,hy-0.8); ctx.lineTo(x+2.6,hy-4.6); ctx.closePath(); ctx.fill();
      }
      if (c.hair === "bardock"){
        ctx.fillStyle = "#B3261E";
        ctx.beginPath(); ctx.roundRect(x-6.6,hy-2.8,13.2,2.6,1.3); ctx.fill();
      }
      return;
    }
    if (c.hair === "antennae"){
      if (c.turban){
        ctx.fillStyle = "#F4F0E4";
        ctx.beginPath(); ctx.arc(x, hy-1.2, HR+1, Math.PI*1.04, -0.04); ctx.closePath(); ctx.fill();
        ctx.fillRect(x-HR-1, hy-2.6, (HR+1)*2, 2.6);
        ctx.strokeStyle = "#C9C2B2"; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(x-3,hy-6.8); ctx.quadraticCurveTo(x,hy-8.4,x+3,hy-6.8); ctx.stroke();
      } else {
        ctx.strokeStyle = c.hairC; ctx.lineWidth = 1.7; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(x-2,hy-4.6); ctx.quadraticCurveTo(x-5.5,hy-10,x-3.5,hy-12); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x+2,hy-4.6); ctx.quadraticCurveTo(x+5.5,hy-10,x+3.5,hy-12); ctx.stroke();
        ctx.lineCap = "butt";
      }
      ctx.fillStyle = c.skin;
      ctx.beginPath(); ctx.moveTo(x-HR+0.6,hy-1.5); ctx.lineTo(x-HR-2.6,hy+0.5); ctx.lineTo(x-HR+0.8,hy+2); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x+HR-0.6,hy-1.5); ctx.lineTo(x+HR+2.6,hy+0.5); ctx.lineTo(x+HR-0.8,hy+2); ctx.closePath(); ctx.fill();
      return;
    }
    if (c.hair === "tentacle"){
      ctx.strokeStyle = col; ctx.lineWidth = 4.2; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(x, hy-HR+1.4);
      ctx.quadraticCurveTo(x+6, hy-HR-7-(powered?3:0), x+1, hy-HR-11-(powered?4:0));
      ctx.stroke(); ctx.lineCap = "butt";
      return;
    }
    if (c.hair === "hat"){
      ctx.fillStyle = c.hairC;
      ctx.beginPath(); ctx.arc(x, hy-0.4, HR+0.9, Math.PI*1.02, -0.02); ctx.closePath(); ctx.fill();
      ctx.fillRect(x-HR-0.9, hy-1.6, (HR+0.9)*2, 2.4);
      ctx.beginPath(); ctx.roundRect(x-HR-4.6, hy-0.6, 6.5, 2.2, 1.1);
      ctx.fillStyle = shade(c.hairC, 1.5); ctx.fill();
      ctx.beginPath(); ctx.arc(x, hy-4.6, 1.5, 0, 6.29);
      ctx.fillStyle = (p > 0.5) ? "#FFD84A" : "#37E0A5"; ctx.fill();
      return;
    }
    if (c.hair === "afro"){
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(x, hy-2, 8.4, Math.PI*1.12, -0.12); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(x-6.4, hy-1, 3.2, 0, 6.29); ctx.fill();
      ctx.beginPath(); ctx.arc(x+6.4, hy-1, 3.2, 0, 6.29); ctx.fill();
      return;
    }
    if (c.hair === "bob"){
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(x-HR-0.9, hy+3.6); ctx.lineTo(x-HR-0.9, hy-1);
      ctx.arc(x, hy-0.2, HR+0.9, Math.PI, 0);
      ctx.lineTo(x+HR+0.9, hy+3.6); ctx.lineTo(x+HR-1.4, hy+3.6);
      ctx.lineTo(x+HR-1.4, hy-1.6);
      ctx.quadraticCurveTo(x, hy-4.6, x-HR+1.4, hy-1.6);
      ctx.lineTo(x-HR+1.4, hy+3.6); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = shade(c.hairC, 0.72); ctx.lineWidth = 0.9;
      var px = c.part === "side" ? x + 2.2 : x;
      ctx.beginPath(); ctx.moveTo(px, hy-HR+0.4); ctx.lineTo(px+0.8, hy-3.4); ctx.stroke();
      if (powered){ spikeFan(x, hy, [[118,9],[92,11.5],[66,9]], "#FFD84A", true); }
      return;
    }
    if (c.hair === "long"){
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(x-HR-1.4, hy+7);
      ctx.quadraticCurveTo(x-HR-2, hy-3, x-3, hy-HR-1);
      ctx.quadraticCurveTo(x, hy-HR-1.8, x+3, hy-HR-1);
      ctx.quadraticCurveTo(x+HR+2, hy-3, x+HR+1.4, hy+7);
      ctx.lineTo(x+HR-1.2, hy+7); ctx.lineTo(x+HR-1.2, hy-1.4);
      ctx.quadraticCurveTo(x, hy-4.4, x-HR+1.2, hy-1.4);
      ctx.lineTo(x-HR+1.2, hy+7); ctx.closePath(); ctx.fill();
    }
  }

  function auraColorFor(a){
    if (a.status === "thinking") return [169,139,232];
    if (a.status === "delegating") return [232,134,58];
    if (a.status === "complete") return [55,224,101];
    if (a.status === "error") return [229,80,74];
    return a.char.saiyan ? [255,201,60] : [120,200,255];
  }
  function drawAura(x, y, p, t, rgb){
    if (p <= 0.02) return;
    for (var k = 2; k >= 0; k--){
      var flick = REDUCED ? 0 : Math.sin(t / 55 + k * 2.1) * 3;
      var rx = (16 + k * 6) * p, ry = (26 + k * 7) * p + flick;
      ctx.beginPath();
      ctx.moveTo(x - rx, y);
      ctx.quadraticCurveTo(x - rx*1.1, y - ry*0.9, x - rx*0.25, y - ry*1.15);
      ctx.quadraticCurveTo(x, y - ry*1.45, x + rx*0.25, y - ry*1.15);
      ctx.quadraticCurveTo(x + rx*1.1, y - ry*0.9, x + rx, y);
      ctx.closePath();
      ctx.fillStyle = "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + (0.16 - k * 0.04) * p + ")";
      ctx.fill();
    }
  }

  function drawFighter(a, t){
    var c = a.char, p = a.power;
    var flying = !!a.fly;
    var moving = flying || Math.hypot(a.tx - a.x, a.ty - a.y) > 2;
    var walk = (!REDUCED && moving && !flying) ? Math.sin(t / 120 + a.phase) : 0;
    var hover = flying ? 6 + Math.sin(t / 150) * 2 : 0;
    var bob = REDUCED ? 0 : (p > 0.5 ? Math.sin(t / 90 + a.phase) * 1.6 : Math.sin(t / 500 + a.phase) * 0.7);

    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.scale(FS * (a.boss ? 1.12 : 1), FS * (a.boss ? 1.12 : 1));
    var x = 0, y = -bob - hover;

    ctx.beginPath(); ctx.ellipse(0, 11, 10, 3.6, 0, 0, 6.29);
    ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fill();

    drawAura(x, y + 9, p, t, auraColorFor(a));

    if (a.img){
      // supplied transparent character asset replaces the vector body,
      // drawn at its true aspect ratio, pixel-crisp;
      // powered up + an -ssj sprite exists => Super Saiyan form
      var spr = (p > 0.5 && a.imgSSJ) ? a.imgSSJ : a.img;
      var ih = (spr === a.imgSSJ) ? 62 : 56;
      var iw = ih * (spr.width / spr.height || 0.6);
      var wasSmooth = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(spr, x - iw / 2, y - ih + 9, iw, ih);
      ctx.imageSmoothingEnabled = wasSmooth;
    } else {
      // legs
      ctx.fillStyle = c.pants;
      if (flying){
        ctx.beginPath(); ctx.roundRect(x-5.5, y-4, 4.6, 12, 2.2); ctx.fill();
        ctx.beginPath(); ctx.roundRect(x+0.9, y-5.5, 4.6, 12, 2.2); ctx.fill();
      } else {
        ctx.beginPath(); ctx.roundRect(x-5.5+walk*2.4, y-4, 4.6, 13, 2.2); ctx.fill();
        ctx.beginPath(); ctx.roundRect(x+0.9-walk*2.4, y-4, 4.6, 13, 2.2); ctx.fill();
      }
      ctx.fillStyle = c.boot || shade(c.pants, 0.6);
      ctx.beginPath(); ctx.roundRect(x-5.5+(flying?0:walk*2.4), y+6.5, 4.6, 3, 1.4); ctx.fill();
      ctx.beginPath(); ctx.roundRect(x+0.9-(flying?0:walk*2.4), y+(flying?4.5:6.5), 4.6, 3, 1.4); ctx.fill();

      var flare = p * 4;
      [-1, 1].forEach(function(side){
        ctx.save();
        ctx.translate(x + side * (8.5 + flare * 0.6), y - 18);
        ctx.rotate(side * (0.15 + p * 0.55));
        ctx.fillStyle = c.gi;
        ctx.beginPath(); ctx.roundRect(-1.8, 0, 3.6, 13, 1.8); ctx.fill();
        if (c.cuff){ ctx.fillStyle = c.cuff; ctx.beginPath(); ctx.roundRect(-1.9, 9.6, 3.8, 3.4, 1.6); ctx.fill(); }
        ctx.restore();
      });

      var g = ctx.createLinearGradient(x-8, y-21, x+8, y);
      g.addColorStop(0, c.gi); g.addColorStop(1, shade(c.gi, 0.75));
      ctx.beginPath();
      ctx.moveTo(x-7.5, y-20);
      ctx.quadraticCurveTo(x-8.5, y-9, x-5, y-2);
      ctx.lineTo(x+5, y-2);
      ctx.quadraticCurveTo(x+8.5, y-9, x+7.5, y-20);
      ctx.closePath(); ctx.fillStyle = g; ctx.fill();

      // per-character outfit signatures
      if (a.name === "GOKU" || a.name === "KRILLIN"){
        ctx.strokeStyle = a.name === "GOKU" ? "#2B4C9B" : "#F4F0E4"; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(x-4.5,y-20); ctx.lineTo(x,y-14.5); ctx.lineTo(x+4.5,y-20); ctx.stroke();
      }
      if (a.name === "TRUNKS"){ ctx.fillStyle="#1A1E24"; ctx.beginPath(); ctx.roundRect(x-3,y-20,6,15,2); ctx.fill(); }
      if (a.name === "MAJIN BUU"){
        ctx.fillStyle = "#6B3FA0";
        ctx.beginPath(); ctx.roundRect(x-9.5,y-22,19,4.2,2); ctx.fill();
        ctx.fillStyle = "#E8C84A"; ctx.fillRect(x-7,y-20,2.6,13); ctx.fillRect(x+4.4,y-20,2.6,13);
      }
      if (a.name === "VEGETA"){ ctx.fillStyle="#E8C84A"; ctx.fillRect(x-4.8,y-20.5,2.2,4.6); ctx.fillRect(x+2.6,y-20.5,2.2,4.6); }
      if (a.name === "PICCOLO"){ ctx.fillStyle="#F4F0E4"; ctx.beginPath(); ctx.roundRect(x-10,y-22.5,20,4.6,2.2); ctx.fill(); }
      if (a.name === "HIT"){
        ctx.strokeStyle = shade(c.gi, 0.7); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x-3.4,y-19); ctx.lineTo(x-3.4,y-3); ctx.moveTo(x+3.4,y-19); ctx.lineTo(x+3.4,y-3); ctx.stroke();
      }
      ctx.fillStyle = c.belt || shade(c.pants, 1.2);
      ctx.fillRect(x-5.5, y-4.5, 11, 2.4);

      var hy = y - 27;
      if (a.faceImg){
        // the Commander's real face — full head, no cap covering it
        var fr = HR + 3.4;
        ctx.save();
        ctx.beginPath(); ctx.arc(x, hy - 1, fr, 0, 6.29); ctx.clip();
        ctx.drawImage(a.faceImg, x - fr, hy - 1 - fr, fr * 2, fr * 2);
        ctx.restore();
        ctx.beginPath(); ctx.arc(x, hy - 1, fr, 0, 6.29);
        ctx.strokeStyle = (p > 0.5) ? "#FFD84A" : "#37E0A5"; ctx.lineWidth = 1.4; ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(x, hy, HR, 0, 6.29);
        ctx.fillStyle = c.skin; ctx.fill();
        ctx.fillStyle = (p > 0.5 && c.saiyan) ? "#2BB8A8" : "#1A1E24";
        ctx.fillRect(x-3, y-27, 1.8, 1.8); ctx.fillRect(x+1.2, y-27, 1.8, 1.8);
        ctx.strokeStyle = "#1A1E24"; ctx.lineWidth = 0.9;
        var browTilt = (a.name === "VEGETA" || p > 0.5) ? 1.1 : 0.4;
        ctx.beginPath(); ctx.moveTo(x-3.6,y-28.2); ctx.lineTo(x-0.9,y-28.2+browTilt); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x+3.6,y-28.2); ctx.lineTo(x+0.9,y-28.2+browTilt); ctx.stroke();
        if (c.freckles){
          ctx.fillStyle = shade(c.skin, 0.55);
          ctx.fillRect(x-4.4,y-24.6,1,1); ctx.fillRect(x-3,y-23.8,1,1); ctx.fillRect(x-4.8,y-23.2,1,1);
          ctx.fillRect(x+3.4,y-24.6,1,1); ctx.fillRect(x+2,y-23.8,1,1); ctx.fillRect(x+3.8,y-23.2,1,1);
        }
      }
      if (a.name === "KRILLIN"){
        ctx.fillStyle = "#8A5A38";
        [-1.4,0,1.4].forEach(function(dy){ ctx.fillRect(x-1.7,hy-4.6+dy*1.4,0.9,0.9); ctx.fillRect(x+0.8,hy-4.6+dy*1.4,0.9,0.9); });
      }
      if (a.name === "TIEN"){ ctx.fillStyle="#1A1E24"; ctx.fillRect(x-0.7,hy-4.4,1.4,2.2); }
      if (a.name === "HERCULE"){ ctx.fillStyle="#3A2A1C"; ctx.fillRect(x-3.4,hy+1.6,2.8,1.5); ctx.fillRect(x+0.6,hy+1.6,2.8,1.5); }
      if (a.name === "ANDROID 17"){ ctx.fillStyle="#E8681A"; ctx.beginPath(); ctx.roundRect(x-5,hy+6.2,10,2.4,1.2); ctx.fill(); }
      if (!a.faceImg) drawHair(a, x, hy, p);
    }

    // status dot
    var sc = STATUS_COLORS[a.status] || STATUS_COLORS.idle;
    var pulse = REDUCED ? 1 : 1 + 0.18 * Math.sin(t / 260 + a.phase);
    ctx.beginPath(); ctx.arc(0, y - 42, 3.2 * pulse, 0, 6.29);
    ctx.fillStyle = sc; ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.lineWidth = 0.8; ctx.stroke();

    // name pill + character emblem badge (the old-sprite identifiers)
    var label = a.name + (a.auto ? " ⏰" : "");
    ctx.font = "700 10px 'IBM Plex Mono', monospace";
    var tw = ctx.measureText(label).width;
    var py = 14 + a.li * 16;
    ctx.fillStyle = p > 0.5 ? "rgba(255,201,60,.92)" : "rgba(10,14,28,.8)";
    ctx.beginPath(); ctx.roundRect(-tw/2 - 5, py, tw + 10, 15, 7); ctx.fill();
    ctx.fillStyle = p > 0.5 ? "#241505" : "#FFE9CE";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(label, 0, py + 7.5);
    var em = EMBLEMS[a.name];
    if (em){
      var ex = -tw/2 - 14, ey = py + 7.5;
      ctx.beginPath(); ctx.arc(ex, ey, 8, 0, 6.29);
      ctx.fillStyle = em.bg; ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = em.fg || "#FFF";
      ctx.font = "700 " + (em.small ? 7 : 9) + "px 'Archivo', sans-serif";
      ctx.fillText(em.glyph, ex, ey + 0.5);
    }
    ctx.restore();

    a.sx = a.x; a.sy = a.y - 20 * FS;
  }

  /* ---------- flights (ambient + research trips to The Internet) ---------- */
  function startFlight(a, now, destRoom, visitMs, research){
    var dest = destRoom || (function(){
      var others = rooms.filter(function(r){ return r.id !== a.room && !r.island; });
      return others[Math.floor(Math.random() * others.length)];
    })();
    a.fly = {
      t0: now, dur: 1600, fx: a.x, fy: a.y,
      txx: dest.wx + (Math.random() * 60 - 30), tyy: dest.wy + 34,
      stage: "out", visitUntil: 0, visitMs: visitMs || 2600, research: !!research
    };
    a.powerUntil = now + 9000;
    flyBusy = true;
  }
  function stepFlight(a, now){
    var f = a.fly;
    if (f.stage === "out" || f.stage === "home"){
      var u = Math.min((now - f.t0) / f.dur, 1);
      var e = u < 0.5 ? 2*u*u : 1 - Math.pow(-2*u + 2, 2) / 2;
      a.x = f.fx + (f.txx - f.fx) * e;
      a.y = f.fy + (f.tyy - f.fy) * e - Math.sin(u * Math.PI) * 50;
      if (u >= 1){
        if (f.stage === "out"){
          f.stage = "visit"; f.visitUntil = now + f.visitMs;
          if (f.research){
            manager.updateStatus(a.id, "thinking", "Researching on The Internet — trends, footage, knowledge");
            if (window.Feed) Feed.log("<b>" + a.name + "</b> flew to THE INTERNET — researching…", "#37D6E0");
          }
        } else {
          a.fly = null; flyBusy = false; a.tx = a.x; a.ty = a.y;
          if (f.research){
            manager.updateStatus(a.id, "idle", null);
            a.nextResearch = now + 90000 + Math.random() * 150000;
            if (window.Feed) Feed.log("<b>" + a.name + "</b> back from THE INTERNET with notes.", "#37D6E0");
          }
        }
      }
    } else if (f.stage === "visit" && now > f.visitUntil){
      f.stage = "home"; f.t0 = now; f.fx = a.x; f.fy = a.y; f.txx = a.hx; f.tyy = a.hy;
    }
  }

  /* ---------- frame ---------- */
  var last = 0;
  function frame(t){
    var dt = Math.min((t - last) / 1000, 0.05); last = t;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // stars
    for (var i = 0; i < 46; i++){
      var sx = (i * 197) % W, sy = (i * 127) % H;
      ctx.fillStyle = "rgba(255,255,255," + (0.1 + (i % 3) * 0.07) + ")";
      ctx.fillRect(sx, sy, 1.6, 1.6);
    }
    // view transform: zoom around canvas center, then pan
    ctx.setTransform(DPR * view.s, 0, 0, DPR * view.s,
      DPR * ((W / 2) * (1 - view.s) + view.x * view.s),
      DPR * ((H / 2) * (1 - view.s) + view.y * view.s));

    drawCorridors(t);
    rooms.slice().sort(function(a,b){ return a.wy - b.wy; }).forEach(function(r){ drawPlatform(r, t); });

    var now = t;
    agents.forEach(function(a){
      var busy = (a.status === "working" || a.status === "thinking" || a.status === "delegating");
      var want = (a.panelOpen || busy || now < a.powerUntil) ? 1 : (a.status === "complete" ? 0.65 : 0);
      a.prevPower = a.power;
      a.power += (want - a.power) * Math.min(dt * 4, 1);
      if (REDUCED) a.power = want;
      if (a.prevPower <= 0.5 && a.power > 0.5 && opts.chargeSound) opts.chargeSound();

      if (a.research && !a.nextResearch) a.nextResearch = now + 8000 + Math.random() * 40000;
      if (a.fly){ stepFlight(a, now); }
      else if (!REDUCED && a.research && !flyBusy && !busy && now > a.nextResearch){
        startFlight(a, now, roomById.internet, 16000 + Math.random() * 14000, true);
      }
      else if (!REDUCED && !flyBusy && !busy && Math.random() < 0.0003){ startFlight(a, now); }
      else if (!REDUCED && !a.fly){
        var dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy);
        if (d < 2){
          if (Math.random() < 0.006){
            var ang = Math.random() * 6.28, rr = Math.random();
            a.tx = a.hx + Math.cos(ang) * 30 * rr;
            a.ty = a.hy + Math.sin(ang) * 14 * rr;
          }
        } else { a.x += dx/d * 26 * dt; a.y += dy/d * 26 * dt; }
      }
    });

    agents.slice().sort(function(a,b){ return a.y - b.y; }).forEach(function(a){ drawFighter(a, t); });
    rooms.forEach(drawRoomLabel);

    // delegation trails on top
    trails = trails.filter(function(tr){
      var u = (t - tr.t0) / tr.dur;
      if (u >= 1) return false;
      var px = tr.x1 + (tr.x2 - tr.x1) * u;
      var py = tr.y1 + (tr.y2 - tr.y1) * u - Math.sin(u * Math.PI) * 40;
      ctx.strokeStyle = "rgba(255,201,60,.28)"; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(tr.x1, tr.y1);
      ctx.quadraticCurveTo((tr.x1+tr.x2)/2, Math.min(tr.y1,tr.y2)-60, px, py); ctx.stroke();
      ctx.beginPath(); ctx.arc(px, py, 5, 0, 6.29);
      ctx.fillStyle = tr.hue; ctx.fill();
      ctx.beginPath(); ctx.arc(px, py, 9, 0, 6.29);
      ctx.fillStyle = "rgba(255,201,60,.25)"; ctx.fill();
      return true;
    });

    requestAnimationFrame(frame);
  }

  return { init: init, trail: trail, agents: function(){ return agents; } };
})();
