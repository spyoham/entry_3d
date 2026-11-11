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
const file = path.join(HERE, 'tessrsb.ent');
const built = buildProject(file, { name: 'tess', more: { AUTOSEED: seed, TESTRUN: 1, BENCH: 1, ANIMALS: kv.MOBS || 0, SPLIT: kv.SPLIT || 0 } });
const FNAME = {};
for (const f of built.project.functions) { const m = f.content.match(/function_field_label","params":\["([^"]+)"/); FNAME[f.id] = m ? m[1] : '?'; }
fs.writeFileSync(path.join(HERE, 'fnames.json'), JSON.stringify(FNAME));
const EXT = path.join(HERE, '../../tessvm/ext');
const imp = (p) => import(url.pathToFileURL(path.join(EXT, p)).href);
const tmp = path.join(HERE, '.nrunrsb');
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
// (v2.6) a redstone load: clocks (observer pairs) driving sticky pistons, lamps and wire
for (let i = 0; i < 60; i++) vm.tick();
const run = (t) => { set('tCmd', t); set('testCmd', 8); vm.tick(); vm.tick(); };
const ticks2 = (k) => { for (let i = 0; i < k; i++) vm.tick(); };
const X = 8, Y = 50, Z = 8;
run(`/fill ${X - 4} ${Y - 1} ${Z - 4} ${X + 40} ${Y + 4} ${Z + 40} air`);
run(`/fill ${X - 4} ${Y - 1} ${Z - 4} ${X + 40} ${Y - 1} ${Z + 40} stone`);
set('px', X + 18.5); set('py', Y + 14); set('pz', Z - 6); set('flying', 1); set('pitch', -50); ticks2(10);
for (let r = 0; r < 6; r++) {
  const z = Z + r * 6;
  // a clock: two observers face to face (a pulse every two ticks), out of the second's back
  run(`/setblock ${X} ${Y} ${z} observer[facing=east]`); run(`/setblock ${X + 1} ${Y} ${z} observer[facing=west]`);
  // wire out along x to lamps and sticky pistons with blocks
  for (let a = 2; a <= 30; a++) run(`/setblock ${X + a} ${Y} ${z} spark_wire`);
  for (let a = 3; a <= 30; a += 3) { run(`/setblock ${X + a} ${Y} ${z - 1} spark_lamp`); run(`/setblock ${X + a + 1} ${Y} ${z + 1} sticky_piston[facing=south]`); run(`/setblock ${X + a + 1} ${Y} ${z + 2} oak_planks`); }
}
ticks2(120);
let t1 = performance.now(), mx = 0;
const N = Number(kv.N || 600);
for (let i = 0; i < N; i++) { const t = performance.now(); vm.tick(); mx = Math.max(mx, performance.now() - t); }
const ms = (performance.now() - t1) / N;
const lamps = (() => { let c = 0; return c; })();
console.log(`redstone load: ${ms.toFixed(2)} ms a tick (longest ${mx.toFixed(0)}), errors ${vm.errors.length}`, JSON.stringify(vm.errors.slice(0, 2)));
fs.rmSync(tmp, { recursive: true, force: true });
