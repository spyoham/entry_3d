// (v2.7.3) the swear filter in tessvm: ms of a tick that sends a 160-letter chat line, against plain ticks
//   node test/tessswear.mjs [seed] [ticks] [K=V ...]   (pose: X= Y= Z= YAW= PITCH=)
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
const file = path.join(HERE, 'tessswear.ent');
const built = buildProject(file, { name: 'tess', more: { AUTOSEED: seed, TESTRUN: 1, BENCH: 1, ANIMALS: kv.MOBS || 0, SPLIT: kv.SPLIT || 0 } });
const FNAME = {};
for (const f of built.project.functions) { const m = f.content.match(/function_field_label","params":\["([^"]+)"/); FNAME[f.id] = m ? m[1] : '?'; }

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
for (let i = 0; i < 300; i++) vm.tick();
const tick = () => { const t = performance.now(); vm.tick(); return performance.now() - t; };
const med = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];
const LINE = '아 진짜 씨발 이게 뭐야 다시 발견했는데 병신같이 fuck this shit 새끼 고양이는 귀엽다 '.repeat(2).slice(0, 160);
const plain = [], sent = [];
for (let r = 0; r < 12; r++) {
  for (let i = 0; i < 5; i++) plain.push(tick());
  set('tCmd', LINE); set('testCmd', 13); sent.push(tick());
}
console.log(`plain tick ${med(plain).toFixed(1)} ms, a tick sending the line ${med(sent).toFixed(1)} ms (longest ${Math.max(...sent).toFixed(1)})`);
const L = vm.variables.find(v => v.name === 'CHT');
const arr = L && (L.array || L.value || L._array);
const lastLine = Array.isArray(arr) ? String(arr[arr.length - 1]?.data ?? arr[arr.length - 1]) : '(no CHT: ' + Object.keys(L || {}).join(',') + ')';
console.log('shown:', lastLine);
const okLine = lastLine.includes('아 진짜 ** 이게 뭐야 다시 발견했는데 **같이 **** this **** 새끼 고양이는');
console.log(okLine ? 'all ok' : 'FAIL: not filtered as in the sim');
process.exit(0);
