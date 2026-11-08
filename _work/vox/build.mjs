// Build 블록 월드: blocks.mjs (data) -> lists, src/*.js (EJS) -> .ent
// usage: node build.mjs [out.ent] [K=V ...]
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { compileProgram } from './ejs.mjs';
import { expandMacros, declareImplicit } from './inline.mjs';
import { packEnt } from './pack.mjs';
import { legacyMath, slimBlocks } from './legacy.mjs';
import { TEX, CRACK, BLOCKS, NBLOCK, ITEMS, TIERS, KINDS, TOOL0, toolId, NITEM, RECIPES, SMELT, MOBS } from './blocks.mjs';
import { makeSounds } from './sounds.mjs';
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
export const VERSION = '1.0';
export const NAME = '블록 월드';

const SZ = 128, WY = 64;
export const consts = {
    SZ, WY, SEA: 30, LAVAY: 5, NSX: SZ / 8, NSY: WY / 8, NSEC: (SZ / 8) * (SZ / 8) * (WY / 8), SXS: SZ * WY,
    NEARZ: Math.round(0.05 * 256 * 16384), DEC2: 20, PLANT2: 225, CLOUDY: WY + 8, MK: 160 * 1048576,
    NMOB: 40, NITM: 64, NARR: 24, NFUR: 16, NCHEST: 16, ANIMALS: 36, SMELTT: 8, NTX: 96, TOOL0,
    SPAWNC: 0, BENCH: 0, NOCAVE: 0, AUTOSEED: 0, AUTOMODE: 0, TESTRUN: 0, SIMRUN: 0, LEGACY: 0, SLIM: 1,
};

