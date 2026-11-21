/* Christmas theme on every customer app (2026-11-20, live 12-01..12-31). Boots in 3D with 2 trees + 6 jingle bells,
   overlay canvas present, no horizontal scroll at 390, no theme errors. storm/churrito/dragon report blocked:"game"
   at load (their game fills the screen). Melody: Santa never flies before the plane has finished a pass.
   Ice cream (no fly-over of its own): Santa comes by on his own.
     npm i playwright-core && python3 -m http.server 8811 --directory .
     node tests/seasons-christmas.mjs */
import { chromium } from 'playwright-core';
const b = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const APPS=[['melody','/demo/melody-lax/'],['nalu','/demo/nalu-vida/'],['gritz','/demo/gritz-n-wafflez/'],['storm','/demo/storm-burger/'],['churrito','/demo/churrito-loco/'],['dragon','/demo/lucky-dragon/'],['mechanic','/demo/mechanic/'],['icecream','/ice-cream/demo/'],['harrys','/demo/harrys-bbq/']];
let bad=0;
for (const [name,path] of APPS) {
  const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  const p=await ctx.newPage(); const errs=[];
  p.on('pageerror',e=>errs.push(String(e)));
  p.on('console',m=>{ const t=m.text(); if(m.type()==='error' && /season|christmas|santa/i.test(t)) errs.push('console: '+t.slice(0,120)); });
  // records how many Santa passes had happened each time the page's own fly-over ended
  await p.addInitScript(()=>{ window.__planes=[]; addEventListener('ssai-flyover-done',()=>{ const d=window.SSAISeason&&SSAISeason.__dbg; __planes.push(d&&d.santa?d.santa.passes():-1); }); });
  await p.goto((process.env.BASE||'http://localhost:8811')+path+'?season=christmas&seasonfx=3d',{waitUntil:'load'});
  await p.waitForFunction(()=>window.SSAISeason&&SSAISeason.status&&SSAISeason.__dbg,null,{timeout:30000}).catch(()=>{});
  await p.waitForTimeout(3000);
  let santa='';
  if(name==='melody'||name==='icecream'){
    await p.waitForFunction(()=>SSAISeason.__dbg.santa.passes()>=1,null,{timeout:120000}).catch(()=>{});
    const s=await p.evaluate(()=>({passes:SSAISeason.__dbg.santa.passes(), planes:window.__planes, cue:!!window.SSAI_SANTA_CUE}));
    // Melody: at least one plane pass ended while Santa had not flown yet. Ice cream: no cue, Santa flies anyway.
    santa = s.passes>=1 && (name==='melody' ? s.cue && s.planes.includes(0) : !s.cue) ? 'ok' : 'FAIL '+JSON.stringify(s);
  }
  const r=await p.evaluate(()=>{
    const s=window.SSAISeason&&SSAISeason.status;
    const d=window.SSAISeason&&SSAISeason.__dbg;
    const cv=[...document.querySelectorAll('canvas')].find(c=>getComputedStyle(c).pointerEvents==='none'&&+getComputedStyle(c).zIndex===35);
    return {id:s&&s.id, mode:s&&s.mode, blocked:s&&s.blocked, trees:d&&d.trees&&d.trees.length, bells:d&&d.bells&&d.bells.length, canvas:!!cv,
            scrollX:document.documentElement.scrollWidth-innerWidth};
  });
  const ok = r.id==='christmas' && r.trees===2 && r.bells===6 && r.canvas && r.scrollX<=0 && !errs.length && (!santa||santa==='ok');
  console.log((ok?'ok   ':'FAIL ')+name, JSON.stringify({...r, santa, errs:errs.slice(0,1)}));
  if(!ok) bad++;
  await ctx.close();
}
await b.close(); console.log(bad?'FAILURES '+bad:'ALL '+APPS.length+' OK'); process.exit(bad?1:0);
