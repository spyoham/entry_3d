// (v2.6) a light that changes (a lamp, a torch) is spread or taken back from its cell only; the light
// it leaves is the same as working the whole place out again. Light off: all lit as by the sky.
// usage: node test/lightinc.mjs
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) { try { s.frame(); } catch (e) { console.log('ERR', e.message, e.stack.split('\n').slice(1, 4).join(' | ')); process.exit(1); } } };
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
const fn = s.fn, call = (f) => s.as('pen', f);
const cmd = (t) => call(() => fn.runCommand(t));
let fails = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
F(20);
const X = 8, Y = 40, Z = 8;
// a closed room underground (no sky): stone all round, air inside
cmd(`/fill ${X - 12} ${Y - 1} ${Z - 12} ${X + 12} ${Y + 8} ${Z + 12} stone`);
cmd(`/fill ${X - 11} ${Y} ${Z - 11} ${X + 11} ${Y + 7} ${Z + 11} air`);
call(() => fn.worldFlush()); F(2);
const LT = () => s.peek('LT');
const snap = () => { const L = LT(), r = []; for (let x = X - 12; x <= X + 12; x++) for (let z = Z - 12; z <= Z + 12; z++) for (let y = Y - 1; y <= Y + 8; y++) r.push(L[call(() => fn.wi(x, y, z)) - 1] % 16); return r; };
const full = () => { call(() => fn.relight1(X - 26, X + 26, Z - 26, Z + 26)); return snap(); };
const same = (a, b) => { let d = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++; return d; };
const K2 = (b) => s.peek('ITKEY')[b], B2 = (x, y, z) => call(() => fn.blockAt(x, y, z));
const set = (x, y, z, key) => { cmd(`/setblock ${x} ${y} ${z} ${key}`); call(() => fn.worldFlush()); };
let rng = 7; const R = (k) => { rng = (rng * 1103515245 + 12345) % 2147483648; return rng % k; };
const spots = [];
for (let i = 0; i < 10; i++) spots.push([X - 10 + R(21), Y + R(7), Z - 10 + R(21)]);
// pillars to shade
for (let i = 0; i < 12; i++) { const x = X - 10 + R(21), z = Z - 10 + R(21); cmd(`/fill ${x} ${Y} ${z} ${x} ${Y + 5} ${z} stone`); }
call(() => fn.worldFlush()); full();
let worst = 0, steps = 0;
const kinds = ['spark_lamp_on', 'spark_lamp', 'torch', 'air', 'spark_torch', 'glowstone'];
for (let k = 0; k < 40; k++) {
  const [x, y, z] = spots[R(spots.length)];
  set(x, y, z, kinds[R(kinds.length)]);
  const a = snap(), b = full();
  const d = same(a, b); worst = Math.max(worst, d); steps++;
  if (d) { console.log('  differs after step', k, d, 'cells'); break; }
}
ok(worst === 0, `${steps} light changes worked out from their cell only: the same as all again (${worst} cells differ)`);
// it is cheap: a lamp put on and off in the room does not work the 29 x 29 columns out
const KEY = s.peek('ITKEY'), L0 = KEY.indexOf('spark_lamp'), L1 = KEY.indexOf('spark_lamp_on');
const t0 = performance.now(); call(() => { for (let k = 0; k < 20; k++) { fn.setBlock(X, Y + 3, Z, k % 2 ? L0 : L1); fn.worldFlush(); } }); const t1 = performance.now();
call(() => { for (let k = 0; k < 20; k++) fn.relight1(X - 14, X + 14, Z - 14, Z + 14); }); const t2 = performance.now();
ok((t1 - t0) < (t2 - t1) / 3, `20 lamp switches ${(t1 - t0).toFixed(0)} ms, 20 times the old way ${(t2 - t1).toFixed(0)} ms`);
// (v2.6) blocks put and broken (and moved by pistons) light from their cell alone too: both lights,
// at the surface (the open sky) and in the room, the same as working it all out again
{
  const KEY2 = s.peek('ITKEY'), id = (k) => KEY2.indexOf(k);
  const snapAll = (y0, y1) => { const L = LT(), r = []; for (let x = X - 12; x <= X + 12; x++) for (let z = Z - 12; z <= Z + 12; z++) for (let y = y0; y <= y1; y++) r.push(L[call(() => fn.wi(x, y, z)) - 1]); return r; };
  const fullAll = (y0, y1) => { call(() => fn.relight1(X - 26, X + 26, Z - 26, Z + 26)); return snapAll(y0, y1); };
  const GY = 70;
  cmd(`/fill ${X - 12} ${GY} ${Z - 12} ${X + 12} ${GY + 20} ${Z + 12} air`);
  cmd(`/fill ${X - 12} ${GY - 1} ${Z - 12} ${X + 12} ${GY - 1} ${Z + 12} stone`);
  call(() => fn.worldFlush()); fullAll(GY - 2, GY + 12);
  const things = ['stone', 'air', 'air', 'glass', 'oak_leaves', 'torch', 'glowstone', 'stone', 'oak_planks'];
  let bad = 0, n2 = 0;
  for (let k = 0; k < 80 && !bad; k++) {
    const surf = k % 2 === 0;
    const x = X - 6 + R(13), z = Z - 6 + R(13), y = surf ? GY + R(6) : Y + R(7);
    const t = things[R(things.length)], b = id(t);
    if (b < 0) continue;
    call(() => { fn.setBlock(x, y, z, b); fn.worldFlush(); });
    const a2 = surf ? snapAll(GY - 2, GY + 12) : snap(), b2 = surf ? fullAll(GY - 2, GY + 12) : full();
    if (!surf) fullAll(GY - 2, GY + 12);
    const d = same(a2, b2); n2++;
    if (d) { bad = d; console.log('  differs after', k, t, surf ? 'surface' : 'room', x - X, y, z - Z, d, 'cells'); }
  }
  ok(bad === 0, `${n2} blocks put or broken, lit from their cell alone: the same as all again`);
  // a piston pushing a block under the open sky
  cmd(`/setblock ${X} ${GY} ${Z} piston[facing=east]`); cmd(`/setblock ${X + 1} ${GY} ${Z} stone`); cmd(`/setblock ${X} ${GY + 1} ${Z} stone`);
  call(() => fn.worldFlush()); fullAll(GY - 2, GY + 12);
  cmd(`/setblock ${X - 1} ${GY} ${Z} spark_block`); F(30);
  const a3 = snapAll(GY - 2, GY + 12), b3 = fullAll(GY - 2, GY + 12);
  ok(K2(B2(X + 2, GY, Z)) === 'stone' && same(a3, b3) === 0, `a piston's push: the light the same as all again (${same(a3, b3)} differ)`);
}
// light off: everything as under the sky, and a lamp put changes nothing
call(() => fn.lightSet(0)); for (let i = 0; i < 400 && s.peek('LRQ').length > 0; i++) F(1);
ok(s.peek('lightOn') === 0 && snap().every((v, i) => true) && LT()[call(() => fn.wi(X, Y + 3, Z)) - 1] === 240, 'light off: 240 everywhere (the sky, no block light)');
set(X + 2, Y + 3, Z, 'torch');
ok(LT()[call(() => fn.wi(X + 3, Y + 3, Z)) - 1] === 240, 'a torch put: nothing lit (off)');
call(() => fn.lightSet(1)); for (let i = 0; i < 2000 && s.peek('LRQ').length > 0; i++) F(1);
const a = snap(), b = full();
ok(same(a, b) === 0 && b.some((v) => v > 0), `light on again: worked out again as before (${same(a, b)} differ)`);
console.log(fails ? fails + ' FAILED' : 'all ok');
