// Geometry for the battle royale: a small modelling kit (faces, boxes, walls with
// openings, slabs with holes, stairs, roofs, cylinders), and the BSP compiler that
// turns a prefab's faces into a back-to-front drawing order for any eye position.
//
// Units: cm, y up. A face is a convex planar polygon given counter-clockwise as seen
// from its front (the side its normal points to). Prefabs sit with their footprint
// centred on (0, 0) and their ground floor at y = 0.

export const EPS = 0.5;

// ---------------------------------------------------------------- materials
// name -> [r, g, b]. The build turns each into 8 shades x 8 fog levels.
export const MATERIALS = {};
export const MAT_ORDER = [];
export function mat(name, rgb) {
    if (!(name in MATERIALS)) MAT_ORDER.push(name);
    MATERIALS[name] = rgb;
    return name;
}
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
for (const [n, h] of Object.entries({
    // ground
    grass: '#5f7d3c', grassDry: '#7f8a4a', dirt: '#7c6a4a', sand: '#cbbb8c', rockG: '#7b7872', snowRock: '#a9a8a2',
    asphalt: '#47484b', roadLine: '#d6cfa2', dirtRoad: '#8a7656', concrete: '#9b9991', concreteDark: '#6f6d67', water: '#3f6d88', deepWater: '#2f5873',
    // building outsides
    plasterW: '#e2dccd', plasterY: '#d9c58a', plasterB: '#9db3c2', plasterG: '#a7b894', plasterP: '#c9a99a', brick: '#8f4b3a', brickDark: '#6e3a2e',
    paintGrey: '#a3a6a8', woodPlank: '#8a6844', woodDark: '#5b412b', barnRed: '#8c3226', militaryG: '#5e6a49', armyTan: '#a6976f',
    metalSheet: '#8b9298', metalDark: '#4b5056', metalRust: '#8a5a3a', containerR: '#9b3b2d', containerB: '#2f5e88', containerG: '#3f6d45', containerO: '#c26c2b', containerY: '#c9a234',
    roofRed: '#8d3c2f', roofGrey: '#5e636a', roofBrown: '#6c4b37', roofGreen: '#4f6450', roofTar: '#3e3f41',
    trim: '#ecebe6', glass: '#2d4050', glassLit: '#45606f', doorWood: '#5e3e27', frame: '#d8d6cf',
    // building insides
    plasterIn: '#cfc8b8', plasterIn2: '#bfc6c4', floorWood: '#8b6b49', floorTile: '#b5b1a6', floorConc: '#86847d', ceiling: '#dedad0', stair: '#857565',
    // props
    sandbag: '#a8956b', crateWood: '#9a7446', crateGreen: '#4f6040', barrelRed: '#9a3424', barrelBlue: '#2e5476', tyre: '#2b2b2c', carBody1: '#7c2c2a', carBody2: '#3c5770', carBody3: '#b9b4a8', carGlass: '#33424d',
    fenceWood: '#8b7354', fenceMetal: '#7f868c', hay: '#c8a85a', sofa: '#3b4a5e', sheet: '#8a8478',
    // nature
    bark: '#5b4632', pine: '#2f4e32', pine2: '#3a5b38', leaf: '#476f35', leaf2: '#5a7f3d', bush: '#4c6d39', rock: '#7e7a72', rock2: '#6a675f',
    // people
    skin1: '#e0b998', skin2: '#c49272', skin3: '#8d5e43', hair: '#2b2420',
    cloth1: '#4b5b3a', cloth2: '#3b4a5e', cloth3: '#6b5a44', cloth4: '#7a3b34', cloth5: '#2e2f33', cloth6: '#8a8478', cloth7: '#506e7a', cloth8: '#6f6340',
    boots: '#2a2622', helm1: '#7a7f6a', helm2: '#4f5a44', helm3: '#2f3530', vest1: '#8a8064', vest2: '#56614a', vest3: '#30362f', pack: '#5d5640',
    // guns
    gunBlack: '#26282a', gunSteel: '#45484c', gunWood: '#7b4e2d', gunTan: '#ad9a73', gunPoly: '#363733', gunOD: '#4e5640', lens: '#1c3a4a', brass: '#b8923c',
    // effects / ui
    flash: '#ffd27a', smoke: '#9a9c9a', blood: '#9a1e1e', loot: '#d8b04a',
})) mat(n, hex(h));

