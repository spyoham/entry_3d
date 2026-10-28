// Prefabs: the buildings, props and trees of the island, each in three levels of
// detail (LOD 0: everything, inside too; LOD 1: the outside with window decals;
// LOD 2: a box and a roof). Built with the kit in geom.mjs.
import { Model, orderFace, sub, norm, cross } from './geom.mjs';

const T = 20;          // wall thickness
const FH = 300;        // floor to floor
const BASE = 15;       // ground floor above the terrain
const DOOR = { w: 100, h: 215 };
const WIN = { w: 110, h: 120, sill: 95 };
// how far beside a flight of stairs nothing may collide overhead: more than a body's radius (32), so
// a body climbing at the edge of the flight cannot get its head into the floor above (and be stuck)
const SPAD = 36;

// ------------------------------------------------------------------ buildings
// sides: s (z = -d/2), n (z = +d/2), w (x = -w/2), e (x = +w/2)
// o: { w, d, floors, ext, paint, inner, floor, roof: {type, ridge, h, mat, over}, doors: [{side, at}],
//      stair: {x0, z0, x1, z1, dir}, parts: [{floor, axis, c, a, b, door}], winSpacing, noWin: [{side, floor, at}],
//      furniture(m, k, y), nav: [[x, z, floor, kind]], links: [[i, j]], loot: [[x, z, floor]] }
export function building(name, o) {
    const W2 = o.w / 2, D2 = o.d / 2, nf = o.floors || 1, fh = o.fh || FH;
    const ext = o.ext || 'plasterW', inner = o.inner || 'plasterIn', flo = o.floor || 'floorWood';
    const roof = o.roof || { type: 'gable', ridge: 'x', h: 240, mat: 'roofRed', over: 45 };
    const H = nf * fh + (roof.type === 'flat' ? (roof.parapet ?? 100) : 0);   // wall height above floor 0
    const sides = {
        s: { axis: 'x', c: -D2 + T / 2, a: -W2, b: W2, out: -1, caps: true },
        n: { axis: 'x', c: D2 - T / 2, a: -W2, b: W2, out: 1, caps: true },
        w: { axis: 'z', c: -W2 + T / 2, a: -D2 + T, b: D2 - T, out: -1, caps: false },
        e: { axis: 'z', c: W2 - T / 2, a: -D2 + T, b: D2 - T, out: 1, caps: false },
    };
    // the openings of each side, every floor
    const holesOf = (sd) => {
        const S = sides[sd], out = [];
        const doors = (o.doors || []).filter(d => d.side === sd);
        for (const d of doors) out.push({ a: d.at - (d.w || DOOR.w) / 2, b: d.at + (d.w || DOOR.w) / 2, y0: 0, y1: d.h || DOOR.h, door: true, floor: d.floor || 0 });
        // windows: evenly spaced, away from doors, partitions and the wall ends
        const sp = o.winSpacing || 330;
        const span = S.b - S.a - 2 * T;
        const n = Math.max(0, Math.floor((span - 60) / sp));
        const junctions = (o.parts || []).filter(p => (S.axis === 'x' ? p.axis === 'z' : p.axis === 'x')).map(p => p.c);
        for (let k = 0; k < nf; k++) {
            if (o.winFloors && !o.winFloors.includes(k)) continue;
            for (let i = 0; i < n; i++) {
                const at = S.a + T + span * (i + 0.5) / n;
                const y0 = k * fh + (o.sill ?? WIN.sill), y1 = y0 + (o.winH || WIN.h);
                const ww = o.winW || WIN.w;
                if (doors.some(d => (d.floor || 0) === k && Math.abs(d.at - at) < (ww + (d.w || DOOR.w)) / 2 + 30)) continue;
                if (junctions.some(c => Math.abs(c - at) < ww / 2 + 30)) continue;
                if ((o.noWin || []).some(q => q.side === sd && q.floor === k && Math.abs(q.at - at) < 200)) continue;
                out.push({ a: at - ww / 2, b: at + ww / 2, y0, y1, floor: k });
            }
        }
        return out;
    };
    const holes = Object.fromEntries(Object.keys(sides).map(sd => [sd, holesOf(sd)]));
    const L = [new Model(name + '0'), new Model(name + '1'), new Model(name + '2')];
    const [m0, m1, m2] = L;
    // ---------- LOD 0
    // the plinth: from the ground (the instance's y) to the floor, along the outer faces. It does not
    // go under the ground: the terrain is drawn first, so anything below it would show through.
    // Where the ground drops below y, build.mjs closes the gap with a skirt drawn with the terrain.
    for (const m of L) {
        m.box(-W2, 0, -D2, W2, BASE, D2, { side: 'concreteDark', all: 'concreteDark' }, { skip: 'top bottom', collide: m === m0 });
    }
    m0.collider(-W2, -260, -D2, W2, BASE, D2);
    // floors and ceilings: ground floor surface, then a slab at every floor line (with the stair hole)
    const IX0 = -W2 + T, IX1 = W2 - T, IZ0 = -D2 + T, IZ1 = D2 - T;
    m0.slab(IX0, IZ0, IX1, IZ1, BASE - 10, BASE, o.floor0 || flo, null, [], { collide: false });
    const st = o.stair;
    for (let k = 1; k <= nf; k++) {
        const top = k === nf;
        if (top && roof.type !== 'flat') {
            // a ceiling under the attic, no hole
            m0.slab(IX0, IZ0, IX1, IZ1, BASE + k * fh - 15, BASE + k * fh, null, 'ceiling', [], { collide: true });
            continue;
        }
        const hole = st && (!top || o.roofAccess) ? [{ x0: st.x0, z0: st.z0, x1: st.x1, z1: st.z1 }] : [];
        m0.slab(IX0, IZ0, IX1, IZ1, BASE + k * fh - 20, BASE + k * fh, top ? (roof.roofTop || 'roofTar') : flo, 'ceiling', hole, { edges: 'concrete', collide: !hole.length });
        // (the colliders of a floor with the stair hole: the hole wider by SPAD across the flight)
        if (hole.length) {
            const across = st.dir === '+z' || st.dir === '-z';
            const ch = [{ x0: st.x0 - (across ? SPAD : 0), z0: st.z0 - (across ? 0 : SPAD), x1: st.x1 + (across ? SPAD : 0), z1: st.z1 + (across ? 0 : SPAD) }];
            m0.slab(IX0, IZ0, IX1, IZ1, BASE + k * fh - 20, BASE + k * fh, null, null, ch, { edges: null });
        }
    }
    // outside walls (one wall over every floor, with all the holes)
    for (const [sd, S] of Object.entries(sides)) {
        m0.wall(S.axis, S.c, S.a, S.b, BASE, BASE + H, T, ext, inner, holes[sd].map(h => ({ ...h, y0: h.y0 + BASE, y1: h.y1 + BASE })), { out: S.out, caps: S.caps, top: roof.type === 'flat', jamb: o.jamb || 'frame' });
    }
    // partitions
    for (const p of o.parts || []) {
        const y0 = BASE + p.floor * fh, y1 = y0 + fh - (p.floor === nf - 1 && roof.type !== 'flat' ? 15 : 20);
        const a = p.a ?? (p.axis === 'x' ? IX0 : IZ0), b = p.b ?? (p.axis === 'x' ? IX1 : IZ1);
        const hs = (p.doors || (p.door !== undefined ? [p.door] : [])).map(at => ({ a: at - 50, b: at + 50, y0: y0, y1: y0 + DOOR.h }));
        m0.wall(p.axis, p.c, a, b, y0, y1, 14, p.mat || inner, p.mat2 || o.inner2 || inner, hs, { out: 1, caps: p.caps ?? false, top: false, jamb: 'frame' });
    }
    // stairs, one flight per floor (stacked), climbing to the floor above. The ground
    // flight is solid underneath; the ones above are slabs, so the flight below has head room.
    if (st) {
        const flights = nf - 1 + (o.roofAccess ? 1 : 0);
        for (let k = 0; k < flights; k++) {
            const y0 = BASE + k * fh, y1 = y0 + fh;
            m0.stairs(st.x0, st.z0, st.x1, st.z1, y0, y1, st.dir, 10, 'stair', 'plasterIn2', { thin: k > 0 ? 20 : 0 });
        }
    }
    // roof
    const top = BASE + nf * fh;
    if (roof.type === 'gable') {
        if (roof.ridge === 'x') {
            m0.gable(-W2, -D2, W2, D2, top, roof.h, 'x', roof.mat, ext, roof.over ?? 45, { under: 'woodDark' });
            // the gable triangles from inside the attic are not seen (the ceiling closes it)
        } else {
            m0.gable(-W2, -D2, W2, D2, top, roof.h, 'z', roof.mat, ext, roof.over ?? 45, { under: 'woodDark' });
        }
    } else if (roof.type === 'flat') {
        // parapet top is the wall top (drawn by the walls); the roof surface is the top slab
        if (o.roofAccess && st) {
            // a small stair house over the stair hole, open toward the climbing direction
            // (wider than the hole by SPAD across the flight: the walls clear of a body on the stairs)
            const across = st.dir === '+z' || st.dir === '-z', px = across ? SPAD : 0, pz = across ? 0 : SPAD;
            const hx0 = st.x0 - T - px, hx1 = st.x1 + T + px, hz0 = st.z0 - T - pz, hz1 = st.z1 + T + pz, hy0 = top, hy1 = top + 260;
            const openSide = { '+z': 'n', '-z': 's', '+x': 'e', '-x': 'w' }[st.dir];
            const hm = o.headMat || ext;
            if (openSide !== 's') m0.wall('x', hz0 + T / 2, hx0, hx1, hy0, hy1, T, hm, inner, [], { out: -1, caps: true, top: true });
            if (openSide !== 'n') m0.wall('x', hz1 - T / 2, hx0, hx1, hy0, hy1, T, hm, inner, [], { out: 1, caps: true, top: true });
            if (openSide !== 'w') m0.wall('z', hx0 + T / 2, hz0 + T, hz1 - T, hy0, hy1, T, hm, inner, [], { out: -1, caps: false, top: true });
            if (openSide !== 'e') m0.wall('z', hx1 - T / 2, hz0 + T, hz1 - T, hy0, hy1, T, hm, inner, [], { out: 1, caps: false, top: true });
            m0.box(hx0, hy1, hz0, hx1, hy1 + 15, hz1, { top: 'roofTar', side: 'concrete', bottom: 'ceiling' }, { skip: '' });
        }
    } else if (roof.type === 'shed') {
        // one slope (rising toward +z)
        const X0 = -W2 - 30, X1 = W2 + 30, Z0 = -D2 - 30, Z1 = D2 + 30;
        m0.quad([X0, top, Z0], [X0, top + roof.h, Z1], [X1, top + roof.h, Z1], [X1, top, Z0], roof.mat);
        m0.quad([X1, top, Z0], [X1, top + roof.h, Z1], [X0, top + roof.h, Z1], [X0, top, Z0], 'woodDark');
        m0.face(orderFace([[-W2, top, -D2], [-W2, top + roof.h * (D2 * 2) / (Z1 - Z0), D2], [-W2, top, D2]], [-1, 0, 0]), ext);
        m0.face(orderFace([[W2, top, -D2], [W2, top + roof.h * (D2 * 2) / (Z1 - Z0), D2], [W2, top, D2]], [1, 0, 0]), ext);
        m0.face(orderFace([[-W2, top, D2], [W2, top, D2], [W2, top + roof.h * (D2 * 2) / (Z1 - Z0), D2], [-W2, top + roof.h * (D2 * 2) / (Z1 - Z0), D2]], [0, 0, 1]), ext);
    }
    if (o.extra) o.extra(m0, 0, { W2, D2, top, BASE, fh });
    if (o.furniture) for (let k = 0; k < nf; k++) o.furniture(m0, k, BASE + k * fh);
    // ---------- LOD 1 and 2: the outside only
    for (const [li, m] of [[1, m1], [2, m2]]) {
        for (const [sd, S] of Object.entries(sides)) {
            const out = S.out, h = T / 2;
            const P = S.axis === 'x' ? (u, v, w) => [u, v, S.c + w] : (u, v, w) => [S.c + w, v, u];
            const a = S.axis === 'x' ? S.a : -D2, b = S.axis === 'x' ? S.b : D2;
            const want = S.axis === 'x' ? [0, 0, out] : [out, 0, 0];
            const w = out > 0 ? h : -h;
            m.face(orderFace([P(a, BASE, w), P(b, BASE, w), P(b, BASE + H, w), P(a, BASE + H, w)], want), ext);
            if (li === 1) {
                const wd = w + out * 1.5;
                for (const hl of holes[sd]) m.face(orderFace([P(hl.a, hl.y0 + BASE, wd), P(hl.b, hl.y0 + BASE, wd), P(hl.b, hl.y1 + BASE, wd), P(hl.a, hl.y1 + BASE, wd)], want), hl.door ? 'doorWood' : 'glass');
            }
        }
        if (roof.type === 'gable') m.gable(-W2, -D2, W2, D2, top, roof.h, roof.ridge, roof.mat, ext, roof.over ?? 45);
        else if (roof.type === 'flat') m.quad([-W2, BASE + H, -D2], [-W2, BASE + H, D2], [W2, BASE + H, D2], [W2, BASE + H, -D2], 'roofTar');
        else if (roof.type === 'shed') { const X0 = -W2 - 30, X1 = W2 + 30, Z0 = -D2 - 30, Z1 = D2 + 30; m.quad([X0, top, Z0], [X0, top + roof.h, Z1], [X1, top + roof.h, Z1], [X1, top, Z0], roof.mat); }
        if (o.extra && li === 1) o.extra(m, 1, { W2, D2, top, BASE, fh });
    }
    // navigation, loot, cover (given in floor coordinates)
    const nav = o.nav || [];
    for (const [x, z, k, kind] of nav) m0.navAt(x, BASE + k * fh, z, kind ?? 0);
    for (const [i, j] of o.links || []) m0.link(i, j);
    for (const [x, z, k, wgt] of o.loot || []) m0.lootAt(x, BASE + k * fh + 2, z, wgt ?? 1);
    for (const c of o.cover || []) m0.coverAt(c[0], 0, c[1], c[2]);
    return { name, lods: L, kind: 'building', foot: [o.w, o.d], paint: o.paint ?? true, tier: o.tier ?? 1 };
}

