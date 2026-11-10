/* Storm Run · Jordan High kitchen layout check (2026-11-01).
   The burger used to be sized off the column it sat in, so on a laptop it drew ~560px wide in a 150px box and
   climbed out of the top-right corner of the game. It now sits in a full-width build area, scaled to fit and
   centred. This guards that at phone and laptop widths.

   Needs playwright-core and the site on a local server:
     npm i playwright-core && python3 -m http.server 8000     (from the repo root)
     BASE=http://localhost:8000 node tests/storm-kitchen.mjs
   Since 11-02 the middle is see-through (the kids around the truck show) with a live order-window PIP top-right; the burger
   sits under or beside the PIP, never behind it.
   CHROME= overrides the browser path, SHOTS= a directory to drop screenshots in. */
import { chromium } from 'playwright-core';
import fs from 'fs';
const CH = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = (process.env.BASE || 'http://localhost:8000') + '/demo/storm-burger/?season=off';
const OUT = process.env.SHOTS || '';
if (OUT) fs.mkdirSync(OUT, {recursive:true});

const b = await chromium.launch({executablePath:CH, args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});

const SIZES = [['phone',390,844,2,true],['laptop',1440,800,2,false]];
let bad=0;
for (const [name,w,h,dpr,mob] of SIZES){
  const ctx = await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:dpr,isMobile:mob,hasTouch:mob});
  const p = await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto(URL,{waitUntil:'load'});
  await p.waitForTimeout(2500);
  const ok = await p.evaluate(()=>{ if(!window.SB_KITCHEN) return false; SB_KITCHEN.open(function(){}, 600000); return true; });
  if(!ok){ console.log(name,'FAIL: SB_KITCHEN missing'); bad++; await ctx.close(); continue; }
  await p.waitForTimeout(400);
  await p.evaluate(()=>{const e=document.querySelector('.sbk'); e.style.zIndex=9999; e.style.background='linear-gradient(180deg,#0a1234,#05081a)';}); // the start overlay sits above the panel in this harness
  if(OUT) await p.locator('.sbk').screenshot({path:OUT+'/'+name+'-00-empty.png'});
  // hold the finished burger on screen: the game starts the next order 420 ms after the last layer
  await p.evaluate(()=>{ const st=window.setTimeout; window.setTimeout=(f,ms)=> ms===420 ? 0 : st(f,ms); });
  // build the whole order and measure it before the game clears the stack 420 ms later
  const m = await p.evaluate(async ()=>{
    const el=document.querySelector('.sbk');
    const sleep=ms=>new Promise(r=>setTimeout(r,ms));
    for(let i=0;i<12;i++){
      const li=el.querySelector('.tk ol li.nx'); if(!li) break;
      const want=li.textContent.trim();
      const b=[...el.querySelectorAll('.gr button')].find(b=>b.textContent.trim()===want);
      if(!b) return {err:'nobtn:'+want};
      b.click(); await sleep(130);
    }
    await sleep(150);   // the fit-to-box scale transition is .12s; the order clears at 420 ms
    const st=el.querySelector('.st'), sr=st.getBoundingClientRect();
    const imgs=[...st.querySelectorAll('.pl img')].map(i=>i.getBoundingClientRect());
    if(!imgs.length) return {err:'no layers'};
    const top=Math.min(...imgs.map(r=>r.top)), bot=Math.max(...imgs.map(r=>r.bottom));
    const l=Math.min(...imgs.map(r=>r.left)), r=Math.max(...imgs.map(r=>r.right));
    return {layers:imgs.length, order:el.querySelector('.tk h4').textContent.trim(),
      stack:{t:Math.round(sr.top),b:Math.round(sr.bottom),w:Math.round(sr.width),h:Math.round(sr.height)},
      pile:{t:Math.round(top),b:Math.round(bot),w:Math.round(r-l),h:Math.round(bot-top)},
      vw:innerWidth, grOver: (()=>{const g=el.querySelector('.gr'); return Math.round(g.scrollWidth-g.clientWidth);})(), pipHit:(()=>{const q=el.querySelector('.pip').getBoundingClientRect(); return l<q.right&&r>q.left&&top<q.bottom&&bot>q.top;})(), kid:!!el.querySelector('.pip .kd'), scrollX: document.documentElement.scrollWidth-innerWidth};
  });
  if(m.err){ console.log(name,'FAIL',m.err); bad++; await ctx.close(); continue; }
  if(OUT) await p.locator('.sbk').screenshot({path:OUT+'/'+name+'-01-built.png'});
  const fits = m.pile.t >= m.stack.t-1 && m.pile.b <= m.stack.b+1;
  // the burger should use the room it has: fill the build area, or be capped by the 340px width ceiling
  const big = m.pile.h >= m.stack.h*0.82 || m.pile.w >= 230;
  const centred = !m.pipHit && m.kid;   // the burger never goes behind the live order-window PIP, and a kid is at the window
  console.log(name, JSON.stringify(m));
  console.log(name, fits?'ok   burger inside the build area':'FAIL burger spills out of the build area',
              '|', centred?'ok   clear of the PIP, kid at the window':'FAIL burger behind the PIP or no kid',
              '|', big?'ok   burger fills the box ('+m.pile.w+'x'+m.pile.h+')':'FAIL burger too small ('+m.pile.w+'x'+m.pile.h+' in '+m.stack.h+')',
              '|', m.grOver<=0?'ok   chips fit':'FAIL chips overflow '+m.grOver, '|', m.scrollX<=0?'ok   no h-scroll':'FAIL h-scroll '+m.scrollX,
              '|', errs.length?('FAIL errors '+errs.join('; ')):'ok   no errors');
  if(!fits||!centred||!big||m.grOver>0||m.scrollX>0||errs.length) bad++;
  await ctx.close();
}
await b.close();
console.log(bad? ('FAILURES: '+bad) : 'ALL OK');
process.exit(bad?1:0);
