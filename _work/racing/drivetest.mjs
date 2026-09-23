// Player-physics probe: drives car 1 in the Node sim with keyboard-style
// (on/off) inputs and reports how it copes. mode=flat keeps the throttle
// pinned; mode=smart brakes for corners (MU = lateral grip it assumes).
// usage: node drivetest.mjs trk mode fps secs
import { createSim } from './sim.mjs';
const [trk = 1, mode = 'flat', fps = 6, secs = 90] = process.argv.slice(2).map((v, i) => i === 1 ? v : +v);
const s = createSim({ fps });
for (let i = 0; i < 3; i++) s.frame();
const g = (e) => s.peek(e);
g(`renderWorld = function(){}`);
g(`aiDiff = +(process.env.DIFF || 3)`);
g(`nCars = NCAR`);
g(`setupRace(${trk}, +(process.env.CAR || 1))`);
const NSEG = g('NSEG');
const sgX = g('sgX'), sgZ = g('sgZ'), curv = g('sgCurv'), step = g('segStep');
let off = 0, n = 0, vmax = 0, lapT = [], lastLap = 0, spdSum = 0, prevLap = 1;
const K = { W: 87, S: 83, A: 65, D: 68 };
const frames = secs * fps;
const MU = +(process.env.MU || 20);
const aiOff = new Array(8).fill(0);
for (let f = 0; f < frames; f++) {
    const x = g('caX[0]'), z = g('caZ[0]'), yaw = g('caYaw[0]'), seg = g('caSeg[0]');
    const vx = g('caVX[0]'), vz = g('caVZ[0]'); const sp = Math.hypot(vx, vz);
    // aim a little ahead on the centreline (lists are 1-based: index 0 unused? check)
    const ah = Math.max(2, Math.min(10, Math.round(sp * 0.5 / step) + 1));
    const ti = ((seg - 1 + ah) % NSEG) + 1;
    const ang = Math.atan2(sgX[ti - 1] - x, sgZ[ti - 1] - z) * 180 / Math.PI;
    const err = ((ang - yaw) % 360 + 540) % 360 - 180;
    s.keys.clear();
    const want = Math.max(-1, Math.min(1, err / (11 + sp * 0.16))); const cur = g('caSteer[0]');
    if (want > 0.08 && want > cur + 0.1) s.keys.add(K.D); else if (want < -0.08 && want < cur - 0.1) s.keys.add(K.A);
    else if (Math.abs(want) > 0.25 && Math.sign(want) === Math.sign(cur) && Math.abs(cur) < Math.abs(want) + 0.3) s.keys.add(want > 0 ? K.D : K.A);
    let brake = false;
    if (mode === 'smart') {
        for (let k = 0; k < 45; k++) {
            const c = Math.abs(curv[(seg - 1 + k) % NSEG]);
            if (c < 1e-4) continue;
            const m = +(process.env.MARG || 0.9); const vc2 = c > m * 0.0019 ? m * 15.5 / (c - m * 0.0019) : 1e5; const vAllow = Math.sqrt(vc2 + 2 * 26 * step * Math.max(0, k - 2));
            if (sp > vAllow) brake = true;
        }
    }
    if (brake) s.keys.add(K.S); else s.keys.add(K.W);
    s.frame();
    if (g('raceState') !== 3) continue;
    n++;
    if (g('caSurf[0]') >= 2) off++;
    for (let c = 2; c <= 8; c++) if (g(`caSurf[${c - 1}]`) >= 2) aiOff[c - 1]++;
    spdSum += sp;
    vmax = Math.max(vmax, sp);
    const lap = g('caLap[0]');
    if (lap !== prevLap) { lapT.push(+(g('raceT') - lastLap).toFixed(1)); lastLap = g('raceT'); prevLap = lap; }
}
const ai = [];
for (let c = 2; c <= 8; c++) ai.push(g(`caLap[${c - 1}]`) + g(`caSeg[${c - 1}]`) / NSEG);
const aiOffPct = aiOff.reduce((a, b) => a + b, 0) / (7 * n) * 100;
console.log(JSON.stringify({ trk, mode, off: +(off / n * 100).toFixed(1), avgKmh: Math.round(spdSum / n * 3.6), vmaxKmh: Math.round(vmax * 3.6),
    laps: lapT, me: +(g('caLap[0]') + g('caSeg[0]') / NSEG).toFixed(2), aiBest: +Math.max(...ai).toFixed(2), aiWorst: +Math.min(...ai).toFixed(2), aiOff: +aiOffPct.toFixed(1) }));
