// Micro benchmark: cost of each block kind in the real Entry runtime.
import { buildEnt } from '../entbuild.mjs';
import { runEnt } from '../erun.mjs';
const N = Number(process.env.N || 100000);
const tests = {
    empty: '',
    copyLocal: 'x = a;',
    addSmall: 'x = a + b;',
    addBig: 'x = c + d;',
    subBig: 'x = c - d;',
    mulSmall: 'x = a * b;',
    mulMid: 'x = e * e;',
    mulBig: 'x = f * f;',
    divBig: 'x = c / d;',
    idivBig: 'x = idiv(c, f);',
    modBig: 'x = mod(c, f);',
    sqrBig: 'x = sqr(f);',
    listGet: 'x = L[a];',
    listSet: 'L[a] = c;',
    globalGet: 'x = g;',
    globalSet: 'g = c;',
    globalAddSet: 'g = g + a;',
    globalChange: 'g += a;',
    cmp: 'if (c < d) { x = 1; }',
    call2: 'x = fid2(c);',
    call3: 'x = fid3(c, d);',
    callVoid: 'fvoid(c);',
    mac: 'L[a] = L[a] + e * f;',
};
let src = `let done = 0;\nlet g = 0;\nlet L = [];\n${Object.keys(tests).map(k => `let t_${k} = 0;`).join('\n')}\n`;
src += `function fid(v) { return v; }\nfunction fid2(v) { let y = v; return y; }\nfunction fid3(v, w) { let y = v; let z = w; let q = 0; let r = 0; let s = 0; let t = 0; return y + z; }\nfunction fvoid(v) { let y = v; }\n`;
for (const [k, body] of Object.entries(tests)) {
    src += `function b_${k}() {\n let a = 3; let b = 4; let c = 12345678901234; let d = 98765432109; let e = 1234567; let f = 9999999; let x = 0;\n let i = 0;\n let t0 = timer();\n while (i < ${N}) { ${body} i = i + 1; }\n let dt = timer() - t0; if (t_${k} == 0 || dt < t_${k}) { t_${k} = dt; }\n}\n`;
}
src += `on('start', 'main', function () {\n let k = 0; while (k < 10) { L.push(0); k = k + 1; }\n timerStart();\n let rep = 0; while (rep < 4) { ${Object.keys(tests).map(k => `b_${k}();`).join(' ')} rep = rep + 1; }\n done = 1;\n});\n`;
buildEnt('bench/micro.ent', [src]);
const vars = Object.keys(tests).map(k => 't_' + k);
const r = await runEnt('bench/micro.ent', { vars });
if (r.errors.length) console.log(r.errors);
const base = Number(r.vars.t_empty);
for (const k of Object.keys(tests)) { const t = Number(r.vars['t_' + k]); console.log(k.padEnd(14), (t * 1e9 / N).toFixed(0).padStart(6), 'ns/iter', ((t - base) * 1e9 / N).toFixed(0).padStart(6), 'ns net'); }