// ------------------------------------------------------------------ data -> lists
export function makeData() {
    const L = {};
    const cols = [], colIx = new Map();
    const col = (hex) => { hex = hex.toLowerCase().replace('#', ''); if (!colIx.has(hex)) { colIx.set(hex, cols.length); cols.push(hex); } return colIx.get(hex) * 192; };
    const rgbOf = (h) => [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
    // rects: one list set for textures, cracks and icons
    const R = { RU0: [], RV0: [], RU1: [], RV1: [], RCOL: [] };
    // greedy rectangles of the cells where pick(ch) is true, per character
    const rectsOf = (grid, keep, colourOf) => {
        const g = grid.map(r => r.split(''));
        const used = g.map(r => r.map(() => false));
        const out = [];
        for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
            const ch = g[y][x];
            if (used[y][x] || !keep(ch)) continue;
            let w = 1; while (x + w < 8 && !used[y][x + w] && g[y][x + w] === ch) w++;
            let h = 1;
            outer: while (y + h < 8) { for (let k = 0; k < w; k++) if (used[y + h][x + k] || g[y + h][x + k] !== ch) break outer; h++; }
            for (let j = 0; j < h; j++) for (let k = 0; k < w; k++) used[y + j][x + k] = true;
            out.push({ u0: x, v0: y, u1: x + w, v1: y + h, c: colourOf(ch), a: w * h });
        }
        out.sort((a, b) => b.a - a.a);
        return out;
    };
    const putRects = (rs) => { const r0 = R.RU0.length + 1; for (const r of rs) { R.RU0.push(r.u0); R.RV0.push(r.v0); R.RU1.push(r.u1); R.RV1.push(r.v1); R.RCOL.push(r.c); } return [r0, rs.length]; };

    // textures
    const texNames = Object.keys(TEX);
    const texIx = (n) => { const i = texNames.indexOf(n); if (i < 0) throw new Error('texture ' + n); return i + 1; };
    L.TAVG = []; L.TBASE = []; L.TR0 = []; L.TRN = []; L.TRF = [];
    const AVGC = [];
    for (const n of texNames) {
        const { p, g } = TEX[n];
        if (g.length !== 8 || g.some(r => r.length !== 8)) throw new Error('texture size ' + n);
        const count = {};
        let clear = false, sum = [0, 0, 0], np = 0;
        for (const r of g) for (const ch of r) { if (ch === '.') { clear = true; continue; } if (!p[ch]) throw new Error(`texture ${n}: ${ch}`); count[ch] = (count[ch] || 0) + 1; const c = rgbOf(p[ch]); sum = sum.map((v, i) => v + c[i]); np++; }
        const base = clear ? null : Object.entries(count).sort((a, b) => b[1] - a[1])[0][0];
        const avg = sum.map(v => Math.round(v / np).toString(16).padStart(2, '0')).join('');
        // (see-through textures: TAVG -1, drawn by their rects only; AVGC keeps the colour)
        AVGC.push(col(avg));
        L.TAVG.push(clear ? -1 : col(avg));
        L.TBASE.push(base ? col(p[base]) : -1);
        const rs = rectsOf(g, (ch) => ch !== '.' && ch !== base, (ch) => col(p[ch]));
        const [r0, rn] = putRects(rs);
        L.TR0.push(r0); L.TRN.push(rn); L.TRF.push(Math.min(rn, clear ? 4 : 5));
    }
    // cracks: stage s shows the cells of digit <= s
    L.CK0 = []; L.CKN = [];
    const crackC = col('1a1a1a');
    for (let s = 1; s <= 9; s++) {
        const g = CRACK.map(r => r.split('').map(ch => (ch !== '.' && Number(ch) <= s ? 'k' : '.')).join(''));
        const [r0, rn] = putRects(rectsOf(g, (ch) => ch === 'k', () => crackC));
        L.CK0.push(r0); L.CKN.push(rn);
    }

    // items by name
    const names = new Map();
    BLOCKS.forEach((b) => { if (b) names.set(b.n, b.id); });
    ITEMS.forEach((it) => names.set(it.n, it.id));
    TIERS.forEach((t, ti) => KINDS.forEach((k, ki) => names.set(k.n + t.n, toolId(ki, ti))));
    const idOf = (n) => { if (typeof n === 'number') return n; if (n === '_') return 0; if (!names.has(n)) throw new Error('item ' + n); return names.get(n); };

    // blocks
    const B = { BSOL: [], BHC: [], BLOP: [], BSHP: [], BHARD: [], BTOOL: [], BTIER: [], BDROP: [], BDROPN: [], BLIT: [], BTT: [], BTS: [], BTB: [], BLEAF: [] };
    for (let id = 0; id < NBLOCK; id++) {
        const b = BLOCKS[id];
        if (!b) { B.BSOL.push(0); B.BHC.push(0); B.BLOP.push(0); B.BSHP.push(0); B.BHARD.push(0); B.BTOOL.push(0); B.BTIER.push(-1); B.BDROP.push(0); B.BDROPN.push(0); B.BLIT.push(0); B.BTT.push(1); B.BTS.push(1); B.BTB.push(1); B.BLEAF.push(0); continue; }
        const shape = b.shape || 0;
        const flat = shape === 1 || shape === 2;
        B.BSOL.push(b.solid ?? (flat ? 0 : 1));
        B.BHC.push(b.hide ?? (flat ? 0 : 1));
        B.BLOP.push(b.lop ?? (flat ? 0 : 1));
        B.BSHP.push(shape);
        B.BHARD.push(b.hard);
        B.BTOOL.push(b.tool || 0);
        B.BTIER.push(b.tier ?? -1);
        B.BDROP.push(b.drop === 'none' ? 0 : b.drop ? idOf(b.drop) : id);
        B.BDROPN.push(b.dropN || 1);
        B.BLIT.push(b.light || 0);
        const t = b.t.map(texIx);
        B.BTT.push(t[0]); B.BTS.push(t[1] ?? t[0]); B.BTB.push(t[2] ?? t[0]);
        B.BLEAF.push(b.leaf || 0);
    }
    Object.assign(L, B);

    // items
    const I = { ITNAME: [], ITK: [], ITST: [], ITFOOD: [], ITFUEL: [], ITTK: [], ITTT: [], ITDUR: [], ITDMG: [], ITISO: [], IC0: [], ICN: [], ITC1: [], ITC2: [] };
    const SMELTT = 8;
    const iconOf = (grid, p) => putRects(rectsOf(grid, (ch) => ch !== '.', (ch) => col(p[ch])));
    const iconCol = (grid, p) => { const c = {}; for (const r of grid) for (const ch of r) if (ch !== '.') c[ch] = (c[ch] || 0) + 1; return col(p[Object.entries(c).sort((a, b) => b[1] - a[1])[0][0]]); };
    const TORCH = { g: ['...yy...', '...yo...', '...bb...', '...bb...', '...bb...', '...bb...', '...bb...', '........'], p: { y: 'ffd040', o: 'f08020', b: '7a5a30' } };
    for (let id = 0; id < NITEM; id++) {
        const b = id < NBLOCK ? BLOCKS[id] : null;
        const it = ITEMS.find(x => x.id === id);
        const tool = id >= TOOL0 ? { kind: Math.floor((id - TOOL0) / 4), tier: (id - TOOL0) % 4 } : null;
        let name = '', k = 1, st = 64, food = 0, fuel = 0, tk = -1, tt = -1, dur = 0, dmg = 1, iso = 0, ic = [0, 0], c1 = col('ff00ff'), c2 = c1;
        if (b) {
            name = b.ko; k = 0;
            fuel = { planks: 15, logOak: 15, logBirch: 15, logSpruce: 15, craft: 15, chest: 15, sapling: 5 }[b.n] || 0;
            const shape = b.shape || 0;
            if (shape === 0 || shape === 3 || shape === 4) iso = 1;
            else if (b.n === 'torch') ic = iconOf(TORCH.g, TORCH.p);
            else { const T = TEX[b.t[0]]; ic = iconOf(T.g, T.p); }
            c1 = AVGC[B.BTT[id] - 1]; c2 = AVGC[B.BTS[id] - 1];
            if (b.n === 'torch') { c1 = col('ffd040'); c2 = col('7a5a30'); }
        } else if (it) {
            name = it.ko; food = it.food || 0; fuel = it.fuel || 0; k = food ? 2 : 1;
            ic = iconOf(it.icon, it.p); c1 = c2 = iconCol(it.icon, it.p);
        } else if (tool) {
            const T = TIERS[tool.tier], K = KINDS[tool.kind];
            name = `${T.ko} ${K.ko}`; k = 3; st = 1; tk = tool.kind; tt = tool.tier; dur = T.dur; dmg = K.dmg[tool.tier];
            const p = { h: T.col, d: '7a5a30' };
            ic = iconOf(K.icon, p); c1 = c2 = col(T.col);
        }
        I.ITNAME.push(name || ' '); I.ITK.push(k); I.ITST.push(st); I.ITFOOD.push(food); I.ITFUEL.push(fuel / 10 * SMELTT);
        I.ITTK.push(tk); I.ITTT.push(tt); I.ITDUR.push(dur); I.ITDMG.push(dmg); I.ITISO.push(iso); I.IC0.push(ic[0]); I.ICN.push(ic[1]); I.ITC1.push(c1); I.ITC2.push(c2);
    }
    Object.assign(L, I);
    L.TSPEED = TIERS.map(t => t.speed);

    // HUD pictures
    const HUD = [
        [['.kk.kk..', 'kddkddk.', 'kdddddk.', 'kdddddk.', '.kdddk..', '..kdk...', '...k....', '........'], { k: '1a1a1a', d: '3a3a3a' }],
        [['........', '.rr.rr..', '.rwrrr..', '.rrrrr..', '..rrr...', '...r....', '........', '........'], { r: 'e01818', w: 'ff9090' }],
        [['........', '.rr.....', '.rwr....', '.rrr....', '..rr....', '...r....', '........', '........'], { r: 'e01818', w: 'ff9090' }],
        [['......kk', '.....kdk', '..kkkdk.', '.kddddk.', 'kdddddk.', 'kdddk...', '.kkk....', '........'], { k: '1a1a1a', d: '3a3a3a' }],
        [['........', '......w.', '...bbw..', '..bbbb..', '.bbbbb..', '.bbb....', '........', '........'], { b: 'b06a30', w: 'f0e0c0' }],
        [['........', '........', '........', '..bb....', '.bbb....', '.bbb....', '........', '........'], { b: 'b06a30' }],
        [['........', '..bbb...', '.bwbbb..', '.bbbbb..', '.bbbbb..', '..bbb...', '........', '........'], { b: '4a8ae0', w: 'e0f0ff' }],
    ];
    L.HI0 = []; L.HIN = [];
    for (const [g, p] of HUD) { const [r0, rn] = iconOf(g, p); L.HI0.push(r0); L.HIN.push(rn); }

    // recipes
    L.RW = []; L.RH = []; L.RM = []; L.RC = []; L.ROUT = []; L.RCNT = [];
    for (const r of RECIPES) {
        const rows = r.r.map(row => row.split(' '));
        const h = rows.length, w = Math.max(...rows.map(x => x.length));
        L.RW.push(w); L.RH.push(h); L.RM.push(r.m ? 1 : 0); L.ROUT.push(idOf(r.out)); L.RCNT.push(r.n);
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) L.RC.push(i < h && j < w ? idOf(rows[i][j] || '_') : 0);
    }
    L.SMI = SMELT.map(s => idOf(s[0])); L.SMO = SMELT.map(s => idOf(s[1]));

    // mobs
    L.MHP = []; L.MW = []; L.MH = []; L.MSPD = []; L.MHOST = []; L.MBURN = []; L.MDMG = []; L.MNAME = []; L.MB0 = []; L.MBN = []; L.MD0 = []; L.MDN = [];
    L.BX0 = []; L.BY0 = []; L.BZ0 = []; L.BX1 = []; L.BY1 = []; L.BZ1 = []; L.BCOL = []; L.BPART = [];
    L.MDI = []; L.MDLO = []; L.MDHI = [];
    for (const m of MOBS.slice(1)) {
        L.MHP.push(m.hp); L.MW.push(m.w); L.MH.push(m.h); L.MSPD.push(m.speed); L.MHOST.push(m.hostile || 0); L.MBURN.push(m.burns || 0); L.MDMG.push(m.dmg || 0); L.MNAME.push(m.ko);
        L.MB0.push(L.BX0.length + 1); L.MBN.push(m.boxes.length);
        for (const [x0, y0, z0, x1, y1, z1, c, part] of m.boxes) { const t = (v) => Math.round(v * 10); L.BX0.push(t(x0)); L.BY0.push(t(y0)); L.BZ0.push(t(z0)); L.BX1.push(t(x1)); L.BY1.push(t(y1)); L.BZ1.push(t(z1)); L.BCOL.push(col(c)); L.BPART.push(part); }
        L.MD0.push(L.MDI.length + 1); L.MDN.push(m.drop.length / 3);
        for (let i = 0; i < m.drop.length; i += 3) { L.MDI.push(idOf(m.drop[i])); L.MDLO.push(m.drop[i + 1]); L.MDHI.push(m.drop[i + 2]); }
    }

    // brightness: light level x face direction -> one of 24 steps (x0.02 .. x1, geometric)
    const LF = (l) => 0.04 + 0.96 * Math.pow(l / 15, 1.5);
    const DF = [0.6, 0.6, 0.5, 1.0, 0.8, 0.8, 0.85, 1.0];
    L.KF = []; for (let k = 0; k < 24; k++) L.KF.push(Math.round(0.02 * Math.pow(50, k / 23) * 10000) / 10000);
    L.BIDX = [];
    for (let l = 0; l < 16; l++) for (let d = 0; d < 8; d++) {
        const f = LF(l) * DF[d];
        L.BIDX.push(Math.max(0, Math.min(23, Math.round(23 * Math.log(f / 0.02) / Math.log(50)))));
    }
    // stars and clouds
    let s = 12345; const rnd = () => (s = (s * 48271) % 2147483647) / 2147483647;
    L.STARX = []; L.STARY = []; L.STARZ = []; L.STARS = [];
    while (L.STARX.length < 70) {
        const x = rnd() * 2 - 1, y = rnd(), z = rnd() * 2 - 1, l = Math.hypot(x, y, z);
        if (l > 1 || l < 0.2 || y / l < 0.08) continue;
        L.STARX.push(+(x / l).toFixed(4)); L.STARY.push(+(y / l).toFixed(4)); L.STARZ.push(+(z / l).toFixed(4)); L.STARS.push(rnd() < 0.2 ? 1.1 : 0.6);
    }
    const cl = []; for (let i = 0; i < 32 * 32; i++) cl.push(0);
    for (let k = 0; k < 40; k++) { const cx = Math.floor(rnd() * 32), cz = Math.floor(rnd() * 32), w = 1 + Math.floor(rnd() * 4), h = 1 + Math.floor(rnd() * 3); for (let a = 0; a < w; a++) for (let b = 0; b < h; b++) cl[((cx + a) % 32) * 32 + (cz + b) % 32] = 1; }
    L.CLOUD = cl;

    L.PAL = [];
    for (let id = 1; id < NBLOCK; id++) if (BLOCKS[id] && id !== 6) L.PAL.push(id);
    L.PAL.push(6);
    for (let id = 100; id < NITEM; id++) if (I.ITNAME[id] && I.ITNAME[id] !== ' ') L.PAL.push(id);
    L.KIT = [2, 3, 1, 4, 5, 13, 15, 27, 39].map(Number);
    L.BNAMES = ['바다', '해변', '평원', '숲', '사막', '타이가', '설원', '산', '얼어붙은 바다'];
    L.TITLEB = [2, 13, 4, 16, 17];

    // the colour list last (everything above added to it)
    const extra = { CTORCH: col('7a5a30'), CFLAME: col('ffc830'), CCLOUD: col('ffffff'), CHURT: col('e83a3a'), CARROW: col('8a7a5a'), CSKIN: col('c8a080') };
    L.COLR = cols.map(h => rgbOf(h)[0]); L.COLG = cols.map(h => rgbOf(h)[1]); L.COLB = cols.map(h => rgbOf(h)[2]);
    Object.assign(L, R);
    const C = { ...extra, NCOL: cols.length, NREC: RECIPES.length, TDIRT: texIx('dirt') };
    return { L, C };
}

