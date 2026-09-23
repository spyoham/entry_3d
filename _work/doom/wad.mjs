// Minimal Doom WAD reader (format per id Software's GPL Doom source, w_wad.c / r_data.c / p_setup.c)
import fs from 'node:fs';

export function readWad(file) {
    const buf = fs.readFileSync(file);
    const numLumps = buf.readInt32LE(4), dirOfs = buf.readInt32LE(8);
    const lumps = [];
    for (let i = 0; i < numLumps; i++) {
        const o = dirOfs + i * 16;
        const pos = buf.readInt32LE(o), size = buf.readInt32LE(o + 4);
        const name = buf.toString('latin1', o + 8, o + 16).replace(/\0.*$/, '').toUpperCase();
        lumps.push({ name, pos, size, data: buf.subarray(pos, pos + size) });
    }
    const find = (name, from = 0) => { for (let i = from; i < lumps.length; i++) if (lumps[i].name === name) return i; return -1; };
    const get = (name) => { const i = find(name); return i < 0 ? null : lumps[i].data; };
    // lumps between two markers (e.g. S_START..S_END, F_START..F_END)
    const between = (a, b) => {
        const out = []; let inside = false;
        for (const l of lumps) {
            if (l.name === a || l.name === a[0] + a) { inside = true; continue; }
            if (l.name === b || l.name === b[0] + b) { inside = false; continue; }
            if (inside && l.size > 0) out.push(l);
        }
        return out;
    };
    return { buf, lumps, find, get, between };
}

export function readMap(wad, name) {
    const i = wad.find(name);
    if (i < 0) throw new Error('no map ' + name);
    const L = (n) => { for (let k = i + 1; k < i + 12; k++) if (wad.lumps[k].name === n) return wad.lumps[k].data; throw new Error(n); };
    const rec = (d, sz, f) => { const out = []; for (let o = 0; o + sz <= d.length; o += sz) out.push(f(o)); return out; };
    const str8 = (d, o) => d.toString('latin1', o, o + 8).replace(/\0.*$/, '').toUpperCase();
    const T = L('THINGS'), LD = L('LINEDEFS'), SD = L('SIDEDEFS'), V = L('VERTEXES'), SG = L('SEGS'), SS = L('SSECTORS'), N = L('NODES'), SC = L('SECTORS'), RJ = L('REJECT'), BM = L('BLOCKMAP');
    return {
        things: rec(T, 10, o => ({ x: T.readInt16LE(o), y: T.readInt16LE(o + 2), angle: T.readInt16LE(o + 4), type: T.readInt16LE(o + 6), flags: T.readInt16LE(o + 8) })),
        lines: rec(LD, 14, o => ({ v1: LD.readUInt16LE(o), v2: LD.readUInt16LE(o + 2), flags: LD.readInt16LE(o + 4), special: LD.readInt16LE(o + 6), tag: LD.readInt16LE(o + 8), side: [LD.readUInt16LE(o + 10), LD.readUInt16LE(o + 12)] })),
        sides: rec(SD, 30, o => ({ xoff: SD.readInt16LE(o), yoff: SD.readInt16LE(o + 2), upper: str8(SD, o + 4), lower: str8(SD, o + 12), mid: str8(SD, o + 20), sector: SD.readInt16LE(o + 28) })),
        verts: rec(V, 4, o => ({ x: V.readInt16LE(o), y: V.readInt16LE(o + 2) })),
        segs: rec(SG, 12, o => ({ v1: SG.readUInt16LE(o), v2: SG.readUInt16LE(o + 2), angle: SG.readInt16LE(o + 4), line: SG.readUInt16LE(o + 6), dir: SG.readInt16LE(o + 8), offset: SG.readInt16LE(o + 10) })),
        ssectors: rec(SS, 4, o => ({ count: SS.readUInt16LE(o), first: SS.readUInt16LE(o + 2) })),
        nodes: rec(N, 28, o => ({ x: N.readInt16LE(o), y: N.readInt16LE(o + 2), dx: N.readInt16LE(o + 4), dy: N.readInt16LE(o + 6),
            bbox: [[0, 1, 2, 3].map(k => N.readInt16LE(o + 8 + k * 2)), [0, 1, 2, 3].map(k => N.readInt16LE(o + 16 + k * 2))],
            child: [N.readUInt16LE(o + 24), N.readUInt16LE(o + 26)] })),
        sectors: rec(SC, 26, o => ({ floor: SC.readInt16LE(o), ceil: SC.readInt16LE(o + 2), floorPic: str8(SC, o + 4), ceilPic: str8(SC, o + 12), light: SC.readInt16LE(o + 20), special: SC.readInt16LE(o + 22), tag: SC.readInt16LE(o + 24) })),
        reject: RJ, blockmap: BM,
    };
}

// Doom picture format (patch / sprite) -> { w, h, lx, ty, px: Int16Array (palette index or -1) }
export function readPatch(d) {
    const w = d.readUInt16LE(0), h = d.readUInt16LE(2), lx = d.readInt16LE(4), ty = d.readInt16LE(6);
    const px = new Int16Array(w * h).fill(-1);
    for (let x = 0; x < w; x++) {
        let o = d.readUInt32LE(8 + x * 4);
        for (;;) {
            const top = d[o]; if (top === 0xff) break;
            const len = d[o + 1];
            for (let k = 0; k < len; k++) { const y = top + k; if (y < h) px[y * w + x] = d[o + 3 + k]; }
            o += len + 4;
        }
    }
    return { w, h, lx, ty, px };
}

// composite wall textures (TEXTURE1/TEXTURE2 + PNAMES)
export function readTextures(wad) {
    const pn = wad.get('PNAMES'); const n = pn.readInt32LE(0);
    const pnames = []; for (let i = 0; i < n; i++) pnames.push(pn.toString('latin1', 4 + i * 8, 12 + i * 8).replace(/\0.*$/, '').toUpperCase());
    const patchCache = {};
    const patch = (name) => {
        if (!(name in patchCache)) { const i = wad.lumps.findIndex(l => l.name === name && l.size > 0); patchCache[name] = i < 0 ? null : readPatch(wad.lumps[i].data); }
        return patchCache[name];
    };
    const tex = {};
    for (const tl of ['TEXTURE1', 'TEXTURE2']) {
        const d = wad.get(tl); if (!d) continue;
        const cnt = d.readInt32LE(0);
        for (let i = 0; i < cnt; i++) {
            const o = d.readInt32LE(4 + i * 4);
            const name = d.toString('latin1', o, o + 8).replace(/\0.*$/, '').toUpperCase();
            const w = d.readInt16LE(o + 12), h = d.readInt16LE(o + 14), pc = d.readInt16LE(o + 20);
            const px = new Int16Array(w * h).fill(-1);
            for (let p = 0; p < pc; p++) {
                const po = o + 22 + p * 10;
                const ox = d.readInt16LE(po), oy = d.readInt16LE(po + 2), pi = d.readInt16LE(po + 4);
                const pt = patch(pnames[pi]); if (!pt) continue;
                for (let x = 0; x < pt.w; x++) for (let y = 0; y < pt.h; y++) {
                    const c = pt.px[y * pt.w + x]; if (c < 0) continue;
                    const X = ox + x, Y = oy + y; if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
                    px[Y * w + X] = c;
                }
            }
            tex[name] = { w, h, px };
        }
    }
    return tex;
}

export function readPalette(wad) {
    const d = wad.get('PLAYPAL');
    const pal = []; for (let i = 0; i < 256; i++) pal.push([d[i * 3], d[i * 3 + 1], d[i * 3 + 2]]);
    return pal;
}
