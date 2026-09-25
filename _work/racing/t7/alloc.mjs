// v3.3: the lists left empty in the work are, once the game has started,
// exactly as long as before and all zero (and a second start does not grow them)
import { createSim } from '../sim.mjs';
import { buildData } from '../build.mjs';
const D = buildData();
const s = createSim({ fps: 10 }); const g = (e) => s.peek(e);
s.frame();
let bad = 0, n = 0;
for (const [len, ks] of Object.entries(D.alloc)) for (const k of ks) {
    n++;
    const L = +g(`${k}.length`);
    if (L !== +len) { bad++; console.log('length', k, L, 'want', len); }
}
// a fresh buffer is all zeros before the game touches it (rp* replay: only written in a race)
const z = g('rpX.every(v => v === 0) && pbX.every(v => v === 0)');
g('allocLists()');
const again = +g('rpX.length');
console.log(`${bad === 0 && z && again === 4950 ? 'PASS' : 'FAIL'} ${n} lists allocated at the start, ${bad} with a wrong length, zeros ${z}, after a second allocLists rpX has ${again}`);
