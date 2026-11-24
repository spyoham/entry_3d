// Build "AI 압축기": src/*.js (EJS) + model.json (train.py) -> .ent
// usage: node build.mjs [out.ent]
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { compileProgram } from './ejs.mjs';
import { packEnt } from './pack.mjs';
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
export const VERSION = '1.1';
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
    LN2: Math.LN2, MAXN: 2000, CLIPN: 180, CLIP1: 88, WLMAX: 160,
    // the six bits of each code letter, after one letter that keeps the text from reading as a number
    SIX: 'b' + Array.from({ length: 64 }, (_, i) => i.toString(2).padStart(6, '0')).join(''),
    // the bits shown: eight to a group, ten groups to a row, five rows; a short code beside the heading if it fits
    BINROW: 10, BINMAX: 400, CODEMAX: 36,
};

export const FILES = ['coder.js', 'main.js'];
export const sources = () => FILES.map(fn => fs.readFileSync(path.join(HERE, 'src', fn), 'utf8')).join('\n');

const DOT = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const BG = '#10141c', PANEL = '#1a2030', INK = '#e8ecf5';
// Where a wrapping text box puts its text (entity.js alignTextBox): with WebGL 4.1 below the box's top
// edge; without it (the offline editor) about 5 below - but only when that is more than 10 from where
// the text already was, so a box under about 40 high keeps the text up to 10 off. tessvm: about 5.
// So the words are boxes of their own, all TALL high and without a background, placed by their top
// edge over the panels: the text begins 1.5 under the panel's top in every engine. A line is
// fontSize + 2 high.
const TALL = 60;
const box = (id, x, y, width, height, fontSize, more = {}) => ({
    id, name: id, objectType: 'textBox', text: ' ',
    entity: { x, y, colour: INK, bgColor: 'transparent', font: `${fontSize}px Nanum Gothic`, textAlign: 1, lineBreak: true,
        bold: false, underLine: false, strike: false, italic: false, fontSize, width, height, visible: true, ...more },
});
// (a panel from `top` down, and the words that begin at a panel's top)
const panel = (id, top, height, bgColor = PANEL) => box(id, 0, top - height / 2, id === 'bg' ? 480 : 472, height, 8, { bgColor });
const words = (id, top, fontSize, more = {}) => box(id, more.x || 0, top + 3 - TALL / 2, more.width || 464, TALL, fontSize, more);

export function build(out, { name = `${NAME} v${VERSION}` } = {}) {
    const prog = compileProgram([sources()], { consts, plainNumbers: true });
    const list = prog.variables.find(v => v.variableType === 'list' && v.name === 'M');
    list.array = M.map((v, i) => ({ id: `${list.id}_${i}`, data: v }));
    // front to back
    const objects = [
        // (the question's bubble opens up and to the right of this dot: the strip left of `msg`)
        { id: 'main', name: 'main', pictures: [{ id: 'p1', name: 'dot', buf: DOT, w: 1, h: 1 }], entity: { x: -236, y: -102 }, script: prog.objectScripts.main },
        { ...box('title', 0, 129, 472, 12, 10, { bold: true, textAlign: 0, lineBreak: false, colour: '#ffd166' }), text: 'AI 압축기  ·  다음 글자를 잘 맞힐수록 글이 짧아진다' },
        { ...words('orig', 123, 9), script: prog.objectScripts.orig },
        { ...words('code', 86, 8, { colour: '#7fe3a8' }), script: prog.objectScripts.code },
        { ...words('rest', 22, 9), script: prog.objectScripts.rest },
        { ...words('bits', -4, 8, { colour: '#cfd6e6' }), script: prog.objectScripts.bits },
        { ...words('msg', -38, 7, { colour: '#9aa5bd', x: 82, width: 308 }), script: prog.objectScripts.msg },
        // three lines of 9, heading + five rows of bits of 8, two lines of 9, three lines of 8
        panel('p1', 123, 36), panel('p2', 86, 63), panel('p3', 22, 25), panel('p4', -4, 33),
        panel('bg', 135, 270, BG),
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
