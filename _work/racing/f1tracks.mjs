// ============================================================
// f1tracks.mjs - the eight Formula 1 circuits.
// A circuit is written the way a track map reads: a straight of so many
// metres, then a corner of so many degrees (+ left, - right) at so many
// metres of radius. The builder then
//   * bends the corner angles so the lap turns exactly +-360 (or 0 for a
//     figure of eight), spreading the correction over every corner,
//   * least-squares the straight lengths so the lap closes on itself,
//   * scales the whole map (and with it every radius) by `scale`,
//   * and hands elevation / width / flags a table of named positions
//     (s3 = start of straight 3, c3 = apex of corner 3, e3 = exit of corner 3)
//     so they can be keyed to corners instead of guessed fractions.
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
const D2R = Math.PI / 180;

// flags: 1 tunnel, 2 jump ramp, 4 barrier walls, 32 no run-off (bridge deck)
export const F_TUN = 1, F_WALL = 4, F_BRIDGE = 32;

export function circuit(def) {
    if (def.verts) return finish(def, fillet(def));
    const { segs, scale = 1, step = 11 } = def;
    const n = segs.length;
    const len = segs.map((s) => s[0] * scale);
    const rad = segs.map((s) => s[2] * scale);
    let turn = segs.map((s) => s[1]);
    // bend the angles so the heading returns to where it started
    const sum = turn.reduce((a, b) => a + b, 0);
    const target = def.figure8 ? 0 : Math.sign(sum) * 360;
    const absSum = turn.reduce((a, b) => a + Math.abs(b), 0);
    turn = turn.map((t) => t + (target - sum) * Math.abs(t) / absSum);

    const h = []; let a = 0;
    for (let i = 0; i < n; i++) { h.push(a); a += turn[i]; }
    const cs = h.map((x) => Math.cos(x * D2R)), sn = h.map((x) => Math.sin(x * D2R));
    const fixed = def.fixed || [];             // straights whose length must not change
    for (let it = 0; it < 200; it++) {
        const w = walk(len, h, turn, rad);
        if (Math.hypot(w.x, w.z) < 0.02) break;
        let acc = 0, abs = 0, bbs = 0;
        const wt = len.map((_, i) => (fixed.includes(i) ? 0.02 : 1));
        for (let i = 0; i < n; i++) { acc += wt[i] * cs[i] * cs[i]; abs += wt[i] * cs[i] * sn[i]; bbs += wt[i] * sn[i] * sn[i]; }
        const det = acc * bbs - abs * abs;
        if (Math.abs(det) < 1e-9) break;
        const alpha = (-w.x * bbs + w.z * abs) / det;
        const beta = (-w.z * acc + w.x * abs) / det;
        for (let i = 0; i < n; i++) len[i] = Math.max(25, len[i] + wt[i] * (alpha * cs[i] + beta * sn[i]));
    }
    const closeErr = Math.hypot(walk(len, h, turn, rad).x, walk(len, h, turn, rad).z);
    if (closeErr > 1) throw new Error(`${def.name}: lap does not close (${closeErr.toFixed(1)} m)`);

    return finish(def, emit(len, h, turn, rad, step));
}

