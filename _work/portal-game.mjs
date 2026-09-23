#!/usr/bin/env node
// Portal-style puzzle game on the v3 engine (transform-v3.mjs output).
//
//  - a hub ("체험 존") with every mechanic and hint zones, then 10 test
//    chambers, played in order (exit pad -> next chamber)
//  - mechanics: portals, cubes, buttons (also timed), doors, pits, jump pads,
//    energy fields
//  - portal-able white panels (one 3x3 tile each), dark metal elsewhere
//  - cubes (carry with F), floor buttons, doors, pits (falling = restart)
//  - each chamber is a closed room: the PVS is per room (a cell sees the
//    clusters of its own room), the room shell is drawn first with big
//    faces (a convex shell can never hide anything inside it)
//  - HUD text box (chamber / hint / messages) and a crosshair
//
// Usage: node portal-game.mjs <engine.ent> <out.ent>

import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import cp from 'node:child_process';
import sharp from 'sharp';

const [, , IN, OUT] = process.argv;
const workDir = path.join(path.dirname(IN), '.portal-tmp');
fs.rmSync(workDir, { recursive: true, force: true });
fs.mkdirSync(workDir, { recursive: true });
fs.writeFileSync(path.join(workDir, 'a.tar'), zlib.gunzipSync(fs.readFileSync(IN)));
cp.execSync(`tar -xf "${path.join(workDir, 'a.tar')}" -C "${workDir}"`);
const projectPath = path.join(workDir, 'temp', 'project.json');
const project = JSON.parse(fs.readFileSync(projectPath, 'utf8'));

const findVar = (type, name) => {
    const l = project.variables.find(v => v.variableType === type && v.name === name);
    if (!l) throw new Error(type + ' not found: ' + name);
    return l;
};
const setList = (name, values) => {
    const l = findVar('list', name);
    l.array = values.map((v, i) => ({ id: `${l.id}_${i}`, data: String(v) }));
};
const setVarValue = (name, value) => { findVar('variable', name).value = value; };
const PAGE = 5000;
const setPaged = (name, values) => {
    const pages = project.variables.filter(v => v.variableType === 'list' && new RegExp(`^${name}_\\d+$`).test(v.name))
        .sort((a, b) => Number(a.name.split('_').pop()) - Number(b.name.split('_').pop()));
    if (values.length > pages.length * PAGE) throw new Error(`${name}: ${values.length} items exceed ${pages.length} pages x ${PAGE}`);
    pages.forEach((l, i) => { l.array = values.slice(i * PAGE, (i + 1) * PAGE).map((v, j) => ({ id: `${l.id}_${j}`, data: String(v) })); });
};

// ============================================================
// geometry primitives
// ============================================================
const S = 3, H = 3, F = 3;           // tile size, height band, engine floor count
const verts = [], baseVerts = [], faces = [];
const addVertex = (p, base = p) => { verts.push(p); baseVerts.push(base); return verts.length; };
const shade = (rgb, k) => rgb.map(v => Math.max(0, Math.min(255, Math.round(v * k))));
const layerOfFloor = (f) => 2 * f - 1, layerOfSlab = (k) => 2 * k;
function layerOfPts(ps) {
    const ys = ps.map(p => p[1]), lo = Math.min(...ys), hi = Math.max(...ys);
    if (hi - lo < 1e-9) {
        const k = lo / H;
        if (Math.abs(k - Math.round(k)) < 1e-9 && Math.round(k) >= 1 && Math.round(k) < F) return layerOfSlab(Math.round(k));
    }
    const band = Math.max(0, Math.min(F - 1, Math.floor(lo / H + 1e-9)));
    if (band < F - 1 && hi > (band + 1) * H + 1e-9) throw new Error('face crosses a layer plane: ' + JSON.stringify(ps));
    return layerOfFloor(band + 1);
}
const lerp3 = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
let CUR_CH = 0;   // chamber the next faces belong to
// quad (corners in order), split into pieces of at most `maxEdge`; returns the face indices
function quadFaces(p0, p1, p2, p3, color, n, { maxEdge = 3, zb = 0 } = {}) {
    const nu = Math.max(1, Math.ceil(Math.hypot(...p1.map((v, i) => v - p0[i])) / maxEdge - 1e-9));
    const nv = Math.max(1, Math.ceil(Math.hypot(...p3.map((v, i) => v - p0[i])) / maxEdge - 1e-9));
    const idx = [], out = [];
    for (let i = 0; i <= nu; i++) {
        idx.push([]);
        for (let j = 0; j <= nv; j++) idx[i].push(addVertex(lerp3(lerp3(p0, p1, i / nu), lerp3(p3, p2, i / nu), j / nv)));
    }
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
        const pts = [idx[i][j], idx[i + 1][j], idx[i + 1][j + 1], idx[i][j + 1]];
        faces.push({ pts, color, n, zb, ch: CUR_CH, layer: layerOfPts(pts.map(v => verts[v - 1])) });
        out.push(faces.length - 1);
    }
    return out;
}
// colliders
const cols = [];
const vsub = (a, b) => a.map((v, i) => v - b[i]);
const vlen = (a) => Math.hypot(...a);
const vcross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
function addRect(p0, p1, p3, outward = null, { portal = 0, tiles = [] } = {}) {
    const eu = vsub(p1, p0), ew = vsub(p3, p0);
    const lu = vlen(eu), lw = vlen(ew);
    const u = eu.map(v => v / lu), w = ew.map(v => v / lw);
    let n = vcross(u, w); const ln = vlen(n); n = n.map(v => v / ln);
    if (outward && n[0] * outward[0] + n[1] * outward[1] + n[2] * outward[2] < 0) n = n.map(v => -v);
    cols.push({ c: p0.map((v, i) => v + eu[i] / 2 + ew[i] / 2), n, u, w, hu: lu / 2, hw: lw / 2, oneSided: outward ? 1 : 0, portal, tiles, on: 1,
        corners: [p0, p1, p3, p1.map((v, i) => v + ew[i])] });
    return cols.length;
}
// a rectangle face (render + collider). opts.portal marks a portal-able panel.
function panel(p0, p1, p2, p3, color, n, opts = {}) {
    const fs_ = quadFaces(p0, p1, p2, p3, color, n, opts);
    return addRect(p0, p1, p3, n, { portal: opts.portal ? 1 : 0, tiles: fs_ });
}
// solid axis-aligned box (one-sided outward faces, split at the layer planes)
function box(x0, x1, y0, y1, z0, z1, color, { top = true } = {}) {
    if (top) panel([x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], color, [0, 1, 0]);
    if (y0 > 0.01) panel([x0, y0, z0], [x0, y0, z1], [x1, y0, z1], [x1, y0, z0], shade(color, 0.6), [0, -1, 0]);
    const cuts = [y0];
    for (let k = Math.floor(y0 / H) + 1; k * H < y1 - 1e-9; k++) cuts.push(k * H);
    cuts.push(y1);
    for (const [[ax, az], [bx, bz], k, nrm] of [[[x0, z0], [x1, z0], 0.92, [0, 0, -1]], [[x0, z1], [x1, z1], 0.92, [0, 0, 1]], [[x0, z0], [x0, z1], 0.8, [-1, 0, 0]], [[x1, z0], [x1, z1], 0.8, [1, 0, 0]]]) {
        for (let i = 0; i + 1 < cuts.length; i++) quadFaces([ax, cuts[i], az], [bx, cuts[i], bz], [bx, cuts[i + 1], bz], [ax, cuts[i + 1], az], shade(color, k), nrm);
        addRect([ax, y0, az], [bx, y0, bz], [ax, y1, az], nrm);
    }
}