// ---------------------------------------------------------------- vector helpers
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

export function faceNormal(v) {
    // Newell's method: robust for any planar polygon
    let n = [0, 0, 0];
    for (let i = 0; i < v.length; i++) {
        const a = v[i], b = v[(i + 1) % v.length];
        n[0] += (a[1] - b[1]) * (a[2] + b[2]);
        n[1] += (a[2] - b[2]) * (a[0] + b[0]);
        n[2] += (a[0] - b[0]) * (a[1] + b[1]);
    }
    return norm(n);
}

// ---------------------------------------------------------------- the modelling kit
// A Model collects faces (for drawing), colliders (AABBs for walking and bullets),
// and points the game needs: loot spots, navigation points, cover spots.
export class Model {
    // unit: model units a cm (10 for guns and small things: mm)
    constructor(name, unit = 1) {
        this.name = name; this.unit = unit; this.faces = []; this.boxes = []; this.loot = []; this.nav = []; this.navEdges = []; this.cover = [];
        this.noShadowBox = false;
    }
    face(v, m) {
        if (v.length < 3) return;
        const u = this.unit;
        const r = v.map(p => p.map(c => Math.round(c * u)));
        const n = faceNormal(r);
        if (!(len(n) > 0.5)) return;
        this.faces.push({ v: r, m });
    }
    quad(a, b, c, d, m) { this.face([a, b, c, d], m); }
    // an axis-aligned box. mats: one material, or { top, bottom, side, n, s, e, w }; skip: set of sides
    box(x0, y0, z0, x1, y1, z1, mats, { skip = '', collide = true } = {}) {
        const M = typeof mats === 'string' ? { all: mats } : mats;
        const pick = (k) => M[k] || M.side || M.all || M.top;
        const has = (k) => !skip.includes(k);
        if (has('top')) this.quad([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], pick('top'));
        if (has('bottom')) this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], pick('bottom'));
        if (has('s')) this.quad([x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0], pick('s'));   // -z
        if (has('n')) this.quad([x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [x0, y0, z1], pick('n'));   // +z
        if (has('w')) this.quad([x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [x0, y0, z0], pick('w'));   // -x
        if (has('e')) this.quad([x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], pick('e'));   // +x
        if (collide) this.collider(x0, y0, z0, x1, y1, z1);
    }
    collider(x0, y0, z0, x1, y1, z1) {
        this.boxes.push([Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1), Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1)].map(Math.round));
    }
    // a wall: a slab of thickness t. axis 'x': runs along x at z = c (from a to b);
    // axis 'z': runs along z at x = c. y from y0 to y1. out: +1/-1, the side that is
    // outside (gets matOut; the other side matIn). holes: [{a, b, y0, y1}] along the wall.
    // caps: whether to close the two ends.
    wall(axis, c, a, b, y0, y1, t, matOut, matIn, holes = [], { out = 1, caps = true, top = true, jamb = null } = {}) {
        if (a > b) [a, b] = [b, a];
        const us = new Set([a, b]), vs = new Set([y0, y1]);
        for (const h of holes) { us.add(Math.max(a, Math.min(b, h.a))); us.add(Math.max(a, Math.min(b, h.b))); vs.add(Math.max(y0, Math.min(y1, h.y0))); vs.add(Math.max(y0, Math.min(y1, h.y1))); }
        const U = [...us].sort((p, q) => p - q), V = [...vs].sort((p, q) => p - q);
        const nu = U.length - 1, nv = V.length - 1;
        const solid = [];
        for (let i = 0; i < nu; i++) { solid.push([]); for (let j = 0; j < nv; j++) {
            const um = (U[i] + U[i + 1]) / 2, vm = (V[j] + V[j + 1]) / 2;
            solid[i].push(!holes.some(h => um > h.a && um < h.b && vm > h.y0 && vm < h.y1));
        } }
        // merge the grid into rectangles: grow along u, then along v
        const used = solid.map(r => r.map(() => false));
        const rects = [];
        for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
            if (!solid[i][j] || used[i][j]) continue;
            let i2 = i; while (i2 + 1 < nu && solid[i2 + 1][j] && !used[i2 + 1][j]) i2++;
            let j2 = j; grow: while (j2 + 1 < nv) { for (let k = i; k <= i2; k++) if (!solid[k][j2 + 1] || used[k][j2 + 1]) break grow; j2++; }
            for (let k = i; k <= i2; k++) for (let l = j; l <= j2; l++) used[k][l] = true;
            rects.push([U[i], U[i2 + 1], V[j], V[j2 + 1]]);
        }
        const h = t / 2;
        // point on the wall: u along, v up, w across (w = +h is the +z / +x side)
        const P = axis === 'x' ? (u, v, w) => [u, v, c + w] : (u, v, w) => [c + w, v, u];
        const sideOut = out > 0 ? +h : -h, sideIn = -sideOut;
        for (const [u0, u1, v0, v1] of rects) {
            // the face on side w: counter-clockwise seen from that side
            for (const [w, m] of [[sideOut, matOut], [sideIn, matIn]]) {
                if (!m) continue;
                const want = axis === 'x' ? [0, 0, Math.sign(w)] : [Math.sign(w), 0, 0];
                this.face(orderFace([P(u0, v0, w), P(u1, v0, w), P(u1, v1, w), P(u0, v1, w)], want), m);
            }
            if (axis === 'x') this.collider(u0, v0, c - h, u1, v1, c + h); else this.collider(c - h, v0, u0, c + h, v1, u1);
        }
        // jambs: the reveals inside each hole, and caps
        const jm = jamb || matIn || matOut;
        const strip = (pa, pb, m) => this.quad(...pa, ...pb, m);
        for (const hl of holes) {
            const ha = Math.max(a, hl.a), hb = Math.min(b, hl.b), hy0 = Math.max(y0, hl.y0), hy1 = Math.min(y1, hl.y1);
            // top of the hole (lintel underside) faces down; sill faces up; sides face into the hole
            if (hy1 < y1) this.face(orderFace([P(ha, hy1, -h), P(hb, hy1, -h), P(hb, hy1, h), P(ha, hy1, h)], [0, -1, 0]), jm);
            if (hy0 > y0) this.face(orderFace([P(ha, hy0, -h), P(hb, hy0, -h), P(hb, hy0, h), P(ha, hy0, h)], [0, 1, 0]), jm);
            const ua = axis === 'x' ? [1, 0, 0] : [0, 0, 1];
            if (ha > a) this.face(orderFace([P(ha, hy0, -h), P(ha, hy1, -h), P(ha, hy1, h), P(ha, hy0, h)], ua), jm);
            if (hb < b) this.face(orderFace([P(hb, hy0, -h), P(hb, hy1, -h), P(hb, hy1, h), P(hb, hy0, h)], ua.map(x => -x)), jm);
        }
        if (caps) {
            const ua = axis === 'x' ? [1, 0, 0] : [0, 0, 1];
            this.face(orderFace([P(a, y0, -h), P(a, y1, -h), P(a, y1, h), P(a, y0, h)], ua.map(x => -x)), matOut);
            this.face(orderFace([P(b, y0, -h), P(b, y1, -h), P(b, y1, h), P(b, y0, h)], ua), matOut);
        }
        if (top) {
            // the top of the wall, in pieces between the holes that reach the top
            const tops = rects.filter(r => r[3] === y1).map(r => [r[0], r[1]]).sort((p, q) => p[0] - q[0]);
            for (const [u0, u1] of tops) this.face(orderFace([P(u0, y1, -h), P(u1, y1, -h), P(u1, y1, h), P(u0, y1, h)], [0, 1, 0]), matOut);
        }
        return this;
    }
    // a horizontal slab from y0 to y1 over [x0,x1] x [z0,z1], with rectangular holes
    slab(x0, z0, x1, z1, y0, y1, matTop, matBottom, holes = [], { edges = 'concrete', collide = true } = {}) {
        const xs = new Set([x0, x1]), zs = new Set([z0, z1]);
        for (const h of holes) { xs.add(h.x0); xs.add(h.x1); zs.add(h.z0); zs.add(h.z1); }
        const X = [...xs].sort((p, q) => p - q), Z = [...zs].sort((p, q) => p - q);
        const nx = X.length - 1, nz = Z.length - 1;
        const solid = []; for (let i = 0; i < nx; i++) { solid.push([]); for (let j = 0; j < nz; j++) { const xm = (X[i] + X[i + 1]) / 2, zm = (Z[j] + Z[j + 1]) / 2; solid[i].push(!holes.some(h => xm > h.x0 && xm < h.x1 && zm > h.z0 && zm < h.z1)); } }
        const used = solid.map(r => r.map(() => false));
        for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
            if (!solid[i][j] || used[i][j]) continue;
            let i2 = i; while (i2 + 1 < nx && solid[i2 + 1][j] && !used[i2 + 1][j]) i2++;
            let j2 = j; grow: while (j2 + 1 < nz) { for (let k = i; k <= i2; k++) if (!solid[k][j2 + 1] || used[k][j2 + 1]) break grow; j2++; }
            for (let k = i; k <= i2; k++) for (let l = j; l <= j2; l++) used[k][l] = true;
            const a0 = X[i], a1 = X[i2 + 1], b0 = Z[j], b1 = Z[j2 + 1];
            if (matTop) this.quad([a0, y1, b0], [a0, y1, b1], [a1, y1, b1], [a1, y1, b0], matTop);
            if (matBottom) this.quad([a0, y0, b0], [a1, y0, b0], [a1, y0, b1], [a0, y0, b1], matBottom);
            if (collide) this.collider(a0, y0, b0, a1, y1, b1);
        }
        // hole rims (facing into the hole)
        if (edges) for (const h of holes) {
            this.face(orderFace([[h.x0, y0, h.z0], [h.x0, y1, h.z0], [h.x0, y1, h.z1], [h.x0, y0, h.z1]], [1, 0, 0]), edges);
            this.face(orderFace([[h.x1, y0, h.z0], [h.x1, y1, h.z0], [h.x1, y1, h.z1], [h.x1, y0, h.z1]], [-1, 0, 0]), edges);
            this.face(orderFace([[h.x0, y0, h.z0], [h.x1, y0, h.z0], [h.x1, y1, h.z0], [h.x0, y1, h.z0]], [0, 0, 1]), edges);
            this.face(orderFace([[h.x0, y0, h.z1], [h.x1, y0, h.z1], [h.x1, y1, h.z1], [h.x0, y1, h.z1]], [0, 0, -1]), edges);
        }
        return this;
    }
    // straight stairs: from (x0..x1, z0..z1) rising from y0 to y1, climbing toward dir
    // ('+z', '-z', '+x', '-x'), n steps. Colliders: one box per step.
    // thin: 0 = solid under the flight (sides, a back face); > 0 = a slab of that thickness
    // with an underside, so a flight stacked above another leaves head room and is not
    // seen through from below or behind.
    stairs(x0, z0, x1, z1, y0, y1, dir, n, m, mSide = null, { thin = 0 } = {}) {
        const rise = (y1 - y0) / n;
        const alongZ = dir === '+z' || dir === '-z', sd = dir[0] === '+' ? 1 : -1;
        // s: along the climb (bottom s0 to top s1), c: across (c0..c1)
        const s0 = alongZ ? (sd > 0 ? z0 : z1) : (sd > 0 ? x0 : x1), s1 = alongZ ? (sd > 0 ? z1 : z0) : (sd > 0 ? x1 : x0);
        const c0 = alongZ ? x0 : z0, c1 = alongZ ? x1 : z1;
        const P = (s, y, c) => alongZ ? [c, y, s] : [s, y, c];
        const run = alongZ ? [0, 0, sd] : [sd, 0, 0], across = alongZ ? [1, 0, 0] : [0, 0, 1];
        const under = (t) => y0 + (y1 - thin - y0) * t;      // the underside of a thin flight
        for (let i = 0; i < n; i++) {
            const t0 = i / n, t1 = (i + 1) / n, ty = y0 + rise * (i + 1);
            const sa = s0 + (s1 - s0) * t0, sb = s0 + (s1 - s0) * t1;
            // tread
            this.face(orderFace([P(sa, ty, c0), P(sb, ty, c0), P(sb, ty, c1), P(sa, ty, c1)], [0, 1, 0]), m);
            // riser (faces down the stairs)
            this.face(orderFace([P(sa, ty - rise, c0), P(sa, ty, c0), P(sa, ty, c1), P(sa, ty - rise, c1)], run.map(v => -v)), m);
            const [ax, , az] = P(sa, 0, c0), [bx, , bz] = P(sb, 0, c1);
            this.collider(ax, thin ? Math.min(under(t0), ty - rise) : y0, az, bx, ty, bz);
        }
        if (thin) {
            // underside, from the foot of the first riser to the top edge
            this.face(orderFace([P(s0, y0, c0), P(s0, y0, c1), P(s1, y1 - thin, c1), P(s1, y1 - thin, c0)], [-run[0], -1, -run[2]]), mSide || m);
        } else {
            // back face, under the top step
            this.face(orderFace([P(s1, y0, c0), P(s1, y0, c1), P(s1, y1, c1), P(s1, y1, c0)], run), mSide || m);
        }
        // the two sides: solid under the flight, or the stringer of a thin flight. Both reach
        // up to the front edges of the treads, so no notch between two steps is open.
        if (mSide) {
            for (const c of [c0, c1]) {
                const want = across.map(v => v * (c === c0 ? -1 : 1));
                const v = [P(s0, y0, c), P(s0, y0 + rise, c), P(s1, y1, c), P(s1, thin ? y1 - thin : y0, c)];
                this.face(orderFace(v, want), mSide);
            }
        }
        return this;
    }    // gable roof over [x0,x1]x[z0,z1] from height y (eaves) rising by h at the ridge.
    // ridge along 'x' or 'z'. over: overhang. gables: material of the triangular ends (null: none)
    gable(x0, z0, x1, z1, y, h, ridge, mRoof, mGable, over = 40, { under = null } = {}) {
        if (ridge === 'x') {
            const zc = (z0 + z1) / 2, X0 = x0 - over, X1 = x1 + over, Z0 = z0 - over, Z1 = z1 + over;
            const yo = y - h * over / ((z1 - z0) / 2);
            this.quad([X0, yo, Z0], [X0, y + h, zc], [X1, y + h, zc], [X1, yo, Z0], mRoof);   // south slope (faces -z, up)
            this.quad([X1, yo, Z1], [X1, y + h, zc], [X0, y + h, zc], [X0, yo, Z1], mRoof);   // north slope
            if (under) { this.quad([X1, yo, Z0], [X1, y + h, zc], [X0, y + h, zc], [X0, yo, Z0], under); this.quad([X0, yo, Z1], [X0, y + h, zc], [X1, y + h, zc], [X1, yo, Z1], under); }
            if (mGable) {
                this.face([[x0, y, z1], [x0, y + h, zc], [x0, y, z0]], mGable);   // west end faces -x
                this.face([[x1, y, z0], [x1, y + h, zc], [x1, y, z1]], mGable);   // east end faces +x
            }
        } else {
            const xc = (x0 + x1) / 2, X0 = x0 - over, X1 = x1 + over, Z0 = z0 - over, Z1 = z1 + over;
            const yo = y - h * over / ((x1 - x0) / 2);
            this.quad([X0, yo, Z1], [xc, y + h, Z1], [xc, y + h, Z0], [X0, yo, Z0], mRoof);   // west slope
            this.quad([X1, yo, Z0], [xc, y + h, Z0], [xc, y + h, Z1], [X1, yo, Z1], mRoof);   // east slope
            if (under) { this.quad([X0, yo, Z0], [xc, y + h, Z0], [xc, y + h, Z1], [X0, yo, Z1], under); this.quad([X1, yo, Z1], [xc, y + h, Z1], [xc, y + h, Z0], [X1, yo, Z0], under); }
            if (mGable) {
                this.face([[x0, y, z0], [xc, y + h, z0], [x1, y, z0]], mGable);   // south end faces -z
                this.face([[x1, y, z1], [xc, y + h, z1], [x0, y, z1]], mGable);   // north end faces +z
            }
        }
        return this;
    }
    // an upright prism (n sides) of radius r around (cx, cz) from y0 to y1 (r1: top radius, 0 = cone)
    prism(cx, cz, r, y0, y1, n, m, { r1 = r, top = true, bottom = false, mTop = null, phase = 0, collide = false } = {}) {
        const P = (i, rr, y) => { const a = (i / n) * Math.PI * 2 + phase; return [cx + Math.cos(a) * rr, y, cz + Math.sin(a) * rr]; };
        for (let i = 0; i < n; i++) {
            const am = ((i + 0.5) / n) * Math.PI * 2 + phase, out = [Math.cos(am), 0, Math.sin(am)];
            if (r1 > 0) this.face(orderFace([P(i, r, y0), P(i + 1, r, y0), P(i + 1, r1, y1), P(i, r1, y1)], out), m);
            else this.face(orderFace([P(i, r, y0), P(i + 1, r, y0), [cx, y1, cz]], out), m);
        }
        if (top && r1 > 0) { const v = []; for (let i = 0; i < n; i++) v.push(P(i, r1, y1)); this.face(orderFace(v, [0, 1, 0]), mTop || m); }
        if (bottom) { const v = []; for (let i = 0; i < n; i++) v.push(P(i, r, y0)); this.face(orderFace(v, [0, -1, 0]), m); }
        if (collide) { const rr = Math.max(r, r1) * 0.8; this.collider(cx - rr, y0, cz - rr, cx + rr, y1, cz + rr); }
        return this;
    }
    // a horizontal prism along x (n sides) - pipes, barrels lying, gun barrels
    prismX(cy, cz, r, x0, x1, n, m, { caps = true, phase = 0 } = {}) {
        const P = (i, x) => { const a = (i / n) * Math.PI * 2 + phase; return [x, cy + Math.sin(a) * r, cz + Math.cos(a) * r]; };
        for (let i = 0; i < n; i++) this.face(orderFace([P(i, x0), P(i + 1, x0), P(i + 1, x1), P(i, x1)], (() => { const a = ((i + 0.5) / n) * Math.PI * 2 + phase; return [0, Math.sin(a), Math.cos(a)]; })()), m);
        if (caps) { const a = [], b = []; for (let i = 0; i < n; i++) { a.push(P(i, x0)); b.push(P(i, x1)); } this.face(orderFace(a, [-1, 0, 0]), m); this.face(orderFace(b, [1, 0, 0]), m); }
        return this;
    }
    prismZ(cx, cy, r, z0, z1, n, m, { caps = true, phase = 0, mCap = null } = {}) {
        const P = (i, z) => { const a = (i / n) * Math.PI * 2 + phase; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r, z]; };
        for (let i = 0; i < n; i++) this.face(orderFace([P(i, z0), P(i + 1, z0), P(i + 1, z1), P(i, z1)], (() => { const a = ((i + 0.5) / n) * Math.PI * 2 + phase; return [Math.cos(a), Math.sin(a), 0]; })()), m);
        if (caps) { const a = [], b = []; for (let i = 0; i < n; i++) { a.push(P(i, z0)); b.push(P(i, z1)); } this.face(orderFace(a, [0, 0, -1]), mCap || m); this.face(orderFace(b, [0, 0, 1]), mCap || m); }
        return this;
    }
    // a box turned by ax degrees about x (nose up) and then ay about y, centred at (cx, cy, cz)
    obox(cx, cy, cz, hx, hy, hz, ax, m, { ay = 0, skip = '' } = {}) {
        const ca = Math.cos(ax * Math.PI / 180), sa = Math.sin(ax * Math.PI / 180), cb = Math.cos(ay * Math.PI / 180), sb = Math.sin(ay * Math.PI / 180);
        const T = ([x, y, z]) => { const y1 = y * ca + z * sa, z1 = -y * sa + z * ca; return [cx + x * cb + z1 * sb, cy + y1, cz - x * sb + z1 * cb]; };
        const N = ([x, y, z]) => { const y1 = y * ca + z * sa, z1 = -y * sa + z * ca; return [x * cb + z1 * sb, y1, -x * sb + z1 * cb]; };
        const C = (sx, sy, sz) => T([sx * hx, sy * hy, sz * hz]);
        const sides = [
            ['e', [1, 0, 0], [C(1, -1, -1), C(1, 1, -1), C(1, 1, 1), C(1, -1, 1)]],
            ['w', [-1, 0, 0], [C(-1, -1, -1), C(-1, 1, -1), C(-1, 1, 1), C(-1, -1, 1)]],
            ['top', [0, 1, 0], [C(-1, 1, -1), C(1, 1, -1), C(1, 1, 1), C(-1, 1, 1)]],
            ['bottom', [0, -1, 0], [C(-1, -1, -1), C(1, -1, -1), C(1, -1, 1), C(-1, -1, 1)]],
            ['n', [0, 0, 1], [C(-1, -1, 1), C(1, -1, 1), C(1, 1, 1), C(-1, 1, 1)]],
            ['s', [0, 0, -1], [C(-1, -1, -1), C(1, -1, -1), C(1, 1, -1), C(-1, 1, -1)]],
        ];
        for (const [k, n, v] of sides) if (!skip.includes(k)) this.face(orderFace(v, N(n)), m);
        return this;
    }
    lootAt(x, y, z, w = 1) { this.loot.push([Math.round(x), Math.round(y), Math.round(z), w]); return this; }
    // navigation point (kind: 0 room, 1 door outside, 2 door inside, 3 stair, 4 roof/high, 5 window spot); returns its index
    navAt(x, y, z, kind = 0) { this.nav.push([Math.round(x), Math.round(y), Math.round(z), kind]); return this.nav.length - 1; }
    link(a, b) { this.navEdges.push([a, b]); return this; }
    path(...ids) { for (let i = 0; i + 1 < ids.length; i++) this.link(ids[i], ids[i + 1]); return this; }
    // cover spot: position and the directions it protects from (bit i = 45 deg * i, 0 = +x, counter-clockwise toward +z)
    coverAt(x, y, z, bits) { this.cover.push([Math.round(x), Math.round(y), Math.round(z), bits]); return this; }
    // apply a transform to everything added after `from` (used for parts)
    mapFrom(fromFaces, fromBoxes, fn) {
        for (let i = fromFaces; i < this.faces.length; i++) this.faces[i].v = this.faces[i].v.map(p => fn(p).map(Math.round));
        for (let i = fromBoxes; i < this.boxes.length; i++) {
            const b = this.boxes[i], a = fn([b[0], b[1], b[2]]), c = fn([b[3], b[4], b[5]]);
            this.boxes[i] = [Math.min(a[0], c[0]), Math.min(a[1], c[1]), Math.min(a[2], c[2]), Math.max(a[0], c[0]), Math.max(a[1], c[1]), Math.max(a[2], c[2])].map(Math.round);
        }
    }
    bounds() {
        let lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
        for (const f of this.faces) for (const p of f.v) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], p[k]); hi[k] = Math.max(hi[k], p[k]); }
        return { lo, hi };
    }
}
// order a polygon's points so that its normal agrees with `want`
export function orderFace(v, want) { const n = faceNormal(v); return dot(n, want) < 0 ? v.slice().reverse() : v; }