// ------------------------------------------------------------------ furniture
const table = (m, x, z, y, r = 0) => { const w = r ? 60 : 90, d = r ? 90 : 60; m.box(x - w, y, z - d, x + w, y + 75, z + d, { top: 'woodPlank', side: 'woodDark' }, { skip: 'bottom' }); };
const bed = (m, x, z, y, alongX = true) => { const w = alongX ? 100 : 50, d = alongX ? 50 : 100; m.box(x - w, y, z - d, x + w, y + 50, z + d, { top: 'sheet', side: 'woodDark' }, { skip: 'bottom' }); };
const shelf = (m, x, z, y, alongX = true) => { const w = alongX ? 80 : 20, d = alongX ? 20 : 80; m.box(x - w, y, z - d, x + w, y + 180, z + d, { top: 'woodDark', side: 'woodPlank' }, { skip: 'bottom' }); };
const sofa = (m, x, z, y, alongX = true) => { const w = alongX ? 90 : 45, d = alongX ? 45 : 90; m.box(x - w, y, z - d, x + w, y + 80, z + d, { top: 'sofa', side: 'sofa' }, { skip: 'bottom' }); };
const crates = (m, x, z, y) => { m.box(x - 60, y, z - 60, x + 60, y + 120, z + 60, 'crateWood', { skip: 'bottom' }); m.box(x + 60, y, z - 50, x + 160, y + 100, z + 50, 'crateGreen', { skip: 'bottom' }); };
const desks = (m, x0, z0, y, nx, nz) => { for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) m.box(x0 + i * 200 - 50, y, z0 + j * 160 - 35, x0 + i * 200 + 50, y + 72, z0 + j * 160 + 35, { top: 'woodPlank', side: 'metalDark' }, { skip: 'bottom' }); };

// ------------------------------------------------------------------ the buildings
export const BUILDINGS = [];
const B = (b) => { BUILDINGS.push(b); return b; };

