// Node simulator: runs the very same EJS program (JS backend) with Entry-like
// builtins, feeds a prompt, and reports the generated text, the top-k logits of
// each step and timings.  node sim.mjs "Once upon a time" [maxNew] [--greedy]
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { buildProject } from './build.mjs';
import { compileToJS, compileProgram } from './ejs.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));

export function createSim({ prompt = 'Once upon a time', maxNew = 8, greedy = true, layers } = {}) {
    const B = buildProject();
    const consts = B.consts;
    compileProgram(B.src, { consts });   // syntax check with the real backend
    const js = Object.entries(consts).map(([k, v]) => 'const ' + k + '=' + JSON.stringify(v) + ';').join('\n') + '\n' + compileToJS(B.src);
    const data = { ...B.lists };
    const R = { handlers: [], $i: 0, data };
    const isNum = (v) => typeof v === 'number' || (typeof v === 'string' && /^-?\d+\.?\d*$/.test(v));
    const check = (A, i, name) => { if (!(i >= 1 && i <= A.length) || Math.floor(i) != i) throw new Error(`list ${name || '?'} index ${i} out of range (len ${A.length})`); };
    Object.assign(R, {
        get: (A, i, name) => { check(A, i, name); return A[i - 1]; },
        set: (A, i, v, name) => { check(A, i, name); A[i - 1] = v; },
        removeAt: (A, i) => { check(A, i); A.splice(i - 1, 1); },
        insertAt: (A, i, v) => { A.splice(i - 1, 0, v); },
        // Entry calc_basic PLUS: numbers add, anything failing isNumber concatenates
        add: (a, b) => {
            let l = parseFloat(a) || 0, r = parseFloat(b) || 0;
            if (!isNum(a)) l = a; if (!isNum(b)) r = b;
            return (typeof l === 'number' && typeof r === 'number') ? l + r : String(l) + String(r);
        },
        mod: (a, b) => a - b * Math.floor(a / b),
        and: (a, b) => !!(a && b), or: (a, b) => !!(a || b), s: (v) => String(v),
        on: (ev, obj, gen) => R.handlers.push({ ev, obj, gen }),
    });
    const texts = {};
    let curObj = '';
    const t0 = Date.now();
    let asks = 0;
    const B2 = {
        sind: (d) => Math.sin(d * Math.PI / 180), cosd: (d) => Math.cos(d * Math.PI / 180),
        mod: R.mod, idiv: (a, b) => Math.floor(a / b), frac: (v) => v - Math.floor(v),
        rand: (a, b) => Math.floor(Math.random() * (b - a + 1) + a),
        str: (...a) => a.reduce((x, y) => x + String(y), ''),
        indexOf: (s, sub) => String(s).indexOf(String(sub)) + 1,
        charAt: (s, i) => { s = String(s); if (i < 1 || i > s.length) throw new Error('charAt range ' + i); return s[i - 1]; },
        strlen: (s) => String(s).length,
        substr: (s, a, b) => { s = String(s); const st = a - 1, en = b - 1; if (st < 0 || en < 0 || st > s.length - 1 || en > s.length - 1) throw new Error(`substr range ${a},${b} of ${s.length}`); return s.substring(Math.min(st, en), Math.max(st, en) + 1); },
        sq: (v) => v * v,
        timer: () => (Date.now() - t0) / 1000, timerStart: () => { }, timerReset: () => { },
        write: (t) => { texts[curObj] = String(t); },
        ask: () => { if (++asks > 1) throw new Error('STOP'); }, answer: () => prompt,
        waitSec: () => { }, say: () => { },
    };
    const names = Object.keys(B2);
    new Function('R', ...names, js + '\nreturn R;')(R, ...names.map(n => B2[n]));
    for (const [k, v] of Object.entries(B.bigStrings)) R.poke(k, v);
    return { R, B, texts, setObj: (o) => { curObj = o; } };
}

if (process.argv[1] && import.meta.url === url.pathToFileURL(path.resolve(process.argv[1])).href) {
    const prompt = process.argv[2] || 'Once upon a time';
    const maxNew = Number(process.argv[3] || 8);
    const S = createSim({ prompt, maxNew });
    const { R } = S;
    R.poke('maxNew', maxNew);
    if (process.argv.includes('--greedy')) { R.poke('temp', 0); R.poke('repPen', 1); }
    const main = R.handlers.find(h => h.obj === 'llm').gen();
    S.setObj('llm');
    const t0 = Date.now();
    // run until the program asks for the second prompt
    let asked = 0;
    try { for (let step = 0; step < 1e7; step++) { if (main.next().done) break; } }
    catch (e) { if (e.message !== 'STOP') throw e; }
    console.log('prompt tokens', JSON.stringify(R.peek('TOKS')));
    console.log('TOP', JSON.stringify(R.peek('TOPI').slice(0, 10)), JSON.stringify(R.peek('TOPV').slice(0, 10).map(v => +v.toFixed(3))));
    console.log('OUT:', JSON.stringify(R.peek('outText')));
    console.log('time', (Date.now() - t0) / 1000, 's');
}
