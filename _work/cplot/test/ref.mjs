// A reference: complex arithmetic and a formula reader written apart from the
// EJS sources (plain doubles, Math.*), to compare the work against.
// (no negative zeros: Entry's numbers come out of BigNumber without one, so ln(-1) is +i pi)
export const C = (re, im = 0) => ({ re: re + 0, im: im + 0 });
export const add = (a, b) => C(a.re + b.re, a.im + b.im);
export const sub = (a, b) => C(a.re - b.re, a.im - b.im);
export const mul = (a, b) => C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
export const div = (a, b) => {
    if (b.re === 0 && b.im === 0) return (a.re === 0 && a.im === 0) ? C(NaN, NaN) : C(Infinity, 0);
    if (Math.abs(b.re) >= Math.abs(b.im)) { const r = b.im / b.re, d = b.re + b.im * r; return C((a.re + a.im * r) / d, (a.im - a.re * r) / d); }
    const r = b.re / b.im, d = b.re * r + b.im; return C((a.re * r + a.im) / d, (a.im * r - a.re) / d);
};
export const neg = (a) => C(-a.re, -a.im);
export const abs = (a) => Math.hypot(a.re, a.im);
export const arg = (a) => Math.atan2(a.im, a.re);
export const exp = (a) => { const e = Math.exp(a.re); return C(e * Math.cos(a.im), e * Math.sin(a.im)); };
export const ln = (a) => C(Math.log(abs(a)), arg(a));
export const sqrt = (a) => { const r = abs(a); if (r === 0) return C(0, 0); const t = Math.sqrt((r + Math.abs(a.re)) / 2); return a.re >= 0 ? C(t, a.im / (2 * t)) : C(Math.abs(a.im) / (2 * t), a.im < 0 ? -t : t); };
export const sin = (a) => C(Math.sin(a.re) * Math.cosh(a.im), Math.cos(a.re) * Math.sinh(a.im));
export const cos = (a) => C(Math.cos(a.re) * Math.cosh(a.im), -Math.sin(a.re) * Math.sinh(a.im));
export const tan = (a) => div(sin(a), cos(a));
export const sinh = (a) => C(Math.sinh(a.re) * Math.cos(a.im), Math.cosh(a.re) * Math.sin(a.im));
export const cosh = (a) => C(Math.cosh(a.re) * Math.cos(a.im), Math.sinh(a.re) * Math.sin(a.im));
export const tanh = (a) => div(sinh(a), cosh(a));
const I = C(0, 1), ONE = C(1, 0);
export const asin = (a) => mul(C(0, -1), ln(add(mul(I, a), sqrt(sub(ONE, mul(a, a))))));
export const acos = (a) => sub(C(Math.PI / 2), asin(a));
export const atan = (a) => mul(C(0, 0.5), sub(ln(sub(ONE, mul(I, a))), ln(add(ONE, mul(I, a)))));
export const asinh = (a) => ln(add(a, sqrt(add(mul(a, a), ONE))));
export const acosh = (a) => ln(add(a, mul(sqrt(add(a, ONE)), sqrt(sub(a, ONE)))));
export const atanh = (a) => mul(C(0.5), sub(ln(add(ONE, a)), ln(sub(ONE, a))));
export const pow = (a, b) => {
    if (b.im === 0 && Number.isInteger(b.re) && Math.abs(b.re) <= 1024) {
        let r = ONE, p = a, n = Math.abs(b.re);
        while (n > 0) { if (n & 1) r = mul(r, p); p = mul(p, p); n = Math.floor(n / 2); }
        return b.re < 0 ? div(ONE, r) : r;
    }
    if (a.re === 0 && a.im === 0) return C(0, 0);
    return exp(mul(b, ln(a)));
};
// gamma: Stirling's series after shifting the argument up (the work uses Lanczos)
export const lgammaBig = (w) => {
    const w2 = mul(w, w); let t = div(C(1 / 12), w), p = w, s = t;
    const B = [-1 / 360, 1 / 1260, -1 / 1680, 1 / 1188, -691 / 360360, 1 / 156];
    for (const b of B) { p = mul(p, w2); s = add(s, div(C(b), p)); }
    return add(add(sub(mul(sub(w, C(0.5)), ln(w)), w), C(0.5 * Math.log(2 * Math.PI))), s);
};
export const gamma = (z) => {
    if (z.re < 0.5) { const s = sin(mul(C(Math.PI), z)); return div(C(Math.PI), mul(s, gamma(sub(ONE, z)))); }
    let w = z, den = ONE;
    while (w.re < 20) { den = mul(den, w); w = add(w, ONE); }
    return div(exp(lgammaBig(w)), den);
};
// zeta: Euler-Maclaurin summation (the work uses Borwein's alternating series)
const BERN = [1 / 6, -1 / 30, 1 / 42, -1 / 30, 5 / 66, -691 / 2730, 7 / 6, -3617 / 510, 43867 / 798, -174611 / 330, 854513 / 138, -236364091 / 2730];
export const zeta = (s) => {
    if (s.re < 0) {
        const o = sub(ONE, s);
        return mul(mul(mul(exp(mul(s, C(Math.log(2 * Math.PI)))), C(1 / Math.PI)), sin(mul(C(Math.PI / 2), s))), mul(gamma(o), zeta(o)));
    }
    const N = 40 + Math.ceil(Math.abs(s.im));
    let sum = C(0);
    for (let n = 1; n < N; n++) sum = add(sum, exp(mul(neg(s), C(Math.log(n)))));
    const Ns = exp(mul(neg(s), C(Math.log(N))));
    sum = add(sum, div(mul(Ns, C(N)), sub(s, ONE)));
    sum = add(sum, mul(Ns, C(0.5)));
    // B2k / (2k)! * s (s+1) ... (s+2k-2) * N^(-s-2k+1)
    let term = div(mul(s, Ns), C(N)), fact = 2;
    for (let k = 1; k <= BERN.length; k++) {
        sum = add(sum, mul(term, C(BERN[k - 1] / fact)));
        term = div(mul(mul(term, add(s, C(2 * k - 1))), add(s, C(2 * k))), C(N * N));
        fact *= (2 * k + 1) * (2 * k + 2);
    }
    return sum;
};
export const FUNCS = {
    re: (a) => C(a.re), im: (a) => C(a.im), abs: (a) => C(abs(a)), arg: (a) => C(arg(a)), conj: (a) => C(a.re, -a.im),
    sqrt, exp, ln, log: ln, sin, cos, tan, sinh, cosh, tanh, asin, acos, atan, asinh, acosh, atanh, arcsin: asin, arccos: acos, arctan: atan,
    sec: (a) => div(ONE, cos(a)), csc: (a) => div(ONE, sin(a)), cot: (a) => div(cos(a), sin(a)),
    gamma, zeta,
};
export const NAMES = { i: () => I, e: () => C(Math.E), pi: () => C(Math.PI), 'π': () => C(Math.PI), t: (env) => env.t, a: (env) => env.a };

