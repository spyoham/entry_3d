// The Entry Sync keep test (two versions of one small work): node build.mjs
// writes ../../Entry Sync 저장 시험 v1.ent and v2.ent
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { compileProgram } from '../vox/ejs.mjs';
import { packEnt } from '../vox/pack.mjs';
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const OUT = path.join(HERE, '../..');
const raw = fs.readFileSync(path.join(HERE, 'src.js'), 'utf8');
export function buildVersion(ver, out) {
    // v2's file starts ?!m2 with a value of its own: does the file's start value win over the kept one?
    const src = raw.replace('[M2INIT]', ver === 1 ? '[]' : "['판 2 파일에 들어 있던 시작값']");
    const prog = compileProgram([src], { consts: { VER: ver }, plainNumbers: true, constPool: false });
    const objects = [{
        id: 'txt', name: 'txt', objectType: 'textBox', text: ' ', script: prog.objectScripts.txt,
        entity: { x: 0, y: 0, colour: '#000000', bgColor: 'transparent', font: '11px Nanum Gothic Coding', textAlign: 1, lineBreak: true,
            bold: false, underLine: false, strike: false, italic: false, fontSize: 11, width: 460, height: 260, visible: true },
    }];
    return packEnt(out, { name: `Entry Sync 저장 시험 v${ver}`, tmpDir: path.join(HERE, '.pack'), variables: prog.variables, functions: prog.functions, messages: prog.messages, objects, speed: 60 });
}
if (process.argv[1] && import.meta.url === url.pathToFileURL(path.resolve(process.argv[1])).href) {
    for (const v of [1, 2]) {
        const f = path.join(OUT, `Entry Sync 저장 시험 v${v}.ent`);
        const p = buildVersion(v, f);
        console.log('wrote', f, p.variables.map(x => x.name).join(' '));
    }
}
