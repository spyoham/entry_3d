// Node simulator for the EJS program: emulates the Entry builtins used by the
// game (stamps, sizes, costumes, keys, timer) and renders frames to PNG.
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { buildData, sources, declPrelude } from './build.mjs';
import { compileToJS, compileProgram } from './ejs.mjs';
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/spyoh/entry_3d/entry-vibe-coding/package.json');
const sharp = require('sharp');
const HERE = path.dirname(url.fileURLToPath(import.meta.url));

export async function createSim({ objectPics = {} } = {}) {
    const D = await buildData();
    const prelude = declPrelude(D);
    const srcs = [prelude, ...sources()];
    // compile check with the Entry backend too (catches unsupported syntax)
    const prog = compileProgram(srcs, { consts: D.consts });
    const FILES = ['render.js', 'game.js', 'player.js', 'things.js', 'weapons.js', 'specials.js', 'hud.js', 'main.js'];
    const js = Object.entries(D.consts).map(([k, v]) => 'const ' + k + '=' + JSON.stringify(v) + ';').join('\n') + '\n' + compileToJS(srcs);
    const R = { handlers: [], $i: 0, data: D.lists };
    const keys = new Set();
    let simTime = 0, mouse = { x: 0, y: 0, down: false };
    const objs = {};   // name -> { pics }
    for (const [k, v] of Object.entries(D.objPics)) objs[k] = { pics: v };
    const threads = [];
    const HUDS = { sx: 1.5, sy: 1.35 };
    const face0 = D.objPics.face[D.consts.HP_FACE0 - 1];
    const ENT = {
        screen: { ...HUDS, y: -400 }, hud: { ...HUDS, y: -400 }, weapon: { ...HUDS }, flash: { ...HUDS },
        face: { ...HUDS, x: (143 - face0.lx + face0.w / 2 - 160) * 1.5, y: 135 - (168 - face0.ty + face0.h / 2) * 1.35 },
        statusbar: { ...HUDS, y: 135 - 184 * 1.35 }, overlay: { y: 21.6, visible: false }, amback: { y: 21.6, visible: false }, sky: { y: D.consts.SKYY }, world: { y: -400 },
    };
    const makeEntity = (objName, isClone) => ({ obj: objName, isClone, pic: 1, x: 0, y: 0, sx: 1, sy: 1, visible: true, stamps: [], text: '', alpha: 0, ...(ENT[objName] || {}) });
    const entities = [];
    let cur = null;   // current entity executing
    const check = (A, i, name) => {
        if (!(i >= 1 && i <= A.length) || Math.floor(i) !== i) throw new Error(`list ${name || '?'} index ${i} out of range (len ${A.length})`);
    };
    Object.assign(R, {
        get: (A, i, name) => { check(A, i, name); return A[i - 1]; },
        set: (A, i, v, name) => { check(A, i, name); A[i - 1] = v; },
        removeAt: (A, i) => { check(A, i); A.splice(i - 1, 1); },
        insertAt: (A, i, v) => { if (i < 1 || i > A.length + 1) throw new Error('insert index'); A.splice(i - 1, 0, v); },
        add: (a, b) => (typeof a === 'string' && isNaN(+a)) || (typeof b === 'string' && isNaN(+b)) ? a + b : (+a) + (+b),
        mod: (a, b) => a - b * Math.floor(a / b),
        and: (a, b) => !!(a && b), or: (a, b) => !!(a || b), s: (v) => String(v),
        on: (ev, obj, gen) => R.handlers.push({ ev, obj, gen }),
    });
    const picOf = (e) => objs[e.obj].pics[e.pic - 1];
    const B = {
        sind: (d) => Math.sin(d * Math.PI / 180), cosd: (d) => Math.cos(d * Math.PI / 180), tand: (d) => Math.tan(d * Math.PI / 180),
        atand: (v) => Math.atan(v) * 180 / Math.PI, asind: (v) => Math.asin(v) * 180 / Math.PI, acosd: (v) => Math.acos(v) * 180 / Math.PI,
        mod: R.mod, idiv: (a, b) => Math.floor(a / b), frac: (v) => v - Math.floor(v),
        rand: (a, b) => (Number.isInteger(a) && Number.isInteger(b)) ? a + Math.floor(Math.random() * (b - a + 1)) : a + Math.random() * (b - a),
        str: (...a) => a.join(''), indexOf: (s, sub) => String(s).indexOf(String(sub)) + 1, charAt: (s, i) => String(s)[i - 1], strlen: (s) => String(s).length, substr: (s, a, b) => String(s).slice(a - 1, b),
        key: (c) => keys.has(c), mouseX: () => mouse.x, mouseY: () => mouse.y, mouseDown: () => mouse.down,
        timer: () => simTime, timerReset: () => { simTime = 0; }, timerStart: () => {},
        stamp: () => { if (cur.visible) cur.stamps.push({ pic: cur.pic, x: cur.x, y: cur.y, sx: cur.sx, sy: cur.sy }); },
        eraseAll: () => { cur.stamps = []; },
        costume: (n) => { const k = Number(n); if (!(k >= 1 && k <= objs[cur.obj].pics.length)) throw new Error('costume ' + n + ' of ' + cur.obj); cur.pic = k; },
        goto: (x, y) => { cur.x = x; cur.y = y; },
        resetSize: () => { cur.sx = (ENT[cur.obj] && ENT[cur.obj].sx) || 1; cur.sy = (ENT[cur.obj] && ENT[cur.obj].sy) || 1; },
        stretchW: (v) => { const p = picOf(cur); const G = (p.w * Math.abs(cur.sx) + p.h * Math.abs(cur.sy)) / 2; cur.sx = cur.sx * Math.max(1, G + v) / G; },
        stretchH: (v) => { const p = picOf(cur); const G = (p.w * Math.abs(cur.sx) + p.h * Math.abs(cur.sy)) / 2; cur.sy = cur.sy * Math.max(1, G + v) / G; },
        setSize: (v) => { const p = picOf(cur); const G = (p.w * Math.abs(cur.sx) + p.h * Math.abs(cur.sy)) / 2; const k = Math.max(1, v) / G; cur.sx *= k; cur.sy *= k; },
        show: () => { cur.visible = true; }, hide: () => { cur.visible = false; },
        effect: (k, v) => { if (k === 'transparency') cur.alpha = v; }, clearEffects: () => { cur.alpha = 0; },
        cloneSelf: () => { spawnThreads(cur.obj, 'clone', { ...cur, isClone: true, stamps: [] }); },
        deleteClone: () => { cur.dead = true; },
        sound: (s) => { R.lastSound = s; }, stopSounds: () => {}, volume: () => {},
        write: (t) => { cur.text = String(t); }, textColor: () => {},
        broadcast: (m) => { for (const h of R.handlers) if (h.ev === 'msg:' + m) for (const e of entities.filter(e => e.obj === h.obj && !e.dead)) threads.push({ e, g: h.gen() }); },
        toFront: () => {}, toBack: () => {}, penDown: () => {}, penUp: () => {}, penColor: () => {}, penColorHex: () => {}, penSize: () => {},
        stopAll: () => { threads.length = 0; }, stopThread: () => { cur.$stop = true; }, waitSec: () => {}, waitUntil: () => {},
    };
    const names = Object.keys(B);
    const fn = new Function('R', ...names, (globalThis.__jsPatch ? globalThis.__jsPatch(js) : js) + '\nreturn R;');
    fn(R, ...names.map(n => B[n]));
    function spawnThreads(obj, ev, ent) {
        entities.push(ent);
        for (const h of R.handlers) if (h.obj === obj && h.ev === ev) threads.push({ e: ent, g: h.gen.call(null) });
    }
    // start: one original entity per object
    const objNames = [...new Set(R.handlers.map(h => h.obj))];
    for (const o of objNames) spawnThreads(o, 'start', makeEntity(o, false));
    return {
        D, R, prog, js, keys, mouse, entities,
        frame() {
            simTime += 1 / 60;
            for (const t of [...threads]) {
                if (t.done) continue;
                cur = t.e;
                const r = t.g.next();
                if (r.done || t.e.$stop) { t.done = true; t.e.$stop = false; }
            }
        },
        setTime(t) { simTime = t; },
        async render(file, order = ['sky', 'world', 'amback', 'automap', 'weapon', 'flash', 'overlay', 'statusbar', 'face', 'hud', 'screen']) {
            const W = 480, H = 270, img = new Uint8Array(W * H * 4);
            for (let i = 0; i < W * H; i++) { img[i * 4] = 60; img[i * 4 + 1] = 0; img[i * 4 + 2] = 60; img[i * 4 + 3] = 255; }
            let count = 0;
            for (const on of order) for (const e of entities.filter(e => e.obj === on && !e.dead)) for (const s of [...e.stamps, ...(e.visible && on !== 'overlay' ? [{ pic: e.pic, x: e.x, y: e.y, sx: e.sx, sy: e.sy }] : [])]) {
                const p = objs[on].pics[s.pic - 1]; count++;
                const w = p.w * s.sx, h = p.h * s.sy;
                const L = 240 + s.x - w / 2, T = 135 - s.y - h / 2;
                const x0 = Math.max(0, Math.ceil(L - 0.5)), x1 = Math.min(W - 1, Math.floor(L + w - 0.5));
                const y0 = Math.max(0, Math.ceil(T - 0.5)), y1 = Math.min(H - 1, Math.floor(T + h - 0.5));
                for (let y = y0; y <= y1; y++) {
                    const ty = Math.min(p.h - 1, Math.floor((y + 0.5 - T) / h * p.h));
                    for (let x = x0; x <= x1; x++) {
                        const tx = Math.min(p.w - 1, Math.floor((x + 0.5 - L) / w * p.w));
                        const o = (ty * p.w + tx) * 4;
                        if (p.rgba[o + 3] === 0) continue;
                        const d = (y * W + x) * 4;
                        img[d] = p.rgba[o]; img[d + 1] = p.rgba[o + 1]; img[d + 2] = p.rgba[o + 2];
                    }
                }
            }
            await sharp(Buffer.from(img), { raw: { width: W, height: H, channels: 4 } }).resize(960, 540, { kernel: 'nearest' }).png().toFile(file);
            return count;
        },
    };
}


if (process.argv[1] && import.meta.url === url.pathToFileURL(path.resolve(process.argv[1])).href) {
    const sim = await createSim();
    const frames = Number(process.argv[2] || 3);
    for (let i = 0; i < frames; i++) sim.frame();
    const P = sim.R.peek;
    console.log('items', P('r_items'), 'segs', P('r_segs'), 'nodes', P('r_nodes'), 'sprites', P('r_sprites'), 'pos', P('vx'), P('vy'), P('vz'), P('vang'));
    const n = await sim.render(path.join(HERE, 'sim.png'));
    console.log('stamps drawn', n);
}
