/* StormBurger storm FX: every 10–15s during a run the sky does something big.
   1) Lightning strike: branching bolt, 2–3 white flickers, camera shake, cracked glass that heals.
   2) Tornado pass: dark funnel of spinning particle rings sweeps across, StormBurger junk orbiting it.
   3) Rainstorm: heavy rain, lens-like drops bead up on the glass, merge and slide, then a wiper clears them.
   Visual only: a pointer-events:none canvas on top of #game. It reads window.__S and never writes to it,
   so input, hazards and scoring are untouched. Debug: window.__STORM.trigger('lightning'|'tornado'|'rain'). */
(function(){
"use strict";
var game=document.getElementById("game"); if(!game||!window.__S) return;
var reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
var W=400,H=560,D=Math.min(2,window.devicePixelRatio||1),TAU=Math.PI*2;

/* ---------- layer ---------- */
var st=document.createElement("style");
st.textContent=".sfx-wrap{position:relative;border-radius:12px;transform-origin:50% 60%}"+
  ".sfx{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;border-radius:12px}";
document.head.appendChild(st);
var wrap=document.createElement("div"); wrap.className="sfx-wrap";
game.parentNode.insertBefore(wrap,game); wrap.appendChild(game);
var ov=document.createElement("canvas"); ov.className="sfx"; ov.setAttribute("aria-hidden","true");
ov.width=W*D; ov.height=H*D; wrap.appendChild(ov);
var c=ov.getContext("2d"); c.scale(D,D);
var GD=function(){ return game.width/W; }; // game canvas backing scale (for refraction sampling)

function rnd(a,b){ return a+Math.random()*(b-a); }
function clamp(v,a,b){ return v<a?a:v>b?b:v; }
function ease(p){ p=clamp(p,0,1); return p*p*(3-2*p); }
function env(t,inT,dur,outT){ return Math.min(clamp(t/inT,0,1),clamp((dur-t)/outT,0,1)); }
function shake(x,y,deg){ wrap.style.transform=reduce?"":"translate("+x.toFixed(1)+"px,"+y.toFixed(1)+"px) rotate("+(deg||0).toFixed(2)+"deg)"; }
function flash(a,col){ if(a<=0) return; c.fillStyle=col||"#f4faff"; c.globalAlpha=clamp(a,0,1); c.fillRect(0,0,W,H); c.globalAlpha=1; }

/* ---------- sprites (no image files: canvas + emoji, plus the logo the page already loads) ---------- */
function mk(w,h,f){ var k=document.createElement("canvas"); k.width=w; k.height=h; f(k.getContext("2d"),w,h); return k; }
function blob(r,g,b){ return mk(64,64,function(x){ var gr=x.createRadialGradient(32,32,0,32,32,32);
  gr.addColorStop(0,"rgba("+r+","+g+","+b+",1)"); gr.addColorStop(.45,"rgba("+r+","+g+","+b+",.55)"); gr.addColorStop(1,"rgba("+r+","+g+","+b+",0)");
  x.fillStyle=gr; x.fillRect(0,0,64,64); }); }
var DARK=blob(34,36,48), MID=blob(92,98,118), LIGHT=blob(170,178,196), DUST=blob(96,78,60);
function emoji(e){ return mk(80,80,function(x){ x.font="58px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',system-ui"; x.textAlign="center"; x.textBaseline="middle"; x.fillText(e,40,44); }); }
var WRAPPER=mk(80,80,function(x){ // crumpled burger foil
  x.translate(40,40); var p=[[-30,-18],[-12,-30],[8,-24],[30,-28],[26,-4],[32,18],[10,28],[-8,22],[-30,26],[-24,4]];
  var g=x.createLinearGradient(-30,-30,30,30); g.addColorStop(0,"#fff6d6"); g.addColorStop(.5,"#f2c74a"); g.addColorStop(1,"#d79a1e");
  x.fillStyle=g; x.beginPath(); p.forEach(function(q,i){ i?x.lineTo(q[0],q[1]):x.moveTo(q[0],q[1]); }); x.closePath(); x.fill();
  x.strokeStyle="rgba(120,70,0,.55)"; x.lineWidth=1.4; x.beginPath(); x.moveTo(-20,-12); x.lineTo(4,2); x.lineTo(-6,18); x.moveTo(6,-20); x.lineTo(4,2); x.lineTo(24,10); x.stroke();
  x.fillStyle="#E8582A"; x.beginPath(); x.moveTo(2,-14); x.lineTo(-8,2); x.lineTo(-1,2); x.lineTo(-5,14); x.lineTo(7,-2); x.lineTo(0,-2); x.closePath(); x.fill(); });
var NAPKIN=mk(80,80,function(x){ x.translate(40,40); x.rotate(.3);
  x.fillStyle="#f7f8fb"; x.beginPath(); x.moveTo(-26,-24); x.lineTo(24,-28); x.lineTo(28,22); x.lineTo(-22,26); x.closePath(); x.fill();
  x.strokeStyle="rgba(90,100,130,.4)"; x.lineWidth=1.2; x.beginPath(); x.moveTo(-24,0); x.lineTo(26,-3); x.moveTo(0,-26); x.lineTo(3,24); x.stroke();
  x.fillStyle="rgba(37,71,184,.85)"; x.fillRect(-20,-20,8,8); });
var LOGO=new Image(); LOGO.src="img/logo.png"; var SIGN=null;
function sign(){ if(SIGN) return SIGN; var ok=LOGO.complete&&LOGO.naturalWidth;
  var s=mk(150,66,function(x){ x.fillStyle="#2b2f3a"; x.fillRect(70,48,10,18); // post stub
    x.fillStyle="#fff"; x.strokeStyle="#E8582A"; x.lineWidth=5; x.beginPath(); x.roundRect?x.roundRect(4,4,142,46,9):x.rect(4,4,142,46); x.fill(); x.stroke();
    if(ok){ var lw=128, lh=lw*LOGO.naturalHeight/LOGO.naturalWidth; x.drawImage(LOGO,11,27-lh/2,lw,lh); }
    else { x.fillStyle="#2547B8"; x.font="400 32px 'Bebas Neue',Impact,sans-serif"; x.textAlign="center"; x.textBaseline="middle"; x.fillText("STORMBURGER",75,28); } });
  if(ok) SIGN=s; return s; }

/* ---------- 1) LIGHTNING STRIKE ---------- */
function boltLine(x0,y0,x1,y1,disp,iters){
  var pts=[[x0,y0],[x1,y1]];
  for(var it=0;it<iters;it++){ var np=[pts[0]];
    for(var i=1;i<pts.length;i++){ var a=pts[i-1],b=pts[i], dx=b[0]-a[0], dy=b[1]-a[1], L=Math.hypot(dx,dy)||1, o=(Math.random()-.5)*disp;
      np.push([(a[0]+b[0])/2-dy/L*o,(a[1]+b[1])/2+dx/L*o],b); }
    pts=np; disp*=0.52; }
  return pts;
}
function makeStrike(){
  var ix=rnd(W*0.28,W*0.72), iy=rnd(H*0.42,H*0.64), sx=clamp(ix+rnd(-160,160),20,W-20);
  var main=boltLine(sx,-20,ix,iy,170,7), segs=[{p:main,w:1}];
  for(var b=0;b<7;b++){ var k=(6+Math.random()*(main.length-30))|0, o=main[k], ang=Math.atan2(iy-o[1],ix-o[0])+rnd(-1.1,1.1), len=rnd(60,190);
    var br=boltLine(o[0],o[1],o[0]+Math.cos(ang)*len,o[1]+Math.sin(ang)*len,len*0.5,5); segs.push({p:br,w:0.55});
    if(Math.random()<.6){ var o2=br[(br.length*rnd(.3,.7))|0], a2=ang+rnd(-.9,.9), l2=len*rnd(.3,.6); segs.push({p:boltLine(o2[0],o2[1],o2[0]+Math.cos(a2)*l2,o2[1]+Math.sin(a2)*l2,l2*.5,4),w:0.3}); } }
  // ground forks spraying out of the impact
  for(var f=0;f<4;f++){ var fa=rnd(0,TAU), fl=rnd(30,70); segs.push({p:boltLine(ix,iy,ix+Math.cos(fa)*fl,iy+Math.sin(fa)*fl,fl*.6,4),w:0.4}); }
  return {ix:ix,iy:iy,segs:segs,cr:makeCracks(ix,iy)};
}
function makeCracks(x,y){
  var n=17, rays=[], rings=[], shards=[], dust=[], i, j;
  for(i=0;i<n;i++){ var a=i/n*TAU+rnd(-.12,.12), L=Math.random()<.45?rnd(230,420):rnd(90,210), p=[[x,y]], d=[0], px=x, py=y, s=0, aa=a;
    while(s<L){ var st=rnd(14,30); aa+=rnd(-.22,.22); aa=a+clamp(aa-a,-.35,.35); px+=Math.cos(aa)*st; py+=Math.sin(aa)*st; s+=st; p.push([px,py]); d.push(s); }
    rays.push({p:p,d:d,L:L,a:a}); }
  function at(r,dist){ for(var k=1;k<r.p.length;k++) if(r.d[k]>=dist){ var f=(dist-r.d[k-1])/(r.d[k]-r.d[k-1]); return [r.p[k-1][0]+(r.p[k][0]-r.p[k-1][0])*f,r.p[k-1][1]+(r.p[k][1]-r.p[k-1][1])*f]; } return null; }
  var R=[16,34,58,90,130];
  for(j=0;j<R.length;j++) for(i=0;i<n;i++){ var r1=rays[i], r2=rays[(i+1)%n], rr=R[j]*rnd(.85,1.15);
    if(r1.L<rr||r2.L<rr||Math.random()<(j>2?.45:.15)) continue;
    var A=at(r1,rr), B=at(r2,rr*rnd(.9,1.1)); if(!A||!B) continue;
    var mx=(A[0]+B[0])/2, my=(A[1]+B[1])/2, pull=rnd(.75,.92); // web strands sag toward the impact
    rings.push({p:[A,[x+(mx-x)*pull,y+(my-y)*pull],B],r:rr});
    if(j<R.length-1&&Math.random()<.55){ var r3=R[j+1]; if(r1.L>r3&&r2.L>r3){ var C=at(r2,r3), Dd=at(r1,r3);
      shards.push({p:[A,B,C,Dd],r:rr,ox:rnd(-5,5),oy:rnd(-5,5),tint:Math.random()<.35?"rgba(160,220,255,":"rgba(255,255,255,",a:rnd(.05,.2)}); } } }
  for(i=0;i<26;i++){ var da=rnd(0,TAU), dr=rnd(2,13); dust.push([x+Math.cos(da)*dr,y+Math.sin(da)*dr,da,rnd(3,9)]); }
  return {x:x,y:y,rays:rays,rings:rings,shards:shards,dust:dust};
}
function drawBolt(S,a){
  c.save(); c.lineJoin="round"; c.lineCap="round"; c.globalCompositeOperation="lighter";
  var passes=[[22,"rgba(110,170,255,",.22],[9,"rgba(170,215,255,",.55],[3.2,"rgba(255,255,255,",1]];
  passes.forEach(function(ps){ S.segs.forEach(function(sg){ c.strokeStyle=ps[1]+(ps[2]*a)+")"; c.lineWidth=Math.max(.8,ps[0]*sg.w);
    c.beginPath(); sg.p.forEach(function(q,i){ i?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1]); }); c.stroke(); }); });
  var g=c.createRadialGradient(S.ix,S.iy,0,S.ix,S.iy,120); g.addColorStop(0,"rgba(255,255,255,"+a+")"); g.addColorStop(.25,"rgba(170,215,255,"+(.5*a)+")"); g.addColorStop(1,"rgba(120,170,255,0)");
  c.fillStyle=g; c.beginPath(); c.arc(S.ix,S.iy,120,0,TAU); c.fill(); c.restore();
}
function drawCracks(C,grow,heal){
  var a=1-heal, reach=grow*(1-heal), g=GD(), i;
  // refraction: each glass facet shows the road shifted a few pixels, like broken glass bending the light
  C.shards.forEach(function(s){ if(s.r>reach*430) return;
    c.save(); c.beginPath(); s.p.forEach(function(q,k){ k?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1]); }); c.closePath(); c.clip();
    c.globalAlpha=.85*a; c.drawImage(game,0,0,game.width,game.height,s.ox,s.oy,W,H);
    var b=s.p[0], e=s.p[2], lg=c.createLinearGradient(b[0],b[1],e[0],e[1]); lg.addColorStop(0,s.tint+(s.a*1.6)+")"); lg.addColorStop(.5,s.tint+"0)"); lg.addColorStop(1,s.tint+(s.a*.8)+")");
    c.globalAlpha=a; c.fillStyle=lg; c.fill(); c.restore(); });
  function path(p,limit,d){ c.beginPath(); c.moveTo(p[0][0],p[0][1]);
    for(var k=1;k<p.length;k++){ if(d&&d[k]>limit){ var f=(limit-d[k-1])/(d[k]-d[k-1]); c.lineTo(p[k-1][0]+(p[k][0]-p[k-1][0])*f,p[k-1][1]+(p[k][1]-p[k-1][1])*f); break; } c.lineTo(p[k][0],p[k][1]); } }
  c.save(); c.lineJoin="round"; c.lineCap="round";
  var layers=[[4.5,"rgba(190,225,255,",.18,0,0],[2.2,"rgba(0,0,0,",.55,1,1.2],[1.1,"rgba(255,255,255,",.95,0,0]];
  layers.forEach(function(L){ c.strokeStyle=L[1]+(L[2]*a)+")"; c.lineWidth=L[0]; c.save(); c.translate(L[3],L[4]);
    C.rays.forEach(function(r){ path(r.p,r.L*reach,r.d); c.stroke(); });
    C.rings.forEach(function(r){ if(r.r<=reach*420*0.9){ path(r.p); c.stroke(); } }); c.restore(); });
  // pulverised impact
  var ig=c.createRadialGradient(C.x,C.y,0,C.x,C.y,16); ig.addColorStop(0,"rgba(255,255,255,"+(.9*a)+")"); ig.addColorStop(1,"rgba(220,240,255,0)");
  c.fillStyle=ig; c.beginPath(); c.arc(C.x,C.y,16,0,TAU); c.fill();
  c.strokeStyle="rgba(255,255,255,"+(.8*a)+")"; c.lineWidth=.8; c.beginPath();
  C.dust.forEach(function(q){ c.moveTo(q[0],q[1]); c.lineTo(q[0]+Math.cos(q[2]+1.2)*q[3],q[1]+Math.sin(q[2]+1.2)*q[3]); }); c.stroke();
  c.restore();
}
function lightning(){
  var S=makeStrike(), buzzed=false;
  return {dur:1.5,draw:function(t){
    if(!buzzed){ buzzed=true; if(navigator.vibrate) try{ navigator.vibrate([40,30,60]); }catch(e){} }
    var fl=reduce?[[0,.12,.4]]:[[0,.06,.95],[.12,.18,.7],[.27,.34,.5]], on=0;
    fl.forEach(function(f){ if(t>=f[0]&&t<f[1]) on=f[2]; });
    var tail=t<.6?Math.max(0,.25*(1-t/.6)):0;
    flash(Math.max(on*0.75,tail),"#eef6ff");
    var ba=on>0?1:(t<.42?.35:clamp(1-(t-.42)/.15,0,1)*.35);
    if(ba>0) drawBolt(S,ba);
    var grow=ease(t/.09), heal=clamp((t-.55)/.9,0,1); heal=heal*heal*(3-2*heal);
    drawCracks(S.cr,grow,heal);
    if(t<.55){ var m=12*(1-t/.55); shake(rnd(-m,m),rnd(-m,m),rnd(-m,m)*.12); } else shake(0,0,0);
    return t>=1.5; }};
}

