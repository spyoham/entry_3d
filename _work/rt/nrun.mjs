// Run an .ent on tessvm's own vm in Node (no renderer): the tick time of the program alone.
// usage: node nrun.mjs file.ent [frames=200] [warm=60] [--vars a,b]
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import cp from 'node:child_process';
import url from 'node:url';
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const EXT = path.join(HERE, '../tessvm/ext');
const imp = (p) => import(url.pathToFileURL(path.join(EXT, p)).href);
const args = process.argv.slice(2);
const file = path.resolve(args[0]);
const frames = Number(args[1] || 200), warm = Number(args[2] || 60);
const vi = args.indexOf('--vars');
const vars = vi >= 0 ? args[vi + 1].split(',') : [];
const tmp = path.join(HERE, '.nrun');
fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
cp.execSync('tar -xf -', { cwd: tmp, input: zlib.gunzipSync(fs.readFileSync(file)) });
const work = JSON.parse(fs.readFileSync(path.join(tmp, 'temp/project.json'), 'utf8'));
work.id = 'local';
const { toTessProject } = await imp('page/tess-project.js');
const { Vm } = await imp('vendor/tessvm/runtime/engine.js');
const built = toTessProject(work);
const OF = globalThis.Function;
globalThis.Function = function (...a) { const src = String(a[a.length - 1]); if (src.includes('const F = [];')) fs.writeFileSync(path.join(HERE, 'prog_node.js'), src); return OF(...a); };
globalThis.Function.prototype = OF.prototype;
const vm = new Vm({ kernel: null, store: null });
vm.load(built.project);
vm.start();
const get = (n) => { const v = vm.variables.find(v => v.name === n); return v ? (v.isList ? v.array.length : v.value) : undefined; };
for (let i = 0; i < warm; i++) vm.tick();
const t0 = performance.now();
let max = 0;
for (let i = 0; i < frames; i++) { const a = performance.now(); vm.tick(); const b = performance.now() - a; if (b > max) max = b; }
const ms = (performance.now() - t0) / frames;
console.log('tick ms', ms.toFixed(2), 'max', max.toFixed(1), 'errors', JSON.stringify(vm.errors.slice(0, 3)), JSON.stringify(Object.fromEntries(vars.map(v => [v, get(v)]))));
if (args.includes('--tess')) fs.writeFileSync(path.join(HERE, 'prog.tess'), built.source);
