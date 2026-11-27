// (v3.5, 11-28) What the spark engine keeps of its wires from one settling to the next (power.js: the nodes - what a
// wire reads, what it gets from outside, the cells it tells, its arms) is let go whenever something by a wire
// changes. This test builds and rebuilds circuits at random - wire, blocks, torches, repeaters, comparators, lamps,
// levers, buttons, pistons, spark blocks, observers, put, thrown, pressed and taken away - in two games side by side:
// one as it is, one that lets every wire go before each settling and each look at a wire's arms (nothing kept, as
// the engine worked before). After every step the two worlds must be the same, cell for cell, with the same ticks
// waiting. A wire that kept something it should have let go shows as a cell that differs.
//   node test/wirecache35.mjs [steps: 700] [seed: 1]
// Then the same circuits with the map's mirror on (hashSet: the genre's order of telling, east for west) against
// themselves built mirrored with it off: the mirrored machine does what the machine did.
import { createSim } from '../sim.mjs';
const STEPS = +(process.argv[2] || 700), SEED = +(process.argv[3] || 1);
let fails = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
// (the other game: nothing kept)
const fresh = (js) => {
  const a = 'function wireNu(x,y,z){', b = 'function wireArmsC(x,y,z){';
  if (!js.includes(a) || !js.includes(b)) throw new Error('the engine is not as this test knows it');
  return js.replace(a, a + 'if(wcOn==0){wnClear();}').replace(b, b + 'if(wcOn==0){wnClear();}');
};
const X0 = 2, Y0 = 100, Z0 = 2, NX = 11, NY = 4, NZ = 11;
function game(hook, mirror) {
  const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0 }, hook });
  const F = (k = 1) => { for (let i = 0; i < k; i++) s.frame(); };
  { let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; } }
  const fn = s.fn, call = (f) => s.as('pen', f);
  const cmd = (t) => call(() => fn.runCommand(t));
  F(20);
  cmd(`/fill ${X0 - 6} ${Y0 - 1} ${Z0 - 6} ${X0 + NX + 6} ${Y0 + NY + 3} ${Z0 + NZ + 6} air`);
  cmd(`/fill ${X0 - 6} ${Y0 - 1} ${Z0 - 6} ${X0 + NX + 6} ${Y0 - 1} ${Z0 + NZ + 6} stone`);
  s.poke('px', X0 + 5.5); s.poke('py', Y0 + 14); s.poke('pz', Z0 + 5.5); s.poke('flying', 1);
  F(5);
  // (mirror: the machine is built east for west and told in the mirrored order)
  if (mirror) call(() => fn.hashSet(2 * X0 + NX - 1, 0, 0, 1));
  const gx = (x) => (mirror ? 2 * X0 + NX - 1 - x : x);
  const cells = () => { const r = []; for (let x = X0 - 3; x < X0 + NX + 3; x++) for (let y = Y0 - 1; y < Y0 + NY + 2; y++) for (let z = Z0 - 3; z < Z0 + NZ + 3; z++) r.push(call(() => fn.blockAt(gx(x), y, z))); return r; };
  return { s, F, fn, call, cmd, gx, cells };
}
// a step: what is done at a cell (the same text for every game; `gx` puts it east for west in the mirrored one)
let seed = SEED;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const SIDES = ['north', 'south', 'east', 'west'], FLIP = { east: 'west', west: 'east', north: 'north', south: 'south', up: 'up', down: 'down' };
function step() {
  const x = X0 + Math.floor(rnd() * NX), z = Z0 + Math.floor(rnd() * NZ), y = Y0 + (rnd() < 0.72 ? 0 : rnd() < 0.7 ? 1 : 2), r = rnd();
  if (r < 0.30) return { x, y, z, put: 'spark_wire' };
  if (r < 0.40) return { x, y, z, put: 'stone' };
  if (r < 0.50) return { x, y, z, put: 'air' };
  if (r < 0.57) return { x, y, z, put: 'spark_torch' };
  if (r < 0.65) return { x, y, z, put: 'repeater', f: pick(SIDES), more: `,delay=${1 + Math.floor(rnd() * 4)}` };
  if (r < 0.69) return { x, y, z, put: 'comparator', f: pick(SIDES), more: rnd() < 0.5 ? ',mode=subtract' : '' };
  if (r < 0.74) return { x, y, z, put: 'lever' };
  if (r < 0.78) return { x, y, z, put: 'stone_button' };
  if (r < 0.82) return { x, y, z, put: 'spark_lamp' };
  if (r < 0.85) return { x, y, z, put: 'spark_block' };
  if (r < 0.89) return { x, y, z, put: rnd() < 0.5 ? 'sticky_piston' : 'piston', f: pick([...SIDES, 'up']) };
  if (r < 0.91) return { x, y, z, put: 'observer', f: pick(SIDES) };
  return { x, y, z, use: 1 };
}
function apply(g, st, mirror) {
  const x = g.gx(st.x);
  if (st.use) {
    // (a lever thrown, a button pressed - whatever of the two is there)
    g.call(() => { const b = g.fn.blockAt(x, st.y, st.z), k = String(g.s.peek('ITKEY')[b]); if (k.startsWith('lever')) g.fn.leverToggle(x, st.y, st.z, b); if (k.includes('button')) g.fn.buttonPress(x, st.y, st.z); });
    return;
  }
  const f = st.f ? (mirror ? FLIP[st.f] : st.f) : '';
  g.cmd(`/setblock ${x} ${st.y} ${st.z} ${st.put}${f ? `[facing=${f}${st.more || ''}]` : ''}`);
}
const same = (a, b) => { let d = 0, at = -1; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) { d++; if (at < 0) at = i; } return [d, at]; };
const where = (i) => { const ny = NY + 3, nz = NZ + 6; return [X0 - 3 + Math.floor(i / (ny * nz)), Y0 - 1 + Math.floor(i / nz) % ny, Z0 - 3 + i % nz]; };
const KEYS = (g) => g.s.peek('ITKEY');
const waiting = (g) => g.s.peek('scN') + '/' + g.s.peek('BEX').length + '/' + g.s.peek('MVX').length;