/* ---------- 2) TORNADO PASS ---------- */
function tornado(){
  var dir=Math.random()<.5?1:-1, dur=3.4, DEB=[], WIND=[], i;
  var kinds=[emoji("🍔"),emoji("🍟"),emoji("🥤"),emoji("🧻"),WRAPPER,NAPKIN,emoji("🍔"),WRAPPER,emoji("🥤"),NAPKIN,emoji("🍟"),WRAPPER,NAPKIN,"sign"];
  kinds.forEach(function(k,j){ DEB.push({k:k,u:rnd(.12,.9),a:rnd(0,TAU),w:rnd(3.2,5.5),ro:rnd(18,60),sz:k==="sign"?1:rnd(24,38),rot:rnd(0,TAU),sp:rnd(-7,7),rise:rnd(.04,.12)}); });
  for(i=0;i<46;i++) WIND.push({x:rnd(0,W),y:rnd(0,H),l:rnd(24,70),v:rnd(700,1200)});
  function yc(u){ return -60+u*(H*0.9+60); }
  function rx(u){ return 16+Math.pow(1-u,1.7)*150; }
  return {dur:dur,draw:function(t,dt){
    var p=t/dur, e=env(t,.5,dur,.6), cxT=W/2+dir*(-W/2-150+ease(p)*(W+300)), prox=1-clamp(Math.abs(cxT-W/2)/240,0,1);
    function fx(u){ return cxT+Math.sin(t*2.6+u*4.2)*20*u-dir*u*u*55; }
    // sky goes dark and sick-green, wall cloud at the top
    flash(.42*e+.18*prox*e,"#070912");
    var bl=t-1.1; if(!reduce&&bl>0&&bl<.22) flash((bl<.05||(bl>.1&&bl<.15))?.35*e:0,"#cfe0ff"); // lightning backlights the funnel flash(.1*e,"#2f4a2a");
    var wc=c.createLinearGradient(0,0,0,150); wc.addColorStop(0,"rgba(10,12,20,"+(.9*e)+")"); wc.addColorStop(1,"rgba(10,12,20,0)"); c.fillStyle=wc; c.fillRect(0,0,W,150);
    // wind streaks
    c.strokeStyle="rgba(190,200,220,"+(.28*e)+")"; c.lineWidth=1.2; c.beginPath();
    WIND.forEach(function(s){ s.x+=dir*s.v*dt; if(dir>0&&s.x>W+80){ s.x=-80; s.y=rnd(0,H); } if(dir<0&&s.x<-80){ s.x=W+80; s.y=rnd(0,H); } c.moveTo(s.x,s.y); c.lineTo(s.x-dir*s.l,s.y+s.l*.08); }); c.stroke();
    function deb(back){ DEB.forEach(function(d){ var sn=Math.sin(d.a); if((sn<0)!==back) return;
      var spr=d.k==="sign"?sign():d.k, r=rx(d.u)+d.ro, base=d.k==="sign"?1.15:d.sz/80, sc=base*(.7+.45*(sn+1)/2);
      for(var g=3;g>=0;g--){ var aa=d.a-g*.11*Math.sign(d.w), x=fx(d.u)+Math.cos(aa)*r, y=yc(d.u)+Math.sin(aa)*r*.3;
        c.save(); c.globalAlpha=e*(g?.13*(4-g):1)*(back?.6:1); c.translate(x,y); c.rotate(d.rot-g*d.sp*.02); c.scale(sc,sc);
        c.drawImage(spr,-spr.width/2,-spr.height/2); c.restore(); } }); }
    DEB.forEach(function(d){ d.a+=d.w*dt; d.rot+=d.sp*dt; d.u-=d.rise*dt; if(d.u<.06) d.u=.92; });
    deb(true);
    // funnel: rings of spinning soft particles, wide at the cloud, tight at the ground
    var n=26;
    for(i=0;i<n;i++){ var u=i/(n-1), R=rx(u), ry=R*.2+3, X=fx(u), Y=yc(u);
      c.globalAlpha=.5*e; c.drawImage(MID,X-R*1.1,Y-ry*2.6,R*2.2,ry*5.2); }
    for(i=0;i<n;i++){ var u2=i/(n-1), R2=rx(u2), ry2=R2*.2+3, X2=fx(u2), Y2=yc(u2), m=Math.round(7+R2/8), w=3+u2*6;
      for(var j=0;j<m;j++){ var ang=j/m*TAU+t*w+i*.7, cs=Math.cos(ang), sn=Math.sin(ang), dp=(sn+1)/2, s=(7+R2*.2)*(.75+.5*dp);
        c.globalAlpha=e*(.18+.42*dp); c.drawImage(dp>.55?LIGHT:dp>.3?MID:DARK,X2+cs*R2-s,Y2+sn*ry2-s,s*2,s*2);
        if(dp>.85&&(j+i)%3===0){ c.globalAlpha=e*.18; c.drawImage(LIGHT,X2+cs*R2-s*.6,Y2+sn*ry2-s*.6,s*1.2,s*1.2); } } }
    c.lineCap="round";
    for(i=2;i<n;i+=2){ var u3=i/(n-1), R3=rx(u3), X3=fx(u3), Y3=yc(u3), a0=t*(3+u3*6)+i;
      for(var h=0;h<2;h++){ var s0=a0+h*Math.PI; c.strokeStyle="rgba(190,200,220,"+(.28*e)+")"; c.lineWidth=1.4+R3*.012;
        c.beginPath(); c.ellipse(X3,Y3,R3*.92,R3*.19+3,0,s0,s0+1.1); c.stroke(); } }
    // dust skirt where it touches down
    var gx=fx(1), gy=yc(1);
    for(i=0;i<22;i++){ var da=i/22*TAU+t*7, dr=rnd(55,95), ds=rnd(14,26), dpp=(Math.sin(da)+1)/2;
      c.globalAlpha=e*(.15+.3*dpp); c.drawImage(DUST,gx+Math.cos(da)*dr-ds,gy+Math.sin(da)*18-ds,ds*2,ds*2); }
    c.globalAlpha=1;
    deb(false);
    if(!reduce){ var jit=(1.2+3.5*prox)*e; shake(rnd(-jit,jit),rnd(-jit,jit),Math.sin(t*2.2)*1.5*e+dir*1.2*prox*e); }
    if(t>=dur) shake(0,0,0);
    return t>=dur; }};
}

