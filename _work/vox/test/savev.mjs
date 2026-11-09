import { createSim } from '../sim.mjs';
const t = createSim({ consts: { TESTRUN: 1, ANIMALS: 0 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) t.frame(); };
F(30); t.poke('AT_블록월드', ['BW21', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]); F(5); await t.png('test/save_title.png');
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, ANIMALS: 0 } });
const G = (k = 1) => { for (let i = 0; i < k; i++) s.frame(); };
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { G(1); n++; }
G(20); s.poke('helpT', 0); s.poke('uiMode', 6); G(5); await s.png('test/save_pause.png');
