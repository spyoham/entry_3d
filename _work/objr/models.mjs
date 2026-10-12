// The models that come with the work, as OBJ text (they go through the same
// reader as a pasted file), and makers of test models.
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const f3 = (v) => { const s = v.toFixed(3).replace(/\.?0+$/, ''); return s === '-0' ? '0' : s; };

// a tube around a (p, q) torus knot: nu rings of nv corners, four-cornered faces
export function knot({ p = 2, q = 3, nu = 96, nv = 12, R = 2, r = 0.8, tube = 0.42, quads = true, normals = false } = {}) {
    const P = (t) => { const c = R + r * Math.cos(q * t); return [c * Math.cos(p * t), r * Math.sin(q * t), c * Math.sin(p * t)]; };
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const norm = (a) => { const l = Math.hypot(...a) || 1; return a.map(x => x / l); };
    const out = [`# torus knot ${p},${q}`, 'o knot'];
    const vn = [];
    // a frame carried along the curve without twisting (each normal is the one before,
    // pressed flat against the new tangent); what it is off by after the whole round is
    // spread evenly, so the rings meet
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const C = [], Ts = [], Ns = [];
    for (let i = 0; i <= nu; i++) { const t = i / nu * 2 * Math.PI; C.push(P(t)); Ts.push(norm(sub(P(t + 1e-4), P(t - 1e-4)))); }
    Ns.push(norm(cross(Ts[0], [0.3, 1, 0.2])));
    for (let i = 1; i <= nu; i++) { const k = dot(Ns[i - 1], Ts[i]); Ns.push(norm(Ns[i - 1].map((x, j) => x - k * Ts[i][j]))); }
    const B0 = cross(Ts[0], Ns[0]);
    const off = Math.atan2(dot(Ns[nu], B0), dot(Ns[nu], Ns[0]));
    for (let i = 0; i < nu; i++) {
        const c = C[i], T = Ts[i], N0 = Ns[i], Bb = cross(T, N0), w = -off * i / nu;
        const N = N0.map((x, j) => x * Math.cos(w) + Bb[j] * Math.sin(w)), B = cross(T, N);
        for (let j = 0; j < nv; j++) {
            const a = j / nv * 2 * Math.PI, d = [0, 1, 2].map(k => N[k] * Math.cos(a) + B[k] * Math.sin(a));
            out.push(`v ${f3(c[0] + tube * d[0])} ${f3(c[1] + tube * d[1])} ${f3(c[2] + tube * d[2])}`);
            vn.push(`vn ${f3(d[0])} ${f3(d[1])} ${f3(d[2])}`);
        }
    }
    if (normals) out.push(...vn);
    const id = (i, j) => ((i + nu) % nu) * nv + ((j + nv) % nv) + 1;
    const ref = (k) => (normals ? `${k}//${k}` : `${k}`);
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
        const a = id(i, j), b = id(i + 1, j), c = id(i + 1, j + 1), d = id(i, j + 1);
        if (quads) out.push(`f ${ref(a)} ${ref(d)} ${ref(c)} ${ref(b)}`);
        else out.push(`f ${ref(a)} ${ref(d)} ${ref(c)}`, `f ${ref(a)} ${ref(c)} ${ref(b)}`);
    }
    return out.join('\n') + '\n';
}

