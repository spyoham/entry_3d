// (v3.5, 11-26) the calculator of the genre in the plain reference of its redstone (test/mcref.mjs):
//   node test/calcref.mjs <save folder> [sums: 12+34,7-9,3*5,84/7] [old]     (old: wire as before 1.16)
// The keys are pressed as a player would (a second between them), the display read every tick.
import { RefWorld } from './mcref.mjs';
const dir = process.argv[2], sums = (process.argv[3] || '12+34,7-9,9-7,3*5').split(','), old = process.argv[4] === 'old';
const w = new RefWorld({ wireOld: old });
const t0 = Date.now();
w.load(dir, 56);
console.log('loaded', w.b.size, 'blocks in', ((Date.now() - t0) / 1000).toFixed(1), 's' + (old ? ' (wire as before 1.16)' : ''));
const SEG = { '1111110': 0, '0110000': 1, '1101101': 2, '1111001': 3, '0110011': 4, '1011011': 5, '1011111': 6, '1110000': 7, '1111111': 8, '1111011': 9, '0000000': ' ', '0000001': '-', '1110011': 9, '0011111': 6, '1110010': 7 };
const lit = (x, y) => (w.get(x, y, 32).lit === 'true' ? 1 : 0);
function digit(k, y0, pitch) {
  const x0 = 29 + pitch * k;
  const key = '' + lit(x0 + 2, y0 + 8) + lit(x0, y0 + 6) + lit(x0, y0 + 2) + lit(x0 + 2, y0) + lit(x0 + 4, y0 + 2) + lit(x0 + 4, y0 + 6) + lit(x0 + 2, y0 + 4);
  return key in SEG ? SEG[key] : '?';
}
const row = (y0, n) => { let r = ''; for (let k = n - 1; k >= 0; k--) r += digit(k, y0, 8); return r; };
export const show = () => `[${row(93, 3)}] [${row(83, 3)}] = [${row(71, 5)}]`;
const run = (n) => { for (let i = 0; i < n; i++) w.tick(); };
const NUM = { 1: [87, 6], 2: [87, 5], 3: [87, 4], 4: [86, 6], 5: [86, 5], 6: [86, 4], 7: [85, 6], 8: [85, 5], 9: [85, 4], 0: [84, 5] };
const OPS = { '+': -1, '-': -2, '*': -3, '/': -4, c: 1 };
const key = (d) => { w.press(33, NUM[d][0], NUM[d][1]); run(30); };
const lever = () => { w.lever(33, 85, 2); run(20); };
const busy = () => w.ticks.length + w.events.length + w.bes.length;
// (at rest as it was saved?)
{ const before = new Map(w.b); run(40); let d = 0; for (const [k, s] of w.b) if (before.get(k) !== s) d++; console.log('40 ticks of rest:', d, 'cells changed, waiting', busy(), '|', show()); }
for (const q of sums) {
  const m = /^(\d+)([-+*\/])(\d+)$/.exec(q);
  w.press(33, 85, OPS.c); run(40);
  for (const d of m[1]) key(+d);
  lever();
  for (const d of m[3]) key(+d);
  const entered = show();
  const t1 = w.time;
  w.press(33, 85, OPS[m[2]]);
  let quiet = 0, n = 0, last = '', lastChange = 0;
  while (n < 1500 && quiet < 40) { w.tick(); n++; if (busy() === 0) quiet++; else quiet = 0; const v = show(); if (v !== last) { last = v; lastChange = n; } }
  console.log(q, '| entered', entered, '->', show(), '| display still after', lastChange, 'ticks; quiet after', n - quiet, busy() ? '(still busy: ' + w.ticks.length + ' ticks, ' + w.bes.length + ' moving)' : '');
  lever();
}
console.log('time', ((Date.now() - t0) / 1000).toFixed(1), 's');
