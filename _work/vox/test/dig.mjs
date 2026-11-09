// a hole dug one deep: node test/dig.mjs -> test/dig_*.png
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 0, ANIMALS: 0 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) s.frame(); };
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
F(60);
const fn = s.fn, call = (f) => s.as('pen', f);
s.poke('tday', 0.25); s.poke('helpT', 0);
const px = Math.floor(s.peek('px')), pz = Math.floor(s.peek('pz')), py = Math.floor(s.peek('py'));
console.log('player', px, py, pz, 'under', call(() => fn.blockAt(px, py - 1, pz)));
let x = 0, z = 0, y = 0;
for (let r = 1; r < 12 && !x; r++) for (let dx = -r; dx <= r && !x; dx++) { const cx = px + dx, cz = pz + r; let cy = py + 6; while (call(() => fn.blockAt(cx, cy, cz)) === 0) cy--; if (call(() => fn.blockAt(cx, cy, cz)) === 2) { x = cx; z = cz; y = cy; } }
console.log('ground', x, y, z, s.peek('ITKEY')[call(() => fn.blockAt(x, y, z))]);
s.poke('px', x + 0.5); s.poke('pz', z - 2.5); s.poke('py', y + 1); s.poke('yaw', 0); s.poke('pitch', -55); F(10); await s.png('test/dig_0.png');
call(() => fn.breakBlock(x, y, z, 1)); F(3); await s.png('test/dig_1.png');
F(30); await s.png('test/dig_2.png');
call(() => fn.breakBlock(x, y - 1, z, 1)); F(30); await s.png('test/dig_3.png');
const LT = s.peek('LT'); console.log('light in hole', call(() => LT[fn.wi(x, y, z)]), call(() => LT[fn.wi(x, y - 1, z)]));
// standing on it: dig under the feet and drop in
s.poke('px', x + 0.5); s.poke('pz', z + 3.5); s.poke('py', y + 1); s.poke('pvy', 0); F(20);
const fx = x, fz = z + 3, fy = Math.floor(s.peek('py')) - 1;
console.log('under feet', s.peek('ITKEY')[call(() => fn.blockAt(fx, fy, fz))], 'py', s.peek('py'));
s.poke('pitch', -10); call(() => fn.breakBlock(fx, fy, fz, 1)); F(40);
console.log('after drop py', s.peek('py'));
await s.png('test/dig_4.png');
s.poke('pitch', -80); F(5); await s.png('test/dig_5.png');
s.poke('pitch', 0); s.poke('yaw', 90); F(5); await s.png('test/dig_6.png');
