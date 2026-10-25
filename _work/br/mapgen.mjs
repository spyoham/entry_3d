// The island: terrain, sites (towns, base, port, farms), roads, buildings, props,
// navigation nodes, loot spots. Deterministic (a fixed seed).
//
// World: x east, z north, y up, cm. The map is 0..MAP on x and z, cut into
// CELLS x CELLS cells of CS cm; terrain heights on the cell corners (GRID = CELLS + 1).
import { buildBSP, leafOf, dot } from './geom.mjs';
import { BUILDINGS, PROPS, ALL } from './prefabs.mjs';

export const CS = 3200, CELLS = 64, GRID = CELLS + 1, MAP = CS * CELLS;

export function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// smooth value noise
function noise2(seed) {
    const R = rng(seed), N = 256, P = Array.from({ length: N }, () => R());
    const perm = Array.from({ length: N }, (_, i) => i); for (let i = N - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
    const h = (x, y) => P[(perm[(x & 255)] + y) & 255];
    const s = (t) => t * t * (3 - 2 * t);
    return (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = s(xf), v = s(yf);
        return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v; };
}
const fbm = (n, x, y, oct = 4) => { let a = 0, f = 1, w = 0.5, t = 0; for (let i = 0; i < oct; i++) { a += w * n(x * f, y * f); t += w; f *= 2; w *= 0.5; } return a / t; };

// sites, in metres (the map is 2048 m)
export const SITES = [
    { name: '중앙시', kind: 'city', x: 1030, z: 1010, r: 125, tier: 2 },
    { name: '군사기지', kind: 'base', x: 520, z: 1520, r: 130, tier: 3 },
    { name: '항구', kind: 'port', x: 1520, z: 560, r: 120, tier: 2 },
    { name: '솔밭마을', kind: 'village', x: 690, z: 690, r: 85, tier: 1 },
    { name: '갈대마을', kind: 'village', x: 1440, z: 1420, r: 85, tier: 1 },
    { name: '북쪽마을', kind: 'village', x: 1150, z: 1640, r: 75, tier: 1 },
    { name: '서쪽마을', kind: 'village', x: 420, z: 1020, r: 75, tier: 1 },
    { name: '윗들농장', kind: 'farm', x: 820, z: 1260, r: 60, tier: 1 },
    { name: '아랫들농장', kind: 'farm', x: 1290, z: 790, r: 60, tier: 1 },
    { name: '동쪽농장', kind: 'farm', x: 1690, z: 1080, r: 55, tier: 1 },
    { name: '주유소', kind: 'gas', x: 860, z: 960, r: 20, tier: 1 },
    { name: '고개주유소', kind: 'gas', x: 1270, z: 1240, r: 20, tier: 1 },
    { name: '학교', kind: 'school', x: 920, z: 560, r: 45, tier: 2 },
];
const ROADS = [[0, 10], [10, 6], [6, 1], [0, 11], [11, 4], [4, 5], [0, 8], [8, 2], [0, 12], [12, 3], [3, 6], [0, 7], [7, 1], [8, 9], [9, 4], [5, 1], [2, 9], [3, 12]];

export function generate(seed = 20261025) {
    const R = rng(seed);
    const nA = noise2(seed + 1), nB = noise2(seed + 2), nF = noise2(seed + 3), nD = noise2(seed + 4);
    // ---------------- heights (cm)
    const H = new Float64Array(GRID * GRID);
    const gi = (x, z) => z * GRID + x;
    for (let z = 0; z < GRID; z++) for (let x = 0; x < GRID; x++) {
        const mx = x * CS / 100, mz = z * CS / 100;                       // metres
        const dx = (mx - 1024) / 1024, dz = (mz - 1024) / 1024;
        // island: a lumpy disc
        const ang = Math.atan2(dz, dx);
        const coast = 0.86 + 0.09 * Math.sin(ang * 3 + 0.7) + 0.06 * Math.sin(ang * 5 + 2.1) + 0.08 * (fbm(nB, mx / 300, mz / 300) - 0.5);
        const r = Math.hypot(dx, dz) / coast;
        let land = 1 - Math.pow(Math.max(0, r), 6);                  // 1 inland .. 0 at the coast
        let h = land * 900 - 450;                                       // the shore band
        h += (fbm(nA, mx / 380, mz / 380) - 0.5) * 1800 * Math.max(0, land);       // rolling
        // a mountain ridge in the north-east, low hills in the south-west
        const ridge = Math.exp(-Math.pow(((mx - 1500) * 0.8 + (mz - 1650) * 0.6) / 260, 2) - Math.pow(((mx - 1500) * -0.6 + (mz - 1650) * 0.8) / 520, 2));
        h += ridge * 6500 * (0.7 + 0.6 * fbm(nD, mx / 120, mz / 120));
        const hills = Math.exp(-Math.pow((mx - 560) / 330, 2) - Math.pow((mz - 520) / 260, 2));
        h += hills * 2600 * fbm(nD, mx / 150 + 7, mz / 150);
        // a lake east of the city
        const lake = Math.exp(-Math.pow((mx - 1330) / 85, 2) - Math.pow((mz - 1040) / 60, 2));
        h -= lake * 1600;
        if (r > 1.05) h = Math.min(h, -400 - (r - 1.05) * 3000);
        H[gi(x, z)] = h;
    }
    // sites: flatten toward their base height
    for (const s of SITES) {
        const cx = s.x * 100 / CS, cz = s.z * 100 / CS, rr = s.r * 100 / CS + 1.5;
        let base = 0, n = 0;
        for (let z = 0; z < GRID; z++) for (let x = 0; x < GRID; x++) { const d = Math.hypot(x - cx, z - cz); if (d < rr) { base += H[gi(x, z)]; n++; } }
        base = Math.max(250, base / Math.max(1, n));
        s.base = base;
        for (let z = 0; z < GRID; z++) for (let x = 0; x < GRID; x++) {
            const d = Math.hypot(x - cx, z - cz);
            const w = d < rr ? 1 : d < rr + 2.5 ? 1 - (d - rr) / 2.5 : 0;
            if (w > 0) H[gi(x, z)] = H[gi(x, z)] * (1 - w * 0.92) + base * w * 0.92;
        }
    }
    const hAt = (x, z) => {   // cm world -> height (two triangles per cell, split on the x = z diagonal)
        const fx = Math.max(0, Math.min(CELLS - 1e-6, x / CS)), fz = Math.max(0, Math.min(CELLS - 1e-6, z / CS));
        const cx = Math.floor(fx), cz = Math.floor(fz), u = fx - cx, v = fz - cz;
        const h00 = H[gi(cx, cz)], h10 = H[gi(cx + 1, cz)], h01 = H[gi(cx, cz + 1)], h11 = H[gi(cx + 1, cz + 1)];
        return u >= v ? h00 + (h10 - h00) * u + (h11 - h10) * v : h00 + (h11 - h01) * u + (h01 - h00) * v;
    };
    const cellOf = (x, z) => Math.floor(z / CS) * CELLS + Math.floor(x / CS);

    // ---------------- roads: polylines between sites (with a bend through a midpoint)
    const roads = [];   // { pts: [[x,z]...], w }
    for (const [a, b] of ROADS) {
        // from the edge of one town to the edge of the other (inside a town its streets carry on)
        const S0 = SITES[a], S1 = SITES[b];
        const L = Math.hypot(S1.x - S0.x, S1.z - S0.z), ux = (S1.x - S0.x) / L, uz = (S1.z - S0.z) / L;
        const edge = (s) => (s.kind === 'gas' || s.kind === 'school' ? 0 : s.r * 0.9);
        const A = { x: S0.x + ux * edge(S0), z: S0.z + uz * edge(S0) }, Bs = { x: S1.x - ux * edge(S1), z: S1.z - uz * edge(S1) };
        const mx = (A.x + Bs.x) / 2 + (R() - 0.5) * 120, mz = (A.z + Bs.z) / 2 + (R() - 0.5) * 120;
        const pts = [];
        const N = 24;
        for (let i = 0; i <= N; i++) { const t = i / N; const x = (1 - t) * (1 - t) * A.x + 2 * (1 - t) * t * mx + t * t * Bs.x, z = (1 - t) * (1 - t) * A.z + 2 * (1 - t) * t * mz + t * t * Bs.z; pts.push([x * 100, z * 100]); }
        roads.push({ pts, w: a === 0 || b === 0 ? 800 : 650, mat: 'asphalt' });
    }
    // town streets: a cross through each town, along cell lines
    for (const s of SITES) if (s.kind === 'city' || s.kind === 'village' || s.kind === 'base' || s.kind === 'port') {
        const ext = s.r * 100 * 1.05;
        const cxl = Math.round(s.x * 100 / CS) * CS, czl = Math.round(s.z * 100 / CS) * CS;
        const lines = s.kind === 'city' ? [-2, 0, 2] : [0];
        for (const k of lines) {
            roads.push({ pts: [[cxl - ext, czl + k * CS], [cxl + ext, czl + k * CS]], w: 700, mat: s.kind === 'base' ? 'concrete' : 'asphalt', street: true });
            roads.push({ pts: [[cxl + k * CS, czl - ext], [cxl + k * CS, czl + ext]], w: 700, mat: s.kind === 'base' ? 'concrete' : 'asphalt', street: true });
        }
    }
    // smooth the terrain under the roads a little (no wild slopes on the road)
    for (const rd of roads) for (let it = 0; it < 2; it++) for (let i = 0; i + 1 < rd.pts.length; i++) {
        const [x0, z0] = rd.pts[i];
        const gx = Math.round(x0 / CS), gz = Math.round(z0 / CS);
        if (gx < 1 || gz < 1 || gx >= GRID - 1 || gz >= GRID - 1) continue;
        let a = 0; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) a += H[gi(gx + dx, gz + dz)];
        H[gi(gx, gz)] = H[gi(gx, gz)] * 0.5 + a / 8;
    }
    const roadQuads = new Map();   // cell -> [{ v: [[x,y,z] x4], m }]
    const onRoad = (x, z, pad = 0) => { for (const rd of roads) for (let i = 0; i + 1 < rd.pts.length; i++) { const [ax, az] = rd.pts[i], [bx, bz] = rd.pts[i + 1]; const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz; let t = ((x - ax) * dx + (z - az) * dz) / L2; t = Math.max(0, Math.min(1, t)); if (Math.hypot(x - ax - dx * t, z - az - dz * t) < rd.w / 2 + pad) return true; } return false; };
    const clipPoly = (poly, axis, v, keepAbove) => {
        const out = [];
        for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; const ia = keepAbove ? a[axis] >= v : a[axis] <= v, ib = keepAbove ? b[axis] >= v : b[axis] <= v;
            if (ia) out.push(a); if (ia !== ib) { const t = (v - a[axis]) / (b[axis] - a[axis]); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); } }
        return out;
    };
    // ---------------- buildings: at most one per cell, inside the cell
    const PF = Object.fromEntries(ALL.map((p, i) => [p.name, i + 1]));
    const insts = [];  // { pf, x, y, z, r, tint, tint2, cell, building }
    const cellB = new Map();
    const bset = (kind) => ({
        city: ['apart', 'apart', 'houseM', 'houseM', 'houseS', 'shed', 'apart', 'houseM'],
        village: ['houseS', 'houseS', 'houseM', 'shed', 'houseM', 'barn'],
        base: ['barracks', 'barracks', 'hangar', 'warehouse', 'tower', 'tower', 'barracks'],
        port: ['warehouse', 'warehouse', 'shed', 'houseS', 'warehouse'],
        farm: ['barn', 'houseS', 'shed', 'houseM'],
        lone: ['houseS', 'houseM', 'shed', 'houseS', 'barn'],
    }[kind]);
    const footOf = (pf, r) => { const f = ALL[pf - 1].foot; return r % 2 ? [f[1], f[0]] : [f[0], f[1]]; };
    // the corners of the building's footprint must stay off the roads
    const fits = (pf, x, z, r) => {
        const [w, d] = footOf(pf, r);
        const pts = []; for (const fx of [-0.5, 0, 0.5]) for (const fz of [-0.5, 0, 0.5]) pts.push([x + fx * w, z + fz * d]);
        if (pts.some(([px, pz]) => onRoad(px, pz, 150))) return false;
        const hs = pts.map(([px, pz]) => hAt(px, pz));
        if (Math.min(...hs) < 120) return false;
        if (Math.max(...hs) - Math.min(...hs) > 260) return false;
        return true;
    };
    // a building's cell is made flat at its floor height; a corner another building
    // already set stays as it is (the plinth covers up to 2.6 m below the floor)
    const pinned = new Set();
    const flattenCell = (c, h) => {
        const cx = c % CELLS, cz = Math.floor(c / CELLS);
        for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const k = gi(cx + dx, cz + dz); if (!pinned.has(k)) { H[k] = h; pinned.add(k); } }
    };
    const baseFor = (c) => {
        const cx = c % CELLS, cz = Math.floor(c / CELLS);
        const ks = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([dx, dz]) => gi(cx + dx, cz + dz));
        const pin = ks.filter(k => pinned.has(k)).map(k => H[k]);
        const avg = ks.reduce((a, k) => a + H[k], 0) / 4;
        return pin.length ? Math.max(...pin) : avg;
    };
    const place = (pf, c, tier) => {
        const cx = c % CELLS, cz = Math.floor(c / CELLS);
        if (cellB.has(c)) return false;
        // facing: the door side (south, -z) toward the nearest road
        const ccx = (cx + 0.5) * CS, ccz = (cz + 0.5) * CS;
        let best = null;
        for (let tries = 0; tries < 18 && !best; tries++) {
            const r = tries < 4 ? tries : Math.floor(R() * 4);
            const [w, d] = footOf(pf, r);
            const mx = Math.max(0, (CS - w) / 2 - 150), mz = Math.max(0, (CS - d) / 2 - 150);
            const x = ccx + (tries ? (R() * 2 - 1) * mx : 0), z = ccz + (tries ? (R() * 2 - 1) * mz : 0);
            if (Math.abs(x - ccx) + w / 2 > CS / 2 - 60 || Math.abs(z - ccz) + d / 2 > CS / 2 - 60) continue;
            if (fits(pf, x, z, r)) best = { x, z, r };
        }
        if (!best) return false;
        // the door toward the road: try the rotation whose south faces a road point nearby
        const base = Math.round(baseFor(c));
        flattenCell(c, base);
        const inst = { pf, x: Math.round(best.x), y: base, z: Math.round(best.z), r: best.r, tint: Math.floor(R() * 5), tint2: Math.floor(R() * 4), cell: c, building: true, tier };
        insts.push(inst); cellB.set(c, inst);
        return true;
    };
    for (const s of SITES) {
        const cx0 = s.x * 100 / CS, cz0 = s.z * 100 / CS, rr = s.r * 100 / CS;
        const cells = [];
        for (let cz = Math.floor(cz0 - rr - 1); cz <= cz0 + rr + 1; cz++) for (let cx = Math.floor(cx0 - rr - 1); cx <= cx0 + rr + 1; cx++) {
            if (cx < 1 || cz < 1 || cx >= CELLS - 1 || cz >= CELLS - 1) continue;
            const d = Math.hypot(cx + 0.5 - cx0, cz + 0.5 - cz0);
            if (d <= rr + 0.3) cells.push({ c: cz * CELLS + cx, d });
        }
        cells.sort((a, b) => a.d - b.d);
        const set = s.kind === 'gas' ? ['gas'] : s.kind === 'school' ? ['school', 'houseS', 'shed'] : bset(s.kind === 'city' ? 'city' : s.kind);
        let k = 0;
        for (const { c } of cells) {
            if (s.kind === 'gas' && k > 0) break;
            if (s.kind === 'school' && k > 2) break;
            const fill = s.kind === 'city' ? 0.72 : s.kind === 'farm' ? 0.7 : s.kind === 'base' || s.kind === 'port' ? 0.6 : 0.8;
            if (k > 0 && R() > fill) continue;
            const name = s.kind === 'base' && k === 0 ? 'hangar' : s.kind === 'school' && k === 0 ? 'school' : set[Math.floor(R() * set.length)];
            if (place(PF[name], c, s.tier) || place(PF['houseS'], c, s.tier) || place(PF['shed'], c, s.tier)) k++;
        }
        s.count = k;
    }
    // lone houses scattered over the land
    for (let i = 0; i < 70; i++) {
        const c = Math.floor(R() * CELLS * CELLS);
        const cx = c % CELLS, cz = Math.floor(c / CELLS);
        if (cellB.has(c) || [-1, 0, 1].some(dz => [-1, 0, 1].some(dx => cellB.has(c + dz * CELLS + dx)))) continue;
        const h = hAt((cx + 0.5) * CS, (cz + 0.5) * CS);
        if (h < 300 || h > 3500) continue;
        const set = bset('lone');
        place(PF[set[Math.floor(R() * set.length)]], c, 1);
    }

    // road segment pieces, clipped to cells
    for (const rd of roads) for (let i = 0; i + 1 < rd.pts.length; i++) {
        const [ax, az] = rd.pts[i], [bx, bz] = rd.pts[i + 1];
        const L = Math.hypot(bx - ax, bz - az); if (L < 1) continue;
        const nx = -(bz - az) / L * rd.w / 2, nz = (bx - ax) / L * rd.w / 2;
        // extend a little so pieces overlap at the joints
        const ex = (bx - ax) / L * rd.w * 0.3, ez = (bz - az) / L * rd.w * 0.3;
        const q = [[ax - ex + nx, az - ez + nz], [bx + ex + nx, bz + ez + nz], [bx + ex - nx, bz + ez - nz], [ax - ex - nx, az - ez - nz]];
        const xs = q.map(p => p[0]), zs = q.map(p => p[1]);
        for (let cz = Math.floor(Math.min(...zs) / CS); cz <= Math.floor(Math.max(...zs) / CS); cz++) for (let cx = Math.floor(Math.min(...xs) / CS); cx <= Math.floor(Math.max(...xs) / CS); cx++) {
            if (cx < 0 || cz < 0 || cx >= CELLS || cz >= CELLS) continue;
            let p = q;
            p = clipPoly(p, 0, cx * CS, true); if (p.length < 3) continue;
            p = clipPoly(p, 0, (cx + 1) * CS, false); if (p.length < 3) continue;
            p = clipPoly(p, 1, cz * CS, true); if (p.length < 3) continue;
            p = clipPoly(p, 1, (cz + 1) * CS, false); if (p.length < 3) continue;
            const c = cz * CELLS + cx;
            if (!roadQuads.has(c)) roadQuads.set(c, []);
            const pts = p.map(([x, z]) => [Math.round(x), Math.round(hAt(x, z) + 12), Math.round(z)]);
            if (pts.some(pt => pt[1] < 30)) continue;     // no roads in the water
            for (let k = 1; k + 1 < pts.length; k += 2) roadQuads.get(c).push({ v: k + 2 < pts.length ? [pts[0], pts[k], pts[k + 1], pts[k + 2]] : [pts[0], pts[k], pts[k + 1]], m: rd.mat });
        }
    }

    // ---------------- props
    const props = [];
    const blocked = (x, z, rad) => {
        const c = cellOf(x, z);
        for (const dc of [0, -1, 1, -CELLS, CELLS, -CELLS - 1, -CELLS + 1, CELLS - 1, CELLS + 1]) {
            const b = cellB.get(c + dc); if (!b) continue;
            const [w, d] = footOf(b.pf, b.r);
            if (Math.abs(x - b.x) < w / 2 + rad + 150 && Math.abs(z - b.z) < d / 2 + rad + 150) return true;
        }
        return false;
    };
    const cellProps = new Map();
    const putProp = (name, x, z, r = Math.floor(R() * 4), opt = {}) => {
        const pf = PF[name]; const p = ALL[pf - 1];
        x = Math.round(x); z = Math.round(z);
        if (x < 200 || z < 200 || x > MAP - 200 || z > MAP - 200) return false;
        const c = cellOf(x, z);
        if ((cellProps.get(c) || 0) >= (opt.cap || 9)) return false;
        const rad = p.radius || 100;
        // stay inside the cell (so the painter's order by cells holds)
        const lx = x - (c % CELLS) * CS, lz = z - Math.floor(c / CELLS) * CS;
        if (lx < rad * 0.6 || lz < rad * 0.6 || lx > CS - rad * 0.6 || lz > CS - rad * 0.6) return false;
        if (!opt.force && blocked(x, z, rad)) return false;
        if (!opt.road && onRoad(x, z, rad * 0.7)) return false;
        const y = Math.round(opt.y ?? hAt(x, z));
        if (y < 60 && !opt.wet) return false;
        props.push({ pf, x, y, z, r, tint: opt.tint ?? Math.floor(R() * 5), tint2: 0, cell: c, building: false });
        cellProps.set(c, (cellProps.get(c) || 0) + 1);
        return true;
    };
    // forests: pines on the ridge and hills, oaks in the lowlands
    for (let cz = 0; cz < CELLS; cz++) for (let cx = 0; cx < CELLS; cx++) {
        const mx = (cx + 0.5) * CS / 100, mz = (cz + 0.5) * CS / 100;
        const h = hAt((cx + 0.5) * CS, (cz + 0.5) * CS);
        if (h < 150) continue;
        const f = fbm(nF, mx / 260, mz / 260);
        const high = h > 2200;
        const dens = f > 0.58 ? (f - 0.58) * 22 : f > 0.5 ? 0.6 : 0.15;
        const n = Math.floor(dens + R());
        for (let i = 0; i < Math.min(n, 7); i++) {
            const x = (cx + 0.08 + R() * 0.84) * CS, z = (cz + 0.08 + R() * 0.84) * CS;
            const pick = R();
            const name = high ? (pick < 0.75 ? 'pine' : pick < 0.88 ? 'rockB' : 'bush') : (pick < 0.4 ? 'oak' : pick < 0.7 ? 'pine' : pick < 0.9 ? 'bush' : 'rockA');
            putProp(name, x, z);
        }
        // big rocks on the slopes
        if (high && R() < 0.25) putProp('rockC', (cx + 0.2 + R() * 0.6) * CS, (cz + 0.2 + R() * 0.6) * CS);
        else if (R() < 0.05) putProp('rockB', (cx + 0.2 + R() * 0.6) * CS, (cz + 0.2 + R() * 0.6) * CS);
    }
    // town furniture: cars along the streets, barrels, crates; base: sandbags, barriers, containers; port: containers
    for (const s of SITES) {
        const cx = s.x * 100, cz = s.z * 100, rr = s.r * 100;
        let count = { city: 40, village: 14, base: 50, port: 60, farm: 14, gas: 4, school: 8 }[s.kind] || 0;
        for (let i = 0; i < count * 3 && count > 0; i++) {
            const a = R() * Math.PI * 2, d = Math.sqrt(R()) * rr;
            const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
            let name;
            if (s.kind === 'port') name = R() < 0.7 ? 'container' : R() < 0.5 ? 'crate' : 'barrels';
            else if (s.kind === 'base') { const p = R(); name = p < 0.3 ? 'sandbag' : p < 0.5 ? 'barrier' : p < 0.72 ? 'container' : p < 0.85 ? 'crate' : 'barrels'; }
            else if (s.kind === 'farm') name = R() < 0.45 ? 'hay' : R() < 0.6 ? 'fence' : 'crate';
            else { const p = R(); name = p < 0.45 ? 'car' : p < 0.6 ? 'barrels' : p < 0.75 ? 'crate' : p < 0.9 ? 'barrier' : 'fence'; }
            const road = name === 'car';
            if (road && !onRoad(x, z, 600)) continue;
            if (putProp(name, x, z, Math.floor(R() * 4), { road, cap: 8 })) if (--count < 0) break;
        }
    }
    // poles along the main roads
    for (const rd of roads) if (!rd.street) for (let i = 2; i < rd.pts.length - 2; i += 3) {
        const [ax, az] = rd.pts[i], [bx, bz] = rd.pts[i + 1]; const L = Math.hypot(bx - ax, bz - az) || 1;
        putProp('pole', ax + -(bz - az) / L * (rd.w / 2 + 250), az + (bx - ax) / L * (rd.w / 2 + 250), 0, { cap: 10 });
    }
    // silos and water towers at farms, a water tower in the city and the base
    for (const s of SITES) {
        if (s.kind === 'farm') for (let t = 0; t < 10; t++) if (putProp('silo', s.x * 100 + (R() - 0.5) * s.r * 120, s.z * 100 + (R() - 0.5) * s.r * 120)) break;
        if (s.kind === 'city' || s.kind === 'base' || s.kind === 'village') for (let t = 0; t < 10; t++) if (putProp('watertower', s.x * 100 + (R() - 0.5) * s.r * 150, s.z * 100 + (R() - 0.5) * s.r * 150)) break;
    }

    // ---------------- terrain materials per cell
    const cellMat = new Array(CELLS * CELLS);
    for (let cz = 0; cz < CELLS; cz++) for (let cx = 0; cx < CELLS; cx++) {
        const hs = [H[gi(cx, cz)], H[gi(cx + 1, cz)], H[gi(cx, cz + 1)], H[gi(cx + 1, cz + 1)]];
        const lo = Math.min(...hs), hi = Math.max(...hs), avg = hs.reduce((a, b) => a + b) / 4;
        const slope = (hi - lo) / CS;
        const mx = (cx + 0.5) * CS / 100, mz = (cz + 0.5) * CS / 100;
        let m = 'grass';
        if (avg < 160) m = 'sand';
        else if (slope > 0.5) m = 'rockG';
        else if (avg > 4800) m = 'snowRock';
        else if (fbm(nF, mx / 90 + 3, mz / 90) > 0.62) m = 'grassDry';
        else if (fbm(nD, mx / 70, mz / 70 + 5) > 0.66) m = 'dirt';
        const site = SITES.find(s => Math.hypot(mx - s.x, mz - s.z) < s.r * 0.95);
        if (site && (site.kind === 'base' || site.kind === 'port')) m = avg < 160 ? 'sand' : 'concrete';
        else if (site && site.kind === 'farm' && m === 'grass') m = 'dirt';
        cellMat[cz * CELLS + cx] = m;
    }

    return { H, hAt, cellMat, roadQuads, insts, props, cellB, PF, sites: SITES, roads };
}
