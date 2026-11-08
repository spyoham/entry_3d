// the bot in tessvm itself (Node, no picture): node test/bottess.mjs [seed] [maxMinutes] [stopAtDim]
// Fixed 1/60 s ticks and a seeded Math.random: the same run every time (botrec.mjs films it).
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import cp from 'node:child_process';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';
import { buildProject } from '../build.mjs';
const require = createRequire(import.meta.url);
const { makeBot } = require('./bot.js');
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const a = process.argv.slice(2);
const seed = Number(a[0] || 1234), maxMin = Number(a[1] || 20), stopDim = Number(a[2] || 9);
let rs = 12345; Math.random = () => { rs = (rs * 48271) % 2147483647; return rs / 2147483647; };

const file = path.join(HERE, 'bot.ent');
buildProject(file, { name: 'bot', more: { AUTOSEED: seed, TESTRUN: 1 } });
const EXT = path.join(HERE, '../../tessvm/ext');
const imp = (p) => import(url.pathToFileURL(path.join(EXT, p)).href);
const tmp = path.join(HERE, '.nrun');
fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
cp.execSync('tar -xf -', { cwd: tmp, input: zlib.gunzipSync(fs.readFileSync(file)) });
const work = JSON.parse(fs.readFileSync(path.join(tmp, 'temp/project.json'), 'utf8'));
work.id = 'local';
const { toTessProject } = await imp('page/tess-project.js');
const { Vm } = await imp('vendor/tessvm/runtime/engine.js');
const vm = new Vm({ kernel: null, store: null });
vm.load(toTessProject(work).project);
vm.start();

const V = new Map(vm.variables.map(v => [v.name, v]));
const get = (n) => { const v = V.get(n); return v ? Number.isFinite(+v.value) && v.value !== '' ? +v.value : v.value : undefined; };
const set = (n, x) => { const v = V.get(n); if (v) v.setValue(x); };
let cache = {}, cacheF = -1;
const io = {
  get, set,
  list: (n, i) => { if (cacheF !== vm.frame) { cache = {}; cacheF = vm.frame; } const A = cache[n] || (cache[n] = V.get(n).array.map(e => +e.data)); return A[i - 1]; },
  key: (c, d) => { if (d) vm.pressedKeys.add(c); else vm.pressedKeys.delete(c); },
  mouseDown: (b) => { vm.mouseDown = b; }, mouse: (x, y) => { vm.mouseX = x; vm.mouseY = y; }, click: () => vm.fireEvent('mouse_clicked'),
  log: (t) => console.log(t), frames: () => get('frames'), dbg: !!process.env.DBG,
};
set('$TESSVM', 1);
const bot = makeBot(io);
const t0 = Date.now();
let i = 0, inDim = -1;
for (; i < maxMin * 3600; i++) {
  if (get('$M_LOCK') === 2) set('$M_LOCK', 1);
  if (get('gState') === 2) { try { bot.step(); } catch (e) { console.log('ERROR', e.message, e.stack.split('\n').slice(1, 4).join(' | ')); break; } }
  vm.tick(1000 / 60);
  if (get('botDone') === 1) break;
  if (get('dead') === 1) { console.log('DIED:', get('deathMsg'), 'at', (i / 60).toFixed(1)); break; }
  if (get('dim') >= stopDim && get('gState') === 2) { if (inDim < 0) inDim = i; if (i - inDim > 300) { console.log('reached dim', get('dim'), 'at', (inDim / 60).toFixed(1), 's'); break; } }
  if (i % 3600 === 0 && i) console.log(`-- ${i / 3600} min: hp ${get('hp')} food ${get('food')} dim ${get('dim')} pos ${(+get('px')).toFixed(0)},${(+get('py')).toFixed(0)},${(+get('pz')).toFixed(0)}`);
}
console.log(`end at ${(i / 60).toFixed(0)} s game time (${i} ticks), ${((Date.now() - t0) / 1000).toFixed(0)} s real`);
