// Stage definitions of 경계의 건축가 and the format that turns them into the game's lists.
//
// A stage is a set of box rooms, each with its own coordinates (x across, y up, z along;
// the floor is y = 0). Rooms meet only through portals: a rectangle on a wall, the floor or
// the ceiling (or standing free in a room) that shows and leads to another rectangle.
// A portal's frame: c = the middle of its bottom edge, u = up along it, n = out of its
// face (the side it is seen and entered from), r = u x n. Going in at portal i and out at
// j maps i's (a, b, d) = ((p-c).r, (p-c).u, (p-c).n) to j's (-a s, b s, -d s), s = w_j / w_i.
import { STAGES_1 } from './stages1.mjs';
import { STAGES_1B } from './stages1b.mjs';
import { STAGES_2 } from './stages2.mjs';

export const THEMES = {
    // wall, floor, ceiling
    lab: [[206, 210, 216], [120, 126, 136], [150, 156, 166]],
    white: [[226, 228, 230], [170, 174, 180], [196, 198, 202]],
    warm: [[214, 196, 170], [132, 104, 82], [180, 164, 140]],
    green: [[176, 206, 186], [92, 120, 104], [150, 176, 160]],
    blue: [[170, 190, 220], [80, 96, 130], [140, 156, 186]],
    red: [[220, 170, 168], [128, 82, 80], [186, 146, 144]],
    dark: [[120, 126, 140], [58, 62, 72], [84, 88, 100]],
    sand: [[224, 210, 176], [168, 150, 112], [200, 188, 160]],
    violet: [[196, 180, 220], [102, 88, 130], [160, 146, 186]],
    mint: [[190, 226, 220], [96, 140, 134], [160, 196, 190]],
    stone: [[168, 164, 156], [104, 100, 94], [130, 126, 120]],
    gold: [[230, 212, 150], [150, 124, 60], [200, 184, 130]],
};
// symbol colours of portal frames (1-based in the game)
export const SYMC = ['#ff9a2e', '#3c8cff', '#3ccf6e', '#b06cff', '#ffd23c', '#3cdcdc', '#ff6cb4', '#f2f2f2', '#ff4040', '#8a6a4a'];
export const SYM = { orange: 1, blue: 2, green: 3, purple: 4, yellow: 5, cyan: 6, pink: 7, white: 8, red: 9, brown: 10 };
// object types
export const OT = { block: 1, cube: 2, plate: 3, lever: 4, core: 5, emitter: 6, receiver: 7, gate: 8, booth: 9, reflector: 10, record: 11, lamp: 12, sign: 13 };
const DIRS = { '+x': [1, 0, 0], '-x': [-1, 0, 0], '+y': [0, 1, 0], '-y': [0, -1, 0], '+z': [0, 0, 1], '-z': [0, 0, -1] };

const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const add = (a, b, k = 1) => a.map((v, i) => v + b[i] * k);

export function makeWorld() {
    const W = { rooms: [], portals: [], objects: [], sigs: 0, logic: [], counters: [], stages: [] };
    const all = [...STAGES_1, ...STAGES_1B, ...STAGES_2];
    for (const def of all) buildStage(W, def);
    return W;
}