// ============================================================
// chambers
// ============================================================
const COL = {
    panel: [226, 229, 233], metal: [86, 92, 102], floor: [104, 108, 116], floorPanel: [196, 200, 206], ceil: [60, 64, 72],
    goo: [44, 128, 76], exit: [70, 214, 110], solid: [146, 136, 120], partition: [120, 124, 134],
    cube: [196, 198, 206], red: [224, 64, 60], yellow: [236, 196, 40], blue: [60, 140, 255], orange: [255, 150, 30], pad: [255, 128, 32],
};
const SHELL = { maxEdge: 1e9, zb: -1000 };   // room shell: big faces, drawn first
const chambers = [];
function chamber(def) {
    const { ox, oz, W, D, Hc, portal = [], pits = [], exit, pads: padTiles = [], tint = [1, 1, 1] } = def;
    const METAL = COL.metal.map((v, i) => v * tint[i]), FLOOR = COL.floor.map((v, i) => v * tint[i]);
    const isPad = (i, j) => padTiles.some(([a, b]) => a === i && b === j);
    CUR_CH = chambers.length + 1;
    const X = (x) => ox + x, Z = (z) => oz + z;
    const isPortal = (key) => portal.includes(key);
    const inPit = (x, z) => pits.some(([a, b, c, d]) => x > a && x < b && z > c && z < d);
    const floorY = 3;
    // floor: per row of tiles, runs of plain tiles merged; panels / exit / pits separate
    for (let j = 0; j < D / S; j++) {
        let i = 0;
        while (i < W / S) {
            const cx = i * S + 1.5, cz = j * S + 1.5;
            if (inPit(cx, cz)) { i++; continue; }
            const key = `f:${i}:${j}`, isExit = exit && exit[0] === i && exit[1] === j;
            if (isPortal(key) || isExit || isPad(i, j)) {
                panel([X(i * S), floorY, Z(j * S)], [X(i * S), floorY, Z(j * S + S)], [X(i * S + S), floorY, Z(j * S + S)], [X(i * S + S), floorY, Z(j * S)],
                    isExit ? COL.exit : isPad(i, j) ? COL.pad : COL.floorPanel, [0, 1, 0], { portal: isPortal(key) });
                i++; continue;
            }
            const i0 = i;
            while (i < W / S && !inPit(i * S + 1.5, cz) && !isPortal(`f:${i}:${j}`) && !(exit && exit[0] === i && exit[1] === j) && !isPad(i, j)) i++;
            panel([X(i0 * S), floorY, Z(j * S)], [X(i0 * S), floorY, Z(j * S + S)], [X(i * S), floorY, Z(j * S + S)], [X(i * S), floorY, Z(j * S)],
                shade(FLOOR, j % 2 ? 0.96 : 1), [0, 1, 0], SHELL);
        }
    }
    // ceiling
    panel([X(0), Hc, Z(0)], [X(W), Hc, Z(0)], [X(W), Hc, Z(D)], [X(0), Hc, Z(D)], COL.ceil, [0, -1, 0], SHELL);
    // pits: bottom (goo) and walls down to y = 0
    for (const [a, b, c, d] of pits) {
        panel([X(a), 0, Z(c)], [X(a), 0, Z(d)], [X(b), 0, Z(d)], [X(b), 0, Z(c)], COL.goo, [0, 1, 0], SHELL);
        if (a > 0) panel([X(a), 0, Z(c)], [X(a), 0, Z(d)], [X(a), floorY, Z(d)], [X(a), floorY, Z(c)], shade(METAL, 0.7), [1, 0, 0], SHELL);
        if (b < W) panel([X(b), 0, Z(d)], [X(b), 0, Z(c)], [X(b), floorY, Z(c)], [X(b), floorY, Z(d)], shade(METAL, 0.7), [-1, 0, 0], SHELL);
        if (c > 0) panel([X(b), 0, Z(c)], [X(a), 0, Z(c)], [X(a), floorY, Z(c)], [X(b), floorY, Z(c)], shade(METAL, 0.75), [0, 0, 1], SHELL);
        if (d < D) panel([X(a), 0, Z(d)], [X(b), 0, Z(d)], [X(b), floorY, Z(d)], [X(a), floorY, Z(d)], shade(METAL, 0.75), [0, 0, -1], SHELL);
    }
    // walls: per band row, runs of metal tiles merged, panels separate; along
    // pits the wall goes down to y = 0
    const walls = [
        // name, tiles along, point(t, y) on the wall, inward normal, shade
        ['x0', D / S, (t, y) => [X(0), y, Z(t)], [1, 0, 0], 0.86],
        ['x1', D / S, (t, y) => [X(W), y, Z(D - t)], [-1, 0, 0], 0.86],
        ['z0', W / S, (t, y) => [X(W - t), y, Z(0)], [0, 0, 1], 0.95],
        ['z1', W / S, (t, y) => [X(t), y, Z(D)], [0, 0, -1], 0.95],
    ];
    for (const [name, nT, P, nrm, k] of walls) {
        // along-coordinate -> (x, z) of the wall's foot to test pits
        const foot = (t) => { const p = P(t, 0); return [p[0] - ox, p[2] - oz]; };
        for (let bnd = 0; floorY + bnd * H < Hc; bnd++) {
            const y0 = floorY + bnd * H, y1 = y0 + H;
            let t = 0;
            while (t < nT) {
                const key = `${name}:${t}:${bnd}`;
                if (isPortal(key)) {
                    panel(P(t * S, y0), P(t * S + S, y0), P(t * S + S, y1), P(t * S, y1), shade(COL.panel, k), nrm, { portal: true });
                    t++; continue;
                }
                const t0 = t;
                while (t < nT && !isPortal(`${name}:${t}:${bnd}`)) t++;
                panel(P(t0 * S, y0), P(t * S, y0), P(t * S, y1), P(t0 * S, y1), shade(METAL, k * (bnd % 2 ? 0.95 : 1)), nrm, SHELL);
            }
        }
        // below the floor along pits
        for (let t = 0; t < nT; t++) {
            const [a0, b0] = foot(t * S), [a1, b1] = foot(t * S + S);
            if (inPit((a0 + a1) / 2 + nrm[0] * 0.5, (b0 + b1) / 2 + nrm[2] * 0.5))
                panel(P(t * S, 0), P(t * S + S, 0), P(t * S + S, floorY), P(t * S, floorY), shade(METAL, k * 0.7), nrm, SHELL);
        }
    }
    chambers.push({ ...def, x0: ox, x1: ox + W, z0: oz, z1: oz + D, id: CUR_CH });
    return { X, Z };
}
// ============================================================
// dynamic objects (registry objects 1..n_dyn)
// ============================================================
const dyn = [];
function dynBox(pos, hx, hy, hz, color, { faceColors = null } = {}) {
    const o = { pos, rad: Math.hypot(hx, hy, hz) + 0.01, vstart: verts.length + 1, dfaces: [], hidden: 0, ball: 0, level: levels.length + 1 };
    const P = [];
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
        const l = [sx * hx, sy * hy, sz * hz];
        P.push(addVertex([l[0] + pos[0], l[1] + pos[1], l[2] + pos[2]], l));
    }
    const V = (sx, sy, sz) => P[(sx > 0 ? 4 : 0) + (sy > 0 ? 2 : 0) + (sz > 0 ? 1 : 0)];
    const quads = [
        [[V(-1, 1, -1), V(1, 1, -1), V(1, 1, 1), V(-1, 1, 1)], [0, 1, 0], 1],
        [[V(-1, -1, -1), V(-1, -1, 1), V(1, -1, 1), V(1, -1, -1)], [0, -1, 0], 0.6],
        [[V(-1, -1, -1), V(1, -1, -1), V(1, 1, -1), V(-1, 1, -1)], [0, 0, -1], 0.9],
        [[V(-1, -1, 1), V(-1, 1, 1), V(1, 1, 1), V(1, -1, 1)], [0, 0, 1], 0.9],
        [[V(-1, -1, -1), V(-1, 1, -1), V(-1, 1, 1), V(-1, -1, 1)], [-1, 0, 0], 0.78],
        [[V(1, -1, -1), V(1, -1, 1), V(1, 1, 1), V(1, 1, -1)], [1, 0, 0], 0.78],
    ];
    o.dfaces = quads.map(([pts, n, k], i) => ({ pts, n, color: shade(faceColors ? faceColors[i] : color, k), zb: 0 }));
    o.vend = verts.length;
    dyn.push(o);
    return dyn.length;
}
function dynPortal(color) {
    const o = { pos: [0, -50, 0], rad: 1.3, vstart: verts.length + 1, hidden: 1, ball: 0, level: 0 };
    for (let i = 0; i < 6; i++) addVertex([0, -50, 0], [0, 0, 0]);
    const v = (i) => o.vstart + i;
    o.dfaces = [[v(0), v(1), v(2), v(3)], [v(3), v(4), v(5), v(0)]].map(pts => ({ pts, n: [0, 0, 1], color, zb: 0 }));
    o.vend = verts.length;
    dyn.push(o);
    return dyn.length;
}
// portals first (objects 1, 2)
const PORTAL_OBJ = [dynPortal(COL.blue), dynPortal(COL.orange)];

