import { bench } from './harness.mjs';
const n = 64;
const prelude = `let A = []; let B = []; let R = [];
function fill() { let i = 0; while (i < ${n}) { A.push(rand(0, 9999999)); B.push(rand(0, 9999999)); i = i + 1; } i = 0; while (i < ${2 * n}) { R.push(0); i = i + 1; } }
function clr() { let i = 1; while (i <= ${2 * n}) { R[i] = 0; i = i + 1; } }`;
const row1 = `let i = 1; while (i <= ${n}) { let a = A[i]; let d = i - 1; let j = 1; while (j <= ${n}) { R[j + d] = R[j + d] + a * B[j]; j = j + 1; } i = i + 1; }`;
const row4 = `let i = 1; while (i <= ${n}) { let a = A[i]; let p = i; let j = 1; while (j <= ${n}) { R[p] = R[p] + a * B[j]; R[p + 1] = R[p + 1] + a * B[j + 1]; R[p + 2] = R[p + 2] + a * B[j + 2]; R[p + 3] = R[p + 3] + a * B[j + 3]; j = j + 4; p = p + 4; } i = i + 1; }`;
const rowrep4 = `let i = 1; while (i <= ${n}) { let a = A[i]; let p = i; let j = 1; for (const _ of rep(${n / 4})) { R[p] = R[p] + a * B[j]; R[p + 1] = R[p + 1] + a * B[j + 1]; R[p + 2] = R[p + 2] + a * B[j + 2]; R[p + 3] = R[p + 3] + a * B[j + 3]; j = j + 4; p = p + 4; } i = i + 1; }`;
// comba: column k, i from lo..hi, j = k + 1 - i
function comba(U) {
    let terms = []; for (let u = 0; u < U; u++) terms.push(`A[i${u ? ' + ' + u : ''}] * B[j${u ? ' - ' + u : ''}]`);
    return `let k = 1; while (k < ${2 * n}) { let lo = 1; if (k > ${n}) { lo = k - ${n - 1}; } let hi = k; if (hi > ${n}) { hi = ${n}; } let i = lo; let j = k + 1 - lo; let acc = 0;
      while (i + ${U - 1} <= hi) { acc = acc + ${terms.join(' + ')}; i = i + ${U}; j = j - ${U}; }
      while (i <= hi) { acc = acc + A[i] * B[j]; i = i + 1; j = j - 1; }
      R[k] = acc; k = k + 1; }`;
}
const tests = { row1, row4, rowrep4, comba4: comba(4), comba8: comba(8), comba16: comba(16) };
const r = await bench('kern', prelude, tests, { init: 'fill();' });
for (const [k, t] of Object.entries(r)) console.log(k.padEnd(10), (t * 1e9 / (n * n)).toFixed(0).padStart(6), 'ns/product');
