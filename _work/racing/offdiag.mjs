// Where and why does car 1 (driven by the AI) leave the road?
import { createSim } from './sim.mjs';
const [trk = 2, secs = 120] = process.argv.slice(2).map(Number);
const fps = +(process.env.FPS || 5);
const s = createSim({ fps });
for (let i = 0; i < 3; i++) s.frame();
const g = (e) => s.peek(e);
g(`renderWorld = function(){}`);
g(`nCars = NCAR`); g(`setupRace(${trk}, 1)`); g(`R.set(caSkill, 1, 1.0, 'x')`);
g(`playerInput = function(){ aiPlan(1); aiDrive(1); }`);
const NSEG = g('NSEG'); const curv = g('sgCurv');
let was = 0; const ev = [];
for (let f = 0; f < secs * fps; f++) {
    s.frame();
    if (g('raceState') !== 3) continue;
    const surf = g('caSurf[0]');
    if (surf >= 2 && !was) {
        const seg = g('caSeg[0]'); const off = g('caOff[0]');
        // curvature over the last few segments: + = turns right
        let cv = 0; for (let k = -6; k <= 2; k++) { const c = curv[((seg - 1 + k) % NSEG + NSEG) % NSEG]; if (Math.abs(c) > Math.abs(cv)) cv = c; }
        const outside = (cv > 0 && off < 0) || (cv < 0 && off > 0);
        ev.push({ seg, kmh: Math.round(Math.hypot(g('caVX[0]'), g('caVZ[0]')) * 3.6), R: Math.round(1 / Math.abs(cv)), side: outside ? 'OUT' : 'IN', lim: Math.round(g('aiVlim[0]') * 3.6), surf, w: +g('sgW[' + (seg - 1) + ']').toFixed(1), off: +off.toFixed(1), yr: Math.round(g('caYR[0]')), st: +g('caSteer[0]').toFixed(2) });
    }
    was = surf >= 2 ? 1 : 0;
}
console.log(ev.length, 'excursions'); for (const e of ev) console.log(JSON.stringify(e));
