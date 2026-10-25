// Build the battle royale: prefabs + island + guns + sounds -> list data, src/*.js (EJS) -> .ent
// usage: node build.mjs [out.ent] [K=V ...]
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { compileProgram } from './ejs.mjs';
import { expandMacros, declareImplicit } from './inline.mjs';
import { packEnt } from './pack.mjs';
import { legacyMath, slimBlocks } from './legacy.mjs';
import { MATERIALS, MAT_ORDER, buildBSP, leafOf, faceNormal, shadeOf, toQuads, dot } from './geom.mjs';
import { ALL } from './prefabs.mjs';
import { GUNS, ATTS, AMMO, gunModels, attModels, itemModels } from './guns.mjs';
import { makeSounds } from './sounds.mjs';
import { generate, CS, CELLS, GRID, MAP, SITES } from './mapgen.mjs';
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
export const VERSION = '0.1';
export const NAME = '엔트리 배틀로얄 3D';
const NL = '\n';

export const consts = {
    CS, CELLS, GRID, MAP, NEAR: 15, RMAX: 14, FOGSKY: '#b9c3c9', TEST: 0, LEGACY: 1, SLIM: 1, BENCH: 0,
};

// ------------------------------------------------------------------ colours
// world materials first; the rest (people, guns, effects) go to a second table
const FIRST_ACTOR = MAT_ORDER.indexOf('skin1');
const FOG = [185, 195, 201];
export function colourTables() {
    const hex = (c) => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
    const T1 = [], T2 = [];
    MAT_ORDER.forEach((name, i) => {
        const rgb = MATERIALS[name];
        for (let s = 0; s < 8; s++) for (let f = 0; f < 8; f++) {
            const k = 0.5 + s / 14, fog = f === 0 ? 0 : Math.min(0.92, (f / 7) * 0.92);
            const c = rgb.map((v, j) => v * k * (1 - fog) + FOG[j] * fog);
            (T1.length < 4992 ? T1 : T2).push(hex(c));
        }
    });
    return { CT: T1, CT2: T2 };
}
export const matIndex = (name) => { const i = MAT_ORDER.indexOf(name); if (i < 0) throw new Error('material ' + name); return i; };
// paint groups: faces of these materials take the instance's tint
const PAINT = { plasterW: 1, plasterY: 1, plasterB: 1, plasterG: 1, plasterP: 1, roofRed: 2, roofGrey: 2, roofBrown: 2, roofGreen: 2, containerR: 3, containerB: 3, containerG: 3, containerO: 3, containerY: 3, carBody1: 4, carBody2: 4, carBody3: 4 };
const PAINT_BASE = { 1: 'plasterW', 2: 'roofRed', 3: 'containerR', 4: 'carBody1' };

// rotations: local (x, z) -> world
export const ROT = [(x, z) => [x, z], (x, z) => [z, -x], (x, z) => [-x, -z], (x, z) => [-z, x]];

