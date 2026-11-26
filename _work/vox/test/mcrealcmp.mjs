// (v3.5, 11-26) The plain reference of the genre's redstone (test/mcref.mjs) run by the keys of a record of the real
// game (test/mcreal.mjs), the two looked at tick by tick: the first tick a cell differs at, and which cells.
//   node test/mcrealcmp.mjs <record.json> <save folder> [stop after n differing ticks = 1] [old]
// With the head rule in (mcref.mjs neighborUpdate, piston_head) the two are the same through 3 x 5 (605 ticks) and
// through 84 / 7, 1 x 255, 7 - 9 in one run (2,010 ticks) - every cell of the machine's 57,984, every tick.
import fs from 'node:fs';
import { RefWorld, S } from './mcref.mjs';
const T = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const dir = process.argv[3], stopAfter = +(process.argv[4] || 1), opt = process.argv[5] || '';
const w = new RefWorld({ wireOld: opt === 'old' });
w.load(dir, 56);
// a state of the real game as the reference holds it
function norm(name) {
  const m = /^([a-z_0-9]+)(?:\[(.*)\])?$/.exec(name); const n = m[1], p = {};
  if (m[2]) for (const kv of m[2].split(',')) { const [k, v] = kv.split('='); p[k] = v; }
  if (n === 'air' || n === 'cave_air' || n === 'void_air') return null;
  if (n === 'redstone_wire') return S(n, { power: p.power });
  if (n === 'repeater') return S(n, { facing: p.facing, delay: p.delay, powered: p.powered });
  if (n === 'comparator') return S(n, { facing: p.facing, mode: p.mode, powered: p.powered });
  if (/_sign$/.test(n)) return S('sign');
  if (n === 'moving_piston') return S(n, { facing: p.facing });
  return S(n, p);
}
const str = (s) => (s ? Object.entries(s).map(([k, v]) => (k === 'n' ? v : k + '=' + v)).join(' ') : 'air');
const NORM = {}; for (const id in T.names) NORM[id] = norm(T.names[id]);
// the world as the real game had it at the start
const real = new Map();
for (const [k, id] of T.init) { const s = NORM[id]; if (s) real.set(k, s); }
{ let d = 0; const ex = [];
  for (const [k, s] of real) if (w.b.get(k) !== s) { d++; if (ex.length < 8) ex.push(k + ': save ' + str(w.b.get(k)) + ' | game ' + str(s)); }
  for (const [k, s] of w.b) if (!real.has(k)) { d++; if (ex.length < 8) ex.push(k + ': save ' + str(s) + ' | game air'); }
  console.log('at the start: cells of the game', real.size, 'of the save', w.b.size, 'differing', d); for (const e of ex) console.log('   ', e);
  w.b = new Map(real); }
// the keys: before the burst in which the key's own cell changes
const pressAt = new Map();
for (const p of T.presses) {
  const k = p.pos.join(',');
  let at = -1;
  for (let i = p.sentAfter + 1; i < T.bursts.length && at < 0; i++) if (T.bursts[i].ch.some((c) => c[0] + ',' + c[1] + ',' + c[2] === k)) at = i;
  if (at < 0) { console.log('key', p.key, 'never seen to change'); continue; }
  if (!pressAt.has(at)) pressAt.set(at, []);
  pressAt.get(at).push(p);
  console.log('key', p.key, 'sent after burst', p.sentAfter, 'seen in burst', at);
}
let prev = new Map(w.b), bad = 0, firstBad = -1; const moving = new Set();
w.changed = new Set();
for (let i = T.base; i < T.bursts.length; i++) {
  // (the keys between the ticks)
  for (const p of pressAt.get(i) || []) { const s = w.get(...p.pos); if (s.n === 'lever') w.lever(...p.pos); else w.press(...p.pos); }
  // what the reference changed since the last look
  const mine = new Map();
  for (const k of w.changed) { const s = w.b.get(k) || null; if ((prev.get(k) || null) !== s) { mine.set(k, s); if (s) prev.set(k, s); else prev.delete(k); } }
  w.changed = new Set();
  const theirs = new Map();
  for (const [x, y, z, id] of T.bursts[i].ch) { const k = x + ',' + y + ',' + z, s = NORM[id]; if ((real.get(k) || null) !== s) { theirs.set(k, s); if (s) real.set(k, s); else real.delete(k); } }
  // (the cells where the two worlds are not the same now)
  const diff = [];
  for (const k of moving) { const a = w.b.get(k) || null; if (!a || a.n !== 'moving_piston') { moving.delete(k); mine.set(k, a); } }
  for (const k of new Set([...mine.keys(), ...theirs.keys()])) { const a = w.b.get(k) || null, b = real.get(k) || null; if (a && a.n === 'moving_piston') { moving.add(k); continue; } if (a !== b) diff.push(k + ': ref ' + str(a) + ' | game ' + str(b)); }
  if (diff.length) {
    if (firstBad < 0) firstBad = i;
    bad++;
    console.log(`burst ${i} (tick ${T.bursts[i].tick}, ${i - T.base} after the start): ${diff.length} cells differ; ref changed ${mine.size}, game changed ${theirs.size}; game's piston events ${JSON.stringify(T.bursts[i].act)}`);
    for (const d of diff.slice(0, 30)) console.log('   ', d);
    if (bad >= stopAfter) break;
  }
  w.tick();
}
console.log(firstBad < 0 ? 'the same through all ' + (T.bursts.length - T.base) + ' ticks' : 'first differing burst ' + firstBad);
