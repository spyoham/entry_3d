import { compileProgram } from '../gmp/ejs.mjs';
import { packEnt } from '../gmp/pack.mjs';
import fs from 'node:fs';
import zlib from 'node:zlib';
const [W, H, MODE, DRAW, out] = process.argv.slice(2);
const prog = compileProgram([fs.readFileSync('rt.src.js', 'utf8')], { consts: { W: +W, H: +H, MODE: +MODE, DRAW: +DRAW } });
const buf = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
packEnt(out, { name: 'rt', tmpDir: './.pk', variables: prog.variables, functions: prog.functions, messages: prog.messages,
  objects: [{ id: 'cam0', name: 'cam', pictures: [{ id: 'p1', name: 'p', buf, w: 1, h: 1 }], script: prog.objectScripts.cam }] });
