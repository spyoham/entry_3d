// What one block costs in the real engine: chains of twenty of a kind (microseconds each).
// (A value function with no statement at all takes two frames a call: every candidate keeps one.)
import { bench } from './lib.mjs';
const xs = Array.from({ length: 200 }, (_, i) => (i + 1) * 0.37 + 0.123456789);
const chain = (n, f, e) => (n ? f(chain(n - 1, f, e)) : e);
const c = (name, f, e = 'x') => ({ name, n: 20, locals: ['v'], body: [['v', chain(20, f, e)]], ret: '$v' });
const cands = [
    { name: 'id', n: 1, locals: ['v'], body: [['v', 'x']], ret: '$v' },
    c('root', e => ['op', 'root', e]), c('square', e => ['op', 'square', ['op', 'root', e]]), c('ln', e => ['op', 'ln', ['op', 'square', e]]), c('round', e => ['op', 'round', e]), c('abs', e => ['op', 'abs', e]),
    c('mulc', e => ['*', e, '1.0000001']), c('minusc', e => ['-', e, '0.001']), c('plusc', e => ['+', e, '0.001']), c('divc', e => ['/', e, '1.0001']),
    c('mulxx', e => ['*', e, 'x']),
    c('mod', e => ['mod', e, '1000']), c('quot', e => ['quot', e, '1']), c('cat', e => ['cat', e, { t: '' }]), c('catL', e => ['cat', { t: '' }, e]),
    c('idx', e => ['idx', 'TB', e], '1'),
    { name: 'set', n: 20, locals: ['v'], body: Array.from({ length: 21 }, () => ['v', 'x']), ret: '$v' },
    { name: 'setget', n: 20, locals: ['v'], body: [['v', 'x'], ...Array.from({ length: 20 }, () => ['v', '$v'])], ret: '$v' },
];
const r = await bench(cands, { xs, xt: [1, 2, 0.5], reps: 5, rounds: 10, tables: { TB: [1, 1, 1, 1] } });
const base = r[0].us;
for (let i = 0; i < r.length; i++) console.log(r[i].name.padEnd(8), r[i].us.toFixed(2).padStart(8), ((r[i].us - base) / cands[i].n).toFixed(3).padStart(8), JSON.stringify(r[i].values));
