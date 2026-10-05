// Build-time side of the triangle meshes: the meshes, their BVH, and everything
// about them that never changes (the meshes and the sun stand still), written
// out as EJS list literals.
//
//   1  a stepped pyramid: three tiers and a pointed cap, 34 triangles, matt
//   2  a chess knight: a turned base and a head cut from a side view, a faint mirror
//   3  the spinning top of "Inception": a turned shape, polished metal; it drifts in a small circle
//   4  a sports car: assets/sportsCar.obj by Teh_Bucket (OpenGameArt, CC0), "roughly based on a
//      Lamborghini Huracan"; glossy paint, mirror glass
//
// Neither is convex - a tier shades the one below, the knight's head its own
// base - so a point on them needs a shadow ray against the triangles, and that
// is what the BVH is for (as for every mirror ray that may reach a mesh).
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const WS = 1024;

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a) => Math.sqrt(dot(a, a));

// a mesh under construction: P adds a vertex (model space, turned by rot about y, then moved), tri a triangle
function builder(V, T, mesh, cx, cz, rotDeg, scale = 1) {
    const rot = rotDeg * Math.PI / 180, c = Math.cos(rot), s = Math.sin(rot);
    const P = (x, y, z) => { const p = [cx + (x * c + z * s) * scale, y * scale, cz + (-x * s + z * c) * scale]; p.mesh = mesh; V.push(p); return V.length - 1; };
    const tri = (a, b, cc, col, kr = 0) => T.push({ v: [a, b, cc], col, kr, mesh });
    const quad = (a, b, cc, d, col, kr = 0) => { tri(a, b, cc, col, kr); tri(a, cc, d, col, kr); };
    return { P, tri, quad };
}

// ---- 1: the stepped pyramid ----
function pyramid(V, T, mesh) {
    const { P, tri, quad } = builder(V, T, mesh, 3.6, 7.5, 28);
    // a tier: a box from y0 to y1, half-width h; sides and top (counter-clockwise seen from outside)
    const tier = (h, y0, y1, side, top) => {
        const b = [P(-h, y0, -h), P(h, y0, -h), P(h, y0, h), P(-h, y0, h)];
        const t = [P(-h, y1, -h), P(h, y1, -h), P(h, y1, h), P(-h, y1, h)];
        for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; quad(b[j], b[i], t[i], t[j], side); }
        quad(t[0], t[3], t[2], t[1], top);
    };
    tier(1.5, 0, 0.55, [206, 160, 104], [226, 188, 132]);
    tier(1.0, 0.55, 1.1, [198, 150, 96], [222, 182, 126]);
    tier(0.55, 1.1, 1.65, [190, 142, 90], [218, 176, 120]);
    const h = 0.38, y0 = 1.65, y1 = 2.35;
    const b = [P(-h, y0, -h), P(h, y0, -h), P(h, y0, h), P(-h, y0, h)], apex = P(0, y1, 0);
    for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; tri(b[j], b[i], apex, [226, 96, 60]); }
}

// a simple polygon (counter-clockwise, x and y) into triangles, by cutting ears
function earClip(pts) {
    const idx = pts.map((_, i) => i), out = [];
    const area = (a, b, c) => (pts[b][0] - pts[a][0]) * (pts[c][1] - pts[a][1]) - (pts[b][1] - pts[a][1]) * (pts[c][0] - pts[a][0]);
    const inside = (p, a, b, c) => area(a, b, p) >= 0 && area(b, c, p) >= 0 && area(c, a, p) >= 0;
    let guard = 0;
    while (idx.length > 3 && guard++ < 10000) {
        let cut = false;
        for (let i = 0; i < idx.length; i++) {
            const a = idx[(i + idx.length - 1) % idx.length], b = idx[i], c = idx[(i + 1) % idx.length];
            if (area(a, b, c) <= 1e-9) continue;
            if (idx.some(p => p !== a && p !== b && p !== c && inside(p, a, b, c))) continue;
            out.push([a, b, c]); idx.splice(i, 1); cut = true; break;
        }
        if (!cut) throw new Error('earClip: no ear (is the outline counter-clockwise and simple?)');
    }
    out.push([idx[0], idx[1], idx[2]]);
    return out;
}

