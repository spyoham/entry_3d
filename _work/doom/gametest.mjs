// gameplay checks in the simulator
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
step(3); press(13); press(13); step(3);
const M = D.ex.M, V = M.verts;
// 1) the nearest zombieman: shoot it
const mType = P('mType'), mX = P('mX'), mY = P('mY'), mUsed = P('mUsed'), mHealth = P('mHealth');
const T = D.typeIndex;
let target = -1;
for (let i = 0; i < mType.length; i++) if (mUsed[i] && mType[i] === T.POSSESSED) { target = i; break; }
console.log('zombie', target + 1, mX[target], mY[target], 'hp', mHealth[target]);
// stand 150 units west of it facing east (search a free spot)
tp(mX[target] - 150, mY[target], 0);
step(2);
let t = 0;
while (mHealth[target] > 0 && t < 40) { K.add(17); step(10); t++; }
K.delete(17); step(10);
console.log('after firing: zombie hp', mHealth[target], 'state', P('mState')[target], 'kills', P('plKills'), 'ammo', P('plAmmo')[0], 'player hp', P('plHealth'));
await sim.render('g1.png');
// 2) a door (special 1): stand in front and press use
const doorLine = M.lines.findIndex(l => l.special === 1);
const L = M.lines[doorLine], a = V[L.v1], b = V[L.v2];
const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
// front side is to the right of v1->v2: normal (dy, -dx)
const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
const nx = dy / len, ny = -dx / len;
tp(mx + nx * 40, my + ny * 40, Math.atan2(-ny, -nx) * 180 / Math.PI);
step(3);
const doorSec = M.sides[L.side[1]].sector + 1;
const secCeil = P('secCeil');
console.log('door sector', doorSec, 'ceil before', secCeil[doorSec - 1]);
press(32);
step(60);
console.log('door ceil after', secCeil[doorSec - 1], 'mover', P('secMover')[doorSec - 1]);
await sim.render('g2.png');
// 3) pick up: teleport onto a stimpack / armor bonus
let item = -1;
for (let i = 0; i < mType.length; i++) if (mUsed[i] && (mType[i] === T.ARMORBONUS)) { item = i; break; }
const armorBefore = P('plArmor');
tp(mX[item] + 30, mY[item], 180);
K.add(87); step(15); K.delete(87); step(5);
console.log('armor', armorBefore, '->', P('plArmor'), 'msg', P('msgText'), 'items', P('plItems'));
// 4) exit switch (special 11)
const exitLine = M.lines.findIndex(l => l.special === 11);
const E = M.lines[exitLine], ea = V[E.v1], eb = V[E.v2];
const ex = (ea.x + eb.x) / 2, ey = (ea.y + eb.y) / 2, edx = eb.x - ea.x, edy = eb.y - ea.y, el = Math.hypot(edx, edy);
tp(ex + edy / el * 30, ey - edx / el * 30, Math.atan2(edx / el, -edy / el) * 180 / Math.PI);
step(3);
press(32);
step(60);
console.log('after exit use: gameState', P('gameState'), 'exitLevel', P('exitLevel'));
step(200);
await sim.render('g3.png');
console.log('wi', P('wiStage'), P('wiKills'), P('wiItems'), P('wiSecrets'));
