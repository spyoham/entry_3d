// The reference and the two that ship at the awkward places.
import { bench } from './lib.mjs';
import { ref, expFast, expExact } from './cands.mjs';
import { ulpErr } from './hp.mjs';
const L = 2.302585092994046;
const xt = [0, -0, 1, -1, 2, 3, 10, Math.log(2), Math.log(10), 0.5, 1e-300, -1e-300, 1e-17, -1e-17, 1e-9, -1e-9, 1e-5, -1e-5, L, 2 * L, -L, 100 * L, 37, -37, 100, -100, 500, -500, 700, -700,
    709, 709.78, 709.782712893384, 709.79, 710, 1000, 1e10, -708, -708.4, -730, -744, -745, -745.13, -745.2, -746, -1000, -1e10, '', '3', 'abc'];
const base = { name: 'id', locals: ['v'], body: [['v', 'x']], ret: '$v' };
const r = await bench([base, ref, expFast(), expExact()], { xs: [1, 2, 3], xt, reps: 1, rounds: 1 });
const f = (v, x) => { const e = typeof x === 'number' ? ulpErr(Number(v), x) : NaN; return `${String(v).padEnd(24)} ${Number.isNaN(e) ? '      ' : e.toFixed(1).padStart(6)}`; };
console.log('x'.padEnd(20), 'Math.exp'.padEnd(24), '| ref', ' '.repeat(26), '| exp', ' '.repeat(26), '| exp 정밀');
for (let i = 0; i < xt.length; i++) console.log(JSON.stringify(xt[i]).padEnd(20), String(Math.exp(xt[i])).padEnd(24), '|', r.slice(1).map(o => f(o.values[i], xt[i])).join(' | '));
