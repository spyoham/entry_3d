// The work in tessvm's own vm (Node, no picture): scene, mode, frames; prints what the
// panel would show, to compare with the Node run (test/run.mjs) and plain Entry.
//   node test/tess.mjs scene mode frames
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import cp from 'node:child_process';
import zlib from 'node:zlib';
import { build } from '../build.mjs';
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const [scene, mode, frames] = process.argv.slice(2).map(Number);
const file = path.join(HERE, '..', 'tess.ent');
build(file, { name: 'tess', more: { TEST: 1, START: scene, MODE0: mode, TFRAMES: frames } });
const EXT = path.join(HERE, '../../tessvm/ext');
const imp = (p) => import(url.pathToFileURL(path.join(EXT, p)).href);
const tmp = path.join(HERE, '..', '.nrun');
fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
cp.execSync('tar -xf -', { cwd: tmp, input: zlib.gunzipSync(fs.readFileSync(file)) });
const work = JSON.parse(fs.readFileSync(path.join(tmp, 'temp/project.json'), 'utf8'));
work.id = 'local';
const { toTessProject } = await imp('page/tess-project.js');
const { Vm } = await imp('vendor/tessvm/runtime/engine.js');
const vm = new Vm({ kernel: null, store: null });
vm.load(toTessProject(work).project);
vm.start();
const t0 = performance.now();
let n = 0;
for (; n < 200000; n++) { vm.tick(); const d = vm.variables.find(v => v.name === 'done'); if (d && d.value == 1) break; }
const L = vm.variables.find(v => v.name === 'OUT');
console.log('ticks', n, 'ms', (performance.now() - t0).toFixed(0), 'errors', JSON.stringify(vm.errors.slice(0, 3)));
console.log('OUT', JSON.stringify(L && (L.array || L.value).map(x => (x && typeof x === 'object' ? x.data : x))));
fs.rmSync(tmp, { recursive: true, force: true }); fs.rmSync(file, { force: true });