// ------------------------------------------------------------------ prefabs -> banks
export const GUNM = gunModels(), ATTM = attModels(), ITEMM = itemModels();
export const MODELS = [...ALL, ...GUNM, ...ATTM, ...ITEMM];
export const GBASE = ALL.length, ABASE = ALL.length + GUNM.length, IBASE = ALL.length + GUNM.length + ATTM.length;
export function compilePrefabs() {
    const BANK_MAX = 4990;
    const banks = [];
    const newBank = () => { const b = { X: [], Y: [], Z: [], NX: [], NY: [], NZ: [], ND: [], NF: [], NB: [], NP: [], NC: [], F1: [], F2: [], F3: [], F4: [], FS: [], FK: [], C1: [], C2: [], C3: [], C4: [] }; banks.push(b); return b; };
    let bank = newBank();
    const Q = { B: [], R: [], V0: [], VN: [], L: [] };          // per prefab-LOD
    const P = { R: [], CY: [], X0: [], X1: [], Z0: [], Z1: [], H: [], C0: [], CN: [], K: [], BUSH: [], COV: [] };
    const COL = { X0: [], Y0: [], Z0: [], X1: [], Y1: [], Z1: [] };
    const bsps = [];   // [prefab][lod] for the build (leaves of props)
    MODELS.forEach((pf, pi) => {
        bsps.push([]);
        pf.lods.forEach((m, li) => {
            const bsp = buildBSP(m.faces);
            bsps[pi].push(bsp);
            // count what it needs
            const verts = new Map();
            let nFaces = 0;
            for (const nd of bsp.nodes) for (const f of nd.faces) { for (const q of toQuads(f.v)) { nFaces++; for (const p of q) verts.set(p.map(Math.round).join(','), 1); } }
            if (bank.X.length + verts.size > BANK_MAX || bank.F1.length + nFaces > BANK_MAX || bank.NX.length + bsp.nodes.length > BANK_MAX) bank = newBank();
            const bi = banks.indexOf(bank) + 1;
            const v0 = bank.X.length + 1;
            const vid = new Map();
            const V = (p) => { const k = p.map(Math.round).join(','); if (!vid.has(k)) { vid.set(k, bank.X.length + 1); bank.X.push(Math.round(p[0])); bank.Y.push(Math.round(p[1])); bank.Z.push(Math.round(p[2])); } return vid.get(k); };
            const n0 = bank.NX.length;   // node i of this bsp -> n0 + i + 1
            const child = (c) => (c >= 0 ? n0 + c + 1 : c);   // leaves stay negative (-leaf)
            for (const nd of bsp.nodes) {
                bank.NX.push(Math.round(nd.n[0] * 1024)); bank.NY.push(Math.round(nd.n[1] * 1024)); bank.NZ.push(Math.round(nd.n[2] * 1024));
                bank.ND.push(Math.round(nd.d * 1024));
                bank.NF.push(child(nd.front)); bank.NB.push(child(nd.back));
                bank.NP.push(bank.F1.length + 1);
                let c = 0;
                for (const f of nd.faces) for (const q of toQuads(f.v)) {
                    const ids = q.map(V);
                    // (a triangle repeats its third corner: a 0 here would read as a point at the model's origin)
                    bank.F1.push(ids[0]); bank.F2.push(ids[1]); bank.F3.push(ids[2]); bank.F4.push(ids[3] || ids[2]);
                    bank.FS.push(f.s);
                    const pk = PAINT[f.m] || 0;
                    bank.FK.push(pk);
                    const mi = matIndex(pk ? PAINT_BASE[pk] : f.m);
                    const n = faceNormal(f.v);
                    for (let r = 0; r < 4; r++) {
                        const [wx, wz] = ROT[r](n[0], n[2]);
                        bank['C' + (r + 1)].push((mi * 8 + shadeOf([wx, n[1], wz])) * 8);
                    }
                    c++;
                }
                bank.NC.push(c);
            }
            Q.B.push(bi); Q.R.push(bsp.nodes.length ? n0 + bsp.root + 1 : 0); Q.V0.push(v0); Q.VN.push(bank.X.length + 1 - v0); Q.L.push(bsp.leaves);
        });
        // prefab bounds (from LOD 0) and colliders
        const m0 = pf.lods[0];
        const { lo, hi } = m0.bounds();
        const cy = (lo[1] + hi[1]) / 2;
        let r = 0; for (const f of m0.faces) for (const p of f.v) r = Math.max(r, Math.hypot(p[0], p[1] - cy, p[2]));
        P.R.push(Math.ceil(r)); P.CY.push(Math.round(cy)); P.X0.push(lo[0]); P.X1.push(hi[0]); P.Z0.push(lo[2]); P.Z1.push(hi[2]); P.H.push(hi[1]);
        P.C0.push(COL.X0.length + 1); P.CN.push(m0.boxes.length);
        for (const b of m0.boxes) { COL.X0.push(b[0]); COL.Y0.push(b[1]); COL.Z0.push(b[2]); COL.X1.push(b[3]); COL.Y1.push(b[4]); COL.Z1.push(b[5]); }
        P.K.push(pf.kind === 'building' ? 1 : 2); P.BUSH.push(pf.bush ? 1 : 0); P.COV.push(pf.cover ? 1 : 0);
    });
    return { banks, Q, P, COL, bsps };
}

