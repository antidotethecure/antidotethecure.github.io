/* SCORING GATE. Six throws through the real game flow. After each roll is scored, the pins the
   classic scoreboard believes are standing must equal the pins the physics module believes are
   standing. A disagreement means the score and the deck have drifted apart, which is the bug class
   that re-racks a pin the player watched fall over.
   Rebuilt after a container restart wiped the scratchpad -- keep this one in the repo. */
const {open}=require('./harness');
(async()=>{
const {b,pg}=await open({settle:5000});
const state=()=>pg.evaluate(()=>{
  const g=ADB.g, mod=B3D.__pinState();
  return {phase:g.phase, frame:g.frame, fr:g.fr.slice(), rolls:g.rolls.slice(), over:!!g.over,
          classicUp:g.pins.filter(p=>p.up).length,
          modUp:mod.filter(p=>p.up===1).length,
          modAlive:mod.filter(p=>!p.gone).length,
          tilts:mod.filter(p=>p.up===1&&p.tilt>8).map(p=>'#'+p.i+':'+p.tilt+'deg')};
});
let mismatches=0;
for(let n=0;n<6;n++){
  // wait until the game will accept a throw
  let t0=Date.now();
  while(Date.now()-t0<120000){const s=await state();if(s.phase==='aim')break;await pg.waitForTimeout(400);}
  const before=await state();
  await pg.evaluate(a=>{ADB.g.cheer=0;ADB.throw3d(a[0],a[1],a[2],a[3]);},
    [(Math.random()-0.5)*0.5, (Math.random()-0.5)*1.2, 0.5+Math.random()*0.35, (Math.random()-0.5)*0.8]);
  // let it roll and score
  let scored=null,t1=Date.now();
  while(Date.now()-t1<300000){
    await pg.waitForTimeout(600);
    const s=await state();
    if(s.phase==='aim'&&s.rolls.length>before.rolls.length){scored=s;break;}
  }
  if(!scored){console.log(n+' NEVER SCORED within budget');mismatches++;continue;}
  const ok=scored.classicUp===scored.modUp;
  if(!ok)mismatches++;
  console.log(n+' thrown  frame '+scored.frame+'  rolls ['+scored.rolls.join(',')+']  scoreboard-standing '+
    scored.classicUp+'  physics-standing '+scored.modUp+'  '+(ok?'OK':'*** MISMATCH ***')+
    (scored.tilts.length?('   leaning-but-counted-up: '+scored.tilts.join(',')):''));
}
console.log('mismatches '+mismatches);
console.log('window.__err:',await pg.evaluate(()=>window.__err||'none'));
await b.close();})().catch(e=>{console.error('FATAL',e.message);process.exit(1);});
