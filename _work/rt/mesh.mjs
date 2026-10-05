// Build-time side of the triangle structure: the mesh, its BVH, and everything
// about it that never changes (the mesh and the sun stand still), written out
// as EJS list literals.
//
// The structure is a stepped pyramid: three tiers and a pointed cap, 34 triangles.
// It is not convex - a tier shades the one below - so a point on it needs a
// shadow ray against the mesh itself, and that is what the BVH is for (as for
// every mirror ray that may reach the structure).
const WS = 1024;

// ---- the mesh (world units; y up) ----
export function makeMesh() {
    const V = [], T = [];
    const cx = 5.3, cz = 4.5, rot = 28 * Math.PI / 180;
    const P = (x, y, z) => { const c = Math.cos(rot), s = Math.sin(rot); V.push([cx + x * c + z * s, y, cz - x * s + z * c]); return V.length - 1; };
    const tri = (a, b, c, col) => T.push({ v: [a, b, c], col });
    const quad = (a, b, c, d, col) => { tri(a, b, c, col); tri(a, c, d, col); };
    // a tier: a box from y0 to y1, half-width h; sides and top (counter-clockwise seen from outside)
    const tier = (h, y0, y1, side, top) => {
        const b = [P(-h, y0, -h), P(h, y0, -h), P(h, y0, h), P(-h, y0, h)];
        const t = [P(-h, y1, -h), P(h, y1, -h), P(h, y1, h), P(-h, y1, h)];
        for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; quad(b[j], b[i], t[i], t[j], side); }
        quad(t[0], t[3], t[2], t[1], top);
        return t;
    };
    tier(1.5, 0, 0.55, [206, 160, 104], [226, 188, 132]);
    tier(1.0, 0.55, 1.1, [198, 150, 96], [222, 182, 126]);
    tier(0.55, 1.1, 1.65, [190, 142, 90], [218, 176, 120]);
    // the cap
    const h = 0.38, y0 = 1.65, y1 = 2.35;
    const b = [P(-h, y0, -h), P(h, y0, -h), P(h, y0, h), P(-h, y0, h)], apex = P(0, y1, 0);
    for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; tri(b[j], b[i], apex, [226, 96, 60]); }
    return { V, T };
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a) => Math.sqrt(dot(a, a));

// ---- BVH: median split on the longest axis, at most 2 triangles a leaf, nodes in depth-first order ----
// Node i: its first child is i + 1, its second BRIGHT[i]; BSKIP[i] is where to go on when the node is
// missed or done (0 = out of the tree). A leaf has BCNT[i] > 0 triangles from BFIRST[i] on.
function buildBVH(tris, verts) {
    const order = [], nodes = [];
    const bounds = (ids) => { const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9]; for (const i of ids) for (const v of tris[i].v) for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], verts[v][a]); hi[a] = Math.max(hi[a], verts[v][a]); } return [lo, hi]; };
    const cen = (i) => { const [lo, hi] = bounds([i]); return [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2]; };
    const rec = (ids) => {
        const me = nodes.length;
        const node = { first: 0, cnt: 0, right: 0, skip: 0 };
        nodes.push(node);
        if (ids.length <= 2) { node.first = order.length + 1; node.cnt = ids.length; order.push(...ids); return me; }
        const [lo, hi] = bounds(ids);
        const ext = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]];
        const ax = ext.indexOf(Math.max(...ext));
        const sorted = [...ids].sort((p, q) => cen(p)[ax] - cen(q)[ax]);
        const mid = sorted.length >> 1;
        rec(sorted.slice(0, mid));
        node.right = rec(sorted.slice(mid)) + 1;        // 1-based
        return me;
    };
    rec(tris.map((_, i) => i));
    // skip links: after a subtree comes its parent's second child, or what follows the parent
    const link = (i, next) => { const n = nodes[i]; n.skip = next; if (n.cnt === 0) { link(i + 1, n.right); link(n.right - 1, next); } };
    link(0, 0);
    return { order, nodes };
}

// ---- everything static, as lists ----
// sun: the direction towards it (x1024), as the scene has it
export function meshData(sun) {
    const { V, T } = makeMesh();
    const L = [sun[0] / 1024, sun[1] / 1024, sun[2] / 1024];
    const { order, nodes } = buildBVH(T, V);
    const tris = order.map(i => T[i]);                  // triangles in leaf order
    const R = (x) => Math.round(x);
    const lists = { MVX: [], MVY: [], MVZ: [], MSX: [], MSZ: [], TV1: [], TV2: [], TV3: [],
        TWX: [], TWY: [], TWZ: [], TWD: [], T1X: [], T1Y: [], T1Z: [], T1D: [], T2X: [], T2Y: [], T2Z: [], T2D: [],
        TLIT: [], TCL: [], TCS: [], TLR: [], TLG: [], TLB: [], TSR: [], TSG: [], TSB: [],
        BFIRST: [], BCNT: [], BRIGHT: [], BSKIP: [] };
    const AMB = 74, DIFK = 182;
    const q = (v) => Math.min(15, Math.floor((v + 8) / 16));
    const vi = V.map(p => [R(p[0] * WS), R(p[1] * WS), R(p[2] * WS)]);
    for (const p of vi) {
        lists.MVX.push(p[0]); lists.MVY.push(p[1]); lists.MVZ.push(p[2]);
        // where the vertex's shadow falls on the floor
        lists.MSX.push(R(p[0] - L[0] * p[1] / L[1])); lists.MSZ.push(R(p[2] - L[2] * p[1] / L[1]));
    }
    for (const t of tris) {
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
        // its colour in the sun and out of it (the mesh is flat shaded and does not mirror)
        const d = dot(nu, L);
        const li = AMB + (d > 0 ? Math.floor(d * DIFK) : 0);
        const lit = t.col.map(v => Math.floor(v * li / 256)), shd = t.col.map(v => Math.floor(v * AMB / 256));
        lists.TLIT.push(d > 0.02 ? 1 : 0);
        lists.TCL.push(q(lit[0]) * 256 + q(lit[1]) * 16 + q(lit[2]) + 1);
        lists.TCS.push(q(shd[0]) * 256 + q(shd[1]) * 16 + q(shd[2]) + 1);
        lists.TLR.push(lit[0]); lists.TLG.push(lit[1]); lists.TLB.push(lit[2]);
        lists.TSR.push(shd[0]); lists.TSG.push(shd[1]); lists.TSB.push(shd[2]);
    }
    for (const n of nodes) { lists.BFIRST.push(n.first); lists.BCNT.push(n.cnt); lists.BRIGHT.push(n.right); lists.BSKIP.push(n.skip); }
    // a sphere round the whole structure
    const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
    for (const p of vi) for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], p[a]); hi[a] = Math.max(hi[a], p[a]); }
    const c = [R((lo[0] + hi[0]) / 2), R((lo[1] + hi[1]) / 2), R((lo[2] + hi[2]) / 2)];
    const r = Math.ceil(Math.max(...vi.map(p => len(sub(p, c))))) + 2;
    const consts = { NV: vi.length, NT: tris.length, BN: nodes.length, MBX: c[0], MBY: c[1], MBZ: c[2], MBR: r };
    return { consts, lists, tris, verts: vi, nodes };
}

// the lists and constants as EJS source
export function meshSource(sun) {
    const { consts, lists } = meshData(sun);
    return Object.entries(consts).map(([k, v]) => `const ${k} = ${v};`).join('\n') + '\n' +
        Object.entries(lists).map(([k, v]) => `let ${k} = [${v.join(', ')}];`).join('\n') + '\n';
}
