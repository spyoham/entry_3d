// Build "ENTRY RACING 3D" -> .ent
//   - track control points (3 built-in circuits) generated from smooth harmonics
//   - a material palette with baked directional lighting, expanded into a
//     per-track fog colour table (material x 16 fog levels) so the renderer
//     only pays one list read per polygon instead of an rgb() blend
//   - EJS sources (src/*.js) compiled to Entry blocks
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { compileProgram } from './ejs.mjs';
import { buildF1 } from './f1tracks.mjs';
import { f1Car } from './f1car.mjs';
import { engineMp3, aiMp3, REF_RPM, LOOP_SEC, AI_RATIOS, AI_LEVELS, AI_LOOP } from './enginewav.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
export const SRC_FILES = ['util.js', 'track.js', 'render.js', 'phys.js', 'ai.js', 'game.js', 'rules.js', 'race3.js', 'fx.js', 'sound.js', 'share.js', 'profile.js', 'savecode.js', 'editor.js', 'menu.js', 'hud.js', 'main.js'];

// ============================================================
// constants shared with the EJS sources
// ============================================================
export const C = {
    // Entry refuses a list longer than 5000 items and the vertex buffer is
    // (NSEG + 1) * PPR + NCARV + NSCNV + 8 long, so with PPR 10 NSEG must stay
    // under about 485 (the build checks it).
    // v5: 460, to leave room for the 272-vertex open-wheel car model.
    NSEG: 460,          // centreline rings per circuit (ring NSEG+1 == ring 1)
    PPR: 10,            // points per ring in the vertex buffer
    NCAR: 8,            // cars on track (1 player + 7 AI)
    NMAT: 264,          // materials in the palette (v4.0: 240 -> 264, colTab 4224)
    NFOG: 16,           // fog levels baked per material
    NTRK: 8,            // built-in circuits
    EDTRK: 9,           // slot of the editor's own circuit
    NCP: 4,             // default checkpoints per lap
    NCPMAX: 10,         // upper bound the editor may place
    LAPS: 3,
    MAXCTL: 48,         // control points per circuit (editor limit)
    NSMOKE: 96,         // tyre-smoke / rain-spray particles
    MKS: 3,             // tyre-mark slots per segment
    NCARV: 272,         // vertices in the car model (both LOD tiers)
    NCARF: 140,         // faces in the car model
    NSCENE: 1500,       // scenery instances placed around a circuit
    GHOST: 9,
    NTX: 80,            // v6: text slots, one clone of the text object each (v7: 64 -> 76, v8: 80)
    TXW: 1000, TXH: 28, TXF: 20,     // text box: fixed width/height, font px
    TXCW: 0.5,          // monospace advance, em per character
    NMAP: 64,           // centreline samples in the 3D circuit map           // car slot of the time-trial ghost (NCAR + 1)
    // v8: ghosts at GHDT (linear in between): one lap being recorded, the
    // one being raced, and each circuit's personal best (PBN samples:
    // 9 circuits x 540 = 4860 list items). v4.0: 0.25 -> 0.4 s, the real Spa
    // takes the AI about 170 s, so a lap of up to 216 s is kept.
    NGH: 600,           // samples per recorded lap (240 s)
    GHDT: 0.4,          // ghost sample interval, seconds
    PBN: 540,           // samples per circuit in the personal-best store
    RLPASS: 90,         // relaxation passes for the racing line
    NSCNV: 48,          // vertices in the largest scenery model
    NHILLT: 64,         // azimuth buckets in the distant skyline profile
    NHILLS: 26,         // slices drawn across the field of view
    NMM: 52,            // samples in the minimap outline
    MMX: 184, MMY: -74, // minimap centre on the stage
    MMR: 42,            // half the size of the box it is fitted into
    MMW: 1.9,           // half the width of the drawn ribbon, in pixels
    SCRW: 240, SCRH: 135,
    // ---- v7 ----
    RPN: 550,           // replay samples kept (a ring buffer: the last RPN * RPDT s)
    RPDT: 0.1,          // replay sample interval, seconds
    RPC: 9,             // cars per replay sample: the field plus the safety car
    NSPK: 40,           // spark particles
    NTV: 48,            // trackside TV cameras per circuit, at most
    PITW: 11,           // pit lane width beside the main straight, metres
    PITV: 22.2,         // pit lane speed limit, m/s (80 km/h)
    QLAPS: 2,           // timed laps in qualifying
    // ---- v3.0 ----
    NZ: 16,             // weather zones round a lap (rain, water, the dry line)
    FUELRACE: 100,      // kg a full-length race is fuelled for
    VSCK: 0.62,         // virtual safety car: speed as a share of the reference lap
    NPK: 21,            // v3.2: menu keys polled (19) + the editor's K and I
    NTY: 5,             // tyre compounds
    // ---- v8 ----
    NACH: 20,           // achievements
    NSH: 16,            // save shards (RT_S1..16)
    SHCAP: 2400,        // characters a save shard is allowed to grow to
    NRANK: 10,          // ranking entries per circuit
    LVMAX: 50,
    UPMAX: 5,           // upgrade steps per part
    SVMAX: 400,         // v11 backup code: letters read back
};
// point slots inside a ring
// ordered so a ring's LOD levels are contiguous prefixes: road edges alone for
// the far field, + grass and wall tops for the middle, + curbs up close.
// + run-off outer edges for the middle band.
export const P = { L: 1, R: 2, GL: 3, GR: 4, OL: 5, OR: 6, WL: 7, WR: 8, CL: 9, CR: 10 };

// ============================================================
// material palette
// ============================================================
// families that get 8 shade levels (index = family base + shade 0..7)
const SHADED = ['road', 'grass', 'curbA', 'curbB', 'wall', 'tunnel', 'dirt', 'dark',
    'roadS', 'pave', 'grav', 'runT', 'sand'];
const BASE = {
    road: [80, 82, 88], grass: [70, 138, 64], curbA: [212, 50, 46], curbB: [236, 236, 240],
    wall: [170, 172, 180], tunnel: [96, 94, 104],
    dirt: [156, 138, 92], dark: [40, 46, 56],
    roadS: [62, 62, 68], pave: [150, 146, 138], grav: [196, 176, 132], runT: [104, 108, 124], sand: [196, 170, 124],
};
const CARCOL = [
    [222, 54, 48], [46, 122, 226], [246, 190, 40], [54, 196, 120], [232, 120, 40], [178, 86, 226], [232, 232, 238], [70, 78, 92],
];

export function buildPalette() {
    const mats = [];           // 1-based list of [r,g,b]
    const idx = {};
    const push = (name, rgb) => { mats.push(rgb.map(v => Math.max(0, Math.min(255, Math.round(v))))); idx[name] = mats.length; return mats.length; };
    // shade level s in 0..7 -> brightness factor
    const shadeF = (s) => 0.52 + s * (1.06 - 0.52) / 7;
    for (const f of SHADED) {
        const b = BASE[f];
        for (let s = 0; s < 8; s++) { const k = shadeF(s); push(`${f}${s}`, [b[0] * k, b[1] * k, b[2] * k]); }
        idx[f] = idx[`${f}0`];
    }
    // unshaded extras
    idx.mark = push('mark0', [40, 40, 44]); push('mark1', [54, 54, 58]); push('mark2', [66, 66, 70]); push('mark3', [80, 80, 84]);
    idx.shadow = push('shadow0', [34, 40, 34]); push('shadow1', [46, 54, 46]);
    // cars: 8 colours x 4 shades (roof, side, nose, dark)
    idx.car = mats.length + 1;
    for (const c of CARCOL) for (const k of [1.0, 0.76, 0.88, 0.52]) push('', [c[0] * k, c[1] * k, c[2] * k]);
    idx.brakeOff = push('brakeOff', [92, 28, 28]);
    idx.brakeOn = push('brakeOn', [255, 74, 54]);
    idx.glass = push('glass', [46, 58, 76]);
    idx.smoke = push('smoke', [214, 214, 218]);
    idx.smokeD = push('smokeD', [168, 170, 176]);
    idx.gate = push('gate', [250, 208, 40]);
    idx.startA = push('startA', [242, 242, 246]);
    idx.startB = push('startB', [28, 28, 32]);
    idx.post = push('post', [190, 62, 52]);

    // ---- scenery ----
    // Each model reads its materials as small offsets from one base, so the
    // groups below are laid out in exactly the order the models want them.
    idx.tree = push('bark', [82, 62, 46]);      // +0 bark  +1 barkD
    push('barkD', [58, 44, 34]);
    push('leafA', [44, 104, 52]);               // +2 +3 +4 foliage, dark to light
    push('leafB', [58, 126, 62]);
    push('leafC', [76, 150, 76]);
    // buildings: 4 colourways x (sunlit wall, shaded wall, roof, glass)
    idx.bld = mats.length + 1;
    // v4.0: + eight more for the real circuits' blocks: 4 Riviera pink, 5 ochre,
    // 6 white, 7 terracotta, 8 glass tower, 9 Baku sandstone, 10 brick, 11 light grey
    for (const c of [[196, 188, 172], [170, 150, 134], [148, 160, 176], [124, 128, 142],
        [222, 176, 156], [226, 192, 124], [232, 232, 226], [188, 112, 82],
        [104, 142, 176], [216, 186, 138], [150, 80, 62], [182, 186, 192]]) {
        push('', [c[0], c[1], c[2]]);
        push('', [c[0] * 0.70, c[1] * 0.70, c[2] * 0.70]);
        push('', [c[0] * 0.52 + 22, c[1] * 0.50 + 18, c[2] * 0.48 + 16]);
        push('', [44, 60, 82]);
    }
    idx.conc = push('conc', [188, 188, 192]);   // +0 +1 concrete
    push('concD', [138, 138, 146]);
    push('roofA', [176, 68, 58]);               // +2 +3 stand roof
    push('roofD', [120, 46, 40]);
    push('crowd', [132, 116, 142]);             // +4 +5 packed crowd
    push('crowdD', [96, 84, 106]);
    idx.steel = push('steel', [158, 162, 170]); push('steelD', [110, 114, 122]);
    idx.rock = push('rock', [138, 126, 112]); push('rockD', [102, 92, 82]); push('rockL', [166, 154, 138]);
    idx.tent = push('tent', [228, 228, 232]); push('tentD', [178, 178, 186]);
    idx.water = push('water', [44, 92, 146]); push('waterL', [78, 138, 194]);
    idx.hedge = push('hedge', [46, 92, 48]); push('hedgeD', [34, 70, 38]);
    idx.sandX = push('sandX', [198, 180, 134]);
    // ---- F1 circuit furniture ----
    idx.tyre = push('tyre', [34, 34, 38]); push('tyreD', [22, 22, 26]);      // tyre wall
    push('bandR', [214, 40, 40]); push('bandW', [236, 236, 236]);
    idx.palm = push('trunk', [120, 96, 70]); push('trunkD', [88, 70, 52]);   // palm
    push('frond', [52, 124, 58]); push('frondD', [36, 94, 44]);
    idx.yacht = push('hull', [244, 244, 246]); push('hullD', [190, 192, 200]); // yacht
    push('stripe', [30, 46, 92]); push('ydeck', [66, 90, 120]);
    idx.wheel = push('fw', [236, 236, 242]); push('fwD', [170, 172, 184]);    // Ferris wheel
    push('fwR', [220, 60, 70]); push('fwB', [70, 120, 220]);
    idx.mbs = push('mbs', [226, 226, 222]); push('mbsD', [170, 170, 170]);    // Marina Bay Sands
    push('mbsG', [82, 128, 160]); push('mbsT', [60, 150, 90]);
    idx.flame = push('flameG', [58, 100, 178]); push('flameD', [36, 66, 128]); // Flame Towers
    push('flameL', [98, 150, 220]); push('flameT', [150, 190, 240]);
    idx.casino = push('cream', [232, 214, 170]); push('creamD', [182, 164, 124]); // Casino
    push('slate', [84, 92, 104]); push('dome', [92, 150, 122]); push('domeD', [62, 110, 90]);
    idx.stone = push('stone', [206, 176, 128]); push('stoneD', [156, 128, 90]); // old city stone
    push('stoneT', [178, 148, 104]);
    idx.ad = push('adR', [200, 32, 40]); push('adY', [246, 196, 30]);          // advertising
    push('adG', [22, 110, 70]); push('adB', [30, 70, 170]); push('adW', [240, 240, 244]);
    idx.tyreC = push('tyreC', [26, 26, 28]); push('rim', [120, 122, 130]);    // car wheels
    while (mats.length < C.NMAT) push('', [255, 0, 255]);
    if (mats.length > C.NMAT) throw new Error('palette overflow: ' + mats.length);
    return { mats, idx };
}

