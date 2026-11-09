// holes at section edges, in stone, seen from right above: node test/dig2.mjs
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 0, ANIMALS: 0 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) s.frame(); };
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
F(60);
const fn = s.fn, call = (f) => s.as('pen', f), B = (x, y, z) => call(() => fn.blockAt(x, y, z));
s.poke('tday', 0.25); s.poke('helpT', 0);
const top = (x, z) => { let y = 62; while (y > 0 && (B(x, y, z) === 0 || s.peek('BSOL')[B(x, y, z)] === 0)) y--; return y; };
const cases = [[16, 16], [15, 8], [24, 23], [8, 0]];
let k = 0;
for (const [x, z] of cases) {
  const y = top(x, z);
  console.log('case', x, y, z, s.peek('ITKEY')[B(x, y, z)], 'y%8', y % 8);
  call(() => fn.breakBlock(x, y, z, 1));
  s.poke('flying', 1); s.poke('px', x + 0.5); s.poke('pz', z + 0.5); s.poke('py', y + 2.2); s.poke('pvy', 0); s.poke('yaw', 0); s.poke('pitch', -89); F(30);
  await s.png(`test/dig2_${k}.png`); k++;
  s.poke('py', y + 0.05); s.poke('pitch', 0); F(20); await s.png(`test/dig2_${k}.png`); k++;
}
