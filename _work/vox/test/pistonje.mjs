// (v2.6) pistons as 1.16.5 Java: the game tick's order (scheduled ticks, block events, moving blocks
// landing two ticks after). A sticky piston given an observer's pulse (two ticks) lets go of its block;
// through a repeater of three (six ticks) it pulls it back; a piston coming in is a moving block for
// two ticks; an observer moved by a piston fires when it lands; a torch by the cell over a piston
// powers it (quasi-connectivity, as the genre).   usage: node test/pistonje.mjs
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) { try { s.frame(); } catch (e) { console.log('ERR', e.message, e.stack.split('\n').slice(1, 4).join(' | ')); process.exit(1); } } };
const wait = (sec) => F(Math.ceil(sec * 60) + 1);
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
const fn = s.fn, call = (f) => s.as('pen', f);
const KEY = s.peek('ITKEY'), K = (b) => KEY[b];
const B = (x, y, z) => call(() => fn.blockAt(x, y, z));
const cmd = (t) => call(() => fn.runCommand(t));
const BON = s.peek('BON');
const on = (x, y, z) => BON[B(x, y, z)];
let fails = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
F(20);
const X = 8, Y = 100, Z = 8;
cmd(`/fill ${X - 24} ${Y - 1} ${Z - 24} ${X + 24} ${Y + 8} ${Z + 24} air`);
cmd(`/fill ${X - 24} ${Y - 1} ${Z - 24} ${X + 24} ${Y - 1} ${Z + 24} stone`);
s.poke('px', X + 0.5); s.poke('py', Y + 12); s.poke('pz', Z - 22); s.poke('flying', 1);
F(5);
const put = (x, y, z, key) => cmd(`/setblock ${x} ${y} ${z} ${key}`);
const useAt = (x, y, z) => call(() => { const b = fn.blockAt(x, y, z); fn.useBlock(x, y, z, b, 0); });

// 1 an observer's pulse (two ticks) into a sticky piston: the planks pushed and let go
// (the observer at x+1 looks at x+2 (east), its back into the piston at x; the piston faces north)
put(X, Y, Z, 'sticky_piston[facing=north]'); put(X, Y, Z - 1, 'oak_planks');
put(X + 1, Y, Z, 'observer[facing=east]'); F(10);
put(X + 2, Y, Z, 'stone'); wait(0.6);
ok(K(B(X, Y, Z - 2)) === 'oak_planks' && B(X, Y, Z - 1) === 0 && on(X, Y, Z) === 0, `an observer's pulse: the planks let go out there (${K(B(X, Y, Z - 2))} / ${K(B(X, Y, Z - 1))})`);
put(X + 2, Y, Z, 'air'); wait(0.6);
// (again: the arm goes into the empty cell, the planks are not moving now: it pulls them back, as the genre)
ok(K(B(X, Y, Z - 1)) === 'oak_planks' && B(X, Y, Z - 2) === 0, `again (the stone taken): the arm into the gap pulls the planks back (${K(B(X, Y, Z - 1))})`);

// 2 the same pulse through a repeater of delay 1 (two ticks): let go; delay 3 (six ticks): pulled back
const rig = (x, delay) => {
  put(x, Y, Z, 'sticky_piston[facing=north]'); put(x, Y, Z - 1, 'oak_planks');
  put(x + 1, Y, Z, `repeater[facing=east,delay=${delay}]`);
  put(x + 2, Y, Z, 'observer[facing=east]'); F(10);
  put(x + 3, Y, Z, 'stone'); wait(1);
};
rig(X + 6, 1);
ok(K(B(X + 6, Y, Z - 2)) === 'oak_planks' && B(X + 6, Y, Z - 1) === 0, `a pulse of two ticks through a repeater of 1: let go (${K(B(X + 6, Y, Z - 2))} / ${K(B(X + 6, Y, Z - 1))})`);
rig(X + 12, 3);
ok(K(B(X + 12, Y, Z - 1)) === 'oak_planks' && B(X + 12, Y, Z - 2) === 0, `a pulse of six ticks (a repeater of 3): pulled back (${K(B(X + 12, Y, Z - 1))} / ${K(B(X + 12, Y, Z - 2))})`);

// 3 coming in, the piston is a moving block for two ticks, then a piston again
put(X - 6, Y, Z, 'piston[facing=north]'); put(X - 5, Y, Z, 'lever'); F(4);
useAt(X - 5, Y, Z); wait(0.5);
ok(on(X - 6, Y, Z) === 1, 'a lever: out');
useAt(X - 5, Y, Z);
let mv = 0; for (let i = 0; i < 20; i++) { F(1); if (K(B(X - 6, Y, Z)) === 'moving_piston') mv++; }
ok(mv >= 4 && mv <= 8 && K(B(X - 6, Y, Z)).startsWith('piston') && on(X - 6, Y, Z) === 0 && B(X - 6, Y, Z - 1) === 0, `coming in: a moving block ${mv} frames, then a piston in (${K(B(X - 6, Y, Z))})`);

// 4 an observer pushed by a piston fires where it lands (its back into a lamp)
put(X - 12, Y, Z + 6, 'piston[facing=north]'); put(X - 12, Y, Z + 5, 'observer[facing=east]'); put(X - 11, Y, Z + 6, 'lever');
put(X - 13, Y, Z + 4, 'spark_lamp'); F(10);
useAt(X - 11, Y, Z + 6);
let fired = 0; for (let i = 0; i < 40; i++) { F(1); if (on(X - 12, Y, Z + 4) === 1) fired = 1; }
ok(fired === 1 && K(B(X - 12, Y, Z + 4)).startsWith('observer'), 'an observer moved fires when it lands');

// 5 a standing torch by the cell over a piston (one up, one aside): powered (quasi-connectivity)
put(X - 18, Y, Z, 'piston[facing=up]'); put(X - 17, Y, Z, 'stone'); F(4);
put(X - 17, Y + 1, Z, 'spark_torch'); wait(0.4);
ok(on(X - 18, Y, Z) === 1, 'a torch by the cell over it: out (the genre does the same)');
put(X - 17, Y + 1, Z, 'air'); wait(0.4);
ok(on(X - 18, Y, Z) === 0, 'the torch gone: in');
// one aside of that (not by the cell over it): nothing
put(X - 18, Y, Z + 3, 'piston[facing=up]'); put(X - 17, Y, Z + 4, 'stone'); F(4);
put(X - 17, Y + 1, Z + 4, 'spark_torch'); wait(0.4);
ok(on(X - 18, Y, Z + 3) === 0, 'a torch one more aside (corner to corner): nothing');

// 6 nothing left over
wait(1);
ok(s.peek('MVX').length === 0 && s.peek('BEX').length === 0, 'no block on its way or event left');
console.log(fails ? fails + ' FAILED' : 'all ok');
