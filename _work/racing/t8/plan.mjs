// dump the ring points (plan + height) of a circuit to JSON for t8/plan.py
import fs from 'node:fs';
import { createSim } from '../sim.mjs';
const [trk, out, gfx] = [+process.argv[2], process.argv[3], +(process.argv[4] || 3)];
const s = createSim({ fps: 30 }); const g = (e) => s.peek(e);
for (let i = 0; i < 4; i++) s.frame();
g(`rules = 1; gMode = 1; gfx = ${gfx}; gfxSel = ${gfx}; selTrk = ${trk}; applyWeather(); doStartRace();`);
const N = +g('NSEG'), PPR = +g('PPR');
const P = {}; for (const k of ['P_L', 'P_R', 'P_CL', 'P_CR', 'P_OL', 'P_OR', 'P_GL', 'P_GR', 'P_WL', 'P_WR']) P[k] = +g(k);
const wv = (n) => g(n).slice(0, (N + 1) * PPR).map(v => v / 100);
const d = { N, PPR, P, X: wv('wvX'), Y: wv('wvY'), Z: wv('wvZ'), HW: g('sgHW').slice(0, N + 1), SL: g('sgSL').slice(0, N + 1), SR: g('sgSR').slice(0, N + 1), sx: g('sgX').slice(0, N + 1), sz: g('sgZ').slice(0, N + 1), curv: g('sgCurv').slice(0, N + 1), W: g('sgW').slice(0, N + 1) };
fs.writeFileSync(out, JSON.stringify(d));
console.log('rings', N);
