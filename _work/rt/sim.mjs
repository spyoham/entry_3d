// Node simulator: runs the same EJS program through the JS backend and
// rasterises the pen strokes, so the renderer can be checked without a browser.
//   node sim.mjs [frames=1] [out.png] [k=v ...]     (k=v pokes a global before the first frame)
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { createRequire } from 'node:module';
import { compileToJS } from './ejs.mjs';
import { sources, defaultConsts } from './build.mjs';
const require = createRequire(new URL('../../entry-vibe-coding/package.json', import.meta.url));
const sharp = require('sharp');
const HERE = path.dirname(url.fileURLToPath(import.meta.url));

export const SS = 4;                 // picture pixels per stage unit (run edges are quarter units)
export const W = 480 * SS, H = 270 * SS;

export function createSim({ consts = {}, fps = 60 } = {}) {
    const C = { ...defaultConsts, ...consts };
    const { src } = sources();
    const js = Object.entries(C).map(([k, v]) => `const ${k}=${JSON.stringify(v)};`).join('\n') + '\n' + compileToJS([src]);
    const keys = new Set();
    let simTime = 0;
    const texts = {};
    let curObj = '';
    const px = new Uint8Array(W * H * 3);
    const pens = {};
    const penOf = () => (pens[curObj] ||= { x: 0, y: 0, down: false, col: [255, 0, 0], size: 1, strokes: [] });
    const stats = { strokes: 0, colours: 0, small: 0 };
    let colourRuns = [];                 // strokes per colour change, as tessvm would group them
    const comparable = (v) => (typeof v === 'string' && v.length && !isNaN(Number(v)) ? Number(v) : v);
    const check = (A, i, name) => { if (!(i >= 1 && i <= A.length) || Math.floor(i) !== i) throw new Error(`list ${name || '?'} index ${i} out of range (len ${A.length})`); };
    const R = {
        handlers: [], $i: 0,
        get: (A, i, name) => { check(A, i, name); return A[i - 1]; },
        set: (A, i, v, name) => { check(A, i, name); if (typeof v === 'number' && !isFinite(v)) throw new Error(`list ${name}: ${v}`); A[i - 1] = v; },
        // (playentry keeps at most 5000 items in a list)
        push: (A, v) => { A.push(v); if (A.length > 5000) throw new Error('a list grew past 5000 items'); },
        add: (a, b) => (typeof a === 'string' && isNaN(+a)) || (typeof b === 'string' && isNaN(+b)) ? a + b : (+a) + (+b),
        mod: (a, b) => a - b * Math.floor(a / b),
        cmp: (op, a, b) => { a = comparable(a); b = comparable(b); switch (op) { case 0: return a === b; case 1: return a != b; case 2: return a < b; case 3: return a > b; case 4: return a <= b; default: return a >= b; } },
        and: (a, b) => !!(a && b), or: (a, b) => !!(a || b), s: (v) => String(v),
        on: (ev, obj, gen) => R.handlers.push({ ev, obj, gen }),
    };
    function compose() {
        px.fill(0);
        for (const name of ['cam', 'penb']) for (const s of (pens[name] ? pens[name].strokes : [])) rect(s[0], s[1], s[2], s[3], s[4]);
    }
    function rect(x0, x1, y, h, col) {
        // butt-capped horizontal stroke, as tessvm draws a two-point stroke
        if (x1 < x0) { const t = x0; x0 = x1; x1 = t; }
        const X0 = Math.max(0, Math.round((x0 + 240) * SS)), X1 = Math.min(W, Math.round((x1 + 240) * SS));
        const Y0 = Math.max(0, Math.round((135 - y - h / 2) * SS)), Y1 = Math.min(H, Math.round((135 - y + h / 2) * SS));
        for (let yy = Y0; yy < Y1; yy++) { let o = (yy * W + X0) * 3; for (let xx = X0; xx < X1; xx++) { px[o++] = col[0]; px[o++] = col[1]; px[o++] = col[2]; } }
    }
    const B = {
        sind: (d) => Math.sin(d * Math.PI / 180), cosd: (d) => Math.cos(d * Math.PI / 180),
        idiv: (a, b) => { if (b === 0) throw new Error('idiv by 0'); return Math.floor(a / b); }, mod: R.mod,
        rgb: (r, g, b) => '#' + ((1 << 24) + (+r << 16) + (+g << 8) + +b).toString(16).slice(1),
        dateSec: () => Math.floor(simTime) % 60,
        key: (c) => keys.has(c), timer: () => simTime, timerStart: () => { }, timerReset: () => { simTime = 0; },
        hide: () => { }, show: () => { },
        write: (t) => { texts[curObj] = String(t); },
        penSize: (v) => { penOf().size = Math.max(1, +v); },
        penColorHex: (c) => { c = String(c); penOf().col = [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; colourRuns.push(0); },
        penDown: () => { penOf().down = true; }, penUp: () => { penOf().down = false; },
        goto: (x, y) => {
            const pen = penOf();
            x = +x; y = +y;
            if (!isFinite(x) || !isFinite(y)) throw new Error(`goto ${x},${y}`);
            if (pen.down) { if (y !== pen.y) throw new Error('a stroke that is not level'); pen.strokes.push([pen.x, x, y, pen.size, pen.col]); stats.strokes++; colourRuns[colourRuns.length - 1]++; }
            pen.x = x; pen.y = y;
        },
        eraseAll: () => { penOf().strokes = []; if (curObj === 'cam') { stats.strokes = 0; colourRuns = []; } },
    };
    const names = Object.keys(B);
    new Function('R', ...names, js + '\nreturn R;')(R, ...names.map(n => B[n]));
    const threads = R.handlers.filter(h => h.ev === 'start').map(h => ({ obj: h.obj, g: h.gen() }));
    return {
        R, js, keys, texts, pixels: px, stats,
        get time() { return simTime; },
        set time(v) { simTime = v; },
        frame(dt = 1 / fps) {
            simTime += dt;
            for (const t of threads) { if (t.done) continue; curObj = t.obj; if (t.g.next().done) t.done = true; }
            compose();
            stats.colours = colourRuns.length; stats.small = colourRuns.filter(n => n < 16).reduce((a, b) => a + b, 0);
        },
        peek: (n) => R.peek(n),
        poke: (n, v) => R.poke(n, v),
        call: (code) => R.peek(code),
        async png(file, scale = 2) {
            let img = sharp(Buffer.from(px), { raw: { width: W, height: H, channels: 3 } });
            if (scale !== SS) img = img.resize(480 * scale, 270 * scale, { kernel: 'nearest' });
            await img.png().toFile(file);
            return file;
        },
    };
}

if (process.argv[1] && import.meta.url === url.pathToFileURL(path.resolve(process.argv[1])).href) {
    const args = process.argv.slice(2);
    const n = Number(args.find(a => /^\d+$/.test(a)) || 1);
    const out = args.find(a => a.endsWith('.png')) || path.join(HERE, 'out.png');
    const s = createSim();
    s.frame();
    for (const a of args.filter(a => a.includes('='))) { const [k, v] = a.split('='); s.poke(k, Number(v)); }
    if (s.peek('qLevel') !== undefined) s.call('setQuality(qLevel)');
    const t0 = performance.now();
    for (let i = 0; i < n; i++) s.frame();
    const ms = (performance.now() - t0) / n;
    await s.png(out);
    console.log('frames', n, 'ms/frame', ms.toFixed(1), 'rows', s.peek('nrow'), 'rays', s.peek('nsamp'), 'runs', s.peek('nrun'), 'colours', s.peek('nused'), 'small-group strokes', s.stats.small, 'text', JSON.stringify(s.texts));
}