// ---- 2: the knight ----
function knight(V, T, mesh) {
    const { P, tri, quad } = builder(V, T, mesh, 6.6, -1.2, 189, 1.12);
    const col = [232, 226, 204], kr = 70;
    // the base: a profile (radius, height) turned about the y axis
    const prof = [[0.80, 0], [0.80, 0.13], [0.64, 0.25], [0.46, 0.34], [0.50, 0.50], [0.40, 0.62]];
    const SEG = 8;
    const ring = prof.map(([r, y]) => Array.from({ length: SEG }, (_, j) => { const a = j * 2 * Math.PI / SEG; return P(r * Math.cos(a), y, r * Math.sin(a)); }));
    for (let k = 0; k + 1 < prof.length; k++) for (let j = 0; j < SEG; j++) { const j1 = (j + 1) % SEG; quad(ring[k][j], ring[k + 1][j], ring[k + 1][j1], ring[k][j1], col, kr); }
    const top = prof.length - 1, cen = P(0, prof[top][1], 0);
    for (let j = 0; j < SEG; j++) tri(cen, ring[top][(j + 1) % SEG], ring[top][j], col, kr);
    // the head and neck: a side view (it looks along +x), given clockwise from the back of the base, with a thickness
    const side = [[-0.36, 0.62], [-0.44, 1.10], [-0.36, 1.58], [-0.20, 1.98], [-0.04, 2.20], [0.03, 2.42], [0.14, 2.20], [0.34, 2.05],
        [0.62, 1.74], [0.71, 1.55], [0.58, 1.44], [0.36, 1.50], [0.21, 1.38], [0.31, 1.04], [0.38, 0.62]].reverse();
    const W = 0.19;
    const front = side.map(([x, y]) => P(x, y, W)), back = side.map(([x, y]) => P(x, y, -W));
    for (const [a, b, c] of earClip(side)) { tri(front[a], front[b], front[c], col, kr); tri(back[a], back[c], back[b], col, kr); }
    for (let i = 0; i < side.length; i++) {
        const j = (i + 1) % side.length;
        if (side[i][1] === 0.62 && side[j][1] === 0.62) continue;      // the foot of the neck sits on the base
        quad(front[i], back[i], back[j], front[j], col, kr);
    }
}

// ---- 3: the top ----
// (it stands upright and spins about its own axis, which a turned shape does not show; what moves is
// the whole top, round a small circle - see animate in scene.js)
export const TOP_AT = [4.9, -3.9];
function spinTop(V, T, mesh) {
    const { P, tri, quad } = builder(V, T, mesh, TOP_AT[0], TOP_AT[1], 0, 0.9);
    const col = [206, 208, 216], kr = 176;
    const prof = [[0.10, 0.11], [0.34, 0.30], [0.30, 0.40], [0.08, 0.50], [0.07, 0.80]];
    const SEG = 8;
    const ring = prof.map(([r, y]) => Array.from({ length: SEG }, (_, j) => { const a = j * 2 * Math.PI / SEG; return P(r * Math.cos(a), y, r * Math.sin(a)); }));
    const tip = P(0, 0, 0), cap = P(0, 0.83, 0);
    for (let j = 0; j < SEG; j++) { const j1 = (j + 1) % SEG; tri(tip, ring[0][j], ring[0][j1], col, kr); tri(cap, ring[prof.length - 1][j1], ring[prof.length - 1][j], col, kr); }
    for (let k = 0; k + 1 < prof.length; k++) for (let j = 0; j < SEG; j++) { const j1 = (j + 1) % SEG; quad(ring[k][j], ring[k + 1][j], ring[k + 1][j1], ring[k][j1], col, kr); }
}

