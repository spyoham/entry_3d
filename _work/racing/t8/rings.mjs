// tight corners of a circuit: rings where the heading turns most over +-6 rings
import { createSim } from '../sim.mjs';
const trk = +(process.argv[2] || 1);
const s = createSim({ fps: 30 }); const g = (e) => s.peek(e);
for (let i = 0; i < 4; i++) s.frame();
g(`rules = 1; gMode = 1; gfx = 3; gfxSel = 3; selTrk = ${trk}; applyWeather(); doStartRace();`);
const N = +g('NSEG'), step = +g('segStep');
const hd = [], X = [], Z = [], Y = [];
for (let i = 1; i <= N; i++) { hd[i] = Math.atan2(+g(`sgDX[${i - 1}]`), +g(`sgDZ[${i - 1}]`)) * 180 / Math.PI; X[i] = +g(`sgX[${i - 1}]`); Z[i] = +g(`sgZ[${i - 1}]`); Y[i] = +g(`sgY[${i - 1}]`); }
const turn = (i) => { let a = hd[((i + 5) % N) + 1] - hd[((i - 7 + N) % N) + 1]; while (a > 180) a -= 360; while (a < -180) a += 360; return a; };
const r = [];
for (let i = 1; i <= N; i++) r.push([i, turn(i)]);
r.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
const picked = [];
for (const [i, t] of r) { if (picked.every(([j]) => Math.min(Math.abs(i - j), N - Math.abs(i - j)) > 15)) picked.push([i, t]); if (picked.length >= 8) break; }
console.log('NSEG', N, 'segStep', step);
for (const [i, t] of picked) console.log('ring', i, 'turn', t.toFixed(0), 'pos', X[i].toFixed(0), Y[i].toFixed(1), Z[i].toFixed(0));
