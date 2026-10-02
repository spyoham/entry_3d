import { loadLib } from '../lib.mjs';
const R = loadLib(); const F = R.fn;
const modpow = (b, e, m) => { let r = 1n; b %= m; while (e > 0n) { if (e & 1n) r = r * b % m; b = b * b % m; e >>= 1n; } return r; };
const isPrimeBig = (n) => { if (n < 2n) return false; for (const p of [2n,3n,5n,7n,11n,13n,17n,19n,23n,29n,31n,37n]) { if (n % p === 0n) return n === p; }
  let d = n - 1n, s = 0; while (!(d & 1n)) { d >>= 1n; s++; }
  for (const a of [2n,3n,5n,7n,11n,13n,17n,19n,23n,29n,31n,37n,41n]) { let x = modpow(a, d, n); if (x === 1n || x === n - 1n) continue; let ok = false; for (let i = 1; i < s; i++) { x = x * x % n; if (x === n - 1n) { ok = true; break; } } if (!ok) return false; } return true; };
let fails = 0, count = 0;
const a = F.mpz_init();
const chk = (n, reps = 25) => { F.mpz_set_str(a, n.toString(), 10); const got = F.mpz_probab_prime_p(a, reps) > 0; count++; if (got !== isPrimeBig(n)) { fails++; if (fails < 10) console.log('FAIL', n, got); } };
for (let n = 1000000n; n < 1030000n; n++) chk(n);
for (let n = 10n ** 18n; n < 10n ** 18n + 3000n; n++) chk(n);
for (let n = 2n ** 64n - 2000n; n < 2n ** 64n + 2000n; n++) chk(n);
// semiprimes and Carmichael numbers
const ps = [1000000007n, 998244353n, 1000000000039n, 2305843009213693951n, 170141183460469231731687303715884105727n];
for (const p of ps) for (const q of ps) chk(p * q);
for (const c of [561n, 41041n, 825265n, 321197185n, 5394826801n, 232250619601n, 9746347772161n, 1436697831295441n, 60977817398996785n, 7156857700403137441n, 1791562810662585767521n, 87674969936234821377601n, 6553130926752006031481761n, 1590231231043178376951698401n])
    chk(c);
// strong pseudoprimes to base 2 (must be caught by Lucas)
for (const c of [2047n, 3277n, 4033n, 4681n, 8321n, 15841n, 29341n, 42799n, 49141n, 52633n, 65281n, 74665n, 80581n, 85489n, 88357n, 90751n, 1194649n, 12327121n, 3825123056546413051n])
    chk(c);
for (const reps of [1, 10, 30, 50]) chk(2n ** 127n - 1n, reps);
console.log(`${count - fails}/${count} passed`);
process.exit(fails ? 1 : 0);