// ------------------------------------------------------------------ the island -> lists
export function compileWorld(pre) {
    const g = generate();
    const { H, hAt, cellMat, roadQuads } = g;
    const out = {};
    out.TH = Array.from(H, (h) => Math.round(h));
    // terrain: one quad a cell where any corner is above the sea (shore cells: the land part only)
    const TP = { A: [], B: [], C: [], D: [], K: [] };     // vertex refs (1..GRID*GRID grid, beyond: extra), colour base
    const EX = { X: [], Y: [], Z: [] };
    const exV = new Map();
    const ex = (x, y, z) => { const k = `${x},${y},${z}`; if (!exV.has(k)) { EX.X.push(x); EX.Y.push(y); EX.Z.push(z); exV.set(k, GRID * GRID + EX.X.length); } return exV.get(k); };
    const gref = (x, z) => z * GRID + x + 1;
    const T0 = [], TN = [], R0 = [], RN = [];
    const RP = { A: [], B: [], C: [], D: [], K: [] };
    const shade = (a, b, c) => { const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]; let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]; if (n[1] < 0) n = n.map(x => -x); const l = Math.hypot(...n); return shadeOf(n.map(x => x / l)); };
    for (let cz = 0; cz < CELLS; cz++) for (let cx = 0; cx < CELLS; cx++) {
        const c = cz * CELLS + cx;
        T0.push(TP.A.length + 1);
        const P = [[cx, cz], [cx + 1, cz], [cx + 1, cz + 1], [cx, cz + 1]].map(([x, z]) => [x * CS, H[z * GRID + x], z * CS, gref(x, z)]);
        const hs = P.map(p => p[1]);
        const mi = matIndex(cellMat[c]);
        if (Math.min(...hs) >= 0) {
            // counter-clockwise seen from above: (x0,z0) (x0,z1) (x1,z1) (x1,z0)
            TP.A.push(P[0][3]); TP.B.push(P[3][3]); TP.C.push(P[2][3]); TP.D.push(P[1][3]);
            TP.K.push((mi * 8 + shade(P[0], P[3], P[1])) * 8);
        } else if (Math.max(...hs) > 0) {
            // the shore: cut the two triangles at the sea level, keep the land part, and draw the
            // water part flat at 0 first
            const tris = [[P[0], P[3], P[2]], [P[0], P[2], P[1]]];
            const cut = (tri, above) => {
                const o = [];
                for (let i = 0; i < 3; i++) { const a = tri[i], b = tri[(i + 1) % 3]; const ia = above ? a[1] >= 0 : a[1] < 0, ib = above ? b[1] >= 0 : b[1] < 0;
                    if (ia) o.push(a); if (ia !== ib) { const t = a[1] / (a[1] - b[1]); o.push([Math.round(a[0] + (b[0] - a[0]) * t), 0, Math.round(a[2] + (b[2] - a[2]) * t), null]); } }
                return o;
            };
            const ref = (p) => (p[3] && p[1] >= 0 ? p[3] : ex(p[0], Math.max(0, p[1]), p[2]));
            for (const tri of tris) {
                const w = cut(tri, false);
                if (w.length >= 3) for (const q of toQuads(w.map(p => [p[0], 0, p[2], null]))) { const r = q.map(p => ex(p[0], 0, p[2])); TP.A.push(r[0]); TP.B.push(r[1]); TP.C.push(r[2]); TP.D.push(r[3] || 0); TP.K.push((matIndex('water') * 8 + 6) * 8); }
            }
            for (const tri of tris) {
                const l = cut(tri, true);
                if (l.length >= 3) for (const q of toQuads(l)) { const r = q.map(ref); TP.A.push(r[0]); TP.B.push(r[1]); TP.C.push(r[2]); TP.D.push(r[3] || 0); TP.K.push((matIndex('sand') * 8 + shade(tri[0], tri[1], tri[2])) * 8); }
            }
        } else {
            // open water inside the draw radius: the lake and the sea near the shore
            if (Math.max(...hs) > -600) { TP.A.push(ex(P[0][0], 0, P[0][2])); TP.B.push(ex(P[3][0], 0, P[3][2])); TP.C.push(ex(P[2][0], 0, P[2][2])); TP.D.push(ex(P[1][0], 0, P[1][2])); TP.K.push((matIndex(Math.max(...hs) > -250 ? 'water' : 'deepWater') * 8 + 6) * 8); }
        }
        TN.push(TP.A.length + 1 - T0[c]);
        // roads of the cell
        R0.push(RP.A.length + 1);
        for (const q of roadQuads.get(c) || []) { const r = q.v.map(p => ex(p[0], p[1], p[2])); RP.A.push(r[0]); RP.B.push(r[1]); RP.C.push(r[2]); RP.D.push(r[3] || 0); RP.K.push((matIndex(q.m) * 8 + 6) * 8); }
        RN.push(RP.A.length + 1 - R0[c]);
    }
    Object.assign(out, { TPA: TP.A, TPB: TP.B, TPC: TP.C, TPD: TP.D, TPK: TP.K, TC0: T0, TCN: TN, RPA: RP.A, RPB: RP.B, RPC: RP.C, RPD: RP.D, RPK: RP.K, RC0: R0, RCN: RN, EXX: EX.X, EXY: EX.Y, EXZ: EX.Z });
    // far terrain: a coarse 16 x 16 grid (land only), drawn first, beyond the near cells
    const FG = 16, FS = MAP / FG;
    const FH = [], FK = [];
    for (let z = 0; z <= FG; z++) for (let x = 0; x <= FG; x++) FH.push(Math.round(Math.max(-50, hAt(x * FS, z * FS))));
    for (let z = 0; z < FG; z++) for (let x = 0; x < FG; x++) {
        const hs = [FH[z * (FG + 1) + x], FH[z * (FG + 1) + x + 1], FH[(z + 1) * (FG + 1) + x], FH[(z + 1) * (FG + 1) + x + 1]];
        let land = 0, mats = {};
        for (let k = 0; k < 4; k++) for (let j = 0; j < 4; j++) { const c = (z * 4 + k) * CELLS + x * 4 + j; mats[cellMat[c]] = (mats[cellMat[c]] || 0) + 1; }
        const top = Object.entries(mats).sort((a, b) => b[1] - a[1])[0][0];
        if (Math.max(...hs) <= 0) { FK.push(0); continue; }
        const P0 = [x * FS, hs[0], z * FS], P1 = [(x + 1) * FS, hs[1], z * FS], P3 = [x * FS, hs[2], (z + 1) * FS];
        FK.push((matIndex(top) * 8 + shade(P0, P3, P1)) * 8 + 1);
    }
    out.FH = FH; out.FK = FK;
    // instances: sorted by cell, the building of a cell first
    const all = [...g.insts, ...g.props].sort((a, b) => a.cell - b.cell || (b.building ? 1 : 0) - (a.building ? 1 : 0));
    const I = { PF: [], X: [], Y: [], Z: [], R: [], T: [], T2: [], L: [] };
    const C0 = new Array(CELLS * CELLS).fill(0), CN = new Array(CELLS * CELLS).fill(0), CB = new Array(CELLS * CELLS).fill(0);
    for (const it of all) {
        const idx = I.PF.length + 1;
        if (!C0[it.cell]) C0[it.cell] = idx;
        CN[it.cell]++;
        if (it.building) CB[it.cell] = idx;
        // a prop in a building's cell: the leaf of the building's BSP it stands in (the order it is drawn in)
        let leaf = 0;
        if (!it.building && g.cellB.has(it.cell)) {
            const b = g.cellB.get(it.cell);
            const inv = [(x, z) => [x, z], (x, z) => [-z, x], (x, z) => [-x, -z], (x, z) => [z, -x]][b.r];
            const [lx, lz] = inv(it.x - b.x, it.z - b.z);
            leaf = leafOf(pre.bsps[b.pf - 1][0], [lx, it.y + 100 - b.y, lz]);
        }
        const tint = ALL[it.pf - 1].name === 'car' ? it.tint % 3 : it.tint;
        I.PF.push(it.pf); I.X.push(it.x); I.Y.push(it.y); I.Z.push(it.z); I.R.push(it.r); I.T.push(tint * 64); I.T2.push((it.tint2 || 0) * 64); I.L.push(leaf);
    }
    Object.assign(out, { IPF: I.PF, IX: I.X, IY: I.Y, IZ: I.Z, IR: I.R, IT: I.T, IT2: I.T2, IL: I.L, CI0: C0, CIN: CN, CIB: CB });
    // the cells around the eye, farthest (by cells, |dx| + |dz|) first
    const offs = [];
    const R = consts.RMAX;
    for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) { const m = Math.abs(dx) + Math.abs(dz); if (m <= R) offs.push([dx, dz, m]); }
    offs.sort((a, b) => b[2] - a[2] || a[0] - b[0] || a[1] - b[1]);
    out.ODX = offs.map(o => o[0]); out.ODZ = offs.map(o => o[1]); out.ODM = offs.map(o => o[2]);
    // where the cells of radius r start in that list
    out.OSTART = Array.from({ length: R + 1 }, (_, r) => offs.findIndex(o => o[2] <= r) + 1);
    Object.assign(out, navAndLoot(g, all, pre));
    out.sites = g.sites; out.g = g;
    return out;
}

