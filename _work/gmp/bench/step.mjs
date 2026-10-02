// Run small steps in real Entry, a frame apart, recording each result in a
// list; compare with the JS backend. usage: node bench/step.mjs
import { libSources, loadLib } from '../lib.mjs';
import { buildEnt } from '../entbuild.mjs';
import { runEnt } from '../erun.mjs';
import fs from 'node:fs';
const demo = fs.readFileSync(new URL('../src/demo_calc.js', import.meta.url), 'utf8');
const steps = [
    `a = mpz_init(); b = mpz_init(); c = mpz_init(); OUT.push(a);`,
    `mpz_set_str(a, '123456789012345678901234567890', 10); OUT.push(mpz_get_str(10, a));`,
    `mpz_set_si(b, 987654321); mpz_mul(c, a, b); OUT.push(mpz_get_str(10, c));`,
    `mpz_mul(c, a, a); OUT.push(mpz_get_str(10, c));`,
    `mpz_tdiv_q(c, c, b); OUT.push(mpz_get_str(10, c));`,
    `mpz_set_str(b, '98765432109876543', 10); mpz_tdiv_qr(c, a, c, b); OUT.push(mpz_get_str(10, c)); OUT.push(mpz_get_str(10, a));`,
    `mpz_sqrt(c, c); OUT.push(mpz_get_str(10, c));`,
    `OUT.push(mpz_get_str(16, c));`,
    `f = mpf_init2(200); mpf_sqrt_ui(f, 2); OUT.push(mpf_get_str(10, 40, f));`,
    `pi_compute(30); OUT.push(pi_str);`,
    `mpz_ui_pow_ui(a, 2, 127); mpz_sub_ui(a, a, 1); OUT.push(mpz_get_str(10, a));`,
    `mpz_set_si(b, 3); mpz_powm(c, b, a, a); OUT.push(mpz_get_str(10, c));`,
    `OUT.push(mpz_probab_prime_p(a, 5));`,
];
let src = `let done = 0; let a = 0; let b = 0; let c = 0; let f = 0; let OUT = [];\non('start', 'main', function () {\n`;
for (const s of steps) src += ` ${s}\n`;
src += ` done = 1;\n});\n`;
const js = src.replace(/waitSec\(0\.02\);/g, '');
buildEnt('bench/step.ent', libSources([demo, src]));
// JS reference
const R = loadLib([demo, src]);
const gen = R.handlers[0].gen(); while (!gen.next().done) ;
const want = R.peek('OUT');
const r = await runEnt('bench/step.ent', { lists: ['OUT'], timeout: Number(process.env.TO || 120000) });
console.log('done', r.done, r.ms, 'ms', r.errors.slice(0, 3));
const got = r.vars.OUT || [];
for (let i = 0; i < want.length; i++) console.log(String(got[i]) === String(want[i]) ? 'OK  ' : 'DIFF', i, String(got[i]).slice(0, 80), String(got[i]) === String(want[i]) ? '' : ' want ' + String(want[i]).slice(0, 80));