// 1. one-storey house, 12 x 9, gable roof, two rooms
B(building('houseS', {
    w: 1200, d: 900, floors: 1, ext: 'plasterW', roof: { type: 'gable', ridge: 'x', h: 230, mat: 'roofRed', over: 45 },
    doors: [{ side: 's', at: -300 }, { side: 'n', at: 350 }],
    parts: [{ floor: 0, axis: 'z', c: 100, door: -150 }],
    furniture: (m, k, y) => { table(m, -330, 180, y); sofa(m, -480, -150, y, false); bed(m, 400, 150, y, true); shelf(m, 520, -330, y, false); },
    nav: [[-300, -620, 0, 1], [-300, -300, 0, 2], [-250, 100, 0, 0], [350, -100, 0, 0], [350, 300, 0, 2], [350, 620, 0, 1]],
    links: [[0, 1], [1, 2], [2, 3], [1, 3], [3, 4], [4, 5]],
    loot: [[-430, 300, 0], [-150, -300, 0], [250, -300, 0], [480, 330, 0]],
    cover: [],
}));
// 2. two-storey house, 12 x 10, stairs along the east wall
B(building('houseM', {
    w: 1200, d: 1000, floors: 2, ext: 'plasterY', roof: { type: 'gable', ridge: 'x', h: 250, mat: 'roofGrey', over: 45 },
    doors: [{ side: 's', at: -250 }],
    stair: { x0: 440, z0: -380, x1: 560, z1: -100, dir: '+z' },
    parts: [{ floor: 0, axis: 'x', c: 50, a: -580, b: 400, door: -250 }, { floor: 1, axis: 'z', c: 0, door: 250 }],
    noWin: [],
    furniture: (m, k, y) => { if (k === 0) { table(m, -350, 300, y); sofa(m, 150, -300, y, true); shelf(m, -520, -250, y, false); } else { bed(m, -350, 250, y, true); bed(m, 250, 300, y, true); shelf(m, -150, -400, y, true); } },
    nav: [[-250, -720, 0, 1], [-250, -350, 0, 2], [-200, 300, 0, 0], [300, -250, 0, 0], [500, -420, 0, 3], [500, -60, 1, 3], [-300, -200, 1, 0], [300, 250, 1, 0]],
    links: [[0, 1], [1, 3], [1, 2], [3, 4], [4, 5], [5, 7], [5, 6], [6, 7]],
    loot: [[-400, 200, 0], [100, 350, 0], [0, -300, 0], [-350, -300, 1], [-350, 350, 1], [300, 0, 1], [250, -350, 1]],
}));
// 3. three-storey apartment block, 14 x 12, flat roof with a stair house
B(building('apart', {
    w: 1400, d: 1200, floors: 3, ext: 'plasterB', roof: { type: 'flat', parapet: 100 }, roofAccess: true, headMat: 'concrete',
    doors: [{ side: 's', at: 0, w: 140 }],
    stair: { x0: -60, z0: -100, x1: 60, z1: 180, dir: '+z' },
    parts: [0, 1, 2].flatMap(k => [{ floor: k, axis: 'z', c: -150, door: -350 }, { floor: k, axis: 'z', c: 150, door: -350 }]),
    winSpacing: 300,
    furniture: (m, k, y) => { table(m, -420, 250, y); bed(m, 420, 300, y, true); shelf(m, -580, -350, y, false); sofa(m, 450, -300, y, true); },
    nav: [[0, -820, 0, 1], [0, -350, 0, 2], [-400, 0, 0, 0], [400, 0, 0, 0], [0, -180, 0, 3], [0, 250, 1, 3], [0, -250, 1, 0], [-400, 0, 1, 0], [400, 0, 1, 0],
        [0, -180, 1, 3], [0, 250, 2, 3], [0, -250, 2, 0], [-400, 0, 2, 0], [400, 0, 2, 0], [0, -180, 2, 3], [0, 300, 3, 4], [-450, -400, 3, 4], [450, 400, 3, 4]],
    links: [[0, 1], [1, 2], [1, 3], [1, 4], [4, 5], [5, 6], [6, 7], [6, 8], [6, 9], [9, 10], [10, 11], [11, 12], [11, 13], [11, 14], [14, 15], [15, 16], [15, 17]],
    loot: [0, 1, 2].flatMap(k => [[-450, -300, k], [-400, 350, k], [450, 0, k], [380, -380, k], [0, -400, k]]).concat([[-400, 300, 3], [400, -300, 3]]),
}));
// 4. school: 24 x 12, two floors, corridor along the south, classrooms north
B(building('school', {
    w: 2400, d: 1200, floors: 2, ext: 'plasterP', roof: { type: 'flat', parapet: 100 }, roofAccess: true, headMat: 'plasterP', floor: 'floorTile',
    doors: [{ side: 's', at: -300, w: 160 }, { side: 'w', at: -300 }],
    stair: { x0: 900, z0: -480, x1: 1020, z1: -200, dir: '+z' },
    parts: [0, 1].flatMap(k => [{ floor: k, axis: 'x', c: -150, a: -1180, b: 840, doors: [-800, 0, 600] }, { floor: k, axis: 'z', c: -400, a: -140, b: 580 }, { floor: k, axis: 'z', c: 400, a: -140, b: 580 }, { floor: k, axis: 'z', c: 850, a: -580, b: 580, door: 300 }]),
    winSpacing: 260, winW: 160, winH: 140, sill: 90,
    furniture: (m, k, y) => { desks(m, -1000, 100, y, 3, 3); desks(m, -200, 100, y, 3, 3); desks(m, 550, 100, y, 1, 3); shelf(m, 1100, 300, y, false); },
    nav: [[-300, -820, 0, 1], [-300, -350, 0, 2], [-800, -350, 0, 0], [500, -350, 0, 0], [-800, 200, 0, 0], [0, 200, 0, 0], [600, 200, 0, 0], [960, -560, 0, 3], [960, -120, 1, 3],
        [500, -350, 1, 0], [-800, -350, 1, 0], [-800, 200, 1, 0], [0, 200, 1, 0], [600, 200, 1, 0], [960, -560, 1, 3], [960, -120, 2, 3], [0, 0, 2, 4], [-900, 300, 2, 4], [-1500, -300, 0, 1], [-1050, -300, 0, 2]],
    links: [[0, 1], [1, 2], [1, 3], [2, 4], [1, 5], [3, 6], [3, 7], [7, 8], [8, 9], [9, 10], [10, 11], [9, 12], [9, 13], [8, 14], [14, 15], [15, 16], [16, 17], [18, 19], [19, 2]],
    loot: [0, 1].flatMap(k => [[-1000, 400, k], [-200, 400, k], [600, 400, k], [-600, -350, k], [300, -350, k], [1100, 0, k]]).concat([[0, 300, 2]]),
}));
// 5. warehouse: 24 x 16, one tall hall with a catwalk along the north wall
B(building('warehouse', {
    w: 2400, d: 1600, floors: 1, fh: 700, ext: 'metalSheet', inner: 'metalSheet', floor: 'floorConc', paint: false,
    roof: { type: 'gable', ridge: 'x', h: 300, mat: 'roofGrey', over: 40 },
    doors: [{ side: 's', at: 0, w: 500, h: 450 }, { side: 'e', at: 400, w: 120 }], winFloors: [0], sill: 450, winH: 120, winW: 160, winSpacing: 400,
    extra: (m, lod) => {
        if (lod !== 0) return;
        // catwalk: a slab 3 m up along the north wall, stairs up from the west
        m.slab(-1180, 380, 1180, 780, BASE + 300, BASE + 320, 'metalDark', 'metalDark', [], { edges: null });
        m.stairs(-1180, 0, -1060, 380, BASE, BASE + 320, '+z', 10, 'metalDark', 'metalDark');
        m.box(-1060 + SPAD, BASE + 320, 370, 1180, BASE + 420, 380, 'metalDark', { skip: 'bottom' });
        // shelving rows and crates
        for (const x of [-700, 0, 700]) m.box(x - 350, BASE, -200, x + 350, BASE + 240, -100, { top: 'crateWood', side: 'metalRust' }, { skip: 'bottom' });
        crates(m, -900, -500, BASE); crates(m, 500, -550, BASE); crates(m, 200, 200, BASE);
    },
    nav: [[0, -1020, 0, 1], [0, -500, 0, 2], [-800, 150, 0, 0], [800, 150, 0, 0], [-1120, -60, 0, 3], [-1120, 560, 320 / 700, 3], [0, 580, 320 / 700, 4], [900, 580, 320 / 700, 4], [1450, 400, 0, 1], [1000, 400, 0, 2]],
    links: [[0, 1], [1, 2], [1, 3], [2, 4], [4, 5], [5, 6], [6, 7], [8, 9], [9, 3]],
    loot: [[-900, -300, 0], [0, 0, 0], [700, -400, 0], [900, 300, 0], [-500, 580, 0], [500, 580, 0, 2]],
    tier: 2,
}));
// 6. barracks: 20 x 8, long single floor, two doors, rows of beds
B(building('barracks', {
    w: 2000, d: 800, floors: 1, ext: 'militaryG', inner: 'plasterIn2', floor: 'floorConc', paint: false,
    roof: { type: 'gable', ridge: 'x', h: 200, mat: 'roofGreen', over: 40 },
    doors: [{ side: 's', at: -500 }, { side: 's', at: 500 }, { side: 'w', at: 0 }],
    parts: [{ floor: 0, axis: 'z', c: 0, door: 0 }],
    furniture: (m, k, y) => { for (const x of [-850, -550, -250, 250, 550, 850]) bed(m, x, 250, y, false); shelf(m, -850, -280, y, true); shelf(m, 850, -280, y, true); },
    nav: [[-500, -620, 0, 1], [-500, -200, 0, 2], [-500, 0, 0, 0], [500, 0, 0, 0], [500, -200, 0, 2], [500, -620, 0, 1], [-1220, 0, 0, 1], [-850, 0, 0, 2]],
    links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [6, 7], [7, 2]],
    loot: [[-700, 250, 0], [-400, 250, 0], [400, 250, 0], [700, 250, 0], [-850, -150, 0], [850, -150, 0]],
    tier: 3,
}));
// 7. barn: 14 x 10, tall, hay loft over the west half
B(building('barn', {
    w: 1400, d: 1000, floors: 1, fh: 550, ext: 'barnRed', inner: 'woodPlank', floor: 'floorWood', paint: false,
    roof: { type: 'gable', ridge: 'x', h: 320, mat: 'roofGrey', over: 50 },
    doors: [{ side: 'e', at: 0, w: 320, h: 380 }, { side: 'w', at: 200 }], sill: 300, winH: 90, winW: 90, winSpacing: 450,
    extra: (m, lod) => {
        if (lod !== 0) return;
        m.slab(-680, -480, -50, 480, BASE + 280, BASE + 300, 'woodPlank', 'woodDark', [], { edges: null });
        m.stairs(-50, -480, 250, -360, BASE, BASE + 300, '-x', 10, 'woodPlank', 'woodDark');
        for (const [x, z] of [[300, -300], [450, 280], [-400, 250]]) m.box(x - 70, BASE, z - 50, x + 70, BASE + 90, z + 50, 'hay', { skip: 'bottom' });
        for (const [x, z] of [[-500, -250], [-300, 250]]) m.box(x - 70, BASE + 300, z - 50, x + 70, BASE + 390, z + 50, 'hay', { skip: 'bottom' });
    },
    nav: [[920, 0, 0, 1], [500, 0, 0, 2], [0, 0, 0, 0], [330, -420, 0, 3], [-130, -420, 300 / 550, 3], [-400, 0, 300 / 550, 4], [-920, 200, 0, 1], [-550, 200, 0, 2]],
    links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [6, 7], [7, 2]],
    loot: [[300, 0, 0], [0, 350, 0], [-400, -300, 300 / 550, 2], [-500, 300, 300 / 550, 2]],
}));
// 8. shed: 5 x 4
B(building('shed', {
    w: 500, d: 400, floors: 1, fh: 260, ext: 'woodPlank', inner: 'woodDark', floor: 'floorWood', paint: false,
    roof: { type: 'shed', h: 60, mat: 'metalRust' },
    doors: [{ side: 's', at: 0 }], winSpacing: 600,
    furniture: (m, k, y) => { shelf(m, -150, 150, y, true); },
    nav: [[0, -350, 0, 1], [0, 0, 0, 2]], links: [[0, 1]],
    loot: [[100, 80, 0]],
}));
// 9. hangar: 26 x 20, arched roof made of flat pieces, open toward the south
B(hangar());
function hangar() {
    const W2 = 1300, D2 = 1000, H0 = 250, R = 1300;
    const L = [new Model('hangar0'), new Model('hangar1'), new Model('hangar2')];
    const seg = 8;
    for (const [li, m] of L.entries()) {
        m.box(-W2, 0, -D2, W2, BASE, D2, 'concreteDark', { skip: 'top bottom', collide: li === 0 });   // not under the ground (see building)
        if (li === 0) m.slab(-W2, -D2, W2, D2, BASE - 10, BASE, 'floorConc', null, [], { collide: false });
        // the arch: piece i spans angles a0..a1 (0 = east, pi = west)
        const ang = (i) => Math.PI * i / seg;
        const pt = (i, z) => [Math.cos(ang(i)) * W2, BASE + H0 + Math.sin(ang(i)) * (R * 0.55), z];
        for (let i = 0; i < seg; i++) {
            const a = pt(i, -D2), b = pt(i + 1, -D2), c = pt(i + 1, D2), d = pt(i, D2);
            const mid = (ang(i) + ang(i + 1)) / 2;
            m.face(orderFace([a, b, c, d], [Math.cos(mid), Math.sin(mid), 0]), 'metalSheet');
            if (li === 0) m.face(orderFace([a, b, c, d], [-Math.cos(mid), -Math.sin(mid), 0]), 'metalDark');
        }
        // low side walls under the arch ends
        m.box(-W2, BASE, -D2, -W2 + 20, BASE + H0, D2, 'metalSheet', { skip: 'bottom top', collide: li === 0 });
        m.box(W2 - 20, BASE, -D2, W2, BASE + H0, D2, 'metalSheet', { skip: 'bottom top', collide: li === 0 });
        // the back wall: a fan of the arch outline
        const back = [pt(0, D2)]; for (let i = 0; i <= seg; i++) back.push(pt(i, D2)); back.push([-W2, BASE, D2], [W2, BASE, D2]);
        const poly = [[W2, BASE, D2]]; for (let i = 0; i <= seg; i++) poly.push(pt(i, D2)); poly.push([-W2, BASE, D2]);
        // split the fan into convex pieces around the bottom centre
        const cen = [0, BASE, D2];
        for (let i = 0; i + 1 < poly.length; i++) { m.face(orderFace([cen, poly[i], poly[i + 1]], [0, 0, 1]), 'metalSheet'); if (li === 0) m.face(orderFace([cen, poly[i], poly[i + 1]], [0, 0, -1]), 'metalDark'); }
        if (li === 0) {
            m.collider(-W2, BASE, D2 - 20, W2, BASE + H0 + R * 0.5, D2);
            // a parked plane-ish thing and crates for cover
            m.box(-300, BASE, -200, 300, BASE + 160, 500, { top: 'militaryG', side: 'militaryG' }, { skip: 'bottom' });
            m.box(-900, BASE, 200, 900, BASE + 60, 320, 'militaryG', { skip: 'bottom' });
            crates(m, -900, -600, BASE); crates(m, 700, 500, BASE); crates(m, 800, -500, BASE);
        }
    }
    const m0 = L[0];
    const nv = [[0, -1300, 1], [0, -600, 2], [-800, 0, 0], [800, 0, 0], [0, 700, 0], [-900, 700, 0], [900, -200, 0]];
    for (const [x, z, k] of nv) m0.navAt(x, BASE, z, k);
    m0.path(0, 1, 2, 4, 3, 1); m0.link(2, 5); m0.link(3, 6);
    for (const [x, z, w] of [[-700, -300, 1], [600, 200, 1], [0, 800, 2], [-1000, 600, 1], [1000, -800, 1]]) m0.lootAt(x, BASE + 2, z, w);
    return { name: 'hangar', lods: L, kind: 'building', foot: [2600, 2000], paint: false, tier: 3 };
}
// 10. watchtower: platform 4 x 4 at 7 m on four legs, two flights of stairs
B(tower());
function tower() {
    const L = [new Model('tower0'), new Model('tower1'), new Model('tower2')];
    const P = 700;
    for (const [li, m] of L.entries()) {
        for (const [x, z] of [[-180, -180], [180, -180], [180, 180], [-180, 180]]) m.box(x - 15, 0, z - 15, x + 15, P, z + 15, 'woodDark', { skip: 'bottom top', collide: li === 0 });
        m.box(-220, P, -220, 220, P + 20, 220, { top: 'woodPlank', side: 'woodDark', bottom: 'woodDark' }, { collide: li === 0 });
        // railings (low walls) and the roof
        if (li < 2) {
            m.wall('x', -210, -220, 220, P + 20, P + 120, 10, 'woodPlank', 'woodPlank', [], { out: -1, caps: true, top: true });
            m.wall('x', 210, -220, 220, P + 20, P + 120, 10, 'woodPlank', 'woodPlank', [{ a: -180, b: -60, y0: P + 20, y1: P + 120 }], { out: 1, caps: true, top: true });
            m.wall('z', -215, -205, 205, P + 20, P + 120, 10, 'woodPlank', 'woodPlank', [], { out: -1, caps: false, top: true });
            m.wall('z', 215, -205, 205, P + 20, P + 120, 10, 'woodPlank', 'woodPlank', [], { out: 1, caps: false, top: true });
            for (const [x, z] of [[-210, -210], [210, -210], [210, 210], [-210, 210]]) m.box(x - 8, P + 120, z - 8, x + 8, P + 300, z + 8, 'woodDark', { skip: 'bottom top', collide: false });
        }
        m.gable(-240, -240, 240, 240, P + 300, 100, 'x', 'roofBrown', null, 20, { under: li === 0 ? 'woodDark' : null });
        // stairs up the north side: a flight to a landing, a second flight to the platform edge
        if (li === 0) {
            m.stairs(60, 640, 180, 940, 0, 360, '-z', 10, 'woodPlank', 'woodDark');
            m.box(-180, 340, 520, 180, 360, 640, 'woodPlank', { skip: '' });
            for (const [x, z] of [[-170, 530], [170, 530], [-170, 630], [170, 630]]) m.box(x - 10, 0, z - 10, x + 10, 340, z + 10, 'woodDark', { skip: 'bottom top', collide: false });
            m.stairs(-180, 220, -60, 520, 360, P + 20, '-z', 10, 'woodPlank', 'woodDark');
        }
    }
    const m0 = L[0];
    m0.navAt(120, 0, 1040, 1); m0.navAt(0, 360, 580, 3); m0.navAt(-120, 360, 580, 3); m0.navAt(0, P + 20, 0, 4);
    m0.path(0, 1, 2, 3);
    m0.lootAt(-100, P + 22, -100, 2);
    return { name: 'tower', lods: L, kind: 'building', foot: [500, 2100], paint: false, tier: 3 };
}
// 11. gas station: a canopy over the pumps and a small shop
B(gasStation());
function gasStation() {
    const L = [new Model('gas0'), new Model('gas1'), new Model('gas2')];
    for (const [li, m] of L.entries()) {
        // forecourt slab
        m.box(-1100, 0, -900, 1100, 10, 900, { top: 'concrete', side: 'concreteDark' }, { skip: 'bottom', collide: li === 0 });
        // canopy
        for (const [x, z] of [[-600, -500], [600, -500], [-600, 100], [600, 100]]) m.box(x - 20, 10, z - 20, x + 20, 480, z + 20, 'trim', { skip: 'bottom top', collide: li === 0 });
        m.box(-750, 480, -650, 750, 540, 250, { top: 'trim', side: 'barrelRed', bottom: 'trim' }, { collide: false });
        if (li < 2) for (const x of [-300, 300]) m.box(x - 60, 10, -260, x + 60, 170, -140, { top: 'trim', side: 'barrelRed' }, { skip: 'bottom', collide: li === 0 });
    }
    // the shop: a small building merged in (north side)
    const shop = building('gasShop', {
        w: 900, d: 600, floors: 1, ext: 'trim', roof: { type: 'flat', parapet: 60 }, floor: 'floorTile', paint: false,
        doors: [{ side: 's', at: -200, w: 120 }], winW: 200, winH: 150, sill: 60, winSpacing: 280,
        furniture: (m, k, y) => { shelf(m, 0, 100, y, true); shelf(m, 250, -100, y, true); table(m, -280, 120, y); },
        nav: [[-200, -400, 0, 1], [-200, 0, 0, 2]], links: [[0, 1]], loot: [[100, -150, 0], [-250, 150, 0], [300, 150, 0]],
    });
    for (let li = 0; li < 3; li++) {
        const s = shop.lods[li], m = L[li], f0 = m.faces.length, b0 = m.boxes.length;
        for (const f of s.faces) m.faces.push({ v: f.v.map(p => [p[0], p[1], p[2] + 600]), m: f.m });
        for (const b of s.boxes) m.boxes.push([b[0], b[1], b[2] + 600, b[3], b[4], b[5] + 600]);
        if (li === 0) {
            const base = m.nav.length;
            for (const n of s.nav) m.nav.push([n[0], n[1], n[2] + 600, n[3]]);
            for (const [a, b] of s.navEdges) m.navEdges.push([a + base, b + base]);
            for (const l of s.loot) m.loot.push([l[0], l[1], l[2] + 600, l[3]]);
        }
    }
    const m0 = L[0];
    const a = m0.navAt(0, 15, -700, 1), b = m0.navAt(-800, 15, -200, 1);
    m0.link(a, 0); m0.link(b, 0);
    return { name: 'gas', lods: L, kind: 'building', foot: [2200, 1800], paint: false, tier: 1 };
}

