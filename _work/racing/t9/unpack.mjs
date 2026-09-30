// v2.1.1: the lists unpacked at the start (build.mjs packLists / unpackLists)
// must be exactly the lists the work used to store. Two sims: one built with
// NOPACK (the data in the lists), one normal; compare every packed list.
import { createSim } from '../sim.mjs';
import { buildData } from '../build.mjs';
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const packed = buildData().pack;
process.env.NOPACK = '1';
const A = createSim({ fps: 10 });
delete process.env.NOPACK;
const B = createSim({ fps: 10 });
const t0 = Date.now();
B.frame();
const ms = Date.now() - t0;
A.frame();
let bad = 0, n = 0;
for (const p of packed) {
    const a = A.peek(p.k), b = B.peek(p.k);
    n += a.length;
    let diff = a.length !== b.length ? 1 : 0;
    for (let i = 0; i < a.length && !diff; i++) if (!(a[i] === b[i] || Object.is(a[i], b[i]))) diff = i + 1;   // (-0 and 0 alike: JSON stores -0 as 0)
    if (diff) { bad++; console.log('  differs', p.k, a.length, b.length, diff > 1 ? `item ${diff}: ${Object.is(a[diff - 1], -0) ? "-0" : a[diff - 1]} vs ${Object.is(b[diff - 1], -0) ? "-0" : b[diff - 1]}` : ''); }
}
ok(bad === 0 && packed.length > 30, `${packed.length} packed lists, ${n} values: ${bad} differ (first frame with the unpacking ${ms} ms in the sim)`);
