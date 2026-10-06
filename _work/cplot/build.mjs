// Build the complex function grapher: src/*.js (EJS, with M_ macros) -> .ent
// usage: node build.mjs [out.ent]
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { compileProgram } from './ejs.mjs';
import { expandMacros, declareImplicit } from './inline.mjs';
import { packEnt } from './pack.mjs';
import { tableSource, NH, NL } from './tables.mjs';
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
export const VERSION = '1.1';
export const NAME = '엔트리 복소함수 그래퍼';
export const FILES = ['vm.js', 'compile.js', 'ext.js', 'ext2.js', 'render.js', 'main.js', 'bench.js'];
export const consts = { NH, NL, BENCH: 0 };

// bench: the timing and self-test code (src/bench.js) is left out of the work itself
export function sources(tf = [], bench = false) {
    const files = bench ? FILES : FILES.filter(f => f !== 'bench.js');
    const stub = bench ? '' : 'let done = 0;' + String.fromCharCode(10) + 'function benchRun() { }' + String.fromCharCode(10) + 'function selfTest() { }' + String.fromCharCode(10);
    const raw = tableSource() + 'let TF = [' + tf.map(f => JSON.stringify(f)).join(',') + '];' + String.fromCharCode(10) + files.map(f => fs.readFileSync(path.join(HERE, 'src', f), 'utf8')).join(String.fromCharCode(10)) + stub;
    const { src, count } = expandMacros(raw);
    return { src: declareImplicit(src), count };
}

const DOT = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const textBox = (id, x, y, width, height, fontSize, more = {}) => ({
    id, name: id, objectType: 'textBox', text: ' ',
    entity: { x, y, colour: '#ffffff', bgColor: '#20242c', font: `${fontSize}px Nanum Gothic Coding`, textAlign: 1, lineBreak: true,
        bold: false, underLine: false, strike: false, italic: false, fontSize, width, height, visible: true, ...more },
});

export function build(out, name = `${NAME} v${VERSION}`, more = {}, tf = []) {
    const all = { ...consts, ...more };
    const { src, count } = sources(tf, all.BENCH !== 0);
    const prog = compileProgram([src], { consts: all });
    // front to back
    const objects = [
        { ...textBox('help', 0, 0, 420, 214, 11, { visible: false }), script: prog.objectScripts.help },
        { ...textBox('top', -238, 127, 100, 14, 10, { lineBreak: false }), script: prog.objectScripts.top },
        { ...textBox('bot', -238, -127, 100, 14, 10, { lineBreak: false }), script: prog.objectScripts.bot },
        { id: 'axes', name: 'axes', pictures: [{ id: 'p2', name: 'dot', buf: DOT, w: 1, h: 1 }], script: prog.objectScripts.axes },
        { id: 'pen', name: 'pen', pictures: [{ id: 'p1', name: 'dot', buf: DOT, w: 1, h: 1 }], script: prog.objectScripts.pen },
    ];
    for (const k of Object.keys(prog.objectScripts)) if (!objects.some(o => o.id === k)) throw new Error('script for an unknown object: ' + k);
    packEnt(out, { name, tmpDir: path.join(HERE, '.pack'), variables: prog.variables, functions: prog.functions, messages: prog.messages, objects, speed: 60 });
    const big = prog.variables.filter(v => v.variableType === 'list' && v.array.length > 5000).map(v => v.name);
    if (big.length) throw new Error('lists past 5000 items: ' + big);
    const blocks = JSON.stringify(prog.functions).split('"type"').length + JSON.stringify(objects.map(o => o.script)).split('"type"').length;
    return { macros: count, globals: prog.variables.filter(v => v.variableType === 'variable').length, lists: prog.variables.filter(v => v.variableType === 'list').length, functions: prog.functions.length, blocks, bytes: fs.statSync(out).size };
}

if (process.argv[1] && import.meta.url === url.pathToFileURL(path.resolve(process.argv[1])).href) {
    const out = process.argv[2] || path.join(HERE, 'cplot.ent');
    const more = Object.fromEntries(process.argv.slice(3).filter(a => a.includes('=')).map(a => a.split('=')).map(([k, v]) => [k, Number(v)]));
    console.log('wrote', out, JSON.stringify(build(out, undefined, more)));
}
