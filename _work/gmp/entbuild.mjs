// Compile EJS sources into an .ent with one invisible sprite and one text box.
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { compileProgram } from './ejs.mjs';
import { packEnt } from './pack.mjs';
const HERE = path.dirname(url.fileURLToPath(import.meta.url));

const DOT = Buffer.from('89504e470d0a1a0a0000000d49484452000000020000000208060000007265b6' +
    '0d0000000f49444154789c636040020630c40000004900011ea9ec2c0000000049454e44ae426082', 'hex');

export function buildEnt(outFile, sources, { name = 'GMP', consts = {}, funcWeights = {}, objects: extra = [], hot = [], lists = {}, mainXY = [0, 0] } = {}) {
    const prog = compileProgram(sources, { consts, funcWeights });
    const O = (id, nm, more = {}) => ({ id, name: nm, script: prog.objectScripts[nm] || [[]], ...more });
    const objects = [O('main', 'main', { pictures: [{ id: '1', name: 'dot', buf: DOT, w: 2, h: 2 }], entity: { x: mainXY[0], y: mainXY[1], visible: true } })];
    for (const e of extra) objects.push(O(e.id, e.name, e.more));
    const rank = (v) => { const i = hot.indexOf(v.name); return i < 0 ? 1e6 : i; };
    const variables = [...prog.variables].sort((a, b) => rank(a) - rank(b));
    // lists shown on the stage, under their own names
    const ids = {};
    for (const [k, v] of Object.entries(lists)) {
        const id = prog.listIdOf(k);
        const vv = variables.find(x => x.id === id);
        Object.assign(vv, { visible: true, name: v.name, x: v.x, y: v.y, width: v.width, height: v.height });
    }
    packEnt(outFile, { name, tmpDir: path.join(HERE, '.pack'), variables, functions: prog.functions, messages: prog.messages, objects, speed: 60 });
    fs.writeFileSync(outFile + '.lines.json', JSON.stringify({ blockLines: prog.blockLines, srcLines: prog.srcLines }));
    return prog;
}
