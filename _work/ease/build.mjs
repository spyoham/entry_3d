// Build "다양체 이징": src/*.js (EJS, with M_ macros) + the font's tables -> .ent
// usage: node build.mjs [out.ent] [K=V ...]
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { compileProgram } from './ejs.mjs';
import { expandMacros, declareImplicit } from './inline.mjs';
import { packEnt } from './pack.mjs';
import { legacyMath, slimBlocks } from './legacy.mjs';
import { buildFont, LOOKUP, CHARS } from './glyphs.mjs';
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
export const VERSION = '1.0';
export const NAME = '엔트리 다양체 이징';

export const consts = {
    PI: Math.PI, HPI: Math.PI / 2, TAU: 2 * Math.PI, DEG: 180 / Math.PI,
    LOOKUP, NGLYPH: CHARS.indexOf('#') + 1,
    // layout (stage units)
    EGX0: 86, EGX1: 234, EGY0: 10, EGY1: 96, MVCX: 160, MVCY: -56, NEG: 48, NSP: 40,
    SLY0: -17, SLDY: 13.5, SAX0: -196, SAW: 90, SBX0: -96, SNX0: 4, SNW: 40, SCX: 54,
    C3X: -80, C3Y: -2, F3: 270, BCX: 160, BCY: -36, BR: 28, S3X0: 112, S3DX: 64, S3W: 54,
    TB0: -226, TB1: 70,
    LIX: 0.37, LIY: 0.84, LIZ: 0.4,
    BGC: '#11141b', PANEL: '#181d28', NAIVE: '#ff5d6c',
    DUR: 2.4, HOLD: 0.8, HD: 2.6,
    START: 1, TEST: 0, LEGACY: 1, SLIM: 1,
};

export const FILES = ['math.js', 'ease.js', 'font.js', 'rigf.js', 'rig3.js', 'view.js', 'main.js', 'test.js'];
export function sources(C) {
    const files = C.TEST ? FILES : FILES.filter(f => f !== 'test.js');
    const stub = C.TEST ? '' : '\nfunction testStep() { let a = 0; }\n';
    const f = buildFont();
    const POW2 = Array.from({ length: 129 }, (_, i) => 2 ** (i - 64));
    const data = Object.entries({ ...f, POW2 }).map(([k, v]) => `let ${k} = [${v.join(',')}];`).join(String.fromCharCode(10)) + String.fromCharCode(10);
    let raw = files.map(fn => fs.readFileSync(path.join(HERE, 'src', fn), 'utf8')).join('\n') + stub;
    const { src, count } = expandMacros(data + raw);
    return { src: declareImplicit(src), count };
}

const DOT = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const textBox = (id, x, y, width, height, fontSize, more = {}) => ({
    id, name: id, objectType: 'textBox', text: ' ',
    entity: { x, y, colour: '#e8ecf5', bgColor: '#0c0f15', font: `${fontSize}px Nanum Gothic`, textAlign: 1, lineBreak: true,
        bold: false, underLine: false, strike: false, italic: false, fontSize, width, height, visible: true, ...more },
});

export function build(out, opt = {}) { return buildProject(out, opt).stats; }
export function buildProject(out, { name = `${NAME} v${VERSION}`, more = {} } = {}) {
    const C = { ...consts, ...more };
    const { src, count } = sources(C);
    const cc = { ...C }; delete cc.LEGACY; delete cc.SLIM;
    const prog = compileProgram([src], { consts: cc });
    if (C.LEGACY) legacyMath(prog);
    if (C.SLIM) slimBlocks(prog);
    // front to back
    const objects = [
        { ...textBox('help', 0, 0, 470, 236, 10, { visible: false, textAlign: 1, bgColor: '#0c0f15' }), script: prog.objectScripts.help },
        { ...textBox('btn', 0, -125, 38, 15, 10, { lineBreak: false, bgColor: '#262d3c', visible: false }), script: prog.objectScripts.btn },
        { ...textBox('top', 0, 119, 478, 32, 8, { textAlign: 1, bgColor: '#0c0f15' }), script: prog.objectScripts.top },
        { id: 'pen', name: 'pen', pictures: [{ id: 'p1', name: 'dot', buf: DOT, w: 1, h: 1 }], script: prog.objectScripts.pen },
        { id: 'bg', name: 'bg', pictures: [{ id: 'p2', name: 'dot', buf: DOT, w: 1, h: 1 }], script: prog.objectScripts.bg },
    ];
    for (const k of Object.keys(prog.objectScripts)) if (!objects.some(o => o.id === k)) throw new Error('script for an unknown object: ' + k);
    for (const v of prog.variables) if (v.variableType === 'list' && (v.array || []).length > 5000) throw new Error('list over 5000: ' + v.name);
    const project = packEnt(out, { name, tmpDir: path.join(HERE, '.pack'), variables: prog.variables, functions: prog.functions, messages: prog.messages, objects, speed: 60 });
    const blocks = prog.functions.reduce((a, f) => a + f.content.split('"type"').length - 1, 0) + JSON.stringify(objects.map(o => o.script)).split('"type"').length - 1;
    return { project, src, C, stats: { macros: count, globals: prog.variables.filter(v => v.variableType === 'variable').length, lists: prog.variables.filter(v => v.variableType === 'list').length, functions: prog.functions.length, blocks, bytes: fs.statSync(out).size } };
}

if (process.argv[1] && import.meta.url === url.pathToFileURL(path.resolve(process.argv[1])).href) {
    const out = process.argv[2] || path.join(HERE, 'ease.ent');
    const more = Object.fromEntries(process.argv.slice(3).filter(a => a.includes('=')).map(a => a.split('=')).map(([k, v]) => [k, Number(v)]));
    console.log('wrote', out, JSON.stringify(build(out, { more })));
}
