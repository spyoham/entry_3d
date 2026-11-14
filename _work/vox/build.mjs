// Build 블록 월드: blocks.mjs + content.mjs + models.mjs (data) -> lists, src/*.js (EJS) -> .ent
// usage: node build.mjs [out.ent] [K=V ...]
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { compileProgram } from './ejs.mjs';
import { expandMacros, declareImplicit } from './inline.mjs';
import { packEnt } from './pack.mjs';
import { legacyMath, slimBlocks } from './legacy.mjs';
import { TEX, CRACK, BLOCKS, NBLOCK, ITEMS, TIERS, KINDS, SMITH, toolId, NITEM, RECIPES, SMELT, MOBS, ARMT, ARMP, armorId, CATS } from './blocks.mjs';
import { MODELS, ARMS, ARMCOL, pottedModel } from './models.mjs';
import { makeSounds } from './sounds.mjs';
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
export const VERSION = '3.0.1';
// how many servers Entry Sync holds (each one two ?! lists; the slot line carries the number in two digits)
export const NSRV = 99;
export const NAME = '블록 월드';

// the ring window of loaded chunks: NCH x NCH slots of 16 x 16 columns; chunks are made within
// CR chunks of the player (2 CR + 1 < NCH keeps a free row of slots between the two ends)
const NCH = 10, WS = NCH * 16, WY = 128, CR = 4;
function chunkOffsets(r) {
    const o = [];
    for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) if (dx * dx + dz * dz <= r * r) o.push([dx, dz]);
    return o.sort((a, b) => (a[0] ** 2 + a[1] ** 2) - (b[0] ** 2 + b[1] ** 2));
}
export const consts = {
    WS, NCH, CR, WY, UH: 64, SEA: 30, LAVAY: 5, NSX: WS / 8, NSY: WY / 8, NSEC: (WS / 8) * (WS / 8) * (WY / 8), SXS: WS * WY, OFF: 32768,
    NOFF: chunkOffsets(CR).length, CVN: 24, FORTY: 30, NSTART: chunkOffsets(2).length,
    NEARZ: Math.round(0.05 * 256 * 16384), DEC2: 20, PLANT2: 225, CLOUDY: 110, MK: 160 * 1048576,
    NMOB: 48, NITM: 64, NARR: 24, NFUR: 32, NCHEST: 256, ANIMALS: 36, SMELTT: 8, NTX: 145, NTX0: 123,
    SPAWNC: 0, BENCH: 0, NOCAVE: 0, AUTOSEED: 0, AUTOMODE: 0, TESTRUN: 0, SIMRUN: 0, LEGACY: 0, SLIM: 1, SPLIT: 0,
};

// what F does on a block, how it is put down, what it must stand on, how it moves a body
const USE = { rs: 25, none: 0, craft: 1, furnace: 2, chest: 3, smith: 4, shell: 5, door: 6, trapdoor: 7, gate: 8, lever: 9, button: 10, bed: 11, sign: 12, note: 13, cake: 14, compost: 15, repair: 16, bell: 17, pot: 18, command: 19, campfire: 20, enchant: 21, lodestone: 22, anchor: 23, voidchest: 24, beacon: 26 };
const PLACE = { none: 0, axis: 1, stairs: 2, slab: 3, door: 4, trapdoor: 5, gate: 6, bed: 7, ladder: 8, rail: 9 };
const RS = { none: 0, wire: 1, repeater: 2, comparator: 3, torch: 4, lever: 5, button: 6, plate: 7, block: 8, sensor: 9, observer: 10, piston: 11, head: 12, lamp: 13, tnt: 14, door: 15, note: 16, command: 17, target: 18, dispenser: 19, moving: 20, bell: 21, trapped: 22, hook: 23, trip: 24, rail: 25 };
const NEED = { none: 0, soil: 1, floor: 2, below: 3, torch: 4, ashen: 5, farm: 6, reed: 7, water: 8, any: 9, dark: 10 };
const TAGS = { planks: 1, logs: 2, wool: 3, stonecraft: 4 };

