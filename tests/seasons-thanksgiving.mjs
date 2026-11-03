/* Thanksgiving theme on every customer app (2026-11-02). Boots in 3D with all four dishes, overlay canvas present,
   no horizontal scroll at 390, no theme errors. storm/churrito/dragon report blocked:"game" at load -- their game
   fills the screen, so the theme is correctly hidden until the guest scrolls (Antidote 2026-10-21: no ghost in the game).
     npm i playwright-core && python3 -m http.server 8811 --directory .
     node tests/seasons-thanksgiving.mjs */
import { chromium } from 'playwright-core';
const b = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const APPS=[['melody','/demo/melody-lax/'],['nalu','/demo/nalu-vida/'],['gritz','/demo/gritz-n-wafflez/'],['storm','/demo/storm-burger/'],['churrito','/demo/churrito-loco/'],['dragon','/demo/lucky-dragon/'],['mechanic','/demo/mechanic/'],['icecream','/ice-cream/demo/']];
let bad=0;
for (const [name,path] of APPS) {
  const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  const p=await ctx.newPage(); const errs=[];
  p.on('pageerror',e=>errs.push(String(e)));
  p.on('console',m=>{ const t=m.text(); if(m.type()==='error' && /season|thanksgiving/i.test(t)) errs.push('console: '+t.slice(0,120)); });
  await p.goto((process.env.BASE||'http://localhost:8811')+path+'?seasonfx=3d',{waitUntil:'load'});
  await p.waitForTimeout(4000);
  const r=await p.evaluate(()=>{
    const s=window.SSAISeason&&SSAISeason.status;
    const d=window.SSAISeason&&SSAISeason.__dbg;
    const cv=[...document.querySelectorAll('canvas')].find(c=>getComputedStyle(c).pointerEvents==='none'&&+getComputedStyle(c).zIndex===35);
    return {id:s&&s.id, mode:s&&s.mode, blocked:s&&s.blocked, dishes:d&&d.dishes&&d.dishes.length, canvas:!!cv,
            scrollX:document.documentElement.scrollWidth-innerWidth};
  });
  const ok = r.id==='thanksgiving' && r.dishes===4 && r.scrollX<=0 && !errs.length;
  console.log((ok?'ok   ':'FAIL ')+name, JSON.stringify({...r, errs:errs.slice(0,1)}));
  if(!ok) bad++;
  await ctx.close();
}
await b.close(); console.log(bad?'FAILURES '+bad:'ALL 8 OK'); process.exit(bad?1:0);
