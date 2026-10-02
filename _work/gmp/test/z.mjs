// mpz against BigInt
import { loadLib } from '../lib.mjs';
const R = loadLib();
const F = R.fn;
if (process.env.KARA) { R.poke('KARA_MIN', Number(process.env.KARA)); R.poke('KARA_SQR_MIN', Number(process.env.KARA)); R.poke('KARA_BASE_MAX', Number(process.env.KBASE || 16)); }
let seed = 12345;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const rbig = (digits) => { let s = String(1 + Math.floor(rnd() * 9)); for (let i = 1; i < digits; i++) s += Math.floor(rnd() * 10); return (rnd() < 0.3 ? -1n : 1n) * BigInt(s); };
const set = (h, v) => F.mpz_set_str(h, v.toString(), 10);
const get = (h) => BigInt(F.mpz_get_str(10, h));
let fails = 0, count = 0;
const eq = (what, got, want) => { count++; if (got !== want) { fails++; if (fails < 15) console.log('FAIL', what, '\n got ', String(got).slice(0, 200), '\n want', String(want).slice(0, 200)); } };
const a = F.mpz_init(), b = F.mpz_init(), c = F.mpz_init(), d = F.mpz_init();
const sizes = [1, 2, 5, 7, 8, 13, 14, 20, 50, 70, 100, 200, 300, 500, 700, 1000, 2000, 4000];
for (const da of sizes) for (const db of sizes) {
    const x = rbig(da), y = rbig(db);
    set(a, x); set(b, y);
    eq(`get ${da}`, get(a), x);
    F.mpz_add(c, a, b); eq(`add ${da} ${db}`, get(c), x + y);
    F.mpz_sub(c, a, b); eq(`sub ${da} ${db}`, get(c), x - y);
    F.mpz_mul(c, a, b); eq(`mul ${da} ${db}`, get(c), x * y);
    F.mpz_tdiv_qr(c, d, a, b); eq(`tdiv_q ${da} ${db}`, get(c), x / y); eq(`tdiv_r ${da} ${db}`, get(d), x % y);
    F.mpz_fdiv_qr(c, d, a, b);
    const fq = (x / y) - ((x % y !== 0n && ((x < 0n) !== (y < 0n))) ? 1n : 0n);
    eq(`fdiv_q ${da} ${db}`, get(c), fq); eq(`fdiv_r ${da} ${db}`, get(d), x - fq * y);
    F.mpz_cdiv_qr(c, d, a, b);
    const cq = (x / y) + ((x % y !== 0n && ((x < 0n) === (y < 0n))) ? 1n : 0n);
    eq(`cdiv_q ${da} ${db}`, get(c), cq); eq(`cdiv_r ${da} ${db}`, get(d), x - cq * y);
    eq(`cmp ${da} ${db}`, F.mpz_cmp(a, b), x < y ? -1 : x > y ? 1 : 0);
}
for (const da of sizes) {
    const x = rbig(da); set(a, x);
    F.mpz_mul(c, a, a); eq(`sqr ${da}`, get(c), x * x);
    F.mpz_set(c, a); F.mpz_mul(c, c, c); eq(`sqr alias ${da}`, get(c), x * x);
    F.mpz_set(c, a); F.mpz_add(c, c, c); eq(`add alias ${da}`, get(c), x + x);
    for (const base of [2, 16, 36, 62, -16]) {
        const s = F.mpz_get_str(base, a);
        if (base > 0 && base <= 36) eq(`get_str ${base} ${da}`, s, x.toString(base));
        F.mpz_set_str(d, s, Math.abs(base)); eq(`set_str ${base} ${da}`, get(d), x);
    }
    eq(`sizeinbase10 ${da}`, F.mpz_sizeinbase(a, 10), (x < 0n ? -x : x).toString().length);
    eq(`sizeinbase2 ${da}`, F.mpz_sizeinbase(a, 2), (x < 0n ? -x : x).toString(2).length);
    for (const v of [1, 3, 9999999, 10000000, 123456789, 2 ** 53 - 1]) {
        F.mpz_mul_ui(c, a, v); eq(`mul_ui ${da} ${v}`, get(c), x * BigInt(v));
        eq(`tdiv_ui ${da} ${v}`, F.mpz_tdiv_ui(a, v), Number((x < 0n ? -x : x) % BigInt(v)));
        F.mpz_add_ui(c, a, v); eq(`add_ui ${da} ${v}`, get(c), x + BigInt(v));
    }
}
F.mpz_set_str(a, '0x1F', 0); eq('0x', get(a), 31n);
F.mpz_set_str(a, '  -0b101', 0); eq('0b', get(a), -5n);
F.mpz_set_str(a, '017', 0); eq('octal', get(a), 15n);
F.mpz_set_str(a, '12 345 678', 10); eq('spaces', get(a), 12345678n);
F.mpz_set_si(a, -9007199254740991); eq('set_si', get(a), -9007199254740991n);
eq('get_si', F.mpz_get_si(a), -9007199254740991);
console.log(`${count - fails}/${count} passed`);
process.exit(fails ? 1 : 0);
