import { bench } from './harness.mjs';
const n = 64;
function tileFn(T) {
    const ps = []; for (let i = 1; i <= T; i++) ps.push('a' + i); for (let i = 1; i <= T; i++) ps.push('b' + i);
    let body = '';
    for (let k = 0; k <= 2 * T - 2; k++) {
        const terms = [];
        for (let i = 0; i < T; i++) { const j = k - i; if (j >= 0 && j < T) terms.push(`a${i + 1} * b${j + 1}`); }
        body += ` R[p + ${k}] = R[p + ${k}] + ${terms.join(' + ')};\n`;
    }
    return `function mk${T}(p, ${ps.join(', ')}) {\n${body}}\n`;
}
function tileCall(T) {
    const args = []; for (let u = 0; u < T; u++) args.push(`A[i + ${u}]`); for (let u = 0; u < T; u++) args.push(`B[j + ${u}]`);
    return `let i = 1; while (i <= ${n}) { let j = 1; while (j <= ${n}) { mk${T}(i + j - 1, ${args.join(', ')}); j = j + ${T}; } i = i + ${T}; }`;
}
const prelude = `let A = []; let B = []; let R = [];
function fill() { let i = 0; while (i < ${n}) { A.push(rand(0, 9999999)); B.push(rand(0, 9999999)); i = i + 1; } i = 0; while (i < ${2 * n}) { R.push(0); i = i + 1; } }
${tileFn(16)}${tileFn(32)}${sqrFn(16)}${sqrFn(32)}`;
function sqrFn(T) {
    const ps = []; for (let i = 1; i <= T; i++) ps.push('a' + i);
    let body = '';
    for (let k = 0; k <= 2 * T - 2; k++) {
        const terms = []; let sq = '';
        for (let i = 0; i < T; i++) { const j = k - i; if (j > i && j < T) terms.push(`a${i + 1} * a${j + 1}`); if (j === i) sq = `a${i + 1} * a${i + 1}`; }
        let e = terms.length ? `(${terms.join(' + ')}) * 2` : '';
        if (sq) e = e ? e + ' + ' + sq : sq;
        body += ` R[p + ${k}] = R[p + ${k}] + ${e};\n`;
    }
    return `function sq${T}(p, ${ps.join(', ')}) {\n${body}}\n`;
}
function sqrCall(T) { const args = []; for (let u = 0; u < T; u++) args.push(`A[i + ${u}]`); return `let k = 0; while (k < ${n * n / (T * T)}) { let i = 1; sq${T}(1, ${args.join(', ')}); k = k + 1; }`; }
const tests = { tile16: tileCall(16), tile32: tileCall(32), sq16: sqrCall(16), sq32: sqrCall(32) };
const r = await bench('kern2', prelude, tests, { init: 'fill();' });
for (const [k, t] of Object.entries(r)) console.log(k.padEnd(10), (t * 1e9 / (n * n)).toFixed(0).padStart(6), 'ns/product');
