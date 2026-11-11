// (v2.5) pistons as the genre's: a move takes 0.1 s (the cell is a moving block meanwhile), a sticky
// piston given a pulse shorter than its move lets go of its block, power reaching the cell over a
// piston (quasi-connectivity) moves it when something by it changes (a BUD switch), dispensers too,
// items are pushed, a jelly block throws, block entities stay.   usage: node test/piston5.mjs
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) { try { s.frame(); } catch (e) { console.log('ERR', e.message, e.stack.split('\n').slice(1, 4).join(' | ')); process.exit(1); } } };
const wait = (sec) => F(Math.ceil(sec * 60) + 1);
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
const fn = s.fn, call = (f) => s.as('pen', f);
const KEY = s.peek('ITKEY'), ID = (k) => { const i = KEY.indexOf(k); if (i < 0) throw new Error('no ' + k); return i; }, K = (b) => KEY[b];
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
const settle = () => { call(() => fn.worldFlush()); F(2); };
// a piston at (x, y, z) facing -z (its arm at z - 1)
const piston = (x, y, z, key = 'piston') => put(x, y, z, `${key}[facing=north]`);

// 1 the move takes 0.1 s: meanwhile the cell is a moving block, the planks not there yet
piston(X, Y, Z); put(X, Y, Z - 1, 'oak_planks'); put(X + 1, Y, Z, 'lever'); F(2);
useAt(X + 1, Y, Z);
let sawMoving = 0, frames = 0;
for (let i = 0; i < 30; i++) { F(1); if (K(B(X, Y, Z - 2)) === 'moving_piston') { sawMoving++; } if (K(B(X, Y, Z - 2)) === 'oak_planks' && frames === 0) frames = i + 1; }
ok(sawMoving >= 4 && sawMoving <= 7, `the planks on their way for ${sawMoving} frames (0.1 s is 6)`);
ok(K(B(X, Y, Z - 2)) === 'oak_planks' && K(B(X, Y, Z - 1)).startsWith('piston_head') && on(X, Y, Z) === 1, `then there (frame ${frames}), the arm out`);
ok(call(() => fn.blockAt(X, Y, Z - 2)) !== ID('moving_piston') && s.peek('MVX').length === 0, 'nothing left on its way');

// 2 a sticky piston given a pulse of one tick lets go of its block; a long one pulls it back
piston(X + 4, Y, Z, 'sticky_piston'); put(X + 4, Y, Z - 1, 'oak_planks'); put(X + 5, Y, Z, 'lever'); F(2);
useAt(X + 5, Y, Z); F(3); useAt(X + 5, Y, Z); wait(0.5);
ok(K(B(X + 4, Y, Z - 2)) === 'oak_planks' && B(X + 4, Y, Z - 1) === 0 && on(X + 4, Y, Z) === 0, `a pulse of 0.05 s (shorter than the move): the planks left out (${K(B(X + 4, Y, Z - 2))}, ${K(B(X + 4, Y, Z - 1))})`);
piston(X + 8, Y, Z, 'sticky_piston'); put(X + 8, Y, Z - 1, 'oak_planks'); put(X + 9, Y, Z, 'lever'); F(2);
useAt(X + 9, Y, Z); wait(0.5); useAt(X + 9, Y, Z); wait(0.5);
ok(K(B(X + 8, Y, Z - 1)) === 'oak_planks' && B(X + 8, Y, Z - 2) === 0, 'a long pulse: the planks pulled back');

