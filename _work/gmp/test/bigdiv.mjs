// big operands (past what fits in S at once) against BigInt: division, products, squares, powm
import { loadLib } from '../lib.mjs';
const R = loadLib();
const F = R.fn;
R.poke('mp_poison', Number(process.env.POISON || 9999991));
let seed = 777;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const rbig = (digits) => { let s = String(1 + Math.floor(rnd() * 9)); for (let i = 1; i < digits; i++) s += Math.floor(rnd() * 10); return BigInt(s); };
const set = (h, v) => F.mpz_set_str(h, v.toString(), 10);
const get = (h) => BigInt(F.mpz_get_str(10, h));
let fails = 0, count = 0;
const eq = (what, got, want) => { count++; if (got !== want) { fails++; if (fails < 10) console.log('FAIL', what, '\n got ', String(got).slice(0, 80), '\n want', String(want).slice(0, 80)); } };
const a = F.mpz_init(), b = F.mpz_init(), q = F.mpz_init(), r = F.mpz_init();
const fdiv = (x, y) => { let qq = x / y; if ((x % y !== 0n) && ((x < 0n) !== (y < 0n))) qq -= 1n; return qq; };
const cdiv = (x, y) => { let qq = x / y; if ((x % y !== 0n) && ((x < 0n) === (y < 0n))) qq += 1n; return qq; };
const cases = process.env.CASES ? JSON.parse(process.env.CASES) : (process.env.QUICK ? [[20000, 3000], [9000, 8990]] : [[20000, 5], [20000, 100], [20000, 3000], [20000, 17000], [35000, 18000], [17600, 17590], [12000, 400]]);
for (const [na, nb] of cases) {
    for (const sg of [[1n, 1n], [-1n, 1n], [1n, -1n], [-1n, -1n]]) {
        const x = sg[0] * rbig(na), y = sg[1] * rbig(nb);
        set(a, x); set(b, y);
        const t0 = Date.now();
        F.mpz_tdiv_qr(q, r, a, b); eq(`tdiv q ${na}/${nb}`, get(q), x / y); eq(`tdiv r ${na}/${nb}`, get(r), x % y);
        F.mpz_fdiv_qr(q, r, a, b); eq(`fdiv q ${na}/${nb}`, get(q), fdiv(x, y)); eq(`fdiv r`, get(r), x - fdiv(x, y) * y);
        F.mpz_cdiv_q(q, a, b); eq(`cdiv q ${na}/${nb}`, get(q), cdiv(x, y));
        F.mpz_mod(r, a, b); const m = ((x % y) + (y < 0n ? -y : y)) % (y < 0n ? -y : y); eq(`mod`, get(r), m);
        F.mpz_mul(q, a, b); eq(`mul ${na}x${nb}`, get(q), x * y);
        F.mpz_mul(q, a, a); eq(`sqr ${na}`, get(q), x * x);
        F.mpz_set(r, a); F.mpz_tdiv_q(r, r, b); eq(`alias q`, get(r), x / y);
        if (sg[0] > 0n && sg[1] > 0n) console.log(na, nb, Date.now() - t0, 'ms');
    }
}
// powm with a modulus too long for Barrett in S
for (const md of [900, 1500]) {
    const m = rbig(md) | 1n, bb = rbig(md - 3), e = rbig(30);
    set(a, bb); set(b, m); const E = F.mpz_init(); set(E, e);
    const t0 = Date.now();
    F.mpz_powm(r, a, E, b);
    let w = 1n, base = bb % m, ee = e; while (ee > 0n) { if (ee & 1n) w = w * base % m; base = base * base % m; ee >>= 1n; }
    eq(`powm ${md}`, get(r), w);
    console.log('powm', md, Date.now() - t0, 'ms');
}
// prime tests with n too long for Barrett / Lucas in S
for (const [p, want] of [[4423, 1], [4421, 0]]) {
    const n = (1n << BigInt(p)) - 1n;
    set(a, n);
    const t0 = Date.now();
    eq(`prime M${p}`, F.mpz_probab_prime_p(a, 25), want);
    console.log('prime M' + p, Date.now() - t0, 'ms');
}
console.log(`${count - fails}/${count} passed`);
process.exit(fails ? 1 : 0);
