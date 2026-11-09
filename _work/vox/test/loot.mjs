// structure chests and their loot: node test/loot.mjs [structure]
import { createSim } from '../sim.mjs';
const name = process.argv[2] || 'village';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) { try { s.frame(); } catch (e) { console.log('ERR', e.message); process.exit(1); } } };
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
const fn = s.fn, call = (f) => s.as('pen', f);
const B = (x, y, z) => call(() => fn.blockAt(x, y, z));
call(() => fn.locateStruct(fn.structByName(name), 8, 8));
const lx = s.peek('locX'), lz = s.peek('locZ');
s.poke('px', lx + 0.5); s.poke('py', 110); s.poke('pz', lz + 0.5); s.poke('flying', 1);
let k = 0; F(5); while (s.peek('nChunks') < s.peek('NOFF') && k < 3000) { F(1); k++; } F(30);
const KEY = s.peek('ITKEY'), NAME = s.peek('ITNAME');
let found = 0;
for (let x = lx - 40; x <= lx + 40 && found < 3; x++) for (let z = lz - 40; z <= lz + 40 && found < 3; z++) for (let y = 1; y < 110; y++) {
  if (B(x, y, z) === 37) {
    call(() => fn.chestOpen(x, y, z)); const c = s.peek('curChest');
    const items = []; const CHI = s.peek('CHI'), CHN = s.peek('CHN');
    for (let j = 1; j <= 27; j++) if (CHI[(c - 1) * 27 + j - 1] > 0) items.push(NAME[CHI[(c - 1) * 27 + j - 1]] + ' ' + CHN[(c - 1) * 27 + j - 1]);
    console.log(name, 'chest at', x, y, z, '->', items.join(', ') || '(empty)');
    call(() => fn.uiClose()); found++;
  }
}
console.log('villagers', s.peek('ET').filter(t => t === 14).length, 'golems', s.peek('ET').filter(t => t === 15).length, 'spawners', s.peek('SPX').length);
