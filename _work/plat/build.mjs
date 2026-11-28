// Build the 3D platformer tool: src/*.js (EJS) -> .ent
// usage: node build.mjs [out.ent]
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { createRequire } from 'node:module';
import { compileProgram } from './ejs.mjs';
import { packEnt } from './pack.mjs';
const require = createRequire(new URL('../../entry-vibe-coding/package.json', import.meta.url));
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
export const NAME = '3D 플랫포머 툴', VERSION = '1.0';
export const FILES = ['engine.js', 'stages.js', 'main.js'];
export const consts = {};
export const allConsts = (more = {}) => ({ ...consts, ...more });
export function sources() { return { src: FILES.map(f => fs.readFileSync(path.join(HERE, 'src', f), 'utf8')).join('\n') }; }

// how the blocks a stage is written with read in the editor
const LABELS = {
    시작_위치: '시작 위치 %1 %2 %3',
    발판: '발판 위치 %1 %2 %3 크기 %4 %5 %6 색 %7',
    움직이는_발판: '움직이는 발판 위치 %1 %2 %3 크기 %4 %5 %6 색 %7 이동 %8 %9 %10 주기 %11',
    가시: '가시 위치 %1 %2 %3 크기 %4 %5',
    태엽: '태엽 위치 %1 %2 %3',
    깃발: '깃발 위치 %1 %2 %3',
    목표: '목표 위치 %1 %2 %3',
};

const DOT = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
async function sky() {
    const sharp = require('sharp');
    const W = 480, H = 270, px = Buffer.alloc(W * H * 3);
    const top = [96, 160, 232], bottom = [214, 236, 250];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) for (let c = 0; c < 3; c++) px[(y * W + x) * 3 + c] = Math.round(top[c] + (bottom[c] - top[c]) * y / (H - 1));
    return sharp(px, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer();
}
// blocks outside functions: every block, and without the number / text values
function countBlocks(script) {
    let all = 0, values = 0;
    (function walk(b) {
        if (!b || typeof b !== 'object') return;
        if (Array.isArray(b)) { b.forEach(walk); return; }
        if (b.type) { all++; if (b.type === 'number' || b.type === 'text') values++; }
        if (b.params) walk(b.params);
        if (b.statements) walk(b.statements);
    })(script);
    return { all, values };
}

export async function buildProject(out) {
    const { src } = sources();
    const prog = compileProgram([src], { natural: true, skipZeroInit: true, labels: LABELS });
    const objects = [
        { id: '안내', name: '안내', objectType: 'textBox', text: ' ', script: prog.objectScripts['안내'],
            entity: { x: 0, y: 122, colour: '#ffffff', bgColor: '#20242c', font: '11px Nanum Gothic Coding', textAlign: 0, lineBreak: true, bold: false, underLine: false, strike: false, italic: false, fontSize: 11, width: 300, height: 22, visible: true } },
        { id: '붓', name: '붓', pictures: [{ id: 'p1', name: '점', buf: DOT, w: 1, h: 1 }], script: prog.objectScripts['붓'] },
        { id: '하늘', name: '하늘', pictures: [{ id: 'p2', name: '하늘', buf: await sky(), w: 480, h: 270 }], script: [] },
    ];
    const project = packEnt(out, { name: `${NAME} v${VERSION}`, tmpDir: path.join(HERE, '.pack'), variables: prog.variables, functions: prog.functions, messages: prog.messages, objects, speed: 60 });
    const outside = objects.reduce((a, o) => { const c = countBlocks(o.script || []); return { all: a.all + c.all, values: a.values + c.values }; }, { all: 0, values: 0 });
    const inside = prog.functions.reduce((a, f) => a + countBlocks(JSON.parse(f.content)).all, 0);
    return { project, stats: { ...prog.stats, outsideBlocks: outside.all, outsideWithoutValues: outside.all - outside.values, insideFunctions: inside, bytes: fs.statSync(out).size } };
}

if (process.argv[1] && import.meta.url === url.pathToFileURL(path.resolve(process.argv[1])).href) {
    const out = process.argv[2] || path.join(HERE, 'plat.ent');
    console.log('wrote', out, JSON.stringify((await buildProject(out)).stats));
}
