// A picture in Node: node test/shot.mjs out.png [seed] [x y z yaw pitch] [K=V ...]
import { createSim } from '../sim.mjs';
const a = process.argv.slice(2);
const kv = Object.fromEntries(a.filter(x => /^\w+=/.test(x)).map(x => x.split('=')).map(([k, v]) => [k, Number(v)]));
const [out, seed, x, y, z, yw, pt] = a.filter(x => !/^\w+=/.test(x));
const s = createSim({ consts: { AUTOSEED: Number(seed || 1234), TESTRUN: 1, ...kv } });
let t0 = Date.now(), n = 0;
while (s.peek('gState') !== 2 && n < 3000) { s.frame(); n++; }
console.log('generated in', n, 'frames', Date.now() - t0, 'ms', 'spawn', s.peek('spawnX'), s.peek('spawnY'), s.peek('spawnZ'));
if (x !== undefined) { s.poke('tX', +x); s.poke('tY', +y); s.poke('tZ', +z); s.poke('tYaw', +yw); s.poke('tPitch', +(pt || 0)); s.poke('testCmd', 1); }
for (let i = 0; i < 4; i++) s.frame();
if (kv.MOBS) { s.poke('testCmd', 2); for (let i = 0; i < 30; i++) s.frame(); }
if (kv.T !== undefined) s.poke('tday', kv.T);
t0 = Date.now();
for (let i = 0; i < 3; i++) s.frame();
console.log('3 frames', Date.now() - t0, 'ms; faces', s.peek('nFace'), 'fills', s.peek('nFill'), 'sections', s.peek('nVS'), 'pos', s.peek('px').toFixed(1), s.peek('py').toFixed(1), s.peek('pz').toFixed(1));
await s.png(out || 'test/shot.png');