/* ---------- 3) RAINSTORM + WIPER ---------- */
function rain(){
  var dur=6.6, WIPE0=4.7, WIPE1=5.5, drops=[], beads=[], streaks=[], bolts=[], i, spawnAcc=0;
  for(i=0;i<190;i++) streaks.push({x:rnd(-60,W+60),y:rnd(-H,H),l:rnd(16,36),v:rnd(900,1400)});
  var flicks=reduce?[1.8]:[rnd(.9,1.4),rnd(2.3,2.8),rnd(3.5,4.1)];
  flicks.forEach(function(ft){ var x0=rnd(30,W-30); bolts.push({t:ft,p:boltLine(x0,-10,x0+rnd(-90,90),rnd(120,230),90,6)}); });
  var PV={x:W/2,y:H+40}, LEN=680, A0=-1.75, A1=1.75;
  function wAng(t){ return A0+(A1-A0)*ease((t-WIPE0)/(WIPE1-WIPE0)); }
  function angOf(x,y){ return Math.atan2(x-PV.x,PV.y-y); }
  function addDrop(big){ drops.push({x:rnd(8,W-8),y:rnd(8,H*.92),r:big?rnd(7,11):(Math.random()<.18?rnd(5.5,8):rnd(2,5)),born:0,vy:0,wob:rnd(0,TAU),last:null}); }
  function lens(d,a){
    var r=d.r, ry=r*(1+clamp((d.vy||0)/260,0,.35)), x=d.x, y=d.y, g=GD();
    c.save(); c.globalAlpha=.16*a; c.fillStyle="#000a1e"; c.beginPath(); c.ellipse(x+1.2,y+2,r,ry,0,0,TAU); c.fill(); c.restore();
    c.save(); c.beginPath(); c.ellipse(x,y,r,ry,0,0,TAU); c.clip(); c.globalAlpha=a;
    // a real lens: the drop shows a shrunken, upside-down view of the road around it
    var sw=r*4.2, sx=clamp(x-sw/2,0,W-sw), sy=clamp(y-sw/2,0,H-sw);
    c.translate(x,y); c.scale(1,-1); c.drawImage(game,sx*g,sy*g,sw*g,sw*g,-r*1.08,-ry*1.08,r*2.16,ry*2.16); c.setTransform(D,0,0,D,0,0);
    var rg=c.createRadialGradient(x-r*.2,y-ry*.25,r*.15,x,y,Math.max(r,ry)); rg.addColorStop(0,"rgba(225,240,255,.26)"); rg.addColorStop(.62,"rgba(150,190,240,.1)"); rg.addColorStop(.86,"rgba(10,25,60,.28)"); rg.addColorStop(1,"rgba(0,8,30,.5)");
    c.fillStyle=rg; c.fillRect(x-r-2,y-ry-2,r*2+4,ry*2+4); c.restore();
    c.save(); c.globalAlpha=a;
    c.strokeStyle="rgba(235,245,255,.45)"; c.lineWidth=Math.max(.8,r*.16); c.beginPath(); c.ellipse(x,y,r*.8,ry*.8,0,.35,Math.PI-.35); c.stroke(); // caustic crescent at the bottom
    c.fillStyle="rgba(255,255,255,.95)"; c.beginPath(); c.ellipse(x-r*.36,y-ry*.42,Math.max(.7,r*.22),Math.max(.5,r*.14),-.6,0,TAU); c.fill(); // specular
    c.strokeStyle="rgba(210,235,255,.35)"; c.lineWidth=.8; c.beginPath(); c.ellipse(x,y,r,ry,0,0,TAU); c.stroke();
    c.strokeStyle="rgba(255,255,255,.6)"; c.lineWidth=Math.max(.7,r*.1); c.beginPath(); c.ellipse(x,y,r*.9,ry*.9,0,Math.PI*1.05,Math.PI*1.45); c.stroke();
    c.restore();
  }
  return {dur:dur,draw:function(t,dt){
    var e=env(t,.6,dur,.5), wiping=t>=WIPE0&&t<=WIPE1+.05, wa=wAng(t);
    flash(.3*e,"#0a1430");
    // distant lightning flickering behind the rain
    bolts.forEach(function(b){ var k=t-b.t; if(k<0||k>.32) return; var on=(k<.06||(k>.12&&k<.18))?1:.25;
      flash(on*.32*e,"#dbe9ff"); c.save(); c.globalCompositeOperation="lighter"; c.lineJoin="round";
      [[7,"rgba(150,200,255,.25)"],[2,"rgba(255,255,255,.85)"]].forEach(function(L){ c.strokeStyle=L[1]; c.globalAlpha=on*e; c.lineWidth=L[0]; c.beginPath(); b.p.forEach(function(q,i){ i?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1]); }); c.stroke(); });
      c.restore(); });
    // heavy rain
    c.strokeStyle="rgba(185,210,255,"+(.42*e)+")"; c.lineWidth=1.3; c.beginPath();
    streaks.forEach(function(s){ s.y+=s.v*dt; s.x-=s.v*.12*dt; if(s.y>H+40){ s.y=rnd(-80,-20); s.x=rnd(-20,W+80); } c.moveTo(s.x,s.y); c.lineTo(s.x+s.l*.12,s.y-s.l); }); c.stroke();
    // drops land on the glass
    var rate=t<WIPE0?(t<1?10:22):(t>WIPE1+.2&&t<dur-.8?5:0); spawnAcc+=rate*dt;
    while(spawnAcc>=1){ spawnAcc--; addDrop(t>1.2&&Math.random()<.12); }
    for(i=drops.length-1;i>=0;i--){ var d=drops[i]; d.born+=dt;
      if(d.r>=6.5){ d.vy=Math.min(170,d.vy+(d.r*14)*dt*(.6+.4*Math.sin(t*9+d.wob))); var ny=d.y+d.vy*dt, nx=d.x+Math.sin(t*3+d.wob)*6*dt;
        if(!d.last||Math.hypot(nx-d.last[0],ny-d.last[1])>13){ beads.push({x:d.x,y:d.y,r:Math.max(1,d.r*rnd(.12,.24)),tr:d.r*.75,px:d.last?d.last[0]:d.x,py:d.last?d.last[1]:d.y}); d.last=[d.x,d.y]; d.r=Math.max(5.6,d.r-.12); }
        d.x=nx; d.y=ny; if(d.y>H+20){ drops.splice(i,1); continue; } } }
    // merge touching drops into bigger beads
    for(i=0;i<drops.length;i++) for(var j=i+1;j<drops.length;j++){ var A=drops[i],B=drops[j];
      if(Math.hypot(A.x-B.x,A.y-B.y)<(A.r+B.r)*.82){ var ar=A.r*A.r, br=B.r*B.r; A.x=(A.x*ar+B.x*br)/(ar+br); A.y=(A.y*ar+B.y*br)/(ar+br); A.r=Math.min(14,Math.sqrt(ar+br)); A.vy=Math.max(A.vy,B.vy); drops.splice(j,1); j--; } }
    // wiper clears everything it passes
    if(wiping){ var cut=function(o){ return Math.hypot(o.x-PV.x,o.y-PV.y)<LEN&&angOf(o.x,o.y)<wa; };
      drops=drops.filter(function(o){ return !cut(o); }); beads=beads.filter(function(o){ return !cut(o); }); }
    var fade=t>dur-.5?e*2:1;
    // trails: a clear wet path with leftover beads
    c.save(); c.lineCap="round"; beads.forEach(function(b){ c.strokeStyle="rgba(200,225,255,"+(.16*fade)+")"; c.lineWidth=b.tr; c.beginPath(); c.moveTo(b.px,b.py); c.lineTo(b.x,b.y); c.stroke(); }); c.restore();
    beads.forEach(function(b){ lens(b,.9*fade); });
    drops.forEach(function(d){ var g=Math.min(1,d.born/.08); if(g<1){ c.strokeStyle="rgba(220,240,255,"+(.6*(1-g))+")"; c.lineWidth=1; c.beginPath(); c.arc(d.x,d.y,d.r*(1+2*g),0,TAU); c.stroke(); }
      var r0=d.r; d.r=r0*(.4+.6*g); lens(d,fade); d.r=r0; });
    // the wiper: arm + rubber blade, a water bulge ahead of it and a wet sheen behind
    if(t>=WIPE0-.02&&t<=WIPE1+.12){ var sx=Math.sin(wa), sy=-Math.cos(wa);
      c.save(); c.translate(PV.x,PV.y);
      c.fillStyle="rgba(200,225,255,.09)"; c.beginPath(); c.moveTo(0,0); c.arc(0,0,LEN,wa-Math.PI/2-.45,wa-Math.PI/2); c.closePath(); c.fill();
      c.rotate(wa); c.lineCap="round";
      c.strokeStyle="rgba(225,240,255,.55)"; c.lineWidth=3; c.beginPath(); c.moveTo(7,-LEN*.22); c.lineTo(7,-LEN); c.stroke();
      c.strokeStyle="rgba(0,0,0,.45)"; c.lineWidth=12; c.beginPath(); c.moveTo(-3,6); c.lineTo(-3,-LEN); c.stroke();
      c.strokeStyle="#16181f"; c.lineWidth=7; c.beginPath(); c.moveTo(0,0); c.lineTo(0,-LEN*.98); c.stroke();
      c.strokeStyle="#5b6172"; c.lineWidth=1.5; c.beginPath(); c.moveTo(-2,-10); c.lineTo(-2,-LEN*.96); c.stroke();
      c.fillStyle="#07080b"; c.fillRect(2,-LEN,6,LEN*.78);
      c.fillStyle="#2a2e3a"; for(var q=.25;q<1;q+=.12) c.fillRect(-4,-LEN*q,12,4);
      c.restore(); void sx; void sy; }
    return t>=dur; }};
}