// ------------------------------------------------------------------ props (decor; small; may share a cell)
export const PROPS = [];
const P = (name, lods, opt = {}) => { const p = { name, lods, kind: 'prop', ...opt }; PROPS.push(p); return p; };
const three = (name, f) => { const L = [0, 1, 2].map(i => { const m = new Model(name + i); f(m, i); return m; }); return L; };

P('pine', three('pine', (m, li) => {
    const n = li === 0 ? 6 : li === 1 ? 5 : 4;
    m.prism(0, 0, 22, 0, 260, li === 0 ? 5 : 4, 'bark', { top: false, collide: false });
    if (li === 0) { m.prism(0, 0, 260, 160, 520, n, 'pine', { r1: 0 }); m.prism(0, 0, 210, 400, 760, n, 'pine2', { r1: 0, phase: 0.4 }); m.prism(0, 0, 150, 640, 980, n, 'pine', { r1: 0, phase: 0.8 }); }
    else if (li === 1) { m.prism(0, 0, 250, 160, 600, n, 'pine', { r1: 0 }); m.prism(0, 0, 170, 520, 980, n, 'pine2', { r1: 0, phase: 0.5 }); }
    else m.prism(0, 0, 230, 160, 980, n, 'pine', { r1: 0 });
    if (li === 0) m.collider(-25, 0, -25, 25, 600, 25);
}), { radius: 260, height: 980 });
P('oak', three('oak', (m, li) => {
    m.prism(0, 0, 28, 0, 300, li === 0 ? 5 : 4, 'bark', { top: false, collide: false });
    if (li === 0) {
        m.prism(0, 0, 260, 260, 480, 6, 'leaf', { r1: 300, top: false, bottom: true });
        m.prism(0, 0, 300, 480, 650, 6, 'leaf2', { r1: 200, phase: 0.5 });
        m.prism(0, 0, 200, 650, 760, 6, 'leaf', { r1: 60, phase: 0.2 });
    } else if (li === 1) { m.prism(0, 0, 280, 260, 560, 5, 'leaf', { r1: 260, bottom: true }); m.prism(0, 0, 260, 560, 740, 5, 'leaf2', { r1: 60 }); }
    else m.prism(0, 0, 300, 260, 740, 4, 'leaf', { r1: 120, bottom: true });
    if (li === 0) m.collider(-30, 0, -30, 30, 300, 30);
}), { radius: 300, height: 760 });
P('bush', three('bush', (m, li) => {
    if (li === 0) { m.prism(0, 0, 110, 0, 70, 6, 'bush', { r1: 130 }); m.prism(0, 0, 130, 70, 150, 6, 'leaf', { r1: 50, phase: 0.5 }); }
    else m.prism(0, 0, 120, 0, 140, 4, 'bush', { r1: 50 });
}), { radius: 130, height: 150, bush: true });
for (const [name, s, mt] of [['rockA', 1, 'rock'], ['rockB', 1.8, 'rock2'], ['rockC', 3.2, 'rock']]) P(name, three(name, (m, li) => {
    // a lumpy block: an irregular frustum
    const n = li === 0 ? 7 : 5, r0 = 120 * s, r1 = 70 * s, h = 110 * s;
    m.prism(0, 0, r0, -20, h * 0.55, n, mt, { r1: r0 * 0.92, top: false, phase: 0.3 });
    m.prism(0, 0, r0 * 0.92, h * 0.55, h, n, li === 0 ? 'rock2' : mt, { r1: r1, phase: 0.3 });
    if (li === 0) m.collider(-r0 * 0.75, -20, -r0 * 0.75, r0 * 0.75, h * 0.9, r0 * 0.75);
}), { radius: 120 * s, height: 110 * s, cover: true });
P('crate', three('crate', (m, li) => { m.box(-60, 0, -60, 60, 120, 60, { top: 'crateWood', side: 'crateWood' }, { skip: 'bottom', collide: li === 0 }); if (li === 0) m.box(-40, 120, -45, 50, 200, 45, 'crateGreen', { skip: 'bottom' }); }), { radius: 90, height: 200, cover: true });
P('sandbag', three('sandbag', (m, li) => {
    m.box(-200, 0, -40, 200, 55, 40, 'sandbag', { skip: 'bottom', collide: li === 0 });
    m.box(-180, 55, -35, 180, 105, 35, 'sandbag', { skip: 'bottom', collide: li === 0 });
    if (li === 0) m.box(-150, 105, -30, 150, 125, 30, 'sandbag', { skip: 'bottom' });
}), { radius: 210, height: 125, cover: true, line: true });
P('barrier', three('barrier', (m, li) => {
    // a concrete jersey barrier: trapezoid section
    const pts = (x) => [[x, 0, -45], [x, 30, -45], [x, 110, -15], [x, 110, 15], [x, 30, 45], [x, 0, 45]];
    const A = pts(-200), Bp = pts(200);
    for (let i = 0; i + 1 < 6; i++) m.face(orderFace([A[i], A[i + 1], Bp[i + 1], Bp[i]], [0, A[i][1] + A[i + 1][1] > 200 ? 1 : 0, (A[i][2] + A[i + 1][2]) / 2]), 'concrete');
    m.face(orderFace(A, [-1, 0, 0]), 'concrete'); m.face(orderFace(Bp, [1, 0, 0]), 'concrete');
    if (li === 0) m.collider(-200, 0, -45, 200, 110, 45);
}), { radius: 200, height: 110, cover: true, line: true });
P('fence', three('fence', (m, li) => {
    for (const x of [-195, 195]) m.box(x - 6, 0, -6, x + 6, 120, 6, 'woodDark', { skip: 'bottom', collide: false });
    m.box(-200, 30, -3, 200, 55, 3, 'fenceWood', { skip: 'bottom', collide: false });
    m.box(-200, 80, -3, 200, 105, 3, 'fenceWood', { skip: 'bottom', collide: false });
    if (li === 0) m.collider(-200, 0, -5, 200, 110, 5);
}), { radius: 200, height: 120, line: true });
P('car', three('car', (m, li) => {
    // an abandoned car: body, cabin with windows, wheels
    m.box(-220, 35, -85, 220, 105, 85, { top: 'carBody1', side: 'carBody1', bottom: 'metalDark' }, { collide: false });
    m.box(-110, 105, -78, 110, 160, 78, { top: 'carBody1', side: 'carGlass' }, { skip: 'bottom', collide: false });
    if (li === 0) {
        for (const [x, z] of [[-140, -88], [140, -88], [-140, 88], [140, 88]]) m.prismZ(x, 35, 35, z - 12 * Math.sign(-z), z, 6, 'tyre', { caps: true });
        m.box(-226, 60, -60, -220, 85, 60, 'trim', { collide: false });
        m.collider(-220, 0, -85, 220, 160, 85);
    }
}), { radius: 240, height: 160, cover: true, paint: true });
P('barrels', three('barrels', (m, li) => {
    for (const [x, z, mt] of [[-50, -40, 'barrelRed'], [45, -30, 'barrelBlue'], [0, 50, 'barrelRed']]) m.prism(x, z, 32, 0, 95, li === 0 ? 7 : 5, mt, { top: true, collide: false });
    if (li === 0) m.collider(-85, 0, -75, 80, 95, 85);
}), { radius: 90, height: 95, cover: true });
P('hay', three('hay', (m, li) => { m.prismX(70, 0, 70, -90, 90, li === 0 ? 7 : 5, 'hay'); if (li === 0) m.collider(-90, 0, -70, 90, 140, 70); }), { radius: 110, height: 140, cover: true });
P('container', three('container', (m, li) => {
    // 6 x 2.4 x 2.6, open at the east end (doors swung open)
    const X0 = -300, X1 = 300, Z0 = -120, Z1 = 120, H = 260;
    if (li === 0) {
        m.wall('x', Z0 + 4, X0, X1, 0, H, 8, 'containerR', 'metalDark', [], { out: -1, caps: true, top: false });
        m.wall('x', Z1 - 4, X0, X1, 0, H, 8, 'containerR', 'metalDark', [], { out: 1, caps: true, top: false });
        m.wall('z', X0 + 4, Z0 + 8, Z1 - 8, 0, H, 8, 'containerR', 'metalDark', [], { out: -1, caps: false, top: false });
        m.box(X0, H, Z0, X1, H + 8, Z1, { top: 'containerR', side: 'containerR', bottom: 'metalDark' });
        m.slab(X0 + 8, Z0 + 8, X1, Z1 - 8, 0, 8, 'woodDark', null, [], { collide: true });
        // the open doors, swung back against the sides
        m.box(X1, 0, Z0 - 4, X1 + 115, H, Z0, 'containerR', { skip: 'top bottom', collide: false });
        m.box(X1, 0, Z1, X1 + 115, H, Z1 + 4, 'containerR', { skip: 'top bottom', collide: false });
    } else {
        m.box(X0, 0, Z0, X1, H + 8, Z1, { top: 'containerR', side: 'containerR' }, { skip: 'bottom e', collide: false });
        m.quad([X1, 0, Z0], [X1, H, Z0], [X1, H, Z1], [X1, 0, Z1].map(x => x), 'metalDark');
    }
    if (li === 0) { m.lootAt(-150, 10, 0, 1); }
}), { radius: 330, height: 270, paint: true, enter: true });
P('silo', three('silo', (m, li) => {
    const n = li === 0 ? 10 : li === 1 ? 8 : 6;
    m.prism(0, 0, 300, 0, 1200, n, 'metalSheet', { top: false, collide: li === 0 });
    m.prism(0, 0, 300, 1200, 1450, n, 'roofGrey', { r1: 40 });
}), { radius: 300, height: 1450 });
P('watertower', three('watertower', (m, li) => {
    for (const [x, z] of [[-200, -200], [200, -200], [200, 200], [-200, 200]]) m.box(x - 15, 0, z - 15, x + 15, 1000, z + 15, 'metalDark', { skip: 'bottom top', collide: li === 0 });
    m.prism(0, 0, 320, 1000, 1500, li === 0 ? 10 : 7, 'paintGrey', { bottom: true, top: false });
    m.prism(0, 0, 320, 1500, 1650, li === 0 ? 10 : 7, 'roofGrey', { r1: 30 });
}), { radius: 330, height: 1650 });
P('pole', three('pole', (m, li) => { m.box(-12, 0, -12, 12, 900, 12, 'woodDark', { skip: 'bottom', collide: li === 0 }); if (li < 2) m.box(-90, 820, -6, 90, 835, 6, 'woodDark', { skip: 'bottom', collide: false }); }), { radius: 90, height: 900 });

