// (v2.5) tripwire hooks and string: two hooks facing each other, string between; something on it
// puts both on (strongly powering the walls they hang on) till 0.5 s after; string broken without
// shears too; hooks put on walls only.   usage: node test/trip5.mjs
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) { try { s.frame(); } catch (e) { console.log('ERR', e.message, e.stack.split('\n').slice(1, 4).join(' | ')); process.exit(1); } } };
const wait = (sec) => F(Math.ceil(sec * 60) + 1);
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
const fn = s.fn, call = (f) => s.as('pen', f);
const KEY = s.peek('ITKEY'), ID = (k) => { const i = KEY.indexOf(k); if (i < 0) throw new Error('no ' + k); return i; }, K = (b) => KEY[b];
const B = (x, y, z) => call(() => fn.blockAt(x, y, z));
const cmd = (t) => call(() => fn.runCommand(t));
const BON = s.peek('BON'), BATT = s.peek('BATT');
let fails = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
F(20);
const X = 8, Y = 100, Z = 8;
cmd(`/fill ${X - 16} ${Y - 1} ${Z - 16} ${X + 16} ${Y + 6} ${Z + 16} air`);
cmd(`/fill ${X - 16} ${Y - 1} ${Z - 16} ${X + 16} ${Y - 1} ${Z + 16} stone`);
s.poke('px', X + 0.5); s.poke('py', Y + 4); s.poke('pz', Z - 8); s.poke('flying', 1);
F(5);
const put = (x, y, z, key) => cmd(`/setblock ${x} ${y} ${z} ${key}`);
const settle = () => { call(() => fn.worldFlush()); F(2); };
const DV = [[-1, 0, 0], [1, 0, 0], [0, -1, 0], [0, 1, 0], [0, 0, -1], [0, 0, 1]];
const placeAs = (x, y, z, key, f = 3, yaw = 0, pitch = 0) => call(() => {
  const [dx, dy, dz] = DV[f]; const cx = x - dx, cy = y - dy, cz = z - dz;
  s.poke('yaw', yaw); s.poke('pitch', pitch);
  s.poke('pickX', cx); s.poke('pickY', cy); s.poke('pickZ', cz); s.poke('pickF', f); s.poke('pickB', fn.blockAt(cx, cy, cz)); s.poke('pickHY', 0.9); s.poke('placeCool', 0);
  s.poke('pickOn', 1);
  const it = ID(key); fn.placeBlock(s.peek('ITPLB')[it], it);
});
const lit = (x, y, z) => K(B(x, y, z)) === 'spark_lamp_on';

// walls at z = Z and z = Z + 6, hooks on them facing each other, string between (put along them)
put(X, Y, Z, 'stone'); put(X, Y, Z + 6, 'stone');
placeAs(X, Y, Z + 1, 'tripwire_hook', 5);   // clicked the wall's +z face: hangs on it (-z)
placeAs(X, Y, Z + 5, 'tripwire_hook', 4);   // the other wall's -z face: hangs on +z
ok(K(B(X, Y, Z + 1)).startsWith('tripwire_hook') && BATT[B(X, Y, Z + 1)] === 4 && BATT[B(X, Y, Z + 5)] === 5, `hooks on the walls (${K(B(X, Y, Z + 1))}, ${K(B(X, Y, Z + 5))})`);
placeAs(X + 3, Y, Z + 3, 'tripwire_hook', 3);
ok(B(X + 3, Y, Z + 3) === 0, 'not on a floor');
for (let z = Z + 2; z <= Z + 4; z++) placeAs(X, Y, z, 'string', 3, 90);
ok([2, 3, 4].every((d) => K(B(X, Y, Z + d)) === 'tripwire'), `string along the hooks though one looks along x (${K(B(X, Y, Z + 3))})`);
// a lamp by each wall (powered strongly by its hook)
put(X + 1, Y, Z, 'spark_lamp'); put(X - 1, Y, Z + 6, 'spark_lamp'); F(2);
// the player walks over the string
s.poke('flying', 0); s.poke('px', X + 0.5); s.poke('py', Y); s.poke('pz', Z + 3.5); s.poke('pvy', 0); F(3); settle();
ok(BON[B(X, Y, Z + 1)] === 1 && BON[B(X, Y, Z + 5)] === 1, 'the player on the string: both hooks on');
ok(lit(X + 1, Y, Z) && lit(X - 1, Y, Z + 6), 'the lamps by their walls lit');
s.poke('flying', 1); s.poke('px', X + 0.5); s.poke('py', Y + 4); s.poke('pz', Z - 8); wait(0.3);
ok(BON[B(X, Y, Z + 1)] === 1, 'off it: still on a little');
wait(0.6);
ok(BON[B(X, Y, Z + 1)] === 0 && BON[B(X, Y, Z + 5)] === 0, 'then off');
// an item on it
call(() => fn.dropItem(ID('apple'), 1, 0, X + 0.5, Y + 0.3, Z + 3.5, 0)); wait(0.4);
ok(BON[B(X, Y, Z + 1)] === 1, 'an apple on it: on');
s.peek('IID').fill(0); wait(1);
// broken without shears: on; with shears: nothing
call(() => fn.breakBlock(X, Y, Z + 3, 1)); settle();
ok(BON[B(X, Y, Z + 1)] === 1, 'string broken by hand: on');
wait(1);
placeAs(X, Y, Z + 3, 'string', 3, 0);
cmd('/give @s shears 1'); const sh = s.peek('INVI').indexOf(ID('shears')); s.poke('hotSel', sh + 1); wait(1);
call(() => fn.breakBlock(X, Y, Z + 3, 1)); settle();
ok(BON[B(X, Y, Z + 1)] === 0, 'with shears: quiet');
// hooks not facing each other: nothing
placeAs(X, Y, Z + 3, 'string', 3, 0);
cmd(`/setblock ${X} ${Y} ${Z + 5} tripwire_hook[facing=north]`); F(2);
ok(BATT[B(X, Y, Z + 5)] === 5, '/setblock tripwire_hook[facing=north]: on the wall to the south');
s.poke('flying', 0); s.poke('px', X + 0.5); s.poke('py', Y); s.poke('pz', Z + 3.5); F(3);
ok(BON[B(X, Y, Z + 1)] === 1, 'still a line');
cmd(`/setblock ${X} ${Y} ${Z + 5} air`); s.poke('flying', 1); s.poke('pz', Z - 8); s.poke('py', Y + 4); wait(1);
s.poke('flying', 0); s.poke('px', X + 0.5); s.poke('py', Y); s.poke('pz', Z + 3.5); F(3);
ok(BON[B(X, Y, Z + 1)] === 0, 'one hook gone: the other stays off');
console.log(fails ? fails + ' FAILED' : 'all ok');
