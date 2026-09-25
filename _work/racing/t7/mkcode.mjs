// a valid backup code for a nickname (for harness tests)
import { createSim } from '../sim.mjs';
const nick = process.argv[2] || '테스터';
const s = createSim({ fps: 10 }); s.R.nick = nick; const g = (e) => s.peek(e);
for (let i = 0; i < 200; i++) s.frame();
g('addXP(5000); upE = 2; suF = 2; suD = 1; stRaces = 7; buildRec(); svEncode();');
console.log(g('svCode'));
