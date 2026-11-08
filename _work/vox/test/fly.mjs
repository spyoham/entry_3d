// fly straight on and watch the chunks: node test/fly.mjs [frames] [yaw]
import { createSim } from '../sim.mjs';
const N = Number(process.argv[2] || 1500), yaw = Number(process.argv[3] || 30);
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 1 } });
let n = 0; while (s.peek('gState') !== 2 && n < 3000) { s.frame(); n++; }
s.poke('flying', 1); s.poke('yaw', yaw); s.poke('pitch', -10);
s.keys.add(87); s.keys.add(82);
const t0 = Date.now();
for (let i = 0; i < N; i++) {
  s.poke('py', 61); s.poke('pvy', 0);
  try { s.frame(); } catch (e) { console.log('frame', i, e.message); console.log(e.stack.split('\n').slice(1, 6).join('\n')); process.exit(1); }
  if (i % 300 === 0) console.log(i, 'pos', s.peek('px').toFixed(0), s.peek('pz').toFixed(0), 'chunks', s.peek('nChunks'), '/', s.peek('NOFF'), 'faces', s.peek('nFace'), 'edits', s.peek('EDX').length, 'mobs', s.peek('nPassive'));
}
console.log('done', N, 'frames', Date.now() - t0, 'ms');
await s.png('test/fly.png');
