// The island as flat shapes for the big map, the menu's map and the minimap: terrain colour
// rectangles (sampled every 16 m, banded by ground, height and slope shading, merged greedily),
// roads as line pieces, buildings as their footprints. Coordinates in map units: 0..N over the map.
import { MATERIALS } from './geom.mjs';
import { ALL } from './prefabs.mjs';
import { CS, CELLS, MAP } from './mapgen.mjs';

const hex = (c) => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

// n: samples a side; returns rectangles [x0, z0, x1, z1, colour] (sample units, z up = north)
export function terrainRects(g, n) {
    const step = MAP / n;
    const col = new Array(n * n).fill(null);
    const palette = new Map();
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const x = (i + 0.5) * step, z = (j + 0.5) * step;
        const h = g.hAt(x, z);
        if (h < 0) continue;                                   // the sea and the lake: the background
        const c = Math.min(CELLS - 1, Math.floor(z / CS)) * CELLS + Math.min(CELLS - 1, Math.floor(x / CS));
        let mat = g.cellMat[c];
        if (h < 120) mat = 'sand';
        // light from the north-west: the slope's shading, three steps; height, three bands
        const sl = (g.hAt(x - step, z + step) - g.hAt(x + step, z - step)) / (step * 2.8);
        const sh = sl > 0.06 ? 2 : sl < -0.06 ? 0 : 1;
        const band = h > 3500 ? 2 : h > 1500 ? 1 : 0;
        const key = mat + sh + band;
        if (!palette.has(key)) {
            const ov = g.def && g.def.colours[mat];
            const base = ov ? [1, 3, 5].map(i => parseInt(ov.slice(i, i + 2), 16)) : MATERIALS[mat];
            const k = (0.82 + sh * 0.12) * (1 + band * 0.07);
            palette.set(key, hex(base.map(v => v * k + 8)));
        }
        col[j * n + i] = palette.get(key);
    }
    // greedy rectangles: along a row, then down while the run repeats
    const used = new Uint8Array(n * n), rects = [];
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const c = col[j * n + i];
        if (!c || used[j * n + i]) continue;
        let i2 = i; while (i2 + 1 < n && col[j * n + i2 + 1] === c && !used[j * n + i2 + 1]) i2++;
        let j2 = j;
        grow: while (j2 + 1 < n) { for (let k = i; k <= i2; k++) if (col[(j2 + 1) * n + k] !== c || used[(j2 + 1) * n + k]) break grow; j2++; }
        for (let jj = j; jj <= j2; jj++) for (let k = i; k <= i2; k++) used[jj * n + k] = 1;
        rects.push([i, j, i2 + 1, j2 + 1, c]);
    }
    return rects;
}
// roads: line pieces in sample units of an n grid (every other point of the curves), width class
export function roadLines(g, n, roads) {
    const k = n / MAP, out = [];
    for (const rd of roads) {
        const pts = rd.pts.filter((_, i) => i % 3 === 0 || i === rd.pts.length - 1);
        for (let i = 0; i + 1 < pts.length; i++) out.push([pts[i][0] * k, pts[i][1] * k, pts[i + 1][0] * k, pts[i + 1][1] * k, rd.street ? 1 : 2]);
    }
    return out;
}
// buildings: footprints (sample units), kind colour
export function buildingRects(g, n) {
    const k = n / MAP, out = [];
    for (const b of g.insts) {
        const f = ALL[b.pf - 1].foot;
        const [w, d] = b.r % 2 ? [f[1], f[0]] : f;
        const name = ALL[b.pf - 1].name;
        const c = ['barracks', 'hangar', 'tower'].includes(name) ? '#56604a' : ['warehouse', 'barn'].includes(name) ? '#6e6258' : '#5a5650';
        out.push([(b.x - w / 2) * k, (b.z - d / 2) * k, (b.x + w / 2) * k, (b.z + d / 2) * k, c]);
    }
    return out;
}
