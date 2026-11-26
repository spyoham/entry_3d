// (v3.5, 11-26) every change in a box of the calculator, tick by tick, in the reference (test/mcref.mjs):
//   node test/calcwatch.mjs <save folder> <sum, e.g. 3*5> x0,y0,z0,x1,y1,z1 [ticks=120] [old]
import { RefWorld } from './mcref.mjs';
const dir = process.argv[2], q = process.argv[3], box = process.argv[4].split(',').map(Number), N = +(process.argv[5] || 120);
const w = new RefWorld({ wireOld: process.argv[6] === 'old' });
w.load(dir, 56);
const run = (n) => { for (let i = 0; i < n; i++) w.tick(); };
const NUM = { 1: [87, 6], 2: [87, 5], 3: [87, 4], 4: [86, 6], 5: [86, 5], 6: [86, 4], 7: [85, 6], 8: [85, 5], 9: [85, 4], 0: [84, 5] };
const OPS = { '+': -1, '-': -2, '*': -3, '/': -4, c: 1 };
const key = (d) => { w.press(33, NUM[d][0], NUM[d][1]); run(30); };
const lever = () => { w.lever(33, 85, 2); run(20); };
const m = /^(\d+)([-+*\/])(\d+)$/.exec(q);
run(40); w.press(33, 85, OPS.c); run(40);
for (const d of m[1]) key(+d);
lever();
for (const d of m[3]) key(+d);
const inBox = (k) => { const [x, y, z] = k.split(',').map(Number); return x >= box[0] && x <= box[3] && y >= box[1] && y <= box[4] && z >= box[2] && z <= box[5]; };
const txt = (s) => { if (!s) return 'air'; const o = { ...s }; delete o.n; delete o.waterlogged; delete o.short; const p = Object.keys(o).map((k) => (k === 'power' ? o[k] : k === 'powered' || k === 'lit' || k === 'extended' ? (o[k] === 'true' ? 'ON' : 'off') : k === 'facing' || k === 'mode' || k === 'face' || k === 'type' ? o[k].slice(0, 2) : k[0] + o[k])).join(' '); return s.n.replace('redstone_', '').replace('wall_', '').replace('sticky_', '').replace('moving_piston', 'MOVING') + (p ? ' ' + p : ''); };
const T0 = w.time;
w.changed = new Set();
let before = new Map(w.b);
w.press(33, 85, OPS[m[2]]);
for (let t = 0; t <= N; t++) {
  if (t > 0) w.tick();
  const out = [];
  for (const k of [...w.changed].sort()) { if (!inBox(k)) continue; const a = before.get(k), b = w.b.get(k); if (a !== b) out.push('(' + k + ') ' + txt(a) + ' -> ' + txt(b) + (b && b.n === 'comparator' ? ' [' + (w.cmp.get(k) || 0) + ']' : '')); }
  if (out.length) console.log('t+' + t + ': ' + out.join(' | '));
  for (const k of w.changed) { const b = w.b.get(k); if (b) before.set(k, b); else before.delete(k); }
  w.changed = new Set();
}
