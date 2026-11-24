// Node simulator: the same EJS program through the JS backend. No drawing - the
// work only writes text - so the text boxes are strings and `ask` takes the
// next of the queued answers.
import { compileToJS } from './ejs.mjs';
import { sources, consts, M } from './build.mjs';

export function createSim() {
    const js = Object.entries(consts).map(([k, v]) => `const ${k}=${JSON.stringify(v)};`).join('\n') + '\n' + compileToJS([sources()]);
    const answers = [];
    let lastAnswer = 0, cur = null, asking = false;
    const comparable = (v) => (typeof v === 'string' && v.length && !isNaN(Number(v)) ? Number(v) : v);
    const isNum = (v) => typeof v === 'number' || (typeof v === 'string' && /^-?\d+\.?\d*$/.test(v));
    const check = (A, i, name) => { if (!(i >= 1 && i <= A.length) || Math.floor(i) !== i) throw new Error(`list ${name || '?'} index ${i} out of range (len ${A.length})`); };
    const str = (s) => String(s);
    const R = {
        handlers: [], $i: 0, self: null, data: { M },
        get: (A, i, name) => { check(A, i, name); return A[i - 1]; },
        set: (A, i, v, name) => { check(A, i, name); A[i - 1] = v; },
        push: (A, v) => { A.push(v); if (A.length > 5000) throw new Error('a list grew past 5000 items'); },
        add: (a, b) => (isNum(a) && isNum(b)) ? Number(a) + Number(b) : String(a) + String(b),
        div: (a, b) => a / b,
        mod: (a, b) => a - b * Math.floor(a / b),
        cmp: (op, a, b) => { a = comparable(a); b = comparable(b); switch (op) { case 0: return a === b; case 1: return a != b; case 2: return a < b; case 3: return a > b; case 4: return a <= b; default: return a >= b; } },
        and: (a, b) => !!(a && b), or: (a, b) => !!(a || b), s: (v) => String(v),
        on: (ev, obj, gen) => R.handlers.push({ ev, obj, gen }),
        repN: (n) => { if (!(n >= 0)) throw new Error('repeat count ' + n); return n; },
    };
    const B = {
        idiv: (a, b) => Math.floor(a / b), mod: R.mod,
        strlen: (s) => str(s).length,
        substr: (s, a, b) => { s = str(s); const st = a - 1, en = b - 1, L = s.length - 1; if (!(st >= 0 && en >= 0 && st <= L && en <= L)) throw new Error(`substring ${a}..${b} of ${s.length}`); return s.substring(Math.min(st, en), Math.max(st, en) + 1); },
        charAt: (s, i) => { s = str(s); const k = i - 1; if (!(k >= 0 && k <= s.length - 1)) throw new Error(`char_at ${i} of ${s.length}`); return s[k]; },
        indexOf: (s, sub) => str(s).indexOf(str(sub)) + 1,
        str: (...a) => a.join(''),
        hideAnswer: () => { },
        // (as Entry: an empty answer does not end the question)
        ask: () => { asking = true; }, answer: () => lastAnswer,
        write: (t) => { cur.text = String(t); },
    };
    const names = Object.keys(B);
    const fnNames = [...js.matchAll(/^function (\w+)\(/gm)].map(m => m[1]);
    // `ask` waits: the handler's generator yields until an answer is there
    const body = js.replace(/\bask\(([^;]*)\);/g, 'ask($1); while (R.waiting()) yield;');
    R.waiting = () => { if (answers.length) { lastAnswer = answers.shift(); asking = false; return false; } return true; };
    new Function('R', ...names, body + `\nR.fn = {${fnNames.join(',')}};\nreturn R;`)(R, ...names.map(n => B[n]));
    const objs = {};
    const threads = [];
    for (const h of R.handlers) { objs[h.obj] ||= { text: '' }; if (h.ev === 'start') threads.push({ ent: objs[h.obj], g: h.gen() }); }
    return {
        R, fn: R.fn, answers, objs,
        get asking() { return asking && !answers.length; },
        frame() { for (const t of threads) { cur = t.ent; t.g.next(); } },
        peek: (n) => R.peek(n), poke: (n, v) => R.poke(n, v),
        text: (obj) => objs[obj].text,
        // one sentence straight through the coder (no stage)
        compress(text) {
            const { fn } = R, S = consts.SYMS;
            fn.encBegin(text.length);
            for (const c of text) { const i = S.indexOf(c) + 1; if (!i) throw new Error('letter ' + c); fn.encChar(i); }
            fn.encEnd();
            fn.flushWord();
            return { code: R.peek('out'), bits: R.peek('encBits'), bin: String(R.peek('encBin')), words: R.peek('wl') };
        },
        // (bits: a text of 0s and 1s instead of the code in six-bit letters)
        restore(code, bits = false) {
            if (bits) R.fn.bitsToCode(code); else R.poke('src', code);
            R.fn.decBegin();
            const n = R.peek('decN');
            if (n > consts.MAXN) return null;
            for (let i = 0; i < n; i++) R.fn.decChar();
            return String(R.peek('dec'));
        },
    };
}
