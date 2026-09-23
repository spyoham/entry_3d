import { compileProgram } from '../ejs.mjs';
import { packEnt } from '../pack.mjs';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/spyoh/entry_3d/entry-vibe-coding/package.json');
const sharp = require('sharp');
const prog = compileProgram([fs.readFileSync('bench6.src.js', 'utf8')]);
const raw = Buffer.alloc(384 * 4); for (let k = 0; k < 384; k++) { raw[k*4] = (k*7)&255; raw[k*4+1]= 255 - ((k*3)&255); raw[k*4+2]=(k*5)&255; raw[k*4+3]=255; }
const buf = await sharp(raw, { raw: { width: 1, height: 384, channels: 4 } }).png().toBuffer();
packEnt('bench6.ent', { name: 'b6', tmpDir: './.pk6', variables: prog.variables, functions: prog.functions, messages: prog.messages,
  objects: [{ id: 'stmp', name: 'stamper', pictures: [{ id: '1', name: 's', buf, w: 1, h: 384 }], script: prog.objectScripts.stamper }] });
