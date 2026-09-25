// ============================================================
// real/prep.mjs - the real circuits, from the downloaded map data (real/cache)
// to real/circuits.json, which f1tracks.mjs and build.mjs read.
//   * the lap: the racing line smoothed, started on the pit straight, with
//     SRTM heights (tunnels bridged, the known height range kept), the
//     tunnel and the Suzuka crossover flagged, and control points spaced by
//     how tightly the road bends
//   * the surroundings: every building near enough to be seen as a box of
//     its own footprint and height, grandstands, woods and park trees, water
//     (sea, harbours, lakes, rivers), the named sights with their own models
//   * the skyline: the real hills round the circuit, near and far
// usage: node real/prep.mjs
// Map data (c) OpenStreetMap contributors, ODbL. Centrelines: bacinger/f1-circuits (MIT).
// Heights: SRTM via OpenTopoData.
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { CIRCUITS, makeProj } from './geo.mjs';
import { area, centroid, obb, clipHalf, inside, PointIndex, hash01 } from './geom.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const CACHE = path.join(HERE, 'cache');
const F_TUN = 1, F_WALL = 4, F_BRIDGE = 32, F_EMB = 64, F_UNDER = 128;

// Per circuit: half width of the road, walls (street circuit), the height
// range of the lap as published (SRTM is rescaled to it; 0 keeps SRTM),
// how much of the lie of the land to give the scenery (SRTM is a surface
// model: woods and blocks read as hills, so it is toned down), the trees
// that grow there, the building colourways (see build.mjs idx.bld), the
// height of a building nobody measured, and how many of each to keep.
// widthZones: [lat, lon, radius m, half width] for the narrow bits.
const META = {
    'mc-1929': { merge: 1, hi: 0.36, tunnelExt: 50, sightsLL: [['casino', 43.73926, 7.42791]], width: 5.0, walls: true, range: 42, terrain: 0.9, trees: ['palm', 'palm', 'oak'], cols: [4, 5, 6, 0, 7, 1], glass: 8, defH: 17, nB: 760, nT: 180, sea: true, yachts: 16, widthZones: [[43.7405, 7.4302, 45, 4.6]] },
    'be-1925': { width: 7.0, range: 104, terrain: 0.55, trees: ['pine', 'pine', 'pine', 'oak'], cols: [0, 1, 3, 11, 6], glass: 3, defH: 7, nB: 220, nT: 820 },
    'jp-1962': { width: 7.0, range: 40, terrain: 0.55, trees: ['pine', 'oak', 'oak'], cols: [6, 2, 11, 0], glass: 8, defH: 8, nB: 300, nT: 620, bridge: true },
    'gb-1948': { width: 7.4, range: 0, terrain: 0.3, trees: ['oak'], cols: [11, 3, 2, 6], glass: 8, defH: 7, nB: 300, nT: 520 },
    'it-1922': { width: 7.2, range: 13, terrain: 0.25, trees: ['oak', 'oak', 'oak', 'pine'], cols: [0, 1, 7, 6], glass: 3, defH: 8, nB: 220, nT: 820 },
    'sg-2008': { width: 6.2, walls: true, range: 4, terrain: 0, trees: ['oak', 'palm', 'oak'], cols: [8, 6, 2, 3, 11], glass: 8, defH: 18, nB: 760, nT: 220, sea: true, city: 1 },
    'br-1940': { merge: 1, hi: 0.5, width: 7.0, range: 43, terrain: 0.8, trees: ['oak', 'oak', 'palm'], cols: [6, 5, 7, 4, 1, 0], glass: 8, defH: 7, nB: 600, nT: 420 },
    'az-2016': { merge: 1, narrowClimb: [40.36622, 49.83731, 750, 480, 4.2], sightsLL: [['maiden', 40.36622, 49.83731]], width: 6.6, walls: true, range: 24, terrain: 0.8, trees: ['palm', 'palm', 'oak'], cols: [9, 0, 6, 1, 9], glass: 8, defH: 15, nB: 760, nT: 220, sea: true, widthZones: [] },
};
// how each built-in model's size is written (build.mjs gtQ): boxes and water
// sheets in 0.1 m, everything else as a factor on its own size in 0.01s
const METRIC = new Set(['block', 'sheet']);

