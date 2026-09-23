// Mirror of src/track.js's resampling, in plain Node, so a circuit can be
// judged (length, corner speeds, how much of the lap is flat out) without
// building and running the .ent.
import { TRACKS, C } from './build.mjs';

const NSEG = C.NSEG;

export function profile(pts, opts = {}) {
    const n = pts.length;
    const ns = Math.min(n * 24, 1400);
    const S = [];
    for (let i = 0; i < ns; i++) {
        const u = (i * n) / ns;
        const k = Math.floor(u), f = u - k;
        const P = (j) => pts[((j % n) + n) % n];
        const a = P(k - 1), b = P(k), c = P(k + 1), d = P(k + 2);
        const f2 = f * f, f3 = f2 * f;
        const w0 = -0.5 * f3 + f2 - 0.5 * f, w1 = 1.5 * f3 - 2.5 * f2 + 1;
        const w2 = -1.5 * f3 + 2 * f2 + 0.5 * f, w3 = 0.5 * f3 - 0.5 * f2;
        S.push({
            x: a.x * w0 + b.x * w1 + c.x * w2 + d.x * w3,
            y: a.y * w0 + b.y * w1 + c.y * w2 + d.y * w3,
            z: a.z * w0 + b.z * w1 + c.z * w2 + d.z * w3,
            w: b.w + (c.w - b.w) * f,
        });
    }
    let total = 0;
    const arc = [];
    for (let i = 0; i < ns; i++) {
        arc.push(total);
        const j = (i + 1) % ns;
        total += Math.hypot(S[j].x - S[i].x, S[j].y - S[i].y, S[j].z - S[i].z);
    }
    const step = total / NSEG;
    const R = [];
    let si = 0;
    for (let i = 0; i < NSEG; i++) {
        const t = i * step;
        while (si < ns - 1 && arc[si + 1] <= t) si++;
        const sn = (si + 1) % ns;
        const aEnd = sn === 0 ? total : arc[sn];
        const seg = aEnd - arc[si];
        const f = seg > 0 ? (t - arc[si]) / seg : 0;
        R.push({
            x: S[si].x + (S[sn].x - S[si].x) * f,
            y: S[si].y + (S[sn].y - S[si].y) * f,
            z: S[si].z + (S[sn].z - S[si].z) * f,
            w: S[si].w + (S[sn].w - S[si].w) * f,
        });
    }
    // tangents, then curvature exactly as the runtime derives it
    const D = R.map((_, i) => {
        const j = (i + 1) % NSEG, p = (i - 1 + NSEG) % NSEG;
        const dx = R[j].x - R[p].x, dz = R[j].z - R[p].z;
        const L = Math.hypot(dx, dz) || 1e-4;
        return { dx: dx / L, dz: dz / L };
    });
    const curv = D.map((d, i) => {
        const j = (i + 1) % NSEG;
        return (D[j].dx * d.dz + D[j].dz * -d.dx) / step;
    });
    // corner speed the player's best car could hold (lateral limit 21 m/s^2)
    const vc = curv.map((c) => {
        const a = Math.abs(c);
        return a < 1e-5 ? 120 : Math.min(120, Math.sqrt(21 / a));
    });
    // forward/backward pass for a real speed trace: accelerate at 8 m/s^2,
    // brake at 30 m/s^2, capped by the corner limit and the car's top speed
    const TOP = opts.top || 88;
    const v = vc.map((s) => Math.min(s, TOP));
    for (let pass = 0; pass < 3; pass++) {
        for (let i = 0; i < NSEG; i++) {
            const j = (i + 1) % NSEG;
            v[j] = Math.min(v[j], Math.sqrt(v[i] * v[i] + 2 * 8 * step));
        }
        for (let i = NSEG - 1; i >= 0; i--) {
            const p = (i - 1 + NSEG) % NSEG;
            v[p] = Math.min(v[p], Math.sqrt(v[i] * v[i] + 2 * 30 * step));
        }
    }
    const lap = v.reduce((a, s) => a + step / s, 0);
    const kmh = v.map((s) => s * 3.6);
    const hills = R.map((r) => r.y);
    return {
        len: Math.round(total),
        step: +step.toFixed(2),
        vmaxKmh: Math.round(Math.max(...kmh)),
        vminKmh: Math.round(Math.min(...kmh)),
        avgKmh: Math.round(kmh.reduce((a, b) => a + b, 0) / NSEG),
        over250: +(kmh.filter((k) => k > 250).length / NSEG * 100).toFixed(0),
        under120: +(kmh.filter((k) => k < 120).length / NSEG * 100).toFixed(0),
        lapSec: +lap.toFixed(1),
        hill: `${Math.round(Math.min(...hills))}..${Math.round(Math.max(...hills))}`,
        tightestR: Math.round(1 / Math.max(...curv.map(Math.abs))),
    };
}

if (process.argv[1] && process.argv[1].endsWith('analyze.mjs')) {
    for (const t of TRACKS) console.log(t.name.padEnd(16), JSON.stringify(profile(t.pts)));
}
