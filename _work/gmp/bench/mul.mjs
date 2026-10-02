// mpz_mul timing by size in real Entry, for Karatsuba thresholds
import { libSources } from '../lib.mjs';
import { buildEnt } from '../entbuild.mjs';
import { runEnt } from '../erun.mjs';
const SIZES = (process.env.SIZES || '32,48,64,96,128,192,256,384').split(',').map(Number);
const extra = process.env.EXTRA || '';
let src = `let done = 0;\n${SIZES.map(n => `let tm${n} = 0; let ts${n} = 0;`).join('\n')}\n`;
src += `function rnd_fill(h, n) { _mpz_realloc(h, n); let k = 0; while (k < n) { M[zP[h] + k] = rand(0, 9999999); k = k + 1; } M[zP[h] + n - 1] = rand(1, 9999999); zN[h] = n; }\n`;
src += `on('start', 'main', function () {\n ${extra}\n let a = mpz_init(); let b = mpz_init(); let c = mpz_init();\n`;
for (const n of SIZES) {
    const reps = Math.max(1, Math.round(20000 / (n * n)));
    src += ` rnd_fill(a, ${n}); rnd_fill(b, ${n}); mpz_mul(c, a, b);\n let t${n} = timer(); let q${n} = 0; while (q${n} < ${reps}) { mpz_mul(c, a, b); q${n} = q${n} + 1; } tm${n} = (timer() - t${n}) / ${reps};\n`;
    src += ` t${n} = timer(); q${n} = 0; while (q${n} < ${reps}) { mpz_mul(c, a, a); q${n} = q${n} + 1; } ts${n} = (timer() - t${n}) / ${reps};\n`;
}
src += ` done = 1;\n});\n`;
buildEnt('bench/mul.ent', libSources([src]));
const r = await runEnt('bench/mul.ent', { vars: SIZES.flatMap(n => ['tm' + n, 'ts' + n]), timeout: 1800000 });
if (process.env.MD) { console.log('| 자리(limb) | 10진 자릿수 | 곱셈 | 제곱 |\n|---|---|---|---|'); for (const n of SIZES) console.log(`| ${n} | ${n * 7} | ${(r.vars['tm' + n] * 1000).toFixed(1)} ms | ${(r.vars['ts' + n] * 1000).toFixed(1)} ms |`); process.exit(0); }
console.log(extra || 'default', r.errors.slice(0, 2));
for (const n of SIZES) console.log(String(n).padStart(4), 'limbs  mul', (r.vars['tm' + n] * 1000).toFixed(1).padStart(8), 'ms  sqr', (r.vars['ts' + n] * 1000).toFixed(1).padStart(8), 'ms   mul/n^2', (r.vars['tm' + n] * 1e6 / n / n).toFixed(2), 'us');
