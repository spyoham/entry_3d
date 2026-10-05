// Build the Entry ray tracer: src/*.js (EJS, with M_ macros) -> .ent
// usage: node build.mjs [out.ent] [QSTART=2] [QAUTO=1] [NAME=...]
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { compileProgram } from './ejs.mjs';
import { expandMacros, declareImplicit } from './inline.mjs';
import { packEnt } from './pack.mjs';
import { meshSource } from './mesh.mjs';
import { deloop } from './deloop.mjs';
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
export const VERSION = '1.1';
const FASTPLUS = process.env.FASTPLUS === '1';
export const FILES = ['scene.js', 'mesh.js', 'render.js', 'main.js'];
// the sun, as scene.js makes it (towards it, length 1024)
export function sunDir() { const v = [-480, 800, -420], n = Math.hypot(...v); return v.map(x => Math.round(x * 1024 / n)); }

// alpha: no "repeat while" block and no delay-removal trick - every loop is a function calling itself (deloop.mjs)
export function sources(alpha = false) {
    const raw = meshSource(sunDir()) + FILES.map(f => fs.readFileSync(path.join(HERE, 'src', f), 'utf8')).join('\n');
    const { src, count } = expandMacros(raw);
    if (!alpha) return { src: declareImplicit(src), count };
    const d = deloop(declareImplicit(src));
    return { src: d.src, count, loops: d.loops };
}
export const defaultConsts = { QSTART: 3, QAUTO: 1, ABL: 0, VREUSE: 1, WEAK: 0 };

const DOT = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

export function build(out, consts = {}, name = null, alpha = false) {
    name = name || `엔트리 레이트레이서 v${alpha ? '1.alpha' : VERSION}`;
    const { src, count, loops } = sources(alpha);
    const prog = compileProgram([src], { consts: { ...defaultConsts, ...consts }, fastPlus: FASTPLUS, constPool: process.env.POOL !== '0' });
    const objects = [{
        id: 'hud0', name: 'hud', objectType: 'textBox', text: ' ', script: prog.objectScripts.hud,
        entity: { x: -76, y: 127, colour: '#ffffff', bgColor: 'transparent', font: 'bold 9px Nanum Gothic Coding', textAlign: 0, lineBreak: true,
            bold: true, underLine: false, strike: false, italic: false, fontSize: 9, width: 320, height: 13, visible: true },
    }, {
        // pen B sits in front of pen A: its odd lines cover A's thick even ones
        id: 'penb', name: 'penb', pictures: [{ id: 'p2', name: 'dot', buf: DOT, w: 1, h: 1 }], script: prog.objectScripts.penb,
    }, {
        id: 'cam0', name: 'cam', pictures: [{ id: 'p1', name: 'dot', buf: DOT, w: 1, h: 1 }], script: prog.objectScripts.cam,
    }];
    packEnt(out, { name, tmpDir: path.join(HERE, '.pack'), variables: prog.variables, functions: prog.functions, messages: prog.messages, objects, speed: 60 });
    const blocks = JSON.stringify(prog.functions).split('"type"').length + JSON.stringify(objects.map(o => o.script)).split('"type"').length;
    // the alpha build must hold neither block
    const all = JSON.stringify(prog.functions) + JSON.stringify(objects.map(o => o.script));
    if (alpha && (all.includes('repeat_while_true') || all.includes('continue_repeat'))) throw new Error('alpha: a while loop or the trick is left');
    return { alpha, loops, whileBlocks: all.split('repeat_while_true').length - 1, tricks: all.split('continue_repeat').length - 1, macros: count, globals: prog.variables.filter(v => v.variableType === 'variable').length, lists: prog.variables.filter(v => v.variableType === 'list').length, functions: prog.functions.length, blocks, bytes: fs.statSync(out).size };
}

if (process.argv[1] && import.meta.url === url.pathToFileURL(path.resolve(process.argv[1])).href) {
    const args = process.argv.slice(2);
    const out = args.find(a => !a.includes('=')) || path.join(HERE, 'rt.ent');
    const consts = Object.fromEntries(args.filter(a => a.includes('=') && !a.startsWith('ALPHA=')).map(a => a.split('=')).map(([k, v]) => [k, Number(v)]));
    console.log('wrote', out, JSON.stringify(build(out, consts, null, args.includes('ALPHA=1'))));
}
