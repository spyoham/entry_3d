import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 777, TESTRUN: 1, ANIMALS: 0 } });
let n = 0; while (s.peek('gState') !== 2 && n < 3000) { s.frame(); n++; }
const F = (k = 1) => { for (let i = 0; i < k; i++) s.frame(); };
const SZ = 128, WY = 64; const blk = (x, y, z) => s.peek('W')[(x * SZ + z) * WY + y];
const fn = s.fn; const call = (f) => s.as('pen', f);
// furnace: 3 iron ore + 1 coal
call(() => { fn.furnaceAt(10, 50, 10); });
const f = s.peek('fFound');
s.poke('curFur', f);
call(() => { fn.slotSet(51, 11, 3, 0); fn.slotSet(52, 101, 1, 0); });
F(60 * 30);
console.log('furnace: in', s.peek('FII')[f - 1], s.peek('FIN')[f - 1], 'fuel', s.peek('FFN')[f - 1], 'out', s.peek('FOI')[f - 1], s.peek('FON')[f - 1], 'burn', s.peek('FUB')[f - 1].toFixed(1));
// falling sand: a sand block up in the air
call(() => { fn.setBlock(20, 55, 20, 8); fn.worldFlush(); });
let y = 55; while (y > 0 && blk(20, y, 20) !== 8) y--;
console.log('sand fell to y', y, 'top of column', (() => { let t = 63; while (t > 0 && (blk(20, t, 20) === 0 || blk(20, t, 20) === 8)) t--; return t; })());
// water: dig a hole next to water
let wp = null; const W = s.peek('W');
for (let x = 5; x < SZ - 5 && !wp; x++) for (let z = 5; z < SZ - 5 && !wp; z++) { const i = (x * SZ + z) * WY + 29; if (W[i] === 7 && W[i + WY] !== 7 && W[i + WY] !== 0) wp = [x, z]; }
if (wp) {
  const [x, z] = wp;
  console.log('shore at', x, z + 1, 'block', blk(x, 29, z + 1), blk(x, 28, z + 1));
  call(() => { fn.setBlock(x, 29, z + 1, 0); fn.setBlock(x, 28, z + 1, 0); fn.worldFlush(); });
  console.log('after digging: ', blk(x, 29, z + 1), blk(x, 28, z + 1));
}
// death and respawn
call(() => { fn.hurt(30, 'test'); });
F(2);
console.log('dead', s.peek('dead'), 'ui', s.peek('uiMode'), 'msg', s.peek('deathMsg'));
call(() => { fn.respawn(); });
F(2);
console.log('respawned hp', s.peek('hp'), 'pos', s.peek('px'), s.peek('py'), s.peek('pz'));
