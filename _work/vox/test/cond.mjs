// power through blocks (wool, target, stone ...): node test/cond.mjs
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) s.frame(); };
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
F(20);
const fn = s.fn, call = (f) => s.as('pen', f), KEY = s.peek('ITKEY'), B = (x, y, z) => call(() => fn.blockAt(x, y, z));
const cmd = (t) => call(() => fn.runCommand(t)), put = (x, y, z, k) => cmd(`/setblock ${x} ${y} ${z} ${k}`);
const lit = (x, y, z) => KEY[B(x, y, z)] === 'spark_lamp_on';
const BAUX = s.peek('BAUX'), BRS = s.peek('BRS');
let fails = 0; const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
const X = 8, Y = 100, Z = 8;
cmd(`/fill ${X - 20} ${Y - 1} ${Z - 20} ${X + 20} ${Y + 6} ${Z + 20} air`);
cmd(`/fill ${X - 20} ${Y - 1} ${Z - 20} ${X + 20} ${Y - 1} ${Z + 20} stone`);
s.poke('px', X + 0.5); s.poke('py', Y + 10); s.poke('pz', Z - 18); s.poke('flying', 1); F(5);
let z = Z - 16;
for (const blk of ['stone', 'white_wool', 'target', 'oak_planks', 'white_concrete']) {
  // a: lever on the block, lamp past it; b: wire into the block, lamp past it; c: torch under the block, wire on it;
  // d: a repeater into the block, wire out the other side
  put(X, Y, z, blk); put(X - 1, Y, z, 'lever[face=wall,facing=west,powered=true]'); put(X + 1, Y, z, 'spark_lamp'); F(30);
  const a = lit(X + 1, Y, z);
  put(X + 6, Y, z, blk); put(X + 4, Y, z, 'spark_block'); put(X + 5, Y, z, 'spark_wire'); put(X + 7, Y, z, 'spark_lamp'); F(30);
  const b = lit(X + 7, Y, z);
  put(X + 12, Y, z, 'stone'); put(X + 12, Y + 1, z, 'spark_torch'); put(X + 12, Y + 2, z, blk); put(X + 13, Y + 1, z, 'stone'); put(X + 13, Y + 2, z, 'spark_wire'); F(30);
  const c = BRS[B(X + 13, Y + 2, z)] === 1 ? BAUX[B(X + 13, Y + 2, z)] : -1;
  put(X - 8, Y, z, 'spark_block'); put(X - 7, Y, z, 'repeater[facing=east]'); put(X - 6, Y, z, blk); put(X - 5, Y, z, 'spark_wire'); F(30);
  const d = BRS[B(X - 5, Y, z)] === 1 ? BAUX[B(X - 5, Y, z)] : -1;
  ok(a && b && c === 15 && d === 15, `${blk.padEnd(15)} lever ${a} wire->lamp ${b} torch-under ${c} repeater-through ${d}`);
  z += 4;
}
console.log(fails ? fails + ' FAILED' : 'all ok');