// ------------------------------------------------------------------ navigation and loot spots
const INV = [(x, z) => [x, z], (x, z) => [-z, x], (x, z) => [-x, -z], (x, z) => [z, -x]];
function navAndLoot(g, all, pre) {
    const { hAt } = g;
    const byCell = new Map();
    all.forEach((it, i) => { if (!byCell.has(it.cell)) byCell.set(it.cell, []); byCell.get(it.cell).push({ ...it, idx: i + 1 }); });
    // is a standing person at (x, y, z) inside something?
    const blocked = (x, y, z) => {
        const cx = Math.floor(x / CS), cz = Math.floor(z / CS);
        for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
            for (const it of byCell.get((cz + dz) * CELLS + cx + dx) || []) {
                const [lx, lz] = INV[it.r](x - it.x, z - it.z);
                const ly = y - it.y;
                for (const b of MODELS[it.pf - 1].lods[0].boxes) if (lx > b[0] - 30 && lx < b[3] + 30 && lz > b[2] - 30 && lz < b[5] + 30 && ly + 170 > b[1] && ly + 25 < b[4]) return true;
            }
        }
        return false;
    };
    const ground = (x, z) => hAt(x, z);
    // can someone walk straight from a to b (both points on the ground outside)?
    const clear = (a, b) => {
        const L = Math.hypot(b[0] - a[0], b[2] - a[2]); const n = Math.max(2, Math.ceil(L / 90));
        let py = a[1];
        for (let i = 1; i <= n; i++) {
            const t = i / n, x = a[0] + (b[0] - a[0]) * t, z = a[2] + (b[2] - a[2]) * t;
            const y = i === n ? b[1] : ground(x, z);
            if (y < 40) return false;
            if (Math.abs(y - py) > 70) return false;
            if (blocked(x, y, z)) return false;
            py = y;
        }
        return true;
    };
    const N = { X: [], Y: [], Z: [], K: [], C: [], B: [], M: [] }, adj = [];
    const CN = new Array(CELLS * CELLS).fill(0);
    const add = (x, y, z, k, c, b) => { N.X.push(Math.round(x)); N.Y.push(Math.round(y)); N.Z.push(Math.round(z)); N.K.push(k); N.C.push(c + 1); N.B.push(b); N.M.push(0); adj.push([]); return N.X.length; };
    // outdoor nodes: a free spot near each land cell's centre
    for (let cz = 0; cz < CELLS; cz++) for (let cx = 0; cx < CELLS; cx++) {
        const c = cz * CELLS + cx;
        const cand = [[0, 0]]; for (let r of [500, 1000]) for (let a = 0; a < 8; a++) cand.push([Math.cos(a * Math.PI / 4) * r, Math.sin(a * Math.PI / 4) * r]);
        for (const [ox, oz] of cand) {
            const x = (cx + 0.5) * CS + ox, z = (cz + 0.5) * CS + oz, y = ground(x, z);
            if (y < 60) continue;
            if (blocked(x, y, z)) continue;
            CN[c] = add(x, y, z, 0, c, 0);
            break;
        }
    }
    const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
    for (let c = 0; c < CELLS * CELLS; c++) {
        const n = CN[c]; if (!n) continue;
        const cx = c % CELLS, cz = Math.floor(c / CELLS);
        DIRS.forEach(([dx, dz], k) => {
            const x2 = cx + dx, z2 = cz + dz; if (x2 < 0 || z2 < 0 || x2 >= CELLS || z2 >= CELLS) return;
            const m = CN[z2 * CELLS + x2]; if (!m) return;
            const a = [N.X[n - 1], N.Y[n - 1], N.Z[n - 1]], b = [N.X[m - 1], N.Y[m - 1], N.Z[m - 1]];
            if (clear(a, b)) N.M[n - 1] |= (1 << k);
        });
    }
    // building nodes, their edges, and the doors to the outdoor nodes
    const IN0 = new Array(all.length).fill(0), INN = new Array(all.length).fill(0);
    const LS = { X: [], Y: [], Z: [], T: [], B: [] };
    all.forEach((it, i) => {
        const m0 = MODELS[it.pf - 1].lods[0];
        const tf = (p) => { const [wx, wz] = ROT[it.r](p[0], p[2]); return [it.x + wx, it.y + p[1], it.z + wz]; };
        for (const l of m0.loot) { const w = tf(l); LS.X.push(Math.round(w[0])); LS.Y.push(Math.round(w[1])); LS.Z.push(Math.round(w[2])); LS.T.push(it.tier || 1); LS.B.push(i + 1); }
        if (!m0.nav.length) return;
        IN0[i] = N.X.length + 1; INN[i] = m0.nav.length;
        const ids = m0.nav.map(p => { const w = tf(p); return add(w[0], w[1], w[2], 1 + p[3], it.cell, i + 1); });
        for (const [a, b] of m0.navEdges) { adj[ids[a] - 1].push(ids[b]); adj[ids[b] - 1].push(ids[a]); }
        m0.nav.forEach((p, j) => {
            if (p[3] !== 1) return;
            // a door: link it to the nearest outdoor node it can walk to
            const d = ids[j]; const dp = [N.X[d - 1], N.Y[d - 1], N.Z[d - 1]];
            const cands = [];
            for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const c2 = it.cell + dz * CELLS + dx; if (c2 >= 0 && c2 < CELLS * CELLS && CN[c2]) cands.push(CN[c2]); }
            cands.sort((u, v) => Math.hypot(N.X[u - 1] - dp[0], N.Z[u - 1] - dp[2]) - Math.hypot(N.X[v - 1] - dp[0], N.Z[v - 1] - dp[2]));
            let linked = 0;
            for (const o of cands) { if (linked >= 2) break; if (clear(dp, [N.X[o - 1], N.Y[o - 1], N.Z[o - 1]]) || clear([N.X[o - 1], N.Y[o - 1], N.Z[o - 1]], dp)) { adj[d - 1].push(o); adj[o - 1].push(d); linked++; } }
        });
    });
    const NE0 = [], NEN = [], NEL = [];
    adj.forEach((a, i) => { NE0.push(NEL.length + 1); NEN.push(a.length); NEL.push(...a); });
    return { NDX: N.X, NDY: N.Y, NDZ: N.Z, NDK: N.K, NDC: N.C, NDB: N.B, NDM: N.M, NE0, NEN, NEL, CN, IN0, INN, LSX: LS.X, LSY: LS.Y, LSZ: LS.Z, LST: LS.T, LSB: LS.B };
}

