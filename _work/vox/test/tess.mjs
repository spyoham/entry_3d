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
const file = path.join(HERE, 'tess.ent');
const built = buildProject(file, { name: 'tess', more: { AUTOSEED: seed, TESTRUN: 1, BENCH: 1, ANIMALS: kv.MOBS || 0 } });
const FNAME = {};
for (const f of built.project.functions) { const m = f.content.match(/function_field_label","params":\["([^"]+)"/); FNAME[f.id] = m ? m[1] : '?'; }
fs.writeFileSync(path.join(HERE, 'fnames.json'), JSON.stringify(FNAME));
const EXT = path.join(HERE, '../../tessvm/ext');
const imp = (p) => import(url.pathToFileURL(path.join(EXT, p)).href);
const tmp = path.join(HERE, '.nrun');
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
if (kv.X !== undefined) { set('tX', kv.X); set('tY', kv.Y); set('tZ', kv.Z); set('tYaw', kv.YAW || 0); set('tPitch', kv.PITCH || 0); set('testCmd', 1); }
if (kv.VIEW) { set('viewWant', kv.VIEW); set('autoView', 0); vm.tick(); set('viewR', kv.VIEW); set('viewR2', kv.VIEW * kv.VIEW); set('kMax', Math.floor(kv.VIEW * 1.45) + 66); }
for (let i = 0; i < 120; i++) vm.tick();
if (kv.VIEW) { vm.variables.find(v => v.name === 'viewR'); }
t0 = performance.now(); maxT = 0;
const fr0 = Vv('frames');
for (let i = 0; i < ticks; i++) { const t = performance.now(); vm.tick(); maxT = Math.max(maxT, performance.now() - t); }
const ms = (performance.now() - t0) / ticks;
console.log(`${ms.toFixed(2)} ms/tick (max ${maxT.toFixed(1)}), frames ${Vv('frames') - fr0}/${ticks}, k ${Vv('kStep')} view ${Vv('viewR')} faces ${Vv('nFace')}/${Vv('nScan')} fills ${Vv('nFill')} sections ${Vv('nVS')} pos ${(+Vv('px')).toFixed(1)} ${(+Vv('py')).toFixed(1)} ${(+Vv('pz')).toFixed(1)} errors ${JSON.stringify(vm.errors.slice(0, 3))}`);
fs.rmSync(tmp, { recursive: true, force: true });