// ============================================================
// building blocks for chambers (local coordinates via ch.X / ch.Z)
// ============================================================
// solid block: sides split into tiles (<= 3 wide, one height band each), top
// into 3x3 tiles; any tile can be a portal panel ('top:i:j', 'xm:t:b',
// 'xp:t:b', 'zm:t:b', 'zp:t:b'; t counts from the side's low end, b = band
// index with b = 0 for y 3..6) and one top tile can be the exit
function block(ch, x0, x1, z0, z1, top, { portal = [], exit = null, color = COL.solid, y0 = 3 } = {}) {
    const { X, Z } = ch;
    const isP = (k) => portal.includes(k);
    for (let i = 0; x0 + i * S < x1 - 1e-9; i++) for (let j = 0; z0 + j * S < z1 - 1e-9; j++) {
        const xa = x0 + i * S, xb = Math.min(x1, xa + S), za = z0 + j * S, zb = Math.min(z1, za + S);
        const key = `top:${i}:${j}`, ex = exit && exit[0] === i && exit[1] === j;
        panel([X(xa), top, Z(za)], [X(xa), top, Z(zb)], [X(xb), top, Z(zb)], [X(xb), top, Z(za)],
            ex ? COL.exit : isP(key) ? COL.floorPanel : shade(color, (i + j) % 2 ? 0.95 : 1), [0, 1, 0], { portal: isP(key) });
    }
    const cuts = [y0];
    for (let k = Math.floor(y0 / H) + 1; k * H < top - 1e-9; k++) cuts.push(k * H);
    cuts.push(top);
    const sides = [
        ['xm', z0, z1, (a, y) => [X(x0), y, Z(a)], [-1, 0, 0], 0.8],
        ['xp', z0, z1, (a, y) => [X(x1), y, Z(a)], [1, 0, 0], 0.8],
        ['zm', x0, x1, (a, y) => [X(a), y, Z(z0)], [0, 0, -1], 0.92],
        ['zp', x0, x1, (a, y) => [X(a), y, Z(z1)], [0, 0, 1], 0.92],
    ];
    for (const [name, a0, a1, P, nrm, k] of sides) {
        for (let c = 0; c + 1 < cuts.length; c++) {
            const ya = cuts[c], yb = cuts[c + 1], b = Math.floor(ya / H) - 1;
            for (let t = 0; a0 + t * S < a1 - 1e-9; t++) {
                const aa = a0 + t * S, ab = Math.min(a1, aa + S), key = `${name}:${t}:${b}`;
                panel(P(aa, ya), P(ab, ya), P(ab, yb), P(aa, yb), isP(key) ? shade(COL.panel, k) : shade(color, k), nrm, { portal: isP(key) });
            }
        }
    }
}
// thin partition wall (plane x = c or z = c) with an optional door gap (y 3..6)
function partition(ch, axis, c, a0, a1, Hc, gap = null) {
    const { X, Z } = ch;
    const bx = (s0, s1, ya, yb) => axis === 'x'
        ? box(X(c - 0.1), X(c + 0.1), ya, yb, Z(s0), Z(s1), COL.partition)
        : box(X(s0), X(s1), ya, yb, Z(c - 0.1), Z(c + 0.1), COL.partition);
    if (!gap) return bx(a0, a1, 3, Hc);
    if (gap[0] > a0) bx(a0, gap[0], 3, Hc);
    if (gap[1] < a1) bx(gap[1], a1, 3, Hc);
    bx(gap[0], gap[1], 6, Hc);
}
function addDoor(ch, group, axis, c, g0, g1, color) {
    const { X, Z } = ch;
    const [x0, x1, z0, z1] = axis === 'x' ? [X(c - 0.12), X(c + 0.12), Z(g0), Z(g1)] : [X(g0), X(g1), Z(c - 0.12), Z(c + 0.12)];
    const obj = dynBox([(x0 + x1) / 2, 4.5, (z0 + z1) / 2], (x1 - x0) / 2, 1.5, (z1 - z0) / 2, shade(color, 0.8));
    const col = axis === 'x' ? addRect([X(c), 3, Z(g0)], [X(c), 3, Z(g1)], [X(c), 6, Z(g0)], null) : addRect([X(g0), 3, Z(c)], [X(g1), 3, Z(c)], [X(g0), 6, Z(c)], null);
    doors.push({ obj, col, group, level: levels.length + 1 });
}
// energy field: see-through bars (static, two-sided) + a trigger volume
function fizzler(ch, axis, c, a0, a1, y0, y1) {
    const { X, Z } = ch;
    const P = (a, y) => axis === 'x' ? [X(c), y, Z(a)] : [X(a), y, Z(c)];
    for (let y = y0 + 0.35; y < y1 - 0.1; y += 0.85) {
        const ya = y, yb = y + 0.12;
        if (Math.floor(ya / H) !== Math.floor((yb - 1e-9) / H)) continue;   // never straddle a layer plane
        quadFaces(P(a0, ya), P(a1, ya), P(a1, yb), P(a0, yb), [110, 210, 255], null);
    }
    const [x0, x1, z0, z1] = axis === 'x' ? [X(c) - 0.05, X(c) + 0.05, Z(a0), Z(a1)] : [X(a0), X(a1), Z(c) - 0.05, Z(c) + 0.05];
    fields.push({ x0, x1, y0, y1, z0, z1, level: levels.length + 1 });
}
function addPad(ch, i, j, v) {
    const { X, Z } = ch;
    pads.push({ x: X(i * S + 1.5), y: 3, z: Z(j * S + 1.5), r: 1.35, v, level: levels.length + 1 });
}
function addHint(ch, x0, x1, z0, z1, text) {
    const { X, Z } = ch;
    hints.push({ x0: X(x0), x1: X(x1), z0: Z(z0), z1: Z(z1), y0: -10, y1: 60, text, level: levels.length + 1 });
}
const levels = [], bodies = [], buttons = [], doors = [], groups = [], fields = [], pads = [], hints = [];
const GCOL = [COL.red, COL.yellow, [70, 200, 120], [200, 90, 230], [60, 170, 255], [255, 120, 60]];
function addCube(ch, _level, p) {
    const level = levels.length + 1;   // the chamber being built
    const q = [ch.X(p[0]), p[1], ch.Z(p[2])];
    const obj = dynBox(q, 0.4, 0.4, 0.4, COL.cube, { faceColors: [COL.cube, COL.cube, [200, 120, 170], [200, 120, 170], COL.cube, COL.cube] });
    dyn[obj - 1].ball = 1;
    bodies.push({ p: q, r: 0.45, im: 1, e: 0.1, f: 0.25, obj, level });
}
function addButton(ch, group, p, color, hold = 0) {
    const q = [ch.X(p[0]), p[1], ch.Z(p[2])];
    const obj = dynBox([q[0], q[1] + 0.08, q[2]], 0.7, 0.08, 0.7, color);
    buttons.push({ p: q, r: 0.85, group, obj, by: q[1] + 0.08, hold, level: levels.length + 1 });
    groups[group - 1] = (groups[group - 1] || 0) + 1;
}
function addLevel(ch, name, start, yaw, exit, hint) {
    levels.push({ name, start: [ch.X(start[0]), start[1], ch.Z(start[2])], yaw, exit: [ch.X(exit[0]), exit[1], ch.Z(exit[2])], hint });
}
let OX = 0;
const nextRoom = (W) => { const o = OX; OX += W + 6; return o; };

