// The library's EJS sources, in order, and a Node runtime for them.
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { compileToJS, compileProgram } from './ejs.mjs';
import { kernelSource } from './kernels.mjs';
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
export const LIB_FILES = ['mpn.js', 'kara.js', 'mpz.js', 'numth.js', 'mpf.js', 'mpq.js', 'setup.js'];
export function libSources(extra = []) {
    return [...LIB_FILES.map(f => fs.readFileSync(path.join(HERE, 'src', f), 'utf8')), kernelSource(), ...extra];
}
const isNum = (v) => typeof v === 'number' || (typeof v === 'string' && /^-?\d+\.?\d*$/.test(v));
// Entry-like builtins (substring and char_at throw out of range, as Entry)
export function makeBuiltins(R) {
    return {
        idiv: (a, b) => Math.floor(a / b), mod: (a, b) => a - b * Math.floor(a / b),
        sqr: (v) => v * v,
        str: (...a) => a.join(''), strlen: (s) => String(s).length,
        substr: (s, a, b) => { s = String(s); const st = (parseFloat(a) || 0) - 1, en = (parseFloat(b) || 0) - 1, L = s.length - 1; if (st < 0 || en < 0 || st > L || en > L) throw new Error(`substring ${a}..${b} of ${s.length}`); return s.substring(Math.min(st, en), Math.max(st, en) + 1); },
        charAt: (s, i) => { s = String(s); const k = (parseFloat(i) || 0) - 1; if (k < 0 || k > s.length - 1) throw new Error(`char_at ${i} of ${s.length}`); return s[k]; },
        indexOf: (s, sub) => String(s).indexOf(String(sub)) + 1,
        rand: (a, b) => Math.floor(+a + Math.random() * (b - a + 1)),
        timer: () => performance.now() / 1000, timerStart: () => { }, timerReset: () => { }, waitSec: () => { }, timerHide: () => { },
    };
}
// value: an object with every function and R.peek/poke for globals
export function loadLib(extra = []) {
    const srcs = libSources(extra);
    compileProgram(srcs);                       // the Entry backend must accept it too
    const js = compileToJS(srcs);
    const R = { handlers: [], $i: 0 };
    const check = (A, i, name) => { if (!(i >= 1 && i <= A.length) || Math.floor(i) !== i) throw new Error(`list ${name || '?'} index ${i} out of range (len ${A.length})`); };
    Object.assign(R, {
        get: (A, i, name) => { check(A, i, name); return A[i - 1]; },
        set: (A, i, v, name) => { check(A, i, name); A[i - 1] = v; },
        removeAt: (A, i) => { check(A, i); A.splice(i - 1, 1); },
        insertAt: (A, i, v) => { A.splice(i - 1, 0, v); },
        // Entry's calc_basic PLUS: text unless both look like numbers
        add: (a, b) => (isNum(a) && isNum(b)) ? (parseFloat(a) || 0) + (parseFloat(b) || 0) : String(a) + String(b),
        cmp: (op, a, b) => {
            if (typeof a === 'string' && a.length && !isNaN(Number(a))) a = Number(a);
            if (typeof b === 'string' && b.length && !isNaN(Number(b))) b = Number(b);
            switch (op) { case 0: return a === b; case 1: return a != b; case 2: return a < b; case 3: return a > b; case 4: return a <= b; case 5: return a >= b; }
        },
        mod: (a, b) => a - b * Math.floor(a / b),
        and: (a, b) => !!(a && b), or: (a, b) => !!(a || b), s: (v) => String(v),
        on: (ev, obj, gen) => R.handlers.push({ ev, obj, gen }),
    });
    const B = makeBuiltins(R);
    const names = Object.keys(B);
    const fnNames = [...js.matchAll(/^function (\w+)\(/gm)].map(m => m[1]);
    new Function('R', ...names, js + `\nR.fn = {${fnNames.join(',')}};\nreturn R;`)(R, ...names.map(n => B[n]));
    return R;
}
