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

const W = 480, H = 270;

export function createSim({ fps = 30 } = {}) {
    const D = buildData();
    const srcs = [declPrelude(D), ...sources()];
    const prog = compileProgram(srcs, { consts: D.consts });     // syntax check with the real backend
    const js = Object.entries(D.consts).map(([k, v]) => 'const ' + k + '=' + JSON.stringify(v) + ';').join('\n') + '\n' + compileToJS(srcs);

    const R = { handlers: [], $i: 0, data: D.lists, snd: { plays: 0, stops: 0, vol: 100, speed: 1, last: null } };
    // v8: Entry real-time variables. Alone they are plain values; t7/multi.mjs
    // plugs in a model of Entry's cloud-variable server (R.rtNet).
    R.rtDefaults = {}; R.rtLocal = {};
    R.rtDefault = (n, v) => { R.rtDefaults[n] = v; R.rtLocal[n] = v; };
    R.rtGet = (n) => (R.rtNet ? R.rtNet.get(n) : R.rtLocal[n]);
    R.rtSet = (n, v) => { if (R.rtNet) R.rtNet.set(n, v); else R.rtLocal[n] = v; };
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
    const SX = (x) => x + W / 2;
    const SY = (y) => H / 2 - y;
    function drawPoly(pts, col) {
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
        rand: (a, b) => (Number.isInteger(+a) && Number.isInteger(+b) ? Math.floor(+a + Math.random() * (b - a + 1)) : a + Math.random() * (b - a)),
        str: (...a) => a.join(''), indexOf: (s, sub) => String(s).indexOf(String(sub)) + 1,
        charAt: (s, i) => String(s)[i - 1], strlen: (s) => String(s).length, substr: (s, a, b) => String(s).slice(a - 1, b),
        key: (c) => keys.has(c), mouseX: () => mouse.x, mouseY: () => mouse.y, mouseDown: () => mouse.down,
        timer: () => simTime, timerReset: () => { simTime = 0; }, timerStart: () => { },
        // exactly Entry.rgb2hex: shifts truncate r and g, b goes in as it is
        rgb: (r, g, b) => '#' + ((1 << 24) + (+r << 16) + (+g << 8) + +b).toString(16).slice(1),
        goto: (x, y) => { cur.x = +x; cur.y = +y; if (filling) filling.push([cur.x, cur.y]); },
        fillStart: () => { filling = [[cur.x, cur.y]]; },
        fillStop: () => { if (filling) drawPoly(filling, penTr > 0 ? [fillCol[0], fillCol[1], fillCol[2], Math.round(255 * (1 - penTr / 100))] : fillCol); filling = null; },
        fillColorHex: (c) => { fillCol = parseHex(c); },
        penAlpha: (v) => { penTr = Math.max(0, Math.min(100, +v)); },
        penColorHex: () => { }, penColor: () => { }, penSize: () => { }, penDown: () => { }, penUp: () => { },
        eraseAll: () => { px.fill(0); },
        write: (t) => { texts[curObj] = String(t); },
        show: () => { }, hide: () => { }, costume: () => { }, setSize: () => { }, resetSize: () => { },
        stretchW: () => { }, stretchH: () => { }, effect: () => { }, clearEffects: () => { },
        cloneSelf: () => { }, deleteClone: () => { }, stamp: () => { },
        sound: (n) => { R.snd.plays++; R.snd.last = n; }, stopSounds: () => { R.snd.stops++; }, volume: (v) => { R.snd.vol = +v; },
        nickname: () => (R.nick !== undefined ? R.nick : ' '),
        soundSpeed: (v) => { R.snd.speed = Math.max(0.5, Math.min(2, +v)); },
        ask: (q) => { R.asked = String(q); }, answer: () => (R.answerText !== undefined ? R.answerText : ''), hideAnswer: () => { }, textColor: () => { }, textColorHex: () => { }, dateSec: () => Math.floor(Date.now() / 1000) % 60,
        broadcast: () => { }, toFront: () => { }, toBack: () => { },
        stopAll: () => { }, stopThread: () => { }, waitSec: () => { }, waitUntil: () => { },
    };
    const names = Object.keys(B);
    new Function('R', ...names, js + '\nreturn R;')(R, ...names.map(n => B[n]));

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
