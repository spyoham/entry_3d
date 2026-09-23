#!/usr/bin/env node
// Build the 10x10x2 open-roof maze scene on top of the engine produced by
// transform-3dv1.mjs.
//
//  - two maze levels (perfect mazes, seeded DFS), walls 3 high, cells 3 wide
//  - a floor slab between the levels with two holes, each with a ramp
//  - entrance on level 1 (east side), exit on level 2 (west side)
//  - grid-shared vertices: every wall/slab/ramp corner is a lattice point
//    (c, r, h) shared by all faces that touch it
//  - faces grouped into draw layers (ground / level 1 / slab / level 2) and
//    into 5x5-cell quadrant chunks for frustum culling
//  - one animated dodecahedron floating above the maze center
//
// Usage: node maze-scene.mjs <engine.ent> <out.ent>

import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import cp from 'node:child_process';
import sharp from 'sharp';

const [, , IN, OUT] = process.argv;
const workDir = path.join(path.dirname(IN), '.maze-tmp');
fs.rmSync(workDir, { recursive: true, force: true });
fs.mkdirSync(workDir, { recursive: true });
fs.writeFileSync(path.join(workDir, 'a.tar'), zlib.gunzipSync(fs.readFileSync(IN)));
cp.execSync(`tar -xf "${path.join(workDir, 'a.tar')}" -C "${workDir}"`);
const projectPath = path.join(workDir, 'temp', 'project.json');
const project = JSON.parse(fs.readFileSync(projectPath, 'utf8'));

const findList = (name) => {
    const l = project.variables.find(v => v.variableType === 'list' && v.name === name);
    if (!l) throw new Error('list not found: ' + name);
    return l;
};
const setList = (name, values) => {
    const l = findList(name);
    l.array = values.map((v, i) => ({ id: `${l.id}_${i}`, data: String(v) }));
};
const setVarValue = (name, value) => {
    const v = project.variables.find(x => x.variableType === 'variable' && x.name === name);
    if (!v) throw new Error('variable not found: ' + name);
    v.value = value;
};

// ============================================================
// parameters
// ============================================================
const N = 10;        // cells per side
const S = 3;         // cell size
const H = 3;         // level height (wall height)
const SEED = 20260918;
const RAMPS = [      // cell + the direction the ramp rises toward
    { c: 2, r: 7, dir: +1 }, // rises toward +x
    { c: 7, r: 2, dir: -1 }, // rises toward -x
];
const ENTRANCE = { level: 1, row: 4 };  // east border (x = N*S)
const EXIT = { level: 2, row: 5 };      // west border (x = 0)

