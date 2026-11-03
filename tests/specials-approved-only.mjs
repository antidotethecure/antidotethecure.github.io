/* No holiday special reaches a guest until it carries ok:true (Antidote, 2026-11-02: the samples were never approved).
   Checks all six apps on 11-22, inside the Thanksgiving window, so an ACTIVE unapproved special must stay hidden too.
     npm i playwright-core && python3 -m http.server 8803 --directory .
     node tests/specials-approved-only.mjs      (BASE= to point elsewhere; BEFORE= an origin/main server to compare) */
import { chromium } from 'playwright-core';
const b = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const APPS=[['melody','/demo/melody-lax/'],['nalu','/demo/nalu-vida/'],['gritz','/demo/gritz-n-wafflez/'],['storm','/demo/storm-burger/'],['churrito','/demo/churrito-loco/'],['dragon','/demo/lucky-dragon/']];
let bad=0;
for (const [base,label] of [[process.env.BASE||'http://localhost:8803','AFTER']].concat(process.env.BEFORE?[[process.env.BEFORE,'BEFORE (origin/main)']]:[])) {
  console.log('--- '+label+' ---');
  for (const [name,path] of APPS) {
    const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
    const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
    // 11-22 is inside the Thanksgiving window, so this also proves an ACTIVE unapproved special stays hidden
    await p.goto(base+path+'?season=off&date=11-22',{waitUntil:'load'}); await p.waitForTimeout(1800);
    const r=await p.evaluate(()=>({sec:!!document.getElementById('ssai-specials'), banner:!!document.getElementById('ssai-sp-banner'),
      list:(window.SSAI_SPECIALS&&window.SSAI_SPECIALS.list||[]).length, all:(window.SSAI_SPECIALS&&window.SSAI_SPECIALS.all||[]).length,
      txt:/specials coming up|special . on now/i.test(document.body.textContent||'')}));
    const clean = !r.sec && !r.banner && r.list===0 && !r.txt && !errs.length;
    console.log((label[0]==='A' ? (clean?'ok   ':'FAIL ') : '     ')+name, JSON.stringify({...r, errs:errs.slice(0,1)}));
    if(label[0]==='A' && !clean) bad++;
    await ctx.close();
  }
}
await b.close(); console.log(bad?'FAILURES '+bad:'ALL OK'); process.exit(bad?1:0);
