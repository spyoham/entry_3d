// Build "AI 압축기": src/*.js (EJS) + model.json (train.py) -> .ent
// usage: node build.mjs [out.ent]
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { compileProgram } from './ejs.mjs';
import { packEnt } from './pack.mjs';
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
export const VERSION = '1.0';
export const NAME = '엔트리 AI 압축기';

export const model = JSON.parse(fs.readFileSync(path.join(HERE, 'model.json'), 'utf8'));
const { SYMS, B64, T, N } = model;
if (SYMS.length !== 57 || B64.length !== 64) throw new Error('model alphabets');
// every context of one letter has a row, so the search for a row always ends with one
if (model.orders[1].some(b => !b.startsWith('|'))) throw new Error('a context of one letter without a row');
// M[(k - 1) * 31 + c]
export const M = model.orders.slice(1).flat();
if (M.length !== N * 31) throw new Error('model buckets');

export const consts = {
    SYMS, B64, T, NORD: N, MAINT: T - 57,
    CTX: SYMS.slice(0, 31), LOWS: SYMS.slice(0, 31) + SYMS.slice(0, 26),
    TOP: 2 ** 32, HALF: 2 ** 31, QUART: 2 ** 30, QUART3: 3 * 2 ** 30,
    LN2: Math.LN2, MAXN: 2000, CLIPN: 180, CW: 80, WLMAX: 160,
};

export const FILES = ['coder.js', 'main.js'];
export const sources = () => FILES.map(fn => fs.readFileSync(path.join(HERE, 'src', fn), 'utf8')).join('\n');

const DOT = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const BG = '#10141c', PANEL = '#1a2030', INK = '#e8ecf5';
// A text box that wraps starts its text 10 below its top edge in Entry (entity.js: lineHeight / 2 -
// height / 2 + 10) and about 5 below it in tessvm; a line is fontSize + 2 high. So the words are a
// box of their own without a background, 5 above the panel they are read on: three lines of 9 fit
// a panel of 38 in both.
const box = (id, x, y, width, height, fontSize, more = {}) => ({
    id, name: id, objectType: 'textBox', text: ' ',
    entity: { x, y, colour: INK, bgColor: 'transparent', font: `${fontSize}px Nanum Gothic`, textAlign: 1, lineBreak: true,
        bold: false, underLine: false, strike: false, italic: false, fontSize, width, height, visible: true, ...more },
});
const panel = (id, y, height, bgColor = PANEL) => box(id, 0, y, id === 'bg' ? 480 : 472, height, 8, { bgColor });
const words = (id, y, height, fontSize, more) => box(id, 0, y + 5, 464, height, fontSize, more);

export function build(out, { name = `${NAME} v${VERSION}` } = {}) {
    const prog = compileProgram([sources()], { consts, plainNumbers: true });
    const list = prog.variables.find(v => v.variableType === 'list' && v.name === 'M');
    list.array = M.map((v, i) => ({ id: `${list.id}_${i}`, data: v }));
    // front to back
    const objects = [
        // (the question's bubble opens up and to the right of this dot: the strip left of `msg`)
        { id: 'main', name: 'main', pictures: [{ id: 'p1', name: 'dot', buf: DOT, w: 1, h: 1 }], entity: { x: -236, y: -100 }, script: prog.objectScripts.main },
        { ...box('title', 0, 128, 472, 12, 10, { bold: true, textAlign: 0, lineBreak: false, colour: '#ffd166' }), text: 'AI 압축기  ·  다음 글자를 잘 맞힐수록 글이 짧아진다' },
        { ...words('orig', 101, 38, 9), script: prog.objectScripts.orig },
        { ...words('code', 62, 38, 9, { colour: '#7fe3a8' }), script: prog.objectScripts.code },
        { ...words('rest', 23, 38, 9), script: prog.objectScripts.rest },
        { ...words('bits', -16, 38, 8, { colour: '#cfd6e6' }), script: prog.objectScripts.bits },
        { ...box('msg', 82, -48, 308, 34, 7, { colour: '#9aa5bd' }), script: prog.objectScripts.msg },
        panel('p1', 101, 38), panel('p2', 62, 38), panel('p3', 23, 38), panel('p4', -16, 38),
        panel('bg', 0, 270, BG),
    ];
    for (const k of Object.keys(prog.objectScripts)) if (!objects.some(o => o.id === k)) throw new Error('script for an unknown object: ' + k);
    for (const v of prog.variables) if (v.variableType === 'list' && (v.array || []).length > 5000) throw new Error('list over 5000: ' + v.name);
    packEnt(out, { name, tmpDir: path.join(HERE, '.pack'), variables: prog.variables, functions: prog.functions, messages: prog.messages, objects, speed: 60 });
    const blocks = prog.functions.reduce((a, f) => a + f.content.split('"type"').length - 1, 0) + JSON.stringify(objects.map(o => o.script || [])).split('"type"').length - 1;
    return { globals: prog.variables.filter(v => v.variableType === 'variable').length, functions: prog.functions.length, blocks, modelChars: M.reduce((a, s) => a + s.length, 0), bytes: fs.statSync(out).size };
}

if (process.argv[1] && import.meta.url === url.pathToFileURL(path.resolve(process.argv[1])).href) {
    const out = process.argv[2] || path.join(HERE, 'aic.ent');
    console.log('wrote', out, JSON.stringify(build(out)));
}
