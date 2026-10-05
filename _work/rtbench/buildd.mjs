import { compileProgram } from '../gmp/ejs.mjs';
import { packEnt } from '../gmp/pack.mjs';
import fs from 'node:fs';
const [src, out, ...kv] = process.argv.slice(2);
const consts = Object.fromEntries(kv.map(s => s.split('=')).map(([k, v]) => [k, +v]));
const prog = compileProgram([fs.readFileSync(src, 'utf8')], { consts });
const buf = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
packEnt(out, { name: 'rt', tmpDir: './.pk', variables: prog.variables, functions: prog.functions, messages: prog.messages,
  objects: [{ id: 'cam0', name: 'cam', pictures: [{ id: 'p1', name: 'p', buf, w: 1, h: 1 }], script: prog.objectScripts.cam }] });
