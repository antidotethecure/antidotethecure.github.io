/* Shared harness scaffolding for Drizzle Bowl browser tests.
   Rebuilt after a container restart wiped the scratchpad; keep this one in the repo. */
const {chromium}=require('playwright-core');
const DIR=__dirname;
async function open(opts={}){
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'].concat(opts.args||[])});
  const pg=await b.newPage({viewport:{width:520,height:880}});
  pg.on('pageerror',e=>console.log('PAGEERR',e.message));
  const lib=(p)=>r=>r.fulfill({path:DIR+'/libs/node_modules/three/'+p,contentType:'text/javascript'});
  await pg.route('**/cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js',lib('build/three.module.js'));
  await pg.route('**/cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js',lib('examples/jsm/loaders/GLTFLoader.js'));
  await pg.route('**/cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/utils/BufferGeometryUtils.js',lib('examples/jsm/utils/BufferGeometryUtils.js'));
  await pg.route('**/cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js',r=>r.fulfill({path:DIR+'/libs/node_modules/cannon-es/dist/cannon-es.js',contentType:'text/javascript'}));
  await pg.route('**/d2ol7oe51mr4n9.cloudfront.net/**',r=>r.abort());
  await pg.route('**/antidotethefoodie.com/**',r=>r.abort());
  await pg.route('**/antidotethecure.github.io/**',r=>r.abort());
  await pg.route('**/drizzle-bowl-scores.higgsfield.app/**',r=>r.abort());
  await pg.goto('http://127.0.0.1:8765/'+(opts.file||'work.html'));
  await pg.waitForFunction(()=>window.B3D&&window.B3D.ok&&window.ADB&&window.ADB.__msgFit,null,{timeout:90000});
  await pg.waitForTimeout(opts.settle||4500);
  return {b,pg};
}
module.exports={open,DIR};
