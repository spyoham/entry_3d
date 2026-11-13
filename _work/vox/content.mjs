// v2.0 content: the block families, items and recipes added to blocks.mjs's own.
// Every texture is 8 x 8 (letters = palette, '.' clear); most are made here from a few patterns
// recoloured, so the families look alike. Names, keys and pictures are this work's own.
//
// A block entry (see blocks.mjs for the old fields) may also have
//   key   the command name (snake_case)            cat   the creative tab (0..6)
//   t6    six textures by face (-x +x -y +y -z +z)  model the box model (models.mjs)
//   item  the kind it counts as (variants)          hidden not listed (variants)
//   use   what F does on it                          tog   the block it turns into when used
//   place how it is put down (variants by facing)   need  what it must stand on
//   climb, slow, bounce, hurt, flame, wet (what it turns into by water), crop ...
import { TEX } from './blocks.mjs';

// ------------------------------------------------------------------ colour helpers
const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
const hex2 = (r, g, b) => [r, g, b].map(v => clamp(v).toString(16).padStart(2, '0')).join('');
const rgbOf = (h) => [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
export function shade(h, f) { const [r, g, b] = rgbOf(h); return hex2(r * f, g * f, b * f); }
export function mixc(h1, h2, t) { const a = rgbOf(h1), b = rgbOf(h2); return hex2(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t); }
function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1103515245 + 12345) >>> 0; return (s >>> 8) / 16777216; }; }
// a speckled texture: base a, darker b, lighter c (seeded: the same every build)
export function speck(base, seed, pb = 0.22, pc = 0.16, fb = 0.84, fc = 1.12) {
    const r = rng(seed), g = [];
    for (let y = 0; y < 8; y++) { let row = ''; for (let x = 0; x < 8; x++) { const v = r(); row += v < pb ? 'b' : v < pb + pc ? 'c' : 'a'; } g.push(row); }
    return { p: { a: base, b: shade(base, fb), c: shade(base, fc) }, g };
}
const tr = (g) => g.map((_, y) => g.map(r => r[y]).join(''));
const flipH = (g) => g.map(r => r.split('').reverse().join(''));
const pat = (g, p) => ({ p, g: g.slice() });
const recolor = (name, p) => { const T = TEX[name]; if (!T) throw new Error('no texture ' + name); return { p: { ...T.p, ...p }, g: T.g.slice() }; };
const pal3 = (c, fb = 0.84, fc = 1.12) => ({ a: c, b: shade(c, fb), c: shade(c, fc) });

// ------------------------------------------------------------------ patterns
const P = {
    bricks: ['aacabaca', 'bbbbbbbb', 'abacaaca', 'bbbbbbbb', 'aacabaca', 'bbbbbbbb', 'abacaaca', 'bbbbbbbb'],
    stoneBricks: ['aaacaaab', 'aaaaaaab', 'aacaaaab', 'bbbbbbbb', 'aaabaaaa', 'acabaaca', 'aaabaaaa', 'bbbbbbbb'],
    mossyBricks: ['amacaaab', 'aamaaaab', 'aacaamab', 'bbmbbbbb', 'aaabaaam', 'acabmaca', 'mmabaaaa', 'bbbbbmbb'],
    smallBricks: ['aacbaacb', 'bbbbbbbb', 'cbaacbaa', 'bbbbbbbb', 'aacbaacb', 'bbbbbbbb', 'cbaacbaa', 'bbbbbbbb'],
    polished: ['cccccccb', 'caaaaaab', 'caaaaaab', 'caacaaab', 'caaaaaab', 'caaaacab', 'caaaaaab', 'bbbbbbbb'],
    smooth: ['cccccccc', 'aaaaaaaa', 'aaaaaaaa', 'aaaaaaaa', 'aaaaaaaa', 'aaaaaaaa', 'aaaaaaaa', 'bbbbbbbb'],
    chiseled: ['bbbbbbbb', 'baaaaaab', 'bacccbab', 'bacbcbab', 'bacccbab', 'babbbbab', 'baaaaaab', 'bbbbbbbb'],
    pillarSide: ['bcaaaacb', 'bcaaaacb', 'bcaaaacb', 'bcaaaacb', 'bcaaaacb', 'bcaaaacb', 'bcaaaacb', 'bcaaaacb'],
    pillarTop: ['bbbbbbbb', 'bccccccb', 'bcaaaacb', 'bcabbacb', 'bcabbacb', 'bcaaaacb', 'bccccccb', 'bbbbbbbb'],
    cracked: ['aaacaaab', 'aaabaaab', 'aacbaaab', 'bbbbbbbb', 'aaabbbaa', 'acabaabc', 'aaabaaba', 'bbbbbbbb'],
    cut: ['cccccccc', 'aaaaaaaa', 'abbbbbba', 'aaaaaaaa', 'aaaaaaaa', 'abbbbbba', 'aaaaaaaa', 'bbbbbbbb'],
    block: ['cccccccc', 'caaaaaab', 'caaaaaab', 'cabbaaab', 'caaaaaab', 'caaaabab', 'caaaaaab', 'bbbbbbbb'],
    wool: ['aabaaaba', 'abaabaaa', 'aaabaaab', 'baaaabaa', 'aabaaaba', 'abaabaaa', 'aaabaaab', 'baaaabaa'],
    flat: ['aaaaaaaa', 'aaaaaaaa', 'aaabaaaa', 'aaaaaaaa', 'aaaaaaaa', 'aaaaabaa', 'aaaaaaaa', 'aaaaaaaa'],
    planks: ['aacaaaaa', 'aaaaacaa', 'bbbbbbbb', 'aaaaaaca', 'acaaaaaa', 'bbbbbbbb', 'aaaacaaa', 'aaaaaaab'],
    logSide: ['abaacaba', 'abaacaba', 'abacaaba', 'abaacaba', 'abaacaba', 'acaacaba', 'abaacaba', 'abaacaca'],
    logTop: ['cccccccc', 'caaaaaac', 'cabbbbac', 'cabaabac', 'cabaabac', 'cabbbbac', 'caaaaaac', 'cccccccc'],
    stripSide: ['aabaaaba', 'aabaaaba', 'aaabaaba', 'aabaaaab', 'aabaaaba', 'abaaaaba', 'aabaaaba', 'aabaaaab'],
    leaves: ['abacabaa', 'aaabaaca', 'cabaabaa', 'abaacaab', 'aacabaaa', 'baaaabca', 'abcaaaba', 'aabacaab'],
    door: ['bbbbbbbb', 'baaaaaab', 'bacaacab', 'baaaaaab', 'bbbbbbbb', 'baaaaaab', 'bacaacab', 'bbbbbbbb'],
    doorTop: ['bbbbbbbb', 'b..bb..b', 'b..bb..b', 'bbbbbbbb', 'baaaaaab', 'bacaacab', 'baaaaaab', 'bbbbbbbb'],
    trapdoor: ['bbbbbbbb', 'baabbaab', 'ba.bb.ab', 'bbbbbbbb', 'bbbbbbbb', 'ba.bb.ab', 'baabbaab', 'bbbbbbbb'],
    ironDoor: ['bbbbbbbb', 'baaaaaab', 'bacaaaab', 'baaaaaab', 'baaaaaab', 'baaaacab', 'baaaaaab', 'bbbbbbbb'],
    terra: ['aaaaaaaa', 'aabaaaaa', 'aaaaaaba', 'aaaaaaaa', 'abaaaaaa', 'aaaaabaa', 'aaaaaaaa', 'aaabaaaa'],
    powder: ['abacabaa', 'cabaabac', 'aacabaab', 'babaacaa', 'acaabaca', 'abcaabab', 'caabacaa', 'abaacbac'],
    stained: ['wwwwwwww', 'wt.t.t.w', 'w.s.t.tw', 'wt.s.t.w', 'w.t.t.tw', 'wt.t.t.w', 'w.t.t.tw', 'wwwwwwww'],
    bars: ['.b..b..b', '.b..b..b', 'bbbbbbbb', '.b..b..b', '.b..b..b', '.b..b..b', 'bbbbbbbb', '.b..b..b'],
    ore: ['aaabaaaa', 'akkaaaaa', 'aakaakka', 'aaaaaaka', 'aaaaaaaa', 'baakkaab', 'aaaakaaa', 'aaaaaaaa'],
    ore2: ['aaabaaaa', 'aakaaaaa', 'akkaaaka', 'aaaaakka', 'aaaaaaaa', 'baakaaab', 'aaakkaaa', 'aaaaaaaa'],
    cross: ['k......k', '.k....k.', '..k..k..', '...kk...', '...kk...', '..k..k..', '.k....k.', 'k......k'],
};
function glazed(c1, c2, c3, seed) {
    const r = rng(seed * 977 + 13), q = [];
    for (let y = 0; y < 4; y++) { let row = ''; for (let x = 0; x < 4; x++) { const v = r(); row += v < 0.45 ? 'a' : v < 0.75 ? 'b' : 'c'; } q.push(row); }
    const qr = (g) => g.map((_, y) => g.map(r2 => r2[3 - y]).join(''));
    const q2 = qr(q), q3 = qr(q2), q4 = qr(q3), g = [];
    for (let y = 0; y < 4; y++) g.push(q[y] + q2[y]);
    for (let y = 0; y < 4; y++) g.push(q4[y] + q3[y]);
    return { p: { a: c1, b: c2, c: c3 }, g };
}
// ore specks of colour col on a base texture
function oreOn(base, col, alt = 0) {
    const B = TEX[base];
    const g = (alt ? P.ore2 : P.ore).map((row, y) => row.split('').map((ch, x) => (ch === 'k' ? 'k' : B.g[y][x])).join(''));
    return { p: { ...B.p, k: col }, g };
}
// a plant on a clear ground: rows of letters with their colours
const plant = (g, p) => ({ p, g });
const FLOWER = {
    tulip: ['........', '..p.p...', '..ppp...', '..pqp...', '...g....', '..gg.g..', '...gg...', '...g....'],
    daisy: ['........', '..w.w...', '.wwyww..', '..wyw...', '..w.w...', '...g....', '..gg....', '...g....'],
    orchid: ['........', '.pp.....', 'ppqp.pp.', '.pp.ppqp', '...g.pp.', '..gg.g..', '...gg...', '...g....'],
    ball: ['........', '..pqp...', '.pqpqp..', '..pqp...', '...g....', '...g....', '..gg....', '...g....'],
    small: ['........', '........', '.w...w..', 'wyw.wyw.', '.w.g.w..', '..g.g...', '...gg...', '...g....'],
    bells: ['........', '...g....', '..g.w...', '.g..ww..', '.w...g..', 'ww..gg..', '...gg...', '...g....'],
    rose: ['........', '..pp....', '.pqpp...', '.ppqp...', '..pp....', '...gg.g.', '..g.gg..', '...g....'],
    big: ['..yyyy..', '.yyooyy.', '.yooooy.', '.yyooyy.', '..yyyy..', '...g....', '..ggg...', '...g....'],
    tall: ['...p....', '..pqp...', '..ppp...', '.pqpqp..', '..ppp...', '...g....', '..ggg...', '...g....'],
};
const COLORS = [
    ['white', '흰색', 'e9ecec'], ['orange', '주황색', 'f07613'], ['magenta', '자홍색', 'bd44b3'], ['light_blue', '하늘색', '3aafd9'],
    ['yellow', '노란색', 'f8c527'], ['lime', '연두색', '70b919'], ['pink', '분홍색', 'ed8dac'], ['gray', '회색', '3e4447'],
    ['light_gray', '밝은 회색', '8e8e86'], ['cyan', '청록색', '158991'], ['purple', '보라색', '792aac'], ['blue', '파란색', '35399d'],
    ['brown', '갈색', '724728'], ['green', '초록색', '546d1b'], ['red', '빨간색', 'a12722'], ['black', '검은색', '141519'],
];
const CK = (k) => k.replace(/_(.)/g, (_, c) => c.toUpperCase());     // light_blue -> lightBlue
const TERRA = ['d1b2a1', 'a15325', '95576c', '716d8a', 'ba8523', '677534', 'a14e4e', '392a23', '876a61', '575b5b', '764656', '4a3b5b', '4d3323', '4c532a', '8e3c2e', '251610'];
export const WOODS = [
    { k: 'oak', ko: '참나무', pl: 'a7834f', bark: '6b5233', top: 'b08b56', leaf: '3f8a2a', st: 'b29157', old: { log: 13, leaves: 14, planks: 5, sapling: 31 } },
    { k: 'birch', ko: '자작나무', pl: 'c9b47a', bark: 'dcd8cc', top: 'c9b583', leaf: '6aa046', st: 'd2c08a', old: { log: 23, leaves: 24 } },
    { k: 'spruce', ko: '가문비나무', pl: '7a5a38', bark: '4a3520', top: '7a5c38', leaf: '30553a', st: '8a6a42', old: { log: 25, leaves: 26 } },
    { k: 'mahogany', ko: '마호가니', pl: 'a8643f', bark: '5a4422', top: 'a8703f', leaf: '2a8a1c', st: 'b07a4a' },
    { k: 'acacia', ko: '아카시아', pl: 'b8622e', bark: '67605a', top: 'b0603a', leaf: '6a9a24', st: 'b8703a' },
    { k: 'ebony', ko: '흑단나무', pl: '4a311a', bark: '3a2915', top: '4e3a22', leaf: '255a18', st: '5a4228' },
    { k: 'ember', ko: '잉걸버섯', pl: '7a3448', bark: '6e2034', top: '8a4058', leaf: 'a41c1c', st: '8a3a52', ashen: 1 },
    { k: 'indigo', ko: '쪽빛버섯', pl: '2c7470', bark: '1e4a5e', top: '3a8a82', leaf: '16807a', st: '3a8a84', ashen: 1 },
];

// creative tabs
export const CATS = ['건축 블록', '장식 블록', '자연', '기능 블록', '작동 장치', '재료·음식', '도구·전투', '생성 알'];

