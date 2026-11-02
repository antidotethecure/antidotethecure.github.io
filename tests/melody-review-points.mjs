/* Melody: +50 points for in-app feedback (Antidote, 2026-11-02).
   Joins a member, opens "Ways to earn", leaves feedback, and checks the balance moves by exactly 50 and that the
   Google review link is offered afterwards with no points attached (Google removes paid-for reviews).
     npm i playwright-core && python3 -m http.server 8799 --directory .
     node tests/melody-review-points.mjs        (BASE= to point somewhere else) */
import { chromium } from 'playwright-core';
const b = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx = await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
const p = await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
await p.goto((process.env.BASE||'http://localhost:8799')+'/demo/melody-lax/?season=off',{waitUntil:'load'});
await p.waitForTimeout(3000);
let bad=0; const t=(n,c,x)=>{console.log((c?'ok   ':'FAIL ')+n, x===undefined?'':JSON.stringify(x).slice(0,200)); if(!c)bad++;};

const sr = await p.evaluate(()=>window.SSAI_REWARDS && window.SSAI_REWARDS.review);
t('page config is 50 pts, app platform', sr && sr.pts===50 && sr.platform==='app', sr);

// join a member so the ways-to-earn sheet renders with a button
const joined = await p.evaluate(async ()=>{
  const sleep=ms=>new Promise(x=>setTimeout(x,ms));
  const f=[...document.querySelectorAll('form')].find(f=>f.querySelector('input[name=name],#crm-name,[data-f=name]'));
  if(!f) return 'noform';
  const set=(sel,v)=>{const i=f.querySelector(sel); if(i){i.value=v; i.dispatchEvent(new Event('input',{bubbles:true}));} return !!i;};
  set('input[name=name],#crm-name','Test Guest'); set('input[name=phone],#crm-phone','3105550123'); set('input[name=email],#crm-email','t@example.com');
  f.querySelectorAll('input[type=checkbox]').forEach(c=>{ if(c.required||/ok/.test(c.name||'')) c.checked=true; });
  const btn=f.querySelector('button[type=submit],button.go,button'); if(btn) btn.click();
  await sleep(1200); return 'clicked';
});
console.log('    join:', joined);

const ways = await p.evaluate(()=>{
  // open "Ways to earn" if there is a control for it
  const o=[...document.querySelectorAll('button,a')].find(b=>/ways to earn|how to earn/i.test(b.textContent||''));
  if(o) o.click();
  return new Promise(r=>setTimeout(()=>{
    const rows=[...document.querySelectorAll('div,li,tr')].filter(e=>/tell us how we did|leave a review/i.test(e.textContent||'')&&e.children.length<8);
    r(rows.slice(0,2).map(e=>e.textContent.replace(/\s+/g,' ').trim().slice(0,160)));
  },700));
});
t('ways-to-earn shows the feedback row with +50', ways.some(s=>/\+50/.test(s)), ways);
// leave feedback and check the 50 points actually land
const flow = await p.evaluate(async ()=>{
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const pts=()=>{ try{ const all=JSON.parse(localStorage.getItem('ssai_crm_melody-bar-grill')||'[]'); const m=all[0]; return m? (m.pts!=null?m.pts:m.stars) : null; }catch(e){ return null; } };
  const before=pts();
  const go=[...document.querySelectorAll('button')].find(b=>/leave feedback/i.test(b.textContent||''));
  if(!go) return {err:'no feedback button'};
  go.click(); await sleep(500);
  const star=[...document.querySelectorAll('[data-s],.crm-star,button')].filter(e=>/^[1-5]$|★/.test((e.textContent||'').trim())||e.dataset.s);
  if(star.length) star[star.length-1].click();
  const ta=document.querySelector('textarea'); if(ta){ ta.value='Great wings'; ta.dispatchEvent(new Event('input',{bubbles:true})); }
  await sleep(200);
  const send=[...document.querySelectorAll('button')].find(b=>/send feedback/i.test(b.textContent||''));
  if(!send) return {err:'no send button', before};
  send.click(); await sleep(900);
  const body=document.body.textContent||'';
  return {before, after:pts(), google:/share it on Google|Open Google/i.test(body), noPoints:/no points for it/i.test(body)};
});
t('feedback awards exactly 50', flow.after - flow.before === 50, flow);
t('Google link is offered after, with no points on it', !!flow.google && !!flow.noPoints, {google:flow.google,noPoints:flow.noPoints});
t('no page errors', errs.length===0, errs.slice(0,2));
await b.close(); process.exit(bad?1:0);
