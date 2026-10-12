// microseconds an item of each step, in plain Entry: node bench.mjs [example] [page] [two]
import path from 'node:path'; import url from 'node:url';
import { build, consts } from './build.mjs';
import { runEnt } from '../gmp/erun.mjs';
import { EXAMPLES, asPasted } from './models.mjs';
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const ex = Number(process.argv[2] || 2), pg = Number(process.argv[3] || 1), two = Number(process.argv[4] || 0);
const out = path.join(HERE, 'bench.ent');
const extra = Object.fromEntries(process.argv.slice(5).filter(a => a.includes('=')).map(a => a.split('=')).map(([k, v]) => [k, Number(v)]));
build(out, { name: 'bench', more: { ...extra, TEST: 2, TESTOBJ: asPasted(EXAMPLES()[ex - 1][1]), BENCHPG: pg, BENCHTWO: two, BENCHLV: pg === 1 ? 1 : pg - consts.NP + 1 } });
const r = await runEnt(out, { vars: ['done'], lists: ['OUT'], timeout: 300000 });
if (r.errors.length) console.log(r.errors.slice(0, 3));
const o = (r.vars.OUT || []).map(Number);
console.log(`example ${ex} page ${pg} two ${two}: vertices ${o[4]} triangles ${o[5]} (about ${o[6]} seen)`);
console.log(`  a vertex ${o[0].toFixed(1)} us; a triangle: looked at ${o[1].toFixed(1)} us, looked at and drawn ${o[2].toFixed(1)} us, the same with pen edges ${o[3].toFixed(1)} us; the whole picture ${o[7].toFixed(1)} ms`);