// ============================================================
// 0: 체험 존 (hub) — every mechanic, with hint zones; the green pad starts the game
// ============================================================
{
    const W = 36, D = 27, ox = nextRoom(W);
    const ch = chamber({ ox, oz: 0, W, D, Hc: 12, portal: ['z0:10:0', 'z0:8:0', 'x0:6:1', 'f:9:7', 'x1:4:1'], exit: [10, 1], pads: [[8, 6]] });
    // high walkway along the left wall (reach it with a portal on its panel)
    block(ch, 0, 3, 12, 27, 6);
    // cube / button / door -> start room (behind an energy field)
    addCube(ch, 1, [15, 3.5, 3]);
    addButton(ch, 1, [19.5, 3, 4.5], GCOL[0]);
    partition(ch, 'x', 24, 0, 9, 12, [3, 6]);
    partition(ch, 'z', 9, 24, 36, 12);
    addDoor(ch, 1, 'x', 24, 3, 6, GCOL[0]);
    fizzler(ch, 'x', 26.5, 0, 9, 3, 12);
    // jump pad -> tower; fling from the tower via floor + wall panels
    block(ch, 30, 36, 21, 27, 6);
    addPad(ch, 8, 6, [9.26, 11, 5.56]);
    // timed button (5 s) + closet door with a second cube inside
    addButton(ch, 2, [18, 3, 15], GCOL[4], 5);
    partition(ch, 'z', 24, 6, 15, 12, [9, 12]);
    addDoor(ch, 2, 'z', 24, 9, 12, GCOL[4]);
    partition(ch, 'x', 6, 24, 27, 12);
    partition(ch, 'x', 15, 24, 27, 12);
    addCube(ch, 1, [13.5, 3.5, 25.5]);
    addLevel(ch, '체험 존', [6, 3.6, 13.5], 0, [31.5, 3, 4.5], '자유롭게 둘러보세요. 구역마다 설명이 나옵니다. 준비되면 빨간 문 너머 초록 발판으로!');
    addHint(ch, 0, 13, 0, 11, '포탈 연습: 흰 패널에만 붙습니다. 클릭/Q=파랑, E=주황. 두 포탈을 만들고 걸어 들어가 보세요 (왼쪽 높은 통로의 흰 패널도!)');
    addHint(ch, 13, 24, 0, 11, '큐브: 가까이 가서 F로 들고 놓기. 빨간 버튼 위에 두면 빨간 문이 열립니다');
    addHint(ch, 24, 36, 0, 9, '에너지 장벽(하늘색 줄): 지나가면 포탈이 사라지고 큐브는 분해됩니다. 초록 발판 = 게임 시작!');
    addHint(ch, 20, 36, 15, 27, '점프 패드(주황): 올라서면 탑 위로! 탑 아래 바닥 패널 + 벽 패널에 포탈을 두고 떨어지면 날아갑니다');
    addHint(ch, 3, 20, 13, 27, '시간 버튼(파랑): 밟고 나서 5초 동안만 문이 열립니다. 안쪽에 큐브가 하나 더 있어요');
}
// ============================================================
// the ten test chambers
// ============================================================
// 1 portal basics
{
    const ox = nextRoom(12);
    const ch = chamber({ ox, oz: 0, W: 12, D: 12, Hc: 12, portal: ['x0:1:0', 'z1:1:1'], tint: [1, 1, 1.05] });
    block(ch, 0, 12, 9, 12, 6, { exit: [2, 0] });
    addLevel(ch, '챔버 1/10 · 포탈 입문', [6, 3.6, 3], 90, [7.5, 6, 10.5], '선반 위 초록 출구로. 흰 패널 두 곳에 포탈을 이어 보세요');
}
// 2 the high shelf
{
    const ox = nextRoom(15);
    const ch = chamber({ ox, oz: 0, W: 15, D: 12, Hc: 15, portal: ['z0:3:0', 'z0:2:0', 'z1:0:3', 'z1:1:3'], exit: [4, 2], tint: [1.05, 1, 0.95] });
    block(ch, 0, 6, 9, 12, 9);
    partition(ch, 'x', 12, 0, 12, 15, [4.5, 7.5]);
    addDoor(ch, 3, 'x', 12, 4.5, 7.5, GCOL[0]);
    addButton(ch, 3, [7.5, 3, 4.5], GCOL[0]);
    addCube(ch, 3, [3, 9.5, 10.5]);
    addLevel(ch, '챔버 2/10 · 높은 선반', [8, 3.6, 2.5], 90, [13.5, 3, 7.5], '큐브를 빨간 버튼에. 큐브는 높은 선반 위에 있습니다 (내려올 땐 그냥 뛰어내려도 OK)');
}
// 3 two buttons
{
    const ox = nextRoom(21);
    const ch = chamber({ ox, oz: 0, W: 21, D: 15, Hc: 15, portal: ['z1:3:3', 'z1:4:3', 'x0:2:0', 'z0:2:0'], exit: [6, 3], tint: [0.95, 1.05, 1] });
    block(ch, 9, 15, 12, 15, 9);
    addButton(ch, 4, [4.5, 3, 4.5], GCOL[1]);
    addButton(ch, 4, [10.5, 3, 4.5], GCOL[1]);
    addCube(ch, 4, [4.5, 3.5, 12]);
    addCube(ch, 4, [12, 9.5, 13.5]);
    partition(ch, 'x', 18, 0, 15, 15, [6, 9]);
    addDoor(ch, 4, 'x', 18, 6, 9, GCOL[1]);
    addLevel(ch, '챔버 3/10 · 두 개의 버튼', [3, 3.6, 2], 90, [19.5, 3, 10.5], '노란 버튼 두 개를 동시에 눌러야 문이 열립니다. 큐브 하나는 높은 선반 위에');
}
// 4 jump pad
{
    const ox = nextRoom(24);
    const ch = chamber({ ox, oz: 0, W: 24, D: 12, Hc: 15, portal: [], pits: [[6, 15, 0, 12]], exit: [7, 1], pads: [[1, 1]], tint: [1.05, 0.97, 0.97] });
    addPad(ch, 1, 1, [13, 9, 0]);
    addCube(ch, 5, [2, 3.5, 9]);
    addButton(ch, 5, [18, 3, 9], GCOL[2]);
    partition(ch, 'x', 21, 0, 12, 15, [3, 6]);
    addDoor(ch, 5, 'x', 21, 3, 6, GCOL[2]);
    addLevel(ch, '챔버 4/10 · 점프 패드', [2, 3.6, 2], 0, [22.5, 3, 4.5], '주황 발판은 올라온 것을 무엇이든 날려 보냅니다. 큐브도요!');
}
// 5 fling basics
{
    const ox = nextRoom(24);
    const ch = chamber({ ox, oz: 0, W: 24, D: 12, Hc: 18, portal: ['z0:7:0', 'z1:1:4', 'f:1:1', 'x0:1:3'], pits: [[9, 15, 0, 12]], exit: [6, 1], tint: [0.97, 0.97, 1.08] });
    block(ch, 3, 6, 9, 12, 12);
    addLevel(ch, '챔버 5/10 · 플링 입문', [1.5, 3.6, 1.5], 90, [19.5, 3, 4.5], '구덩이는 점프로 못 건넙니다. 높은 곳에서 바닥 포탈로 떨어지면 그 속도로 튀어나옵니다');
}
// 6 timed button
{
    const ox = nextRoom(27);
    const ch = chamber({ ox, oz: 0, W: 27, D: 15, Hc: 12, portal: ['x0:4:0', 'z0:2:0'], exit: [8, 2], tint: [1, 1.04, 1.04] });
    block(ch, 15, 18, 9, 12, 6);
    block(ch, 6, 9, 0, 3, 6);
    addButton(ch, 6, [2.5, 3, 13.5], GCOL[4], 5);
    partition(ch, 'x', 24, 0, 15, 12, [6, 9]);
    addDoor(ch, 6, 'x', 24, 6, 9, GCOL[4]);
    addLevel(ch, '챔버 6/10 · 시간 제한', [3, 3.6, 3], 90, [25.5, 3, 7.5], '파란 시간 버튼은 5초만 문을 엽니다. 걸어서는 늦어요 — 포탈 지름길을 먼저 만들어 두세요');
}
// 7 energy field
{
    const ox = nextRoom(24);
    const ch = chamber({ ox, oz: 0, W: 24, D: 15, Hc: 12, portal: ['z0:6:0', 'z1:5:0'], exit: [7, 1], tint: [0.95, 1, 1.08] });
    fizzler(ch, 'x', 12, 0, 15, 3, 12);
    addCube(ch, 7, [4.5, 3.5, 10.5]);
    addButton(ch, 7, [18, 3, 3], GCOL[3]);
    partition(ch, 'x', 21, 0, 15, 12, [9, 12]);
    addDoor(ch, 7, 'x', 21, 9, 12, GCOL[3]);
    addLevel(ch, '챔버 7/10 · 에너지 장벽', [3, 3.6, 3], 0, [22.5, 3, 4.5], '에너지 장벽은 큐브를 분해합니다. 큐브는 포탈로 건너보내세요');
}
// 8 cube fling
{
    const ox = nextRoom(27);
    const ch = chamber({ ox, oz: 0, W: 27, D: 12, Hc: 18, portal: ['z0:8:0', 'z1:1:4', 'f:1:1', 'x0:1:3'], pits: [[9, 15, 0, 12]], exit: [8, 2], tint: [1.06, 1.02, 0.94] });
    block(ch, 3, 6, 9, 12, 12);
    partition(ch, 'x', 22, 0, 12, 18, [4.5, 7.5]);
    addDoor(ch, 8, 'x', 22, 4.5, 7.5, GCOL[1]);
    addButton(ch, 8, [18, 3, 7.5], GCOL[1]);
    addCube(ch, 8, [7.5, 3.5, 1.5]);
    addLevel(ch, '챔버 8/10 · 큐브 플링', [1.5, 3.6, 5.5], 0, [25.5, 3, 7.5], '큐브를 든 채 날아서 건너편 노란 버튼에 올리세요 (큐브도 포탈을 지나갑니다)');
}
// 9 launch upward: floor portal -> floor portal
{
    const ox = nextRoom(27);
    const ch = chamber({ ox, oz: 0, W: 27, D: 12, Hc: 21, portal: ['z0:8:0', 'z1:1:4', 'f:1:1'], pits: [[18, 21, 0, 12]], tint: [0.94, 1.06, 0.98] });
    block(ch, 3, 6, 9, 12, 12);
    block(ch, 16, 19, 3, 9, 6, { portal: ['top:0:0'] });
    block(ch, 21, 27, 0, 12, 12, { exit: [1, 1] });
    addLevel(ch, '챔버 9/10 · 하늘로 발사', [1.5, 3.6, 1.5], 90, [25.5, 12, 4.5], '바닥 포탈로 떨어져 바닥 포탈로 나오면 위로 솟구칩니다. 출구는 높은 선반 위');
}
// 10 the final test
{
    const ox = nextRoom(30);
    const ch = chamber({ ox, oz: 0, W: 30, D: 18, Hc: 15, portal: ['z0:9:0', 'x0:3:0', 'z0:2:0', 'z1:6:0'], pits: [[9, 18, 0, 18]], exit: [9, 3], pads: [[1, 2]], tint: [1.04, 0.96, 1.04] });
    fizzler(ch, 'x', 9, 0, 18, 3, 15);
    addPad(ch, 1, 2, [14, 10, 0]);
    addCube(ch, 10, [4.5, 3.5, 15]);
    addButton(ch, 9, [4.5, 3, 3], GCOL[5], 8);
    addButton(ch, 9, [22.5, 3, 15], GCOL[5]);
    partition(ch, 'x', 27, 0, 18, 15, [7.5, 10.5]);
    addDoor(ch, 9, 'x', 27, 7.5, 10.5, GCOL[5]);
    addLevel(ch, '챔버 10/10 · 최종 시험', [4.5, 3.6, 10.5], 0, [28.5, 3, 10.5], '버튼 두 개: 큐브 버튼 + 8초 시간 버튼. 장벽을 넘으면 포탈이 사라진다는 걸 기억하세요');
}