// ---- 1: kept against nothing kept
{
  const A = game(null, 0), B = game(fresh, 0);
  let bad = -1, parts = 0, wires = 0, moved = 0, kept = 0, why = '';
  const steps = [];
  for (let i = 0; i < STEPS && bad < 0; i++) {
    const st = step(); steps.push(st);
    apply(A, st, 0); apply(B, st, 0);
    const n = 3 + Math.floor(rnd() * 9);
    A.F(n); B.F(n);
    if (A.s.peek('MVX').length) moved++;
    kept = Math.max(kept, A.s.peek('pnN'));
    const ca = A.cells(), cb = B.cells(), [d, at] = same(ca, cb);
    if (d > 0 || waiting(A) !== waiting(B) || A.s.peek('gtNow') !== B.s.peek('gtNow')) {
      bad = i;
      why = d > 0 ? `${d} cells differ, the first at ${where(at).join(',')}: ${KEYS(A)[ca[at]]} kept, ${KEYS(B)[cb[at]]} fresh` : `waiting ${waiting(A)} kept, ${waiting(B)} fresh`;
      console.log('the last steps:', JSON.stringify(steps.slice(-6)));
    }
    if (i === STEPS - 1) { const K = KEYS(A); for (const b of ca) { const k = String(K[b]); if (k.startsWith('spark_wire')) wires++; else if (/torch|repeater|comparator|lever|button|lamp|piston|observer|spark_block/.test(k)) parts++; } }
  }
  ok(bad < 0, bad < 0 ? `${STEPS} steps of building at random (seed ${SEED}): the game that keeps its wires and the one that keeps nothing are the same after every step (at the end ${wires} wires and ${parts} parts; ${moved} steps saw a piston move; up to ${kept} wires kept)` : `after step ${bad + 1}: ${why}`);
  // (and that the first does keep them)
  ok(A.s.peek('pnN') > 0, `the first has ${A.s.peek('pnN')} wires known at the end, the other ${B.s.peek('pnN')}`);
}
// ---- 2: mirrored, told in the mirrored order, against itself as it was
{
  seed = SEED + 77;
  const A = game(null, 0), M = game(null, 1);
  let bad = -1, why = '';
  const N = Math.min(STEPS, 400);
  for (let i = 0; i < N && bad < 0; i++) {
    const st = step();
    apply(A, st, 0); apply(M, st, 1);
    const n = 3 + Math.floor(rnd() * 9);
    A.F(n); M.F(n);
    // (the same cells, east for west: a part facing east faces west there - its block is another, so the kinds and
    // the wires' powers are compared, and what is lit or out)
    const KA = KEYS(A), BON = A.s.peek('BON'), BK = A.s.peek('BKIND'), BX = A.s.peek('BAUX'), RS = A.s.peek('BRS');
    const sig = (b) => BK[b] * 1000 + (RS[b] === 1 ? BX[b] : BON[b]);
    const ca = A.cells().map(sig), cm = M.cells().map(sig), [d, at] = same(ca, cm);
    if (d > 0 || waiting(A) !== waiting(M)) { bad = i; why = d > 0 ? `${d} cells differ, the first at ${where(at).join(',')}` : `waiting ${waiting(A)} / ${waiting(M)}`; }
  }
  ok(bad < 0, bad < 0 ? `${N} steps more: the circuits built east for west with the mirror on do what they do built as they are` : `mirrored, after step ${bad + 1}: ${why}`);
}
// ---- 3: the test sees a wire that kept what it should not: a game whose wires are never told of a change goes wrong
{
  seed = SEED;
  const deaf = (js) => { const a = 'function wnTouch(x,y,z,full){'; if (!js.includes(a)) throw new Error('wnTouch is not as this test knows it'); return js.replace(a, a + 'return;'); };
  const B = game(fresh, 0), D = game(deaf, 0);
  let at = -1;
  for (let i = 0; i < STEPS && at < 0; i++) {
    const st = step();
    apply(B, st, 0); apply(D, st, 0);
    const n = 3 + Math.floor(rnd() * 9);
    B.F(n); D.F(n);
    if (same(B.cells(), D.cells())[0] > 0) at = i;
  }
  ok(at >= 0, at >= 0 ? `and a game whose wires are not told of changes is another after ${at + 1} steps (the test would see it)` : `a game whose wires are not told of changes stayed the same for ${STEPS} steps: the test sees nothing`);
}
console.log(fails ? fails + ' FAILED' : 'all ok');
process.exit(0);