// ---- 4: the car ----
function car(V, T, mesh) {
    const src = fs.readFileSync(path.join(HERE, 'assets', 'sportsCar.obj'), 'utf8').split(/\r?\n/);
    const ov = [], faces = [];
    for (const l of src) {
        const p = l.trim().split(/\s+/);
        if (p[0] === 'v') ov.push(p.slice(1, 4).map(Number));
        if (p[0] === 'f') { const ix = p.slice(1).map(s => parseInt(s) - 1); for (let k = 1; k + 1 < ix.length; k++) faces.push([ix[0], ix[k], ix[k + 1]]); }
    }
    // the model: nose towards -x, 5.5 long, wheels at x = -1.58 and 1.53
    const { P, tri } = builder(V, T, mesh, 1.8, -1.0, 215, 0.74);
    const weld = new Map();
    const vid = (i) => { const k = ov[i].map(x => x.toFixed(4)).join(','); if (!weld.has(k)) weld.set(k, P(ov[i][0], ov[i][1] - 0.03, ov[i][2])); return weld.get(k); };
    const paint = [244, 150, 16], glass = [20, 26, 36], tyre = [26, 26, 28];
    let kept = 0;
    for (const f of faces) {
        const p = f.map(i => ov[i]), n0 = cross(sub(p[1], p[0]), sub(p[2], p[0])), nl = len(n0);
        if (nl < 1e-9) continue;
        const n = n0.map(x => x / nl), c = [0, 1, 2].map(a => (p[0][a] + p[1][a] + p[2][a]) / 3);
        // left out: the wing mirrors (28 slivers). The underside and the wheels' inner faces stay: they are
        // never seen, but a shadow ray from the floor has to find the car closed
        if (p.every(q => Math.abs(q[2]) > 1.0 && q[1] > 0.86 && q[0] > -1.05 && q[0] < -0.7)) continue;
        const wheel = [-1.58, 1.53].some(xw => p.every(q => Math.hypot(q[0] - xw, q[1] - 0.45) < 0.52 && Math.abs(q[2]) > 0.8));
        const windscreen = Math.abs(n[0] + 0.28) < 0.05 && n[1] > 0.94 && c[1] > 1.0;
        const sideGlass = n[1] > 0.55 && n[1] < 0.68 && Math.abs(n[2]) > 0.7 && c[1] > 0.98;
        const [col, kr] = wheel ? [tyre, 0] : (windscreen || sideGlass) ? [glass, 170] : [paint, 64];
        tri(vid(f[0]), vid(f[1]), vid(f[2]), col, kr);
        kept++;
    }
    return kept;
}

export function makeMesh() {
    const V = [], T = [];
    pyramid(V, T, 0);
    knight(V, T, 1);
    spinTop(V, T, 2);
    car(V, T, 3);
    return { V, T, meshes: 4, moving: [2] };
}

// ---- BVH: split where the surface-area cost is least, at most LEAF triangles a leaf, nodes in depth-first order ----
// (a node test and a triangle test cost about the same in blocks; a ray that starts on a mesh is inside
// many boxes, so fewer, tighter boxes matter more than small leaves)
const LEAF = Number(process.env.BVH_LEAF || 4);
// Node i: its first child is i + 1, its second BRIGHT[i]; BSKIP[i] is where to go on when the node is
// missed or done (0 = out of the tree). A leaf has BCNT[i] > 0 triangles from BFIRST[i] on.
// The root's two children are the two meshes.
function buildBVH(tris, verts, meshes) {
    const order = [], nodes = [];
    const bounds = (ids) => { const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9]; for (const i of ids) for (const v of tris[i].v) for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], verts[v][a]); hi[a] = Math.max(hi[a], verts[v][a]); } return [lo, hi]; };
    const cen = (i) => { const [lo, hi] = bounds([i]); return [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2]; };
    const rec = (ids, split = null) => {
        const me = nodes.length;
        const node = { first: 0, cnt: 0, right: 0, skip: 0 };
        nodes.push(node);
        const leaf = () => { node.first = order.length + 1; node.cnt = ids.length; order.push(...ids); return me; };
        if (!split && ids.length <= 2) return leaf();
        let A, B;
        if (split) { [A, B] = split; }
        else {
            // try every cut of the triangles sorted along each axis
            const area = (ix) => { const [lo, hi] = bounds(ix); const d = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]]; return d[0] * d[1] + d[1] * d[2] + d[2] * d[0]; };
            const whole = area(ids);
            if (ids.length <= LEAF) return leaf();
            let best = Infinity;
            for (let ax = 0; ax < 3; ax++) {
                const sorted = [...ids].sort((p, q) => cen(p)[ax] - cen(q)[ax]);
                for (let k = 1; k < sorted.length; k++) {
                    const l = sorted.slice(0, k), r = sorted.slice(k);
                    const cost = 1 + (area(l) * l.length + area(r) * r.length) / (whole || 1);
                    if (cost < best) { best = cost; A = l; B = r; }
                }
            }
            if (!A) return leaf();
        }
        rec(A);
        node.right = rec(B) + 1;        // 1-based
        return me;
    };
    const all = tris.map((_, i) => i);
    const group = (ms) => {
        if (ms.length === 1) return rec(all.filter(i => tris[i].mesh === ms[0]));
        const me = nodes.length, node = { first: 0, cnt: 0, right: 0, skip: 0 };
        nodes.push(node);
        const h = ms.length >> 1;
        group(ms.slice(0, h));
        node.right = group(ms.slice(h)) + 1;
        return me;
    };
    group(Array.from({ length: meshes }, (_, m) => m));
    // skip links: after a subtree comes its parent's second child, or what follows the parent
    const link = (i, next) => { const n = nodes[i]; n.skip = next; if (n.cnt === 0) { link(i + 1, n.right); link(n.right - 1, next); } };
    link(0, 0);
    return { order, nodes };
}

