// (v2.7.4) milk: creative keeps the milk and the bucket, a cow clicked with milk keeps it: node test/milk.mjs
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) s.frame(); };
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
const fn = s.fn, call = (f) => s.as('pen', f);
const K = s.peek('ITKEY'), id = (k) => K.indexOf(k);
let fails = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
const WANT = {
  '0 milk_bucket 0': '1:bucketx1', '0 milk_bucket 1': '1:milk_bucketx1', '0 bucket 0': '1:bucketx1', '0 bucket 1': '1:milk_bucketx1',
  '1 milk_bucket 0': '1:milk_bucketx1', '1 milk_bucket 1': '1:milk_bucketx1', '1 bucket 0': '1:bucketx1', '1 bucket 1': '1:bucketx1 2:milk_bucketx1' };
const inv = () => { const I = s.peek('INVI'), N = s.peek('INVN'); const o = []; for (let i = 0; i < 36; i++) if (I[i] > 0) o.push(`${i + 1}:${K[I[i]]}x${N[i]}`); return o.join(' '); };
for (const gm of [0, 1]) for (const held of ['milk_bucket', 'bucket']) for (const cow of [0, 1]) {
  s.poke('gameMode', gm);
  const I = s.peek('INVI'), N = s.peek('INVN'); for (let i = 0; i < 36; i++) { I[i] = 0; N[i] = 0; }
  s.poke('hotSel', 1); I[0] = id(held); N[0] = 1;
  let e = 0;
  if (cow) { call(() => fn.mobAdd(2, s.peek('px') + 1.5, s.peek('py'), s.peek('pz'))); e = s.peek('lastMob'); }
  s.poke('mobPick', e); s.poke('pickOn', 0); s.poke('placeCool', 0); s.poke('uiMode', 0);
  call(() => fn.useKey());
  F(120);
  const w = WANT[`${gm} ${held} ${cow}`];
  ok(inv() === w && (!cow || s.peek('ET')[e - 1] === 2), `${['survival', 'creative'][gm]}, ${held}${cow ? ' on a cow' : ''}: ${inv()}${inv() === w ? '' : ' (want ' + w + ')'}`);
  if (cow) s.peek('ET')[e - 1] = 0;
}
console.log(fails ? fails + ' FAILED' : 'all ok');