// Corners given as map points [x, z, radius]: straight lines between them,
// each corner rounded by an arc of its radius (shrunk if the neighbouring
// straights are too short to hold it). The lap starts startFrac of the way
// along the straight into corner 1.
function fillet(def) {
    const { scale = 1, step = 11, startFrac = 0.5 } = def;
    const V = def.verts.map(([x, z, r]) => [x * scale, z * scale, r * scale]);
    const n = V.length;
    const dirs = V.map((p, i) => { const q = V[(i + 1) % n]; const L = Math.hypot(q[0] - p[0], q[1] - p[1]); return [(q[0] - p[0]) / L, (q[1] - p[1]) / L, L]; });
    const C = V.map((p, i) => {
        const din = dirs[(i - 1 + n) % n], dout = dirs[i];
        const cr = din[0] * dout[1] - din[1] * dout[0];
        const dt = Math.max(-1, Math.min(1, din[0] * dout[0] + din[1] * dout[1]));
        const ang = Math.acos(dt);
        let r = p[2];
        let tl = r * Math.tan(ang / 2);
        const lim = 0.49 * Math.min(din[2], dout[2]);
        if (tl > lim) { tl = lim; r = tl / Math.tan(ang / 2); }
        const a = [p[0] - din[0] * tl, p[1] - din[1] * tl];
        const b = [p[0] + dout[0] * tl, p[1] + dout[1] * tl];
        const sg = cr >= 0 ? 1 : -1;                     // + = left
        const cen = [a[0] - din[1] * r * sg, a[1] + din[0] * r * sg];
        return { a, b, r, ang: ang * sg, cen };
    });
    const pts = [], marks = [];
    for (let i = 0; i < n; i++) {
        // straight from the exit of the previous corner into corner i
        const P = C[(i - 1 + n) % n].b, Q = C[i].a;
        marks.push({ key: 's' + (i + 1), idx: pts.length });
        const L = Math.hypot(Q[0] - P[0], Q[1] - P[1]);
        const m = Math.max(1, Math.round(L / step));
        for (let k = 0; k < m; k++) pts.push([P[0] + (Q[0] - P[0]) * k / m, P[1] + (Q[1] - P[1]) * k / m]);
        const c = C[i];
        const arcLen = Math.abs(c.ang) * c.r;
        marks.push({ key: 'c' + (i + 1), idx: pts.length, extra: arcLen / 2 });
        marks.push({ key: 'e' + (i + 1), idx: pts.length, extra: arcLen });
        const a0 = Math.atan2(c.a[1] - c.cen[1], c.a[0] - c.cen[0]);
        const steps = Math.max(2, Math.ceil(Math.abs(c.ang) * c.r / step));
        for (let k = 0; k < steps; k++) { const aa = a0 + c.ang * k / steps; pts.push([c.cen[0] + Math.cos(aa) * c.r, c.cen[1] + Math.sin(aa) * c.r]); }
    }
    // start the lap part way down the straight into corner 1
    const m1 = marks.find((m) => m.key === 'c1').idx;
    const shift = Math.round(m1 * startFrac);
    const rot = pts.slice(shift).concat(pts.slice(0, shift));
    for (const mk of marks) mk.idx = (mk.idx - shift + pts.length) % pts.length;
    return { pts: rot, marks };
}