// ---- everything static, as lists ----
// sun: the direction towards it (x1024), as the scene has it
export function meshData(sun) {
    const { V, T, meshes, moving } = makeMesh();
    const L = [sun[0] / 1024, sun[1] / 1024, sun[2] / 1024];
    const { order, nodes } = buildBVH(T, V, meshes);
    const tris = order.map(i => T[i]);                  // triangles in leaf order
    // The meshes and the sun stand still, so whether a mesh can shade a triangle never changes. Each sunny
    // triangle is tried at build time, with rays from points spread over it: never shaded (TSELF 0, no
    // shadow ray against the meshes), always shaded (it counts as out of the sun), or partly (TSELF 1:
    // a shadow ray through the tree for each of its rays).
    const selfShade = (() => {
        const P = tris.map(t => t.v.map(i => [V[i][0] * WS, V[i][1] * WS, V[i][2] * WS]));
        const hit = (o, skip) => {
            for (let j = 0; j < P.length; j++) {
                if (j === skip) continue;
                const [p0, p1, p2] = P[j], e1 = sub(p1, p0), e2 = sub(p2, p0), pv = cross(L, e2), det = dot(e1, pv);
                if (Math.abs(det) < 1e-9) continue;
                const tv = sub(o, p0), u = dot(tv, pv) / det;
                if (u < 0 || u > 1) continue;
                const qv = cross(tv, e1), v = dot(L, qv) / det;
                if (v < 0 || u + v > 1) continue;
                if (dot(e2, qv) / det > 6) return true;
            }
            return false;
        };
        return tris.map((t, i) => {
            const [p0, p1, p2] = P[i], n0 = cross(sub(p1, p0), sub(p2, p0));
            if (dot(n0, L) / len(n0) <= 0.02) return 0;
            let lit = 0, shd = 0;
            const N = 12;
            for (let a1 = 0; a1 <= N; a1++) for (let b1 = 0; a1 + b1 <= N; b1++) {
                // (points a little inside the edges: an edge shared with a neighbour is not a shadow)
                const u = (a1 + 0.3) / (N + 0.9), v = (b1 + 0.3) / (N + 0.9);
                const o = [p0[0] + (p1[0] - p0[0]) * u + (p2[0] - p0[0]) * v, p0[1] + (p1[1] - p0[1]) * u + (p2[1] - p0[1]) * v, p0[2] + (p1[2] - p0[2]) * u + (p2[2] - p0[2]) * v];
                if (hit(o, i)) shd++; else lit++;
            }
            return shd === 0 ? 0 : lit === 0 ? 2 : 1;
        });
    })();
    // TSHP: does the triangle's floor shadow add anything? Largest first; one whose shadow is already
    // covered by those kept (tried at 45 points) is left out.
    const shadowNeeded = (() => {
        const F = tris.map(t => t.v.map(i => [V[i][0] * WS - L[0] * V[i][1] * WS / L[1], V[i][2] * WS - L[2] * V[i][1] * WS / L[1]]));
        const area = (f) => Math.abs((f[1][0] - f[0][0]) * (f[2][1] - f[0][1]) - (f[1][1] - f[0][1]) * (f[2][0] - f[0][0])) / 2;
        const inside = (p, f) => {
            const d1 = (p[0] - f[1][0]) * (f[0][1] - f[1][1]) - (f[0][0] - f[1][0]) * (p[1] - f[1][1]);
            const d2 = (p[0] - f[2][0]) * (f[1][1] - f[2][1]) - (f[1][0] - f[2][0]) * (p[1] - f[2][1]);
            const d3 = (p[0] - f[0][0]) * (f[2][1] - f[0][1]) - (f[2][0] - f[0][0]) * (p[1] - f[0][1]);
            return !((d1 < -1 || d2 < -1 || d3 < -1) && (d1 > 1 || d2 > 1 || d3 > 1));
        };
        const need = tris.map(() => 0), kept = [];
        const order = tris.map((_, i) => i).filter(i => selfShade[i] !== 2 && (() => { const [p0, p1, p2] = tris[i].v.map(k => V[k]); const n = cross(sub(p1, p0), sub(p2, p0)); return dot(n, L) / len(n) > 0.02; })())
            .sort((a, b) => area(F[b]) - area(F[a]));
        for (const i of order) {
            const f = F[i];
            let open = false;
            const N = 8;
            for (let a = 0; a <= N && !open; a++) for (let b = 0; a + b <= N && !open; b++) {
                const u = a / N, v = b / N, p = [f[0][0] + (f[1][0] - f[0][0]) * u + (f[2][0] - f[0][0]) * v, f[0][1] + (f[1][1] - f[0][1]) * u + (f[2][1] - f[0][1]) * v];
                if (!kept.some(j => tris[j].mesh === tris[i].mesh && inside(p, F[j]))) open = true;
            }
            if (open) { need[i] = 1; kept.push(i); }
        }
        return need;
    })();
    // A partly shaded triangle is cut into 8 x 8 cells along its two edges, and each cell is tried the
    // same way: 0 never shaded, 1 always, 2 partly. Only a ray in a "partly" cell goes through the tree.
    const subMap = [0], subAt = tris.map(() => 0);
    {
        const P = tris.map(t => t.v.map(i => [V[i][0] * WS, V[i][1] * WS, V[i][2] * WS]));
        const hit = (o, skip) => {
            for (let j = 0; j < P.length; j++) {
                if (j === skip) continue;
                const [p0, p1, p2] = P[j], e1 = sub(p1, p0), e2 = sub(p2, p0), pv = cross(L, e2), det = dot(e1, pv);
                if (Math.abs(det) < 1e-9) continue;
                const tv = sub(o, p0), u = dot(tv, pv) / det;
                if (u < 0 || u > 1) continue;
                const qv = cross(tv, e1), v = dot(L, qv) / det;
                if (v < 0 || u + v > 1) continue;
                if (dot(e2, qv) / det > 6) return true;
            }
            return false;
        };
        tris.forEach((t, i) => {
            if (selfShade[i] !== 1) return;
            subAt[i] = subMap.length;
            const [p0, p1, p2] = P[i];
            for (let a = 0; a < 8; a++) for (let b = 0; b < 8; b++) {
                let lit = 0, shd = 0;
                for (const fa of [0.06, 0.35, 0.65, 0.94]) for (const fb of [0.06, 0.35, 0.65, 0.94]) {
                    const u = (a + fa) / 8, v = (b + fb) / 8;
                    if (u + v > 1.02) continue;
                    const o = [p0[0] + (p1[0] - p0[0]) * u + (p2[0] - p0[0]) * v, p0[1] + (p1[1] - p0[1]) * u + (p2[1] - p0[1]) * v, p0[2] + (p1[2] - p0[2]) * u + (p2[2] - p0[2]) * v];
                    if (hit(o, i)) shd++; else lit++;
                }
                subMap.push(shd === 0 ? 0 : lit === 0 ? 1 : 2);
            }
        });
    }
    const R = (x) => Math.round(x);
    const lists = { MVX: [], MVY: [], MVZ: [], MSX: [], MSZ: [], TV1: [], TV2: [], TV3: [],
        TWX: [], TWY: [], TWZ: [], TWD: [], T1X: [], T1Y: [], T1Z: [], T1D: [], T2X: [], T2Y: [], T2Z: [], T2D: [],
        TLIT: [], TCL: [], TCS: [], TLR: [], TLG: [], TLB: [], TSR: [], TSG: [], TSB: [], TKR: [], TMESH: [], TSELF: [], TSO: subAt, TSUB: subMap, TSHP: shadowNeeded, MVM: [],
        BFIRST: [], BCNT: [], BRIGHT: [], BSKIP: [], MBCX: [], MBCY: [], MBCZ: [], MBCR: [] };
    const AMB = 74, DIFK = 182;
    const q = (v) => Math.min(15, Math.floor((v + 8) / 16));
    const vi = V.map(p => [R(p[0] * WS), R(p[1] * WS), R(p[2] * WS)]);
    for (const p of V) lists.MVM.push(p.mesh + 1);
    for (const p of vi) {
        lists.MVX.push(p[0]); lists.MVY.push(p[1]); lists.MVZ.push(p[2]);
        // where the vertex's shadow falls on the floor
        lists.MSX.push(R(p[0] - L[0] * p[1] / L[1])); lists.MSZ.push(R(p[2] - L[2] * p[1] / L[1]));
    }
    for (let ti = 0; ti < tris.length; ti++) {
        const t = tris[ti];
        const [a, b, c] = t.v.map(i => vi[i]);
        const e1 = sub(b, a), e2 = sub(c, a);
        const n = cross(e1, e2), nl = len(n), nu = [n[0] / nl, n[1] / nl, n[2] / nl];
        lists.TV1.push(t.v[0] + 1); lists.TV2.push(t.v[1] + 1); lists.TV3.push(t.v[2] + 1);
        // the plane: (unit normal x1024) . p = TWD
        const N = nu.map(x => R(x * 1024));
        lists.TWX.push(N[0]); lists.TWY.push(N[1]); lists.TWZ.push(N[2]); lists.TWD.push(dot(N, a));
        // barycentric planes: m . p + d is 0 on the far edge and 2^22 at the vertex (b, then c)
        const m1 = cross(nu, e2), k1 = dot(e1, m1), m2 = cross(e1, nu), k2 = dot(e2, m2);
        const M1 = m1.map(x => R(x / k1 * 4194304)), M2 = m2.map(x => R(x / k2 * 4194304));
        lists.T1X.push(M1[0]); lists.T1Y.push(M1[1]); lists.T1Z.push(M1[2]); lists.T1D.push(-dot(M1, a));
        lists.T2X.push(M2[0]); lists.T2Y.push(M2[1]); lists.T2Z.push(M2[2]); lists.T2D.push(-dot(M2, a));
        // its colour in the sun and out of it (flat shaded), and how much of a mirror it is
        const d = dot(nu, L);
        const li = AMB + (d > 0 ? Math.floor(d * DIFK) : 0);
        const lit = t.col.map(v => Math.floor(v * li / 256)), shd = t.col.map(v => Math.floor(v * AMB / 256));
        lists.TLIT.push(d > 0.02 && selfShade[ti] !== 2 ? 1 : 0);
        lists.TSELF.push(selfShade[ti] === 1 ? 1 : 0);
        lists.TCL.push(q(lit[0]) * 256 + q(lit[1]) * 16 + q(lit[2]) + 1);
        lists.TCS.push(q(shd[0]) * 256 + q(shd[1]) * 16 + q(shd[2]) + 1);
        lists.TLR.push(lit[0]); lists.TLG.push(lit[1]); lists.TLB.push(lit[2]);
        lists.TSR.push(shd[0]); lists.TSG.push(shd[1]); lists.TSB.push(shd[2]);
        lists.TKR.push(t.kr); lists.TMESH.push(t.mesh + 1);
    }
    // SGR: the floor in quarter tiles (128 x 128 round the middle): 0 no standing mesh shades it, 1 all of
    // it is shaded, 2 part of it (a shadow ray then). Tried with 16 rays a tile.
    {
        const still = tris.map((t, i) => i).filter(i => !moving.includes(tris[i].mesh));
        const P = tris.map(t => t.v.map(i => [V[i][0] * WS, V[i][1] * WS, V[i][2] * WS]));
        const G = 128, C = 256, OFF = 16384;
        const cells = Array.from({ length: G * G }, () => []);
        for (const i of still) {
            // where its shadow can fall
            const sx = P[i].map(p => p[0] - L[0] * p[1] / L[1]), sz = P[i].map(p => p[2] - L[2] * p[1] / L[1]);
            const x0 = Math.max(0, Math.floor((Math.min(...sx) + OFF) / C)), x1 = Math.min(G - 1, Math.floor((Math.max(...sx) + OFF) / C));
            const z0 = Math.max(0, Math.floor((Math.min(...sz) + OFF) / C)), z1 = Math.min(G - 1, Math.floor((Math.max(...sz) + OFF) / C));
            for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) cells[x * G + z].push(i);
        }
        const blocked = (o, list) => {
            for (const j of list) {
                const [p0, p1, p2] = P[j], e1 = sub(p1, p0), e2 = sub(p2, p0);
                if (dot(cross(e1, e2), L) >= 0) continue;                 // (as the tree does it: the ray goes in through a face)
                const pv = cross(L, e2), det = dot(e1, pv);
                if (Math.abs(det) < 1e-9) continue;
                const tv = sub(o, p0), u = dot(tv, pv) / det;
                if (u < 0 || u > 1) continue;
                const qv = cross(tv, e1), v = dot(L, qv) / det;
                if (v < 0 || u + v > 1) continue;
                if (dot(e2, qv) / det > 6) return true;
            }
            return false;
        };
        lists.SGR = cells.map((list, k) => {
            if (!list.length) return 0;
            const x = Math.floor(k / G), z = k % G;
            let hit = 0;
            const N = 4;
            for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) if (blocked([(x + a / (N - 1)) * C - OFF, 0, (z + b / (N - 1)) * C - OFF], list)) hit++;
            return hit === 0 ? 0 : hit === N * N ? 1 : 2;
        });
        lists.MMOV = Array.from({ length: meshes }, (_, m) => (moving.includes(m) ? 1 : 0));
    }
    for (const n of nodes) { lists.BFIRST.push(n.first); lists.BCNT.push(n.cnt); lists.BRIGHT.push(n.right); lists.BSKIP.push(n.skip); }
    // a sphere round each mesh
    for (let m = 0; m < meshes; m++) {
        const used = new Set(); for (const t of T) if (t.mesh === m) for (const v of t.v) used.add(v);
        const pts = [...used].map(i => vi[i]);
        const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
        for (const p of pts) for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], p[a]); hi[a] = Math.max(hi[a], p[a]); }
        const c = [R((lo[0] + hi[0]) / 2), R((lo[1] + hi[1]) / 2), R((lo[2] + hi[2]) / 2)];
        lists.MBCX.push(c[0]); lists.MBCY.push(c[1]); lists.MBCZ.push(c[2]);
        lists.MBCR.push(Math.ceil(Math.max(...pts.map(p => len(sub(p, c))))) + 2);
    }
    const consts = { NV: vi.length, NT: tris.length, BN: nodes.length, NM: meshes };
    return { consts, lists, tris, verts: vi, nodes };
}

// the lists and constants as EJS source
export function meshSource(sun) {
    const { consts, lists } = meshData(sun);
    return Object.entries(consts).map(([k, v]) => `const ${k} = ${v};`).join('\n') + '\n' +
        Object.entries(lists).map(([k, v]) => `let ${k} = [${v.join(', ')}];`).join('\n') + '\n';
}
