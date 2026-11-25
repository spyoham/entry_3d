// The game in tessvm's own vm (Node, no picture): ms a tick while playing
//   node test/tess.mjs [seed] [ticks] [K=V ...]   (pose: X= Y= Z= YAW= PITCH=; DIM=1|2 the other worlds,
//   GENVER=0 their land as before v3.2; STAGES=1 REPS=n the chunk stages' ms)
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
const built = buildProject(file, { name: 'tess', more: { AUTOSEED: seed, TESTRUN: 1, BENCH: kv.BENCH === undefined ? 1 : kv.BENCH, ANIMALS: kv.MOBS || 0, GENV: kv.GENV === undefined ? 2 : kv.GENV, SPLIT: kv.SPLIT || 0, MESHFAST: kv.MESHFAST === undefined ? 1 : kv.MESHFAST } });
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
for (let i = 0; i < (kv.SETTLE || 120); i++) vm.tick();
if (kv.GENVER !== undefined) { set('genVer', kv.GENVER); }
if (kv.DIM) { set('tStage', kv.DIM); set('tX', 1.5); set('tZ', 1.5); set('testCmd', 4); let k = 0; const tt = performance.now(); vm.tick(); while (Vv('gState') != 2 && k < 3000) { vm.tick(); k++; } const t1 = performance.now() - tt; const t2 = performance.now(); for (let i = 0; i < 240; i++) vm.tick(); console.log('in world', Vv('dim'), `(the way there ${k} ticks ${t1.toFixed(0)} ms, the next 240 ticks ${(performance.now() - t2).toFixed(0)} ms, chunks ${Vv('nChunks')})`); }
if (kv.NORESET) { set('tPitch', 777); }
// (NIGHT=1 with BENCH=0: survival at midnight, the time held - monsters come up to their twenty; the count is printed)
if (kv.NIGHT) { set('gameMode', 0); set('tday', 0.75); set('grDay', 0); set('difficulty', 2); for (let i = 0; i < (kv.WARM || 600); i++) { set('hp', 20); set('food', 20); vm.tick(); } const ET = vm.variables.find((v) => v.name === 'ET').array.map((x) => +x.data), MH = vm.variables.find((v) => v.name === 'MHOST').array.map((x) => +x.data); console.log('mobs', ET.filter((t) => t > 0).length, 'monsters', ET.filter((t) => t > 0 && MH[t - 1] === 1).length); }
if (kv.STAGES) {
  const tick = () => { const t = performance.now(); vm.tick(); return performance.now() - t; };
  const med = (a) => a.sort((x, y) => x - y)[a.length >> 1];
  const idle = []; for (let i = 0; i < 40; i++) idle.push(tick());
  const base = med(idle);
  for (const st of [0, 1, 2, 3, 4]) {
    const ts = [];
    for (let r = 0; r < (kv.REPS || 15); r++) { set('tStage', st); set('testCmd', 3); ts.push(tick()); tick(); }
    console.log('stage', st, 'ms', (med(ts) - base).toFixed(2), '(idle tick', base.toFixed(2) + ')');
  }
  process.exit(0);
}
// (LOAD=n: n times to a far place - the ms and ticks until every chunk round it is made and nothing waits to be meshed)
if (kv.LOAD) {
  // (for a dump: no random ticks, and the engine's random numbers the same each run)
  if (kv.DUMP) { set('grTick', 0); let sd = 12345; Math.random = () => { sd = (sd + 0x6D2B79F5) | 0; let t = Math.imul(sd ^ (sd >>> 15), 1 | sd); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const res = [];
  for (let r = 0; r < kv.LOAD; r++) {
    set('tX', 3000.5 + r * 700); set('tY', 130); set('tZ', 500.5 - r * 900); set('tYaw', 0); set('tPitch', 0); set('testCmd', 1);
    let ms = 0, n = 0, idle = 0;
    while (idle < 3 && n < 4000) { set('lastStage', 0); if (kv.DUMP) set('fqN', 0); const t = performance.now(); vm.tick(); ms += performance.now() - t; n++; if (Vv('lastStage') == 0 && Vv('rqN') == 0) idle++; else idle = 0; }
    let im = 0; for (let i = 0; i < 60; i++) { const t = performance.now(); vm.tick(); im += performance.now() - t; }
    res.push({ ms, n, idle: im / 60, chunks: Vv('nChunks'), faces: Vv('nFace') });
  }
  for (const x of res) console.log('load', x.ms.toFixed(0), 'ms in', x.n, 'ticks (idle tick', x.idle.toFixed(2), 'ms) net', (x.ms - x.n * x.idle).toFixed(0), 'ms, chunks', x.chunks, 'faces', x.faces);
  const net = res.slice(1).map((x) => x.ms - x.n * x.idle).sort((p, q) => p - q);
  console.log('LOAD median net ms', net[net.length >> 1].toFixed(0), 'of', net.map((v) => v.toFixed(0)).join(' '), 'errors', JSON.stringify(vm.errors.slice(0, 3)));
  // (DUMP=1 with TAG=name in the environment: what was made, to test/dump_name.json - the cells, the light and
  // each meshed section's faces (sorted: their order within a group is not compared) - for test/dumpcmp.mjs)
  if (kv.DUMP) {
    // (no liquid flows in a dump: how far one has come depends on how many ticks the making took)
    let q = 0; set('fqN', 0);
    for (let i = 0; i < 30; i++) vm.tick();
    const Lv = (n) => vm.variables.find((v) => v.name === n).array.map((x) => x.data);
    const hash = (a) => { let h = 2166136261; for (let i = 0; i < a.length; i++) { h ^= (+a[i] | 0) + i; h = Math.imul(h, 16777619); } return h >>> 0; };
    const W = Lv('W'), LT = Lv('LT'), CKST = Lv('CKST'), CKX = Lv('CKX'), CKZ = Lv('CKZ');
    const WY = built.consts ? built.consts.WY : 256, WS = 160;
    const cols = {};
    for (let s = 0; s < CKST.length; s++) if (+CKST[s] >= 4) {
      for (let a = 0; a < 16; a++) for (let c = 0; c < 16; c++) {
        const x = CKX[s] * 16 + a, z = CKZ[s] * 16 + c, i = ((((x % WS) + WS) % WS) * WS + (((z % WS) + WS) % WS)) * WY;
        cols[x + ',' + z] = [hash(W.slice(i, i + WY)), hash(LT.slice(i, i + WY))];
        if ((process.env.COLS || '').split(';').includes(x + ',' + z)) cols[x + ',' + z].push(W.slice(i, i + WY).join(','), LT.slice(i, i + WY).join(','));
      }
    }
    const SOK = Lv('SOK'), SOX = Lv('SOX'), SOZ = Lv('SOZ'), SG = Lv('SG'), SVIS = Lv('SVIS'), SFN = Lv('SFN'), FP = Lv('FP'), FT = Lv('FT'), FN = Lv('FN'), FA = Lv('FA');
    const NSY = WY / 8, secs = {};
    for (let k = 0; k < SOK.length; k++) if (+SOK[k] === 1) {
      const parts = [];
      for (let g = 0; g < 15; g++) { const f0 = +SFN[k] > 0 ? +SG[k * 16 + g] : 0, f1 = +SFN[k] > 0 ? +SG[k * 16 + g + 1] : 0, fs2 = []; for (let f = f0; f < f1; f++) fs2.push(FP[f - 1] + ':' + FT[f - 1] + ':' + FN[f - 1] + ':' + FA[f - 1]); fs2.sort(); parts.push(fs2.join(' ')); }
      const str = parts.join('|'); let h = 0; for (let i = 0; i < str.length; i++) h = (Math.imul(h, 31) + str.charCodeAt(i)) | 0;
      secs[SOX[k] + ',' + (k % NSY) + ',' + SOZ[k]] = [+SFN[k], h, +SVIS[k]];
      if ((process.env.SECS || '').split(';').includes(SOX[k] + ',' + (k % NSY) + ',' + SOZ[k])) secs[SOX[k] + ',' + (k % NSY) + ',' + SOZ[k]].push(str);
    }
    fs.writeFileSync(path.join(HERE, 'dump_' + (process.env.TAG || 'x') + '.json'), JSON.stringify({ cols, secs }));
    console.log('dump: columns', Object.keys(cols).length, 'sections', Object.keys(secs).length, 'fluid ticks', q);
  }
  if (process.env.TVARS) console.log(process.env.TVARS.split(',').map((n) => n + ' ' + Vv(n)).join(', '));
  process.exit(0);
}
// (WRITES=1: how many times each list is written from here on - a write makes a new value for the engine to keep or throw away)
const wrN = {};
if (kv.WRITES) { for (const v of vm.variables) if (Array.isArray(v.array)) { const nm = v.name; wrN[nm] = 0; v.array = new Proxy(v.array, { set(t, k, x) { if (k !== 'length') wrN[nm]++; t[k] = x; return true; } }); } }
if (kv.FLY) { set('gameMode', 1); set('flying', 1); set('yaw', 30); set('pitch', -10); vm.pressedKeys.add(87); vm.pressedKeys.add(82); }
if (kv.VIEW) { vm.variables.find(v => v.name === 'viewR'); }
t0 = performance.now(); maxT = 0;
const fr0 = Vv('frames');
const spikes = [], allT = []; const longBy = {}, stageT = {};
for (let i = 0; i < ticks; i++) {
  if (kv.FLY) { set('py', kv.FLYY || 100); set('pvy', 0); }
  set('lastStage', 0);
  const t = performance.now(); vm.tick(); const dt = performance.now() - t;
  maxT = Math.max(maxT, dt); allT.push(dt);
  if (dt > 16.7) { const k = String(Vv('lastStage')); longBy[k] = (longBy[k] || 0) + 1; } { const k = String(Vv('lastStage')); (stageT[k] = stageT[k] || []).push(dt); }
  if (dt > 35) spikes.push(dt.toFixed(0) + ':' + Vv('lastStage') + ':' + Vv('rqN') + ':' + (vm.variables.find(v => v.name === 'WBX').array || []).length);
}
if (spikes.length) console.log('spikes (ms:stages:remesh queue:cave pool)', spikes.slice(0, 30).join(' '));
const ms = (performance.now() - t0) / ticks;
console.log('ticks by the stages done in them (stage + 1 each; mean ms, count, over 16.7): ' + Object.entries(stageT).sort((p, q) => q[1].length - p[1].length).slice(0, 14).map(([k, v]) => k + ': ' + (v.reduce((x, y) => x + y, 0) / v.length).toFixed(1) + ' x' + v.length + ' >' + (longBy[k] || 0)).join(' | '));
if (process.env.TLISTS) { const big = vm.variables.filter((v) => v.isList || Array.isArray(v.array)).map((v) => [v.name, (v.array || []).length]).sort((p, q) => q[1] - p[1]); console.log('lists: ' + big.slice(0, +process.env.TLISTS).map((x) => x[0] + ' ' + x[1]).join(', ') + ' | all ' + big.reduce((x, y) => x + y[1], 0) + ' items, heap ' + Math.round(process.memoryUsage().heapUsed / 1e6) + ' MB'); }
if (kv.WRITES) { const w = Object.entries(wrN).sort((p, q) => q[1] - p[1]); console.log('list writes a tick: ' + w.slice(0, 40).map((x) => x[0] + ' ' + (x[1] / ticks).toFixed(0)).join(', ') + ' | all ' + (w.reduce((x, y) => x + y[1], 0) / ticks).toFixed(0)); }
allT.sort((p, q) => p - q); console.log('tick ms: half under ' + allT[allT.length >> 1].toFixed(1) + ', 95% under ' + allT[Math.floor(allT.length * 0.95)].toFixed(1) + ', 99% under ' + allT[Math.floor(allT.length * 0.99)].toFixed(1) + ', over 16.7 ms: ' + allT.filter((v) => v > 16.7).length + ' of ' + allT.length);
console.log(`${ms.toFixed(2)} ms/tick (max ${maxT.toFixed(1)}), frames ${Vv('frames') - fr0}/${ticks}, k ${Vv('kStep')} view ${Vv('viewR')} chunks ${Vv('nChunks')} faces ${Vv('nFace')}/${Vv('nScan')} fills ${Vv('nFill')} sections ${Vv('nVS')} pos ${(+Vv('px')).toFixed(1)} ${(+Vv('py')).toFixed(1)} ${(+Vv('pz')).toFixed(1)} errors ${JSON.stringify(vm.errors.slice(0, 3))}`);
if (process.env.TVARS) console.log(process.env.TVARS.split(',').map((n) => n + ' ' + Vv(n)).join(', '));
fs.rmSync(tmp, { recursive: true, force: true });