// ============================================================
// layer order, clusters (per chamber), PVS per room
// ============================================================
const NL = 2 * F;
// static geometry was interleaved with dynamic objects' vertices; the engine
// wants dynamic vertices first — rebuild: dynamic vertices keep their
// indices only if all dynamic objects come first, so remap everything.
{
    const dynSet = new Set(); for (const o of dyn) for (let v = o.vstart; v <= o.vend; v++) dynSet.add(v);
    const map = new Map(), nv = [], nb = [];
    for (const o of dyn) { const s0 = nv.length + 1; for (let v = o.vstart; v <= o.vend; v++) { map.set(v, nv.length + 1); nv.push(verts[v - 1]); nb.push(baseVerts[v - 1]); } o.vend = nv.length; o.vstart = s0; }
    for (let v = 1; v <= verts.length; v++) if (!dynSet.has(v)) { map.set(v, nv.length + 1); nv.push(verts[v - 1]); nb.push(baseVerts[v - 1]); }
    for (const f of faces) f.pts = f.pts.map(v => map.get(v));
    for (const o of dyn) for (const f of o.dfaces) f.pts = f.pts.map(v => map.get(v));
    verts.length = 0; verts.push(...nv); baseVerts.length = 0; baseVerts.push(...nb);
}
const DYN_V = dyn.length ? dyn[dyn.length - 1].vend : 0;
// weld: static faces share vertices at identical positions (tiles from
// separate panels meet at the same corners), so a cluster needs far fewer
{
    const key = (p) => p.map(v => Math.round(v * 1e4)).join(',');
    const canon = new Map(); let merged = 0;
    for (const f of faces) f.pts = f.pts.map(v => {
        if (v <= DYN_V) return v;
        const k = key(verts[v - 1]);
        if (!canon.has(k)) canon.set(k, v); else if (canon.get(k) !== v) merged++;
        return canon.get(k);
    });
    console.log(`weld: ${merged} static vertex references merged, ${canon.size} distinct static positions`);
}
const NSTATIC_F = faces.length;
// clusters: per chamber, layer and 3x3x3 cell
const groupsCl = new Map();
for (let fi = 0; fi < NSTATIC_F; fi++) {
    const f = faces[fi], p = f.pts.map(i => verts[i - 1]);
    const c = [0, 1, 2].map(a => p.reduce((t, q) => t + q[a], 0) / p.length);
    const key = `${f.ch}|${f.layer}|${Math.floor(c[0] / (2 * S))}|${Math.floor(c[2] / (2 * S))}|${Math.floor(c[1] / H)}`;
    if (!groupsCl.has(key)) groupsCl.set(key, []);
    groupsCl.get(key).push(fi);
}
const clusters = [];
for (const fl of groupsCl.values()) for (let i = 0; i < fl.length; i += 10) clusters.push({ layer: faces[fl[0]].layer, ch: faces[fl[0]].ch, faces: fl.slice(i, i + 10) });
clusters.sort((a, b) => a.layer - b.layer);
const newIndexOfFace = new Array(NSTATIC_F);
{
    const nv = verts.slice(0, DYN_V), nb = baseVerts.slice(0, DYN_V), ns = [];
    // vertices stay shared between clusters (the engine projects vertices
    // lazily, one by one, so a cluster needs no vertex range of its own)
    const vmap = new Map();
    clusters.forEach((cl) => {
        cl.f0 = ns.length + 1;
        const used = [];
        for (const fi of cl.faces) {
            const f = faces[fi];
            ns.push({ ...f, pts: f.pts.map(v => { if (!vmap.has(v)) { nv.push(verts[v - 1]); nb.push(verts[v - 1]); vmap.set(v, nv.length); } used.push(vmap.get(v)); return vmap.get(v); }) });
            newIndexOfFace[fi] = ns.length;
        }
        cl.f1 = ns.length; cl.v0 = 1; cl.v1 = 0;
        const ps = used.map(v => nv[v - 1]);
        const mn = [0, 1, 2].map(a => Math.min(...ps.map(q => q[a]))), mx = [0, 1, 2].map(a => Math.max(...ps.map(q => q[a])));
        cl.c = mn.map((v, a) => (v + mx[a]) / 2);
        cl.r = Math.max(...ps.map(q => Math.hypot(q[0] - cl.c[0], q[1] - cl.c[1], q[2] - cl.c[2]))) + 0.01;
    });
    faces.splice(0, NSTATIC_F, ...ns);
    verts.length = 0; verts.push(...nv); baseVerts.length = 0; baseVerts.push(...nb);
}
console.log(`static faces ${NSTATIC_F}, clusters ${clusters.length}, vertices after clustering ${verts.length} (dynamic ${DYN_V})`);
for (const c of cols) c.tiles = c.tiles.map(fi => newIndexOfFace[fi]);
const layerF0 = [], layerF1 = [];
for (let L = 0; L < NL; L++) {
    const cs = clusters.filter(c => c.layer === L);
    layerF0.push(cs.length ? cs[0].f0 : 1);
    layerF1.push(cs.length ? cs[cs.length - 1].f1 : 0);
}
// dynamic faces after the static ones
for (const o of dyn) { o.fstart = faces.length + 1; faces.push(...o.dfaces); o.fend = faces.length; }

