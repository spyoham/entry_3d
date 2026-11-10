// packed data lists (v2.4.1): what bigInit unpacks is the data, item for item: node test/pack.mjs
import { createSim } from '../sim.mjs';
import { makeData } from '../build.mjs';
const { L } = makeData();
const s = createSim({ consts: { TESTRUN: 1, ANIMALS: 0 } });
let t = Date.now();
s.frame(); s.frame();
console.log('first frames', Date.now() - t, 'ms');
let bad = 0, n = 0, items = 0;
for (const [k, v] of Object.entries(L)) {
  const got = s.peek(k);
  n++; items += v.length;
  if (!got || got.length !== v.length || got.some((x, i) => String(x) !== String(v[i]))) {
    bad++; console.log('FAIL', k, v.length, got && got.length, got && got.findIndex((x, i) => String(x) !== String(v[i])));
  }
}
console.log(bad ? `FAIL ${bad} lists` : `ok   all ${n} data lists (${items} items) as built`);
if (bad) process.exit(1);
