// a change survives its chunk being let go and made again
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 777, TESTRUN: 1, AUTOMODE: 1 } });
let n = 0; while (s.peek('gState') !== 2 && n < 3000) { s.frame(); n++; }
const F = (k = 1) => { for (let i = 0; i < k; i++) s.frame(); };
const B = (x, y, z) => s.as('pen', () => s.fn.blockAt(x, y, z));
s.as('pen', () => { s.fn.setBlock(10, 55, 12, 43); s.fn.setBlock(11, 55, 12, 43); s.fn.worldFlush(); });
console.log('placed', B(10, 55, 12), B(11, 55, 12), 'edits', s.peek('EDX').length);
const go = (x, z, k) => { s.poke('px', x); s.poke('pz', z); s.poke('py', 62); s.poke('flying', 1); for (let i = 0; i < k; i++) { s.poke('py', 62); s.frame(); } };
go(400.5, 400.5, 400);
console.log('far away: chunks', s.peek('nChunks'), 'block at home now', B(10, 55, 12), '(stone = not loaded)');
go(8.5, 8.5, 400);
console.log('back: chunks', s.peek('nChunks'), 'block', B(10, 55, 12), B(11, 55, 12));
