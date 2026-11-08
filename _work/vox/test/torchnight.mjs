// a torch on the ground at night (sim): node test/torchnight.mjs
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 0, ANIMALS: 0 } });
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { s.frame(); n++; }
const F = (k = 1) => { for (let i = 0; i < k; i++) s.frame(); };
const fn = s.fn, call = (f) => s.as('pen', f);
F(60);
const x0 = Math.floor(s.peek('px')) + 4, z0 = Math.floor(s.peek('pz')) + 4, y0 = Math.floor(s.peek('py'));
s.poke('tday', 0.75);
s.poke('px', x0 - 5.5); s.poke('py', y0 + 2); s.poke('pz', z0 - 5.5); s.poke('yaw', 45); s.poke('pitch', -15); s.poke('flying', 1); s.poke('gameMode', 1);
F(60);
await s.png('test/torchnight0.png');
call(() => { fn.setBlock(x0, y0, z0, 27); });
F(30);
await s.png('test/torchnight1.png');
