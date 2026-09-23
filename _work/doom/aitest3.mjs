globalThis.__jsPatch = (js) => js
  .replace('function damageMobj(t,inflictor,source,damage){', 'function damageMobj(t,inflictor,source,damage){R.dmg(t,inflictor,source,damage);');
const { createSim } = await import('./sim.mjs');
const sim = await createSim();
const P = sim.R.peek, K = sim.keys, D = sim.D;
let log = [];
sim.R.dmg = (t, i, s, d) => log.push(`dmg t=${t} src=${s} d=${d}`);
const step = (n) => { for (let i = 0; i < n; i++) sim.frame(); };
const press = (code, n = 3) => { K.add(code); step(n); K.delete(code); step(2); };
const tp = (x, y, a) => {
  const pm = P('plMo'), mX = P('mX'), mY = P('mY');
  P('unlinkThing')(pm); mX[pm - 1] = x; mY[pm - 1] = y; P('linkThing')(pm);
  const mF = P('mFloorZ'), mZ = P('mZ'), secFloor = P('secFloor'), mSec = P('mSec');
  mF[pm - 1] = secFloor[mSec[pm - 1] - 1]; mZ[pm - 1] = mF[pm - 1];
  sim.R.poke('plAng', a);
};
step(3); press(13); press(13); step(3);
const mType = P('mType'), mX = P('mX'), mY = P('mY'), mUsed = P('mUsed'), mAng = P('mAng'), mState = P('mState'), mHealth = P('mHealth');
const T = D.typeIndex;
const want = Number(process.argv[2] || T.TROOP);
let mon = -1;
for (let i = 0; i < mType.length; i++) if (mUsed[i] && mType[i] === want) { mon = i; break; }
const a = mAng[mon];
const px = mX[mon] + Math.cos(a * Math.PI / 180) * 250, py = mY[mon] + Math.sin(a * Math.PI / 180) * 250;
tp(px, py, (a + 180) % 360);
P('checkSight')(mon + 1, P('plMo'));
console.log('monster', mon + 1, 'type', mType[mon], 'at', mX[mon], mY[mon], 'ang', a, 'sight', P('sightOk'), 'player sec', P('mSec')[P('plMo') - 1]);
for (let s = 0; s < 6; s++) {
  step(60);
  console.log(`t=${s + 1}s hp`, P('plHealth'), 'mon state', mState[mon], 'hp', mHealth[mon], 'pos', mX[mon].toFixed(0), mY[mon].toFixed(0), 'thinkers', P('nThk'));
}
console.log(log.slice(0, 12).join('\n'));
await sim.render('ai3.png');