function buildStage(W, def) {
    const st = { name: def.name, zone: def.zone, goal: def.goal, hints: def.hints || [], r0: W.rooms.length, p0: W.portals.length, o0: W.objects.length, g0: W.sigs, l0: W.logic.length, c0: W.counters.length, def };
    const sigs = new Map();
    const sig = (name) => {
        if (name === undefined || name === null || name === 0) return 0;
        let neg = 1;
        if (typeof name === 'string' && name.startsWith('!')) { neg = -1; name = name.slice(1); }
        if (!sigs.has(name)) { W.sigs++; sigs.set(name, W.sigs); }
        return neg * sigs.get(name);
    };
    const counters = new Map();
    const S = {
        room(name, w, h, d, { theme = 'lab', label = name } = {}) {
            const t = THEMES[theme];
            if (!t) throw new Error('theme ' + theme);
            const r = { name, label, w, h, d, wall: t[0], floor: t[1], ceil: t[2], stage: W.stages.length + 1, portals: [], free: 0 };
            W.rooms.push(r);
            r.idx = W.rooms.length;
            return r;
        },
        // a portal on a side of a room: 'W' x=0, 'E' x=w, 'S' z=0, 'N' z=d, 'F' floor, 'C' ceiling
        portal(room, side, o = {}) {
            const { at, y = 0, w = 1.4, h = 2.3, up = '+z' } = o;
            let n, u, c;
            if (side === 'W' || side === 'E') {
                n = side === 'W' ? [1, 0, 0] : [-1, 0, 0]; u = [0, 1, 0];
                c = [side === 'W' ? 0 : room.w, y, at ?? room.d / 2];
                if (c[2] - w / 2 < -1e-9 || c[2] + w / 2 > room.d + 1e-9 || y + h > room.h + 1e-9) throw new Error(`${def.name}: portal off wall ${room.name}${side}`);
            } else if (side === 'S' || side === 'N') {
                n = side === 'S' ? [0, 0, 1] : [0, 0, -1]; u = [0, 1, 0];
                c = [at ?? room.w / 2, y, side === 'S' ? 0 : room.d];
                if (c[0] - w / 2 < -1e-9 || c[0] + w / 2 > room.w + 1e-9 || y + h > room.h + 1e-9) throw new Error(`${def.name}: portal off wall ${room.name}${side}`);
            } else if (side === 'F' || side === 'C') {
                n = side === 'F' ? [0, 1, 0] : [0, -1, 0]; u = DIRS[up];
                const [x, z] = at;
                c = add([x, side === 'F' ? 0 : room.h, z], u, -h / 2);
            } else throw new Error('side ' + side);
            return S.rawPortal(room, c, u, n, w, h, { ...o, side: 'WESNFC'.indexOf(side) + 1 });
        },
        rawPortal(room, c, u, n, w, h, o = {}) {
            const p = {
                room: room.idx, c, u, n, r: cross(u, n), w, h, link: 0, kind: 0, sym: o.sym ?? 0, shape: o.shape ?? 0,
                cond: sig(o.cond), cnt: 0, cntd: o.delta ?? 1, alt: [0, 0, 0], swsig: 0, glass: o.glass ? 1 : 0, free: o.free ? 1 : 0, noframe: (o.noframe || o.free) ? 1 : 0, fw: Math.min(0.1, 0.07 * Math.min(w, h)), label: o.label || '', side: o.side || 0,
            };
            if (o.count) { p.cnt = counters.get(o.count); if (!p.cnt) throw new Error('counter ' + o.count); }
            if (o.lens) p.kind = 1;
            W.portals.push(p);
            p.idx = W.portals.length;
            room.portals.push(p);
            if (p.free) room.free = 1;
            return p;
        },
        // two portals that lead to each other
        link(a, b) { a.link = b.idx; b.link = a.idx; return [a, b]; },
        // an ordinary doorway: a portal pair
        door(ra, sa, oa, rb, sb, ob = {}) {
            const sym = oa.sym ?? ob.sym ?? 0;
            const a = S.portal(ra, sa, { sym, ...oa }), b = S.portal(rb, sb, { sym, w: oa.w, h: oa.h, ...ob });
            return S.link(a, b);
        },
        oneWay(a, b) { a.link = b.idx; return a; },
        // a door frame standing in a room, its face looking `facing`: two portals back to back
        frame(room, x, z, { facing = '+z', w = 1.4, h = 2.3, color = [70, 74, 84], sym = 0 } = {}) {
            const n = DIRS[facing], u = [0, 1, 0], c = [x, 0, z];
            const front = S.rawPortal(room, c, u, n, w, h, { free: 1, sym });
            const back = S.rawPortal(room, c, u, n.map(v => -v), w, h, { free: 1, sym });
            // posts and lintel
            const along = Math.abs(n[0]) > 0.5 ? 'z' : 'x', t = 0.12;
            const post = (dx) => along === 'x' ? S.block(room, x + dx, z, { w: t * 2, d: t * 2, h: h + t, color }) : S.block(room, x, z + dx, { w: t * 2, d: t * 2, h: h + t, color });
            post(-(w / 2 + t)); post(w / 2 + t);
            if (along === 'x') S.block(room, x, z, { y: h, w: w + 4 * t, d: t * 2, h: t, color }); else S.block(room, x, z, { y: h, w: t * 2, d: w + 4 * t, h: t, color });
            return [front, back];
        },
        // a solid box whose one face holds a door (a portal looking out of it)
        booth(room, x, z, { y = 0, w = 1.2, d = 1.2, h = 2.6, face = '+z', dw = 0.9, dh = 2.1, color = [60, 110, 170], sym = 0 } = {}) {
            const ob = S.obj(OT.booth, room, x, y, z, { w, d, h, color });
            const n = DIRS[face], u = [0, 1, 0];
            const c = [x + n[0] * (w / 2), y, z + n[2] * (d / 2)];
            const p = S.rawPortal(room, c, u, n, dw, dh, { sym, free: 1 });
            ob.p1 = p.idx;
            return p;
        },
        obj(type, room, x, y, z, o = {}) {
            const ob = { type, room: room.idx, x, y, z, hx: (o.w ?? 0.5) / 2, hz: (o.d ?? o.w ?? 0.5) / 2, hy: o.h ?? 0.5, scale: o.scale ?? 1, col: o.color || [150, 150, 150], sig: sig(o.sig), cond: sig(o.cond), p1: o.p1 ?? 0, p2: o.p2 ?? 0 };
            if (x - ob.hx < -1e-9 || x + ob.hx > room.w + 1e-9 || z - ob.hz < -1e-9 || z + ob.hz > room.d + 1e-9) throw new Error(`${def.name}: object outside ${room.name} at ${x},${z}`);
            W.objects.push(ob);
            ob.idx = W.objects.length;
            return ob;
        },
        block(room, x, z, o = {}) { return S.obj(OT.block, room, x, o.y ?? 0, z, { color: [110, 116, 128], ...o }); },
        cube(room, x, z, o = {}) { return S.obj(OT.cube, room, x, o.y ?? 0, z, { w: 0.5, d: 0.5, h: 0.5, color: [196, 200, 210], ...o }); },
        plate(room, x, z, o = {}) { return S.obj(OT.plate, room, x, o.y ?? 0, z, { w: o.size ?? 1, d: o.size ?? 1, h: 0.08, color: o.cubeOnly ? [70, 120, 220] : [220, 80, 60], p1: o.min ?? 0, p2: o.cubeOnly ? 1 : 0, ...o }); },
        lever(room, x, z, o = {}) { return S.obj(OT.lever, room, x, o.y ?? 0, z, { w: 0.4, d: 0.4, h: 1.0, color: [90, 96, 108], p1: o.portal ? o.portal.idx : 0, p2: o.ending ?? 0, ...o }); },
        core(room, x, z, o = {}) { return S.obj(OT.core, room, x, o.y ?? 0.6, z, { w: 0.4, d: 0.4, h: 0.4, color: [255, 210, 60], ...o }); },
        emitter(room, x, y, z, dir, o = {}) { return S.obj(OT.emitter, room, x, y, z, { w: 0.4, d: 0.4, h: 0.4, color: [200, 60, 60], p1: ['+x', '-x', '+y', '-y', '+z', '-z'].indexOf(dir) + 1, ...o }); },
        receiver(room, x, y, z, o = {}) { return S.obj(OT.receiver, room, x, y, z, { w: 0.45, d: 0.45, h: 0.45, color: [90, 60, 60], ...o }); },
        gate(room, x, z, o = {}) { return S.obj(OT.gate, room, x, o.y ?? 0, z, { color: [200, 70, 70], ...o }); },
        reflector(room, x, y, z, rot = 0, o = {}) { return S.obj(OT.reflector, room, x, y, z, { w: 0.5, d: 0.5, h: 0.6, color: [180, 220, 240], p1: rot, ...o }); },
        record(room, x, y, z, o = {}) { return S.obj(OT.record, room, x, y, z, { w: 0.25, d: 0.25, h: 0.3, color: [190, 110, 255], ...o }); },
        lamp(room, x, y, z, o = {}) { return S.obj(OT.lamp, room, x, y, z, { w: 0.3, d: 0.3, h: 0.3, color: [80, 80, 80], ...o }); },
        // logic: out = AND (or OR) of inputs ('!name' is NOT), kept on for `hold` seconds after
        logic(out, ins, { or = false, hold = 0 } = {}) {
            const i = ins.map(sig);
            while (i.length < 4) i.push(0);
            if (i.length > 4) throw new Error('logic: at most 4 inputs');
            W.logic.push({ out: sig(out), ins: i, or: or ? 1 : 0, hold });
        },
        counter(name, { target, out, exact = false }) {
            W.counters.push({ target, out: sig(out), exact: exact ? 1 : 0 });
            counters.set(name, W.counters.length);
        },
        sig,
        // a switching portal: shows `a` while `sigName` is off, `b` while on
        switcher(p, sigName, a, b) { p.kind = 2; p.swsig = sig(sigName); p.alt = [a.idx, b.idx, 0]; p.link = a.idx; },
        // a portal that leads to the next of its list each time it leaves the player's view
        observed(p, list) { p.kind = 3; p.alt = [...list.map(q => q.idx), 0, 0, 0].slice(0, 3); p.link = list[0].idx; },
    };
    def.build(S);
    // the portals of a room numbered together (links and the objects that name a portal follow)
    {
        const mine = W.portals.slice(st.p0);
        const order = [...mine].sort((a, b) => a.room - b.room || a.idx - b.idx);
        const map = new Map(order.map((p, i) => [p.idx, st.p0 + i + 1]));
        const re = (q) => (q ? map.get(q) : 0);
        for (const p of mine) { p.link = re(p.link); p.alt = p.alt.map(re); }
        for (const o of W.objects.slice(st.o0)) if ((o.type === OT.booth || o.type === OT.lever) && o.p1) o.p1 = re(o.p1);
        for (const p of order) p.idx = map.get(p.idx);
        W.portals.splice(st.p0, mine.length, ...order);
    }
    const sr = def.start;
    const sroom = W.rooms.slice(st.r0).find(r => r.name === sr.room);
    if (!sroom) throw new Error(def.name + ': start room ' + sr.room);
    st.start = { room: sroom.idx, x: sr.x, y: sr.y ?? 0, z: sr.z, yaw: sr.yaw ?? 0, scale: sr.scale ?? 1 };
    st.r1 = W.rooms.length; st.p1 = W.portals.length; st.o1 = W.objects.length; st.g1 = W.sigs; st.l1 = W.logic.length; st.c1 = W.counters.length;
    W.stages.push(st);
    // checks: every link's partner is in this stage, the world's up stays up, the sizes agree
    for (let i = st.p0; i < st.p1; i++) {
        const p = W.portals[i];
        for (const q of [p.link, ...p.alt]) {
            if (!q) continue;
            if (q - 1 < st.p0 || q - 1 >= st.p1) throw new Error(`${def.name}: portal ${i + 1} leads out of the stage`);
            const P = W.portals[q - 1];
            const s = P.w / p.w;
            if (Math.abs(P.h / p.h - s) > 1e-6) throw new Error(`${def.name}: portal ${i + 1} -> ${q}: the sides do not keep one scale (${p.w}x${p.h} -> ${P.w}x${P.h})`);
            const up = mapDir(p, P, [0, 1, 0]);
            if (Math.abs(up[1] - s) > 1e-6) throw new Error(`${def.name}: portal ${i + 1} -> ${q} turns the world's up to ${up}`);
        }
    }
}

