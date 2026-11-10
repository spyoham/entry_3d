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
const file = path.join(HERE, 'tessrs.ent');
const built = buildProject(file, { name: 'tess', more: { AUTOSEED: seed, TESTRUN: 1, BENCH: 1, ANIMALS: kv.MOBS || 0, SPLIT: kv.SPLIT || 0 } });
const FNAME = {};
for (const f of built.project.functions) { const m = f.content.match(/function_field_label","params":\["([^"]+)"/); FNAME[f.id] = m ? m[1] : '?'; }
fs.writeFileSync(path.join(HERE, 'fnames.json'), JSON.stringify(FNAME));
const EXT = path.join(HERE, '../../tessvm/ext');
const imp = (p) => import(url.pathToFileURL(path.join(EXT, p)).href);
const tmp = path.join(HERE, '.nrunrs');
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

for (let i = 0; i < 60; i++) vm.tick();
const CHT = () => (vm.variables.find(v => v.name === 'CHT').array || []).map(x => x.data !== undefined ? x.data : x);
const run = (t) => { set('tCmd', t); set('testCmd', 8); vm.tick(); vm.tick(); };
const ticks2 = (k) => { for (let i = 0; i < k; i++) vm.tick(); };
const X = 8, Y = 50, Z = 8;
run(`/fill ${X - 6} ${Y - 1} ${Z - 6} ${X + 20} ${Y + 4} ${Z + 6} air`);
run(`/fill ${X - 6} ${Y - 1} ${Z - 6} ${X + 20} ${Y - 1} ${Z + 6} stone`);
set('px', X + 0.5); set('py', Y + 6); set('pz', Z - 5); set('flying', 1); ticks2(10);
// lever -> 6 wires -> repeater -> 2 wires -> lamp; a piston by the lamp's wire; a torch under a block
run(`/setblock ${X} ${Y} ${Z} spark_lamp`);
for (let a = 1; a <= 2; a++) run(`/setblock ${X + a} ${Y} ${Z} spark_wire`);
run(`/setblock ${X + 3} ${Y} ${Z} repeater[facing=east,delay=2]`);
for (let a = 4; a <= 9; a++) run(`/setblock ${X + a} ${Y} ${Z} spark_wire`);
run(`/setblock ${X + 1} ${Y} ${Z + 1} sticky_piston[facing=south]`);
run(`/setblock ${X + 1} ${Y} ${Z + 2} oak_planks`);
run(`/setblock ${X + 10} ${Y} ${Z} lever[powered=true]`);
run(`/setblock ${X + 2} ${Y} ${Z + 1} lever[powered=true]`);
ticks2(30);
const chk = (cond, name) => { run(`/execute if block ${cond} run say ${name}`); return CHT().some(t => String(t).includes(name)); };
const r = {
  wire15: chk(`${X + 9} ${Y} ${Z} spark_wire[power=15]`, 'w15'),
  wire10: chk(`${X + 4} ${Y} ${Z} spark_wire[power=10]`, 'w10'),
  repOn: chk(`${X + 3} ${Y} ${Z} repeater[facing=east,delay=2,powered=true]`, 'rep'),
  wireAfter: chk(`${X + 2} ${Y} ${Z} spark_wire[power=15]`, 'w2'),
  lamp: chk(`${X} ${Y} ${Z} spark_lamp_on`, 'lamp'),
  pushed: chk(`${X + 1} ${Y} ${Z + 3} oak_planks`, 'pushed'),
};
run(`/setblock ${X + 10} ${Y} ${Z} lever`); run(`/setblock ${X + 2} ${Y} ${Z + 1} lever`); ticks2(40);
r.lampOff = chk(`${X} ${Y} ${Z} spark_lamp`, 'loff');
r.pulled = chk(`${X + 1} ${Y} ${Z + 2} oak_planks`, 'pulled');
console.log(JSON.stringify(r), 'errors', JSON.stringify(vm.errors.slice(0, 3)));
console.log(CHT().slice(-16).join(' | '));
fs.rmSync(tmp, { recursive: true, force: true });