// ------------------------------------------------------------------ code made per bank
const BANK_LISTS = ['X', 'Y', 'Z', 'NX', 'NY', 'NZ', 'ND', 'NF', 'NB', 'NP', 'NC', 'F1', 'F2', 'F3', 'F4', 'FS', 'FK', 'C1', 'C2', 'C3', 'C4'];
export function bankSource(nb) {
    const out = [];
    for (let b = 1; b <= nb; b++) {
        const L = BANK_LISTS.map(n => `K${b}${n}`).join(', ');
        out.push(`function xfB${b}(v0, n) { M_xform(K${b}X, K${b}Y, K${b}Z); }`);
        out.push(`function bspB${b}(root) { M_bsp(${L}); }`);
        out.push(`function leafB${b}(root, px, py, pz) { let nd = root; while (nd > 0) { if (K${b}NX[nd] * px + K${b}NY[nd] * py + K${b}NZ[nd] * pz - K${b}ND[nd] >= 0) { nd = K${b}NF[nd]; } else { nd = K${b}NB[nd]; } } return 0 - nd; }`);
    }
    const tree = (v, lo, hi, leaf) => (lo === hi ? leaf(lo) : `if (${v} <= ${(lo + hi) >> 1}) { ${tree(v, lo, (lo + hi) >> 1, leaf)} } else { ${tree(v, ((lo + hi) >> 1) + 1, hi, leaf)} }`);
    out.push(`function xfBank(b, v0, n) { ${tree('b', 1, nb, b => `xfB${b}(v0, n);`)} }`);
    out.push(`function bspBank(b, root) { ${tree('b', 1, nb, b => `bspB${b}(root);`)} }`);
    out.push(`function leafBank(b, root, px, py, pz) { let r = 0; ${tree('b', 1, nb, b => `r = leafB${b}(root, px, py, pz);`)} return r; }`);
    return out.join(NL) + NL;
}