// PVS grid over the whole world; a cell inside a chamber sees that chamber
const XMAX = Math.max(...chambers.map(c => c.x1)), ZMAX = Math.max(...chambers.map(c => c.z1));
const PV = { x0: -3, z0: -3, cs: S };
PV.nx = Math.ceil((XMAX + 3 - PV.x0) / S); PV.nz = Math.ceil((ZMAX + 3 - PV.z0) / S);
const nCells = PV.nx * PV.nz * (F + 1);
const chamberAt = (x, z) => chambers.find(c => x >= c.x0 - 0.01 && x <= c.x1 + 0.01 && z >= c.z0 - 0.01 && z <= c.z1 + 0.01);
const units = [], dir = new Array(nCells).fill(0);
// Every cell of a room sees the same clusters (rooms are closed), so records
// are shared: one per room region (3x3 regions per room, clusters presorted
// far-to-near from the region center) — the store stays small however big
// the world gets. Target cells for dynamic objects: the room's own cells.
let runsTotal = 0, clTotal = 0, validCells = 0, nRecords = 0;
const recordAt = new Map();
const T = PV.nx * PV.nz * (F + 1);
const roomTargets = new Map();
for (const chm of chambers) {
    const vis = [];
    for (let t = 1; t <= T; t++) {
        const rem = (t - 1) % (PV.nx * PV.nz), tz = Math.floor(rem / PV.nx), tx = rem % PV.nx;
        if (chamberAt(PV.x0 + tx * S + S / 2, PV.z0 + tz * S + S / 2) === chm) vis.push(t);
    }
    roomTargets.set(chm.id, vis);
}
for (let band = 0; band <= F; band++) for (let iz = 0; iz < PV.nz; iz++) for (let ix = 0; ix < PV.nx; ix++) {
    const c = ix + PV.nx * (iz + PV.nz * band);
    const cx = PV.x0 + ix * S + S / 2, cz = PV.z0 + iz * S + S / 2;
    const chm = chamberAt(cx, cz);
    if (!chm) continue;
    validCells++;
    const ri = Math.max(0, Math.min(2, Math.floor((cx - chm.x0) / ((chm.x1 - chm.x0) / 3))));
    const rj = Math.max(0, Math.min(2, Math.floor((cz - chm.z0) / ((chm.z1 - chm.z0) / 3))));
    const key = `${chm.id}:${ri}:${rj}`;
    if (!recordAt.has(key)) {
        recordAt.set(key, units.length + 1); nRecords++;
        let items = roomTargets.get(chm.id), inv = 0;
        if (items.length > T / 2) { const sv = new Set(items); items = []; for (let t = 1; t <= T; t++) if (!sv.has(t)) items.push(t); inv = 1; }
        const runs = [];
        for (const t of items) { const last = runs[runs.length - 1]; if (last && last[0] + last[1] === t) last[1]++; else runs.push([t, 1]); }
        runsTotal += runs.length;
        units.push(runs.length, inv, ...runs.flat());
        const eye = [chm.x0 + (ri + 0.5) * (chm.x1 - chm.x0) / 3, 5, chm.z0 + (rj + 0.5) * (chm.z1 - chm.z0) / 3];
        for (let L = 0; L < NL; L++) {
            const list = clusters.map((cl, i) => [cl, i + 1]).filter(([cl]) => cl.layer === L && cl.ch === chm.id)
                .sort((a, b) => Math.hypot(...b[0].c.map((v, k) => v - eye[k])) - Math.hypot(...a[0].c.map((v, k) => v - eye[k]))).map(([, i]) => i);
            units.push(list.length, ...list);
            clTotal += list.length;
        }
    }
    dir[c] = recordAt.get(key);
}
const digits = String(units.reduce((a, b) => Math.max(a, b), 0)).length;
const K = Math.floor(15 / digits), BASE = 10 ** digits;
const words = [];
for (let i = 0; i < units.length; i += K) { let w = 0; for (let j = K - 1; j >= 0; j--) w = w * BASE + (units[i + j] ?? 0); words.push(w); }