// Block ids of the new kinds start at NEW0 (their variants right after each kind); items at ITEM0.
export const NEW0 = 200, ITEM0 = 2000;
export function makeContent(BLOCKS, ITEMS, RECIPES, SMELT) {
    let nextId = NEW0, nextItem = ITEM0;
    const tex = (name, t) => { if (TEX[name]) throw new Error('texture twice ' + name); if (t.g.length !== 8 || t.g.some(r => r.length !== 8)) throw new Error('texture size ' + name); TEX[name] = t; return name; };
    const byKey = new Map();
    for (const b of BLOCKS) if (b) byKey.set(b.n, b);
    const add = (b) => { b.id = nextId++; BLOCKS[b.id] = b; if (byKey.has(b.n)) throw new Error('block twice ' + b.n); byKey.set(b.n, b); if (nextId >= ITEM0) throw new Error('block ids run into items'); if (nextId >= 1900) throw new Error('block ids run into the new tools (XTOOL 1900)'); return b; };
    const item = (it) => { it.id = nextItem++; ITEMS.push(it); return it; };
    const R = (r, out, n = 1, m = 0) => RECIPES.push({ r, out, n, m });
    const S = (a, b) => SMELT.push([a, b]);
    const cube = (n, key, ko, t, more = {}) => add({ n, key, ko, t: Array.isArray(t) ? t : [t], ...more });
    const old = (id, key, ko, cat, more = {}) => { const b = BLOCKS[id]; Object.assign(b, { key, cat, ...more }); if (ko) b.ko = ko; return b; };
    // a kind and its variants (the first is the kind; the rest follow it, hidden, and count as it)
    const variants = (base, list) => {
        const first = add({ ...base, ...list[0] });
        delete first.v;
        for (const v of list.slice(1)) { const b = add({ ...base, ...v, n: base.n + '_' + v.v, key: base.key + '_' + v.v, hidden: 1, item: first.n }); delete b.v; }
        return first;
    };
    const slab = (n, key, ko, t, more = {}) => {
        const b = { n, key, ko, t, ...more, shape: 5, hide: 0, lop: 0, place: 'slab', cat: 0 };
        const s = variants(b, [{ model: 'slab_b' }, { model: 'slab_t', v: 'top' }, { model: null, shape: 0, hide: 1, lop: 1, v: 'double', dropN: 2 }]);
        byKey.get(n + '_double').drop = n; byKey.get(n + '_top').drop = n;
        return s;
    };
    const stairs = (n, key, ko, t, more = {}) => {
        const L = [];
        for (const h of [0, 1]) for (let f = 0; f < 4; f++) L.push({ model: `stairs_${f}_${h}`, v: `${f}${h}` });
        L[0].v = undefined;
        const s = variants({ n, key, ko, t, ...more, shape: 5, hide: 0, lop: 0, place: 'stairs', cat: 0 }, L);
        for (const v of L.slice(1)) byKey.get(n + '_' + v.v).drop = n;
        return s;
    };
    const wall = (n, key, ko, t, more = {}) => add({ n, key, ko, t, ...more, shape: 5, hide: 0, lop: 0, model: 'wall', conn: 2, cat: 1 });
    // a stone-like kind with its slab, stairs (and wall)
    const stoneSet = (b, ko, opts = {}) => {
        const st = { hard: b.hard, tool: b.tool, tier: b.tier };
        const n = b.n, key = b.key;
        if (opts.slab !== 0) { const s = slab(n + 'Slab', key + '_slab', ko + ' 반 블록', b.t6 ? [b.t6[3], b.t6[0], b.t6[2]] : b.t, st); R([`${n} ${n} ${n}`], s.n, 6); }
        if (opts.stairs !== 0) { const s = stairs(n + 'Stairs', key + '_stairs', ko + ' 계단', b.t6 ? [b.t6[3], b.t6[0], b.t6[2]] : b.t, st); R([`${n} _ _`, `${n} ${n} _`, `${n} ${n} ${n}`], s.n, 4, 1); }
        if (opts.wall) { const w = wall(n + 'Wall', key + '_wall', ko + ' 담장', b.t6 ? [b.t6[3], b.t6[0], b.t6[2]] : b.t, st); R([`${n} ${n} ${n}`, `${n} ${n} ${n}`], w.n, 6); }
        return b;
    };
    const stone = (n, key, ko, t, more = {}) => cube(n, key, ko, t, { hard: 1.5, tool: 1, tier: 0, cat: 0, ...more });
    const door = (n, key, ko, tLow, tHigh, tEdge, more) => {
        const L = [];
        // half h, the side s it closes, open o (then it stands on the next side round)
        for (const o of [0, 1]) for (const h of [0, 1]) for (let s = 0; s < 4; s++) L.push({ model: `door_${o ? (s + 1) % 4 : s}`, v: `${o}${h}${s}`, half: h, side: s, open: o, t: [tEdge, h ? tHigh : tLow, tEdge] });
        L[0].v = undefined;
        const d = variants({ n, key, ko, ...more, shape: 5, hide: 0, lop: 0, place: 'door', use: more.iron ? 'none' : 'door', cat: 3 }, L);
        for (const v of L.slice(1)) byKey.get(n + '_' + v.v).drop = v.half ? 'none' : n;
        d.icon = { g: ['.bbbbbb.', '.b.bb.b.', '.bbbbbb.', '.baaaab.', '.bbbbbb.', '.baaaab.', '.bacaab.', '.bbbbbb.'], p: { ...TEX[tLow].p } };
        return d;
    };
    const trapdoor = (n, key, ko, t, more) => {
        const L = [{ model: 'trap_b' }, { model: 'trap_t', v: 'top' }];
        for (const h of [0, 1]) for (let s = 0; s < 4; s++) L.push({ model: `trapo_${s}`, v: h ? `opentop${s}` : `open${s}` });
        const d = variants({ n, key, ko, t: [t], ...more, shape: 5, hide: 0, lop: 0, place: 'trapdoor', use: more.iron ? 'none' : 'trapdoor', cat: 3 }, L);
        for (const v of L.slice(1)) byKey.get(n + '_' + v.v).drop = n;
        return d;
    };
    // what hangs on a side (levers, buttons): one variant for each side it can be fixed to, the
    // way from it to that block (D6: 0 -x, 1 +x, 2 -y the floor, 3 +y the ceiling, 4 -z, 5 +z)
    const ATT = [2, 5, 1, 4, 0, 3];
    const hung = (base, more = (a) => ({})) => {
        const L = [];
        ATT.forEach((a, i) => L.push({ v: i ? `a${a}` : undefined, att: a, need: a === 2 ? 'floor' : 'none', ...more(a) }));
        const r = variants(base, L);
        for (const v of L.slice(1)) byKey.get(r.n + '_' + v.v).drop = r.n;
        return r;
    };
    const button = (b) => hung({ ...b, shape: 5, hide: 0, lop: 0, solid: 0, cat: 4, use: 'button', rs: 'button' }, (a) => ({ model: `button_${a}` }));
    const kinds = {};

    // ================================================================ 1. the woods
    for (const w of WOODS) {
        const K = w.k, ko = w.ko, A = w.ashen;
        const tPl = tex(K + 'Planks', pat(P.planks, pal3(w.pl, 0.82, 1.1)));
        const barkT = K === 'birch' ? TEX.logBirchSide : pat(P.logSide, pal3(w.bark, 0.78, 1.15));
        if (A) barkT.g = barkT.g.map((r, y) => r.split('').map((ch, x) => ((x * 7 + y * 3) % 11 === 0 ? 'd' : ch)).join('')), barkT.p.d = shade(w.leaf, 1.3);
        const tBark = tex(K + 'Bark', barkT);
        const tBarkH = tex(K + 'BarkH', { p: barkT.p, g: tr(barkT.g) });
        const tTop = tex(K + 'LogTop', pat(P.logTop, { a: w.top, b: shade(w.top, 0.82), c: w.bark }));
        const tStrip = tex(K + 'Strip', pat(P.stripSide, { a: w.st, b: shade(w.st, 0.88) }));
        const tStripH = tex(K + 'StripH', pat(tr(P.stripSide), { a: w.st, b: shade(w.st, 0.88) }));
        const tStripTop = tex(K + 'StripTop', pat(P.logTop, { a: w.top, b: shade(w.top, 0.85), c: w.st }));
        const fuel = A ? 0 : 15, wood = { hard: 2, tool: 2, fuel };
        const logSet = (n, key, kname, side, sideH, top, oldId) => {
            const t6 = (ax) => ax === 0 ? [side, side, top, top, side, side] : ax === 1 ? [top, top, sideH, sideH, sideH, sideH] : [sideH, sideH, side, side, top, top];
            const first = oldId ? old(oldId, key, kname, 2, { t6: t6(0), place: 'axis' }) : add({ n, key, ko: kname, t6: t6(0), ...wood, place: 'axis', cat: 2 });
            add({ n: first.n + '_x', key: key + '_x', ko: kname, t6: t6(1), ...wood, hidden: 1, item: first.n });
            add({ n: first.n + '_z', key: key + '_z', ko: kname, t6: t6(2), ...wood, hidden: 1, item: first.n });
            return first;
        };
        const stem = A ? '줄기' : '원목', hy = A ? '균사' : '목재';
        const log = logSet(K + 'Log', `${K}_${A ? 'stem' : 'log'}`, `${ko} ${stem}`, tBark, tBarkH, tTop, w.old && w.old.log);
        const wd = logSet(K + 'Wood', `${K}_${A ? 'hyphae' : 'wood'}`, `${ko} ${hy}`, tBark, tBarkH, tBark);
        const slog = logSet(K + 'StrippedLog', `stripped_${K}_${A ? 'stem' : 'log'}`, `껍질 벗긴 ${ko} ${stem}`, tStrip, tStripH, tStripTop);
        const swd = logSet(K + 'StrippedWood', `stripped_${K}_${A ? 'hyphae' : 'wood'}`, `껍질 벗긴 ${ko} ${hy}`, tStrip, tStripH, tStrip);
        for (const [a, b] of [[log, slog], [wd, swd]]) for (const s of ['', '_x', '_z']) byKey.get(a.n + s).strip = b.n + s;
        if (!A) for (const b of [log, wd, slog, swd]) b.tag = 'logs';
        const planks = w.old && w.old.planks ? old(w.old.planks, `${K}_planks`, `${ko} 판자`, 0, { t: [tPl] }) : cube(K + 'Planks', `${K}_planks`, `${ko} 판자`, tPl, { ...wood, cat: 0 });
        planks.tag = 'planks';
        for (const b of [log, wd, slog, swd]) R([b.n], planks.n, 4);
        R([`${log.n} ${log.n}`, `${log.n} ${log.n}`], wd.n, 3); R([`${slog.n} ${slog.n}`, `${slog.n} ${slog.n}`], swd.n, 3);
        if (!A) { S(log.n, 'coal'); S(wd.n, 'coal'); }
        const P0 = planks.n, pt = [tPl];
        const sl = slab(K + 'Slab', `${K}_slab`, `${ko} 반 블록`, pt, { ...wood, fuel: fuel / 2 }); R([`${P0} ${P0} ${P0}`], sl.n, 6);
        const st = stairs(K + 'Stairs', `${K}_stairs`, `${ko} 계단`, pt, wood); R([`${P0} _ _`, `${P0} ${P0} _`, `${P0} ${P0} ${P0}`], st.n, 4, 1);
        const fe = add({ n: K + 'Fence', key: `${K}_fence`, ko: `${ko} 울타리`, t: pt, ...wood, shape: 5, hide: 0, lop: 0, model: 'fence', conn: 1, cat: 1 });
        R([`${P0} stick ${P0}`, `${P0} stick ${P0}`], fe.n, 3);
        const gate = variants({ n: K + 'Gate', key: `${K}_fence_gate`, ko: `${ko} 울타리 문`, t: pt, ...wood, shape: 5, hide: 0, lop: 0, place: 'gate', use: 'gate', cat: 3 },
            [{ model: 'gate_0' }, { model: 'gate_1', v: 'z' }, { model: 'gateo_0', v: 'open', solid: 0 }, { model: 'gateo_1', v: 'openz', solid: 0 }]);
        for (const v of ['z', 'open', 'openz']) byKey.get(gate.n + '_' + v).drop = gate.n;
        R([`stick ${P0} stick`, `stick ${P0} stick`], gate.n, 1);
        const dpal = { a: w.pl, b: shade(w.pl, 0.7), c: shade(w.pl, 1.15) };
        const tD = tex(K + 'Door', pat(P.door, dpal)), tDT = tex(K + 'DoorTop', pat(A || K === 'ebony' ? P.door : P.doorTop, dpal)), tTD = tex(K + 'Trap', pat(P.trapdoor, dpal));
        door(K + 'Door', `${K}_door`, `${ko} 문`, tD, tDT, tPl, wood); R([`${P0} ${P0}`, `${P0} ${P0}`, `${P0} ${P0}`], K + 'Door', 3);
        trapdoor(K + 'Trapdoor', `${K}_trapdoor`, `${ko} 다락문`, tTD, wood); R([`${P0} ${P0} ${P0}`, `${P0} ${P0} ${P0}`], K + 'Trapdoor', 2);
        const pp = add({ n: K + 'Plate', key: `${K}_pressure_plate`, ko: `${ko} 압력판`, t: pt, hard: 0.5, tool: 2, shape: 5, hide: 0, lop: 0, solid: 0, model: 'plate', cat: 4, need: 'floor', plate: 1 });
        R([`${P0} ${P0}`], pp.n, 1);
        const bt = button({ n: K + 'Button', key: `${K}_button`, ko: `${ko} 버튼`, t: pt, hard: 0.5, aux: 15 });
        R([P0], bt.n, 1);
        const sg = add({ n: K + 'Sign', key: `${K}_sign`, ko: `${ko} 표지판`, t: pt, hard: 1, tool: 2, shape: 5, hide: 0, lop: 0, solid: 0, model: 'sign', cat: 1, use: 'sign', st: 16, fuel });
        R([`${P0} ${P0} ${P0}`, `${P0} ${P0} ${P0}`, '_ stick _'], sg.n, 3);
        let leaves;
        if (A) leaves = cube(K + 'Wart', `${K}_wart_block`, `${ko} 갓 블록`, tex(K + 'WartT', speck(w.leaf, 31 + K.length, 0.3, 0.2)), { hard: 1, cat: 2, tool: 5 });
        else if (w.old && w.old.leaves) leaves = old(w.old.leaves, `${K}_leaves`, `${ko} 잎`, 2, { tool: 6 });
        else leaves = add({ n: K + 'Leaves', key: `${K}_leaves`, ko: `${ko} 잎`, t: [tex(K + 'LeavesT', pat(P.leaves, pal3(w.leaf, 0.75, 1.2)))], hard: 0.2, lop: 0, drop: 'none', leaf: 1, cat: 2, tool: 6 });
        const spr = A
            ? plant(['........', '..cccc..', '.cbbbbc.', '.cccccc.', '...aa...', '...aa...', '..a..a..', '........'], { a: w.st, b: shade(w.leaf, 1.2), c: w.leaf })
            : plant(['...g....', '..ggh...', '.hggg.g.', '..hgggh.', '...hgg..', '....b...', '...bb...', '....b...'], { g: w.leaf, h: shade(w.leaf, 0.75), b: w.bark });
        let sap;
        if (w.old && w.old.sapling) sap = old(w.old.sapling, 'oak_sapling', '참나무 묘목', 2, { tree: 0, need: 'soil' });
        else sap = add({ n: K + 'Sapling', key: A ? `${K}_fungus` : `${K}_sapling`, ko: A ? ko : `${ko} 묘목`, t: [tex(K + 'SaplingT', spr)], hard: 0, shape: 1, cat: 2, tree: WOODS.indexOf(w), need: A ? 'ashen' : 'soil' });
        leaves.sapling = sap.n;
        kinds[K] = { log, planks, leaves, sap, fence: fe };
    }
    for (let i = RECIPES.length - 1; i >= 0; i--) if (RECIPES[i].n === 0) RECIPES.splice(i, 1);
    // birch and spruce made the oak planks before
    for (let i = RECIPES.length - 1; i >= 0; i--) if (['logBirch', 'logSpruce'].includes(RECIPES[i].r[0]) && RECIPES[i].out === 'planks' && RECIPES[i].r.length === 1) RECIPES.splice(i, 1);

    // ================================================================ 2. the sixteen colours
    for (let ci = 0; ci < 16; ci++) {
        const [ck0, cko, c] = COLORS[ci], ck = CK(ck0);
        const pal = pal3(c, 0.86, 1.1);
        const dye = item({ n: ck + 'Dye', key: `${ck0}_dye`, ko: `${cko} 염료`, cat: 5, icon: ['........', '...bb...', '..bawb..', '.baaaab.', '.baaaab.', '.baaaab.', '..bbbb..', '........'], p: { a: c, b: shade(c, 0.7), w: mixc(c, 'ffffff', 0.5) } });
        const wool = ci === 0 ? old(32, 'white_wool', '흰색 양털', 1, { tag: 'wool', fuel: 5 }) : cube(ck + 'Wool', `${ck0}_wool`, `${cko} 양털`, tex(ck + 'WoolT', pat(P.wool, pal)), { hard: 0.8, cat: 1, tag: 'wool', fuel: 5, tool: 6 });
        wool.tool = 6;
        if (ci > 0) R([`${dye.n} wool`], wool.n, 1, 1);
        const carpet = add({ n: ck + 'Carpet', key: `${ck0}_carpet`, ko: `${cko} 카펫`, t: [wool.t[0]], hard: 0.1, shape: 5, hide: 0, lop: 0, model: 'carpet', cat: 1, need: 'below' });
        R([`${wool.n} ${wool.n}`], carpet.n, 3);
        const terra = stone(ck + 'Terracotta', `${ck0}_terracotta`, `${cko} 테라코타`, tex(ck + 'TerraT', pat(P.terra, { a: TERRA[ci], b: shade(TERRA[ci], 0.9) })), { hard: 1.25, cat: 1 });
        R(['terracotta terracotta terracotta', `terracotta ${dye.n} terracotta`, 'terracotta terracotta terracotta'], terra.n, 8);
        const gz = stone(ck + 'Glazed', `${ck0}_glazed_terracotta`, `${cko} 유약 테라코타`, tex(ck + 'GlazedT', glazed(c, shade(c, 0.6), mixc(c, 'ffffff', 0.55), ci + 1)), { hard: 1.4, cat: 1 });
        S(terra.n, gz.n);
        const conc = stone(ck + 'Concrete', `${ck0}_concrete`, `${cko} 콘크리트`, tex(ck + 'ConcT', pat(P.flat, { a: shade(c, 0.95), b: shade(c, 0.9) })), { hard: 1.8, cat: 1 });
        const pow = cube(ck + 'Powder', `${ck0}_concrete_powder`, `${cko} 콘크리트 가루`, tex(ck + 'PowT', pat(P.powder, { a: mixc(c, 'ffffff', 0.12), b: shade(c, 0.85), c: mixc(c, 'ffffff', 0.3) })), { hard: 0.5, tool: 3, fall: 1, cat: 1, wet: conc.n });
        R([`${dye.n} sand sand`, 'sand sand gravel', 'gravel gravel gravel'], pow.n, 8);
        const sg = cube(ck + 'Glass', `${ck0}_stained_glass`, `${cko} 색유리`, tex(ck + 'GlassT', pat(P.stained, { w: mixc(c, 'ffffff', 0.4), s: 'ffffff', t: c })), { hard: 0.3, shape: 4, hide: 0, lop: 0, drop: 'none', cat: 1 });
        R(['glass glass glass', `glass ${dye.n} glass`, 'glass glass glass'], sg.n, 8);
        const pane = add({ n: ck + 'Pane', key: `${ck0}_stained_glass_pane`, ko: `${cko} 색유리판`, t: [sg.t[0]], hard: 0.3, shape: 5, hide: 0, lop: 0, model: 'pane', conn: 3, drop: 'none', cat: 1 });
        R([`${sg.n} ${sg.n} ${sg.n}`, `${sg.n} ${sg.n} ${sg.n}`], pane.n, 16);
        // the bed: two halves by facing (the head, with the pillow, toward the facing)
        const tF = tex(ck + 'BedF', pat(['aaaaaaaa', 'abbbbbba', 'aaaaaaaa', 'abbbbbba', 'aaaaaaaa', 'abbbbbba', 'aaaaaaaa', 'aaaaaaaa'], { a: c, b: shade(c, 0.85) }));
        const H = ['aaaaaaaa', 'abbbbbba', 'aaaaaaaa', 'aaaaaaaa', 'awwwwwwa', 'awwwwwwa', 'awwwwwwa', 'aaaaaaaa'], hp = { a: c, b: shade(c, 0.85), w: 'f0f0f0' };
        const head = [tex(ck + 'BedH0', pat(H, hp)), tex(ck + 'BedH1', pat(tr(H), hp)), tex(ck + 'BedH2', pat(H.slice().reverse(), hp)), tex(ck + 'BedH3', pat(flipH(tr(H)), hp))];
        const tS = tex(ck + 'BedS', pat(['........', '........', '........', 'aaaaaaaa', 'aaaaaaaa', 'bbbbbbbb', 'b......b', 'b......b'], { a: c, b: '6b5233' }));
        const L = [];
        for (const h of [0, 1]) for (let f = 0; f < 4; f++) L.push({ model: 'bed', v: `${h}${f}`, half: h, face: f, t6: [tS, tS, 'oakPlanks', h ? head[f] : tF, tS, tS] });
        L[0].v = undefined;
        const bed = variants({ n: ck + 'Bed', key: `${ck0}_bed`, ko: `${cko} 침대`, t: [tF], hard: 0.2, tool: 2, shape: 5, hide: 0, lop: 0, place: 'bed', use: 'bed', cat: 3, st: 1 }, L);
        for (const v of L.slice(1)) byKey.get(bed.n + '_' + v.v).drop = v.half ? 'none' : bed.n;
        bed.icon = { g: ['........', '........', 'wwbbbbbb', 'wwbbbbbb', 'kkkkkkkk', 'k......k', '........', '........'], p: { w: 'f0f0f0', b: c, k: '6b5233' } };
        R([`${wool.n} ${wool.n} ${wool.n}`, '#planks #planks #planks'], bed.n, 1);
        const sh = add({ n: ck + 'ShellBox', key: `${ck0}_shell_box`, ko: `${cko} 껍질 상자`, t: [tex(ck + 'ShellT', recolor('shellTop', { a: c, b: shade(c, 0.8), k: shade(c, 0.5) })), tex(ck + 'ShellS', recolor('shellSide', { a: c, b: shade(c, 0.8), k: shade(c, 0.5), y: mixc(c, 'ffffff', 0.7) })), ck + 'ShellT'], hard: 2, tool: 1, use: 'shell', cat: 3, st: 1 });
        R([`shellBox ${dye.n}`], sh.n, 1, 1);
        const bn = add({ n: ck + 'Banner', key: `${ck0}_banner`, ko: `${cko} 깃발`, t: [wool.t[0]], hard: 1, shape: 5, hide: 0, lop: 0, solid: 0, model: 'banner', cat: 1, st: 16 });
        R([`${wool.n} ${wool.n} ${wool.n}`, `${wool.n} ${wool.n} ${wool.n}`, '_ stick _'], bn.n, 1);
    }
    const terracotta = stone('terracotta', 'terracotta', '테라코타', tex('terraPlain', pat(P.terra, { a: '985e43', b: '8a5440' })), { hard: 1.25, cat: 1 });
    add({ n: 'glassPane', key: 'glass_pane', ko: '유리판', t: ['glass'], hard: 0.3, shape: 5, hide: 0, lop: 0, model: 'pane', conn: 3, drop: 'none', cat: 1 });
    R(['glass glass glass', 'glass glass glass'], 'glassPane', 16);

    // ================================================================ 3. stone and its kin
    old(1, 'stone', null, 0); stoneSet(BLOCKS[1], '돌', { wall: 0 });
    old(4, 'cobblestone', null, 0, { tag: 'stonecraft' }); stoneSet(BLOCKS[4], '조약돌', { wall: 1 });
    old(36, 'mossy_cobblestone', null, 0); stoneSet(BLOCKS[36], '이끼 낀 조약돌', { wall: 1 });
    R(['cobble vines'], 'mossy', 1, 1);
    const smoothS = stone('smoothStone', 'smooth_stone', '매끄러운 돌', [tex('smoothStoneT', pat(P.smooth, { a: '9e9e9e', b: '868686', c: 'b0b0b0' }))]);
    stoneSet(smoothS, '매끄러운 돌', { stairs: 0 }); S('stone', 'smoothStone');
    old(38, 'stone_bricks', null, 0); stoneSet(BLOCKS[38], '석재 벽돌', { wall: 1 });
    const mossyB = stone('mossyStoneBricks', 'mossy_stone_bricks', '이끼 낀 석재 벽돌', tex('mossyBricksT', pat(P.mossyBricks, { a: '7d7d7d', b: '5a5a5a', c: '8f8f8f', m: '4f7a35' })));
    stoneSet(mossyB, '이끼 낀 석재 벽돌', { wall: 1 }); R(['stoneBricks vines'], mossyB.n, 1, 1);
    stone('crackedStoneBricks', 'cracked_stone_bricks', '금 간 석재 벽돌', tex('crackedBricksT', pat(P.cracked, { a: '7d7d7d', b: '4e4e4e', c: '8f8f8f' }))); S('stoneBricks', 'crackedStoneBricks');
    stone('chiseledStoneBricks', 'chiseled_stone_bricks', '조각된 석재 벽돌', tex('chiseledStoneT', pat(P.chiseled, { a: '7d7d7d', b: '5a5a5a', c: '9a9a9a' })));
    R(['stoneBricksSlab', 'stoneBricksSlab'], 'chiseledStoneBricks', 1);
    for (const [n, key, ko, c] of [['granite', 'granite', '화강암', '9a6a55'], ['limestone', 'limestone', '석회암', 'd4d0c4'], ['slate', 'slate', '점판암', '5a6068']]) {
        const b = stone(n, key, ko, tex(n + 'T', speck(c, n.length * 17 + 5, 0.25, 0.2, 0.82, 1.14)));
        stoneSet(b, ko, { wall: 1 });
        const pb = stone('polished' + n[0].toUpperCase() + n.slice(1), `polished_${key}`, `윤 나는 ${ko}`, tex(n + 'PolT', pat(P.polished, pal3(c, 0.85, 1.1))));
        stoneSet(pb, `윤 나는 ${ko}`, { wall: 1 });
        R([`${n} ${n}`, `${n} ${n}`], pb.n, 4);
    }
    R(['cobble limestone', 'limestone cobble'], 'granite', 2); R(['cobble quartz', 'quartz cobble'], 'limestone', 2); R(['cobble limestone'], 'slate', 2, 1);
    // sandstone and red sandstone
    old(21, 'sandstone', null, 0); stoneSet(BLOCKS[21], '사암', { wall: 1 });
    const sandT = BLOCKS[21].t;
    const cutS = stone('cutSandstone', 'cut_sandstone', '깎은 사암', [sandT[0], tex('cutSandT', pat(P.cut, { a: 'd8c995', b: 'b8a774', c: 'e6d9aa' })), sandT[0]], { hard: 0.8 });
    stoneSet(cutS, '깎은 사암', { stairs: 0 }); R(['sandstone sandstone', 'sandstone sandstone'], cutS.n, 4);
    stone('chiseledSandstone', 'chiseled_sandstone', '조각된 사암', [sandT[0], tex('chisSandT', pat(P.chiseled, { a: 'd8c995', b: 'b8a774', c: 'e6d9aa' })), sandT[0]], { hard: 0.8 });
    R(['sandstoneSlab', 'sandstoneSlab'], 'chiseledSandstone', 1);
    const smS = stone('smoothSandstone', 'smooth_sandstone', '매끄러운 사암', sandT[0], { hard: 2 }); stoneSet(smS, '매끄러운 사암'); S('sandstone', smS.n);
    const redSand = cube('redSand', 'red_sand', '붉은 모래', tex('redSandT', speck('be6a30', 77, 0.25, 0.18)), { hard: 0.5, tool: 3, fall: 1, cat: 2 });
    const rsTop = tex('redSandstoneTop', recolor('sandstoneTop', { a: 'b8622c', b: 'a45626' }));
    const rsSide = tex('redSandstoneSide', recolor('sandstoneSide', { a: 'b8622c', b: '9a4c22', c: 'c8723a' }));
    const rss = stone('redSandstone', 'red_sandstone', '붉은 사암', [rsTop, rsSide, rsTop], { hard: 0.8 });
    stoneSet(rss, '붉은 사암', { wall: 1 }); R(['redSand redSand', 'redSand redSand'], rss.n, 1);
    const cutR = stone('cutRedSandstone', 'cut_red_sandstone', '깎은 붉은 사암', [rsTop, tex('cutRedT', pat(P.cut, { a: 'b8622c', b: '9a4c22', c: 'c8723a' })), rsTop], { hard: 0.8 });
    stoneSet(cutR, '깎은 붉은 사암', { stairs: 0 }); R(['redSandstone redSandstone', 'redSandstone redSandstone'], cutR.n, 4);
    stone('chiseledRedSandstone', 'chiseled_red_sandstone', '조각된 붉은 사암', [rsTop, tex('chisRedT', pat(P.chiseled, { a: 'b8622c', b: '9a4c22', c: 'c8723a' })), rsTop], { hard: 0.8 });
    R(['redSandstoneSlab', 'redSandstoneSlab'], 'chiseledRedSandstone', 1);
    const smR = stone('smoothRedSandstone', 'smooth_red_sandstone', '매끄러운 붉은 사암', rsTop, { hard: 2 }); stoneSet(smR, '매끄러운 붉은 사암'); S('redSandstone', smR.n);
    S('redSand', 'glass');
    old(39, 'bricks', null, 0); stoneSet(BLOCKS[39], '벽돌', { wall: 1 });
    // the black bricks of the depths, their red ones, their fence
    old(52, 'black_bricks', null, 0); stoneSet(BLOCKS[52], '검은 벽돌', { wall: 1 });
    add({ n: 'blackBrickFence', key: 'black_brick_fence', ko: '검은 벽돌 울타리', t: BLOCKS[52].t, hard: 2, tool: 1, tier: 0, shape: 5, hide: 0, lop: 0, model: 'fence', conn: 1, cat: 1 });
    R(['blackBricks ashBrick blackBricks', 'blackBricks ashBrick blackBricks'], 'blackBrickFence', 6);
    const redBlack = stone('redBlackBricks', 'red_black_bricks', '붉은 검은 벽돌', tex('redBlackT', pat(P.bricks, { a: '6e1418', b: '3a080a', c: '8a2026' })), { hard: 2 });
    stoneSet(redBlack, '붉은 검은 벽돌', { wall: 1 }); R(['emberWart ashBrick', 'ashBrick emberWart'], redBlack.n, 1);
    stone('crackedBlackBricks', 'cracked_black_bricks', '금 간 검은 벽돌', tex('crackedBlackT', pat(P.cracked, { a: '5a2c2e', b: '2a1012', c: '6c3a3a' })), { hard: 2 }); S('blackBricks', 'crackedBlackBricks');
    stone('chiseledBlackBricks', 'chiseled_black_bricks', '조각된 검은 벽돌', tex('chisBlackT', pat(P.chiseled, { a: '5a2c2e', b: '341618', c: '7c4a4a' })), { hard: 2 });
    R(['blackBricksSlab', 'blackBricksSlab'], 'chiseledBlackBricks', 1);
    // quartz
    const qp = { a: 'ece6dc', b: 'd4ccbe', c: 'ffffff' };
    const qz = stone('quartzBlock', 'quartz_block', '석영 블록', [tex('quartzTop', pat(P.flat, qp)), tex('quartzSide', pat(P.smooth, qp)), 'quartzTop'], { hard: 0.8 });
    stoneSet(qz, '석영'); R(['quartz quartz', 'quartz quartz'], qz.n, 1);
    stone('chiseledQuartz', 'chiseled_quartz_block', '조각된 석영 블록', tex('chisQuartzT', pat(P.chiseled, qp)), { hard: 0.8 }); R(['quartzBlockSlab', 'quartzBlockSlab'], 'chiseledQuartz', 1);
    const qpil = stone('quartzPillar', 'quartz_pillar', '석영 기둥', [tex('quartzPilTop', pat(P.pillarTop, qp)), tex('quartzPilSide', pat(P.pillarSide, qp)), 'quartzPilTop'], { hard: 0.8, place: 'axis' });
    add({ ...qpil, n: 'quartzPillar_x', key: 'quartz_pillar_x', hidden: 1, item: 'quartzPillar', t: null, t6: ['quartzPilTop', 'quartzPilTop', tex('quartzPilSideH', pat(tr(P.pillarSide), qp)), 'quartzPilSideH', 'quartzPilSideH', 'quartzPilSideH'] });
    add({ ...qpil, n: 'quartzPillar_z', key: 'quartz_pillar_z', hidden: 1, item: 'quartzPillar', t: null, t6: ['quartzPilSideH', 'quartzPilSideH', 'quartzPilSide', 'quartzPilSide', 'quartzPilTop', 'quartzPilTop'] });
    R(['quartzBlock', 'quartzBlock'], qpil.n, 2);
    stone('quartzBricks', 'quartz_bricks', '석영 벽돌', tex('quartzBricksT', pat(P.stoneBricks, qp)), { hard: 0.8 }); R(['quartzBlock quartzBlock', 'quartzBlock quartzBlock'], 'quartzBricks', 4);
    const smQ = stone('smoothQuartz', 'smooth_quartz', '매끄러운 석영', 'quartzTop', { hard: 2 }); stoneSet(smQ, '매끄러운 석영'); S('quartzBlock', smQ.n);
    // aquastone (the sea's stone)
    const aq = stone('aquastone', 'aquastone', '청록석', tex('aquaT', speck('5aa89a', 909, 0.3, 0.2, 0.8, 1.15)), { hard: 1.5 });
    stoneSet(aq, '청록석', { wall: 1 }); R(['aquaShard aquaShard', 'aquaShard aquaShard'], aq.n, 1);
    const aqb = stone('aquaBricks', 'aquastone_bricks', '청록석 벽돌', tex('aquaBricksT', pat(P.stoneBricks, { a: '6ab8a8', b: '3e8a7e', c: '8ad0c0' })), { hard: 1.5 });
    stoneSet(aqb, '청록석 벽돌'); R(['aquaShard aquaShard aquaShard', 'aquaShard aquaShard aquaShard', 'aquaShard aquaShard aquaShard'], aqb.n, 1);
    const daq = stone('darkAquastone', 'dark_aquastone', '짙은 청록석', tex('darkAquaT', pat(P.polished, { a: '2e5a4e', b: '1e443a', c: '3e6e60' })), { hard: 1.5 });
    stoneSet(daq, '짙은 청록석'); R(['aquaShard aquaShard aquaShard', 'aquaShard blackDye aquaShard', 'aquaShard aquaShard aquaShard'], daq.n, 1);
    cube('aquaLantern', 'aqua_lantern', '바다빛 등', tex('aquaLanternT', pat(['abcbcbca', 'bcacacab', 'cacbcaca', 'bcbabcab', 'cacbcaca', 'bcacacab', 'acbcbcbc', 'abcbcbca'], { a: 'c8e8e0', b: 'e8f8f4', c: '9ad0c4' })), { hard: 0.3, light: 15, cat: 1, drop: 'aquaCrystal', dropN: 2 });
    R(['aquaShard aquaCrystal aquaShard', 'aquaCrystal aquaCrystal aquaCrystal', 'aquaShard aquaCrystal aquaShard'], 'aquaLantern', 1);
    // violet (the void cities' stone)
    old(65, 'violet_bricks', null, 0); stoneSet(BLOCKS[65], '보랏빛 벽돌');
    const vp = { a: 'a87cb0', b: '8a5e94', c: 'c09ac8' };
    const vpil = stone('violetPillar', 'violet_pillar', '보랏빛 기둥', [tex('violetPilTop', pat(P.pillarTop, vp)), tex('violetPilSide', pat(P.pillarSide, vp)), 'violetPilTop'], { hard: 1.5 });
    R(['violetBricksSlab', 'violetBricksSlab'], vpil.n, 1);
    old(54, 'void_stone', null, 0); old(55, 'void_bricks', null, 0); stoneSet(BLOCKS[55], '공허 벽돌', { wall: 1 });
    // blackrock (the dark rock of the depths)
    const br = stone('blackrock', 'blackrock', '흑암', tex('blackrockT', speck('2c2428', 404, 0.3, 0.2, 0.75, 1.2)), { tag: 'stonecraft' });
    stoneSet(br, '흑암', { wall: 1 });
    const pbr = stone('polishedBlackrock', 'polished_blackrock', '윤 나는 흑암', tex('pBlackrockT', pat(P.polished, { a: '362e34', b: '1e181c', c: '463c42' })));
    stoneSet(pbr, '윤 나는 흑암', { wall: 1 }); R(['blackrock blackrock', 'blackrock blackrock'], pbr.n, 4);
    const pbb = stone('blackrockBricks', 'polished_blackrock_bricks', '윤 나는 흑암 벽돌', tex('blackrockBricksT', pat(P.stoneBricks, { a: '362e34', b: '1a1418', c: '463c42' })));
    stoneSet(pbb, '윤 나는 흑암 벽돌', { wall: 1 }); R(['polishedBlackrock polishedBlackrock', 'polishedBlackrock polishedBlackrock'], pbb.n, 4);
    stone('crackedBlackrockBricks', 'cracked_polished_blackrock_bricks', '금 간 흑암 벽돌', tex('crBlackrockT', pat(P.cracked, { a: '362e34', b: '141012', c: '463c42' }))); S(pbb.n, 'crackedBlackrockBricks');
    stone('chiseledBlackrock', 'chiseled_polished_blackrock', '조각된 흑암', tex('chBlackrockT', pat(P.chiseled, { a: '362e34', b: '1e181c', c: '564c52' }))); R(['polishedBlackrockSlab', 'polishedBlackrockSlab'], 'chiseledBlackrock', 1);
    stone('gildedBlackrock', 'gilded_blackrock', '금박 흑암', tex('gildedT', oreOn('blackrockT', 'e8b830')), { drop: 'goldNugget', dropN: 3 });
    button({ n: 'blackrockButton', key: 'polished_blackrock_button', ko: '흑암 버튼', t: [pbr.t[0]], hard: 0.5, aux: 10 }); R(['polishedBlackrock'], 'blackrockButton', 1);
    add({ n: 'blackrockPlate', key: 'polished_blackrock_pressure_plate', ko: '흑암 압력판', t: [pbr.t[0]], hard: 0.5, tool: 1, shape: 5, hide: 0, lop: 0, solid: 0, model: 'plate', cat: 4, need: 'floor', plate: 1, aux: 1 }); R(['polishedBlackrock polishedBlackrock'], 'blackrockPlate', 1);
    old(53, 'basalt', null, 2, { place: 'axis' });
    stone('polishedBasalt', 'polished_basalt', '윤 나는 현무암', [tex('pBasaltTop', pat(P.pillarTop, { a: '5c5c64', b: '38383e', c: '6e6e76' })), tex('pBasaltSide', pat(P.pillarSide, { a: '5c5c64', b: '38383e', c: '6e6e76' })), 'pBasaltTop'], { hard: 1.25 });
    R(['basalt basalt', 'basalt basalt'], 'polishedBasalt', 4);
    button({ n: 'stoneButton', key: 'stone_button', ko: '돌 버튼', t: ['stone'], hard: 0.5, aux: 10 }); R(['stone'], 'stoneButton', 1);
    add({ n: 'stonePlate', key: 'stone_pressure_plate', ko: '돌 압력판', t: ['stone'], hard: 0.5, tool: 1, shape: 5, hide: 0, lop: 0, solid: 0, model: 'plate', cat: 4, need: 'floor', plate: 1, aux: 1 }); R(['stone stone'], 'stonePlate', 1);
    add({ n: 'ironPlate', key: 'heavy_weighted_pressure_plate', ko: '무거운 압력판', t: ['blockIron'], hard: 0.5, tool: 1, shape: 5, hide: 0, lop: 0, solid: 0, model: 'plate', cat: 4, need: 'floor', plate: 1, aux: 3 }); R(['ingotIron ingotIron'], 'ironPlate', 1);
    add({ n: 'goldPlate', key: 'light_weighted_pressure_plate', ko: '가벼운 압력판', t: ['blockGold'], hard: 0.5, tool: 1, shape: 5, hide: 0, lop: 0, solid: 0, model: 'plate', cat: 4, need: 'floor', plate: 1, aux: 2 }); R(['ingotGold ingotGold'], 'goldPlate', 1);

    // ================================================================ 4. ores and mineral blocks
    stone('oreJade', 'jade_ore', '비취 광석', tex('oreJadeT', oreOn('stone', '3ac06a', 1)), { hard: 3, tier: 2, drop: 'jade', xp: 5 });
    stone('blockJade', 'jade_block', '비취 블록', tex('blockJadeT', pat(P.block, { a: '3ac06a', b: '208a48', c: '7ae0a0' })), { hard: 5, tier: 2, cat: 0 });
    R(['jade jade jade', 'jade jade jade', 'jade jade jade'], 'blockJade', 1); R(['blockJade'], 'jade', 9);
    stone('oreSpark', 'spark_ore', '불꽃가루 광석', tex('oreSparkT', oreOn('stone', 'e02020')), { hard: 3, tier: 2, drop: 'sparkDust', dropN: 4, xp: 3 });
    stone('blockSpark', 'spark_block', '불꽃가루 블록', tex('blockSparkT', pat(P.block, { a: 'c81414', b: '8a0a0a', c: 'f04040' })), { hard: 5, cat: 4, rs: 'block' });
    R(['sparkDust sparkDust sparkDust', 'sparkDust sparkDust sparkDust', 'sparkDust sparkDust sparkDust'], 'blockSpark', 1); R(['blockSpark'], 'sparkDust', 9);
    stone('blockCoal', 'coal_block', '석탄 블록', tex('blockCoalT', pat(P.block, { a: '1e1e1e', b: '0e0e0e', c: '3a3a3a' })), { hard: 5, fuel: 800 });
    R(['coal coal coal', 'coal coal coal', 'coal coal coal'], 'blockCoal', 1); R(['blockCoal'], 'coal', 9);
    stone('oreAshGold', 'ashen_gold_ore', '잿빛 금광석', tex('oreAshGoldT', oreOn('ashstone', 'f2d23a', 1)), { hard: 3, drop: 'goldNugget', dropN: 4, cat: 2 });
    stone('oreQuartz', 'quartz_ore', '석영 광석', tex('oreQuartzT', oreOn('ashstone', 'ece6dc')), { hard: 3, drop: 'quartz', xp: 3, cat: 2 });
    stone('blockAbyss', 'abyss_block', '심연철 블록', tex('blockAbyssT', pat(P.block, { a: '4a4250', b: '2e2830', c: '6a6070' })), { hard: 50, tier: 3, cat: 0 });
    R(['abyssIngot abyssIngot abyssIngot', 'abyssIngot abyssIngot abyssIngot', 'abyssIngot abyssIngot abyssIngot'], 'blockAbyss', 1); R(['blockAbyss'], 'abyssIngot', 9);
    for (const id of [10, 11, 12, 16, 40]) BLOCKS[id].cat = 2;
    BLOCKS[12].xp = 1; BLOCKS[16].xp = 5; BLOCKS[40].xp = 4;
    for (const id of [41, 42, 43, 44]) BLOCKS[id].cat = 0;

    // ================================================================ 5. ground and nature
    const dirtT = 'dirt';
    cube('coarseDirt', 'coarse_dirt', '거친 흙', tex('coarseDirtT', speck('7a5638', 51, 0.3, 0.2, 0.75, 1.2)), { hard: 0.5, tool: 3, cat: 2 });
    R(['dirt gravel', 'gravel dirt'], 'coarseDirt', 4);
    cube('podzol', 'podzol', '부엽토', [tex('podzolTop', speck('5a3e1c', 61, 0.3, 0.2, 0.8, 1.25)), tex('podzolSide', recolor('grassSide', { g: '5a3e1c', h: '4a3216' })), dirtT], { hard: 0.5, tool: 3, drop: 'dirt', cat: 2 });
    cube('mycelium', 'mycelium', '균사 흙', [tex('myceliumTop', speck('7a6a7e', 71, 0.3, 0.2, 0.85, 1.2)), tex('myceliumSide', recolor('grassSide', { g: '7a6a7e', h: '6a5a6e' })), dirtT], { hard: 0.6, tool: 3, drop: 'dirt', cat: 2 });
    cube('grassPath', 'grass_path', '흙길', [tex('pathTop', speck('9a8448', 81, 0.25, 0.2, 0.85, 1.12)), tex('pathSide', recolor('grassSide', { g: '9a8448', h: '8a7440' })), dirtT], { hard: 0.6, tool: 3, drop: 'dirt', cat: 2, shape: 5, model: 'path', hide: 0, lop: 0 });
    cube('farmland', 'farmland', '농지', [tex('farmTop', pat(['abababab', 'aaaaaaaa', 'babababa', 'aaaaaaaa', 'abababab', 'aaaaaaaa', 'babababa', 'aaaaaaaa'], { a: '5a3a1e', b: '4a2e16' })), dirtT, dirtT], { hard: 0.6, tool: 3, drop: 'dirt', cat: 2, shape: 5, model: 'path', hide: 0, lop: 0 });
    cube('farmlandWet', 'farmland_moist', '젖은 농지', [tex('farmWetTop', pat(['abababab', 'aaaaaaaa', 'babababa', 'aaaaaaaa', 'abababab', 'aaaaaaaa', 'babababa', 'aaaaaaaa'], { a: '3a2414', b: '2a1a0e' })), dirtT, dirtT], { hard: 0.6, tool: 3, drop: 'dirt', hidden: 1, item: 'farmland', shape: 5, model: 'path', hide: 0, lop: 0 });
    cube('magma', 'magma_block', '마그마 블록', tex('magmaT', pat(['abacabba', 'bcbbacab', 'abbcbbac', 'cabbacbb', 'bbacabcb', 'acbbcbab', 'bbcabbac', 'cabbacbb'], { a: 'ff7a1a', b: '6a2008', c: 'c84a10' })), { hard: 0.5, tool: 1, tier: 0, light: 3, hurt: 1, cat: 2 });
    R(['magmaCream magmaCream', 'magmaCream magmaCream'], 'magma', 1);
    cube('wailSand', 'wail_sand', '흐느낌 모래', tex('wailSandT', pat(['abaacaba', 'acbabaab', 'baadbaca', 'abdkdaab', 'acbdbcab', 'baabaacb', 'abcaabab', 'baabcaba'], { a: '5a4434', b: '4a362a', c: '6a5242', d: '3a2a20', k: '201410' })), { hard: 0.5, tool: 3, slow: 1, cat: 2 });
    cube('wailSoil', 'wail_soil', '흐느낌 흙', tex('wailSoilT', speck('4e3c30', 222, 0.3, 0.2, 0.8, 1.2)), { hard: 0.5, tool: 3, cat: 2 });
    cube('emberMoss', 'ember_moss', '잉걸 이끼', [tex('emberMossTop', speck('a01c1c', 233, 0.3, 0.2, 0.75, 1.25)), tex('emberMossSide', pat(['aaaaaaaa', 'aabaabaa', 'cacccacc', 'cccccccc', 'cdccccdc', 'cccccccc', 'ccdccccc', 'cccccccc'], { a: 'a01c1c', b: '7a1010', c: '6e4a44', d: '5a3a36' })), 'ashstone'], { hard: 0.4, tool: 1, tier: 0, drop: 'ashstone', cat: 2 });
    cube('indigoMoss', 'indigo_moss', '쪽빛 이끼', [tex('indigoMossTop', speck('168a82', 244, 0.3, 0.2, 0.75, 1.25)), tex('indigoMossSide', pat(['aaaaaaaa', 'aabaabaa', 'cacccacc', 'cccccccc', 'cdccccdc', 'cccccccc', 'ccdccccc', 'cccccccc'], { a: '168a82', b: '0e6a64', c: '6e4a44', d: '5a3a36' })), 'ashstone'], { hard: 0.4, tool: 1, tier: 0, drop: 'ashstone', cat: 2 });
    cube('shroomLantern', 'shroom_lantern', '버섯등', tex('shroomT', pat(['abcabcab', 'bcaabcba', 'cabbcaac', 'abcacbba', 'bacbaacb', 'cbaacbab', 'abbcabca', 'bcaabcab'], { a: 'f0a050', b: 'ffd080', c: 'd88030' })), { hard: 1, light: 15, cat: 2 });
    const boneT = tex('boneSide', pat(P.pillarSide, { a: 'e6e0c8', b: 'c0b898', c: 'f4f0e0' }));
    cube('boneBlock', 'bone_block', '뼈 블록', [tex('boneTop', pat(P.pillarTop, { a: 'e6e0c8', b: 'c0b898', c: 'd0c8a8' })), boneT, 'boneTop'], { hard: 2, tool: 1, tier: 0, cat: 2 });
    R(['boneMeal boneMeal boneMeal', 'boneMeal boneMeal boneMeal', 'boneMeal boneMeal boneMeal'], 'boneBlock', 1); R(['boneBlock'], 'boneMeal', 9);
    cube('hayBale', 'hay_block', '건초 더미', [tex('hayTop', pat(P.pillarTop, { a: 'c8a428', b: '8a7018', c: 'a88a20' })), tex('haySide', pat(['abaacaba', 'aaaaaaaa', 'kkkkkkkk', 'abacabaa', 'aabaacab', 'kkkkkkkk', 'aaaaaaaa', 'abaacaba'], { a: 'c8a428', b: 'a88a20', c: 'd8b838', k: '7a3a10' })), 'hayTop'], { hard: 0.5, cat: 2, tool: 5, soft: 1 });
    R(['wheat wheat wheat', 'wheat wheat wheat', 'wheat wheat wheat'], 'hayBale', 1); R(['hayBale'], 'wheat', 9);
    cube('melon', 'melon', '수박', [tex('melonTop', pat(P.logTop, { a: '7aa832', b: '5a8a22', c: '6a9a2a' })), tex('melonSide', pat(['abacabac', 'abacabac', 'abacabac', 'abacabac', 'abacabac', 'abacabac', 'abacabac', 'abacabac'], { a: '6a9a2a', b: '4a7a1a', c: '8ab840' })), 'melonTop'], { hard: 1, tool: 2, drop: 'melonSlice', dropN: 5, cat: 2 });
    R(['melonSlice melonSlice melonSlice', 'melonSlice melonSlice melonSlice', 'melonSlice melonSlice melonSlice'], 'melon', 1);
    const pk = { a: 'd8841a', b: 'b06a10', c: 'e89a30' };
    const pkTop = tex('pumpkinTop', pat(['bbbaabbb', 'baaccaab', 'acaaaaca', 'aaa22aaa'.replace(/2/g, 'g'), 'aaaggaaa', 'acaaaaca', 'baaccaab', 'bbbaabbb'], { ...pk, g: '5a6a1a' }));
    const pkSide = tex('pumpkinSide', pat(['abacabac', 'abaaabac', 'abacabac', 'abacabac', 'abacabac', 'abacabac', 'abaaabac', 'abacabac'], pk));
    cube('pumpkin', 'pumpkin', '호박', [pkTop, pkSide, pkTop], { hard: 1, tool: 2, cat: 2 });
    cube('carvedPumpkin', 'carved_pumpkin', '조각한 호박', [pkTop, pkSide, pkTop], { hard: 1, tool: 2, cat: 1, t6: [pkSide, pkSide, pkTop, pkTop, pkSide, tex('pumpkinFace', pat(['abacabac', 'akkaakka', 'akkaakka', 'abacabac', 'akkkkkka', 'abkkkkac', 'abacabac', 'abacabac'], { ...pk, k: '3a2008' }))] });
    cube('pumpkinLantern', 'pumpkin_lantern', '호박등', [pkTop, pkSide, pkTop], { hard: 1, tool: 2, cat: 1, light: 15, t6: [pkSide, pkSide, pkTop, pkTop, pkSide, tex('pumpkinLit', pat(['abacabac', 'akkaakka', 'akkaakka', 'abacabac', 'akkkkkka', 'abkkkkac', 'abacabac', 'abacabac'], { ...pk, k: 'ffd040' }))] });
    R(['carvedPumpkin', 'torch'], 'pumpkinLantern', 1);
    cube('sponge', 'sponge', '스펀지', tex('spongeT', pat(['abacabac', 'cakacaka', 'abacabac', 'kacakaca', 'abacabac', 'cakacaka', 'abacabac', 'kacakaca'], { a: 'd8c84a', b: 'c8b83a', c: 'e8d860', k: 'a89a2a' })), { hard: 0.6, cat: 2, sponge: 1 });
    cube('wetSponge', 'wet_sponge', '젖은 스펀지', tex('wetSpongeT', pat(['abacabac', 'cakacaka', 'abacabac', 'kacakaca', 'abacabac', 'cakacaka', 'abacabac', 'kacakaca'], { a: 'a8a040', b: '989030', c: 'b8b050', k: '6a6a2a' })), { hard: 0.6, cat: 2 });
    S('wetSponge', 'sponge');
    cube('cobweb', 'cobweb', '거미줄', tex('cobwebT', pat(['w...w..w', '.w..w.w.', '..wwww..', 'wwwwwwww', '..wwww..', '.w.w..w.', 'w..w...w', '...w....'], { w: 'e8e8e8' })), { hard: 4, tool: 6, shape: 1, slow: 2, drop: 'string', cat: 1 });
    const capB = tex('capBrownT', speck('8e6a4e', 300, 0.25, 0.2, 0.85, 1.12)), capR = tex('capRedT', pat(['aaaaaaaa', 'awwaaaaa', 'awwaaawa', 'aaaaaaaa', 'aaawwaaa', 'aaawwaaa', 'awaaaaaw', 'aaaaaaaa'], { a: 'c42c2c', w: 'f0f0e8' }));
    const stemT = tex('mushStemT', pat(P.stripSide, { a: 'e8e0cc', b: 'd4ccb8' }));
    cube('mushBrownBlock', 'brown_mushroom_block', '갈색 버섯 블록', capB, { hard: 0.2, tool: 2, drop: 'mushBrown', cat: 2 });
    cube('mushRedBlock', 'red_mushroom_block', '빨간 버섯 블록', capR, { hard: 0.2, tool: 2, drop: 'mushRed', cat: 2 });
    cube('mushStem', 'mushroom_stem', '버섯 자루', [tex('mushPoreT', speck('d4ccb8', 301, 0.3, 0, 0.9, 1)), stemT, 'mushPoreT'], { hard: 0.2, tool: 2, drop: 'none', cat: 2 });
    cube('kelpBlock', 'dried_kelp_block', '말린 다시마 블록', tex('kelpBlockT', pat(P.stripSide, { a: '2e3a22', b: '1e2a16' })), { hard: 0.5, fuel: 200, cat: 1 });
    R(['driedKelp driedKelp driedKelp', 'driedKelp driedKelp driedKelp', 'driedKelp driedKelp driedKelp'], 'kelpBlock', 1);
    const hc = { a: 'e8a020', b: 'c07a10', c: 'f8c050' };
    cube('honeycombBlock', 'honeycomb_block', '벌집 조각 블록', tex('combT', pat(['abaabaab', 'baccabcc', 'abaabaab', 'aabaabaa', 'abccbacc', 'aabaabaa', 'abaabaab', 'baccabcc'], hc)), { hard: 0.6, cat: 1 });
    R(['honeycomb honeycomb', 'honeycomb honeycomb'], 'honeycombBlock', 1);
    cube('beeNest', 'bee_nest', '벌 둥지', [tex('nestTop', pat(P.logTop, { a: 'd8a848', b: 'b88a30', c: 'e8c060' })), tex('nestSide', pat(['abaabaab', 'aaaaaaaa', 'bbbbbbbb', 'aaakkaaa', 'aaakkaaa', 'bbbbbbbb', 'aaaaaaaa', 'abaabaab'], { a: 'd8a848', b: 'b88a30', k: '3a2810' })), 'nestTop'], { hard: 0.3, tool: 2, cat: 2, drop: 'honeycomb', dropN: 3 });
    cube('beehive', 'beehive', '양봉 상자', [tex('hiveTop', pat(P.planks, { a: 'b8944e', b: '9a7a3a', c: 'c8a45e' })), tex('hiveSide', pat(['bbbbbbbb', 'aaaaaaaa', 'aaaaaaaa', 'aaakkaaa', 'aaakkaaa', 'cccccccc', 'aaaaaaaa', 'bbbbbbbb'], { a: 'b8944e', b: '8a6a2a', c: 'e8a020', k: '3a2810' })), 'hiveTop'], { hard: 0.6, tool: 2, cat: 3 });
    R(['#planks #planks #planks', 'honeycomb honeycomb honeycomb', '#planks #planks #planks'], 'beehive', 1);
    cube('honeyBlock', 'honey_block', '꿀 블록', tex('honeyT', pat(['cccccccc', 'caaaaaab', 'caabaaab', 'caaaaaab', 'caaaabab', 'caaaaaab', 'cabaaaab', 'bbbbbbbb'], { a: 'f0a830', b: 'd88a18', c: 'f8c860' })), { hard: 0, shape: 5, model: 'honey', hide: 0, lop: 0, slow: 1, cat: 4 });
    cube('jellyBlock', 'jelly_block', '탄성 블록', tex('jellyT', pat(['cccccccc', 'caaaaaab', 'cabbbbab', 'cabaabab', 'cabaabab', 'cabbbbab', 'caaaaaab', 'bbbbbbbb'], { a: '7ad060', b: '4a9a38', c: 'a8f090' })), { hard: 0, bounce: 1, cat: 4, lop: 0 });
    R(['jellyBall jellyBall jellyBall', 'jellyBall jellyBall jellyBall', 'jellyBall jellyBall jellyBall'], 'jellyBlock', 1); R(['jellyBlock'], 'jellyBall', 9);
    cube('packedIce', 'packed_ice', '단단한 얼음', tex('packedIceT', speck('8ab4e8', 400, 0.25, 0.2, 0.9, 1.1)), { hard: 0.5, tool: 1, drop: 'none', slip: 1, cat: 2 });
    R(['ice ice ice', 'ice ice ice', 'ice ice ice'], 'packedIce', 1);
    cube('blueIce', 'blue_ice', '푸른 얼음', tex('blueIceT', speck('74a8f8', 401, 0.25, 0.2, 0.88, 1.12)), { hard: 2.8, tool: 1, drop: 'none', slip: 2, cat: 2 });
    R(['packedIce packedIce packedIce', 'packedIce packedIce packedIce', 'packedIce packedIce packedIce'], 'blueIce', 1);
    BLOCKS[33].slip = 1;
    add({ n: 'snowLayer', key: 'snow', ko: '눈', t: ['snowTop'], hard: 0.1, tool: 3, shape: 5, model: 'snow_layer', hide: 0, lop: 0, solid: 0, drop: 'snowball', cat: 2, need: 'below' });
    old(45, 'snow_block', null, 2, { drop: 'snowball', dropN: 4 });
    R(['snowball snowball', 'snowball snowball'], 45, 1); R(['snowBlock snowBlock snowBlock'], 'snowLayer', 6);
    stone('glintObsidian', 'glint_obsidian', '빛나는 흑요석', tex('glintObsT', oreOn('obsidian', 'b048f0', 1)), { hard: 50, tier: 3, light: 10, cat: 2 });
    old(34, 'obsidian', null, 0); old(2, 'grass_block', '잔디 블록', 2); old(3, 'dirt', null, 2); old(8, 'sand', null, 2); old(9, 'gravel', null, 2); old(22, 'clay', null, 2);
    old(20, 'snowy_grass_block', null, 2); old(19, 'cactus', null, 2, { shape: 5, model: 'cactus', hide: 0, lop: 0 }); old(33, 'ice', null, 2); old(35, 'lava', null, 2, { hidden: 1 }); old(7, 'water', null, 2, { hidden: 1 });
    old(6, 'bedrock', null, 0); old(48, 'ashstone', null, 2); old(49, 'ash_sand', null, 2); old(50, 'glow_crystal', null, 1, { drop: 'glowDust', dropN: 3 }); old(51, 'fire_stone_ore', null, 2);
    old(59, 'ashen_debris', null, 2); old(60, 'ruin_bricks', null, 0); old(47, 'fire_veil', null, 3, { hidden: 1 }); old(56, 'void_gate', null, 3, { hidden: 1 }); old(63, 'far_gate', null, 3, { hidden: 1 });
    old(57, 'ward_crystal', null, 3); old(61, 'gate_frame', null, 3); old(62, 'gate_frame_eye', null, 3, { hidden: 1 });
    old(10, 'gold_ore', null, 2); old(11, 'iron_ore', null, 2); old(12, 'coal_ore', null, 2); old(16, 'diamond_ore', null, 2); old(40, 'lapis_ore', null, 2);
    old(41, 'iron_block', null, 0); old(42, 'gold_block', null, 0); old(43, 'diamond_block', null, 0); old(44, 'lapis_block', null, 0);
    old(15, 'glass', null, 1); old(17, 'crafting_table', null, 3, { use: 'craft' }); old(18, 'furnace', null, 3, { use: 'furnace' }); old(37, 'chest', null, 3, { use: 'chest', shape: 5, model: 'chestm', hide: 0, lop: 0 });
    old(58, 'smithing_table', null, 3, { use: 'smith' }); old(64, 'shell_box', null, 3, { use: 'shell', st: 1 });
    old(27, 'torch', null, 1); old(28, 'grass', '풀', 2); old(29, 'poppy', '양귀비', 2); old(30, 'dandelion', '민들레', 2); old(46, 'dead_bush', null, 2);
    BLOCKS[29].dye = 'redDye'; BLOCKS[30].dye = 'yellowDye';

    // ================================================================ 6. plants
    const G = '4b8a2c', G2 = '3a7020';
    const flowers = [
        ['orchid', 'blue_orchid', '파란 난초', 'orchid', '2a9ae0', '1a6ab0', 'lightBlueDye'], ['allium', 'allium', '부추꽃', 'ball', 'b05ad8', '8a3ab0', 'magentaDye'],
        ['bluet', 'azure_bluet', '꽃잔디', 'small', 'e8e8f0', 'f0d040', 'lightGrayDye'], ['tulipRed', 'red_tulip', '빨간 튤립', 'tulip', 'd82a2a', 'a01a1a', 'redDye'],
        ['tulipOrange', 'orange_tulip', '주황 튤립', 'tulip', 'f08a20', 'c06a10', 'orangeDye'], ['tulipWhite', 'white_tulip', '흰 튤립', 'tulip', 'f0f0f0', 'c8c8c8', 'lightGrayDye'],
        ['tulipPink', 'pink_tulip', '분홍 튤립', 'tulip', 'f0a0c0', 'd07898', 'pinkDye'], ['daisy', 'oxeye_daisy', '데이지', 'daisy', 'f4f4f4', 'f0c020', 'lightGrayDye'],
        ['cornflower', 'cornflower', '수레국화', 'ball', '4a6ae0', '2a4ab0', 'blueDye'], ['lilyValley', 'lily_of_the_valley', '은방울꽃', 'bells', 'f4f4f4', 'd8d8d8', 'whiteDye'],
        ['blackRose', 'black_rose', '흑장미', 'rose', '2a1a22', '120a10', 'blackDye'], ['sunflower', 'sunflower', '해바라기', 'big', 'f8d020', '8a5a10', 'yellowDye'],
        ['lilac', 'lilac', '라일락', 'tall', 'c890d8', 'a070b8', 'magentaDye'], ['peony', 'peony', '작약', 'tall', 'f0b0d0', 'd890b0', 'pinkDye'],
        ['roseBush', 'rose_bush', '장미 덤불', 'rose', 'd02020', '901010', 'redDye'], ['hydrangea', 'hydrangea', '수국', 'ball', '7aa8f0', '5a88d0', 'lightBlueDye'],
        ['cosmos', 'cosmos', '코스모스', 'daisy', 'f080b0', 'f0d040', 'pinkDye'],
    ];
    for (const [n, key, ko, f, c1, c2, dye] of flowers) {
        const g = FLOWER[f];
        const p = { p: c1, q: c2, w: c1, y: c2, o: c2, g: G };
        add({ n, key, ko, t: [tex(n + 'T', plant(g, p))], hard: 0, shape: 1, cat: 2, need: 'soil', dye, flower: 1 });
        R([n], dye, f === 'big' || f === 'tall' || n === 'roseBush' ? 2 : 1);
    }
    R(['flowerRed'], 'redDye', 1); R(['flowerYellow'], 'yellowDye', 1);
    add({ n: 'fern', key: 'fern', ko: '고사리', t: [tex('fernT', plant(['........', '.g...g..', '..g.g...', 'g.ggg.g.', '.g.g.g..', '..ggg...', '...g....', '...g....'], { g: '4a7a3a' }))], hard: 0, shape: 1, cat: 2, drop: 'none', need: 'soil' });
    add({ n: 'reed', key: 'reeds', ko: '갈대', t: [tex('reedT', plant(['..g..g..', '..g..g..', '..h..g..', '..g..h..', '.gg..g..', '..g..gg.', '..h..g..', '..g..g..'], { g: '8ac050', h: '6a9a38' }))], hard: 0, shape: 1, cat: 2, need: 'reed', reed: 1 });
    add({ n: 'bamboo', key: 'bamboo', ko: '대나무', t: [tex('bambooT', pat(['abababab', 'aaaaaaaa', 'cccccccc', 'abababab', 'aaaaaaaa', 'aaaaaaaa', 'cccccccc', 'abababab'], { a: '6aa83a', b: '5a9030', c: '4a7a28' }))], hard: 1, tool: 2, shape: 5, model: 'bamboo', hide: 0, lop: 0, cat: 2, need: 'reed', reed: 1, fuel: 2 });
    add({ n: 'kelp', key: 'kelp', ko: '다시마', t: [tex('kelpT', plant(['..g.....', '...g.h..', '..gg....', '.h.g....', '...gg...', '..g..h..', '...g....', '..gg....'], { g: '4a8a3a', h: '6aa848' }))], hard: 0, shape: 1, cat: 2, water: 1, drop: 'kelpItem' });
    add({ n: 'seagrass', key: 'seagrass', ko: '해초', t: [tex('seagrassT', plant(['........', '.g...g..', '.g..g...', '..g.g.g.', '..g.gg..', '.gg.g...', '..ggg...', '...g....'], { g: '3a8a3a' }))], hard: 0, shape: 1, cat: 2, water: 1, drop: 'none' });
    add({ n: 'lilyPad', key: 'lily_pad', ko: '연잎', t: [tex('lilyT', pat(['..aaaa..', '.aabaaa.', 'aabaaaab', 'aaaab..b', 'abaaa...', 'aaaaaaba', '.aabaaa.', '..aaaa..'].map(r => r), { a: '2a7a2a', b: '1a5a1a' }))], hard: 0, shape: 5, model: 'lily', hide: 0, lop: 0, cat: 2, need: 'water' });
    add({ n: 'vines', key: 'vine', ko: '덩굴', t: [tex('vineT', plant(['g..g..g.', '.g..gg..', 'g.g...g.', '..g.g..g', '.g...g..', 'g..g..g.', '..gg..g.', '.g..g...'], { g: '3a7a2a' }))], hard: 0.2, tool: 6, shape: 1, cat: 2, climb: 1, drop: 'none', need: 'any' });
    add({ n: 'mushBrown', key: 'brown_mushroom', ko: '갈색 버섯', t: [tex('mushBrownT', plant(['........', '........', '..bbbb..', '.bbbbbb.', '...ww...', '...ww...', '...ww...', '........'], { b: '8e6a4e', w: 'e8e0cc' }))], hard: 0, shape: 1, cat: 2, light: 1, need: 'dark' });
    add({ n: 'mushRed', key: 'red_mushroom', ko: '빨간 버섯', t: [tex('mushRedT', plant(['........', '........', '..rrrr..', '.rwrrwr.', '...ww...', '...ww...', '...ww...', '........'], { r: 'c42c2c', w: 'f0f0e8' }))], hard: 0, shape: 1, cat: 2, need: 'dark' });
    add({ n: 'emberRoots', key: 'ember_roots', ko: '잉걸 뿌리', t: [tex('emberRootsT', plant(['........', '.r...r..', '..r.r...', '.r.rr.r.', '..rrr...', '..r.r...', '...r....', '...r....'], { r: 'b0283a' }))], hard: 0, shape: 1, cat: 2, need: 'ashen', drop: 'none' });
    add({ n: 'indigoRoots', key: 'indigo_roots', ko: '쪽빛 뿌리', t: [tex('indigoRootsT', plant(['........', '.r...r..', '..r.r...', '.r.rr.r.', '..rrr...', '..r.r...', '...r....', '...r....'], { r: '1aa098' }))], hard: 0, shape: 1, cat: 2, need: 'ashen', drop: 'none' });
    add({ n: 'ashSprouts', key: 'ashen_sprouts', ko: '잿빛 새싹', t: [tex('sproutT', plant(['........', '........', '.g..g...', '..g.g.g.', '.g.gg...', '..ggg.g.', '...gg...', '...g....'], { g: '2ab0a0' }))], hard: 0, shape: 1, cat: 2, need: 'ashen', drop: 'none' });
    add({ n: 'emberVines', key: 'weeping_vines', ko: '늘어진 덩굴', t: [tex('emberVineT', plant(['.r..r...', '..r.r...', '.r..rr..', '..r..r..', '..rr.r..', '...r.r..', '..r..r..', '..r.r...'], { r: '9a1a2a' }))], hard: 0, shape: 1, cat: 2, climb: 1, drop: 'none', need: 'any' });
    add({ n: 'indigoVines', key: 'twisting_vines', ko: '꼬인 덩굴', t: [tex('indigoVineT', plant(['..g.g...', '.g..g...', '.gg..g..', '..g.g...', '..g..g..', '.g..gg..', '..g.g...', '..gg....'], { g: '1aa898' }))], hard: 0, shape: 1, cat: 2, climb: 1, drop: 'none', need: 'any' });
    add({ n: 'berryBush', key: 'sweet_berry_bush', ko: '달콤한 열매 덤불', t: [tex('berryT', plant(['........', '.g.r.g..', 'gggggrg.', '.grgggg.', 'ggggrgg.', '.gggggg.', '..g.gg..', '...g....'], { g: '2e5a2a', r: 'd02040' }))], hard: 0, shape: 1, cat: 2, need: 'soil', slow: 1, hurt: 1, drop: 'berries' });
    add({ n: 'seaPickle', key: 'sea_pickle', ko: '바다 반딧불', t: [tex('pickleT', pat(['ccaaaacc', 'caaaaaac', 'aabaabaa', 'aaaaaaaa', 'aabaabaa', 'aaaaaaaa', 'caaaaaac', 'ccaaaacc'], { a: '6a8a2a', b: '4a6a1a', c: '8aa83a' }))], hard: 0, shape: 5, model: 'pickle', hide: 0, lop: 0, light: 9, cat: 2, need: 'below' });
    // crops: four stages each (the first three hidden)
    const crop = (n, key, ko, cols, drop, seed) => {
        const st = [['........', '........', '........', '........', '........', '..g..g..', '.g.gg.g.', 'g.g..g.g'],
            ['........', '........', '........', '..g..g..', '.g.g.g..', '..g.gg..', '.g.gg.g.', 'g.g..g.g'],
            ['........', '..g..g..', '.g.g.g..', '..g.gg..', '.g.g.g..', '..g.gg..', '.g.gg.g.', 'g.g..g.g'],
            ['.y..y..y', '.yy.y.yy', '..y.y.y.', '.g.gyg..', '..g.gg..', '..g.gg..', '.g.gg.g.', 'g.g..g.g']];
        const L = st.map((g, i) => ({ t: [tex(n + 'T' + i, plant(g, { g: i === 3 ? cols[1] : cols[0], y: cols[2] }))], v: i ? `${i}` : undefined, crop: i, drop: i === 3 ? drop : seed, dropN: 1 }));
        return variants({ n, key, ko, hard: 0, shape: 1, cat: 2, need: 'farm', hiddenAll: 1, hidden: 1 }, L);
    };
    crop('wheatCrop', 'wheat', '밀', ['5aa030', 'b8a040', 'd8b850'], 'wheat', 'wheatSeeds');
    crop('carrotCrop', 'carrots', '당근', ['4a9a30', '4a9a30', 'f08a20'], 'carrot', 'carrot');
    crop('potatoCrop', 'potatoes', '감자', ['4a9a30', '4a9a30', 'c8a058'], 'potato', 'potato');
    crop('beetCrop', 'beetroots', '비트', ['4a9a30', '5a8a30', 'a01a3a'], 'beetroot', 'beetSeeds');
    // fire
    add({ n: 'fire', key: 'fire', ko: '불', t: [tex('fireT', plant(['...y....', '..yo..y.', '.yooy.o.', '.oooyoo.', 'yoroooy.', 'ororrooy', 'orrrrroo', 'rrrrrrrr'], { y: 'ffe060', o: 'ff9a20', r: 'e04010' }))], hard: 0, shape: 1, solid: 0, light: 15, hurt: 2, drop: 'none', cat: 2, hidden: 1, fire: 1 });
    add({ n: 'wailFire', key: 'wail_fire', ko: '흐느낌 불', t: [tex('wailFireT', plant(['...y....', '..yo..y.', '.yooy.o.', '.oooyoo.', 'yoroooy.', 'ororrooy', 'orrrrroo', 'rrrrrrrr'], { y: 'c0fff8', o: '40e0e0', r: '1890a0' }))], hard: 0, shape: 1, solid: 0, light: 10, hurt: 2, drop: 'none', cat: 2, hidden: 1, fire: 2 });

    // ================================================================ 7. coral
    const CORAL = [['tube', '대롱', '3050d0'], ['brain', '주름', 'd05090'], ['bubble', '방울', 'a030c0'], ['fire', '불꽃', 'd03030'], ['horn', '뿔', 'e0c030']];
    const dead = '8a8682';
    for (const [k, ko, c] of CORAL) {
        const blk = (col, s) => pat(['abacabca', 'cabaacab', 'abcabaca', 'baacabab', 'acabcaba', 'cabaabca', 'abacacab', 'bacabaca'], { a: col, b: shade(col, 0.78), c: shade(col, 1.2) });
        const cor = (col) => plant(['........', '.a..a.a.', '..aa.a..', '.a.aa..a', '..a.aaa.', '...aa...', '...a....', '..aa....'], { a: col });
        const fan = (col) => plant(['........', '........', '.a.a.a..', 'a.aaa.a.', '.aaaaa..', '..aaa...', '...a....', '...a....'], { a: col });
        const live = cube(k + 'CoralBlock', `${k}_coral_block`, `${ko} 산호 블록`, tex(k + 'CoralBT', blk(c)), { hard: 1.5, tool: 1, tier: 0, cat: 2 });
        const dd = cube('dead' + k + 'CoralBlock', `dead_${k}_coral_block`, `죽은 ${ko} 산호 블록`, tex('dead' + k + 'CoralBT', blk(dead)), { hard: 1.5, tool: 1, tier: 0, cat: 2 });
        live.dies = dd.n;
        add({ n: k + 'Coral', key: `${k}_coral`, ko: `${ko} 산호`, t: [tex(k + 'CoralT', cor(c))], hard: 0, shape: 1, cat: 2, water: 1, drop: 'none' });
        add({ n: 'dead' + k + 'Coral', key: `dead_${k}_coral`, ko: `죽은 ${ko} 산호`, t: [tex('dead' + k + 'CoralT', cor(dead))], hard: 0, shape: 1, cat: 2, drop: 'none' });
        add({ n: k + 'Fan', key: `${k}_coral_fan`, ko: `${ko} 산호 부채`, t: [tex(k + 'FanT', fan(c))], hard: 0, shape: 1, cat: 2, water: 1, drop: 'none' });
        add({ n: 'dead' + k + 'Fan', key: `dead_${k}_coral_fan`, ko: `죽은 ${ko} 산호 부채`, t: [tex('dead' + k + 'FanT', fan(dead))], hard: 0, shape: 1, cat: 2, drop: 'none' });
    }

    // ================================================================ 8. things that work
    const tc = (n, g, p) => tex(n, pat(g, p));
    const metal = { a: 'a8a8a8', b: '6a6a6a', c: 'd0d0d0', k: '3a3a3a' };
    const fs = BLOCKS[18].t;
    stone('blastFurnace', 'blast_furnace', '용광로', [tc('blastTop', P.polished, { a: '6a6a6a', b: '4a4a4a', c: '8a8a8a' }), tc('blastSide', ['cccccccc', 'aaaaaaaa', 'abkkkkba', 'abkrrkba', 'abkkkkba', 'aaaaaaaa', 'bbbbbbbb', 'cccccccc'], { a: '7c7c7c', b: '5c5c5c', c: '9a9a9a', k: '2a2a2a', r: '4a4a4a' }), 'blastTop'], { hard: 3.5, cat: 3, use: 'furnace', fast: 1 });
    R(['ingotIron ingotIron ingotIron', 'ingotIron furnace ingotIron', 'smoothStone smoothStone smoothStone'], 'blastFurnace', 1);
    stone('smoker', 'smoker', '훈연기', [tc('smokerTop', P.logTop, { a: '6a5a4a', b: '4a3a2a', c: '3a3a3a' }), tc('smokerSide', ['bbbbbbbb', 'aaaaaaaa', 'abkkkkba', 'abkkkkba', 'abkkkkba', 'aaaaaaaa', 'cccccccc', 'bbbbbbbb'], { a: '6b5233', b: '3a2a18', c: '7c7c7c', k: '1a1a1a' }), 'smokerTop'], { hard: 3.5, cat: 3, use: 'furnace', fast: 2 });
    R(['_ #logs _', '#logs furnace #logs', '_ #logs _'], 'smoker', 1);
    void fs;
    cube('barrel', 'barrel', '통', [tc('barrelTop', ['bbbbbbbb', 'baaaaaab', 'baakkaab', 'bakkkkab', 'bakkkkab', 'baakkaab', 'baaaaaab', 'bbbbbbbb'], { a: '8a6a3a', b: '5a4222', k: '3a2810' }), tc('barrelSide', ['abaaabaa', 'abaaabaa', 'kkkkkkkk', 'abaaabaa', 'abaaabaa', 'kkkkkkkk', 'abaaabaa', 'abaaabaa'], { a: '8a6a3a', b: '6a5028', k: '3a3a3a' }), 'barrelTop'], { hard: 2.5, tool: 2, cat: 3, use: 'chest', fuel: 15 });
    R(['#planks slabWood #planks', '#planks _ #planks', '#planks slabWood #planks'].map(r => r.replace(/slabWood/g, 'oakSlab')), 'barrel', 1);
    cube('bookshelf', 'bookshelf', '책장', ['planks', tc('bookshelfT', ['aaaaaaaa', 'rbgkybrg', 'rbgkybrg', 'aaaaaaaa', 'gyrbkgyb', 'gyrbkgyb', 'aaaaaaaa', 'aaaaaaaa'], { a: 'a7834f', r: '8a2020', b: '2a3a8a', g: '2a6a2a', k: '5a3a1a', y: 'b8a030' }), 'planks'], { hard: 1.5, tool: 2, cat: 1, drop: 'book', dropN: 3, fuel: 15 });
    R(['#planks #planks #planks', 'book book book', '#planks #planks #planks'], 'bookshelf', 1);
    cube('lectern', 'lectern', '독서대', [tc('lecternTop', P.door, { a: 'b8944e', b: '8a6a2a', c: 'c8a45e' }), 'planks', 'planks'], { hard: 2.5, tool: 2, shape: 5, model: 'lectern', hide: 0, lop: 0, cat: 3, use: 'sign' });
    R(['oakSlab oakSlab oakSlab', '_ bookshelf _', '_ oakSlab _'], 'lectern', 1);
    cube('loom', 'loom', '베틀', [tc('loomTop', ['bbbbbbbb', 'baaaaaab', 'bwwwwwwb', 'baaaaaab', 'bwwwwwwb', 'baaaaaab', 'bwwwwwwb', 'bbbbbbbb'], { a: 'a7834f', b: '6b5233', w: 'e8e8e8' }), tc('loomSide', P.door, { a: 'a7834f', b: '6b5233', c: 'b8945d' }), 'planks'], { hard: 2.5, tool: 2, cat: 3, use: 'craft', fuel: 15 });
    R(['string string', '#planks #planks'], 'loom', 1);
    cube('cartography', 'cartography_table', '지도 제작대', [tc('cartoTop', ['bbbbbbbb', 'bwwwwwwb', 'bwkwwkwb', 'bwwkwwwb', 'bwwwkwwb', 'bwkwwwwb', 'bwwwwwwb', 'bbbbbbbb'], { b: '5a4222', w: 'e8dcc0', k: '6a4a2a' }), tc('cartoSide', P.door, { a: '8a6a3a', b: '4a3218', c: '9a7a4a' }), 'planks'], { hard: 2.5, tool: 2, cat: 3, use: 'craft', fuel: 15 });
    R(['paper paper', '#planks #planks', '#planks #planks'], 'cartography', 1);
    cube('fletching', 'fletching_table', '화살 제작대', [tc('fletchTop', ['bbbbbbbb', 'baaaaaab', 'bakaaaab', 'baakaaab', 'baaakaab', 'baaaakab', 'baaaaaab', 'bbbbbbbb'], { a: 'c8b07a', b: '8a6a3a', k: '5a4a3a' }), tc('fletchSide', P.door, { a: 'c8b07a', b: '8a6a3a', c: 'd8c08a' }), 'planks'], { hard: 2.5, tool: 2, cat: 3, use: 'craft', fuel: 15 });
    R(['flint flint', '#planks #planks', '#planks #planks'], 'fletching', 1);
    cube('grindstone', 'grindstone', '숫돌', tc('grindT', P.polished, { a: '8a8a8a', b: '5a5a5a', c: 'a8a8a8' }), { hard: 2, tool: 1, shape: 5, model: 'grindstone', hide: 0, lop: 0, cat: 3, use: 'repair' });
    R(['stick stoneSlab stick', '#planks _ #planks'], 'grindstone', 1);
    tc('bladeT', ['........', '........', 'kkkkkkkk', 'kaaaaaak', 'kaaaaaak', 'kkkkkkkk', '........', '........'], metal);
    cube('stonecutter', 'stonecutter', '석재 절단기', [tc('cutterTop', P.polished, { a: '7a7a7a', b: '5a5a5a', c: '9a9a9a' }), tc('cutterSide', ['cccccccc', 'aaaaaaaa', 'bbbbbbbb', 'aaaaaaaa', 'aaaaaaaa', 'aaaaaaaa', 'aaaaaaaa', 'bbbbbbbb'], { a: '8a6a3a', b: '5a4222', c: '9a9a9a' }), 'cutterTop'], { hard: 3.5, tool: 1, shape: 5, model: 'stonecutter', hide: 0, lop: 0, cat: 3, use: 'craft' });
    R(['_ ingotIron _', 'stone stone stone'], 'stonecutter', 1);
    cube('composter', 'composter', '퇴비통', [tc('compTop', P.planks, { a: '6a4a20', b: '4a3210', c: '8a6a30' }), tc('compSide', P.planks, { a: '9a7a40', b: '6a5228', c: 'aa8a50' }), 'compTop'], { hard: 0.6, tool: 2, shape: 5, model: 'cauldron', hide: 0, lop: 0, cat: 3, use: 'compost', fuel: 15 });
    R(['oakSlab _ oakSlab', 'oakSlab _ oakSlab', 'oakSlab oakSlab oakSlab'], 'composter', 1);
    cube('cauldron', 'cauldron', '가마솥', tc('cauldronT', P.polished, { a: '4a4a4a', b: '2a2a2a', c: '5a5a5a' }), { hard: 2, tool: 1, tier: 0, shape: 5, model: 'cauldron', hide: 0, lop: 0, cat: 3 });
    R(['ingotIron _ ingotIron', 'ingotIron _ ingotIron', 'ingotIron ingotIron ingotIron'], 'cauldron', 1);
    const anv = tc('anvilT', P.polished, { a: '4a4a4a', b: '2e2e2e', c: '5e5e5e' });
    cube('anvil', 'anvil', '모루', anv, { hard: 5, tool: 1, tier: 0, shape: 5, model: 'anvil', hide: 0, lop: 0, cat: 3, use: 'repair', fall: 1 });
    cube('anvilChipped', 'chipped_anvil', '금 간 모루', tc('anvilCT', P.cracked, { a: '4a4a4a', b: '2a2a2a', c: '5e5e5e' }), { hard: 5, tool: 1, tier: 0, shape: 5, model: 'anvil', hide: 0, lop: 0, cat: 3, use: 'repair', fall: 1 });
    cube('anvilDamaged', 'damaged_anvil', '부서져 가는 모루', tc('anvilDT', ['aaacaaab', 'aaabaaab', 'aacbaaab', 'bbbbbbbb', 'aabbbbaa', 'acbbaabc', 'aaabaaba', 'bbbbbbbb'], { a: '4a4a4a', b: '1e1e1e', c: '5e5e5e' }), { hard: 5, tool: 1, tier: 0, shape: 5, model: 'anvil', hide: 0, lop: 0, cat: 3, use: 'repair', fall: 1 });
    R(['blockIron blockIron blockIron', '_ ingotIron _', 'ingotIron ingotIron ingotIron'], 'anvil', 1);
    cube('bell', 'bell', '종', tc('bellT', P.block, { a: 'e8c030', b: 'b08a18', c: 'f8e080' }), { hard: 5, tool: 1, shape: 5, model: 'bell', hide: 0, lop: 0, cat: 3, use: 'bell', rs: 'bell' });
    const lanT = tc('lanternT', ['kkkkkkkk', 'kyyyyyyk', 'kyoooyyk', 'kyoyoyyk', 'kyoooyyk', 'kyyyyyyk', 'kkkkkkkk', 'kkkkkkkk'], { k: '3a3a40', y: 'ffd060', o: 'ffa020' });
    const wlanT = tc('wailLanternT', ['kkkkkkkk', 'kyyyyyyk', 'kyoooyyk', 'kyoyoyyk', 'kyoooyyk', 'kyyyyyyk', 'kkkkkkkk', 'kkkkkkkk'], { k: '3a3a40', y: '80f0f0', o: '30c0d0' });
    add({ n: 'lantern', key: 'lantern', ko: '랜턴', t: [lanT], hard: 3.5, tool: 1, shape: 5, model: 'lantern', hide: 0, lop: 0, light: 15, cat: 1 });
    R(['ironNugget ironNugget ironNugget', 'ironNugget torch ironNugget', 'ironNugget ironNugget ironNugget'], 'lantern', 1);
    add({ n: 'wailLantern', key: 'wail_lantern', ko: '흐느낌 랜턴', t: [wlanT], hard: 3.5, tool: 1, shape: 5, model: 'lantern', hide: 0, lop: 0, light: 10, cat: 1 });
    R(['ironNugget ironNugget ironNugget', 'ironNugget wailTorch ironNugget', 'ironNugget ironNugget ironNugget'], 'wailLantern', 1);
    const fireTex = 'fireT';
    add({ n: 'campfire', key: 'campfire', ko: '모닥불', t: ['oakBark'], hard: 2, tool: 2, shape: 5, model: 'campfire', hide: 0, lop: 0, light: 15, hurt: 2, cat: 3, drop: 'coal', dropN: 2, flameTex: fireTex, use: 'campfire' });
    R(['_ stick _', 'stick coal stick', '#logs #logs #logs'], 'campfire', 1);
    add({ n: 'wailCampfire', key: 'wail_campfire', ko: '흐느낌 모닥불', t: ['oakBark'], hard: 2, tool: 2, shape: 5, model: 'campfire', hide: 0, lop: 0, light: 10, hurt: 2, cat: 3, drop: 'wailSoil', flameTex: 'wailFireT', use: 'campfire' });
    R(['_ stick _', 'stick wailSand stick', '#logs #logs #logs'], 'wailCampfire', 1);
    add({ n: 'wailTorch', key: 'wail_torch', ko: '흐느낌 횃불', t: ['planks'], hard: 0, shape: 2, light: 10, cat: 1, flame: '50e0e0', need: 'torch' });

    R(['coal', 'stick', 'wailSand'], 'wailTorch', 4);
    // spark power: the torch (floor or a wall; lit or out), the lamp, the wire (power 0..15),
    // the repeater (facing, delay 1..4, on), the comparator (facing, subtract, on), the lever
    const F2D = [5, 1, 4, 0];   // the facing of the look (0 +z, 1 +x, 2 -z, 3 -x) as a D6 direction
    tc('sparkTorchT', P.flat, { a: 'd02020', b: 'a01010' });
    tc('sparkTorchOffT', P.flat, { a: '5a2020', b: '4a1818' });
    const ST = [];
    for (const a of [2, 5, 1, 4, 0]) for (const off of [0, 1]) ST.push({ v: ((a === 2 ? '' : `a${a}`) + (off ? 'off' : '')) || undefined, att: a, on: 1 - off, light: off ? 0 : 7, flame: off ? '5a1414' : 'f02020', need: a === 2 ? 'torch' : 'none' });
    variants({ n: 'sparkTorch', key: 'spark_torch', ko: '불꽃가루 횃불', t: ['planks'], hard: 0, shape: 2, cat: 4, rs: 'torch' }, ST);
    for (const v of ST.slice(1)) byKey.get('sparkTorch_' + v.v).drop = 'sparkTorch';
    R(['sparkDust', 'stick'], 'sparkTorch', 1);
    BLOCKS[27].flame = 'ffc830'; BLOCKS[27].need = 'torch';
    const lampOff = tc('lampOffT', ['bbbbbbbb', 'baacaacb', 'bacccacb', 'bccaccab', 'baccacab', 'bcacccab', 'baacacab', 'bbbbbbbb'], { a: '5a3a1a', b: '3a2410', c: '7a5a2a' });
    const lampOn = tc('lampOnT', ['bbbbbbbb', 'baacaacb', 'bacccacb', 'bccaccab', 'baccacab', 'bcacccab', 'baacacab', 'bbbbbbbb'], { a: 'e8a040', b: '8a4a18', c: 'ffe0a0' });
    cube('sparkLamp', 'spark_lamp', '불꽃 등', lampOff, { hard: 0.3, cat: 4, lamp: 1, rs: 'lamp' });
    cube('sparkLampOn', 'spark_lamp_on', '불꽃 등', lampOn, { hard: 0.3, light: 15, hidden: 1, item: 'sparkLamp', drop: 'sparkLamp', lamp: 2, rs: 'lamp', on: 1 });
    R(['_ sparkDust _', 'sparkDust glowCrystal sparkDust', '_ sparkDust _'], 'sparkLamp', 1);
    const W16 = [];
    for (let l = 0; l < 16; l++) {
        const k = l / 15, mix = (a, b) => Math.round(a + (b - a) * k).toString(16).padStart(2, '0');
        const c = mix(0x50, 0xff) + mix(0x0c, 0x34) + mix(0x0c, 0x20);
        W16.push({ v: l ? `${l}` : undefined, aux: l, t: [tc('wire' + l + 'T', ['abaaaaba', 'aaaabaaa', 'baaaaaab', 'aaabaaaa', 'aabaaaba', 'aaaaabaa', 'abaaaaaa', 'aaaabaab'], { a: c, b: shade(c, 0.8) })] });
    }
    variants({ n: 'sparkWire', key: 'spark_wire', ko: '불꽃가루 선', hard: 0, shape: 5, model: 'dust', conn: 4, hide: 0, lop: 0, solid: 0, cat: 4, hidden: 1, drop: 'sparkDust', rs: 'wire', need: 'floor' }, W16);
    const repG = ['aaaaaaaa', 'aaakkaaa', 'aaakkaaa', 'aaakkaaa', 'aaakkaaa', 'aaakkaaa', 'aaakkaaa', 'aaaaaaaa'], cmpG = ['aaaaaaaa', 'akaaaaka', 'aaaaaaaa', 'aaakkaaa', 'aaakkaaa', 'aaaaaaaa', 'aaakkaaa', 'aaaaaaaa'];
    const rpal = { a: 'a0a0a0', k: '8a2020' };
    tc('repeaterT', repG, rpal); tc('repeaterTx', tr(repG), rpal); tc('comparatorT', cmpG, rpal); tc('comparatorTx', tr(cmpG), rpal);
    const RP = [], CP = [];
    for (let f = 0; f < 4; f++) for (let d = 1; d <= 4; d++) for (const on of [0, 1]) RP.push({ v: f || d > 1 || on ? `${f}${d}${on}` : undefined, model: `rep_${f}_${d}_${on}`, fac: F2D[f], aux: d, on, t: [f % 2 ? 'repeaterTx' : 'repeaterT', 'smoothStoneT'] });
    for (let f = 0; f < 4; f++) for (const m of [0, 1]) for (const on of [0, 1]) CP.push({ v: f || m || on ? `${f}${m}${on}` : undefined, model: `cmp_${f}_${m}_${on}`, fac: F2D[f], aux: m, on, t: [f % 2 ? 'comparatorTx' : 'comparatorT', 'smoothStoneT'] });
    variants({ n: 'repeater', key: 'repeater', ko: '반복기', hard: 0, shape: 5, hide: 0, lop: 0, cat: 4, need: 'floor', rs: 'repeater', use: 'rs' }, RP);
    R(['sparkTorch sparkDust sparkTorch', 'stone stone stone'], 'repeater', 1);
    variants({ n: 'comparator', key: 'comparator', ko: '비교기', hard: 0, shape: 5, hide: 0, lop: 0, cat: 4, need: 'floor', rs: 'comparator', use: 'rs' }, CP);
    R(['_ sparkTorch _', 'sparkTorch quartz sparkTorch', 'stone stone stone'], 'comparator', 1);
    const LV = [];
    ATT.forEach((a, i) => { for (const on of [0, 1]) LV.push({ v: i || on ? `a${a}${on ? 'on' : ''}` : undefined, model: `lever_${a}_${on}`, att: a, on, need: a === 2 ? 'floor' : 'none' }); });
    variants({ n: 'lever', key: 'lever', ko: '레버', t: ['cobble'], hard: 0.5, shape: 5, hide: 0, lop: 0, solid: 0, cat: 4, use: 'lever', rs: 'lever' }, LV);
    R(['stick', 'cobble'], 'lever', 1);
    const noteB = cube('noteBlock', 'note_block', '소리 블록', tc('noteT', ['bbbbbbbb', 'baaaaaab', 'baakkaab', 'baakaaab', 'bakkaaab', 'bakkaaab', 'baaaaaab', 'bbbbbbbb'], { a: '6a4a2a', b: '4a3218', k: '1a1a1a' }), { hard: 0.8, tool: 2, cat: 4, use: 'note', fuel: 15, rs: 'note' });
    R(['#planks #planks #planks', '#planks sparkDust #planks', '#planks #planks #planks'], 'noteBlock', 1);
    cube('jukebox', 'jukebox', '전축', [tc('jukeTop', ['bbbbbbbb', 'baaaaaab', 'bakkkkab', 'bakaakab', 'bakaakab', 'bakkkkab', 'baaaaaab', 'bbbbbbbb'], { a: '6a4a2a', b: '4a3218', k: '1a1a1a' }), 'noteT', 'noteT'], { hard: 2, tool: 2, cat: 4, use: 'note', fuel: 15 });
    R(['#planks #planks #planks', '#planks diamond #planks', '#planks #planks #planks'], 'jukebox', 1);
    cube('tnt', 'tnt', '폭약', [tc('tntTop', ['bbbbbbbb', 'bkaakaab', 'baaaaaab', 'bkaakaab', 'baaaaaab', 'bkaakaab', 'baaaaaab', 'bbbbbbbb'], { a: 'd8d8d0', b: 'a02020', k: '2a2a2a' }), tc('tntSide', ['rrrrrrrr', 'rwrwrwrr', 'wwwwwwww', 'wkwkkwkw', 'wkwkwwkw', 'wwwwwwww', 'rrwrwrwr', 'rrrrrrrr'], { r: 'c02020', w: 'e8e8e0', k: '2a2a2a' }), 'tntTop'], { hard: 0, cat: 4, tnt: 1, rs: 'tnt' });
    R(['gunpowder sand gunpowder', 'sand gunpowder sand', 'gunpowder sand gunpowder'], 'tnt', 1);
    const L4 = [];
    for (let s = 0; s < 4; s++) L4.push({ model: `ladder_${s}`, v: s ? `${s}` : undefined, side: s });
    const lad = variants({ n: 'ladder', key: 'ladder', ko: '사다리', t: [tc('ladderT', ['b......b', 'bbbbbbbb', 'b......b', 'b......b', 'b......b', 'bbbbbbbb', 'b......b', 'b......b'], { b: '8a6a3a' })], hard: 0.4, tool: 2, shape: 5, hide: 0, lop: 0, solid: 0, climb: 1, cat: 1, place: 'ladder' }, L4);
    for (const v of L4.slice(1)) byKey.get(lad.n + '_' + v.v).drop = lad.n;
    R(['stick _ stick', 'stick stick stick', 'stick _ stick'], lad.n, 3);
    add({ n: 'scaffolding', key: 'scaffolding', ko: '비계', t: [tc('scaffT', ['bbbbbbbb', 'b......b', 'b.b..b.b', 'b..bb..b', 'b..bb..b', 'b.b..b.b', 'b......b', 'bbbbbbbb'], { b: 'c8a050' })], hard: 0, shape: 5, model: 'scaffold', hide: 0, lop: 0, climb: 1, cat: 1, fuel: 2 });
    R(['bamboo string bamboo', 'bamboo _ bamboo', 'bamboo _ bamboo'], 'scaffolding', 6);
    add({ n: 'ironBars', key: 'iron_bars', ko: '쇠창살', t: [tc('barsT', P.bars, { b: '6a6a6a' })], hard: 5, tool: 1, shape: 5, model: 'pane', conn: 3, hide: 0, lop: 0, cat: 1 });
    R(['ingotIron ingotIron ingotIron', 'ingotIron ingotIron ingotIron'], 'ironBars', 16);
    add({ n: 'chain', key: 'chain', ko: '사슬', t: [tc('chainT', ['...kk...', '..k..k..', '..k..k..', '...kk...', '...kk...', '..k..k..', '..k..k..', '...kk...'], { k: '4a4a52' })], hard: 5, tool: 1, shape: 5, model: 'chain', hide: 0, lop: 0, cat: 1 });
    R(['ironNugget', 'ingotIron', 'ironNugget'], 'chain', 1);
    door('ironDoor', 'iron_door', '철문', tc('ironDoorT', P.ironDoor, { a: 'c8c8c8', b: '8a8a8a', c: 'e0e0e0' }), tc('ironDoorTopT', P.ironDoor, { a: 'c8c8c8', b: '8a8a8a', c: 'e0e0e0' }), 'blockIron', { hard: 5, tool: 1, iron: 1 });
    R(['ingotIron ingotIron', 'ingotIron ingotIron', 'ingotIron ingotIron'], 'ironDoor', 3);
    trapdoor('ironTrapdoor', 'iron_trapdoor', '철 다락문', tc('ironTrapT', P.trapdoor, { a: 'c8c8c8', b: '8a8a8a' }), { hard: 5, tool: 1, iron: 1 });
    R(['ingotIron ingotIron', 'ingotIron ingotIron'], 'ironTrapdoor', 1);
    tc('potT', P.bricks, { a: '8a4a30', b: '6a3420', c: 'a05a3a' });
    add({ n: 'flowerPot', key: 'flower_pot', ko: '화분', t: ['potT'], hard: 0, shape: 5, model: 'pot', hide: 0, lop: 0, cat: 1, use: 'pot' });
    R(['brick _ brick', '_ brick _'], 'flowerPot', 1);
    const potted = ['sapling', 'birchSapling', 'spruceSapling', 'mahoganySapling', 'acaciaSapling', 'ebonySapling', 'flowerRed', 'flowerYellow', 'orchid', 'allium', 'bluet', 'tulipRed', 'tulipOrange', 'tulipWhite', 'tulipPink', 'daisy', 'cornflower', 'lilyValley', 'blackRose', 'fern', 'mushRed', 'mushBrown', 'deadBush', 'emberSapling', 'indigoSapling', 'emberRoots', 'indigoRoots', 'cactus'];
    for (const p of potted) {
        const pb = byKey.get(p);
        const t = p === 'cactus' ? 'cactusSide' : pb.t[0];
        add({ n: 'potted_' + p, key: 'potted_' + pb.key, ko: `화분에 심은 ${pb.ko}`, t: ['potT'], hard: 0, shape: 5, model: { potted: t }, hide: 0, lop: 0, cat: 1, hidden: 1, item: 'flowerPot', drop: 'flowerPot', plant: p });
    }
    stone('spawner', 'spawner', '몹 생성기', tc('spawnerT', ['kkkkkkkk', 'k.k..k.k', 'kk.kk.kk', 'k.k..k.k', 'k.k..k.k', 'kk.kk.kk', 'k.k..k.k', 'kkkkkkkk'], { k: '2a3a4a' }), { hard: 5, shape: 4, hide: 0, lop: 0, drop: 'none', cat: 3, xp: 20 });
    for (const [m, ko] of [['zombie', '좀비'], ['skeleton', '해골'], ['spider', '거미'], ['wraith', '잿빛 망령']]) add({ n: 'spawner_' + m, key: 'spawner_' + m, ko: `${ko} 생성기`, t: ['spawnerT'], hard: 5, tool: 1, tier: 0, shape: 4, hide: 0, lop: 0, drop: 'none', hidden: 1, item: 'spawner', spawns: m, xp: 20 });
    add({ n: 'voidRod', key: 'void_rod', ko: '공허 막대', t: [tc('voidRodT', P.flat, { a: 'f0e8ff', b: 'd8c8f0' })], hard: 0, shape: 5, model: 'rod', hide: 0, lop: 0, light: 14, cat: 1 });
    R(['blazePowder', 'voidPearl'], 'voidRod', 4);
    cube('target', 'target', '과녁', [tc('targetTop', ['ffffffff', 'frrrrrrf', 'frwwwwrf', 'frwrrwrf', 'frwrrwrf', 'frwwwwrf', 'frrrrrrf', 'ffffffff'], { f: 'e8dcc0', r: 'c02020', w: 'f0f0f0' })], { hard: 0.5, cat: 4, rs: 'target' });
    R(['_ sparkDust _', 'sparkDust hayBale sparkDust', '_ sparkDust _'], 'target', 1);
    add({ n: 'daylight', key: 'daylight_detector', ko: '햇빛 감지기', t: [tc('daylightT', ['bbbbbbbb', 'bgggggab', 'bgaagaab', 'bgggggab', 'bgaagaab', 'bgggggab', 'baaaaaab', 'bbbbbbbb'], { a: 'c0c8d0', b: '8a6a3a', g: '2a4a6a' }), 'planks', 'planks'], hard: 0.2, tool: 2, shape: 5, model: 'slab6', hide: 0, lop: 0, cat: 4, sensor: 1, rs: 'sensor', use: 'rs' });
    R(['glass glass glass', 'quartz quartz quartz', 'oakSlab oakSlab oakSlab'], 'daylight', 1);
    const cobS = 'cobble';
    // blocks that face one of six ways (D6; the variant (d + 3) % 6 first, so the kind faces up):
    // t6 of the faces with `front` on d, `back` on the other side, `side(e)` on the rest, where
    // e says which edge of that face lies toward the front (T top, B bottom, L left, R right)
    const OP6 = [1, 0, 3, 2, 5, 4], DV6 = [[-1, 0, 0], [1, 0, 0], [0, -1, 0], [0, 1, 0], [0, 0, -1], [0, 0, 1]];
    const edgeTo = (face, d) => {
        const [fx, fy, fz] = DV6[d];
        const du = [fz, -fz, fx, fx, -fx, fx][face], dv = [-fy, -fy, -fz, fz, -fy, -fy][face];
        return dv < 0 ? 'T' : dv > 0 ? 'B' : du < 0 ? 'L' : 'R';
    };
    const faced = (d, front, back, side) => [0, 1, 2, 3, 4, 5].map(f => f === d ? front : f === OP6[d] ? back : side(edgeTo(f, d)));
    const turned = (n, g, p) => { tc(n + 'T', g, p); tc(n + 'B', g.slice().reverse(), p); tc(n + 'L', tr(g), p); tc(n + 'R', tr(g).map(r => r.split('').reverse().join('')), p); };
    const D6S = [3, 4, 5, 0, 1, 2];   // the variant order of the directions
    const obsFace = tc('obsFace', ['aaaaaaaa', 'abbbbbba', 'abkkkkba', 'abkrrkba', 'abkrrkba', 'abkkkkba', 'abbbbbba', 'aaaaaaaa'], { a: '6a6a6a', b: '4a4a4a', k: '1a1a1a', r: '8a2020' });
    tc('obsSide', P.polished, { a: '6a6a6a', b: '3a3a3a', c: '8a8a8a' });
    turned('obsTop', ['aaaaaaaa', 'abbbbbba', 'aaaaaaaa', 'abbbbbba', 'aaaaaaaa', 'abbbbbba', 'aaaaaaaa', 'aaaaaaaa'], { a: '5a5a5a', b: '3a3a3a' });
    const obsBack = (on) => tc(on ? 'obsBackOn' : 'obsBack', ['aaaaaaaa', 'abbbbbba', 'abaaaaba', 'abarraba', 'abarraba', 'abaaaaba', 'abbbbbba', 'aaaaaaaa'], { a: '6a6a6a', b: '4a4a4a', r: on ? 'ff3020' : '4a1010' });
    obsBack(0); obsBack(1);
    const OB = [];
    for (const dd of D6S) for (const on of [0, 1]) OB.push({ v: dd !== 3 || on ? `f${dd}${on ? 'on' : ''}` : undefined, fac: dd, on, t6: faced(dd, obsFace, on ? 'obsBackOn' : 'obsBack', (e) => e === 'T' || e === 'B' ? 'obsTop' + e : 'obsSide') });
    const obs = variants({ n: 'observer', key: 'observer', ko: '관찰기', t: ['obsSide'], hard: 3, tool: 1, tier: 0, cat: 4, rs: 'observer' }, OB);
    for (const v of OB.slice(1)) byKey.get('observer_' + v.v).drop = obs.n;
    R(['cobble cobble cobble', 'sparkDust sparkDust quartz', 'cobble cobble cobble'], 'observer', 1);
    const dispFace = tc('dispFace', ['aaaaaaaa', 'aaaaaaaa', 'aakkkkaa', 'akbbbbka', 'akbbbbka', 'aakkkkaa', 'aaaaaaaa', 'aaaaaaaa'], { a: '7a7a7a', b: '3a3a3a', k: '1a1a1a' });
    const dropFace = tc('dropFace', ['aaaaaaaa', 'aaaaaaaa', 'aaakkaaa', 'aakbbkaa', 'aakbbkaa', 'aaakkaaa', 'aaaaaaaa', 'aaaaaaaa'], { a: '7a7a7a', b: '3a3a3a', k: '1a1a1a' });
    for (const [n, key, ko, face, aux] of [['dispenser', 'dispenser', '발사기', dispFace, 0], ['dropper', 'dropper', '공급기', dropFace, 1]]) {
        const L = D6S.map(dd => ({ v: dd !== 3 ? `f${dd}` : undefined, fac: dd, t6: faced(dd, face, cobS, () => cobS) }));
        const k = variants({ n, key, ko, t: [cobS], hard: 3.5, tool: 1, tier: 0, cat: 4, use: 'chest', rs: 'dispenser', aux }, L);
        for (const v of L.slice(1)) byKey.get(n + '_' + v.v).drop = k.n;
    }
    R(['cobble cobble cobble', 'cobble bow cobble', 'cobble sparkDust cobble'], 'dispenser', 1);
    R(['cobble cobble cobble', 'cobble _ cobble', 'cobble sparkDust cobble'], 'dropper', 1);
    // ((v2.7) fac: the way out, down; the sideways ones are at the end)
    add({ n: 'hopper', key: 'hopper', ko: '깔때기', t: [tc('hopperT', P.polished, { a: '4a4a4a', b: '2a2a2a', c: '5a5a5a' })], hard: 3, tool: 1, shape: 5, model: 'hopper', hide: 0, lop: 0, cat: 4, use: 'chest', fac: 2 });
    R(['ingotIron _ ingotIron', 'ingotIron chest ingotIron', '_ ingotIron _'], 'hopper', 1);
    // pistons: 6 ways x pushed out or not (out: the base; its arm in the next cell is a pistonHead)
    turned('pistonSide', ['aaaaaaaa', 'bbbbbbbb', 'cccccccc', 'cckkkkcc', 'cckkkkcc', 'cccccccc', 'cccccccc', 'cccccccc'], { a: 'a7834f', b: '8c6b3c', c: '7a7a7a', k: '5a5a5a' });
    const stickyTop = tc('stickyTop', P.block, { a: '7ad060', b: '4a9a38', c: 'a8f090' });
    tc('pistonInnerT', ['cccccccc', 'cbbbbbbc', 'cbaaaabc', 'cbakkabc', 'cbakkabc', 'cbaaaabc', 'cbbbbbbc', 'cccccccc'], { a: '6a6a6a', b: '5a5a5a', c: '7a7a7a', k: '8a6a3a' });
    tc('pistonRodT', P.flat, { a: '9a7a4a', b: '8a6a3a' });
    for (const [n, key, ko, top, sticky] of [['piston', 'piston', '피스톤', 'planks', 0], ['stickyPiston', 'sticky_piston', '끈끈이 피스톤', stickyTop, 1]]) {
        const L = [];
        for (const dd of D6S) for (const ext of [0, 1]) {
            const t6 = faced(dd, ext ? 'pistonInnerT' : top, cobS, (e) => 'pistonSide' + e);
            L.push(ext ? { v: `f${dd}out`, fac: dd, on: 1, t6, shape: 5, model: `pbase_${dd}`, hide: 0, lop: 0 } : { v: dd !== 3 ? `f${dd}` : undefined, fac: dd, on: 0, t6 });
        }
        const k = variants({ n, key, ko, t: [top, 'pistonSideT', cobS], hard: 1.5, cat: 4, rs: 'piston', aux: sticky }, L);
        for (const v of L.slice(1)) byKey.get(n + '_' + v.v).drop = k.n;
    }
    const HD = [];
    for (const dd of D6S) for (const sticky of [0, 1]) HD.push({ v: dd !== 3 || sticky ? `f${dd}${sticky ? 's' : ''}` : undefined, fac: dd, aux: sticky, model: `phead_${dd}`, t6: faced(dd, sticky ? stickyTop : 'planks', 'planks', () => 'planks') });
    variants({ n: 'pistonHead', key: 'piston_head', ko: '피스톤 팔', t: ['planks'], hard: 1.5, shape: 5, hide: 0, lop: 0, cat: 4, hidden: 1, drop: 'none', rs: 'head', nokind: 1 }, HD);
    R(['#planks #planks #planks', 'cobble ingotIron cobble', 'cobble sparkDust cobble'], 'piston', 1); R(['jellyBall', 'piston'], 'stickyPiston', 1);
    // (v2.6) two rails (b, their inner side d) over the ties (k), as the genre; powered and activator
    // rails a redstone line between them (c: dark off, bright on), detector rails a plate there. The
    // rails were thin lines of the stone's grey at 0, 2, 5, 7: on the ground only the ties showed
    const RG0 = ['.bd..db.', 'kbdkkdbk', '.bd..db.', '.bd..db.', '.bd..db.', 'kbdkkdbk', '.bd..db.', '.bd..db.'];
    const RG1 = ['.bdccdb.', 'kbdccdbk', '.bdccdb.', '.bdccdb.', '.bdccdb.', 'kbdccdbk', '.bdccdb.', '.bdccdb.'];
    const RG2 = ['.bd..db.', 'kbdkkdbk', '.bd..db.', '.bdccdb.', '.bdccdb.', 'kbdkkdbk', '.bd..db.', '.bd..db.'];
    const railT = tc('railT', RG0, { b: 'd0d0d0', d: '6a6a6a', k: '6a4a2a' });
    // (v2.5) rails in the circuit (rs rail, aux the kind, fac the shape: 0 along z, 1 along x; the
    // slopes, curves and the powered ones on come at the end); their textures kept for them
    // [name, key, ko, rails, their side, ties, the line off, on ('' none), the pattern]
    const RAILS = [['rail', 'rail', '레일', 'd0d0d0', '6a6a6a', '6a4a2a', '', '', RG0], ['poweredRail', 'powered_rail', '전동 레일', 'f0c838', '9a7418', '6a4a2a', '5a1410', 'ff3020', RG1],
        ['detectorRail', 'detector_rail', '감지 레일', 'd0d0d0', '6a6a6a', '6a4a2a', '8a3a3a', '', RG2], ['activatorRail', 'activator_rail', '작동 레일', 'd0d0d0', '6a6a6a', '5a2a22', '5a1410', 'ff3020', RG1]];
    const RTX = {};
    RAILS.forEach(([n, key, ko, col, side, tie, coff, oncol, G], ti) => {
        const t = n === 'rail' ? railT : tc(n + 'T', G, { b: col, d: side, k: tie, c: coff });
        const tx = tc(n + 'Tx', tr(TEX[t].g), TEX[t].p);
        RTX[n] = { t, tx };
        if (oncol) { RTX[n].ton = tc(n + 'OnT', TEX[t].g, { ...TEX[t].p, c: oncol }); RTX[n].txon = tc(n + 'OnTx', tr(TEX[t].g), { ...TEX[t].p, c: oncol }); }
        variants({ n, key, ko, t: [t], hard: 0.7, tool: 1, shape: 5, model: 'rail', hide: 0, lop: 0, solid: 0, cat: 4, place: 'rail', need: 'floor', rs: 'rail', aux: ti, fac: 0 }, [{}, { v: 'x', t: [tx], fac: 1 }]);
        byKey.get(n + '_x').drop = n;
    });
    R(['ingotIron _ ingotIron', 'ingotIron stick ingotIron', 'ingotIron _ ingotIron'], 'rail', 16);
    R(['ingotGold _ ingotGold', 'ingotGold stick ingotGold', 'ingotGold sparkDust ingotGold'], 'poweredRail', 6);
    R(['ingotIron _ ingotIron', 'ingotIron stonePlate ingotIron', 'ingotIron sparkDust ingotIron'], 'detectorRail', 6);
    R(['ingotIron stick ingotIron', 'ingotIron sparkTorch ingotIron', 'ingotIron stick ingotIron'], 'activatorRail', 6);
    // (v2.5) a tripwire hook hangs on a wall (att: that side, D6); the hooks at the ends of a string are
    // on while something is on it (the first one hangs on -z; the others come at the end)
    const hookBase = { ko: '덫 고리', t: ['planks'], hard: 0, shape: 5, hide: 0, lop: 0, solid: 0, cat: 4, rs: 'hook' };
    add({ n: 'tripwireHook', key: 'tripwire_hook', ...hookBase, model: 'hook_4_0', att: 4, on: 0 });
    R(['ingotIron', 'stick', '#planks'], 'tripwireHook', 2);
    cube('trappedChest', 'trapped_chest', '덫 상자', ['chestTop', tc('trappedSide', ['bbbbbbbb', 'baaaaaab', 'baaaaaab', 'kkkrrkkk', 'baarraab', 'baaaaaab', 'baaaaaab', 'bbbbbbbb'], { a: '9c6a2c', b: '6b4518', k: '3a2810', r: 'c02020' }), 'chestTop'], { hard: 2.5, tool: 2, cat: 4, use: 'chest', shape: 5, model: 'chestm', hide: 0, lop: 0, rs: 'trapped' });
    R(['chest tripwireHook'], 'trappedChest', 1, 1);
    cube('commandBlock', 'command_block', '명령 블록', tc('cmdT', ['kkkkkkkk', 'kaaaaaak', 'kaccccak', 'kacbbcak', 'kacbbcak', 'kaccccak', 'kaaaaaak', 'kkkkkkkk'], { a: 'c88a4a', b: 'e8c890', c: 'a86a2a', k: '6a4a2a' }), { hard: -1, cat: 4, use: 'command', drop: 'none', rs: 'command' });
    cube('beacon', 'beacon', '신호기', tc('beaconT', ['wwwwwwww', 'w.cccc.w', 'w.cbbc.w', 'w.cbbc.w', 'w.cccc.w', 'wkkkkkkw', 'wkkkkkkw', 'wwwwwwww'], { w: 'c8f0f8', c: '80f0f0', b: 'f0ffff', k: '2a2a3a' }), { hard: 3, shape: 4, hide: 0, lop: 0, light: 15, cat: 3, use: 'beacon' });
    R(['glass glass glass', 'glass heartCore glass', 'obsidian obsidian obsidian'], 'beacon', 1);
    add({ n: 'enchantTable', key: 'enchanting_table', ko: '마법 탁자', t: [tc('enchTop', ['kkkkkkkk', 'krrrrrrk', 'krwwwwrk', 'krwwwwrk', 'krrrrrrk', 'kkkkkkkk', 'kkkkkkkk', 'kkkkkkkk'], { k: '2a1a2a', r: 'a02020', w: 'e8e0c8' }), tc('enchSide', ['rrrrrrrr', 'kkkkkkkk', 'kcckkcck', 'kkkkkkkk', 'kkckkkck', 'kkkkkkkk', 'kkkkkkkk', 'kkkkkkkk'], { k: '1a1420', r: 'a02020', c: '3ae0d0' }), 'obsidian'], hard: 5, tool: 1, tier: 0, shape: 5, model: 'table12', hide: 0, lop: 0, light: 7, cat: 3, use: 'enchant' });
    R(['_ book _', 'diamond obsidian diamond', 'obsidian obsidian obsidian'], 'enchantTable', 1);
    add({ n: 'brewingStand', key: 'brewing_stand', ko: '양조대', t: [tc('brewT', P.polished, { a: '8a8a8a', b: '5a5a5a', c: 'a8a8a8' }), tc('brewRod', P.flat, { a: 'd8b840', b: 'b89820' }), 'brewT'], hard: 0.5, tool: 1, shape: 5, model: 'brewing', hide: 0, lop: 0, light: 1, cat: 3 });
    R(['_ blazeRod _', 'cobble cobble cobble'], 'brewingStand', 1);
    stone('lodestone', 'lodestone', '자석석', [tc('lodeTop', P.chiseled, { a: '8a8a8a', b: '5a5a5a', c: 'b0b0b0' }), tc('lodeSide', P.pillarSide, { a: '8a8a8a', b: '5a5a5a', c: 'b0b0b0' }), 'lodeTop'], { hard: 3.5, cat: 3, use: 'lodestone' });
    R(['chiseledStoneBricks chiseledStoneBricks chiseledStoneBricks', 'chiseledStoneBricks abyssIngot chiseledStoneBricks', 'chiseledStoneBricks chiseledStoneBricks chiseledStoneBricks'], 'lodestone', 1);
    stone('anchor', 'respawn_anchor', '되살아남 닻', [tc('anchorTop', ['kkkkkkkk', 'kppppppk', 'kpkkkkpk', 'kpkyykpk', 'kpkyykpk', 'kpkkkkpk', 'kppppppk', 'kkkkkkkk'], { k: '1b1626', p: 'b048f0', y: 'f8e080' }), 'glintObsT', 'obsidian'], { hard: 50, tier: 3, cat: 3, use: 'anchor', light: 3 });
    R(['glintObsidian glintObsidian glintObsidian', 'glowCrystal glowCrystal glowCrystal', 'glintObsidian glintObsidian glintObsidian'], 'anchor', 1);
    stone('voidChest', 'void_chest', '공허 상자', [tc('vChestTop', ['bbbbbbbb', 'baaaaaab', 'baaaaaab', 'baaaaaab', 'baaaaaab', 'baaaaaab', 'baaaaaab', 'bbbbbbbb'], { a: '1e3a34', b: '0e1a18' }), tc('vChestSide', ['bbbbbbbb', 'baaaaaab', 'baaaaaab', 'kkkggkkk', 'baaggaab', 'baaaaaab', 'baaaaaab', 'bbbbbbbb'], { a: '1e3a34', b: '0e1a18', k: '0a0a0a', g: '3ac08a' }), 'vChestTop'], { hard: 22, tier: 0, cat: 3, use: 'voidchest', light: 7, drop: 'obsidian', dropN: 8, shape: 5, model: 'chestm', hide: 0, lop: 0 });
    R(['obsidian obsidian obsidian', 'obsidian voidEye obsidian', 'obsidian obsidian obsidian'], 'voidChest', 1);
    add({ n: 'cake', key: 'cake', ko: '케이크', t: [tc('cakeTop', ['wwwwwwww', 'wrwwwwrw', 'wwwwwwww', 'wwwrwwww', 'wwwwwwww', 'wwwwwrww', 'wrwwwwww', 'wwwwwwww'], { w: 'f4f0ec', r: 'd02030' }), tc('cakeSide', ['wwwwwwww', 'wwwwwwww', 'awawwawa', 'bbbbbbbb', 'aaaaaaaa', 'bbbbbbbb', 'aaaaaaaa', 'aaaaaaaa'], { w: 'f4f0ec', a: 'c88a4a', b: 'f4e0c0' }), tc('cakeBot', P.flat, { a: 'c88a4a', b: 'b07a3a' })], hard: 0.5, shape: 5, model: 'cake', hide: 0, lop: 0, cat: 5, use: 'cake', drop: 'none', st: 1 });
    R(['milkBucket milkBucket milkBucket', 'sugar egg sugar', 'wheat wheat wheat'], 'cake', 1);
    for (const [n, key, ko, c1, c2] of [['skullSkel', 'skeleton_skull', '해골 머리', 'e0e0d4', '202020'], ['skullZombie', 'zombie_head', '좀비 머리', '7a9a7a', '3a0a0a'], ['skullBlack', 'black_skeleton_skull', '검은 해골 머리', '2a2a2e', '0a0a0a'], ['skullWander', 'wanderer_head', '방랑자 머리', '1e1a26', 'd070ff']]) {
        add({ n, key, ko, t: [tc(n + 'T', ['aaaaaaaa', 'aaaaaaaa', 'aaaaaaaa', 'abbaabba', 'abbaabba', 'aaaaaaaa', 'aabbbbaa', 'aaaaaaaa'], { a: c1, b: c2 })], hard: 1, shape: 5, model: 'head', hide: 0, lop: 0, cat: 1 });
    }
    // the invisible wall of the commands
    add({ n: 'barrier', key: 'barrier', ko: '방벽', t: [tex('barrierT', pat(['........', '........', '........', '........', '........', '........', '........', '........'].map((r, y) => y === 0 ? 'r.......' : r), { r: 'ff0000' }))], hard: -1, shape: 4, hide: 0, lop: 0, drop: 'none', cat: 4, invisible: 1 });

    // ================================================================ items
    const I = (n, key, ko, icon, p, more = {}) => item({ n, key, ko, icon, p, cat: 5, ...more });
    const ICON = {
        gem: ['........', '..cccc..', '.cwccdc.', 'cwcccddc', '.cccddc.', '..cddc..', '...dc...', '........'],
        dust: ['........', '........', '..a..a..', '.aba.a..', '..aaab..', '.a.aba..', '...a....', '........'],
        crystal: ['........', '...ww...', '..wccd..', '.wccccd.', '..ccdd..', '..cddc..', '...dd...', '........'],
        nugget: ['........', '........', '...ww...', '..wccd..', '..ccdd..', '...dd...', '........', '........'],
        seeds: ['........', '..a.....', '....a.a.', '.a.a....', '...a..a.', '.a....a.', '...a.a..', '........'],
        stalk: ['......aa', '.....aba', '....aba.', '...aba..', '..aba...', '.aba....', 'aba.....', 'aa......'],
        bread: ['........', '........', '..aaaaa.', '.abbbbba', 'abbcbbba', 'abbbbcba', '.aaaaaa.', '........'],
        root: ['......gg', '.....gg.', '....aa..', '...aaa..', '..aab...', '.aab....', '.ab.....', '........'],
        round: ['........', '..aaaa..', '.abbbba.', '.abbbba.', '.abbbba.', '.abbbba.', '..aaaa..', '........'],
        slice: ['........', '........', '.aaaaaa.', '.bcbcbb.', '..bbbb..', '...bb...', '........', '........'],
        bowl: ['........', '........', '.cccccc.', '.abbbba.', '..aaaa..', '...aa...', '........', '........'],
        bucket: ['........', 'k......k', 'kkkkkkkk', 'kccccccк'.replace('к', 'k'), '.kaaaak.', '.kaaaak.', '..kkkk..', '........'],
        sheet: ['........', '.wwwwww.', '.wkkkkw.', '.wwwwww.', '.wkkkww.', '.wwwwww.', '.wkkkkw.', '.wwwwww.'],
        book: ['........', '.bbbbbb.', '.bwwwwb.', '.bwwwwb.', '.bwwwwb.', '.bwwwwb.', '.bbbbbb.', '........'],
        ball: ['........', '...aa...', '..abba..', '.abbbba.', '.abbbba.', '..abba..', '...aa...', '........'],
        egg: ['........', '...aa...', '..aaaa..', '..abaa..', '.aaaaab.', '.aaaabb.', '..aabb..', '........'],
        rod: ['.......a', '......ab', '.....ab.', '....ab..', '...ab...', '..ab....', '.ab.....', 'ab......'],
        hoe: ['..hhhh..', '.....hd.', '......d.', '.....d..', '....d...', '...d....', '..d.....', '.d......'],
        shears: ['........', '.k...k..', '..k.k...', '...k....', '..aka...', '.a...a..', 'a.....a.', '........'],
        compass: ['........', '..kkkk..', '.kwwwwk.', 'kwwrwwwk', 'kwwkwwwk', '.kwwwwk.', '..kkkk..', '........'],
        clock: ['........', '..kkkk..', '.kyyyyk.', 'kyybbyyk', 'kybbyyyk', '.kyyyyk.', '..kkkk..', '........'],
        egg2: ['........', '...aa...', '..abaa..', '..aaba..', '.abaaab.', '.aaabaa.', '..abaa..', '........'],
        fire: ['........', '...aa...', '..abba..', '.abccba.', '.abccba.', '..abba..', '...aa...', '........'],
    };
    I('jade', 'jade', '비취', ICON.gem, { c: '3ac06a', w: 'b8f8d0', d: '208a48' });
    I('quartz', 'quartz', '석영', ICON.crystal, { w: 'ffffff', c: 'ece6dc', d: 'c8c0b4' });
    I('sparkDust', 'spark_dust', '불꽃가루', ICON.dust, { a: 'd02020', b: 'ff6040' }, { placeBlock: 'sparkWire' });
    I('glowDust', 'glow_dust', '빛가루', ICON.dust, { a: 'f0d880', b: 'fff4c0' });
    I('goldNugget', 'gold_nugget', '금 조각', ICON.nugget, { w: 'fff0a0', c: 'f2d23a', d: 'c99a10' });
    I('ironNugget', 'iron_nugget', '철 조각', ICON.nugget, { w: 'ffffff', c: 'd8d8d8', d: 'a0a0a0' });
    I('aquaShard', 'aquastone_shard', '청록석 조각', ICON.crystal, { w: 'b8f0e0', c: '5aa89a', d: '3e8a7e' });
    I('aquaCrystal', 'aqua_crystals', '바다빛 수정', ICON.dust, { a: 'c8e8e0', b: 'ffffff' });
    I('ashBrick', 'ashen_brick', '잿빛 벽돌 조각', ['........', '........', '...rrr..', '..rrrrk.', '.rrrrkk.', '.kkkkkk.', '........', '........'], { r: '5a2c2e', k: '341618' });
    I('magmaCream', 'magma_cream', '마그마 크림', ICON.ball, { a: '6a2008', b: 'ff9a30' });
    I('blazeRod', 'blaze_rod', '화염 막대', ICON.rod, { a: 'c87a10', b: 'ffd040' });
    I('gunpowder', 'gunpowder', '화약', ICON.dust, { a: '5a5a5a', b: '8a8a8a' });
    I('wheatSeeds', 'wheat_seeds', '밀 씨앗', ICON.seeds, { a: '6aa83a' }, { placeBlock: 'wheatCrop' });
    I('wheat', 'wheat', '밀', ICON.stalk, { a: 'c8a840', b: 'e8c860' });
    I('bread', 'bread', '빵', ICON.bread, { a: '8a5a2a', b: 'c88a4a', c: 'e0b070' }, { food: 5 });
    I('carrot', 'carrot', '당근', ICON.root, { a: 'f08a20', b: 'c06a10', g: '4a9a30' }, { food: 3, placeBlock: 'carrotCrop' });
    I('potato', 'potato', '감자', ICON.round, { a: 'a8804a', b: 'c8a058' }, { food: 1, placeBlock: 'potatoCrop' });
    I('bakedPotato', 'baked_potato', '구운 감자', ICON.round, { a: '8a5a2a', b: 'd8b060' }, { food: 5 });
    I('beetroot', 'beetroot', '비트', ICON.round, { a: '7a1030', b: 'a01a3a' }, { food: 1 });
    I('beetSeeds', 'beetroot_seeds', '비트 씨앗', ICON.seeds, { a: 'b8a080' }, { placeBlock: 'beetCrop' });
    I('beetSoup', 'beetroot_soup', '비트 수프', ICON.bowl, { a: '6a4a2a', b: '8a5a3a', c: 'a01a3a' }, { food: 6, st: 1 });
    I('melonSlice', 'melon_slice', '수박 조각', ICON.slice, { a: '4a8a2a', b: 'e03a3a', c: '1a1a1a' }, { food: 2 });
    I('pumpkinPie', 'pumpkin_pie', '호박 파이', ICON.bread, { a: 'a8642a', b: 'e0a040', c: 'f0c070' }, { food: 8 });
    I('cookie', 'cookie', '쿠키', ICON.round, { a: 'a8743a', b: 'c88a4a' }, { food: 2 });
    I('sugar', 'sugar', '설탕', ICON.dust, { a: 'f0f0f0', b: 'ffffff' });
    I('egg', 'egg', '달걀', ICON.egg, { a: 'f0e0c0', b: 'd8c8a8' }, { st: 16, throwIt: 2 });
    I('bucket', 'bucket', '양동이', ICON.bucket, { k: '5a5a5a', c: 'c8c8c8', a: 'a8a8a8' }, { st: 16 });
    I('waterBucket', 'water_bucket', '물 양동이', ICON.bucket, { k: '5a5a5a', c: '3a6ad8', a: 'a8a8a8' }, { st: 1 });
    I('lavaBucket', 'lava_bucket', '용암 양동이', ICON.bucket, { k: '5a5a5a', c: 'f08a1a', a: 'a8a8a8' }, { st: 1, fuel: 1000 });
    I('milkBucket', 'milk_bucket', '우유 양동이', ICON.bucket, { k: '5a5a5a', c: 'f8f8f8', a: 'a8a8a8' }, { st: 1, drink: 1 });
    I('goldenApple', 'golden_apple', '황금 사과', ['....b...', '...bg...', '.yyyyy..', 'yywyyyy.', 'yyyyyyy.', 'yyyyyyk.', '.yyyyk..', '..yyy...'], { y: 'f2d23a', k: 'c99a10', w: 'fff0a0', b: '6b4518', g: '4b8a2c' }, { food: 4 });
    I('goldenCarrot', 'golden_carrot', '황금 당근', ICON.root, { a: 'f2d23a', b: 'c99a10', g: '4b8a2c' }, { food: 6 });
    I('mushStew', 'mushroom_stew', '버섯 스튜', ICON.bowl, { a: '6a4a2a', b: '8a5a3a', c: 'c8a070' }, { food: 6, st: 1 });
    I('berries', 'sweet_berries', '달콤한 열매', ['........', '..g.....', '...g.g..', '.rr.rr..', 'rwrrwrr.', '.rr.rr..', '..rr....', '........'], { r: 'd02040', w: 'ff8090', g: '2e5a2a' }, { food: 2, placeBlock: 'berryBush' });
    I('kelpItem', 'kelp_item', '다시마 줄기', ICON.stalk, { a: '3a7a2a', b: '5a9a3a' }, { placeBlock: 'kelp' });
    I('driedKelp', 'dried_kelp', '말린 다시마', ICON.stalk, { a: '2e3a22', b: '4a5a32' }, { food: 1 });
    I('honeycomb', 'honeycomb', '벌집 조각', ICON.round, { a: 'c07a10', b: 'e8a020' });
    I('paper', 'paper', '종이', ICON.sheet, { w: 'f0ece0', k: 'c8c0b0' });
    I('book', 'book', '책', ICON.book, { b: '8a4a2a', w: 'f0ece0' });
    I('boneMeal', 'bone_meal', '뼛가루', ICON.dust, { a: 'e8e4d8', b: 'ffffff' });
    I('snowball', 'snowball', '눈덩이', ICON.ball, { a: 'd8e4ec', b: 'ffffff' }, { st: 16, throwIt: 1 });
    I('jellyBall', 'jelly_ball', '젤리 방울', ICON.ball, { a: '4a9a38', b: '8ad070' });
    I('fireCharge', 'fire_charge', '화염구', ICON.fire, { a: '3a2010', b: 'c04010', c: 'ffa020' });
    I('compass', 'compass', '나침반', ICON.compass, { k: '5a5a5a', w: 'e0e0e0', r: 'd02020' }, { st: 1 });
    I('clock', 'clock', '시계', ICON.clock, { k: 'a88010', y: 'f2d23a', b: '2a4a8a' }, { st: 1 });
    I('shears', 'shears', '가위', ICON.shears, { k: 'c8c8c8', a: '5a5a5a' }, { st: 1, dur: 238, tool5: 1 });
    I('tinyNote', 'name_note', '쪽지', ICON.sheet, { w: 'f0e8c8', k: 'a89878' });
    R(['quartz quartz', 'quartz quartz'], 'quartzBlock', 1);
    R(['sugar egg', 'pumpkin _'], 'pumpkinPie', 1, 1);
    R(['wheat wheat wheat'], 'bread', 1);
    R(['wheat cocoa wheat'].map(r => r.replace('cocoa', 'brownDye')), 'cookie', 8);
    R(['reed'], 'sugar', 1); R(['ingotIron _ ingotIron', '_ ingotIron _'], 'bucket', 1);
    R(['goldNugget goldNugget goldNugget', 'goldNugget apple goldNugget', 'goldNugget goldNugget goldNugget'].map(r => r.replace(/goldNugget/g, 'ingotGold')), 'goldenApple', 1);
    R(['goldNugget goldNugget goldNugget', 'goldNugget carrot goldNugget', 'goldNugget goldNugget goldNugget'], 'goldenCarrot', 1);
    R(['goldNugget goldNugget goldNugget', 'goldNugget goldNugget goldNugget', 'goldNugget goldNugget goldNugget'], 'ingotGold', 1); R(['ingotGold'], 'goldNugget', 9);
    R(['ironNugget ironNugget ironNugget', 'ironNugget ironNugget ironNugget', 'ironNugget ironNugget ironNugget'], 'ingotIron', 1); R(['ingotIron'], 'ironNugget', 9);
    R(['mushBrown mushRed'], 'mushStew', 1, 1); R(['beetroot beetroot beetroot', 'beetroot beetroot beetroot'], 'beetSoup', 1);
    R(['beetroot'], 'redDye', 1); R(['bone'], 'boneMeal', 3); R(['reed reed reed'], 'paper', 3); R(['paper paper', 'paper leather'], 'book', 1, 1);
    R(['_ ingotIron _', 'ingotIron sparkDust ingotIron', '_ ingotIron _'], 'compass', 1); R(['_ ingotGold _', 'ingotGold sparkDust ingotGold', '_ ingotGold _'], 'clock', 1);
    R(['_ ingotIron', 'ingotIron _'], 'shears', 1, 1); R(['gunpowder blazePowder coal'], 'fireCharge', 3);
    R(['glowDust glowDust', 'glowDust glowDust'], 'glowCrystal', 1); R(['blazeRod'], 'blazePowder', 2);
    R(['boneMeal'], 'whiteDye', 1); R(['lapis'], 'blueDye', 1); R(['coal'], 'blackDye', 1);
    R(['blueDye greenDye'], 'cyanDye', 2, 1); R(['redDye whiteDye'], 'pinkDye', 2, 1); R(['redDye yellowDye'], 'orangeDye', 2, 1); R(['greenDye whiteDye'], 'limeDye', 2, 1);
    R(['blueDye whiteDye'], 'lightBlueDye', 2, 1); R(['blueDye redDye'], 'purpleDye', 2, 1); R(['purpleDye pinkDye'], 'magentaDye', 2, 1); R(['blackDye whiteDye'], 'grayDye', 2, 1);
    R(['grayDye whiteDye'], 'lightGrayDye', 2, 1); R(['redDye greenDye'], 'brownDye', 2, 1);
    for (let i = RECIPES.length - 1; i >= 0; i--) if (RECIPES[i].n === 0) RECIPES.splice(i, 1);
    S('potato', 'bakedPotato'); S('cactus', 'greenDye'); S('kelpItem', 'driedKelp'); S('oreJade', 'jade'); S('oreQuartz', 'quartz'); S('oreSpark', 'sparkDust');
    // spawn eggs (one for each mob that walks)
    // (v2.3.2) flowing liquids: water and lava at levels 1..7 (lower and lower: models liq_1..7) and
    // falling (a full block, as the source): all of them water or lava to the game (src/fluid.js)
    for (const [base, ko, more] of [['water', '물', { hide: 2 }], ['lava', '용암', { hide: 3, light: 15 }]]) {
        for (let L = 1; L <= 7; L++) add({ n: `${base}Flow${L}`, key: `${base}_flowing_${L}`, ko, t: [base], hard: -1, shape: 5, model: `liq_${L}`, hide: 0, solid: 0, lop: 0, drop: 'none', light: more.light || 0, item: base, hidden: 1, nokind: 1, liq: base, lv: L, cat: 2 });
        add({ n: `${base}Fall`, key: `${base}_falling`, ko, t: [base], hard: -1, shape: 3, hide: more.hide, solid: 0, lop: 0, drop: 'none', light: more.light || 0, item: base, hidden: 1, nokind: 1, liq: base, lv: 8, cat: 2 });
    }
    // (v2.4.4) the light sensor turned (F): power at night, 15 less the day's light
    add({ n: 'daylightInv', key: 'daylight_detector_inverted', ko: '햇빛 감지기', t: [tc('daylightInvT', ['bbbbbbbb', 'bgggggab', 'bgaagaab', 'bgggggab', 'bgaagaab', 'bgggggab', 'baaaaaab', 'bbbbbbbb'], { a: 'c0c8d0', b: '8a6a3a', g: '6a2a3a' }), 'planks', 'planks'], hard: 0.2, tool: 2, shape: 5, model: 'slab6', hide: 0, lop: 0, cat: 4, sensor: 1, rs: 'sensor', use: 'rs', drop: 'daylight', hidden: 1, nokind: 1, item: 'daylight' });
    // (v2.5) a block a piston moves, on its way for 0.1 s (the genre's two ticks): drawn sliding,
    // it carries no power, cannot be moved or broken, and is the block it carries when it lands
    // (v2.5) the note block's notes 1 .. 24 (its aux; the block itself is note 0): F on it goes up one
    for (let p = 1; p <= 24; p++) add({ n: 'noteBlock_p' + p, key: 'note_block_' + p, ko: '소리 블록', t: ['noteT'], hard: 0.8, tool: 2, cat: 4, use: 'note', fuel: 15, rs: 'note', aux: p, item: 'noteBlock', drop: 'noteBlock', hidden: 1, nokind: 1 });
    // (v2.5) the other tripwire hooks (by the wall and on), and the string between them (put with string: aux 0 along z, 1 along x)
    for (const a of [0, 1, 4, 5]) for (const on of [0, 1]) if (a !== 4 || on) add({ n: `tripwireHook_${a}${on}`, key: `tripwire_hook_${a}${on}`, ...hookBase, model: `hook_${a}_${on}`, att: a, on, item: 'tripwireHook', drop: 'tripwireHook', hidden: 1, nokind: 1 });
    const tripT = tc('tripT', P.flat, { a: 'e8e8e8', b: 'd0d0d0' });
    add({ n: 'tripwire', key: 'tripwire', ko: '덫 줄', t: [tripT], hard: 0, shape: 5, model: 'trip_0', hide: 0, lop: 0, solid: 0, cat: 4, rs: 'trip', aux: 0, drop: 'string', hidden: 1, nokind: 1 });
    add({ n: 'tripwire_x', key: 'tripwire_x', ko: '덫 줄', t: [tripT], hard: 0, shape: 5, model: 'trip_1', hide: 0, lop: 0, solid: 0, cat: 4, rs: 'trip', aux: 1, drop: 'string', item: 'tripwire', hidden: 1, nokind: 1 });
    ITEMS.find((it) => it.n === 'string').placeBlock = 'tripwire';
    // (v2.5) the rails' slopes (2 .. 5), the curves of plain rails (6 .. 9), powered and activator rails on (0 .. 5)
    const curveG = (cx, cz) => { const g = []; for (let r = 0; r < 8; r++) { let row = ''; for (let c = 0; c < 8; c++) { const d = Math.hypot(c + 0.5 - cx, r + 0.5 - cz), a = Math.atan2(r + 0.5 - cz, c + 0.5 - cx); let ch = '.'; if (d > 1.5 && d < 6.5 && Math.abs(Math.sin(a * 5)) < 0.5) ch = 'k'; if (Math.abs(d - 2.3) < 0.5 || Math.abs(d - 5.7) < 0.5) ch = 'b'; row += ch; } g.push(row); } return g; };
    const CURVE = { 6: [8, 8], 7: [0, 8], 8: [0, 0], 9: [8, 0] };
    RAILS.forEach(([n, key, ko, col, side, tie, coff, oncol], ti) => {
        const L = [];
        for (let s = 2; s <= 5; s++) L.push([s, 0]);
        if (ti === 0) for (let s = 6; s <= 9; s++) L.push([s, 0]);
        if (oncol) for (let s = 0; s <= 5; s++) L.push([s, 1]);
        for (const [s, on] of L) {
            const alongX = s === 1 || s === 2 || s === 3;
            let t = on ? (alongX ? RTX[n].txon : RTX[n].ton) : (alongX ? RTX[n].tx : RTX[n].t);
            if (s >= 6) t = tc(`railCurve${s}`, curveG(...CURVE[s]), { ...TEX[railT].p });
            add({ n: `${n}_s${s}${on ? 'on' : ''}`, key: `${key}_${s}${on ? '_on' : ''}`, ko, t: [t], hard: 0.7, tool: 1, shape: 5, model: s >= 2 && s <= 5 ? `railup_${s}` : 'rail', hide: 0, lop: 0, solid: 0, cat: 4, need: 'floor', rs: 'rail', aux: ti, fac: s, on, item: n, drop: n, hidden: 1, nokind: 1 });
        }
    });
    add({ n: 'moving', key: 'moving_piston', ko: '움직이는 블록', t: ['stone'], hard: -1, shape: 5, model: 'empty', hide: 0, lop: 0, drop: 'none', hidden: 1, nokind: 1, rs: 'moving', cat: 4 });
    // (v2.7, at the end so the ids before stay as they were) wall torches (against the block at att),
    // hoppers pointing sideways (fac), campfires put out
    for (const a of [0, 1, 4, 5]) add({ n: 'torch_a' + a, key: 'wall_torch_a' + a, ko: '횃불', t: ['planks'], hard: 0, shape: 2, hide: 0, solid: 0, lop: 0, light: 14, att: a, hidden: 1, nokind: 1, item: 'torch', drop: 'torch' });
    for (const a of [0, 1, 4, 5]) add({ n: 'wailTorch_a' + a, key: 'wail_wall_torch_a' + a, ko: '흐느낌 횃불', t: ['planks'], hard: 0, shape: 2, light: 10, flame: '50e0e0', att: a, hidden: 1, nokind: 1, item: 'wailTorch', drop: 'wailTorch' });
    for (const [m, f, v] of [['hopper_x0', 0, 'west'], ['hopper_x1', 1, 'east'], ['hopper_z0', 4, 'north'], ['hopper_z1', 5, 'south']]) add({ n: 'hopper_' + v, key: 'hopper_' + v, ko: '깔때기', t: ['hopperT'], hard: 3, tool: 1, shape: 5, model: m, hide: 0, lop: 0, cat: 4, use: 'chest', fac: f, hidden: 1, nokind: 1, item: 'hopper', drop: 'hopper' });
    add({ n: 'campfireOff', key: 'campfire_off', ko: '모닥불', t: ['oakBark'], hard: 2, tool: 2, shape: 5, model: 'campfire_off', hide: 0, lop: 0, cat: 3, drop: 'coal', dropN: 2, use: 'campfire', hidden: 1, nokind: 1, item: 'campfire' });
    add({ n: 'wailCampfireOff', key: 'wail_campfire_off', ko: '흐느낌 모닥불', t: ['oakBark'], hard: 2, tool: 2, shape: 5, model: 'campfire_off', hide: 0, lop: 0, cat: 3, drop: 'wailSoil', use: 'campfire', hidden: 1, nokind: 1, item: 'wailCampfire' });
    // (v2.9) a beacon with its powers chosen (aux 1..15: the first power (aux-1)%5 - speed, haste,
    // resistance, jump boost, strength - and the second (aux-1)/5 - none, regeneration, the first at II):
    // kept in the block, so a world and a server keep them as they keep blocks
    for (let k = 1; k <= 15; k++) add({ n: 'beacon_' + k, key: 'beacon_' + k, ko: '신호기', t: ['beaconT'], hard: 3, shape: 4, hide: 0, lop: 0, light: 15, cat: 3, use: 'beacon', aux: k, hidden: 1, nokind: 1, item: 'beacon', drop: 'beacon' });
    // (v3.0) the spawners of the mines (small poisoned spiders), the strongholds (crawlers) and the forts
    // (spirits of flame): the last free ids but one
    for (const [m, ko] of [['caveSpider', '동굴 거미'], ['silverfish', '좀벌레'], ['flameSpirit', '불꽃 정령']]) add({ n: 'spawner_' + m, key: 'spawner_' + m.replace(/[A-Z]/g, (x) => '_' + x.toLowerCase()), ko: `${ko} 생성기`, t: ['spawnerT'], hard: 5, tool: 1, tier: 0, shape: 4, hide: 0, lop: 0, drop: 'none', hidden: 1, nokind: 1, item: 'spawner', spawns: m, xp: 20 });
    return { item, I, R, S, ICON, kinds, byKey };
}
