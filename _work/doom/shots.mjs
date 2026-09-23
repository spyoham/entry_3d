import { createSim } from './sim.mjs';
const sim = await createSim();
const P = sim.R.peek;
const step = (n) => { for (let i = 0; i < n; i++) sim.frame(); };
const press = (code) => { sim.keys.add(code); step(3); sim.keys.delete(code); step(2); };
step(3); press(13); press(13); step(3);
const views = JSON.parse(process.argv[2] || '[[-416,256,0],[-416,256,90],[-416,256,180],[-416,256,270]]');
let i = 0;
for (const [x, y, a] of views) {
  const pm = P('plMo'), mX = P('mX'), mY = P('mY');
  P('unlinkThing')(pm); mX[pm - 1] = x; mY[pm - 1] = y; P('linkThing')(pm);
  const mF = P('mFloorZ'), mZ = P('mZ'), secFloor = P('secFloor'), mSec = P('mSec');
  mF[pm - 1] = secFloor[mSec[pm - 1] - 1]; mZ[pm - 1] = mF[pm - 1];
  sim.R.poke('plAng', a);
  step(2);
  await sim.render(`shot${i}.png`);
  console.log(i, 'items', P('r_items'), 'segs', P('r_segs'), 'nodes', P('r_nodes'), 'spr', P('r_sprites'), 'z', P('vz').toFixed(1));
  i++;
}
