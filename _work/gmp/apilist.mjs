// The public functions (GMP names) with their kind: value block or command block
import { compileProgram } from './ejs.mjs';
import { libSources } from './lib.mjs';
import fs from 'node:fs';
const srcs = libSources();
const prog = compileProgram(srcs);
const text = srcs.join('\n');
const out = [];
for (const f of prog.functions) {
    const c = JSON.parse(f.content)[0][0];
    const name = c.params[0].params[0];
    if (!/^(mpz|mpq|mpf|gmp)_/.test(name) || /^(mpz_mul_abs|mpz_sqr_abs|mpz_divrem_abs|mpz_div_any|mpz_aors|mpz_mul_small|mpz_bits_exact|mpf_aors|mpf_load|mpf_top|mpf_round|mpf_int|mpf_setup|mpf_newton_start|mpf_div_newton|mpf_sqrt_newton|mpf_div_school|mpf_sqrt_school|mpq_aors|gmp_setup|mpz_mul_big|mpz_divrem_newton|mpz_droplow|mpz_shrink|mpf_clear_keep|gmp_zero|gmp_compact_if)$/.test(name)) continue;
    const m = text.match(new RegExp('function ' + name + '\\(([^)]*)\\)'));
    out.push({ name, params: m ? m[1] : '', value: f.type === 'value' });
}
out.sort((a, b) => a.name.localeCompare(b.name));
if (process.argv[2] === 'md') {
    for (const g of ['mpz', 'mpq', 'mpf', 'gmp']) {
        const xs = out.filter(o => o.name.startsWith(g + '_'));
        console.log(`\n### ${g} — ${xs.length}개\n`);
        console.log('- 명령 블록: ' + xs.filter(o => !o.value).map(o => `\`${o.name}(${o.params})\``).join(', '));
        console.log('- 값 블록: ' + xs.filter(o => o.value).map(o => `\`${o.name}(${o.params})\``).join(', '));
    }
} else console.log(out.length, out.filter(o => o.value).length);
