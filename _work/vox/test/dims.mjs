// the way through the worlds: node test/dims.mjs
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 0, ANIMALS: 0 } });
let n = 0; while (s.peek('gState') !== 2 && n < 3000) { s.frame(); n++; }
const F = (k = 1) => { for (let i = 0; i < k; i++) { try { s.frame(); } catch (e) { console.log('ERR', e.message, e.stack.split('\n').slice(1, 5).join(' | ')); process.exit(1); } } };
const fn = s.fn, call = (f) => s.as('pen', f);
const B = (x, y, z) => call(() => fn.blockAt(x, y, z));
s.poke('tday', 0.25);
// a frame of obsidian (4 x 5) standing on the ground in front of the spawn
const x0 = Math.floor(s.peek('px')) + 3, z0 = Math.floor(s.peek('pz'));
call(() => { fn.findTop(x0, z0); });
const yb = s.peek('topY') + 1;
call(() => {
  for (let a = -1; a <= 2; a++) for (let k = -1; k <= 3; k++) fn.setBlock(x0 + a, yb + k, z0, (a === -1 || a === 2 || k === -1 || k === 3) ? 34 : 0);
  fn.worldFlush();
  fn.lightGate(x0, yb + 1, z0);
  fn.worldFlush();
});
console.log('gate lit', s.peek('gateOK'), 'veil at', B(x0, yb, z0), B(x0 + 1, yb + 2, z0));
// step in
s.poke('px', x0 + 0.5); s.poke('pz', z0 + 0.5); s.poke('py', yb);
F(200);
console.log('dim', s.peek('dim'), 'gState', s.peek('gState'));
let k = 0; while (s.peek('gState') !== 2 && k < 500) { F(1); k++; }
console.log('arrived dim', s.peek('dim'), 'at', s.peek('px').toFixed(1), s.peek('py').toFixed(1), s.peek('pz').toFixed(1), 'in veil', B(Math.floor(s.peek('px')), Math.floor(s.peek('py')), Math.floor(s.peek('pz'))));
F(60);
await s.png('test/u1.png');
// a fort: the nearest crossing line
let fz = null;
for (let z = -200; z < 200 && fz === null; z++) if (call(() => fn.fortX(z)) === 1) fz = z;
console.log('fort line z', fz);
s.poke('flying', 1); s.poke('gameMode', 1);
s.poke('px', 10.5); s.poke('pz', fz + 0.5); s.poke('py', 31); s.poke('yaw', 90); s.poke('pitch', -5);
for (let i = 0; i < 300; i++) { s.poke('py', 31); s.poke('pvy', 0); F(1); }
await s.png('test/u2.png');
console.log('mobs', s.peek('nHostile'));
// home again by the veil we came through, then the void key
s.poke('gameMode', 0); s.poke('flying', 0);
call(() => { fn.startTravel(0, s.peek('spawnX'), s.peek('spawnZ'), 3); });
k = 0; while (s.peek('gState') !== 2 && k < 500) { F(1); k++; }
console.log('back home dim', s.peek('dim'));
call(() => { fn.addItem(124, 1, 0); });
s.poke('hotSel', 1); const INVI = s.peek('INVI'); console.log('held', INVI[0]);
s.poke('pitch', -60); F(3);
call(() => fn.useVoidKey()); F(2);
console.log('gate under pick', B(s.peek('pickX'), s.peek('pickY'), s.peek('pickZ')));
s.poke('px', s.peek('pickX') + 0.5); s.poke('pz', s.peek('pickZ') + 0.5); s.poke('py', s.peek('pickY') + 1);
F(60);
k = 0; while (s.peek('gState') !== 2 && k < 500) { F(1); k++; }
console.log('dim', s.peek('dim'), 'boss', s.peek('bossE'), 'type', s.peek('ET')[s.peek('bossE') - 1], 'hp', s.peek('EHP')[s.peek('bossE') - 1]);
s.poke('gameMode', 1); s.poke('yaw', 0); s.poke('pitch', 10);
F(120);
console.log('crystals', s.peek('nCrystal'));
await s.png('test/v1.png');
// asleep while a crystal stands (no harm done to it)
call(() => { const e = s.peek('bossE'); fn.mobHurt(e, 999, 0, 0); });
F(2);
console.log('asleep: hp', s.peek('EHP')[s.peek('bossE') - 1]);
// the crystals broken: it wakes, and falls
s.poke('px', 0.5); s.poke('pz', 0.5); s.poke('py', 60); F(400);
for (let r = 0; r < 20 && s.peek('nCrystal') > 0; r++) { call(() => { for (let k = 0; k < 8; k++) { fn.pillarAt(k); fn.setBlock(s.peek('pilX'), s.peek('pilH') + 1, s.peek('pilZ'), 0); } }); F(60); }
console.log('crystals', s.peek('nCrystal'), 'awake', s.peek('bossWake'));
call(() => { const e = s.peek('bossE'); fn.mobHurt(e, 999, 0, 0); });
F(5);
console.log('bossDead', s.peek('bossDead'), 'gate at middle', B(0, s.peek('topY'), 0));
