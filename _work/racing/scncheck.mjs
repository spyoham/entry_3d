// Scenery intrusion check: for every placed object, the distance from its
// footprint (model x/z box, scaled and turned) to the nearest track ring,
// against that ring's half width (+ run-off on that side).
// usage: node scncheck.mjs [gfx=3] [trk list]   -> prints the offenders per circuit
import { createSim } from './sim.mjs';
const gfx = +(process.argv[2] || 3);
const trks = (process.argv[3] || '1,2,3,4,5,6,7,8').split(',').map(Number);
const s = createSim({ fps: 5 });
const g = (e) => s.peek(e);
for (let i = 0; i < 2; i++) s.frame();
g(`gfx = ${gfx}`);
const L = (n) => g(n);            // whole list (0-based JS array)
const { sceneryModels } = await import('./build.mjs');
const names = {}; sceneryModels().T.forEach((t, i) => { names[i + 1] = t.name; });
let total = 0;
for (const tk of trks) {
    g(`buildTrack(${tk})`);
    const N = g('NSEG'), scN = g('scN');
    const sgX = L('sgX'), sgZ = L('sgZ'), sgW = L('sgW'), sgNX = L('sgNX'), sgNZ = L('sgNZ');
    const sgRWL = L('sgRWL'), sgRWR = L('sgRWR'), sgHW = L('sgHW');
    const scSeg = []; { const head = L('scHead'), next = L('scNext'); for (let i = 0; i < N; i++) { let o = head[i]; while (o > 0) { scSeg[o - 1] = i + 1; o = next[o - 1]; } } }
    const scX = L('scX'), scZ = L('scZ'), scT = L('scT'), scK = L('scK'), scC = L('scC'), scS = L('scS');
    const gtX0 = L('gtX0'), gtX1 = L('gtX1'), gtZ0 = L('gtZ0'), gtZ1 = L('gtZ1');
    const nLm = g(`lmCnt[${tk - 1}]`);
    const bad = [];
    for (let o = 0; o < scN; o++) {
        const t = scT[o];
        let x0 = gtX0[t - 1], x1 = gtX1[t - 1], z0 = gtZ0[t - 1], z1 = gtZ1[t - 1];
        const k = scK[o]; x0 *= k; x1 *= k; z0 *= k; z1 *= k;
        const cy = scC[o], sy = scS[o];
        let worst = 1e9, wj = -1;
        for (let j = 0; j < N; j++) {
            const dx = sgX[j] - scX[o], dz = sgZ[j] - scZ[o];
            const lx = cy * dx - sy * dz, lz = sy * dx + cy * dz;
            const ex = Math.max(x0 - lx, 0, lx - x1), ez = Math.max(z0 - lz, 0, lz - z1);
            const d = Math.hypot(ex, ez);
            // which side of ring j the object is on: -1 left, +1 right
            const side = ((scX[o] - sgX[j]) * sgNX[j] + (scZ[o] - sgZ[j]) * sgNZ[j]) > 0 ? 1 : -1;
            const need = sgW[j] + (sgHW[j] > 0 ? 0.6 : (side < 0 ? sgRWL[j] : sgRWR[j]) + 0.6) - (process.env.TOL ? +process.env.TOL : 0);
            const m = d - need;
            if (m < worst) { worst = m; wj = j; }
        }
        if (worst < 0) bad.push({ o: o + 1, lm: o < nLm, type: names[t] || t, k: +k.toFixed(2), by: +(-worst).toFixed(1), ring: wj + 1, own: scSeg[o] });
    }
    total += bad.length;
    console.log(`track ${tk}: ${scN} objects, ${bad.length} intrude` + (bad.length ? '' : ''));
    const byType = {};
    for (const b of bad) byType[b.type + (b.lm ? '(LM)' : '')] = (byType[b.type + (b.lm ? '(LM)' : '')] || 0) + 1;
    console.log('   ', JSON.stringify(byType));
    if (process.env.V) for (const b of bad.slice(0, 40)) console.log('   ', JSON.stringify(b));
}
console.log('total intruding', total);
