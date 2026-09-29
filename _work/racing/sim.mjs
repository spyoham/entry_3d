// Node simulator: runs the very same EJS program through the JS backend and
// rasterises Entry's pen-fill output to PNG, so the renderer and the race can
// be checked without a browser.
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { buildData, sources, declPrelude } from './build.mjs';
import { compileToJS, compileProgram } from './ejs.mjs';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../entry-vibe-coding/package.json', import.meta.url));
const sharp = require('sharp');
const HERE = path.dirname(url.fileURLToPath(import.meta.url));

const SS = Number(process.env.SIMS || 1);    // SIMS=3: a sharper picture (1440 x 810) of the same frame
const W = 480 * SS, H = 270 * SS;

export function createSim({ fps = 30 } = {}) {
    const D = buildData();
    const srcs = [declPrelude(D), ...sources()];
    const prog = compileProgram(srcs, { consts: D.consts });     // syntax check with the real backend
    const js = Object.entries(D.consts).map(([k, v]) => 'const ' + k + '=' + JSON.stringify(v) + ';').join('\n') + '\n' + compileToJS(srcs);

    const R = { handlers: [], $i: 0, data: D.lists, snd: { plays: 0, stops: 0, vol: 100, speed: 1, last: null } };
    // v2.0.0: Entry Sync ('?!' names, SY_* in the source). Alone they are plain
    // values and lists; t7/multi.mjs plugs in a model of the extension and its
    // server (R.syNet): it replaces a list's contents in place when another
    // player's copy arrives, and hears of every local change (syChanged).
    R.syDefaults = {}; R.syLocal = {}; R.syLists = {};
    R.syDefault = (n, v) => { R.syDefaults[n] = v; R.syLocal[n] = v; };
    R.syGet = (n) => R.syLocal[n];
    R.sySet = (n, v) => { R.syLocal[n] = v; if (R.syNet && R.syNet.varChanged) R.syNet.varChanged(n, v); };
    R.syList = (n, init) => (R.syLists[n] = init.slice());
    R.syChanged = (n, a) => { if (R.syNet) R.syNet.changed(n, a.slice()); };
    const keys = new Set();
    const mouse = { x: 0, y: 0, down: false };
    let simTime = 0;
    const texts = {};
    let curObj = 'pen3';

    // ---- pen canvas ----
    const px = new Uint8Array(W * H * 3);
    const cur = { x: 0, y: 0 };
    let filling = null;
    let fillCol = [255, 255, 255];
    let penTr = 0;
    // v7: #rrggbbaa is a translucent fill (the canvas and pixi both read it)
    const parseHex = (s) => {
        s = String(s);
        if (!/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(s)) return [0, 0, 0, 255];      // Entry cannot parse it either
        if (s[0] === '#') s = s.slice(1);
        return [parseInt(s.slice(0, 2), 16) || 0, parseInt(s.slice(2, 4), 16) || 0, parseInt(s.slice(4, 6), 16) || 0, s.length > 6 ? parseInt(s.slice(6, 8), 16) : 255];
    };
    const SX = (x) => x * SS + W / 2;
    const SY = (y) => H / 2 - y * SS;
    function drawPoly(pts, col) { drawPolyGen(px, pts, col); }
    function drawPolyGen(px, pts, col) {
        const n = pts.length;
        if (n < 3) return;
        let minY = 1e9, maxY = -1e9;
        const xs = new Float64Array(n), ys = new Float64Array(n);
        for (let i = 0; i < n; i++) {
            xs[i] = SX(pts[i][0]); ys[i] = SY(pts[i][1]);
            if (!isFinite(xs[i]) || !isFinite(ys[i])) return;
            if (ys[i] < minY) minY = ys[i];
            if (ys[i] > maxY) maxY = ys[i];
        }
        let y0 = Math.max(0, Math.ceil(minY - 0.5)), y1 = Math.min(H - 1, Math.floor(maxY - 0.5));
        const cross = [];
        for (let y = y0; y <= y1; y++) {
            const sy = y + 0.5;
            cross.length = 0;
            for (let i = 0, j = n - 1; i < n; j = i++) {
                const a = ys[j], b = ys[i];
                if ((a <= sy && b > sy) || (b <= sy && a > sy)) cross.push(xs[j] + (sy - a) / (b - a) * (xs[i] - xs[j]));
            }
            if (!cross.length) continue;
            cross.sort((p, q) => p - q);
            for (let k = 0; k + 1 < cross.length; k += 2) {
                let xa = Math.max(0, Math.ceil(cross[k] - 0.5)), xb = Math.min(W - 1, Math.floor(cross[k + 1] - 0.5));
                const al = col[3] === undefined ? 1 : col[3] / 255;
                for (let x = xa; x <= xb; x++) {
                    const o = (y * W + x) * 3;
                    if (al >= 1) { px[o] = col[0]; px[o + 1] = col[1]; px[o + 2] = col[2]; }
                    else { px[o] += (col[0] - px[o]) * al; px[o + 1] += (col[1] - px[o + 1]) * al; px[o + 2] += (col[2] - px[o + 2]) * al; }
                }
            }
        }
    }

    // ---- v6.2 SIMZ=1: a depth-buffered reference picture of the same frame ----
    // Every polygon quad() hands the pen is also rasterised here with a depth
    // test (1/z interpolated across the screen), so where the painter's order
    // goes wrong the two pictures differ (zDiff). Polygons without a depth
    // (sky, hills before the world; HUD, smoke, far-car cards after it) are
    // background or overlay; road decals (quadS) carry one depth for the lot.
    const ZREF = !!process.env.SIMZ;
    const zpx = ZREF ? new Uint8Array(W * H * 3) : null;
    const zb = ZREF ? new Float64Array(W * H) : null;     // 1/z, 0 = nothing yet
    let zGeo = false;
    function zTri(p, q, r, col, bias) {
        const minY = Math.max(0, Math.ceil(Math.min(p[1], q[1], r[1]) - 0.5)), maxY = Math.min(H - 1, Math.floor(Math.max(p[1], q[1], r[1]) - 0.5));
        const minX = Math.max(0, Math.ceil(Math.min(p[0], q[0], r[0]) - 0.5)), maxX = Math.min(W - 1, Math.floor(Math.max(p[0], q[0], r[0]) - 0.5));
        const den = (q[1] - r[1]) * (p[0] - r[0]) + (r[0] - q[0]) * (p[1] - r[1]);
        if (Math.abs(den) < 1e-9) return;
        for (let y = minY; y <= maxY; y++) {
            const sy = y + 0.5;
            for (let x = minX; x <= maxX; x++) {
                const sx = x + 0.5;
                const a = ((q[1] - r[1]) * (sx - r[0]) + (r[0] - q[0]) * (sy - r[1])) / den;
                const b = ((r[1] - p[1]) * (sx - r[0]) + (p[0] - r[0]) * (sy - r[1])) / den;
                const c = 1 - a - b;
                if (a < -1e-9 || b < -1e-9 || c < -1e-9) continue;
                const iz = a * p[2] + b * q[2] + c * r[2];
                const k = y * W + x;
                if (iz * bias < zb[k]) continue;
                zb[k] = Math.max(zb[k], iz);
                const o = k * 3; zpx[o] = col[0]; zpx[o + 1] = col[1]; zpx[o + 2] = col[2];
            }
        }
    }
    function zPoly(pts, col) {
        const zq = R.zq, zd = R.zd;
        if (!zq && !zd) {
            // no depth: sky and hills before the world, overlays after it
            drawPolyGen(zpx, pts, col);
            return;
        }
        zGeo = true;
        const n = pts.length - 1;       // the last point closes the loop
        if (n < 3) return;
        let v;
        if (zd) v = pts.slice(0, n).map(([x, y]) => [SX(x), SY(y), ZU / zd]);
        else {
            const pz = R.zvZ, psx = R.zsX, psy = R.zsY;
            v = pts.slice(0, n).map(([x, y]) => {
                let z = R.zNear;
                for (const s of zq) if (Math.abs(psx[s - 1] / QSs - x) < 1e-6 && Math.abs(psy[s - 1] / QSs - y) < 1e-6 && pz[s - 1] > R.zNear * 0.999) { z = pz[s - 1]; break; }
                return [SX(x), SY(y), ZU / z];
            });
        }
        // decals sit on the road they were cut from: let them win a near tie
        const bias = zd ? 1.04 : 1.0005;
        for (let i = 1; i + 1 < n; i++) zTri(v[0], v[i], v[i + 1], col, bias);
    }
    const ZU = 1638400, QSs = 16;
    const check = (A, i, name) => {
        if (!(i >= 1 && i <= A.length) || Math.floor(i) !== i) throw new Error(`list ${name || '?'} index ${i} out of range (len ${A.length})`);
    };
    Object.assign(R, {
        get: (A, i, name) => { check(A, i, name); return A[i - 1]; },
        set: (A, i, v, name) => { check(A, i, name); A[i - 1] = v; },
        removeAt: (A, i) => { check(A, i); A.splice(i - 1, 1); },
        insertAt: (A, i, v) => { A.splice(i - 1, 0, v); },
        add: (a, b) => (typeof a === 'string' && isNaN(+a)) || (typeof b === 'string' && isNaN(+b)) ? a + b : (+a) + (+b),
        mod: (a, b) => a - b * Math.floor(a / b),
        and: (a, b) => !!(a && b), or: (a, b) => !!(a || b), s: (v) => String(v),
        on: (ev, obj, gen) => R.handlers.push({ ev, obj, gen }),
    });
    const hex2 = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
    const B = {
        sind: (d) => Math.sin(d * Math.PI / 180), cosd: (d) => Math.cos(d * Math.PI / 180), tand: (d) => Math.tan(d * Math.PI / 180),
        atand: (v) => Math.atan(v) * 180 / Math.PI, asind: (v) => Math.asin(v) * 180 / Math.PI, acosd: (v) => Math.acos(v) * 180 / Math.PI,
        mod: R.mod, idiv: (a, b) => Math.floor(a / b), frac: (v) => v - Math.floor(v),
        // like Entry: two whole numbers give a whole number, inclusive
        // (with a decimal bound Entry rounds to 2 places - toFixed(2) - so
        // rand(0.0001, 0.9999) is 0.00 one time in 200)
        rand: (a, b) => (Number.isInteger(+a) && Number.isInteger(+b) ? Math.floor(+a + Math.random() * (b - a + 1)) : +(a + Math.random() * (b - a)).toFixed(2)),
        str: (...a) => a.join(''), indexOf: (s, sub) => String(s).indexOf(String(sub)) + 1,
        charAt: (s, i) => String(s)[i - 1], strlen: (s) => String(s).length, substr: (s, a, b) => String(s).slice(a - 1, b),
        key: (c) => keys.has(c), mouseX: () => mouse.x, mouseY: () => mouse.y, mouseDown: () => mouse.down,
        timer: () => simTime, timerReset: () => { simTime = 0; }, timerStart: () => { },
        // exactly Entry.rgb2hex: shifts truncate r and g, b goes in as it is
        rgb: (r, g, b) => '#' + ((1 << 24) + (+r << 16) + (+g << 8) + +b).toString(16).slice(1),
        goto: (x, y) => { cur.x = +x; cur.y = +y; if (filling) filling.push([cur.x, cur.y]); },
        fillStart: () => { filling = [[cur.x, cur.y]]; },
        fillStop: () => { if (filling) { drawPoly(filling, penTr > 0 ? [fillCol[0], fillCol[1], fillCol[2], Math.round(255 * (1 - penTr / 100))] : fillCol); if (ZREF) zPoly(filling, fillCol); } filling = null; },
        fillColorHex: (c) => { fillCol = parseHex(c); },
        penAlpha: (v) => { penTr = Math.max(0, Math.min(100, +v)); },
        penColorHex: () => { }, penColor: () => { }, penSize: () => { }, penDown: () => { }, penUp: () => { },
        eraseAll: () => { px.fill(0); if (ZREF) { zpx.fill(0); zb.fill(0); zGeo = false; } },
        write: (t) => { texts[curObj] = String(t); },
        show: () => { }, hide: () => { }, costume: () => { }, setSize: () => { }, resetSize: () => { },
        stretchW: () => { }, stretchH: () => { }, effect: () => { }, clearEffects: () => { },
        cloneSelf: () => { }, deleteClone: () => { }, stamp: () => { },
        sound: (n) => { R.snd.plays++; R.snd.last = n; }, stopSounds: () => { R.snd.stops++; }, volume: (v) => { R.snd.vol = +v; },
        nickname: () => (R.nick !== undefined ? R.nick : ' '),
        soundSpeed: (v) => { R.snd.speed = Math.max(0.5, Math.min(2, +v)); },
        tableSet: (t, r, c, v) => { (R.tables ||= {})[`${t}:${r}:${c}`] = v; }, tableShow: (t) => { R.shownTable = t; },
        ask: (q) => { R.asked = String(q); }, answer: () => (R.answerText !== undefined ? R.answerText : ''), hideAnswer: () => { }, textColor: () => { }, textColorHex: () => { }, dateSec: () => (R.dateSecFn ? R.dateSecFn() : Math.floor(Date.now() / 1000) % 60),
        // (v2.1.0: the wall clock, for the online slots; R.wallMs moves it in tests)
        dateMin: () => new Date(Date.now() + (R.wallMs || 0)).getMinutes(), dateHour: () => new Date(Date.now() + (R.wallMs || 0)).getHours(), dateDay: () => new Date(Date.now() + (R.wallMs || 0)).getDate(),
        broadcast: () => { }, toFront: () => { }, toBack: () => { },
        stopAll: () => { }, stopThread: () => { }, waitSec: () => { }, waitUntil: () => { },
    };
    const names = Object.keys(B);
    new Function('R', ...names, js + '\nreturn R;')(R, ...names.map(n => B[n]));
    if (ZREF) {
        R.peek(`quad = (function (f) { return function (a, b, c, d, m) { R.zq = [a, b, c, d]; R.zvZ = pvZ; R.zsX = psX; R.zsY = psY; R.zNear = NEARZI; f(a, b, c, d, m); R.zq = null; }; })(quad)`);
        R.peek(`quadS = (function (f) { return function (x1, y1, x2, y2, x3, y3, x4, y4, m, dep) { R.zd = Math.max(dep, NEARZI); f(x1, y1, x2, y2, x3, y3, x4, y4, m, dep); R.zd = 0; }; })(quadS)`);
    }

    const threads = [];
    for (const h of R.handlers) if (h.ev === 'start') threads.push({ obj: h.obj, g: h.gen() });

    return {
        D, R, prog, js, keys, mouse, texts,
        get time() { return simTime; },
        frame() {
            simTime += 1 / fps;
            for (const t of threads) {
                if (t.done) continue;
                curObj = t.obj;
                const r = t.g.next();
                if (r.done) t.done = true;
            }
        },
        peek: (n) => R.peek(n),
        poke: (n, v) => R.poke(n, v),
        async png(file) {
            await sharp(Buffer.from(px), { raw: { width: W, height: H, channels: 3 } }).png().toFile(file);
            return file;
        },
        pixels: px,
        zpixels: zpx,
        // the reference picture, and a map of where the two disagree
        async zpng(file, diffFile) {
            await sharp(Buffer.from(zpx), { raw: { width: W, height: H, channels: 3 } }).png().toFile(file);
            // pixels that differ, less one-pixel seams (coplanar edges tie)
            const m = new Uint8Array(W * H);
            for (let i = 0, k = 0; k < W * H; i += 3, k++) m[k] = Math.max(Math.abs(px[i] - zpx[i]), Math.abs(px[i + 1] - zpx[i + 1]), Math.abs(px[i + 2] - zpx[i + 2])) > 24 ? 1 : 0;
            let n = 0;
            const d = new Uint8Array(W * H * 3);
            for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
                const k = y * W + x, i = k * 3;
                let e = m[k];
                if (e) for (let v = -1; v <= 1 && e; v++) for (let u = -1; u <= 1; u++) { const yy = y + v, xx = x + u; if (yy < 0 || yy >= H || xx < 0 || xx >= W || !m[yy * W + xx]) { e = 0; break; } }
                const g = (px[i] + px[i + 1] + px[i + 2]) / 9;
                if (e) { n++; d[i] = 255; d[i + 1] = 40; d[i + 2] = 200; } else { d[i] = d[i + 1] = d[i + 2] = g; }
            }
            if (diffFile) await sharp(Buffer.from(d), { raw: { width: W, height: H, channels: 3 } }).png().toFile(diffFile);
            return n / (W * H);
        },
    };
}

// ---- CLI: node sim.mjs [frames] ----------------------------------------
if (process.argv[1] && import.meta.url === url.pathToFileURL(path.resolve(process.argv[1])).href) {
    const n = Number(process.argv[2] || 60);
    const s = createSim();
    for (let i = 0; i < n; i++) s.frame();
    await s.png(path.join(HERE, 'out.png'));
    console.log('frames', n, 'state', s.peek('raceState'), 'quads', s.peek('drawnQuads'), 'trkLen', s.peek('trkLen'));
    console.log('texts', JSON.stringify(s.texts));
}
