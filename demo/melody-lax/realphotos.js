/* REAL PHOTOS (Antidote, 2026-10): real pictures of the food next to the AI menu images.
   Every photo here is a frame from Antidote's own 4K review of Melody (he owns it), so it can be shown in the app.
   Yelp photos belong to the people who uploaded them, so we only LINK to Melody's Yelp photos page, never copy them.
   To add a photo: drop a 1080x1350 JPG in img/real/ and add a row below. "item" must match the menu name exactly
   (leave it out for a dish that is not on the menu, like the brunch French toast). t = seconds into the review. */
(function(){
"use strict";
var VID="AhJGIPsywm0";
var YELP="https://www.yelp.com/biz_photos/melody-bar-and-grill-los-angeles-2";   // verified: 9132 S Sepulveda Blvd listing
var PHOTOS=[
  {item:"Lemon Pepper Wings",            img:"img/real/wings.jpg",            t:125},
  {item:"Lobster Mac & Cheese",          img:"img/real/lobster-mac.jpg",      t:82},
  {item:"Melody Burger Mac & Cheese",    img:"img/real/burger-mac.jpg",       t:98},
  {item:"Chicken Parmesan Mac & Cheese", img:"img/real/chicken-parm-mac.jpg", t:80},
  {item:"Mango Margarita",               img:"img/real/mango-marg.jpg",       t:20},
  {name:"French Toast Breakfast",        img:"img/real/french-toast.jpg",     t:46, note:"Brunch plate from the review"}
];
var T=function(s){ return (window.__T||String)(s); };
function esc(s){ return String(s).replace(/[&<>"]/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]; }); }
function yt(t){ return "https://youtu.be/"+VID+"?t="+t; }
function clock(t){ return Math.floor(t/60)+":"+("0"+(t%60)).slice(-2); }
function label(p){ return p.item||p.name; }

var css=document.createElement("style");
css.textContent=
".rp-tag{display:flex;align-items:center;gap:8px;margin:2px 0 8px;padding:4px 8px 4px 4px;border:1px solid var(--gold);border-radius:10px;background:#0b1220;color:var(--gold2);font:800 12.5px var(--body);cursor:pointer;text-align:left;width:100%}"+
".rp-tag img{width:34px;height:34px;border-radius:7px;object-fit:cover;flex:none}"+
".rp-tag:active{background:var(--gold);color:#1a1405}"+
"#realphotos{scroll-margin-top:56px}"+
".rp-head{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 12px}"+
".rp-yelp{display:inline-flex;align-items:center;gap:6px;padding:8px 13px;border-radius:999px;border:1px solid var(--edge);background:var(--panel);color:var(--ink);font-weight:800;font-size:14px;text-decoration:none}"+
".rp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(158px,1fr));gap:10px}"+
".rp-card{margin:0;background:var(--panel);border:1px solid var(--edge);border-radius:16px;overflow:hidden;display:flex;flex-direction:column;min-width:0}"+
".rp-card button{display:block;border:0;padding:0;background:#0a0f1c;cursor:zoom-in;aspect-ratio:4/5;width:100%}"+
".rp-card button img{width:100%;height:100%;object-fit:cover;display:block}"+
".rp-card figcaption{padding:9px 11px 11px;display:flex;flex-direction:column;gap:4px;flex:1}"+
".rp-card b{font-size:14.5px;line-height:1.22;color:var(--ink)}"+
".rp-card small{color:var(--dim);font-size:12px}"+
".rp-card a,.rp-box a{color:var(--gold2);font-weight:800;font-size:13px;text-decoration:none}"+
".rp-box{position:fixed;inset:0;z-index:200;background:#000d;display:flex;align-items:center;justify-content:center;padding:16px}"+
".rp-box[hidden]{display:none}"+
".rp-in{position:relative;width:100%;max-width:440px;max-height:100%;overflow:auto;background:var(--sky2,#121b30);border:1px solid var(--edge);border-radius:18px}"+
".rp-in img{display:block;width:100%;height:auto;aspect-ratio:4/5;object-fit:cover}"+
".rp-in .rp-tx{padding:12px 14px 14px;display:flex;flex-direction:column;gap:6px;color:var(--ink)}"+
".rp-in .rp-tx b{font-family:var(--display);font-size:21px;color:var(--cream)}"+
".rp-in .rp-tx small{color:var(--dim);font-size:12.5px;line-height:1.4}"+
".rp-x{position:absolute;top:8px;right:8px;width:38px;height:38px;border-radius:50%;border:0;background:#000b;color:#fff;font:900 20px/38px var(--body);cursor:pointer}";
document.head.appendChild(css);

/* lightbox: the real photo, where it came from, and links back */
var box=document.createElement("div"); box.className="rp-box"; box.hidden=true;
box.setAttribute("role","dialog"); box.setAttribute("aria-modal","true"); box.setAttribute("aria-label",T("Real photo"));
document.body.appendChild(box);
var lastFocus=null;
function open(p){
  lastFocus=document.activeElement;
  box.innerHTML='<div class="rp-in"><button type="button" class="rp-x" aria-label="'+esc(T("Close"))+'">×</button>'+
    '<img src="'+p.img+'" alt="'+esc(T("Real photo of")+" "+label(p))+'" width="1080" height="1350">'+
    '<div class="rp-tx"><b>'+esc(T(label(p)))+'</b>'+
    '<small>📸 '+esc(T("Real photo"))+' · '+esc(T("frame from Antidote's food review at Melody"))+' ('+clock(p.t)+')'+(p.note?' · '+esc(T(p.note)):'')+'</small>'+
    '<a href="'+yt(p.t)+'" target="_blank" rel="noopener">'+esc(T("Watch it in Antidote's review"))+' ▶</a>'+
    '<a href="'+YELP+'" target="_blank" rel="noopener">'+esc(T("See more real photos on Yelp"))+' ↗</a></div></div>';
  box.hidden=false; document.documentElement.style.overflow="hidden";
  box.querySelector(".rp-x").focus();
}
function close(){ box.hidden=true; box.innerHTML=""; document.documentElement.style.overflow=""; if(lastFocus&&lastFocus.focus) lastFocus.focus(); }
box.addEventListener("click",function(e){ if(e.target===box||e.target.closest(".rp-x")) close(); });
document.addEventListener("keydown",function(e){ if(e.key==="Escape"&&!box.hidden) close(); });

/* 1. a "Real photo" tag on every menu card that has one (data-m3d keeps ../menu3d.js from turning the thumb into a 3D button) */
var BY={}; PHOTOS.forEach(function(p,i){ if(p.item) BY[p.item]=i; });
function tagCards(){
  document.querySelectorAll(".item[data-name]").forEach(function(a){
    var i=BY[a.getAttribute("data-name")]; if(i==null||a.querySelector(".rp-tag")) return;
    var tx=a.querySelector(".tx"), b=document.createElement("button"); if(!tx) return;
    b.type="button"; b.className="rp-tag"; b.setAttribute("data-rp",i);
    b.innerHTML='<img src="'+PHOTOS[i].img+'" alt="" loading="lazy" width="34" height="34" data-m3d="skip"><span>📸 '+esc(T("Real photo"))+'</span>';
    var p=tx.querySelector("p"); tx.insertBefore(b,p?p.nextSibling:null);
  });
}
document.addEventListener("click",function(e){
  var b=e.target.closest&&e.target.closest("[data-rp]"); if(!b) return;
  e.preventDefault(); e.stopPropagation(); open(PHOTOS[+b.getAttribute("data-rp")]);
},true);

/* 2. the Real Photos gallery, right after the food menu */
function gallery(){
  if(document.getElementById("realphotos")) return;
  var host=document.getElementById("foodhost")||document.getElementById("menu"); if(!host) return;
  var h=document.createElement("h2"); h.id="realphotos";
  h.innerHTML='<small>'+esc(T("No AI, the real plates"))+'</small>'+esc(T("Real Photos"));
  var s=document.createElement("section"); s.setAttribute("aria-labelledby","realphotos");
  s.innerHTML='<p class="sub">'+esc(T("Straight from Antidote's food review at Melody. Tap a photo to see it big."))+'</p>'+
    '<div class="rp-head"><a class="rp-yelp" href="'+YELP+'" target="_blank" rel="noopener">'+esc(T("See more real photos on Yelp"))+' ↗</a></div>'+
    '<div class="rp-grid">'+PHOTOS.map(function(p,i){
      return '<figure class="rp-card"><button type="button" data-rp="'+i+'" aria-label="'+esc(T("Open real photo of")+" "+label(p))+'">'+
        '<img src="'+p.img+'" alt="'+esc(label(p))+'" loading="lazy" decoding="async" width="1080" height="1350"></button>'+
        '<figcaption><b>'+esc(T(label(p)))+'</b>'+(p.note?'<small>'+esc(T(p.note))+'</small>':'')+
        '<a href="'+yt(p.t)+'" target="_blank" rel="noopener">'+esc(T("Watch it in Antidote's review"))+' ▶</a></figcaption></figure>';
    }).join("")+'</div>';
  host.parentNode.insertBefore(s,host.nextSibling); host.parentNode.insertBefore(h,s);
  var chips=document.getElementById("chips");
  if(chips&&!chips.querySelector('[href="#realphotos"]')){ var c=document.createElement("a"); c.href="#realphotos"; c.textContent="📸 "+T("Real photos"); chips.insertBefore(c,chips.firstChild); }
}

function run(){ gallery(); tagCards(); }
run();
/* menu cards can be re-drawn (cart changes, language switch): put the tags back when that happens */
["foodhost","drinkhost"].forEach(function(id){ var el=document.getElementById(id); if(el&&window.MutationObserver) new MutationObserver(tagCards).observe(el,{childList:true,subtree:true}); });
})();