// ------------------------------------------------------------------ sources
export const FILES = ['world.js', 'mesh.js', 'render.js', 'player.js', 'mobs.js', 'items.js', 'hud.js', 'main.js', 'test.js'];
export function allConsts(more = {}) {
    const { C } = makeData();
    return { ...consts, ...C, ...more };
}
export function sources(C) {
    const { L } = makeData();
    const files = C.TESTRUN || C.SIMRUN ? FILES : FILES.filter(f => f !== 'test.js');
    const stub = files.includes('test.js') ? '' : '\nfunction testStep() { }\n';
    const lit = (v) => typeof v === 'string' ? JSON.stringify(v) : (Number.isFinite(v) ? String(v) : (() => { throw new Error('bad ' + v); })());
    const data = Object.entries(L).map(([k, v]) => `let ${k} = [${v.map(lit).join(', ')}];`).join('\n');
    const raw = data + '\n' + files.map(f => fs.readFileSync(path.join(HERE, 'src', f), 'utf8')).join('\n') + stub;
    const { src, count } = expandMacros(raw);
    return { src: declareImplicit(src), count };
}

const DOT = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const textBox = (id, x, y, width, height, fontSize, more = {}) => ({
    id, name: id, objectType: 'textBox', text: ' ',
    entity: { x, y, colour: '#ffffff', bgColor: 'transparent', font: `${fontSize}px Nanum Gothic Coding`, textAlign: 0, lineBreak: true,
        bold: false, underLine: false, strike: false, italic: false, fontSize, width, height, visible: true, ...more },
});