// ---------------------------------------------------------------- BSP
// Node-stored BSP: every node splits space by the plane of some faces; the faces
// lying in that plane are kept at the node (with the side they face). Children are
// nodes or empty leaves (numbered from 1). Drawing back to front: at a node, if the
// eye is in front, draw the back child, then the faces that face front, then the
// front child (and the other way round when behind).
const planeOf = (f) => { const n = faceNormal(f.v); return { n, d: dot(n, f.v[0]) }; };
const side = (pl, p) => dot(pl.n, p) - pl.d;

function splitFace(f, pl) {
    const F = [], B = [];
    const v = f.v, ds = v.map(p => side(pl, p));
    for (let i = 0; i < v.length; i++) {
        const a = v[i], b = v[(i + 1) % v.length], da = ds[i], db = ds[(i + 1) % v.length];
        if (da >= -EPS) F.push(a);
        if (da <= EPS) B.push(a);
        if ((da > EPS && db < -EPS) || (da < -EPS && db > EPS)) {
            const t = da / (da - db);
            const p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
            F.push(p); B.push(p);
        }
    }
    const clean = (pts) => { const o = []; for (const p of pts) { const q = o[o.length - 1]; if (!q || len(sub(p, q)) > 0.4) o.push(p); } if (o.length > 1 && len(sub(o[0], o[o.length - 1])) <= 0.4) o.pop(); return o; };
    return [clean(F), clean(B)];
}
function classify(f, pl) {
    // (a face in the splitter's own plane is on it even if rounding bent it a little)
    const fp = f.pl || (f.pl = planeOf(f));
    if (Math.abs(dot(fp.n, pl.n)) > 0.9995 && Math.abs(fp.d * Math.sign(dot(fp.n, pl.n)) - pl.d) < 2) return 'on';
    let fr = 0, bk = 0;
    for (const p of f.v) { const s = side(pl, p); if (s > EPS) fr++; else if (s < -EPS) bk++; }
    if (fr && bk) return 'split';
    if (fr) return 'front';
    if (bk) return 'back';
    return 'on';
}
// area of a polygon (for dropping slivers)
function area(v) { let a = [0, 0, 0]; for (let i = 1; i + 1 < v.length; i++) a = add(a, cross(sub(v[i], v[0]), sub(v[i + 1], v[0]))); return len(a) / 2; }