export const FILES = ['render.js', 'world.js', 'player.js', 'hud.js', 'hud2.js', 'people.js', 'weapon.js', 'loot.js', 'nav.js', 'ai.js', 'game.js', 'sound.js', 'main.js'];
export function sources(C, data) {
    const decl = (name, arr) => `let ${name} = ${JSON.stringify(arr)};`;
    const lists = Object.entries(data.lists).map(([k, v]) => decl(k, v)).join(NL);
    const raw = lists + NL + bankSource(data.nb) + FILES.map(f => fs.readFileSync(path.join(HERE, 'src', f), 'utf8')).join(NL);
    const { src, count } = expandMacros(raw);
    return { src: declareImplicit(src), count };
}

// guns, attachments, items: numbers for the game
export function gunData() {
    const L = {};
    const col = (k, f) => { L[k] = GUNS.map(f); };
    col('GNAME', g => g.name); col('GCLS', g => g.cls); col('GAMMO', g => g.ammo); col('GDMG', g => g.dmg);
    col('GINT', g => Math.round(6000 / g.rpm) / 100); col('GVEL', g => g.vel * 100); col('GMAG', g => g.mag); col('GREL', g => g.reload);
    col('GMODE', g => g.modes); col('GRV', g => g.rv); col('GRH', g => g.rh); col('GREC', g => g.rec); col('GHIP', g => g.hip); col('GADS', g => g.ads);
    col('GRANGE', g => g.range * 100); col('GZOOM', g => g.zoom); col('GBOLT', g => g.bolt || 0); col('GPEL', g => g.pellets || 1); col('GTIER', g => g.tier);
    const mt = GUNM.map(m => m.mounts);
    L.GSY = mt.map(m => Math.round(m.sight * 10)); L.GMZ = mt.map(m => Math.round(m.muzzle * 10)); L.GBORE = mt.map(m => Math.round(m.boreY * 10));
    L.GRAY = mt.map(m => Math.round(m.rail[0] * 10)); L.GRAZ = mt.map(m => Math.round(m.rail[1] * 10));
    L.GUNY = mt.map(m => Math.round(m.under[0] * 10)); L.GUNZ = mt.map(m => Math.round(m.under[1] * 10));
    L.GMBY = mt.map(m => Math.round(m.magB[0] * 10)); L.GMBZ = mt.map(m => Math.round(m.magB[1] * 10));
    L.GSTY = mt.map(m => Math.round(m.stock[0] * 10)); L.GSTZ = mt.map(m => Math.round(m.stock[1] * 10));
    L.ANAME = ATTS.map(a => a.name); L.ASLOT = ATTS.map(a => a.slot); L.AFITS = ATTS.map(a => a.fits); L.AZOOM = ATTS.map(a => a.zoom || 1);
    L.AMNAME = AMMO.map(a => a.name); L.AMBOX = AMMO.map(a => a.box);
    // items: 1..15 guns, 16..30 attachments, 31..36 ammo, 37..39 helmet, 40..42 vest, 43..45 backpack,
    // 46 bandage, 47 first aid kit, 48 med kit, 49 energy drink, 50 painkiller, 51 frag, 52 smoke, 53 death box
    const IT = [];
    GUNS.forEach((g, i) => IT.push([g.name, GBASE + i + 1, 1, 0]));
    ATTS.forEach((a, i) => IT.push([a.name, ABASE + i + 1, 2, 10]));
    AMMO.forEach((a, i) => IT.push([a.name, IBASE + 1, 3, i === 4 ? 1 : i === 5 ? 1.25 : 0.5]));
    for (let l = 1; l <= 3; l++) IT.push([`헬멧 ${l}레벨`, IBASE + 2 + l, 4, 0]);
    for (let l = 1; l <= 3; l++) IT.push([`조끼 ${l}레벨`, IBASE + 5 + l, 5, 0]);
    for (let l = 1; l <= 3; l++) IT.push([`가방 ${l}레벨`, IBASE + 8 + l, 6, 0]);
    IT.push(['붕대', IBASE + 12, 7, 2], ['구급상자', IBASE + 13, 7, 10], ['의료용 키트', IBASE + 14, 7, 20], ['에너지 드링크', IBASE + 15, 7, 4], ['진통제', IBASE + 16, 7, 10]);
    IT.push(['수류탄', IBASE + 17, 8, 12], ['연막탄', IBASE + 18, 8, 14], ['보급 상자', IBASE + 19, 9, 0]);
    L.ITN = IT.map(x => x[0]); L.ITM = IT.map(x => x[1]); L.ITK = IT.map(x => x[2]); L.ITW = IT.map(x => x[3]);
    return L;
}

