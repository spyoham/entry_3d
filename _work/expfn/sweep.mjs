// Accuracy in the real engine, in units of the last place, over ranges of x.
import { bench } from './lib.mjs';
import * as C from './cands.mjs';
import { ulpErr } from './hp.mjs';
let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const RANGES = [['|x| < 1e-3', 1e-3], ['|x| < 1', 1], ['|x| < 10', 10], ['|x| < 100', 100], ['|x| < 700', 700]];
const PER = Number(process.env.PER || 300);
const xt = RANGES.flatMap(([, w]) => Array.from({ length: PER }, () => (rnd() * 2 - 1) * w));
const names = (process.argv[2] || 'ref,fast,exact').split(',');
const mk = (n) => { const [f, ...a] = n.split(':'); return typeof C[f] === 'function' ? (a.length ? C[f](...a.map(Number), n.replace(':', '_')) : C[f]()) : C[f]; };
const cands = names.map(mk);
const xs = Array.from({ length: 200 }, (_, i) => (i - 100) * 0.37 + 0.123456789);
const base = { name: 'id', locals: ['v'], body: [['v', 'x']], ret: '$v' };
const r = await bench([base, ...cands], { xs, xt, reps: 5, rounds: Number(process.env.ROUNDS || 10), tables: C.tables() });
console.log('name'.padEnd(10), 'blocks', 'us/call'.padStart(8), ' | ', RANGES.map(([n]) => n.padStart(22)).join(''));
for (const o of r.slice(1)) {
    const cols = RANGES.map((_, k) => {
        const e = o.values.slice(k * PER, (k + 1) * PER).map((v, i) => Math.abs(ulpErr(Number(v), xt[k * PER + i])));
        const bad = e.filter(Number.isNaN).length;
        const ok = e.filter(v => !Number.isNaN(v));
        return `${Math.max(...ok).toFixed(1).padStart(9)} ${(ok.reduce((a, b) => a + b, 0) / ok.length).toFixed(2).padStart(6)}${bad ? ' !' + bad : '   '}`.padStart(22);
    });
    console.log(o.name.padEnd(10), String(o.count).padStart(6), (o.us - r[0].us).toFixed(2).padStart(8), ' | ', cols.join(''), '  (max, mean ulp)');
}
