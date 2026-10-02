// number theory against BigInt
import { loadLib } from '../lib.mjs';
const R = loadLib();
const F = R.fn;
R.poke('mp_poison', Number(process.env.POISON || 9999991));
if (process.env.MULP) R.poke('MUL_PIECE', Number(process.env.MULP));
if (process.env.KARA) { R.poke('KARA_MIN', Number(process.env.KARA)); R.poke('KARA_SQR_MIN', Number(process.env.KARA)); R.poke('KARA_BASE_MAX', Number(process.env.KBASE || 16)); }
let seed = 777;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const rbig = (digits) => { let s = String(1 + Math.floor(rnd() * 9)); for (let i = 1; i < digits; i++) s += Math.floor(rnd() * 10); return BigInt(s); };
const set = (h, v) => F.mpz_set_str(h, v.toString(), 10);
const get = (h) => BigInt(F.mpz_get_str(10, h));
let fails = 0, count = 0;
const eq = (what, got, want) => { count++; if (got !== want) { fails++; if (fails < 15) console.log('FAIL', what, '\n got ', String(got).slice(0, 200), '\n want', String(want).slice(0, 200)); } };
const modpow = (b, e, m) => { let r = 1n; b %= m; while (e > 0n) { if (e & 1n) r = r * b % m; b = b * b % m; e >>= 1n; } return r; };
const isqrt = (n) => { if (n < 2n) return n; let x = 1n << BigInt(Math.ceil(n.toString(2).length / 2) + 1); let y; for (;;) { y = (x + n / x) >> 1n; if (y >= x) break; x = y; } return x; };
const gcd = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; };
const a = F.mpz_init(), b = F.mpz_init(), c = F.mpz_init(), d = F.mpz_init(), m = F.mpz_init();
for (const dm of [1, 3, 7, 8, 9, 14, 15, 30, 60, 100, 150, 300, 400]) for (const db of [1, 5, 20, 50]) {
    const x = rbig(db), y = rbig(dm) + (dm > 1 ? 1n : 0n), e = rbig(Math.max(1, Math.min(dm, 60)));
    set(a, x); set(m, y); set(b, e);
    F.mpz_powm(c, a, b, m); eq(`powm ${db} ${dm}`, get(c), modpow(x, e, y));
}
for (const dd of [1, 2, 5, 13, 14, 15, 28, 29, 50, 100, 200, 500, 1000]) {
    const x = rbig(dd); set(a, x);
    F.mpz_sqrtrem(c, d, a); const s = isqrt(x); eq(`sqrt ${dd}`, get(c), s); eq(`sqrtrem ${dd}`, get(d), x - s * s);
    const y = rbig(Math.max(1, dd >> 1)); set(b, y);
    F.mpz_gcd(c, a, b); eq(`gcd ${dd}`, get(c), gcd(x, y));
    F.mpz_set_str(b, (y * 6n).toString(), 10); F.mpz_mul_ui(a, a, 6); F.mpz_gcd(c, a, b); eq(`gcd6 ${dd}`, get(c), gcd(x * 6n, y * 6n));
    F.mpz_gcdext(c, d, m, a, b); eq(`gcdext ${dd}`, get(d) * x * 6n + get(m) * y * 6n, get(c));
    set(a, x); F.mpz_root(c, a, 3); let r3 = 1n << BigInt(Math.ceil(x.toString(2).length / 3) + 1); for (;;) { const y3 = (2n * r3 + x / (r3 * r3)) / 3n; if (y3 >= r3) break; r3 = y3; }
    eq(`root3 ${dd}`, get(c), r3);
}
// primes
const knownP = ['2', '3', '97', '7919', '1000003', '2147483647', '1000000007', '999999999989', '2305843009213693951',
    '170141183460469231731687303715884105727', '618970019642690137449562111',
    '6864797660130609714981900799081393217269435300143305409394463459185543183397656052122559640661454554977296311391480858037121987999716643812574028291115057151'];
const knownC = ['1', '0', '4', '561', '1105', '3215031751', '2047', '1373653', '25326001', '341550071728321', '999999999999', '2305843009213693953',
    '170141183460469231731687303715884105729', String(2n ** 127n - 1n) + '1'];
for (const p of knownP) { F.mpz_set_str(a, p, 10); eq(`prime ${p.slice(0, 30)}`, F.mpz_probab_prime_p(a, 25) > 0, true); }
for (const p of knownC) { F.mpz_set_str(a, p, 10); eq(`composite ${p.slice(0, 30)}`, F.mpz_probab_prime_p(a, 25), 0); }
// against a sieve
const N = 5000; const sv = new Uint8Array(N + 1).fill(1); sv[0] = sv[1] = 0; for (let i = 2; i * i <= N; i++) if (sv[i]) for (let j = i * i; j <= N; j += i) sv[j] = 0;
for (let i = 0; i <= N; i++) { F.mpz_set_si(a, i); eq(`sieve ${i}`, F.mpz_probab_prime_p(a, 10) > 0, sv[i] === 1); }
F.mpz_set_str(a, '1000000000000000000000', 10); F.mpz_nextprime(c, a); eq('nextprime', get(c), 1000000000000000000117n);
F.mpz_fac_ui(c, 100); let f = 1n; for (let i = 2n; i <= 100n; i++) f *= i; eq('fac 100', get(c), f);
F.mpz_fac_ui(c, 1000); f = 1n; for (let i = 2n; i <= 1000n; i++) f *= i; eq('fac 1000', get(c), f);
F.mpz_fib_ui(c, 1000); let [p0, p1] = [0n, 1n]; for (let i = 0; i < 1000; i++) [p0, p1] = [p1, p0 + p1]; eq('fib 1000', get(c), p0);
F.mpz_set_si(a, 100); F.mpz_bin_ui(c, a, 50); let bn = 1n; for (let i = 1n; i <= 50n; i++) bn = bn * (101n - i) / i; eq('bin', get(c), bn);
F.mpz_ui_pow_ui(c, 7, 300); eq('pow', get(c), 7n ** 300n);
F.mpz_set_si(a, 3); F.mpz_set_str(m, '1000000007', 10); eq('invert ok', F.mpz_invert(c, a, m), 1); eq('invert', get(c) * 3n % 1000000007n, 1n);
F.mpz_set_si(a, 1001); F.mpz_set_si(m, 9907); eq('jacobi', F.mpz_jacobi(a, m), -1);
F.mpz_set_si(a, 19); F.mpz_set_si(m, 45); eq('jacobi2', F.mpz_jacobi(a, m), 1);
const st = F.gmp_randinit_default(); F.gmp_randseed_ui(st, 42); set(m, 10n ** 50n);
let okr = true; for (let i = 0; i < 20; i++) { F.mpz_urandomm(c, st, m); const v = get(c); if (v < 0n || v >= 10n ** 50n) okr = false; } eq('urandomm', okr, true);
F.mpz_urandomb(c, st, 100); eq('urandomb', get(c) < 2n ** 100n, true);
F.mpz_set_str(a, '1267650600228229401496703205376', 10); eq('perfect power', F.mpz_perfect_power_p(a), 1);
F.mpz_set_str(a, (12345678901234567n ** 2n).toString(), 10); eq('perfect square', F.mpz_perfect_square_p(a), 1);
F.mpz_add_ui(a, a, 1); eq('not square', F.mpz_perfect_square_p(a), 0);
console.log(`${count - fails}/${count} passed`);
process.exit(fails ? 1 : 0);