// ============================================================
// physics: spatial hash, bodies
// ============================================================
const RMAX = 0.65;
const GRID = { x0: -4, y0: -3, z0: -4, cs: 3 };
const cellRegs = new Map();
cols.forEach((col, ci) => {
    const mn = [0, 1, 2].map(a => Math.min(...col.corners.map(p => p[a])) - RMAX);
    const mx = [0, 1, 2].map(a => Math.max(...col.corners.map(p => p[a])) + RMAX);
    const o = [GRID.x0, GRID.y0, GRID.z0];
    const lo = mn.map((v, a) => Math.floor((v - o[a]) / GRID.cs)), hi = mx.map((v, a) => Math.floor((v - o[a]) / GRID.cs));
    for (let iy = lo[1]; iy <= hi[1]; iy++) for (let iz = lo[2]; iz <= hi[2]; iz++) for (let ix = lo[0]; ix <= hi[0]; ix++) {
        const key = `${ix},${iy},${iz}`;
        if (!cellRegs.has(key)) cellRegs.set(key, [ix, iy, iz, new Set()]);
        cellRegs.get(key)[3].add(ci + 1);
    }
});
const isPrime = (n) => { for (let d = 2; d * d <= n; d++) if (n % d === 0) return false; return n > 1; };
let TSIZE = Math.min(4999, cellRegs.size * 2 + 1);
while (!isPrime(TSIZE)) TSIZE--;
const bucketOf = (ix, iy, iz) => ((ix + 50000) + (iz + 50000) * 7919 + (iy + 50000) * 104729) % TSIZE;
const buckets = Array.from({ length: TSIZE }, () => new Set());
for (const [ix, iy, iz, set] of cellRegs.values()) for (const c of set) buckets[bucketOf(ix, iy, iz)].add(c);
const gridStart = [], gridCnt = [], gridItems = [];
for (const b of buckets) { gridStart.push(gridItems.length + 1); gridCnt.push(b.size); gridItems.push(...[...b].sort((x, y) => x - y)); }

const allBodies = [{ p: levels[0].start, r: 0.6, im: 0.5, e: 0, f: 0, ch: 1, obj: 0, level: 0 }, ...bodies.map(b => ({ ...b, ch: 0 }))];

// ============================================================
// write
// ============================================================
const V = verts.length;
setList('3d_x', verts.map(p => p[0])); setList('3d_y', verts.map(p => p[1])); setList('3d_z', verts.map(p => p[2]));
setList('base_x', baseVerts.map(p => p[0])); setList('base_y', baseVerts.map(p => p[1])); setList('base_z', baseVerts.map(p => p[2]));
for (const n of ['t_x', 't_y', 'view_z', 'scr_code', 'proj_stamp']) setList(n, Array(V).fill(0));
for (const n of ['view_x', 'view_y', 'dot_dis', 'face__']) setList(n, []);
for (let k = 1; k <= 5; k++) setList('face_p' + k, faces.map(f => f.pts[k - 1] ?? f.pts[0]));
setList('face_', faces.map(f => f.pts.length));
setList('orders', faces.map((_, i) => i + 1));
setList('face_dis', faces.map(() => 0));
setList('face_r', faces.map(f => f.color[0])); setList('face_g', faces.map(f => f.color[1])); setList('face_b', faces.map(f => f.color[2]));
setList('face_allvalid', faces.map(() => 0));
setList('face_1s', faces.map(f => f.n ? 1 : 0));
setList('face_nx', faces.map(f => f.n ? f.n[0] : 0)); setList('face_ny', faces.map(f => f.n ? f.n[1] : 0)); setList('face_nz', faces.map(f => f.n ? f.n[2] : 0));
setList('face_zb', faces.map(f => f.zb || 0));
setList('face_por', faces.map(() => 0));

setVarValue('n_floors', F); setVarValue('floor_h', H);
setList('layer_f0', layerF0); setList('layer_f1', layerF1);
setVarValue('static_v0', DYN_V + 1); setVarValue('static_v1', V);
setVarValue('pvs_x0', PV.x0); setVarValue('pvs_z0', PV.z0); setVarValue('pvs_cs', PV.cs); setVarValue('pvs_nx', PV.nx); setVarValue('pvs_nz', PV.nz);
setVarValue('pvs_ok', 0); setVarValue('pvs_cell', 1);
setPaged('pvs_store', words); setPaged('pvs_dir', dir);
setVarValue('pk_base', BASE); setVarValue('pk_k', K); setList('pk_pow', Array.from({ length: K }, (_, j) => BASE ** j));
setPaged('cell_mark', Array(nCells).fill(0));
for (const n of ['cur_fstart', 'cur_fcnt', 'cur_fitems']) setList(n, []);
setVarValue('loaded_cell', 0); setVarValue('cur_valid', 0); setVarValue('mark_stamp', 0); setVarValue('cur_inv', 0);
for (const [n, fn] of [['cl_f0', c => c.f0], ['cl_f1', c => c.f1], ['cl_v0', c => c.v0], ['cl_v1', c => c.v1],
    ['cl_cx', c => c.c[0]], ['cl_cy', c => c.c[1]], ['cl_cz', c => c.c[2]], ['cl_r', c => c.r], ['cl_vis', () => 0]]) setList(n, clusters.map(fn));

setVarValue('n_dyn', dyn.length);
setList('obj_vstart', dyn.map(o => o.vstart)); setList('obj_vend', dyn.map(o => o.vend));
setList('obj_fstart', dyn.map(o => o.fstart)); setList('obj_fend', dyn.map(o => o.fend));
setList('obj_x', dyn.map(o => o.pos[0])); setList('obj_y', dyn.map(o => o.pos[1])); setList('obj_z', dyn.map(o => o.pos[2]));
setList('obj_movable', dyn.map(() => 1)); setList('obj_vis', dyn.map(() => 1)); setList('obj_rad', dyn.map(o => o.rad));
setList('obj_moved', dyn.map(() => 1));
for (const n of ['obj_lx', 'obj_ly', 'obj_lz']) setList(n, dyn.map(() => 'none'));
setList('obj_ball', dyn.map(o => o.ball)); setList('obj_hidden', dyn.map(o => o.hidden));
setList('cam_prev', Array(12).fill('none'));
setVarValue('anim_obj', 0);
setVarValue('max_dis', 70);
setVarValue('fog_r', 30); setVarValue('fog_g', 33); setVarValue('fog_b', 40);

const colList = (name, fn) => setList(name, cols.map(fn));
colList('col_cx', c => c.c[0]); colList('col_cy', c => c.c[1]); colList('col_cz', c => c.c[2]);
colList('col_nx', c => c.n[0]); colList('col_ny', c => c.n[1]); colList('col_nz', c => c.n[2]);
colList('col_ux', c => c.u[0]); colList('col_uy', c => c.u[1]); colList('col_uz', c => c.u[2]);
colList('col_wx', c => c.w[0]); colList('col_wy', c => c.w[1]); colList('col_wz', c => c.w[2]);
colList('col_hu', c => c.hu); colList('col_hw', c => c.hw); colList('col_1s', c => c.oneSided);
colList('col_on', c => c.on); colList('col_portal', c => c.portal);
{
    const tiles = [], f0 = [], fn = [];
    for (const c of cols) { f0.push(tiles.length + 1); fn.push(c.portal ? c.tiles.length : 0); if (c.portal) tiles.push(...c.tiles); }
    setList('col_tf0', f0); setList('col_tfn', fn); setList('col_tiles', tiles);
}
for (const [k, v] of Object.entries(GRID)) setVarValue('grid_' + k, v);
setList('grid_start', gridStart); setList('grid_cnt', gridCnt); setPaged('grid_items', gridItems);
setVarValue('grid_tsize', TSIZE);
setVarValue('ph_rmax', RMAX); setVarValue('ph_eye', 0.45);
setVarValue('ph_nb', allBodies.length);
setVarValue('ph_spawnx', levels[0].start[0]); setVarValue('ph_spawny', levels[0].start[1]); setVarValue('ph_spawnz', levels[0].start[2]);
const bl = (name, fn) => setList(name, allBodies.map(fn));
bl('b_x', b => b.p[0]); bl('b_y', b => b.p[1]); bl('b_z', b => b.p[2]);
bl('b_vx', () => 0); bl('b_vy', () => 0); bl('b_vz', () => 0);
bl('b_r', b => b.r); bl('b_im', b => b.im); bl('b_e', b => b.e); bl('b_f', b => b.f);
bl('b_char', b => b.ch); bl('b_gnd', () => 0); bl('b_sleep', () => 0); bl('b_still', () => 0); bl('b_obj', b => b.obj);
bl('b_sx', b => b.p[0]); bl('b_sy', b => b.p[1]); bl('b_sz', b => b.p[2]); bl('b_level', b => b.level);
setVarValue('ph_fly', 0); setVarValue('ball_render', 1); setVarValue('ball_phys', 1);

