// Player-physics probe #2: car 1 is driven by the AI's own steering (the best
// steering we have), either obeying its corner speeds (mode=ai) or with the
// speed limit removed (mode=flat: throttle pinned, never brakes).
// usage: node drivetest2.mjs trk mode secs   (env FPS, DIFF, CAR)
import { createSim } from '../sim.mjs';
const [trk = 1, secs = 90] = process.argv.slice(2).map(Number); const mode = 'ai';
const fps = +(process.env.FPS || 5);
const s = createSim({ fps });
for (let i = 0; i < 3; i++) s.frame();
const g = (e) => s.peek(e);
g(`renderWorld = function(){}`);
g(`aiDiff = ${+(process.env.DIFF || 3)}`);
g(`nCars = NCAR`);
g(`setupRace(${trk}, ${+(process.env.CAR || 1)})`);
g(`R.set(caSkill, 1, 1.0, 'x')`); g(`AIRL = ${+(process.env.AIRL || 0)}`);
if (mode === 'flat') g(`playerInput = function(){ aiPlan(1); R.set(aiVlim, 1, 999, 'x'); aiDrive(1); }`);
else g(`playerInput = function(){ aiPlan(1); aiDrive(1); }`);
const NSEG = g('NSEG');
let off = 0, n = 0, vmax = 0, spdSum = 0, wallHits = 0;
const aiOff = new Array(9).fill(0);
for (let f = 0; f < secs * fps; f++) {
    s.frame();
    if (g('raceState') !== 3) continue;
    n++;
    const sp = Math.hypot(g('caVX[0]'), g('caVZ[0]'));
    if (g('caSurf[0]') >= 2) off++;
    for (let c = 2; c <= 8; c++) if (g(`caSurf[${c - 1}]`) >= 2) aiOff[c]++;
    spdSum += sp; vmax = Math.max(vmax, sp);
}
const ai = [];
for (let c = 2; c <= 8; c++) ai.push(g(`caLap[${c - 1}]`) + g(`caSeg[${c - 1}]`) / NSEG);
console.log(JSON.stringify({ trk, mode, off: +(off / n * 100).toFixed(1), avgKmh: Math.round(spdSum / n * 3.6), vmaxKmh: Math.round(vmax * 3.6),
    me: +(g('caLap[0]') + g('caSeg[0]') / NSEG).toFixed(2), aiBest: +Math.max(...ai).toFixed(2), aiWorst: +Math.min(...ai).toFixed(2),
    aiOff: +(aiOff.reduce((a, b) => a + b, 0) / (7 * n) * 100).toFixed(1), best: g('bestLap') }));
