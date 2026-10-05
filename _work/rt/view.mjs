// Render a pose in the sim: node view.mjs out.png x y z yaw pitch [q=2] [frames=3]
import { createSim } from './sim.mjs';
const [out, x, y, z, yaw, pitch, q = 2, n = 3] = process.argv.slice(2);
const s = createSim({ consts: { QAUTO: 0, QSTART: Number(q) } });
s.frame();
s.poke('camX', Math.round(x * 1024)); s.poke('camY', Math.round(y * 1024)); s.poke('camZ', Math.round(z * 1024)); s.poke('yaw', Number(yaw)); s.poke('pitch', Number(pitch));
const t0 = performance.now();
for (let i = 0; i < n; i++) s.frame();
await s.png(out);
console.log('ms/frame', ((performance.now() - t0) / n).toFixed(1), 'rays', s.peek('nsamp'), 'bvh calls', s.peek('bvCalls') / (Number(n) + 1), 'faces', s.peek('nvt'), 'shadow polys', s.peek('nvs'), JSON.stringify(s.texts));
