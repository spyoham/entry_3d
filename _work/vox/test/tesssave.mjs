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
const file = path.join(HERE, 'tesssave.ent');
const built = buildProject(file, { name: 'tess', more: { AUTOSEED: 0, TESTRUN: 1, BENCH: 0, ANIMALS: kv.MOBS || 0, SPLIT: kv.SPLIT || 0 } });
const FNAME = {};
for (const f of built.project.functions) { const m = f.content.match(/function_field_label","params":\["([^"]+)"/); FNAME[f.id] = m ? m[1] : '?'; }
fs.writeFileSync(path.join(HERE, 'fnames.json'), JSON.stringify(FNAME));
const EXT = path.join(HERE, '../../tessvm/ext');
const imp = (p) => import(url.pathToFileURL(path.join(EXT, p)).href);
const tmp = path.join(HERE, '.nrunsave');
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

let stored = {}, writes = 0;
const host = { read: async () => stored, write: async (v) => { stored = JSON.parse(JSON.stringify(v)); writes++; } };
async function run(fn) {
  const vm = new Vm({ kernel: null, store: null });
  vm.load(conv.project);
  vm.save.host = host;
  await vm.save.load();
  vm.start();
  const V = (n) => vm.variables.find(v => v.name === n);
  const set = (n, x) => V(n).setValue(x);
  set('$TESSVM', 1);
  const tick = (k) => { for (let i = 0; i < k; i++) vm.tick(); };
  const out = await fn({ vm, V, set, tick });
  return out;
}
const names = conv.project.variables.map(v => v.name).filter(n => n.startsWith('@'));
console.log('@ names', names.join(' '));
// run 1: a new world, a block put, /save-all
await run(async ({ vm, V, set, tick }) => {
  tick(30);
  console.log('flag', V('@확장프로그램').getValue());
  set('tCmd', '777'); set('tStage', 1); set('testCmd', 10); tick(1);
  let k = 0; while (V('gState').getValue() != 2 && k < 6000) { tick(1); k++; }
  tick(60);
  set('tCmd', '/setblock ~ ~3 ~ gold_block'); set('testCmd', 8); tick(3);
  set('tCmd', '/save-all'); set('testCmd', 8); tick(5);
  await new Promise(r => setTimeout(r, 50)); tick(3);
  console.log('run 1: seed', V('seed').getValue(), 'pos', (+V('px').getValue()).toFixed(1), (+V('py').getValue()).toFixed(1), (+V('pz').getValue()).toFixed(1), 'writes', writes, 'errors', JSON.stringify(vm.errors.slice(0, 2)));
  const ch = V('CHT').getArray().map(x => x.data); console.log('  chat', ch.slice(-2).join(' | '));
});
const kept = stored['@세계1'];
console.log('kept list', kept ? kept.length + ' items, first ' + kept[0].data : 'none');
// run 2: the title sees it; 이어하기
await run(async ({ vm, V, set, tick }) => {
  tick(30);
  console.log('run 2: kept items', V('@세계1').getArray().length);
  set('tStage', 1); set('testCmd', 9); tick(1);
  let k = 0; while (V('gState').getValue() != 2 && k < 6000) { tick(1); k++; }
  tick(30);
  console.log('run 2: seed', V('seed').getValue(), 'pos', (+V('px').getValue()).toFixed(1), (+V('py').getValue()).toFixed(1), (+V('pz').getValue()).toFixed(1), 'gState', V('gState').getValue(), 'errors', JSON.stringify(vm.errors.slice(0, 2)));
  set('tCmd', '/execute if block ~ ~3 ~ gold_block run say gold'); set('testCmd', 8); tick(3);
  const ch = V('CHT').getArray().map(x => x.data); console.log('  chat', ch.slice(-2).join(' | '));
});
fs.rmSync(tmp, { recursive: true, force: true });
