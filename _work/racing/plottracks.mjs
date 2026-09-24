// Draw every F1 circuit's centreline to one PNG (corner numbers, start line,
// tunnel/wall/bridge colouring) so the layouts can be eyeballed.
import { buildF1 } from './f1tracks.mjs';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../entry-vibe-coding/package.json', import.meta.url));
const sharp = require('sharp');
const T = buildF1();
const CW = 520, CH = 420, cols = 4, rows = Math.ceil(T.length / cols);
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CW * cols}" height="${CH * rows}"><rect width="100%" height="100%" fill="#f4f4f0"/>`;
T.forEach((t, k) => {
    const ox = (k % cols) * CW, oy = Math.floor(k / cols) * CH;
    const xs = t.pts.map((p) => p.x), zs = t.pts.map((p) => p.z);
    const mnx = Math.min(...xs), mxx = Math.max(...xs), mnz = Math.min(...zs), mxz = Math.max(...zs);
    const s = Math.min((CW - 60) / (mxx - mnx), (CH - 90) / (mxz - mnz));
    const P = (x, z) => [ox + 30 + (x - mnx) * s, oy + CH - 30 - (z - mnz) * s];
    for (let i = 0; i < t.pts.length; i++) {
        const a = t.pts[i], b = t.pts[(i + 1) % t.pts.length];
        const [x1, y1] = P(a.x, a.z), [x2, y2] = P(b.x, b.z);
        const col = a.f & 1 ? '#c03' : a.f & 4 ? '#36c' : '#222';
        svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="${Math.max(2, a.w * 2 * s)}" stroke-linecap="round"/>`;
    }
    const [sx, sy] = P(t.pts[0].x, t.pts[0].z);
    svg += `<circle cx="${sx}" cy="${sy}" r="7" fill="#fc0" stroke="#000"/>`;
    // direction arrow: point 3
    const [ax, ay] = P(t.pts[4].x, t.pts[4].z);
    svg += `<circle cx="${ax}" cy="${ay}" r="4" fill="#0a0"/>`;
    // corner numbers at apex positions
    const n = t.pts.length;
    for (const [key, u] of Object.entries(t.marks)) {
        if (key[0] !== 'c') continue;
        const i = Math.min(n - 1, Math.round(u * n));
        const [cx, cy] = P(t.pts[i].x, t.pts[i].z);
        svg += `<text x="${cx + 6}" y="${cy - 6}" font-size="13" fill="#b00" font-family="Arial">${key.slice(1)}</text>`;
    }
    const ys = t.pts.map((p) => p.y);
    svg += `<text x="${ox + 10}" y="${oy + 22}" font-size="18" font-family="Arial" font-weight="bold">${t.name}  ${Math.round(t.len)} m  y ${Math.round(Math.min(...ys))}..${Math.round(Math.max(...ys))}</text>`;
});
svg += '</svg>';
await sharp(Buffer.from(svg)).png().toFile(process.argv[2] || 'tracks.png');
for (const t of T) console.log(t.name.padEnd(18), Math.round(t.len), 'm', t.pts.length, 'pts');
