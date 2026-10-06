// The BENCH build in the real Entry engine: microseconds per cell of each operation.
import { runEnt } from '../gmp/erun.mjs';
import { build } from './build.mjs';
const out = new URL('./bench.ent', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
build(out, 'bench', { BENCH: 1 });
const r = await runEnt(out, { vars: ['done'], lists: ['BT'], timeout: 300000 });
const names = ['fill z', 'copy', 'add', 'mul', 'div', 'addc', 'mulc', 'sqr', 'recip', 'sqrt', 'exp', 'ln', 'sin', 'tan', 'program(10 ops)', 'paint', 'strokes', 'empty op call'];
console.log(r.done, r.errors.slice(0, 3));
(r.vars.BT || []).forEach((v, i) => console.log((names[i] || i).padEnd(18), Number(v).toFixed(1)));
