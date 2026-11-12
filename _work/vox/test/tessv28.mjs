// (v2.8) the new things in tessvm: world edit (a sphere, the selection drawn, undo), a firework's burst drawn,
// the texture distance: ms of the ticks: node test/tessv28.mjs
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
const file = path.join(HERE, 'tessv28.ent');
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
const L = () => { const l = vm.variables.find(v => v.name === 'CHT'); const arr = l && (l.array || l.value || l._array); return Array.isArray(arr) ? String(arr[arr.length - 1]?.data ?? arr[arr.length - 1]) : '?'; };
const say = (c) => { set('tCmd', c); set('testCmd', 13); const t = tick(); return [t, L()]; };
let fails = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
const plain = []; for (let i = 0; i < 30; i++) plain.push(tick());
console.log(`plain tick ${med(plain).toFixed(1)} ms`);
let [t, r] = say('//pos1'); ok(r.includes('1번째'), r);
say('/tp ~6 ~4 ~6'); for (let i = 0; i < 5; i++) tick();
[t, r] = say('//pos2'); ok(r.includes('2번째'), r);
const sel = []; for (let i = 0; i < 30; i++) sel.push(tick());
console.log(`ticks with the selection drawn ${med(sel).toFixed(1)} ms`);
say('/tp ~ ~10 ~'); for (let i = 0; i < 5; i++) tick();
[t, r] = say('//sphere stone 6'); ok(r.includes('놓았습니다'), `//sphere stone 6 in ${t.toFixed(0)} ms: ${r}`);
const after = []; for (let i = 0; i < 30; i++) after.push(tick());
[t, r] = say('//undo'); ok(r.includes('되돌렸습니다'), `//undo in ${t.toFixed(0)} ms: ${r}`);
for (let i = 0; i < 30; i++) tick();
set('testCmd', 16); tick(); ok(Vv('tStage') > 0, 'a firework rocket up');
const fw = []; for (let i = 0; i < 150; i++) fw.push(tick());
console.log(`ticks with a firework (up, burst) ${med(fw).toFixed(1)} ms, longest ${Math.max(...fw).toFixed(1)}`);
set('texI', 9); set('texD2', 576); const far = []; for (let i = 0; i < 30; i++) far.push(tick());
set('texI', 1); set('texD2', -1); const off = []; for (let i = 0; i < 30; i++) off.push(tick());
console.log(`texture distance 24 blocks ${med(far).toFixed(1)} ms, off ${med(off).toFixed(1)} ms (4.5: ${med(plain).toFixed(1)})`);
console.log(fails ? fails + ' FAILED' : 'all ok');
process.exit(0);
