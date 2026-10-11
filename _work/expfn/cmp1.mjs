// exp_test1.png (a ^ b by a table of 1000): n = b * log10(a), result = ("1e" + floor(n)) * TABLE[floor(1000 * frac(n)) + 1]
// against the reference and the two shipped, as e ^ x. TABLE is taken to be 10^(k/1000), k = 0..999 (the picture does not show it).
import { bench } from './lib.mjs';
import { ref, expFast, expExact } from './cands.mjs';
import { expHP } from './hp.mjs';
const test1 = {
    name: 'test1', locals: ['n'],
    body: [['n', ['*', 'x', ['op', 'log', '2.718281828459045']]]],
    ret: ['*', ['cat', { t: '1e' }, ['op', 'floor', '$n']], ['idx', 'TABLE', ['+', ['op', 'floor', ['*', '1000', ['op', 'unnatural', '$n']]], '1']]],
};
const TABLE = Array.from({ length: 1000 }, (_, k) => 10 ** (k / 1000));
let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const RANGES = [['|x| < 1', 1], ['|x| < 10', 10], ['|x| < 100', 100], ['|x| < 700', 700]];
const PER = 300;
const special = [0, 1, -1, Math.log(2), 10, -0.0001, 0.0001, 709.78, 710, -745.2, -1000];
const xt = [...RANGES.flatMap(([, w]) => Array.from({ length: PER }, () => (rnd() * 2 - 1) * w)), ...special];
const xs = Array.from({ length: 200 }, (_, i) => (i - 100) * 0.37 + 0.123456789);
const base = { name: 'id', locals: ['v'], body: [['v', 'x']], ret: '$v' };
const r = await bench([base, test1, ref, expFast(), expExact()], { xs, xt, reps: 5, rounds: 14, tables: { TABLE } });
// relative error against the 320-bit value
const rel = (v, x) => { const t = expHP(x); const tv = Number(t.m >> 268n) / 2 ** 52 * 2 ** t.e; return Math.abs(Number(v) / tv - 1); };
console.log('name'.padEnd(8), 'us'.padStart(6), ' | ', RANGES.map(([n]) => n.padStart(20)).join(''), '  (max, mean relative error)');
for (const o of r.slice(1)) {
    const cols = RANGES.map((_, k) => { const e = o.values.slice(k * PER, (k + 1) * PER).map((v, i) => rel(v, xt[k * PER + i])); return `${Math.max(...e).toExponential(1)} ${(e.reduce((a, b) => a + b, 0) / PER).toExponential(1)}`.padStart(20); });
    console.log(o.name.padEnd(8), (o.us - r[0].us).toFixed(1).padStart(6), ' | ', cols.join(''));
}
special.forEach((x, i) => console.log(String(x).padEnd(20), String(Math.exp(x)).padEnd(24), r.slice(1).map(o => String(o.values[RANGES.length * PER + i]).padEnd(24)).join('')));
