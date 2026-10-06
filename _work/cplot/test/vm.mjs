// The compiled formulas against the reference, at random points.
//   node test/vm.mjs
import { createSim } from '../sim.mjs';
import { parse, C } from './ref.mjs';
const s = createSim();
s.frame();
export function evalAt(formula, pts) {
    s.poke('src', formula);
    s.fn.compile();
    if (s.peek('cerr') !== 0) return { err: s.peek('cerr'), pos: s.peek('cpos') };
    const VR = s.peek('VR'), VI = s.peek('VI'), ro = s.peek('resOff');
    // the parameters t and a (the last two constant cells)
    VR[4999] = ENV.t.re; VI[4999] = 0; VR[4998] = ENV.a.re; VI[4998] = ENV.a.im;
    // all points as one row (so the row loops are what is tested), then each alone
    const n = pts.length;
    pts.forEach((p, j) => { VR[j] = p.re; VI[j] = p.im; });
    s.fn.runProg(n);
    const row = pts.map((p, j) => C(VR[ro + j], VI[ro + j]));
    const one = pts.map((p) => { VR[0] = p.re; VI[0] = p.im; s.fn.runProg(1); return C(VR[ro], VI[ro]); });
    return { row, one, pn: s.peek('pn') };
}
export const ENV = { t: C(1.3), a: C(0.6, -0.8) };
export const FORMULAS = [
    'gamma(z)', 'gamma(z+1)/gamma(z)', '1/gamma(z)', 'gamma(1/z)', 'gamma(z)gamma(1-z)sin(pi z)', 'zeta(z)', 'zeta(2z)', 'zeta(1/z)', '(z-1)zeta(z)',
    'z+a', 'a z^2+t', 'e^(i t)z', 't^2+z', 'z^t', 'a^z', 'a/z', 'z/a', 'z-a', 'a-z', 't', 'a', 'sin(t)z', '(z-a)/(1-conj(a)z)', 'a^3 z', 'sqrt(a)+z', 'gamma(a) z',
    'z', '-z', 'z+1', '1+z', 'z-1', '1-z', '2z', 'z*i', 'z/2', '2/z', 'z/(1+i)', '(1+i)/z', 'z*z', 'z/z', 'z+z', 'z-z+z',
    'z^2', 'z^3', 'z^7', 'z^10', 'z^-1', 'z^-3', 'z^0', 'z^1', 'z^0.5', 'z^-0.5', 'z^(1+i)', 'z^i', 'z^2.5', '2^z', 'i^z', 'e^z', 'e^(iz)', 'z^z', '(1+i)^z',
    'z^3-1', '(z^2-1)(z-2-i)^2/(z^2+2+2i)', '(z-1)/(z+1)', '1/(z^5-1)', 'z^2+1/z^2', '(z+1)(z-1)', '2(z+1)', 'z(z+1)(z+2)', '-z^2', '2^-z', '-z*2', '--z', '+z',
    're(z)', 'im(z)', 'abs(z)', 'arg(z)', 'conj(z)', 'x', 'y', 'x+iy', 'x^2-y^2+2ixy', 'abs(z)^2', 'z conj(z)', 're(z)+i im(z)',
    'sqrt(z)', 'sqrt(z^2-1)', 'exp(z)', 'ln(z)', 'log(z)', 'ln(z^2)', 'exp(1/z)', 'e^(1/z)', 'exp(-z^2)',
    'sin(z)', 'cos(z)', 'tan(z)', 'sinh(z)', 'cosh(z)', 'tanh(z)', 'sec(z)', 'csc(z)', 'cot(z)', 'sin(1/z)', 'sin(z)/z', 'sin(z)^2-cos(z)^2',
    'asin(z)', 'acos(z)', 'atan(z)', 'asinh(z)', 'acosh(z)', 'atanh(z)', 'arcsin(z)', 'sin(asin(z))', 'tan(atan(z))',
    'pi z', 'πz', 'e^(i pi z)', 'ez', 'iz', 'zi', 'SIN(Z)', 'Sqrt(Z)', 'sin(z)cos(z)', '2pi', 'sin(cos(tan(z)))', 'exp(exp(z))', 'ln(ln(z))',
    '((((z+1)+2)+3)+4)', 'z+(z+(z+(z+(z+(z+z)))))', '(z+1)/((z+2)/((z+3)/(z+4)))', 'sin(z', '(z+1', 'z^2^3', '2^3^z',
    '1/(1/(1/z))', 'z-(z-(z-1))', '(z*2)^(z/3)', 'sqrt(sqrt(z))', 'abs(sin(z))', 'arg(z^2)', 'conj(z)^2/z',
];
export const CONST = ['1+2', '2*3+4', '(1+2i)(3-i)', '(1+2i)^(3-i)', 'e^(i pi)', 'i^i', 'sqrt(-1)', 'ln(-1)', '2^10', '1/3', 'sin(1)', 'cos(pi)', 'exp(1)', 'e', 'pi', '1/e^50', '(1+i)^8', '2^0.5', 'atan(1)*4', 'abs(3+4i)', 'arg(i)', '1e'.slice(0, 1), '10^-30/3', 'sinh(0.000001)', 'tan(pi/4)', 'acos(2)', 'e^100', 'e^-700', 'e^700/e^690',
    'gamma(5)', 'gamma(0.5)^2', 'gamma(-1.5)', 'gamma(1+i)', 'gamma(170)', 'zeta(2)', 'zeta(-1)', 'zeta(0)', 'zeta(4)', 'zeta(0.5+10i)', 'zeta(-3.5+2i)', 'zeta(1.000001)', 'zeta(0.5+30i)', 'zeta(-7)'];