export function mapDir(p, q, v) {
    const s = q.w / p.w, a = dot(v, p.r), b = dot(v, p.u), d = dot(v, p.n);
    return [0, 1, 2].map(k => s * (-a * q.r[k] + b * q.u[k] - d * q.n[k]));
}
export function mapPoint(p, q, x) {
    const s = q.w / p.w, v = add(x, p.c, -1), a = dot(v, p.r), b = dot(v, p.u), d = dot(v, p.n);
    return [0, 1, 2].map(k => q.c[k] + s * (-a * q.r[k] + b * q.u[k] - d * q.n[k]));
}

// the palette: every colour the picture uses, each in 6 lights and NLEV distances (CPAL)
export const SHADE = { NLEV: 14, FSTEP: 2.2, FOGD: 12, FOG: [16, 18, 24], KF: [1, 0.92, 0.85, 0.78, 0.7, 0.5] };
const FIXED = [[16, 18, 24], [70, 74, 84], [214, 220, 228], [90, 230, 120], [230, 70, 60], [80, 230, 110], [255, 190, 40], [255, 236, 140], [255, 240, 170], [255, 220, 90], [90, 170, 255], [100, 106, 118], [90, 40, 40], [230, 180, 255], [80, 84, 94]];
const hex2 = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
// The fixed colours' shades are data (CPAL starts with them); a stage's own colours are
// shaded when the stage loads (PALR.. from SPA0 to SPA1), after the fixed ones.
export const NFIX = FIXED.length + SYMC.length;
function makePalette(W) {
    const fixed = [...FIXED, ...SYMC.map(hex2)];
    const key = (c) => c.map(Math.round).join(',');
    const pal = [];
    for (const st of W.stages) {
        const map = new Map(fixed.map((c, i) => [key(c), i + 1]));
        st.pa0 = pal.length;
        const own = [];
        const idx = (c) => { const k = key(c); if (!map.has(k)) { own.push(c.map(Math.round)); map.set(k, fixed.length + own.length); } return map.get(k); };
        for (const r of W.rooms.slice(st.r0, st.r1)) { r.cw = idx(r.wall); r.cf = idx(r.floor); r.cc = idx(r.ceil); }
        for (const o of W.objects.slice(st.o0, st.o1)) o.ci = idx(o.col);
        pal.push(...own);
        st.pa1 = pal.length;
        if ((fixed.length + own.length) * SHADE.KF.length * SHADE.NLEV > 5000) throw new Error(`${st.name}: too many colours (${own.length})`);
    }
    const { NLEV, FSTEP, FOGD, FOG, KF } = SHADE;
    const out = [];
    const h = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
    for (const c of fixed) for (const k of KF) for (let L = 0; L < NLEV; L++) {
        const f = FOGD / (FOGD + (L + 0.3) * FSTEP);
        out.push('#' + [0, 1, 2].map(j => h(FOG[j] + (c[j] * k - FOG[j]) * f)).join(''));
    }
    return { cpal: out, pal };
}

