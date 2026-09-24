// top-down plot of every circuit's racing line, coloured by the speed profile
import { createSim } from './sim.mjs';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../entry-vibe-coding/package.json', import.meta.url));
const sharp = require('sharp');
const s = createSim({ fps: 5 });
const g = (e) => s.peek(e);
g('renderWorld = function(){}');
for (let i = 0; i < 3; i++) s.frame();
const N = g('NSEG');
let svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="800" style="background:#223">';
for (let t = 1; t <= 8; t++) {
    g(`buildTrack(${t})`); g(`speedProfile(1.0, 90)`);
    const P = [];
    for (let i = 0; i < N; i++) P.push({ x: g(`sgX[${i}]`), z: g(`sgZ[${i}]`), nx: g(`sgNX[${i}]`), nz: g(`sgNZ[${i}]`), w: g(`sgW[${i}]`), o: g(`rlO[${i}]`), v: g(`rlV[${i}]`) });
    const xs = P.map(p => p.x), zs = P.map(p => p.z);
    const mnx = Math.min(...xs), mxx = Math.max(...xs), mnz = Math.min(...zs), mxz = Math.max(...zs);
    const sc = Math.min(380 / (mxx - mnx), 380 / (mxz - mnz));
    const ox = ((t - 1) % 4) * 400 + 10, oz = Math.floor((t - 1) / 4) * 400 + 10;
    const X = (x) => ox + (x - mnx) * sc, Z = (z) => oz + (z - mnz) * sc;
    let road = '';
    for (const p of P) road += `${X(p.x).toFixed(1)},${Z(p.z).toFixed(1)} `;
    svg += `<polyline points="${road}" fill="none" stroke="#666" stroke-width="${Math.max(2, 2 * P[0].w * sc)}"/>`;
    for (let i = 0; i < N; i++) {
        const a = P[i], b = P[(i + 1) % N];
        const v = a.v * 3.6, col = v > 250 ? '#3f3' : v > 150 ? '#fd3' : '#f44';
        svg += `<line x1="${X(a.x + a.nx * a.o)}" y1="${Z(a.z + a.nz * a.o)}" x2="${X(b.x + b.nx * b.o)}" y2="${Z(b.z + b.nz * b.o)}" stroke="${col}" stroke-width="1.5"/>`;
    }
    const lap = P.reduce((s, p) => s + g('segStep') / Math.max(5, p.v), 0);
    svg += `<text x="${ox}" y="${oz + 12}" fill="#fff" font-size="13">${g(`trkName[${t - 1}]`)} ideal ${lap.toFixed(1)} s</text>`;
}
svg += '</svg>';
await sharp(Buffer.from(svg)).png().toFile(process.argv[2] || 'rl.png');
