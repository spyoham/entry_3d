// Build DOOM for Entry: Freedoom assets + E1M1 + EJS sources -> .ent
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { extract, WALL_LEVELS, FLAT_LEVELS } from './extract.mjs';
import { STATES, stateIndex, MOBJ, ACTIONS, MF, WEAPONS, WORLD_SPRITES, WEAPON_SPRITES } from './info.mjs';
import { compileProgram, compileToJS } from './ejs.mjs';
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/spyoh/entry_3d/entry-vibe-coding/package.json');
const sharp = require('sharp');

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const WAD = path.join(HERE, 'freedoom-0.13.0', 'freedoom1.wad');
export const SRC_FILES = ['render.js', 'game.js', 'player.js', 'things.js', 'weapons.js', 'specials.js', 'hud.js', 'main.js'];

const pngRaw = (rgba, w, h) => sharp(Buffer.from(rgba.buffer, rgba.byteOffset, rgba.byteLength), { raw: { width: w, height: h, channels: 4 } }).png({ compressionLevel: 9 }).toBuffer();

export async function buildData(extraSrc = []) {
    const ex = await extract(WAD, 'E1M1', WORLD_SPRITES);
    const { M, pal, cmap } = ex;
    const lists = {};    // name -> array (1-based data in order)
    const consts = {};
    // =============== world pictures (stamper) ===============
    const pics = [];     // { name, w, h, rgba }
    const addPic = (name, w, h, rgba) => { pics.push({ name, w, h, rgba }); return pics.length; };
    // flats: 1x1 per level
    lists.flPic = [];
    // per flat: 6 solid 1x1 levels, then 4 right-triangle variants x 6 levels (32x32):
    //  v0 floor/rising (fill y<=x), v1 floor/falling, v2 ceiling/rising, v3 ceiling/falling
    const TRI = 32;
    const triMask = (v, x, y) => {   // x,y in [0,1), y up
        if (v === 0) return y <= x; if (v === 1) return y <= 1 - x; if (v === 2) return y >= x; return y >= 1 - x;
    };
    for (const f of ex.flats) {
        let first = 0;
        f.cols.forEach((c, i) => { const n = addPic(`F_${f.name}_${i}`, 1, 1, new Uint8Array([c[0], c[1], c[2], 255])); if (i === 0) first = n; });
        for (let v = 0; v < 4; v++) f.cols.forEach((c, i) => {
            const rgba = new Uint8Array(TRI * TRI * 4);
            for (let py = 0; py < TRI; py++) for (let px = 0; px < TRI; px++) {
                if (!triMask(v, (px + 0.5) / TRI, 1 - (py + 0.5) / TRI)) continue;
                const o = (py * TRI + px) * 4; rgba[o] = c[0]; rgba[o + 1] = c[1]; rgba[o + 2] = c[2]; rgba[o + 3] = 255;
            }
            addPic(`T_${f.name}_${v}_${i}`, TRI, TRI, rgba);
        });
        lists.flPic.push(first);
    }
    const flatIndex = Object.fromEntries(ex.flats.map((f, i) => [f.name, i + 1]));
    // per texture: average color at the 3 wall light levels (far LOD)
    lists.txAvg = ex.textures.map(t => {
        const T = ex.tex[t.name];
        let first = 0;
        WALL_LEVELS.forEach((lv, li) => {
            let r = 0, g = 0, b = 0, n = 0;
            for (const c of T.px) { if (c < 0) continue; const q = pal[cmap(lv, c)]; r += q[0]; g += q[1]; b += q[2]; n++; }
            n = n || 1;
            const k = addPic(`A_${t.name}_${li}`, 1, 1, new Uint8Array([r / n, g / n, b / n, 255].map(Math.round)));
            if (li === 0) first = k;
        });
        return first;
    });
    // wall strips (textures by use), 3 levels adjacent
    const stripPic = new Map();
    lists.stPic = []; lists.txW = []; lists.txH = []; lists.txNs = []; lists.txFirst = []; lists.txImg = []; lists.txMFirst = [];
    const texIndex = {};
    // 2-sided mid textures need a see-through variant (holes transparent, one tile)
    const maskedUse = new Set();
    for (const l of ex.M.lines) if (l.side[1] !== 65535) for (const si of l.side) { const t = ex.M.sides[si].mid; if (t !== '-') maskedUse.add(t); }
    const stripVariant = (si, imgH, masked) => {
        const key = si + ':' + imgH + ':' + masked;
        if (!stripPic.has(key)) {
            const s = ex.strips[si];
            let first = 0;
            WALL_LEVELS.forEach((lv, li) => {
                const rgba = new Uint8Array(imgH * 4);
                for (let y = 0; y < imgH; y++) {
                    let c = s.col[y % s.col.length];
                    if (c < 0) { if (masked) continue; c = 0; }   // Doom composites fill holes with index 0
                    const p = pal[cmap(lv, c)];
                    rgba[y * 4] = p[0]; rgba[y * 4 + 1] = p[1]; rgba[y * 4 + 2] = p[2]; rgba[y * 4 + 3] = 255;
                }
                const n = addPic(`W${si}${masked ? 'm' : ''}_${li}`, 1, imgH, rgba);
                if (li === 0) first = n;
            });
            stripPic.set(key, first);
        }
        return stripPic.get(key);
    };
    for (const t of ex.textures) {
        texIndex[t.name] = lists.txW.length + 1;
        lists.txW.push(t.w); lists.txH.push(t.h); lists.txNs.push(t.ns); lists.txFirst.push(lists.stPic.length + 1);
        lists.txImg.push(t.imgH);
        for (const si of t.stripIdx) lists.stPic.push(stripVariant(si, t.imgH, 0));
        if (t.masked && maskedUse.has(t.name)) {
            lists.txMFirst.push(lists.stPic.length + 1);
            for (const si of t.stripIdx) lists.stPic.push(stripVariant(si, t.h, 1));
        } else if (maskedUse.has(t.name)) {
            // opaque texture used as a 2-sided mid: single tile
            lists.txMFirst.push(lists.stPic.length + 1);
            for (const si of t.stripIdx) lists.stPic.push(stripVariant(si, t.h, 0));
        } else lists.txMFirst.push(lists.txFirst[lists.txFirst.length - 1]);
    }
    // sprites: frame table from the states
    consts.SPRBASE = pics.length;
    const sprPic = new Map();   // lump:flip -> first pic
    lists.spW = []; lists.spH = []; lists.spLX = []; lists.spTY = [];
    const sprPicOf = (lump, flip) => {
        const key = lump + ':' + flip;
        if (sprPic.has(key)) return sprPic.get(key);
        const p = ex.getPatch(lump);
        let first = 0;
        WALL_LEVELS.forEach((lv, li) => {
            const rgba = new Uint8Array(p.w * p.h * 4);
            for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
                const c = p.px[y * p.w + (flip ? p.w - 1 - x : x)]; if (c < 0) continue;
                const q = pal[cmap(lv, c)], o = (y * p.w + x) * 4;
                rgba[o] = q[0]; rgba[o + 1] = q[1]; rgba[o + 2] = q[2]; rgba[o + 3] = 255;
            }
            const n = addPic(`S_${lump}${flip ? 'f' : ''}_${li}`, p.w, p.h, rgba);
            if (li === 0) first = n;
            lists.spW.push(p.w); lists.spH.push(p.h); lists.spLX.push(p.lx); lists.spTY.push(p.ty);
        });
        sprPic.set(key, first);
        return first;
    };
    lists.frPic = []; lists.frRot = []; lists.rtPic = [];
    const frameIndex = new Map();
    const missing = new Set();
    const frameOf = (spr, fr) => {
        const key = spr + fr;
        if (frameIndex.has(key)) return frameIndex.get(key);
        const F = ex.spriteFrames[spr] && ex.spriteFrames[spr][fr];
        if (!F) { missing.add(key); frameIndex.set(key, 0); return 0; }
        if (F.rots[0]) { lists.frPic.push(sprPicOf(F.rots[0].lump, F.rots[0].flip)); lists.frRot.push(0); }
        else {
            lists.frPic.push(lists.rtPic.length + 1); lists.frRot.push(1);
            for (let r = 1; r <= 8; r++) { const R = F.rots[r] || F.rots[1]; lists.rtPic.push(sprPicOf(R.lump, R.flip)); }
        }
        frameIndex.set(key, lists.frPic.length);
        return lists.frPic.length;
    };
    // states
    lists.stFrame = []; lists.stFull = []; lists.stTics = []; lists.stAction = []; lists.stNext = [];
    for (const s of STATES) {
        const full = s.fr.endsWith('!') ? 1 : 0, fr = s.fr[0];
        const isWeapon = WEAPON_SPRITES.has(s.spr);
        lists.stFrame.push(s.name === 'S_NULL' || isWeapon ? 0 : frameOf(s.spr, fr));
        lists.stFull.push(full); lists.stTics.push(s.tics); lists.stAction.push(ACTIONS.indexOf(s.action)); lists.stNext.push(stateIndex[s.next]);
        if (ACTIONS.indexOf(s.action) < 0) throw new Error('action ' + s.action);
    }
    if (missing.size) console.warn('missing sprite frames:', [...missing].join(' '));
    // mobj types: index 1 = player
    const types = [{ key: 'PLAYER', ednum: 1, radius: 16, height: 56, flags: MF.SOLID | MF.SHOOTABLE, health: 100, spawn: 'S_NULL' }, ...Object.values(MOBJ)];
    const typeIndex = Object.fromEntries(types.map((t, i) => [t.key, i + 1]));
    const tyL = (k, f) => { lists['ty' + k] = types.map(f); };
    tyL('Flags', t => t.flags | (t.spawnceil ? MF.SPAWNCEIL : 0)); tyL('Health', t => t.health); tyL('Radius', t => t.radius); tyL('Height', t => t.height);
    tyL('Speed', t => t.speed || 0); tyL('Pain', t => t.painchance || 0); tyL('Mass', t => t.mass || 100); tyL('Damage', t => t.damage || 0);
    const stI = (n) => n ? stateIndex[n] : 0;
    tyL('Spawn', t => stI(t.spawn)); tyL('See', t => stI(t.see)); tyL('PainSt', t => stI(t.pain)); tyL('Melee', t => stI(t.melee)); tyL('Missile', t => stI(t.missile));
    tyL('Death', t => stI(t.death)); tyL('XDeath', t => stI(t.xdeath));
    tyL('Drop', t => t.drop ? typeIndex[t.drop] : 0);
    const kinds = ['none', 'bullets', 'shells', 'rockets', 'cells', 'backpack', 'health', 'hbonus', 'abonus', 'armor', 'soul', 'berserk', 'key', 'weapon'];
    tyL('PKind', t => t.pickup ? kinds.indexOf(t.pickup.kind) : 0); tyL('PAmount', t => t.pickup ? t.pickup.amount : 0);
    tyL('PMsg', t => t.pickup ? t.pickup.msg : '');
    const sounds = new Set();
    for (const t of types) for (const k of ['seeSound', 'painSound', 'deathSound', 'activeSound', 'attackSound']) if (t[k]) sounds.add(t[k]);
    tyL('SSee', t => t.seeSound || ''); tyL('SPain', t => t.painSound || ''); tyL('SDeath', t => t.deathSound || ''); tyL('SActive', t => t.activeSound || ''); tyL('SAttack', t => t.attackSound || '');
    for (const [k, v] of Object.entries(typeIndex)) consts['T_' + k] = v;
    for (const [k, v] of Object.entries(stateIndex)) consts[k] = v;
    ACTIONS.forEach((a, i) => { consts['A_' + a] = i; });
    // weapons
    const wl = (k, f) => { lists['wp' + k] = WEAPONS.map(f); };
    wl('Ammo', w => w.ammo); wl('Up', w => stateIndex[w.up]); wl('Down', w => stateIndex[w.down]); wl('Ready', w => stateIndex[w.ready]);
    wl('Atk', w => stateIndex[w.atk]); wl('Flash', w => stateIndex[w.flash]);

    // =============== map ===============
    const V = M.verts;
    const L = M.lines, SD = M.sides, SC = M.sectors;
    consts.NSECTORS = SC.length;
    lists.secFloor = SC.map(s => s.floor); lists.secCeil = SC.map(s => s.ceil);
    lists.secFFlat = SC.map(s => flatIndex[s.floorPic]); lists.secCFlat = SC.map(s => flatIndex[s.ceilPic]);
    lists.secLight = SC.map(s => s.light); lists.secSky = SC.map(s => s.ceilPic === 'F_SKY1' ? 1 : 0);
    lists.secSpecial = SC.map(s => s.special); lists.secTag = SC.map(s => s.tag);
    const tex = (n) => (n === '-' ? 0 : (texIndex[n] || 0));
    lists.sdTop = SD.map(s => tex(s.upper)); lists.sdMid = SD.map(s => tex(s.mid)); lists.sdBot = SD.map(s => tex(s.lower));
    lists.sdXOff = SD.map(s => s.xoff); lists.sdYOff = SD.map(s => s.yoff); lists.sdSec = SD.map(s => s.sector + 1);
    lists.lnX1 = L.map(l => V[l.v1].x); lists.lnY1 = L.map(l => V[l.v1].y); lists.lnX2 = L.map(l => V[l.v2].x); lists.lnY2 = L.map(l => V[l.v2].y);
    lists.lnDX = L.map(l => V[l.v2].x - V[l.v1].x); lists.lnDY = L.map(l => V[l.v2].y - V[l.v1].y);
    lists.lnBT = L.map(l => Math.max(V[l.v1].y, V[l.v2].y)); lists.lnBB = L.map(l => Math.min(V[l.v1].y, V[l.v2].y));
    lists.lnBL = L.map(l => Math.min(V[l.v1].x, V[l.v2].x)); lists.lnBR = L.map(l => Math.max(V[l.v1].x, V[l.v2].x));
    lists.lnFront = L.map(l => SD[l.side[0]].sector + 1); lists.lnBack = L.map(l => l.side[1] === 65535 ? 0 : SD[l.side[1]].sector + 1);
    lists.lnFlags = L.map(l => l.flags); lists.lnSpecial = L.map(l => l.special); lists.lnTag = L.map(l => l.tag);
    lists.lnSide0 = L.map(l => l.side[0] + 1); lists.lnSide1 = L.map(l => l.side[1] === 65535 ? 0 : l.side[1] + 1);
    lists.lnValid = L.map(() => 0); lists.lnSeen = L.map(() => 0);
    const sgs = M.segs;
    lists.sgX1 = sgs.map(s => V[s.v1].x); lists.sgY1 = sgs.map(s => V[s.v1].y); lists.sgX2 = sgs.map(s => V[s.v2].x); lists.sgY2 = sgs.map(s => V[s.v2].y);
    lists.sgLen = sgs.map(s => Math.hypot(V[s.v2].x - V[s.v1].x, V[s.v2].y - V[s.v1].y));
    lists.sgSide = sgs.map(s => L[s.line].side[s.dir] + 1);
    lists.sgU = sgs.map(s => s.offset + SD[L[s.line].side[s.dir]].xoff);
    lists.sgFront = sgs.map(s => SD[L[s.line].side[s.dir]].sector + 1);
    lists.sgBack = sgs.map(s => { const o = L[s.line].side[s.dir ^ 1]; return o === 65535 || o === undefined ? 0 : SD[o].sector + 1; });
    lists.sgLine = sgs.map(s => s.line + 1); lists.sgFlags = sgs.map(s => L[s.line].flags);
    lists.sgContrast = sgs.map(s => { const a = V[s.v1], b = V[s.v2]; return a.y === b.y ? -16 : a.x === b.x ? 16 : 0; });
    // backface plane: front-facing iff sgNX*px + sgNY*py > sgND
    lists.sgNX = sgs.map(s => V[s.v2].y - V[s.v1].y); lists.sgNY = sgs.map(s => V[s.v1].x - V[s.v2].x);
    lists.sgND = sgs.map(s => (V[s.v2].y - V[s.v1].y) * V[s.v1].x + (V[s.v1].x - V[s.v2].x) * V[s.v1].y);
    lists.sgPeg = sgs.map(s => (L[s.line].flags & 16) ? 1 : 0);
    // side -> segs (texture data per seg is refreshed from the side when a switch changes it)
    lists.sdSegFirst = []; lists.sdSegCount = []; lists.sideSegs = [];
    SD.forEach((_, si) => {
        const mine = []; sgs.forEach((s, k) => { if (L[s.line].side[s.dir] === si) mine.push(k + 1); });
        lists.sdSegFirst.push(lists.sideSegs.length + 1); lists.sdSegCount.push(mine.length); lists.sideSegs.push(...mine);
    });
    lists.ssFirst = M.ssectors.map(s => s.first + 1); lists.ssCount = M.ssectors.map(s => s.count);
    lists.ssSec = M.ssectors.map(s => { const g = sgs[s.first]; return SD[L[g.line].side[g.dir]].sector + 1; });
    const NN = M.nodes.length, NSS = M.ssectors.length;
    consts.NNODES = NN; consts.ROOTNODE = NN; consts.NSUBSECTORS = NSS;
    const enc = (c) => (c & 0x8000) ? -((c & 0x7fff) + 1) : c + 1;
    lists.ndX = M.nodes.map(n => n.x); lists.ndY = M.nodes.map(n => n.y); lists.ndDX = M.nodes.map(n => n.dx); lists.ndDY = M.nodes.map(n => n.dy);
    lists.ndC0 = M.nodes.map(n => enc(n.child[0])); lists.ndC1 = M.nodes.map(n => enc(n.child[1]));
    const bb = Array(NN + NSS).fill(null).map(() => [0, 0, 0, 0]);
    M.nodes.forEach(n => { for (const k of [0, 1]) { const c = enc(n.child[k]); const idx = c > 0 ? c : NN - c; bb[idx - 1] = n.bbox[k]; } });
    lists.bbT = bb.map(b => b[0]); lists.bbB = bb.map(b => b[1]); lists.bbL = bb.map(b => b[2]); lists.bbR = bb.map(b => b[3]);
    // blockmap
    const BM = M.blockmap;
    consts.BMOX = BM.readInt16LE(0); consts.BMOY = BM.readInt16LE(2); consts.BMW = BM.readInt16LE(4); consts.BMH = BM.readInt16LE(6);
    lists.bmOff = []; lists.bmList = [];
    for (let b = 0; b < consts.BMW * consts.BMH; b++) {
        let o = BM.readUInt16LE(8 + b * 2) * 2;
        lists.bmOff.push(lists.bmList.length + 1);
        o += 2;   // skip the leading 0
        for (; ; o += 2) { const v = BM.readUInt16LE(o); if (v === 0xffff) break; lists.bmList.push(v + 1); }
        lists.bmList.push(0);
    }
    lists.rejectB = [...M.reject];
    // things (skill 4 = UV flag 4)
    const byEd = {};
    for (const t of types) if (t.ednum > 0) byEd[t.ednum] = typeIndex[t.key];
    const start = M.things.find(t => t.type === 1);
    consts.PSTARTX = start.x; consts.PSTARTY = start.y; consts.PSTARTA = start.angle;
    const ths = M.things.filter(t => t.type !== 1 && byEd[t.type] && !(t.flags & 16));
    lists.thX = ths.map(t => t.x); lists.thY = ths.map(t => t.y); lists.thAng = ths.map(t => t.angle); lists.thType = ths.map(t => byEd[t.type]);
    lists.thFlags = ths.map(t => t.flags);
    const unknown = new Set(M.things.filter(t => !byEd[t.type] && t.type > 4 && t.type !== 11).map(t => t.type));
    if (unknown.size) console.warn('unknown thing types:', [...unknown].join(' '));
    // initial copies (level restart)
    lists.secFloor0 = [...lists.secFloor]; lists.secCeil0 = [...lists.secCeil]; lists.secLight0 = [...lists.secLight]; lists.secSpecial0 = [...lists.secSpecial];
    lists.lnSpecial0 = [...lists.lnSpecial]; lists.sdTop0 = [...lists.sdTop]; lists.sdMid0 = [...lists.sdMid]; lists.sdBot0 = [...lists.sdBot];
    // sector -> lines, sector -> subsectors
    lists.secLineFirst = []; lists.secLineCount = []; lists.secLines = [];
    lists.secSSFirst = []; lists.secSSCount = []; lists.secSS = [];
    SC.forEach((_, si) => {
        const ls = []; L.forEach((l, k) => { if (lists.lnFront[k] === si + 1 || lists.lnBack[k] === si + 1) ls.push(k + 1); });
        lists.secLineFirst.push(lists.secLines.length + 1); lists.secLineCount.push(ls.length); lists.secLines.push(...ls);
        const ss = []; lists.ssSec.forEach((s, k) => { if (s === si + 1) ss.push(k + 1); });
        lists.secSSFirst.push(lists.secSS.length + 1); lists.secSSCount.push(ss.length); lists.secSS.push(...ss);
    });
    // sector -> segs (front or back)
    lists.secSegFirst = []; lists.secSegCount = []; lists.secSegs = [];
    SC.forEach((_, si) => {
        const ss = []; lists.sgFront.forEach((f, k) => { if (f === si + 1 || lists.sgBack[k] === si + 1) ss.push(k + 1); });
        lists.secSegFirst.push(lists.secSegs.length + 1); lists.secSegCount.push(ss.length); lists.secSegs.push(...ss);
    });
    // switch texture partners
    lists.txSwitch = ex.textures.map(t => {
        const p = t.name.startsWith('SW1') ? 'SW2' + t.name.slice(3) : t.name.startsWith('SW2') ? 'SW1' + t.name.slice(3) : null;
        return p && texIndex[p] ? texIndex[p] : 0;
    });

    // =============== UI pictures (hud / face / screen share one list) ===============
    const ui = [];
    const uiIndex = {};
    const addUi = (name, patchName = name) => {
        const p = ex.patchLump(patchName);
        if (!p) { console.warn('missing UI lump', patchName); return; }
        const rgba = new Uint8Array(p.w * p.h * 4);
        for (let i = 0; i < p.w * p.h; i++) { const c = p.px[i]; if (c < 0) continue; const q = pal[c]; rgba[i * 4] = q[0]; rgba[i * 4 + 1] = q[1]; rgba[i * 4 + 2] = q[2]; rgba[i * 4 + 3] = 255; }
        ui.push({ name, w: p.w, h: p.h, lx: p.lx, ty: p.ty, rgba });
        uiIndex[name] = ui.length;
    };
    for (let d = 0; d < 10; d++) addUi('STTNUM' + d);
    addUi('STTPRCNT'); addUi('STTMINUS');
    for (let d = 0; d < 10; d++) addUi('STYSNUM' + d);
    for (let d = 0; d < 10; d++) addUi('STGNUM' + d);
    for (let d = 0; d < 6; d++) addUi('STKEYS' + d);
    for (let c = 33; c <= 95; c++) addUi('STCFN' + String(c).padStart(3, '0'));
    for (let p = 0; p < 5; p++) {
        addUi(`STFST${p}0`); addUi(`STFST${p}1`); addUi(`STFST${p}2`); addUi(`STFTR${p}0`); addUi(`STFTL${p}0`);
        addUi(`STFOUCH${p}`); addUi(`STFEVL${p}`); addUi(`STFKILL${p}`);
    }
    addUi('STFGOD0'); addUi('STFDEAD0');
    for (let d = 0; d < 10; d++) addUi('WINUM' + d);
    for (const n of ['WIPCNT', 'WICOLON', 'WITIME', 'WIPAR', 'WIOSTK', 'WIOSTI', 'WISCRT2', 'WILV00', 'WIF', 'M_NEWG', 'M_SKILL', 'M_JKILL', 'M_ROUGH', 'M_HURT', 'M_ULTRA', 'M_NMARE',
        'M_SKULL1', 'M_SKULL2', 'M_DOOM', 'TITLEPIC', 'WIMAP0']) addUi(n);
    for (const [k, v] of Object.entries(uiIndex)) { consts['HP_' + k] = v; consts['SP_' + k] = v; }
    consts.HP_FACE0 = uiIndex.STFST00;
    lists.hpW = ui.map(p => p.w); lists.hpH = ui.map(p => p.h); lists.hpLX = ui.map(p => p.lx); lists.hpTY = ui.map(p => p.ty);
    let fontStr = '';
    for (let c = 33; c <= 95; c++) fontStr += String.fromCharCode(c);
    consts.FONTSTR = fontStr + 'abcdefghijklmnopqrstuvwxyz';
    lists.fontGlyph = [...consts.FONTSTR].map((ch, i) => i < 63 ? uiIndex.STCFN033 + i : uiIndex.STCFN033 + ch.toUpperCase().charCodeAt(0) - 33);

    // =============== weapon sprites (psprites), 3 light levels ===============
    const wpn = [];
    const wpnIndex = {};
    lists.stWpn = STATES.map(s => {
        if (!WEAPON_SPRITES.has(s.spr)) return 0;
        const lump = s.spr + s.fr[0] + '0';
        if (!(lump in wpnIndex)) {
            const p = ex.patchLump(lump);
            if (!p) { console.warn('missing weapon lump', lump); wpnIndex[lump] = 0; return 0; }
            wpnIndex[lump] = wpn.length + 1;
            WALL_LEVELS.forEach((lv, li) => {
                const rgba = new Uint8Array(p.w * p.h * 4);
                for (let i = 0; i < p.w * p.h; i++) { const c = p.px[i]; if (c < 0) continue; const q = pal[cmap(lv, c)]; rgba[i * 4] = q[0]; rgba[i * 4 + 1] = q[1]; rgba[i * 4 + 2] = q[2]; rgba[i * 4 + 3] = 255; }
                wpn.push({ name: lump + '_' + li, w: p.w, h: p.h, lx: p.lx, ty: p.ty, rgba });
            });
        }
        return wpnIndex[lump];
    });
    lists.wpW = wpn.map(p => p.w); lists.wpH = wpn.map(p => p.h); lists.wpLX = wpn.map(p => p.lx); lists.wpTY = wpn.map(p => p.ty);

    // =============== sky / status bar / overlays ===============
    const sky = ex.tex.SKY1;
    const SKW = 1440, SKH = 293;
    const skyRgba = new Uint8Array(SKW * SKH * 4);
    for (let y = 0; y < SKH; y++) for (let x = 0; x < SKW; x++) {
        const tx = 255 - (Math.floor(x / 1.875) % 256);           // mirrored, tiled
        const ty = Math.min(sky.h - 1, Math.floor(y / 1.35));
        const c = sky.px[ty * sky.w + tx]; const q = pal[c < 0 ? 0 : c]; const o = (y * SKW + x) * 4;
        skyRgba[o] = q[0]; skyRgba[o + 1] = q[1]; skyRgba[o + 2] = q[2]; skyRgba[o + 3] = 255;
    }
    consts.SKYC = 127.5; consts.SKYY = 21.6 + 100 * 1.35 - SKH / 2;
    const stbar = ex.patchLump('STBAR'), starms = ex.patchLump('STARMS');
    const sbRgba = new Uint8Array(320 * 32 * 4);
    const blit = (p, ox, oy) => { for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) { const c = p.px[y * p.w + x]; if (c < 0) continue; const X = x + ox, Y = y + oy; if (X < 0 || Y < 0 || X >= 320 || Y >= 32) continue; const q = pal[c], o = (Y * 320 + X) * 4; sbRgba[o] = q[0]; sbRgba[o + 1] = q[1]; sbRgba[o + 2] = q[2]; sbRgba[o + 3] = 255; } };
    blit(stbar, 0, 0); blit(starms, 104, 0);
    const solid = (w, h, c) => { const r = new Uint8Array(w * h * 4); for (let i = 0; i < w * h; i++) { r[i * 4] = c[0]; r[i * 4 + 1] = c[1]; r[i * 4 + 2] = c[2]; r[i * 4 + 3] = 255; } return r; };
    consts.NUIPICS = ui.length; consts.NWPNPICS = wpn.length;
    const objPics = {
        world: pics,
        hud: ui, face: ui, screen: ui,
        weapon: wpn, flash: wpn,
        sky: [{ name: 'sky', w: SKW, h: SKH, rgba: skyRgba }],
        statusbar: [{ name: 'stbar', w: 320, h: 32, rgba: sbRgba }],
        overlay: [{ name: 'red', w: 480, h: 227, rgba: solid(480, 227, [255, 0, 0]) }, { name: 'gold', w: 480, h: 227, rgba: solid(480, 227, [215, 186, 69]) }],
        amback: [{ name: 'black', w: 480, h: 227, rgba: solid(480, 227, [0, 0, 0]) }],
        automap: [{ name: 'dot', w: 1, h: 1, rgba: new Uint8Array([0, 0, 0, 0]) }],
    };

    // =============== sounds (DMX -> WAV) ===============
    const SOUNDS = ['PISTOL', 'SHOTGN', 'CLAW', 'SLOP', 'BAREXP', 'PLPAIN', 'PLDETH', 'POSIT1', 'POSIT2', 'POSIT3', 'BGSIT1', 'BGSIT2', 'SGTSIT', 'SGTATK', 'PODTH1', 'PODTH2', 'PODTH3',
        'BGDTH1', 'BGDTH2', 'SGTDTH', 'POPAIN', 'DMPAIN', 'POSACT', 'BGACT', 'DMACT', 'FIRSHT', 'FIRXPL', 'RLAUNC', 'PLASMA', 'ITEMUP', 'WPNUP', 'GETPOW', 'OOF', 'NOWAY',
        'DOROPN', 'DORCLS', 'BDOPN', 'BDCLS', 'PSTART', 'PSTOP', 'STNMOV', 'SWTCHN', 'SWTCHX', 'SAWUP', 'SAWIDL', 'SAWFUL', 'SAWHIT', 'PUNCH'];
    const soundFiles = [];
    for (const s of SOUNDS) {
        const d = ex.wad.get('DS' + s);
        if (!d) { console.warn('missing sound', s); continue; }
        const rate = d.readUInt16LE(2), count = d.readUInt32LE(4);
        const samples = d.subarray(8 + 16, 8 + count - 16);
        const wav = Buffer.alloc(44 + samples.length);
        wav.write('RIFF', 0); wav.writeUInt32LE(36 + samples.length, 4); wav.write('WAVE', 8); wav.write('fmt ', 12);
        wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate, 28);
        wav.writeUInt16LE(1, 32); wav.writeUInt16LE(8, 34); wav.write('data', 36); wav.writeUInt32LE(samples.length, 40);
        samples.copy(wav, 44);
        soundFiles.push({ id: s, name: s, buf: wav, ext: 'wav', duration: Math.max(0.05, samples.length / rate) });
    }

    consts.NWORLDPICS = pics.length;
    for (const [k, v] of Object.entries(lists)) if (v.length > 5000) throw new Error(`list ${k} has ${v.length} items (>5000)`);
    return { ex, pics, objPics, soundFiles, lists, consts, sounds: [...sounds], texIndex, flatIndex, typeIndex };
}

