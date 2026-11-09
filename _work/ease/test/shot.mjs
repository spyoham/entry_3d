// Run the program in Node for some frames at a preset and save a picture.
//   node test/shot.mjs preset frames out.png [k=v ...]   (t=0.5 sets the time and pauses)
import path from 'node:path';
import url from 'node:url';
import { createSim } from '../sim.mjs';
const a = process.argv.slice(2);
const kv = Object.fromEntries(a.filter(x => /^\w+=/.test(x)).map(x => x.split('=')).map(([k, v]) => [k, Number(v)]));
const [pre, frames, out] = a.filter(x => !/^\w+=/.test(x));
const s = createSim({ consts: { START: Number(pre) } });
const t0 = performance.now();
for (let f = 0; f < Number(frames); f++) {
    if (f === 3 && 't' in kv) { s.poke('playing', 0); s.poke('curT', kv.t); s.poke('fgGen', s.peek('fgGen') + 1); }
    s.frame();
}
console.log('ms', (performance.now() - t0).toFixed(0), 'strokes', s.stats.strokes, 'fills', s.stats.fills, 'curT', s.peek('curT'), 'rev', s.peek('rev'));
console.log(s.text('top'));
if (out) await s.png(out);
