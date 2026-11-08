import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 0, ANIMALS: 0 } });
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { s.frame(); n++; }
const F = (k = 1) => { for (let i = 0; i < k; i++) s.frame(); };
const fn = s.fn, call = (f) => s.as('pen', f);
s.poke('tday', 0.25); F(60);
const px = s.peek('px'), py = s.peek('py'), pz = s.peek('pz');
call(() => fn.findTop(Math.floor(px), Math.floor(pz) + 8));
call(() => fn.mobAdd(11, Math.floor(px) + 0.5, s.peek('topY') + 1.02, Math.floor(pz) + 8.5));
const e = s.peek('ET').indexOf(11) + 1;
F(5);
console.log('wanderer', e, 'state', s.peek('EST')[e - 1]);
// look it in the eyes
const hx = s.peek('EX')[e - 1] - px, hy = s.peek('EY')[e - 1] + 2.6 - (py + 1.62), hz = s.peek('EZ')[e - 1] - pz;
s.poke('yaw', Math.atan2(hx, hz) * 180 / Math.PI); s.poke('pitch', Math.atan2(hy, Math.hypot(hx, hz)) * 180 / Math.PI);
F(5);
console.log('after the stare: state', s.peek('EST')[e - 1], '(4 angry)');
const x0 = s.peek('EX')[e - 1], z0 = s.peek('EZ')[e - 1];
let moved = 0;
for (let k = 0; k < 10; k++) { call(() => fn.mobHurt(e, 1, 0, 0)); F(40); if (Math.hypot(s.peek('EX')[e - 1] - x0, s.peek('EZ')[e - 1] - z0) > 4) moved++; }
console.log('hurt 10 times: teleported away (times far)', moved, 'hp', s.peek('EHP')[e - 1], 'player hp', s.peek('hp'));
// the shell-bug
call(() => fn.runCommand('/kill @e')); s.poke('hp', 20); s.poke('px', px); s.poke('py', py); s.poke('pz', pz);
call(() => fn.findTop(Math.floor(px) + 5, Math.floor(pz)));
const sy = s.peek('topY') + 1;
call(() => fn.mobAdd(12, Math.floor(px) + 5.5, sy, Math.floor(pz) + 0.5));
console.log('shell at', sy, 'player at', py.toFixed(1), 'sight', call(() => fn.sightLine(Math.floor(px) + 5.5, sy + 0.8, Math.floor(pz) + 0.5, px, py + 1.2, pz)));
let seenBolt = 0; for (let k = 0; k < 240; k++) { F(1); if (s.peek('AON').includes(5)) seenBolt++; }
console.log('frames with a bolt', seenBolt);
console.log('bolts flying', s.peek('AON').filter(a => a === 5).length, 'levitation left', s.peek('EFT')[9].toFixed(1), 'player hp', s.peek('hp'), 'player y', s.peek('py').toFixed(1), 'from', py.toFixed(1));
