import * as C from './ext/vendor/tessvm/runtime/cast.js';
const N = 2e6;
const cases = {
  'int*int': [37, 12], 'long*long': [Math.sin(1.1) * 100, Math.cos(0.3)], 'short2*long': [123.45, Math.cos(0.3)],
  'int*long': [123, Math.cos(0.3)], 'short1*short2': [0.5, 12.25], 'long+long': [Math.sin(1.1) * 100, Math.cos(0.3)],
  'short2+short2': [123.45, 67.89], 'int/long': [123, Math.cos(0.3)], 'long/long': [Math.sin(1.1) * 100, Math.cos(0.3)],
};
for (const [k, [a, b]] of Object.entries(cases)) {
  for (const op of ['mulNum', 'addNum', 'divNum']) {
    if (k.includes('*') && op !== 'mulNum') continue; if (k.includes('+') && op !== 'addNum') continue; if (k.includes('/') && op !== 'divNum') continue;
    let s = 0; const t = performance.now();
    for (let i = 0; i < N; i++) s += C[op](a + (i & 1) * 0, b);
    console.log(k.padEnd(14), op, ((performance.now() - t) * 1e6 / N).toFixed(1), 'ns');
  }
}
// calcPlus with numbers, variants
let t = performance.now(); let s = 0; for (let i = 0; i < N; i++) s += C.calcPlus(Math.sin(1.1) * 100, Math.cos(0.3)); console.log('calcPlus long', ((performance.now() - t) * 1e6 / N).toFixed(1));
t = performance.now(); for (let i = 0; i < N; i++) s += C.calcPlus(12.5, 3.25); console.log('calcPlus short', ((performance.now() - t) * 1e6 / N).toFixed(1));
t = performance.now(); for (let i = 0; i < N; i++) s += C.num(Math.cos(0.3)) * C.num(3.7); console.log('raw mul', ((performance.now() - t) * 1e6 / N).toFixed(1));
