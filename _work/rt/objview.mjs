// Flat-shaded previews of an OBJ (side, top, front, 3/4) with triangle indices optional: node objview.mjs file.obj out.png
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../entry-vibe-coding/package.json', import.meta.url));
const sharp = require('sharp');
export function loadObj(file) {
    const V = [], T = [];
    for (const l of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
        const p = l.trim().split(/\s+/);
        if (p[0] === 'v') V.push(p.slice(1, 4).map(Number));
        if (p[0] === 'f') { const ix = p.slice(1).map(s => parseInt(s) - 1); for (let k = 1; k + 1 < ix.length; k++) T.push([ix[0], ix[k], ix[k + 1]]); }
    }
    return { V, T };
}
if ((process.argv[1] || '').endsWith('objview.mjs')) {
    const { V, T } = loadObj(process.argv[2]);
    const W = 1200, H = 800, px = new Uint8Array(W * H * 3).fill(40), zb = new Float32Array(W * H).fill(-1e9);
    const views = [  // [right, up, forward(depth)] axes and placement
        { r: [1, 0, 0], u: [0, 1, 0], f: [0, 0, 1], ox: 300, oy: 200 },      // side (from +z)
        { r: [1, 0, 0], u: [0, 0, -1], f: [0, 1, 0], ox: 300, oy: 600 },     // top
        { r: [0, 0, -1], u: [0, 1, 0], f: [1, 0, 0], ox: 900, oy: 200 },     // front (from +x)
        { r: [0.7, 0, -0.7], u: [-0.25, 0.93, -0.25], f: [0.66, 0.36, 0.66], ox: 900, oy: 600 },
    ];
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const S = 95;
    for (const vw of views) for (const t of T) {
        const p = t.map(i => V[i]), q = p.map(v => [vw.ox + dot(v, vw.r) * S, vw.oy - dot(v, vw.u) * S, dot(v, vw.f)]);
        const e1 = [p[1][0] - p[0][0], p[1][1] - p[0][1], p[1][2] - p[0][2]], e2 = [p[2][0] - p[0][0], p[2][1] - p[0][1], p[2][2] - p[0][2]];
        const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]], nl = Math.hypot(...n) || 1;
        const sh = Math.round(60 + 180 * Math.abs(dot(n, [0.4, 0.8, 0.45]) / nl));
        const back = dot(n, vw.f) < 0;
        const x0 = Math.floor(Math.min(q[0][0], q[1][0], q[2][0])), x1 = Math.ceil(Math.max(q[0][0], q[1][0], q[2][0]));
        const y0 = Math.floor(Math.min(q[0][1], q[1][1], q[2][1])), y1 = Math.ceil(Math.max(q[0][1], q[1][1], q[2][1]));
        const area = (q[1][0] - q[0][0]) * (q[2][1] - q[0][1]) - (q[1][1] - q[0][1]) * (q[2][0] - q[0][0]);
        if (Math.abs(area) < 1e-6) continue;
        for (let y = Math.max(0, y0); y <= Math.min(H - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) {
            const w0 = ((q[1][0] - x) * (q[2][1] - y) - (q[1][1] - y) * (q[2][0] - x)) / area, w1 = ((q[2][0] - x) * (q[0][1] - y) - (q[2][1] - y) * (q[0][0] - x)) / area, w2 = 1 - w0 - w1;
            if (w0 < 0 || w1 < 0 || w2 < 0) continue;
            const z = w0 * q[0][2] + w1 * q[1][2] + w2 * q[2][2];
            if (z > zb[y * W + x]) { zb[y * W + x] = z; const o = (y * W + x) * 3; px[o] = back ? sh : Math.round(sh * 0.5); px[o + 1] = back ? Math.round(sh * 0.5) : sh; px[o + 2] = Math.round(sh * 0.6); }
        }
    }
    await sharp(Buffer.from(px), { raw: { width: W, height: H, channels: 3 } }).png().toFile(process.argv[3]);
}