export function buildData() {
    const pre = compilePrefabs();
    const w = compileWorld(pre);
    const { CT, CT2 } = colourTables();
    const lists = {
        CT, CT2,
        QB: pre.Q.B, QR: pre.Q.R, QV0: pre.Q.V0, QVN: pre.Q.VN, QL: pre.Q.L,
        PFR: pre.P.R, PFCY: pre.P.CY, PFX0: pre.P.X0, PFX1: pre.P.X1, PFZ0: pre.P.Z0, PFZ1: pre.P.Z1, PFH: pre.P.H, PFC0: pre.P.C0, PFCN: pre.P.CN, PFK: pre.P.K, PFBU: pre.P.BUSH, PFCV: pre.P.COV,
        CBX0: pre.COL.X0, CBY0: pre.COL.Y0, CBZ0: pre.COL.Z0, CBX1: pre.COL.X1, CBY1: pre.COL.Y1, CBZ1: pre.COL.Z1,
    };
    for (const k of ['NDX', 'NDY', 'NDZ', 'NDK', 'NDC', 'NDB', 'NDM', 'NE0', 'NEN', 'NEL', 'CN', 'IN0', 'INN', 'LSX', 'LSY', 'LSZ', 'LST', 'LSB']) lists[k] = w[k];
    for (const k of ['TH', 'TPA', 'TPB', 'TPC', 'TPD', 'TPK', 'TC0', 'TCN', 'RPA', 'RPB', 'RPC', 'RPD', 'RPK', 'RC0', 'RCN', 'EXX', 'EXY', 'EXZ', 'FH', 'FK', 'IPF', 'IX', 'IY', 'IZ', 'IR', 'IT', 'IT2', 'IL', 'CI0', 'CIN', 'CIB', 'ODX', 'ODZ', 'ODM', 'OSTART']) lists[k] = w[k];
    pre.banks.forEach((b, i) => { for (const n of BANK_LISTS) lists[`K${i + 1}${n}`] = b[n]; });
    Object.assign(lists, gunData());
    // the towns: names, places, sizes, how many land there
    const W = { city: 4, base: 4, port: 3, village: 2, farm: 1, gas: 1, school: 2 };
    lists.SITEN = SITES.map(s => s.name); lists.SITEX = SITES.map(s => s.x * 100); lists.SITEZ = SITES.map(s => s.z * 100); lists.SITER = SITES.map(s => s.r * 100); lists.SITEW = SITES.map(s => W[s.kind]);
    return { lists, nb: pre.banks.length, world: w, pre };
}

