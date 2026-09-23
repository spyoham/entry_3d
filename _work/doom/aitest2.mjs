globalThis.__jsPatch = (js) => js
  .replace('function damageMobj(t,inflictor,source,damage){', 'function damageMobj(t,inflictor,source,damage){R.dmg(t,inflictor,source,damage);')
  .replace('function lineAttack(src,ang,range,slope,damage){', 'function lineAttack(src,ang,range,slope,damage){R.la(src,ang,slope);');
const { createSim } = await import('./sim.mjs');
const sim = await createSim();
const P = sim.R.peek, K = sim.keys, D = sim.D;
let log = [];
sim.R.dmg = (t, i, s, d) => log.push(`dmg t=${t} src=${s} d=${d}`);
sim.R.la = (s, a, sl) => log.push(`attack src=${s} ang=${a.toFixed(0)} slope=${sl.toFixed(3)} tgt=${P('mTarget')[s - 1]}`);
const step = (n) => { for (let i = 0; i < n; i++) sim.frame(); };
const press = (code, n = 3) => { K.add(code); step(n); K.delete(code); step(2); };
step(3); press(13); press(40); press(40); press(13); step(3);
const tp = (x, y, a) => {
  const pm = P('plMo'), mX = P('mX'), mY = P('mY');
  P('unlinkThing')(pm); mX[pm - 1] = x; mY[pm - 1] = y; P('linkThing')(pm);
  const mF = P('mFloorZ'), mZ = P('mZ'), secFloor = P('secFloor'), mSec = P('mSec');
  mF[pm - 1] = secFloor[mSec[pm - 1] - 1]; mZ[pm - 1] = mF[pm - 1];
  sim.R.poke('plAng', a);
};
tp(344, 804, 0);
console.log('plMo', P('plMo'), 'player flags', P('mFlags')[P('plMo') - 1], 'sec', P('mSec')[P('plMo') - 1]);
step(600);
console.log(log.slice(0, 25).join('\n'));
const mType = P('mType'), mUsed = P('mUsed'), mTarget = P('mTarget'), mState = P('mState');
const awake = []; for (let i = 0; i < mType.length; i++) if (mUsed[i] && mTarget[i]) awake.push(`${i + 1}:${mType[i]}->${mTarget[i]}`);
console.log('awake', awake.join(' '));
console.log('hp', P('plHealth'));
const pm = P('plMo');
const src = 71;
const mX2 = P('mX'), mY2 = P('mY'), mB = P('mBlock');
console.log('player', mX2[pm - 1].toFixed(1), mY2[pm - 1].toFixed(1), 'block', mB[pm - 1], 'shooter', mX2[src - 1].toFixed(1), mY2[src - 1].toFixed(1), 'block', mB[src - 1]);
console.log('BMOX', D.consts.BMOX, D.consts.BMOY, D.consts.BMW, D.consts.BMH);
P('pointAngle')(mX2[pm - 1] - mX2[src - 1], mY2[pm - 1] - mY2[src - 1]);
const ang = P('angResult');
console.log('angle to player', ang);
P('traceRay')(src, ang, 2048, 0, 1);
console.log('lineTarget', P('lineTarget'), 'aimSlope', P('aimSlope'), 'wallT', P('atkWallT'), 'wall line', P('atkWallLine'));
P('checkSight')(src, pm);
console.log('checkSight 71->player', P('sightOk'));
const M = D.ex.M, V = M.verts, ln = M.lines[220];
console.log('line 221', V[ln.v1], V[ln.v2], 'sides', ln.side, 'flags', ln.flags, 'special', ln.special);
const s0 = M.sides[ln.side[0]]; console.log('front sec', s0.sector + 1, M.sectors[s0.sector]);
if (ln.side[1] !== 65535) { const s1 = M.sides[ln.side[1]]; console.log('back sec', s1.sector + 1, M.sectors[s1.sector]); }
const pnum = (P('mSec')[src - 1] - 1) * D.consts.NSECTORS + P('mSec')[pm - 1] - 1;
console.log('reject bit', (D.lists.rejectB[Math.floor(pnum / 8)] >> (pnum % 8)) & 1, 'secs', P('mSec')[src - 1], P('mSec')[pm - 1]);
