// v1.1: every packed list, unpacked in tessvm, must equal the build's list (run with tsrv up)
import fs from 'node:fs';
import cp from 'node:child_process';
import { buildData } from '../build.mjs';
const d = buildData();
const names = d.pack.map(p => p.k);
const want = {};
for (const k of names) want[k] = d.full[k];
const ev = `(() => { const out = {}; const N = ${JSON.stringify(names)}; for (const k of N) { const v = window.__vm.variables.find(q => q.name === k); out[k] = v ? (v.value || v.array || []).map(x => (x && typeof x === 'object' && 'data' in x) ? x.data : x) : null; } return out; })()`;
fs.writeFileSync('test/s30.json', JSON.stringify([{ wait: 4000 }, { eval: ev }]));
const out = cp.execFileSync('node', ['test/run.mjs', process.argv[2] || 'test/v11.ent', '--script', 'test/s30.json', '--gpu'], { maxBuffer: 1 << 28 }).toString();
const line = out.split('\n').find(l => l.startsWith('{"') && l.includes(names[0]));
const got = JSON.parse(line);
let bad = 0;
for (const k of names) {
  const a = want[k], b = got[k];
  if (!b || a.length !== b.length) { console.log('LEN', k, a.length, b && b.length); bad++; continue; }
  for (let i = 0; i < a.length; i++) { const x = a[i], y = b[i]; if (typeof x === 'number' ? Math.abs(x - Number(y)) > 1e-9 : x !== y) { console.log('VAL', k, i + 1, x, y); bad++; break; } }
}
console.log(names.length, 'lists,', names.reduce((s, k) => s + want[k].length, 0), 'values,', bad ? bad + ' BAD' : 'all equal');
console.log(out.split('\n').filter(l => /compileMs|ticks|errors/.test(l)).map(l => l.slice(0, 300)).join('\n'));
