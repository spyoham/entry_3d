import fs from 'node:fs';
import { loadLib } from '../lib.mjs';
const R = loadLib([fs.readFileSync(new URL('../src/demo_calc.js', import.meta.url), 'utf8')]);
const F = R.fn;
R.poke('mp_poison', Number(process.env.POISON || 9999991));
// reference: Machin with BigInt
const refPi = (n) => { const S = 10n ** BigInt(n + 20); const at = (x) => { let s = 0n, t = S / x, k = 1n, sg = 1n; const x2 = x * x; while (t) { s += sg * t / k; t /= x2; k += 2n; sg = -sg; } return s; }; const p = 4n * (4n * at(5n) - at(239n)); const st = p.toString(); return st[0] + '.' + st.slice(1, n + 1); };
let fails = 0;
for (const n of (process.env.PI_N ? process.env.PI_N.split(',').map(Number) : [10, 50, 100, 333, 1000, 3000])) {
    const t = Date.now();
    F.pi_compute(n);
    const got = R.peek('pi_str');
    const want = refPi(n);
    console.log(n, got === want ? 'OK' : 'FAIL', Date.now() - t, 'ms', got.slice(0, 20), got.slice(-10));
    if (got !== want) { fails++; console.log(' got ', got.slice(-40), '\n want', want.slice(-40)); }
}
process.exit(fails ? 1 : 0);
