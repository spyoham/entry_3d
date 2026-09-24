// ============================================================
// f1car.mjs - the open-wheel car model for v5.
// Local space: +x right, +y up, +z forward. Built from "lofts" (a box whose
// front and back cross-sections differ) and hexagonal wheels, in two tiers:
// a cheap silhouette (vertices 1..vLo, faces 1..fLo) for the middle distance
// and the full car after it.
//
// The car is not convex (wings, wheels and sidepods overlap each other from
// most angles) so back-face culling alone cannot order its faces. Instead the
// build sorts each tier's faces back-to-front for 8 viewing directions; the
// renderer picks the direction the camera sees the car from and draws in that
// order.
//
// Face kinds: 0 livery, 1 livery accent, 2 carbon, 3 tyre, 4 rim,
//             5 helmet, 6 rain light, 7 wing accent (dark livery)
// ============================================================
export const K_LIV = 0, K_ACC = 1, K_CARB = 2, K_TYRE = 3, K_RIM = 4, K_HELM = 5, K_LIGHT = 6, K_DARK = 7;

export function f1Car() {
    const V = [], F = [], PIV = [];
    let pivot = [0, 0, 0];      // [flag, cx, cz]: flag 1 = front wheel (steers)
    const v = (x, y, z) => { V.push([+x.toFixed(3), +y.toFixed(3), +z.toFixed(3)]); PIV.push(pivot); return V.length; };
    let part = [];              // vertices of the part being built, for orienting
    let partCen = null;         // or an explicit centre to orient against
    const P = () => { part = []; partCen = null; };
    const pv = (x, y, z) => { const i = v(x, y, z); part.push(i); return i; };
    const faces = [];           // pending faces of this part
    const face = (a, b, c, d, k, twoSided) => faces.push({ q: [a, b, c, d], k, two: !!twoSided });
    const flush = () => {
        // orient every face so that (c-a)x(d-b) points INTO the part: that is
        // the winding the renderer's screen-space test takes as front-facing
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
    // A loft from front section A to back section B, each {z, hw, yb, yt}
    // (hwt = narrower half width at the top) centred on x = cx.
    const loft = (cx, A, B, which) => {
        P();
        const aw = A.hwt !== undefined ? A.hwt : A.hw, bw = B.hwt !== undefined ? B.hwt : B.hw;
        const a1 = pv(cx - A.hw, A.yb, A.z), a2 = pv(cx + A.hw, A.yb, A.z), a3 = pv(cx + aw, A.yt, A.z), a4 = pv(cx - aw, A.yt, A.z);
        const b1 = pv(cx - B.hw, B.yb, B.z), b2 = pv(cx + B.hw, B.yb, B.z), b3 = pv(cx + bw, B.yt, B.z), b4 = pv(cx - bw, B.yt, B.z);
        if (which.top !== undefined) face(a4, a3, b3, b4, which.top);
        if (which.bot !== undefined) face(a1, a2, b2, b1, which.bot);
        if (which.l !== undefined) face(a1, a4, b4, b1, which.l);
        if (which.r !== undefined) face(a2, a3, b3, b2, which.r);
        if (which.front !== undefined) face(a1, a2, a3, a4, which.front);
        if (which.back !== undefined) face(b1, b2, b3, b4, which.back);
        flush();
    };
    // a flat plate in the y-z plane at x, drawn from both sides
    const plate = (x, z0, z1, y0, y1, k) => {
        P();
        const a = pv(x, y0, z0), b = pv(x, y0, z1), c = pv(x, y1, z1), d = pv(x, y1, z0);
        partCen = [x - 1, (y0 + y1) / 2, (z0 + z1) / 2];
        face(a, b, c, d, k, true);
        flush();
    };
    // a flat plate in the x-z plane (the floor), seen from above only
    const deck = (hw, z0, z1, y, k) => {
        P();
        const a = pv(-hw, y, z0), b = pv(hw, y, z0), c = pv(hw, y, z1), d = pv(-hw, y, z1);
        partCen = [0, y - 1, (z0 + z1) / 2];
        face(a, b, c, d, k);
        flush();
    };
    // a single quad facing one way
    const card = (pts, towards, k) => {
        P();
        const q = pts.map(([x, y, z]) => pv(x, y, z));
        partCen = towards;
        face(q[0], q[1], q[2], q[3], k);
        flush();
    };
    // hexagonal wheel: tread faces round the rim and the outer sidewall, with
    // the rim standing just proud of it. The silhouette tier uses a square.
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
            face(o[k], o[j], i[j], i[k], K_TYRE);
        }
        if (full) {
            face(o[0], o[1], o[2], o[3], K_TYRE);
            face(o[3], o[4], o[5], o[0], K_TYRE);
        } else face(o[0], o[1], o[2], o[3], K_TYRE);
        flush();
        if (full) {
            P();
            const r = [];
            const xr = sx * (cxAbs + hw + 0.015);
            for (let k = 0; k < 6; k++) {
                const a = (k + 0.5) * 2 * Math.PI / 6;
                r.push(pv(xr, R + Math.sin(a) * R * 0.58, cz + Math.cos(a) * R * 0.58));
            }
            partCen = [sx * cxAbs, R, cz];
            face(r[0], r[1], r[2], r[3], K_RIM);
            face(r[3], r[4], r[5], r[0], K_RIM);
            flush();
        }
        pivot = [0, 0, 0];
    };
    const WHEELS = [[-1, 1.55, 0.33, 0.15, 0.80, 1], [1, 1.55, 0.33, 0.15, 0.80, 1], [-1, -1.45, 0.35, 0.20, 0.78, 0], [1, -1.45, 0.35, 0.20, 0.78, 0]];

    // ---------------- tier 1: silhouette ----------------
    loft(0, { z: 2.35, hw: 0.12, yb: 0.14, yt: 0.30 }, { z: 0.9, hw: 0.32, yb: 0.10, yt: 0.58 }, { top: K_LIV, l: K_LIV, r: K_LIV, front: K_ACC });
    loft(0, { z: 0.9, hw: 0.78, yb: 0.10, yt: 0.52, hwt: 0.34 }, { z: -1.95, hw: 0.30, yb: 0.10, yt: 0.44, hwt: 0.16 }, { top: K_LIV, l: K_LIV, r: K_LIV, back: K_CARB, front: K_CARB });
    loft(0, { z: -2.02, hw: 0.54, yb: 0.80, yt: 0.92 }, { z: -2.42, hw: 0.54, yb: 0.84, yt: 0.98 }, { top: K_ACC, front: K_CARB, back: K_ACC, l: K_LIV, r: K_LIV });
    loft(0, { z: 2.58, hw: 0.95, yb: 0.05, yt: 0.12 }, { z: 2.12, hw: 0.95, yb: 0.05, yt: 0.15 }, { top: K_ACC, front: K_CARB, l: K_LIV, r: K_LIV });
    for (const [sx, cz, R, hw, cx, st] of WHEELS) wheel(sx, cz, R, hw, cx, st, false);
    const vLo = V.length, fLo = F.length;

    // ---------------- tier 2: the full car ----------------
    // nose and front wing
    loft(0, { z: 2.36, hw: 0.10, yb: 0.15, yt: 0.29 }, { z: 1.0, hw: 0.29, yb: 0.12, yt: 0.55 }, { top: K_LIV, l: K_LIV, r: K_LIV, front: K_ACC });
    loft(0, { z: 2.60, hw: 0.95, yb: 0.05, yt: 0.11 }, { z: 2.14, hw: 0.95, yb: 0.05, yt: 0.15 }, { top: K_ACC, front: K_CARB, back: K_CARB });
    loft(0, { z: 2.20, hw: 0.93, yb: 0.15, yt: 0.17 }, { z: 2.02, hw: 0.93, yb: 0.17, yt: 0.25 }, { top: K_DARK, back: K_CARB });
    plate(-0.96, 2.66, 2.02, 0.04, 0.30, K_LIV);
    plate(0.96, 2.66, 2.02, 0.04, 0.30, K_LIV);
    // cockpit tub
    loft(0, { z: 1.0, hw: 0.29, yb: 0.10, yt: 0.55 }, { z: -0.55, hw: 0.36, yb: 0.10, yt: 0.62 }, { top: K_LIV, l: K_LIV, r: K_LIV });
    // sidepods: dark intake mouths, accent flanks, tapering towards the back
    for (const sx of [-1, 1]) {
        loft(sx * 0.56, { z: 0.62, hw: 0.22, yb: 0.10, yt: 0.50, hwt: 0.19 }, { z: -1.0, hw: 0.13, yb: 0.10, yt: 0.34, hwt: 0.08 },
            sx < 0 ? { top: K_LIV, l: K_ACC, front: K_CARB } : { top: K_LIV, r: K_ACC, front: K_CARB });
    }
    deck(0.74, 1.05, -1.35, 0.07, K_CARB);
    // engine cover down to the gearbox, the airbox over the driver's head
    loft(0, { z: -0.55, hw: 0.33, yb: 0.10, yt: 0.80, hwt: 0.20 }, { z: -1.98, hw: 0.14, yb: 0.10, yt: 0.40, hwt: 0.06 }, { top: K_LIV, l: K_LIV, r: K_LIV, back: K_CARB });
    loft(0, { z: -0.28, hw: 0.13, yb: 0.62, yt: 0.99 }, { z: -0.70, hw: 0.16, yb: 0.62, yt: 0.86 }, { top: K_ACC, l: K_LIV, r: K_LIV, front: K_CARB });
    // driver's helmet, visor forward
    loft(0, { z: 0.14, hw: 0.12, yb: 0.54, yt: 0.77, hwt: 0.10 }, { z: -0.16, hw: 0.12, yb: 0.54, yt: 0.76, hwt: 0.10 }, { top: K_HELM, l: K_HELM, r: K_HELM, front: K_CARB });
    // halo: the centre strut and the hoop round the cockpit
    loft(0, { z: 0.66, hw: 0.035, yb: 0.55, yt: 0.62 }, { z: 0.36, hw: 0.035, yb: 0.80, yt: 0.86 }, { top: K_CARB, l: K_CARB, r: K_CARB });
    loft(0, { z: 0.38, hw: 0.26, yb: 0.80, yt: 0.86 }, { z: -0.30, hw: 0.28, yb: 0.70, yt: 0.76 }, { top: K_CARB, front: K_CARB });
    // diffuser and crash structure
    loft(0, { z: -1.90, hw: 0.52, yb: 0.04, yt: 0.22 }, { z: -2.25, hw: 0.52, yb: 0.10, yt: 0.34 }, { top: K_CARB, back: K_CARB, l: K_CARB, r: K_CARB });
    // rear wing: main plane, flap, endplates, rain light
    loft(0, { z: -2.02, hw: 0.53, yb: 0.80, yt: 0.88 }, { z: -2.30, hw: 0.53, yb: 0.82, yt: 0.92 }, { top: K_ACC, front: K_CARB, bot: K_CARB });
    loft(0, { z: -2.28, hw: 0.53, yb: 0.90, yt: 0.95 }, { z: -2.46, hw: 0.53, yb: 0.96, yt: 1.02 }, { top: K_DARK, back: K_ACC, front: K_CARB });
    plate(-0.55, -1.92, -2.50, 0.32, 1.04, K_LIV);
    plate(0.55, -1.92, -2.50, 0.32, 1.04, K_LIV);
    card([[-0.07, 0.24, -2.27], [0.07, 0.24, -2.27], [0.07, 0.36, -2.27], [-0.07, 0.36, -2.27]], [0, 0.3, 0], K_LIGHT);
    for (const [sx, cz, R, hw, cx, st] of WHEELS) wheel(sx, cz, R, hw, cx, st, true);

    // outward unit normals ((c-a)x(d-b) points inward by construction)
    const N = F.map((f) => {
        const [a, b, c, d] = f.q.map((i) => V[i - 1]);
        const n = cross(sub(c, a), sub(d, b));
        const L = Math.hypot(...n) || 1;
        return n.map((x) => +(-x / L).toFixed(3));
    });

    // back-to-front face orders for 8 directions: direction d looks at the
    // car from azimuth d*45 degrees (0 = from straight ahead, clockwise seen
    // from above, i.e. 2 = from the car's right)
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

if (process.argv[1] && process.argv[1].endsWith('f1car.mjs')) {
    const m = f1Car();
    console.log('verts', m.V.length, 'faces', m.F.length, 'lo', m.vLo, m.fLo);
}
