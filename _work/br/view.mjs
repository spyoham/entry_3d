// Look at a prefab: draws it back to front through its BSP, the way the game does,
// and writes a PNG. usage: node view.mjs name [lod] [eyeX eyeY eyeZ] [out.png]
import { createRequire } from 'node:module';
import { buildBSP, faceNormal, dot, sub, norm, cross, shadeOf, MATERIALS } from './geom.mjs';
import { ALL } from './prefabs.mjs';
const require = createRequire(new URL('../../entry-vibe-coding/package.json', import.meta.url));

export function renderFaces(faces, eye, target, W = 640, H = 400, { bsp = null, bg = [190, 200, 205], fov = 70 } = {}) {
    const px = new Uint8Array(W * H * 3);
    for (let i = 0; i < W * H; i++) { px[i * 3] = bg[0]; px[i * 3 + 1] = bg[1]; px[i * 3 + 2] = bg[2]; }
    const fwd = norm(sub(target, eye)), R = norm(cross([0, 1, 0], fwd)), U = cross(fwd, R);
    const F = (W / 2) / Math.tan(fov * Math.PI / 360);
    const view = (p) => { const r = sub(p, eye); return [dot(r, R), dot(r, U), dot(r, fwd)]; };
    const fill = (poly, col) => {
        // clip at the near plane
        const N = 5; const out = [];
        for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length];
            if (a[2] >= N) out.push(a);
            if ((a[2] >= N) !== (b[2] >= N)) { const t = (N - a[2]) / (b[2] - a[2]); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, N]); } }
        if (out.length < 3) return;
        const P = out.map(([x, y, z]) => [W / 2 + x * F / z, H / 2 - y * F / z]);
        let lo = Infinity, hi = -Infinity; for (const [, y] of P) { lo = Math.min(lo, y); hi = Math.max(hi, y); }
        for (let yy = Math.max(0, Math.ceil(lo - 0.5)); yy <= Math.min(H - 1, Math.floor(hi - 0.5)); yy++) {
            const yc = yy + 0.5, xs = [];
            for (let i = 0; i < P.length; i++) { const [xa, ya] = P[i], [xb, yb] = P[(i + 1) % P.length]; if ((ya <= yc) !== (yb <= yc)) xs.push(xa + (yc - ya) * (xb - xa) / (yb - ya)); }
            xs.sort((a, b) => a - b);
            for (let i = 0; i + 1 < xs.length; i += 2) for (let xx = Math.max(0, Math.round(xs[i])); xx < Math.min(W, Math.round(xs[i + 1])); xx++) { const o = (yy * W + xx) * 3; px[o] = col[0]; px[o + 1] = col[1]; px[o + 2] = col[2]; }
        }
    };
    const colOf = (f) => { const n = faceNormal(f.v); const s = shadeOf(n); const k = 0.5 + s / 14; const c = MATERIALS[f.m] || [255, 0, 255]; return c.map(x => Math.min(255, Math.round(x * k))); };
    const drawFace = (f) => fill(f.v.map(view), colOf(f));
    if (bsp) {
        const walk = (id) => {
            if (id < 0) return;
            const nd = bsp.nodes[id];
            const s = dot(nd.n, eye) - nd.d;
            const near = s >= 0 ? nd.front : nd.back, far = s >= 0 ? nd.back : nd.front;
            walk(far);
            for (const f of nd.faces) if ((f.s > 0) === (s >= 0)) drawFace(f);
            walk(near);
        };
        walk(bsp.root);
    } else {
        // painter by centre depth, for comparison
        const fs = faces.map(f => ({ f, z: f.v.reduce((a, p) => a + view(p)[2], 0) / f.v.length })).sort((a, b) => b.z - a.z);
        for (const { f } of fs) { const n = faceNormal(f.v); if (dot(n, sub(eye, f.v[0])) > 0) drawFace(f); }
    }
    return px;
}

export async function savePng(px, W, H, file) {
    const sharp = require('sharp');
    await sharp(Buffer.from(px), { raw: { width: W, height: H, channels: 3 } }).png().toFile(file);
}

if (process.argv[1] && process.argv[1].endsWith('view.mjs')) {
    const [name = 'houseS', lod = '0', ex, ey, ez, out = 'view.png', tx = '0', ty = '150', tz = '0'] = process.argv.slice(2);
    const p = ALL.find(p => p.name === name);
    if (!p) throw new Error('no prefab ' + name + ' (' + ALL.map(p => p.name).join(' ') + ')');
    const m = p.lods[Number(lod)];
    const bsp = buildBSP(m.faces);
    const eye = [Number(ex ?? 1800), Number(ey ?? 900), Number(ez ?? -2200)];
    const px = renderFaces(m.faces, eye, [Number(tx), Number(ty), Number(tz)], 640, 400, { bsp });
    await savePng(px, 640, 400, out);
    let n = 0; for (const nd of bsp.nodes) n += nd.faces.length;
    console.log(name, 'lod', lod, 'faces', m.faces.length, '-> bsp faces', n, 'nodes', bsp.nodes.length, 'leaves', bsp.leaves, 'boxes', m.boxes.length, 'loot', m.loot.length, 'nav', m.nav.length);
}