const hex2 = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
// One table per sky. Entry refuses a list of more than 5000 items, and all
// three skies together would be 8448, so they stay separate: buildTrack copies
// the one this circuit needs into the runtime colTab. That also drops the
// per-track base out of the index the renderer computes for every polygon.
export function buildColourTable(mats, sky) {
    const out = [];
    for (let m = 0; m < C.NMAT; m++) {
        const c = mats[m];
        for (let f = 0; f < C.NFOG; f++) {
            const t = f / (C.NFOG - 1);
            out.push('#' + hex2(c[0] + (sky[0] - c[0]) * t) + hex2(c[1] + (sky[1] - c[1]) * t) + hex2(c[2] + (sky[2] - c[2]) * t));
        }
    }
    return out;
}

// ============================================================
// circuits
// ============================================================
// A circuit is written the way you would describe a real one - a run of
// straight, then a corner of so many degrees at so many metres of radius -
// and the closure error is least-squares'd out of the straight lengths so
// the lap joins up exactly. Corner radius is given in metres, so the speed
// a corner can be taken at is chosen rather than discovered.
// flags: 1 tunnel, 2 jump ramp, 4 barrier walls, 8 curbs forced
const D2R = Math.PI / 180;

// segs: [straightLength, turnDegrees(+ = left in x/z), cornerRadius]
function circuit({ segs, hill, width, flag, step = 12 }) {
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

// the eight Formula 1 circuits, see f1tracks.mjs
export const TRACKS = buildF1();

// ============================================================
// scenery models (local space: +x right, +y up, +z along the track)
// ============================================================
// Every model is a handful of boxes and pyramids. Faces are listed clockwise
// seen from outside and reversed at the end, exactly like the car model, so
// the renderer's back-face test keeps the insides hidden. Materials are small
// offsets from the model's own base, which lets one model serve several
// colourways by adding a per-instance offset at draw time.
export function sceneryModels() {
    const V = [], F = [], T = [];
    let v0 = 0, f0 = 0;
    const vert = (x, y, z) => { V.push([+x.toFixed(2), +y.toFixed(2), +z.toFixed(2)]); return V.length - v0; };
    const face = (a, b, c, d, m) => F.push([a, b, c, d, m]);
    const tri = (a, b, c, m) => F.push([a, b, c, a, m]);
    // Each model is built in two tiers: a cheap silhouette first, then the
    // full thing. Both live in the same pools, low tier first, so the renderer
    // can transform just the first vLo vertices and draw just the first fLo
    // faces for anything in the distance.
    let vLo = 0, fLo = 0;
    const begin = () => { v0 = V.length; f0 = F.length; };
    const mark = () => { vLo = V.length - v0; fLo = F.length - f0; };
    const end = (name, lod) => T.push({
        name, v0, vn: V.length - v0, f0, fn: F.length - f0, vLo, fLo, lod,
    });

    // an upright box, optionally tapered and optionally jittered into a lump
    const drum = (hw, hd, y0, y1, taper, mA, mB, mTop, jit) => {
        let seed = 7;
        const j = () => { if (!jit) return 0; seed = (seed * 1103515 + 12345) % 8388608; return (seed / 8388608 - 0.5) * jit; };
        const b1 = vert(-hw + j(), y0, hd + j()), b2 = vert(hw + j(), y0, hd + j());
        const b3 = vert(hw + j(), y0, -hd + j()), b4 = vert(-hw + j(), y0, -hd + j());
        const tw = hw * taper, td = hd * taper;
        const t1 = vert(-tw + j(), y1, td + j()), t2 = vert(tw + j(), y1, td + j());
        const t3 = vert(tw + j(), y1, -td + j()), t4 = vert(-tw + j(), y1, -td + j());
        face(b1, b2, t2, t1, mA);
        face(b2, b3, t3, t2, mB);
        face(b3, b4, t4, t3, mA);
        face(b4, b1, t1, t4, mB);
        if (mTop !== null) face(t1, t2, t3, t4, mTop);
        return [t1, t2, t3, t4];
    };
    const spire = (top, y, m) => {
        const a = vert(0, y, 0);
        tri(top[0], top[1], a, m); tri(top[1], top[2], a, m);
        tri(top[2], top[3], a, m); tri(top[3], top[0], a, m);
    };

    // 0 conifer - base idx.tree: 0 bark, 1 barkD, 2..4 foliage
    begin();
    spire(drum(2.4, 2.4, 0.6, 5.0, 0.72, 2, 3, null), 14.4, 3);
    mark();
    drum(0.45, 0.45, 0, 3.6, 0.8, 0, 1, null);
    let r = drum(3.0, 3.0, 2.8, 6.6, 0.64, 2, 3, null);
    r = drum(2.1, 2.1, 6.2, 10.0, 0.6, 3, 4, null);
    spire(r, 14.4, 3);
    end('pine', 1);

    // 1 broadleaf
    begin();
    spire(drum(2.9, 2.9, 1.2, 7.0, 0.72, 2, 3, null), 9.6, 3);
    mark();
    drum(0.55, 0.55, 0, 3.0, 0.9, 0, 1, null);
    r = drum(3.4, 3.4, 2.4, 6.2, 1.05, 2, 3, null);
    r = drum(3.6, 3.6, 6.2, 8.8, 0.5, 3, 4, null);
    spire(r, 10.8, 2);
    end('oak', 1);

    // 2 low building - base idx.bld + variant*4: 0 wall, 1 wallD, 2 roof, 3 glass
    begin();
    drum(9, 7, 0, 9.5, 1, 0, 1, null);
    mark();
    drum(9, 7, 0, 9.5, 1, 0, 1, 2);
    end('shed', 0);

    // 3 tower: a glazed band and a set-back crown
    begin();
    drum(7.5, 7.5, 0, 30, 1, 0, 1, 2);
    mark();
    drum(7.5, 7.5, 0, 25, 1, 0, 1, null);
    drum(7.9, 7.9, 25, 27.5, 1, 3, 3, 2);
    drum(3.2, 3.2, 27.5, 34, 1, 1, 0, 2);
    end('tower', 0);

    // 4 grandstand - base idx.conc: 0 conc, 1 concD, 2 roofA, 3 roofD, 4 crowd, 5 crowdD
    begin();
    {
        const l1 = vert(-19, 0.5, 7), l2 = vert(19, 0.5, 7);
        const l3 = vert(19, 9.5, -7), l4 = vert(-19, 9.5, -7);
        face(l1, l2, l3, l4, 4);
        const l5 = vert(-19.5, 15.5, 8.5), l6 = vert(19.5, 15.5, 8.5);
        const l7 = vert(19.5, 14, -8), l8 = vert(-19.5, 14, -8);
        face(l5, l6, l7, l8, 2);
        face(l1, l4, l8, l5, 1);
    }
    mark();
    {
        const s1 = vert(-19, 0.5, 7), s2 = vert(19, 0.5, 7);
        const s3 = vert(19, 9.5, -7), s4 = vert(-19, 9.5, -7);
        face(s1, s2, s3, s4, 4);                       // raked seating, full of people
        const f1 = vert(-19, 0, 7), f2 = vert(19, 0, 7);
        face(f1, f2, s2, s1, 0);                       // wall under the front row
        const b1 = vert(-19, 0, -7), b2 = vert(19, 0, -7);
        face(b2, b1, s4, s3, 1);                       // back wall
        face(s1, s4, b1, f1, 1);                       // left side
        face(f2, b2, s3, s2, 0);                       // right side
        const r1 = vert(-19.5, 15.5, 8.5), r2 = vert(19.5, 15.5, 8.5);
        const r3 = vert(19.5, 14, -8), r4 = vert(-19.5, 14, -8);
        face(r1, r2, r3, r4, 2);                       // roof
        face(r4, r3, r2, r1, 3);                       // roof seen from underneath
        const p1 = vert(-18.6, 0, 7.6), p2 = vert(-17.4, 0, 7.6);
        const p3 = vert(-17.4, 15.5, 7.6), p4 = vert(-18.6, 15.5, 7.6);
        face(p1, p2, p3, p4, 1);
        const q1 = vert(17.4, 0, 7.6), q2 = vert(18.6, 0, 7.6);
        const q3 = vert(18.6, 15.5, 7.6), q4 = vert(17.4, 15.5, 7.6);
        face(q1, q2, q3, q4, 1);
    }
    end('stand', 0);

    // 5 floodlight - base idx.steel: 0 steel, 1 steelD
    begin();
    drum(0.6, 0.6, 0, 23.6, 0.9, 0, 1, 0);
    mark();
    r = drum(0.6, 0.6, 0, 21, 0.55, 0, 1, null);
    drum(2.8, 0.9, 21, 23.6, 1, 0, 1, 0);
    end('mast', 0);

    // 6 rock - base idx.rock: 0 rock, 1 rockD, 2 rockL
    begin();
    drum(5.2, 4.2, 0, 6.0, 0.45, 0, 1, 2);
    mark();
    drum(5.5, 4.4, 0, 6.5, 0.45, 0, 1, 2, 2.2);
    end('rock', 1);

    // 7 marquee - base idx.tent: 0 tent, 1 tentD
    begin();
    drum(6, 4.5, 0, 5.2, 0.7, 0, 1, 0);
    mark();
    {
        const t = drum(6, 4.5, 0, 3.2, 1, 0, 1, null);
        const a = vert(0, 5.8, 4.5), b = vert(0, 5.8, -4.5);
        face(t[0], t[1], b, a, 0);
        tri(t[1], t[2], b, 1);
        face(t[2], t[3], a, b, 1);
        tri(t[3], t[0], a, 0);
    }
    end('tent', 1);

    // 8 water - base idx.water: one big flat sheet
    begin();
    {
        const l1 = vert(-52, 0, 48), l2 = vert(52, 0, 48);
        const l3 = vert(52, 0, -48), l4 = vert(-52, 0, -48);
        face(l4, l3, l2, l1, 0);
    }
    mark();
    {
        const w1 = vert(-52, 0, 48), w2 = vert(52, 0, 48);
        const w3 = vert(52, 0, -48), w4 = vert(-52, 0, -48);
        face(w4, w3, w2, w1, 0);
    }
    end('water', 0);

    // 9 hoarding - base idx.conc: 0 conc, 1 concD
    begin();
    {
        const l1 = vert(-7, 1.8, 0), l2 = vert(7, 1.8, 0);
        const l3 = vert(7, 5.2, 0), l4 = vert(-7, 5.2, 0);
        face(l1, l2, l3, l4, 0);
        face(l4, l3, l2, l1, 1);
    }
    mark();
    {
        const b1 = vert(-7, 1.8, 0), b2 = vert(7, 1.8, 0);
        const b3 = vert(7, 5.2, 0), b4 = vert(-7, 5.2, 0);
        face(b1, b2, b3, b4, 0);
        face(b4, b3, b2, b1, 1);
        const p1 = vert(-6, 0, 0), p2 = vert(-5.4, 0, 0), p3 = vert(-5.4, 2, 0), p4 = vert(-6, 2, 0);
        face(p1, p2, p3, p4, 1);
        const q1 = vert(5.4, 0, 0), q2 = vert(6, 0, 0), q3 = vert(6, 2, 0), q4 = vert(5.4, 2, 0);
        face(q1, q2, q3, q4, 1);
    }
    end('board', 1);

    // 10 hedge run - base idx.hedge: 0 hedge, 1 hedgeD
    begin();
    drum(10, 1.3, 0, 2.6, 0.9, 0, 1, null);
    mark();
    drum(10, 1.3, 0, 2.6, 0.9, 0, 1, 0);
    end('hedge', 1);

    // 11 race control tower - base idx.bld: 0 wall, 1 wallD, 2 roof, 3 glass
    begin();
    drum(4.6, 4.6, 0, 27, 0.8, 0, 1, 2);
    mark();
    drum(3.4, 3.4, 0, 20, 0.86, 0, 1, null);
    drum(6.4, 5.4, 20, 26, 1, 3, 3, 2);          // glazed control room
    drum(0.45, 0.45, 26, 32.5, 1, 1, 1, 1);      // aerial
    end('ctrl', 0);

    // 12 pit building: garages with a roof terrace over them
    begin();
    drum(26, 7, 0, 9, 1, 0, 1, 2);
    mark();
    drum(26, 7, 0, 5.4, 1, 0, 1, null);
    drum(26.3, 7.3, 1.3, 4.1, 1, 3, 3, null);    // the garage door band
    drum(26, 7, 5.4, 8.6, 0.94, 0, 1, 2);
    end('pits', 0);

    // 13 two-tier grandstand - base idx.conc, as model 4
    begin();
    {
        const l1 = vert(-23, 0.5, 8), l2 = vert(23, 0.5, 8);
        const l3 = vert(23, 17, -9), l4 = vert(-23, 17, -9);
        face(l1, l2, l3, l4, 4);
        const r1 = vert(-23.5, 24, 10), r2 = vert(23.5, 24, 10);
        const r3 = vert(23.5, 21.5, -9.5), r4 = vert(-23.5, 21.5, -9.5);
        face(r1, r2, r3, r4, 2);
        face(l1, l4, r4, r1, 1);
    }
    mark();
    {
        const a1 = vert(-23, 0.6, 8), a2 = vert(23, 0.6, 8);
        const a3 = vert(23, 8, 0.5), a4 = vert(-23, 8, 0.5);
        face(a1, a2, a3, a4, 4);                       // lower deck
        const b3 = vert(23, 11.5, 0.5), b4 = vert(-23, 11.5, 0.5);
        face(a4, a3, b3, b4, 1);                       // riser between decks
        const c3 = vert(23, 18, -9), c4 = vert(-23, 18, -9);
        face(b4, b3, c3, c4, 4);                       // upper deck
        const d1 = vert(-23, 0, -9), d2 = vert(23, 0, -9);
        face(d2, d1, c4, c3, 1);                       // back wall
        const e1 = vert(-23, 0, 8), e2 = vert(23, 0, 8);
        face(e1, e2, a2, a1, 0);                       // wall under the front row
        face(e1, a1, c4, d1, 1);                       // left flank
        face(d2, c3, a2, e2, 0);                       // right flank
        const r1 = vert(-23.5, 24, 10), r2 = vert(23.5, 24, 10);
        const r3 = vert(23.5, 21.5, -9.5), r4 = vert(-23.5, 21.5, -9.5);
        face(r1, r2, r3, r4, 2);
        face(r4, r3, r2, r1, 3);
        const p1 = vert(-22.4, 0, 9.2), p2 = vert(-21, 0, 9.2);
        const p3 = vert(-21, 24, 9.2), p4 = vert(-22.4, 24, 9.2);
        face(p1, p2, p3, p4, 1);
        const q1 = vert(21, 0, 9.2), q2 = vert(22.4, 0, 9.2);
        const q3 = vert(22.4, 24, 9.2), q4 = vert(21, 24, 9.2);
        face(q1, q2, q3, q4, 1);
    }
    end('stand2', 0);

    // 14 open terrace: bleachers with no roof, for the far side of a circuit
    begin();
    {
        const l1 = vert(-16, 0.5, 6), l2 = vert(16, 0.5, 6);
        const l3 = vert(16, 7.5, -6), l4 = vert(-16, 7.5, -6);
        face(l1, l2, l3, l4, 4);
    }
    mark();
    {
        const a1 = vert(-16, 0.6, 6), a2 = vert(16, 0.6, 6);
        const a3 = vert(16, 7.5, -6), a4 = vert(-16, 7.5, -6);
        face(a1, a2, a3, a4, 4);
        const e1 = vert(-16, 0, 6), e2 = vert(16, 0, 6);
        face(e1, e2, a2, a1, 0);
        const d1 = vert(-16, 0, -6), d2 = vert(16, 0, -6);
        face(d2, d1, a4, a3, 1);
        face(e1, a1, a4, d1, 1);
        face(d2, a3, a2, e2, 0);
    }
    end('terrace', 0);

    // ---- F1 circuit furniture and landmarks ----
    // an upright box like drum(), but standing off-centre
    const drumAt = (cx, cz, hw, hd, y0, y1, taper, mA, mB, mTop) => {
        const b1 = vert(cx - hw, y0, cz + hd), b2 = vert(cx + hw, y0, cz + hd);
        const b3 = vert(cx + hw, y0, cz - hd), b4 = vert(cx - hw, y0, cz - hd);
        const tw = hw * taper, td = hd * taper;
        const t1 = vert(cx - tw, y1, cz + td), t2 = vert(cx + tw, y1, cz + td);
        const t3 = vert(cx + tw, y1, cz - td), t4 = vert(cx - tw, y1, cz - td);
        face(b1, b2, t2, t1, mA); face(b2, b3, t3, t2, mB);
        face(b3, b4, t4, t3, mA); face(b4, b1, t1, t4, mB);
        if (mTop !== null) face(t1, t2, t3, t4, mTop);
        return [t1, t2, t3, t4];
    };

    // 15 tyre wall - base idx.tyre: 0 tyre, 1 tyreD, 2 red band, 3 white band
    begin();
    drum(6, 0.7, 0, 1.1, 1, 0, 1, 0);
    mark();
    drum(6, 0.7, 0, 0.72, 1, 0, 1, null);
    drum(6.02, 0.72, 0.72, 0.9, 1, 2, 2, null);
    drum(6, 0.7, 0.9, 1.15, 1, 0, 1, 0);
    end('tyres', 1);

    // 16 palm - base idx.palm: 0 trunk, 1 trunkD, 2 frond, 3 frondD
    begin();
    drum(0.35, 0.35, 0, 8.4, 0.7, 0, 1, null);
    drum(3.6, 3.6, 7.4, 9.6, 0.15, 2, 3, null);
    mark();
    drum(0.38, 0.38, 0, 8.6, 0.65, 0, 1, null);
    r = drum(4.2, 4.2, 7.2, 8.9, 0.35, 3, 2, null);
    spire(r, 9.8, 2);
    end('palm', 1);

    // 17 yacht - base idx.yacht: 0 hull, 1 hullD, 2 stripe, 3 deck/glass
    begin();
    drum(2.8, 10, 0, 2.2, 1, 0, 1, 0);
    mark();
    drum(2.8, 10, 0, 1.2, 1, 2, 2, null);
    drum(2.8, 10, 1.2, 2.3, 1, 0, 1, 0);
    {
        const a = vert(-2.8, 0, 10), b = vert(2.8, 0, 10), c = vert(2.8, 2.3, 10), d = vert(-2.8, 2.3, 10);
        const tip = vert(0, 2.3, 14.5), tipL = vert(0, 0.4, 13.5);
        face(a, tipL, tip, d, 1); face(tipL, b, c, tip, 0); tri(d, tip, c, 0);
    }
    drum(1.8, 4.5, 2.3, 4.6, 0.86, 3, 3, 0);
    drumAt(0, -1, 0.12, 0.12, 4.6, 19, 1, 1, 1, null);
    end('yacht', 0);

    // 18 Ferris wheel - base idx.wheel: 0 white, 1 shaded, 2 red, 3 blue.
    // A ring in the x-y plane, drawn from both sides, on an A-frame.
    begin();
    {
        const ring = (nSeg, R, w, hub) => {
            const o = [], n = [];
            for (let k = 0; k < nSeg; k++) {
                const a = k * 2 * Math.PI / nSeg;
                o.push(vert(Math.cos(a) * R, hub + Math.sin(a) * R, 0));
                n.push(vert(Math.cos(a) * (R - w), hub + Math.sin(a) * (R - w), 0));
            }
            for (let k = 0; k < nSeg; k++) {
                const j = (k + 1) % nSeg;
                const m = k % 3 === 0 ? 2 : (k % 3 === 1 ? 0 : 3);
                face(o[k], o[j], n[j], n[k], m);
                face(n[k], n[j], o[j], o[k], 1);
            }
        };
        ring(6, 30, 2.4, 34);
        mark();
        ring(12, 30, 1.6, 34);
        for (const s of [-1, 1]) {
            const a = vert(s * 13 - 1, 0, 0), b = vert(s * 13 + 1, 0, 0), c = vert(s * 0.6 + 0.6, 34, 0), d = vert(s * 0.6 - 0.6, 34, 0);
            face(a, b, c, d, 1); face(d, c, b, a, 1);
        }
    }
    end('wheel', 0);

    // 19 Marina Bay Sands - base idx.mbs: 0 white, 1 shaded, 2 glass, 3 sky park
    begin();
    drum(40, 6, 0, 100, 1, 2, 1, 0);
    drumAt(0, 0, 50, 9, 100, 104, 1, 0, 1, 3);
    mark();
    drumAt(-30, 0, 7, 6, 0, 100, 1, 2, 1, 0);
    drumAt(0, 0, 7, 6, 0, 100, 1, 2, 1, 0);
    drumAt(30, 0, 7, 6, 0, 100, 1, 2, 1, 0);
    drumAt(4, 0, 52, 9, 100, 104, 1, 0, 1, 3);
    end('mbs', 0);

    // 20 Flame Tower - base idx.flame: 0 glass, 1 shaded, 2 light, 3 tip
    begin();
    spire(drum(9, 7, 0, 60, 0.95, 0, 1, null), 110, 2);
    mark();
    r = drum(9, 7, 0, 58, 0.97, 0, 1, null);
    r = drum(8.7, 6.8, 58, 88, 0.55, 2, 1, null);
    spire(r, 118, 3);
    end('flame', 0);

    // 21 Casino de Monte-Carlo - base idx.casino: 0 cream, 1 creamD, 2 slate, 3 dome, 4 domeD
    begin();
    drum(22, 12, 0, 18, 1, 0, 1, 2);
    mark();
    drum(22, 12, 0, 15, 1, 0, 1, 2);
    spire(drum(6, 6, 15, 20, 0.75, 3, 4, null), 25, 3);
    spire(drumAt(-18, 9, 2.4, 2.4, 15, 24, 1, 0, 1, null), 28, 4);
    spire(drumAt(18, 9, 2.4, 2.4, 15, 24, 1, 0, 1, null), 28, 4);
    end('casino', 0);

    // 22 Maiden Tower, Baku - base idx.stone: 0 stone, 1 stoneD, 2 top
    begin();
    drum(6, 6, 0, 29, 0.92, 0, 1, 2);
    mark();
    drum(6, 6, 0, 26, 0.94, 0, 1, null);
    drum(6.2, 6.2, 26, 29.5, 1, 1, 0, 2);
    drumAt(0, -6.5, 2.2, 1.6, 0, 22, 0.8, 0, 1, 2);        // the buttress
    end('maiden', 0);

    // 23 advertising gantry over the track - base idx.ad: 0 red, 1 yellow, 2 green, 3 blue, 4 white
    begin();
    drumAt(0, 0, 16, 0.8, 7.5, 10, 1, 0, 4, 0);
    mark();
    drumAt(-15, 0, 0.5, 0.5, 0, 7.5, 1, 4, 4, null);
    drumAt(15, 0, 0.5, 0.5, 0, 7.5, 1, 4, 4, null);
    drumAt(0, 0, 16, 0.8, 7.5, 10, 1, 2, 4, 4);
    end('gantry', 0);

    // 24 Monza's old banking - base idx.conc: 0 conc, 1 concD
    begin();
    {
        const a = vert(-45, 0, 0), b = vert(45, 0, 0), c = vert(45, 10, -9), d = vert(-45, 10, -9);
        face(a, b, c, d, 0);
    }
    mark();
    {
        const a = vert(-45, 0, 0), b = vert(45, 0, 0), c = vert(45, 10, -9), d = vert(-45, 10, -9);
        face(a, b, c, d, 0);
        const e = vert(-45, 0, -9), f = vert(45, 0, -9);
        face(f, e, d, c, 1);
        face(e, a, d, e, 1);
        face(b, f, c, b, 1);
        for (const x of [-30, -10, 10, 30]) drumAt(x, -8, 0.8, 0.8, 0, 10, 1, 1, 1, null);
    }
    end('banking', 0);

    // 25 Suzuka crossover: girders and abutments under the upper road
    //    (local z runs along the upper road) - base idx.conc
    begin();
    drumAt(0, 0, 8, 18, 9.2, 11, 1, 1, 0, null);
    mark();
    drumAt(0, 0, 8, 18, 9.2, 11, 1, 1, 0, null);
    {
        const a = vert(-8, 9.2, -18), b = vert(8, 9.2, -18), c = vert(8, 9.2, 18), d = vert(-8, 9.2, 18);
        face(d, c, b, a, 1);                             // underside, seen from below
    }
    drumAt(0, 19, 8, 1.2, 0, 11, 1, 0, 1, null);
    drumAt(0, -19, 8, 1.2, 0, 11, 1, 0, 1, null);
    end('bridge', 0);

    // 26 Silverstone Wing - base idx.mbs: 0 white, 1 shaded, 2 glass
    begin();
    drum(60, 10, 0, 12, 1, 2, 1, 0);
    mark();
    drum(60, 10, 0, 10, 1, 2, 1, null);
    drum(63, 13, 10, 12.5, 0.96, 0, 1, 0);
    end('wing', 0);

    // 27 aircraft hangar - base idx.steel: 0 steel, 1 steelD
    begin();
    drum(22, 14, 0, 11, 1, 0, 1, 1);
    mark();
    {
        const t = drum(22, 14, 0, 8, 1, 0, 1, null);
        const a = vert(-22, 12.5, 0), b = vert(22, 12.5, 0);
        face(t[0], t[1], b, a, 0);
        tri(t[1], t[2], b, 1);
        face(t[2], t[3], a, b, 1);
        tri(t[3], t[0], a, 0);
    }
    end('hangar', 0);

    // 28 old city wall with battlements - base idx.stone
    begin();
    drum(12, 1.6, 0, 8, 1, 0, 1, 2);
    mark();
    drum(12, 1.6, 0, 7, 1, 0, 1, 2);
    for (const x of [-8, 0, 8]) drumAt(x, 0, 1.4, 1.6, 7, 8.6, 1, 0, 1, 2);
    end('citywall', 0);

    // v4.0: 29 block - a unit box (1 m square, 1 m high) the real circuits'
    // buildings are stretched out of, base idx.bld + colourway*4. Near and far
    // tiers share the eight corners: the near tier just lists the faces again.
    begin();
    {
        const b1 = vert(-0.5, 0, 0.5), b2 = vert(0.5, 0, 0.5), b3 = vert(0.5, 0, -0.5), b4 = vert(-0.5, 0, -0.5);
        const t1 = vert(-0.5, 1, 0.5), t2 = vert(0.5, 1, 0.5), t3 = vert(0.5, 1, -0.5), t4 = vert(-0.5, 1, -0.5);
        const box = () => {
            face(b1, b2, t2, t1, 0); face(b2, b3, t3, t2, 1);
            face(b3, b4, t4, t3, 0); face(b4, b1, t1, t4, 1);
            face(t1, t2, t3, t4, 2);
        };
        box();
        mark();
        box();
    }
    end('block', 0);

    // 30 sheet - a unit square of water, flat, facing up (wound like the top
    // of drum()), the same face in both tiers
    begin();
    {
        const a = vert(-0.5, 0, 0.5), b = vert(0.5, 0, 0.5), c = vert(0.5, 0, -0.5), d = vert(-0.5, 0, -0.5);
        face(a, b, c, d, 0);
        mark();
        face(a, b, c, d, 0);
    }
    end('sheet', 0);

    // listed clockwise from outside; the renderer wants counter-clockwise
    return { V, F: F.map((f) => [f[3], f[2], f[1], f[0], f[4]]), T };
}

// base material of each model, in build order
export function sceneryBases(idx) {
    return [idx.tree, idx.tree, idx.bld, idx.bld, idx.conc, idx.steel,
        idx.rock, idx.tent, idx.water, idx.conc, idx.hedge,
        idx.bld, idx.bld, idx.conc, idx.conc,
        idx.tyre, idx.palm, idx.yacht, idx.wheel, idx.mbs, idx.flame, idx.casino, idx.stone,
        idx.ad, idx.conc, idx.conc, idx.mbs, idx.steel, idx.stone, idx.bld, idx.water];
}

// ============================================================
// low-poly car model (local space: +x right, +y up, +z forward)
// ============================================================
// shade slot per face: 0 roof, 1 side, 2 nose, 3 dark   (+ special materials)
export function carModel() {
    const V = [];
    const v = (x, y, z) => { V.push([x, y, z]); return V.length; };
    const W = 0.92, L = 2.15, H = 0.52;                 // body half sizes
    // lower body ring (y = 0.22)
    const b1 = v(-W, 0.22, L), b2 = v(W, 0.22, L), b3 = v(W, 0.22, -L), b4 = v(-W, 0.22, -L);
    // upper body ring (y = 0.74), slightly tucked in
    const u1 = v(-W * 0.86, 0.74, L * 0.94), u2 = v(W * 0.86, 0.74, L * 0.94), u3 = v(W * 0.86, 0.74, -L * 0.96), u4 = v(-W * 0.86, 0.74, -L * 0.96);
    // cabin
    const c1 = v(-W * 0.62, 1.18, 0.34), c2 = v(W * 0.62, 1.18, 0.34), c3 = v(W * 0.62, 1.18, -0.86), c4 = v(-W * 0.62, 1.18, -0.86);
    const n1 = v(-W * 0.72, 0.74, 0.94), n2 = v(W * 0.72, 0.74, 0.94);   // windscreen base
    const t1 = v(-W * 0.72, 0.74, -1.30), t2 = v(W * 0.72, 0.74, -1.30); // rear window base
    // brake lights (rear face insets)
    const r1 = v(-W * 0.74, 0.40, -L - 0.02), r2 = v(-W * 0.28, 0.40, -L - 0.02), r3 = v(-W * 0.28, 0.62, -L - 0.02), r4 = v(-W * 0.74, 0.62, -L - 0.02);
    const q1 = v(W * 0.28, 0.40, -L - 0.02), q2 = v(W * 0.74, 0.40, -L - 0.02), q3 = v(W * 0.74, 0.62, -L - 0.02), q4 = v(W * 0.28, 0.62, -L - 0.02);
    // faces: [a,b,c,d, kind] with vertices CCW seen from outside; kind:
    //   0 roof 1 side 2 nose 3 dark  4 glass  5 brake-left  6 brake-right
    const F = [
        [b1, b2, u2, u1, 2],          // front
        [b3, b4, u4, u3, 3],          // rear
        [b2, b3, u3, u2, 1],          // right side
        [b4, b1, u1, u4, 1],          // left side
        [u1, u2, n2, n1, 0],          // bonnet
        [t1, t2, u3, u4, 0],          // boot
        [n1, n2, c2, c1, 4],          // windscreen
        [c3, c4, t1, t2, 4],          // rear window
        [c1, c2, c3, c4, 0],          // roof
        [n2, u2, t2, c2, 4],          // right window band
        [n1, c1, t1, u1, 4],          // left window band
        [r1, r2, r3, r4, 5],
        [q1, q2, q3, q4, 6],
        [b4, b3, b2, b1, 3],          // underside
    ];
    // four exposed wheels: tread (kind 7) on top, front and back, the hub side
    // (kind 8) facing out; the inner side is never seen
    for (const [sx, z, hw] of [[-1, 1.42, 0.14], [1, 1.42, 0.14], [-1, -1.40, 0.19], [1, -1.40, 0.19]]) {
        const xi = sx * (W - 0.02), xo = sx * (W + 2 * hw), R = 0.36, cy = 0.36;
        const o1 = v(xo, cy - R, z + R), o2 = v(xo, cy - R, z - R), o3 = v(xo, cy + R, z - R), o4 = v(xo, cy + R, z + R);
        const i1 = v(xi, cy - R, z + R), i2 = v(xi, cy - R, z - R), i3 = v(xi, cy + R, z - R), i4 = v(xi, cy + R, z + R);
        if (sx > 0) {
            F.push([o1, o2, o3, o4, 8]);                  // outer (hub) side
            F.push([i4, o4, o3, i3, 7]);                  // top of the tread
            F.push([i1, o1, o4, i4, 7]);                  // front
            F.push([o2, i2, i3, o3, 7]);                  // back
        } else {
            F.push([o4, o3, o2, o1, 8]);
            F.push([o4, i4, i3, o3, 7]);
            F.push([o1, i1, i4, o4, 7]);
            F.push([i2, o2, o3, i3, 7]);
        }
    }
    // the table above lists each face clockwise from outside; the renderer
    // wants counter-clockwise, so flip every face here.
    return { V, F: F.map((f) => [f[3], f[2], f[1], f[0], f[4]]) };
}

// ============================================================
// data lists
// ============================================================
const NSAMP_MAX = 1200;
// lists whose fractional values are read back as exact decimals
const NO_JITTER = new Set(['lmU']);
export function longTail(x) {
    if (typeof x !== 'number' || Number.isInteger(x) || !isFinite(x)) return x;
    return x * (1 + Math.PI * 1e-10);
}

export function buildData() {
    const lists = {};
    const consts = {};
    for (const [k, v] of Object.entries(C)) consts[k] = v;
    // v11: every Hangul syllable, so the backup code can tell nicknames apart
    // (Entry has no block for a character's code)
    consts.HANGUL = Array.from({ length: 0xD7A4 - 0xAC00 }, (_, i) => String.fromCharCode(0xAC00 + i)).join('');
    for (const [k, v] of Object.entries(P)) consts['P_' + k] = v;
    const { mats, idx } = buildPalette();
    for (const [k, v] of Object.entries(idx)) consts['M_' + k.replace(/[^a-zA-Z0-9]/g, '')] = v;
    consts.NCTLTOT = TRACKS.reduce((a, t) => a + t.pts.length, 0) + C.MAXCTL;

    // control points of the built-in circuits, then MAXCTL slots for the editor track
    const cx = [], cy = [], cz = [], cw = [], cf = [], off = [], cnt = [];
    for (const t of TRACKS) {
        off.push(cx.length); cnt.push(t.pts.length);
        for (const p of t.pts) { cx.push(+p.x.toFixed(2)); cy.push(+p.y.toFixed(2)); cz.push(+p.z.toFixed(2)); cw.push(+p.w.toFixed(2)); cf.push(p.f); }
    }
    off.push(cx.length); cnt.push(0);                 // slot EDTRK = editor track
    for (let i = 0; i < C.MAXCTL; i++) { cx.push(0); cy.push(0); cz.push(0); cw.push(9); cf.push(0); }
    Object.assign(lists, { ctlX: cx, ctlY: cy, ctlZ: cz, ctlW: cw, ctlF: cf, ctlOff: off, ctlCnt: cnt });
    // per-circuit look; the editor's circuit (slot EDTRK) borrows an English airfield
    const ED = { name: 'MY CIRCUIT', info: 'TRACK EDITOR', sky: [182, 200, 222], fogFar: 440, ground: 'grass', road: 'road', runoff: 2, hill: [0.8, 0], theme: 4 };
    const TT = [...TRACKS, ED];
    const GROUND = { grass: idx.grass, dry: idx.dirt, pave: idx.pave, dark: idx.dark, sand: idx.sand };
    lists.trkFar = TT.map(t => t.fogFar);
    lists.trkName = TT.map(t => t.name);
    lists.trkInfo = TT.map(t => t.info);
    lists.trkSkyR = TT.map(t => t.sky[0]);
    lists.trkSkyG = TT.map(t => t.sky[1]);
    lists.trkSkyB = TT.map(t => t.sky[2]);
    lists.trkGnd = TT.map(t => GROUND[t.ground]);
    lists.trkRoad = TT.map(t => idx[t.road]);
    lists.trkRun = TT.map(t => t.runoff);
    // v4.0: a real circuit's skyline is the real one (a touch taller, it reads
    // small at 240 px); only Singapore keeps the city-block profile
    lists.trkHillK = TT.map(t => (t.real ? 1.15 : t.hill[0]));
    lists.trkHillT = TT.map(t => (t.real ? (t.real.id === 'sg-2008' ? 1 : 0) : t.hill[1]));
    lists.trkTheme = TT.map(t => t.theme);
    lists.trkTurns = TT.map(t => t.turnsN || 0);
    lists.trkType = TT.map(t => (t === ED ? 'YOUR DESIGN' : t.walls ? 'STREET CIRCUIT' : 'PERMANENT'));
    // v7 ULTRA: the sky the race runs towards as the afternoon wears on
    // (a night race only gets darker)
    const DUSK = (s) => (s[0] + s[1] + s[2] < 200 ? [8, 10, 26] : [Math.min(255, s[0] * 0.55 + 118), s[1] * 0.50 + 40, s[2] * 0.42 + 34]);
    lists.trkDuskR = TT.map(t => Math.round(DUSK(t.sky)[0]));
    lists.trkDuskG = TT.map(t => Math.round(DUSK(t.sky)[1]));
    lists.trkDuskB = TT.map(t => Math.round(DUSK(t.sky)[2]));

    // Palette. The fogged colour table is built at track load from these
    // three lists (NMAT x NFOG rgb() calls, once), which keeps eight skies'
    // worth of tables out of the file.
    consts.NMF = C.NMAT * C.NFOG;
    lists.matR = mats.map(m => m[0]); lists.matG = mats.map(m => m[1]); lists.matB = mats.map(m => m[2]);
    lists.colTab = new Array(C.NMAT * C.NFOG).fill('#000000');

    // ---- landmarks: the named buildings of each circuit, placed at track build ----
    const SMT = sceneryModels().T.map(m => m.name.toUpperCase());
    const lm = { lmU: [], lmSide: [], lmDist: [], lmType: [], lmK: [], lmMode: [], lmYaw: [], lmDY: [], lmMat: [] };
    const lmOff = [], lmCnt = [];
    const addLm = (u, side, dist, type, k, mode, yaw, dy, mat) => {
        const ti = SMT.indexOf(type);
        if (ti < 0) throw new Error('no scenery model ' + type);
        lm.lmU.push(+u.toFixed(5)); lm.lmSide.push(side); lm.lmDist.push(dist); lm.lmType.push(ti + 1);
        lm.lmK.push(k); lm.lmMode.push(mode); lm.lmYaw.push(+yaw.toFixed(2)); lm.lmDY.push(+dy.toFixed(2)); lm.lmMat.push(mat);
    };
    for (const T of TT) {
        lmOff.push(lm.lmU.length);
        for (const L of T.landmarks || []) {
            if (L.type === 'HOTEL') addLm(L.u, L.side, L.dist, 'SHED', 3 * L.scale, L.face ? 1 : 0, 0, L.dist === 0 ? 7.4 : 0, 0);
            else addLm(L.u, L.side, L.dist, L.type, L.scale, L.face ? 1 : 0, 0, 0, 0);
        }
        if (T.bridgeAt) {
            const B = T.bridgeAt;
            addLm(B.u, 1, 0, 'BRIDGE', 1, 2, B.yaw, B.dy, 0);
        }
        lmCnt.push(lm.lmU.length - lmOff[lmOff.length - 1]);
    }
    Object.assign(lists, lm, { lmOff, lmCnt });
    for (const k of Object.keys(lm)) if (!lists[k].length) lists[k] = [0];

    // ---- v4.0 the real circuits: scenery records and the skyline ----
    // Each circuit's scenery is a run of fixed-width records in base 64, a
    // few strings per circuit (a list of numbers would need a dozen lists of
    // 5000). Record, RSW characters: model 1, place round the lap 2 (x4096),
    // x 3 and z 3 (0.25 m, +32768 m), height offset 2 (0.1 m, +204.8 m),
    // yaw 2 (x4096 per turn), size x/y/z 2 each (in the model's gtQ units),
    // colourway 1, flags 1 (tier 1-3 + 4 x wall check).
    const SMN = sceneryModels().T.map(m => m.name);
    lists.gtQ = SMN.map(n => (n === 'block' || n === 'sheet' ? 0.1 : 0.01));
    const RSA = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-';
    consts.RSA = RSA; consts.RSW = 21;
    const enc = (v, n) => {
        v = Math.round(v);
        if (v < 0 || v >= 64 ** n) throw new Error('scenery record field out of range: ' + v + ' in ' + n);
        let o = '';
        for (let i = 0; i < n; i++) { o = RSA[v % 64] + o; v = Math.floor(v / 64); }
        return o;
    };
    const cl = (v, a, b) => Math.max(a, Math.min(b, v));
    const rsD = [], rsOff = [], rsCh = [], rsN = [];
    for (const T of TT) {
        rsOff.push(rsD.length);
        const objs = T.real ? T.real.objs : [];
        if (objs.length > C.NSCENE - 200) throw new Error(T.name + ': ' + objs.length + ' scenery records leave no room');
        let chunk = '', c = 0;
        for (const o of objs) {
            const ti = SMN.indexOf(o.t) + 1;
            if (ti < 1) throw new Error('no scenery model ' + o.t);
            const q = lists.gtQ[ti - 1];
            const yaw = ((o.yaw % 360) + 360) % 360;
            chunk += RSA[ti] + enc(Math.round(o.u * 4096) % 4096, 2) + enc((o.x + 32768) * 4, 3) + enc((o.z + 32768) * 4, 3)
                + enc(cl(o.dy * 10 + 2048, 0, 4095), 2) + enc(Math.round(yaw / 360 * 4096) % 4096, 2)
                + enc(cl(o.sx / q, 1, 4095), 2) + enc(cl(o.sy / q, 1, 4095), 2) + enc(cl(o.sz / q, 1, 4095), 2)
                + RSA[o.m] + RSA[o.tier + 4 * o.chk];
            c++;
            if (c % 150 === 0) { rsD.push(chunk); chunk = ''; }
        }
        if (chunk) rsD.push(chunk);
        rsCh.push(rsD.length - rsOff[rsOff.length - 1]);
        rsN.push(objs.length);
    }
    lists.rsD = rsD.length ? rsD : [''];
    lists.rsOff = rsOff; lists.rsCh = rsCh; lists.rsN = rsN;
    lists.trkReal = TT.map(t => (t.real ? 1 : 0));
    // the skyline seen from the circuit: tangent of the horizon's height, per
    // 6 degrees of bearing, for the near hills and the far ones
    lists.hlN = TT.flatMap(t => (t.real ? t.real.hN : new Array(60).fill(0)));
    lists.hlF = TT.flatMap(t => (t.real ? t.real.hF : new Array(60).fill(0)));
    // a blocky city skyline for the street circuits, beside the ridge profile
    lists.hillC = Array.from({ length: C.NHILLT }, (_, i) => {
        const r = Math.sin(i * 12.9898 + 4.1) * 43758.5453;
        const f = r - Math.floor(r);
        return +(0.03 + f * f * 0.16 + (i % 7 === 3 ? 0.08 : 0)).toFixed(4);
    });

    // car model: the open-wheeler of f1car.mjs, two LOD tiers, per-face
    // outward normals for runtime lighting, and back-to-front face orders for
    // 8 viewing directions per tier
    const CM = f1Car();
    if (CM.V.length > C.NCARV) throw new Error('car verts ' + CM.V.length);
    if (CM.F.length > C.NCARF) throw new Error('car faces ' + CM.F.length);
    consts.NCV = CM.V.length; consts.NCF = CM.F.length;
    consts.NCVLO = CM.vLo; consts.NCFLO = CM.fLo; consts.NCFHI = CM.F.length - CM.fLo;
    // v6: whole millimetres, so the renderer's per-vertex transform is integer
    // arithmetic (see QS/BS in render.js)
    const mm = (x) => Math.round(x * 1000);
    lists.cvX = CM.V.map(p => mm(p[0])); lists.cvY = CM.V.map(p => mm(p[1])); lists.cvZ = CM.V.map(p => mm(p[2]));
    lists.cvP = CM.PIV.map(p => p[0]); lists.cvPX = CM.PIV.map(p => mm(p[1])); lists.cvPZ = CM.PIV.map(p => mm(p[2]));
    lists.cfA = CM.F.map(f => f.q[0]); lists.cfB = CM.F.map(f => f.q[1]); lists.cfC = CM.F.map(f => f.q[2]); lists.cfD = CM.F.map(f => f.q[3]);
    lists.cfK = CM.F.map(f => f.k);
    // v7: 1 on the faces of the front wing (they go when it is knocked off)
    lists.cfW = CM.F.map(f => (f.w ? 1 : 0));
    // normals x1024, plane offsets in mm x1024
    lists.cnX = CM.N.map(n => Math.round(n[0] * 1024)); lists.cnY = CM.N.map(n => Math.round(n[1] * 1024)); lists.cnZ = CM.N.map(n => Math.round(n[2] * 1024));
    // plane offset of each face along its normal: the camera is in front of
    // face f when n . camLocal > cfP[f]
    lists.cfP = CM.F.map((f, i) => { const v = CM.V[f.q[0] - 1], n = CM.N[i]; return Math.round((n[0] * v[0] + n[1] * v[1] + n[2] * v[2]) * 1000 * 1024); });
    lists.coLo = CM.ordLo; lists.coHi = CM.ordHi;
    // liveries: primary, accent, helmet; slot 9 is the ghost
    const LIV = [
        { n: 'ROSSO', a: [214, 26, 32], b: [236, 236, 236], h: [250, 206, 40] },
        { n: 'AZURE', a: [28, 64, 170], b: [250, 206, 36], h: [236, 60, 50] },
        { n: 'SOLARE', a: [246, 196, 28], b: [30, 30, 36], h: [40, 120, 230] },
        { n: 'VERDE', a: [18, 120, 84], b: [226, 232, 226], h: [240, 240, 240] },
        { n: 'ARANCIA', a: [250, 128, 22], b: [34, 64, 140], h: [250, 250, 250] },
        { n: 'VIOLA', a: [120, 56, 196], b: [206, 206, 216], h: [250, 214, 60] },
        { n: 'ARGENTO', a: [196, 200, 210], b: [16, 176, 160], h: [30, 30, 36] },
        { n: 'NERO', a: [42, 46, 56], b: [226, 176, 56], h: [226, 50, 50] },
        { n: 'GHOST', a: [176, 214, 250], b: [226, 238, 255], h: [226, 238, 255] },
        // v7: slot 10, the safety car (it drives in the ghost's car slot)
        { n: 'SAFETY', a: [206, 210, 218], b: [255, 138, 0], h: [255, 138, 0] },
    ];
    for (const [k, f] of [['lvR', (l) => l.a[0]], ['lvG', (l) => l.a[1]], ['lvB', (l) => l.a[2]],
        ['lvR2', (l) => l.b[0]], ['lvG2', (l) => l.b[1]], ['lvB2', (l) => l.b[2]],
        ['lvHR', (l) => l.h[0]], ['lvHG', (l) => l.h[1]], ['lvHB', (l) => l.h[2]]]) lists[k] = LIV.map(f);
    lists.lvName = LIV.map(l => l.n);
    lists.lvHex = LIV.map(l => '#' + l.a.map(hex2).join(''));
    // the field: the player is car 1, the rest have names
    lists.drvName = ['YOU', 'M. ROSSI', 'K. TANAKA', 'L. BERG', 'A. SILVA', 'J. NOWAK', 'D. MORENO', 'S. PARK'];
    lists.drvShort = ['YOU', 'ROSSI', 'TANAKA', 'BERG', 'SILVA', 'NOWAK', 'MORENO', 'PARK'];
    // v7 AI personalities (both rule sets): aggression - how early and how
    // tightly a driver goes for a gap and how late it brakes; defence - how
    // readily it covers the inside against a car behind; error - how often it
    // gets a corner wrong. Index 1 (the player) is unused.
    const PERS = [
        { t: '-', a: 0, d: 0, e: 0 },
        { t: 'ATTACKER', a: 0.90, d: 0.40, e: 0.45 },
        { t: 'STEADY', a: 0.40, d: 0.50, e: 0.12 },
        { t: 'DEFENDER', a: 0.35, d: 0.95, e: 0.25 },
        { t: 'WILD CARD', a: 0.95, d: 0.60, e: 0.85 },
        { t: 'SMOOTH', a: 0.50, d: 0.35, e: 0.08 },
        { t: 'LATE BRAKER', a: 0.75, d: 0.55, e: 0.55 },
        { t: 'TACTICIAN', a: 0.60, d: 0.75, e: 0.20 },
    ];
    lists.drvTag = PERS.map(p => p.t); lists.drvAgg = PERS.map(p => p.a);
    lists.drvDef = PERS.map(p => p.d); lists.drvErr = PERS.map(p => p.e);
    // tyre compounds: dry grip, grip on a fully wet track (both as a factor on
    // the car's grip), and life as a fraction of the race distance
    lists.tyName = ['SOFT', 'MEDIUM', 'HARD', 'INTER', 'WET'];
    lists.tyShort = ['S', 'M', 'H', 'I', 'W'];
    lists.tyHex = ['#ff3b30', '#ffd21f', '#f4f4f4', '#2fd05a', '#3a8dff'];
    lists.tyDry = [1.06, 1.00, 0.955, 0.90, 0.82];
    lists.tyWet = [0.56, 0.54, 0.52, 0.78, 0.84];
    lists.tyLife = [0.42, 0.62, 0.88, 0.75, 0.80];
    // v2.6 per-wheel tyre state: the working window of each compound (deg C,
    // grip is full between the two) and the temperature a set goes on at
    // (dry sets come off the blankets, treaded ones are fitted cooler)
    lists.tyTlo = [85, 90, 96, 55, 42];
    lists.tyThi = [106, 112, 122, 82, 68];
    lists.tyTbl = [72, 72, 72, 48, 42];
    lists.whName = ['FL', 'FR', 'RL', 'RR'];
    lists.whLong = ['FRONT LEFT', 'FRONT RIGHT', 'REAR LEFT', 'REAR RIGHT'];
    lists.whStN = ['OK', 'WARMING', 'COLD', 'HOT', 'OVERHEAT', 'WORN'];
    lists.whStC = ['#3dff6e', '#7fd0ff', '#3a8dff', '#ffb13a', '#ff3b30', '#b0b6c2'];
    lists.whRank = [0, 1, 2, 3, 5, 4];
    // v3.0 teams (by livery; the ghost and the safety car are neutral): top
    // speed, downforce, tyre wear, fuel use, failure rate, brake cooling
    lists.tmTop = [1.00, 1.02, 1.03, 0.99, 1.01, 0.98, 1.02, 0.99, 1, 1];
    lists.tmAero = [1.05, 0.98, 0.96, 1.02, 1.01, 1.03, 1.00, 0.99, 1, 1];
    lists.tmWear = [1.00, 0.94, 1.03, 1.00, 1.05, 1.00, 1.08, 0.91, 1, 1];
    lists.tmFuel = [1.00, 1.00, 1.05, 1.00, 1.01, 0.95, 1.00, 1.02, 1, 1];
    lists.tmRel = [1.2, 1.0, 1.0, 0.6, 1.1, 1.0, 1.5, 0.9, 1, 1];
    lists.tmBrk = [1.00, 1.00, 1.00, 1.05, 0.85, 1.00, 1.00, 1.00, 1, 1];
    lists.tmTag = ['CORNER SPEED', 'KIND TO TYRES', 'STRAIGHT-LINE SPEED, THIRSTY', 'BULLETPROOF', 'BRAKES RUN HOT',
        'FUEL-EFFICIENT', 'QUICK BUT FRAGILE', 'EASIEST ON TYRES', '', ''];
    // v3.0 failures, fuel mixes, track temperature per circuit (+ the editor's)
    lists.failName = ['ENGINE', 'GEARBOX', 'BRAKES', 'ERS', 'HYDRAULICS', 'POWER UNIT'];
    lists.mixName = ['LEAN', 'STANDARD', 'RICH'];
    lists.mixPow = [0 - 0.035, 0, 0.025];
    lists.mixBurn = [0.84, 1, 1.13];
    lists.trkT0 = [38, 26, 31, 29, 37, 33, 41, 35, 30];
    lists.whSt = [1, 1, 1, 1];


    // ---- scenery models: one flat vertex/face pool, indexed per type ----
    const SM = sceneryModels();
    if (Math.max(...SM.T.map(t => t.vn)) > C.NSCNV) throw new Error('scenery model too big');
    consts.NSCNT = SM.T.length;
    // v6: whole centimetres (the models are built on a 1 cm grid)
    lists.gvX = SM.V.map(p => Math.round(p[0] * 100)); lists.gvY = SM.V.map(p => Math.round(p[1] * 100)); lists.gvZ = SM.V.map(p => Math.round(p[2] * 100));
    // bounding radius about the model origin (cm), for frustum culling; and the
    // footprint box (m) the placement check keeps off the track
    lists.gtR = SM.T.map(t => { let r = 0; for (let v = t.v0 + 1; v <= t.v0 + t.vn; v++) { const q = SM.V[v - 1]; r = Math.max(r, Math.hypot(q[0], q[1], q[2])); } return Math.ceil(r * 100) + 1; });
    const ext = (t, k, f) => { let e = f === 'min' ? 1e9 : -1e9; for (let v = t.v0 + 1; v <= t.v0 + t.vn; v++) { const q = SM.V[v - 1][k]; e = f === 'min' ? Math.min(e, q) : Math.max(e, q); } return e; };
    lists.gtX0 = SM.T.map(t => ext(t, 0, 'min')); lists.gtX1 = SM.T.map(t => ext(t, 0, 'max'));
    lists.gtZ0 = SM.T.map(t => ext(t, 2, 'min')); lists.gtZ1 = SM.T.map(t => ext(t, 2, 'max'));
    lists.gfA = SM.F.map(f => f[0]); lists.gfB = SM.F.map(f => f[1]);
    lists.gfC = SM.F.map(f => f[2]); lists.gfD = SM.F.map(f => f[3]); lists.gfM = SM.F.map(f => f[4]);
    lists.gtV0 = SM.T.map(t => t.v0); lists.gtVN = SM.T.map(t => t.vn);
    lists.gtF0 = SM.T.map(t => t.f0); lists.gtFN = SM.T.map(t => t.fn);
    lists.gtLod = SM.T.map(t => t.lod);
    lists.gtVLo = SM.T.map(t => t.vLo); lists.gtFLo = SM.T.map(t => t.fLo);
    lists.gtMat = sceneryBases(idx);
    SM.T.forEach((t, i) => { consts['SC_' + t.name.toUpperCase()] = i + 1; });

    // ---- scenery instances: filled in at track build time ----
    for (const k of ['scT', 'scX', 'scY', 'scZ', 'scC', 'scS', 'scK', 'scKY', 'scKZ', 'scKR', 'scM', 'scLod', 'scNext'])
        lists[k] = new Array(C.NSCENE + 1).fill(0);
    lists.scHead = new Array(C.NSEG + 2).fill(0);
    for (const k of ['mmLX', 'mmLY', 'mmRX', 'mmRY'])
        lists[k] = new Array(C.NMM + 2).fill(0);

    // ---- distant skyline: a ridge height per azimuth bucket, as a fraction
    // of camScale so it keeps its angular size whatever the field of view ----
    lists.hillH = Array.from({ length: C.NHILLT }, (_, i) => {
        const a = i * 2 * Math.PI / C.NHILLT;
        const h = 0.085 + 0.055 * Math.sin(a * 3 + 0.7) + 0.035 * Math.sin(a * 7 + 2.3)
            + 0.022 * Math.sin(a * 13 + 1.1) + 0.014 * Math.sin(a * 23);
        return +Math.max(0.012, h).toFixed(4);
    });

    // playable car types: accel, top speed, grip, mass, colour slot
    // v5: four open-wheelers with different set-ups rather than road cars
    const CARS = [
        { n: 'ROSSO R5', acc: 17.4, top: 90, grip: 1.00, mass: 1.00, col: 1 },      // balanced
        { n: 'ARGENTO W', acc: 16.4, top: 96, grip: 0.92, mass: 0.98, col: 7 },     // low drag
        { n: 'AZURE RB', acc: 16.8, top: 86, grip: 1.12, mass: 1.02, col: 2 },      // high downforce
        { n: 'ARANCIA MC', acc: 18.4, top: 88, grip: 0.97, mass: 0.96, col: 5 },    // traction
    ];
    lists.ctInfo = ['BALANCED ALL-ROUNDER', 'LOW DRAG - FAST ON THE STRAIGHTS', 'HIGH DOWNFORCE - FAST IN CORNERS', 'TRACTION - QUICK OUT OF SLOW CORNERS'];
    consts.NCARTYPE = CARS.length;
    consts.TXSZ = (C.TXW + C.TXH) / 2 / C.TXF;
    lists.ctName = CARS.map(c => c.n); lists.ctAcc = CARS.map(c => c.acc); lists.ctTop = CARS.map(c => c.top);
    lists.ctGrip = CARS.map(c => c.grip); lists.ctMass = CARS.map(c => c.mass); lists.ctCol = CARS.map(c => c.col);
    // v6 showroom figures, from the same longitudinal / grip model as phys.js
    const perf = CARS.map((c) => {
        let v = 0, t = 0, t100 = 0, t200 = 0; const dt = 0.002;
        while (v < 200 / 3.6 && t < 60) {
            const f = Math.max(0, 1 - v / c.top);
            const a = c.acc * (0.18 + 0.82 * f * (0.45 + 0.55 * f)) - v * v * 0.00013 - v * 0.020;
            v = Math.min(c.top, v + a * dt); t += dt;
            if (!t100 && v >= 100 / 3.6) t100 = t;
        }
        t200 = t;
        const g = (kmh) => c.grip * (15.5 + 0.0019 * (kmh / 3.6) ** 2) / 9.81;
        return { kmh: Math.round(c.top * 3.6), t100, t200, gl: g(100), gh: g(250), kg: Math.round(798 * c.mass) };
    });
    const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1), f2 = (x) => (Math.round(x * 100) / 100).toFixed(2);
    lists.ctKmh = perf.map(p => p.kmh); lists.ct100 = perf.map(p => f2(p.t100)); lists.ct200 = perf.map(p => f2(p.t200));
    lists.ctGL = perf.map(p => f1(p.gl)); lists.ctGH = perf.map(p => f1(p.gh)); lists.ctKg = perf.map(p => p.kg);
    // meter fill 0..1 on fixed scales (so the bars compare across the cars)
    const bar = (x, lo, hi) => +Math.min(1, Math.max(0.04, (x - lo) / (hi - lo))).toFixed(3);
    lists.ctB1 = perf.map(p => bar(p.kmh, 290, 352)); lists.ctB2 = perf.map(p => bar(-p.t200, -6.6, -5.0));
    lists.ctB3 = perf.map(p => bar(p.gl, 1.35, 2.05)); lists.ctB4 = perf.map(p => bar(p.gh, 2.0, 2.95));

    // ---- AI difficulty: scales the whole opponent field ----
    const DIFF = [
        { n: 'ROOKIE', pow: 0.76, skl: 0.82 },
        { n: 'AMATEUR', pow: 0.87, skl: 0.90 },
        { n: 'PRO', pow: 0.96, skl: 0.97 },
        { n: 'ACE', pow: 1.04, skl: 1.03 },
        { n: 'INSANE', pow: 1.13, skl: 1.10 },
    ];
    consts.NDIFF = DIFF.length;
    lists.aiName = DIFF.map(d => d.n); lists.aiPow = DIFF.map(d => d.pow); lists.aiSkl = DIFF.map(d => d.skl);

    // ---- v5 menu options ----
    lists.modeName = ['GRAND PRIX', 'CHAMPIONSHIP', 'TIME TRIAL', 'PRACTICE'];
    lists.modeD1 = ['ONE RACE AGAINST 7 AI DRIVERS', 'ALL 8 CIRCUITS, ONE AFTER ANOTHER', 'ALONE AGAINST A GHOST, UNLIMITED LAPS', 'ALONE ON TRACK, FREE DRIVING'];
    lists.modeD2 = ['PICK THE CIRCUIT AND THE LAPS', 'POINTS 25-18-15-12-10-8-6-4', 'YOUR BEST LAP OR THE WORLD RECORD', 'RACING LINE AND BRAKE ASSIST'];
    lists.modeD3 = ['SLIPSTREAM AND DRS FROM LAP 2', 'MOST POINTS AFTER ROUND 8 WINS', 'SECTOR TIMES AND LIVE DELTA', 'B PUTS YOU BACK ON THE TRACK'];
    // v8: the LAPS row turns into these in time trial / practice
    lists.ghName = ['MY BEST', 'WORLD RECORD', 'OFF'];
    lists.paName = ['LINE + BRAKES', 'LINE ONLY', 'NONE'];
    // v8 achievements
    const ACH = [
        ['FIRST FINISH', 'FINISH A RACE'],
        ['WINNER', 'WIN A RACE'],
        ['PODIUM', 'FINISH IN THE TOP THREE'],
        ['POLE POSITION', 'QUALIFY FIRST (REALISTIC)'],
        ['COMEBACK', 'WIN FROM 6TH ON THE GRID OR LOWER'],
        ['CLEAN RACE', 'FINISH WITH NO DELETED LAP OR PENALTY'],
        ['RAIN MASTER', 'WIN A RACE IN THE WET'],
        ['PIT PERFECT', 'A PIT STOP UNDER 2.5 SECONDS'],
        ['DRIFT KING', '5000 DRIFT POINTS IN ONE RUN'],
        ['TOP SPEED', 'REACH 340 KM/H'],
        ['GHOSTBUSTER', 'BEAT A GHOST IN TIME TRIAL'],
        ['WORLD RECORD', 'TOP THE RANKING ON A CIRCUIT'],
        ['GLOBETROTTER', 'DRIVE ALL 8 CIRCUITS'],
        ['CHAMPION', 'WIN THE CHAMPIONSHIP'],
        ['INSANE', 'WIN AGAINST INSANE AI'],
        ['MARATHON', 'FINISH A 10-LAP RACE'],
        ['OVERTAKER', 'GAIN 5 PLACES IN ONE RACE'],
        ['ENGINEER', 'MAX OUT ONE UPGRADE'],
        ['VETERAN', 'REACH LEVEL 10'],
        ['ROAD TRIP', 'DRIVE 500 KM IN TOTAL'],
    ];
    if (ACH.length !== C.NACH) throw new Error('achievements ' + ACH.length);
    lists.achName = ACH.map(a => a[0]); lists.achDesc = ACH.map(a => a[1]);
    // v8 garage: upgrades (bought with level points) and setup sliders (free)
    lists.upName = ['ENGINE', 'AERO', 'BRAKES', 'TYRES'];
    lists.upInfo = ['+1.4% POWER, +0.6% TOP SPEED A STEP', '+3% DOWNFORCE A STEP', '+4% BRAKING FORCE A STEP', '+0.8% GRIP, -5% WEAR A STEP'];
    // v3.0: seven setup sliders (the old single WING is now the rear wing, and
    // an old save gives the front wing the same value)
    lists.suName = ['FRONT WING', 'REAR WING', 'GEARING', 'BRAKE BIAS', 'DIFFERENTIAL', 'TYRE PRESSURE', 'SUSPENSION'];
    lists.suLo = ['LESS', 'LOW DRAG', 'LONG', 'REAR', 'OPEN', 'LOW', 'SOFT'];
    lists.suHi = ['MORE', 'HIGH DOWNFORCE', 'SHORT', 'FRONT', 'LOCKED', 'HIGH', 'STIFF'];
    lists.suInfo = ['MORE: SHARPER TURN-IN (LESS UNDERSTEER), A LITTLE DRAG', 'MORE: REAR GRIP IN FAST CORNERS, LESS TOP SPEED',
        'SHORTER GEARS: QUICKER PICK-UP, LOWER TOP SPEED', 'FORWARD: STABLE UNDER BRAKING, TURNS IN LESS, FRONTS LOCK',
        'LOCKED: TRACTION OUT OF CORNERS, UNDERSTEER IN THEM', 'LOWER: MORE GRIP, HOTTER TYRES, MORE WEAR',
        'STIFFER: SHARPER ON TARMAC, WORSE OVER CURBS AND GRASS'];
    lists.prTabN = ['PROFILE', 'RECORDS', 'ACHIEVEMENTS', 'RANKING'];
    lists.aiD = ['FORGIVING - LEARN THE CIRCUITS', 'STEADY PACE, FEW MISTAKES', 'CLOSE RACING AT A REAL PACE', 'FAST AND ON THE LIMIT', 'FASTER THAN THE CARS ALLOW'];
    lists.gfxD = ['FASTEST - FOR PLAIN ENTRY', 'BALANCED - RECOMMENDED', 'EVERYTHING ON - FOR TESSVM'];
    // v7: what each graphics level adds on top of the picture itself
    lists.gfxFx = ['NO EXTRA EFFECTS', 'REPLAY + TV CAMERAS, SPARKS, SEE-THROUGH SMOKE', 'ALL: + BRAKE GLOW, SUNSET, DEBRIS'];
    lists.lapOpt = [1, 3, 5, 10];
    lists.wxName = ['DRY', 'RAIN', 'CHANGING'];
    lists.ruleName = ['ARCADE', 'REALISTIC'];
    lists.ruleD1 = ['THE CLASSIC GAME: JUMP IN AND RACE', 'TYRES, PIT STOPS, DAMAGE AND ERS BOOST'];
    lists.ruleD2 = ['RIVALS WITH THEIR OWN PERSONALITIES', 'QUALIFYING SETS THE GRID'];
    lists.ruleD3 = ['NO WEAR, NO DAMAGE, NO PENALTIES', 'FLAGS, SAFETY CAR, PENALTIES, WEATHER'];
    lists.sndName = ['OFF', 'ON'];
    lists.gfxName = ['LOW', 'HIGH', 'ULTRA'];
    // graphics levels: LOD band distances (m), scenery draw distance (m),
    // scenery full-model radius (m), full car radius (m), mid car radius (m),
    // fog distance scale, scenery density (1 = v4)
    lists.gfLod2 = [62, 110, 170]; lists.gfLod3 = [155, 280, 420];
    lists.gfScn = [270, 420, 600]; lists.gfScnHi = [60, 140, 260];
    // v4.0: how far an object is drawn, in its own bounding radii
    lists.gfScnSz = [45, 60, 90];
    lists.gfCar = [40, 90, 150]; lists.gfCarM = [80, 260, 420];
    lists.gfFog = [1.0, 1.15, 1.35]; lists.gfDen = [1, 1, 2];
    lists.gfFull = [1, 4, 8];           // how many cars may use the full model at once
    // points for P1..P8
    lists.ptsTab = [25, 18, 15, 12, 10, 8, 6, 4];
    consts.NMODE = 4; consts.NLAPO = 4; consts.NGFX = 3;
    consts.NMENU = 13;
    consts.NAIS = AI_RATIOS.length; consts.AI_LOOP = AI_LOOP;
    lists.aiRat = AI_RATIOS.slice();
    consts.ENG_REF = REF_RPM; consts.ENG_LOOP = LOOP_SEC;

    // ---- runtime scratch lists (pre-sized so the hot path never grows a list) ----
    const N = C.NSEG, R = N + 1;
    const zeros = (n) => new Array(n).fill(0);
    const segL = ['sgX', 'sgY', 'sgZ', 'sgDX', 'sgDZ', 'sgNX', 'sgNZ', 'sgW', 'sgLen', 'sgArc', 'sgCurv', 'sgCurvA', 'sgF', 'sgBank', 'sgMat', 'sgGMat', 'sgCurb', 'sgWMat', 'sgCM', 'sgHW', 'sgTun', 'sgJmp', 'sgGate',
        'sgRWL', 'sgRWR', 'sgRTL', 'sgRTR', 'sgRML', 'sgRMR'];
    for (const k of segL) lists[k] = zeros(R);
    const NSLOT = R * C.PPR + C.NCARV + 8 + C.NSCNV;   // rings, car verts, scratch, scenery
    if (NSLOT > 5000) throw new Error('vertex buffer ' + NSLOT + ' > 5000: lower NSEG');
    for (const k of ['wvX', 'wvY', 'wvZ']) lists[k] = zeros(NSLOT);
    for (const k of ['pvX', 'pvY', 'pvZ', 'psX', 'psY']) lists[k] = zeros(NSLOT);
    lists.pvF = zeros(NSLOT);                    // frame stamp: this ring is projected
    lists.pvE = zeros(N + 2);                    // ...and how many of its points are
    lists.clipX = zeros(10); lists.clipY = zeros(10);
    for (const k of ['tsX', 'tsY', 'tsZ', 'tsW', 'tsF', 'tsA']) lists[k] = zeros(NSAMP_MAX + 2);
    lists.visI = zeros(N + 8); lists.visD = zeros(N + 8); lists.visS = zeros(N + 8);
    // v6 text slots (hud.js) and the relief map (menu.js)
    for (const k of ['txS', 'txX', 'txY', 'txZ', 'txC', 'txV']) lists[k] = zeros(C.NTX + 1);
    for (const k of ['mpX', 'mpY', 'mpZ', 'mpNX', 'mpNZ']) lists[k] = zeros(C.NMAP + 1);
    for (const k of ['mapSX', 'mapSY', 'mapTX', 'mapTY']) lists[k] = zeros(2 * C.NMAP + 2);
    // cars
    const NC = C.NCAR;
    for (const k of ['caX', 'caY', 'caZ', 'caYaw', 'caVX', 'caVZ', 'caVY', 'caYR', 'caSeg', 'caLap', 'caCP', 'caProg', 'caRank',
        'aiVlim', 'aiWorst', 'aiWsign', 'aiNear', 'aiYel',
        'caCol', 'caAcc', 'caTop', 'caGrip', 'caMass', 'caSteer', 'caThr', 'caBrk', 'caHB', 'caHold', 'caSurf', 'caAir', 'caOff',
        'caSkill', 'caLine', 'caDrift', 'caOffT', 'caLapT', 'caBest', 'caFin', 'caRoll', 'caPitch', 'caU', 'caStuck', 'caSpd',
        'caTow', 'caDRS', 'caDOk', 'caFinT', 'caGear', 'caRpm', 'chPts', 'chOrd', 'caGap', 'caD2', 'caTr',
        // v7: tyres, damage, ERS, pit stops, penalties, flags, personality state, fx
        'caTy', 'caWear', 'caWK', 'caWR', 'caDmg', 'caErs', 'caErsH', 'caErsOn', 'caPit', 'caPitT', 'caPitN', 'caBox',
        'caStops', 'caPen', 'caTL', 'caTLon', 'caYelT', 'caYelS', 'caMisT', 'caDefT', 'caDefO', 'caPace', 'caHeat',
        'caQT', 'caGrid', 'clsI', 'clsV', 'caLim', 'caWing', 'snX', 'snY', 'snZ', 'snW', 'snS', 'snU', 'snO', 'snF', 'snR', 'snP',
        'snVX', 'snVZ', 'snSp', 'snB', 'snSt',
        // v8 tuning multipliers (1 / 0 for the AI): aero, brakes, brake bias, suspension, wear
        'caAeroK', 'caBrkK', 'caBias', 'caSusp', 'caWearK',
        // v2.6: grip of the front / rear axle against the four-wheel mean, wheel clock
        'caAxF', 'caAxR', 'caWhT',
        // v3.0: brakes, fuel, faults, flags, setup, formation lap, Q1-Q3, strategy
        // (every one of them 0 = neutral, so the ghost / safety car slot needs no setting)
        'caBrT', 'caBrD', 'caFuel', 'caFuelR', 'caFuel0', 'caFuelL', 'caMix', 'caLock', 'caLockR', 'caPowD', 'caTopD', 'caMassD',
        'caFail', 'caFailT', 'caDNF', 'caBlue', 'caBlueBy', 'caWet', 'caFWb', 'caDiff', 'caPres',
        'caGSeg', 'caGOff', 'caFormD', 'caFormOk', 'caQ1', 'caQ2', 'caQ3', 'caQOut', 'qIn', 'caLC', 'caStrat', 'caUcL', 'caMisK',
        // v3.1: how long an AI car has been unable to get going
        'caStkT'])
        lists[k] = zeros(NC + 2);
    // v2.6: four wheels per car (FL FR RL RR): temperature, wear left, grip
    for (const k of ['whT', 'whW', 'whG', 'whFS']) lists[k] = zeros(4 * (NC + 2));
    // v3.0 weather zones, grid order for the formation lap
    for (const k of ['zWet', 'zRain', 'zLine', 'zRk', 'zDk', 'zSpd']) lists[k] = zeros(C.NZ + 1);
    lists.gOrd = zeros(NC + 1);
    // v3.2: keys the menus poll that have not been let go since a start / an answer
    lists.pkSt = zeros(C.NPK);
    // v7 replay: RPN samples x RPC cars, oldest overwritten first
    for (const k of ['rpX', 'rpY', 'rpZ', 'rpW', 'rpS', 'rpV']) lists[k] = zeros(C.RPN * C.RPC);
    // v7 sparks, TV cameras, share-code scratch
    for (const k of ['spX', 'spY', 'spZ', 'spVX', 'spVY', 'spVZ', 'spL', 'spSeg', 'spC']) lists[k] = zeros(C.NSPK + 1);
    for (const k of ['tvS', 'tvO', 'tvH']) lists[k] = zeros(C.NTV + 1);
    lists.shV = zeros(5 * C.MAXCTL + 8);
    lists.shLn = new Array(8).fill('\u200B');
    lists.sgPit = zeros(R);
    // ghost: the lap being driven, and the best one, one sample per GHDT
    for (const k of ['grX', 'grZ', 'grW', 'ghX', 'ghZ', 'ghW']) lists[k] = zeros(C.NGH + 2);
    // v8: personal-best ghost of every circuit (editor slot included)
    for (const k of ['pbX', 'pbZ', 'pbW']) lists[k] = zeros(C.EDTRK * C.PBN);
    lists.pbN = zeros(C.EDTRK + 1);
    // v8 profile scratch: parsed save fields, ranking rows, achievements
    lists.pF = new Array(48).fill(0);
    lists.svV = zeros(C.SVMAX + 1);
    lists.rkN = new Array(C.NRANK + 2).fill('-'); lists.rkT = zeros(C.NRANK + 2);
    lists.achGot = zeros(C.NACH + 1); lists.popQ = zeros(33);
    lists.recNm = new Array(C.NTRK + 1).fill('-'); lists.recWR = zeros(C.NTRK + 1);
    lists.pendRk = zeros(C.NTRK + 1); lists.pendG = zeros(C.NTRK + 1);
    // time into the lap at each ring: best lap and the current one (live delta)
    lists.bsT = zeros(R + 1); lists.csT = zeros(R + 1);
    lists.sgDRS = zeros(R); lists.sgGrid = zeros(R);
    lists.rlO = zeros(R); lists.rlV = zeros(R); lists.rlK = zeros(R);
    lists.secBest = zeros(4);
    // particles
    for (const k of ['smX', 'smY', 'smZ', 'smL', 'smS', 'smSeg']) lists[k] = zeros(C.NSMOKE + 1);
    // tyre marks: MKS slots per segment
    for (const k of ['mkX1', 'mkZ1', 'mkX2', 'mkZ2', 'mkY', 'mkA']) lists[k] = zeros(R * C.MKS + 1);
    lists.mkN = zeros(R);
    // records: 4 tracks x (best lap, best race)
    lists.recLap = new Array(C.NTRK + 1).fill(0); lists.recRace = new Array(C.NTRK + 1).fill(0);
    // sorting scratch
    lists.srtI = zeros(NC + 1); lists.srtV = zeros(NC + 1);
    // checkpoint segment indices
    lists.cpSeg = zeros(C.NCPMAX + 1);

    for (const [k, v] of Object.entries(lists)) if (v.length > 5000) throw new Error(`list ${k} has ${v.length} items; Entry caps a list at 5000`);
    // v6: tessvm reproduces Entry's decimal arithmetic. An operand with a short
    // decimal tail (0.12, 5.2) sends every + - x through a digit search and
    // often a toFixed() round trip, and the result keeps a short tail, so the
    // slow path spreads from the model data into the whole frame. Nudging each
    // fractional constant by a relative 3e-10 gives it a full-length mantissa
    // (the fast path) without changing anything that can be seen.
    for (const k of Object.keys(lists)) {
        if (NO_JITTER.has(k)) continue;
        lists[k] = lists[k].map(longTail);
    }
    // v3.3: online Entry would not save the work any more (the project had
    // grown past what the site stores, t7/entsize.mjs). A quarter of it was
    // lists that start as nothing but zeros - buffers the game fills as it
    // runs (replay, vertices, the circuit's rings, marks, ghosts...). They go
    // into the work empty and allocLists() (declPrelude) fills them to the
    // same length first thing at the start. The text slots stay as they are:
    // the text object reads them from its own start script.
    const alloc = {};
    for (const [k, v] of Object.entries(lists)) {
        if (v.length >= ALLOCMIN && !k.startsWith('tx') && v.every(x => x === 0)) {
            (alloc[v.length] = alloc[v.length] || []).push(k);
            lists[k] = [];
        }
    }
    return { lists, consts, mats, idx, alloc };
}

