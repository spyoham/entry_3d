// Circuit design harness. A circuit is written the way you would describe a
// real one - a run of straight, then a corner of so many degrees at so many
// metres of radius - and the closure error is then least-squares'd out of the
// straight lengths so the lap joins up exactly.
import { profile } from './analyze.mjs';

const D2R = Math.PI / 180;

// segs: [straightLength, turnDegrees(+ = left in x/z), cornerRadius]
export function circuit({ segs, hill, width, flag, step = 12 }) {
    const n = segs.length;
    const len = segs.map((s) => s[0]);
    const rad = segs.map((s) => s[2]);
    // scale the turn budget to a whole lap, keeping the relative severities
    const raw = segs.map((s) => s[1]);
    const sum = raw.reduce((a, b) => a + b, 0);
    if (Math.abs(sum) < 60) throw new Error('turns sum to ' + sum + '; the lap does not go round');
    const turn = raw.map((t) => t * 360 / sum);

    // headings: straight i is driven on heading h[i], then the corner turns
    const h = []; let a = 0;
    for (let i = 0; i < n; i++) { h.push(a); a += turn[i]; }
    const cs = h.map((x) => Math.cos(x * D2R)), sn = h.map((x) => Math.sin(x * D2R));

    // close the loop: nudge straight lengths so the displacements cancel
    for (let it = 0; it < 80; it++) {
        let dx = 0, dz = 0;
        for (let i = 0; i < n; i++) { dx += len[i] * cs[i]; dz += len[i] * sn[i]; }
        // the corners contribute too, so measure the real walk instead
        const w = walk(len, h, turn, rad);
        dx = w.x; dz = w.z;
        if (Math.hypot(dx, dz) < 0.05) break;
        let acc = 0, abs = 0, bbs = 0;
        for (let i = 0; i < n; i++) { acc += cs[i] * cs[i]; abs += cs[i] * sn[i]; bbs += sn[i] * sn[i]; }
        const det = acc * bbs - abs * abs;
        if (Math.abs(det) < 1e-9) break;
        const alpha = (-dx * bbs + dz * abs) / det;
        const beta = (-dz * acc + dx * abs) / det;
        for (let i = 0; i < n; i++) len[i] = Math.max(30, len[i] + alpha * cs[i] + beta * sn[i]);
    }

    const pts = emit(len, h, turn, rad, step);
    let tot = 0; const arc = [0];
    for (let i = 1; i < pts.length; i++) { tot += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); arc.push(tot); }
    tot += Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]);
    return pts.map((p, i) => {
        const u = arc[i] / tot;
        return {
            x: +p[0].toFixed(2), z: +p[1].toFixed(2),
            y: +hill(u).toFixed(2),
            w: +(typeof width === 'function' ? width(u) : width).toFixed(2),
            f: flag ? flag(u) : 0,
        };
    });
}

// end position of one lap of the description (should be the origin)
function walk(len, h, turn, rad) {
    let px = 0, pz = 0;
    for (let i = 0; i < len.length; i++) {
        const c = Math.cos(h[i] * D2R), s = Math.sin(h[i] * D2R);
        px += c * len[i]; pz += s * len[i];
        const t = turn[i] * D2R, sg = t >= 0 ? 1 : -1;
        const cx = px - s * rad[i] * sg, cz = pz + c * rad[i] * sg;
        const a0 = Math.atan2(pz - cz, px - cx) + t;
        px = cx + Math.cos(a0) * rad[i]; pz = cz + Math.sin(a0) * rad[i];
    }
    return { x: px, z: pz };
}

function emit(len, h, turn, rad, step) {
    const pts = [];
    let px = 0, pz = 0;
    for (let i = 0; i < len.length; i++) {
        const c = Math.cos(h[i] * D2R), s = Math.sin(h[i] * D2R);
        const m = Math.max(1, Math.round(len[i] / step));
        for (let k = 0; k < m; k++) pts.push([px + c * len[i] * (k / m), pz + s * len[i] * (k / m)]);
        px += c * len[i]; pz += s * len[i];
        const t = turn[i] * D2R, sg = t >= 0 ? 1 : -1;
        const cx = px - s * rad[i] * sg, cz = pz + c * rad[i] * sg;
        const a0 = Math.atan2(pz - cz, px - cx);
        const steps = Math.max(2, Math.ceil(Math.abs(t) * rad[i] / step));
        for (let k = 0; k < steps; k++) {
            const aa = a0 + t * (k / steps);
            pts.push([cx + Math.cos(aa) * rad[i], cz + Math.sin(aa) * rad[i]]);
        }
        const ae = a0 + t;
        px = cx + Math.cos(ae) * rad[i]; pz = cz + Math.sin(ae) * rad[i];
    }
    return pts;
}

export const SHAPES = {
    // Fast permanent circuit: 700 m pit straight, two long sweepers, a
    // stadium complex and a 44 m hairpin onto the back straight.
    'SUNSET RING': {
        segs: [
            [700, 40, 170], [180, 34, 150], [230, 52, 120], [150, 30, 190],
            [320, 46, 95], [120, -34, 70], [90, 62, 44], [260, 36, 130],
            [190, -30, 80], [110, 54, 52], [300, 40, 140], [210, 20, 200],
        ],
        hill: (u) => 15 * Math.sin(u * 6.2832 * 2 + 0.5) + 8 * Math.sin(u * 6.2832 * 3 + 2.1),
        width: (u) => 10.6 + 1.7 * Math.sin(u * 6.2832 * 2 + 0.4),
    },
    // Mountain road: narrow, steep, two hairpins, a rock tunnel and a crest.
    'CANYON RALLY': {
        segs: [
            [420, 30, 90], [140, 58, 42], [130, 46, 38], [200, -46, 60],
            [150, 52, 36], [120, -40, 55], [240, 44, 46], [180, 32, 70],
            [140, 60, 34], [260, -32, 80], [170, 48, 40], [150, 38, 48],
            [300, 30, 75], [130, -26, 65], [190, 40, 44], [220, 26, 110],
        ],
        hill: (u) => 32 * Math.sin(u * 6.2832 + 0.3) + 14 * Math.sin(u * 6.2832 * 3 + 0.9) + 6 * Math.sin(u * 6.2832 * 5 + 2.2),
        width: (u) => 8.6 + 1.1 * Math.sin(u * 6.2832 * 4),
    },
    // Night street circuit: walled throughout, two very long straights, hard
    // junctions and a tight chicane.
    'HARBOUR NIGHT': {
        segs: [
            [820, 90, 55], [300, 88, 50], [420, -88, 46], [130, 88, 46],
            [560, 48, 70], [240, -46, 38], [140, 78, 40], [380, 34, 90],
            [200, 86, 48], [260, -34, 60], [180, 46, 44],
        ],
        hill: (u) => 6 * Math.sin(u * 6.2832 * 3) + 3.5 * Math.sin(u * 6.2832 * 5 + 1.0),
        width: (u) => 11.0 + 1.4 * Math.sin(u * 6.2832 * 3 + 1.2),
    },
};

if (process.argv[1] && process.argv[1].endsWith('tune.mjs')) {
    for (const [name, sh] of Object.entries(SHAPES)) {
        try { console.log(name.padEnd(15), JSON.stringify(profile(circuit(sh)))); }
        catch (e) { console.log(name.padEnd(15), 'ERR', e.message); }
    }
}