// 3 quasi-connectivity: a spark block put over a piston's side (by the cell over it) gives it power,
// but a spark block tells only the cells by it: the piston moves when a block by it changes
piston(X + 12, Y, Z); put(X + 12, Y, Z - 1, 'oak_planks'); F(2);
put(X + 13, Y + 1, Z, 'spark_block'); settle(); wait(0.3);
ok(on(X + 12, Y, Z) === 0, 'a spark block by the cell over it: the piston did not notice (a BUD)');
put(X + 11, Y, Z, 'stone'); settle(); wait(0.3);
ok(on(X + 12, Y, Z) === 1 && K(B(X + 12, Y, Z - 2)) === 'oak_planks', 'a block put by it: now it pushes (power over it)');
put(X + 13, Y + 1, Z, 'air'); settle(); wait(0.3);
ok(on(X + 12, Y, Z) === 1, 'the spark block gone: still out (it did not notice)');
put(X + 11, Y, Z, 'air'); settle(); wait(0.3);
ok(on(X + 12, Y, Z) === 0, 'a change by it: back');
// a lever by the cell over it (two steps, as the genre's levers tell): at once
piston(X + 16, Y, Z); put(X + 16, Y + 1, Z, 'glass'); put(X + 18, Y + 1, Z, 'stone'); put(X + 17, Y + 1, Z, 'lever[face=wall,facing=west]'); F(2);
useAt(X + 17, Y + 1, Z); settle(); wait(0.3);
ok(on(X + 16, Y, Z) === 1, 'a lever by the cell over it (on glass): the piston pushes');

// 4 a dropper powered over it
put(X + 20, Y, Z, 'dropper[facing=north]'); F(2);
call(() => { fn.chestAt(X + 20, Y, Z); const c = s.peek('cFound'); s.peek('CHI')[(c - 1) * 27] = ID('cobblestone'); s.peek('CHN')[(c - 1) * 27] = 5; });
put(X + 20, Y + 1, Z, 'glass'); put(X + 22, Y + 1, Z, 'stone'); put(X + 21, Y + 1, Z, 'lever[face=wall,facing=west]'); F(2);
const items = () => s.peek('IID').filter((q) => q > 0).length;
const i0 = items();
useAt(X + 21, Y + 1, Z); settle(); wait(0.3);
ok(items() === i0 + 1, `a dropper powered over it drops (${items() - i0})`);

// 5 an item lying where the planks go is pushed; a jelly block pushed up throws the player
piston(X - 4, Y, Z); put(X - 4, Y, Z - 1, 'oak_planks'); put(X - 3, Y, Z, 'lever'); F(2);
call(() => fn.dropItem(ID('apple'), 1, 0, X - 3.5, Y + 0.05, Z - 1.5, 0)); wait(1);
const ap = () => { const L = s.peek('IID'); for (let i = 0; i < L.length; i++) if (L[i] === ID('apple')) return i; return -1; };
const az0 = s.peek('IZZ')[ap()];
useAt(X - 3, Y, Z); wait(0.4);
ok(ap() >= 0 && s.peek('IZZ')[ap()] < az0 - 0.7, `the apple pushed along (z ${az0.toFixed(2)} -> ${s.peek('IZZ')[ap()].toFixed(2)})`);
put(X - 8, Y, Z, 'piston[facing=up]'); put(X - 8, Y + 1, Z, 'jelly_block'); put(X - 7, Y, Z, 'lever'); F(2);
s.poke('flying', 0); s.poke('px', X - 7.5); s.poke('py', Y + 2); s.poke('pz', Z + 0.5); s.poke('pvy', 0); s.poke('pvx', 0); s.poke('pvz', 0); F(10);
const py0 = s.peek('py');
useAt(X - 7, Y, Z);
let top = py0; for (let i = 0; i < 60; i++) { F(1); top = Math.max(top, s.peek('py')); }
ok(top > py0 + 2.5, `the player on a jelly block pushed up flies (${(top - py0).toFixed(1)} up)`);
s.poke('flying', 1); s.poke('px', X + 0.5); s.poke('py', Y + 12); s.poke('pz', Z - 22);

// 6 what keeps things in it is not moved
piston(X, Y, Z + 8); put(X, Y, Z + 7, 'jukebox'); put(X + 1, Y, Z + 8, 'lever'); F(2);
useAt(X + 1, Y, Z + 8); wait(0.4);
ok(K(B(X, Y, Z + 7)) === 'jukebox' && on(X, Y, Z + 8) === 0, 'a jukebox stops a piston');
console.log(fails ? fails + ' FAILED' : 'all ok');
