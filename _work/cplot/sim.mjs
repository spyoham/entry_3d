// Node simulator: the same EJS program through the JS backend, with Entry's
// objects modelled as far as the grapher uses them - threads, clones (each
// with its own pen and its own object variables), keys, the pointer, ask.
// The pen strokes are rasterised so a picture can be compared without a browser.
//   node sim.mjs "formula" [out.png] [k=v ...]
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { createRequire } from 'node:module';
import { compileToJS } from './ejs.mjs';
import { sources, consts as buildConsts } from './build.mjs';
const require = createRequire(new URL('../../entry-vibe-coding/package.json', import.meta.url));
const HERE = path.dirname(url.fileURLToPath(import.meta.url));

export const SS = 2;                       // picture pixels per stage unit
export const W = 480 * SS, H = 270 * SS;
const OBJECTS = ['pen', 'grid', 'axes', 'bot', 'top', 'help'];     // back to front

export function createSim({ consts = {}, listMax = 5000, tf = [] } = {}) {
    const C = { ...buildConsts, ...consts };
    const { src } = sources(tf, C.BENCH !== 0);
    const js = Object.entries(C).map(([k, v]) => `const ${k}=${JSON.stringify(v)};`).join('\n') + '\n' + compileToJS([src]);
    const keys = new Set();
    const mouse = { x: 0, y: 0, down: false };
    const answers = [];
    let simTime = 0, wall = 0, lastAnswer = '';
    const ovDefaults = {};
    let seq = 0;
    const newEntity = (obj, from) => ({
        obj, id: seq++, clone: !!from, dead: false, visible: true, text: '',
        vars: from ? { ...from.vars } : Object.fromEntries(Object.entries(ovDefaults).filter(([k]) => k.startsWith(obj + '$'))),
        pen: { x: from ? from.pen.x : 0, y: from ? from.pen.y : 0, down: false, col: from ? from.pen.col : [255, 0, 0], size: from ? from.pen.size : 1, alpha: from ? from.pen.alpha : 1, strokes: [] },
    });
    const entities = [];
    let cur = null;
    const threads = [];
    const stats = { strokes: 0, clones: 0, maxClones: 0, maxStrokesPerPen: 0 };
    const comparable = (v) => (typeof v === 'string' && v.length && !isNaN(Number(v)) ? Number(v) : v);
    const isNum = (v) => typeof v === 'number' || (typeof v === 'string' && /^-?\d+\.?\d*$/.test(v));
    const check = (A, i, name) => { if (!(i >= 1 && i <= A.length) || Math.floor(i) !== i) throw new Error(`list ${name || '?'} index ${i} out of range (len ${A.length})`); };
    const R = {
        handlers: [], $i: 0, self: null,
        get: (A, i, name) => { check(A, i, name); return A[i - 1]; },
        set: (A, i, v, name) => { check(A, i, name); A[i - 1] = v; },
        removeAt: (A, i) => { check(A, i); A.splice(i - 1, 1); },
        push: (A, v) => { A.push(v); if (A.length > listMax) throw new Error('a list grew past ' + listMax + ' items'); },
        // Entry's PLUS: text unless both sides are numbers
        add: (a, b) => (isNum(a) && isNum(b)) ? Number(a) + Number(b) : String(a) + String(b),
        // Entry's division: BigNumber, 20 decimal places
        div: (a, b) => { const r = a / b; return (r === 0 || !isFinite(r) || Math.abs(r) >= 1e-3) ? r : Number(r.toFixed(20)); },
        mod: (a, b) => a - b * Math.floor(a / b),
        cmp: (op, a, b) => { a = comparable(a); b = comparable(b); switch (op) { case 0: return a === b; case 1: return a != b; case 2: return a < b; case 3: return a > b; case 4: return a <= b; default: return a >= b; } },
        and: (a, b) => !!(a && b), or: (a, b) => !!(a || b), s: (v) => String(v),
        on: (ev, obj, gen) => R.handlers.push({ ev, obj, gen }),
        ovar: (name, init) => { ovDefaults[name] = init; },
    };
    const str = (s) => String(s);
    const B = {
        sind: (d) => Math.sin((d % 360) * Math.PI / 180), cosd: (d) => Math.cos((d % 360) * Math.PI / 180), tand: (d) => Math.tan((d % 360) * Math.PI / 180),
        atand: (v) => Math.atan(v) * 180 / Math.PI,
        idiv: (a, b) => Math.floor(a / b), mod: R.mod, sqr: (v) => v * v,
        strlen: (s) => str(s).length,
        substr: (s, a, b) => { s = str(s); const st = a - 1, en = b - 1, L = s.length - 1; if (!(st >= 0 && en >= 0 && st <= L && en <= L)) throw new Error(`substring ${a}..${b} of ${s.length}`); return s.substring(Math.min(st, en), Math.max(st, en) + 1); },
        charAt: (s, i) => { s = str(s); const k = i - 1; if (!(k >= 0 && k <= s.length - 1)) throw new Error(`char_at ${i} of ${s.length}`); return s[k]; },
        indexOf: (s, sub) => str(s).indexOf(str(sub)) + 1,
        str: (...a) => a.join(''),
        key: (c) => keys.has(c), mouseX: () => mouse.x, mouseY: () => mouse.y, mouseDown: () => mouse.down,
        timer: () => simTime, timerStart: () => { }, timerReset: () => { simTime = 0; },
        dateSec: () => Math.floor(wall) % 60,
        ask: () => { lastAnswer = answers.length ? answers.shift() : ''; }, answer: () => lastAnswer,
        write: (t) => { cur.text = String(t); }, show: () => { cur.visible = true; }, hide: () => { cur.visible = false; },
        penSize: (v) => { cur.pen.size = +v; },
        penColorHex: (c) => { c = String(c); if (!/^#[0-9a-f]{6}$/i.test(c)) throw new Error('pen colour ' + c); cur.pen.col = [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; },
        penColor: (c) => B.penColorHex(c),
        penAlpha: (v) => { cur.pen.alpha = 1 - v / 100; },
        penDown: () => { cur.pen.down = true; }, penUp: () => { cur.pen.down = false; },
        goto: (x, y) => {
            const pen = cur.pen; x = +x; y = +y;
            if (!isFinite(x) || !isFinite(y)) throw new Error(`goto ${x},${y}`);
            if (pen.down) { pen.strokes.push([pen.x, pen.y, x, y, pen.size, pen.col, pen.alpha]); stats.strokes++; if (pen.strokes.length > stats.maxStrokesPerPen) stats.maxStrokesPerPen = pen.strokes.length; }
            pen.x = x; pen.y = y;
        },
        eraseAll: () => { cur.pen.strokes = []; },
        cloneSelf: () => {
            if (entities.filter(e => e.clone && !e.dead).length >= 360) throw new Error('more than 360 clones');
            // (as Entry: straight under the entity that made it, and under that entity's strokes)
            const e = newEntity(cur.obj, cur); entities.splice(entities.indexOf(cur), 0, e);
            for (const h of R.handlers) if (h.ev === 'clone' && h.obj === cur.obj) threads.push({ ent: e, g: h.gen() });
            stats.clones = entities.filter(x => x.clone && !x.dead).length; if (stats.clones > stats.maxClones) stats.maxClones = stats.clones;
        },
        deleteClone: () => { if (cur.clone) { cur.dead = true; cur.pen.strokes = []; } },
    };
    const names = Object.keys(B);
    const fnNames = [...js.matchAll(/^function (\w+)\(/gm)].map(m => m[1]);
    new Function('R', ...names, js + `\nR.fn = {${fnNames.join(',')}};\nreturn R;`)(R, ...names.map(n => B[n]));
    const base = {};
    for (const obj of OBJECTS) { const e = newEntity(obj, null); base[obj] = e; entities.push(e); }
    if (R.handlers.some(h => !OBJECTS.includes(h.obj))) throw new Error('a handler of an unknown object');
    for (const h of R.handlers) if (h.ev === 'start') { if (!base[h.obj]) throw new Error('no object ' + h.obj); threads.push({ ent: base[h.obj], g: h.gen() }); }
    const px = new Uint8Array(W * H * 3);
    function rect(s) {
        let [x0, y0, x1, y1, size, col, alpha] = s;
        if (x1 < x0) { const t = x0; x0 = x1; x1 = t; }
        if (y1 < y0) { const t = y0; y0 = y1; y1 = t; }
        // butt caps: a level stroke is as long as its two points say, and `size` high
        let X0, X1, Y0, Y1;
        if (y0 === y1) { X0 = (x0 + 240) * SS; X1 = (x1 + 240) * SS; Y0 = (135 - y0 - size / 2) * SS; Y1 = (135 - y0 + size / 2) * SS; }
        else if (x0 === x1) { X0 = (x0 + 240 - size / 2) * SS; X1 = (x0 + 240 + size / 2) * SS; Y0 = (135 - y1) * SS; Y1 = (135 - y0) * SS; }
        else {
            // a slanted stroke: squares of its thickness along it
            const L = Math.hypot(x1 - x0, y1 - y0), [ax, ay, bx, by] = s, n = Math.ceil(L * SS) + 1, h = Math.max(1, Math.round(size * SS)) / 2;
            for (let i = 0; i <= n; i++) {
                const cx = (ax + (bx - ax) * i / n + 240) * SS, cy = (135 - (ay + (by - ay) * i / n)) * SS;
                for (let yy = Math.max(0, Math.round(cy - h)); yy < Math.min(H, Math.round(cy + h)); yy++) for (let xx = Math.max(0, Math.round(cx - h)); xx < Math.min(W, Math.round(cx + h)); xx++) { const o = (yy * W + xx) * 3; px[o] += (col[0] - px[o]) * alpha; px[o + 1] += (col[1] - px[o + 1]) * alpha; px[o + 2] += (col[2] - px[o + 2]) * alpha; }
            }
            return;
        }
        X0 = Math.max(0, Math.round(X0)); X1 = Math.min(W, Math.round(X1)); Y0 = Math.max(0, Math.round(Y0)); Y1 = Math.min(H, Math.round(Y1));
        for (let yy = Y0; yy < Y1; yy++) { let o = (yy * W + X0) * 3; for (let xx = X0; xx < X1; xx++) { px[o] += (col[0] - px[o]) * alpha; px[o + 1] += (col[1] - px[o + 1]) * alpha; px[o + 2] += (col[2] - px[o + 2]) * alpha; o += 3; } }
    }
    function compose({ axes = true } = {}) {
        px.fill(255);
        // back to front (`entities` is kept in that order)
        for (const e of entities) { if (e.obj === 'axes' && !axes) continue; if (!e.dead) for (const s of e.pen.strokes) rect(s); }
        return px;
    }
    const sim = {
        R, js, keys, mouse, answers, stats, entities, base,
        fn: R.fn,
        get time() { return simTime; },
        frame(dt = 1 / 60) {
            simTime += dt; wall += dt;
            for (let i = 0; i < threads.length; i++) {
                const t = threads[i];
                if (t.done || t.ent.dead) continue;
                cur = t.ent; R.self = t.ent.vars;
                if (t.g.next().done) t.done = true;
            }
            for (let i = threads.length - 1; i >= 0; i--) if (threads[i].done || threads[i].ent.dead) threads.splice(i, 1);
            stats.clones = entities.filter(x => x.clone && !x.dead).length;
        },
        // run a library function as the object `obj` would
        as(obj, f) { cur = base[obj]; R.self = cur.vars; return f(); },
        peek: (n) => R.peek(n), poke: (n, v) => R.poke(n, v),
        text: (obj) => base[obj].text,
        compose,
        // frames until the picture is complete (the pen rests)
        settle(max = 100000) { let n = 0; do { sim.frame(); n++; } while ((R.peek('rState') !== 0 || R.peek('vgen') !== R.peek('rView')) && n < max); sim.frame(); return n; },
        async png(file, opt) {
            const sharp = require('sharp');
            await sharp(Buffer.from(compose(opt)), { raw: { width: W, height: H, channels: 3 } }).png().toFile(file);
            return file;
        },
    };
    return sim;
}

if (process.argv[1] && import.meta.url === url.pathToFileURL(path.resolve(process.argv[1])).href) {
    const args = process.argv.slice(2);
    const formula = args.find(a => !a.endsWith('.png') && !/^\w+=[-\d.e]+$/.test(a));
    const out = args.find(a => a.endsWith('.png')) || path.join(HERE, 'out.png');
    const s = createSim();
    s.frame();
    for (const a of args.filter(a => /^\w+=[-\d.e]+$/.test(a))) { const [k, v] = a.split('='); s.poke(k, Number(v)); }
    s.poke('helpOn', 0);
    if (formula) { s.as('top', () => s.fn.setFormula(formula)); }
    s.poke('vgen', s.peek('vgen') + 1);
    const t0 = performance.now();
    const n = s.settle();
    await s.png(out);
    console.log('frames', n, 'ms', (performance.now() - t0).toFixed(0), 'cells', s.peek('nCells'), 'strokes now', s.entities.filter(e => !e.dead).reduce((a, e) => a + e.pen.strokes.length, 0), JSON.stringify(s.stats), 'top:', s.text('top'), '| bot:', s.text('bot'), '| err', s.peek('cerr'), 'pn', s.peek('pn'));
}