// v1.1: more cover out in the open - fallen logs, earth mounds (a small hill you can walk up:
// the colliders are 45 cm steps), dry-stone walls, hedges, a two-step outcrop of rock
P('log', three('log', (m, li) => {
    m.prismX(38, 0, 38, -260, 260, li === 0 ? 7 : 5, 'bark', { phase: 0.3 });
    if (li === 0) { m.prism(-200, 0, 30, 0, 55, 5, 'woodDark', { top: true }); m.box(150, 40, -6, 175, 120, 6, 'bark', { skip: 'bottom', collide: false }); m.collider(-260, 0, -38, 260, 76, 38); }
}), { radius: 260, height: 90, cover: true, line: true });
for (const [name, s] of [['mound', 1], ['moundL', 1.6]]) P(name, three(name, (m, li) => {
    const n = li === 0 ? 8 : li === 1 ? 6 : 4, r0 = 520 * s, r1 = 230 * s, h = 160 * Math.min(1.25, s);
    if (li === 2) { m.prism(0, 0, r0 * 0.9, -30, h, n, 'grass', { r1, phase: 0.4 }); return; }
    m.prism(0, 0, r0, -30, h * 0.45, n, 'grass', { r1: (r0 + r1) * 0.55, top: false, phase: 0.2 });
    m.prism(0, 0, (r0 + r1) * 0.55, h * 0.45, h, n, li === 0 ? 'grassDry' : 'grass', { r1, phase: 0.2 });
    if (li === 0) {
        // steps of 45 cm up the slope (a person walks up, a bullet stops)
        const k = Math.ceil(h / 45);
        for (let i = 0; i < k; i++) { const y1 = Math.min(h - 5, (i + 1) * 45), rr = (r0 - (r0 - r1) * (y1 / h)) * 0.86; m.collider(-rr, -30, -rr * 0.86, rr, y1, rr * 0.86); m.collider(-rr * 0.86, -30, -rr, rr * 0.86, y1, rr); }
        if (s > 1) m.prism(r1 * 0.3, -r1 * 0.2, 70, h - 10, h + 55, 5, 'rock2', { r1: 40, collide: true });
    }
}), { radius: 520 * s, height: 160 * s, cover: true });
P('stonewall', three('stonewall', (m, li) => {
    m.box(-300, 0, -35, 300, 70, 35, { top: 'rock2', side: 'rock' }, { skip: 'bottom', collide: li === 0 });
    m.box(-290, 70, -28, 290, 105, 28, { top: 'rock', side: 'rock2' }, { skip: 'bottom', collide: li === 0 });
    if (li === 0) { for (const x of [-220, -40, 130]) m.box(x, 105, -24, x + 70, 120, 24, 'rock', { skip: 'bottom', collide: false }); m.box(260, 0, -40, 320, 60, 40, 'rock2', { skip: 'bottom' }); }
}), { radius: 320, height: 120, cover: true, line: true });
P('hedge', three('hedge', (m, li) => {
    m.box(-280, 0, -55, 280, 140, 55, { top: 'leaf', side: 'bush' }, { skip: 'bottom', collide: false });
    if (li === 0) { m.box(-250, 140, -40, -60, 170, 40, 'leaf2', { skip: 'bottom', collide: false }); m.box(40, 140, -45, 230, 165, 45, 'leaf', { skip: 'bottom', collide: false }); }
}), { radius: 290, height: 170, bush: true, line: true });
P('rockD', three('rockD', (m, li) => {
    const n = li === 0 ? 7 : 5;
    if (li === 2) { m.prism(0, 0, 420, -30, 190, 4, 'rock', { r1: 300, phase: 0.5 }); m.prism(120, 60, 190, 190, 380, 4, 'rock', { r1: 110 }); return; }
    m.prism(0, 0, 420, -30, 140, n, 'rock', { r1: 360, top: false, phase: 0.5 });
    m.prism(0, 0, 360, 140, 190, n, 'rock2', { r1: 300, phase: 0.5 });
    m.prism(120, 60, 190, 190, 380, n, 'rock', { r1: 110, phase: 0.1 });
    if (li === 0) { m.collider(-300, -30, -300, 300, 185, 300); m.collider(-10, 185, -60, 250, 360, 180); m.prism(-260, -200, 90, -10, 110, 5, 'rock2', { r1: 50, collide: true }); }
}), { radius: 430, height: 380, cover: true });

