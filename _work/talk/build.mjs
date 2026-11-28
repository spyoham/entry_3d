// 둘만의 토론방: node build.mjs  ->  ../../둘만의 토론방 v1.0.ent
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { createRequire } from 'node:module';
import { compileProgram } from '../vox/ejs.mjs';
import { packEnt } from '../vox/pack.mjs';
const require = createRequire(new URL('../../entry-vibe-coding/package.json', import.meta.url));
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
export const NAME = '둘만의 토론방', VERSION = '1.0';
export const OUT = path.join(HERE, '../..', `${NAME} v${VERSION}.ent`);
// the backdrop: a band for the path at the top, one for the buttons and the state at the bottom
async function backdrop() {
    const sharp = require('sharp');
    const W = 480, H = 270, px = Buffer.alloc(W * H * 3);
    for (let y = 0; y < H; y++) {
        const c = y < 22 ? [38, 48, 74] : y >= 223 ? [30, 37, 56] : [22, 27, 40];
        for (let x = 0; x < W; x++) for (let k = 0; k < 3; k++) px[(y * W + x) * 3 + k] = c[k];
    }
    return sharp(px, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer();
}
const FONT = 'Nanum Gothic Coding';
const box = (id, x, y, colour, more = {}) => ({ id, name: id, objectType: 'textBox', text: ' ',
    entity: { x, y, colour, bgColor: 'transparent', font: `12px ${FONT}`, textAlign: 1, lineBreak: true, bold: false, underLine: false, strike: false, italic: false, fontSize: 12, width: 460, height: 34, visible: true, ...more } });
export async function buildProject(out = OUT, { consts = {} } = {}) {
    const prog = compileProgram([fs.readFileSync(path.join(HERE, 'src.js'), 'utf8')], { consts, plainNumbers: true, constPool: false });
    const objects = [
        // (Entry draws a line-break box's text 10 px under its top: a box of the line's height + 20 has it in its middle)
        box('ask', -214, -62, '#ffffff', { lineBreak: false, width: 4, height: 14 }),
        box('head', 0, 124, '#ffffff', { bold: true, font: `bold 12px ${FONT}` }),
        box('foot', 0, -123, '#aab4c6'),
        // (a button is a box as wide as its words, its colour behind them)
        box('btn', 0, -100, '#ffffff', { lineBreak: false, textAlign: 0, bgColor: '#3a4a70', width: 60, height: 14 }),
        box('row', 0, 0, '#e9edf3'),
        { id: 'back', name: 'back', pictures: [{ id: 'bk01', name: 'back', buf: await backdrop(), w: 480, h: 270 }], script: [] },
    ];
    for (const o of objects) if (o.objectType === 'textBox') o.script = prog.objectScripts[o.id];
    const project = packEnt(out, { name: `${NAME} v${VERSION}`, tmpDir: path.join(HERE, '.pack'), variables: prog.variables, functions: prog.functions, messages: prog.messages, objects, speed: 60 });
    return { project, prog };
}
if (process.argv[1] && import.meta.url === url.pathToFileURL(path.resolve(process.argv[1])).href) {
    const { prog } = await buildProject();
    console.log('wrote', OUT, fs.statSync(OUT).size, 'bytes', JSON.stringify(prog.stats));
}