const DOT = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const textBox = (id, x, y, width, height, fontSize, more = {}) => ({
    id, name: id, objectType: 'textBox', text: ' ',
    entity: { x, y, colour: '#ffffff', bgColor: 'transparent', font: `${fontSize}px Nanum Gothic Coding`, textAlign: 0, lineBreak: true,
        bold: false, underLine: false, strike: false, italic: false, fontSize, width, height, visible: false, ...more },
});

export function buildProject(out, { more = {} } = {}) {
    const C = { ...consts, ...more };
    const data = buildData();
    // bank lists inside the BANK size; the rest checked below
    const { src, count } = sources(C, data);
    const cc = { ...C }; delete cc.LEGACY; delete cc.SLIM;
    // material colour bases (index x 64) as constants MT_name; model bases
    MAT_ORDER.forEach((n, i) => { cc['MT_' + n] = i * 64; });
    Object.assign(cc, { GBASE, ABASE, IBASE, NGUN: GUNS.length, NATT: ATTS.length, NITEM: 53 });
    const prog = compileProgram([src], { consts: cc });
    if (C.LEGACY) legacyMath(prog);
    if (C.SLIM) slimBlocks(prog);
    const objects = [
        // a line-break box keeps its width whatever it holds, so "set size" scales it exactly (left aligned: 1)
        { ...textBox('txt', 0, 0, 1000, 28, 20, { textAlign: 1, font: '20px Nanum Gothic Coding' }), text: '​', script: prog.objectScripts.txt || [] },
        { id: 'pen', name: 'pen', pictures: [{ id: 'p1', name: 'dot', buf: DOT, w: 1, h: 1 }], script: prog.objectScripts.pen, sounds: makeSounds() },
    ];
    for (const k of Object.keys(prog.objectScripts)) if (!objects.some(o => o.id === k)) throw new Error('script for an unknown object: ' + k);
    if (process.env.LINES) fs.writeFileSync(out + '.lines.json', JSON.stringify({ blockLines: prog.blockLines, srcLines: prog.srcLines }));
    const project = packEnt(out, { name: `${NAME} v${VERSION}`, tmpDir: path.join(HERE, '.pack'), variables: prog.variables, functions: prog.functions, messages: prog.messages, objects, speed: 60 });
    const big = prog.variables.filter(v => v.variableType === 'list' && v.array.length > 5000).map(v => v.name + ':' + v.array.length);
    if (big.length) throw new Error('lists past 5000 items: ' + big);
    const blocks = prog.functions.reduce((a, f) => a + f.content.split('"type"').length - 1, 0) + JSON.stringify(objects.map(o => o.script)).split('"type"').length - 1;
    return { project, src, C, data, stats: { macros: count, banks: data.nb, globals: prog.variables.filter(v => v.variableType === 'variable').length, lists: prog.variables.filter(v => v.variableType === 'list').length, functions: prog.functions.length, blocks, json: JSON.stringify(project).length, bytes: fs.statSync(out).size } };
}

if (process.argv[1] && import.meta.url === url.pathToFileURL(path.resolve(process.argv[1])).href) {
    const out = process.argv[2] || path.join(HERE, 'br.ent');
    const more = Object.fromEntries(process.argv.slice(3).filter(a => a.includes('=')).map(a => a.split('=')).map(([k, v]) => [k, isNaN(Number(v)) ? v : Number(v)]));
    const t = performance.now();
    const r = buildProject(out, { more });
    console.log('wrote', out, JSON.stringify(r.stats), Math.round(performance.now() - t) + ' ms');
}
