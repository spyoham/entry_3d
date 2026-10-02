// Shared micro-benchmark harness: each test is an EJS function body run REPS
// times (min wall time kept); the prelude declares lists and helpers.
import { buildEnt } from '../entbuild.mjs';
import { runEnt } from '../erun.mjs';
export async function bench(name, prelude, tests, { reps = 4, init = '' } = {}) {
    const keys = Object.keys(tests);
    let src = `let done = 0;\n${keys.map(k => `let t_${k} = 0;`).join('\n')}\n${prelude}\n`;
    for (const k of keys) src += `function b_${k}() {\n let t0 = timer();\n ${tests[k]}\n let dt = timer() - t0; if (t_${k} == 0 || dt < t_${k}) { t_${k} = dt; }\n}\n`;
    src += `on('start', 'main', function () {\n ${init}\n let rep = 0; while (rep < ${reps}) { ${keys.map(k => `b_${k}();`).join(' ')} rep = rep + 1; }\n done = 1;\n});\n`;
    buildEnt(`bench/${name}.ent`, [src]);
    const r = await runEnt(`bench/${name}.ent`, { vars: keys.map(k => 't_' + k) });
    if (r.errors.length) console.log(r.errors.slice(0, 5));
    const out = {};
    for (const k of keys) out[k] = Number(r.vars['t_' + k]);
    return out;
}
