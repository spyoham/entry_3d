#!/usr/bin/env node
// Build the v3 scene on top of the engine produced by transform-v3.mjs:
//  - 6x6 cells x 3 floors open-roof maze (cells 3 wide, floors 3 high),
//    slabs between floors with a ramp hole each, entrance on floor 1,
//    exit on floor 3
//  - draw layers (ground, floor 1, slab 1, floor 2, slab 2, floor 3)
//  - PVS: for every 3x3 grid cell and floor band, the set of static faces
//    visible from anywhere in it (ray-sampled against the maze walls and
//    slabs), plus the set of vertices those faces use
//  - physics world: rectangle colliders (walls, slabs, ramps, ground,
//    invisible boundary) registered in a uniform grid, the player body and
//    bouncy balls
//  - one animated decorative dodecahedron floating above the maze
//  - v3.3: a physics playground east of the maze (stairs, platform, slide,
//    parkour blocks up a railed tower, a V-trough, a pillar field, more
//    balls), PVS for every height band incl. the sky above the maze (the
//    player can fly), world ceiling at y=30
//
// Usage: node maze-v33.mjs <engine.ent> <out.ent>   (MAZE_MAP=1 prints maps)

import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import cp from 'node:child_process';
import sharp from 'sharp';

const [, , IN, OUT] = process.argv;
const workDir = path.join(path.dirname(IN), '.maze33-tmp');
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
// Entry lists hold at most 5000 items: data that may be larger goes into
// the engine's paged lists <name>_1, <name>_2, ... (5000 items each)
const PAGE = 5000;
const setPaged = (name, values) => {
    const pages = project.variables.filter(v => v.variableType === 'list' && new RegExp(`^${name}_\\d+$`).test(v.name))
        .sort((a, b) => Number(a.name.split('_').pop()) - Number(b.name.split('_').pop()));
    if (values.length > pages.length * PAGE) throw new Error(`${name}: ${values.length} items exceed ${pages.length} pages x ${PAGE}`);
    pages.forEach((l, i) => { l.array = values.slice(i * PAGE, (i + 1) * PAGE).map((v, j) => ({ id: `${l.id}_${j}`, data: String(v) })); });
    return pages.length;
};
const assertListSizes = () => {
    const big = project.variables.filter(v => v.variableType === 'list' && v.array.length > PAGE);
    if (big.length) throw new Error('lists over 5000 items: ' + big.map(v => `${v.name}(${v.array.length})`).join(', '));
};

// ============================================================
// parameters
// ============================================================
const N = 6, S = 3, H = 3, F = 3;
const SEED = 20260918;
// ramps: on floor `f` in cell (c, r), rising toward +x (dir 1) or -x (dir -1)
// from floor f up to floor f+1; the slab above the cell has a hole.
const RAMPS = [{ f: 1, c: 1, r: 4, dir: +1 }, { f: 2, c: 4, r: 1, dir: -1 }];
const ENTRANCE = { f: 1, row: 2 };   // east border (x = N*S)
const EXIT = { f: 3, row: 3 };       // west border (x = 0)
const G0 = -6, G1X = 51, G1Z = N * S + 6;   // ground / world extent (x reaches the playground)
const CEIL = 30;                     // world ceiling (flight limit)

