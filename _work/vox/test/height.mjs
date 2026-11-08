// the taller world from above: node test/height.mjs [seed] [x] [z]
import { createSim } from '../sim.mjs';
const a = process.argv.slice(2);
const s = createSim({ consts: { AUTOSEED: Number(a[0] || 1234), TESTRUN: 1, ANIMALS: 0 } });
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { s.frame(); n++; }
console.log('spawn gen ticks', n);
for (let i = 0; i < 300; i++) s.frame(); await s.png('test/height0.png'); console.log('pos', s.peek('px'), s.peek('py'), s.peek('pz'), 'chunks made', s.peek('CKST').filter(v => v >= 3).length, 'gState', s.peek('gState'));
// find the highest column loaded
const H = s.peek('HMAP'); let best = 0; for (const h of H) best = Math.max(best, h);
console.log('highest column', best);
s.poke('gameMode', 1); s.poke('flying', 1);
s.poke('py', 95); s.poke('pitch', -18); s.poke('yaw', Number(a[1] || 0));

for (let i = 0; i < 400; i++) s.frame();
await s.png('test/height.png');