/* ---------- scheduler ---------- */
var MAKE={lightning:lightning,tornado:tornado,rain:rain}, ev=null, lastType="", next=rnd(10000,15000), prev=0, wasRunning=false;
function trigger(type){ if(!MAKE[type]) type=["lightning","tornado","rain"][(Math.random()*3)|0]; ev=MAKE[type](); ev.t=0; ev.type=type; lastType=type; return type; }
function pick(){ var o=["lightning","tornado","rain"].filter(function(k){ return k!==lastType; }); return o[(Math.random()*o.length)|0]; }
function loop(now){
  requestAnimationFrame(loop);
  var dt=Math.min(50,now-(prev||now)); prev=now;
  var s=window.__S.get(), live=s.running&&!s.dying;
  if(live&&!wasRunning) next=rnd(10000,15000);
  wasRunning=live;
  if(live&&!ev){ next-=dt; if(next<=0){ trigger(pick()); } }
  c.clearRect(0,0,W,H);
  if(ev){ ev.t+=dt/1000; if(ev.draw(ev.t,dt/1000)){ ev=null; shake(0,0,0); wrap.style.transform=""; next=rnd(10000,15000); c.clearRect(0,0,W,H); } }
}
requestAnimationFrame(loop);
window.__STORM={trigger:trigger,active:function(){ return ev&&ev.type; },next:function(){ return next; }};
})();