function mulberry32(a) {
    return () => {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const rand = mulberry32(SEED);

// vwall[c][r]: wall on line x=c between z=r..r+1; hwall[c][r]: on z=r, x=c..c+1
// Ramp cells (lower floor) and hole cells (upper floor) are kept out of the
// DFS and attached afterwards through exactly one side (the ramp's low end
// below, its high end above), so the ramp can only be entered head-on.
function generateMaze(excluded) {
    const vwall = Array.from({ length: N + 1 }, () => Array(N).fill(true));
    const hwall = Array.from({ length: N }, () => Array(N + 1).fill(true));
    const seen = Array.from({ length: N }, (_, c) => Array.from({ length: N }, (_, r) => excluded.has(`${c},${r}`)));
    const start = [0, 0];
    const stack = [start];
    seen[0][0] = true;
    while (stack.length) {
        const [c, r] = stack[stack.length - 1];
        const nbrs = [[1, 0], [-1, 0], [0, 1], [0, -1]]
            .map(([dc, dr]) => [c + dc, r + dr, dc, dr])
            .filter(([nc, nr]) => nc >= 0 && nr >= 0 && nc < N && nr < N && !seen[nc][nr]);
        if (!nbrs.length) { stack.pop(); continue; }
        const [nc, nr, dc, dr] = nbrs[Math.floor(rand() * nbrs.length)];
        if (dc === 1) vwall[c + 1][r] = false;
        if (dc === -1) vwall[c][r] = false;
        if (dr === 1) hwall[c][r + 1] = false;
        if (dr === -1) hwall[c][r] = false;
        seen[nc][nr] = true;
        stack.push([nc, nr]);
    }
    return { vwall, hwall };
}
const lowX = (rp) => rp.dir > 0 ? rp.c : rp.c + 1;   // x line of the ramp's low edge
const highX = (rp) => rp.dir > 0 ? rp.c + 1 : rp.c;
const maze = {};
for (let f = 1; f <= F; f++) {
    const excluded = new Set(RAMPS.filter(rp => rp.f === f || rp.f + 1 === f).map(rp => `${rp.c},${rp.r}`));
    maze[f] = generateMaze(excluded);
}
for (const rp of RAMPS) {
    maze[rp.f].vwall[lowX(rp)][rp.r] = false;        // walk onto the ramp's low end
    maze[rp.f + 1].vwall[highX(rp)][rp.r] = false;   // step off its high end upstairs
}
maze[ENTRANCE.f].vwall[N][ENTRANCE.row] = false;
maze[EXIT.f].vwall[0][EXIT.row] = false;
const isHole = (f, c, r) => RAMPS.some(rp => rp.f + 1 === f && rp.c === c && rp.r === r); // slab under floor f

// ============================================================
// geometry
// ============================================================
const verts = [], baseVerts = [];
const addVertex = (p, base = p) => { verts.push(p); baseVerts.push(base); return verts.length; };
const faces = [];   // { pts, color, layer } (static) — dynamic ones appended later
const hsv2rgb = (h, s, v) => {
    const cc = v * s, x = cc * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - cc;
    const [r, g, b] = h < 60 ? [cc, x, 0] : h < 120 ? [x, cc, 0] : h < 180 ? [0, cc, x] : h < 240 ? [0, x, cc] : h < 300 ? [x, 0, cc] : [cc, 0, x];
    return [r, g, b].map(t => Math.round((t + m) * 255));
};
const shade = (rgb, k) => rgb.map(v => Math.max(0, Math.min(255, Math.round(v * k))));

// dynamic objects first (registry objects 1..n_dyn, vertices 1..DYN_V)
const DODECA_X = [-0.618, 0.618, -1, -1, 1, 1, 0, 0, -1.618, -1.618, 1.618, 1.618, 0, 0, -1, -1, 1, 1, -0.618, 0.618];
const DODECA_Y = [0, 0, 1, -1, 1, -1, 1.618, -1.618, 0.618, -0.618, 0.618, -0.618, 1.618, -1.618, 1, -1, 1, -1, 0, 0];
const DODECA_Z = [1.618, 1.618, 1, 1, 1, 1, 0.618, 0.618, 0, 0, 0, 0, -0.618, -0.618, -1, -1, -1, -1, -1.618, -1.618];
const DODECA_FACES = [
    [3, 1, 2, 5, 7], [1, 2, 6, 8, 4], [1, 3, 9, 10, 4], [2, 5, 11, 12, 6],
    [3, 9, 15, 13, 7], [4, 8, 14, 16, 10], [5, 7, 13, 17, 11], [6, 8, 14, 18, 12],
    [9, 15, 19, 16, 10], [20, 19, 16, 14, 18], [11, 12, 18, 20, 17], [13, 17, 20, 19, 15],
];
const DECOR = { cx: 9, cy: 11, cz: 9, orbit: 3, scale: 1.1 };
const BALL_R = 0.45;
const BALLS = [   // [x, y, z] (y = drop height), hue
    { p: [13.5, 2.0, 7.5], hue: 0 }, { p: [4.5, 5.0, 13.5], hue: 200 }, { p: [7.5, 8.0, 4.5], hue: 45 },
    { p: [16.5, 1.5, 10.5], hue: 300 },
    // playground
    { p: [35.5, 3.3, 6.8], hue: 120 }, { p: [26.5, 2.8, 17], hue: 20 }, { p: [31.8, 2.8, 19], hue: 170 },
    { p: [44, 6.7, 2], hue: 260 }, { p: [31.7, 3.6, 2], hue: 330 }, { p: [40.5, 9, 16.5], hue: 60 },
];
const dyn = [];   // { pos, scale, hueBase, vstart, vend, fstart, fend }
function addDodeca(pos, scale, colorOf) {
    const o = { pos, rad: scale * Math.sqrt(3) + 0.01, vstart: verts.length + 1, dfaces: [] };
    for (let i = 0; i < 20; i++) {
        const l = [DODECA_X[i] * scale, DODECA_Y[i] * scale, DODECA_Z[i] * scale];
        addVertex([l[0] + pos[0], l[1] + pos[1], l[2] + pos[2]], l);
    }
    o.vend = verts.length;
    o.dfaces = DODECA_FACES.map((f, i) => {
        const c = [0, 1, 2].map(a => f.reduce((t, k) => t + [DODECA_X, DODECA_Y, DODECA_Z][a][k - 1], 0) / f.length);
        const l = Math.hypot(...c);
        return { pts: f.map(k => k + o.vstart - 1), color: colorOf(i), n: c.map(v => v / l) };
    });
    dyn.push(o);
    return o;
}
addDodeca([DECOR.cx + DECOR.orbit, DECOR.cy, DECOR.cz], DECOR.scale, i => hsv2rgb(i * 30, 0.75, 0.97));
for (const b of BALLS) addDodeca(b.p, BALL_R / Math.sqrt(3), i => hsv2rgb((b.hue + (i % 3) * 12) % 360, 0.8, 0.75 + 0.2 * ((i * 7) % 3) / 2));
const DYN_V = verts.length;

// ground tiles
const GTX = 8, GTZ = 5;
const groundIdx = {};
for (let i = 0; i <= GTX; i++) for (let j = 0; j <= GTZ; j++) groundIdx[`${i},${j}`] = addVertex([G0 + (G1X - G0) * i / GTX, 0, G0 + (G1Z - G0) * j / GTZ]);
// maze lattice (c, r, h) -> (c*S, h*H, r*S)
const latIdx = {};
for (let c = 0; c <= N; c++) for (let r = 0; r <= N; r++) for (let h = 0; h <= F; h++) latIdx[`${c},${r},${h}`] = addVertex([c * S, h * H, r * S]);
const lat = (c, r, h) => latIdx[`${c},${r},${h}`];

const WALL_COLORS = { 1: [204, 176, 132], 2: [140, 170, 205], 3: [178, 150, 206] };
const RAMP_COLOR = [218, 120, 70], SLAB_COLOR = [184, 180, 170];
const GRASS = [[104, 158, 86], [92, 146, 78]];
const layerOfFloor = (f) => 2 * f - 1, layerOfSlab = (k) => 2 * k;   // slab k lies on top of floor k

for (let i = 0; i < GTX; i++) for (let j = 0; j < GTZ; j++) faces.push({
    pts: [groundIdx[`${i},${j}`], groundIdx[`${i + 1},${j}`], groundIdx[`${i + 1},${j + 1}`], groundIdx[`${i},${j + 1}`]],
    color: GRASS[(i + j) % 2], layer: 0,
});
for (let f = 1; f <= F; f++) {
    const { vwall, hwall } = maze[f];
    const lo = f - 1, hi = f, base = WALL_COLORS[f], layer = layerOfFloor(f);
    for (let c = 0; c <= N; c++) for (let r = 0; r < N; r++) if (vwall[c][r])
        faces.push({ pts: [lat(c, r, lo), lat(c, r + 1, lo), lat(c, r + 1, hi), lat(c, r, hi)], color: shade(base, 0.8), layer, wall: { f, x: c, r, kind: 'v' } });
    for (let c = 0; c < N; c++) for (let r = 0; r <= N; r++) if (hwall[c][r])
        faces.push({ pts: [lat(c, r, lo), lat(c + 1, r, lo), lat(c + 1, r, hi), lat(c, r, hi)], color: base, layer, wall: { f, z: r, c, kind: 'h' } });
}
for (const rp of RAMPS) faces.push({
    pts: [lat(lowX(rp), rp.r, rp.f - 1), lat(highX(rp), rp.r, rp.f), lat(highX(rp), rp.r + 1, rp.f), lat(lowX(rp), rp.r + 1, rp.f - 1)],
    color: RAMP_COLOR, layer: layerOfFloor(rp.f), ramp: rp,
});
// slabs: per row, runs of non-hole cells (kept <= 3 cells long so no slab
// polygon is much larger than a wall — keeps the per-layer sort honest)
const slabRects = [];
for (let k = 1; k < F; k++) for (let r = 0; r < N; r++) {
    let c = 0;
    while (c < N) {
        if (isHole(k + 1, c, r)) { c++; continue; }
        const start = c;
        while (c < N && c - start < 3 && !isHole(k + 1, c, r)) c++;
        faces.push({ pts: [lat(start, r, k), lat(c, r, k), lat(c, r + 1, k), lat(start, r + 1, k)], color: shade(SLAB_COLOR, (r + k) % 2 ? 0.95 : 1), layer: layerOfSlab(k) });
        slabRects.push({ k, c0: start, c1: c, r });
    }
}
const NL = 2 * F;   // layers 0..NL-1

// ============================================================
// physics playground (east of the maze)
// ============================================================
// Draw layers are separated by the planes y = k*H, so every playground face
// must lie within one height band: vertical faces are split at those planes,
// horizontal faces exactly on a plane go to that slab layer. Faces are also
// subdivided to <= 3 units per edge (keeps the per-layer depth sort honest).
// Colliders use the unsplit rectangles.
const pgRects = [];   // [p0, p1, p3] collider rectangles
function layerOfPts(ps) {
    const ys = ps.map(p => p[1]), lo = Math.min(...ys), hi = Math.max(...ys);
    if (hi - lo < 1e-9) {
        const k = lo / H;
        if (Math.abs(k - Math.round(k)) < 1e-9 && Math.round(k) >= 1 && Math.round(k) < F) return layerOfSlab(Math.round(k));
    }
    const band = Math.min(F - 1, Math.floor(lo / H + 1e-9));
    if (band < F - 1 && hi > (band + 1) * H + 1e-9) throw new Error('face crosses a layer plane: ' + JSON.stringify(ps));
    return layerOfFloor(band + 1);
}
const lerp3 = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
function quadFaces(p0, p1, p2, p3, color, n = null) {   // corners in order; bilinear subdivision; n = outward normal (one-sided) or null
    const nu = Math.max(1, Math.ceil(Math.hypot(...p1.map((v, i) => v - p0[i])) / 3 - 1e-9));
    const nv = Math.max(1, Math.ceil(Math.hypot(...p3.map((v, i) => v - p0[i])) / 3 - 1e-9));
    const idx = [];
    for (let i = 0; i <= nu; i++) {
        idx.push([]);
        for (let j = 0; j <= nv; j++) idx[i].push(addVertex(lerp3(lerp3(p0, p1, i / nu), lerp3(p3, p2, i / nu), j / nv)));
    }
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
        const pts = [idx[i][j], idx[i + 1][j], idx[i + 1][j + 1], idx[i][j + 1]];
        faces.push({ pts, color, n, layer: layerOfPts(pts.map(v => verts[v - 1])) });
    }
}
function rect(p0, p1, p2, p3, color, collide = true, n = null) {
    quadFaces(p0, p1, p2, p3, color, n);
    if (collide) pgRects.push([p0, p1, p3, n]);
}
function box(x0, x1, y0, y1, z0, z1, color) {
    // a box is a closed solid: all its faces are one-sided (back-face culled)
    rect([x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], color, true, [0, 1, 0]);
    if (y0 > 0) rect([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], shade(color, 0.7), true, [0, -1, 0]);
    const cuts = [y0];
    for (let k = Math.floor(y0 / H) + 1; k * H < y1 - 1e-9; k++) cuts.push(k * H);
    cuts.push(y1);
    const sides = [   // [a, b] horizontal edge of each side, shade
        [[x0, z0], [x1, z0], 0.9, [0, 0, -1]], [[x0, z1], [x1, z1], 0.9, [0, 0, 1]], [[x0, z0], [x0, z1], 0.78, [-1, 0, 0]], [[x1, z0], [x1, z1], 0.78, [1, 0, 0]],
    ];
    for (const [[ax, az], [bx, bz], k, nrm] of sides) {
        for (let i = 0; i + 1 < cuts.length; i++)
            quadFaces([ax, cuts[i], az], [bx, cuts[i], bz], [bx, cuts[i + 1], bz], [ax, cuts[i + 1], az], shade(color, k), nrm);
        pgRects.push([[ax, y0, az], [bx, y0, bz], [ax, y1, az], nrm]);
    }
}
function triangle(a, b, c, color) {
    const pts = [a, b, c].map(p => addVertex(p));
    faces.push({ pts, color, layer: layerOfPts([a, b, c]) });
}
const PG = {
    stairs: [236, 196, 92], platform: [150, 162, 178], slide: [232, 112, 104], tower: [118, 176, 150],
    parkour: [244, 152, 64], rail: [96, 96, 104], trough: [104, 150, 224], pillar: [206, 126, 206],
};
// stairs: 12 steps of 0.25 up to the platform (step-climbing test)
for (let i = 0; i < 12; i++) {
    const xa = 26 + 0.5 * i, xb = xa + 0.5, h0 = 0.25 * i, h1 = 0.25 * (i + 1);
    const c = shade(PG.stairs, i % 2 ? 0.94 : 1);
    rect([xa, h1, 1], [xb, h1, 1], [xb, h1, 3], [xa, h1, 3], c, true, [0, 1, 0]);             // tread
    rect([xa, h0, 1], [xa, h0, 3], [xa, h1, 3], [xa, h1, 1], shade(c, 0.8), true, [-1, 0, 0]);  // riser
    rect([xa, 0, 1], [xb, 0, 1], [xb, h1, 1], [xa, h1, 1], shade(c, 0.88), true, [0, 0, -1]); // side walls
    rect([xa, 0, 3], [xb, 0, 3], [xb, h1, 3], [xa, h1, 3], shade(c, 0.88), true, [0, 0, 1]);
}
box(32, 38, 0, 3, 0, 6, PG.platform);                                          // platform (top y=3)
rect([34, 3, 6], [37, 3, 6], [37, 0, 12], [34, 0, 12], PG.slide);             // slide 26.6 deg
// parkour blocks (+0.9 each) up to a railed tower (top y=6)
box(38.5, 39.5, 0, 3.9, 4.5, 5.5, PG.parkour);
box(40, 41, 0, 4.8, 4.5, 5.5, shade(PG.parkour, 0.92));
box(41.5, 42.5, 0, 5.7, 4.5, 5.5, PG.parkour);
box(42, 46, 0, 6, 0, 4, PG.tower);
rect([42, 6, 0], [46, 6, 0], [46, 6.6, 0], [42, 6.6, 0], PG.rail);            // railings
rect([46, 6, 0], [46, 6, 4], [46, 6.6, 4], [46, 6.6, 0], shade(PG.rail, 0.85));
// V-trough (balls roll back and forth: restitution/friction on slopes)
for (const [za, zb] of [[15, 18], [18, 21]]) {
    rect([25, 2, za], [29, 0, za], [29, 0, zb], [25, 2, zb], PG.trough);
    rect([29, 0, za], [33, 2, za], [33, 2, zb], [29, 0, zb], shade(PG.trough, 0.85));
}
for (const z of [15, 21]) {
    triangle([25, 2, z], [29, 0, z], [33, 2, z], shade(PG.trough, 0.7));
    pgRects.push([[25, 0, z], [33, 0, z], [25, 2, z]]);
}
// pillar field (the slide feeds balls into it)
for (const px of [36, 39, 42, 45]) for (const pz of [15, 18, 21]) box(px - 0.3, px + 0.3, 0, 2.4, pz - 0.3, pz + 0.3, shade(PG.pillar, 0.9 + 0.1 * ((px + pz) % 2)));
faces.sort((a, b) => a.layer - b.layer);   // stable: layer-contiguous face ranges
const NSTATIC_F = faces.length;
const layerF0 = [], layerF1 = [];
for (let L = 0; L < NL; L++) {
    const idx = faces.map((f, i) => f.layer === L ? i + 1 : 0).filter(Boolean);
    layerF0.push(idx.length ? idx[0] : 1);
    layerF1.push(idx.length ? idx[idx.length - 1] : 0);
}
for (const o of dyn) { o.fstart = faces.length + 1; faces.push(...o.dfaces); o.fend = faces.length; }

// ============================================================
// PVS: ray-sampled cell-to-face visibility
// ============================================================
// Occluders: maze walls (vertical rectangles on grid lines) and slab
// pieces (y = k*H, everything inside the maze but the holes). Ramps and
// the ground are not treated as occluders (conservative: never hides a
// face that could be seen). A face is in a cell's PVS if any ray from a
// sample eye position in the cell reaches any sample point on the face.
const EPS = 1e-7;
function blocked(a, b, skip) {
    const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const T1 = 1 - 1e-6;
    // vertical walls on x = c*S
    if (Math.abs(d[0]) > EPS) {
        const c0 = Math.min(a[0], b[0]) / S, c1 = Math.max(a[0], b[0]) / S;
        for (let c = Math.ceil(c0); c <= Math.floor(c1) && c <= N; c++) {
            if (c < 0) continue;
            const t = (c * S - a[0]) / d[0];
            if (t <= 1e-6 || t >= T1) continue;
            const z = a[2] + t * d[2], y = a[1] + t * d[1];
            const rr = z / S, ff = y / H;
            const r = Math.floor(rr), f = Math.floor(ff) + 1;
            if (r < 0 || r >= N || f < 1 || f > F) continue;
            if (rr - r < 1e-4 || r + 1 - rr < 1e-4) continue;   // seam: treat as open (conservative)
            if (maze[f].vwall[c][r] && !(skip && skip.kind === 'v' && skip.f === f && skip.x === c && skip.r === r)) return true;
        }
    }
    if (Math.abs(d[2]) > EPS) {
        const r0 = Math.min(a[2], b[2]) / S, r1 = Math.max(a[2], b[2]) / S;
        for (let r = Math.ceil(r0); r <= Math.floor(r1) && r <= N; r++) {
            if (r < 0) continue;
            const t = (r * S - a[2]) / d[2];
            if (t <= 1e-6 || t >= T1) continue;
            const x = a[0] + t * d[0], y = a[1] + t * d[1];
            const cc = x / S, ff = y / H;
            const c = Math.floor(cc), f = Math.floor(ff) + 1;
            if (c < 0 || c >= N || f < 1 || f > F) continue;
            if (cc - c < 1e-4 || c + 1 - cc < 1e-4) continue;
            if (maze[f].hwall[c][r] && !(skip && skip.kind === 'h' && skip.f === f && skip.z === r && skip.c === c)) return true;
        }
    }
    // slabs at y = k*H
    if (Math.abs(d[1]) > EPS) {
        for (let k = 1; k < F; k++) {
            const t = (k * H - a[1]) / d[1];
            if (t <= 1e-6 || t >= T1) continue;
            const x = a[0] + t * d[0], z = a[2] + t * d[2];
            if (x <= 1e-4 || z <= 1e-4 || x >= N * S - 1e-4 || z >= N * S - 1e-4) continue;
            const c = Math.floor(x / S), r = Math.floor(z / S);
            if (isHole(k + 1, c, r)) continue;
            return true;
        }
    }
    return false;
}
function faceSamples(face) {
    const p = face.pts.map(i => verts[i - 1]);
    if (p.length === 3) p.push(p[2]);
    const out = [];
    const T = face.layer === 0 ? [0.02, 0.2, 0.4, 0.6, 0.8, 0.98] : [0.04, 0.35, 0.65, 0.96];
    for (const s of T) for (const t of T) {
        const a = p[0].map((v, k) => v + (p[1][k] - v) * s);
        const b = p[3].map((v, k) => v + (p[2][k] - v) * s);
        out.push(a.map((v, k) => v + (b[k] - v) * t));
    }
    return out;
}
const PV = { x0: G0, z0: G0, cs: S, nx: (G1X - G0) / S, nz: (G1Z - G0) / S };
const rampAt = (c, r) => RAMPS.find(rp => rp.c === c && rp.r === r);
// Eye heights: standing eye (1.05 above a floor) up to the highest a flying
// player's eye gets below the next slab (2.85); band F = anywhere above the
// top floor up to the ceiling.
function eyeSamples(ix, iz, band, coarse = false) {
    const x0 = PV.x0 + ix * S, z0 = PV.z0 + iz * S;
    const c = Math.floor(x0 / S), r = Math.floor(z0 / S);
    const inMaze = c >= 0 && c < N && r >= 0 && r < N;
    const O = coarse || band === F ? [0.27, 1.5, 2.74] : [0.27, 1.13, 1.91, 2.74];
    const out = [];
    const rp = inMaze ? rampAt(c, r) : null;
    for (const ox of O) for (const oz of O) {
        const x = x0 + ox, z = z0 + oz;
        let hs;
        if (rp && (band === rp.f - 1 || band === rp.f)) {
            // on the ramp: surface height from its low edge
            const u = Math.abs(x - lowX(rp) * S) / S;
            const ys = (rp.f - 1) * H + u * H;
            hs = [1.3, 2.1, 2.9].map(d => ys + d);
        } else if (band === F) hs = [9.6, 11, 14, 19, 25, CEIL - 0.3];
        else hs = [1.05, 1.9, 2.8].map(d => band * H + d);
        if (coarse) hs = [hs[0], hs[hs.length - 1]];
        for (const y of hs) out.push([x, y, z]);
    }
    return out;
}
const t0 = Date.now();
const samplesOf = faces.slice(0, NSTATIC_F).map(faceSamples);
const nCells = PV.nx * PV.nz * (F + 1);
const pvsCstart = [], pvsCcnt = [], pvsCitems = [];
const pvsValid = [], pvsFstart = [], pvsFcnt = [], pvsFitems = [], pvsVstart = [], pvsVcnt = [], pvsVitems = [];
let totalVis = 0, validCells = 0;
for (let band = 0; band <= F; band++) for (let iz = 0; iz < PV.nz; iz++) for (let ix = 0; ix < PV.nx; ix++) {
    const x0 = PV.x0 + ix * S, z0 = PV.z0 + iz * S;
    const valid = true;   // the player can fly anywhere
    pvsValid.push(valid ? 1 : 0);
    const perLayer = Array.from({ length: NL }, () => []);
    if (valid) {
        const eyes = eyeSamples(ix, iz, band);
        for (let fi = 0; fi < NSTATIC_F; fi++) {
            const face = faces[fi];
            let vis = false;
            for (let e = 0; !vis && e < eyes.length; e++) for (const sp of samplesOf[fi]) {
                if (!blocked(eyes[e], sp, face.wall)) { vis = true; break; }
            }
            if (vis) perLayer[face.layer].push(fi + 1);
        }
    }
    // presort far-to-near from the cell's central eye point: the runtime
    // insertion sort then mostly finds faces already in place
    const cx = x0 + S / 2, cz = z0 + S / 2, cy = band < F ? band * H + 1.9 : 14;
    const cen = (fi) => { const p = faces[fi - 1].pts.map(i => verts[i - 1]); return [0, 1, 2].map(a => p.reduce((t, q) => t + q[a], 0) / p.length); };
    const dist = (fi) => { const c = cen(fi); return Math.hypot(c[0] - cx, c[1] - cy, c[2] - cz); };
    for (const l of perLayer) l.sort((a, b) => dist(b) - dist(a));
    // cell-to-cell visibility (for dynamic objects): target bands 0..F
    // (band F = above the maze); neighbors always count as visible
    const citems = [];
    if (valid) {
        const eyes = eyeSamples(ix, iz, band, true);
        for (let tb = 0; tb <= F; tb++) for (let tz = 0; tz < PV.nz; tz++) for (let tx = 0; tx < PV.nx; tx++) {
            const tid = tx + PV.nx * (tz + PV.nz * tb) + 1;
            if (Math.abs(tx - ix) <= 1 && Math.abs(tz - iz) <= 1 && Math.abs(tb - band) <= 1) { citems.push(tid); continue; }
            const bx = PV.x0 + tx * S, bz = PV.z0 + tz * S;
            const hs = tb < F ? [tb * H + 0.45, tb * H + 1.5, tb * H + 2.6] : [F * H + 0.5, F * H + 2.5, F * H + 5];
            const pts = [];
            for (const [ox, oz] of [[0.1, 0.1], [2.9, 0.1], [0.1, 2.9], [2.9, 2.9], [1.5, 1.5]]) for (const y of hs) pts.push([bx + ox, y, bz + oz]);
            let vis = false;
            for (let e = 0; !vis && e < eyes.length; e++) for (const q of pts) if (!blocked(eyes[e], q, null)) { vis = true; break; }
            if (vis) citems.push(tid);
        }
    }
    pvsCstart.push(pvsCitems.length + 1); pvsCcnt.push(citems.length); pvsCitems.push(...citems);
    const vset = new Set();
    for (let L = 0; L < NL; L++) {
        pvsFstart.push(pvsFitems.length + 1);
        pvsFcnt.push(perLayer[L].length);
        pvsFitems.push(...perLayer[L]);
        for (const fi of perLayer[L]) for (const v of faces[fi - 1].pts) vset.add(v);
    }
    const vs = [...vset].sort((a, b) => a - b);
    pvsVstart.push(pvsVitems.length + 1);
    pvsVcnt.push(vs.length);
    pvsVitems.push(...vs);
    if (valid) { validCells++; totalVis += perLayer.reduce((a, l) => a + l.length, 0); }
}
console.log(`PVS: ${validCells} cells, avg ${(totalVis / validCells).toFixed(1)} of ${NSTATIC_F} static faces visible, ${Date.now() - t0} ms`);

// ============================================================
// clusters: static faces grouped per draw layer and 3x3x3 cell (<= CL_MAX
// faces each). Each cluster gets its own contiguous face range and its own
// (duplicated) contiguous vertex range, so the runtime can frustum-test it
// by its bounding sphere and project it with one e83g(v0, v1) call. The PVS
// then lists clusters instead of faces (a cluster is in a cell's PVS if any
// of its faces is).
// ============================================================
const CL_MAX = 10;
const groups = new Map();
for (let fi = 0; fi < NSTATIC_F; fi++) {
    const f = faces[fi], p = f.pts.map(i => verts[i - 1]);
    const c = [0, 1, 2].map(a => p.reduce((t, q) => t + q[a], 0) / p.length);
    const key = `${f.layer}|${Math.floor(c[0] / S)}|${Math.floor(c[2] / S)}|${Math.floor(c[1] / H)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(fi);
}
const clusters = [];
for (const fl of groups.values()) for (let i = 0; i < fl.length; i += CL_MAX) clusters.push({ layer: faces[fl[0]].layer, faces: fl.slice(i, i + CL_MAX) });
clusters.sort((a, b) => a.layer - b.layer);
const clusterOfFace = new Array(NSTATIC_F);
{
    const newVerts = verts.slice(0, DYN_V), newBase = baseVerts.slice(0, DYN_V), newStatic = [];
    clusters.forEach((cl, ci) => {
        const vmap = new Map();
        cl.f0 = newStatic.length + 1; cl.v0 = newVerts.length + 1;
        for (const fi of cl.faces) {
            const f = faces[fi];
            const pts = f.pts.map(v => {
                if (!vmap.has(v)) { newVerts.push(verts[v - 1]); newBase.push(verts[v - 1]); vmap.set(v, newVerts.length); }
                return vmap.get(v);
            });
            clusterOfFace[fi] = ci + 1;
            newStatic.push({ ...f, pts });
        }
        cl.f1 = newStatic.length; cl.v1 = newVerts.length;
        const ps = newVerts.slice(cl.v0 - 1, cl.v1);
        const mn = [0, 1, 2].map(a => Math.min(...ps.map(q => q[a]))), mx = [0, 1, 2].map(a => Math.max(...ps.map(q => q[a])));
        cl.c = mn.map((v, a) => (v + mx[a]) / 2);
        cl.r = Math.max(...ps.map(q => Math.hypot(q[0] - cl.c[0], q[1] - cl.c[1], q[2] - cl.c[2]))) + 0.01;
    });
    faces.splice(0, NSTATIC_F, ...newStatic);
    verts.length = 0; verts.push(...newVerts);
    baseVerts.length = 0; baseVerts.push(...newBase);
    layerF0.length = 0; layerF1.length = 0;
    for (let L = 0; L < NL; L++) {
        const cs = clusters.filter(c => c.layer === L);
        layerF0.push(cs.length ? cs[0].f0 : 1);
        layerF1.push(cs.length ? cs[cs.length - 1].f1 : 0);
    }
    // PVS face lists -> cluster lists, presorted far-to-near from the cell center
    const cf = [], cc = [], ci2 = [];
    let tot = 0;
    for (let pi = 0; pi < pvsFstart.length; pi++) {
        const cell = Math.floor(pi / NL);
        const band = Math.floor(cell / (PV.nx * PV.nz)), iz = Math.floor(cell / PV.nx) % PV.nz, ix = cell % PV.nx;
        const ctr = [PV.x0 + ix * S + S / 2, band < F ? band * H + 1.9 : 14, PV.z0 + iz * S + S / 2];
        const set = new Set(pvsFitems.slice(pvsFstart[pi] - 1, pvsFstart[pi] - 1 + pvsFcnt[pi]).map(f => clusterOfFace[f - 1]));
        const list = [...set].sort((a, b) => Math.hypot(...clusters[b - 1].c.map((v, k) => v - ctr[k])) - Math.hypot(...clusters[a - 1].c.map((v, k) => v - ctr[k])));
        cf.push(ci2.length + 1); cc.push(list.length); ci2.push(...list);
        tot += list.length;
    }
    pvsFstart.length = 0; pvsFstart.push(...cf);
    pvsFcnt.length = 0; pvsFcnt.push(...cc);
    pvsFitems.length = 0; pvsFitems.push(...ci2);
    console.log(`clusters: ${clusters.length} (avg ${(NSTATIC_F / clusters.length).toFixed(1)} faces, static vertices ${verts.length - DYN_V}); PVS avg ${(tot / validCells).toFixed(1)} clusters per cell`);
}

// ============================================================
// physics world
// ============================================================
const cols = [];
const vsub = (a, b) => a.map((v, i) => v - b[i]);
const vlen = (a) => Math.hypot(...a);
const vcross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
// rectangle with corners p0, p1 (= p0 + u), p3 (= p0 + w); `outward` given =
// one-sided (a face of a solid), its normal oriented outward
function addRect(p0, p1, p3, outward = null) {
    const eu = vsub(p1, p0), ew = vsub(p3, p0);
    const lu = vlen(eu), lw = vlen(ew);
    const u = eu.map(v => v / lu), w = ew.map(v => v / lw);
    let n = vcross(u, w).map((v, _, a) => v / vlen(a));
    if (outward && n[0] * outward[0] + n[1] * outward[1] + n[2] * outward[2] < 0) n = n.map(v => -v);
    cols.push({
        c: p0.map((v, i) => v + eu[i] / 2 + ew[i] / 2), n, u, w, hu: lu / 2, hw: lw / 2, oneSided: outward ? 1 : 0,
        corners: [p0, p1, p3, p1.map((v, i) => v + ew[i])],
    });
}
const P3 = (c, r, h) => [c * S, h * H, r * S];
addRect([G0, 0, G0], [G1X, 0, G0], [G0, 0, G1Z], [0, 1, 0]);   // ground (one-sided, up)
for (let f = 1; f <= F; f++) {
    const { vwall, hwall } = maze[f];
    for (let c = 0; c <= N; c++) for (let r = 0; r < N; r++) if (vwall[c][r]) addRect(P3(c, r, f - 1), P3(c, r, f), P3(c, r + 1, f - 1));
    for (let c = 0; c < N; c++) for (let r = 0; r <= N; r++) if (hwall[c][r]) addRect(P3(c, r, f - 1), P3(c, r, f), P3(c + 1, r, f - 1));
}
for (const s of slabRects) addRect(P3(s.c0, s.r, s.k), P3(s.c1, s.r, s.k), P3(s.c0, s.r + 1, s.k));
for (const rp of RAMPS) addRect(P3(lowX(rp), rp.r, rp.f - 1), P3(highX(rp), rp.r, rp.f), P3(lowX(rp), rp.r + 1, rp.f - 1));
for (const [p0, p1, p3, n] of pgRects) addRect(p0, p1, p3, n);   // playground
// invisible world boundary + ceiling
const BT = CEIL;
addRect([G0, 0, G0], [G0, BT, G0], [G0, 0, G1Z]); addRect([G1X, 0, G0], [G1X, BT, G0], [G1X, 0, G1Z]);
addRect([G0, 0, G0], [G0, BT, G0], [G1X, 0, G0]); addRect([G0, 0, G1Z], [G0, BT, G1Z], [G1X, 0, G1Z]);
addRect([G0, CEIL, G0], [G1X, CEIL, G0], [G0, CEIL, G1Z]);

// uniform grid; each collider goes in every cell its AABB grown by RMAX touches
const RMAX = 0.65;
const GRID = { x0: G0 - 1, y0: -3, z0: G0 - 1, cs: 3 };
GRID.nx = Math.ceil((G1X + 1 - GRID.x0) / GRID.cs); GRID.nz = Math.ceil((G1Z + 1 - GRID.z0) / GRID.cs); GRID.ny = Math.ceil((BT - GRID.y0) / GRID.cs);
// spatial hash (same function as the engine): cell -> bucket in a fixed
// table of <= 5000 buckets, independent of the world size
const cellRegs = new Map();
cols.forEach((col, ci) => {
    const mn = [0, 1, 2].map(a => Math.min(...col.corners.map(p => p[a])) - RMAX);
    const mx = [0, 1, 2].map(a => Math.max(...col.corners.map(p => p[a])) + RMAX);
    const o = [GRID.x0, GRID.y0, GRID.z0];
    const lo = mn.map((v, a) => Math.floor((v - o[a]) / GRID.cs));
    const hi = mx.map((v, a) => Math.floor((v - o[a]) / GRID.cs));
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
const used = buckets.filter(b => b.size);
console.log(`colliders ${cols.length}, ${cellRegs.size} occupied cells hashed into ${TSIZE} buckets, avg ${(gridItems.length / used.length).toFixed(1)} / max ${Math.max(...buckets.map(b => b.size))} colliders per bucket, ${gridItems.length} registrations`);

// bodies: 1 = player, then balls (registry objects 2..)
const START = [N * S + 4, 0.6, ENTRANCE.row * S + S / 2];
const EYE = 0.45;
const bodies = [{ p: START, r: 0.6, im: 0.5, e: 0, f: 0, ch: 1, obj: 0 }];
BALLS.forEach((b, i) => bodies.push({ p: b.p, r: BALL_R, im: 1, e: 0.55, f: 0.015, ch: 0, obj: i + 2 }));

// ============================================================
// write lists / variables
// ============================================================
const V = verts.length, NF = faces.length;
setList('3d_x', verts.map(p => p[0])); setList('3d_y', verts.map(p => p[1])); setList('3d_z', verts.map(p => p[2]));
setList('base_x', baseVerts.map(p => p[0])); setList('base_y', baseVerts.map(p => p[1])); setList('base_z', baseVerts.map(p => p[2]));
setList('t_x', Array(V).fill(0)); setList('t_y', Array(V).fill(0));
setList('view_z', Array(V).fill(0)); setList('scr_code', Array(V).fill(0)); setList('proj_stamp', Array(V).fill(0));
for (const unused of ['view_x', 'view_y', 'dot_dis']) setList(unused, []);
setList('face__', []);
for (let k = 1; k <= 5; k++) setList('face_p' + k, faces.map(f => f.pts[k - 1] ?? f.pts[0]));
setList('face_', faces.map(f => f.pts.length));
setList('orders', faces.map((_, i) => i + 1));
setList('face_dis', faces.map(() => 0));
setList('face_r', faces.map(f => f.color[0])); setList('face_g', faces.map(f => f.color[1])); setList('face_b', faces.map(f => f.color[2]));
setList('face_allvalid', faces.map(() => 0));
setList('face_1s', faces.map(f => f.n ? 1 : 0));
setList('face_zb', faces.map(() => 0));
setList('face_por', faces.map(() => 0));
setList('face_nx', faces.map(f => f.n ? f.n[0] : 0)); setList('face_ny', faces.map(f => f.n ? f.n[1] : 0)); setList('face_nz', faces.map(f => f.n ? f.n[2] : 0));
console.log(`one-sided (back-face culled) faces: ${faces.filter(f => f.n).length} of ${faces.length}`);

setVarValue('n_floors', F); setVarValue('floor_h', H);
setList('layer_f0', layerF0); setList('layer_f1', layerF1);
setVarValue('static_v0', DYN_V + 1); setVarValue('static_v1', V);
setVarValue('pvs_x0', PV.x0); setVarValue('pvs_z0', PV.z0); setVarValue('pvs_cs', PV.cs); setVarValue('pvs_nx', PV.nx); setVarValue('pvs_nz', PV.nz);
setVarValue('pvs_ok', 0); setVarValue('pvs_cell', 1);
// packed PVS stream (layout documented in the engine): directory, then per
// valid cell: visible-cell runs, vertices, per-layer faces
{
    const units = [], dir = new Array(nCells).fill(0);
    let runsTotal = 0;
    for (let c = 0; c < nCells; c++) {
        if (!pvsValid[c]) continue;
        dir[c] = units.length + 1;
        let citems = pvsCitems.slice(pvsCstart[c] - 1, pvsCstart[c] - 1 + pvsCcnt[c]);
        const T = PV.nx * PV.nz * (F + 1);
        const inv = citems.length > T / 2 ? 1 : 0;   // store the invisible cells instead
        if (inv) { const vis = new Set(citems); citems = []; for (let t = 1; t <= T; t++) if (!vis.has(t)) citems.push(t); }
        const runs = [];
        for (const t of citems) {
            const last = runs[runs.length - 1];
            if (last && last[0] + last[1] === t) last[1]++; else runs.push([t, 1]);
        }
        runsTotal += runs.length;
        units.push(runs.length, inv, ...runs.flat());
        for (let L = 0; L < NL; L++) {
            const pi = c * NL + L;
            units.push(pvsFcnt[pi], ...pvsFitems.slice(pvsFstart[pi] - 1, pvsFstart[pi] - 1 + pvsFcnt[pi]));
        }
    }
    const digits = String(units.reduce((a, b) => Math.max(a, b), 0)).length;
    const K = Math.floor(15 / digits), B = 10 ** digits;   // K digit groups per item, < 2^53
    const words = [];
    for (let i = 0; i < units.length; i += K) {
        let w = 0;
        for (let j = K - 1; j >= 0; j--) w = w * B + (units[i + j] ?? 0);
        words.push(w);
    }
    setPaged('pvs_store', words);
    setPaged('pvs_dir', dir);
    setVarValue('pk_base', B); setVarValue('pk_k', K);
    setList('pk_pow', Array.from({ length: K }, (_, j) => B ** j));
    setPaged('cell_mark', Array(PV.nx * PV.nz * (F + 1)).fill(0));
    for (const n of ['cur_fstart', 'cur_fcnt', 'cur_fitems']) setList(n, []);
    setVarValue('mark_stamp', 0); setVarValue('cur_inv', 0);
    for (const [n, fn] of [['cl_f0', c => c.f0], ['cl_f1', c => c.f1], ['cl_v0', c => c.v0], ['cl_v1', c => c.v1],
        ['cl_cx', c => c.c[0]], ['cl_cy', c => c.c[1]], ['cl_cz', c => c.c[2]], ['cl_r', c => c.r], ['cl_vis', () => 0]]) setList(n, clusters.map(fn));
    setVarValue('ph_fly', 0); setVarValue('ball_render', 1); setVarValue('ball_phys', 1); setVarValue('kb_prev', 0); setVarValue('kn_prev', 0); setVarValue('sp_prev', 0); setVarValue('sp_last', -10); setVarValue('fly_label', '');
    setVarValue('loaded_cell', 0); setVarValue('cur_valid', 0);
    console.log(`PVS store: ${units.length} units (cell visibility ${pvsCitems.length} items -> ${runsTotal} runs), ${K} per item -> ${words.length} items in ${Math.ceil(words.length / PAGE)} page(s)`);
}

setVarValue('n_dyn', dyn.length);
setList('obj_vstart', dyn.map(o => o.vstart)); setList('obj_vend', dyn.map(o => o.vend));
setList('obj_fstart', dyn.map(o => o.fstart)); setList('obj_fend', dyn.map(o => o.fend));
setList('obj_x', dyn.map(o => o.pos[0])); setList('obj_y', dyn.map(o => o.pos[1])); setList('obj_z', dyn.map(o => o.pos[2]));
setList('obj_movable', dyn.map(() => 1));
setList('obj_ball', dyn.map((_, i) => bodies.some(b => b.obj === i + 1) ? 1 : 0));
setList('obj_hidden', dyn.map(() => 0));
setList('obj_level', dyn.map(() => 0));
setList('act_o', dyn.map((_, i) => i + 1));   // no chambers here: everything is active
setList('obj_vis', dyn.map(() => 1));
setList('obj_rad', dyn.map(o => o.rad));
setList('obj_moved', dyn.map(() => 1));
for (const n of ['obj_lx', 'obj_ly', 'obj_lz']) setList(n, dyn.map(() => 'none'));
setList('cam_prev', Array(12).fill('none'));
setVarValue('anim_obj', 1);
setVarValue('anim_cx', DECOR.cx); setVarValue('anim_cy', DECOR.cy); setVarValue('anim_cz', DECOR.cz); setVarValue('anim_r', DECOR.orbit);
setVarValue('max_dis', 55);

const colList = (name, fn) => setList(name, cols.map(fn));
colList('col_cx', c => c.c[0]); colList('col_cy', c => c.c[1]); colList('col_cz', c => c.c[2]);
colList('col_nx', c => c.n[0]); colList('col_ny', c => c.n[1]); colList('col_nz', c => c.n[2]);
colList('col_ux', c => c.u[0]); colList('col_uy', c => c.u[1]); colList('col_uz', c => c.u[2]);
colList('col_wx', c => c.w[0]); colList('col_wy', c => c.w[1]); colList('col_wz', c => c.w[2]);
colList('col_hu', c => c.hu); colList('col_hw', c => c.hw); colList('col_1s', c => c.oneSided);
colList('col_on', () => 1); colList('col_portal', () => 0); colList('col_tf0', () => 1); colList('col_tfn', () => 0);
setList('col_tiles', []);
for (const [k, v] of Object.entries(GRID)) setVarValue('grid_' + k, v);
setList('grid_start', gridStart); setList('grid_cnt', gridCnt); setPaged('grid_items', gridItems);
setVarValue('grid_tsize', TSIZE);
setVarValue('ph_rmax', RMAX);
setVarValue('ph_eye', EYE);
setVarValue('ph_nb', bodies.length);
setVarValue('ph_spawnx', START[0]); setVarValue('ph_spawny', START[1]); setVarValue('ph_spawnz', START[2]);
const bl = (name, fn) => setList(name, bodies.map(fn));
bl('b_x', b => b.p[0]); bl('b_y', b => b.p[1]); bl('b_z', b => b.p[2]);
bl('b_vx', () => 0); bl('b_vy', () => 0); bl('b_vz', () => 0);
bl('b_r', b => b.r); bl('b_im', b => b.im); bl('b_e', b => b.e); bl('b_f', b => b.f);
bl('b_char', b => b.ch); bl('b_gnd', () => 0); bl('b_sleep', () => 0); bl('b_still', () => 0); bl('b_obj', b => b.obj);
setList('act_b', bodies.map((_, i) => i + 1));

// reset(): camera start = player eye; near plane 0.2 (the player's body
// keeps the eye >= 0.5 from any wall, so a close near plane is safe and
// avoids clipping nearby walls away)
{
    const ydux = project.functions.find(f => f.id === 'ydux');
    const content = JSON.parse(ydux.content);
    const all = [];
    (function walk(n) { if (Array.isArray(n)) n.forEach(walk); else if (n && typeof n === 'object') { all.push(n); for (const k in n) walk(n[k]); } })(content);
    const setCam = (list, value) => {
        const b = all.find(x => x.type === 'change_value_list_index' && x.params[0] === list && x.params[1]?.params?.[0] === '17');
        b.params[2] = { ...b.params[2], params: [String(value)] };
    };
    setCam('p604', START[0]); setCam('woyc', START[1] + EYE); setCam('23s0', START[2]);
    const nel = all.find(x => x.type === 'set_variable' && x.params[0] === 'nelz');
    nel.params[1] = { ...nel.params[1], params: ['0.2'] };
    ydux.content = JSON.stringify(content);
}

// sky-blue backdrop (= fog color)
{
    const bg = project.objects.find(o => o.name === 'background');
    const pic = bg.sprite.pictures[0];
    await sharp({ create: { width: pic.dimension.width, height: pic.dimension.height, channels: 3, background: { r: 135, g: 206, b: 235 } } })
        .png().toFile(path.join(workDir, 'temp', pic.fileurl.replace(/^temp\//, '')));
}

assertListSizes();
fs.writeFileSync(projectPath, JSON.stringify(project));
const outTar = path.join(workDir, 'out.tar');
cp.execSync(`tar -cf "${outTar}" -C "${workDir}" temp`);
fs.writeFileSync(OUT, zlib.gzipSync(fs.readFileSync(outTar), { level: 9 }));
fs.rmSync(workDir, { recursive: true, force: true });
console.log('wrote', OUT);
console.log(`playground: ${pgRects.length} collider rects; one-sided colliders ${cols.filter(c => c.oneSided).length} of ${cols.length}; bodies ${bodies.length}`);
console.log(`vertices ${V} (dynamic ${DYN_V}), faces ${NF} (static ${NSTATIC_F}); layer face ranges ${layerF0.map((a, i) => `${a}-${layerF1[i]}`).join(' ')}`);

if (process.env.MAZE_MAP) {
    for (let f = 1; f <= F; f++) {
        const { vwall, hwall } = maze[f];
        console.log(`\nfloor ${f}  (R = ramp up, O = hole down)`);
        for (let r = 0; r <= N; r++) {
            let line = '';
            for (let c = 0; c < N; c++) line += '+' + (hwall[c][r] ? '---' : '   ');
            console.log(line + '+');
            if (r === N) break;
            line = '';
            for (let c = 0; c <= N; c++) {
                line += vwall[c][r] ? '|' : ' ';
                if (c < N) line += RAMPS.some(rp => rp.f === f && rp.c === c && rp.r === r) ? ' R ' : isHole(f, c, r) ? ' O ' : '   ';
            }
            console.log(line);
        }
    }
}
