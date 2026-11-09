// The game in tessvm's own vm (Node, no picture): ms a tick while playing
//   node test/tess.mjs [seed] [ticks] [K=V ...]   (pose: X= Y= Z= YAW= PITCH=)
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import cp from 'node:child_process';
import zlib from 'node:zlib';
import { buildProject } from '../build.mjs';
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const a = process.argv.slice(2);
const seed = Number(a[0] || 1234), ticks = Number(a[1] || 300);
const kv = Object.fromEntries(a.slice(2).filter(x => x.includes('=')).map(x => x.split('=')).map(([k, v]) => [k, Number(v)]));
const file = path.join(HERE, 'tesslog.ent');
const built = buildProject(file, { name: 'tess', more: { AUTOSEED: seed, TESTRUN: 1, BENCH: 1, ANIMALS: kv.MOBS || 0, SPLIT: kv.SPLIT || 0 } });
const FNAME = {};
for (const f of built.project.functions) { const m = f.content.match(/function_field_label","params":\["([^"]+)"/); FNAME[f.id] = m ? m[1] : '?'; }
fs.writeFileSync(path.join(HERE, 'fnames.json'), JSON.stringify(FNAME));
const EXT = path.join(HERE, '../../tessvm/ext');
const imp = (p) => import(url.pathToFileURL(path.join(EXT, p)).href);
const tmp = path.join(HERE, '.nrunlog');
fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
cp.execSync('tar -xf -', { cwd: tmp, input: zlib.gunzipSync(fs.readFileSync(file)) });
const work = JSON.parse(fs.readFileSync(path.join(tmp, 'temp/project.json'), 'utf8'));
work.id = 'local';
const { toTessProject } = await imp('page/tess-project.js');
const { Vm } = await imp('vendor/tessvm/runtime/engine.js');
const conv = toTessProject(work);
if (conv.dropped && conv.dropped.length) console.log('dropped', JSON.stringify(conv.dropped).slice(0, 300));
const F0 = globalThis.Function; let SRC = '';
globalThis.Function = function (...a) { if (a.length === 2 && a[0] === 'R') SRC = a[1]; return F0(...a); };
const vm = new Vm({ kernel: null, store: null });
vm.load(conv.project);
globalThis.Function = F0;
if (kv.SRC) fs.writeFileSync(path.join(HERE, 'tess_src.js'), SRC);
vm.start();
const Vv = (n) => { const v = vm.variables.find(v => v.name === n); return v && v.value; };
const set = (n, x) => { const v = vm.variables.find(v => v.name === n); v.setValue(x); };
set('$TESSVM', 1);
let t0 = performance.now(), n = 0, maxT = 0;
while (Vv('gState') != 2 && n < 5000) { const t = performance.now(); vm.tick(); maxT = Math.max(maxT, performance.now() - t); n++; }
console.log(`generated: ${n} ticks ${(performance.now() - t0).toFixed(0)} ms (longest tick ${maxT.toFixed(0)} ms)`);

const L = (n) => vm.variables.find(v => v.name === n);
const fillLog = (n) => { for (const k of ['EDX', 'EDY', 'EDZ', 'EDB', 'EDD']) L(k).array = []; for (let i = 0; i < n; i++) { L('EDX').array.push({ data: 5000 + (i % 200) }); L('EDY').array.push({ data: 40 + (i % 7) }); L('EDZ').array.push({ data: 5000 + Math.floor(i / 200) }); L('EDB').array.push({ data: 1 }); L('EDD').array.push({ data: 0 }); } };
for (const n of [0, 20000, 60000]) {
  fillLog(n);
  // far away and back: the chunks round the player made again
  set('px', 300 + n / 100); set('pz', 300); for (let i = 0; i < 400; i++) vm.tick();
  const t0 = performance.now(); let k = 0;
  set('px', 8.5); set('pz', 8.5);
  for (let i = 0; i < 300; i++) { vm.tick(); k++; }
  console.log('log', n, 'ms/tick while chunks are made', ((performance.now() - t0) / k).toFixed(2), 'chunks', Vv('nChunks'));
}
fs.rmSync(tmp, { recursive: true, force: true });
