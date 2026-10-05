// Build the Entry ray tracer: src/*.js (EJS, with M_ macros) -> .ent
// usage: node build.mjs [out.ent] [QSTART=2] [QAUTO=1] [NAME=...]
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { compileProgram } from './ejs.mjs';
import { expandMacros, declareImplicit } from './inline.mjs';
import { packEnt } from './pack.mjs';
import { meshSource } from './mesh.mjs';
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
export const VERSION = '1.0';
const FASTPLUS = process.env.FASTPLUS === '1';
export const FILES = ['scene.js', 'mesh.js', 'render.js', 'main.js'];
// the sun, as scene.js makes it (towards it, length 1024)
export function sunDir() { const v = [-480, 800, -420], n = Math.hypot(...v); return v.map(x => Math.round(x * 1024 / n)); }

export function sources() {
    const raw = meshSource(sunDir()) + FILES.map(f => fs.readFileSync(path.join(HERE, 'src', f), 'utf8')).join('\n');
    const { src, count } = expandMacros(raw);
    return { src: declareImplicit(src), count };
}
export const defaultConsts = { QSTART: 3, QAUTO: 1, ABL: 0, VREUSE: 1, WEAK: 0 };

const DOT = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

export function build(out, consts = {}, name = `엔트리 레이트레이서 v${VERSION}`) {
    const { src, count } = sources();
    const prog = compileProgram([src], { consts: { ...defaultConsts, ...consts }, fastPlus: FASTPLUS });
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
    return { macros: count, globals: prog.variables.filter(v => v.variableType === 'variable').length, lists: prog.variables.filter(v => v.variableType === 'list').length, functions: prog.functions.length, blocks, bytes: fs.statSync(out).size };
}

if (process.argv[1] && import.meta.url === url.pathToFileURL(path.resolve(process.argv[1])).href) {
    const args = process.argv.slice(2);
    const out = args.find(a => !a.includes('=')) || path.join(HERE, 'rt.ent');
    const consts = Object.fromEntries(args.filter(a => a.includes('=')).map(a => a.split('=')).map(([k, v]) => [k, Number(v)]));
    console.log('wrote', out, JSON.stringify(build(out, consts)));
}