// a turned shape (open at the top) in bands of materials, with its .mtl in the same text
export function vase({ seg = 40 } = {}) {
    const prof = [[0.9, 0], [1.0, 0.12], [0.78, 0.5], [0.62, 1.0], [0.72, 1.5], [1.05, 2.1], [1.2, 2.7], [1.02, 3.3], [0.66, 3.75], [0.5, 4.1], [0.56, 4.4], [0.74, 4.6],
        // the inside, back down
        [0.66, 4.58], [0.5, 4.38], [0.44, 4.1], [0.58, 3.75], [0.94, 3.3], [1.1, 2.7], [0.97, 2.12], [0.64, 1.52], [0.54, 1.0], [0.7, 0.5], [0.8, 0.2]];
    const yEnd = 0.16;       // the floor inside
    const mats = [['glaze', 0.16, 0.42, 0.62], ['band', 0.93, 0.87, 0.72], ['rim', 0.82, 0.58, 0.2], ['inside', 0.3, 0.2, 0.16]];
    const out = ['# a vase: a turned shape with a wall, four materials', ...mats.flatMap(([n, r, g, b]) => [`newmtl ${n}`, `Kd ${r} ${g} ${b}`]), 'o vase'];
    for (const [r, y] of prof) for (let j = 0; j < seg; j++) { const a = j / seg * 2 * Math.PI; out.push(`v ${f3(r * Math.cos(a))} ${f3(y)} ${f3(r * Math.sin(a))}`); }
    // the two middles: under the foot, and of the floor inside
    const p0 = prof.length * seg + 1, p1 = p0 + 1;
    out.push('v 0 0 0', `v 0 ${yEnd} 0`);
    const id = (i, j) => i * seg + (j % seg) + 1;
    let cur = 'glaze';
    out.push('usemtl glaze');
    for (let j = 0; j < seg; j++) out.push(`f ${p0} ${id(0, j)} ${id(0, j + 1)}`);
    for (let i = 0; i + 1 < prof.length; i++) {
        const m = i >= 11 ? 'inside' : i >= 9 ? 'rim' : (i === 2 || i === 5) ? 'band' : 'glaze';
        if (m !== cur) { out.push(`usemtl ${m}`); cur = m; }
        for (let j = 0; j < seg; j++) out.push(`f ${id(i, j)} ${id(i + 1, j)} ${id(i + 1, j + 1)} ${id(i, j + 1)}`);
    }
    for (let j = 0; j < seg; j++) out.push(`f ${id(prof.length - 1, j)} ${p1} ${id(prof.length - 1, j + 1)}`);
    return out.join('\n') + '\n';
}

// a hilly sheet (open, one surface seen from both sides), two materials by height
export function terrain({ n = 40 } = {}) {
    const h = (x, z) => 0.55 * Math.sin(x * 1.3) * Math.cos(z * 1.1) + 0.3 * Math.sin(x * 2.9 + 1) * Math.sin(z * 2.3) + 0.9 * Math.exp(-((x - 1) ** 2 + (z + 0.6) ** 2) * 0.9);
    const out = ['# hills', 'newmtl grass', 'Kd 0.36 0.6 0.3', 'newmtl rock', 'Kd 0.62 0.58 0.54', 'newmtl snow', 'Kd 0.95 0.96 0.98', 'o hills'];
    const Y = [];
    for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) { const x = (i / n - 0.5) * 6, z = (j / n - 0.5) * 6, y = h(x, z); Y.push(y); out.push(`v ${f3(x)} ${f3(y)} ${f3(z)}`); }
    const id = (i, j) => i * (n + 1) + j + 1;
    const groups = { grass: [], rock: [], snow: [] };
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const y = (Y[id(i, j) - 1] + Y[id(i + 1, j + 1) - 1]) / 2;
        groups[y > 0.75 ? 'snow' : y > 0.3 ? 'rock' : 'grass'].push(`f ${id(i, j)} ${id(i, j + 1)} ${id(i + 1, j + 1)} ${id(i + 1, j)}`);
    }
    for (const [m, fs] of Object.entries(groups)) out.push(`usemtl ${m}`, ...fs);
    return out.join('\n') + '\n';
}

export const car = () => fs.readFileSync(path.join(HERE, 'assets', 'sportsCar.obj'), 'utf8');

// what the answer box makes of a pasted file (Chrome: a line end, or CR LF, becomes one space)
export const asPasted = (text) => text.replace(/\r\n|\r|\n/g, ' ').trim();

export const EXAMPLES = () => [
    ['스포츠카', car()],
    ['매듭', knot({ normals: true })],
    ['꽃병', vase()],
    ['언덕', terrain()],
    ['큰 매듭', knot({ p: 3, q: 7, nu: 420, nv: 18, R: 2.2, r: 0.9, tube: 0.3 })],
];
