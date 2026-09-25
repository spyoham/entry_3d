// ============================================================
// real/geom.mjs - plane geometry for turning map data into scenery
// (points are [x, z] in metres)
// ============================================================
export function area(P) {
    let a = 0;
    for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; a += p[0] * q[1] - q[0] * p[1]; }
    return a / 2;
}

export function centroid(P) {
    let cx = 0, cz = 0, a = 0;
    for (let i = 0; i < P.length; i++) {
        const p = P[i], q = P[(i + 1) % P.length];
        const c = p[0] * q[1] - q[0] * p[1];
        a += c; cx += (p[0] + q[0]) * c; cz += (p[1] + q[1]) * c;
    }
    if (Math.abs(a) < 1e-9) return [P.reduce((s, p) => s + p[0], 0) / P.length, P.reduce((s, p) => s + p[1], 0) / P.length];
    return [cx / (3 * a), cz / (3 * a)];
}

export function hull(pts) {
    const P = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (P.length < 3) return P;
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const p of P) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    up.pop(); lo.pop();
    return lo.concat(up);
}

// the smallest rectangle round a polygon: centre, half extents along its own
// axes, and the angle of its first axis (radians from +x towards +z)
export function obb(P) {
    const H = hull(P);
    if (H.length < 3) {
        const [cx, cz] = centroid(P);
        return { cx, cz, hu: 1, hv: 1, ang: 0 };
    }
    let best = null;
    for (let i = 0; i < H.length; i++) {
        const p = H[i], q = H[(i + 1) % H.length];
        const L = Math.hypot(q[0] - p[0], q[1] - p[1]);
        if (L < 1e-6) continue;
        const ux = (q[0] - p[0]) / L, uz = (q[1] - p[1]) / L;
        let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
        for (const h of H) {
            const u = h[0] * ux + h[1] * uz, v = -h[0] * uz + h[1] * ux;
            u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v);
        }
        const A = (u1 - u0) * (v1 - v0);
        if (!best || A < best.A) best = { A, ux, uz, u0, u1, v0, v1 };
    }
    const { ux, uz, u0, u1, v0, v1 } = best;
    const cu = (u0 + u1) / 2, cv = (v0 + v1) / 2;
    return { cx: cu * ux - cv * uz, cz: cu * uz + cv * ux, hu: (u1 - u0) / 2, hv: (v1 - v0) / 2, ang: Math.atan2(uz, ux) };
}

// keep the part of polygon P on the side n . p >= c
export function clipHalf(P, nx, nz, c) {
    const out = [];
    for (let i = 0; i < P.length; i++) {
        const a = P[i], b = P[(i + 1) % P.length];
        const da = a[0] * nx + a[1] * nz - c, db = b[0] * nx + b[1] * nz - c;
        if (da >= 0) out.push(a);
        if ((da >= 0) !== (db >= 0)) {
            const t = da / (da - db);
            out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
        }
    }
    return out;
}

export function inside(P, x, z) {
    let c = false;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
        const a = P[i], b = P[j];
        if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
    }
    return c;
}

// nearest-point index over a dense polyline, bucketed on a grid
export class PointIndex {
    constructor(pts, cell = 25) {
        this.p = pts; this.c = cell; this.m = new Map();
        pts.forEach((q, i) => {
            const k = Math.floor(q[0] / cell) + ',' + Math.floor(q[1] / cell);
            if (!this.m.has(k)) this.m.set(k, []);
            this.m.get(k).push(i);
        });
    }
    // nearest point within maxR (or -1)
    near(x, z, maxR = 1e9) {
        const c = this.c;
        const gx = Math.floor(x / c), gz = Math.floor(z / c);
        let best = -1, bd = maxR * maxR;
        const R = Math.min(Math.ceil(maxR / c), 400);
        for (let r = 0; r <= R; r++) {
            if (best >= 0 && (r - 1) * c > Math.sqrt(bd)) break;
            for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) {
                if (Math.max(Math.abs(i), Math.abs(j)) !== r) continue;
                const L = this.m.get((gx + i) + ',' + (gz + j));
                if (!L) continue;
                for (const k of L) {
                    const q = this.p[k];
                    const d = (q[0] - x) ** 2 + (q[1] - z) ** 2;
                    if (d < bd) { bd = d; best = k; }
                }
            }
        }
        return best < 0 ? { i: -1, d: Infinity } : { i: best, d: Math.sqrt(bd) };
    }
}

// a small deterministic hash in [0, 1)
export function hash01(...v) {
    let h = 2166136261;
    for (const x of v) {
        const s = String(x);
        for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    }
    h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
    return (h >>> 0) / 4294967296;
}