// the lists of the game
export function worldLists(W) {
    const L = {};
    const put = (name, arr) => { L[name] = arr; };
    const { cpal, pal } = makePalette(W);
    L.CPAL = cpal;
    put('PALR', pal.map(c => c[0])); put('PALG', pal.map(c => c[1])); put('PALB', pal.map(c => c[2]));
    put('SPA0', W.stages.map(s => s.pa0)); put('SPA1', W.stages.map(s => s.pa1));
    put('FOGF', Array.from({ length: SHADE.NLEV }, (_, L) => SHADE.FOGD / (SHADE.FOGD + (L + 0.3) * SHADE.FSTEP)));
    put('KF', SHADE.KF);
    const R = W.rooms, P = W.portals, O = W.objects;
    put('RW', R.map(r => r.w)); put('RH', R.map(r => r.h)); put('RD', R.map(r => r.d));
    for (const [k, key] of [['W', 'wall'], ['F', 'floor'], ['C', 'ceil']]) for (const [j, ch] of ['R', 'G', 'B'].entries()) put(`R${k}${ch}`, R.map(r => r[key][j]));
    // the portals of a room are numbered together
    put('RP0', R.map(r => r.portals.length ? r.portals[0].idx : 1)); put('RPN', R.map(r => r.portals.length));
    for (const r of R) r.portals.forEach((p, i) => { if (p.idx !== r.portals[0].idx + i) throw new Error('portals of a room are not together: ' + r.name); });
    put('RFP', R.map(r => r.free)); put('RNM', R.map(r => r.label));
    put('RCW', R.map(r => r.cw)); put('RCF', R.map(r => r.cf)); put('RCC', R.map(r => r.cc));
    const f = (v) => Math.round(v * 1e6) / 1e6;
    for (const [k, key] of [['C', 'c'], ['R', 'r'], ['U', 'u'], ['N', 'n']]) for (const [j, ch] of ['X', 'Y', 'Z'].entries()) put(`P${k}${ch}`, P.map(p => f(p[key][j])));
    put('PR', P.map(p => p.room)); put('PW', P.map(p => p.w)); put('PH', P.map(p => p.h));
    put('PL0', P.map(p => p.link)); put('PK', P.map(p => p.kind)); put('PSY', P.map(p => p.sym)); put('PSH', P.map(p => p.shape));
    put('PCD', P.map(p => p.cond)); put('PCT', P.map(p => p.cnt)); put('PCTD', P.map(p => p.cntd));
    put('PA', P.map(p => p.alt[0])); put('PB', P.map(p => p.alt[1])); put('PC', P.map(p => p.alt[2])); put('PSW', P.map(p => p.swsig));
    put('PGL', P.map(p => p.glass)); put('PFR', P.map(p => p.free)); put('PSD', P.map(p => p.side)); put('PNF', P.map(p => p.noframe)); put('PFW', P.map(p => Math.round(p.fw * 1000) / 1000));
    put('OT', O.map(o => o.type)); put('OR0', O.map(o => o.room));
    put('OX0', O.map(o => f(o.x))); put('OY0', O.map(o => f(o.y))); put('OZ0', O.map(o => f(o.z)));
    put('OHX', O.map(o => f(o.hx))); put('OHY', O.map(o => f(o.hy))); put('OHZ', O.map(o => f(o.hz))); put('OS0', O.map(o => o.scale));
    put('OCI', O.map(o => o.ci));
    put('OSG', O.map(o => o.sig)); put('OCD', O.map(o => o.cond)); put('OP1', O.map(o => o.p1)); put('OP2', O.map(o => o.p2));
    put('LGO', W.logic.map(l => l.out)); for (let k = 0; k < 4; k++) put(`LG${k + 1}`, W.logic.map(l => l.ins[k])); put('LGM', W.logic.map(l => l.or)); put('LGH', W.logic.map(l => l.hold));
    put('CNT', W.counters.map(c => c.target)); put('CNS', W.counters.map(c => c.out)); put('CNE', W.counters.map(c => c.exact));
    const S = W.stages;
    for (const [k, key] of [['SR0', 'r0'], ['SR1', 'r1'], ['SP0', 'p0'], ['SP1', 'p1'], ['SO0', 'o0'], ['SO1', 'o1'], ['SG0', 'g0'], ['SG1', 'g1'], ['SL0', 'l0'], ['SL1', 'l1'], ['SC0', 'c0'], ['SC1', 'c1']]) put(k, S.map(s => s[key]));
    put('SSR', S.map(s => s.start.room)); put('SSX', S.map(s => s.start.x)); put('SSY', S.map(s => s.start.y)); put('SSZ', S.map(s => s.start.z)); put('SYW', S.map(s => s.start.yaw)); put('SSC', S.map(s => s.start.scale));
    put('SNM', S.map(s => s.name)); put('SZN', S.map(s => s.zone)); put('SGL', S.map(s => s.goal));
    for (let k = 0; k < 3; k++) put(`SH${k + 1}`, S.map(s => s.hints[k] || '힌트가 더 없습니다.'));
    put('SYMC', SYMC);
    // empty lists sized for the runtime
    for (const [name, n] of Object.entries(L)) if (!n.length) L[name] = [0];
    return L;
}
