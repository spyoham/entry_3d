// The list candidates (tbl.mjs) next to the two that shipped: speed, and error in ulp over ranges.
import { bench } from './lib.mjs';
import { expFast, expExact } from './cands.mjs';
import * as TB from './tbl.mjs';
import { ulpErr } from './hp.mjs';
let seed = 2026; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const RANGES = [['|x| < 0.001', 1e-3], ['|x| < 1', 1], ['|x| < 10', 10], ['|x| < 100', 100], ['|x| < 700', 700]];
const PER = Number(process.env.PER || 300);
const special = [0, 1, -1, Math.log(2), 0.5, 2, 10, -1e-17, 1e-17, 709.78, 710, 1000, -745, -745.2, -1000, 1e-300];
const xt = [...RANGES.flatMap(([, w]) => Array.from({ length: PER }, () => (rnd() * 2 - 1) * w)), ...special];
const xs = Array.from({ length: 200 }, (_, i) => (i - 100) * 0.37 + 0.123456789);
const base = { name: 'id', locals: ['v'], body: [['v', 'x']], ret: '$v' };
const names = (process.argv[2] || 'quick,exact:31').split(',');
const cands = names.map(n => { const [f, ...a] = n.split(':'); return TB[f](...a.map(Number), ...(a.length ? [n.replace(':', '_')] : [])); });
const r = await bench([base, expFast(), expExact(), ...cands], { xs, xt, reps: 5, rounds: 14, tables: { [TB.LISTKEY]: TB.table() } });
console.log('name'.padEnd(10), 'blocks', 'us'.padStart(6), ' | ', RANGES.map(([n]) => n.padStart(16)).join(''), '  (max, mean ulp)');
for (const o of r.slice(1)) {
    const cols = RANGES.map((_, k) => { const e = o.values.slice(k * PER, (k + 1) * PER).map((v, i) => Math.abs(ulpErr(Number(v), xt[k * PER + i]))); return `${Math.max(...e).toFixed(1).padStart(8)} ${(e.reduce((a, b) => a + b, 0) / PER).toFixed(2).padStart(6)}`.padStart(16); });
    console.log(o.name.padEnd(10), String(o.count).padStart(6), (o.us - r[0].us).toFixed(1).padStart(6), ' | ', cols.join(''));
}
console.log('x'.padEnd(20), 'Math.exp'.padEnd(24), r.slice(1).map(o => o.name.padEnd(24)).join(''));
special.forEach((x, i) => console.log(String(x).padEnd(20), String(Math.exp(x)).padEnd(24), r.slice(1).map(o => String(o.values[RANGES.length * PER + i]).padEnd(24)).join('')));
