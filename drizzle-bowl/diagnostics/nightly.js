/* Antidote Drizzle Bowl — nightly smoke test.
   Runs in a Playwright Chromium against the LIVE sites. Prints one JSON report line at the end.
   Usage: NODE_PATH=$(npm root -g) node nightly.js  (needs playwright + chromium installed) */
const {chromium}=require('playwright');
const SITES=['https://antidotethefoodie.com/drizzle-bowl/','https://antidotethecure.github.io/drizzle-bowl/'];
const API='https://drizzle-bowl-scores.higgsfield.app/api/scores';
(async()=>{
  const report={when:new Date().toISOString(),sites:[],api:null,ok:true,problems:[]};
  const bad=(m)=>{report.ok=false;report.problems.push(m);};
  /* leaderboard service */
  try{const t0=Date.now();const r=await fetch(API);const j=await r.json();report.api={status:r.status,ms:Date.now()-t0,rows:Array.isArray(j)?j.length:null,cors:r.headers.get('access-control-allow-origin')};
    if(r.status!==200||!Array.isArray(j))bad('leaderboard API not healthy: '+r.status);}
  catch(e){report.api={error:String(e)};bad('leaderboard API unreachable');}
  const b=await chromium.launch();
  for(const url of SITES){
    const s={url,errors:[],failedRequests:[]};report.sites.push(s);
    const pg=await b.newPage({viewport:{width:480,height:800}});
    pg.on('pageerror',e=>s.errors.push(e.message.slice(0,160)));
    pg.on('requestfailed',r=>s.failedRequests.push(r.url().slice(0,120)));
    const t0=Date.now();
    try{await pg.goto(url,{waitUntil:'load',timeout:90000});}catch(e){bad(url+' did not load: '+e.message.slice(0,80));await pg.close();continue;}
    s.loadMs=Date.now()-t0;
    await pg.waitForTimeout(6000);
    const st=await pg.evaluate(()=>({has3d:!!(window.B3D&&window.B3D.ok),phase:window.ADB&&window.ADB.g&&window.ADB.g.phase,hue:window.ADB3&&window.ADB3.ballHue,
      reel:window.ADB&&window.ADB.g&&window.ADB.g.reel?window.ADB.g.reel.map(c=>c.src):null,crowd:window.ADB&&window.ADB.g?window.ADB.g.crowd.map(c=>[c.shirt,c.hat,c.glasses].join('')).join('|'):null,
      covers:window.ADB3&&window.ADB3.covers?window.ADB3.covers.filter(i=>i.ok).length:null}));
    Object.assign(s,st);
    if(!st.has3d)bad(url+': 3D lane did not start');
    /* the halftime ads must all be reachable and different */
    s.ads=[];if(st.reel){for(const src of st.reel){try{const r=await fetch(new URL(src,url).href,{method:'HEAD'});s.ads.push([src,r.status]);if(r.status!==200)bad(url+': ad clip missing '+src);}catch(e){s.ads.push([src,'ERR']);bad(url+': ad clip unreachable '+src);}}
      if(new Set(st.reel).size!==st.reel.length)bad(url+': reel repeats a clip');}
    /* a full throw must complete and score */
    try{await pg.evaluate(()=>window.ADB.throw3d(0.66,-0.55,0.85));
      await pg.waitForFunction(()=>window.ADB.g.phase==='result'||window.ADB.g.phase==='aim',null,{timeout:60000});
      s.firstRoll=await pg.evaluate(()=>window.ADB.g.rolls[window.ADB.g.rolls.length-1]);
      const t1=Date.now();await pg.waitForFunction(()=>window.ADB.g.phase==='aim',null,{timeout:60000});s.rollSettleMs=Date.now()-t1;}
    catch(e){bad(url+': a throw did not complete ('+e.message.slice(0,60)+')');}
    /* second load: ball colour and crowd should differ from the first */
    try{await pg.reload({waitUntil:'load',timeout:90000});await pg.waitForTimeout(5000);
      const st2=await pg.evaluate(()=>({hue:window.ADB3&&window.ADB3.ballHue,crowd:window.ADB.g.crowd.map(c=>[c.shirt,c.hat,c.glasses].join('')).join('|'),reel:window.ADB.g.reel.map(c=>c.src).join(',')}));
      s.reloadDiffers={hue:st2.hue!==st.hue,crowd:st2.crowd!==st.crowd,reel:st2.reel!==(st.reel||[]).join(',')};}
    catch(e){s.reloadDiffers={error:e.message.slice(0,60)};}
    /* leaderboard button must open a board with rows or an honest message */
    try{await pg.click('#lbBtn');await pg.waitForTimeout(8000);s.board=(await pg.textContent('#lbWeekL')).slice(0,80);if(/Loading/.test(s.board))bad(url+': leaderboard stuck on Loading');}catch(e){bad(url+': leaderboard button failed');}
    if(s.errors.length)bad(url+': page errors: '+s.errors.slice(0,3).join(' | '));
    await pg.close();
  }
  await b.close();
  console.log('REPORT '+JSON.stringify(report));
})().catch(e=>{console.log('REPORT '+JSON.stringify({ok:false,problems:['runner crashed: '+e.message]}));process.exit(1);});