const ALLOCMIN = 64;         // v3.3: all-zero lists this long are filled at run time
export function declPrelude(D) {
    const decl = Object.keys(D.lists).map(k => 'let ' + k + ' = [];').join('\n');
    // one loop per length, pushing onto every list of that length (only up to
    // the length, should Entry have kept a list's contents from a last run)
    const loops = Object.entries(D.alloc || {}).map(([n, ks]) =>
        `    let i${n} = ${ks[0]}.length;\n    while (i${n} < ${n}) { ${ks.map(k => k + '.push(0);').join(' ')} i${n} = i${n} + 1; }`).join('\n');
    return decl + '\nfunction allocLists() {\n' + (loops || '    let n = 0;') + '\n}';
}
export function sources() { return SRC_FILES.map(f => fs.readFileSync(path.join(HERE, 'src', f), 'utf8')); }

export const FUNC_WEIGHTS = { projectRing: 40, quad: 60, drawSeg: 20, carPhys: 8, aiDrive: 8 };

// ============================================================
// .ent
// ============================================================
// v6: one text object; hud.js clones it once per text slot
const TEXTBOX = { font: 'bold 20px Nanum Gothic Coding' };

export async function buildEnt(outFile, opts = {}) {
    const { packEnt } = await import('./pack.mjs');
    const D = buildData();
    const prog = compileProgram([declPrelude(D), ...sources()], { consts: D.consts, funcWeights: FUNC_WEIGHTS });
    for (const v of prog.variables) {
        if (v.variableType === 'list' && D.lists[v.name]) v.array = D.lists[v.name].map((d, i) => ({ id: `${v.id}_${i}`, data: d }));
    }
    const unused = Object.keys(D.lists).filter(k => !prog.variables.some(v => v.name === k));
    if (unused.length) console.warn('data lists not used by the sources:', unused.join(' '));

    // a 2x2 fully transparent png: the pen object needs a costume but must not show
    const dot = Buffer.from('89504e470d0a1a0a0000000d49484452000000020000000208060000007265b6' +
        '0d0000000f49444154789c636040020630c40000004900011ea9ec2c0000000049454e44ae426082', 'hex');
    const O = (id, name, extra = {}) => ({ id, name, script: prog.objectScripts[name] || [[]], ...extra });
    const objects = [];
    // Entry.TEXT_ALIGNS = ['center','left','right'] -> 1 is left. A line-break
    // box keeps its width whatever it holds, so "set size" scales it exactly.
    objects.push(O('txt', 'txt', {
        objectType: 'textBox', text: '​',
        entity: { x: 0, y: 0, colour: '#ffffff', bgColor: 'transparent', font: TEXTBOX.font, textAlign: 1, lineBreak: true, bold: true, underLine: false, strike: false, italic: false,
            fontSize: D.consts.TXF, width: D.consts.TXW, height: D.consts.TXH, visible: false },
    }));
    // v7: the engine loop rides on the pen object (see sound.js)
    objects.push(O('pen3', 'pen3', { pictures: [{ id: '1', name: 'dot', buf: dot, w: 2, h: 2 }],
        // MP3 only: online Entry will not take WAV
        sounds: [{ id: 'engine', name: 'engine', buf: engineMp3(), ext: 'mp3', duration: LOOP_SEC },
            // v8: other cars, ai<ratio><level>: ai11 (low pitch, near) .. ai62 (high, far)
            ...AI_RATIOS.flatMap((r, i) => AI_LEVELS.map((a, j) => ({ id: `ai${i + 1}${j + 1}`, name: `ai${i + 1}${j + 1}`, buf: aiMp3(r, a), ext: 'mp3', duration: AI_LOOP })))],
        entity: { x: 0, y: 0, visible: true } }));
    const project = packEnt(outFile, {
        name: 'ENTRY RACING 3D', tmpDir: path.join(HERE, '.pack'),
        variables: orderVariables(prog.variables), functions: prog.functions, messages: prog.messages, objects, speed: 60,
        // v11: the backup code's table (plain Entry shows it; its text can be selected there)
        tables: [{ id: 'svtb', name: 'BACKUP CODE', fields: ['CODE'], data: [['-']], chart: [] }],
    });
    fs.writeFileSync(outFile + '.lines.json', JSON.stringify({ blockLines: prog.blockLines, srcLines: prog.srcLines }));
    if (!opts.quiet) console.log('wrote', outFile, fs.statSync(outFile).size, 'bytes;', JSON.stringify(prog.stats));
    return { project, prog, D };
}

