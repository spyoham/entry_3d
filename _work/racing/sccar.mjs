// ============================================================
// sccar.mjs - v3.3.0 the safety car: a two-door road coupe (until now the
// safety car was the open-wheeler in silver and orange). Built the same way
// as f1car.mjs - lofts and hexagonal wheels, a silhouette tier and a full
// tier, back-to-front face orders for 8 directions - with its own face kinds
// for the glass, the light bar and the headlights.
// Local space: +x right, +y up, +z forward. About 4.6 m long, 1.9 m wide,
// 1.3 m to the top of the light bar.
//
// Face kinds: 0 body (livery), 1 stripe (accent), 2 trim, 3 tyre, 4 rim,
//             6 tail light, 8 glass, 9 light bar (flashing), 10 headlight
// The renderer (drawSC) draws it into the car model's projection slots, so
// it must not have more vertices than the open-wheeler (NCARV).
// ============================================================
export const R_LIV = 0, R_ACC = 1, R_TRIM = 2, R_TYRE = 3, R_RIM = 4, R_TAIL = 6, R_GLASS = 8, R_BAR = 9, R_HEAD = 10;

export function roadCar() {
    const V = [], F = [], PIV = [];
    let pivot = [0, 0, 0];
    const v = (x, y, z) => { V.push([+x.toFixed(3), +y.toFixed(3), +z.toFixed(3)]); PIV.push(pivot); return V.length; };
    let part = [];
    let partCen = null;
    const P = () => { part = []; partCen = null; };
    const pv = (x, y, z) => { const i = v(x, y, z); part.push(i); return i; };
    const faces = [];
    const face = (a, b, c, d, k, twoSided) => faces.push({ q: [a, b, c, d], k, two: !!twoSided });
    const flush = () => {
        let cen = partCen;
        if (!cen) {
            cen = [0, 0, 0];
            for (const i of part) for (let j = 0; j < 3; j++) cen[j] += V[i - 1][j] / part.length;
        }
        for (const f of faces) {
            const [a, b, c, d] = f.q.map((i) => V[i - 1]);
            const n = cross(sub(c, a), sub(d, b));
            const fc = [0, 1, 2].map((j) => (a[j] + b[j] + c[j] + d[j]) / 4);
            let q = f.q;
            if (dot(n, sub(fc, cen)) > 0) q = [q[3], q[2], q[1], q[0]];
            F.push({ q, k: f.k });
            if (f.two) F.push({ q: [q[3], q[2], q[1], q[0]], k: f.k });
        }
        faces.length = 0;
    };
    // a loft from section A to section B, each {z, hw, yb, yt} (hwt: the top's half width)
    const loft = (cx, A, B, which, cen) => {
        P();
        const aw = A.hwt !== undefined ? A.hwt : A.hw, bw = B.hwt !== undefined ? B.hwt : B.hw;
        const a1 = pv(cx - A.hw, A.yb, A.z), a2 = pv(cx + A.hw, A.yb, A.z), a3 = pv(cx + aw, A.yt, A.z), a4 = pv(cx - aw, A.yt, A.z);
        const b1 = pv(cx - B.hw, B.yb, B.z), b2 = pv(cx + B.hw, B.yb, B.z), b3 = pv(cx + bw, B.yt, B.z), b4 = pv(cx - bw, B.yt, B.z);
        if (cen) partCen = cen;
        if (which.top !== undefined) face(a4, a3, b3, b4, which.top);
        if (which.bot !== undefined) face(a1, a2, b2, b1, which.bot);
        if (which.l !== undefined) face(a1, a4, b4, b1, which.l);
        if (which.r !== undefined) face(a2, a3, b3, b2, which.r);
        if (which.front !== undefined) face(a1, a2, a3, a4, which.front);
        if (which.back !== undefined) face(b1, b2, b3, b4, which.back);
        flush();
    };
    const card = (pts, towards, k) => {
        P();
        const q = pts.map(([x, y, z]) => pv(x, y, z));
        partCen = towards;
        face(q[0], q[1], q[2], q[3], k);
        flush();
    };
    const wheel = (sx, cz, R, hw, cxAbs, steer, full) => {
        pivot = [steer ? 1 : 0, sx * cxAbs, cz];
        P();
        const xo = sx * (cxAbs + hw), xi = sx * (cxAbs - hw);
        const n = full ? 6 : 4;
        const o = [], i = [];
        for (let k = 0; k < n; k++) {
            const a = (k + 0.5) * 2 * Math.PI / n;
            o.push(pv(xo, R + Math.sin(a) * R, cz + Math.cos(a) * R));
            i.push(pv(xi, R + Math.sin(a) * R, cz + Math.cos(a) * R));
        }
        partCen = [sx * cxAbs, R, cz];
        for (let k = 0; k < n; k++) {
            const j = (k + 1) % n;
            face(o[k], o[j], i[j], i[k], R_TYRE);
        }
        if (full) {
            face(o[0], o[1], o[2], o[3], R_TYRE);
            face(o[3], o[4], o[5], o[0], R_TYRE);
        } else face(o[0], o[1], o[2], o[3], R_TYRE);
        flush();
        if (full) {
            P();
            const r = [];
            const xr = sx * (cxAbs + hw + 0.015);
            for (let k = 0; k < 6; k++) {
                const a = (k + 0.5) * 2 * Math.PI / 6;
                r.push(pv(xr, R + Math.sin(a) * R * 0.62, cz + Math.cos(a) * R * 0.62));
            }
            partCen = [sx * cxAbs, R, cz];
            face(r[0], r[1], r[2], r[3], R_RIM);
            face(r[3], r[4], r[5], r[0], R_RIM);
            flush();
        }
        pivot = [0, 0, 0];
    };
    // the wheels sit inside the body sides (half width 0.94), just proud of them
    const WHEELS = [[-1, 1.42, 0.34, 0.13, 0.84, 1], [1, 1.42, 0.34, 0.13, 0.84, 1], [-1, -1.38, 0.35, 0.15, 0.83, 0], [1, -1.38, 0.35, 0.15, 0.83, 0]];
    const BODY = [0, 0.45, 0];

    // ---------------- tier 1: silhouette ----------------
    loft(0, { z: 2.30, hw: 0.86, yb: 0.22, yt: 0.58 }, { z: -2.28, hw: 0.94, yb: 0.24, yt: 0.80 }, { top: R_LIV, l: R_LIV, r: R_LIV, front: R_TRIM, back: R_TRIM }, BODY);
    loft(0, { z: 0.55, hw: 0.88, hwt: 0.64, yb: 0.78, yt: 1.14 }, { z: -1.30, hw: 0.90, hwt: 0.66, yb: 0.80, yt: 1.12 }, { top: R_LIV, l: R_GLASS, r: R_GLASS, front: R_GLASS, back: R_GLASS });
    for (const [sx, cz, R, hw, cx, st] of WHEELS) wheel(sx, cz, R, hw, cx, st, false);
    const vLo = V.length, fLo = F.length;

    // ---------------- tier 2: the full car ----------------
    // bonnet: low at the nose, up to the windscreen; the grille under it
    loft(0, { z: 2.32, hw: 0.84, yb: 0.22, yt: 0.56 }, { z: 0.88, hw: 0.95, yb: 0.20, yt: 0.78 }, { top: R_LIV, l: R_LIV, r: R_LIV, front: R_TRIM }, BODY);
    // doors and the rear quarters, the tail
    loft(0, { z: 0.88, hw: 0.95, yb: 0.20, yt: 0.78 }, { z: -1.75, hw: 0.95, yb: 0.22, yt: 0.82 }, { l: R_LIV, r: R_LIV }, BODY);
    loft(0, { z: -1.75, hw: 0.95, yb: 0.22, yt: 0.82 }, { z: -2.30, hw: 0.90, yb: 0.28, yt: 0.78 }, { top: R_LIV, l: R_LIV, r: R_LIV, back: R_LIV }, BODY);
    // the stripe along the sills
    loft(0, { z: 1.95, hw: 0.97, yb: 0.24, yt: 0.34 }, { z: -1.95, hw: 0.97, yb: 0.26, yt: 0.36 }, { l: R_ACC, r: R_ACC }, BODY);
    // windscreen (sloped), roof, rear window (sloped down to the tail)
    loft(0, { z: 0.92, hw: 0.90, hwt: 0.88, yb: 0.77, yt: 0.79 }, { z: 0.10, hw: 0.88, hwt: 0.64, yb: 0.79, yt: 1.17 }, { top: R_GLASS, l: R_GLASS, r: R_GLASS }, [0, 0.7, -0.4]);
    loft(0, { z: 0.10, hw: 0.88, hwt: 0.64, yb: 0.79, yt: 1.17 }, { z: -0.80, hw: 0.90, hwt: 0.65, yb: 0.81, yt: 1.16 }, { top: R_LIV, l: R_GLASS, r: R_GLASS }, [0, 0.7, -0.35]);
    loft(0, { z: -0.80, hw: 0.90, hwt: 0.65, yb: 0.81, yt: 1.16 }, { z: -1.78, hw: 0.94, hwt: 0.84, yb: 0.82, yt: 0.84 }, { top: R_GLASS, l: R_LIV, r: R_LIV }, [0, 0.7, -0.6]);
    // the light bar across the roof
    loft(0, { z: -0.10, hw: 0.52, yb: 1.16, yt: 1.27 }, { z: -0.36, hw: 0.52, yb: 1.16, yt: 1.27 }, { top: R_BAR, front: R_BAR, back: R_BAR, l: R_BAR, r: R_BAR });
    // headlights and tail lights
    for (const sx of [-1, 1]) {
        card([[sx * 0.40, 0.44, 2.33], [sx * 0.76, 0.44, 2.28], [sx * 0.76, 0.54, 2.27], [sx * 0.40, 0.54, 2.32]], [sx * 0.58, 0.49, 1.5], R_HEAD);
        card([[sx * 0.48, 0.60, -2.31], [sx * 0.84, 0.60, -2.27], [sx * 0.84, 0.70, -2.27], [sx * 0.48, 0.70, -2.31]], [sx * 0.66, 0.65, -1.5], R_TAIL);
    }
    for (const [sx, cz, R, hw, cx, st] of WHEELS) wheel(sx, cz, R, hw, cx, st, true);

    const N = F.map((f) => {
        const [a, b, c, d] = f.q.map((i) => V[i - 1]);
        const n = cross(sub(c, a), sub(d, b));
        const L = Math.hypot(...n) || 1;
        return n.map((x) => +(-x / L).toFixed(3));
    });
    const order = (f0, f1) => {
        const out = [];
        for (let d = 0; d < 8; d++) {
            const a = d * Math.PI / 4;
            const eye = [Math.sin(a) * 14, 3.2, Math.cos(a) * 14];
            const idx = [];
            for (let f = f0; f < f1; f++) idx.push(f);
            const depth = (f) => {
                const pts = F[f].q.map((i) => V[i - 1]);
                const c = [0, 1, 2].map((j) => pts.reduce((s, p) => s + p[j], 0) / 4);
                return Math.hypot(c[0] - eye[0], c[1] - eye[1], c[2] - eye[2]);
            };
            idx.sort((x, y) => depth(y) - depth(x) || x - y);
            for (const f of idx) out.push(f + 1);
        }
        return out;
    };
    return { V, F, N, PIV, vLo, fLo, ordLo: order(0, fLo), ordHi: order(fLo, F.length) };
}

function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }

if (process.argv[1] && process.argv[1].endsWith('sccar.mjs')) {
    const m = roadCar();
    console.log('verts', m.V.length, 'faces', m.F.length, 'lo', m.vLo, m.fLo);
}
