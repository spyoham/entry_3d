// The same formulas in the real engines: the work's own numbers (Entry's BigNumber
// arithmetic, or tessvm's) against the simulator's.
//   node test/engine.mjs [entry|tessvm|both]
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import cp from 'node:child_process';
import { build } from '../build.mjs';
import { createSim } from '../sim.mjs';
import { FORMULAS, CONST } from './vm.mjs';
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const TF = [...FORMULAS, ...CONST, 'z+', 'foo(z)'];
const which = process.argv[2] || 'both';
const out = path.join(HERE, '..', 'selftest.ent');
build(out, 'selftest', { BENCH: 2 }, TF);
const s = createSim({ consts: { BENCH: 2 }, tf: TF });
s.frame();
const want = s.peek('TO');
function compare(name, got) {
    if (!got || got.length !== want.length) { console.log(name, 'FAIL: length', got && got.length, 'want', want.length); return 1; }
    let bad = 0, worst = 0, at = '';
    // which formula an index belongs to
    const owner = []; { let i = 0; for (const f of TF) { if (typeof want[i] === 'string') { owner[i++] = f; } else for (let k = 0; k < 12; k++) owner[i++] = f; } }
    for (let i = 0; i < want.length; i += 1) {
        const a = got[i], b = want[i];
        if (typeof b === 'string') { if (String(a) !== b) { bad++; console.log(name, 'error code', owner[i], a, b); } continue; }
        const x = Number(a), y = Number(b);
        if (!isFinite(y) || !isFinite(x)) { if (String(x) !== String(y) && !(Math.abs(x) > 1e300 && Math.abs(y) > 1e300)) { bad++; if (bad < 20) console.log(name, 'MISMATCH', owner[i], x, y); } continue; }
        // (the pair re, im is judged by the size of the pair)
        const j = i - (i % 2 === (owner.indexOf(owner[i]) % 2) ? 0 : 1);
        const m = Math.max(Math.hypot(Number(want[j]), Number(want[j + 1])), 1e-300), d = Math.abs(x - y) / m;
        if (d > worst) { worst = d; at = owner[i]; }
        if (d > 1e-9) { bad++; if (bad < 20) console.log(name, 'MISMATCH', owner[i], x, y); }
    }
    console.log(name, bad ? `FAIL ${bad}` : 'PASS', want.length, 'numbers, worst difference', worst.toExponential(2), at);
    return bad;
}
let bad = 0;
if (which === 'entry' || which === 'both') {
    const { runEnt } = await import('../../gmp/erun.mjs');
    const r = await runEnt(out, { vars: ['done'], lists: ['TO'], timeout: 300000 });
    if (r.errors.length) console.log('entry errors', r.errors.slice(0, 3));
    bad += compare('entry ', r.vars.TO);
}
if (which === 'tessvm' || which === 'both') {
    // tessvm's own vm in Node (no renderer)
    const EXT = path.join(HERE, '../../tessvm/ext');
    const imp = (p) => import(url.pathToFileURL(path.join(EXT, p)).href);
    const zlib = await import('node:zlib');
    const tmp = path.join(HERE, '..', '.nrun');
    fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
    cp.execSync('tar -xf -', { cwd: tmp, input: zlib.gunzipSync(fs.readFileSync(out)) });
    const work = JSON.parse(fs.readFileSync(path.join(tmp, 'temp/project.json'), 'utf8'));
    work.id = 'local';
    const { toTessProject } = await imp('page/tess-project.js');
    const { Vm } = await imp('vendor/tessvm/runtime/engine.js');
    const vm = new Vm({ kernel: null, store: null });
    vm.load(toTessProject(work).project);
    vm.start();
    for (let i = 0; i < 600; i++) { vm.tick(); const d = vm.variables.find(v => v.name === 'done'); if (d && d.value == 1) break; }
    if (vm.errors.length) console.log('tessvm errors', JSON.stringify(vm.errors.slice(0, 3)));
    const L = vm.variables.find(v => v.name === 'TO');
    bad += compare('tessvm', L && (L.array || L.value).map(x => (x && typeof x === 'object' ? x.data : x)));
    fs.rmSync(tmp, { recursive: true, force: true });
}
process.exit(bad ? 1 : 0);