// formula -> (z, env) => value. Same grammar as the work: + - * / ^ (right to left), a sign binds
// tighter than * and looser than ^, two values side by side are multiplied, names are split greedily.
export function parse(text, { funcs = FUNCS, names = NAMES, funcs2 = {} } = {}) {
    const toks = [];
    const s = text.replace(/[×·]/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
    const known = [...Object.keys(funcs), ...Object.keys(funcs2), ...Object.keys(names), 'z', 'x', 'y'].sort((a, b) => b.length - a.length);
    for (let i = 0; i < s.length;) {
        const ch = s[i];
        if (ch === ' ') { i++; continue; }
        if (/[0-9.]/.test(ch)) { let j = i; while (j < s.length && /[0-9.]/.test(s[j])) j++; toks.push({ t: 'num', v: Number(s.slice(i, j)) }); i = j; continue; }
        if (/[a-zA-Zπ]/.test(ch)) {
            let j = i; while (j < s.length && /[a-zA-Zπ]/.test(s[j])) j++;
            let word = s.slice(i, j).toLowerCase();
            const nm = known.find(k => word.startsWith(k));
            if (!nm) throw new Error('unknown name ' + word);
            toks.push({ t: 'name', v: nm }); i += nm.length; continue;
        }
        if ('+-*/^(),'.includes(ch)) { toks.push({ t: ch }); i++; continue; }
        throw new Error('unknown character ' + ch);
    }
    let p = 0;
    const peek = () => toks[p], startsValue = (t) => t && (t.t === 'num' || t.t === 'name' || t.t === '(');
    function primary() {
        const t = toks[p++];
        if (!t) throw new Error('unexpected end');
        if (t.t === 'num') return () => C(t.v);
        if (t.t === '(') { const e = expr(); if (peek() && peek().t === ')') p++; return e; }
        if (t.t === 'name') {
            if (funcs[t.v] || funcs2[t.v]) {
                if (!peek() || peek().t !== '(') throw new Error('( expected');
                p++;
                const a = [expr()];
                while (peek() && peek().t === ',') { p++; a.push(expr()); }
                if (peek() && peek().t === ')') p++;
                if (funcs2[t.v]) return funcs2[t.v](a);
                const f = funcs[t.v];
                return (z, env) => f(a[0](z, env));
            }
            if (t.v === 'z') return (z) => z;
            if (t.v === 'x') return (z) => C(z.re);
            if (t.v === 'y') return (z) => C(z.im);
            const n = names[t.v];
            return (z, env) => n(env);
        }
        throw new Error('unexpected ' + t.t);
    }
    function power() {
        const b = primary();
        if (peek() && peek().t === '^') { p++; const e = unary(); return (z, env) => pow(b(z, env), e(z, env)); }
        return b;
    }
    function unary() {
        if (peek() && peek().t === '-') { p++; const e = unary(); return (z, env) => neg(e(z, env)); }
        if (peek() && peek().t === '+') { p++; return unary(); }
        return power();
    }
    function term() {
        let a = unary();
        for (;;) {
            const t = peek();
            if (t && (t.t === '*' || t.t === '/')) { p++; const b = unary(), l = a, op = t.t === '*' ? mul : div; a = (z, env) => op(l(z, env), b(z, env)); }
            else if (startsValue(t)) { const b = power(), l = a; a = (z, env) => mul(l(z, env), b(z, env)); }
            else return a;
        }
    }
    function expr() {
        let a = term();
        for (;;) {
            const t = peek();
            if (t && (t.t === '+' || t.t === '-')) { p++; const b = term(), l = a, op = t.t === '+' ? add : sub; a = (z, env) => op(l(z, env), b(z, env)); }
            else return a;
        }
    }
    const e = expr();
    if (p < toks.length) throw new Error('left over: ' + toks[p].t);
    return e;
}