// ------------------------------------------------------------------ v1.3: the desert and the snow
// (after everything else: the island's prefabs keep their numbers)
export const EXTRA = [];
const X = (p) => { EXTRA.push(p); return p; };
const PX = (name, lods, opt = {}) => X({ name, lods, kind: 'prop', ...opt });
// a four-sided limb from a to b, r thick (branches, a leaning trunk)
function limb(m, a, b, r, mt, { cap = true } = {}) {
    const d = sub(b, a), u = norm(d);
    const t = Math.abs(u[1]) < 0.9 ? norm(cross(u, [0, 1, 0])) : [1, 0, 0];
    const w = cross(t, u);
    const C = (p, s1, s2, k) => [p[0] + (t[0] * s1 + w[0] * s2) * r * k, p[1] + (t[1] * s1 + w[1] * s2) * r * k, p[2] + (t[2] * s1 + w[2] * s2) * r * k];
    const S = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    const A = S.map(([p, q]) => C(a, p, q, 1)), B = S.map(([p, q]) => C(b, p, q, 0.8));
    for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4, [p, q] = S[i], [p2, q2] = S[j];
        const out = [t[0] * (p + p2) + w[0] * (q + q2), t[1] * (p + p2) + w[1] * (q + q2), t[2] * (p + p2) + w[2] * (q + q2)];
        m.face(orderFace([A[i], A[j], B[j], B[i]], out), mt);
    }
    if (cap) m.face(orderFace(B, u), mt);
}
// a leaf seen from both sides: a strip from a through b to c, w wide at b (pointed at a and c)
function frond(m, a, b, c, w, mt) {
    const d = norm(sub(c, a)), side = norm(cross(d, [0, 1, 0])), sw = side.map(v => v * w);
    const L = [b[0] + sw[0], b[1] + sw[1], b[2] + sw[2]], Rr = [b[0] - sw[0], b[1] - sw[1], b[2] - sw[2]];
    // two triangles folded along the midrib, each seen from both sides
    for (const v of [[a, L, c], [a, c, Rr]]) { m.face(v, mt); m.face(v.slice().reverse(), mt); }
}
// desert houses: thick adobe walls (the plaster colours: the desert map turns them to clay, ochre,
// whitewash), a flat roof behind a parapet you can get up on, roof beams through the walls, an awning
function adobeExtra(m, li, { W2, D2, top }) {
    if (li > 0) return;
    // the beams (vigas) poking out under the parapet, south and north
    for (const sz of [-1, 1]) for (let x = -W2 + 100; x <= W2 - 100; x += 200) m.box(x - 9, top - 40, sz * D2 - (sz < 0 ? 45 : 0), x + 9, top - 22, sz * D2 + (sz > 0 ? 45 : 0), 'woodDark', { skip: 'bottom', collide: false });
    if (li === 0) {
        // a cloth awning on two poles over the door side, water jars by the wall
        m.box(-W2 + 60, 235, -D2 - 190, -W2 + 330, 242, -D2, { top: 'canvas', side: 'canvas', bottom: 'canvas' }, { collide: false });
        for (const x of [-W2 + 66, -W2 + 324]) m.box(x - 5, 0, -D2 - 186, x + 5, 235, -D2 - 176, 'woodDark', { skip: 'bottom top', collide: false });
    }
}
X(building('adobeS', {
    w: 900, d: 800, floors: 1, ext: 'plasterY', inner: 'plasterIn', floor: 'floorTile', roof: { type: 'flat', parapet: 80 }, roofAccess: true, headMat: 'plasterY',
    doors: [{ side: 's', at: 120 }, { side: 'n', at: -200 }], winW: 80, winH: 90, sill: 110, winSpacing: 280,
    stair: { x0: 260, z0: -250, x1: 380, z1: 30, dir: '+z' },
    parts: [{ floor: 0, axis: 'x', c: 60, a: -430, b: 200, door: -250 }],
    furniture: (m, k, y) => { table(m, -250, 230, y); bed(m, -200, -230, y, true); shelf(m, 100, 330, y, true); },
    nav: [[120, -620, 0, 1], [120, -200, 0, 2], [-250, -150, 0, 0], [-250, 250, 0, 0], [320, -320, 0, 3], [320, 110, 1, 4], [-250, 250, 1, 4], [-200, 620, 0, 1]],
    links: [[0, 1], [1, 2], [2, 3], [1, 4], [4, 5], [5, 6], [3, 7]],
    loot: [[-300, -250, 0], [-250, 300, 0], [100, 250, 0], [-300, 0, 1, 0.5]],
    extra: adobeExtra, tier: 1,
}));
X(building('adobeM', {
    w: 1200, d: 900, floors: 2, ext: 'plasterW', inner: 'plasterIn', floor: 'floorTile', roof: { type: 'flat', parapet: 90 }, roofAccess: true, headMat: 'plasterW',
    doors: [{ side: 's', at: -300 }, { side: 'e', at: 200 }], winW: 80, winH: 100, sill: 105, winSpacing: 300,
    stair: { x0: 420, z0: -380, x1: 540, z1: -100, dir: '+z' },
    parts: [{ floor: 0, axis: 'z', c: 100, a: -430, b: 430, door: -200 }, { floor: 1, axis: 'z', c: 100, a: -430, b: 430, door: 200 }],
    furniture: (m, k, y) => { if (k === 0) { table(m, -350, 200, y); sofa(m, -350, -250, y, true); shelf(m, 300, 330, y, true); } else { bed(m, -350, 250, y, true); bed(m, -350, -250, y, true); shelf(m, 250, 330, y, true); } },
    nav: [[-300, -670, 0, 1], [-300, -250, 0, 2], [-300, 200, 0, 0], [300, -200, 0, 0], [480, -450, 0, 3], [480, -30, 1, 3], [300, 200, 1, 0], [-300, 200, 1, 0], [480, -450, 1, 3], [480, -30, 2, 4], [-400, 300, 2, 4], [820, 200, 0, 1], [300, 250, 0, 0], [300, -240, 1, 0]],
    links: [[0, 1], [1, 2], [1, 3], [3, 4], [4, 5], [5, 6], [6, 7], [5, 13], [13, 8], [8, 9], [9, 10], [3, 12], [12, 11]],
    loot: [[-350, 250, 0], [-350, -250, 0], [300, 300, 0], [-350, 250, 1], [-350, -150, 1], [300, 250, 1], [0, 0, 2, 0.5]],
    extra: adobeExtra, tier: 2,
}));
// a saguaro: a ribbed trunk and two arms
PX('cactus', three('cactus', (m, li) => {
    const n = li === 0 ? 8 : li === 1 ? 6 : 4;
    m.prism(0, 0, 24, 0, 430, n, 'cactus', { r1: 20, phase: 0.2 });
    if (li < 2) {
        if (li === 0) m.prism(0, 0, 20, 430, 455, n, 'cactus2', { r1: 8 });
        // arms: out, then up
        for (const [s, y0, len, up] of [[1, 170, 70, 150], [-1, 240, 55, 120]]) {
            m.box(s > 0 ? 0 : -len, y0, -14, s > 0 ? len : 0, y0 + 28, 14, 'cactus', { skip: li ? 'top bottom' : '', collide: false });
            m.prism(s * len, 0, 16, y0, y0 + up, li === 0 ? 6 : 4, 'cactus', { r1: 13 });
            if (li === 0) m.prism(s * len, 0, 13, y0 + up, y0 + up + 14, 6, 'cactus2', { r1: 5 });
        }
    }
    if (li === 0) m.collider(-20, 0, -20, 20, 430, 20);
}), { radius: 90, height: 455 });
// prickly pear and barrel cacti: a low clump you can crouch in
PX('cactusS', three('cactusS', (m, li) => {
    if (li === 2) { m.prism(0, 0, 90, 0, 90, 4, 'cactus2', { r1: 50 }); return; }
    m.prism(-40, 10, 40, 0, 70, li ? 5 : 7, 'cactus', { r1: 30, phase: 0.3 });
    m.prism(35, -20, 34, 0, 95, li ? 5 : 7, 'cactus2', { r1: 26 });
    if (li === 0) m.prism(10, 45, 28, 0, 55, 6, 'cactus', { r1: 22 });
    if (li === 0) { m.obox(-30, 95, 0, 28, 30, 6, 20, 'cactus2', { ay: 30 }); m.obox(40, 120, -10, 24, 26, 6, -25, 'cactus', { ay: 70 }); m.obox(0, 70, 45, 22, 24, 5, 15, 'cactus2', { ay: 120 }); }
}), { radius: 100, height: 140, bush: true });
// a palm: a leaning trunk in three pieces, a crown of drooping fronds, dates
PX('palm', three('palm', (m, li) => {
    const pts = [[0, 0, 0], [25, 300, 10], [70, 560, 25], [130, 780, 40]];
    if (li === 2) {
        limb(m, pts[0], pts[3], 22, 'palmTrunk');
        for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.3, c = Math.cos(a), d = Math.sin(a), e = Math.cos(a + 1.2), f = Math.sin(a + 1.2); const v = [[130, 790, 40], [130 + c * 320, 650, 40 + d * 320], [130 + e * 200, 700, 40 + f * 200]]; m.face(v, 'palmLeaf'); m.face(v.slice().reverse(), 'palmLeaf'); }
        return;
    }
    for (let i = 0; i + 1 < pts.length; i++) limb(m, pts[i], pts[i + 1], li === 2 ? 22 : 24 - i * 3, 'palmTrunk', { cap: i === pts.length - 2 });
    const T = pts[3], n = li === 0 ? 9 : li === 1 ? 7 : 5;
    for (let k = 0; k < n; k++) {
        const a = k / n * Math.PI * 2 + 0.3, dx = Math.cos(a), dz = Math.sin(a), L = li === 2 ? 300 : 330;
        frond(m, [T[0], T[1] + 10, T[2]], [T[0] + dx * L * 0.45, T[1] + 45, T[2] + dz * L * 0.45], [T[0] + dx * L, T[1] - 150, T[2] + dz * L], li === 2 ? 60 : 55, k % 2 ? 'palmLeaf' : 'leaf');
    }
    if (li === 0) { m.prism(T[0], T[2], 30, T[1] - 70, T[1] - 5, 5, 'woodDark', { r1: 20 }); m.collider(-28, 0, -28, 28, 560, 28); }
}), { radius: 330, height: 820 });
// a dead tree: a bare trunk and branches
PX('deadTree', three('deadTree', (m, li) => {
    const T = [10, 300, -5];
    limb(m, [0, -10, 0], T, li === 2 ? 20 : 18, 'deadwood');
    if (li < 2) {
        const br = [[[10, 300, -5], [-120, 470, 30], 9], [[10, 300, -5], [140, 520, -40], 9], [[10, 300, -5], [30, 560, 60], 8]];
        if (li === 0) br.push([[5, 200, 0], [120, 300, 90], 7]);
        if (li === 0) br.push([[-120, 470, 30], [-200, 540, 0], 5], [[140, 520, -40], [200, 600, -20], 5], [[30, 560, 60], [-20, 640, 100], 4]);
        for (const [a, b, r] of br) limb(m, a, b, r, 'deadwood');
    }
    if (li === 0) m.collider(-20, 0, -20, 20, 300, 20);
}), { radius: 200, height: 640 });
// a Bedouin tent: a low ridge of cloth on poles, open in front; something to hide in
PX('tent', three('tent', (m, li) => {
    const W = 260, D = 220, H = 210, E = 120;
    m.quad([-W, E, -D], [-W, H, 0], [W, H, 0], [W, E, -D], 'canvas');
    m.quad([W, E, D], [W, H, 0], [-W, H, 0], [-W, E, D], 'canvas');
    if (li === 0) {
        m.quad([-W, E, -D], [W, E, -D], [W, H, 0], [-W, H, 0], 'sheet');
        m.quad([W, E, D], [-W, E, D], [-W, H, 0], [W, H, 0], 'sheet');
        // the back closed, poles at the corners and the ridge
        m.face(orderFace([[-W, 0, -D], [-W, E, -D], [-W, H, 0], [-W, E, D], [-W, 0, D]], [-1, 0, 0]), 'canvas');
        for (const [x, z, h] of [[W, -D, E], [W, D, E], [-W, -D, E], [-W, D, E], [0, 0, H]]) m.box(x - 5, 0, z - 5, x + 5, h, z + 5, 'woodDark', { skip: 'bottom top', collide: false });
    }
    if (li === 0) { m.box(-180, 0, -150, -40, 30, 150, 'sofa', { skip: 'bottom' }); m.collider(-W, 0, -D, -W + 10, E, D); m.lootAt(60, 2, 0, 1); }
}), { radius: 300, height: 210, bush: true });
// an oil pumpjack: base, samson post, walking beam with the horse head, cranks and weights, motor
PX('pumpjack', three('pumpjack', (m, li) => {
    m.box(-380, 0, -110, 380, 40, 110, 'concrete', { skip: 'bottom' });
    if (li === 2) { m.box(-300, 40, -40, 300, 420, 40, 'containerY', { skip: 'bottom' }); return; }
    limb(m, [-60, 40, -90], [0, 400, 0], 12, 'metalDark'); limb(m, [-60, 40, 90], [0, 400, 0], 12, 'metalDark'); limb(m, [80, 40, 0], [0, 400, 0], 12, 'metalDark');
    m.box(-330, 395, -20, 260, 440, 20, { top: 'containerY', side: 'containerY', bottom: 'metalDark' }, { collide: false });
    // the horse head over the well
    m.obox(300, 360, 0, 50, 110, 22, -20, 'containerY');
    m.box(305, 40, -8, 315, 260, 8, 'gunSteel', { skip: 'bottom', collide: false });
    m.prism(310, 0, 30, 40, 80, 6, 'metalDark', { r1: 22 });
    if (li > 0) return;
    // cranks, weights, motor
    m.box(-330, 120, -70, -250, 330, -50, 'metalDark', { skip: '', collide: false }); m.box(-330, 120, 50, -250, 330, 70, 'metalDark', { skip: '', collide: false });
    m.box(-360, 110, -95, -220, 190, 95, 'containerR', { skip: 'bottom', collide: false });
    m.box(-370, 40, -60, -270, 110, 60, 'metalSheet', { skip: 'bottom' }); m.collider(-380, 0, -110, 380, 120, 110); m.collider(-40, 0, -40, 40, 400, 40);
}), { radius: 400, height: 460, cover: true });
// a pine under snow: dark tiers, each with a white cap
PX('pineSnow', three('pineSnow', (m, li) => {
    const n = li === 0 ? 6 : li === 1 ? 5 : 4;
    m.prism(0, 0, 22, 0, 260, li === 0 ? 5 : 4, 'bark', { top: false, collide: false });
    if (li === 2) { m.prism(0, 0, 230, 160, 980, n, 'pine', { r1: 0 }); return; }
    const tiers = li === 0 ? [[260, 160, 520], [210, 400, 760], [150, 640, 980]] : [[250, 160, 600], [170, 520, 980]];
    tiers.forEach(([r, y0, y1], i) => {
        const ym = y0 + (y1 - y0) * 0.45, rm = r * (1 - 0.45);
        m.prism(0, 0, r, y0, ym, n, i % 2 ? 'pine2' : 'pine', { r1: rm, top: false, phase: i * 0.4 });
        m.prism(0, 0, rm * 1.05, ym - 8, y1, n, 'snowCap', { r1: 0, phase: i * 0.4 });
    });
    if (li === 0) m.collider(-25, 0, -25, 25, 600, 25);
}), { radius: 260, height: 980 });

// every prefab: buildings first, then props (then the v1.3 ones)
export const ALL = [...BUILDINGS, ...PROPS, ...EXTRA];
export const byName = Object.fromEntries(ALL.map((p, i) => [p.name, { ...p, id: i + 1 }]));
