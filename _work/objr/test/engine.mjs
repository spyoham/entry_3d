// The same models in the real engines: what the work makes of them (counts, the box, the
// places of the vertices on the stage, colours) against the simulator's.
//   node test/engine.mjs [entry|tessvm|both] [model ...]
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import cp from 'node:child_process';
import zlib from 'node:zlib';
import { build } from '../build.mjs';
import { createSim } from '../sim.mjs';
import { asPasted } from '../models.mjs';
import { CASES } from './cases.mjs';
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const which = process.argv[2] || 'both';
const only = process.argv.slice(3);
const out = path.join(HERE, '..', 'selftest.ent');
const NAMES = ['faces', 'verts', 'pages', 'raw', 'same place', 'mats', 'closed', 'flipped', 'two', 'bad', 'drop', 'large faces', 'levels', 'lod1 faces', 'lod2 faces', 'lod1 verts', 'lod2 verts', 'fronts seen', 'scale', 'cx', 'cy', 'cz', 'stage sum', 'ramp 1', 'ramp last', 'colour 1'];

export async function tessRun(file, frames = 20000) {
    // tessvm's own vm in Node (no renderer)
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
    for (; n < frames; n++) { vm.tick(); const d = vm.variables.find(v => v.name === 'done'); if (d && d.value == 1) break; }
    const Lst = vm.variables.find(v => v.name === 'OUT');
    fs.rmSync(tmp, { recursive: true, force: true });
    return { ticks: n, ms: performance.now() - t0, errors: vm.errors.slice(0, 3), out: Lst && (Lst.array || Lst.value).map(x => (x && typeof x === 'object' ? x.data : x)) };
}

function compare(name, got, want) {
    if (!got || got.length !== want.length) { console.log('  ' + name, 'FAIL: length', got && got.length, 'want', want.length); return 1; }
    let bad = 0;
    for (let i = 0; i < want.length; i++) if (String(got[i]) !== String(want[i])) { bad++; console.log('  ' + name, 'MISMATCH', NAMES[i] || i, 'got', got[i], 'want', want[i]); }
    return bad;
}

let bad = 0;
for (const [label, text, more] of CASES) {
    if (only.length && !only.includes(label)) continue;
    const C = { TEST: 1, TESTOBJ: asPasted(text), ...(more || {}) };
    const s = createSim({ consts: C });
    let n = 0;
    while (s.peek('done') !== 1 && n < 200000) { s.frame(); n++; }
    const want = s.peek('OUT');
    console.log(label, JSON.stringify(want.slice(0, 18)), 'sim frames', n);
    build(out, { name: 'selftest', more: C });
    if (which === 'entry' || which === 'both') {
        const { runEnt } = await import('../../gmp/erun.mjs');
        const r = await runEnt(out, { vars: ['done'], lists: ['OUT'], timeout: 600000, hiresTimer: false });
        if (r.errors.length) console.log('  entry errors', r.errors.slice(0, 3));
        const b = compare('entry ', r.vars.OUT, want);
        console.log('  entry ', b ? 'FAIL' : 'PASS', (r.ms / 1000).toFixed(1) + 's');
        bad += b;
    }
    if (which === 'tessvm' || which === 'both') {
        const r = await tessRun(out);
        if (r.errors.length) console.log('  tessvm errors', JSON.stringify(r.errors));
        const b = compare('tessvm', r.out, want);
        console.log('  tessvm', b ? 'FAIL' : 'PASS', 'ticks', r.ticks, (r.ms / 1000).toFixed(1) + 's');
        bad += b;
    }
}
fs.rmSync(out, { force: true });
process.exit(bad ? 1 : 0);