function finish(def, { pts, marks }) {
    // arc length of every emitted point, and the named positions as fractions
    let tot = 0; const arc = [0];
    for (let i = 1; i < pts.length; i++) { tot += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); arc.push(tot); }
    tot += Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]);
    const M = {};
    marks.forEach((m) => { M[m.key] = arc[m.idx] / tot + (m.frac || 0) * 0; });
    // corner apex / exit lie part way through the emitted arc points
    for (const m of marks) if (m.key[0] !== 's') M[m.key] = (arc[m.idx] + (m.extra || 0)) / tot;
    const at = (k) => (typeof k === 'number' ? k : M[k] + 0);
    const cheb = (u) => ((u % 1) + 1) % 1;

    // elevation keyframes, smoothly (cosine) interpolated round the lap
    const kf = (def.elev || [[0, 0]]).map(([k, y]) => [cheb(at(k)), y]).sort((p, q) => p[0] - q[0]);
    const elev = (u) => {
        if (kf.length === 1) return kf[0][1];
        for (let i = 0; i < kf.length; i++) {
            const A = kf[i], B = kf[(i + 1) % kf.length];
            let ua = A[0], ub = B[0], uu = u;
            if (ub <= ua) { ub += 1; if (uu < ua) uu += 1; }
            if (uu >= ua && uu <= ub) {
                const t = (uu - ua) / (ub - ua || 1);
                return A[1] + (B[1] - A[1]) * (0.5 - 0.5 * Math.cos(t * Math.PI));
            }
        }
        return kf[0][1];
    };
    const inRange = (u, r) => {
        const a0 = cheb(at(r[0])), a1 = cheb(at(r[1]));
        return a0 <= a1 ? u >= a0 && u <= a1 : u >= a0 || u <= a1;
    };
    const width = (u) => {
        let w = def.width;
        for (const r of def.widths || []) if (inRange(u, r)) w = r[2];
        return w;
    };
    const flag = (u) => {
        let f = def.walls ? F_WALL : 0;
        for (const r of def.flags || []) if (inRange(u, r)) f |= r[2];
        return f;
    };
    const out = pts.map((p, i) => {
        const u = arc[i] / tot;
        return { x: +p[0].toFixed(2), z: +p[1].toFixed(2), y: +elev(u).toFixed(2), w: +width(u).toFixed(2), f: flag(u) };
    });
    // soften width changes so the edges do not step
    for (let pass = 0; pass < 3; pass++) {
        const w0 = out.map((p) => p.w);
        for (let i = 0; i < out.length; i++) out[i].w = +((w0[(i - 1 + out.length) % out.length] + 2 * w0[i] + w0[(i + 1) % out.length]) / 4).toFixed(2);
    }
    const landmarks = (def.landmarks || []).map((l) => ({ ...l, u: cheb(at(l.at) + (l.du || 0)) }));
    // a figure of eight crosses itself once: find where, wall the upper road
    // over the crossing, and stand girders over the lower road
    let bridgeAt = null;
    if (def.bridge) {
        let best = 1e9, bi = 0, bj = 0;
        for (let i = 0; i < out.length; i++) for (let j = i + 1; j < out.length; j++) {
            const sep = Math.min(arc[j] - arc[i], tot - (arc[j] - arc[i]));
            if (sep < tot * 0.15) continue;
            const d = Math.hypot(out[i].x - out[j].x, out[i].z - out[j].z);
            if (d < best) { best = d; bi = i; bj = j; }
        }
        let lo = bi, up = bj;
        if (out[lo].y > out[up].y) { lo = bj; up = bi; }
        const nx = out[(up + 1) % out.length], px = out[(up - 1 + out.length) % out.length];
        const yaw = Math.atan2(nx.x - px.x, nx.z - px.z) * 180 / Math.PI;
        for (let k = 0; k < out.length; k++) {
            const sep = Math.abs(arc[k] - arc[up]);
            if (Math.min(sep, tot - sep) < 45) out[k].f |= F_WALL | F_BRIDGE;
        }
        bridgeAt = { u: arc[lo] / tot, yaw, dy: out[up].y - 0.25 - 11 - out[lo].y + 1, gap: out[up].y - out[lo].y, miss: best };
    }
    return { pts: out, len: tot, marks: M, landmarks, bridgeAt };
}

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
    const pts = [], marks = [];
    let px = 0, pz = 0;
    for (let i = 0; i < len.length; i++) {
        const c = Math.cos(h[i] * D2R), s = Math.sin(h[i] * D2R);
        marks.push({ key: 's' + (i + 1), idx: pts.length });
        const m = Math.max(1, Math.round(len[i] / step));
        for (let k = 0; k < m; k++) pts.push([px + c * len[i] * (k / m), pz + s * len[i] * (k / m)]);
        px += c * len[i]; pz += s * len[i];
        const t = turn[i] * D2R, sg = t >= 0 ? 1 : -1;
        const cx = px - s * rad[i] * sg, cz = pz + c * rad[i] * sg;
        const a0 = Math.atan2(pz - cz, px - cx);
        const steps = Math.max(2, Math.ceil(Math.abs(t) * rad[i] / step));
        const arcLen = Math.abs(t) * rad[i];
        marks.push({ key: 'c' + (i + 1), idx: pts.length, extra: arcLen / 2 });
        marks.push({ key: 'e' + (i + 1), idx: pts.length, extra: arcLen });
        for (let k = 0; k < steps; k++) {
            const aa = a0 + t * (k / steps);
            pts.push([cx + Math.cos(aa) * rad[i], cz + Math.sin(aa) * rad[i]]);
        }
        const ae = a0 + t;
        px = cx + Math.cos(ae) * rad[i]; pz = cz + Math.sin(ae) * rad[i];
    }
    return { pts, marks };
}

