// v4.0: does any scenery reach onto the road? For every object placed on a
// circuit (ULTRA, so all of them), its footprint (the model's x/z box, sized
// and turned) is sampled every metre and each sample is measured against
// every stretch of road between two rings. A sample closer to the centreline
// than the road's half width (+ margin) is on the road; RUNOFF=1 counts the
// run-off, gravel and (realistic rules) the pit lane as road too. A building
// over the Monaco tunnel is fine if it starts above the tunnel roof. Water,
// the Suzuka bridge girders and gantries are left out.
// (The sim hands lists over 0-based: index k here is item k+1.)
// usage: node t7/intrude.mjs [trk ...] [--margin 0.3] [--list]
import { createSim } from '../sim.mjs';
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? +args[i + 1] : d; };
const margin = opt('margin', 0.3);
const list = args.includes('--list');
const trks = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--') && args[i - 1] !== '--list')).map(Number);
const s = createSim({ fps: 10 });
for (let i = 0; i < 4; i++) s.frame();
const names = s.peek('trkName');
const SKIP = new Set(['SC_SHEET', 'SC_BRIDGE', 'SC_GANTRY', 'SC_WATER'].map((k) => s.peek(k)));
let bad = 0;
for (const t of trks.length ? trks : [1, 2, 3, 4, 5, 6, 7, 8]) {
    // RUNOFF=1: realistic rules (the pit lane) and the run-off / gravel count as road
    s.peek(`gfx = 3; rules = ${process.env.RUNOFF ? 2 : 1}; buildTrack(${t})`);
    const N = s.peek('NSEG');
    const X = s.peek('sgX'), Z = s.peek('sgZ'), W = s.peek('sgW'), TUN = s.peek('sgTun');
    const HW = s.peek('sgHW'), RL = s.peek('sgRWL'), RR = s.peek('sgRWR'), NX = s.peek('sgNX'), NZ = s.peek('sgNZ');
    const scN = s.peek('scN');
    const T = s.peek('scT'), SX = s.peek('scX'), SZ = s.peek('scZ'), C = s.peek('scC'), S = s.peek('scS'), SY = s.peek('scY'), Y = s.peek('sgY');
    const K = s.peek('scK'), KZ = s.peek('scKZ');
    const x0 = s.peek('gtX0'), x1 = s.peek('gtX1'), z0 = s.peek('gtZ0'), z1 = s.peek('gtZ1');
    const hits = [];
    for (let o = 0; o < scN; o++) {
        const ty = T[o];
        if (SKIP.has(ty)) continue;
        const ax = x0[ty - 1] * K[o], bx = x1[ty - 1] * K[o], az = z0[ty - 1] * KZ[o], bz = z1[ty - 1] * KZ[o];
        const cy = C[o], sy = S[o];
        const nu = Math.max(2, Math.ceil(bx - ax)), nv = Math.max(2, Math.ceil(bz - az));
        let worst = 0, wr = 0;
        for (let a = 0; a <= nu; a++) for (let b = 0; b <= nv; b++) {
            const lx = ax + (bx - ax) * a / nu, lz = az + (bz - az) * b / nv;
            const px = SX[o] + lx * cy + lz * sy, pz = SZ[o] - lx * sy + lz * cy;
            // nearest point of the centreline polyline
            for (let i = 1; i <= N; i++) {
                const j = i === N ? 1 : i + 1;
                // (a tunnel ring: only what is lower than its roof is in it)
                if (TUN[i] > 0 && SY[o] > Y[i] + 6) continue;
                const dx = X[j] - X[i], dz = Z[j] - Z[i];
                const L2 = dx * dx + dz * dz;
                let u = ((px - X[i]) * dx + (pz - Z[i]) * dz) / L2;
                if (u < 0) u = 0; if (u > 1) u = 1;
                const qx = X[i] + dx * u, qz = Z[i] + dz * u;
                const d = Math.hypot(px - qx, pz - qz);
                let w = W[i] + (W[j] - W[i]) * u + margin;
                // (the run-off is drawn tapering from one ring's width to the next's)
                if (process.env.RUNOFF && HW[i] < 1) w += ((px - X[i]) * NX[i] + (pz - Z[i]) * NZ[i] < 0 ? RL[i] + (RL[j] - RL[i]) * u : RR[i] + (RR[j] - RR[i]) * u);
                if (w - d > worst) { worst = w - d; wr = i; }
            }
        }
        if (worst > 0) hits.push({ o, ty, ring: wr, into: +worst.toFixed(2), x: +SX[o].toFixed(1), z: +SZ[o].toFixed(1) });
    }
    hits.sort((a, b) => b.into - a.into);
    bad += hits.length;
    console.log(`${hits.length ? 'BAD ' : 'ok  '}${String(names[t - 1]).padEnd(18)} objects ${scN}, on the road ${hits.length}` + (hits.length ? `, worst ${hits[0].into} m` : ''));
    if (list) for (const h of hits.slice(0, 30)) console.log('   ', JSON.stringify(h));
}
console.log(bad ? `FAIL ${bad} objects on the road` : 'PASS nothing on the road');
