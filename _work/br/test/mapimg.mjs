// top-down picture of a generated map: node test/mapimg.mjs [out.png] [island|desert|snow]
import { generate, CS, CELLS, GRID, MAP } from '../mapgen.mjs';
import { MAPS } from '../maps.mjs';
import { MATERIALS } from '../geom.mjs';
import { ALL } from '../prefabs.mjs';
import { savePng } from '../view.mjs';
const def = MAPS.find(m => m.key === (process.argv[3] || 'island'));
const g = generate(def);
const rgb = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const COL = (m) => (def.colours[m] ? rgb(def.colours[m]) : MATERIALS[m]);
const S = 1024, k = S / MAP, px = new Uint8Array(S * S * 3);
const put = (x, y, c) => { if (x < 0 || y < 0 || x >= S || y >= S) return; const o = (y * S + x) * 3; px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; };
for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const wx = x / k, wz = (S - 1 - y) / k, h = g.hAt(wx, wz);
    const c = Math.min(CELLS - 1, Math.floor(wz / CS)) * CELLS + Math.min(CELLS - 1, Math.floor(wx / CS));
    let col = h < 0 ? COL('water') : COL(g.cellMat[c]);
    const sh = 0.75 + Math.max(-0.25, Math.min(0.25, (g.hAt(wx + 200, wz + 200) - h) / 300));
    put(x, y, col.map(v => Math.min(255, Math.round(v * sh))));
}
for (const [, qs] of g.roadQuads) for (const q of qs) {
    const xs = q.v.map(p => p[0]), zs = q.v.map(p => p[2]);
    for (let wz = Math.min(...zs); wz <= Math.max(...zs); wz += 1 / k) for (let wx = Math.min(...xs); wx <= Math.max(...xs); wx += 1 / k) {
        let inside = false; const P = q.v;
        for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][2] > wz) !== (P[j][2] > wz) && wx < (P[j][0] - P[i][0]) * (wz - P[i][2]) / (P[j][2] - P[i][2]) + P[i][0]) inside = !inside;
        if (inside) put(Math.round(wx * k), Math.round(S - 1 - wz * k), COL(q.m));
    }
}
for (const b of g.insts) {
    const f = ALL[b.pf - 1].foot; const [w, d] = b.r % 2 ? [f[1], f[0]] : f;
    for (let wz = b.z - d / 2; wz <= b.z + d / 2; wz += 1 / k) for (let wx = b.x - w / 2; wx <= b.x + w / 2; wx += 1 / k) put(Math.round(wx * k), Math.round(S - 1 - wz * k), [200, 60, 50]);
}
for (const p of g.props) { const c = ALL[p.pf - 1].name.match(/pine|oak|bush|palm|cactus/) ? [30, 70, 30] : [60, 60, 60]; put(Math.round(p.x * k), Math.round(S - 1 - p.z * k), c); }
await savePng(px, S, S, process.argv[2] || 'test/map.png');
