import { compileProgram } from '../ejs.mjs';
import { packEnt } from '../pack.mjs';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/spyoh/entry_3d/entry-vibe-coding/package.json');
const sharp = require('sharp');
const prog = compileProgram([fs.readFileSync('bench5.src.js', 'utf8')]);
const pics = [];
for (let i = 0; i < 8; i++) {
  const buf = await sharp({ create: { width: 1, height: 128, channels: 4, background: { r: 30 * i, g: 200 - 20 * i, b: 100, alpha: 1 } } }).png().toBuffer();
  pics.push({ id: 'p' + i + 'xx', name: String(i), buf, w: 1, h: 128 });
}
packEnt('bench5.ent', { name: 'bench', tmpDir: './.pk', variables: prog.variables, functions: prog.functions, messages: prog.messages,
  objects: [{ id: 'stmp', name: 'stamper', pictures: pics, script: prog.objectScripts.stamper }] });
console.log(prog.stats);