let seed = 12345;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const pts = [];
for (let i = 0; i < 40; i++) pts.push(C((rnd() - 0.5) * 8, (rnd() - 0.5) * 6));
for (let i = 0; i < 12; i++) pts.push(C((rnd() - 0.5) * 0.02, (rnd() - 0.5) * 0.02));
for (let i = 0; i < 12; i++) pts.push(C((rnd() - 0.5) * 200, (rnd() - 0.5) * 60));
// (not exactly on the imaginary axis: z^2 would land on a cut with a signed zero)
pts.push(C(1.5, 0), C(-1.5, 0), C(0.001, 1.5), C(0.001, -1.5), C(0.5, 0), C(-0.5, 0), C(0.001, 0.5), C(3, 4), C(-2, 1e-9), C(-2, -1e-9));
const close = (a, b, tol) => {
    if (!isFinite(b.re) || !isFinite(b.im)) return !(Math.abs(a.re) < 1e300 && Math.abs(a.im) < 1e300) || isNaN(a.re);
    const m = Math.hypot(b.re, b.im), d = Math.hypot(a.re - b.re, a.im - b.im);
    return d <= tol * Math.max(m, 1e-300) || d < 1e-300;
};
let bad = 0, total = 0, worst = 0, worstAt = '';
for (const f of [...FORMULAS, ...CONST]) {
    const ref = parse(f);
    // (the zeta series is good to about six digits at the edge of its range of Im s)
    const tol = f.includes('zeta') ? 2e-5 : f.includes('gamma') ? 1e-8 : 2e-9;
    const got = evalAt(f, pts);
    if (got.err) { console.log('COMPILE ERROR', f, got); bad++; continue; }
    pts.forEach((p, j) => {
        const want = ref(p, ENV);
        // (the reference itself overflowed; or gamma right beside a pole, where sin(pi z) has few digits left)
        if (isNaN(want.re) || isNaN(want.im)) return;
        if (f.includes('gamma') && Math.abs(p.im) < 1e-6 && p.re < 0) return;
        total++;
        for (const [how, v] of [['row', got.row[j]], ['one', got.one[j]]]) {
            const m = Math.hypot(want.re, want.im), d = Math.hypot(v.re - want.re, v.im - want.im);
            if (isFinite(m) && m > 1e-290 && m < 1e290 && isFinite(d)) { const r = d / m; if (r > worst) { worst = r; worstAt = `${f} at ${p.re},${p.im}`; } }
            if (!close(v, want, tol)) { bad++; if (bad < 25) console.log('MISMATCH', how, f, 'z =', p.re, p.im, 'got', v.re, v.im, 'want', want.re, want.im); }
        }
    });
}
// what must not compile
const ERR = { '': 9, '   ': 9, 'z+': 4, '*z': 4, 'z)': 7, 'foo(z)': 2, 'sin z': 3, 'sin': 3, '1.2.3': 8, 'z#': 1, '()': 4, 'z^': 4, '(': 9, '.': 8, '5.': 0, '.5z': 0, 'sin()': 4, 'z 2': 0 };
for (const [f, code] of Object.entries(ERR)) {
    const got = evalAt(f, pts.slice(0, 2));
    const c = got.err || 0;
    if (c !== code) { bad++; console.log('ERROR CODE', JSON.stringify(f), 'got', c, 'want', code); }
}
console.log(bad ? `FAIL ${bad}` : 'PASS', total, 'values, worst relative error', worst.toExponential(2), worstAt);
if (process.argv[1] && process.argv[1].endsWith("vm.mjs")) process.exit(bad ? 1 : 0);
