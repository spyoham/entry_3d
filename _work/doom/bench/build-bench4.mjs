import { compileProgram } from '../ejs.mjs';
import { packEnt } from '../pack.mjs';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/spyoh/entry_3d/entry-vibe-coding/package.json');
const sharp = require('sharp');
const prog = compileProgram([fs.readFileSync('bench4.src.js', 'utf8')]);
const pics = [];
for (let i = 0; i < 7000; i++) {
  const raw = Buffer.alloc(512 * 4); for (let k = 0; k < 512; k++) { raw[k*4] = (i*7+k*3)&255; raw[k*4+1]=(i*13+k)&255; raw[k*4+2]=(k*5)&255; raw[k*4+3]=255; }
  const buf = await sharp(raw, { raw: { width: 1, height: 512, channels: 4 } }).png().toBuffer();
  pics.push({ id: 'q' + i.toString(36), name: 'p' + i, buf, w: 1, h: 512 });
}
packEnt('bench4.ent', { name: 'bench4', tmpDir: './.pk4', variables: prog.variables, functions: prog.functions, messages: prog.messages,
  objects: [{ id: 'stmp', name: 'stamper', pictures: pics, script: prog.objectScripts.stamper }] });
console.log('size', fs.statSync('bench4.ent').size);