// ============================================================
// the circuits
// ============================================================
// sky: horizon colour. ground: the surface beyond the run-off. road: the
// asphalt family. runoff: 0 none (walled street circuit), 1 gravel traps,
// 2 tarmac run-off, 3 gravel in slow corners and tarmac in fast ones.
// hill: distant skyline height and kind (0 ridges, 1 city blocks).
// theme: which scenery set placeScenery() scatters.
export const F1 = [
    {
        name: 'MONACO', info: 'MONTE CARLO  /  STREET  /  TUNNEL',
        sky: [150, 196, 236], fogFar: 380, ground: 'pave', road: 'roadS', runoff: 0, hill: [1.4, 0], theme: 1,
        width: 5.2, walls: true, scale: 1.35, startFrac: 0.4,
        verts: [
            [120, 260, 20],    // 1  Sainte Devote
            [420, 300, 250],   // 2  Beau Rivage
            [560, 330, 50],    // 3  Massenet
            [620, 430, 28],    // 4  Casino
            [720, 420, 16],    // 5  Mirabeau Haute
            [650, 300, 9],     // 6  Fairmont hairpin
            [770, 300, 14],    // 7  Mirabeau Bas
            [790, 150, 16],    // 8  Portier
            [560, 50, 260],    // 9  the tunnel
            [380, 40, 13],     // 10 Nouvelle Chicane
            [340, 10, 13],     // 11
            [230, 5, 34],      // 12 Tabac
            [140, -60, 30],    // 13 Swimming Pool
            [100, -60, 26],    // 14
            [40, -40, 20],     // 15
            [0, -45, 20],      // 16
            [-100, -60, 13],   // 17 La Rascasse
            [-90, 60, 18],     // 18 Anthony Nogues
        ],
        widths: [['s6', 'e7', 4.6], ['s10', 'e11', 4.8]],
        elev: [[0, 0], ['c1', 1], ['c3', 30], ['c4', 34], ['c6', 18], ['c8', 6], ['e9', 2], ['c12', 0]],
        flags: [['s9', 'e9', F_TUN]],
        landmarks: [
            { at: 'c4', side: 1, dist: 30, type: 'CASINO', scale: 1.0, face: true },
            { at: 'c6', side: 1, dist: 30, type: 'HOTEL', scale: 1.0, face: true },
            { at: 'c9', side: 1, dist: 0, type: 'HOTEL', scale: 1.4 },
            { at: 'c12', side: -1, dist: 60, type: 'YACHT', scale: 1.5 },
            { at: 's13', side: -1, dist: 70, type: 'YACHT', scale: 1.1 },
            { at: 'c13', side: -1, dist: 58, type: 'YACHT', scale: 1.3 },
            { at: 'c15', side: -1, dist: 64, type: 'YACHT', scale: 1.2 },
            { at: 's12', side: -1, dist: 80, type: 'YACHT', scale: 1.0 },
            { at: 'c1', side: -1, dist: 70, type: 'YACHT', scale: 1.2 },
        ],
    },
    {
        name: 'SPA-FRANCORCHAMPS', info: 'BELGIUM  /  ARDENNES FOREST  /  EAU ROUGE',
        sky: [168, 184, 200], fogFar: 480, ground: 'grass', road: 'road', runoff: 3, hill: [1.7, 0], theme: 2,
        width: 7.0, scale: 0.72, startFrac: 0.55,
        verts: [
            [-100, 150, 20],   // 1  La Source
            [100, -350, 80],   // 2  Eau Rouge
            [180, -420, 90],   // 3  Raidillon
            [240, -560, 120],  // 4  top of Raidillon
            [1450, -600, 40],  // 5  Les Combes
            [1480, -650, 40],  // 6
            [1560, -720, 48],  // 7  Malmedy
            [1650, -1000, 25], // 8  Rivage
            [1450, -1050, 60], // 9  No Name
            [1150, -1350, 110],// 10 Pouhon
            [1150, -1600, 60], // 11 Fagnes
            [1080, -1700, 60], // 12
            [1060, -1900, 55], // 13 Stavelot
            [900, -1950, 95],  // 14
            [500, -1450, 260], // 15 Blanchimont
            [-400, -600, 16],  // 16 Bus Stop
            [-400, -540, 15],  // 17
            [-440, -490, 22],  // 18
        ],
        elev: [[0, 0], ['c1', 2], ['c2', -22], ['c4', 14], ['c5', 32], ['c7', 34], ['c8', 6], ['c10', -14],
            ['c13', -40], ['c15', -18], ['c17', -2]],
        landmarks: [
            { at: 'c1', side: -1, dist: 44, type: 'STAND2', scale: 1.0, face: true },
            { at: 'c3', side: -1, dist: 40, type: 'STAND2', scale: 1.0, face: true },
            { at: 'c17', side: 1, dist: 42, type: 'STAND2', scale: 1.0, face: true },
            { at: 's2', side: 1, dist: 0, type: 'GANTRY', scale: 1.0, du: 0.006 },
        ],
    },
    {
        name: 'SUZUKA', info: 'JAPAN  /  FIGURE OF EIGHT  /  130R',
        sky: [176, 206, 234], fogFar: 480, ground: 'grass', road: 'road', runoff: 1, hill: [1.2, 0], theme: 3,
        width: 7.0, scale: 1.0, startFrac: 0.35,
        verts: [
            [1000, 760, 95],   // 1  T1
            [1080, 650, 50],   // 2  T2
            [1000, 500, 58],   // 3  S curves
            [1010, 400, 58],   // 4
            [970, 330, 58],    // 5
            [980, 250, 70],    // 6
            [920, 160, 100],   // 7  Dunlop
            [880, 20, 75],     // 8  Degner 1
            [700, -100, 36],   // 9  Degner 2
            [-150, 520, 17],   // 10 hairpin
            [-80, 250, 210],   // 11 200R
            [-200, -150, 62],  // 12 Spoon
            [-120, -280, 52],  // 13
            [420, 420, 130],   // 14 130R
            [400, 640, 16],    // 15 Casio chicane
            [440, 700, 16],    // 16
            [380, 800, 70],    // 17 final curve
        ],
        elev: [[0, 0], ['c2', -4], ['c7', 12], ['c9', 6], ['c10', 2], ['c12', 10], ['c13', 14], ['c14', 16], ['c17', 4]],
        bridge: { lower: 's10', upper: 's14' },
        landmarks: [
            { at: 'c2', side: -1, dist: 170, type: 'WHEEL', scale: 1.0, face: true },
            { at: 'c4', side: -1, dist: 44, type: 'STAND2', scale: 1.0, face: true },
            { at: 's1', side: 1, dist: 40, type: 'STAND2', scale: 1.1, face: true, du: 0.012 },
        ],
    },
    {
        name: 'SILVERSTONE', info: 'GREAT BRITAIN  /  AIRFIELD  /  MAGGOTTS-BECKETTS',
        sky: [182, 200, 222], fogFar: 480, ground: 'grass', road: 'road', runoff: 2, hill: [0.55, 0], theme: 4,
        width: 7.4, scale: 0.78, startFrac: 0.4,
        verts: [
            [900, 380, 130],   // 1  Abbey
            [1080, 140, 26],   // 2  Village
            [1020, 80, 18],    // 3  The Loop
            [1450, -700, 36],  // 4  Brooklands
            [1600, -690, 34],  // 5  Luffield
            [1450, -880, 160], // 6  Woodcote
            [200, -1000, 90],  // 7  Copse
            [100, -560, 100],  // 8  Maggotts
            [60, -480, 62],    // 9  Becketts
            [60, -400, 56],    // 10
            [30, -330, 110],   // 11 Chapel
            [40, 250, 70],     // 12 Stowe
            [300, 300, 26],    // 13 Vale
            [360, 370, 30],    // 14 Club
        ],
        elev: [[0, 0], ['c4', 3], ['c7', -2], ['c12', 2]],
        landmarks: [
            { at: 's1', side: 1, dist: 34, type: 'WING', scale: 1.0, face: true },
            { at: 'c7', side: -1, dist: 46, type: 'STAND2', scale: 1.0, face: true },
            { at: 'c5', side: -1, dist: 46, type: 'STAND2', scale: 1.0, face: true },
            { at: 's12', side: -1, dist: 130, type: 'HANGAR', scale: 1.0 },
            { at: 's4', side: -1, dist: 140, type: 'HANGAR', scale: 1.0 },
            { at: 's4', side: -1, dist: 150, type: 'HANGAR', scale: 1.0, du: 0.02 },
        ],
    },
    {
        name: 'MONZA', info: 'ITALY  /  TEMPLE OF SPEED  /  PARABOLICA',
        sky: [196, 208, 214], fogFar: 500, ground: 'grass', road: 'road', runoff: 3, hill: [0.7, 0], theme: 5,
        width: 7.2, scale: 0.8, startFrac: 0.35,
        verts: [
            [900, 0, 16],      // 1  Rettifilo
            [940, -25, 16],    // 2
            [1250, -150, 330], // 3  Curva Grande
            [1300, -700, 20],  // 4  Roggia
            [1320, -730, 22],  // 5
            [1350, -1000, 55], // 6  Lesmo 1
            [1150, -1100, 45], // 7  Lesmo 2
            [600, -820, 50],   // 8  Ascari
            [530, -808, 45],   // 9
            [470, -758, 70],   // 10
            [-300, -740, 110], // 11 Parabolica
            [-320, -80, 90],   // 12
        ],
        elev: [[0, 0], ['c3', 1], ['c7', -3], ['c9', -1], ['c11', 1]],
        landmarks: [
            { at: 's8', side: 1, dist: 34, type: 'BANKING', scale: 1.0, face: true },
            { at: 's1', side: 1, dist: 0, type: 'GANTRY', scale: 1.0, du: 0.03 },
            { at: 's1', side: 1, dist: 36, type: 'STAND2', scale: 1.1, face: true },
            { at: 'c1', side: -1, dist: 44, type: 'STAND2', scale: 1.0, face: true },
            { at: 'c11', side: -1, dist: 70, type: 'STAND2', scale: 1.0, face: true },
        ],
    },
    {
        name: 'SINGAPORE', info: 'MARINA BAY  /  NIGHT RACE  /  STREET',
        sky: [22, 30, 58], fogFar: 380, ground: 'dark', road: 'roadS', runoff: 0, hill: [1.5, 1], theme: 6,
        width: 6.2, walls: true, scale: 1.0, startFrac: 0.5,
        verts: [
            [300, 0, 26],      // 1
            [300, 120, 26],    // 2
            [420, 130, 16],    // 3
            [440, 700, 200],   // 4  Raffles Boulevard
            [420, 900, 30],    // 5  Memorial
            [250, 900, 25],    // 6
            [240, 1050, 25],   // 7  St Andrew
            [-250, 1060, 30],  // 8  Esplanade
            [-260, 800, 60],   // 9  Anderson Bridge
            [-400, 650, 20],   // 10
            [-420, 300, 30],   // 11
            [-100, 300, 30],   // 12 Bayfront
            [-100, 150, 25],   // 13
            [60, 160, 35],     // 14 under the grandstand
            [60, 60, 25],      // 15
            [-80, 50, 25],     // 16
            [-100, -60, 30],   // 17 final corner
        ],
        elev: [[0, 0], ['c4', 1], ['c9', 3], ['c12', 0]],
        landmarks: [
            { at: 'c12', side: -1, dist: 110, type: 'MBS', scale: 1.0, face: true },
            { at: 's5', side: -1, dist: 170, type: 'WHEEL', scale: 1.2, face: true },
            { at: 'c9', side: 1, dist: 70, type: 'WATER', scale: 1.4 },
            { at: 's11', side: 1, dist: 90, type: 'WATER', scale: 1.4 },
            { at: 's14', side: 1, dist: 0, type: 'GANTRY', scale: 1.0 },
        ],
    },
    {
        name: 'INTERLAGOS', info: 'BRAZIL  /  SENNA S  /  ANTICLOCKWISE',
        sky: [214, 196, 170], fogFar: 460, ground: 'grass', road: 'road', runoff: 2, hill: [1.2, 1], theme: 7,
        width: 7.0, scale: 1.0,
        segs: [
            [240, 62, 26],     // 1  Senna S (left)
            [30, -72, 30],     // 2  (right)
            [60, 92, 72],      // 3  Curva do Sol
            [620, 90, 42],     // 4  Descida do Lago
            [40, 55, 60],      // 5
            [230, -48, 58],    // 6  Ferradura
            [30, -48, 46],     // 7
            [150, -75, 30],    // 8  Laranjinha
            [120, 92, 25],     // 9  Pinheirinho
            [110, -150, 15],   // 10 Bico de Pato
            [150, 88, 45],     // 11 Mergulho
            [180, 95, 34],     // 12 Junção
            [260, 55, 150],    // 13 Subida dos Boxes
            [260, 42, 260],    // 14
            [120, 0, 10],      // 15 to the line
        ],
        elev: [[0, 12], ['c1', 4], ['c3', -6], ['c4', -14], ['c6', -10], ['c9', 0], ['c10', -4], ['c12', -14], ['e14', 10]],
        landmarks: [
            { at: 's1', side: -1, dist: 38, type: 'STAND2', scale: 1.1, face: true, du: -0.02 },
            { at: 'c1', side: 1, dist: 40, type: 'STAND2', scale: 1.0, face: true },
            { at: 'c4', side: 1, dist: 90, type: 'WATER', scale: 1.4 },
            { at: 'c5', side: 1, dist: 110, type: 'WATER', scale: 1.4 },
        ],
    },
    {
        name: 'BAKU', info: 'AZERBAIJAN  /  OLD CITY  /  2 KM FLAT OUT',
        sky: [236, 170, 120], fogFar: 420, ground: 'sand', road: 'roadS', runoff: 0, hill: [1.3, 1], theme: 8,
        width: 6.6, walls: true, scale: 0.8,
        segs: [
            [420, 90, 24],     // 1  T1
            [360, 90, 24],     // 2  T2
            [560, -90, 20],    // 3  T3
            [200, 90, 20],     // 4  T4
            [300, -90, 24],    // 5  T5
            [90, 90, 24],      // 6  T6
            [220, 60, 45],     // 7  T7
            [150, -90, 18],    // 8  T8 castle
            [40, 45, 22],      // 9  castle climb
            [40, -45, 22],     // 10
            [40, 45, 28],      // 11
            [60, -72, 28],     // 12 T12
            [200, 90, 20],     // 13 T13
            [120, -90, 24],    // 14 T14
            [150, 90, 24],     // 15 T15
            [250, 90, 30],     // 16 T16
            [700, 16, 420],    // 17 the boulevard kinks
            [500, 22, 500],    // 18
            [600, -10, 500],   // 19
            [400, 0, 10],      // 20 to the line
        ],
        widths: [['s8', 'e12', 4.2]],
        elev: [[0, 0], ['c3', 2], ['c7', 4], ['c8', 8], ['c12', 18], ['c14', 14], ['c16', 6], ['c18', 1]],
        landmarks: [
            { at: 'c9', side: 1, dist: 8, type: 'MAIDEN', scale: 1.0 },
            { at: 'c17', side: -1, dist: 160, type: 'FLAME', scale: 1.0 },
            { at: 'c17', side: -1, dist: 200, type: 'FLAME', scale: 0.9, du: 0.012 },
            { at: 'c17', side: -1, dist: 190, type: 'FLAME', scale: 0.85, du: -0.012 },
            { at: 's19', side: 1, dist: 60, type: 'WATER', scale: 1.5 },
            { at: 's18', side: 1, dist: 60, type: 'WATER', scale: 1.5 },
            { at: 's20', side: 1, dist: 60, type: 'WATER', scale: 1.5 },
        ],
    },
];

// v4.0: the real circuits (real/prep.mjs from OpenStreetMap, SRTM and
// bacinger/f1-circuits). Each slot takes the real lap, scenery and skyline
// when real/circuits.json has it; the hand-drawn layout above stays as the
// fallback (and for the tests that still want it: REALTRK=0).
const REAL = path.join(path.dirname(url.fileURLToPath(import.meta.url)), 'real', 'circuits.json');
// corners as the circuits count them
const TURNS = [19, 19, 18, 18, 11, 19, 15, 20];
export function buildF1() {
    const R = process.env.REALTRK !== '0' && fs.existsSync(REAL) ? JSON.parse(fs.readFileSync(REAL, 'utf8')) : {};
    return F1.map((d, k) => {
        const r = R[k + 1];
        if (r) return { ...d, real: r, pts: r.pts, len: r.len, marks: {}, landmarks: [], bridgeAt: null, turnsN: TURNS[k] };
        const c = circuit(d);
        return { ...d, pts: c.pts, len: c.len, marks: c.marks, landmarks: c.landmarks, bridgeAt: c.bridgeAt, turnsN: (d.segs || d.verts).length };
    });
}
