// Extract Freedoom (BSD) assets + E1M1 into PNG buffers and data tables for the Entry build.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { readWad, readMap, readPatch, readTextures, readPalette } from './wad.mjs';
const require = createRequire('C:/Users/spyoh/entry_3d/entry-vibe-coding/package.json');
const sharp = require('sharp');

export const WALL_LEVELS = [0, 10, 20];          // colormap per wall/sprite light level
export const FLAT_LEVELS = [0, 5, 10, 15, 20, 25];
const STRIP_TEXELS = 4;

const png = (rgba, w, h) => sharp(Buffer.from(rgba), { raw: { width: w, height: h, channels: 4 } }).png({ compressionLevel: 9, palette: false }).toBuffer();

export async function extract(wadFile, mapName, needSprites) {
    const wad = readWad(wadFile);
    const pal = readPalette(wad);
    const cmapLump = wad.get('COLORMAP');
    const cmap = (level, idx) => cmapLump[level * 256 + idx];
    const M = readMap(wad, mapName);
    const tex = readTextures(wad);
    const out = { pal, M };

    // ---------------- flats: average color per level ----------------
    const flatLumps = new Map(wad.between('F_START', 'F_END').map(l => [l.name, l.data]));
    const flatNames = [...new Set(M.sectors.flatMap(s => [s.floorPic, s.ceilPic]))];
    out.flats = flatNames.map(name => {
        const d = flatLumps.get(name);
        const cols = FLAT_LEVELS.map(lv => {
            if (!d) return [255, 0, 255];
            let r = 0, g = 0, b = 0;
            for (let i = 0; i < 4096; i++) { const c = pal[cmap(lv, d[i])]; r += c[0]; g += c[1]; b += c[2]; }
            return [r / 4096, g / 4096, b / 4096].map(Math.round);
        });
        return { name, cols, sky: name === 'F_SKY1' };
    });

    // ---------------- wall textures -> vertical strips ----------------
    const usedTex = new Map();   // name -> area
    {
        const V = M.verts;
        for (const L of M.lines) {
            const len = Math.hypot(V[L.v2].x - V[L.v1].x, V[L.v2].y - V[L.v1].y);
            for (const si of L.side) {
                if (si === 65535) continue;
                const s = M.sides[si];
                for (const t of [s.upper, s.lower, s.mid]) if (t !== '-') usedTex.set(t, (usedTex.get(t) || 0) + len);
            }
        }
        // switch partners
        for (const t of [...usedTex.keys()]) {
            if (t.startsWith('SW1')) usedTex.set('SW2' + t.slice(3), usedTex.get(t));
            if (t.startsWith('SW2')) usedTex.set('SW1' + t.slice(3), usedTex.get(t));
        }
    }
    const texNames = [...usedTex.keys()].filter(t => tex[t]).sort((a, b) => usedTex.get(b) - usedTex.get(a));
    out.textures = [];
    const stripKey = new Map();
    out.strips = [];   // unique strips: { w:1, h, rgba per level }
    for (const name of texNames) {
        const T = tex[name];
        const ns = Math.max(1, Math.round(T.w / (T.w >= 256 ? 8 : STRIP_TEXELS)));
        const reps = Math.ceil(256 / T.h) + 1;
        const imgH = T.h * reps;
        const step = Math.floor(256 / T.h) * T.h || T.h;
        const stripIdx = [];
        const masked = T.px.some(v => v < 0);
        for (let i = 0; i < ns; i++) {
            const x0 = Math.floor(i * T.w / ns), x1 = Math.max(x0 + 1, Math.floor((i + 1) * T.w / ns));
            // sample the middle column (keeps texel crispness; averaging blurs)
            const x = Math.floor((x0 + x1 - 1) / 2);
            const col = []; for (let y = 0; y < T.h; y++) col.push(T.px[y * T.w + x]);
            const key = imgH + ':' + (masked ? 'm' : '') + col.join(',');
            if (!stripKey.has(key)) {
                stripKey.set(key, out.strips.length);
                out.strips.push({ col, reps, imgH, masked: masked ? 1 : 0 });
            }
            stripIdx.push(stripKey.get(key));
        }
        out.textures.push({ name, w: T.w, h: T.h, ns, imgH, step, stripIdx, masked: masked ? 1 : 0 });
    }

    // ---------------- sprites ----------------
    const sprLumps = wad.between('S_START', 'S_END');
    // table: sprite -> frame letter -> { rot0 | rots[1..8] }
    const frames = {};
    for (const l of sprLumps) {
        const nm = l.name, spr = nm.slice(0, 4);
        if (!needSprites.has(spr)) continue;
        const add = (fr, rot, flip) => {
            const F = ((frames[spr] ||= {})[fr] ||= { rots: {} });
            F.rots[rot] = { lump: nm, flip };
        };
        add(nm[4], Number(nm[5]), 0);
        if (nm.length >= 8) add(nm[6], Number(nm[7]), 1);
    }
    out.spriteFrames = frames;
    const patchCache = new Map();
    out.getPatch = (lumpName) => {
        if (!patchCache.has(lumpName)) patchCache.set(lumpName, readPatch(wad.lumps.find(l => l.name === lumpName).data));
        return patchCache.get(lumpName);
    };
    out.patchLump = (name) => { const l = wad.lumps.find(l => l.name === name); return l ? readPatch(l.data) : null; };
    out.wad = wad; out.tex = tex; out.cmap = cmap;
    return out;
}

// render helpers
export async function stripPng(ex, strip, level) {
    const { pal, cmap } = ex;
    const h = strip.imgH, rgba = new Uint8Array(h * 4);
    const th = strip.col.length;
    for (let y = 0; y < h; y++) {
        const c = strip.col[y % th];
        if (c < 0) { rgba[y * 4 + 3] = 0; continue; }
        const p = pal[cmap(level, c)];
        rgba[y * 4] = p[0]; rgba[y * 4 + 1] = p[1]; rgba[y * 4 + 2] = p[2]; rgba[y * 4 + 3] = 255;
    }
    return png(rgba, 1, h);
}
export async function patchPng(ex, patch, level = 0, flip = false, scale = 1) {
    const { pal, cmap } = ex;
    const w = patch.w, h = patch.h, W = w * scale, H = h * scale;
    const rgba = new Uint8Array(W * H * 4);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const sx = flip ? w - 1 - Math.floor(x / scale) : Math.floor(x / scale);
        const c = patch.px[Math.floor(y / scale) * w + sx];
        if (c < 0) continue;
        const p = pal[cmap(level, c)];
        const o = (y * W + x) * 4;
        rgba[o] = p[0]; rgba[o + 1] = p[1]; rgba[o + 2] = p[2]; rgba[o + 3] = 255;
    }
    return png(rgba, W, H);
}
export async function solidPng(rgb, w = 1, h = 1, alpha = 255) {
    const rgba = new Uint8Array(w * h * 4);
    for (let i = 0; i < w * h; i++) { rgba[i * 4] = rgb[0]; rgba[i * 4 + 1] = rgb[1]; rgba[i * 4 + 2] = rgb[2]; rgba[i * 4 + 3] = alpha; }
    return png(rgba, w, h);
}
export { png };
