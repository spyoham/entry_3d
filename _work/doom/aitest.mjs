import { createSim } from './sim.mjs';
const sim = await createSim();
const P = sim.R.peek, K = sim.keys, D = sim.D;
const step = (n) => { for (let i = 0; i < n; i++) sim.frame(); };
const press = (code, n = 3) => { K.add(code); step(n); K.delete(code); step(2); };
const tp = (x, y, a) => {
  const pm = P('plMo'), mX = P('mX'), mY = P('mY');
  P('unlinkThing')(pm); mX[pm - 1] = x; mY[pm - 1] = y; P('linkThing')(pm);
  const mF = P('mFloorZ'), mZ = P('mZ'), secFloor = P('secFloor'), mSec = P('mSec');
  mF[pm - 1] = secFloor[mSec[pm - 1] - 1]; mZ[pm - 1] = mF[pm - 1];
  sim.R.poke('plAng', a);
};
step(3); press(13); press(40); press(40); press(13); step(3);   // skill 5? (down twice -> skill 5)
console.log('skill', P('skill'));
const mType = P('mType'), mX = P('mX'), mY = P('mY'), mUsed = P('mUsed'), mState = P('mState');
const T = D.typeIndex;
let imp = -1;
for (let i = 0; i < mType.length; i++) if (mUsed[i] && mType[i] === T.TROOP) { imp = i; break; }
console.log('imp', imp + 1, mX[imp], mY[imp], 'state', mState[imp]);
tp(mX[imp] - 200, mY[imp], 0);
for (let s = 0; s < 8; s++) {
  step(60);
  console.log(`t=${s + 1}s hp`, P('plHealth'), 'imp state', mState[imp], 'pos', mX[imp].toFixed(0), mY[imp].toFixed(0), 'thinkers', P('nThk'), 'sound', sim.R.lastSound);
}
await sim.render('ai1.png');
// let the player die and restart with SPACE
let guard = 0;
while (P('plHealth') > 0 && guard++ < 100) step(60);
console.log('player hp', P('plHealth'), 'msg', P('msgText'));
step(60); press(32); step(10);
console.log('after restart hp', P('plHealth'), 'pos', P('plX'), P('plY'));