// ------------------------------------------------------------------ data -> lists
let cache = null;
export function makeData() {
    if (cache) return cache;
    const L = {};
    const cols = [], colIx = new Map();
    const col = (hex) => { hex = hex.toLowerCase().replace('#', ''); if (!colIx.has(hex)) { colIx.set(hex, cols.length); cols.push(hex); } return colIx.get(hex) * 192; };
    const rgbOf = (h) => [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
    // colours of the textures are snapped to a grid of 10 a channel (the table is 192 entries a colour)
    const snap = (h) => rgbOf(h).map(v => Math.min(255, Math.round(v / 10) * 10).toString(16).padStart(2, '0')).join('');
    const R = { RU0: [], RV0: [], RU1: [], RV1: [], RCOL: [] };
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
        const avg = np ? sum.map(v => Math.round(v / np).toString(16).padStart(2, '0')).join('') : '808080';
        AVGC.push(col(snap(avg)));
        L.TAVG.push(clear ? -1 : col(snap(avg)));
        L.TBASE.push(base ? col(snap(p[base])) : -1);
        const rs = rectsOf(g, (ch) => ch !== '.' && ch !== base, (ch) => col(snap(p[ch])));
        const [r0, rn] = putRects(rs);
        L.TR0.push(r0); L.TRN.push(rn); L.TRF.push(Math.min(rn, clear ? 4 : 5));
    }
    L.CK0 = []; L.CKN = [];
    const crackC = col('1a1a1a');
    for (let s = 1; s <= 9; s++) {
        const g = CRACK.map(r => r.split('').map(ch => (ch !== '.' && Number(ch) <= s ? 'k' : '.')).join(''));
        const [r0, rn] = putRects(rectsOf(g, (ch) => ch === 'k', () => crackC));
        L.CK0.push(r0); L.CKN.push(rn);
    }

    // tools and armour by id
    const toolOf = new Map(), armOf = new Map();
    TIERS.forEach((t, ti) => KINDS.forEach((k, ki) => { if (t.smith && ki === 4 && false) return; toolOf.set(toolId(ki, ti), { kind: ki, tier: ti }); }));
    ARMT.forEach((t, ti) => ARMP.forEach((a, ai) => armOf.set(armorId(ti, ai), { tier: ti, piece: ai })));

    // names
    const names = new Map();
    BLOCKS.forEach((b) => { if (b) names.set(b.n, b.id); });
    ITEMS.forEach((it) => names.set(it.n, it.id));
    TIERS.forEach((t, ti) => KINDS.forEach((k, ki) => names.set(k.n + t.n, toolId(ki, ti))));
    ARMT.forEach((t, ti) => ARMP.forEach((a, ai) => names.set(a.n + t.n, armorId(ti, ai))));
    const idOf = (n) => {
        if (typeof n === 'number') return n; if (n === '_' || n === 'none') return 0;
        if (n[0] === '#') { if (!TAGS[n.slice(1)]) throw new Error('tag ' + n); return -TAGS[n.slice(1)]; }
        if (!names.has(n)) throw new Error('item ' + n); return names.get(n);
    };

    // models: boxes (1/16), a texture of their own or the block's, crossed quads
    const MB = { MBX0: [], MBY0: [], MBZ0: [], MBX1: [], MBY1: [], MBZ1: [], MBT: [], MBQ: [] };
    const CB = { CBX0: [], CBY0: [], CBZ0: [], CBX1: [], CBY1: [], CBZ1: [] };
    L.MD0 = []; L.MDN = [];
    const modelIx = new Map();
    const putModel = (m) => {
        const i0 = MB.MBX0.length + 1;
        for (const b of m.boxes) {
            MB.MBX0.push(b[0]); MB.MBY0.push(b[1]); MB.MBZ0.push(b[2]); MB.MBX1.push(b[3]); MB.MBY1.push(b[4]); MB.MBZ1.push(b[5]);
            MB.MBT.push(b[6] ? texIx(b[6]) : 0); MB.MBQ.push(b[7] === 'X' ? 1 : 0);
        }
        L.MD0.push(i0); L.MDN.push(m.boxes.length);
        return L.MD0.length;
    };
    const putCol = (boxes) => { const i0 = CB.CBX0.length + 1; for (const b of boxes) { CB.CBX0.push(b[0]); CB.CBY0.push(b[1]); CB.CBZ0.push(b[2]); CB.CBX1.push(b[3]); CB.CBY1.push(b[4]); CB.CBZ1.push(b[5]); } return [i0, boxes.length]; };
    for (const [n, m] of Object.entries(MODELS)) modelIx.set(n, putModel(m));
    // the arms: model index ARMM[conn * 4 + side]
    L.ARMM = []; L.ARMC = [];
    for (let c = 1; c <= 4; c++) for (let s = 0; s < 4; s++) { L.ARMM.push(putModel({ boxes: ARMS[c][s] })); L.ARMC.push(putCol([ARMCOL[c][s]])[0]); }
    // (v2.7) stairs' corners as the genre's: STRM[((half * 4 + f) * 4 + f2) * 2 + inner + 1] the model
    // (outer: a quarter on top toward f and f2; inner: the half toward f and the quarter toward f2 on
    // the low side), 0 when f2 is not across f
    {
        const STEP = [[0, 8, 16, 16], [8, 0, 16, 16], [0, 0, 16, 8], [0, 0, 8, 16]];
        const quarter = (a, b) => [Math.max(STEP[a][0], STEP[b][0]), Math.max(STEP[a][1], STEP[b][1]), Math.min(STEP[a][2], STEP[b][2]), Math.min(STEP[a][3], STEP[b][3])];
        L.STRM = [];
        for (let h = 0; h < 2; h++) for (let f = 0; f < 4; f++) for (let f2 = 0; f2 < 4; f2++) for (let inner = 0; inner < 2; inner++) {
            if (f % 2 === f2 % 2) { L.STRM.push(0); continue; }
            const base = h ? [0, 8, 0, 16, 16, 16] : [0, 0, 0, 16, 8, 16], y0 = h ? 0 : 8, y1 = h ? 8 : 16;
            const boxes = [base];
            if (inner) { const s = STEP[f], q = quarter((f + 2) % 4, f2); boxes.push([s[0], y0, s[1], s[2], y1, s[3]], [q[0], y0, q[1], q[2], y1, q[3]]); }
            else { const q = quarter(f, f2); boxes.push([q[0], y0, q[1], q[2], y1, q[3]]); }
            L.STRM.push(putModel({ boxes }));
        }
    }

    // blocks
    const B = {};
    const BL = ['BSOL', 'BHC', 'BLOP', 'BSHP', 'BHARD', 'BTOOL', 'BTIER', 'BDROP', 'BDROPN', 'BLIT', 'BTT', 'BTS', 'BTB', 'BLEAF', 'BMDL', 'BCONN', 'BCB0', 'BCBN', 'BTALL',
        'BKIND', 'BVAR', 'BUSE', 'BPLC', 'BNEED', 'BMOVE', 'BHURT', 'BFALL', 'BFLAME', 'BCROP', 'BSPEC', 'BWET', 'BSTRIP', 'BTREE', 'BSAP', 'BXP', 'BHALF', 'BSIDE', 'BFACE', 'BSPAWN', 'BPOT', 'BWATER', 'BSTATE', 'BXT', 'BRS', 'BFAC', 'BON', 'BAUX', 'BATT', 'BJE', 'BRES', 'BFLAM', 'BCOND'];
    for (const k of BL) B[k] = [];
    B.BT6 = [];
    const spawnOf = Object.fromEntries(MOBS.map((m, i) => [m ? m.n : "", i]));
    const potOf = new Map();
    for (const b of BLOCKS) if (b && b.plant) potOf.set(names.get(b.plant), b.id);
    for (let id = 0; id < NBLOCK; id++) {
        const b = BLOCKS[id];
        if (!b) {
            for (const k of BL) B[k].push(k === 'BTIER' ? -1 : (k === 'BTT' || k === 'BTS' || k === 'BTB' ? 1 : 0));
            B.BKIND[id] = id; B.BCROP[id] = -1; B.BTREE[id] = -1; B.BFAC[id] = -1; B.BATT[id] = -1;
            for (let d = 0; d < 6; d++) B.BT6.push(1);
            continue;
        }
        const shape = b.shape || 0;
        const flat = shape === 1 || shape === 2;
        const model = b.model ? (typeof b.model === 'object' ? putModel(pottedModel(b.model.potted)) : modelIx.get(b.model)) : 0;
        if (b.model && !model) throw new Error('model ' + b.model);
        let sol = b.solid ?? (flat ? 0 : 1);
        let cb = [0, 0];
        if (shape === 5) {
            const m = typeof b.model === 'object' ? pottedModel(b.model.potted) : MODELS[b.model];
            if (b.solid === 0 || m.col === 'none') sol = 0;
            else { sol = 2; cb = putCol(m.col); }
        }
        B.BSOL.push(sol);
        B.BHC.push(b.hide ?? (flat ? 0 : 1));
        B.BLOP.push(b.lop ?? (flat ? 0 : 1));
        B.BSHP.push(shape);
        // (v2.7) as 1.16.5: these need a pickaxe to drop; wooden doors and trapdoors 3, smooth stone 2
        const nm0 = (BLOCKS[b.item ? idOf(b.item) : id] || b).n || '';
        let hard = b.hard, tier = b.tier ?? -1;
        if (b.tool === 2 && /Door$|Trapdoor$/.test(nm0)) hard = 3;
        if (nm0 === 'smoothStone' || nm0 === 'smoothStoneSlab') hard = 2;
        if (tier < 0 && ['grindstone', 'stonecutter', 'cauldron', 'bell', 'lantern', 'wailLantern', 'ironBars', 'chain', 'ironDoor', 'ironTrapdoor', 'spawner', 'hopper', 'brewingStand', 'blastFurnace', 'furnace'].includes(nm0)) tier = 0;
        B.BHARD.push(hard);
        B.BTOOL.push(b.tool || 0);
        B.BTIER.push(tier);
        B.BDROP.push(b.drop === 'none' ? 0 : b.drop ? idOf(b.drop) : (b.item ? idOf(b.item) : id));
        B.BDROPN.push(b.dropN || 1);
        B.BLIT.push(b.light || 0);
        const t3 = b.t ? b.t.map(texIx) : null;
        const t6 = b.t6 ? b.t6.map(texIx) : [t3[1] ?? t3[0], t3[1] ?? t3[0], t3[2] ?? t3[0], t3[0], t3[1] ?? t3[0], t3[1] ?? t3[0]];
        B.BTT.push(t6[3]); B.BTS.push(b.t6 ? t6[5] : t6[0]); B.BTB.push(t6[2]);
        for (let d = 0; d < 6; d++) B.BT6.push(t6[d]);
        B.BLEAF.push(b.leaf || 0);
        B.BMDL.push(model); B.BCONN.push(b.conn || 0); B.BCB0.push(cb[0]); B.BCBN.push(cb[1]);
        B.BTALL.push(b.conn === 1 || b.conn === 2 || (b.model && String(b.model).startsWith('gate_')) ? 1 : 0);
        const kind = b.item ? idOf(b.item) : id;
        B.BKIND.push(kind); B.BVAR.push(id - kind); B.BSTATE.push(b.item && !b.plant && !b.spawns ? 1 : 0);
        B.BUSE.push(USE[b.use || 'none']); B.BPLC.push(PLACE[b.place || 'none']); B.BNEED.push(NEED[b.need || 'none']);
        // 1 climb, 2 slow (sand), 3 web, 4 bounce, 5 slip, 6 slip more, 7 honey
        let mv = 0;
        if (b.climb) mv = 1; if (b.slow === 1) mv = 2; if (b.slow === 2) mv = 3; if (b.bounce) mv = 4; if (b.slip === 1) mv = 5; if (b.slip === 2) mv = 6; if (b.n === 'honeyBlock') mv = 7;
        B.BMOVE.push(mv); B.BHURT.push(b.hurt || 0); B.BFALL.push(b.fall || 0);
        B.BFLAME.push(b.flame ? col(b.flame) : (shape === 2 ? col('ffc830') : 0));
        B.BCROP.push(b.crop ?? -1);
        // 1 tnt, 2 lamp off, 3 lamp on, 4 wire, 5 plate, 6 spawner, 7 sponge, 8 gives power, 9 sensor, 10 fire, 11 flower
        let sp = 0;
        if (b.tnt) sp = 1; if (b.lamp === 1) sp = 2; if (b.lamp === 2) sp = 3; if (b.wire) sp = 4; if (b.plate) sp = 5; if (b.spawns) sp = 6; if (b.sponge) sp = 7; if (b.power) sp = 8; if (b.sensor) sp = 9; if (b.fire) sp = 10;
        B.BSPEC.push(sp);
        B.BWET.push(b.wet ? idOf(b.wet) : (b.dies ? idOf(b.dies) : 0));
        B.BSTRIP.push(b.strip ? idOf(b.strip) : 0);
        B.BTREE.push(b.tree ?? -1);
        B.BSAP.push(b.sapling ? idOf(b.sapling) : 0);
        B.BXP.push(b.xp || 0);
        B.BHALF.push(b.half ?? 0); B.BSIDE.push(b.side ?? b.face ?? 0); B.BFACE.push(b.face ?? 0);
        B.BSPAWN.push(b.spawns ? spawnOf[b.spawns] : 0);
        B.BPOT.push(potOf.get(id) || 0);
        B.BWATER.push(b.water || 0);
        B.BXT.push(b.flameTex ? texIx(b.flameTex) : t6[0]);
        // spark power: the role (RS), the facing / the side it hangs on (D6, -1 none), on, a value
        // (wire power, repeater delay, comparator subtract, button time, sticky, dropper), and
        // whether the block carries power (a full opaque cube that is not itself a part)
        let rs = RS[b.rs || 'none'];
        if (rs === undefined) throw new Error('rs ' + b.rs);
        if (!rs && b.plate) rs = RS.plate;
        if (!rs && (b.place === 'door' || b.place === 'trapdoor' || b.place === 'gate')) rs = RS.door;
        B.BRS.push(rs); B.BFAC.push(b.fac ?? -1); B.BON.push(b.on || 0); B.BAUX.push(b.aux || 0); B.BATT.push(b.att ?? -1);
        B.BCOND.push(shape === 0 && sol === 1 && (b.hide ?? 1) === 1 && !b.leaf && (!rs || rs === RS.lamp || rs === RS.tnt || rs === RS.note || rs === RS.command || rs === RS.target || rs === RS.dispenser) && id > 0 ? 1 : 0);
        // (v2.7) as 1.16.5: BJE 1 a log (keeps leaves), 2 replaceable (a block put takes its place),
        // 4 washed away by water and lava; BRES blast resistance; BFLAM catch x 1000 + burn
        const kb = BLOCKS[kind] || b, nm = kb.n || '', key = kb.key || '';
        let je = 0;
        if (b.tool === 2 && /(^log|Log$|Wood$)/.test(nm)) je |= 1;
        if (['tallGrass', 'fern', 'deadBush', 'seagrass', 'vines', 'fire', 'wailFire', 'emberRoots', 'indigoRoots', 'ashSprouts'].includes(nm)) je |= 2;
        if ([RS.wire, RS.repeater, RS.comparator, RS.torch, RS.lever, RS.button, RS.rail, RS.hook, RS.trip].includes(rs)) je |= 4;
        B.BJE.push(je);
        let res = b.hard;
        if (b.hard < 0) res = 3600000;
        else if (b.liquid || nm === 'water' || nm === 'lava') res = 100;
        else if (['obsidian', 'glintObsidian', 'debris', 'anvil', 'anvilChipped', 'anvilDamaged', 'enchantTable', 'anchor', 'blockAbyss'].includes(nm)) res = 1200;
        else if (nm === 'voidChest') res = 600;
        else if (nm === 'voidStone' || /^voidBricks/.test(nm)) res = 9;
        else if (/_ore$/.test(key)) res = 3;
        else if (b.tool === 1 && b.hard >= 1.5 && b.hard <= 2.5) res = 6;
        else if (b.tool === 1 && b.hard === 5) res = 6;
        else if (/Terracotta$|^terracotta$/.test(nm)) res = 4.2;
        else if (b.tool === 2 && /Planks$|^planks$|Slab$|Stairs$|Fence$|Gate$/.test(nm)) res = 3;
        B.BRES.push(res);
        // flammability as the genre (catch: how readily fire comes to it, burn: how readily it burns away)
        let fl = [0, 0];
        const wood = b.tool === 2 && !/^ember|^indigo/.test(nm) && !b.bed;
        if (wood && /(^log|Log$|Wood$)/.test(nm)) fl = [5, 5];
        else if (wood && /Planks$|^planks$|Slab$|Stairs$|Fence$|Gate$/.test(nm)) fl = [5, 20];
        else if (b.leaf) fl = [30, 60];
        else if (/Wool$|^wool$/.test(nm)) fl = [30, 60];
        else if (/Carpet$/.test(nm)) fl = [60, 20];
        else if (nm === 'bookshelf' || nm === 'lectern') fl = [30, 20];
        else if (nm === 'tnt') fl = [15, 100];
        else if (nm === 'hayBale' || nm === 'bamboo' || nm === 'scaffolding') fl = [60, 60];
        else if (nm === 'vines') fl = [15, 100];
        else if (nm === 'target' || nm === 'composter' || nm === 'beehive' || nm === 'beeNest') fl = [5, 20];
        else if (nm === 'blockCoal') fl = [5, 5];
        else if (nm === 'kelpBlock') fl = [30, 60];
        else if (shape === 1 && !b.crop && !/Coral|Fan|Sapling|^sapling|^mush|reed|kelp|seagrass|cobweb|fire|Fire|Roots|Sprouts|Vines|ember|indigo/.test(nm)) fl = [60, 100];
        B.BFLAM.push(fl[0] * 1000 + fl[1]);
    }
    // (v2.5) the note block's instrument by the block under it (BINST: 0 harp .. 15 pling, as the genre)
    B.BINST = [];
    for (let id = 0; id < NBLOCK; id++) {
        const b = BLOCKS[id]; let r = 0;
        if (b) {
            const k = b.key || b.n || '', t = b.tool || 0;
            if (t === 2) r = 1; if (t === 1) r = 4; if (b.fall || /gravel|concrete_powder/.test(k) || k === 'sand') r = 2;
            if (/glass|aqua_lantern/.test(k)) r = 3;
            if (k === 'gold_block') r = 5; if (k === 'clay') r = 6; if (k === 'packed_ice') r = 7; if (/_wool$/.test(k)) r = 8;
            if (k === 'bone_block') r = 9; if (k === 'iron_block') r = 10; if (k === 'ash_sand') r = 11; if (/pumpkin/.test(k)) r = 12;
            if (k === 'jade_block') r = 13; if (k === 'hay_block') r = 14; if (k === 'glow_crystal') r = 15;
        }
        B.BINST.push(r);
    }
    // (v2.3.2) liquids: BLQ 7 water / 35 lava / 0 none, BLV 0 source, 1..7 flowing, 8 falling
    B.BLQ = []; B.BLV = [];
    for (let id = 0; id < NBLOCK; id++) {
        const b = BLOCKS[id];
        let q = 0, v = 0;
        if (id === 7) q = 7; if (id === 35) q = 35;
        if (b && b.liq) { q = b.liq === 'water' ? 7 : 35; v = b.lv; }
        B.BLQ.push(q); B.BLV.push(v);
    }
    // an axis block's lying variants (x, z): the newer logs have them right after, the first logs
    // (13, 23, 25) far away, basalt none (it stays upright) - put by these, never by + 1 / + 2
    B.BAXX = []; B.BAXZ = [];
    for (let id = 0; id < NBLOCK; id++) {
        const b = BLOCKS[id];
        const ax = b && b.place === 'axis' && !b.item;
        B.BAXX.push(ax && names.has(b.n + '_x') ? names.get(b.n + '_x') : id);
        B.BAXZ.push(ax && names.has(b.n + '_z') ? names.get(b.n + '_z') : id);
    }
    // ((v2.9) BROT: the same block turned 90 degrees clockwise seen from above (world edit's //rotate:
    // stairs, doors, trapdoors, ladders, beds, levers ... kept their way): the variant of its kind whose
    // model is this one's boxes turned (x, z) -> (16 - z, x), the same open state first; logs x <-> z
    const rotKey = (m) => m.boxes.map(q => [16 - q[5], q[1], q[0], 16 - q[2], q[4], q[3], q[6] || '', q[7] || ''].join(',')).sort().join(';');
    const plainKey = (m) => m.boxes.map(q => [q[0], q[1], q[2], q[3], q[4], q[5], q[6] || '', q[7] || ''].join(',')).sort().join(';');
    B.BROT = [];
    const byKind = new Map();
    for (let id = 0; id < NBLOCK; id++) { const k = B.BKIND[id]; if (!byKind.has(k)) byKind.set(k, []); byKind.get(k).push(id); }
    for (let id = 0; id < NBLOCK; id++) {
        const b = BLOCKS[id];
        let r = id;
        if (b && typeof b.model === 'string' && MODELS[b.model]) {
            const want = rotKey(MODELS[b.model]);
            const c = byKind.get(B.BKIND[id]).filter(j => { const o = BLOCKS[j]; return o && typeof o.model === 'string' && MODELS[o.model] && plainKey(MODELS[o.model]) === want; });
            const same = c.filter(j => (BLOCKS[j].on || 0) === (b.on || 0) && (BLOCKS[j].aux || 0) === (b.aux || 0));
            if (same.length) r = same[0]; else if (c.length) r = c[0];
        }
        if (b && /_x$/.test(b.n) && names.has(b.n.replace(/_x$/, '_z'))) r = names.get(b.n.replace(/_x$/, '_z'));
        if (b && /_z$/.test(b.n) && names.has(b.n.replace(/_z$/, '_x'))) r = names.get(b.n.replace(/_z$/, '_x'));
        B.BROT.push(r);
    }
    // (the model alone cannot tell a door's open or upper half, a bed's head: for doors, beds and
    // trapdoors the last digit of the variant's name is its way, turned 0 -> 3 -> 2 -> 1)
    for (let id = 0; id < NBLOCK; id++) {
        const b = BLOCKS[id], kb = BLOCKS[B.BKIND[id]];
        if (!b || !kb || !['door', 'bed', 'trapdoor'].includes(kb.place)) continue;
        const sufs = byKind.get(B.BKIND[id]).map(q => BLOCKS[q] && BLOCKS[q].n.startsWith(kb.n + '_') ? BLOCKS[q].n.slice(kb.n.length + 1) : '');
        const len = Math.max(...sufs.map(s => s.length));
        const suf = id === B.BKIND[id] ? '0'.repeat(len) : b.n.slice(kb.n.length + 1);
        const d = +suf.slice(-1);
        if (!(suf.length && d >= 0 && d <= 3)) continue;
        const s2 = suf.slice(0, -1) + ((d + 3) % 4);
        const nm = sufs.includes(s2) ? kb.n + '_' + s2 : (/^0+$/.test(s2) && s2.length === len ? kb.n : null);
        if (nm && names.has(nm)) B.BROT[id] = names.get(nm);
    }
    Object.assign(L, B, MB, CB);

    // items
    const I = { ITKEY: [], ITNAME: [], ITK: [], ITST: [], ITFOOD: [], ITFUEL: [], ITTK: [], ITTT: [], ITDUR: [], ITDMG: [], ITISO: [], IC0: [], ICN: [], ITC1: [], ITC2: [], ITDEF: [], ITSLOT: [], ITTAG: [], ITPLB: [], ITSPAWN: [], ITTHROW: [], ITCAT: [], ITFP: [], ITREP: [], ITENC: [], ITECL: [] };
    const SMELTT = 8;
    const iconOf = (grid, p) => putRects(rectsOf(grid, (ch) => ch !== '.', (ch) => col(snap(p[ch]))));
    const iconCol = (grid, p) => { const c = {}; for (const r of grid) for (const ch of r) if (ch !== '.') c[ch] = (c[ch] || 0) + 1; return col(snap(p[Object.entries(c).sort((a, b) => b[1] - a[1])[0][0]])); };
    const TORCH = { g: ['...yy...', '...yo...', '...bb...', '...bb...', '...bb...', '...bb...', '...bb...', '........'], p: { y: 'ffd040', o: 'f08020', b: '7a5a30' } };
    const itemById = new Map(ITEMS.map(x => [x.id, x]));
    const PALS = CATS.map(() => []);
    for (let id = 0; id < NITEM; id++) {
        const b = id < NBLOCK ? BLOCKS[id] : null;
        const it = itemById.get(id);
        const tool = toolOf.get(id), arm = armOf.get(id);
        let name = '', key = '', k = 1, st = 64, food = 0, fuel = 0, tk = -1, tt = -1, dur = 0, dmg = 1, iso = 0, ic = [0, 0], c1 = col('ff00ff'), c2 = c1, def = 0, slot = 0, tag = 0, plb = 0, spawn = 0, thr = 0, cat = -1;
        if (b) {
            name = b.ko; key = b.key || b.n; k = 0; plb = id; tag = TAGS[b.tag] || 0;
            fuel = b.fuel || ({ craft: 15, chest: 15, sapling: 5 }[b.n] || 0);
            const shape = b.shape || 0;
            if (b.icon) ic = iconOf(b.icon.g, b.icon.p);
            else if (shape === 0 || shape === 3 || shape === 4) iso = 1;
            else if (shape === 5) iso = 2;
            else if (shape === 2) ic = iconOf(TORCH.g, { ...TORCH.p, y: b.flame || 'ffd040' });
            else { const T = TEX[b.t[0]]; ic = iconOf(T.g, T.p); }
            c1 = AVGC[B.BTT[id] - 1]; c2 = AVGC[B.BTS[id] - 1];
            if (shape === 2) { c1 = col(b.flame || 'ffd040'); c2 = col('7a5a30'); }
            if (b.st) st = b.st;
            if (!b.hidden) cat = b.cat ?? 1;
        } else if (it) {
            name = it.ko; key = it.key || it.n; food = it.food || 0; fuel = it.fuel || 0; k = food ? 2 : 1; cat = it.cat ?? 5;
            if (it.n === 'bow' || it.n === 'igniter') { st = 1; dur = it.n === 'bow' ? 384 : 64; cat = 6; }
            if (it.n === 'boat' || it.n === 'voidKey') { st = 1; }
            // ((v3.0) the trident: a weapon of 9 (tool kind 7: none of the blocks'), thrown with F
            if (it.n === 'trident') { tk = 7; tt = 0; dmg = 9; k = 3; }
            if (it.n === 'voidPearl' || it.n === 'voidEye' || it.n === 'egg' || it.n === 'snowball') { st = 16; }
            if (it.n === 'arrow') cat = 6;
            if (it.st) st = it.st;
            if (it.slot) { k = 4; st = 1; slot = it.slot; dur = it.dur; cat = 6; }
            if (it.dur && !it.slot) { st = 1; dur = it.dur; cat = 6; }
            if (it.placeBlock) plb = idOf(it.placeBlock);
            if (it.spawn) { spawn = it.spawn; st = 64; }
            if (it.throwIt) thr = it.throwIt;
            if (it.n === 'voidPearl') thr = 3;
            // (v2.3.2) the boat with the tools, where one looks for it (it was among the materials)
            if (it.n === 'boat') cat = 6;
            // (v2.5) shears are tool kind 5 (sheep, cobwebs, leaves, string): tool5 was never read, so they were none
            if (it.tool5) { tk = 5; tt = 0; k = 3; }
            if (it.n === 'waterBucket') plb = 7; if (it.n === 'lavaBucket') plb = 35;
            if (it.drink) k = 2, food = 0;
            ic = iconOf(it.icon, it.p); c1 = c2 = iconCol(it.icon, it.p);
            if (food && cat === 5) cat = 5;
        } else if (tool) {
            const T = TIERS[tool.tier], K = KINDS[tool.kind];
            name = `${T.ko} ${K.ko}`; k = 3; st = 1; tk = tool.kind; tt = tool.tier; dur = T.dur; dmg = K.dmg[tool.tier];
            key = `${['wooden', 'stone', 'iron', 'diamond', 'abyss', 'golden'][tool.tier]}_${['pickaxe', 'axe', 'shovel', 'sword', 'hoe'][tool.kind]}`;
            ic = iconOf(K.icon, { h: T.col, d: '7a5a30' }); c1 = c2 = col(T.col); cat = 6;
        } else if (arm) {
            const T = ARMT[arm.tier], P = ARMP[arm.piece];
            name = `${T.ko} ${P.ko}`; k = 4; st = 1; dur = T.dur; def = T.def[arm.piece] + 100 * (T.tough || 0); slot = arm.piece + 1;
            key = `${['leather', 'iron', 'diamond', 'abyss', 'golden', 'chain'][arm.tier]}_${['helmet', 'chestplate', 'leggings', 'boots'][arm.piece]}`;
            ic = iconOf(P.icon, { h: T.dark, d: T.col }); c1 = c2 = col(T.col); cat = 6;
        }
        I.ITKEY.push((key || ' ').toLowerCase());
        I.ITNAME.push(name || ' '); I.ITK.push(k); I.ITST.push(st); I.ITFOOD.push(food); I.ITFUEL.push(fuel / 10 * SMELTT);
        I.ITTK.push(tk); I.ITTT.push(tt); I.ITDUR.push(dur); I.ITDMG.push(dmg); I.ITISO.push(iso); I.IC0.push(ic[0]); I.ICN.push(ic[1]); I.ITC1.push(c1); I.ITC2.push(c2); I.ITDEF.push(def); I.ITSLOT.push(slot);
        I.ITTAG.push(tag); I.ITPLB.push(plb); I.ITSPAWN.push(spawn); I.ITTHROW.push(thr); I.ITCAT.push(cat);
        // ((v2.9) lying in fire or lava an item burns, but the abyss things (the genre's netherite)
        // ((v2.9) enchanting: the class of item (ECLASS), how well it takes a charm at the table (the
        // genre's enchantability), what mends it at the anvil (an item id, or -tag)
        let ecl = 0, enc = 0, rep = 0;
        if (tool) { ecl = [3, 2, 4, 1, 5][tool.kind]; enc = [15, 5, 14, 10, 15, 22][tool.tier]; rep = idOf(TIERS[tool.tier].mat); }
        else if (arm) { ecl = 7 + arm.piece; enc = [15, 9, 10, 15, 25, 12][arm.tier]; rep = idOf(ARMT[arm.tier].n === 'Chain' ? 'ingotIron' : ARMT[arm.tier].mat); }
        else if (it) {
            if (it.n === 'bow') { ecl = 6; enc = 1; }
            if (it.n === 'glider') ecl = 11;
            if (it.tool5) ecl = 12;
            if (it.n === 'igniter') ecl = 13;
            if (it.n === 'book' || it.n === 'enchantedBook') { ecl = 14; enc = it.n === 'book' ? 1 : 0; }
            if (it.n === 'glider') rep = idOf('leather');
        }
        I.ITECL.push(ecl); I.ITENC.push(enc); I.ITREP.push(rep);
        I.ITFP.push((tool && tool.tier === 4) || (arm && ARMT[arm.tier].n === 'Abyss') || ['abyssIngot', 'scrap', 'debris', 'blockAbyss'].includes((b || it || {}).n) ? 1 : 0);
        if (name && cat >= 0 && id !== 6) PALS[cat].push(id);
    }
    // a few of the item flags the code asks for by name
    Object.assign(L, I);
    L.TSPEED = TIERS.map(t => t.speed); L.TLEVEL = TIERS.map(t => t.lv);
    // ((v2.9) the charms: key, name, top level, weight at the table, the power a level 1 needs and each
    // level more, treasure (not at the table), the group of those that exclude each other, and the
    // classes (ITECL 1 sword 2 axe 3 pickaxe 4 shovel 5 hoe 6 bow 7..10 helmet..boots 11 elytra 12 shears
    // 13 flint and steel 14 book) that take it at the anvil (ENOK) and at the table (ENTB)
    const W = [1], T = [2, 3, 4, 5], AR = [7, 8, 9, 10], DUR = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    const EN = [
        ['sharpness', '날카로움', 5, 10, 1, 11, 0, 1, [1, 2], W],
        ['smite', '강타', 5, 5, 5, 8, 0, 1, [1, 2], W],
        ['bane_of_arthropods', '살충', 5, 5, 5, 8, 0, 1, [1, 2], W],
        ['knockback', '밀치기', 2, 5, 5, 20, 0, 0, W, W],
        ['fire_aspect', '발화', 2, 2, 10, 20, 0, 0, W, W],
        ['looting', '약탈', 3, 2, 15, 9, 0, 0, W, W],
        ['sweeping', '휩쓸기', 3, 2, 5, 9, 0, 0, W, W],
        ['efficiency', '효율', 5, 10, 1, 10, 0, 0, [...T, 12], T],
        ['silk_touch', '섬세한 손길', 1, 1, 15, 0, 0, 3, T, T],
        ['fortune', '행운', 3, 2, 15, 9, 0, 3, T, T],
        ['unbreaking', '내구성', 3, 5, 5, 8, 0, 0, DUR, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]],
        ['mending', '수선', 1, 2, 25, 0, 1, 4, DUR, []],
        ['power', '힘', 5, 10, 1, 10, 0, 0, [6], [6]],
        ['punch', '밀어내기', 2, 2, 12, 20, 0, 0, [6], [6]],
        ['flame', '화염', 1, 2, 20, 0, 0, 0, [6], [6]],
        ['infinity', '무한', 1, 1, 20, 0, 0, 4, [6], [6]],
        ['protection', '보호', 4, 10, 1, 11, 0, 2, AR, AR],
        ['fire_protection', '화염으로부터 보호', 4, 5, 10, 8, 0, 2, AR, AR],
        ['blast_protection', '폭발로부터 보호', 4, 2, 5, 8, 0, 2, AR, AR],
        ['projectile_protection', '발사체로부터 보호', 4, 5, 3, 6, 0, 2, AR, AR],
        ['thorns', '가시', 3, 1, 10, 20, 0, 0, AR, [8]],
        ['respiration', '호흡', 3, 2, 10, 10, 0, 0, [7], [7]],
        ['aqua_affinity', '친수성', 1, 2, 1, 0, 0, 0, [7], [7]],
        ['feather_falling', '가벼운 착지', 4, 5, 5, 6, 0, 0, [10], [10]],
        ['depth_strider', '물갈퀴', 3, 2, 10, 10, 0, 5, [10], [10]],
        ['frost_walker', '차가운 걸음', 2, 2, 10, 10, 1, 5, [10], []],
        ['binding_curse', '귀속 저주', 1, 1, 25, 0, 1, 0, [...AR, 11], []],
        ['vanishing_curse', '소실 저주', 1, 1, 25, 0, 1, 0, DUR, []],
    ];
    L.ENKEY = EN.map(e => e[0]); L.ENKO = EN.map(e => e[1]); L.ENMAX = EN.map(e => e[2]); L.ENW = EN.map(e => e[3]);
    L.ENP0 = EN.map(e => e[4]); L.ENPS = EN.map(e => e[5]); L.ENTR = EN.map(e => e[6]); L.ENX = EN.map(e => e[7]);
    L.ENOK = []; L.ENTB = [];
    for (const e of EN) for (let c = 1; c <= 14; c++) { L.ENOK.push(c === 14 || e[8].includes(c) ? 1 : 0); L.ENTB.push((c === 14 && !e[6]) || e[9].includes(c) ? 1 : 0); }
    // (the code: one number of mixed radix over the charms a class takes, under the damage x 4096; a
    // book's alone - it must stay under 2^53)
    for (let c = 1; c <= 14; c++) { let p = 1; EN.forEach((e, k) => { if (L.ENOK[k * 14 + c - 1]) p *= e[2] + 1; }); if (p * (c === 14 ? 1 : 4096) > 2 ** 53) throw new Error('enchant code too big ' + c + ' ' + p); }
    L.SMA = SMITH.map(p => p[0]); L.SMB = SMITH.map(p => p[1]);
    // the creative tabs
    L.PALC = []; L.PALC0 = []; L.PALCN = [];
    PALS[0].push(6);
    for (const p of PALS) { L.PALC0.push(L.PALC.length + 1); L.PALCN.push(p.length); L.PALC.push(...p); }
    L.CATNAME = CATS;

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

    // recipes (an ingredient below 0: any item of that tag)
    L.RW = []; L.RH = []; L.RM = []; L.RC = []; L.ROUT = []; L.RCNT = [];
    for (const r of RECIPES) {
        const rows = r.r.map(row => row.split(' '));
        const h = rows.length, w = Math.max(...rows.map(x => x.length));
        if (h > 3 || w > 3) throw new Error('recipe size ' + r.out);
        L.RW.push(w); L.RH.push(h); L.RM.push(r.m ? 1 : 0); L.ROUT.push(idOf(r.out)); L.RCNT.push(r.n);
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) L.RC.push(i < h && j < w ? idOf(rows[i][j] || '_') : 0);
    }
    L.SMI = SMELT.map(s => idOf(s[0])); L.SMO = SMELT.map(s => idOf(s[1]));

    // loot of the structures' chests: [rolls min, max, [item, min, max, weight] ...] by table number
    const LOOTS = {
        1: [3, 7, [['bread', 1, 4, 6], ['apple', 1, 5, 5], ['wheat', 1, 6, 6], ['ingotIron', 1, 3, 3], ['jade', 1, 2, 3], ['wheatSeeds', 2, 5, 5], ['potato', 1, 5, 4], ['carrot', 1, 5, 4], ['sapling', 1, 2, 2], ['book', 1, 1, 1]]],
        2: [3, 8, [['ingotIron', 1, 5, 8], ['ingotGold', 1, 3, 4], ['bread', 1, 3, 6], ['diamond', 1, 3, 2], ['jade', 1, 3, 3], ['pickIron', 1, 1, 2], ['swordIron', 1, 1, 2], ['ChestIron', 1, 1, 2], ['HelmetIron', 1, 1, 2], ['obsidian', 3, 7, 3]]],
        3: [2, 6, [['saddle', 1, 1, 12], ['diamond', 1, 3, 3], ['ingotIron', 1, 5, 10], ['ingotGold', 2, 7, 10], ['jade', 1, 3, 10], ['bone', 4, 6, 15], ['flesh', 3, 7, 15], ['goldenApple', 1, 1, 3], ['gunpowder', 1, 8, 10], ['sand', 1, 8, 6], ['string', 1, 8, 10]]],
        4: [2, 6, [['saddle', 1, 1, 12], ['diamond', 1, 3, 3], ['ingotIron', 1, 5, 10], ['ingotGold', 2, 7, 15], ['jade', 1, 3, 2], ['bone', 4, 6, 20], ['flesh', 3, 7, 16], ['arrow', 2, 7, 10], ['bamboo', 1, 3, 5]]],
        5: [2, 6, [['apple', 1, 3, 15], ['coal', 1, 4, 15], ['goldNugget', 1, 3, 10], ['axeStone', 1, 1, 2], ['flesh', 1, 1, 10], ['wheat', 2, 3, 10], ['goldenApple', 1, 1, 1]]],
        6: [2, 4, [['wheat', 3, 5, 7], ['potato', 2, 5, 5], ['carrot', 3, 5, 5], ['arrow', 2, 7, 5], ['ingotIron', 1, 3, 3], ['string', 1, 6, 4], ['book', 1, 1, 1], ['bow', 1, 1, 2]]],
        7: [1, 3, [['ingotIron', 1, 4, 10], ['ingotGold', 1, 4, 5], ['jade', 1, 3, 5], ['diamond', 1, 2, 3], ['goldenApple', 1, 1, 2], ['book', 1, 3, 5], ['ChestDiamond', 1, 1, 1], ['hoeDiamond', 1, 1, 2], ['bread', 1, 4, 10], ['sparkDust', 1, 4, 10]]],
        8: [3, 10, [['paper', 1, 12, 8], ['potato', 2, 6, 7], ['carrot', 4, 8, 7], ['wheat', 8, 21, 7], ['coal', 2, 8, 6], ['flesh', 5, 24, 5], ['pumpkin', 1, 3, 2], ['bamboo', 1, 3, 2], ['gunpowder', 1, 5, 3], ['tnt', 1, 2, 1], ['leather', 1, 3, 3]]],
        9: [3, 6, [['ingotIron', 1, 5, 90], ['ingotGold', 1, 5, 10], ['jade', 1, 5, 40], ['diamond', 1, 1, 5], ['ironNugget', 1, 10, 50], ['goldNugget', 1, 10, 10], ['lapis', 1, 10, 20]]],
        10: [2, 4, [['coal', 1, 4, 10], ['wheat', 2, 3, 10], ['goldNugget', 1, 3, 5], ['jade', 1, 1, 3], ['flesh', 1, 2, 4], ['aquaCrystal', 1, 3, 4], ['book', 1, 1, 1]]],
        11: [4, 8, [['aquaCrystal', 1, 3, 5], ['ingotIron', 1, 4, 20], ['ingotGold', 1, 4, 10], ['tnt', 1, 2, 5], ['jade', 4, 8, 5], ['diamond', 1, 2, 5], ['bread', 1, 3, 10], ['goldenApple', 1, 1, 2]]],
        12: [4, 8, [['obsidian', 1, 2, 40], ['flint', 1, 4, 40], ['ironNugget', 9, 18, 40], ['igniter', 1, 1, 40], ['fireCharge', 1, 1, 40], ['goldenApple', 1, 1, 15], ['goldNugget', 4, 24, 15], ['swordGold', 1, 1, 15], ['pickGold', 1, 1, 15], ['ingotGold', 2, 8, 5], ['glintObsidian', 1, 2, 5], ['blockGold', 1, 2, 1]]],
        13: [3, 6, [['goldenApple', 1, 1, 20], ['ingotIron', 1, 5, 10], ['ingotGold', 1, 3, 5], ['sparkDust', 4, 9, 5], ['lapis', 4, 9, 5], ['diamond', 1, 2, 3], ['coal', 3, 8, 10], ['bread', 1, 3, 15], ['rail', 4, 8, 20], ['poweredRail', 1, 4, 5], ['torch', 1, 16, 15], ['beetSeeds', 2, 4, 10]]],
        14: [3, 6, [['saddle', 1, 1, 14], ['bone', 1, 8, 10], ['gunpowder', 1, 8, 10], ['flesh', 1, 8, 10], ['string', 1, 8, 10], ['bread', 1, 1, 20], ['wheat', 1, 4, 20], ['bucket', 1, 1, 10], ['sparkDust', 1, 4, 15], ['coal', 1, 4, 15], ['goldenApple', 1, 1, 15], ['ingotIron', 1, 4, 10], ['ingotGold', 1, 4, 5], ['diamond', 1, 1, 2]]],
        15: [3, 8, [['saddle', 1, 1, 6], ['ingotGold', 2, 9, 10], ['goldNugget', 4, 16, 10], ['blockGold', 1, 1, 3], ['abyssIngot', 1, 1, 2], ['scrap', 1, 2, 4], ['magmaCream', 1, 6, 8], ['ashBrick', 2, 8, 8], ['blackrock', 4, 16, 10], ['HelmetChain', 1, 1, 3], ['diamond', 1, 2, 3], ['wailSand', 4, 12, 6]]],
    };
    L.LOOT0 = []; L.LOOTN = []; L.LOOTR0 = []; L.LOOTR1 = []; L.LOOTI = []; L.LOOTLO = []; L.LOOTHI = []; L.LOOTW = [];
    for (let t = 1; t <= 15; t++) {
        const [r0, r1, list] = LOOTS[t];
        L.LOOT0.push(L.LOOTI.length + 1); L.LOOTN.push(list.length); L.LOOTR0.push(r0); L.LOOTR1.push(r1);
        for (const [n, lo, hi, w] of list) { L.LOOTI.push(idOf(n)); L.LOOTLO.push(lo); L.LOOTHI.push(hi); L.LOOTW.push(w); }
    }

    // mobs
    const ML = ['MHP', 'MW', 'MH', 'MSPD', 'MHOST', 'MBURN', 'MDMG', 'MNAME', 'MKEY', 'MB0', 'MBN', 'MFLY', 'MFIRE', 'MNEU', 'MSTILL', 'MAI', 'MSHOT', 'MHITE', 'MHITS', 'MFOOD', 'MTAME', 'MSWIM', 'MXP', 'MSPLIT', 'MR0', 'MRN'];
    L.MRI = []; L.MRP = [];
    const mobIx = (n) => MOBS.findIndex((m) => m && m.n === n);
    for (const k of ML) L[k] = [];
    L.BX0 = []; L.BY0 = []; L.BZ0 = []; L.BX1 = []; L.BY1 = []; L.BZ1 = []; L.BCOL = []; L.BPART = [];
    L.MDI = []; L.MDLO = []; L.MDHI = [];
    for (const m of MOBS.slice(1)) {
        // ((v3.0) shooting, a bite's effect, breeding food, taming item, water, xp, splitting, rare drops)
        L.MSHOT.push(m.shot ?? 0); L.MHITE.push(m.hitE || 0); L.MHITS.push(m.hitS || 0); L.MFOOD.push(m.food || 0); L.MTAME.push(m.tame ? idOf(m.tame) : 0);
        L.MSWIM.push(m.swim || 0); L.MXP.push(m.xp ?? (m.hostile ? 5 : 2)); L.MSPLIT.push(m.split ? mobIx(m.split) : 0);
        L.MR0.push(L.MRI.length + 1); L.MRN.push((m.rare || []).length / 2);
        for (let i = 0; i < (m.rare || []).length; i += 2) { L.MRI.push(idOf(m.rare[i])); L.MRP.push(m.rare[i + 1]); }
        L.MFLY.push(m.fly || 0); L.MFIRE.push(m.fireproof || 0); L.MNEU.push(m.neutral || 0); L.MSTILL.push(m.still || 0); L.MAI.push(m.ai ?? 0);
        L.MHP.push(m.hp); L.MW.push(m.w); L.MH.push(m.h); L.MSPD.push(m.speed); L.MHOST.push(m.hostile || 0); L.MBURN.push(m.burns || 0); L.MDMG.push(m.dmg || 0); L.MNAME.push(m.ko); L.MKEY.push(m.n.replace(/[A-Z]/g, (x) => '_' + x.toLowerCase()));
        L.MB0.push(L.BX0.length + 1); L.MBN.push(m.boxes.length);
        for (const [x0, y0, z0, x1, y1, z1, c, part] of m.boxes) { const t = (v) => Math.round(v * 10); L.BX0.push(t(x0)); L.BY0.push(t(y0)); L.BZ0.push(t(z0)); L.BX1.push(t(x1)); L.BY1.push(t(y1)); L.BZ1.push(t(z1)); L.BCOL.push(col(snap(c))); L.BPART.push(part); }
        L.MDROP0 = L.MDROP0 || []; L.MDROPN = L.MDROPN || [];
        L.MDROP0.push(L.MDI.length + 1); L.MDROPN.push(m.drop.length / 3);
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

    L.OFFX = chunkOffsets(CR).map(o => o[0]); L.OFFZ = chunkOffsets(CR).map(o => o[1]);
    L.KIT = [2, 3, 1, 4, 5, 13, 15, 27, 39].map(Number);
    L.BNAMES = ['바다', '해변', '평원', '숲', '사막', '타이가', '설원', '산', '얼어붙은 바다', '잿빛 심연', '공허의 섬',
        '밀림', '사바나', '늪', '붉은 협곡', '흑단 숲', '버섯 섬', '자작나무 숲', '꽃 숲', '얼음 가시 들판', '따뜻한 바다', '깊은 바다',
        '잉걸 숲', '쪽빛 숲', '흐느낌 골짜기', '현무암 삼각주'];
    L.BKEYS = ['ocean', 'beach', 'plains', 'forest', 'desert', 'taiga', 'snowy_tundra', 'mountains', 'frozen_ocean', 'ashen_wastes', 'void_islands',
        'jungle', 'savanna', 'swamp', 'badlands', 'ebony_forest', 'mushroom_fields', 'birch_forest', 'flower_forest', 'ice_spikes', 'warm_ocean', 'deep_ocean',
        'ember_forest', 'indigo_forest', 'wail_valley', 'basalt_deltas'];
    L.TITLEB = [2, 13, 4, 16, 17];

    const extra = { CTORCH: col('7a5a30'), CFLAME: col('ffc830'), CCLOUD: col('ffffff'), CHURT: col('e83a3a'), CARROW: col('8a7a5a'), CSKIN: col('c8a080'), CRAIN: col('8ab0e0'), CSNOW: col('f4f8ff'), CXP: col('80ff20'), CSHIRT: col('2a8ac8'), CPANTS: col('3a3a8a'), CFWR: col('ff4a4a'), CFWY: col('ffd84a'), CFWB: col('4ac8ff'), CFWG: col('6aff6a'), CFWP: col('ff6aff'), CFWW: col('ffffff'), CFANG: col('e8e0c8'), CBEAM: col('a8e8ff'), CPOT: col('9a4ad8'), CSKULL: col('2a2a2e') };
    L.COLR = cols.map(h => rgbOf(h)[0]); L.COLG = cols.map(h => rgbOf(h)[1]); L.COLB = cols.map(h => rgbOf(h)[2]);
    Object.assign(L, R);
    // the ids the code names (I_<name> for every block and item)
    const ids = {};
    for (const [n, id] of names) ids['I_' + n] = id;
    for (const [n, i] of Object.entries(USE)) ids['U_' + n.toUpperCase()] = i;
    for (const [n, i] of Object.entries(PLACE)) ids['P_' + n.toUpperCase()] = i;
    for (const [n, i] of Object.entries(NEED)) ids['N_' + n.toUpperCase()] = i;
    for (const [n, i] of Object.entries(RS)) ids['RS_' + n.toUpperCase()] = i;
    MOBS.forEach((m, i) => { if (m) ids['M_' + m.n.toUpperCase()] = i; });
    const kinds0 = BLOCKS.filter(b => b && !b.nokind && !(b.item && !b.plant && !b.spawns)).length;
    const C = { ...extra, ...ids, VERSION, NKINDS: kinds0, NCOL: cols.length, NREC: RECIPES.length, TDIRT: texIx('dirt'), NBLOCK, NITEM, NCAT: CATS.length, NMOBT: MOBS.length - 1 };
    const kinds = BLOCKS.filter(b => b && !b.nokind && !(b.item && !b.plant && !b.spawns)).length;
    cache = { L, C, kinds };
    return cache;
}

