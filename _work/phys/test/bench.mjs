// The cost of the pieces of a step in the real plain Entry engine.  node test/bench.mjs [scene]
import path from 'node:path';
import url from 'node:url';
import { build } from '../build.mjs';
import { runEnt } from '../../gmp/erun.mjs';
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const out = path.join(HERE, '..', 'bench.ent');
build(out, { name: 'bench', more: { TEST: 2, TSCN: Number(process.argv[2] || 1) } });
const r = await runEnt(out, { vars: ['done'], lists: ['OUT'], timeout: 600000 });
const o = r.vars.OUT || [];
console.log('done', r.done, 'ms', r.ms);
for (let i = 0; i < o.length; i += 2) console.log(String(o[i]).padEnd(12), o[i + 1], 'us');
if (r.errors && r.errors.length) console.log(r.errors.slice(0, 3));