// Entry looks variables/lists up with a linear search - hottest first
const HOT = ['colTab', 'pvX', 'pvY', 'pvZ', 'psX', 'psY', 'pvF', 'pvE', 'wvX', 'wvY', 'wvZ',
    'cvX', 'cvY', 'cvZ', 'cvP', 'cfA', 'cfB', 'cfC', 'cfD', 'cfK', 'cnX', 'cnY', 'cnZ', 'cfP', 'coHi', 'coLo',
    'sgX', 'sgY', 'sgZ', 'sgW', 'sgMat', 'sgGMat', 'sgCurb', 'sgF', 'sgNX', 'sgNZ', 'sgDX', 'sgDZ', 'sgLen', 'sgCM', 'sgWMat',
    'visI', 'visD', 'visS', 'mkN', 'mkX1', 'mkZ1', 'mkX2', 'mkZ2', 'mkY', 'mkA',
    'caX', 'caZ', 'caY', 'caYaw', 'caSeg', 'ccSX', 'ccSY', 'ccVZ', 'ccX', 'ccY', 'ccZ', 'cvX', 'cvY', 'cvZ', 'cfA', 'cfB', 'cfC', 'cfD', 'cfK'];
function orderVariables(vars) {
    const rank = (v) => { const i = HOT.indexOf(v.name); return i < 0 ? 1000 : i; };
    return [...vars].sort((a, b) => rank(a) - rank(b));
}

if (process.argv[1] && import.meta.url === url.pathToFileURL(path.resolve(process.argv[1])).href) {
    await buildEnt(process.argv[2] || path.join(HERE, 'racing.ent'));
}
