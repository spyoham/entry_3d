// mpf / mpq against exact BigInt rationals
import { loadLib } from '../lib.mjs';
const R = loadLib();
const F = R.fn;
R.poke('mp_poison', Number(process.env.POISON || 9999991));
let fails = 0, count = 0;
const eq = (what, got, want) => { count++; if (got !== want) { fails++; if (fails < 20) console.log('FAIL', what, '\n got ', String(got).slice(0, 300), '\n want', String(want).slice(0, 300)); } };
const ok = (what, cond) => eq(what, !!cond, true);
// exact value of an mpf as [num, den] BigInt
const fval = (f) => { const s = F.mpf_get_str(10, 0, f); return s; };
const fexact = (f) => {
    const z = R.peek('fM')[f - 1]; const e = R.peek('fE')[f - 1];
    const m = BigInt(F.mpz_get_str(10, z));
    return e >= 0 ? [m * 10n ** BigInt(7 * e), 1n] : [m, 10n ** BigInt(-7 * e)];
};
// |x - y| <= tol * |y|, rationals as [n, d], tol = 10^-digits
const close = (x, y, digits) => { const dn = x[0] * y[1] - y[0] * x[1]; const dd = x[1] * y[1]; const yy = y[0] < 0n ? -y[0] : y[0]; const ad = dn < 0n ? -dn : dn; return ad * 10n ** BigInt(digits) * y[1] <= yy * dd; };
if (process.env.NEWTON) R.poke('MPF_NEWTON_MIN', Number(process.env.NEWTON));
F.mpf_set_default_prec(1000);   // about 301 digits
const a = F.mpf_init(), b = F.mpf_init(), c = F.mpf_init();
let seed = 99; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const rdec = () => { let s = rnd() < 0.3 ? '-' : ''; s += String(1 + Math.floor(rnd() * 9)); const n = 1 + Math.floor(rnd() * 120); for (let i = 0; i < n; i++) s += Math.floor(rnd() * 10); return s + 'e' + (Math.floor(rnd() * 80) - 40); };
const parse = (s) => { const [m, e] = s.split('e'); const E = BigInt(e); const M = BigInt(m); return E >= 0n ? [M * 10n ** E, 1n] : [M, 10n ** -E]; };
for (let t = 0; t < 120; t++) {
    const xs = rdec(), ys = rdec();
    F.mpf_set_str(a, xs, 10); F.mpf_set_str(b, ys, 10);
    const x = parse(xs), y = parse(ys);
    ok(`set_str ${xs}`, close(fexact(a), x, 290));
    F.mpf_add(c, a, b); ok(`add ${t}`, close(fexact(c), [x[0] * y[1] + y[0] * x[1], x[1] * y[1]], 280) || (x[0] * y[1] + y[0] * x[1]) === 0n);
    F.mpf_sub(c, a, b); { const n = x[0] * y[1] - y[0] * x[1]; ok(`sub ${t}`, n === 0n || close(fexact(c), [n, x[1] * y[1]], 280)); }
    F.mpf_mul(c, a, b); ok(`mul ${t}`, close(fexact(c), [x[0] * y[0], x[1] * y[1]], 290));
    F.mpf_div(c, a, b); { let n = x[0] * y[1], d = x[1] * y[0]; if (d < 0n) { n = -n; d = -d; } ok(`div ${t}`, close(fexact(c), [n, d], 290)); }
    F.mpf_abs(c, a); F.mpf_sqrt(c, c); { const s = fexact(c); const ax = x[0] < 0n ? -x[0] : x[0]; ok(`sqrt ${t}`, close([s[0] * s[0], s[1] * s[1]], [ax, x[1]], 280)); }
    const cmpw = Math.sign(Number((x[0] * y[1] - y[0] * x[1]) > 0n) - Number((x[0] * y[1] - y[0] * x[1]) < 0n));
    eq(`cmp ${t}`, F.mpf_cmp(a, b), cmpw);
}
F.mpf_set_ui(a, 2); F.mpf_sqrt(c, a);
eq('sqrt2', F.mpf_get_str(10, 50, c), '14142135623730950488016887242096980785696718753769');
eq('sqrt2 exp', R.peek('mpf_exp'), 1);
F.mpf_set_str(a, '-0.000123456', 10); eq('get_str small', F.mpf_get_str(10, 0, a), '-123456'); eq('exp small', R.peek('mpf_exp'), -3);
F.mpf_set_str(a, '9.9999', 10); eq('round', F.mpf_get_str(10, 3, a), '1'); eq('round exp', R.peek('mpf_exp'), 2);
F.mpf_set_str(a, '-3.7', 10); F.mpf_floor(c, a); eq('floor', F.mpf_get_str(10, 0, c), '-4'); F.mpf_ceil(c, a); eq('ceil', F.mpf_get_str(10, 0, c), '-3'); F.mpf_trunc(c, a); eq('trunc', F.mpf_get_str(10, 0, c), '-3');
eq('get_d', F.mpf_get_d(a), -3.7);
F.mpf_set_ui(a, 10); F.mpf_pow_ui(c, a, 30); eq('pow', F.mpf_get_str(10, 0, c), '1'); eq('pow exp', R.peek('mpf_exp'), 31);
F.mpf_set_ui(a, 1); F.mpf_div_ui(c, a, 3); eq('1/3', F.mpf_get_str(10, 20, c), '33333333333333333333');
F.mpf_set_ui(a, 3); F.mpf_ui_div(c, 1, a); eq('ui_div', F.mpf_get_str(10, 20, c), '33333333333333333333');
// mpq
const q1 = F.mpq_init(), q2 = F.mpq_init(), q3 = F.mpq_init();
F.mpq_set_str(q1, '6/8', 10); F.mpq_canonicalize(q1); eq('canon', F.mpq_get_str(10, q1), '3/4');
F.mpq_set_si(q2, -5, 6); F.mpq_add(q3, q1, q2); eq('add', F.mpq_get_str(10, q3), '-1/12');
F.mpq_sub(q3, q1, q2); eq('sub', F.mpq_get_str(10, q3), '19/12');
F.mpq_mul(q3, q1, q2); eq('mul', F.mpq_get_str(10, q3), '-5/8');
F.mpq_div(q3, q1, q2); eq('div', F.mpq_get_str(10, q3), '-9/10');
F.mpq_inv(q3, q2); eq('inv', F.mpq_get_str(10, q3), '-6/5');
eq('cmp', F.mpq_cmp(q1, q2), 1); eq('cmp_si', F.mpq_cmp_si(q1, 3, 4), 0); eq('cmp_si2', F.mpq_cmp_si(q1, 2, 3), 1);
eq('get_d', F.mpq_get_d(q1), 0.75);
// harmonic number H(100) exactly
F.mpq_set_si(q3, 0, 1); for (let i = 1; i <= 100; i++) { F.mpq_set_si(q1, 1, i); F.mpq_add(q3, q3, q1); }
let hn = 0n, hd = 1n; const g = (a, b) => { while (b) [a, b] = [b, a % b]; return a; }; for (let i = 1n; i <= 100n; i++) { hn = hn * i + hd; hd = hd * i; const gg = g(hn, hd); hn /= gg; hd /= gg; }
eq('H100', F.mpq_get_str(10, q3), `${hn}/${hd}`);
F.mpq_set_str(q1, '1/3', 10); F.mpf_set_q(c, q1); eq('set_q', F.mpf_get_str(10, 10, c), '3333333333');
F.mpf_set_str(a, '0.125', 10); F.mpq_set_f(q2, a); eq('set_f', F.mpq_get_str(10, q2), '1/8');
console.log(`${count - fails}/${count} passed`);
process.exit(fails ? 1 : 0);