// game
setVarValue('game_on', 1);
setVarValue('n_levels', levels.length); setVarValue('cur_level', 1); setVarValue('kill_y', 1.5); setVarValue('game_done', 0);
setList('lv_sx', levels.map(l => l.start[0])); setList('lv_sy', levels.map(l => l.start[1])); setList('lv_sz', levels.map(l => l.start[2]));
setList('lv_yaw', levels.map(l => l.yaw));
setList('lv_ex', levels.map(l => l.exit[0])); setList('lv_ey', levels.map(l => l.exit[1])); setList('lv_ez', levels.map(l => l.exit[2]));
setList('lv_hint', levels.map(l => l.hint)); setList('lv_name', levels.map(l => l.name));
setList('btn_hold', buttons.map(b => b.hold)); setList('btn_until', buttons.map(() => 0));
for (const [n, f] of [['jp_x', p => p.x], ['jp_y', p => p.y], ['jp_z', p => p.z], ['jp_r', p => p.r], ['jp_vx', p => p.v[0]], ['jp_vy', p => p.v[1]], ['jp_vz', p => p.v[2]]]) setList(n, pads.map(f));
for (const k of ['x0', 'x1', 'y0', 'y1', 'z0', 'z1']) { setList('fz_' + k, fields.map(f => f[k])); setList('hz_' + k, hints.map(h => h[k])); }
setList('hz_text', hints.map(h => h.text));
setList('obj_level', dyn.map(o => o.level));
setList('btn_level', buttons.map(b => b.level)); setList('door_level', doors.map(d => d.level));
setList('jp_level', pads.map(p => p.level)); setList('fz_level', fields.map(f => f.level)); setList('hz_level', hints.map(h => h.level));
for (const n of ['act_b', 'act_o', 'act_btn', 'act_door', 'act_jp', 'act_fz', 'act_hz']) setList(n, []);   // built by level_reset
setList('por_obj', PORTAL_OBJ); setList('por_f', PORTAL_OBJ.map(o => dyn[o - 1].fstart));
for (const n of ['por_on', 'por_col']) setList(n, [0, 0]);
setList('btn_x', buttons.map(b => b.p[0])); setList('btn_y', buttons.map(b => b.p[1])); setList('btn_z', buttons.map(b => b.p[2]));
setList('btn_r', buttons.map(b => b.r)); setList('btn_group', buttons.map(b => b.group)); setList('btn_obj', buttons.map(b => b.obj));
setList('btn_by', buttons.map(b => b.by)); setList('btn_on', buttons.map(() => 0));
setList('door_obj', doors.map(d => d.obj)); setList('door_col', doors.map(d => d.col)); setList('door_group', doors.map(d => d.group)); setList('door_open', doors.map(() => 0));
setList('grp_need', groups.map(n => n || 0)); setList('grp_cnt', groups.map(() => 0));

// camera start (reset) = chamber 1 start; near plane 0.2
{
    const ydux = project.functions.find(f => f.id === 'ydux');
    const content = JSON.parse(ydux.content);
    const all = [];
    (function walk(n) { if (Array.isArray(n)) n.forEach(walk); else if (n && typeof n === 'object') { all.push(n); for (const k in n) walk(n[k]); } })(content);
    const setCam = (list, value) => {
        const b = all.find(x => x.type === 'change_value_list_index' && x.params[0] === list && x.params[1]?.params?.[0] === '17');
        b.params[2] = { ...b.params[2], params: [String(value)] };
    };
    setCam('p604', levels[0].start[0]); setCam('woyc', levels[0].start[1] + 0.45); setCam('23s0', levels[0].start[2]);
    const nel = all.find(x => x.type === 'set_variable' && x.params[0] === 'nelz');
    nel.params[1] = { ...nel.params[1], params: ['0.2'] };
    ydux.content = JSON.stringify(content);
}

// HUD + crosshair text boxes (cloned from the fps box)
{
    const fpsObj = project.objects.find(o => o.name === 'fps');
    const used = new Set(JSON.stringify(project).match(/"id":"(\w+)"/g).map(m => m.slice(6, -1)));
    const nid = () => { let id; do { id = Math.random().toString(36).slice(2, 6); } while (used.has(id) || id.length < 4); used.add(id); return id; };
    const B = (type, params, statements = []) => ({ id: nid(), x: 0, y: 0, type, params, statements, movable: null, deletable: 1, emphasized: false, readOnly: null, copyable: true, assemble: true, extensions: [] });
    const hudVar = findVar('variable', 'hud_text').id;
    const mk = (name, text, x, y, colour, fontSize, scale, script) => {
        const o = JSON.parse(JSON.stringify(fpsObj));
        o.id = nid(); o.name = name; o.text = text;
        Object.assign(o.entity, { x, y, text, colour, fontSize, font: `bold ${fontSize}px Nanum Gothic`, scaleX: scale, scaleY: scale, width: 30, height: 30, textAlign: 1 });
        o.script = JSON.stringify(script);
        return o;
    };
    const hud = mk('hud', '', 0, 112, '#ffe9a8', 13, 1, [[
        B('when_scene_start', [null]),
        B('repeat_inf', [null, null], [[B('text_write', [B('get_variable', [hudVar, null]), null]), B('wait_second', [B('number', ['0.1']), null])]]),
    ]]);
    Object.assign(hud.entity, { width: 440, height: 44, lineBreak: true, regX: 220, regY: 22 });
    hud.lineBreak = true;
    const cross = mk('crosshair', '+', 0, 0, '#ffffff', 22, 0.8, [[B('when_scene_start', [null])]]);
    project.objects.unshift(hud, cross);
}

// dark lab backdrop (= fog color)
{
    const bg = project.objects.find(o => o.name === 'background');
    const pic = bg.sprite.pictures[0];
    await sharp({ create: { width: pic.dimension.width, height: pic.dimension.height, channels: 3, background: { r: 30, g: 33, b: 40 } } })
        .png().toFile(path.join(workDir, 'temp', pic.fileurl.replace(/^temp\//, '')));
}

const big = project.variables.filter(v => v.variableType === 'list' && v.array.length > PAGE);
if (big.length) throw new Error('lists over 5000 items: ' + big.map(v => v.name).join(', '));
fs.writeFileSync(projectPath, JSON.stringify(project));
const outTar = path.join(workDir, 'out.tar');
cp.execSync(`tar -cf "${outTar}" -C "${workDir}" temp`);
fs.writeFileSync(OUT, zlib.gzipSync(fs.readFileSync(outTar), { level: 9 }));
fs.rmSync(workDir, { recursive: true, force: true });
console.log('wrote', OUT);
console.log(`chambers ${chambers.length}, faces ${faces.length} (static ${NSTATIC_F}, shell ${faces.filter(f => f.zb).length}), vertices ${V} (dynamic ${DYN_V}), colliders ${cols.length} (portal-able ${cols.filter(c => c.portal).length}), clusters ${clusters.length}`);
console.log(`PVS: ${validCells} cells share ${nRecords} records (avg ${(clTotal / nRecords).toFixed(1)} clusters), ${units.length} units -> ${words.length} items; hash ${TSIZE} buckets, ${gridItems.length} registrations`);
console.log(`levels ${levels.length}, bodies ${allBodies.length}, buttons ${buttons.length}, doors ${doors.length}, jump pads ${pads.length}, energy fields ${fields.length}, hint zones ${hints.length}`);
