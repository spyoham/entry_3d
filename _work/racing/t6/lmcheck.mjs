import { createSim } from '../sim.mjs';
const s = createSim({ fps: 5 }); const g = (e) => s.peek(e);
s.frame(); g('gfx = 3');
for (const [tk, o] of [[1, 3], [5, 0]]) {
    g(`buildTrack(${tk})`);
    const N = g('NSEG'); const sc = g('scN');
    const T = g('scT'), K = g('scK'), X = g('scX'), Z = g('scZ'), Cc = g('scC'), Ss = g('scS'), tun = g('sgTun');
    const x0 = g('gtX0'), x1 = g('gtX1'), z0 = g('gtZ0'), z1 = g('gtZ1'), sgX = g('sgX'), sgZ = g('sgZ'), sgW = g('sgW');
    for (let q = 0; q < Math.min(sc, 8); q++) {
        const t = T[q] - 1, k = K[q]; const hits = [];
        for (let j = 0; j < N; j++) {
            const dx = sgX[j] - X[q], dz = sgZ[j] - Z[q]; const lx = Cc[q] * dx - Ss[q] * dz, lz = Ss[q] * dx + Cc[q] * dz;
            const ex = Math.max(x0[t] * k - lx, 0, lx - x1[t] * k), ez = Math.max(z0[t] * k - lz, 0, lz - z1[t] * k);
            if (Math.hypot(ex, ez) < sgW[j]) hits.push((j + 1) + (tun[j] > 0 ? 'T' : ''));
        }
        if (hits.length) console.log('trk', tk, 'obj', q + 1, 'type', T[q], 'rings', hits.join(' '));
    }
}