export function buildProject(out, { name = `${NAME} v${VERSION}`, more = {} } = {}) {
    const C = allConsts(more);
    const { src, count } = sources(C);
    const cc = { ...C }; delete cc.LEGACY; delete cc.SLIM;
    const prog = compileProgram([src], { consts: cc, plainNumbers: false, skipZeroInit: true });
    if (C.LEGACY) legacyMath(prog);
    if (C.SLIM) slimBlocks(prog);
    const objects = [
        { ...textBox('txt', 0, 0, 1000, 28, 20, { textAlign: 1, font: '20px Nanum Gothic Coding' }), text: '​', script: prog.objectScripts.txt || [] },
        { id: 'pen', name: 'pen', pictures: [{ id: 'p1', name: 'dot', buf: DOT, w: 1, h: 1 }], script: prog.objectScripts.pen, sounds: makeSounds() },
    ];
    for (const k of Object.keys(prog.objectScripts)) if (!objects.some(o => o.id === k)) throw new Error('script for an unknown object: ' + k);
    const project = packEnt(out, { name, tmpDir: path.join(HERE, '.pack'), variables: prog.variables, functions: prog.functions, messages: prog.messages, objects, speed: 60 });
    const big = prog.variables.filter(v => v.variableType === 'list' && v.array.length > 5000).map(v => v.name + ':' + v.array.length);
    if (big.length) throw new Error('lists past 5000 items: ' + big);
    const blocks = prog.functions.reduce((a, f) => a + f.content.split('"type"').length - 1, 0) + JSON.stringify(objects.map(o => o.script)).split('"type"').length - 1;
    return { project, src, C, stats: { macros: count, globals: prog.variables.filter(v => v.variableType === 'variable').length, lists: prog.variables.filter(v => v.variableType === 'list').length, functions: prog.functions.length, blocks, json: JSON.stringify(project).length, bytes: fs.statSync(out).size } };
}

if (process.argv[1] && import.meta.url === url.pathToFileURL(path.resolve(process.argv[1])).href) {
    const out = process.argv[2] || path.join(HERE, 'vox.ent');
    const more = Object.fromEntries(process.argv.slice(3).filter(a => a.includes('=')).map(a => a.split('=')).map(([k, v]) => [k, Number(v)]));
    console.log('wrote', out, JSON.stringify(buildProject(out, { more }).stats));
}