export function buildBSP(faces) {
    let leafCount = 0;
    const nodes = [];
    const build = (fs) => {
        if (!fs.length) return -(++leafCount);
        // choose a splitter: few splits, balanced, axis-aligned preferred
        let best = null, bestScore = Infinity;
        const seen = new Set();
        const cands = fs.length > 120 ? fs.filter((_, i) => i % Math.ceil(fs.length / 120) === 0) : fs;
        for (const c of cands) {
            const pl = planeOf(c);
            const key = pl.n.map(x => x.toFixed(3)).join() + '|' + pl.d.toFixed(1);
            if (seen.has(key)) continue; seen.add(key);
            let fr = 0, bk = 0, sp = 0, on = 0;
            for (const f of fs) { const k = classify(f, pl); if (k === 'front') fr++; else if (k === 'back') bk++; else if (k === 'split') sp++; else on++; }
            const axis = Math.max(...pl.n.map(Math.abs)) > 0.999 ? 0 : 3;
            const score = sp * 8 + Math.abs(fr - bk) + axis - on * 0.5;
            if (score < bestScore) { bestScore = score; best = pl; }
        }
        const pl = best;
        const on = [], front = [], back = [];
        for (const f of fs) {
            const k = classify(f, pl);
            if (k === 'on') on.push({ m: f.m, v: f.v, s: dot(f.pl ? f.pl.n : faceNormal(f.v), pl.n) > 0 ? 1 : -1 });
            else if (k === 'front') front.push(f);
            else if (k === 'back') back.push(f);
            else { const [a, b] = splitFace(f, pl); if (a.length >= 3 && area(a) > 4) front.push({ m: f.m, v: a, pl: f.pl }); if (b.length >= 3 && area(b) > 4) back.push({ m: f.m, v: b, pl: f.pl }); }
        }
        const id = nodes.length;
        nodes.push(null);
        const fId = build(front), bId = build(back);
        nodes[id] = { n: pl.n, d: pl.d, front: fId, back: bId, faces: on };
        return id;
    };
    const root = build(faces);
    return { nodes, root, leaves: leafCount };
}
// the leaf a point is in (1-based leaf number)
export function leafOf(bsp, p) {
    let id = bsp.root;
    while (id >= 0) { const nd = bsp.nodes[id]; id = dot(nd.n, p) - nd.d >= 0 ? nd.front : nd.back; }
    return -id;
}
// split polygons with more than 4 points into quads and triangles (a fan)
export function toQuads(v) {
    if (v.length <= 4) return [v];
    const out = [];
    for (let i = 1; i + 1 < v.length; i += 2) out.push(i + 2 < v.length ? [v[0], v[i], v[i + 1], v[i + 2]] : [v[0], v[i], v[i + 1]]);
    return out;
}

// shade level 0..7 of a face with normal n (sun from the south-east, low: it is dawn)
export const SUN = norm([0.55, 0.62, -0.56]);
export function shadeOf(n) {
    const d = dot(n, SUN);
    const sky = 0.5 + 0.5 * n[1];
    const l = 0.5 + 0.32 * Math.max(0, d) + 0.18 * sky;     // 0.5 .. 1.0
    return Math.max(0, Math.min(7, Math.round((l - 0.5) / 0.5 * 7)));
}
