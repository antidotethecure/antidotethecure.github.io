/* SCORING GATE. Six throws through the real game flow. After each roll is scored:
     1. the pins the scoreboard believes are standing must be THE SAME PINS the physics module
        believes are standing -- not merely the same NUMBER of them. Comparing counts alone let a
        dead-wood bug through: a pin driven off the deck and left upright out on the lane was still
        counted as standing, so the totals agreed while the scoreboard pointed at the wrong pin.
     2. no pin counted standing may be off the pin deck.
   Rebuilt after a container restart wiped the scratchpad -- keep this one in the repo. */
const {open}=require('./harness');
(async()=>{
const {b,pg}=await open({settle:5000});
const state=()=>pg.evaluate(()=>{
  const g=ADB.g, deck=B3D.__deck();
  return {phase:g.phase, frame:g.frame, rolls:g.rolls.slice(),
          classicUp:g.pins.map((p,i)=>p.up?i:-1).filter(i=>i>=0),
          modUp:deck.filter(d=>d.alive&&d.up).map(d=>d.i),
          strays:deck.filter(d=>d.alive&&d.up&&(Math.abs(d.z-d.homeZ)>0.45||Math.abs(d.x-d.homeX)>0.45))
                     .map(d=>'#'+(d.i+1)+'@z'+d.z)};
});
let mismatches=0;
for(let n=0;n<6;n++){
  let t0=Date.now();
  while(Date.now()-t0<120000){const s=await state();if(s.phase==='aim')break;await pg.waitForTimeout(400);}
  const before=await state();
  await pg.evaluate(a=>{ADB.g.cheer=0;ADB.throw3d(a[0],a[1],a[2],a[3]);},
    [(Math.random()-0.5)*0.5,(Math.random()-0.5)*1.2,0.5+Math.random()*0.35,(Math.random()-0.5)*0.8]);
  let scored=null,t1=Date.now();
  while(Date.now()-t1<300000){
    await pg.waitForTimeout(600);
    const s=await state();
    if(s.phase==='aim'&&s.rolls.length>before.rolls.length){scored=s;break;}
  }
  if(!scored){console.log(n+' NEVER SCORED within budget');mismatches++;continue;}
  const same=scored.classicUp.length===scored.modUp.length&&
             scored.classicUp.every((v,k)=>v===scored.modUp[k]);
  if(!same||scored.strays.length)mismatches++;
  console.log(n+' frame '+scored.frame+'  rolls ['+scored.rolls.join(',')+']'+
    '  scoreboard-standing ['+scored.classicUp.join(',')+']'+
    '  physics-standing ['+scored.modUp.join(',')+']  '+
    (same?'SAME PINS':'*** DIFFERENT PINS ***')+
    (scored.strays.length?('  *** OFF THE DECK: '+scored.strays.join(',')+' ***'):''));
}
console.log('mismatches '+mismatches);
console.log('window.__err:',await pg.evaluate(()=>window.__err||'none'));
await b.close();})().catch(e=>{console.error('FATAL',e.message);process.exit(1);});