// ------------------------------------------------------------------ sources
export const FILES = ['world.js', 'flat.js', 'fluid.js', 'dims.js', 'structs.js', 'mesh.js', 'render.js', 'model.js', 'player.js', 'blocks.js', 'power.js', 'rails.js', 'save.js', 'net.js', 'netcmd.js', 'cmdaim.js', 'svback.js', 'menu.js', 'mobs.js', 'fauna.js', 'items.js', 'hud.js', 'extra.js', 'ench.js', 'cmds.js', 'wedit.js', 'keyin.js', 'swear.js', 'je.js', 'main.js', 'test.js'];
export function allConsts(more = {}) {
    const { C } = makeData();
    return { ...consts, ...C, ...more };
}
// a list past 5000 items is kept as parts of 5000 (Entry drops the rest when it opens a work) and
// put together once at the start (bigInit)
const PART = 5000;
export function sources(C) {
    const { L } = makeData();
    let files = C.TESTRUN || C.SIMRUN ? FILES : FILES.filter(f => f !== 'test.js');
    if (C.SPLIT) files = files.concat(['split.js']);
    const stub = files.includes('test.js') ? '' : '\nfunction testStep() { }\n';
    const lit = (v) => typeof v === 'string' ? JSON.stringify(v) : (Number.isFinite(v) ? String(v) : (() => { throw new Error('bad ' + v); })());
    const parts = [], init = [];
    // (v2.4.1) a data list of whole numbers (64 items or more) is kept packed: each item as w digits
    // of 64 (PA) from its least, in texts of up to 8000 (PKS, each led by 'P' so it stays a text),
    // and unpacked by bigInit. The work's project.json went 16.7 -> about 12 MB (the site takes 16).
    const PA = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz+/';
    const PKS = [], unpack = [], packed = new Set();
    for (const [k, v] of Object.entries(L)) {
        if (C.NOPACK || v.length < 64 || !v.every(x => typeof x === 'number' && Number.isInteger(x))) continue;
        let mn = v[0], mx = v[0];
        for (const x of v) { if (x < mn) mn = x; if (x > mx) mx = x; }
        let w = 1; while (64 ** w <= mx - mn) w++;
        if (w > 4) continue;
        const per = Math.floor(7999 / w), a = PKS.length + 1;
        for (let s = 0; s < v.length; s += per) {
            let t = 'P';
            for (const x of v.slice(s, s + per)) { let d = x - mn, q = ''; for (let j = 0; j < w; j++) { q = PA[d % 64] + q; d = Math.floor(d / 64); } t += q; }
            PKS.push(t);
        }
        // ((v3.0) one decoder fills UPK, each list only copies it: the function was 540 KB)
        unpack.push(`  unpk(${a}, ${PKS.length}, ${w}, ${mn}); i = 1; while (i <= UPK.length) { ${k}.push(UPK[i]); i = i + 1; }`);
        parts.push(`let ${k} = [];`);
        packed.add(k);
    }
    parts.push(`let PA = ${JSON.stringify(PA)};`);
    parts.push(`let PKS = [${PKS.map(lit).join(', ')}];`);
    parts.push(`let UPK = [];`);
    parts.push(`function unpk(a, b, w, mn) {\n  UPK = []; let c = a, s = ' ', n = 0, j = 0, v = 0, q = 0;\n  while (c <= b) { s = PKS[c]; n = strlen(s); j = 2; while (j <= n) { v = 0; q = 0; while (q < w) { v = v * 64 + indexOf(PA, charAt(s, j + q)) - 1; q = q + 1; } UPK.push(v + mn); j = j + w; } c = c + 1; }\n}`);
    parts.push(`function unpackLists() {\n  let i = 0;\n${unpack.join('\n')}\n}`);
    init.push('  unpackLists();');
    for (const [k, v] of Object.entries(L)) {
        if (packed.has(k)) continue;
        if (v.length <= PART) { parts.push(`let ${k} = [${v.map(lit).join(', ')}];`); continue; }
        parts.push(`let ${k} = [];`);
        for (let p = 0; p * PART < v.length; p++) {
            parts.push(`let ${k}__${p} = [${v.slice(p * PART, (p + 1) * PART).map(lit).join(', ')}];`);
            init.push(`  i = 1; while (i <= ${k}__${p}.length) { ${k}.push(${k}__${p}[i]); i = i + 1; }`);
        }
    }
    // every Korean syllable in order (the typed line puts them together: src/keyin.js)
    let hsy = ''; for (let i = 0; i < 11172; i++) hsy += String.fromCharCode(0xAC00 + i);
    parts.push(`let HSY = ${JSON.stringify(hsy)};`);
    // (v2.4.1) the servers' places in Entry Sync: SY_m1..NSRV (settings) and SY_e1..NSRV (blocks), and
    // the functions that reach place k (a list can't be picked by a number in Entry: a tree of ifs)
    parts.push(`const NSRV = ${NSRV};`);
    for (const p of ['m', 'e']) parts.push(`let ${Array.from({ length: NSRV }, (_, i) => `SY_${p}${i + 1} = []`).join(', ')};`);
    const tree = (lo, hi, leaf) => {
        if (lo === hi) return leaf(lo);
        const mid = (lo + hi) >> 1;
        return `if (k <= ${mid}) { ${tree(lo, mid, leaf)} } else { ${tree(mid + 1, hi, leaf)} }`;
    };
    parts.push(`function metaLen(k) { let n = 0; if (k >= 1 && k <= NSRV) { ${tree(1, NSRV, (i) => `n = SY_m${i}.length;`)} } return n; }`);
    parts.push(`function metaItem(k, i) { let s = ''; if (i >= 1 && i <= metaLen(k)) { ${tree(1, NSRV, (j) => `s = SY_m${j}[i];`)} } return \`\${s}\`; }`);
    parts.push(`function metaPut(k) { let q = 1; if (k >= 1 && k <= NSRV) { ${tree(1, NSRV, (j) => `SY_m${j} = []; q = 1; while (q <= NMW.length) { SY_m${j}.push(NMW[q]); q = q + 1; }`)} } }`);
    parts.push(`function editLen(k) { let n = 0; if (k >= 1 && k <= NSRV) { ${tree(1, NSRV, (i) => `n = SY_e${i}.length;`)} } return n; }`);
    parts.push(`function editItem(k, i) { let v = 0; if (k >= 1 && k <= NSRV) { ${tree(1, NSRV, (j) => `v = SY_e${j}[i];`)} } return v; }`);
    parts.push(`function editsPut(k) { let q = 1; if (k >= 1 && k <= NSRV) { ${tree(1, NSRV, (j) => `SY_e${j} = []; q = 1; while (q <= NEW.length) { SY_e${j}.push(NEW[q]); q = q + 1; }`)} } }`);
    parts.push(`function bigInit() {\n  let i = 0;\n${init.join('\n')}\n}`);
    const raw = parts.join('\n') + '\n' + files.map(f => fs.readFileSync(path.join(HERE, 'src', f), 'utf8')).join('\n') + stub;
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
    // SPLIT: the world and the screens drawn by objects of their own (in front of pen: hud, view)
    if (prog.objectScripts.view) objects.splice(1, 0, { id: 'hud', name: 'hud', pictures: [{ id: 'p2', name: 'dot', buf: DOT, w: 1, h: 1 }], script: prog.objectScripts.hud }, { id: 'view', name: 'view', pictures: [{ id: 'p3', name: 'dot', buf: DOT, w: 1, h: 1 }], script: prog.objectScripts.view });
    for (const k of Object.keys(prog.objectScripts)) if (!objects.some(o => o.id === k)) throw new Error('script for an unknown object: ' + k);
    const project = packEnt(out, { name, tmpDir: path.join(HERE, '.pack'), variables: prog.variables, functions: prog.functions, messages: prog.messages, objects, speed: 60 });
    const big = prog.variables.filter(v => v.variableType === 'list' && v.array.length > 5000).map(v => v.name + ':' + v.array.length);
    if (big.length) throw new Error('lists past 5000 items: ' + big);
    const blocks = prog.functions.reduce((a, f) => a + f.content.split('"type"').length - 1, 0) + JSON.stringify(objects.map(o => o.script)).split('"type"').length - 1;
    return { project, src, C, stats: { macros: count, globals: prog.variables.filter(v => v.variableType === 'variable').length, lists: prog.variables.filter(v => v.variableType === 'list').length, functions: prog.functions.length, blocks, json: JSON.stringify(project).length, bytes: fs.statSync(out).size, kinds: makeData().kinds, colours: C.NCOL } };
}

if (process.argv[1] && import.meta.url === url.pathToFileURL(path.resolve(process.argv[1])).href) {
    const out = process.argv[2] || path.join(HERE, 'vox.ent');
    const more = Object.fromEntries(process.argv.slice(3).filter(a => a.includes('=')).map(a => a.split('=')).map(([k, v]) => [k, Number(v)]));
    console.log('wrote', out, JSON.stringify(buildProject(out, { more }).stats));
}