function mulberry32(a) {
    return () => {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// vwall[c][r]: wall on line x=c between z=r..r+1 (c in 0..N, r in 0..N-1)
// hwall[c][r]: wall on line z=r between x=c..c+1 (c in 0..N-1, r in 0..N)
function generateMaze(rand) {
    const vwall = Array.from({ length: N + 1 }, () => Array(N).fill(true));
    const hwall = Array.from({ length: N }, () => Array(N + 1).fill(true));
    const seen = Array.from({ length: N }, () => Array(N).fill(false));
    const stack = [[0, 0]];
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
const rand = mulberry32(SEED);
const maze = { 1: generateMaze(rand), 2: generateMaze(rand) };

// openings: entrance/exit, and ramp access (low end on level 1, high end on level 2)
maze[ENTRANCE.level].vwall[N][ENTRANCE.row] = false;
maze[EXIT.level].vwall[0][EXIT.row] = false;
for (const { c, r, dir } of RAMPS) {
    if (dir > 0) { maze[1].vwall[c][r] = false; maze[2].vwall[c + 1][r] = false; }
    else { maze[1].vwall[c + 1][r] = false; maze[2].vwall[c][r] = false; }
}
const isHole = (c, r) => RAMPS.some(h => h.c === c && h.r === r);

// ============================================================
// vertices
// ============================================================
const verts = [];           // world positions
const baseVerts = [];       // object-local (only differs for the dodecahedron)
function addVertex(p, base = p) { verts.push(p); baseVerts.push(base); return verts.length; }

// 1) dodecahedron first — vertices 1..20 are the only per-frame-moving ones
const DODECA = { cx: 15, cy: 7.5, cz: 15, r: 3, scale: 1.1 };
{
    const X = [-0.618, 0.618, -1, -1, 1, 1, 0, 0, -1.618, -1.618, 1.618, 1.618, 0, 0, -1, -1, 1, 1, -0.618, 0.618];
    const Y = [0, 0, 1, -1, 1, -1, 1.618, -1.618, 0.618, -0.618, 0.618, -0.618, 1.618, -1.618, 1, -1, 1, -1, 0, 0];
    const Z = [1.618, 1.618, 1, 1, 1, 1, 0.618, 0.618, 0, 0, 0, 0, -0.618, -0.618, -1, -1, -1, -1, -1.618, -1.618];
    for (let i = 0; i < 20; i++) {
        const local = [X[i] * DODECA.scale, Y[i] * DODECA.scale, Z[i] * DODECA.scale];
        addVertex([local[0] + DODECA.cx + DODECA.r, local[1] + DODECA.cy, local[2] + DODECA.cz], local);
    }
}
const DYN_VEND = verts.length; // 20
const DODECA_FACES = [
    [3, 1, 2, 5, 7], [1, 2, 6, 8, 4], [1, 3, 9, 10, 4], [2, 5, 11, 12, 6],
    [3, 9, 15, 13, 7], [4, 8, 14, 16, 10], [5, 7, 13, 17, 11], [6, 8, 14, 18, 12],
    [9, 15, 19, 16, 10], [20, 19, 16, 14, 18], [11, 12, 18, 20, 17], [13, 17, 20, 19, 15],
];

// 2) ground tiles (own lattice, extends 6 units past the maze on each side)
const G0 = -6, G1 = N * S + 6, GT = 4;
const groundIdx = {};
for (let i = 0; i <= GT; i++) for (let j = 0; j <= GT; j++) {
    groundIdx[`${i},${j}`] = addVertex([G0 + (G1 - G0) * i / GT, 0, G0 + (G1 - G0) * j / GT]);
}

const GROUND_VRANGE = [DYN_VEND + 1, verts.length];

// 3) maze lattice points (c, r, h) -> world (c*S, h*H, r*S), allocated
//    region by region so each region is one contiguous vertex range:
//    first the points on the quadrant boundary lines (c = N/2 or r = N/2,
//    shared by several quadrants), then each quadrant's interior points.
const latIdx = {};
const M = N / 2;
// lattice rectangles [c0, c1, r0, r1], each laid out c-major, then r, then
// h = 0..2 (the order project_lattice walks). B* = the quadrant boundary
// lines (shared by several quadrants), q* = each quadrant's interior.
const LAT_RECTS = {
    B1: [M, M, 0, N], B2: [0, M - 1, M, M], B3: [M + 1, N, M, M],
    q0: [0, M - 1, 0, M - 1], q1: [M + 1, N, 0, M - 1], q2: [0, M - 1, M + 1, N], q3: [M + 1, N, M + 1, N],
};
const LAT_START = {};
for (const [name, [c0, c1, r0, r1]] of Object.entries(LAT_RECTS)) {
    LAT_START[name] = verts.length + 1;
    for (let c = c0; c <= c1; c++) for (let r = r0; r <= r1; r++) for (let h = 0; h <= 2; h++) {
        latIdx[`${c},${r},${h}`] = addVertex([c * S, h * H, r * S]);
    }
}
const lat = (c, r, h) => latIdx[`${c},${r},${h}`];

// ============================================================
// faces, bucketed into chunks
// ============================================================
const shade = (rgb, k) => rgb.map(v => Math.max(0, Math.min(255, Math.round(v * k))));
const L1_WALL = [196, 172, 136], L2_WALL = [150, 168, 196];
const RAMP_COLOR = [214, 126, 76], SLAB_COLOR = [178, 175, 168];
const GRASS = [[104, 158, 86], [92, 146, 78]];

const chunks = {};  // name -> { faces: [{pts, color}] }
const chunk = (name) => (chunks[name] ||= { faces: [] });
const quad = (c, r) => (c >= N / 2 ? 1 : 0) + (r >= N / 2 ? 2 : 0);

// ground
for (let i = 0; i < GT; i++) for (let j = 0; j < GT; j++) {
    chunk('ground').faces.push({
        pts: [groundIdx[`${i},${j}`], groundIdx[`${i + 1},${j}`], groundIdx[`${i + 1},${j + 1}`], groundIdx[`${i},${j + 1}`]],
        color: GRASS[(i + j) % 2],
    });
}
// walls (x-facing walls darker: cheap fake directional lighting)
for (const level of [1, 2]) {
    const { vwall, hwall } = maze[level];
    const lo = level - 1, hi = level;
    const base = level === 1 ? L1_WALL : L2_WALL;
    for (let c = 0; c <= N; c++) for (let r = 0; r < N; r++) if (vwall[c][r]) {
        chunk(`L${level}q${quad(Math.min(c, N - 1), r)}`).faces.push({
            pts: [lat(c, r, lo), lat(c, r + 1, lo), lat(c, r + 1, hi), lat(c, r, hi)],
            color: shade(base, 0.8),
        });
    }
    for (let c = 0; c < N; c++) for (let r = 0; r <= N; r++) if (hwall[c][r]) {
        chunk(`L${level}q${quad(c, Math.min(r, N - 1))}`).faces.push({
            pts: [lat(c, r, lo), lat(c + 1, r, lo), lat(c + 1, r, hi), lat(c, r, hi)],
            color: base,
        });
    }
}
// ramps (level-1 layer): low edge at y=0, high edge at y=H
for (const { c, r, dir } of RAMPS) {
    const lowC = dir > 0 ? c : c + 1, highC = dir > 0 ? c + 1 : c;
    chunk(`L1q${quad(c, r)}`).faces.push({
        pts: [lat(lowC, r, 0), lat(highC, r, 1), lat(highC, r + 1, 1), lat(lowC, r + 1, 0)],
        color: RAMP_COLOR,
    });
}
// slab: per row, runs of non-hole cells, split at the quadrant boundary
for (let r = 0; r < N; r++) {
    let c = 0;
    while (c < N) {
        if (isHole(c, r)) { c++; continue; }
        const start = c;
        const limit = start < N / 2 ? N / 2 : N;
        while (c < limit && !isHole(c, r)) c++;
        chunk(`SLq${quad(start, r)}`).faces.push({
            pts: [lat(start, r, 1), lat(c, r, 1), lat(c, r + 1, 1), lat(start, r + 1, 1)],
            color: shade(SLAB_COLOR, r % 2 ? 0.96 : 1),
        });
    }
}
// dodecahedron (drawn with the level-2 layer; never frustum-culled as a chunk)
{
    const hsv2rgb = (h, s, v) => {
        const cc = v * s, x = cc * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - cc;
        const [r, g, b] = h < 60 ? [cc, x, 0] : h < 120 ? [x, cc, 0] : h < 180 ? [0, cc, x] : h < 240 ? [0, x, cc] : h < 300 ? [x, 0, cc] : [cc, 0, x];
        return [r, g, b].map(t => Math.round((t + m) * 255));
    };
    DODECA_FACES.forEach((f, i) => chunk('dodeca').faces.push({ pts: f, color: hsv2rgb(i * 30, 0.75, 0.97) }));
}

// chunk order = draw-layer order
const ORDER = ['ground', 'L1q0', 'L1q1', 'L1q2', 'L1q3', 'SLq0', 'SLq1', 'SLq2', 'SLq3', 'L2q0', 'L2q1', 'L2q2', 'L2q3', 'dodeca'];
const faces = [];
const chunkRows = [];
for (const name of ORDER) {
    const ch = chunks[name] || { faces: [] };
    const fstart = faces.length + 1;
    faces.push(...ch.faces);
    const fend = faces.length;
    let cx = 0, cy = 0, cz = 0, rad = 1e6;
    if (name !== 'ground' && name !== 'dodeca' && ch.faces.length) {
        const pts = ch.faces.flatMap(f => f.pts).map(i => verts[i - 1]);
        const mn = [0, 1, 2].map(a => Math.min(...pts.map(p => p[a])));
        const mx = [0, 1, 2].map(a => Math.max(...pts.map(p => p[a])));
        [cx, cy, cz] = [0, 1, 2].map(a => (mn[a] + mx[a]) / 2);
        rad = Math.max(...pts.map(p => Math.hypot(p[0] - cx, p[1] - cy, p[2] - cz))) + 0.01;
    }
    chunkRows.push({ name, fstart, fend, cx, cy, cz, rad });
}
const chunkIdx = (name) => ORDER.indexOf(name) + 1;
const dodecaChunk = chunkRows[chunkIdx('dodeca') - 1];

// ============================================================
// write lists / variables
// ============================================================
const V = verts.length, F = faces.length;
setList('3d_x', verts.map(p => p[0]));
setList('3d_y', verts.map(p => p[1]));
setList('3d_z', verts.map(p => p[2]));
setList('base_x', baseVerts.map(p => p[0]));
setList('base_y', baseVerts.map(p => p[1]));
setList('base_z', baseVerts.map(p => p[2]));
setList('t_x', Array(V).fill(0));
setList('t_y', Array(V).fill(0));
setList('view_z', Array(V).fill(0));
setList('scr_code', Array(V).fill(0));
for (const unused of ['view_x', 'view_y', 'dot_dis']) setList(unused, []);

setList('face__', faces.flatMap(f => { const p = [...f.pts]; while (p.length < 5) p.push(p[0]); return p; }));
setList('face_', faces.map(f => f.pts.length));
setList('orders', faces.map((_, i) => i + 1));
setList('face_dis', faces.map(() => 0));
setList('face_r', faces.map(f => f.color[0]));
setList('face_g', faces.map(f => f.color[1]));
setList('face_b', faces.map(f => f.color[2]));
setList('face_allvalid', faces.map(() => 0));

setList('chunk_fstart', chunkRows.map(c => c.fstart));
setList('chunk_fend', chunkRows.map(c => c.fend));
setList('chunk_cx', chunkRows.map(c => c.cx));
setList('chunk_cy', chunkRows.map(c => c.cy));
setList('chunk_cz', chunkRows.map(c => c.cz));
setList('chunk_r', chunkRows.map(c => c.rad));
setList('chunk_vis', chunkRows.map(() => 1));
{
    const G = chunkIdx('ground'); // radius 1e6 => always visible
    const lattice = (name, ch) => ({ range: [LAT_START[name], 0], ch, rect: LAT_RECTS[name] });
    const regions = [
        { range: GROUND_VRANGE, ch: [G, G, G] },
        lattice('B1', [G, G, G]), lattice('B2', [G, G, G]), lattice('B3', [G, G, G]),
        ...[0, 1, 2, 3].map(q => lattice(`q${q}`, [chunkIdx(`L1q${q}`), chunkIdx(`SLq${q}`), chunkIdx(`L2q${q}`)])),
    ];
    setList('reg_kind', regions.map(x => x.rect ? 1 : 0));
    setList('reg_lc0', regions.map(x => x.rect ? x.rect[0] : 0));
    setList('reg_lc1', regions.map(x => x.rect ? x.rect[1] : 0));
    setList('reg_lr0', regions.map(x => x.rect ? x.rect[2] : 0));
    setList('reg_lr1', regions.map(x => x.rect ? x.rect[3] : 0));
    setList('reg_vstart', regions.map(x => x.range[0]));
    setList('reg_vend', regions.map(x => x.range[1]));
    setList('reg_c1', regions.map(x => x.ch[0]));
    setList('reg_c2', regions.map(x => x.ch[1]));
    setList('reg_c3', regions.map(x => x.ch[2]));
}

// object registry: #1 = dodecahedron (moves), #2 = everything else (static)
setList('obj_vstart', [1, DYN_VEND + 1]);
setList('obj_vend', [DYN_VEND, V]);
setList('obj_fstart', [dodecaChunk.fstart, 1]);
setList('obj_fend', [dodecaChunk.fend, dodecaChunk.fstart - 1]);
setList('obj_x', [DODECA.cx + DODECA.r, 0]);
setList('obj_y', [DODECA.cy, 0]);
setList('obj_z', [DODECA.cz, 0]);
setList('obj_movable', [1, 0]);
setList('cam_prev', Array(12).fill('none'));

setVarValue('dyn_vend', DYN_VEND);
setVarValue('lat_s', S);
setVarValue('lat_h', H);
setVarValue('slab_y', H);
setVarValue('g_ground0', chunkIdx('ground')); setVarValue('g_ground1', chunkIdx('ground'));
setVarValue('g_l1_0', chunkIdx('L1q0')); setVarValue('g_l1_1', chunkIdx('L1q3'));
setVarValue('g_slab0', chunkIdx('SLq0')); setVarValue('g_slab1', chunkIdx('SLq3'));
setVarValue('g_l2_0', chunkIdx('L2q0')); setVarValue('g_l2_1', chunkIdx('dodeca'));
setVarValue('anim_obj', 1);
setVarValue('anim_cx', DODECA.cx); setVarValue('anim_cy', DODECA.cy); setVarValue('anim_cz', DODECA.cz); setVarValue('anim_r', DODECA.r);
setVarValue('max_dis', 45);

// camera start: just outside the level-1 entrance (east side), eye height
// 1.5, facing -x (the engine's default heading) into the maze
{
    const ydux = project.functions.find(f => f.id === 'ydux');
    const content = JSON.parse(ydux.content);
    const find = (node, pred) => {
        if (Array.isArray(node)) { for (const n of node) { const r = find(n, pred); if (r) return r; } return null; }
        if (node && typeof node === 'object') {
            if (pred(node)) return node;
            for (const k in node) { const r = find(node[k], pred); if (r) return r; }
        }
        return null;
    };
    const setCam = (list, value) => {
        const b = find(content, x => x.type === 'change_value_list_index' && x.params[0] === list && x.params[1]?.params?.[0] === '17');
        b.params[2] = { ...b.params[2], params: [String(value)] };
    };
    setCam('p604', N * S + 4);
    setCam('woyc', 1.5);
    setCam('23s0', ENTRANCE.row * S + S / 2);
    ydux.content = JSON.stringify(content);
}

// sky-blue backdrop (= fog color)
{
    const bg = project.objects.find(o => o.name === 'background');
    const pic = bg.sprite.pictures[0];
    await sharp({ create: { width: pic.dimension.width, height: pic.dimension.height, channels: 3, background: { r: 135, g: 206, b: 235 } } })
        .png().toFile(path.join(workDir, 'temp', pic.fileurl.replace(/^temp\//, '')));
}

fs.writeFileSync(projectPath, JSON.stringify(project));
const outTar = path.join(workDir, 'out.tar');
cp.execSync(`tar -cf "${outTar}" -C "${workDir}" temp`);
fs.writeFileSync(OUT, zlib.gzipSync(fs.readFileSync(outTar), { level: 9 }));

const count = (p) => ORDER.filter(n => n.startsWith(p)).reduce((a, n) => a + (chunks[n]?.faces.length || 0), 0);
console.log('wrote', OUT);
console.log(`vertices ${V} (lattice ${Object.keys(latIdx).length}), faces ${F}: ground ${count('ground')}, L1 ${count('L1')}, slab ${count('SL')}, L2 ${count('L2')}, dodeca ${count('dodeca')}`);

// ASCII map (north = row 0 at top, x grows to the right). R = ramp/hole.
if (process.env.MAZE_MAP) {
    for (const level of [1, 2]) {
        const { vwall, hwall } = maze[level];
        console.log(`\nlevel ${level}`);
        for (let r = 0; r <= N; r++) {
            let line = '';
            for (let c = 0; c < N; c++) line += '+' + (hwall[c][r] ? '---' : '   ');
            console.log(line + '+');
            if (r === N) break;
            line = '';
            for (let c = 0; c <= N; c++) {
                line += vwall[c][r] ? '|' : ' ';
                if (c < N) line += isHole(c, r) ? ' R ' : '   ';
            }
            console.log(line);
        }
    }
}