export const FUNC_WEIGHTS = { cols1: 40, cols2: 40, drawItems: 60, projectSprite: 4, renderView: 1 };
export function declPrelude(D) { return Object.keys(D.lists).map(k => 'let ' + k + ' = [];').join('\n'); }
export function sources() {
    return SRC_FILES.map(f => fs.readFileSync(path.join(HERE, 'src', f), 'utf8'));
}

// ---------------- .ent ----------------
export async function buildEnt(outFile) {
    const { packEnt } = await import('./pack.mjs');
    const D = await buildData();
    const prog = compileProgram([declPrelude(D), ...sources()], { consts: D.consts, funcWeights: FUNC_WEIGHTS });
    // inject list data
    for (const v of prog.variables) {
        if (v.variableType === 'list' && D.lists[v.name]) v.array = D.lists[v.name].map((d, i) => ({ id: `${v.id}_${i}`, data: d }));
    }
    const unusedLists = Object.keys(D.lists).filter(k => !prog.variables.some(v => v.name === k));
    if (unusedLists.length) console.warn('data lists not declared in source:', unusedLists.join(' '));
    const t0 = Date.now();
    const encoded = new Map();   // pics array -> encoded pictures (shared lists encode once)
    const encode = async (arr) => {
        if (encoded.has(arr)) return encoded.get(arr);
        const out = [];
        for (let i = 0; i < arr.length; i++) { const p = arr[i]; out.push({ id: String(i + 1), name: p.name, buf: await pngRaw(p.rgba, p.w, p.h), w: p.w, h: p.h }); }
        encoded.set(arr, out);
        return out;
    };
    const P = D.objPics;
    const HUDS = { scaleX: 1.5, scaleY: 1.35 };
    const face0 = D.objPics.face[D.consts.HP_FACE0 - 1];
    const O = (id, name, extra = {}) => ({ id, name, script: prog.objectScripts[name] || [[]], ...extra });
    // objects[0] is the top-most layer in Entry
    const objects = [
        O('scrn', 'screen', { pictures: await encode(P.screen), entity: { x: 0, y: -400, ...HUDS } }),
        O('hudo', 'hud', { pictures: await encode(P.hud), entity: { x: 0, y: -400, ...HUDS } }),
        O('face', 'face', { pictures: await encode(P.face), entity: { x: (143 - face0.lx + face0.w / 2 - 160) * 1.5, y: 135 - (168 - face0.ty + face0.h / 2) * 1.35, ...HUDS } }),
        O('stbr', 'statusbar', { pictures: await encode(P.statusbar), entity: { x: 0, y: 135 - 184 * 1.35, ...HUDS } }),
        O('ovly', 'overlay', { pictures: await encode(P.overlay), entity: { x: 0, y: 21.6, visible: false } }),
        O('flsh', 'flash', { pictures: await encode(P.flash), entity: { x: 0, y: -400, ...HUDS } }),
        O('wpno', 'weapon', { pictures: await encode(P.weapon), entity: { x: 0, y: -400, ...HUDS } }),
        O('amap', 'automap', { pictures: await encode(P.automap), entity: { x: 0, y: 0 } }),
        O('ambk', 'amback', { pictures: await encode(P.amback), entity: { x: 0, y: 21.6, visible: false } }),
        O('wrld', 'world', { pictures: await encode(P.world), sounds: D.soundFiles, entity: { x: 0, y: -400, scaleX: 1, scaleY: 1 } }),
        O('skyo', 'sky', { pictures: await encode(P.sky), entity: { x: 0, y: D.consts.SKYY } }),
    ];
    console.log('pictures encoded in', Date.now() - t0, 'ms:', objects.map(o => o.name + '=' + o.pictures.length).join(' '));
    fs.writeFileSync(outFile + '.lines.json', JSON.stringify({ blockLines: prog.blockLines, srcLines: prog.srcLines }));
    const project = packEnt(outFile, { name: 'DOOM', tmpDir: path.join(HERE, '.pack'), variables: prog.variables, functions: prog.functions, messages: prog.messages, objects, speed: 60 });
    console.log('wrote', outFile, fs.statSync(outFile).size, 'bytes;', prog.stats);
    return project;
}
// hot variables first (Entry looks variables/lists up linearly)
const HOT = ['iCos', 'iX', 'iY', 'iV', 'iU', 'iNext', 'bHead', 'clipTop', 'clipBot', 'sLo', 'sHi', 'stPic', 'sgX1', 'sgY1', 'sgX2', 'sgY2', 'sgU', 'sgLen', 'sgFront', 'sgBack', 'sgSide',
    'secCeil', 'secFloor', 'secLight', 'secSky', 'secCFlat', 'secFFlat', 'flPic', 'sdTop', 'sdMid', 'sdBot', 'sdYOff', 'txW', 'txNs', 'txFirst', 'txImg', 'txH', 'txMFirst', 'sgFlags', 'sgContrast', 'sgLine', 'lnSeen',
    'bspStack', 'bbT', 'bbB', 'bbL', 'bbR', 'ndX', 'ndY', 'ndDX', 'ndDY', 'ndC0', 'ndC1', 'ssFirst', 'ssCount', 'ssSec', 'secVis', 'secThing', 'mSNext', 'mSpr', 'mX', 'mY', 'mZ', 'mAng', 'mFull',
    'frPic', 'frRot', 'rtPic', 'spW', 'spH', 'spLX', 'spTY', 'vx', 'vy', 'vz', 'vang', 'r_frame'];
function orderVariables(vars) {
    const rank = (v) => { const i = HOT.indexOf(v.name); return i < 0 ? 1000 : i; };
    return [...vars].sort((a, b) => rank(a) - rank(b));
}

if (process.argv[1] && import.meta.url === url.pathToFileURL(path.resolve(process.argv[1])).href) {
    await buildEnt(process.argv[2] || path.join(HERE, 'doom.ent'));
}