const read = (f) => JSON.parse(fs.readFileSync(path.join(CACHE, f), 'utf8'));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// ---- closed polylines ----
function resample(P, step) {
    const n = P.length;
    const L = [0];
    for (let i = 1; i <= n; i++) L.push(L[i - 1] + Math.hypot(P[i % n][0] - P[i - 1][0], P[i % n][1] - P[i - 1][1]));
    const tot = L[n];
    const m = Math.round(tot / step);
    const out = [];
    let j = 0;
    for (let k = 0; k < m; k++) {
        const s = k * tot / m;
        while (L[j + 1] < s) j++;
        const t = (s - L[j]) / (L[j + 1] - L[j] || 1);
        const a = P[j], b = P[(j + 1) % n];
        out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
    return { pts: out, tot };
}
function boxSmooth(arr, w, passes, closed = true) {
    let a = arr.slice();
    const n = a.length, h = Math.floor(w / 2);
    for (let p = 0; p < passes; p++) {
        const b = new Array(n);
        for (let i = 0; i < n; i++) {
            let s = 0, c = 0;
            for (let k = -h; k <= h; k++) {
                let j = i + k;
                if (closed) j = (j + n) % n; else if (j < 0 || j >= n) continue;
                s += a[j]; c++;
            }
            b[i] = s / c;
        }
        a = b;
    }
    return a;
}
const rotate = (a, k) => a.slice(k).concat(a.slice(0, k));

// ---- OSM ----
function polysOf(el, P) {
    const conv = (g) => g.map((q) => P.fwd(q.lon, q.lat));
    if (el.type === 'way' && el.geometry && el.geometry.length >= 4) return [conv(el.geometry)];
    if (el.type === 'relation' && el.members) {
        // stitch the outer ways into rings
        const segs = el.members.filter((m) => m.role === 'outer' && m.geometry).map((m) => conv(m.geometry));
        const rings = [];
        while (segs.length) {
            let r = segs.shift();
            let grew = true;
            while (grew && Math.hypot(r[0][0] - r[r.length - 1][0], r[0][1] - r[r.length - 1][1]) > 0.5) {
                grew = false;
                for (let i = 0; i < segs.length; i++) {
                    const s = segs[i], e = r[r.length - 1];
                    if (Math.hypot(s[0][0] - e[0], s[0][1] - e[1]) < 0.5) { r = r.concat(s.slice(1)); segs.splice(i, 1); grew = true; break; }
                    if (Math.hypot(s[s.length - 1][0] - e[0], s[s.length - 1][1] - e[1]) < 0.5) { r = r.concat(s.slice(0, -1).reverse()); segs.splice(i, 1); grew = true; break; }
                }
            }
            if (r.length >= 4) rings.push(r);
        }
        return rings;
    }
    return [];
}
const lineOf = (el, P) => (el.geometry || []).map((q) => P.fwd(q.lon, q.lat));
function parseLen(v) {
    if (v == null) return NaN;
    const m = String(v).replace(',', '.').match(/-?\d+(\.\d+)?/);
    if (!m) return NaN;
    let x = parseFloat(m[0]);
    if (/ft|'/.test(String(v))) x *= 0.3048;
    return x;
}

// ---- the height grid ----
function makeDem(G, P) {
    const [a0, b0, a1, b1] = G.bbox;
    return (x, z) => {
        const [lo, la] = P.inv(x, z);
        const r = clamp((la - a0) / (a1 - a0) * (G.nLa - 1), 0, G.nLa - 1.001);
        const c = clamp((lo - b0) / (b1 - b0) * (G.nLo - 1), 0, G.nLo - 1.001);
        const r0 = Math.floor(r), c0 = Math.floor(c), fr = r - r0, fc = c - c0;
        const h = (i, j) => G.h[i * G.nLo + j] ?? 0;
        return (h(r0, c0) * (1 - fc) + h(r0, c0 + 1) * fc) * (1 - fr) + (h(r0 + 1, c0) * (1 - fc) + h(r0 + 1, c0 + 1) * fc) * fr;
    };
}

const out = {};
for (const C of CIRCUITS) {
    const M = META[C.id];
    const need = ['line', 'osm', 'elev', 'grid', 'sights'].map((k) => path.join(CACHE, `${C.id}.${k}.json`));
    if (!need.every((f) => fs.existsSync(f))) { console.log(C.id, 'missing data, run real/fetch.mjs'); continue; }
    const LN = read(C.id + '.line.json'), OSM = read(C.id + '.osm.json'), EL = read(C.id + '.elev.json');
    // relations with their members (fetched separately) replace the bare ones
    if (fs.existsSync(path.join(CACHE, C.id + '.rel.json'))) {
        const R = read(C.id + '.rel.json').elements;
        const ids = new Set(R.map((e) => e.id));
        OSM.elements = OSM.elements.filter((e) => !(e.type === 'relation' && ids.has(e.id))).concat(R);
    }
    const GR = read(C.id + '.grid.json'), SG = read(C.id + '.sights.json');
    let lo0 = 1e9, lo1 = -1e9, la0 = 1e9, la1 = -1e9;
    for (const [lo, la] of LN.line) { lo0 = Math.min(lo0, lo); lo1 = Math.max(lo1, lo); la0 = Math.min(la0, la); la1 = Math.max(la1, la); }
    const P = makeProj((lo0 + lo1) / 2, (la0 + la1) / 2);
    const dem = makeDem(GR, P);

    // ---------------- the lap ----------------
    let raw = LN.line.map(([lo, la]) => P.fwd(lo, la));
    if (Math.hypot(raw[0][0] - raw[raw.length - 1][0], raw[0][1] - raw[raw.length - 1][1]) < 0.5) raw = raw.slice(0, -1);
    const rs = resample(raw, 2);
    const N = rs.pts.length;
    // The centreline is hand-traced with a point every 20-60 m, so its corners
    // are a few kinks. Where the map has the raceway itself (drawn with many
    // more points), pull the line onto it: the nearest raceway point running
    // the same way within 14 m, the pull smoothed along the lap so it never
    // jumps between two roads (pit lane, other layouts).
    let G = rs.pts;
    {
        const rw = [];
        for (const e of OSM.elements) {
            const t = e.tags || {};
            if (e.type !== 'way' || t.highway !== 'raceway' || !e.geometry) continue;
            if (/kart|motocross|dirt/i.test((t.sport || '') + (t.surface || ''))) continue;
            if (/pit|kart|stand|box|moto|rallycross|drift|support/i.test((t.name || '') + ' ' + (t['name:en'] || '') + ' ' + (t.raceway || ''))) continue;
            const L = lineOf(e, P);
            for (let i = 0; i < L.length - 1; i++) {
                const a = L[i], b = L[i + 1];
                const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
                if (d < 0.01) continue;
                for (let s2 = 0; s2 < d; s2 += 1) rw.push([a[0] + (b[0] - a[0]) * s2 / d, a[1] + (b[1] - a[1]) * s2 / d, (b[0] - a[0]) / d, (b[1] - a[1]) / d, t.oneway === 'yes' ? 1 : 0]);
            }
        }
        if (rw.length) {
            const RI = new PointIndex(rw.map((q) => [q[0], q[1]]), 20);
            const n = G.length;
            const dx = new Array(n).fill(0), dz = new Array(n).fill(0), hit = new Array(n).fill(0);
            for (let i = 0; i < n; i++) {
                const p = G[i], q = G[(i + 1) % n], o = G[(i - 1 + n) % n];
                const tl = Math.hypot(q[0] - o[0], q[1] - o[1]) || 1;
                const tx = (q[0] - o[0]) / tl, tz = (q[1] - o[1]) / tl;
                // nearest raceway point with a matching direction, within 14 m
                let best = -1, bd = 14 * 14;
                const c = RI.c, gx = Math.floor(p[0] / c), gz = Math.floor(p[1] / c);
                for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
                    const L = RI.m.get((gx + a) + ',' + (gz + b));
                    if (!L) continue;
                    for (const k of L) {
                        const r = rw[k];
                        const dot = r[2] * tx + r[3] * tz;
                        if (r[4] ? dot < 0.9 : Math.abs(dot) < 0.9) continue;
                        const d = (r[0] - p[0]) ** 2 + (r[1] - p[1]) ** 2;
                        if (d < bd) { bd = d; best = k; }
                    }
                }
                if (best >= 0) { dx[i] = rw[best][0] - p[0]; dz[i] = rw[best][1] - p[1]; hit[i] = 1; }
            }
            // where nothing matched, the pull fades out
            const w = boxSmooth(hit, 9, 2), sdx = boxSmooth(dx, 9, 2), sdz = boxSmooth(dz, 9, 2);
            G = G.map((p, i) => (w[i] > 0.05 ? [p[0] + sdx[i], p[1] + sdz[i]] : p));
            M._snap = (hit.reduce((a, b) => a + b, 0) / n * 100).toFixed(0) + '%';
            M._w = boxSmooth(hit, 15, 3);
        }
    }
    // smoothed lightly where it follows the mapped raceway, harder (about
    // 9 m) where it is still the hand-traced line (the street circuits)
    const lx = boxSmooth(G.map((p) => p[0]), 5, 3), lz = boxSmooth(G.map((p) => p[1]), 5, 3);
    const hx = boxSmooth(G.map((p) => p[0]), 9, 3), hz = boxSmooth(G.map((p) => p[1]), 9, 3);
    const wS = M._w || new Array(N).fill(0);
    let F = lx.map((x, i) => [x * wS[i] + hx[i] * (1 - wS[i]), lz[i] * wS[i] + hz[i] * (1 - wS[i])]);
    // how rough the line bends: mean change of curvature per 2 m, x 1e4
    {
        const hd = F.map((p, i) => { const q = F[(i + 1) % N]; return Math.atan2(q[1] - p[1], q[0] - p[0]); });
        let r = 0;
        for (let i = 0; i < N; i++) {
            let a = hd[(i + 1) % N] - hd[i], b = hd[i] - hd[(i - 1 + N) % N];
            while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI;
            while (b > Math.PI) b -= 2 * Math.PI; while (b < -Math.PI) b += 2 * Math.PI;
            r += Math.abs(a - b);
        }
        M._rough = (r / N * 1e4).toFixed(1);
    }

    // heights along the lap, by fraction of the way round from the first point
    const lapS = EL.lap.map(([lo, la, h]) => [P.fwd(lo, la), h]);
    let acc = 0; const sf = [0];
    for (let i = 1; i < lapS.length; i++) { acc += Math.hypot(lapS[i][0][0] - lapS[i - 1][0][0], lapS[i][0][1] - lapS[i - 1][0][1]); sf.push(acc); }
    acc += Math.hypot(lapS[0][0][0] - lapS[lapS.length - 1][0][0], lapS[0][0][1] - lapS[lapS.length - 1][0][1]);
    const ehr = new Array(N);
    for (let i = 0; i < N; i++) {
        const s = i / N * acc;
        let j = 0; while (j < sf.length - 1 && sf[j + 1] < s) j++;
        const a = lapS[j][1] ?? 0, b = lapS[(j + 1) % lapS.length][1] ?? a;
        const t = (s - sf[j]) / ((j + 1 < sf.length ? sf[j + 1] : acc) - sf[j] || 1);
        ehr[i] = a + (b - a) * clamp(t, 0, 1);
    }

    // the start: level with the middle of the pit lane beside the main straight
    const tidx0 = new PointIndex(F, 25);
    const pits = OSM.elements.filter((e) => e.type === 'way' && e.tags && e.tags.highway === 'raceway' && e.geometry &&
        (e.tags.raceway === 'pit_lane' || /pit|stand|box/i.test((e.tags.name || '') + ' ' + (e.tags['name:en'] || ''))) &&
        !/kart/i.test(e.tags.sport || '') && !/support|west|(^|\s)national|kart|stowe|sortie|exit|entry|entr/i.test((e.tags.name || '') + ' ' + (e.tags['name:en'] || '')));
    let startI = 0, pitInfo = 'none';
    {
        let best = null;
        for (const w of pits) {
            const L = lineOf(w, P);
            let len = 0; for (let i = 1; i < L.length; i++) len += Math.hypot(L[i][0] - L[i - 1][0], L[i][1] - L[i - 1][1]);
            if (len < 120) continue;
            const ds = L.map((q) => tidx0.near(q[0], q[1], 300).d);
            const md = ds.reduce((a, b) => a + b, 0) / ds.length;
            if (md > 60) continue;
            if (!best || md < best.md) best = { w, L, len, md };
        }
        if (best) {
            // the point half way along the lane
            let h = best.len / 2, k = 1;
            for (; k < best.L.length; k++) { const d = Math.hypot(best.L[k][0] - best.L[k - 1][0], best.L[k][1] - best.L[k - 1][1]); if (h <= d) break; h -= d; }
            const a = best.L[k - 1], b = best.L[Math.min(k, best.L.length - 1)];
            const dd = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
            const mid = [a[0] + (b[0] - a[0]) * h / dd, a[1] + (b[1] - a[1]) * h / dd];
            // the nearest point of the lap running the same way as the lane
            // (at Monaco the lane lies between the start straight and the
            // swimming pool section, which runs the other way)
            const ux = (b[0] - a[0]) / dd, uz = (b[1] - a[1]) / dd;
            let bd = 1e9;
            for (let i = 0; i < N; i++) {
                const q = F[i], r = F[(i + 1) % N];
                const tl = Math.hypot(r[0] - q[0], r[1] - q[1]) || 1;
                if (((r[0] - q[0]) * ux + (r[1] - q[1]) * uz) / tl < 0.8) continue;
                const d = Math.hypot(q[0] - mid[0], q[1] - mid[1]);
                if (d < bd) { bd = d; startI = i; }
            }
            pitInfo = `${best.w.tags.name || best.w.id} ${best.len.toFixed(0)} m, ${best.md.toFixed(1)} m off`;
        }
    }
    F = rotate(F, startI);
    const eh = rotate(ehr, startI);

    // ---- flags: the tunnel ----
    const flag = new Array(N).fill(M.walls ? F_WALL : 0);
    const tidx = new PointIndex(F, 25);
    const tun = new Array(N).fill(0);
    for (const e of OSM.elements) {
        if (!(e.type === 'way' && e.tags && e.tags.highway === 'raceway' && e.tags.tunnel === 'yes' && e.geometry)) continue;
        if (/pit/i.test(e.tags.name || '')) continue;
        const L = lineOf(e, P);
        for (let i = 0; i < L.length - 1; i++) {
            const d = Math.hypot(L[i + 1][0] - L[i][0], L[i + 1][1] - L[i][1]);
            for (let s = 0; s <= d; s += 2) {
                const q = [L[i][0] + (L[i + 1][0] - L[i][0]) * s / (d || 1), L[i][1] + (L[i + 1][1] - L[i][1]) * s / (d || 1)];
                const r = tidx.near(q[0], q[1], 14);
                if (r.i >= 0) tun[r.i] = 1;
            }
        }
    }
    // a street circuit that runs under a big building is in a tunnel there
    // (Monaco: under the Fairmont; the map has the road but not the tunnel)
    if (M.walls) {
        for (const e of OSM.elements) {
            if (!e.tags || !e.tags.building || e.tags['building:part']) continue;
            for (const poly of polysOf(e, P)) {
                if (Math.abs(area(poly)) < 1500) continue;
                let a = 1e9, b = -1e9, c = 1e9, d = -1e9;
                for (const q of poly) { a = Math.min(a, q[0]); b = Math.max(b, q[0]); c = Math.min(c, q[1]); d = Math.max(d, q[1]); }
                for (let i = 0; i < N; i++) { const q = F[i]; if (q[0] >= a && q[0] <= b && q[1] >= c && q[1] <= d && inside(poly, q[0], q[1])) tun[i] = 1; }
            }
        }
    }
    // fill small gaps, then only keep a real tunnel (a covered bit of a few
    // metres is a footbridge)
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < N; i++) if (!tun[i] && tun[(i - 3 + N) % N] && tun[(i + 3) % N]) tun[i] = 1;
    {
        let i = 0;
        const runs = [];
        while (i < N) { if (tun[i]) { let j = i; while (j < N && tun[j]) j++; runs.push([i, j]); i = j; } else i++; }
        for (const [a, b] of runs) {
            if ((b - a) * 2 < 60) { for (let k = a; k < b; k++) tun[k] = 0; continue; }
            // the portals stand a little outside the building above
            const ext = Math.round((M.tunnelExt || 0) / 2);
            for (let k = 1; k <= ext; k++) { tun[(a - k + N) % N] = 1; tun[(b - 1 + k) % N] = 1; }
        }
    }
    for (let i = 0; i < N; i++) if (tun[i]) flag[i] |= F_TUN;

    // ---- heights ----
    let ey = eh.slice();
    // a tunnel runs under the hill: bridge its heights (with a margin)
    {
        const t2 = tun.map((v, i) => { for (let k = -20; k <= 20; k++) if (tun[(i + k + N) % N]) return 1; return 0; });
        let i = 0;
        while (i < N) {
            if (t2[i]) {
                let j = i; while (j < N && t2[j]) j++;
                const a = ey[(i - 1 + N) % N], b = ey[j % N];
                for (let k = i; k < j; k++) ey[k] = a + (b - a) * (k - i + 1) / (j - i + 1);
                i = j;
            } else i++;
        }
    }
    // median then Gaussian-ish smoothing, then the published height range
    {
        const m = new Array(N);
        for (let i = 0; i < N; i++) { const w = []; for (let k = -10; k <= 10; k++) w.push(ey[(i + k + N) % N]); w.sort((a, b) => a - b); m[i] = w[10]; }
        ey = boxSmooth(m, 15, 4);
    }
    const eyAbs = ey.slice();      // for comparing with the height grid
    const mn = Math.min(...ey), mx = Math.max(...ey);
    const k0 = M.range > 0 ? M.range / Math.max(mx - mn, 1) : 1;
    ey = ey.map((y) => (y - mn) * k0);
    // grades no steeper than 19 %
    for (let pass = 0; pass < 6; pass++) {
        for (let i = 1; i < N * 2; i++) { const a = ey[(i - 1) % N], j = i % N; if (Math.abs(ey[j] - a) > 0.38) ey[j] = a + Math.sign(ey[j] - a) * 0.38; }
        for (let i = N * 2; i > 0; i--) { const a = ey[i % N], j = (i - 1) % N; if (Math.abs(ey[j] - a) > 0.38) ey[j] = a + Math.sign(ey[j] - a) * 0.38; }
    }

    // ---- the Suzuka crossover ----
    let bridgeAt = null;
    if (M.bridge) {
        let best = { d: 1e9 };
        for (let i = 0; i < N; i += 1) {
            const q = F[i];
            for (let j = i + Math.floor(N * 0.15); j < N - Math.floor(N * 0.15) + i && j < N; j++) {
                const d = Math.hypot(F[j][0] - q[0], F[j][1] - q[1]);
                if (d < best.d) best = { d, i, j };
            }
        }
        let lo = best.i, up = best.j;
        if (eh[lo] > eh[up]) { lo = best.j; up = best.i; }
        const needSep = 11.8;
        const sep = ey[up] - ey[lo];
        if (sep < needSep) {
            const add = needSep - sep;
            // lift the upper road and dip the lower one, each over +-260 m
            for (let k = -130; k <= 130; k++) {
                const w = 0.5 + 0.5 * Math.cos(Math.PI * k / 130);
                ey[(up + k + N) % N] += add * 0.7 * w;
                ey[(lo + k + N) % N] -= add * 0.3 * w;
            }
        }
        for (let k = -22; k <= 22; k++) flag[(up + k + N) % N] |= F_WALL | F_BRIDGE;
        // v4.2: the upper road's embankment (the grass beside it slopes down to
        // the ground at every graphics level) and the lower road under the deck
        for (let k = -130; k <= 130; k++) flag[(up + k + N) % N] |= F_EMB;
        for (let k = -15; k <= 15; k++) flag[(lo + k + N) % N] |= F_UNDER;
        const nx = F[(up + 2) % N], px = F[(up - 2 + N) % N];
        const yaw = Math.atan2(nx[0] - px[0], nx[1] - px[1]) * 180 / Math.PI;
        bridgeAt = { lo, up, yaw, gap: ey[up] - ey[lo], miss: best.d };
    }
    const y0 = ey[0];
    ey = ey.map((y) => y - y0);

    // ---- width ----
    const wd = new Array(N).fill(M.width);
    for (const [la, lo, r, w] of M.widthZones || []) {
        const [zx, zz] = P.fwd(lo, la);
        for (let i = 0; i < N; i++) if (Math.hypot(F[i][0] - zx, F[i][1] - zz) < r) wd[i] = w;
    }
    // Baku's castle section: the stretch near the old city that climbs the most
    if (M.narrowClimb) {
        const [la, lo, r, L, w] = M.narrowClimb;
        const [zx, zz] = P.fwd(lo, la);
        const n = Math.round(L / 2);
        let best = -1, bi = 0;
        for (let i = 0; i < N; i++) {
            const j = (i + n) % N;
            if (Math.hypot(F[i][0] - zx, F[i][1] - zz) > r || Math.hypot(F[j][0] - zx, F[j][1] - zz) > r) continue;
            const c = ey[j] - ey[i];
            if (c > best) { best = c; bi = i; }
        }
        if (best > 0) { for (let k = 0; k < n; k++) wd[(bi + k) % N] = w; M._narrow = `${L} m climbing ${best.toFixed(1)} m`; }
    }
    const wds = boxSmooth(wd, 9, 3);

    // ---- control points, closer together where the road bends ----
    const head = F.map((p, i) => { const q = F[(i + 1) % N]; return Math.atan2(q[1] - p[1], q[0] - p[0]); });
    const curv = F.map((_, i) => {
        let d = head[(i + 4) % N] - head[(i - 4 + N) % N];
        while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
        return Math.abs(d) / 16;
    });
    let spc = curv.map((c) => clamp(0.28 / Math.max(c, 1e-4), 5, 26));
    // no sudden changes of spacing (a Catmull-Rom spline overshoots on them)
    for (let pass = 0; pass < 3; pass++) {
        for (let i = 1; i < N * 2; i++) { const a = spc[(i - 1) % N], j = i % N; spc[j] = Math.min(spc[j], a + 0.35); }
        for (let i = N * 2; i > 0; i--) { const a = spc[i % N], j = (i - 1) % N; spc[j] = Math.min(spc[j], a + 0.35); }
    }
    const ctl = [];
    {
        let s = 0;
        while (s < N * 2 - 1) {
            const i = Math.round(s / 2) % N;
            ctl.push(i);
            s += Math.max(4, spc[i]);
        }
        // do not end right on top of the first point
        while (ctl.length > 3 && (N * 2 - ctl[ctl.length - 1] * 2) < spc[0] * 0.5) ctl.pop();
    }
    const pts = ctl.map((i) => ({ x: +F[i][0].toFixed(2), z: +F[i][1].toFixed(2), y: +ey[i].toFixed(2), w: +wds[i].toFixed(2), f: flag[i] }));
    let len = 0; for (let i = 0; i < N; i++) len += Math.hypot(F[(i + 1) % N][0] - F[i][0], F[(i + 1) % N][1] - F[i][1]);

    // ---------------- scenery ----------------
    // Records: model, where round the lap it is filed (fraction), position,
    // height offset from the ground beside the road, yaw (bearing of the
    // model's +z), size, colourway, detail tier (1 LOW, 2 HIGH, 3 ULTRA),
    // and chk 0 when it may stand over the road (the tunnel).
    const objs = [];
    const trackNear = (x, z, r = 600) => tidx.near(x, z, r);
    const edgeD = (x, z) => { const r = trackNear(x, z); return r.i < 0 ? { i: -1, d: 1e9 } : { i: r.i, d: r.d - wds[r.i] }; };
    // v4.2: the lie of the land in game heights. The height grid (blurred,
    // it is a surface model: woods and roofs read as hills, so only
    // M.terrain of it counts) against the ground the lap runs on nearby,
    // weighted by distance - so it never jumps between two parts of the lap
    // (the ground under the lifted Suzuka road is the ground, not the road).
    const tf = M.terrain || 0;
    const demS = (x, z) => { let a = 0; for (const [u, v] of [[0, 0], [30, 0], [-30, 0], [0, 30], [0, -30]]) a += dem(x + u, z + v); return a / 5; };
    const TK = [];
    for (let i = 0; i < N; i += 5) TK.push(i);
    const Tat = (x, z) => {
        let sw = 0, sa = 0;
        for (const k of TK) {
            const d2 = (F[k][0] - x) ** 2 + (F[k][1] - z) ** 2;
            const w = 1 / (d2 + 900);
            sw += w; sa += w * eyAbs[k];
        }
        const base = sa / sw;
        return (tf * demS(x, z) + (1 - tf) * base - mn) * k0 - y0;
    };
    // an object's height over the ground beside the road (its ring's road - 1 m):
    // the terrain, from 14 m off the road (on the grass strip nearer in)
    const dyAt = (x, z, i, d) => {
        if (!tf) return 0;
        return clamp(Tat(x, z) - (ey[i] - 1), -40, 160) * smoothstep(14, 90, d);
    };
    // v4.2: where the grass strip's outer edge (road edge + 40 m) meets the
    // land, left and right, relative to the road: the embankments at every
    // graphics level, everywhere at ULTRA (track.js)
    // v4.2: how far the grass strip may reach out on each side before it
    // meets another part of the lap (the other leg of a hairpin, a parallel
    // straight): it must stop short of that road, or it is painted over it
    const reach = (i, nx, nz, sg) => {
        for (let d = wds[i] + 2; d <= wds[i] + 40; d += 2) {
            const x = F[i][0] + nx * d * sg, z = F[i][1] + nz * d * sg;
            const r = tidx.near(x, z, 60);
            if (r.i < 0) continue;
            let di = Math.abs(r.i - i); di = Math.min(di, N - di);
            if (di * 2 < 70) continue;                   // this stretch itself
            if (r.d < wds[r.i] + 4) return Math.max(2, d - wds[i] - 4);
        }
        return 40;
    };
    ctl.forEach((i, k) => {
        const a = F[(i - 1 + N) % N], b = F[(i + 1) % N];
        const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        const nx = (b[1] - a[1]) / L, nz = -(b[0] - a[0]) / L;
        pts[k].sl = reach(i, nx, nz, -1);
        pts[k].sr = reach(i, nx, nz, 1);
        const e = wds[i] + 40;
        const g = (sg) => clamp(Tat(F[i][0] + nx * e * sg, F[i][1] + nz * e * sg) - ey[i], -30, 15);
        // a lower part of the lap within reach of the strip's edge (a hillside
        // with the road coming back below): the strip slopes down to it at
        // every graphics level, or it hangs in the air as a shelf
        const below = (sg, sw) => {
            const ex = F[i][0] + nx * (wds[i] + sw) * sg, ez = F[i][1] + nz * (wds[i] + sw) * sg;
            let best = null;
            for (let q = 0; q < N; q += 2) {
                let di = Math.abs(q - i); di = Math.min(di, N - di);
                if (di * 2 < 70) continue;
                const d = Math.hypot(F[q][0] - ex, F[q][1] - ez) - wds[q];
                if (d < 45 && ey[q] < ey[i] - 2 && (!best || ey[q] < best)) best = ey[q];
            }
            return best === null ? null : clamp(best - 1.2 - ey[i], -30, 0);
        };
        let gl = g(-1), gr = g(1);
        const bl2 = below(-1, pts[k].sl), br2 = below(1, pts[k].sr);
        if (bl2 !== null) { gl = Math.min(gl, bl2); pts[k].f |= F_EMB; }
        if (br2 !== null) { gr = Math.min(gr, br2); pts[k].f |= F_EMB; }
        pts[k].gl = +gl.toFixed(2);
        pts[k].gr = +gr.toFixed(2);
    });
    const push = (o) => objs.push(o);
    const used = new Set();       // building ids given a special model

    // -- the named sights --
    const sights = [];
    const nameOf = (e) => ((e.tags && (e.tags['name:en'] || e.tags.name)) || '');
    for (const e of OSM.elements.concat(SG.elements)) {
        if (!e.tags) continue;
        const nm = nameOf(e) + ' ' + (e.tags.name || '');
        let kind = null;
        if (e.tags.attraction === 'big_wheel') kind = 'wheel';
        else if (/Casino de Monte-Carlo|Monte-Carlo Casino/i.test(nm) && e.tags.building) kind = 'casino';
        // the model is all three towers and the SkyPark on top: one, at the SkyPark
        else if (/SkyPark/i.test(nm)) kind = 'mbs';
        else if (/Flame Tower|Alov qüll/i.test(nm)) kind = 'flame';
        else if (/Maiden Tower|Qız qalası|Qiz Qalasi/i.test(nm)) kind = 'maiden';
        else if (/^The Wing$|Silverstone Wing/i.test(nameOf(e))) kind = 'wing';
        if (!kind) continue;
        let x, z, poly = null;
        if (e.center) [x, z] = P.fwd(e.center.lon, e.center.lat);
        else if (e.type === 'node') [x, z] = P.fwd(e.lon, e.lat);
        else { const ps = polysOf(e, P); if (!ps.length) continue; poly = ps[0]; [x, z] = centroid(poly); }
        if (!poly && e.geometry) poly = polysOf(e, P)[0] || null;
        if (sights.some((s) => s.kind === kind && Math.hypot(s.x - x, s.z - z) < (kind === 'flame' ? 25 : 120))) { used.add(e.id); continue; }
        sights.push({ kind, x, z, poly, e });
        used.add(e.id);
    }
    // sights the map has no name on: at a known place, fitted to the building there
    for (const [kind, la, lo] of M.sightsLL || []) {
        if (sights.some((s) => s.kind === kind)) continue;
        const [x, z] = P.fwd(lo, la);
        let poly = null, pe = null;
        for (const e of OSM.elements) {
            if (!e.tags || !e.tags.building) continue;
            for (const p of polysOf(e, P)) if (inside(p, x, z)) { poly = p; pe = e; }
            if (poly) break;
        }
        const [cx, cz] = poly ? centroid(poly) : [x, z];
        if (pe) used.add(pe.id);
        sights.push({ kind, x: cx, z: cz, poly, e: pe || { tags: { name: kind } } });
    }
    // Buildings that make up a sight are drawn by its model
    const nearSight = (x, z) => sights.some((s) => Math.hypot(s.x - x, s.z - z) < ({ mbs: 150, casino: 40, flame: 45, maiden: 14, wing: 90, wheel: 0 })[s.kind]);
    // the Flame Towers are three; the map may name only one
    {
        const f = sights.find((s) => s.kind === 'flame');
        if (f && sights.filter((s) => s.kind === 'flame').length < 3) {
            sights.push({ ...f, x: f.x - 38, z: f.z - 22, poly: null, k: 0.9 });
            sights.push({ ...f, x: f.x + 6, z: f.z - 48, poly: null, k: 0.84 });
        }
    }
    for (const s of sights) {
        const r0 = trackNear(s.x, s.z, 3000);
        const r = r0.i < 0 ? r0 : { i: r0.i, d: r0.d - wds[r0.i] };
        if (r.i < 0 || r.d > 2600) continue;
        const toward = F[r.i];
        let yaw = Math.atan2(toward[0] - s.x, toward[1] - s.z) * 180 / Math.PI;
        let k = 1, sx = 1, sz = 1, sy = 1;
        if (s.poly) {
            const b = obb(s.poly);
            const along = b.hu >= b.hv ? b.ang : b.ang + Math.PI / 2;
            if (s.kind === 'casino' || s.kind === 'wing' || s.kind === 'mbs') {
                // long side along the model's x, front facing the road
                const vx = -Math.sin(along), vz = Math.cos(along);
                const sgn = (toward[0] - s.x) * vx + (toward[1] - s.z) * vz >= 0 ? 1 : -1;
                yaw = Math.atan2(vx * sgn, vz * sgn) * 180 / Math.PI;
                const Lx = 2 * Math.max(b.hu, b.hv), Lz = 2 * Math.min(b.hu, b.hv);
                const ref = { casino: [44, 24], wing: [126, 26], mbs: [106, 18] }[s.kind];
                sx = clamp(Lx / ref[0], 0.6, 2.2); sz = clamp(Lz / ref[1], 0.6, 2.6);
                if (s.kind === 'mbs') { sx = clamp(Lx / ref[0], 1.4, 3.4); sz = sx * 0.9; }
            }
        }
        const Hs = { wheel: 64, mbs: 104, flame: 118, casino: 28, maiden: 29.5, wing: 12.5 };
        const h = parseLen(s.e.tags.height);
        if (s.kind === 'wheel') { k = clamp((isFinite(h) ? h : (C.id === 'sg-2008' ? 165 : 50)) / Hs.wheel, 0.5, 3); sx = sy = sz = k; }
        else if (s.kind === 'flame') { k = clamp((isFinite(h) ? h : 160) / Hs.flame, 0.8, 1.7) * (s.k || 1); sx = sy = sz = k; }
        else if (s.kind === 'mbs') sy = clamp((isFinite(h) ? h : 194) / Hs.mbs, 1.2, 2.2);
        else if (s.kind === 'maiden') { sx = sy = sz = 1; }
        else sy = Math.max(sx, sz) * 0.9;
        push({ t: s.kind, i: r.i, x: s.x, z: s.z, dy: dyAt(s.x, s.z, r.i, r.d), yaw, sx, sy, sz, m: 0, tier: 1, chk: 1, why: 'sight ' + nameOf(s.e) });
    }

    // -- buildings --
    const bl = [];
    const heightOf = (t) => {
        let h = parseLen(t.height);
        if (!isFinite(h)) { const lv = parseLen(t['building:levels']); if (isFinite(lv)) h = lv * 3.2 + (parseLen(t['roof:levels']) > 0 ? 2 : 1); }
        if (!isFinite(h)) {
            const b = t.building;
            h = ({ house: 7, detached: 7, semidetached_house: 7, terrace: 8, residential: 9, apartments: 18, commercial: 13, office: 16, retail: 7, industrial: 8, warehouse: 9, hangar: 11, garage: 3.2, garages: 3.2, shed: 3, roof: 5, carport: 3, service: 4, grandstand: 12, hotel: 22, church: 16, school: 10, hospital: 20, train_station: 10, stadium: 16, construction: 8, kiosk: 3, hut: 3, toilets: 3, transformer_tower: 6, static_caravan: 3 })[b] ?? M.defH;
        }
        const mh = parseLen(t.min_height);
        return { h: clamp(h, 2.5, 320), mh: isFinite(mh) ? mh : 0 };
    };
    for (const e of OSM.elements) {
        if (!e.tags || !e.tags.building || used.has(e.id)) continue;
        if (e.tags.building === 'no' || e.tags['building:part']) continue;
        const polys = polysOf(e, P);
        for (const poly0 of polys) {
            const A0 = Math.abs(area(poly0));
            if (A0 < 22) continue;
            const { h, mh } = heightOf(e.tags);
            if (mh > h - 2) continue;
            // L and U shapes: split along the long side until the box fits
            const parts = [];
            const split = (poly, depth) => {
                const b = obb(poly);
                const A = Math.abs(area(poly)), Ab = 4 * b.hu * b.hv;
                if (depth < 2 && A / Ab < 0.62 && Math.max(b.hu, b.hv) > 14) {
                    const ux = Math.cos(b.ang), uz = Math.sin(b.ang);
                    const [nx, nz] = b.hu >= b.hv ? [ux, uz] : [-uz, ux];
                    const c = b.cx * nx + b.cz * nz;
                    const p1 = clipHalf(poly, nx, nz, c), p2 = clipHalf(poly, -nx, -nz, -c);
                    if (p1.length >= 3 && p2.length >= 3) { split(p1, depth + 1); split(p2, depth + 1); return; }
                }
                parts.push({ b, A });
            };
            split(poly0, 0);
            for (const { b, A } of parts) {
                if (A < 12) continue;
                // the nearest point of the footprint to the road
                const corners = [];
                const ux = Math.cos(b.ang), uz = Math.sin(b.ang);
                for (const [su, sv] of [[1, 1], [1, -1], [-1, -1], [-1, 1], [0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]])
                    corners.push([b.cx + ux * b.hu * su - uz * b.hv * sv, b.cz + uz * b.hu * su + ux * b.hv * sv]);
                let bi = -1, bd = 1e9;
                for (const q of corners) { const r = edgeD(q[0], q[1]); if (r.d < bd) { bd = r.d; bi = r.i; } }
                if (bi < 0) continue;
                const maxD = h > 100 ? 1400 : h > 40 ? 600 : h > 18 ? 360 : 260;
                if (bd > maxD) continue;
                if (nearSight(b.cx, b.cz)) continue;
                const overTun = tun[bi] && bd < 2;
                if (bd < -1.5 && !overTun) continue;       // a mapping slip right on the road
                const score = Math.sqrt(A) * Math.sqrt(h) / (Math.max(bd, 0) + 22);
                bl.push({ e, b, A, h, mh, i: bi, d: bd, overTun, score });
            }
        }
    }
    // Dense old towns (Monaco, Baku, the Interlagos hillsides) are rows of
    // small houses wall to wall: merge neighbours of about the same height
    // into one box wherever the box still fits them snugly. Fewer, bigger
    // boxes look the same from the road and cost far less to draw.
    if (M.merge) {
        const corners = (b) => { const ux = Math.cos(b.ang), uz = Math.sin(b.ang); return [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([a, c]) => [b.cx + ux * b.hu * a - uz * b.hv * c, b.cz + uz * b.hu * a + ux * b.hv * c]); };
        let merged = 0, again = true;
        while (again) {
            again = false;
            const idx = new PointIndex(bl.map((o) => [o.b.cx, o.b.cz]), 40);
            const dead = new Set();
            for (let a = 0; a < bl.length; a++) {
                if (dead.has(a)) continue;
                const A = bl[a];
                if (A.overTun) continue;
                const ra = Math.hypot(A.b.hu, A.b.hv);
                let best = null;
                const gx = Math.floor(A.b.cx / 40), gz = Math.floor(A.b.cz / 40);
                for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
                    for (const bI of idx.m.get((gx + i) + ',' + (gz + j)) || []) {
                        if (bI === a || dead.has(bI)) continue;
                        const B = bl[bI];
                        if (B.overTun || B.e.tags.building === 'grandstand' || A.e.tags.building === 'grandstand') continue;
                        if (Math.min(A.h, B.h) / Math.max(A.h, B.h) < 0.72) continue;
                        const rb = Math.hypot(B.b.hu, B.b.hv);
                        if (Math.hypot(A.b.cx - B.b.cx, A.b.cz - B.b.cz) > ra + rb + 2) continue;
                        const ob = obb(corners(A.b).concat(corners(B.b)));
                        const fill = (A.A + B.A) / (4 * ob.hu * ob.hv);
                        if (fill < 0.74 || Math.max(ob.hu, ob.hv) > 45) continue;
                        if (!best || fill > best.fill) best = { bI, ob, fill };
                    }
                }
                if (best) {
                    const B = bl[best.bI];
                    const Ar = A.A + B.A;
                    bl[a] = { ...A, b: best.ob, A: Ar, h: (A.h * A.A + B.h * B.A) / Ar, mh: Math.min(A.mh, B.mh), d: Math.min(A.d, B.d), i: A.d <= B.d ? A.i : B.i, score: A.score + B.score };
                    dead.add(best.bI); merged++; again = true;
                }
            }
            bl.splice(0, bl.length, ...bl.filter((_, k) => !dead.has(k)));
        }
        M._merged = merged;
    }
    bl.sort((p, q) => q.score - p.score);
    const keepB = bl.slice(0, M.nB);
    keepB.forEach((o, r) => {
        const t = o.e.tags;
        const grand = t.building === 'grandstand' || /grandstand|tribune|tribuna|stand$/i.test(t.name || '');
        const tier = r < keepB.length * 0.3 ? 1 : r < keepB.length * (M.hi || 0.55) ? 2 : 3;
        if (grand) {
            const b = o.b;
            const along = b.hu >= b.hv ? b.ang : b.ang + Math.PI / 2;
            const vx = -Math.sin(along), vz = Math.cos(along);
            const tp = F[o.i];
            const sgn = (tp[0] - b.cx) * vx + (tp[1] - b.cz) * vz >= 0 ? 1 : -1;
            const yaw = Math.atan2(vx * sgn, vz * sgn) * 180 / Math.PI;
            const Lx = 2 * Math.max(b.hu, b.hv), Lz = 2 * Math.min(b.hu, b.hv);
            push({ t: 'stand', i: o.i, x: b.cx, z: b.cz, dy: dyAt(b.cx, b.cz, o.i, o.d), yaw, sx: clamp(Lx / 39, 0.3, 6), sy: clamp(o.h / 15.5, 0.6, 1.8), sz: clamp(Lz / 16.5, 0.4, 3.5), m: 0, tier: Math.min(tier, 2), chk: 1, why: 'stand ' + (t.name || '') });
            return;
        }
        // model x along the box's first axis: yaw = -angle
        const yaw = -o.b.ang * 180 / Math.PI;
        const tall = o.h > 42;
        const cols = M.cols;
        let col = cols[Math.floor(hash01(o.e.id, 'c') * cols.length)];
        if (tall && M.glass != null && hash01(o.e.id, 'g') < 0.7) col = M.glass;
        const sink = 5;
        let dy = dyAt(o.b.cx, o.b.cz, o.i, o.d) + o.mh - sink;
        let sy = o.h - o.mh + sink;
        if (o.overTun) {
            // over the tunnel: it starts on the tunnel roof (7 m, track.js
            // TUNH, + the 1 m the ground sits below the road), not on the road
            const roof = 8.3;
            const top = dy + sy;
            dy = Math.max(dy, roof);
            sy = Math.max(top - dy, 4);
        }
        push({ t: 'block', i: o.i, x: o.b.cx, z: o.b.cz, dy, yaw, sx: Math.max(2 * o.b.hu, 2), sy, sz: Math.max(2 * o.b.hv, 2), m: col * 4, tier, chk: o.overTun ? 0 : 1 });
    });

    // -- water: sea (right of the coastline), lakes, rivers, harbours --
    const water = [];
    const wpolys = [];
    for (const e of OSM.elements) {
        if (!e.tags) continue;
        const t = e.tags;
        if (t.natural === 'water' || t.natural === 'bay' || t.waterway === 'riverbank' || t.waterway === 'dock' || t.landuse === 'basin' || t.water)
            for (const p of polysOf(e, P)) wpolys.push(p);
    }
    const coast = [];
    for (const e of OSM.elements) if (e.tags && e.tags.natural === 'coastline' && e.geometry) coast.push(lineOf(e, P));
    const coastSegs = [];
    for (const L of coast) for (let i = 0; i < L.length - 1; i++) coastSegs.push([L[i], L[i + 1]]);
    const seaSide = (x, z) => {
        let bd = 1e18, cr = 0;
        for (const [a, b] of coastSegs) {
            const dx = b[0] - a[0], dz = b[1] - a[1];
            const L2 = dx * dx + dz * dz || 1;
            const t = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / L2, 0, 1);
            const px = a[0] + dx * t, pz = a[1] + dz * t;
            const d = (x - px) ** 2 + (z - pz) ** 2;
            if (d < bd) { bd = d; cr = dx * (z - a[1]) - dz * (x - a[0]); }
        }
        return Math.sqrt(bd) < 2500 && cr < 0;
    };
    {
        let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
        for (const p of F) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
        const CS = 30, R = 380;
        x0 -= R; x1 += R; z0 -= R; z1 += R;
        const nx = Math.ceil((x1 - x0) / CS), nz = Math.ceil((z1 - z0) / CS);
        const cell = new Uint8Array(nx * nz);
        const bw = wpolys.map((p) => { let a = 1e9, b = -1e9, c = 1e9, d = -1e9; for (const q of p) { a = Math.min(a, q[0]); b = Math.max(b, q[0]); c = Math.min(c, q[1]); d = Math.max(d, q[1]); } return [a, b, c, d]; });
        for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
            const x = x0 + (i + 0.5) * CS, z = z0 + (j + 0.5) * CS;
            const r = edgeD(x, z);
            if (r.i < 0 || r.d > R || r.d < 9) continue;
            let w = 0;
            for (let k = 0; k < wpolys.length && !w; k++) { const B = bw[k]; if (x >= B[0] && x <= B[1] && z >= B[2] && z <= B[3] && inside(wpolys[k], x, z)) w = 1; }
            if (!w && M.sea && coastSegs.length && seaSide(x, z)) w = 2;
            cell[j * nx + i] = w;
        }
        // greedy rectangles of up to 5 x 5 cells (150 m)
        const taken = new Uint8Array(nx * nz);
        for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
            const k = j * nx + i;
            if (!cell[k] || taken[k]) continue;
            let w = 1; while (i + w < nx && w < 5 && cell[k + w] && !taken[k + w]) w++;
            let h = 1;
            outer: while (j + h < nz && h < 5) { for (let q = 0; q < w; q++) { const kk = (j + h) * nx + i + q; if (!cell[kk] || taken[kk]) break outer; } h++; }
            for (let a = 0; a < h; a++) for (let q = 0; q < w; q++) taken[(j + a) * nx + i + q] = 1;
            const cx = x0 + (i + w / 2) * CS, cz = z0 + (j + h / 2) * CS;
            const r = edgeD(cx, cz);
            water.push({ cx, cz, w: w * CS, h: h * CS, i: r.i, d: r.d, sea: cell[k] === 2 });
        }
    }
    for (const w of water) {
        const lvl = w.sea ? 0 : Math.min(dem(w.cx, w.cz), eyAbs[w.i]);
        const dy = clamp((lvl - eyAbs[w.i]) * k0, -14, -0.4);
        push({ t: 'sheet', i: w.i, x: w.cx, z: w.cz, dy, yaw: 0, sx: w.w + 0.5, sy: 1, sz: w.h + 0.5, m: 0, tier: w.d < 150 ? 1 : w.d < 300 ? 2 : 3, chk: 0 });
    }
    // yachts in the harbour
    if (M.yachts) {
        const sea = water.filter((w) => w.sea && w.d < 170 && w.d > 18);
        sea.sort((a, b) => hash01(a.cx, a.cz) - hash01(b.cx, b.cz));
        for (const w of sea.slice(0, M.yachts)) {
            const r = edgeD(w.cx, w.cz);
            const k = 0.9 + hash01(w.cz) * 0.6;
            push({ t: 'yacht', i: r.i, x: w.cx, z: w.cz, dy: -1.2, yaw: hash01(w.cx, 'y') * 360, sx: k, sy: k, sz: k, m: 0, tier: 2, chk: 1 });
        }
    }

    // -- trees --
    const trees = [];
    const tpol = [];
    for (const e of OSM.elements) {
        if (!e.tags) continue;
        const t = e.tags;
        let sp = 0;
        if (t.natural === 'wood' || t.landuse === 'forest') sp = 13;
        else if (t.leisure === 'park' || t.leisure === 'garden' || t.landuse === 'orchard') sp = 26;
        else if (t.natural === 'scrub') sp = 30;
        else if (t.leisure === 'golf_course') sp = 40;
        if (!sp) continue;
        for (const p of polysOf(e, P)) tpol.push({ p, sp, id: e.id });
    }
    for (const { p, sp, id } of tpol) {
        let a = 1e9, b = -1e9, c = 1e9, d = -1e9;
        for (const q of p) { a = Math.min(a, q[0]); b = Math.max(b, q[0]); c = Math.min(c, q[1]); d = Math.max(d, q[1]); }
        for (let x = Math.floor(a / sp) * sp; x <= b; x += sp) for (let z = Math.floor(c / sp) * sp; z <= d; z += sp) {
            const jx = x + (hash01(id, x, z, 'x') - 0.5) * sp * 0.8, jz = z + (hash01(id, x, z, 'z') - 0.5) * sp * 0.8;
            if (!inside(p, jx, jz)) continue;
            const r = edgeD(jx, jz);
            if (r.i < 0 || r.d < 7 || r.d > 240) continue;
            if (hash01(jx, jz, 'k') > clamp(1.35 - r.d / 190, 0.22, 1)) continue;
            trees.push({ x: jx, z: jz, i: r.i, d: r.d, id });
        }
    }
    for (const e of OSM.elements) {
        if (!e.tags) continue;
        if (e.type === 'node' && e.tags.natural === 'tree') {
            const [x, z] = P.fwd(e.lon, e.lat);
            const r = edgeD(x, z);
            if (r.i >= 0 && r.d > 4 && r.d < 160) trees.push({ x, z, i: r.i, d: r.d, id: e.id, lone: 1 });
        } else if (e.tags.natural === 'tree_row' && e.geometry) {
            const L = lineOf(e, P);
            for (let i = 0; i < L.length - 1; i++) {
                const d = Math.hypot(L[i + 1][0] - L[i][0], L[i + 1][1] - L[i][1]);
                for (let s = 0; s < d; s += 11) {
                    const x = L[i][0] + (L[i + 1][0] - L[i][0]) * s / d, z = L[i][1] + (L[i + 1][1] - L[i][1]) * s / d;
                    const r = edgeD(x, z);
                    if (r.i >= 0 && r.d > 4 && r.d < 160) trees.push({ x, z, i: r.i, d: r.d, id: e.id, lone: 1 });
                }
            }
        }
    }
    trees.sort((p, q) => p.d - q.d);
    const TS = { pine: 1.15, oak: 1.1, palm: 1.0 };
    const nT = Math.min(trees.length, M.nT);
    // LOW gets 30 %, HIGH 55 %, spread out
    // (every other one) rather than cut off at a distance
    trees.slice(0, nT).forEach((t, r) => {
        const kind = M.trees[Math.floor(hash01(t.x, t.z, 'kind') * M.trees.length)];
        const k = TS[kind] * (0.8 + hash01(t.x, t.z, 's') * 0.55);
        const h = hash01(t.x, t.z, 'tier');
        const tier = h < 0.3 ? 1 : h < 0.55 ? 2 : 3;
        push({ t: kind, i: t.i, x: t.x, z: t.z, dy: dyAt(t.x, t.z, t.i, t.d), yaw: hash01(t.x, 'yaw') * 360, sx: k, sy: k, sz: k, m: 0, tier, chk: 1 });
        void r;
    });

    // -- the crossover's girders --
    if (bridgeAt) {
        const q = F[bridgeAt.lo];
        push({ t: 'bridge', i: bridgeAt.lo, x: q[0], z: q[1], dy: ey[bridgeAt.up] - 0.25 - 11 - ey[bridgeAt.lo] + 1 + 1.0, yaw: bridgeAt.yaw, sx: 1, sy: 1, sz: 1, m: 0, tier: 1, chk: 0, why: 'bridge' });
    }

    // ---------------- v4.2 the land round the circuit ----------------
    // A height grid over the mapped area, cells as fine as fit 4900 corners
    // (30 m at least). A cell is drawn where it is beyond the grass strip
    // and not water; its colour is the land cover (woods, town, else the
    // circuit's ground). Tier 2 (HIGH) round the Suzuka crossover, else 3.
    let terrain = null;
    {
        const [a0, b0, a1, b1] = GR.bbox;
        const [gx0, gz0] = P.fwd(b0, a0), [gx1, gz1] = P.fwd(b1, a1);
        const Wd = gx1 - gx0, Hd = gz1 - gz0;
        let c = 30;
        while ((Math.ceil(Wd / c) + 1) * (Math.ceil(Hd / c) + 1) > 4900) c += 5;
        const nx = Math.ceil(Wd / c), nz = Math.ceil(Hd / c);
        const h = [];
        for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) h.push(+Tat(gx0 + i * c, gz0 + j * c).toFixed(2));
        const woods = tpol.filter((t) => t.sp === 13).map((t) => t.p);
        const towns = [];
        for (const e of OSM.elements) {
            const t = e.tags || {};
            if (/^(residential|commercial|industrial|retail|construction|railway)$/.test(t.landuse || '')) for (const p of polysOf(e, P)) towns.push(p);
        }
        const bb = (L) => L.map((p) => { let q0 = 1e9, q1 = -1e9, r0 = 1e9, r1 = -1e9; for (const q of p) { q0 = Math.min(q0, q[0]); q1 = Math.max(q1, q[0]); r0 = Math.min(r0, q[1]); r1 = Math.max(r1, q[1]); } return [q0, q1, r0, r1]; });
        const wB = bb(woods), tB = bb(towns), qB = bb(wpolys);
        const inAny = (L, B, x, z) => { for (let k = 0; k < L.length; k++) { const q = B[k]; if (x >= q[0] && x <= q[1] && z >= q[2] && z <= q[3] && inside(L[k], x, z)) return true; } return false; };
        const bI = bridgeAt ? [F[bridgeAt.lo], F[bridgeAt.up]] : null;
        // where buildings stand wall to wall the land between them is never
        // seen: a cell 35 % built over is left out (Monaco is mostly that)
        const built = new PointIndex(bl.map((o) => [o.b.cx, o.b.cz]), 60);
        const coverage = (x0c, z0c) => {
            let hit = 0;
            const near = [];
            const gx = Math.floor((x0c + c / 2) / 60), gz = Math.floor((z0c + c / 2) / 60);
            for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) for (const k of built.m.get((gx + a) + ',' + (gz + b)) || []) near.push(bl[k].b);
            if (!near.length) return 0;
            for (let a = 0; a < 5; a++) for (let b = 0; b < 5; b++) {
                const x = x0c + (a + 0.5) * c / 5, z = z0c + (b + 0.5) * c / 5;
                for (const o of near) {
                    const ux = Math.cos(o.ang), uz = Math.sin(o.ang);
                    const lx = (x - o.cx) * ux + (z - o.cz) * uz, lz = -(x - o.cx) * uz + (z - o.cz) * ux;
                    if (Math.abs(lx) <= o.hu && Math.abs(lz) <= o.hv) { hit++; break; }
                }
            }
            return hit / 25;
        };
        let builtOut = 0;
        const cells = [];
        let n = 0;
        for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
            const x = gx0 + (i + 0.5) * c, z = gz0 + (j + 0.5) * c;
            const r = edgeD(x, z);
            let k = 0;
            let ok = r.i >= 0 && r.d > 40 + c * 0.2 && !inAny(wpolys, qB, x, z) && !(M.sea && coastSegs.length && seaSide(x, z));
            if (ok && coverage(gx0 + i * c, gz0 + j * c) >= 0.35) { ok = false; builtOut++; }
            if (ok) {
                k = inAny(woods, wB, x, z) ? 2 : inAny(towns, tB, x, z) ? 3 : 1;
                const near = bI && Math.min(Math.hypot(x - bI[0][0], z - bI[0][1]), Math.hypot(x - bI[1][0], z - bI[1][1])) < 380;
                k += 4 * (near ? 2 : 3);
                n++;
            }
            cells.push(k);
        }
        terrain = { x0: +gx0.toFixed(1), z0: +gz0.toFixed(1), c, nx, nz, h, cells, n };
        M._terrain = `${nx}x${nz} of ${c} m, ${n} cells (${builtOut} built over)`;
    }

    // ---------------- the skyline ----------------
    const ref = eyAbs.reduce((a, b) => a + b, 0) / N;
    const eye = 1.6;
    const bearings = 64;
    const nearT = [], farT = [];
    for (let a = 0; a < bearings; a++) {
        let tn = -1, tf = -1;
        EL.dist.forEach((d, k) => {
            const h = EL.ring[a * EL.dist.length + k][2];
            if (h == null) return;
            const drop = d * d / (2 * 6371000) * 0.87;
            const t = (h - drop - ref - eye) / d;
            if (d <= 2500) tn = Math.max(tn, t); else tf = Math.max(tf, t);
        });
        nearT.push(tn); farT.push(tf);
    }
    // 60 buckets of 6 degrees (what the renderer indexes)
    const b60 = (T) => Array.from({ length: 60 }, (_, j) => {
        const az = (j + 0.5) * 6;
        const f = az / 360 * bearings, i0 = Math.floor(f) % bearings, i1 = (i0 + 1) % bearings, t = f - Math.floor(f);
        return +clamp(T[i0] * (1 - t) + T[i1] * t, 0.004, 0.35).toFixed(4);
    });

    out[C.slot] = {
        id: C.id, name: LN.props.Name, len: +len.toFixed(1), official: LN.props.length, pit: pitInfo,
        pts, bridgeAt: bridgeAt ? { u: bridgeAt.lo / N, yaw: +bridgeAt.yaw.toFixed(2), gap: +bridgeAt.gap.toFixed(2), miss: +bridgeAt.miss.toFixed(2) } : null,
        objs: objs.map((o) => ({ ...o, u: +(((o.i % N) + N) % N / N).toFixed(5) })),
        hN: b60(nearT), hF: b60(farT), terrain,
        range: +(Math.max(...ey) - Math.min(...ey)).toFixed(1), srtmRange: +(mx - mn).toFixed(1),
    };
    const cnt = {}; for (const o of objs) cnt[o.t] = (cnt[o.t] || 0) + 1;
    const tiers = [1, 2, 3].map((t) => objs.filter((o) => o.tier <= t).length);
    console.log(`${C.id} ${LN.props.Name}: ${len.toFixed(0)} m (official ${LN.props.length}), ${pts.length} ctl, snapped ${M._snap || '-'} rough ${M._rough}, start: ${pitInfo}, ` +
        `height ${out[C.slot].range} m (SRTM ${out[C.slot].srtmRange}), tunnel ${tun.reduce((a, b) => a + b, 0) * 2} m` +
        (M._narrow ? `, narrow ${M._narrow}` : '') + (M._terrain ? `, land ${M._terrain}` : '') + (bridgeAt ? `, bridge gap ${bridgeAt.gap.toFixed(1)} m (miss ${bridgeAt.miss.toFixed(1)} m)` : ''));
    console.log('   objects', JSON.stringify(cnt), M._merged ? `merged ${M._merged}` : '', 'by tier', tiers.join('/'), 'sights', sights.map((s) => s.kind + ':' + nameOf(s.e)).join(', '));
}
const prev = fs.existsSync(path.join(HERE, 'circuits.json')) ? JSON.parse(fs.readFileSync(path.join(HERE, 'circuits.json'), 'utf8')) : {};
fs.writeFileSync(path.join(HERE, 'circuits.json'), JSON.stringify({ ...prev, ...out }));
console.log('wrote real/circuits.json', Object.keys({ ...prev, ...out }).join(','));
